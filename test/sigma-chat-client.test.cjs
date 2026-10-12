const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.join(__dirname, '..');
(async () => {
    const browser = await chromium.launch({ headless: true, channel: 'chrome' });
    try {
        for (const portal of ['admin', 'teacher', 'student']) {
            const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
            await page.route('http://sigma.test/**', route => route.fulfill({ body: '<html></html>', contentType: 'text/html' }));
            await page.goto('http://sigma.test/');
            const markup = fs.readFileSync(path.join(root, `${portal}.html`), 'utf8');
            const panel = await page.evaluate(html => new DOMParser().parseFromString(html, 'text/html').getElementById('sigmaAiPanel').outerHTML, markup);
            await page.setContent(panel);
            await page.evaluate(() => { document.getElementById('sigmaAiPanel').classList.remove('hidden'); sessionStorage.setItem('sigma-authenticated-user', JSON.stringify({ uid: 'chat-owner' })); });
            for (const css of ['forms.css', 'topbar.css', 'sigma-conversations.css']) await page.addStyleTag({ path: path.join(root, 'css', css) });
            const shared = fs.readFileSync(path.join(root, 'js/shared-components.js'), 'utf8');
            for (const name of ['getSigmaWelcomeMessage', 'renderSigmaChatMessage', 'renderSigmaEmptyState']) {
                const start = shared.indexOf(`window.${name} = function`);
                await page.addScriptTag({ content: shared.slice(start, shared.indexOf('\n};', start) + 3) });
            }
            for (const file of ['ai-log-store.js', 'sigma-conversations.js', 'sigma-chat-client.js']) await page.addScriptTag({ path: path.join(root, 'js', file) });
            const portalCode = fs.readFileSync(path.join(root, `js/${portal}.js`), 'utf8');
            const start = portalCode.indexOf('    function sendAiMessage() {');
            const handler = portalCode.slice(start, portalCode.indexOf('\n    }', start) + 6);
            await page.addScriptTag({ content: handler + '\ndocument.getElementById("sigmaAiSendBtn").onclick = sendAiMessage; document.getElementById("sigmaAiInput").onkeydown = e => { if(e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendAiMessage(); } };' });
            await page.evaluate(() => {
                window.requests = [];
                window.failRequest = false;
                window.fetch = async (url, options) => {
                    window.requests.push({ url, body: JSON.parse(options.body) });
                    await new Promise(resolve => setTimeout(resolve, 150));
                    return { ok: !window.failRequest, json: async () => window.failRequest ? { success: false, error: 'Test quota limit' } : {
                        success: true, text: 'An integer stores whole numbers. <img src=x onerror=alert(1)>', model: 'openai/gpt-oss-20b', provider: 'groq', keyId: 'test-key', keyLabel: 'Groq Test', status: 'Success'
                    } };
                };
            });
            await page.evaluate(() => {
                const greeting = window.renderSigmaChatMessage({ role: 'assistant', text: 'Hello, there! I am SIGMA.' });
                greeting.dataset.sigmaGreeting = 'true';
                document.getElementById('sigmaAiMessages').prepend(greeting);
            });
            assert.equal(await page.evaluate(() => window.requests.length), 0, 'System greeting uses zero API requests');
            await page.locator('#sigmaAiInput').fill('Explain integers.');
            await page.locator('#sigmaAiSendBtn').click();
            await page.waitForFunction(() => document.querySelectorAll('.sigma-ai-message--assistant:not([data-sigma-greeting])').length === 1);
            assert.equal(await page.locator('#sigmaAiMessages img').count(), 0, 'Provider answer must render as text, never HTML');
            assert.equal(await page.evaluate(() => window.requests[0].body.message), 'Explain integers.');
            assert.equal(await page.evaluate(() => window.requests[0].body.history.length), 0, 'Greeting is not sent as context and consumes no tokens');
            assert.equal(await page.evaluate(() => window.requests[0].body.api_key), undefined);
            const log = await page.evaluate(() => window.SigmaAiLogs.getRecords()[0]);
            assert.equal(log.model, 'openai/gpt-oss-20b');
            assert.equal(log.keyLabel, 'Groq Test');
            assert.equal(log.feature, 'sigmabot');
            assert.equal(log.messages.length, 2);
            await page.waitForFunction(() => JSON.parse(localStorage.getItem('sigma-conversations:chat-owner:index') || '[]').length === 1);
            const saved = await page.evaluate(() => {
                const id = JSON.parse(localStorage.getItem('sigma-conversations:chat-owner:index'))[0].id;
                return JSON.parse(localStorage.getItem('sigma-conversations:chat-owner:chat:' + id));
            });
            assert.equal(saved.length, 2, 'User question and actual answer persist in conversation history');
            await page.locator('#sigmaAiInput').fill('Give an example.');
            await page.locator('#sigmaAiInput').press('Enter');
            await page.waitForFunction(() => window.requests.length === 2 && document.getElementById('sigmaAiPanel').getAttribute('aria-busy') === 'false');
            assert.equal(await page.evaluate(() => window.requests[1].body.history.length), 2);
            await page.evaluate(() => { window.failRequest = true; });
            await page.locator('#sigmaAiInput').fill('Test failure');
            await page.locator('#sigmaAiInput').press('Enter');
            await page.waitForFunction(() => document.getElementById('sigmaChatError').textContent === 'Test quota limit');
            assert.equal(await page.locator('.sigma-ai-message--assistant:not([data-sigma-greeting])').count(), 2, 'No fake assistant answer on error');
            assert.equal(await page.locator('#sigmaAiInput').inputValue(), 'Test failure');
            assert.equal(await page.locator('#sigmaAiSendBtn').isDisabled(), false);
            assert.equal(await page.evaluate(() => window.SigmaAiLogs.getRecords().length), 2, 'Failed requests must not be logged as successes');
            assert(markup.includes('js/sigma-chat-client.js'));
            await page.close();
        }
        assert(fs.readFileSync(path.join(root, 'php/includes/footer.php'), 'utf8').includes('js/sigma-chat-client.js'));
        console.log('PASS: admin/teacher/student live chat delegation, recent history, actual key/model logs, safe text, saved conversations, failed request recovery');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
