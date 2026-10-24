(function () {
    'use strict';
    const student = /\/student\.html$/i.test(location.pathname);
    if (!student && !/\/teacher\.html$/i.test(location.pathname)) return;
    let pending = null, owner = '', last = 0, readyFor = '';
    const notify = () => window.dispatchEvent(new CustomEvent('sigma:assigned-classrooms-updated'));
    const actor = () => window.SigmaDatabase?.currentUser?.() || {};
    async function refresh(force = false) {
        const user = actor(), id = String(user.id || user.uid || '');
        if (!id || String(user.role || user.type).toLowerCase() !== (student ? 'student' : 'teacher')) return;
        if (pending && owner === id) return pending;
        if (!force && owner === id && Date.now() - last < 15000) return;
        owner = id;
        notify();
        const work = (async () => {
            const result = await window.SigmaDatabase.request(student ? 'student_classrooms' : 'teacher_classrooms', { timeoutMs: 20000, foreground: true });
            if (String(actor().id || actor().uid || '') !== id || result.ownerId !== id) return;
            if (!Array.isArray(result.sections) || !Array.isArray(result.subjects)) throw new Error('Invalid assigned class response.');
            let changed = false;
            const changedKeys = [];
            for (const [key, records] of [['sigma-admin-subjects', result.subjects], ['sigma-admin-sections', result.sections]]) {
                const value = JSON.stringify(records);
                if (localStorage.getItem(key) === value) continue;
                localStorage.setItem(key, value); changed = true;
                changedKeys.push([key, value]);
            }
            if (Array.isArray(result.schoolYears)) {
                const key = 'sigma_school_year_records', value = JSON.stringify(result.schoolYears);
                if (localStorage.getItem(key) !== value) {
                    localStorage.setItem(key, value);
                    changedKeys.push([key, value]); changed = true;
                }
                window.updateGlobalSYDisplay?.();
            }
            readyFor = id;
            last = Date.now();
            notify();
            if (changed) {
                for (const [key, value] of changedKeys) window.dispatchEvent(new StorageEvent('storage', { key, newValue: value, storageArea: localStorage }));
                window.dispatchEvent(new CustomEvent('sigma:section-deployed'));
                window.dispatchEvent(new CustomEvent('sigma:teacher-classes-loaded'));
            }
        })().catch(error => { console.warn('Assigned classes will retry when connected.', error); })
            .finally(() => { if (pending === work) pending = null; });
        pending = work;
        return work;
    }
    window.SigmaTeacherClassrooms = { refresh };
    window.SigmaAssignedClassrooms = { refresh, isReady: () => readyFor === String(actor().id || actor().uid || ''), isLoading: () => !!pending };
    for (const name of ['sigma:database-session-ready','sigma:tab-identity-restored','online']) window.addEventListener(name, () => refresh(true));
    window.addEventListener('focus', () => refresh());
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refresh(); });
    setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, 30000);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => refresh(true)); else refresh(true);
})();
