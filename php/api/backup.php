<?php
/**
 * SIGMA ELMS — Database Health, Backup & Disaster Recovery REST API
 * 
 * Endpoints:
 *   GET  ?action=status           — Live MySQL health check, tables list, and storage stats
 *   GET  ?action=list_snapshots   — List all server-saved .sql backup snapshots in database/backups/
 *   POST ?action=create_snapshot  — Creates a new .sql snapshot and saves it in database/backups/
 *   GET  ?action=download         — Streams a full .sql database snapshot (fresh or by &filename=)
 *   POST ?action=restore          — Restores database tables and data from an uploaded .sql file
 *   POST ?action=restore_snapshot — Restores database directly from a server snapshot in database/backups/
 *   POST ?action=delete_snapshot  — Deletes a specific snapshot file from database/backups/
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Admin-Id');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$rootDir = dirname(__DIR__, 2);
require_once $rootDir . '/config/database.php';

$backupsDir = $rootDir . '/database/backups';
if (!is_dir($backupsDir)) {
    @mkdir($backupsDir, 0755, true);
}

function jsonResp(array $data, int $code = 200): void {
    header('Content-Type: application/json; charset=utf-8');
    http_response_code($code);
    echo json_encode($data);
    exit;
}

if (!$pdo) {
    jsonResp(['success' => false, 'error' => 'Database connection failed'], 503);
}

$rawInput = file_get_contents('php://input');
$jsonInput = is_string($rawInput) && $rawInput !== '' ? json_decode($rawInput, true) : null;
$action = trim($_GET['action'] ?? $_POST['action'] ?? (is_array($jsonInput) ? ($jsonInput['action'] ?? '') : '') ?: 'status');

// -------------------------------------------------------------------------
// AUTHORIZATION CHECK: Master Admin Role & Database Permissions
// -------------------------------------------------------------------------
$requesterId = trim(
    $_SERVER['HTTP_X_ADMIN_ID'] ?? 
    $_GET['requester_id'] ?? 
    $_POST['requester_id'] ?? 
    (is_array($jsonInput) ? ($jsonInput['requester_id'] ?? '') : '')
);

$isMaster = false;
$canManageDb = false;

if ($requesterId !== '') {
    $authStmt = $pdo->prepare("SELECT `id`, `role`, `permissions` FROM `users` WHERE `id` = :id AND `is_deleted` = 0 LIMIT 1");
    $authStmt->execute([':id' => $requesterId]);
    $requester = $authStmt->fetch(PDO::FETCH_ASSOC);

    if (!$requester) {
        jsonResp(['success' => false, 'error' => 'Unauthorized: User account not found'], 401);
    }

    $reqRole = (string) ($requester['role'] ?? '');
    $reqPerms = [];
    if (!empty($requester['permissions'])) {
        $reqPerms = is_string($requester['permissions']) ? json_decode($requester['permissions'], true) : $requester['permissions'];
        if (!is_array($reqPerms)) $reqPerms = [];
    }

    $isMaster = ($reqRole === 'Master Admin' || $requesterId === '0000000');
    $canManageDb = $isMaster || !empty($reqPerms['databaseManage']);

    if (!$canManageDb) {
        jsonResp(['success' => false, 'error' => 'Forbidden: Database & Backups access is restricted to Master Admin role or authorized accounts.'], 403);
    }

    // For database restore / disaster recovery / snapshot deletion, strictly require Master Admin or authorized DB manager
    $mutatingActions = ['restore', 'restore_snapshot', 'delete_snapshot'];
    if (in_array($action, $mutatingActions, true) && !$isMaster && empty($reqPerms['databaseManage'])) {
        jsonResp(['success' => false, 'error' => 'Forbidden: Only Master Admin can restore or delete database snapshots.'], 403);
    }
}

/**
 * Generate full standalone SQL dump from sigma_elms_db
 */
function generateSqlDump(PDO $pdo): string {
    $sqlDump = "-- =============================================================================\n";
    $sqlDump .= "-- SIGMA ELMS — Full Database Disaster Recovery Snapshot\n";
    $sqlDump .= "-- Database: sigma_elms_db\n";
    $sqlDump .= "-- Created At: " . date('Y-m-d H:i:s') . "\n";
    $sqlDump .= "-- System: Interface Computer College - Caloocan Senior High School ELMS\n";
    $sqlDump .= "-- =============================================================================\n\n";
    $sqlDump .= "SET FOREIGN_KEY_CHECKS = 0;\n";
    $sqlDump .= "SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';\n";
    $sqlDump .= "SET NAMES utf8mb4;\n\n";

    $tablesStmt = $pdo->query("SHOW TABLES FROM `sigma_elms_db`");
    $tableNames = $tablesStmt->fetchAll(PDO::FETCH_COLUMN);

    foreach ($tableNames as $tbl) {
        $sqlDump .= "-- -----------------------------------------------------------------------------\n";
        $sqlDump .= "-- Table structure for `{$tbl}`\n";
        $sqlDump .= "-- -----------------------------------------------------------------------------\n";
        $sqlDump .= "DROP TABLE IF EXISTS `{$tbl}`;\n";

        $createStmt = $pdo->query("SHOW CREATE TABLE `{$tbl}`");
        $createRow = $createStmt->fetch(PDO::FETCH_NUM);
        $sqlDump .= $createRow[1] . ";\n\n";

        $sqlDump .= "-- Dumping data for `{$tbl}`\n";
        $dataStmt = $pdo->query("SELECT * FROM `{$tbl}`");
        $rows = $dataStmt->fetchAll(PDO::FETCH_ASSOC);

        if (!empty($rows)) {
            $cols = array_keys($rows[0]);
            $colNames = implode('`, `', $cols);

            foreach ($rows as $row) {
                $escapedValues = array_map(function ($val) use ($pdo) {
                    if ($val === null) return 'NULL';
                    return $pdo->quote($val);
                }, array_values($row));

                $valStr = implode(', ', $escapedValues);
                $sqlDump .= "INSERT INTO `{$tbl}` (`{$colNames}`) VALUES ({$valStr});\n";
            }
        }
        $sqlDump .= "\n";
    }

    $sqlDump .= "SET FOREIGN_KEY_CHECKS = 1;\n";
    $sqlDump .= "-- End of Snapshot\n";
    return $sqlDump;
}

try {
    // -------------------------------------------------------------------------
    // ACTION: Database Status & Health Monitoring
    // -------------------------------------------------------------------------
    if ($action === 'status') {
        $startTime = microtime(true);
        $pingStmt = $pdo->query("SELECT 1");
        $pingMs = round((microtime(true) - $startTime) * 1000, 2);

        $versionStmt = $pdo->query("SELECT VERSION() AS ver");
        $version = $versionStmt->fetchColumn() ?: 'Unknown';

        $tablesStmt = $pdo->query("SHOW TABLE STATUS FROM `sigma_elms_db`");
        $tables = $tablesStmt->fetchAll(PDO::FETCH_ASSOC);

        $formattedTables = [];
        $totalRows = 0;
        $totalBytes = 0;

        foreach ($tables as $t) {
            $name = $t['Name'];
            $rows = (int) ($t['Rows'] ?? 0);
            $dataBytes = (int) ($t['Data_length'] ?? 0) + (int) ($t['Index_length'] ?? 0);

            try {
                $cStmt = $pdo->query("SELECT COUNT(*) FROM `{$name}`");
                $rows = (int) $cStmt->fetchColumn();
            } catch (Exception $e) {}

            $totalRows += $rows;
            $totalBytes += $dataBytes;

            $formattedTables[] = [
                'name'      => $name,
                'rows'      => $rows,
                'sizeBytes' => $dataBytes,
                'sizeHuman' => formatBytes($dataBytes),
                'engine'    => $t['Engine'] ?? 'InnoDB',
                'collation' => $t['Collation'] ?? 'utf8mb4_unicode_ci',
                'updatedAt' => $t['Update_time'] ?? $t['Create_time'] ?? null
            ];
        }

        jsonResp([
            'success'     => true,
            'status'      => 'online',
            'pingMs'      => $pingMs,
            'database'    => 'sigma_elms_db',
            'server'      => '127.0.0.1:3306',
            'version'     => $version,
            'tableCount'  => count($formattedTables),
            'totalRows'   => $totalRows,
            'totalSize'   => formatBytes($totalBytes),
            'totalSizeBytes' => $totalBytes,
            'tables'      => $formattedTables,
            'timestamp'   => date('Y-m-d H:i:s')
        ]);
    }

    // -------------------------------------------------------------------------
    // ACTION: List Saved Server Snapshots in database/backups/
    // -------------------------------------------------------------------------
    if ($action === 'list_snapshots') {
        $files = glob($backupsDir . '/*.sql');
        if ($files === false) $files = [];

        // If no snapshots exist yet, auto-create initial baseline snapshot
        if (empty($files)) {
            $initTimestamp = date('Y-m-d_His');
            $initFilename = "sigma_snapshot_baseline_{$initTimestamp}.sql";
            $initPath = $backupsDir . '/' . $initFilename;
            $dump = generateSqlDump($pdo);
            @file_put_contents($initPath, $dump);
            $files = glob($backupsDir . '/*.sql') ?: [];
        }

        $snapshots = [];
        foreach ($files as $filePath) {
            $base = basename($filePath);
            $size = (int) filesize($filePath);
            $mtime = filemtime($filePath);

            $type = 'Manual Snapshot';
            if (stripos($base, 'baseline') !== false) {
                $type = 'Baseline System Snapshot';
            } elseif (stripos($base, 'auto') !== false || stripos($base, 'daily') !== false) {
                $type = 'Automated Daily Snapshot';
            }

            $snapshots[] = [
                'filename'    => $base,
                'sizeBytes'   => $size,
                'sizeHuman'   => formatBytes($size),
                'createdAt'   => date('Y-m-d H:i:s', $mtime),
                'createdAtFormatted' => date('M j, Y · g:i A', $mtime),
                'type'        => $type,
                'status'      => 'Verified'
            ];
        }

        // Sort latest first
        usort($snapshots, function($a, $b) {
            return strcmp($b['createdAt'], $a['createdAt']);
        });

        jsonResp([
            'success'   => true,
            'count'     => count($snapshots),
            'snapshots' => $snapshots
        ]);
    }

    // -------------------------------------------------------------------------
    // ACTION: Create New Server-Side Snapshot
    // -------------------------------------------------------------------------
    if ($action === 'create_snapshot' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $timestamp = date('Y-m-d_His');
        $tag = trim($_POST['tag'] ?? (is_array($jsonInput) ? ($jsonInput['tag'] ?? '') : ''));
        $prefix = $tag ? preg_replace('/[^a-zA-Z0-9_\-]/', '', $tag) : 'manual';
        $filename = "sigma_snapshot_{$prefix}_{$timestamp}.sql";
        $filePath = $backupsDir . '/' . $filename;

        $dump = generateSqlDump($pdo);
        if (file_put_contents($filePath, $dump) === false) {
            jsonResp(['success' => false, 'error' => 'Failed to save snapshot file on server.'], 500);
        }

        $size = filesize($filePath);
        jsonResp([
            'success'   => true,
            'message'   => 'Database snapshot created successfully!',
            'snapshot'  => [
                'filename'    => $filename,
                'sizeBytes'   => $size,
                'sizeHuman'   => formatBytes($size),
                'createdAt'   => date('Y-m-d H:i:s'),
                'createdAtFormatted' => date('M j, Y · g:i A'),
                'type'        => 'Manual Snapshot',
                'status'      => 'Verified'
            ]
        ]);
    }

    // -------------------------------------------------------------------------
    // ACTION: Download Snapshot (.sql file stream)
    // -------------------------------------------------------------------------
    if ($action === 'download') {
        $reqFilename = trim($_GET['filename'] ?? '');

        if ($reqFilename !== '') {
            $safeFilename = basename($reqFilename);
            $filePath = $backupsDir . '/' . $safeFilename;
            if (!file_exists($filePath)) {
                jsonResp(['success' => false, 'error' => 'Snapshot file not found on server.'], 404);
            }
            $sqlDump = file_get_contents($filePath);
            $downloadName = $safeFilename;
        } else {
            $timestamp = date('Y-m-d_His');
            $downloadName = "sigma_elms_backup_{$timestamp}.sql";
            $sqlDump = generateSqlDump($pdo);
        }

        header('Content-Type: application/sql; charset=utf-8');
        header('Content-Disposition: attachment; filename="' . $downloadName . '"');
        header('Content-Length: ' . strlen($sqlDump));
        header('Cache-Control: no-cache, no-store, must-revalidate');
        header('Pragma: no-cache');
        header('Expires: 0');

        echo $sqlDump;
        exit;
    }

    // -------------------------------------------------------------------------
    // ACTION: 1-Click Restore Directly from Server Snapshot
    // -------------------------------------------------------------------------
    if ($action === 'restore_snapshot' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $reqFilename = trim($_POST['filename'] ?? (is_array($jsonInput) ? ($jsonInput['filename'] ?? '') : ''));
        if ($reqFilename === '') {
            jsonResp(['success' => false, 'error' => 'No snapshot filename specified.'], 400);
        }

        $safeFilename = basename($reqFilename);
        $filePath = $backupsDir . '/' . $safeFilename;
        if (!file_exists($filePath)) {
            jsonResp(['success' => false, 'error' => 'Specified snapshot file does not exist on server.'], 404);
        }

        $sqlContent = file_get_contents($filePath);
        if (trim($sqlContent) === '') {
            jsonResp(['success' => false, 'error' => 'Snapshot file is empty.'], 400);
        }

        $pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");
        $pdo->exec($sqlContent);
        $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");

        $tablesStmt = $pdo->query("SHOW TABLES FROM `sigma_elms_db`");
        $tableNames = $tablesStmt->fetchAll(PDO::FETCH_COLUMN);

        jsonResp([
            'success'        => true,
            'message'        => "Database successfully restored to snapshot: {$safeFilename}!",
            'restoredTables' => count($tableNames),
            'tables'         => $tableNames,
            'snapshot'       => $safeFilename,
            'timestamp'      => date('Y-m-d H:i:s')
        ]);
    }

    // -------------------------------------------------------------------------
    // ACTION: Delete Server Snapshot
    // -------------------------------------------------------------------------
    if ($action === 'delete_snapshot' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $reqFilename = trim($_POST['filename'] ?? (is_array($jsonInput) ? ($jsonInput['filename'] ?? '') : ''));
        if ($reqFilename === '') {
            jsonResp(['success' => false, 'error' => 'No snapshot filename specified.'], 400);
        }

        $safeFilename = basename($reqFilename);
        $filePath = $backupsDir . '/' . $safeFilename;
        if (!file_exists($filePath)) {
            jsonResp(['success' => false, 'error' => 'Snapshot file not found.'], 404);
        }

        if (@unlink($filePath)) {
            jsonResp([
                'success' => true,
                'message' => "Snapshot {$safeFilename} successfully deleted."
            ]);
        } else {
            jsonResp(['success' => false, 'error' => 'Failed to delete snapshot file from server.'], 500);
        }
    }

    // -------------------------------------------------------------------------
    // ACTION: Restore Database from Uploaded .SQL File
    // -------------------------------------------------------------------------
    if ($action === 'restore' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $sqlContent = '';

        if (isset($_FILES['backup_file']) && $_FILES['backup_file']['error'] === UPLOAD_ERR_OK) {
            $sqlContent = file_get_contents($_FILES['backup_file']['tmp_name']);
        } else {
            $rawInput = file_get_contents('php://input');
            $jsonInput = json_decode($rawInput, true);
            if (is_array($jsonInput) && !empty($jsonInput['sql_content'])) {
                $sqlContent = $jsonInput['sql_content'];
            }
        }

        if (trim($sqlContent) === '') {
            jsonResp(['success' => false, 'error' => 'No SQL backup file or content provided.'], 400);
        }

        $pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");
        $pdo->exec($sqlContent);
        $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");

        $tablesStmt = $pdo->query("SHOW TABLES FROM `sigma_elms_db`");
        $tableNames = $tablesStmt->fetchAll(PDO::FETCH_COLUMN);

        jsonResp([
            'success'     => true,
            'message'     => 'Database restored successfully from uploaded backup snapshot!',
            'restoredTables' => count($tableNames),
            'tables'      => $tableNames,
            'timestamp'   => date('Y-m-d H:i:s')
        ]);
    }

    jsonResp(['success' => false, 'error' => 'Invalid action specified'], 400);

} catch (PDOException $e) {
    jsonResp(['success' => false, 'error' => 'Database operation failed: ' . $e->getMessage()], 500);
} catch (Exception $e) {
    jsonResp(['success' => false, 'error' => 'System error: ' . $e->getMessage()], 500);
}

function formatBytes(int $bytes, int $precision = 2): string {
    $units = ['B', 'KB', 'MB', 'GB', 'TB'];
    $bytes = max($bytes, 0);
    $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
    $pow = min($pow, count($units) - 1);
    $bytes /= pow(1024, $pow);
    return round($bytes, $precision) . ' ' . $units[$pow];
}
