(function () {
    'use strict';
    let queue = Promise.resolve(), revision = 0;
    const actor = () => { try { return JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}'); } catch { return {}; } };
    const role = () => String(actor().role || '').toLowerCase().replace(/[\s_-]/g, '');
    const staff = () => ['teacher', 'admin', 'masteradmin', 'administrator'].includes(role());
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
        return save({ ...input, type: 'submission', text: complete && text.length <= 60000 ? text : '', attemptIdentity: window.SigmaSubmissionAi.identity(submission) });
    }
    function clearTeacherFeedback() {
        const context = window._sigmaSubmissionFeedbackContext;
        if (!staff() || !context || context.attemptPage !== 1) return;
        save({ type: 'teacher_feedback', subjectId: context.subjectId, section: context.section,
            studentId: context.studentId, itemId: context.assessmentId, attemptIdentity: context.identity, text: '', cleared: true }).catch(() => {});
    }
    window.SigmaAcademicRecords = { clearTeacherFeedback, save, request, submit, flush: () => queue, actor, role };
    window.addEventListener('sigma:release-config-updated', event => {
        if (!staff()) return;
        const { prefix, subjectId, section, config } = event.detail || {};
        const category = { sigma_topic_release: 'topics', sigma_learning_release: 'learning', sigma_assessment_release: 'assessments' }[prefix];
        if (category) save({ type: 'release', category, subjectId, section, config }).catch(() => {});
    });
    window.addEventListener('sigma:attendance-changed', event => {
        if (!staff()) return;
        const { classroomKey, dateString, statuses } = event.detail || {};
        const [section, subjectId] = String(classroomKey || '').split('::');
        if (section && subjectId && statuses) save({ type: 'attendance', subjectId, section, date: dateString, statuses }).catch(() => {});
    });
})();
