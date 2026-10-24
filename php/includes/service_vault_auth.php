<?php
require_once __DIR__ . '/service_secrets.php';

function serviceRequestIsSecure(): bool {
    return in_array(strtolower($_SERVER['HTTPS'] ?? ''), ['on', '1'], true) || (string)($_SERVER['SERVER_PORT'] ?? '') === '443';
}

function serviceVaultAdmin(array $user, string $scope = 'integrations'): bool {
    $role = preg_replace('/[\s_-]+/', '', strtolower($user['role'] ?? ''));
    if (strtolower($user['status'] ?? '') !== 'active' || !empty($user['is_deleted'])) return false;
    if ($role === 'masteradmin') return true;
    if($scope==='maintenance'){require_once __DIR__.'/maintenance_policy.php';return sigmaMaintenanceCanManage($user);}
    if (in_array($scope,['backups','recovery'],true)) return false;
    $permissions = json_decode($user['permissions'] ?? '{}', true) ?: [];
    $key = $scope === 'recovery' ? 'settingsRecovery' : 'settingsApi';
    return $role === 'admin' && ($permissions['settingsMain'] ?? true) === true && ($permissions[$key] ?? false) === true;
}

function recordServiceVaultVerification(PDO $db, string $id, string $outcome, string $panel = ''): void {
    $actions = ['success'=>'Administrator settings verification succeeded', 'failed'=>'Administrator settings verification failed', 'canceled'=>'Administrator settings verification canceled'];
    if (!isset($actions[$outcome])) throw new InvalidArgumentException('Invalid verification outcome.');
    require_once __DIR__.'/activity_audit.php';
    $panels = ['ai'=>'SIGMA AI Integration Engines','drive'=>'Google Drive Cloud Storage','recaptcha'=>'Google reCAPTCHA Protection','recovery'=>'Record Recovery','backups'=>'Database Backups','maintenance'=>'System Maintenance'];
    $details = sigmaActivityContext($actions[$outcome])['details'];
    if ($panel === 'recovery') $details = ['success'=>'Administrator identity was verified for Record Recovery.', 'failed'=>'The administrator verification attempt for Record Recovery failed.', 'canceled'=>'Administrator verification for Record Recovery was canceled.'][$outcome];
    if (isset($panels[$panel])) $details = ($panel === 'recovery' ? 'Protected page: ' : 'API panel: ').$panels[$panel]."\n".$details;
    sigmaRecordActivity($db,$id,$actions[$outcome],'Security',$details);
}

function serviceRecoveryRefreshCookie(string $tab): string {
    if(!preg_match('/^[a-f0-9]{32}$/D',$tab))throw new InvalidArgumentException('Invalid recovery visit.');
    return 'sigma_recovery_refresh_'.$tab;
}
function serviceRecoveryRefreshOptions(int $expires): array {
    return ['expires'=>$expires,'path'=>'/php/api/auth.php','secure'=>serviceRequestIsSecure(),'httponly'=>true,'samesite'=>'Strict'];
}
function serviceRecoveryRefreshPayload(string $cookie,string $tab,string $sessionHash,string $owner,string $key): ?array {
    try{
        $payload=decryptServiceSettings(base64_decode($cookie,true)?:'',hash_hkdf('sha256',$key,32,'sigma-recovery-refresh-v1'));
        if(($payload['tab']??'')!==$tab||($payload['owner']??'')!==$owner||!hash_equals($payload['session']??'',$sessionHash)||(int)($payload['expires']??0)<=time()||!preg_match('/^[a-f0-9]{64}$/D',$payload['token']??''))return null;
        return $payload;
    }catch(Throwable $error){return null;}
}
function resumeServiceRecoveryVerification(string $tab): ?array {
    $name=serviceRecoveryRefreshCookie($tab);$cookie=$_COOKIE[$name]??'';if(!$cookie)return null;
    require_once __DIR__.'/application_auth.php';$db=serviceSettingsPdo();$actor=sigmaApplicationUser($db);
    if(!$actor||!serviceVaultAdmin($actor,'backups'))return null;
    $payload=serviceRecoveryRefreshPayload($cookie,$tab,hash('sha256',sigmaApplicationToken()),(string)$actor['id'],serviceMasterKey());if(!$payload)return null;
    $query=$db->prepare('SELECT expires_at FROM service_vault_sessions WHERE token_hash=? AND user_id=? AND expires_at>UTC_TIMESTAMP()');$query->execute([hash('sha256',$payload['token']),$actor['id']]);$expiry=$query->fetchColumn();if(!$expiry)return null;
    return ['token'=>$payload['token'],'expires_in'=>max(0,min($payload['expires'],strtotime($expiry.' UTC'))-time())];
}

function authorizeServiceVault(array $input): string {
    if (!in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true) && !serviceRequestIsSecure()) throw new RuntimeException('HTTPS is required for administrator credentials.');
    $db = serviceSettingsPdo();
    require_once __DIR__ . '/application_auth.php';
    $actor = sigmaApplicationUser($db);
    $scope = in_array($input['panel']??'',['recovery','backups','maintenance'],true) ? $input['panel'] : 'integrations';
    if (!$actor || !serviceVaultAdmin($actor, $scope)) throw new RuntimeException('Sign in as an authorized administrator before verifying your password.');
    $client = hash('sha256', $_SERVER['REMOTE_ADDR'] ?? 'unknown');
    $check = $db->prepare('SELECT attempts, blocked_until FROM service_vault_login_attempts WHERE client_hash = ?');
    $check->execute([$client]);
    $attempt = $check->fetch();
    if ($attempt && !empty($attempt['blocked_until']) && strtotime($attempt['blocked_until'] . ' UTC') > time()) throw new RuntimeException('Too many attempts. Wait five minutes before trying again.');
    $id = (string)$actor['id'];
    if (isset($input['login']) && (!is_string($input['login']) || !hash_equals($id, trim($input['login'])))) throw new RuntimeException('Verify the administrator currently signed in.');
    $password = $input['password'] ?? '';
    if (!is_string($password) || strlen($password) > 256 || strlen($id) > 150) throw new InvalidArgumentException('Invalid credentials.');
    $stmt = $db->prepare('SELECT id, role, status, is_deleted, password, permissions FROM users WHERE id = ? AND is_deleted = 0 LIMIT 1');
    $stmt->execute([$id]);
    $user = $stmt->fetch();
    $valid = $password !== '' && $user && (password_verify($password, $user['password']) || (password_get_info($user['password'])['algo'] === null && hash_equals($user['password'], $password))) && serviceVaultAdmin($user, $scope);
    if (!$valid) {
        $count = $attempt && !empty($attempt['blocked_until']) && strtotime($attempt['blocked_until'] . ' UTC') <= time() ? 1 : (int)($attempt['attempts'] ?? 0) + 1;
        $save = $db->prepare('INSERT INTO service_vault_login_attempts(client_hash, attempts, blocked_until) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE attempts=VALUES(attempts), blocked_until=VALUES(blocked_until), updated_at=CURRENT_TIMESTAMP');
        $save->execute([$client, $count, $count >= 5 ? gmdate('Y-m-d H:i:s', time() + 300) : null]);
        recordServiceVaultVerification($db, $id, 'failed', (string)($input['panel'] ?? ''));
        throw new RuntimeException('The administrator password is incorrect.');
    }
    $db->prepare('DELETE FROM service_vault_login_attempts WHERE client_hash = ?')->execute([$client]);
    $token = bin2hex(random_bytes(32));
    $db->prepare('DELETE FROM service_vault_sessions WHERE expires_at < UTC_TIMESTAMP()')->execute();
    $db->prepare('INSERT INTO service_vault_sessions (token_hash, user_id, expires_at) VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 15 MINUTE))')->execute([hash('sha256', $token), $user['id']]);
    recordServiceVaultVerification($db, $id, 'success', (string)($input['panel'] ?? ''));
    if(in_array($scope,['recovery','backups'],true)&&isset($input['recoveryTab'])){
        $tab=(string)$input['recoveryTab'];$name=serviceRecoveryRefreshCookie($tab);
        $payload=['tab'=>$tab,'owner'=>$id,'session'=>hash('sha256',sigmaApplicationToken()),'token'=>$token,'expires'=>time()+900];
        $cookie=base64_encode(encryptServiceSettings($payload,hash_hkdf('sha256',serviceMasterKey(),32,'sigma-recovery-refresh-v1')));
        setcookie($name,$cookie,serviceRecoveryRefreshOptions($payload['expires']));
    }
    return $token;
}

function requireServiceVaultAccess(string $scope = 'integrations'): void {
    // Local credential management now uses the same verified database identity.
    $host = strtolower(parse_url('http://' . ($_SERVER['HTTP_HOST'] ?? ''), PHP_URL_HOST) ?: '');
    if ($scope!=='maintenance' && in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true)
        && in_array($host, ['localhost', '127.0.0.1', '[::1]'], true)) {
        require_once __DIR__ . '/application_auth.php';
        $actor = sigmaRequireApplicationActor(serviceSettingsPdo(), ['admin', 'masteradmin', 'administrator']);
        if (!serviceVaultAdmin($actor, $scope)) {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => $scope === 'recovery' ? 'This administrator cannot access Record Recovery.' : 'This administrator cannot manage service credentials.']);
            exit;
        }
        return;
    }
    if (!in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true) && !serviceRequestIsSecure()) { http_response_code(403); echo json_encode(['success' => false, 'error' => 'HTTPS is required for credential management.']); exit; }
    $headers = function_exists('getallheaders') ? array_change_key_case(getallheaders(), CASE_LOWER) : [];
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? $headers['authorization'] ?? '';
    $token = preg_match('/^Bearer ([a-f0-9]{64})$/', $header, $match) ? $match[1] : '';
    if ($token) {
        $stmt = serviceSettingsPdo()->prepare('SELECT u.role, u.status, u.is_deleted, u.permissions FROM service_vault_sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>UTC_TIMESTAMP()');
        $stmt->execute([hash('sha256', $token)]);
        $user = $stmt->fetch();
        if ($user && serviceVaultAdmin($user, $scope)) return;
    }
    http_response_code(403);
    echo json_encode(['success' => false, 'code' => 'VAULT_AUTH_REQUIRED', 'error' => $scope === 'recovery' ? 'Verify administrator credentials to access Record Recovery.' : 'Verify administrator credentials to manage service keys.']);
    exit;
}

function restrictServiceOrigin(): void {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $originHost = parse_url($origin, PHP_URL_HOST);
    $local = in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true);
    $serverHost = explode(':', $_SERVER['HTTP_HOST'] ?? '')[0];
    if ($origin && ($local ? !in_array($originHost, ['localhost', '127.0.0.1'], true) : $originHost !== $serverHost)) { http_response_code(403); exit; }
    if ($origin) { header('Access-Control-Allow-Origin: ' . $origin); header('Access-Control-Allow-Credentials: true'); header('Vary: Origin'); }
}

function protectServiceAdministratorAccounts(array $input): void {
    $records = isset($input['users']) && is_array($input['users']) ? $input['users'] : [$input['user'] ?? $input];
    foreach ($records as $record) {
        if (!is_array($record)) continue;
        $role = preg_replace('/[\s_-]+/', '', strtolower($record['role'] ?? $record['type'] ?? ''));
        if (in_array($role, ['admin', 'masteradmin'], true)) { requireServiceVaultAccess(); return; }
        $id = trim($record['id'] ?? $record['uid'] ?? '');
        $email = trim($record['email'] ?? '');
        if ($id === '' && $email === '') continue;
        $stmt = serviceSettingsPdo()->prepare('SELECT role FROM users WHERE id=? OR email=?');
        $stmt->execute([$id, $email]);
        foreach ($stmt->fetchAll(PDO::FETCH_COLUMN) as $stored) {
            $storedRole = preg_replace('/[\s_-]+/', '', strtolower($stored));
            if (in_array($storedRole, ['admin', 'masteradmin'], true)) { requireServiceVaultAccess(); return; }
        }
    }
}
