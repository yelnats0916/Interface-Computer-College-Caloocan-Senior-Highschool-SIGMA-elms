<?php
/** CLI-only correction of strand suffixes added by the planning-catalog import. */
if (PHP_SAPI !== 'cli') { http_response_code(403); exit; }
$options = getopt('', ['web:', 'changes:', 'report:']);
$web = realpath($options['web'] ?? '');
$changesPath = realpath($options['changes'] ?? '');
$reportPath = $options['report'] ?? '';
if (!$web || !str_starts_with($web, '/home/sigma-elms/sigma-releases/')
    || !$changesPath || !str_starts_with($changesPath, '/home/sigma-elms/sigma-private/')
    || !str_starts_with($reportPath, '/home/sigma-elms/sigma-private/') || str_contains($reportPath, '..')) {
    throw new RuntimeException('Unexpected correction path.');
}
require $web . '/config/database.php';
require_once $web . '/php/includes/activity_audit.php';
if (!$pdo || $pdo->query('SELECT DATABASE()')->fetchColumn() !== 'sigma-elms_db') throw new RuntimeException('Unexpected database.');
$input = json_decode(file_get_contents($changesPath), true, 512, JSON_THROW_ON_ERROR);
if (($input['batch'] ?? '') !== 'deped-k12-shs-planning-20261022' || count($input['changes'] ?? []) !== 69) throw new RuntimeException('Unexpected title correction.');
$read = $pdo->prepare('SELECT * FROM subjects WHERE id=? AND is_deleted=0');
$update = $pdo->prepare('UPDATE subjects SET name=? WHERE id=? AND name=? AND is_deleted=0');
$backup = []; $changed = 0; $alreadyCorrect = 0;
try {
    $pdo->beginTransaction();
    foreach ($input['changes'] as $change) {
        if (preg_replace('/\s+\((?:ABM|GAS|HUMSS|ICT|HE)\)$/', '', $change['before']) !== $change['after']
            || $change['before'] === $change['after']) throw new RuntimeException('Unexpected subject-title change.');
        $read->execute([$change['id']]); $row = $read->fetch(PDO::FETCH_ASSOC);
        if (!$row) throw new RuntimeException('A subject is missing.');
        if ($row['name'] === $change['after']) { $alreadyCorrect++; continue; }
        if ($row['name'] !== $change['before']) throw new RuntimeException('A subject title was edited since preparation. No titles were overwritten.');
        $backup[] = $row;
    }
    if ($backup) {
        $snapshot = $reportPath . '.before.json';
        if (is_file($snapshot)) throw new RuntimeException('A correction backup already exists.');
        if (file_put_contents($snapshot, json_encode($backup, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE), LOCK_EX) === false) throw new RuntimeException('Could not save backup.');
        chmod($snapshot, 0600);
    }
    foreach ($input['changes'] as $change) {
        $update->execute([$change['after'], $change['id'], $change['before']]);
        if ($update->rowCount()) {
            $changed++;
            sigmaRecordActivity($pdo, '0000000', 'Removed imported strand suffix from subject ' . $change['id'] . '; strand remains stored separately', 'Curriculum');
        }
        $read->execute([$change['id']]); $row = $read->fetch(PDO::FETCH_ASSOC);
        if ($row['name'] !== $change['after']) throw new RuntimeException('Title verification failed.');
    }
    $pdo->commit();
    $report = ['changed' => $changed, 'alreadyCorrect' => $alreadyCorrect, 'verified' => count($input['changes']), 'correctedAt' => gmdate('c')];
    if (file_put_contents($reportPath, json_encode($report, JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT), LOCK_EX) === false) throw new RuntimeException('Could not save correction report.');
    chmod($reportPath, 0600);
    echo json_encode($report);
} catch (Throwable $error) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    throw $error;
}
