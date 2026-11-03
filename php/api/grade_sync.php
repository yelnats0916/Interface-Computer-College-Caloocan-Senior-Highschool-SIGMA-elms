<?php
// Authenticated publication store. Browser caches are never an authorization source.
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
require_once __DIR__ . '/../includes/service_vault_auth.php';
require_once __DIR__ . '/../includes/data_provenance.php';
require_once __DIR__ . '/../includes/application_auth.php';
require_once __DIR__ . '/../includes/authentication_audit.php';
restrictServiceOrigin();
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') exit;
require_once dirname(__DIR__, 2) . '/config/database.php';
function gradeReply(array $data, int $status = 200): void {
    http_response_code($status); echo json_encode($data, JSON_UNESCAPED_UNICODE); exit;
}
try {
    if (!in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1','::1'], true) && !serviceRequestIsSecure()) gradeReply(['success'=>false,'error'=>'HTTPS is required for live grade access.'],403);
    if (!$pdo) gradeReply(['success'=>false,'error'=>'The grade database is unavailable. No grades were saved.'],503);
    $pdo->exec("CREATE TABLE IF NOT EXISTS grade_sync_tokens (token_hash CHAR(64) PRIMARY KEY,user_id VARCHAR(50) NOT NULL,expires_at DATETIME NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $pdo->exec("CREATE TABLE IF NOT EXISTS grade_sync_attempts (client_hash CHAR(64) PRIMARY KEY,attempts INT NOT NULL DEFAULT 0,blocked_until DATETIME NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $method = $_SERVER['REQUEST_METHOD'] ?? '';
    if (!in_array($method,['GET','POST'],true)) gradeReply(['success'=>false,'error'=>'Unsupported method.'],405);
    $raw = $method === 'POST' ? file_get_contents('php://input', false, null, 0, 262145) : '';
    if (strlen($raw)>262144) gradeReply(['success'=>false,'error'=>'Grade submission is too large.'],413);
    $input = $method === 'POST' ? json_decode($raw,true,64,JSON_THROW_ON_ERROR) : $_GET;
    if ($method === 'POST') sigmaRequireRealRecords($input);
    if (($input['action'] ?? '') === 'login' && $method === 'POST') {
        $client = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . ':' . strtolower((string)($input['login'] ?? '')));
        $stmt=$pdo->prepare('SELECT * FROM grade_sync_attempts WHERE client_hash=?');$stmt->execute([$client]);$attempt=$stmt->fetch();
        if ($attempt && !empty($attempt['blocked_until']) && strtotime($attempt['blocked_until'].' UTC')>time()) gradeReply(['success'=>false,'error'=>'Please wait five minutes before signing in again.'],429);
        $stmt=$pdo->prepare('SELECT * FROM users WHERE (id=? OR email=?) AND is_deleted=0 LIMIT 1');$stmt->execute([$input['login'] ?? '',$input['login'] ?? '']);$user=$stmt->fetch();
        $password=(string)($input['password'] ?? '');
        $valid=$user && strtolower($user['status'])==='active' && $password!=='' && (password_verify($password,$user['password']) || (password_get_info($user['password'])['algo']===null && hash_equals($user['password'],$password)));
        if ($valid && !empty($user['totp_enabled'])) {
            require_once __DIR__ . '/../includes/totp_service.php';
            $valid=TotpService::verifyCode($user['totp_secret'],(string)($input['otp'] ?? ''));
        }
        if (!$valid) {
            sigmaRecordAuthentication($pdo, $user['id'] ?? null, 'Failed login attempt', 'failed');
            $count=($attempt && empty($attempt['blocked_until']))?(int)$attempt['attempts']+1:1;
            $pdo->prepare('INSERT INTO grade_sync_attempts VALUES(?,?,?) ON DUPLICATE KEY UPDATE attempts=VALUES(attempts),blocked_until=VALUES(blocked_until)')->execute([$client,$count,$count>=5?gmdate('Y-m-d H:i:s',time()+300):null]);
            gradeReply(['success'=>false,'error'=>'Sign-in failed. Check your account ID, Gmail, and password.'],401);
        }
        if (empty($user['totp_enabled'])) gradeReply(['success'=>false,'code'=>'two_factor_setup_required','error'=>'Complete authenticator setup before signing in.'],403);
        if (empty($user['terms_accepted'])) gradeReply(['success'=>false,'code'=>'terms_required','error'=>'Accept the terms agreement before entering the portal.'],403);
        if (password_get_info($user['password'])['algo'] === null || password_needs_rehash($user['password'], PASSWORD_DEFAULT)) {
            $pdo->prepare('UPDATE users SET password=? WHERE id=?')->execute([password_hash($password, PASSWORD_DEFAULT), $user['id']]);
        }
        $pdo->prepare('DELETE FROM application_login_challenges WHERE user_id=?')->execute([$user['id']]);
        $pdo->prepare('DELETE FROM grade_sync_attempts WHERE client_hash=?')->execute([$client]);
        $loginTransaction=sigmaBeginAllowedLogin($pdo,$user);
        $token=bin2hex(random_bytes(32));
        $pdo->prepare('DELETE FROM grade_sync_tokens WHERE expires_at<UTC_TIMESTAMP()')->execute();
        $pdo->prepare('INSERT INTO grade_sync_tokens VALUES(?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 12 HOUR))')->execute([hash('sha256',$token),$user['id']]);
        if($loginTransaction)$pdo->commit();
        sigmaRecordAuthentication($pdo, $user['id'], 'Login successful');
        gradeReply(['success'=>true,'token'=>$token,'userId'=>$user['id']]);
    }
    $token=sigmaApplicationToken();
    $stmt=$pdo->prepare('SELECT u.* FROM grade_sync_tokens t JOIN users u ON u.id=t.user_id WHERE t.token_hash=? AND t.expires_at>UTC_TIMESTAMP() AND u.is_deleted=0 AND LOWER(u.status)=\'active\' AND u.totp_enabled=1 AND u.terms_accepted=1');$stmt->execute([hash('sha256',$token)]);$actor=$stmt->fetch();
    if (!$token || !$actor) gradeReply(['success'=>false,'error'=>'Sign in again to connect live grade updates.'],401);
    if(sigmaMaintenanceRestricted($actor))gradeReply(['success'=>false,'code'=>'system_maintenance','error'=>sigmaMaintenanceState(sigmaMaintenanceConfig())['message']],423);
    $role=strtolower(preg_replace('/[\s_-]+/','',$actor['role']));$admin=in_array($role,['admin','masteradmin','administrator'],true);
    require_once __DIR__ . '/../includes/role_permissions.php';
    if (($role==='student' && !sigmaActorPermission($actor,'studentGrades')) || ($role==='teacher' && !sigmaActorPermission($actor,'teacherGrades'))) gradeReply(['success'=>false,'error'=>'Grade access is disabled for this account.'],403);
    // Grade features load only after authentication; portal login must not depend on them.
    require_once __DIR__ . '/../includes/grade_workflow_notifications.php';
    require_once __DIR__ . '/../includes/grade_drafts.php';
    require_once __DIR__ . '/../includes/grade_publication_review.php';
    $pdo->exec("CREATE TABLE IF NOT EXISTS grade_publications (record_key CHAR(64) NOT NULL,kind VARCHAR(12) NOT NULL,scope_json TEXT NOT NULL,payload LONGTEXT NOT NULL,revision INT NOT NULL DEFAULT 1,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,PRIMARY KEY(record_key,kind)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    sigmaEnsureGradeDraftSchema($pdo);
    $sections=$pdo->query("SELECT * FROM sections WHERE is_deleted=0 AND LOWER(status)<>'archived'")->fetchAll();
    $subjects=$pdo->query('SELECT id,code,name,curriculum_metadata FROM subjects WHERE is_deleted=0')->fetchAll();
    $sectionFor=function(array $scope,$sectionId=null)use($sections,$subjects,$actor,$role,$admin):?array {
        if(is_scalar($sectionId)&&trim((string)$sectionId)!==''){
            $matches=array_values(array_filter($sections,fn($section)=>
                (string)($section['id']??'')===(string)$sectionId
                && gradeScopeYearMatches($scope[0]??'',$section['school_year']??'')
                && gradeScopeSubjectMatches($section,$scope[2]??'',$subjects)
            ));
            if(count($matches)===1)return $matches[0];
        }
        foreach($sections as $section)if(gradeScopeMatchesSection($section,$scope,$subjects))return $section;
        // Older gradebooks may persist a display alias for the class name.
        // Resolve it only when year + canonical subject + the signed-in
        // teacher/student assignment identify exactly one section.
        $candidates=[];
        foreach($sections as $section){
            if(!gradeScopeYearMatches($scope[0]??'',$section['school_year']??'')
                || !gradeScopeSubjectMatches($section,$scope[2]??'',$subjects))continue;
            $assigned=$admin
                || ($role==='teacher'&&gradeTeacher($section,$actor,(string)($scope[2]??''),$subjects))
                || ($role==='student'&&gradeStudent($section,$actor));
            if($assigned)$candidates[]=$section;
        }
        return count($candidates)===1?$candidates[0]:null;
    };
    if($method==='GET'){
        $shared=[];$published=[];
        foreach($pdo->query('SELECT * FROM grade_publications')->fetchAll() as $record){
            $scope=json_decode($record['scope_json'],true);$payload=json_decode($record['payload'],true);
            $section=$sectionFor($scope,$payload['sectionId']??null);if(!$section)continue;
            $staff=$admin || ($role==='teacher' && (gradeClassAdviser($sections,$section,$actor)||gradeTeacher($section,$actor,(string)($scope[2]??''),$subjects)));
            if(!$staff){
                if($role!=='student'||$record['kind']!=='published'||!gradeStudent($section,$actor))continue;
                $payload['rows']=array_values(array_filter($payload['rows'],fn($row)=>in_array((string)$actor['id'],array_map('strval',array_merge([$row['id']],$row['studentIds']??[])),true)));
                if(!$payload['rows'])continue;
            }
            $key=json_encode($scope,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
            if($record['kind']==='shared')$shared[$key]=$payload;else $published[$key]=$payload;
        }
        $drafts=[];
        if($admin||$role==='teacher')foreach(sigmaReadGradeDrafts($pdo,(string)$actor['id']) as $draftScope=>$draft){
            $scope=json_decode($draftScope,true);$section=$sectionFor($scope,$draft['sectionId']??null);
            if($section&&($admin||gradeTeacher($section,$actor,(string)($scope[2]??''),$subjects)))$drafts[$draftScope]=$draft;
        }
        gradeReply(['success'=>true,'userId'=>$actor['id'],'shared'=>(object)$shared,'published'=>(object)$published,'drafts'=>(object)$drafts]);
    }
    $scope=$input['scope']??[];
    if(count($scope)!==4 || !is_int($scope[3]) || $scope[3]<1 || $scope[3]>4)throw new InvalidArgumentException('Invalid grade scope.');
    $sectionId=$method==='POST'&&is_scalar($input['sectionId']??null)?trim((string)$input['sectionId']):'';
    $section=$sectionFor($scope,$sectionId);
    if(!$section){
        $yearMatches=array_values(array_filter($sections,fn($candidate)=>gradeScopeYearMatches($scope[0]??'',$candidate['school_year']??'')));
        $sectionMatches=array_values(array_filter($yearMatches,fn($candidate)=>gradeScopeSectionMatches($candidate,$scope[1]??'')));
        $subjectMatches=array_values(array_filter($yearMatches,fn($candidate)=>gradeScopeSubjectMatches($candidate,$scope[2]??'',$subjects)));
        $assignedMatches=array_values(array_filter($subjectMatches,fn($candidate)=>$admin||($role==='teacher'&&gradeTeacher($candidate,$actor,(string)($scope[2]??''),$subjects))||($role==='student'&&gradeStudent($candidate,$actor))));
        error_log('SIGMA unmatched grade scope: '.json_encode(['year'=>$scope[0]??null,'section'=>$scope[1]??null,'subject'=>$scope[2]??null,'yearMatches'=>count($yearMatches),'sectionMatches'=>count($sectionMatches),'subjectMatches'=>count($subjectMatches),'assignedMatches'=>count($assignedMatches)],JSON_UNESCAPED_UNICODE));
        throw new RuntimeException('The selected grade scope did not resolve to one assigned database section. Refresh the class list and retry. (Year matches: '.count($yearMatches).'; section matches: '.count($sectionMatches).'; subject matches: '.count($subjectMatches).'; assigned matches: '.count($assignedMatches).')');
    }
    $action=$input['action']??'';
    if($action==='draft'){
        $students=$pdo->query("SELECT * FROM users WHERE is_deleted=0 AND LOWER(status)='active' AND LOWER(role)='student'")->fetchAll(PDO::FETCH_ASSOC);
        $sectionResolvedById=$sectionId!==''&&(string)($section['id']??'')===$sectionId;
        $rows=sigmaGradeDraftRows($actor,$section,$scope,$input['rows']??[],$students,$subjects,$sectionResolvedById);
        $pdo->beginTransaction();
        sigmaRequireWritableAcademicSection($pdo,(string)$section['id']);
        $record=sigmaSaveGradeDraft($pdo,(string)$actor['id'],$scope,$rows,(string)($section['id']??''));
        require_once __DIR__.'/../includes/grade_insight_reports.php';
        $draftSubject=academicSubject($pdo,(string)$scope[2]);
        sigmaInvalidateGradeReports($pdo,(string)$draftSubject['id'],(string)$section['id']);
        sigmaRecordActivity($pdo,(string)$actor['id'],'Updated Grade Draft','Grades','Subject: '.$scope[2]."\nSection: ".$scope[1]."\nSchool year: ".$scope[0]."\nQuarter: ".$scope[3]);
        $pdo->commit();
        require_once __DIR__.'/../includes/grade_insight_jobs.php';
        sigmaStartGradeInsightJobs();
        gradeReply(['success'=>true,'record'=>$record]);
    }
    if(!in_array($action,['share','publish'],true))throw new InvalidArgumentException('Invalid grade action.');
    sigmaEnsureSectionNotificationSchema($pdo);
    if($action==='share' && !($admin || ($role==='teacher' && gradeTeacher($section,$actor,(string)$scope[2],$subjects))))gradeReply(['success'=>false,'error'=>'Only the assigned subject teacher can share these grades.'],403);
    if($action==='publish' && !($admin || ($role==='teacher' && gradeClassAdviser($sections,$section,$actor))))gradeReply(['success'=>false,'error'=>'Only an administrator or the assigned adviser can publish these grades.'],403);
    $scopeJson=json_encode($scope,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);$key=hash('sha256',$scopeJson);
    $pdo->beginTransaction();
    sigmaRequireWritableAcademicSection($pdo,(string)$section['id']);
    if($action==='publish'){
        $stmt=$pdo->prepare("SELECT payload FROM grade_publications WHERE record_key=? AND kind='shared' FOR UPDATE");$stmt->execute([$key]);$shared=json_decode($stmt->fetchColumn()?:'null',true);
        if(!$shared || ($input['submittedAt']??'')!==($shared['submittedAt']??''))throw new RuntimeException('Shared grades changed. Refresh and review the latest grades before publishing.');
        $rows=$shared['rows'];
        if (array_key_exists('rows', $input)) sigmaValidateReviewedGrades($rows, $input['rows']);
    }else $rows=$input['rows']??[];
    if(!is_array($rows)||!$rows||count($rows)>500)throw new InvalidArgumentException('No valid student grades were provided.');
    $stmt=$pdo->query("SELECT * FROM users WHERE is_deleted=0 AND LOWER(status)='active' AND LOWER(role)='student'");$students=$stmt->fetchAll();$clean=[];$seen=[];
    foreach($rows as $row){
        $student=null;foreach($students as $candidate)if((string)$candidate['id']===(string)($row['id']??'')){$student=$candidate;break;}
        if(!$student||!gradeStudent($section,$student))throw new RuntimeException('A student is no longer assigned to this section. Refresh the roster before continuing.');
        if(isset($seen[$student['id']])||!is_numeric($row['grade']??null)||$row['grade']<0||$row['grade']>100)throw new InvalidArgumentException('Each student must have one valid grade from 0 to 100.');
        $seen[$student['id']]=true;$clean[]=['creationNumber'=>sigmaTableCreationNumber($pdo,'users',(string)$student['id']),'id'=>$student['id'],'studentIds'=>[$student['id']],'name'=>$student['full_name']?:trim($student['first_name'].' '.$student['last_name']),'grade'=>(float)$row['grade']];
    }
    $date=gmdate('Y-m-d\TH:i:s\Z');$kind=$action==='share'?'shared':'published';
    $payload=$action==='share'?['rows'=>$clean,'submittedAt'=>$date,'submittedBy'=>$actor['id'],'teacherName'=>$actor['full_name'],'sectionId'=>(string)($section['id']??'')]:['rows'=>$clean,'publishedAt'=>$date,'publishedBy'=>$actor['id'],'publisherName'=>$actor['full_name'],'publisherRole'=>$admin?'admin':'teacher','sectionId'=>(string)($section['id']??'')];
    if($action==='share'){
        $draftScopeJson=json_encode($scope,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
        $draftRevisionQuery=$pdo->prepare('SELECT revision FROM grade_drafts WHERE owner_id=? AND scope_json=?');
        $draftRevisionQuery->execute([(string)$actor['id'],$draftScopeJson]);
        $payload['draftRevision']=(int)($draftRevisionQuery->fetchColumn()?:0);
        $reviewerId=$section['adviser_id']??'';
        if(!$reviewerId)foreach($sections as $candidate)if(gradeNorm($candidate['name'])===gradeNorm($section['name'])&&gradeNorm($candidate['school_year'])===gradeNorm($section['school_year'])&&!empty($candidate['adviser_id'])){$reviewerId=$candidate['adviser_id'];break;}
        if(!$reviewerId){foreach($pdo->query("SELECT * FROM users WHERE is_deleted=0 AND LOWER(role)='teacher'")->fetchAll() as $reviewer)if(gradeAdviser($section,$reviewer)){$reviewerId=$reviewer['id'];break;}}
        $payload['adviserId']=$reviewerId;
        $check=$pdo->prepare("SELECT payload FROM grade_publications WHERE record_key=? AND kind='published'");$check->execute([$key]);$old=json_decode($check->fetchColumn()?:'null',true);
        $payload['revised']=$old && array_column($old['rows'],'grade','id')!=array_column($clean,'grade','id');
    }
    $pdo->prepare('INSERT INTO grade_publications(record_key,kind,scope_json,payload) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE payload=VALUES(payload),revision=revision+1')->execute([$key,$kind,$scopeJson,json_encode($payload,JSON_UNESCAPED_UNICODE)]);
    $users=$pdo->query("SELECT * FROM users WHERE is_deleted=0 AND LOWER(status)='active'")->fetchAll(PDO::FETCH_ASSOC);
    $subject=academicSubject($pdo,(string)$scope[2]);
    require_once __DIR__.'/../includes/grade_insight_reports.php';
    sigmaInvalidateGradeReports($pdo,(string)$subject['id'],(string)$section['id']);
    $revision=$pdo->prepare('SELECT revision FROM grade_publications WHERE record_key=? AND kind=?');$revision->execute([$key,$kind]);
    sigmaPersistWorkflowNotices($pdo,sigmaGradeWorkflowNotices($actor,$subject,$section,$sections,$users,$action==='share'?'quarter-grades-shared':'quarter-grades-published',$key.':'.$kind.':'.$revision->fetchColumn(),['quarter'=>$scope[3],'studentIds'=>array_column($clean,'id')]));
    $pdo->commit();
    require_once __DIR__.'/../includes/grade_insight_jobs.php';
    sigmaStartGradeInsightJobs();
    gradeReply(['success'=>true,'record'=>$payload]);
} catch (Throwable $error) {
    if (isset($pdo) && $pdo && $pdo->inTransaction()) $pdo->rollBack();
    error_log('SIGMA grade sync error: ' . get_class($error) . ': ' . $error->getMessage() . ' at ' . $error->getFile() . ':' . $error->getLine());
    $loginFailure = ($input['action'] ?? '') === 'login';
    $known = ($error instanceof RuntimeException || $error instanceof InvalidArgumentException) && !($error instanceof PDOException);
    gradeReply(['success' => false, 'error' => $known ? $error->getMessage() : ($loginFailure ? 'Sign-in could not be completed. Please try again.' : 'Unable to sync grades. Please try again.')], $loginFailure && !$known ? 503 : 400);
}
