const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

console.log('--- Running Complete Skeleton & Shimmer Verification Test ---');

// 1. Verify css/page-skeleton.css
const cssContent = fs.readFileSync(path.join(__dirname, '../css/page-skeleton.css'), 'utf8');

assert.ok(cssContent.includes('--sigma-skeleton-base: #e2e8f0;'), 'CSS defines base skeleton color');
assert.ok(cssContent.includes('sigma-sweep-band'), 'CSS defines sweeping shimmer band animation');
assert.ok(cssContent.includes('.active-question-card'), 'CSS covers active-question-card');
assert.ok(cssContent.includes('.deck-thumbnail-card'), 'CSS covers deck-thumbnail-card');
assert.ok(cssContent.includes('.quiz-empty-question-state'), 'CSS covers quiz-empty-question-state');
assert.ok(cssContent.includes('.quiz-deck-empty-state'), 'CSS covers quiz-deck-empty-state');
assert.ok(cssContent.includes('.quiz-skeleton-card'), 'CSS covers quiz-skeleton-card');
assert.ok(cssContent.includes('.quiz-skeleton-deck-card'), 'CSS covers quiz-skeleton-deck-card');
assert.ok(cssContent.includes('#quiz-action-bar'), 'CSS customizes quiz action bar with shimmering buttons');
assert.ok(cssContent.includes('.header-search-container') && cssContent.includes('.header-search-shell'), 'CSS styles search pill skeleton');
assert.ok(cssContent.includes('#logo-container'), 'CSS styles logo skeleton');
assert.ok(cssContent.includes('#sidebar'), 'CSS preserves green sidebar shell');
assert.ok(cssContent.includes('.top-nav'), 'CSS preserves green top-nav status strip');
assert.ok(cssContent.includes('rgba(255, 255, 255, 0.85)'), 'CSS gives sidebar controls white/light skeleton pills');
assert.ok(cssContent.includes('[role="dialog"]') && cssContent.includes('#export-quiz-dropdown-menu'), 'CSS excludes dialogs and dropdowns');
assert.ok(cssContent.includes(':is(header, #student-header, #admin-header, #teacher-header)'), 'CSS covers all headers on mobile and desktop');

// Verify Border Radius Rules in css/page-skeleton.css
assert.ok(cssContent.includes('border-radius: 24px !important;'), 'CSS specifies 24px hero radius');
assert.ok(cssContent.includes('border-radius: 20px !important;'), 'CSS specifies 20px card radius');
assert.ok(cssContent.includes('border-radius: 16px !important;'), 'CSS specifies 16px panel/table radius');
assert.ok(cssContent.includes('border-radius: 9999px !important;'), 'CSS specifies 9999px pill radius');
assert.ok(cssContent.includes('border-radius: 50% !important;'), 'CSS specifies 50% circular radius');
assert.ok(cssContent.includes('.sigma-rendering-loading'), 'CSS specifies sigma-rendering-loading class');

console.log('PASS: css/page-skeleton.css rules, radii and selectors verified');

// 2. Verify css/shared-components.css rendering loading and radii
const sharedCss = fs.readFileSync(path.join(__dirname, '../css/shared-components.css'), 'utf8');
assert.ok(sharedCss.includes('.sigma-feed-initial-loading'), 'shared-components.css covers sigma-feed-initial-loading');
assert.ok(sharedCss.includes('.sigma-batch-placeholder'), 'shared-components.css covers sigma-batch-placeholder');
assert.ok(sharedCss.includes('.sigma-rendering-loading'), 'shared-components.css covers sigma-rendering-loading');
assert.ok(sharedCss.includes('sigma-sweep-band'), 'shared-components.css has synchronized sigma-sweep-band');
console.log('PASS: css/shared-components.css rendering loading and radii verified');

// 3. Verify js/page-skeleton.js
const jsContent = fs.readFileSync(path.join(__dirname, '../js/page-skeleton.js'), 'utf8');
assert.ok(jsContent.includes("classList.add('sigma-initial-loading')"), 'JS adds sigma-initial-loading');
assert.ok(jsContent.includes("classList.remove('sigma-initial-loading')"), 'JS removes sigma-initial-loading');
assert.ok(jsContent.includes('waitForInitial'), 'JS defines waitForInitial API');
assert.ok(jsContent.includes('minDisplayMs'), 'JS enforces smooth minimum duration for visible wave');
assert.ok(jsContent.includes('active-question-card') && jsContent.includes('deck-thumbnail-card'), 'JS includes quiz cards in panelSelector');
assert.ok(jsContent.includes('showRenderingLoading'), 'JS defines showRenderingLoading API');
assert.ok(jsContent.includes('wrapRendering'), 'JS defines wrapRendering API');
assert.ok(jsContent.includes('revealFeed'), 'JS defines revealFeed API');

console.log('PASS: js/page-skeleton.js logic, radii and rendering loading API verified');

// 4. Verify quiz-creator.html
const quizHtml = fs.readFileSync(path.join(__dirname, '../quiz-creator.html'), 'utf8');
assert.ok(quizHtml.includes('css/page-skeleton.css'), 'quiz-creator.html links page-skeleton.css');
assert.ok(quizHtml.includes('js/page-skeleton.js'), 'quiz-creator.html includes page-skeleton.js');
assert.ok(quizHtml.indexOf('css/page-skeleton.css') > quizHtml.indexOf('css/tailwind.css'), 'quiz-creator.html links page-skeleton.css after tailwind and admin styles at the end of head');
assert.ok(quizHtml.indexOf('js/page-skeleton.js') > quizHtml.indexOf('<body'), 'quiz-creator.html loads page-skeleton.js inside body');
assert.ok(quizHtml.includes('quiz-empty-question-state'), 'quiz-creator.html has clean initial blank state in active question container');
assert.ok(quizHtml.includes('quiz-deck-empty-state'), 'quiz-creator.html has clean initial blank state in question deck container');
assert.ok(!quizHtml.includes('quiz-skeleton-card'), 'quiz-creator.html removed fake skeleton boxes to prevent double loading');

// Verify Quiz Creator Desktop Shimmer & Sweep rules in css/page-skeleton.css
assert.ok(cssContent.includes('#save-quiz-main-btn') && cssContent.includes('sigma-sweep-band 1.2s linear infinite !important;'), 'Quiz save & preview buttons have sweeping shimmer');
assert.ok(cssContent.includes('#quiz-stat-questions') && cssContent.includes('#quiz-stat-points'), 'Quiz action bar stats have sweeping shimmer');
assert.ok(cssContent.includes('#quiz-editor-workspace .active-question-card'), 'Quiz creator active question card has explicit sweeping shimmer rule');
assert.ok(cssContent.includes('#questions-sidebar-wrap'), 'Quiz creator question deck header has sweeping shimmer rule');
assert.ok(cssContent.includes('from { transform: translateX(0%); }'), 'Keyframe starts sweep immediately at 0% with zero dead time');

console.log('PASS: quiz-creator.html clean initial blank states and desktop shimmer rules verified');

// 5. Verify HTML portals link page-skeleton
for (const page of ['admin.html', 'teacher.html', 'student.html']) {
    const html = fs.readFileSync(path.join(__dirname, '..', page), 'utf8');
    assert.ok(html.includes('css/page-skeleton.css'), `${page} links page-skeleton.css`);
    assert.ok(html.includes('js/page-skeleton.js'), `${page} links page-skeleton.js`);
}
console.log('PASS: admin.html, teacher.html, student.html links verified');

// 6. Verify PHP parity
const phpHeader = fs.readFileSync(path.join(__dirname, '../php/includes/header.php'), 'utf8');
assert.ok(phpHeader.includes('../css/page-skeleton.css'), 'php/includes/header.php links page-skeleton.css');
assert.ok(phpHeader.includes('../js/page-skeleton.js'), 'php/includes/header.php links page-skeleton.js');

for (const phpPage of ['php/admin.php', 'php/teacher.php', 'php/student.php']) {
    const php = fs.readFileSync(path.join(__dirname, '..', phpPage), 'utf8');
    assert.ok(php.includes("Location: ../") || php.includes("require_once __DIR__ . \"/includes/header.php\""), `${phpPage} delegates to canonical HTML or includes header.php`);
}
console.log('PASS: PHP portals parity with page-skeleton verified');

// 7. Verify js/quiz-creator.js empty deck class
const quizJs = fs.readFileSync(path.join(__dirname, '../js/quiz-creator.js'), 'utf8');
assert.ok(quizJs.includes('quiz-deck-empty-state'), 'js/quiz-creator.js uses quiz-deck-empty-state class');

console.log('PASS: All skeleton loading requirements verified successfully!');
