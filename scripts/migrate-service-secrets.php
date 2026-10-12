<?php
if (PHP_SAPI !== 'cli') { http_response_code(403); exit; }
$root = dirname(__DIR__);
require_once $root . '/php/includes/service_secrets.php';
$existingFile = file_get_contents($root . '/config/services.php');
$db = serviceSettingsPdo();
$db->exec(file_get_contents($root . '/database/service_secrets.sql'));
if (!$db->query("SHOW COLUMNS FROM system_service_settings LIKE 'key_location'")->fetch()) $db->exec('ALTER TABLE system_service_settings ADD key_location VARCHAR(1024) NULL');
$settings = str_contains($existingFile, 'return loadServiceSettings();')
    ? ($db->query('SELECT COUNT(*) FROM system_service_settings')->fetchColumn() ? loadServiceSettings() : ['ai_vault' => [], 'gemini' => ['api_key' => ''], 'groq' => ['api_key' => ''], 'google_drive' => [], 'recaptcha' => []])
    : require $root . '/config/services.php';
$serviceAccountPath = $root . '/config/google_service_account.json';
if (is_file($serviceAccountPath)) {
    $account = json_decode(file_get_contents($serviceAccountPath), true);
    if (is_array($account) && !empty($account['private_key'])) $settings['google_drive']['service_account'] = $account;
}
saveServiceSettings($settings);
if (loadServiceSettings() !== $settings) throw new RuntimeException('Encrypted migration verification failed. Existing configuration was not replaced.');
$stub = "<?php\n// Service credentials are encrypted in the database, never embedded in website files.\nrequire_once __DIR__ . '/../php/includes/service_secrets.php';\nreturn loadServiceSettings();\n";
$handle = fopen($root . '/config/services.php', 'c+');
if (!$handle || !flock($handle, LOCK_EX)) throw new RuntimeException('Unable to lock legacy configuration.');
ftruncate($handle, 0);
rewind($handle);
if (fwrite($handle, $stub) !== strlen($stub)) throw new RuntimeException('Unable to remove plaintext configuration.');
fflush($handle);
flock($handle, LOCK_UN);
fclose($handle);
if (is_file($serviceAccountPath) && file_put_contents($serviceAccountPath, "{}\n", LOCK_EX) === false) throw new RuntimeException('Cannot clear the legacy service-account file.');
echo "Service settings migrated to encrypted database storage; website config now contains no credentials.\n";
