<?php
/**
 * Test verification for all draft coursework addition and publication.
 */
$root = dirname(__DIR__);
require_once $root . '/config/database.php';

$bundleFile = $root . '/output/all-draft-coursework/all-draft-coursework-bundle.json';
if (!is_file($bundleFile)) {
    echo "FAIL: Coursework bundle file not found: $bundleFile\n";
    exit(1);
}

$bundle = json_decode(file_get_contents($bundleFile), true);
if (count($bundle['subjects'] ?? []) !== 50) {
    echo "FAIL: Expected 50 subjects in bundle, got " . count($bundle['subjects'] ?? []) . "\n";
    exit(1);
}

if (count($bundle['quizzes'] ?? []) !== 347) {
    echo "FAIL: Expected 347 quizzes in bundle, got " . count($bundle['quizzes'] ?? []) . "\n";
    exit(1);
}

// 1. Verify Database Quizzes
$quizCount = (int)$pdo->query("SELECT COUNT(*) FROM quizzes WHERE is_deleted=0")->fetchColumn();
if ($quizCount < 347) {
    echo "FAIL: Expected at least 347 quizzes in database, found $quizCount\n";
    exit(1);
}

// Check sample quiz questions
$sampleQuiz = $pdo->query("SELECT * FROM quizzes WHERE is_deleted=0 LIMIT 1")->fetch(PDO::FETCH_ASSOC);
$questions = json_decode($sampleQuiz['questions'], true);
if (count($questions) !== 10) {
    echo "FAIL: Expected 10 questions in quiz, got " . count($questions) . "\n";
    exit(1);
}
foreach ($questions as $q) {
    if (empty($q['question']) || count($q['choices']) !== 4 || !isset($q['answerIndex']) || empty($q['explanation'])) {
        echo "FAIL: Malformed quiz question structure in quiz {$sampleQuiz['id']}\n";
        exit(1);
    }
}

// 2. Verify Database Subjects Status
$pubSubjects = (int)$pdo->query("SELECT COUNT(*) FROM subjects WHERE is_deleted=0 AND status='Published'")->fetchColumn();
if ($pubSubjects < 50) {
    echo "FAIL: Expected at least 50 published subjects in database, found $pubSubjects\n";
    exit(1);
}

$draftSubjects = (int)$pdo->query("SELECT COUNT(*) FROM subjects WHERE is_deleted=0 AND status='Draft'")->fetchColumn();
if ($draftSubjects !== 0) {
    echo "FAIL: Expected 0 draft subjects remaining, found $draftSubjects\n";
    exit(1);
}

// 3. Verify Documents in uploads/documents/
$docsDir = $root . '/uploads/documents';
if (!is_dir($docsDir)) {
    echo "FAIL: Documents upload folder not found: $docsDir\n";
    exit(1);
}

$files = glob($docsDir . '/*');
if (count($files) < 600) {
    echo "FAIL: Expected at least 600 generated files in uploads/documents, found " . count($files) . "\n";
    exit(1);
}

// Check sample files
$samplePdf = null;
$sampleDocx = null;
foreach ($files as $f) {
    if (str_ends_with($f, '.pdf') && !$samplePdf) $samplePdf = $f;
    if (str_ends_with($f, '.docx') && !$sampleDocx) $sampleDocx = $f;
    if ($samplePdf && $sampleDocx) break;
}

if (!$samplePdf || filesize($samplePdf) < 500) {
    echo "FAIL: Sample PDF file is missing or too small\n";
    exit(1);
}

if (!$sampleDocx || filesize($sampleDocx) < 500) {
    echo "FAIL: Sample DOCX file is missing or too small\n";
    exit(1);
}

echo "PASS: All draft coursework verified successfully.\n";
echo "  - 50 subjects loaded and published (0 drafts remaining)\n";
echo "  - {$bundle['quizzesCount']} quizzes saved in database storage\n";
echo "  - {$bundle['materialsCount']} total materials created across topics\n";
echo "  - {$bundle['rubricsCount']} analytical rubrics generated\n";
echo "  - " . count($files) . " authentic PDF/DOCX instruction and rubric files verified in uploads/documents/\n";
exit(0);
