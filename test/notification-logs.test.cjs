const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js/notifications.js'), 'utf8');
const storage = new Map();
const logsKey = 'sigma-notification-logs-v1';
let failStudent = false;
const document = { readyState: 'loading', getElementById: () => null, querySelector: () => null, addEventListener() {} };
const window = { addEventListener() {}, dispatchEvent() {}, matchMedia: () => ({ matches: false, addEventListener() {} }) };
const localStorage = { getItem: key => storage.get(key) || null, setItem(key, value) {
    if (failStudent && key === 'sigma-notifications-student-v3') throw new Error('Test storage failure');
    storage.set(key, value);
} };
const context = { window, document, localStorage, sessionStorage: { getItem: () => '{}' },
    location: { pathname: '/admin.html' }, Event: class {}, console: { error() {} } };
vm.runInNewContext(source, context);
const notification = { id: 'real-release', type: 'assessment-released', title: '<img src=x onerror=alert(1)>',
    recipientId: '2222222', recipientName: 'Juan Abad Dela Cruz', read: false,
    assignmentScope: { subjectId: 'prog1', section: 'Rizal' }, target: { materialTitle: 'Task 1' } };
window.SigmaNotifications.sendToRole('student', notification);
window.SigmaNotifications.sendToRole('student', notification);
let logs = window.SigmaNotifications.getLogs();
assert.equal(logs.length, 1);
assert.equal(logs[0].status, 'Stored in-app');
assert.equal(logs[0].recipientId, '2222222');
assert.equal(logs[0].related, 'Task 1');
assert.equal(logs[0].readAt, null);
assert.equal(JSON.parse(storage.get('sigma-notifications-student-v3')).length, 1);
window.SigmaNotifications.add({ id: 'admin-real', title: 'System Notice', read: false });
assert.equal(window.SigmaNotifications.getLogs().length, 2);
window.SigmaNotifications.loadDemoData();
assert.equal(window.SigmaNotifications.getLogs().length, 2, 'Demo feeds are not recorded as real sends');
window.SigmaNotifications.clearAll();
assert.equal(window.SigmaNotifications.getLogs().length, 2, 'Clearing a feed preserves its audit trail');
failStudent = true;
window.SigmaNotifications.sendToRole('student', { ...notification, id: 'failed' });
assert.equal(window.SigmaNotifications.getLogs()[0].status, 'Failed to store');
failStudent = false;
window.SigmaNotifications.sendToRole('student', { ...notification, id: 'failed' });
assert.equal(window.SigmaNotifications.getLogs()[0].status, 'Stored in-app', 'Retry updates the existing record');
// Exercise the actual read-state recording branch through a student portal.
const studentWindow = { ...window, getLoggedInStudentUser: () => ({ id: '2222222' }) };
const studentContext = { ...context, window: studentWindow, location: { pathname: '/student.html' } };
vm.runInNewContext(source.replace('    window.renderNotificationsFeed = renderFeed;', '    window.testSaveNotifications = saveNotifications;\n    window.renderNotificationsFeed = renderFeed;'), studentContext);
studentWindow.testSaveNotifications([{ ...notification, read: true }]);
assert(studentWindow.SigmaNotifications.getLogs().find(log => log.notificationId === notification.id).readAt);
assert.equal(window.SigmaNotifications.getLogs().length, 3);

(async () => {
    const { chromium } = require('playwright');
    const browser = await chromium.launch({ headless: true, channel: 'chrome' });
    try {
        const page = await browser.newPage();
        const html = fs.readFileSync(path.join(root, 'admin.html'), 'utf8');
        const start = html.indexOf('<section id="audit-notifications-view"');
        const section = html.slice(start, html.indexOf('</section>', start) + 10).replace('dynamic-section hidden', 'dynamic-section');
        await page.setContent('<style>*{box-sizing:border-box}body{margin:0}.flex{display:flex}.flex-col{flex-direction:column}.flex-1{flex:1}.min-w-0{min-width:0}.overflow-x-auto{overflow-x:auto}.hidden{display:none}[hidden]{display:none!important}</style><input id="searchBar" aria-label="Header search"><button id="globalSearchBtn">Search</button><section id="audit-ai-view"><aside class="audit-log-sidebar"><nav><button class="audit-log-tab active">AI Logs</button><button class="audit-log-tab">Activity Logs</button><button class="audit-log-tab">Authentication Logs</button></nav></aside></section>' + section);
        await page.addStyleTag({ path: path.join(root, 'css/admin.css') });
        await page.addStyleTag({ path: path.join(root, 'css/forms.css') });
        await page.addStyleTag({ path: path.join(root, 'css/log-pagination.css') });
        await page.addScriptTag({ path: path.join(root, 'js/log-pagination.js') });
        await page.evaluate(records => {
            window.testLogs = records;
            window.SigmaNotifications = { getLogs: () => window.testLogs };
            window.switchTab = id => { window.selectedTestTab = id; };
        }, Array.from({ length: 36 }, (_, i) => ({ ...logs[0], id: String(i), title: i === 0 ? notification.title : `Assessment release ${i}`, timestamp: '2026-10-10T06:36:00Z' })));
        await page.addScriptTag({ path: path.join(root, 'js/notification-logs.js') });
        const topbar = fs.readFileSync(path.join(root, 'js/topbar.js'), 'utf8');
        await page.addScriptTag({ content: topbar.slice(topbar.indexOf('    // Global Search Key Handler'), topbar.indexOf('    // 6. Mobile Search Toggle')) });
        await page.evaluate(() => {
            window.globalSearchQueries = [];
            window.addEventListener('sigma:search', event => window.globalSearchQueries.push(event.detail.query));
        });
        assert.equal(await page.locator('#notification-log-search').count(), 0);
        assert.equal(await page.locator('#notification-log-rows tr:visible').count(), 20);
        assert.equal(await page.locator('#notification-log-rows img').count(), 0, 'Log content uses textContent, not HTML');
        await page.getByRole('button', { name: 'Next page', exact: true }).click();
        assert.equal(await page.locator('#notification-log-rows tr:visible').count(), 16);
        await page.locator('#searchBar').fill('release 35');
        await page.locator('#globalSearchBtn').click();
        assert.equal(await page.locator('#notification-log-rows tr:visible').count(), 16, 'Header search must not filter notification logs');
        await page.locator('#searchBar').fill('release 34');
        await page.locator('#searchBar').press('Enter');
        assert.deepEqual(await page.evaluate(() => window.globalSearchQueries), ['release 35', 'release 34'], 'Click and Enter retain global search routing');
        await page.locator('#searchBar').fill('');
        await page.locator('#globalSearchBtn').click();
        assert.equal(await page.locator('#notification-log-rows tr:visible').count(), 16, 'Clearing global search preserves log pagination');
        assert.equal(await page.evaluate(() => typeof window.applyNotificationLogSearch), 'undefined');
        await page.locator('#notification-log-navigation button').last().click();
        assert.equal(await page.evaluate(() => window.selectedTestTab), 'nav-audit-notifications');
        for (const width of [1440, 390]) {
            await page.setViewportSize({ width, height: 850 });
            assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `No page overflow at ${width}`);
            await page.screenshot({ path: path.join(process.env.TEMP, `notification-logs-${width}.png`), fullPage: true });
        }
        await page.evaluate(() => { window.testLogs = []; window.renderNotificationLogs(); });
        assert.equal(await page.locator('#notification-log-rows tr').count(), 6);
        assert.equal(await page.locator('#notification-log-count').count(), 0);
        assert((await page.locator('#notification-log-rows').textContent()).includes('(sample)'));
        assert.equal(await page.evaluate(() => window.SigmaNotifications.getLogs().length), 0, 'Samples do not become real audit records');
        await page.evaluate(() => {
            window.testLogs = [{ recipient: 'Real Recipient', title: 'Real notification', timestamp: '2026-10-10T07:00:00Z' }];
            window.renderNotificationLogs();
        });
        assert.equal(await page.locator('#notification-log-rows tr').count(), 1);
        assert(!(await page.locator('#notification-log-rows').textContent()).includes('(sample)'), 'Real logs replace the preview');
        const php = fs.readFileSync(path.join(root, 'php/admin.php'), 'utf8');
        assert(php.includes('id="audit-notifications-view"'));
        assert(php.includes('js/notification-logs.js'));
        assert(!php.includes('id="notification-log-search"'));
    } finally { await browser.close(); }
    console.log('PASS: real notification logging, duplicates, read state, failure/retry, retained audits, independent global search, pagination, safe content, desktop/mobile layout');
})().catch(error => { console.error(error); process.exitCode = 1; });
