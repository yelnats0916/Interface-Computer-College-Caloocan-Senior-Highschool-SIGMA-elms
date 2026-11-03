<?php
header('Content-Type: application/json; charset=utf-8');header('Cache-Control: no-store');
require_once __DIR__.'/../includes/service_vault_auth.php';
require_once __DIR__.'/../includes/application_auth.php';
restrictServiceOrigin();require_once dirname(__DIR__,2).'/config/database.php';
$actor=sigmaRequireApplicationActor($pdo,['admin','masteradmin','administrator']);
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS dashboard_preferences (user_id VARCHAR(64) NOT NULL PRIMARY KEY, metric_ids TEXT NOT NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $ids=null;
    if(($_SERVER['REQUEST_METHOD']??'GET')==='POST'){
        $input=json_decode(file_get_contents('php://input',false,null,0,4097),true,8,JSON_THROW_ON_ERROR);
        if(!is_array($input['metrics']??null)||count($input['metrics'])>6)throw new InvalidArgumentException('Invalid metric selection.');
        $allowed=['metric-health','metric-ai','metric-storage','metric-security','metric-database','metric-grading'];
        $ids=array_values(array_unique(array_intersect($input['metrics'],$allowed)));
        $q=$pdo->prepare('INSERT INTO dashboard_preferences (user_id,metric_ids) VALUES (?,?) ON DUPLICATE KEY UPDATE metric_ids=VALUES(metric_ids)');$q->execute([(string)$actor['id'],json_encode($ids)]);
    }elseif(($_SERVER['REQUEST_METHOD']??'GET')==='GET'){
        $q=$pdo->prepare('SELECT metric_ids FROM dashboard_preferences WHERE user_id=?');$q->execute([(string)$actor['id']]);$raw=$q->fetchColumn();$ids=$raw===false?null:json_decode($raw,true);
    }else{http_response_code(405);throw new InvalidArgumentException('Unsupported method.');}
    echo json_encode(['success'=>true,'userId'=>(string)$actor['id'],'metrics'=>$ids]);
}catch(Throwable $e){http_response_code(422);echo json_encode(['success'=>false,'error'=>'Your dashboard preferences could not be saved.']);}
