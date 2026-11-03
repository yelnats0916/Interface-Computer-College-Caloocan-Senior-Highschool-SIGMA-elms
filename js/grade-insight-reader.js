(function () {
    'use strict';
    const saved = new Map(), pending = new Map(), active = new WeakMap(), timers = new WeakMap(), displayed = new Map();
    // Share/review and admin analytics read the assigned teacher's same saved report.
    window.refreshClassGradeReport = async function (element, evidence) {
        if (!element) return;
        displayed.set(element, evidence);
        clearTimeout(timers.get(element));
        const user = window.SigmaDatabase?.currentUser?.() || window.getLoggedInTeacherUser?.() || {};
        const owner = String(user.id || user.uid || location.pathname);
        const language = window.getSigmaAiLanguage?.('insights') || 'en';
        const key = JSON.stringify([owner, evidence.subject, evidence.section, language]);
        const operation = Symbol(); active.set(element, operation);
        const current = () => element.isConnected && active.get(element) === operation;
        const render = result => {
            if (!current()) return;
            const card = result?.cards?.[0];
            if (card) {
                const sourceLabel = result.generationSource === 'grade_summary' ? '<div class="text-xs text-black-fade mb-2">Grade summary · Calculated from recorded grades</div>' : '';
                element.innerHTML = sourceLabel + window.SigmaInsightRules.renderInsightSections(card.analyses, location.href) + (window.renderSigmaInsightTimestamp?.(card.createdAt) || '');
                element.dataset.insightState = 'ready';
                element.dataset.insightGenerationId = result.generationId || '';
                element.dataset.insightEmpty = 'false';
            } else {
                element.textContent = result?.state === 'empty' || result?.state === 'ready' ? 'No insights recorded yet.' : 'Your updated insight is being prepared.';
                element.dataset.insightState = result?.state || 'pending';
                element.dataset.insightEmpty = 'true';
                delete element.dataset.insightGenerationId;
            }
        };
        const cached = saved.get(key);
        if (cached) render(cached.result);
        if (!cached) window.SigmaContentLoading?.render(element, { compact: true, label: 'Loading grade insights' });
        if (cached && Date.now() - cached.at < 15000) return;
        if (!pending.has(key)) pending.set(key, (async () => {
            const url = location.port && !['80', '443'].includes(location.port) ? 'http://localhost/sigma-elms/php/api/analytics_ai.php'
                : new URL('php/api/analytics_ai.php', location.href).href;
            const response = await window.SigmaDatabase.fetch(url, { method: 'POST', credentials: 'include', foreground: true, autoReconnect: false,
                timeoutMs: 15000, signal: AbortSignal.timeout(15000), headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ feature: 'grade_insights', language, snapshot: { scope: 'class', quarter: 'all',
                    areas: [{ records: [{ subjectId: evidence.subject, sectionId: evidence.section }] }] } }) });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error('Saved insight could not be loaded.');
            if (result.cards?.length) {
                const original = result.cards;
                result.cards = window.SigmaInsightRules.validateCards(result, result.snapshot).map((card, index) => ({ ...card, createdAt: original[index].createdAt, generationId: result.generationId }));
            }
            saved.set(key, { result, at: Date.now() });
            return result;
        })());
        const request = pending.get(key);
        try {
            const result = await request; render(result);
            if (current() && result.state === 'pending') timers.set(element, setTimeout(() => {
                saved.delete(key);
                if (current() && !document.hidden) window.refreshClassGradeReport(element, evidence);
            }, Math.max(15, Number(result.retryAfter) || 15) * 1000));
        } catch (_) {
            if (current() && !cached) { element.textContent = 'Unable to load saved insights. Please refresh.'; element.dataset.insightState = 'error'; }
        } finally { if (pending.get(key) === request) pending.delete(key); }
    };
    const sync = () => {
        if (document.hidden) return;
        for (const [element, evidence] of displayed) {
            if (!element.isConnected) { displayed.delete(element); continue; }
            if (element.getClientRects().length) window.refreshClassGradeReport(element, evidence);
        }
    };
    for (const event of ['sigma:grades-submitted', 'sigma:grades-published', 'sigma:academic-snapshot-updated', 'sigma:academic-records-saved', 'sigma-insight-management-update']) window.addEventListener(event, () => saved.clear());
    window.addEventListener('storage', event => { if (/grade|session|insight-management/.test(event.key || '')) saved.clear(); });
    window.addEventListener('focus', sync);
    document.addEventListener('visibilitychange', sync);
    setInterval(sync, 30000);
})();
