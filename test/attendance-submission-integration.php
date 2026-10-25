<?php
$root=$argv[1]??dirname(__DIR__);
require $root.'/config/database.php';
require $root.'/php/includes/attendance_records.php';
function check($ok,$label){if(!$ok)throw new RuntimeException($label);}
foreach([
 'users'=>"id VARCHAR(64) PRIMARY KEY,role VARCHAR(30),status VARCHAR(30),is_deleted INT DEFAULT 0,full_name VARCHAR(100),first_name VARCHAR(50),middle_name VARCHAR(50),last_name VARCHAR(50),email VARCHAR(100),grade_section VARCHAR(100)",
 'school_years'=>"id VARCHAR(64) PRIMARY KEY,year_start INT,year_end INT,is_deleted INT DEFAULT 0,q1_start VARCHAR(20),q1_end VARCHAR(20),q2_start VARCHAR(20),q2_end VARCHAR(20),q3_start VARCHAR(20),q3_end VARCHAR(20),q4_start VARCHAR(20),q4_end VARCHAR(20)",
 'subjects'=>"id VARCHAR(64) PRIMARY KEY,name VARCHAR(100),code VARCHAR(50),status VARCHAR(30),is_deleted INT DEFAULT 0,curriculum_metadata LONGTEXT",
 'sections'=>"id VARCHAR(64) PRIMARY KEY,name VARCHAR(100),subject VARCHAR(100),subjects LONGTEXT,teacher VARCHAR(100),teachers LONGTEXT,students LONGTEXT,school_year VARCHAR(30),status VARCHAR(30),is_deleted INT DEFAULT 0",
 'academic_records'=>"record_key VARCHAR(64) PRIMARY KEY,record_type VARCHAR(30),subject_id VARCHAR(64),section_id VARCHAR(64),student_id VARCHAR(64),item_id VARCHAR(64),payload LONGTEXT,actor_id VARCHAR(64)",
 'audit_logs'=>"id INT AUTO_INCREMENT PRIMARY KEY,user_id VARCHAR(64),action VARCHAR(255),ip_address VARCHAR(100),user_agent VARCHAR(255)",
 'audit_log_context'=>"audit_id INT,payload LONGTEXT"
] as $table=>$columns)$pdo->exec("CREATE TEMPORARY TABLE `$table` ($columns)");
$pdo->exec("INSERT INTO school_years VALUES('attcheck-year',2026,2027,0,'2026-06-16','2026-08-22','2026-08-26','2026-10-24','2026-11-03','2027-01-23','2027-01-26','2027-03-31')");
$teacher=['id'=>'attcheck-teacher','role'=>'Teacher','full_name'=>'Fixture Teacher'];
$s1=['id'=>'attcheck-one','role'=>'Student','full_name'=>'Student One'];$s2=['id'=>'attcheck-two','role'=>'Student','full_name'=>'Student Two'];
foreach([$teacher,$s1,$s2] as $u)$pdo->prepare("INSERT INTO users(id,role,status,full_name) VALUES(?,?,'Active',?)")->execute([$u['id'],$u['role'],$u['full_name']]);
$pdo->exec("INSERT INTO subjects(id,name,code,status) VALUES('attcheck-subject','Fixture Subject','FIX','Published')");
$pdo->prepare("INSERT INTO sections(id,name,subject,subjects,teacher,teachers,students,school_year,status) VALUES('attcheck-section','Fixture Section','Fixture Subject','[]','attcheck-teacher','[]',?,'2026-2027','Deployed')")->execute([json_encode([$s1,$s2])]);
$input=['subjectId'=>'attcheck-subject','section'=>'attcheck-section','date'=>academicDay(),'statuses'=>['attcheck-one'=>'P'],'submitted'=>false];
try{attendanceSubmit($pdo,$teacher,$input);throw new Exception('Draft accepted');}catch(InvalidArgumentException $e){}
check((int)$pdo->query('SELECT COUNT(*) FROM academic_records')->fetchColumn()===0,'Draft must not publish');
$input['submitted']=true;$pdo->beginTransaction();$saved=attendanceSubmit($pdo,$teacher,$input);$pdo->commit();
check($saved['record']['submitted']===true,'Server must confirm submission');
check($saved['record']['quarter']===2&&$saved['record']['schoolYear']==='2026-2027','Server persists academic period through quarter break');
$read=attendanceSnapshot($pdo,$s1);$days=$read['scopes'][0]['days'];check($days[academicDay()]['statuses']===['attcheck-one'=>'present'],'Student receives own submitted mark');
$other=attendanceSnapshot($pdo,$s2);check(empty($other['scopes'][0]['days'][academicDay()]['statuses']),'No classmate marks or implicit absence');
$pdo->exec("UPDATE academic_records SET payload=JSON_REMOVE(payload,'$.quarter','$.schoolYear','$.schoolYearId','$.semester')");
$admin=attendanceSnapshot($pdo,['id'=>'attcheck-admin','role'=>'Admin']);check($admin['scopes'][0]['days'][academicDay()]['submitted']===true,'Admin reports receive submitted record');check($admin['scopes'][0]['days'][academicDay()]['quarter']===2,'Legacy records resolve quarter for admin');
$input['statuses']=['attcheck-one'=>'L'];$pdo->beginTransaction();attendanceSubmit($pdo,$teacher,$input);$pdo->commit();
check((int)$pdo->query('SELECT COUNT(*) FROM academic_records')->fetchColumn()===1,'Resubmission updates the same date');
check(attendanceSnapshot($pdo,$s1)['scopes'][0]['days'][academicDay()]['statuses']['attcheck-one']==='late','Resubmitted edit reaches student');
try{attendanceSubmit($pdo,['id'=>'other-teacher','role'=>'Teacher'],$input);throw new Exception('Unauthorized teacher accepted');}catch(RuntimeException $e){check($e->getMessage()!=='Unauthorized teacher accepted','Assignment protection');}
try{attendanceSubmit($pdo,$s1,$input);throw new Exception('Student write accepted');}catch(RuntimeException $e){check($e->getMessage()!=='Student write accepted','Student write protection');}
// Workbook import must be atomic, roster-scoped, and preserve blank cells.
$batch=['subjectId'=>'attcheck-subject','section'=>'attcheck-section','days'=>[academicDay()=>['attcheck-one'=>'A','attcheck-two'=>'']]];
$pdo->beginTransaction();$preview=attendanceImport($pdo,$teacher,$batch);$pdo->commit();
check($preview['needsConfirmation']===true&&count($preview['conflicts'])===1,'Overwrite requires confirmation');
check(attendanceSnapshot($pdo,$s1)['scopes'][0]['days'][academicDay()]['statuses']['attcheck-one']==='late','Preview cannot write');
$batch+=['overwrite'=>true,'revision'=>$preview['revision']];
$input['statuses']=['attcheck-one'=>'P'];attendanceSubmit($pdo,$teacher,$input);
$pdo->beginTransaction();$stale=attendanceImport($pdo,$teacher,$batch);$pdo->commit();
check($stale['needsConfirmation']===true&&$stale['revision']!==$batch['revision'],'Concurrent edits require a new confirmation');
$batch['revision']=$stale['revision'];$pdo->beginTransaction();$done=attendanceImport($pdo,$teacher,$batch);$pdo->commit();
check($done['importedMarks']===1,'Only nonblank cells imported');
check(attendanceSnapshot($pdo,$s1)['scopes'][0]['days'][academicDay()]['statuses']['attcheck-one']==='absent','Imported mark published');
check(empty(attendanceSnapshot($pdo,$s2)['scopes'][0]['days'][academicDay()]['statuses']),'Blank cannot create absence');
$patch=['subjectId'=>'attcheck-subject','section'=>'attcheck-section','days'=>[academicDay()=>['attcheck-two'=>'L']]];
$pdo->beginTransaction();attendanceImport($pdo,['id'=>'attcheck-admin','role'=>'Admin'],$patch);$pdo->commit();
$all=attendanceSnapshot($pdo,$teacher)['scopes'][0]['days'][academicDay()]['statuses'];
check($all===['attcheck-one'=>'absent','attcheck-two'=>'late'],'Patch preserves existing other student marks and admin sync');
foreach([$s1,['id'=>'other-teacher','role'=>'Teacher']] as $forbidden){try{attendanceImport($pdo,$forbidden,$patch);throw new Exception('Unauthorized import accepted');}catch(RuntimeException $e){check($e->getMessage()!=='Unauthorized import accepted','Import permissions');}}
$bad=$patch;$bad['days'][academicDay()]['outside-student']='P';
try{$pdo->beginTransaction();attendanceImport($pdo,$teacher,$bad);throw new Exception('Outside roster accepted');}catch(InvalidArgumentException $e){$pdo->rollBack();}
$bad=$patch;$bad['days'][academicDay()]['attcheck-two']='X';
try{$pdo->beginTransaction();attendanceImport($pdo,$teacher,$bad);throw new Exception('Invalid mark accepted');}catch(InvalidArgumentException $e){$pdo->rollBack();}
check(attendanceSnapshot($pdo,$teacher)['scopes'][0]['days'][academicDay()]['statuses']===$all,'Failed import writes nothing');
echo "PASS temporary-table integration: draft rejection, acknowledged submit, own-student privacy, unmarked preserved, admin report sync, resubmission, teacher assignment, read-only student. No real rows changed.\n";
