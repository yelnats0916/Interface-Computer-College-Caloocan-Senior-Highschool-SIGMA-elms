(function () {
    'use strict';
    let queue = Promise.resolve(), revision = 0, refreshing = null, syncedFor = '', snapshot = [], snapshotJson = '', applying = false;
    const pendingReleases = new Map();
    const actor = () => { try { return JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}'); } catch { return {}; } };
    const role = () => String(actor().role || '').toLowerCase().replace(/[\s_-]/g, '');
    const staff = () => ['teacher', 'admin', 'masteradmin', 'administrator'].includes(role());
    function clearSyntheticCacheRecords() {
        const synthetic = window.SigmaDatabase?.isSyntheticRecord;
        if (!synthetic) return;
        const clean = value => {
            if (!value || typeof value !== 'object') return value;
            if (Array.isArray(value)) return value.map(clean).filter(v => v !== undefined);
            // Check this node's provenance only; a fake child must not remove its real parent.
            const own = Object.fromEntries(Object.entries(value).filter(([, v]) => !v || typeof v !== 'object'));
            if (synthetic(own)) return undefined;
            return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, clean(v)]).filter(([, v]) => v !== undefined));
        };
        for (const key of Object.keys(localStorage)) {
            if (!/^(sigma-(?:admin|teacher)-subjects$|sigma-admin-sections$|sigma_student_assessment_submissions$|sigma_(?:student_quiz_file_|quiz_result_|custom_assessments)|sigma-quiz-storage-library$)/.test(key)) continue;
            try {
                const raw = localStorage.getItem(key), value = JSON.parse(raw);
                if (!synthetic(value)) continue;
                const cleaned = clean(value);
                if (cleaned === undefined) localStorage.removeItem(key);
                else localStorage.setItem(key, JSON.stringify(cleaned));
            } catch (_) { /* Unrelated or non-JSON cache entries are left intact. */ }
        }
    }
    const api = () => location.port && !['80', '443'].includes(location.port) ? 'http://localhost/sigma-elms/php/api/academic_records.php'
        : new URL('php/api/academic_records.php', location.href).href;
    async function request(input, get = false) {
        const response = await window.SigmaDatabase.fetch(api() + (get ? '?' + new URLSearchParams(input) : ''), {
            method: get ? 'GET' : 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(45000), ...(!get ? { body: JSON.stringify(input) } : {})
        });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || 'The live learning record could not be saved.');
        return result;
    }
    function report(error) {
        error.sigmaAcademicReported = true;
        const message = 'Live learning sync: ' + error.message;
        window.showToast?.(message, 'error');
        console.warn(message);
        window.dispatchEvent(new CustomEvent('sigma:academic-sync-error', { detail: message }));
    }
    function save(input) {
        const owner = String(actor().id || '');
        const task = queue.catch(() => {}).then(async () => {
            if (!owner || String(actor().id || '') !== owner) throw new Error('The signed-in account changed. Save this record again.');
            const result = await request(input);
            revision++;
            window.dispatchEvent(new CustomEvent('sigma:academic-records-saved', { detail: { type: input.type, revision } }));
            return result;
        });
        queue = task;
        task.catch(report);
        return task;
    }
    async function submit(input, submission) {
        const owner = String(actor().id || '');
        const parts = [];
        let complete = true;
        for (const file of submission.files || []) {
            try { parts.push(await window.SigmaSubmissionAi.readDocument(file)); }
            catch (error) {
                // A non-text upload still records submission status; AI evaluation will require readable work.
                complete = false;
                console.info('Submission recorded without extracted text:', error.message);
            }
        }
        if (String(actor().id || '') !== owner) throw new Error('The signed-in account changed while reading this submission.');
        const text = parts.join('\n\n');
        const fingerprint = JSON.stringify([owner, input.subjectId, input.section, input.itemId,
            (submission.files || []).map(file => [file.name, file.size, file.url])]);
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(fingerprint));
        submission.attemptIdentity ||= Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
        return save({ ...input, type: 'submission', text: complete && text.length <= 60000 ? text : '',
            files: submission.files || [], comment: submission.comment || '', attemptIdentity: submission.attemptIdentity });
    }
    function clearTeacherFeedback() {
        const context = window._sigmaSubmissionFeedbackContext;
        if (!staff() || !context || context.attemptPage !== 1) return;
        save({ type: 'teacher_feedback', subjectId: context.subjectId, section: context.section,
            studentId: context.studentId, itemId: context.assessmentId, attemptIdentity: context.identity, text: '', cleared: true }).catch(() => {});
    }
    function getRelease(prefix, subjectId, section) {
        if (!actor().id || !section || String(section).toLowerCase() === 'all') return null;
        const category = { sigma_topic_release: 'topics', sigma_learning_release: 'learning', sigma_assessment_release: 'assessments' }[prefix];
        if (!category) return null;
        const normalize = value => String(value || '').replace(/^(card|subj|gen)[-_]/i, '').replace(/^Grade\s*\d+\s*[-–]?\s*/i, '').trim().toLowerCase();
        if (staff()) for (const pending of pendingReleases.values()) {
            if (pending.owner === String(actor().id) && pending.prefix === prefix && normalize(pending.subjectId) === normalize(subjectId)
                && (String(pending.section).toLowerCase() === 'all' || normalize(pending.section) === normalize(section))) return { config: pending.config, ready: true };
        }
        const scope = snapshot.find(s => [s.subjectId, s.subject, ...(s.aliases || [])].some(v => normalize(v) === normalize(subjectId))
            && [s.sectionId, s.section].some(v => normalize(v) === normalize(section)));
        if (scope && syncedFor === String(actor().id)) return { config: scope.releases[category] || {}, ready: true };
        return role() === 'student' ? { config: {}, ready: false } : null;
    }
    function applySnapshot(result) {
        const encoded = JSON.stringify(result.scopes);
        if (syncedFor === String(result.userId) && snapshotJson === encoded) return;
        snapshot = result.scopes; snapshotJson = encoded; syncedFor = String(result.userId);
        const all = JSON.parse(localStorage.getItem('sigma_student_assessment_submissions') || '{}');
        for (const records of Object.values(all)) for (const [key, row] of Object.entries(records || {})) if (row?.serverSynced) delete records[key];
        applying = true;
        try {
            for (const scope of snapshot) {
                const submissions = new Map(scope.records.filter(r => r.type === 'submission').map(r => [r.studentId + ':' + r.itemId, { ...r.data }]));
                for (const row of scope.records.filter(r => r.type === 'score')) {
                    const key = row.studentId + ':' + row.itemId;
                    const sub = submissions.get(key) || {};
                    // A stale score from an older attempt cannot overwrite a newer submission.
                    if (sub.attemptIdentity && row.data.attemptIdentity && sub.attemptIdentity !== row.data.attemptIdentity) continue;
                    submissions.set(key, { ...sub, ...row.data, studentId: row.studentId, materialId: row.itemId,
                        teacherSaved: true, teacherEditedScore: row.data.source !== 'quiz-auto',
                        status: row.data.score == null ? (sub.status || 'Submitted') : 'Graded', isPending: row.data.score == null && !!sub.isPending });
                }
                for (const sub of submissions.values()) {
                    const id = String(sub.studentId); if (!id || !sub.materialId) continue;
                    const record = { ...sub, subjectId: scope.subjectId, section: scope.section, sectionId: scope.sectionId, schoolYear: scope.schoolYear, serverSynced: true };
                    all[id] ||= {};
                    const key = `live:${scope.sectionId}:${scope.subjectId}:${sub.materialId}`;
                    const normalize = value => String(value || '').replace(/^(card|subj|gen)[-_]/i, '').trim().toLowerCase();
                    for (const [oldKey, old] of Object.entries(all[id])) {
                        if ((old.materialId || old.assessmentId) !== record.materialId) continue;
                        if (![scope.subjectId, scope.subject, ...(scope.aliases || [])].some(v => normalize(v) === normalize(old.subjectId))) continue;
                        if (normalize(old.section) === normalize(scope.section)) all[id][oldKey] = record;
                    }
                    all[id][key] = record;
                    if (record.quizId && window.saveStudentQuizFileCopy) window.saveStudentQuizFileCopy(record);
                }
            }
            localStorage.setItem('sigma_student_assessment_submissions', JSON.stringify(all));
            window.invalidateSharedAssessmentSubmissionsStorage?.();
            for (const cache of ['_sigmaReleaseConfigCache', '_studentAssessmentReleaseStatusCache', '_studentAssessmentDetailsCache']) window[cache]?.clear?.();
            window.dispatchEvent(new CustomEvent('sigma:release-config-updated', { detail: { remote: true } }));
            window.dispatchEvent(new CustomEvent('sigma:submission-files-updated', { detail: { remote: true } }));
            window.refreshAllScorePanelsAndTables?.({ type: 'database_refresh', remote: true });
            const subject = window.currentTopicState?.subjectId;
            if (subject) {
                if (role() === 'student') window.refreshStudentTopicUIIfVisible?.(subject);
                else window.refreshTeacherTopicUIIfVisible?.(subject);
            }
        } finally { applying = false; }
    }
    function refresh() {
        const owner = String(actor().id || '');
        if (!owner || !window.SigmaDatabase) return Promise.resolve();
        if (refreshing) return refreshing;
        refreshing = queue.catch(() => {}).then(() => request({ action: 'sync' }, true)).then(result => {
            if (String(actor().id || '') === owner && String(result.userId) === owner) applySnapshot(result);
        }).finally(() => { refreshing = null; });
        return refreshing;
    }
    async function submitQuiz(input) {
        const result = await save({ ...input, type: 'quiz_attempt' });
        // Submission acknowledgement remains authoritative even if the subsequent refresh fails.
        refresh().catch(error => console.warn('Assessment refresh:', error.message));
        if (!result.submission) throw new Error('The server did not confirm this quiz submission.');
        return result.submission;
    }
    window.SigmaAcademicRecords = { clearTeacherFeedback, save, request, submit, submitQuiz, refresh, getRelease,
        isApplying: () => applying, flush: () => queue, actor, role };
    window.addEventListener('sigma:release-config-updated', event => {
        if (!staff() || event.detail?.remote) return;
        const { prefix, subjectId, section, config } = event.detail || {};
        const category = { sigma_topic_release: 'topics', sigma_learning_release: 'learning', sigma_assessment_release: 'assessments' }[prefix];
        if (category) {
            const key = prefix + ':' + subjectId + ':' + section;
            const pending = { prefix, subjectId, section, config, owner: String(actor().id) };
            pendingReleases.set(key, pending);
            save({ type: 'release', category, subjectId, section, config }).then(() => refresh()).catch(() => {
                snapshotJson = ''; refresh().catch(() => {});
            }).finally(() => {
                if (pendingReleases.get(key) === pending) pendingReleases.delete(key);
                window._sigmaReleaseConfigCache?.clear();
            });
        }
    });
    const sync = () => { clearSyntheticCacheRecords(); return refresh().catch(error => console.warn('Assessment refresh:', error.message)); };
    window.addEventListener('focus', sync);
    window.addEventListener('online', sync);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', sync); else sync();
    setInterval(() => { if (!document.hidden) sync(); }, 15000);
})();
