<?php
require_once __DIR__.'/../php/includes/quiz_ai_jobs.php';
function checkJob($condition,$message){if(!$condition)throw new RuntimeException($message);}
$id=bin2hex(random_bytes(16));
try{
 quizAiWriteJob($id,['ownerId'=>'teacher1','createdAt'=>time(),'status'=>'succeeded','result'=>['questions'=>[['bloomLevel'=>'Apply','answer'=>'A']]],'input'=>['source'=>'Private lesson']]);
 $record=quizAiReadJob($id,'teacher1');checkJob($record['status']==='succeeded','Owner can read result');checkJob(!isset($record['input']),'Source not exposed by polling');
 try{quizAiReadJob($id,'teacher2');throw new LogicException('Another user accessed generation');}catch(InvalidArgumentException $expected){}
 try{quizAiJobPath('../escape');throw new LogicException('Path traversal accepted');}catch(InvalidArgumentException $expected){}
 quizAiWriteJob($id,['ownerId'=>'teacher1','createdAt'=>time()-181,'status'=>'running']);checkJob(quizAiReadJob($id,'teacher1')['status']==='failed','Stalled jobs end explicitly');
 echo "PASS generation jobs: owner isolation, no source disclosure, traversal rejection and bounded stale-job lifetime.\n";
}finally{if(is_file(quizAiJobPath($id)))unlink(quizAiJobPath($id));}
