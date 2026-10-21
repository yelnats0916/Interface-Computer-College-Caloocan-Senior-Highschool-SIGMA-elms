(function () {
    'use strict';
    const read = key => { try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch (_) { return {}; } };
    const norm = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const sectionKey = value => norm(String(value || '').replace(/^(?:grade|g)\s*\d+\s*[-–]?\s*/i, ''));
    const numeric = value => (typeof value === 'number' || typeof value === 'string') && String(value).trim() !== '' && Number.isFinite(Number(value));
    const hasScore = node => node && typeof node === 'object' ? Object.values(node).some(hasScore) : numeric(node);
    const savedSection = () => {
        if (!window.isEditingSection || !window.currentEditingSectionId) return null;
        const sections = read(window.SECTIONS_STORAGE_KEY || 'sigma-admin-sections');
        return Array.isArray(sections) ? sections.find(s => String(s.id) === String(window.currentEditingSectionId)) : null;
    };

    window.getSectionSubjectActivityLock = function () {
        // Always inspect the persisted assignment, not the subject currently staged in the form.
        const section = savedSection();
        if (!section?.subject) return null;
        const subjectName = section.subject;
        const aliases = new Set();
        const addAlias = value => {
            if (!value) return;
            aliases.add(norm(value));
            aliases.add(norm(String(value).replace(/^(card[-_]|subj[-_]|gen[-_])/i, '')));
        };
        addAlias(subjectName);
        addAlias(window.resolveSubjectTopicId?.('', subjectName));
        const subjects = read(window.SUBJECTS_STORAGE_KEY || 'sigma-admin-subjects');
        if (Array.isArray(subjects)) subjects.filter(s => norm(s.name) === norm(subjectName)).forEach(s => [s.id, s.code, s.subjectId, s.cardId].forEach(addAlias));
        const matchesSubject = value => aliases.has(norm(value)) || aliases.has(norm(String(value || '').replace(/^(card[-_]|subj[-_]|gen[-_])/i, '')));
        const matchesSection = value => String(value) === String(section.id) || sectionKey(value) === sectionKey(section.name);
        const roster = new Set();
        (section.students || []).forEach(s => {
            if (typeof s === 'string') roster.add(norm(s));
            else [s.id, s.uid, s.lrn, s.studentNumber, s.name, s.fullName, [s.firstName, s.middleName, s.lastName].filter(Boolean).join(' '), [s.firstName, s.lastName].filter(Boolean).join(' ')].filter(Boolean).forEach(value => roster.add(norm(value)));
        });
        const sameYear = row => !row?.schoolYear || !section.schoolYear || norm(row.schoolYear) === norm(section.schoolYear);
        const locked = kind => ({ kind, subject: subjectName, message: 'Subject changes are unavailable because this class already has student activity.' });

        // Classroom attendance is keyed by section::subject, then date.
        for (const [key, days] of Object.entries(read('sigma-attendance-records-v1'))) {
            const [sec, subj] = key.split('::');
            if (!matchesSection(sec) || !matchesSubject(subj)) continue;
            if (Object.values(days || {}).some(day => day && sameYear(day) && (day.submitted || day.submittedAt || Object.values(day.statuses || {}).some(status => status !== null && status !== undefined && String(status).trim() !== '')))) return locked('attendance');
        }

        // Gradebook has subject -> quarter -> sec:section -> student -> category -> score.
        for (const store of ['sigma-teacher-gradebook-scores-v2', 'sigma_gradebook_scores', 'sigma_gradebook_scores_v2', 'gradebookScores', 'sigma-gradebook-scores']) {
            for (const [subject, quarters] of Object.entries(read(store))) {
                if (!matchesSubject(subject)) continue;
                for (const quarter of Object.values(quarters || {})) {
                    if (!quarter || typeof quarter !== 'object') continue;
                    const scoped = Object.keys(quarter).filter(key => key.startsWith('sec:'));
                    if (scoped.some(key => matchesSection(key.slice(4)) && hasScore(quarter[key]))) return locked('grades');
                    if (!scoped.length && Object.entries(quarter).some(([student, scores]) => roster.has(norm(student)) && hasScore(scores))) return locked('grades');
                }
            }
        }
        // Shared and published quarter records include the year, section and subject in their key.
        for (const store of ['sigma-submitted-quarter-grades-v1', 'sigma-published-quarter-grades-v1']) {
            for (const [key, record] of Object.entries(read(store))) {
                let parts;
                try { parts = JSON.parse(key); } catch (_) { continue; }
                if (!Array.isArray(parts) || !matchesSection(parts[1]) || !matchesSubject(parts[2])) continue;
                if (section.schoolYear && norm(parts[0]) !== norm(section.schoolYear)) continue;
                if (record?.rows?.some(row => numeric(row.grade))) return locked('grades');
            }
        }

        const hasActivity = row => Boolean(row && (window.studentHasTurnedInWork?.(row) || row.gradedAt || String(row.status || '').toLowerCase() === 'graded' || numeric(row.score) || numeric(row.autoScore) || row.attendance));
        const matchesRow = (row, key, student) => {
            if (!row || typeof row !== 'object' || !sameYear(row)) return false;
            const subject = row.subjectId || row.subjectName || row.subject || row.assignmentScope?.subjectId;
            const keySubject = String(key).replace(/^sigma_(?:sub|submission|quiz_result)_/, '').split(/_(?:sec_|top_|mat_|quizfile_|\d+_)/)[0];
            if (!matchesSubject(subject || keySubject)) return false;
            const sec = row.sectionId || row.section || row.sectionName || row.assignmentScope?.section;
            if (sec) return matchesSection(sec);
            const keySection = String(key).match(/_sec_(.*?)_(?:top|mat|quizfile)_/);
            if (keySection) return matchesSection(keySection[1]);
            // Legacy unscoped submissions are attributed only to students in this roster.
            return [student, row.studentId, row.studentUid, row.studentName, row.student?.id, row.student?.uid].some(value => value && roster.has(norm(value)));
        };
        const shared = window.getSharedAssessmentSubmissionsStorage?.(true) || read('sigma_student_assessment_submissions');
        for (const [student, bucket] of Object.entries(shared || {})) {
            for (const [key, row] of Object.entries(bucket || {})) {
                if (matchesRow(row, key, student) && hasActivity(row)) return locked('submissions');
            }
        }
        for (const [student, bucket] of Object.entries(read('sigma_gradebook_attendance_v1'))) {
            for (const [key, row] of Object.entries(bucket || {})) {
                const status = String(row?.status || '').trim().toLowerCase();
                if (status && status !== 'none' && matchesRow(row, key, student)) return locked('attendance');
            }
        }
        for (const key of Object.keys(localStorage)) {
            if (!/^sigma_(?:sub_|submission_|quiz_result_)/.test(key)) continue;
            const row = read(key);
            const student = key.match(/_std_(.*)$/)?.[1];
            if (matchesRow(row, key, student) && hasActivity(row)) return locked('submissions');
        }
        return null;
    };
    window.guardSectionSubjectChange = function (nextSubject) {
        const saved = savedSection();
        if (!saved || norm(saved.subject) === norm(nextSubject)) return true;
        const lock = window.getSectionSubjectActivityLock();
        if (!lock) return true;
        window.showAlertDialog?.('Subject Locked', lock.message);
        return false;
    };
    window.addEventListener('storage', event => {
        if (!window.isEditingSection || window.activeSectionSubpage) return;
        if (!event.key || /submission|sigma_sub_|quiz_result|gradebook|quarter-grades|attendance/.test(event.key)) window.renderAssignSectionOverview?.();
    });
})();
