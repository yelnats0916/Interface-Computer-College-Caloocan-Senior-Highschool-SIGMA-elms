const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

(async () => {
    const source = fs.readFileSync(path.join(__dirname, '../js/calendar.js'), 'utf8');
    const helper = source.slice(source.indexOf('    const monthNames = ['), source.indexOf('    function updateTopbarCalendarDate()'));
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        for (const portal of ['admin', 'teacher', 'student']) {
            const page = await browser.newPage();
            const ids = ['calendar-custom-month-picker', 'attendance-page-month-picker', 'teacher-attendance-calendar-popup', 'student-attendance-calendar-popup'];
            await page.setContent(ids.map(id => `<div style="position:relative;width:252px;height:36px;margin:24px 24px 350px"><div id="${id}" class="teacher-attendance-calendar-popup"></div></div>`).join(''));
            for (const css of [portal + '.css', 'tailwind.css', 'calendar.css', 'classroom-room.css', 'mobile.css']) await page.addStyleTag({ path: path.join(__dirname, '../css', css) });
            await page.addStyleTag({ content: 'html,body{min-width:0!important;margin:0!important}' });
            await page.evaluate(({ helper, ids }) => {
                eval(helper);
                window.pickerCalls = [];
                window.testYear = delta => window.pickerCalls.push(['year', delta]);
                window.testMonth = month => window.pickerCalls.push(['month', month]);
                for (const id of ids) document.getElementById(id).innerHTML = window.renderSigmaCalendarMonthPanel({ year: 2026, activeYear: 2026, activeMonth: 9, onYearChange: 'testYear', onMonthSelect: 'testMonth' });
            }, { helper, ids });
            for (const width of [390, 1200]) {
                await page.setViewportSize({ width, height: 900 });
                await page.waitForTimeout(250);
                const styles = [];
                for (const id of ids) {
                    const panel = page.locator('#' + id);
                    assert.equal(await panel.locator('.cal-picker-month-btn').count(), 12);
                    assert.equal(await panel.locator('.active').innerText(), 'Oct');
                    styles.push(await panel.evaluate(el => {
                        const s = getComputedStyle(el), header = getComputedStyle(el.querySelector('.cal-picker-header')), month = getComputedStyle(el.querySelector('.cal-picker-month-btn'));
                        return { width: s.width, padding: s.padding, radius: s.borderRadius, left: s.left, transform: s.transform, header: header.display, monthFont: month.fontSize };
                    }));
                    await panel.locator('.cal-picker-month-btn').nth(0).click();
                    await panel.locator('[aria-label="Next Year"]').click();
                }
                for (const s of styles) assert.deepEqual(s, styles[0]);
                assert.equal(styles[0].width, width <= 768 ? '220px' : '240px');
                assert.equal(styles[0].header, 'grid');
            }
            assert.deepEqual(await page.evaluate(() => window.pickerCalls), Array.from({ length: 8 }, () => [['month', 0], ['year', 1]]).flat());
            await page.evaluate(() => {
                window.testDay = (year, month, day) => window.dayCall = [year, month, day];
                document.getElementById('calendar-custom-month-picker').innerHTML = window.renderSigmaCalendarDayPanel({ year: 2024, month: 1, activeYear: 2024, activeMonth: 1, activeDay: 11, today: new Date(2024, 1, 12), onDaySelect: 'testDay' });
            });
            const days = page.locator('#calendar-custom-month-picker');
            assert.equal(await days.locator('button.calendar-day-cell').count(), 29);
            assert.equal(await days.locator('.calendar-day-cell--empty').count(), 4);
            assert.equal(await days.locator('.calendar-day-cell--today').innerText(), '12');
            assert.equal(await days.locator('.calendar-day-cell--selected').innerText(), '11');
            await days.locator('.calendar-day-cell--selected').click();
            assert.deepEqual(await page.evaluate(() => window.dayCall), [2024, 1, 11]);
            await page.close();
        }
        console.log('PASS: all custom calendar panels share month markup, styling, responsive sizing, and callback behavior.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
