<?php
function aiTestStatusPath(string $root, array $key): string {
    $identity = json_encode([$root, $key['id'] ?? '', $key['model'] ?? '', $key['api_key'] ?? '']);
    return sys_get_temp_dir() . '/sigma-ai-test-' . hash('sha256', $identity) . '.json';
}

function readAiTestStatus(string $root, array $key): array {
    $path = aiTestStatusPath($root, $key);
    $value = is_file($path) ? json_decode(file_get_contents($path), true) : null;
    return is_array($value) ? $value : [];
}

function saveAiTestStatus(string $root, array $key, bool $passed): void {
    $value = ['last_tested' => date('M j, Y, g:i A'), 'last_status' => $passed ? 'connected' : 'failed'];
    if (file_put_contents(aiTestStatusPath($root, $key), json_encode($value), LOCK_EX) === false) {
        throw new RuntimeException('Unable to save connection test status.');
    }
}
