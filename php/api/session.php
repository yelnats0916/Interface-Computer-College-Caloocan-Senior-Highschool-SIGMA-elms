<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
require_once __DIR__ . '/../includes/service_vault_auth.php';
require_once __DIR__ . '/../includes/application_auth.php';
require_once __DIR__ . '/../includes/authentication_audit.php';
restrictServiceOrigin();
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') exit;
require_once dirname(__DIR__, 2) . '/config/database.php';
function sessionReply(array $result, int $status = 200): void { http_response_code($status); echo json_encode($result); exit; }
try {
    if (!$pdo) sessionReply(['success' => false, 'error' => 'Database sign-in is unavailable. No local account fallback is allowed.'], 503);
    $local = in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true);
    if (!$local && !serviceRequestIsSecure()) sessionReply(['success' => false, 'error' => 'HTTPS is required.'], 403);
    $method = $_SERVER['REQUEST_METHOD'] ?? '';
    if ($method === 'GET') {
        $user = sigmaApplicationUser($pdo);
        if (!$user) sessionReply(['success' => false, 'error' => 'Sign in again.', 'code' => 'authentication_required'], 401);
        sessionReply(['success' => true, 'user' => sigmaPublicUser($user)]);
    }
    if ($method !== 'POST') sessionReply(['success' => false, 'error' => 'Unsupported method.'], 405);
    $raw = file_get_contents('php://input', false, null, 0, 8193);
    if (strlen($raw) > 8192) sessionReply(['success' => false, 'error' => 'Request too large.'], 413);
    $input = json_decode($raw, true, 16, JSON_THROW_ON_ERROR);
    if (($input['action'] ?? '') === 'logout') {
        $actor = sigmaApplicationUser($pdo);
        $hash = hash('sha256', sigmaApplicationToken());
        $delete = $pdo->prepare('DELETE FROM grade_sync_tokens WHERE token_hash=?');
        $delete->execute([$hash]);
        if ($actor && $delete->rowCount() > 0) sigmaRecordAuthentication($pdo, $actor['id'], 'Logout successful');
        sessionReply(['success' => true]);
    }
    if (($input['action'] ?? '') !== 'credentials') sessionReply(['success' => false, 'error' => 'Unknown action.'], 400);
    $login = trim((string)($input['login'] ?? ''));
    $password = (string)($input['password'] ?? '');
    if ($login === '' || strlen($login) > 150 || $password === '' || strlen($password) > 256) sessionReply(['success' => false, 'error' => 'Enter your database account ID or email and password.'], 400);
    $client = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . ':session:' . strtolower($login));
    $stmt = $pdo->prepare('SELECT * FROM grade_sync_attempts WHERE client_hash=?'); $stmt->execute([$client]); $attempt = $stmt->fetch();
    if ($attempt && !empty($attempt['blocked_until']) && strtotime($attempt['blocked_until'].' UTC') > time()) sessionReply(['success'=>false,'error'=>'Too many attempts. Try again in five minutes.'],429);
    $stmt = $pdo->prepare('SELECT * FROM users WHERE (id=? OR LOWER(email)=LOWER(?)) AND is_deleted=0 LIMIT 1'); $stmt->execute([$login,$login]); $user=$stmt->fetch();
    $valid = $user && strtolower($user['status']) === 'active' && (password_verify($password,$user['password']) || (password_get_info($user['password'])['algo'] === null && hash_equals($user['password'],$password)));
    if (!$valid) {
        sigmaRecordAuthentication($pdo, $user['id'] ?? null, 'Failed login attempt', 'failed');
        $count = $attempt && empty($attempt['blocked_until']) ? (int)$attempt['attempts']+1 : 1;
        $pdo->prepare('INSERT INTO grade_sync_attempts VALUES(?,?,?) ON DUPLICATE KEY UPDATE attempts=VALUES(attempts),blocked_until=VALUES(blocked_until)')->execute([$client,$count,$count>=5?gmdate('Y-m-d H:i:s',time()+300):null]);
        sessionReply(['success'=>false,'error'=>'Invalid credentials or inactive database account.'],401);
    }
    $pdo->prepare('DELETE FROM grade_sync_attempts WHERE client_hash=?')->execute([$client]);
    $token = bin2hex(random_bytes(32));
    $pdo->prepare('DELETE FROM application_login_challenges WHERE expires_at<UTC_TIMESTAMP() OR user_id=?')->execute([$user['id']]);
    $pdo->prepare('INSERT INTO application_login_challenges(token_hash,user_id,expires_at) VALUES(?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 5 MINUTE))')->execute([hash('sha256',$token),$user['id']]);
    sessionReply(['success'=>true,'user'=>sigmaPublicUser($user),'challenge'=>$token]);
} catch (JsonException $error) { sessionReply(['success'=>false,'error'=>'Invalid JSON.'],400); }
catch (Throwable $error) { error_log('SIGMA session error: '.$error->getMessage()); sessionReply(['success'=>false,'error'=>'Database sign-in could not be completed.'],503); }
