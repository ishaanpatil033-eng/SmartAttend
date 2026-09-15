-- ===================================================================
-- SmartAttend — Production Database Schema DDL Initialization
-- Mount location: /docker-entrypoint-initdb.d/01-init-schema.sql
-- Compatible with Hibernate 6 / Spring Boot 3 validate mode
-- ===================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. User Accounts
CREATE TABLE IF NOT EXISTS `user_accounts` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` VARCHAR(30) NOT NULL,
  `student_id` VARCHAR(50) DEFAULT NULL,
  `full_name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `enabled` BIT(1) NOT NULL,
  `created_at` DATETIME(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ua_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2. Students Directory
CREATE TABLE IF NOT EXISTS `students` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `student_id` VARCHAR(50) NOT NULL,
  `student_name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `academic_year` VARCHAR(20) DEFAULT 'FE',
  `semester` INT DEFAULT 1,
  `branch` VARCHAR(100) DEFAULT 'Computer Science',
  `division` VARCHAR(10) DEFAULT 'A',
  `batch` VARCHAR(20) DEFAULT 'A1',
  `active` BIT(1) DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_st_student_id` (`student_id`),
  UNIQUE KEY `uk_st_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3. Institutional Courses
CREATE TABLE IF NOT EXISTS `courses` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `course_id` VARCHAR(50) NOT NULL,
  `course_name` VARCHAR(100) NOT NULL,
  `branch` VARCHAR(100) DEFAULT 'Computer Science',
  `division` VARCHAR(10) DEFAULT 'A',
  `batch` VARCHAR(20) DEFAULT 'A1',
  `academic_year` VARCHAR(20) DEFAULT 'FE',
  `semester` INT DEFAULT 1,
  `course_type` VARCHAR(20) DEFAULT 'THEORY',
  `assigned_faculty_id` VARCHAR(50) DEFAULT NULL,
  `assigned_faculty_name` VARCHAR(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_co_course_id` (`course_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 4. Lecture & Lab Practical Sessions
CREATE TABLE IF NOT EXISTS `lecture_sessions` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `session_code` VARCHAR(100) NOT NULL,
  `course_id` VARCHAR(50) NOT NULL,
  `course_name` VARCHAR(100) NOT NULL,
  `lecture_type` VARCHAR(20) NOT NULL DEFAULT 'THEORY',
  `academic_year` VARCHAR(20) DEFAULT 'FE',
  `division` VARCHAR(10) DEFAULT 'A',
  `batch` VARCHAR(20) DEFAULT 'ALL',
  `session_date` DATE NOT NULL,
  `session_time` VARCHAR(50) NOT NULL DEFAULT '10:00 AM',
  `faculty_id` VARCHAR(50) DEFAULT NULL,
  `faculty_name` VARCHAR(100) DEFAULT NULL,
  `active` BIT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ls_session_code` (`session_code`),
  KEY `idx_ls_session_code` (`session_code`),
  KEY `idx_ls_course_id` (`course_id`),
  KEY `idx_ls_faculty_id` (`faculty_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 5. Attendance Records
CREATE TABLE IF NOT EXISTS `attendance` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `student_id` BIGINT NOT NULL,
  `course_id` BIGINT NOT NULL,
  `session_code` VARCHAR(100) DEFAULT NULL,
  `attendance_date` DATE NOT NULL,
  `attendance_time` TIME(6) NOT NULL,
  `attendance_status` VARCHAR(20) NOT NULL,
  `moodle_synced` BIT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_student_session` (`student_id`, `session_code`),
  KEY `idx_att_course_id` (`course_id`),
  KEY `idx_att_student_id` (`student_id`),
  CONSTRAINT `fk_att_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`),
  CONSTRAINT `fk_att_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 6. Dynamic QR Tokens (5-Second Expiry)
CREATE TABLE IF NOT EXISTS `attendance_qr_tokens` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `token` VARCHAR(100) NOT NULL,
  `course_id` VARCHAR(50) NOT NULL,
  `session_code` VARCHAR(100) DEFAULT NULL,
  `consumed` BIT(1) NOT NULL DEFAULT 0,
  `consumed_at` DATETIME(6) DEFAULT NULL,
  `consumed_by_student_id` VARCHAR(50) DEFAULT NULL,
  `created_at` DATETIME(6) NOT NULL,
  `expires_at` DATETIME(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_aqt_token` (`token`),
  KEY `idx_qr_token` (`token`),
  KEY `idx_qr_course_id` (`course_id`),
  KEY `idx_qr_session_code` (`session_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 7. Device Attendance Bindings (Anti-Proxy)
CREATE TABLE IF NOT EXISTS `device_attendance_bindings` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `session_code` VARCHAR(100) NOT NULL,
  `device_fingerprint` VARCHAR(128) NOT NULL,
  `student_id` VARCHAR(50) NOT NULL,
  `bound_at` DATETIME(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_session_device` (`session_code`, `device_fingerprint`),
  UNIQUE KEY `uk_session_student` (`session_code`, `student_id`),
  KEY `idx_binding_session` (`session_code`),
  KEY `idx_binding_device` (`device_fingerprint`),
  KEY `idx_binding_student` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 8. Course Assignments
CREATE TABLE IF NOT EXISTS `course_assignments` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `course_id` VARCHAR(50) NOT NULL,
  `title` VARCHAR(150) NOT NULL,
  `description` VARCHAR(1000) DEFAULT NULL,
  `due_date` VARCHAR(50) DEFAULT NULL,
  `max_marks` INT DEFAULT 100,
  `created_by_faculty_id` VARCHAR(50) DEFAULT NULL,
  `file_url` VARCHAR(500) DEFAULT NULL,
  `file_name` VARCHAR(255) DEFAULT NULL,
  `activity_type` VARCHAR(50) DEFAULT 'ASSIGNMENT',
  `created_at` DATETIME(6) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 9. Assignment Submissions
CREATE TABLE IF NOT EXISTS `assignment_submissions` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `assignment_id` BIGINT NOT NULL,
  `course_id` VARCHAR(50) NOT NULL,
  `student_id` VARCHAR(50) NOT NULL,
  `student_name` VARCHAR(100) DEFAULT NULL,
  `submission_content` VARCHAR(2000) NOT NULL,
  `submitted_at` DATETIME(6) DEFAULT NULL,
  `status` VARCHAR(50) DEFAULT 'SUBMITTED',
  `grade` VARCHAR(50) DEFAULT 'Pending',
  `file_name` VARCHAR(255) DEFAULT NULL,
  `file_url` VARCHAR(500) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 10. Course Academic Resources & Lab Experiments
CREATE TABLE IF NOT EXISTS `course_resources` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `course_id` VARCHAR(50) NOT NULL,
  `title` VARCHAR(150) NOT NULL,
  `description` VARCHAR(500) DEFAULT NULL,
  `resource_type` VARCHAR(50) NOT NULL DEFAULT 'DOCUMENT',
  `content_or_url` VARCHAR(1000) DEFAULT NULL,
  `uploaded_by_faculty_id` VARCHAR(50) DEFAULT NULL,
  `experiment_number` VARCHAR(50) DEFAULT NULL,
  `file_name` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME(6) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 11. Course & Institutional Announcements
CREATE TABLE IF NOT EXISTS `course_announcements` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `course_id` VARCHAR(50) NOT NULL,
  `title` VARCHAR(150) NOT NULL,
  `content` VARCHAR(2000) NOT NULL,
  `author_name` VARCHAR(100) DEFAULT NULL,
  `author_role` VARCHAR(50) DEFAULT 'FACULTY',
  `target_division` VARCHAR(10) DEFAULT NULL,
  `target_batch` VARCHAR(20) DEFAULT NULL,
  `attachment_url` VARCHAR(500) DEFAULT NULL,
  `created_at` DATETIME(6) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 12. Security Audit Logs
CREATE TABLE IF NOT EXISTS `security_audit_logs` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `event_type` VARCHAR(50) NOT NULL,
  `username` VARCHAR(50) DEFAULT NULL,
  `student_id` VARCHAR(50) DEFAULT NULL,
  `client_ip` VARCHAR(50) DEFAULT NULL,
  `user_agent` VARCHAR(255) DEFAULT NULL,
  `course_id` VARCHAR(50) DEFAULT NULL,
  `session_code` VARCHAR(100) DEFAULT NULL,
  `details` VARCHAR(500) DEFAULT NULL,
  `timestamp` DATETIME(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_audit_event_type` (`event_type`),
  KEY `idx_audit_username` (`username`),
  KEY `idx_audit_timestamp` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SET FOREIGN_KEY_CHECKS = 1;
