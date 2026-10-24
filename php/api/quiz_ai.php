<?php
header('Content-Type: application/json');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$originHost = parse_url($origin, PHP_URL_HOST);
$local = in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true);
if ($origin && ($originHost === ($_SERVER['HTTP_HOST'] ? explode(':', $_SERVER['HTTP_HOST'])[0] : '') || ($local && in_array($originHost, ['localhost', '127.0.0.1'], true)))) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
    header('Vary: Origin');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
} elseif ($origin) { http_response_code(403); echo json_encode(['success' => false, 'error' => 'Origin not allowed.']); exit; }
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); exit; }
$input = file_get_contents('php://input', false, null, 0, 400001);
if (strlen($input) > 400000) { http_response_code(413); exit; }
require_once __DIR__ . '/../includes/quiz_ai_generation.php';
require_once __DIR__ . '/../includes/ai_generation_id.php';
require_once __DIR__ . '/../includes/ai_request_auth.php';
$aiActor = sigmaRequireAiActor(['admin', 'masteradmin', 'administrator', 'teacher']);
try {
    $request = json_decode($input, true) ?: [];
    sigmaRequireRealRecords($request);
    $services = require dirname(__DIR__, 2) . '/config/services.php';
    $result = generateQuizAi($services, $request, function ($url, $headers, $body) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => json_encode($body), CURLOPT_HTTPHEADER => array_merge(['Content-Type: application/json'], $headers), CURLOPT_RETURNTRANSFER => true, CURLOPT_CONNECTTIMEOUT => 10, CURLOPT_TIMEOUT => 45, CURLOPT_SSL_VERIFYPEER => true, CURLOPT_SSL_VERIFYHOST => 2, CURLOPT_FOLLOWLOCATION => false]);
        $raw = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($raw === false || $code < 200 || $code >= 300) throw new RuntimeException($code === 429 ? 'AI quota reached. Wait and try again.' : 'AI provider request failed. Check the saved key and model.');
        return json_decode($raw, true) ?: [];
    });
    $result['generationId'] = sigmaAiGenerationId('assessment');
    echo json_encode(['success' => true] + $result);
} catch (InvalidArgumentException $error) { http_response_code(400); echo json_encode(['success' => false, 'error' => $error->getMessage()]); }
catch (Throwable $error) { http_response_code(502); echo json_encode(['success' => false, 'error' => $error instanceof RuntimeException ? $error->getMessage() : 'AI generation is unavailable.']); }
