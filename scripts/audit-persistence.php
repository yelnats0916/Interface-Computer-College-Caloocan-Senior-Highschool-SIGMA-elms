<?php
// Read-only inventory. Never prints user data, passwords, service keys, or record payloads.
if (PHP_SAPI !== 'cli') { http_response_code(403); exit; }
require dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/php/includes/data_provenance.php';
if (!$pdo) { fwrite(STDERR, "Database unavailable.\n"); exit(1); }
$report = ['tables' => [], 'passwords' => ['hashed' => 0, 'legacy' => 0, 'empty' => 0], 'explicitSyntheticPayloads' => [], 'legacyIdentityReviewCount' => 0];
foreach ($pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN) as $table) {
    $identifier = '`' . str_replace('`', '``', $table) . '`';
    $columns = array_column($pdo->query('DESCRIBE ' . $identifier)->fetchAll(PDO::FETCH_ASSOC), 'Field');
    $report['tables'][] = ['table' => $table, 'rows' => (int)$pdo->query('SELECT COUNT(*) FROM ' . $identifier)->fetchColumn(), 'columns' => $columns];
}
foreach ($pdo->query('SELECT id,password FROM users')->fetchAll(PDO::FETCH_ASSOC) as $user) {
    $bucket = $user['password'] === '' ? 'empty' : (password_get_info($user['password'])['algo'] !== null ? 'hashed' : 'legacy');
    $report['passwords'][$bucket]++;
    if (in_array((string)$user['id'], ['0000000', '1111111', '2222222'], true)) $report['legacyIdentityReviewCount']++;
}
$available = array_column($report['tables'], 'table');
foreach (['subjects' => ['topics', 'materials'], 'ai_logs' => ['payload'], 'ai_insight_cards' => ['payload'], 'ai_analytics_state' => ['payload']] as $table => $fields) {
    if (!in_array($table, $available, true)) continue;
    foreach ($fields as $field) {
        $count = 0;
        foreach ($pdo->query("SELECT `$field` FROM `$table`")->fetchAll(PDO::FETCH_COLUMN) as $payload) {
            $record = json_decode($payload ?: 'null', true);
            if (is_array($record) && sigmaSyntheticRecordPath($record) !== null) $count++;
        }
        $report['explicitSyntheticPayloads'][] = ['table' => $table, 'field' => $field, 'reviewCount' => $count];
    }
}
echo json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
