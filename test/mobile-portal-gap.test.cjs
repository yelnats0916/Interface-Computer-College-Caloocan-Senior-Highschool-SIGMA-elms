const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const css = fs.readFileSync(path.join(__dirname, '../css/mobile.css'), 'utf8');
const start = css.indexOf('/* Only the standalone quiz editor needs clearance');
const rule = css.slice(start, css.indexOf('}', start) + 1);
assert.ok(rule.includes('body:has(#quiz-action-bar) main'));
assert.ok(rule.includes('padding-top: 70px !important'));
assert.ok(!rule.includes('body:has(#admin-header)'), 'Portal headers must not receive quiz-editor clearance');
assert.ok(css.includes('body:has(#landingMain) main'));
assert.ok(!css.includes('body:not(:has(#admin-header)):not(:has(#quiz-action-bar)) main'), 'Login spacing must not match teacher/student header IDs');
for (const portal of ['student', 'teacher']) {
    const html = fs.readFileSync(path.join(__dirname, `../${portal}.html`), 'utf8');
    assert.ok(html.includes('css/mobile.css?v=20261004portalMobileGap2'));
}
console.log('PASS: mobile quiz clearance is scoped to the editor, both portals load the spacing fix');
