<?php
require_once dirname(__DIR__) . '/includes/data_provenance.php';
require_once dirname(__DIR__) . '/includes/record_creation_numbers.php';
/**
 * SIGMA ELMS — User Management REST API
 * 
 * Endpoint: /php/api/users.php
 * Methods:
 *   GET    — List all active users (or filter by role / id)
 *   POST   — Create, update, activate, deactivate, change password, or delete user
 */

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
require_once dirname(__DIR__) . '/includes/service_vault_auth.php';
restrictServiceOrigin();
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$rootDir = dirname(__DIR__, 2);
require_once $rootDir . '/config/database.php';
require_once $rootDir . '/php/includes/application_auth.php';
require_once __DIR__ . '/../includes/activity_audit.php';
require_once $rootDir . '/php/includes/role_permissions.php';
require_once $rootDir . '/php/includes/user_id_sequence.php';
$databaseActor = sigmaRequireApplicationActor($pdo, ['admin', 'masteradmin', 'administrator']);
require_once $rootDir . '/php/includes/gdrive_service.php';

function jsonResponse(array $data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data);
    exit;
}

if (!$pdo) {
    jsonResponse(['success' => false, 'error' => 'Database connection unavailable', 'records' => []], 503);
}

function userRowToRecord(array $row): array {
    global $pdo;
    $permissions = [];
    if (!empty($row['permissions'])) {
        $permissions = is_string($row['permissions']) ? json_decode($row['permissions'], true) : $row['permissions'];
        if (!is_array($permissions)) $permissions = [];
    }

    $fullName = $row['full_name'];
    if (empty($fullName)) {
        $fullName = trim(($row['first_name'] ?? '') . ' ' . ($row['middle_name'] ?? '') . ' ' . ($row['last_name'] ?? ''));
    }

    return [
        'creationNumber' => sigmaTableCreationNumber($pdo, 'users', (string)$row['id']),
        'id'           => (string) $row['id'],
        'uid'          => (string) $row['id'],
        'firstName'    => (string) ($row['first_name'] ?? ''),
        'middleName'   => (string) ($row['middle_name'] ?? ''),
        'lastName'     => (string) ($row['last_name'] ?? ''),
        'fullName'     => (string) $fullName,
        'email'        => (string) ($row['email'] ?? ''),
        'role'         => (string) ($row['role'] ?? 'Student'),
        'type'         => (string) ($row['role'] ?? 'Student'),
        'status'       => (string) ($row['status'] ?? 'Active'),
        'gender'       => (string) ($row['gender'] ?? ''),
        'branch'       => (string) ($row['branch'] ?? 'Main Campus'),
        'department'   => (string) ($row['department'] ?? ''),
        'gradeLevel'   => (string) ($row['grade_level'] ?? ''),
        'gradeSection' => (string) ($row['grade_section'] ?? ''),
        'strand'       => (string) ($row['strand'] ?? ''),
        'avatar'       => $row['avatar'] ?? null,
        'avatarHistory' => empty($row['avatar']) ? [] : [$row['avatar']],
        'permissions'  => $permissions,
        'isDeleted'    => (bool) ($row['is_deleted'] ?? 0),
        'createdAt'    => $row['created_at'] ?? null,
        'updatedAt'    => $row['updated_at'] ?? null
    ];
}

$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        if (($_GET['action'] ?? '') === 'next_id') {
            $prefix = sigmaUserIdPrefix((string)($_GET['role'] ?? 'Student'), (string)($_GET['branchCode'] ?? '01'));
            jsonResponse(['success'=>true,'id'=>sigmaNextUserId($pdo,$prefix)]);
        }
        if (($_GET['action'] ?? '') === 'permission_defaults') {
            $policies = [];
            foreach (['Student','Teacher','Admin','Master Admin'] as $role) $policies[$role] = sigmaRolePermissionDefaults($role);
            jsonResponse(['success'=>true, 'roles'=>$policies]);
        }
        $userId = trim($_GET['id'] ?? '');
        $role = trim($_GET['role'] ?? '');

        if ($userId !== '') {
            $stmt = $pdo->prepare("SELECT * FROM `users` WHERE `id` = :id AND `is_deleted` = 0 LIMIT 1");
            $stmt->execute([':id' => $userId]);
            $row = $stmt->fetch();
            if (!$row) {
                jsonResponse(['success' => false, 'error' => 'User not found'], 404);
            }
            jsonResponse(['success' => true, 'user' => userRowToRecord($row)]);
        }

        $query = "SELECT * FROM `users` WHERE `is_deleted` = 0";
        $params = [];
        if ($role !== '') {
            $query .= " AND `role` = :role";
            $params[':role'] = $role;
        }
        $query .= " ORDER BY `created_at` ASC";

        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        $records = array_map('userRowToRecord', $rows);
        jsonResponse([
            'success' => true,
            'count' => count($records),
            'records' => $records
        ]);
    }

    if ($method === 'POST') {
        $raw = file_get_contents('php://input');
        $input = json_decode($raw, true);

        if (!is_array($input)) {
            jsonResponse(['success' => false, 'error' => 'Invalid JSON payload'], 400);
        }

        sigmaRequireRealRecords($input);
        $action = trim($input['action'] ?? 'save');
        $targetInput = $input['user'] ?? $input;
        $targetId = trim($targetInput['id'] ?? $targetInput['uid'] ?? '');
        $targetStmt = $pdo->prepare('SELECT role, permissions, status, password FROM users WHERE id=?');
        $targetStmt->execute([$targetId]);
        $targetAccount = $targetStmt->fetch(PDO::FETCH_ASSOC) ?: null;
        if ($action === 'create') $targetAccount = null;
        $actorRole = preg_replace('/[\s_-]+/', '', strtolower($databaseActor['role'] ?? ''));
        $actorPermissions = json_decode($databaseActor['permissions'] ?? '{}', true) ?: [];
        $requestedRole = (string)($targetInput['role'] ?? $targetAccount['role'] ?? 'Student');
        if (!in_array($requestedRole, ['Student','Teacher','Admin','Master Admin'], true)) jsonResponse(['success'=>false,'error'=>'Unsupported institutional role.'], 422);
        if ($actorRole !== 'masteradmin') {
            foreach (array_filter([$requestedRole, $targetAccount['role'] ?? null]) as $managedRole) {
                $permission = ['Admin'=>'manageAdmins','Teacher'=>'manageTeachers','Student'=>'manageStudents'][$managedRole] ?? null;
                if ($managedRole === 'Master Admin' || !$permission || !sigmaActorPermission($databaseActor, $permission)) jsonResponse(['success'=>false,'error'=>'Your role cannot manage this account.'], 403);
            }
            $actionPermission = ['delete'=>'actionDelete','restore'=>'actionDelete','deactivate'=>'actionDeactivate','activate'=>'actionDeactivate','change_password'=>'actionPassword'][$action] ?? null;
            if ($actionPermission && !sigmaActorPermission($databaseActor, $actionPermission)) jsonResponse(['success'=>false,'error'=>'Your role cannot perform this account action.'], 403);
            if ($targetAccount && isset($targetInput['status']) && strcasecmp($targetInput['status'], $targetAccount['status']) !== 0) {
                $statuses = array_map('strtolower', [$targetInput['status'], $targetAccount['status']]);
                $statusPermission = count(array_intersect($statuses, ['inactive','deactivated'])) ? 'actionDeactivate' : 'actionLock';
                if (!sigmaActorPermission($databaseActor, $statusPermission)) jsonResponse(['success'=>false,'error'=>'Your role cannot change this account status.'], 403);
            }
            if ($targetAccount && !empty($targetInput['password']) && !sigmaActorPermission($databaseActor, 'actionPassword')) jsonResponse(['success'=>false,'error'=>'Your role cannot change this account password.'], 403);
            if (isset($targetInput['permissions']) && in_array($requestedRole, ['Admin','Master Admin'], true) && ($targetAccount === null || json_decode($targetAccount['permissions'] ?? '{}', true) != $targetInput['permissions'])) jsonResponse(['success'=>false,'error'=>'Only a master admin can grant administrator permissions.'], 403);
            if (isset($targetInput['permissions']['teacherManageAnnouncementComments'])) {
                $storedPermissions = json_decode($targetAccount['permissions'] ?? '{}', true) ?: [];
                if ($targetInput['permissions']['teacherManageAnnouncementComments'] !== ($storedPermissions['teacherManageAnnouncementComments'] ?? false)) jsonResponse(['success'=>false,'error'=>'Only a master admin can grant announcement comment management.'], 403);
            }
        }
        protectServiceAdministratorAccounts($input);

        // ACTION: Deactivate User
        if ($action === 'deactivate') {
            $id = trim($input['id'] ?? $input['uid'] ?? '');
            if (!$id) jsonResponse(['success' => false, 'error' => 'User ID is required'], 400);

            $stmt = $pdo->prepare("UPDATE `users` SET `status` = 'Inactive' WHERE `id` = :id");
            $stmt->execute([':id' => $id]);
            jsonResponse(['success' => true, 'message' => "User {$id} deactivated"]);
        }

        // ACTION: Activate User
        if ($action === 'activate') {
            $id = trim($input['id'] ?? $input['uid'] ?? '');
            if (!$id) jsonResponse(['success' => false, 'error' => 'User ID is required'], 400);

            $stmt = $pdo->prepare("UPDATE `users` SET `status` = 'Active' WHERE `id` = :id");
            $stmt->execute([':id' => $id]);
            jsonResponse(['success' => true, 'message' => "User {$id} activated"]);
        }

        // ACTION: Change Password
        if ($action === 'change_password') {
            $id = trim($input['id'] ?? $input['uid'] ?? '');
            $newPassword = (string) ($input['password'] ?? '');
            if (!$id || !$newPassword) {
                jsonResponse(['success' => false, 'error' => 'User ID and new password are required'], 400);
            }

            $stmt = $pdo->prepare("UPDATE `users` SET `password` = :pwd WHERE `id` = :id");
            $stmt->execute([':pwd' => password_hash($newPassword, PASSWORD_DEFAULT), ':id' => $id]);
            sigmaRevokeAccountSessions($pdo, $id);
            jsonResponse(['success' => true, 'message' => "Password updated for user {$id}"]);
        }

        // ACTION: Soft Delete
        if ($action === 'delete') {
            $id = trim($input['id'] ?? $input['uid'] ?? '');
            if (!$id) jsonResponse(['success' => false, 'error' => 'User ID is required'], 400);

            // Never delete master admin 0000000
            if ($id === '0000000') {
                jsonResponse(['success' => false, 'error' => 'Master Admin cannot be deleted'], 403);
            }

            $headers = function_exists('getallheaders') ? array_change_key_case(getallheaders(), CASE_LOWER) : [];
            $actor = (string)$databaseActor['id'];

            $stmt = $pdo->prepare("UPDATE `users` SET `is_deleted` = 1, `deleted_at` = UTC_TIMESTAMP(), `deleted_by` = :actor WHERE `id` = :id");
            $stmt->execute([':id' => $id, ':actor' => $actor]);

            try {
                $logStmt = $pdo->prepare("INSERT INTO `record_lifecycle_events` (`table_name`, `record_id`, `action`, `actor_id`) VALUES ('users', ?, 'remove', ?)");
                $logStmt->execute([$id, $actor]);
            } catch (Throwable $e) {}

            jsonResponse(['success' => true, 'message' => "User {$id} deleted"]);
        }

        // ACTION: Restore Soft Deleted User
        if ($action === 'restore') {
            $id = trim($input['id'] ?? $input['uid'] ?? '');
            if (!$id) jsonResponse(['success' => false, 'error' => 'User ID is required'], 400);

            $headers = function_exists('getallheaders') ? array_change_key_case(getallheaders(), CASE_LOWER) : [];
            $actor = (string)$databaseActor['id'];

            $stmt = $pdo->prepare("UPDATE `users` SET `is_deleted` = 0, `deleted_at` = NULL, `deleted_by` = NULL WHERE `id` = :id");
            $stmt->execute([':id' => $id]);

            try {
                $logStmt = $pdo->prepare("INSERT INTO `record_lifecycle_events` (`table_name`, `record_id`, `action`, `actor_id`) VALUES ('users', ?, 'restore', ?)");
                $logStmt->execute([$id, $actor]);
            } catch (Throwable $e) {}

            jsonResponse(['success' => true, 'message' => "User {$id} restored"]);
        }

        // ACTION: Batch Sync from client
        if ($action === 'batch_sync' || $action === 'create_missing') {
            jsonResponse(['success' => false, 'code' => 'review_required', 'error' => 'Unreviewed browser account imports are disabled. Create a verified account through user management.'], 409);
        }

        // ACTION: Save / Create / Update single user
        $userObj = $input['user'] ?? $input;
        $id = trim($userObj['id'] ?? $userObj['uid'] ?? '');
        if (!$id && $action !== 'create') {
            jsonResponse(['success' => false, 'error' => 'User ID is required'], 400);
        }

        $firstName = trim($userObj['firstName'] ?? $userObj['first_name'] ?? '');
        $middleName = trim($userObj['middleName'] ?? $userObj['middle_name'] ?? '');
        $lastName = trim($userObj['lastName'] ?? $userObj['last_name'] ?? '');
        $fullName = trim($userObj['fullName'] ?? $userObj['full_name'] ?? '');
        if (!$fullName) $fullName = trim("{$firstName} {$middleName} {$lastName}");

        $email = trim($userObj['email'] ?? '');
        $password = (string) ($userObj['password'] ?? '');
        if ($firstName === '' || $lastName === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            jsonResponse(['success' => false, 'error' => 'A real first name, last name, and valid email are required.'], 422);
        }
        if ($action === 'create') {
            $pdo->beginTransaction();
            $id = sigmaNextUserId($pdo, sigmaUserIdPrefix($requestedRole, (string)($input['branchCode'] ?? '01')), true);
            if (($input['passwordAutoGenerated'] ?? false) === true) $password = strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $lastName)).$id;
        }
        $existingPasswordQuery = $pdo->prepare('SELECT * FROM users WHERE id=? LIMIT 1');
        $existingPasswordQuery->execute([$id]);
        $existingUser = $existingPasswordQuery->fetch(PDO::FETCH_ASSOC);
        $existingPassword = $existingUser ? $existingUser['password'] : false;
        if (strlen($password) > 256) jsonResponse(['success' => false, 'error' => 'Password must not exceed 256 characters.'], 422);
        if ($password === '' && ($existingPassword === false || trim((string)$existingPassword) === '')) jsonResponse(['success' => false, 'error' => 'An initial password is required for a new account.'], 422);
        $storedPassword = $password !== '' ? password_hash($password, PASSWORD_DEFAULT) : $existingPassword;

        $role = (string) ($userObj['role'] ?? $userObj['type'] ?? 'Student');
        $status = (string) ($userObj['status'] ?? 'Active');
        $gender = (string) ($userObj['gender'] ?? '');
        $branch = (string) ($userObj['branch'] ?? 'Main Campus');
        $dept = (string) ($userObj['department'] ?? '');
        $grade = (string) ($userObj['gradeLevel'] ?? $userObj['grade_level'] ?? '');
        $section = (string) ($userObj['gradeSection'] ?? $userObj['grade_section'] ?? '');
        $strand = (string) ($userObj['strand'] ?? '');
        $avatar = $userObj['avatar'] ?? null;
        $permissionInput = $userObj['permissions'] ?? ($existingUser ? json_decode($existingUser['permissions'] ?? '{}', true) : null);
        $perms = json_encode(sigmaNormalizeRolePermissions($role, $permissionInput));

        $upsertSql = "
            INSERT INTO `users` (
                `id`, `first_name`, `middle_name`, `last_name`, `full_name`, `email`, `password`,
                `role`, `status`, `gender`, `branch`, `department`, `grade_level`, `grade_section`, `strand`, `avatar`, `permissions`, `is_deleted`
            ) VALUES (
                :id, :first_name, :middle_name, :last_name, :full_name, :email, :password,
                :role, :status, :gender, :branch, :department, :grade_level, :grade_section, :strand, :avatar, :permissions, 0
            ) ON DUPLICATE KEY UPDATE
                `first_name` = VALUES(`first_name`),
                `middle_name` = VALUES(`middle_name`),
                `last_name` = VALUES(`last_name`),
                `full_name` = VALUES(`full_name`),
                `email` = VALUES(`email`),
                " . ($password ? "`password` = VALUES(`password`)," : "") . "
                `role` = VALUES(`role`),
                `status` = VALUES(`status`),
                `gender` = VALUES(`gender`),
                `branch` = VALUES(`branch`),
                `department` = VALUES(`department`),
                `grade_level` = VALUES(`grade_level`),
                `grade_section` = VALUES(`grade_section`),
                `strand` = VALUES(`strand`),
                " . ($avatar !== null ? "`avatar` = VALUES(`avatar`)," : "") . "
                `permissions` = VALUES(`permissions`),
                `is_deleted` = `is_deleted`
        ";

        $stmt = $pdo->prepare($upsertSql);
        $stmt->execute([
            ':id' => $id,
            ':first_name' => $firstName,
            ':middle_name' => $middleName,
            ':last_name' => $lastName,
            ':full_name' => $fullName,
            ':email' => $email,
            ':password' => $storedPassword,
            ':role' => $role,
            ':status' => $status,
            ':gender' => $gender,
            ':branch' => $branch,
            ':department' => $dept,
            ':grade_level' => $grade,
            ':grade_section' => $section,
            ':strand' => $strand,
            ':avatar' => $avatar,
            ':permissions' => $perms
        ]);

        if ($password !== '' && $existingPassword !== false) sigmaRevokeAccountSessions($pdo, $id);
        $activity = $existingPassword === false ? 'Created User Account'
            : ($password !== '' ? 'Reset User Password'
            : (($existingUser['status'] ?? '') !== $status ? 'Changed User Status'
            : (($existingUser['permissions'] ?? '') !== $perms ? 'Updated User Permissions' : 'Updated User Profile')));
        sigmaRecordActivity($pdo, (string)$databaseActor['id'], $activity, 'Users', 'Account ID: '.$id."\nName: ".$fullName."\nRole: ".$role."\nStatus: ".$status);
        if ($pdo->inTransaction()) $pdo->commit();

        $fetchStmt = $pdo->prepare("SELECT * FROM `users` WHERE `id` = :id LIMIT 1");
        $fetchStmt->execute([':id' => $id]);
        $savedRow = $fetchStmt->fetch();

        jsonResponse([
            'success' => true,
            'message' => 'User saved successfully',
            'record'  => userRowToRecord($savedRow)
        ]);
    }

    jsonResponse(['success' => false, 'error' => 'Method not allowed'], 405);

} catch (PDOException $e) {
    if ($pdo && $pdo->inTransaction()) $pdo->rollBack();
    jsonResponse(['success' => false, 'error' => 'Database error: ' . $e->getMessage()], 500);
} catch (Exception $e) {
    if ($pdo && $pdo->inTransaction()) $pdo->rollBack();
    jsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
}
