<?php
/** Explicit, CLI-only import for the user-requested DepEd-based planning catalog. */
if (PHP_SAPI !== 'cli') { http_response_code(403); exit; }
$options = getopt('', ['web:', 'bundle:', 'report:']);
$web = realpath($options['web'] ?? '');
$bundle = realpath($options['bundle'] ?? '');
$report = $options['report'] ?? '';
if (!$web || !str_starts_with($web, '/home/sigma-elms/sigma-releases/')
    || !$bundle || !str_starts_with($bundle, '/home/sigma-elms/sigma-private/')
    || !str_starts_with($report, '/home/sigma-elms/sigma-private/') || str_contains($report, '..')) {
    throw new RuntimeException('Unexpected import path.');
}
require $web . '/config/database.php';
require_once $web . '/php/includes/activity_audit.php';
if (!$pdo || $pdo->query('SELECT DATABASE()')->fetchColumn() !== 'sigma-elms_db') throw new RuntimeException('Unexpected database.');
$input = json_decode(file_get_contents($bundle), true, 512, JSON_THROW_ON_ERROR);
if (($input['batch'] ?? '') !== 'deped-k12-shs-planning-20261022' || empty($input['subjects'])) throw new RuntimeException('Unexpected catalog.');
$digest = hash_file('sha256', $bundle);
if (is_file($report)) {
    $previous = json_decode(file_get_contents($report), true, 512, JSON_THROW_ON_ERROR);
    if (($previous['bundleSha256'] ?? '') !== $digest) throw new RuntimeException('A different catalog was already imported.');
    echo json_encode(['alreadyImported' => true, 'subjects' => $previous['subjects']]); exit;
}
$ids = []; $topicCount = 0; $materialCount = 0;
foreach ($input['subjects'] as $s) {
    if (isset($ids[$s['id']]) || $s['id'] !== $s['code'] || strlen($s['id']) > 64 || mb_strlen($s['name']) > 150) throw new RuntimeException('Invalid subject identity.');
    $ids[$s['id']] = true;
    if ($s['status'] !== 'Draft' || !in_array($s['gradeLevel'], ['11','12'], true)
        || !in_array($s['type'], ['Core','Applied','Specialized'], true)
        || !in_array($s['strand'], ['', 'ABM','GAS','HUMSS','ICT','HE'], true)
        || !in_array($s['activeQuarters'], [['q1','q2'],['q3','q4']], true)
        || array_sum(array_intersect_key($s['weights'], array_flip(['ww','pt','qa']))) !== 100
        || !empty($s['curriculum']['schoolScheduleConfirmed'])) throw new RuntimeException('Invalid curriculum fields.');
    $topics = [];
    foreach ($s['topics'] as $t) {
        if (isset($topics[$t['id']]) || !in_array($t['quarter'], $s['activeQuarters'], true) || !$t['title'] || !$t['description']) throw new RuntimeException('Invalid topic.');
        $topics[$t['id']] = $t;
    }
    $materials = [];
    foreach ($s['materials'] as $m) {
        if (isset($materials[$m['id']]) || !isset($topics[$m['topicId']]) || $topics[$m['topicId']]['quarter'] !== $m['quarter'] || !$m['title'] || !$m['description']) throw new RuntimeException('Invalid material relationship.');
        foreach (['fileName','fileUrl','url','videoUrl','quizData'] as $key) if (!empty($m[$key])) throw new RuntimeException('The catalog must not contain file attachments or quizzes.');
        $materials[$m['id']] = true;
    }
    $topicCount += count($topics); $materialCount += count($materials);
}
$columns = $pdo->query('SHOW COLUMNS FROM subjects')->fetchAll(PDO::FETCH_COLUMN);
foreach (['grade_level'=>'VARCHAR(10) NULL','learning_hours'=>'INT NULL','curriculum_metadata'=>'LONGTEXT NULL'] as $column=>$definition) {
    if (!in_array($column, $columns, true)) $pdo->exec("ALTER TABLE subjects ADD COLUMN `$column` $definition");
}
$backupPath = $report . '.before.json';
if (!is_file($backupPath)) {
    $backup = $pdo->query('SELECT * FROM subjects')->fetchAll(PDO::FETCH_ASSOC);
    if (file_put_contents($backupPath, json_encode($backup, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE), LOCK_EX) === false) throw new RuntimeException('Could not save pre-import snapshot.');
    chmod($backupPath, 0600);
}
$find = $pdo->prepare('SELECT id FROM subjects WHERE id=? OR code=? LIMIT 1');
$insert = $pdo->prepare('INSERT INTO subjects (id,code,name,units,type,strand,weights,active_quarters,status,topics,materials,grade_level,learning_hours,curriculum_metadata,is_deleted) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,0)');
$read = $pdo->prepare('SELECT * FROM subjects WHERE id=?');
try {
    $pdo->beginTransaction();
    foreach ($input['subjects'] as $s) {
        $find->execute([$s['id'],$s['code']]);
        if ($find->fetchColumn() !== false) throw new RuntimeException('A subject already exists. No existing subjects were overwritten.');
        $json = static fn($v) => json_encode($v, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $insert->execute([$s['id'],$s['code'],$s['name'],$s['units'],$s['type'],$s['strand'],$json($s['weights']),$json($s['activeQuarters']),$s['status'],$json($s['topics']),$json($s['materials']),$s['gradeLevel'],$s['learningHours'],$json($s['curriculum'])]);
        $read->execute([$s['id']]); $saved = $read->fetch(PDO::FETCH_ASSOC);
        foreach (['weights'=>'weights','active_quarters'=>'activeQuarters','topics'=>'topics','materials'=>'materials','curriculum_metadata'=>'curriculum'] as $column=>$key) {
            if (json_decode($saved[$column], true, 512, JSON_THROW_ON_ERROR) !== $s[$key]) throw new RuntimeException('Stored curriculum data did not match the catalog.');
        }
        if ($saved['grade_level'] !== $s['gradeLevel'] || (int)$saved['learning_hours'] !== $s['learningHours']) throw new RuntimeException('Grade/hour connection failed.');
        sigmaRecordActivity($pdo, '0000000', 'Imported user-requested DepEd-based draft subject '.$s['code'].': '.$s['name'].'; school scheduling pending confirmation', 'Curriculum');
    }
    $result = ['batch'=>$input['batch'],'bundleSha256'=>$digest,'subjects'=>count($input['subjects']),'topics'=>$topicCount,'materials'=>$materialCount,'attachments'=>0,'allDrafts'=>true,'importedAt'=>gmdate('c')];
    $pending = $report . '.pending';
    if (file_put_contents($pending, json_encode($result, JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT), LOCK_EX) === false) throw new RuntimeException('Could not save import report.');
    chmod($pending,0600);
    $pdo->commit(); rename($pending,$report);
    echo json_encode($result);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    throw $e;
}
