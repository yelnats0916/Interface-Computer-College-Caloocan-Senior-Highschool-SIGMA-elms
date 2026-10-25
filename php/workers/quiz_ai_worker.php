<?php
if(PHP_SAPI!=='cli') {http_response_code(404);exit;}
require_once __DIR__.'/../includes/quiz_ai_jobs.php';
require_once __DIR__.'/../includes/quiz_ai_audit.php';
$id=(string)($argv[1]??'');$path=quizAiJobPath($id);$job=json_decode(file_get_contents($path),true,64,JSON_THROW_ON_ERROR);
if(($job['status']??'')!=='pending')exit;
try{
    $services=require dirname(__DIR__,2).'/config/services.php';
    $db=serviceSettingsPdo();$query=$db->prepare("SELECT id FROM users WHERE id=? AND is_deleted=0 AND LOWER(status)='active' AND LOWER(REPLACE(role,' ','')) IN ('admin','masteradmin','administrator','teacher')");$query->execute([$job['ownerId']]);if(!$query->fetchColumn())throw new RuntimeException('Account access is no longer available.');
    $job['status']='running';quizAiWriteJob($id,$job);
    $result=generateQuizAi($services,$job['input'],'quizAiProviderRequest');$result['generationId']=sigmaAiGenerationId('assessment');
    sigmaRecordQuizResult($db,(string)$job['ownerId'],$job['input'],$result);$result['logSaved']=true;
    unset($job['input']);$job['status']='succeeded';$job['result']=$result;
}catch(Throwable $error){unset($job['input']);$job['status']='failed';$job['error']=$error instanceof RuntimeException||$error instanceof InvalidArgumentException?$error->getMessage():'AI generation is unavailable.';}
quizAiWriteJob($id,$job);
