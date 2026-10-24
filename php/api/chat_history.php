<?php
/** Authenticated recovery of this account's pre-fix browser conversations. */
header('Content-Type: application/json');
header('Cache-Control: no-store');
require_once __DIR__.'/../includes/data_provenance.php';
require_once __DIR__.'/../includes/chat_history_recovery.php';
restrictServiceOrigin();
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Sigma-Actor');
header('Access-Control-Allow-Methods: POST, OPTIONS');
if (($_SERVER['REQUEST_METHOD']??'') === 'OPTIONS') exit;
try {
    $db=serviceSettingsPdo();
    $actor=lifecycleActor();
    if (($_SERVER['REQUEST_METHOD']??'') !== 'POST') throw new InvalidArgumentException('Use POST to sync saved conversations.');
    $raw=file_get_contents('php://input',false,null,0,512001);
    if (strlen($raw)>512000) throw new InvalidArgumentException('Too much saved conversation data.');
    $input=json_decode($raw,true,64,JSON_THROW_ON_ERROR);
    sigmaRequireRealRecords($input);
    if (($input['action']??'')!=='recover_chat_history'||!is_array($input['conversations']??null)) throw new InvalidArgumentException('Invalid saved conversations.');
    echo json_encode(['success'=>true,'protocol'=>'chat-history-v1']+sigmaRecoverChatHistory($db,$actor,$input['conversations']));
} catch(Throwable $error) {
    http_response_code($error instanceof InvalidArgumentException?400:409);
    echo json_encode(['success'=>false,'protocol'=>'chat-history-v1','error'=>$error->getMessage()]);
}
