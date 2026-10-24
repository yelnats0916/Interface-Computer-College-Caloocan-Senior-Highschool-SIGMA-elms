(function () {
    'use strict';
    const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const storageKey = 'sigma-grade-record-preview-v1';
    const quarterName = quarter => `${['1st', '2nd', '3rd', '4th'][quarter - 1] || quarter} Quarter`;
    const sameGrades = (left, right) => JSON.stringify((left || []).map(row => [String(row.id), row.grade]).sort()) === JSON.stringify((right || []).map(row => [String(row.id), row.grade]).sort());
    const confirmGradeShare = (quarter, count, subject, section, mode = 'share') => new Promise(resolve => {
        if (document.querySelector('.record-share-confirm[open]')) { resolve(false); return; }
        const dialog = document.createElement('dialog');
        dialog.className = 'record-share-confirm';
        dialog.setAttribute('aria-labelledby', 'record-share-confirm-title');
        dialog.setAttribute('aria-describedby', 'record-share-confirm-description');
        dialog.innerHTML = `<form method="dialog"><h2 id="record-share-confirm-title">Share ${escape(quarterName(quarter))} Grades?</h2><p id="record-share-confirm-description">Please confirm the submission of ${escape(quarterName(quarter))} grades for ${count} student${count === 1 ? '' : 's'} in ${escape(subject)}, Section ${escape(section)}. The adviser will review the submitted grades before publication.</p><div class="record-share-confirm-actions"><button type="submit" value="cancel" autofocus class="sigma-btn sigma-btn-white sigma-btn-md">Cancel</button><button type="submit" value="share" class="sigma-btn sigma-btn-primary sigma-btn-md">Share Grades</button></div></form>`;
        if (mode !== 'share') {
            dialog.querySelector('h2').textContent = mode === 'publish' ? `Publish ${quarterName(quarter)} Grades?` : 'Request Grade Corrections?';
            dialog.querySelector('p').textContent = mode === 'publish'
                ? `You are about to publish ${quarterName(quarter)} grades for ${count} student${count === 1 ? '' : 's'} in ${subject}, Section ${section}.

Published grades will be visible to students.`
                : `Please specify the corrections required for ${quarterName(quarter)} grades in ${subject}, Section ${section}. The subject teacher will be notified of your request.`;
            dialog.querySelector('[value="share"]').textContent = mode === 'publish' ? 'Publish to Students' : 'Send Request';
            if (mode === 'corrections') {
                const label = document.createElement('label');
                label.textContent = 'Correction details';
                const input = document.createElement('textarea');
                input.name = 'reason'; input.required = true; input.minLength = 10; input.maxLength = 1000;
                input.placeholder = 'Identify the student, the grade concerned, and the required correction.';
                input.setAttribute('aria-label', 'Correction details');
                const hint = document.createElement('small');
                hint.id = 'record-correction-hint';
                hint.className = 'record-correction-hint';
                hint.textContent = '10–1,000 characters · 0 / 1,000';
                input.setAttribute('aria-describedby', hint.id);
                input.addEventListener('input', () => {
                    input.setCustomValidity('');
                    hint.textContent = `10–1,000 characters · ${input.value.length.toLocaleString('en-US')} / 1,000`;
                });
                label.append(input);
                label.append(hint);
                dialog.querySelector('.record-share-confirm-actions').before(label);
                dialog.querySelector('form').addEventListener('submit', event => {
                    const text = input.value.trim();
                    const error = text.length < 10 ? 'Enter at least 10 characters describing the correction.'
                        : text.length > 1000 ? 'Use no more than 1,000 characters.'
                        : /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text) ? 'Remove unsupported control characters.' : '';
                    if (event.submitter?.value === 'share' && error) {
                        event.preventDefault(); input.setCustomValidity(error); input.reportValidity();
                    }
                });
                dialog.querySelector('[value="cancel"]').formNoValidate = true;
            }
        }
        dialog.addEventListener('close', () => {
            const confirmed = dialog.returnValue === 'share';
            const result = confirmed && mode === 'corrections' ? dialog.querySelector('textarea').value.trim() : confirmed;
            dialog.remove();
            resolve(result);
        }, { once: true });
        dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close('cancel'); });
        document.body.append(dialog);
        dialog.showModal();
    });
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

    window.openSharedGradeRecord = function (options = {}) {
        const review = options.mode === 'review';
        const state = window.sigmaGradesState;
        const host = document.getElementById('admin-gradebook-workspace-content');
        if (!state?.selectedSubjectSection || !host) return;
        state.recordMode = review ? 'review' : 'share';
        if (review && !options.keepQuarter) {
            try {
                const activeYear = window.getActiveSchoolYearRecord?.() || {};
                const yearName = activeYear.yearStart && activeYear.yearEnd ? `${activeYear.yearStart}-${activeYear.yearEnd}` : activeYear.name || activeYear.schoolYear || activeYear.year || 'Not specified';
                const normalize = value => String(value || '').trim().toLowerCase();
                const subject = state.selectedSubjectSection;
                const available = (window.getSubjectAvailableQuarters?.(subject.subject) || [1, 2]).map(Number);
                const remoteShared = window.SigmaGradeSync?.getSharedRecords();
                const shared = remoteShared?.ready ? remoteShared.records : JSON.parse(localStorage.getItem('sigma-submitted-quarter-grades-v1') || '{}');
                const received = available.filter(quarter => shared[JSON.stringify([yearName, normalize(subject.sectionName), normalize(subject.subject), quarter])]?.rows?.some(row => Number.isFinite(row.grade)));
                if (received.length && !received.includes(Number(state.activeQuarter))) state.activeQuarter = received[received.length - 1];
            } catch (_) {}
        }
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
        const adminPage = location.pathname.endsWith('/admin.html');
        const adminActor = adminPage ? window.getLoggedInAdminUser?.() : null;
        const actor = adminActor ? { ...adminActor, role: 'admin' } : window.getPrivateCommentActor?.() || window.getLoggedInTeacherUser?.() || teacher;
        const isAdminActor = adminPage || ['admin', 'administrator'].includes(String(actor.role || '').toLowerCase());
        const normalizeIdentity = value => String(value || '').trim().toLowerCase();
        const adviser = sectionRecord?.adviser;
        const adviserIds = [sectionRecord?.adviserId, sectionRecord?.adviserUid, sectionRecord?.adviserEmail, typeof adviser === 'object' ? adviser?.id : '', typeof adviser === 'object' ? adviser?.uid : '', typeof adviser === 'object' ? adviser?.email : ''].filter(Boolean).map(normalizeIdentity);
        const actorIds = [actor.id, actor.uid, actor.email].filter(Boolean).map(normalizeIdentity);
        const actorName = normalizeIdentity(actor.fullName || actor.name || [actor.firstName, actor.middleName, actor.lastName].filter(Boolean).join(' '));
        const isSectionAdviser = adviserIds.length && actorIds.length
            ? adviserIds.some(id => actorIds.includes(id))
            : Boolean(actorName && actorName === normalizeIdentity(adviserName(selected)));
        const canPublishGrades = isSectionAdviser || isAdminActor;
        const notesKey = JSON.stringify(['sigma-grade-personal-notes-v1', actor.id || actor.uid || actor.email || actor.name, year, snapshot.subject, snapshot.section, snapshot.quarter]);
        let personalNote = '';
        const commentsKey = JSON.stringify(['sigma-grade-comments-v2', year, snapshot.subject, snapshot.section, snapshot.quarter]);
        let comments = [];
        try { comments = JSON.parse(localStorage.getItem(commentsKey) || '[]'); if (!Array.isArray(comments)) comments = []; } catch (_) {}
        try {
            const legacyKey = JSON.stringify(['sigma-grade-comments-local-v1', actor.id || actor.uid || actor.email || actor.name, year, snapshot.subject, snapshot.section, snapshot.quarter]);
            const legacy = JSON.parse(localStorage.getItem(legacyKey) || '[]');
            const merged = [...comments];
            for (const comment of legacy) if (!merged.some(item => item.date === comment.date && item.text === comment.text && item.author === comment.author)) merged.push({ ...comment, authorId: String(actor.id || actor.uid || actor.email || '') });
            if (merged.length !== comments.length) { comments = merged; localStorage.setItem(commentsKey, JSON.stringify(comments)); }
        } catch (_) {}
        try { personalNote = localStorage.getItem(notesKey) || ''; } catch (_) {}
        const avatar = window.renderUserAvatarHtml?.(actor, 'sm') || '<div class="sigma-user-avatar sigma-user-avatar--sm"><i class="fa-solid fa-user" aria-hidden="true"></i></div>';
        const adviserDisplayName = adviserName(selected);
        const adviserProfile = ['sigma-admin-users', 'sigma-users-list'].flatMap(storedList).find(user =>
            String(user.fullName || user.name || [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ')).trim().toLowerCase() === adviserDisplayName.trim().toLowerCase());
        const adviserAvatar = window.renderUserAvatarHtml?.(adviserProfile || {}, 'sm') || '<span class="sigma-user-avatar sigma-user-avatar--sm"><i class="fa-solid fa-user" aria-hidden="true"></i></span>';
        const key = JSON.stringify([teacher.id || teacher.uid || teacher.email || teacher.fullName, year, snapshot.subject, snapshot.section]);
        let saved;
        try { saved = read()[key] || { quarters: {}, note: '' }; }
        catch (_) { saved = { quarters: {}, note: '' }; }
        const q = Number(snapshot.quarter);
        const submissionKey=quarter=>JSON.stringify([year,normalizeIdentity(snapshot.section),normalizeIdentity(snapshot.subject),Number(quarter)]);
        const accounts = ['sigma-admin-users', 'sigma-users-list'].flatMap(storedList);
        const actorId = String(actor.id || actor.uid || actor.email || '');
        const notify = (recipient, type, title, mode, extra = {}) => {
            const profile = typeof recipient === 'string' ? accounts.find(user => normalizeIdentity(user.fullName || user.name || [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ')) === normalizeIdentity(recipient)) : recipient;
            const recipientId = String(profile?.id || profile?.uid || '');
            if (!recipientId || actorIds.includes(normalizeIdentity(recipientId))) return;
            const recipientRole = mode === 'student' ? 'student' : ['admin', 'administrator'].includes(String(profile?.role || profile?.type || '').toLowerCase()) ? 'admin' : 'teacher';
            window.SigmaNotifications?.sendToRole(recipientRole, {
                id: `${type}:${submissionKey(q)}:${recipientId}:${Date.now()}`, type, title,
                body: `${snapshot.subject} • ${snapshot.section} • ${quarterName(q)}${extra.message ? ` — ${String(extra.message).slice(0, 160)}` : ''}`,
                senderId: actorId, senderName: actor.fullName || actor.name || 'Teacher',
                recipientId, timestamp: new Date().toISOString(), read: false,
                target: { gradeRecord: { subject: snapshot.subject, section: snapshot.section, quarter: q, year, mode, selected: { ...selected }, selectedTeacher: teacher, ...extra } }
            });
        };
        const subjectTeacher = () => {
            let shared;
            try { shared = JSON.parse(localStorage.getItem('sigma-submitted-quarter-grades-v1') || '{}')[submissionKey(q)]; } catch (_) {}
            return accounts.find(user => [user.id, user.uid, user.email].some(id => id && String(id) === String(shared?.submittedBy))) || teacher;
        };
        const assignedTeacher = window.getUnifiedClassroomTeacher?.(snapshot.section, snapshot.subject);
        const assignedTeacherProfile = typeof assignedTeacher === 'object' ? assignedTeacher : accounts.find(user =>
            [user.fullName, user.name, [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' '),
                user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : '']
                .filter(Boolean).some(name => normalizeIdentity(name) === normalizeIdentity(assignedTeacher)));
        const subjectTeacherProfile = assignedTeacherProfile || subjectTeacher();
        const subjectTeacherIds = [subjectTeacherProfile?.id, subjectTeacherProfile?.uid, subjectTeacherProfile?.email].filter(Boolean).map(normalizeIdentity);
        const subjectTeacherName = normalizeIdentity(typeof assignedTeacher === 'string' ? assignedTeacher
            : subjectTeacherProfile?.fullName || subjectTeacherProfile?.name);
        const isOwnAdvisorySubject = isSectionAdviser && (subjectTeacherIds.length && actorIds.length
            ? subjectTeacherIds.some(id => actorIds.includes(id))
            : Boolean(actorName && actorName === subjectTeacherName));
        let submittedRecords={};
        try{submittedRecords=JSON.parse(localStorage.getItem('sigma-submitted-quarter-grades-v1')||'{}');}catch(_){}
        const remoteShared = window.SigmaGradeSync?.getSharedRecords();
        if (remoteShared?.ready) submittedRecords = remoteShared.records;
        if(review){
            saved={quarters:{}};
            for(const quarter of [1,2,3,4])saved.quarters[quarter]=submittedRecords[submissionKey(quarter)]?.rows||[];
        }
        const configuredQuarters = window.getSubjectAvailableQuarters?.(snapshot.subject) || selected.quarters;
        const quarters = Array.isArray(configuredQuarters) && configuredQuarters.length
            ? [...new Set(configuredQuarters.map(Number).filter(value => value >= 1 && value <= 4))].sort((a, b) => a - b)
            : Array.from({ length: Math.max(q, document.querySelectorAll('#admin-grades-quarters-wrapper button').length || 2) }, (_, index) => index + 1);
        const quarterCount = quarters.length;
        const rows = snapshot.rows.map(row => {
            const id=String(row.student.id||row.student.uid||row.student.lrn||'');
            const submitted=saved.quarters[q]?.find(item=>String(item.id)===id);
            return {id,name:row.student.name||row.student.fullName||'Student',grade:review?(Number.isFinite(submitted?.grade)?submitted.grade:null):row.quarterly};
        });
        const baseRoute = location.pathname.endsWith('/admin.html') ? '#school-grades:gradebook' : '#grades:gradebook';
        try { sessionStorage.setItem(routeContextKey, JSON.stringify({ selectedSubjectSection: selected, selectedTeacher: state.selectedTeacher, activeQuarter: q, recordMode: review ? 'review' : 'share' })); } catch (_) {}
        if (!isRecordRoute()) history.pushState({ ...history.state, type: 'tab', subTab: 'gradebook', recordMode:review?'review':'share' }, '', `${baseRoute}:share-record`);
        if (review && location.pathname.endsWith('/teacher.html')) {
            document.getElementById('nav-classes')?.classList.remove('active');
            document.getElementById('nav-grades')?.classList.add('active');
            window.setNavContext?.('Advisory Class', 'Review Grades');
        }
        const isDraftRow = row => {
            const previousRow = saved.quarters[q]?.find(item => item.id === row.id);
            return (previousRow?.grade ?? null) !== (row.grade ?? null);
        };
        let dirty = rows.some(isDraftRow) || (saved.quarters[q] || []).some(item => item.grade != null && !rows.some(row => row.id === item.id));
        const navbar = document.getElementById('admin-grades-shared-navbar');
        const pageHeader = document.getElementById('admin-grades-tab-gradebook')?.closest('.sigma-header-tab-group')?.parentElement;
        if (navbar) navbar.style.display = 'none';
        if (pageHeader) pageHeader.style.display = 'none';
        const close = () => {
            if (review) {
                host.replaceChildren();
                document.getElementById('record-nav-title')?.remove();
                if (navbar) navbar.style.removeProperty('display');
                if (pageHeader) pageHeader.style.removeProperty('display');
                sessionStorage.removeItem(routeContextKey);
                window.sigmaGradesState.recordMode = 'share';
                window.sigmaGradesState.teacherAdvisoryView = true;
                window.switchAdminGradesTab('analytics', true);
                history.replaceState({...history.state,type:'tab',subTab:'analytics',teacherGradesView:'advisory',recordMode:null},'',baseRoute.replace(':gradebook', ':analytics'));
                window.openTeacherAdvisoryClass?.();
                return;
            }
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
                title.innerHTML = `<span>${review ? 'Advisory Class' : 'Grades'}</span><strong>${review ? 'Review Grades' : 'Share Grades'}</strong>`;
                navTitle.after(title);
            }
            const recordTitle = document.querySelector('#record-nav-title strong');
            if (recordTitle) recordTitle.textContent = review ? 'Review Grades' : 'Share Grades';
            const recordParent = document.querySelector('#record-nav-title > span');
            if (recordParent) recordParent.textContent = review ? 'Advisory Class' : 'Grades';

            const missing = rows.filter(row => row.grade == null).length;
            host.innerHTML = `<section class="shared-grade-record${review ? ' record-review' : ''}">
                <div class="record-actions"><button type="button" class="sigma-btn sigma-btn-white sigma-btn-md record-back" aria-label="Back"><i class="fa-solid fa-chevron-left record-back-chevron" aria-hidden="true"></i><span>Back</span></button><div><button type="button" class="sigma-btn sigma-btn-primary sigma-btn-md record-share" ${dirty || !rows.length ? 'disabled' : ''} title="${dirty ? 'Update all draft grades before sharing' : 'Advisory Class is not connected yet'}">Share</button><button type="button" class="sigma-btn sigma-btn-primary sigma-btn-md record-update" ${dirty ? '' : 'hidden disabled'}>Update</button></div></div>
                <header class="record-heading"><div class="record-context-row"><h2>${escape(snapshot.subject)}</h2><span>${escape(gradeLabel)} - ${escape(snapshot.section)}</span><span>S.Y. ${escape(year)}</span></div><div class="record-adviser"><strong>Adviser:</strong><div class="record-adviser-avatar" aria-hidden="true">${adviserAvatar}</div><span class="record-adviser-name">${escape(adviserDisplayName)}</span></div></header>
                <div class="record-layout"><aside class="record-sidebar"><section class="record-comments record-notes"><div class="record-comments-heading"><i class="fa-solid fa-thumbtack record-notes-pin" aria-hidden="true"></i><h2>My Notes</h2></div><textarea id="record-note" aria-label="My Notes" maxlength="1000" placeholder="Write a note...">${escape(personalNote)}</textarea><p class="record-note-error" role="alert"></p></section><section class="record-comments shared-private-comments"><div class="shared-private-comments-heading record-comments-heading"><i class="fa-regular fa-comments" aria-hidden="true"></i><h2>Private Comments</h2></div><div class="sigma-comment-composer-row record-comment-row"><div class="sigma-comment-composer-avatar">${avatar}</div><div class="sigma-comment-input-pill record-comment-pill"><textarea class="sigma-comment-textarea" rows="1" maxlength="1000" aria-label="Private comment" placeholder="Add a comment..."></textarea><button type="button" class="sigma-comment-send-btn" disabled title="Adviser messaging is not connected yet" aria-label="Send private comment"><i class="fa-solid fa-paper-plane" aria-hidden="true"></i></button></div></div></section></aside>
                <main class="record-main"><div class="record-status" role="status"><span class="${dirty ? 'record-draft-label' : 'record-saved-label'}">${quarterName(q)} ${dirty ? 'Draft' : 'Updated'}</span><span>${missing ? `${missing} missing grade${missing === 1 ? '' : 's'}` : `${rows.length} of ${rows.length} grades available`}</span></div>
                <div class="record-table-scroll"><table data-sigma-paginate data-quarter-count="${quarterCount}"><thead><tr><th>No.</th><th>Name</th><th>Student ID</th>${quarters.map(quarter => `<th><span class="record-quarter-full">${quarterName(quarter)}</span><span class="record-quarter-short">Q${quarter}</span></th>`).join('')}<th>${window.getGradeSemesterLabel(quarters)}</th></tr></thead><tbody>${rows.map((row, index) => {
                    const grades = quarters.map(quarter => quarter === q ? row.grade : saved.quarters[quarter]?.find(item => item.id === row.id)?.grade);
                    const complete = grades.every(grade => typeof grade === 'number' && Number.isFinite(grade));
                    return `<tr><td>${index + 1}</td><td>${escape(row.name)}</td><td>${escape(row.id)}</td>${grades.map((grade, i) => `<td class="${quarters[i] === q && isDraftRow(row) ? 'record-draft-cell' : ''}">${grade == null ? '<span class="record-blank gradebook-dash">-</span>' : escape(grade)}</td>`).join('')}<td>${complete ? Math.round(grades.reduce((a, b) => a + b, 0) / quarterCount) : '<span class="record-blank gradebook-dash">-</span>'}</td></tr>`;
                }).join('') || `<tr><td colspan="${quarterCount + 4}">No students in this section.</td></tr>`}</tbody></table></div><p class="record-error" role="alert"></p></main></div></section>`;
            host.querySelector('.record-table-scroll').after(host.querySelector('.record-status'));
            host.querySelectorAll('.record-quarter-full').forEach(label => {
                const ordinal = label.textContent.split(' ')[0];
                label.replaceChildren(document.createTextNode(ordinal), document.createElement('br'), document.createTextNode('Quarter'));
            });
            host.querySelectorAll('.record-main tbody tr').forEach((tr, index) => {
                const student = snapshot.rows[index]?.student;
                if (!student) return;
                const cell = tr.children[1];
                const name = document.createElement('span');
                name.textContent = cell.textContent;
                const nameDetails = document.createElement('span');
                nameDetails.className = 'record-student-details';
                const mobileId = document.createElement('span');
                mobileId.className = 'record-student-mobile-id text-black-fade';
                const rawStudentId = String(student.id || student.uid || student.lrn || '').replace(/^ID:\s*/i, '').trim();
                mobileId.textContent = rawStudentId ? `ID: ${rawStudentId}` : '';
                nameDetails.append(name, mobileId);
                const identity = document.createElement('div');
                identity.className = 'record-student-identity';
                const profile = document.createElement('span');
                profile.className = 'record-student-avatar';
                profile.innerHTML = window.renderUserAvatarHtml?.(student, 'sm') || '<span class="sigma-user-avatar sigma-user-avatar--sm"><i class="fa-solid fa-user" aria-hidden="true"></i></span>';
                identity.append(profile, nameDetails);
                cell.replaceChildren(identity);
            });
            if (review) {
                const cards = document.createElement('div');
                cards.className = 'record-mobile-grade-cards';
                cards.setAttribute('aria-label', 'Student grade cards');
                cards.innerHTML = rows.map((row, index) => {
                    const grades = quarters.map(quarter => quarter === q ? row.grade : saved.quarters[quarter]?.find(item => item.id === row.id)?.grade);
                    const complete = grades.every(Number.isFinite);
                    const final = complete ? Math.round(grades.reduce((sum, grade) => sum + grade, 0) / quarterCount) : null;
                    const values = [...grades, final];
                    return `<article class="record-mobile-grade-card"><header><div>${index + 1}. ${escape(row.name)}</div><span>ID: ${escape(row.id)}</span></header><dl style="grid-template-columns:repeat(${values.length},minmax(0,1fr))">${values.map((grade, column) => `<div><dt>${column === grades.length ? window.getGradeSemesterLabel(quarters, true) : `Q${quarters[column]}`}</dt><dd${Number.isFinite(grade) ? '' : ' class="record-mobile-grade-missing"'}>${Number.isFinite(grade) ? escape(grade) : '-'}</dd></div>`).join('')}</dl></article>`;
                }).join('') || '<p>No students in this section.</p>';
                host.querySelector('.record-table-scroll').after(cards);
            }
            host.querySelector('.record-main').append(host.querySelector('.record-actions'));
            if (review) {
                const picker = document.createElement('div');
                picker.className = 'record-review-quarter-picker';
                picker.innerHTML = `<span>Select quarter to publish</span>${window.renderSharedQuarterDropdown(quarters, q, () => '')}`;
                picker.querySelector('summary').setAttribute('aria-label', 'Quarter to publish');
                picker.querySelectorAll('.sigma-quarter-dropdown-menu button').forEach((button, index) => button.onclick = () => {
                    state.activeQuarter = quarters[index];
                    window.openSharedGradeRecord({ mode: 'review', keepQuarter: true });
                    host.querySelector('.record-review-quarter-picker summary')?.focus();
                });
                host.querySelector('.record-main').prepend(picker);
                const syncStatus = document.createElement('p');
                syncStatus.className = 'record-live-sync-status';
                syncStatus.setAttribute('role', 'status');
                const connection = window.SigmaGradeSync?.status();
                syncStatus.hidden = !connection?.message;
                syncStatus.textContent = connection?.message || '';
                picker.after(syncStatus);
            }
            host.querySelector('.record-back').onclick = close;
            host.querySelector('.record-share').onclick = async () => {
                host.querySelector('.record-error').removeAttribute('data-success');
                if(review){
                    if(!canPublishGrades||!rows.length||rows.some(row=>!Number.isFinite(row.grade)))return;
                    const assignedRows = rows.filter(row => {
                        const student = accounts.find(user => [user.id, user.uid, user.lrn, user.studentNumber].some(id => id && String(id) === String(row.id)))
                            || snapshot.rows.find(item => [item.student?.id, item.student?.uid, item.student?.lrn].some(id => id && String(id) === String(row.id)))?.student;
                        return window.getAssignedGradeSections?.(student, snapshot.subject).includes(normalizeIdentity(snapshot.section)) === true;
                    });
                    if (assignedRows.length !== rows.length) {
                        host.querySelector('.record-error').textContent = 'Student assignments have changed. Reopen Review Grades before publishing.';
                        return;
                    }
                    if (!await confirmGradeShare(q, rows.length, snapshot.subject, snapshot.section, 'publish')) return;
                    if (!host.querySelector('.record-review')) return;
                    try{
                        const currentYear = window.getActiveSchoolYearRecord?.() || {};
                        const currentYearName = currentYear.yearStart && currentYear.yearEnd ? `${currentYear.yearStart}-${currentYear.yearEnd}` : currentYear.name || currentYear.schoolYear || currentYear.year || 'Not specified';
                        if (currentYearName !== year) throw new Error('School year changed. Reopen Review Grades before publishing.');
                        const roster = window.getStudentsForSection?.(snapshot.section, snapshot.subject) || [];
                        const identities = student => [student?.id, student?.uid, student?.lrn, student?.studentNumber].filter(Boolean).map(String);
                        const recipients = rows.map(row => {
                            const student = roster.find(item => identities(item).includes(String(row.id)));
                            if (!student || !window.getAssignedGradeSections?.(student, snapshot.subject).includes(normalizeIdentity(snapshot.section))) return null;
                            const profile = accounts.find(item => identities(item).some(id => identities(student).includes(id)));
                            return { row: { ...row, studentIds: [...new Set([...identities(student), ...identities(profile), String(row.id)])] }, recipient: profile || student };
                        });
                        if (recipients.some(item => !item)) throw new Error('Student assignments changed. Reopen Review Grades before publishing.');
                        const latestShared = JSON.parse(localStorage.getItem('sigma-submitted-quarter-grades-v1') || '{}')[submissionKey(q)];
                        if (!latestShared || !sameGrades(latestShared.rows, rows)) throw new Error('Shared grades changed. Reopen Review Grades to review the latest submission.');
                        const all=JSON.parse(localStorage.getItem('sigma-published-quarter-grades-v1')||'{}');
                        const publishedKey=JSON.stringify([year,normalizeIdentity(snapshot.section),normalizeIdentity(snapshot.subject),q]);
                        const previous = all[publishedKey];
                        const publishedRows = recipients.map(item => item.row);
                        const changed = JSON.stringify(previous?.rows) !== JSON.stringify(publishedRows);
                        if (!window.SigmaGradeSync) throw new Error('Live grade connection is unavailable. Reload the page.');
                        all[publishedKey]=await window.SigmaGradeSync.publish([year,normalizeIdentity(snapshot.section),normalizeIdentity(snapshot.subject),q],latestShared.submittedAt);
                        localStorage.setItem('sigma-published-quarter-grades-v1',JSON.stringify(all));
                        window.dispatchEvent(new CustomEvent('sigma:grades-published'));
                        if (changed) {
                            const title = previous ? 'Published Grades Updated' : 'Quarter Grades Published';
                            recipients.forEach(item => notify(item.recipient, 'quarter-grades-published', title, 'student'));
                            notify(subjectTeacher(), 'quarter-grades-published', title, 'share');
                            if (isAdminActor && ![adviserProfile?.id, adviserProfile?.uid].filter(Boolean).map(String).includes(String(subjectTeacher()?.id || subjectTeacher()?.uid || ''))) {
                                notify(adviserProfile, 'quarter-grades-published', title, 'review');
                            }
                        }
                        host.querySelector('.record-error').textContent='Quarter grades published successfully.';
                        host.querySelector('.record-error').dataset.success = 'true';
                        const status = host.querySelector('.record-status');
                        if (status) status.textContent = `${quarterName(q)} Published ✓`;
                        const done = host.querySelector('.record-share');
                        done.textContent = 'Done'; done.disabled = false; done.title = 'Return to advisory class'; done.onclick = close;
                        host.querySelectorAll('.record-previous-grade').forEach(note => note.remove());
                        host.querySelectorAll('.record-revised-grade').forEach(cell => cell.classList.remove('record-revised-grade'));
                    }catch(error){host.querySelector('.record-error').textContent=error.message || 'Publishing failed. No grades were released.';}
                    return;
                }
                if (dirty) return;
                if(!rows.length||rows.some(row=>!Number.isFinite(row.grade))){host.querySelector('.record-error').textContent='Complete all student grades before sharing.';return;}
                if (!await confirmGradeShare(q, rows.length, snapshot.subject, snapshot.section)) return;
                if (!host.isConnected || !host.querySelector('.record-share')) return;
                try{
                    const all=JSON.parse(localStorage.getItem('sigma-submitted-quarter-grades-v1')||'{}');
                    const previous = all[submissionKey(q)];
                    const changed = JSON.stringify(previous?.rows) !== JSON.stringify(rows);
                    if (!window.SigmaGradeSync) throw new Error('Live grade connection is unavailable. Reload the page.');
                    all[submissionKey(q)]=await window.SigmaGradeSync.share([year,normalizeIdentity(snapshot.section),normalizeIdentity(snapshot.subject),q],rows);
                    localStorage.setItem('sigma-submitted-quarter-grades-v1',JSON.stringify(all));
                    window.dispatchEvent(new CustomEvent('sigma:grades-submitted'));
                    if (changed) notify(adviserProfile, 'quarter-grades-shared', previous ? 'Shared Grades Updated' : 'Grades Ready for Review', 'review');
                    host.querySelector('.record-error').textContent='Grades submitted to the adviser for review.';
                    host.querySelector('.record-error').dataset.success = 'true';
                }catch(error){host.querySelector('.record-error').textContent=error.message || 'Unable to share grades. Please try again.';}
            };
            if(review){
                const status=host.querySelector('.record-status');
                const received=submittedRecords[submissionKey(q)];
                if(status)status.textContent=received?`${quarterName(q)} Received: ${rows.length-missing} of ${rows.length} student grades. Ready for adviser review.`:`No ${quarterName(q)} grades received yet. Select a quarter with shared grades to publish.`;
                const person=host.querySelector('.record-adviser');
                if(person){
                    const sender=['sigma-admin-users','sigma-users-list'].flatMap(storedList).find(user=>[user.id,user.uid,user.email].filter(Boolean).map(String).includes(String(received?.submittedBy)));
                    const assignedTeacher=window.getUnifiedClassroomTeacher?.(snapshot.section,snapshot.subject);
                    const fullTeacherName=typeof assignedTeacher === 'string' ? assignedTeacher : assignedTeacher?.fullName || assignedTeacher?.name || received?.teacherName || sender?.fullName || sender?.name || 'Not Assigned';
                    const teacherProfile=subjectTeacherProfile || ['sigma-admin-users','sigma-users-list'].flatMap(storedList).find(user=>String(user.fullName||user.name||[user.firstName,user.middleName,user.lastName].filter(Boolean).join(' ')).trim().toLowerCase()===String(fullTeacherName).trim().toLowerCase());
                    const teacherName = teacherProfile?.firstName && teacherProfile?.lastName
                        ? `${teacherProfile.firstName} ${teacherProfile.lastName}`
                        : String(fullTeacherName).split(/\s+/).filter((word, index, words) => index === 0 || index === words.length - 1).join(' ');
                    const teacherAvatar=window.renderUserAvatarHtml?.(teacherProfile||{},'sm')||'<span class="sigma-user-avatar sigma-user-avatar--sm"><i class="fa-solid fa-user" aria-hidden="true"></i></span>';
                    person.innerHTML=`<strong>Teacher:</strong><div class="record-adviser-avatar" aria-hidden="true">${teacherAvatar}</div><span class="record-adviser-name">${escape(teacherName)}</span>`;
                }
                const publish=host.querySelector('.record-share');publish.textContent='Publish to Students';
                publish.disabled=!canPublishGrades||!rows.length||rows.some(row=>!Number.isFinite(row.grade));
                publish.title=!canPublishGrades?'Only an administrator or the assigned adviser can publish these grades.':publish.disabled?`Wait for all ${quarterName(q)} grades to be shared before publishing.`:`Publish ${quarterName(q)} grades to students`;
                const request = document.createElement('button');
                request.type = 'button'; request.className = 'sigma-btn sigma-btn-white sigma-btn-md';
                request.textContent = 'Request Corrections'; request.disabled = !received || !(isSectionAdviser || isAdminActor);
                request.onclick = async () => {
                    if (isOwnAdvisorySubject && !isAdminActor) return;
                    const reason = await confirmGradeShare(q, rows.length, snapshot.subject, snapshot.section, 'corrections');
                    if (!reason || !host.querySelector('.record-review')) return;
                    const message = host.querySelector('.record-error');
                    message.removeAttribute('data-success');
                    try {
                        const current = JSON.parse(localStorage.getItem(commentsKey) || '[]');
                        const next = [...current, { authorId: actorId, authorRole: isAdminActor ? 'admin' : actor.role || 'teacher', kind: 'correction-request', author: actor.fullName || actor.name || 'Adviser', text: `Correction request — ${quarterName(q)}: ${reason}`, date: new Date().toISOString() }];
                        localStorage.setItem(commentsKey, JSON.stringify(next));
                        comments = next;
                        notify(subjectTeacher(), 'grade-corrections-requested', 'Grade Corrections Requested', 'share', { focusComments: true, message: reason });
                        render();
                        const result = host.querySelector('.record-error');
                        result.textContent = 'Correction request saved with details in this browser.';
                        result.dataset.success = 'true';
                    } catch (_) { message.textContent = 'Unable to save the correction request. Please try again.'; }
                };
                if (!isOwnAdvisorySubject || isAdminActor) publish.before(request);
                if (isOwnAdvisorySubject || isAdminActor) {
                    const edit = document.createElement('button');
                    edit.type = 'button'; edit.className = 'sigma-btn sigma-btn-white sigma-btn-md';
                    edit.textContent = 'Edit Gradebook';
                    edit.onclick = () => {
                        host.replaceChildren();
                        document.getElementById('record-nav-title')?.remove();
                        navbar?.style.removeProperty('display');
                        pageHeader?.style.removeProperty('display');
                        sessionStorage.removeItem(routeContextKey);
                        Object.assign(state, { recordMode: null, teacherAdvisoryView: false, currentView: 'overview' });
                        history.replaceState({ ...history.state, type: 'tab', subTab: 'gradebook', recordMode: null }, '', baseRoute);
                        window.switchAdminGradesTab('gradebook');
                        window.renderAdminGradebookWorkspace();
                        window.scrollTo(0, 0);
                    };
                    publish.before(edit);
                }
                try {
                    const remote = window.SigmaGradeSync?.getPublished(submissionKey(q));
                    const published = remote?.ready ? remote.record : JSON.parse(localStorage.getItem('sigma-published-quarter-grades-v1') || '{}')[submissionKey(q)];
                    if (published && sameGrades(published.rows, rows)) {
                        if (status) status.textContent = `${quarterName(q)} Published ✓`;
                        publish.textContent = 'Done'; publish.disabled = false;
                        publish.title = 'Return to advisory class'; publish.onclick = close;
                    } else if (published && received) {
                        if (status) status.textContent = `${quarterName(q)} — Updated grades awaiting review. Students continue to see the previously published grades.`;
                        publish.textContent = 'Publish Updated Grades';
                        publish.title = `Publish revised ${quarterName(q)} grades to students`;
                        const quarterColumn = quarters.indexOf(q);
                        rows.forEach((row, index) => {
                            const previous = published.rows.find(item => String(item.id) === String(row.id));
                            if ((previous?.grade ?? null) === row.grade) return;
                            const annotate = cell => {
                                if (!cell) return;
                                cell.classList.add('record-revised-grade');
                                const note = document.createElement('small');
                                note.className = 'record-previous-grade';
                                note.textContent = `Previously: ${Number.isFinite(previous?.grade) ? previous.grade : '—'}`;
                                cell.append(note);
                            };
                            annotate(host.querySelector('.record-table-scroll tbody')?.rows[index]?.cells[3 + quarterColumn]);
                            annotate(host.querySelectorAll('.record-mobile-grade-card')[index]?.querySelectorAll('dd')[quarterColumn]);
                        });
                    }
                } catch (_) {}
                host.querySelector('.record-update').hidden=true;
            }
            const commentPanel = host.querySelector('.shared-private-comments');
            const adminParticipant = comment => ['admin', 'administrator'].includes(String(comment.authorRole || accounts.find(user => [user.id, user.uid, user.email].filter(Boolean).map(String).includes(String(comment.authorId)))?.role || '').toLowerCase());
            const hideSelfConversation = isOwnAdvisorySubject && !isAdminActor && !comments.some(adminParticipant);
            commentPanel.hidden = hideSelfConversation;
            if (hideSelfConversation) commentPanel.style.display = 'none';
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
                if (String(comments[Number(button.dataset.recordCommentIndex)]?.authorId || '') !== actorId) { button.remove(); return; }
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
            commentHistory.querySelectorAll('.record-posted-comment').forEach((row, index) => {
                row.classList.add('group');
                row.classList.toggle('sigma-private-comment-row--own', String(comments[index].authorId) === actorId);
                const author = accounts.find(user => [user.id, user.uid, user.email].some(id => id && String(id) === String(comments[index].authorId)));
                if (adminParticipant(comments[index])) {
                    const badge = document.createElement('span'); badge.className = 'record-comment-role'; badge.textContent = 'Admin';
                    row.querySelector('.sigma-private-comment-message > div')?.append(badge);
                }
                row.firstElementChild.innerHTML = window.renderUserAvatarHtml?.(author || {}, 'sm') || '<span class="sigma-user-avatar"><i class="fa-solid fa-user" aria-hidden="true"></i></span>';
            });
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
            addComment.setAttribute('aria-expanded', String(!commentRow.hidden));
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
            send.title = 'Send private comment';
            send.setAttribute('aria-label', send.title);
            send.onclick = () => {
                if (hideSelfConversation) return;
                const text = validateText(commentInput);
                if (text === null) return;
                const next = [...comments, { authorId: actorId, authorRole: isAdminActor ? 'admin' : actor.role || 'teacher', author: actor.fullName || actor.name || teacher.fullName || teacher.name || 'Teacher', text, date: new Date().toISOString() }];
                try {
                    localStorage.setItem(commentsKey, JSON.stringify(next)); comments = next;
                    notify(review ? subjectTeacher() : adviserProfile, 'grade-record-comment', 'New Private Grade Comment', review ? 'share' : 'review', { focusComments: true, message: text });
                    if (!isAdminActor) {
                        const notified = new Set();
                        comments.filter(adminParticipant).forEach(comment => {
                            if (notified.has(String(comment.authorId))) return;
                            notified.add(String(comment.authorId));
                            const admin = accounts.find(user => [user.id, user.uid, user.email].filter(Boolean).map(String).includes(String(comment.authorId))) || { id: comment.authorId, role: 'admin' };
                            notify(admin, 'grade-record-comment', 'New Private Grade Reply', 'review', { focusComments: true, message: text });
                        });
                    }
                    render();
                }
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
        window._gradeRecordNotificationCleanup?.();
        const refreshComments = event => {
            if (!host.querySelector('.shared-grade-record')) return;
            if (event.key !== commentsKey) return;
            try { const next = JSON.parse(event.newValue || '[]'); if (Array.isArray(next)) { comments = next; render(); } } catch (_) {}
        };
        window.addEventListener('storage', refreshComments);
        window._gradeRecordNotificationCleanup = () => window.removeEventListener('storage', refreshComments);
    };
    window.openGradeRecordNotification = function (target) {
        const activeYear = window.getActiveSchoolYearRecord?.() || {};
        const year = activeYear.yearStart && activeYear.yearEnd ? `${activeYear.yearStart}-${activeYear.yearEnd}` : activeYear.name || activeYear.schoolYear || activeYear.year || 'Not specified';
        if (target.year !== year) {
            window.SigmaAnnouncements?.showToast('Select the school year for this notification before opening the grade record.', 'error');
            return;
        }
        window._skipNextGradebookReset = true;
        window.switchTab?.('nav-grades', true, 'gradebook');
        const teacher = location.pathname.endsWith('/admin.html')
            ? target.selectedTeacher || window.getEffectiveTeacher?.()
            : window.getLoggedInTeacherUser?.() || window.getEffectiveTeacher?.();
        Object.assign(window.sigmaGradesState, {
            activeTab: 'gradebook', selectedTeacher: teacher, activeQuarter: Number(target.quarter),
            selectedSubjectSection: { ...target.selected, subject: target.subject, sectionName: target.section, role: target.mode === 'review' ? 'Adviser' : 'Teacher' },
            selectedSubject: target.subject, selectedSection: target.section, currentView: 'overview',
            recordMode: target.mode === 'review' ? 'review' : 'share'
        });
        window.renderAdminGradebookWorkspace?.();
        window.openSharedGradeRecord({ mode: target.mode });
        if (target.focusComments) requestAnimationFrame(() => {
            const input = document.querySelector('#admin-gradebook-workspace-content .sigma-comment-textarea');
            if (input && !input.closest('.shared-private-comments')?.hidden) { input.closest('.record-comment-row').hidden = false; input.scrollIntoView({ block: 'center' }); input.focus(); }
        });
    };
    window.restoreSharedGradeRecordRoute = function () {
        if (!isRecordRoute() || !window.sigmaGradesState || !document.getElementById('admin-gradebook-workspace-content')) return;
        try {
            const context = JSON.parse(sessionStorage.getItem(routeContextKey) || 'null');
            if (context) Object.assign(window.sigmaGradesState, context);
        } catch (_) {}
        window.openSharedGradeRecord({ mode: window.sigmaGradesState.recordMode || 'share' });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', window.restoreSharedGradeRecordRoute);
    else window.restoreSharedGradeRecordRoute();
    window.addEventListener('popstate',()=>{
        if(isRecordRoute()){
            setTimeout(window.restoreSharedGradeRecordRoute,0);
        }else{
            document.querySelector('#admin-gradebook-workspace-content > .shared-grade-record')?.remove();
            document.getElementById('record-nav-title')?.remove();
            document.getElementById('admin-grades-shared-navbar')?.style.removeProperty('display');
            document.getElementById('admin-grades-tab-gradebook')?.closest('.sigma-header-tab-group')?.parentElement?.style.removeProperty('display');
        }
    });
    const refreshRemoteReview = event => {
        if (!event.detail?.remote || !document.querySelector('#admin-gradebook-workspace-content .record-review')) return;
        if (document.querySelector('.record-share-confirm[open]')) return;
        const scroll = window.scrollY;
        window.openSharedGradeRecord({ mode: 'review', keepQuarter: true });
        window.scrollTo(0, scroll);
    };
    window.addEventListener('sigma:grades-submitted', refreshRemoteReview);
    window.addEventListener('sigma:grades-published', refreshRemoteReview);
    window.addEventListener('sigma:grade-sync-status', event => {
        const status = document.querySelector('.record-live-sync-status');
        if (!status) return;
        status.hidden = event.detail.connected || !event.detail.message;
        status.textContent = event.detail.message || '';
    });
})();
