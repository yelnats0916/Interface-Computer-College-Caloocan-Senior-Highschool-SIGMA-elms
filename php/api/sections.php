<?php
require_once __DIR__.'/../includes/school_year_policy.php';
require_once dirname(__DIR__) . '/includes/data_provenance.php';
require_once dirname(__DIR__) . '/includes/record_creation_numbers.php';
/**
 * SIGMA ELMS — Sections Management REST API
 * 
 * Endpoint: /php/api/sections.php
 * Methods:
 *   GET    — List all sections (filter by school_year, status, or id)
 *   POST   — Save (insert/update), delete, or batch-sync sections
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
require_once __DIR__ . '/../includes/section_subject_policy.php';
require_once __DIR__ . '/../includes/section_assignment_validation.php';
$databaseActor = sigmaRequireApplicationActor($pdo, ['admin', 'masteradmin', 'administrator', 'teacher']);

function jsonResponse(array $data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

if (!$pdo) {
    jsonResponse(['success' => false, 'error' => 'Database connection unavailable', 'records' => []], 503);
}

// Auto-ensure table exists
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS `sections` (
        `id` VARCHAR(64) NOT NULL PRIMARY KEY,
        `name` VARCHAR(100) NOT NULL,
        `grade_level` VARCHAR(50) NOT NULL,
        `room` VARCHAR(50) NULL,
        `school_year` VARCHAR(50) NOT NULL,
        `start_time` VARCHAR(20) NULL,
        `end_time` VARCHAR(20) NULL,
        `days` VARCHAR(100) NULL,
        `schedule` VARCHAR(255) NULL,
        `daily_schedules` LONGTEXT NULL,
        `teacher` VARCHAR(100) NULL,
        `teacher_role` VARCHAR(50) NULL,
        `teachers` LONGTEXT NULL,
        `adviser` VARCHAR(100) NULL,
        `adviser_id` VARCHAR(50) NULL,
        `subject` VARCHAR(150) NULL,
        `subjects` LONGTEXT NULL,
        `students` LONGTEXT NULL,
        `students_count` INT UNSIGNED DEFAULT 0,
        `status` VARCHAR(30) DEFAULT 'Deployed',
        `is_deleted` TINYINT(1) DEFAULT 0,
        `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX `idx_section_name` (`name`),
        INDEX `idx_section_school_year` (`school_year`),
        INDEX `idx_section_status` (`status`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    $pdo->query("SELECT RELEASE_LOCK('sigma_school_year_write')");
    // Ignore if table exists or permission issue
}

function decodeJsonField($raw, $fallback = []) {
    if (empty($raw)) return $fallback;
    if (is_array($raw)) return $raw;
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : $fallback;
}

function sectionRowToRecord(array $row): array {
    global $pdo;
    $dailySchedules = decodeJsonField($row['daily_schedules'] ?? null, []);
    $teachers = decodeJsonField($row['teachers'] ?? null, []);
    $subjects = decodeJsonField($row['subjects'] ?? null, []);
    $students = decodeJsonField($row['students'] ?? null, []);

    $daysRaw = (string) ($row['days'] ?? '');
    $daysArray = [];
    if (!empty($daysRaw)) {
        $daysArray = array_map('trim', explode(',', $daysRaw));
    }

    $primarySubject = (string) ($row['subject'] ?? '');
    if (empty($subjects) && !empty($primarySubject)) {
        $subjects = [$primarySubject];
    }

    return [
        'creationNumber' => sigmaTableCreationNumber($pdo, 'sections', (string)$row['id']),
        'id'               => (string) $row['id'],
        'name'             => (string) $row['name'],
        'grade'            => (string) $row['grade_level'],
        'gradeLevel'       => (string) $row['grade_level'],
        'room'             => (string) ($row['room'] ?? ''),
        'schoolYear'       => (string) ($row['school_year'] ?? ''),
        'startTime'        => (string) ($row['start_time'] ?? ''),
        'endTime'          => (string) ($row['end_time'] ?? ''),
        'days'             => $daysArray,
        'daysFormatted'    => $daysRaw,
        'schedule'         => (string) ($row['schedule'] ?? ''),
        'dailySchedules'   => $dailySchedules,
        'teacher'          => (string) ($row['teacher'] ?? ''),
        'role'             => (string) ($row['teacher_role'] ?? 'Teacher'),
        'teachers'         => $teachers,
        'adviser'          => (string) ($row['adviser'] ?? ''),
        'adviserId'        => (string) ($row['adviser_id'] ?? ''),
        'subject'          => $primarySubject,
        'assignedSubjects' => $subjects,
        'subjects'         => $subjects,
        'students'         => $students,
        'studentsCount'    => (int) ($row['students_count'] ?? count($students)),
        'status'           => (string) ($row['status'] ?? 'Deployed'),
        'isDeleted'        => (bool) ($row['is_deleted'] ?? 0),
        'createdAt'        => $row['created_at'] ?? null,
        'updatedAt'        => $row['updated_at'] ?? null
    ];
}

$method = $requestMethod;

try {
    if ($method === 'GET') {
        $sectionId = trim($_GET['id'] ?? '');
        $schoolYear = trim($_GET['school_year'] ?? '');
        $status = trim($_GET['status'] ?? '');

        if ($sectionId !== '') {
            $stmt = $pdo->prepare("SELECT * FROM `sections` WHERE (`id` = :id OR `name` = :target_name) AND `is_deleted` = 0 LIMIT 1");
            $stmt->execute([':id' => $sectionId, ':target_name' => $sectionId]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$row) {
                jsonResponse(['success' => false, 'error' => 'Section not found'], 404);
            }
            jsonResponse(['success' => true, 'section' => sectionRowToRecord($row)]);
        }

        $query = "SELECT * FROM `sections` WHERE `is_deleted` = 0";
        $params = [];

        if ($schoolYear !== '') {
            $query .= " AND `school_year` = :sy";
            $params[':sy'] = $schoolYear;
        }

        if ($status !== '') {
            $query .= " AND `status` = :st";
            $params[':st'] = $status;
        }

        $query .= " ORDER BY `created_at` DESC";

        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $records = array_map('sectionRowToRecord', $rows);

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
            $targetId = trim((string) ($payload['id'] ?? $payload['name'] ?? ''));
            if (!$targetId) {
                jsonResponse(['success' => false, 'error' => 'Missing section identifier for deletion'], 400);
            }

            $headers = function_exists('getallheaders') ? array_change_key_case(getallheaders(), CASE_LOWER) : [];
            $actor = (string)$databaseActor['id'];

            // Look up the exact id to record in lifecycle events
            $findStmt = $pdo->prepare("SELECT id FROM `sections` WHERE `id` = :id OR `name` = :target_name LIMIT 1");
            $findStmt->execute([':id' => $targetId, ':target_name' => $targetId]);
            $foundId = $findStmt->fetchColumn() ?: $targetId;

            $stmt = $pdo->prepare("UPDATE `sections` SET `is_deleted` = 1, `deleted_at` = UTC_TIMESTAMP(), `deleted_by` = :actor WHERE `id` = :id OR `name` = :target_name");
            $stmt->execute([':id' => $targetId, ':target_name' => $targetId, ':actor' => $actor]);

            try {
                $logStmt = $pdo->prepare("INSERT INTO `record_lifecycle_events` (`table_name`, `record_id`, `action`, `actor_id`) VALUES ('sections', ?, 'remove', ?)");
                $logStmt->execute([$foundId, $actor]);
            } catch (Throwable $e) {}

            jsonResponse(['success' => true, 'message' => "Section {$targetId} deleted successfully"]);
        }

        // ── Action: RESTORE ──────────────────────────────────────
        if ($action === 'restore') {
            $targetId = trim((string) ($payload['id'] ?? $payload['name'] ?? ''));
            if (!$targetId) {
                jsonResponse(['success' => false, 'error' => 'Missing section identifier for restore'], 400);
            }

            $headers = function_exists('getallheaders') ? array_change_key_case(getallheaders(), CASE_LOWER) : [];
            $actor = (string)$databaseActor['id'];

            $findStmt = $pdo->prepare("SELECT id FROM `sections` WHERE `id` = :id OR `name` = :target_name LIMIT 1");
            $findStmt->execute([':id' => $targetId, ':target_name' => $targetId]);
            $foundId = $findStmt->fetchColumn() ?: $targetId;

            sigmaLockSchoolYearWrites($pdo);
            $pdo->beginTransaction();
            $sectionYear=$pdo->prepare('SELECT school_year FROM sections WHERE id=? FOR UPDATE');
            $sectionYear->execute([$foundId]);
            sigmaRequireSectionSchoolYear($pdo,(string)$sectionYear->fetchColumn());
            $stmt = $pdo->prepare("UPDATE `sections` SET `is_deleted` = 0, `deleted_at` = NULL, `deleted_by` = NULL WHERE `id` = :id OR `name` = :target_name");
            $stmt->execute([':id' => $targetId, ':target_name' => $targetId]);

            try {
                $logStmt = $pdo->prepare("INSERT INTO `record_lifecycle_events` (`table_name`, `record_id`, `action`, `actor_id`) VALUES ('sections', ?, 'restore', ?)");
                $logStmt->execute([$foundId, $actor]);
            } catch (Throwable $e) {}

            $pdo->commit();
            $pdo->query("SELECT RELEASE_LOCK('sigma_school_year_write')");
            jsonResponse(['success' => true, 'message' => "Section {$targetId} restored successfully"]);
        }

        // ── Action: SAVE (single section) ────────────────────────
        $section = $payload['section'] ?? $payload;
        if (!is_array($section) || empty($section['name'])) {
            jsonResponse(['success' => false, 'error' => 'Section name is required.'], 400);
        }

        $secId = trim((string) ($section['id'] ?? ''));
        if (!$secId) {
            $secId = 'SEC-' . strtoupper(substr(bin2hex(random_bytes(4)), 0, 8));
        }

        $name = trim((string) ($section['name'] ?? ''));
        $grade = trim((string) ($section['grade'] ?? $section['gradeLevel'] ?? ''));
        $room = trim((string) ($section['room'] ?? ''));
        $sy = trim((string) ($section['schoolYear'] ?? ''));
        $startTime = trim((string) ($section['startTime'] ?? ''));
        $endTime = trim((string) ($section['endTime'] ?? ''));
        $days = is_array($section['days'] ?? null) ? implode(', ', $section['days']) : (string) ($section['daysFormatted'] ?? $section['days'] ?? '');
        $schedule = trim((string) ($section['schedule'] ?? ''));
        $dailySched = json_encode($section['dailySchedules'] ?? []);
        $teacher = trim((string) ($section['teacher'] ?? ''));
        $role = trim((string) ($section['role'] ?? 'Teacher'));
        $teachers = json_encode($section['teachers'] ?? []);
        $adviser = trim((string) ($section['adviser'] ?? ''));
        $adviserId = trim((string) ($section['adviserId'] ?? ''));
        $subject = trim((string) ($section['subject'] ?? ''));
        $subjects = json_encode($section['subjects'] ?? ($section['assignedSubjects'] ?? ($subject ? [$subject] : [])));
        $students = json_encode($section['students'] ?? []);
        $studentsCount = is_array($section['students'] ?? null) ? count($section['students']) : 0;
        $status = trim((string) ($section['status'] ?? 'Deployed'));

        sigmaLockSchoolYearWrites($pdo);
        $pdo->beginTransaction();
        sigmaRequireSectionSchoolYear($pdo,$sy);
        sigmaValidateSectionAssignments($section,
            $pdo->query('SELECT id,first_name,last_name,full_name,role,status,is_deleted FROM users')->fetchAll(PDO::FETCH_ASSOC),
            $pdo->query('SELECT id,name,grade_level,school_year,room,subject,teachers,students,daily_schedules,days,start_time,end_time,status,is_deleted FROM sections')->fetchAll(PDO::FETCH_ASSOC));
        $previousQuery=$pdo->prepare('SELECT subject,subjects FROM sections WHERE id=?');$previousQuery->execute([$secId]);
        sigmaValidateSectionSubjectAssignments($pdo,$section,$previousQuery->fetch(PDO::FETCH_ASSOC)?:null);
        $upsertSql = "INSERT INTO `sections` (
            `id`, `name`, `grade_level`, `room`, `school_year`,
            `start_time`, `end_time`, `days`, `schedule`, `daily_schedules`,
            `teacher`, `teacher_role`, `teachers`, `adviser`, `adviser_id`,
            `subject`, `subjects`, `students`, `students_count`, `status`, `is_deleted`
        ) VALUES (
            :id, :name, :grade_level, :room, :school_year,
            :start_time, :end_time, :days, :schedule, :daily_schedules,
            :teacher, :teacher_role, :teachers, :adviser, :adviser_id,
            :subject, :subjects, :students, :students_count, :status, 0
        ) ON DUPLICATE KEY UPDATE
            `name`            = VALUES(`name`),
            `grade_level`     = VALUES(`grade_level`),
            `room`            = VALUES(`room`),
            `school_year`     = VALUES(`school_year`),
            `start_time`      = VALUES(`start_time`),
            `end_time`        = VALUES(`end_time`),
            `days`            = VALUES(`days`),
            `schedule`        = VALUES(`schedule`),
            `daily_schedules` = VALUES(`daily_schedules`),
            `teacher`         = VALUES(`teacher`),
            `teacher_role`    = VALUES(`teacher_role`),
            `teachers`        = VALUES(`teachers`),
            `adviser`         = VALUES(`adviser`),
            `adviser_id`      = VALUES(`adviser_id`),
            `subject`         = VALUES(`subject`),
            `subjects`        = VALUES(`subjects`),
            `students`        = VALUES(`students`),
            `students_count`  = VALUES(`students_count`),
            `status`          = VALUES(`status`),
            `is_deleted`      = `is_deleted`";

        $stmt = $pdo->prepare($upsertSql);
        $stmt->execute([
            ':id'              => $secId,
            ':name'            => $name,
            ':grade_level'     => $grade,
            ':room'            => $room,
            ':school_year'     => $sy,
            ':start_time'      => $startTime,
            ':end_time'        => $endTime,
            ':days'            => $days,
            ':schedule'        => $schedule,
            ':daily_schedules' => $dailySched,
            ':teacher'         => $teacher,
            ':teacher_role'    => $role,
            ':teachers'        => $teachers,
            ':adviser'         => $adviser,
            ':adviser_id'      => $adviserId,
            ':subject'         => $subject,
            ':subjects'        => $subjects,
            ':students'        => $students,
            ':students_count'  => $studentsCount,
            ':status'          => $status
        ]);

        // One canonical adviser across every subject assignment in the section.
        $groupQuery=$pdo->prepare('SELECT id,teachers,teacher_role FROM sections WHERE name=? AND grade_level=? AND school_year=? AND is_deleted=0 FOR UPDATE');
        $groupQuery->execute([$name,$grade,$sy]);
        $groupUpdate=$pdo->prepare('UPDATE sections SET adviser=?,adviser_id=?,teachers=?,teacher_role=? WHERE id=?');
        foreach($groupQuery->fetchAll(PDO::FETCH_ASSOC) as $groupRow){
            $groupTeachers=sigmaSectionAdviserTeachers(decodeJsonField($groupRow['teachers'],[]),$adviserId);
            $lead=null;foreach($groupTeachers as $candidate)if(!empty($candidate['isPrimary'])){$lead=$candidate;break;}
            $lead=$lead??($groupTeachers[0]??null);
            $groupUpdate->execute([$adviser,$adviserId,json_encode($groupTeachers),$lead['role']??$groupRow['teacher_role'],$groupRow['id']]);
        }
        $pdo->commit();
        $pdo->query("SELECT RELEASE_LOCK('sigma_school_year_write')");

        // Fetch back saved row
        $stmt = $pdo->prepare("SELECT * FROM `sections` WHERE `id` = :id LIMIT 1");
        $stmt->execute([':id' => $secId]);
        $savedRow = $stmt->fetch(PDO::FETCH_ASSOC);
        sigmaRecordActivity($pdo, (string)$databaseActor['id'], 'Saved Section', 'Classes', 'Section '.$secId);

        jsonResponse([
            'success' => true,
            'message' => 'Section saved successfully',
            'section' => $savedRow ? sectionRowToRecord($savedRow) : $section
        ]);
    }

    jsonResponse(['success' => false, 'error' => 'Method not allowed'], 405);
} catch (DomainException $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    $pdo->query("SELECT RELEASE_LOCK('sigma_school_year_write')");
    jsonResponse(['success'=>false,'error'=>$e->getMessage()],409);
} catch (InvalidArgumentException $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    $pdo->query("SELECT RELEASE_LOCK('sigma_school_year_write')");
    jsonResponse(['success'=>false,'error'=>$e->getMessage()],422);
} catch (PDOException $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    $pdo->query("SELECT RELEASE_LOCK('sigma_school_year_write')");
    jsonResponse(['success' => false, 'error' => 'Database error: ' . $e->getMessage()], 500);
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    $pdo->query("SELECT RELEASE_LOCK('sigma_school_year_write')");
    jsonResponse(['success' => false, 'error' => 'Server error: ' . $e->getMessage()], 500);
}
