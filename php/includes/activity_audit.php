<?php
require_once __DIR__.'/audit_context.php';
function sigmaRecordActivity(PDO $db, string $actor, string $activity, string $module, string $details = ''): void {
    $context=sigmaActivityContext($activity,$details);
    $details=$context['details'];
    $payload=['activity'=>$activity,'module'=>$module,'details'=>$details];
    $fullPayload=$payload;
    do {
        $action='ACT:'.json_encode($payload,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);
        if(strlen($action)<=255)break;
        $payload['details']=mb_substr($payload['details'],0,max(0,mb_strlen($payload['details'])-10));
    }while($payload['details']!=='');
    $db->prepare('INSERT INTO audit_logs(user_id,action,ip_address,user_agent) VALUES(?,?,?,?)')->execute([$actor,$action,$_SERVER['REMOTE_ADDR']??null,substr($_SERVER['HTTP_USER_AGENT']??'',0,255)]);
    $auditId=$db->lastInsertId();
    $db->prepare('INSERT INTO audit_log_context(audit_id,payload) VALUES(?,?)')->execute([$auditId,json_encode($fullPayload,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR)]);
}
