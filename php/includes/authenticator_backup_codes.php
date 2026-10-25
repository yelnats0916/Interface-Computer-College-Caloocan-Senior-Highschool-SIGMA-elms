<?php
function sigmaEnsureBackupCodes(PDO $db): void {
    $db->exec("CREATE TABLE IF NOT EXISTS authenticator_backup_codes (user_id VARCHAR(50) NOT NULL,code_hash CHAR(64) NOT NULL,created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,used_at DATETIME NULL,PRIMARY KEY(user_id,code_hash)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
}
function sigmaBackupCodeHash(string $code): string {
    $normalized=strtoupper(preg_replace('/[\s-]+/','',trim($code)));
    return preg_match('/^[A-F0-9]{20}$/D',$normalized)?hash('sha256',$normalized):'';
}
// Caller locks the user row and commits these hashes with the authenticator change.
function sigmaIssueBackupCodes(PDO $db,string $userId): array {
    $db->prepare('DELETE FROM authenticator_backup_codes WHERE user_id=?')->execute([$userId]);
    $insert=$db->prepare('INSERT INTO authenticator_backup_codes(user_id,code_hash) VALUES(?,?)');$codes=[];
    for($i=0;$i<10;$i++){$code=implode('-',str_split(strtoupper(bin2hex(random_bytes(10))),4));$insert->execute([$userId,sigmaBackupCodeHash($code)]);$codes[]=$code;}
    return $codes;
}
function sigmaConsumeBackupCode(PDO $db,string $userId,string $code): bool {
    $hash=sigmaBackupCodeHash($code);if($hash==='')return false;
    $q=$db->prepare('UPDATE authenticator_backup_codes SET used_at=UTC_TIMESTAMP() WHERE user_id=? AND code_hash=? AND used_at IS NULL');$q->execute([$userId,$hash]);return $q->rowCount()===1;
}
