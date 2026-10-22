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
    try { const tab = sessionStorage.getItem(tabStorageKey); if (['keys', 'usage'].includes(tab)) selectedTab = tab; } catch (_) {}
    const byId = id => document.getElementById(id);
    const clone = value => JSON.parse(JSON.stringify(value));
    window.getAiUsageSnapshot = function (provider, period) {
        const database = window.SigmaAiDatabase;
        const status = database?.getLogStatus?.() || { state: 'error' };
        if (status.state !== 'ready') return { ...status, logs: [] };
        const dateKey = value => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
        const today = dateKey(Date.now());
        const logs = database.getLogs().filter(log => {
            if (log.isDeleted || !Number.isFinite(Date.parse(log.timestamp))) return false;
            if (provider && log.provider !== provider) return false;
            if (!period) return true;
            const stamp = dateKey(log.timestamp);
            return period === 'monthly' ? stamp.slice(0, 7) === today.slice(0, 7) : stamp === today;
        });
        return { state: 'ready', logs };
    };

    window.renderAiSettingsUsage = function () {
        const panel = byId('ai-usage-panel');
        if (!panel) return;
        const snapshot = window.getAiUsageSnapshot();
        const logs = snapshot.logs;
        panel.replaceChildren(element('h2', 'AI Usage', 'text-sm font-bold text-black'));
        if (snapshot.state !== 'ready') {
            panel.append(element('p', snapshot.state === 'loading' ? 'Loading recorded AI activity…' : snapshot.state === 'signed-out' ? 'Sign in to view AI usage.' : 'Unable to load recorded AI activity.', 'text-sm text-black-fade'));
            if (snapshot.state === 'error') {
                const status = element('div', '', 'sigma-load-status sigma-load-status--inline');
                window.renderSigmaLoadStatus(status, 'Unable to load recorded AI activity.', () => window.SigmaAiDatabase?.reloadLogs().catch(() => {}));
                panel.lastElementChild?.remove(); panel.append(status);
            }
            return;
        }

        const dateKey = value => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
        const today = dateKey(Date.now());
        const todayLogs = logs.filter(log => dateKey(log.timestamp) === today);

        const logTokens = log => Number(log.tokens) || Math.ceil(((log.prompt?.length || 0) + (log.response?.length || 0)) / 4) || 0;
        const totalTokens = logs.reduce((sum, log) => sum + logTokens(log), 0);

        // 1. Overview Stat Cards
        const grid = element('div', undefined, 'grid grid-cols-2 lg:grid-cols-4 gap-4 mt-3');
        const stats = [
            ['Requests', logs.length.toLocaleString()],
            ['Tokens', totalTokens.toLocaleString()],
            ['Successful', logs.filter(log => log.status === 'Success').length.toLocaleString()],
            ['Failed', logs.filter(log => log.status === 'Failed').length.toLocaleString()]
        ];
        for (const [label, value] of stats) {
            const card = element('div', undefined, 'border border-slate-200 rounded-xl p-5 bg-white');
            card.append(element('p', label, 'text-xs text-black-fade font-medium'), element('strong', String(value), 'text-2xl font-bold text-black'));
            grid.append(card);
        }
        panel.append(grid);

        // 2. Daily Provider Quota Progress Bars
        panel.append(element('h3', 'Daily Provider Quota Limits', 'text-sm font-bold text-black mt-6'));

        const geminiTokens = todayLogs.filter(log => log.provider === 'gemini' || !log.provider).reduce((sum, log) => sum + logTokens(log), 0);
        const geminiLimit = 1000000;
        const geminiPct = Math.min(100, Math.max(0, (geminiTokens / geminiLimit) * 100));

        const groqTokens = todayLogs.filter(log => log.provider === 'groq').reduce((sum, log) => sum + logTokens(log), 0);
        const groqLimit = 500000;
        const groqPct = Math.min(100, Math.max(0, (groqTokens / groqLimit) * 100));

        const providerData = [
            {
                name: 'Google Gemini',
                tier: 'Free Tier (1,000,000 daily tokens)',
                used: geminiTokens,
                limit: geminiLimit,
                percent: geminiPct,
                logo: logoBase + 'gemini-logo.svg'
            },
            {
                name: 'Groq',
                tier: 'Free Tier (500,000 daily tokens)',
                used: groqTokens,
                limit: groqLimit,
                percent: groqPct,
                logo: logoBase + 'groq-logo.svg'
            }
        ];

        const quotaGrid = element('div', undefined, 'grid grid-cols-1 md:grid-cols-2 gap-4 mt-3');
        for (const prov of providerData) {
            const card = element('div', undefined, 'border border-slate-200 rounded-xl p-4 bg-white flex flex-col justify-between');

            const header = element('div', undefined, 'flex items-center justify-between mb-1.5');
            const left = element('div', undefined, 'flex items-center gap-2');
            const img = element('img', undefined, 'w-4 h-4 object-contain');
            img.src = prov.logo;
            img.alt = '';
            left.append(img, element('span', prov.name, 'text-sm font-bold text-black'));
            const remaining = Math.max(0, 100 - prov.percent);
            const badge = element('span', remaining.toFixed(1) + '% remaining', 'text-xs font-semibold ' + (remaining < 20 ? 'text-[#ea580c]' : 'text-[#15803d]'));
            header.append(left, badge);

            const barTrack = element('div', undefined, 'h-2 bg-slate-100 rounded-full overflow-hidden my-2');
            const barFill = element('div', undefined, 'h-full bg-[#15803d] rounded-full transition-all duration-500');
            barFill.style.width = Math.min(100, Math.max(prov.used > 0 ? 0.8 : 0, prov.percent)) + '%';
            barTrack.append(barFill);

            const footer = element('div', undefined, 'flex items-center justify-between text-xs');
            const usageText = element('span', prov.used.toLocaleString() + ' / ' + (prov.limit >= 1000000 ? (prov.limit / 1000000) + 'M' : (prov.limit / 1000) + 'K') + ' tokens today', 'font-semibold text-black');
            const tierText = element('span', prov.tier, 'text-black-fade');
            footer.append(usageText, tierText);

            card.append(header, barTrack, footer);
            quotaGrid.append(card);
        }
        panel.append(quotaGrid);

        // 3. Feature Token Distribution Bar
        panel.append(element('h3', 'Token Usage by Feature', 'text-sm font-bold text-black mt-6'));

        const featureColors = {
            sigmabot: '#15803d',
            analytics: '#2563eb',
            quiz: '#d97706',
            submission_evaluation: '#9333ea',
            submission_feedback: '#db2777',
            grade_insights: '#059669'
        };

        const distBar = element('div', undefined, 'flex w-full rounded-full overflow-hidden bg-slate-100 mt-3 h-2.5');
        distBar.setAttribute('role', 'img');
        distBar.setAttribute('aria-label', 'Token distribution by feature');

        const featureTokenCounts = features.map(([id, label]) => {
            const fLogs = logs.filter(log => log.feature === id);
            const fTokens = fLogs.reduce((sum, log) => sum + logTokens(log), 0);
            return { id, label, tokens: fTokens, color: featureColors[id] || '#64748b' };
        });

        if (totalTokens > 0) {
            featureTokenCounts.forEach(f => {
                if (f.tokens > 0) {
                    const pct = (f.tokens / totalTokens) * 100;
                    const segment = element('span');
                    segment.style.width = pct + '%';
                    segment.style.background = f.color;
                    segment.title = f.label + ': ' + f.tokens.toLocaleString() + ' tokens (' + pct.toFixed(1) + '%)';
                    distBar.append(segment);
                }
            });
        }
        panel.append(distBar);

        const legend = element('div', undefined, 'grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-3');
        featureTokenCounts.forEach(f => {
            const entry = element('div', undefined, 'flex items-center gap-2 text-xs');
            const dot = element('span');
            dot.style.cssText = 'width:8px;height:8px;border-radius:50%;flex-shrink:0;background:' + f.color;
            const pct = totalTokens > 0 ? ((f.tokens / totalTokens) * 100).toFixed(0) + '%' : '0%';
            entry.append(dot, element('span', f.label + ': ' + f.tokens.toLocaleString() + ' tokens (' + pct + ')', 'text-black-fade'));
            legend.append(entry);
        });
        panel.append(legend);

        // 4. Feature Activity Breakdown Table
        panel.append(element('h3', 'Feature Activity Breakdown', 'text-sm font-bold text-black mt-6'));

        const table = element('table', undefined, 'sigma-table ai-routing-table');
        const head = table.createTHead().insertRow();
        const headers = ['AI Feature', 'Requests', 'Tokens', 'Fallback Used'];
        for (const label of headers) head.append(element('th', label));
        const body = table.createTBody();
        for (const [id, label] of features) {
            const rows = logs.filter(log => log.feature === id);
            const rowTokens = rows.reduce((sum, log) => sum + logTokens(log), 0);
            const row = body.insertRow();
            const cells = [
                label,
                rows.length.toLocaleString(),
                rowTokens.toLocaleString(),
                rows.filter(log => log.status === 'Fallback Used').length.toLocaleString()
            ];
            cells.forEach((value, idx) => {
                const td = element('td', String(value));
                td.dataset.label = headers[idx];
                row.append(td);
            });
        }
        const wrap = element('div', undefined, 'ai-routing-table-wrap mt-3');
        wrap.append(table);
        panel.append(wrap);
    };
    window.addEventListener('sigma:ai-logs-updated', () => { if (selectedTab === 'usage') window.renderAiSettingsUsage(); });

    let driveUsage = null, driveUsageLoading = false, driveUsageError = '';
    window.syncGoogleDriveStorageMetric = function () {
        const label = byId('storage-status-label');
        if (label) label.textContent = driveUsageLoading ? 'Checking' : driveUsageError ? (driveUsage ? 'Last checked' : 'Unavailable') : driveUsage ? 'Connected' : 'Not checked';
        if (!driveUsage && !driveUsageLoading && !driveUsageError) {
            window.loadGoogleDriveFolderUsage?.();
        }
        const used = byId('storage-used-value');
        const unit = byId('storage-unit-label');
        if (driveUsage) {
            const formatted = formatStorage(driveUsage.total_bytes).split(' ');
            if (used) {
                used.textContent = formatted[0];
                used.classList.remove('text-black-fade');
                used.classList.add('text-black');
            }
            if (unit) {
                unit.textContent = formatted[1] || 'B';
                unit.hidden = false;
            }
        } else if (driveUsageLoading || driveUsageError) {
            if (used) {
                used.textContent = '-';
                used.classList.remove('text-black');
                used.classList.add('text-black-fade');
            }
            if (unit) unit.hidden = true;
        } else {
            if (used) {
                used.textContent = '0';
                used.classList.remove('text-black-fade');
                used.classList.add('text-black');
            }
            if (unit) {
                unit.textContent = 'B';
                unit.hidden = false;
            }
        }
        const footer = byId('storage-percent-label');
        const limit = Number(driveUsage?.limit_bytes) || (15 * 1024 * 1024 * 1024);
        const accountUsed = (driveUsage?.account_used_bytes !== null && driveUsage?.account_used_bytes !== undefined && Number(driveUsage.account_used_bytes) > 0)
            ? Number(driveUsage.account_used_bytes)
            : Number(driveUsage?.total_bytes || 0);
        const known = limit > 0 && driveUsage !== null;
        const percent = known ? Math.max(0, accountUsed / limit * 100) : 0;
        if (footer) {
            if (driveUsageLoading) {
                footer.textContent = 'Checking…';
            } else if (driveUsage) {
                const pctFormatted = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(percent);
                footer.textContent = pctFormatted + '% of ' + formatStorage(limit);
            } else {
                footer.textContent = '15 GB Capacity';
            }
        }
        const bar = byId('storage-usage-bar');
        if (bar) bar.style.width = Math.min(100, Math.max(percent > 0 ? 0.5 : 0, percent)) + '%';
        const track = byId('storage-capacity-track');
        if (track) {
            track.title = known 
                ? formatStorage(accountUsed) + ' of ' + formatStorage(limit) + ' (' + (driveUsage?.is_estimated_limit !== false ? 'Configured Google Drive capacity' : 'Google account') + ')'
                : 'Standard 15 GB Google Drive storage capacity.';
            track.setAttribute('role', 'progressbar');
            track.setAttribute('aria-label', track.title);
            track.setAttribute('aria-valuemin', '0'); 
            track.setAttribute('aria-valuemax', '100'); 
            track.setAttribute('aria-valuenow', String(Math.min(100, percent)));
        }
    };
    const usageTypes = { pdf: ['PDFs', '#15803d'], documents: ['Documents', '#2563eb'], presentations: ['Presentations', '#d97706'], images: ['Images', '#9333ea'], videos: ['Videos', '#db2777'], others: ['Others', '#64748b'] };
    const formatStorage = bytes => {
        if (!bytes) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        const power = Math.min(4, Math.floor(Math.log(bytes) / Math.log(1024)));
        return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(bytes / (1024 ** power)) + ' ' + units[power];
    };
    window.selectGoogleDriveSettingsTab = function (tab) {
        for (const name of ['settings', 'usage']) {
            const active = name === tab;
            const button = byId('gdrive-' + name + '-tab');
            button?.setAttribute('aria-selected', String(active));
            button?.setAttribute('aria-pressed', String(active));
            if (byId('gdrive-' + name + '-panel')) byId('gdrive-' + name + '-panel').hidden = !active;
        }
        if (tab === 'usage') {
            window.renderGoogleDriveSettingsUsage();
            if (!driveUsage) window.loadGoogleDriveFolderUsage();
        }
    };
    window.loadGoogleDriveFolderUsage = async function () {
        if (driveUsageLoading) return;
        driveUsageLoading = true;
        driveUsageError = '';
        window.syncGoogleDriveStorageMetric();
        window.renderGoogleDriveSettingsUsage();
        try {
            const url = new URL(window.resolveUploadApiUrl(), location.href);
            url.searchParams.set('action', 'folder_usage');
            const response = await window.SigmaDatabase.fetch(url.href);
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.error || 'Folder usage is unavailable.');
            driveUsage = data.usage;
            driveUsageLoading = false;
            window.syncGoogleDriveStorageMetric();
            window.renderGoogleDriveSettingsUsage();
        } catch (error) {
            driveUsageLoading = false;
            driveUsageError = error.message || 'Folder usage is unavailable.';
            window.syncGoogleDriveStorageMetric();
            window.renderGoogleDriveSettingsUsage(error.message || 'Folder usage is unavailable.');
        }
    };
    window.renderGoogleDriveSettingsUsage = function (error = '') {
        const panel = byId('gdrive-usage-panel');
        if (!panel) return;
        panel.replaceChildren();
        const toolbar = element('div', undefined, 'gdrive-usage-toolbar');
        toolbar.append(element('h2', 'ELMS Folder Usage', 'text-sm font-bold text-black'));
        const refresh = element('button', undefined, 'sigma-btn sigma-btn-white gdrive-usage-refresh');
        refresh.type = 'button'; refresh.title = 'Refresh folder usage'; refresh.setAttribute('aria-label', refresh.title);
        refresh.innerHTML = '<i class="fa-solid fa-rotate-right" aria-hidden="true"></i>';
        refresh.disabled = driveUsageLoading; refresh.onclick = window.loadGoogleDriveFolderUsage;
        toolbar.append(refresh); panel.append(toolbar);
        if (error || driveUsageLoading || !driveUsage) {
            const message = element('p', error || (driveUsageLoading ? 'Checking the ELMS folder and subfolders…' : 'Folder usage has not loaded yet.'), 'text-sm text-black-fade mt-4');
            message.setAttribute('role', 'status'); panel.append(message);
        }
        if (driveUsage) {
            const limit = Number(driveUsage.limit_bytes) || (15 * 1024 * 1024 * 1024);
            const isEstimated = driveUsage.is_estimated_limit !== false;
            const grid = element('div', undefined, 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4');
            for (const [label, value] of [
                ['Storage used', formatStorage(driveUsage.total_bytes)], 
                ['Total limit', formatStorage(limit)], 
                ['Total files', driveUsage.total_files], 
                ['Total folders', driveUsage.total_folders ?? 0]
            ]) {
                const card = element('div', undefined, 'border border-slate-200 rounded-xl p-5');
                card.append(element('p', label, 'text-xs text-black-fade font-semibold'), element('strong', String(value), 'text-2xl text-black font-extrabold'));
                if (label === 'Total limit') {
                    card.append(element('p', isEstimated 
                        ? 'Google account capacity (' + formatStorage(limit) + ' standard tier, shared with other services).' 
                        : 'Google account capacity, shared with other services.', 'text-xs text-black-fade mt-2'));
                }
                grid.append(card);
            }
            panel.append(grid, element('h3', 'Storage by File Type', 'text-sm font-bold text-black mt-6'));
            const bar = element('div', undefined, 'flex w-full rounded-full overflow-hidden bg-slate-100 mt-4');
            bar.style.height = '14px'; bar.setAttribute('role', 'img');
            bar.setAttribute('aria-label', 'Storage distribution by file type');
            const legend = element('div', undefined, 'grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4');
            for (const [key, [label, color]] of Object.entries(usageTypes)) {
                const group = driveUsage.types[key] || { bytes: 0, files: 0 };
                if (group.bytes > 0 && driveUsage.total_bytes > 0) {
                    const segment = element('span'); segment.style.width = (group.bytes / driveUsage.total_bytes * 100) + '%'; segment.style.background = color;
                    segment.title = label + ': ' + formatStorage(group.bytes); bar.append(segment);
                }
                const entry = element('div', undefined, 'flex items-center gap-2 text-sm');
                const dot = element('span'); dot.style.cssText = 'width:10px;height:10px;border-radius:50%;flex-shrink:0;background:' + color;
                entry.append(dot, element('span', label + ': ' + formatStorage(group.bytes) + ' · ' + group.files + ' files')); legend.append(entry);
            }
            panel.append(bar, legend);
            if (!driveUsage.total_files) panel.append(element('p', 'No files in the connected folder or its subfolders.', 'text-sm text-black-fade mt-4'));
            if (driveUsage.unknown_size_files) panel.append(element('p', driveUsage.unknown_size_files + ' files have no reported size and are excluded from the storage total.', 'text-xs text-black-fade mt-4'));
            panel.append(element('p', 'Includes the connected ELMS folder and subfolders. Excludes trash and shortcuts. The bar shows file-type proportions, not account capacity.', 'text-xs text-black-fade mt-4'));
            panel.append(element('p', 'Last checked: ' + new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(driveUsage.checked_at)), 'text-xs text-black-fade mt-4'));
        }
        const folderId = driveUsage?.folder_id;
        const sourceLink = byId('gdrive-page-open-folder-link');
        const href = folderId ? 'https://drive.google.com/drive/folders/' + encodeURIComponent(folderId) : sourceLink?.getAttribute('href');
        if (href && href.startsWith('https://drive.google.com/')) {
            const link = element('a', 'Open in Google Drive', 'sigma-btn sigma-btn-white sigma-btn-md mt-4');
            link.href = href; link.target = '_blank'; link.rel = 'noopener noreferrer'; panel.append(link);
        }
    };

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
        if (byId('ai-usage-panel')) byId('ai-usage-panel').hidden = editorOpen || selectedTab !== 'usage';
    };

    window.getAiSettingsKeyById = id => keys.find(key => key.id === id);
    window.selectAiSettingsTab = function (tab, recordHistory = true) {
        selectedTab = ['keys', 'usage'].includes(tab) ? tab : 'functions';
        try { sessionStorage.setItem(tabStorageKey, selectedTab); } catch (_) {}
        const isKeys = selectedTab === 'keys';
        byId('ai-functions-panel').hidden = isKeys;
        byId('ai-provider-panel').hidden = !isKeys;
        if (!isKeys) window.toggleAddAiKeyForm?.(false, null, false);
        window.syncAiKeyListVisibility();
        if (selectedTab === 'usage') window.renderAiSettingsUsage?.();
        ['functions', 'keys', 'usage'].forEach(name => {
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
