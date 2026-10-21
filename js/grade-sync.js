(function () {
    'use strict';
    const sessionKey = 'sigma-grade-sync-session';
    const publishedKey = 'sigma-published-quarter-grades-v1';
    const sharedKey = 'sigma-submitted-quarter-grades-v1';
    let pending = null, timer, readyFor = '', visible = { shared: {}, published: {} }, failures = 0;
    let lastError = '';
    const user = () => { try { return JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}'); } catch (_) { return {}; } };
    const session = () => { try { return JSON.parse(sessionStorage.getItem(sessionKey) || '{}'); } catch (_) { return {}; } };
    const endpoint = () => ['localhost', '127.0.0.1'].includes(location.hostname) && location.port && !['80', '443'].includes(location.port)
        ? 'http://localhost/sigma-elms/php/api/grade_sync.php'
        : new URL(location.pathname.includes('/php/') ? 'api/grade_sync.php' : 'php/api/grade_sync.php', location.href).href;
    async function request(input) {
        const auth = session(), actor = user();
        if (!auth.token || ![actor.id, actor.uid].filter(Boolean).map(String).includes(String(auth.userId))) throw new Error('Sign in again to connect live grade updates.');
        const response = await window.SigmaDatabase.fetch(endpoint(), { method: input ? 'POST' : 'GET', headers: { Authorization: `Bearer ${auth.token}`, ...(input ? { 'Content-Type': 'application/json' } : {}) },
            cache: 'no-store', signal: AbortSignal.timeout(15000), ...(input ? { body: JSON.stringify(input) } : {}) });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || 'Unable to sync grades. Please try again.');
        return result;
    }
    function merge(key, records) {
        let cached = {}; try { cached = JSON.parse(localStorage.getItem(key) || '{}'); } catch (_) {}
        let changed = false;
        for (const [scope, record] of Object.entries(records)) {
            if (JSON.stringify(cached[scope]) !== JSON.stringify(record)) { cached[scope] = record; changed = true; }
        }
        if (changed) localStorage.setItem(key, JSON.stringify(cached));
        return changed;
    }
    function receive(result) {
        const firstConnection = readyFor !== String(result.userId);
        const previous = JSON.stringify(visible);
        visible = { shared: result.shared || {}, published: result.published || {} };
        readyFor = String(result.userId);
        const sharedChanged = merge(sharedKey, visible.shared);
        const publishedChanged = merge(publishedKey, visible.published);
        if (sharedChanged || firstConnection) window.dispatchEvent(new CustomEvent('sigma:grades-submitted', { detail: { remote: true } }));
        if (publishedChanged || firstConnection || previous !== JSON.stringify(visible)) window.dispatchEvent(new CustomEvent('sigma:grades-published', { detail: { remote: true } }));
        const actor = user(), actorId = String(actor.id || actor.uid || '');
        const role = String(actor.role || '').toLowerCase().includes('admin') ? 'admin' : String(actor.role || '').toLowerCase();
        for (const [key, record] of Object.entries(visible.shared)) {
            if (!record.submittedAt || String(record.adviserId) !== actorId || String(record.submittedBy) === actorId) continue;
            const id = `grade-shared-live:${key}:${record.submittedAt}:${actorId}`;
            let existing = []; try { existing = JSON.parse(localStorage.getItem(`sigma-notifications-${role}-v3`) || '[]'); } catch (_) {}
            if (existing.some(item => item.id === id)) continue;
            const [year, section, subject, quarter] = JSON.parse(key);
            window.SigmaNotifications?.sendToRole(role, { id, type: 'quarter-grades-shared', title: record.revised ? 'Updated Grades Awaiting Review' : 'Grades Ready for Review', body: `${subject} • ${section} • Quarter ${quarter}`,
                recipientId: actorId, senderId: record.submittedBy, senderName: record.teacherName || 'Subject Teacher', timestamp: record.submittedAt, read: false,
                target: { gradeRecord: { year, section, subject, quarter, mode: 'review', selected: { subject, sectionName: section } } } });
        }
        for (const [key, record] of Object.entries(visible.published)) {
            if (!record.publishedAt || String(record.publishedBy) === actorId) continue;
            const [year, section, subject, quarter] = JSON.parse(key);
            const id = `grade-live:${key}:${record.publishedAt}:${actorId}`;
            let existing = []; try { existing = JSON.parse(localStorage.getItem(`sigma-notifications-${role}-v3`) || '[]'); } catch (_) {}
            if (existing.some(item => item.id === id)) continue;
            window.SigmaNotifications?.sendToRole(role, { id, type: 'quarter-grades-published', title: record.publisherRole === 'admin' ? 'Grades Published by Admin' : 'Quarter Grades Published', body: `${subject} • ${section} • Quarter ${quarter}`,
                recipientId: actorId, senderId: record.publishedBy, senderName: record.publisherName || (record.publisherRole === 'admin' ? 'Admin' : 'Adviser'), timestamp: record.publishedAt, read: false,
                target: { gradeRecord: { year, section, subject, quarter, mode: 'review', selected: { subject, sectionName: section } } } });
        }
        window.dispatchEvent(new CustomEvent('sigma:grade-sync-status', { detail: { connected: true } }));
    }
    async function refresh() {
        if (pending) return pending;
        pending = request().then(result => { failures = 0; lastError = ''; receive(result); }).catch(error => {
            failures++;
            if (lastError !== error.message) {
                lastError = error.message;
                window.SigmaAnnouncements?.showToast({
                    title: 'Live Grade Updates',
                    message: error.message || 'Live grade updates are currently unavailable.',
                    type: 'error'
                });
            }
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
        status() { return { connected: Boolean(readyFor) && !lastError, message: lastError }; },
        async share(scope, rows) {
            const result = await request({ action: 'share', scope, rows });
            visible.shared[JSON.stringify(scope)] = result.record;
            return result.record;
        },
        async publish(scope, submittedAt) {
            const result = await request({ action: 'publish', scope, submittedAt });
            visible.published[JSON.stringify(scope)] = result.record;
            return result.record;
        }
    };
    window.addEventListener('focus', () => { refresh(); schedule(); });
    window.addEventListener('online', () => { failures = 0; refresh(); schedule(); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { refresh(); schedule(); } });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { refresh(); schedule(); });
    else { refresh(); schedule(); }
})();
