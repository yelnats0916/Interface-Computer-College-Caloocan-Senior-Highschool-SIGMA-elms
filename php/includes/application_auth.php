<?php
/** Shared server identity. Browser user objects and X-Sigma-Actor never authorize a request. */
function sigmaApplicationToken(): string {
    // Apache on XAMPP may expose Authorization only through getallheaders().
    $headers = function_exists('getallheaders') ? array_change_key_case(getallheaders(), CASE_LOWER) : [];
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? $headers['authorization'] ?? '';
    return preg_match('/^Bearer ([a-f0-9]{64})$/D', $header, $match) ? $match[1] : '';
}

function sigmaApplicationUser(PDO $db, bool $allowChallenge = false): ?array {
    $token = sigmaApplicationToken();
    if ($token === '') return null;
    $hash = hash('sha256', $token);
    $stmt = $db->prepare("SELECT u.* FROM grade_sync_tokens s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>UTC_TIMESTAMP() AND u.is_deleted=0 AND LOWER(u.status)='active' AND u.totp_enabled=1 AND u.terms_accepted=1");
    $stmt->execute([$hash]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$user) {
        // The existing credential vault also issues database-verified, short-lived admin tokens.
        try {
            $stmt = $db->prepare("SELECT u.* FROM service_vault_sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>UTC_TIMESTAMP() AND u.is_deleted=0 AND LOWER(u.status)='active' AND u.totp_enabled=1 AND u.terms_accepted=1");
            $stmt->execute([$hash]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (PDOException $error) {
            if ($error->getCode() !== '42S02') throw $error;
        }
    }
    if (!$user && $allowChallenge) {
        $stmt = $db->prepare("SELECT u.* FROM application_login_challenges s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>UTC_TIMESTAMP() AND u.is_deleted=0 AND LOWER(u.status)='active'");
        $stmt->execute([$hash]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
    }
    return $user ?: null;
}

function sigmaRequireOwnIdentity(PDO $db, string $targetId, bool $allowChallenge = false): array {
    header('Content-Type: application/json; charset=utf-8');
    $user = sigmaApplicationUser($db, $allowChallenge);
    if (!$user || $targetId === '' || !hash_equals((string)$user['id'], $targetId)) {
        http_response_code(401);
        echo json_encode(['success' => false, 'code' => 'authentication_required', 'error' => 'Sign in with this account before changing its security settings.']);
        exit;
    }
    return $user;
}

function sigmaRequireApplicationActor(?PDO $db, array $roles = []): array {
    header('Content-Type: application/json; charset=utf-8');
    if (!$db) {
        http_response_code(503);
        echo json_encode(['success' => false, 'error' => 'Database unavailable.']);
        exit;
    }
    $user = sigmaApplicationUser($db);
    if (!$user) {
        http_response_code(401);
        echo json_encode(['success' => false, 'code' => 'authentication_required', 'error' => 'Sign in to access school records.']);
        exit;
    }
    $role = preg_replace('/[\s_-]+/', '', strtolower((string)$user['role']));
    if ($roles && !in_array($role, $roles, true)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'This account cannot perform this action.']);
        exit;
    }
    return $user;
}

function sigmaPublicUser(array $user): array {
    return [
        'id' => (string)$user['id'], 'uid' => (string)$user['id'],
        'firstName' => $user['first_name'] ?? '', 'middleName' => $user['middle_name'] ?? '', 'lastName' => $user['last_name'] ?? '',
        'fullName' => $user['full_name'] ?: trim(($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? '')),
        'email' => $user['email'] ?? '', 'role' => $user['role'], 'type' => $user['role'], 'status' => $user['status'],
        'avatar' => $user['avatar'] ?? '', 'gender' => $user['gender'] ?? '', 'branch' => $user['branch'] ?? '',
        'department' => $user['department'] ?? '', 'gradeLevel' => $user['grade_level'] ?? '', 'gradeSection' => $user['grade_section'] ?? '',
        'strand' => $user['strand'] ?? '', 'permissions' => json_decode($user['permissions'] ?? '{}', true) ?: [],
        'totpEnabled' => !empty($user['totp_enabled']), 'termsAccepted' => !empty($user['terms_accepted'])
    ];
}

function sigmaTwoFactorRateLimit(PDO $db, string $userId, ?bool $verified = null): void {
    $key = hash('sha256', 'two-factor:' . $userId);
    if ($verified === true) {
        $db->prepare('DELETE FROM grade_sync_attempts WHERE client_hash=?')->execute([$key]);
        return;
    }
    $stmt = $db->prepare('SELECT blocked_until FROM grade_sync_attempts WHERE client_hash=?');
    $stmt->execute([$key]);
    $until = $stmt->fetchColumn();
    if ($until && strtotime($until . ' UTC') > time()) {
        http_response_code(429);
        echo json_encode(['success' => false, 'error' => 'Too many authenticator attempts. Try again in five minutes.']);
        exit;
    }
    if ($verified === false) {
        $db->prepare('INSERT INTO grade_sync_attempts(client_hash,attempts,blocked_until) VALUES(?,1,NULL) ON DUPLICATE KEY UPDATE attempts=IF(blocked_until IS NOT NULL AND blocked_until<=UTC_TIMESTAMP(),1,attempts+1),blocked_until=IF(attempts>=5,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 5 MINUTE),NULL)')->execute([$key]);
    }
}

function sigmaRevokeAccountSessions(PDO $db, string $userId): void {
    $db->prepare('DELETE FROM grade_sync_tokens WHERE user_id=?')->execute([$userId]);
    $db->prepare('DELETE FROM application_login_challenges WHERE user_id=?')->execute([$userId]);
}

// Caller must obtain the actor from a fully verified server session.
function sigmaCanResetAuthenticator(array $actor, array $target): bool {
    $actorId = (string)($actor['id'] ?? '');
    $targetId = (string)($target['id'] ?? '');
    if ($actorId === '' || $targetId === '') return false;
    if (hash_equals($actorId, $targetId)) return true;
    $actorRole = preg_replace('/[\s_-]+/', '', strtolower($actor['role'] ?? ''));
    $targetRole = preg_replace('/[\s_-]+/', '', strtolower($target['role'] ?? ''));
    return in_array($actorRole, ['admin', 'administrator', 'masteradmin'], true)
        && ($targetRole !== 'masteradmin' || $actorRole === 'masteradmin');
}
