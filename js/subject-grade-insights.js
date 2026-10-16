(function () {
    const pending = new Map();
    const savedResults = new Map();
    const cacheKey = 'sigma-subject-grade-insights-v3';
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
        if (savedResults.has(fingerprint)) return savedResults.get(fingerprint);
        try {
            const text = JSON.parse(localStorage.getItem(cacheKey) || '{}')?.[fingerprint];
            if (text && Array.isArray(text.analyses)) { savedResults.set(fingerprint, text); return text; }
        } catch (_) {}
    }
    function saveResult(fingerprint, text) {
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
        const recordLog = values => {
            try { window.SigmaAiLogs?.record({ userId, feature: 'grade_insights', prompt: title,
                actionDescription: title, evidenceSources, timestamp: new Date().toISOString(), ...values }); }
            catch (error) { console.warn('Grade insight log could not be saved.', error); }
        };
        const language = window.getSigmaAiLanguage?.('insights') || 'en';
        const legacyFingerprint = JSON.stringify({ userId, ...evidence, language });
        const fingerprint = JSON.stringify(stableValue({ userId, ...canonicalEvidence(evidence), language }));
        element.dataset.insightFingerprint = fingerprint;
        const show = text => {
            if (element.dataset.insightFingerprint !== fingerprint || !element.isConnected) return;
            if (text && typeof text === 'object') {
                element.innerHTML = window.SigmaInsightRules.renderInsightSections(text.analyses, location.href);
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
        const saved = readSaved(fingerprint) || readSaved(legacyFingerprint);
        if (saved) { savedResults.set(fingerprint, saved); show(saved); return; }
        if (!evidence.assessments.some(row => row.score != null) && !evidence.grades.some(value => typeof value === 'number')) {
            show(overall ? 'No grades recorded yet.' : 'No grades recorded yet for this subject.'); return;
        }
        show('Loading grade insights...');
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
                    const response = await fetch(api, { method: 'POST', credentials: 'include', signal: controller.signal,
                        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ feature: 'grade_insights', kind: 'student', maxCards: 1, snapshot, language:window.getSigmaAiLanguage?.('insights')||'en' }) });
                    const result = await response.json();
                    if (!response.ok || !result.success || !Array.isArray(result.cards)) throw new Error(result.error || 'Subject insights unavailable.');
                    const cards = window.SigmaInsightRules.validateCards(result, snapshot);
                    const card = cards[0];
                    if (card) saveResult(fingerprint, card);
                    recordLog({ response: JSON.stringify(cards), model: result.model, provider: result.provider, keyId: result.keyId, keyLabel: result.keyLabel, status: result.status || 'Success' });
                    return card || 'Not enough recorded evidence for a subject insight yet.';
                } catch (error) {
                    recordLog({ response: error.message || 'Grade insights unavailable.', status: 'Failed' });
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
})();
