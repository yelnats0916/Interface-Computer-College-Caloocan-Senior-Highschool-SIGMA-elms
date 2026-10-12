const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const renderer = read('js/sigma-analytics.js');
assert.match(renderer, /getDynamicUserPocketCards\(\)\.filter/);
assert.match(renderer, /text\.textContent\.toLocaleLowerCase\(\)\.includes\(query\)/);
assert.match(renderer, /const extraCards = userCards\.slice\(4\)/);
assert.match(renderer, /if \(event\.key === 'Escape'\) closeSearch\(true\)/);
assert.match(renderer, /search\.addEventListener\('submit'/);
assert.match(renderer, /search\.addEventListener\('focusout'/);
assert.match(renderer, /!search\.contains\(event\.target\)/);
assert.equal(renderer.includes('sigma-insight-search-close'), false);
assert.match(renderer, /clearButton\.addEventListener\('click', clearSearch\)/);
assert.match(renderer, /clearButton\.hidden = !input\.value/);
assert.match(renderer, /container\.dataset\.insightSearchQuery = ''/);
assert.match(read('css/sigma-analytics.css'), /focus-within \{ border-color: #FFD000; \}/);
assert.match(read('js/topbar.js'), /window\.renderMobileInsightCards\(\)/);
for (const file of ['student.html', 'teacher.html']) {
    const html = read(file);
    assert.match(html, /class="sigma-insight-search-toggle"/);
    assert.equal(html.includes('sigma-panel-see-all'), false);
    assert.equal(html.includes('collection-pages'), false);
}
for (const file of ['js/student.js', 'js/teacher.js', 'js/admin.js', 'js/notifications.js']) {
    assert.equal(read(file).includes('SigmaCollectionPages'), false);
}
assert.equal(fs.existsSync(path.join(root, 'js/collection-pages.js')), false);
assert.equal(fs.existsSync(path.join(root, 'css/collection-pages.css')), false);
assert.match(read('css/notifications.css'), /#noti-dropdown \.notif-tabs-bar \{ display: none !important; \}/);
assert.match(read('css/sigma-analytics.css'), /mobile-panel-header\.sigma-insight-searching > :not\(\.sigma-insight-search\)/);
console.log('Inline search wiring, all-card filtering, mobile header hiding, and collection-page removal passed');
