<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
require_once __DIR__ . '/../includes/service_vault_auth.php';
require_once __DIR__ . '/../includes/application_auth.php';
require_once __DIR__ . '/../includes/authentication_audit.php';
require_once __DIR__ . '/../includes/login_security.php';
restrictServiceOrigin();
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') exit;
require_once dirname(__DIR__, 2) . '/config/database.php';
function sessionReply(array $result, int $status = 200): void { http_response_code($status); echo json_encode($result); exit; }
try {
    if (!$pdo) sessionReply(['success' => false, 'error' => 'Sign-in is temporarily unavailable. Please try again.'], 503);
    $local = in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true);
    if (!$local && !serviceRequestIsSecure()) sessionReply(['success' => false, 'error' => 'HTTPS is required.'], 403);
    $method = $_SERVER['REQUEST_METHOD'] ?? '';
    if ($method === 'GET' && ($_GET['action']??'')==='login_policy') sessionReply(['success'=>true,'passwordAttempts'=>sigmaPasswordLockoutLimit(loadServiceSettings())]);
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
    if (($input['action']??'')==='save_login_policy') {
        $actor=sigmaRequireApplicationActor($pdo,['admin','masteradmin','administrator']);
        require_once __DIR__.'/../includes/role_permissions.php';
        if(!sigmaActorPermission($actor,'settingsSecurity'))sessionReply(['success'=>false,'error'=>'Permission required.'],403);
        $limit=filter_var($input['passwordAttempts']??null,FILTER_VALIDATE_INT);
        if($limit===false||$limit<1||$limit>50)sessionReply(['success'=>false,'error'=>'Enter a limit from 1 to 50.'],422);
        $pdo->beginTransaction();
        try {
            $pdo->query('SELECT id FROM system_service_settings WHERE id=1 FOR UPDATE');
            $settings=loadServiceSettings();$settings['login_security']['password_attempts']=$limit;saveServiceSettings($settings);
            $pdo->commit();
        } catch(Throwable $error){if($pdo->inTransaction())$pdo->rollBack();throw $error;}
        sessionReply(['success'=>true,'passwordAttempts'=>$limit]);
    }
    if (($input['action'] ?? '') !== 'credentials') sessionReply(['success' => false, 'error' => 'Unknown action.'], 400);
    $login = trim((string)($input['login'] ?? ''));
    $password = (string)($input['password'] ?? '');
    if ($login === '' || strlen($login) > 150) sessionReply(['success'=>false,'code'=>'invalid_login_id','error'=>'Enter valid ID or email.'],400);
    $result=sigmaCheckLoginCredentials($pdo,$login,$password,sigmaPasswordLockoutLimit(loadServiceSettings()));
    if(!$result['success'])sessionReply($result,$result['code']==='password_required'?400:401);
    $user=$result['user'];
    if(sigmaMaintenanceRestricted($user))sessionReply(['success'=>false,'code'=>'system_maintenance','error'=>sigmaMaintenanceState(sigmaMaintenanceConfig())['message']],423);
    $role = preg_replace('/[\s_-]+/', '', strtolower($user['role'] ?? ''));
    $mobileAgent = preg_match('/Android|iPhone|iPad|iPod|Mobile|Tablet|IEMobile|Opera Mini/i', $_SERVER['HTTP_USER_AGENT'] ?? '');
    if (in_array($role, ['admin','administrator','masteradmin'], true) && (($input['adminDeviceRestricted'] ?? false) === true || $mobileAgent)) {
        sigmaRecordAuthentication($pdo, $user['id'], 'Admin sign-in restricted on unsupported device', 'blocked', 'Credentials were valid. Sign-in stopped before authenticator verification.');
        sessionReply(['success'=>false,'code'=>'admin_device_restricted','error'=>'Admin access is unavailable on this device. Please use a supported device to continue.'],403);
    }
    $token = bin2hex(random_bytes(32));
    $pdo->prepare('DELETE FROM application_login_challenges WHERE expires_at<UTC_TIMESTAMP() OR user_id=?')->execute([$user['id']]);
    $pdo->prepare('INSERT INTO application_login_challenges(token_hash,user_id,expires_at) VALUES(?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 5 MINUTE))')->execute([hash('sha256',$token),$user['id']]);
    sessionReply(['success'=>true,'user'=>sigmaPublicUser($user),'challenge'=>$token]);
} catch (JsonException $error) { sessionReply(['success'=>false,'error'=>'Invalid JSON.'],400); }
catch (Throwable $error) { error_log('SIGMA session error: '.$error->getMessage()); sessionReply(['success'=>false,'error'=>'Sign-in could not be completed. Please try again.'],503); }
