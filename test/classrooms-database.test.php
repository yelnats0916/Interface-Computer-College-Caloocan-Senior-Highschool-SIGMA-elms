<?php
require_once __DIR__.'/../php/includes/teacher_classrooms.php';
require_once __DIR__.'/../php/includes/authentication_audit.php';
function check($ok,$message){if(!$ok)throw new RuntimeException($message);}
$db=new PDO('sqlite::memory:');$db->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
$db->exec('CREATE TABLE subjects(id TEXT,code TEXT,name TEXT,grade_level TEXT,units REAL,learning_hours INT,type TEXT,strand TEXT,status TEXT,curriculum_metadata TEXT,weights TEXT,active_quarters TEXT,topics TEXT,materials TEXT,is_deleted INT,created_at TEXT,updated_at TEXT)');
$db->exec('CREATE TABLE sections(id TEXT,name TEXT,grade_level TEXT,room TEXT,school_year TEXT,start_time TEXT,end_time TEXT,days TEXT,schedule TEXT,daily_schedules TEXT,teacher TEXT,teachers TEXT,subject TEXT,subjects TEXT,students TEXT,students_count INT,status TEXT,is_deleted INT,created_at TEXT,updated_at TEXT)');
$db->exec('CREATE TABLE school_years(id TEXT,year_start INT,year_end INT,status TEXT,is_deleted INT)');
$db->exec("INSERT INTO school_years VALUES ('sy1',2026,2027,'Active',0)");
$db->exec('CREATE TABLE academic_records(record_key TEXT,payload TEXT)');
$insert=function($table,$record)use($db){$keys=array_keys($record);$db->prepare('INSERT INTO '.$table.' ('.implode(',',$keys).') VALUES ('.implode(',',array_fill(0,count($keys),'?')).')')->execute(array_values($record));};
$subject=['id'=>'sub1','code'=>'RW','name'=>'Reading','status'=>'published','is_deleted'=>0,'topics'=>json_encode([['id'=>'t1','title'=>'Topic','materials'=>[['id'=>'m1','title'=>'Released','questions'=>[['answer'=>'secret','choices'=>[['text'=>'A','isCorrect'=>true]]]]],['id'=>'m2','title'=>'Unreleased']]]]),'materials'=>'[]'];
$insert('subjects',$subject);$insert('subjects',array_replace($subject,['id'=>'draft','name'=>'Draft','status'=>'draft']));
$section=['id'=>'sec1','name'=>'Einstein','subject'=>'Reading','subjects'=>'["Reading"]','teacher'=>'Teacher One','teachers'=>'[{"id":"teacher1","name":"Teacher One","subject":"Reading"}]','students'=>'[{"id":"student1"},{"id":"student2"}]','students_count'=>2,'status'=>'deployed','is_deleted'=>0];$insert('sections',$section);
$insert('sections',array_replace($section,['id'=>'draftsec','status'=>'draft']));
$insert('academic_records',['record_key'=>academicKey('release',$subject,$section,'','topics'),'payload'=>json_encode(['releasedTopicIds'=>['t1'],'recordedAt'=>'2026-01-01'])]);
$insert('academic_records',['record_key'=>academicKey('release',$subject,$section,'','learning'),'payload'=>json_encode(['releasedMaterialIds'=>['m1'],'recordedAt'=>'2026-01-01'])]);
$t=sigmaTeacherClassrooms($db,['id'=>'teacher1','role'=>'teacher','full_name'=>'Teacher One']);check(count($t['sections'])===1&&count($t['subjects'])===1,'Teacher assigned deployed/published scope');
check(sigmaTeacherClassrooms($db,['id'=>'other','role'=>'teacher'])['sections']===[],'Other teacher isolation');
$s=sigmaAssignedClassrooms($db,['id'=>'student1','role'=>'student']);check(count($s['sections'])===1,'Student enrollment');check($s['schoolYears'][0]['status']==='Active','School calendar hydrated');check(count($s['sections'][0]['students'])===1,'No other student identities');
check(count($s['subjects'][0]['topics'][0]['materials'])===1,'Unreleased material removed');check(!str_contains(json_encode($s),'secret')&&!str_contains(json_encode($s),'isCorrect'),'No nested answer keys');
check(sigmaAssignedClassrooms($db,['id'=>'outsider','role'=>'student'])['sections']===[],'Student isolation');
$db->exec('CREATE TABLE audit_logs(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id TEXT,action TEXT,ip_address TEXT,user_agent TEXT)');$db->exec('CREATE TABLE audit_log_context(audit_id INT,payload TEXT)');
foreach(['Mozilla/5.0 Windows Chrome/140','Mozilla/5.0 iPhone Safari/604'] as $ua){$_SERVER['REMOTE_ADDR']='192.0.2.1';$_SERVER['HTTP_USER_AGENT']=$ua;sigmaRecordAuthentication($db,'student1','Login successful');sigmaRecordAuthentication($db,'student1','Failed login attempt','failed');}
check((int)$db->query('SELECT COUNT(*) FROM audit_logs')->fetchColumn()===4,'Actual success/failure audit records');check((int)$db->query('SELECT COUNT(DISTINCT user_agent) FROM audit_logs')->fetchColumn()===2,'Device-specific audit metadata');check((int)$db->query('SELECT COUNT(*) FROM audit_log_context')->fetchColumn()===4,'Full authentication contexts saved');
echo "PASS scoped teacher/student database bootstrap, releases, answer-key protection, enrollment isolation and server-observed desktop/mobile authentication audit.\n";
