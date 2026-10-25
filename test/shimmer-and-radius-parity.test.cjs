const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

console.log('--- Verifying Complete Shimmer, Border Radius & Leakage Fixes ---');

// 1. Check admin.html
const adminHtml = fs.readFileSync(path.join(__dirname, '../admin.html'), 'utf8');
assert.ok(!adminHtml.includes('#admin-main::before'), 'admin.html must NOT contain square linear-gradient #admin-main::before');
assert.ok(!adminHtml.includes('data-sigma-loading="exclude"'), 'admin.html must NOT exclude dashboard metrics container from skeleton rules');
assert.ok(adminHtml.includes('class="sigma-initial-loading"'), 'admin.html root has sigma-initial-loading class');
assert.ok(adminHtml.includes('document.documentElement.classList.add(\'sigma-initial-loading\')'), 'admin.html early script adds sigma-initial-loading');
console.log('PASS: admin.html has no square #admin-main::before placeholder and no metric exclusions.');

// 2. Check teacher.html and student.html
const teacherHtml = fs.readFileSync(path.join(__dirname, '../teacher.html'), 'utf8');
const studentHtml = fs.readFileSync(path.join(__dirname, '../student.html'), 'utf8');
assert.ok(teacherHtml.includes('class="sigma-initial-loading"'), 'teacher.html root has sigma-initial-loading class');
assert.ok(studentHtml.includes('class="sigma-initial-loading"'), 'student.html root has sigma-initial-loading class');
console.log('PASS: teacher.html and student.html have sigma-initial-loading.');

// 3. Check css/page-skeleton.css
const cssContent = fs.readFileSync(path.join(__dirname, '../css/page-skeleton.css'), 'utf8');
assert.ok(cssContent.includes('.pinned-calendar-card'), 'page-skeleton.css covers .pinned-calendar-card');
assert.ok(cssContent.includes('#admin-pinned-calendar-card'), 'page-skeleton.css covers #admin-pinned-calendar-card');
assert.ok(cssContent.includes('#admin-online-now-card'), 'page-skeleton.css covers #admin-online-now-card');
assert.ok(cssContent.includes('#admin-home-right-rail'), 'page-skeleton.css covers #admin-home-right-rail text suppression');
assert.ok(cssContent.includes('i::before'), 'page-skeleton.css suppresses FontAwesome i::before glyphs during initial load');
assert.ok(cssContent.includes('.sigma-skeleton-block.rounded-xl'), 'page-skeleton.css specifies rounded-xl border radius');
assert.ok(cssContent.includes('.sigma-skeleton-block.rounded-lg'), 'page-skeleton.css specifies rounded-lg border radius');
assert.ok(cssContent.includes('animation: sigma-sweep-band 1.2s linear infinite'), 'page-skeleton.css defines continuous sweeping shimmer animation');
console.log('PASS: css/page-skeleton.css suppresses leakage and applies rounded corners and sweeping shimmer.');

// 4. Check js/page-skeleton.js
const jsContent = fs.readFileSync(path.join(__dirname, '../js/page-skeleton.js'), 'utf8');
assert.ok(!jsContent.includes('setTimeout(revealInitial, 150)'), 'js/page-skeleton.js has no 150ms fake timer');
assert.ok(!jsContent.includes('setTimeout(() => revealInitial(true), 350)'), 'js/page-skeleton.js has no 350ms fake timer');
assert.ok(!jsContent.includes("if (document.documentElement.classList.contains('sigma-hash-navigating')) return;"), 'mountEarlyHashSkeleton is not blocked by sigma-hash-navigating');
assert.ok(jsContent.includes('school-sections-view'), 'resolveRouteFromHash covers school-sections-view');
assert.ok(jsContent.includes('school-subjects-view'), 'resolveRouteFromHash covers school-subjects-view');
assert.ok(jsContent.includes('users-view'), 'resolveRouteFromHash covers users-view');
assert.ok(jsContent.includes('audit-ai-view'), 'resolveRouteFromHash covers audit-ai-view');
console.log('PASS: js/page-skeleton.js routes resolved, fake delays removed.');

// 5. Check circling dot spinner
const contentLoadingCss = fs.readFileSync(path.join(__dirname, '../css/content-loading.css'), 'utf8');
const contentLoadingJs = fs.readFileSync(path.join(__dirname, '../js/content-loading.js'), 'utf8');
assert.ok(contentLoadingCss.includes('.sigma-dot-spinner'), 'content-loading.css preserves .sigma-dot-spinner');
assert.ok(contentLoadingCss.includes('sigma-dots-turn'), 'content-loading.css preserves sigma-dots-turn animation');
assert.ok(contentLoadingJs.includes('sigma-dot-spinner'), 'content-loading.js preserves dot spinner integration');
console.log('PASS: content-loading dot spinner preserved without removal.');

console.log('========================================================');
console.log('ALL SHIMMER AND RADIUS PARITY TESTS PASSED!');
console.log('========================================================');
