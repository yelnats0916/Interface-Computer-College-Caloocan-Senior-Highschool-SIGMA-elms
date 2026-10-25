<?php
/** Password-verified account challenge is checked by the calling endpoint. */
function sigmaResetOwnAuthenticator(PDO $db,string $userId): array {
    $db->beginTransaction();
    try {
        $q=$db->prepare('SELECT id FROM users WHERE id=? AND is_deleted=0 AND LOWER(status)=\'active\' FOR UPDATE');$q->execute([$userId]);
        if(!$q->fetchColumn())throw new InvalidArgumentException('Account is unavailable. Sign in again.');
        $secret=TotpService::generateSecret(16);
        $db->prepare('UPDATE users SET totp_secret=?,totp_enabled=0 WHERE id=?')->execute([$secret,$userId]);
        sigmaRevokeAccountSessions($db,$userId);
        try {$db->prepare('DELETE FROM service_vault_sessions WHERE user_id=?')->execute([$userId]);}
        catch(PDOException $e){if($e->getCode()!=='42S02')throw $e;}
        $challenge=bin2hex(random_bytes(32));
        $db->prepare('INSERT INTO application_login_challenges(token_hash,user_id,expires_at) VALUES(?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 5 MINUTE))')->execute([hash('sha256',$challenge),$userId]);
        sigmaRecordAuthentication($db,$userId,'Google Authenticator 2FA reset','warning','Reset by the user.');
        $db->commit();
        $qr=TotpService::getQrCodeData($secret,$userId,'SIGMA');
        return ['success'=>true,'userId'=>$userId,'challenge'=>$challenge,'secret'=>$secret,'otpauth_url'=>$qr['otpauth_url'],'qr_image_url'=>$qr['qr_image_url'],'label'=>$userId];
    }catch(Throwable $e){if($db->inTransaction())$db->rollBack();throw $e;}
}
