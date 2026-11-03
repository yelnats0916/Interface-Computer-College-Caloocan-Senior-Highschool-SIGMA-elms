<?php
require_once __DIR__.'/academic_evidence.php';
require_once __DIR__.'/submission_ai_generation.php';
require_once __DIR__.'/ai_generation_id.php';
require_once __DIR__.'/ai_record_store.php';
require_once __DIR__.'/submission_feedback_records.php';

function sigmaSavedSubmissionAiResult(PDO $db,array $subject,array $section,array $student,array $item,array $submission,?array $score,?array $rubric,bool $feedback): ?array {
    $old=academicRead($db,$feedback?'feedback':'evaluation',$subject,$section,$student['id'],$item['id']);
    if($feedback){
        $note=$old&&empty($old['feedbackPolicy'])?academicRead($db,'teacher_feedback',$subject,$section,$student['id'],$item['id']):null;
        return sigmaSubmissionFeedbackRecordIsCurrent($old,$submission,$score,$rubric,$item,$note)?$old['result']:null;
    }
    if($old && ($old['attemptIdentity']??'')===$submission['attemptIdentity']
        && ($old['rubricFingerprint']??'')===hash('sha256',json_encode($rubric))
        && ($old['curriculumFingerprint']??'')===hash('sha256',json_encode($item)))return $old['result'];
    return null;
}

// Shared by the authorized API and the CLI worker. All evidence remains server-owned.
function sigmaGenerateSavedSubmissionAi(PDO $db,array $aiActor,array $subject,array $section,array $student,array $item,array $request): array {
    try {
    $submission=academicRead($db,'submission',$subject,$section,$student['id'],$item['id']);
    if(!$submission)throw new InvalidArgumentException('A saved student submission is required.');
    $feedback=($request['mode']??'evaluation')==='feedback';
    require_once __DIR__.'/submission_ai_evidence.php';
    sigmaRequireSubmissionEvaluationEnabled($item,$feedback);
    if(!hash_equals((string)$submission['attemptIdentity'],(string)($request['attemptIdentity']??'')))throw new RuntimeException('The submission attempt changed. Open the latest submitted work.');
    $rubric=academicRead($db,'rubric',$subject,$section,'',$item['id']);
    $score=academicRead($db,'score',$subject,$section,$student['id'],$item['id']);
    // Retrieve saved analysis before downloading and extracting the documents again.
    $type=$feedback?'feedback':'evaluation';
    $saved=sigmaSavedSubmissionAiResult($db,$subject,$section,$student,$item,$submission,$score,$rubric,$feedback);
    if($saved)return $saved;
    $lock='sigma-work:'.substr(academicKey($type,$subject,$section,$student['id'],$item['id']),0,40);
    $q=$db->prepare('SELECT GET_LOCK(?,0)');$q->execute([$lock]);if(!(int)$q->fetchColumn())throw new RuntimeException('This submitted work is already being analyzed.');$locked=true;
    $saved=sigmaSavedSubmissionAiResult($db,$subject,$section,$student,$item,$submission,$score,$rubric,$feedback);
    if($saved)return $saved;
    // Share extraction between evaluation and post-grade feedback. The cache is
    // private, scoped to this student and exact saved file reference, and bounded.
    $reader=function(array $file,bool $allow)use($db,$aiActor,$subject,$section,$student): string {
        $id=hash('sha256',json_encode(['ocr-v1',$file]));
        $cached=academicRead($db,'submission_ai_text',$subject,$section,$student['id'],$id);
        if(($cached['expiresAt']??0)>time())return $cached['text'];
        $text=sigmaLearningFileText($file,$allow);
        if($text!=='')academicWrite($db,$aiActor,'submission_ai_text',$subject,$section,$student['id'],$id,['text'=>$text,'expiresAt'=>time()+300]);
        return $text;
    };
    $request=sigmaSubmissionAiEvidence($db,$subject,$section,$student,$item,$submission,$score,$rubric,$feedback,$reader);
    $fingerprint=hash('sha256',json_encode([$request,$submission['attemptIdentity'],$feedback?'submission-v1':null,$feedback?null:$rubric,$feedback?null:$item]));
    $old=academicRead($db,$type,$subject,$section,$student['id'],$item['id']);
    if(($old['fingerprint']??'')===$fingerprint){return $old['result'];}
    // Durable cooldown includes failed requests and cannot be bypassed by reloading a browser.
    $context=hash('sha256',$lock);$q=$db->prepare('SELECT payload FROM ai_generation_ledger WHERE owner_id=? AND context_key=?');$q->execute([$aiActor['id'],$context]);$ledger=json_decode($q->fetchColumn()?:'{}',true);
    if(($ledger['retryAfter']??0)>time())throw new RuntimeException('Please wait a few seconds before evaluating this work again.');
    $db->prepare('INSERT INTO ai_generation_ledger(owner_id,context_key,payload) VALUES(?,?,?) ON DUPLICATE KEY UPDATE payload=VALUES(payload)')->execute([$aiActor['id'],$context,json_encode(['retryAfter'=>time()+15])]);
    $services = require dirname(__DIR__, 2) . '/config/services.php';
    $providerAttempt=0;$fastFallback=aiRoutingConfig($services)['allow_fallback'];
    $result = generateSubmissionAi($services, $request, function ($url, $headers, $body)use(&$providerAttempt,$fastFallback) {
        $ch = curl_init($url);
        $timeout=$fastFallback?(++$providerAttempt===1?12:25):35;
        curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => json_encode($body), CURLOPT_HTTPHEADER => array_merge(['Content-Type: application/json'], $headers), CURLOPT_RETURNTRANSFER => true, CURLOPT_CONNECTTIMEOUT => 5, CURLOPT_TIMEOUT => $timeout, CURLOPT_SSL_VERIFYPEER => true, CURLOPT_SSL_VERIFYHOST => 2, CURLOPT_FOLLOWLOCATION => false]);
        $raw = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($raw === false || $code < 200 || $code >= 300) throw new SigmaSubmissionAiProviderException(match(true) {
            $code===429 => 'AI is busy or its quota was reached. Please wait, then refresh to re-evaluate.',
            in_array($code,[401,403],true) => 'The AI provider rejected access. Check the saved API key and its permissions, then refresh to re-evaluate.',
            $code===404 => 'The saved AI model is unavailable. Choose an available model, then refresh to re-evaluate.',
            $code===400 => 'The AI provider could not accept this evaluation request. Check the saved model and document, then refresh to re-evaluate.',
            $code>=500 => 'The AI service is busy or temporarily unavailable. Refresh to re-evaluate.',
            default => 'The AI service did not respond in time. Refresh to re-evaluate.'
        },(int)$code);
        return json_decode($raw, true) ?: [];
    });
    $result['generationId'] = sigmaAiGenerationId(($request['mode'] ?? 'evaluation') === 'feedback' ? 'feedback' : 'evaluation');
    // Kept for existing evaluation clients while they move to generationId.
    if (($request['mode'] ?? 'evaluation') !== 'feedback') $result['evaluationId'] = $result['generationId'];
    aiInsightControls($db);
    $db->beginTransaction();
    $latest=academicRead($db,'submission',$subject,$section,$student['id'],$item['id']);
    sigmaRequireSubmissionEvaluationEnabled(academicResolvedItem($db,$subject,$section,academicItem($subject,['itemId'=>$item['id']])),$feedback);
    $latestScore=academicRead($db,'score',$subject,$section,$student['id'],$item['id']);
    if(($latest['attemptIdentity']??'')!==$submission['attemptIdentity'])throw new RuntimeException('The work or teacher grade changed during analysis. Review the latest record.');
    academicWrite($db,$aiActor,$type,$subject,$section,$student['id'],$item['id'],['feedbackPolicy'=>$feedback?'submission-v1':null,'assessmentTitle'=>$request['title'],'fingerprint'=>$fingerprint,'attemptIdentity'=>$submission['attemptIdentity'],'result'=>$result,'teacherReviewed'=>false,'gradeFingerprint'=>hash('sha256',json_encode($score)),'rubricFingerprint'=>hash('sha256',json_encode($rubric)),'curriculumFingerprint'=>hash('sha256',json_encode($item)),'teacherNoteFingerprint'=>hash('sha256',json_encode(academicRead($db,'teacher_feedback',$subject,$section,$student['id'],$item['id'])))]);
    saveAiLog($db,['id'=>$result['generationId'],'userId'=>(string)$aiActor['id'],'feature'=>$feedback?'submission_feedback':'submission_evaluation','timestamp'=>gmdate('c'),'prompt'=>$request['title'],
        'actionDescription'=>$feedback?'Prepare feedback from the submitted attempt before teacher grading':'Suggest rubric evaluation for teacher review; not an official grade',
        'response'=>json_encode($feedback?$result['feedback']:['score'=>$result['score'],'criteria'=>$result['criteria'],'commentary'=>$result['commentary']]),
        'generationId'=>$result['generationId'],'model'=>$result['model'],'provider'=>$result['provider'],'keyId'=>$result['keyId'],'keyLabel'=>$result['keyLabel'],'status'=>$result['status']]);
    $db->prepare('DELETE FROM ai_generation_ledger WHERE owner_id=? AND context_key=?')->execute([$aiActor['id'],$context]);
    $db->commit();
    return $result;
    } finally {
        if($db->inTransaction())$db->rollBack();
        if(!empty($locked)){$q=$db->prepare('SELECT RELEASE_LOCK(?)');$q->execute([$lock]);}
    }
}
