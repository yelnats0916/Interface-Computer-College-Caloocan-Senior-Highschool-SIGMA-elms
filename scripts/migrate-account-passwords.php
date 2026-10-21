<?php
if (PHP_SAPI !== 'cli') { http_response_code(403); exit; }
require dirname(__DIR__) . '/config/database.php';
if (!$pdo) { fwrite(STDERR, "Database unavailable.\n"); exit(1); }
$apply = in_array('--apply', $argv, true);
$result = ['mode' => $apply ? 'apply' : 'dry-run', 'accountsChecked' => 0, 'legacyPasswords' => 0, 'updated' => 0, 'verified' => 0, 'emptyPasswords' => 0];
try {
    $pdo->beginTransaction();
    $query = $pdo->query('SELECT id,password FROM users FOR UPDATE');
    $save = $pdo->prepare('UPDATE users SET password=? WHERE id=? AND password=?');
    foreach ($query->fetchAll(PDO::FETCH_ASSOC) as $user) {
        $result['accountsChecked']++;
        $password = (string)$user['password'];
        if ($password === '') { $result['emptyPasswords']++; continue; }
        if (password_get_info($password)['algo'] !== null) continue;
        $result['legacyPasswords']++;
        if (!$apply) continue;
        $hash = password_hash($password, PASSWORD_DEFAULT);
        if (!password_verify($password, $hash)) throw new RuntimeException('Password conversion failed validation.');
        $save->execute([$hash, $user['id'], $password]);
        if ($save->rowCount() !== 1) throw new RuntimeException('Account changed during password conversion.');
        $result['updated']++;
        $result['verified']++;
    }
    $apply ? $pdo->commit() : $pdo->rollBack();
    echo json_encode($result, JSON_PRETTY_PRINT) . PHP_EOL;
} catch (Throwable $error) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    fwrite(STDERR, "Password migration stopped. No partial conversion committed.\n");
    exit(1);
}
