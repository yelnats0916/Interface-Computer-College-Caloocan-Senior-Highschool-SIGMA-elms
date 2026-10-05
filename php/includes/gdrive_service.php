<?php
/**
 * SIGMA ELMS — Google Drive Complete Hierarchy Provisioning Service
 * Automatically builds full institutional directory trees for every School Year.
 */

function getGdriveAccessToken(string $keyFile) {
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
    curl_setopt($ch, CURLOPT_TIMEOUT, 12);
    $res = curl_exec($ch);
    curl_close($ch);

    $tokenData = json_decode($res, true);
    return $tokenData['access_token'] ?? null;
}

function findOrCreateGdriveFolder(string $token, string $parentFolderId, string $folderName) {
    if (empty($token) || empty($parentFolderId) || empty($folderName)) return null;

    $query = urlencode("'" . $parentFolderId . "' in parents and mimeType = 'application/vnd.google-apps.folder' and name = '" . addslashes($folderName) . "' and trashed = false");
    $ch = curl_init("https://www.googleapis.com/drive/v3/files?q={$query}&fields=files(id,name,webViewLink)");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ["Authorization: Bearer {$token}"]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 12);
    $list = json_decode(curl_exec($ch), true);
    curl_close($ch);

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
    $chCreate = curl_init("https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink");
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
    if (!file_exists($keyPath)) return null;

    $services = file_exists($rootDir . '/config/services.php') ? require($rootDir . '/config/services.php') : [];
    $rootFolderId = $services['google_drive']['folder_id'] ?? '1qYTOkYZ13nC1ISF_IA2bv97TmMbAyqGK';

    $token = getGdriveAccessToken($keyPath);
    if (!$token) return null;

    // Ensure Campus folder exists under Root (e.g. Caloocan Campus)
    $campusFolder = findOrCreateGdriveFolder($token, $rootFolderId, $campusName);
    $campusParentId = $campusFolder['id'] ?? $rootFolderId;

    $syFolderName = "S.Y. {$yearStart}-{$yearEnd}";
    $syFolder = findOrCreateGdriveFolder($token, $campusParentId, $syFolderName);
    if (!$syFolder || empty($syFolder['id'])) return null;

    $syId = $syFolder['id'];

    // ── 1. Learning Materials ────────────────────────────────────────────────
    $matFolder = findOrCreateGdriveFolder($token, $syId, '1. Learning Materials');
    if ($matFolder) {
        // Grade 11
        $g11Folder = findOrCreateGdriveFolder($token, $matFolder['id'], 'Grade 11');
        if ($g11Folder) {
            $g11Q1 = findOrCreateGdriveFolder($token, $g11Folder['id'], '1st Quarter');
            if ($g11Q1) {
                findOrCreateGdriveFolder($token, $g11Q1['id'], 'Empowerment Technologies');
                findOrCreateGdriveFolder($token, $g11Q1['id'], 'Computer Programming 1');
                findOrCreateGdriveFolder($token, $g11Q1['id'], 'General Mathematics');
                findOrCreateGdriveFolder($token, $g11Q1['id'], 'Oral Communication');
                findOrCreateGdriveFolder($token, $g11Q1['id'], 'Earth and Life Science');
            }
            $g11Q2 = findOrCreateGdriveFolder($token, $g11Folder['id'], '2nd Quarter');
            if ($g11Q2) {
                findOrCreateGdriveFolder($token, $g11Q2['id'], 'Computer Systems Servicing 1');
                findOrCreateGdriveFolder($token, $g11Q2['id'], 'Statistics & Probability');
                findOrCreateGdriveFolder($token, $g11Q2['id'], 'Reading & Writing Skills');
                findOrCreateGdriveFolder($token, $g11Q2['id'], 'Physical Science');
            }
        }

        // Grade 12
        $g12Folder = findOrCreateGdriveFolder($token, $matFolder['id'], 'Grade 12');
        if ($g12Folder) {
            $g12Q1 = findOrCreateGdriveFolder($token, $g12Folder['id'], '1st Quarter');
            if ($g12Q1) {
                findOrCreateGdriveFolder($token, $g12Q1['id'], 'Web Development 1');
                findOrCreateGdriveFolder($token, $g12Q1['id'], '21st Century Literature');
                findOrCreateGdriveFolder($token, $g12Q1['id'], 'Contemporary Philippine Arts');
                findOrCreateGdriveFolder($token, $g12Q1['id'], 'Media & Information Literacy');
            }
            $g12Q2 = findOrCreateGdriveFolder($token, $g12Folder['id'], '2nd Quarter');
            if ($g12Q2) {
                findOrCreateGdriveFolder($token, $g12Q2['id'], 'Database Management Systems');
                findOrCreateGdriveFolder($token, $g12Q2['id'], 'Practical Research 2');
                findOrCreateGdriveFolder($token, $g12Q2['id'], 'Work Immersion & Capstone');
            }
        }

        // Syllabi & Guides
        findOrCreateGdriveFolder($token, $matFolder['id'], 'Syllabi & Curriculum Guides');
    }

    // ── 2. Student Submissions ───────────────────────────────────────────────
    $submFolder = findOrCreateGdriveFolder($token, $syId, '2. Student Submissions');
    if ($submFolder) {
        $sub11 = findOrCreateGdriveFolder($token, $submFolder['id'], 'Grade 11 Submissions');
        if ($sub11) {
            findOrCreateGdriveFolder($token, $sub11['id'], '1st Quarter Tasks');
            findOrCreateGdriveFolder($token, $sub11['id'], '2nd Quarter Tasks');
        }
        $sub12 = findOrCreateGdriveFolder($token, $submFolder['id'], 'Grade 12 Submissions');
        if ($sub12) {
            findOrCreateGdriveFolder($token, $sub12['id'], '1st Quarter Tasks');
            findOrCreateGdriveFolder($token, $sub12['id'], '2nd Quarter Tasks');
        }
    }

    // ── 3. Quizzes & Assessments ─────────────────────────────────────────────
    $quizFolder = findOrCreateGdriveFolder($token, $syId, '3. Quizzes & Assessments');
    if ($quizFolder) {
        findOrCreateGdriveFolder($token, $quizFolder['id'], 'Question Bank Media');
        findOrCreateGdriveFolder($token, $quizFolder['id'], 'Exam Diagrams & Figures');
    }

    // ── 4. Faculty & Teacher Portfolios ──────────────────────────────────────
    $facFolder = findOrCreateGdriveFolder($token, $syId, '4. Faculty & Teacher Portfolios');
    if ($facFolder) {
        findOrCreateGdriveFolder($token, $facFolder['id'], 'Lesson Plans (DLP & DLL)');
        findOrCreateGdriveFolder($token, $facFolder['id'], 'Class Records & Grading Sheets');
    }

    // ── 5. System Backups & Archives ─────────────────────────────────────────
    $backupFolder = findOrCreateGdriveFolder($token, $syId, '5. System Backups & Archives');
    if ($backupFolder) {
        findOrCreateGdriveFolder($token, $backupFolder['id'], 'Database SQL Snapshots');
        findOrCreateGdriveFolder($token, $backupFolder['id'], 'Audit Logs & Exported Reports');
    }

    return [
        'sy_folder_id'  => $syId,
        'sy_folder_url' => $syFolder['url'],
        'sy_name'       => $syFolderName,
        'folders'       => [
            'materials'   => $matFolder['id'] ?? null,
            'submissions' => $submFolder['id'] ?? null,
            'quizzes'     => $quizFolder['id'] ?? null,
            'faculty'     => $facFolder['id'] ?? null,
            'backups'     => $backupFolder['id'] ?? null
        ]
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
        $cleanSegment = trim((string)$segment);
        if ($cleanSegment === '') continue;

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



