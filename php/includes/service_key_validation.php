<?php
function validateOpaqueServiceKey(string $key, int $maximum = 2048): string {
    $key = trim($key);
    if (strlen($key) < 20 || strlen($key) > $maximum || !preg_match('/^[\x21-\x7e]+$/', $key)) throw new InvalidArgumentException('Paste a complete key without spaces, line breaks, or control characters.');
    return $key;
}

function validateGoogleServiceAccount(array $account): array {
    if (($account['type'] ?? '') !== 'service_account' || !filter_var($account['client_email'] ?? '', FILTER_VALIDATE_EMAIL)
        || !is_string($account['private_key'] ?? null) || strlen($account['private_key']) > 16384 || empty($account['project_id'])) throw new InvalidArgumentException('Invalid Google service account credentials.');
    $key = openssl_pkey_get_private($account['private_key']);
    $details = $key ? openssl_pkey_get_details($key) : null;
    if (!$details || $details['type'] !== OPENSSL_KEYTYPE_RSA || $details['bits'] < 2048) throw new InvalidArgumentException('A valid RSA service-account private key of at least 2048 bits is required.');
    return $account;
}
