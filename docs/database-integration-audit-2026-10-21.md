# Database integration audit — 21 October 2026

## Status and limits

This is an initial repository-wide persistence inventory and a tested foundation checkpoint, **not completion of the full website migration**. The following distinction is intentional: having a MySQL table or a `fetch` call does not prove that every UI action reads/writes it correctly. End-to-end sign-in with the owner's real authenticator and multi-account browser workflows have not been performed.

The original database had 18 tables and 64 total rows. Subjects, sections, school years, quizzes, and grade publications were empty. Existing accounts and AI records were present. The foundation adds login challenges and presence infrastructure; it does not seed academic records or import browser collections. After the changes, the database still has 64 rows across 20 tables. Counts are a point-in-time audit, not a permanent invariant once people sign in.

## Data protection and fake-data policy

- A private pre-change SQL backup was created under the Windows user's AppData `SIGMA-ELMS/private-backups` directory, outside the website/repository. It contains private account/service information and must not be published.
- Existing uncertain accounts and academic records are preserved. Three legacy identity IDs require review; they are **not** automatically classified as fake or deleted.
- No account, subject, section, quiz, attendance, submission, release, or notification fixtures were inserted into the application database for testing.
- Automatic browser account imports, AI-cache imports, static curriculum/attendance fixtures, sample AI transcripts, and demo announcement/notification loaders were disabled or removed.
- Explicit demo/seed/mock metadata and known fixture identifiers are rejected at existing structured record API boundaries by `php/includes/data_provenance.php`.
- Ordinary text such as “Sample programs,” a quiz's `sampleAnswer`, or a title such as “Arrays” is not evidence that a record is fake. Broad title/name-based purges were replaced with one shared browser provenance predicate.
- Automatic gradebook erasure and the old startup task-reset script were disabled. A missing migration flag is not a reason to delete scores or submissions.
- Missing authors and anonymous submissions are no longer assigned to fixed people. Unknown legacy ownership requires review.
- Readable legacy catalogue copies are retained locally for review before authoritative server hydration replaces them. They are not automatically published into MySQL.

## Shared code implemented

| Shared component | Responsibility |
| --- | --- |
| `js/database-client.js` | API URL resolution, token attachment restricted to this application's API path, JSON/error validation, catalogue save adapters, display identity, reviewed-data preservation, explicit synthetic-record checks, session revocation |
| `php/includes/application_auth.php` | Server token lookup, active-account checks, role gates, own-account security checks, safe public account fields |
| `php/includes/data_provenance.php` | Explicit fixture/provenance checks reused by catalogue, AI, recovery, and grade-write boundaries |
| Canonical HTML portals | The old PHP portal pages now redirect to the corresponding HTML portal, eliminating a second, stale UI implementation |
| Shared Drive service | One OAuth token provider for folder provisioning and uploads; encrypted credentials do not depend on a plaintext key file |
| Shared subject/section/year/user adapters | Admin and teacher callers use the same confirmed-response transport instead of duplicated silent `fetch` wrappers |

Validation is intentionally performed on both client and server; browser checks do not replace server enforcement.

## Feature-by-feature map

| Feature | Actual source/path found | Current status | Next required work |
| --- | --- | --- | --- |
| Login | `js/index.js`, `php/api/session.php`, `grade_sync.php`, `auth.php` | Database password check, five-minute challenge, server 2FA, final token required; hardcoded aliases/password bypass removed | Real-account browser flow; unify remaining server policy/rate-limit and reCAPTCHA enforcement |
| Password storage | `users.password`, `users.php` | All 14 legacy passwords converted to hashes and individually verified; new/reset passwords hashed | Review account provenance and default-password policy; never distribute passwords through cached user lists |
| Sessions/logout | `application_auth.php`, `tab-session.js`, database transport | Active database user required; role checked on portal entry; logout requests token revocation | Device-session management, password/status-change invalidation, timeout UX |
| Users and permissions | `users.php`, admin/profile/settings scripts | API requires an actual administrator; generated placeholder users/emails and bulk browser imports rejected | Fine-grained permission enforcement, self-profile API, transactional account actions, directory visibility per class |
| School years/quarters | `school_years.php`, admin year controls | Existing table/API; successful empty result is authoritative; create/save now waits for DB success | Confirm archive/activate/restore flows and relationship constraints across years |
| Sections/enrolments | `sections.php`, sections panel, teacher pickers | Existing JSON-backed table/API; authenticated staff gate; shared save transport | Normalize year-scoped enrolments and teacher/subject assignments; enforce assignment ACLs and concurrent edits |
| Subjects | `subjects.php`, shared subject editor | Existing table/API; shared save available in admin and teacher; no static fixture catalogue | Enforce teacher ownership and class scope; move catalogue load/hydration into a single lifecycle for all roles |
| Topics/materials/order | Subject JSON plus `sigma_custom_materials_*`, `sigma_classroom_materials` and browser editor state | Partial subject persistence; split storage paths remain | Canonical topic/material IDs, author scope, order revisions, reviewed legacy reconciliation |
| File metadata/templates | `upload.php`, `gdrive_service.php`, material editors | Missing helper import and broken folder-path resolver fixed; upload actions require a verified identity | Database file registry, ownership, MIME/size checks across callers, complete upload-to-record linking, private download access |
| Release/visibility/schedules | `curriculum-release.js`, `release-workspace.js`, `sigma_*_release_*` | Primarily browser state; UI already shared | Year/section/subject-scoped release tables, assigned-student rows, server scheduling, consistent student reads |
| Quiz library | `quiz_library.php`, shared quiz storage | Existing table/API; staff token required; server owns quiz author identity and teacher edit/delete ownership | Authoritative async saves, scoped distribution, versioning, independent student-safe quiz delivery |
| Quiz answers/attempts/timers | Shared quiz engine, `sigma_attempts_*`, submission stores | Browser-owned attempt/evaluation paths remain | Server attempt IDs, deadlines, atomic submissions, idempotency, grading on server, no answer keys in student payloads |
| Assignment submissions/files | Shared assessments, `sigma_sub_*`, `sigma_student_assessment_submissions` | Browser-owned | Student-owned submission API, safe files, canonical assessment identity, server timestamps, revision/late rules |
| Assessment comments/replies | `private-assessment-comments.js`, shared assessment comments | Browser-owned | Per-submission ACLs, author-owned edits, persistent threads and notifications |
| Manual grading/review | Shared assessment review, offline assessments, gradebook score keys | Most evidence/drafts are local | Authoritative teacher grading API with assignment checks, optimistic revisions, audit trail, protected student reads |
| Published/shared grades | `grade_sync.php`, `grade_publications` | Existing token-protected publication store; final sign-in requires recorded terms/2FA; no publications currently | Reconcile authoritative evidence and calculations; prove teacher/adviser/student scope across years |
| Attendance | Teacher attendance stores, classroom room, admin reports | Browser-owned evidence; invented report classes removed | Date/class/student keyed attendance API, authorized recording/edit history, aggregate/export reads |
| Announcements | `announcements.js`, `sigma_announcements_feed_v3`; a DB table exists | No complete announcement CRUD API; a table alone is not integration | Posts/audiences/attachments/comments/reactions with ownership, revisions, soft deletion |
| Academic calendar | `academic-calendar.js`, announcement `academicEvent` objects | Derived from browser announcement data | Persist event fields tied to posts; serve permitted audiences and school-year/date ranges |
| Personal calendar | `calendar.js`, custom calendar browser keys | Browser-owned | Owner-scoped custom events and reminders, timezone rules |
| Notifications | `notifications.js`, per-role browser keys | Browser-owned delivery/read state; demo loaders removed | Per-recipient rows, read/dismiss state, deduplicated server event generation |
| Authentication/activity/audit logs | Browser authentication/activity stores and DB lifecycle events | Mixed; real lifecycle actor now comes from server tokens | Record actions in server transactions; paginated scoped reads; do not accept browser-invented audit events as authoritative |
| AI logs/cards | `ai_records.php`, AI tables, AI database store | Existing DB persistence; verified actors; automatic legacy imports removed | Complete remote ACLs, durable generation provenance, retries, server-sourced evidence, scheduler |
| AI conversations/history | `sigma-conversations.js`, chat client, AI result readers | Conversation state mainly local; model endpoints and logs exist | Owner-scoped conversation/message API, retention, server-linked model records, stable thread IDs |
| Online Now | `presence.php`, `application_presence`, `online-presence.js` | Moved to authenticated database heartbeats; admin-only online list, deduped sessions and server clock | Multi-account/device acceptance check, lifecycle/retention monitoring |
| Account settings/profile/avatar | Profile/settings modules and role/user browser keys | Mixed; user management is DB-backed, self-profile persistence incomplete | Own-account update endpoint, DB avatar/file metadata, immutable identity and server validation |
| Notification/AI language preferences | Settings browser keys | Browser-owned | Typed per-user settings API; keep actual interface language separate from AI preference |
| Institution branding/slideshow/welcome | Branding and slideshow modules | Mostly browser-owned | Admin-only typed settings with versioned asset references; public-safe reads |
| Maintenance/security settings | Settings/history browser records, some server service settings | Mixed | Server-enforced policy and versions; changing a local flag must not authorize access |
| Service credentials | Encrypted service settings and service-vault endpoints | Existing encrypted DB storage | Normal-session identity is required locally and existing step-up flow is retained remotely; complete remaining deployment policy/permission checks |
| Dashboards/search | Admin/teacher/student dashboard, search modules | Mostly derived from cached evidence | Read server aggregates/search with permitted scope; empty state when authoritative data is empty |
| Reports/Excel/PDF exports | Performance, insight, grade record and export modules | Derived output; many inputs remain local | Snapshot from authorized server evidence, consistent version/year scope, no fabricated totals |
| Record recovery/deletion | Lifecycle API plus browser submission-file recovery | Mixed; actor spoofing removed for DB recovery | Extend to new domain tables, relation-aware soft delete/restore, server file recovery, preserve tombstones |
| Backup/recovery | `backup.php`, snapshot directory | Actual administrator token now required | Private backup location/access, restore validation and integrity/restore rehearsal |
| Legal/static pages | Terms/privacy, icons/layout, navigation | Static presentation normally needs no DB | Store acceptance version/time per user; keep layout, transient selections, open panels and browser drafts local |

## Required migration order

1. **Finish the identity/catalogue contract.** Real-account sign-in/2FA acceptance; role/permission rules; self-profile access; school years; canonical section, subject and user IDs; teacher assignments and student enrolments. Every save must await confirmation before showing success. Several old callers still fire-and-forget a now-validated adapter and must be converted.
2. **Curriculum and release.** Persist topics, materials, files, order, section releases, schedules and assigned students. Reference canonical IDs and year scope. Do not copy arbitrary `sigma_*` keys into a catch-all table or merge records by title alone.
3. **Academic evidence.** Attempts, submissions, deadlines, attendance, review/grading, grade publications and comments. Enforce teacher/student ownership on the server and test concurrent edits and retries. Students must not receive answer keys or unpublished grades.
4. **Communication and settings.** Announcements/events, conversations, server notifications, read state, per-user preferences, branding and maintenance settings.
5. **Derived features and deployment.** Search, dashboards, analytics evidence, reports/exports, retention/recovery, backup restore and multi-device acceptance. Keep static UI state local.

Each feature needs: table/ID contract → server validation and ACLs → shared client adapter → every write path → authoritative load/empty state → refresh/second-account/concurrency/failure tests. No feature should be marked complete just because its table has been created.

## Verification performed

- JavaScript syntax checks and PHP lint run across the application source; final results recorded with this checkpoint.
- Provenance checks use memory-only fixtures; uncertain titles and educational sample-answer text are preserved.
- Shared transport checks cover local endpoint resolution, error/JSON handling, no tokens on external URLs, display identity matching, no network import when preserving a legacy cache, and explicit synthetic-record rules.
- Clean installation schema executed in an isolated temporary database with **zero inserted rows**, then that temporary database was removed. The application database was not used for fixture insertion.
- Unauthorized HTTP requests checked against catalogue/session/grade/security endpoints; expected `401` responses, including 2FA setup without a password-verified challenge.
- The real localhost Apache route points to this workspace via its XAMPP junction and returns JSON `401` for an unauthenticated session request.
- All 14 password conversions verified against the original value in memory; a repeat dry run reports zero legacy plaintext passwords.
- Read-only metadata/provenance inventory is in `database-metadata-audit-2026-10-21.json`. A source/storage reference inventory is in `database-source-inventory-2026-10-21.json`.
- No successful real-user browser login, authenticator setup, Drive upload, paid AI call, remote deployment, or multi-user acceptance test is claimed by this checkpoint.

## Next concrete step

Complete the canonical user/year/section/subject catalogue and permission contract before migrating releases or submissions. The empty academic database and the old browser records must be reconciled through an explicit review workflow, not an automatic import. The current changes are not a claim that every website feature is database-backed or production-ready.
