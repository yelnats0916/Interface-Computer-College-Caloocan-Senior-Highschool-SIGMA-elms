(function () {
    const pending = new Map();
    const cacheKey = 'sigma-subject-grade-insights-v1';
    window.refreshSubjectGradeInsight = async function (element, evidence) {
        if (!element) return;
        const user = window.getLoggedInStudentUser?.();
        const userId = String(user?.uid || user?.id || '');
        if (!userId) { element.textContent = 'Sign in to view subject insights.'; return; }
        const fingerprint = JSON.stringify({ userId, ...evidence });
        element.dataset.insightFingerprint = fingerprint;
        const show = text => {
            if (element.dataset.insightFingerprint !== fingerprint || !element.isConnected) return;
            element.textContent = text;
            const empty = /^(Sign in|No grades|Loading|Not enough|SIGMA AI Subject Insights are unavailable)/.test(text);
            element.dataset.insightEmpty = String(empty);
            element.style.setProperty('color', empty ? 'rgba(0,0,0,0.45)' : '#000', 'important');
        };
        let cache = {};
        try { cache = JSON.parse(localStorage.getItem(cacheKey) || '{}'); } catch (_) {}
        if (cache[fingerprint]) { show(cache[fingerprint]); return; }
        if (!evidence.assessments.some(row => row.score != null) && !evidence.grades.some(value => typeof value === 'number')) {
            show('No grades recorded yet for this subject.'); return;
        }
        show('Loading subject insights...');
        if (!pending.has(fingerprint)) pending.set(fingerprint, (async () => {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 130000);
            try {
                const api = location.port && !['80', '443'].includes(location.port)
                    ? 'http://localhost/sigma-elms/php/api/analytics_ai.php'
                    : new URL('php/api/analytics_ai.php', location.href).href;
                const snapshot = { studentId: userId, areas: [{ id: 'subject-grades', records: [{ id: 'subject-summary', ...evidence }] }] };
                const response = await fetch(api, { method: 'POST', credentials: 'include', signal: controller.signal,
                    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ feature: 'grade_insights', kind: 'student', maxCards: 1, snapshot }) });
                const result = await response.json();
                if (!response.ok || !result.success || !Array.isArray(result.cards)) throw new Error(result.error || 'Subject insights unavailable.');
                const text = result.cards.flatMap(card => card.analyses || []).map(a => [a.context, a.text].filter(Boolean).join(' ')).join('\n') || 'Not enough recorded evidence for a subject insight yet.';
                try { const latest = JSON.parse(localStorage.getItem(cacheKey) || '{}'); latest[fingerprint] = text; localStorage.setItem(cacheKey, JSON.stringify(latest)); } catch (_) {}
                window.SigmaAiLogs?.record({ userId, role: 'student', feature: 'grade_insights', actionDescription: `Subject grades: ${evidence.subject} (${evidence.quarter})`, timestamp: new Date().toISOString(), model: result.model, provider: result.provider, keyId: result.keyId, keyLabel: result.keyLabel, status: result.status || 'Success' });
                return text;
            } catch (error) {
                window.SigmaAiLogs?.record({ userId, role: 'student', feature: 'grade_insights', actionDescription: `Subject grades unavailable: ${evidence.subject}`, timestamp: new Date().toISOString(), status: 'Failed' });
                return 'SIGMA AI Subject Insights are unavailable. Your recorded grades are unchanged.';
            } finally { clearTimeout(timer); }
        })());
        show(await pending.get(fingerprint));
    };
})();
