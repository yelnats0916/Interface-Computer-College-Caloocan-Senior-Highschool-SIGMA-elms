<?php
/** CLI backfill; only the two numbering tables are modified. */
if (PHP_SAPI !== 'cli') { http_response_code(403); exit; }
$options = getopt('', ['web:', 'catalog:', 'report:']);
$web = realpath($options['web'] ?? dirname(__DIR__));
if (!$web || !is_file($web . '/config/database.php')) throw new RuntimeException('Invalid application directory.');
require $web . '/config/database.php';
require $web . '/php/includes/record_creation_numbers.php';
if (!$pdo || !in_array($pdo->query('SELECT DATABASE()')->fetchColumn(), ['sigma_elms_db','sigma-elms_db'], true)) throw new RuntimeException('Unexpected database.');
sigmaCreationNumberSchema($pdo);
$priority = [];
if (isset($options['catalog'])) {
    $catalog = json_decode(file_get_contents($options['catalog']), true, 512, JSON_THROW_ON_ERROR);
    foreach ($catalog['subjects'] ?? [] as $index => $subject) $priority[$subject['id']] = $index;
}
$tables = ['users','subjects','sections','school_years','quizzes','ai_logs','ai_insight_cards'];
$before = $pdo->query('SELECT collection,record_id,creation_number FROM record_creation_numbers ORDER BY collection,creation_number')->fetchAll(PDO::FETCH_ASSOC);
if (isset($options['report'])) {
    $snapshot = $options['report'] . '.before.json';
    if (is_file($snapshot)) throw new RuntimeException('A migration snapshot already exists.');
    if (file_put_contents($snapshot, json_encode($before, JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT), LOCK_EX) === false) throw new RuntimeException('Could not save numbering snapshot.');
    chmod($snapshot, 0600);
}
$report = ['collections' => [], 'sourceRowsModified' => 0];
foreach ($tables as $table) {
    $records = $pdo->query("SELECT id,created_at FROM `$table` ORDER BY created_at,id")->fetchAll(PDO::FETCH_ASSOC);
    if ($table === 'subjects') foreach ($records as &$record) $record['_creationOrder'] = $priority[$record['id']] ?? PHP_INT_MAX;
    unset($record);
    $numbers = sigmaAssignCreationNumbers($pdo, $table, $records);
    foreach ($records as $record) if (!isset($numbers[$record['id']]) || $numbers[$record['id']] < 1) throw new RuntimeException('A record is missing its creation number.');
    $report['collections'][$table] = ['records' => count($records), 'reservedNumbers' => count($numbers)];
}
$report['completedAt'] = gmdate('c');
if (isset($options['report'])) {
    if (file_put_contents($options['report'], json_encode($report, JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT), LOCK_EX) === false) throw new RuntimeException('Could not save migration report.');
    chmod($options['report'], 0600);
}
echo json_encode($report);
