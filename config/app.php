<?php
/**
 * SIGMA ELMS - Global Application Configuration
 * Interface Computer College - Caloocan Senior High School
 */

// Application & School Branding
define('APP_NAME', 'SIGMA ELMS');
define('SCHOOL_NAME', 'Interface Computer College');
define('SCHOOL_BRANCH', 'Caloocan Senior High School');
define('SCHOOL_SUBTITLE', 'Caloocan Senior High School SIGMA ELMS');
define('CURRENT_SCHOOL_YEAR', 'SY 2026-2027');

// Base Paths & Asset URLs
if (!defined('BASE_URL')) {
    $scriptDir = dirname($_SERVER['SCRIPT_NAME'] ?? '');
    if (basename($scriptDir) === 'php') {
        $base = dirname($scriptDir);
    } else {
        $base = $scriptDir;
    }
    $base = rtrim(str_replace('\\', '/', $base), '/') . '/';
    define('BASE_URL', $base ?: '/');
}
define('LOGO_PATH', 'image/ICC logo.jpg');
define('DEFAULT_AVATAR', 'image/default_avatar.png');

// User Roles
define('ROLE_ADMIN', 'admin');
define('ROLE_TEACHER', 'teacher');
define('ROLE_STUDENT', 'student');

// Grade Levels & Semesters
define('GRADE_LEVELS', ['Grade 11', 'Grade 12']);
define('SEMESTERS', ['1st Semester', '2nd Semester', 'Summer']);

// Safe Session Initialization
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
