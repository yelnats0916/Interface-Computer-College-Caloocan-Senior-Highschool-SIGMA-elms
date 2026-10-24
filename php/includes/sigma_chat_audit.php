<?php
require_once __DIR__ . '/ai_record_store.php';

/** Persist the authenticated request before the chat API confirms its answer. */
function sigmaRecordChatResult(PDO $db, array $actor, array $request, array $result): void {
    $now = gmdate('c');
    $display=is_string($request['displayMessage']??null)&&trim($request['displayMessage'])!==''&&strlen($request['displayMessage'])<=4000?$request['displayMessage']:$request['message'];
    $messages = [];
    foreach ($request['history'] ?? [] as $message) {
        if (is_array($message) && in_array($message['role'] ?? '', ['user','assistant'], true) && is_string($message['text'] ?? null)) {
            $messages[] = ['role'=>$message['role'], 'text'=>$message['text']];
        }
    }
    $messages[] = ['role'=>'user','text'=>$display,'timestamp'=>$now];
    $messages[] = ['role'=>'assistant','text'=>$result['text'],'timestamp'=>$now,'model'=>$result['model']];
    if(($result['kind']??'')==='selection')$messages[count($messages)-1]['sourceChoice']=[
        'question'=>$request['message'],'result'=>array_intersect_key($result,array_flip(['kind','text','options']))];
    saveAiLog($db, [
        'id'=>$result['generationId'], 'generationId'=>$result['generationId'],
        'userId'=>(string)$actor['id'], 'feature'=>'sigmabot', 'timestamp'=>$now,
        'prompt'=>$display, 'response'=>$result['text'], 'messages'=>$messages,
        'conversationId'=>is_string($request['conversationId']??null) ? substr($request['conversationId'],0,128) : '',
        'conversationTitle'=>is_string($request['conversationTitle']??null) ? mb_substr(trim($request['conversationTitle']),0,80) : '',
        'actionDescription'=>'SIGMA Chat', 'model'=>$result['model'], 'provider'=>$result['provider'],
        'keyId'=>$result['keyId'], 'keyLabel'=>$result['keyLabel'], 'status'=>$result['status']
    ]);
}
