<?php
// Included only in the nonpublic operations folder of a hosting release.
if (PHP_SAPI !== 'cli') { http_response_code(403); exit; }
$release = dirname(__DIR__);
require $release . '/public/config/database.php';
if (!$pdo) throw new RuntimeException('Hosting database is unavailable.');
$expected = 'sigma-elms_db';
if ($pdo->query('SELECT DATABASE()')->fetchColumn() !== $expected) throw new RuntimeException('Unexpected database: installation stopped.');
$existing = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
if ($existing) throw new RuntimeException('Initial installation requires the empty hosting database. Existing records were not modified.');
foreach (['schema.sql', 'application_sessions.sql', 'service_secrets.sql', 'record_lifecycle.sql', 'profile_photos.sql', 'user_id_sequences.sql'] as $name) {
    $pdo->exec(file_get_contents(__DIR__ . '/database/' . $name));
}
// Add the derived/publication tables using their canonical definition.
$pdo->exec("CREATE TABLE IF NOT EXISTS grade_publications (
    record_key CHAR(64) NOT NULL,
    kind VARCHAR(12) NOT NULL,
    scope_json TEXT NOT NULL,
    payload LONGTEXT NOT NULL,
    revision INT NOT NULL DEFAULT 1,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY(record_key,kind)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
$tables = ['users','school_years','sections','subjects','quizzes','announcements','audit_logs','ai_logs','ai_insight_cards'];
foreach ($tables as $table) {
    $columns = array_column($pdo->query("SHOW COLUMNS FROM `$table`")->fetchAll(), 'Field');
    foreach (['is_deleted'=>'TINYINT(1) NOT NULL DEFAULT 0','deleted_at'=>'DATETIME NULL','deleted_by'=>'VARCHAR(50) NULL'] as $name=>$definition) {
        if (!in_array($name, $columns, true)) $pdo->exec("ALTER TABLE `$table` ADD `$name` $definition");
    }
}
echo "Hosting schema installed. No accounts or academic records inserted.\n";
