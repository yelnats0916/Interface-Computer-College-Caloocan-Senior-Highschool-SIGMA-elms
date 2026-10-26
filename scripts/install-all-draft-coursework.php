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
$actorName = $actor ? sigmaCreatorDisplayName($actor, (string)($actor['full_name'] ?? '')) : 'Admin';

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

    // Ensure Section Einstein and Academic Releases for demonstration
    try {
        $teacherId = '2601021';
        $findTeacher = $pdo->prepare("SELECT id FROM users WHERE id=?");
        $findTeacher->execute([$teacherId]);
        if ($findTeacher->fetch()) {
            $pdo->prepare("UPDATE users SET full_name='Renato Ramos', first_name='Renato', last_name='Ramos' WHERE id=?")->execute([$teacherId]);
        } else {
            $pdo->prepare("INSERT INTO users (id, first_name, last_name, full_name, email, password, role, status, is_deleted) VALUES (?, 'Renato', 'Ramos', 'Renato Ramos', 'renato.ramos@gmail.com', 'ramos2601021', 'Teacher', 'Active', 0)")->execute([$teacherId]);
        }

        $secId = 'SEC-EINSTEIN-302';

        // Ensure all demo student users exist with section Einstein in users table
        $demoStudents = [
            ['id' => '26010316', 'first_name' => 'Camille', 'last_name' => 'Mendoza', 'full_name' => 'Camille Torres Mendoza', 'email' => 'camille.mendoza@gmail.com', 'password' => 'mendoza26010316'],
            ['id' => '2222222', 'first_name' => 'Juan', 'last_name' => 'Dela Cruz', 'full_name' => 'Juan Abad Dela Cruz', 'email' => 'juan.delacruz@gmail.com', 'password' => 'delacruz2222222'],
            ['id' => '2601031', 'first_name' => 'Henry', 'last_name' => 'Ochoa', 'full_name' => 'Henry Wrecker Ochoa', 'email' => 'henry12@gmail.com', 'password' => 'ochoa2601031'],
            ['id' => '2601033', 'first_name' => 'Amanda', 'last_name' => 'Gao', 'full_name' => 'Amanda Suri Gao', 'email' => 'amanda67@gmail.com', 'password' => 'gao2601033']
        ];
        foreach ($demoStudents as $ds) {
            $chk = $pdo->prepare("SELECT id FROM users WHERE id=?");
            $chk->execute([$ds['id']]);
            if ($chk->fetch()) {
                $pdo->prepare("UPDATE users SET first_name=?, last_name=?, full_name=?, email=?, grade_section='Einstein', grade_level='Grade 11', role='Student', status='Active', is_deleted=0 WHERE id=?")
                    ->execute([$ds['first_name'], $ds['last_name'], $ds['full_name'], $ds['email'], $ds['id']]);
            } else {
                $pdo->prepare("INSERT INTO users (id, first_name, last_name, full_name, email, password, role, grade_section, grade_level, status, is_deleted) VALUES (?, ?, ?, ?, ?, ?, 'Student', 'Einstein', 'Grade 11', 'Active', 0)")
                    ->execute([$ds['id'], $ds['first_name'], $ds['last_name'], $ds['full_name'], $ds['email'], $ds['password']]);
            }
        }
        $pdo->prepare("UPDATE users SET grade_section='Einstein', grade_level='Grade 11' WHERE (role='Student' OR LOWER(role)='student') AND (grade_section IS NULL OR grade_section='' OR grade_section='Grade 11 - ICT A')")->execute();

        $teachersJson = json_encode([
            ['id' => '2601021', 'name' => 'Renato Ramos', 'role' => 'Teacher', 'subject' => 'Oral Communication in Context'],
            ['id' => '1111111', 'name' => 'Maria Santos Ramos', 'role' => 'Teacher', 'subject' => 'Oral Communication in Context']
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $subjectsJson = json_encode([
            ['id' => 'CORE-111-OC', 'code' => 'CORE-111-OC', 'name' => 'Oral Communication in Context', 'title' => 'Oral Communication in Context']
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $studentsJson = json_encode([
            ['id' => '26010316', 'name' => 'Camille Torres Mendoza', 'email' => 'camille.mendoza@gmail.com', 'grade_section' => 'Einstein'],
            ['id' => '2222222', 'name' => 'Juan Abad Dela Cruz', 'email' => 'juan.delacruz@gmail.com', 'grade_section' => 'Einstein'],
            ['id' => '2601031', 'name' => 'Henry Wrecker Ochoa', 'email' => 'henry12@gmail.com', 'grade_section' => 'Einstein'],
            ['id' => '2601033', 'name' => 'Amanda Suri Gao', 'email' => 'amanda67@gmail.com', 'grade_section' => 'Einstein']
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        $pdo->exec("CREATE TABLE IF NOT EXISTS `sections` (
            `id` VARCHAR(64) NOT NULL PRIMARY KEY,
            `name` VARCHAR(100) NOT NULL,
            `grade_level` VARCHAR(20) NOT NULL DEFAULT 'Grade 11',
            `room` VARCHAR(50) NOT NULL DEFAULT '302',
            `school_year` VARCHAR(30) NOT NULL DEFAULT '2026–2027',
            `start_time` VARCHAR(20) NOT NULL DEFAULT '07:30',
            `end_time` VARCHAR(20) NOT NULL DEFAULT '17:00',
            `days` VARCHAR(100) NOT NULL DEFAULT 'Monday, Tuesday, Wednesday, Thursday, Friday',
            `schedule` VARCHAR(255) NOT NULL DEFAULT '',
            `daily_schedules` LONGTEXT NULL,
            `teacher` VARCHAR(100) NOT NULL DEFAULT 'Renato Ramos',
            `teacher_role` VARCHAR(50) NOT NULL DEFAULT 'Teacher',
            `teachers` LONGTEXT NULL,
            `adviser` VARCHAR(100) NOT NULL DEFAULT 'Renato Ramos',
            `adviser_id` VARCHAR(50) NOT NULL DEFAULT '2601021',
            `subject` VARCHAR(100) NOT NULL DEFAULT 'Oral Communication in Context',
            `subjects` LONGTEXT NULL,
            `students` LONGTEXT NULL,
            `students_count` INT UNSIGNED NOT NULL DEFAULT 4,
            `status` VARCHAR(30) NOT NULL DEFAULT 'Deployed',
            `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
            `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            `deleted_at` DATETIME NULL,
            `deleted_by` VARCHAR(50) NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

        $checkSec = $pdo->prepare("SELECT id FROM sections WHERE id=? OR name='Einstein'");
        $checkSec->execute([$secId]);
        if ($checkSec->fetch()) {
            $pdo->prepare("UPDATE sections SET name='Einstein', grade_level='Grade 11', room='302', school_year='2026–2027', teacher='Renato Ramos', teacher_role='Teacher', teachers=?, adviser='Renato Ramos', adviser_id='2601021', subject='Oral Communication in Context', subjects=?, students=?, students_count=4, status='Deployed', is_deleted=0 WHERE id=? OR name='Einstein'")
                ->execute([$teachersJson, $subjectsJson, $studentsJson, $secId]);
        } else {
            $pdo->prepare("INSERT INTO sections (id, name, grade_level, room, school_year, teacher, teacher_role, teachers, adviser, adviser_id, subject, subjects, students, students_count, status, is_deleted) VALUES (?, 'Einstein', 'Grade 11', '302', '2026–2027', 'Renato Ramos', 'Teacher', ?, 'Renato Ramos', '2601021', 'Oral Communication in Context', ?, ?, 4, 'Deployed', 0)")
                ->execute([$secId, $teachersJson, $subjectsJson, $studentsJson]);
        }

        // Academic evidence schema
        $pdo->exec("CREATE TABLE IF NOT EXISTS academic_records (
            record_key CHAR(64) PRIMARY KEY, record_type VARCHAR(24) NOT NULL,
            subject_id VARCHAR(100) NOT NULL, section_id VARCHAR(100) NOT NULL,
            student_id VARCHAR(50) NOT NULL DEFAULT '', item_id VARCHAR(191) NOT NULL DEFAULT '',
            payload LONGTEXT NOT NULL, actor_id VARCHAR(50) NOT NULL,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            KEY academic_scope(subject_id,section_id,record_type), KEY academic_student(student_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

        $topicConfig = [
            'publishAll' => true,
            'releasedTopicIds' => [
                'CORE-111-OC-T01', 'CORE-111-OC-T02', 'CORE-111-OC-T03', 'CORE-111-OC-T04',
                'CORE-111-OC-T05', 'CORE-111-OC-T07', 'CORE-111-OC-T08',
                'Communication Processes and Models', 'Verbal, Nonverbal, and Intercultural Communication',
                'Functions of Communication', 'Speech Contexts, Styles, and Acts',
                'Communicative Strategies', 'Speech Writing', 'Speech Delivery'
            ],
            'hiddenTopicIds' => [],
            'topicSchedules' => [],
            'topicReleaseDates' => []
        ];
        $learningConfig = [
            'publishAll' => true,
            'releasedMaterialIds' => [
                'CORE-111-OC-T01-M01', 'CORE-111-OC-T02-M01', 'CORE-111-OC-T03-M01', 'CORE-111-OC-T04-M01',
                'CORE-111-OC-T05-M01', 'CORE-111-OC-T07-M01', 'CORE-111-OC-T08-M01',
                'Communication Processes and Models - Learning Guide',
                'Verbal, Nonverbal, and Intercultural Communication - Learning Guide',
                'Functions of Communication - Learning Guide',
                'Speech Contexts, Styles, and Acts - Learning Guide',
                'Communicative Strategies - Learning Guide',
                'Speech Writing - Learning Guide',
                'Speech Delivery - Learning Guide'
            ],
            'hiddenMaterialIds' => [],
            'materialSchedules' => [],
            'materialReleaseDates' => []
        ];
        $assessConfig = [
            'publishAll' => true,
            'releasedMaterialIds' => [
                'CORE-111-OC-T01-M02', 'CORE-111-OC-T01-M03', 'CORE-111-OC-T01-M04', 'QZ-CORE-111-OC-T01-04-MATERIAL', 'QZ-CORE-111-OC-T01-01',
                'CORE-111-OC-T02-M02', 'CORE-111-OC-T02-M03', 'QZ-CORE-111-OC-T02-03-MATERIAL',
                'CORE-111-OC-T03-M02', 'QZ-CORE-111-OC-T03-02-MATERIAL',
                'CORE-111-OC-T04-M04', 'QZ-CORE-111-OC-T04-01-MATERIAL', 'QZ-CORE-111-OC-T04-02-MATERIAL',
                'CORE-111-OC-T05-M02', 'QZ-CORE-111-OC-T05-02-MATERIAL', 'QZ-CORE-111-OC-T05-01',
                'CORE-111-OC-T07-M02', 'CORE-111-OC-T07-M03', 'CORE-111-OC-T07-M04', 'QZ-CORE-111-OC-T07-04-MATERIAL',
                'CORE-111-OC-T08-M02', 'CORE-111-OC-T08-M03', 'QZ-CORE-111-OC-T08-03-MATERIAL',
                'Structured Analysis: Communication Processes and Models',
                'Communication Processes and Models Comprehensive Quiz',
                'Diagnostic Activity: Communication Processes and Models',
                'Practice Exercise: Communicative Strategies',
                'Communicative Strategies Concept Quiz'
            ],
            'hiddenMaterialIds' => [],
            'materialSchedules' => [],
            'materialReleaseDates' => []
        ];

        $insAcademic = $pdo->prepare("INSERT INTO academic_records(record_key,record_type,subject_id,section_id,student_id,item_id,payload,actor_id) VALUES(?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE payload=VALUES(payload),actor_id=VALUES(actor_id)");
        foreach ([
            'topics' => $topicConfig,
            'learning' => $learningConfig,
            'assessments' => $assessConfig
        ] as $cat => $cfg) {
            $encodedCfg = json_encode($cfg, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            foreach (['CORE-111-OC', 'card-oralcomm'] as $sId) {
                foreach ([$secId, 'Einstein'] as $scId) {
                    $key = hash('sha256', json_encode(['release', $sId, $scId, '', $cat]));
                    $insAcademic->execute([$key, 'release', $sId, $scId, '', $cat, $encodedCfg, $teacherId]);
                }
            }
        }

        // Notification records schema & seeding
        $pdo->exec("CREATE TABLE IF NOT EXISTS notification_records (
            id CHAR(64) NOT NULL PRIMARY KEY,
            notification_id VARCHAR(191) NOT NULL,
            target_role VARCHAR(16) NOT NULL,
            actor_id VARCHAR(50) NOT NULL,
            payload MEDIUMTEXT NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            audit_deleted TINYINT(1) NOT NULL DEFAULT 0,
            KEY audience(target_role)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

        $releasedStudentAssessments = [
            ['type' => 'Task', 'title' => 'Structured Analysis: Communication Processes and Models', 'id' => 'CORE-111-OC-T01-M03', 'topicIdx' => 0],
            ['type' => 'Quiz', 'title' => 'Communication Processes and Models Comprehensive Quiz', 'id' => 'QZ-CORE-111-OC-T01-04-MATERIAL', 'topicIdx' => 0],
            ['type' => 'Task', 'title' => 'Practice Exercise: Communicative Strategies', 'id' => 'CORE-111-OC-T05-M02', 'topicIdx' => 4],
            ['type' => 'Quiz', 'title' => 'Communicative Strategies Concept Quiz', 'id' => 'QZ-CORE-111-OC-T05-02-MATERIAL', 'topicIdx' => 4],
        ];
        $allStudents = $pdo->query("SELECT id, full_name, role FROM users WHERE is_deleted=0 AND (role='Student' OR LOWER(role)='student')")->fetchAll(PDO::FETCH_ASSOC);
        $recipientsList = [];
        foreach ($allStudents as $st) {
            $recipientsList[] = [
                'id' => (string)$st['id'],
                'name' => $st['full_name'] ?: 'Student',
                'role' => 'Student',
                'readAt' => null
            ];
        }
        if (empty($recipientsList)) {
            $recipientsList = [
                ['id' => '26010316', 'name' => 'Camille Torres Mendoza', 'role' => 'Student', 'readAt' => null],
                ['id' => '2222222', 'name' => 'Juan Abad Dela Cruz', 'role' => 'Student', 'readAt' => null],
                ['id' => '2601031', 'name' => 'Henry Wrecker Ochoa', 'role' => 'Student', 'readAt' => null],
                ['id' => '2601033', 'name' => 'Amanda Suri Gao', 'role' => 'Student', 'readAt' => null]
            ];
        }
        foreach ($releasedStudentAssessments as $ass) {
            $nId = 'notif_rel_init_' . md5($ass['id']);
            $nPayload = [
                'id' => $nId,
                'type' => 'assessment-released',
                'title' => 'New ' . $ass['type'] . ' Posted',
                'body' => $ass['title'] . ' coursework is now available.',
                'senderId' => $teacherId,
                'senderName' => 'Renato Ramos',
                'senderRole' => 'Teacher',
                'senderType' => 'user',
                'assignmentScope' => [
                    'section' => 'Einstein',
                    'subjectId' => 'CORE-111-OC',
                    'subjectName' => 'Oral Communication in Context'
                ],
                'target' => [
                    'subjectId' => 'CORE-111-OC',
                    'tab' => 'assessments',
                    'itemId' => $ass['id'],
                    'materialTitle' => $ass['title'],
                    'topicIdx' => $ass['topicIdx']
                ],
                'recipients' => $recipientsList,
                'read' => false,
                'timestamp' => gmdate('c')
            ];
            $dbRecId = hash('sha256', 'student|' . $nId . '|');
            $pdo->prepare("INSERT INTO notification_records (id, notification_id, target_role, actor_id, payload, created_at, audit_deleted) VALUES (?, ?, 'student', ?, ?, NOW(), 0) ON DUPLICATE KEY UPDATE payload = VALUES(payload)")
                ->execute([$dbRecId, $nId, $teacherId, json_encode($nPayload, JSON_THROW_ON_ERROR)]);
        }
    } catch (Throwable $e) {
        echo "Demonstration seeding note: " . $e->getMessage() . "\n";
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
