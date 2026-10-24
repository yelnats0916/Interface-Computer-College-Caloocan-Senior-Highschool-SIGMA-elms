(function () {
    'use strict';
    const states = new Map(), pending = new Map();
    const failures = new Set();
    const offline = new Set();
    let logs = [], logReady = false, importing = null, logLoad = null, logRefreshing = false;
    let logStatus = 'loading', logError = '';
    let retryNotBefore = 0;
    const importedLogs = new Set();
    const actor = () => {
        try { const user = JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}'); return String(user.id || user.uid || ''); } catch { return ''; }
    };
    const api = name => location.port && !['80', '443'].includes(location.port)
        ? 'http://localhost/sigma-elms/php/api/' + name + '.php'
        : new URL(location.pathname.includes('/php/') ? 'api/' + name + '.php' : 'php/api/' + name + '.php', location.href).href;
    async function request(name, input, get = false) {
        const response = await window.SigmaDatabase.fetch(api(name) + (get ? '?' + new URLSearchParams(input) : ''), {
            method: get ? 'GET' : 'POST', credentials: 'include',
            timeoutMs: 15000,
            headers: { 'Content-Type': 'application/json', 'X-Sigma-Actor': actor() },
            ...(get ? {} : { body: JSON.stringify(input) })
        });
        const result = window.SigmaDatabase.readJson ? await window.SigmaDatabase.readJson(response) : await response.json();
        if (!response.ok || !result.success) {
            const error = new Error(result.error || 'Database request failed.');
            error.code = result.code;
            error.status = response.status;
            throw error;
        }
        return result;
    }
    const key = (kind, id) => 'sigma-' + kind + '-analytics-v1:' + id;
    function remember(kind, id, result) {
        let cached;
        try { cached = JSON.parse(localStorage.getItem(key(kind, id)) || '{}'); } catch { cached = {}; }
        if (cached.retryNotBefore > Date.now()) {
            for (const field of ['attemptFingerprint', 'failedFingerprint', 'retryNotBefore']) if (cached[field] !== undefined) result.state[field] = cached[field];
        }
        states.set(key(kind, id), result);
        // Compatibility cache only: generation always checks the database first.
        localStorage.setItem(key(kind, id), JSON.stringify(result.state));
    }
    async function ensureState(kind, id, force = false) {
        if (!id) throw new Error('Sign in before loading insights.');
        const storageKey = key(kind, id);
        if (!force && states.has(storageKey)) return states.get(storageKey).state;
        if (pending.has(storageKey)) return pending.get(storageKey);
        failures.delete(storageKey);
        const load = (async () => {
            let result = await request('ai_records', { action: 'state', kind, userId: id }, true);
            const queuedKey = storageKey + ':pending-sync';
            let queued;
            try { queued = JSON.parse(localStorage.getItem(queuedKey) || 'null'); } catch {}
            if (queued && queued.origin === 'database-foundation-v1' && queued.actor === actor() && queued.revision === result.revision) {
                result = await request('ai_records', { action: 'save_state', kind, userId: id, state: queued.state, revision: queued.revision });
                localStorage.removeItem(queuedKey);
            } else if (queued) {
                window.SigmaDatabase?.preserveLegacy(queuedKey, localStorage.getItem(queuedKey));
                localStorage.removeItem(queuedKey);
                window.dispatchEvent(new CustomEvent('sigma:ai-database-error', { detail: 'Newer database insights were kept. The pending offline copy was not uploaded.' }));
            }
            if (!result.exists) window.SigmaDatabase?.preserveLegacy(storageKey, localStorage.getItem(storageKey));
            remember(kind, id, result);
            offline.delete(storageKey);
            return result.state;
        })().catch(error => {
            // Only the current owner can use an offline cache; authorization failures never fall back.
            const unavailable = error.code === 'account_not_synced' || error instanceof TypeError || error.name === 'TimeoutError' || error.status >= 500;
            if (unavailable && id === actor()) {
                let cached;
                try { cached = JSON.parse(localStorage.getItem(storageKey) || 'null'); } catch {}
                const state = cached && Array.isArray(cached.cards) ? cached : { cards: [] };
                states.set(storageKey, { state, revision: states.get(storageKey)?.revision ?? null });
                offline.add(storageKey);
                const feedback = document.getElementById('ai-routing-feedback');
                if (feedback) feedback.textContent = state.cards.length ? 'Offline: showing cached insights for this account.' : 'No saved insights for this account. Connect and sync it before generating insights.';
                return state;
            }
            states.delete(storageKey);
            offline.delete(storageKey);
            failures.add(storageKey);
            throw error;
        }).finally(() => {
            pending.delete(storageKey);
            window.dispatchEvent(new Event('sigma:refresh-analytics-cards'));
        });
        pending.set(storageKey, load);
        return load;
    }
    async function saveState(kind, id, state) {
        const storageKey = key(kind, id);
        if (!states.has(storageKey)) await ensureState(kind, id);
        let result;
        try {
            if (offline.has(storageKey)) throw new TypeError('Database is offline.');
            result = await request('ai_records', { action: 'save_state', kind, userId: id, state, revision: states.get(storageKey).revision });
        } catch (error) {
            if (id !== actor() || !(error instanceof TypeError || error.status >= 500)) throw error;
            const revision = states.get(storageKey)?.revision;
            if (revision === null || revision === undefined) throw new Error('Connect to the database before saving new insights.');
            localStorage.setItem(storageKey + ':pending-sync', JSON.stringify({ origin: 'database-foundation-v1', actor: actor(), revision, state }));
            localStorage.setItem(storageKey, JSON.stringify(state));
            states.set(storageKey, { state, revision });
            offline.add(storageKey);
            return state;
        }
        remember(kind, id, result);
        return result.state;
    }
    function reloadLogs() {
        if (logLoad) return logLoad;
        logLoad = (async () => {
            logRefreshing = true; logStatus = logReady ? 'ready' : 'loading'; logError = '';
            window.dispatchEvent(new Event('sigma:ai-logs-updated'));
            try {
                const canRead = window.canViewAuditLog?.('ai') !== false;
                const result = await request('ai_records', { action: 'logs', ...(canRead ? {} : {view:'usage'}) }, true);
                if (!canRead && result.usageOnly !== true) throw new Error('Usage summary is temporarily unavailable.');
                if (!Array.isArray(result.logs)) throw new Error('Invalid AI activity response.');
                logs = result.logs; logReady = true; logStatus = 'ready';
            } catch (error) {
                logStatus = 'error'; logError = error.name === 'TimeoutError' || error.name === 'AbortError'
                    ? 'AI activity could not be loaded because the server is busy. Please retry shortly.' : error.message;
                throw error;
            } finally { logRefreshing = false; window.dispatchEvent(new Event('sigma:ai-logs-updated')); }
        })().finally(() => { logLoad = null; });
        return logLoad;
    }
    function adminLogViewActive() {
        if (!location.pathname.toLowerCase().includes('admin')) return true;
        if (!location.hash || location.hash === '#nav-dashboard') return true;
        return ['dashboard-view', 'audit-ai-view', 'settings-integrations-view', 'settings-ai-view'].some(id => {
            const section = document.getElementById(id);
            return section && !section.classList.contains('hidden');
        });
    }
    async function initialize() {
        if (!adminLogViewActive()) return;
        if (!actor() || importing || Date.now() < retryNotBefore) return importing;
        importing = (async () => {
            const isAdmin = location.pathname.toLowerCase().includes('admin');
            if (!isAdmin) {
                const kind = location.pathname.toLowerCase().includes('teacher') ? 'teacher' : 'student';
                await ensureState(kind, actor(), true);
            }
            try { window.SigmaDatabase?.preserveLegacy('sigma-ai-recorded-logs', localStorage.getItem('sigma-ai-recorded-logs')); }
            catch (error) { console.warn('AI cache backup unavailable; loading server activity.', error); }
            if (isAdmin) await reloadLogs();
            window.dispatchEvent(new Event('sigma:refresh-analytics-cards'));
        })().catch(error => {
            retryNotBefore = Date.now() + 300000;
            if (!logReady) {
                logStatus = 'error'; logError = error.name === 'TimeoutError' || error.name === 'AbortError'
                    ? 'AI activity could not be loaded because the server is busy. Please retry shortly.' : error.message;
                window.dispatchEvent(new Event('sigma:ai-logs-updated'));
            }
            if (error.code === 'account_not_synced') {
                const feedback = document.getElementById('ai-routing-feedback');
                if (feedback) feedback.textContent = error.message;
                return;
            }
            // Initialization is a background read. Keep its error in the AI
            // activity panel rather than interrupting unrelated pages with a toast.
            console.warn('AI record database:', logError || error.message);
        }).finally(() => { importing = null; });
        return importing;
    }
    window.SigmaAiDatabase = {
        loadInsightReport: () => request('ai_records', { action: 'report' }, true),
        ensureState, saveState, reloadLogs, initialize,
        isOffline: (kind, id = actor()) => offline.has(key(kind, id)),
        getStatus(kind, id = actor()) {
            const storageKey = key(kind, id);
            if (states.has(storageKey)) return 'ready';
            return failures.has(storageKey) ? 'error' : 'loading';
        },
        getState(kind, id) {
            const memory = states.get(key(kind, id))?.state;
            // An empty server response is authoritative. Offline cache recovery is
            // handled explicitly by ensureState, never by substituting stale cards here.
            return memory || { cards: [] };
        },
        logsReady: () => logReady,
        getLogStatus: () => ({ state: actor() ? logStatus : 'signed-out', error: logError, refreshing: logRefreshing }),
        getLogs: () => logReady && window.canViewAuditLog?.('ai') !== false ? logs.filter(log => !log.isDeleted) : [],
        getUsageLogs: () => logReady ? logs.filter(log => !log.isDeleted) : [],
        async record(log) {
            await request('ai_records', { action: 'save_log', log });
            if (location.pathname.toLowerCase().includes('admin')) await reloadLogs();
        },
        async change(table, id, action, confirmation = '') {
            await request('record_lifecycle', { table, id, action, confirmation });
            // The mutation is confirmed. An unrelated log read must not delay it
            // or turn a committed restore/delete into a false failure.
            reloadLogs().catch(error => console.warn('Post-recovery AI log refresh:', error.message));
            if (table === 'ai_insight_cards') {
                for (const storageKey of states.keys()) {
                    const match = storageKey.match(/^sigma-(student|teacher)-analytics-v1:(.+)$/);
                    await ensureState(match[1], match[2], true);
                }
                window.dispatchEvent(new Event('sigma:refresh-analytics-cards'));
            }
        },
        request
    };
    window.retrySigmaInsights = async function () {
        const kind = location.pathname.toLowerCase().includes('teacher') ? 'teacher' : 'student';
        const load = ensureState(kind, actor(), true);
        window.dispatchEvent(new Event('sigma:refresh-analytics-cards'));
        try { await load; } catch (error) { console.warn('Insight retry:', error.message); }
    };
    function initializePage() {
        // AI records have their own loading state and must not block the dashboard.
        initialize().catch(console.error);
    }
    window.addEventListener('online', () => { retryNotBefore = 0; initialize(); });
    window.addEventListener('hashchange', () => initialize());
    window.addEventListener('sigma:database-session-ready', () => { retryNotBefore = 0; initialize(); });
    window.addEventListener('storage', event => {
        if (event.key === 'sigma-insight-management-update') {
            states.clear(); retryNotBefore = 0; initialize();
        }
    });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializePage); else initializePage();
    window.addEventListener('sigma:ai-database-error', event => {
        window.SigmaAnnouncements?.showToast({ title: 'AI Records Unavailable', message: event.detail, type: 'error' });
        const feedback = document.getElementById('ai-routing-feedback');
        if (feedback) { feedback.textContent = event.detail; feedback.style.color = '#b91c1c'; }
    });
    setInterval(() => {
        if (document.visibilityState === 'visible' && actor() && !location.pathname.toLowerCase().includes('admin')) initialize();
    }, 30000);
    window.addEventListener('sigma:audit-permissions-changed', () => { if (actor()) reloadLogs().catch(() => {}); });
})();
