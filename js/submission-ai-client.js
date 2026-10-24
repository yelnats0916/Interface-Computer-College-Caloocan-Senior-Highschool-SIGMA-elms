(function () {
    'use strict';
    const pending = new Set();
    const hydrated = new Set();
    async function hydrate(context) {
        if (!context || !window.SigmaAcademicRecords || !context.section || !context.assessmentId) return;
        const key = [context.studentId, context.subjectId, context.section, context.assessmentId, context.identity].join(':');
        if (hydrated.has(key)) return;
        hydrated.add(key);
        try {
            const result = await window.SigmaAcademicRecords.request({ subjectId: context.subjectId, section: context.section,
                studentId: context.studentId, itemId: context.assessmentId }, true);
            let changed = false;
            for (const type of ['evaluation', 'feedback']) {
                const record = result.records?.[type];
                if (!record || record.attemptIdentity !== context.identity) continue;
                const current = type === 'feedback' ? readFeedback(context).length : readEvaluation(context.key)?.aiEvaluation;
                if (current) continue;
                save({ ...context, mode: type === 'feedback' ? 'feedback' : 'evaluation' }, record.result); changed = true;
            }
            if (changed && window._sigmaSubmissionAiContext?.identity === context.identity) {
                window._suppressSubmissionScrollToTop = true;
                try { window.switchTopicTab?.(context.tab, context.activeIdx); } finally { window._suppressSubmissionScrollToTop = false; }
            }
        } catch { hydrated.delete(key); }
    }

    const fields = ['aiSuggestedScore', 'aiCommentary', 'aiEvaluatedCriteria', 'aiEvaluation'];
    const identity = attempt => attempt?.attemptIdentity || JSON.stringify([attempt?.submittedAt || attempt?.completedAt || attempt?.submissionDate || '', attempt?.attemptNumber || '',
        (attempt?.files || []).map(file => [file.name || file.fileName || '', file.size || 0, String(file.url || file.fileUrl || '').length])]);
    const historyOf = record => Array.isArray(record?.history) && record.history.length ? record.history : (Array.isArray(record?.attempts) ? record.attempts : []);
    const feedbackRecordKey = context => 'sigma-ai-feedback:' + JSON.stringify([context.studentId, context.subjectId, context.section, context.assessmentId, context.identity]);
    const feedbackVersion = context => JSON.stringify([context.studentId, context.subjectId, context.section, context.assessmentId, context.identity, context.teacherScore, context.teacherFeedback, context.instructions,
        context.rubric.name, String(context.rubric.url || '').length, String(context.rubric.url || '').slice(-128)]);
    function evaluationRequester(context) {
        const user = context?.requestedBy || (context?.role === 'teacher' ? window.getLoggedInTeacherUser?.() : window.getLoggedInAdminUser?.());
        const name = String(user?.fullName || user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || '').trim();
        const id = String(user?.id || user?.uid || '').trim();
        return name ? { id, name } : null;
    }
    function readFeedbackRecord(context, page = 1) {
        try {
            const shared = JSON.parse(localStorage.getItem(feedbackRecordKey(context)) || 'null');
            if (shared?.aiFeedbackEvaluation?.version === feedbackVersion(context) && Array.isArray(shared.aiFeedback)) return shared;
            const record = JSON.parse(localStorage.getItem(context.key) || 'null');
            const history = historyOf(record);
            const attempt = history.length ? history[history.length - page] : record;
            const saved = attempt?.aiFeedbackEvaluation ? attempt : (page === 1 ? record : null);
            return saved?.aiFeedbackEvaluation?.version === feedbackVersion(context) && Array.isArray(saved.aiFeedback) ? saved : null;
        } catch { return null; }
    }
    const readFeedback = (context, page = 1) => readFeedbackRecord(context, page)?.aiFeedback || [];
    const readFeedbackTimestamp = (context, page = 1) => readFeedbackRecord(context, page)?.aiFeedbackEvaluation?.evaluatedAt || '';
    function readEvaluation(key, page = 1) {
        try {
            const record = JSON.parse(localStorage.getItem(key) || 'null');
            const history = historyOf(record);
            const attempt = history.length ? history[history.length - page] : record;
            const evaluation = attempt?.aiEvaluation ? attempt : (page === 1 ? record : null);
            if (evaluation?.aiEvaluation?.attemptIdentity === identity(attempt)) return Object.fromEntries(fields.map(field => [field, evaluation[field]]));
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
        const record = JSON.parse(localStorage.getItem(context.key) || 'null') || structuredClone(context.submission);
        const history = historyOf(record);
        const index = history.findIndex(attempt => identity(attempt) === context.identity);
        if (history.length && index < 0) throw new Error('The submission changed during evaluation. Open it again and retry.');
        if (!history.length && identity(record) !== context.identity) throw new Error('The submission changed during evaluation. Open it again and retry.');
        const requester = context.mode === 'feedback' ? null : evaluationRequester(context);
        const patch = context.mode === 'feedback' ? {
            aiFeedback: result.feedback,
            aiFeedbackEvaluation: { code: result.generationId, evaluatedAt: new Date().toISOString(), model: result.model, provider: result.provider, version: feedbackVersion(context) }
        } : {
            aiSuggestedScore: result.score, aiCommentary: result.commentary, aiEvaluatedCriteria: result.criteria,
            aiEvaluation: { code: result.generationId || result.evaluationId, evaluatedAt: new Date().toISOString(), model: result.model, provider: result.provider, attemptIdentity: context.identity, ...(requester ? { requestedBy: requester } : {}) }
        };
        for (const list of [record.history, record.attempts]) {
            if (!Array.isArray(list)) continue;
            const match = list.find(attempt => identity(attempt) === context.identity);
            if (match) Object.assign(match, patch);
        }
        if (!history.length || index === history.length - 1) Object.assign(record, patch);
        localStorage.setItem(context.key, JSON.stringify(record));
        if (context.mode === 'feedback') localStorage.setItem(feedbackRecordKey(context), JSON.stringify(patch));
        return patch;
    }
    const queuedRoutes = new Set();
    const routeKey = context => [context.subjectId, context.topicIdx, context.tab, context.activeIdx].join('_');
    const stateKey = context => 'sigma-submission-ai-state:' + (context.mode || 'evaluation') + ':' + context.key + ':' + (context.mode === 'feedback' ? feedbackVersion(context) : context.identity);
    function state(context) {
        try {
            const saved = JSON.parse(localStorage.getItem(stateKey(context)) || 'null');
            if (saved?.status === 'pending' && Date.now() - saved.startedAt > 135000) {
                saved.status = 'failed';
                saved.message = 'Automatic evaluation did not complete. Check the submission files and AI connection.';
                localStorage.setItem(stateKey(context), JSON.stringify(saved));
            }
            return saved;
        } catch { return null; }
    }
    function scheduleAutomatic(context) {
        if (context?.role !== 'teacher') return;
        if (context?.isQuiz || /quiz/i.test(context?.assessmentType || context?.tab || '') || context?.submission?.quizId || context?.submission?.selectedQuizId) return;
        if (context?.role === 'admin') return;
        if (!context?.studentId || context.hasEvaluation) return;
        if (context.mode === 'feedback') {
            if (!context.submitted || !context.graded || !Number.isFinite(context.teacherScore)) return;
            if (!context.files?.length && !Object.keys(context.answers || {}).length) return;
        } else {
            if (!context.enabled) return;
            if (context.role !== 'teacher' && !queuedRoutes.has(routeKey(context))) return;
        }
        queuedRoutes.delete(routeKey(context));
        if (state(context)) return;
        localStorage.setItem(stateKey(context), JSON.stringify({ status: 'pending', startedAt: Date.now(), message: 'Evaluating submission...' }));
        setTimeout(() => window.evaluateSelectedSubmissionWithAi(null, context), 0);
    }
    window.SigmaSubmissionAi = { hydrate, readEvaluation, readFeedback, readFeedbackTimestamp, feedbackVersion, identity, save, readDocument, scheduleAutomatic, state,
        queueAfterSubmission: (subjectId, topicIdx, tab, activeIdx) => queuedRoutes.add([subjectId, topicIdx, tab, activeIdx].join('_')) };
    window.evaluateSelectedSubmissionWithAi = async function (button, suppliedContext) {
        const context = suppliedContext || window._sigmaSubmissionAiContext;
        if (context?.isQuiz || /quiz/i.test(context?.assessmentType || context?.tab || '') || context?.submission?.quizId || context?.submission?.selectedQuizId) return;
        if (!context || context.role !== 'teacher' || !context.studentId) return;
        button = button || document.createElement('button');
        const feedback = context.mode === 'feedback';
        if (feedback && (!context.submitted || !context.graded || !Number.isFinite(context.teacherScore)
            || context.hasEvaluation || readFeedback(context, context.attemptPage).length)) return;
        const pendingKey = stateKey(context);
        if (pending.has(pendingKey)) return;
        pending.add(pendingKey);
        const label = button.innerHTML;
        button.disabled = true;
        button.setAttribute('aria-busy', 'true');
        button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>Evaluating...</span>';
        const errorNode = document.getElementById(feedback ? 'sigma-ai-feedback-status' : 'submission-ai-error');
        const isCurrent = () => feedback ? window._sigmaSubmissionFeedbackContext === context : window._sigmaSubmissionAiContext === context;
        if (isCurrent() && errorNode) {
            errorNode.textContent = feedback ? 'Generating SIGMA AI Feedback...' : '';
            errorNode.hidden = !feedback;
            if (feedback) {
                const icon = errorNode.parentElement?.querySelector('i');
                if (icon) icon.className = 'fa-solid fa-spinner fa-spin text-base';
            }
        }
        let sent = false;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 130000);
        try {
            const rubricText = feedback && !context.rubric.url && !context.rubric.text ? '' : await readDocument(context.rubric);
            await window.SigmaAcademicRecords.flush();
            const evidence = { subjectId: context.subjectId, section: context.section, studentId: context.studentId,
                itemId: context.assessmentId, title: context.title, topicIdx: context.topicIdx, itemIdx: context.activeIdx,
                attemptIdentity: context.identity, criteria: context.criteria, autoSelect: context.autoSelect };
            if (rubricText) await window.SigmaAcademicRecords.save({ ...evidence, type: 'rubric', rubricUrl: context.rubric.url, text: rubricText });
            if (feedback) evidence.mode = 'feedback';
            const api = location.port && !['80', '443'].includes(location.port) ? 'http://localhost/sigma-elms/php/api/submission_ai.php'
                : new URL(location.pathname.includes('/php/') ? 'api/submission_ai.php' : 'php/api/submission_ai.php', location.href).href;
            sent = true;
            const response = await window.SigmaDatabase.fetch(api, { method: 'POST', credentials: 'include', signal: controller.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(evidence) });
            const result = await response.json();
            if (!response.ok || !result.success || (feedback ? !Array.isArray(result.feedback) || result.feedback.length < 1 || result.feedback.length > 3 : !Number.isFinite(result.score) || result.score < 0 || result.score > context.maxScore || !Array.isArray(result.criteria) || !Array.isArray(result.commentary))) throw new Error(result.error || 'AI returned an invalid evaluation.');
            const expectedId = feedback ? /^FDBK-\d{4}-\d{4,}$/ : /^EVAL-\d{4}-\d{4,}$/;
            if (!expectedId.test(String(result.generationId || result.evaluationId || ''))) throw new Error('AI completed, but no generation ID was returned. Try again.');
            save(context, result);
            localStorage.setItem(stateKey(context), JSON.stringify({ status: 'complete', message: '' }));
            if (isCurrent()) {
                const previous = window._suppressSubmissionScrollToTop;
                window._suppressSubmissionScrollToTop = true;
                try { window.switchTopicTab?.(context.tab, context.activeIdx); }
                finally { window._suppressSubmissionScrollToTop = previous; }
            }
            window.showToast?.(feedback ? 'SIGMA AI Feedback saved.' : 'AI evaluation saved for teacher review.', 'success');
        } catch (error) {
            const message = error.name === 'AbortError' ? 'AI evaluation timed out. Try again.'
                : /failed to fetch|networkerror|load failed/i.test(error.message || '')
                    ? 'Unable to connect to the AI service or read the submitted file. Please try again later.' : error.message;
            localStorage.setItem(stateKey(context), JSON.stringify({ status: 'failed', message }));
            if (isCurrent() && errorNode) {
                errorNode.textContent = feedback ? 'Feedback unavailable. Please try again.' : message;
                errorNode.title = message || '';
                errorNode.hidden = false;
                if (feedback) {
                    const icon = errorNode.parentElement?.querySelector('i');
                    if (icon) icon.className = 'fa-solid fa-circle-exclamation text-base';
                }
            }
            window.showToast?.(message, 'error');
            const user = window.getLoggedInTeacherUser?.();
            if (sent && (user?.id || user?.uid)) window.SigmaAiLogs?.record({ userId: String(user.id || user.uid), feature: feedback ? 'submission_feedback' : 'submission_evaluation', timestamp: new Date().toISOString(), prompt: context.title, response: message, status: 'Failed' });
        } finally {
            clearTimeout(timer);
            pending.delete(pendingKey);
            button.disabled = false;
            button.removeAttribute('aria-busy');
            button.innerHTML = label;
        }
    };
})();
