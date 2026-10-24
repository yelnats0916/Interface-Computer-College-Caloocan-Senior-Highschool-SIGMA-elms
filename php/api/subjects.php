<?php
require_once __DIR__.'/../includes/section_subject_policy.php';
require_once __DIR__.'/../includes/school_year_policy.php';
require_once dirname(__DIR__) . '/includes/data_provenance.php';
require_once dirname(__DIR__) . '/includes/record_creation_numbers.php';
/**
 * SIGMA ELMS — Subjects Management REST API
 * 
 * Endpoint: /php/api/subjects.php
 * Methods:
 *   GET    — List all active subjects (filter by status, id, or code)
 *   POST   — Save (insert/update) or delete a subject
 */

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
require_once dirname(__DIR__) . '/includes/service_vault_auth.php';
restrictServiceOrigin();
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Sigma-Actor');

$requestMethod = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($requestMethod === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$rootDir = dirname(__DIR__, 2);
require_once $rootDir . '/config/database.php';
require_once $rootDir . '/php/includes/application_auth.php';
require_once __DIR__ . '/../includes/activity_audit.php';
require_once __DIR__ . '/../includes/material_provenance.php';
$databaseActor = sigmaRequireApplicationActor($pdo, ['admin', 'masteradmin', 'administrator', 'teacher']);

function jsonResponse(array $data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

if (!$pdo) {
    jsonResponse(['success' => false, 'error' => 'Database connection unavailable', 'records' => []], 503);
}

// Auto-ensure subjects table exists
try {
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
} catch (Exception $e) {
    // Ignore if table exists or permission issue
}

$subjectColumns = $pdo->query('SHOW COLUMNS FROM subjects')->fetchAll(PDO::FETCH_COLUMN);
foreach (['grade_level' => 'VARCHAR(10) NULL', 'learning_hours' => 'INT NULL', 'curriculum_metadata' => 'LONGTEXT NULL'] as $column => $definition) {
    if (!in_array($column, $subjectColumns, true)) $pdo->exec("ALTER TABLE subjects ADD COLUMN `$column` $definition");
}

function decodeJsonField($raw, $fallback = []) {
    if (empty($raw)) return $fallback;
    if (is_array($raw)) return $raw;
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : $fallback;
}

function subjectRowToRecord(array $row): array {
    global $pdo;
    $reason=sigmaSubjectRemovalReason($pdo,$row);
    return [
        'canDelete'=>$reason==='',
        'deleteReason'=>$reason,
        'creationNumber' => sigmaTableCreationNumber($pdo, 'subjects', (string)$row['id']),
        'id'             => (string) $row['id'],
        'code'           => (string) $row['code'],
        'name'           => (string) $row['name'],
        'units'          => (string) ($row['units'] ?? ''),
        'gradeLevel'     => (string) ($row['grade_level'] ?? ''),
        'learningHours'  => isset($row['learning_hours']) ? (int)$row['learning_hours'] : null,
        'curriculum'     => decodeJsonField($row['curriculum_metadata'] ?? null, null),
        'type'           => (string) ($row['type'] ?? 'Core Subject'),
        'strand'         => (string) ($row['strand'] ?? ''),
        'weights'        => decodeJsonField($row['weights'] ?? null, null),
        'status'         => (string) ($row['status'] ?? 'Published'),
        'activeQuarters' => decodeJsonField($row['active_quarters'] ?? null, ['q1', 'q2']),
        'topics'         => decodeJsonField($row['topics'] ?? null, []),
        'materials'      => decodeJsonField($row['materials'] ?? null, []),
        'isDeleted'      => (bool) ($row['is_deleted'] ?? 0),
        'createdAt'      => $row['created_at'] ?? null,
        'updatedAt'      => $row['updated_at'] ?? null
    ];
}

$method = $requestMethod;

try {
    if ($method === 'GET') {
        $subjectId = trim($_GET['id'] ?? $_GET['code'] ?? '');
        $status = trim($_GET['status'] ?? '');

        if ($subjectId !== '') {
            $stmt = $pdo->prepare("SELECT * FROM `subjects` WHERE (`id` = :id OR `code` = :code_match) AND `is_deleted` = 0 LIMIT 1");
            $stmt->execute([':id' => $subjectId, ':code_match' => $subjectId]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$row) {
                jsonResponse(['success' => false, 'error' => 'Subject not found'], 404);
            }
            jsonResponse(['success' => true, 'subject' => subjectRowToRecord($row)]);
        }

        $query = "SELECT * FROM `subjects` WHERE `is_deleted` = 0";
        $params = [];

        if ($status !== '') {
            $query .= " AND `status` = :st";
            $params[':st'] = $status;
        }

        $query .= " ORDER BY `created_at` DESC";

        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $records = array_map('subjectRowToRecord', $rows);
        usort($records, static fn($a, $b) => $b['creationNumber'] <=> $a['creationNumber']);

        jsonResponse([
            'success' => true,
            'records' => $records,
            'count'   => count($records)
        ]);
    }

    if ($method === 'POST') {
        $raw = file_get_contents('php://input');
        $payload = json_decode($raw, true) ?: $_POST;
        sigmaRequireRealRecords($payload);

        $action = $payload['action'] ?? 'save';

        // ── Action: DELETE ───────────────────────────────────────
        if ($action === 'delete') {
            $target = trim((string) ($payload['code'] ?? $payload['id'] ?? ''));
            if (!$target) {
                jsonResponse(['success' => false, 'error' => 'Missing subject identifier for deletion'], 400);
            }

            $headers = function_exists('getallheaders') ? array_change_key_case(getallheaders(), CASE_LOWER) : [];
            $actor = (string)$databaseActor['id'];

            $findStmt = $pdo->prepare("SELECT id FROM `subjects` WHERE `id` = :id OR `code` = :code_match LIMIT 1");
            $findStmt->execute([':id' => $target, ':code_match' => $target]);
            $foundId = $findStmt->fetchColumn() ?: $target;

            $role=preg_replace('/[\s_-]+/','',strtolower($databaseActor['role']??''));
            $permissions=json_decode($databaseActor['permissions']??'{}',true)?:[];
            if($role!=='masteradmin' && (($permissions['subjectDelete']??false)!==true || ($permissions['schoolMain']??true)!==true))jsonResponse(['success'=>false,'error'=>'Subject deletion permission is required.'],403);
            sigmaLockSchoolYearWrites($pdo);$pdo->beginTransaction();
            $check=$pdo->prepare('SELECT * FROM subjects WHERE id=? FOR UPDATE');$check->execute([$foundId]);$record=$check->fetch(PDO::FETCH_ASSOC);
            if(!$record)throw new DomainException('Subject not found.');
            sigmaAssertSubjectRemovable($pdo,$record);
            $stmt = $pdo->prepare("UPDATE `subjects` SET `is_deleted` = 1, `deleted_at` = UTC_TIMESTAMP(), `deleted_by` = :actor WHERE `id` = :id OR `code` = :code_match");
            $stmt->execute([':id' => $target, ':code_match' => $target, ':actor' => $actor]);

            try {
                $logStmt = $pdo->prepare("INSERT INTO `record_lifecycle_events` (`table_name`, `record_id`, `action`, `actor_id`) VALUES ('subjects', ?, 'remove', ?)");
                $logStmt->execute([$foundId, $actor]);
            } catch (Throwable $e) {}

            $pdo->commit();$pdo->query("SELECT RELEASE_LOCK('sigma_school_year_write')");
            jsonResponse(['success' => true, 'message' => "Subject {$target} deleted successfully"]);
        }

        // ── Action: RESTORE ──────────────────────────────────────
        if ($action === 'restore') {
            $target = trim((string) ($payload['code'] ?? $payload['id'] ?? ''));
            if (!$target) {
                jsonResponse(['success' => false, 'error' => 'Missing subject identifier for restore'], 400);
            }

            $headers = function_exists('getallheaders') ? array_change_key_case(getallheaders(), CASE_LOWER) : [];
            $actor = (string)$databaseActor['id'];

            $findStmt = $pdo->prepare("SELECT id FROM `subjects` WHERE `id` = :id OR `code` = :code_match LIMIT 1");
            $findStmt->execute([':id' => $target, ':code_match' => $target]);
            $foundId = $findStmt->fetchColumn() ?: $target;

            $stmt = $pdo->prepare("UPDATE `subjects` SET `is_deleted` = 0, `deleted_at` = NULL, `deleted_by` = NULL WHERE `id` = :id OR `code` = :code_match");
            $stmt->execute([':id' => $target, ':code_match' => $target]);

            try {
                $logStmt = $pdo->prepare("INSERT INTO `record_lifecycle_events` (`table_name`, `record_id`, `action`, `actor_id`) VALUES ('subjects', ?, 'restore', ?)");
                $logStmt->execute([$foundId, $actor]);
            } catch (Throwable $e) {}

            jsonResponse(['success' => true, 'message' => "Subject {$target} restored successfully"]);
        }

        // ── Action: SAVE (single subject) ────────────────────────
        $subject = $payload['subject'] ?? $payload;
        if (!is_array($subject) || empty($subject['name']) || empty($subject['code'])) {
            jsonResponse(['success' => false, 'error' => 'Subject code and name are required.'], 400);
        }

        $code = trim((string) ($subject['code'] ?? ''));
        $name = trim((string) ($subject['name'] ?? ''));
        $id = trim((string) ($subject['id'] ?? $code));
        $units = trim((string) ($subject['units'] ?? ''));
        if ($units === '' || !is_numeric($units) || (float)$units <= 0) {
            jsonResponse(['success' => false, 'error' => 'Valid Subject Units are required.'], 400);
        }
        $type = trim((string) ($subject['type'] ?? 'Core Subject'));
        $strand = trim((string) ($subject['strand'] ?? ''));
        $gradeLevel = trim((string)($subject['gradeLevel'] ?? ''));
        $rawLearningHours = trim((string)($subject['learningHours'] ?? ''));
        if (!preg_match('/^[0-9]{1,4}$/', $rawLearningHours) || (int)$rawLearningHours < 1 || (int)$rawLearningHours > 1280) {
            jsonResponse(['success' => false, 'error' => 'Learning Hours are required and must be a whole number from 1 to 1280.'], 400);
        }
        $learningHours = (int)$rawLearningHours;
        if (!in_array($gradeLevel, ['', '11', '12'], true)) {
            jsonResponse(['success' => false, 'error' => 'Select Grade 11 or 12.'], 400);
        }
        $curriculum = json_encode($subject['curriculum'] ?? null, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $weights = json_encode($subject['weights'] ?? null);
        $activeQuarters = json_encode($subject['activeQuarters'] ?? ['q1', 'q2']);
        $status = trim((string) ($subject['status'] ?? 'Published'));
        $pdo->beginTransaction();
        $previousQuery = $pdo->prepare('SELECT topics,materials FROM subjects WHERE id=? OR code=? LIMIT 1 FOR UPDATE');
        $previousQuery->execute([$id,$code]);
        $previousRow = $previousQuery->fetch(PDO::FETCH_ASSOC) ?: [];
        $previous = ['topics'=>decodeJsonField($previousRow['topics'] ?? null), 'materials'=>decodeJsonField($previousRow['materials'] ?? null)];
        $subject['topics'] = $subject['topics'] ?? [];
        $createdMaterials = sigmaStampSubjectMaterials($subject,$previous,$databaseActor);
        $topics = json_encode($subject['topics'] ?? []);
        $materials = json_encode($subject['materials'] ?? []);

        $upsertSql = "INSERT INTO `subjects` (
            `id`, `code`, `name`, `units`, `grade_level`, `learning_hours`, `curriculum_metadata`, `type`, `strand`,
            `weights`, `active_quarters`, `status`, `topics`, `materials`, `is_deleted`
        ) VALUES (
            :id, :code, :name, :units, :grade_level, :learning_hours, :curriculum_metadata, :type, :strand,
            :weights, :active_quarters, :status, :topics, :materials, 0
        ) ON DUPLICATE KEY UPDATE
            `name`            = VALUES(`name`),
            `units`           = VALUES(`units`),
            `grade_level`     = VALUES(`grade_level`),
            `learning_hours`  = COALESCE(VALUES(`learning_hours`), `learning_hours`),
            `curriculum_metadata` = VALUES(`curriculum_metadata`),
            `type`            = VALUES(`type`),
            `strand`          = VALUES(`strand`),
            `weights`         = VALUES(`weights`),
            `active_quarters` = VALUES(`active_quarters`),
            `status`          = VALUES(`status`),
            `topics`          = VALUES(`topics`),
            `materials`       = VALUES(`materials`),
            `is_deleted`      = `is_deleted`";

        $stmt = $pdo->prepare($upsertSql);
        $stmt->execute([
            ':id'              => $id,
            ':code'            => $code,
            ':name'            => $name,
            ':units'           => $units,
            ':grade_level'     => $gradeLevel,
            ':learning_hours'  => $learningHours,
            ':curriculum_metadata' => $curriculum,
            ':type'            => $type,
            ':strand'          => $strand,
            ':weights'         => $weights,
            ':active_quarters' => $activeQuarters,
            ':status'          => $status,
            ':topics'          => $topics,
            ':materials'       => $materials
        ]);

        $stmt = $pdo->prepare("SELECT * FROM `subjects` WHERE `id` = :id OR `code` = :code_match LIMIT 1");
        $stmt->execute([':id' => $id, ':code_match' => $code]);
        $savedRow = $stmt->fetch(PDO::FETCH_ASSOC);
        sigmaRecordActivity($pdo, (string)$databaseActor['id'], 'Saved Subject', 'Curriculum', 'Subject code: '.$code."\nSubject name: ".$name."\nUnits: ".$savedRow['units']."\nLearning hours: ".$savedRow['learning_hours']." hours\nGrade level: ".$savedRow['grade_level']."\nType: ".$savedRow['type']."\nStatus: ".$savedRow['status']);
        foreach ($createdMaterials as $material) {
            sigmaRecordActivity($pdo,(string)$databaseActor['id'],'Created Material','Curriculum',
                'Subject: '.$code.' '.$name."\nTitle: ".($material['title']??'')."\nType: ".($material['type']??'')."\nDescription: ".($material['description']??''),
                ['materialId'=>$material['id'],'subjectId'=>$id,'topicId'=>$material['topicId']??null,'material'=>$material]);
        }
        $pdo->commit();

        jsonResponse([
            'success' => true,
            'message' => 'Subject saved successfully',
            'subject' => $savedRow ? subjectRowToRecord($savedRow) : $subject
        ]);
    }

    jsonResponse(['success' => false, 'error' => 'Method not allowed'], 405);
} catch (DomainException $e) {
    if($pdo->inTransaction())$pdo->rollBack();
    $pdo->query("SELECT RELEASE_LOCK('sigma_school_year_write')");
    jsonResponse(['success'=>false,'error'=>$e->getMessage()],409);
} catch (PDOException $e) {
    if($pdo->inTransaction())$pdo->rollBack();
    $pdo->query("SELECT RELEASE_LOCK('sigma_school_year_write')");
    if ($pdo->inTransaction()) $pdo->rollBack();
    jsonResponse(['success' => false, 'error' => 'Database error: ' . $e->getMessage()], 500);
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    jsonResponse(['success' => false, 'error' => 'Server error: ' . $e->getMessage()], 500);
}
