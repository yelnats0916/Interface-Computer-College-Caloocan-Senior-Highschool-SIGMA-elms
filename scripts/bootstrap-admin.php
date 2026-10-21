<?php
// Explicit installation step only. There are no built-in credentials or default identities.
if (PHP_SAPI !== 'cli') { http_response_code(403); exit; }
require dirname(__DIR__) . '/config/database.php';
if (!$pdo) { fwrite(STDERR, "Database unavailable.\n"); exit(1); }
$data = [];
foreach (['ID', 'FIRST_NAME', 'LAST_NAME', 'EMAIL', 'PASSWORD'] as $key) $data[$key] = (string)(getenv('SIGMA_BOOTSTRAP_' . $key) ?: '');
if (!$data['ID'] || strlen($data['ID']) > 50 || !$data['FIRST_NAME'] || !$data['LAST_NAME'] || !filter_var($data['EMAIL'], FILTER_VALIDATE_EMAIL) || strlen($data['PASSWORD']) < 12) {
    fwrite(STDERR, "Supply SIGMA_BOOTSTRAP_ID, FIRST_NAME, LAST_NAME, EMAIL, and PASSWORD through protected environment variables. The password must have at least 12 characters. Nothing was inserted.\n");
    exit(1);
}
try {
    $pdo->beginTransaction();
    $admin = $pdo->query("SELECT id FROM users WHERE LOWER(REPLACE(role,' ','')) IN ('admin','masteradmin','administrator') AND is_deleted=0 FOR UPDATE")->fetch();
    if ($admin) throw new RuntimeException('An administrator already exists. Use authenticated account management.');
    $stmt = $pdo->prepare("INSERT INTO users(id,first_name,last_name,full_name,email,password,role,status) VALUES(?,?,?,?,?,?,'Master Admin','Active')");
    $stmt->execute([$data['ID'],$data['FIRST_NAME'],$data['LAST_NAME'],trim($data['FIRST_NAME'].' '.$data['LAST_NAME']),$data['EMAIL'],password_hash($data['PASSWORD'],PASSWORD_DEFAULT)]);
    $pdo->commit();
    echo "Verified installation administrator created from supplied identity. No demo records inserted.\n";
} catch (Throwable $error) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    fwrite(STDERR, "Administrator creation stopped: " . $error->getMessage() . "\n");
    exit(1);
}
