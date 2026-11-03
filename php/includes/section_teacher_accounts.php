<?php
/** Project section teacher fields onto accounts that still exist in the database. */
function sigmaSectionTeacherAccounts(array $row, array $users): array {
    $normalize = static fn($value) => strtolower(trim(preg_replace('/\s+/', ' ', (string)$value)));
    $byId = []; $byName = [];
    foreach ($users as $user) {
        if (!empty($user['is_deleted']) || $normalize($user['role'] ?? '') !== 'teacher') continue;
        $byId[(string)$user['id']] = $user;
        foreach ([$user['full_name'] ?? '', trim(($user['first_name'] ?? '').' '.($user['last_name'] ?? ''))] as $name) {
            if ($normalize($name) !== '') $byName[$normalize($name)] = $user;
        }
    }
    $resolve = static function ($entry) use ($byId, $byName, $normalize) {
        $id = is_array($entry) ? trim((string)($entry['id'] ?? $entry['uid'] ?? '')) : '';
        $name = is_array($entry) ? ($entry['name'] ?? $entry['fullName'] ?? '') : $entry;
        return $id !== '' ? ($byId[$id] ?? null) : ($byName[$normalize($name)] ?? null);
    };
    $teachers = $row['teachers'] ?? [];
    if (!is_array($teachers)) $teachers = json_decode((string)$teachers, true) ?: [];
    $row['teachers'] = array_values(array_filter($teachers, static fn($entry) => $resolve($entry) !== null));
    if (!$resolve($row['teacher'] ?? '')) {
        $first = $row['teachers'][0] ?? [];
        $row['teacher'] = is_array($first) ? ($first['name'] ?? $first['fullName'] ?? '') : $first;
        $row['teacher_role'] = is_array($first) ? ($first['role'] ?? 'Teacher') : 'Teacher';
    }
    if (!$resolve(['id' => $row['adviser_id'] ?? '', 'name' => $row['adviser'] ?? ''])) {
        $row['adviser'] = '';
        $row['adviser_id'] = '';
    }
    return $row;
}
