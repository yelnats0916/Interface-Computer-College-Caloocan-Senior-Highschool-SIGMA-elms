<?php
require __DIR__ . '/../php/includes/recaptcha_config.php';
function check($condition, $message) {
    if (!$condition) throw new RuntimeException($message);
}
$legacy = ['site_key' => 'v2-public-fixture', 'secret_key' => 'v2-secret-fixture-test-only', 'version' => 'v2', 'threshold' => 3, 'enabled' => true];
$config = normalizeRecaptchaConfig($legacy);
check($config['profiles']['v2']['secret_key'] === 'v2-secret-fixture-test-only', 'Legacy secret preserved');
check($config['profiles']['v3']['secret_key'] === '', 'No sharing of legacy keys');
$v3 = updateRecaptchaConfig($legacy, ['version' => 'v3', 'profiles' => ['v3' => ['site_key' => 'v3-public-fixture', 'secret_key' => 'v3-secret-fixture-test-only']]]);
check($v3['secret_key'] === 'v3-secret-fixture-test-only', 'Active verifier uses v3 key');
check($v3['profiles']['v2']['secret_key'] === 'v2-secret-fixture-test-only', 'v2 retained after switch');
$v2 = updateRecaptchaConfig($v3, ['version' => 'v2', 'profiles' => []]);
check($v2['secret_key'] === 'v2-secret-fixture-test-only', 'Switch back restores v2');
$preserved = updateRecaptchaConfig($v2, ['version' => 'v2', 'profiles' => ['v2' => ['site_key' => 'v2-public-fixture', 'secret_key' => '']]]);
check($preserved['secret_key'] === 'v2-secret-fixture-test-only', 'Blank replacement retains saved key');
$rules = updateRecaptchaConfig($v3, ['scope' => 'defense', 'threshold' => 5, 'enabled' => false]);
check($rules['profiles'] === $v3['profiles'] && $rules['version'] === 'v3', 'Rule saves do not change credentials/version');
check($rules['threshold'] === 5 && !$rules['enabled'], 'Rule changes saved');
$public = json_encode(publicRecaptchaConfig($v3));
check(strpos($public, 'v2-secret-fixture-test-only') === false && strpos($public, 'v3-secret-fixture-test-only') === false, 'Public response never exposes secrets');
try {
    updateRecaptchaConfig($legacy, ['version' => 'v3', 'profiles' => []]);
    throw new RuntimeException('Incomplete activation allowed');
} catch (InvalidArgumentException $expected) {}
echo "Version-specific credentials, migration, active switching, and secret redaction passed\n";
try {
    updateRecaptchaConfig($legacy, ['version' => 'v2', 'profiles' => ['v2' => ['site_key' => 'same-fixture', 'secret_key' => 'same-fixture']]]);
    throw new RuntimeException('Identical key pair accepted');
} catch (InvalidArgumentException $expected) {}
$bad = publicRecaptchaConfig(['version' => 'v2', 'site_key' => 'same-fixture', 'secret_key' => 'same-fixture']);
check(!empty($bad['credential_error']), 'Existing identical keys are diagnosed without exposing the secret');
foreach ([str_repeat('x', 256), 'invalid key', "invalid\nkey", "invalid\x00key"] as $invalidSiteKey) {
    try {
        updateRecaptchaConfig($legacy, ['version' => 'v2', 'site_key' => $invalidSiteKey]);
        throw new RuntimeException('Invalid public site key accepted');
    } catch (InvalidArgumentException $expected) {}
}
echo "Public site-key length and character restrictions passed\n";
