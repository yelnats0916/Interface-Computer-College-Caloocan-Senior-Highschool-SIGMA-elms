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
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
} elseif ($origin) { http_response_code(403); echo json_encode(['success' => false, 'error' => 'Origin not allowed.']); exit; }
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

if (!in_array($_SERVER['REQUEST_METHOD'], ['GET','POST'], true)) { http_response_code(405); exit; }
$input = file_get_contents('php://input', false, null, 0, 400001);
if (strlen($input) > 400000) { http_response_code(413); exit; }
require_once __DIR__ . '/../includes/quiz_ai_jobs.php';
require_once __DIR__ . '/../includes/ai_generation_id.php';
require_once __DIR__ . '/../includes/ai_request_auth.php';
$aiActor = sigmaRequireAiActor(['admin', 'masteradmin', 'administrator', 'teacher']);
try {
    if($_SERVER['REQUEST_METHOD']==='GET'){
        $status=quizAiReadJob((string)($_GET['jobId']??''),(string)$aiActor['id']);
        echo json_encode(['success'=>true]+$status);exit;
    }
    $request=json_decode($input,true,64,JSON_THROW_ON_ERROR)?:[];
    sigmaRequireRealRecords($request);
    $jobId=quizAiStartJob($request,$aiActor);
    http_response_code(202);echo json_encode(['success'=>true,'status'=>'pending','jobId'=>$jobId]);
} catch (InvalidArgumentException $error) { http_response_code(400); echo json_encode(['success' => false, 'error' => $error->getMessage()]); }
catch (Throwable $error) { http_response_code(502); echo json_encode(['success' => false, 'error' => $error instanceof RuntimeException ? $error->getMessage() : 'AI generation is unavailable.']); }
