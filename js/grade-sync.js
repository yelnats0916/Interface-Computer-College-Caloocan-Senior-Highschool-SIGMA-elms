(function () {
    'use strict';
    const sessionKey = 'sigma-grade-sync-session';
    const publishedKey = 'sigma-published-quarter-grades-v1';
    const sharedKey = 'sigma-submitted-quarter-grades-v1';
    let pending = null, timer, readyFor = '', visible = { shared: {}, published: {}, drafts: {} }, failures = 0;
    let lastError = '', writeRevision = 0;
    const user = () => { try { return JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}'); } catch (_) { return {}; } };
    const session = () => { try { return JSON.parse(sessionStorage.getItem(sessionKey) || '{}'); } catch (_) { return {}; } };
    const endpoint = () => ['localhost', '127.0.0.1'].includes(location.hostname) && location.port && !['80', '443'].includes(location.port)
        ? 'http://localhost/sigma-elms/php/api/grade_sync.php'
        : new URL(location.pathname.includes('/php/') ? 'api/grade_sync.php' : 'php/api/grade_sync.php', location.href).href;
    async function request(input) {
        const auth = session(), actor = user();
        if (!auth.token || ![actor.id, actor.uid].filter(Boolean).map(String).includes(String(auth.userId))) throw new Error('Sign in again to connect live grade updates.');
        let response;
        try { response = await window.SigmaDatabase.fetch(endpoint(), { method: input ? 'POST' : 'GET', headers: { Authorization: `Bearer ${auth.token}`, ...(input ? { 'Content-Type': 'application/json' } : {}) },
            cache: 'no-store', foreground: !!input || /^#(?:school-)?grades(?::|$)/.test(location.hash || ''), autoReconnect: false, timeoutMs: 15000, ...(input ? { body: JSON.stringify(input) } : {}) }); }
        catch (error) { const temporary=/timeout/i.test(error.name + ' ' + error.message)||error instanceof TypeError; const failure=new Error(/timeout/i.test(error.name + ' ' + error.message) ? (input ? 'The save could not be confirmed. Reopen the record to check its latest status before trying again.' : 'Grades could not be retrieved. Please try again.') : error.message);failure.retryable=temporary;throw failure; }
        const result = window.SigmaDatabase.readJson ? await window.SigmaDatabase.readJson(response) : await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || 'Unable to sync grades. Please try again.');
        return result;
    }
    function merge(key, records) {
        let cached = {}; try { cached = JSON.parse(localStorage.getItem(key) || '{}'); } catch (_) {}
        let changed = false;
        for (const [scope, record] of Object.entries(records)) {
            if (JSON.stringify(cached[scope]) !== JSON.stringify(record)) { cached[scope] = record; changed = true; }
        }
        if (changed) { try { localStorage.setItem(key, JSON.stringify(cached)); } catch (_) { /* The live mirror remains authoritative when browser storage is full. */ } }
        return changed;
    }
    function receive(result) {
        const firstConnection = readyFor !== String(result.userId);
        const previous = JSON.stringify(visible);
        visible = { shared: result.shared || {}, published: result.published || {}, drafts: result.drafts || {} };
        readyFor = String(result.userId);
        const sharedChanged = merge(sharedKey, visible.shared);
        const publishedChanged = merge(publishedKey, visible.published);
        if (sharedChanged || firstConnection) window.dispatchEvent(new CustomEvent('sigma:grades-submitted', { detail: { remote: true } }));
        if (publishedChanged || firstConnection || previous !== JSON.stringify(visible)) window.dispatchEvent(new CustomEvent('sigma:grades-published', { detail: { remote: true } }));
        // Notifications come from the committed server record, including across devices.
        window.dispatchEvent(new CustomEvent('sigma:grade-sync-status', { detail: { connected: true } }));
    }
    function sameDraftRows(left, right) {
        if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
        const normalize = rows => rows.map(row => [String(row.id), row.grade == null ? null : Number(row.grade)])
            .sort((a, b) => a[0].localeCompare(b[0]));
        return JSON.stringify(normalize(left)) === JSON.stringify(normalize(right));
    }
    async function refresh() {
        if (pending) return pending;
        const owner = String(user().id || user().uid || ''), readRevision = writeRevision;
        pending = request().then(result => { if (String(user().id || user().uid || '') !== owner || String(result.userId) !== owner || readRevision !== writeRevision) return; failures = 0; lastError = ''; receive(result); }).catch(error => {
            failures++;
            const temporary = error.retryable || error.name === 'TimeoutError' || error instanceof TypeError;
            if (lastError !== error.message && !temporary) {
                lastError = error.message;
                window.SigmaAnnouncements?.showToast({
                    title: 'Live Grade Updates',
                    message: error.message || 'Live grade updates are currently unavailable.',
                    type: 'error'
                });
            }
            lastError = error.message;
            window.dispatchEvent(new CustomEvent('sigma:grade-sync-status', { detail: { connected: false, message: error.message } }));
        }).finally(() => { pending = null; });
        return pending;
    }
    function schedule() {
        clearTimeout(timer);
        timer = setTimeout(async () => { if (!document.hidden) await refresh(); schedule(); }, failures ? Math.min(60000, 5000 * 2 ** Math.min(failures, 4)) : 5000);
    }
    window.SigmaGradeSync = {
        refresh,
        getPublished(scope) {
            const actor = user();
            return [actor.id, actor.uid].filter(Boolean).map(String).includes(readyFor) ? { ready: true, record: visible.published[scope] || null } : { ready: false };
        },
        getSharedRecords() {
            const actor = user();
            return [actor.id, actor.uid].filter(Boolean).map(String).includes(readyFor) ? { ready: true, records: visible.shared } : { ready: false };
        },
        getDrafts() {
            const actor = user();
            return [actor.id, actor.uid].filter(Boolean).map(String).includes(readyFor) ? { ready: true, records: visible.drafts } : { ready: false };
        },
        async saveDraft(scope, rows, sectionId = '') {
            const owner = String(user().id || user().uid || '');
            let result;
            for (let attempt = 0; attempt < 3; attempt++) {
                try { result = await request({ action: 'draft', scope, rows, ...(sectionId ? { sectionId } : {}) }); break; }
                catch (error) {
                    if (!error.retryable || attempt === 2) throw error;
                    await new Promise(resolve => setTimeout(resolve, 750 * (2 ** attempt)));
                    if (String(user().id || user().uid || '') !== owner) throw new Error('The signed-in account changed. Reopen this draft.');
                    // A hotspot may drop the response after the server saved. Read
                    // the draft first so a retry never duplicates the save event.
                    try {
                        const latest = await request();
                        if (String(latest.userId) === owner) receive(latest);
                        const saved = visible.drafts[JSON.stringify(scope)];
                        if (sameDraftRows(saved?.rows, rows)) { result = { record: saved }; break; }
                    } catch (_) { /* Retry the idempotent draft upsert below. */ }
                }
            }
            if (String(user().id || user().uid || '') !== owner) throw new Error('The signed-in account changed. Reopen this draft.');
            writeRevision++;
            visible.drafts[JSON.stringify(scope)] = result.record;
            return result.record;
        },
        status() { return { connected: Boolean(readyFor) && !lastError, message: lastError }; },
        async share(scope, rows, sectionId = '') {
            const result = await request({ action: 'share', scope, rows, ...(sectionId ? { sectionId } : {}) });
            writeRevision++;
            visible.shared[JSON.stringify(scope)] = result.record;
            return result.record;
        },
        async publish(scope, submittedAt, rows, sectionId = '') {
            const result = await request({ action: 'publish', scope, submittedAt, ...(rows ? { rows } : {}), ...(sectionId ? { sectionId } : {}) });
            writeRevision++;
            visible.published[JSON.stringify(scope)] = result.record;
            return result.record;
        }
    };
    window.addEventListener('focus', () => { refresh(); schedule(); });
    window.addEventListener('online', () => { failures = 0; refresh(); schedule(); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { refresh(); schedule(); } });
    const startupRead = /^#grades(?::|$)/.test(location.hash || '') ? refresh() : null;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { if (!startupRead) refresh(); schedule(); });
    else { if (!startupRead) refresh(); schedule(); }
})();
