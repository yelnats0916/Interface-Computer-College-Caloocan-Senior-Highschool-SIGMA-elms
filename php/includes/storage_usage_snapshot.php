<?php
require_once __DIR__.'/gdrive_service.php';
require_once __DIR__.'/gdrive_usage.php';
function sigmaCollectStorageSnapshot(array $driveConfig): array {
        $auth = ['token' => getGdriveAccessToken('')];
        if (empty($auth['token'])) throw new RuntimeException('Connect Google Drive before checking folder usage.');
        $driveRequest = function ($url) use ($auth) {
            $ch = curl_init($url);
            curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $auth['token']], CURLOPT_CONNECTTIMEOUT => 5, CURLOPT_TIMEOUT => 10]);
            $raw = curl_exec($ch); $status = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
            $data = json_decode($raw ?: '', true);
            if ($status < 200 || $status >= 300 || !is_array($data)) throw new RuntimeException('Unable to read the connected Google Drive folder. Check its sharing permissions and try again.');
            return $data;
        };
        $usage = collectElmsDriveUsage($driveConfig['folder_id'] ?? '', $driveRequest);
        $usage['limit_bytes'] = null;
        $usage['account_used_bytes'] = null;
        $usage['is_estimated_limit'] = false;
        try {
            $about = $driveRequest('https://www.googleapis.com/drive/v3/about?fields=storageQuota');
            $quota = $about['storageQuota'] ?? [];
            if (isset($quota['limit']) && is_numeric($quota['limit']) && (float)$quota['limit'] > 0) $usage['limit_bytes'] = (float)$quota['limit'];
            if (isset($quota['usage']) && is_numeric($quota['usage'])) $usage['account_used_bytes'] = (float)$quota['usage'];
        } catch (Throwable $error) { /* Folder totals remain valid when account quota is unavailable. */ }

        // Google Cloud Service Accounts connect to shared folders without exposing the owner's account limit.
        // Fallback to the configured or standard 15 GB Google Drive storage tier.
        $configuredLimitGb = isset($driveConfig['storage_limit_gb']) && is_numeric($driveConfig['storage_limit_gb']) && (float)$driveConfig['storage_limit_gb'] > 0
            ? (float)$driveConfig['storage_limit_gb']
            : 15.0; // Standard Google Drive free tier (15 GB)
        if (empty($usage['limit_bytes'])) {
            $usage['limit_bytes'] = $configuredLimitGb * 1024 * 1024 * 1024;
            $usage['is_estimated_limit'] = true;
        }
        if ($usage['account_used_bytes'] === null || $usage['account_used_bytes'] <= 0) {
            $usage['account_used_bytes'] = (float)($usage['total_bytes'] ?? 0);
        }
        $usage['storage_limit_gb'] = $configuredLimitGb;
    return $usage;
}
function sigmaStorageSnapshotPath(): string {
    $identity=function_exists('posix_geteuid')?(string)posix_geteuid():'sigma';
    $dir=rtrim(sys_get_temp_dir(),'/\\').'/sigma-storage-'.substr(hash('sha256',$identity.':sigma-elms'),0,16);
    if(!is_dir($dir)&&!mkdir($dir,0700,true)&&!is_dir($dir))throw new RuntimeException('Storage check is unavailable.');
    return $dir.'/usage.json';
}
function sigmaStorageSnapshot(array $config): array {
    $path=sigmaStorageSnapshotPath();
    $scope=hash('sha256',json_encode($config));
    $snapshot=is_file($path)?json_decode(file_get_contents($path),true):null;
    if(($snapshot['scope']??'')!==$scope)$snapshot=null;
    if($snapshot&&time()-(int)$snapshot['at']<60)return $snapshot['result'];
    $lock=fopen($path.'.launch','c+');
    if(!$lock||!flock($lock,LOCK_EX))throw new RuntimeException('Storage check is unavailable.');
    try {
        $pending=$path.'.pending';
        if(!is_file($pending)||time()-filemtime($pending)>120){
            file_put_contents($pending,'pending',LOCK_EX);chmod($pending,0600);
            $cli=PHP_BINARY;
            if(str_contains(strtolower(basename($cli)),'cgi')||str_contains(strtolower(basename($cli)),'fpm'))$cli=dirname($cli).'/php';
            if(!function_exists('exec')||!is_executable($cli)){unlink($pending);throw new RuntimeException('Storage check worker is unavailable.');}
            exec(escapeshellarg($cli).' '.escapeshellarg(dirname(__DIR__).'/workers/storage_usage_worker.php').' > /dev/null 2>&1 < /dev/null &',$ignored,$status);
            if($status!==0){unlink($pending);throw new RuntimeException('Storage check worker could not start.');}
        }
    }finally{flock($lock,LOCK_UN);fclose($lock);}
    return ['success'=>true,'pending'=>true];
}
