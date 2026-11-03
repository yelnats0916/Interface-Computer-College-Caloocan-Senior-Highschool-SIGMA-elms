<?php
// API responses must remain parseable JSON even when an included file emits a warning.
if (ob_get_level() === 0) ob_start();
ini_set('display_errors', '0');
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
require_once $rootDir . '/php/includes/user_full_name.php';
$databaseActor = sigmaRequireApplicationActor($pdo, ['admin', 'masteradmin', 'administrator']);
require_once $rootDir . '/php/includes/gdrive_service.php';

function jsonResponse(array $data, int $code = 200): void {
    while (ob_get_level() > 0) ob_end_clean();
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    $body = json_encode($data, JSON_INVALID_UTF8_SUBSTITUTE | JSON_PARTIAL_OUTPUT_ON_ERROR);
    if (!is_string($body)) {
        http_response_code(500);
        $body = '{"success":false,"error":"The server could not encode its response."}';
    }
    echo $body;
    exit;
}

function usersApiConfirmedCreateRecord(?PDO $db, bool $idReserved, string $id, string $email): ?array {
    if (!$db || !$idReserved || $id === '' || $email === '') return null;
    try {
        $confirm = $db->prepare('SELECT id, first_name, middle_name, last_name, full_name, email, role, status, gender, birth_date, birth_date_is_generated, branch, department, grade_level, grade_section, strand, created_at, updated_at FROM users WHERE id=? AND email=? AND is_deleted=0 LIMIT 1');
        $confirm->execute([$id, $email]);
        $row = $confirm->fetch(PDO::FETCH_ASSOC);
        if (!$row) return null;
        return [
            'id' => (string)$row['id'], 'uid' => (string)$row['id'],
            'firstName' => (string)($row['first_name'] ?? ''), 'middleName' => (string)($row['middle_name'] ?? ''),
            'lastName' => (string)($row['last_name'] ?? ''), 'fullName' => (string)($row['full_name'] ?? ''),
            'email' => (string)($row['email'] ?? ''), 'role' => (string)($row['role'] ?? 'Student'),
            'type' => (string)($row['role'] ?? 'Student'), 'status' => (string)($row['status'] ?? 'Active'),
            'gender' => (string)($row['gender'] ?? ''), 'dateOfBirth' => (string)($row['birth_date'] ?? ''),
            'dateOfBirthIsGenerated' => !empty($row['birth_date_is_generated']), 'branch' => (string)($row['branch'] ?? 'Main Campus'),
            'department' => (string)($row['department'] ?? ''), 'gradeLevel' => (string)($row['grade_level'] ?? ''),
            'gradeSection' => (string)($row['grade_section'] ?? ''), 'strand' => (string)($row['strand'] ?? ''),
            'createdAt' => $row['created_at'] ?? null, 'updatedAt' => $row['updated_at'] ?? null
        ];
    } catch (Throwable $confirmError) {
        error_log('SIGMA users API create confirmation failed: '.$confirmError->getMessage());
        return null;
    }
}

function usersApiMinimalUserRecord(array $row): array {
    return [
        'id' => (string)$row['id'], 'uid' => (string)$row['id'],
        'firstName' => (string)($row['first_name'] ?? ''), 'middleName' => (string)($row['middle_name'] ?? ''),
        'lastName' => (string)($row['last_name'] ?? ''), 'fullName' => (string)($row['full_name'] ?? ''),
        'email' => (string)($row['email'] ?? ''), 'role' => (string)($row['role'] ?? 'Student'),
        'type' => (string)($row['role'] ?? 'Student'), 'status' => (string)($row['status'] ?? 'Active'),
        'gender' => (string)($row['gender'] ?? ''), 'dateOfBirth' => (string)($row['birth_date'] ?? ''),
        'dateOfBirthIsGenerated' => !empty($row['birth_date_is_generated']), 'branch' => (string)($row['branch'] ?? 'Main Campus'),
        'department' => (string)($row['department'] ?? ''), 'gradeLevel' => (string)($row['grade_level'] ?? ''),
        'gradeSection' => (string)($row['grade_section'] ?? ''), 'strand' => (string)($row['strand'] ?? ''),
        'createdAt' => $row['created_at'] ?? null, 'updatedAt' => $row['updated_at'] ?? null
    ];
}

function usersApiResolveDuplicateCreate(PDO $db, array $user, string $role, bool $passwordAutoGenerated): void {
    $email = trim((string)($user['email'] ?? ''));
    if ($email === '') return;
    $query = $db->prepare('SELECT id, first_name, middle_name, last_name, full_name, email, password, role, status, gender, birth_date, birth_date_is_generated, branch, department, grade_level, grade_section, strand, is_deleted, created_at, updated_at FROM users WHERE email=? LIMIT 1');
    $query->execute([$email]);
    $row = $query->fetch(PDO::FETCH_ASSOC);
    if (!$row) return;

    $generatedPassword = strtolower(preg_replace('/[^a-zA-Z0-9]/', '', trim((string)($user['lastName'] ?? $user['last_name'] ?? '')))).(string)$row['id'];
    $storedPassword = (string)($row['password'] ?? '');
    $passwordMatches = $passwordAutoGenerated && (
        ($storedPassword !== '' && password_verify($generatedPassword, $storedPassword))
        || ($storedPassword !== '' && hash_equals($storedPassword, $generatedPassword))
    );
    $sameAccount = empty($row['is_deleted'])
        && $passwordMatches
        && strcasecmp(trim((string)($row['first_name'] ?? '')), trim((string)($user['firstName'] ?? $user['first_name'] ?? ''))) === 0
        && strcasecmp(trim((string)($row['middle_name'] ?? '')), trim((string)($user['middleName'] ?? $user['middle_name'] ?? ''))) === 0
        && strcasecmp(trim((string)($row['last_name'] ?? '')), trim((string)($user['lastName'] ?? $user['last_name'] ?? ''))) === 0
        && strcasecmp(trim((string)($row['role'] ?? '')), trim($role)) === 0
        && strcasecmp(trim((string)($row['status'] ?? '')), trim((string)($user['status'] ?? 'Active'))) === 0
        && strcasecmp(trim((string)($row['gender'] ?? '')), trim((string)($user['gender'] ?? ''))) === 0
        && (string)($row['birth_date'] ?? '') === trim((string)($user['dateOfBirth'] ?? $user['birthDate'] ?? ''))
        && strcasecmp(trim((string)($row['branch'] ?? '')), trim((string)($user['branch'] ?? 'Main Campus'))) === 0;

    if ($sameAccount) {
        jsonResponse(['success' => true, 'message' => 'User was already created successfully', 'record' => usersApiMinimalUserRecord($row)]);
    }
    jsonResponse(['success' => false, 'code' => 'email_already_exists', 'error' => 'This email address already belongs to a user. No new account was created.'], 409);
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

    $fullName = sigmaUserFullName($row);

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
        'dateOfBirth'  => (string) ($row['birth_date'] ?? ''),
        'dateOfBirthIsGenerated' => !empty($row['birth_date_is_generated']),
        'branch'       => (string) ($row['branch'] ?? 'Main Campus'),
        'department'   => (string) ($row['department'] ?? ''),
        'gradeLevel'   => (string) ($row['grade_level'] ?? ''),
        'gradeSection' => (string) ($row['grade_section'] ?? ''),
        'strand'       => (string) ($row['strand'] ?? ''),
        'avatar'       => $row['avatar'] ?? null,
        'avatarHistory' => empty($row['avatar']) ? [] : [$row['avatar']],
        'permissions'  => $permissions,
        'totp_enabled' => !empty($row['totp_enabled']),
        'totpEnabled'  => !empty($row['totp_enabled']),
        'has2fa'       => !empty($row['totp_enabled']),
        'totpSecretGenerated' => !empty($row['totp_secret']),
        'isDeleted'    => (bool) ($row['is_deleted'] ?? 0),
        'createdAt'    => $row['created_at'] ?? null,
        'updatedAt'    => $row['updated_at'] ?? null
    ];
}

$method = $_SERVER['REQUEST_METHOD'];
$createIdReserved = false;

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
        if ($action !== 'create' && empty($input['batch']) && (($input['user']['createdVia'] ?? '') !== 'batch-creator')) {
            protectServiceAdministratorAccounts($input);
        }

        if(in_array($action,['lock','unlock'],true)){
            require_once __DIR__.'/../includes/account_lock.php';
            $saved=sigmaSetAccountLock($pdo,$databaseActor,$targetId,$action==='lock');
            jsonResponse(['success'=>true,'record'=>userRowToRecord($saved)]);
        }

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
        $fullName = sigmaUserFullName(['firstName'=>$firstName, 'middleName'=>$middleName, 'lastName'=>$lastName]);
        $birthDate = trim((string)($userObj['dateOfBirth'] ?? $userObj['birthDate'] ?? $userObj['birth_date'] ?? ''));
        $parsedBirthDate = $birthDate !== '' ? DateTimeImmutable::createFromFormat('!Y-m-d', $birthDate) : false;
        $birthDateErrors = DateTimeImmutable::getLastErrors();

        $email = trim($userObj['email'] ?? '');
        $password = (string) ($userObj['password'] ?? '');
        if ($firstName === '' || $lastName === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            jsonResponse(['success' => false, 'error' => 'A real first name, last name, and valid email are required.'], 422);
        }
        if (!$parsedBirthDate || $parsedBirthDate->format('Y-m-d') !== $birthDate || ($birthDateErrors && ($birthDateErrors['warning_count'] || $birthDateErrors['error_count'])) || $birthDate > gmdate('Y-m-d')) {
            jsonResponse(['success' => false, 'error' => 'A valid birthday that is not in the future is required.'], 422);
        }
        if ($action === 'create') {
            usersApiResolveDuplicateCreate($pdo, $userObj, $requestedRole, ($input['passwordAutoGenerated'] ?? false) === true);
            $pdo->beginTransaction();
            $id = sigmaNextUserId($pdo, sigmaUserIdPrefix($requestedRole, (string)($input['branchCode'] ?? '01')), true);
            $createIdReserved = true;
            if (($input['passwordAutoGenerated'] ?? false) === true) $password = strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $lastName)).$id;
        }
        $existingPasswordQuery = $pdo->prepare('SELECT * FROM users WHERE id=? LIMIT 1');
        $existingPasswordQuery->execute([$id]);
        $existingUser = $existingPasswordQuery->fetch(PDO::FETCH_ASSOC);
        $existingPassword = $existingUser ? $existingUser['password'] : false;
        $birthDateIsGenerated = $action === 'create'
            ? 0
            : (int)($userObj['dateOfBirthIsGenerated'] ?? ($existingUser['birth_date_is_generated'] ?? 0));
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
                `role`, `status`, `gender`, `birth_date`, `birth_date_is_generated`, `branch`, `department`, `grade_level`, `grade_section`, `strand`, `avatar`, `permissions`, `is_deleted`
            ) VALUES (
                :id, :first_name, :middle_name, :last_name, :full_name, :email, :password,
                :role, :status, :gender, :birth_date, :birth_date_is_generated, :branch, :department, :grade_level, :grade_section, :strand, :avatar, :permissions, 0
            )";
        if ($action !== 'create') $upsertSql .= " ON DUPLICATE KEY UPDATE
                `first_name` = VALUES(`first_name`),
                `middle_name` = VALUES(`middle_name`),
                `last_name` = VALUES(`last_name`),
                `full_name` = VALUES(`full_name`),
                `email` = VALUES(`email`),
                " . ($password ? "`password` = VALUES(`password`)," : "") . "
                `role` = VALUES(`role`),
                `status` = VALUES(`status`),
                `gender` = VALUES(`gender`),
                `birth_date` = VALUES(`birth_date`),
                `birth_date_is_generated` = VALUES(`birth_date_is_generated`),
                `branch` = VALUES(`branch`),
                `department` = VALUES(`department`),
                `grade_level` = VALUES(`grade_level`),
                `grade_section` = VALUES(`grade_section`),
                `strand` = VALUES(`strand`),
                " . ($avatar !== null ? "`avatar` = VALUES(`avatar`)," : "") . "
                `permissions` = VALUES(`permissions`),
                `is_deleted` = `is_deleted`";

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
            ':birth_date' => $birthDate,
            ':birth_date_is_generated' => $birthDateIsGenerated,
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
    if ($pdo && $pdo->inTransaction()) {
        try { $pdo->rollBack(); } catch (Throwable $rollbackError) { error_log('SIGMA users API rollback failed: '.$rollbackError->getMessage()); }
    }
    if (($action ?? '') === 'create') {
        $record = usersApiConfirmedCreateRecord($pdo ?? null, $createIdReserved, (string)($id ?? ''), (string)($userObj['email'] ?? ''));
        if ($record) jsonResponse(['success' => true, 'message' => 'User saved successfully', 'record' => $record]);
        if (($input['passwordAutoGenerated'] ?? false) === true) usersApiResolveDuplicateCreate($pdo, $userObj ?? [], (string)($requestedRole ?? 'Student'), true);
    }
    jsonResponse(['success' => false, 'error' => 'Database error: ' . $e->getMessage()], 500);
} catch (Exception $e) {
    if ($pdo && $pdo->inTransaction()) {
        try { $pdo->rollBack(); } catch (Throwable $rollbackError) { error_log('SIGMA users API rollback failed: '.$rollbackError->getMessage()); }
    }
    if (($action ?? '') === 'create') {
        $record = usersApiConfirmedCreateRecord($pdo ?? null, $createIdReserved, (string)($id ?? ''), (string)($userObj['email'] ?? ''));
        if ($record) jsonResponse(['success' => true, 'message' => 'User saved successfully', 'record' => $record]);
        if (($input['passwordAutoGenerated'] ?? false) === true) usersApiResolveDuplicateCreate($pdo, $userObj ?? [], (string)($requestedRole ?? 'Student'), true);
    }
    jsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
} catch (Throwable $e) {
    if ($pdo && $pdo->inTransaction()) {
        try { $pdo->rollBack(); } catch (Throwable $rollbackError) { error_log('SIGMA users API rollback failed: '.$rollbackError->getMessage()); }
    }
    error_log('SIGMA users API unexpected failure: '.get_class($e).': '.$e->getMessage());

    // A PHP Error can occur while formatting the reply after the transaction has
    // committed. Confirm by the reserved ID and email before telling the browser
    // to retry, so an already-created account is returned as a success.
    if (($action ?? '') === 'create') {
        $record = usersApiConfirmedCreateRecord($pdo ?? null, $createIdReserved, (string)($id ?? ''), (string)($userObj['email'] ?? ''));
        if ($record) jsonResponse(['success' => true, 'message' => 'User saved successfully', 'record' => $record]);
        if (($input['passwordAutoGenerated'] ?? false) === true) usersApiResolveDuplicateCreate($pdo, $userObj ?? [], (string)($requestedRole ?? 'Student'), true);
    }

    jsonResponse(['success' => false, 'error' => 'The server could not complete this account request. Check the Users list before retrying.'], 500);
}
