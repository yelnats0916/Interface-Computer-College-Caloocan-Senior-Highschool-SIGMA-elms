<?php
if(PHP_SAPI!=='cli')exit(1);
require_once dirname(__DIR__).'/includes/service_secrets.php';
require_once dirname(__DIR__).'/includes/assessment_records.php';
require_once dirname(__DIR__).'/includes/submission_ai_service.php';
require_once dirname(__DIR__).'/includes/ai_background_limits.php';
require_once dirname(__DIR__).'/includes/submission_ai_queue.php';
$db=serviceSettingsPdo();
// Bounded concurrency: unrelated students need not wait for one slow request.
// Database locks are released automatically if a process exits.
$slotLock=null;
for($slot=0;$slot<3;$slot++){
    $name='sigma-submission-ai-worker-'.$slot;
    $q=$db->prepare('SELECT GET_LOCK(?,0)');$q->execute([$name]);
    if((int)$q->fetchColumn()){$slotLock=$name;break;}
}
if(!$slotLock)exit;
$deadline=time()+(in_array('--scheduled',$argv,true)?45:600);
try {
    for($count=0;$count<50 && time()<$deadline;$count++){
        if(sigmaBackgroundAiRetryAt($db)>time())break;
        $jobs=$db->query(sigmaSubmissionAiWaitingQuery())->fetchAll(PDO::FETCH_ASSOC);
        $job=null;$nextRetry=null;$jobLock=null;
        foreach($jobs as $candidate){
            $payload=json_decode($candidate['payload'],true);
            $stale=($payload['state']??'')==='processing' && ($payload['startedAt']??0)<time()-180;
            if(!in_array($payload['state']??'',['pending','failed'],true)&&!$stale)continue;
            if(($payload['attempts']??0)>=3)continue;
            if(($payload['retryAfter']??0)>time()){$nextRetry=min($nextRetry??PHP_INT_MAX,$payload['retryAfter']);continue;}
            $name='sigma-ai-job:'.substr($candidate['record_key'],0,40);
            $q=$db->prepare('SELECT GET_LOCK(?,0)');$q->execute([$name]);
            if(!(int)$q->fetchColumn())continue;
            // Recheck after locking: a worker may have completed during the scan.
            $q=$db->prepare('SELECT * FROM academic_records WHERE record_key=?');$q->execute([$candidate['record_key']]);
            $fresh=$q->fetch(PDO::FETCH_ASSOC);$current=json_decode($fresh['payload'],true);
            if($current!==$payload){$q=$db->prepare('SELECT RELEASE_LOCK(?)');$q->execute([$name]);continue;}
            $job=$fresh;$jobLock=$name;break;
        }
        if(!$job){
            // Retry transient failures without requiring another page visit.
            if($nextRetry!==null && $nextRetry-time()<=30){sleep(max(1,$nextRetry-time()));continue;}
            break;
        }
        $payload=json_decode($job['payload'],true);
        $payload['state']='processing';$payload['startedAt']=time();
        $payload['attempts']=(int)($payload['attempts']??0)+1;
        $update=$db->prepare('UPDATE academic_records SET payload=? WHERE record_key=?');
        $update->execute([json_encode($payload,JSON_THROW_ON_ERROR),$job['record_key']]);
        try {
            $q=$db->prepare("SELECT * FROM users WHERE id=? AND is_deleted=0 AND LOWER(status)='active'");$q->execute([$job['actor_id']]);$actor=$q->fetch(PDO::FETCH_ASSOC);
            if(!$actor)throw new RuntimeException('The grading account is unavailable.');
            [$subject,$section]=academicScope($db,$actor,$job['subject_id'],$job['section_id'],'teacherGrades');
            $student=academicStudent($db,$section,$job['student_id']);
            $item=academicResolvedItem($db,$subject,$section,academicItem($subject,['itemId'=>$payload['itemId']]));
            sigmaGenerateSavedSubmissionAi($db,$actor,$subject,$section,$student,$item,$payload);
            $payload['state']='complete';unset($payload['error'],$payload['retryAfter']);
        }catch(Throwable $error){
            $payload['state']='failed';$payload['error']=$error->getMessage();$payload['retryAfter']=time()+15*$payload['attempts'];
            if(str_contains($error->getMessage(),'attempt changed')||str_contains($error->getMessage(),'changed during analysis'))$payload['state']='superseded';
            // Missing evidence needs a correction, not more paid requests.
            if($error instanceof InvalidArgumentException)$payload['attempts']=3;
            if(sigmaBackgroundAiWasLimited($error)){
                $payload['state']='pending';$payload['attempts']=max(0,$payload['attempts']-1);
                $payload['retryAfter']=sigmaPauseBackgroundAi($db);
            }
            error_log('Submission AI job failed: '.$error->getMessage());
        }finally{
            $update->execute([json_encode($payload,JSON_THROW_ON_ERROR),$job['record_key']]);
            $q=$db->prepare('SELECT RELEASE_LOCK(?)');$q->execute([$jobLock]);
        }
    }
}finally{$q=$db->prepare('SELECT RELEASE_LOCK(?)');$q->execute([$slotLock]);}
