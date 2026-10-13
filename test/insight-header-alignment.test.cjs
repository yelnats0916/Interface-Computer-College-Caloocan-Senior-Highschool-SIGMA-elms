const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage();
        const styles = [...fs.readFileSync('student.html', 'utf8').matchAll(/href="(css\/[^"?]+)(?:\?[^\"]*)?"/g)]
            .map(match => fs.readFileSync(match[1], 'utf8')).join('\n');
        for (const width of [320, 375, 469, 1280]) {
            await page.setViewportSize({ width, height: 800 });
            const heights = [];
            for (const title of ['Quiz Review', 'Task 1: Variable Declaration Practice With Different Data Types And Additional Programming Examples']) {
                await page.setContent(`<style>${styles}</style><div id="${width > 767 ? 'desktop-insight-cards' : 'analytics-dropdown-cards'}" style="display:block;width:${Math.min(width, 360)}px">
                    <div class="sigma-card pocket-card sigma-card--student pocket-card--student sigma-card--insight">
                        <div class="bg-[#15803d] px-4 py-2 flex items-center justify-between flex-shrink-0 h-[38px] leading-none sigma-insight-header">
                            <h4 class="sigma-insight-title"><button class="sigma-insight-open"><i class="fa-solid fa-clipboard"></i><span>${title}</span></button></h4>
                            <div class="flex items-center gap-2 flex-shrink-0 leading-none sigma-insight-actions"><span class="sigma-insight-new-badge">New</span><button class="sigma-card-pin-btn pocket-card-pin-btn"><i class="fa-solid fa-thumbtack"></i></button></div>
                        </div>
                    </div></div>`);
                const geometry = await page.evaluate(() => {
                    const span = document.querySelector('.sigma-insight-open > span');
                    const range = document.createRange();
                    range.setStart(span.firstChild, 0);
                    range.setEnd(span.firstChild, 4);
                    const firstLine = range.getBoundingClientRect();
                    const center = selector => {
                        const rect = document.querySelector(selector).getBoundingClientRect();
                        return rect.y + rect.height / 2;
                    };
                    const header = document.querySelector('.sigma-insight-header').getBoundingClientRect();
                    const icon = document.querySelector('.sigma-insight-open > i').getBoundingClientRect();
                    return { firstLine: firstLine.y + firstLine.height / 2, centers: ['.sigma-insight-open > i', '.sigma-insight-new-badge', '.sigma-card-pin-btn > i'].map(center), height: header.height, bottom: header.bottom, textBottom: span.getBoundingClientRect().bottom, leftInset: icon.left - header.left, topInset: icon.top - header.top };
                });
                for (const center of geometry.centers) assert.ok(Math.abs(center - geometry.firstLine) <= 2, JSON.stringify({ width, title, geometry }));
                assert.ok(geometry.bottom >= geometry.textBottom + 9);
                assert.equal(geometry.leftInset, 16);
                assert.equal(geometry.topInset, 10);
                heights.push(geometry.height);
            }
            assert.ok(heights[1] > heights[0], `Wrapped title must grow header at ${width}px: ${heights}`);
        }
        console.log('Insight header alignment passed for single-line and wrapped titles on desktop/mobile.');
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
