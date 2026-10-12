const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage();
        await page.goto('http://127.0.0.1:5519/student.html');
        await page.evaluate(() => {
            document.body.innerHTML = '<main></main>';
            localStorage.clear();
            const student = { id: 's1', name: 'Student One', role: 'student' };
            sessionStorage.setItem('sigma-authenticated-user', JSON.stringify(student));
            window.getLoggedInStudentUser = () => student;
            localStorage.setItem('sigma-admin-users', JSON.stringify([student, { id: 't1', name: 'Teacher One', role: 'teacher' }]));
            localStorage.setItem('sigma-admin-subjects', JSON.stringify([{ id: 'prog1', name: 'Programming' }]));
            localStorage.setItem('sigma-admin-sections', JSON.stringify([{ name: 'Rizal', subject: 'Programming', teacher: 'Teacher One' }]));
        });
        await page.addScriptTag({ content: fs.readFileSync(path.join(__dirname, '../js/private-assessment-comments.js'), 'utf8') });
        async function mount(studentId) {
            await page.evaluate(studentId => {
                document.querySelector('main').innerHTML = '<div data-private-comment-context></div>';
                document.querySelector('[data-private-comment-context]').dataset.privateCommentContext = JSON.stringify({ role: 'student', studentId, subjectId: 'prog1', section: 'Rizal', quarter: 1, assessmentId: 'task1' });
                window.mountPrivateAssessmentComments(document);
            }, studentId);
        }
        await mount('s1');
        await page.locator('textarea').fill('Private question before submission');
        await page.locator('button[type=submit]').click();
        assert.equal(await page.locator('.private-comment-messages').textContent().then(t => t.includes('Private question')), true);
        await mount('s2');
        assert.equal(await page.locator('textarea').count(), 0);
        assert.equal((await page.locator('main').textContent()).includes('Private question'), false);
        await mount('s1');
        assert.equal((await page.locator('main').textContent()).includes('Private question'), true);
        const state = await page.evaluate(() => ({ logs: JSON.parse(localStorage.getItem('sigma-activity-logs-v1')), submission: localStorage.getItem('sigma_student_assessment_submissions') }));
        assert.equal(state.logs.at(-1).action, 'Comment posted');
        assert.equal(JSON.stringify(state.logs).includes('Private question'), false);
        assert.equal(state.submission, null);
        console.log('PASS: private scope, persistence, metadata-only activity log and no fabricated submission');
    } finally { await browser.close(); }
})();
