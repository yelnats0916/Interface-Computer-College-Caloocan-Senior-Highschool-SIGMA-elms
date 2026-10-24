<?php
// Administrative content operation. Never served as a web endpoint.
if(PHP_SAPI!=='cli')exit(1);
$root=$argv[1]??'';$manifest=$argv[2]??'';$actorId=$argv[3]??'';
if(!is_dir($root)||!is_file($manifest)||$actorId==='')throw new RuntimeException('Usage: php installer.php WEB_ROOT QUIZ_MANIFEST ACTOR_ID');
require $root.'/config/database.php';
require $root.'/php/includes/material_provenance.php';
require $root.'/php/includes/data_provenance.php';
require $root.'/php/includes/activity_audit.php';
require $root.'/php/includes/record_creation_numbers.php';
$quizzes=json_decode(file_get_contents($manifest),true,512,JSON_THROW_ON_ERROR);
if(count($quizzes)!==6)throw new RuntimeException('Expected six topic quizzes.');
sigmaRequireRealRecords($quizzes);
$find=$pdo->prepare("SELECT * FROM users WHERE id=? AND is_deleted=0 AND LOWER(status)='active'");$find->execute([$actorId]);$actor=$find->fetch(PDO::FETCH_ASSOC);
if(!$actor||!in_array(strtolower($actor['role']),['admin','master admin'],true))throw new RuntimeException('An active administrator is required.');
$name=$actor['full_name']?:trim(($actor['first_name']??'').' '.($actor['last_name']??''));
$pdo->beginTransaction();
try {
 $query=$pdo->query("SELECT * FROM subjects WHERE id='CORE-112-RW' AND code='RW-11-12' AND is_deleted=0 FOR UPDATE");$row=$query->fetch(PDO::FETCH_ASSOC);
 if(!$row||$row['status']!=='Draft')throw new RuntimeException('Expected the retained Draft Reading and Writing subject.');
 $backup=dirname($manifest).'/reading-writing-before-quizzes.json';
 if(file_exists($backup))throw new RuntimeException('A previous quiz operation exists; inspect before retrying.');
 file_put_contents($backup,json_encode($row,JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES));chmod($backup,0600);
 $subject=['topics'=>json_decode($row['topics'],true,512,JSON_THROW_ON_ERROR),'materials'=>json_decode($row['materials'],true)?:[]];$previous=$subject;
 $known=sigmaCollectSubjectMaterials($subject);$questions=0;$materialIds=[];
 foreach($quizzes as $index=>$quiz){
  $expected=$index===1||$index===5?12:10;
  if(count($quiz['questions'])!==$expected||$quiz['totalQuestions']!==$expected||$quiz['totalPoints']!==$expected)throw new RuntimeException('Quiz totals mismatch.');
  $topic=null;foreach($subject['topics'] as $t)if($t['id']===$quiz['topicId']){$topic=$t;break;}
  if(!$topic||$topic['quarter']!==$quiz['quarter'])throw new RuntimeException('Quiz topic mismatch.');
  foreach($quiz['questions'] as $question){
   if($question['type']!=='Multiple Choice'||count($question['choices'])!==4||count(array_unique($question['choices']))!==4||$question['points']!==1)throw new RuntimeException('Invalid question format.');
   if(!is_int($question['answerIndex'])||($question['choices'][$question['answerIndex']]??null)!==$question['answer']||empty($question['explanation']))throw new RuntimeException('Missing or inconsistent answer key.');
  }
  $check=$pdo->prepare('SELECT id FROM quizzes WHERE id=? OR code=? FOR UPDATE');$check->execute([$quiz['id'],$quiz['code']]);
  if($check->fetchColumn())throw new RuntimeException('Quiz already exists; no records overwritten.');
  $materialId=$quiz['id'].'-MATERIAL';if(isset($known[$materialId]))throw new RuntimeException('Quiz material already linked.');
  $save=$pdo->prepare('INSERT INTO quizzes (id,code,title,description,status,author_id,author_name,author_role,questions,total_questions,total_points,time_limit,icon,color,is_ai,is_deleted) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,0)');
  $save->execute([$quiz['id'],$quiz['code'],$quiz['title'],$quiz['description'],'published',$actorId,$name,'Admin',json_encode($quiz['questions'],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),$expected,$expected,$quiz['timeLimit'],$quiz['icon'],$quiz['color']]);
  sigmaTableCreationNumber($pdo,'quizzes',$quiz['id']);
  $material=['id'=>$materialId,'title'=>$quiz['title'],'description'=>$quiz['description'],'type'=>'Quiz','category'=>'Quiz','topicId'=>$topic['id'],'quarter'=>$topic['quarter'],'status'=>'Published',
   'sourceType'=>'embed','quizMode'=>'storage','quizId'=>$quiz['id'],'selectedQuizId'=>$quiz['id'],'quizTitle'=>$quiz['title'],'selectedQuizTitle'=>$quiz['title'],
   'quizQuestionsCount'=>$expected,'selectedQuizQuestions'=>$expected,'selectedQuizQuestionsCount'=>$expected,'quizPoints'=>$expected,'selectedQuizPoints'=>$expected,'maxScore'=>$expected,'totalPoints'=>$expected,
   'quizIcon'=>$quiz['icon'],'selectedQuizIcon'=>$quiz['icon'],'icon'=>$quiz['icon'],'quizColor'=>$quiz['color'],'selectedQuizColor'=>$quiz['color'],'color'=>$quiz['color'],
   'isAi'=>true,'selectedQuizIsAi'=>true,'hasRubric'=>false,'competencyCodes'=>$quiz['competencyCodes']];
  $subject['materials'][]=$material;
  foreach($subject['topics'] as &$target)if($target['id']===$topic['id']){
   foreach(['materials','allMaterials','quizzes'] as $collection){if(!isset($target[$collection]))$target[$collection]=[];$target[$collection][]=$material;}
  }unset($target);
  $questions+=$expected;$materialIds[]=$materialId;
  sigmaRecordActivity($pdo,$actorId,'Created Quiz','Curriculum','Quiz: '.$quiz['title'].'; '.$expected.' questions; '.$expected.' points.',['quizId'=>$quiz['id'],'subjectId'=>$row['id'],'topicId'=>$topic['id']]);
 }
 if($questions!==64)throw new RuntimeException('Expected 64 keyed questions.');
 $created=sigmaStampSubjectMaterials($subject,$previous,$actor);
 if(count($created)!==6)throw new RuntimeException('Expected exactly six new quiz materials.');
 // Do not alter any existing lesson, assignment, activity, task or rubric.
 $after=sigmaCollectSubjectMaterials($subject);
 foreach($known as $id=>$old)if(($after[$id]??null)!==$old)throw new RuntimeException('An existing material changed unexpectedly.');
 $pdo->prepare('UPDATE subjects SET topics=?,materials=? WHERE id=?')->execute([json_encode($subject['topics'],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),json_encode($subject['materials'],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),$row['id']]);
 // Read back all stored keys and links before publishing.
 foreach($quizzes as $quiz){
  $check=$pdo->prepare('SELECT * FROM quizzes WHERE id=?');$check->execute([$quiz['id']]);$saved=$check->fetch(PDO::FETCH_ASSOC);
  if($saved['author_id']!==$actorId||$saved['author_role']!=='Admin'||$saved['status']!=='published'||json_decode($saved['questions'],true)!==$quiz['questions'])throw new RuntimeException('Stored quiz does not match verified content.');
 }
 $check=$pdo->prepare('SELECT topics,materials FROM subjects WHERE id=?');$check->execute([$row['id']]);$saved=$check->fetch(PDO::FETCH_ASSOC);
 if(json_decode($saved['topics'],true)!==$subject['topics']||json_decode($saved['materials'],true)!==$subject['materials'])throw new RuntimeException('Stored topic links do not match.');
 foreach($created as $m)sigmaRecordActivity($pdo,$actorId,'Created Material','Curriculum','Subject: RW-11-12 Reading and Writing Skills'."\nTitle: ".$m['title']."\nType: Quiz",['subjectId'=>$row['id'],'topicId'=>$m['topicId'],'materialId'=>$m['id']]);
 $pdo->prepare("UPDATE subjects SET status='Published' WHERE id=?")->execute([$row['id']]);
 sigmaRecordActivity($pdo,$actorId,'Published Subject','Curriculum','Subject code: RW-11-12; Reading and Writing Skills; six verified quizzes with 64 keyed questions.');
 $pdo->commit();
 $report=['subjectId'=>$row['id'],'subject'=>'Reading and Writing Skills','status'=>'Published','quizzesCreated'=>6,'questions'=>64,'counts'=>array_column($quizzes,'totalQuestions'),'authorId'=>$actorId,'authorName'=>$name,'linkedMaterialIds'=>$materialIds,'verifiedAt'=>gmdate('c')];
 $receipt=dirname($manifest).'/quizzes-installed.json';file_put_contents($receipt,json_encode($report,JSON_PRETTY_PRINT));chmod($receipt,0600);
 echo json_encode($report);
}catch(Throwable $error){if($pdo->inTransaction())$pdo->rollBack();throw $error;}
