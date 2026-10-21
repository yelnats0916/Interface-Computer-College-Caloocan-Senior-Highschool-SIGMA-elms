(function () {
    'use strict';
    const cache = new Map(), pending = new Map();
    const storageKey = 'sigma-teacher-grade-insights-v1';
    function readStoredInsight(key) {
        if (cache.has(key)) return cache.get(key);
        try {
            const stored = JSON.parse(localStorage.getItem(storageKey) || '{}');
            if (stored[key]) {
                cache.set(key, stored[key]);
                return stored[key];
            }
        } catch (_) {}
        return null;
    }
    function saveStoredInsight(key, text) {
        if (!text || text.isDeleted) {
            cache.delete(key);
            try {
                const stored = JSON.parse(localStorage.getItem(storageKey) || '{}');
                delete stored[key];
                localStorage.setItem(storageKey, JSON.stringify(stored));
            } catch (_) {}
            return;
        }
        cache.set(key, text);
        try {
            const stored = JSON.parse(localStorage.getItem(storageKey) || '{}');
            stored[key] = text;
            localStorage.setItem(storageKey, JSON.stringify(stored));
        } catch (_) {}
    }
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
            if (card?.isDeleted) {
                show('No insights recorded yet.', 'empty');
                return;
            }
            element.innerHTML = window.SigmaInsightRules.renderInsightSections(card.analyses, location.href) + (window.renderSigmaInsightTimestamp?.(card.createdAt) || '');
            window.restoreSigmaInsightTimestamp?.(element, card, id,
                () => element.dataset.teacherInsightKey === key,
                restored => saveStoredInsight(key, restored));
            element.dataset.insightCategory = card.analyses[0].category;
            element.dataset.insightEmpty = 'false'; element.dataset.insightState = 'ready';
            element.style.setProperty('color', '#000', 'important');
        };
        const cached = readStoredInsight(key);
        if (cached) { render(cached); return; }
        show('Loading class insights…', 'loading');
        if (!pending.has(key)) pending.set(key, (async () => {
            const api = location.port && !['80', '443'].includes(location.port) ? 'http://localhost/sigma-elms/php/api/analytics_ai.php'
                : new URL(location.pathname.includes('/php/') ? 'api/analytics_ai.php' : 'php/api/analytics_ai.php', location.href).href;
            const snapshot = { teacherId: id, scope: 'class', areas: [{ id: 'class-grades', records: [{ id: 'class-summary',
                subjectId: evidence.subject, sectionId: evidence.section, ...evidence }] }] };
            try {
                const response = await window.SigmaDatabase.fetch(api, { method: 'POST', credentials: 'include', signal: AbortSignal.timeout(90000),
                    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ feature: 'grade_insights', kind: 'teacher', maxCards: 1, snapshot, language }) });
                const result = await response.json();
                if (!response.ok || !result.success || !Array.isArray(result.cards)) throw new Error('Class insights unavailable.');
                if (!/^(INSG|INSC|INSGR|INSS|INSA)-\d{4}-\d{4,}$/.test(String(result.generationId || ''))) throw new Error('Class insight was returned without a generation ID.');
                const cards = window.SigmaInsightRules.validateCards(result, snapshot);
                const logId = window.SigmaAiLogs?.record({ userId: id, feature: 'grade_insights', timestamp: new Date().toISOString(), prompt: 'Class Grades: ' + evidence.subject,
                        response: JSON.stringify(cards), model: result.model, provider: result.provider, keyId: result.keyId, keyLabel: result.keyLabel, generationId: result.generationId, status: result.status || 'Success' });
                const text = cards[0] ? { ...cards[0], generationId: result.generationId, createdAt: new Date().toISOString(),
                    ...(logId ? { insightSourceId: `${logId}:0` } : {}) } : null;
                if (text) saveStoredInsight(key, text);
                return text;
            } catch (err) {
                throw err;
            }
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
