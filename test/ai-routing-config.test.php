<?php
require __DIR__ . '/../php/includes/ai_routing_config.php';

function check($condition, $message) {
    if (!$condition) throw new RuntimeException($message);
}
$services = ['ai_vault' => [
    ['id' => 'g1', 'provider' => 'gemini', 'api_key' => 'test-only-secret'],
    ['id' => 'g2', 'provider' => 'gemini'],
    ['id' => 'x1', 'provider' => 'groq']
], 'ai_designations' => ['quiz' => 'x1']];
$routing = aiRoutingConfig($services);
$fresh = aiRoutingConfig([]);
check($fresh['features'] === ['sigmabot' => 'groq', 'analytics' => 'gemini', 'quiz' => 'groq', 'submission_evaluation' => 'gemini', 'submission_feedback' => 'gemini', 'grade_insights' => 'gemini'], 'Use the requested provider split by default.');
$custom = ['ai_routing' => ['features' => ['sigmabot' => 'gemini', 'analytics' => 'groq']]];
check(aiRoutingConfig($custom)['features']['sigmabot'] === 'gemini' && aiRoutingConfig($custom)['features']['analytics'] === 'groq', 'Explicit assignments override defaults.');
check($routing['allow_fallback'] === true, 'New configurations enable fallback by default.');
$explicitOff = $services;
$explicitOff['ai_routing']['allow_fallback'] = false;
check(aiRoutingConfig($explicitOff)['allow_fallback'] === false, 'Preserve an explicitly saved off setting.');
check(count($routing['features']) === 6, 'All six features must exist.');
check($routing['features']['quiz'] === 'groq', 'Migrate stored key designations to providers.');
check($routing['defaults'] === ['gemini' => 'g1', 'groq' => 'x1'], 'Default each provider independently.');
check(!str_contains(json_encode($routing), 'test-only-secret'), 'Do not expose secrets.');
$routing['defaults']['gemini'] = 'g2';
$routing['allow_fallback'] = true;
$updated = updateAiRoutingConfig($services, $routing);
check($updated === $routing, 'Save defaults, assignments, and fallback together.');
$services['ai_routing'] = $routing;
check(aiRoutingConfig($services) === $routing, 'Reload preserves configuration.');
array_splice($services['ai_vault'], 1, 1);
check(aiRoutingConfig($services)['defaults']['gemini'] === 'g1', 'Recover a deleted provider default.');
foreach (['provider', 'default', 'fallback'] as $invalid) {
    $payload = aiRoutingConfig($services);
    if ($invalid === 'provider') $payload['features']['quiz'] = 'unknown';
    if ($invalid === 'default') $payload['defaults']['gemini'] = 'x1';
    if ($invalid === 'fallback') $payload['allow_fallback'] = 'false';
    try {
        updateAiRoutingConfig($services, $payload);
        throw new RuntimeException('Invalid input accepted: ' . $invalid);
    } catch (InvalidArgumentException $expected) {}
}
$legacy = ['gemini' => ['api_key' => 'test-only-secret']];
check(aiRoutingConfig($legacy)['defaults']['gemini'] === 'key_gemini_init', 'Legacy keys remain selectable.');
echo "AI routing configuration tests passed.\n";
