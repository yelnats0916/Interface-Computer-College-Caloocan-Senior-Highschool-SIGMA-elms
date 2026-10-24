<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
require_once __DIR__.'/../includes/service_vault_auth.php';
require_once __DIR__.'/../includes/application_auth.php';
require_once __DIR__.'/../includes/teacher_classrooms.php';
restrictServiceOrigin();
if(($_SERVER['REQUEST_METHOD']??'GET')!=='GET'){http_response_code(405);echo json_encode(['success'=>false,'error'=>'Unsupported method.']);exit;}
require_once dirname(__DIR__,2).'/config/database.php';
try{
    $actor=sigmaRequireApplicationActor($pdo,['teacher']);
    echo json_encode(sigmaTeacherClassrooms($pdo,$actor),JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
}catch(Throwable $error){error_log('Teacher classrooms: '.$error->getMessage());http_response_code(503);echo json_encode(['success'=>false,'error'=>'Assigned classes could not load. Please try again.']);}
