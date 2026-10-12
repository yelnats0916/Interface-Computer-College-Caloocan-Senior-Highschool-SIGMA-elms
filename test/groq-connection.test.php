<?php
require_once __DIR__ . '/../php/includes/ai_key_discovery.php';
$calls = 0;
$request = function ($url, $headers) use (&$calls) {
    $calls++;
    if ($url !== 'https://api.groq.com/openai/v1/models') throw new LogicException('Do not encode slash-containing model IDs into the URL path.');
    if ($headers !== ['Authorization: Bearer gsk_test-only-secret-123456']) throw new LogicException('Invalid authorization header.');
    return ['data' => [['id' => 'openai/gpt-oss-20b', 'active' => true]]];
};
verifyGroqModel('gsk_test-only-secret-123456', 'openai/gpt-oss-20b', $request);
try {
    verifyGroqModel('gsk_test-only-secret-123456', 'missing-model', $request);
    throw new LogicException('Unavailable model accepted');
} catch (RuntimeException $error) {
    if (strpos($error->getMessage(), 'key is valid') === false) throw $error;
}
try {
    verifyGroqModel('gsk_test-only-secret-123456', 'openai/gpt-oss-20b', function () { throw new RuntimeException('Provider rejected test key.'); });
    throw new LogicException('Rejected key accepted');
} catch (RuntimeException $error) {
    if ($error->getMessage() !== 'Provider rejected test key.') throw $error;
}
if ($calls !== 2) throw new LogicException('Unexpected provider request count.');
echo "PASS: slash-containing Groq model IDs, valid key/model, unavailable model, and rejected key.\n";
