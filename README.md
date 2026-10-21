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

### Database integration checkpoint (21 October 2026)

- Run `php scripts/migrate-application-sessions.php` after installing the schema. This creates session/challenge/presence infrastructure without inserting accounts or academic records.
- Existing databases can run `php scripts/migrate-account-passwords.php` to inspect legacy password storage, then `php scripts/migrate-account-passwords.php --apply` after making a private backup. Existing password values are retained as login credentials; storage is converted to password hashes.
- There are no built-in login accounts or browser-only login bypasses. A new, empty installation requires an explicitly supplied administrator identity using `scripts/bootstrap-admin.php`; supply its documented `SIGMA_BOOTSTRAP_*` environment variables privately. The script refuses to create another installation administrator when one already exists.
- Login uses database credentials and server 2FA. Portal sessions and Online Now use verified server tokens. PHP portal entry points redirect to the canonical HTML portals so there is one current UI implementation.
- Browser user lists, old AI caches, and fixture catalogues are **not automatically imported**. Uncertain device records are retained under `sigma-database-review:*` for review; that prefix is never sent to an API.
- The website is **not fully migrated**. The feature-by-feature status and required migration order are in [the database audit](docs/database-integration-audit-2026-10-21.md). Release settings, submissions, attendance, events, notifications, conversations, preferences, and several report inputs still require server persistence. Do not treat browser state as authoritative school records.
- `php scripts/audit-persistence.php` produces a read-only metadata/provenance report without printing credentials or record contents.

## Record Deletion And AI Storage

- Run `php scripts/migrate-record-lifecycle.php` after database setup. It adds `is_deleted`, `deleted_at`, and `deleted_by` to existing application tables, and creates the AI log, insight-card, analytics-state, and deletion-event tables. It never deletes existing records. Internal service settings, authorization sessions, and login-attempt tables are not user-deletable records.
- Application deletion is soft deletion. **Admin > System Settings > Record Recovery** is a full page with a record-type selector for restoring or permanently deleting removed accounts, school years, sections, subjects, quizzes, AI cards, and AI logs. Permanent deletion requires the exact record-ID confirmation and is blocked for protected accounts and detected school relationships. Restore does not restore related records automatically.
- The AI interaction menu separates **Remove Card** (hide the linked dashboard card, retaining its log and evidence fingerprints) from **Delete Log** (soft-delete only the log). Original generation status is unchanged. Removing/restoring records never calls an AI provider. Purged AI identifiers remain tombstoned so browser imports cannot resurrect them.
- AI cards, logs, and processed-evidence tracking have MySQL persistence. Automatic imports of unreviewed browser records are disabled. Local storage remains a compatibility/retry cache, not proof that a record is an authentic database record.
- AI record/recovery actor IDs now come from verified server tokens rather than `X-Sigma-Actor` or a localhost administrator fallback. Remote AI access, server-side scheduling, and academic evidence collection still require the remaining authorization and persistence work in the audit.

## Service Credential Setup

- Run `php scripts/migrate-service-secrets.php` once after database setup. Existing service configuration is preserved and encrypted before plaintext website files are cleared.
- Gemini, Groq, reCAPTCHA secrets, and Google Drive service-account private keys are stored in the encrypted `system_service_settings` database row. Public reCAPTCHA site keys remain browser-visible by design.
- Localhost credential management requires a signed-in database administrator with service-settings permission. Non-local access also requires the existing administrator credential-vault verification. Saved service secrets are never returned for editing; input validation remains active in both modes.
- Production requires HTTPS and `SIGMA_SECRETS_MASTER_KEY`, a base64-encoded random 32-byte encryption key supplied through protected server configuration. Never commit it or store it beside the encrypted database credentials.
- Local Windows development uses a key file under the Windows account's AppData directory, outside the website. Back up this file privately with the database; losing it prevents decryption. The database contains only its location, not the master key.
- Rotate any API keys previously exposed in screenshots, chat, source history, or browser storage. Encryption does not undo an earlier leak.
