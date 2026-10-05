<?php
/**
 * SIGMA ELMS — Authentication & Security REST API (2FA / Google Authenticator & reCAPTCHA)
 * Interface Computer College Caloocan SHS
 * 
 * Endpoint: /php/api/auth.php
 */

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$rootDir = dirname(__DIR__, 2);
require_once $rootDir . '/config/database.php';
require_once $rootDir . '/php/includes/totp_service.php';
require_once $rootDir . '/php/includes/recaptcha_service.php';

function jsonOut(array $data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if (!$pdo) {
    jsonOut(['success' => false, 'error' => 'Database connection unavailable'], 503);
}

$method = $_SERVER['REQUEST_METHOD'];
$rawInput = file_get_contents('php://input');
$payload = json_decode($rawInput, true) ?: $_POST;

try {
    // ── GET: Check 2FA status or reCAPTCHA config ────────────────────────────
    if ($method === 'GET') {
        $action = trim($_GET['action'] ?? '');
        if ($action === 'recaptcha_config' || isset($_GET['recaptcha'])) {
            $services = file_exists($rootDir . '/config/services.php') ? require($rootDir . '/config/services.php') : [];
            $rc = $services['recaptcha'] ?? [];
            jsonOut([
                'success'    => true,
                'site_key'   => $rc['site_key'] ?? '',
                'has_secret' => !empty($rc['secret_key']),
                'threshold'  => (int) ($rc['threshold'] ?? 3),
                'enabled'    => (bool) ($rc['enabled'] ?? true)
            ]);
        }

        $userId = trim($_GET['id'] ?? $_GET['uid'] ?? '');
        if (empty($userId)) {
            jsonOut(['success' => false, 'error' => 'User ID is required'], 400);
        }

        $stmt = $pdo->prepare("SELECT id, full_name, email, role, totp_enabled, terms_accepted, terms_accepted_at FROM users WHERE id = ? AND is_deleted = 0 LIMIT 1");
        $stmt->execute([$userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            jsonOut(['success' => false, 'error' => 'User not found'], 404);
        }

        jsonOut([
            'success'         => true,
            'id'              => $user['id'],
            'fullName'        => $user['full_name'],
            'role'            => $user['role'],
            'totpEnabled'     => (bool) $user['totp_enabled'],
            'termsAccepted'   => (bool) ($user['terms_accepted'] ?? 0),
            'termsAcceptedAt' => $user['terms_accepted_at'] ?? null
        ]);
    }

    if ($method !== 'POST') {
        jsonOut(['success' => false, 'error' => 'Method not allowed'], 405);
    }

    $action = trim($payload['action'] ?? '');

    // ── POST: SAVE RECAPTCHA CONFIG ──────────────────────────────────────────
    if ($action === 'save_recaptcha_config') {
        $siteKey = trim($payload['site_key'] ?? '');
        $secretKey = trim($payload['secret_key'] ?? '');
        $threshold = max(1, min(50, (int) ($payload['threshold'] ?? 3)));
        $enabled = isset($payload['enabled']) ? (bool) $payload['enabled'] : true;

        $services = file_exists($rootDir . '/config/services.php') ? require($rootDir . '/config/services.php') : [];
        if (!isset($services['recaptcha'])) {
            $services['recaptcha'] = [];
        }

        if ($siteKey !== '') {
            $services['recaptcha']['site_key'] = $siteKey;
        }
        if ($secretKey !== '') {
            $services['recaptcha']['secret_key'] = $secretKey;
        }
        $services['recaptcha']['threshold'] = $threshold;
        $services['recaptcha']['enabled'] = $enabled;

        $configExport = "<?php\n/**\n * SIGMA ELMS - API Credentials & Services Configuration\n */\n\nreturn " . var_export($services, true) . ";\n";
        file_put_contents($rootDir . '/config/services.php', $configExport);

        jsonOut([
            'success'    => true,
            'message'    => 'Google reCAPTCHA configuration saved successfully',
            'site_key'   => $services['recaptcha']['site_key'] ?? '',
            'has_secret' => !empty($services['recaptcha']['secret_key']),
            'threshold'  => $threshold,
            'enabled'    => $enabled
        ]);
    }

    // ── POST: VERIFY RECAPTCHA ───────────────────────────────────────────────
    if ($action === 'verify_recaptcha') {
        $token = trim($payload['token'] ?? '');
        $remoteIp = $_SERVER['REMOTE_ADDR'] ?? null;
        $result = RecaptchaService::verify($token, $remoteIp);
        jsonOut($result);
    }

    // ── POST: SETUP 2FA (Generate Secret + QR Code) ──────────────────────────
    if ($action === 'setup_2fa') {
        $userId = trim($payload['id'] ?? $payload['uid'] ?? '');
        if (empty($userId)) {
            jsonOut(['success' => false, 'error' => 'User ID is required'], 400);
        }

        $stmt = $pdo->prepare("SELECT id, full_name, email, role, totp_secret, totp_enabled FROM users WHERE id = ? AND is_deleted = 0 LIMIT 1");
        $stmt->execute([$userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            jsonOut(['success' => false, 'error' => 'User not found in system'], 404);
        }

        // Generate or reuse pending secret
        $secret = TotpService::generateSecret(16);
        $accountLabel = trim((string)($user['id'] ?? $userId));

        // Save secret tentatively in database
        $upd = $pdo->prepare("UPDATE users SET totp_secret = ? WHERE id = ?");
        $upd->execute([$secret, $userId]);

        $qrData = TotpService::getQrCodeData($secret, $accountLabel, 'SIGMA');

        jsonOut([
            'success'       => true,
            'message'       => 'Google Authenticator setup initiated',
            'userId'        => $user['id'],
            'secret'        => $secret,
            'otpauth_url'   => $qrData['otpauth_url'],
            'qr_image_url'  => $qrData['qr_image_url'],
            'label'         => $accountLabel
        ]);
    }

    // ── POST: VERIFY & ENABLE 2FA ────────────────────────────────────────────
    if ($action === 'verify_and_enable_2fa') {
        $userId = trim($payload['id'] ?? $payload['uid'] ?? '');
        $code = trim($payload['code'] ?? '');

        if (empty($userId) || empty($code)) {
            jsonOut(['success' => false, 'error' => 'User ID and 6-digit code are required'], 400);
        }

        $stmt = $pdo->prepare("SELECT id, totp_secret FROM users WHERE id = ? AND is_deleted = 0 LIMIT 1");
        $stmt->execute([$userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user || empty($user['totp_secret'])) {
            jsonOut(['success' => false, 'error' => 'No 2FA setup found. Please scan the QR code first.'], 400);
        }

        $isValid = TotpService::verifyCode($user['totp_secret'], $code);
        if (!$isValid) {
            jsonOut(['success' => false, 'error' => 'Invalid or expired 6-digit authenticator code. Check your device time.'], 401);
        }

        // Enable 2FA
        $upd = $pdo->prepare("UPDATE users SET totp_enabled = 1 WHERE id = ?");
        $upd->execute([$userId]);

        jsonOut([
            'success' => true,
            'message' => 'Google Authenticator 2FA activated successfully!'
        ]);
    }

    // ── POST: VERIFY 2FA CODE ON LOGIN ───────────────────────────────────────
    if ($action === 'verify_login_2fa') {
        $userId = trim($payload['id'] ?? $payload['uid'] ?? '');
        $code = trim($payload['code'] ?? '');

        if (empty($userId) || empty($code)) {
            jsonOut(['success' => false, 'error' => 'User ID and 6-digit code are required'], 400);
        }

        $stmt = $pdo->prepare("SELECT id, full_name, email, role, totp_secret, totp_enabled FROM users WHERE id = ? AND is_deleted = 0 LIMIT 1");
        $stmt->execute([$userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user || empty($user['totp_secret']) || empty($user['totp_enabled'])) {
            jsonOut(['success' => false, 'error' => '2FA is not enabled for this user account.'], 400);
        }

        $isValid = TotpService::verifyCode($user['totp_secret'], $code);
        if (!$isValid) {
            jsonOut(['success' => false, 'error' => 'Invalid 6-digit code. Please check Google Authenticator on your phone.'], 401);
        }

        jsonOut([
            'success' => true,
            'message' => 'Two-factor authentication verified successfully',
            'user'    => [
                'id'       => $user['id'],
                'fullName' => $user['full_name'],
                'email'    => $user['email'],
                'role'     => $user['role']
            ]
        ]);
    }

    // ── POST: ACCEPT TERMS OF USE & PRIVACY AGREEMENT ───────────────────────
    if ($action === 'accept_terms') {
        $userId = trim($payload['id'] ?? $payload['uid'] ?? '');
        if (empty($userId)) {
            jsonOut(['success' => false, 'error' => 'User ID is required'], 400);
        }

        $now = date('Y-m-d H:i:s');
        $upd = $pdo->prepare("UPDATE users SET terms_accepted = 1, terms_accepted_at = ? WHERE id = ?");
        $upd->execute([$now, $userId]);

        jsonOut([
            'success'         => true,
            'message'         => 'Terms of Use & Privacy Agreement accepted successfully.',
            'termsAccepted'   => true,
            'termsAcceptedAt' => $now
        ]);
    }

    // ── POST: DISABLE 2FA ────────────────────────────────────────────────────
    if ($action === 'disable_2fa') {
        $userId = trim($payload['id'] ?? $payload['uid'] ?? '');
        if (empty($userId)) {
            jsonOut(['success' => false, 'error' => 'User ID is required'], 400);
        }

        $upd = $pdo->prepare("UPDATE users SET totp_secret = NULL, totp_enabled = 0 WHERE id = ?");
        $upd->execute([$userId]);

        jsonOut([
            'success' => true,
            'message' => 'Google Authenticator 2FA has been disabled.'
        ]);
    }

    jsonOut(['success' => false, 'error' => 'Invalid action specified'], 400);

} catch (Exception $e) {
    jsonOut(['success' => false, 'error' => $e->getMessage()], 500);
}
