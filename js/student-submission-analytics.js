(function (root) {
    'use strict';
    const normalize = value => String(value || '').trim().toLowerCase();
    const date = value => {
        if (!value) return null;
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
    };

    function collect(studentId, classes, rows) {
        const records = new Map();
        const scopes = new Map();
        for (const row of rows) {
            const enrolled = classes.find(item => normalize(item.section) && normalize(item.section) === normalize(row.section)
                && (String(item.id) === String(row.cardId) || String(item.id) === String(row.subjectId)
                    || (normalize(item.subject) && normalize(item.subject) === normalize(row.subject))));
            if (!enrolled || !row.activity || !row.subjectId) continue;
            const subjectId = String(row.subjectId);
            const sectionId = String(enrolled.section);
            const id = JSON.stringify([subjectId, sectionId, row.topicIdx, row.tab, row.itemIdx, row.activity]);
            const topicIdx = Number(row.topicIdx);
            const assessmentIdx = Number(row.unifiedIdx);
            const cardId = String(row.cardId || enrolled.id);
            const internalUrl = row.topicIdx != null && row.unifiedIdx != null
                && Number.isInteger(topicIdx) && topicIdx >= 0 && Number.isInteger(assessmentIdx) && assessmentIdx >= 0
                && /^[a-zA-Z0-9_-]+$/.test(cardId)
                ? `student.html#topic-content:${cardId}:${topicIdx}:assessments:${assessmentIdx}:submission` : null;
            records.set(id, {
                id, subjectId, sectionId, title: String(row.activity), subject: String(row.subject || enrolled.subject),
                status: String(row.status || 'not-started'),
                score: row.score !== null && row.score !== '' && Number.isFinite(Number(row.score)) ? Number(row.score) : null,
                maximumScore: row.max !== null && row.max !== '' && Number.isFinite(Number(row.max)) ? Number(row.max) : null,
                dueAt: date(row.dueDate), submittedAt: date(row.submittedOn), gradedAt: date(row.gradedOn),
                internalUrl
            });
            scopes.set(JSON.stringify([subjectId, sectionId]), { subjectId, sectionId });
        }
        return { studentId, scopes: [...scopes.values()], records: [...records.values()].sort((a, b) => a.id.localeCompare(b.id)) };
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { collect };
        return;
    }
    root.SigmaStudentAnalytics.registerArea('submissions', ({ studentId }) => {
        const user = root.getLoggedInStudentUser?.();
        if (String(user?.id || user?.uid || '') !== studentId) throw new Error('The signed-in student changed.');
        if (!root.AssessmentsPage?.buildAssessmentRows || !root.getStudentSectionClassItems) {
            throw new Error('Submission data is not available yet.');
        }
        return collect(studentId, root.getStudentSectionClassItems(), root.AssessmentsPage.buildAssessmentRows('student'));
    });
})(typeof window !== 'undefined' ? window : globalThis);
