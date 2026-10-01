<?php
/**
 * SIGMA ELMS — Quiz Library REST API
 * 
 * Endpoint: /php/api/quiz_library.php
 *
 * Methods:
 *   GET    — list quizzes for the current user
 *   POST   — create or update a quiz
 *   DELETE — soft-delete a quiz by ?id=...
 *
 * Auth: session-based ($_SESSION['user_id'] set by login)
 * DB:   uses PDO from /config/database.php
 *
 * Capstone 2 integration guide:
 *   1. Make sure sessions are started in your main entry (login.php / index.php)
 *   2. Run database/quiz_library.sql to create the quizzes table
 *   3. In JS, set window.SIGMA_USE_SERVER_STORAGE = true  (see shared-components.js)
 */

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

// ── Bootstrap ─────────────────────────────────────────────────
$rootDir = dirname(__DIR__, 2); // sigma-elms root
require_once $rootDir . '/config/database.php'; // provides $pdo

// Start session if not already started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// ── Auth helper ───────────────────────────────────────────────
function requireAuth(): int {
    if (empty($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Unauthenticated']);
        exit;
    }
    return (int) $_SESSION['user_id'];
}

function jsonResponse(array $data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data);
    exit;
}

// ── No DB available — graceful fallback ──────────────────────
if (!$pdo) {
    jsonResponse(['success' => false, 'error' => 'Database unavailable', 'quizzes' => []], 503);
}

// ── Router ────────────────────────────────────────────────────
$method = $_SERVER['REQUEST_METHOD'];

try {
    match ($method) {
        'GET'    => handleGet($pdo),
        'POST'   => handlePost($pdo),
        'DELETE' => handleDelete($pdo),
        default  => jsonResponse(['success' => false, 'error' => 'Method not allowed'], 405),
    };
} catch (Throwable $e) {
    error_log('[quiz_library.php] ' . $e->getMessage());
    jsonResponse(['success' => false, 'error' => 'Server error'], 500);
}

// ══════════════════════════════════════════════════════════════
// GET  — fetch quizzes
// ══════════════════════════════════════════════════════════════
function handleGet(PDO $pdo): void {
    $userId = requireAuth();

    // Optional filters
    $status = $_GET['status'] ?? null;   // 'draft' | 'published' | null = all
    $search = $_GET['q']      ?? null;

    $sql = 'SELECT
                q.*,
                u.name   AS author_name,
                u.role   AS author_role,
                u.school_id AS author_school_id
            FROM quizzes q
            JOIN users u ON u.id = q.author_id
            WHERE q.deleted_at IS NULL';
    $params = [];

    // Drafts are private — only the owner can see them
    if ($status === 'draft') {
        $sql .= ' AND q.status = :status AND q.author_id = :uid';
        $params[':status'] = 'draft';
        $params[':uid']    = $userId;
    } elseif ($status === 'published') {
        $sql .= ' AND q.status = :status';
        $params[':status'] = 'published';
    } else {
        // All: published from anyone + own drafts
        $sql .= ' AND (q.status = \'published\' OR (q.status = \'draft\' AND q.author_id = :uid))';
        $params[':uid'] = $userId;
    }

    if ($search) {
        $sql .= ' AND (q.title LIKE :search OR q.description LIKE :search)';
        $params[':search'] = '%' . $search . '%';
    }

    $sql .= ' ORDER BY
                CASE WHEN q.status = \'draft\' AND q.author_id = :uid2 THEN 0 ELSE 1 END,
                q.updated_at DESC';
    $params[':uid2'] = $userId;

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    // Decode JSON questions column for each row
    $quizzes = array_map(function (array $row) {
        $row['questions']    = !empty($row['questions']) ? json_decode($row['questions'], true) : [];
        $row['isDraft']      = ($row['status'] === 'draft');
        $row['isAi']         = (bool) $row['is_ai'];
        $row['totalPoints']  = (int)  $row['total_points'];
        $row['totalQuestions'] = (int) $row['total_questions'];
        // Normalise timestamps for JS
        $row['createdAt']    = $row['created_at'];
        $row['updatedAt']    = $row['updated_at'];
        return $row;
    }, $rows);

    jsonResponse(['success' => true, 'quizzes' => $quizzes]);
}

// ══════════════════════════════════════════════════════════════
// POST  — create or update a quiz
// ══════════════════════════════════════════════════════════════
function handlePost(PDO $pdo): void {
    $userId = requireAuth();
    $body   = json_decode(file_get_contents('php://input'), true);

    if (!$body) {
        jsonResponse(['success' => false, 'error' => 'Invalid JSON body'], 400);
    }

    // Fetch user info for author fields
    $userStmt = $pdo->prepare('SELECT name, role FROM users WHERE id = :id');
    $userStmt->execute([':id' => $userId]);
    $user = $userStmt->fetch();

    $id            = $body['id']          ?? null;
    $title         = trim($body['title']  ?? 'Untitled Quiz');
    $description   = $body['description'] ?? $body['desc'] ?? '';
    $status        = in_array($body['status'] ?? '', ['draft', 'published']) ? $body['status'] : 'draft';
    $questions     = json_encode($body['questions'] ?? []);
    $totalQ        = (int) ($body['totalQuestions'] ?? count($body['questions'] ?? []));
    $totalPts      = (int) ($body['totalPoints']    ?? ($totalQ * 10));
    $icon          = $body['icon']  ?? null;
    $color         = $body['color'] ?? null;
    $isAi          = (int) !empty($body['isAi'] ?? $body['isAiGenerated'] ?? false);

    if ($id) {
        // Update — only the owner may update
        $check = $pdo->prepare('SELECT id FROM quizzes WHERE id = :id AND author_id = :uid AND deleted_at IS NULL');
        $check->execute([':id' => $id, ':uid' => $userId]);
        if (!$check->fetch()) {
            jsonResponse(['success' => false, 'error' => 'Quiz not found or access denied'], 403);
        }

        $stmt = $pdo->prepare('UPDATE quizzes SET
            title = :title, description = :desc, status = :status,
            questions = :questions, total_questions = :tq, total_points = :tp,
            icon = :icon, color = :color, is_ai = :ai,
            updated_at = NOW()
            WHERE id = :id');
        $stmt->execute([
            ':title' => $title, ':desc' => $description, ':status' => $status,
            ':questions' => $questions, ':tq' => $totalQ, ':tp' => $totalPts,
            ':icon' => $icon, ':color' => $color, ':ai' => $isAi, ':id' => $id,
        ]);

        jsonResponse(['success' => true, 'id' => $id, 'action' => 'updated']);

    } else {
        // Create — generate UUID v4
        $newId = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
            mt_rand(0, 0xffff), mt_rand(0, 0xffff),
            mt_rand(0, 0xffff),
            mt_rand(0, 0x0fff) | 0x4000,
            mt_rand(0, 0x3fff) | 0x8000,
            mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
        );

        $stmt = $pdo->prepare('INSERT INTO quizzes
            (id, title, description, status, author_id, author_name, author_role,
             questions, total_questions, total_points, icon, color, is_ai, created_at, updated_at)
            VALUES
            (:id, :title, :desc, :status, :uid, :aname, :arole,
             :questions, :tq, :tp, :icon, :color, :ai, NOW(), NOW())');
        $stmt->execute([
            ':id' => $newId, ':title' => $title, ':desc' => $description,
            ':status' => $status, ':uid' => $userId,
            ':aname' => $user['name'] ?? 'Unknown', ':arole' => $user['role'] ?? 'teacher',
            ':questions' => $questions, ':tq' => $totalQ, ':tp' => $totalPts,
            ':icon' => $icon, ':color' => $color, ':ai' => $isAi,
        ]);

        jsonResponse(['success' => true, 'id' => $newId, 'action' => 'created'], 201);
    }
}

// ══════════════════════════════════════════════════════════════
// DELETE  — soft-delete a quiz
// ══════════════════════════════════════════════════════════════
function handleDelete(PDO $pdo): void {
    $userId = requireAuth();
    $id     = $_GET['id'] ?? null;

    if (!$id) {
        jsonResponse(['success' => false, 'error' => 'Missing ?id'], 400);
    }

    // Only the owner can delete
    $stmt = $pdo->prepare('UPDATE quizzes SET deleted_at = NOW()
                           WHERE id = :id AND author_id = :uid AND deleted_at IS NULL');
    $stmt->execute([':id' => $id, ':uid' => $userId]);

    if ($stmt->rowCount() === 0) {
        jsonResponse(['success' => false, 'error' => 'Quiz not found or access denied'], 403);
    }

    jsonResponse(['success' => true, 'id' => $id, 'action' => 'deleted']);
}
