<?php
require_once __DIR__.'/role_permissions.php';

function sigmaEnsureSectionNotificationSchema(PDO $db): void {
    $db->exec("CREATE TABLE IF NOT EXISTS notification_records (id CHAR(64) NOT NULL PRIMARY KEY,notification_id VARCHAR(191) NOT NULL,target_role VARCHAR(16) NOT NULL,actor_id VARCHAR(50) NOT NULL,payload MEDIUMTEXT NOT NULL,created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,audit_deleted TINYINT(1) NOT NULL DEFAULT 0,KEY audience(target_role)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
}

/** Build one grouped deployment notification per other authorized administrator. */
function sigmaSectionDeploymentNotifications(array $actor, array $rows, array $users): array {
    $rows=array_values(array_filter($rows,fn($row)=>empty($row['is_deleted'])&&in_array(strtolower($row['status']??''),['deployed','published'],true)));
    if (!$rows) return [];
    $first=$rows[0];$name=$first['name'];$grade=$first['grade_level']??$first['grade']??'';$year=$first['school_year']??$first['schoolYear']??'';
    $subjects=array_values(array_unique(array_filter(array_column($rows,'subject'))));sort($subjects);
    $group=hash('sha256',json_encode([$name,$grade,$year,(string)$actor['id']]));$notifications=[];
    foreach($users as $user){
        $role=preg_replace('/[\s_-]+/','',strtolower($user['role']??''));
        if(!in_array($role,['admin','masteradmin','administrator'],true)||!empty($user['is_deleted'])||strtolower($user['status']??'')!=='active'||(string)$user['id']===(string)$actor['id'])continue;
        if(!sigmaActorPermission($user,'schoolMain')||!sigmaActorPermission($user,'schoolSections'))continue;
        $id='section-deployed-'.$group.'-'.$user['id'];
        $notifications[]=['id'=>$id,'title'=>$name.' – '.$grade.' deployed','body'=>count($subjects).' subject'.(count($subjects)===1?'':'s').' deployed for S.Y. '.$year.'. Subjects: '.implode(', ',$subjects),
            'type'=>'section-deployed','icon'=>'fa-solid fa-layer-group','target'=>['sectionId'=>$first['id'],'sectionName'=>$name],
            'recipientId'=>(string)$user['id'],'recipientName'=>$user['full_name']??trim(($user['first_name']??'').' '.($user['last_name']??'')),
            'senderId'=>(string)$actor['id'],'senderName'=>$actor['full_name']??'Administrator','senderRole'=>$actor['role'],'senderType'=>'user',
            'recipients'=>[['id'=>(string)$user['id'],'name'=>$user['full_name']??'Administrator','role'=>$user['role'],'readAt'=>null]]];
    }
    return $notifications;
}

function sigmaPersistSectionDeploymentNotifications(PDO $db, array $actor, array $section): void {
    $q=$db->prepare('SELECT id,name,grade_level,school_year,subject,status,is_deleted FROM sections WHERE name=? AND grade_level=? AND school_year=? AND is_deleted=0');
    $q->execute([$section['name'],$section['grade']??$section['grade_level'],$section['schoolYear']??$section['school_year']]);
    $rows=$q->fetchAll(PDO::FETCH_ASSOC);
    $users=$db->query('SELECT id,first_name,last_name,full_name,role,status,is_deleted,permissions FROM users')->fetchAll(PDO::FETCH_ASSOC);
    $write=$db->prepare('INSERT INTO notification_records(id,notification_id,target_role,actor_id,payload) VALUES(?,?,?,?,?) ON DUPLICATE KEY UPDATE payload=VALUES(payload),actor_id=VALUES(actor_id)');
    foreach(sigmaSectionDeploymentNotifications($actor,$rows,$users) as $notification){
        $id=hash('sha256','admin|'.$notification['id'].'|'.$notification['recipientId']);
        $write->execute([$id,$notification['id'],'admin',(string)$actor['id'],json_encode($notification,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR)]);
    }
}
