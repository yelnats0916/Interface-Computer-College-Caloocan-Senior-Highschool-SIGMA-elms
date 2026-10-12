# Interface Computer College Caloocan Senior High School - SIGMA ELMS

**SIGMA ELMS** (Electronic Learning Management System) is an educational platform developed for Interface Computer College Caloocan Senior High School.

## 🚀 Features
- **Student Dashboard:** View courses, take quizzes, submit assignments, and track learning progress.
- **Teacher Dashboard:** Course management, lesson notes, quiz creation, and student performance tracking.
- **Admin Management:** User management, school announcements, and system configuration.
- **Interactive Quiz Creator & Viewer:** Automated grading and real-time review.

## 🛠️ Tech Stack
- **Frontend:** HTML5, CSS3 / Tailwind CSS, JavaScript
- **Backend:** PHP (PDO MySQL connection)
- **Database:** MySQL / MariaDB (supports local XAMPP and cloud deployment)

## ⚙️ Setup & Installation
1. Clone or download this repository.
2. Place the project inside your web server directory (e.g. `xampp/htdocs/sigma-elms`).
3. Import `database/schema.sql` into your MySQL database (`sigma_elms_db`).
4. Copy `config/database.php.example` to `config/database.php` and configure your credentials if needed.
5. Open your browser and navigate to `http://localhost/sigma-elms`.

## Record Deletion And AI Storage

- Run `php scripts/migrate-record-lifecycle.php` after database setup. It adds `is_deleted`, `deleted_at`, and `deleted_by` to existing application tables, and creates the AI log, insight-card, analytics-state, and deletion-event tables. It never deletes existing records. Internal service settings, authorization sessions, and login-attempt tables are not user-deletable records.
- Application deletion is soft deletion. **Admin > System Settings > Record Recovery** is a full page with a record-type selector for restoring or permanently deleting removed accounts, school years, sections, subjects, quizzes, AI cards, and AI logs. Permanent deletion requires the exact record-ID confirmation and is blocked for protected accounts and detected school relationships. Restore does not restore related records automatically.
- The AI interaction menu separates **Remove Card** (hide the linked dashboard card, retaining its log and evidence fingerprints) from **Delete Log** (soft-delete only the log). Original generation status is unchanged. Removing/restoring records never calls an AI provider. Purged AI identifiers remain tombstoned so browser imports cannot resurrect them.
- AI cards, logs, and processed-evidence tracking now persist in MySQL. Existing real browser records are imported on opening the appropriate portal. Local storage remains a compatibility/retry cache, not the authoritative insight store. A new device loads existing database cards rather than regenerating their text.
- AI record access currently supports local development accounts only. Local actor IDs are testing identities, not production authentication. Connect server-verified user sessions before exposing these endpoints remotely. This migration does not implement the server-side daily analytics scheduler or move academic evidence collectors out of browser storage.

## Service Credential Setup

- Run `php scripts/migrate-service-secrets.php` once after database setup. Existing service configuration is preserved and encrypted before plaintext website files are cleared.
- Gemini, Groq, reCAPTCHA secrets, and Google Drive service-account private keys are stored in the encrypted `system_service_settings` database row. Public reCAPTCHA site keys remain browser-visible by design.
- Localhost credential management does not require administrator verification while the application is being structured and tested. Both the request address and server hostname must be local. Non-local access still requires database-verified administrator credentials and an authenticator code when enabled. Saved service secrets are never returned for editing; input validation remains active in both modes.
- Production requires HTTPS and `SIGMA_SECRETS_MASTER_KEY`, a base64-encoded random 32-byte encryption key supplied through protected server configuration. Never commit it or store it beside the encrypted database credentials.
- Local Windows development uses a key file under the Windows account's AppData directory, outside the website. Back up this file privately with the database; losing it prevents decryption. The database contains only its location, not the master key.
- Rotate any API keys previously exposed in screenshots, chat, source history, or browser storage. Encryption does not undo an earlier leak.
