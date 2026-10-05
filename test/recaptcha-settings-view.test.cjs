const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const adminHtml = fs.readFileSync(path.join(__dirname, '../admin.html'), 'utf8');
const phpViews = fs.readFileSync(path.join(__dirname, '../php/includes/system_settings_views.php'), 'utf8');
const adminJs = fs.readFileSync(path.join(__dirname, '../js/admin.js'), 'utf8');

// 1. Check HTML/PHP structure
assert.ok(adminHtml.includes('id="settings-recaptcha-view"'), 'admin.html contains settings-recaptcha-view');
assert.ok(phpViews.includes('id="settings-recaptcha-view"'), 'system_settings_views.php contains settings-recaptcha-view');

assert.ok(adminHtml.includes('id="recaptchaTestModal"'), 'admin.html contains recaptchaTestModal');
assert.ok(phpViews.includes('id="recaptchaTestModal"'), 'system_settings_views.php contains recaptchaTestModal');

assert.ok(adminHtml.includes('onclick="window.openRecaptchaSettingsPage()"'), 'admin.html has Manage reCAPTCHA button');
assert.ok(phpViews.includes('onclick="window.openRecaptchaSettingsPage()"'), 'system_settings_views.php has Manage reCAPTCHA button');

assert.ok(adminHtml.includes('onclick="window.openRecaptchaTestModal()"'), 'admin.html has Test reCAPTCHA modal trigger');
assert.ok(phpViews.includes('onclick="window.openRecaptchaTestModal()"'), 'system_settings_views.php has Test reCAPTCHA modal trigger');

// 2. Check JS functions
assert.ok(adminJs.includes('window.openRecaptchaSettingsPage'), 'admin.js defines openRecaptchaSettingsPage');
assert.ok(adminJs.includes('window.loadRecaptchaPageData'), 'admin.js defines loadRecaptchaPageData');
assert.ok(adminJs.includes('window.saveRecaptchaPageSettings'), 'admin.js defines saveRecaptchaPageSettings');
assert.ok(adminJs.includes('window.openRecaptchaTestModal'), 'admin.js defines openRecaptchaTestModal');
assert.ok(adminJs.includes('window.closeRecaptchaTestModal'), 'admin.js defines closeRecaptchaTestModal');
assert.ok(adminJs.includes('window.resetRecaptchaTestModal'), 'admin.js defines resetRecaptchaTestModal');
assert.ok(adminJs.includes('window.runRecaptchaTestChallenge'), 'admin.js defines runRecaptchaTestChallenge');

// 3. Check route handling
assert.ok(adminJs.includes("'nav-settings-recaptcha': 'settings-recaptcha-view'"), 'admin.js maps nav-settings-recaptcha to settings-recaptcha-view');
assert.ok(adminJs.includes("case 'settings-recaptcha-view':"), 'admin.js checks access permissions for settings-recaptcha-view');

console.log('PASS: All reCAPTCHA settings page and test modal checks passed successfully.');
