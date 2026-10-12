(function () {
    'use strict';
    const features = [
        ['sigmabot', 'Sigma Bot'],
        ['analytics', 'Analytics Insights'],
        ['quiz', 'Assessment Generation'],
        ['submission_evaluation', 'Submission Evaluation'],
        ['submission_feedback', 'Submission Feedback'],
        ['grade_insights', 'Grade Insights']
    ];
    const providers = { gemini: 'Google Gemini', groq: 'Groq' };
    const logoBase = document.currentScript?.src
        ? new URL('../image/', document.currentScript.src).href
        : (location.pathname.includes('/php/') ? '../image/' : 'image/');
    let keys = [], saved = null, draft = null, selectedTab = 'functions', saving = false;
    const tabStorageKey = 'sigma-ai-settings-tab:' + location.pathname;
    try { if (sessionStorage.getItem(tabStorageKey) === 'keys') selectedTab = 'keys'; } catch (_) {}
    const byId = id => document.getElementById(id);
    const clone = value => JSON.parse(JSON.stringify(value));

    window.refreshAiFeatureStatuses = function () {
        const logs = window.SigmaAiLogs?.getRecords() || [];
        features.forEach(([id]) => {
            const cell = byId('ai-status-for-' + id);
            if (!cell) return;
            cell.replaceChildren();
            const last = logs.filter(log => log.feature === id).sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))[0];
            if (!last) { cell.textContent = 'Not used yet'; return; }
            const status = element('span', last.status, 'ai-feature-status');
            status.dataset.status = last.status;
            cell.append(status);
            if (last.keyLabel) cell.append(element('div', 'Last used: ' + last.keyLabel, 'ai-feature-status-detail'));
            cell.append(element('div', last.model || 'Model not recorded', 'ai-feature-status-detail'));
            const stamp = new Date(last.timestamp);
            if (Number.isFinite(stamp.getTime())) cell.append(element('div', new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(stamp), 'ai-feature-status-detail'));
        });
    };
    window.addEventListener('sigma:ai-logs-updated', () => window.refreshAiFeatureStatuses());
    window.addEventListener('storage', event => { if (!event.key || event.key === 'sigma-ai-recorded-logs') window.refreshAiFeatureStatuses(); });

    function element(tag, text, className) {
        const node = document.createElement(tag);
        if (text !== undefined) node.textContent = text;
        if (className) node.className = className;
        return node;
    }

    function paintDefaultKeys() {
        features.forEach(([id]) => {
            const key = keys.find(key => key.id === draft.defaults[draft.features[id]]);
            const cell = byId('ai-default-for-' + id);
            if (cell) {
                cell.replaceChildren(element('div', key?.label || 'Not configured', 'ai-default-key-label'));
                if (key?.model) cell.append(element('div', key.model, 'ai-default-key-model'));
            }
        });
    }

    function renderProviderBadges() {
        Object.keys(providers).forEach(provider => {
            const badge = byId('badge-' + provider + '-live-status');
            if (!badge) return;
            const key = keys.find(key => key.id === saved.defaults[provider]);
            badge.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 pointer-events-none select-none cursor-default';
            badge.replaceChildren(element('span', key?.model || 'Not Configured', provider + '-status-text'));
        });
    }

    window.markAiRoutingDirty = function () {
        if (!draft) return;
        draft.allow_fallback = byId('ai-allow-fallback').checked;
        features.forEach(([id]) => {
            const select = byId('ai-route-' + id);
            if (select) select.disabled = saving;
        });
        byId('ai-allow-fallback').disabled = saving;
        Object.keys(providers).forEach(provider => {
            const select = byId('ai-default-' + provider);
            if (select) select.disabled = saving || !keys.some(key => key.provider === provider);
        });
        document.querySelectorAll('#btn-open-add-ai-key, #ai-keys-list-container .ai-key-actions button').forEach(button => {
            button.disabled = saving;
        });
        paintDefaultKeys();
    };

    window.syncAiKeyListVisibility = function () {
        const list = byId('ai-keys-list-container')?.parentElement;
        const editorOpen = !byId('ai-add-key-card')?.classList.contains('hidden');
        if (list) list.hidden = selectedTab !== 'keys' || editorOpen;
        const tabs = document.querySelector('#settings-ai-view .ai-engine-tabs');
        if (tabs) tabs.hidden = editorOpen;
        byId('ai-functions-panel').hidden = editorOpen || selectedTab !== 'functions';
        byId('ai-provider-panel').hidden = editorOpen || selectedTab !== 'keys';
    };

    window.getAiSettingsKeyById = id => keys.find(key => key.id === id);
    window.selectAiSettingsTab = function (tab, recordHistory = true) {
        selectedTab = tab === 'keys' ? 'keys' : 'functions';
        try { sessionStorage.setItem(tabStorageKey, selectedTab); } catch (_) {}
        const isKeys = selectedTab === 'keys';
        byId('ai-functions-panel').hidden = isKeys;
        byId('ai-provider-panel').hidden = !isKeys;
        if (!isKeys) window.toggleAddAiKeyForm?.(false, null, false);
        window.syncAiKeyListVisibility();
        ['functions', 'keys'].forEach(name => {
            const tabButton = byId('ai-' + name + '-tab');
            tabButton.setAttribute('aria-selected', String(name === selectedTab));
            tabButton.setAttribute('aria-pressed', String(name === selectedTab));
        });
        window.resetAiSettingsViewport?.();
        if (recordHistory) window.recordSystemSettingsLayer?.({ kind: 'ai-tab', tab: selectedTab });
    };

    window.openAiKeyEditor = function (key = null) {
        window.selectAiSettingsTab('keys', false);
        window.toggleAddAiKeyForm(true, key);
    };

    window.saveAiRoutingSettings = async function () {
        if (!draft || saving) return;
        if (JSON.stringify(draft) === JSON.stringify(saved)) return;
        const feedback = byId('ai-routing-feedback');
        saving = true;
        window.markAiRoutingDirty();
        feedback.textContent = 'Saving...';
        feedback.style.color = '#111';
        try {
            const routing = await window.persistAiRoutingSettings(clone(draft));
            saved = clone(routing);
            draft = clone(routing);
            window.aiRoutingDefaults = clone(saved.defaults);
            renderProviderBadges();
            feedback.textContent = 'Settings saved.';
            feedback.style.color = '#15803d';
        } catch (error) {
            draft = clone(saved);
            byId('ai-allow-fallback').checked = draft.allow_fallback;
            features.forEach(([id]) => {
                document.querySelectorAll('#ai-route-' + id + ' input').forEach(input => {
                    input.checked = input.value === draft.features[id];
                });
            });
            feedback.textContent = 'Change was not saved. ' + error.message;
            feedback.style.color = '#b91c1c';
        } finally {
            saving = false;
            window.markAiRoutingDirty();
        }
    };

    window.autoSaveAiRoutingSettings = function () {
        window.markAiRoutingDirty();
        return window.saveAiRoutingSettings();
    };

    async function saveProviderDefault(provider, id) {
        const select = byId('ai-default-' + provider);
        if (!saved || saving || id === saved.defaults[provider]) {
            if (saved) select.value = saved.defaults[provider];
            return;
        }
        const previous = saved.defaults[provider];
        const payload = clone(saved);
        payload.defaults[provider] = id;
        draft.defaults[provider] = id;
        const feedback = byId('ai-provider-feedback');
        saving = true;
        window.markAiRoutingDirty();
        feedback.textContent = 'Saving...';
        feedback.style.color = '#111';
        try {
            const routing = await window.persistAiRoutingSettings(payload);
            saved = clone(routing);
            draft.defaults = clone(saved.defaults);
            window.aiRoutingDefaults = clone(saved.defaults);
            renderProviderBadges();
            feedback.textContent = 'Saved';
            feedback.style.color = '#15803d';
        } catch (error) {
            draft.defaults[provider] = previous;
            feedback.textContent = 'Default key was not saved. ' + error.message;
            feedback.style.color = '#b91c1c';
        } finally {
            select.value = draft.defaults[provider];
            saving = false;
            window.markAiRoutingDirty();
        }
    }

    function renderKeys() {
        const container = byId('ai-keys-list-container');
        container.replaceChildren();
        if (!keys.length) {
            const empty = element('div', undefined, 'ai-keys-empty');
            empty.append(element('h3', 'No API Keys Added Yet'));
            container.append(empty);
            return;
        }
        keys.forEach(key => {
            const row = element('article', undefined, 'ai-stored-key');
            row.dataset.provider = key.provider;
            const detail = element('div');
            detail.append(element('h3', key.label));
            detail.append(element('p', (providers[key.provider] || key.provider) + ' · ' + key.model));
            detail.append(element('p', 'Secret key configured', 'ai-key-secret-status'));
            row.append(detail);
            const actions = element('div', undefined, 'ai-key-actions');
            const edit = element('button', 'Edit', 'sigma-btn sigma-btn-white sigma-btn-sm');
            edit.type = 'button';
            edit.onclick = () => window.openAiKeyEditor(key);
            const test = element('button', undefined, 'sigma-btn sigma-btn-white sigma-btn-sm');
            test.type = 'button';
            test.append(element('span', 'Test Connection', 'test-label'));
            test.onclick = () => window.testAiVaultKey(key.id, test);
            actions.append(edit, test);
            const actionColumn = element('div', undefined, 'ai-key-action-column');
            actionColumn.append(actions);
            row.append(actionColumn);
            const feedback = element('div', undefined, 'hidden');
            feedback.id = 'test-feedback-' + key.id;
            feedback.setAttribute('role', 'status');
            if (key.last_status && key.last_status !== 'untested') {
                feedback.className = 'mt-3 p-3 rounded-xl text-xs font-medium border border-slate-200 block';
                feedback.textContent = 'Last test: ' + key.last_status + (key.last_tested ? ' - ' + key.last_tested : '');
            }
            actionColumn.append(feedback);
            container.append(row);
        });
    }

    window.renderAiRouting = function (data) {
        if (!byId('ai-routing-rows')) return;
        keys = data.keys || [];
        saved = clone(data.routing || { features: Object.fromEntries(features.map(([id]) => [id, ['sigmabot', 'quiz'].includes(id) ? 'groq' : 'gemini'])), defaults: { gemini: '', groq: '' }, allow_fallback: true });
        saved.allow_fallback = saved.allow_fallback ?? true;
        draft = clone(saved);
        window.aiRoutingDefaults = clone(saved.defaults);
        renderProviderBadges();
        byId('ai-allow-fallback').checked = draft.allow_fallback;
        const body = byId('ai-routing-rows');
        body.replaceChildren();
        features.forEach(([id, title]) => {
            const row = element('tr');
            const heading = element('td', title);
            const choice = element('td');
            choice.dataset.label = 'Preferred Provider';
            const toggle = element('fieldset', undefined, 'ai-provider-toggle');
            toggle.id = 'ai-route-' + id;
            toggle.setAttribute('aria-label', title + ' preferred provider');
            Object.entries(providers).forEach(([value, providerName]) => {
                const label = element('label', undefined, 'ai-provider-option');
                const radio = element('input');
                radio.type = 'radio';
                radio.name = 'ai-provider-' + id;
                radio.value = value;
                radio.checked = draft.features[id] === value;
                radio.setAttribute('aria-label', providerName);
                radio.onchange = () => {
                    if (!radio.checked) return;
                    draft.features[id] = value;
                    window.autoSaveAiRoutingSettings();
                };
                const text = element('span', value === 'gemini' ? 'Gemini' : 'Groq');
                text.dataset.provider = value;
                const logo = element('img', undefined, 'ai-provider-logo');
                logo.src = logoBase + value + (value === 'groq' ? '-logo.ico' : '-logo.svg');
                logo.alt = '';
                logo.width = 18;
                logo.height = 18;
                text.prepend(logo);
                label.append(radio, text);
                toggle.append(label);
            });
            choice.append(toggle);
            const defaultCell = element('td');
            defaultCell.dataset.label = 'Default Key';
            defaultCell.id = 'ai-default-for-' + id;
            const statusCell = element('td', undefined, 'ai-feature-status-cell');
            statusCell.id = 'ai-status-for-' + id;
            statusCell.dataset.label = 'Status';
            row.append(heading, choice, defaultCell, statusCell);
            body.append(row);
        });
        const defaults = byId('ai-provider-defaults');
        defaults.replaceChildren();
        Object.entries(providers).forEach(([provider, title]) => {
            const group = element('div', undefined, 'ai-provider-group');
            group.dataset.provider = provider;
            const heading = element('div', undefined, 'ai-provider-heading');
            const badge = element('span', undefined, 'ai-provider-brand');
            const logo = element('img', undefined, 'ai-provider-logo');
            logo.src = logoBase + provider + (provider === 'groq' ? '-logo.ico' : '-logo.svg');
            logo.alt = '';
            badge.append(logo);
            heading.append(badge, element('h2', title));
            group.append(heading);
            const pool = keys.filter(key => key.provider === provider);
            const label = element('label', 'Default API Key');
            label.htmlFor = 'ai-default-' + provider;
            const select = element('select');
            select.id = label.htmlFor;
            if (!pool.length) select.add(new Option('Not configured', ''));
            pool.forEach(key => select.add(new Option(key.label, key.id)));
            select.value = draft.defaults[provider];
            select.disabled = !pool.length;
            select.onchange = () => saveProviderDefault(provider, select.value);
            const selectWrapper = element('div', undefined, 'ai-select-wrapper');
            const chevron = element('i', undefined, 'fa-solid fa-chevron-down ai-select-chevron');
            chevron.setAttribute('aria-hidden', 'true');
            selectWrapper.append(select, chevron);
            group.append(label, selectWrapper, element('p', pool.length + (pool.length === 1 ? ' stored key' : ' stored keys')));
            defaults.append(group);
        });
        renderKeys();
        window.refreshAiFeatureStatuses();
        if (byId('ai-keys-count-badge')) byId('ai-keys-count-badge').textContent = keys.length + (keys.length === 1 ? ' Key' : ' Keys');
        window.markAiRoutingDirty();
        window.selectAiSettingsTab(selectedTab, false);
    };
})();
