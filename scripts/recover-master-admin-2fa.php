<?php
/** Server-operator recovery for an existing master admin. Never exposed as a web API. */
if (PHP_SAPI !== 'cli') { http_response_code(403); exit; }
require dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/php/includes/application_auth.php';
$options = getopt('', ['id:', 'confirm-reset']);
$id = trim((string)($options['id'] ?? ''));
if ($id === '' || strlen($id) > 50 || !array_key_exists('confirm-reset', $options)) {
    fwrite(STDERR, "Usage: php scripts/recover-master-admin-2fa.php --id=ACCOUNT_ID --confirm-reset\nRun only as the trusted server operator after verifying the account owner's recovery request.\n");
    exit(1);
}
if (!$pdo) { fwrite(STDERR, "Database unavailable. Nothing changed.\n"); exit(1); }
try {
    $pdo->beginTransaction();
    $stmt = $pdo->prepare('SELECT id,role,status,is_deleted,password,terms_accepted FROM users WHERE id=? FOR UPDATE');
    $stmt->execute([$id]);
    $user = $stmt->fetch();
    if (!$user || preg_replace('/[\s_-]+/', '', strtolower($user['role'])) !== 'masteradmin'
        || strtolower($user['status']) !== 'active' || !empty($user['is_deleted'])) {
        throw new RuntimeException('Recovery requires an existing active master admin account.');
    }
    $pdo->prepare('UPDATE users SET totp_secret=NULL,totp_enabled=0 WHERE id=?')->execute([$id]);
    sigmaRevokeAccountSessions($pdo, $id);
    foreach (['service_vault_sessions', 'application_presence'] as $table) {
        try { $pdo->prepare("DELETE FROM $table WHERE user_id=?")->execute([$id]); }
        catch (PDOException $error) { if ($error->getCode() !== '42S02') throw $error; }
    }
    $pdo->prepare('DELETE FROM grade_sync_attempts WHERE client_hash=?')->execute([hash('sha256', 'two-factor:' . $id)]);
    $stmt = $pdo->prepare('SELECT totp_enabled,totp_secret,password,terms_accepted FROM users WHERE id=?');
    $stmt->execute([$id]);
    $after = $stmt->fetch();
    if (!$after || !empty($after['totp_enabled']) || $after['totp_secret'] !== null
        || !hash_equals($user['password'], $after['password']) || $user['terms_accepted'] != $after['terms_accepted']) {
        throw new RuntimeException('Recovery verification failed.');
    }
    $pdo->commit();
    echo "Master admin authenticator enrollment reset. Existing sessions revoked. Password and terms preserved. Sign in again and enroll a new authenticator.\n";
} catch (Throwable $error) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    fwrite(STDERR, "Recovery stopped: " . $error->getMessage() . "\n");
    exit(1);
}
