<?php
/** Apply the reviewed, user-approved planning-unit convention to imported drafts. */
if (PHP_SAPI !== 'cli') { http_response_code(403); exit; }
$options = getopt('', ['web:', 'proposal:', 'report:']);
$web = realpath($options['web'] ?? '');
$proposalPath = realpath($options['proposal'] ?? '');
$reportPath = $options['report'] ?? '';
if (!$web || !str_starts_with($web, '/home/sigma-elms/sigma-releases/')
    || !$proposalPath || !str_starts_with($proposalPath, '/home/sigma-elms/sigma-private/')
    || !str_starts_with($reportPath, '/home/sigma-elms/sigma-private/') || str_contains($reportPath, '..')) {
    throw new RuntimeException('Unexpected planning-unit path.');
}
require $web . '/config/database.php';
require_once $web . '/php/includes/activity_audit.php';
if (!$pdo || $pdo->query('SELECT DATABASE()')->fetchColumn() !== 'sigma-elms_db') throw new RuntimeException('Unexpected database.');
$input = json_decode(file_get_contents($proposalPath), true, 512, JSON_THROW_ON_ERROR);
if (($input['userApproved'] ?? false) !== true || count($input['changes'] ?? []) !== 87) throw new RuntimeException('Unexpected planning-unit proposal.');
$rules = [20 => '1', 80 => '3', 160 => '6'];
$basis = 'User-approved provisional application convention: 20 hours = 1 unit; 80 hours = 3 units; 160 hours = 6 units. Not a verified DepEd or ICC credit-unit rule.';
$read = $pdo->prepare('SELECT * FROM subjects WHERE id=? AND is_deleted=0 FOR UPDATE');
$update = $pdo->prepare('UPDATE subjects SET units=?, curriculum_metadata=? WHERE id=? AND units=?');
$backup = []; $changed = 0; $preserved = 0; $verified = 0; $seen = [];
try {
    $pdo->beginTransaction();
    foreach ($input['changes'] as $change) {
        $hours = $change['learningHours'];
        if (isset($seen[$change['id']]) || ($rules[$hours] ?? null) !== $change['units']) throw new RuntimeException('Invalid planning-unit rule.');
        $seen[$change['id']] = true;
        $read->execute([$change['id']]); $row = $read->fetch(PDO::FETCH_ASSOC);
        if (!$row || (int)$row['learning_hours'] !== $hours || $row['status'] !== 'Draft') throw new RuntimeException('A subject changed since the proposal.');
        $metadata = json_decode($row['curriculum_metadata'], true, 512, JSON_THROW_ON_ERROR);
        if (empty($metadata['sourceUrl']) || empty($metadata['framework'])) throw new RuntimeException('Not an imported planning subject.');
        $backup[$change['id']] = $row;
    }
    $snapshot = $reportPath . '.before.json';
    if (!is_file($snapshot)) {
        if (file_put_contents($snapshot, json_encode(array_values($backup), JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE), LOCK_EX) === false) throw new RuntimeException('Could not save backup.');
        chmod($snapshot, 0600);
    }
    foreach ($input['changes'] as $change) {
        $row = $backup[$change['id']];
        if (trim((string)$row['units']) !== '') { $preserved++; continue; }
        $metadata = json_decode($row['curriculum_metadata'], true, 512, JSON_THROW_ON_ERROR);
        $metadata['unitsProvisional'] = true;
        $metadata['unitBasis'] = $basis;
        $note = ' Unit values use an application convention pending ICC confirmation.';
        if (!str_contains($metadata['note'] ?? '', trim($note))) $metadata['note'] = ($metadata['note'] ?? '') . $note;
        $update->execute([$change['units'], json_encode($metadata, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), $change['id'], $row['units']]);
        if ($update->rowCount() !== 1) throw new RuntimeException('Subject units changed during the update.');
        $read->execute([$change['id']]); $saved = $read->fetch(PDO::FETCH_ASSOC);
        if ($saved['units'] !== $change['units']) throw new RuntimeException('Unit verification failed.');
        foreach (['id','code','name','grade_level','learning_hours','type','strand','weights','active_quarters','status','topics','materials'] as $column) {
            if ($saved[$column] !== $row[$column]) throw new RuntimeException('Unrelated subject data changed.');
        }
        sigmaRecordActivity($pdo, '0000000', 'Assigned user-approved provisional units to subject ' . $change['id'] . ': ' . $change['units'] . ' units; ICC confirmation pending', 'Curriculum');
        $changed++; $verified++;
    }
    $pdo->commit();
    $report = ['changed' => $changed, 'preservedExistingUnits' => $preserved, 'verifiedUpdates' => $verified, 'unitBasis' => $basis, 'appliedAt' => gmdate('c')];
    if (file_put_contents($reportPath, json_encode($report, JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT), LOCK_EX) === false) throw new RuntimeException('Could not save unit report.');
    chmod($reportPath, 0600);
    echo json_encode($report);
} catch (Throwable $error) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    throw $error;
}
