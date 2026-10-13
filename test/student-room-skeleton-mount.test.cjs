const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../js/student.js'), 'utf8');
const start = source.indexOf("        let content = document.getElementById('class-detail-content') || document.getElementById('classroom-detail-content')");
const end = source.indexOf('        const classmates', start);
assert.ok(start > 0 && end > start);
const root = { innerHTML: 'skeleton', querySelectorAll: () => [] };
const read = nodes => vm.runInNewContext(`(function(){${source.slice(start, end)} return content;})()`, {
    document: { getElementById: id => nodes[id] || null }
});
assert.equal(read({ 'section-classroom-detail': root }), root, 'Initial skeleton section must be a render target');
const content = { innerHTML: 'room' };
assert.equal(read({ 'section-classroom-detail': root, 'class-detail-content': content }), content, 'Existing room content retains priority');
assert.equal(read({}), undefined, 'Missing section exits safely');
console.log('PASS: student Room has a valid render target with skeleton-only initial markup.');
const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage();
        await page.setContent('<section id="section-classroom-detail"><div>Skeleton</div></section>');
        const renderStart = source.indexOf('        if (content) {', end);
        const renderEnd = source.indexOf("        if (activeStudentRoomTab === 'topics')", renderStart);
        assert.ok(renderStart > end && renderEnd > renderStart);
        for (const tab of ['room', 'attendance', 'room', 'attendance']) {
            await page.evaluate(({ code, tab }) => {
                const render = new Function('content', 'bannerHtml', 'tabBarHtml', 'tabContentHtml', code);
                render(document.querySelector('#class-detail-content') || document.querySelector('#section-classroom-detail'),
                    '<div class="test-banner">Banner</div>', '<div id="student-classroom-tabs-wrapper">Tabs</div>', `<p>${tab}</p>`);
            }, { code: source.slice(renderStart, renderEnd), tab });
            assert.equal(await page.locator('.test-banner').count(), 1);
            assert.equal(await page.locator('.classroom-detail-shell').count(), 1);
            assert.equal(await page.locator('#class-detail-content').innerText(), tab);
        }
        console.log('PASS: repeated Room/Attendance switches retain one banner, tab bar and shell.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
