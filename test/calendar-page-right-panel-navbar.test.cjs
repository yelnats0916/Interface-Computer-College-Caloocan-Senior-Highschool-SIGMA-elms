const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

console.log('Running Calendar Page Layout, Clean Navbar, Calendar Panel Style & Back Buttons Test...');

// 1. Verify teacher.html navbar structure
const teacherHtmlPath = path.resolve(__dirname, '..', 'teacher.html');
const teacherHtml = fs.readFileSync(teacherHtmlPath, 'utf8');

// Topbar MUST NOT contain calendar controls (per user instruction: only Calendar text header in navbar)
assert(!teacherHtml.includes('id="navbar-calendar-controls"'), 'teacher.html topbar MUST NOT contain #navbar-calendar-controls');
assert(!teacherHtml.includes('id="calendar-page-back-btn"'), 'teacher.html topbar MUST NOT contain #calendar-page-back-btn (back button deleted per request)');
assert(teacherHtml.includes('id="nav-context-text"'), 'teacher.html must contain #nav-context-text for Calendar text title');
assert(teacherHtml.includes('class="header-search-container'), 'teacher.html must retain search bar in navbar');

// Calendar Page controls Toolbar (Matches Calendar Panel in Image 2)
assert(teacherHtml.includes('id="attendance-left-column"'), 'teacher.html must contain #attendance-left-column');
assert(teacherHtml.includes('class="calendar-controls-toolbar"'), 'teacher.html must contain .calendar-controls-toolbar in left column');
assert(teacherHtml.includes('id="attendance-today-btn"'), 'teacher.html must contain #attendance-today-btn in calendar controls');
assert(teacherHtml.includes('id="attendance-month-picker-btn"'), 'teacher.html must contain #attendance-month-picker-btn in calendar controls');
assert(teacherHtml.includes('id="attendance-month-year-label"'), 'teacher.html must contain #attendance-month-year-label in calendar controls');
// Verify text and panel container are not clickable, only icons are clickable
const pickerBtnMatch = teacherHtml.match(/<button[^>]*id="attendance-month-picker-btn"[^>]*>([\s\S]*?)<\/button>/);
assert(pickerBtnMatch, 'attendance-month-picker-btn button tag must exist');
assert(!pickerBtnMatch[1].includes('id="attendance-month-year-label"'), 'attendance-month-picker-btn MUST NOT contain #attendance-month-year-label (label must be non-clickable text outside button)');
assert(pickerBtnMatch[1].includes('fa-calendar'), 'attendance-month-picker-btn must wrap the calendar icon');
assert(teacherHtml.includes('id="attendance-page-month-picker"'), 'teacher.html must contain #attendance-page-month-picker popover');
assert(teacherHtml.includes('id="nav-cal-prev-btn"'), 'teacher.html must contain #nav-cal-prev-btn in calendar controls');
assert(teacherHtml.includes('id="nav-cal-next-btn"'), 'teacher.html must contain #nav-cal-next-btn in calendar controls');
assert(teacherHtml.includes('id="attendance-month-select"'), 'teacher.html must contain #attendance-month-select');
assert(teacherHtml.includes('id="attendance-year-select"'), 'teacher.html must contain #attendance-year-select');

// Calendar Grid Shell
assert(teacherHtml.includes('id="attendance-calendar-shell"'), 'teacher.html must contain #attendance-calendar-shell');
assert(teacherHtml.includes('class="attendance-weekdays-header"'), 'teacher.html must contain .attendance-weekdays-header');
assert(teacherHtml.includes('id="attendance-full-calendar-grid"'), 'teacher.html must contain #attendance-full-calendar-grid');

// Right Panel structure
assert(teacherHtml.includes('id="calendar-right-panel"'), 'teacher.html must contain #calendar-right-panel');
assert(teacherHtml.includes('id="calendar-right-panel-date"'), 'teacher.html must contain #calendar-right-panel-date');
assert(teacherHtml.includes('id="calendar-right-panel-day"'), 'teacher.html must contain #calendar-right-panel-day');
assert(!teacherHtml.includes('id="calendar-right-panel-badge"'), 'teacher.html must NOT contain #calendar-right-panel-badge (badge removed)');
assert(!teacherHtml.includes('id="calendar-right-panel-today-badge"'), 'teacher.html must NOT contain #calendar-right-panel-today-badge (today badge removed per user request)');
assert(!teacherHtml.includes('id="calendar-panel-back-btn"'), 'teacher.html must NOT contain #calendar-panel-back-btn (panel back btn removed)');
assert(teacherHtml.includes('id="calendar-right-panel-content"'), 'teacher.html must contain #calendar-right-panel-content');
assert(teacherHtml.includes('id="calendar-panel-jump-today-btn"'), 'teacher.html must contain #calendar-panel-jump-today-btn');
assert(!teacherHtml.includes('id="calendar-panel-prev-day-btn"'), 'teacher.html must NOT contain #calendar-panel-prev-day-btn (removed per user choice)');
assert(!teacherHtml.includes('id="calendar-panel-next-day-btn"'), 'teacher.html must NOT contain #calendar-panel-next-day-btn (removed per user choice)');
console.log('✓ teacher.html navbar (clean, text header only) and calendar page structure verified.');

// 2. Verify css/teacher.css
const teacherCssPath = path.resolve(__dirname, '..', 'css', 'teacher.css');
const teacherCss = fs.readFileSync(teacherCssPath, 'utf8');

assert(!teacherCss.includes('body.calendar-page-mode .header-search-container {'), 'Search bar must NOT be hidden in calendar mode');
assert(teacherCss.includes('#section-attendance:not(.hidden)'), 'teacher.css must contain #section-attendance:not(.hidden)');
assert(teacherCss.includes('#attendance-left-column'), 'teacher.css must style #attendance-left-column');
assert(teacherCss.includes('#calendar-right-panel'), 'teacher.css must style #calendar-right-panel');
assert(teacherCss.includes('.calendar-controls-toolbar'), 'teacher.css must style .calendar-controls-toolbar');
assert(teacherCss.includes('#attendance-full-calendar-grid'), 'teacher.css must style #attendance-full-calendar-grid');
assert(teacherCss.includes('grid-auto-rows: 1fr'), 'teacher.css must specify grid-auto-rows: 1fr for equal rows');
assert(teacherCss.includes('@media (max-width: 1023px)'), 'teacher.css must contain mobile responsive rules');
assert(teacherCss.includes('#calendar-panel-jump-today-btn:hover'), 'teacher.css must style #calendar-panel-jump-today-btn:hover');
assert(/\.calendar-panel-header\s*\{[^}]*background-color:\s*#ffffff/i.test(teacherCss), 'teacher.css must style calendar panel header with clean white (#ffffff)');
assert(teacherCss.includes('.attendance-weekdays-header'), 'teacher.css must style .attendance-weekdays-header');
assert(/\.attendance-weekdays-header\s*\{[^}]*background-color:\s*#15803d/i.test(teacherCss), 'teacher.css must style .attendance-weekdays-header with shared green (#15803d)');
assert(teacherCss.includes('.calendar-panel-header-center'), 'teacher.css must contain .calendar-panel-header-center');
assert(teacherCss.includes('text-transform: none'), 'teacher.css must title case subtitle with text-transform: none');
console.log('✓ teacher.css layout rules, equal grid cell styles, and grey hover highlight verified.');

// 3. Verify calendar.js View Calendar click handler & route tracking
const calendarJsPath = path.resolve(__dirname, '..', 'js', 'calendar.js');
const calendarJs = fs.readFileSync(calendarJsPath, 'utf8');
assert(calendarJs.includes('handleViewCalendarClick'), 'calendar.js must include handleViewCalendarClick');
assert(calendarJs.includes("window._calendarPreviousHash"), 'calendar.js must record _calendarPreviousHash');
assert(calendarJs.includes("window.switchTab('nav-attendance'"), 'handleViewCalendarClick must switchTab to nav-attendance');
console.log('✓ js/calendar.js View Calendar navigation logic verified.');

// 4. Verify teacher.js routing, custom month picker, equal grid squares, and back handling
const teacherJsPath = path.resolve(__dirname, '..', 'js', 'teacher.js');
const teacherJs = fs.readFileSync(teacherJsPath, 'utf8');
assert(teacherJs.includes("'nav-calendar': 'section-attendance'"), 'teacher.js must map nav-calendar');
assert(teacherJs.includes("'calendar': 'nav-attendance'"), 'teacher.js must map calendar');
assert(teacherJs.includes("stepAttendanceMonth"), 'teacher.js must define stepAttendanceMonth');
assert(teacherJs.includes("stepAttendanceToday"), 'teacher.js must define stepAttendanceToday');
assert(teacherJs.includes("stepAttendanceDay"), 'teacher.js must define stepAttendanceDay');
assert(teacherJs.includes("openAttendancePageMonthPicker"), 'teacher.js must define openAttendancePageMonthPicker');
assert(teacherJs.includes("renderAttendancePageCustomMonthPicker"), 'teacher.js must define renderAttendancePageCustomMonthPicker');
// Verify option 1: toolbar keeps Today button, popover removes "This Month" footer
const pickerFnMatch = teacherJs.match(/function renderAttendancePageCustomMonthPicker\(\)[\s\S]*?picker\.innerHTML = `([\s\S]*?)`;/);
assert(pickerFnMatch, 'renderAttendancePageCustomMonthPicker innerHTML template must exist');
assert(!pickerFnMatch[1].includes('This Month'), 'Calendar page month picker popover MUST NOT contain This Month footer');
assert(!pickerFnMatch[1].includes('cal-picker-footer'), 'Calendar page month picker popover MUST NOT contain cal-picker-footer');
assert(teacherJs.includes("selectedCalendarDate.year"), 'setupAttendanceCalendar must use selectedCalendarDate.year');
assert(teacherJs.includes("selectedCalendarDate.month"), 'setupAttendanceCalendar must use selectedCalendarDate.month');
assert(!teacherJs.includes("'Selected Date'"), 'teacher.js renderCalendarRightPanel must NOT use Selected Date');
assert(!teacherJs.includes("- Today"), 'teacher.js panelDay must not contain - Today');
const dayCellMatch = teacherJs.match(/function renderDayCell\([\s\S]*?\n\s*\}/);
assert(dayCellMatch && !dayCellMatch[0].includes("2 classes"), 'renderDayCell must not contain placeholder dots or 2 classes');
assert(teacherJs.includes("renderCalendarRightPanel"), 'teacher.js must define renderCalendarRightPanel');
assert(teacherJs.includes("calendar-timeline"), 'teacher.js renderCalendarRightPanel must render .calendar-timeline');
assert(teacherJs.includes("timeline-hour"), 'teacher.js renderCalendarRightPanel must render .timeline-hour');
assert(teacherJs.includes("calendar-timeline-node"), 'teacher.js renderCalendarRightPanel must render .calendar-timeline-node');
assert(teacherCss.includes(".calendar-timeline"), 'teacher.css must style .calendar-timeline');
assert(teacherCss.includes(".calendar-timeline-item"), 'teacher.css must style .calendar-timeline-item');
assert(teacherCss.includes(".calendar-timeline-time"), 'teacher.css must style .calendar-timeline-time');
assert(teacherJs.includes("gridTemplateRows = `repeat(${totalWeeks}, minmax(0, 1fr))`"), 'teacher.js must set equal grid row template');
assert(teacherJs.includes("window.handleCalendarBack"), 'teacher.js must define handleCalendarBack');
assert(teacherJs.includes("window.history.back()"), 'handleCalendarBack must call history.back()');
assert(teacherJs.includes("syncCalendarPageActiveState"), 'teacher.js must call syncCalendarPageActiveState');
console.log('✓ js/teacher.js calendar routing, month stepper, custom month picker, equal grid squares, timeline agenda, right panel renderers, and back navigation verified.');

// 5. Verify persistent selected state on desktop and mobile topbars while on calendar page
const topbarCssPath = path.resolve(__dirname, '..', 'css', 'topbar.css');
const topbarCss = fs.readFileSync(topbarCssPath, 'utf8');
assert(topbarCss.includes('body.calendar-page-mode #calendar-toggle'), 'topbar.css must style desktop #calendar-toggle in calendar-page-mode');
assert(topbarCss.includes('body.calendar-page-mode #mobile-subbar-calendar'), 'topbar.css must style mobile #mobile-subbar-calendar in calendar-page-mode');

const topbarJsPath = path.resolve(__dirname, '..', 'js', 'topbar.js');
const topbarJs = fs.readFileSync(topbarJsPath, 'utf8');
assert(topbarJs.includes('window.syncCalendarPageActiveState'), 'topbar.js must define window.syncCalendarPageActiveState');
assert(calendarJs.includes('syncCalendarPageActiveState'), 'calendar.js must call syncCalendarPageActiveState on View Calendar navigation');
assert(teacherHtml.includes('id="calendar-dropdown"'), 'teacher.html must contain #calendar-dropdown');
assert(teacherHtml.includes('view-calendar-anchor'), 'teacher.html must contain .view-calendar-anchor');
assert(topbarJs.includes("calendarDropdown.classList.remove('hidden')"), 'topbar.js must toggle calendarDropdown open');
assert(calendarJs.includes('view-calendar-anchor'), 'calendar.js must bind view-calendar-anchor');
assert(topbarCss.includes('body.calendar-page-mode #calendar-dropdown'), 'topbar.css must keep calendar-dropdown hidden while on calendar page');
assert(teacherCss.includes('body.calendar-page-mode #calendar-dropdown'), 'teacher.css must keep calendar-dropdown hidden while on calendar page');
console.log('✓ Persistent calendar selected state, mini dropdown, and hidden-on-page behavior verified.');

// 6. Verify Clean Automated Calendar (No Add Event buttons or modal)
assert(!teacherHtml.includes('id="calendar-main-add-event-btn"'), 'teacher.html must NOT contain #calendar-main-add-event-btn (removed per user request)');
assert(!teacherHtml.includes('id="calendar-panel-add-event-btn"'), 'teacher.html must NOT contain #calendar-panel-add-event-btn');
assert(!teacherHtml.includes('id="calendarAddEventModal"'), 'teacher.html must NOT contain #calendarAddEventModal (modal removed)');
assert(!teacherHtml.includes('id="calendarAddEventForm"'), 'teacher.html must NOT contain #calendarAddEventForm');
assert(teacherCss.includes('.calendar-panel-empty-state'), 'teacher.css must style .calendar-panel-empty-state');
assert(teacherCss.includes('.calendar-empty-icon-wrap i') && teacherCss.includes('var(--sigma-black-fade'), 'teacher.css must style empty state icon with var(--sigma-black-fade)');
assert(teacherCss.includes('.calendar-empty-desc') && teacherCss.includes('var(--sigma-black-fade'), 'teacher.css must style empty state subtitle with var(--sigma-black-fade)');
assert(teacherJs.includes('calendar-panel-empty-state'), 'teacher.js must render .calendar-panel-empty-state when events are empty');
assert(teacherJs.includes('text-black-fade'), 'teacher.js must use text-black-fade in empty state');
assert(calendarJs.includes('text-black-fade'), 'calendar.js must use text-black-fade in empty state');
assert(!teacherJs.includes('calendar-empty-add-btn'), 'teacher.js must NOT render add button in empty state');
assert(!teacherJs.includes('calendar-content-top-row'), 'teacher.js must NOT render calendar-content-top-row above populated timeline');
assert(teacherJs.includes('window.openCalendarAddEventModal'), 'teacher.js must define safe stub for openCalendarAddEventModal');
assert(teacherJs.includes('window.closeCalendarAddEventModal'), 'teacher.js must define safe stub for closeCalendarAddEventModal');
assert(teacherJs.includes('window.saveCalendarEvent'), 'teacher.js must define safe stub for saveCalendarEvent');
assert(teacherJs.includes('window.deleteCalendarEvent'), 'teacher.js must define safe stub for deleteCalendarEvent');
assert(teacherCss.includes('.calendar-timeline-title-btn'), 'teacher.css must style .calendar-timeline-title-btn for clickable assessment titles');
assert(teacherJs.includes('calendar-timeline-title-btn'), 'teacher.js must render .calendar-timeline-title-btn for clickable assessment titles');
assert(teacherJs.includes('timeLeftStr'), 'teacher.js must compute remaining time for assessment footer');
assert(teacherCss.includes('.calendar-timeline-card.card-deadline') && teacherCss.includes('background: #ffffff !important'), 'teacher.css must keep cards pure white panels');

// 7. Verify Flat Panels (No float effects) and Non-Role Cards Non-Clickable
assert(teacherCss.includes('.calendar-timeline-card') && teacherCss.includes('box-shadow: none !important') && teacherCss.includes('transform: none !important'), 'teacher.css must remove float effects (box-shadow and transform)');
assert(teacherCss.includes('cursor: default !important'), 'teacher.css must set cursor: default on timeline cards');
assert(teacherJs.includes('card-no-role') && teacherJs.includes('card-not-clickable'), 'teacher.js must assign non-clickable classes to events not from any role');
assert(teacherJs.includes('Now - ${curTimeStr}'), 'teacher.js must title case the Now indicator text');
assert(teacherCss.includes('.calendar-timeline-now-line .now-badge') && teacherCss.includes('text-transform: none'), 'teacher.css must allow title case with text-transform: none');
assert(!dayCellMatch[0].includes('bg-emerald-50/40'), 'renderDayCell must NOT contain bg-emerald-50/40 (tint green removed)');
assert(teacherJs.includes('calendar-grid-cell-today'), 'teacher.js must assign calendar-grid-cell-today');
assert(teacherJs.includes('calendar-grid-cell-selected'), 'teacher.js must assign calendar-grid-cell-selected');
assert(teacherCss.includes('.calendar-grid-cell-today') && teacherCss.includes('#FFD000'), 'teacher.css must style .calendar-grid-cell-today with #FFD000 (shared yellow)');
assert(teacherCss.includes('.calendar-grid-cell-selected') && teacherCss.includes('#15803d'), 'teacher.css must style .calendar-grid-cell-selected with #15803d (shared green)');
console.log('✓ Whole cell colored (Current = Shared Yellow, Selected = Shared Green, No tint green) verified.');

// 9. Verify Maintenance Footer Shows Only Time Left to Trigger (No location, no timeRange)
assert(!teacherJs.includes('${ev.timeRange}'), 'teacher.js must NOT render ev.timeRange in footer (removed per request)');
assert(!teacherJs.includes('${ev.location}'), 'teacher.js must NOT render ev.location in footer (removed per request)');
console.log('✓ Maintenance footer shows only time left to trigger (no timeRange, no location) verified.');

// 10. Verify Subtitle 2-Line Clamp with Ellipsis & Universal Inter Font Family on Calendar Page
assert(teacherCss.includes('-webkit-line-clamp: 2') && teacherCss.includes('text-overflow: ellipsis'), 'teacher.css must clamp .calendar-timeline-subtitle to 2 lines with ellipsis');
assert(teacherCss.includes('#section-attendance') && teacherCss.includes("font-family: 'Inter'"), 'teacher.css must apply Inter font family to calendar page');
assert(teacherJs.includes('calendar-timeline-subtitle'), 'teacher.js must render subtitle on cards');
// 11. Verify Assessment Title Hover is Yellow Text and Not Underline/Green
assert(teacherCss.includes('.calendar-timeline-title-btn:hover') && teacherCss.includes('color: #FFD000 !important') && teacherCss.includes('text-decoration: none !important'), 'teacher.css must style .calendar-timeline-title-btn:hover with yellow text (#FFD000) and no underline');
assert(!teacherJs.includes('hover:text-[#15803d]'), 'teacher.js must NOT have green hover on title button');
assert(teacherJs.includes('hover:text-[#FFD000]'), 'teacher.js must have yellow hover on title button');
console.log('✓ Assessment title hover is yellow text without underline verified.');

// 12. Verify Assessment Subtitle Format (Grade Level - Section Name • Subject)
assert(teacherJs.includes('Grade 11 - ICT A • Computer Programming 1'), 'teacher.js must format assessment subtitle as Grade Level - Section Name • Subject for ICT A');
assert(teacherJs.includes('Grade 11 - ICT B • Computer Programming 1'), 'teacher.js must format assessment subtitle as Grade Level - Section Name • Subject for ICT B');
assert(teacherJs.includes('Grade 7 - Emerald • General Science'), 'teacher.js must format assessment subtitle as Grade Level - Section Name • Subject for Grade 7 Emerald');
console.log('✓ Assessment subtitle per grade section level, section name, and subject verified.');

// 13. Verify Same-Time Due Dates in Different Sections are Grouped & Placed Below Each Other
assert(teacherJs.includes('calendar-timeline-cards-col'), 'teacher.js must wrap timeline cards in .calendar-timeline-cards-col');
assert(teacherCss.includes('.calendar-timeline-cards-col') && teacherCss.includes('flex-direction: column !important'), 'teacher.css must style .calendar-timeline-cards-col as flex-direction: column');
assert(teacherCss.includes('.calendar-timeline-card') && teacherCss.includes('width: 100% !important'), 'teacher.css must give cards width: 100% to stack vertically');
console.log('✓ Same-time due date panels stacked vertically below each other verified.');

// 14. Verify Browser Back/Forward & Outside Navigation Unselects Calendar Unless on Calendar Page
const freshTopbarJs = fs.readFileSync(topbarJsPath, 'utf8');
const freshTeacherJs = freshTeacherJsContent();
const freshCalendarJs = fs.readFileSync(calendarJsPath, 'utf8');

function freshTeacherJsContent() {
    return fs.readFileSync(teacherJsPath, 'utf8');
}

assert(freshTopbarJs.includes('window.isActuallyCalendarPage'), 'topbar.js must define window.isActuallyCalendarPage');
assert(freshTopbarJs.includes("hash.startsWith('#classroom:')"), 'isActuallyCalendarPage must reject #classroom: routes');
assert(freshTopbarJs.includes("hash.startsWith('#topic:')"), 'isActuallyCalendarPage must reject #topic: routes');
assert(freshTopbarJs.includes("hash.startsWith('#dashboard')"), 'isActuallyCalendarPage must reject #dashboard route');
assert(freshTopbarJs.includes("window.addEventListener('popstate'"), 'topbar.js must listen to popstate to sync calendar active state');
assert(freshTopbarJs.includes("window.addEventListener('hashchange'"), 'topbar.js must listen to hashchange to sync calendar active state');
assert(freshTeacherJs.includes('showStudentList') && freshTeacherJs.includes("document.body.classList.remove('calendar-page-mode')"), 'teacher.js must unselect calendar-page-mode in showStudentList');
assert(freshTeacherJs.includes('switchClassDetailTab') && freshTeacherJs.includes("document.body.classList.remove('calendar-page-mode')"), 'teacher.js must unselect calendar-page-mode in switchClassDetailTab');

// Run simulated DOM test for isActuallyCalendarPage and syncCalendarPageActiveState
const vm = require('vm');
let activeSection = 'section-classroom-detail';

const simulatedDom = {
    document: {
        body: {
            classList: {
                _classes: new Set(['calendar-page-mode']),
                contains(c) { return this._classes.has(c); },
                add(c) { this._classes.add(c); },
                remove(c) { this._classes.delete(c); }
            }
        },
        getElementById(id) {
            if (id === 'calendar-toggle') {
                return this._calToggle;
            }
            if (id === 'mobile-subbar-calendar') {
                return this._subbarCal;
            }
            if (id === 'mobile-appbar-calendar') {
                return this._appbarCal;
            }
            if (id === 'calendar-dropdown') {
                return { classList: { contains(c) { return c === 'hidden'; } } };
            }
            if (id === 'section-attendance') {
                return { classList: { contains(c) { return activeSection !== 'section-attendance'; } } };
            }
            return null;
        },
        querySelector(sel) {
            if (sel.includes('#section-dashboard:not(.hidden)') && activeSection === 'section-dashboard') return {};
            if (sel.includes('#section-classes:not(.hidden)') && activeSection === 'section-classes') return {};
            if (sel.includes('#section-classroom-detail:not(.hidden)') && activeSection === 'section-classroom-detail') return {};
            if (sel.includes('#classroom-detail-view:not(.hidden)') && activeSection === 'section-classroom-detail') return {};
            return null;
        },
        querySelectorAll() { return []; },
        addEventListener() {}
    },
    window: {
        location: { hash: '#classroom:Rizal:Computer%20Programming%201:topics' },
        addEventListener() {}
    }
};

simulatedDom.document._calToggle = {
    _classes: new Set(['active']),
    classList: {
        contains(c) { return simulatedDom.document._calToggle._classes.has(c); },
        add(c) { simulatedDom.document._calToggle._classes.add(c); },
        remove(c) { simulatedDom.document._calToggle._classes.delete(c); }
    }
};
simulatedDom.document._subbarCal = {
    _classes: new Set(['active', 'selected']),
    classList: {
        contains(c) { return simulatedDom.document._subbarCal._classes.has(c); },
        add(c) { simulatedDom.document._subbarCal._classes.add(c); },
        remove(c) { simulatedDom.document._subbarCal._classes.delete(c); }
    }
};
simulatedDom.document._appbarCal = {
    _classes: new Set(['active']),
    classList: {
        contains(c) { return simulatedDom.document._appbarCal._classes.has(c); },
        add(c) { simulatedDom.document._appbarCal._classes.add(c); },
        remove(c) { simulatedDom.document._appbarCal._classes.delete(c); }
    }
};

simulatedDom.window.document = simulatedDom.document;
const ctx = vm.createContext(simulatedDom);

// Extract and execute isActuallyCalendarPage and syncCalendarPageActiveState in vm
const isActCode = freshTopbarJs.slice(freshTopbarJs.indexOf('window.isActuallyCalendarPage = function'), freshTopbarJs.indexOf('window.openAiPanel'));
vm.runInContext(isActCode, ctx);

// Test 1: On classroom topics page, calendar MUST NOT be active
assert.strictEqual(simulatedDom.window.isActuallyCalendarPage(), false, 'isActuallyCalendarPage must return false on classroom topics route');
simulatedDom.window.syncCalendarPageActiveState();
assert.strictEqual(simulatedDom.document.body.classList.contains('calendar-page-mode'), false, 'calendar-page-mode must be removed from body when on classroom page');
assert.strictEqual(simulatedDom.document._calToggle.classList.contains('active'), false, '#calendar-toggle must NOT be active when on classroom page');
assert.strictEqual(simulatedDom.document._subbarCal.classList.contains('active'), false, '#mobile-subbar-calendar must NOT be active when on classroom page');

// Test 2: On #calendar page, calendar MUST be active
activeSection = 'section-attendance';
simulatedDom.window.location.hash = '#calendar';
assert.strictEqual(simulatedDom.window.isActuallyCalendarPage(), true, 'isActuallyCalendarPage must return true on #calendar route');
simulatedDom.window.syncCalendarPageActiveState();
assert.strictEqual(simulatedDom.document.body.classList.contains('calendar-page-mode'), true, 'calendar-page-mode must be added to body when on calendar page');
assert.strictEqual(simulatedDom.document._calToggle.classList.contains('active'), true, '#calendar-toggle must be active when on calendar page');
assert.strictEqual(simulatedDom.document._subbarCal.classList.contains('active'), true, '#mobile-subbar-calendar must be active when on calendar page');

// Test 3: Browser Back from #calendar to #dashboard -> MUST unselect calendar
activeSection = 'section-dashboard';
simulatedDom.window.location.hash = '#dashboard';
assert.strictEqual(simulatedDom.window.isActuallyCalendarPage(), false, 'isActuallyCalendarPage must return false on #dashboard');
simulatedDom.window.syncCalendarPageActiveState();
assert.strictEqual(simulatedDom.document.body.classList.contains('calendar-page-mode'), false, 'calendar-page-mode must be removed when returning to dashboard');
assert.strictEqual(simulatedDom.document._calToggle.classList.contains('active'), false, '#calendar-toggle must be unselected when returning to dashboard');
assert.strictEqual(simulatedDom.document._subbarCal.classList.contains('active'), false, '#mobile-subbar-calendar must be unselected when returning to dashboard');

console.log('✓ Browser Back/Forward & Outside Navigation unselects calendar unless on calendar page verified.');

// 12. Verify Mobile Edge-to-Edge Calendar, Closed Gap & Compact Scale
assert(teacherCss.includes('#attendance-left-column') && teacherCss.includes('padding: 0 !important'), 'teacher.css must reset left column padding to 0 on mobile');
assert(teacherCss.includes('#attendance-left-column') && teacherCss.includes('flex: 0 0 auto !important'), 'teacher.css must prevent left column from stretching to close empty gap');
assert(teacherCss.includes('#attendance-calendar-shell') && teacherCss.includes('border-radius: 0 !important'), 'teacher.css must remove border-radius on mobile calendar shell');
assert(teacherCss.includes('grid-auto-rows: 46px !important'), 'teacher.css must set comfortable grid row height (46px) on mobile');
assert(teacherCss.includes('#attendance-full-calendar-grid > div') && teacherCss.includes('height: 46px !important'), 'teacher.css must set 46px cell heights on mobile');
assert(teacherCss.includes('.calendar-grid-date-num') && teacherCss.includes('font-size: 11px !important'), 'teacher.css must retain compact scale numbers on mobile (11px font size)');
console.log('✓ Mobile edge-to-edge full width calendar with closed gap, increased cell height (46px) and scaled-down numbers (11px) verified.');

// 13. Verify Black Fade Border Lines on Both Desktop and Mobile & Black Fade Items Count
assert(teacherCss.includes('#attendance-full-calendar-grid > div') && teacherCss.includes('border-color: var(--sigma-black-fade-border, rgba(0, 0, 0, 0.08)) !important'), 'Calendar cells must use black fade border on desktop and mobile');
assert(teacherCss.includes('#attendance-calendar-shell') && teacherCss.includes('rgba(0, 0, 0, 0.08)'), 'Calendar shell must use black fade border');
assert(teacherCss.includes('#calendar-right-panel-items-count') && teacherCss.includes('rgba(0, 0, 0, 0.45)'), 'Calendar panel items count must use black fade text');
assert(teacherCss.includes('.calendar-timeline-item::before') && teacherCss.includes('var(--sigma-black-fade-border, rgba(0, 0, 0, 0.08))'), 'Timeline vertical spine track line in teacher.css must use black fade');
const freshCalendarCss = fs.readFileSync(path.resolve(__dirname, '..', 'css', 'calendar.css'), 'utf8');
assert(freshCalendarCss.includes('.calendar-timeline-item::before') && freshCalendarCss.includes('var(--sigma-black-fade-border, rgba(0, 0, 0, 0.08))'), 'Timeline vertical spine track line in calendar.css must use black fade');
console.log('✓ Black fade border lines, timeline vertical spine track, and items count text verified.');

// 14. Verify Timeline Time Column (hour, period, duration) is all Black Text
assert(teacherCss.includes('.calendar-timeline-time .timeline-hour') && teacherCss.includes('color: #000000 !important'), 'timeline-hour must be black text');
assert(teacherCss.includes('.calendar-timeline-time .timeline-period') && teacherCss.includes('color: #000000 !important'), 'timeline-period must be black text');
assert(teacherCss.includes('.calendar-timeline-time .timeline-duration') && teacherCss.includes('color: #000000 !important'), 'timeline-duration must be black text');
console.log('✓ Timeline time column (hour, period, duration) all black text verified.');

// 15. Verify "View Calendar →" Link is Shared Green Text & Icon and Grey Hover Highlight
const calendarCss = fs.readFileSync(path.resolve(__dirname, '..', 'css', 'calendar.css'), 'utf8');
assert(calendarCss.includes('.view-calendar-anchor') && calendarCss.includes('color: #15803d !important'), 'view-calendar-anchor must use shared green (#15803d) text and icon');
assert(calendarCss.includes('.view-calendar-anchor:hover') && calendarCss.includes('background-color: #f1f5f9 !important'), 'view-calendar-anchor:hover must use grey (#f1f5f9) background highlight');
console.log('✓ "View Calendar →" green text and icon with grey hover highlight verified.');

console.log('ALL TESTS PASSED SUCCESSFULLY! 🎉');
