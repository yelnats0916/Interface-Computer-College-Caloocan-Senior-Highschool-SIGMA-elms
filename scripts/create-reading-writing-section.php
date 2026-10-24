<?php
if(PHP_SAPI!=='cli')exit(1);
$root=$argv[1]??'';if(!is_dir($root))throw new RuntimeException('Web root required.');
require $root.'/config/database.php';require $root.'/php/includes/school_year_policy.php';require $root.'/php/includes/section_subject_policy.php';require $root.'/php/includes/academic_scope.php';require $root.'/php/includes/activity_audit.php';require $root.'/php/includes/record_creation_numbers.php';
sigmaLockSchoolYearWrites($pdo);$pdo->beginTransaction();
try{
 $year=sigmaRequireSectionSchoolYear($pdo,'2026-2027');
 $q=$pdo->prepare('SELECT * FROM school_years WHERE id=?');$q->execute([$year['id']]);if($q->fetch(PDO::FETCH_ASSOC)['status']!=='Active')throw new RuntimeException('Expected active 2026-2027 year.');
 $q=$pdo->query("SELECT * FROM subjects WHERE id='CORE-112-RW' AND is_deleted=0 FOR UPDATE");$subject=$q->fetch(PDO::FETCH_ASSOC);
 if(!$subject||$subject['status']!=='Published')throw new RuntimeException('Expected published Reading and Writing Skills.');
 sigmaValidateSectionSubjectAssignments($pdo,['subject'=>$subject['name'],'subjects'=>[$subject['name']]]);
 $q=$pdo->query("SELECT * FROM sections WHERE is_deleted=0 FOR UPDATE");$sections=$q->fetchAll(PDO::FETCH_ASSOC);
 if($sections)throw new RuntimeException('Sections now exist; inspect assignments before creating a new section.');
 $q=$pdo->query("SELECT * FROM users WHERE id='2601021' AND is_deleted=0 AND LOWER(status)='active' AND LOWER(role)='teacher' FOR UPDATE");$teacher=$q->fetch(PDO::FETCH_ASSOC);
 if(!$teacher)throw new RuntimeException('Selected teacher unavailable.');
 $students=[];$before=[];
 for($n=1;$n<=10;$n++){
  $id='260103'.$n;$q=$pdo->prepare("SELECT * FROM users WHERE id=? AND is_deleted=0 AND LOWER(status)='active' AND LOWER(role)='student' FOR UPDATE");$q->execute([$id]);$student=$q->fetch(PDO::FETCH_ASSOC);
  if(!$student||trim($student['grade_section']??'')!=='')throw new RuntimeException('Selected student unavailable or already assigned.');
  $before[]=['id'=>$id,'grade_level'=>$student['grade_level'],'grade_section'=>$student['grade_section']];
  $students[]=['id'=>$id,'uid'=>$id,'name'=>$student['full_name'],'fullName'=>$student['full_name'],'firstName'=>$student['first_name'],'lastName'=>$student['last_name'],'grade'=>'Grade 11','role'=>'Student'];
 }
 $id='SEC-11-EINSTEIN-RW-2026';$name='Einstein';
 $q=$pdo->prepare('SELECT id FROM sections WHERE id=? OR (name=? AND school_year=?)');$q->execute([$id,$name,'2026-2027']);if($q->fetchColumn())throw new RuntimeException('Section already exists; no replacement allowed.');
 $teachers=[['id'=>$teacher['id'],'uid'=>$teacher['id'],'name'=>$teacher['full_name'],'fullName'=>$teacher['full_name'],'role'=>'Teacher','isPrimary'=>true,'subject'=>$subject['name']]];
 $schedule=[];foreach(['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] as $day){$active=in_array($day,['Mon','Thu'],true);$schedule[]=['day'=>$day,'active'=>$active,'startTime'=>$active?'09:00':'','endTime'=>$active?'11:00':''];}
 $pdo->prepare('INSERT INTO sections(id,name,grade_level,room,school_year,start_time,end_time,days,schedule,daily_schedules,teacher,teacher_role,teachers,subject,subjects,students,students_count,status,is_deleted) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0)')->execute([$id,$name,'Grade 11','302','2026-2027','09:00','11:00','Mon, Thu','Mon, Thu 9:00 AM - 11:00 AM',json_encode($schedule),$teacher['full_name'],'Teacher',json_encode($teachers),$subject['name'],json_encode([$subject['name']]),json_encode($students),count($students),'Deployed']);
 foreach($students as $student)$pdo->prepare('UPDATE users SET grade_level=?,grade_section=? WHERE id=?')->execute(['Grade 11',$name,$student['id']]);
 sigmaTableCreationNumber($pdo,'sections',$id);
 $q=$pdo->prepare('SELECT * FROM sections WHERE id=?');$q->execute([$id]);$saved=$q->fetch(PDO::FETCH_ASSOC);
 if(count(json_decode($saved['teachers'],true))!==1||count(json_decode($saved['students'],true))!==10||!gradeTeacher($saved,$teacher,$subject['name']))throw new RuntimeException('Assignment verification failed.');
 foreach($students as $student){$q=$pdo->prepare('SELECT * FROM users WHERE id=?');$q->execute([$student['id']]);if(!gradeStudent($saved,$q->fetch(PDO::FETCH_ASSOC)))throw new RuntimeException('Student enrollment verification failed.');}
 if(sigmaSubjectRemovalReason($pdo,$subject)==='')throw new RuntimeException('Subject deletion protection not triggered.');
 $q=$pdo->prepare('SELECT * FROM school_years WHERE id=?');$q->execute([$year['id']]);if(sigmaSchoolYearRemovalReason($pdo,$q->fetch(PDO::FETCH_ASSOC))==='')throw new RuntimeException('School-year protection not triggered.');
 sigmaRecordActivity($pdo,'0000000','Deployed Section','Classes','Section Einstein; Grade 11; Reading and Writing Skills; one teacher; 10 students; school year 2026-2027.');
 $receipt=['section'=>$saved,'priorStudentAssignments'=>$before,'verifiedAt'=>gmdate('c')];
 $path='/home/sigma-elms/sigma-private/reading-writing-section-created.json';if(file_exists($path))throw new RuntimeException('Prior section operation receipt exists.');
 $pdo->commit();file_put_contents($path,json_encode($receipt,JSON_PRETTY_PRINT));chmod($path,0600);
 echo json_encode(['section'=>$name,'grade'=>'Grade 11','schoolYear'=>'2026-2027','subject'=>$subject['name'],'teacher'=>$teacher['full_name'],'teacherId'=>$teacher['id'],'students'=>array_column($students,'name'),'studentCount'=>count($students),'room'=>'302','schedule'=>'Monday and Thursday, 9:00-11:00 AM','status'=>$saved['status'],'subjectDeletionBlocked'=>true]);
}catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
finally{$pdo->query("SELECT RELEASE_LOCK('sigma_school_year_write')");}
