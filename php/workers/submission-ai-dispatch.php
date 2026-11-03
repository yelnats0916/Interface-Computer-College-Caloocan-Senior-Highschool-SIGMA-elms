<?php
// Invoke from the host scheduler every minute. Submission saves also start the
// workers immediately; this sweep recovers missed jobs and interrupted workers.
if(PHP_SAPI!=='cli')exit(1);
require_once dirname(__DIR__).'/includes/service_secrets.php';
require_once dirname(__DIR__).'/includes/submission_ai_reconcile.php';
$db=serviceSettingsPdo();
$lock='sigma-submission-ai-dispatch';
$q=$db->prepare('SELECT GET_LOCK(?,0)');$q->execute([$lock]);
if(!(int)$q->fetchColumn())exit;
try{
    $summary=sigmaReconcileSubmissionAnalysis($db);
    if(!in_array('--scheduled',$argv,true))sigmaStartSubmissionAnalysis();
    echo json_encode(['at'=>gmdate('c')]+$summary,JSON_THROW_ON_ERROR).PHP_EOL;
}finally{$q=$db->prepare('SELECT RELEASE_LOCK(?)');$q->execute([$lock]);}
// Scheduled hosts can reap detached children when their parent job finishes.
// Keep one bounded worker attached to the scheduler for reliable recovery.
if(in_array('--scheduled',$argv,true)){
    // The existing host schedule also prepares grade/subject copies without page visits.
    $command=escapeshellarg(PHP_BINARY).' '.escapeshellarg(__DIR__.'/grade-insights.php').' --scheduled';
    passthru($command);
    require __DIR__.'/submission-ai.php';
}
