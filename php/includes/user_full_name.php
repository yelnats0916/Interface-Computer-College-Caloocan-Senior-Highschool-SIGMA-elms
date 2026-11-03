<?php
/** Use the saved name components consistently for account identities. */
function sigmaUserFullName(array $user): string {
    $first = trim((string)($user['first_name'] ?? $user['firstName'] ?? ''));
    $middle = trim((string)($user['middle_name'] ?? $user['middleName'] ?? ''));
    $last = trim((string)($user['last_name'] ?? $user['lastName'] ?? ''));
    if ($first !== '' && $last !== '') {
        return implode(' ', array_filter([$first, $middle, $last], static fn($part) => $part !== ''));
    }
    return trim((string)($user['full_name'] ?? $user['fullName'] ?? $user['name'] ?? ''))
        ?: implode(' ', array_filter([$first, $middle, $last], static fn($part) => $part !== ''));
}
