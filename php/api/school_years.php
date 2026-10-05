<?php
/**
 * SIGMA ELMS — School Year Management REST API
 * 
 * Endpoint: /php/api/school_years.php
 * Methods:
 *   GET    — List all active/archived school years
 *   POST   — Save, update, activate, or archive a school year
 */

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$rootDir = dirname(__DIR__, 2);
require_once $rootDir . '/config/database.php';
require_once $rootDir . '/php/includes/gdrive_service.php';

function jsonResponse(array $data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data);
    exit;
}

if (!$pdo) {
    jsonResponse(['success' => false, 'error' => 'Database connection unavailable', 'records' => []], 503);
}

function rowToRecord(array $row): array {
    return [
        'id'              => (string) $row['id'],
        'yearStart'       => (int) $row['year_start'],
        'yearEnd'         => (int) $row['year_end'],
        'q1Start'         => $row['q1_start'] ?: '',
        'q1End'           => $row['q1_end'] ?: '',
        'q2Start'         => $row['q2_start'] ?: '',
        'q2End'           => $row['q2_end'] ?: '',
        'q3Start'         => $row['q3_start'] ?: '',
        'q3End'           => $row['q3_end'] ?: '',
        'q4Start'         => $row['q4_start'] ?: '',
        'q4End'           => $row['q4_end'] ?: '',
        'status'          => (string) ($row['status'] ?: 'Inactive'),
        'gdriveFolderId'  => (string) ($row['gdrive_folder_id'] ?? ''),
        'gdriveFolderUrl' => (string) ($row['gdrive_folder_url'] ?? ''),
        'isDeleted'       => (bool) $row['is_deleted'],
        'archivedAt'      => $row['archived_at'] ?: null,
        'createdAt'       => $row['created_at'] ?? null,
        'updatedAt'       => $row['updated_at'] ?? null,
    ];
}

$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        $stmt = $pdo->prepare("SELECT * FROM school_years WHERE is_deleted = 0 ORDER BY year_start DESC");
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $records = array_map('rowToRecord', $rows);

        // Find active school year
        $activeRecord = null;
        foreach ($records as $r) {
            if ($r['status'] === 'Active') {
                $activeRecord = $r;
                break;
            }
        }

        jsonResponse([
            'success'      => true,
            'records'      => $records,
            'activeRecord' => $activeRecord,
            'count'        => count($records),
        ]);
    }

    if ($method === 'POST') {
        $raw = file_get_contents('php://input');
        $payload = json_decode($raw, true) ?: $_POST;

        $action = $payload['action'] ?? 'save';

        // ── Action: ACTIVATE ───────────────────────────────────────
        if ($action === 'activate') {
            $recordId = (string) ($payload['id'] ?? '');
            if (!$recordId) {
                jsonResponse(['success' => false, 'error' => 'Missing record ID to activate'], 400);
            }

            $pdo->beginTransaction();
            // Deactivate others
            $pdo->exec("UPDATE school_years SET status = 'Inactive' WHERE status = 'Active'");
            // Activate target
            $stmt = $pdo->prepare("UPDATE school_years SET status = 'Active', archived_at = NULL WHERE id = ?");
            $stmt->execute([$recordId]);
            $pdo->commit();

            jsonResponse(['success' => true, 'message' => 'School year activated successfully']);
        }

        // ── Action: ARCHIVE ────────────────────────────────────────
        if ($action === 'archive') {
            $recordId = (string) ($payload['id'] ?? '');
            $activateNextId = !empty($payload['activateNextId']) ? (string) $payload['activateNextId'] : null;

            if (!$recordId) {
                jsonResponse(['success' => false, 'error' => 'Missing record ID to archive'], 400);
            }

            $pdo->beginTransaction();
            $stmt = $pdo->prepare("UPDATE school_years SET status = 'Completed (Archived)', archived_at = NOW() WHERE id = ?");
            $stmt->execute([$recordId]);

            if ($activateNextId) {
                $stmt2 = $pdo->prepare("UPDATE school_years SET status = 'Active', archived_at = NULL WHERE id = ?");
                $stmt2->execute([$activateNextId]);
            }
            $pdo->commit();

            jsonResponse(['success' => true, 'message' => 'School year archived successfully']);
        }

        // ── Action: DELETE (Soft) ──────────────────────────────────
        if ($action === 'delete') {
            $recordId = (string) ($payload['id'] ?? '');
            if (!$recordId) {
                jsonResponse(['success' => false, 'error' => 'Missing record ID to delete'], 400);
            }

            $stmt = $pdo->prepare("UPDATE school_years SET is_deleted = 1 WHERE id = ?");
            $stmt->execute([$recordId]);
            jsonResponse(['success' => true, 'message' => 'School year deleted successfully']);
        }

        // ── Action: SAVE / CREATE / UPDATE ─────────────────────────
        $yearStart = (int) ($payload['yearStart'] ?? 0);
        $yearEnd   = (int) ($payload['yearEnd'] ?? 0);

        if ($yearStart <= 0 || $yearEnd <= 0) {
            jsonResponse(['success' => false, 'error' => 'Invalid year range provided'], 400);
        }

        $id        = (string) ($payload['id'] ?? ('sy-' . $yearStart . '-' . $yearEnd));
        $q1Start   = $payload['q1Start'] ?: null;
        $q1End     = $payload['q1End'] ?: null;
        $q2Start   = $payload['q2Start'] ?: null;
        $q2End     = $payload['q2End'] ?: null;
        $q3Start   = $payload['q3Start'] ?: null;
        $q3End     = $payload['q3End'] ?: null;
        $q4Start   = $payload['q4Start'] ?: null;
        $q4End     = $payload['q4End'] ?: null;
        $status    = (string) ($payload['status'] ?? 'Inactive');

        $pdo->beginTransaction();

        // If this record is being saved as Active, ensure no other record is Active
        if ($status === 'Active') {
            $stmtDeact = $pdo->prepare("UPDATE school_years SET status = 'Inactive' WHERE status = 'Active' AND id != ?");
            $stmtDeact->execute([$id]);
        }

        $sql = "INSERT INTO school_years (
                    id, year_start, year_end,
                    q1_start, q1_end, q2_start, q2_end,
                    q3_start, q3_end, q4_start, q4_end,
                    status, is_deleted
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
                ON DUPLICATE KEY UPDATE
                    year_start = VALUES(year_start),
                    year_end = VALUES(year_end),
                    q1_start = VALUES(q1_start),
                    q1_end = VALUES(q1_end),
                    q2_start = VALUES(q2_start),
                    q2_end = VALUES(q2_end),
                    q3_start = VALUES(q3_start),
                    q3_end = VALUES(q3_end),
                    q4_start = VALUES(q4_start),
                    q4_end = VALUES(q4_end),
                    status = VALUES(status),
                    is_deleted = 0";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $id, $yearStart, $yearEnd,
            $q1Start, $q1End, $q2Start, $q2End,
            $q3Start, $q3End, $q4Start, $q4End,
            $status
        ]);

        $gdriveFolderId = null;
        $gdriveFolderUrl = null;
        try {
            if (function_exists('provisionSchoolYearFolders')) {
                $gdriveRes = provisionSchoolYearFolders($yearStart, $yearEnd);
                if ($gdriveRes && !empty($gdriveRes['sy_folder_id'])) {
                    $gdriveFolderId = $gdriveRes['sy_folder_id'];
                    $gdriveFolderUrl = $gdriveRes['sy_folder_url'];
                    $upd = $pdo->prepare("UPDATE school_years SET gdrive_folder_id = ?, gdrive_folder_url = ? WHERE id = ?");
                    $upd->execute([$gdriveFolderId, $gdriveFolderUrl, $id]);
                }
            }
        } catch (Throwable $t) {
            error_log("GDrive folder provisioning warning: " . $t->getMessage());
        }

        $pdo->commit();

        jsonResponse([
            'success' => true,
            'message' => 'School year saved successfully',
            'record'  => rowToRecord([
                'id'                => $id,
                'year_start'        => $yearStart,
                'year_end'          => $yearEnd,
                'q1_start'          => $q1Start,
                'q1_end'            => $q1End,
                'q2_start'          => $q2Start,
                'q2_end'            => $q2End,
                'q3_start'          => $q3Start,
                'q3_end'            => $q3End,
                'q4_start'          => $q4Start,
                'q4_end'            => $q4End,
                'status'            => $status,
                'gdrive_folder_id'  => $gdriveFolderId,
                'gdrive_folder_url' => $gdriveFolderUrl,
                'is_deleted'        => 0,
                'archived_at'       => null,
                'created_at'        => null,
                'updated_at'        => null,
            ])
        ]);
    }

    jsonResponse(['success' => false, 'error' => 'Method not allowed'], 405);
} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    jsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
}
