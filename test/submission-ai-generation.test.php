<?php
require_once __DIR__ . '/../php/includes/submission_ai_generation.php';
function check($condition) { if (!$condition) throw new RuntimeException('Assertion failed'); }
$input = ['title' => 'Variables', 'instructions' => 'Declare an integer.', 'submissionText' => 'int count = 1;', 'rubricText' => 'Correct declaration: 10 points.', 'maxScore' => 10,
    'criteria' => [['id' => 'content', 'title' => 'Content and Understanding']], 'autoSelect' => false];
$services = ['ai_vault' => [
    ['id' => 'g', 'provider' => 'gemini', 'model' => 'test', 'api_key' => 'dummy'],
    ['id' => 'q', 'provider' => 'groq', 'model' => 'test', 'api_key' => 'dummy']
], 'ai_routing' => ['features' => ['submission_evaluation' => 'gemini'], 'defaults' => ['gemini' => 'g', 'groq' => 'q']]];
$evaluation = ['score' => 9, 'criteria' => [['id' => 'content', 'description' => 'Correct integer declaration.']], 'commentary' => [['term' => 'Next Steps', 'description' => 'Explain the initializer.', 'type' => 'recommendation']]];
$calls = 0;
$result = generateSubmissionAi($services, $input, function ($url, $headers, $body) use (&$calls, $evaluation) {
    $calls++;
    if ($calls === 1) throw new RuntimeException('Primary unavailable');
    check(str_contains($body['messages'][1]['content'], 'int count = 1;'));
    check(str_contains($body['messages'][1]['content'], 'Correct declaration'));
    return ['choices' => [['message' => ['content' => json_encode($evaluation)]]]];
});
check($calls === 2 && $result['status'] === 'Fallback Used' && $result['score'] === 9.0);
check($result['criteria'][0]['title'] === 'Content and Understanding');
foreach ([['term' => 'Unsupported', 'description' => 'Text', 'type' => 'diagnosis'], ['term' => 'Link', 'description' => 'See https://example.com', 'type' => 'feedback'], ['term' => '', 'description' => 'Text', 'type' => 'feedback']] as $invalidSummary) {
    try { validateSubmissionAiResult(array_merge($evaluation, ['commentary' => [$invalidSummary]]), 10, $input['criteria']); throw new Exception('Invalid summary accepted'); }
    catch (RuntimeException $expected) {}
}
$sanitized = validateSubmissionAiResult(array_merge($evaluation, ['commentary' => [['term' => '<b>Accuracy</b>', 'description' => '<em>Correct declaration.</em>', 'type' => 'feedback']]]), 10, $input['criteria']);
check($sanitized['commentary'][0]['term'] === 'Accuracy' && $sanitized['commentary'][0]['description'] === 'Correct declaration.');
foreach ([-1, 11, '9'] as $score) {
    try { validateSubmissionAiResult(array_merge($evaluation, ['score' => $score]), 10, $input['criteria']); throw new Exception('Invalid score accepted'); }
    catch (RuntimeException $expected) {}
}
try { generateSubmissionAi($services, array_merge($input, ['rubricText' => '']), function () { throw new Exception('Provider called for missing rubric'); }); throw new Exception('Missing rubric accepted'); }
catch (InvalidArgumentException $expected) {}
echo "PASS: rubric evidence, provider fallback, score validation and required document content\n";
