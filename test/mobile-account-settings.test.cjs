const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// 1. Verify that settings-view.js does NOT contain the duplicated inside-panel header
const settingsViewJs = fs.readFileSync(path.join(__dirname, '../js/settings-view.js'), 'utf8');
assert.ok(
    !settingsViewJs.includes('<h2 class="sigma-account-settings-title">Account Settings</h2>'),
    'settings-view.js must NOT contain the inside-panel Account Settings header'
);

// 2. Verify navigateToAccountSettings closes mobile fullscreen panel and removes lock classes
assert.ok(
    settingsViewJs.includes('window.closeMobileAccountPanel'),
    'navigateToAccountSettings must call closeMobileAccountPanel'
);
assert.ok(
    settingsViewJs.includes("document.body.classList.remove('mobile-account-fullscreen', 'mobile-panel-open')"),
    'navigateToAccountSettings must remove mobile-account-fullscreen and mobile-panel-open from document.body'
);
assert.ok(
    settingsViewJs.includes("document.documentElement.classList.remove('mobile-account-fullscreen', 'mobile-panel-open')"),
    'navigateToAccountSettings must remove mobile-account-fullscreen and mobile-panel-open from document.documentElement'
);

// 3. Verify HTML files trigger closeMobileAccountPanel before navigating to Account Settings
for (const file of ['teacher.html', 'student.html', 'admin.html']) {
    const htmlContent = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    const settingsLinkIdx = htmlContent.indexOf('id="profile-settings-link"');
    assert.ok(settingsLinkIdx !== -1, `${file} must contain #profile-settings-link`);
    const slice = htmlContent.slice(settingsLinkIdx, settingsLinkIdx + 300);
    assert.ok(
        slice.includes('closeMobileAccountPanel'),
        `${file} #profile-settings-link must call closeMobileAccountPanel in its onclick handler`
    );
}

// 4. Verify teacher.js setupNavigationHistory and popstate handle #account-settings
const teacherJs = fs.readFileSync(path.join(__dirname, '../js/teacher.js'), 'utf8');
assert.ok(
    teacherJs.includes("hash.startsWith('#account-settings')"),
    'teacher.js setupNavigationHistory and popstate must handle #account-settings'
);

// 5. Verify topbar.js openMobileAccountPanel does NOT start an unclosed topbar loading bar
const topbarJs = fs.readFileSync(path.join(__dirname, '../js/topbar.js'), 'utf8');
const openMobileAccountFn = topbarJs.slice(topbarJs.indexOf('window.openMobileAccountPanel = function'), topbarJs.indexOf('window.closeMobileAccountPanel = function'));
assert.ok(
    !openMobileAccountFn.includes('showTopNavLoading'),
    'openMobileAccountPanel must NOT call showTopNavLoading because opening a DOM drawer is not an async operation'
);

// 6. Verify settings-view.css uses unified 1023px mobile breakpoint
const settingsCss = fs.readFileSync(path.join(__dirname, '../css/settings-view.css'), 'utf8');
assert.ok(
    !settingsCss.includes('@media (max-width: 768px)'),
    'settings-view.css must not use 768px breakpoint; must be unified to 1023px'
);
assert.ok(
    settingsCss.includes('@media (max-width: 1023px)'),
    'settings-view.css must contain @media (max-width: 1023px)'
);
assert.ok(
    settingsCss.includes('.sigma-account-settings:not(.sigma-settings-detail) > .sigma-settings-main') &&
    settingsCss.includes('display: none !important'),
    'Level 1 must hide .sigma-settings-main on mobile'
);
assert.ok(
    settingsCss.includes('.sigma-account-settings.sigma-settings-detail > .sigma-settings-sidebar') &&
    settingsCss.includes('display: none !important'),
    'Level 2 must hide .sigma-settings-sidebar on mobile'
);

// 7. Verify settings-view.js aligns mobile breakpoint (< 1024) and defaults to list view on mobile
assert.ok(
    settingsViewJs.includes('window.innerWidth < 1024'),
    'settings-view.js must use window.innerWidth < 1024 for mobile detection'
);
assert.ok(
    settingsViewJs.includes('sigma-settings-cat-chevron'),
    'settings-view.js category buttons must contain navigation chevrons'
);
assert.ok(
    settingsCss.includes('.sigma-settings-mobile-back') &&
    settingsCss.includes('background: transparent !important'),
    '.sigma-settings-mobile-back must have transparent background with no permanent highlight box'
);

console.log('PASS: Mobile account settings routing, 2-level flow, and panel dismissal verified successfully.');
