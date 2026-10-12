(function () {
    'use strict';
    const states = new Map(), pending = new Map();
    const failures = new Set();
    let logs = [], logReady = false, importing = null;
    let retryNotBefore = 0;
    const actor = () => {
        try { const user = JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}'); return String(user.id || user.uid || ''); } catch { return ''; }
    };
    const api = name => location.port && !['80', '443'].includes(location.port)
        ? 'http://localhost/sigma-elms/php/api/' + name + '.php'
        : new URL(location.pathname.includes('/php/') ? 'api/' + name + '.php' : 'php/api/' + name + '.php', location.href).href;
    async function request(name, input, get = false) {
        const response = await fetch(api(name) + (get ? '?' + new URLSearchParams(input) : ''), {
            method: get ? 'GET' : 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json', 'X-Sigma-Actor': actor() },
            ...(get ? {} : { body: JSON.stringify(input) })
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
            const error = new Error(result.error || 'Database request failed.');
            error.code = result.code;
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
            if (!result.exists) {
                let legacy;
                try { legacy = JSON.parse(localStorage.getItem(storageKey) || 'null'); } catch {}
                if (legacy) result = await request('ai_records', { action: 'save_state', kind, userId: id, state: { ...legacy, cards: legacy.cards || [] }, revision: 0 });
            }
            remember(kind, id, result);
            return result.state;
        })().catch(error => {
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
        const result = await request('ai_records', { action: 'save_state', kind, userId: id, state, revision: states.get(storageKey).revision });
        remember(kind, id, result);
        return result.state;
    }
    async function reloadLogs() {
        const result = await request('ai_records', { action: 'logs' }, true);
        logs = result.logs; logReady = true;
        window.dispatchEvent(new Event('sigma:ai-logs-updated'));
    }
    async function initialize() {
        if (!actor() || importing || Date.now() < retryNotBefore) return importing;
        importing = (async () => {
            const isAdmin = location.pathname.toLowerCase().includes('admin');
            if (isAdmin) {
                // Import preserved browser records once; database tombstones prevent resurrection.
                for (const storageKey of Object.keys(localStorage).filter(value => /^sigma-(student|teacher)-analytics-v1:/.test(value))) {
                    const match = storageKey.match(/^sigma-(student|teacher)-analytics-v1:(.+)$/);
                    await ensureState(match[1], match[2]);
                }
            } else {
                const kind = location.pathname.toLowerCase().includes('teacher') ? 'teacher' : 'student';
                await ensureState(kind, actor(), true);
            }
            const legacy = JSON.parse(localStorage.getItem('sigma-ai-recorded-logs') || '[]');
            for (const log of legacy.filter(log => isAdmin || log.userId === actor())) await request('ai_records', { action: 'save_log', log });
            if (isAdmin) await reloadLogs();
            window.dispatchEvent(new Event('sigma:refresh-analytics-cards'));
        })().catch(error => {
            retryNotBefore = Date.now() + 300000;
            if (error.code === 'account_not_synced') {
                const feedback = document.getElementById('ai-routing-feedback');
                if (feedback) feedback.textContent = error.message;
                return;
            }
            window.dispatchEvent(new CustomEvent('sigma:ai-database-error', { detail: error.message }));
            console.warn('AI record database:', error.message);
        }).finally(() => { importing = null; });
        return importing;
    }
    window.SigmaAiDatabase = {
        loadInsightReport: () => request('ai_records', { action: 'report' }, true),
        ensureState, saveState, reloadLogs, initialize,
        getStatus(kind, id = actor()) {
            const storageKey = key(kind, id);
            if (states.has(storageKey)) return 'ready';
            return failures.has(storageKey) ? 'error' : 'loading';
        },
        getState: (kind, id) => states.get(key(kind, id))?.state || { cards: [] },
        getLogs: () => logReady ? logs.filter(log => !log.isDeleted) : [],
        async record(log) {
            await request('ai_records', { action: 'save_log', log });
            if (location.pathname.toLowerCase().includes('admin')) await reloadLogs();
        },
        async change(table, id, action, confirmation = '') {
            await request('record_lifecycle', { table, id, action, confirmation });
            await reloadLogs();
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
    function initializePage() {
        if (window.SigmaPageLoading?.waitForInitial) {
            window.SigmaPageLoading.waitForInitial(initialize).catch(console.error);
        } else {
            initialize();
        }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializePage); else initializePage();
    window.addEventListener('sigma:ai-database-error', event => {
        window.SigmaAnnouncements?.showToast({ title: 'AI Records Unavailable', message: event.detail, type: 'error' });
        const feedback = document.getElementById('ai-routing-feedback');
        if (feedback) { feedback.textContent = event.detail; feedback.style.color = '#b91c1c'; }
    });
    setInterval(() => {
        if (document.visibilityState === 'visible' && actor()) initialize();
    }, 30000);
})();
