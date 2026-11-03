<?php
/** Compare grade evidence independent of record/object order and the request day. */
function sigmaCanonicalGradeInsightValue($value, string $field = '') {
    if (!is_array($value)) return $value;
    if (array_is_list($value)) {
        $result = array_map(fn($entry) => sigmaCanonicalGradeInsightValue($entry), $value);
        if (in_array($field, ['areas', 'records', 'assessments'], true)) {
            usort($result, fn($left, $right) => strcmp(json_encode($left), json_encode($right)));
        }
        return $result;
    }
    ksort($value);
    foreach ($value as $key => $entry) $value[$key] = sigmaCanonicalGradeInsightValue($entry, (string)$key);
    return $value;
}
function sigmaGradeInsightEvidenceFingerprint(array $snapshot): string {
    unset($snapshot['asOf']);
    return hash('sha256', json_encode(sigmaCanonicalGradeInsightValue($snapshot), JSON_THROW_ON_ERROR));
}
