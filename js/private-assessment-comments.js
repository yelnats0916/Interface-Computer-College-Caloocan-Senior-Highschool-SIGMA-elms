(function () {
    'use strict';
    const key = 'sigma-private-assessment-comments-v1';
    const logsKey = 'sigma-activity-logs-v1';
    const read = name => { try { return JSON.parse(localStorage.getItem(name) || '[]'); } catch (_) { return []; } };
    const norm = value => String(value || '').toLowerCase().replace(/^grade\s*\d+\s*[-\u2013]?\s*/, '').replace(/[^a-z0-9]/g, '');
    const esc = value => String(value || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    function renderLogs() {
        if (typeof window.renderActivityLogs === 'function') {
            window.renderActivityLogs();
            return;
        }
        const body = document.querySelector('#audit-activity-view .sigma-audit-table tbody');
        if (!body) return;
        body.querySelectorAll('[data-communication-log]').forEach(row => row.remove());
        read(logsKey).slice().reverse().forEach(log => {
            const row = document.createElement('tr');
            row.dataset.communicationLog = log.id;
            row.innerHTML = `<td>${esc(log.actor)}<br><span class="text-sm text-black-fade">${esc(log.role)}</span></td><td>${esc(log.action)}<br><span class="text-sm text-black-fade">${esc([log.assessment || log.announcementId, log.section, log.subjectId, log.commentId].filter(Boolean).join(' · '))}</span></td><td>${esc(log.module)}</td><td>${esc(new Date(log.timestamp).toLocaleString())}</td>`;
            body.prepend(row);
        });
        window.SigmaLogPagination?.reset(body.closest('table'));
    }
    window.recordCommunicationActivity = function (action, context) {
        const auth = (() => { try { return JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}'); } catch (_) { return {}; } })();
        const records = read(logsKey);
        records.unshift({ id: crypto.randomUUID(), action, actorId: auth.id || auth.uid || '', actor: auth.fullName || auth.name || '', role: auth.role || '', timestamp: new Date().toISOString(), ...context });
        localStorage.setItem(logsKey, JSON.stringify(records));
        window.dispatchEvent(new Event('sigma-activity-logs-updated'));
    };
    window.addEventListener('sigma-activity-logs-updated', renderLogs);
    window.addEventListener('DOMContentLoaded', renderLogs);
    window.mountPrivateAssessmentComments = function (root) {
        const panel = root.querySelector('[data-private-comment-context]');
        if (!panel) return;
        const context = JSON.parse(panel.dataset.privateCommentContext);
        const users = read('sigma-admin-users');
        const studentAccount = users.find(u => String(u.role).toLowerCase() === 'student' && [u.id, u.uid, u.lrn, u.name, u.fullName].some(v => v && norm(v) === norm(context.studentId)));
        const student = String(studentAccount?.id || studentAccount?.uid || context.studentId || '');
        if (!student || ['All', 'student'].includes(student)) {
            panel.innerHTML = '<p class="text-sm text-black-fade">Select a student to view private comments.</p>';
            return;
        }
        const subjects = read('sigma-admin-subjects');
        const subject = subjects.find(s => [s.id, s.name].some(v => norm(v) === norm(context.subjectId)));
        const names = [context.subjectId, subject?.id, subject?.name].filter(Boolean).map(norm);
        const section = read('sigma-admin-sections').find(s => [s.name, s.sectionName, s.id].some(v => v && norm(v) === norm(context.section))
            && [s.subject, s.subjectId, s.assignedSubject].some(v => v && names.includes(norm(v))));
        const teacher = section?.teachers?.find(t => t.isPrimary) || section?.teachers?.[0] || section?.teacher;
        const teacherName = typeof teacher === 'object' ? teacher?.name || teacher?.fullName : teacher;
        const account = read('sigma-admin-users').find(u => String(u.role).toLowerCase() === 'teacher' && [u.name, u.fullName].some(v => v && norm(v) === norm(teacherName)));
        const teacherId = String(account?.id || account?.uid || section?.teacherId || teacherName || '');
        if (!teacherId) { panel.innerHTML = '<p class="text-sm text-black-fade">An assigned teacher is required for private comments.</p>'; return; }
        let auth;
        try { auth = JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}'); } catch (_) { auth = {}; }
        const role = String(auth.role || context.role).toLowerCase();
        const user = role === 'student' ? window.getLoggedInStudentUser?.() || auth : role === 'teacher' ? window.getLoggedInTeacherUser?.() || auth : auth;
        const id = String(user.id || user.uid || user.lrn || '');
        const allowed = role === 'admin' || (role === 'student' && [id, user.lrn].some(v => v && [student, studentAccount?.lrn].some(s => s && norm(v) === norm(s))))
            || (role === 'teacher' && (norm(id) === norm(teacherId) || [user.name, user.fullName].some(v => v && norm(v) === norm(teacherName))));
        if (!allowed) { panel.innerHTML = ''; return; }
        const thread = JSON.stringify([subject?.id || context.subjectId, context.section, context.quarter, context.assessmentId, student, teacherId]);
        try {
            const legacy = JSON.parse(panel.dataset.legacyComments || '[]');
            const records = read(key);
            let changed = false;
            legacy.forEach((message, index) => {
                const text = message.text || message.comment;
                const legacyId = `legacy:${thread}:${message.id || index}`;
                if (!text || message.isDeleted || records.some(m => m.id === legacyId)) return;
                records.push({ id: legacyId, thread, text, author: message.author || message.authorName || 'User', authorId: String(message.authorId || ''), timestamp: message.timestamp || message.createdAt || new Date().toISOString() });
                changed = true;
            });
            if (changed) localStorage.setItem(key, JSON.stringify(records));
        } catch (_) {}
        function render() {
            const messages = read(key).filter(message => message.thread === thread);
            panel.innerHTML = `<h3 class="text-sm font-bold mb-3">Private Comments</h3><div class="private-comment-messages">${messages.map(m => `<div class="py-3 border-b border-slate-100"><strong>${esc(m.author)}</strong> <span class="text-xs text-black-fade">${esc(new Date(m.timestamp).toLocaleString())}</span><p class="text-sm" style="white-space:pre-wrap;overflow-wrap:anywhere">${esc(m.text)}</p>${m.authorId === id ? `<button type="button" data-edit="${m.id}" class="sigma-btn sigma-btn-white">Edit</button> <button type="button" data-delete="${m.id}" class="sigma-btn sigma-btn-white">Delete</button>` : ''}</div>`).join('')}</div><form class="mt-3 flex gap-2" style="align-items:flex-start"><textarea aria-label="Private comment" class="sigma-input" rows="2" maxlength="1000" required style="flex:1;min-width:0;resize:vertical"></textarea><button type="submit" class="sigma-btn sigma-btn-primary" aria-label="Post comment" title="Post comment"><i class="fa-solid fa-paper-plane" aria-hidden="true"></i></button></form>`;
            panel.querySelector('form').onsubmit = event => {
                event.preventDefault();
                const text = panel.querySelector('textarea').value.trim();
                if (!text) return;
                const records = read(key);
                const message = { id: crypto.randomUUID(), thread, text, authorId: id, author: user.fullName || user.name || role, timestamp: new Date().toISOString() };
                records.push(message);
                localStorage.setItem(key, JSON.stringify(records));
                window.recordCommunicationActivity('Comment posted', { ...context, teacherId, commentId: message.id, module: 'Assessment Comments' });
                render();
            };
            panel.querySelectorAll('[data-delete], [data-edit]').forEach(button => button.onclick = () => {
                const records = read(key);
                const message = records.find(m => m.id === (button.dataset.delete || button.dataset.edit) && m.thread === thread && m.authorId === id);
                if (!message) return;
                if (button.dataset.edit) {
                    const text = window.prompt('Edit comment', message.text);
                    if (!text?.trim() || text.trim() === message.text) return;
                    message.text = text.trim().slice(0, 1000);
                } else if (!window.confirm('Delete this comment?')) return;
                localStorage.setItem(key, JSON.stringify(button.dataset.delete ? records.filter(m => m !== message) : records));
                window.recordCommunicationActivity(button.dataset.delete ? 'Comment deleted' : 'Comment edited', { ...context, teacherId, commentId: message.id, module: 'Assessment Comments' });
                render();
            });
        }
        render();
    };
    window.addEventListener('storage', event => {
        if (event.key === key) window.mountPrivateAssessmentComments(document);
        if (event.key === logsKey) renderLogs();
    });
})();
