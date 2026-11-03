<?php
function sigmaSaveNotificationReads(PDO $db,string $actorId,string $role,array $ids): void {
    $ids=array_values(array_unique($ids));
    if(!$ids||count($ids)>500||array_filter($ids,fn($id)=>!is_string($id)||!preg_match('/^[a-f0-9]{64}$/D',$id)))throw new InvalidArgumentException('Invalid notification read receipts.');
    $q=$db->prepare('SELECT id,target_role,payload FROM notification_records WHERE id IN ('.implode(',',array_fill(0,count($ids),'?')).')');$q->execute($ids);$rows=$q->fetchAll(PDO::FETCH_ASSOC);
    if(count($rows)!==count($ids))throw new InvalidArgumentException('Notification not found.');
    foreach($rows as $row){
        $notification=json_decode($row['payload'],true)?:[];
        if($row['target_role']!==$role||!in_array($actorId,array_map('strval',array_column($notification['recipients']??[],'id')),true))throw new RuntimeException('This notification belongs to another recipient.');
    }
    $own=!$db->inTransaction();if($own)$db->beginTransaction();
    try{
        $insert=$db->prepare('INSERT IGNORE INTO notification_receipts(notification_id,user_id) VALUES(?,?)');
        foreach($ids as $id)$insert->execute([$id,$actorId]);
        if($own)$db->commit();
    }catch(Throwable $e){if($own&&$db->inTransaction())$db->rollBack();throw $e;}
}
