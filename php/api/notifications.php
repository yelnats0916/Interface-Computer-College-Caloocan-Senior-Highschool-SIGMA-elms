<?php
header('Content-Type: application/json; charset=utf-8');header('Cache-Control: no-store');
require_once __DIR__.'/../includes/application_auth.php';
require_once __DIR__.'/../includes/service_vault_auth.php';
require_once __DIR__.'/../includes/role_permissions.php';
require_once __DIR__.'/../includes/academic_scope.php';
require_once __DIR__.'/../includes/school_year_notifications.php';
restrictServiceOrigin();
header('Access-Control-Allow-Headers: Content-Type, Authorization');header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
if(($_SERVER['REQUEST_METHOD']??'')==='OPTIONS')exit;
require_once dirname(__DIR__,2).'/config/database.php';
function notificationRole(array $user): string {$role=strtolower(str_replace(' ','',$user['role']??''));return str_contains($role,'admin')?'admin':$role;}
function notificationReply(array $data,int $code=200): void {http_response_code($code);echo json_encode($data,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);exit;}
try{
 $actor=sigmaRequireApplicationActor($pdo);$role=notificationRole($actor);$actorId=(string)$actor['id'];
 $pdo->exec("CREATE TABLE IF NOT EXISTS notification_records (id CHAR(64) NOT NULL PRIMARY KEY,notification_id VARCHAR(191) NOT NULL,target_role VARCHAR(16) NOT NULL,actor_id VARCHAR(50) NOT NULL,payload MEDIUMTEXT NOT NULL,created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,audit_deleted TINYINT(1) NOT NULL DEFAULT 0,KEY audience(target_role)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
 $pdo->exec("CREATE TABLE IF NOT EXISTS notification_receipts (notification_id CHAR(64) NOT NULL,user_id VARCHAR(50) NOT NULL,read_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(notification_id,user_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
 $pdo->exec("CREATE TABLE IF NOT EXISTS notification_audit_hidden (notification_id CHAR(64) NOT NULL,user_id VARCHAR(50) NOT NULL,PRIMARY KEY(notification_id,user_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
 $canAudit=$role==='admin'&&sigmaActorPermission($actor,'auditMain')&&sigmaActorPermission($actor,'auditNotifications');
 $load=function()use($pdo){$out=[];foreach($pdo->query('SELECT * FROM notification_records ORDER BY created_at DESC,id DESC')->fetchAll(PDO::FETCH_ASSOC) as $row){$payload=json_decode($row['payload'],true);if(is_array($payload))$out[]=$row+['notification'=>$payload];}return $out;};
 $receipts=[];$read=$pdo->prepare('SELECT notification_id,read_at FROM notification_receipts WHERE user_id=?');$read->execute([$actorId]);foreach($read->fetchAll(PDO::FETCH_ASSOC) as $receipt)$receipts[$receipt['notification_id']]=str_replace(' ','T',$receipt['read_at']).'Z';
 $allowed=fn($row)=>$row['target_role']===$role&&in_array($actorId,array_map('strval',array_column($row['notification']['recipients']??[],'id')),true);
 if(($_SERVER['REQUEST_METHOD']??'')==='GET'){
  if($role==='admin')sigmaPersistSchoolYearNotifications($pdo);
  $rows=$load();
  if(($_GET['view']??'')==='logs'){
   if(!$canAudit)notificationReply(['success'=>false,'error'=>'Notification log access is not enabled.'],403);
   $allReceipts=[];foreach($pdo->query('SELECT notification_id,user_id,read_at FROM notification_receipts')->fetchAll(PDO::FETCH_ASSOC) as $receipt)$allReceipts[$receipt['notification_id']][$receipt['user_id']]=str_replace(' ','T',$receipt['read_at']).'Z';
   $hidden=[];foreach($pdo->query('SELECT notification_id,user_id FROM notification_audit_hidden')->fetchAll(PDO::FETCH_ASSOC) as $hide)$hidden[$hide['notification_id']][]=$hide['user_id'];
   $logs=[];foreach($rows as $row){if($row['audit_deleted'])continue;$n=$row['notification'];$members=array_values(array_filter($n['recipients'],fn($member)=>!in_array((string)$member['id'],$hidden[$row['id']]??[],true)));foreach($members as &$member)$member['readAt']=$allReceipts[$row['id']][$member['id']]??null;unset($member);
    $logs[]=['id'=>$row['id'],'notificationId'=>$row['notification_id'],'role'=>$row['target_role'],'recipientId'=>$n['recipientId']??'','recipient'=>$n['recipientName']??ucfirst($row['target_role']).' audience','recipients'=>$members,'senderId'=>$n['senderId'],'senderName'=>$n['senderName'],'senderRole'=>$n['senderRole'],'senderType'=>$n['senderType']??'user','title'=>$n['title'],'body'=>$n['body']??'','type'=>$n['type']??'General','channel'=>'In-app','status'=>'Created','readAt'=>$allReceipts[$row['id']][$n['recipientId']??'']??null,'timestamp'=>str_replace(' ','T',$row['created_at']).'Z'];
   }notificationReply(['success'=>true,'records'=>$logs,'knownKeys'=>array_map(fn($row)=>$row['target_role'].'|'.$row['notification_id'],$rows)]);
  }
  $feed=[];foreach($rows as $row)if($allowed($row))$feed[]=array_merge($row['notification'],['read'=>isset($receipts[$row['id']]),'readAt'=>$receipts[$row['id']]??null,'serverRecordId'=>$row['id'],'timestamp'=>str_replace(' ','T',$row['created_at']).'Z']);
  notificationReply(['success'=>true,'records'=>$feed]);
 }
 $raw=file_get_contents('php://input',false,null,0,32001);if(strlen($raw)>32000)throw new InvalidArgumentException('Notification is too large.');$input=json_decode($raw,true,32,JSON_THROW_ON_ERROR);
 if(($input['action']??'')==='read'){
  $q=$pdo->prepare('SELECT * FROM notification_records WHERE id=?');$q->execute([$input['id']??'']);$row=$q->fetch(PDO::FETCH_ASSOC);if(!$row)throw new InvalidArgumentException('Notification not found.');$row['notification']=json_decode($row['payload'],true);if(!$allowed($row))notificationReply(['success'=>false,'error'=>'This notification belongs to another recipient.'],403);
  $pdo->prepare('INSERT IGNORE INTO notification_receipts(notification_id,user_id) VALUES(?,?)')->execute([$row['id'],$actorId]);notificationReply(['success'=>true]);
 }
 if(($input['action']??'')==='delete'){
  if(!$canAudit)notificationReply(['success'=>false,'error'=>'Notification log access is not enabled.'],403);
  if(!empty($input['recipientId']))$pdo->prepare('INSERT IGNORE INTO notification_audit_hidden(notification_id,user_id) VALUES(?,?)')->execute([$input['id']??'',(string)$input['recipientId']]);
  else $pdo->prepare('UPDATE notification_records SET audit_deleted=1 WHERE id=?')->execute([$input['id']??'']);notificationReply(['success'=>true]);
 }
 if(($input['action']??'')!=='send')throw new InvalidArgumentException('Invalid notification action.');
 $target=$input['role']??'';$n=$input['notification']??[];
 if(!in_array($target,['admin','teacher','student'],true)||!is_array($n)||!is_string($n['id']??null)||strlen($n['id'])>191||!trim($n['title']??''))throw new InvalidArgumentException('Invalid notification.');
 $recipientId=(string)($n['recipientId']??'');$scope=$n['assignmentScope']??[];$sections=[];
 if($role==='student'&&!(($target==='student'&&$recipientId===$actorId)||($target==='teacher'&&($recipientId!==''||!empty($scope['section'])))||($target==='admin'&&$recipientId!==''&&preg_match('/comment|reply|mention/i',(string)($n['type']??'')))))notificationReply(['success'=>false,'error'=>'Recipient access denied.'],403);
 foreach($pdo->query('SELECT * FROM sections WHERE is_deleted=0')->fetchAll(PDO::FETCH_ASSOC) as $section){
  if(!empty($scope['section'])&&gradeNorm($section['name'])!==gradeNorm($scope['section']))continue;
  if($role==='teacher'&&!gradeTeacher($section,$actor)&&!gradeAdviser($section,$actor))continue;
  if($role==='student'&&!gradeStudent($section,$actor))continue;
  $sections[]=$section;
 }
 $members=[];foreach($pdo->query("SELECT * FROM users WHERE is_deleted=0 AND LOWER(status)='active'")->fetchAll(PDO::FETCH_ASSOC) as $user){
  if(notificationRole($user)!==$target||($recipientId!==''&&(string)$user['id']!==$recipientId))continue;
  if($target==='student'&&($role==='teacher'||!empty($scope['section']))){$enrolled=false;foreach($sections as $section)if(gradeStudent($section,$user)){$enrolled=true;break;}if(!$enrolled)continue;}
  if($role==='student'&&$target==='student'&&(string)$user['id']!==$actorId)continue;
  if($role==='student'&&$target==='teacher'){$assigned=false;foreach($sections as $section)if(gradeTeacher($section,$user)||gradeAdviser($section,$user)){$assigned=true;break;}if(!$assigned)continue;}
  $members[]=['id'=>(string)$user['id'],'name'=>$user['full_name'],'role'=>$user['role'],'readAt'=>null];
 }
 if(!$members)throw new InvalidArgumentException('No matching recipients.');
 $safe=array_intersect_key($n,array_flip(['id','title','body','type','target','assignmentScope','recipientId','recipientName','icon','avatarImg']));$safe['title']=mb_substr($safe['title'],0,200);$safe['body']=mb_substr((string)($safe['body']??''),0,4000);
 $safe['senderId']=$actorId;$safe['senderName']=$actor['full_name'];$safe['senderRole']=$actor['role'];$safe['senderType']='user';$safe['recipients']=$members;
 if($role==='admin'&&($n['senderType']??'')==='system'){$safe['senderType']='system';$safe['senderName']=mb_substr((string)($n['senderName']??'Academic Calendar'),0,100);}
 $id=hash('sha256',$target.'|'.$n['id'].'|'.$recipientId);$pdo->prepare('INSERT IGNORE INTO notification_records(id,notification_id,target_role,actor_id,payload) VALUES(?,?,?,?,?)')->execute([$id,$n['id'],$target,$actorId,json_encode($safe,JSON_THROW_ON_ERROR)]);
 notificationReply(['success'=>true,'id'=>$id]);
}catch(InvalidArgumentException|JsonException $e){notificationReply(['success'=>false,'error'=>$e->getMessage()],400);}catch(Throwable $e){error_log('Notification records: '.$e->getMessage());notificationReply(['success'=>false,'error'=>'Notifications could not be loaded.'],503);}
