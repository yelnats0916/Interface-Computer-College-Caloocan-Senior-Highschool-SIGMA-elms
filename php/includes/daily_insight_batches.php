<?php
/** One bounded area and class per provider request; full source records remain authoritative. */
function sigmaDailyInsightScope(array $record, string $area): string {
    return hash('sha256', json_encode([$area, $record['subjectId'], $record['sectionId']]));
}

function sigmaDailyInsightBatch(array $snapshot, array $changedAreas, array $ledger, string $day, string $kind): array {
    $done = ($ledger['day'] ?? '') === $day ? ($ledger['dailyScopes'] ?? []) : [];
    foreach ($changedAreas as $changed) {
        $groups = [];
        foreach ($changed['records'] as $record) {
            $key = sigmaDailyInsightScope($record, $changed['id']);
            if (!isset($done[$key])) $groups[$key][] = $record;
        }
        foreach ($groups as $scope => $triggers) {
            $context = [];
            foreach ($snapshot['areas'] as $area) if ($area['id'] === $changed['id']) {
                foreach ($area['records'] as $record) if (sigmaDailyInsightScope($record, $area['id']) === $scope) $context[] = $record;
            }
            if ($kind === 'student') $context = sigmaSelectStudentInsightRecords($context, count($context));
            // Preserve the main concern/trend and the changed trigger before adding comparison context.
            $candidates = [];
            foreach (array_merge(array_slice($context, 0, 2), $triggers, $context) as $record) $candidates[$record['id']] = $record;
            $records = [];
            foreach ($candidates as $record) {
                $next = [...$records, $record];
                if (count($next) > 4 || strlen(json_encode($next, JSON_UNESCAPED_UNICODE)) > 6000) continue;
                $records = $next;
            }
            if (!$records || !array_intersect(array_column($records, 'id'), array_column($triggers, 'id'))) {
                throw new RuntimeException('One learning record exceeds the supported daily insight scope.');
            }
            return ['scope' => $scope, 'areas' => [['id' => $changed['id'], 'records' => $records]]];
        }
    }
    return ['scope' => null, 'areas' => []];
}

/** Advance only after the card and its source hashes have been committed together. */
function sigmaDailyInsightProgress(array $ledger, string $day, int $count, ?string $scope): array {
    if (($ledger['day'] ?? '') !== $day) $ledger['dailyScopes'] = [];
    $ledger['day'] = $day;
    $ledger['count'] = $count;
    $ledger['retryAfter'] = 0;
    unset($ledger['nextEvidenceCheckAt']);
    unset($ledger['lastError'], $ledger['failures']);
    if ($scope !== null) $ledger['dailyScopes'][$scope] = true;
    if ($count >= 4 || $scope === null) $ledger['completedDay'] = $day;
    elseif (($ledger['completedDay'] ?? '') === $day) unset($ledger['completedDay']);
    return $ledger;
}

/** Fair ordering across ticks; a failed account cannot monopolize the worker. */
function sigmaDailyInsightQueue(array $actors, array $ledgers, string $day, string $after, int $now): array {
    $ready = array_values(array_filter($actors, function ($actor) use ($ledgers, $day, $now) {
        $ledger = $ledgers[(string)$actor['id']] ?? [];
        return sigmaDailyInsightsDue($ledger, $day, $now) && (int)($ledger['retryAfter'] ?? 0) <= $now;
    }));
    usort($ready, fn($a, $b) => strcmp((string)$a['id'], (string)$b['id']));
    return array_merge(array_values(array_filter($ready, fn($a) => strcmp((string)$a['id'], $after) > 0)),
        array_values(array_filter($ready, fn($a) => strcmp((string)$a['id'], $after) <= 0)));
}
