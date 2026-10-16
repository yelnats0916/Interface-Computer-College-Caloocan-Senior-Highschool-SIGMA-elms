(function () {
    'use strict';
    const cache = new Map(), pending = new Map();
    window.refreshTeacherGradeInsight = async function (element, evidence) {
        if (!element) return;
        const teacher = window.getLoggedInTeacherUser?.();
        const id = String(teacher?.id || teacher?.uid || '');
        const normalize = value => String(value || '').trim().toLowerCase();
        const assigned = (window.getTeacherAssignedSubjectsAndSections?.(teacher) || []).some(row =>
            normalize(row.subject) === normalize(evidence.subject) && normalize(row.sectionName) === normalize(evidence.section));
        const show = (text, state) => {
            element.textContent = text;
            element.dataset.insightEmpty = String(state !== 'ready');
            element.dataset.insightState = state;
            element.style.setProperty('color', state === 'ready' ? '#000' : 'rgba(0,0,0,0.45)', 'important');
        };
        if (!id || !assigned) { show('Insights unavailable for this class.', 'restricted'); return; }
        if (!evidence.quarters.some(row => Number.isFinite(row.average))) { show('No grades recorded yet.', 'empty'); return; }
        const language = window.getSigmaAiLanguage?.('insights') || 'en';
        const key = JSON.stringify({ id, evidence, language });
        element.dataset.teacherInsightKey = key;
        const render = card => {
            if (!element.isConnected || element.dataset.teacherInsightKey !== key) return;
            element.innerHTML = window.SigmaInsightRules.renderInsightSections(card.analyses, location.href);
            element.dataset.insightCategory = card.analyses[0].category;
            element.dataset.insightEmpty = 'false'; element.dataset.insightState = 'ready';
            element.style.setProperty('color', '#000', 'important');
        };
        if (cache.has(key)) { render(cache.get(key)); return; }
        show('Loading class insights…', 'loading');
        if (!pending.has(key)) pending.set(key, (async () => {
            const api = location.port && !['80', '443'].includes(location.port) ? 'http://localhost/sigma-elms/php/api/analytics_ai.php'
                : new URL(location.pathname.includes('/php/') ? 'api/analytics_ai.php' : 'php/api/analytics_ai.php', location.href).href;
            const snapshot = { teacherId: id, scope: 'class', areas: [{ id: 'class-grades', records: [{ id: 'class-summary',
                subjectId: evidence.subject, sectionId: evidence.section, ...evidence }] }] };
            const response = await fetch(api, { method: 'POST', credentials: 'include', signal: AbortSignal.timeout(90000),
                headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ feature: 'grade_insights', kind: 'teacher', maxCards: 1, snapshot, language }) });
            const result = await response.json();
            if (!response.ok || !result.success || !Array.isArray(result.cards)) throw new Error('Class insights unavailable.');
            const cards = window.SigmaInsightRules.validateCards(result, snapshot);
            const text = cards[0] || null;
            if (text) cache.set(key, text);
            window.SigmaAiLogs?.record({ userId: id, feature: 'grade_insights', timestamp: new Date().toISOString(), prompt: 'Class Grades: ' + evidence.subject,
                response: JSON.stringify(cards), model: result.model, provider: result.provider, keyId: result.keyId, keyLabel: result.keyLabel, status: result.status || 'Success' });
            return text;
        })());
        try {
            const text = await pending.get(key);
            if (text) render(text);
            else if (element.isConnected && element.dataset.teacherInsightKey === key) show('Not enough evidence for an insight yet.', 'empty');
        } catch (_) {
            if (!element.isConnected || element.dataset.teacherInsightKey !== key) return;
            show('Class insights unavailable. ', 'error');
            const retry = document.createElement('button'); retry.type = 'button'; retry.textContent = 'Retry'; retry.className = 'underline cursor-pointer';
            retry.onclick = () => window.refreshTeacherGradeInsight(element, evidence); element.append(retry);
        } finally { pending.delete(key); }
    };
})();
