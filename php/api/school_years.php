<?php
require_once dirname(__DIR__) . '/includes/data_provenance.php';
require_once dirname(__DIR__) . '/includes/record_creation_numbers.php';
require_once dirname(__DIR__) . '/includes/school_year_policy.php';
require_once dirname(__DIR__) . '/includes/school_year_lifecycle.php';
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
require_once dirname(__DIR__) . '/includes/service_vault_auth.php';
restrictServiceOrigin();
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Sigma-Actor');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$rootDir = dirname(__DIR__, 2);
require_once $rootDir . '/config/database.php';
require_once $rootDir . '/php/includes/application_auth.php';
require_once __DIR__ . '/../includes/activity_audit.php';
$databaseActor = sigmaRequireApplicationActor($pdo, (($_SERVER['REQUEST_METHOD'] ?? '') === 'GET' ? [] : ['admin', 'masteradmin', 'administrator']));
require_once $rootDir . '/php/includes/gdrive_service.php';

function jsonResponse(array $data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data);
    exit;
}

if (!$pdo) {
    jsonResponse(['success' => false, 'error' => 'Database connection unavailable', 'records' => []], 503);
}

sigmaEnsureActiveSemesterColumn($pdo);

function rowToRecord(array $row): array {
    global $pdo;
    $removalReason = sigmaSchoolYearRemovalReason($pdo, $row);
    return [
        'canDelete' => $removalReason === '',
        'deleteReason' => $removalReason,
        'creationNumber' => sigmaTableCreationNumber($pdo, 'school_years', (string)$row['id']),
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
        'activeSemester'  => (int)($row['active_semester'] ?? 1) === 2 ? 2 : 1,
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
        if (($_GET['action']??'')==='preview') {
            if (academicRole($databaseActor)!=='masteradmin') jsonResponse(['success'=>false,'error'=>'Master Administrator access required.'],403);
            $find=$pdo->prepare('SELECT * FROM school_years WHERE id=? AND is_deleted=0');$find->execute([(string)($_GET['id']??'')]);
            $year=$find->fetch(PDO::FETCH_ASSOC);if(!$year)throw new DomainException('School year not found.');
            $sections=array_filter($pdo->query('SELECT school_year FROM sections WHERE is_deleted=0')->fetchAll(PDO::FETCH_ASSOC),fn($row)=>sigmaSchoolYearReferenceMatches($row['school_year'],$year));
            jsonResponse(['success'=>true,'record'=>rowToRecord($year),'sectionsCount'=>count($sections)]);
        }
        $role = preg_replace('/[\s_-]+/', '', strtolower($databaseActor['role'] ?? ''));
        $where = in_array($role,['admin','masteradmin','administrator'],true) ? '' : 'WHERE is_deleted = 0';
        $stmt = $pdo->prepare("SELECT * FROM school_years $where ORDER BY year_start DESC");
        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $records = array_map('rowToRecord', $rows);

        // Find active school year
        $activeRecord = null;
        foreach ($records as $r) {
            if (!$r['isDeleted'] && $r['status'] === 'Active') {
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
        sigmaRequireRealRecords($payload);

        $action = $payload['action'] ?? 'save';

        if ($action === 'set_active_semester') {
            $recordId = trim((string)($payload['id'] ?? ''));
            $semester = filter_var($payload['semester'] ?? null, FILTER_VALIDATE_INT);
            if ($recordId === '' || !in_array($semester, [1, 2], true)) {
                throw new InvalidArgumentException('Choose a school year and either the 1st or 2nd semester.');
            }
            if ((int)$pdo->query("SELECT GET_LOCK('sigma_school_year_write', 10)")->fetchColumn() !== 1) {
                jsonResponse(['success'=>false, 'error'=>'School-year records are being updated. Please try again.'], 409);
            }
            $pdo->beginTransaction();
            $target = $pdo->prepare('SELECT * FROM school_years WHERE id=? AND is_deleted=0 FOR UPDATE');
            $target->execute([$recordId]);
            $year = $target->fetch(PDO::FETCH_ASSOC);
            if (!$year) throw new DomainException('School year not found.');
            if (($year['status'] ?? '') === 'Completed (Archived)') {
                throw new DomainException('Archived school years are read-only. Reactivate the year before changing its active semester.');
            }
            $pdo->prepare('UPDATE school_years SET active_semester=? WHERE id=?')->execute([$semester, $recordId]);
            sigmaRecordActivity($pdo, (string)$databaseActor['id'], 'Changed Active Semester', 'System', 'School year '.$year['year_start'].'-'.$year['year_end'].' · semester '.$semester);
            $pdo->commit();
            $pdo->query("SELECT RELEASE_LOCK('sigma_school_year_write')");
            $saved = $pdo->prepare('SELECT * FROM school_years WHERE id=?');
            $saved->execute([$recordId]);
            jsonResponse(['success'=>true, 'record'=>rowToRecord($saved->fetch(PDO::FETCH_ASSOC))]);
        }

        // Archival transitions have one server-authoritative transaction.
        if (in_array($action, ['archive', 'reactivate'], true)) {
            if (academicRole($databaseActor) !== 'masteradmin') jsonResponse(['success'=>false,'error'=>'Only Master Administrators can archive or reactivate school years.'],403);
            $recordId=trim((string)($payload['id']??''));
            if ($recordId==='') throw new InvalidArgumentException('Choose a school year.');
            sigmaEnsureSchoolYearArchives($pdo);
            sigmaLockSchoolYearWrites($pdo);
            $pdo->beginTransaction();
            if(!is_string($payload['expectedStatus']??null))throw new InvalidArgumentException('Review the school-year confirmation before continuing.');
            $result=sigmaTransitionSchoolYear($pdo,$databaseActor,$recordId,$action,$payload['expectedStatus']);
            $pdo->commit();
            $pdo->query("SELECT RELEASE_LOCK('sigma_school_year_write')");
            jsonResponse($result);
        }
        if ($action === 'activate') {
            sigmaLockSchoolYearWrites($pdo);
            $pdo->beginTransaction();
            $target=$pdo->prepare('SELECT * FROM school_years WHERE id=? AND is_deleted=0 FOR UPDATE');
            $target->execute([(string)($payload['id']??'')]);$year=$target->fetch(PDO::FETCH_ASSOC);
            if (!$year) throw new DomainException('School year not found.');
            if ($year['status']==='Completed (Archived)') throw new DomainException('Use Reactivate Year to return its archived sections to Draft.');
            $pdo->exec("UPDATE school_years SET status='Inactive' WHERE status='Active'");
            $pdo->prepare("UPDATE school_years SET status='Active',archived_at=NULL WHERE id=?")->execute([$year['id']]);
            sigmaRecordActivity($pdo,(string)$databaseActor['id'],'Activated School Year','System','School year '.$year['year_start'].'-'.$year['year_end']);
            $pdo->commit();
            $pdo->query("SELECT RELEASE_LOCK('sigma_school_year_write')");
            jsonResponse(['success'=>true,'message'=>'School year activated.']);
        }

        // ── Action: DELETE (Soft) ──────────────────────────────────
        if ($action === 'delete') {
            $recordId = (string) ($payload['id'] ?? '');
            if (!$recordId) {
                jsonResponse(['success' => false, 'error' => 'Missing record ID to delete'], 400);
            }

            $headers = function_exists('getallheaders') ? array_change_key_case(getallheaders(), CASE_LOWER) : [];
            $actor = (string)$databaseActor['id'];

            $role = preg_replace('/[\s_-]+/', '', strtolower($databaseActor['role'] ?? ''));
            $permissions = json_decode($databaseActor['permissions'] ?? '{}', true) ?: [];
            if ($role !== 'masteradmin' && (($permissions['syDelete'] ?? false) !== true || ($permissions['schoolMain'] ?? true) !== true)) {
                jsonResponse(['success'=>false,'error'=>'You do not have permission to remove school years.'],403);
            }
            sigmaLockSchoolYearWrites($pdo);
            $pdo->beginTransaction();
            $target = $pdo->prepare('SELECT * FROM school_years WHERE id=? FOR UPDATE');
            $target->execute([$recordId]); $year=$target->fetch(PDO::FETCH_ASSOC);
            if (!$year) throw new DomainException('School year not found.');
            sigmaAssertSchoolYearRemovable($pdo,$year);

            $stmt = $pdo->prepare("UPDATE school_years SET is_deleted = 1, deleted_at = UTC_TIMESTAMP(), deleted_by = ? WHERE id = ?");
            $stmt->execute([$actor, $recordId]);

            try {
                $logStmt = $pdo->prepare("INSERT INTO `record_lifecycle_events` (`table_name`, `record_id`, `action`, `actor_id`) VALUES ('school_years', ?, 'remove', ?)");
                $logStmt->execute([$recordId, $actor]);
            } catch (Throwable $e) {}

            $pdo->commit();
            $pdo->query("SELECT RELEASE_LOCK('sigma_school_year_write')");
            jsonResponse(['success' => true, 'message' => 'School year deleted successfully']);
        }

        // ── Action: RESTORE ────────────────────────────────────────
        if ($action === 'restore') {
            $recordId = (string) ($payload['id'] ?? '');
            if (!$recordId) {
                jsonResponse(['success' => false, 'error' => 'Missing record ID to restore'], 400);
            }

            $headers = function_exists('getallheaders') ? array_change_key_case(getallheaders(), CASE_LOWER) : [];
            $actor = (string)$databaseActor['id'];

            $stmt = $pdo->prepare("UPDATE school_years SET is_deleted = 0, deleted_at = NULL, deleted_by = NULL WHERE id = ?");
            $stmt->execute([$recordId]);

            try {
                $logStmt = $pdo->prepare("INSERT INTO `record_lifecycle_events` (`table_name`, `record_id`, `action`, `actor_id`) VALUES ('school_years', ?, 'restore', ?)");
                $logStmt->execute([$recordId, $actor]);
            } catch (Throwable $e) {}

            jsonResponse(['success' => true, 'message' => 'School year restored successfully']);
        }

        // ── Action: PURGE ──────────────────────────────────────────
        if ($action === 'purge') {
            $recordId = (string) ($payload['id'] ?? '');
            if (!$recordId) {
                jsonResponse(['success' => false, 'error' => 'Missing record ID to permanently delete'], 400);
            }

            $headers = function_exists('getallheaders') ? array_change_key_case(getallheaders(), CASE_LOWER) : [];
            $actor = (string)$databaseActor['id'];

            $role = preg_replace('/[\s_-]+/', '', strtolower($databaseActor['role'] ?? ''));
            $permissions = json_decode($databaseActor['permissions'] ?? '{}', true) ?: [];
            if ($role !== 'masteradmin' && (($permissions['syDelete'] ?? false) !== true || ($permissions['schoolMain'] ?? true) !== true)) {
                jsonResponse(['success'=>false,'error'=>'You do not have permission to remove school years.'],403);
            }
            sigmaLockSchoolYearWrites($pdo);
            $pdo->beginTransaction();
            $target = $pdo->prepare('SELECT * FROM school_years WHERE id=? FOR UPDATE');
            $target->execute([$recordId]); $year=$target->fetch(PDO::FETCH_ASSOC);
            if (!$year) throw new DomainException('School year not found.');
            sigmaAssertSchoolYearRemovable($pdo,$year);
            if (empty($year['is_deleted'])) throw new DomainException('Move this unused year to Trash before permanently deleting it.');

            $stmt = $pdo->prepare("DELETE FROM school_years WHERE id = ?");
            $stmt->execute([$recordId]);

            try {
                $logStmt = $pdo->prepare("INSERT INTO `record_lifecycle_events` (`table_name`, `record_id`, `action`, `actor_id`) VALUES ('school_years', ?, 'purge', ?)");
                $logStmt->execute([$recordId, $actor]);
            } catch (Throwable $e) {}

            $pdo->commit();
            $pdo->query("SELECT RELEASE_LOCK('sigma_school_year_write')");
            jsonResponse(['success' => true, 'message' => 'School year permanently deleted']);
        }

        // ── Action: SAVE / CREATE / UPDATE ─────────────────────────
        if (!in_array($action, ['save', 'create', 'update'], true)) {
            jsonResponse(['success'=>false, 'error'=>'Unknown school-year action.'], 400);
        }
        $record = sigmaValidateSchoolYear($payload);
        $yearStart = $record['yearStart']; $yearEnd = $record['yearEnd'];
        $id = (string)($payload['id'] ?? ('sy-' . $yearStart . '-' . $yearEnd));
        if ($id === '' || strlen($id) > 64) throw new InvalidArgumentException('Invalid school-year ID.');
        foreach (['q1Start','q1End','q2Start','q2End','q3Start','q3End','q4Start','q4End','status'] as $key) $$key = $record[$key];
        // Serialize creation and updates, including two administrators saving at once.
        if ((int)$pdo->query("SELECT GET_LOCK('sigma_school_year_write', 10)")->fetchColumn() !== 1) {
            jsonResponse(['success'=>false, 'error'=>'Another school year is being saved. Please try again.'], 409);
        }
        $pdo->beginTransaction();
        $creating = $action === 'create';
        if ($action === 'save') {
            $find = $pdo->prepare('SELECT id FROM school_years WHERE id = ?'); $find->execute([$id]);
            $creating = !$find->fetchColumn();
        }
        $previous = sigmaCheckSchoolYearConflict($pdo, $record, $id, $creating);
        if (($previous && $status !== $previous['status']) || ($creating && $status === 'Completed (Archived)')) {
            throw new DomainException('Use Archive Year, Reactivate Year, or Set as Active to change a school-year status.');
        }
        if ($previous && $previous['status'] === 'Completed (Archived)') throw new DomainException('Archived years are read-only. Reactivate the year before editing it.');


        // If this record is being saved as Active, ensure no other record is Active
        if ($status === 'Active') {
            $stmtDeact = $pdo->prepare("UPDATE school_years SET status = 'Inactive' WHERE status = 'Active' AND id != ?");
            $stmtDeact->execute([$id]);
        }

        $sql = $creating
            ? "INSERT INTO school_years (year_start, year_end, q1_start, q1_end, q2_start, q2_end, q3_start, q3_end, q4_start, q4_end, status, id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            : "UPDATE school_years SET year_start=?, year_end=?, q1_start=?, q1_end=?, q2_start=?, q2_end=?, q3_start=?, q3_end=?, q4_start=?, q4_end=?, status=? WHERE id=?";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $yearStart, $yearEnd,
            $q1Start, $q1End, $q2Start, $q2End,
            $q3Start, $q3End, $q4Start, $q4End,
            $status, $id
        ]);

        sigmaRecordActivity($pdo, (string)$databaseActor['id'], $creating ? 'Created School Year' : 'Updated School Year', 'System', 'School year '.$yearStart.'-'.$yearEnd);
        $pdo->commit();
        $pdo->query("SELECT RELEASE_LOCK('sigma_school_year_write')");
        $gdriveFolderId = $previous['gdrive_folder_id'] ?? null;
        $gdriveFolderUrl = $previous['gdrive_folder_url'] ?? null;
        try {
            if (!$gdriveFolderId && function_exists('provisionSchoolYearFolders')) {
                $drive = provisionSchoolYearFolders($yearStart, $yearEnd);
                if (!empty($drive['sy_folder_id'])) {
                    $folder = $pdo->prepare('UPDATE school_years SET gdrive_folder_id=?, gdrive_folder_url=? WHERE id=?');
                    $folder->execute([$drive['sy_folder_id'], $drive['sy_folder_url'] ?? '', $id]);
                }
            }
        } catch (Throwable $warning) { error_log('School-year folder provisioning could not complete.'); }
        $saved = $pdo->prepare('SELECT * FROM school_years WHERE id = ?');
        $saved->execute([$id]);

        jsonResponse([
            'success' => true,
            'message' => 'School year saved successfully',
            'record' => rowToRecord($saved->fetch(PDO::FETCH_ASSOC))
        ]);
    }

    jsonResponse(['success' => false, 'error' => 'Method not allowed'], 405);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    $pdo->query("SELECT RELEASE_LOCK('sigma_school_year_write')");
    $code = $e instanceof InvalidArgumentException ? 422 : ($e instanceof DomainException ? 409 : 500);
    if ($e instanceof PDOException && ($e->errorInfo[1] ?? null) == 1062) $code = 409;
    jsonResponse(['success' => false, 'error' => $code === 409 ? ($e instanceof DomainException ? $e->getMessage() : 'This school year already exists. Refresh the list to view it.') : ($code === 422 ? $e->getMessage() : 'School year could not be saved. Please try again.')], $code);
}
