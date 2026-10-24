-- ==============================================================================
-- SIGMA ELMS - Initial MySQL Database Schema
-- Interface Computer College - Caloocan Senior High School ELMS
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS `sigma_elms_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `sigma_elms_db`;

-- ------------------------------------------------------------------------------
-- Table: users (Admins, Teachers, and Students)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
    `id` VARCHAR(50) NOT NULL PRIMARY KEY,
    `first_name` VARCHAR(100) NOT NULL,
    `middle_name` VARCHAR(100) NULL DEFAULT '',
    `last_name` VARCHAR(100) NOT NULL,
    `full_name` VARCHAR(255) NULL,
    `email` VARCHAR(150) NOT NULL UNIQUE,
    `password` VARCHAR(255) NOT NULL,
    `role` VARCHAR(50) NOT NULL DEFAULT 'Student',
    `status` VARCHAR(30) NOT NULL DEFAULT 'Active',
    `gender` VARCHAR(20) NULL DEFAULT '',
    `branch` VARCHAR(100) NULL DEFAULT 'Main Campus',
    `department` VARCHAR(150) NULL DEFAULT '',
    `grade_level` VARCHAR(50) NULL DEFAULT '',
    `grade_section` VARCHAR(100) NULL DEFAULT '',
    `strand` VARCHAR(100) NULL DEFAULT '',
    `avatar` LONGTEXT NULL,
    `permissions` JSON NULL,
    `totp_secret` VARCHAR(64) NULL,
    `totp_enabled` TINYINT(1) NOT NULL DEFAULT 0,
    `terms_accepted` TINYINT(1) NOT NULL DEFAULT 0,
    `terms_accepted_at` DATETIME NULL,
    `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
    `deleted_at` DATETIME NULL,
    `deleted_by` VARCHAR(50) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ------------------------------------------------------------------------------
-- Table: school_years
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `school_years` (
    `id` VARCHAR(64) NOT NULL PRIMARY KEY,
    `year_start` INT UNSIGNED NOT NULL,
    `year_end` INT UNSIGNED NOT NULL,
    `q1_start` VARCHAR(20) NULL,
    `q1_end` VARCHAR(20) NULL,
    `q2_start` VARCHAR(20) NULL,
    `q2_end` VARCHAR(20) NULL,
    `q3_start` VARCHAR(20) NULL,
    `q3_end` VARCHAR(20) NULL,
    `q4_start` VARCHAR(20) NULL,
    `q4_end` VARCHAR(20) NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'Inactive',
    `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
    `deleted_at` DATETIME NULL,
    `deleted_by` VARCHAR(50) NULL,
    `archived_at` VARCHAR(40) NULL,
    `gdrive_folder_id` VARCHAR(128) NULL,
    `gdrive_folder_url` VARCHAR(255) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_year_range` (`year_start`, `year_end`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- Table: sections
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sections` (
    `id` VARCHAR(64) NOT NULL PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `grade_level` VARCHAR(50) NOT NULL,
    `room` VARCHAR(50) NULL,
    `school_year` VARCHAR(50) NOT NULL,
    `start_time` VARCHAR(20) NULL,
    `end_time` VARCHAR(20) NULL,
    `days` VARCHAR(100) NULL,
    `schedule` VARCHAR(255) NULL,
    `daily_schedules` LONGTEXT NULL,
    `teacher` VARCHAR(100) NULL,
    `teacher_role` VARCHAR(50) NULL,
    `teachers` LONGTEXT NULL,
    `adviser` VARCHAR(100) NULL,
    `adviser_id` VARCHAR(50) NULL,
    `subject` VARCHAR(150) NULL,
    `subjects` LONGTEXT NULL,
    `students` LONGTEXT NULL,
    `students_count` INT UNSIGNED DEFAULT 0,
    `status` VARCHAR(30) DEFAULT 'Deployed',
    `is_deleted` TINYINT(1) DEFAULT 0,
    `deleted_at` DATETIME NULL,
    `deleted_by` VARCHAR(50) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_section_name` (`name`),
    INDEX `idx_section_school_year` (`school_year`),
    INDEX `idx_section_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- Table: subjects
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `subjects` (
    `id` VARCHAR(64) NOT NULL PRIMARY KEY,
    `code` VARCHAR(50) NOT NULL UNIQUE,
    `name` VARCHAR(150) NOT NULL,
    `units` VARCHAR(10) NULL,
    `grade_level` VARCHAR(10) NULL,
    `learning_hours` INT NULL,
    `curriculum_metadata` LONGTEXT NULL,
    `type` VARCHAR(50) NULL,
    `strand` VARCHAR(50) NULL,
    `weights` LONGTEXT NULL,
    `active_quarters` LONGTEXT NULL,
    `status` VARCHAR(30) DEFAULT 'Published',
    `topics` LONGTEXT NULL,
    `materials` LONGTEXT NULL,
    `is_deleted` TINYINT(1) DEFAULT 0,
    `deleted_at` DATETIME NULL,
    `deleted_by` VARCHAR(50) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_subject_code` (`code`),
    INDEX `idx_subject_name` (`name`),
    INDEX `idx_subject_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- Table: announcements
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `announcements` (
    `id` VARCHAR(128) NOT NULL PRIMARY KEY,
    `title` VARCHAR(255) NOT NULL,
    `content` TEXT NOT NULL,
    `author_id` VARCHAR(50) NOT NULL,
    `author_name` VARCHAR(120) NULL,
    `author_role` VARCHAR(50) NULL,
    `audience` VARCHAR(50) NOT NULL DEFAULT 'all',
    `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
    `deleted_at` DATETIME NULL,
    `deleted_by` VARCHAR(50) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_announcement_author` (`author_id`),
    FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- Table: audit_logs
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `audit_logs` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id` VARCHAR(50) NULL,
    `action` VARCHAR(255) NOT NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` VARCHAR(255) NULL,
    `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
    `deleted_at` DATETIME NULL,
    `deleted_by` VARCHAR(50) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- No automatic seed accounts or academic records. Provision a verified administrator separately.

-- ------------------------------------------------------------------------------
-- Table: quizzes (Quiz Library / Storage)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `quizzes` (
    `id` VARCHAR(64) NOT NULL PRIMARY KEY,
    `code` VARCHAR(50) NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'published',
    `author_id` VARCHAR(50) NULL,
    `author_name` VARCHAR(100) NULL,
    `author_role` VARCHAR(50) NULL,
    `questions` LONGTEXT NULL,
    `total_questions` INT UNSIGNED NOT NULL DEFAULT 0,
    `total_points` INT UNSIGNED NOT NULL DEFAULT 0,
    `time_limit` INT UNSIGNED NULL DEFAULT 0,
    `icon` VARCHAR(50) NULL,
    `color` VARCHAR(30) NULL,
    `is_ai` TINYINT(1) NOT NULL DEFAULT 0,
    `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
    `deleted_at` TIMESTAMP NULL DEFAULT NULL,
    `deleted_by` VARCHAR(50) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_quiz_code` (`code`),
    INDEX `idx_quiz_status` (`status`),
    INDEX `idx_quiz_author` (`author_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Immutable row numbers for management records; reservations survive deletion.
CREATE TABLE IF NOT EXISTS record_creation_counters (
    collection VARCHAR(64) NOT NULL PRIMARY KEY,
    next_number BIGINT UNSIGNED NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS record_creation_numbers (
    collection VARCHAR(64) NOT NULL,
    record_id VARCHAR(191) NOT NULL,
    creation_number BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY(collection,record_id),
    UNIQUE KEY unique_creation_number(collection,creation_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS school_announcements (
 id VARCHAR(100) NOT NULL PRIMARY KEY,
 author_id VARCHAR(50) NOT NULL,
 payload LONGTEXT NOT NULL,
 is_deleted TINYINT(1) NOT NULL DEFAULT 0,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 INDEX idx_announcement_author(author_id), INDEX idx_announcement_visible(is_deleted,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Persistent folder identity; advisory locks serialize each parent/name resolution.
CREATE TABLE IF NOT EXISTS gdrive_folder_registry (
 path_key CHAR(64) PRIMARY KEY,
 parent_id VARCHAR(128) NOT NULL,
 folder_name VARCHAR(180) NOT NULL,
 folder_id VARCHAR(128) NOT NULL,
 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE IF NOT EXISTS upload_submission_batches (
 user_id VARCHAR(64) NOT NULL,
 batch_id VARCHAR(64) NOT NULL,
 total_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(user_id,batch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
