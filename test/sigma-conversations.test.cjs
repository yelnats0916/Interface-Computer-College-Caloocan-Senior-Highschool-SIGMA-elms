const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.join(__dirname, '..');
(async () => {
    const browser = await chromium.launch({ headless: true, channel: 'chrome' });
    try {
        for (const file of ['admin.html', 'teacher.html', 'student.html', 'php/includes/topbar.php']) {
            const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
            page.on('pageerror', error => console.error(file, error.message));
            await page.route('http://sigma.test/**', route => route.fulfill({ body: '<html><body></body></html>', contentType: 'text/html' }));
            await page.goto('http://sigma.test/');
            const markup = fs.readFileSync(path.join(root, file), 'utf8');
            const panel = await page.evaluate(markup => new DOMParser().parseFromString(markup, 'text/html').getElementById('sigmaAiPanel').outerHTML, markup);
            await page.setContent(panel);
            await page.evaluate(() => document.getElementById('sigmaAiPanel').classList.remove('hidden'));
            for (const css of ['forms.css', 'shared-components.css', 'sigma-conversations.css']) await page.addStyleTag({ path: path.join(root, 'css', css) });
            await page.addStyleTag({ content: '#sigmaAiPanel{display:flex;flex-direction:column;width:400px;max-width:100%;height:650px}.sigma-ai-header{display:flex;align-items:center}.sigma-ai-message__row{display:flex}#sigmaAiMessages{flex:1;overflow:auto;min-height:0}.mobile-panel-header-back-btn{display:none}' });
            const shared = fs.readFileSync(path.join(root, 'js/shared-components.js'), 'utf8');
            const rendererStart = shared.indexOf('window.renderSigmaChatMessage = function');
            await page.addScriptTag({ content: shared.slice(rendererStart, shared.indexOf('\n};', rendererStart) + 3) });
            const start = shared.indexOf('window.renderSigmaEmptyState = function');
            await page.addScriptTag({ content: shared.slice(start, shared.indexOf('\n};', start) + 3) });
            await page.evaluate(() => {
                sessionStorage.setItem('sigma-authenticated-user', JSON.stringify({ uid: 'user1' }));
                window.SigmaDatabase = {request:async()=>({success:true,conversations:[],deletedIds:[]})};
                window.createSigmaBoltIcon = () => document.createElement('span');
                window.SigmaMessageFormat = {raw:e=>e.textContent,render:(e,text)=>{e.textContent=text;}};
                const index = Array.from({ length: 12 }, (_, i) => ({ id: 'chat' + i, title: 'Conversation ' + i, updatedAt: Date.now() - i * 3600000 }));
                localStorage.setItem('sigma-conversations:user1:index', JSON.stringify(index.reverse()));
                for (const entry of index) localStorage.setItem('sigma-conversations:user1:chat:' + entry.id, JSON.stringify([
                    { role: 'user', text: '<script>bad()</script>', stamp: 'Today' }, { role: 'assistant', text: 'Answer for ' + entry.id, stamp: 'Today' }
                ]));
                document.getElementById('sigmaAiMessages').innerHTML = '<div class="sigma-ai-message" data-sigma-greeting="true"><div class="sigma-ai-message__bubble">Hello!</div></div>';
                window.readChatKeys = [];
                const get = Storage.prototype.getItem;
                Storage.prototype.getItem = function(key) { if (key.includes(':chat:')) window.readChatKeys.push(key); return get.call(this, key); };
            });
            await page.addScriptTag({ path: path.join(root, 'js/sigma-conversations.js') });
            await page.getByRole('button', { name: 'Past conversations', exact: true }).click();
            assert.equal(await page.locator('.sigma-conversation-item').count(), 8);
            assert.equal(await page.getByRole('button', { name: 'Past conversations', exact: true }).evaluate(el => getComputedStyle(el).color), 'rgb(255, 208, 0)');
            assert.equal(await page.locator('.sigma-conversation-history').evaluate(el => el.scrollTop), 0);
            assert.equal(await page.locator('.sigma-conversation-item').first().getAttribute('data-conversation-id'), 'chat0');
            assert.equal((await page.evaluate(() => window.readChatKeys)).length, 0);
            assert.equal(await page.locator('#sigmaAiMessages').isVisible(), false);
            await page.getByRole('button', { name: 'Previous Conversations', exact: true }).click();
            assert.equal(await page.locator('.sigma-conversation-item').count(), 12);
            assert.equal(await page.getByRole('button', { name: 'Previous Conversations', exact: true }).count(), 0);
            assert.equal(await page.locator('.sigma-conversation-item .fa-chevron-right').count(), 0);
            await page.getByRole('button', { name: 'Conversation options: Conversation 1', exact: true }).click();
            assert.equal(await page.locator('.sigma-conversation-menu-delete:visible').evaluate(el => getComputedStyle(el).color), 'rgb(0, 0, 0)');
            assert.equal(await page.locator('.sigma-conversation-menu-delete:visible i').evaluate(el => getComputedStyle(el).color), 'rgb(0, 0, 0)');
            await page.getByRole('button', { name: 'Delete conversation: Conversation 1', exact: true }).click();
            assert.equal(await page.locator('[data-conversation-id="chat1"]').count(), 0);
            assert.equal(await page.evaluate(() => Boolean(JSON.parse(localStorage.getItem('sigma-conversations:user1:index')).find(item => item.id === 'chat1').deletedAt)), true);
            assert.ok(await page.evaluate(() => localStorage.getItem('sigma-conversations:user1:chat:chat1')));
            assert.equal(await page.locator('#sigmaAiMessages').isVisible(), false);
            await page.getByRole('button', { name: 'Undo', exact: true }).click();
            assert.equal(await page.locator('[data-conversation-id="chat1"]').count(), 1);
            await page.getByRole('button', { name: 'Conversation options: Conversation 1', exact: true }).click();
            await page.getByRole('button', { name: 'Delete conversation: Conversation 1', exact: true }).click();
            await page.evaluate(() => { window.readChatKeys = []; });
            await page.locator('.sigma-conversation-item').first().click();
            assert.equal((await page.evaluate(() => window.readChatKeys)).length, 1);
            assert.match(await page.locator('#sigmaAiMessages').textContent(), /Answer for chat0/);
            assert.equal(await page.locator('#sigmaAiMessages script').count(), 0);
            await page.getByRole('button', { name: 'New chat', exact: true }).click();
            assert.match(await page.locator('#sigmaAiMessages').textContent(), /Hello!/);
            await page.evaluate(() => {
                const row = document.createElement('div'); row.className = 'sigma-ai-message sigma-ai-message--user';
                row.innerHTML = '<div class="sigma-ai-message__meta">Today</div><div class="sigma-ai-message__bubble">New question</div>';
                document.getElementById('sigmaAiMessages').append(row);
            });
            await page.waitForFunction(() => JSON.parse(localStorage.getItem('sigma-conversations:user1:index'))[0].title === 'New question');
            await page.getByRole('button', { name: 'Past conversations', exact: true }).click();
            assert.equal(await page.locator('.sigma-conversation-item').count(), 8);
            assert.match(await page.locator('.sigma-conversation-item').first().textContent(), /New question/);
            await page.getByRole('button', { name: 'Past conversations', exact: true }).click();
            await page.evaluate(() => { document.getElementById('sigmaAiSendBtn').disabled = true; });
            await page.waitForFunction(() => document.querySelector('.sigma-conversation-actions button').disabled);
            assert.equal(await page.getByRole('button', { name: 'New chat', exact: true }).isDisabled(), true);
            await page.evaluate(() => { document.getElementById('sigmaAiSendBtn').disabled = false; });
            for (const width of [1200, 390, 320]) {
                await page.setViewportSize({ width, height: 800 });
                assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
            }
            await page.getByRole('button', { name: 'Past conversations', exact: true }).click();
            await page.screenshot({ path: path.join(process.env.TEMP, 'sigma-conversations-' + path.basename(file) + '.png') });
            for (const user of ['user2', 'user1']) {
                await page.setContent(panel);
                await page.evaluate(user => {
                    document.getElementById('sigmaAiPanel').classList.remove('hidden');
                    sessionStorage.setItem('sigma-authenticated-user', JSON.stringify({ uid: user }));
                }, user);
                for (const css of ['forms.css', 'shared-components.css', 'sigma-conversations.css']) await page.addStyleTag({ path: path.join(root, 'css', css) });
                await page.addStyleTag({ content: '#sigmaAiPanel{display:flex;flex-direction:column;width:100%;height:650px}.sigma-ai-header{display:flex;align-items:center}' });
                await page.addScriptTag({ content: shared.slice(start, shared.indexOf('\n};', start) + 3) });
                await page.addScriptTag({ path: path.join(root, 'js/sigma-conversations.js') });
                await page.getByRole('button', { name: 'Past conversations', exact: true }).click();
                if (user === 'user2') {
                    assert.equal(await page.locator('.sigma-conversation-item').count(), 0);
                    assert.match(await page.locator('.sigma-conversation-empty').textContent(), /No conversations yet/);
                } else {
                    assert.match(await page.locator('.sigma-conversation-item').first().textContent(), /New question/);
                    assert.equal(await page.locator('[data-conversation-id="chat1"]').count(), 0);
                }
            }
            await page.getByRole('button', { name: 'New chat', exact: true }).click();
            await page.evaluate(() => {
                window.SigmaConversationTitles = { generate: async () => 'Learning About Fractions' };
                const message = document.createElement('div'); message.className = 'sigma-ai-message sigma-ai-message--user';
                message.innerHTML = '<div class="sigma-ai-message__bubble">Explain fractions</div>';
                document.getElementById('sigmaAiMessages').append(message);
            });
            await page.waitForFunction(() => JSON.parse(localStorage.getItem('sigma-conversations:user1:index'))[0].titleSource === 'ai');
            assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('sigma-conversations:user1:index'))[0].title), 'Learning About Fractions');
            await page.evaluate(() => { delete window.SigmaConversationTitles; });
            await page.getByRole('button', { name: 'New chat', exact: true }).click();
            await page.evaluate(() => {
                Storage.prototype.setItem = function() { throw new DOMException('Full', 'QuotaExceededError'); };
                const message = document.createElement('div'); message.className = 'sigma-ai-message sigma-ai-message--user';
                message.innerHTML = '<div class="sigma-ai-message__bubble">Cannot save</div>';
                document.getElementById('sigmaAiMessages').append(message);
            });
            await page.waitForFunction(() => !document.querySelector('.sigma-conversation-notice').hidden);
            assert.match(await page.locator('#sigmaAiMessages').textContent(), /Cannot save/);
            await page.getByRole('button', { name: 'Past conversations', exact: true }).click();
            await page.getByRole('button', { name: 'Conversation options: Conversation 0', exact: true }).click();
            await page.getByRole('button', { name: 'Delete conversation: Conversation 0', exact: true }).click();
            assert.equal(await page.locator('[data-conversation-id="chat0"]').count(), 1);
            await page.close();
        }
        console.log('SIGMA history works across all portals: recent first, pagination, lazy chat reads, safe restore, new chat, persistence, pending guards and responsive layout.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
