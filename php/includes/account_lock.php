<?php
function sigmaSetAccountLock(PDO $db,array $actor,string $userId,bool $locked): array {
    $role=preg_replace('/[\s_-]+/','',strtolower($actor['role']??''));
    if(!in_array($role,['admin','administrator','masteradmin'],true))throw new RuntimeException('Administrator access required.');
    $own=!$db->inTransaction();if($own)$db->beginTransaction();
    try{
        $q=$db->prepare('SELECT * FROM users WHERE id=? AND is_deleted=0 FOR UPDATE');$q->execute([$userId]);$target=$q->fetch(PDO::FETCH_ASSOC);
        if(!$target)throw new InvalidArgumentException('Account not found.');
        if($role!=='masteradmin'){
            $permission=['Student'=>'manageStudents','Teacher'=>'manageTeachers','Admin'=>'manageAdmins'][$target['role']]??null;
            if(!$permission||!sigmaActorPermission($actor,$permission)||!sigmaActorPermission($actor,'actionLock'))throw new RuntimeException('Your role cannot lock or unlock this account.');
        }
        if(!in_array(strtolower($target['status']),['active','locked'],true))throw new RuntimeException('Reactivate this account before changing its lock.');
        if($locked&&$userId===(string)$actor['id'])throw new RuntimeException('You cannot lock your own signed-in account.');
        $status=$locked?'Locked':'Active';
        $db->prepare('UPDATE users SET status=? WHERE id=?')->execute([$status,$userId]);
        $db->prepare('DELETE FROM grade_sync_attempts WHERE client_hash=?')->execute([hash('sha256','account-password:'.$userId)]);
        if($locked)sigmaRevokeAccountSessions($db,$userId);
        sigmaRecordActivity($db,(string)$actor['id'],$locked?'Locked User Account':'Unlocked User Account','Users','Account ID: '.$userId);
        if($own)$db->commit();$target['status']=$status;return $target;
    }catch(Throwable $e){if($own&&$db->inTransaction())$db->rollBack();throw $e;}
}
