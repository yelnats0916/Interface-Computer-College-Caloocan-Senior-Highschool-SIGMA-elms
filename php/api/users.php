<?php
require_once dirname(__DIR__) . '/includes/data_provenance.php';
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
        'permissions'  => $permissions,
        'isDeleted'    => (bool) ($row['is_deleted'] ?? 0),
        'createdAt'    => $row['created_at'] ?? null,
        'updatedAt'    => $row['updated_at'] ?? null
    ];
}

$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
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
        if (!$id) {
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
        $existingPasswordQuery = $pdo->prepare('SELECT password FROM users WHERE id=? LIMIT 1');
        $existingPasswordQuery->execute([$id]);
        $existingPassword = $existingPasswordQuery->fetchColumn();
        if ($password === '' && $existingPassword === false) jsonResponse(['success' => false, 'error' => 'An initial password is required for a new account.'], 422);
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
        $perms = isset($userObj['permissions']) ? json_encode($userObj['permissions']) : null;

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
    jsonResponse(['success' => false, 'error' => 'Database error: ' . $e->getMessage()], 500);
} catch (Exception $e) {
    jsonResponse(['success' => false, 'error' => $e->getMessage()], 500);
}
