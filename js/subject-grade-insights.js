(function () {
    const pending = new Map();
    const checkedAt = new Map();
    const savedResults = new Map();
    const settledResults = new Map();
    const reportedViews = new Set();
    const displayedInsights = new Map();
    const retryTimers = new WeakMap();
    const cacheKey = 'sigma-subject-grade-insights-v6';
    const insightPolicyVersion = 'complete-quarter-comparison-v6';
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
        const equivalent = key => {
            try {
                const value = JSON.parse(key);
                const requested = JSON.parse(fingerprint);
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
    function buildImmediateGradeSummary(evidence, overall) {
        const rows = overall ? (evidence.records || []) : [{ subject: evidence.subject || 'This subject', grades: evidence.grades || [] }];
        const grades = [];
        rows.forEach(row => (row.grades || []).forEach((grade, index) => {
            if (typeof grade === 'number' && Number.isFinite(grade)) grades.push({ subject: row.subject || evidence.subject || 'Subject', quarter: index + 1, grade });
        }));
        const quarters = new Map();
        grades.forEach(row => quarters.set(row.quarter, [...(quarters.get(row.quarter) || []), row]));
        const context = [];
        const concerns = [];
        const strengths = [];
        [...quarters.keys()].sort((a, b) => a - b).forEach(quarter => {
            const items = quarters.get(quarter);
            const average = Math.round(items.reduce((sum, item) => sum + item.grade, 0) / items.length);
            context.push(overall
                ? `Quarter ${quarter}: ${average} average across ${items.length} recorded subject grade${items.length === 1 ? '' : 's'}.`
                : `${items[0].subject} — ${average} (Quarter ${quarter}).`);
            items.filter(item => item.grade < 75).forEach(item => concerns.push(`${item.subject} — ${item.grade} (Q${quarter})`));
            items.filter(item => item.grade >= 90).forEach(item => strengths.push(`${item.subject} — ${item.grade} (Q${quarter})`));
        });
        if (!context.length) {
            const scored = (evidence.assessments || []).map(item => {
                const percent = Number.isFinite(item.averagePercent) ? item.averagePercent
                    : Number.isFinite(item.score) && Number.isFinite(item.maximumScore) && item.maximumScore > 0
                        ? 100 * item.score / item.maximumScore : null;
                return percent === null ? null : { title: item.title || item.label || 'Assessment', percent: Math.round(percent) };
            }).filter(Boolean);
            if (!scored.length) return null;
            context.push(`Recorded assessment results range from ${Math.min(...scored.map(item => item.percent))}% to ${Math.max(...scored.map(item => item.percent))}%. These are assessment results, not quarterly grades.`);
        }
        if (concerns.length) context.push(`Needs attention below 75: ${concerns.join('; ')}.`);
        if (strengths.length) context.push(`Strong results at 90 or above: ${strengths.join('; ')}.`);
        const advice = concerns.length
            ? 'Focus first on the quarter and subject areas below 75, and ask your teacher to clarify difficult topics.'
            : 'Keep reviewing the topics covered and use your next assessments to build on these results.';
        const evidenceIds = rows.map(row => row.id).filter(Boolean);
        return {
            id: 'grade-summary-' + (evidence.scope || 'subject'), area: overall ? 'overall-grades' : 'subject-grades',
            title: 'Recorded Grade Summary', icon: 'review', evidenceIds,
            generationSource: 'grade_summary', createdAt: new Date().toISOString(),
            analyses: [{ category: 'descriptive', actionLabel: 'Try', context: context.join('\n\n'), text: advice, showAdviceLabel: false }]
        };
    }
    function renderInsightAnalyses(analyses) {
        const sharedRenderer = window.SigmaInsightRules?.renderInsightSections;
        if (typeof sharedRenderer === 'function') return sharedRenderer(analyses, location.href);
        const escapeText = value => {
            const node = document.createElement('span');
            node.textContent = String(value || '');
            return node.innerHTML.replace(/\r?\n/g, '<br>');
        };
        return (Array.isArray(analyses) ? analyses : []).map(analysis =>
            [analysis?.context, analysis?.text].filter(value => typeof value === 'string' && value.trim())
                .map(escapeText).join('<br><br>')
        ).filter(Boolean).join('<br><br>');
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
    window.refreshSubjectGradeInsight = async function (element, evidence, options = {}) {
        if (!element) return;
        clearTimeout(retryTimers.get(element));
        retryTimers.delete(element);
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
        const evidenceKey = JSON.stringify(stableValue({ userId, ...canonicalEvidence(evidence), language, insightPolicyVersion }));
        const viewKey = JSON.stringify([overall ? 'overall' : 'subject', overall ? '' : evidence.subjectId || evidence.subject, evidence.sectionId || '', evidence.quarter, language]);
        element.dataset.insightFingerprint = fingerprint;
        const show = text => {
            if (element.dataset.insightFingerprint !== fingerprint || !element.isConnected) return;
            if (text && typeof text === 'object') {
                if (text?.isDeleted) {
                    delete element.dataset.insightRenderedFingerprint;
                    delete element.dataset.insightGenerationId;
                    element.innerHTML = window.renderSigmaAiText('No insights recorded yet.');
                    element.dataset.insightEmpty = 'true';
                    element.dataset.insightState = 'empty';
                    element.style.setProperty('color', 'rgba(0, 0, 0, 0.45)', 'important');
                    return;
                }
                if (element.dataset.insightRenderedFingerprint === fingerprint && element.dataset.insightGenerationId === text.generationId && text.generationId) return;
                element.dataset.insightRenderedFingerprint = fingerprint;
                element.dataset.insightGenerationId = text.generationId || '';
                const sourceLabel = text.generationSource === 'grade_summary' ? '<div class="text-xs text-black-fade mb-2">Grade summary · Calculated from recorded grades</div>' : '';
                element.innerHTML = sourceLabel + renderInsightAnalyses(text.analyses) + (window.renderSigmaInsightTimestamp?.(text.createdAt) || '');
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
                    const receipt = JSON.stringify([userId, viewKey, text.generationId]);
                    if (!reportedViews.has(receipt)) {
                        reportedViews.add(receipt);
                        window.SigmaAiDatabase?.request('ai_records', { action: 'grade_insight_view', userId, viewKey, generationId: text.generationId }).catch(() => reportedViews.delete(receipt));
                    }
                }
                window.restoreSigmaInsightTimestamp?.(element, text, userId,
                    () => element.dataset.insightFingerprint === fingerprint,
                    restored => saveResult(fingerprint, restored));
                element.dataset.insightCategory = text.analyses[0].category;
                element.dataset.insightEmpty = 'false';
                element.dataset.insightState = 'ready';
                element.style.setProperty('color', '#000', 'important');
                return;
            }
            delete element.dataset.insightRenderedFingerprint;
            delete element.dataset.insightGenerationId;
            element.innerHTML = window.renderSigmaAiText(text);
            const empty = /^(Sign in|No grades|Loading|Not enough|SIGMA AI .*Insights are unavailable)/.test(text);
            element.dataset.insightEmpty = String(empty);
            element.style.setProperty('color', empty ? 'rgba(0,0,0,0.45)' : '#000', 'important');
        };
        if (options.retry) { settledResults.delete(fingerprint); checkedAt.delete(fingerprint); options.revalidate = true; }
        let saved = readSaved(fingerprint);
        // Reuse log responses only when they identify the same complete evidence.
        if (!saved) try {
            const logs = JSON.parse(localStorage.getItem('sigma-ai-recorded-logs') || '[]');
            for (const log of Array.isArray(logs) ? logs : []) {
                if (String(log.userId) !== userId || log.feature !== 'grade_insights' || log.isDeleted
                    || !['Success', 'Fallback Used'].includes(log.status)) continue;
                // A title alone cannot prove that grades and assessment scores are unchanged.
                if (log.gradeEvidenceKey !== evidenceKey) continue;
                if (saved && Date.parse(log.timestamp) <= Date.parse(saved.createdAt)) continue;
                const cards = JSON.parse(log.response || '[]');
                const card = cards.find(item => Array.isArray(item?.analyses) && item.analyses.length);
                if (!card || !log.generationId) continue;
                saved = { ...card, generationId: log.generationId, createdAt: log.timestamp, insightSourceId: `${log.id}:${cards.indexOf(card)}` };
            }
            if (saved) saveResult(fingerprint, saved);
        } catch (_) {}
        if (saved) {
            savedResults.set(fingerprint, saved); show(saved);
            if (!options.revalidate) {
                if (Date.now() - (checkedAt.get(fingerprint) || 0) > 30000 && !pending.has(fingerprint)) {
                    checkedAt.set(fingerprint, Date.now());
                    setTimeout(() => { if (element.isConnected && element.dataset.insightFingerprint === fingerprint) window.refreshSubjectGradeInsight(element, evidence, {revalidate:true}); }, 0);
                }
                return;
            }
        }
        if (!evidence.assessments.some(row => row.score != null) && !evidence.grades.some(value => typeof value === 'number')) {
            show(overall ? 'No grades recorded yet.' : 'No grades recorded yet for this subject.'); return;
        }
        const immediateSummary = buildImmediateGradeSummary(evidence, overall);
        element.dataset.insightEmpty = 'true';
        const showResult = result => {
            show(result);
            if (typeof result === 'string' && result.startsWith('SIGMA AI Grade Insights are unavailable') && element.dataset.insightFingerprint === fingerprint && element.isConnected) {
                const retry = document.createElement('button');
                retry.type = 'button';
                retry.className = 'text-sm font-semibold text-green-700 mt-2';
                retry.style.display = 'block';
                retry.style.marginTop = '8px';
                retry.textContent = 'Try again';
                retry.onclick = () => window.refreshSubjectGradeInsight(element, evidence, { retry: true });
                element.appendChild(retry);
            }
        };
        if (!options.revalidate && settledResults.has(fingerprint) && Date.now() - (checkedAt.get(fingerprint) || 0) < 30000) { showResult(settledResults.get(fingerprint)); return; }
        delete element.dataset.insightRenderedFingerprint;
        delete element.dataset.insightGenerationId;
        if (!saved && !options.revalidate) {
            if (immediateSummary) show(immediateSummary);
            else window.SigmaContentLoading.render(element, {compact:true, label:'Loading grade insights'});
        }
        if (!pending.has(fingerprint)) {
            const generate = async () => {
                // Another tab may have finished while this tab waited for the lock.
                const existing = readSaved(fingerprint);
                if (existing && !options.revalidate) return existing;
                // One read of the prepared report; opening a page never queues generation.
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), 25000);
                try {
                    const api = location.port && !['80', '443'].includes(location.port)
                        ? 'http://localhost/sigma-elms/php/api/analytics_ai.php'
                        : new URL(location.pathname.includes('/php/') ? 'api/analytics_ai.php' : 'php/api/analytics_ai.php', location.href).href;
                    const snapshot = { studentId: userId, scope: overall ? 'overall' : 'subject', quarter: evidence.quarter,
                        areas: [{ id: overall ? 'overall-grades' : 'subject-grades', records: overall ? [] : records.map(row => ({ subjectId: row.subjectId, sectionId: row.sectionId })) }] };
                    const response = await window.SigmaDatabase.fetch(api, { method: 'POST', credentials: 'include', foreground: true, autoReconnect: false, signal: controller.signal, timeoutMs: 25000,
                        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ feature: 'grade_insights', kind: 'student', maxCards: 1, snapshot, language:window.getSigmaAiLanguage?.('insights')||'en' }) });
                    const result = await response.json();
                    if (!response.ok || !result.success || !Array.isArray(result.cards)) throw new Error(result.error || 'Subject insights unavailable.');
                    if (result.cards.length && result.generationSource !== 'grade_summary' && !/^(INSG|INSC|INSGR|INSS|INSA)-\d{4}-\d{4,}$/.test(String(result.generationId || ''))) throw new Error('Subject insight was returned without a generation ID.');
                    if (['pending','processing'].includes(result.state)) return { pending:true, reason:result.reason, retryAfter:Number(result.retryAfter)||5 };
                    if (result.state === 'failed') throw new Error('The background insight could not be prepared.');
                    const cards = typeof window.SigmaInsightRules?.validateCards === 'function'
                        ? window.SigmaInsightRules.validateCards(result, result.snapshot || snapshot) : result.cards;
                    const createdAt = new Date().toISOString();
                    const logId = result.generationId;
                    const card = cards[0] ? { ...cards[0], generationSource: result.generationSource, generationId: result.generationId, createdAt: result.cards[0]?.createdAt || createdAt,
                        ...(logId ? { insightSourceId: `${logId}:0` } : {}) } : null;
                    checkedAt.set(fingerprint, Date.now());
                    saveResult(fingerprint, card);
                    return card || immediateSummary || 'Not enough recorded evidence for a subject insight yet.';
                } catch (error) {
                    console.warn('Grade insights unavailable:', error.message);
                    return immediateSummary || 'SIGMA AI Grade Insights are unavailable. Your recorded grades are unchanged.';
                } finally { clearTimeout(timer); }
            };
            pending.set(fingerprint, window.navigator?.locks
                // Never wait behind a lock held by a stale/background mobile tab.
                // The server-side queue is idempotent, so a concurrent read is safe.
                ? window.navigator.locks.request('sigma-grade-insight:' + fingerprint, { ifAvailable: true }, generate)
                : generate());
        }
        const request = pending.get(fingerprint);
        try {
            const result = await request;
            if (result?.pending) {
                if (element.dataset.insightFingerprint !== fingerprint || !element.isConnected) return;
                if (!immediateSummary) show('Your updated insight is being prepared.');
                element.dataset.insightState = result.reason === 'provider_quota' ? 'rate_limited' : 'pending';
                clearTimeout(retryTimers.get(element));
                retryTimers.set(element, setTimeout(() => {
                    retryTimers.delete(element);
                    if (element.isConnected && element.dataset.insightFingerprint === fingerprint && !document.hidden) window.refreshSubjectGradeInsight(element, evidence, {revalidate:true});
                }, Math.max(5, Math.min(120, result.retryAfter || 5)) * 1000));
            } else {
                if (typeof result === 'string') { settledResults.set(fingerprint, result); checkedAt.set(fingerprint, Date.now()); }
                showResult(result);
            }
        }
        finally { if (pending.get(fingerprint) === request) pending.delete(fingerprint); }
    };
    const syncDisplayedInsights = () => {
        if (document.hidden) return;
        for (const [element, evidence] of displayedInsights) {
            if (!element.isConnected) { displayedInsights.delete(element); continue; }
            if (element.getClientRects().length && element.dataset.insightFingerprint) {
                if (['pending', 'rate_limited'].includes(element.dataset.insightState)) {
                    // Timers pause in hidden tabs; resume the first unresolved
                    // result on focus even when no saved card exists yet.
                    if (!retryTimers.has(element)) window.refreshSubjectGradeInsight(element, evidence, {revalidate:true});
                } else if (readSaved(element.dataset.insightFingerprint)) window.refreshSubjectGradeInsight(element, evidence);
            }
        }
    };
    window.addEventListener('focus', syncDisplayedInsights);
    window.addEventListener('storage', event => {
        if (event.key === cacheKey || event.key === 'sigma-ai-recorded-logs') {
            savedResults.clear();
            syncDisplayedInsights();
        }
    });
    document.addEventListener('visibilitychange', syncDisplayedInsights);
    setInterval(syncDisplayedInsights, 30000);
})();
