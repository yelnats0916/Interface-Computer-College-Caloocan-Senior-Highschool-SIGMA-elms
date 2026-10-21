<?php
/** Explicit CLI provisioning for the user-requested, clearly labelled fictional roster. */
if (PHP_SAPI !== 'cli') { http_response_code(403); exit; }
$options=getopt('', ['web:','bundle:','output:']);
$web=realpath($options['web'] ?? ''); $bundle=realpath($options['bundle'] ?? ''); $output=$options['output'] ?? '';
if (!$web || strpos($web,'/home/sigma-elms/sigma-releases/')!==0 || !$bundle || strpos($bundle,'/home/sigma-elms/sigma-private/')!==0 || strpos($output,'/home/sigma-elms/sigma-private/')!==0) throw new RuntimeException('Unexpected provisioning path.');
require $web.'/config/database.php';
require $web.'/php/includes/role_permissions.php';
require $web.'/php/includes/user_id_sequence.php';
if (!$pdo || $pdo->query('SELECT DATABASE()')->fetchColumn()!=='sigma-elms_db') throw new RuntimeException('Unexpected database.');
$input=json_decode(file_get_contents($bundle),true,512,JSON_THROW_ON_ERROR);
if (($input['batch'] ?? '')!=='fictional-roster-20261022' || count($input['users'] ?? [])!==135) throw new RuntimeException('Unexpected roster bundle.');
$expected=['Student'=>120,'Teacher'=>12,'Admin'=>2,'Master Admin'=>1]; $counts=[];
foreach($input['users'] as $user) {
    $counts[$user['role']]=($counts[$user['role']] ?? 0)+1;
    if (!str_ends_with($user['email'],'@sigma-demo.invalid') || !str_ends_with($user['fullName'],'[Fictional]') || strlen($user['password'])<18) throw new RuntimeException('Fictional roster validation failed.');
    if (!preg_match('/^(student-[0-9]{2}|teacher-[0-9]{2}|admin-[0-9]{2}|master-admin-01)\.webp$/D',$user['photoFile']) || !is_file($web.'/image/generated-profiles/'.$user['photoFile'])) throw new RuntimeException('A profile image is not deployed yet.');
}
if ($counts!==$expected) throw new RuntimeException('Unexpected role totals.');
if (is_file($output)) { echo json_encode(['alreadyProvisioned'=>true,'accounts'=>135]); exit; }
$owner=$pdo->query("SELECT id,role FROM users WHERE id='0000000' AND is_deleted=0")->fetch(PDO::FETCH_ASSOC);
if (!$owner || preg_replace('/[\s_-]+/','',strtolower($owner['role']))!=='masteradmin') throw new RuntimeException('Existing owner account was not found.');
$created=[];
try {
    $pdo->beginTransaction();
    $duplicate=$pdo->prepare('SELECT id FROM users WHERE email=?');
    $insert=$pdo->prepare('INSERT INTO users(id,first_name,middle_name,last_name,full_name,email,password,role,status,gender,branch,avatar,permissions,totp_enabled,terms_accepted,is_deleted) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,0,0,0)');
    $photo=$pdo->prepare('INSERT INTO user_profile_photos(photo_id,user_id,photo_url) VALUES(?,?,?)');
    $audit=$pdo->prepare('INSERT INTO audit_logs(user_id,action) VALUES(?,?)');
    foreach($input['users'] as $user) {
        $duplicate->execute([$user['email']]); if ($duplicate->fetchColumn()!==false) throw new RuntimeException('A batch email already exists. No accounts were overwritten.');
        $id=sigmaNextUserId($pdo,sigmaUserIdPrefix($user['role'],'01'),true);
        $url='https://sigma-elms.alwaysdata.net/image/generated-profiles/'.$user['photoFile'];
        $permissions=sigmaRolePermissionDefaults($user['role']);
        $insert->execute([$id,$user['firstName'],$user['middleName'],$user['lastName'],$user['fullName'],$user['email'],password_hash($user['password'],PASSWORD_DEFAULT),$user['role'],'Active',$user['gender'],$user['branch'],$url,json_encode($permissions)]);
        $photo->execute([hash('sha256',$id.'|'.$url),$id,$url]);
        $audit->execute(['0000000','Created explicitly requested fictional '.$user['role'].' account '.$id.' (roster 20261022)']);
        $created[]=['id'=>$id,'name'=>$user['fullName'],'role'=>$user['role'],'email'=>$user['email'],'initialPassword'=>$user['password'],'photo'=>$url];
    }
    $report=['batch'=>$input['batch'],'createdAt'=>gmdate('c'),'accounts'=>$created,'note'=>'Fictional demonstration accounts. Emails are intentionally non-deliverable. Each account must complete normal authenticator setup and accept terms at first sign-in.'];
    $temporary=$output.'.pending';
    if (file_put_contents($temporary,json_encode($report,JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES),LOCK_EX)===false) throw new RuntimeException('Could not save private credentials.');
    chmod($temporary,0600);
    $pdo->commit();
    rename($temporary,$output);
    $csv=fopen(dirname($output).'/roster-credentials.csv','w');
    fputcsv($csv,['Login ID','Name','Role','Email','Initial password']);
    foreach($created as $row) fputcsv($csv,[$row['id'],$row['name'],$row['role'],$row['email'],$row['initialPassword']]);
    fclose($csv);chmod(dirname($output).'/roster-credentials.csv',0600);
    echo json_encode(['created'=>count($created),'roles'=>$counts,'existingOwnerUnchanged'=>true,'subjectsCreated'=>0,'sectionsCreated'=>0]);
} catch(Throwable $error) {
    if($pdo->inTransaction())$pdo->rollBack();
    // Diagnostics deliberately exclude the bundle and credentials.
    file_put_contents(dirname($output).'/roster-error.log',$error->getMessage());chmod(dirname($output).'/roster-error.log',0600);
    fwrite(STDERR,'Roster creation stopped; private diagnostic retained. No credentials printed.');exit(1);
}
