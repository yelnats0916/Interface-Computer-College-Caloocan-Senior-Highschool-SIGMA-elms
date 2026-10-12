<?php
require_once __DIR__ . '/service_key_validation.php';
/** Version-specific credentials with legacy active-key compatibility. */
function normalizeRecaptchaConfig(array $config): array {
    $version = ($config['version'] ?? 'v2') === 'v3' ? 'v3' : 'v2';
    $profiles = $config['profiles'] ?? [];
    foreach (['v2', 'v3'] as $type) {
        if (!isset($profiles[$type])) {
            $profiles[$type] = $type === $version
                ? ['site_key' => $config['site_key'] ?? '', 'secret_key' => $config['secret_key'] ?? '']
                : ['site_key' => '', 'secret_key' => ''];
        }
    }
    $config['profiles'] = $profiles;
    $config['version'] = $version;
    $config['site_key'] = $profiles[$version]['site_key'] ?? '';
    $config['secret_key'] = $profiles[$version]['secret_key'] ?? '';
    return $config;
}

function publicRecaptchaConfig(array $config): array {
    $config = normalizeRecaptchaConfig($config);
    $profiles = [];
    foreach (['v2', 'v3'] as $type) {
        $profiles[$type] = [
            'site_key' => $config['profiles'][$type]['site_key'] ?? '',
            'has_secret' => !empty($config['profiles'][$type]['secret_key'])
        ];
    }
    $error = !empty($config['site_key']) && $config['site_key'] === $config['secret_key']
        ? 'The Site Key and Secret Key are identical. Replace the secret with the value from Google Copy Secret Key.' : null;
    return [
        'success' => true, 'site_key' => $config['site_key'],
        'has_secret' => !empty($config['secret_key']), 'profiles' => $profiles,
        'version' => $config['version'], 'threshold' => (int) ($config['threshold'] ?? 3),
        'enabled' => (bool) ($config['enabled'] ?? true), 'credential_error' => $error
    ];
}

function updateRecaptchaConfig(array $config, array $payload): array {
    $config = normalizeRecaptchaConfig($config);
    if (($payload['scope'] ?? '') !== 'defense') {
        $version = $payload['version'] ?? $config['version'];
        if (!in_array($version, ['v2', 'v3'], true)) throw new InvalidArgumentException('Invalid reCAPTCHA version');
        $updates = $payload['profiles'] ?? [$version => $payload];
        foreach (['v2', 'v3'] as $type) {
            if (!isset($updates[$type])) continue;
            if (isset($updates[$type]['site_key']) && (isset($payload['profiles']) || trim($updates[$type]['site_key']) !== '')) {
                $siteKey = trim($updates[$type]['site_key']);
                if (strlen($siteKey) > 255 || ($siteKey !== '' && !preg_match('/^[\x21-\x7e]+$/D', $siteKey))) {
                    throw new InvalidArgumentException('Public site keys must be at most 255 characters without spaces, line breaks, or control characters.');
                }
                $config['profiles'][$type]['site_key'] = $siteKey;
            }
            $secret = trim($updates[$type]['secret_key'] ?? '');
            if ($secret !== '') $config['profiles'][$type]['secret_key'] = validateOpaqueServiceKey($secret, 4096);
        }
        if (empty($config['profiles'][$version]['site_key']) || empty($config['profiles'][$version]['secret_key'])) {
            throw new InvalidArgumentException('Save a site key and secret key for the selected version before activating it');
        }
        if ($config['profiles'][$version]['site_key'] === $config['profiles'][$version]['secret_key']) {
            throw new InvalidArgumentException('Site Key and Secret Key must be different. Use Google Copy Secret Key for the secret.');
        }
        $config['version'] = $version;
    }
    if (isset($payload['threshold'])) $config['threshold'] = max(1, min(50, (int) $payload['threshold']));
    if (isset($payload['enabled'])) $config['enabled'] = (bool) $payload['enabled'];
    return normalizeRecaptchaConfig($config);
}
