<?php
require_once __DIR__.'/../../config/database.php';
require_once __DIR__.'/../includes/service_vault_auth.php';
require_once __DIR__.'/../includes/application_auth.php';
require_once __DIR__.'/../includes/maintenance_policy.php';
require_once __DIR__.'/../includes/activity_audit.php';
header('Content-Type: application/json; charset=utf-8');header('Cache-Control: no-store');restrictServiceOrigin();
try{
    if(($_SERVER['REQUEST_METHOD']??'')==='GET'){
        $reply=['success'=>true,'state'=>sigmaMaintenanceState(sigmaMaintenanceConfig())];
        if(($_GET['action']??'')==='manage'){
            $actor=sigmaRequireApplicationActor($pdo,['masteradmin','admin']);
            if(!sigmaMaintenanceCanManage($actor)){http_response_code(403);echo json_encode(['success'=>false,'error'=>'Maintenance management permission is required.']);exit;}
            $reply['history']=sigmaMaintenanceHistory($pdo,sigmaMaintenanceConfig());
        }
        echo json_encode($reply);exit;
    }
    if(($_SERVER['REQUEST_METHOD']??'')!=='POST'){http_response_code(405);exit;}
    $actor=sigmaRequireApplicationActor($pdo,['masteradmin','admin']);
    if(!sigmaMaintenanceCanManage($actor)){http_response_code(403);echo json_encode(['success'=>false,'error'=>'Maintenance management permission is required.']);exit;}
    requireServiceVaultAccess('maintenance');
    $raw=file_get_contents('php://input',false,null,0,8193);if(strlen($raw)>8192)throw new InvalidArgumentException('Maintenance request is too large.');
    $input=json_decode($raw,true,16,JSON_THROW_ON_ERROR);$action=$input['action']??'';
    if(!in_array($action,['manual','schedule','cancel'],true))throw new InvalidArgumentException('Unsupported maintenance action.');
    $pdo->beginTransaction();$pdo->query('SELECT id FROM system_service_settings WHERE id=1 FOR UPDATE');
    $settings=loadServiceSettings();$config=$settings['maintenance']??[];
    $oldPost=isset($config['schedule']['id'])?'maintenance-'.$config['schedule']['id']:null;
    if($action==='manual'){
        if(!is_bool($input['enabled']??null))throw new InvalidArgumentException('Invalid maintenance setting.');
        $config['enabled']=$input['enabled'];
        if(!$input['enabled']&&sigmaMaintenanceState($config)['scheduleStatus']==='active')$config['schedule']['canceled']=true;
    }elseif($action==='cancel'){
        if(isset($config['schedule']))$config['schedule']['canceled']=true;
    }else{
        $message=sigmaMaintenanceNoticeText($input['message']??'',1000,'notice message');$title=sigmaMaintenanceNoticeText($input['title']??'',120,'notice title');
        $window=sigmaMaintenanceWindow((string)($input['start']??''),(string)($input['end']??''));
        $config['message']=$message;$config['title']=$title;$config['schedule']=$window+['id'=>bin2hex(random_bytes(12)),'canceled'=>false];
        foreach($config['history']??[] as $i=>$entry)if($entry['id']===$oldPost)$config['history'][$i]['status']='replaced';
        $config['channels']=['calendar'=>true,'announcement'=>true,'banner'=>true];
        if(!empty($config['channels']['announcement'])){
            $post=sigmaMaintenancePost($config,$actor);
            $pdo->prepare('INSERT INTO school_announcements(id,author_id,payload) VALUES(?,?,?)')->execute([$post['id'],$actor['id'],json_encode($post,JSON_THROW_ON_ERROR)]);
        }
        $config['history'][]=['id'=>'maintenance-'.$config['schedule']['id'],'title'=>$title,'message'=>$message,'startAt'=>$window['startAt'],'endAt'=>$window['endAt'],'channels'=>$config['channels'],'publishedAt'=>gmdate('c'),'publisherId'=>(string)$actor['id'],'publisher'=>trim($actor['full_name']??'')?:trim(($actor['first_name']??'').' '.($actor['last_name']??'')),'status'=>'scheduled'];
    }
    if(!empty($config['schedule']['canceled']))foreach($config['history']??[] as $i=>$entry)if($entry['id']===$oldPost)$config['history'][$i]['status']='canceled';
    if($oldPost && ($action!=='manual'||!empty($config['schedule']['canceled'])))$pdo->prepare('UPDATE school_announcements SET is_deleted=1 WHERE id=?')->execute([$oldPost]);
    $config['updatedAt']=gmdate('c');$config['updatedBy']=(string)$actor['id'];$settings['maintenance']=$config;
    if(!saveServiceSettings($settings))throw new RuntimeException('Maintenance could not be saved.');
    sigmaRecordActivity($pdo,(string)$actor['id'],'Maintenance '.$action,'System Settings','Updated the shared maintenance schedule and notices.');
    $pdo->commit();echo json_encode(['success'=>true,'state'=>sigmaMaintenanceState($config),'history'=>sigmaMaintenanceHistory($pdo,$config)]);
}catch(Throwable $error){if($pdo&&$pdo->inTransaction())$pdo->rollBack();http_response_code($error instanceof InvalidArgumentException||$error instanceof JsonException?422:503);echo json_encode(['success'=>false,'error'=>$error instanceof PDOException?'Maintenance settings are temporarily unavailable.':$error->getMessage()]);}
