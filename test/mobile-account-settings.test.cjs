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

console.log('PASS: Mobile account settings routing, panel dismissal, and header removal verified successfully.');
