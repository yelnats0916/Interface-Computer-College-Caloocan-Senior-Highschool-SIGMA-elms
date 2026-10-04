<?php
/**
 * SIGMA ELMS — Quiz Library REST API
 * 
 * Endpoint: /php/api/quiz_library.php
 * Methods:
 *   GET    — List all non-deleted quizzes
 *   POST   — Create or update a quiz
 *   DELETE — Soft-delete a quiz by ?id=...
 */

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

$requestMethod = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($requestMethod === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$rootDir = dirname(__DIR__, 2);
require_once $rootDir . '/config/database.php';

if (session_status() === PHP_SESSION_NONE) {
    @session_start();
}

function jsonResponse(array $data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

if (!$pdo) {
    jsonResponse(['success' => false, 'error' => 'Database connection unavailable', 'quizzes' => []], 503);
}

// Auto-ensure quizzes table exists
try {
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
} catch (Exception $e) {
    // Ignore if table exists or permission issue
}

function decodeQuestions($raw) {
    if (empty($raw)) return [];
    if (is_array($raw)) return $raw;
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function quizRowToRecord(array $row): array {
    $questions = decodeQuestions($row['questions'] ?? null);
    $totalQuestions = (int) ($row['total_questions'] ?? count($questions));
    $totalPoints = (int) ($row['total_points'] ?? 0);
    if ($totalPoints === 0 && !empty($questions)) {
        foreach ($questions as $q) {
            $totalPoints += (int) ($q['points'] ?? 10);
        }
    }

    return [
        'id'             => (string) $row['id'],
        'code'           => (string) ($row['code'] ?? ''),
        'title'          => (string) $row['title'],
        'description'    => (string) ($row['description'] ?? ''),
        'desc'           => (string) ($row['description'] ?? ''),
        'status'         => (string) ($row['status'] ?? 'published'),
        'isDraft'        => strtolower($row['status'] ?? '') === 'draft',
        'authorId'       => (string) ($row['author_id'] ?? ''),
        'authorName'     => (string) ($row['author_name'] ?? 'Admin'),
        'authorRole'     => (string) ($row['author_role'] ?? 'Admin'),
        'questions'      => $questions,
        'questionsCount' => $totalQuestions,
        'totalQuestions' => $totalQuestions,
        'totalPoints'    => $totalPoints,
        'timeLimit'      => (int) ($row['time_limit'] ?? 0),
        'icon'           => (string) ($row['icon'] ?? ''),
        'color'          => (string) ($row['color'] ?? ''),
        'isAi'           => (bool) ($row['is_ai'] ?? 0),
        'createdAt'      => $row['created_at'] ?? null,
        'updatedAt'      => $row['updated_at'] ?? null
    ];
}

$method = $requestMethod;

try {
    if ($method === 'GET') {
        $quizId = trim($_GET['id'] ?? '');
        $status = trim($_GET['status'] ?? '');
        $search = trim($_GET['q'] ?? $_GET['search'] ?? '');

        if ($quizId !== '') {
            $stmt = $pdo->prepare("SELECT * FROM `quizzes` WHERE (`id` = :id OR `code` = :code_match) AND `is_deleted` = 0 LIMIT 1");
            $stmt->execute([':id' => $quizId, ':code_match' => $quizId]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$row) {
                jsonResponse(['success' => false, 'error' => 'Quiz not found'], 404);
            }
            jsonResponse(['success' => true, 'quiz' => quizRowToRecord($row)]);
        }

        $query = "SELECT * FROM `quizzes` WHERE `is_deleted` = 0";
        $params = [];

        if ($status !== '') {
            $query .= " AND `status` = :st";
            $params[':st'] = $status;
        }

        if ($search !== '') {
            $query .= " AND (`title` LIKE :srch OR `code` LIKE :srch OR `description` LIKE :srch)";
            $params[':srch'] = "%{$search}%";
        }

        $query .= " ORDER BY `created_at` DESC";

        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $quizzes = array_map('quizRowToRecord', $rows);

        jsonResponse([
            'success' => true,
            'quizzes' => $quizzes,
            'count'   => count($quizzes)
        ]);
    }

    if ($method === 'POST') {
        $raw = file_get_contents('php://input');
        $payload = json_decode($raw, true) ?: $_POST;

        $action = $payload['action'] ?? 'save';

        if ($action === 'delete') {
            $target = trim((string) ($payload['id'] ?? $payload['code'] ?? ''));
            if (!$target) {
                jsonResponse(['success' => false, 'error' => 'Missing quiz identifier for deletion'], 400);
            }

            $stmt = $pdo->prepare("UPDATE `quizzes` SET `is_deleted` = 1, `deleted_at` = NOW() WHERE `id` = :id OR `code` = :code_match");
            $stmt->execute([':id' => $target, ':code_match' => $target]);

            jsonResponse(['success' => true, 'message' => "Quiz {$target} deleted successfully"]);
        }

        // Action: SAVE (single quiz)
        $quiz = $payload['quiz'] ?? $payload;
        if (!is_array($quiz) || empty($quiz['title'])) {
            jsonResponse(['success' => false, 'error' => 'Quiz title is required.'], 400);
        }

        $id = trim((string) ($quiz['id'] ?? ''));
        if (!$id) {
            $id = 'quiz-' . time() . '-' . substr(bin2hex(random_bytes(3)), 0, 6);
        }

        $code = trim((string) ($quiz['code'] ?? ''));
        if (!$code) {
            $code = '#QZ-' . substr(preg_replace('/[^0-9]/', '', $id) ?: (string) rand(1000, 9999), -4);
        }

        $title = trim((string) ($quiz['title'] ?? 'Untitled Quiz'));
        $description = trim((string) ($quiz['description'] ?? $quiz['desc'] ?? ''));
        $status = strtolower(trim((string) ($quiz['status'] ?? 'published')));
        if ($status !== 'draft') $status = 'published';

        $authorId = trim((string) ($quiz['authorId'] ?? $quiz['author_id'] ?? $_SESSION['user_id'] ?? '0000000'));
        $authorName = trim((string) ($quiz['authorName'] ?? $quiz['author_name'] ?? 'Stanley Garcia'));
        $authorRole = trim((string) ($quiz['authorRole'] ?? $quiz['author_role'] ?? 'Admin'));

        $questionsArr = $quiz['questions'] ?? [];
        if (!is_array($questionsArr)) $questionsArr = [];
        $questionsJson = json_encode($questionsArr);

        $totalQuestions = isset($quiz['totalQuestions']) ? (int) $quiz['totalQuestions'] : count($questionsArr);
        $totalPoints = isset($quiz['totalPoints']) ? (int) $quiz['totalPoints'] : 0;
        if ($totalPoints === 0 && !empty($questionsArr)) {
            foreach ($questionsArr as $q) {
                $totalPoints += (int) ($q['points'] ?? 10);
            }
        }

        $timeLimit = (int) ($quiz['timeLimit'] ?? $quiz['time_limit'] ?? 0);
        $icon = trim((string) ($quiz['icon'] ?? ''));
        $color = trim((string) ($quiz['color'] ?? ''));
        $isAi = (!empty($quiz['isAi']) || !empty($quiz['isAiGenerated']) || !empty($quiz['is_ai']) || (($quiz['source'] ?? '') === 'ai')) ? 1 : 0;

        $upsertSql = "INSERT INTO `quizzes` (
            `id`, `code`, `title`, `description`, `status`,
            `author_id`, `author_name`, `author_role`,
            `questions`, `total_questions`, `total_points`, `time_limit`,
            `icon`, `color`, `is_ai`, `is_deleted`
        ) VALUES (
            :id, :code, :title, :description, :status,
            :author_id, :author_name, :author_role,
            :questions, :total_questions, :total_points, :time_limit,
            :icon, :color, :is_ai, 0
        ) ON DUPLICATE KEY UPDATE
            `code`            = VALUES(`code`),
            `title`           = VALUES(`title`),
            `description`     = VALUES(`description`),
            `status`          = VALUES(`status`),
            `author_id`       = VALUES(`author_id`),
            `author_name`     = VALUES(`author_name`),
            `author_role`     = VALUES(`author_role`),
            `questions`       = VALUES(`questions`),
            `total_questions` = VALUES(`total_questions`),
            `total_points`    = VALUES(`total_points`),
            `time_limit`      = VALUES(`time_limit`),
            `icon`            = VALUES(`icon`),
            `color`           = VALUES(`color`),
            `is_ai`           = VALUES(`is_ai`),
            `is_deleted`      = 0";

        $stmt = $pdo->prepare($upsertSql);
        $stmt->execute([
            ':id'              => $id,
            ':code'            => $code,
            ':title'           => $title,
            ':description'     => $description,
            ':status'          => $status,
            ':author_id'       => $authorId,
            ':author_name'     => $authorName,
            ':author_role'     => $authorRole,
            ':questions'       => $questionsJson,
            ':total_questions' => $totalQuestions,
            ':total_points'    => $totalPoints,
            ':time_limit'      => $timeLimit,
            ':icon'            => $icon,
            ':color'           => $color,
            ':is_ai'           => $isAi
        ]);

        $stmt = $pdo->prepare("SELECT * FROM `quizzes` WHERE `id` = :id LIMIT 1");
        $stmt->execute([':id' => $id]);
        $savedRow = $stmt->fetch(PDO::FETCH_ASSOC);

        jsonResponse([
            'success' => true,
            'message' => 'Quiz saved successfully',
            'quiz'    => $savedRow ? quizRowToRecord($savedRow) : $quiz
        ]);
    }

    if ($method === 'DELETE') {
        $target = trim((string) ($_GET['id'] ?? ''));
        if (!$target) {
            jsonResponse(['success' => false, 'error' => 'Missing ?id parameter'], 400);
        }

        $stmt = $pdo->prepare("UPDATE `quizzes` SET `is_deleted` = 1, `deleted_at` = NOW() WHERE `id` = :id OR `code` = :code_match");
        $stmt->execute([':id' => $target, ':code_match' => $target]);

        jsonResponse(['success' => true, 'message' => "Quiz {$target} deleted successfully"]);
    }

    jsonResponse(['success' => false, 'error' => 'Method not allowed'], 405);
} catch (PDOException $e) {
    jsonResponse(['success' => false, 'error' => 'Database error: ' . $e->getMessage()], 500);
} catch (Exception $e) {
    jsonResponse(['success' => false, 'error' => 'Server error: ' . $e->getMessage()], 500);
}
