<?php
require_once __DIR__ . '/../php/includes/quiz_ai_generation.php';
function verify($condition, $message) { if (!$condition) throw new RuntimeException($message); }
$services = ['ai_vault' => [
    ['id' => 'gem', 'provider' => 'gemini', 'model' => 'gemini-test', 'api_key' => 'fake-gemini-key'],
    ['id' => 'gro', 'provider' => 'groq', 'model' => 'llama-test', 'api_key' => 'fake-groq-key']
], 'ai_routing' => ['features' => ['quiz' => 'groq'], 'defaults' => ['gemini' => 'gem', 'groq' => 'gro'], 'allow_fallback' => false]];
$input = ['source' => 'An integer stores whole numbers.', 'count' => 1, 'type' => 'Multiple Choice', 'difficulty' => 'Medium', 'provider' => 'gemini'];
$quiz = ['questions' => [['type' => 'Multiple Choice', 'question' => 'What does an integer store?', 'choices' => ['Whole numbers', 'Files', 'Images', 'Video'], 'answer' => 'Whole numbers', 'points' => 100]]];
$result = generateQuizAi($services, $input, function($url, $headers, $body) use ($quiz) {
    verify($url === 'https://api.groq.com/openai/v1/chat/completions', 'Must use Groq endpoint from central routing');
    verify($body['model'] === 'llama-test', 'Saved model must be used');
    verify(in_array('Authorization: Bearer fake-groq-key', $headers), 'Stored key stays server-side');
    return ['choices' => [['message' => ['content' => json_encode($quiz)]]]];
});
verify($result['provider'] === 'groq' && $result['model'] === 'llama-test', 'Return actual model/provider');
verify($result['questions'][0]['points'] === 0, 'Generated question points must be zero');
verify(strpos(json_encode($result), 'fake-groq-key') === false, 'Response must never expose key');
$services['ai_routing']['allow_fallback'] = true;
$calls = 0;
$result = generateQuizAi($services, $input, function($url) use (&$calls, $quiz) {
    $calls++;
    if ($calls === 1) throw new RuntimeException('Simulated quota error');
    verify(strpos($url, '/models/gemini-test:generateContent') !== false, 'Fallback uses Gemini saved model');
    return ['candidates' => [['content' => ['parts' => [['text' => json_encode($quiz)]]]]]];
});
verify($result['status'] === 'Fallback Used' && $result['provider'] === 'gemini', 'Record actual fallback');
$services['ai_routing']['allow_fallback'] = false;
$calls = 0;
try {
    generateQuizAi($services, $input, function() use (&$calls) { $calls++; throw new RuntimeException('Simulated provider error'); });
    throw new LogicException('Failure must not produce fake questions');
} catch (RuntimeException $error) { verify($calls === 1, 'No fallback without permission'); }
try { validateQuizAiQuestions([['type' => 'Essay', 'question' => 'Wrong type', 'answer' => 'Answer']], 1, 'Multiple Choice'); throw new LogicException('Invalid type accepted'); } catch (RuntimeException $expected) {}
try { generateQuizAi($services, $input + [], function() { return []; }); throw new LogicException('Invalid output accepted'); } catch (RuntimeException $expected) {}
echo "PASS: central routing, stored keys/model, Groq/Gemini requests, fallback policy, exact model metadata, zero points, malformed output rejection.\n";
