<?php
if (PHP_SAPI !== 'cli') { http_response_code(403); exit; }
require dirname(__DIR__) . '/config/database.php';
if (!$pdo) { fwrite(STDERR, "Database unavailable.\n"); exit(1); }
$columns = array_column($pdo->query('SHOW COLUMNS FROM users')->fetchAll(PDO::FETCH_ASSOC), 'Field');
foreach (['totp_secret' => 'VARCHAR(64) NULL', 'totp_enabled' => 'TINYINT(1) NOT NULL DEFAULT 0', 'terms_accepted' => 'TINYINT(1) NOT NULL DEFAULT 0', 'terms_accepted_at' => 'DATETIME NULL'] as $name => $definition) {
    if (!in_array($name, $columns, true)) $pdo->exec("ALTER TABLE users ADD COLUMN `$name` $definition");
}
$pdo->exec(file_get_contents(dirname(__DIR__) . '/database/application_sessions.sql'));
echo "Application session infrastructure ready. No users or academic records inserted.\n";
