<?php
/** Calendar validation shared by the school-year API and administrative imports. */
function sigmaEnsureActiveSemesterColumn(PDO $pdo): void {
    static $checked = false;
    if ($checked) return;
    $checked = true;
    $columns = $pdo->query('SHOW COLUMNS FROM school_years')->fetchAll(PDO::FETCH_COLUMN);
    if (in_array('active_semester', $columns, true)) return;
    try {
        $pdo->exec("ALTER TABLE school_years ADD COLUMN active_semester TINYINT UNSIGNED NOT NULL DEFAULT 1 AFTER status");
    } catch (PDOException $error) {
        // Two portal requests can discover the missing column simultaneously.
        if (($error->errorInfo[1] ?? null) !== 1060) throw $error;
    }
}

function sigmaValidateSchoolYear(array $payload): array {
    $start = filter_var($payload['yearStart'] ?? null, FILTER_VALIDATE_INT);
    $end = filter_var($payload['yearEnd'] ?? null, FILTER_VALIDATE_INT);
    if ($start === false || $end === false || $start < 1900 || $start > 2200 || $end !== $start + 1) {
        throw new InvalidArgumentException('The school year must contain two consecutive years.');
    }
    $dates = []; $previousEnd = null; $missing = false;
    for ($q = 1; $q <= 4; $q++) {
        $from = trim((string)($payload["q{$q}Start"] ?? ''));
        $to = trim((string)($payload["q{$q}End"] ?? ''));
        if ($from === '' && $to === '' && $q > 1) {
            $missing = true; $dates["q{$q}Start"] = null; $dates["q{$q}End"] = null; continue;
        }
        if ($from === '' || $to === '') throw new InvalidArgumentException("Enter both start and end dates for Quarter {$q}.");
        if ($missing) throw new InvalidArgumentException('Complete earlier quarters before adding a later quarter.');
        foreach ([$from, $to] as $value) {
            $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value);
            if (!$date || $date->format('Y-m-d') !== $value) throw new InvalidArgumentException('Enter valid calendar dates.');
            if ($value < "$start-01-01" || $value > "$end-12-31") throw new InvalidArgumentException('Quarter dates must fall within the academic year.');
        }
        if ($to < $from) throw new InvalidArgumentException("Quarter {$q} must end on or after its start date.");
        if ($previousEnd !== null && $from <= $previousEnd) throw new InvalidArgumentException('Quarter dates must be in order and must not overlap.');
        $dates["q{$q}Start"] = $from; $dates["q{$q}End"] = $to; $previousEnd = $to;
    }
    $status = (string)($payload['status'] ?? 'Inactive');
    if (!in_array($status, ['Active', 'Inactive', 'Completed (Archived)'], true)) throw new InvalidArgumentException('Invalid school-year status.');
    return ['yearStart' => $start, 'yearEnd' => $end, 'status' => $status] + $dates;
}

/** Call inside a transaction, with the school-year write lock held. */
function sigmaCheckSchoolYearConflict(PDO $pdo, array $record, string $id, bool $creating): ?array {
    $stmt = $pdo->prepare('SELECT * FROM school_years WHERE id = ? FOR UPDATE');
    $stmt->execute([$id]); $existing = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    if ($creating && $existing) throw new DomainException('This school year already exists. Open Manage School Years to edit or restore it.');
    if (!$creating && !$existing) throw new DomainException('This school year no longer exists. Refresh the list and try again.');
    if ($existing && !empty($existing['is_deleted'])) throw new DomainException('This school year is in the Trash Bin. Restore it instead of creating it again.');
    $rows = $pdo->query('SELECT * FROM school_years FOR UPDATE')->fetchAll(PDO::FETCH_ASSOC);
    $from = $record['q1Start']; $to = $record['q4End'] ?: ($record['q3End'] ?: ($record['q2End'] ?: $record['q1End']));
    foreach ($rows as $row) {
        if ((string)$row['id'] === $id) continue;
        if ((int)$row['year_start'] === $record['yearStart']) throw new DomainException('This academic year already exists. Open Manage School Years to edit or restore it.');
        if (!empty($row['is_deleted'])) continue;
        $otherFrom = $row['q1_start']; $otherTo = $row['q4_end'] ?: ($row['q3_end'] ?: ($row['q2_end'] ?: $row['q1_end']));
        if ($otherFrom && $otherTo && $from <= $otherTo && $to >= $otherFrom) throw new DomainException('These dates overlap another school year. Check the start and end dates.');
    }
    return $existing;
}

function sigmaSchoolYearReferenceKey(string $value): string {
    $value = mb_strtolower(trim($value));
    $value = preg_replace('/^(?:school\s*year|academic\s*year|s\.?y\.?|a\.?y\.?)\s*/u', '', $value);
    return preg_replace('/[\s.\x{2013}\x{2014}\-\/]+/u', '', $value);
}
function sigmaSchoolYearReferenceMatches(string $value, array $year): bool {
    return trim($value) === (string)$year['id'] || sigmaSchoolYearReferenceKey($value) === sigmaSchoolYearReferenceKey($year['year_start'].'-'.$year['year_end']);
}
function sigmaSchoolYearRemovalReason(PDO $db, array $year): string {
    if ($year['status'] === 'Active') return 'The active school year cannot be removed.';
    if ($year['status'] === 'Completed (Archived)') return 'Archived school years are preserved and cannot be removed.';
    // Trashed sections still retain their grades, submissions and files.
    foreach ($db->query('SELECT school_year FROM sections')->fetchAll(PDO::FETCH_COLUMN) as $ref) {
        if (sigmaSchoolYearReferenceMatches((string)$ref,$year)) return 'This school year has linked sections or academic records. Archive it instead of deleting it.';
    }
    try {
        foreach ($db->query('SELECT scope_json FROM grade_publications')->fetchAll(PDO::FETCH_COLUMN) as $scope) {
            $scope=json_decode($scope,true);
            if (is_array($scope) && sigmaSchoolYearReferenceMatches((string)($scope[0]??''),$year)) return 'This school year has saved grades or attendance. Archive it instead of deleting it.';
        }
    } catch (PDOException $e) { if ($e->getCode() !== '42S02') throw $e; }
    return '';
}
function sigmaAssertSchoolYearRemovable(PDO $db, array $year): void {
    $reason=sigmaSchoolYearRemovalReason($db,$year);
    if ($reason !== '') throw new DomainException($reason);
}
/** Lock used by section saves and year deletion to prevent orphaned assignments. */
function sigmaLockSchoolYearWrites(PDO $db): void {
    if ((int)$db->query("SELECT GET_LOCK('sigma_school_year_write',10)")->fetchColumn()!==1) throw new DomainException('School-year records are being updated. Please try again.');
}
function sigmaRequireSectionSchoolYear(PDO $db, string $reference): array {
    foreach ($db->query('SELECT id,year_start,year_end,status,is_deleted FROM school_years FOR UPDATE')->fetchAll(PDO::FETCH_ASSOC) as $year) {
        if (!sigmaSchoolYearReferenceMatches($reference,$year)) continue;
        if (!empty($year['is_deleted'])) throw new DomainException('Restore this school year before assigning a section to it.');
        if (($year['status']??'') === 'Completed (Archived)') throw new DomainException('This school year is archived. Reactivate it before changing or deploying its sections.');
        return $year;
    }
    throw new DomainException('Choose an existing school year before saving the section.');
}

function sigmaAssertSectionMutable(PDO $db,array $section): void {
    if(strtolower(trim($section['status']??''))==='archived')throw new DomainException('Archived sections are read-only. Reactivate their school year to return them to Draft.');
    sigmaRequireSectionSchoolYear($db,(string)$section['school_year']);
}

/** Lock the current row before academic writes, including requests opened before archival. */
function sigmaRequireWritableAcademicSection(PDO $db,string $id): array {
    $guard=$db->prepare('SELECT status,school_year,is_deleted FROM sections WHERE id=? FOR UPDATE');$guard->execute([$id]);
    $section=$guard->fetch(PDO::FETCH_ASSOC);
    if(!$section||!empty($section['is_deleted'])||strtolower($section['status'])==='archived')throw new DomainException('This section is archived or unavailable. Its academic records are read-only.');
    return $section;
}
