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
    $submission=academicRead($db,'submission',$subject,$section,$student['id'],$item['id']);
    if(!$submission || !trim($submission['text']??''))throw new InvalidArgumentException('The student must sync a readable submission to the live site before AI evaluation.');
    if(!hash_equals((string)$submission['attemptIdentity'],(string)($request['attemptIdentity']??'')))throw new RuntimeException('The submission attempt changed. Open the latest submitted work.');
    $rubric=academicRead($db,'rubric',$subject,$section,'',$item['id']);
    $score=academicRead($db,'score',$subject,$section,$student['id'],$item['id']);
    $feedback=($request['mode']??'evaluation')==='feedback';
    if($feedback && (!is_numeric($score['score']??null)||($score['attemptIdentity']??'')!==$submission['attemptIdentity']))throw new InvalidArgumentException('Save the teacher grade for this submitted attempt before generating feedback.');
    $criteriaMap=['content'=>'Content and Understanding','process'=>'Process and Methodology','organization'=>'Organization and Structure','analysis'=>'Critical Analysis and Insight'];
    $autoSelect=($item['data']['criteriaAiAuto']??true)!==false;
    $selected=$item['data']['selectedCriteria']??[];
    if(!$autoSelect&&!$selected&&is_array($item['data']['criteria']??null)){
        $criteriaMap=[];foreach($item['data']['criteria'] as $i=>$criterion){
            $id=is_array($criterion)?(string)($criterion['id']??'c-'.$i):'c-'.$i;
            $title=is_array($criterion)?academicText($criterion['title']??$criterion['name']??'',200):academicText($criterion,200);
            if($title)$criteriaMap[$id]=$title;
        }
    }
    $criteria=[];foreach($criteriaMap as $id=>$title)if($autoSelect||!$selected||in_array($id,$selected,true)||in_array($title,$selected,true))$criteria[]=['id'=>$id,'title'=>$title];
    $request=['title'=>academicText($item['data']['title']??$item['data']['name']??'',200),'instructions'=>academicText($item['data']['instructions']??$item['data']['description']??'',10000),
        'assessmentType'=>(string)($item['data']['type']??$item['data']['category']??'assessment'),'isQuiz'=>!empty($item['data']['quizId'])||!empty($item['data']['selectedQuizId']),
        'maxScore'=>academicMaximum($item),'rubricText'=>$rubric['text']??academicText($item['data']['rubricText']??'',60000),'submissionText'=>$submission['text'],'criteria'=>$criteria,
        'autoSelect'=>$autoSelect,'mode'=>$feedback?'feedback':'evaluation','teacherScore'=>$score['score']??null,'teacherFeedback'=>academicText((academicRead($db,'teacher_feedback',$subject,$section,$student['id'],$item['id'])['text']??'').' '.($score['feedback']??''),5000)];
    $fingerprint=hash('sha256',json_encode([$request,$submission['attemptIdentity']]));
    $type=$feedback?'feedback':'evaluation';
    $lock='sigma-work:'.substr(academicKey($type,$subject,$section,$student['id'],$item['id']),0,40);
    $q=$db->prepare('SELECT GET_LOCK(?,0)');$q->execute([$lock]);if(!(int)$q->fetchColumn())throw new RuntimeException('This submitted work is already being analyzed.');$locked=true;
    $old=academicRead($db,$type,$subject,$section,$student['id'],$item['id']);
    if(($old['fingerprint']??'')===$fingerprint){echo json_encode(['success'=>true]+$old['result']);exit;}
    // Durable cooldown includes failed requests and cannot be bypassed by reloading a browser.
    $context=hash('sha256',$lock);$q=$db->prepare('SELECT payload FROM ai_generation_ledger WHERE owner_id=? AND context_key=?');$q->execute([$aiActor['id'],$context]);$ledger=json_decode($q->fetchColumn()?:'{}',true);
    if(($ledger['retryAfter']??0)>time())throw new RuntimeException('Please wait a few minutes before evaluating this work again.');
    $db->prepare('INSERT INTO ai_generation_ledger(owner_id,context_key,payload) VALUES(?,?,?) ON DUPLICATE KEY UPDATE payload=VALUES(payload)')->execute([$aiActor['id'],$context,json_encode(['retryAfter'=>time()+300])]);
    $services = require dirname(__DIR__, 2) . '/config/services.php';
    $result = generateSubmissionAi($services, $request, function ($url, $headers, $body) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => json_encode($body), CURLOPT_HTTPHEADER => array_merge(['Content-Type: application/json'], $headers), CURLOPT_RETURNTRANSFER => true, CURLOPT_CONNECTTIMEOUT => 10, CURLOPT_TIMEOUT => 60, CURLOPT_SSL_VERIFYPEER => true, CURLOPT_SSL_VERIFYHOST => 2, CURLOPT_FOLLOWLOCATION => false]);
        $raw = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($raw === false || $code < 200 || $code >= 300) throw new RuntimeException($code === 429 ? 'AI quota reached. Try again later.' : 'Submission evaluation failed. Check the saved provider key and model.');
        return json_decode($raw, true) ?: [];
    });
    $result['generationId'] = sigmaAiGenerationId(($request['mode'] ?? 'evaluation') === 'feedback' ? 'feedback' : 'evaluation');
    // Kept for existing evaluation clients while they move to generationId.
    if (($request['mode'] ?? 'evaluation') !== 'feedback') $result['evaluationId'] = $result['generationId'];
    aiInsightControls($db);
    $db->beginTransaction();
    $latest=academicRead($db,'submission',$subject,$section,$student['id'],$item['id']);
    $latestScore=academicRead($db,'score',$subject,$section,$student['id'],$item['id']);
    if(($latest['attemptIdentity']??'')!==$submission['attemptIdentity'] || ($feedback&&$latestScore!==$score))throw new RuntimeException('The work or teacher grade changed during analysis. Review the latest record.');
    academicWrite($db,$aiActor,$type,$subject,$section,$student['id'],$item['id'],['fingerprint'=>$fingerprint,'attemptIdentity'=>$submission['attemptIdentity'],'result'=>$result,'teacherReviewed'=>false,'gradeFingerprint'=>hash('sha256',json_encode($score)),'rubricFingerprint'=>hash('sha256',json_encode($rubric)),'curriculumFingerprint'=>hash('sha256',json_encode($item)),'teacherNoteFingerprint'=>hash('sha256',json_encode(academicRead($db,'teacher_feedback',$subject,$section,$student['id'],$item['id'])))]);
    saveAiLog($db,['id'=>$result['generationId'],'userId'=>(string)$aiActor['id'],'feature'=>$feedback?'submission_feedback':'submission_evaluation','timestamp'=>gmdate('c'),'prompt'=>$request['title'],
        'actionDescription'=>$feedback?'Generate guidance from saved teacher grade and submitted work':'Suggest rubric evaluation for teacher review; not an official grade',
        'response'=>json_encode($feedback?$result['feedback']:['score'=>$result['score'],'criteria'=>$result['criteria'],'commentary'=>$result['commentary']]),
        'generationId'=>$result['generationId'],'model'=>$result['model'],'provider'=>$result['provider'],'keyId'=>$result['keyId'],'keyLabel'=>$result['keyLabel'],'status'=>$result['status']]);
    $db->prepare('DELETE FROM ai_generation_ledger WHERE owner_id=? AND context_key=?')->execute([$aiActor['id'],$context]);
    $db->commit();
    echo json_encode(['success'=>true]+$result);
} catch (InvalidArgumentException $error) { http_response_code(400); echo json_encode(['success' => false, 'error' => $error->getMessage()]); }
catch (Throwable $error) { http_response_code(502); echo json_encode(['success' => false, 'error' => $error instanceof RuntimeException ? $error->getMessage() : 'Submission evaluation is unavailable.']); }

finally { if(isset($db)&&$db->inTransaction())$db->rollBack();if(!empty($locked)){$q=$db->prepare('SELECT RELEASE_LOCK(?)');$q->execute([$lock]);} }
