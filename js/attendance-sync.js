(function () {
    'use strict';
    const key = 'sigma-attendance-records-v1';
    let pending = null, readyFor = '', encoded = '';
    const actor = () => window.SigmaDatabase?.currentUser() || {};
    function normalize(record) {
        const statuses = Object.fromEntries(Object.entries(record.statuses || {}).map(([id, status]) =>
            [id, ({present:'P',absent:'A',late:'L',excused:'E'})[status] || status]));
        return {...record, statuses};
    }
    function receive(result) {
        if (String(result.userId) !== String(actor().id)) return;
        const text = JSON.stringify(result.scopes);
        if (readyFor === String(result.userId) && text === encoded) return;
        const records = {};
        for (const scope of result.scopes || []) {
            records[`${scope.section}::${scope.subject}`] = Object.fromEntries(
                Object.entries(scope.days || {}).filter(([, day]) => day.submitted === true).map(([date, day]) => [date, normalize(day)]));
        }
        if (readyFor !== String(result.userId) && String(actor().role || '').toLowerCase() !== 'student') {
            // Preserve existing work on this teacher's device as a private draft;
            // a legacy browser-only "submitted" flag is never proof of publication.
            const draftKey = 'sigma-attendance-drafts:' + result.userId;
            let legacy = {}, drafts = {};
            try { legacy = JSON.parse(localStorage.getItem(key) || '{}'); drafts = JSON.parse(localStorage.getItem(draftKey) || '{}'); } catch (_) {}
            const norm = text => String(text || '').replace(/^grade\s*\d+\s*[-–]?\s*/i, '').replace(/[-_]+/g, ' ').replace(/\s*&\s*/g, ' and ').trim().toLowerCase();
            for (const scope of result.scopes || []) {
                const canonical = `${scope.section}::${scope.subject}`;
                for (const [oldKey, days] of Object.entries(legacy)) {
                    const [section, subject] = oldKey.split('::');
                    if (norm(section) !== norm(scope.section) || norm(subject) !== norm(scope.subject)) continue;
                    for (const [date, day] of Object.entries(days || {})) {
                        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !day?.statuses || records[canonical]?.[date]) continue;
                        drafts[canonical] ||= {};
                        drafts[canonical][date] ||= {...day, submitted:false, submittedAt:null};
                    }
                }
            }
            localStorage.setItem(draftKey, JSON.stringify(drafts));
        }
        localStorage.setItem(key, JSON.stringify(records));
        readyFor = String(result.userId); encoded = text;
        window.dispatchEvent(new CustomEvent('sigma:attendance-changed', {detail:{remote:true}}));
    }
    function refresh() {
        if (!actor().id) return Promise.resolve();
        if (pending) return pending;
        pending = window.SigmaDatabase.request('attendance').then(receive).finally(() => {pending = null;});
        return pending;
    }
    async function submit(input) {
        const owner = String(actor().id || '');
        const result = await window.SigmaDatabase.request('attendance', {data:input, autoReconnect:false, foreground:true});
        if (String(actor().id || '') !== owner) throw new Error('The signed-in account changed.');
        if (!result.success || result.record?.submitted !== true) throw new Error('The server did not confirm attendance. Your draft is retained.');
        encoded = '';
        return result;
    }
    window.SigmaAttendance = {refresh, submit, ready:() => readyFor === String(actor().id)};
    const sync = () => refresh().catch(error => console.warn('Attendance refresh:', error.message));
    window.addEventListener('focus', sync);
    window.addEventListener('online', sync);
    document.addEventListener('visibilitychange', () => {if (!document.hidden) sync();});
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', sync); else sync();
    setInterval(() => {if (!document.hidden) sync();}, 15000);
})();
