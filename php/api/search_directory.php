<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
require_once __DIR__.'/../includes/service_vault_auth.php';
require_once __DIR__.'/../includes/application_auth.php';
restrictServiceOrigin();
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, OPTIONS');
if (($_SERVER['REQUEST_METHOD']??'')==='OPTIONS') exit;
if (($_SERVER['REQUEST_METHOD']??'')!=='GET') { http_response_code(405); echo json_encode(['success'=>false,'error'=>'Unsupported method.']); exit; }
require_once dirname(__DIR__,2).'/config/database.php';
try {
    $actor=sigmaRequireApplicationActor($pdo);
    $role=preg_replace('/[\s_-]+/','',strtolower($actor['role']??''));
    $admin=in_array($role,['admin','administrator','masteradmin'],true);
    // Preserve the portal's established directory rules. No contact information,
    // authentication settings, permissions, or deleted/inactive accounts are sent.
    $sql="SELECT id,first_name,middle_name,last_name,full_name,role,avatar,grade_level,grade_section,department FROM users WHERE is_deleted=0 AND LOWER(status)='active' AND id<>?";
    if (!$admin) $sql.=" AND LOWER(role) IN ('student','learner','teacher','faculty','instructor')";
    $query=$pdo->prepare($sql.' ORDER BY last_name,first_name,id');
    $query->execute([(string)$actor['id']]);
    $records=[];
    foreach ($query->fetchAll(PDO::FETCH_ASSOC) as $row) $records[]=[
        'id'=>(string)$row['id'],'uid'=>(string)$row['id'],'firstName'=>$row['first_name'],
        'middleName'=>$row['middle_name'],'lastName'=>$row['last_name'],'fullName'=>$row['full_name'],
        'role'=>$row['role'],'avatar'=>$row['avatar'],'gradeLevel'=>$row['grade_level'],
        'section'=>$row['grade_section'],'department'=>$row['department']
    ];
    echo json_encode(['success'=>true,'ownerId'=>(string)$actor['id'],'records'=>$records]);
} catch (Throwable $error) {
    error_log('SIGMA search directory: '.$error->getMessage());
    http_response_code(503); echo json_encode(['success'=>false,'error'=>'Search could not refresh. Please try again.']);
}
