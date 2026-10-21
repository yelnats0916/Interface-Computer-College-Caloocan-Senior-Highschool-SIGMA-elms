CREATE TABLE IF NOT EXISTS user_profile_photos (
    photo_id CHAR(64) NOT NULL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    photo_url LONGTEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_profile_photos_user (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
