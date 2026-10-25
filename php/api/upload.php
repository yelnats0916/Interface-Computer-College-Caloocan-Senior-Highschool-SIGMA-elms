<?php
/**
 * SIGMA ELMS — Centralized Upload & Storage API
 * Endpoint: /php/api/upload.php
 * 
 * Handles uploaded files (learning materials, question images, documents, videos),
 * stores them with permanent server URLs, and links with Google Drive Storage.
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
require_once dirname(__DIR__) . '/includes/service_vault_auth.php';
require_once dirname(__DIR__) . '/includes/service_key_validation.php';
require_once dirname(__DIR__) . '/includes/gdrive_service.php';
require_once dirname(__DIR__) . '/includes/application_auth.php';
require_once dirname(__DIR__) . '/includes/material_storage.php';
require_once dirname(__DIR__) . '/includes/material_limits.php';
restrictServiceOrigin();
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$rootDir = dirname(__DIR__, 2);
$services = file_exists($rootDir . '/config/services.php') ? require($rootDir . '/config/services.php') : [];
$driveConfig = $services['google_drive'] ?? [];

function jsonOut(array $data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function getGoogleAccessToken(string $keyFile) {
    $token = getGdriveAccessToken($keyFile);
    if (!$token) return null;
    $account = loadServiceSettings()['google_drive']['service_account'] ?? [];
    return ['token' => $token, 'email' => $account['client_email'] ?? '', 'project_id' => $account['project_id'] ?? ''];
}

function uploadFileToGoogleDrive(string $keyFile, string $filePath, string $fileName, string $folderId) {
    if (!file_exists($filePath) || empty($folderId)) return null;
    $auth = getGoogleAccessToken($keyFile);
    if (!$auth || empty($auth['token'])) return null;

    return sigmaUploadDriveFile($auth['token'], $filePath, $fileName, $folderId);
}

// Shared usage totals are read-only for active administrators. Credential changes remain protected.
if ($_SERVER['REQUEST_METHOD'] === 'GET' && ($_GET['action'] ?? '') === 'folder_usage') {
    $usageActor = sigmaRequireApplicationActor(serviceSettingsPdo(), ['admin', 'masteradmin', 'administrator']);
    require_once dirname(__DIR__) . '/includes/storage_usage_snapshot.php';
    try {
        $result = sigmaStorageSnapshot($driveConfig);
        jsonOut($result, !empty($result['pending']) ? 202 : (!empty($result['success']) ? 200 : 502));
    } catch (Throwable $error) { jsonOut(['success'=>false,'error'=>$error->getMessage()],502); }
}

// Saved configuration is read without waiting for Google. Test Connection performs
// the remote checks separately so a slow token request cannot hide saved settings.
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    sigmaRequireApplicationActor(serviceSettingsPdo(), ['admin','masteradmin','administrator']);
    $oauthConnected = !empty($driveConfig['oauth']['refresh_token']);
    $hasKey = !empty($driveConfig['service_account']['private_key']);
    $folderId = (string)($driveConfig['folder_id'] ?? '');
    jsonOut(['success'=>true,'status'=>'ready','google_drive'=>[
        'configured'=>$hasKey || $oauthConnected,
        'connection_mode'=>$oauthConnected ? 'google_account' : 'service_account',
        'oauth_configured'=>!empty($driveConfig['oauth']['client_id']),
        'oauth_connected'=>$oauthConnected,
        'service_account_email'=>$driveConfig['service_account']['client_email'] ?? $driveConfig['service_account_email'] ?? '',
        'folder_id'=>$folderId,
        'folder_url'=>$folderId ? 'https://drive.google.com/drive/folders/'.$folderId : '',
        'storage_limit_gb'=>(float)($driveConfig['storage_limit_gb'] ?? 15),
        'quota'=>null
    ]]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonOut(['success' => false, 'error' => 'Method not allowed'], 405);
}

$uploadActor = sigmaRequireApplicationActor(serviceSettingsPdo());
require_once dirname(__DIR__) . '/includes/role_permissions.php';
$uploadRole = preg_replace('/[\s_-]+/', '', strtolower($uploadActor['role']));
if ($uploadRole === 'teacher' && !sigmaActorPermission($uploadActor,'teacherMaterials')) jsonOut(['success'=>false,'error'=>'Material uploads are disabled for this account.'],403);

// Check for JSON or POST payload actions
$rawInput = stripos($_SERVER['CONTENT_TYPE']??'', 'application/json')!==false ? file_get_contents('php://input') : '';
$jsonPayload = json_decode($rawInput, true) ?: [];
$action = $_POST['action'] ?? $jsonPayload['action'] ?? 'upload';
if (in_array($action, ['test_connection', 'save_config', 'upload_key'], true)) {
    sigmaRequireApplicationActor(serviceSettingsPdo(), ['admin', 'masteradmin', 'administrator']);
    requireServiceVaultAccess();
}

// ── Action: TEST CONNECTION ──────────────────────────────────────────────────
if ($action === 'test_connection') {
    $keyPath = $rootDir . '/config/google_service_account.json';
    if (empty($driveConfig['service_account']['private_key']) && empty($driveConfig['oauth']['refresh_token'])) {
        jsonOut(['success' => false, 'error' => 'Service account key file not found on server.'], 404);
    }
    $auth = getGoogleAccessToken($keyPath);
    if (!$auth || !$auth['token']) {
        jsonOut(['success' => false, 'error' => 'Could not authenticate with Google Cloud. Verify your service account key.'], 401);
    }

    // Ping folder
    $folderId = trim((string)($jsonPayload['folder_id'] ?? $_POST['folder_id'] ?? $driveConfig['folder_id'] ?? ''));
    $folderValid = false;
    $folderName = 'SIGMA ELMS Storage';
    if ($folderId !== '') {
        $ch = curl_init("https://www.googleapis.com/drive/v3/files/" . urlencode($folderId) . "?supportsAllDrives=true&fields=id,name,mimeType,trashed,driveId,capabilities(canAddChildren)");
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ["Authorization: Bearer " . $auth['token']]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 8);
        $fRes = json_decode(curl_exec($ch), true);
        curl_close($ch);
        if (!empty($fRes['id']) && empty($fRes['trashed']) && ($fRes['mimeType'] ?? '') === 'application/vnd.google-apps.folder' && !empty($fRes['capabilities']['canAddChildren'])) {
            $folderValid = true;
            $folderName = $fRes['name'] ?? $folderName;
        }
    }

    jsonOut([
        'success'      => $folderValid,
        'upload_ready' => $folderValid && (!empty($driveConfig['oauth']['refresh_token']) || !empty($fRes['driveId'])),
        'error'        => $folderValid ? null : 'The configured folder cannot accept files. Check its sharing permissions.',
        'message'      => !empty($driveConfig['oauth']['refresh_token']) || !empty($fRes['driveId']) ? 'Google Drive folder access verified.' : 'The API can read this folder. Connect your Google account below to upload files to My Drive.',
        'email'        => $auth['email'],
        'project_id'   => $auth['project_id'],
        'folder_id'    => $folderId,
        'folder_name'  => $folderName,
        'folder_valid' => $folderValid
    ]);
}

// ── Action: SAVE CONFIG (Folder ID, URL & Capacity Tier) ──────────────────────
if ($action === 'save_config') {
    $newFolderId = trim((string)($jsonPayload['folder_id'] ?? $_POST['folder_id'] ?? ''));
    if ($newFolderId !== '') {
        if (preg_match('/folders\/([a-zA-Z0-9_-]+)/', $newFolderId, $m)) {
            $newFolderId = $m[1];
        }
        $services['google_drive']['folder_id'] = $newFolderId;
        $services['google_drive']['folder_url'] = 'https://drive.google.com/drive/folders/' . $newFolderId;
    }
    if (isset($jsonPayload['storage_limit_gb']) || isset($_POST['storage_limit_gb'])) {
        $limitGb = (float)($jsonPayload['storage_limit_gb'] ?? $_POST['storage_limit_gb']);
        if ($limitGb > 0) {
            $services['google_drive']['storage_limit_gb'] = $limitGb;
        }
    }
    saveServiceSettings($services);
    jsonOut([
        'success'          => true, 
        'message'          => 'Google Drive configuration saved successfully.', 
        'folder_id'        => $services['google_drive']['folder_id'] ?? $newFolderId,
        'storage_limit_gb' => $services['google_drive']['storage_limit_gb'] ?? 15
    ]);
}

// ── Action: UPLOAD JSON KEY FILE ─────────────────────────────────────────────
if ($action === 'upload_key') {
    $keyUpload = $_FILES['key_file'] ?? null;
    if (!$keyUpload || $keyUpload['error'] !== UPLOAD_ERR_OK) {
        jsonOut(['success' => false, 'error' => 'Please select a valid .json key file.'], 400);
    }
    if ($keyUpload['size'] > 32768 || strtolower(pathinfo($keyUpload['name'], PATHINFO_EXTENSION)) !== 'json' || !is_uploaded_file($keyUpload['tmp_name'])) jsonOut(['success' => false, 'error' => 'Use a service-account JSON file smaller than 32 KB.'], 400);
    $content = file_get_contents($keyUpload['tmp_name']);
    $parsed = json_decode($content, true);
    if (!$parsed || empty($parsed['client_email']) || empty($parsed['private_key'])) {
        jsonOut(['success' => false, 'error' => 'Invalid Google Service Account JSON file.'], 400);
    }
    try { $parsed = validateGoogleServiceAccount($parsed); }
    catch (InvalidArgumentException $error) { jsonOut(['success' => false, 'error' => $error->getMessage()], 400); }
    $services['google_drive']['service_account'] = $parsed;

    $services['google_drive']['service_account_email'] = $parsed['client_email'];
    saveServiceSettings($services);

    jsonOut(['success' => true, 'message' => 'Service account key uploaded and validated successfully.', 'email' => $parsed['client_email']]);
}

// ── Action: FILE UPLOADS (Materials, Videos, Images, Documents) ───────────────
$uploadedFile = $_FILES['file'] ?? $_FILES['media'] ?? $_FILES['document'] ?? null;
$category = trim($_POST['category'] ?? 'materials');
$materialPath = null;
$materialSubject = null;
if ($category === 'subject-material') {
    if (!in_array($uploadRole, ['admin','masteradmin','administrator'], true)) jsonOut(['success'=>false,'error'=>'Master curriculum uploads require an administrator account.'],403);
    $db = serviceSettingsPdo();
    $find = $db->prepare('SELECT id,code,name,topics FROM subjects WHERE id=? AND is_deleted=0');
    $find->execute([trim((string)($_POST['subject_id'] ?? ''))]);
    $materialSubject = $find->fetch(PDO::FETCH_ASSOC);
    $topic = null;
    foreach (json_decode($materialSubject['topics'] ?? '[]',true) ?: [] as $candidate) {
        if ((string)$candidate['id'] === (string)($_POST['topic_id'] ?? '')) { $topic=$candidate; break; }
    }
    $materialTitle = trim((string)($_POST['material_title'] ?? ''));
    if (!$materialSubject || !$topic || $materialTitle === '') jsonOut(['success'=>false,'error'=>'Select an existing subject and topic and enter the material title.'],422);
    $assetKind = ($_POST['asset_kind'] ?? '') === 'rubric' ? 'rubric' : 'instructions';
    $materialType=trim((string)($_POST['material_type']??'Task'));
    if(!in_array($materialType,['Lesson','Video','Quiz','Task','Assignment','Activity','Performance Task'],true))jsonOut(['success'=>false,'error'=>'Invalid material type.'],422);
    $materialPath = sigmaMaterialFolderPath($uploadActor,$materialSubject,$topic,$materialTitle,$assetKind,$materialType);
}

if (!$uploadedFile || $uploadedFile['error'] !== UPLOAD_ERR_OK) {
    $errCode = $uploadedFile['error'] ?? UPLOAD_ERR_NO_FILE;
    $errMap = [
        UPLOAD_ERR_INI_SIZE   => 'File exceeds server upload_max_filesize directive',
        UPLOAD_ERR_FORM_SIZE  => 'File exceeds MAX_FILE_SIZE specified in HTML form',
        UPLOAD_ERR_PARTIAL    => 'File was only partially uploaded',
        UPLOAD_ERR_NO_FILE    => 'No file was uploaded',
        UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder on server',
        UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
        UPLOAD_ERR_EXTENSION  => 'A PHP extension stopped the file upload',
    ];
    jsonOut(['success' => false, 'error' => $errMap[$errCode] ?? "Upload failed with error code {$errCode}"], in_array($errCode,[UPLOAD_ERR_INI_SIZE,UPLOAD_ERR_FORM_SIZE],true)?413:400);
}

$limits=sigmaMaterialLimits(loadServiceSettings()['material_limits']??[]);
try {sigmaValidateUploadSize($limits,(string)$uploadedFile['name'],(int)filesize($uploadedFile['tmp_name']));}
catch(InvalidArgumentException $error){jsonOut(['success'=>false,'error'=>$error->getMessage()],413);}
$reservedBatch=null;$uploadStored=false;
if($category==='submissions'){
    try {$reservedBatch=sigmaReserveSubmissionBytes(serviceSettingsPdo(),(string)$uploadActor['id'],(string)($_POST['submission_batch_id']??''),(int)filesize($uploadedFile['tmp_name']),$limits);}
    catch(InvalidArgumentException $error){jsonOut(['success'=>false,'error'=>$error->getMessage()],413);}
    register_shutdown_function(function() use (&$uploadStored,$reservedBatch){if(!$uploadStored&&$reservedBatch){try{serviceSettingsPdo()->prepare('UPDATE upload_submission_batches SET total_bytes=GREATEST(0,total_bytes-?) WHERE user_id=? AND batch_id=?')->execute($reservedBatch);}catch(Throwable $ignored){}}});
}

// Determine target directory
$subDir = 'materials';
$ext = strtolower(pathinfo($uploadedFile['name'], PATHINFO_EXTENSION));

$imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
$videoExts = ['mp4', 'webm', 'mov', 'mkv', 'avi'];
$docExts   = ['pdf', 'docx', 'doc', 'pptx', 'ppt', 'xlsx', 'xls', 'txt'];
if(!in_array($ext,array_merge($imageExts,$videoExts,$docExts,['zip','json','csv']),true)) jsonOut(['success'=>false,'error'=>'This file format is not supported.'],422);

if (in_array($ext, $imageExts)) {
    $subDir = 'images';
} elseif (in_array($ext, $videoExts)) {
    $subDir = 'videos';
} elseif (in_array($ext, $docExts)) {
    $subDir = 'documents';
}

$uploadBaseDir = $rootDir . '/uploads/' . $subDir;
if (!is_dir($uploadBaseDir)) {
    @mkdir($uploadBaseDir, 0777, true);
}

// Generate unique safe filename
$rawBaseName = pathinfo($uploadedFile['name'], PATHINFO_FILENAME);
$safeBaseName = preg_replace('/[^a-zA-Z0-9_-]/', '_', $rawBaseName);
$uniqueName = $safeBaseName . '_' . time() . '_' . substr(bin2hex(random_bytes(3)), 0, 6) . '.' . $ext;
$targetPath = $uploadBaseDir . '/' . $uniqueName;

if (!move_uploaded_file($uploadedFile['tmp_name'], $targetPath)) {
    jsonOut(['success' => false, 'error' => 'Could not save file to server storage.'], 500);
}

$uploadStored=true;
$relativeUrl = 'uploads/' . $subDir . '/' . $uniqueName;
$fileSize = (int)filesize($targetPath);
// Target Google Drive Folder Mapping (Just-in-Time Dynamic Resolution)
$rootFolderId = $driveConfig['folder_id'] ?? '';
$targetGdriveFolderId = '';

$keyPath = $rootDir . '/config/google_service_account.json';
$auth = getGoogleAccessToken($keyPath);
$token = $auth['token'] ?? null;

// Check if a specific contextual path is requested for this upload
$customPath = $materialPath ?? ($_POST['folder_path'] ?? sigmaGeneralUploadFolderPath($uploadActor,$category));
if ($customPath && is_string($customPath)) {
    $decoded = json_decode($customPath, true);
    if (is_array($decoded)) {
        $customPath = $decoded;
    } else {
        $customPath = array_values(array_filter(explode('/', trim($customPath, '/'))));
    }
}

if (empty($customPath) || !is_array($customPath)) $customPath=sigmaGeneralUploadFolderPath($uploadActor,$category);
if ($token && $rootFolderId) {
    $resolvedFolder = resolveGdriveFolderPath($token, $rootFolderId, $customPath);
    $targetGdriveFolderId = $resolvedFolder['id'] ?? '';
}

$gdriveFile = null;
if (!empty($token) && !empty($targetGdriveFolderId)) {
    $gdriveFile = sigmaUploadDriveFile($token, $targetPath, $uploadedFile['name'], $targetGdriveFolderId);
}
$syncError = $gdriveFile['error']['message'] ?? (empty($gdriveFile['id']) ? 'Google Drive upload is pending. Check the storage connection.' : null);
$uploadId = null;
if ($materialSubject) {
    $uploadId = bin2hex(random_bytes(16));
    sigmaEnsureMaterialUploads($db);
    $db->prepare('INSERT INTO material_uploads(id,actor_id,subject_id,topic_id,material_title,asset_kind,local_url,file_name,folder_path,drive_file_id,drive_folder_id,sync_error,synced_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)')
        ->execute([$uploadId,$uploadActor['id'],$materialSubject['id'],$topic['id'],$materialTitle,$assetKind,$relativeUrl,$uploadedFile['name'],json_encode($materialPath),$gdriveFile['id']??null,$targetGdriveFolderId,$syncError,empty($gdriveFile['id'])?null:gmdate('Y-m-d H:i:s')]);
}

jsonOut([
    'success'      => true,
    'uploadId'     => $uploadId,
    'warning'      => $syncError,
    'url'          => $relativeUrl,
    'fileName'     => $uploadedFile['name'],
    'storedName'   => $uniqueName,
    'fileType'     => $ext,
    'category'     => $subDir,
    'size'         => $fileSize,
    'google_drive' => [
        'folder_id'      => $targetGdriveFolderId,
        'folder_url'     => 'https://drive.google.com/drive/folders/' . $targetGdriveFolderId,
        'file_id'        => $gdriveFile['id'] ?? null,
        'view_link'      => $gdriveFile['webViewLink'] ?? null,
        'download_link'  => $gdriveFile['webContentLink'] ?? null,
        'synced'         => !empty($gdriveFile['id'])
    ]
]);
