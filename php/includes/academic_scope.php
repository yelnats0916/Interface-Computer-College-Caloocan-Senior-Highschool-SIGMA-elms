<?php
// Shared enrollment and assignment checks used by publication and AI evidence.
function gradeNorm($value): string { return mb_strtolower(trim(preg_replace('/\s+/u', ' ', (string)$value))); }
function gradeList($value): array { if (is_array($value)) return $value; return json_decode($value ?: '[]', true) ?: []; }
function gradeNames(array $user): array {
    return array_filter([$user['id'] ?? '', $user['email'] ?? '', $user['full_name'] ?? '', trim(($user['first_name'] ?? '') . ' ' . ($user['middle_name'] ?? '') . ' ' . ($user['last_name'] ?? '')), trim(($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? ''))]);
}
function gradeMatches($value, array $user): bool {
    $values = is_array($value) ? array_intersect_key($value, array_flip(['id','uid','teacherId','adviserId','name','fullName','email'])) : [$value];
    return (bool)array_intersect(array_map('gradeNorm', $values), array_map('gradeNorm', gradeNames($user)));
}
function gradeAdviser(array $section, array $user): bool {
    return gradeMatches($section['adviser_id'] ?? '', $user) || gradeMatches($section['adviser'] ?? '', $user);
}
function gradeTeacher(array $section, array $user, string $subject = ''): bool {
    if (gradeMatches($section['teacher'] ?? '', $user) && (!$subject || gradeNorm($section['subject'] ?? '')===gradeNorm($subject))) return true;
    foreach (gradeList($section['teachers'] ?? '') as $teacher) {
        $assigned=is_array($teacher)?($teacher['subject'] ?? $teacher['assignedSubject'] ?? ''):'';
        if (gradeMatches($teacher, $user) && (!$assigned || !$subject || gradeNorm($assigned)===gradeNorm($subject))) return true;
    }
    return false;
}
function gradeStudent(array $section, array $user): bool {
    if (gradeNorm($user['grade_section'] ?? '') === gradeNorm($section['name'])) return true;
    foreach (gradeList($section['students'] ?? '') as $student) if (gradeMatches($student, $user)) return true;
    return false;
}
