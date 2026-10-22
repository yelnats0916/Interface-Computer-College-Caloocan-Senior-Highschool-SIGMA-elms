(function () {
    'use strict';
    const snapshots = {}, pending = new Map();
    const kind = location.pathname.toLowerCase().includes('teacher') ? 'teacher' : 'student';
    const api = () => location.port && !['80', '443'].includes(location.port) ? 'http://localhost/sigma-elms/php/api/analytics_ai.php'
        : new URL('php/api/analytics_ai.php', location.href).href;
    function status(message, busy = false) {
        document.querySelectorAll('.sigma-analyze-button:not(.sigma-insight-mark-all)').forEach(button => {
            button.disabled = busy; button.title = message; button.setAttribute('aria-label', message);
            button.querySelector('i')?.classList.toggle('fa-spin', busy);
        });
        document.querySelectorAll('.sigma-analysis-status').forEach(node => { node.textContent = message; node.hidden = !message; });
    }
    async function analyze(options = {}) {
        const actor = window.SigmaAcademicRecords?.actor();
        const id = String(actor?.id || '');
        if (!id || window.SigmaAcademicRecords.role() !== kind) return;
        if (pending.has(id)) return pending.get(id);
        const task = (async () => {
            status('Analyzing your latest learning records…', true);
            try {
                await window.SigmaAcademicRecords.flush();
                const response = await window.SigmaDatabase.fetch(api(), { method: 'POST', credentials: 'include',
                    signal: AbortSignal.timeout(130000), headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ kind, feature: 'analytics', language: window.getSigmaAiLanguage?.('insights') || 'en' }) });
                const result = await response.json();
                if (!response.ok || !result.success) throw new Error(result.error || 'Learning insights are unavailable.');
                if (window.SigmaAcademicRecords.actor().id !== id) return;
                snapshots[kind] = result.snapshot;
                await window.SigmaAiDatabase.ensureState(kind, id, true);
                window.dispatchEvent(new Event('sigma:refresh-analytics-cards'));
                status(result.cards?.length ? 'Your new learning insights have been saved.' : result.reason || 'No new supported learning evidence.');
            } catch (error) {
                status(error.message);
                if (!options.automatic) window.SigmaAnnouncements?.showToast?.(error.message, 'error');
            } finally { pending.delete(id); document.querySelectorAll('.sigma-analyze-button').forEach(button => { button.disabled = false; button.querySelector('i')?.classList.remove('fa-spin'); }); }
        })();
        pending.set(id, task); return task;
    }
    window.SigmaLiveAnalytics = { analyze, snapshots };
    let installed = false, timer;
    function install() {
        const controller = kind === 'teacher' ? window.SigmaTeacherAnalytics : window.SigmaStudentAnalytics;
        if (!controller || installed) return;
        installed = true;
        controller.setProvider(async () => { throw new Error('Use the server learning evidence controller.'); });
        controller.liveProviderConnected = true;
        controller.refresh?.();
        setTimeout(() => analyze({ automatic: true }), 1500);
    }
    function changed() { clearTimeout(timer); timer = setTimeout(() => analyze({ automatic: true }), 2500); }
    window.addEventListener('sigma:database-session-ready', changed);
    window.addEventListener('sigma:academic-records-saved', changed);
    window.addEventListener('sigma:grades-published', changed);
    window.addEventListener('sigma:grades-submitted', changed);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
    window.addEventListener('load', install);
    document.addEventListener('sigma:teacher-portal-ready', install);
})();
