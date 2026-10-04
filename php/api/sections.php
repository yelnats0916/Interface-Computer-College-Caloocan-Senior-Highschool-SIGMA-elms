<?php
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
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

$requestMethod = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($requestMethod === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$rootDir = dirname(__DIR__, 2);
require_once $rootDir . '/config/database.php';

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
    // Ignore if table exists or permission issue
}

function decodeJsonField($raw, $fallback = []) {
    if (empty($raw)) return $fallback;
    if (is_array($raw)) return $raw;
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : $fallback;
}

function sectionRowToRecord(array $row): array {
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

        $action = $payload['action'] ?? 'save';

        // ── Action: DELETE ───────────────────────────────────────
        if ($action === 'delete') {
            $targetId = trim((string) ($payload['id'] ?? $payload['name'] ?? ''));
            if (!$targetId) {
                jsonResponse(['success' => false, 'error' => 'Missing section identifier for deletion'], 400);
            }

            $stmt = $pdo->prepare("UPDATE `sections` SET `is_deleted` = 1 WHERE `id` = :id OR `name` = :target_name");
            $stmt->execute([':id' => $targetId, ':target_name' => $targetId]);

            jsonResponse(['success' => true, 'message' => "Section {$targetId} deleted successfully"]);
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
        $studentsCount = isset($section['studentsCount']) ? (int) $section['studentsCount'] : (is_array($section['students'] ?? null) ? count($section['students']) : 0);
        $status = trim((string) ($section['status'] ?? 'Deployed'));

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
            `is_deleted`      = 0";

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

        // Fetch back saved row
        $stmt = $pdo->prepare("SELECT * FROM `sections` WHERE `id` = :id LIMIT 1");
        $stmt->execute([':id' => $secId]);
        $savedRow = $stmt->fetch(PDO::FETCH_ASSOC);

        jsonResponse([
            'success' => true,
            'message' => 'Section saved successfully',
            'section' => $savedRow ? sectionRowToRecord($savedRow) : $section
        ]);
    }

    jsonResponse(['success' => false, 'error' => 'Method not allowed'], 405);
} catch (PDOException $e) {
    jsonResponse(['success' => false, 'error' => 'Database error: ' . $e->getMessage()], 500);
} catch (Exception $e) {
    jsonResponse(['success' => false, 'error' => 'Server error: ' . $e->getMessage()], 500);
}
