// One-time reset explicitly requested for Juan's Task 1, Rizal, quarter 1.
(function installConfirmedTaskReset() {
    const marker = 'sigma-reset-juan-prog1-rizal-task1-20261003-v3';
    const normalize = value => String(value || '').trim().toLowerCase();
    const students = new Set(['222222', '2222222', 'std-222222', 'std-2222222', 'juan abad dela cruz', 'dela cruz, juan abad', 'dela cruz juan abad']);
    const isStudent = value => {
        const alias = normalize(value).replace(/^std[-_]/, '').replace(/_/g, ' ');
        return students.has(alias) || alias.split(/[^a-z0-9]+/).filter(Boolean).sort().join(' ') === 'abad cruz dela juan';
    };
    const isSubject = value => ['prog1', 'computer programming 1'].includes(normalize(value).replace(/^(card-|subj-)/, ''));
    const isSection = value => normalize(value).replace(/^grade\s*11\s*[-:]?\s*/, '') === 'rizal';
    const title = 'task 1 - variable declaration practice';
    const isTask = row => normalize(row?.title || row?.assessmentTitle || row?.materialTitle) === title;
    const matches = (key, row, owner) => {
        if (!row || typeof row !== 'object') return false;
        const studentMatch = isStudent(owner) || isStudent(row.studentId) || isStudent(row.studentName)
            || /(?:^|_)std_(?:2222222?|juan_abad_dela_cruz|dela_cruz_juan_abad)(?:_|$)/i.test(key)
            || /^sigma_sub_(?:2222222?|std-2222222?)_/i.test(key)
            || /(?:^|_)(?:std-)?(?:juan_abad_dela_cruz|cruz_juan_abad_dela)(?:_|$)/i.test(key);
        if (!studentMatch) return false;
        if (row.section && !isSection(row.section)) return false;
        if (row.quarter && Number(row.quarter) !== 1) return false;
        if (row.subjectId && !isSubject(row.subjectId)) return false;
        const subjectMatch = isSubject(row.subjectId) || /(?:^|_)(?:card-)?prog1(?:_|$)/i.test(key)
            || (isTask(row) && isSection(row.section) && !row.subjectId);
        const slotMatch = /(?:^|_)top_0_assessments_0(?:_|$)/i.test(key);
        return subjectMatch && (isTask(row) || (!row.title && !row.assessmentTitle && slotMatch));
    };
    const gradeKeys = ['sigma-teacher-gradebook-scores-v2', 'sigma_gradebook_scores', 'gradebookScores', 'sigma-teacher-gradebook-statuses-v2', 'sigma_gradebook_statuses', 'gradebookStatuses'];
    function resetConfirmedTask(force = false) {
    const report = { student: 'Juan Abad Dela Cruz', subject: 'Computer Programming 1', section: 'Rizal', task: 'Task 1', scoresCleared: 0, submissionsRemoved: 0, attemptRecordsRemoved: 0 };
    for (const storage of [localStorage, sessionStorage]) {
        if (!force && storage.getItem(marker)) continue;
        const updates = [];
        const removals = [];
        for (let i = 0; i < storage.length; i++) {
            const key = storage.key(i);
            if (key && /^sigma_(?:extra_)?attempts_/.test(key)
                && /(?:^|_)(?:2222222?|std-2222222?)(?:_|$)/.test(key)
                && /(?:card-)?prog1_0_assessments_0$/.test(key)) {
                removals.push(key);
                report.attemptRecordsRemoved++;
                continue;
            }
            if (!key || (!gradeKeys.includes(key) && key !== 'sigma_student_assessment_submissions' && key !== 'sigma_gradebook_attendance_v1' && !/^sigma_sub_|^sigma_submission_/.test(key))) continue;
            const raw = storage.getItem(key);
            let data;
            try { data = JSON.parse(raw); } catch (_) { continue; }
            if (!data || typeof data !== 'object') continue;
            if (gradeKeys.includes(key)) {
                for (const [subject, quarters] of Object.entries(data)) {
                    if (!isSubject(subject)) continue;
                    for (const [quarter, bucket] of Object.entries(quarters || {})) {
                        if (!['1', 'q1'].includes(normalize(quarter))) continue;
                        const roots = [bucket, ...Object.entries(bucket || {}).filter(([section]) => section.startsWith('sec:') && isSection(section.slice(4))).map(([, root]) => root)];
                        for (const root of roots) {
                            for (const [student, categories] of Object.entries(root || {})) {
                                if (!isStudent(student)) continue;
                                for (const [category, scores] of Object.entries(categories || {})) {
                                    if (!['assignment', 'assignments', 'task', 'tasks'].includes(normalize(category)) || !scores || typeof scores !== 'object') continue;
                                    if (scores['0'] !== undefined) report.scoresCleared++;
                                    delete scores['0'];
                                }
                            }
                        }
                    }
                }
                updates.push([key, JSON.stringify(data)]);
            } else if (key === 'sigma_student_assessment_submissions' || key === 'sigma_gradebook_attendance_v1') {
                for (const [student, bucket] of Object.entries(data)) {
                    if (!isStudent(student)) continue;
                    for (const [recordKey, row] of Object.entries(bucket || {})) {
                        if (matches(recordKey, row, student)) {
                            delete bucket[recordKey];
                            report.submissionsRemoved++;
                        }
                    }
                }
                updates.push([key, JSON.stringify(data)]);
            } else if (matches(key, data)) {
                removals.push(key);
                report.submissionsRemoved++;
            }
        }
        // Parse everything before modifying storage; mark complete only after all writes.
        for (const [key, value] of updates) storage.setItem(key, value);
        for (const key of removals) storage.removeItem(key);
        storage.setItem(marker, 'complete');
    }
    return report;
    }
    if (typeof window !== 'undefined') {
        window.resetJuanTask1ForTesting = function () {
            const report = resetConfirmedTask(true);
            window.invalidateTeacherGradebookCache?.();
            window.invalidateSharedAssessmentSubmissionsStorage?.();
            window._studentAssessmentDetailsCache?.clear();
            if (window._sharedAssessmentSubmissionsMemoryCache) window._sharedAssessmentSubmissionsMemoryCache = {};
            console.log('Task reset:', report);
            return report;
        };
    }
    resetConfirmedTask();
})();
