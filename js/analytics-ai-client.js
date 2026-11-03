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
            button.title = busy ? 'Generating daily insights…' : 'Generate today’s daily insight';
            button.setAttribute('aria-label', button.title);
            button.setAttribute('aria-busy', String(busy));
            button.querySelector('i')?.classList.toggle('fa-spin', busy);
        });
    }
    function paintCards() {
        const controller = kind === 'teacher' ? window.SigmaTeacherAnalytics : window.SigmaStudentAnalytics;
        controller?.refresh?.();
        document.querySelectorAll('#sigma-panels-container, .sigma-analytics-rail, .pocket-cards-rail').forEach(node => {
            if (node.id) window.SigmaAnalytics?.render(node.id);
        });
        window.syncMobileAnalyticsCards?.();
        window.dispatchEvent(new Event('sigma:refresh-analytics-cards'));
    }
    async function analyze(options = {}) {
        const actor = window.SigmaAcademicRecords?.actor();
        const id = String(actor?.id || '');
        if (!id || window.SigmaAcademicRecords.role() !== kind) return;
        if (options.automatic) {
            await window.SigmaAiDatabase?.ensureState(kind, id, true);
            window.dispatchEvent(new Event('sigma:refresh-analytics-cards'));
            return;
        }
        const existing = pending.get(id);
        if (existing) {
            // A click can join a background check without launching another generation.
            if (!options.automatic) { existing.manual = true; setManualBusy(true); }
            return existing.promise;
        }
        const beforeCardIds = new Set((window.SigmaAiDatabase?.getState(kind, id)?.cards || []).map(card => card.id));
        const run = { manual: !options.automatic };
        if (run.manual) setManualBusy(true);
        pending.set(id, run);
        run.promise = (async () => {
            try {
                await window.SigmaAcademicRecords.flush();
                const response = await window.SigmaDatabase.fetch(api(), { method: 'POST', credentials: 'include',
                    signal: AbortSignal.timeout(25000), foreground: true, autoReconnect: false, headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ kind, feature: 'analytics', dailyCycle: true, language: window.getSigmaAiLanguage?.('insights') || 'en' }) });
                const result = await response.json();
                if (!response.ok || !result.success) throw new Error(result.error || 'Learning insights are unavailable.');
                if (String(window.SigmaAcademicRecords.actor()?.id || '') !== id) return;
                snapshots[kind] = result.snapshot;
                if (result.analyticsState && window.SigmaAiDatabase.acceptGeneratedState) {
                    window.SigmaAiDatabase.acceptGeneratedState(kind, id, result.analyticsState);
                } else {
                    await window.SigmaAiDatabase.refreshGeneratedState(kind, id);
                }
                paintCards();
                if (run.manual) window.SigmaFeedback?.notify(result.cards?.length ? 'Daily insight generated.' : (result.reason || 'You are up to date. New insights will appear when new grades or class activity are available.'), result.cards?.length ? 'success' : 'info');
            } catch (error) {
                // The server may have committed cards even if the generation response was interrupted.
                if (String(window.SigmaAcademicRecords.actor()?.id || '') === id) {
                    try {
                        const saved = await window.SigmaAiDatabase.refreshGeneratedState(kind, id); paintCards();
                        if (saved?.cards?.some(card => !beforeCardIds.has(card.id))) {
                            if (run.manual) window.SigmaFeedback?.notify('Daily insight generated.', 'success');
                            return;
                        }
                    } catch (_) {}
                }
                console.warn('[SIGMA] Learning insights check failed:', error);
                if (run.manual && String(window.SigmaAcademicRecords.actor()?.id || '') === id) window.SigmaFeedback?.notify(error.message || 'The daily cycle could not generate insights. Please try again.', 'error');
            } finally {
                pending.delete(id);
                if (run.manual) { paintCards(); setManualBusy(false); }
            }
        })();
        return run.promise;
    }
    window.SigmaLiveAnalytics = { analyze, snapshots, nextDailyCycleAt: nextManilaMidnight };
    let installed = false, timer, midnightTimer;
    function nextManilaMidnight(now = Date.now()) {
        const offset = 8 * 60 * 60 * 1000;
        return Math.floor((now + offset) / 86400000) * 86400000 + 86400000 - offset;
    }
    function scheduleMidnight() {
        clearTimeout(midnightTimer);
        midnightTimer = setTimeout(() => {
            analyze({ automatic: true }).catch(console.warn);
            scheduleMidnight();
        }, Math.max(1000, nextManilaMidnight() - Date.now()));
    }
    function install() {
        const controller = kind === 'teacher' ? window.SigmaTeacherAnalytics : window.SigmaStudentAnalytics;
        if (!controller || installed) return;
        installed = true;
        document.querySelectorAll('.sigma-analysis-status').forEach(node => node.remove());
        setManualBusy(false);
        controller.setProvider(async () => { throw new Error('Use the server learning evidence controller.'); });
        controller.liveProviderConnected = true;
        controller.refresh?.();
        // Loading a portal reads saved cards; only the server scheduler generates daily cards.
        setTimeout(() => analyze({ automatic: true }).catch(console.warn), 1500);
        scheduleMidnight();
        setInterval(() => { if (document.visibilityState !== 'hidden') analyze({ automatic: true }).catch(console.warn); }, 60000);
    }
    function changed() { clearTimeout(timer); timer = setTimeout(() => analyze({ automatic: true }).catch(console.warn), 2500); }
    window.addEventListener('sigma:database-session-ready', changed);
    window.addEventListener('sigma:academic-records-saved', changed);
    window.addEventListener('sigma:grades-published', changed);
    window.addEventListener('sigma:grades-submitted', changed);
    window.addEventListener('focus', changed);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
    window.addEventListener('load', install);
    document.addEventListener('sigma:teacher-portal-ready', install);
})();
