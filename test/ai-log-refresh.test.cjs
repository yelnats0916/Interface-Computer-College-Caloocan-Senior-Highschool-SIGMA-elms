const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.join(__dirname, '..');
(async () => {
    const browser = await chromium.launch({ headless: true, channel: 'chrome' });
    try {
        const page = await browser.newPage();
        const shared = fs.readFileSync(path.join(root, 'js/shared-components.js'), 'utf8');
        const extract = name => {
            const start = shared.indexOf('window.' + name + ' = function');
            return shared.slice(start, shared.indexOf('\n};', start) + 3);
        };
        const scripts = [extract('renderSigmaChatMessage'), extract('renderSigmaEmptyState'),
            fs.readFileSync(path.join(root, 'js/ai-log-store.js'), 'utf8'),
            fs.readFileSync(path.join(root, 'js/ai-log-details.js'), 'utf8')];
        const html = '<style>[hidden]{display:none!important}</style><section id="audit-ai-view"><div><table aria-label="AI interaction logs"><thead><tr>' +
            ['User', 'AI Feature', 'Model', 'Status', 'Timestamp'].map(text => '<th>' + text + '</th>').join('') +
            '</tr></thead><tbody></tbody></table></div></section>' + scripts.map(script => '<script>' + script + '</script>').join('');
        await page.route('http://sigma.test/**', route => route.fulfill({ body: html, contentType: 'text/html' }));
        await page.goto('http://sigma.test/admin.html#nav-audit-ai');
        await page.evaluate(() => {
            localStorage.setItem('sigma-admin-users', JSON.stringify([{ uid: 'u1', name: 'Refresh User', role: 'Master Admin' }]));
            SigmaAiLogs.setRecords([{ id: 'refresh-log', userId: 'u1', feature: 'sigmabot', prompt: 'Question', response: 'Answer', model: 'Test', status: 'Success', timestamp: '2026-10-10T04:00:00Z', messages: Array.from({ length: 54 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', text: i ? 'Message ' + i : 'Question' })) }]);
        });
        await page.locator('.ai-log-user-button').click();
        await page.reload();
        await page.waitForFunction(() => !document.getElementById('ai-user-details-panel').hidden);
        await page.locator('.ai-log-history-table .ai-log-interaction-button').click();
        await page.reload();
        await page.waitForFunction(() => !document.getElementById('ai-interaction-details-panel').hidden);
        await page.getByRole('button', { name: 'Actions for message 1', exact: true }).click();
        await page.getByRole('button', { name: 'View Full Conversation', exact: true }).first().click();
        await page.getByRole('searchbox', { name: 'Search messages', exact: true }).fill('Message 50');
        await page.getByRole('button', { name: 'Search messages', exact: true }).click();
        await page.reload();
        await page.waitForFunction(() => document.querySelector('#ai-conversation-bubbles-panel') && !document.querySelector('#ai-conversation-bubbles-panel').hidden);
        assert.equal(await page.locator('.ai-log-transcript .ai-log-message').count(), 54);
        assert.equal(await page.getByRole('searchbox', { name: 'Search messages', exact: true }).inputValue(), 'Message 50');
        assert.equal(await page.locator('.ai-log-transcript mark').first().textContent(), 'Message 50');
        await page.evaluate(() => window.closeAiConversationBubbles());
        await page.reload();
        await page.waitForFunction(() => !document.getElementById('ai-interaction-details-panel').hidden);
        assert.equal(await page.locator('#ai-conversation-bubbles-panel').isVisible(), false);
        await page.evaluate(() => { SigmaAiLogs.setRecords([]); });
        await page.reload();
        await page.waitForTimeout(150);
        assert.equal(await page.locator('#ai-interaction-details-panel').isVisible(), false);
        console.log('AI usage, interaction and full-conversation views restore across refresh; missing records fall back safely.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
