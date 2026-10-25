<?php
/** Shared assignment checks for the existing section save endpoint. */
function sigmaValidateSectionAssignments(array $section, array $users, array $existing): void {
    $list = static function ($value): array { return is_array($value) ? $value : (json_decode((string)$value, true) ?: []); };
    $norm = static fn($value) => mb_strtolower(trim(preg_replace('/\s+/u', ' ', (string)$value)));
    $byId = []; foreach ($users as $user) $byId[(string)$user['id']] = $user;
    $resolve = static function ($person, string $role) use ($byId, $users, $norm): array {
        $id = is_array($person) ? (string)($person['id'] ?? $person['uid'] ?? '') : '';
        $name = is_array($person) ? ($person['name'] ?? $person['fullName'] ?? '') : $person;
        $user = $byId[$id] ?? null;
        if (!$user && !$id) foreach ($users as $candidate) {
            if (in_array($norm($name), array_filter([$norm($candidate['full_name'] ?? ''), $norm(($candidate['first_name'] ?? '').' '.($candidate['last_name'] ?? ''))]), true)) { $user = $candidate; break; }
        }
        if (!$user || !empty($user['is_deleted']) || $norm($user['status'] ?? '') !== 'active' || $norm($user['role'] ?? '') !== $role) {
            throw new InvalidArgumentException('Select an active '.($role === 'teacher' ? 'teacher' : 'student').' account.');
        }
        return $user;
    };
    $teachers = $list($section['teachers'] ?? []); $students = $list($section['students'] ?? []);
    if (count($teachers) > 2) throw new InvalidArgumentException('A subject can have at most two teachers.');
    $teacherIds = []; $studentIds = []; $advisers = []; $leadCount = 0;
    foreach ($teachers as $person) {
        $user = $resolve($person, 'teacher'); $id = (string)$user['id'];
        if (isset($teacherIds[$id])) throw new InvalidArgumentException('This teacher is already selected.');
        $teacherIds[$id] = true;
        if (!empty($person['isPrimary'])) $leadCount++;
        if ($norm($person['role'] ?? '') === 'adviser') $advisers[$id] = true;
    }
    if ($leadCount > 1) throw new InvalidArgumentException('Select only one lead teacher.');
    foreach ($students as $person) {
        $user = $resolve($person, 'student'); $id = (string)$user['id'];
        if (isset($studentIds[$id])) throw new InvalidArgumentException('This student is already selected.');
        $studentIds[$id] = true;
    }
    if (!empty($section['adviserId']) || !empty($section['adviser'])) {
        $user = $resolve(['id'=>$section['adviserId'] ?? '', 'name'=>$section['adviser'] ?? ''], 'teacher'); $advisers[(string)$user['id']] = true;
    }
    if (count($advisers) > 1) throw new InvalidArgumentException('A section can have only one adviser.');
    $deployed = in_array($norm($section['status'] ?? 'Deployed'), ['deployed','published'], true);
    $slots = static function ($record) use ($list): array {
        $daily = $list($record['dailySchedules'] ?? $record['daily_schedules'] ?? []);
        if (!$daily) {
            $days = $record['days'] ?? [];
            if (is_string($days)) $days = explode(',', $days);
            foreach ($days as $day) $daily[] = ['day'=>trim($day),'active'=>true,'startTime'=>$record['startTime'] ?? $record['start_time'] ?? '', 'endTime'=>$record['endTime'] ?? $record['end_time'] ?? ''];
        }
        $result = [];
        foreach ($daily as $slot) {
            if (empty($slot['active'])) continue;
            $day = strtolower(substr(trim($slot['day'] ?? ''),0,3));
            $from = $slot['startTime'] ?? ''; $to = $slot['endTime'] ?? '';
            if (!in_array($day,['mon','tue','wed','thu','fri','sat','sun'],true) || !preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d$/D',$from) || !preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d$/D',$to) || $to <= $from) {
                throw new InvalidArgumentException('Enter valid start and end times for each active day.');
            }
            foreach ($result as $other) if ($other[0] === $day) throw new InvalidArgumentException('Each day can have only one schedule for this subject.');
            $result[] = [$day,$from,$to];
        }
        return $result;
    };
    $wantedSlots = $slots($section);
    if ($deployed && !in_array(preg_replace('/\D/','',(string)($section['grade'] ?? $section['gradeLevel'] ?? '')), ['11','12'], true)) throw new InvalidArgumentException('Select Grade 11 or Grade 12 before deploying.');
    if ($deployed && (!$teachers || !$students || !$wantedSlots || trim($section['room'] ?? '') === '' || trim($section['subject'] ?? '') === '')) throw new InvalidArgumentException('Assign the subject, schedule, teacher, students, and room before deploying.');
    foreach ($existing as $other) {
        if (!empty($other['is_deleted']) || (string)($other['id'] ?? '') === (string)($section['id'] ?? '') || $norm($other['school_year'] ?? $other['schoolYear'] ?? '') !== $norm($section['schoolYear'] ?? '')) continue;
        if ($norm($other['name'] ?? '') === $norm($section['name'] ?? '') && $norm($other['grade_level'] ?? $other['grade'] ?? '') === $norm($section['grade'] ?? $section['gradeLevel'] ?? '') && $norm($other['subject'] ?? '') === $norm($section['subject'] ?? '') && !empty($section['subject'])) throw new DomainException('This section already has the selected subject. Edit its existing assignment.');
        if (!$deployed || !in_array($norm($other['status'] ?? ''), ['deployed','published'], true)) continue;
        $overlap = false;
        foreach ($wantedSlots as $a) foreach ($slots($other) as $b) if ($a[0] === $b[0] && $a[1] < $b[2] && $a[2] > $b[1]) $overlap = true;
        if (!$overlap) continue;
        if ($norm($other['room'] ?? '') === $norm($section['room'] ?? '')) throw new DomainException('Room schedule conflict with section '.$other['name'].'.');
        foreach ($list($other['teachers'] ?? []) as $person) {
            $id = (string)($person['id'] ?? $person['uid'] ?? '');
            if (isset($teacherIds[$id])) throw new DomainException('Teacher schedule conflict with section '.$other['name'].'.');
        }
        foreach ($list($other['students'] ?? []) as $person) {
            $id = (string)($person['id'] ?? $person['uid'] ?? '');
            if (isset($studentIds[$id])) throw new DomainException('Student schedule conflict with section '.$other['name'].'.');
        }
    }
}

function sigmaSectionAdviserTeachers(array $teachers, string $adviserId): array {
    foreach ($teachers as &$teacher) {
        if (!is_array($teacher)) continue;
        $teacher['role'] = $adviserId !== '' && (string)($teacher['id'] ?? $teacher['uid'] ?? '') === $adviserId ? 'Adviser' : 'Teacher';
    }
    return $teachers;
}
