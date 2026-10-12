const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { chromium } = require('playwright');

(async () => {
    const screenshotDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sigma-ai-routing-'));
    const browser = await chromium.launch({ headless: true, channel: 'chrome' });
    try {
        const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
        const html = fs.readFileSync(path.join(__dirname, '../admin.html'), 'utf8');
        const start = html.indexOf('<section id="settings-ai-view"');
        const section = html.slice(start, html.indexOf('</section>', start) + 10);
        await page.route('http://sigma.test/image/*', route => {
            const filename = new URL(route.request().url()).pathname.split('/').pop();
            return route.fulfill({ contentType: filename.endsWith('.ico') ? 'image/x-icon' : 'image/svg+xml', body: fs.readFileSync(path.join(__dirname, '../image', filename)) });
        });
        await page.route(/^http:\/\/sigma\.test\/.*\.css(?:\?.*)?$/, route => {
            const filename = new URL(route.request().url()).pathname.split('/').pop();
            return route.fulfill({ contentType: 'text/css', body: fs.readFileSync(path.join(__dirname, '../css', filename)) });
        });
        await page.route('http://sigma.test/', route => route.fulfill({ body: '<html></html>', contentType: 'text/html' }));
        await page.goto('http://sigma.test/');
        await page.setContent('<base href="http://sigma.test/">' + section);
        await page.locator('#settings-ai-view').evaluate(node => node.classList.remove('hidden'));
        await page.addStyleTag({ path: path.join(__dirname, '../css/tailwind.css') });
        await page.addStyleTag({ path: path.join(__dirname, '../css/admin.css') });
        await page.addStyleTag({ path: path.join(__dirname, '../css/forms.css') });
        await page.addStyleTag({ path: path.join(__dirname, '../css/shared-components.css') });
        await page.addStyleTag({ content: 'body{font-family:Arial;margin:0} #settings-ai-view{max-width:960px;margin:auto}' });
        await page.addStyleTag({ path: path.join(__dirname, '../css/settings-view.css') });
        await page.addScriptTag({ path: path.join(__dirname, '../js/ai-routing-settings.js') });
        const adminSource = fs.readFileSync(path.join(__dirname, '../js/admin.js'), 'utf8');
        const controllerStart = adminSource.indexOf('    window.openAiSettingsPage = function');
        const controllerEnd = adminSource.indexOf('    const recaptchaPageState =', controllerStart);
        await page.addScriptTag({ content: 'const resolveAuthApiUrl = () => "https://example.invalid/mock-ai";\n' + adminSource.slice(controllerStart, controllerEnd) });
        const data = {
            keys: [
                { id: 'g1', label: 'Gemini Primary', provider: 'gemini', model: 'Configured model' },
                { id: 'g2', label: 'Gemini Backup', provider: 'gemini', model: 'Backup model' },
                { id: 'x1', label: 'Groq Primary', provider: 'groq', model: 'Configured model' }
            ],
            routing: { features: Object.fromEntries(['sigmabot', 'analytics', 'quiz', 'submission_evaluation', 'submission_feedback', 'grade_insights'].map(id => [id, 'gemini'])), defaults: { gemini: 'g1', groq: 'x1' }, allow_fallback: false }
        };
        await page.evaluate(data => {
            for (const provider of ['gemini', 'groq']) {
                const badge = document.createElement('span');
                badge.id = 'badge-' + provider + '-live-status';
                badge.hidden = true;
                document.body.append(badge);
            }
            window.alert = () => {};
            window.persistAiRoutingSettings = async value => { window.savedPayload = value; return value; };
            window.renderAiRouting(data);
        }, data);
        assert.equal(await page.locator('#ai-routing-rows tr').count(), 6);
        assert.equal(await page.locator('#badge-gemini-live-status').textContent(), 'Configured model');
        assert.equal(await page.locator('.ai-routing-table thead th').first().evaluate(node => getComputedStyle(node).color), 'rgb(255, 255, 255)');
        assert.equal(await page.locator('.ai-routing-table thead th').first().evaluate(node => getComputedStyle(node).backgroundColor), 'rgb(21, 128, 61)');
        assert.equal(await page.locator('#ai-routing-rows td').first().evaluate(node => getComputedStyle(node).padding), '16px 20px');
        for (const cell of await page.locator('#ai-routing-rows td:first-child').all()) {
            assert.equal(await cell.evaluate(node => getComputedStyle(node).color), 'rgb(21, 128, 61)');
        }
        assert.equal(await page.locator('.ai-routing-table').evaluate(node => node.classList.contains('sigma-table')), true);
        assert.equal(await page.locator('#ai-save-routing').count(), 0);
        const tabAppearance = node => {
            const style = getComputedStyle(node);
            return { background: style.backgroundColor, radius: style.borderRadius };
        };
        await page.locator('#ai-functions-tab').hover();
        assert.deepEqual(await page.locator('#ai-functions-tab').evaluate(tabAppearance), { background: 'rgba(0, 0, 0, 0)', radius: '0px' });
        await page.locator('#ai-keys-tab').hover();
        assert.deepEqual(await page.locator('#ai-keys-tab').evaluate(tabAppearance), { background: 'rgb(241, 245, 249)', radius: '8px' });
        assert.equal(await page.locator('#ai-routing-rows select').count(), 0);
        assert.equal(await page.locator('#ai-routing-rows input[type="radio"]:checked').count(), 6);
        assert.equal(await page.locator('.ai-feature-status-cell').count(), 6);
        assert((await page.locator('.ai-feature-status-cell').allTextContents()).every(value => value === 'Not used yet'));
        assert.equal(await page.locator('#ai-routing-rows img[src$="gemini-logo.svg"]').count(), 6);
        assert.equal(await page.locator('#ai-routing-rows img[src$="groq-logo.ico"]').count(), 6);
        for (const provider of ['gemini', 'groq']) {
            assert.equal(await page.locator(`.ai-provider-group[data-provider="${provider}"] .ai-provider-brand`).evaluate(node => getComputedStyle(node).backgroundColor), 'rgba(0, 0, 0, 0)');
        }
        await page.waitForFunction(() => Array.from(document.querySelectorAll('.ai-provider-logo')).every(img => img.complete && img.naturalWidth > 0));
        const selectedAppearance = node => ({ background: getComputedStyle(node).backgroundColor, color: getComputedStyle(node).color });
        assert.deepEqual(await page.locator('#ai-route-quiz input[value="gemini"] + span').evaluate(selectedAppearance), { background: 'rgb(255, 255, 255)', color: 'rgb(0, 0, 0)' });
        assert.equal(await page.locator('#ai-route-quiz').evaluate(node => getComputedStyle(node).backgroundColor), 'rgb(241, 245, 249)');
        assert.equal(await page.locator('#ai-route-quiz').evaluate(node => getComputedStyle(node).borderRadius), '12px');
        assert.equal(await page.locator('#ai-route-quiz input[value="gemini"] + span').evaluate(node => getComputedStyle(node).borderRadius), '8px');
        await page.locator('#ai-route-quiz input[value="gemini"] + span').hover();
        assert.deepEqual(await page.locator('#ai-route-quiz input[value="gemini"] + span').evaluate(selectedAppearance), { background: 'rgb(255, 255, 255)', color: 'rgb(0, 0, 0)' });
        await page.locator('#ai-route-quiz label').filter({ hasText: 'Groq' }).click();
        assert.deepEqual(await page.locator('#ai-route-quiz input[value="groq"] + span').evaluate(selectedAppearance), { background: 'rgb(255, 255, 255)', color: 'rgb(0, 0, 0)' });
        assert.equal(await page.locator('#ai-route-quiz input[value="groq"]').isChecked(), true);
        assert.equal(await page.locator('#ai-default-for-quiz .ai-default-key-label').textContent(), 'Groq Primary');
        assert.equal(await page.locator('#ai-default-for-quiz .ai-default-key-model').textContent(), 'Configured model');
        await page.locator('.ai-fallback-switch').click();
        await page.waitForFunction(() => window.savedPayload.allow_fallback === true);
        assert.equal(await page.evaluate(() => window.savedPayload.allow_fallback), true);
        assert.equal(await page.evaluate(() => window.savedPayload.features.quiz), 'groq');
        assert.equal(await page.locator('#ai-save-routing').count(), 0);
        await page.locator('#ai-route-analytics label').filter({ hasText: 'Groq' }).click();
        await page.locator('#ai-keys-tab').click();
        for (const provider of ['gemini', 'groq']) {
            const card = page.locator('.ai-provider-group[data-provider="' + provider + '"]');
            assert.equal(await card.evaluate(node => getComputedStyle(node).backgroundColor), 'rgb(255, 255, 255)');
            assert.equal(await card.evaluate(node => getComputedStyle(node).borderRadius), '8px');
            assert.equal(await card.locator('h2').evaluate(node => getComputedStyle(node).color), 'rgb(0, 0, 0)');
            assert.equal(await card.locator('select').evaluate(node => getComputedStyle(node).paddingRight), '44px');
            assert.equal(await card.locator('.ai-select-chevron').evaluate(node => getComputedStyle(node).right), '16px');
            await card.locator('img').evaluate(img => img.decode());
            assert.equal(await card.locator('.ai-provider-brand').evaluate(node => getComputedStyle(node).backgroundColor), 'rgba(0, 0, 0, 0)');
        }
        assert.deepEqual(await page.locator('#ai-keys-tab').evaluate(tabAppearance), { background: 'rgba(0, 0, 0, 0)', radius: '0px' });
        await page.locator('#ai-functions-tab').hover();
        assert.deepEqual(await page.locator('#ai-functions-tab').evaluate(tabAppearance), { background: 'rgb(241, 245, 249)', radius: '8px' });
        await page.locator('#ai-default-gemini').selectOption('g2');
        await page.waitForFunction(() => document.getElementById('ai-provider-feedback').textContent === 'Saved');
        assert.equal(await page.locator('#ai-save-defaults').count(), 0);
        assert.equal(await page.evaluate(() => window.savedPayload.defaults.gemini), 'g2');
        assert.equal(await page.evaluate(() => window.savedPayload.features.analytics), 'groq', 'Feature assignment saves automatically');
        assert.equal(await page.locator('#badge-gemini-live-status').textContent(), 'Backup model');
        await page.screenshot({ path: path.join(screenshotDir, 'ai-provider-keys-desktop.png'), fullPage: true });
        await page.locator('#ai-functions-tab').click();
        assert.equal(await page.locator('#ai-route-analytics input[value="groq"]').isChecked(), true, 'Default-key changes preserve the saved feature selection');
        assert.equal(await page.locator('#ai-save-routing').count(), 0);
        assert.equal(await page.locator('#ai-default-for-sigmabot .ai-default-key-label').textContent(), 'Gemini Backup');
        assert.equal(await page.locator('#ai-default-for-sigmabot .ai-default-key-model').textContent(), 'Backup model');
        await page.screenshot({ path: path.join(screenshotDir, 'ai-routing-desktop.png'), fullPage: true });
        await page.locator('#ai-keys-tab').click();
        await page.evaluate(() => {
            window.originalRoutingPersist = window.persistAiRoutingSettings;
            window.persistAiRoutingSettings = () => new Promise((_resolve, reject) => { window.rejectDefaultSave = reject; });
        });
        await page.locator('#ai-default-gemini').selectOption('g1');
        assert.equal(await page.locator('#ai-provider-feedback').textContent(), 'Saving...');
        assert.equal(await page.locator('#ai-default-gemini').isDisabled(), true);
        assert.equal(await page.locator('#ai-default-groq').isDisabled(), true);
        await page.evaluate(() => window.rejectDefaultSave(new Error('Test autosave failure')));
        await page.waitForFunction(() => document.getElementById('ai-provider-feedback').textContent.includes('Test autosave failure'));
        assert.equal(await page.locator('#ai-default-gemini').inputValue(), 'g2');
        assert.equal(await page.locator('#ai-default-gemini').isDisabled(), false);
        assert.equal(await page.locator('#ai-default-for-sigmabot .ai-default-key-label').textContent(), 'Gemini Backup');
        assert.equal(await page.locator('#badge-gemini-live-status').textContent(), 'Backup model');
        await page.evaluate(() => { window.persistAiRoutingSettings = window.originalRoutingPersist; });
        await page.locator('#ai-default-gemini').selectOption('g1');
        await page.waitForFunction(() => document.getElementById('ai-provider-feedback').textContent === 'Saved');
        assert.equal(await page.evaluate(() => window.savedPayload.defaults.gemini), 'g1');
        await page.evaluate(data => {
            window.fetch = async (_url, options) => {
                if (options) {
                    const payload = JSON.parse(options.body);
                    if (payload.action === 'discover_ai_key') {
                        if (payload.api_key?.includes('rejected')) return { ok: false, json: async () => ({ success: false, error: 'Test key rejected' }) };
                        const provider = payload.api_key ? (payload.api_key.startsWith('gsk_') ? 'groq' : 'gemini') : data.keys.find(key => key.id === payload.id).provider;
                        return { ok: true, json: async () => ({ success: true, provider, models: [{ id: provider + '-test-model', label: 'Test model' }] }) };
                    }
                    window.keySavePayload = payload;
                    return { ok: true, json: async () => ({ success: true }) };
                }
                return { json: async () => ({ ...data, success: true }) };
            };
        }, data);
        await page.locator('#ai-keys-tab').click();
        await page.evaluate(() => {
            const header = document.createElement('header');
            header.id = 'test-fixed-header';
            header.style.cssText = 'position:fixed;top:0;left:0;right:0;height:104px;background:white;z-index:9999';
            document.body.prepend(header);
            document.body.style.paddingTop = '104px';
            window.scrollTo(0, 300);
        });
        await page.locator('#btn-open-add-ai-key').click();
        assert.equal(await page.evaluate(() => window.scrollY), 0);
        assert.equal(await page.locator('#ai-key-form-title').evaluate(node => node.getBoundingClientRect().top >= 104), true, 'Form heading must stay below fixed header');
        await page.evaluate(() => {
            document.getElementById('test-fixed-header').remove();
            document.body.style.paddingTop = '';
        });
        assert.equal(await page.locator('#ai-add-key-card').isVisible(), true);
        assert.equal(await page.locator('#ai-provider-panel').isVisible(), false);
        assert.equal(await page.locator('#ai-functions-panel').isVisible(), false);
        assert.equal(await page.locator('#settings-ai-view .ai-engine-tabs').isVisible(), false);
        assert.equal(await page.locator('#ai-configured-keys').isVisible(), false);
        assert.equal(await page.locator('#btn-open-add-ai-key').isVisible(), false);
        assert.equal(await page.locator('#ai-form-label-input, #ai-form-provider-select, #ai-form-set-active-check').count(), 0);
        assert.equal(await page.locator('#ai-form-model-field').isVisible(), false);
        await page.locator('#ai-form-key-input').fill('unrecognized-test-key');
        assert.equal(await page.locator('#btn-toggle-ai-form-key').isVisible(), true);
        await page.locator('#btn-toggle-ai-form-key').click();
        assert.equal(await page.locator('#ai-form-key-input').getAttribute('type'), 'text');
        assert.equal(await page.locator('#btn-toggle-ai-form-key').getAttribute('aria-label'), 'Hide key');
        await page.locator('#btn-toggle-ai-form-key').click();
        assert.equal(await page.locator('#ai-form-key-input').getAttribute('type'), 'password');
        assert.equal(await page.locator('#btn-toggle-ai-form-key i.fa-eye-slash').count(), 1);
        assert.equal(await page.locator('#btn-submit-ai-key').isDisabled(), true);
        await page.locator('#ai-form-key-input').fill('gsk_rejected-test-secret-123456');
        await page.waitForFunction(() => document.getElementById('ai-form-detection-feedback').textContent === 'Test key rejected');
        assert.equal(await page.locator('#ai-form-model-field').isVisible(), false);
        assert.equal(await page.locator('#btn-submit-ai-key').isDisabled(), true);
        await page.locator('#ai-form-key-input').fill('gsk_test-only-secret-123456');
        await page.waitForFunction(() => document.getElementById('ai-form-provider-badge').textContent === 'Groq - Verified');
        await page.locator('#ai-form-model-select').selectOption('groq-test-model');
        assert.equal(await page.locator('#btn-submit-ai-key').isDisabled(), false);
        await page.locator('#ai-form-key-input').fill('AIza-test-only-secret-123456');
        await page.waitForFunction(() => document.getElementById('ai-form-provider-badge').textContent === 'Google Gemini - Verified');
        await page.locator('#ai-form-model-select').selectOption('gemini-test-model');
        await page.locator('#ai-form-model-select').evaluate(select => select.classList.add('is-placeholder'));
        await page.waitForFunction(() => getComputedStyle(document.getElementById('ai-form-model-select')).color === 'rgb(0, 0, 0)');
        assert.equal(await page.locator('#ai-form-model-select').evaluate(select => getComputedStyle(select).color), 'rgb(0, 0, 0)', 'A real selected model stays black even if a stale placeholder class exists');
        await page.setViewportSize({ width: 1200, height: 900 });
        await page.screenshot({ path: path.join(screenshotDir, 'ai-key-detection-desktop.png'), fullPage: true });
        for (const width of [600, 390, 320]) {
            await page.setViewportSize({ width, height: 900 });
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Key editor must fit at ' + width);
        }
        await page.screenshot({ path: path.join(screenshotDir, 'ai-key-detection-narrow.png'), fullPage: true });
        await page.evaluate(() => window.handleSaveAiKeySubmit({ preventDefault() {} }));
        assert.equal(await page.evaluate(() => window.keySavePayload.action), 'save_ai_vault_key');
        assert.equal(await page.locator('#ai-provider-panel').isVisible(), true);
        assert.equal(await page.locator('#settings-ai-view .ai-engine-tabs').isVisible(), true);
        assert.equal(await page.evaluate(() => window.keySavePayload.provider), 'gemini');
        assert.equal(await page.evaluate(() => window.keySavePayload.set_provider_default), false);
        assert.equal(await page.locator('#ai-add-key-card').isVisible(), false);
        assert.equal(await page.locator('#btn-open-add-ai-key').isVisible(), true);
        await page.addScriptTag({ path: path.join(__dirname, '../js/ai-log-store.js') });
        const originalLogs = await page.evaluate(() => {
            window.SigmaAiLogs.record({ id: 'historical-model-request', userId: 'student-1', feature: 'analytics', model: 'original-model', prompt: 'Original request', response: 'Original insight', status: 'Success', timestamp: '2026-10-01T04:00:00Z' });
            return localStorage.getItem('sigma-ai-recorded-logs');
        });
        await page.locator('.ai-key-actions button').filter({ hasText: 'Edit' }).first().click();
        assert.equal(await page.locator('.ai-key-actions button').filter({ hasText: 'Delete' }).count(), 0);
        assert.equal(await page.locator('#btn-delete-ai-key').isVisible(), true);
        assert.equal(await page.locator('#btn-open-add-ai-key').isVisible(), false);
        assert.equal(await page.locator('#ai-form-key-input').inputValue(), '');
        assert.equal(await page.locator('#ai-form-key-input').getAttribute('type'), 'password');
        await page.waitForFunction(() => document.getElementById('ai-form-detection-feedback').textContent === '');
        await page.locator('#ai-form-model-select').selectOption('gemini-test-model');
        await page.evaluate(() => window.handleSaveAiKeySubmit({ preventDefault() {} }));
        assert.equal(await page.evaluate(() => window.keySavePayload.api_key), '__PRESERVE__');
        assert.equal(await page.evaluate(() => window.keySavePayload.model), 'gemini-test-model');
        assert.equal(await page.evaluate(() => localStorage.getItem('sigma-ai-recorded-logs')), originalLogs, 'Changing a saved key model must not rewrite historical logs');
        await page.evaluate(() => window.SigmaAiLogs.record({ id: 'new-model-request', userId: 'student-1', feature: 'analytics', model: 'gemini-test-model', prompt: 'New request', response: 'New insight', status: 'Success', timestamp: '2026-10-10T04:00:00Z' }));
        const models = await page.evaluate(() => window.SigmaAiLogs.getRecords().map(log => ({ id: log.id, model: log.model })));
        assert.deepEqual(models, [{ id: 'new-model-request', model: 'gemini-test-model' }, { id: 'historical-model-request', model: 'original-model' }]);
        const preferredBefore = await page.locator('#ai-route-quiz input:checked').inputValue();
        await page.evaluate(() => window.SigmaAiLogs.record({ id: 'quiz-fallback-status', userId: 'teacher-1', feature: 'quiz', model: 'actual-groq-model', provider: 'groq', keyId: 'x1', keyLabel: 'Groq Backup', status: 'Fallback Used', timestamp: '2026-10-10T06:00:00Z' }));
        assert((await page.locator('#ai-status-for-quiz').textContent()).includes('Fallback Used'));
        assert((await page.locator('#ai-status-for-quiz').textContent()).includes('Last used: Groq Backup'));
        assert((await page.locator('#ai-status-for-quiz').textContent()).includes('actual-groq-model'));
        assert.equal(await page.locator('#ai-status-for-quiz .ai-feature-status-detail').nth(1).textContent(), 'actual-groq-model');
        assert.equal(await page.locator('#ai-route-quiz input:checked').inputValue(), preferredBefore, 'Status updates do not overwrite the saved preference');
        assert.equal(await page.locator('#ai-status-for-sigmabot').textContent(), 'Not used yet');
        await page.locator('#ai-functions-tab').click();
        assert.equal(await page.locator('#btn-delete-ai-key').isVisible(), false);
        await page.evaluate(() => { window.persistAiRoutingSettings = async () => { throw new Error('Test save failure'); }; });
        const beforeFailure = await page.locator('#ai-route-quiz input:checked').inputValue();
        await page.locator('#ai-route-quiz label').filter({ hasText: beforeFailure === 'groq' ? 'Gemini' : 'Groq' }).click();
        await page.waitForFunction(() => document.getElementById('ai-routing-feedback').textContent.includes('Test save failure'));
        assert.equal(await page.locator('#ai-route-quiz input:checked').inputValue(), beforeFailure);
        assert.equal(await page.locator('#ai-allow-fallback').isDisabled(), false);
        const fallbackBeforeFailure = await page.locator('#ai-allow-fallback').isChecked();
        await page.locator('.ai-fallback-switch').click();
        await page.waitForFunction(() => !document.getElementById('ai-allow-fallback').disabled);
        assert.equal(await page.locator('#ai-allow-fallback').isChecked(), fallbackBeforeFailure);
        for (const width of [960, 600, 390, 320]) {
            await page.setViewportSize({ width, height: 900 });
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'No overflow at ' + width);
        }
        await page.screenshot({ path: path.join(screenshotDir, 'ai-routing-narrow.png'), fullPage: true });
        await page.evaluate(data => window.renderAiRouting({ ...data, keys: [], routing: { ...data.routing, defaults: { gemini: '', groq: '' } } }), data);
        await page.locator('#ai-keys-tab').click();
        assert.equal(await page.locator('#ai-default-gemini').isDisabled(), true);
        assert.equal(await page.locator('#badge-gemini-live-status').textContent(), 'Not Configured');
        assert.equal(await page.locator('#ai-keys-list-container').textContent(), 'No API Keys Added Yet');
        assert.equal(await page.locator('.ai-keys-empty').isVisible(), true);
        assert.equal(await page.locator('#ai-provider-panel').isVisible(), true);
        assert.equal(await page.locator('.ai-keys-empty').evaluate(node => getComputedStyle(node).borderRadius), '8px');
        assert.equal(await page.getByRole('button', { name: 'Add API Key', exact: true }).count(), 1);
        await page.locator('#btn-open-add-ai-key').click();
        assert.equal(await page.locator('.ai-keys-empty').isVisible(), false);
        assert.equal(await page.locator('#ai-configured-keys').isVisible(), false);
        assert.equal(await page.locator('#ai-add-key-card').isVisible(), true);
        assert.equal(await page.locator('#btn-open-add-ai-key').isVisible(), false);
        await page.locator('#ai-add-key-card').getByRole('button', { name: 'Cancel', exact: true }).click();
        assert.equal(await page.locator('.ai-keys-empty').isVisible(), true);
        assert.equal(await page.locator('#btn-open-add-ai-key').isVisible(), true);
        await page.locator('#btn-open-add-ai-key').click();
        assert.equal(await page.locator('#ai-key-form-title').textContent(), 'Add API Key');
        assert.equal(await page.locator('#ai-add-key-card').getByRole('button', { name: 'Close API key form', exact: true }).count(), 0);
        await page.locator('#ai-add-key-card').getByRole('button', { name: 'Cancel', exact: true }).click();
        assert.equal(await page.locator('#btn-open-add-ai-key').isVisible(), true);
        await page.evaluate(() => history.replaceState({}, '', '#settings-ai-view'));
        await page.addScriptTag({ path: path.join(__dirname, '../js/system-settings-history.js') });
        await page.locator('#btn-open-add-ai-key').click();
        assert.equal(await page.locator('#ai-add-key-card').isVisible(), true);
        await page.evaluate(() => history.back());
        await page.waitForFunction(() => document.getElementById('ai-add-key-card').classList.contains('hidden'));
        assert.equal(await page.locator('#ai-provider-panel').isVisible(), true);
        await page.evaluate(() => history.forward());
        await page.waitForFunction(() => !document.getElementById('ai-add-key-card').classList.contains('hidden'));
        assert.equal(await page.locator('#ai-provider-panel').isVisible(), false);
        assert.equal(await page.locator('#ai-form-key-input').inputValue(), '');
        await page.locator('#ai-add-key-card').getByRole('button', { name: 'Cancel', exact: true }).click();
        await page.waitForFunction(() => history.state.sigmaSettings.kind === 'base');
        assert.equal(await page.locator('#ai-provider-panel').isVisible(), true);
        console.log('AI routing UI tests passed: six features, automatic assignment/fallback/default saves, failure rollback, eyes, history, and responsive layout.');
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
