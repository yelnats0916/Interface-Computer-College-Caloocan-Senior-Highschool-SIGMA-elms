<?php
/** Verify publication matches the exact student grades the adviser reviewed. */
function sigmaValidateReviewedGrades(array $sharedRows, mixed $reviewed): void {
    if (!is_array($reviewed) || count($reviewed) !== count($sharedRows)) {
        throw new RuntimeException('The reviewed student list changed. Refresh and review the latest grades before publishing.');
    }
    $reviewedGrades = [];
    foreach ($reviewed as $row) {
        $id = is_array($row) ? (string)($row['id'] ?? '') : '';
        $grade = is_array($row) ? ($row['grade'] ?? null) : null;
        if ($id === '' || isset($reviewedGrades[$id]) || !is_numeric($grade) || !is_finite((float)$grade) || $grade < 0 || $grade > 100) {
            throw new InvalidArgumentException('Invalid reviewed student grades.');
        }
        $reviewedGrades[$id] = (float)$grade;
    }
    foreach ($sharedRows as $row) {
        $id = (string)$row['id'];
        if (!isset($reviewedGrades[$id]) || $reviewedGrades[$id] !== (float)$row['grade']) {
            throw new RuntimeException('Shared grades changed. Refresh and review the latest grades before publishing.');
        }
    }
}
