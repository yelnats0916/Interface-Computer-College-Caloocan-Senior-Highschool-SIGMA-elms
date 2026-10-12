<?php
function serviceSettingsPdo(): PDO {
    global $pdo;
    if (!($pdo instanceof PDO)) require dirname(__DIR__, 2) . '/config/database.php';
    if (!($pdo instanceof PDO)) throw new RuntimeException('Secure settings database is unavailable.');
    return $pdo;
}

function serviceMasterKeyPath(): string {
    $configured = getenv('SIGMA_SECRETS_MASTER_KEY_FILE');
    if ($configured) return $configured;
    try {
        $saved = serviceSettingsPdo()->query('SELECT key_location FROM system_service_settings WHERE id=1')->fetchColumn();
        if ($saved) return $saved;
    } catch (PDOException $error) { /* The column is added by the one-time migration. */ }
    $base = getenv('LOCALAPPDATA') ?: (getenv('USERPROFILE') ? getenv('USERPROFILE') . '/AppData/Local' : '');
    if (!$base) throw new RuntimeException('Configure a server encryption key.');
    return $base . '/SIGMA-ELMS/Security/' . hash('sha256', dirname(__DIR__, 2)) . '.key';
}

function serviceMasterKey(): string {
    $environment = getenv('SIGMA_SECRETS_MASTER_KEY');
    if ($environment) {
        $key = base64_decode($environment, true);
        if ($key === false || strlen($key) !== 32) throw new RuntimeException('Invalid server encryption-key configuration.');
        return $key;
    }
    if (PHP_OS_FAMILY !== 'Windows') throw new RuntimeException('Configure SIGMA_SECRETS_MASTER_KEY on the server.');
    $path = serviceMasterKeyPath();
    $directory = dirname($path);
    if (!is_dir($directory) && !mkdir($directory, 0700, true) && !is_dir($directory)) throw new RuntimeException('Cannot initialize encryption-key storage.');
    if (!is_file($path)) {
        if (serviceSettingsPdo()->query('SELECT COUNT(*) FROM system_service_settings')->fetchColumn()) throw new RuntimeException('Restore the server encryption key before using existing credentials.');
        $handle = @fopen($path, 'x');
        if ($handle) { fwrite($handle, base64_encode(random_bytes(32))); fclose($handle); @chmod($path, 0600); }
    }
    $key = base64_decode(trim((string)@file_get_contents($path)), true);
    if ($key === false || strlen($key) !== 32) throw new RuntimeException('Server encryption key is unavailable.');
    return $key;
}

function encryptServiceSettings(array $settings, string $key): string {
    $nonce = random_bytes(12);
    $ciphertext = openssl_encrypt(json_encode($settings, JSON_THROW_ON_ERROR), 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $nonce, $tag, 'sigma-services-v1');
    if ($ciphertext === false) throw new RuntimeException('Unable to encrypt service settings.');
    return json_encode(['v' => 1, 'nonce' => base64_encode($nonce), 'tag' => base64_encode($tag), 'data' => base64_encode($ciphertext)], JSON_THROW_ON_ERROR);
}

function decryptServiceSettings(string $envelope, string $key): array {
    $value = json_decode($envelope, true, 16, JSON_THROW_ON_ERROR);
    if (($value['v'] ?? null) !== 1) throw new RuntimeException('Invalid encrypted settings version.');
    $nonce = base64_decode($value['nonce'] ?? '', true);
    $tag = base64_decode($value['tag'] ?? '', true);
    $data = base64_decode($value['data'] ?? '', true);
    if ($nonce === false || strlen($nonce) !== 12 || $tag === false || strlen($tag) !== 16 || $data === false) throw new RuntimeException('Invalid encrypted settings.');
    $plain = openssl_decrypt($data, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $nonce, $tag, 'sigma-services-v1');
    if ($plain === false) throw new RuntimeException('Encrypted settings could not be verified.');
    $result = json_decode($plain, true, 64, JSON_THROW_ON_ERROR);
    if (!is_array($result)) throw new RuntimeException('Invalid service settings.');
    return $result;
}

function loadServiceSettings(): array {
    $statement = serviceSettingsPdo()->query('SELECT encrypted_settings FROM system_service_settings WHERE id = 1');
    $value = $statement->fetchColumn();
    if ($value === false) throw new RuntimeException('Secure service settings have not been initialized.');
    return decryptServiceSettings($value, serviceMasterKey());
}

function saveServiceSettings(array $settings): bool {
    $encrypted = encryptServiceSettings($settings, serviceMasterKey());
    $statement = serviceSettingsPdo()->prepare('INSERT INTO system_service_settings (id, encrypted_settings, key_location) VALUES (1, ?, ?) ON DUPLICATE KEY UPDATE encrypted_settings = VALUES(encrypted_settings), key_location = VALUES(key_location), updated_at = CURRENT_TIMESTAMP');
    return $statement->execute([$encrypted, getenv('SIGMA_SECRETS_MASTER_KEY') ? null : serviceMasterKeyPath()]);
}
