<?php
/** Shared boundary for application records; ordinary lesson text is never classified by name. */
function sigmaSyntheticRecordPath($value, string $path = 'record', int $depth = 0): ?string {
    if (!is_array($value)) return null;
    if ($depth > 64) return $path . ' (excessive nesting)';
    foreach (['isDemo', 'is_demo', 'isMock', 'is_mock', 'isSample', 'is_sample', 'isSeed', 'is_seed', 'isFake', 'is_fake'] as $flag) {
        if (isset($value[$flag]) && in_array($value[$flag], [true, 1, '1', 'true'], true)) return $path . '.' . $flag;
    }
    foreach (['createdVia', 'created_via', 'dataOrigin', 'data_origin'] as $field) {
        if (isset($value[$field]) && is_string($value[$field]) && in_array(strtolower(trim($value[$field])), ['system-seed', 'demo', 'mock', 'sample', 'fixture'], true)) return $path . '.' . $field;
    }
    foreach (['id', 'uid', 'authorId', 'author_id'] as $field) {
        if (!isset($value[$field]) || !is_scalar($value[$field])) continue;
        if (preg_match('/^(?:demo[-_]|mock[-_]|fixture[-_]|quiz-seed-|ann[-_]seed[-_]|topic[-_]teacher[-_]sample[-_]|teacher_sample_01$)/i', (string)$value[$field])) return $path . '.' . $field;
    }
    foreach ($value as $key => $child) {
        if (is_array($child)) {
            $found = sigmaSyntheticRecordPath($child, $path . '.' . $key, $depth + 1);
            if ($found !== null) return $found;
        }
    }
    return null;
}

function sigmaRequireRealRecords($value): void {
    $path = sigmaSyntheticRecordPath($value);
    if ($path === null) return;
    http_response_code(422);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'code' => 'synthetic_record_rejected', 'error' => 'Demo, seed, or fixture records cannot be saved as school records.', 'field' => $path]);
    exit;
}
