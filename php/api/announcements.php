<?php
require_once __DIR__.'/../../config/database.php';
require_once __DIR__.'/../includes/service_vault_auth.php';
require_once __DIR__.'/../includes/application_auth.php';
require_once __DIR__.'/../includes/announcement_store.php';
header('Content-Type: application/json; charset=utf-8');header('Cache-Control: no-store');header('X-Content-Type-Options: nosniff');restrictServiceOrigin();
function announcementReply(array $data,int $status=200):void {http_response_code($status);echo json_encode($data,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);exit;}
try {
    $actor=sigmaRequireApplicationActor($pdo,['admin','masteradmin','teacher','student']);
    $sections=announcementSections($pdo,$actor);$method=$_SERVER['REQUEST_METHOD'];
    if($method==='POST') {
        $raw=file_get_contents('php://input',false,null,0,1048577);if(strlen($raw)>1048576)announcementReply(['success'=>false,'error'=>'Announcement request is too large.'],413);
        $input=json_decode($raw,true,32,JSON_THROW_ON_ERROR);$operations=$input['operations']??[$input];if(count($operations)>50)throw new InvalidArgumentException('Too many announcement changes.');
        $pdo->beginTransaction();foreach($operations as $operation)announcementApply($pdo,$actor,$operation,$sections);$pdo->commit();
    } elseif($method!=='GET')announcementReply(['success'=>false,'error'=>'Unsupported method.'],405);
    $records=[];foreach($pdo->query('SELECT payload FROM school_announcements WHERE is_deleted=0 ORDER BY created_at DESC,id DESC')->fetchAll(PDO::FETCH_COLUMN) as $payload){$post=json_decode($payload,true);if(announcementVisible($post,$actor,$sections))$records[]=announcementPublic($post,(string)$actor['id']);}
    announcementReply(['success'=>true,'records'=>$records]);
} catch(Throwable $error){if($pdo && $pdo->inTransaction())$pdo->rollBack();$status=$error instanceof DomainException?403:($error instanceof UnexpectedValueException?409:($error instanceof InvalidArgumentException||$error instanceof JsonException?422:503));if($status===503)error_log('Announcements: '.$error->getMessage());announcementReply(['success'=>false,'error'=>$status===503?'Announcements are temporarily unavailable.':$error->getMessage()],$status);}
