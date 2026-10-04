(function () {
    'use strict';
    let busy = false;
    function check() {
        if (busy || !window.AssessmentsPage || !window.SigmaNotifications) return;
        const user = window.getLoggedInStudentUser?.();
        const studentId = String(user?.id || user?.uid || '');
        if (!studentId) return;
        busy = true;
        try {
            const key = `sigma-coursework-notification-state:${studentId}`;
            const raw = localStorage.getItem(key);
            const previous = raw ? JSON.parse(raw) : null;
            const next = {};
            const classes = window.getStudentSectionClassItems?.() || [];
            for (const row of window.AssessmentsPage.buildAssessmentRows('student')) {
                if (!classes.some(item => String(item.section) === String(row.section) && (String(item.id) === String(row.cardId) || String(item.id) === String(row.subjectId) || item.subject === row.subject))) continue;
                const id = JSON.stringify([row.subjectId, row.section, row.topicIdx, row.tab, row.itemIdx, row.activity]);
                const score = row.score !== null && row.score !== '' && Number.isFinite(Number(row.score)) ? Number(row.score) : null;
                const old = previous?.[id];
                const due = new Date(row.dueDate).getTime();
                const dueSoon = due > Date.now() && due - Date.now() <= 86400000 && ['not-started', 'incomplete', 'missing'].includes(row.status);
                const reminded = old?.reminded === row.dueDate;
                next[id] = { score, reminded: dueSoon ? row.dueDate : old?.reminded || null };
                const send = (type, title, body) => window.SigmaNotifications.sendToRole('student', {
                    id: `${type}:${studentId}:${id}:${type === 'due-reminder' ? due : score}`,
                    type, title, body, senderName: 'Coursework Updates', icon: 'fa-book', senderColor: '#15803d',
                    recipientId: studentId, read: false, timestamp: new Date().toISOString(),
                    assignmentScope: { section: row.section, subjectId: row.subjectId, subjectName: row.subject },
                    target: { subjectId: row.subjectId, topicIdx: row.topicIdx, tab: 'assessments', itemIdx: row.unifiedIdx, materialTitle: row.activity }
                });
                // Establish a grade baseline on first use, without announcing historical scores.
                if (previous && score !== null && score !== old?.score) send('submission-graded', 'Submission Graded', `${row.activity}: ${score}/${row.max}.`);
                if (dueSoon && !reminded) send('due-reminder', 'Upcoming Due Date', `${row.activity} is due within 24 hours.`);
            }
            localStorage.setItem(key, JSON.stringify(next));
        } catch (error) { console.warn('Unable to check coursework notifications', error); }
        finally { busy = false; }
    }
    window.addEventListener('load', check);
    window.addEventListener('storage', event => {
        if (event.key && /gradebook|assessment|submission|sigma_sub_/.test(event.key)) check();
    });
    window.addEventListener('focus', check);
    setInterval(check, 60000);
})();
