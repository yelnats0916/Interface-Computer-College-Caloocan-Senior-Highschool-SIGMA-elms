<?php
// Shared enrollment and assignment checks used by publication and AI evidence.
function gradeNorm($value): string { return mb_strtolower(trim(preg_replace('/\s+/u', ' ', (string)$value))); }
function gradeScopeYearMatches($scopeYear, $sectionYear): bool {
    $normalize = static function ($value): string {
        $value = preg_replace('/^\s*s\.?\s*y\.?\s*/iu', '', (string)$value);
        $value = preg_replace('/[\x{2010}-\x{2015}\x{2212}]/u', '-', $value);
        $value = preg_replace('/\s*-\s*/u', '-', $value);
        return gradeNorm($value);
    };
    return $normalize($scopeYear) === $normalize($sectionYear);
}
function gradeScopeSubjectsEquivalent($left, $right, array $subjects): bool {
    $normalize = static function ($value): string {
        if (!is_scalar($value)) return '';
        $value = preg_replace('/[\x{2010}-\x{2015}\x{2212}]/u', '-', (string)$value);
        $value = preg_replace('/\s*-\s*/u', '-', $value);
        return gradeNorm($value);
    };
    $leftAlias = $normalize($left);
    $rightAlias = $normalize($right);
    if ($leftAlias === '' || $rightAlias === '') return false;
    if ($leftAlias === $rightAlias) return true;
    $identity = static function (string $candidate) use ($subjects, $normalize): string {
        foreach ($subjects as $subject) {
            $aliases = [];
            foreach (['id','code','name','title','subject'] as $field) {
                $alias = $normalize($subject[$field] ?? '');
                if ($alias !== '') $aliases[$alias] = true;
            }
            $metadata = gradeList($subject['curriculum_metadata'] ?? '');
            foreach (is_array($metadata['legacyAliases'] ?? null) ? $metadata['legacyAliases'] : [] as $legacyAlias) {
                $alias = $normalize($legacyAlias);
                if ($alias !== '') $aliases[$alias] = true;
            }
            if (isset($aliases[$candidate])) return $normalize($subject['id'] ?? $subject['code'] ?? $subject['name'] ?? '');
        }
        return '';
    };
    $leftIdentity = $identity($leftAlias);
    return $leftIdentity !== '' && $leftIdentity === $identity($rightAlias);
}
function gradeScopeSectionMatches(array $section, $scopeSection): bool {
    $normalize = static function ($value): string {
        $value = preg_replace('/[\x{2010}-\x{2015}\x{2212}]/u', '-', (string)$value);
        $value = preg_replace('/\s*-\s*/u', '-', $value);
        return gradeNorm($value);
    };
    if (!is_scalar($scopeSection)) return false;
    $name = trim((string)($section['name'] ?? ''));
    if ($name === '') return false;
    if ($normalize($scopeSection) === $normalize($section['id'] ?? '')) return true;
    if ($normalize($scopeSection) === $normalize($name)) return true;

    $gradeLevel = trim((string)($section['grade_level'] ?? ''));
    if ($gradeLevel === '') return false;
    $gradeNumber = preg_replace('/^\s*grade\s*/iu', '', $gradeLevel);
    $aliases = array_unique([
        trim($gradeLevel . ' - ' . $name),
        trim('Grade ' . $gradeNumber . ' - ' . $name),
        trim($name . ' - ' . $gradeLevel),
        trim($name . ' - Grade ' . $gradeNumber),
        trim($name . ' (Grade ' . $gradeNumber . ')'),
        trim($gradeLevel . ' ' . $name),
    ]);
    foreach ($aliases as $alias) if ($normalize($scopeSection) === $normalize($alias)) return true;
    return false;
}
function gradeScopeSubjectMatches(array $section, $scopeSubject, array $subjects): bool {
    $normalize = static function ($value): string {
        if (!is_scalar($value)) return '';
        $value = preg_replace('/[\x{2010}-\x{2015}\x{2212}]/u', '-', (string)$value);
        $value = preg_replace('/\s*-\s*/u', '-', $value);
        return gradeNorm($value);
    };
    $subjectKeys = ['id','subjectId','subject_id','code','subjectCode','subject_code','name','title','subject','subjectName','subject_name','courseId','courseCode','courseName'];
    $sectionAliases = [];
    $collect = static function ($value, int $depth = 0) use (&$collect, &$sectionAliases, $subjectKeys, $normalize): void {
        if ($depth > 5) return;
        if (is_scalar($value)) {
            $alias = $normalize($value);
            if ($alias !== '') $sectionAliases[$alias] = true;
            return;
        }
        if (!is_array($value)) return;
        foreach ($value as $key => $item) {
            if (is_int($key) || in_array((string)$key, $subjectKeys, true)) $collect($item, $depth + 1);
        }
    };
    foreach (['subjects','assignedSubjects','assigned_subjects','subject'] as $field) {
        $value = $section[$field] ?? null;
        if ($field === 'subjects' || $field === 'assignedSubjects' || $field === 'assigned_subjects') $value = gradeList($value);
        $collect($value);
    }
    $scopeAlias = $normalize($scopeSubject);
    if ($scopeAlias === '' || !$sectionAliases) return false;
    if (isset($sectionAliases[$scopeAlias])) return true;
    foreach ($subjects as $subject) {
        $recordAliases = [];
        foreach (['id','code','name','title','subject'] as $field) {
            $alias = $normalize($subject[$field] ?? '');
            if ($alias !== '') $recordAliases[$alias] = true;
        }
        $metadata = gradeList($subject['curriculum_metadata'] ?? '');
        foreach (is_array($metadata['legacyAliases'] ?? null) ? $metadata['legacyAliases'] : [] as $legacyAlias) {
            $alias = $normalize($legacyAlias);
            if ($alias !== '') $recordAliases[$alias] = true;
        }
        if (isset($recordAliases[$scopeAlias]) && array_intersect_key($sectionAliases, $recordAliases)) return true;
    }
    return false;
}
function gradeScopeMatchesSection(array $section, array $scope, array $subjects): bool {
    return gradeScopeYearMatches($scope[0] ?? '', $section['school_year'] ?? '')
        && gradeScopeSectionMatches($section, $scope[1] ?? '')
        && gradeScopeSubjectMatches($section, $scope[2] ?? '', $subjects);
}
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
function gradeClassAdviser(array $sections,array $section,array $user): bool {
    foreach($sections as $candidate)if(gradeNorm($candidate['name']??'')===gradeNorm($section['name']??'')&&gradeNorm($candidate['school_year']??'')===gradeNorm($section['school_year']??'')&&gradeAdviser($candidate,$user))return true;
    return false;
}
function gradeTeacher(array $section, array $user, string $subject = '', array $subjects = []): bool {
    $hasRoster = array_key_exists('teachers', $section) && $section['teachers'] !== null;
    if (!$hasRoster && gradeMatches($section['teacher'] ?? '', $user) && (!$subject || gradeScopeSubjectsEquivalent($section['subject'] ?? '', $subject, $subjects))) return true;
    foreach (gradeList($section['teachers'] ?? '') as $teacher) {
        $assigned=is_array($teacher)?($teacher['subject'] ?? $teacher['assignedSubject'] ?? ''):'';
        if (is_array($assigned)) $assigned=$assigned['id']??$assigned['code']??$assigned['name']??$assigned['title']??'';
        if (gradeMatches($teacher, $user) && (!$assigned || !$subject || gradeScopeSubjectsEquivalent($assigned, $subject, $subjects) || gradeScopeSubjectsEquivalent($section['subject'] ?? '', $subject, $subjects))) return true;
    }
    return false;
}
function gradeStudent(array $section, array $user): bool {
    $hasRoster = array_key_exists('students', $section) && $section['students'] !== null;
    if (!$hasRoster && gradeNorm($user['grade_section'] ?? '') === gradeNorm($section['name'])) return true;
    foreach (gradeList($section['students'] ?? '') as $student) if (gradeMatches($student, $user)) return true;
    return false;
}
