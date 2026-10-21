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

    $fileMime = @mime_content_type($filePath) ?: 'application/octet-stream';
    $fileData = file_get_contents($filePath);
    $boundary = '-------' . md5(microtime(true));

    $metadata = [
        'name' => $fileName,
        'parents' => [$folderId]
    ];

    $body = "--" . $boundary . "\r\n";
    $body .= "Content-Type: application/json; charset=UTF-8\r\n\r\n";
    $body .= json_encode($metadata) . "\r\n";
    $body .= "--" . $boundary . "\r\n";
    $body .= "Content-Type: " . $fileMime . "\r\n\r\n";
    $body .= $fileData . "\r\n";
    $body .= "--" . $boundary . "--";

    $ch = curl_init("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Authorization: Bearer " . $auth['token'],
        "Content-Type: multipart/related; boundary=" . $boundary,
        "Content-Length: " . strlen($body)
    ]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    $raw = curl_exec($ch);
    curl_close($ch);

    return json_decode($raw, true) ?: null;
}

// Folder usage is read-only and restricted to integration administrators.
if ($_SERVER['REQUEST_METHOD'] === 'GET' && ($_GET['action'] ?? '') === 'folder_usage') {
    $usageActor = sigmaRequireApplicationActor(serviceSettingsPdo(), ['admin', 'masteradmin', 'administrator']);
    if (!serviceVaultAdmin($usageActor)) {
        jsonOut(['success' => false, 'error' => 'This administrator cannot view integration storage usage.'], 403);
    }
    require_once dirname(__DIR__) . '/includes/gdrive_usage.php';
    try {
        $auth = getGoogleAccessToken('');
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
        jsonOut(['success' => true, 'usage' => $usage]);
    } catch (Throwable $error) { jsonOut(['success' => false, 'error' => $error->getMessage()], 502); }
}

// GET status endpoint
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $keyPath = $rootDir . '/config/google_service_account.json';
    $hasKey = !empty($driveConfig['service_account']['private_key']);
    $email = '';
    $quota = null;
    $configuredLimitGb = isset($driveConfig['storage_limit_gb']) && is_numeric($driveConfig['storage_limit_gb']) && (float)$driveConfig['storage_limit_gb'] > 0
        ? (float)$driveConfig['storage_limit_gb']
        : 15.0;

    if ($hasKey) {
        $k = $driveConfig['service_account'];
        $email = $k['client_email'] ?? '';
        $auth = getGoogleAccessToken($keyPath);
        if ($auth && !empty($auth['token'])) {
            $ch = curl_init("https://www.googleapis.com/drive/v3/about?fields=storageQuota,user");
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, ["Authorization: Bearer " . $auth['token']]);
            curl_setopt($ch, CURLOPT_TIMEOUT, 3);
            $about = json_decode(curl_exec($ch), true);
            curl_close($ch);
            if (!empty($about['storageQuota'])) {
                $sq = $about['storageQuota'];
                $limit = (isset($sq['limit']) && (float)$sq['limit'] > 0) ? (float)$sq['limit'] : ($configuredLimitGb * 1024 * 1024 * 1024);
                $usage = isset($sq['usage']) ? (float)$sq['usage'] : 0;
                $usedGB = round($usage / (1024 * 1024 * 1024), 2);
                $limitGB = round($limit / (1024 * 1024 * 1024), 1);
                $pct = ($limit && $limit > 0) ? round(($usage / $limit) * 100) : 0;
                $quota = [
                    'used_bytes'  => $usage,
                    'used_gb'     => $usedGB,
                    'limit_bytes' => $limit,
                    'limit_gb'    => $limitGB,
                    'percent'     => $pct
                ];
            }
        }
    }

    if (!$quota && $hasKey) {
        $defaultLimit = $configuredLimitGb * 1024 * 1024 * 1024;
        $quota = [
            'used_bytes'  => 0,
            'used_gb'     => 0,
            'limit_bytes' => $defaultLimit,
            'limit_gb'    => $configuredLimitGb,
            'percent'     => 0
        ];
    }

    jsonOut([
        'success'      => true,
        'status'       => 'ready',
        'google_drive' => [
            'configured'            => $hasKey,
            'service_account_email' => $email ?: ($driveConfig['service_account_email'] ?? ''),
            'folder_id'             => $driveConfig['folder_id'] ?? '',
            'folder_url'            => $driveConfig['folder_url'] ?? '',
            'storage_limit_gb'      => $configuredLimitGb,
            'quota'                 => $quota
        ]
    ]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonOut(['success' => false, 'error' => 'Method not allowed'], 405);
}

$uploadActor = sigmaRequireApplicationActor(serviceSettingsPdo());

// Check for JSON or POST payload actions
$rawInput = file_get_contents('php://input');
$jsonPayload = json_decode($rawInput, true) ?: [];
$action = $_POST['action'] ?? $jsonPayload['action'] ?? 'upload';
if (in_array($action, ['test_connection', 'save_config', 'upload_key'], true)) {
    sigmaRequireApplicationActor(serviceSettingsPdo(), ['admin', 'masteradmin', 'administrator']);
    requireServiceVaultAccess();
}

// ── Action: TEST CONNECTION ──────────────────────────────────────────────────
if ($action === 'test_connection') {
    $keyPath = $rootDir . '/config/google_service_account.json';
    if (empty($driveConfig['service_account']['private_key'])) {
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
        $ch = curl_init("https://www.googleapis.com/drive/v3/files/" . urlencode($folderId) . "?fields=id,name,mimeType,trashed");
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ["Authorization: Bearer " . $auth['token']]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 8);
        $fRes = json_decode(curl_exec($ch), true);
        curl_close($ch);
        if (!empty($fRes['id']) && empty($fRes['trashed'])) {
            $folderValid = true;
            $folderName = $fRes['name'] ?? $folderName;
        }
    }

    jsonOut([
        'success'      => true,
        'message'      => 'Google Drive API handshake successful!',
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
    jsonOut(['success' => false, 'error' => $errMap[$errCode] ?? "Upload failed with error code {$errCode}"], 400);
}

// Determine target directory
$subDir = 'materials';
$ext = strtolower(pathinfo($uploadedFile['name'], PATHINFO_EXTENSION));

$imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
$videoExts = ['mp4', 'webm', 'mov', 'mkv', 'avi'];
$docExts   = ['pdf', 'docx', 'doc', 'pptx', 'ppt', 'xlsx', 'xls', 'txt'];

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

$relativeUrl = 'uploads/' . $subDir . '/' . $uniqueName;
// Target Google Drive Folder Mapping (Just-in-Time Dynamic Resolution)
$foldersMap = $driveConfig['folders'] ?? [];
$rootFolderId = $driveConfig['folder_id'] ?? '';
$targetGdriveFolderId = $rootFolderId;

$keyPath = $rootDir . '/config/google_service_account.json';
$auth = !empty($driveConfig['service_account']['private_key']) ? getGoogleAccessToken($keyPath) : null;
$token = $auth['token'] ?? null;

// Check if a specific contextual path is requested for this upload
$customPath = $_POST['folder_path'] ?? null;
if ($customPath && is_string($customPath)) {
    $decoded = json_decode($customPath, true);
    if (is_array($decoded)) {
        $customPath = $decoded;
    } else {
        $customPath = array_values(array_filter(explode('/', trim($customPath, '/'))));
    }
}

if (!empty($customPath) && is_array($customPath) && $token && $rootFolderId) {
    $resolvedFolder = resolveGdriveFolderPath($token, $rootFolderId, $customPath);
    if ($resolvedFolder && !empty($resolvedFolder['id'])) {
        $targetGdriveFolderId = $resolvedFolder['id'];
    }
} elseif ($category === 'submissions' || $subDir === 'submissions') {
    $targetGdriveFolderId = $foldersMap['submissions'] ?? $targetGdriveFolderId;
} elseif ($category === 'quizzes' || $category === 'questions') {
    $targetGdriveFolderId = $foldersMap['quizzes'] ?? $targetGdriveFolderId;
} elseif ($category === 'backups') {
    $targetGdriveFolderId = $foldersMap['backups'] ?? $targetGdriveFolderId;
} elseif ($category === 'faculty' || $category === 'teacher') {
    $targetGdriveFolderId = $foldersMap['faculty'] ?? $targetGdriveFolderId;
} else {
    $targetGdriveFolderId = $foldersMap['materials'] ?? $targetGdriveFolderId;
}

$gdriveFile = null;
if (!empty($token) && !empty($targetGdriveFolderId)) {
    $gdriveFile = @uploadFileToGoogleDrive($keyPath, $targetPath, $uploadedFile['name'], $targetGdriveFolderId);
}

jsonOut([
    'success'      => true,
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
