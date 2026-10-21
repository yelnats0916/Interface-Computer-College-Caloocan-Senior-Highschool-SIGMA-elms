<?php
function sigmaUserIdPrefix(string $role, string $branchCode = '01'): string {
    $codes=['Master Admin'=>'00','Admin'=>'01','Teacher'=>'02','Student'=>'03'];
    if (!isset($codes[$role]) || !preg_match('/^[0-9]{2}$/D',$branchCode)) throw new InvalidArgumentException('Invalid role or branch code.');
    return gmdate('y').$branchCode.$codes[$role];
}
function sigmaNextUserId(PDO $db, string $prefix, bool $reserve = false): string {
    if (!preg_match('/^[0-9]{6}$/D',$prefix)) throw new InvalidArgumentException('Invalid account prefix.');
    $query=$db->prepare('SELECT COALESCE(MAX(CAST(SUBSTRING(id,7) AS UNSIGNED)),0) FROM users WHERE id REGEXP ?');
    $query->execute(['^'.$prefix.'[0-9]+$']); $highest=(int)$query->fetchColumn();
    if (!$reserve) {
        $seq=$db->prepare('SELECT last_number FROM user_id_sequences WHERE prefix=?');$seq->execute([$prefix]);
        return $prefix.(max($highest,(int)$seq->fetchColumn())+1);
    }
    // InnoDB locks this prefix for the surrounding account-insert transaction.
    $db->prepare('INSERT INTO user_id_sequences(prefix,last_number) VALUES(?,?) ON DUPLICATE KEY UPDATE last_number=GREATEST(last_number,VALUES(last_number))')->execute([$prefix,$highest]);
    $db->prepare('UPDATE user_id_sequences SET last_number=LAST_INSERT_ID(last_number+1) WHERE prefix=?')->execute([$prefix]);
    return $prefix.(int)$db->lastInsertId();
}
