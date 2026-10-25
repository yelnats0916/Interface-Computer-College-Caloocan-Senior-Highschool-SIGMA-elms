<?php
header('Content-Type: application/json; charset=utf-8');header('Cache-Control: no-store');
require_once __DIR__.'/../includes/ai_request_auth.php';
require_once __DIR__.'/../includes/attendance_records.php';
restrictServiceOrigin();
header('Access-Control-Allow-Headers: Content-Type, Authorization');header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
if(($_SERVER['REQUEST_METHOD']??'')==='OPTIONS')exit;
$actor=sigmaRequireAiActor(['student','teacher','admin','masteradmin','administrator']);
try {
    $db=serviceSettingsPdo();
    if($_SERVER['REQUEST_METHOD']==='GET')$result=attendanceSnapshot($db,$actor);
    elseif($_SERVER['REQUEST_METHOD']==='POST'){
        $raw=file_get_contents('php://input',false,null,0,2000001);if(strlen($raw)>2000000)throw new InvalidArgumentException('Attendance exceeds the supported size.');
        $input=json_decode($raw,true,64,JSON_THROW_ON_ERROR);sigmaRequireRealRecords($input);$db->beginTransaction();
        if(($input['action']??'')==='import-context')$result=['success'=>true,'context'=>attendanceImportContext($db,$actor,$input)['context']];
        elseif(($input['action']??'')==='import')$result=attendanceImport($db,$actor,$input);
        else $result=['success'=>true]+attendanceSubmit($db,$actor,$input);
        $db->commit();
    }else throw new InvalidArgumentException('Unsupported request method.');
    echo json_encode($result,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);
}catch(Throwable $error){if(isset($db)&&$db->inTransaction())$db->rollBack();http_response_code($error instanceof InvalidArgumentException?400:409);echo json_encode(['success'=>false,'error'=>$error->getMessage()]);}
