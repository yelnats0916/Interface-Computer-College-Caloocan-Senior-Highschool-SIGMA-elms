<?php
require_once dirname(__DIR__) . '/php/includes/data_provenance.php';
$cases = [
    ['real record', ['id' => 'lesson-472', 'title' => 'Sample programs', 'questions' => [['sampleAnswer' => 'Example answer']]], false],
    ['uncertain title is preserved', ['id' => 'topic-472', 'title' => 'fgdfhh'], false],
    ['explicit demo identifier', ['subject' => ['topics' => [['id' => 'demo-topic-1']]]], true],
    ['explicit seed provenance', ['user' => ['id' => '1111111', 'createdVia' => 'system-seed']], true],
    ['explicit mock flag', ['log' => ['isMock' => true]], true],
    ['ordinary false flags', ['id' => 'real-4', 'isDemo' => false], false],
    ['student essay is never classified by text', ['answer' => 'This sample explains a mock database.'], false],
];
foreach ($cases as [$name, $record, $expected]) {
    if ((sigmaSyntheticRecordPath($record) !== null) !== $expected) throw new RuntimeException('Failed: ' . $name);
}
echo count($cases) . " provenance checks passed. Memory-only fixtures; no database writes.\n";
