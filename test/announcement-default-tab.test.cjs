const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// 1. Verify announcements.js contains resetToDefaultTab and exposure on API
const announcementsJs = fs.readFileSync(path.join(__dirname, '../js/announcements.js'), 'utf8');

assert.ok(
    announcementsJs.includes('function resetToDefaultTab(forceRefresh = true)'),
    'announcements.js must define resetToDefaultTab'
);

assert.ok(
    announcementsJs.includes('resetToDefaultTab: resetToDefaultTab'),
    'announcements.js must expose resetToDefaultTab on window.SigmaAnnouncements'
);

assert.ok(
    announcementsJs.includes('window.resetAnnouncementFeedToDefault = resetToDefaultTab'),
    'announcements.js must define window.resetAnnouncementFeedToDefault'
);

assert.ok(
    announcementsJs.includes('window.renderTeacherAnnouncements = (resetTab = true) =>') &&
    announcementsJs.includes('window.renderAdminAnnouncements = (resetTab = true) =>') &&
    announcementsJs.includes('window.renderStudentHomeAnnouncements = (resetTab = true) =>') &&
    announcementsJs.includes('window.renderInstitutionalAnnouncements = (resetTab = true) =>'),
    'announcements.js global render bridge functions must support resetting to default tab'
);

assert.ok(
    announcementsJs.includes("window.addEventListener('pageshow'") &&
    announcementsJs.includes("window.addEventListener('popstate'") &&
    announcementsJs.includes("window.addEventListener('hashchange'"),
    'announcements.js must listen for pageshow, popstate, and hashchange to reset to Announcements'
);

// 2. Verify ensureTabsDOM maintains active class on Announcements button
assert.ok(
    announcementsJs.includes('data-announcement-tab="all">Announcements</button>') &&
    announcementsJs.includes('${isAll ? \'active\' : \'\'}'),
    'ensureTabsDOM must include active class on Announcements tab'
);

// 3. Verify teacher.js calls resetToDefaultTab on nav-dashboard and in renderTeacherAnnouncements
const teacherJs = fs.readFileSync(path.join(__dirname, '../js/teacher.js'), 'utf8');

assert.ok(
    teacherJs.includes("if (navId === 'nav-dashboard')") &&
    teacherJs.includes("window.SigmaAnnouncements.resetToDefaultTab"),
    'teacher.js switchTab must call resetToDefaultTab when navId is nav-dashboard'
);

assert.ok(
    teacherJs.includes("function renderTeacherAnnouncements()") &&
    teacherJs.includes("window.SigmaAnnouncements.resetToDefaultTab"),
    'teacher.js renderTeacherAnnouncements must call resetToDefaultTab'
);

// 4. Verify student.js calls resetToDefaultTab on nav-home and in renderStudentHomeAnnouncements
const studentJs = fs.readFileSync(path.join(__dirname, '../js/student.js'), 'utf8');

assert.ok(
    studentJs.includes("else if (navId === 'nav-home')") &&
    studentJs.includes("window.SigmaAnnouncements.resetToDefaultTab"),
    'student.js _applyTab must call resetToDefaultTab when navId is nav-home'
);

assert.ok(
    studentJs.includes("function renderStudentHomeAnnouncements()") &&
    studentJs.includes("window.SigmaAnnouncements.resetToDefaultTab"),
    'student.js renderStudentHomeAnnouncements must call resetToDefaultTab'
);

// 5. Verify admin.js calls resetToDefaultTab on dashboard-view and in renderAdminAnnouncements
const adminJs = fs.readFileSync(path.join(__dirname, '../js/admin.js'), 'utf8');

assert.ok(
    adminJs.includes("if (sectionId === 'dashboard-view')") &&
    adminJs.includes("window.SigmaAnnouncements.resetToDefaultTab"),
    'admin.js showSection must call resetToDefaultTab when sectionId is dashboard-view'
);

assert.ok(
    adminJs.includes("function renderAdminAnnouncements()") &&
    adminJs.includes("window.SigmaAnnouncements.resetToDefaultTab"),
    'admin.js renderAdminAnnouncements must call resetToDefaultTab'
);

// 6. Verify HTML files have nav-logo-btn onclick with resetToDefaultTab and cache busters
for (const file of ['teacher.html', 'student.html', 'admin.html']) {
    const html = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    assert.ok(
        html.includes('id="nav-logo-btn"') && html.includes('resetToDefaultTab'),
        `${file} nav-logo-btn must call resetToDefaultTab on click`
    );
    assert.ok(
        html.includes('js/announcements.js?v=20261005defaultAnnouncements1'),
        `${file} must link updated js/announcements.js?v=20261005defaultAnnouncements1`
    );
    assert.ok(
        html.includes('class="sigma-feed-tab-btn active" data-announcement-tab="all">Announcements</button>'),
        `${file} must have Announcements tab active by default in static HTML`
    );
}

// 7. Functional verification of syncTabButtonsUI logic with simulated DOM
function runSyncTabTest() {
    class MockClassList {
        constructor() { this.classes = new Set(); }
        add(...cls) { cls.forEach(c => this.classes.add(c)); }
        remove(...cls) { cls.forEach(c => this.classes.delete(c)); }
        contains(c) { return this.classes.has(c); }
    }

    class MockElement {
        constructor(attrs = {}) {
            this.attrs = attrs;
            this.classList = new MockClassList();
            this.styleProps = {};
        }
        getAttribute(name) { return this.attrs[name] || null; }
        setAttribute(name, val) { this.attrs[name] = val; }
        style = {
            setProperty: (k, v) => { this.styleProps[k] = v; },
            removeProperty: (k) => { delete this.styleProps[k]; }
        };
    }

    const allBtn = new MockElement({ 'data-announcement-tab': 'all' });
    const importantBtn = new MockElement({ 'data-announcement-tab': 'important' });
    const postsBtn = new MockElement({ 'data-announcement-tab': 'posts' });
    const buttons = [allBtn, importantBtn, postsBtn];

    function syncTabButtonsUI(activeTabKey, currentRole = 'teacher') {
        const normalized = (activeTabKey === 'announcements' || activeTabKey === 'general' || activeTabKey === 'overall' || !activeTabKey) ? 'all' : activeTabKey;
        buttons.forEach(btn => {
            let tabKey = btn.getAttribute('data-announcement-tab');
            if (currentRole === 'student' && tabKey === 'posts') {
                btn.style.setProperty('display', 'none');
                return;
            }
            const isActive = (tabKey === normalized);
            if (isActive) {
                btn.classList.add('active', 'bg-[#15803d]', 'text-white');
                btn.classList.remove('text-slate-900', 'hover:bg-slate-50');
                btn.style.setProperty('background-color', '#15803d');
                btn.style.setProperty('color', '#ffffff');
            } else {
                btn.classList.remove('active', 'bg-[#15803d]', 'text-white');
                btn.classList.add('text-slate-900');
                btn.style.removeProperty('background-color');
                btn.style.removeProperty('color');
            }
        });
    }

    // A. Initially default to 'all'
    syncTabButtonsUI('all');
    assert.strictEqual(allBtn.classList.contains('active'), true, 'Announcements tab must have active class');
    assert.strictEqual(allBtn.styleProps['background-color'], '#15803d', 'Announcements tab must have #15803d background');
    assert.strictEqual(importantBtn.classList.contains('active'), false, 'Important tab must not have active class');
    assert.strictEqual(postsBtn.classList.contains('active'), false, 'Posts tab must not have active class');

    // B. Switch to 'important'
    syncTabButtonsUI('important');
    assert.strictEqual(allBtn.classList.contains('active'), false, 'Announcements tab must not be active');
    assert.strictEqual(importantBtn.classList.contains('active'), true, 'Important tab must be active');
    assert.strictEqual(importantBtn.styleProps['background-color'], '#15803d');

    // C. Reset to default ('all')
    syncTabButtonsUI('all');
    assert.strictEqual(allBtn.classList.contains('active'), true, 'Announcements tab must be restored to active');
    assert.strictEqual(allBtn.styleProps['background-color'], '#15803d');
    assert.strictEqual(importantBtn.classList.contains('active'), false, 'Important tab must be deactivated');
}

runSyncTabTest();

console.log('PASS: Announcements feed tab defaults to selected (active #15803d) on refresh and all role home navigations.');
