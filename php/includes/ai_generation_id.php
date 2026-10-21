<?php

/**
 * Reserves a human-readable ID for a completed SIGMA AI generation.
 *
 * The sequence is kept outside the web root and protected by an exclusive
 * file lock so concurrent requests cannot receive the same code.
 */
function sigmaAiGenerationId(string $kind): string {
    $prefixes = [
        'evaluation' => 'EVAL',
        'feedback' => 'FDBK',
        'assessment' => 'ASMTG',
        'insight' => 'INSG',
        'insight_cards' => 'INSC',
        'insight_grades' => 'INSGR',
        'insight_subject' => 'INSS',
        'insight_assessment' => 'INSA',
        'chat' => 'CHAT',
    ];
    if (!isset($prefixes[$kind])) throw new InvalidArgumentException('Unsupported AI generation type.');

    $directory = getenv('SIGMA_STORAGE_DIRECTORY') ?: dirname(__DIR__, 2) . '/storage';
    if (!is_dir($directory) && !mkdir($directory, 0700, true) && !is_dir($directory)) {
        throw new RuntimeException('AI generation ID storage is unavailable.');
    }
    $handle = fopen($directory . '/ai-generation-sequence.json', 'c+');
    if (!$handle || !flock($handle, LOCK_EX)) throw new RuntimeException('AI generation ID could not be reserved.');

    try {
        $contents = stream_get_contents($handle);
        try {
            $sequences = $contents === '' ? [] : json_decode($contents, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException $error) {
            throw new RuntimeException('AI generation ID storage is invalid.', 0, $error);
        }
        if (!is_array($sequences)) throw new RuntimeException('AI generation ID storage is invalid.');

        $year = (new DateTimeImmutable('now', new DateTimeZone('Asia/Manila')))->format('Y');
        $prefix = $prefixes[$kind];
        $next = (int)($sequences[$year][$prefix] ?? 0) + 1;
        $sequences[$year] ??= [];
        $sequences[$year][$prefix] = $next;
        $json = json_encode($sequences, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES);

        if (!ftruncate($handle, 0) || !rewind($handle)) throw new RuntimeException('AI generation ID could not be saved.');
        for ($offset = 0, $length = strlen($json); $offset < $length;) {
            $written = fwrite($handle, substr($json, $offset));
            if ($written === false || $written === 0) throw new RuntimeException('AI generation ID could not be saved.');
            $offset += $written;
        }
        if (!fflush($handle)) throw new RuntimeException('AI generation ID could not be saved.');

        return sprintf('%s-%s-%04d', $prefix, $year, $next);
    } finally {
        flock($handle, LOCK_UN);
        fclose($handle);
    }
}
