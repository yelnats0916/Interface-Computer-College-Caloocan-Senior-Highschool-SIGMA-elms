<?php
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

// Auto-ensure subjects table exists
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS `subjects` (
        `id` VARCHAR(64) NOT NULL PRIMARY KEY,
        `code` VARCHAR(50) NOT NULL UNIQUE,
        `name` VARCHAR(150) NOT NULL,
        `units` VARCHAR(10) NULL,
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

function decodeJsonField($raw, $fallback = []) {
    if (empty($raw)) return $fallback;
    if (is_array($raw)) return $raw;
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : $fallback;
}

function subjectRowToRecord(array $row): array {
    return [
        'id'             => (string) $row['id'],
        'code'           => (string) $row['code'],
        'name'           => (string) $row['name'],
        'units'          => (string) ($row['units'] ?? ''),
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
            $target = trim((string) ($payload['code'] ?? $payload['id'] ?? ''));
            if (!$target) {
                jsonResponse(['success' => false, 'error' => 'Missing subject identifier for deletion'], 400);
            }

            $stmt = $pdo->prepare("UPDATE `subjects` SET `is_deleted` = 1 WHERE `id` = :id OR `code` = :code_match");
            $stmt->execute([':id' => $target, ':code_match' => $target]);

            jsonResponse(['success' => true, 'message' => "Subject {$target} deleted successfully"]);
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
        $type = trim((string) ($subject['type'] ?? 'Core Subject'));
        $strand = trim((string) ($subject['strand'] ?? ''));
        $weights = json_encode($subject['weights'] ?? null);
        $activeQuarters = json_encode($subject['activeQuarters'] ?? ['q1', 'q2']);
        $status = trim((string) ($subject['status'] ?? 'Published'));
        $topics = json_encode($subject['topics'] ?? []);
        $materials = json_encode($subject['materials'] ?? []);

        $upsertSql = "INSERT INTO `subjects` (
            `id`, `code`, `name`, `units`, `type`, `strand`,
            `weights`, `active_quarters`, `status`, `topics`, `materials`, `is_deleted`
        ) VALUES (
            :id, :code, :name, :units, :type, :strand,
            :weights, :active_quarters, :status, :topics, :materials, 0
        ) ON DUPLICATE KEY UPDATE
            `name`            = VALUES(`name`),
            `units`           = VALUES(`units`),
            `type`            = VALUES(`type`),
            `strand`          = VALUES(`strand`),
            `weights`         = VALUES(`weights`),
            `active_quarters` = VALUES(`active_quarters`),
            `status`          = VALUES(`status`),
            `topics`          = VALUES(`topics`),
            `materials`       = VALUES(`materials`),
            `is_deleted`      = 0";

        $stmt = $pdo->prepare($upsertSql);
        $stmt->execute([
            ':id'              => $id,
            ':code'            => $code,
            ':name'            => $name,
            ':units'           => $units,
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

        jsonResponse([
            'success' => true,
            'message' => 'Subject saved successfully',
            'subject' => $savedRow ? subjectRowToRecord($savedRow) : $subject
        ]);
    }

    jsonResponse(['success' => false, 'error' => 'Method not allowed'], 405);
} catch (PDOException $e) {
    jsonResponse(['success' => false, 'error' => 'Database error: ' . $e->getMessage()], 500);
} catch (Exception $e) {
    jsonResponse(['success' => false, 'error' => 'Server error: ' . $e->getMessage()], 500);
}
