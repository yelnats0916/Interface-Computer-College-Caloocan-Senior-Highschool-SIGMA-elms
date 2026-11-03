/* Shared student/teacher Grades loading; reuse each source's in-flight read. */
(function () {
    'use strict';
    let pending = null, pendingOwner = '';
    const waiting = new WeakMap();
    const owner = () => String(window.SigmaDatabase?.currentUser?.()?.id || window.SigmaDatabase?.currentUser?.()?.uid || '');
    const sources = () => [
        { ready: () => !window.SigmaAssignedClassrooms || window.SigmaAssignedClassrooms.isReady(), read: () => window.SigmaAssignedClassrooms?.refresh() },
        { ready: () => !window.SigmaGradeSync || window.SigmaGradeSync.getSharedRecords().ready, read: () => window.SigmaGradeSync?.refresh() },
        { ready: () => !window.SigmaAcademicRecords || window.SigmaAcademicRecords.getPerformanceSnapshot().ready, read: () => window.SigmaAcademicRecords?.refresh() }
    ];
    function wait(host, resume) {
        host.classList.remove('sigma-load-status');
        const missing = sources().filter(source => !source.ready());
        if (!missing.length) { host.removeAttribute('aria-busy'); return false; }
        const id = owner();
        if (!host.querySelector('[data-student-grades-loading]')) {
            window.SigmaContentLoading.render(host, { page: true, label: 'Loading grades' });
            host.firstElementChild?.setAttribute('data-student-grades-loading', '');
        }
        host.setAttribute('aria-busy', 'true');
        if (!pending || pendingOwner !== id) {
            pendingOwner = id;
            const request = Promise.all(missing.map(source => Promise.resolve().then(source.read))).then(() => {
                if (owner() === id && sources().some(source => !source.ready())) throw new Error('Grades could not be loaded. Please try again.');
            });
            pending = request;
            request.finally(() => { if (pending === request) pending = null; }).catch(() => {});
        }
        const request = pending;
        const previous = waiting.get(host);
        if (previous?.request === request) { previous.resume = resume; return true; }
        const state = { request, resume };
        waiting.set(host, state);
        const current = () => host.isConnected && owner() === id && waiting.get(host) === state;
        request.then(() => {
            if (!current()) return;
            waiting.delete(host);
            host.removeAttribute('aria-busy');
            if (!host.closest('#section-grades')?.classList.contains('hidden')) state.resume();
        }, () => {
            if (!current()) return;
            waiting.delete(host);
            host.removeAttribute('aria-busy');
            window.renderSigmaLoadStatus(host, 'Unable to load grades. Please try again.', state.resume);
        });
        return true;
    }
    window.SigmaGradeContentLoading = window.SigmaStudentGradeLoading = { wait };
})();
