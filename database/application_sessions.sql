-- Identity infrastructure only. No account, sample, or academic data is inserted.
CREATE TABLE IF NOT EXISTS application_presence (
    token_hash CHAR(64) NOT NULL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    online_since DATETIME NOT NULL,
    last_seen DATETIME NOT NULL,
    INDEX idx_presence_last_seen (last_seen),
    INDEX idx_presence_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS grade_sync_tokens (
    token_hash CHAR(64) NOT NULL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    expires_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS grade_sync_attempts (
    client_hash CHAR(64) NOT NULL PRIMARY KEY,
    attempts INT NOT NULL DEFAULT 0,
    blocked_until DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS application_login_challenges (
    token_hash CHAR(64) NOT NULL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    expires_at DATETIME NOT NULL,
    INDEX idx_login_challenge_user (user_id),
    INDEX idx_login_challenge_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
