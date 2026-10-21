# Google Drive upload coverage audit

Date: 20 October 2026. Read-only review of website sources; no Google Drive requests, uploads, folder creation, configuration changes, or database changes were performed.

## Result

**Automatic Drive folder creation and upload are not connected across the website.** Existing upload and folder PHP helpers are partial scaffolding. Most frontend upload controls retain data URLs or file metadata in browser state/storage instead of posting files to the central upload API.

## Upload surface inventory

| Surface | Current source path | Drive coverage |
| --- | --- | --- |
| Admin subject/topic images, lesson documents, videos, task attachments and rubrics | `js/subject-editor.js` | Browser file readers/data URLs; no central Drive upload call found. |
| Teacher materials, videos, assessments and rubrics | `js/teacher.js`, `js/curriculum-release.js` | Browser readers and draft/section storage; no central Drive upload call found. |
| Student assessment/submission attachments | `js/shared-components.js` | File/data URL processing and submission state; no central Drive upload call found. |
| Shared Resources upload | `js/resources-view.js` | Actual file contents now saved in browser storage; not uploaded to Drive. |
| Announcement images/videos | `js/announcements.js` | Browser readers; no central Drive upload call found. |
| Account profile pictures | `js/profile-view.js` and profile synchronization helpers | Browser-side profile image handling; no central Drive upload call found. |
| School/profile/logo images | `js/admin.js` | Browser file readers; not routed to Drive as academic uploads. |
| Login slides and welcome banners | `js/slideshow-settings.js`, `js/welcome-banner-settings.js` | Browser settings/image persistence; no central Drive upload call found. |
| Quiz question/general images | `js/quiz-creator.js` | Browser readers/data URLs; no central Drive upload call found. |
| Quiz import and AI source files | `quiz-creator.html`, `js/quiz-creator.js`, quiz AI/import handlers | Imports/AI processing are separate from archiving; no automatic contextual Drive archive found. |
| Grade/attendance Excel and other report downloads | `js/excel-export.js`, teacher/admin export handlers | Downloaded to the user's device; no automatic Drive archive found. |
| Drive service-account JSON | Admin Drive settings | Calls `upload.php` with `action=upload_key` for credential configuration. This is not an academic file upload and must not be put into a general Drive upload folder. |

YouTube and externally hosted links are references, not uploaded files. They do not need to create a Drive file merely because the website displays the link.

## Existing folder scaffolding

- `php/api/school_years.php` invokes `provisionSchoolYearFolders()` when creating a school year.
- `php/includes/gdrive_service.php` contains folder lookup/creation helpers, campus/year/category templates and teacher/student name formatters.
- `php/api/upload.php` accepts a `folder_path` or a category, saves a server-side file, and attempts a Drive copy.
- No frontend code was found that sends a contextual `folder_path` for the site's actual upload forms. The frontend calls found for `upload.php` are the admin Drive connection/configuration/credential functions.

## Concrete defects found

1. **Broken lazy path resolver:** `resolveGdriveFolderPath()` refers to `$folder['id']` without assigning `$folder` or calling `findOrCreateGdriveFolder()` inside its loop. It cannot create the intended parent/child chain.
2. **Missing helper import:** `upload.php` calls `resolveGdriveFolderPath()` but does not directly import `gdrive_service.php`; the directly imported vault/auth helpers do not define that resolver. That contextual route is incomplete.
3. **Mixed configuration sources:** the Drive upload/provisioning code reads its folder configuration and checks service-account fields from `config/services.php`, whereas token helpers read the encrypted settings through `loadServiceSettings()`. These paths are inconsistent after the credential-vault migration.
4. **Obsolete credential-file gate:** the final upload attempt requires `config/google_service_account.json` to exist even though credentials are now loaded from the encrypted settings store. A configured vault does not guarantee that legacy file exists.
5. **Hardcoded school structure:** school-year provisioning precreates a fixed subject list and only the first two quarters in parts of its tree. It is not derived from the actual configured subjects, sections, four-quarter assignments or upload owner.
6. **No guaranteed Drive success:** the API may return top-level `success:true` for a server-local save while `google_drive.synced` is false. A caller must distinguish those states rather than report that the file reached Drive.
7. **Missing frontend upload routing:** the academic/profile/announcement upload handlers do not use a single shared uploader, so folder provisioning cannot be triggered consistently.

## Work remaining, not applied

- Define folder placement for every supported file purpose and exclusions for secrets, imports used only temporarily, and generated downloads.
- Connect a shared frontend upload interface to authorized server upload handling.
- Repair the lazy folder resolver and use one protected settings source.
- Resolve campus, school year, section, subject, quarter, uploader and assessment context from authorized records; do not trust arbitrary browser paths as authorization.
- Store returned Drive file/folder IDs and links against their owning records.
- Verify retries, duplicate prevention, permissions, size limits and explicit upload failure states.
- Run a real upload/folder-creation test only after backend setup and authorization.

**This audit does not authorize or start database implementation.**
