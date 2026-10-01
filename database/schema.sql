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
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `school_id` VARCHAR(50) NOT NULL UNIQUE,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(100) NOT NULL UNIQUE,
    `password` VARCHAR(255) NOT NULL,
    `role` ENUM('admin', 'teacher', 'student') NOT NULL DEFAULT 'student',
    `grade_level` VARCHAR(20) NULL,
    `status` ENUM('active', 'inactive', 'pending') NOT NULL DEFAULT 'active',
    `avatar` VARCHAR(255) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- Table: school_years
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `school_years` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `year_label` VARCHAR(50) NOT NULL UNIQUE, -- e.g. "SY 2026-2027"
    `is_active` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- Table: sections
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sections` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(50) NOT NULL,
    `grade_level` VARCHAR(20) NOT NULL,
    `room` VARCHAR(20) NULL,
    `school_year` VARCHAR(50) NOT NULL,
    `adviser_id` INT UNSIGNED NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`adviser_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- Table: subjects
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `subjects` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `code` VARCHAR(30) NOT NULL UNIQUE,
    `title` VARCHAR(100) NOT NULL,
    `grade_level` VARCHAR(20) NOT NULL,
    `semester` VARCHAR(30) NOT NULL,
    `cover_image` VARCHAR(255) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- Table: announcements
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `announcements` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `title` VARCHAR(150) NOT NULL,
    `content` TEXT NOT NULL,
    `author_id` INT UNSIGNED NOT NULL,
    `target_role` ENUM('all', 'teacher', 'student') NOT NULL DEFAULT 'all',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- Table: audit_logs
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `audit_logs` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT UNSIGNED NULL,
    `action` VARCHAR(255) NOT NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` VARCHAR(255) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- Initial Seed Accounts (Password: Password123 for all test accounts)
-- Note: '$2y$10$w8T.7eFv4M2a.3iO9l9hPeJk.q3NfQG1p9tJq2O7q1z6W4w8r7i7q' is 'Password123'
-- ------------------------------------------------------------------------------
INSERT INTO `school_years` (`year_label`, `is_active`) VALUES
('SY 2026-2027', 1)
ON DUPLICATE KEY UPDATE `is_active` = 1;

INSERT INTO `users` (`school_id`, `name`, `email`, `password`, `role`, `grade_level`, `status`) VALUES
('ADMIN-001', 'System Administrator', 'admin@interface.edu.ph', '$2y$10$eA0nS3KjG9KkFjL0Z8fOu.91.B.O4u5yQfO5gJ8jZ7J3n1z2n3n4.', 'admin', NULL, 'active'),
('TCH-1001', 'Prof. Maria Santos', 'teacher@interface.edu.ph', '$2y$10$eA0nS3KjG9KkFjL0Z8fOu.91.B.O4u5yQfO5gJ8jZ7J3n1z2n3n4.', 'teacher', NULL, 'active'),
('STU-2026-001', 'Stanley Tan', 'student@interface.edu.ph', '$2y$10$eA0nS3KjG9KkFjL0Z8fOu.91.B.O4u5yQfO5gJ8jZ7J3n1z2n3n4.', 'student', 'Grade 12', 'active')
ON DUPLICATE KEY UPDATE `status` = 'active';

-- ------------------------------------------------------------------------------
-- Table: quizzes (Quiz Library / Storage)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `quizzes` (
    `id`              VARCHAR(36)  NOT NULL PRIMARY KEY,  -- UUID v4 (or JS timestamp ID)
    `title`           VARCHAR(255) NOT NULL,
    `description`     TEXT         NULL,
    `status`          ENUM('draft','published') NOT NULL DEFAULT 'draft',
    `author_id`       INT UNSIGNED NOT NULL,
    `author_name`     VARCHAR(100) NULL,
    `author_role`     VARCHAR(50)  NULL,
    `questions`       JSON         NULL,                  -- Full question array
    `total_questions` INT UNSIGNED NOT NULL DEFAULT 0,
    `total_points`    INT UNSIGNED NOT NULL DEFAULT 0,
    `icon`            VARCHAR(50)  NULL,
    `color`           VARCHAR(20)  NULL,
    `is_ai`           TINYINT(1)   NOT NULL DEFAULT 0,
    `code`            VARCHAR(20)  NULL,                  -- e.g. #QZ-0042
    `created_at`      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    `updated_at`      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at`      TIMESTAMP    NULL DEFAULT NULL,
    FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
