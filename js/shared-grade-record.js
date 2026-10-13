(function () {
    'use strict';
    const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const storageKey = 'sigma-grade-record-preview-v1';
    const quarterName = quarter => `${['1st', '2nd', '3rd', '4th'][quarter - 1] || quarter} Quarter`;
    const routeContextKey = 'sigma-share-record-route-v1';
    const isRecordRoute = () => /^#(?:grades|school-grades):gradebook:share-record$/.test(window.location.hash);
    const read = () => JSON.parse(localStorage.getItem(storageKey) || '{}');
    const storedList = key => {
        try { const value = window.getStoredJson ? window.getStoredJson(key, []) : JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value : []; }
        catch (_) { return []; }
    };
    const adviserName = selected => {
        const normalize = value => String(value || '').trim().toLowerCase();
        const sections = ['sigma-admin-sections', 'sigma-sections-list', 'sigma-admin-sections-v1', 'sigma-sections'].flatMap(storedList);
        const section = sections.find(item => normalize(item.name || item.sectionName) === normalize(selected.sectionName) && (!selected.grade || !item.grade || normalize(item.grade) === normalize(selected.grade)));
        if (!section) return 'Not assigned';
        const adviser = section.adviser;
        const displayName = user => user?.fullName || user?.name || [user?.firstName, user?.middleName, user?.lastName].filter(Boolean).join(' ');
        if (adviser && typeof adviser === 'object' && displayName(adviser)) return displayName(adviser);
        const identity = [section.adviserId, section.adviserUid, section.adviserEmail, typeof adviser === 'string' ? adviser : adviser?.id || adviser?.uid].filter(Boolean).map(normalize);
        const user = ['sigma-admin-users', 'sigma-users-list'].flatMap(storedList).find(user => [user.id, user.uid, user.email, displayName(user)].some(value => value && identity.includes(normalize(value))));
        return displayName(user) || section.adviserName || (typeof adviser === 'string' && !identity.slice(0, -1).includes(normalize(adviser)) ? adviser : '') || 'Not assigned';
    };

    window.openSharedGradeRecord = function () {
        const state = window.sigmaGradesState;
        const host = document.getElementById('admin-gradebook-workspace-content');
        if (!state?.selectedSubjectSection || !host) return;
        const previous = state.currentView;
        try { state.currentView = 'overview'; window.renderAdminGradebookWorkspace(); }
        finally { state.currentView = previous; }
        const snapshot = window._gradebookExportSnapshot;
        const selected = state.selectedSubjectSection;
        const sectionRecord = ['sigma-admin-sections', 'sigma-sections-list', 'sigma-admin-sections-v1', 'sigma-sections'].flatMap(storedList).find(item => String(item.name || item.sectionName || '').trim().toLowerCase() === String(selected.sectionName || '').trim().toLowerCase());
        const rawGrade = selected.grade || selected.gradeLevel || sectionRecord?.grade || sectionRecord?.gradeLevel;
        const gradeLabel = rawGrade ? (/^grade\s/i.test(String(rawGrade)) ? String(rawGrade) : `Grade ${rawGrade}`) : 'Grade not specified';
        if (!snapshot || snapshot.subject !== selected.subject || snapshot.section !== selected.sectionName || Number(snapshot.quarter) !== Number(state.activeQuarter || 1)) {
            window.renderAdminGradebookWorkspace();
            return;
        }
        const sy = window.getActiveSchoolYearRecord?.() || {};
        const year = sy.yearStart && sy.yearEnd ? `${sy.yearStart}-${sy.yearEnd}` : sy.name || sy.schoolYear || sy.year || 'Not specified';
        const teacher = snapshot.teacher || {};
        const normalizeIdentity = value => String(value || '').trim().toLowerCase();
        const adviser = sectionRecord?.adviser;
        const adviserIds = [sectionRecord?.adviserId, sectionRecord?.adviserUid, sectionRecord?.adviserEmail, typeof adviser === 'object' ? adviser?.id : '', typeof adviser === 'object' ? adviser?.uid : '', typeof adviser === 'object' ? adviser?.email : ''].filter(Boolean).map(normalizeIdentity);
        const teacherIds = [teacher.id, teacher.uid, teacher.email].filter(Boolean).map(normalizeIdentity);
        const teacherName = normalizeIdentity(teacher.fullName || teacher.name || [teacher.firstName, teacher.middleName, teacher.lastName].filter(Boolean).join(' '));
        const isSectionAdviser = adviserIds.length && teacherIds.length
            ? adviserIds.some(id => teacherIds.includes(id))
            : Boolean(teacherName && teacherName === normalizeIdentity(adviserName(selected))) || selected.role === 'Adviser';
        const actor = window.getPrivateCommentActor?.() || window.getLoggedInTeacherUser?.() || teacher;
        const notesKey = JSON.stringify(['sigma-grade-personal-notes-v1', actor.id || actor.uid || actor.email || actor.name, year, snapshot.subject, snapshot.section, snapshot.quarter]);
        let personalNote = '';
        const commentsKey = JSON.stringify(['sigma-grade-comments-local-v1', actor.id || actor.uid || actor.email || actor.name, year, snapshot.subject, snapshot.section, snapshot.quarter]);
        let comments = [];
        try { comments = JSON.parse(localStorage.getItem(commentsKey) || '[]'); if (!Array.isArray(comments)) comments = []; } catch (_) {}
        try { personalNote = localStorage.getItem(notesKey) || ''; } catch (_) {}
        const avatar = window.renderUserAvatarHtml?.(actor, 'sm') || '<div class="sigma-user-avatar sigma-user-avatar--sm"><i class="fa-solid fa-user" aria-hidden="true"></i></div>';
        const key = JSON.stringify([teacher.id || teacher.uid || teacher.email || teacher.fullName, year, snapshot.subject, snapshot.section]);
        let saved;
        try { saved = read()[key] || { quarters: {}, note: '' }; }
        catch (_) { saved = { quarters: {}, note: '' }; }
        const q = Number(snapshot.quarter);
        const quarterCount = Math.max(q, document.querySelectorAll('#admin-grades-quarters-wrapper button').length || 2);
        const rows = snapshot.rows.map(row => ({ id: String(row.student.id || row.student.uid || row.student.lrn || ''), name: row.student.name || row.student.fullName || 'Student', grade: row.quarterly }));
        const baseRoute = location.pathname.endsWith('/admin.html') ? '#school-grades:gradebook' : '#grades:gradebook';
        try { sessionStorage.setItem(routeContextKey, JSON.stringify({ selectedSubjectSection: selected, selectedTeacher: state.selectedTeacher, activeQuarter: q })); } catch (_) {}
        if (!isRecordRoute()) history.pushState({ ...history.state, type: 'tab', subTab: 'gradebook' }, '', `${baseRoute}:share-record`);
        const isDraftRow = row => {
            const previousRow = saved.quarters[q]?.find(item => item.id === row.id);
            return !previousRow || (previousRow.grade ?? null) !== (row.grade ?? null);
        };
        let dirty = rows.some(isDraftRow) || (saved.quarters[q] || []).some(item => !rows.some(row => row.id === item.id));
        const navbar = document.getElementById('admin-grades-shared-navbar');
        const pageHeader = document.getElementById('admin-grades-tab-gradebook')?.closest('.sigma-header-tab-group')?.parentElement;
        if (navbar) navbar.style.display = 'none';
        if (pageHeader) pageHeader.style.display = 'none';
        const close = () => {
            history.replaceState({ ...history.state, type: 'tab', subTab: 'gradebook' }, '', baseRoute);
            if (navbar) navbar.style.removeProperty('display');
            if (pageHeader) pageHeader.style.removeProperty('display');
            window.renderAdminGradebookWorkspace();
        };
        const render = () => {
            const navTitle = document.getElementById('nav-context-text') || document.getElementById('header-brand-title');
            if (navTitle && !document.getElementById('record-nav-title')) {
                const title = document.createElement('div');
                title.id = 'record-nav-title';
                title.innerHTML = '<span>Grades</span><strong>Share Grades</strong>';
                navTitle.after(title);
            }
            const missing = rows.filter(row => row.grade == null).length;
            host.innerHTML = `<section class="shared-grade-record">
                <div class="record-actions"><button type="button" class="sigma-btn sigma-btn-white sigma-btn-md record-back">Back</button><div><button type="button" class="sigma-btn sigma-btn-white sigma-btn-md record-share" ${dirty || !rows.length ? 'disabled' : ''} title="${dirty ? 'Update all draft grades before sharing' : 'Advisory Class is not connected yet'}">Share</button><button type="button" class="sigma-btn sigma-btn-primary sigma-btn-md record-update" ${dirty ? '' : 'disabled'}>Update</button></div></div>
                <header class="record-heading"><div class="record-context-row"><h2>${escape(snapshot.subject)}</h2><span>${escape(gradeLabel)} - ${escape(snapshot.section)}</span><span>S.Y. ${escape(year)}</span></div><p class="record-adviser"><strong>Adviser:</strong> ${escape(adviserName(selected))}</p></header>
                <div class="record-layout"><aside class="record-sidebar"><section class="record-comments record-notes"><div class="record-comments-heading"><i class="fa-solid fa-thumbtack record-notes-pin" aria-hidden="true"></i><h2>My Notes</h2></div><textarea id="record-note" aria-label="My Notes" maxlength="1000" placeholder="Write a note...">${escape(personalNote)}</textarea><p class="record-note-error" role="alert"></p></section><section class="record-comments shared-private-comments"><div class="shared-private-comments-heading record-comments-heading"><i class="fa-regular fa-comments" aria-hidden="true"></i><h2>Private Comments</h2></div><div class="sigma-comment-composer-row record-comment-row"><div class="sigma-comment-composer-avatar">${avatar}</div><div class="sigma-comment-input-pill record-comment-pill"><textarea class="sigma-comment-textarea" rows="1" maxlength="1000" aria-label="Private comment" placeholder="Add a comment..."></textarea><button type="button" class="sigma-comment-send-btn" disabled title="Adviser messaging is not connected yet" aria-label="Send private comment"><i class="fa-solid fa-paper-plane" aria-hidden="true"></i></button></div></div></section></aside>
                <main class="record-main"><div class="record-status" role="status"><span class="${dirty ? 'record-draft-label' : 'record-saved-label'}">${quarterName(q)} ${dirty ? 'Draft' : 'Updated'}</span><span>${missing ? `${missing} missing grade${missing === 1 ? '' : 's'}` : `${rows.length} of ${rows.length} grades available`}</span></div>
                <div class="record-table-scroll"><table><thead><tr><th>No.</th><th>Name</th><th>Student ID</th>${Array.from({ length: quarterCount }, (_, i) => `<th>Q${i + 1}</th>`).join('')}<th>${quarterCount === 2 ? 'Semester Grade' : 'Final Grade'}</th></tr></thead><tbody>${rows.map((row, index) => {
                    const grades = Array.from({ length: quarterCount }, (_, i) => i + 1 === q ? row.grade : saved.quarters[i + 1]?.find(item => item.id === row.id)?.grade);
                    const complete = grades.every(grade => typeof grade === 'number' && Number.isFinite(grade));
                    return `<tr><td>${index + 1}</td><td>${escape(row.name)}</td><td>${escape(row.id)}</td>${grades.map((grade, i) => `<td class="${i + 1 === q && isDraftRow(row) ? 'record-draft-cell' : ''}">${grade == null ? '<span class="record-blank gradebook-dash">-</span>' : escape(grade)}</td>`).join('')}<td>${complete ? Math.round(grades.reduce((a, b) => a + b, 0) / quarterCount) : '<span class="record-blank gradebook-dash">-</span>'}</td></tr>`;
                }).join('') || `<tr><td colspan="${quarterCount + 4}">No students in this section.</td></tr>`}</tbody></table></div><p class="record-error" role="alert"></p></main></div></section>`;
            host.querySelector('.record-table-scroll').after(host.querySelector('.record-status'));
            host.querySelectorAll('.record-main tbody tr').forEach((tr, index) => {
                const student = snapshot.rows[index]?.student;
                if (!student) return;
                const cell = tr.children[1];
                const name = document.createElement('span');
                name.textContent = cell.textContent;
                const nameDetails = document.createElement('span');
                nameDetails.className = 'record-student-details';
                const mobileId = document.createElement('span');
                mobileId.className = 'record-student-mobile-id';
                mobileId.textContent = String(student.id || student.uid || student.lrn || '');
                nameDetails.append(name, mobileId);
                const identity = document.createElement('div');
                identity.className = 'record-student-identity';
                const profile = document.createElement('span');
                profile.className = 'record-student-avatar';
                profile.innerHTML = window.renderUserAvatarHtml?.(student, 'sm') || '<span class="sigma-user-avatar sigma-user-avatar--sm"><i class="fa-solid fa-user" aria-hidden="true"></i></span>';
                identity.append(profile, nameDetails);
                cell.replaceChildren(identity);
            });
            host.querySelector('.record-main').append(host.querySelector('.record-actions'));
            host.querySelector('.record-back').onclick = close;
            host.querySelector('.record-share').onclick = () => {
                if (dirty) return;
                host.querySelector('.record-error').textContent = 'Sharing is not available yet. No grades have been sent.';
            };
            const commentPanel = host.querySelector('.shared-private-comments');
            commentPanel.hidden = isSectionAdviser;
            commentPanel.classList.add('assessment-private-comments-panel');
            if (comments.length) {
                const countBadge = document.createElement('span');
                countBadge.className = 'record-comment-count';
                countBadge.textContent = String(comments.length);
                countBadge.setAttribute('aria-label', `${comments.length} comments`);
                commentPanel.querySelector('.shared-private-comments-heading').append(countBadge);
            }
            const commentRow = commentPanel.querySelector('.record-comment-row');
            const commentHistory = document.createElement('div');
            commentHistory.className = 'record-comment-history';
            commentHistory.innerHTML = comments.map((comment, index) => `<div class="sigma-private-comment-row record-posted-comment"><div>${avatar}</div><div class="sigma-private-comment-content"><div class="sigma-private-comment-message"><div><span class="text-xs font-bold text-slate-900">${escape(comment.author)}</span><button type="button" class="sigma-comment-delete-btn" data-record-comment-index="${index}" title="Delete comment" aria-label="Delete comment"><i class="fa-regular fa-trash-can" aria-hidden="true"></i></button></div><div class="sigma-private-comment-time">${escape(new Date(comment.date).toLocaleString('en-PH', { timeZone: 'Asia/Manila' }))}</div><p>${escape(comment.text)}</p></div></div></div>`).join('');
            commentHistory.querySelectorAll('.sigma-comment-delete-btn').forEach(button => {
                button.onclick = () => {
                    const doDelete = () => {
                    const next = comments.filter((_, index) => index !== Number(button.dataset.recordCommentIndex));
                    try { localStorage.setItem(commentsKey, JSON.stringify(next)); comments = next; render(); }
                    catch (_) { host.querySelector('.record-error').textContent = 'Unable to delete the comment locally.'; }
                    };
                    if (typeof window.openAskingPanel === 'function') {
                        window.openAskingPanel({
                            title: 'Delete Comment',
                            message: 'Are you sure you want to delete this comment? This action cannot be undone.',
                            icon: 'fa-solid fa-trash-can text-red-500',
                            confirmText: 'Delete', cancelText: 'Cancel', type: 'primary',
                            onConfirm: doDelete
                        });
                    } else if (window.confirm('Delete this comment? This action cannot be undone.')) doDelete();
                };
            });
            commentRow.before(commentHistory);
            commentHistory.querySelectorAll('.record-posted-comment').forEach(row => row.classList.add('group', 'sigma-private-comment-row--own'));
            commentHistory.querySelectorAll('.sigma-private-comment-time').forEach((element, index) => {
                element.textContent = window.formatPrivateCommentTime?.(comments[index].date) || element.textContent;
            });
            commentRow.hidden = comments.length === 0;
            const addComment = document.createElement('button');
            addComment.type = 'button';
            addComment.className = 'record-add-comment';
            addComment.innerHTML = '<i class="fa-regular fa-comment" aria-hidden="true"></i><span>Add Comment</span>';
            commentRow.id = 'record-private-comment-composer';
            addComment.setAttribute('aria-controls', commentRow.id);
            addComment.setAttribute('aria-expanded', 'false');
            commentRow.before(addComment);
            addComment.hidden = comments.length > 0;
            addComment.onclick = () => {
                commentRow.hidden = false;
                addComment.setAttribute('aria-expanded', 'true');
                addComment.hidden = true;
                commentRow.querySelector('textarea').focus();
            };
            const note = host.querySelector('#record-note');
            const savedNote = document.createElement('p');
            savedNote.className = 'record-saved-note';
            savedNote.textContent = personalNote;
            savedNote.hidden = !personalNote;
            note.before(savedNote);
            note.value = '';
            const noteCounter = document.createElement('div');
            noteCounter.className = 'record-note-counter';
            noteCounter.id = 'record-note-counter';
            noteCounter.textContent = '0 / 1,000';
            note.setAttribute('aria-describedby', noteCounter.id);
            note.after(noteCounter);
            const noteEnter = document.createElement('button');
            noteEnter.type = 'button';
            noteEnter.className = 'sigma-btn sigma-btn-primary sigma-btn-md record-note-enter';
            noteEnter.textContent = 'Save Notes';
            const noteFooter = document.createElement('div');
            noteFooter.className = 'record-note-footer';
            noteFooter.append(noteEnter);
            note.after(noteFooter);
            const noteDelete = document.createElement('button');
            noteDelete.type = 'button';
            noteDelete.className = 'sigma-btn sigma-btn-white sigma-btn-md record-note-delete';
            noteDelete.textContent = 'Delete';
            noteFooter.prepend(noteDelete);
            const noteTools = document.createElement('div');
            noteTools.className = 'record-note-tools';
            host.querySelector('.record-notes .record-comments-heading').append(noteTools);
            const noteEdit = document.createElement('button');
            noteEdit.type = 'button';
            noteEdit.className = 'record-note-icon';
            noteEdit.title = 'Edit Notes';
            noteEdit.setAttribute('aria-label', 'Edit Notes');
            noteEdit.innerHTML = '<i class="fa-regular fa-pen-to-square" aria-hidden="true"></i>';
            noteDelete.className = 'record-note-icon record-note-delete';
            noteDelete.title = 'Delete Notes';
            noteDelete.setAttribute('aria-label', 'Delete Notes');
            noteDelete.innerHTML = '<i class="fa-regular fa-trash-can" aria-hidden="true"></i>';
            noteTools.append(noteEdit, noteDelete);
            noteEdit.onclick = () => noteEnter.click();
            const showNote = () => {
                note.hidden = Boolean(personalNote);
                noteCounter.hidden = Boolean(personalNote);
                savedNote.hidden = !personalNote;
                noteDelete.hidden = !personalNote;
                noteEdit.hidden = !personalNote;
                noteFooter.hidden = Boolean(personalNote);
                noteEnter.textContent = personalNote ? 'Edit Notes' : 'Save Notes';
            };
            showNote();
            noteDelete.onclick = () => {
                const remove = () => {
                    try { localStorage.removeItem(notesKey); personalNote = ''; savedNote.textContent = ''; note.value = ''; showNote(); }
                    catch (_) { host.querySelector('.record-note-error').textContent = 'Unable to delete this note locally.'; }
                };
                if (window.openAskingPanel) window.openAskingPanel({ title: 'Delete Notes', message: 'Delete this note? This action cannot be undone.', icon: 'fa-solid fa-trash-can text-red-500', confirmText: 'Delete', cancelText: 'Cancel', type: 'primary', onConfirm: remove });
                else if (window.confirm('Delete this note?')) remove();
            };
            const validateText = input => {
                const text = input.value.trim();
                const error = !text ? 'Enter text before saving.' : text.length > 1000 ? 'Use no more than 1,000 characters.' : /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text) ? 'Remove unsupported control characters.' : '';
                input.setCustomValidity(error);
                if (error) { input.reportValidity(); return null; }
                return text;
            };
            note.oninput = () => {
                note.value = note.value.slice(0, 1000);
                noteCounter.textContent = `${note.value.length.toLocaleString('en-US')} / 1,000`;
                note.setCustomValidity('');
                host.querySelector('.record-note-error').textContent = '';
            };
            noteEnter.onclick = () => {
                if (note.hidden) {
                    note.hidden = false;
                    savedNote.hidden = true;
                    noteDelete.hidden = true;
                    noteEdit.hidden = true;
                    noteFooter.hidden = false;
                    note.value = personalNote;
                    noteCounter.hidden = false;
                    noteCounter.textContent = `${note.value.length.toLocaleString('en-US')} / 1,000`;
                    noteEnter.textContent = 'Save Notes';
                    note.focus();
                    return;
                }
                const text = validateText(note);
                if (text === null) return;
                try {
                    localStorage.setItem(notesKey, text);
                    personalNote = text;
                    savedNote.textContent = text;
                    savedNote.hidden = false;
                    note.value = '';
                    showNote();
                }
                catch (_) { host.querySelector('.record-note-error').textContent = 'Unable to save this note locally.'; }
            };
            const commentInput = host.querySelector('.sigma-comment-textarea');
            const send = host.querySelector('.sigma-comment-send-btn');
            send.disabled = false;
            send.title = 'Post comment locally (not delivered to adviser)';
            send.setAttribute('aria-label', send.title);
            send.onclick = () => {
                const text = validateText(commentInput);
                if (text === null) return;
                const next = [...comments, { author: actor.fullName || actor.name || teacher.fullName || teacher.name || 'Teacher', text, date: new Date().toISOString() }];
                try { localStorage.setItem(commentsKey, JSON.stringify(next)); comments = next; render(); }
                catch (_) { host.querySelector('.record-error').textContent = 'Unable to save the comment locally.'; }
            };
            commentInput.onkeydown = event => {
                if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); send.click(); }
            };
            commentInput.oninput = event => {
                commentInput.setCustomValidity('');
                event.target.style.height = '28px';
                event.target.style.height = `${Math.min(event.target.scrollHeight, 120)}px`;
            };
            host.querySelector('.record-update').onclick = () => {
                try {
                    const all = read();
                    saved = { ...saved, quarters: { ...saved.quarters, [q]: rows }, updatedAt: new Date().toISOString() };
                    all[key] = saved;
                    localStorage.setItem(storageKey, JSON.stringify(all));
                    dirty = false;
                    render();
                } catch (_) { host.querySelector('.record-error').textContent = 'Unable to save locally. Your draft has not been saved.'; }
            };
        };
        render();
    };
    window.restoreSharedGradeRecordRoute = function () {
        if (!isRecordRoute() || !window.sigmaGradesState || !document.getElementById('admin-gradebook-workspace-content')) return;
        try {
            const context = JSON.parse(sessionStorage.getItem(routeContextKey) || 'null');
            if (context) Object.assign(window.sigmaGradesState, context);
        } catch (_) {}
        window.openSharedGradeRecord();
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', window.restoreSharedGradeRecordRoute);
    else window.restoreSharedGradeRecordRoute();
})();
