CREATE TABLE IF NOT EXISTS school_announcements (
 id VARCHAR(100) NOT NULL PRIMARY KEY,
 author_id VARCHAR(50) NOT NULL,
 payload LONGTEXT NOT NULL,
 is_deleted TINYINT(1) NOT NULL DEFAULT 0,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 INDEX idx_announcement_author(author_id), INDEX idx_announcement_visible(is_deleted,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
