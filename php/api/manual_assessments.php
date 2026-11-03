<?php
header('Content-Type: application/json; charset=utf-8');header('Cache-Control: no-store');
require_once __DIR__.'/../includes/ai_request_auth.php';
require_once __DIR__.'/../includes/manual_assessments.php';
restrictServiceOrigin();
if(($_SERVER['REQUEST_METHOD']??'')==='OPTIONS')exit;
$actor=sigmaRequireAiActor(['student','teacher','admin','masteradmin','administrator']);
try{
    $db=serviceSettingsPdo();$method=$_SERVER['REQUEST_METHOD']??'';
    if($method==='POST'){
        $raw=file_get_contents('php://input',false,null,0,16001);
        if(strlen($raw)>16000)throw new InvalidArgumentException('Assessment request is too large.');
        $input=json_decode($raw,true,32,JSON_THROW_ON_ERROR);
        if(!is_array($input))throw new InvalidArgumentException('Invalid assessment request.');
        sigmaRequireRealRecords($input);
        manualAssessmentSave($db,$actor,$input,$savedScore,$savedAssessment);
        // Inline score edits need only their committed value. Avoid rebuilding
        // every assessment/roster in this account before acknowledging one cell.
        if(($input['response']??'')==='score' && $savedScore!==null){
            echo json_encode(['success'=>true,'userId'=>(string)$actor['id'],'savedScore'=>$savedScore],JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);exit;
        }
        // Assessment creation and edits should acknowledge only the affected row.
        // Returning the entire teacher's gradebook here caused a slow N+1 query
        // across every manual assessment and its scores before the modal closed.
        if(($input['action']??'')==='delete'){
            echo json_encode(['success'=>true,'userId'=>(string)$actor['id'],'deletedAssessmentId'=>(string)$input['id']],JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);exit;
        }
        if($savedAssessment!==null){
            echo json_encode(['success'=>true,'userId'=>(string)$actor['id'],'savedAssessment'=>$savedAssessment],JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);exit;
        }
    }elseif($method!=='GET')throw new InvalidArgumentException('Unsupported request method.');
    echo json_encode(['success'=>true,'userId'=>(string)$actor['id'],'records'=>manualAssessmentRows($db,$actor)],JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);
}catch(Throwable $error){
    if(isset($db)&&$db->inTransaction())$db->rollBack();
    http_response_code($error instanceof InvalidArgumentException?422:400);
    echo json_encode(['success'=>false,'error'=>$error instanceof PDOException?'The assessment could not be saved. Please try again.':$error->getMessage()]);
}
