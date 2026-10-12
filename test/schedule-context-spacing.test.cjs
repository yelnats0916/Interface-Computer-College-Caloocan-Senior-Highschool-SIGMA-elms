const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { chromium } = require('playwright');
(async () => {
    const root = path.join(__dirname, '..');
    const source = fs.readFileSync(path.join(root, 'js/curriculum-release.js'), 'utf8');
    const start = source.indexOf('<div class="release-context-strip', source.indexOf('Section Context Strip (Shared Standard Format)'));
    const end = source.indexOf('</div>', start) + 6;
    const markup = source.slice(start, end).replace(/\$\{escapeHtml\((\w+)\)\}/g, (_, key) => ({sectionNameOnly:'Rizal',gradeLevel:'Grade 11',roomNumber:'302',schoolYear:'2026-2027'}[key] || '')).replace(/\$\{selectedStudentsSummary\}/g, 'All').replace(/\$\{[^}]+\}/g, '');
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage();
        await page.setContent(`<div id="teacher-topic-schedule-overlay"><div id="teacher-schedule-modal-body">${markup}<div data-material-row style="display:flex;flex-direction:column;gap:4px;padding:12px;border:1px solid #ddd;margin-top:12px"><span>Video:</span><span class="truncate">Understanding Syntax and Data Types</span></div></div></div>`);
        await page.addStyleTag({content:'body{font-family:Arial;margin:20px}.release-context-strip{padding:12px;border:1px solid #ddd;border-radius:8px}'});
        for (const css of ['shared-components.css', 'mobile.css']) await page.addStyleTag({path:path.join(root,'css',css)});
        await page.addStyleTag({content:'html,body{width:auto!important;min-width:0!important}#teacher-topic-schedule-overlay{position:static!important;width:auto!important;min-width:0!important}#teacher-schedule-modal-body{width:auto!important;min-width:0!important}'});
        for (const width of [390,1200]) {
            await page.setViewportSize({width,height:350});
            const gaps = await page.locator('.release-context-strip').evaluate(node => {
                const style=getComputedStyle(node), fields=[...node.children].map(child=>child.getBoundingClientRect());
                return {column:parseFloat(style.columnGap),row:parseFloat(style.rowGap),fields:fields.map(rect=>({left:rect.left,right:rect.right,top:rect.top})),labelGap:parseFloat(getComputedStyle(node.firstElementChild).gap)};
            });
            assert.ok(gaps.column >= 12); assert.ok(gaps.row >= 6); assert.equal(gaps.labelGap,6);
            for(let i=1;i<gaps.fields.length;i++) if(Math.abs(gaps.fields[i].top-gaps.fields[i-1].top)<2) assert.ok(gaps.fields[i].left-gaps.fields[i-1].right>=11);
            assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
            if (width < 768) {
                const boxes = await page.locator('[data-material-row] > span').evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right};}));
                assert.ok(Math.abs(boxes[0].top-boxes[1].top)<2, 'Material label and first title line should align');
                assert.ok(boxes[1].left-boxes[0].right>=7, 'Material label needs an explicit gap');
            }
            await page.screenshot({path:path.join(os.tmpdir(),`sigma-schedule-spacing-${width}.png`)});
        }
        console.log('PASS: shared schedule context spacing, label gaps, desktop/mobile wrapping');
    } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
