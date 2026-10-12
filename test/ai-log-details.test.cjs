const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.join(__dirname, '..');
(async () => {
    const browser = await chromium.launch({ headless: true, channel: 'chrome' });
    try {
        let page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
        page.on('pageerror', error => console.error('Page error:', error.message));
        await page.route('http://sigma.test/**', route => route.fulfill({ body: '<html><body></body></html>', contentType: 'text/html' }));
        await page.goto('http://sigma.test/');
        const sharedSource = fs.readFileSync(path.join(root, 'js/shared-components.js'), 'utf8');
        const sharedStart = sharedSource.indexOf('(function initUniversalFormBackHandler(window)');
        const sharedEnd = sharedSource.indexOf('})(window);', sharedStart) + '})(window);'.length;
        const emptyStart = sharedSource.indexOf('window.renderSigmaEmptyState = function');
        const emptyEnd = sharedSource.indexOf('\n};', emptyStart) + 3;
        for (const file of ['admin.html', 'php/admin.php']) {
            if (file === 'php/admin.php') {
                await page.close();
                page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
                await page.route('http://sigma.test/**', route => route.fulfill({ body: '<html><body></body></html>', contentType: 'text/html' }));
                await page.goto('http://sigma.test/');
            }
            const source = fs.readFileSync(path.join(root, file), 'utf8');
            const start = source.indexOf('<!-- AI Logs Table -->');
            const table = source.slice(start, source.indexOf('</table>', start) + 8);
            await page.setContent('<section id="audit-ai-view" class="dynamic-section"><div class="audit-log-layout"><aside class="audit-log-sidebar">Log categories</aside><div>' + table + '</div></div></div></section><table><tbody id="userTableBody"></tbody></table>');
            await page.evaluate(() => { window._sigmaFormBackControllerInitialized = false; });
            await page.addScriptTag({ content: sharedSource.slice(sharedStart, sharedEnd) });
            await page.addScriptTag({ content: sharedSource.slice(emptyStart, emptyEnd) });
            const rendererStart = sharedSource.indexOf('window.renderSigmaChatMessage = function');
            await page.addScriptTag({ content: sharedSource.slice(rendererStart, sharedSource.indexOf('\n};', rendererStart) + 3) });
            for (const css of ['admin.css', 'topbar.css', 'forms.css', 'shared-components.css', 'ai-log-details.css']) await page.addStyleTag({ path: path.join(root, 'css', css) });
            await page.addStyleTag({ path: path.join(root, 'css/log-pagination.css') });
            await page.addScriptTag({ path: path.join(root, 'js/log-pagination.js') });
            await page.evaluate(() => {
                window.resolveUserAvatar = user => user.avatar;
                localStorage.setItem('sigma-admin-users', JSON.stringify([
                    { uid: 's1', firstName: 'Student', lastName: 'One', role: 'Student' },
                    { uid: 't1', firstName: 'Teacher', lastName: 'Two', role: 'Teacher', avatar: 'data:image/png;base64,invalid' },
                    { uid: 'a1', firstName: '<script>bad()</script>', role: 'Master Admin' }
                ]));
            });
            await page.addScriptTag({ path: path.join(root, 'js/ai-log-store.js') });
            await page.evaluate(() => window.SigmaAiLogs.setRecords([]));
            await page.addScriptTag({ path: path.join(root, 'js/ai-log-details.js') });
            assert.equal(await page.locator('.ai-log-user-button').count(), 0);
            assert.match(await page.locator('table[aria-label="AI interaction logs"]').textContent(), /No AI logs yet/);
            await page.evaluate(() => {
                const features = ['sigmabot', 'analytics', 'quiz', 'submission_evaluation', 'submission_feedback', 'grade_insights'];
                window.SigmaAiLogs.setRecords(['s1', 't1', 'a1'].flatMap(userId => features.filter(feature => userId !== 's1' || ['sigmabot', 'analytics', 'submission_feedback', 'grade_insights'].includes(feature)).map((feature, i) => ({
                    userId, feature, prompt: feature === 'sigmabot' ? 'Ask about a learning topic' : 'Recorded ' + feature + ' request', response: 'Recorded response', model: 'Test provider',
                    status: ['Success', 'Failed', 'Fallback Used'][i % 3], timestamp: new Date(Date.UTC(2026, 9, 10, 4, 30 - i * 5)).toISOString()
                }))));
            });
            assert.equal(await page.locator('.ai-log-user-button').count(), 16);
            assert.equal(await page.locator('.ai-log-request-preview').count(), 16);
            assert.equal(await page.locator('table[aria-label="AI interaction logs"] tbody tr').first().locator('.ai-log-interaction-button').textContent(), 'Sigma Bot');
            assert.equal(await page.locator('.ai-log-request-preview').first().textContent(), 'Ask about a learning topic');
            const dates = await page.locator('table[aria-label="AI interaction logs"] time').evaluateAll(elements => elements.map(el => Date.parse(el.dateTime)));
            assert.ok(dates.every((date, i) => i === 0 || date <= dates[i - 1]));
            const firstName = page.locator('.ai-log-user-button span:last-child').first();
            assert.equal(await firstName.evaluate(el => getComputedStyle(el).color), 'rgb(0, 0, 0)');
            assert.equal(await page.locator('table[aria-label="AI interaction logs"] .ai-log-interaction-button').first().evaluate(el => getComputedStyle(el).color), 'rgb(0, 0, 0)');
            const featureLink = page.locator('table[aria-label="AI interaction logs"] .ai-log-interaction-button').first();
            await featureLink.hover();
            assert.equal(await featureLink.evaluate(el => getComputedStyle(el).textDecorationLine), 'underline');
            await firstName.hover();
            assert.equal(await firstName.evaluate(el => getComputedStyle(el).textDecorationLine), 'underline');
            assert.equal(await page.locator('.ai-log-demo-note').count(), 0);
            assert.equal(await page.locator('#audit-ai-view script').count(), 0);
            await page.locator('table[aria-label="AI interaction logs"] .ai-log-interaction-button').first().click();
            assert.equal(await page.locator('#ai-interaction-details-panel').isVisible(), true);
            assert.equal(await page.locator('.ai-log-message-table tbody tr').count(), 2);
            await page.evaluate(() => window.navigateSigmaBack());
            await page.waitForFunction(() => document.getElementById('ai-interaction-details-panel').hidden);
            assert.equal(await page.locator('table[aria-label="AI interaction logs"]').isVisible(), true);
            await page.locator('[data-user-id="s1"]').first().click();
            assert.equal(await page.locator('.ai-log-detail').isVisible(), true);
            assert.equal(await page.locator('.ai-log-detail-title').textContent(), 'AI Usage Details');
            assert.equal(await page.locator('.ai-log-detail-name').textContent(), 'Student One');
            assert.equal(await page.locator('.ai-log-detail-identity h2').count(), 0);
            const identity = await page.locator('.ai-log-detail-identity').evaluate(el => {
                const avatar = el.querySelector('.ai-log-avatar').getBoundingClientRect();
                const name = el.querySelector('.ai-log-detail-name').getBoundingClientRect();
                const subtitle = el.querySelector('.ai-log-detail-identity-text').lastElementChild.getBoundingClientRect();
                return { sameRow: name.top >= avatar.top && name.top < avatar.bottom, below: subtitle.top >= name.bottom, aligned: Math.abs(subtitle.left - name.left) < 1 };
            });
            assert.deepEqual(identity, { sameRow: true, below: true, aligned: true });
            assert.equal(await page.locator('.audit-log-sidebar').isVisible(), false);
            assert.equal(await page.locator('.ai-log-detail').evaluate(el => getComputedStyle(el.closest('.audit-log-layout').lastElementChild).gridColumnStart), '1');
            assert.equal(await page.locator('table[aria-label="AI interaction logs"]').isVisible(), false);
            assert.equal(await page.locator('.ai-log-category-tabs button').count(), 5);
            assert.deepEqual(await page.locator('.ai-log-category-tabs button').allTextContents(), ['All Logs', 'Sigma Bot', 'Analytics Insights', 'Submission Feedback', 'Grade Insights']);
            await page.locator('[data-category="all"]').hover();
            assert.equal(await page.locator('[data-category="all"]').evaluate(el => getComputedStyle(el, '::before').backgroundColor), 'rgba(0, 0, 0, 0)');
            await page.locator('[data-category="sigmabot"]').hover();
            assert.equal(await page.locator('[data-category="sigmabot"]').evaluate(el => getComputedStyle(el).color), 'rgb(0, 0, 0)');
            assert.equal(await page.locator('[data-category="all"]').evaluate(el => getComputedStyle(el).color), 'rgb(21, 128, 61)');
            assert.deepEqual(await page.locator('[data-category="sigmabot"]').evaluate(el => {
                const s = getComputedStyle(el, '::before');
                return { radius: s.borderRadius, background: s.backgroundColor };
            }), { radius: '6px', background: 'rgb(241, 245, 249)' });
            assert.equal(await page.locator('.audit-log-layout').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(255, 255, 255)');
            const frameStyle = await page.locator('.ai-log-detail .sigma-table-container').evaluate(el => {
                const s = getComputedStyle(el);
                return { border: s.borderTopWidth, radius: s.borderRadius, shadow: s.boxShadow };
            });
            assert.deepEqual(frameStyle, { border: '0px', radius: '0px', shadow: 'none' });
            assert.equal(await page.locator('[data-category="quiz"]').count(), 0);
            assert.equal(await page.locator('.ai-log-history-table tbody tr').count(), 4);
            assert.deepEqual(await page.locator('.ai-log-history-table .ai-log-timestamp').first().evaluate(el => ({ color: getComputedStyle(el).color, size: getComputedStyle(el).fontSize })), { color: 'rgb(0, 0, 0)', size: '12px' });
            await page.locator('.ai-log-history-table .ai-log-interaction-button').first().click();
            assert.equal(await page.locator('#ai-interaction-details-panel').isVisible(), true);
            assert.equal(await page.locator('#ai-user-details-panel').isVisible(), false);
            assert.equal(await page.locator('.ai-log-transcript .ai-log-message').count(), 2);
            assert.deepEqual(await page.locator('.ai-log-message-table th').allTextContents(), ['Sender', 'Message', 'Timestamp', 'Action']);
            assert.match(await page.locator('.ai-log-message-table tbody tr').first().textContent(), /Student One/);
            assert.equal(await page.locator('.ai-log-transcript').isVisible(), false);
            await page.getByRole('button', { name: 'Actions for message 1', exact: true }).click();
            await page.getByRole('button', { name: 'View Full Conversation', exact: true }).first().click();
            assert.equal(await page.locator('.ai-log-transcript').isVisible(), true);
            assert.equal(await page.locator('.ai-log-conversation-chat .sigma-ai-header .sigma-ai-title').textContent(), 'SIGMA');
            assert.equal(await page.locator('.ai-log-transcript .sigma-ai-message__icon .fa-bolt').count(), 1);
            assert.deepEqual(await page.locator('.ai-log-transcript .sigma-ai-message__bubble--assistant').evaluate(el => ({ background: getComputedStyle(el).backgroundColor, size: getComputedStyle(el).fontSize })), { background: 'rgb(255, 255, 255)', size: '13.5px' });
            assert.equal(await page.locator('.ai-log-transcript .sigma-ai-message__bubble--user').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(21, 128, 61)');
            assert.equal(await page.locator('.ai-log-interaction-metadata').isVisible(), false);
            assert.deepEqual(await page.locator('.ai-log-conversation-details dt').allTextContents(), ['AI Feature', 'Started', 'Last Activity']);
            assert.equal(await page.locator('.ai-log-conversation-sidebar .ai-log-detail-title').count(), 1);
            assert.equal(await page.locator('#ai-interaction-details-panel > .ai-log-detail-identity').count(), 0);
            assert.equal(await page.locator('.ai-log-conversation-sidebar .ai-log-detail-identity-text').count(), 1);
            for (const width of [1200, 390]) {
                await page.setViewportSize({ width, height: 800 });
                const left = await page.locator('.ai-log-conversation-sidebar').boundingBox();
                const right = await page.locator('.ai-log-transcript').boundingBox();
                if (width === 1200) assert.ok(right.x >= left.x + left.width);
                else assert.ok(right.y >= left.y + left.height);
                assert.ok(right.x + right.width <= width);
                await page.screenshot({ path: require('path').join(require('os').tmpdir(), 'sigma-full-conversation-' + width + '.png'), fullPage: true });
            }
            await page.setViewportSize({ width: 1200, height: 800 });
            const messageSearch = page.getByRole('searchbox', { name: 'Search messages', exact: true });
            assert.equal(await messageSearch.getAttribute('maxlength'), '100');
            assert.equal(await messageSearch.getAttribute('autocomplete'), 'off');
            assert.equal(await messageSearch.evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(248, 250, 252)');
            await messageSearch.evaluate(el => { el.value = 'bad\u0001input'; el.dispatchEvent(new Event('input', { bubbles: true })); });
            assert.equal(await messageSearch.inputValue(), 'badinput');
            await page.locator('.ai-log-conversation-search .ai-log-search-clear').click();
            assert.equal(await messageSearch.inputValue(), '');
            assert.equal(await page.locator('.ai-log-conversation-search .ai-log-search-clear').isVisible(), false);
            const searchText = await page.locator('.ai-log-transcript .sigma-ai-message__bubble').first().textContent();
            await messageSearch.fill(searchText);
            assert.equal(await page.locator('.ai-log-transcript mark').count(), 0);
            await page.getByRole('button', { name: 'Search messages', exact: true }).click();
            assert.ok(await page.locator('.ai-log-transcript mark').count() > 0);
            await page.locator('.ai-log-conversation-search .ai-log-search-clear').click();
            assert.ok(await page.locator('.ai-log-transcript mark').count() > 0);
            assert.equal(await page.locator('.ai-log-transcript .ai-log-message').count(), 2);
            await messageSearch.fill('no-such-message-98765');
            await messageSearch.press('Enter');
            assert.equal(await page.locator('.ai-log-conversation-search-result').textContent(), 'No messages found');
            await messageSearch.fill('');
            await messageSearch.press('Enter');
            assert.equal(await page.locator('.ai-log-transcript mark').count(), 0);
            await page.evaluate(() => window.navigateSigmaBack());
            await page.waitForFunction(() => document.getElementById('ai-conversation-bubbles-panel').hidden);
            assert.equal(await page.locator('.ai-log-message-table').isVisible(), true);
            assert.equal(await page.locator('.ai-log-interaction-metadata').isVisible(), true);
            assert.equal(await page.locator('.ai-log-conversation-sidebar .ai-log-detail-title').count(), 0);
            await page.goForward();
            await page.waitForFunction(() => !document.getElementById('ai-conversation-bubbles-panel').hidden);
            await page.goBack();
            await page.waitForFunction(() => document.getElementById('ai-conversation-bubbles-panel').hidden);
            await page.goBack();
            await page.waitForFunction(() => document.getElementById('ai-interaction-details-panel').hidden);
            await page.goForward();
            await page.waitForFunction(() => !document.getElementById('ai-interaction-details-panel').hidden);
            await page.goForward();
            await page.waitForFunction(() => !document.getElementById('ai-conversation-bubbles-panel').hidden);
            await page.goBack();
            await page.waitForFunction(() => document.getElementById('ai-conversation-bubbles-panel').hidden);
            await page.getByRole('button', { name: 'Actions for message 2', exact: true }).click();
            await page.getByRole('button', { name: 'Delete', exact: true }).last().click();
            assert.equal(await page.locator('.ai-log-message-table tbody tr').count(), 1);
            assert.equal(await page.locator('.ai-log-transcript .ai-log-message').count(), 2);
            await page.getByRole('button', { name: 'Undo', exact: true }).click();
            assert.equal(await page.locator('.ai-log-message-table tbody tr').count(), 2);
            assert.equal(await page.locator('#ai-interaction-details-panel textarea, #ai-interaction-details-panel input:visible').count(), 0);
            assert.equal(await page.locator('#ai-interaction-details-panel .ai-log-demo-note').count(), 0);
            for (const width of [1200, 390, 320]) {
                await page.setViewportSize({ width, height: 800 });
                assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
            }
            await page.screenshot({ path: path.join(process.env.TEMP, 'sigma-log-interaction.png') });
            await page.evaluate(() => window.navigateSigmaBack());
            await page.waitForFunction(() => document.getElementById('ai-interaction-details-panel').hidden);
            assert.equal(await page.locator('#ai-user-details-panel').isVisible(), true);
            assert.equal(await page.locator('.ai-log-history-table tbody tr').count(), 4);
            await page.setViewportSize({ width: 1200, height: 800 });
            await page.locator('.ai-log-history-table .ai-log-interaction-button').nth(1).click();
            assert.deepEqual(await page.locator('.ai-log-insight-table th').allTextContents(), ['Source', 'Insight Message', 'Timestamp', 'Action']);
            assert.equal(await page.locator('.ai-log-insight-table tbody tr').count(), 1);
            assert.equal(await page.locator('.ai-log-insight-table .ai-log-message-content').textContent(), 'Recorded response');
            await page.getByRole('button', { name: 'Insight actions', exact: true }).click();
            assert.equal(await page.locator('.ai-log-insight-table .ai-log-message-menu button').filter({ hasText: 'Remove Card' }).isDisabled(), true);
            await page.evaluate(() => history.back());
            await page.waitForFunction(() => document.getElementById('ai-interaction-details-panel').hidden);
            assert.equal(await page.locator('.ai-log-search').evaluate(el => getComputedStyle(el).justifyContent), 'flex-start');
            assert.deepEqual(await page.locator('.ai-log-search input').evaluate(el => {
                const style = getComputedStyle(el);
                return { background: style.backgroundColor, border: style.borderTopColor, radius: style.borderRadius, padding: style.paddingRight };
            }), { background: 'rgb(248, 250, 252)', border: 'rgb(203, 213, 225)', radius: '12px', padding: '44px' });
            const searchLeft = await page.locator('.ai-log-search').evaluate(el => Math.abs(el.getBoundingClientRect().left - el.querySelector('input').getBoundingClientRect().left) < 1);
            assert.equal(searchLeft, true);
            await page.locator('.ai-log-search input').fill('feedback');
            assert.equal(await page.locator('.ai-log-history-table tbody tr').count(), 4);
            assert.equal(await page.locator('.ai-log-search input').getAttribute('maxlength'), '100');
            await page.locator('.ai-log-search > button').click();
            assert.equal(await page.locator('.ai-log-history-table tbody tr').count(), 1);
            assert.deepEqual(await page.locator('.ai-log-category-tabs button').allTextContents(), ['All Logs', 'Submission Feedback']);
            assert.match(await page.locator('.ai-log-history-table tbody').textContent(), /Submission Feedback/);
            await page.locator('.ai-log-search-clear').hover();
            assert.equal(await page.locator('.ai-log-search-clear i').evaluate(el => getComputedStyle(el).fontSize), '12px');
            const clearStyle = await page.locator('.ai-log-search-clear').evaluate(el => {
                const s = getComputedStyle(el);
                return { color: s.color, radius: s.borderRadius, background: s.backgroundColor };
            });
            assert.deepEqual(clearStyle, { color: 'rgb(0, 0, 0)', radius: '50%', background: 'rgb(226, 232, 240)' });
            await page.locator('.ai-log-search-clear').click();
            assert.equal(await page.locator('.ai-log-search input').inputValue(), '');
            assert.equal(await page.locator('.ai-log-search-clear').isVisible(), false);
            await page.locator('.ai-log-search input').dispatchEvent('search');
            assert.equal(await page.locator('.ai-log-history-table tbody tr').count(), 1);
            await page.locator('.ai-log-search input').evaluate(el => {
                el.value = 'x'.repeat(120) + '\u0001';
                el.dispatchEvent(new Event('input', { bubbles: true }));
            });
            assert.equal((await page.locator('.ai-log-search input').inputValue()).length, 100);
            assert.equal(await page.locator('.ai-log-history-table tbody tr').count(), 1);
            await page.locator('.ai-log-search input').fill('no matching log');
            await page.locator('.ai-log-search input').press('Enter');
            assert.match(await page.locator('.ai-log-empty-state').textContent(), /No results found/);
            for (const selector of ['.sigma-empty-icon', '.sigma-empty-subtitle']) {
                assert.equal(await page.locator(selector).evaluate(el => getComputedStyle(el).color), 'rgba(0, 0, 0, 0.45)');
            }
            assert.equal(await page.locator('.sigma-empty-title').evaluate(el => getComputedStyle(el).fontSize), '14px');
            assert.equal(await page.locator('.ai-log-category-tabs').count(), 0);
            assert.equal(await page.locator('.ai-log-history-table').count(), 1);
            assert.deepEqual(await page.locator('.ai-log-history-table th').allTextContents(), ['AI Feature', 'Interaction', 'Model', 'Status', 'Timestamp']);
            assert.equal(await page.locator('.ai-log-empty-cell').getAttribute('colspan'), '5');
            await page.locator('.ai-log-search input').fill('');
            await page.locator('.ai-log-search input').press('Enter');
            assert.equal(await page.locator('.ai-log-history-table tbody tr').count(), 4);
            assert.equal(await page.locator('.ai-log-history-table tbody td').first().evaluate(el => getComputedStyle(el).textAlign), 'left');
            await page.locator('[data-category="submission_feedback"]').click();
            assert.equal(await page.locator('.ai-log-history-table tbody tr').count(), 1);
            assert.match(await page.locator('.ai-log-history-table tbody').textContent(), /Submission Feedback/);
            assert.equal(await page.locator('.ai-log-back').count(), 0);
            await page.evaluate(() => window.navigateSigmaBack());
            await page.waitForFunction(() => !document.getElementById('audit-ai-view').dataset.aiUserDetailOpen);
            assert.equal(await page.locator('.audit-log-sidebar').isVisible(), true);
            await page.waitForFunction(() => document.activeElement.dataset.userId === 's1');
            await page.locator('[data-user-id="t1"]').first().click();
            assert.equal(await page.locator('.ai-log-category-tabs button').count(), 7);
            for (const status of ['Success', 'Failed', 'Fallback Used']) assert.ok((await page.locator('.ai-log-history-table').textContent()).includes(status));
            await page.screenshot({ path: path.join(process.env.TEMP, 'sigma-ai-user-details-desktop.png') });
            await page.evaluate(() => history.back());
            await page.waitForFunction(() => !document.getElementById('audit-ai-view').dataset.aiUserDetailOpen);
            assert.equal(await page.locator('.audit-log-sidebar').isVisible(), true);
            await page.locator('[data-user-id="t1"]').first().click();
            await page.evaluate(() => {
                const users = JSON.parse(localStorage.getItem('sigma-admin-users'));
                users[1].firstName = 'Updated';
                users[1].role = 'Student';
                localStorage.setItem('sigma-admin-users', JSON.stringify(users));
                dispatchEvent(new Event('sigma:user-profile-updated'));
            });
            assert.match(await page.locator('.ai-log-detail-name').textContent(), /Updated Two/);
            assert.equal(await page.locator('[data-category="quiz"]').count(), 0);
            for (const width of [1200, 600, 390, 320]) {
                await page.setViewportSize({ width, height: 800 });
                assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
                for (const cell of await page.locator('.ai-log-history-table td').all()) {
                    assert.equal(await cell.evaluate(el => el.scrollWidth <= el.clientWidth + 1), true);
                }
            }
            await page.screenshot({ path: path.join(process.env.TEMP, 'sigma-ai-user-details.png') });
            await page.evaluate(() => window.SigmaAiLogs.setRecords([{
                userId: 't1', feature: 'sigmabot', prompt: 'Recorded question', response: 'Recorded answer', model: 'Gemini', status: 'Success', timestamp: '2026-10-10T04:30:00Z',
                messages: [{ role: 'assistant', text: 'Greeting before conversation' }, { role: 'user', text: '<script>bad()</script>', timestamp: '2026-10-10T06:36:48.335Z' }, { role: 'assistant', text: 'First answer' }, { role: 'user', text: 'Follow up' }, { role: 'assistant', text: 'Second answer' }]
            }]));
            await page.locator('.ai-log-history-table .ai-log-interaction-button').click();
            assert.equal(await page.locator('.ai-log-transcript .ai-log-message').count(), 4);
            assert.equal(await page.locator('.ai-log-message-table tbody tr').count(), 2);
            assert.equal(await page.locator('.ai-log-message-sender p').count(), 2);
            assert.equal(await page.locator('.ai-log-message-sender .text-black-fade').count(), 0);
            assert.equal(await page.locator('.ai-log-sigma-icon .fa-bolt').count(), 1);
            assert.equal(await page.locator('.ai-log-sigma-icon').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(255, 208, 0)');
            assert.equal(await page.locator('.ai-log-message-table .fa-robot').count(), 0);
            assert.equal(await page.locator('.ai-log-message-table .ai-log-timestamp').first().textContent(), 'Oct 10, 2026, 2:36 PM');
            assert.equal(await page.locator('.ai-log-message-time').first().textContent(), 'Oct 10, 2026, 2:36 PM');
            assert.equal(await page.locator('.ai-log-transcript script').count(), 0);
            assert.equal(await page.locator('.ai-log-transcript .ai-log-message p').first().textContent(), '<script>bad()</script>');
            const fullMessage = 'A long recorded response. '.repeat(80) + '\n' + 'x'.repeat(300);
            await page.evaluate(text => {
                const cell = document.querySelector('.ai-log-message-content');
                cell.textContent = text;
            }, fullMessage);
            const messageCell = page.locator('.ai-log-message-content').first();
            assert.equal(await messageCell.textContent(), fullMessage);
            for (const width of [1200, 390, 320]) {
                await page.setViewportSize({ width, height: 800 });
                assert.deepEqual(await messageCell.evaluate(el => {
                    const style = getComputedStyle(el);
                    return { overflow: style.overflow, ellipsis: style.textOverflow, wrap: style.whiteSpace, fits: el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= el.clientHeight + 1 };
                }), { overflow: 'visible', ellipsis: 'clip', wrap: 'pre-wrap', fits: true });
            }
            await page.evaluate(() => window.navigateSigmaBack());
            await page.waitForFunction(() => document.getElementById('ai-interaction-details-panel').hidden);
            await page.setViewportSize({ width: 1200, height: 800 });
            await page.waitForTimeout(150);
            await page.evaluate(() => window.SigmaAiLogs.setRecords([{
                userId: 't1', feature: 'sigmabot', prompt: 'Paged message 0', response: 'Paged message 1', model: 'Test', status: 'Success', timestamp: '2026-10-10T04:30:00Z',
                messages: Array.from({ length: 65 }, (_, index) => ({ role: index % 2 ? 'assistant' : 'user', text: 'Paged message ' + index }))
            }]));
            await page.locator('.ai-log-history-table .ai-log-interaction-button').click();
            assert.equal(await page.locator('.ai-log-transcript .ai-log-message').count(), 20);
            await page.getByRole('button', { name: 'Actions for message 1', exact: true }).click();
            await page.getByRole('button', { name: 'View Full Conversation', exact: true }).first().click();
            await page.addStyleTag({ content: 'body { overflow-x: hidden; overflow-y: auto; }' });
            assert.equal(await page.evaluate(() => getComputedStyle(document.body).overflowY), 'visible');
            await page.evaluate(() => { window.originalConversationBubble = document.querySelector('.ai-log-transcript .ai-log-message'); });
            await page.locator('.ai-log-conversation-sentinel').scrollIntoViewIfNeeded();
            await page.waitForFunction(() => document.querySelectorAll('.ai-log-transcript .ai-log-message').length === 35);
            const sidebarPosition = await page.locator('.ai-log-conversation-sidebar').evaluate(el => ({ position: getComputedStyle(el).position, top: el.getBoundingClientRect().top }));
            assert.equal(sidebarPosition.position, 'sticky');
            assert.ok(sidebarPosition.top >= 0 && sidebarPosition.top < 150);
            assert.equal(await page.evaluate(() => window.originalConversationBubble === document.querySelector('.ai-log-transcript .ai-log-message')), true);
            await page.getByRole('searchbox', { name: 'Search messages', exact: true }).fill('Paged message');
            await page.getByRole('button', { name: 'Search messages', exact: true }).click();
            await page.getByRole('button', { name: 'Previous match', exact: true }).click();
            assert.equal(await page.locator('.ai-log-conversation-search-result').textContent(), '65 of 65 matches');
            assert.equal(await page.locator('.ai-log-transcript .ai-log-message').count(), 65);
            await page.getByRole('searchbox', { name: 'Search messages', exact: true }).fill('Paged message 60');
            await page.getByRole('button', { name: 'Search messages', exact: true }).click();
            assert.equal(await page.locator('.ai-log-transcript mark').first().textContent(), 'Paged message 60');
            assert.equal(await page.locator('.ai-log-conversation-search-result').textContent(), '1 of 1 matches');
            await page.getByRole('searchbox', { name: 'Search messages', exact: true }).fill('Paged message');
            await page.getByRole('button', { name: 'Search messages', exact: true }).click();
            assert.equal(await page.locator('.ai-log-conversation-search-result').textContent(), '1 of 65 matches');
            await page.getByRole('button', { name: 'Next match', exact: true }).click();
            assert.equal(await page.locator('.ai-log-conversation-search-result').textContent(), '2 of 65 matches');
            await page.getByRole('button', { name: 'Previous match', exact: true }).click();
            await page.getByRole('button', { name: 'Previous match', exact: true }).click();
            assert.equal(await page.locator('.ai-log-conversation-search-result').textContent(), '65 of 65 matches');
            assert.equal(await page.locator('.ai-log-match-current').count(), 1);
            assert.equal(await page.locator('.ai-log-transcript .ai-log-message').count(), 65);
            assert.equal(await page.locator('.ai-log-transcript .ai-log-message').count(), 65);
            assert.equal(await page.locator('.ai-log-conversation-sentinel').isVisible(), false);
            await page.evaluate(() => window.closeAiConversationBubbles());
            await page.evaluate(() => window.closeAiInteractionDetails());
            await page.evaluate(() => {
                const card = { id: 'linked-test', title: 'Assessment insight', area: 'class-assessments', evidenceIds: ['quiz-1'], analyses: [{ actionLabel: 'Try', context: 'This is the context.', text: 'Review the feedback.' }] };
                const snapshot = { teacherId: 't1', areas: [{ id: 'class-assessments', records: [{ id: 'quiz-1', title: 'Quiz 1',
                    subjectId: 'Programming', sectionId: 'Rizal', sources: [
                        { id: 'submission-records', label: 'Submission Records' },
                        { id: 'assessment-results', label: 'Assessment Results' }] }] }] };
                localStorage.setItem('sigma-teacher-analytics-v1:t1', JSON.stringify({ cards: [card] }));
                SigmaAiLogs.setRecords([]);
                SigmaAiLogs.recordInsight({ userId: 't1', kind: 'teacher', card, snapshot, timestamp: new Date().toISOString(), model: 'Test provider' });
            });
            await page.locator('.ai-log-history-table .ai-log-interaction-button').click();
            assert.equal(await page.locator('.ai-log-insight-table tbody tr').count(), 1);
            assert.deepEqual(await page.locator('.ai-log-insight-sources li').allTextContents(), ['Submission Records', 'Assessment Results']);
            assert.equal(await page.locator('.ai-log-insight-sources li').first().getAttribute('title'), 'Quiz 1 - Programming - Rizal');
            await page.getByRole('button', { name: 'Insight actions', exact: true }).click();
            const realDelete = page.locator('.ai-log-insight-table .ai-log-message-menu button').filter({ hasText: 'Remove Card' });
            assert.equal(await realDelete.isEnabled(), true, 'Real card-linked insight logs enable Delete');
            assert.deepEqual(await realDelete.evaluate(button => ({ color: getComputedStyle(button).color, opacity: getComputedStyle(button).opacity })),
                { color: 'rgb(0, 0, 0)', opacity: '1' }, 'Enabled Delete is black, not faded');
            page.once('dialog', dialog => dialog.accept());
            const insightMenu = await page.locator('.ai-log-insight-actions').evaluate(element => {
                const trigger = element.querySelector('button').getBoundingClientRect();
                const menu = element.querySelector('.ai-log-message-menu').getBoundingClientRect();
                const action = element.querySelector('.ai-log-message-menu button').getBoundingClientRect();
                return { width: menu.width, gap: menu.top - trigger.bottom, aligned: menu.right === trigger.right, rowHeight: action.height };
            });
            assert.deepEqual(insightMenu, { width: 176, gap: 6, aligned: true, rowHeight: 40 });
            await realDelete.click();
            assert.equal(await realDelete.isDisabled(), true, 'Successful deletion prevents a second delete');
            assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('sigma-teacher-analytics-v1:t1')).cards.length), 0);
            assert.equal(await page.evaluate(() => SigmaAiLogs.getRecords().length), 1);
            assert.match(await page.locator('#ai-interaction-details-panel .ai-log-message-notice').textContent(), /Card removed/);
            await page.evaluate(() => window.closeAiInteractionDetails());
            await page.evaluate(() => window.SigmaAiLogs.setRecords([]));
            assert.match(await page.locator('.ai-log-empty-state').textContent(), /No AI logs yet/);
            assert.equal(await page.locator('.ai-log-history-table').count(), 1);
            await page.evaluate(() => {
                localStorage.setItem('sigma-admin-users', '[]');
                dispatchEvent(new StorageEvent('storage', { key: 'sigma-admin-users' }));
            });
            assert.equal(await page.locator('.ai-log-detail').isVisible(), false);
            assert.match(await page.locator('table[aria-label="AI interaction logs"]').textContent(), /No user accounts/);
            await page.setViewportSize({ width: 1200, height: 800 });
        }
        await page.waitForTimeout(150);
        await page.evaluate(() => {
            window.scrollTo(0, 0);
            localStorage.setItem('sigma-admin-users', JSON.stringify([{ uid: 'paging', name: 'Paging User', role: 'Master Admin' }]));
            dispatchEvent(new Event('sigma:user-profile-updated'));
            window.SigmaAiLogs.setRecords(Array.from({ length: 65 }, (_, index) => ({
                id: 'paging-' + index, userId: 'paging', feature: 'sigmabot', prompt: 'Request ' + index, response: 'Response',
                model: 'Test model', status: 'Success', timestamp: new Date(Date.now() - index * 60000).toISOString()
            })));
        });
        const overviewRows = page.locator('table[aria-label="AI interaction logs"] tbody tr');
        await page.waitForFunction(() => [...document.querySelectorAll('table[aria-label="AI interaction logs"] tbody tr')].filter(row => !row.hidden).length === 20);
        assert.equal(await overviewRows.filter({ visible: true }).count(), 20);
        await overviewRows.first().evaluate(el => { window.originalOverviewRow = el; });
        await page.locator('table[aria-label="AI interaction logs"] + .sigma-log-pagination').getByRole('button', { name: 'Next page', exact: true }).click();
        assert.equal(await overviewRows.filter({ visible: true }).count(), 20);
        assert.equal(await page.evaluate(() => window.originalOverviewRow.isConnected), false, 'Previous page rows must leave the document');
        assert.equal(await overviewRows.count(), 20, 'Only the selected page is rendered');
        await overviewRows.filter({ visible: true }).first().locator('.ai-log-user-button').click();
        assert.equal(await page.locator('.ai-log-history-table tbody tr:visible').count(), 20);
        assert.equal(await page.locator('.ai-log-overview-footer').isVisible(), false);
        await page.evaluate(() => window.navigateSigmaBack());
        await page.waitForFunction(() => document.getElementById('ai-user-details-panel').hidden);
        await page.waitForTimeout(150);
        assert.equal(await overviewRows.filter({ visible: true }).count(), 20);
        await page.locator('table[aria-label="AI interaction logs"] + .sigma-log-pagination').getByRole('button', { name: 'Page 4', exact: true }).click();
        assert.equal(await overviewRows.filter({ visible: true }).count(), 5);
        assert.equal(await overviewRows.count(), 5);
        assert.equal(await page.getByRole('button', { name: 'Load More', exact: true }).count(), 0);
        assert.equal(await page.locator('.ai-log-overview-footer').isVisible(), false);
        assert.equal(await page.locator('.ai-log-overview-footer span').count(), 0);
        await page.setContent('<section id="settings-ai-view"><table class="sigma-table ai-routing-table"><thead><tr><th>AI Feature</th><th>Preferred Provider</th><th>Default Key</th></tr></thead><tbody><tr><td>Sigma Bot</td><td><fieldset class="ai-provider-toggle">Gemini / Groq</fieldset></td><td>Not configured</td></tr></tbody></table></section>');
        await page.addStyleTag({ path: path.join(root, 'css/settings-view.css') });
        await page.addStyleTag({ path: path.join(root, 'css/forms.css') });
        for (const cell of await page.locator('th, td:nth-child(2), td:nth-child(3)').all()) {
            assert.equal(await cell.evaluate(el => getComputedStyle(el).textAlign), 'center');
        }
        assert.equal(await page.locator('tbody td').first().evaluate(el => getComputedStyle(el).textAlign), 'left');
        const centered = await page.locator('.ai-provider-toggle').evaluate(el => {
            const toggle = el.getBoundingClientRect(), cell = el.parentElement.getBoundingClientRect();
            return Math.abs((toggle.left + toggle.right) / 2 - (cell.left + cell.right) / 2) < 1;
        });
        assert.equal(centered, true);
        console.log('Account-linked AI usage, left-aligned feature items and centered headings/provider controls passed.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
