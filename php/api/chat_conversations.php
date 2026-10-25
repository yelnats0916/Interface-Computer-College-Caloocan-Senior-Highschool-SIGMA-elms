<?php
/** Authenticated recovery of this account's pre-fix browser conversations. */
header('Content-Type: application/json');
header('Cache-Control: no-store');
require_once __DIR__.'/../includes/data_provenance.php';
require_once __DIR__.'/../includes/chat_history_recovery.php';
restrictServiceOrigin();
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Sigma-Actor');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
if (($_SERVER['REQUEST_METHOD']??'') === 'OPTIONS') exit;
try {
    $db=serviceSettingsPdo();
    $actor=lifecycleActor();
    $db->exec("CREATE TABLE IF NOT EXISTS chat_conversation_controls (user_id VARCHAR(50) NOT NULL, conversation_id VARCHAR(128) NOT NULL, is_deleted TINYINT(1) NOT NULL DEFAULT 0, PRIMARY KEY(user_id,conversation_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    if (($_SERVER['REQUEST_METHOD']??'') === 'GET') {
        require_once __DIR__.'/../includes/chat_conversations.php';
        $query=$db->prepare("SELECT payload FROM ai_logs WHERE user_id=? AND feature='sigmabot' AND is_deleted=0");$query->execute([$actor]);
        $rows=[];while($row=$query->fetch(PDO::FETCH_ASSOC)){$log=json_decode($row['payload'],true);if(is_array($log))$rows[]=$log;}
        $hidden=$db->prepare('SELECT conversation_id FROM chat_conversation_controls WHERE user_id=? AND is_deleted=1');$hidden->execute([$actor]);$deleted=$hidden->fetchAll(PDO::FETCH_COLUMN);
        echo json_encode(['success'=>true,'conversations'=>array_values(array_filter(sigmaConversationHistory($rows),fn($chat)=>!in_array($chat['id'],$deleted,true))),'deletedIds'=>$deleted],JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);exit;
    }
    if (($_SERVER['REQUEST_METHOD']??'') !== 'POST') throw new InvalidArgumentException('Use POST to sync saved conversations.');
    $raw=file_get_contents('php://input',false,null,0,512001);
    if (strlen($raw)>512000) throw new InvalidArgumentException('Too much saved conversation data.');
    $input=json_decode($raw,true,64,JSON_THROW_ON_ERROR);
    sigmaRequireRealRecords($input);
    if (($input['action']??'')==='set_visibility') {
        $id=$input['conversationId']??'';
        if(!is_string($id)||!preg_match('/^[A-Za-z0-9_-]{1,128}$/D',$id)||!is_bool($input['deleted']??null))throw new InvalidArgumentException('Invalid conversation.');
        $save=$db->prepare('INSERT INTO chat_conversation_controls(user_id,conversation_id,is_deleted) VALUES(?,?,?) ON DUPLICATE KEY UPDATE is_deleted=VALUES(is_deleted)');$save->execute([$actor,$id,(int)$input['deleted']]);
        echo json_encode(['success'=>true]);exit;
    }

    if (($input['action']??'')!=='recover_chat_history'||!is_array($input['conversations']??null)) throw new InvalidArgumentException('Invalid saved conversations.');
    echo json_encode(['success'=>true,'protocol'=>'chat-history-v1']+sigmaRecoverChatHistory($db,$actor,$input['conversations']));
} catch(Throwable $error) {
    http_response_code($error instanceof InvalidArgumentException?400:409);
    echo json_encode(['success'=>false,'protocol'=>'chat-history-v1','error'=>$error->getMessage()]);
}
