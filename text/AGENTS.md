# SIGMA ELMS - Core Development Guidelines & Architectural Rules

## 1. No Duplicated Code (Clean Code Enforcement)
- Always remove and delete obsolete, duplicate, or redundant code across HTML, CSS, and JS files.
- When migrating from static mockup HTML to dynamic templates or shared logic, delete the old hardcoded markup and duplicate event listeners immediately.

## 2. Shared Component Unification (DRY Principle)
- If the 3 main portals (`admin.html`, `teacher.html`, `student.html`) share common components or UI behaviors (e.g., SIGMA Analytics, Metric Rails, Notification Center, Topbars, Modals):
  - Combine them into a single, unified reusable module.
  - Keep shared styles in a dedicated CSS file (e.g., `css/pocket-card.css`).
  - Keep shared behavior and templates in a dedicated JS file (e.g., `js/pocket-card.js`).

## 3. Dedicated Files for New Features
- Create dedicated new files (HTML, CSS, JS, PHP) for new features instead of bloating existing monolith files.
- Ensure all new modules are self-contained, data-driven, and follow live-ready template architecture with built-in empty/zero-state fallbacks.

## 4. Strict File & Folder Organization
- Keep all project assets, scripts, styles, backend logic, and documents neatly organized in their designated directories:
  - `css/` for stylesheets.
  - `js/` for client-side JavaScript controllers and template engines.
  - `php/` for server-side API endpoints and handlers.
  - `database/` for SQL schemas and migrations.
  - `image/` for static images, graphics, and icons.
  - `text/` for documentation, rules, references, and external files.
- Do not clutter the project root with loose documentation or misplaced asset files.

## 5. Senior High School (SHS) Strands & Academic Subjects
All academic monitoring, subject catalogs, and SIGMA analytics must strictly align with the 5 official SHS Strands:

1. **ABM (Accountancy, Business and Management):**
   - *Subjects:* Fundamentals of ABM 1 & 2, Business Mathematics, Principles of Marketing, Business Finance, Applied Economics.
2. **HE (Home Economics):**
   - *Subjects:* Bread and Pastry Production, Food and Beverage Services (FBS), Cookery, Housekeeping, Tourism Promotion Services.
3. **GAS (General Academic Strand):**
   - *Subjects:* General Mathematics, Understanding Culture, Society and Politics (UCSP), Earth and Life Science, Physical Science, Disaster Readiness and Risk Reduction (DRRR).
4. **HUMSS (Humanities and Social Sciences):**
   - *Subjects:* Philippine Politics and Governance, Creative Writing, Creative Nonfiction, Disciplines and Ideas in the Social Sciences (DISS), Introduction to World Religions.
5. **ICT (Information and Communications Technology):**
   - *Subjects:* Computer Programming 1 & 2 (Java / Logic Gates / Web Development), Computer Systems Servicing (CSS), Animation, Illustration.

## 6. Core Analytics Categories (SIGMA Analytics)
All academic intelligence cards operate under 3 distinct analytics categories:

1. 📊 **Descriptive Analytics (`fa-chart-column`):**
   - *Purpose:* Reports what has happened (historical performance, attendance records, submission ratios, completed laboratory exercises, released quarterly grades).
2. 🔮 **Predictive Analytics (`fa-wand-magic-sparkles`):**
   - *Purpose:* Forecasts future outcomes based on historical trends (projected GPA, academic honors trajectory, upcoming milestone deadlines, risk predictions).
3. 🎯 **Prescriptive Analytics (`fa-compass`):**
   - *Purpose:* Delivers targeted, actionable recommendations (specific topic review focus, diagnostic exam preparations, suggested practice sets).
## 7. Relative Time & Timestamp Formatting Standard
All submission timestamps, activity logs, and real-time feeds must follow this humanized relative time format:
- **Seconds (< 60s):** `1sec`, `2secs`, ... `59secs`
- **Minutes (< 60m):** `1min`, `2mins`, ... `59mins`
- **Hours (< 24h same day):** `1hr`, `2hrs`, ... `22hrs`
- **Yesterday:** `Yesterday at 12:30 pm` (12-hour format with `am`/`pm`)
- **Past Week (< 7 days):** `Monday at 4:20 am`, `Saturday at 7:30 pm`
- **Older / Extended Dates:** `April 30 at 6:07 pm` (Month Day at Time)

## 8. Shared Component Unification & Zero-Redundancy Architecture (Strict Rule)
- **Zero Redundant Code:** DO NOT write redundant or duplicate code across files. When multiple components or portals need the same functionality, dialog, style, or behavior, unify them into a single shared file so that editing text, styling, or logic in one place instantly updates everywhere.
- **Shared Dialog & Error Panels:** All alert popups, confirmation modals, and error panels use the centralized `window.showSigmaDialog(...)` / `window.showAlertDialog(...)` engine in `js/panels.js` with styles in `css/forms.css` (`.sigma-dialog-*`). Never create separate, hardcoded dialog markup in page templates.
- **Shared Forms, Controls & Tables:** All input textboxes (`.sigma-input`), dropdowns (`.sigma-select`), modals/workstations (`.sigma-modal-*`), tables (`.sigma-table`), and buttons (`.sigma-btn-*`) are centralized in `css/forms.css`.
- **Immediate Deletion of Obsolete Code:** When unifying components, always permanently delete old redundant HTML markups, duplicate JS listeners, and repeated CSS blocks from individual files.
