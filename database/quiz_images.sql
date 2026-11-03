-- Quiz banner image metadata and image data, saved with the quiz's transaction.
CREATE TABLE IF NOT EXISTS quiz_images (
    quiz_id VARCHAR(64) NOT NULL PRIMARY KEY,
    payload LONGTEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
