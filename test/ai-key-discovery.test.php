<?php
require_once __DIR__ . '/../php/includes/ai_key_discovery.php';
function check($condition) { if (!$condition) throw new RuntimeException('Assertion failed'); }
check(aiKeyProvider('AIza-test-key') === 'gemini');
check(aiKeyProvider('AQ.test-key') === 'gemini');
check(aiKeyProvider('gsk_test-key') === 'groq');
try { aiKeyProvider('xai-old-key'); throw new RuntimeException('Old xAI key accepted as Groq'); } catch (InvalidArgumentException $expected) {}
$calls = [];
$result = discoverAiKey('AIza-test-only-key-123456', function ($url, $headers) use (&$calls) {
    $calls[] = [$url, $headers];
    return ['models' => [
        ['name' => 'models/gemini-test', 'displayName' => 'Gemini Test', 'supportedGenerationMethods' => ['generateContent']],
        ['name' => 'models/embedding', 'supportedGenerationMethods' => ['embedContent']]
    ]];
});
check(count($result['models']) === 1 && $result['models'][0]['id'] === 'gemini-test');
check(strpos($calls[0][0], 'generativelanguage.googleapis.com') !== false);
check(strpos($calls[0][0], 'AIza') === false);
$result = discoverAiKey('gsk_test-only-key-123456', function ($url, $headers) {
    check($url === 'https://api.groq.com/openai/v1/models');
    return ['data' => [['id' => 'llama-3.3-70b-versatile', 'active' => true], ['id' => 'whisper-large-v3'], ['id' => 'canopylabs/orpheus-v1-english'], ['id' => 'inactive-model', 'active' => false]]];
});
check(count($result['models']) === 1 && $result['provider'] === 'groq');
try {
    discoverAiKey('unknown-secret-123456789', function () { throw new RuntimeException('Must not send unknown key'); });
    throw new RuntimeException('Unknown key accepted');
} catch (InvalidArgumentException $expected) {}
echo "AI key discovery tests passed.\n";
