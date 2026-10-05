<?php
/**
 * SIGMA ELMS — Centralized Upload & Storage API
 * Endpoint: /php/api/upload.php
 * 
 * Handles uploaded files (learning materials, question images, documents, videos),
 * stores them with permanent server URLs, and links with Google Drive Storage.
 */

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Access-Control-Allow-Origin: *');
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
    if (!file_exists($keyFile)) return null;
    $keyData = json_decode(file_get_contents($keyFile), true);
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
    @openssl_sign($toSign, $signature, $privKey, OPENSSL_ALGO_SHA256);
    $jwt = $toSign . "." . str_replace(["+", "/", "="], ["-", "_", ""], base64_encode($signature));

    $ch = curl_init("https://oauth2.googleapis.com/token");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
        "grant_type" => "urn:ietf:params:oauth:grant-type:jwt-bearer",
        "assertion" => $jwt
    ]));
    curl_setopt($ch, CURLOPT_TIMEOUT, 8);
    $res = curl_exec($ch);
    curl_close($ch);

    $tokenData = json_decode($res, true);
    return [
        'token' => $tokenData['access_token'] ?? null,
        'email' => $keyData['client_email'] ?? '',
        'project_id' => $keyData['project_id'] ?? ''
    ];
}

function uploadFileToGoogleDrive(string $keyFile, string $filePath, string $fileName, string $folderId) {
    if (!file_exists($keyFile) || !file_exists($filePath) || empty($folderId)) return null;
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

// GET status endpoint
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $keyPath = $rootDir . '/config/google_service_account.json';
    $hasKey = file_exists($keyPath);
    $email = '';
    if ($hasKey) {
        $k = json_decode(file_get_contents($keyPath), true);
        $email = $k['client_email'] ?? '';
    }

    jsonOut([
        'success'      => true,
        'status'       => 'ready',
        'google_drive' => [
            'configured'            => $hasKey,
            'service_account_email' => $email ?: ($driveConfig['service_account_email'] ?? ''),
            'folder_id'             => $driveConfig['folder_id'] ?? '',
            'folder_url'            => $driveConfig['folder_url'] ?? '',
        ]
    ]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonOut(['success' => false, 'error' => 'Method not allowed'], 405);
}

// Check for JSON or POST payload actions
$rawInput = file_get_contents('php://input');
$jsonPayload = json_decode($rawInput, true) ?: [];
$action = $_POST['action'] ?? $jsonPayload['action'] ?? 'upload';

// ── Action: TEST CONNECTION ──────────────────────────────────────────────────
if ($action === 'test_connection') {
    $keyPath = $rootDir . '/config/google_service_account.json';
    if (!file_exists($keyPath)) {
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

// ── Action: SAVE CONFIG (Folder ID or URL) ───────────────────────────────────
if ($action === 'save_config') {
    $newFolderId = trim((string)($jsonPayload['folder_id'] ?? $_POST['folder_id'] ?? ''));
    if ($newFolderId !== '') {
        if (preg_match('/folders\/([a-zA-Z0-9_-]+)/', $newFolderId, $m)) {
            $newFolderId = $m[1];
        }
        $services['google_drive']['folder_id'] = $newFolderId;
        $services['google_drive']['folder_url'] = 'https://drive.google.com/drive/folders/' . $newFolderId;
        
        $configExport = "<?php\n/**\n * SIGMA ELMS - API Credentials & Services Configuration\n */\n\nreturn " . var_export($services, true) . ";\n";
        file_put_contents($rootDir . '/config/services.php', $configExport);
    }
    jsonOut(['success' => true, 'message' => 'Google Drive configuration saved successfully.', 'folder_id' => $newFolderId]);
}

// ── Action: UPLOAD JSON KEY FILE ─────────────────────────────────────────────
if ($action === 'upload_key') {
    $keyUpload = $_FILES['key_file'] ?? null;
    if (!$keyUpload || $keyUpload['error'] !== UPLOAD_ERR_OK) {
        jsonOut(['success' => false, 'error' => 'Please select a valid .json key file.'], 400);
    }
    $content = file_get_contents($keyUpload['tmp_name']);
    $parsed = json_decode($content, true);
    if (!$parsed || empty($parsed['client_email']) || empty($parsed['private_key'])) {
        jsonOut(['success' => false, 'error' => 'Invalid Google Service Account JSON file.'], 400);
    }
    $targetKeyPath = $rootDir . '/config/google_service_account.json';
    file_put_contents($targetKeyPath, $content);

    $services['google_drive']['service_account_email'] = $parsed['client_email'];
    $configExport = "<?php\n/**\n * SIGMA ELMS - API Credentials & Services Configuration\n */\n\nreturn " . var_export($services, true) . ";\n";
    file_put_contents($rootDir . '/config/services.php', $configExport);

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
$auth = file_exists($keyPath) ? getGoogleAccessToken($keyPath) : null;
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
if (file_exists($keyPath) && !empty($targetGdriveFolderId)) {
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
