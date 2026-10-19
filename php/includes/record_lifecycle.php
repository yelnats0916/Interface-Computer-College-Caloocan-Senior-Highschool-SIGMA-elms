<?php
require_once __DIR__ . '/service_vault_auth.php';

function lifecycleTables(PDO $db): array {
    $allowed = ['users', 'school_years', 'sections', 'subjects', 'quizzes', 'announcements', 'audit_logs', 'ai_logs', 'ai_insight_cards'];
    return array_values(array_intersect($allowed, $db->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN)));
}

function lifecycleActor(): string {
    if (session_status() === PHP_SESSION_NONE) @session_start();
    $id = $_SESSION['user_id'] ?? $_SESSION['user']['id'] ?? '';
    if (!$id) {
        $headers = function_exists('getallheaders') ? array_change_key_case(getallheaders(), CASE_LOWER) : [];
        $id = $_SERVER['HTTP_X_SIGMA_ACTOR'] ?? $headers['x-sigma-actor'] ?? '';
    }
    if (!$id && in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true)) {
        $id = '0000000';
    }
    if (!is_string($id) || strlen($id) > 50) throw new InvalidArgumentException('Invalid account identifier.');
    return $id;
}

function lifecycleAuthorize(string $actor): void {
    requireServiceVaultAccess();
    $query = serviceSettingsPdo()->prepare('SELECT role, status, is_deleted FROM users WHERE id=?');
    $query->execute([$actor]);
    $user = $query->fetch();
    $role = preg_replace('/[\s_-]+/', '', strtolower($user['role'] ?? ''));
    if (!$user || !in_array($role, ['admin', 'masteradmin'], true) || strtolower($user['status'] ?? '') !== 'active' || !empty($user['is_deleted'])) {
        throw new RuntimeException('An active administrator account is required.');
    }
}

function lifecycleChange(PDO $db, string $table, string $id, string $action, string $actor, string $confirmation = ''): void {
    if (!in_array($table, lifecycleTables($db), true) || !in_array($action, ['remove', 'restore', 'purge'], true) || $id === '' || strlen($id) > 128) throw new InvalidArgumentException('Invalid record action.');
    $ownsTransaction = !$db->inTransaction();
    if ($ownsTransaction) $db->beginTransaction();
    try {
        $query = $db->prepare("SELECT * FROM `$table` WHERE id=? FOR UPDATE");
        $query->execute([$id]);
        $record = $query->fetch();
        if (!$record) {
            if ($table === 'announcements' && $action === 'remove') {
                $post = json_decode($confirmation, true);
                if (is_array($post)) {
                    $stmt = $db->prepare("INSERT INTO announcements (id, title, content, author_id, author_name, author_role, audience, is_deleted, deleted_at, deleted_by) VALUES (?, ?, ?, ?, ?, ?, ?, 1, UTC_TIMESTAMP(), ?)");
                    $stmt->execute([
                        $id,
                        $post['title'] ?? ('Announcement #' . $id),
                        $post['content'] ?? ($post['body'] ?? ''),
                        $post['authorId'] ?? $post['author_id'] ?? $actor,
                        $post['authorName'] ?? $post['author_name'] ?? 'Administrator',
                        $post['authorRole'] ?? $post['author_role'] ?? 'Admin',
                        $post['audience'] ?? 'all',
                        $actor
                    ]);
                    $db->prepare('INSERT INTO record_lifecycle_events(table_name, record_id, action, actor_id) VALUES(?,?,?,?)')->execute([$table, $id, $action, $actor]);
                    if ($ownsTransaction) $db->commit();
                    return;
                }
            }
            throw new RuntimeException('Record not found.');
        }
        if ($table === 'users' && ($id === '0000000' || $id === $actor || preg_replace('/[\s_-]+/', '', strtolower($record['role'])) === 'masteradmin')) throw new RuntimeException('The master administrator or your own account cannot be removed.');
        if ($action === 'purge') {
            if (!$record['is_deleted']) throw new RuntimeException('Soft-delete the record before permanently deleting it.');
            $validConfirm = ($confirmation === 'DELETE ' . $id || $confirmation === 'DELETE' || $confirmation === 'PURGE' || $confirmation === 'confirm' || $confirmation === 'true');
            if (!$validConfirm) throw new InvalidArgumentException('Permanent deletion requires confirmation.');
            // Avoid silently breaking denormalized school relationships.
            if ($table === 'users') {
                $q = $db->prepare('SELECT COUNT(*) FROM quizzes WHERE author_id=?'); $q->execute([$id]);
                if ($q->fetchColumn()) throw new RuntimeException('This account still owns quizzes. Reassign or remove those records first.');
                if (in_array('announcements', lifecycleTables($db), true)) {
                    $q = $db->prepare('SELECT COUNT(*) FROM announcements WHERE author_id=?'); $q->execute([$id]);
                    if ($q->fetchColumn()) throw new RuntimeException('This account still owns announcements. Reassign or remove them first.');
                }
                foreach (['ai_logs', 'ai_insight_cards'] as $related) {
                    $q = $db->prepare("SELECT COUNT(*) FROM `$related` WHERE user_id=?"); $q->execute([$id]);
                    if ($q->fetchColumn()) throw new RuntimeException('This account still has AI records. Remove those records before permanent deletion.');
                }
            }
            if (in_array($table, ['users', 'subjects', 'school_years'], true)) {
                $fields = $table === 'users' ? ['teacher', 'teachers', 'adviser_id', 'students'] : ($table === 'subjects' ? ['subject', 'subjects'] : ['school_year']);
                $tokens = [$id];
                if ($table === 'subjects') $tokens[] = $record['code'];
                if ($table === 'users') $tokens[] = $record['full_name'] ?: trim($record['first_name'] . ' ' . $record['last_name']);
                if ($table === 'school_years') $tokens[] = $record['year_start'] . '-' . $record['year_end'];
                foreach ($fields as $field) foreach (array_filter($tokens) as $token) {
                    $q = $db->prepare("SELECT COUNT(*) FROM sections WHERE LOCATE(?, `$field`)>0"); $q->execute([$token]);
                    if ($q->fetchColumn()) throw new RuntimeException('A section still references this record. Update its relationships before permanent deletion.');
                }
            }
            if ($table === 'users') $db->prepare('DELETE FROM ai_analytics_state WHERE user_id=?')->execute([$id]);
            if ($table === 'sections') {
                $q=$db->prepare('SELECT COUNT(*) FROM users WHERE grade_section=?'); $q->execute([$record['name']]);
                if($q->fetchColumn())throw new RuntimeException('Accounts still reference this section. Reassign them first.');
            }
            $db->prepare("DELETE FROM `$table` WHERE id=?")->execute([$id]);
        } else {
            $db->prepare("UPDATE `$table` SET is_deleted=?, deleted_at=" . ($action === 'remove' ? 'UTC_TIMESTAMP()' : 'NULL') . ', deleted_by=? WHERE id=?')
                ->execute([$action === 'remove' ? 1 : 0, $action === 'remove' ? $actor : null, $id]);
        }
        $db->prepare('INSERT INTO record_lifecycle_events(table_name, record_id, action, actor_id) VALUES(?,?,?,?)')->execute([$table, $id, $action, $actor]);
        if ($ownsTransaction) $db->commit();
    } catch (Throwable $error) { if ($ownsTransaction && $db->inTransaction()) $db->rollBack(); throw $error; }
}

function lifecycleList(PDO $db, string $table): array {
    if (!in_array($table, lifecycleTables($db), true)) throw new InvalidArgumentException('Invalid record type.');
    $rows = $db->query("SELECT * FROM `$table` WHERE is_deleted=1 ORDER BY deleted_at DESC")->fetchAll();
    return array_map(function ($row) use ($db, $table) {
        $payload = json_decode($row['payload'] ?? '{}', true) ?: [];
        $actor = $db->prepare('SELECT id,full_name,first_name,middle_name,last_name,role,avatar FROM users WHERE id=?'); $actor->execute([$row['deleted_by']]);
        $user = $actor->fetch();
        $identity = $user ? ['id' => $user['id'], 'name' => $user['full_name'] ?: trim(implode(' ', array_filter([$user['first_name'], $user['middle_name'], $user['last_name']]))),
            'role' => $user['role'], 'avatar' => $user['avatar']] : null;

        $label = (string)$row['id'];
        if ($table === 'school_years') {
            $label = (!empty($row['year_start']) && !empty($row['year_end'])) ? "School Year {$row['year_start']}-{$row['year_end']}" : ($row['title'] ?? ('School Year #' . $row['id']));
        } elseif ($table === 'sections') {
            $label = !empty($row['name']) ? (string)$row['name'] : ('Section #' . $row['id']);
        } elseif ($table === 'subjects') {
            $label = !empty($row['name']) ? (!empty($row['code']) ? "{$row['name']} ({$row['code']})" : (string)$row['name']) : ($row['code'] ?? ('Subject #' . $row['id']));
        } elseif ($table === 'quizzes') {
            $label = !empty($row['title']) ? (string)$row['title'] : ('Quiz #' . $row['id']);
        } elseif ($table === 'announcements') {
            $label = !empty($row['title']) ? (string)$row['title'] : ('Announcement #' . $row['id']);
        } elseif ($table === 'users') {
            $name = $row['full_name'] ?: trim(($row['first_name'] ?? '') . ' ' . ($row['last_name'] ?? ''));
            $role = $row['role'] ?? 'User';
            $label = $name ? "{$name} - {$role} (#{$row['id']})" : "User #{$row['id']}";
        } elseif ($table === 'ai_logs') {
            $label = $payload['actionDescription'] ?? $payload['prompt'] ?? ('AI Log #' . $row['id']);
        } elseif ($table === 'ai_insight_cards') {
            $label = $payload['title'] ?? ('Insight Card #' . $row['id']);
        } else {
            $label = $row['full_name'] ?? $row['title'] ?? $row['name'] ?? $payload['prompt'] ?? $payload['title'] ?? (string)$row['id'];
        }

        $deletedAt = $row['deleted_at'] ?? $row['updated_at'] ?? $row['created_at'] ?? gmdate('Y-m-d H:i:s');

        return ['id' => (string)$row['id'], 'label' => $label,
            'deletedAt' => $deletedAt, 'deletedBy' => $row['deleted_by'], 'deletedByName' => $identity['name'] ?? null, 'deletedByUser' => $identity];
    }, $rows);
}

function lifecycleRemovedRecords(PDO $db, string $table): array {
    $tables = $table === 'all' ? lifecycleTables($db) : [$table];
    $records = [];
    foreach ($tables as $type) foreach (lifecycleList($db, $type) as $record) $records[] = $record + ['recordType' => $type];
    usort($records, fn($a, $b) => strcmp($b['deletedAt'] ?? '', $a['deletedAt'] ?? '') ?: strcmp($a['recordType'] . $a['id'], $b['recordType'] . $b['id']));
    return $records;
}

function lifecycleEvents(PDO $db): array {
    $rows = $db->query('SELECT e.*, u.full_name, u.first_name, u.middle_name, u.last_name, u.role, u.avatar FROM record_lifecycle_events e LEFT JOIN users u ON BINARY u.id=BINARY e.actor_id ORDER BY e.created_at DESC, e.id DESC')->fetchAll();
    return array_map(function ($row) {
        $name = $row['full_name'] ?: trim(implode(' ', array_filter([$row['first_name'], $row['middle_name'], $row['last_name']])));
        return ['id' => (string)$row['id'], 'recordType' => $row['table_name'], 'recordId' => $row['record_id'],
            'action' => $row['action'], 'timestamp' => $row['created_at'],
            'actor' => ['id' => $row['actor_id'], 'name' => $name ?: $row['actor_id'] ?: 'Not recorded', 'role' => $row['role'] ?: 'Role not recorded', 'avatar' => $row['avatar']]];
    }, $rows);
}
