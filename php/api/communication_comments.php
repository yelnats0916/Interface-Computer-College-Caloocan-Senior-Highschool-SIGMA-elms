<?php
header('Content-Type: application/json');header('Cache-Control: no-store');
require_once __DIR__.'/../includes/ai_request_auth.php';require_once __DIR__.'/../includes/communication_comments.php';require_once __DIR__.'/../includes/grade_workflow_notifications.php';restrictServiceOrigin();
if(($_SERVER['REQUEST_METHOD']??'')==='OPTIONS')exit;
$actor=sigmaRequireAiActor(['student','teacher','admin','masteradmin','administrator']);
try{$db=serviceSettingsPdo();$method=$_SERVER['REQUEST_METHOD']??'';if(!in_array($method,['GET','POST'],true))throw new InvalidArgumentException('Unsupported method.');
$raw=$method==='POST'?file_get_contents('php://input',false,null,0,8001):'';if(strlen($raw)>8000)throw new InvalidArgumentException('Comment is too large.');$input=$method==='POST'?json_decode($raw,true,32,JSON_THROW_ON_ERROR):$_GET;
[$subject,$section,$thread]=sigmaCommentScope($db,$actor,$input);sigmaEnsureComments($db);
if($method==='POST'){sigmaEnsureSectionNotificationSchema($db);$db->beginTransaction();$created=sigmaWriteComment($db,$actor,$thread,$input);
if($created){
 $sections=$db->query("SELECT * FROM sections WHERE is_deleted=0 AND LOWER(status)<>'archived'")->fetchAll(PDO::FETCH_ASSOC);
 $users=$db->query("SELECT * FROM users WHERE is_deleted=0 AND LOWER(status)='active'")->fetchAll(PDO::FETCH_ASSOC);
 $correction=($input['kind']??'')==='grade_review'&&($input['event']??'')==='correction-request';
 if($correction&&!academicAdmin($actor)&&!gradeClassAdviser($sections,$section,$actor))throw new RuntimeException('Only the adviser can request grade corrections.');
 $event=$correction?'grade-corrections-requested':(($input['kind']??'')==='assessment'?'assessment-comment':'grade-record-comment');
 sigmaPersistWorkflowNotices($db,sigmaGradeWorkflowNotices($actor,$subject,$section,$sections,$users,$event,(string)$input['id'],$input));
}
sigmaRecordActivity($db,(string)$actor['id'],($input['action']??'post')==='delete'?'Deleted private comment':'Posted private comment','Communication',$subject['name'].' / '.$section['name']);$db->commit();}
echo json_encode(['success'=>true,'records'=>sigmaReadComments($db,$thread)],JSON_THROW_ON_ERROR);
}catch(InvalidArgumentException $e){http_response_code(400);echo json_encode(['success'=>false,'error'=>$e->getMessage()]);}
catch(PDOException $e){http_response_code(500);echo json_encode(['success'=>false,'error'=>'Private comments are temporarily unavailable.']);}
catch(RuntimeException $e){http_response_code(403);echo json_encode(['success'=>false,'error'=>$e->getMessage()]);}
catch(Throwable $e){http_response_code(500);echo json_encode(['success'=>false,'error'=>'Private comments are temporarily unavailable.']);}
finally{if(isset($db)&&$db->inTransaction())$db->rollBack();}
