(function () {
    'use strict';
    const snapshots = {}, pending = new Map();
    const kind = location.pathname.toLowerCase().includes('teacher') ? 'teacher' : 'student';
    const api = () => location.port && !['80', '443'].includes(location.port) ? 'http://localhost/sigma-elms/php/api/analytics_ai.php'
        : new URL('php/api/analytics_ai.php', location.href).href;
    const refreshButtons = () => document.querySelectorAll('.sigma-analyze-button:not(.sigma-insight-mark-all)');
    function setManualBusy(busy) {
        refreshButtons().forEach(button => {
            button.disabled = busy;
            button.title = busy ? 'Refreshing insights…' : 'Refresh insights';
            button.setAttribute('aria-label', button.title);
            button.setAttribute('aria-busy', String(busy));
            button.querySelector('i')?.classList.toggle('fa-spin', busy);
        });
    }
    async function analyze(options = {}) {
        const actor = window.SigmaAcademicRecords?.actor();
        const id = String(actor?.id || '');
        if (!id || window.SigmaAcademicRecords.role() !== kind) return;
        const existing = pending.get(id);
        if (existing) {
            // A click can join a background check without launching another generation.
            if (!options.automatic) { existing.manual = true; setManualBusy(true); }
            return existing.promise;
        }
        const run = { manual: !options.automatic };
        if (run.manual) setManualBusy(true);
        pending.set(id, run);
        run.promise = (async () => {
            try {
                await window.SigmaAcademicRecords.flush();
                const response = await window.SigmaDatabase.fetch(api(), { method: 'POST', credentials: 'include',
                    signal: AbortSignal.timeout(130000), headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ kind, feature: 'analytics', language: window.getSigmaAiLanguage?.('insights') || 'en' }) });
                const result = await response.json();
                if (!response.ok || !result.success) throw new Error(result.error || 'Learning insights are unavailable.');
                if (String(window.SigmaAcademicRecords.actor()?.id || '') !== id) return;
                snapshots[kind] = result.snapshot;
                await window.SigmaAiDatabase.ensureState(kind, id, true);
                window.dispatchEvent(new Event('sigma:refresh-analytics-cards'));
                if (run.manual) window.SigmaFeedback?.notify(result.cards?.length ? 'Your learning insights have been updated.' : 'No new insights available yet.', result.cards?.length ? 'success' : 'info');
            } catch (error) {
                console.warn('[SIGMA] Learning insights check failed:', error);
                if (run.manual && String(window.SigmaAcademicRecords.actor()?.id || '') === id) window.SigmaFeedback?.notify('Insights could not be refreshed. Please try again.', 'error');
            } finally {
                pending.delete(id);
                if (run.manual) setManualBusy(false);
            }
        })();
        return run.promise;
    }
    window.SigmaLiveAnalytics = { analyze, snapshots };
    let installed = false, timer;
    function install() {
        const controller = kind === 'teacher' ? window.SigmaTeacherAnalytics : window.SigmaStudentAnalytics;
        if (!controller || installed) return;
        installed = true;
        document.querySelectorAll('.sigma-analysis-status').forEach(node => node.remove());
        setManualBusy(false);
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
