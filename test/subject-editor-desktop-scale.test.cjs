const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js/subject-editor.js'), 'utf8');
const topicStart = source.indexOf('<!-- Topic Header Row (Full Width & Generous Clickable Target) -->');
const topicEnd = source.indexOf('<!-- Topic Materials Dropdown Content -->', topicStart);
const topic = source.slice(topicStart, topicEnd)
    .replace(/\$\{topic\.id !== '_unassigned' && isOwnTopic \? `[\s\S]*?` : ''\}/, '')
    .replace(/\$\{isViewOnlyScope && authorRole === 'Teacher' \? `[\s\S]*?` : ''\}/, '')
    .replace(/\$\{topic\.id === '_unassigned' \?[\s\S]*?\(index \+ 1\)\}/, '1')
    .replace(/\$\{[^}]*\}/g, '');
const headerStart = source.indexOf('<div id="subject-modal-header"');
const header = source.slice(headerStart, source.indexOf('<!-- Segmented Navigation Header -->', headerStart)) + '</div>';
const toolbarStart = source.indexOf('<div id="subject-materials-quarter-bar"');
const toolbar = source.slice(toolbarStart, source.indexOf('<!-- Materials Topic Sections Container -->', toolbarStart));
const bodyTag = source.match(/<div id="subject-edit-form-body"[^>]*>/)[0];
const menuStart = source.indexOf('<div id="topic-row-menu-');
const menu = source.slice(menuStart, source.indexOf('</div>', menuStart) + 6)
    .replace(/\$\{[^}]*\}/g, 'test').replace('shared-kebab-menu hidden', 'shared-kebab-menu');
const cssFor = role => {
    const html = fs.readFileSync(path.join(root, `${role}.html`), 'utf8');
    return [...html.matchAll(/href="(css\/[^"?]+\.css)(?:\?[^\"]*)?"/g)]
        .map(match => `<style>${fs.readFileSync(path.join(root, match[1]), 'utf8')}</style>`).join('');
};

(async () => {
    const browser = await chromium.launch({ headless: true, channel: 'chrome' });
    try {
        const results = {};
        for (const width of [1536, 1024, 390]) {
            for (const role of ['admin', 'teacher']) {
                const page = await browser.newPage({ viewport: { width, height: 900 } });
                await page.setContent(`${cssFor(role)}<body class="${role}-portal">
                    <div id="subject-edit-overlay" class="content-mode ${role === 'teacher' ? 'teacher-mode' : ''}">
                        <div class="sigma-modal-shell"><div class="sigma-modal-panel">
                            ${header}
                            ${bodyTag}
                                <div id="subject-materials-main-view" class="space-y-5">
                                    <div class="mb-1 hidden"></div>
                                    ${toolbar}
                                    <div id="subject-topic-panel-test" class="border rounded-2xl">${topic}</div>
                                </div>
                            </div>
                        </div></div>
                    </div></body>`);
                await page.locator('#subject-materials-main-view').evaluate((element, markup) => {
                    const anchor = document.createElement('div');
                    anchor.className = 'relative';
                    anchor.innerHTML = markup;
                    element.append(anchor);
                }, menu);
                await page.evaluate(role => {
                    document.getElementById('subject-editor-title').textContent = 'Add/Edit Topics & Materials';
                    document.getElementById('subject-header-actions').classList.add('hidden');
                    for (const id of ['subject-content-add-topic-btn', 'subject-content-reorder-btn']) {
                        document.getElementById(id).classList.remove('hidden');
                    }
                    if (role === 'admin') document.getElementById('subject-material-scope-container').classList.remove('hidden');
                    document.getElementById('subject-materials-quarter-pills').innerHTML =
                        '<button class="bg-white rounded-lg">1st Quarter</button><button class="rounded-lg">2nd Quarter</button>';
                }, role);
                await page.locator('#subject-topic-panel-test h4').evaluate(element => { element.textContent = 'Basic Syntax and Data Types'; });
                await page.locator('#subject-topic-panel-test span').first().evaluate(element => { element.textContent = '6 Materials'; });
                const metrics = await page.evaluate(() => {
                    const row = document.querySelector('#subject-topic-panel-test > div');
                    const badge = row.firstElementChild.firstElementChild;
                    const measure = element => {
                        const style = getComputedStyle(element);
                        return Object.fromEntries(['fontSize', 'fontWeight', 'width', 'height', 'padding', 'borderRadius', 'gap']
                            .map(key => [key, style[key]]));
                    };
                    const rowSize = measure(row);
                    delete rowSize.fontSize;
                    return { row: rowSize, badge: measure(badge), title: measure(row.querySelector('h4')),
                        chevron: measure(row.querySelector('.fa-chevron-down')),
                        button: measure(document.getElementById('subject-content-add-topic-btn')) };
                });
                if (width > 768) {
                    const menuSize = await page.locator('#topic-row-menu-test').evaluate(element => ({
                        width: getComputedStyle(element).width,
                        padding: getComputedStyle(element).padding,
                        rows: [...element.querySelectorAll('button')].map(button => ({
                            height: button.getBoundingClientRect().height,
                            font: getComputedStyle(button).fontSize,
                            icon: getComputedStyle(button.querySelector('i')).fontSize
                        }))
                    }));
                    assert.equal(menuSize.width, '176px');
                    assert.equal(menuSize.padding, '6px');
                    assert.deepEqual(menuSize.rows, Array(2).fill({ height: 40, font: '14px', icon: '14px' }));
                    const layout = await page.evaluate(() => {
                        const rect = id => {
                            const r = document.getElementById(id).getBoundingClientRect();
                            return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, center: r.y + r.height / 2 };
                        };
                        return {
                            header: rect('subject-modal-header'), heading: rect('subject-editor-title'),
                            tabs: rect('subject-materials-quarter-pills'), toolbar: rect('subject-materials-quarter-bar'),
                            add: rect('subject-content-add-topic-btn'), material: rect('add-material-trigger'),
                            reorder: rect('subject-content-reorder-btn')
                        };
                    });
                    assert.equal(layout.heading.x, layout.toolbar.x, 'Heading and toolbar share their left edge');
                    assert.equal(layout.toolbar.y - (layout.header.y + layout.header.height), 32, 'Consistent header-to-toolbar spacing');
                    for (const key of ['add', 'material', 'reorder']) {
                        assert.equal(layout[key].height, 40, 'Normal-sized desktop buttons');
                        assert.equal(layout[key].center, layout.tabs.center, 'Buttons are centered with the quarter tabs');
                    }
                    assert.equal(layout.material.right, layout.toolbar.right, 'Actions align to the right content edge');
                    if (role === 'teacher') {
                        assert.deepEqual(layout.header, results[`layout-${width}`].header);
                        assert.deepEqual(layout.toolbar, results[`layout-${width}`].toolbar);
                        assert.deepEqual(layout.material, results[`layout-${width}`].material);
                    } else results[`layout-${width}`] = layout;
                }
                results[`${role}-${width}`] = metrics;
                if (width <= 768) {
                    assert.equal(await page.locator('#topic-row-menu-test').evaluate(element => getComputedStyle(element).width), '112px',
                        'Mobile menu width stays unchanged');
                }
                if (width > 768 && role === 'teacher') {
                    assert.deepEqual(metrics, results[`admin-${width}`], `Desktop ${width}px must use identical shared sizing`);
                    await page.screenshot({ path: path.join(process.env.TEMP || root, `teacher-editor-scale-${width}.png`) });
                }
                await page.close();
            }
        }
        assert.equal(results['teacher-390'].badge.width, '20px', 'Mobile stays compact');
        assert.equal(results['teacher-390'].title.fontSize, '11.5px', 'Mobile typography stays unchanged');
        console.log('PASS: shared desktop layout and 176px menus with 40px actions match; mobile sizing remains unchanged.');
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
