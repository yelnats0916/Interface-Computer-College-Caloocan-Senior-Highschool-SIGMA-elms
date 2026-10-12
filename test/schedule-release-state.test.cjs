const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage();
        await page.route('**/php/api/**', route => route.abort());
        await page.goto('http://127.0.0.1:5519/test/release-workspace.html');
        await page.waitForFunction(() => window.openTeacherUnifiedScheduleModal && window.SigmaDateTimeInputs);
        async function open(schedule, stamp, edit = true) {
            await page.evaluate(({ schedule, stamp, edit }) => {
                document.getElementById('teacher-topic-schedule-overlay')?.remove();
                delete window._learningMaterialsReleaseDraftState;
                window._unifiedPickerSelection = null;
                window.getLearningMaterialReleaseConfig = () => ({
                    releasedMaterialIds: stamp ? ['lesson-a'] : [],
                    materialSchedules: schedule ? { 'lesson-a': schedule } : {},
                    materialReleaseDates: stamp ? { 'lesson-a': stamp } : {},
                    assignedStudents: { 'lesson-a': ['fixture-student-1', 'fixture-student-2'] }
                });
                window.openTeacherUnifiedScheduleModal('learning', 'lesson-a', 'Released Lesson', 'schedule', edit ? 'schedule' : '');
            }, { schedule, stamp, edit });
            await page.waitForFunction(() => document.getElementById('teacher-schedule-helper-text')?.textContent.trim());
        }
        const date = page.locator('#teacher-exact-date-input');
        const time = page.locator('#teacher-time-input');
        const checkbox = page.locator('#teacher-schedule-release-now-chk');
        const save = page.locator('#teacher-save-schedule-btn');
        const helper = page.locator('#teacher-schedule-helper-text');

        await open('', '', false);
        assert.equal(await date.inputValue(), '');
        assert.equal(await time.inputValue(), '');
        assert.equal(await checkbox.isChecked(), true);
        await page.locator('.sigma-date-time-empty:not([hidden])').first().waitFor();
        assert.match(await helper.innerText(), /immediately when you save/);
        await checkbox.uncheck();
        assert.equal(await date.inputValue(), '');
        assert.equal(await time.inputValue(), '');
        assert.equal(await save.isDisabled(), true);
        await date.fill('2099-12-25');
        await time.fill('13:37');
        await checkbox.check();
        assert.equal(await date.inputValue(), '');
        await checkbox.uncheck();
        assert.equal(await date.inputValue(), '2099-12-25');
        assert.equal(await time.inputValue(), '13:37');

        await open('', '2025-01-15T05:45:00Z');
        assert.equal(await date.inputValue(), '');
        assert.equal(await time.inputValue(), '');
        assert.match(await helper.innerText(), /^Released on /);
        assert.doesNotMatch(await helper.innerText(), /Already/i);
        assert.equal(await save.isDisabled(), true);

        for (const schedule of ['2025-01-15T13:45', '2099-12-25T13:37']) {
            await open(schedule, schedule);
            assert.equal(await date.inputValue(), schedule.split('T')[0]);
            assert.equal(await time.inputValue(), schedule.split('T')[1]);
            assert.match(await helper.innerText(), schedule.startsWith('2025') ? /^Released on / : /^Scheduled to release on /);
            assert.equal(await save.isDisabled(), true);
            await checkbox.check();
            await checkbox.uncheck();
            assert.equal(await date.inputValue(), schedule.split('T')[0]);
            assert.equal(await time.inputValue(), schedule.split('T')[1]);
            assert.equal(await save.isDisabled(), true);
        }
        await page.evaluate(() => {
            window.saveUnifiedReleaseConfig = (prefix, subject, section, config) => {
                if (prefix === 'sigma_learning_release') window.savedScheduleFixture = JSON.parse(JSON.stringify(config));
                return true;
            };
        });
        await open('', '', false);
        await page.evaluate(() => window.saveTeacherUnifiedSchedule('learning'));
        const immediate = await page.evaluate(() => window.savedScheduleFixture);
        assert.ok(immediate.materialReleaseDates['lesson-a']);
        assert.equal(immediate.materialSchedules['lesson-a'], undefined);

        await open('', immediate.materialReleaseDates['lesson-a']);
        await checkbox.uncheck();
        await date.fill('2099-12-25');
        await time.fill('13:37');
        await page.evaluate(() => window.saveTeacherUnifiedSchedule('learning'));
        const scheduled = await page.evaluate(() => window.savedScheduleFixture);
        assert.equal(scheduled.materialSchedules['lesson-a'], '2099-12-25T13:37');
        await open(scheduled.materialSchedules['lesson-a'], scheduled.materialReleaseDates['lesson-a']);
        assert.equal(await time.inputValue(), '13:37');
        assert.equal(await save.isDisabled(), true);

        await open('', '2025-01-15T05:45:00Z');
        await page.evaluate(() => window.saveTeacherUnifiedSchedule('learning'));
        assert.equal(await page.evaluate(() => window.savedScheduleFixture.materialReleaseDates['lesson-a']), '2025-01-15T05:45:00Z');
        console.log('PASS: immediate and scheduled save/reopen, original timestamp preservation, dashes, toggle restoration, past schedules, Released on wording, unchanged save state');
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exit(1); });
