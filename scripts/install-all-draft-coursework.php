<?php
// Administrative content installer for all 50 draft subjects coursework and quizzes.
if (PHP_SAPI !== 'cli') exit(1);

$root = $argv[1] ?? '';
$bundlePath = $argv[2] ?? '';
$actorId = $argv[3] ?? '0000000';

if (!$root || !is_dir($root)) $root = dirname(__DIR__);
if (!$bundlePath || !is_file($bundlePath)) $bundlePath = dirname(__DIR__) . '/output/all-draft-coursework/all-draft-coursework-bundle.json';

if (!is_file($bundlePath)) {
    throw new RuntimeException('Bundle not found at: ' . $bundlePath);
}

require_once $root . '/config/database.php';
require_once $root . '/php/includes/material_provenance.php';
require_once $root . '/php/includes/data_provenance.php';
require_once $root . '/php/includes/activity_audit.php';
require_once $root . '/php/includes/record_creation_numbers.php';

$bundle = json_decode(file_get_contents($bundlePath), true, 512, JSON_THROW_ON_ERROR);
$quizzes = $bundle['quizzes'] ?? [];
$subjects = $bundle['subjects'] ?? [];

echo "Loaded bundle with " . count($subjects) . " subjects and " . count($quizzes) . " quizzes.\n";

$findActor = $pdo->prepare("SELECT * FROM users WHERE id=? AND is_deleted=0 LIMIT 1");
$findActor->execute([$actorId]);
$actor = $findActor->fetch(PDO::FETCH_ASSOC);
$actorName = $actor ? ($actor['full_name'] ?: trim(($actor['first_name'] ?? '') . ' ' . ($actor['last_name'] ?? ''))) : 'Stanley Vargas Garcia';

// Ensure tables exist
sigmaCreationNumberSchema($pdo);
$pdo->exec("CREATE TABLE IF NOT EXISTS `quizzes` (
    `id` VARCHAR(64) NOT NULL PRIMARY KEY,
    `code` VARCHAR(50) NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'published',
    `author_id` VARCHAR(50) NULL,
    `author_name` VARCHAR(100) NULL,
    `author_role` VARCHAR(50) NULL,
    `questions` LONGTEXT NULL,
    `total_questions` INT UNSIGNED NOT NULL DEFAULT 0,
    `total_points` INT UNSIGNED NOT NULL DEFAULT 0,
    `time_limit` INT UNSIGNED NULL DEFAULT 0,
    `icon` VARCHAR(50) NULL,
    `color` VARCHAR(30) NULL,
    `is_ai` TINYINT(1) NOT NULL DEFAULT 0,
    `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
    `deleted_at` TIMESTAMP NULL DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_quiz_code` (`code`),
    INDEX `idx_quiz_status` (`status`),
    INDEX `idx_quiz_author` (`author_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

$pdo->exec("CREATE TABLE IF NOT EXISTS `subjects` (
    `id` VARCHAR(64) NOT NULL PRIMARY KEY,
    `code` VARCHAR(50) NOT NULL UNIQUE,
    `name` VARCHAR(150) NOT NULL,
    `units` VARCHAR(10) NULL,
    `grade_level` VARCHAR(10) NULL,
    `learning_hours` INT NULL,
    `curriculum_metadata` LONGTEXT NULL,
    `type` VARCHAR(50) NULL,
    `strand` VARCHAR(50) NULL,
    `weights` LONGTEXT NULL,
    `active_quarters` LONGTEXT NULL,
    `status` VARCHAR(30) DEFAULT 'Published',
    `topics` LONGTEXT NULL,
    `materials` LONGTEXT NULL,
    `is_deleted` TINYINT(1) DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_subject_code` (`code`),
    INDEX `idx_subject_name` (`name`),
    INDEX `idx_subject_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

$subjectColumns = $pdo->query('SHOW COLUMNS FROM subjects')->fetchAll(PDO::FETCH_COLUMN);
foreach (['grade_level' => 'VARCHAR(10) NULL', 'learning_hours' => 'INT NULL', 'curriculum_metadata' => 'LONGTEXT NULL'] as $column => $definition) {
    if (!in_array($column, $subjectColumns, true)) $pdo->exec("ALTER TABLE subjects ADD COLUMN `$column` $definition");
}

$pdo->beginTransaction();
try {
    // 1. Insert/Update Quizzes
    $quizStmt = $pdo->prepare("INSERT INTO quizzes 
        (id, code, title, description, status, author_id, author_name, author_role, questions, total_questions, total_points, time_limit, icon, color, is_ai, is_deleted)
        VALUES (?, ?, ?, ?, 'published', ?, ?, 'Admin', ?, ?, ?, ?, ?, ?, 1, 0)
        ON DUPLICATE KEY UPDATE
            title=VALUES(title), description=VALUES(description), status=VALUES(status),
            questions=VALUES(questions), total_questions=VALUES(total_questions), total_points=VALUES(total_points),
            time_limit=VALUES(time_limit), icon=VALUES(icon), color=VALUES(color), is_deleted=0");

    $savedQuizzes = 0;
    foreach ($quizzes as $q) {
        $qJson = json_encode($q['questions'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $quizStmt->execute([
            $q['id'],
            $q['code'],
            $q['title'],
            $q['description'],
            $actorId,
            $actorName,
            $qJson,
            $q['total_questions'],
            $q['total_points'],
            $q['time_limit'],
            $q['icon'],
            $q['color']
        ]);
        sigmaTableCreationNumber($pdo, 'quizzes', $q['id']);
        $savedQuizzes++;
    }
    echo "Saved $savedQuizzes quizzes in quizzes storage table.\n";

    // 2. Insert/Update Subjects
    $findSubj = $pdo->prepare("SELECT * FROM subjects WHERE (id=? OR code=? OR name=?) AND is_deleted=0 LIMIT 1");
    $updateSubj = $pdo->prepare("UPDATE subjects SET topics=?, materials=?, status='Published' WHERE id=?");
    $insertSubj = $pdo->prepare("INSERT INTO subjects 
        (id, code, name, units, type, strand, weights, active_quarters, status, topics, materials, grade_level, learning_hours, curriculum_metadata, is_deleted)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Published', ?, ?, ?, ?, ?, 0)");

    $updatedCount = 0;
    $insertedCount = 0;

    foreach ($subjects as $s) {
        // NEVER modify Reading and Writing Skills
        if ($s['name'] === 'Reading and Writing Skills' || $s['code'] === 'RW-11-12' || $s['id'] === 'CORE-112-RW') {
            continue;
        }

        $findSubj->execute([$s['id'], $s['code'], $s['name']]);
        $existing = $findSubj->fetch(PDO::FETCH_ASSOC);

        $topicsJson = json_encode($s['topics'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $materialsJson = json_encode($s['materials'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        if ($existing) {
            // Update existing subject
            $updateSubj->execute([$topicsJson, $materialsJson, $existing['id']]);
            $updatedCount++;
            try {
                sigmaRecordActivity($pdo, $actorId, 'Published Subject', 'Curriculum',
                    'Subject code: ' . $existing['code'] . '; ' . $existing['name'] . '; Added coursework assessments and published.');
            } catch (Throwable $e) {}
        } else {
            // Insert new subject
            $json = static fn($v) => json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            $insertSubj->execute([
                $s['id'],
                $s['code'],
                $s['name'],
                $s['units'],
                $s['type'],
                $s['strand'] ?? '',
                $json($s['weights'] ?? []),
                $json($s['activeQuarters'] ?? ['q1', 'q2']),
                $topicsJson,
                $materialsJson,
                $s['gradeLevel'] ?? '11',
                $s['learningHours'] ?? 80,
                $json($s['curriculum'] ?? null)
            ]);
            sigmaTableCreationNumber($pdo, 'subjects', $s['id']);
            $insertedCount++;
            try {
                sigmaRecordActivity($pdo, $actorId, 'Published Subject', 'Curriculum',
                    'Subject code: ' . $s['code'] . '; ' . $s['name'] . '; Coursework added and published.');
            } catch (Throwable $e) {}
        }
    }

    $pdo->commit();

    // Verify all subjects in database
    $pubCount = (int)$pdo->query("SELECT COUNT(*) FROM subjects WHERE is_deleted=0 AND status='Published'")->fetchColumn();
    $totalCount = (int)$pdo->query("SELECT COUNT(*) FROM subjects WHERE is_deleted=0")->fetchColumn();
    $draftCount = (int)$pdo->query("SELECT COUNT(*) FROM subjects WHERE is_deleted=0 AND status='Draft'")->fetchColumn();

    $report = [
        'status' => 'success',
        'quizzesStored' => $savedQuizzes,
        'subjectsUpdated' => $updatedCount,
        'subjectsInserted' => $insertedCount,
        'totalPublishedSubjects' => $pubCount,
        'totalDraftSubjects' => $draftCount,
        'totalSubjectsInDb' => $totalCount,
        'executedAt' => gmdate('c')
    ];

    echo json_encode($report, JSON_PRETTY_PRINT) . "\n";

} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    echo "Installation failed: " . $e->getMessage() . "\n" . $e->getTraceAsString() . "\n";
    exit(1);
}
