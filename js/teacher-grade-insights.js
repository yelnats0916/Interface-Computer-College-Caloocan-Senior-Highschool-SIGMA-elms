(function () {
    'use strict';
    const cache = new Map(), pending = new Map(), checkedAt = new Map(), settled = new Map();
    const displayed = new Map(), timers = new WeakMap(), operations = new WeakMap(), digests = new Map();
    const storageKey = 'sigma-teacher-grade-insights-v3';
    const normalize = value => String(value || '').trim().toLowerCase();
    const teacherId = () => { const user = window.getLoggedInTeacherUser?.(); return String(user?.id || user?.uid || ''); };
    function stable(value) {
        if (Array.isArray(value)) return value.map(stable).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
        if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
        return value;
    }
    async function evidenceKey(id, evidence, language) {
        const match = (value, choices) => choices.some(choice => normalize(choice) === normalize(value));
        const scopes = (window.SigmaAcademicRecords?.getPerformanceSnapshot?.().scopes || []).filter(scope =>
            match(evidence.subject, [scope.subject, scope.subjectId]) && match(evidence.section, [scope.section, scope.sectionId]));
        const subjects = (window.SigmaAssignedClassrooms?.records?.('sigma-admin-subjects') || []).filter(subject =>
            match(evidence.subject, [subject.id, subject.name, subject.title]));
        const sections = (window.SigmaAssignedClassrooms?.records?.('sigma-admin-sections') || []).filter(section =>
            match(evidence.section, [section.id, section.name, section.sectionName])).map(section => ({
                id: section.id, schoolYear: section.schoolYear, students: (section.students || []).map(student => String(student.id || student.uid || student))
            }));
        const aliases = [evidence.subject, ...scopes.map(scope => scope.subjectId)];
        const shared = Object.entries(window.SigmaGradeSync?.getSharedRecords?.().records || {}).filter(([key]) => {
            try { const scope = JSON.parse(key); return match(scope[1], [evidence.section, ...scopes.map(row => row.sectionId)]) && match(scope[2], aliases); }
            catch (_) { return false; }
        }).map(([key, record]) => [key, record, window.SigmaGradeSync?.getPublished?.(key)?.record]);
        const source = JSON.stringify(stable({ id, subject: evidence.subject, section: evidence.section, quarters: evidence.quarters, language,
            scopes: scopes.map(scope => ({ subjectId: scope.subjectId, sectionId: scope.sectionId, releases: scope.releases,
                records: (scope.records || []).filter(record => ['score', 'submission', 'teacher_feedback', 'release', 'rubric'].includes(record.type)) })), subjects, sections, shared }));
        if (digests.has(source)) return digests.get(source);
        const key = window.crypto?.subtle
            ? Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source))), byte => byte.toString(16).padStart(2, '0')).join('')
            : source;
        if (digests.size >= 16) digests.delete(digests.keys().next().value);
        digests.set(source, key); return key;
    }
    function readStored(key) {
        if (cache.has(key)) return cache.get(key);
        try {
            const card = JSON.parse(localStorage.getItem(storageKey) || '{}')[key];
            if (Array.isArray(card?.analyses) && card.analyses.length && !card.isDeleted) { cache.set(key, card); return card; }
        } catch (_) {}
        return null;
    }
    function saveStored(key, card) {
        if (card && !card.isDeleted) cache.set(key, card); else cache.delete(key);
        try {
            const stored = JSON.parse(localStorage.getItem(storageKey) || '{}');
            if (card && !card.isDeleted) stored[key] = card; else delete stored[key];
            localStorage.setItem(storageKey, JSON.stringify(stored));
        } catch (_) {}
    }
    window.refreshTeacherGradeInsight = async function (element, evidence, options = {}) {
        if (!element) return;
        clearTimeout(timers.get(element)); timers.delete(element);
        displayed.set(element, evidence);
        const operation = Symbol(); operations.set(element, operation);
        const id = teacherId(), teacher = window.getLoggedInTeacherUser?.();
        const current = () => element.isConnected && operations.get(element) === operation && teacherId() === id;
        const show = (text, state) => {
            if (!current()) return;
            element.textContent = text; element.dataset.insightEmpty = String(state !== 'ready'); element.dataset.insightState = state;
            element.style.setProperty('color', state === 'ready' ? '#000' : 'rgba(0,0,0,0.45)', 'important');
        };
        const assigned = (window.getTeacherAssignedSubjectsAndSections?.(teacher) || []).some(row =>
            normalize(row.subject) === normalize(evidence.subject) && normalize(row.sectionName) === normalize(evidence.section));
        if (!id || !assigned) { element.dataset.teacherInsightKey = ''; show('Insights unavailable for this class.', 'restricted'); return; }
        if (!evidence.quarters.some(row => Number.isFinite(row.average))) { element.dataset.teacherInsightKey = ''; show('No grades recorded yet.', 'empty'); return; }
        const language = window.getSigmaAiLanguage?.('insights') || 'en';
        const key = await evidenceKey(id, evidence, language);
        if (!current()) return;
        element.dataset.teacherInsightKey = key;
        const render = card => {
            if (!current()) return;
            if (card.isDeleted) { show('No insights recorded yet.', 'empty'); return; }
            const sourceLabel = card.generationSource === 'grade_summary' ? '<div class="text-xs text-black-fade mb-2">Grade summary · Calculated from recorded grades</div>' : '';
            element.innerHTML = sourceLabel + window.SigmaInsightRules.renderInsightSections(card.analyses, location.href) + (window.renderSigmaInsightTimestamp?.(card.createdAt) || '');
            window.restoreSigmaInsightTimestamp?.(element, card, id, current, restored => saveStored(key, restored));
            element.dataset.insightCategory = card.analyses[0].category;
            element.dataset.insightEmpty = 'false'; element.dataset.insightState = 'ready'; element.style.setProperty('color', '#000', 'important');
        };
        const showResult = result => {
            if (result?.analyses) { render(result); return; }
            show(result?.error ? 'Class insights are unavailable. Please try again.' : 'Not enough evidence for an insight yet.', result?.error ? 'error' : 'empty');
            if (result?.error && current()) {
                const retry = document.createElement('button'); retry.type = 'button'; retry.textContent = 'Refresh'; retry.className = 'sigma-retry-link'; retry.style.marginInlineStart = '8px';
                retry.onclick = () => window.refreshTeacherGradeInsight(element, evidence, { retry: true, revalidate: true }); element.append(retry);
            }
        };
        if (options.retry) { settled.delete(key); checkedAt.delete(key); }
        const cached = readStored(key);
        if (cached) {
            render(cached);
            if (!options.revalidate) {
                if (Date.now() - (checkedAt.get(key) || 0) > 30000 && !pending.has(key)) {
                    checkedAt.set(key, Date.now());
                    setTimeout(() => { if (current()) window.refreshTeacherGradeInsight(element, evidence, { revalidate: true }); }, 0);
                }
                return;
            }
        }
        if (!options.revalidate && settled.has(key) && Date.now() - (checkedAt.get(key) || 0) < 30000) { showResult(settled.get(key)); return; }
        if (!cached && !options.revalidate) { show('', 'loading'); window.SigmaContentLoading.render(element, { compact: true, label: 'Loading class insights' }); }
        if (!pending.has(key)) pending.set(key, (async () => {
            const api = location.port && !['80', '443'].includes(location.port) ? 'http://localhost/sigma-elms/php/api/analytics_ai.php'
                : new URL(location.pathname.includes('/php/') ? 'api/analytics_ai.php' : 'php/api/analytics_ai.php', location.href).href;
            const snapshot = { teacherId: id, scope: 'class', areas: [{ id: 'class-grades', records: [{ id: 'class-summary', subjectId: evidence.subject, sectionId: evidence.section }] }] };
            try {
                const response = await window.SigmaDatabase.fetch(api, { method: 'POST', credentials: 'include', foreground: true, autoReconnect: false,
                    timeoutMs: 15000, signal: AbortSignal.timeout(15000), headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ feature: 'grade_insights', kind: 'teacher', maxCards: 1, snapshot, gradeEvidenceKey: key, language }) });
                const result = await response.json();
                if (!response.ok || !result.success || !Array.isArray(result.cards)) throw new Error('Class insights unavailable.');
                if (['pending', 'processing'].includes(result.state)) return { pending: true, reason: result.reason, retryAfter: Number(result.retryAfter) || 5 };
                if (result.state === 'failed') throw new Error('The background insight could not be prepared.');
                if (result.cards.length && result.generationSource !== 'grade_summary' && !/^(INSG|INSC|INSGR|INSS|INSA)-\d{4}-\d{4,}$/.test(String(result.generationId || ''))) throw new Error('Class insight was returned without a generation ID.');
                const cards = window.SigmaInsightRules.validateCards(result, result.snapshot || snapshot);
                const card = cards[0] ? { ...cards[0], generationSource: result.generationSource, generationId: result.generationId, createdAt: result.cards[0]?.createdAt || new Date().toISOString(),
                    ...(result.generationId ? { insightSourceId: `${result.generationId}:0` } : {}) } : null;
                saveStored(key, card); return card;
            } catch (_) { return { error: true }; }
        })());
        const request = pending.get(key);
        try {
            const result = await request;
            if (!current()) return;
            if (result?.pending) {
                show('Your updated insight is being prepared.', 'pending');
                clearTimeout(timers.get(element));
                timers.set(element, setTimeout(() => {
                    timers.delete(element);
                    if (current() && !document.hidden) window.refreshTeacherGradeInsight(element, evidence, { revalidate: true });
                }, Math.max(5, Math.min(120, result.retryAfter || 5)) * 1000));
            } else {
                checkedAt.set(key, Date.now());
                if (result?.error && cached) { render(cached); return; }
                if (!result?.analyses) settled.set(key, result);
                showResult(result);
            }
        } finally { if (pending.get(key) === request) pending.delete(key); }
    };
    function syncDisplayed() {
        if (document.hidden) return;
        for (const [element, evidence] of displayed) {
            if (!element.isConnected) { displayed.delete(element); continue; }
            if (!element.getClientRects().length) continue;
            if (['pending', 'rate_limited'].includes(element.dataset.insightState)) {
                if (!timers.has(element)) window.refreshTeacherGradeInsight(element, evidence, { revalidate: true });
            } else if (element.dataset.insightState === 'ready') window.refreshTeacherGradeInsight(element, evidence);
        }
    }
    window.addEventListener('focus', syncDisplayed);
    document.addEventListener('visibilitychange', syncDisplayed);
    window.addEventListener('storage', event => { if (event.key === storageKey) { cache.clear(); syncDisplayed(); } });
    setInterval(syncDisplayed, 30000);
})();
