(function () {
    'use strict';
    const student = /\/student\.html$/i.test(location.pathname);
    if (!student && !/\/teacher\.html$/i.test(location.pathname)) return;
    let pending = null, owner = '', last = 0, readyFor = '', loadError = '';
    let catalogs = {};
    const notify = () => window.dispatchEvent(new CustomEvent('sigma:assigned-classrooms-updated'));
    const actor = () => window.SigmaDatabase?.currentUser?.() || {};
    async function refresh(force = false) {
        const user = actor(), id = String(user.id || user.uid || '');
        if (!id || String(user.role || user.type).toLowerCase() !== (student ? 'student' : 'teacher')) return;
        if (pending && owner === id) return pending;
        if (!force && owner === id && Date.now() - last < 15000) return;
        if (owner !== id) { catalogs = {}; readyFor = ''; }
        owner = id;
        loadError = '';
        notify();
        const work = (async () => {
            const result = await window.SigmaDatabase.request(student ? 'student_classrooms' : 'teacher_classrooms', { timeoutMs: 20000, foreground: true, autoReconnect: false });
            if (String(actor().id || actor().uid || '') !== id || result.ownerId !== id) return;
            if (!Array.isArray(result.sections) || !Array.isArray(result.subjects)) throw new Error('Invalid assigned class response.');
            let changed = false;
            const changedKeys = [];
            for (const [key, records] of [['sigma-admin-subjects', result.subjects], ['sigma-admin-sections', result.sections]]) {
                const value = JSON.stringify(records);
                const previous = JSON.stringify(catalogs[key]);
                catalogs[key] = records;
                // Database results must remain usable even when the device cache is full.
                try { if (value.length <= 512 * 1024 && localStorage.getItem(key) !== value) localStorage.setItem(key, value); } catch (_) {}
                if (previous === value) continue;
                changed = true;
                changedKeys.push([key, value]);
            }
            catalogs['sigma-advisory-sections']=Array.isArray(result.advisorySections)?result.advisorySections:[];
            if (Array.isArray(result.schoolYears)) {
                const key = 'sigma_school_year_records', value = JSON.stringify(result.schoolYears);
                const previous = JSON.stringify(catalogs[key]);
                catalogs[key] = result.schoolYears;
                try { if (localStorage.getItem(key) !== value) localStorage.setItem(key, value); } catch (_) {}
                if (previous !== value) {
                    changedKeys.push([key, value]); changed = true;
                }
            }
            readyFor = id;
            window.updateGlobalSYDisplay?.();
            last = Date.now();
            notify();
            if (changed) {
                for (const [key, value] of changedKeys) window.dispatchEvent(new StorageEvent('storage', { key, newValue: value, storageArea: localStorage }));
                window.dispatchEvent(new CustomEvent('sigma:section-deployed'));
                window.dispatchEvent(new CustomEvent('sigma:teacher-classes-loaded'));
            }
        })().catch(error => {
            loadError = error.message || 'Assigned classes could not load.';
            console.warn('Assigned classes will retry when connected.', error);
            notify();
        })
            .finally(() => { if (pending === work) pending = null; });
        pending = work;
        return work;
    }
    window.SigmaTeacherClassrooms = { refresh };
    window.SigmaAssignedClassrooms = {
        refresh,
        isReady: () => readyFor === String(actor().id || actor().uid || ''),
        isLoading: () => !!pending,
        error: () => loadError,
        records: key => {
            if (!['sigma-admin-subjects', 'sigma-admin-sections', 'sigma_school_year_records', 'sigma-advisory-sections'].includes(key)) return undefined;
            const id = String(actor().id || actor().uid || '');
            return owner === id && readyFor === id ? (catalogs[key] || []) : [];
        }
    };
    for (const name of ['sigma:database-session-ready','sigma:tab-identity-restored','online']) window.addEventListener(name, () => refresh(true));
    window.addEventListener('focus', () => refresh());
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refresh(); });
    setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, 30000);
    const startupRead = /^#grades(?::|$)/i.test(location.hash || '') || (student && /^#classroom[-:].*attendance/i.test(location.hash || '')) ? refresh() : null;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => startupRead || refresh(true)); else if (!startupRead) refresh(true);
})();
