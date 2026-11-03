<?php
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require_once dirname(__DIR__).'/includes/storage_usage_snapshot.php';
require_once dirname(__DIR__).'/includes/service_secrets.php';
$path=sigmaStorageSnapshotPath();
$lock=fopen($path.'.worker','c+');
if(!$lock||!flock($lock,LOCK_EX|LOCK_NB))exit;
try {
    $config=loadServiceSettings()['google_drive']??[];
    try {$result=['success'=>true,'usage'=>sigmaCollectStorageSnapshot($config)];}
    catch(Throwable $error){
        $previous=is_file($path)?json_decode(file_get_contents($path),true):null;
        $result=($previous['scope']??'')===sigmaStorageSnapshotScope($config)&&!empty($previous['result']['usage'])
            ? array_merge($previous['result'],['stale'=>true,'refresh_error'=>$error->getMessage()])
            : ['success'=>false,'error'=>$error->getMessage()];
    }
    $tmp=$path.'.'.bin2hex(random_bytes(4)).'.tmp';
    file_put_contents($tmp,json_encode(['scope'=>sigmaStorageSnapshotScope($config),'at'=>time(),'result'=>$result],JSON_THROW_ON_ERROR),LOCK_EX);
    chmod($tmp,0600);rename($tmp,$path);
}finally{@unlink($path.'.pending');flock($lock,LOCK_UN);fclose($lock);}
