<?php
header('Content-Type: application/json; charset=utf-8');header('Cache-Control: no-store');
require_once __DIR__.'/../includes/service_vault_auth.php';require_once __DIR__.'/../includes/application_auth.php';
require_once __DIR__.'/../includes/material_limits.php';require_once __DIR__.'/../includes/role_permissions.php';
restrictServiceOrigin();
try {
    $db=serviceSettingsPdo();$settings=loadServiceSettings();
    if(($_SERVER['REQUEST_METHOD']??'')==='GET'){
        echo json_encode(['success'=>true,'configured'=>isset($settings['material_limits']),'limits'=>sigmaMaterialLimits($settings['material_limits']??[]),'serverUploadMax'=>ini_get('upload_max_filesize'),'serverPostMax'=>ini_get('post_max_size')]);exit;
    }
    if(($_SERVER['REQUEST_METHOD']??'')!=='POST'){http_response_code(405);echo json_encode(['success'=>false,'error'=>'Unsupported method.']);exit;}
    $actor=sigmaRequireApplicationActor($db,['admin','masteradmin','administrator']);
    if(!sigmaActorPermission($actor,'settingsApi')){http_response_code(403);echo json_encode(['success'=>false,'error'=>'You cannot change file upload limits.']);exit;}
    $raw=file_get_contents('php://input',false,null,0,16385);if(strlen($raw)>16384)throw new InvalidArgumentException('Settings payload is too large.');
    $input=json_decode($raw,true,16,JSON_THROW_ON_ERROR);
    $db->beginTransaction();$db->query('SELECT id FROM system_service_settings WHERE id=1 FOR UPDATE');
    $settings=loadServiceSettings();$limits=sigmaUpdateMaterialLimits($settings['material_limits']??[],$input['limits']??[],(string)($input['scope']??''));
    $settings['material_limits']=$limits;saveServiceSettings($settings);$db->commit();
    echo json_encode(['success'=>true,'configured'=>true,'limits'=>$limits]);
} catch(Throwable $error){if(isset($db)&&$db->inTransaction())$db->rollBack();$invalid=$error instanceof InvalidArgumentException||$error instanceof JsonException;http_response_code($invalid?422:503);echo json_encode(['success'=>false,'error'=>$invalid?$error->getMessage():'File limit settings are temporarily unavailable.']);}
