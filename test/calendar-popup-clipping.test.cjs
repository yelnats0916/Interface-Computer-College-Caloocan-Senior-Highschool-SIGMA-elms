const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

(async () => {
    const source = fs.readFileSync(path.join(__dirname, '../js/calendar.js'), 'utf8');
    const helpers = source.slice(source.indexOf('    const monthNames = ['), source.indexOf('    function updateTopbarCalendarDate()'));
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        for (const portal of ['admin', 'teacher', 'student']) {
            for (const width of [390, 1200]) {
                const page = await browser.newPage({ viewport: { width, height: 800 } });
                await page.setContent('<div id="clipper" style="overflow:hidden;position:relative;height:180px;margin:80px 16px 0"><div id="anchor" style="position:relative;width:220px;height:36px;margin:auto"><button>October 2026</button></div></div><div style="height:200px;background:white;border-top:1px solid #ddd">Panel footer</div>');
                for (const css of [portal + '.css', 'tailwind.css', 'calendar.css', 'classroom-room.css', 'mobile.css']) await page.addStyleTag({ path: path.join(__dirname, '../css', css) });
                await page.addStyleTag({ content: 'html,body{min-width:0!important;margin:0!important}' });
                await page.evaluate(code => eval(code), helpers);
                await page.evaluate(() => {
                    const outside = document.createElement('button');
                    outside.id = 'outside-calendar';
                    outside.textContent = 'Outside control';
                    outside.style.cssText = 'position:fixed;bottom:10px;left:10px';
                    outside.addEventListener('pointerdown', event => event.stopPropagation());
                    outside.addEventListener('click', event => event.stopPropagation());
                    document.body.appendChild(outside);
                });
                for (const id of ['calendar-custom-month-picker', 'attendance-page-month-picker', 'teacher-attendance-calendar-popup', 'student-attendance-calendar-popup']) {
                    await page.evaluate(id => {
                        const popup = document.createElement('div');
                        popup.id = id;
                        popup.className = 'teacher-attendance-calendar-popup hidden';
                        document.getElementById('anchor').appendChild(popup);
                        popup.innerHTML = window.renderSigmaCalendarDayPanel({ year: 2026, month: 9, activeYear: 2026, activeMonth: 9, activeDay: 11, onDaySelect: 'testSelectDay', footer: '<div class="cal-picker-footer"><button type="button">Today</button><button type="button">Months view</button></div>' });
                        window.testSelectDay = () => popup.classList.add('hidden');
                        window.prepareSigmaCalendarPopup(popup);
                        popup.classList.remove('hidden');
                    }, id);
                    await page.waitForTimeout(100);
                    const popup = page.locator('#' + id);
                    const check = await popup.evaluate(el => {
                        const rect = el.getBoundingClientRect(), anchor = document.getElementById('anchor').getBoundingClientRect();
                        const footer = el.querySelector('.cal-picker-footer').getBoundingClientRect();
                        const hit = document.elementFromPoint(footer.left + footer.width / 2, footer.top + footer.height / 2);
                        return { body: el.parentElement === document.body, center: rect.left + rect.width / 2 - anchor.left - anchor.width / 2, footerVisible: el.contains(hit), insideViewport: rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight };
                    });
                    assert.equal(check.body, true);
                    assert.ok(Math.abs(check.center) < 1);
                    assert.equal(check.footerVisible, true, portal + ': footer must not be clipped');
                    assert.equal(check.insideViewport, true);
                    await popup.locator('.calendar-weekday-header').first().click();
                    assert.equal(await popup.isVisible(), true);
                    await page.locator('#anchor > button').click();
                    assert.equal(await popup.isVisible(), true);
                    await page.locator('#outside-calendar').click();
                    await page.waitForTimeout(100);
                    assert.equal(await popup.isVisible(), false, 'Outside click dismisses even when propagation is stopped');
                    await popup.evaluate(el => el.classList.remove('hidden'));
                    await page.waitForTimeout(100);
                    await page.locator('#outside-calendar').evaluate(el => el.click());
                    await page.waitForTimeout(100);
                    assert.equal(await popup.isVisible(), false, 'Keyboard/programmatic click outside dismisses');
                    await popup.evaluate(el => el.classList.remove('hidden'));
                    await page.waitForTimeout(100);
                    if (portal === 'student' && id === 'student-attendance-calendar-popup') await page.screenshot({ path: path.join(process.env.TEMP, `sigma-calendar-unclipped-${width}.png`) });
                    await page.evaluate(() => document.getElementById('clipper').style.marginTop = '700px');
                    await page.evaluate(() => window.dispatchEvent(new Event('resize')));
                    await page.waitForTimeout(100);
                    assert.equal(await popup.evaluate(el => el.getBoundingClientRect().bottom < document.getElementById('anchor').getBoundingClientRect().top), true);
                    await page.keyboard.press('Escape');
                    await page.waitForTimeout(100);
                    assert.equal(await popup.isVisible(), false);
                    assert.equal(await popup.evaluate(el => el.parentElement.id), 'anchor');
                    await page.evaluate(() => document.getElementById('clipper').style.marginTop = '80px');
                    await popup.evaluate(el => el.classList.remove('hidden'));
                    await page.waitForTimeout(100);
                    await popup.locator('button.calendar-day-cell').last().click();
                    await page.waitForTimeout(100);
                    assert.equal(await popup.isVisible(), false);
                    await popup.evaluate(el => el.remove());
                }
                await page.close();
            }
        }
        console.log('PASS: all calendar popups escape clipping, remain centered, flip above near viewport bottom, and restore on dismissal.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
