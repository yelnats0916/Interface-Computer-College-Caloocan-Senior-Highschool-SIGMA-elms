<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
require_once __DIR__.'/../includes/service_vault_auth.php';
require_once __DIR__.'/../includes/application_auth.php';
require_once __DIR__.'/../includes/role_permissions.php';
restrictServiceOrigin();
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') exit;
require_once dirname(__DIR__,2).'/config/database.php';
function authLogReply(array $data, int $status=200): void { http_response_code($status); echo json_encode($data,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES); exit; }
try {
    $actor=sigmaRequireApplicationActor($pdo,['admin','masteradmin']);
    if (!sigmaActorPermission($actor,'auditMain') || !sigmaActorPermission($actor,'auditAuth')) authLogReply(['success'=>false,'error'=>'Authentication log access is not enabled for this account.'],403);
    if ($_SERVER['REQUEST_METHOD']==='POST') {
        $input=json_decode(file_get_contents('php://input',false,null,0,4097),true,16,JSON_THROW_ON_ERROR);
        if (($input['action']??'')!=='delete' || !preg_match('/^server-auth-([0-9]+)$/D',(string)($input['id']??''),$match)) authLogReply(['success'=>false,'error'=>'Invalid authentication log action.'],400);
        $pdo->prepare("UPDATE audit_logs SET is_deleted=1,deleted_at=UTC_TIMESTAMP(),deleted_by=? WHERE id=? AND action LIKE 'AUTH:%' AND is_deleted=0")->execute([$actor['id'],$match[1]]);
        authLogReply(['success'=>true]);
    }
    if ($_SERVER['REQUEST_METHOD']!=='GET') authLogReply(['success'=>false,'error'=>'Unsupported method.'],405);
    $query=$pdo->query("SELECT a.*,u.full_name,u.role,u.avatar FROM audit_logs a LEFT JOIN users u ON u.id=a.user_id WHERE a.is_deleted=0 AND a.action LIKE 'AUTH:%' ORDER BY a.created_at DESC,a.id DESC");
    $records=[];
    while($row=$query->fetch(PDO::FETCH_ASSOC)) {
        $event=json_decode(substr($row['action'],5),true); if(!is_array($event)||empty($event['event']))continue;
        $ua=$row['user_agent']??'';
        $browser=str_contains($ua,'Edg/')?'Edge':(str_contains($ua,'Firefox/')?'Firefox':(str_contains($ua,'Chrome/')?'Chrome':(str_contains($ua,'Safari/')?'Safari':'Browser')));
        $platform=str_contains($ua,'Windows')?'Windows':(str_contains($ua,'Android')?'Android':(preg_match('/iPhone|iPad|iPod/',$ua)?'iOS':(str_contains($ua,'Mac OS')?'macOS':'Device not recorded')));
        $records[]=['id'=>'server-auth-'.$row['id'],'source'=>'server','timestamp'=>str_replace(' ','T',$row['created_at']).'Z',
            'event'=>$event['event'],'outcome'=>$event['outcome']??'success','details'=>$event['details']??'',
            'userId'=>$row['user_id']??'','userName'=>$row['full_name']??'Unknown account','userRole'=>$row['role']??'Not recorded','userAvatar'=>$row['avatar']??'',
            'actorId'=>'','actorName'=>'','ip'=>$row['ip_address']??'','device'=>$browser.' / '.$platform];
    }
    authLogReply(['success'=>true,'records'=>$records]);
} catch (JsonException $error) { authLogReply(['success'=>false,'error'=>'Invalid request.'],400); }
catch (Throwable $error) { error_log('SIGMA authentication history: '.$error->getMessage()); authLogReply(['success'=>false,'error'=>'Authentication history is unavailable.'],503); }
