CREATE TABLE IF NOT EXISTS academic_records (
 record_key CHAR(64) PRIMARY KEY, record_type VARCHAR(24) NOT NULL,
 subject_id VARCHAR(100) NOT NULL, section_id VARCHAR(100) NOT NULL,
 student_id VARCHAR(50) NOT NULL DEFAULT '', item_id VARCHAR(191) NOT NULL DEFAULT '',
 payload LONGTEXT NOT NULL, actor_id VARCHAR(50) NOT NULL,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 KEY academic_scope(subject_id,section_id,record_type), KEY academic_student(student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS ai_generation_ledger (
 owner_id VARCHAR(50) NOT NULL, context_key CHAR(64) NOT NULL,
 payload LONGTEXT NOT NULL, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 PRIMARY KEY(owner_id,context_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
