<?php
require __DIR__ . '/../php/includes/recaptcha_service.php';
function check($condition, $message) { if (!$condition) throw new RuntimeException($message); }
$valid = ['success' => true, 'hostname' => 'localhost', 'action' => 'login', 'score' => 0.9];
check(RecaptchaService::validateResponse($valid, ['version' => 'v3'], 'localhost')['success'], 'Valid v3 response');
check(RecaptchaService::validateResponse($valid, ['version' => 'v2'], '127.0.0.1')['success'], 'Localhost alias');
check(!RecaptchaService::validateResponse(array_merge($valid, ['score' => 0.2]), ['version' => 'v3'], 'localhost')['success'], 'Reject low score');
check(!RecaptchaService::validateResponse(array_merge($valid, ['action' => 'other']), ['version' => 'v3'], 'localhost')['success'], 'Reject wrong action');
check(!RecaptchaService::validateResponse($valid, ['version' => 'v3'], 'school.example')['success'], 'Reject wrong hostname');
check(!RecaptchaService::validateResponse(['success' => false], ['version' => 'v2'], 'localhost')['success'], 'Reject failed token');
check(!RecaptchaService::verify('')['success'], 'Reject empty token');
$response = RecaptchaService::validateResponse($valid, ['version' => 'v3'], 'localhost');
check($response['score'] === 0.9 && $response['action'] === 'login' && $response['hostname'] === 'localhost', 'Return real v3 metrics');
$v2 = RecaptchaService::validateResponse(['success' => true, 'hostname' => 'localhost'], ['version' => 'v2'], 'localhost');
check($v2['score'] === null && $v2['action'] === null, 'Do not invent v2 metrics');
echo "Server token failure, hostname, v3 action, and risk checks passed\n";
