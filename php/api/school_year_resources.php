<?php
header('Content-Type: application/json; charset=utf-8');header('Cache-Control: no-store');
require_once __DIR__.'/../includes/application_auth.php';
require_once __DIR__.'/../includes/service_vault_auth.php';
require_once __DIR__.'/../includes/school_year_resources.php';
require_once dirname(__DIR__,2).'/config/database.php';
restrictServiceOrigin();
if(($_SERVER['REQUEST_METHOD']??'GET')!=='GET'){http_response_code(405);echo json_encode(['success'=>false,'error'=>'Unsupported method.']);exit;}
$actor=sigmaRequireApplicationActor($pdo,['masteradmin','admin','administrator','teacher','student']);
try{
    $years=$pdo->query('SELECT id,year_start AS yearStart,year_end AS yearEnd,status FROM school_years WHERE is_deleted=0 ORDER BY year_start DESC')->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['success'=>true,'records'=>sigmaSchoolYearResourceHistory($pdo,$actor),'schoolYears'=>$years],JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);
}catch(Throwable $error){error_log('Archived resources: '.$error->getMessage());http_response_code(503);echo json_encode(['success'=>false,'error'=>'Archived resources could not be loaded. Please retry.']);}
