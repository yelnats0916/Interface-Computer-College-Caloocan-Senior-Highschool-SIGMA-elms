<?php
require_once __DIR__ . '/../php/includes/ai_test_status.php';
$root = 'test-only-' . uniqid();
$key = ['id' => 'test-key', 'model' => 'test-model', 'api_key' => 'fake-test-secret'];
$path = aiTestStatusPath($root, $key);
try {
    if (readAiTestStatus($root, $key) !== []) throw new RuntimeException('Expected empty initial status.');
    saveAiTestStatus($root, $key, true);
    if (readAiTestStatus($root, $key)['last_status'] !== 'connected') throw new RuntimeException('Success not persisted.');
    saveAiTestStatus($root, $key, false);
    if (readAiTestStatus($root, $key)['last_status'] !== 'failed') throw new RuntimeException('Failure not persisted.');
    $changed = $key;
    $changed['model'] = 'different-model';
    if (readAiTestStatus($root, $changed) !== []) throw new RuntimeException('Model change borrowed old test status.');
    $source = file_get_contents(__DIR__ . '/../php/api/auth.php');
    $start = strpos($source, "if (\$action === 'test_ai_vault_key'");
    $end = strpos($source, '//', strpos($source, "if (\$testPassed) {", $start));
    $handler = substr($source, $start, $end - $start);
    if (strpos($handler, 'file_put_contents') !== false || strpos($handler, '$configExport') !== false) throw new RuntimeException('Connection tests must not rewrite watched configuration.');
    echo "PASS: test status stored outside workspace; success/failure persisted; model isolation; no configuration writes.\n";
} finally {
    if (is_file($path)) unlink($path);
}
