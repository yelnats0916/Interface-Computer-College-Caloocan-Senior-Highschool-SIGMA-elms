<?php
// CLI-only repair for identity tables created with different server defaults.
if (PHP_SAPI !== 'cli') { http_response_code(403); exit; }
$options = getopt('', ['database-config:', 'backup-directory:']);
if (empty($options['database-config']) || empty($options['backup-directory'])) {
    throw new RuntimeException('Supply --database-config and a private --backup-directory.');
}
require $options['database-config'];
if (!$pdo) throw new RuntimeException('Database unavailable.');
$schema = $pdo->query('SELECT DATABASE()')->fetchColumn();
$column = $pdo->prepare('SELECT COLLATION_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND COLUMN_NAME=?');
$column->execute([$schema, 'users', 'id']);
$collation = $column->fetchColumn();
if ($collation !== 'utf8mb4_unicode_ci') throw new RuntimeException('Unexpected account ID collation; manual review required.');
$directory = realpath($options['backup-directory']);
if (!$directory || !is_dir($directory) || !is_writable($directory)) throw new RuntimeException('Private backup directory must already exist.');
$changed = [];
foreach (['grade_sync_tokens', 'service_vault_sessions', 'application_login_challenges', 'application_presence'] as $table) {
    $column->execute([$schema, $table, 'user_id']);
    $current = $column->fetchColumn();
    if (!$current || $current === $collation) continue;
    $before = $pdo->query("SELECT * FROM `$table`")->fetchAll(PDO::FETCH_ASSOC);
    $backup = $directory . '/' . $table . '-collation-' . bin2hex(random_bytes(8)) . '.json';
    $handle = fopen($backup, 'x');
    if (!$handle) throw new RuntimeException('Cannot create backup.');
    chmod($backup, 0600);
    fwrite($handle, json_encode(['create' => $pdo->query("SHOW CREATE TABLE `$table`")->fetch(PDO::FETCH_NUM)[1], 'rows' => $before], JSON_THROW_ON_ERROR));
    fclose($handle);
    $pdo->exec("ALTER TABLE `$table` MODIFY `user_id` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL");
    $after = $pdo->query("SELECT * FROM `$table`")->fetchAll(PDO::FETCH_ASSOC);
    if ($before !== $after) throw new RuntimeException('Record verification failed; inspect the private backup.');
    $changed[] = $table;
}
echo json_encode(['alignedIdentityTables' => $changed, 'recordsPreserved' => true]) . PHP_EOL;
