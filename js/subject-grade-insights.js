(function () {
    const pending = new Map();
    const savedResults = new Map();
    const displayedInsights = new Map();
    const cacheKey = 'sigma-subject-grade-insights-v3';
    const insightPolicyVersion = 'student-grade-wording-v5';
    // Object/record order is presentation, not new grade evidence.
    function stableValue(value) {
        if (Array.isArray(value)) return value.map(stableValue);
        if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stableValue(value[key])]));
        return value;
    }
    function canonicalEvidence(evidence) {
        const result = { ...evidence };
        for (const key of ['records', 'assessments']) {
            if (Array.isArray(result[key])) result[key] = result[key].map(stableValue)
                .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
        }
        if (result.scope === 'overall') result.grades = result.records.flatMap(row => row.grades);
        return stableValue(result);
    }
    function readSaved(fingerprint) {
        const equivalent = key => {
            try {
                const value = JSON.parse(key);
                delete value.insightPolicyVersion;
                const requested = JSON.parse(fingerprint);
                delete requested.insightPolicyVersion;
                return JSON.stringify(canonicalEvidence(value)) === JSON.stringify(canonicalEvidence(requested));
            } catch (_) { return false; }
        };
        let newest = savedResults.get(fingerprint);
        try {
            for (const [key, text] of Object.entries(JSON.parse(localStorage.getItem(cacheKey) || '{}'))) {
                if (!equivalent(key) || !Array.isArray(text?.analyses) || text.isDeleted) continue;
                if (!newest || Date.parse(text.createdAt) > Date.parse(newest.createdAt)) newest = text;
            }
        } catch (_) {}
        if (newest) savedResults.set(fingerprint, newest);
        return newest;
    }
    function saveResult(fingerprint, text) {
        if (!text || text.isDeleted) {
            savedResults.delete(fingerprint);
            try {
                const latest = JSON.parse(localStorage.getItem(cacheKey) || '{}');
                delete latest[fingerprint];
                localStorage.setItem(cacheKey, JSON.stringify(latest));
            } catch (_) {}
            return;
        }
        savedResults.set(fingerprint, text);
        try {
            const latest = JSON.parse(localStorage.getItem(cacheKey) || '{}');
            latest[fingerprint] = text;
            localStorage.setItem(cacheKey, JSON.stringify(latest));
        } catch (_) {}
    }
    window.refreshOverallGradeInsight = function (element, rows) {
        const user = window.getLoggedInStudentUser?.() || {};
        const records = rows.map(row => ({ id: String(row.id), subjectId: String(row.id),
            sectionId: String(user.section || user.sectionName || ''), subject: row.subject,
            grades: [row.term1Val, row.term2Val, row.term3Val, row.term4Val].map(value => Number.isFinite(value) ? value : null) }));
        return window.refreshSubjectGradeInsight(element, { scope: 'overall', quarter: 'all', records,
            grades: records.flatMap(row => row.grades), assessments: [] });
    };
    window.refreshSubjectGradeInsight = async function (element, evidence) {
        if (!element) return;
        displayedInsights.set(element, evidence);
        const user = window.getLoggedInStudentUser?.();
        const userId = String(user?.uid || user?.id || '');
        if (!userId) { element.textContent = 'Sign in to view subject insights.'; return; }
        const overall = evidence.scope === 'overall';
        const title = overall ? 'Overall Grades: ' + (evidence.records.map(row => row.subject).join(', ') || 'No subjects')
            : `Subject Grades: ${evidence.subject} (${evidence.quarter === 'all' ? 'All quarters' : 'Quarter ' + evidence.quarter})`;
        const records = overall ? evidence.records : [{ id: 'subject-summary', ...evidence }];
        const evidenceSources = [{ id: overall ? 'overall-grades' : 'subject-grades',
            label: overall ? 'Overall Grades — Published Grade Records' : 'Subject Grades — Grade and Assessment Records',
            records: records.map(row => ({ id: row.id, title: row.subject, subjectId: row.subjectId, sectionId: row.sectionId })) }];
        const language = window.getSigmaAiLanguage?.('insights') || 'en';
        const fingerprint = JSON.stringify(stableValue({ userId, ...canonicalEvidence(evidence), language, insightPolicyVersion }));
        const evidenceKey = JSON.stringify(stableValue({ userId, ...canonicalEvidence(evidence), language }));
        const viewKey = JSON.stringify([overall ? 'overall' : 'subject', overall ? '' : evidence.subjectId || evidence.subject, evidence.sectionId || '', evidence.quarter, language]);
        element.dataset.insightFingerprint = fingerprint;
        const show = text => {
            if (element.dataset.insightFingerprint !== fingerprint || !element.isConnected) return;
            if (text && typeof text === 'object') {
                if (text?.isDeleted) {
                    element.innerHTML = window.renderSigmaAiText('No insights recorded yet.');
                    element.dataset.insightEmpty = 'true';
                    element.dataset.insightState = 'empty';
                    element.style.setProperty('color', 'rgba(0, 0, 0, 0.45)', 'important');
                    return;
                }
                element.innerHTML = window.SigmaInsightRules.renderInsightSections(text.analyses, location.href) + (window.renderSigmaInsightTimestamp?.(text.createdAt) || '');
                if (text.generationId) {
                    try {
                        const activeKey = 'sigma-student-grade-insight-views-v1';
                        const active = JSON.parse(localStorage.getItem(activeKey) || '{}');
                        const ownerViews = active[userId] || {};
                        if (ownerViews[viewKey] !== text.generationId) {
                            active[userId] = { ...ownerViews, [viewKey]: text.generationId };
                            localStorage.setItem(activeKey, JSON.stringify(active));
                            window.dispatchEvent(new Event('sigma:grade-insight-view-updated'));
                        }
                    } catch (_) {}
                    window.SigmaAiDatabase?.request('ai_records', { action: 'grade_insight_view', userId, viewKey, generationId: text.generationId }).catch(() => {});
                }
                window.restoreSigmaInsightTimestamp?.(element, text, userId,
                    () => element.dataset.insightFingerprint === fingerprint,
                    restored => saveResult(fingerprint, restored));
                element.dataset.insightCategory = text.analyses[0].category;
                element.dataset.insightEmpty = 'false';
                element.style.setProperty('color', '#000', 'important');
                return;
            }
            element.innerHTML = window.renderSigmaAiText(text);
            const empty = /^(Sign in|No grades|Loading|Not enough|SIGMA AI .*Insights are unavailable)/.test(text);
            element.dataset.insightEmpty = String(empty);
            element.style.setProperty('color', empty ? 'rgba(0,0,0,0.45)' : '#000', 'important');
        };
        let saved = readSaved(fingerprint);
        // Logs created before evidence keys were introduced still belong to their
        // exact original Grades/Subject view. Reuse their saved response, never regenerate it.
        try {
            const logs = JSON.parse(localStorage.getItem('sigma-ai-recorded-logs') || '[]');
            for (const log of Array.isArray(logs) ? logs : []) {
                if (String(log.userId) !== userId || log.feature !== 'grade_insights' || log.isDeleted
                    || !['Success', 'Fallback Used'].includes(log.status)) continue;
                if (log.gradeEvidenceKey ? log.gradeEvidenceKey !== evidenceKey : log.prompt !== title) continue;
                if (saved && Date.parse(log.timestamp) <= Date.parse(saved.createdAt)) continue;
                const cards = JSON.parse(log.response || '[]');
                const card = cards.find(item => Array.isArray(item?.analyses) && item.analyses.length);
                if (!card || !log.generationId) continue;
                saved = { ...card, generationId: log.generationId, createdAt: log.timestamp, insightSourceId: `${log.id}:${cards.indexOf(card)}` };
            }
            if (saved) saveResult(fingerprint, saved);
        } catch (_) {}
        if (saved) show(saved);
        try {
            const result = await window.SigmaAiDatabase?.request('ai_records', {
                action: 'latest_grade_insight', userId, evidenceKey,
                legacyPrompt: title,
                candidateGenerationIds: saved?.generationId ? [saved.generationId] : []
            });
            if (result?.card && (!saved || Date.parse(result.card.createdAt) >= Date.parse(saved.createdAt))) {
                saved = result.card;
                saveResult(fingerprint, saved);
            }
        } catch (_) { /* Keep the saved copy when the database is unavailable. */ }
        if (saved) { savedResults.set(fingerprint, saved); show(saved); return; }
        if (!evidence.assessments.some(row => row.score != null) && !evidence.grades.some(value => typeof value === 'number')) {
            show(overall ? 'No grades recorded yet.' : 'No grades recorded yet for this subject.'); return;
        }
        element.dataset.insightEmpty = 'true';
        window.SigmaContentLoading.render(element, {compact:true, label:'Loading grade insights'});
        if (!pending.has(fingerprint)) {
            const generate = async () => {
                // Another tab may have finished while this tab waited for the lock.
                const existing = readSaved(fingerprint);
                if (existing) return existing;
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), 130000);
                try {
                    const api = location.port && !['80', '443'].includes(location.port)
                        ? 'http://localhost/sigma-elms/php/api/analytics_ai.php'
                        : new URL(location.pathname.includes('/php/') ? 'api/analytics_ai.php' : 'php/api/analytics_ai.php', location.href).href;
                    const snapshot = { studentId: userId, scope: overall ? 'overall' : 'subject', quarter: evidence.quarter,
                        areas: [{ id: overall ? 'overall-grades' : 'subject-grades', records }] };
                    const response = await window.SigmaDatabase.fetch(api, { method: 'POST', credentials: 'include', signal: controller.signal,
                        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ feature: 'grade_insights', kind: 'student', maxCards: 1, snapshot, gradeEvidenceKey: evidenceKey, language:window.getSigmaAiLanguage?.('insights')||'en' }) });
                    const result = await response.json();
                    if (!response.ok || !result.success || !Array.isArray(result.cards)) throw new Error(result.error || 'Subject insights unavailable.');
                    if (result.cards.length && !/^(INSG|INSC|INSGR|INSS|INSA)-\d{4}-\d{4,}$/.test(String(result.generationId || ''))) throw new Error('Subject insight was returned without a generation ID.');
                    const cards = window.SigmaInsightRules.validateCards(result, result.snapshot || snapshot);
                    const createdAt = new Date().toISOString();
                    const logId = result.generationId;
                    const card = cards[0] ? { ...cards[0], generationId: result.generationId, createdAt: result.cards[0]?.createdAt || createdAt,
                        ...(logId ? { insightSourceId: `${logId}:0` } : {}) } : null;
                    if (card) saveResult(fingerprint, card);
                    return card || 'Not enough recorded evidence for a subject insight yet.';
                } catch (error) {
                    console.warn('Grade insights unavailable:', error.message);
                    const text = 'SIGMA AI Grade Insights are unavailable. Your recorded grades are unchanged.';
                    return text;
                } finally { clearTimeout(timer); }
            };
            pending.set(fingerprint, window.navigator?.locks
                ? window.navigator.locks.request('sigma-grade-insight:' + fingerprint, generate)
                : generate());
        }
        const request = pending.get(fingerprint);
        try { show(await request); }
        finally { if (pending.get(fingerprint) === request) pending.delete(fingerprint); }
    };
    const syncDisplayedInsights = () => {
        if (document.hidden) return;
        for (const [element, evidence] of displayedInsights) {
            if (!element.isConnected) { displayedInsights.delete(element); continue; }
            if (element.getClientRects().length && element.dataset.insightFingerprint && readSaved(element.dataset.insightFingerprint)) {
                window.refreshSubjectGradeInsight(element, evidence);
            }
        }
    };
    window.addEventListener('focus', syncDisplayedInsights);
    window.addEventListener('storage', event => {
        if (event.key === cacheKey || event.key === 'sigma-ai-recorded-logs') syncDisplayedInsights();
    });
    document.addEventListener('visibilitychange', syncDisplayedInsights);
    setInterval(syncDisplayedInsights, 30000);
})();
