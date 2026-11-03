<?php
/** Banner images belong to the saved quiz, independently of optional browser caches. */
function sigmaEnsureQuizImageSchema(PDO $db): void {
    $db->exec("CREATE TABLE IF NOT EXISTS quiz_images (
        quiz_id VARCHAR(64) NOT NULL PRIMARY KEY,
        payload LONGTEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
}

function sigmaQuizImages($images): array {
    if (!is_array($images) || !array_is_list($images) || count($images) > 5) throw new InvalidArgumentException('A quiz can contain up to five banner images.');
    $result = [];
    foreach ($images as $index => $image) {
        if (!is_array($image) || !is_string($image['src'] ?? null) || !preg_match('~^(?:data:image/[^;,]+;base64,|https?://|/|image/|uploads/)~i', $image['src']) || strlen($image['src']) > 7 * 1024 * 1024) {
            throw new InvalidArgumentException('Choose a supported quiz image up to 5MB.');
        }
        $result[] = ['id' => substr((string)($image['id'] ?? 'image-'.$index), 0, 100),
            'title' => mb_substr(strip_tags((string)($image['title'] ?? '')), 0, 500), 'src' => $image['src']];
    }
    return $result;
}

function sigmaReadQuizImages(PDO $db, string $quizId): array {
    $query = $db->prepare('SELECT payload FROM quiz_images WHERE quiz_id=?');
    $query->execute([$quizId]);
    return json_decode($query->fetchColumn() ?: '[]', true, 16, JSON_THROW_ON_ERROR);
}

function sigmaSaveQuizImages(PDO $db, string $quizId, array $images): void {
    $db->prepare('INSERT INTO quiz_images(quiz_id,payload) VALUES(?,?) ON DUPLICATE KEY UPDATE payload=VALUES(payload)')
        ->execute([$quizId, json_encode($images, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR)]);
}
