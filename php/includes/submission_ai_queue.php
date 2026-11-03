<?php
require_once __DIR__.'/submission_ai_evidence.php';

function sigmaSubmissionAiChangedReleaseItems(PDO $db,array $subject,array $section,array $catalog,array $before,array $after): array {
    $changed=[];
    foreach($catalog as $item){
        if($item['kind']!=='assessment')continue;
        if(academicIsDigitalQuiz($item))continue;
        $old=academicResolvedItem($db,$subject,$section,$item,$before);
        $new=academicResolvedItem($db,$subject,$section,$item,$after);
        if($old!==$new)$changed[$item['id']]=$new;
    }
    return $changed;
}

function sigmaQueueSubmissionAnalysis(PDO $db,array $actor,array $subject,array $section,string $studentId,string $itemId,string $mode,?array $resolvedItem=null,bool $retry=false,bool $background=false,bool $retryFailedFeedbackAfterGrade=false): ?array {
    $item=$resolvedItem??academicResolvedItem($db,$subject,$section,academicItem($subject,['itemId'=>$itemId]));
    if(academicIsDigitalQuiz($item))return null;
    try{sigmaRequireSubmissionEvaluationEnabled($item,$mode==='feedback');}catch(InvalidArgumentException $error){return null;}
    $submission=academicRead($db,'submission',$subject,$section,$studentId,$itemId);
    if(!$submission)return null;
    $score=academicRead($db,'score',$subject,$section,$studentId,$itemId);
    if($mode==='feedback'&&(!$score||!is_numeric($score['score']??null)||!hash_equals((string)$submission['attemptIdentity'],(string)($score['attemptIdentity']??''))))return null;
    if(academicRole($actor)==='student'){
        $teachers=$db->query("SELECT * FROM users WHERE is_deleted=0 AND LOWER(status)='active' AND LOWER(role)='teacher'")->fetchAll(PDO::FETCH_ASSOC);
        $actor=null;
        foreach($teachers as $teacher)if(academicTeacher($section,$teacher,$subject)&&sigmaActorPermission($teacher,'teacherGrades')){$actor=$teacher;break;}
        if(!$actor)return null;
    }
    $identity=(string)$submission['attemptIdentity'];
    $version=sigmaSubmissionAiVersion($identity,$mode,$item,$mode==='feedback'?null:academicRead($db,'rubric',$subject,$section,'',$itemId));
    $jobId=$itemId.':'.$mode.':'.$version;
    $existing=academicRead($db,'submission_ai_job',$subject,$section,$studentId,$jobId);
    $priority=$background?0:($mode==='evaluation'?3:2);
    // Feedback may have exhausted its retries before a teacher saved the grade.
    // A grade save may restart only that failed job, and only for this exact attempt.
    $scoredAttemptMatches=$score&&is_numeric($score['score']??null)
        &&hash_equals($identity,(string)($score['attemptIdentity']??''));
    $retryFailedFeedback=$retryFailedFeedbackAfterGrade&&$mode==='feedback'&&$scoredAttemptMatches
        &&($existing['state']??'')==='failed';
    // This exact validation failure is recoverable now that evaluations can
    // use the supplied task instructions and standard criteria without a file rubric.
    $missingRubricCanUseGeneralCriteria=$mode==='evaluation'&&($existing['state']??'')==='failed'
        &&str_contains((string)($existing['error']??''),'The submitted work and grading rubric must contain readable content.');
    // A retry never replaces an active worker. Its per-job lock also protects
    // recovery when a process died after persisting its processing state.
    $stale=($existing['state']??'')==='processing' && ($existing['startedAt']??0)<time()-180;
    if($existing && !$stale && !$missingRubricCanUseGeneralCriteria && !$retryFailedFeedback
        && !($retry && in_array($existing['state']??'',['failed','complete','superseded'],true))){
        // A teacher opening an item promotes an existing reconciliation job so
        // current grading work is not held behind the historical queue.
        if(($existing['state']??'')==='pending'&&$priority>(int)($existing['priority']??0)){
            $existing['priority']=$priority;academicWrite($db,$actor,'submission_ai_job',$subject,$section,$studentId,$jobId,$existing);
        }
        return $existing;
    }
    $job=[
        'state'=>'pending','mode'=>$mode,'itemId'=>$itemId,'attemptIdentity'=>$identity,'attempts'=>0,
        'priority'=>$priority
    ];
    academicWrite($db,$actor,'submission_ai_job',$subject,$section,$studentId,$jobId,$job);
    return $job;
}

// Shared attempt version for queue creation and read-only job status.
function sigmaSubmissionAiVersion(string $identity,string $mode,array $item,?array $rubric=null): string {
    return hash('sha256',json_encode($mode==='feedback'?[$identity,$mode,'submission-v1']:[$identity,$mode,$item,$rubric]));
}

// Fresh submissions and explicit retries precede historical reconciliation.
// Priority is persisted with the attempt so restarts keep the same ordering.
function sigmaSubmissionAiWaitingQuery(): string {
    return "SELECT * FROM academic_records WHERE record_type='submission_ai_job' ORDER BY CAST(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(payload,'$.priority')),0) AS UNSIGNED) DESC, updated_at ASC, record_key ASC";
}

function sigmaStartSubmissionAnalysis(): void {
    if(!is_callable('exec'))return;
    $worker=dirname(__DIR__).'/workers/submission-ai.php';
    if(PHP_OS_FAMILY==='Windows'){
        $php=dirname(PHP_BINARY).DIRECTORY_SEPARATOR.'php.exe';
        if(!is_file($worker)||!is_file($php))return;
        $quote=fn($value)=>"'".str_replace("'","''",$value)."'";
        $command='Start-Process -FilePath '.$quote($php).' -ArgumentList '.$quote('"'.$worker.'"').' -WindowStyle Hidden';
        for($slot=0;$slot<3;$slot++)@exec('powershell.exe -NoProfile -NonInteractive -WindowStyle Hidden -Command '.escapeshellarg($command));
        return;
    }
    $private='/home/sigma-elms/sigma-private';
    if(!is_file($worker)||!is_dir($private))return;
    for($slot=0;$slot<3;$slot++)@exec('nohup /usr/bin/php '.escapeshellarg($worker).' >> '.escapeshellarg($private.'/submission-ai.log').' 2>&1 < /dev/null &');
}
