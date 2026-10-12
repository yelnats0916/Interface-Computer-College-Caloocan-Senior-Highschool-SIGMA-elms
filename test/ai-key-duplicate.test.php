<?php
$source = file_get_contents(__DIR__ . '/../php/api/auth.php');
$start = strpos($source, '        $effectiveApiKey = $apiKey;');
// The production guard is evaluated with test-only vault entries, never real credentials.
$end = strpos($source, "\n        if (\$existingIdx >= 0) {", $start);
$guard = substr($source, $start, $end - $start);
function jsonOut($result, $status = 200) { throw new RuntimeException((string)$status); }
$services = ['ai_vault' => [
    ['id' => 'one', 'api_key' => 'test-key', 'model' => 'model-one'],
    ['id' => 'two', 'api_key' => 'test-key', 'model' => 'model-two']
]];
$cases = [
    ['test-key', 'model-one', -1, true],
    ['test-key', 'model-three', -1, false],
    ['different-key', 'model-one', -1, false],
    ['__PRESERVE__', 'model-one', 0, false],
    ['__PRESERVE__', 'model-two', 0, true],
    ['', 'model-two', 0, true],
    ['test-key', 'model-one', 1, true]
];
foreach ($cases as [$apiKey, $model, $existingIdx, $expected]) {
    $rejected = false;
    try { eval($guard); } catch (RuntimeException $error) { $rejected = $error->getMessage() === '409'; }
    if ($rejected !== $expected) throw new RuntimeException('Duplicate guard failed a test case.');
}
echo "PASS: duplicate key/model adds and edits rejected; distinct models/keys and unchanged edits allowed.\n";
