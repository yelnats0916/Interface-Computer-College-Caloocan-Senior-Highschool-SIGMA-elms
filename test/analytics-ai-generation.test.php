<?php
require_once __DIR__ . '/../php/includes/analytics_ai_generation.php';
function verifyAnalytics($condition, $message) { if (!$condition) throw new LogicException($message); }
$services = ['ai_vault' => [
    ['id' => 'gem', 'provider' => 'gemini', 'model' => 'gemini-test', 'api_key' => 'test-only-secret'],
    ['id' => 'gro', 'provider' => 'groq', 'model' => 'groq-test', 'api_key' => 'test-only-secret-two']
], 'ai_routing' => ['features' => ['analytics' => 'gemini'], 'defaults' => ['gemini' => 'gem', 'groq' => 'gro'], 'allow_fallback' => false]];
$snapshot = ['studentId' => 'student-1', 'areas' => [['id' => 'submissions', 'records' => [['id' => 'record-1', 'subjectId' => 'prog1', 'sectionId' => 'Rizal', 'score' => 82, 'maximumScore' => 100]]]]];
$card = ['area' => 'submissions', 'title' => 'Review Your Recorded Assessment', 'icon' => 'review', 'evidenceIds' => ['record-1'], 'analyses' => [['category' => 'descriptive', 'actionLabel' => 'Try', 'context' => 'Your recorded score is 82/100.', 'text' => 'Review your assessment feedback.']]];
$input = ['kind' => 'student', 'snapshot' => $snapshot, 'maxCards' => 3];
$result = generateAnalyticsAi($services, $input, function($url, $headers, $body) use ($card) {
    verifyAnalytics(strpos($url, 'gemini-test:generateContent') !== false, 'Use saved analytics model');
    verifyAnalytics($headers === ['x-goog-api-key: test-only-secret'], 'Use server-side key');
    verifyAnalytics(strpos($body['contents'][0]['parts'][0]['text'], 'record-1') !== false, 'Send actual evidence IDs');
    return ['candidates' => [['content' => ['parts' => [['text' => json_encode(['cards' => [$card]])]]]]]];
});
verifyAnalytics(count($result['cards']) === 1 && $result['model'] === 'gemini-test', 'Return generated card and actual model');
verifyAnalytics(strpos(json_encode($result), 'test-only-secret') === false, 'Never return credentials');
$result = generateAnalyticsAi($services, $input, function() use ($card) {
    return ['candidates' => [['content' => ['parts' => [
        ['thought' => true, 'text' => 'Internal reasoning is not the JSON response.'],
        ['text' => json_encode(['cards' => [$card]])]
    ]]]]];
});
verifyAnalytics($result['provider'] === 'gemini' && $result['status'] === 'Success', 'Thinking parts must not force Groq fallback');
$bad = $card; $bad['evidenceIds'] = ['invented'];
try { validateAnalyticsAiCards([$bad], $snapshot, 3); throw new LogicException('Unknown evidence accepted'); } catch (RuntimeException $expected) {}
$bad = $card; $bad['analyses'][0]['text'] = 'Open [external](https://example.com/)';
$clean = validateAnalyticsAiCards([$bad], $snapshot, 3);
verifyAnalytics($clean[0]['analyses'][0]['text'] === 'Open external', 'Strip unverified destinations');
$services['ai_routing']['allow_fallback'] = true;
$calls = 0;
$result = generateAnalyticsAi($services, $input, function($url, $headers, $body) use (&$calls, $card) {
    if (++$calls === 1) throw new RuntimeException('Simulated quota');
    verifyAnalytics($url === 'https://api.groq.com/openai/v1/chat/completions', 'Fallback uses Groq');
    return ['choices' => [['message' => ['content' => json_encode(['cards' => [$card]])]]]];
});
verifyAnalytics($result['status'] === 'Fallback Used' && $result['model'] === 'groq-test', 'Actual fallback metadata preserved');
$snapshot['teacherId'] = 'teacher-1'; unset($snapshot['studentId']);
$input = ['kind' => 'teacher', 'snapshot' => $snapshot, 'maxCards' => 1];
$result = generateAnalyticsAi($services, $input, function() { return ['candidates' => [['content' => ['parts' => [['text' => '{"cards":[]}']]]]]]; });
verifyAnalytics($result['cards'] === [], 'No insights is valid; do not generate fake cards');
echo "PASS: live provider payloads, scoped evidence IDs, generated cards, actual model/key metadata, fallback, unknown evidence rejection, safe links, valid empty result.\n";
