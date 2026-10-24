<?php
/** Immutable per-collection creation numbers. Deleted/purged records retain reservations. */
function sigmaCreationNumberSchema(PDO $db): void {
    static $ready = [];
    $connection = spl_object_id($db);
    if (isset($ready[$connection])) return;
    try {
        $db->query('SELECT next_number FROM record_creation_counters LIMIT 0');
        $db->query('SELECT creation_number FROM record_creation_numbers LIMIT 0');
    } catch (PDOException $error) {
        if ($db->inTransaction()) throw new RuntimeException('Run the record-number migration before assigning creation numbers.', 0, $error);
        $db->exec("CREATE TABLE IF NOT EXISTS record_creation_counters (
            collection VARCHAR(64) NOT NULL PRIMARY KEY,
            next_number BIGINT UNSIGNED NOT NULL DEFAULT 1
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        $db->exec("CREATE TABLE IF NOT EXISTS record_creation_numbers (
            collection VARCHAR(64) NOT NULL,
            record_id VARCHAR(191) NOT NULL,
            creation_number BIGINT UNSIGNED NOT NULL,
            PRIMARY KEY(collection, record_id),
            UNIQUE KEY unique_creation_number(collection, creation_number)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    }
    $ready[$connection] = true;
}

function sigmaAssignCreationNumbers(PDO $db, string $collection, array $records): array {
    if (!preg_match('/^[a-z_]{1,64}$/D', $collection)) throw new InvalidArgumentException('Invalid record collection.');
    sigmaCreationNumberSchema($db);
    usort($records, static function ($a, $b) {
        $left = strtotime($a['created_at'] ?? $a['createdAt'] ?? $a['timestamp'] ?? '') ?: 0;
        $right = strtotime($b['created_at'] ?? $b['createdAt'] ?? $b['timestamp'] ?? '') ?: 0;
        return ($left <=> $right) ?: (($a['_creationOrder'] ?? PHP_INT_MAX) <=> ($b['_creationOrder'] ?? PHP_INT_MAX))
            ?: strcmp((string)$a['id'], (string)$b['id']);
    });
    $own = !$db->inTransaction();
    if ($own) $db->beginTransaction();
    try {
        $db->prepare('INSERT IGNORE INTO record_creation_counters(collection,next_number) VALUES(?,1)')->execute([$collection]);
        $counter = $db->prepare('SELECT next_number FROM record_creation_counters WHERE collection=? FOR UPDATE');
        $counter->execute([$collection]); $next = (int)$counter->fetchColumn();
        $select = $db->prepare('SELECT record_id,creation_number FROM record_creation_numbers WHERE collection=?');
        $select->execute([$collection]); $numbers = [];
        foreach ($select->fetchAll(PDO::FETCH_ASSOC) as $row) $numbers[(string)$row['record_id']] = (int)$row['creation_number'];
        if ($numbers) $next = max($next, max($numbers) + 1);
        $insert = $db->prepare('INSERT INTO record_creation_numbers(collection,record_id,creation_number) VALUES(?,?,?)');
        foreach ($records as $record) {
            $id = (string)($record['id'] ?? '');
            if ($id === '' || isset($numbers[$id])) continue;
            if (strlen($id) > 191) throw new InvalidArgumentException('Record identity is too long.');
            $insert->execute([$collection, $id, $next]); $numbers[$id] = $next++;
        }
        $db->prepare('UPDATE record_creation_counters SET next_number=? WHERE collection=?')->execute([$next,$collection]);
        if ($own) $db->commit();
        return $numbers;
    } catch (Throwable $error) {
        if ($own && $db->inTransaction()) $db->rollBack();
        throw $error;
    }
}

function sigmaTableCreationNumber(PDO $db, string $table, string $id): ?int {
    if (!in_array($table, ['users','subjects','sections','school_years','quizzes','ai_logs','ai_insight_cards','audit_logs','record_lifecycle_events'], true)) {
        throw new InvalidArgumentException('Unsupported record collection.');
    }
    static $maps = [];
    $key = spl_object_id($db) . ':' . $table;
    if (!isset($maps[$key]) || !isset($maps[$key][$id])) {
        // Include deleted records, and assign before any role/search/status filtering.
        $records = $db->query("SELECT id,created_at FROM `$table` ORDER BY created_at,id")->fetchAll(PDO::FETCH_ASSOC);
        $maps[$key] = sigmaAssignCreationNumbers($db, $table, $records);
    }
    return $maps[$key][$id] ?? null;
}
