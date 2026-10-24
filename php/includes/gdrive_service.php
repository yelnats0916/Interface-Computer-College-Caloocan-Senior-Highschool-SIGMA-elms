<?php
/**
 * SIGMA ELMS — Google Drive Complete Hierarchy Provisioning Service
 * Automatically builds full institutional directory trees for every School Year.
 */

function getGdriveAccessToken(string $keyFile) {
    require_once __DIR__ . '/service_secrets.php';
    $driveConfig = loadServiceSettings()['google_drive'] ?? [];
    if (!empty($driveConfig['oauth']['refresh_token'])) {
        require_once __DIR__.'/gdrive_oauth.php';
        return sigmaDriveOAuthAccessToken($driveConfig);
    }
    return getGdriveServiceAccountAccessToken($driveConfig['service_account'] ?? []);
}

// Used by service-account connections and owner-scoped maintenance of legacy folders.
function getGdriveServiceAccountAccessToken(array $keyData) {
    if (!$keyData || empty($keyData['client_email']) || empty($keyData['private_key'])) return null;

    $now = time();
    $header = str_replace(["+", "/", "="], ["-", "_", ""], base64_encode(json_encode(["alg" => "RS256", "typ" => "JWT"])));
    $claim = str_replace(["+", "/", "="], ["-", "_", ""], base64_encode(json_encode([
        "iss" => $keyData["client_email"],
        "scope" => "https://www.googleapis.com/auth/drive",
        "aud" => "https://oauth2.googleapis.com/token",
        "exp" => $now + 3600,
        "iat" => $now
    ])));
    $toSign = $header . "." . $claim;
    $privKey = @openssl_pkey_get_private($keyData["private_key"]);
    if (!$privKey) return null;
    if (!@openssl_sign($toSign, $signature, $privKey, OPENSSL_ALGO_SHA256)) return null;
    $jwt = $toSign . "." . str_replace(["+", "/", "="], ["-", "_", ""], base64_encode($signature));

    $ch = curl_init("https://oauth2.googleapis.com/token");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
        "grant_type" => "urn:ietf:params:oauth:grant-type:jwt-bearer",
        "assertion" => $jwt
    ]));
    curl_setopt($ch, CURLOPT_TIMEOUT, 12);
    $res = curl_exec($ch);
    curl_close($ch);

    $tokenData = json_decode($res, true);
    return $tokenData['access_token'] ?? null;
}

function sigmaGdriveFolderSegment(string $name): string {
    $name=trim(preg_replace('/\s+/u',' ',preg_replace('/[\x00-\x1F\/\\\\]+/u',' ',$name)));
    $aliases=['tasks and materials'=>'Tasks','1. learning materials'=>'Learning Materials',
        '2. student submissions'=>'Student Submissions','3. quizzes & assessments'=>'Quizzes',
        '4. faculty & teacher portfolios'=>'Faculty','5. system backups & archives'=>'Backups'];
    return mb_substr($aliases[mb_strtolower($name)]??$name,0,180);
}

function findOrCreateGdriveFolder(string $token, string $parentFolderId, string $folderName) {
    if ($token==='' || $parentFolderId==='') return null;
    $folderName=sigmaGdriveFolderSegment($folderName);if($folderName==='')return null;
    require_once __DIR__.'/service_secrets.php';$db=serviceSettingsPdo();
    $key=hash('sha256',$parentFolderId."\n".mb_strtolower($folderName));$lock='gdf:'.substr($key,0,60);
    $q=$db->prepare('SELECT GET_LOCK(?,15)');$q->execute([$lock]);
    if((int)$q->fetchColumn()!==1)return null;
    try {
        $cached=null;
        try{$q=$db->prepare('SELECT folder_id FROM gdrive_folder_registry WHERE path_key=?');$q->execute([$key]);$cached=$q->fetchColumn();}catch(PDOException $e){if($e->getCode()!=='42S02')throw $e;}
        if($cached){
            $ch=curl_init('https://www.googleapis.com/drive/v3/files/'.rawurlencode($cached).'?supportsAllDrives=true&fields=id,name,parents,trashed,webViewLink');
            curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_HTTPHEADER=>['Authorization: Bearer '.$token],CURLOPT_TIMEOUT=>12]);
            $file=json_decode(curl_exec($ch),true);$status=curl_getinfo($ch,CURLINFO_HTTP_CODE);curl_close($ch);
            if($status===200 && empty($file['trashed']) && ($file['name']??'')===$folderName && in_array($parentFolderId,$file['parents']??[],true))
                return ['id'=>$file['id'],'name'=>$file['name'],'url'=>$file['webViewLink']??'https://drive.google.com/drive/folders/'.$file['id']];
            // A transient failure must never trigger creation of another folder.
            if($status!==200 && $status!==404)return null;
        }
        $folder=sigmaFindOrCreateGdriveFolderUnlocked($token,$parentFolderId,$folderName);
        if($folder){
            try{$db->prepare('INSERT INTO gdrive_folder_registry(path_key,parent_id,folder_name,folder_id) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE folder_name=VALUES(folder_name),folder_id=VALUES(folder_id)')->execute([$key,$parentFolderId,$folderName,$folder['id']]);}
            catch(PDOException $e){if($e->getCode()!=='42S02')throw $e;}
        }
        return $folder;
    } finally {$db->prepare('SELECT RELEASE_LOCK(?)')->execute([$lock]);}
}

function sigmaFindOrCreateGdriveFolderUnlocked(string $token, string $parentFolderId, string $folderName) {
    if (empty($token) || empty($parentFolderId) || empty($folderName)) return null;

    $query = urlencode("'" . $parentFolderId . "' in parents and mimeType = 'application/vnd.google-apps.folder' and name = '" . addslashes($folderName) . "' and trashed = false");
    $ch = curl_init("https://www.googleapis.com/drive/v3/files?q={$query}&supportsAllDrives=true&includeItemsFromAllDrives=true&fields=files(id,name,webViewLink)");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ["Authorization: Bearer {$token}"]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 12);
    $list = json_decode(curl_exec($ch), true);
    $listStatus = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($listStatus < 200 || $listStatus >= 300 || !is_array($list)) return null;

    if (!empty($list['files'][0]['id'])) {
        return [
            'id' => $list['files'][0]['id'],
            'name' => $list['files'][0]['name'],
            'url' => $list['files'][0]['webViewLink'] ?? ('https://drive.google.com/drive/folders/' . $list['files'][0]['id'])
        ];
    }

    $payload = json_encode([
        'name' => $folderName,
        'mimeType' => 'application/vnd.google-apps.folder',
        'parents' => [$parentFolderId]
    ]);
    $chCreate = curl_init("https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id,name,webViewLink");
    curl_setopt($chCreate, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($chCreate, CURLOPT_POST, true);
    curl_setopt($chCreate, CURLOPT_POSTFIELDS, $payload);
    curl_setopt($chCreate, CURLOPT_HTTPHEADER, [
        "Authorization: Bearer {$token}",
        "Content-Type: application/json"
    ]);
    curl_setopt($chCreate, CURLOPT_TIMEOUT, 15);
    $created = json_decode(curl_exec($chCreate), true);
    curl_close($chCreate);

    if (!empty($created['id'])) {
        return [
            'id' => $created['id'],
            'name' => $created['name'] ?? $folderName,
            'url' => $created['webViewLink'] ?? ('https://drive.google.com/drive/folders/' . $created['id'])
        ];
    }

    return null;
}

/**
 * Automatically builds the comprehensive institutional folder hierarchy for a school year
 */
function provisionSchoolYearFolders(int $yearStart, int $yearEnd, string $campusName = 'Caloocan Campus') {
    $rootDir = dirname(__DIR__, 2);
    $keyPath = $rootDir . '/config/google_service_account.json';

    $services = file_exists($rootDir . '/config/services.php') ? require($rootDir . '/config/services.php') : [];
    if (empty($services['google_drive']['service_account']['private_key']) && empty($services['google_drive']['oauth']['refresh_token'])) return null;
    $rootFolderId = $services['google_drive']['folder_id'] ?? '';
    if ($rootFolderId === '' || $yearEnd !== $yearStart + 1) return null;

    $token = getGdriveAccessToken($keyPath);
    if (!$token) return null;

    // Ensure Campus folder exists under Root (e.g. Caloocan Campus)
    $campusFolder = findOrCreateGdriveFolder($token, $rootFolderId, $campusName);
    if (empty($campusFolder['id'])) return null;
    $campusParentId = $campusFolder['id'];

    $syFolderName = "S.Y. {$yearStart}-{$yearEnd}";
    $syFolder = findOrCreateGdriveFolder($token, $campusParentId, $syFolderName);
    if (!$syFolder || empty($syFolder['id'])) return null;

    $syId = $syFolder['id'];

    // Category roots are shared; actual users, sections, subjects and quarters
    // are created only when real content is uploaded, never from a fixed subject list.
    $categories = [];
    foreach (['materials'=>'Learning Materials','tasks'=>'Tasks','submissions'=>'Student Submissions',
        'quizzes'=>'Quizzes','faculty'=>'Faculty','backups'=>'Backups'] as $key=>$name) {
        $folder=findOrCreateGdriveFolder($token,$syId,$name);
        if (empty($folder['id'])) return null;
        $categories[$key]=$folder['id'];
    }

    return [
        'sy_folder_id'  => $syId,
        'sy_folder_url' => $syFolder['url'],
        'sy_name'       => $syFolderName,
        'folders'       => $categories
    ];
}

/**
 * Lazily resolves or creates a specific path on Google Drive only when an upload is triggered
 * E.g. ['S.Y. 2026-2027', '4. Faculty & Teacher Portfolios', 'Juan Dela Cruz (T-2024-001)', 'Lesson Plans (DLP & DLL)']
 */
function resolveGdriveFolderPath(string $token, string $rootFolderId, array $pathSegments) {
    if (empty($token) || empty($rootFolderId) || empty($pathSegments)) return null;

    $currentParentId = $rootFolderId;
    $lastFolder = null;

    foreach ($pathSegments as $segment) {
        $cleanSegment = sigmaGdriveFolderSegment((string)$segment);
        if ($cleanSegment === '') continue;

        $folder = findOrCreateGdriveFolder($token, $currentParentId, $cleanSegment);
        if (!is_array($folder) || empty($folder['id'])) return null;
        $currentParentId = $folder['id'];
        $lastFolder = $folder;
    }

    return $lastFolder;
}

/**
 * Strict Folder Template Blueprints
 * Prevents random folder names and enforces institutional consistency.
 */
class GdriveTemplate {
    public const CAMPUS_NAME = 'Caloocan Campus';

    public static function formatSchoolYear(int $start, int $end): string {
        return "S.Y. {$start}-{$end}";
    }

    public static function formatTeacherFolder(string $name, string $id): string {
        $cleanName = ucwords(strtolower(trim($name)));
        $cleanId = strtoupper(trim($id));
        return "{$cleanName} ({$cleanId})";
    }

    public static function formatStudentFolder(string $name, string $lrn): string {
        $cleanName = ucwords(strtolower(trim($name)));
        $cleanLrn = trim($lrn);
        return "{$cleanName} (LRN: {$cleanLrn})";
    }

    public static function formatQuarter($quarter): string {
        $q = (int) preg_replace('/\D/', '', (string)$quarter);
        if ($q === 1) return '1st Quarter';
        if ($q === 2) return '2nd Quarter';
        if ($q === 3) return '3rd Quarter';
        if ($q === 4) return '4th Quarter';
        return '1st Quarter';
    }

    public static function formatGrade($grade): string {
        $g = (int) preg_replace('/\D/', '', (string)$grade);
        return ($g === 12) ? 'Grade 12' : 'Grade 11';
    }
}



