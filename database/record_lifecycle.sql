CREATE TABLE IF NOT EXISTS ai_logs (
    id VARCHAR(128) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    feature VARCHAR(50) NOT NULL,
    payload LONGTEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted TINYINT(1) NOT NULL DEFAULT 0,
    deleted_at DATETIME NULL,
    deleted_by VARCHAR(50) NULL,
    INDEX idx_ai_log_user (user_id, feature)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS ai_insight_cards (
    id CHAR(64) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    kind VARCHAR(20) NOT NULL,
    card_id VARCHAR(128) NOT NULL,
    signature CHAR(64) NOT NULL,
    payload LONGTEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted TINYINT(1) NOT NULL DEFAULT 0,
    deleted_at DATETIME NULL,
    deleted_by VARCHAR(50) NULL,
    INDEX idx_ai_card_user (user_id, kind)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS ai_analytics_state (
    user_id VARCHAR(50) NOT NULL,
    kind VARCHAR(20) NOT NULL,
    payload LONGTEXT NOT NULL,
    revision INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, kind)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS record_lifecycle_events (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    record_id VARCHAR(128) NOT NULL,
    action VARCHAR(20) NOT NULL,
    actor_id VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_record_history (table_name, record_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
