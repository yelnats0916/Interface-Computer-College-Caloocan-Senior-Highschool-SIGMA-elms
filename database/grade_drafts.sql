-- Private grade draft snapshots, isolated by owner, school year, class and quarter.
CREATE TABLE IF NOT EXISTS grade_drafts (
    record_key CHAR(64) NOT NULL PRIMARY KEY,
    owner_id VARCHAR(50) NOT NULL,
    scope_json TEXT NOT NULL,
    payload LONGTEXT NOT NULL,
    revision INT NOT NULL DEFAULT 1,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_grade_drafts_owner (owner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
