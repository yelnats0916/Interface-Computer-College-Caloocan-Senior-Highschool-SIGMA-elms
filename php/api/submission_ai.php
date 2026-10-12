<?php
header('Content-Type: application/json');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$host = parse_url($origin, PHP_URL_HOST);
if (!in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true) || ($origin && !in_array($host, ['localhost', '127.0.0.1', '::1'], true))) {
    http_response_code(403); echo json_encode(['success' => false, 'error' => 'Server-verified submission access is required for remote evaluation.']); exit;
}
if ($origin) { header('Access-Control-Allow-Origin: ' . $origin); header('Access-Control-Allow-Credentials: true'); header('Vary: Origin'); }
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: POST, OPTIONS');
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') exit;
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') { http_response_code(405); exit; }
$raw = file_get_contents('php://input', false, null, 0, 150001);
if (strlen($raw) > 150000) { http_response_code(413); echo json_encode(['success' => false, 'error' => 'Submission evidence is too large.']); exit; }
require_once __DIR__ . '/../includes/submission_ai_generation.php';
try {
    $services = require dirname(__DIR__, 2) . '/config/services.php';
    $result = generateSubmissionAi($services, json_decode($raw, true) ?: [], function ($url, $headers, $body) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => json_encode($body), CURLOPT_HTTPHEADER => array_merge(['Content-Type: application/json'], $headers), CURLOPT_RETURNTRANSFER => true, CURLOPT_CONNECTTIMEOUT => 10, CURLOPT_TIMEOUT => 60, CURLOPT_SSL_VERIFYPEER => true, CURLOPT_SSL_VERIFYHOST => 2, CURLOPT_FOLLOWLOCATION => false]);
        $raw = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($raw === false || $code < 200 || $code >= 300) throw new RuntimeException($code === 429 ? 'AI quota reached. Try again later.' : 'Submission evaluation failed. Check the saved provider key and model.');
        return json_decode($raw, true) ?: [];
    });
    echo json_encode(['success' => true] + $result);
} catch (InvalidArgumentException $error) { http_response_code(400); echo json_encode(['success' => false, 'error' => $error->getMessage()]); }
catch (Throwable $error) { http_response_code(502); echo json_encode(['success' => false, 'error' => $error instanceof RuntimeException ? $error->getMessage() : 'Submission evaluation is unavailable.']); }
