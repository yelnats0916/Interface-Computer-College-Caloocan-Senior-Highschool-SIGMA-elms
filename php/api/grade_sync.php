<?php
// Authenticated publication store. Browser caches are never an authorization source.
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
require_once __DIR__ . '/../includes/service_vault_auth.php';
require_once __DIR__ . '/../includes/data_provenance.php';
require_once __DIR__ . '/../includes/application_auth.php';
restrictServiceOrigin();
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') exit;
require_once dirname(__DIR__, 2) . '/config/database.php';
function gradeReply(array $data, int $status = 200): void {
    http_response_code($status); echo json_encode($data, JSON_UNESCAPED_UNICODE); exit;
}
function gradeNorm($value): string { return mb_strtolower(trim(preg_replace('/\s+/u', ' ', (string)$value))); }
function gradeList($value): array { if (is_array($value)) return $value; return json_decode($value ?: '[]', true) ?: []; }
function gradeNames(array $user): array {
    return array_filter([$user['id'] ?? '', $user['email'] ?? '', $user['full_name'] ?? '', trim(($user['first_name'] ?? '') . ' ' . ($user['middle_name'] ?? '') . ' ' . ($user['last_name'] ?? '')), trim(($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? ''))]);
}
function gradeMatches($value, array $user): bool {
    $values = is_array($value) ? array_intersect_key($value, array_flip(['id','uid','teacherId','adviserId','name','fullName','email'])) : [$value];
    return (bool)array_intersect(array_map('gradeNorm', $values), array_map('gradeNorm', gradeNames($user)));
}
function gradeAdviser(array $section, array $user): bool {
    return gradeMatches($section['adviser_id'] ?? '', $user) || gradeMatches($section['adviser'] ?? '', $user);
}
function gradeTeacher(array $section, array $user, string $subject = ''): bool {
    if (gradeMatches($section['teacher'] ?? '', $user) && (!$subject || gradeNorm($section['subject'] ?? '')===gradeNorm($subject))) return true;
    foreach (gradeList($section['teachers'] ?? '') as $teacher) {
        $assigned=is_array($teacher)?($teacher['subject'] ?? $teacher['assignedSubject'] ?? ''):'';
        if (gradeMatches($teacher, $user) && (!$assigned || !$subject || gradeNorm($assigned)===gradeNorm($subject))) return true;
    }
    return false;
}
function gradeStudent(array $section, array $user): bool {
    if (gradeNorm($user['grade_section'] ?? '') === gradeNorm($section['name'])) return true;
    foreach (gradeList($section['students'] ?? '') as $student) if (gradeMatches($student, $user)) return true;
    return false;
}
try {
    if (!in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1','::1'], true) && !serviceRequestIsSecure()) gradeReply(['success'=>false,'error'=>'HTTPS is required for live grade access.'],403);
    if (!$pdo) gradeReply(['success'=>false,'error'=>'The grade database is unavailable. No grades were saved.'],503);
    $pdo->exec("CREATE TABLE IF NOT EXISTS grade_sync_tokens (token_hash CHAR(64) PRIMARY KEY,user_id VARCHAR(50) NOT NULL,expires_at DATETIME NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $pdo->exec("CREATE TABLE IF NOT EXISTS grade_sync_attempts (client_hash CHAR(64) PRIMARY KEY,attempts INT NOT NULL DEFAULT 0,blocked_until DATETIME NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    $pdo->exec("CREATE TABLE IF NOT EXISTS grade_publications (record_key CHAR(64) NOT NULL,kind VARCHAR(12) NOT NULL,scope_json TEXT NOT NULL,payload LONGTEXT NOT NULL,revision INT NOT NULL DEFAULT 1,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,PRIMARY KEY(record_key,kind)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
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
            $count=($attempt && empty($attempt['blocked_until']))?(int)$attempt['attempts']+1:1;
            $pdo->prepare('INSERT INTO grade_sync_attempts VALUES(?,?,?) ON DUPLICATE KEY UPDATE attempts=VALUES(attempts),blocked_until=VALUES(blocked_until)')->execute([$client,$count,$count>=5?gmdate('Y-m-d H:i:s',time()+300):null]);
            gradeReply(['success'=>false,'error'=>'Database sign-in failed. Check that this account is synced and the credentials are correct.'],401);
        }
        if (empty($user['totp_enabled'])) gradeReply(['success'=>false,'code'=>'two_factor_setup_required','error'=>'Complete database authenticator setup before signing in.'],403);
        if (empty($user['terms_accepted'])) gradeReply(['success'=>false,'code'=>'terms_required','error'=>'Accept the terms agreement before entering the portal.'],403);
        if (password_get_info($user['password'])['algo'] === null || password_needs_rehash($user['password'], PASSWORD_DEFAULT)) {
            $pdo->prepare('UPDATE users SET password=? WHERE id=?')->execute([password_hash($password, PASSWORD_DEFAULT), $user['id']]);
        }
        $pdo->prepare('DELETE FROM application_login_challenges WHERE user_id=?')->execute([$user['id']]);
        $pdo->prepare('DELETE FROM grade_sync_attempts WHERE client_hash=?')->execute([$client]);
        $token=bin2hex(random_bytes(32));
        $pdo->prepare('DELETE FROM grade_sync_tokens WHERE expires_at<UTC_TIMESTAMP()')->execute();
        $pdo->prepare('INSERT INTO grade_sync_tokens VALUES(?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 12 HOUR))')->execute([hash('sha256',$token),$user['id']]);
        gradeReply(['success'=>true,'token'=>$token,'userId'=>$user['id']]);
    }
    $token=sigmaApplicationToken();
    $stmt=$pdo->prepare('SELECT u.* FROM grade_sync_tokens t JOIN users u ON u.id=t.user_id WHERE t.token_hash=? AND t.expires_at>UTC_TIMESTAMP() AND u.is_deleted=0 AND LOWER(u.status)=\'active\' AND u.totp_enabled=1 AND u.terms_accepted=1');$stmt->execute([hash('sha256',$token)]);$actor=$stmt->fetch();
    if (!$token || !$actor) gradeReply(['success'=>false,'error'=>'Sign in again to connect live grade updates.'],401);
    $role=strtolower(preg_replace('/[\s_-]+/','',$actor['role']));$admin=in_array($role,['admin','masteradmin','administrator'],true);
    require_once __DIR__ . '/../includes/role_permissions.php';
    if (($role==='student' && !sigmaActorPermission($actor,'studentGrades')) || ($role==='teacher' && !sigmaActorPermission($actor,'teacherGrades'))) gradeReply(['success'=>false,'error'=>'Grade access is disabled for this account.'],403);
    $sections=$pdo->query("SELECT * FROM sections WHERE is_deleted=0 AND LOWER(status)<>'archived'")->fetchAll();
    $subjects=$pdo->query('SELECT id,code,name FROM subjects WHERE is_deleted=0')->fetchAll();
    $sectionFor=function(array $scope)use($sections,$subjects):?array {
        foreach($sections as $section){
            if(gradeNorm($section['name'])!==gradeNorm($scope[1]??'') || gradeNorm($section['school_year'])!==gradeNorm($scope[0]??''))continue;
            $assigned=gradeList($section['subjects']??'');$assigned[]=$section['subject']??'';
            foreach($assigned as $subject){
                $aliases=is_array($subject)?array_values(array_intersect_key($subject,array_flip(['id','subjectId','name','title','subject']))):[$subject];
                foreach($subjects as $record)if(array_intersect(array_map('gradeNorm',$aliases),array_map('gradeNorm',array_values($record))))$aliases=array_merge($aliases,array_values($record));
                if(in_array(gradeNorm($scope[2]??''),array_map('gradeNorm',$aliases),true))return $section;
            }
        }return null;
    };
    if($method==='GET'){
        $shared=[];$published=[];
        foreach($pdo->query('SELECT * FROM grade_publications')->fetchAll() as $record){
            $scope=json_decode($record['scope_json'],true);$section=$sectionFor($scope);if(!$section)continue;
            $staff=$admin || ($role==='teacher' && (gradeAdviser($section,$actor)||gradeTeacher($section,$actor,$scope[2])));
            $payload=json_decode($record['payload'],true);
            if(!$staff){
                if($role!=='student'||$record['kind']!=='published'||!gradeStudent($section,$actor))continue;
                $payload['rows']=array_values(array_filter($payload['rows'],fn($row)=>in_array((string)$actor['id'],array_map('strval',array_merge([$row['id']],$row['studentIds']??[])),true)));
                if(!$payload['rows'])continue;
            }
            $key=json_encode($scope,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
            if($record['kind']==='shared')$shared[$key]=$payload;else $published[$key]=$payload;
        }
        gradeReply(['success'=>true,'userId'=>$actor['id'],'shared'=>(object)$shared,'published'=>(object)$published]);
    }
    $scope=$input['scope']??[];
    if(count($scope)!==4 || !is_int($scope[3]) || $scope[3]<1 || $scope[3]>4)throw new InvalidArgumentException('Invalid grade scope.');
    $section=$sectionFor($scope);if(!$section)throw new RuntimeException('The subject and section must be synced to the database before publishing.');
    $action=$input['action']??'';
    if(!in_array($action,['share','publish'],true))throw new InvalidArgumentException('Invalid grade action.');
    if($action==='share' && !($admin || ($role==='teacher' && gradeTeacher($section,$actor,$scope[2]))))gradeReply(['success'=>false,'error'=>'Only the assigned subject teacher can share these grades.'],403);
    if($action==='publish' && !($admin || ($role==='teacher' && gradeAdviser($section,$actor))))gradeReply(['success'=>false,'error'=>'Only an administrator or the assigned adviser can publish these grades.'],403);
    $scopeJson=json_encode($scope,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);$key=hash('sha256',$scopeJson);
    $pdo->beginTransaction();
    if($action==='publish'){
        $stmt=$pdo->prepare("SELECT payload FROM grade_publications WHERE record_key=? AND kind='shared' FOR UPDATE");$stmt->execute([$key]);$shared=json_decode($stmt->fetchColumn()?:'null',true);
        if(!$shared || ($input['submittedAt']??'')!==($shared['submittedAt']??''))throw new RuntimeException('Shared grades changed. Refresh and review the latest grades before publishing.');
        $rows=$shared['rows'];
    }else $rows=$input['rows']??[];
    if(!is_array($rows)||!$rows||count($rows)>500)throw new InvalidArgumentException('No valid student grades were provided.');
    $stmt=$pdo->query("SELECT * FROM users WHERE is_deleted=0 AND LOWER(status)='active' AND LOWER(role)='student'");$students=$stmt->fetchAll();$clean=[];$seen=[];
    foreach($rows as $row){
        $student=null;foreach($students as $candidate)if((string)$candidate['id']===(string)($row['id']??'')){$student=$candidate;break;}
        if(!$student||!gradeStudent($section,$student))throw new RuntimeException('A student is no longer assigned to this section. Refresh the roster before continuing.');
        if(isset($seen[$student['id']])||!is_numeric($row['grade']??null)||$row['grade']<0||$row['grade']>100)throw new InvalidArgumentException('Each student must have one valid grade from 0 to 100.');
        $seen[$student['id']]=true;$clean[]=['id'=>$student['id'],'studentIds'=>[$student['id']],'name'=>$student['full_name']?:trim($student['first_name'].' '.$student['last_name']),'grade'=>(float)$row['grade']];
    }
    $date=gmdate('Y-m-d\TH:i:s\Z');$kind=$action==='share'?'shared':'published';
    $payload=$action==='share'?['rows'=>$clean,'submittedAt'=>$date,'submittedBy'=>$actor['id'],'teacherName'=>$actor['full_name']]:['rows'=>$clean,'publishedAt'=>$date,'publishedBy'=>$actor['id'],'publisherName'=>$actor['full_name'],'publisherRole'=>$admin?'admin':'teacher'];
    if($action==='share'){
        $reviewerId=$section['adviser_id']??'';
        if(!$reviewerId){foreach($pdo->query("SELECT * FROM users WHERE is_deleted=0 AND LOWER(role)='teacher'")->fetchAll() as $reviewer)if(gradeAdviser($section,$reviewer)){$reviewerId=$reviewer['id'];break;}}
        $payload['adviserId']=$reviewerId;
        $check=$pdo->prepare("SELECT payload FROM grade_publications WHERE record_key=? AND kind='published'");$check->execute([$key]);$old=json_decode($check->fetchColumn()?:'null',true);
        $payload['revised']=$old && array_column($old['rows'],'grade','id')!=array_column($clean,'grade','id');
    }
    $pdo->prepare('INSERT INTO grade_publications(record_key,kind,scope_json,payload) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE payload=VALUES(payload),revision=revision+1')->execute([$key,$kind,$scopeJson,json_encode($payload,JSON_UNESCAPED_UNICODE)]);
    $pdo->commit();gradeReply(['success'=>true,'record'=>$payload]);
}catch(Throwable $error){if(isset($pdo)&&$pdo&&$pdo->inTransaction())$pdo->rollBack();$known=$error instanceof RuntimeException || $error instanceof InvalidArgumentException;gradeReply(['success'=>false,'error'=>$known&&!($error instanceof PDOException)?$error->getMessage():'Unable to sync grades. Please try again.'],400);}
