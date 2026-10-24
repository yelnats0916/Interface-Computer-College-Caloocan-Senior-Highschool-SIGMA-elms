<?php
// Creator labels use structured first/last names. Full account names remain intact.
function sigmaCreatorDisplayName(array $user, string $fallback = ''): string {
    $first = trim((string)($user['first_name'] ?? $user['firstName'] ?? ''));
    $last = trim((string)($user['last_name'] ?? $user['lastName'] ?? ''));
    return trim($first . ' ' . $last) ?: $fallback;
}
function sigmaCreatorNameForId(PDO $pdo, string $id, string $fallback = ''): string {
    static $names = [];
    if ($id === '') return $fallback;
    if (!array_key_exists($id, $names)) {
        $query = $pdo->prepare('SELECT first_name,last_name FROM users WHERE id=? LIMIT 1');
        $query->execute([$id]);
        $user = $query->fetch(PDO::FETCH_ASSOC);
        $names[$id] = $user ? sigmaCreatorDisplayName($user) : '';
    }
    return $names[$id] ?: $fallback;
}
