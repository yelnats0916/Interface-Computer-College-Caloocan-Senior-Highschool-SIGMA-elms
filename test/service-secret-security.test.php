<?php
require_once __DIR__ . '/../php/includes/service_secrets.php';
require_once __DIR__ . '/../php/includes/service_vault_auth.php';
require_once __DIR__ . '/../php/includes/service_key_validation.php';
function checkSecret($condition, $message) { if (!$condition) throw new RuntimeException($message); }
$key = random_bytes(32);
$settings = ['gemini' => ['api_key' => 'test-only-secret-value'], 'recaptcha' => ['secret_key' => 'test-recaptcha-secret-value'], 'google_drive' => ['service_account' => ['private_key' => 'test-private-key-value']]];
$encrypted = encryptServiceSettings($settings, $key);
checkSecret(decryptServiceSettings($encrypted, $key) === $settings, 'Encrypted round trip failed');
checkSecret(!str_contains($encrypted, 'test-only-secret-value') && !str_contains($encrypted, 'test-private-key-value'), 'Secrets must not be stored as plaintext');
try { decryptServiceSettings($encrypted, random_bytes(32)); throw new LogicException('Wrong master key accepted'); } catch (RuntimeException $expected) {}
$tampered = json_decode($encrypted, true); $tampered['tag'] = base64_encode(random_bytes(16));
try { decryptServiceSettings(json_encode($tampered), $key); throw new LogicException('Tampered ciphertext accepted'); } catch (RuntimeException $expected) {}
checkSecret(serviceVaultAdmin(['role' => 'Master Admin', 'status' => 'Active']), 'Master admin not authorized');
checkSecret(!serviceVaultAdmin(['role' => 'Teacher', 'status' => 'Active']), 'Teacher authorized to manage keys');
checkSecret(!serviceVaultAdmin(['role' => 'Master Admin', 'status' => 'Inactive']), 'Inactive admin authorized');
checkSecret(!serviceVaultAdmin(['role' => 'Admin', 'status' => 'Active', 'permissions' => '{}']), 'Admin needs explicit settings permissions');
checkSecret(serviceVaultAdmin(['role' => 'Admin', 'status' => 'Active', 'permissions' => '{"settingsMain":true,"settingsApi":true}']), 'Authorized delegated admin denied');
foreach (["test-only secret-value", "test-only-secret\nvalue", str_repeat('x',2049)] as $invalid) {
    try { validateOpaqueServiceKey($invalid); throw new LogicException('Invalid service key accepted'); } catch (InvalidArgumentException $expected) {}
}
checkSecret(validateOpaqueServiceKey('test-only-secret-value') === 'test-only-secret-value', 'Valid opaque key rejected');
$config = file_get_contents(__DIR__ . '/../config/services.php');
checkSecret(!str_contains($config, 'api_key') && str_contains($config, 'loadServiceSettings'), 'Website configuration must contain no API key values');
$legacy = json_decode(file_get_contents(__DIR__ . '/../config/google_service_account.json'), true);
checkSecret(empty($legacy['private_key']), 'Legacy service-account file still contains a private key');
$db = serviceSettingsPdo();
$db->beginTransaction();
try {
    $original = loadServiceSettings();
    $temporary = $original;
    $temporary['security_test_marker'] = 'temporary transaction only';
    saveServiceSettings($temporary);
    checkSecret(loadServiceSettings() === $temporary, 'Database-backed settings updates failed');
    $_SERVER['REMOTE_ADDR'] = '127.0.0.1';
    $db->prepare('DELETE FROM service_vault_login_attempts WHERE client_hash=?')->execute([hash('sha256', '127.0.0.1')]);
    $id = 'vault-test-' . bin2hex(random_bytes(4));
    $db->prepare('INSERT INTO users(id,first_name,last_name,email,password,role,status) VALUES(?,?,?,?,?,?,?)')->execute([$id,'Test','Admin',$id.'@example.invalid',password_hash('test-only-password', PASSWORD_DEFAULT),'Master Admin','Active']);
    $token = authorizeServiceVault(['login' => $id, 'password' => 'test-only-password']);
    checkSecret(strlen($token) === 64, 'Expected short-lived opaque token');
    $stmt = $db->prepare('SELECT token_hash FROM service_vault_sessions WHERE user_id=?'); $stmt->execute([$id]);
    checkSecret($stmt->fetchColumn() === hash('sha256', $token), 'Only the token hash should be stored');
    try { authorizeServiceVault(['login' => $id, 'password' => 'incorrect']); throw new LogicException('Incorrect password accepted'); } catch (RuntimeException $expected) {}
} finally { $db->rollBack(); }
checkSecret(loadServiceSettings() === $original, 'Test transaction must preserve configured keys');
echo "PASS: encrypted DB settings, tamper detection, preserved secrets, admin permission/status checks, password reauthentication, hashed tokens, key limits, no plaintext website files.\n";
