<?php
header('Content-Type: application/json');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
require_once __DIR__ . '/../includes/ai_request_auth.php';
restrictServiceOrigin();
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: POST, OPTIONS');
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') exit;
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') { http_response_code(405); exit; }
$raw = file_get_contents('php://input', false, null, 0, 32001);
if (strlen($raw) > 32000) { http_response_code(413); echo json_encode(['success' => false, 'error' => 'Too much evidence for one request.']); exit; }
require_once __DIR__ . '/../includes/analytics_runner.php';
require_once __DIR__ . '/../includes/ai_generation_id.php';
require_once __DIR__ . '/../includes/ai_request_auth.php';
$aiActor = sigmaRequireAiActor([]);
$db=null;$dailyCycle=false;
try {
    $input=json_decode($raw,true)?:[];
    $dailyCycle=($input['feature']??'analytics')==='analytics'&&!empty($input['dailyCycle']);
    $db=serviceSettingsPdo();
    echo json_encode(sigmaRunAnalytics($db,$aiActor,$input,$dailyCycle));
} catch (InvalidArgumentException $error) { http_response_code(400); echo json_encode(['success'=>false,'error'=>$error->getMessage()]); }
catch (Throwable $error) {
    $message=$error instanceof RuntimeException?$error->getMessage():'Analytics generation is unavailable.';
    $retryAfter=300;
    if($dailyCycle&&$db instanceof PDO){
        try{
            require_once __DIR__.'/../includes/ai_background_limits.php';
            if(sigmaBackgroundAiWasLimited($error))$retryAt=sigmaPauseBackgroundAi($db,300);
            else $retryAt=sigmaBackgroundAiRetryAt($db);
            if(isset($retryAt)&&$retryAt>time())$retryAfter=$retryAt-time();
        }catch(Throwable $_){ }
    }
    if($error instanceof RuntimeException&&preg_match('/AI quota reached|analysis is cooling down/i',$message)){
        http_response_code(429);header('Retry-After: '.$retryAfter);
        echo json_encode(['success'=>false,'code'=>'ai_quota_reached','retryAfter'=>$retryAfter,'error'=>$message]);
    }elseif($error instanceof RuntimeException&&stripos($message,'already running')!==false){
        http_response_code(409);header('Retry-After: 15');
        echo json_encode(['success'=>false,'code'=>'analysis_in_progress','retryAfter'=>15,'error'=>$message]);
    }else{http_response_code(502);echo json_encode(['success'=>false,'error'=>$message]);}
}
