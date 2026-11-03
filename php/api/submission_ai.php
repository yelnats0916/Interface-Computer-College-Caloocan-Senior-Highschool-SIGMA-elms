<?php
header('Content-Type: application/json');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
require_once __DIR__ . '/../includes/ai_request_auth.php';
restrictServiceOrigin();
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: POST, OPTIONS');
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') exit;
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') { http_response_code(405); exit; }
$raw = file_get_contents('php://input', false, null, 0, 150001);
if (strlen($raw) > 150000) { http_response_code(413); echo json_encode(['success' => false, 'error' => 'Submission evidence is too large.']); exit; }
require_once __DIR__ . '/../includes/submission_ai_generation.php';
require_once __DIR__ . '/../includes/ai_generation_id.php';
require_once __DIR__ . '/../includes/ai_request_auth.php';
$aiActor = sigmaRequireAiActor(['admin', 'masteradmin', 'administrator', 'teacher']);
try {
    $request = json_decode($raw, true) ?: [];
    sigmaRequireRealRecords($request);
    require_once __DIR__.'/../includes/academic_evidence.php';
    require_once __DIR__.'/../includes/ai_record_store.php';
    $db=serviceSettingsPdo();
    [$subject,$section]=academicScope($db,$aiActor,(string)($request['subjectId']??''),(string)($request['section']??''),'teacherGrades');
    $student=academicStudent($db,$section,(string)($request['studentId']??''));
    $item=academicResolvedItem($db,$subject,$section,academicItem($subject,$request));
    require_once __DIR__.'/../includes/submission_ai_service.php';
    if(in_array($request['action']??'',['ensure','retry'],true)){
        require_once __DIR__.'/../includes/submission_ai_queue.php';
        $feedback=($request['mode']??'evaluation')==='feedback';
        sigmaRequireSubmissionEvaluationEnabled($item,$feedback);
        $submission=academicRead($db,'submission',$subject,$section,$student['id'],$item['id']);
        if(!$submission)throw new InvalidArgumentException('A saved student submission is required.');
        if(!hash_equals((string)$submission['attemptIdentity'],(string)($request['attemptIdentity']??'')))throw new RuntimeException('The submission attempt changed. Open the latest submitted work.');
        $score=academicRead($db,'score',$subject,$section,$student['id'],$item['id']);
        if(academicIsDigitalQuiz($item))throw new InvalidArgumentException('Quiz work must be evaluated in the quiz player.');
        if($feedback&&(!$score||!is_numeric($score['score']??null)||!hash_equals((string)$submission['attemptIdentity'],(string)($score['attemptIdentity']??''))))throw new InvalidArgumentException('Save a grade for this submission attempt before generating feedback.');
        $rubric=academicRead($db,'rubric',$subject,$section,'',$item['id']);
        $saved=sigmaSavedSubmissionAiResult($db,$subject,$section,$student,$item,$submission,$score,$rubric,$feedback);
        if($saved){echo json_encode(['success'=>true]+$saved);exit;}
        // Serialize queue creation/retry without blocking behind document analysis.
        $lock='sigma-queue:'.substr(academicKey($feedback?'feedback':'evaluation',$subject,$section,$student['id'],$item['id']),0,40);
        $q=$db->prepare('SELECT GET_LOCK(?,2)');$q->execute([$lock]);
        if(!(int)$q->fetchColumn())throw new RuntimeException('Please wait while the evaluation is being queued. Refresh to check again.');
        try{$job=sigmaQueueSubmissionAnalysis($db,$aiActor,$subject,$section,$student['id'],$item['id'],$feedback?'feedback':'evaluation',$item,($request['action']??'')==='retry');}
        finally{$q=$db->prepare('SELECT RELEASE_LOCK(?)');$q->execute([$lock]);}
        if(!$job)throw new InvalidArgumentException($feedback?'Save a grade for this submission attempt before generating feedback.':'This attempt could not be queued for AI evaluation. Refresh the submission and try again.');
        $waiting=in_array($job['state'],['pending','processing'],true)||($job['state']==='failed'&&($job['attempts']??0)<3);
        if($waiting && ($job['state']==='pending'||($job['state']==='failed'&&($job['retryAfter']??0)<=time())))sigmaStartSubmissionAnalysis();
        http_response_code(202);
        echo json_encode(['success'=>true,'pending'=>$waiting,'state'=>$job['state'],
            'retryAfter'=>$job['retryAfter']??0,'error'=>$waiting?'':($job['error']??'Evaluation did not complete. Refresh to re-evaluate.')]);exit;
    }
    echo json_encode(['success'=>true]+sigmaGenerateSavedSubmissionAi($db,$aiActor,$subject,$section,$student,$item,$request));
} catch (InvalidArgumentException $error) { http_response_code(400); echo json_encode(['success' => false, 'error' => $error->getMessage()]); }
catch (Throwable $error) { http_response_code(str_contains($error->getMessage(),'attempt changed')||str_contains($error->getMessage(),'changed during analysis')?409:502); echo json_encode(['success' => false, 'error' => $error instanceof RuntimeException ? $error->getMessage() : 'Submission evaluation is unavailable.']); }
