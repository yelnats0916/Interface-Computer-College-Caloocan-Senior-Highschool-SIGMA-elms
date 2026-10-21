<?php
header('Content-Type: application/json');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
$local = in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true);
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$host = parse_url($origin, PHP_URL_HOST);
// Evidence currently comes from scoped browser collectors. Remote deployment requires database-backed authorization first.
if (!$local || ($origin && !in_array($host, ['localhost', '127.0.0.1', '::1'], true))) {
    http_response_code(403); echo json_encode(['success' => false, 'error' => 'Server-verified analytics records are required for remote access.']); exit;
}
if ($origin) { header('Access-Control-Allow-Origin: ' . $origin); header('Access-Control-Allow-Credentials: true'); header('Vary: Origin'); }
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: POST, OPTIONS');
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') exit;
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') { http_response_code(405); exit; }
$raw = file_get_contents('php://input', false, null, 0, 32001);
if (strlen($raw) > 32000) { http_response_code(413); echo json_encode(['success' => false, 'error' => 'Too much evidence for one request.']); exit; }
require_once __DIR__ . '/../includes/analytics_ai_generation.php';
require_once __DIR__ . '/../includes/ai_generation_id.php';
require_once __DIR__ . '/../includes/ai_request_auth.php';
$aiActor = sigmaRequireAiActor([]);
try {
    $input = json_decode($raw, true) ?: [];
    sigmaRequireRealRecords($input);
    $actorRole = preg_replace('/[\s_-]+/', '', strtolower($aiActor['role']));
    if (!in_array($actorRole, ['admin', 'masteradmin', 'administrator'], true)) {
        $kind = (string)($input['kind'] ?? '');
        if ($kind !== $actorRole || (string)($input['snapshot'][$kind . 'Id'] ?? '') !== (string)$aiActor['id']) {
            http_response_code(403); echo json_encode(['success'=>false,'error'=>'Analytics must belong to the signed-in account.']); exit;
        }
    }
    $services = require dirname(__DIR__, 2) . '/config/services.php';
    $result = generateAnalyticsAi($services, $input, function ($url, $headers, $body) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => json_encode($body), CURLOPT_HTTPHEADER => array_merge(['Content-Type: application/json'], $headers), CURLOPT_RETURNTRANSFER => true, CURLOPT_CONNECTTIMEOUT => 10, CURLOPT_TIMEOUT => 60, CURLOPT_SSL_VERIFYPEER => true, CURLOPT_SSL_VERIFYHOST => 2, CURLOPT_FOLLOWLOCATION => false]);
        $raw = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($raw === false || $code < 200 || $code >= 300) throw new RuntimeException($code === 429 ? 'AI quota reached. Wait before analyzing again.' : 'Analytics provider request failed. Check the saved key and model.');
        return json_decode($raw, true) ?: [];
    });
    // Determine specific insight code prefix (3 insight types):
    // 1. Cards (INSC) - Analytics Cards
    // 2. Subject (INSS) - Subject Grade Insights
    // 3. Grades (INSGR) - Overall Grades / Class Grades
    $insightType = strtolower($input['insightType'] ?? $input['scope'] ?? '');
    if (!$insightType && isset($input['snapshot']['scope'])) {
        $insightType = strtolower($input['snapshot']['scope']);
    }
    if (!$insightType && ($input['feature'] ?? '') === 'grade_insights') {
        $insightType = 'grades';
    }
    $areaId = strtolower($input['snapshot']['areas'][0]['id'] ?? '');

    if (strpos($areaId, 'subject') !== false || $insightType === 'subject' || strpos($insightType, 'subject') !== false) {
        $kind = 'insight_subject';
    } elseif (strpos($areaId, 'grade') !== false || $insightType === 'grades' || $insightType === 'overall' || strpos($insightType, 'grade') !== false) {
        $kind = 'insight_grades';
    } else {
        $kind = 'insight_cards';
    }
    $result['generationId'] = sigmaAiGenerationId($kind);
    echo json_encode(['success' => true] + $result);
} catch (InvalidArgumentException $error) { http_response_code(400); echo json_encode(['success' => false, 'error' => $error->getMessage()]); }
catch (Throwable $error) { http_response_code(502); echo json_encode(['success' => false, 'error' => $error instanceof RuntimeException ? $error->getMessage() : 'Analytics generation is unavailable.']); }
