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
function activityLogReply(array $data, int $status=200): void { http_response_code($status); echo json_encode($data,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES); exit; }
try {
    $actor=sigmaRequireApplicationActor($pdo,['admin','masteradmin']);
    if (!sigmaActorPermission($actor,'auditMain') || !sigmaActorPermission($actor,'auditActivity')) activityLogReply(['success'=>false,'error'=>'Activity log access is not enabled for this account.'],403);
    if ($_SERVER['REQUEST_METHOD']==='POST') {
        $input=json_decode(file_get_contents('php://input',false,null,0,4097),true,16,JSON_THROW_ON_ERROR);
        if (($input['action']??'')!=='delete' || !preg_match('/^server-activity-([0-9]+)$/D',(string)($input['id']??''),$match)) activityLogReply(['success'=>false,'error'=>'Invalid activity log action.'],400);
        $pdo->prepare("UPDATE audit_logs SET is_deleted=1,deleted_at=UTC_TIMESTAMP(),deleted_by=? WHERE id=? AND action NOT LIKE 'AUTH:%' AND is_deleted=0")->execute([$actor['id'],$match[1]]);
        activityLogReply(['success'=>true]);
    }
    if ($_SERVER['REQUEST_METHOD']!=='GET') activityLogReply(['success'=>false,'error'=>'Unsupported method.'],405);
    $query=$pdo->query("SELECT a.*,u.full_name,u.role,u.avatar FROM audit_logs a LEFT JOIN users u ON BINARY u.id=BINARY a.user_id WHERE a.is_deleted=0 AND a.action NOT LIKE 'AUTH:%' ORDER BY a.created_at DESC,a.id DESC");
    $records=[];
    while($row=$query->fetch(PDO::FETCH_ASSOC)) {
        $event=str_starts_with($row['action'],'ACT:') ? json_decode(substr($row['action'],4),true) : null;
        $activity=$event['activity'] ?? $row['action'];
        $activity=preg_replace('/^Created explicitly requested fictional (.*?) account (.*?) \(roster [0-9]+\)$/','Created $1 account $2',$activity);
        $module=$event['module'] ?? (stripos($activity,'account')!==false||stripos($activity,'profile')!==false ? 'Users' : 'System');
        $records[]=['id'=>'server-activity-'.$row['id'],'source'=>'server','timestamp'=>str_replace(' ','T',$row['created_at']).'Z',
            'activity'=>$activity,'module'=>$module,'details'=>$event['details']??'',
            'userId'=>$row['user_id']??'','userName'=>$row['full_name']??'Unknown account','userRole'=>$row['role']??'Not recorded','userAvatar'=>$row['avatar']??''];
    }
    require_once __DIR__.'/../includes/record_lifecycle.php';
    foreach(lifecycleEvents($pdo) as $event) {
        $records[]=['id'=>'server-lifecycle-'.$event['id'],'source'=>'server','timestamp'=>str_replace(' ','T',$event['timestamp']).'Z',
            'activity'=>['remove'=>'Record Deleted','restore'=>'Record Restored','purge'=>'Record Permanently Deleted'][$event['action']]??$event['action'],
            'module'=>['users'=>'Users','sections'=>'Classes','subjects'=>'Curriculum','school_years'=>'System','quizzes'=>'Assessments'][$event['recordType']]??'System',
            'details'=>$event['recordType'].' · '.$event['recordId'], 'userId'=>$event['actor']['id'],'userName'=>$event['actor']['name'],
            'userRole'=>$event['actor']['role'],'userAvatar'=>$event['actor']['avatar']];
    }
    usort($records,fn($a,$b)=>strcmp($b['timestamp'],$a['timestamp']));
    activityLogReply(['success'=>true,'records'=>$records]);
} catch (JsonException $error) { activityLogReply(['success'=>false,'error'=>'Invalid request.'],400); }
catch (Throwable $error) { error_log('SIGMA activity history: '.$error->getMessage()); activityLogReply(['success'=>false,'error'=>'Activity history is unavailable.'],503); }
