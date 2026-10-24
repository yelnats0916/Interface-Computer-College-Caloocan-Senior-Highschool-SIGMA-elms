<?php
function sigmaPasswordLockoutLimit(array $settings): int {
    $value=$settings['login_security']['password_attempts']??8;
    return is_numeric($value) ? max(1,min(50,(int)$value)) : 8;
}

/** Count consecutive wrong passwords against the account, across ID/email and clients. */
function sigmaCheckLoginCredentials(PDO $db,string $login,string $password,int $limit): array {
    $db->beginTransaction();
    try {
        $lock=$db->getAttribute(PDO::ATTR_DRIVER_NAME)==='mysql'?' FOR UPDATE':'';
        $q=$db->prepare('SELECT * FROM users WHERE (id=? OR LOWER(email)=LOWER(?)) AND is_deleted=0 LIMIT 1'.$lock);
        $q->execute([$login,$login]);$user=$q->fetch(PDO::FETCH_ASSOC);
        $failure=null;
        if(!$user) $failure=['code'=>'invalid_login_id','error'=>'Enter valid ID or email.'];
        elseif(strtolower($user['status'])==='locked') $failure=['code'=>'account_locked','error'=>'The account is locked. Please contact Administrative personnel'];
        elseif(strtolower($user['status'])!=='active') $failure=['code'=>'account_inactive','error'=>'Invalid credentials. Please check your Email or Login ID and password.'];
        elseif($password===''||strlen($password)>256) $failure=['code'=>'password_required','error'=>'Password is required.'];
        else {
            $key=hash('sha256','account-password:'.$user['id']);
            $valid=password_verify($password,$user['password']) || (password_get_info($user['password'])['algo']===null && hash_equals($user['password'],$password));
            if($valid) $db->prepare('DELETE FROM grade_sync_attempts WHERE client_hash=?')->execute([$key]);
            else {
                $q=$db->prepare('SELECT attempts FROM grade_sync_attempts WHERE client_hash=?');$q->execute([$key]);$count=(int)$q->fetchColumn()+1;
                $db->prepare('DELETE FROM grade_sync_attempts WHERE client_hash=?')->execute([$key]);
                if($count>=max(1,$limit)) {
                    $db->prepare("UPDATE users SET status='Locked' WHERE id=?")->execute([$user['id']]);
                    $db->prepare('DELETE FROM grade_sync_tokens WHERE user_id=?')->execute([$user['id']]);
                    $db->prepare('DELETE FROM application_login_challenges WHERE user_id=?')->execute([$user['id']]);
                    sigmaRecordAuthentication($db,$user['id'],'Account locked after failed password attempts','blocked','Administrator restoration required.');
                    $failure=['code'=>'account_locked','error'=>'The account is locked. Please contact Administrative personnel'];
                } else {
                    $db->prepare('INSERT INTO grade_sync_attempts(client_hash,attempts,blocked_until) VALUES(?,?,NULL)')->execute([$key,$count]);
                    $failure=['code'=>'wrong_password','error'=>'Wrong password.'];
                }
            }
        }
        if($failure && $failure['code']!=='password_required') sigmaRecordAuthentication($db,$user['id']??null,'Failed login attempt','failed');
        $db->commit();
        return $failure ? ['success'=>false]+$failure : ['success'=>true,'user'=>$user];
    } catch(Throwable $error) {if($db->inTransaction())$db->rollBack();throw $error;}
}
