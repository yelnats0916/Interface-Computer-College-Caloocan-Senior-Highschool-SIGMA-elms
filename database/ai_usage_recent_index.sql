-- One-time upgrade for databases created before the recent AI usage index.
-- This lets dashboard usage reads skip old activity records.
SET @sigma_ai_usage_index_ddl = IF(
    EXISTS(
        SELECT 1
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = 'ai_logs'
          AND index_name = 'idx_ai_log_created'
    ),
    'SELECT 1',
    'ALTER TABLE ai_logs ADD INDEX idx_ai_log_created (created_at)'
);
PREPARE sigma_ai_usage_index_stmt FROM @sigma_ai_usage_index_ddl;
EXECUTE sigma_ai_usage_index_stmt;
DEALLOCATE PREPARE sigma_ai_usage_index_stmt;
