<?php
header('Content-Type: application/json'); header('Cache-Control: no-store');
require_once __DIR__ . '/../includes/ai_record_store.php';
restrictServiceOrigin();
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Sigma-Actor');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
if(($_SERVER['REQUEST_METHOD']??'')==='OPTIONS')exit;
// Like analytics generation, browser-owned evidence is development-only until server login is connected.
if(!in_array($_SERVER['REMOTE_ADDR']??'', ['127.0.0.1','::1'],true) || !in_array(strtolower(parse_url('http://'.($_SERVER['HTTP_HOST']??''),PHP_URL_HOST)?:''),['localhost','127.0.0.1','[::1]'],true)){
    http_response_code(403); echo json_encode(['success'=>false,'error'=>'Database-backed account authentication is required before remote AI record access.']);exit;
}
try{
    $db=serviceSettingsPdo(); $actor=lifecycleActor();
    $q=$db->prepare('SELECT role FROM users WHERE id=? AND is_deleted=0 AND LOWER(status)=\'active\'');$q->execute([$actor]);$role=strtolower(preg_replace('/[\s_-]+/','',$q->fetchColumn()?:''));
    if(!$role){
        echo json_encode(['success'=>false,'code'=>'account_not_synced','error'=>'AI records are unavailable until this account is synced to the database and active.']);
        exit;
    }
    $admin=in_array($role,['admin','masteradmin'],true);
    $method=$_SERVER['REQUEST_METHOD']??'';
    $input=$_GET;
    if($method==='POST'){
        $raw=file_get_contents('php://input',false,null,0,512001);if(strlen($raw)>512000)throw new InvalidArgumentException('Too much AI record data.');
        $input=json_decode($raw,true,64,JSON_THROW_ON_ERROR);
    }elseif($method!=='GET')throw new InvalidArgumentException('Unsupported request method.');
    $action=$input['action']??'';
    if($action==='report' && $method==='GET'){
        if(!$admin)throw new RuntimeException('Only administrators can read insight reports.');
        $users=$db->query("SELECT id,full_name,first_name,last_name,role FROM users WHERE is_deleted=0 AND LOWER(REPLACE(role,' ','')) IN ('student','teacher') ORDER BY full_name,id")->fetchAll();
        $owners=[];
        foreach($users as $user){
            $kind=strtolower($user['role']);
            $result=aiAnalyticsState($db,$user['id'],$kind);
            $owners[]=['id'=>$user['id'],'name'=>$user['full_name']?:trim($user['first_name'].' '.$user['last_name']),'role'=>$kind,'cards'=>$result['state']['cards'],'lastAnalyzed'=>$result['state']['lastAnalyzed']??null];
        }
        echo json_encode(['success'=>true,'users'=>$owners]);
    }elseif($action==='logs'){
        if(!$admin)throw new RuntimeException('Only administrators can read all AI logs.');
        echo json_encode(['success'=>true,'logs'=>aiRecordLogs($db)]);
    }elseif($action==='save_log'&&$method==='POST'){
        $log=$input['log']??[];if(!$admin&&($log['userId']??'')!==$actor)throw new RuntimeException('This log belongs to another account.');
        saveAiLog($db,$log);echo json_encode(['success'=>true]);
    }elseif(in_array($action,['state','save_state'],true)){
        $user=$input['userId']??$actor;$kind=$input['kind']??'';
        if(!$admin&&($user!==$actor||$kind!==$role))throw new RuntimeException('This insight belongs to another account.');
        if(!in_array($kind,['student','teacher'],true)||!is_string($user)||strlen($user)>50)throw new InvalidArgumentException('Invalid insight owner.');
        $result=$action==='save_state'&&$method==='POST'?saveAiAnalyticsState($db,$user,$kind,$input['state']??[],(int)($input['revision']??-1)):aiAnalyticsState($db,$user,$kind);
        echo json_encode(['success'=>true]+$result);
    }else throw new InvalidArgumentException('Unsupported AI record action.');
}catch(Throwable $e){http_response_code($e instanceof InvalidArgumentException?400:409);echo json_encode(['success'=>false,'error'=>$e->getMessage()]);}
