(function () {
    'use strict';
    const pending = new Set();
    const stateMemory = new Map();
    function rememberState(key, value) { stateMemory.set(key, value); try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {} }
    const feedbackMemory = new Map();
    const evaluationMemory = new Map();
    const hydrating = new Map();
    const hydrated = new Map();
    const hydrationTimers = new Map(), nextLookupAt = new Map();
    const feedbackLoads = new Map();
    const hydrationKey = context => [context.studentId, context.subjectId, context.section, context.assessmentId, context.identity, feedbackVersion(context)].join(':');
    function feedbackLoadState(context) {
        return context ? feedbackLoads.get(hydrationKey(context)) || 'loading' : 'idle';
    }
    function applySavedRecords(context, records) {
        let evaluationChanged = false, feedbackChanged = false;
        for (const type of ['evaluation', 'feedback']) {
            if (type === 'evaluation' && (context.role === 'student' || (context.evaluationEnabled ?? context.enabled) !== true)) continue;
            const record = records?.[type];
            if (!record || record.attemptIdentity !== context.identity) continue;
            const current = type === 'feedback' ? readFeedbackRecord(context)?.aiFeedbackEvaluation
                : readEvaluation(context.key, context.attemptPage || 1, context.identity)?.aiEvaluation;
            const code = record.result?.generationId || record.result?.evaluationId;
            if (current?.code === code && code) continue;
            // A class snapshot may predate a targeted read or explicit retry.
            if (Date.parse(current?.evaluatedAt || '') > Date.parse(record.recordedAt || record.result?.evaluatedAt || '')) continue;
            save({ ...context, mode: type, feedbackPolicy: record.feedbackPolicy || 'legacy' }, { ...record.result, evaluatedAt: record.recordedAt || record.result?.evaluatedAt });
            rememberState(stateKey({ ...context, mode: type }), { status: 'complete', message: '' });
            if (type === 'feedback') feedbackChanged = true; else evaluationChanged = true;
        }
        return { evaluationChanged, feedbackChanged };
    }
    function primeSavedFeedback(context) {
        if (!context || readFeedback(context, context.attemptPage || 1).length) return;
        // The authenticated snapshot already validates the attempt, rubric, curriculum and grade revisions.
        const snapshot = window.SigmaAcademicRecords?.getSubmissionAiRecords?.(context.subjectId, context.section, context.assessmentId, context.studentId);
        if (snapshot?.records?.feedback) applySavedRecords(context, { feedback: snapshot.records.feedback });
    }
    function primeSavedResults(context) {
        if (!context?.identity || !context.submission) return null;
        const snapshot = window.SigmaAcademicRecords?.getSubmissionAiRecords?.(context.subjectId, context.section, context.assessmentId, context.studentId);
        if (!snapshot) return null;
        return applySavedRecords(context, snapshot.records);
    }
    function savedResultsReady(context) {
        return Boolean(readFeedback(context, context.attemptPage || 1).length
            && (context.role === 'student' || (context.evaluationEnabled ?? context.enabled) !== true
                || readEvaluation(context.key, context.attemptPage || 1, context.identity)?.aiEvaluation));
    }
    function refreshFeedbackPanel(context) {
        const active = window._sigmaSubmissionFeedbackContext;
        if (!active || stateKey(active) !== stateKey({ ...context, mode: 'feedback' })) return;
        const panel = document.getElementById('sigma-ai-feedback-panel');
        if (panel && window.renderSigmaAiFeedbackPanelHtml) {
            const expanded = panel.open !== false;
            const headerFocused = document.activeElement === panel.querySelector('summary');
            panel.outerHTML = window.renderSigmaAiFeedbackPanelHtml({ context: active, graded: active.graded, submitted: active.submitted, restricted: false });
            const updated = document.getElementById('sigma-ai-feedback-panel');
            if (updated) {
                updated.open = expanded;
                if (headerFocused) updated.querySelector('summary')?.focus({ preventScroll: true });
            }
            return true;
        }
        return false;
    }
    function refreshEvaluationStatus(context) {
        const active = window._sigmaSubmissionAiContext;
        if (!active || active.key !== context.key || active.identity !== context.identity
            || readEvaluation(active.key, active.attemptPage || 1, active.identity)?.aiEvaluation) return;
        const node = document.getElementById('submission-ai-error');
        if (node?.parentElement) node.parentElement.outerHTML = renderStatus(active, false);
    }
    async function hydrate(context, force = false) {
        if (!context || !window.SigmaAcademicRecords || !context.section || !context.assessmentId) return;
        const activeFeedback = window._sigmaSubmissionFeedbackContext;
        if (activeFeedback?.key === context.key && activeFeedback?.identity === context.identity) context = activeFeedback;
        const key = hydrationKey(context);
        const primed = primeSavedResults(context);
        if (!force && primed && savedResultsReady(context)) {
            clearTimeout(hydrationTimers.get(key)); hydrationTimers.delete(key); nextLookupAt.delete(key);
            feedbackLoads.set(key, 'complete');
            hydrated.set(key, Date.now());
            if (primed.feedbackChanged) refreshFeedbackPanel(context);
            if (primed.evaluationChanged && window._sigmaSubmissionAiContext?.key === context.key
                && window._sigmaSubmissionAiContext?.identity === context.identity) repaint({ ...context, mode:'evaluation' });
            return;
        }
        if (hydrating.has(key)) return hydrating.get(key);
        if (!force && Date.now() < (nextLookupAt.get(key) || 0)) return;
        if (!force && Date.now() - (hydrated.get(key) || 0) < 10000) return;
        if (state({ ...context, mode:'feedback' })?.status !== 'pending') feedbackLoads.set(key, 'loading');
        primeSavedFeedback(context);
        refreshFeedbackPanel(context);
        refreshEvaluationStatus(context);
        let readTimeout;
        const task = (async () => {
            try {
                const result = await Promise.race([
                    window.SigmaAcademicRecords.request({ subjectId: context.subjectId, section: context.section,
                        studentId: context.studentId, itemId: context.assessmentId }, true, true),
                    new Promise((_, reject) => { readTimeout = setTimeout(() => reject(new Error('Feedback read timed out.')), 20000); })
                ]);
                const { evaluationChanged, feedbackChanged } = applySavedRecords(context, result.records);
                feedbackLoads.set(key, 'complete');
                for (const mode of ['evaluation','feedback']) {
                    const modeContext = { ...context, mode };
                    const ready = mode === 'feedback' ? readFeedback(context, context.attemptPage || 1).length
                        : readEvaluation(context.key, context.attemptPage || 1, context.identity)?.aiEvaluation;
                    if (ready) {
                        rememberState(stateKey(modeContext), { status: 'complete', message: '' });
                        continue;
                    }
                    const job = result.jobs?.[mode];
                    const failed = job?.state === 'failed' && !job.pending;
                    const running = job?.pending === true || ['pending', 'processing'].includes(job?.state);
                    const waiting = running && (job.state !== 'processing' || Number(job.retryAfter) * 1000 > Date.now() + 2000);
                    const label = mode === 'feedback' ? 'feedback' : 'AI evaluation';
                    rememberState(stateKey(modeContext), { status:failed?'failed':waiting?'waiting':running?'pending':'unavailable', startedAt:Date.now(),
                        hasJob:running || failed,
                        retryAfter:job?.retryAfter || 0,
                        message:failed ? (job.error || 'AI preparation did not complete. Please try again.')
                            : waiting ? `Your ${label} is queued. It will update automatically when preparation resumes.`
                            : running ? `Preparing ${label} for this submission…`
                            : `No saved ${label} is available for this submission yet.` });
                }
                hydrated.set(key, Date.now());
                clearTimeout(hydrationTimers.get(key)); hydrationTimers.delete(key);
                const missing = ['evaluation','feedback'].filter(mode =>
                    !(mode === 'evaluation' && (context.role === 'student' || (context.evaluationEnabled ?? context.enabled) !== true))
                    && ['pending','waiting'].includes(state({ ...context, mode })?.status));
                if (missing.length) {
                    const retry = Math.max(0, ...missing.map(mode => Number(result.jobs?.[mode]?.retryAfter) || 0));
                    const delay = Math.max(2000, Math.min(120000, retry * 1000 - Date.now()));
                    nextLookupAt.set(key, Date.now() + delay);
                    hydrationTimers.set(key, setTimeout(() => {
                        hydrationTimers.delete(key);
                        const active = window._sigmaSubmissionFeedbackContext || window._sigmaSubmissionAiContext;
                        if (!document.hidden && active?.key === context.key && active.identity === context.identity) hydrate(active, true);
                    }, delay));
                } else nextLookupAt.delete(key);
                const updatedPanel = refreshFeedbackPanel(context);
                refreshEvaluationStatus(context);
                const active = window._sigmaSubmissionAiContext;
                if ((evaluationChanged || (feedbackChanged && !updatedPanel)) && active?.identity === context.identity && active?.key === context.key) {
                    const previous = window._suppressSubmissionScrollToTop;
                    window._suppressSubmissionScrollToTop = true;
                    try { window.switchTopicTab?.(context.tab, context.activeIdx, true); }
                    finally { window._suppressSubmissionScrollToTop = previous; }
                }
            } catch {
                hydrated.delete(key);
                feedbackLoads.set(key, 'failed');
                refreshFeedbackPanel(context);
                rememberState(stateKey({ ...context, mode:'evaluation' }), { status:'failed', message:'Unable to load the saved evaluation. Please try again.' });
                refreshEvaluationStatus(context);
            } finally { clearTimeout(readTimeout); hydrating.delete(key); }
        })();
        hydrating.set(key, task);
        return task;
    }

    const fields = ['aiSuggestedScore', 'aiCommentary', 'aiEvaluatedCriteria', 'aiEvaluation'];
    const wholeSuggestedScore = score => Number.isFinite(score) ? Math.round(score) : score;
    const identity = attempt => attempt?.attemptIdentity || JSON.stringify([attempt?.submittedAt || attempt?.completedAt || attempt?.submissionDate || '', attempt?.attemptNumber || '',
        (attempt?.files || []).map(file => [file.name || file.fileName || '', file.size || 0, String(file.url || file.fileUrl || '').length])]);
    const historyOf = record => Array.isArray(record?.history) && record.history.length ? record.history : (Array.isArray(record?.attempts) ? record.attempts : []);
    const feedbackRecordKey = context => 'sigma-ai-feedback:' + JSON.stringify([context.studentId, context.subjectId, context.section, context.assessmentId, context.identity]);
    const feedbackVersion = context => JSON.stringify(['submission-v1', context.studentId, context.subjectId, context.section, context.assessmentId, context.identity]);
    const legacyFeedbackContext = context => JSON.stringify([context.teacherScore, context.teacherFeedback, context.submission?.gradeRevision,
        context.submission?.gradedAt, context.rubric, context.instructions, context.maxScore]);
    function evaluationRequester(context) {
        const user = context?.requestedBy || (context?.role === 'teacher' ? window.getLoggedInTeacherUser?.() : window.getLoggedInAdminUser?.());
        const name = String(user?.fullName || user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || '').trim();
        const id = String(user?.id || user?.uid || '').trim();
        return name ? { id, name } : null;
    }
    function readFeedbackRecord(context, page = 1) {
        try {
            const shared = feedbackMemory.get(feedbackRecordKey(context)) || JSON.parse(localStorage.getItem(feedbackRecordKey(context)) || 'null');
            if (shared?.aiFeedbackEvaluation?.version === feedbackVersion(context) && Array.isArray(shared.aiFeedback)
                && (!shared.aiFeedbackEvaluation.legacyContext || shared.aiFeedbackEvaluation.legacyContext === legacyFeedbackContext(context))) return shared;
            const record = JSON.parse(localStorage.getItem(context.key) || 'null');
            const history = historyOf(record);
            const attempt = history.length ? history[history.length - page] : record;
            const saved = attempt?.aiFeedbackEvaluation ? attempt : (page === 1 ? record : null);
            return saved?.aiFeedbackEvaluation?.version === feedbackVersion(context) && !saved.aiFeedbackEvaluation.legacyContext && Array.isArray(saved.aiFeedback) ? saved : null;
        } catch { return null; }
    }
    const readFeedback = (context, page = 1) => readFeedbackRecord(context, page)?.aiFeedback || [];
    const readFeedbackTimestamp = (context, page = 1) => readFeedbackRecord(context, page)?.aiFeedbackEvaluation?.evaluatedAt || '';
    function readEvaluation(key, page = 1, expectedIdentity = '') {
        try {
            let record = evaluationMemory.get(key);
            if (!record) {
                const compact = expectedIdentity && JSON.parse(localStorage.getItem('sigma-ai-evaluation:' + JSON.stringify([key, expectedIdentity])) || 'null');
                record = compact || JSON.parse(localStorage.getItem(key) || 'null');
            }
            const history = historyOf(record);
            const attempt = history.length ? history[history.length - page] : record;
            const evaluation = attempt?.aiEvaluation ? attempt : (page === 1 ? record : null);
            if (evaluation?.aiEvaluation?.attemptIdentity === identity(attempt) && (!expectedIdentity || evaluation.aiEvaluation.attemptIdentity === expectedIdentity)) return Object.fromEntries(fields.map(field => [field, field === 'aiSuggestedScore' ? wholeSuggestedScore(evaluation[field]) : evaluation[field]]));
            return record?.aiEvaluation ? { aiSuggestedScore: null, aiCommentary: [], aiEvaluatedCriteria: [], aiEvaluation: null } : {};
        } catch { return {}; }
    }
    async function readDocument(file) {
        if (typeof file.text === 'string' && file.text.trim()) return file.text.trim();
        const url = file.url || file.fileUrl || file.dataUrl;
        if (!url) throw new Error('The file content is unavailable. Upload the actual file before evaluating.');
        const resolved = new URL(url, location.href);
        if (!['data:', 'blob:'].includes(resolved.protocol) && resolved.origin !== location.origin && !['localhost', '127.0.0.1'].includes(resolved.hostname)) throw new Error('Use a locally uploaded document for AI evaluation.');
        const response = await window.SigmaDatabase.fetch(resolved.href);
        if (!response.ok) throw new Error('Could not read the submitted file or rubric.');
        const blob = await response.blob();
        if (blob.size > 10 * 1024 * 1024) throw new Error('Use a document smaller than 10 MB.');
        const name = String(file.name || file.fileName || '').toLowerCase();
        let text;
        if (name.endsWith('.docx')) {
            if (!window.mammoth) throw new Error('The DOCX reader has not loaded. Refresh and try again.');
            text = (await window.mammoth.extractRawText({ arrayBuffer: await blob.arrayBuffer() })).value;
        } else if (name.endsWith('.pdf')) {
            if (!window.pdfjsLib) throw new Error('The PDF reader has not loaded. Refresh and try again.');
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            const pdf = await window.pdfjsLib.getDocument({ data: await blob.arrayBuffer() }).promise;
            try {
                if (pdf.numPages > 100) throw new Error('Use a PDF of at most 100 pages.');
                const pages = [];
                for (let i = 1; i <= pdf.numPages; i++) pages.push((await (await pdf.getPage(i)).getTextContent()).items.map(item => item.str).join(' '));
                text = pages.join('\n');
            } finally { await pdf.destroy(); }
        } else if (/\.(txt|csv|md)$/.test(name)) {
            text = await blob.text();
        } else throw new Error('AI evaluation supports PDF, DOCX, and text documents.');
        if (!text.trim()) throw new Error('The document has no readable text. For scanned PDFs, upload a text-readable version.');
        if (text.length > 60000) throw new Error('The document is too long for one evaluation.');
        return text.trim();
    }
    function save(context, result) {
        // The server-backed submission determines the attempt, never a stale browser copy.
        const record = structuredClone(context.submission);
        const history = historyOf(record);
        const index = history.findIndex(attempt => identity(attempt) === context.identity);
        if (history.length && index < 0) throw new Error('The submission changed during evaluation. Open it again and retry.');
        if (!history.length && identity(record) !== context.identity) throw new Error('The submission changed during evaluation. Open it again and retry.');
        const requester = context.mode === 'feedback' ? null : evaluationRequester(context);
        const patch = context.mode === 'feedback' ? {
            aiFeedback: result.feedback,
            aiFeedbackEvaluation: { code: result.generationId, evaluatedAt: result.evaluatedAt || new Date().toISOString(), model: result.model, provider: result.provider, version: feedbackVersion(context),
                ...(context.feedbackPolicy === 'legacy' ? { legacyContext: legacyFeedbackContext(context) } : {}) }
        } : {
            aiSuggestedScore: wholeSuggestedScore(result.score), aiCommentary: result.commentary, aiEvaluatedCriteria: result.criteria,
            aiEvaluation: { code: result.generationId || result.evaluationId, evaluatedAt: result.evaluatedAt || new Date().toISOString(), model: result.model, provider: result.provider, rubricBasis: result.rubricBasis || 'teacher', attemptIdentity: context.identity, ...(requester ? { requestedBy: requester } : {}) }
        };
        for (const list of [record.history, record.attempts]) {
            if (!Array.isArray(list)) continue;
            const match = list.find(attempt => identity(attempt) === context.identity);
            if (match) Object.assign(match, patch);
        }
        if (!history.length || index === history.length - 1) Object.assign(record, patch);
        if (context.mode === 'feedback') feedbackMemory.set(feedbackRecordKey(context), patch);
        else evaluationMemory.set(context.key, record);
        try {
            // Generated copies must not duplicate submitted files/history in browser storage.
            if (context.mode === 'feedback') {
                if (context.feedbackPolicy === 'legacy') localStorage.removeItem(feedbackRecordKey(context));
                else localStorage.setItem(feedbackRecordKey(context), JSON.stringify(patch));
            }
            else localStorage.setItem('sigma-ai-evaluation:' + JSON.stringify([context.key, context.identity]), JSON.stringify({ attemptIdentity:context.identity, ...patch }));
        } catch (_) { /* Saved database results remain usable when the optional browser cache is full. */ }
        return patch;
    }
    const queuedRoutes = new Set();
    const routeKey = context => [context.subjectId, context.topicIdx, context.tab, context.activeIdx].join('_');
    const stateKey = context => 'sigma-submission-ai-state-v345:' + (context.mode || 'evaluation') + ':' + context.key + ':' + (context.mode === 'feedback' ? feedbackVersion(context) : context.identity);
    function repaint(context) {
        const active = context.mode === 'feedback' ? window._sigmaSubmissionFeedbackContext : window._sigmaSubmissionAiContext;
        if (!active || stateKey(active) !== stateKey(context)) return;
        if (context.mode === 'feedback' && refreshFeedbackPanel(context)) return;
        const previous = window._suppressSubmissionScrollToTop;
        window._suppressSubmissionScrollToTop = true;
        try { window.switchTopicTab?.(context.tab, context.activeIdx, true); }
        finally { window._suppressSubmissionScrollToTop = previous; }
    }
    function updateProgress(context) {
        const feedback = context.mode === 'feedback';
        const active = feedback ? window._sigmaSubmissionFeedbackContext : window._sigmaSubmissionAiContext;
        if (!active || stateKey(active) !== stateKey(context)) return;
        const node = document.getElementById(feedback ? 'sigma-ai-feedback-status' : 'submission-ai-error');
        if (node) { node.textContent = state(context)?.message || 'Please wait…'; node.hidden = false; }
        const button = document.getElementById(feedback ? 'sigma-ai-feedback-retry' : 'submission-ai-retry');
        if (button && feedback) { button.remove(); }
        else if (button) {
            button.disabled = true;
            button.setAttribute('aria-busy', 'true');
            button.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i><span>Please wait…</span>';
        }
    }
    function state(context) {
        try {
            const saved = stateMemory.get(stateKey(context)) || JSON.parse(localStorage.getItem(stateKey(context)) || 'null');
            if (saved?.status === 'pending' && !pending.has(stateKey(context)) && Date.now() - saved.startedAt > 135000) {
                saved.status = 'failed';
                saved.message = 'Evaluation is taking longer than expected. Refresh to check the result or re-evaluate.';
                rememberState(stateKey(context), saved);
            }
            return saved;
        } catch { return null; }
    }
    function renderStatus(context, ready = false) {
        const escape = value => String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
        const status = context ? state(context) : null;
        const reading = context && feedbackLoadState(context) === 'loading';
        const waiting = !ready && !['failed', 'waiting', 'unavailable'].includes(status?.status);
        const eligible = context?.role === 'teacher' && context.enabled === true && (context.attemptPage || 1) === 1;
        const fallback = reading ? 'Loading saved AI evaluation…' : 'Preparing AI evaluation for this submission…';
        const progress = 'Preparing AI evaluation for this submission…';
        return `<div class="flex flex-wrap items-center gap-3" ${ready ? 'hidden' : ''}>
            <p id="submission-ai-error" role="status" aria-live="polite" aria-atomic="true" aria-busy="${waiting && !ready ? 'true' : 'false'}" class="text-xs text-black-fade" style="color:rgba(0,0,0,.6)" ${ready ? 'hidden' : ''}>${waiting ? '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> ' : ''}${escape(status?.message || (waiting ? progress : fallback))}</p>
            ${eligible && !ready ? `<button id="submission-ai-retry" type="button" class="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-green-700 text-sm font-semibold text-green-700" onclick="window.evaluateSelectedSubmissionWithAi(this, { ...window._sigmaSubmissionAiContext, explicitRetry: true })" ${waiting ? 'disabled aria-busy="true"' : ''}><i class="fa-solid ${waiting ? 'fa-spinner fa-spin' : 'fa-rotate-right'}" aria-hidden="true"></i><span>${waiting ? 'Please wait…' : 'Refresh &amp; Re-evaluate'}</span></button>` : ''}
        </div>`;
    }
    const scheduled = new Set();
    function scheduleAutomatic(context) {
        if (!context || context.role !== 'teacher') return;
        if ((context.attemptPage || 1) !== 1) return;
        if (context?.isQuiz || /quiz/i.test(context?.assessmentType || context?.tab || '') || context?.submission?.quizId || context?.submission?.selectedQuizId) return;
        if (context?.role === 'admin') return;
        if (!context?.studentId || context.hasEvaluation) return;
        if (context.mode === 'feedback') {
            if (!context.submitted || !context.graded || !Number.isFinite(context.teacherScore)) return;
            if (!context.files?.length && !Object.keys(context.answers || {}).length && !context.submission?.text?.trim()) return;
        } else {
            if (!context.enabled) return;
            if (context.role !== 'teacher' && !queuedRoutes.has(routeKey(context))) return;
        }
        queuedRoutes.delete(routeKey(context));
        const previous = state(context);
        if (scheduled.has(stateKey(context)) || pending.has(stateKey(context)) || (!context.explicitRetry && previous?.status === 'failed')) return;
        scheduled.add(stateKey(context));
        if (context.mode !== 'feedback') {
            // Ask the server for the saved result or queue status directly.
            // This avoids waiting on a full academic snapshot before evaluation starts.
            setTimeout(() => {
                scheduled.delete(stateKey(context));
                const saved = readEvaluation(context.key, context.attemptPage || 1, context.identity)?.aiEvaluation;
                if (saved) { rememberState(stateKey(context), { status: 'complete', message: '' }); return; }
                if (!context.explicitRetry && state(context)?.status === 'failed') return;
                window.evaluateSelectedSubmissionWithAi(null, context);
            }, 0);
            return;
        }
        setTimeout(async () => {
            // A fresh device must retrieve the existing result before starting another generation.
            try { await hydrate(context, Boolean(context.explicitRetry)); }
            finally { scheduled.delete(stateKey(context)); }
            if (feedbackLoadState(context) === 'failed') return;
            const exists = context.mode === 'feedback' ? readFeedback(context).length
                : readEvaluation(context.key, context.attemptPage || 1, context.identity)?.aiEvaluation;
            if (exists) { rememberState(stateKey(context), { status: 'complete' }); return; }
            if (!context.explicitRetry && state(context)?.status === 'failed') return;
            const currentState = state(context);
            if (!context.explicitRetry && currentState?.hasJob) {
                // Promote reconciled work when a teacher opens it, then follow
                // that durable job to completion in this view.
                if (['waiting', 'pending'].includes(currentState.status)) window.evaluateSelectedSubmissionWithAi(null, context);
                return;
            }
            // Feedback is queued on submission, never by opening or grading a page.
            if (context.mode === 'feedback' && !context.explicitRetry) return;
            // Ensure a durable job exists, then follow its real server status.
            // The endpoint reuses matching saved analysis and deduplicates jobs.
            window.evaluateSelectedSubmissionWithAi(null, context);
        }, 0);
    }
    window.addEventListener('sigma:academic-snapshot-updated', () => {
        let invalidated = false;
        for (const [key, record] of feedbackMemory) if (record.aiFeedbackEvaluation?.legacyContext) {
            feedbackMemory.delete(key); invalidated = true;
        }
        const context = window._sigmaSubmissionFeedbackContext || window._sigmaSubmissionAiContext;
        if (context) {
            if (invalidated) {
                hydrated.delete(hydrationKey(context)); nextLookupAt.delete(hydrationKey(context));
                refreshFeedbackPanel(context);
            }
            hydrate(context);
        }
    });
    setInterval(() => {
        const contexts = [window._sigmaSubmissionAiContext, window._sigmaSubmissionFeedbackContext];
        if (document.visibilityState === 'visible') {
            for (const context of contexts) if (context?.submitted || context?.identity) hydrate(context);
        }
    }, 15000);
    window.retrySubmissionFeedback = (checkOnly = false) => {
        const context = window._sigmaSubmissionFeedbackContext;
        if (!context || pending.has(stateKey(context))) return;
        const readFailed = feedbackLoadState(context) === 'failed';
        if (readFailed && context.role === 'teacher' && context.submitted && context.graded
            && Number.isFinite(context.teacherScore) && !context.hasEvaluation && !readFeedback(context, context.attemptPage || 1).length) {
            stateMemory.delete(stateKey(context));
            try { localStorage.removeItem(stateKey(context)); } catch (_) {}
            return window.evaluateSelectedSubmissionWithAi(null, { ...context, explicitRetry: true });
        }
        if (checkOnly || context.role !== 'teacher' || state(context)?.status === 'waiting') return hydrate(context, true);
        stateMemory.delete(stateKey(context));
        try { localStorage.removeItem(stateKey(context)); } catch (_) {}
        scheduleAutomatic({ ...context, explicitRetry: true });
    };
    window.SigmaSubmissionAi = { hydrate, primeSavedFeedback, primeSavedResults, feedbackLoadState, readEvaluation, readFeedback, readFeedbackTimestamp, feedbackVersion, identity, save, readDocument, scheduleAutomatic, state, renderStatus,
        queueAfterSubmission: (subjectId, topicIdx, tab, activeIdx) => queuedRoutes.add([subjectId, topicIdx, tab, activeIdx].join('_')) };
    window.evaluateSelectedSubmissionWithAi = async function (button, suppliedContext) {
        const context = suppliedContext || window._sigmaSubmissionAiContext;
        if (context?.isQuiz || /quiz/i.test(context?.assessmentType || context?.tab || '') || context?.submission?.quizId || context?.submission?.selectedQuizId) return;
        if (!context || context.role !== 'teacher' || !context.studentId) return;
        if ((context.attemptPage || 1) !== 1) return;
        if (context.mode !== 'feedback' && context.enabled !== true) return;
        button = button || document.createElement('button');
        const feedback = context.mode === 'feedback';
        if (feedback && (!context.submitted || !context.graded || !Number.isFinite(context.teacherScore)
            || context.hasEvaluation || readFeedback(context, context.attemptPage).length)) return;
        const pendingKey = stateKey(context);
        if (pending.has(pendingKey)) return;
        pending.add(pendingKey);
        rememberState(pendingKey, { status: 'pending', startedAt: Date.now(), message: feedback ? 'Loading feedback…' : 'Please wait while SIGMA AI evaluates the submitted file…' });
        const label = button.innerHTML;
        button.disabled = true;
        button.setAttribute('aria-busy', 'true');
        button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>Evaluating...</span>';
        const errorNode = document.getElementById(feedback ? 'sigma-ai-feedback-status' : 'submission-ai-error');
        const isCurrent = () => {
            const active = feedback ? window._sigmaSubmissionFeedbackContext : window._sigmaSubmissionAiContext;
            return active && stateKey(active) === stateKey(context);
        };
        if (isCurrent() && errorNode) {
            errorNode.textContent = feedback ? 'Loading feedback…' : '';
            errorNode.hidden = !feedback;
            const icon = errorNode.parentElement?.querySelector('i');
            if (icon) icon.className = 'fa-solid fa-spinner fa-spin text-base';
        }
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 125000);
        updateProgress(context);
        try {
            // The server reads the authorized saved files; browser PDF readers are not required.
            await window.SigmaAcademicRecords.flush();
            const evidence = { subjectId: context.subjectId, section: context.section, studentId: context.studentId,
                itemId: context.assessmentId, title: context.title, topicIdx: context.topicIdx, itemIdx: context.activeIdx,
                attemptIdentity: context.identity, action: context.explicitRetry ? 'retry' : 'ensure' };
            if (feedback) evidence.mode = 'feedback';
            const api = location.port && !['80', '443'].includes(location.port) ? 'http://localhost/sigma-elms/php/api/submission_ai.php'
                : new URL(location.pathname.includes('/php/') ? 'api/submission_ai.php' : 'php/api/submission_ai.php', location.href).href;
            let response, result;
            do {
                response = await window.SigmaDatabase.fetch(api, { method: 'POST', credentials: 'include', signal: controller.signal, autoReconnect: false, foreground: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(evidence) });
                try { result = await response.json(); }
                catch (_) { throw new Error('The server could not return the evaluation. Refresh to check the result or re-evaluate.'); }
                if (!response.ok || !result.success) throw new Error(result.error || 'Unable to check the evaluation. Refresh to try again.');
                if (!result.pending) break;
                rememberState(pendingKey, { status: 'pending', startedAt: Date.now(), message: feedback ? 'Loading feedback…' : result.state === 'failed'
                    ? 'The AI service is busy. Please wait while SIGMA AI retries…'
                    : result.state === 'processing' ? 'Please wait — SIGMA AI is reading and evaluating the submitted file…'
                        : 'Please wait — the submitted file is queued for evaluation…' });
                updateProgress(context);
                // Leave the durable server job running if the teacher navigates away.
                if (!isCurrent()) return;
                evidence.action = 'ensure';
                await new Promise((resolve, reject) => {
                    if (controller.signal.aborted) return reject(new DOMException('Aborted', 'AbortError'));
                    const abort = () => { clearTimeout(wait); reject(new DOMException('Aborted', 'AbortError')); };
                    const seconds = Number(result.retryAfter) - Date.now() / 1000;
                    const wait = setTimeout(() => { controller.signal.removeEventListener('abort', abort); resolve(); }, Math.max(2, Math.min(120, seconds || 2)) * 1000);
                    controller.signal.addEventListener('abort', abort, { once: true });
                });
            } while (!controller.signal.aborted);
            if (!response.ok || !result.success || (feedback ? !Array.isArray(result.feedback) || result.feedback.length < 1 || result.feedback.length > 3 : !Number.isFinite(result.score) || result.score < 0 || result.score > context.maxScore || !Array.isArray(result.criteria) || !Array.isArray(result.commentary))) throw new Error(result.error || 'AI returned an invalid evaluation.');
            const expectedId = feedback ? /^FDBK-\d{4}-\d{4,}$/ : /^EVAL-\d{4}-\d{4,}$/;
            if (!expectedId.test(String(result.generationId || result.evaluationId || ''))) throw new Error('AI completed, but no generation ID was returned. Try again.');
            save(context, result);
            rememberState(stateKey(context), { status: 'complete', message: '' });
            repaint(context);
            window.showToast?.(feedback ? 'SIGMA AI Feedback saved.' : 'AI evaluation saved for teacher review.', 'success');
        } catch (error) {
            const message = error.name === 'AbortError' ? 'Evaluation is taking longer than expected. Refresh to check the result or re-evaluate.'
                : /failed to fetch|networkerror|load failed/i.test(error.message || '')
                    ? 'Unable to connect to the AI service. Refresh to check the result or re-evaluate.' : error.message;
            rememberState(stateKey(context), { status: 'failed', message, failedAt: Date.now() });
            if (isCurrent() && errorNode) {
                errorNode.textContent = feedback ? 'Feedback unavailable. Please try again.' : message;
                errorNode.title = message || '';
                errorNode.hidden = false;
                if (feedback) {
                    const icon = errorNode.parentElement?.querySelector('i');
                    if (icon) icon.className = 'fa-solid fa-circle-exclamation text-base';
                }
            }
            if (isCurrent()) {
                const previous = window._suppressSubmissionScrollToTop;
                window._suppressSubmissionScrollToTop = true;
                try { window.switchTopicTab?.(context.tab, context.activeIdx, true); } finally { window._suppressSubmissionScrollToTop = previous; }
                if (feedback) refreshFeedbackPanel(context);
            }
            window.showToast?.(message, 'error');
            // Generation and failure reporting remain server-owned; no browser save_log request.
        } finally {
            clearTimeout(timer);
            pending.delete(pendingKey);
            button.disabled = false;
            button.removeAttribute('aria-busy');
            button.innerHTML = label;
        }
    };
})();
