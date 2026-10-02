// ═══ Universal Curriculum Release Module (Shared across Teacher & Admin) ═══
(function () {
    const escapeHtml = (typeof window.escapeHtml === 'function') ? window.escapeHtml : (str) => String(str || '').replace(/[&<>'"]/g, tag => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[tag] || tag));
    const _escape = escapeHtml;
    const getStoredJson = (typeof window.getStoredJson === 'function') ? window.getStoredJson : (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch(e) { return d; } };
    function getTopicData(id) {
        if (typeof window.getTopicData === 'function' && window.getTopicData !== getTopicData) {
            return window.getTopicData(id);
        }
        return (typeof curriculumTopicCatalog !== 'undefined' && curriculumTopicCatalog) ? curriculumTopicCatalog[id] : null;
    }
    function getTopicSubject(id) {
        if (typeof window.getTopicSubject === 'function' && window.getTopicSubject !== getTopicSubject) {
            return window.getTopicSubject(id);
        }
        return null;
    }
    const isTeacherUser = () => {
        try {
            const u = JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || localStorage.getItem('sigma-logged-in-user') || '{}');
            return (u.role || u.type || '').toLowerCase() === 'teacher';
        } catch(e) { return false; }
    };
    function refreshTeacherTopicUIIfVisible(subjectId) {
        if (typeof window.refreshTeacherTopicUIIfVisible === 'function' && window.refreshTeacherTopicUIIfVisible !== refreshTeacherTopicUIIfVisible) {
            window.refreshTeacherTopicUIIfVisible(subjectId);
        } else if (typeof window.renderAdminRoomTopicsPanel === 'function') {
            const classroom = document.getElementById('classroom-detail-view');
            const topics = document.getElementById('detail-section-topics');
            if (classroom && topics && !classroom.classList.contains('hidden') && !topics.classList.contains('hidden')) {
                window.renderAdminRoomTopicsPanel();
            }
        } else if (typeof window.renderTopicsPage === 'function') {
            const page = document.getElementById('section-topic-detail');
            if (page && !page.classList.contains('hidden')) {
                window.renderTopicsPage(subjectId);
            }
        }
    }

    // ── Helper: Resolve Teacher Active Subject & Section Context ─────────────
    function resolveTeacherActiveSubjectId(providedSubjectId) {
        let raw = providedSubjectId
            || (typeof currentTopicState !== 'undefined' ? currentTopicState?.subjectId : null)
            || window.currentTopicState?.subjectId
            || (document.getElementById('teacher-topic-schedule-overlay')?.dataset?._subjectId)
            || (window._assessmentsReleaseDraftState?._subjectId)
            || (window._learningMaterialsReleaseDraftState?._subjectId)
            || (window._topicReleaseDraftState?._subjectId)
            || (typeof window.activeSubjectId !== 'undefined' ? window.activeSubjectId : null)
            || (typeof gradebookState !== 'undefined' ? gradebookState?.selectedSubject : null)
            || (window.sigmaGradesState && (window.sigmaGradesState.selectedSubject || window.sigmaGradesState.selectedSubjectSection?.subject))
            || (window.currentAdminClassroomSection ? (window.currentAdminClassroomSection.subject || window.currentAdminClassroomSection.name) : '')
            || (typeof currentClassroomMeta !== 'undefined' && currentClassroomMeta ? (currentClassroomMeta.subject || currentClassroomMeta.name) : '')
            || (typeof currentClassroomKey !== 'undefined' && currentClassroomKey ? currentClassroomKey.split('::')[1] : '')
            || '';

        if (!raw && typeof window.currentClassroomKey !== 'undefined' && window.currentClassroomKey) {
            raw = window.currentClassroomKey.split('::')[1] || '';
        }

        if (!raw && typeof currentClassroomSectionName !== 'undefined' && currentClassroomSectionName) {
            const adminSections = getStoredJson('sigma-admin-sections', []);
            const foundSec = adminSections.find(s => s && (s.name === currentClassroomSectionName || s.sectionName === currentClassroomSectionName));
            if (foundSec && foundSec.subject) raw = foundSec.subject;
        }

        if (typeof window.resolveSubjectTopicId === 'function') {
            return window.resolveSubjectTopicId(raw, raw);
        }
        const clean = String(raw || '').trim().toLowerCase();
        if (clean.includes('programming') || clean.includes('prog1') || clean.includes('prog 1')) return 'card-prog1';
        if (clean.includes('web dev') || clean.includes('webdev')) return 'card-webdev';
        if (clean.includes('database')) return 'card-database';
        if (clean.includes('empowerment')) return 'card-empowerment';
        if (clean.includes('statistic') || clean.includes('probab')) return 'card-stats';
        if (clean.includes('genmath') || (clean.includes('general') && clean.includes('math'))) return 'card-genmath';
        if (clean.includes('oral') || clean.includes('communicat')) return 'card-oralcomm';
        if (clean.includes('earth') || clean.includes('life') || clean.includes('science')) return 'card-earthsci';
        return raw || 'card-prog1';
    }
    window.resolveTeacherActiveSubjectId = resolveTeacherActiveSubjectId;

    function resolveTeacherActiveSection(providedSection) {
        let sec = providedSection
            || (typeof currentTopicState !== 'undefined' ? currentTopicState?.selectedSection : null)
            || window.currentTopicState?.selectedSection
            || (window.currentAdminClassroomSection ? (window.currentAdminClassroomSection.name || window.currentAdminClassroomSection.section) : '')
            || (typeof currentClassroomSectionName !== 'undefined' ? currentClassroomSectionName : null)
            || window.currentClassroomSectionName
            || (typeof currentClassroomMeta !== 'undefined' && currentClassroomMeta ? (currentClassroomMeta.section || currentClassroomMeta.sectionName) : '')
            || (typeof currentClassroomKey !== 'undefined' && currentClassroomKey ? currentClassroomKey.split('::')[0] : '')
            || (typeof window.currentClassroomKey !== 'undefined' && window.currentClassroomKey ? window.currentClassroomKey.split('::')[0] : '')
            || '';

        try {
            if (!sec) {
                sec = localStorage.getItem('sigma-active-classroom-section') || '';
            }
        } catch (_) {}

        if (!sec && typeof getTeacherSectionCards === 'function') {
            try {
                const cards = getTeacherSectionCards();
                if (Array.isArray(cards) && cards.length > 0) {
                    sec = cards[0].sectionName || cards[0].section || '';
                }
            } catch (_) {}
        }

        return sec || '';
    }
    window.resolveTeacherActiveSection = resolveTeacherActiveSection;


    // ── Helper to Gather All Topics in Storage (Admin + Teacher created) ────────
    function getTeacherAllSubjectTopics(subjectId, section) {
        if (!subjectId) return [];
        const resolvedSubjectId = (typeof resolveTeacherActiveSubjectId === 'function')
            ? resolveTeacherActiveSubjectId(subjectId)
            : subjectId;
        const candidateSubjIds = [resolvedSubjectId, subjectId].filter(Boolean);
        const cleanId = String(resolvedSubjectId || subjectId).replace(/^(card-|subj-|gen-)/i, '').toLowerCase();
        const cleanCode = cleanId.replace(/[^a-z0-9]/g, '');

        const allTopicsRaw = [];

        // 1. Collect from getTopicData
        try {
            const data = (typeof getTopicData === 'function') ? (getTopicData(subjectId) || (resolvedSubjectId !== subjectId ? getTopicData(resolvedSubjectId) : null)) : null;
            if (data && Array.isArray(data.q1Topics)) {
                allTopicsRaw.push(...data.q1Topics);
            }
            if (data && Array.isArray(data.topics)) {
                allTopicsRaw.push(...data.topics);
            }
        } catch (e) {}

        // 2. Direct catalog fallback
        candidateSubjIds.forEach(cid => {
            if (typeof curriculumTopicCatalog !== 'undefined' && curriculumTopicCatalog[cid]?.q1Topics) {
                allTopicsRaw.push(...curriculumTopicCatalog[cid].q1Topics);
            }
            if (typeof dynamicCurriculumSubjects !== 'undefined' && dynamicCurriculumSubjects[cid]?.q1Topics) {
                allTopicsRaw.push(...dynamicCurriculumSubjects[cid].q1Topics);
            }
        });

        // 3. Search all primary storage arrays
        const subjectStorageKeys = [
            'sigma-admin-subjects',
            'sigma_subjects_v2',
            'sigma-teacher-subjects',
            'sigma_subjects',
            'sigma_subjects_data',
            'sigma_cached_subjects'
        ];

        subjectStorageKeys.forEach(storeKey => {
            try {
                const list = (typeof getStoredJson === 'function') ? getStoredJson(storeKey, []) : JSON.parse(localStorage.getItem(storeKey) || '[]');
                if (Array.isArray(list)) {
                    list.forEach(subj => {
                        if (!subj) return;
                        const sId = String(subj.id || '').toLowerCase();
                        const sCode = String(subj.code || '').toLowerCase();
                        const sName = String(subj.name || subj.title || '').toLowerCase();
                        const sCleanId = sId.replace(/^(card-|subj-|gen-)/i, '');
                        const sCleanCode = sCode.replace(/[^a-z0-9]/g, '');
                        const sCleanName = sName.replace(/[^a-z0-9]/g, '');

                        const isMatch = candidateSubjIds.some(cid => String(cid).toLowerCase() === sId) ||
                            (cleanId && (sCleanId === cleanId || sCode === cleanId)) ||
                            (cleanCode && sCleanCode === cleanCode) ||
                            (typeof window.findMatchingSubject === 'function' && window.findMatchingSubject([subj], resolvedSubjectId));

                        if (isMatch && Array.isArray(subj.topics)) {
                            allTopicsRaw.push(...subj.topics);
                        }
                    });
                }
            } catch (e) {}
        });

        // 4. Search custom topic localStorage keys
        const keySuffixes = new Set([
            subjectId,
            resolvedSubjectId,
            cleanId,
            cleanCode,
            `card-${cleanCode}`,
            `subj-${cleanCode}`,
            `card-${cleanId}`,
            `subj-${cleanId}`
        ].filter(Boolean));

        try {
            for (let i = 0; i < localStorage.length; i++) {
                const lk = localStorage.key(i);
                if (!lk) continue;
                if (lk.startsWith('sigma_custom_topics_') || lk.startsWith('sigma_topics_') || lk.startsWith('sigma_teacher_topics_') || lk.startsWith('sigma_subject_topics_')) {
                    const lkLower = lk.toLowerCase();
                    const keyRest = lkLower.replace(/^sigma_(custom_|teacher_|subject_)?topics_/, '');
                    const matchesKey = Array.from(keySuffixes).some(suffix => {
                        const sLower = String(suffix).toLowerCase();
                        return keyRest === sLower || keyRest.replace(/^(card-|subj-|gen-)/, '') === sLower.replace(/^(card-|subj-|gen-)/, '');
                    });
                    if (matchesKey) {
                        try {
                            const parsed = JSON.parse(localStorage.getItem(lk) || '[]');
                            if (Array.isArray(parsed)) {
                                allTopicsRaw.push(...parsed);
                            }
                        } catch (_) {}
                    }
                }
            }
        } catch (e) {}

        // 5. Normalize and filter fake topics
        const isFakeTopic = (t) => {
            if (!t) return true;
            if (typeof window.isFakeSampleTopic === 'function' && window.isFakeSampleTopic(t)) return true;
            const id = String(t.id || '').trim().toLowerCase();
            const title = String(t.title || t.name || (typeof t === 'string' ? t : '')).trim().toLowerCase();
            const authorId = String(t.authorId || '').trim().toLowerCase();
            const authorName = String(t.authorName || '').trim().toLowerCase();
            return id === 'topic_teacher_sample_01' ||
                   id === 'topic-teacher-sample-01' ||
                   authorId === 'teacher_sample_01' ||
                   authorName.includes('johnathan smith') ||
                   title === 'arrays' ||
                   title === 'introduction to debugging' ||
                   title === 'debugging' ||
                   title.startsWith('arrays') ||
                   title.startsWith('introduction to debugging') ||
                   t.isFake === true ||
                   t.isSample === true;
        };

        const normalizedTopics = [];
        const seenKeys = new Set();

        allTopicsRaw.forEach((t, idx) => {
            if (!t || isFakeTopic(t)) return;
            if (typeof t === 'string') {
                t = {
                    id: `topic-${idx + 1}`,
                    title: t,
                    overview: 'Topic overview and learning materials.',
                    authorRole: 'Admin',
                    authorName: 'Administrator'
                };
            }
            const rawRole = t.authorRole || t.role || (t.isAdmin ? 'Admin' : (t.isTeacher ? 'Teacher' : 'Admin'));
            const authorRole = (typeof window.normalizeSubjectAuthorRole === 'function')
                ? window.normalizeSubjectAuthorRole(rawRole)
                : (rawRole === 'Teacher' ? 'Teacher' : 'Admin');
            
            const rawId = (t.id !== undefined && t.id !== null && t.id !== '') ? String(t.id) : `topic-${idx + 1}`;
            const rawTitle = String(t.title || t.name || `Topic ${idx + 1}`).trim();
            const normObj = {
                ...t,
                id: rawId,
                title: rawTitle,
                overview: t.overview || t.description || 'Topic overview and learning materials.',
                image: t.image || (window.topicTemplates && window.topicTemplates[idx % window.topicTemplates.length]) || 'image/Topic.jpg',
                authorRole: authorRole,
                authorName: t.authorName || (authorRole === 'Admin' ? 'Administrator' : 'Teacher'),
                authorId: t.authorId ? String(t.authorId) : '',
                timestamp: t.timestamp || t.createdAt || t.date || new Date().toISOString(),
                quarter: t.quarter || 'q1'
            };

            const idStr = String(normObj.id || '');
            const titleStr = String(normObj.title || '');
            const dedupKey = (idStr && !idStr.startsWith('topic-'))
                ? `id:${idStr.toLowerCase()}`
                : `title:${titleStr.toLowerCase()}`;

            if (!seenKeys.has(dedupKey)) {
                seenKeys.add(dedupKey);
                if (idStr) seenKeys.add(`id:${idStr.toLowerCase()}`);
                if (titleStr) seenKeys.add(`title:${titleStr.toLowerCase()}`);
                normalizedTopics.push(normObj);
            }
        });

        // 5.5. Strictly isolate topics by section and assigned teacher
        const activeSec = String(
            section ||
            (typeof currentTopicState !== 'undefined' ? currentTopicState?.selectedSection : '') ||
            (typeof resolveTeacherActiveSection === 'function' ? resolveTeacherActiveSection() : '') ||
            localStorage.getItem('sigma-active-classroom-section') ||
            ''
        ).trim().toLowerCase();

        const currentUser = (typeof getLoggedInTeacherUser === 'function')
            ? getLoggedInTeacherUser()
            : ((typeof getCurrentEditorUser === 'function') ? getCurrentEditorUser() : null);
        const currentUserId = currentUser ? String(currentUser.id || currentUser.uid || currentUser.username || '').trim().toLowerCase() : '';
        const myFullName = currentUser ? (`${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.name || '').trim().toLowerCase() : '';

        const adminSections = (typeof window.getStoredJson === 'function')
            ? window.getStoredJson('sigma-admin-sections', [])
            : [];
        const secRecord = adminSections.find(s => {
            const sName = String(s.name || s.sectionName || '').trim().toLowerCase();
            return sName === activeSec || (activeSec && (sName.includes(activeSec) || activeSec.includes(sName)));
        });

        const assignedTeacherName = (typeof window.getUnifiedClassroomTeacher === 'function')
            ? String(window.getUnifiedClassroomTeacher(activeSec, resolvedSubjectId || subjectId) || '').trim().toLowerCase()
            : '';

        const teacherScopedTopics = normalizedTopics.filter(t => {
            const rawRole = t.authorRole || t.role || (t.isAdmin ? 'Admin' : (t.isTeacher ? 'Teacher' : 'Admin'));
            const authorRole = (typeof window.normalizeSubjectAuthorRole === 'function')
                ? window.normalizeSubjectAuthorRole(rawRole)
                : (rawRole === 'Teacher' ? 'Teacher' : 'Admin');

            const tSection = String(t.section || t.roomSection || '').trim().toLowerCase();
            const tAuthorId = String(t.authorId || t.uid || '').trim().toLowerCase();
            const tAuthorName = String(t.authorName || t.author || '').trim().toLowerCase();

            // 1. If topic has an explicit section tag:
            if (tSection && activeSec) {
                const clean = s => String(s || '').replace(/^grade\s*\d+\s*[-–]?\s*/i, '').replace(/[^a-z0-9]/g, '');
                const secMatches = (tSection === activeSec || clean(tSection) === clean(activeSec));
                if (!secMatches) {
                    // Belongs to another section (e.g. Newton vs Einstein) -> MUST EXCLUDE!
                    return false;
                }
                return true;
            }

            // 2. Base Institutional Admin topics (curriculum baseline):
            if (authorRole === 'Admin') {
                return true;
            }

            // 3. Teacher-authored topics without explicit section tag:
            if (assignedTeacherName && (tAuthorName === assignedTeacherName || tAuthorName.includes(assignedTeacherName) || assignedTeacherName.includes(tAuthorName))) {
                return true;
            }
            if (secRecord && typeof window.isSectionAssignedToTeacher === 'function') {
                if (window.isSectionAssignedToTeacher(secRecord, { id: tAuthorId, name: tAuthorName })) {
                    return true;
                }
            }
            if (currentUser) {
                const isMatchCurrent = (currentUserId && tAuthorId && currentUserId === tAuthorId) ||
                    (myFullName && tAuthorName && (myFullName === tAuthorName || myFullName.includes(tAuthorName) || tAuthorName.includes(myFullName))) ||
                    (typeof window.isCurrentUserAuthor === 'function' && window.isCurrentUserAuthor(t.authorId, t.authorName, 'Teacher'));
                if (isMatchCurrent) {
                    if (!secRecord || !activeSec || (typeof window.isSectionAssignedToTeacher === 'function' && window.isSectionAssignedToTeacher(secRecord, currentUser))) {
                        return true;
                    }
                }
            }

            return false;
        });

        // 6. Admin topics first, Teacher topics below
        teacherScopedTopics.sort((a, b) => {
            const aRole = (a.authorRole || a.role || '').toLowerCase();
            const bRole = (b.authorRole || b.role || '').toLowerCase();
            const aIsTeacher = (aRole === 'teacher' || a.isTeacher);
            const bIsTeacher = (bRole === 'teacher' || b.isTeacher);
            if (!aIsTeacher && bIsTeacher) return -1;
            if (aIsTeacher && !bIsTeacher) return 1;
            return 0;
        });

        return teacherScopedTopics;
    }
    window.getTeacherAllSubjectTopics = getTeacherAllSubjectTopics;

    // ── Release Quarter Management & Toggle Helper ────────────────────────────
    window.getActiveReleaseQuarter = function () {
        if (window._activeReleaseQuarter) return window._activeReleaseQuarter;
        const pageQuarter = window.currentSelectedTopicQuarter
            || (typeof currentTopicState !== 'undefined' ? currentTopicState?.currentQuarter : null)
            || 'q1';
        window._activeReleaseQuarter = String(pageQuarter).toLowerCase();
        return window._activeReleaseQuarter;
    };

    window.getReleaseQuarterLabel = function (quarterKey) {
        const q = String(quarterKey || window.getActiveReleaseQuarter?.() || 'q1').toLowerCase();
        const map = {
            q1: '1st Quarter',
            q2: '2nd Quarter',
            q3: '3rd Quarter',
            q4: '4th Quarter'
        };
        return map[q] || '1st Quarter';
    };

    window.getSubjectReleaseQuarters = function (subjectId, subjectData = null) {
        let subj = subjectData || null;
        const rawId = subjectId 
            || (typeof currentTopicState !== 'undefined' ? (currentTopicState?.subjectId || currentTopicState?.subject?.id) : null) 
            || window._activeReleaseSubjectId
            || (window._topicReleaseDraftState?._subjectId)
            || (window._learningMaterialsReleaseDraftState?._subjectId)
            || (window._assessmentsReleaseDraftState?._subjectId);

        if (!subj && typeof currentTopicState !== 'undefined' && currentTopicState?.subject) {
            if (!rawId || String(currentTopicState.subject.id) === String(rawId) || String(currentTopicState.subject.code) === String(rawId)) {
                subj = currentTopicState.subject;
            }
        }

        if (!subj && rawId && typeof getTopicSubject === 'function') {
            try {
                subj = getTopicSubject(rawId);
            } catch (_) {}
        }

        if (!subj && rawId) {
            const targetId = String(rawId).trim().toLowerCase();
            const cleanId = targetId.replace(/^(card-|subj-|gen-)/i, '');
            const storeKeys = [
                'sigma-admin-subjects',
                'sigma_subjects_v2',
                'sigma-teacher-subjects',
                'sigma_subjects',
                'sigma_subjects_data',
                'sigma_cached_subjects'
            ];
            for (const sk of storeKeys) {
                try {
                    const list = (typeof getStoredJson === 'function') ? getStoredJson(sk, []) : JSON.parse(localStorage.getItem(sk) || '[]');
                    if (Array.isArray(list)) {
                        const match = list.find(s => {
                            if (!s) return false;
                            const sid = String(s.id || '').toLowerCase();
                            const scode = String(s.code || '').toLowerCase();
                            const sname = String(s.name || s.title || '').toLowerCase();
                            return sid === targetId || sid.replace(/^(card-|subj-|gen-)/i, '') === cleanId ||
                                   (scode && (scode === targetId || scode === cleanId)) ||
                                   (sname && sname === targetId);
                        });
                        if (match) {
                            subj = match;
                            break;
                        }
                    }
                } catch (_) {}
            }
        }

        if (subj) {
            // 1. Explicit activeQuarters array
            if (Array.isArray(subj.activeQuarters) && subj.activeQuarters.length > 0) {
                const valid = subj.activeQuarters.map(q => String(q).toLowerCase()).filter(q => ['q1', 'q2', 'q3', 'q4'].includes(q));
                if (valid.length > 0) {
                    const order = ['q1', 'q2', 'q3', 'q4'];
                    return order.filter(q => valid.includes(q));
                }
            }

            // 2. Explicit activeSemesters or semesters array
            const sems = subj.activeSemesters || subj.semesters;
            if (Array.isArray(sems) && sems.length > 0) {
                const semStrs = sems.map(s => String(s).toLowerCase());
                const hasSem1 = semStrs.some(s => s.includes('1') || s.includes('sem1') || s.includes('first'));
                const hasSem2 = semStrs.some(s => s.includes('2') || s.includes('sem2') || s.includes('second'));
                if (hasSem1 && hasSem2) return ['q1', 'q2', 'q3', 'q4'];
                if (hasSem1) return ['q1', 'q2'];
                if (hasSem2) return ['q3', 'q4'];
            }

            // 3. Explicit semester string
            if (subj.semester) {
                const semStr = String(subj.semester).toLowerCase();
                const hasSem1 = semStr.includes('1') || semStr.includes('sem1') || semStr.includes('first');
                const hasSem2 = semStr.includes('2') || semStr.includes('sem2') || semStr.includes('second');
                const hasBoth = semStr.includes('both') || semStr.includes('full') || semStr.includes('year') || (hasSem1 && hasSem2);
                if (hasBoth) return ['q1', 'q2', 'q3', 'q4'];
                if (hasSem1) return ['q1', 'q2'];
                if (hasSem2) return ['q3', 'q4'];
            }

            // 4. Topic quarters inspection
            if (Array.isArray(subj.topics) && subj.topics.length > 0) {
                const tQuarters = new Set();
                subj.topics.forEach(t => {
                    const q = String(t.quarter || '').toLowerCase();
                    if (['q1', 'q2', 'q3', 'q4'].includes(q)) tQuarters.add(q);
                });
                const hasSem1 = tQuarters.has('q1') || tQuarters.has('q2');
                const hasSem2 = tQuarters.has('q3') || tQuarters.has('q4');
                if (hasSem1 && hasSem2) return ['q1', 'q2', 'q3', 'q4'];
                if (hasSem1) return ['q1', 'q2'];
                if (hasSem2) return ['q3', 'q4'];
            }
        }

        // Default: if window.getSubjectActiveQuarters exists, check it
        if (typeof window.getSubjectActiveQuarters === 'function' && window.getSubjectActiveQuarters !== window.getSubjectReleaseQuarters) {
            try {
                const res = window.getSubjectActiveQuarters(rawId, subj);
                if (Array.isArray(res) && res.length > 0) return res;
            } catch (_) {}
        }

        return ['q1', 'q2'];
    };

    window.renderReleaseQuarterToggleHtml = function (subjectIdOrQuarter = null, currentQuarter = null) {
        let subjectId = null;
        let activeQ = null;

        if (subjectIdOrQuarter && ['q1', 'q2', 'q3', 'q4'].includes(String(subjectIdOrQuarter).toLowerCase())) {
            activeQ = String(subjectIdOrQuarter).toLowerCase();
            subjectId = null;
        } else {
            subjectId = subjectIdOrQuarter;
            if (currentQuarter && ['q1', 'q2', 'q3', 'q4'].includes(String(currentQuarter).toLowerCase())) {
                activeQ = String(currentQuarter).toLowerCase();
            }
        }

        if (!activeQ) {
            activeQ = (window.getActiveReleaseQuarter?.() || 'q1').toLowerCase();
        }

        const availableQuarters = window.getSubjectReleaseQuarters?.(subjectId) || ['q1', 'q2', 'q3', 'q4'];

        if (!availableQuarters.includes(activeQ)) {
            activeQ = availableQuarters[0] || 'q1';
            window.setActiveReleaseQuarter?.(activeQ);
        }

        const labels = {
            q1: '1st Quarter',
            q2: '2nd Quarter',
            q3: '3rd Quarter',
            q4: '4th Quarter'
        };

        return `
            <div class="flex items-center gap-1 bg-slate-100 rounded-xl p-1 font-['Inter'] select-none shrink-0 max-w-full overflow-x-auto no-scrollbar" data-release-quarter-toggle>
                ${availableQuarters.map(q => {
                    const isActive = (q === activeQ);
                    const label = labels[q] || q;
                    return `
                        <button type="button" 
                            onclick="window.switchReleaseQuarter?.('${q}')"
                            class="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-xs font-bold transition-all font-['Inter'] whitespace-nowrap cursor-pointer ${
                                isActive ? 'bg-white shadow-sm pointer-events-none cursor-default' : ''
                            }" 
                            style="${isActive ? 'color: #000000 !important; background-color: #ffffff !important;' : 'color: rgba(0,0,0,0.50) !important; background-color: transparent !important;'}"
                            ${!isActive ? `onmouseenter="if(!this.classList.contains('bg-white')) this.style.backgroundColor='rgba(0,0,0,0.06)'" onmouseleave="if(!this.classList.contains('bg-white')) this.style.backgroundColor='transparent'"` : ''}>
                            ${label}
                        </button>
                    `;
                }).join('')}
            </div>
        `;
    };

    window.switchReleaseQuarter = function (newQ) {
        window.closeAllReleasedTopicActionMenus?.();
        window.setActiveReleaseQuarter(newQ);
        if (window._topicReleaseDraftState) window._topicReleaseDraftState.pendingTopicIds = [];
        if (window._learningMaterialsReleaseDraftState) window._learningMaterialsReleaseDraftState.pendingMaterialIds = [];
        if (window._assessmentsReleaseDraftState) window._assessmentsReleaseDraftState.pendingMaterialIds = [];
        window._learningMaterialsPickerWorkingIds = [];
        window._assessmentsPickerWorkingIds = [];

        if (document.getElementById('teacher-topics-materials-picker-overlay')) {
            window.openTeacherTopicsAndMaterialsPickerModal?.();
        } else if (document.getElementById('teacher-topic-picker-overlay')) {
            window.openTeacherTopicPickerModal?.();
        } else if (document.getElementById('teacher-release-topics-overlay')) {
            window.openTeacherReleaseTopicsModal?.(true);
        } else if (document.getElementById('teacher-learning-picker-overlay')) {
            window.openTeacherLearningMaterialsPickerModal?.();
        } else if (document.getElementById('teacher-release-learning-materials-overlay') || document.getElementById('teacher-release-learning-overlay')) {
            window.openTeacherReleaseLearningMaterialsModal?.(true);
        } else if (document.getElementById('teacher-assessments-picker-overlay')) {
            window.openTeacherAssessmentsPickerModal?.();
        } else if (document.getElementById('teacher-release-assessments-overlay')) {
            window.openTeacherReleaseAssessmentsModal?.(true);
        }
    };

    // ── Standalone Release Topics Modal ───────────────────────────────────────
    window.openTeacherReleaseTopicsModal = function (fromScheduleModal = false) {
        if (!fromScheduleModal) {
            window.closeManageCurriculumHub?.();
        }
        const subjectId = resolveTeacherActiveSubjectId(typeof currentTopicState !== 'undefined' ? currentTopicState?.subjectId : null);
        const section = resolveTeacherActiveSection(typeof currentTopicState !== 'undefined' ? currentTopicState?.selectedSection : null);
        if (typeof currentTopicState !== 'undefined' && currentTopicState) {
            currentTopicState.subjectId = subjectId;
            currentTopicState.selectedSection = section;
            window.currentTopicState = currentTopicState;
        }
        const data = subjectId ? getTopicData(subjectId) : null;
        const subject = subjectId ? getTopicSubject(subjectId) : null;
        const subjectName = subject?.name || subject?.title || data?.text || 'Subject';

        const topics = getTeacherAllSubjectTopics(subjectId, section);

        // Get existing release configuration for this section if any
        let releaseConfig = { publishAll: true, releasedTopicIds: [], releaseStartTime: '', topicSchedules: {} };
        let saved = (typeof window.getTopicReleaseConfig === 'function')
            ? window.getTopicReleaseConfig(subjectId, section)
            : null;
        if (!saved) {
            try {
                saved = getStoredJson(`sigma_topic_release_${subjectId}_${section}`, null);
            } catch (e) {}
        }
        if (saved) releaseConfig = { ...releaseConfig, ...saved };
        if (!Array.isArray(releaseConfig.releasedTopicIds)) {
            releaseConfig.releasedTopicIds = [];
        }
        if (!releaseConfig.topicSchedules || typeof releaseConfig.topicSchedules !== 'object') {
            releaseConfig.topicSchedules = {};
        }

        // Initialize or preserve draft state when navigating between Release Topics and Sub-modals
        if (!window._topicReleaseDraftState || !fromScheduleModal) {
            window._topicReleaseDraftState = {
                _subjectId: subjectId,
                _section: section,
                pendingTopicIds: (window._topicReleaseDraftState?.pendingTopicIds && fromScheduleModal) 
                    ? window._topicReleaseDraftState.pendingTopicIds 
                    : [],
                startTime: releaseConfig.releaseStartTime || '',
                isImmediate: !releaseConfig.releaseStartTime,
                topicSchedules: { ...releaseConfig.topicSchedules },
                _targetTopicId: null,
                _targetTopicTitle: ''
            };
        } else {
            window._topicReleaseDraftState._subjectId = subjectId;
            window._topicReleaseDraftState._section = section;
        }
        if (!window._topicReleaseDraftState.topicSchedules) {
            window._topicReleaseDraftState.topicSchedules = {};
        }
        if (!Array.isArray(window._topicReleaseDraftState.pendingTopicIds)) {
            window._topicReleaseDraftState.pendingTopicIds = [];
        }

        const pendingTopicIds = window._topicReleaseDraftState.pendingTopicIds || [];
        const releasedTopicIds = releaseConfig.releasedTopicIds.map(String);

        const availableQuarters = (typeof window.getSubjectReleaseQuarters === 'function')
            ? window.getSubjectReleaseQuarters(subjectId, subject)
            : ['q1', 'q2'];
        let activeQuarter = (typeof window.getActiveReleaseQuarter === 'function') ? window.getActiveReleaseQuarter() : 'q1';
        if (!availableQuarters.includes(activeQuarter.toLowerCase())) {
            activeQuarter = availableQuarters[0] || 'q1';
            window.setActiveReleaseQuarter?.(activeQuarter);
        }
        const quarterTopics = topics.filter(t => (t.quarter || 'q1').toLowerCase() === activeQuarter.toLowerCase());

        const pendingSelectedTopics = quarterTopics.filter((t, idx) => {
            const topicId = t.id !== undefined ? String(t.id) : `topic-${idx}`;
            return pendingTopicIds.includes(topicId);
        });

        const releasedTopicsList = quarterTopics.filter((t, idx) => {
            const topicCand = [
                t?.id !== undefined && t?.id !== '' ? String(t.id) : `topic-${idx}`,
                t?.title ? String(t.title).trim() : '',
                t?.title ? String(t.title).trim().toLowerCase() : ''
            ].filter(Boolean);
            if (!t?.id) topicCand.push(`topic-${idx}`);
            return topicCand.some(c => releasedTopicIds.includes(c));
        });

        // Format helper for schedule display & release dates
        const formatReleaseDateText = (isoStr) => {
            if (!isoStr || isoStr === 'now' || isoStr === 'immediate') {
                const now = new Date();
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const mName = months[now.getMonth()];
                let hNum = now.getHours();
                const mNum = now.getMinutes();
                const p = hNum >= 12 ? 'PM' : 'AM';
                hNum = hNum % 12 || 12;
                const timeStr = `${String(hNum).padStart(2, '0')}:${String(mNum).padStart(2, '0')} ${p}`;
                return `${mName} ${now.getDate()}, ${now.getFullYear()} • ${timeStr}`;
            }

            const str = String(isoStr).trim();

            // 1. If it's a full UTC ISO timestamp from toISOString() (e.g. 2026-09-20T10:22:15.123Z)
            if (str.endsWith('Z') || /T\d{2}:\d{2}:\d{2}/.test(str)) {
                try {
                    const dObj = new Date(str);
                    if (!isNaN(dObj.getTime())) {
                        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                        const mName = months[dObj.getMonth()];
                        let hNum = dObj.getHours();
                        const mNum = dObj.getMinutes();
                        const p = hNum >= 12 ? 'PM' : 'AM';
                        hNum = hNum % 12 || 12;
                        const timeStr = `${String(hNum).padStart(2, '0')}:${String(mNum).padStart(2, '0')} ${p}`;
                        return `${mName} ${dObj.getDate()}, ${dObj.getFullYear()} • ${timeStr}`;
                    }
                } catch (e) {}
            }

            // 2. If it's a local schedule string (e.g. 2026-09-21T08:00 or 2026-09-21 08:00)
            if (str.includes('T') || (str.includes('-') && str.includes(':'))) {
                const sep = str.includes('T') ? 'T' : ' ';
                const [dPart, tPart] = str.split(sep);
                const [y, m, d] = (dPart || '').split('-');
                if (y && m && d) {
                    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    const monthName = months[parseInt(m, 10) - 1] || m;
                    const dateFormatted = `${monthName} ${parseInt(d, 10)}, ${y}`;
                    if (tPart) {
                        const match = tPart.match(/(\d{1,2}):(\d{2})(?:\s*([AP]M))?/i);
                        if (match) {
                            let rawH = parseInt(match[1], 10) || 0;
                            const rawM = parseInt(match[2], 10) || 0;
                            let p = match[3] ? match[3].toUpperCase() : '';
                            if (!p) {
                                p = rawH >= 12 ? 'PM' : 'AM';
                            }
                            let hNum = rawH % 12 || 12;
                            const timeStr = `${String(hNum).padStart(2, '0')}:${String(rawM).padStart(2, '0')} ${p}`;
                            return `${dateFormatted} • ${timeStr}`;
                        }
                    }
                    return dateFormatted;
                }
            }

            // 3. Fallback standard Date parsing
            try {
                const dObj = new Date(str);
                if (!isNaN(dObj.getTime())) {
                    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    const mName = months[dObj.getMonth()];
                    let hNum = dObj.getHours();
                    const mNum = dObj.getMinutes();
                    const p = hNum >= 12 ? 'PM' : 'AM';
                    hNum = hNum % 12 || 12;
                    const timeStr = `${String(hNum).padStart(2, '0')}:${String(mNum).padStart(2, '0')} ${p}`;
                    return `${mName} ${dObj.getDate()}, ${dObj.getFullYear()} • ${timeStr}`;
                }
            } catch (e) {}

            return str;
        };
        const formatScheduleBadgeText = formatReleaseDateText;

        const adminSections = getStoredJson('sigma-admin-sections', []);
        const cleanSectionName = (section || '').trim().toLowerCase();
        const matchedSec = adminSections.find(s => {
            const sName = (s.name || s.sectionName || '').trim().toLowerCase();
            return sName === cleanSectionName || (cleanSectionName && (sName.includes(cleanSectionName) || cleanSectionName.includes(sName)));
        });

        let sectionNameOnly = matchedSec?.name || section;
        let gradeLevel = matchedSec?.grade || (section.includes('Grade 12') ? 'Grade 12' : 'Grade 11');
        let roomNumber = matchedSec?.room || '302';
        let schoolYear = matchedSec?.schoolYear || '2026–2027';

        if (!matchedSec && section) {
            if (section.includes(' - ')) {
                const parts = section.split(' - ');
                if (parts[0].includes('Grade')) gradeLevel = parts[0].trim();
                sectionNameOnly = parts.slice(1).join(' - ').trim() || section;
            }
        }

        // Bottom Section: Released Topics (Shows already released topics with "Released", "Scheduled", or "Hidden" status & date & 3-dots action menu)
        let releasedTopicsDisplayHtml = '';
        if (releasedTopicsList.length > 0) {
            releasedTopicsDisplayHtml = `
                <div class="divide-y divide-black/10 border-y border-black/10 border-x-0 rounded-none sigma-selected-faded-panel overflow-hidden max-h-[360px] overflow-y-auto">
                    ${releasedTopicsList.map((t, idx) => {
                        const originalIdx = topics.indexOf(t);
                        const displayNum = originalIdx >= 0 ? originalIdx + 1 : idx + 1;
                        const topicId = t.id !== undefined ? String(t.id) : `topic-${originalIdx >= 0 ? originalIdx : idx}`;
                        const topicCand = [
                            topicId,
                            t.id !== undefined && t.id !== '' ? String(t.id) : null,
                            t.title ? String(t.title).trim() : null,
                            t.title ? String(t.title).trim().toLowerCase() : null,
                            `topic-${originalIdx >= 0 ? originalIdx : idx}`,
                            `topic-${(originalIdx >= 0 ? originalIdx : idx) + 1}`
                        ].filter(Boolean);
                        let topicSchedule = null;
                        if (releaseConfig.topicSchedules) {
                            for (const cid of topicCand) {
                                if (releaseConfig.topicSchedules[cid]) {
                                    topicSchedule = releaseConfig.topicSchedules[cid];
                                    break;
                                }
                            }
                        }
                        if (!topicSchedule) topicSchedule = releaseConfig.releaseStartTime || null;
                        const isFuture = topicSchedule && topicSchedule !== 'now' && topicSchedule !== 'immediate' && (!isNaN(new Date(topicSchedule).getTime()) && new Date(topicSchedule).getTime() > Date.now());
                        const isHidden = Array.isArray(releaseConfig.hiddenTopicIds) && topicCand.some(cid => releaseConfig.hiddenTopicIds.map(String).includes(cid));
                        const matchedDate = releaseConfig.topicReleaseDates ? topicCand.map(cid => releaseConfig.topicReleaseDates[cid]).find(Boolean) : null;
                        const relDateText = isFuture ? formatReleaseDateText(topicSchedule) : formatReleaseDateText(matchedDate || releaseConfig.updatedAt || new Date().toISOString());

                        return `
                            <div class="p-4 hover:bg-black/[0.03] transition-colors flex items-center justify-between font-['Inter'] relative">
                                <div class="flex items-start gap-4 min-w-0 flex-1">
                                    <div class="w-8 h-8 rounded-full bg-[#15803d] text-white flex items-center justify-center font-bold text-xs shrink-0 font-['Inter'] shadow-2xs mt-0.5">
                                        ${displayNum}
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <div class="flex items-center gap-2 flex-wrap">
                                            <p class="text-sm font-bold text-black tracking-tight font-['Inter']">${escapeHtml(t.title || `Topic ${displayNum}`)}</p>
                                            ${isHidden ? `
                                                <div class="inline-flex items-center gap-1.5 text-xs font-semibold text-black font-['Inter'] shrink-0">
                                                    <i class="fa-solid fa-eye-slash text-xs text-black"></i>
                                                    <span>Hidden</span>
                                                </div>
                                            ` : (isFuture ? `
                                                <div class="inline-flex items-center gap-1.5 text-xs font-semibold text-black font-['Inter'] shrink-0">
                                                    <i class="fa-solid fa-clock text-xs text-black"></i>
                                                    <span>Scheduled</span>
                                                </div>
                                            ` : '')}
                                        </div>
                                        <p class="text-[11px] font-normal text-black-fade font-['Inter'] mt-0.5">${relDateText}</p>
                                    </div>
                                </div>
                                <div class="shrink-0 ml-4 flex items-center gap-3">
                                    <!-- 3-Dots Menu Button -->
                                    <button type="button" id="released-topic-btn-${escapeHtml(String(topicId))}" 
                                        onclick="window.toggleReleasedTopicActionMenu?.('${escapeHtml(String(topicId))}', '${escapeHtml(t.title || `Topic ${displayNum}`)}', ${isHidden ? 'true' : 'false'}, event)"
                                        class="w-7 h-7 flex items-center justify-center text-black hover:text-[#FFD000] transition-colors cursor-pointer"
                                        title="Options">
                                        <i class="fa-solid fa-ellipsis-vertical text-base"></i>
                                    </button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        } else {
            const quarterLabel = (typeof window.getReleaseQuarterLabel === 'function') ? window.getReleaseQuarterLabel(activeQuarter) : '1st Quarter';
            releasedTopicsDisplayHtml = `
                <div class="sigma-empty-state-black-fade p-6 rounded-2xl border-2 border-dashed border-black/10 bg-black/[0.02] text-center font-['Inter']">
                    <p class="empty-title text-xs font-semibold text-black/60 font-['Inter']" style="color: rgba(0,0,0,0.60);">No ${quarterLabel} Topics Released Yet</p>
                    <p class="empty-desc text-[11px] font-normal text-black-fade mt-0.5 font-['Inter']" style="color: rgba(0,0,0,0.45);">Click "Select Topics" to choose curriculum modules to release for this section</p>
                </div>
            `;
        }

        let overlay = document.getElementById('teacher-release-topics-overlay');
        let isNew = false;
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'teacher-release-topics-overlay';
            overlay.className = 'curriculum-hub-overlay';
            overlay.dataset._historyPushed = 'true';
            overlay.onclick = function (e) {
                window.closeAllReleasedTopicActionMenus?.();
                e.stopPropagation();
            };
            isNew = true;
        } else {
            overlay.className = 'curriculum-hub-overlay';
            overlay.classList.remove('hidden');
            overlay.style.display = '';
        }

        if (isNew && !fromScheduleModal && typeof window.pushModalHistoryState === 'function') {
            window.pushModalHistoryState('teacher-release-topics-overlay');
        }

        overlay.innerHTML = `
            <div class="curriculum-hub-panel curriculum-release-panel-fixed w-full !max-w-[860px] flex flex-col overflow-hidden" style="height: 740px; min-height: min(740px, calc(100vh - 40px)); max-height: calc(100vh - 40px); max-width: 860px;" onclick="window.closeAllReleasedTopicActionMenus?.(); event.stopPropagation()">
                <!-- Header -->
                <div class="px-6 sm:px-8 py-5 border-b border-slate-100 flex items-center justify-between shrink-0 font-['Inter']">
                    <div>
                        <h2 class="text-xl font-bold text-black font-['Inter'] tracking-tight">Release Topics</h2>
                        <p class="text-xs font-medium text-black-fade font-['Inter'] mt-0.5">Manage topic visibility and release schedule for students</p>
                    </div>
                </div>

                <!-- Release Configuration -->
                <div class="p-6 sm:px-8 py-6 overflow-y-auto flex-1 space-y-6 font-['Inter']">
                    <!-- Section Context Strip -->
                    <div class="flex flex-wrap items-center gap-2 sm:gap-4 px-4 py-2.5 bg-black/[0.03] border border-black/10 rounded-xl text-xs font-['Inter'] font-medium text-black">
                        <span><b>Section:</b> ${escapeHtml(sectionNameOnly)}</span>
                        <span class="text-black/20">|</span>
                        <span><b>Grade:</b> ${escapeHtml(gradeLevel)}</span>
                        <span class="text-black/20">|</span>
                        <span><b>Room:</b> ${escapeHtml(roomNumber)}</span>
                        <span class="text-black/20">|</span>
                        <span><b>SY:</b> ${escapeHtml(schoolYear)}</span>
                    </div>

                    <!-- Quarter Filter Tabs (Below Context Strip) -->
                    <div class="flex items-center justify-start">
                        ${window.renderReleaseQuarterToggleHtml?.(subjectId, activeQuarter)}
                    </div>

                    <!-- Released Topics Section -->
                    <div class="space-y-3 font-['Inter']">
                        <div class="release-section-header-bar flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b-2 border-black transition-colors gap-1.5 sm:gap-3 w-full">
                            <div class="flex items-center gap-2.5 min-w-0">
                                <button type="button" onclick="window.openTeacherTopicPickerModal?.()"
                                    class="inline-flex items-center gap-2 text-sm sm:text-[17px] font-bold text-black hover:text-[#FFD000] transition-colors cursor-pointer font-['Inter'] tracking-tight text-left">
                                    <i class="fa-solid fa-plus text-sm sm:text-base text-[#15803d] shrink-0"></i>
                                    <span class="whitespace-nowrap">Select Topics</span>
                                </button>
                            </div>
                            <p class="release-section-subtitle text-[11px] sm:text-xs font-normal text-left sm:text-right shrink-0" style="color: rgba(0,0,0,0.45);">Curriculum modules configured for release for this section</p>
                        </div>

                        ${releasedTopicsDisplayHtml}
                    </div>
                </div>

                <!-- Footer -->
                <div class="px-6 sm:px-8 py-5 flex items-center justify-end gap-3 shrink-0 font-['Inter']">
                    <button type="button" onclick="window.closeTeacherReleaseTopicsModal?.(false)"
                        class="sigma-btn sigma-btn-white sigma-btn-md cursor-pointer font-['Inter']">
                        Close
                    </button>
                </div>
            </div>
        `;

        if (isNew) {
            document.body.appendChild(overlay);
        }
        overlay.classList.remove('hidden');
        overlay.style.display = '';
        if (typeof window.lockBodyScroll === 'function') {
            window.lockBodyScroll();
        } else {
            document.documentElement.classList.add('dialog-open', 'modal-open', 'sigma-modal-open', 'has-modal-open');
            document.body.classList.add('dialog-open', 'modal-open', 'sigma-modal-open', 'has-modal-open');
        }
        overlay.classList.add('curriculum-hub-overlay--visible');
    };

    window.cancelTeacherReleaseTopicsDraft = function () {
        if (window._topicReleaseDraftState) {
            window._topicReleaseDraftState.pendingTopicIds = [];
        }
        window.openTeacherReleaseTopicsModal(true);
    };

    // ── Unified Released Items Action Menu Handlers (Topics, Learning Materials, Assessments) ────
    window.closeAllReleasedTopicActionMenus = function () {
        if (typeof window._cleanupReleasedTopicActionMenu === 'function') {
            try { window._cleanupReleasedTopicActionMenu(); } catch (err) {}
            window._cleanupReleasedTopicActionMenu = null;
        }
        const existing = document.getElementById('released-topic-floating-menu');
        if (existing) existing.remove();

        document.querySelectorAll('[id^="released-topic-btn-"], [id^="released-learning-btn-"], [id^="released-assessment-btn-"]').forEach(btn => {
            btn.classList.remove('text-[#FFD000]');
            btn.classList.add('text-black');
        });
    };

    window.toggleReleasedItemActionMenu = function (category, itemId, itemTitle, isHidden = false, e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        const existingMenu = document.getElementById('released-topic-floating-menu');
        const activeItemId = existingMenu?.dataset?.itemId;
        const activeCategory = existingMenu?.dataset?.category;

        // If clicking same open button, toggle it closed
        if (existingMenu && String(activeItemId).trim() === String(itemId).trim() && activeCategory === category) {
            window.closeAllReleasedTopicActionMenus();
            return;
        }

        window.closeAllReleasedTopicActionMenus();

        let prefix = 'released-topic-btn-';
        if (category === 'learning') prefix = 'released-learning-btn-';
        if (category === 'assessments') prefix = 'released-assessment-btn-';

        const btn = document.getElementById(`${prefix}${itemId}`) || e?.currentTarget;
        if (btn) {
            btn.classList.remove('text-black');
            btn.classList.add('text-[#FFD000]');
        }

        const rect = (btn || e?.currentTarget)?.getBoundingClientRect();

        const isMobile = window.innerWidth < 640;
        const menuWidth = isMobile ? 140 : 175;

        const menu = document.createElement('div');
        menu.id = 'released-topic-floating-menu';
        menu.dataset.itemId = String(itemId);
        menu.dataset.category = category;
        menu.className = 'fixed bg-white rounded-lg sm:rounded-xl shadow-xl sm:shadow-2xl border border-black/10 py-1 sm:py-1.5 font-[\'Inter\']';
        menu.style.cssText = `position: fixed; z-index: 9999999; width: ${menuWidth}px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1);`;

        menu.innerHTML = `
            <button type="button" onclick="window.editUnifiedItemSchedule?.('${category}', '${escapeHtml(String(itemId))}', '${escapeHtml(itemTitle || '')}', event)"
                class="w-full px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-left text-[11px] sm:text-xs font-semibold text-black hover:bg-slate-100 flex items-center gap-2 sm:gap-2.5 transition-colors cursor-pointer font-['Inter']">
                <i class="fa-solid fa-clock text-black text-[11px] sm:text-xs w-3.5 text-center"></i>
                <span>Edit Schedule</span>
            </button>
            ${category === 'assessments' ? `
                <button type="button" onclick="window.editUnifiedItemGrading?.('${category}', '${escapeHtml(String(itemId))}', '${escapeHtml(itemTitle || '')}', event)"
                    class="w-full px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-left text-[11px] sm:text-xs font-semibold text-black hover:bg-slate-100 flex items-center gap-2 sm:gap-2.5 transition-colors cursor-pointer font-['Inter']">
                    <i class="fa-solid fa-sliders text-black text-[11px] sm:text-xs w-3.5 text-center"></i>
                    <span>Edit Details</span>
                </button>
            ` : ''}
            ${isHidden ? `
                <button type="button" onclick="window.toggleUnifiedItemHidden?.('${category}', '${escapeHtml(String(itemId))}', false, event)"
                    class="w-full px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-left text-[11px] sm:text-xs font-semibold text-black hover:bg-slate-100 flex items-center gap-2 sm:gap-2.5 transition-colors cursor-pointer font-['Inter']">
                    <i class="fa-solid fa-eye text-black text-[11px] sm:text-xs w-3.5 text-center"></i>
                    <span>Unhide</span>
                </button>
            ` : `
                <button type="button" onclick="window.toggleUnifiedItemHidden?.('${category}', '${escapeHtml(String(itemId))}', true, event)"
                    class="w-full px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-left text-[11px] sm:text-xs font-semibold text-black hover:bg-slate-100 flex items-center gap-2 sm:gap-2.5 transition-colors cursor-pointer font-['Inter']">
                    <i class="fa-solid fa-eye-slash text-black text-[11px] sm:text-xs w-3.5 text-center"></i>
                    <span>Hide</span>
                </button>
            `}
            <div class="h-px bg-black/10 my-0.5 sm:my-1"></div>
            <button type="button" onclick="window.unreleaseUnifiedItem?.('${category}', '${escapeHtml(String(itemId))}', event, '${escapeHtml(itemTitle || '')}')"
                class="w-full px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-left text-[11px] sm:text-xs font-semibold text-black hover:bg-slate-100 flex items-center gap-2 sm:gap-2.5 transition-colors cursor-pointer font-['Inter']">
                <i class="fa-solid fa-arrow-rotate-left text-black text-[11px] sm:text-xs w-3.5 text-center"></i>
                <span>Move to Draft</span>
            </button>
        `;

        document.body.appendChild(menu);

        // Position menu directly under the 3-dots button, right-aligned to it
        if (rect) {
            let left = rect.right - menuWidth;
            let top = rect.bottom + 4;
            if (left < 8) left = 8;
            if (left + menuWidth > window.innerWidth - 8) {
                left = window.innerWidth - menuWidth - 8;
            }
            const approxHeight = category === 'assessments' ? (isMobile ? 125 : 155) : (isMobile ? 95 : 125);
            if (top + approxHeight > window.innerHeight - 8) {
                top = Math.max(8, rect.top - approxHeight - 4);
            }
            menu.style.left = `${left}px`;
            menu.style.top = `${top}px`;
        }

        const triggerTime = Date.now();
        const dismissListener = function (ev) {
            if (Date.now() - triggerTime < 30 && (ev.type === 'click' || ev.type === 'pointerdown' || ev.type === 'touchstart')) {
                return;
            }
            if ((ev.target instanceof Node) && menu.contains(ev.target)) {
                return;
            }
            if (btn && (ev.target === btn || ((ev.target instanceof Node) && btn.contains(ev.target)))) {
                return;
            }
            window.closeAllReleasedTopicActionMenus();
        };

        const keyListener = function (ev) {
            if (ev.key === 'Escape' || ev.keyCode === 27) {
                ev.preventDefault();
                ev.stopPropagation();
                if (typeof ev.stopImmediatePropagation === 'function') {
                    ev.stopImmediatePropagation();
                }
                window.closeAllReleasedTopicActionMenus();
            }
        };

        const scrollListener = function (ev) {
            if ((ev.target instanceof Node) && menu.contains(ev.target)) return;
            window.closeAllReleasedTopicActionMenus();
        };

        const cleanup = function () {
            document.removeEventListener('pointerdown', dismissListener, true);
            document.removeEventListener('click', dismissListener, true);
            document.removeEventListener('touchstart', dismissListener, true);
            window.removeEventListener('scroll', scrollListener, true);
            window.removeEventListener('resize', scrollListener, true);
            document.removeEventListener('keydown', keyListener, true);
        };

        window._cleanupReleasedTopicActionMenu = cleanup;

        document.addEventListener('pointerdown', dismissListener, true);
        document.addEventListener('click', dismissListener, true);
        document.addEventListener('touchstart', dismissListener, true);
        window.addEventListener('scroll', scrollListener, true);
        window.addEventListener('resize', scrollListener, true);
        document.addEventListener('keydown', keyListener, true);
    };

    window.editUnifiedItemSchedule = function (category, itemId, itemTitle, e) {
        if (e) e.stopPropagation();
        window.closeAllReleasedTopicActionMenus();
        window.openTeacherUnifiedScheduleModal?.(category, itemId, itemTitle, 'schedule', 'schedule');
    };

    window.editUnifiedItemGrading = function (category, itemId, itemTitle, e) {
        if (e) e.stopPropagation();
        window.closeAllReleasedTopicActionMenus();
        window.openTeacherUnifiedScheduleModal?.(category, itemId, itemTitle, 'grading', 'grading');
    };

    window.toggleUnifiedItemHidden = function (category, itemId, shouldHide, e) {
        if (e) e.stopPropagation();
        window.closeAllReleasedTopicActionMenus();
        const subjectId = (typeof resolveTeacherActiveSubjectId === 'function')
            ? resolveTeacherActiveSubjectId(window._topicReleaseDraftState?._subjectId || (typeof currentTopicState !== 'undefined' ? currentTopicState?.subjectId : null))
            : (window._topicReleaseDraftState?._subjectId || (typeof currentTopicState !== 'undefined' ? currentTopicState?.subjectId : null) || 'card-prog1');
        const section = (typeof resolveTeacherActiveSection === 'function')
            ? resolveTeacherActiveSection(window._topicReleaseDraftState?._section || (typeof currentTopicState !== 'undefined' ? currentTopicState?.selectedSection : null))
            : (window._topicReleaseDraftState?._section || (typeof currentTopicState !== 'undefined' ? currentTopicState?.selectedSection : null) || '');
        const cleanId = String(subjectId || '').replace(/^(card-|subj-)/, '').trim().toLowerCase();

        let storagePrefix = 'sigma_topic_release';
        if (category === 'learning') storagePrefix = 'sigma_learning_release';
        if (category === 'assessments') storagePrefix = 'sigma_assessment_release';

        let config = null;
        if (category === 'topics' && typeof window.getTopicReleaseConfig === 'function') {
            config = window.getTopicReleaseConfig(subjectId, section);
        } else if (category === 'learning' && typeof window.getLearningMaterialReleaseConfig === 'function') {
            config = window.getLearningMaterialReleaseConfig(subjectId, section);
        } else if (category === 'assessments' && typeof window.getAssessmentReleaseConfig === 'function') {
            config = window.getAssessmentReleaseConfig(subjectId, section);
        }
        if (!config) {
            try {
                config = getStoredJson(`${storagePrefix}_${subjectId}_${section}`, null);
            } catch (err) {}
        }

        if (!config) config = {};
        const idListKey = category === 'topics' ? 'releasedTopicIds' : 'releasedMaterialIds';
        const hiddenListKey = category === 'topics' ? 'hiddenTopicIds' : 'hiddenMaterialIds';

        if (!Array.isArray(config[idListKey])) config[idListKey] = [];
        if (!Array.isArray(config[hiddenListKey])) config[hiddenListKey] = [];

        const targetStr = String(itemId);
        if (!config[idListKey].map(String).includes(targetStr)) {
            config[idListKey].push(targetStr);
        }

        if (shouldHide) {
            if (!config[hiddenListKey].map(String).includes(targetStr)) {
                config[hiddenListKey].push(targetStr);
            }
        } else {
            config[hiddenListKey] = config[hiddenListKey].filter(id => String(id) !== targetStr);
        }

        config.updatedAt = new Date().toISOString();

        if (subjectId) {
            window.saveUnifiedReleaseConfig?.(storagePrefix, subjectId, section, config);
        }

        if (document.getElementById('teacher-release-assessments-overlay')) {
            window.openTeacherReleaseAssessmentsModal?.(true);
        } else if (category === 'topics') {
            if (document.getElementById('teacher-release-topics-overlay')) window.openTeacherReleaseTopicsModal?.(true);
        } else if (category === 'learning') {
            if (document.getElementById('teacher-release-learning-materials-overlay') || document.getElementById('teacher-release-learning-overlay')) window.openTeacherReleaseLearningMaterialsModal?.(true);
        } else if (category === 'assessments') {
            if (document.getElementById('teacher-release-assessments-overlay')) window.openTeacherReleaseAssessmentsModal?.(true);
        }
    };

    window.unreleaseUnifiedItem = function (category, itemId, e, itemTitle = '') {
        if (e) e.stopPropagation();
        window.closeAllReleasedTopicActionMenus();

        const catLabel = category === 'topics' ? 'Topic' : (category === 'learning' ? 'Learning Material' : 'Assessment');
        const displayTitle = itemTitle ? `"${itemTitle}"` : `this ${catLabel.toLowerCase()}`;

        const executeUnrelease = function () {
            const draftKey = category === 'assessments'
                ? '_assessmentsReleaseDraftState'
                : (category === 'learning' ? '_learningMaterialsReleaseDraftState' : '_topicReleaseDraftState');
            const categoryDraft = window[draftKey] || {};
            const subjectId = (typeof resolveTeacherActiveSubjectId === 'function')
                ? resolveTeacherActiveSubjectId(categoryDraft._subjectId || (typeof currentTopicState !== 'undefined' ? currentTopicState?.subjectId : null))
                : (categoryDraft._subjectId || (typeof currentTopicState !== 'undefined' ? currentTopicState?.subjectId : null) || 'card-prog1');
            const section = (typeof window.resolveReleaseActionSection === 'function')
                ? window.resolveReleaseActionSection(category)
                : (categoryDraft._section || (typeof currentTopicState !== 'undefined' ? currentTopicState?.selectedSection : null) || '');
            if (!section) {
                window.closeAskingPanel?.();
                if (typeof window.showToast === 'function') window.showToast('Open this section’s release panel before unreleasing.', 'info');
                return;
            }
            const cleanId = String(subjectId || '').replace(/^(card-|subj-)/, '').trim().toLowerCase();

            let storagePrefix = 'sigma_topic_release';
            if (category === 'learning') storagePrefix = 'sigma_learning_release';
            if (category === 'assessments') storagePrefix = 'sigma_assessment_release';

            let config = null;
            if (category === 'topics' && typeof window.getTopicReleaseConfig === 'function') {
                config = window.getTopicReleaseConfig(subjectId, section);
            } else if (category === 'learning' && typeof window.getLearningMaterialReleaseConfig === 'function') {
                config = window.getLearningMaterialReleaseConfig(subjectId, section);
            } else if (category === 'assessments' && typeof window.getAssessmentReleaseConfig === 'function') {
                config = window.getAssessmentReleaseConfig(subjectId, section);
            }
            if (!config) {
                try {
                    config = getStoredJson(`${storagePrefix}_${subjectId}_${section}`, null);
                    if (!config) config = getStoredJson(`${storagePrefix}_${cleanId}_${section}`, null);
                    if (!config && (!section || section.toLowerCase() === 'all')) config = getStoredJson(`${storagePrefix}_${subjectId}_all`, null);
                } catch (err) {}
            }

            if (!config) config = {};
            const idListKey = category === 'topics' ? 'releasedTopicIds' : 'releasedMaterialIds';
            const hiddenListKey = category === 'topics' ? 'hiddenTopicIds' : 'hiddenMaterialIds';
            const schedKey = category === 'topics' ? 'topicSchedules' : 'materialSchedules';
            const dateKey = category === 'topics' ? 'topicReleaseDates' : 'materialReleaseDates';

            if (!Array.isArray(config[idListKey])) config[idListKey] = [];
            if (!Array.isArray(config[hiddenListKey])) config[hiddenListKey] = [];
            if (!config[schedKey] || typeof config[schedKey] !== 'object') config[schedKey] = {};
            if (!config[dateKey] || typeof config[dateKey] !== 'object') config[dateKey] = {};

            // Build comprehensive set of all identifiers and aliases to unrelease
            const idsToRemove = new Set();
            if (itemId !== undefined && itemId !== null && itemId !== '') {
                idsToRemove.add(String(itemId).trim());
                idsToRemove.add(String(itemId).trim().toLowerCase());
            }
            if (itemTitle) {
                idsToRemove.add(String(itemTitle).trim());
                idsToRemove.add(String(itemTitle).trim().toLowerCase());
            }

            if (category === 'topics') {
                const allTopics = (typeof getTeacherAllSubjectTopics === 'function') ? getTeacherAllSubjectTopics(subjectId, section) : [];
                allTopics.forEach((t, idx) => {
                    const tId = t?.id !== undefined ? String(t.id).trim() : `topic-${idx}`;
                    const tTitle = String(t?.title || t?.name || '').trim();
                    const isMatch = (tId === String(itemId).trim() ||
                                     (itemTitle && tTitle.toLowerCase() === String(itemTitle).trim().toLowerCase()) ||
                                     (itemId && (tTitle.toLowerCase() === String(itemId).trim().toLowerCase() || `topic-${idx}` === String(itemId).trim() || `topic-${idx + 1}` === String(itemId).trim())));
                    if (isMatch) {
                        if (t?.id !== undefined && t?.id !== '') {
                            idsToRemove.add(String(t.id).trim());
                            idsToRemove.add(String(t.id).trim().toLowerCase());
                        }
                        if (tTitle) {
                            idsToRemove.add(tTitle);
                            idsToRemove.add(tTitle.toLowerCase());
                        }
                        idsToRemove.add(`topic-${idx}`);
                        idsToRemove.add(`topic-${idx + 1}`);
                    }
                });
            } else if (category === 'learning') {
                const allMat = (typeof window.getTeacherSubjectLearningMaterials === 'function') ? window.getTeacherSubjectLearningMaterials(subjectId, section) : [];
                allMat.forEach(m => {
                    const mId = String(m?.id || '').trim();
                    const mTitle = String(m?.title || m?.name || '').trim();
                    if (mId === String(itemId).trim() || (itemTitle && mTitle.toLowerCase() === String(itemTitle).trim().toLowerCase())) {
                        if (mId) { idsToRemove.add(mId); idsToRemove.add(mId.toLowerCase()); }
                        if (mTitle) { idsToRemove.add(mTitle); idsToRemove.add(mTitle.toLowerCase()); }
                    }
                });
            } else if (category === 'assessments') {
                const allAss = (typeof window.getTeacherSubjectAssessments === 'function') ? window.getTeacherSubjectAssessments(subjectId, section) : [];
                allAss.forEach(a => {
                    const aId = String(a?.id || '').trim();
                    const aTitle = String(a?.title || a?.name || '').trim();
                    if (aId === String(itemId).trim() || (itemTitle && aTitle.toLowerCase() === String(itemTitle).trim().toLowerCase())) {
                        if (aId) { idsToRemove.add(aId); idsToRemove.add(aId.toLowerCase()); }
                        if (aTitle) { idsToRemove.add(aTitle); idsToRemove.add(aTitle.toLowerCase()); }
                    }
                });
            }

            const shouldRemoveId = (id) => {
                const idStr = String(id).trim();
                return idsToRemove.has(idStr) || idsToRemove.has(idStr.toLowerCase());
            };

            config[idListKey] = config[idListKey].filter(id => !shouldRemoveId(id));
            config[hiddenListKey] = config[hiddenListKey].filter(id => !shouldRemoveId(id));
            Array.from(idsToRemove).forEach(k => {
                delete config[schedKey][k];
                delete config[dateKey][k];
                if (config.assignedStudents) delete config.assignedStudents[k];
            });
            config.updatedAt = new Date().toISOString();

            window.closeAskingPanel?.();

            // Optimistic row removal and count update from the active release modal DOM
            try {
                const overlayId = category === 'topics' 
                    ? 'teacher-release-topics-overlay' 
                    : (category === 'learning' ? 'teacher-release-learning-materials-overlay' : 'teacher-release-assessments-overlay');
                const modalEl = document.getElementById(overlayId);
                if (modalEl) {
                    const btnEl = modalEl.querySelector(`[id*="${itemId}"]`) || modalEl.querySelector(`[onclick*="${itemId}"]`);
                    const rowEl = btnEl ? (btnEl.closest('.p-4') || btnEl.closest('.p-3') || btnEl.parentElement) : null;
                    if (rowEl) rowEl.remove();

                    // Update count badge & check if empty
                    const listPanel = modalEl.querySelector('.sigma-selected-faded-panel');
                    const remainingRows = listPanel ? listPanel.querySelectorAll('.p-4, .p-3') : [];
                    const countBadge = modalEl.querySelector('.text-sm.font-normal[style*="color"]');
                    if (countBadge && remainingRows.length > 0) {
                        countBadge.textContent = `${remainingRows.length} Released`;
                    }
                }
            } catch(e) {}

            let formattedTitle = itemTitle || '';
            if (category === 'topics') {
                const allTopics = (typeof getTeacherAllSubjectTopics === 'function') ? getTeacherAllSubjectTopics(subjectId, section) : [];
                let fTop = allTopics.find((t, idx) => String(t.id || `topic-${idx}`) === String(itemId) || String(t.title || '').trim().toLowerCase() === String(itemTitle || '').trim().toLowerCase());
                let tIdx = allTopics.indexOf(fTop);
                let topNum = fTop ? (fTop.topicNumber || fTop.number || (tIdx >= 0 ? tIdx + 1 : '')) : '';
                let rawT = fTop?.title || itemTitle || 'Topic';
                if (!/^topic\s*\d+/i.test(rawT) && topNum) {
                    formattedTitle = `Topic ${topNum}: ${rawT}`;
                } else {
                    formattedTitle = rawT;
                }
            } else if (!formattedTitle) {
                formattedTitle = `${catLabel} ${itemId}`;
            }

            const isModalOpen = Boolean(document.getElementById('teacher-release-assessments-overlay') || document.getElementById('curriculum-hub-overlay') || document.getElementById('teacher-release-topics-overlay') || document.getElementById('teacher-release-learning-materials-overlay'));
            if (isModalOpen) {
                window.queueTeacherReleaseToast?.({ title: formattedTitle, action: 'unreleased', category });
            } else {
                window.showTeacherReleaseToast?.(`${formattedTitle} moved to Draft`, 'unreleased');
            }

            // Defer background storage write and topic UI refresh to prevent main thread blocking
            setTimeout(() => {
                if (subjectId && section) {
                    if (typeof window.saveUnifiedReleaseConfig === 'function') {
                        window.saveUnifiedReleaseConfig(storagePrefix, subjectId, section, config);
                    } else {
                        try {
                            const cfgStr = JSON.stringify(config);
                            localStorage.setItem(`${storagePrefix}_${subjectId}_${section}`, cfgStr);
                            localStorage.setItem(`${storagePrefix}_clean_${cleanId}_${section}`, cfgStr);
                            localStorage.setItem(`${storagePrefix}_${cleanId}_${section}`, cfgStr);
                            localStorage.setItem(`${storagePrefix}_card-${cleanId}_${section}`, cfgStr);
                            if (!section || section.toLowerCase() === 'all') {
                                localStorage.setItem(`${storagePrefix}_${subjectId}_all`, cfgStr);
                                localStorage.setItem(`${storagePrefix}_${cleanId}_all`, cfgStr);
                            }
                        } catch (err) {}
                    }
                }

                if (typeof refreshTeacherTopicUIIfVisible === 'function') {
                    refreshTeacherTopicUIIfVisible(subjectId);
                }
                if (document.getElementById('teacher-release-assessments-overlay')) {
                    window.openTeacherReleaseAssessmentsModal?.(true);
                } else if (category === 'assessments') window.openTeacherReleaseAssessmentsModal?.(true);
                else if (category === 'learning') window.openTeacherReleaseLearningMaterialsModal?.(true);
                else window.openTeacherReleaseTopicsModal?.(true);
            }, 10);
        };

        // Confirmation warning dialog before unreleasing
        if (typeof window.openAskingPanel === 'function') {
            window.openAskingPanel({
                type: 'danger',
                icon: 'fa-solid fa-triangle-exclamation text-amber-500',
                title: `Move ${catLabel} to Draft?`,
                message: `Are you sure you want to move ${displayTitle} to Draft? Students will not be able to see or access it in their classroom portal.`,
                confirmText: 'Move to Draft',
                cancelText: 'Cancel',
                showCancel: true,
                onConfirm: executeUnrelease
            });
        } else if (confirm(`Warning: Are you sure you want to move ${displayTitle} to Draft? Students will not be able to see or access it.`)) {
            executeUnrelease();
        }
    };

    // Category aliases for 3-dots menus
    window.toggleReleasedTopicActionMenu = function (topicId, topicTitle, isHidden = false, e) {
        window.toggleReleasedItemActionMenu('topics', topicId, topicTitle, isHidden, e);
    };

    window.toggleTeacherTopicHidden = function (topicId, e) {
        window.toggleUnifiedItemHidden('topics', topicId, true, e);
    };

    window.unreleaseTeacherTopic = function (topicId, e, title = '') {
        window.unreleaseUnifiedItem('topics', topicId, e, title);
    };

    // ── Reset Topic to Batch Helper Functions ──────────────────────────────────
    window.resetTopicToBatch = function (topicId, fromScheduleModal = false) {
        if (!window._topicReleaseDraftState) window._topicReleaseDraftState = {};
        if (!window._topicReleaseDraftState.topicSchedules) window._topicReleaseDraftState.topicSchedules = {};
        delete window._topicReleaseDraftState.topicSchedules[topicId];
        if (fromScheduleModal) {
            const overlay = document.getElementById('teacher-topic-schedule-overlay');
            if (overlay) overlay.remove();
        }
        window.openTeacherReleaseTopicsModal?.(true);
    };

    window.resetAllTopicsToBatch = function () {
        if (!window._topicReleaseDraftState) window._topicReleaseDraftState = {};
        window._topicReleaseDraftState.topicSchedules = {};
        window.openTeacherReleaseTopicsModal?.(true);
    };

    // ── Dedicated Sub-Modal for Topic Picker ───────────────────────────────────
    window.openTeacherTopicPickerModal = function () {
        const subjectId = (typeof resolveTeacherActiveSubjectId === 'function')
            ? resolveTeacherActiveSubjectId(window._topicReleaseDraftState?._subjectId || (typeof currentTopicState !== 'undefined' ? currentTopicState?.subjectId : null))
            : (window._topicReleaseDraftState?._subjectId || (typeof currentTopicState !== 'undefined' ? currentTopicState?.subjectId : null) || 'card-prog1');
        const section = (typeof resolveTeacherActiveSection === 'function')
            ? resolveTeacherActiveSection(window._topicReleaseDraftState?._section || (typeof currentTopicState !== 'undefined' ? currentTopicState?.selectedSection : null))
            : (window._topicReleaseDraftState?._section || (typeof currentTopicState !== 'undefined' ? currentTopicState?.selectedSection : null) || '');
        if (typeof currentTopicState !== 'undefined' && currentTopicState) {
            currentTopicState.subjectId = subjectId;
            currentTopicState.selectedSection = section;
            window.currentTopicState = currentTopicState;
        }
        const data = subjectId ? getTopicData(subjectId) : null;
        const subject = subjectId ? getTopicSubject(subjectId) : null;
        const topics = getTeacherAllSubjectTopics(subjectId, section);

        const adminSections = getStoredJson('sigma-admin-sections', []);
        const cleanSectionName = (section || '').trim().toLowerCase();
        const matchedSec = adminSections.find(s => {
            const sName = (s.name || s.sectionName || '').trim().toLowerCase();
            return sName === cleanSectionName || (cleanSectionName && (sName.includes(cleanSectionName) || cleanSectionName.includes(sName)));
        });

        let sectionNameOnly = matchedSec?.name || section;
        let gradeLevel = matchedSec?.grade || (section.includes('Grade 12') ? 'Grade 12' : 'Grade 11');
        let roomNumber = matchedSec?.room || '302';
        let schoolYear = matchedSec?.schoolYear || '2026–2027';

        if (!matchedSec && section) {
            if (section.includes(' - ')) {
                const parts = section.split(' - ');
                if (parts[0].includes('Grade')) gradeLevel = parts[0].trim();
                sectionNameOnly = parts.slice(1).join(' - ').trim() || section;
            }
        }

        // Get already released topics to filter them out
        let saved = (typeof window.getTopicReleaseConfig === 'function')
            ? window.getTopicReleaseConfig(subjectId, section)
            : null;
        if (!saved) {
            try {
                saved = getStoredJson(`sigma_topic_release_${subjectId}_${section}`, null);
            } catch (e) {}
        }
        const releasedTopicIds = (saved && Array.isArray(saved.releasedTopicIds))
            ? saved.releasedTopicIds.map(String)
            : [];

        const availableQuarters = (typeof window.getSubjectReleaseQuarters === 'function')
            ? window.getSubjectReleaseQuarters(subjectId)
            : ['q1', 'q2'];
        let activeQuarter = (typeof window.getActiveReleaseQuarter === 'function') ? window.getActiveReleaseQuarter() : 'q1';
        if (!availableQuarters.includes(activeQuarter.toLowerCase())) {
            activeQuarter = availableQuarters[0] || 'q1';
            window.setActiveReleaseQuarter?.(activeQuarter);
        }
        const quarterTopics = topics.filter(t => (t.quarter || 'q1').toLowerCase() === activeQuarter.toLowerCase());

        // Only show unreleased topics in the picker!
        const unreleasedTopics = quarterTopics.filter((t, idx) => {
            const originalIdx = topics.indexOf(t);
            const topicCand = [
                t?.id !== undefined && t?.id !== '' ? String(t.id) : `topic-${originalIdx >= 0 ? originalIdx : idx}`,
                t?.title ? String(t.title).trim() : '',
                t?.title ? String(t.title).trim().toLowerCase() : ''
            ].filter(Boolean);
            if (!t?.id) topicCand.push(`topic-${originalIdx >= 0 ? originalIdx : idx}`);
            return !topicCand.some(c => releasedTopicIds.includes(c));
        });

        const draftPendingIds = window._topicReleaseDraftState?.pendingTopicIds || [];

        // Hide release topics overlay temporarily without tearing it down
        const prevReleaseModal = document.getElementById('teacher-release-topics-overlay');

        let existing = document.getElementById('teacher-topic-picker-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'teacher-topic-picker-overlay';
        overlay.className = 'curriculum-hub-overlay curriculum-hub-overlay--visible';
        overlay.dataset._historyPushed = 'true';
        overlay.onclick = function (e) {
            e.stopPropagation();
        };

        if (typeof window.pushModalHistoryState === 'function') {
            window.pushModalHistoryState('teacher-topic-picker-overlay');
        }

        const quarterLabel = (typeof window.getReleaseQuarterLabel === 'function') ? window.getReleaseQuarterLabel(activeQuarter) : '1st Quarter';
        const topicsPickerListHtml = unreleasedTopics.length === 0 ? `
            <div class="sigma-empty-state-black-fade p-6 rounded-2xl border-2 border-dashed border-black/10 bg-black/[0.02] text-center font-['Inter']">
                <p class="empty-title text-xs font-semibold text-black/60 font-['Inter']" style="color: rgba(0,0,0,0.60);">All Topics for ${quarterLabel} Have Already Been Released</p>
                <p class="empty-desc text-[11px] font-normal text-black-fade mt-0.5 font-['Inter']" style="color: rgba(0,0,0,0.45);">Use "Change Schedule" in Released Topics if you wish to adjust release dates.</p>
            </div>
        ` : `
            <div class="border-y border-black/10 divide-y divide-black/5 font-['Inter']" id="topic-picker-checkbox-list">
                ${unreleasedTopics.map((t) => {
                    const originalIdx = topics.indexOf(t);
                    const displayNum = originalIdx >= 0 ? originalIdx + 1 : 1;
                    const topicId = t.id !== undefined ? String(t.id) : `topic-${originalIdx >= 0 ? originalIdx : 0}`;
                    const isChecked = draftPendingIds.includes(String(topicId));
                    return `
                        <label class="p-3.5 hover:bg-black/[0.03] flex items-center justify-between gap-3.5 cursor-pointer transition-colors">
                            <div class="flex items-center gap-3.5 min-w-0 flex-1">
                                <div class="w-7 h-7 rounded-full bg-[#15803d] text-white flex items-center justify-center text-xs font-bold shrink-0 font-['Inter'] shadow-2xs">
                                    ${displayNum}
                                </div>
                                <h4 class="text-xs font-bold text-black font-['Inter'] truncate">${escapeHtml(t.title || `Topic ${displayNum}`)}</h4>
                            </div>
                            <input type="checkbox" name="picker-topic-item" value="${escapeHtml(String(topicId))}" ${isChecked ? 'checked' : ''}
                                onchange="window.syncTopicPickerSelectBtn?.()"
                                style="accent-color: #15803d;"
                                class="w-4 h-4 rounded border-slate-300 accent-[#15803d] text-[#15803d] focus:ring-0 cursor-pointer shrink-0" />
                        </label>
                    `;
                }).join('')}
            </div>
        `;

        overlay.innerHTML = `
            <div class="curriculum-hub-panel curriculum-picker-panel-fixed curriculum-release-panel-fixed w-full !max-w-[860px] flex flex-col overflow-hidden" style="height: 740px; min-height: min(740px, calc(100vh - 40px)); max-height: calc(100vh - 40px); max-width: 860px;" onclick="event.stopPropagation()">
                <!-- Header -->
                <div class="px-6 sm:px-8 py-5 border-b border-slate-100 flex items-center justify-between shrink-0 font-['Inter']">
                    <div class="flex items-center gap-3">
                        <button type="button" 
                            class="picker-header-back-btn p-1 bg-transparent hover:bg-transparent flex sm:hidden items-center justify-center text-black hover:text-black/70 transition-colors cursor-pointer shrink-0 border-0 outline-none"
                            onclick="window.closeTeacherTopicPickerModal?.(true, true)"
                            title="Back">
                            <i class="fa-solid fa-chevron-left text-sm text-black"></i>
                        </button>
                        <div>
                            <h2 class="text-xl font-bold text-black font-['Inter'] tracking-tight">Select Topics to Release</h2>
                            <p class="text-xs font-medium text-black-fade font-['Inter'] mt-0.5">Select draft curriculum modules to make available for this section</p>
                        </div>
                    </div>
                </div>

                <!-- Body -->
                <div class="p-6 sm:p-8 overflow-y-auto flex-1 space-y-5 font-['Inter']">
                    <!-- Section Context Strip -->
                    <div class="flex flex-wrap items-center gap-2 sm:gap-4 px-4 py-2.5 bg-black/[0.03] border border-black/10 rounded-xl text-xs font-['Inter'] font-medium text-black">
                        <span><b>Section:</b> ${escapeHtml(sectionNameOnly)}</span>
                        <span class="text-black/20">|</span>
                        <span><b>Grade:</b> ${escapeHtml(gradeLevel)}</span>
                        <span class="text-black/20">|</span>
                        <span><b>Room:</b> ${escapeHtml(roomNumber)}</span>
                        <span class="text-black/20">|</span>
                        <span><b>SY:</b> ${escapeHtml(schoolYear)}</span>
                    </div>

                    <!-- Quarter Filter Tabs (Below Context Strip) -->
                    <div class="flex items-center justify-start">
                        ${window.renderReleaseQuarterToggleHtml?.(subjectId, activeQuarter)}
                    </div>

                    <!-- Actions Row (Select All / Deselect All) -->
                    <div class="flex items-center justify-between px-1">
                        <span class="text-xs font-bold text-black font-['Inter']">${unreleasedTopics.length} Draft Topics</span>
                        <div class="flex items-center gap-1 text-xs font-semibold font-['Inter']">
                            <button type="button" onclick="window.toggleAllPickerTopics?.(true)" class="px-2 py-1 rounded-lg text-[#15803d] hover:bg-emerald-50 active:bg-emerald-100 transition-colors cursor-pointer" style="color: #15803d;">Select All</button>
                            <span class="text-slate-300">|</span>
                            <button type="button" id="picker-deselect-all-btn" onclick="window.toggleAllPickerTopics?.(false)"
                                ${draftPendingIds.length > 0 ? '' : 'disabled'}
                                class="${draftPendingIds.length > 0 ? 'px-2 py-1 rounded-lg text-[#15803d] hover:bg-emerald-50 active:bg-emerald-100 cursor-pointer' : 'px-2 py-1 rounded-lg text-[#15803d] opacity-40 cursor-not-allowed pointer-events-none'} transition-colors"
                                style="color: #15803d;">
                                Deselect All
                            </button>
                        </div>
                    </div>

                    <!-- Topics Checkbox List -->
                    ${topicsPickerListHtml}
                </div>

                <!-- Footer -->
                <div class="px-6 sm:px-8 py-4 sm:py-5 flex items-center justify-between gap-3 shrink-0 font-['Inter'] w-full">
                    <button type="button" onclick="window.closeTeacherTopicPickerModal?.(true, true)"
                        class="picker-footer-back-btn sigma-btn sigma-btn-white sigma-btn-md cursor-pointer font-['Inter']">
                        Back
                    </button>
                    <button type="button" id="topic-picker-submit-btn" onclick="window.saveTeacherTopicPickerSelection?.()"
                        ${draftPendingIds.length > 0 ? '' : 'disabled'}
                        class="sigma-btn sigma-btn-primary h-9 sm:h-[42px] px-5 sm:px-7 text-xs sm:text-sm font-semibold rounded-xl ${draftPendingIds.length > 0 ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed pointer-events-none'} font-['Inter'] inline-flex items-center gap-2 order-2 ml-auto">
                        <span>Set Schedule</span>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        if (prevReleaseModal && prevReleaseModal !== overlay) {
            prevReleaseModal.classList.add('hidden');
        }
        window.syncTopicPickerSelectBtn?.();
    };

    window.syncTopicPickerSelectBtn = function () {
        const checkedCount = document.querySelectorAll('#teacher-topic-picker-overlay input[name="picker-topic-item"]:checked').length;
        const selectBtn = document.getElementById('topic-picker-submit-btn');
        if (selectBtn) {
            if (checkedCount > 0) {
                selectBtn.disabled = false;
                selectBtn.className = "sigma-btn sigma-btn-primary sigma-btn-md cursor-pointer font-['Inter'] inline-flex items-center gap-2";
                selectBtn.innerHTML = `
                    <span>Set Schedule</span>
                    ${checkedCount > 1 ? `
                        <span class="px-1.5 py-0.5 rounded-full bg-white/20 text-white text-xs font-bold leading-none min-w-[20px] text-center">
                            ${checkedCount}
                        </span>
                    ` : ''}
                `;
            } else {
                selectBtn.disabled = true;
                selectBtn.className = "sigma-btn sigma-btn-primary sigma-btn-md font-['Inter'] opacity-40 cursor-not-allowed pointer-events-none inline-flex items-center gap-2";
                selectBtn.innerHTML = `<span>Set Schedule</span>`;
            }
        }
        window.syncTopicPickerDeselectBtn?.();
    };

    window.syncTopicPickerDeselectBtn = function () {
        const checkedCount = document.querySelectorAll('#teacher-topic-picker-overlay input[name="picker-topic-item"]:checked').length;
        const deselectBtn = document.getElementById('picker-deselect-all-btn');
        if (!deselectBtn) return;
        deselectBtn.style.color = '#15803d';
        if (checkedCount > 0) {
            deselectBtn.disabled = false;
            deselectBtn.className = 'px-2 py-1 rounded-lg text-[#15803d] font-semibold hover:bg-emerald-50 active:bg-emerald-100 cursor-pointer transition-colors';
        } else {
            deselectBtn.disabled = true;
            deselectBtn.className = 'px-2 py-1 rounded-lg text-[#15803d] opacity-40 cursor-not-allowed pointer-events-none transition-colors';
        }
    };

    window.toggleAllPickerTopics = function (selectAll) {
        document.querySelectorAll('#teacher-topic-picker-overlay input[name="picker-topic-item"]').forEach(cb => cb.checked = selectAll);
        window.syncTopicPickerSelectBtn?.();
    };

    window.closeTeacherTopicPickerModal = function (returnToReleaseModal = false, isCancel = false) {
        if (returnToReleaseModal) {
            if (isCancel && window._topicReleaseDraftState) {
                window._topicReleaseDraftState.pendingTopicIds = [];
            }
            const prevReleaseModal = document.getElementById('teacher-release-topics-overlay');
            if (prevReleaseModal) {
                prevReleaseModal.classList.remove('hidden');
                prevReleaseModal.style.display = '';
                prevReleaseModal.classList.add('curriculum-hub-overlay--visible');
            } else {
                window.openTeacherReleaseTopicsModal?.(true);
            }
        } else {
            window.closeManageCurriculumHub?.();
            document.querySelectorAll('#curriculum-hub-overlay, #teacher-release-topics-overlay, #teacher-topic-picker-overlay, #teacher-topic-schedule-overlay').forEach(el => el.remove());
            if (typeof window.unlockBodyScroll === 'function') window.unlockBodyScroll();
        }
        const overlay = document.getElementById('teacher-topic-picker-overlay');
        if (overlay) overlay.remove();
    };

    window.saveTeacherTopicPickerSelection = function () {
        const checked = Array.from(document.querySelectorAll('#teacher-topic-picker-overlay input[name="picker-topic-item"]:checked')).map(el => el.value);
        if (checked.length === 0) return;
        if (!window._topicReleaseDraftState) window._topicReleaseDraftState = {};
        window._topicReleaseDraftState.pendingTopicIds = checked;
        window._topicReleaseDraftState._isPickerFlow = true;
        const subjectId = (typeof resolveTeacherActiveSubjectId === 'function') ? resolveTeacherActiveSubjectId(currentTopicState?.subjectId) : currentTopicState?.subjectId;
        const section = (typeof resolveTeacherActiveSection === 'function') ? resolveTeacherActiveSection(currentTopicState?.selectedSection) : currentTopicState?.selectedSection;
        window._topicReleaseDraftState._subjectId = subjectId;
        window._topicReleaseDraftState._section = section;

        window.openTeacherUnifiedScheduleModal?.('topics', null, '', 'schedule');
    };

    // ── Unified Schedule Sub-Modal (Topics, Learning Materials, Assessments) ──
    window.getUnifiedScheduleMeta = function (category) {
        if (category === 'learning') {
            return {
                category: 'learning',
                labelPlural: 'learning materials',
                labelPluralTitleCase: 'Learning Materials',
                labelSingle: 'Learning Material',
                storagePrefix: 'sigma_learning_release',
                draftStateKey: '_learningMaterialsReleaseDraftState',
                pendingKey: 'pendingMaterialIds',
                scheduleKey: 'materialSchedules',
                endScheduleKey: 'materialEndSchedules',
                releaseDateKey: 'materialReleaseDates',
                releasedIdKey: 'releasedMaterialIds',
                hiddenIdKey: 'hiddenMaterialIds'
            };
        } else if (category === 'assessments') {
            return {
                category: 'assessments',
                labelPlural: 'assessments',
                labelPluralTitleCase: 'Assessments',
                labelSingle: 'Assessment',
                storagePrefix: 'sigma_assessment_release',
                draftStateKey: '_assessmentsReleaseDraftState',
                pendingKey: 'pendingMaterialIds',
                scheduleKey: 'materialSchedules',
                endScheduleKey: 'materialEndSchedules',
                releaseDateKey: 'materialReleaseDates',
                releasedIdKey: 'releasedMaterialIds',
                hiddenIdKey: 'hiddenMaterialIds'
            };
        }
        return {
            category: 'topics',
            labelPlural: 'topics',
            labelPluralTitleCase: 'Topics',
            labelSingle: 'Topic',
            storagePrefix: 'sigma_topic_release',
            draftStateKey: '_topicReleaseDraftState',
            pendingKey: 'pendingTopicIds',
            scheduleKey: 'topicSchedules',
            endScheduleKey: 'topicEndSchedules',
            releaseDateKey: 'topicReleaseDates',
            releasedIdKey: 'releasedTopicIds',
            hiddenIdKey: 'hiddenTopicIds'
        };
    };

    const findQuizInfo = (subjId, effId, tgtTitle, foundAssObj) => {
        if (typeof window.findQuizInfo === 'function') {
            return window.findQuizInfo(subjId, effId, tgtTitle, foundAssObj);
        }
        return { points: null, hasEssay: false, essayCount: 0, matchedQuiz: null };
    };

    const findQuizHps = (subjId, effId, tgtTitle, foundAssObj) => {
        if (typeof window.findQuizHps === 'function') {
            return window.findQuizHps(subjId, effId, tgtTitle, foundAssObj);
        }
        return findQuizInfo(subjId, effId, tgtTitle, foundAssObj).points;
    };

    if (typeof window.resolveAssessmentHPS !== 'function') {
        window.resolveAssessmentHPS = function (ass, subjectId, targetSection, category, aIdx) {
            return { points: Number(ass?.max || ass?.maxScore || 100) || 100, isLocked: false };
        };
    }
    window.resolveQuizHpsPoints = window.resolveAssessmentHPS;

    window.openTeacherUnifiedScheduleModal = function (category = 'topics', targetId = null, targetTitle = '', activeStep = 'schedule', editType = '') {
        const meta = window.getUnifiedScheduleMeta(category);
        const subjectId = resolveTeacherActiveSubjectId(currentTopicState?.subjectId);
        let section = resolveTeacherActiveSection(currentTopicState?.selectedSection);
        if (typeof currentTopicState !== 'undefined') {
            currentTopicState.subjectId = subjectId;
            currentTopicState.selectedSection = section;
            window.currentTopicState = currentTopicState;
        }

        const adminSections = getStoredJson('sigma-admin-sections', []);
        const cleanSectionName = (section || '').trim().toLowerCase();
        const subjectCandidates = getSubjectCandidateStrings(subjectId);

        let matchedSec = null;
        if (subjectCandidates.size > 0 && Array.isArray(adminSections) && cleanSectionName) {
            matchedSec = adminSections.find(s => {
                if (!s || s.status === 'Draft') return false;
                if (!isSectionMatch(s, cleanSectionName)) return false;
                return isSubjectMatch(s.subject, subjectCandidates);
            });
        }
        if (!matchedSec && typeof getTeacherSectionCards === 'function' && cleanSectionName) {
            const cards = getTeacherSectionCards();
            const matchedCard = cards.find(c => {
                if (!isSectionMatch({ name: c.sectionName || c.section }, cleanSectionName)) return false;
                if (subjectCandidates.size > 0) {
                    return isSubjectMatch(c.subject || c.name, subjectCandidates);
                }
                return true;
            });
            if (matchedCard?.rawSection) matchedSec = matchedCard.rawSection;
        }
        if (!matchedSec && Array.isArray(adminSections) && cleanSectionName) {
            matchedSec = adminSections.find(s => s && s.status !== 'Draft' && isSectionMatch(s, cleanSectionName));
        }

        // Keep the section that was opened. Another section of the same subject is a separate store.

        if (!section) section = matchedSec?.name || 'Grade 11 - ICT A';

        let sectionNameOnly = matchedSec?.name || section;
        let gradeLevel = matchedSec?.grade || matchedSec?.gradeLevel || (section.includes('Grade 12') ? 'Grade 12' : 'Grade 11');
        let roomNumber = matchedSec?.room || '302';
        let schoolYear = matchedSec?.schoolYear || '2026–2027';

        let saved = null;
        if (category === 'topics' && typeof window.getTopicReleaseConfig === 'function') {
            saved = window.getTopicReleaseConfig(subjectId, section);
        } else if (category === 'learning' && typeof window.getLearningMaterialReleaseConfig === 'function') {
            saved = window.getLearningMaterialReleaseConfig(subjectId, section);
        } else if (category === 'assessments' && typeof window.getAssessmentReleaseConfig === 'function') {
            saved = window.getAssessmentReleaseConfig(subjectId, section);
        }
        if (!saved) {
            try {
                saved = getStoredJson(`${meta.storagePrefix}_${subjectId}_${section}`, null);
            } catch (e) {}
        }

        const isModalAlreadyOpen = Boolean(document.getElementById('teacher-topic-schedule-overlay'));
        const effectiveEditType = editType || (window[meta.draftStateKey] ? window[meta.draftStateKey]._editType : '');
        const isEditMode = (effectiveEditType === 'schedule' || effectiveEditType === 'grading' || effectiveEditType === 'edit');
        const isFreshSetSchedule = !isModalAlreadyOpen && !isEditMode;

        const existingDraft = window[meta.draftStateKey] || {};
        const isPicker = Boolean(existingDraft._isPickerFlow || (!targetId && !isEditMode));

        if (isFreshSetSchedule) {
            window[meta.draftStateKey] = {
                _inSession: true,
                _isPickerFlow: isPicker,
                _subjectId: subjectId,
                _section: section,
                [meta.pendingKey]: (Array.isArray(existingDraft[meta.pendingKey])) ? existingDraft[meta.pendingKey] : (targetId ? [targetId] : []),
                [meta.scheduleKey]: {},
                [meta.endScheduleKey]: {},
                assessmentMaxScores: {},
                assessmentWeights: {},
                assessmentActivityComponents: {},
                assessmentMaxAttempts: {},
                assessmentLatePermissions: {},
                assessmentAutoSubmitOnExit: {},
                assessmentGradingModes: {},
                assessmentEssayGradingModes: {},
                assessmentShowCorrectAnswers: {},
                assessmentAiAssisted: {},
                assessmentRubrics: {},
                assignedStudents: {}
            };
        } else if (!window[meta.draftStateKey] || !isModalAlreadyOpen) {
            window[meta.draftStateKey] = {
                _inSession: true,
                _isPickerFlow: isPicker,
                _subjectId: subjectId,
                _section: section,
                [meta.pendingKey]: (Array.isArray(existingDraft[meta.pendingKey])) ? existingDraft[meta.pendingKey] : (targetId ? [targetId] : []),
                [meta.scheduleKey]: { ...(saved?.[meta.scheduleKey] || {}) },
                [meta.endScheduleKey]: { ...(saved?.[meta.endScheduleKey] || {}) },
                assessmentMaxScores: { ...(saved?.assessmentMaxScores || {}) },
                assessmentWeights: { ...(saved?.assessmentWeights || {}) },
                assessmentActivityComponents: { ...(saved?.assessmentActivityComponents || {}) },
                assessmentMaxAttempts: { ...(saved?.assessmentMaxAttempts || {}) },
                assessmentLatePermissions: { ...(saved?.assessmentLatePermissions || {}) },
                assessmentAutoSubmitOnExit: { ...(saved?.assessmentAutoSubmitOnExit || {}) },
                assessmentGradingModes: { ...(saved?.assessmentGradingModes || {}) },
                assessmentEssayGradingModes: { ...(saved?.assessmentEssayGradingModes || {}) },
                assessmentShowCorrectAnswers: { ...(saved?.assessmentShowCorrectAnswers || {}) },
                assessmentAiAssisted: { ...(saved?.assessmentAiAssisted || {}) },
                assessmentRubrics: { ...(saved?.assessmentRubrics || {}) },
                assignedStudents: { ...(saved?.assignedStudents || {}) }
            };
        }

        const draft = window[meta.draftStateKey];
        if (isFreshSetSchedule) {
            delete draft._scheduleStartVal;
            delete draft._scheduleEndVal;
            delete draft._initialSnapshot;
            draft.startTime = '';
            draft.endTime = '';
        }
        const pendingIds = draft[meta.pendingKey] || [];
        const isSingleSelected = pendingIds.length === 1;
        let effectiveId = targetId || (isSingleSelected ? pendingIds[0] : (pendingIds.length > 0 ? pendingIds[0] : null));

        if (!draft[meta.scheduleKey]) draft[meta.scheduleKey] = isEditMode ? { ...(saved?.[meta.scheduleKey] || {}) } : {};
        if (!draft[meta.endScheduleKey]) draft[meta.endScheduleKey] = isEditMode ? { ...(saved?.[meta.endScheduleKey] || {}) } : {};
        if (!draft.assessmentMaxScores) draft.assessmentMaxScores = isEditMode ? { ...(saved?.assessmentMaxScores || {}) } : {};
        if (!draft.assessmentWeights) draft.assessmentWeights = isEditMode ? { ...(saved?.assessmentWeights || {}) } : {};
        if (!draft.assessmentActivityComponents) draft.assessmentActivityComponents = isEditMode ? { ...(saved?.assessmentActivityComponents || {}) } : {};
        if (!draft.assessmentMaxAttempts) draft.assessmentMaxAttempts = isEditMode ? { ...(saved?.assessmentMaxAttempts || {}) } : {};
        if (!draft.assessmentLatePermissions) draft.assessmentLatePermissions = isEditMode ? { ...(saved?.assessmentLatePermissions || {}) } : {};
        if (!draft.assessmentAutoSubmitOnExit) draft.assessmentAutoSubmitOnExit = isEditMode ? { ...(saved?.assessmentAutoSubmitOnExit || {}) } : {};
        if (!draft.assessmentGradingModes) draft.assessmentGradingModes = isEditMode ? { ...(saved?.assessmentGradingModes || {}) } : {};
        if (!draft.assessmentEssayGradingModes) draft.assessmentEssayGradingModes = isEditMode ? { ...(saved?.assessmentEssayGradingModes || {}) } : {};
        if (!draft.assessmentShowCorrectAnswers) draft.assessmentShowCorrectAnswers = isEditMode ? { ...(saved?.assessmentShowCorrectAnswers || {}) } : {};
        if (!draft.assessmentAiAssisted) draft.assessmentAiAssisted = isEditMode ? { ...(saved?.assessmentAiAssisted || {}) } : {};
        if (!draft.assessmentRubrics) draft.assessmentRubrics = isEditMode ? { ...(saved?.assessmentRubrics || {}) } : {};
        if (!draft.assignedStudents) draft.assignedStudents = isEditMode ? { ...(saved?.assignedStudents || {}) } : {};

        draft._isPickerFlow = (targetId === null && !isEditMode) || Boolean(draft._isPickerFlow);
        draft._targetId = effectiveId;
        draft._targetTitle = targetTitle;
        draft._category = category;
        draft._activeStep = activeStep;
        draft._section = section;
        draft._subjectId = subjectId;
        if (editType !== undefined && editType !== '') {
            draft._editType = editType;
        }

        const sectionStudents = (typeof window.getStudentsForSection === 'function')
            ? window.getStudentsForSection(section, subjectId, false)
            : (typeof getStudentsForSection === 'function' ? getStudentsForSection(section, subjectId, false) : []);

        const effIdStr = String(effectiveId || '');
        if (!draft.assignedStudents[effIdStr]) {
            if (saved?.assignedStudents?.[effIdStr] && Array.isArray(saved.assignedStudents[effIdStr])) {
                draft.assignedStudents[effIdStr] = [...saved.assignedStudents[effIdStr]];
            } else if (targetTitle && saved?.assignedStudents?.[targetTitle] && Array.isArray(saved.assignedStudents[targetTitle])) {
                draft.assignedStudents[effIdStr] = [...saved.assignedStudents[targetTitle]];
            } else {
                draft.assignedStudents[effIdStr] = sectionStudents.map(s => String(s.id || s.name));
            }
        }

        const currentAssignedList = draft.assignedStudents[effIdStr] || [];
        const totalStudentsCount = sectionStudents.length;
        const isAllWildcard = currentAssignedList.some(v => ['all', 'All', 'ALL', '*'].includes(String(v).trim()));
        const selectedStudentsCount = isAllWildcard
            ? totalStudentsCount
            : sectionStudents.filter(st => {
                const stId = String(st.id || '');
                const stName = st.name || `${st.lastName || ''}, ${st.firstName || ''}`.trim() || '';
                return currentAssignedList.includes(stId) || (stName && currentAssignedList.includes(stName));
            }).length;
        const isAllSelected = (selectedStudentsCount === totalStudentsCount && totalStudentsCount > 0) || isAllWildcard;
        const selectedStudentsSummary = isAllSelected
            ? `<span class="inline-flex items-center gap-1.5 text-[#15803d] font-bold"><span class="w-3.5 h-3.5 rounded bg-[#15803d] text-white flex items-center justify-center text-[8.5px] leading-none shrink-0 font-bold shadow-2xs"><i class="fa-solid fa-check"></i></span><span>All</span></span>`
            : `${selectedStudentsCount}/${totalStudentsCount} selected`;

        const isStudentsPage = activeStep === 'students';
        const isGradingPage = (category === 'assessments' && activeStep === 'grading');

        // Resolve title list for multi-item dropdown
        let selectableItems = [];
        const uSel = window._unifiedPickerSelection;
        const isUnifiedMulti = Boolean(uSel && Array.isArray(uSel.allSelected) && uSel.allSelected.length > 0);

        if (isGradingPage && isUnifiedMulti) {
            // STEP 2: In "Set Details" / "Set Grade", only include the selected ASSESSMENTS!
            const allAssessments = (typeof window.getTeacherSubjectAssessments === 'function')
                ? window.getTeacherSubjectAssessments(subjectId, section)
                : [];
            const assIds = Array.isArray(uSel.assessments) ? uSel.assessments : [];
            selectableItems = assIds.map(id => {
                const found = allAssessments.find(a => String(a.id || a.title || '') === String(id));
                const foundTypeLower = String(found?.type || '').toLowerCase();
                const linkedQuizId = found?.selectedQuizId || found?.quizId || found?.rawItem?.selectedQuizId || found?.rawItem?.quizId || null;
                const itemCategory = found?.category || (
                    (foundTypeLower === 'quiz' || foundTypeLower === 'quizzes' || linkedQuizId) ? 'quiz'
                    : (found ? 'assignment' : '')
                );
                const isQuiz = found?.type === 'Quiz' || String(found?.type || '').toLowerCase().includes('quiz') || itemCategory === 'quiz';
                return {
                    id: String(id),
                    title: found ? (found.title || String(id)) : String(id),
                    type: found?.type || (isQuiz ? 'Quiz' : 'Task'),
                    category: 'assessments',
                    itemCategory: itemCategory,
                    selectedQuizId: linkedQuizId,
                    icon: isQuiz ? 'fa-stopwatch text-emerald-600' : 'fa-clipboard-list text-amber-600'
                };
            });
            // Ensure active effectiveId is one of the assessments
            if (selectableItems.length > 0 && (!effectiveId || !selectableItems.find(it => String(it.id) === String(effectiveId)))) {
                effectiveId = selectableItems[0].id;
                draft._targetId = effectiveId;
            }
        } else if (!isGradingPage && isUnifiedMulti) {
            // STEP 1: In "Set Schedule", put ALL selected items in the selection dropdown panel!
            // (e.g. 1 topic + 1 learning material = 2 items; 1 topic + 1 learning material + 1 assessment = 3 items; etc.)
            const allTopics = (typeof getTeacherAllSubjectTopics === 'function')
                ? getTeacherAllSubjectTopics(subjectId, section)
                : [];
            const allMaterials = (typeof window.getTeacherSubjectLearningMaterials === 'function')
                ? window.getTeacherSubjectLearningMaterials(subjectId, section)
                : [];
            const allAssessments = (typeof window.getTeacherSubjectAssessments === 'function')
                ? window.getTeacherSubjectAssessments(subjectId, section)
                : [];

            selectableItems = [];

            // 1. Topics
            (uSel.topics || []).forEach((tid, idx) => {
                const sTid = String(tid);
                const foundT = allTopics.find((t, tIdx) => {
                    const tId = t.id !== undefined ? String(t.id) : `topic-${tIdx}`;
                    return tId === sTid || String(t.title || '') === sTid || String(tIdx) === sTid;
                });
                selectableItems.push({
                    id: sTid,
                    title: foundT?.title || `Topic ${idx + 1}`,
                    category: 'topics',
                    itemCategory: 'topics',
                    type: 'Topic',
                    icon: 'fa-book-bookmark text-[#15803d]'
                });
            });

            // 2. Learning Materials
            (uSel.learning || []).forEach(mid => {
                const sMid = String(mid);
                const foundM = allMaterials.find(m => String(m.id || m.title || '') === sMid);
                const isVid = foundM?.type === 'Video';
                selectableItems.push({
                    id: sMid,
                    title: foundM?.title || foundM?.name || sMid,
                    category: 'learning',
                    itemCategory: 'learning',
                    type: foundM?.type || 'Lesson',
                    icon: isVid ? 'fa-circle-play text-red-600' : 'fa-file-lines text-blue-600'
                });
            });

            // 3. Assessments
            (uSel.assessments || []).forEach(aid => {
                const sAid = String(aid);
                const foundA = allAssessments.find(a => String(a.id || a.title || '') === sAid);
                const isQuiz = foundA?.type === 'Quiz' || String(foundA?.type || '').toLowerCase().includes('quiz');
                const linkedQuizId = foundA?.selectedQuizId || foundA?.quizId || null;
                selectableItems.push({
                    id: sAid,
                    title: foundA?.title || foundA?.name || sAid,
                    category: 'assessments',
                    itemCategory: isQuiz ? 'quiz' : 'assignment',
                    type: foundA?.type || 'Assessment',
                    selectedQuizId: linkedQuizId,
                    icon: isQuiz ? 'fa-stopwatch text-emerald-600' : 'fa-clipboard-list text-amber-600'
                });
            });

            // Always topic first to schedule:
            if (selectableItems.length > 0) {
                const firstTopic = selectableItems.find(it => it.category === 'topics');
                if (!targetId && firstTopic) {
                    effectiveId = firstTopic.id;
                    draft._targetId = effectiveId;
                } else if (!effectiveId || !selectableItems.find(it => String(it.id) === String(effectiveId))) {
                    effectiveId = (firstTopic ? firstTopic.id : selectableItems[0].id);
                    draft._targetId = effectiveId;
                }
            }
        } else if (category === 'assessments') {
            const allAssessments = window.getTeacherSubjectAssessments(subjectId, section);
            selectableItems = pendingIds.map(id => {
                const found = allAssessments.find(a => String(a.id || a.title || '') === String(id));
                const foundTypeLower = String(found?.type || '').toLowerCase();
                const linkedQuizId = found?.selectedQuizId || found?.quizId || found?.rawItem?.selectedQuizId || found?.rawItem?.quizId || null;
                const itemCategory = found?.category || (
                    (foundTypeLower === 'quiz' || foundTypeLower === 'quizzes' || linkedQuizId) ? 'quiz'
                    : (found ? 'assignment' : '')
                );
                const isQuiz = found?.type === 'Quiz' || String(found?.type || '').toLowerCase().includes('quiz') || itemCategory === 'quiz';
                return {
                    id: String(id),
                    title: found ? (found.title || String(id)) : String(id),
                    type: found?.type || (isQuiz ? 'Quiz' : 'Task'),
                    category: itemCategory,
                    selectedQuizId: linkedQuizId,
                    icon: isQuiz ? 'fa-stopwatch text-emerald-600' : 'fa-clipboard-list text-amber-600'
                };
            });
        } else if (category === 'learning') {
            const allMaterials = window.getTeacherSubjectLearningMaterials ? window.getTeacherSubjectLearningMaterials(subjectId, section) : [];
            selectableItems = pendingIds.map(id => {
                const found = allMaterials.find(m => String(m.id || m.title || m.name || '') === String(id));
                const isVid = found?.type === 'Video';
                return {
                    id: String(id),
                    title: found ? (found.title || found.name || String(id)) : String(id),
                    type: found?.type || 'Lesson',
                    category: 'learning',
                    icon: isVid ? 'fa-circle-play text-red-600' : 'fa-file-lines text-blue-600'
                };
            });
        } else {
            const topics = (typeof getTeacherAllSubjectTopics === 'function')
                ? getTeacherAllSubjectTopics(subjectId, section)
                : [];
            selectableItems = pendingIds.map((id, pIdx) => {
                const idStr = String(id);
                const found = topics.find((t, tIdx) => {
                    const tId = t.id !== undefined ? String(t.id) : `topic-${tIdx}`;
                    return tId === idStr || String(t.title || '') === idStr || String(tIdx) === idStr;
                });
                const fallbackTitle = (found?.title) || (topics[pIdx]?.title) || (idStr.startsWith('topic-') ? `Topic ${parseInt(idStr.replace(/\D/g, '') || (pIdx + 1), 10)}` : `Topic ${pIdx + 1}`);
                return {
                    id: idStr,
                    title: found ? (found.title || fallbackTitle) : fallbackTitle,
                    type: 'Topic',
                    category: 'topics',
                    icon: 'fa-book-bookmark text-[#15803d]'
                };
            });
        }

        const convertTimeTo24Hour = (timeStr, defaultTime = '00:00') => {
            if (!timeStr || timeStr === '--:-- --' || timeStr === 'none') return defaultTime;
            const str = String(timeStr).trim();
            if (/^\d{1,2}:\d{2}$/.test(str)) {
                const [h, m] = str.split(':');
                return `${String(parseInt(h, 10)).padStart(2, '0')}:${String(parseInt(m, 10)).padStart(2, '0')}`;
            }
            const match = str.match(/(\d{1,2})(?:[:.](\d{0,2}))?(?:\s*([AP]M)?)?/i);
            if (!match) return defaultTime;
            let h = parseInt(match[1], 10) || 0;
            let m = match[2] !== undefined && match[2] !== '' ? parseInt(match[2], 10) : 0;
            let p = match[3] ? match[3].toUpperCase() : '';
            if (p === 'PM' && h < 12) h += 12;
            if (p === 'AM' && h === 12) h = 0;
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        };

        const activeSelectedItem = selectableItems.find(it => it.id === String(effectiveId)) || selectableItems[0] || { id: effectiveId, title: targetTitle };

        const activeItemCategory = String(activeSelectedItem?.category || activeSelectedItem?.itemCategory || category || '').toLowerCase();
        const activeItemType = String(activeSelectedItem?.type || '').toLowerCase();

        // Due date is only for tasks and quiz. Hide due date if selected item is a topic or learning material.
        const isDueDateSupported = (
            activeItemCategory === 'assessments' ||
            activeItemCategory === 'quiz' ||
            activeItemCategory === 'assignment' ||
            activeItemType.includes('quiz') ||
            activeItemType.includes('task') ||
            activeItemType.includes('assessment')
        ) && (
            activeItemCategory !== 'topics' &&
            activeItemCategory !== 'learning' &&
            activeItemType !== 'topic' &&
            activeItemType !== 'video' &&
            activeItemType !== 'lesson' &&
            activeItemType !== 'document'
        );

        const startScheduleLookup = (keyMap) => {
            if (!keyMap || typeof keyMap !== 'object') return undefined;
            const candidates = [
                effectiveId,
                String(effectiveId),
                targetTitle,
                activeSelectedItem?.id ? String(activeSelectedItem.id) : null,
                activeSelectedItem?.title ? String(activeSelectedItem.title) : null
            ].filter(Boolean);
            for (const k of candidates) {
                if (keyMap[k] !== undefined && keyMap[k] !== '' && keyMap[k] !== null) return keyMap[k];
            }
            return undefined;
        };

        const endScheduleLookup = (keyMap) => {
            if (!keyMap || typeof keyMap !== 'object') return undefined;
            const candidates = [
                effectiveId,
                String(effectiveId),
                targetTitle,
                activeSelectedItem?.id ? String(activeSelectedItem.id) : null,
                activeSelectedItem?.title ? String(activeSelectedItem.title) : null
            ].filter(Boolean);
            for (const k of candidates) {
                if (keyMap[k] !== undefined && keyMap[k] !== '' && keyMap[k] !== null) return keyMap[k];
            }
            return undefined;
        };

        // 1. Begin schedule
        let currentScheduledTime = '';
        if (effectiveId) {
            currentScheduledTime = startScheduleLookup(draft[meta.scheduleKey])
                ?? startScheduleLookup(draft.materialSchedules)
                ?? startScheduleLookup(draft.assessmentSchedules)
                ?? startScheduleLookup(draft.schedules)
                ?? (draft._scheduleStartVal !== undefined ? draft._scheduleStartVal : undefined)
                ?? (isEditMode ? (startScheduleLookup(saved?.[meta.scheduleKey])
                    ?? startScheduleLookup(saved?.materialSchedules)
                    ?? startScheduleLookup(saved?.assessmentSchedules)
                    ?? startScheduleLookup(saved?.schedules)) : undefined)
                ?? '';
        } else {
            currentScheduledTime = draft.startTime || (isEditMode ? saved?.releaseStartTime : '') || '';
        }

        let initDate = '';
        let initTime = '12:00 AM';
        let hasActiveSchedule = false;
        let isDateOnly = false;

        if (currentScheduledTime && currentScheduledTime !== 'now' && currentScheduledTime !== 'immediate' && currentScheduledTime !== 'none' && currentScheduledTime !== '-') {
            hasActiveSchedule = true;
            let startStr = String(currentScheduledTime).trim();
            if (startStr.includes('T')) {
                const [dPart, tPart] = startStr.split('T');
                initDate = dPart;
                if (tPart) {
                    const [hPart, mPart] = tPart.split(':');
                    let rawH = parseInt(hPart, 10) || 0;
                    let rawM = parseInt(mPart, 10) || 0;
                    if (tPart.toUpperCase().includes('PM') && rawH < 12) rawH += 12;
                    if (tPart.toUpperCase().includes('AM') && rawH === 12) rawH = 0;
                    if (rawH === 0 && rawM === 0) {
                        isDateOnly = true;
                        initTime = '12:00 AM';
                    } else {
                        let hNum = rawH;
                        const p = hNum >= 12 ? 'PM' : 'AM';
                        if (hNum > 12) hNum -= 12;
                        if (hNum === 0) hNum = 12;
                        initTime = `${String(hNum).padStart(2, '0')}:${String(rawM).padStart(2, '0')} ${p}`;
                    }
                } else {
                    isDateOnly = true;
                }
            } else if (startStr.includes(' ')) {
                const parts = startStr.split(' ');
                initDate = parts[0];
                initTime = parts.slice(1).join(' ') || '12:00 AM';
            } else {
                initDate = startStr;
                isDateOnly = true;
            }
        }

        // 2. End schedule (Due Date)
        let currentScheduledEndTime = '';
        if (effectiveId) {
            currentScheduledEndTime = endScheduleLookup(draft[meta.endScheduleKey])
                ?? endScheduleLookup(draft.materialEndSchedules)
                ?? endScheduleLookup(draft.assessmentEndSchedules)
                ?? endScheduleLookup(draft.endSchedules)
                ?? endScheduleLookup(draft.dueDates)
                ?? (draft._scheduleEndVal !== undefined ? draft._scheduleEndVal : undefined)
                ?? (isEditMode ? (endScheduleLookup(saved?.[meta.endScheduleKey])
                    ?? endScheduleLookup(saved?.materialEndSchedules)
                    ?? endScheduleLookup(saved?.assessmentEndSchedules)
                    ?? endScheduleLookup(saved?.endSchedules)
                    ?? endScheduleLookup(saved?.dueDates)
                    ?? endScheduleLookup(saved?.dueDate)) : undefined)
                ?? '';
        } else {
            currentScheduledEndTime = draft.endTime || (isEditMode ? saved?.releaseEndTime : '') || '';
        }

        let initEndDate = '';
        let initEndTime = '';
        let hasActiveEndSchedule = false;
        let isEndDateOnly = false;

        if (currentScheduledEndTime && currentScheduledEndTime !== 'now' && currentScheduledEndTime !== 'immediate' && currentScheduledEndTime !== 'none' && currentScheduledEndTime !== 'no-deadline' && currentScheduledEndTime !== '-' && currentScheduledEndTime !== 'null' && currentScheduledEndTime !== 'undefined') {
            hasActiveEndSchedule = true;
            let endStr = String(currentScheduledEndTime).trim();
            if (endStr.includes('T')) {
                const [dPart, tPart] = endStr.split('T');
                initEndDate = dPart;
                if (tPart) {
                    const [hPart, mPart] = tPart.split(':');
                    let rawH = parseInt(hPart, 10) || 0;
                    let rawM = parseInt(mPart, 10) || 0;
                    if (tPart.toUpperCase().includes('PM') && rawH < 12) rawH += 12;
                    if (tPart.toUpperCase().includes('AM') && rawH === 12) rawH = 0;
                    if (rawH === 23 && rawM === 59) {
                        isEndDateOnly = false;
                        initEndTime = ''; // Default end of day, displays as '--:-- --'
                    } else if (rawH === 0 && rawM === 0) {
                        isEndDateOnly = true;
                        initEndTime = '';
                    } else {
                        let hNum = rawH;
                        const p = hNum >= 12 ? 'PM' : 'AM';
                        if (hNum > 12) hNum -= 12;
                        if (hNum === 0) hNum = 12;
                        initEndTime = `${String(hNum).padStart(2, '0')}:${String(rawM).padStart(2, '0')} ${p}`;
                    }
                } else {
                    isEndDateOnly = true;
                }
            } else if (endStr.includes(' ')) {
                const parts = endStr.split(' ');
                initEndDate = parts[0];
                initEndTime = parts.slice(1).join(' ') || '';
            } else {
                initEndDate = endStr;
                isEndDateOnly = true;
            }
        }

        const today = new Date();
        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, '0');
        const d = String(today.getDate()).padStart(2, '0');
        const todayDateStr = `${y}-${m}-${d}`;

        if (!initDate || initDate < todayDateStr) {
            initDate = todayDateStr;
        }

        const parseTo24 = (timeStr, defaultTime = '') => {
            if (!timeStr || timeStr === '--:-- --' || timeStr === 'none') return defaultTime;
            const str = String(timeStr).trim();
            if (/^\d{1,2}:\d{2}$/.test(str)) {
                const [h, m] = str.split(':');
                return `${String(parseInt(h, 10)).padStart(2, '0')}:${String(parseInt(m, 10)).padStart(2, '0')}`;
            }
            const match = str.match(/(\d{1,2})(?:[:.](\d{0,2}))?(?:\s*([AP]M)?)?/i);
            if (!match) return defaultTime;
            let h = parseInt(match[1], 10) || 0;
            let m = match[2] !== undefined && match[2] !== '' ? parseInt(match[2], 10) : 0;
            let p = match[3] ? match[3].toUpperCase() : '';
            if (p === 'PM' && h < 12) h += 12;
            if (p === 'AM' && h === 12) h = 0;
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        };

        const initTime24 = (hasActiveSchedule && !isDateOnly && initTime) ? parseTo24(initTime, '08:00') : '08:00';
        const initEndTime24 = (hasActiveEndSchedule && !isEndDateOnly && initEndTime) ? parseTo24(initEndTime, '23:59') : '23:59';
        const displayTimeValue = (hasActiveSchedule && !isDateOnly && initTime) ? initTime : '--:-- --';
        const displayEndTimeValue = (hasActiveEndSchedule && !isEndDateOnly && initEndTime) ? initEndTime : '--:-- --';
        const isReleaseNow = !hasActiveSchedule;
        const isNoDeadline = !hasActiveEndSchedule;

        // Grading Configuration (Highest Possible Score, Weight %, Max Attempts, Late Permission, Grading Mode, Activity WW/PT, AI Assist & Rubric)
        let isActivity = false;
        let isScheduleQuiz = false;
        let isPaperQuizNoFile = false;
        let hasAttachedQuizFile = false;
        let defaultWeight = 50; // Performance Task: 50%
        let defaultComponent = 'pt';
        let foundAss = null;
        if (category === 'assessments') {
            const allAssessments = typeof window.getTeacherSubjectAssessments === 'function' ? window.getTeacherSubjectAssessments(subjectId, section) : [];
            foundAss = allAssessments.find(a => String(a.id || '') === String(effectiveId) || String(a.title || '').trim().toLowerCase() === String(targetTitle || '').trim().toLowerCase());

            if (!foundAss) {
                try {
                    const allMats = typeof window.getTeacherSubjectLearningMaterials === 'function' ? window.getTeacherSubjectLearningMaterials(subjectId, section) : [];
                    foundAss = allMats.find(m => String(m.id || '') === String(effectiveId) || String(m.title || m.name || '').trim().toLowerCase() === String(targetTitle || '').trim().toLowerCase());
                } catch (e) {}
            }
            if (!foundAss) {
                try {
                    const data = subjectId ? (typeof getTopicData === 'function' ? getTopicData(subjectId) : null) : null;
                    const topicList = (data && Array.isArray(data.q1Topics)) ? data.q1Topics : ((data && Array.isArray(data.topics)) ? data.topics : []);
                    for (const t of topicList) {
                        if (foundAss) break;
                        for (const arr of [t.quizzes, t.assignments, t.activities, t.materials, t.performanceTasks]) {
                            if (Array.isArray(arr)) {
                                const hit = arr.find(it => it && (String(it.id || '') === String(effectiveId) || String(it.title || it.name || '').trim().toLowerCase() === String(targetTitle || '').trim().toLowerCase()));
                                if (hit) { foundAss = hit; break; }
                            }
                        }
                    }
                } catch (e) {}
            }
            if (!foundAss) {
                const candidates = [window.currentAssessmentItem, window.currentMaterialItem, window.editingMaterialState, activeSelectedItem];
                for (const c of candidates) {
                    if (c && (String(c.id || '') === String(effectiveId) || String(c.title || c.name || '').trim().toLowerCase() === String(targetTitle || '').trim().toLowerCase())) {
                        foundAss = c;
                        break;
                    }
                }
            }

            const foundType = String(foundAss?.type || activeSelectedItem?.type || '').toLowerCase();
            const foundCat = String(foundAss?.category || activeSelectedItem?.category || '').toLowerCase();
            const cleanTitle = (activeSelectedItem?.title || foundAss?.title || targetTitle || '').toLowerCase();
            const cleanId = String(effectiveId || '').toLowerCase();
            const activeTab = String(currentTopicState?.activeTab || '').toLowerCase();

            if (foundType === 'quiz' || foundType === 'quizzes' || foundCat === 'quiz' || foundCat === 'quizzes' || cleanTitle.includes('quiz') || cleanId.includes('quiz') || activeTab === 'quizzes' || activeTab === 'quiz' || foundAss?.selectedQuizId || foundAss?.quizId || foundAss?.rawItem?.selectedQuizId || foundAss?.rawItem?.quizId) {
                isScheduleQuiz = true;
            }

            if (foundType === 'activity' || foundType === 'activities' || foundCat === 'activity' || foundCat === 'activities' || cleanTitle.includes('activity') || cleanId.includes('activ') || activeTab === 'activity' || activeTab === 'activities') {
                isActivity = true;
            }

            const subjWeights = (typeof window.getSubjectGradebookWeights === 'function')
                ? window.getSubjectGradebookWeights(subjectId)
                : { ww: 25, pt: 50, qa: 25 };

            if (foundType === 'performance task' || foundType === 'performance' || foundCat === 'performance' || foundCat === 'performancetasks' || foundCat === 'performancetask' || foundCat === 'pt' || cleanTitle.includes('perf') || cleanId.includes('perf') || activeTab === 'performance' || activeTab === 'performancetasks') {
                defaultWeight = subjWeights.pt; // Performance Task
                defaultComponent = 'pt';
            } else if (foundType === 'assignment' || foundType === 'assignments' || foundType === 'quiz' || foundType === 'quizzes' || foundCat === 'assignment' || foundCat === 'assignments' || foundCat === 'quiz' || foundCat === 'quizzes' || cleanTitle.includes('assign') || cleanTitle.includes('quiz') || cleanId.includes('assign') || cleanId.includes('quiz') || activeTab === 'assignments' || activeTab === 'quizzes' || activeTab === 'quiz') {
                defaultWeight = subjWeights.ww; // Written Work (WW)
                defaultComponent = 'ww';
            } else if (foundType === 'exam' || foundType === 'exams' || cleanTitle.includes('exam') || cleanId.includes('exam') || activeTab === 'exam') {
                defaultWeight = subjWeights.qa; // Quarterly Assessment
                defaultComponent = 'qa';
            } else {
                defaultWeight = subjWeights.pt;
                defaultComponent = 'pt';
            }
        }

        const subjWeights = (typeof window.getSubjectGradebookWeights === 'function')
            ? window.getSubjectGradebookWeights(subjectId)
            : { ww: 25, pt: 50, qa: 25 };

        let initMaxScore = '';
        let initWeight = '';
        let initActivityComponent = '';
        let initMaxAttempts = '';
        let initLatePermission = true;
        let initHasTimer = false;
        let initTimeLimitMinutes = 30;
        let initAutoSubmitOnExit = true;
        let initGradingMode = '';
        let initEssayGradingMode = '';
        let initManualReviewEnumeration = false;
        let initManualReviewShort = false;
        let initShowCorrectAnswers = true;
        let initAllowFileUpload = false;
        let initAiAssisted = false;
        let linkedRubricName = '';
        let adminLockedRubricName = '';
        let initCriteriaAiAuto = true;
        let initSelectedCriteria = ['content', 'process', 'organization', 'analysis'];

        if (category === 'assessments') {
            if (effectiveId) {
                const quizInfo = findQuizInfo(subjectId, effectiveId, targetTitle, foundAss);
                const autoHps = quizInfo.points;

                const readReleaseMapValue = (map) => {
                    if (!map || typeof map !== 'object') return undefined;
                    const keys = [
                        effectiveId,
                        targetTitle,
                        foundAss?.id,
                        foundAss?.title,
                        foundAss?.name,
                        foundAss?.quizId,
                        foundAss?.selectedQuizId,
                        foundAss?.materialId,
                        foundAss?.originalAdminId,
                        foundAss?.origId,
                        foundAss?.rawItem?.id,
                        foundAss?.rawItem?.title,
                        foundAss?.rawItem?.quizId,
                        foundAss?.rawItem?.selectedQuizId
                    ];
                    const seen = new Set();
                    for (let i = 0; i < keys.length; i++) {
                        const raw = keys[i];
                        if (raw === undefined || raw === null) continue;
                        const variants = [String(raw), String(raw).trim(), String(raw).trim().toLowerCase()];
                        for (let v = 0; v < variants.length; v++) {
                            const key = variants[v];
                            if (!key || seen.has(key)) continue;
                            seen.add(key);
                            if (map[key] !== undefined && map[key] !== null && map[key] !== '') return map[key];
                        }
                    }
                    return undefined;
                };

                const draftEssay = readReleaseMapValue(draft.assessmentEssayGradingModes);
                const savedEssay = readReleaseMapValue(saved?.assessmentEssayGradingModes);
                if (draftEssay === 'manual' || draftEssay === 'auto') {
                    initEssayGradingMode = draftEssay;
                } else if (savedEssay === 'manual' || savedEssay === 'auto') {
                    initEssayGradingMode = savedEssay;
                } else {
                    initEssayGradingMode = 'auto';
                }
                if (initEssayGradingMode && effectiveId) {
                    if (!draft.assessmentEssayGradingModes) draft.assessmentEssayGradingModes = {};
                    draft.assessmentEssayGradingModes[effectiveId] = initEssayGradingMode;
                }

                const savedReviewTypes = readReleaseMapValue(draft.assessmentManualReviewTypes) || readReleaseMapValue(saved?.assessmentManualReviewTypes) || null;
                if (savedReviewTypes && typeof savedReviewTypes === 'object') {
                    initManualReviewEnumeration = Boolean(savedReviewTypes.enumeration);
                    initManualReviewShort = Boolean(savedReviewTypes.shortAnswer);
                }

                if (draft.assessmentShowCorrectAnswers?.[effectiveId] !== undefined) {
                    initShowCorrectAnswers = Boolean(draft.assessmentShowCorrectAnswers[effectiveId]);
                } else if (saved?.assessmentShowCorrectAnswers?.[effectiveId] !== undefined) {
                    initShowCorrectAnswers = Boolean(saved.assessmentShowCorrectAnswers[effectiveId]);
                } else {
                    initShowCorrectAnswers = true;
                }

                const actualQuizRefId = String(
                    foundAss?.selectedQuizId ||
                    foundAss?.quizId ||
                    foundAss?.rawItem?.selectedQuizId ||
                    foundAss?.rawItem?.quizId ||
                    ''
                ).trim().toLowerCase();
                const isSelfOrMatId = actualQuizRefId.startsWith('assess-') ||
                                      actualQuizRefId.startsWith('mat-') ||
                                      actualQuizRefId.startsWith('card-') ||
                                      actualQuizRefId === String(effectiveId || '').trim().toLowerCase() ||
                                      actualQuizRefId === String(foundAss?.id || '').trim().toLowerCase();
                const cleanRefId = (!isSelfOrMatId && actualQuizRefId && actualQuizRefId !== 'null' && actualQuizRefId !== 'undefined') ? actualQuizRefId : '';
                const hasExplicitQuestions = Boolean(
                    (Array.isArray(foundAss?.questions) && foundAss.questions.length > 0) ||
                    (Array.isArray(foundAss?.quizQuestions) && foundAss.quizQuestions.length > 0) ||
                    (foundAss?.rawItem && Array.isArray(foundAss.rawItem.questions) && foundAss.rawItem.questions.length > 0)
                );

                hasAttachedQuizFile = Boolean(cleanRefId || hasExplicitQuestions || (quizInfo && quizInfo.points !== null && quizInfo.points > 0));
                isPaperQuizNoFile = Boolean(isScheduleQuiz && !hasAttachedQuizFile);

                if (isScheduleQuiz) {
                    initAllowFileUpload = false;
                    if (!draft.assessmentAllowFileUploads) draft.assessmentAllowFileUploads = {};
                    draft.assessmentAllowFileUploads[effectiveId] = false;
                } else if (draft.assessmentAllowFileUploads?.[effectiveId] !== undefined) {
                    initAllowFileUpload = Boolean(draft.assessmentAllowFileUploads[effectiveId]);
                } else if (saved?.assessmentAllowFileUploads?.[effectiveId] !== undefined) {
                    initAllowFileUpload = Boolean(saved.assessmentAllowFileUploads[effectiveId]);
                } else if (foundAss?.allowFileUpload !== undefined) {
                    initAllowFileUpload = Boolean(foundAss.allowFileUpload);
                } else {
                    initAllowFileUpload = false;
                }

                const rawAssMax = (foundAss && (foundAss.max || foundAss.points || foundAss.maxScore || foundAss.totalPoints || foundAss.highestPossibleScore || (foundAss.rawItem && (foundAss.rawItem.max || foundAss.rawItem.points || foundAss.rawItem.maxScore)))) || null;
                const fallbackAssMax = (rawAssMax !== null && !isNaN(Number(rawAssMax)) && Number(rawAssMax) > 0) ? Number(rawAssMax) : null;

                const panelQuizPoints = Number(foundAss?.selectedQuizPoints ?? foundAss?.quizPoints ?? foundAss?.rawItem?.selectedQuizPoints ?? foundAss?.rawItem?.totalPoints ?? quizInfo?.matchedQuiz?.totalPoints ?? 0);
                const filePanelPoints = (typeof window.attachedQuizFilePoints === 'function') ? window.attachedQuizFilePoints(foundAss) : null;
                const matchedFilePoints = (typeof window.quizFilePanelPoints === 'function') ? window.quizFilePanelPoints(quizInfo?.matchedQuiz) : null;
                const lockedQuizPoints = (filePanelPoints && filePanelPoints > 0)
                    ? Number(filePanelPoints)
                    : ((matchedFilePoints && Number(matchedFilePoints) > 0)
                        ? Number(matchedFilePoints)
                        : ((autoHps !== null && !isNaN(Number(autoHps)) && Number(autoHps) > 0)
                            ? Number(autoHps)
                            : ((Number.isFinite(panelQuizPoints) && panelQuizPoints > 0) ? panelQuizPoints : null)));
                if (isScheduleQuiz && hasAttachedQuizFile && lockedQuizPoints) {
                    // For Quizzes with attached digital quiz files: lock HPS to attached quiz questions/points
                    initMaxScore = lockedQuizPoints;
                    if (!draft.assessmentMaxScores) draft.assessmentMaxScores = {};
                    draft.assessmentMaxScores[effectiveId] = initMaxScore;
                } else {
                    // For Paper Quizzes (no attached quiz file) and Non-Quizzes: editable HPS (blank by default)
                    if (draft.assessmentMaxScores?.[effectiveId] !== undefined && draft.assessmentMaxScores[effectiveId] !== '' && draft.assessmentMaxScores[effectiveId] !== null && Number(draft.assessmentMaxScores[effectiveId]) > 0) {
                        initMaxScore = Number(draft.assessmentMaxScores[effectiveId]);
                    } else if (saved?.assessmentMaxScores?.[effectiveId] !== undefined && saved.assessmentMaxScores[effectiveId] !== '' && saved.assessmentMaxScores[effectiveId] !== null && Number(saved.assessmentMaxScores[effectiveId]) > 0) {
                        initMaxScore = Number(saved.assessmentMaxScores[effectiveId]);
                    } else {
                        initMaxScore = '';
                    }
                    if (!draft.assessmentMaxScores) draft.assessmentMaxScores = {};
                }

                if (isScheduleQuiz) {
                    initActivityComponent = 'ww';
                    initWeight = subjWeights.ww;
                } else {
                    if (draft.assessmentActivityComponents?.[effectiveId] !== undefined && draft.assessmentActivityComponents[effectiveId] !== '') {
                        initActivityComponent = draft.assessmentActivityComponents[effectiveId];
                    } else if (saved?.assessmentActivityComponents?.[effectiveId] !== undefined && saved.assessmentActivityComponents[effectiveId] !== '') {
                        initActivityComponent = saved.assessmentActivityComponents[effectiveId];
                    } else if (draft.assessmentComponents?.[effectiveId] !== undefined && draft.assessmentComponents[effectiveId] !== '') {
                        initActivityComponent = draft.assessmentComponents[effectiveId];
                    } else if (saved?.assessmentComponents?.[effectiveId] !== undefined && saved.assessmentComponents[effectiveId] !== '') {
                        initActivityComponent = saved.assessmentComponents[effectiveId];
                    } else if (foundAss?.component) {
                        initActivityComponent = foundAss.component;
                    } else if (foundAss?.gradebookComponent) {
                        initActivityComponent = foundAss.gradebookComponent;
                    } else {
                        initActivityComponent = defaultComponent || 'ww';
                    }

                    if (initActivityComponent === 'ww') {
                        initWeight = subjWeights.ww;
                    } else if (initActivityComponent === 'pt') {
                        initWeight = subjWeights.pt;
                    } else if (initActivityComponent === 'qa') {
                        initWeight = subjWeights.qa;
                    } else {
                        initWeight = '';
                    }
                }
                if (draft.assessmentMaxAttempts?.[effectiveId] !== undefined && draft.assessmentMaxAttempts[effectiveId] !== '' && draft.assessmentMaxAttempts[effectiveId] !== 3 && draft.assessmentMaxAttempts[effectiveId] !== '3') {
                    initMaxAttempts = draft.assessmentMaxAttempts[effectiveId];
                } else if (saved?.assessmentMaxAttempts?.[effectiveId] !== undefined && saved.assessmentMaxAttempts[effectiveId] !== '' && saved.assessmentMaxAttempts[effectiveId] !== 3 && saved.assessmentMaxAttempts[effectiveId] !== '3') {
                    initMaxAttempts = saved.assessmentMaxAttempts[effectiveId];
                } else if (foundAss?.maxAttempts !== undefined && foundAss?.maxAttempts !== '' && foundAss.maxAttempts !== 3 && foundAss.maxAttempts !== '3') {
                    initMaxAttempts = foundAss.maxAttempts;
                } else if (foundAss?.attempts !== undefined && foundAss?.attempts !== '' && foundAss.attempts !== 3 && foundAss.attempts !== '3') {
                    initMaxAttempts = foundAss.attempts;
                } else {
                    initMaxAttempts = 1;
                }
                if (draft.assessmentLatePermissions?.[effectiveId] !== undefined) {
                    initLatePermission = Boolean(draft.assessmentLatePermissions[effectiveId]);
                } else if (saved?.assessmentLatePermissions?.[effectiveId] !== undefined) {
                    initLatePermission = Boolean(saved.assessmentLatePermissions[effectiveId]);
                } else if (foundAss?.latePermission !== undefined) {
                    initLatePermission = Boolean(foundAss.latePermission);
                } else {
                    initLatePermission = false;
                }

                // Time Limit for Quizzes (Default: locked / untimed / no time limit -> No time limit checked by default)
                if (draft.assessmentHasTimers?.[effectiveId] !== undefined) {
                    initHasTimer = Boolean(draft.assessmentHasTimers[effectiveId]);
                } else if (saved?.assessmentHasTimers?.[effectiveId] !== undefined) {
                    initHasTimer = Boolean(saved.assessmentHasTimers[effectiveId]);
                } else if (foundAss?.hasTimer === true) {
                    initHasTimer = true;
                } else {
                    initHasTimer = false;
                }

                if (draft.assessmentTimeLimitMinutes?.[effectiveId] !== undefined && draft.assessmentTimeLimitMinutes[effectiveId] !== null) {
                    initTimeLimitMinutes = parseInt(draft.assessmentTimeLimitMinutes[effectiveId], 10) || 30;
                } else if (saved?.assessmentTimeLimitMinutes?.[effectiveId] !== undefined && saved.assessmentTimeLimitMinutes[effectiveId] !== null) {
                    initTimeLimitMinutes = parseInt(saved.assessmentTimeLimitMinutes[effectiveId], 10) || 30;
                } else if (draft.assessmentTimeLimits?.[effectiveId]) {
                    const m = String(draft.assessmentTimeLimits[effectiveId]).match(/\d+/);
                    if (m) initTimeLimitMinutes = parseInt(m[0], 10) || 30;
                } else if (saved?.assessmentTimeLimits?.[effectiveId]) {
                    const m = String(saved.assessmentTimeLimits[effectiveId]).match(/\d+/);
                    if (m) initTimeLimitMinutes = parseInt(m[0], 10) || 30;
                } else if (foundAss?.timeLimit) {
                    const m = String(foundAss.timeLimit).match(/\d+/);
                    if (m) initTimeLimitMinutes = parseInt(m[0], 10) || 30;
                }

                initAutoSubmitOnExit = true;
                if (draft.assessmentAutoSubmitOnExit?.[effectiveId] !== undefined) {
                    initAutoSubmitOnExit = Boolean(draft.assessmentAutoSubmitOnExit[effectiveId]);
                } else if (saved?.assessmentAutoSubmitOnExit?.[effectiveId] !== undefined) {
                    initAutoSubmitOnExit = Boolean(saved.assessmentAutoSubmitOnExit[effectiveId]);
                } else if (foundAss?.autoSubmitOnExit !== undefined) {
                    initAutoSubmitOnExit = Boolean(foundAss.autoSubmitOnExit);
                } else {
                    initAutoSubmitOnExit = true;
                }

                if (isScheduleQuiz) {
                    initGradingMode = 'auto'; // System Auto-Scoring for Quizzes (Teacher option is hidden)
                } else if (draft.assessmentGradingModes?.[effectiveId] !== undefined && draft.assessmentGradingModes[effectiveId] !== '') {
                    initGradingMode = draft.assessmentGradingModes[effectiveId];
                } else if (saved?.assessmentGradingModes?.[effectiveId] !== undefined && saved.assessmentGradingModes[effectiveId] !== '') {
                    initGradingMode = saved.assessmentGradingModes[effectiveId];
                } else {
                    initGradingMode = 'manual';
                }
                if (draft.assessmentAiAssisted?.[effectiveId] !== undefined) {
                    initAiAssisted = Boolean(draft.assessmentAiAssisted[effectiveId]);
                } else if (saved?.assessmentAiAssisted?.[effectiveId] !== undefined) {
                    initAiAssisted = Boolean(saved.assessmentAiAssisted[effectiveId]);
                }
                if (draft.assessmentCriteriaAiAuto?.[effectiveId] !== undefined) {
                    initCriteriaAiAuto = Boolean(draft.assessmentCriteriaAiAuto[effectiveId]);
                } else if (saved?.assessmentCriteriaAiAuto?.[effectiveId] !== undefined) {
                    initCriteriaAiAuto = Boolean(saved.assessmentCriteriaAiAuto[effectiveId]);
                }
                if (Array.isArray(draft.assessmentSelectedCriteria?.[effectiveId])) {
                    initSelectedCriteria = draft.assessmentSelectedCriteria[effectiveId];
                } else if (Array.isArray(saved?.assessmentSelectedCriteria?.[effectiveId])) {
                    initSelectedCriteria = saved.assessmentSelectedCriteria[effectiveId];
                }
                const extractRubricFromObj = (item) => {
                    if (!item || typeof item !== 'object') return '';
                    if (typeof item.rubricFileName === 'string' && item.rubricFileName.trim()) return item.rubricFileName.trim();
                    if (typeof item.perfRubricFileName === 'string' && item.perfRubricFileName.trim()) return item.perfRubricFileName.trim();
                    if (typeof item.rubricName === 'string' && item.rubricName.trim()) return item.rubricName.trim();
                    if (typeof item.rubricFile === 'string' && item.rubricFile.trim()) return item.rubricFile.trim();
                    if (item.rubricFile && typeof item.rubricFile === 'object') {
                        const n = item.rubricFile.name || item.rubricFile.fileName || item.rubricFile.title;
                        if (n && typeof n === 'string' && n.trim()) return n.trim();
                    }
                    if (typeof item.rubric === 'string' && item.rubric.trim()) return item.rubric.trim();
                    if (item.rubric && typeof item.rubric === 'object') {
                        const n = item.rubric.fileName || item.rubric.name || item.rubric.title || item.rubric.file;
                        if (n && typeof n === 'string' && n.trim()) return n.trim();
                    }
                    if (typeof item.gradingRubric === 'string' && item.gradingRubric.trim()) return item.gradingRubric.trim();
                    if (item.gradingRubric && typeof item.gradingRubric === 'object') {
                        const n = item.gradingRubric.fileName || item.gradingRubric.name || item.gradingRubric.title;
                        if (n && typeof n === 'string' && n.trim()) return n.trim();
                    }
                    const files = Array.isArray(item.attachments) ? item.attachments : (Array.isArray(item.files) ? item.files : []);
                    for (const f of files) {
                        if (!f) continue;
                        if (typeof f === 'string' && (/rubric/i.test(f) || /sample_grading/i.test(f))) return f.trim();
                        if (typeof f === 'object') {
                            const isRub = f.type === 'rubric' || f.category === 'rubric' || f.isRubric || f.badgeText === 'RUBRIC' || (typeof f.tag === 'string' && f.tag.toLowerCase() === 'rubric');
                            const fname = f.name || f.fileName || f.title || '';
                            if (isRub || /rubric/i.test(fname)) {
                                if (fname && typeof fname === 'string' && fname.trim()) return fname.trim();
                            }
                        }
                    }
                    return '';
                };

                const itemMatchesTarget = (item, effId, tgtTitle) => {
                    if (!item) return false;
                    const cleanEff = String(effId || '').trim().toLowerCase();
                    const cleanTgt = String(tgtTitle || '').trim().toLowerCase();
                    const id = String(item.id || '').trim().toLowerCase();
                    const title = String(item.title || item.name || item.fileName || '').trim().toLowerCase();
                    if (cleanEff && (id === cleanEff || title === cleanEff)) return true;
                    if (cleanTgt && (title === cleanTgt || id === cleanTgt)) return true;
                    const normEff = cleanEff.replace(/[^a-z0-9]/g, '');
                    const normTgt = cleanTgt.replace(/[^a-z0-9]/g, '');
                    const normId = id.replace(/[^a-z0-9]/g, '');
                    const normTitle = title.replace(/[^a-z0-9]/g, '');
                    if (normEff && (normId === normEff || normTitle === normEff)) return true;
                    if (normTgt && (normTitle === normTgt || normId === normTgt)) return true;
                    if (normTgt && normTitle && (normTitle.includes(normTgt) || normTgt.includes(normTitle))) {
                        if (normTitle.length >= 4 && normTgt.length >= 4) return true;
                    }
                    return false;
                };

                const findAssessmentOrMaterialRubric = (subjId, effId, tgtTitle) => {
                    const effIdStr = String(effId || '');
                    if (draft.assessmentRubrics?.[effId]) return draft.assessmentRubrics[effId];
                    if (effIdStr && draft.assessmentRubrics?.[effIdStr]) return draft.assessmentRubrics[effIdStr];
                    if (tgtTitle && draft.assessmentRubrics?.[tgtTitle]) return draft.assessmentRubrics[tgtTitle];
                    if (saved?.assessmentRubrics?.[effId]) return saved.assessmentRubrics[effId];
                    if (effIdStr && saved?.assessmentRubrics?.[effIdStr]) return saved.assessmentRubrics[effIdStr];
                    if (tgtTitle && saved?.assessmentRubrics?.[tgtTitle]) return saved.assessmentRubrics[tgtTitle];

                    return findAdminLockedRubric(subjId, effId, tgtTitle);
                };

                // Returns the rubric name ONLY if it was uploaded by admin (locked, teacher cannot change/delete)
                const isAdminRole = (item) => {
                    if (!item) return false;
                    const role = String(item.authorRole || item.role || '').toLowerCase();
                    if (role === 'admin') return true;
                    if (item.isAdmin === true) return true;
                    // If neither teacher nor admin explicitly set, treat admin-subjects entry as admin-owned
                    return false;
                };
                const findAdminLockedRubric = (subjId, effId, tgtTitle) => {
                    // 1. Check sigma-admin-subjects
                    try {
                        const adminSubjects = getStoredJson('sigma-admin-subjects', []);
                        for (const s of adminSubjects) {
                            if (!s) continue;
                            if (Array.isArray(s.materials)) {
                                for (const m of s.materials) {
                                    if (itemMatchesTarget(m, effId, tgtTitle) && isAdminRole(m)) {
                                        const r = extractRubricFromObj(m);
                                        if (r) return r;
                                    }
                                }
                            }
                            if (Array.isArray(s.topics)) {
                                for (const t of s.topics) {
                                    if (!t) continue;
                                    const subArrays = [t.assignments, t.quizzes, t.activities, t.performanceTasks, t.materials, t.handouts];
                                    for (const arr of subArrays) {
                                        if (Array.isArray(arr)) {
                                            for (const it of arr) {
                                                if (itemMatchesTarget(it, effId, tgtTitle) && isAdminRole(it)) {
                                                    const r = extractRubricFromObj(it);
                                                    if (r) return r;
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    } catch (e) {}
                    // 2. Check in-memory currentSubjectAllMaterials / currentSubjectMaterials
                    try {
                        const mats = Array.isArray(window.currentSubjectAllMaterials) ? window.currentSubjectAllMaterials
                            : (Array.isArray(window.currentSubjectMaterials) ? window.currentSubjectMaterials : []);
                        for (const m of mats) {
                            if (itemMatchesTarget(m, effId, tgtTitle) && isAdminRole(m)) {
                                const r = extractRubricFromObj(m);
                                if (r) return r;
                            }
                        }
                    } catch (e) {}
                    return '';
                };

                linkedRubricName = isScheduleQuiz ? '' : (findAssessmentOrMaterialRubric(subjectId, effectiveId, targetTitle) || '');
                adminLockedRubricName = isScheduleQuiz ? '' : (findAdminLockedRubric(subjectId, effectiveId, targetTitle) || '');
                // Store in draft so upload/delete guards can check
                if (adminLockedRubricName) {
                    draft._adminLockedRubric = adminLockedRubricName;
                } else {
                    delete draft._adminLockedRubric;
                }
            }
        }

        if (!draft._initialSnapshot || !isModalAlreadyOpen || (editType && draft._editType !== editType)) {
            draft._initialSnapshot = {
                // Schedule fields
                isReleaseNow: Boolean(isReleaseNow),
                dateVal: String(initDate || todayDateStr || '').trim(),
                timeVal: String((hasActiveSchedule && !isDateOnly && initTime) ? initTime : '').trim(),
                isNoDeadline: Boolean(isNoDeadline),
                endDateVal: String(initEndDate || '').trim(),
                endTimeVal: String((hasActiveEndSchedule && !isEndDateOnly && initEndTime) ? initEndTime : '').trim(),
                // Grading fields
                maxScore: String(initMaxScore !== undefined && initMaxScore !== null ? initMaxScore : ''),
                weight: String(initWeight !== undefined && initWeight !== null ? initWeight : ''),
                activityComponent: String(initActivityComponent || ''),
                maxAttempts: String(initMaxAttempts !== undefined && initMaxAttempts !== null ? initMaxAttempts : ''),
                latePermission: Boolean(initLatePermission),
                hasTimer: Boolean(initHasTimer),
                timeLimitMinutes: String(initTimeLimitMinutes || 30),
                autoSubmitOnExit: Boolean(initAutoSubmitOnExit),
                gradingMode: String(initGradingMode || ''),
                essayGradingMode: String(initEssayGradingMode || ''),
                manualReviewTypes: JSON.stringify({
                    essay: true,
                    enumeration: Boolean(initManualReviewEnumeration),
                    shortAnswer: Boolean(initManualReviewShort)
                }),
                showCorrectAnswers: Boolean(initShowCorrectAnswers),
                allowFileUpload: Boolean(initAllowFileUpload),
                aiAssisted: Boolean(initAiAssisted),
                rubric: isScheduleQuiz ? '' : String(linkedRubricName || draft.assessmentRubrics?.[effectiveId] || ''),
                criteriaAiAuto: Boolean(initCriteriaAiAuto),
                selectedCriteria: JSON.stringify(initSelectedCriteria || [])
            };
        }

        let overlay = document.getElementById('teacher-topic-schedule-overlay');
        let isNewOverlay = false;
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'teacher-topic-schedule-overlay';
            overlay.className = 'curriculum-hub-overlay curriculum-hub-overlay--visible';
            isNewOverlay = true;
        } else {
            overlay.classList.remove('hidden');
            overlay.classList.add('curriculum-hub-overlay--visible');
        }
        overlay.dataset._historyPushed = 'true';
        overlay.dataset._category = category;
        overlay.dataset._isActivity = isActivity ? 'true' : 'false';
        overlay.dataset._isQuiz = isScheduleQuiz ? 'true' : 'false';
        overlay.dataset._subjectId = subjectId || '';
        overlay.dataset._hasEssay = 'false';
        overlay.dataset._editType = editType || draft._editType || '';
        overlay.onclick = function (e) {
            e.stopPropagation();
        };

        if (isNewOverlay && typeof window.pushModalHistoryState === 'function') {
            window.pushModalHistoryState('teacher-topic-schedule-overlay');
        }

        const modalMaxWidth = '!max-w-[860px]';
        const modalStyleWidth = 'max-width: 860px;';
        const modalStyleHeight = 'height: 740px; min-height: min(740px, calc(100vh - 40px)); max-height: calc(100vh - 40px);';

        const saveBtnText = isEditMode ? 'Save Changes' : 'Save Schedule';

        let backBtnAction = `window.backFromTeacherScheduleModal('${category}', event)`;
        let primaryBtnText = saveBtnText;
        let primaryBtnId = 'teacher-save-schedule-btn';
        let primaryBtnAction = `window.saveTeacherUnifiedSchedule?.('${category}')`;

        if (isStudentsPage) {
            const prevStep = (draft._prevStep && draft._prevStep !== 'students') ? draft._prevStep : 'schedule';
            backBtnAction = `window.goToTeacherScheduleStep?.('${category}', '${effectiveId}', '${prevStep}')`;
            primaryBtnText = 'Done';
            primaryBtnId = 'teacher-students-done-btn';
            primaryBtnAction = `window.goToTeacherScheduleStep?.('${category}', '${effectiveId}', '${prevStep}')`;
        } else if (isGradingPage) {
            if (effectiveEditType === 'grading') {
                backBtnAction = `window.backFromTeacherScheduleModal('${category}', event)`;
            } else {
                backBtnAction = `window.goToTeacherScheduleStep?.('${category}', '${effectiveId}', 'schedule')`;
            }
            primaryBtnText = saveBtnText;
            primaryBtnId = 'teacher-save-schedule-btn';
            primaryBtnAction = `window.saveTeacherUnifiedSchedule?.('${category}')`;
        } else {
            // Schedule step
            backBtnAction = `window.backFromTeacherScheduleModal('${category}', event)`;
            const hasUnifiedAssessments = Boolean(uSel && Array.isArray(uSel.assessments) && uSel.assessments.length > 0);
            if ((category === 'assessments' || hasUnifiedAssessments) && effectiveEditType !== 'schedule') {
                primaryBtnText = 'Set Details';
                primaryBtnId = 'teacher-set-grading-btn';
                const targetAssId = (uSel && Array.isArray(uSel.assessments) && uSel.assessments.length > 0) ? uSel.assessments[0] : effectiveId;
                primaryBtnAction = `window.goToTeacherScheduleStep?.('assessments', '${targetAssId}', 'grading')`;
            } else {
                primaryBtnText = saveBtnText;
                primaryBtnId = 'teacher-save-schedule-btn';
                primaryBtnAction = `window.saveTeacherUnifiedSchedule?.('${category}')`;
            }
        }

        overlay.innerHTML = `
            <div class="curriculum-hub-panel curriculum-release-panel-fixed w-full ${modalMaxWidth} flex flex-col overflow-hidden" style="${modalStyleHeight} ${modalStyleWidth}" onclick="window.closeTeacherScheduleTimePopover?.(); window.closeTeacherScheduleItemDropdown?.(); window.closeTeacherScheduleActivityComponentDropdown?.(); event.stopPropagation()">
                <!-- Header -->
                <div class="px-6 sm:px-8 py-5 border-b border-slate-100 flex items-center justify-between shrink-0 font-['Inter']">
                    <div class="flex items-center gap-3">
                        <button type="button" 
                            class="picker-header-back-btn p-1 bg-transparent hover:bg-transparent flex sm:hidden items-center justify-center text-black hover:text-black/70 transition-colors cursor-pointer shrink-0 border-0 outline-none"
                            onclick="${backBtnAction}"
                            title="Back">
                            <i class="fa-solid fa-chevron-left text-sm text-black"></i>
                        </button>
                        <div>
                            <h2 class="text-xl font-bold text-black font-['Inter'] tracking-tight">
                                ${isStudentsPage 
                                    ? 'Assigned Students' 
                                    : (isGradingPage 
                                        ? (effectiveEditType === 'grading' ? 'Edit Details' : 'Set Details') 
                                        : (effectiveEditType === 'schedule' ? 'Edit Schedule' : 'Set Schedule')
                                    )
                                }
                            </h2>
                            <p class="text-xs font-medium text-black-fade font-['Inter'] mt-0.5">
                                ${isStudentsPage
                                    ? `Choose which students in this section will receive and access this ${category === 'assessments' ? 'assessment' : (category === 'learning' ? 'material' : 'topic')}.`
                                    : (isGradingPage 
                                        ? 'Configure scoring limits, attempt allowances, late submission policy, and grading method.' 
                                        : (effectiveEditType === 'schedule' 
                                            ? `Update release date & time for ${escapeHtml(meta.labelPlural)}.`
                                            : `Set release date & time for ${escapeHtml(meta.labelPlural)} to unlock automatically.`
                                        )
                                    )
                                }
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Body -->
                <div class="p-6 sm:px-8 py-6 overflow-y-auto flex-1 min-h-0 space-y-6 font-['Inter']" id="teacher-schedule-modal-body">
                    ${!isStudentsPage ? `
                        <!-- Section Context Strip (Shared Standard Format) -->
                        <div class="release-context-strip flex flex-wrap items-center gap-x-2.5 sm:gap-x-3.5 gap-y-1.5 px-3 sm:px-4 py-2 bg-black/[0.03] border border-black/10 rounded-xl text-[11px] sm:text-xs font-['Inter'] text-black min-w-0">
                            <span class="inline-flex items-center gap-1 leading-none"><b>Section:</b> <span>${escapeHtml(sectionNameOnly)}</span></span>
                            <span class="inline-flex items-center gap-1 leading-none before:content-['|'] before:text-black/25 before:mr-2.5 sm:before:mr-3.5"><b>Grade:</b> <span>${escapeHtml(gradeLevel)}</span></span>
                            <span class="inline-flex items-center gap-1 leading-none before:content-['|'] before:text-black/25 before:mr-2.5 sm:before:mr-3.5"><b>Room:</b> <span>${escapeHtml(roomNumber)}</span></span>
                            <span class="inline-flex items-center gap-1 leading-none before:content-['|'] before:text-black/25 before:mr-2.5 sm:before:mr-3.5"><b>SY:</b> <span>${escapeHtml(schoolYear)}</span></span>
                            <span class="inline-flex items-center gap-1.5 leading-none before:content-['|'] before:text-black/25 before:mr-2.5 sm:before:mr-3.5">
                                <b>Students:</b>
                                <button type="button" onclick="window.goToTeacherScheduleStep?.('${category}', '${effectiveId}', 'students')" 
                                    class="inline-flex items-center px-1.5 py-0.5 bg-white hover:bg-slate-100 active:bg-slate-200 border border-slate-200/90 hover:border-slate-300 rounded-md font-bold text-[#15803d] shadow-2xs transition-all cursor-pointer select-none leading-none font-['Inter']"
                                    title="Click to view and configure assigned students">
                                    <span id="teacher-schedule-header-students-summary">${selectedStudentsSummary}</span>
                                </button>
                            </span>
                        </div>
                    ` : ''}

                    ${selectableItems.length === 1 ? `
                        <div class="p-3 sm:p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 font-['Inter'] min-w-0">
                            <span class="text-xs font-bold text-black shrink-0">${isGradingPage ? 'Assessment' : (selectableItems[0].type || meta.labelSingle || 'Item')}:</span>
                            <span class="text-xs font-medium text-black truncate min-w-0 flex-1 leading-relaxed">${escapeHtml(selectableItems[0].title || '')}</span>
                        </div>
                    ` : ''}

                    <!-- Multi-item Dropdown Selector (When > 1 item selected) -->
                    ${selectableItems.length > 1 ? `
                        <div class="space-y-2 font-['Inter'] min-w-0">
                            <div class="p-3 sm:p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 font-['Inter'] min-w-0">
                                <span class="text-xs font-bold text-black shrink-0">${isGradingPage ? 'Assessments' : (isUnifiedMulti ? 'Selected Items' : (meta.labelPluralTitleCase || meta.labelPlural))}:</span>
                                <div class="relative flex-1 min-w-0 w-full" id="teacher-schedule-custom-dropdown-container">
                                    <button type="button" 
                                        id="teacher-schedule-dropdown-btn"
                                        onclick="window.toggleTeacherScheduleItemDropdown?.(event)"
                                        class="w-full bg-white border border-slate-200 rounded-xl text-xs font-normal text-black py-2 px-3 sm:px-3.5 flex items-center justify-between gap-2 shadow-2xs hover:border-slate-300 transition-colors cursor-pointer text-left font-['Inter']">
                                        <span class="truncate block font-medium text-black leading-normal" id="teacher-schedule-dropdown-btn-label">
                                            ${activeSelectedItem ? `${activeSelectedItem.type ? `[${activeSelectedItem.type}] ` : ''}${activeSelectedItem.title}` : (selectableItems[0]?.title || '')}
                                        </span>
                                        <i class="fa-solid fa-chevron-down text-[11px] text-gray-500 shrink-0 transition-transform duration-200" id="teacher-schedule-dropdown-arrow"></i>
                                    </button>

                                    <!-- Dropdown Menu Popover -->
                                    <div id="teacher-schedule-dropdown-menu" 
                                        class="hidden absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-1.5 max-h-60 overflow-y-auto font-['Inter']"
                                        onclick="event.stopPropagation()">
                                        ${selectableItems.map(it => {
                                            const isSelected = String(it.id) === String(effectiveId);
                                            return `
                                                <div onclick="window.selectTeacherScheduleCustomItem?.('${it.category || category}', '${escapeHtml(it.id)}', '${activeStep}')"
                                                    class="px-3 py-2 text-xs rounded-lg cursor-pointer flex items-center justify-between gap-2.5 transition-colors ${isSelected ? 'bg-emerald-50 text-[#15803d] font-semibold' : 'font-medium text-black hover:bg-slate-50 hover:text-black'}">
                                                    <span class="truncate block text-left leading-normal flex items-center gap-2 ${isSelected ? 'text-[#15803d] font-semibold' : 'text-black'}">
                                                        ${it.icon ? `<i class="fa-solid ${it.icon} text-xs shrink-0"></i>` : ''}
                                                        <span class="truncate">${escapeHtml(it.title)}</span>
                                                        ${it.type ? `<span class="px-1.5 py-0.5 rounded text-[10px] font-semibold ${isSelected ? 'bg-emerald-100/70 text-[#15803d]' : 'bg-slate-100 text-black/60'} shrink-0">${escapeHtml(it.type)}</span>` : ''}
                                                    </span>
                                                </div>
                                            `;
                                        }).join('')}
                                    </div>
                                </div>
                            </div>
                            <div class="flex items-center gap-2 px-1 text-[11px] text-black-fade font-['Inter']">
                                <i class="fa-solid fa-circle-info text-[#15803d] text-xs shrink-0"></i>
                                <span class="text-black-fade">You have ${selectableItems.length} items selected. Make sure to set the ${isGradingPage ? 'details' : (isStudentsPage ? 'assigned students' : 'schedule')} for all the selected items using the dropdown above.</span>
                            </div>
                        </div>
                    ` : ''}

                    ${isStudentsPage ? `
                        <!-- PAGE 3: ASSIGNED STUDENTS CHECKBOX LIST -->
                        <div class="space-y-4 font-['Inter']">
                            <!-- Top Action Bar: Search & Select All -->
                            <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 bg-black/[0.02] border border-black/10 rounded-2xl">
                                <!-- Search Input -->
                                <div class="relative flex-1 min-w-[200px]">
                                    <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-black-fade pointer-events-none"></i>
                                    <input type="text" id="teacher-student-schedule-search" placeholder="Search student by name or ID..."
                                        oninput="window.filterTeacherScheduleStudentsList?.(this.value)"
                                        class="w-full bg-white border border-slate-200 rounded-xl pr-3.5 py-2 text-xs font-medium text-black placeholder-black-fade placeholder:text-black-fade focus:outline-none focus:border-slate-800 transition-colors shadow-2xs font-['Inter']"
                                        style="padding-left: 2.5rem !important;" />
                                </div>

                                <!-- Select All / Count Bar -->
                                <div class="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 font-['Inter']">
                                    <label class="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs cursor-pointer select-none hover:bg-slate-50 transition-colors font-['Inter']">
                                        <input type="checkbox" id="teacher-schedule-students-select-all"
                                            ${selectedStudentsCount === totalStudentsCount && totalStudentsCount > 0 ? 'checked' : ''}
                                            onchange="window.toggleTeacherScheduleSelectAllStudents?.(this.checked, '${category}', '${effectiveId}')"
                                            class="w-4 h-4 rounded text-[#15803d] focus:ring-0 border-slate-300 cursor-pointer accent-[#15803d] shrink-0" />
                                        <span class="text-xs font-normal text-black">Select All</span>
                                    </label>
                                    <span class="text-xs font-bold text-black bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs shrink-0" id="teacher-schedule-students-count-badge">
                                        ${selectedStudentsCount} of ${totalStudentsCount} Selected
                                    </span>
                                </div>
                            </div>

                            <!-- Student Instruction Notice -->
                            <p class="text-[11px] text-black-fade px-1">
                                Checked students will receive this material. If a student is added to this section later, their box will remain unchecked until assigned.
                            </p>

                            <!-- Students Grid / List -->
                            <div class="max-h-[320px] overflow-y-auto pr-1 space-y-2 font-['Inter']" id="teacher-schedule-students-list-container">
                                ${sectionStudents.length === 0 ? `
                                    <div class="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-2xl font-['Inter']">
                                        <i class="fa-solid fa-users text-2xl text-black-fade mb-2 opacity-50"></i>
                                        <p class="text-xs font-bold text-black">No Enrolled Students</p>
                                        <p class="text-[11px] text-black-fade mt-0.5">No students are currently enrolled in ${escapeHtml(section)}.</p>
                                    </div>
                                ` : sectionStudents.map((st, idx) => {
                                    const stId = String(st.id || `STD-${String(idx + 1).padStart(3, '0')}`);
                                    const stName = st.name || `${st.lastName || ''}, ${st.firstName || ''}`.trim() || `Student ${idx + 1}`;
                                    const isChecked = currentAssignedList.includes(stId) || currentAssignedList.includes(stName);
                                    const avatarHtml = (typeof window.renderUserAvatarHtml === 'function')
                                        ? window.renderUserAvatarHtml(st, 'sm')
                                        : `<div class="sigma-user-avatar sigma-user-avatar--sm"><i class="fa-solid fa-user"></i></div>`;
                                    
                                    return `
                                        <div class="teacher-schedule-student-row flex items-center justify-between gap-3.5 p-3.5 bg-white hover:bg-slate-50 border-2 border-slate-200 rounded-2xl transition-all cursor-pointer font-['Inter'] shadow-2xs select-none"
                                            data-student-id="${escapeHtml(stId)}"
                                            data-student-name="${escapeHtml(stName.toLowerCase())}"
                                            onclick="window.toggleTeacherScheduleStudent?.('${category}', '${effectiveId}', '${escapeHtml(stId)}', event)">
                                            
                                            <div class="flex items-center gap-3.5 min-w-0 flex-1">
                                                <input type="checkbox" id="teacher-st-chk-${escapeHtml(stId)}"
                                                    ${isChecked ? 'checked' : ''}
                                                    onclick="event.stopPropagation(); window.toggleTeacherScheduleStudent?.('${category}', '${effectiveId}', '${escapeHtml(stId)}', event)"
                                                    class="w-4 h-4 rounded text-[#15803d] focus:ring-0 border-slate-300 cursor-pointer accent-[#15803d] shrink-0" />
                                                
                                                <div class="shrink-0 flex items-center justify-center">
                                                    ${avatarHtml}
                                                </div>

                                                <div class="min-w-0 flex-1">
                                                    <p class="text-[13px] font-bold text-black truncate leading-snug font-['Inter']">${escapeHtml(stName)}</p>
                                                    <p class="text-[11px] text-black-fade font-medium leading-tight mt-0.5 font-['Inter']">ID: ${escapeHtml(stId)}</p>
                                                </div>
                                            </div>

                                            <div class="shrink-0 flex items-center gap-2">
                                                <span class="text-[10px] font-bold px-2 py-0.5 rounded-md ${st.status === 'Active' ? 'bg-emerald-50 text-[#15803d] border border-emerald-200/70' : 'bg-slate-100 text-slate-600 border border-slate-200'}">
                                                    ${escapeHtml(st.status || 'Active')}
                                                </span>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    ` : (!isGradingPage ? `
                        <!-- PAGE 1: DATE & TIME CONTAINER -->
                        <div class="space-y-4 font-['Inter']">
                            ${isDueDateSupported ? `
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 font-['Inter']">
                                    <!-- 1. RELEASE DATE COLUMN -->
                                    <div class="space-y-3 p-4 rounded-xl border border-black/10 bg-black/[0.02]">
                                        <div>
                                            <h3 class="text-xs font-bold text-[#15803d] block font-['Inter']">Release Date</h3>
                                            <p class="text-[11px] font-normal text-black-fade block leading-tight mt-0.5">When assessments unlock and become visible to students</p>
                                        </div>

                                        <!-- Release Immediately Toggle -->
                                        <label class="flex items-center gap-2.5 cursor-pointer select-none py-1">
                                            <input type="checkbox" id="teacher-schedule-release-now-chk" 
                                                ${isReleaseNow ? 'checked' : ''}
                                                onchange="window.toggleTeacherScheduleReleaseNow?.(this.checked, '${category}')"
                                                class="w-4 h-4 rounded text-[#15803d] focus:ring-0 border-slate-300 cursor-pointer accent-[#15803d] shrink-0" />
                                            <span class="text-xs font-semibold text-black">Release immediately</span>
                                        </label>

                                        <!-- Release Date & Time Inputs (Faded if Release Immediately) -->
                                        <div id="teacher-schedule-release-datetime-box" class="space-y-2 transition-all duration-200 ${isReleaseNow ? 'opacity-40 pointer-events-none' : ''}">
                                            <!-- Date Box -->
                                            <div id="teacher-release-date-box" class="relative flex items-center ${isReleaseNow ? 'bg-black/[0.03] border border-black/10' : 'bg-white border border-slate-200 hover:border-slate-300'} focus-within:border-slate-400 rounded-xl h-10 px-3 transition-all shadow-2xs w-full cursor-text">
                                                <input type="date" max="9999-12-31" onpointerdown="window.keepScheduleDateTimeForward?.(true)" id="teacher-exact-date-input" value="${initDate}"
                                                    ${isReleaseNow ? 'tabindex="-1" readonly' : ''}                                                    oninput="window.validateTeacherScheduleInputs?.('${category}');"
                                                    onchange="window.validateTeacherScheduleInputs?.('${category}');"
                                                    style="color-scheme: light;"
                                                    class="w-full h-full bg-transparent text-xs font-semibold ${isReleaseNow ? 'text-black-fade' : 'text-black'} outline-none border-none p-0 font-['Inter']" />
                                            </div>

                                            <!-- Time Box -->
                                            <div id="teacher-time-panel-box" 
                                                class="relative flex items-center justify-between ${isReleaseNow ? 'bg-black/[0.03] border border-black/10' : 'bg-white border border-slate-200 hover:border-slate-300'} focus-within:border-slate-400 rounded-xl h-10 px-3 transition-all shadow-2xs font-['Inter'] w-full cursor-text">
                                                <input type="time" onpointerdown="window.keepScheduleDateTimeForward?.(true)" id="teacher-time-input" value="${initTime24 || '08:00'}"
                                                    ${isReleaseNow ? 'tabindex="-1" readonly' : ''}                                                    oninput="window.validateTeacherScheduleInputs?.('${category}');"
                                                    onchange="window.validateTeacherScheduleInputs?.('${category}');"
                                                    style="color-scheme: light;"
                                                    class="w-full h-full bg-transparent text-xs font-semibold ${isReleaseNow ? 'text-black-fade' : 'text-black'} outline-none border-none p-0 font-['Inter']" />
                                                <i class="fa-regular fa-clock text-xs text-black/40 shrink-0 pointer-events-none hidden max-sm:inline-block"></i>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- 2. DUE DATE COLUMN (DEADLINE) -->
                                    <div class="space-y-3 p-4 rounded-xl border border-black/10 bg-black/[0.02]">
                                        <div>
                                            <h3 class="text-xs font-bold text-[#15803d] block font-['Inter']">Due Date</h3>
                                            <p class="text-[11px] font-normal text-black-fade block leading-tight mt-0.5">Target deadline for students to finish or submit work</p>
                                        </div>

                                        <!-- No Deadline Toggle -->
                                        <label class="flex items-center gap-2.5 cursor-pointer select-none py-1">
                                            <input type="checkbox" id="teacher-schedule-no-deadline-chk" 
                                                ${isNoDeadline ? 'checked' : ''}
                                                onchange="window.toggleTeacherScheduleNoDeadline?.(this.checked, '${category}')"
                                                class="w-4 h-4 rounded text-[#15803d] focus:ring-0 border-slate-300 cursor-pointer accent-[#15803d] shrink-0" />
                                            <span class="text-xs font-semibold text-black">No due date</span>
                                        </label>

                                        <!-- Due Date & Time Inputs (Faded if No Deadline) -->
                                        <div id="teacher-schedule-due-datetime-box" class="space-y-2 transition-all duration-200 ${isNoDeadline ? 'opacity-40 pointer-events-none' : ''}">
                                            <!-- Due Date Box -->
                                            <div id="teacher-due-date-box" class="relative flex items-center ${isNoDeadline ? 'bg-black/[0.03] border border-black/10' : 'bg-white border border-slate-200 hover:border-slate-300'} focus-within:border-slate-400 rounded-xl h-10 px-3 transition-all shadow-2xs w-full cursor-text">
                                                <input type="date" max="9999-12-31" onpointerdown="window.keepScheduleDateTimeForward?.(true)" id="teacher-exact-end-date-input" value="${initEndDate || ''}"
                                                    ${isNoDeadline ? 'tabindex="-1" readonly' : ''}                                                    oninput="window.validateTeacherScheduleInputs?.('${category}');"
                                                    onchange="window.validateTeacherScheduleInputs?.('${category}');"
                                                    style="color-scheme: light;"
                                                    class="w-full h-full bg-transparent text-xs font-semibold ${isNoDeadline ? 'text-black-fade' : 'text-black'} outline-none border-none p-0 font-['Inter']" />
                                            </div>

                                            <!-- Due Time Box -->
                                            <div id="teacher-end-time-panel-box" 
                                                class="relative flex items-center justify-between ${isNoDeadline ? 'bg-black/[0.03] border border-black/10' : 'bg-white border border-slate-200 hover:border-slate-300'} focus-within:border-slate-400 rounded-xl h-10 px-3 transition-all shadow-2xs font-['Inter'] w-full cursor-text">
                                                <input type="time" onpointerdown="window.keepScheduleDateTimeForward?.(true)" id="teacher-end-time-input" value="${initEndTime24 || '23:59'}"
                                                    ${isNoDeadline ? 'tabindex="-1" readonly' : ''}                                                    oninput="window.validateTeacherScheduleInputs?.('${category}');"
                                                    onchange="window.validateTeacherScheduleInputs?.('${category}');"
                                                    style="color-scheme: light;"
                                                    class="w-full h-full bg-transparent text-xs font-semibold ${isNoDeadline ? 'text-black-fade' : 'text-black'} outline-none border-none p-0 font-['Inter']" />
                                                <i class="fa-regular fa-clock text-xs text-black/40 shrink-0 pointer-events-none hidden max-sm:inline-block"></i>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ` : `
                                <!-- SINGLE COLUMN RELEASE DATE WITH SIDE-BY-SIDE DATE & TIME -->
                                <div class="space-y-4 p-5 rounded-2xl border border-black/10 bg-black/[0.02]">
                                    <div>
                                        <h3 class="text-xs font-bold text-[#15803d] block font-['Inter']">Release Date & Time</h3>
                                        <p class="text-[11px] font-normal text-black-fade block leading-tight mt-0.5">When ${escapeHtml(isUnifiedMulti ? (activeItemCategory === 'topics' ? 'topics' : 'learning materials') : meta.labelPlural)} unlock and become visible to students</p>
                                    </div>

                                    <!-- Release Immediately Toggle -->
                                    <label class="flex items-center gap-2.5 cursor-pointer select-none py-1">
                                        <input type="checkbox" id="teacher-schedule-release-now-chk" 
                                            ${isReleaseNow ? 'checked' : ''}
                                            onchange="window.toggleTeacherScheduleReleaseNow?.(this.checked, '${category}')"
                                            class="w-4 h-4 rounded text-[#15803d] focus:ring-0 border-slate-300 cursor-pointer accent-[#15803d] shrink-0" />
                                        <span class="text-xs font-semibold text-black">Release immediately</span>
                                    </label>

                                    <!-- Release Date & Time Inputs Side-by-Side (Faded if Release Immediately) -->
                                    <div id="teacher-schedule-release-datetime-box" class="grid grid-cols-1 sm:grid-cols-2 gap-3 transition-all duration-200 ${isReleaseNow ? 'opacity-40 pointer-events-none' : ''}">
                                        <!-- Date Box -->
                                        <div id="teacher-release-date-box" class="relative flex items-center ${isReleaseNow ? 'bg-black/[0.03] border border-black/10' : 'bg-white border border-slate-200 hover:border-slate-300'} focus-within:border-slate-400 rounded-xl h-10 px-3 transition-all shadow-2xs w-full cursor-text">
                                            <input type="date" max="9999-12-31" onpointerdown="window.keepScheduleDateTimeForward?.(true)" id="teacher-exact-date-input" value="${initDate}"
                                                ${isReleaseNow ? 'tabindex="-1" readonly' : ''}
                                                oninput="window.validateTeacherScheduleInputs?.('${category}');"
                                                onchange="window.validateTeacherScheduleInputs?.('${category}');"
                                                style="color-scheme: light;"
                                                class="w-full h-full bg-transparent text-xs font-semibold ${isReleaseNow ? 'text-black-fade' : 'text-black'} outline-none border-none p-0 cursor-text font-['Inter']" />
                                        </div>

                                        <!-- Time Box -->
                                        <div id="teacher-time-panel-box" 
                                            class="relative flex items-center justify-between ${isReleaseNow ? 'bg-black/[0.03] border border-black/10' : 'bg-white border border-slate-200 hover:border-slate-300'} focus-within:border-slate-400 rounded-xl h-10 px-3 transition-all shadow-2xs font-['Inter'] w-full cursor-text">
                                            <input type="time" onpointerdown="window.keepScheduleDateTimeForward?.(true)" id="teacher-time-input" value="${initTime24 || '08:00'}"
                                                ${isReleaseNow ? 'tabindex="-1" readonly' : ''}
                                                oninput="window.validateTeacherScheduleInputs?.('${category}');"
                                                onchange="window.updateScheduleHelperSummary?.('${category}');"
                                                style="color-scheme: light;"
                                                class="w-full h-full bg-transparent text-xs font-semibold ${isReleaseNow ? 'text-black-fade' : 'text-black'} outline-none border-none p-0 cursor-text font-['Inter']" />
                                            <i class="fa-regular fa-clock text-xs text-black/40 shrink-0 pointer-events-none hidden max-sm:inline-block"></i>
                                        </div>
                                    </div>
                                </div>
                            `}

                            <!-- Apply to all selected items (Topics, Learning Materials, Assessments) -->
                            ${selectableItems.length > 1 ? `
                                <div class="pt-3 border-t border-black/10">
                                    <label class="flex items-center gap-2.5 cursor-pointer select-none">
                                        <input type="checkbox" id="teacher-schedule-apply-all-chk" ${draft._applyAll !== false ? 'checked' : ''}
                                            onchange="window.handleTeacherScheduleApplyAllChange?.(this.checked, '${category}', '${effectiveId}')"
                                            class="w-4 h-4 rounded text-[#15803d] focus:ring-0 border-slate-300 cursor-pointer accent-[#15803d] shrink-0" />
                                        <span class="text-xs font-semibold text-gray-800">Apply this release schedule to all ${selectableItems.length} selected ${isUnifiedMulti ? 'items' : meta.labelPlural}</span>
                                    </label>
                                </div>
                            ` : ''}
                        </div>

                        <p id="teacher-schedule-helper-text" class="text-xs font-medium text-black font-['Inter'] leading-relaxed mt-2">
                            ${isReleaseNow 
                                ? `Selected ${isUnifiedMulti ? 'items' : meta.labelPlural} will be released and accessible to students immediately${isDueDateSupported && isNoDeadline ? ' with no deadline (can submit anytime)' : ''}.` 
                                : `Selected ${isUnifiedMulti ? 'items' : meta.labelPlural} will unlock automatically at this date & time.`
                            }
                        </p>
                    ` : `
                        <!-- PAGE 2: GRADING DETAILS -->
                        <div id="teacher-grading-configuration-card" class="p-5 sm:p-6 rounded-2xl border border-black/10 bg-black/[0.02] space-y-6 font-['Inter']">
                            <!-- 1. Top Core Parameters: Score, Weight, Attempts, Late Permission -->
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start font-['Inter']">
                                <!-- Highest Possible Score -->
                                <div class="space-y-1.5 min-w-0">
                                    <div class="flex items-center justify-between h-5">
                                        <label ${(isScheduleQuiz && hasAttachedQuizFile) ? '' : 'for="teacher-schedule-max-score"'} class="text-xs font-bold text-[#15803d] truncate ${(isScheduleQuiz && hasAttachedQuizFile) ? 'cursor-default select-none' : 'cursor-pointer'}">Highest Possible Score</label>
                                        ${(isScheduleQuiz && hasAttachedQuizFile) ? `
                                            <span class="inline-flex items-center gap-1 text-[10px] font-semibold text-black-fade bg-black/[0.04] border border-black/10 px-1.5 py-0.5 rounded-md leading-none shrink-0 select-none">
                                                <i class="fa-solid fa-lock text-[8px]"></i> Quiz file
                                            </span>
                                        ` : ''}
                                    </div>
                                    ${(isScheduleQuiz && hasAttachedQuizFile) ? `
                                        <div class="relative flex items-center bg-slate-100/70 border border-slate-200 rounded-xl h-11 px-3.5 shadow-2xs cursor-not-allowed select-none">
                                            <input type="number" id="teacher-schedule-max-score" value="${initMaxScore !== undefined && initMaxScore !== null ? initMaxScore : ''}" readonly disabled tabindex="-1"
                                                class="w-full bg-transparent text-xs font-bold text-slate-700 outline-none border-none p-0 cursor-not-allowed font-['Inter'] pointer-events-none select-none" />
                                            <span class="text-xs font-semibold text-black ml-1.5 shrink-0 select-none pointer-events-none" style="color: #000;">pts</span>
                                        </div>
                                    ` : `
                                        <div class="relative flex items-center bg-white border border-slate-200 focus-within:border-[#FFD000] rounded-xl h-11 px-3.5 shadow-2xs transition-all">
                                            <input type="number" id="teacher-schedule-max-score" min="1" max="1000" value="${initMaxScore !== undefined && initMaxScore !== null ? initMaxScore : ''}"
                                                onkeydown="if(['e','E','+','-','.'].includes(event.key)) event.preventDefault();"
                                                oninput="if(this.value.length > 4) this.value = this.value.slice(0, 4); if(parseInt(this.value, 10) > 1000) this.value = '1000'; window.cacheActiveAssessmentGradingSettings?.(); window.validateTeacherScheduleInputs?.('assessments', false);"
                                                onblur="if(this.value && parseInt(this.value, 10) < 1) this.value = '1'; window.cacheActiveAssessmentGradingSettings?.(); window.validateTeacherScheduleInputs?.('assessments', false);"
                                                class="w-full bg-transparent text-xs font-bold text-slate-900 outline-none border-none p-0 font-['Inter'] placeholder-black-fade placeholder:text-black-fade" placeholder="e.g. 100" />
                                            <span class="text-xs font-semibold text-black ml-1.5 shrink-0 select-none" style="color: #000;">pts</span>
                                        </div>
                                    `}
                                </div>

                                <!-- Weight (%) Column -->
                                ${isScheduleQuiz ? `
                                    <div class="space-y-1.5 min-w-0 font-['Inter']">
                                        <div class="flex items-center justify-between h-5">
                                            <label class="text-xs font-bold text-[#15803d] truncate cursor-default select-none">Weight (%)</label>
                                            <span class="inline-flex items-center gap-1 text-[10px] font-semibold text-black-fade bg-black/[0.04] border border-black/10 px-1.5 py-0.5 rounded-md leading-none shrink-0 select-none">
                                                <i class="fa-solid fa-lock text-[8px]"></i> Auto
                                            </span>
                                        </div>
                                        <div class="relative flex items-center bg-slate-100/70 border border-slate-200 rounded-xl h-11 px-3.5 shadow-2xs cursor-not-allowed select-none">
                                            <span class="w-full bg-transparent text-xs font-bold text-slate-700 outline-none border-none p-0 cursor-not-allowed font-['Inter'] select-none pointer-events-none">Written Work (${subjWeights.ww}%)</span>
                                            <input type="hidden" id="teacher-schedule-weight" value="${subjWeights.ww}" />
                                            <input type="hidden" id="teacher-schedule-activity-component" value="ww" />
                                        </div>
                                    </div>
                                ` : `
                                    <div class="space-y-1.5 min-w-0 font-['Inter']">
                                        <div class="flex items-center justify-between h-5">
                                            <label class="text-xs font-bold text-[#15803d] truncate">Weight (%)</label>
                                            <span id="teacher-activity-category-required" class="text-[10px] font-bold text-red-500 font-['Inter'] ${initActivityComponent ? 'hidden' : ''}">* Required</span>
                                        </div>
                                        <div class="relative w-full font-['Inter']" id="teacher-schedule-activity-component-container">
                                            <!-- Custom Dropdown Button -->
                                            <button type="button"
                                                id="teacher-schedule-activity-component-box"
                                                onclick="window.toggleTeacherScheduleActivityComponentDropdown?.(event)"
                                                class="relative flex items-center justify-between bg-white border border-slate-200 hover:border-slate-300 focus:border-[#FFD000] focus:ring-2 focus:ring-[#FFD000]/20 rounded-xl h-11 px-3.5 shadow-2xs w-full transition-all cursor-pointer text-left font-['Inter'] select-none">
                                                <span id="teacher-schedule-activity-component-label" class="text-xs truncate block ${!initActivityComponent ? 'text-black-fade font-medium' : 'text-slate-900 font-bold'}">
                                                    ${initActivityComponent === 'ww' 
                                                        ? `Written Work (${subjWeights.ww}%)` 
                                                        : (initActivityComponent === 'pt' 
                                                            ? `Performance Task (${subjWeights.pt}%)` 
                                                            : 'Select Component (WW or PT)')}
                                                </span>
                                                <i class="fa-solid fa-chevron-down text-xs text-black-fade shrink-0 transition-transform duration-200 ml-2" id="teacher-schedule-activity-component-arrow"></i>
                                            </button>

                                            <!-- Dropdown Menu Popover -->
                                            <div id="teacher-schedule-activity-component-menu" 
                                                class="hidden absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200/90 rounded-xl shadow-lg z-50 p-1.5 space-y-1 font-['Inter']"
                                                onclick="event.stopPropagation()">
                                                <div onclick="window.selectTeacherScheduleActivityComponent?.('ww')"
                                                    class="px-3.5 py-2.5 text-xs rounded-lg cursor-pointer flex items-center justify-between gap-2.5 transition-colors select-none ${initActivityComponent === 'ww' ? 'bg-emerald-50 text-[#15803d] font-bold' : 'font-medium text-slate-800 hover:bg-slate-50 hover:text-black'}">
                                                    <span class="truncate block">Written Work (${subjWeights.ww}%)</span>
                                                </div>
                                                <div onclick="window.selectTeacherScheduleActivityComponent?.('pt')"
                                                    class="px-3.5 py-2.5 text-xs rounded-lg cursor-pointer flex items-center justify-between gap-2.5 transition-colors select-none ${initActivityComponent === 'pt' ? 'bg-emerald-50 text-[#15803d] font-bold' : 'font-medium text-slate-800 hover:bg-slate-50 hover:text-black'}">
                                                    <span class="truncate block">Performance Task (${subjWeights.pt}%)</span>
                                                </div>
                                            </div>

                                            <input type="hidden" id="teacher-schedule-activity-component" value="${initActivityComponent || ''}" />
                                            <input type="hidden" id="teacher-schedule-weight" value="${initWeight !== undefined && initWeight !== null ? initWeight : ''}" />
                                        </div>
                                    </div>
                                `}

                                <!-- Max Attempts & Late Permission in 1 row (not full width) -->
                                <div class="col-span-1 sm:col-span-2">
                                    <div class="grid grid-cols-2 gap-3 sm:gap-4 max-w-sm sm:max-w-md items-start font-['Inter']">
                                        <!-- Max Attempts -->
                                        <div class="space-y-1.5 min-w-0">
                                            <div class="flex items-center justify-between h-5">
                                                <label for="teacher-schedule-max-attempts" class="text-xs font-bold text-[#15803d] truncate">Max Attempts</label>
                                            </div>
                                            <div class="relative flex items-center bg-white border border-slate-200 focus-within:border-[#FFD000] rounded-xl h-11 px-3.5 shadow-2xs transition-all">
                                                <input type="number" id="teacher-schedule-max-attempts" min="1" max="20" value="${initMaxAttempts !== undefined && initMaxAttempts !== null ? initMaxAttempts : ''}"
                                                    onkeydown="if(['e','E','+','-','.'].includes(event.key)) event.preventDefault();"
                                                    oninput="if(this.value.length > 2) this.value = this.value.slice(0, 2); if(parseInt(this.value, 10) > 20) this.value = '20'; window.cacheActiveAssessmentGradingSettings?.(); window.validateTeacherScheduleInputs?.('assessments', false);"
                                                    onblur="if(this.value && parseInt(this.value, 10) < 1) this.value = '1'; window.cacheActiveAssessmentGradingSettings?.(); window.validateTeacherScheduleInputs?.('assessments', false);"
                                                    class="w-full bg-transparent text-xs font-bold text-slate-900 outline-none border-none p-0 font-['Inter'] placeholder-black-fade placeholder:text-black-fade" placeholder="e.g. 1" />
                                                <span class="text-xs font-semibold text-black ml-1.5 shrink-0 select-none" style="color: #000;">tries</span>
                                            </div>
                                        </div>

                                        <!-- Late Permission -->
                                        <div class="space-y-1.5 min-w-0">
                                            <div class="flex items-center justify-between h-5">
                                                <label class="text-xs font-bold text-[#15803d] truncate">Late Permission</label>
                                            </div>
                                            <label class="flex items-center gap-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl h-11 px-3.5 shadow-2xs cursor-pointer select-none transition-all">
                                                <input type="checkbox" id="teacher-schedule-late-permission" ${initLatePermission ? 'checked' : ''}
                                                    onchange="window.cacheActiveAssessmentGradingSettings?.(); window.validateTeacherScheduleInputs?.('assessments', false);"
                                                    class="w-4 h-4 rounded text-[#15803d] focus:ring-0 border-slate-300 cursor-pointer accent-[#15803d] shrink-0" />
                                                <span class="text-xs font-bold text-black select-none font-['Inter'] whitespace-nowrap">Allow late</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            ${isScheduleQuiz ? `
                                <!-- 3. Quiz Time Limit & Submission Controls (Quizzes Only) -->
                                <div class="w-full space-y-2">
                                    <div class="flex items-center gap-2">
                                        <i class="fa-solid fa-stopwatch text-sm text-[#15803d]"></i>
                                        <span class="text-xs font-bold text-[#15803d] font-['Inter']">Quiz Time Limit</span>
                                    </div>
                                    <div class="p-4 sm:p-5 rounded-2xl border border-slate-200/90 bg-white shadow-2xs font-['Inter']">
                                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                                            <!-- Left group: No time limit + Time limit input -->
                                            <div class="flex flex-wrap items-center gap-3.5 min-w-0">
                                                <!-- No Time Limit Checkbox -->
                                                <label class="flex items-center gap-2 cursor-pointer select-none shrink-0 py-1">
                                                    <input type="checkbox" id="teacher-schedule-no-timelimit-chk" ${!initHasTimer ? 'checked' : ''}
                                                        onchange="window.toggleTeacherScheduleNoTimeLimit?.(this.checked)"
                                                        class="w-4 h-4 rounded text-[#15803d] focus:ring-0 border-slate-300 cursor-pointer accent-[#15803d] shrink-0" />
                                                    <span class="text-xs font-bold text-slate-800">No time limit</span>
                                                </label>

                                                <!-- Timer Duration Input (Locked when No Time Limit is checked) -->
                                                <div id="teacher-schedule-timelimit-box" class="flex items-center gap-2.5 ${!initHasTimer ? 'pointer-events-none' : ''}">
                                                    <label id="teacher-schedule-timelimit-shell" class="relative flex items-center ${!initHasTimer ? 'is-locked bg-slate-100 border-slate-200/90 cursor-not-allowed' : 'bg-white border-slate-200 focus-within:border-[#FFD000]'} border rounded-xl h-11 px-3.5 shadow-2xs w-32 shrink-0 transition-all" for="teacher-schedule-timelimit-input">
                                                        <i class="fa-solid fa-lock text-[11px] text-slate-400 mr-2 shrink-0 ${!initHasTimer ? '' : 'hidden'}" id="teacher-timelimit-lock-icon"></i>
                                                        <input type="number" id="teacher-schedule-timelimit-input" aria-label="Quiz time limit in minutes" min="1" max="300" value="${initTimeLimitMinutes || 30}"
                                                            ${!initHasTimer ? 'readonly disabled tabindex="-1"' : ''}
                                                            onkeydown="if(['e','E','+','-','.'].includes(event.key)) event.preventDefault();"
                                                            oninput="if(this.value.length > 3) this.value = this.value.slice(0, 3); if(parseInt(this.value, 10) > 300) this.value = '300'; window.cacheActiveAssessmentGradingSettings?.(); window.validateTeacherScheduleInputs?.('assessments', false);"
                                                            onblur="if(this.value && parseInt(this.value, 10) < 1) this.value = '1'; window.cacheActiveAssessmentGradingSettings?.(); window.validateTeacherScheduleInputs?.('assessments', false);"
                                                            class="w-full bg-transparent text-xs font-bold ${!initHasTimer ? 'text-slate-400 cursor-not-allowed' : 'text-black'} outline-none border-none p-0 font-['Inter'] placeholder:text-black-fade" style="color: ${!initHasTimer ? '#94a3b8' : '#000'};" placeholder="e.g. 30" />
                                                        <span id="teacher-timelimit-unit" class="text-xs font-semibold ${!initHasTimer ? 'text-slate-400' : 'text-black'} ml-1.5 shrink-0 select-none" style="color: ${!initHasTimer ? '#94a3b8' : '#000'};">mins</span>
                                                    </label>
                                                    <span class="text-[11px] text-black-fade font-medium hidden sm:inline" id="teacher-timelimit-hint-text">
                                                        ${!initHasTimer ? 'Untimed quiz (locked).' : 'Duration limit.'}
                                                    </span>
                                                </div>
                                            </div>

                                            <!-- Right group: Auto Submit On Exit Checkbox -->
                                            <label id="teacher-schedule-autosubmit-box" class="flex items-center gap-3 select-none py-1 md:pl-5 md:border-l md:border-slate-200 ${!initHasTimer ? 'opacity-40 pointer-events-none' : ''}">
                                                <input type="checkbox" id="teacher-schedule-autosubmit-chk" aria-label="Auto-submit on exit" ${initAutoSubmitOnExit ? 'checked' : ''}
                                                    ${!initHasTimer ? 'disabled' : ''}
                                                    onchange="window.cacheActiveAssessmentGradingSettings?.(); window.validateTeacherScheduleInputs?.('assessments', false);"
                                                    class="w-4 h-4 rounded text-[#15803d] focus:ring-0 border-slate-300 cursor-pointer accent-[#15803d] shrink-0 mt-0.5" />
                                                <div class="flex flex-col min-w-0">
                                                    <span class="text-xs font-bold text-slate-800 cursor-pointer select-none leading-snug">Auto-submit on exit</span>
                                                    <span class="text-[10px] text-black-fade font-medium leading-tight mt-0.5">Unanswered questions scored as 0</span>
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            ` : ''}

                            ${isScheduleQuiz ? `
                            <input type="hidden" id="teacher-schedule-grading-mode" value="auto" />
                            ` : `
                            <!-- 4. Scoring Method (tasks and other assessments) -->
                            <div class="space-y-3 pt-2 border-t border-black/5 font-['Inter']">
                                <div>
                                    <label class="text-xs font-bold text-[#15803d] block font-['Inter']">Scoring Method</label>
                                    <p class="text-[11px] font-normal text-black-fade block leading-tight mt-0.5">Select how student submissions will be scored</p>
                                </div>
                                <input type="hidden" id="teacher-schedule-grading-mode" value="${initGradingMode || ''}" />
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                    <div onclick="window.selectTeacherScheduleGradingMode?.('manual')" id="teacher-grading-mode-manual"
                                        class="p-4 rounded-xl border-2 transition-all cursor-pointer select-none flex items-center gap-3.5 ${initGradingMode === 'manual' ? 'border-[#15803d] bg-emerald-50/60 shadow-2xs' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'}">
                                        <div class="w-5 h-5 rounded-full ${initGradingMode === 'manual' ? 'bg-[#15803d] text-white' : 'border-2 border-slate-300 bg-white'} flex items-center justify-center text-[10px] shrink-0" id="teacher-grading-mode-manual-icon">
                                            ${initGradingMode === 'manual' ? '<i class=\"fa-solid fa-check\"></i>' : ''}
                                        </div>
                                        <div class="min-w-0 flex-1">
                                            <div class="text-xs font-bold text-slate-900 leading-tight">Teacher</div>
                                            <p class="text-[11px] text-black-fade leading-normal mt-0.5 font-normal">Teacher Review</p>
                                        </div>
                                    </div>
                                    <div onclick="window.selectTeacherScheduleGradingMode?.('auto')" id="teacher-grading-mode-auto"
                                        class="p-4 rounded-xl border-2 transition-all cursor-pointer select-none flex items-center gap-3.5 ${initGradingMode === 'auto' ? 'border-[#15803d] bg-emerald-50/60 shadow-2xs' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'}">
                                        <div class="w-5 h-5 rounded-full ${initGradingMode === 'auto' ? 'bg-[#15803d] text-white' : 'border-2 border-slate-300 bg-white'} flex items-center justify-center text-[10px] shrink-0" id="teacher-grading-mode-auto-icon">
                                            ${initGradingMode === 'auto' ? '<i class=\"fa-solid fa-check\"></i>' : ''}
                                        </div>
                                        <div class="min-w-0 flex-1">
                                            <div class="text-xs font-bold text-slate-900 leading-tight">Auto</div>
                                            <p class="text-[11px] text-black-fade leading-normal mt-0.5 font-normal">System Auto-Scoring</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            `}

                            ${isScheduleQuiz ? `
                                <div class="space-y-3 pt-3 border-t border-black/5 font-['Inter']" id="teacher-quiz-essay-scoring-section">
                                    <div>
                                        <label class="text-xs font-bold text-[#15803d] block font-['Inter']">Written Response Review</label>
                                        <p class="text-[11px] font-normal text-black-fade block leading-relaxed mt-0.5">This scores the quiz file attached on this material.</p>
                                    </div>
                                    <input type="hidden" id="teacher-schedule-essay-grading-mode" value="${initEssayGradingMode === 'auto' || initEssayGradingMode === 'manual' ? initEssayGradingMode : ''}" />
                                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1 items-start font-['Inter']">
                                        <!-- Column 1: Manually Review & its nested sub-checkboxes -->
                                        <div class="space-y-2.5 sm:space-y-3">
                                            <div onclick="window.selectTeacherScheduleEssayGradingMode?.('manual')" id="teacher-essay-mode-manual"
                                                class="p-4 rounded-xl border-2 transition-all cursor-pointer select-none flex items-start gap-3.5 ${initEssayGradingMode === 'manual' ? 'border-[#15803d] bg-emerald-50/60 shadow-2xs' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'}">
                                                <div class="w-5 h-5 rounded-full ${initEssayGradingMode === 'manual' ? 'bg-[#15803d] text-white' : 'border-2 border-slate-300 bg-white'} flex items-center justify-center text-[10px] shrink-0 mt-0.5" id="teacher-essay-mode-manual-icon">
                                                    ${initEssayGradingMode === 'manual' ? '<i class=\"fa-solid fa-check\"></i>' : ''}
                                                </div>
                                                <div class="min-w-0 flex-1">
                                                    <div class="text-xs font-bold text-slate-900 leading-tight">Manually Review</div>
                                                    <p class="text-[11px] text-black-fade leading-relaxed mt-1 font-normal">Teacher reviews essays, plus Enumeration and Short Answer when checked</p>
                                                </div>
                                            </div>

                                            <!-- Checkboxes panel: Directly below Manually Review -->
                                            <div id="teacher-manual-review-types" class="space-y-2.5 ${initEssayGradingMode === 'manual' ? '' : 'hidden'}">
                                                <label class="flex items-start gap-2.5 p-3 rounded-xl bg-white border border-slate-200 hover:border-slate-300 cursor-pointer select-none transition-all shadow-2xs">
                                                    <input type="checkbox" id="teacher-manual-review-enumeration" ${initManualReviewEnumeration ? 'checked' : ''} onchange="window.cacheActiveAssessmentGradingSettings?.()" class="w-4 h-4 mt-0.5 rounded text-[#15803d] focus:ring-0 border-slate-300 cursor-pointer accent-[#15803d] shrink-0" />
                                                    <span class="min-w-0"><span class="text-xs font-bold text-slate-900 block leading-tight">Enumeration</span><span class="text-[11px] text-black-fade leading-snug">Listed answers</span></span>
                                                </label>
                                                <label class="flex items-start gap-2.5 p-3 rounded-xl bg-white border border-slate-200 hover:border-slate-300 cursor-pointer select-none transition-all shadow-2xs">
                                                    <input type="checkbox" id="teacher-manual-review-short" ${initManualReviewShort ? 'checked' : ''} onchange="window.cacheActiveAssessmentGradingSettings?.()" class="w-4 h-4 mt-0.5 rounded text-[#15803d] focus:ring-0 border-slate-300 cursor-pointer accent-[#15803d] shrink-0" />
                                                    <span class="min-w-0"><span class="text-xs font-bold text-slate-900 block leading-tight">Short Answer</span><span class="text-[11px] text-black-fade leading-snug">Brief written answers</span></span>
                                                </label>
                                            </div>
                                        </div>

                                        <!-- Column 2: Automatic Score -->
                                        <div>
                                            <div onclick="window.selectTeacherScheduleEssayGradingMode?.('auto')" id="teacher-essay-mode-auto"
                                                class="p-4 rounded-xl border-2 transition-all cursor-pointer select-none flex items-start gap-3.5 ${initEssayGradingMode === 'auto' ? 'border-[#15803d] bg-emerald-50/60 shadow-2xs' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'}">
                                                <div class="w-5 h-5 rounded-full ${initEssayGradingMode === 'auto' ? 'bg-[#15803d] text-white' : 'border-2 border-slate-300 bg-white'} flex items-center justify-center text-[10px] shrink-0 mt-0.5" id="teacher-essay-mode-auto-icon">
                                                    ${initEssayGradingMode === 'auto' ? '<i class=\"fa-solid fa-check\"></i>' : ''}
                                                </div>
                                                <div class="min-w-0 flex-1">
                                                    <div class="text-xs font-bold text-slate-900 leading-tight">Automatic Score</div>
                                                    <p class="text-[11px] text-black-fade leading-relaxed mt-1 font-normal">Correct answers are scored. Essays are scored perfect automatically.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <label class="flex items-start gap-3.5 p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-all cursor-pointer select-none shadow-2xs">
                                    <input type="checkbox" id="teacher-schedule-show-correct-answers" ${initShowCorrectAnswers ? 'checked' : ''}
                                        onchange="window.cacheActiveAssessmentGradingSettings?.()"
                                        class="w-4 h-4 mt-0.5 rounded text-[#15803d] focus:ring-0 border-slate-300 cursor-pointer accent-[#15803d] shrink-0" />
                                    <div class="min-w-0 flex-1">
                                        <div class="text-xs font-bold text-slate-900 leading-tight">Show Correct Answers to Students</div>
                                        <p class="text-[11px] font-normal text-black-fade leading-relaxed mt-1">When enabled, students can review the correct answer key and explanations in their score view after submitting.</p>
                                    </div>
                                </label>
                            ` : ''}

                            ${!isScheduleQuiz ? `
                            <!-- 7. AI Assistance & Assessment Criteria (Assignments, Activities, Performance Tasks) -->
                            <div class="space-y-4 pt-2 border-t border-black/5 font-['Inter']">
                                <!-- Enable AI Assistance Card -->
                                <label id="teacher-schedule-ai-assisted-container"
                                    class="flex items-start gap-3.5 p-4 rounded-xl bg-white border border-slate-200 transition-all ${initGradingMode ? 'hover:border-slate-300 cursor-pointer select-none shadow-2xs' : 'opacity-40 pointer-events-none cursor-not-allowed select-none shadow-none'}">
                                    <input type="checkbox" id="teacher-schedule-ai-assisted" ${initAiAssisted && initGradingMode ? 'checked' : ''} ${initGradingMode ? '' : 'disabled'}
                                        onchange="window.toggleTeacherScheduleAiAssisted?.(this.checked)"
                                        class="w-4 h-4 mt-0.5 rounded text-[#15803d] focus:ring-0 border-slate-300 cursor-pointer accent-[#15803d] shrink-0" />
                                    <div class="min-w-0 flex-1">
                                        <div class="text-xs font-bold text-slate-900 flex items-center gap-2">
                                            <span class="w-5 h-5 rounded-md bg-[#FFD000] text-white flex items-center justify-center shrink-0 shadow-2xs leading-none"><i class="fa-solid fa-bolt text-[11px] text-white"></i></span>
                                            <span>Enable SIGMA AI Assistance</span>
                                        </div>
                                        <p class="text-[11px] font-normal text-black-fade leading-relaxed mt-1" id="teacher-ai-assist-subtext">
                                            ${!initGradingMode 
                                                ? 'Select a scoring method above to enable AI assistance.' 
                                                : (initGradingMode === 'manual' 
                                                    ? 'AI drafts suggested scores and comments for teacher review and final approval.' 
                                                    : 'AI evaluates open-ended tasks with partial credit and automated feedback.')}
                                        </p>
                                    </div>
                                </label>

                                <!-- Rubric Section (Shown when AI Assistant is Checked and not a Quiz) -->
                                <div id="teacher-schedule-rubric-box" class="space-y-3 p-4 rounded-xl bg-black/[0.02] border border-black/10 ${initAiAssisted ? '' : 'hidden'} font-['Inter']">
                                    <div>
                                        <div class="flex items-center gap-2">
                                            <i class="fa-solid fa-table-list text-[#15803d] text-xs"></i>
                                            <span class="text-xs font-bold text-[#15803d]">Grading Rubric</span>
                                        </div>
                                        <p class="text-[11px] text-black-fade leading-relaxed mt-1">
                                            A grading rubric is required for AI evaluation to establish clear scoring criteria and objective guidelines for assessing student submissions.
                                        </p>
                                    </div>

                                    <div id="teacher-rubric-status-content" class="pt-1">
                                        ${adminLockedRubricName ? `
                                            <div class="flex items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl shadow-2xs">
                                                <div class="flex items-center gap-2.5 min-w-0 flex-1">
                                                    <i class="fa-solid fa-lock text-slate-500 text-base shrink-0"></i>
                                                    <span class="font-bold text-slate-900 text-xs truncate" id="teacher-rubric-file-label">${escapeHtml(adminLockedRubricName)}</span>
                                                    <span class="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                                                        <i class="fa-solid fa-shield-halved text-[9px]"></i> Set by Admin
                                                    </span>
                                                </div>
                                            </div>
                                        ` : linkedRubricName ? `
                                            <div class="flex items-center justify-between gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
                                                <div class="flex items-center gap-2.5 min-w-0 flex-1">
                                                    <i class="fa-solid fa-file-circle-check text-[#15803d] text-base shrink-0"></i>
                                                    <span class="font-bold text-slate-900 text-xs truncate" id="teacher-rubric-file-label">${escapeHtml(linkedRubricName)}</span>
                                                    <span class="text-[10px] font-bold text-[#15803d] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                                                        <i class="fa-solid fa-check text-[9px]"></i> Ready for AI
                                                    </span>
                                                </div>
                                                <div class="flex items-center gap-2.5 shrink-0">
                                                    <button type="button" onclick="document.getElementById('teacher-rubric-file-input')?.click()" class="text-xs font-bold text-emerald-700 hover:text-emerald-900 shrink-0 cursor-pointer">
                                                        Change
                                                    </button>
                                                    <button type="button" onclick="window.removeTeacherUploadedRubric('${category}')" class="text-xs font-bold text-black hover:text-slate-700 shrink-0 cursor-pointer flex items-center gap-1" title="Delete Rubric">
                                                        <i class="fa-solid fa-trash-can text-black text-xs"></i> Delete
                                                    </button>
                                                </div>
                                            </div>
                                        ` : `
                                            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-amber-50/80 border border-dashed border-amber-300 rounded-xl">
                                                <div class="flex items-center gap-2.5 min-w-0">
                                                    <i class="fa-solid fa-triangle-exclamation text-amber-600 text-base shrink-0"></i>
                                                    <div>
                                                        <div class="text-xs font-bold text-amber-900" id="teacher-rubric-file-label">Rubric Required by SIGMA AI</div>
                                                        <p class="text-[11px] text-amber-700 font-medium leading-tight mt-0.5">Upload a grading rubric (.pdf, .docx, .txt) on this screen. The file is saved with this release.</p>
                                                    </div>
                                                </div>
                                                <div class="flex items-center gap-2 shrink-0">
                                                    <button type="button" onclick="document.getElementById('teacher-rubric-file-input')?.click()" class="px-3.5 py-1.5 text-xs font-bold text-white bg-[#15803d] hover:bg-[#166534] rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm">
                                                        <i class="fa-solid fa-upload text-xs"></i> Upload Rubric
                                                    </button>
                                                </div>
                                            </div>
                                        `}
                                    </div>
                                    <input type="file" id="teacher-rubric-file-input" class="hidden" accept=".pdf,.docx,.doc,.txt,.xlsx,.csv" onchange="window.handleTeacherRubricFileUpload?.(this)" />
                                </div>

                                <!-- Assessment Criteria Selection (Shown when AI Assistant is Checked) -->
                                <div id="teacher-schedule-criteria-box" class="space-y-3.5 p-4 rounded-xl bg-black/[0.02] border border-black/10 ${initAiAssisted ? '' : 'hidden'} font-['Inter']">
                                    <div>
                                        <div class="flex items-center gap-2">
                                            <i class="fa-solid fa-layer-group text-[#15803d] text-xs"></i>
                                            <span class="text-xs font-bold text-[#15803d]">Assessment Criteria</span>
                                        </div>
                                        <p class="text-[11px] text-black-fade leading-relaxed mt-1">
                                            Select qualitative evaluation criteria, or let AI automatically pick the appropriate categories.
                                        </p>
                                    </div>

                                    <!-- Auto-Select (AI Picked) vs Custom Selection Toggle -->
                                    <label class="flex items-start gap-3 p-3.5 bg-white border border-slate-200 rounded-xl cursor-pointer select-none hover:border-slate-300 transition-all shadow-2xs">
                                        <input type="checkbox" id="teacher-criteria-ai-auto" ${initCriteriaAiAuto !== false ? 'checked' : ''}
                                            onchange="window.toggleTeacherCriteriaAiAuto?.(this.checked)"
                                            class="w-4 h-4 mt-0.5 rounded text-[#15803d] focus:ring-0 border-slate-300 cursor-pointer accent-[#15803d] shrink-0" />
                                        <div class="min-w-0 flex-1">
                                            <div class="flex items-center gap-1.5 flex-wrap">
                                                <span class="text-xs font-bold text-slate-900">Auto-Select Categories (AI Picked)</span>
                                            </div>
                                            <p class="text-[11px] text-black-fade leading-relaxed mt-1">
                                                AI automatically chooses the most relevant 1 to 4 categories for the student's submission. The 4 categories below are locked. Uncheck to choose categories manually.
                                            </p>
                                        </div>
                                    </label>

                                    <!-- Criteria Category Options Title -->
                                    <div class="pt-1">
                                        <label class="text-xs font-bold text-slate-900 block font-['Inter']">Pick an option:</label>
                                    </div>

                                    <!-- 4 Category Checkboxes (Locked when Auto-Select is Checked) -->
                                    <div id="teacher-criteria-categories-grid" class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5 font-['Inter']">
                                        <!-- 1. Content & Understanding -->
                                        <label class="teacher-criteria-category-item flex items-start gap-3 p-3.5 rounded-xl border transition-all ${initCriteriaAiAuto !== false ? 'bg-slate-100/80 border-slate-200 opacity-60 cursor-not-allowed select-none' : 'bg-white border-slate-200 hover:border-slate-300 cursor-pointer select-none shadow-2xs'}">
                                            <input type="checkbox" name="teacher_selected_criteria" value="content"
                                                ${(initSelectedCriteria.includes('content') || initCriteriaAiAuto !== false) ? 'checked' : ''}
                                                ${initCriteriaAiAuto !== false ? 'disabled' : ''}
                                                onchange="window.cacheActiveAssessmentGradingSettings?.()"
                                                class="w-4 h-4 mt-0.5 rounded text-[#15803d] focus:ring-0 border-slate-300 cursor-pointer accent-[#15803d] shrink-0" />
                                            <div class="min-w-0 flex-1">
                                                <div class="text-xs font-bold text-slate-900 leading-tight">1. Content & Understanding</div>
                                                <p class="text-[10px] text-black-fade leading-relaxed mt-1 font-medium">Theoretical mastery, formulas, and accuracy</p>
                                            </div>
                                        </label>

                                        <!-- 2. Process & Methodology -->
                                        <label class="teacher-criteria-category-item flex items-start gap-3 p-3.5 rounded-xl border transition-all ${initCriteriaAiAuto !== false ? 'bg-slate-100/80 border-slate-200 opacity-60 cursor-not-allowed select-none' : 'bg-white border-slate-200 hover:border-slate-300 cursor-pointer select-none shadow-2xs'}">
                                            <input type="checkbox" name="teacher_selected_criteria" value="process"
                                                ${(initSelectedCriteria.includes('process') || initCriteriaAiAuto !== false) ? 'checked' : ''}
                                                ${initCriteriaAiAuto !== false ? 'disabled' : ''}
                                                onchange="window.cacheActiveAssessmentGradingSettings?.()"
                                                class="w-4 h-4 mt-0.5 rounded text-[#15803d] focus:ring-0 border-slate-300 cursor-pointer accent-[#15803d] shrink-0" />
                                            <div class="min-w-0 flex-1">
                                                <div class="text-xs font-bold text-slate-900 leading-tight">2. Process & Methodology</div>
                                                <p class="text-[10px] text-black-fade leading-relaxed mt-1 font-medium">Step-by-step logic and procedural derivations</p>
                                            </div>
                                        </label>

                                        <!-- 3. Organization & Structure -->
                                        <label class="teacher-criteria-category-item flex items-start gap-3 p-3.5 rounded-xl border transition-all ${initCriteriaAiAuto !== false ? 'bg-slate-100/80 border-slate-200 opacity-60 cursor-not-allowed select-none' : 'bg-white border-slate-200 hover:border-slate-300 cursor-pointer select-none shadow-2xs'}">
                                            <input type="checkbox" name="teacher_selected_criteria" value="organization"
                                                ${(initSelectedCriteria.includes('organization') || initCriteriaAiAuto !== false) ? 'checked' : ''}
                                                ${initCriteriaAiAuto !== false ? 'disabled' : ''}
                                                onchange="window.cacheActiveAssessmentGradingSettings?.()"
                                                class="w-4 h-4 mt-0.5 rounded text-[#15803d] focus:ring-0 border-slate-300 cursor-pointer accent-[#15803d] shrink-0" />
                                            <div class="min-w-0 flex-1">
                                                <div class="text-xs font-bold text-slate-900 leading-tight">3. Organization & Structure</div>
                                                <p class="text-[10px] text-black-fade leading-relaxed mt-1 font-medium">Logical flow, neat layout, and technical notation</p>
                                            </div>
                                        </label>

                                        <!-- 4. Critical Analysis & Insight -->
                                        <label class="teacher-criteria-category-item flex items-start gap-3 p-3.5 rounded-xl border transition-all ${initCriteriaAiAuto !== false ? 'bg-slate-100/80 border-slate-200 opacity-60 cursor-not-allowed select-none' : 'bg-white border-slate-200 hover:border-slate-300 cursor-pointer select-none shadow-2xs'}">
                                            <input type="checkbox" name="teacher_selected_criteria" value="analysis"
                                                ${(initSelectedCriteria.includes('analysis') || initCriteriaAiAuto !== false) ? 'checked' : ''}
                                                ${initCriteriaAiAuto !== false ? 'disabled' : ''}
                                                onchange="window.cacheActiveAssessmentGradingSettings?.()"
                                                class="w-4 h-4 mt-0.5 rounded text-[#15803d] focus:ring-0 border-slate-300 cursor-pointer accent-[#15803d] shrink-0" />
                                            <div class="min-w-0 flex-1">
                                                <div class="text-xs font-bold text-slate-900 leading-tight">4. Critical Analysis & Insight</div>
                                                <p class="text-[10px] text-black-fade leading-relaxed mt-1 font-medium">Analytical depth, problem insights, and justification</p>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                            ` : ''}
                        </div>
                    `)}

                    <!-- Error Notice (Hidden by default) -->
                    <div id="teacher-schedule-error-banner" class="hidden items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold font-['Inter']">
                        <i class="fa-solid fa-circle-exclamation text-red-600 text-sm shrink-0"></i>
                        <span id="teacher-schedule-error-msg"></span>
                    </div>
                </div>

                <!-- Footer -->
                <div class="teacher-schedule-modal-footer px-6 sm:px-8 py-5 flex items-center justify-between gap-3 shrink-0 font-['Inter'] w-full">
                    <button type="button" onclick="${backBtnAction}"
                        class="picker-footer-back-btn sigma-btn sigma-btn-white sigma-btn-md cursor-pointer font-['Inter']">
                        Back
                    </button>
                    <button type="button" id="${primaryBtnId}" onclick="${primaryBtnAction}"
                        class="sigma-btn sigma-btn-primary sigma-btn-md cursor-pointer font-['Inter'] shadow-sm ml-auto sm:ml-0">
                        ${primaryBtnText}
                    </button>
                </div>
            </div>
        `;

        if (isNewOverlay) {
            document.body.appendChild(overlay);
        }
        overlay.classList.add('curriculum-hub-overlay--visible');

        // Seamless transition: clean up picker overlays and hide previous release overlays only after schedule overlay is mounted and visible
        document.querySelectorAll('#teacher-topics-materials-picker-overlay, #teacher-topic-picker-overlay, #teacher-learning-picker-overlay, #teacher-assessments-picker-overlay').forEach(el => el.remove());
        const prevTopicModal = document.getElementById('teacher-release-topics-overlay');
        const prevLearningModal = document.getElementById('teacher-release-learning-materials-overlay');
        const prevAssessmentsModal = document.getElementById('teacher-release-assessments-overlay');
        if (prevTopicModal && prevTopicModal !== overlay) prevTopicModal.classList.add('hidden');
        if (prevLearningModal && prevLearningModal !== overlay) prevLearningModal.classList.add('hidden');
        if (prevAssessmentsModal && prevAssessmentsModal !== overlay) prevAssessmentsModal.classList.add('hidden');
        requestAnimationFrame(() => {
            if (isGradingPage) {
                window.cacheActiveAssessmentGradingSettings?.();
            }
            if (isStudentsPage) {
                const selectAllChk = document.getElementById('teacher-schedule-students-select-all');
                if (selectAllChk) {
                    selectAllChk.indeterminate = (selectedStudentsCount > 0 && selectedStudentsCount < totalStudentsCount);
                }
            }
            window.validateTeacherScheduleInputs?.(category, false);
        });
    };

    window.toggleTeacherScheduleStudent = function (category, targetId, studentId, e) {
        if (e) e.stopPropagation();
        const meta = window.getUnifiedScheduleMeta(category);
        const draft = window[meta.draftStateKey];
        if (!draft) return;
        const idStr = String(targetId || draft._targetId || '0');
        if (!draft.assignedStudents) draft.assignedStudents = {};

        const section = draft._section || currentTopicState?.selectedSection || 'Grade 11 - ICT A';
        const subjectId = draft._subjectId || (typeof currentTopicState !== 'undefined' ? currentTopicState?.subjectId : null) || window.currentTopicState?.subjectId || '';
        const allStuds = typeof window.getStudentsForSection === 'function' ? window.getStudentsForSection(section, subjectId) : [];

        if (!Array.isArray(draft.assignedStudents[idStr])) {
            draft.assignedStudents[idStr] = allStuds.map(s => String(s.id || s.name));
        }

        const sidStr = String(studentId);
        const list = draft.assignedStudents[idStr];
        const matchedSt = allStuds.find(s => String(s.id) === sidStr || String(s.name) === sidStr);
        const stName = matchedSt ? String(matchedSt.name) : '';
        const hasMatch = list.includes(sidStr) || (stName && list.includes(stName));

        if (hasMatch) {
            draft.assignedStudents[idStr] = list.filter(item => item !== sidStr && item !== stName);
        } else {
            draft.assignedStudents[idStr].push(sidStr);
        }

        const updatedList = draft.assignedStudents[idStr];
        const isNowChecked = updatedList.includes(sidStr) || (stName && updatedList.includes(stName));

        // Update other pending items if Apply All is active
        const applyAllChk = document.getElementById('teacher-schedule-apply-all-chk');
        if (applyAllChk && applyAllChk.checked) {
            const pendingIds = draft[meta.pendingKey] || [];
            pendingIds.forEach(pId => {
                const pIdStr = String(pId);
                if (pIdStr !== idStr) {
                    draft.assignedStudents[pIdStr] = [...updatedList];
                }
            });
        }

        // Update UI
        const chk = document.getElementById(`teacher-st-chk-${sidStr}`);
        if (chk) chk.checked = isNowChecked;

        const total = allStuds.length;
        const count = allStuds.filter(s => updatedList.includes(String(s.id)) || updatedList.includes(String(s.name))).length;

        const countBadge = document.getElementById('teacher-schedule-students-count-badge');
        if (countBadge) countBadge.textContent = `${count} of ${total} Selected`;

        const selectAllChk = document.getElementById('teacher-schedule-students-select-all');
        if (selectAllChk) {
            selectAllChk.checked = (count === total && total > 0);
            selectAllChk.indeterminate = (count > 0 && count < total);
        }

        const headerSummary = document.getElementById('teacher-schedule-header-students-summary');
        if (headerSummary) {
            headerSummary.innerHTML = (count === total && total > 0)
                ? `<span class="inline-flex items-center gap-1.5 text-[#15803d] font-bold"><span class="w-3.5 h-3.5 rounded bg-[#15803d] text-white flex items-center justify-center text-[8.5px] leading-none shrink-0 font-bold shadow-2xs"><i class="fa-solid fa-check"></i></span><span>All</span></span>`
                : `<span>${count}/${total} selected</span>`;
        }
    };

    window.toggleTeacherScheduleSelectAllStudents = function (checked, category, targetId) {
        const meta = window.getUnifiedScheduleMeta(category);
        const draft = window[meta.draftStateKey];
        if (!draft) return;
        const idStr = String(targetId || draft._targetId || '0');
        const section = draft._section || currentTopicState?.selectedSection || 'Grade 11 - ICT A';
        const subjectId = draft._subjectId || (typeof currentTopicState !== 'undefined' ? currentTopicState?.subjectId : null) || window.currentTopicState?.subjectId || '';
        const allStuds = typeof window.getStudentsForSection === 'function' ? window.getStudentsForSection(section, subjectId) : [];

        if (!draft.assignedStudents) draft.assignedStudents = {};
        if (checked) {
            draft.assignedStudents[idStr] = allStuds.map(s => String(s.id || s.name));
        } else {
            draft.assignedStudents[idStr] = [];
        }

        const list = draft.assignedStudents[idStr];

        // Update other pending items if Apply All is active
        const applyAllChk = document.getElementById('teacher-schedule-apply-all-chk');
        if (applyAllChk && applyAllChk.checked) {
            const pendingIds = draft[meta.pendingKey] || [];
            pendingIds.forEach(pId => {
                const pIdStr = String(pId);
                if (pIdStr !== idStr) {
                    draft.assignedStudents[pIdStr] = [...list];
                }
            });
        }

        allStuds.forEach(st => {
            const sid = String(st.id || `STD-${st.name}`);
            const chk = document.getElementById(`teacher-st-chk-${sid}`);
            if (chk) chk.checked = checked;
        });

        const total = allStuds.length;
        const count = checked ? total : 0;
        const countBadge = document.getElementById('teacher-schedule-students-count-badge');
        if (countBadge) countBadge.textContent = `${count} of ${total} Selected`;

        const selectAllChk = document.getElementById('teacher-schedule-students-select-all');
        if (selectAllChk) {
            selectAllChk.checked = checked;
            selectAllChk.indeterminate = false;
        }

        const headerSummary = document.getElementById('teacher-schedule-header-students-summary');
        if (headerSummary) {
            headerSummary.innerHTML = (count === total && total > 0)
                ? `<span class="inline-flex items-center gap-1.5 text-[#15803d] font-bold"><span class="w-3.5 h-3.5 rounded bg-[#15803d] text-white flex items-center justify-center text-[8.5px] leading-none shrink-0 font-bold shadow-2xs"><i class="fa-solid fa-check"></i></span><span>All</span></span>`
                : `<span>${count}/${total} selected</span>`;
        }
    };

    window.filterTeacherScheduleStudentsList = function (query) {
        const q = String(query || '').trim().toLowerCase();
        const rows = document.querySelectorAll('.teacher-schedule-student-row');
        rows.forEach(row => {
            const name = (row.dataset.studentName || '').toLowerCase();
            const id = (row.dataset.studentId || '').toLowerCase();
            if (!q || name.includes(q) || id.includes(q)) {
                row.classList.remove('hidden');
                row.classList.add('flex');
            } else {
                row.classList.add('hidden');
                row.classList.remove('flex');
            }
        });
    };

    window.handleTeacherScheduleCategoryChange = function (newCat) {
        const catSelect = document.getElementById('teacher-schedule-activity-component');
        const catBox = document.getElementById('teacher-schedule-activity-component-box');
        const catLabel = document.getElementById('teacher-schedule-activity-component-label');
        const weightInput = document.getElementById('teacher-schedule-weight');
        const modalOverlay = document.getElementById('teacher-topic-schedule-overlay');
        const reqSpan = document.getElementById('teacher-activity-category-required');

        if (reqSpan) {
            if (newCat) {
                reqSpan.classList.add('hidden');
            } else {
                reqSpan.classList.remove('hidden');
            }
        }

        if (catSelect) {
            catSelect.value = newCat || '';
        }
        if (catBox) {
            if (newCat) {
                catBox.classList.remove('border-amber-300', '!border-red-500');
                catBox.classList.add('border-slate-200');
            }
        }

        const currentSubj = modalOverlay?.dataset?._subjectId || (typeof currentTopicState !== 'undefined' ? currentTopicState?.subjectId : '') || (typeof gradebookState !== 'undefined' ? gradebookState?.selectedSubject : '') || (window.sigmaGradesState && (window.sigmaGradesState.selectedSubject || window.sigmaGradesState.selectedSubjectSection?.subject)) || '';
        const sw = (typeof window.getSubjectGradebookWeights === 'function') ? window.getSubjectGradebookWeights(currentSubj) : { ww: 25, pt: 50, qa: 25 };

        if (catLabel) {
            if (newCat === 'ww') {
                catLabel.textContent = `Written Work (${sw.ww}%)`;
                catLabel.classList.remove('text-black-fade', 'font-medium');
                catLabel.classList.add('text-slate-900', 'font-bold');
            } else if (newCat === 'pt') {
                catLabel.textContent = `Performance Task (${sw.pt}%)`;
                catLabel.classList.remove('text-black-fade', 'font-medium');
                catLabel.classList.add('text-slate-900', 'font-bold');
            } else {
                catLabel.textContent = 'Select Component (WW or PT)';
                catLabel.classList.remove('text-slate-900', 'font-bold');
                catLabel.classList.add('text-black-fade', 'font-medium');
            }
        }

        const menu = document.getElementById('teacher-schedule-activity-component-menu');
        if (menu) {
            menu.innerHTML = `
                <div onclick="window.selectTeacherScheduleActivityComponent?.('ww')"
                    class="px-3.5 py-2.5 text-xs rounded-lg cursor-pointer flex items-center justify-between gap-2.5 transition-colors select-none ${newCat === 'ww' ? 'bg-emerald-50 text-[#15803d] font-bold' : 'font-medium text-slate-800 hover:bg-slate-50 hover:text-black'}">
                    <span class="truncate block">Written Work (${sw.ww}%)</span>
                </div>
                <div onclick="window.selectTeacherScheduleActivityComponent?.('pt')"
                    class="px-3.5 py-2.5 text-xs rounded-lg cursor-pointer flex items-center justify-between gap-2.5 transition-colors select-none ${newCat === 'pt' ? 'bg-emerald-50 text-[#15803d] font-bold' : 'font-medium text-slate-800 hover:bg-slate-50 hover:text-black'}">
                    <span class="truncate block">Performance Task (${sw.pt}%)</span>
                </div>
            `;
        }

        if (weightInput) {
            if (newCat === 'ww') {
                weightInput.value = String(sw.ww || 25);
            } else if (newCat === 'pt') {
                weightInput.value = String(sw.pt || 50);
            } else if (newCat === 'qa') {
                weightInput.value = String(sw.qa || 25);
            } else {
                weightInput.value = '';
            }
        }

        window.cacheActiveAssessmentGradingSettings?.();
        const cat = modalOverlay?.dataset?._category || 'assessments';
        window.validateTeacherScheduleInputs?.(cat, false);
    };

    window.goToTeacherScheduleStep = function (category = 'assessments', targetId = null, nextStep = 'schedule', editType = '') {
        window.cacheActiveAssessmentGradingSettings?.();
        const modalOverlay = document.getElementById('teacher-topic-schedule-overlay');
        const effEditType = editType !== undefined && editType !== '' ? editType : (modalOverlay?.dataset?._editType || '');
        const meta = window.getUnifiedScheduleMeta(category);
        const draft = window[meta.draftStateKey];
        if (draft && draft._activeStep && draft._activeStep !== nextStep) {
            draft._prevStep = draft._activeStep;
        }
        window.openTeacherUnifiedScheduleModal(category, targetId, '', nextStep, effEditType);
    };

    window.cacheActiveAssessmentGradingSettings = function () {
        const modalOverlay = document.getElementById('teacher-topic-schedule-overlay');
        const category = modalOverlay?.dataset?._category || 'assessments';
        if (category !== 'assessments' && !window._unifiedPickerSelection) return;

        const effectiveDraftCat = (category === 'assessments' || !window._assessmentsReleaseDraftState) ? category : 'assessments';
        const meta = window.getUnifiedScheduleMeta(effectiveDraftCat);
        const draft = window[meta.draftStateKey] || window._assessmentsReleaseDraftState;
        if (!draft) return;
        const targetId = (draft._targetId !== undefined && draft._targetId !== null)
            ? String(draft._targetId)
            : (draft[meta.pendingKey] && draft[meta.pendingKey][0] ? String(draft[meta.pendingKey][0]) : '0');

        const idStr = String(targetId);
        const maxScoreInput = document.getElementById('teacher-schedule-max-score');
        const weightInput = document.getElementById('teacher-schedule-weight');
        const activityComponentSelect = document.getElementById('teacher-schedule-activity-component');
        const maxAttemptsInput = document.getElementById('teacher-schedule-max-attempts');
        const latePermChk = document.getElementById('teacher-schedule-late-permission');
        const gradingModeInput = document.getElementById('teacher-schedule-grading-mode');

        if (!draft.assessmentMaxScores) draft.assessmentMaxScores = {};
        if (!draft.assessmentWeights) draft.assessmentWeights = {};
        if (!draft.assessmentActivityComponents) draft.assessmentActivityComponents = {};
        if (!draft.assessmentComponents) draft.assessmentComponents = {};
        if (!draft.assessmentMaxAttempts) draft.assessmentMaxAttempts = {};
        if (!draft.assessmentLatePermissions) draft.assessmentLatePermissions = {};
        if (!draft.assessmentGradingModes) draft.assessmentGradingModes = {};
        if (!draft.assessmentAiAssisted) draft.assessmentAiAssisted = {};
        if (!draft.assessmentRubrics) draft.assessmentRubrics = {};

        if (maxScoreInput) {
            const rawScore = maxScoreInput.value.trim();
            if (rawScore === '') {
                draft.assessmentMaxScores[idStr] = '';
            } else {
                let num = parseInt(rawScore, 10);
                if (isNaN(num) || num < 0) num = 0;
                if (num > 1000) num = 1000;
                draft.assessmentMaxScores[idStr] = num;
            }
        }
        if (weightInput) {
            const rawWeight = weightInput.value.trim();
            draft.assessmentWeights[idStr] = rawWeight === '' ? '' : (parseInt(rawWeight, 10) || '');
        }
        if (activityComponentSelect) {
            draft.assessmentActivityComponents[idStr] = activityComponentSelect.value;
            draft.assessmentComponents[idStr] = activityComponentSelect.value;
        }
        if (maxAttemptsInput) {
            const rawAttempts = maxAttemptsInput.value.trim();
            if (rawAttempts === '') {
                draft.assessmentMaxAttempts[idStr] = '';
            } else {
                let num = parseInt(rawAttempts, 10);
                if (isNaN(num) || num < 1) num = 1;
                if (num > 20) num = 20;
                draft.assessmentMaxAttempts[idStr] = num;
            }
        }
        if (latePermChk) draft.assessmentLatePermissions[idStr] = latePermChk.checked;

        const noTimeLimitChk = document.getElementById('teacher-schedule-no-timelimit-chk');
        const timeLimitInput = document.getElementById('teacher-schedule-timelimit-input');
        if (noTimeLimitChk) {
            if (!draft.assessmentHasTimers) draft.assessmentHasTimers = {};
            if (!draft.assessmentTimeLimits) draft.assessmentTimeLimits = {};
            if (!draft.assessmentTimeLimitMinutes) draft.assessmentTimeLimitMinutes = {};
            const isNoLimit = noTimeLimitChk.checked;
            draft.assessmentHasTimers[idStr] = !isNoLimit;
            if (isNoLimit) {
                draft.assessmentTimeLimits[idStr] = 'none';
                draft.assessmentTimeLimitMinutes[idStr] = null;
            } else {
                const mins = Math.max(1, parseInt(timeLimitInput?.value, 10) || 30);
                draft.assessmentTimeLimits[idStr] = `${mins}:00`;
                draft.assessmentTimeLimitMinutes[idStr] = mins;
            }
        }

        const autoSubmitChk = document.getElementById('teacher-schedule-autosubmit-chk');
        if (autoSubmitChk) {
            if (!draft.assessmentAutoSubmitOnExit) draft.assessmentAutoSubmitOnExit = {};
            draft.assessmentAutoSubmitOnExit[idStr] = autoSubmitChk.checked;
        }

        if (gradingModeInput) draft.assessmentGradingModes[idStr] = gradingModeInput.value || '';
        const essayGradingModeInput = document.getElementById('teacher-schedule-essay-grading-mode');
        if (essayGradingModeInput) {
            if (!draft.assessmentEssayGradingModes) draft.assessmentEssayGradingModes = {};
            draft.assessmentEssayGradingModes[idStr] = essayGradingModeInput.value || '';
            if (!draft.assessmentManualReviewTypes) draft.assessmentManualReviewTypes = {};
            const manualOn = essayGradingModeInput.value === 'manual';
            draft.assessmentManualReviewTypes[idStr] = {
                essay: true,
                enumeration: manualOn && Boolean(document.getElementById('teacher-manual-review-enumeration')?.checked),
                shortAnswer: manualOn && Boolean(document.getElementById('teacher-manual-review-short')?.checked)
            };
        }
        const showCorrectAnswersChk = document.getElementById('teacher-schedule-show-correct-answers');
        if (showCorrectAnswersChk) {
            if (!draft.assessmentShowCorrectAnswers) draft.assessmentShowCorrectAnswers = {};
            draft.assessmentShowCorrectAnswers[idStr] = showCorrectAnswersChk.checked;
        }
        const allowFileUploadChk = document.getElementById('teacher-schedule-allow-file-upload');
        if (allowFileUploadChk) {
            if (!draft.assessmentAllowFileUploads) draft.assessmentAllowFileUploads = {};
            draft.assessmentAllowFileUploads[idStr] = allowFileUploadChk.checked;
        }
        const aiAssistedChk = document.getElementById('teacher-schedule-ai-assisted');
        if (aiAssistedChk) {
            const aiOn = Boolean(aiAssistedChk.checked);
            draft.assessmentAiAssisted[idStr] = aiOn;
            if (draft._targetId) draft.assessmentAiAssisted[String(draft._targetId)] = aiOn;
            if (draft._targetTitle) draft.assessmentAiAssisted[String(draft._targetTitle)] = aiOn;
        }

        if (!draft.assessmentCriteriaAiAuto) draft.assessmentCriteriaAiAuto = {};
        if (!draft.assessmentSelectedCriteria) draft.assessmentSelectedCriteria = {};
        const criteriaAiAutoChk = document.getElementById('teacher-criteria-ai-auto');
        if (criteriaAiAutoChk) draft.assessmentCriteriaAiAuto[idStr] = criteriaAiAutoChk.checked;
        const selectedCriteriaInputs = document.querySelectorAll('input[name="teacher_selected_criteria"]:checked');
        if (selectedCriteriaInputs.length > 0) {
            draft.assessmentSelectedCriteria[idStr] = Array.from(selectedCriteriaInputs).map(inp => inp.value);
        }

        // Also cache active begin & end dates if on schedule page
        const releaseNowChk = document.getElementById('teacher-schedule-release-now-chk');
        const isReleaseNow = releaseNowChk ? releaseNowChk.checked : false;
        const noDeadlineChk = document.getElementById('teacher-schedule-no-deadline-chk');
        const isNoDeadline = noDeadlineChk ? noDeadlineChk.checked : false;

        const dateInput = document.getElementById('teacher-exact-date-input');
        const timeInput = document.getElementById('teacher-time-input');
        const endDateInput = document.getElementById('teacher-exact-end-date-input');
        const endTimeInput = document.getElementById('teacher-end-time-input');

        if (!draft[meta.scheduleKey]) draft[meta.scheduleKey] = {};
        if (!draft[meta.endScheduleKey]) draft[meta.endScheduleKey] = {};

        const applyAllChk = document.getElementById('teacher-schedule-apply-all-chk');
        const isApplyAll = applyAllChk ? applyAllChk.checked : (draft._applyAll !== false);

        const convertTimeTo24HourHelper = (timeStr, defaultTime = '00:00') => {
            if (!timeStr || timeStr === '--:-- --' || timeStr === 'none') return defaultTime;
            const str = String(timeStr).trim();
            if (/^\d{1,2}:\d{2}$/.test(str)) {
                const [h, m] = str.split(':');
                return `${String(parseInt(h, 10)).padStart(2, '0')}:${String(parseInt(m, 10)).padStart(2, '0')}`;
            }
            const match = str.match(/(\d{1,2})(?:[:.](\d{0,2}))?(?:\s*([AP]M)?)?/i);
            if (!match) return defaultTime;
            let h = parseInt(match[1], 10) || 0;
            let m = match[2] !== undefined && match[2] !== '' ? parseInt(match[2], 10) : 0;
            let p = match[3] ? match[3].toUpperCase() : '';
            if (p === 'PM' && h < 12) h += 12;
            if (p === 'AM' && h === 12) h = 0;
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        };

        if (dateInput || releaseNowChk) {
            let releaseVal = '';
            if (isReleaseNow) {
                releaseVal = 'now';
            } else if (dateInput && dateInput.value) {
                const time24 = convertTimeTo24HourHelper(timeInput?.value, '00:00');
                releaseVal = `${dateInput.value}T${time24}`;
            }
            draft._scheduleStartVal = releaseVal;
            draft[meta.scheduleKey][idStr] = releaseVal;
            if (isApplyAll) {
                const pendingIds = draft[meta.pendingKey] || [];
                pendingIds.forEach(pId => {
                    draft[meta.scheduleKey][String(pId)] = releaseVal;
                });
            }
        }

        if (endDateInput || noDeadlineChk) {
            let endVal = '';
            if (isNoDeadline) {
                endVal = '';
                delete draft[meta.endScheduleKey][idStr];
            } else if (endDateInput && endDateInput.value) {
                const endTime24 = convertTimeTo24HourHelper(endTimeInput?.value, '23:59');
                endVal = `${endDateInput.value}T${endTime24}`;
                draft[meta.endScheduleKey][idStr] = endVal;
            }
            draft._scheduleEndVal = endVal;
            if (isApplyAll) {
                const pendingIds = draft[meta.pendingKey] || [];
                pendingIds.forEach(pId => {
                    if (isNoDeadline) {
                        delete draft[meta.endScheduleKey][String(pId)];
                    } else if (endVal) {
                        draft[meta.endScheduleKey][String(pId)] = endVal;
                    }
                });
            }
        }

        if (window._unifiedPickerSelection) {
            const allDrafts = [window._topicReleaseDraftState, window._learningMaterialsReleaseDraftState, window._assessmentsReleaseDraftState];
            allDrafts.forEach(d => {
                if (!d) return;
                if (draft._scheduleStartVal !== undefined) {
                    d._scheduleStartVal = draft._scheduleStartVal;
                    if (!d.releaseSchedule) d.releaseSchedule = {};
                    if (!d.materialReleaseSchedule) d.materialReleaseSchedule = {};
                    (d.pendingTopicIds || []).forEach(p => { d.releaseSchedule[String(p)] = draft._scheduleStartVal; });
                    (d.pendingMaterialIds || []).forEach(p => { d.materialReleaseSchedule[String(p)] = draft._scheduleStartVal; });
                }
                if (draft._scheduleEndVal !== undefined) {
                    d._scheduleEndVal = draft._scheduleEndVal;
                    if (!d.assessmentEndSchedule) d.assessmentEndSchedule = {};
                    (d.pendingMaterialIds || []).forEach(p => {
                        if (isNoDeadline) delete d.assessmentEndSchedule[String(p)];
                        else if (draft._scheduleEndVal) d.assessmentEndSchedule[String(p)] = draft._scheduleEndVal;
                    });
                }
            });
        }
    };

    window.toggleTeacherScheduleItemDropdown = function (e) {
        if (e) {
            e.stopPropagation();
        }
        window.closeTeacherScheduleTimePopover?.();
        window.closeTeacherScheduleActivityComponentDropdown?.();
        const menu = document.getElementById('teacher-schedule-dropdown-menu');
        const arrow = document.getElementById('teacher-schedule-dropdown-arrow');
        if (!menu) return;
        const isHidden = menu.classList.contains('hidden');
        if (isHidden) {
            menu.classList.remove('hidden');
            if (arrow) arrow.style.transform = 'rotate(180deg)';
        } else {
            menu.classList.add('hidden');
            if (arrow) arrow.style.transform = 'rotate(0deg)';
        }
    };

    window.closeTeacherScheduleItemDropdown = function () {
        window.closeTeacherScheduleActivityComponentDropdown?.();
        const menu = document.getElementById('teacher-schedule-dropdown-menu');
        const arrow = document.getElementById('teacher-schedule-dropdown-arrow');
        if (menu && !menu.classList.contains('hidden')) {
            menu.classList.add('hidden');
            if (arrow) arrow.style.transform = 'rotate(0deg)';
        }
    };

    window.toggleTeacherScheduleActivityComponentDropdown = function (e) {
        if (e) e.stopPropagation();
        window.closeTeacherScheduleTimePopover?.();
        window.closeTeacherScheduleItemDropdown?.();
        const menu = document.getElementById('teacher-schedule-activity-component-menu');
        const arrow = document.getElementById('teacher-schedule-activity-component-arrow');
        if (!menu) return;
        const isHidden = menu.classList.contains('hidden');
        if (isHidden) {
            menu.classList.remove('hidden');
            if (arrow) arrow.style.transform = 'rotate(180deg)';
            const onDocClick = function (ev) {
                const container = document.getElementById('teacher-schedule-activity-component-container');
                if (container && !container.contains(ev.target)) {
                    window.closeTeacherScheduleActivityComponentDropdown?.();
                    document.removeEventListener('click', onDocClick);
                }
            };
            setTimeout(() => {
                document.addEventListener('click', onDocClick);
            }, 0);
        } else {
            menu.classList.add('hidden');
            if (arrow) arrow.style.transform = 'rotate(0deg)';
        }
    };

    window.closeTeacherScheduleActivityComponentDropdown = function () {
        const menu = document.getElementById('teacher-schedule-activity-component-menu');
        const arrow = document.getElementById('teacher-schedule-activity-component-arrow');
        if (menu && !menu.classList.contains('hidden')) {
            menu.classList.add('hidden');
            if (arrow) arrow.style.transform = 'rotate(0deg)';
        }
    };

    window.selectTeacherScheduleActivityComponent = function (componentKey) {
        window.closeTeacherScheduleActivityComponentDropdown?.();
        window.handleTeacherScheduleCategoryChange?.(componentKey);
    };

    window.selectTeacherScheduleCustomItem = function (category, itemId, activeStep) {
        window.closeTeacherScheduleItemDropdown?.();
        window.switchTeacherScheduleActiveItem?.(category, itemId, activeStep);
    };

    window.switchTeacherScheduleActiveItem = function (category = 'assessments', newItemId, activeStep = 'schedule') {
        if (!newItemId) return;
        window.cacheActiveAssessmentGradingSettings?.();
        const modalOverlay = document.getElementById('teacher-topic-schedule-overlay');
        const effEditType = modalOverlay?.dataset?._editType || '';
        window.openTeacherUnifiedScheduleModal(category, newItemId, '', activeStep, effEditType);
    };

    window.limitScheduleDateYear = function (input) {
        if (!input) return;
        input.max = '9999-12-31';
        const match = /^(\d{5,})-(\d{2})-(\d{2})$/.exec(String(input.value || ''));
        if (!match) return;
        const year = new Date().getFullYear();
        const next = `${year}-${match[2]}-${match[3]}`;
        const probe = new Date(`${next}T00:00:00`);
        const monthOk = probe.getMonth() + 1 === Number(match[2]);
        const dayOk = probe.getDate() === Number(match[3]);
        input.value = (!isNaN(probe.getTime()) && monthOk && dayOk)
            ? next
            : `${year}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
    };

    window.keepScheduleDateTimeForward = function (forceMin) {
        const pad = (n) => String(n).padStart(2, '0');
        const earliest = new Date();
        if (earliest.getSeconds() > 0 || earliest.getMilliseconds() > 0) {
            earliest.setMinutes(earliest.getMinutes() + 1);
        }
        earliest.setSeconds(0, 0);
        const todayStr = `${earliest.getFullYear()}-${pad(earliest.getMonth() + 1)}-${pad(earliest.getDate())}`;
        const timeStr = `${pad(earliest.getHours())}:${pad(earliest.getMinutes())}`;

        const bindScheduleField = (input) => {
            if (!input || input.dataset.pastTypeBound === '1') return;
            input.dataset.pastTypeBound = '1';
            input.addEventListener('keydown', () => input.removeAttribute('min'));
            input.addEventListener('pointerdown', (e) => {
                window.keepScheduleDateTimeForward?.(true);
                if (window.innerWidth <= 640 && input.type === 'time' && (e.pointerType === 'touch' || e.pointerType === 'pen')) {
                    e.preventDefault();
                    input.focus();
                }
            });
            if (input.type === 'time') {
                input.addEventListener('touchstart', (e) => {
                    if (window.innerWidth <= 640) {
                        e.preventDefault();
                        input.focus();
                    }
                }, { passive: false });
                if (window.innerWidth <= 640) {
                    try {
                        input.showPicker = function () {};
                    } catch (err) {}
                }
            }
        };

        const clampPair = (dateInput, timeInput, active) => {
            bindScheduleField(dateInput);
            bindScheduleField(timeInput);
            if (!dateInput) return false;
            if (!active) {
                dateInput.removeAttribute('min');
                if (timeInput) timeInput.removeAttribute('min');
                return false;
            }
            if (forceMin || document.activeElement !== dateInput) dateInput.min = todayStr;
            window.limitScheduleDateYear?.(dateInput);
            const dateVal = String(dateInput.value || '');
            const rejectedDate = /^\d{4}-\d{2}-\d{2}$/.test(dateVal) && dateVal < todayStr;
            if (rejectedDate) {
                dateInput.dataset.pastRejected = '1';
                dateInput.dataset.pastJustSet = '1';
                dateInput.value = todayStr;
            } else if (dateInput.dataset.pastRejected === '1' && dateInput.dataset.pastJustSet !== '1') {
                delete dateInput.dataset.pastRejected;
            }
            dateInput.dataset.pastJustSet = rejectedDate ? '1' : '';

            let rejectedTime = false;
            if (timeInput) {
                const onToday = dateInput.value === todayStr;
                if (onToday && (forceMin || document.activeElement !== timeInput)) timeInput.min = timeStr;
                else timeInput.removeAttribute('min');
                const timeVal = String(timeInput.value || '');
                rejectedTime = onToday && /^\d{2}:\d{2}$/.test(timeVal) && timeVal < timeStr;
                if (rejectedTime) {
                    timeInput.dataset.pastRejected = '1';
                    timeInput.dataset.pastJustSet = '1';
                    timeInput.value = timeStr;
                } else if (timeInput.dataset.pastRejected === '1' && timeInput.dataset.pastJustSet !== '1') {
                    delete timeInput.dataset.pastRejected;
                }
                timeInput.dataset.pastJustSet = rejectedTime ? '1' : '';
            }
            return rejectedDate || rejectedTime;
        };

        const releaseNow = document.getElementById('teacher-schedule-release-now-chk');
        const noDeadline = document.getElementById('teacher-schedule-no-deadline-chk');
        clampPair(
            document.getElementById('teacher-exact-date-input'),
            document.getElementById('teacher-time-input'),
            !(releaseNow && releaseNow.checked)
        );
        clampPair(
            document.getElementById('teacher-exact-end-date-input'),
            document.getElementById('teacher-end-time-input'),
            !(noDeadline && noDeadline.checked)
        );
    };

    window.syncScheduleEndDateMin = function () {
        window.keepScheduleDateTimeForward?.();
    };

    window.handleScheduleDateInputClick = function (input, e) {
        if (!input || input.readOnly) return;
        const now = Date.now();
        const lastClickTime = parseInt(input.dataset.lastClickTime || '0', 10);
        const isOpen = input.dataset.pickerOpen === 'true';

        // If clicked again while open within 6s, toggle it closed by blurring
        if (isOpen && (now - lastClickTime < 6000) && (now - lastClickTime > 150)) {
            input.dataset.pickerOpen = 'false';
            input.dataset.lastClickTime = '0';
            input.blur();
            if (e) {
                e.preventDefault?.();
                e.stopPropagation?.();
            }
            return;
        }

        input.dataset.pickerOpen = 'true';
        input.dataset.lastClickTime = String(now);
        window.keepScheduleDateTimeForward?.(true);
        if (typeof input.showPicker === 'function') {
            try {
                input.showPicker();
            } catch (err) {}
        }
    };

    window.openTeacherTopicScheduleModal = function (targetTopicId = null, targetTopicTitle = '') {
        window.openTeacherUnifiedScheduleModal('topics', targetTopicId, targetTopicTitle);
    };

    window.handleTeacherScheduleApplyAllChange = function (checked, category, effectiveId) {
        const meta = window.getUnifiedScheduleMeta(category);
        const draft = window[meta?.draftStateKey];
        if (!draft) return;
        draft._applyAll = checked;
        if (checked) {
            if (typeof window.cacheActiveAssessmentGradingSettings === 'function') {
                window.cacheActiveAssessmentGradingSettings();
            }
        } else {
            // First cache the current active item's individual settings
            const currentActiveId = String(draft._targetId || effectiveId || (draft[meta.pendingKey] && draft[meta.pendingKey][0]) || '');
            if (typeof window.cacheActiveAssessmentGradingSettings === 'function') {
                window.cacheActiveAssessmentGradingSettings();
            }
            // Reset other pending items so they default to immediate release instead of inheriting the active item's schedule
            const pendingIds = draft[meta.pendingKey] || [];
            pendingIds.forEach(pId => {
                const pIdStr = String(pId);
                if (pIdStr !== currentActiveId) {
                    if (draft[meta.scheduleKey]) {
                        draft[meta.scheduleKey][pIdStr] = 'now';
                    }
                    if (draft[meta.endScheduleKey]) {
                        delete draft[meta.endScheduleKey][pIdStr];
                    }
                }
            });
        }
        const helperText = document.getElementById('teacher-schedule-helper-text');
        const releaseNowChk = document.getElementById('teacher-schedule-release-now-chk');
        const isNow = releaseNowChk ? releaseNowChk.checked : true;
        const isUnifiedMulti = Boolean(window._unifiedPickerSelection && Array.isArray(window._unifiedPickerSelection.allSelected) && window._unifiedPickerSelection.allSelected.length > 0);
        const itemsLabel = isUnifiedMulti ? 'items' : meta.labelPlural;
        if (helperText) {
            if (!checked) {
                helperText.textContent = `Each selected ${isUnifiedMulti ? 'item' : (meta.labelSingular || 'item')} can now be scheduled individually via the dropdown above.`;
            } else {
                helperText.textContent = isNow
                    ? `Selected ${itemsLabel} will be released and accessible to students immediately.`
                    : `Selected ${itemsLabel} will unlock automatically at this date & time.`;
            }
        }
    };

    window.validateTeacherScheduleInputs = function (category = 'topics', showBanner = false) {
        const meta = window.getUnifiedScheduleMeta?.(category) || {};
        const draft = (meta.draftStateKey && window[meta.draftStateKey]) ? window[meta.draftStateKey] : {};
        const targetId = (draft._targetId !== undefined && draft._targetId !== null)
            ? String(draft._targetId)
            : (draft[meta.pendingKey] && draft[meta.pendingKey][0] ? String(draft[meta.pendingKey][0]) : '');

        const releaseNowChk = document.getElementById('teacher-schedule-release-now-chk');
        const isReleaseNow = releaseNowChk ? releaseNowChk.checked : (draft[meta.scheduleKey]?.[targetId] === 'now' || !draft[meta.scheduleKey]?.[targetId]);
        const noDeadlineChk = document.getElementById('teacher-schedule-no-deadline-chk');
        const isNoDeadline = noDeadlineChk ? noDeadlineChk.checked : (!draft[meta.endScheduleKey]?.[targetId]);

        const dateInput = document.getElementById('teacher-exact-date-input');
        const timeInput = document.getElementById('teacher-time-input');
        const endDateInput = document.getElementById('teacher-exact-end-date-input');
        const endTimeInput = document.getElementById('teacher-end-time-input');
        window.keepScheduleDateTimeForward?.();

        let dateVal = dateInput?.value || '';
        let timeVal = (timeInput?.value && timeInput?.value !== '--:-- --') ? timeInput.value.trim() : '';
        let endDateVal = endDateInput?.value || '';
        let endTimeVal = (endTimeInput?.value && endTimeInput?.value !== '--:-- --') ? endTimeInput.value.trim() : '';

        const parseTime24 = (timeStr, defaultTime = '00:00') => {
            if (!timeStr || timeStr === '--:-- --') return defaultTime;
            const match = timeStr.match(/(\d{1,2})(?:[:.](\d{0,2}))?(?:\s*([AP]M)?)?/i);
            if (!match) return defaultTime;
            let h = parseInt(match[1], 10) || 0;
            let m = match[2] !== undefined && match[2] !== '' ? parseInt(match[2], 10) : 0;
            let p = match[3] ? match[3].toUpperCase() : 'AM';
            if (p === 'PM' && h < 12) h += 12;
            if (p === 'AM' && h === 12) h = 0;
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        };

        const now = new Date();
        const todayDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const errors = [];
        let releaseHasError = false;
        let dueHasError = false;
        let missingHps = false;
        let missingAttempts = false;
        let missingTimeLimit = false;
        let missingMethod = false;
        let missingEssayReview = false;
        let missingActivityCategory = false;
        let missingRubricForAi = false;

        // 1. Validate Release Date & Time only when dateInput is in DOM and Release Immediately is unchecked
        if (dateInput && !isReleaseNow && dateVal) {
            if (dateVal < todayDateStr) {
                errors.push({ field: 'release', label: 'Release Date', message: 'Cannot be in the past.' });
                releaseHasError = true;
            } else if (timeVal && timeVal !== '--:-- --') {
                const time24 = parseTime24(timeVal, '00:00');
                const releaseDateTime = new Date(`${dateVal}T${time24}`);
                if (!isNaN(releaseDateTime.getTime()) && releaseDateTime.getTime() < now.getTime()) {
                    errors.push({ field: 'release', label: 'Release Date & Time', message: 'Cannot be in the past.' });
                    releaseHasError = true;
                }
            }
        }

        // 2. Validate Due Date & Time only when endDateInput is in DOM and No Deadline is unchecked
        if (endDateInput && !isNoDeadline && !endDateVal) {
            errors.push({ field: 'due', label: 'Due Date', message: 'Choose a due date, or select No due date.' });
            dueHasError = true;
        } else if (endDateInput && !isNoDeadline && endDateVal) {
            if (endDateVal < todayDateStr) {
                errors.push({ field: 'due', label: 'Due Date', message: 'Cannot be in the past.' });
                dueHasError = true;
            } else if (endTimeVal && endTimeVal !== '--:-- --') {
                const endTime24 = parseTime24(endTimeVal, '23:59');
                const dueDateTime = new Date(`${endDateVal}T${endTime24}`);
                if (!isNaN(dueDateTime.getTime()) && dueDateTime.getTime() < now.getTime()) {
                    errors.push({ field: 'due', label: 'Due Date & Time', message: 'Cannot be in the past.' });
                    dueHasError = true;
                }
            }

            if (!dueHasError && !isReleaseNow && dateVal) {
                const releaseTime24 = parseTime24(timeVal, '00:00');
                const releaseDateTime = new Date(`${dateVal}T${releaseTime24}`);
                const endTime24 = parseTime24(endTimeVal, '23:59');
                const dueDateTime = new Date(`${endDateVal}T${endTime24}`);
                if (!isNaN(releaseDateTime.getTime()) && !isNaN(dueDateTime.getTime()) && dueDateTime.getTime() <= releaseDateTime.getTime()) {
                    errors.push({ field: 'due', label: 'Due Date & Time', message: 'Must be after the release schedule.' });
                    dueHasError = true;
                }
            }
        }

        // 3. For assessments, validate that Grading Settings (HPS, Attempts, Time Limit if timed, Category if Activity, Method) are inputted
        if (category === 'assessments') {
            const pendingIds = draft[meta.pendingKey] || [];
            const targetIds = (pendingIds.length > 0) ? pendingIds : (targetId ? [targetId] : ['0']);
            const activeIdStr = String(targetId || (pendingIds.length > 0 ? pendingIds[0] : '0'));

            const modalOverlay = document.getElementById('teacher-topic-schedule-overlay');

            const maxScoreInput = document.getElementById('teacher-schedule-max-score');
            const domHps = maxScoreInput ? maxScoreInput.value.trim() : undefined;
            const domAttempts = document.getElementById('teacher-schedule-max-attempts')?.value?.trim();
            const gradingModeInput = document.getElementById('teacher-schedule-grading-mode');
            const domMethod = gradingModeInput ? gradingModeInput.value.trim() : undefined;
            const actCompInput = document.getElementById('teacher-schedule-activity-component');
            const domActComp = actCompInput ? actCompInput.value.trim() : undefined;
            const domNoTimeLimit = document.getElementById('teacher-schedule-no-timelimit-chk');
            const domTimeLimitVal = document.getElementById('teacher-schedule-timelimit-input')?.value?.trim();

            const subjectId = window.currentSubjectState?.id || window.activeSubjectId || (typeof getActiveSubjectId === 'function' ? getActiveSubjectId() : '');
            const activeSection = draft?.section || (typeof currentTopicState !== 'undefined' ? currentTopicState?.selectedSection : '') || (typeof resolveTeacherActiveSection === 'function' ? resolveTeacherActiveSection() : '') || localStorage.getItem('sigma-active-classroom-section') || '';
            const allAssessments = typeof window.getTeacherSubjectAssessments === 'function' ? window.getTeacherSubjectAssessments(subjectId, activeSection) : [];

            const getItemMeta = (idStr) => {
                let it = allAssessments.find(a => String(a.id || '') === idStr || String(a.title || '').trim().toLowerCase() === idStr.toLowerCase());
                if (!it) {
                    try {
                        const data = subjectId ? (typeof getTopicData === 'function' ? getTopicData(subjectId) : null) : null;
                        const topicList = (data && Array.isArray(data.q1Topics)) ? data.q1Topics : ((data && Array.isArray(data.topics)) ? data.topics : []);
                        for (const t of topicList) {
                            if (it) break;
                            for (const arr of [t.quizzes, t.assignments, t.activities, t.materials, t.performanceTasks]) {
                                if (Array.isArray(arr)) {
                                    const hit = arr.find(x => x && (String(x.id || '') === idStr || String(x.title || x.name || '').trim().toLowerCase() === idStr.toLowerCase()));
                                    if (hit) { it = hit; break; }
                                }
                            }
                        }
                    } catch (e) {}
                }
                const foundType = String(it?.type || '').toLowerCase();
                const foundCat = String(it?.category || '').toLowerCase();
                const titleStr = String(it?.title || it?.name || '').toLowerCase();
                const isExplicitNonQuizType = (
                    foundType === 'task' || foundType === 'tasks' ||
                    foundType === 'assignment' || foundType === 'assignments' ||
                    foundType === 'activity' || foundType === 'activities' ||
                    foundType === 'performance task' || foundType === 'performance' || foundType === 'performance tasks' ||
                    foundCat === 'task' || foundCat === 'assignment' || foundCat === 'assignments' ||
                    foundCat === 'activity' || foundCat === 'activities' ||
                    foundCat === 'performance' || foundCat === 'performancetasks' || foundCat === 'performancetask' || foundCat === 'pt'
                );
                const hasLinkedQuiz = Boolean(it?.selectedQuizId || it?.quizId || it?.rawItem?.selectedQuizId || it?.rawItem?.quizId);
                const typedAsQuiz = foundType === 'quiz' || foundType === 'quizzes' || foundCat === 'quiz' || foundCat === 'quizzes' || hasLinkedQuiz;
                const isQuiz = typedAsQuiz || (!isExplicitNonQuizType && !foundType && !foundCat && (titleStr.includes('quiz') || idStr.toLowerCase().includes('quiz')));
                const isAct = foundType === 'activity' || foundType === 'activities' || foundCat === 'activity' || foundCat === 'activities' || titleStr.includes('activity') || idStr.toLowerCase().includes('activ');
                return { item: it, isQuiz, isAct, title: it?.title || it?.name || '' };
            };

            targetIds.forEach(id => {
                const idStr = String(id);
                const isActive = (idStr === activeIdStr);
                const itemMeta = getItemMeta(idStr);
                const isQuizItem = (isActive && modalOverlay?.dataset?._isQuiz !== undefined)
                    ? (modalOverlay.dataset._isQuiz === 'true')
                    : itemMeta.isQuiz;
                const isActItem = (isActive && modalOverlay?.dataset?._isActivity !== undefined)
                    ? (modalOverlay.dataset._isActivity === 'true')
                    : itemMeta.isAct;

                // Resolve HPS
                let hps = '';
                if (isActive && domHps !== undefined) {
                    hps = domHps;
                } else if (draft.assessmentMaxScores?.[idStr] !== undefined && draft.assessmentMaxScores[idStr] !== null && draft.assessmentMaxScores[idStr] !== '') {
                    hps = String(draft.assessmentMaxScores[idStr]);
                } else if (isQuizItem) {
                    const quizHps = window.findQuizHps?.(subjectId, idStr, itemMeta.title, itemMeta.item);
                    if (quizHps !== null && quizHps !== undefined && !isNaN(Number(quizHps)) && Number(quizHps) >= 0) {
                        hps = String(quizHps);
                    }
                }

                // Resolve Attempts
                let attempts = '';
                if (isActive && domAttempts !== undefined) {
                    attempts = domAttempts;
                } else if (draft.assessmentMaxAttempts?.[idStr] !== undefined && draft.assessmentMaxAttempts[idStr] !== null && draft.assessmentMaxAttempts[idStr] !== '') {
                    attempts = String(draft.assessmentMaxAttempts[idStr]);
                }

                // Resolve Scoring Method
                let method = '';
                if (isQuizItem) {
                    method = 'auto';
                } else if (isActive && domMethod !== undefined) {
                    method = domMethod;
                } else if (draft.assessmentGradingModes?.[idStr] !== undefined && draft.assessmentGradingModes[idStr] !== null) {
                    method = draft.assessmentGradingModes[idStr];
                }
                if (!method) {
                    method = itemMeta.item?.gradingMode || itemMeta.item?.scoringMethod || 'manual';
                }

                // Resolve Assessment Gradebook Component & Weight
                let actComp = '';
                if (isQuizItem) {
                    actComp = 'ww';
                } else if (isActive && domActComp !== undefined) {
                    actComp = domActComp;
                } else if (draft.assessmentActivityComponents?.[idStr] !== undefined && draft.assessmentActivityComponents[idStr] !== null && draft.assessmentActivityComponents[idStr] !== '') {
                    actComp = draft.assessmentActivityComponents[idStr];
                } else if (draft.assessmentComponents?.[idStr] !== undefined && draft.assessmentComponents[idStr] !== null && draft.assessmentComponents[idStr] !== '') {
                    actComp = draft.assessmentComponents[idStr];
                }
                if (!actComp) {
                    actComp = itemMeta.item?.component || itemMeta.item?.gradebookComponent || 'ww';
                }

                // Resolve Quiz Timer
                let hasTimer = false;
                let timeLimitMins = null;
                if (isQuizItem) {
                    if (isActive && domNoTimeLimit !== null && domNoTimeLimit !== undefined) {
                        hasTimer = !domNoTimeLimit.checked;
                        timeLimitMins = (domTimeLimitVal !== undefined && domTimeLimitVal !== '') ? Number(domTimeLimitVal) : null;
                    } else {
                        hasTimer = draft.assessmentHasTimers?.[idStr] !== undefined ? Boolean(draft.assessmentHasTimers[idStr]) : false;
                        timeLimitMins = draft.assessmentTimeLimitMinutes?.[idStr] !== undefined && draft.assessmentTimeLimitMinutes[idStr] !== null ? Number(draft.assessmentTimeLimitMinutes[idStr]) : null;
                    }
                }

                // Resolve AI Assistance & Rubric Requirement
                let isAiAssisted = false;
                if (isActive) {
                    const aiChk = document.getElementById('teacher-schedule-ai-assisted');
                    isAiAssisted = aiChk ? aiChk.checked : Boolean(draft.assessmentAiAssisted?.[idStr]);
                } else {
                    isAiAssisted = draft.assessmentAiAssisted?.[idStr] !== undefined ? Boolean(draft.assessmentAiAssisted[idStr]) : false;
                }

                if (isAiAssisted && !isQuizItem) {
                    let r = (draft.assessmentRubrics?.[idStr] || draft.assessmentRubrics?.[itemMeta.title] || draft.assessmentRubrics?.[String(idStr)] || '').trim();
                    if (!r && itemMeta.item) {
                        const directR = itemMeta.item.rubric || itemMeta.item.rubricFile || itemMeta.item.gradingRubric || itemMeta.item.rubricName || itemMeta.item.rawItem?.rubric || itemMeta.item.rawItem?.rubricFile;
                        if (directR) r = (typeof directR === 'object' ? (directR.name || directR.fileName || directR.title || '') : String(directR)).trim();
                    }
                    if (!r) {
                        try {
                            const allAssessments = typeof window.getTeacherSubjectAssessments === 'function' ? window.getTeacherSubjectAssessments(subjectId, activeSection) : [];
                            for (const a of allAssessments) {
                                if (String(a.id || '') === idStr || String(a.title || '').trim().toLowerCase() === itemMeta.title.toLowerCase()) {
                                    const ar = a.rubric || a.rubricFile || a.gradingRubric || a.rubricName || a.rawItem?.rubric || a.rawItem?.rubricFile;
                                    if (ar) { r = (typeof ar === 'object' ? (ar.name || ar.fileName || ar.title || '') : String(ar)).trim(); break; }
                                }
                            }
                        } catch (e) {}
                    }
                    if (!r && draft._adminLockedRubric) r = String(draft._adminLockedRubric).trim();
                    const rubricLabel = document.getElementById('teacher-rubric-file-label');
                    if (!r && rubricLabel) {
                        const labelText = String(rubricLabel.textContent || '').trim();
                        if (labelText && labelText !== 'Rubric Required by SIGMA AI') r = labelText;
                    }
                    if (!r && document.getElementById('teacher-schedule-rubric-box')) {
                        missingRubricForAi = true;
                    }
                }

                if (hps === undefined || hps === null || hps === '' || isNaN(Number(hps)) || (isQuizItem ? Number(hps) < 0 : Number(hps) <= 0)) {
                    missingHps = true;
                }
                if (attempts === undefined || attempts === null || attempts === '' || isNaN(Number(attempts)) || Number(attempts) <= 0 || Number(attempts) > 20) {
                    missingAttempts = true;
                }
                if (isQuizItem && hasTimer && (timeLimitMins === null || isNaN(timeLimitMins) || timeLimitMins <= 0 || timeLimitMins > 300)) {
                    missingTimeLimit = true;
                }
                if (!method || method === '') {
                    missingMethod = true;
                }
                if (isQuizItem) {
                    const essaySection = isActive ? document.getElementById('teacher-quiz-essay-scoring-section') : null;
                    const domEssayInput = isActive ? document.getElementById('teacher-schedule-essay-grading-mode') : null;
                    if (essaySection || !isActive) {
                        const domEssayMode = domEssayInput ? domEssayInput.value.trim() : undefined;
                        const essayMode = domEssayMode !== undefined
                            ? domEssayMode
                            : String(draft.assessmentEssayGradingModes?.[idStr] || 'auto');
                        if (essayMode !== 'manual' && essayMode !== 'auto') missingEssayReview = true;
                    }
                }
                if (!actComp || actComp === '') {
                    missingActivityCategory = true;
                }
            });

            if (targetIds.length > 0) {
                if (missingActivityCategory) {
                    errors.push({ field: 'grading', label: 'Weight (%)', message: 'Please select a Component & Weight (Written Work or Performance Task).' });
                }
                if (missingHps) {
                    errors.push({ field: 'grading', label: 'Highest Possible Score', message: 'Highest Possible Score is required.' });
                }
                if (missingAttempts) {
                    errors.push({ field: 'grading', label: 'Max Attempts', message: 'Max Attempts is required (1 to 20 tries).' });
                }
                if (missingTimeLimit) {
                    errors.push({ field: 'grading', label: 'Quiz Time Limit', message: 'Time limit duration is required when enabled (1 to 300 minutes).' });
                }
                if (missingMethod) {
                    errors.push({ field: 'grading', label: 'Scoring Method', message: 'Scoring Method is required.' });
                }
                if (missingEssayReview) {
                    errors.push({ field: 'grading', label: 'Written Response Review', message: 'Choose Manually Review or Automatic Score.' });
                }
                if (missingRubricForAi) {
                    errors.push({ field: 'rubric', label: 'Grading Rubric', message: 'A grading rubric is required by SIGMA AI for scoring. Please upload or attach a rubric.' });
                }
            }
        }

        const rubricBox = document.getElementById('teacher-schedule-rubric-box');
        if (rubricBox) {
            if (missingRubricForAi && showBanner) {
                rubricBox.classList.add('!border-red-500', 'bg-red-50/30');
            } else if (!missingRubricForAi) {
                rubricBox.classList.remove('!border-red-500', 'bg-red-50/30');
            }
        }

        const catBox = document.getElementById('teacher-schedule-activity-component-box');
        if (catBox) {
            if (missingActivityCategory && showBanner) {
                catBox.classList.add('!border-red-500');
            } else if (!missingActivityCategory) {
                catBox.classList.remove('!border-red-500');
            }
        }

        const attemptsBox = document.getElementById('teacher-schedule-max-attempts')?.parentElement;
        if (attemptsBox) {
            if (missingAttempts && showBanner) attemptsBox.classList.add('!border-red-500');
            else if (!missingAttempts) attemptsBox.classList.remove('!border-red-500');
        }

        const timeLimitInpBox = document.getElementById('teacher-schedule-timelimit-input')?.parentElement;
        if (timeLimitInpBox) {
            if (missingTimeLimit && showBanner) timeLimitInpBox.classList.add('!border-red-500');
            else if (!missingTimeLimit) timeLimitInpBox.classList.remove('!border-red-500');
        }

        const hpsBox = document.getElementById('teacher-schedule-max-score')?.parentElement;
        if (hpsBox) {
            if (missingHps && showBanner) hpsBox.classList.add('!border-red-500');
            else if (!missingHps) hpsBox.classList.remove('!border-red-500');
        }

        const errorBanner = document.getElementById('teacher-schedule-error-banner');
        const errorMsgSpan = document.getElementById('teacher-schedule-error-msg');
        const saveBtn = document.getElementById('teacher-save-schedule-btn');

        const releaseDateBox = document.getElementById('teacher-release-date-box');
        const releaseTimeBox = document.getElementById('teacher-time-panel-box');
        const dueDateBox = document.getElementById('teacher-due-date-box');
        const dueTimeBox = document.getElementById('teacher-end-time-panel-box');

        if (releaseDateBox) {
            if ((releaseHasError && showBanner) || dateInput?.dataset.pastRejected === '1') releaseDateBox.classList.add('!border-red-500');
            else releaseDateBox.classList.remove('!border-red-500');
        }
        if (releaseTimeBox) {
            if ((releaseHasError && showBanner) || timeInput?.dataset.pastRejected === '1') releaseTimeBox.classList.add('!border-red-500');
            else releaseTimeBox.classList.remove('!border-red-500');
        }
        if (dueDateBox) {
            if ((dueHasError && showBanner) || endDateInput?.dataset.pastRejected === '1') dueDateBox.classList.add('!border-red-500');
            else dueDateBox.classList.remove('!border-red-500');
        }
        if (dueTimeBox) {
            if ((dueHasError && showBanner) || endTimeInput?.dataset.pastRejected === '1') dueTimeBox.classList.add('!border-red-500');
            else dueTimeBox.classList.remove('!border-red-500');
        }

        // Check if anything changed in edit mode
        const modalOverlay = document.getElementById('teacher-topic-schedule-overlay');
        const editType = modalOverlay?.dataset?._editType || draft._editType || '';
        let hasChanged = true;

        if (editType && draft._initialSnapshot) {
            const snap = draft._initialSnapshot;
            if (editType === 'schedule') {
                const curIsReleaseNow = Boolean(isReleaseNow);
                const curDateVal = (dateInput ? dateInput.value.trim() : (draft[meta.scheduleKey]?.[targetId] ? String(draft[meta.scheduleKey][targetId]).split('T')[0] : snap.dateVal)) || '';
                const curTimeVal = (timeInput && timeInput.value.trim() !== '--:-- --') ? timeInput.value.trim() : '';
                const snapTimeVal = (snap.timeVal && snap.timeVal !== '--:-- --') ? snap.timeVal.trim() : '';
                const curIsNoDeadline = Boolean(isNoDeadline);
                const curEndDateVal = (endDateInput ? endDateInput.value.trim() : (draft[meta.endScheduleKey]?.[targetId] ? String(draft[meta.endScheduleKey][targetId]).split('T')[0] : snap.endDateVal)) || '';
                const curEndTimeVal = (endTimeInput && endTimeInput.value.trim() !== '--:-- --') ? endTimeInput.value.trim() : '';
                const snapEndTimeVal = (snap.endTimeVal && snap.endTimeVal !== '--:-- --') ? snap.endTimeVal.trim() : '';

                const releaseChanged = (curIsReleaseNow !== snap.isReleaseNow) ||
                    (!curIsReleaseNow && (curDateVal !== snap.dateVal || curTimeVal !== snapTimeVal));
                
                const dueChanged = (curIsNoDeadline !== snap.isNoDeadline) ||
                    (!curIsNoDeadline && (curEndDateVal !== snap.endDateVal || curEndTimeVal !== snapEndTimeVal));

                hasChanged = releaseChanged || dueChanged;
            } else if (editType === 'grading') {
                const domHps = document.getElementById('teacher-schedule-max-score')?.value?.trim();
                const curHps = String((domHps !== undefined) ? domHps : (draft.assessmentMaxScores?.[targetId] !== undefined ? draft.assessmentMaxScores[targetId] : snap.maxScore));
                
                const domWeight = document.getElementById('teacher-schedule-weight')?.value?.trim();
                const curWeight = String((domWeight !== undefined) ? domWeight : (draft.assessmentWeights?.[targetId] !== undefined ? draft.assessmentWeights[targetId] : snap.weight));

                const domActComp = document.getElementById('teacher-schedule-activity-component')?.value?.trim();
                const curActComp = String((domActComp !== undefined) ? domActComp : (draft.assessmentActivityComponents?.[targetId] !== undefined ? draft.assessmentActivityComponents[targetId] : snap.activityComponent));

                const domAttempts = document.getElementById('teacher-schedule-max-attempts')?.value?.trim();
                const curAttempts = String((domAttempts !== undefined) ? domAttempts : (draft.assessmentMaxAttempts?.[targetId] !== undefined ? draft.assessmentMaxAttempts[targetId] : snap.maxAttempts));

                const lateChk = document.getElementById('teacher-schedule-late-permission');
                const curLate = lateChk ? lateChk.checked : (draft.assessmentLatePermissions?.[targetId] !== undefined ? Boolean(draft.assessmentLatePermissions[targetId]) : snap.latePermission);

                const noTimeLimitChk = document.getElementById('teacher-schedule-no-timelimit-chk');
                const timeLimitInput = document.getElementById('teacher-schedule-timelimit-input');
                const curHasTimer = noTimeLimitChk ? !noTimeLimitChk.checked : (draft.assessmentHasTimers?.[targetId] !== undefined ? Boolean(draft.assessmentHasTimers[targetId]) : snap.hasTimer);
                const curTimeLimitMinutes = String((timeLimitInput && timeLimitInput.value !== undefined) ? timeLimitInput.value.trim() : (draft.assessmentTimeLimitMinutes?.[targetId] !== undefined ? draft.assessmentTimeLimitMinutes[targetId] : snap.timeLimitMinutes));

                const autoChk = document.getElementById('teacher-schedule-autosubmit-chk');
                const curAuto = autoChk ? autoChk.checked : (draft.assessmentAutoSubmitOnExit?.[targetId] !== undefined ? Boolean(draft.assessmentAutoSubmitOnExit[targetId]) : snap.autoSubmitOnExit);

                const domMethod = document.getElementById('teacher-schedule-grading-mode')?.value?.trim();
                const curMethod = String((domMethod !== undefined) ? domMethod : (draft.assessmentGradingModes?.[targetId] !== undefined ? draft.assessmentGradingModes[targetId] : snap.gradingMode));

                const domEssayMode = document.getElementById('teacher-schedule-essay-grading-mode')?.value?.trim();
                const curEssayMode = String((domEssayMode !== undefined) ? domEssayMode : (draft.assessmentEssayGradingModes?.[targetId] !== undefined ? draft.assessmentEssayGradingModes[targetId] : (snap.essayGradingMode || '')));

                const showAnswersChk = document.getElementById('teacher-schedule-show-correct-answers');
                const curShowAnswers = showAnswersChk ? showAnswersChk.checked : (draft.assessmentShowCorrectAnswers?.[targetId] !== undefined ? Boolean(draft.assessmentShowCorrectAnswers[targetId]) : Boolean(snap.showCorrectAnswers));

                const allowUploadChk = document.getElementById('teacher-schedule-allow-file-upload');
                const curAllowUpload = allowUploadChk ? allowUploadChk.checked : (draft.assessmentAllowFileUploads?.[targetId] !== undefined ? Boolean(draft.assessmentAllowFileUploads[targetId]) : Boolean(snap.allowFileUpload));

                const aiChk = document.getElementById('teacher-schedule-ai-assisted');
                const curAi = aiChk ? aiChk.checked : (draft.assessmentAiAssisted?.[targetId] !== undefined ? Boolean(draft.assessmentAiAssisted[targetId]) : snap.aiAssisted);

                const curRubric = String(draft.assessmentRubrics?.[targetId] !== undefined ? draft.assessmentRubrics[targetId] : snap.rubric);
                const curCritAuto = draft.assessmentCriteriaAiAuto?.[targetId] !== undefined ? Boolean(draft.assessmentCriteriaAiAuto[targetId]) : snap.criteriaAiAuto;
                const curCritSel = Array.isArray(draft.assessmentSelectedCriteria?.[targetId]) ? JSON.stringify(draft.assessmentSelectedCriteria[targetId]) : snap.selectedCriteria;

                const hpsChanged = curHps !== snap.maxScore;
                const weightChanged = curWeight !== snap.weight;
                const actCompChanged = curActComp !== snap.activityComponent;
                const attemptsChanged = curAttempts !== snap.maxAttempts;
                const lateChanged = curLate !== snap.latePermission;
                const timerChanged = (curHasTimer !== snap.hasTimer) || (curHasTimer && curTimeLimitMinutes !== snap.timeLimitMinutes) || (curHasTimer && curAuto !== snap.autoSubmitOnExit);
                const methodChanged = curMethod !== snap.gradingMode;
                const essayModeChanged = curEssayMode !== snap.essayGradingMode;
                const curReviewTypes = JSON.stringify(draft.assessmentManualReviewTypes?.[targetId] || { essay: true, enumeration: false, shortAnswer: false });
                const reviewTypesChanged = curReviewTypes !== (snap.manualReviewTypes || curReviewTypes);
                const showAnswersChanged = curShowAnswers !== snap.showCorrectAnswers;
                const fileUploadChanged = curAllowUpload !== snap.allowFileUpload;
                const aiChanged = curAi !== snap.aiAssisted;
                const rubricChanged = curRubric !== snap.rubric;
                const critAutoChanged = curCritAuto !== snap.criteriaAiAuto;
                const critSelChanged = curCritSel !== snap.selectedCriteria;

                hasChanged = hpsChanged || weightChanged || actCompChanged || attemptsChanged || lateChanged || timerChanged || methodChanged || essayModeChanged || reviewTypesChanged || showAnswersChanged || fileUploadChanged || aiChanged || rubricChanged || critAutoChanged || critSelChanged;
            }
        }

        if (errors.length > 0) {
            if (showBanner && errorBanner) {
                errorBanner.classList.remove('hidden');
                errorBanner.classList.add('flex');
            } else if (errorBanner) {
                errorBanner.classList.add('hidden');
                errorBanner.classList.remove('flex');
            }
            if (errorMsgSpan && showBanner) {
                if (errors.length === 1) {
                    errorMsgSpan.innerHTML = `<span><strong class="font-bold text-red-800">[${escapeHtml(errors[0].label)}]:</strong> ${escapeHtml(errors[0].message)}</span>`;
                } else {
                    errorMsgSpan.innerHTML = `
                        <div class="flex flex-col gap-1 w-full">
                            ${errors.map(err => `<div><strong class="font-bold text-red-800">[${escapeHtml(err.label)}]:</strong> ${escapeHtml(err.message)}</div>`).join('')}
                        </div>
                    `;
                }
            }
            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.classList.add('opacity-40', 'cursor-not-allowed', 'pointer-events-none');
            }
        } else {
            if (errorBanner) {
                errorBanner.classList.add('hidden');
                errorBanner.classList.remove('flex');
            }
            if (errorMsgSpan) errorMsgSpan.innerHTML = '';
            if (saveBtn) {
                if (editType && !hasChanged) {
                    saveBtn.disabled = true;
                    saveBtn.classList.add('opacity-40', 'cursor-not-allowed', 'pointer-events-none');
                } else {
                    saveBtn.disabled = false;
                    saveBtn.classList.remove('opacity-40', 'cursor-not-allowed', 'pointer-events-none');
                }
            }
        }

        const setGradingBtn = document.getElementById('teacher-set-grading-btn');
        if (setGradingBtn) {
            if (releaseHasError || dueHasError) {
                setGradingBtn.disabled = true;
                setGradingBtn.classList.add('opacity-40', 'cursor-not-allowed', 'pointer-events-none');
            } else {
                setGradingBtn.disabled = false;
                setGradingBtn.classList.remove('opacity-40', 'cursor-not-allowed', 'pointer-events-none');
            }
        }

        window.updateScheduleHelperSummary?.(category);
        return errors.length === 0;
    };

    window.updateScheduleHelperSummary = function (category = 'topics') {
        window.keepScheduleDateTimeForward?.();
        const meta = window.getUnifiedScheduleMeta(category);
        const helperText = document.getElementById('teacher-schedule-helper-text');
        if (!helperText) return;

        const releaseNowChk = document.getElementById('teacher-schedule-release-now-chk');
        const isReleaseNow = releaseNowChk ? releaseNowChk.checked : false;
        const noDeadlineChk = document.getElementById('teacher-schedule-no-deadline-chk');
        const isNoDeadline = noDeadlineChk ? noDeadlineChk.checked : false;

        const dateInput = document.getElementById('teacher-exact-date-input');
        const timeInput = document.getElementById('teacher-time-input');
        const endDateInput = document.getElementById('teacher-exact-end-date-input');
        const endTimeInput = document.getElementById('teacher-end-time-input');

        const dateVal = dateInput?.value || '';
        const timeVal = (timeInput?.value && timeInput?.value !== '--:-- --') ? timeInput.value : '';
        const endDateVal = endDateInput?.value || '';
        const endTimeVal = (endTimeInput?.value && endTimeInput?.value !== '--:-- --') ? endTimeInput.value : '';

        let releaseDesc = '';
        if (isReleaseNow) {
            releaseDesc = `will be released and accessible to students immediately`;
        } else if (dateVal) {
            releaseDesc = `will unlock automatically on ${dateVal}${timeVal ? ' at ' + timeVal : ''}`;
        } else {
            releaseDesc = `will be scheduled for release`;
        }

        let dueDesc = '';
        if (endDateInput) {
            if (isNoDeadline) {
                dueDesc = ` with no deadline (can submit anytime)`;
            } else if (endDateVal) {
                dueDesc = ` and due on ${endDateVal}${endTimeVal ? ' at ' + endTimeVal : ' by 11:59 PM (end of day)'}`;
            }
        }

        const pastLocked = document.getElementById('teacher-exact-date-input')?.dataset.pastRejected === '1'
            || document.getElementById('teacher-time-input')?.dataset.pastRejected === '1'
            || document.getElementById('teacher-exact-end-date-input')?.dataset.pastRejected === '1'
            || document.getElementById('teacher-end-time-input')?.dataset.pastRejected === '1';
        helperText.classList.toggle('text-red-600', pastLocked);
        helperText.classList.toggle('text-black', !pastLocked);
        const isUnifiedMulti = Boolean(window._unifiedPickerSelection && Array.isArray(window._unifiedPickerSelection.allSelected) && window._unifiedPickerSelection.allSelected.length > 0);
        const itemsLabel = isUnifiedMulti ? 'items' : meta.labelPlural;
        helperText.textContent = pastLocked
            ? 'Cannot be in the past. Past dates and times are locked.'
            : `Selected ${itemsLabel} ${releaseDesc}${dueDesc}. Past dates and times are locked.`;
    };

    window.toggleTeacherScheduleReleaseNow = function (isChecked, category = 'topics') {
        const releaseBox = document.getElementById('teacher-schedule-release-datetime-box');
        const dateInput = document.getElementById('teacher-exact-date-input');
        const timeInput = document.getElementById('teacher-time-input');
        const dateBox = document.getElementById('teacher-release-date-box');
        const timeBox = document.getElementById('teacher-time-panel-box');

        if (isChecked) {
            const now = new Date();
            const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            if (dateInput) {
                dateInput.value = today;
                delete dateInput.dataset.pastRejected;
                dateInput.classList.remove('!border-red-500');
            }
            if (timeInput) {
                timeInput.value = hhmm;
                delete timeInput.dataset.pastRejected;
                timeInput.classList.remove('!border-red-500');
            }
        }
        if (releaseBox) {
            if (isChecked) {
                releaseBox.classList.add('opacity-40', 'pointer-events-none');
                window.closeTeacherScheduleTimePopover?.();
            } else {
                releaseBox.classList.remove('opacity-40', 'pointer-events-none');
            }
        }
        if (dateInput) {
            dateInput.readOnly = isChecked;
            dateInput.tabIndex = isChecked ? -1 : 0;
            if (isChecked) {
                dateInput.classList.remove('text-black');
                dateInput.classList.add('text-black-fade');
            } else {
                dateInput.classList.remove('text-black-fade');
                dateInput.classList.add('text-black');
            }
        }
        if (timeInput) {
            timeInput.readOnly = isChecked;
            timeInput.tabIndex = isChecked ? -1 : 0;
            if (isChecked) {
                timeInput.classList.remove('text-black');
                timeInput.classList.add('text-black-fade');
            } else {
                timeInput.classList.remove('text-black-fade');
                timeInput.classList.add('text-black');
            }
        }
        if (dateBox) {
            if (isChecked) {
                dateBox.classList.remove('bg-white', 'border-slate-200');
                dateBox.classList.add('bg-black/[0.03]', 'border-black/10');
            } else {
                dateBox.classList.remove('bg-black/[0.03]', 'border-black/10');
                dateBox.classList.add('bg-white', 'border-slate-200');
            }
        }
        if (timeBox) {
            if (isChecked) {
                timeBox.classList.remove('bg-white', 'border-slate-200');
                timeBox.classList.add('bg-black/[0.03]', 'border-black/10');
            } else {
                timeBox.classList.remove('bg-black/[0.03]', 'border-black/10');
                timeBox.classList.add('bg-white', 'border-slate-200');
            }
        }
        window.cacheActiveAssessmentGradingSettings?.();
        window.validateTeacherScheduleInputs?.(category);
    };

    window.toggleTeacherScheduleNoTimeLimit = function (isNoLimit) {
        const timeLimitBox = document.getElementById('teacher-schedule-timelimit-box');
        const timeLimitInput = document.getElementById('teacher-schedule-timelimit-input');
        const hintText = document.getElementById('teacher-timelimit-hint-text');
        const timeLimitShell = document.getElementById('teacher-schedule-timelimit-shell');
        const lockIcon = document.getElementById('teacher-timelimit-lock-icon');
        const unitSpan = document.getElementById('teacher-timelimit-unit');

        if (timeLimitBox) {
            if (isNoLimit) timeLimitBox.classList.add('pointer-events-none');
            else timeLimitBox.classList.remove('pointer-events-none');
        }
        if (timeLimitShell) {
            timeLimitShell.classList.remove('bg-white', 'bg-slate-100', 'bg-slate-100/70', 'focus-within:border-[#FFD000]', 'cursor-not-allowed', 'is-locked');
            if (isNoLimit) {
                timeLimitShell.classList.add('is-locked', 'bg-slate-100', 'cursor-not-allowed');
            } else {
                timeLimitShell.classList.add('bg-white', 'focus-within:border-[#FFD000]');
            }
        }
        if (lockIcon) {
            if (isNoLimit) lockIcon.classList.remove('hidden');
            else lockIcon.classList.add('hidden');
        }
        if (unitSpan) {
            if (isNoLimit) {
                unitSpan.style.color = '#94a3b8';
                unitSpan.classList.add('text-slate-400');
                unitSpan.classList.remove('text-black');
            } else {
                unitSpan.style.color = '#000';
                unitSpan.classList.add('text-black');
                unitSpan.classList.remove('text-slate-400');
            }
        }
        if (timeLimitInput) {
            timeLimitInput.readOnly = isNoLimit;
            timeLimitInput.disabled = isNoLimit;
            timeLimitInput.tabIndex = isNoLimit ? -1 : 0;
            if (isNoLimit) {
                timeLimitInput.style.color = '#94a3b8';
                timeLimitInput.classList.remove('text-black');
                timeLimitInput.classList.add('text-slate-400', 'cursor-not-allowed');
            } else {
                timeLimitInput.style.color = '#000';
                timeLimitInput.classList.remove('text-slate-400', 'cursor-not-allowed');
                timeLimitInput.classList.add('text-black');
                timeLimitInput.focus();
            }
        }
        const autoSubmitBox = document.getElementById('teacher-schedule-autosubmit-box');
        const autoSubmitChk = document.getElementById('teacher-schedule-autosubmit-chk');

        if (autoSubmitBox) {
            if (isNoLimit) {
                autoSubmitBox.classList.add('opacity-40', 'pointer-events-none');
            } else {
                autoSubmitBox.classList.remove('opacity-40', 'pointer-events-none');
            }
        }
        if (autoSubmitChk) {
            autoSubmitChk.disabled = isNoLimit;
            if (isNoLimit) {
                autoSubmitChk.checked = false;
            }
        }
        if (hintText) {
            hintText.textContent = isNoLimit ? 'Untimed quiz (locked).' : 'Duration limit.';
        }
        window.cacheActiveAssessmentGradingSettings?.();
        const modalOverlay = document.getElementById('teacher-topic-schedule-overlay');
        const category = modalOverlay?.dataset?._category || 'assessments';
        window.validateTeacherScheduleInputs?.(category, false);
    };

    window.selectTeacherScheduleGradingMode = function (mode = 'auto') {
        const modalOverlay = document.getElementById('teacher-topic-schedule-overlay');
        const isQuiz = modalOverlay?.dataset?._isQuiz === 'true';
        if (isQuiz) {
            mode = 'auto';
        }
        const hiddenInp = document.getElementById('teacher-schedule-grading-mode');
        const currentMode = hiddenInp ? hiddenInp.value : '';
        const targetMode = isQuiz ? 'auto' : (currentMode === mode ? '' : mode);
        if (hiddenInp) hiddenInp.value = targetMode;

        ['auto', 'manual'].forEach(m => {
            const card = document.getElementById(`teacher-grading-mode-${m}`);
            const icon = document.getElementById(`teacher-grading-mode-${m}-icon`);
            if (card) {
                if (m === targetMode) {
                    card.className = 'p-3.5 rounded-xl border-2 transition-all cursor-pointer select-none flex items-start gap-3 border-[#15803d] bg-emerald-50/60 shadow-2xs';
                } else {
                    card.className = 'p-3.5 rounded-xl border-2 transition-all cursor-pointer select-none flex items-start gap-3 border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50';
                }
            }
            if (icon) {
                if (m === targetMode) {
                    icon.className = 'w-4 h-4 rounded-full bg-[#15803d] text-white flex items-center justify-center text-[9px] shrink-0 mt-0.5';
                    icon.innerHTML = '<i class="fa-solid fa-check"></i>';
                } else {
                    icon.className = 'w-4 h-4 rounded-full border-2 border-slate-300 bg-white flex items-center justify-center text-[9px] shrink-0 mt-0.5';
                    icon.innerHTML = '';
                }
            }
        });

        const aiContainer = document.getElementById('teacher-schedule-ai-assisted-container');
        const aiChk = document.getElementById('teacher-schedule-ai-assisted');
        const subtext = document.getElementById('teacher-ai-assist-subtext');
        const rubricBox = document.getElementById('teacher-schedule-rubric-box');

        if (targetMode) {
            if (aiContainer) {
                aiContainer.classList.remove('opacity-40', 'pointer-events-none', 'cursor-not-allowed');
                aiContainer.classList.add('hover:border-slate-300', 'cursor-pointer');
            }
            if (aiChk) aiChk.disabled = false;
            if (subtext) {
                subtext.textContent = targetMode === 'manual'
                    ? 'AI drafts suggested scores and comments for teacher review and final approval.'
                    : 'AI evaluates open-ended tasks with partial credit and automated feedback.';
            }
        } else {
            if (aiContainer) {
                aiContainer.classList.add('opacity-40', 'pointer-events-none', 'cursor-not-allowed');
                aiContainer.classList.remove('hover:border-slate-300', 'cursor-pointer');
            }
            if (aiChk) {
                aiChk.disabled = true;
                aiChk.checked = false;
            }
            if (rubricBox) rubricBox.classList.add('hidden');
            const criteriaBox = document.getElementById('teacher-schedule-criteria-box');
            if (criteriaBox) criteriaBox.classList.add('hidden');
            if (subtext) {
                subtext.textContent = 'Select a scoring method above to enable AI assistance.';
            }
        }

        window.cacheActiveAssessmentGradingSettings?.();
        const category = modalOverlay?.dataset?._category || 'assessments';
        window.validateTeacherScheduleInputs?.(category, false);
    };

    window.selectTeacherScheduleEssayGradingMode = function (mode = 'manual') {
        const hiddenInp = document.getElementById('teacher-schedule-essay-grading-mode');
        const requested = (mode === 'auto') ? 'auto' : 'manual';
        const current = hiddenInp ? hiddenInp.value : '';
        const targetMode = current === requested ? '' : requested;
        if (hiddenInp) hiddenInp.value = targetMode;

        ['manual', 'auto'].forEach(m => {
            const card = document.getElementById(`teacher-essay-mode-${m}`);
            const icon = document.getElementById(`teacher-essay-mode-${m}-icon`);
            if (card) {
                if (m === targetMode) {
                    card.className = 'p-4 rounded-xl border-2 transition-all cursor-pointer select-none flex items-start gap-3.5 border-[#15803d] bg-emerald-50/60 shadow-2xs';
                } else {
                    card.className = 'p-4 rounded-xl border-2 transition-all cursor-pointer select-none flex items-start gap-3.5 border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50';
                }
            }
            if (icon) {
                if (m === targetMode) {
                    icon.className = 'w-5 h-5 rounded-full bg-[#15803d] text-white flex items-center justify-center text-[10px] shrink-0 mt-0.5';
                    icon.innerHTML = '<i class="fa-solid fa-check"></i>';
                } else {
                    icon.className = 'w-5 h-5 rounded-full border-2 border-slate-300 bg-white flex items-center justify-center text-[10px] shrink-0 mt-0.5';
                    icon.innerHTML = '';
                }
            }
        });

        const types = document.getElementById('teacher-manual-review-types');
        if (types) {
            if (targetMode === 'manual') types.classList.remove('hidden');
            else types.classList.add('hidden');
        }

        window.cacheActiveAssessmentGradingSettings?.();
        const modalOverlay = document.getElementById('teacher-topic-schedule-overlay');
        const category = modalOverlay?.dataset?._category || 'assessments';
        window.validateTeacherScheduleInputs?.(category, false);
    };

    window.toggleTeacherScheduleAiAssisted = function (isChecked) {
        const rubricBox = document.getElementById('teacher-schedule-rubric-box');
        const criteriaBox = document.getElementById('teacher-schedule-criteria-box');
        if (rubricBox) {
            if (isChecked) rubricBox.classList.remove('hidden');
            else rubricBox.classList.add('hidden');
        }
        if (criteriaBox) {
            if (isChecked) criteriaBox.classList.remove('hidden');
            else criteriaBox.classList.add('hidden');
        }
        window.cacheActiveAssessmentGradingSettings?.();
        const modalOverlay = document.getElementById('teacher-topic-schedule-overlay');
        const category = modalOverlay?.dataset?._category || 'assessments';
        window.validateTeacherScheduleInputs?.(category, false);

        // Smoothly auto-scroll modal body to reveal the AI assistance configuration options
        if (isChecked) {
            requestAnimationFrame(() => {
                setTimeout(() => {
                    const scrollContainer = document.getElementById('teacher-schedule-modal-body');
                    const targetEl = rubricBox || criteriaBox;
                    if (scrollContainer && targetEl) {
                        const targetTop = targetEl.getBoundingClientRect().top;
                        const containerTop = scrollContainer.getBoundingClientRect().top;
                        const scrollOffset = targetTop - containerTop + scrollContainer.scrollTop - 12;
                        scrollContainer.scrollTo({
                            top: Math.max(0, scrollOffset),
                            behavior: 'smooth'
                        });
                    } else if (targetEl) {
                        targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                }, 60);
            });
        }
    };

    window.handleTeacherRubricFileUpload = window.handleTeacherRubricFileUpload || function (input) {
        if (!input || !input.files || input.files.length === 0) return;
        const file = input.files[0];
        const fileName = file.name;

        const modalOverlay = document.getElementById('teacher-topic-schedule-overlay');
        const category = modalOverlay?.dataset?._category || 'assessments';
        const meta = window.getUnifiedScheduleMeta(category);
        const draft = window[meta.draftStateKey];
        if (!draft) return;

        if (draft._adminLockedRubric) {
            input.value = '';
            if (typeof window.showToast === 'function') {
                window.showToast('This rubric was set by the admin and cannot be changed.', 'error');
            }
            return;
        }

        if (!draft.assessmentRubrics) draft.assessmentRubrics = {};
        if (!draft.assessmentRubricUrls) draft.assessmentRubricUrls = {};
        if (!draft.assessmentRubricFiles) draft.assessmentRubricFiles = {};

        const effectiveId = draft._targetId;
        const targetKeys = (draft.pendingMaterialIds && draft.pendingMaterialIds.length > 0)
            ? draft.pendingMaterialIds.map(String)
            : (effectiveId ? [String(effectiveId)] : (draft._targetTitle ? [String(draft._targetTitle)] : []));
        if (targetKeys.length === 0 && effectiveId) targetKeys.push(String(effectiveId));
        if (targetKeys.length === 0 && draft._targetTitle) targetKeys.push(String(draft._targetTitle));

        targetKeys.forEach(k => {
            draft.assessmentRubrics[k] = fileName;
            draft.assessmentRubricFiles[k] = { fileName: fileName, fileSize: file.size, fileType: file.type };
        });

        const reader = new FileReader();
        reader.onload = function (e) {
            const dataUrl = e.target.result;
            targetKeys.forEach(k => {
                if (draft.assessmentRubricUrls) draft.assessmentRubricUrls[k] = dataUrl;
                if (draft.assessmentRubricFiles && draft.assessmentRubricFiles[k]) {
                    draft.assessmentRubricFiles[k].fileUrl = dataUrl;
                }
            });
        };
        reader.readAsDataURL(file);

        draft._uploadedRubricName = fileName;
        draft._rubricDeleted = false;

        const container = document.getElementById('teacher-rubric-status-content');
        if (container) {
            container.innerHTML = `
                <div class="flex items-center justify-between gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
                    <div class="flex items-center gap-2.5 min-w-0 flex-1">
                        <i class="fa-solid fa-file-circle-check text-[#15803d] text-base shrink-0"></i>
                        <span class="font-bold text-slate-900 text-xs truncate" id="teacher-rubric-file-label">${escapeHtml(fileName)}</span>
                        <span class="text-[10px] font-bold text-[#15803d] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                            <i class="fa-solid fa-check text-[9px]"></i> Ready for AI
                        </span>
                    </div>
                    <div class="flex items-center gap-2.5 shrink-0">
                        <button type="button" onclick="document.getElementById('teacher-rubric-file-input')?.click()" class="text-xs font-bold text-emerald-700 hover:text-emerald-900 shrink-0 cursor-pointer">Change</button>
                        <button type="button" onclick="window.removeTeacherUploadedRubric('${category}')" class="text-xs font-bold text-black hover:text-slate-700 shrink-0 cursor-pointer flex items-center gap-1" title="Delete Rubric">
                            <i class="fa-solid fa-trash-can text-black text-xs"></i> Delete
                        </button>
                    </div>
                </div>
            `;
        }
        document.getElementById('teacher-schedule-rubric-box')?.classList.remove('!border-red-500', 'bg-red-50/20', 'bg-red-50/30');
        window.cacheActiveAssessmentGradingSettings?.();
        window.validateTeacherScheduleInputs?.(category, false);
    };

    window.removeTeacherUploadedRubric = window.removeTeacherUploadedRubric || function (category = 'assessments') {
        const meta = window.getUnifiedScheduleMeta ? window.getUnifiedScheduleMeta(category) : { draftStateKey: '_teacherAssessScheduleDraft' };
        const draft = window[meta.draftStateKey];

        if (draft && draft._adminLockedRubric) {
            if (typeof window.showToast === 'function') {
                window.showToast('This rubric was set by the admin and cannot be deleted.', 'error');
            }
            return;
        }

        if (draft) {
            const effectiveId = draft._targetId;
            const targetKeys = (draft.pendingMaterialIds && draft.pendingMaterialIds.length > 0)
                ? draft.pendingMaterialIds.map(String)
                : (effectiveId ? [String(effectiveId)] : (draft._targetTitle ? [String(draft._targetTitle)] : []));
            if (targetKeys.length === 0 && effectiveId) targetKeys.push(String(effectiveId));
            if (targetKeys.length === 0 && draft._targetTitle) targetKeys.push(String(draft._targetTitle));
            targetKeys.forEach(k => {
                if (draft.assessmentRubrics) delete draft.assessmentRubrics[k];
                if (draft.assessmentRubricUrls) delete draft.assessmentRubricUrls[k];
                if (draft.assessmentRubricFiles) delete draft.assessmentRubricFiles[k];
            });
            delete draft._uploadedRubricName;
            delete draft._uploadedRubricUrl;
            delete draft._uploadedRubricFile;
            draft._rubricDeleted = true;
        }

        const fileInp = document.getElementById('teacher-rubric-file-input');
        if (fileInp) fileInp.value = '';

        const container = document.getElementById('teacher-rubric-status-content');
        if (container) {
            container.innerHTML = `
                <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-amber-50/80 border border-dashed border-amber-300 rounded-xl">
                    <div class="flex items-center gap-2.5 min-w-0">
                        <i class="fa-solid fa-triangle-exclamation text-amber-600 text-base shrink-0"></i>
                        <div>
                            <div class="text-xs font-bold text-amber-900" id="teacher-rubric-file-label">Rubric Required by SIGMA AI</div>
                            <p class="text-[11px] text-amber-700 font-medium leading-tight mt-0.5">Upload a grading rubric (.pdf, .docx, .txt) on this screen. The file is saved with this release.</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                        <button type="button" onclick="document.getElementById('teacher-rubric-file-input')?.click()" class="px-3.5 py-1.5 text-xs font-bold text-white bg-[#15803d] hover:bg-[#166534] rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm">
                            <i class="fa-solid fa-upload text-xs"></i> Upload Rubric
                        </button>
                    </div>
                </div>
            `;
        }

        window.cacheActiveAssessmentGradingSettings?.();
        window.validateTeacherScheduleInputs?.(category, false);
    };

    window.toggleTeacherCriteriaAiAuto = function (isAuto) {
        const grid = document.getElementById('teacher-criteria-categories-grid');
        if (!grid) return;
        const labels = grid.querySelectorAll('.teacher-criteria-category-item');
        const checkboxes = grid.querySelectorAll('input[name="teacher_selected_criteria"]');
        
        checkboxes.forEach(cb => {
            cb.disabled = isAuto;
            if (isAuto) {
                cb.checked = true;
            }
        });

        labels.forEach(lbl => {
            if (isAuto) {
                lbl.className = 'teacher-criteria-category-item flex items-start gap-2.5 p-3 rounded-xl border transition-all bg-slate-100/80 border-slate-200 opacity-60 cursor-not-allowed select-none';
            } else {
                lbl.className = 'teacher-criteria-category-item flex items-start gap-2.5 p-3 rounded-xl border transition-all bg-white border-slate-200 hover:border-slate-300 cursor-pointer select-none';
            }
        });

        window.cacheActiveAssessmentGradingSettings?.();

        // If teacher unchecks Auto-Select to manually pick criteria, smoothly scroll categories grid into view
        if (!isAuto) {
            requestAnimationFrame(() => {
                setTimeout(() => {
                    const scrollContainer = document.getElementById('teacher-schedule-modal-body');
                    if (scrollContainer && grid) {
                        const targetTop = grid.getBoundingClientRect().top;
                        const containerTop = scrollContainer.getBoundingClientRect().top;
                        const scrollOffset = targetTop - containerTop + scrollContainer.scrollTop - 16;
                        scrollContainer.scrollTo({
                            top: Math.max(0, scrollOffset),
                            behavior: 'smooth'
                        });
                    }
                }, 50);
            });
        }
    };

    window.toggleTeacherScheduleNoDeadline = function (isChecked, category = 'topics') {
        const dueBox = document.getElementById('teacher-schedule-due-datetime-box');
        const endDateInput = document.getElementById('teacher-exact-end-date-input');
        const endTimeInput = document.getElementById('teacher-end-time-input');
        const endDateBox = document.getElementById('teacher-due-date-box');
        const endTimeBox = document.getElementById('teacher-end-time-panel-box');
        const beginDateInput = document.getElementById('teacher-exact-date-input');

        if (dueBox) {
            if (isChecked) {
                dueBox.classList.add('opacity-40', 'pointer-events-none');
                window.closeTeacherScheduleTimePopover?.();
            } else {
                dueBox.classList.remove('opacity-40', 'pointer-events-none');
                if (endDateInput && !endDateInput.value) {
                    const todayStr = new Date().toISOString().split('T')[0];
                    endDateInput.value = beginDateInput?.value || todayStr;
                }
                if (endTimeInput && (!endTimeInput.value || endTimeInput.value === '')) {
                    endTimeInput.value = '--:-- --';
                }
            }
        }
        if (endDateInput) {
            endDateInput.readOnly = isChecked;
            endDateInput.tabIndex = isChecked ? -1 : 0;
            if (isChecked) {
                endDateInput.classList.remove('text-black');
                endDateInput.classList.add('text-black-fade');
            } else {
                endDateInput.classList.remove('text-black-fade');
                endDateInput.classList.add('text-black');
            }
        }
        if (endTimeInput) {
            endTimeInput.readOnly = isChecked;
            endTimeInput.tabIndex = isChecked ? -1 : 0;
            if (isChecked) {
                endTimeInput.classList.remove('text-black');
                endTimeInput.classList.add('text-black-fade');
            } else {
                endTimeInput.classList.remove('text-black-fade');
                endTimeInput.classList.add('text-black');
            }
        }
        if (endDateBox) {
            if (isChecked) {
                endDateBox.classList.remove('bg-white', 'border-slate-200');
                endDateBox.classList.add('bg-black/[0.03]', 'border-black/10');
            } else {
                endDateBox.classList.remove('bg-black/[0.03]', 'border-black/10');
                endDateBox.classList.add('bg-white', 'border-slate-200');
            }
        }
        if (endTimeBox) {
            if (isChecked) {
                endTimeBox.classList.remove('bg-white', 'border-slate-200');
                endTimeBox.classList.add('bg-black/[0.03]', 'border-black/10');
            } else {
                endTimeBox.classList.remove('bg-black/[0.03]', 'border-black/10');
                endTimeBox.classList.add('bg-white', 'border-slate-200');
            }
        }
        window.cacheActiveAssessmentGradingSettings?.();
        window.validateTeacherScheduleInputs?.(category);
    };

    window.handleTeacherTimePanelInput = function (val, target = 'begin') {
        if (!val || val === '--:-- --') return;
        const match = String(val).match(/(\d{1,2})(?:[:.](\d{0,2}))?(?:\s*([AP]M)?)?/i);
        if (match) {
            let h = parseInt(match[1], 10);
            let m = match[2] !== undefined && match[2] !== '' ? parseInt(match[2], 10) : 0;
            let p = match[3] ? match[3].toUpperCase() : undefined;
            if (!isNaN(h)) {
                if (h > 12) {
                    p = 'PM';
                    h -= 12;
                } else if (h === 0) {
                    h = 12;
                }
                if (m > 59) m = 59;
                const instance = target === 'end' ? window._teacherScheduleEndTimePickerInstance : window._teacherScheduleTimePickerInstance;
                if (instance) {
                    instance.setTime(h, m, p);
                }
            }
        }
    };

    window.formatTeacherTimePanelInput = function (input, target = 'begin') {
        if (!input) return;
        const val = input.value.trim();
        if (!val || val === '--:-- --') {
            input.value = '--:-- --';
            return;
        }
        const instance = target === 'end' ? window._teacherScheduleEndTimePickerInstance : window._teacherScheduleTimePickerInstance;
        if (instance) {
            const t = instance.getTime();
            input.value = t.time12;
        }
    };

    window.toggleTeacherScheduleTimePopover = function (e, target = 'begin') {
        if (e) e.stopPropagation();
        let popover = document.getElementById('teacher-time-dial-popover');
        if (!popover) {
            popover = document.createElement('div');
            popover.id = 'teacher-time-dial-popover';
            popover.style.cssText = 'position: fixed; z-index: 999999; width: 194px; background: #ffffff; border-radius: 0; border: 1px solid #cbd5e1; padding: 0.55rem; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15); display: none; flex-direction: column; align-items: center;';
            popover.innerHTML = `
                <div id="teacher-time-dial-mount" style="width: 100%; display: flex; justify-content: center;"></div>
                <div style="margin-top: 0.45rem; width: 100%; display: flex; align-items: center; gap: 0.35rem;">
                    <button type="button" onclick="window.clearTeacherScheduleTime?.(event)" 
                        style="flex: 1; padding: 0.32rem 0.5rem; background: #ffffff; color: #000000; font-size: 11px; font-weight: 700; border-radius: 6px; border: 1px solid #cbd5e1; cursor: pointer; transition: all 0.15s ease;"
                        onmouseenter="this.style.backgroundColor='#f1f5f9'"
                        onmouseleave="this.style.backgroundColor='#ffffff'">
                        Clear
                    </button>
                    <button type="button" onclick="window.closeTeacherScheduleTimePopover?.(event)" 
                        style="flex: 1; padding: 0.32rem 0.5rem; background: #f1f5f9; color: #000000; font-size: 11px; font-weight: 700; border-radius: 6px; border: 1px solid #cbd5e1; cursor: pointer; transition: all 0.15s ease;"
                        onmouseenter="this.style.backgroundColor='#e2e8f0'"
                        onmouseleave="this.style.backgroundColor='#f1f5f9'">
                        Done
                    </button>
                </div>
            `;
            popover.addEventListener('click', (ev) => ev.stopPropagation());
            document.body.appendChild(popover);

            window.addEventListener('click', () => {
                const p = document.getElementById('teacher-time-dial-popover');
                if (p && p.style.display !== 'none') {
                    window.closeTeacherScheduleTimePopover();
                }
            });
        }

        const currentTarget = popover.dataset.target;
        const isHidden = popover.style.display === 'none' || popover.style.display === '' || currentTarget !== target;
        popover.dataset.target = target;

        const inputId = target === 'end' ? 'teacher-end-time-input' : 'teacher-time-input';
        const panelId = target === 'end' ? 'teacher-end-time-panel-box' : 'teacher-time-panel-box';
        const iconBtnId = target === 'end' ? 'teacher-end-time-icon-btn' : 'teacher-time-icon-btn';

        const beginIconBtn = document.getElementById('teacher-time-icon-btn');
        const endIconBtn = document.getElementById('teacher-end-time-icon-btn');
        if (beginIconBtn) {
            beginIconBtn.dataset.active = 'false';
            beginIconBtn.style.backgroundColor = 'transparent';
            beginIconBtn.style.color = 'rgba(0, 0, 0, 0.45)';
        }
        if (endIconBtn) {
            endIconBtn.dataset.active = 'false';
            endIconBtn.style.backgroundColor = 'transparent';
            endIconBtn.style.color = 'rgba(0, 0, 0, 0.45)';
        }

        const iconBtn = document.getElementById(iconBtnId);
        if (isHidden) {
            popover.style.display = 'flex';
            if (iconBtn) {
                iconBtn.dataset.active = 'true';
                iconBtn.style.backgroundColor = '#e2e8f0';
                iconBtn.style.color = 'rgba(0, 0, 0, 0.45)';
            }
            const anchor = document.getElementById(panelId) || iconBtn;
            if (anchor) {
                const rect = anchor.getBoundingClientRect();
                const popoverHeight = popover.offsetHeight || 215;
                let top = Math.round(rect.bottom - 1);
                let left = Math.round(rect.right - 194);
                if (left < 10) left = 10;
                if (left + 194 > window.innerWidth - 10) {
                    left = window.innerWidth - 204;
                }
                if (top + popoverHeight > window.innerHeight - 8 && rect.top > popoverHeight + 8) {
                    top = Math.round(rect.top - popoverHeight + 1);
                }
                popover.style.top = `${top}px`;
                popover.style.left = `${left}px`;
            }

            const mount = document.getElementById('teacher-time-dial-mount');
            if (mount && typeof window.createCircularTimePicker === 'function') {
                mount.innerHTML = '';
                const curVal = document.getElementById(inputId)?.value;
                const pickerInstance = window.createCircularTimePicker(mount, {
                    initialTime: (curVal && curVal !== '--:-- --') ? curVal : null,
                    onChange: (t) => {
                        const inp = document.getElementById(inputId);
                        if (inp) inp.value = t.time12;
                        const modalOverlay = document.getElementById('teacher-topic-schedule-overlay');
                        const cat = modalOverlay?.dataset?._category || 'topics';
                        window.validateTeacherScheduleInputs?.(cat);
                    }
                });
                if (target === 'end') {
                    window._teacherScheduleEndTimePickerInstance = pickerInstance;
                } else {
                    window._teacherScheduleTimePickerInstance = pickerInstance;
                }
            }
        } else {
            popover.style.display = 'none';
        }
    };

    window.clearTeacherScheduleTime = function (e) {
        if (e) e.stopPropagation();
        const popover = document.getElementById('teacher-time-dial-popover');
        const target = popover?.dataset?.target || 'begin';
        const inputId = target === 'end' ? 'teacher-end-time-input' : 'teacher-time-input';
        const inp = document.getElementById(inputId);
        if (inp) {
            inp.value = '--:-- --';
        }
        const instance = target === 'end' ? window._teacherScheduleEndTimePickerInstance : window._teacherScheduleTimePickerInstance;
        if (instance?.reset) {
            instance.reset();
        } else if (instance?.setTime) {
            const now = new Date();
            let rawH = now.getHours();
            let m = now.getMinutes();
            let p = rawH >= 12 ? 'PM' : 'AM';
            let h = rawH % 12 || 12;
            instance.setTime(h, m, p, true);
            instance?.unselect?.();
        }
        const modalOverlay = document.getElementById('teacher-topic-schedule-overlay');
        const cat = modalOverlay?.dataset?._category || 'topics';
        window.validateTeacherScheduleInputs?.(cat);
    };

    window.closeTeacherScheduleTimePopover = function (e) {
        if (e) e.stopPropagation();
        const popover = document.getElementById('teacher-time-dial-popover');
        if (popover) popover.style.display = 'none';
        const beginIconBtn = document.getElementById('teacher-time-icon-btn');
        const endIconBtn = document.getElementById('teacher-end-time-icon-btn');
        if (beginIconBtn) {
            beginIconBtn.dataset.active = 'false';
            beginIconBtn.style.backgroundColor = 'transparent';
            beginIconBtn.style.color = 'rgba(0, 0, 0, 0.45)';
        }
        if (endIconBtn) {
            endIconBtn.dataset.active = 'false';
            endIconBtn.style.backgroundColor = 'transparent';
            endIconBtn.style.color = 'rgba(0, 0, 0, 0.45)';
        }
        const modalOverlay = document.getElementById('teacher-topic-schedule-overlay');
        const cat = modalOverlay?.dataset?._category || 'topics';
        window.validateTeacherScheduleInputs?.(cat);
    };

    window.clearTeacherUnifiedSchedule = function (category = 'topics') {
        const meta = window.getUnifiedScheduleMeta(category);
        const draft = window[meta.draftStateKey] || {};
        const targetId = draft._targetId;
        if (draft[meta.scheduleKey]) {
            if (targetId) {
                delete draft[meta.scheduleKey][targetId];
            } else {
                draft[meta.scheduleKey] = {};
            }
        }
        if (draft[meta.endScheduleKey]) {
            if (targetId) {
                delete draft[meta.endScheduleKey][targetId];
            } else {
                draft[meta.endScheduleKey] = {};
            }
        }
        draft.startTime = '';
        draft.endTime = '';
        window.closeTeacherUnifiedScheduleModal?.(true, category);
    };

    window.clearTeacherTopicSchedule = function () {
        window.clearTeacherUnifiedSchedule('topics');
    };

    window.backFromTeacherScheduleModal = function (category, event) {
        if (event && event.preventDefault) {
            event.preventDefault();
            event.stopPropagation();
        }
        const fromPopstate = window._isProcessingPopstate === true;
        if (!fromPopstate) {
            window._isProcessingBack = true;
            window._isProcessingPopstate = true;
        }
        try {
            try { window.closeTeacherScheduleTimePopover?.(); } catch (e) {}
            const overlay = document.getElementById('teacher-topic-schedule-overlay');
            const effectiveCategory = category || overlay?.dataset?._category || 'topics';
            const meta = (typeof window.getUnifiedScheduleMeta === 'function')
                ? window.getUnifiedScheduleMeta(effectiveCategory)
                : null;
            const draft = meta?.draftStateKey ? window[meta.draftStateKey] : null;
            const editType = overlay?.dataset?._editType || draft?._editType || '';
            const pendingIds = (draft && meta && Array.isArray(draft[meta.pendingKey])) ? draft[meta.pendingKey].slice() : [];
            const isEdit = editType === 'schedule' || editType === 'grading' || editType === 'edit';
            const isPickerFlow = !isEdit && Boolean(draft && (draft._isPickerFlow || pendingIds.length > 0));

            if (meta?.draftStateKey) {
                if (isPickerFlow) {
                    window[meta.draftStateKey] = {
                        [meta.pendingKey]: pendingIds,
                        _isPickerFlow: true,
                        _subjectId: draft._subjectId || '',
                        _section: draft._section || ''
                    };
                } else {
                    window[meta.draftStateKey] = null;
                }
            }

            const reveal = (el) => {
                if (!el) return false;
                el.classList.remove('hidden');
                el.style.display = '';
                el.classList.add('curriculum-hub-overlay--visible');
                return true;
            };

            if (isPickerFlow) {
                if (window._unifiedPickerSelection) window.openTeacherTopicsAndMaterialsPickerModal?.();
                else if (effectiveCategory === 'learning') window.openTeacherLearningMaterialsPickerModal?.();
                else if (effectiveCategory === 'assessments') window.openTeacherAssessmentsPickerModal?.();
                else window.openTeacherTopicPickerModal?.();
            } else if (effectiveCategory === 'learning') {
                if (!reveal(document.getElementById('teacher-release-learning-materials-overlay'))) {
                    window.openTeacherReleaseLearningMaterialsModal?.(true);
                }
            } else if (effectiveCategory === 'assessments') {
                if (!reveal(document.getElementById('teacher-release-assessments-overlay'))) {
                    window.openTeacherReleaseAssessmentsModal?.(true);
                }
            } else if (!reveal(document.getElementById('teacher-release-topics-overlay'))) {
                window.openTeacherReleaseTopicsModal?.(true);
            }

            const pickerId = window._unifiedPickerSelection
                ? 'teacher-topics-materials-picker-overlay'
                : (effectiveCategory === 'learning'
                    ? 'teacher-learning-picker-overlay'
                    : (effectiveCategory === 'assessments' ? 'teacher-assessments-picker-overlay' : 'teacher-topic-picker-overlay'));
            const releaseId = effectiveCategory === 'learning'
                ? 'teacher-release-learning-materials-overlay'
                : (effectiveCategory === 'assessments' ? 'teacher-release-assessments-overlay' : 'teacher-release-topics-overlay');
            reveal(document.getElementById(isPickerFlow ? pickerId : releaseId));
            if (overlay && overlay.isConnected) overlay.remove();
        } catch (err) {
            console.error('[backFromTeacherScheduleModal]', err);
            const scheduleOverlay = document.getElementById('teacher-topic-schedule-overlay');
            if (scheduleOverlay) scheduleOverlay.remove();
            const release = document.getElementById('teacher-release-assessments-overlay')
                || document.getElementById('teacher-release-topics-overlay')
                || document.getElementById('teacher-release-learning-materials-overlay');
            if (release) {
                release.classList.remove('hidden');
                release.style.display = '';
                release.classList.add('curriculum-hub-overlay--visible');
            }
        } finally {
            if (!fromPopstate) {
                setTimeout(() => {
                    window._isProcessingBack = false;
                    window._isProcessingPopstate = false;
                }, 180);
            }
        }
    };

    window.closeTeacherUnifiedScheduleModal = function (returnToReleaseModal = false, category = 'topics') {
        if (returnToReleaseModal) {
            window.backFromTeacherScheduleModal(category);
            return;
        }
        try {
            window.closeTeacherScheduleTimePopover?.();
            const overlay = document.getElementById('teacher-topic-schedule-overlay');
            const effectiveCategory = category || overlay?.dataset?._category || 'topics';
            if (overlay) overlay.remove();

            const meta = window.getUnifiedScheduleMeta(effectiveCategory);
            const draft = meta?.draftStateKey ? window[meta.draftStateKey] : null;
            const isPickerFlow = Boolean(draft && (draft._isPickerFlow || (!draft._targetId && draft._editType !== 'schedule' && draft._editType !== 'grading' && draft._editType !== 'edit')));
            const existingPendingIds = (draft && Array.isArray(draft[meta.pendingKey]))
                ? [...draft[meta.pendingKey]]
                : [];

            // Discard uncommitted schedule/grading configs while preserving pending selected items if returning to picker modal
            if (meta?.draftStateKey) {
                if (returnToReleaseModal && isPickerFlow && existingPendingIds.length > 0) {
                    window[meta.draftStateKey] = {
                        [meta.pendingKey]: existingPendingIds,
                        _isPickerFlow: true
                    };
                } else {
                    window[meta.draftStateKey] = null;
                }
            }

            if (returnToReleaseModal) {
                if (isPickerFlow) {
                    if (effectiveCategory === 'learning') {
                        if (typeof window.openTeacherLearningMaterialsPickerModal === 'function') {
                            window.openTeacherLearningMaterialsPickerModal();
                        } else {
                            window.openTeacherReleaseLearningMaterialsModal?.(true);
                        }
                    } else if (effectiveCategory === 'assessments') {
                        if (typeof window.openTeacherAssessmentsPickerModal === 'function') {
                            window.openTeacherAssessmentsPickerModal();
                        } else {
                            window.openTeacherReleaseAssessmentsModal?.(true);
                        }
                    } else {
                        if (typeof window.openTeacherTopicPickerModal === 'function') {
                            window.openTeacherTopicPickerModal();
                        } else {
                            window.openTeacherReleaseTopicsModal?.(true);
                        }
                    }
                } else {
                    if (effectiveCategory === 'learning') {
                        const prev = document.getElementById('teacher-release-learning-materials-overlay');
                        if (prev) {
                            prev.classList.remove('hidden');
                            prev.style.display = '';
                            prev.classList.add('curriculum-hub-overlay--visible');
                        } else {
                            window.openTeacherReleaseLearningMaterialsModal?.(true);
                        }
                    } else if (effectiveCategory === 'assessments') {
                        const prev = document.getElementById('teacher-release-assessments-overlay');
                        if (prev) {
                            prev.classList.remove('hidden');
                            prev.style.display = '';
                            prev.classList.add('curriculum-hub-overlay--visible');
                        } else {
                            window.openTeacherReleaseAssessmentsModal?.(true);
                        }
                    } else {
                        const prev = document.getElementById('teacher-release-topics-overlay');
                        if (prev) {
                            prev.classList.remove('hidden');
                            prev.style.display = '';
                            prev.classList.add('curriculum-hub-overlay--visible');
                        } else {
                            window.openTeacherReleaseTopicsModal?.(true);
                        }
                    }
                }
            } else {
                window.closeManageCurriculumHub?.();
                document.querySelectorAll('#curriculum-hub-overlay, #teacher-release-topics-overlay, #teacher-topic-picker-overlay, #teacher-topic-schedule-overlay, #teacher-release-learning-materials-overlay, #teacher-learning-picker-overlay, #teacher-release-assessments-overlay, #teacher-assessments-picker-overlay').forEach(el => el.remove());
                if (typeof window.unlockBodyScroll === 'function') window.unlockBodyScroll();
            }
        } catch (err) {
            console.error('[closeTeacherUnifiedScheduleModal] Error:', err);
            const overlay = document.getElementById('teacher-topic-schedule-overlay');
            if (overlay) overlay.remove();
        }
    };

    window.closeTeacherTopicScheduleModal = function (returnToReleaseModal = false) {
        const overlay = document.getElementById('teacher-topic-schedule-overlay');
        const category = overlay?.dataset?._category || 'topics';
        window.closeTeacherUnifiedScheduleModal(returnToReleaseModal, category);
    };

    window.saveTeacherUnifiedSchedule = function (category = 'topics') {
        if (typeof window.cacheActiveAssessmentGradingSettings === 'function') {
            window.cacheActiveAssessmentGradingSettings();
        }

        if (typeof window.validateTeacherScheduleInputs === 'function' && !window.validateTeacherScheduleInputs(category, true)) {
            return;
        }

        window.closeTeacherScheduleTimePopover?.();

        const meta = window.getUnifiedScheduleMeta(category);
        let draft = window[meta?.draftStateKey];
        const subjectId = (typeof resolveTeacherActiveSubjectId === 'function')
            ? resolveTeacherActiveSubjectId(draft?._subjectId || (typeof currentTopicState !== 'undefined' ? currentTopicState?.subjectId : null) || window.currentTopicState?.subjectId || window.currentSubjectState?.id)
            : (draft?._subjectId || (typeof currentTopicState !== 'undefined' ? currentTopicState?.subjectId : null) || window.currentTopicState?.subjectId || window.currentSubjectState?.id || 'card-prog1');
        const section = (typeof resolveTeacherActiveSection === 'function')
            ? resolveTeacherActiveSection(draft?._section || (typeof currentTopicState !== 'undefined' ? currentTopicState?.selectedSection : null) || window.currentTopicState?.selectedSection)
            : (draft?._section || (typeof currentTopicState !== 'undefined' ? currentTopicState?.selectedSection : null) || window.currentTopicState?.selectedSection || '');
        const cleanId = String(subjectId || '').replace(/^(card-|subj-)/, '').trim().toLowerCase();

        // Get current saved config
        let saved = null;
        if (category === 'topics' && typeof window.getTopicReleaseConfig === 'function') {
            saved = window.getTopicReleaseConfig(subjectId, section);
        } else if (category === 'learning' && typeof window.getLearningMaterialReleaseConfig === 'function') {
            saved = window.getLearningMaterialReleaseConfig(subjectId, section);
        } else if (category === 'assessments' && typeof window.getAssessmentReleaseConfig === 'function') {
            saved = window.getAssessmentReleaseConfig(subjectId, section);
        }
        if (!saved) {
            try {
                saved = getStoredJson(`${meta.storagePrefix}_${subjectId}_${section}`, null);
            } catch (e) {}
        }

        const convertTimeTo24HourHelper = (timeStr, defaultTime = '00:00') => {
            if (!timeStr || timeStr === '--:-- --' || timeStr === 'none') return defaultTime;
            const str = String(timeStr).trim();
            if (/^\d{1,2}:\d{2}$/.test(str)) {
                const [h, m] = str.split(':');
                return `${String(parseInt(h, 10)).padStart(2, '0')}:${String(parseInt(m, 10)).padStart(2, '0')}`;
            }
            const match = str.match(/(\d{1,2})(?:[:.](\d{0,2}))?(?:\s*([AP]M)?)?/i);
            if (!match) return defaultTime;
            let h = parseInt(match[1], 10) || 0;
            let m = match[2] !== undefined && match[2] !== '' ? parseInt(match[2], 10) : 0;
            let p = match[3] ? match[3].toUpperCase() : '';
            if (p === 'PM' && h < 12) h += 12;
            if (p === 'AM' && h === 12) h = 0;
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        };

        const releaseNowChk = document.getElementById('teacher-schedule-release-now-chk');
        const dateInput = document.getElementById('teacher-exact-date-input');
        const timeInput = document.getElementById('teacher-time-input');

        let val = '';
        if (releaseNowChk || dateInput) {
            const isReleaseNow = releaseNowChk ? releaseNowChk.checked : false;
            if (!isReleaseNow && dateInput && dateInput.value) {
                let dateVal = dateInput.value.trim();
                const today = new Date();
                const todayDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                if (dateVal && dateVal < todayDateStr) {
                    dateVal = todayDateStr;
                    if (dateInput) dateInput.value = todayDateStr;
                }
                const time24 = convertTimeTo24HourHelper(timeInput?.value, '00:00');
                val = `${dateVal}T${time24}`;
            } else {
                val = 'now';
            }
            draft._scheduleStartVal = val;
        } else {
            val = (draft._scheduleStartVal !== undefined)
                ? draft._scheduleStartVal
                : (draft[meta.scheduleKey]?.[draft._targetId] !== undefined ? draft[meta.scheduleKey][draft._targetId] : (saved?.[meta.scheduleKey]?.[draft._targetId] || 'now'));
        }

        // Due Date & Time
        const noDeadlineChk = document.getElementById('teacher-schedule-no-deadline-chk');
        const endDateInput = document.getElementById('teacher-exact-end-date-input');
        const endTimeInput = document.getElementById('teacher-end-time-input');

        let endVal = '';
        if (noDeadlineChk || endDateInput) {
            const isNoDeadline = noDeadlineChk ? noDeadlineChk.checked : false;
            if (!isNoDeadline && endDateInput && endDateInput.value) {
                const endDateVal = endDateInput.value.trim();
                const endTime24 = convertTimeTo24HourHelper(endTimeInput?.value, '23:59');
                endVal = `${endDateVal}T${endTime24}`;
            } else {
                endVal = '';
            }
            draft._scheduleEndVal = endVal;
        } else {
            endVal = (draft._scheduleEndVal !== undefined)
                ? draft._scheduleEndVal
                : (draft[meta.endScheduleKey]?.[draft._targetId] !== undefined ? draft[meta.endScheduleKey][draft._targetId] : (saved?.[meta.endScheduleKey]?.[draft._targetId] || saved?.assessmentEndSchedules?.[draft._targetId] || saved?.materialEndSchedules?.[draft._targetId] || ''));
        }

        let config = {
            publishAll: true,
            [meta.releasedIdKey]: (saved && Array.isArray(saved[meta.releasedIdKey])) ? [...saved[meta.releasedIdKey]] : [],
            [meta.hiddenIdKey]: (saved && Array.isArray(saved[meta.hiddenIdKey])) ? [...saved[meta.hiddenIdKey]] : [],
            [meta.scheduleKey]: (saved && saved[meta.scheduleKey] && typeof saved[meta.scheduleKey] === 'object') ? { ...saved[meta.scheduleKey] } : {},
            [meta.endScheduleKey]: (saved && saved[meta.endScheduleKey] && typeof saved[meta.endScheduleKey] === 'object') ? { ...saved[meta.endScheduleKey] } : {},
            [meta.releaseDateKey]: (saved && saved[meta.releaseDateKey] && typeof saved[meta.releaseDateKey] === 'object') ? { ...saved[meta.releaseDateKey] } : {},
            releaseStartTime: saved?.releaseStartTime || '',
            releaseEndTime: saved?.releaseEndTime || '',
            updatedAt: new Date().toISOString()
        };

        let maxScoreVal = 100;
        let weightVal = 50;
        let activityComponentVal = 'pt';
        let maxAttemptsVal = 1;
        let latePermVal = true;
        let gradingModeVal = 'auto';

        if (category === 'assessments') {
            const maxScoreInput = document.getElementById('teacher-schedule-max-score');
            const weightInput = document.getElementById('teacher-schedule-weight');
            const activityComponentSelect = document.getElementById('teacher-schedule-activity-component');
            const maxAttemptsInput = document.getElementById('teacher-schedule-max-attempts');
            const latePermChk = document.getElementById('teacher-schedule-late-permission');
            const gradingModeInput = document.getElementById('teacher-schedule-grading-mode');
            if (maxScoreInput) maxScoreVal = Math.max(1, parseInt(maxScoreInput.value, 10) || 100);
            if (weightInput) {
                const rawW = weightInput.value.trim();
                weightVal = rawW === '' ? '' : (parseInt(rawW, 10) || '');
            }
            if (activityComponentSelect && activityComponentSelect.value) activityComponentVal = activityComponentSelect.value;
            if (maxAttemptsInput) maxAttemptsVal = Math.max(1, parseInt(maxAttemptsInput.value, 10) || 1);
            if (latePermChk) latePermVal = latePermChk.checked;
            if (gradingModeInput && gradingModeInput.value) gradingModeVal = gradingModeInput.value;

            config.assessmentMaxScores = { ...(saved?.assessmentMaxScores || {}) };
            config.assessmentWeights = { ...(saved?.assessmentWeights || {}) };
            config.assessmentActivityComponents = { ...(saved?.assessmentActivityComponents || {}) };
            config.assessmentMaxAttempts = { ...(saved?.assessmentMaxAttempts || {}) };
            config.assessmentLatePermissions = { ...(saved?.assessmentLatePermissions || {}) };
            config.assessmentHasTimers = { ...(saved?.assessmentHasTimers || {}) };
            config.assessmentTimeLimits = { ...(saved?.assessmentTimeLimits || {}) };
            config.assessmentTimeLimitMinutes = { ...(saved?.assessmentTimeLimitMinutes || {}) };
            config.assessmentGradingModes = { ...(saved?.assessmentGradingModes || {}) };
            config.assessmentCriteriaAiAuto = { ...(saved?.assessmentCriteriaAiAuto || {}) };
            config.assessmentSelectedCriteria = { ...(saved?.assessmentSelectedCriteria || {}) };

            config.defaultMaxScore = maxScoreVal;
            config.defaultWeight = weightVal;
            config.defaultActivityComponent = activityComponentVal;
            config.defaultMaxAttempts = maxAttemptsVal;
            config.defaultLatePermission = latePermVal;
            config.defaultGradingMode = gradingModeVal;
        }

        // Cache current item inputs into draft first before committing
        if (typeof window.cacheActiveAssessmentGradingSettings === 'function') {
            window.cacheActiveAssessmentGradingSettings();
        }

        draft = window[meta.draftStateKey] || draft || {};
        const pendingIds = draft[meta.pendingKey] || [];
        const targetId = draft._targetId;

        const applyAllChk = document.getElementById('teacher-schedule-apply-all-chk');
        const isApplyAll = applyAllChk ? applyAllChk.checked : (draft._applyAll !== false);

        const targetIds = pendingIds.length > 0
            ? pendingIds
            : (targetId ? [targetId] : config[meta.releasedIdKey]);

        if (!config.assignedStudents) config.assignedStudents = { ...(saved?.assignedStudents || {}) };

        // Preload student roster ONCE before iterating targetIds
        const effFallbackAssigned = draft.assignedStudents?.[draft._targetId] || (pendingIds.length > 0 ? draft.assignedStudents?.[pendingIds[0]] : null);
        const allSecStudents = (typeof window.getStudentsForSection === 'function')
            ? window.getStudentsForSection(section, subjectId, false)
            : (typeof getStudentsForSection === 'function' ? getStudentsForSection(section, subjectId, false) : []);
        const defaultChosenStudentIds = allSecStudents.map(s => String(s.id || s.studentId || s.name || s.fullName));

        // Preload topics catalog ONCE before iterating targetIds if category === 'topics'
        let cachedTopicsForSave = [];
        if (category === 'topics') {
            cachedTopicsForSave = (typeof getTeacherAllSubjectTopics === 'function')
                ? getTeacherAllSubjectTopics(subjectId, section)
                : [];
            if (!cachedTopicsForSave.length) {
                const data = subjectId ? (typeof getTopicData === 'function' ? getTopicData(subjectId) : null) : null;
                if (data && Array.isArray(data.q1Topics) && data.q1Topics.length > 0) cachedTopicsForSave = [...data.q1Topics];
                else if (data && Array.isArray(data.topics)) cachedTopicsForSave = [...data.topics];
            }
        }

        // Preload assessments and materials catalogs ONCE before iterating targetIds
        const cachedAssessmentsForSave = (category === 'assessments')
            ? ((typeof window.getTeacherSubjectAssessments === 'function') ? window.getTeacherSubjectAssessments(subjectId, section) : [])
            : [];
        const cachedMaterialsForSave = (category === 'learning')
            ? ((typeof window.getTeacherSubjectLearningMaterials === 'function') ? window.getTeacherSubjectLearningMaterials(subjectId, section) : [])
            : [];

        const secStudentMap = new Map();
        allSecStudents.forEach(s => {
            const sId = String(s.id || s.studentId || s.uid || '').trim().toLowerCase();
            const sName = String(s.name || s.fullName || '').trim().toLowerCase();
            const sRev = `${String(s.lastName || '').trim()}, ${String(s.firstName || '').trim()}`.toLowerCase();
            if (sId) secStudentMap.set(sId, s);
            if (sName) secStudentMap.set(sName, s);
            if (sRev) secStudentMap.set(sRev, s);
        });

        targetIds.forEach(id => {
            const idStr = String(id);
            try {
            if (!config[meta.releasedIdKey].map(String).includes(idStr)) {
                config[meta.releasedIdKey].push(idStr);
            }

            const isCurrentActive = (String(id) === String(draft._targetId) || (targetIds.length === 1));

            // Schedule start
            let itemStartVal = 'now';
            if (val) {
                itemStartVal = isApplyAll ? val : (isCurrentActive ? val : (draft[meta.scheduleKey]?.[idStr] || 'now'));
            } else if (draft[meta.scheduleKey]?.[idStr] !== undefined) {
                itemStartVal = draft[meta.scheduleKey][idStr];
            } else if (draft._scheduleStartVal !== undefined) {
                itemStartVal = draft._scheduleStartVal;
            } else if (saved?.[meta.scheduleKey]?.[idStr] !== undefined) {
                itemStartVal = saved[meta.scheduleKey][idStr];
            } else {
                itemStartVal = 'now';
            }

            if (itemStartVal && itemStartVal !== 'now') {
                config[meta.scheduleKey][idStr] = itemStartVal;
                config[meta.releaseDateKey][idStr] = itemStartVal;
                if (!config.assessmentSchedules) config.assessmentSchedules = { ...(saved?.assessmentSchedules || {}) };
                config.assessmentSchedules[idStr] = itemStartVal;
                if (!config.materialSchedules) config.materialSchedules = { ...(saved?.materialSchedules || {}) };
                config.materialSchedules[idStr] = itemStartVal;
            } else {
                delete config[meta.scheduleKey][idStr];
                if (config.assessmentSchedules) delete config.assessmentSchedules[idStr];
                if (config.materialSchedules) delete config.materialSchedules[idStr];
                config[meta.releaseDateKey][idStr] = new Date().toISOString();
            }

            // Schedule end (Due Date)
            let itemEndVal = '';
            if (endVal !== '') {
                itemEndVal = isApplyAll ? endVal : (isCurrentActive ? endVal : (draft[meta.endScheduleKey]?.[idStr] || ''));
            } else if (draft[meta.endScheduleKey]?.[idStr] !== undefined) {
                itemEndVal = draft[meta.endScheduleKey][idStr];
            } else if (draft._scheduleEndVal !== undefined) {
                itemEndVal = draft._scheduleEndVal;
            } else if (saved?.[meta.endScheduleKey]?.[idStr] !== undefined) {
                itemEndVal = saved[meta.endScheduleKey][idStr];
            } else if (saved?.assessmentEndSchedules?.[idStr] !== undefined) {
                itemEndVal = saved.assessmentEndSchedules[idStr];
            } else if (saved?.materialEndSchedules?.[idStr] !== undefined) {
                itemEndVal = saved.materialEndSchedules[idStr];
            }

            if (itemEndVal) {
                config[meta.endScheduleKey][idStr] = itemEndVal;
                if (!config.assessmentEndSchedules) config.assessmentEndSchedules = { ...(saved?.assessmentEndSchedules || {}) };
                config.assessmentEndSchedules[idStr] = itemEndVal;
                if (!config.materialEndSchedules) config.materialEndSchedules = { ...(saved?.materialEndSchedules || {}) };
                config.materialEndSchedules[idStr] = itemEndVal;
                if (!config.assessmentDueDates) config.assessmentDueDates = { ...(saved?.assessmentDueDates || {}) };
                config.assessmentDueDates[idStr] = itemEndVal;
            } else {
                delete config[meta.endScheduleKey][idStr];
                if (config.assessmentEndSchedules) delete config.assessmentEndSchedules[idStr];
                if (config.materialEndSchedules) delete config.materialEndSchedules[idStr];
                if (config.assessmentDueDates) delete config.assessmentDueDates[idStr];
            }

            if (category === 'assessments') {
                const allAss = cachedAssessmentsForSave;
                let foundAss = allAss.find(a => String(a.id || a.title || '') === idStr || (a.title && a.title.trim().toLowerCase() === idStr.trim().toLowerCase()));
                if (!foundAss) {
                    try {
                        const data = subjectId ? (typeof getTopicData === 'function' ? getTopicData(subjectId) : null) : null;
                        const topicList = (data && Array.isArray(data.q1Topics)) ? data.q1Topics : ((data && Array.isArray(data.topics)) ? data.topics : []);
                        for (const t of topicList) {
                            if (foundAss) break;
                            for (const arr of [t.quizzes, t.assignments, t.activities, t.materials, t.performanceTasks]) {
                                if (Array.isArray(arr)) {
                                    const hit = arr.find(it => it && (String(it.id || '') === idStr || String(it.title || it.name || '').trim().toLowerCase() === idStr.trim().toLowerCase()));
                                    if (hit) { foundAss = hit; break; }
                                }
                            }
                        }
                    } catch (e) {}
                }

                if (foundAss) {
                    const aliasKeys = [
                        foundAss.id ? String(foundAss.id) : null,
                        foundAss.title ? String(foundAss.title) : null,
                        foundAss.title ? String(foundAss.title).trim().toLowerCase() : null,
                        foundAss.selectedQuizId ? String(foundAss.selectedQuizId) : null,
                        foundAss.quizId ? String(foundAss.quizId) : null,
                        foundAss.materialId ? String(foundAss.materialId) : null
                    ].filter(Boolean);

                    aliasKeys.forEach(aKey => {
                        if (!config[meta.releasedIdKey].map(String).includes(aKey)) {
                            config[meta.releasedIdKey].push(aKey);
                        }
                    });

                    aliasKeys.forEach(aKey => {
                        if (itemEndVal) {
                            config[meta.endScheduleKey][aKey] = itemEndVal;
                            if (config.assessmentEndSchedules) config.assessmentEndSchedules[aKey] = itemEndVal;
                            if (config.materialEndSchedules) config.materialEndSchedules[aKey] = itemEndVal;
                            if (config.assessmentDueDates) config.assessmentDueDates[aKey] = itemEndVal;
                        } else {
                            delete config[meta.endScheduleKey][aKey];
                            if (config.assessmentEndSchedules) delete config.assessmentEndSchedules[aKey];
                            if (config.materialEndSchedules) delete config.materialEndSchedules[aKey];
                            if (config.assessmentDueDates) delete config.assessmentDueDates[aKey];
                        }

                        if (itemStartVal && itemStartVal !== 'now') {
                            config[meta.scheduleKey][aKey] = itemStartVal;
                            config[meta.releaseDateKey][aKey] = itemStartVal;
                            if (config.assessmentSchedules) config.assessmentSchedules[aKey] = itemStartVal;
                            if (config.materialSchedules) config.materialSchedules[aKey] = itemStartVal;
                        } else {
                            delete config[meta.scheduleKey][aKey];
                            if (config.assessmentSchedules) delete config.assessmentSchedules[aKey];
                            if (config.materialSchedules) delete config.materialSchedules[aKey];
                            const releasedStamp = config[meta.releaseDateKey][idStr];
                            if (releasedStamp) config[meta.releaseDateKey][aKey] = releasedStamp;
                        }
                    });
                }
                if (category === 'assessments' && typeof window.collectAssessmentReleaseAliases === 'function') {
                    window.collectAssessmentReleaseAliases(subjectId, section, idStr).forEach(aKey => {
                        if (aKey && !config[meta.releasedIdKey].map(String).includes(String(aKey))) {
                            config[meta.releasedIdKey].push(String(aKey));
                        }
                    });
                }
                if (category === 'assessments' && typeof window.ensureParentTopicReleased === 'function') {
                    window.ensureParentTopicReleased(subjectId, section, idStr);
                    if (foundAss && foundAss.title) window.ensureParentTopicReleased(subjectId, section, foundAss.title);
                }
                const isItemQuiz = idStr.toLowerCase().includes('quiz') || String(foundAss?.title || foundAss?.name || '').toLowerCase().includes('quiz') || ((foundAss?.category || foundAss?.type || '')).toLowerCase().includes('quiz') || foundAss?.isQuiz === true || Boolean(foundAss?.selectedQuizId || foundAss?.quizId || foundAss?.rawItem?.selectedQuizId || foundAss?.rawItem?.quizId) || (Array.isArray(foundAss?.questions) && foundAss.questions.length > 0) || (Array.isArray(foundAss?.quizQuestions) && foundAss.quizQuestions.length > 0) || (foundAss?.rawItem && Array.isArray(foundAss.rawItem.questions) && foundAss.rawItem.questions.length > 0) || (document.getElementById('teacher-topic-schedule-overlay')?.dataset?._isQuiz === 'true' && (String(id) === String(draft._targetId) || targetIds.length === 1));
                const actualQuizRefId = String(foundAss?.selectedQuizId || foundAss?.quizId || foundAss?.rawItem?.selectedQuizId || foundAss?.rawItem?.quizId || '').trim().toLowerCase();
                const isSelfOrMatId = actualQuizRefId.startsWith('assess-') || actualQuizRefId.startsWith('mat-') || actualQuizRefId.startsWith('card-') || actualQuizRefId === idStr.toLowerCase() || actualQuizRefId === String(foundAss?.id || '').trim().toLowerCase();
                const cleanRefId = (!isSelfOrMatId && actualQuizRefId && actualQuizRefId !== 'null' && actualQuizRefId !== 'undefined') ? actualQuizRefId : '';
                const hasExplicitQuestions = Boolean(
                    (Array.isArray(foundAss?.questions) && foundAss.questions.length > 0) ||
                    (Array.isArray(foundAss?.quizQuestions) && foundAss.quizQuestions.length > 0) ||
                    (foundAss?.rawItem && Array.isArray(foundAss.rawItem.questions) && foundAss.rawItem.questions.length > 0)
                );
                const hasItemAttachedQuiz = Boolean(cleanRefId || hasExplicitQuestions);
                const quizAutoHps = (isItemQuiz && hasItemAttachedQuiz && typeof window.findQuizHps === 'function') ? window.findQuizHps(subjectId, idStr, foundAss?.title || '', foundAss) : null;
                const effMaxScore = (isItemQuiz && hasItemAttachedQuiz && quizAutoHps !== null && !isNaN(quizAutoHps) && Number(quizAutoHps) > 0)
                    ? Number(quizAutoHps)
                    : (draft.assessmentMaxScores?.[idStr] !== undefined ? draft.assessmentMaxScores[idStr] : maxScoreVal);

                config.assessmentMaxScores[idStr] = effMaxScore;
                if (foundAss?.id) config.assessmentMaxScores[String(foundAss.id)] = effMaxScore;
                if (foundAss?.title) config.assessmentMaxScores[foundAss.title] = effMaxScore;

                // Synchronize effMaxScore directly to subject topics and materials in storage
                if (effMaxScore && !isNaN(effMaxScore) && effMaxScore > 0) {
                    if (foundAss) {
                        foundAss.max = effMaxScore;
                        foundAss.points = effMaxScore;
                        foundAss.totalPoints = effMaxScore;
                        foundAss.maxScore = effMaxScore;
                        if (foundAss.rawItem) {
                            foundAss.rawItem.max = effMaxScore;
                            foundAss.rawItem.points = effMaxScore;
                            foundAss.rawItem.totalPoints = effMaxScore;
                            foundAss.rawItem.maxScore = effMaxScore;
                        }
                    }
                    if (typeof getAllSubjectsRaw === 'function') {
                        try {
                        const allSubjects = getAllSubjectsRaw();
                        const cleanSubjKey = String(subjectId).trim().toLowerCase();
                        const sub = (Array.isArray(allSubjects) ? allSubjects : []).find(s => 
                            String(s.id || '').toLowerCase() === cleanSubjKey || 
                            String(s.name || '').toLowerCase() === cleanSubjKey ||
                            String(s.title || '').toLowerCase() === cleanSubjKey
                        );
                        if (sub) {
                            const tgtAssId = foundAss?.id || idStr;
                            const tgtAssTitle = foundAss?.title || '';
                            (Array.isArray(sub.topics) ? sub.topics : []).forEach(t => {
                                if (!t || typeof t !== 'object') return;
                                ['assignments', 'quizzes', 'activities', 'performance', 'qa'].forEach(k => {
                                    const bucket = t[k];
                                    if (!Array.isArray(bucket)) return;
                                    bucket.forEach(m => {
                                        if (!m || typeof m !== 'object') return;
                                        if (m.id === tgtAssId || (tgtAssTitle && m.title === tgtAssTitle)) {
                                            m.max = effMaxScore;
                                            m.points = effMaxScore;
                                            m.totalPoints = effMaxScore;
                                            m.maxScore = effMaxScore;
                                            const effComp = isItemQuiz ? 'ww' : (draft.assessmentActivityComponents?.[idStr] || activityComponentVal);
                                            if (effComp) {
                                                m.component = effComp;
                                                m.gradebookComponent = effComp;
                                            }
                                            const effW = isItemQuiz ? ((typeof getSubjectGradebookWeights === 'function' ? getSubjectGradebookWeights(subjectId)?.ww : 25) || 25) : (draft.assessmentWeights?.[idStr] !== undefined ? draft.assessmentWeights[idStr] : weightVal);
                                            if (effW !== undefined && effW !== '') {
                                                m.weight = effW;
                                            }
                                        }
                                    });
                                });
                            });
                            (Array.isArray(sub.materials) ? sub.materials : []).forEach(m => {
                                if (!m || typeof m !== 'object') return;
                                if (m.id === tgtAssId || (tgtAssTitle && m.title === tgtAssTitle)) {
                                    m.max = effMaxScore;
                                    m.points = effMaxScore;
                                    m.totalPoints = effMaxScore;
                                    m.maxScore = effMaxScore;
                                    const effComp = isItemQuiz ? 'ww' : (draft.assessmentActivityComponents?.[idStr] || activityComponentVal);
                                    if (effComp) {
                                        m.component = effComp;
                                        m.gradebookComponent = effComp;
                                    }
                                    const effW = isItemQuiz ? ((typeof getSubjectGradebookWeights === 'function' ? getSubjectGradebookWeights(subjectId)?.ww : 25) || 25) : (draft.assessmentWeights?.[idStr] !== undefined ? draft.assessmentWeights[idStr] : weightVal);
                                    if (effW !== undefined && effW !== '') {
                                        m.weight = effW;
                                    }
                                }
                            });
                            if (typeof saveSubjectsToStorage === 'function') {
                                saveSubjectsToStorage();
                            }
                        }
                        } catch (err) {}
                    }
                    if (typeof clearCategoryDetailsCache === 'function') {
                        clearCategoryDetailsCache();
                    }
                }

                if (isItemQuiz) {
                    const subjWeights = (typeof getSubjectGradebookWeights === 'function')
                        ? getSubjectGradebookWeights(subjectId)
                        : { ww: 25, pt: 50, qa: 25 };
                    config.assessmentWeights[idStr] = subjWeights.ww;
                    config.assessmentActivityComponents[idStr] = 'ww';
                } else {
                    config.assessmentWeights[idStr] = draft.assessmentWeights?.[idStr] !== undefined ? draft.assessmentWeights[idStr] : weightVal;
                    config.assessmentActivityComponents[idStr] = draft.assessmentActivityComponents?.[idStr] !== undefined ? draft.assessmentActivityComponents[idStr] : activityComponentVal;
                }
                if (!config.assessmentComponents) config.assessmentComponents = { ...(saved?.assessmentComponents || {}) };
                config.assessmentComponents[idStr] = config.assessmentActivityComponents[idStr];
                if (foundAss) {
                    foundAss.component = config.assessmentActivityComponents[idStr];
                    foundAss.gradebookComponent = foundAss.component;
                    foundAss.weight = config.assessmentWeights[idStr];
                }
                config.assessmentMaxAttempts[idStr] = draft.assessmentMaxAttempts?.[idStr] !== undefined ? draft.assessmentMaxAttempts[idStr] : maxAttemptsVal;
                config.assessmentLatePermissions[idStr] = draft.assessmentLatePermissions?.[idStr] !== undefined ? draft.assessmentLatePermissions[idStr] : latePermVal;

                if (isItemQuiz) {
                    const hasT = draft.assessmentHasTimers?.[idStr] !== undefined ? Boolean(draft.assessmentHasTimers[idStr]) : false;
                    const tMins = hasT ? (draft.assessmentTimeLimitMinutes?.[idStr] || 30) : null;
                    const tLim = hasT ? (draft.assessmentTimeLimits?.[idStr] || `${tMins}:00`) : 'none';

                    config.assessmentHasTimers[idStr] = hasT;
                    config.assessmentTimeLimits[idStr] = tLim;
                    config.assessmentTimeLimitMinutes[idStr] = tMins;

                    const autoSub = draft.assessmentAutoSubmitOnExit?.[idStr] !== undefined ? Boolean(draft.assessmentAutoSubmitOnExit[idStr]) : true;
                    if (!config.assessmentAutoSubmitOnExit) config.assessmentAutoSubmitOnExit = { ...(saved?.assessmentAutoSubmitOnExit || {}) };
                    config.assessmentAutoSubmitOnExit[idStr] = autoSub;

                    if (foundAss?.id) {
                        config.assessmentHasTimers[String(foundAss.id)] = hasT;
                        config.assessmentTimeLimits[String(foundAss.id)] = tLim;
                        config.assessmentTimeLimitMinutes[String(foundAss.id)] = tMins;
                        config.assessmentAutoSubmitOnExit[String(foundAss.id)] = autoSub;
                    }
                    if (foundAss?.title) {
                        config.assessmentHasTimers[foundAss.title] = hasT;
                        config.assessmentTimeLimits[foundAss.title] = tLim;
                        config.assessmentTimeLimitMinutes[foundAss.title] = tMins;
                        config.assessmentAutoSubmitOnExit[foundAss.title] = autoSub;
                    }
                }

                config.assessmentGradingModes[idStr] = draft.assessmentGradingModes?.[idStr] !== undefined ? draft.assessmentGradingModes[idStr] : gradingModeVal;
                if (!config.assessmentEssayGradingModes) config.assessmentEssayGradingModes = { ...(saved?.assessmentEssayGradingModes || {}) };
                if (draft.assessmentEssayGradingModes?.[idStr] !== undefined) {
                    config.assessmentEssayGradingModes[idStr] = draft.assessmentEssayGradingModes[idStr];
                    if (foundAss?.id) config.assessmentEssayGradingModes[String(foundAss.id)] = draft.assessmentEssayGradingModes[idStr];
                    if (foundAss?.title) config.assessmentEssayGradingModes[foundAss.title] = draft.assessmentEssayGradingModes[idStr];
                }
                if (!config.assessmentManualReviewTypes) config.assessmentManualReviewTypes = { ...(saved?.assessmentManualReviewTypes || {}) };
                if (draft.assessmentManualReviewTypes?.[idStr] !== undefined) {
                    const reviewTypes = draft.assessmentManualReviewTypes[idStr];
                    config.assessmentManualReviewTypes[idStr] = reviewTypes;
                    if (foundAss?.id) config.assessmentManualReviewTypes[String(foundAss.id)] = reviewTypes;
                    if (foundAss?.title) config.assessmentManualReviewTypes[foundAss.title] = reviewTypes;
                }
                if (!config.assessmentShowCorrectAnswers) config.assessmentShowCorrectAnswers = { ...(saved?.assessmentShowCorrectAnswers || {}) };
                if (draft.assessmentShowCorrectAnswers?.[idStr] !== undefined) {
                    config.assessmentShowCorrectAnswers[idStr] = Boolean(draft.assessmentShowCorrectAnswers[idStr]);
                    if (foundAss?.id) config.assessmentShowCorrectAnswers[String(foundAss.id)] = Boolean(draft.assessmentShowCorrectAnswers[idStr]);
                    if (foundAss?.title) config.assessmentShowCorrectAnswers[foundAss.title] = Boolean(draft.assessmentShowCorrectAnswers[idStr]);
                }
                if (!config.assessmentAllowFileUploads) config.assessmentAllowFileUploads = { ...(saved?.assessmentAllowFileUploads || {}) };
                const effAllowUpload = isItemQuiz ? false : (draft.assessmentAllowFileUploads?.[idStr] !== undefined ? Boolean(draft.assessmentAllowFileUploads[idStr]) : false);
                config.assessmentAllowFileUploads[idStr] = effAllowUpload;
                if (foundAss?.id) config.assessmentAllowFileUploads[String(foundAss.id)] = effAllowUpload;
                if (foundAss?.title) config.assessmentAllowFileUploads[foundAss.title] = effAllowUpload;
                if (foundAss) {
                    foundAss.allowFileUpload = effAllowUpload;
                    if (foundAss.rawItem) foundAss.rawItem.allowFileUpload = effAllowUpload;
                }
                if (!config.assessmentAiAssisted) config.assessmentAiAssisted = {};
                if (!draft.assessmentAiAssisted) draft.assessmentAiAssisted = {};
                const aiChkNow = document.getElementById('teacher-schedule-ai-assisted');
                const _aiVal = aiChkNow
                    ? Boolean(aiChkNow.checked)
                    : Boolean(draft.assessmentAiAssisted?.[idStr]);
                const aiKeys = [idStr];
                if (foundAss?.id) aiKeys.push(String(foundAss.id));
                if (foundAss?.title) aiKeys.push(foundAss.title);
                aiKeys.forEach((key) => {
                    draft.assessmentAiAssisted[key] = _aiVal;
                    config.assessmentAiAssisted[key] = _aiVal;
                });
                if (!config.assessmentRubrics) config.assessmentRubrics = {};
                let activeRubricName = '';
                let activeRubricUrl = '';
                if (!draft._rubricDeleted) {
                    activeRubricName = (
                        draft.assessmentRubrics?.[idStr] ||
                        draft.assessmentRubrics?.[String(foundAss?.id)] ||
                        draft.assessmentRubrics?.[foundAss?.title] ||
                        draft._uploadedRubricName ||
                        (draft.assessmentRubrics ? Object.values(draft.assessmentRubrics)[0] : '') ||
                        ''
                    ).trim();
                    activeRubricUrl = (
                        draft.assessmentRubricUrls?.[idStr] ||
                        draft.assessmentRubricUrls?.[String(foundAss?.id)] ||
                        draft.assessmentRubricUrls?.[foundAss?.title] ||
                        draft._uploadedRubricUrl ||
                        (draft.assessmentRubricUrls ? Object.values(draft.assessmentRubricUrls)[0] : '') ||
                        ''
                    );
                }

                if (activeRubricName && !isItemQuiz) {
                    config.assessmentRubrics[idStr] = activeRubricName;
                    if (foundAss?.id) config.assessmentRubrics[String(foundAss.id)] = activeRubricName;
                    if (foundAss?.title) config.assessmentRubrics[foundAss.title] = activeRubricName;
                    if (!config.assessmentRubricUrls) config.assessmentRubricUrls = {};
                    if (activeRubricUrl) {
                        config.assessmentRubricUrls[idStr] = activeRubricUrl;
                        if (foundAss?.id) config.assessmentRubricUrls[String(foundAss.id)] = activeRubricUrl;
                        if (foundAss?.title) config.assessmentRubricUrls[foundAss.title] = activeRubricUrl;
                    }

                    const foundRole = String(foundAss?.authorRole || foundAss?.role || (foundAss?.isAdmin ? 'Admin' : (foundAss?.isTeacher ? 'Teacher' : ''))).toLowerCase();
                    const foundIsAdminMaterial = Boolean(foundAss) && (foundRole === 'admin' || foundAss.isAdmin === true) && foundAss.isTeacher !== true;
                    if (foundAss && !foundIsAdminMaterial) {
                        foundAss.hasRubric = true;
                        foundAss.rubricFileName = activeRubricName;
                        foundAss.rubricUrl = activeRubricUrl;
                        foundAss.rubric = {
                            fileName: activeRubricName,
                            type: (activeRubricName.split('.').pop() || 'docx').toLowerCase(),
                            url: activeRubricUrl
                        };
                        if (foundAss.rawItem && foundAss.rawItem !== foundAss && foundAss.rawItem.isAdmin !== true) {
                            foundAss.rawItem.hasRubric = true;
                            foundAss.rawItem.rubricFileName = activeRubricName;
                            foundAss.rawItem.rubricUrl = activeRubricUrl;
                            foundAss.rawItem.rubric = activeRubricName;
                        }
                    }

                    // Sync uploaded rubric directly to materials in storage
                    try {
                        const adminSubjects = (typeof getStoredJson === 'function') ? getStoredJson('sigma-admin-subjects', []) : [];
                        let currentTeacher = null;
                        try {
                            const rawUser = sessionStorage.getItem('sigma-authenticated-user') || localStorage.getItem('sigma-logged-in-user') || localStorage.getItem('currentUser') || localStorage.getItem('sigma_active_user');
                            if (rawUser) currentTeacher = JSON.parse(rawUser);
                        } catch(e) {}
                        const userRole = String(currentTeacher?.role || currentTeacher?.userType || '').toLowerCase();
                        const isUserAdmin = userRole === 'admin' || userRole === 'administrator' || window.location.pathname.includes('admin.html');
                        const currentTeacherId = currentTeacher ? String(currentTeacher.id || currentTeacher.uid || currentTeacher.username || 'teacher').trim() : 'teacher';
                        const currentTeacherName = currentTeacher ? String(currentTeacher.name || `${currentTeacher.firstName || ''} ${currentTeacher.lastName || ''}`).trim() : 'Maria Santos Ramos';
                        const cleanSubjId = String(subjectId).trim().toLowerCase().replace(/^(card-|subj-)/, '');

                        const targetSubj = adminSubjects.find(s => {
                            const sId = String(s.id || '').trim().toLowerCase().replace(/^(card-|subj-)/, '');
                            const sCode = String(s.code || '').trim().toLowerCase().replace(/^(card-|subj-)/, '');
                            const sName = String(s.name || '').trim().toLowerCase();
                            return sId === cleanSubjId || sCode === cleanSubjId || sName === cleanSubjId || (s.id && String(s.id).toLowerCase() === String(subjectId).toLowerCase());
                        });

                        if (targetSubj) {
                            if (!Array.isArray(targetSubj.materials)) targetSubj.materials = [];
                            if (!Array.isArray(targetSubj.topics)) targetSubj.topics = [];

                            const targetTitle = (foundAss?.title || foundAss?.name || '').trim().toLowerCase();
                            const tgtAssId = String(foundAss?.id || idStr);

                            let existingMatIdx = targetSubj.materials.findIndex(m => {
                                if (!m) return false;
                                const mId = String(m.id || '');
                                const mTitle = String(m.title || m.name || '').trim().toLowerCase();
                                return mId === tgtAssId || (targetTitle && mTitle === targetTitle);
                            });

                            let teacherMatIdx = targetSubj.materials.findIndex(m => {
                                if (!m) return false;
                                const mRole = m.authorRole || m.role || (m.isTeacher ? 'Teacher' : (m.isAdmin ? 'Admin' : ''));
                                const isT = (typeof window.normalizeSubjectAuthorRole === 'function' ? window.normalizeSubjectAuthorRole(mRole) : mRole) === 'Teacher';
                                if (!isT) return false;
                                const mId = String(m.id || '');
                                const mTitle = String(m.title || m.name || '').trim().toLowerCase();
                                const mAdminId = String(m.originalAdminId || '');
                                return mId === tgtAssId || mAdminId === tgtAssId || (targetTitle && mTitle === targetTitle);
                            });

                            let targetTopicId = foundAss?.topicId || '';
                            if (!targetTopicId && existingMatIdx >= 0) {
                                targetTopicId = targetSubj.materials[existingMatIdx].topicId || '';
                            }
                            if (!targetTopicId && targetSubj.topics.length > 0) {
                                for (const top of targetSubj.topics) {
                                    for (const arrKey of ['assignments', 'quizzes', 'activities', 'performanceTasks', 'tasks', 'materials']) {
                                        if (Array.isArray(top[arrKey]) && top[arrKey].some(x => String(x.id || '') === tgtAssId || (targetTitle && String(x.title || x.name || '').trim().toLowerCase() === targetTitle))) {
                                            targetTopicId = top.id;
                                            break;
                                        }
                                    }
                                    if (targetTopicId) break;
                                }
                            }
                            if (!targetTopicId && targetSubj.topics.length > 0) targetTopicId = targetSubj.topics[0].id || 'topic-1';

                            if (!isUserAdmin) {
                                const targetSecStr = String(targetSection || '').trim();
                                if (teacherMatIdx >= 0) {
                                    const tMat = targetSubj.materials[teacherMatIdx];
                                    tMat.hasRubric = true;
                                    tMat.rubricFileName = activeRubricName;
                                    if (activeRubricUrl) tMat.rubricUrl = activeRubricUrl;
                                    tMat.rubric = activeRubricName;
                                    tMat.section = targetSecStr;
                                    tMat.roomSection = targetSecStr;
                                    tMat.updatedAt = new Date().toISOString();
                                } else if (existingMatIdx >= 0) {
                                    const origMat = targetSubj.materials[existingMatIdx];
                                    const origRole = origMat.authorRole || origMat.role || (origMat.isAdmin ? 'Admin' : (origMat.isTeacher ? 'Teacher' : 'Admin'));
                                    const isOrigAdmin = (typeof window.normalizeSubjectAuthorRole === 'function' ? window.normalizeSubjectAuthorRole(origRole) : origRole) === 'Admin';

                                    if (isOrigAdmin) {
                                        if (teacherMatIdx < 0) {
                                            const origMatIdStr = String(origMat.id || '');
                                            teacherMatIdx = origMatIdStr ? targetSubj.materials.findIndex(m => {
                                                if (!m) return false;
                                                const mRole = m.authorRole || m.role || (m.isTeacher ? 'Teacher' : (m.isAdmin ? 'Admin' : ''));
                                                const isT = (typeof window.normalizeSubjectAuthorRole === 'function' ? window.normalizeSubjectAuthorRole(mRole) : mRole) === 'Teacher';
                                                if (!isT) return false;
                                                const mSec = String(m.section || m.roomSection || '').trim().toLowerCase();
                                                const tSec = targetSecStr.toLowerCase();
                                                if (mSec && tSec && mSec !== tSec && mSec !== 'all') return false;
                                                return String(m.originalAdminId || '') === origMatIdStr;
                                            }) : -1;
                                        }

                                        if (teacherMatIdx >= 0) {
                                            const tMat = targetSubj.materials[teacherMatIdx];
                                            tMat.hasRubric = true;
                                            tMat.rubricFileName = activeRubricName;
                                            if (activeRubricUrl) tMat.rubricUrl = activeRubricUrl;
                                            tMat.rubric = activeRubricName;
                                            tMat.section = targetSecStr;
                                            tMat.roomSection = targetSecStr;
                                            tMat.updatedAt = new Date().toISOString();
                                        } else {
                                            // The admin material keeps the rubric uploaded on the admin page.
                                        }
                                    } else {
                                        origMat.hasRubric = true;
                                        origMat.rubricFileName = activeRubricName;
                                        if (activeRubricUrl) origMat.rubricUrl = activeRubricUrl;
                                        origMat.rubric = activeRubricName;
                                        origMat.section = targetSecStr;
                                        origMat.roomSection = targetSecStr;
                                        origMat.updatedAt = new Date().toISOString();
                                    }
                                } else {
                                    const newMat = {
                                        id: `mat-teacher-${currentTeacherId}-${Date.now()}`,
                                        originalAdminId: tgtAssId,
                                        title: foundAss?.title || foundAss?.name || 'Assessment Task',
                                        description: foundAss?.description || foundAss?.instructions || '',
                                        topicId: targetTopicId || 'topic-1',
                                        quarter: foundAss?.quarter || 'q1',
                                        type: foundAss?.type || 'Task',
                                        section: targetSecStr,
                                        roomSection: targetSecStr,
                                        authorRole: 'Teacher',
                                        authorId: currentTeacherId,
                                        authorName: currentTeacherName,
                                        isTeacher: true,
                                        isAdmin: false,
                                        hasRubric: true,
                                        rubricFileName: activeRubricName,
                                        rubricUrl: activeRubricUrl || '',
                                        rubric: activeRubricName,
                                        fileName: foundAss?.fileName || (foundAss?.file ? String(foundAss.file).split('/').pop() : '') || '',
                                        fileUrl: foundAss?.fileUrl || foundAss?.url || foundAss?.file || '',
                                        createdAt: new Date().toISOString(),
                                        updatedAt: new Date().toISOString()
                                    };
                                    targetSubj.materials.push(newMat);
                                }
                            }

                            if (typeof window.deduplicateMaterialsArray === 'function' && Array.isArray(targetSubj.materials)) {
                                targetSubj.materials = window.deduplicateMaterialsArray(targetSubj.materials, { collapseRoles: false });
                            }

                            if (Array.isArray(targetSubj.topics)) {
                                targetSubj.topics.forEach(top => {
                                    for (const arrKey of ['assignments', 'quizzes', 'activities', 'performanceTasks', 'tasks', 'materials']) {
                                        if (Array.isArray(top[arrKey]) && typeof window.deduplicateMaterialsArray === 'function') {
                                            top[arrKey] = window.deduplicateMaterialsArray(top[arrKey], { collapseRoles: false });
                                        }
                                    }
                                });
                            }

                            if (typeof saveStoredJson === 'function') {
                                saveStoredJson('sigma-admin-subjects', adminSubjects);
                            } else {
                                localStorage.setItem('sigma-admin-subjects', JSON.stringify(adminSubjects));
                            }

                            // Sync in-memory materials if matching targetSection
                            try {
                                const targetSecLower = String(targetSection || '').trim().toLowerCase();
                                if (Array.isArray(window.currentSubjectAllMaterials)) {
                                    const memTMat = window.currentSubjectAllMaterials.find(m => {
                                        if (!m) return false;
                                        const mRole = m.authorRole || m.role || (m.isTeacher ? 'Teacher' : '');
                                        const isT = (typeof window.normalizeSubjectAuthorRole === 'function' ? window.normalizeSubjectAuthorRole(mRole) : mRole) === 'Teacher';
                                        if (!isT && !isUserAdmin) return false;
                                        const mSec = String(m.section || m.roomSection || '').trim().toLowerCase();
                                        if (mSec && targetSecLower && mSec !== targetSecLower && mSec !== 'all') return false;
                                        const mId = String(m.id || '');
                                        const mTitle = String(m.title || m.name || '').trim().toLowerCase();
                                        const mAdminId = String(m.originalAdminId || '');
                                        return mId === tgtAssId || mAdminId === tgtAssId || (targetTitle && mTitle === targetTitle);
                                    });
                                    if (memTMat) {
                                        memTMat.hasRubric = true;
                                        memTMat.rubricFileName = activeRubricName;
                                        if (activeRubricUrl) memTMat.rubricUrl = activeRubricUrl;
                                        memTMat.rubric = activeRubricName;
                                        memTMat.section = targetSection;
                                        memTMat.roomSection = targetSection;
                                    } else if (!isUserAdmin) {
                                        const justCreated = targetSubj.materials[targetSubj.materials.length - 1];
                                        if (justCreated && justCreated.isTeacher) {
                                            window.currentSubjectAllMaterials.push({ ...justCreated });
                                        }
                                    }
                                }
                                if (Array.isArray(window.currentSubjectMaterials)) {
                                    const memMat = window.currentSubjectMaterials.find(m => {
                                        if (!m) return false;
                                        const mRole = m.authorRole || m.role || (m.isTeacher ? 'Teacher' : '');
                                        const isT = (typeof window.normalizeSubjectAuthorRole === 'function' ? window.normalizeSubjectAuthorRole(mRole) : mRole) === 'Teacher';
                                        if (!isT && !isUserAdmin) return false;
                                        const mSec = String(m.section || m.roomSection || '').trim().toLowerCase();
                                        if (mSec && targetSecLower && mSec !== targetSecLower && mSec !== 'all') return false;
                                        const mId = String(m.id || '');
                                        const mTitle = String(m.title || m.name || '').trim().toLowerCase();
                                        const mAdminId = String(m.originalAdminId || '');
                                        return mId === tgtAssId || mAdminId === tgtAssId || (targetTitle && mTitle === targetTitle);
                                    });
                                    if (memMat) {
                                        memMat.hasRubric = true;
                                        memMat.rubricFileName = activeRubricName;
                                        if (activeRubricUrl) memMat.rubricUrl = activeRubricUrl;
                                        memMat.rubric = activeRubricName;
                                        memMat.section = targetSection;
                                        memMat.roomSection = targetSection;
                                    }
                                }
                            } catch (e) {}
                        }
                    } catch (err) {
                        console.warn('[saveTeacherUnifiedSchedule] Error syncing rubric to teacher material:', err);
                    }
                } else if (draft._rubricDeleted) {
                    delete config.assessmentRubrics[idStr];
                    if (foundAss?.id) delete config.assessmentRubrics[String(foundAss.id)];
                    if (foundAss?.title) delete config.assessmentRubrics[foundAss.title];
                    if (config.assessmentRubricUrls) {
                        delete config.assessmentRubricUrls[idStr];
                        if (foundAss?.id) delete config.assessmentRubricUrls[String(foundAss.id)];
                        if (foundAss?.title) delete config.assessmentRubricUrls[foundAss.title];
                    }
                    if (foundAss) {
                        foundAss.hasRubric = false;
                        foundAss.rubricFileName = '';
                        foundAss.rubricUrl = '';
                        foundAss.rubric = null;
                        if (foundAss.rawItem) {
                            foundAss.rawItem.hasRubric = false;
                            foundAss.rawItem.rubricFileName = '';
                            foundAss.rawItem.rubricUrl = '';
                            foundAss.rawItem.rubric = '';
                        }
                    }
                    if (draft._rubricDeleted) {
                        try {
                            const adminSubjects = (typeof getStoredJson === 'function') ? getStoredJson('sigma-admin-subjects', []) : [];
                            const cleanSubjId = String(subjectId).trim().toLowerCase().replace(/^(card-|subj-)/, '');
                            const targetSubj = adminSubjects.find(s => {
                                const sId = String(s.id || '').trim().toLowerCase().replace(/^(card-|subj-)/, '');
                                const sCode = String(s.code || '').trim().toLowerCase().replace(/^(card-|subj-)/, '');
                                const sName = String(s.name || '').trim().toLowerCase();
                                return sId === cleanSubjId || sCode === cleanSubjId || sName === cleanSubjId || (s.id && String(s.id).toLowerCase() === String(subjectId).toLowerCase());
                            });
                            if (targetSubj) {
                                const targetTitle = (foundAss?.title || foundAss?.name || '').trim().toLowerCase();
                                const tgtAssId = String(foundAss?.id || idStr);
                                if (Array.isArray(targetSubj.materials)) {
                                    targetSubj.materials.forEach(m => {
                                        const mId = String(m.id || '');
                                        const mTitle = String(m.title || m.name || '').trim().toLowerCase();
                                        const mAdminId = String(m.originalAdminId || '');
                                        if (mId === tgtAssId || mAdminId === tgtAssId || (targetTitle && mTitle === targetTitle)) {
                                            m.hasRubric = false;
                                            m.rubricFileName = '';
                                            m.rubricUrl = '';
                                            m.rubric = '';
                                        }
                                    });
                                }
                                if (Array.isArray(targetSubj.topics)) {
                                    targetSubj.topics.forEach(top => {
                                        for (const arrKey of ['assignments', 'quizzes', 'activities', 'performanceTasks', 'tasks', 'materials']) {
                                            if (Array.isArray(top[arrKey])) {
                                                top[arrKey].forEach(x => {
                                                    if (String(x.id || '') === tgtAssId || (targetTitle && String(x.title || x.name || '').trim().toLowerCase() === targetTitle)) {
                                                        x.hasRubric = false;
                                                        x.rubricFileName = '';
                                                        x.rubricUrl = '';
                                                        x.rubric = '';
                                                    }
                                                });
                                            }
                                        }
                                    });
                                }
                                if (typeof saveStoredJson === 'function') {
                                    saveStoredJson('sigma-admin-subjects', adminSubjects);
                                } else {
                                    localStorage.setItem('sigma-admin-subjects', JSON.stringify(adminSubjects));
                                }
                            }
                        } catch (err) {}
                    }
                }
                if (!config.assessmentCriteriaAiAuto) config.assessmentCriteriaAiAuto = {};
                config.assessmentCriteriaAiAuto[idStr] = draft.assessmentCriteriaAiAuto?.[idStr] !== undefined ? Boolean(draft.assessmentCriteriaAiAuto[idStr]) : true;
                if (!config.assessmentSelectedCriteria) config.assessmentSelectedCriteria = {};
                if (Array.isArray(draft.assessmentSelectedCriteria?.[idStr])) {
                    config.assessmentSelectedCriteria[idStr] = draft.assessmentSelectedCriteria[idStr];
                }
            }

            const copyAssignedList = (value) => Array.isArray(value) ? value.slice() : null;
            let chosenStudents = null;
            const draftAssigned = copyAssignedList(draft.assignedStudents?.[idStr]);
            const savedAssigned = copyAssignedList(saved?.assignedStudents?.[idStr]);
            const fallbackAssigned = copyAssignedList(effFallbackAssigned);
            if (draftAssigned) {
                chosenStudents = draftAssigned;
            } else if (isApplyAll && fallbackAssigned) {
                chosenStudents = fallbackAssigned;
            } else if (savedAssigned) {
                chosenStudents = savedAssigned;
            } else {
                chosenStudents = Array.isArray(defaultChosenStudentIds) ? defaultChosenStudentIds.slice() : [];
            }

            // Expand chosen students with all alias representations so any student check succeeds
            const expandedAssigned = new Set();
            const isEveryStudentSelected = Array.isArray(defaultChosenStudentIds) && defaultChosenStudentIds.length > 0 && Array.isArray(chosenStudents) && defaultChosenStudentIds.every(id => chosenStudents.includes(String(id)));
            if ((!draft.assignedStudents?.[idStr] && !(isApplyAll && effFallbackAssigned) && !savedAssigned) || isEveryStudentSelected) {
                expandedAssigned.add('all');
                expandedAssigned.add('All');
                expandedAssigned.add('*');
            }

            (chosenStudents || []).forEach(cs => {
                const csStr = String(cs).trim();
                if (!csStr) return;
                expandedAssigned.add(csStr);
                const csLower = csStr.toLowerCase();
                expandedAssigned.add(csLower);

                const matched = secStudentMap.get(csLower);
                if (matched) {
                    if (matched.id) { expandedAssigned.add(String(matched.id)); expandedAssigned.add(String(matched.id).toLowerCase()); }
                    if (matched.studentId) { expandedAssigned.add(String(matched.studentId)); expandedAssigned.add(String(matched.studentId).toLowerCase()); }
                    if (matched.uid) { expandedAssigned.add(String(matched.uid)); expandedAssigned.add(String(matched.uid).toLowerCase()); }
                    if (matched.name) { expandedAssigned.add(String(matched.name)); expandedAssigned.add(String(matched.name).toLowerCase()); }
                    if (matched.fullName) { expandedAssigned.add(String(matched.fullName)); expandedAssigned.add(String(matched.fullName).toLowerCase()); }
                    if (matched.firstName && matched.lastName) {
                        expandedAssigned.add(`${matched.firstName} ${matched.lastName}`);
                        expandedAssigned.add(`${matched.firstName} ${matched.lastName}`.toLowerCase());
                        expandedAssigned.add(`${matched.lastName}, ${matched.firstName}`);
                        expandedAssigned.add(`${matched.lastName}, ${matched.firstName}`.toLowerCase());
                    }
                }
            });

            const finalAssignedList = Array.from(expandedAssigned);
            config.assignedStudents[idStr] = [...finalAssignedList];

            if (category === 'assessments') {
                const foundAss = cachedAssessmentsForSave.find(a => String(a.id || a.title || '') === idStr || (a.title && a.title.trim().toLowerCase() === idStr.trim().toLowerCase()));
                if (foundAss) {
                    if (foundAss.title) {
                        config.assignedStudents[foundAss.title] = [...finalAssignedList];
                        config.assignedStudents[foundAss.title.trim().toLowerCase()] = [...finalAssignedList];
                    }
                    if (foundAss.id !== undefined) {
                        config.assignedStudents[String(foundAss.id)] = [...finalAssignedList];
                    }
                }
            } else if (category === 'learning') {
                const foundMat = cachedMaterialsForSave.find(m => String(m.id || m.title || m.name || '') === idStr || ((m.title || m.name) && (m.title || m.name).trim().toLowerCase() === idStr.trim().toLowerCase()));
                if (foundMat) {
                    const mTitle = foundMat.title || foundMat.name;
                    if (mTitle) {
                        config.assignedStudents[mTitle] = [...finalAssignedList];
                        config.assignedStudents[mTitle.trim().toLowerCase()] = [...finalAssignedList];
                    }
                    if (foundMat.id !== undefined) {
                        config.assignedStudents[String(foundMat.id)] = [...finalAssignedList];
                    }
                }
            } else if (category === 'topics') {
                const topics = cachedTopicsForSave;
                let foundTIdx = -1;
                const foundTop = topics.find((t, tIdx) => {
                    const tId = t.id !== undefined && t.id !== '' ? String(t.id) : `topic-${tIdx}`;
                    const matches = (tId === idStr || String(t.title || '').trim().toLowerCase() === idStr.trim().toLowerCase() || `topic-${tIdx}` === idStr || `topic-${tIdx + 1}` === idStr);
                    if (matches) { foundTIdx = tIdx; return true; }
                    return false;
                });
                const topAliases = new Set([idStr]);
                if (foundTop) {
                    if (foundTop.id !== undefined && foundTop.id !== '') topAliases.add(String(foundTop.id));
                    if (foundTop.title) {
                        topAliases.add(String(foundTop.title).trim());
                        topAliases.add(String(foundTop.title).trim().toLowerCase());
                    }
                }
                if (!foundTop?.id && foundTIdx >= 0) {
                    topAliases.add(`topic-${foundTIdx}`);
                    topAliases.add(`topic-${foundTIdx + 1}`);
                }
                topAliases.forEach(aKey => {
                    if (!config[meta.releasedIdKey].map(String).includes(aKey)) {
                        config[meta.releasedIdKey].push(aKey);
                    }
                    config.assignedStudents[aKey] = [...finalAssignedList];
                    if (itemStartVal && itemStartVal !== 'now') {
                        config[meta.scheduleKey][aKey] = itemStartVal;
                        config[meta.releaseDateKey][aKey] = itemStartVal;
                    } else {
                        delete config[meta.scheduleKey][aKey];
                        config[meta.releaseDateKey][aKey] = new Date().toISOString();
                    }
                });
            }
            } catch (err) {
                console.error('[saveTeacherUnifiedSchedule]', idStr, err);
                if (!config[meta.releasedIdKey].map(String).includes(idStr)) {
                    config[meta.releasedIdKey].push(idStr);
                }
                if (!config[meta.releaseDateKey][idStr]) {
                    config[meta.releaseDateKey][idStr] = new Date().toISOString();
                }
                if (category === 'assessments' && draft?.assessmentEssayGradingModes?.[idStr]) {
                    if (!config.assessmentEssayGradingModes) config.assessmentEssayGradingModes = { ...(saved?.assessmentEssayGradingModes || {}) };
                    config.assessmentEssayGradingModes[idStr] = draft.assessmentEssayGradingModes[idStr];
                }
            }
        });


        if (subjectId) {
            let releaseSaved = true;
            if (typeof window.saveUnifiedReleaseConfig === 'function') {
                releaseSaved = window.saveUnifiedReleaseConfig(meta.storagePrefix, subjectId, section, config) !== false;
            } else {
                try {
                    const cfgStr = JSON.stringify(config);
                    localStorage.setItem(`${meta.storagePrefix}_${subjectId}_${section}`, cfgStr);
                    localStorage.setItem(`${meta.storagePrefix}_${cleanId}_${section}`, cfgStr);
                    if (!section || section.toLowerCase() === 'all') {
                        localStorage.setItem(`${meta.storagePrefix}_${subjectId}_all`, cfgStr);
                    }
                } catch (e) {
                    releaseSaved = false;
                }
            }
            if (!releaseSaved) {
                const failMsg = 'This release could not be saved. Browser storage is full, so the quiz, learning material, or topic was not released.';
                if (typeof window.showGlobalToast === 'function') window.showGlobalToast(failMsg, 'error');
                else if (typeof window.showToast === 'function') window.showToast(failMsg, 'error');
                return;
            }

            // Each section keeps its own schedule and details. Do not copy them onto sibling sections.
            if (false) {
            try {
                const _adminSubjects = (typeof getStoredJson === 'function')
                    ? getStoredJson('sigma-admin-subjects', [])
                    : (JSON.parse(localStorage.getItem('sigma-admin-subjects') || '[]') || []);
                const _cleanSubjId = String(subjectId).replace(/^(card-|subj-)/, '').trim().toLowerCase();

                // Find the matching admin subject to get all assigned sections
                const _targetSubj = _adminSubjects.find(s => {
                    const sId = String(s.id || '').replace(/^(card-|subj-)/, '').trim().toLowerCase();
                    const sCode = String(s.code || '').replace(/^(card-|subj-)/, '').trim().toLowerCase();
                    return sId === _cleanSubjId || sCode === _cleanSubjId;
                });

                // Collect sibling section names from the subject's assignedSections / sections arrays
                const _siblingSecNames = new Set();
                const _collectSections = (secArr) => {
                    if (!Array.isArray(secArr)) return;
                    secArr.forEach(sec => {
                        const name = typeof sec === 'string' ? sec : (sec?.name || sec?.sectionName || '');
                        if (name) _siblingSecNames.add(name.trim());
                    });
                };
                if (_targetSubj) {
                    _collectSections(_targetSubj.assignedSections);
                    _collectSections(_targetSubj.sections);
                    // Also pick up section names from assignedTeachers entries
                    if (Array.isArray(_targetSubj.assignedTeachers)) {
                        _targetSubj.assignedTeachers.forEach(t => {
                            const tSec = t?.section || t?.sectionName || '';
                            if (tSec) _siblingSecNames.add(tSec.trim());
                        });
                    }
                }

                // Remove the section that was just saved (already done above)
                const _currentSecClean = String(section || '').replace(/^Grade\s*\d+\s*[-–]?\s*/i, '').trim();
                _siblingSecNames.delete(section);
                _siblingSecNames.delete(_currentSecClean);

                // Fields to broadcast (release metadata — NOT rubric/teacher-specific data)
                const _broadcastFields = [
                    meta.releasedIdKey,
                    meta.hiddenIdKey,
                    meta.scheduleKey,
                    meta.endScheduleKey,
                    meta.releaseDateKey,
                    'assessmentMaxScores',
                    'assessmentSchedules',
                    'materialSchedules',
                    'assessmentEndSchedules',
                    'materialEndSchedules',
                    'assessmentDueDates',
                    'releaseStartTime',
                    'releaseEndTime',
                    'publishAll',
                    'updatedAt'
                ];

                _siblingSecNames.forEach(sibSec => {
                    if (!sibSec) return;
                    try {
                        // Read existing config for the sibling section (preserve rubric data etc.)
                        const existingSib = (typeof window.getUnifiedReleaseConfig === 'function')
                            ? window.getUnifiedReleaseConfig(meta.storagePrefix, subjectId, sibSec)
                            : null;
                        const merged = Object.assign({}, existingSib || {});
                        // Overwrite only the broadcast fields from the admin-saved config
                        _broadcastFields.forEach(field => {
                            if (config[field] !== undefined) {
                                if (field === meta.releasedIdKey || field === meta.hiddenIdKey) {
                                    // Merge arrays so teacher-released items (if any) aren't lost
                                    const existingArr = Array.isArray(merged[field]) ? merged[field] : [];
                                    const newArr = Array.isArray(config[field]) ? config[field] : [];
                                    const mergedArr = Array.from(new Set([...existingArr.map(String), ...newArr.map(String)]));
                                    merged[field] = mergedArr;
                                } else if (config[field] && typeof config[field] === 'object' && !Array.isArray(config[field])) {
                                    // Merge objects (schedules, dates, max-scores)
                                    merged[field] = Object.assign({}, merged[field] || {}, config[field]);
                                } else {
                                    merged[field] = config[field];
                                }
                            }
                        });
                        merged.updatedAt = config.updatedAt || new Date().toISOString();
                        if (typeof window.saveUnifiedReleaseConfig === 'function') {
                            window.saveUnifiedReleaseConfig(meta.storagePrefix, subjectId, sibSec, merged);
                        }
                    } catch (_sibErr) {}
                });
            } catch (_broadcastErr) {}
            // --- End cross-section broadcast ---
            }
        }

        if (window._unifiedPickerSelection && subjectId && section) {
            const uSel = window._unifiedPickerSelection;
            const itemScheduleVal = (draft.isImmediate || !draft.startTime || draft.startTime === 'now') ? null : draft.startTime;
            const itemRelDate = itemScheduleVal || new Date().toISOString();

            if (category !== 'topics' && Array.isArray(uSel.topics) && uSel.topics.length > 0) {
                let topCfg = { releasedTopicIds: [], hiddenTopicIds: [], topicReleaseDates: {}, topicSchedules: {} };
                try {
                    const savedT = (typeof window.getTopicReleaseConfig === 'function')
                        ? window.getTopicReleaseConfig(subjectId, section)
                        : getStoredJson(`sigma_topic_release_${subjectId}_${section}`, null);
                    if (savedT) topCfg = { ...topCfg, ...savedT };
                } catch(e) {}
                if (!Array.isArray(topCfg.releasedTopicIds)) topCfg.releasedTopicIds = [];
                if (!Array.isArray(topCfg.hiddenTopicIds)) topCfg.hiddenTopicIds = [];
                if (!topCfg.topicReleaseDates) topCfg.topicReleaseDates = {};
                if (!topCfg.topicSchedules) topCfg.topicSchedules = {};
                uSel.topics.forEach(tid => {
                    const sTid = String(tid);
                    if (!topCfg.releasedTopicIds.map(String).includes(sTid)) topCfg.releasedTopicIds.push(sTid);
                    topCfg.hiddenTopicIds = topCfg.hiddenTopicIds.filter(h => String(h) !== sTid);
                    if (itemScheduleVal) {
                        topCfg.topicSchedules[sTid] = itemScheduleVal;
                        topCfg.topicReleaseDates[sTid] = itemScheduleVal;
                    } else {
                        delete topCfg.topicSchedules[sTid];
                        topCfg.topicReleaseDates[sTid] = itemRelDate;
                    }
                });
                topCfg.updatedAt = new Date().toISOString();
                window.saveUnifiedReleaseConfig?.('sigma_topic_release', subjectId, section, topCfg);
            }

            if (category !== 'learning' && Array.isArray(uSel.learning) && uSel.learning.length > 0) {
                let lrnCfg = { releasedMaterialIds: [], hiddenMaterialIds: [], materialReleaseDates: {}, materialSchedules: {} };
                try {
                    const savedL = (typeof window.getLearningMaterialReleaseConfig === 'function')
                        ? window.getLearningMaterialReleaseConfig(subjectId, section)
                        : getStoredJson(`sigma_learning_release_${subjectId}_${section}`, null);
                    if (savedL) lrnCfg = { ...lrnCfg, ...savedL };
                } catch(e) {}
                if (!Array.isArray(lrnCfg.releasedMaterialIds)) lrnCfg.releasedMaterialIds = [];
                if (!Array.isArray(lrnCfg.hiddenMaterialIds)) lrnCfg.hiddenMaterialIds = [];
                if (!lrnCfg.materialReleaseDates) lrnCfg.materialReleaseDates = {};
                if (!lrnCfg.materialSchedules) lrnCfg.materialSchedules = {};
                uSel.learning.forEach(mid => {
                    const sMid = String(mid);
                    if (!lrnCfg.releasedMaterialIds.map(String).includes(sMid)) lrnCfg.releasedMaterialIds.push(sMid);
                    lrnCfg.hiddenMaterialIds = lrnCfg.hiddenMaterialIds.filter(h => String(h) !== sMid);
                    if (itemScheduleVal) {
                        lrnCfg.materialSchedules[sMid] = itemScheduleVal;
                        lrnCfg.materialReleaseDates[sMid] = itemScheduleVal;
                    } else {
                        delete lrnCfg.materialSchedules[sMid];
                        lrnCfg.materialReleaseDates[sMid] = itemRelDate;
                    }
                });
                lrnCfg.updatedAt = new Date().toISOString();
                window.saveUnifiedReleaseConfig?.('sigma_learning_release', subjectId, section, lrnCfg);
            }

            if (category !== 'assessments' && Array.isArray(uSel.assessments) && uSel.assessments.length > 0) {
                let assCfg = { releasedMaterialIds: [], hiddenMaterialIds: [], materialReleaseDates: {}, materialSchedules: {} };
                try {
                    const savedA = (typeof window.getAssessmentReleaseConfig === 'function')
                        ? window.getAssessmentReleaseConfig(subjectId, section)
                        : getStoredJson(`sigma_assessment_release_${subjectId}_${section}`, null);
                    if (savedA) assCfg = { ...assCfg, ...savedA };
                } catch(e) {}
                if (!Array.isArray(assCfg.releasedMaterialIds)) assCfg.releasedMaterialIds = [];
                if (!Array.isArray(assCfg.hiddenMaterialIds)) assCfg.hiddenMaterialIds = [];
                if (!assCfg.materialReleaseDates) assCfg.materialReleaseDates = {};
                if (!assCfg.materialSchedules) assCfg.materialSchedules = {};
                uSel.assessments.forEach(aid => {
                    const sAid = String(aid);
                    if (!assCfg.releasedMaterialIds.map(String).includes(sAid)) assCfg.releasedMaterialIds.push(sAid);
                    assCfg.hiddenMaterialIds = assCfg.hiddenMaterialIds.filter(h => String(h) !== sAid);
                    if (itemScheduleVal) {
                        assCfg.materialSchedules[sAid] = itemScheduleVal;
                        assCfg.materialReleaseDates[sAid] = itemScheduleVal;
                    } else {
                        delete assCfg.materialSchedules[sAid];
                        assCfg.materialReleaseDates[sAid] = itemRelDate;
                    }
                });
                assCfg.updatedAt = new Date().toISOString();
                window.saveUnifiedReleaseConfig?.('sigma_assessment_release', subjectId, section, assCfg);
            }

            window._unifiedPickerSelection = null;
        }

        // Dispatch student notifications for released/scheduled items
        try {
            let senderTeacherName = 'Subject Teacher';
            try {
                const rawUser = sessionStorage.getItem('sigma-authenticated-user') || localStorage.getItem('sigma-logged-in-user') || localStorage.getItem('currentUser') || localStorage.getItem('sigma_active_user');
                if (rawUser) {
                    const u = JSON.parse(rawUser);
                    senderTeacherName = u.name || u.fullName || senderTeacherName;
                }
            } catch (_) {}
            const senderTeacherInitials = senderTeacherName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'ST';

            (targetIds || []).forEach(idVal => {
                const sIdVal = String(idVal);
                let itemObj = null;
                let notifTab = 'assessments';
                let notifTypeStr = 'Task';
                let topicIdxNum = 0;
                let itemIdxNum = 0;

                if (category === 'assessments') {
                    itemObj = cachedAssessmentsForSave.find(a => String(a.id || a.title || '') === sIdVal || (a.title && a.title.trim().toLowerCase() === sIdVal.trim().toLowerCase()));
                    if (itemObj) {
                        const isQ = Boolean(itemObj.type === 'Quiz' || String(itemObj.type || '').toLowerCase().includes('quiz') || itemObj.category === 'Quiz');
                        notifTab = 'assessments';
                        notifTypeStr = isQ ? 'Quiz' : (itemObj.category || itemObj.type || 'Task');
                        topicIdxNum = (itemObj.topicIdx !== undefined && itemObj.topicIdx !== null) ? Number(itemObj.topicIdx) : 0;
                        itemIdxNum = (itemObj.itemIdx !== undefined && itemObj.itemIdx !== null) ? Number(itemObj.itemIdx) : ((itemObj.unifiedIdx !== undefined && itemObj.unifiedIdx !== null) ? Number(itemObj.unifiedIdx) : 0);
                    }
                } else if (category === 'learning') {
                    itemObj = cachedMaterialsForSave.find(m => String(m.id || m.title || m.name || '') === sIdVal || ((m.title || m.name) && (m.title || m.name).trim().toLowerCase() === sIdVal.trim().toLowerCase()));
                    if (itemObj) {
                        const isVid = Boolean(itemObj.type === 'video' || String(itemObj.type || '').toLowerCase().includes('video') || itemObj.category === 'video' || itemObj.videoUrl || (itemObj.url && itemObj.url.includes('youtu')));
                        notifTab = isVid ? 'videos' : 'handouts';
                        notifTypeStr = isVid ? 'Video Lesson' : (itemObj.type || 'Lesson');
                        topicIdxNum = (itemObj.topicIdx !== undefined && itemObj.topicIdx !== null) ? Number(itemObj.topicIdx) : 0;
                        itemIdxNum = (itemObj.itemIdx !== undefined && itemObj.itemIdx !== null) ? Number(itemObj.itemIdx) : 0;
                    }
                }

                const itemTitle = itemObj?.title || itemObj?.name;
                if (itemTitle) {
                    const studentNotif = {
                        id: 'notif_rel_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                        senderName: senderTeacherName,
                        senderInitials: senderTeacherInitials,
                        senderColor: '#1d4ed8',
                        title: `New ${notifTypeStr} Posted`,
                        body: `${itemTitle} coursework is now available.`,
                        timestamp: new Date().toISOString(),
                        read: false,
                        target: {
                            subjectId: subjectId,
                            topicIdx: topicIdxNum,
                            tab: notifTab,
                            itemIdx: itemIdxNum,
                            materialTitle: itemTitle,
                            itemId: sIdVal
                        }
                    };
                    if (window.SigmaNotifications && typeof window.SigmaNotifications.sendToRole === 'function') {
                        window.SigmaNotifications.sendToRole('student', studentNotif);
                    }
                }
            });
        } catch (notifErr) {
            console.warn('[saveTeacherUnifiedSchedule] Student notification dispatch error:', notifErr);
        }

        // Queue release toast notifications for teacher
        try {
            (targetIds || []).forEach(idVal => {
                const sIdVal = String(idVal);
                let itemTitle = '';
                let tIdx = -1;
                if (category === 'topics') {
                    const foundT = cachedTopicsForSave.find((t, idx) => {
                        const matches = String(t.id || `topic-${idx}`) === sIdVal || String(t.title || '').trim().toLowerCase() === sIdVal.trim().toLowerCase();
                        if (matches) { tIdx = idx; return true; }
                        return false;
                    });
                    if (foundT) {
                        const topNum = foundT.topicNumber || foundT.number || (tIdx >= 0 ? tIdx + 1 : '');
                        const rawT = foundT.title || 'Topic';
                        itemTitle = (!/^topic\s*\d+/i.test(rawT) && topNum) ? `Topic ${topNum}: ${rawT}` : rawT;
                    } else {
                        itemTitle = `Topic: ${sIdVal}`;
                    }
                } else if (category === 'learning') {
                    const foundM = cachedMaterialsForSave.find(m => String(m.id || m.title || m.name || '') === sIdVal);
                    itemTitle = foundM ? (foundM.title || foundM.name) : sIdVal;
                } else if (category === 'assessments') {
                    const foundA = cachedAssessmentsForSave.find(a => String(a.id || a.title || '') === sIdVal);
                    itemTitle = foundA ? (foundA.title || foundA.name) : sIdVal;
                }
                if (itemTitle) {
                    window.queueTeacherReleaseToast?.({ title: itemTitle, action: 'released', category, topicIdx: tIdx });
                }
            });
        } catch(toastErr) {}

        // Reset draft state after save
        if (meta?.draftStateKey) {
            window[meta.draftStateKey] = null;
        }

        // Close schedule modal overlay directly
        window.closeTeacherScheduleTimePopover?.();
        const overlay = document.getElementById('teacher-topic-schedule-overlay');
        if (overlay) overlay.remove();

        // Ensure topics with released materials open on return to panel so user can see them
        window._topicReleaseCollapsedState = {};

        // Ensure parent modals are unhidden before refreshing
        const prevTopic = document.getElementById('teacher-release-topics-overlay');
        const prevLearning = document.getElementById('teacher-release-learning-materials-overlay');
        const prevAssessments = document.getElementById('teacher-release-assessments-overlay');
        if (prevTopic) { prevTopic.classList.remove('hidden'); prevTopic.style.display = ''; }
        if (prevLearning) { prevLearning.classList.remove('hidden'); prevLearning.style.display = ''; }
        if (prevAssessments) { prevAssessments.classList.remove('hidden'); prevAssessments.style.display = ''; }

        // Reopen the release manager modal directly (NOT the picker)
        if (prevAssessments || document.getElementById('teacher-release-assessments-overlay')) {
            window.openTeacherReleaseAssessmentsModal?.(true);
        } else if (category === 'learning') {
            window.openTeacherReleaseLearningMaterialsModal?.(true);
        } else if (category === 'assessments') {
            window.openTeacherReleaseAssessmentsModal?.(true);
        } else {
            window.openTeacherReleaseTopicsModal?.(true);
        }

        // Two-way sync saved rubrics & criteria settings to materials/assessments databases in background
        if (category === 'assessments') {
            setTimeout(() => {
                try {
                    const customKey = `sigma_custom_assessments_${subjectId}`;
                    let customAssessments = getStoredJson(customKey, []);
                    let customUpdated = false;
                    customAssessments = customAssessments.map(ass => {
                        const isAssQuiz = Boolean(ass.type === 'Quiz' || String(ass.type || '').toLowerCase().includes('quiz') || ass.category === 'Quiz' || String(ass.category || '').toLowerCase().includes('quiz') );
                        if (isAssQuiz) {
                            if (ass.hasRubric || ass.rubric || ass.rubricFileName || ass.rubricName || ass.rubricFile) {
                                ass.rubricName = '';
                                ass.rubricFile = '';
                                ass.rubricFileName = '';
                                ass.rubricUrl = '';
                                ass.hasRubric = false;
                                ass.rubric = null;
                                customUpdated = true;
                            }
                        } else {
                            const idMatch = String(ass.id);
                            const titleMatch = String(ass.title || '');
                            const rFile = config.assessmentRubrics?.[idMatch] || config.assessmentRubrics?.[titleMatch];
                            if (rFile) {
                                ass.rubricName = rFile;
                                ass.rubricFile = rFile;
                                ass.rubricFileName = rFile;
                                ass.hasRubric = true;
                                customUpdated = true;
                            }
                        }
                        if (config.assessmentCriteriaAiAuto?.[String(ass.id)] !== undefined) {
                            ass.criteriaAiAuto = config.assessmentCriteriaAiAuto[String(ass.id)];
                            customUpdated = true;
                        }
                        if (Array.isArray(config.assessmentSelectedCriteria?.[String(ass.id)])) {
                            ass.selectedCriteria = config.assessmentSelectedCriteria[String(ass.id)];
                            customUpdated = true;
                        }
                        if (config.assessmentAllowFileUploads?.[String(ass.id)] !== undefined) {
                            ass.allowFileUpload = Boolean(config.assessmentAllowFileUploads[String(ass.id)]);
                            customUpdated = true;
                        } else if (config.assessmentAllowFileUploads?.[String(ass.title)] !== undefined) {
                            ass.allowFileUpload = Boolean(config.assessmentAllowFileUploads[String(ass.title)]);
                            customUpdated = true;
                        }
                        return ass;
                    });
                    if (customUpdated) localStorage.setItem(customKey, JSON.stringify(customAssessments));

                    const materialsKey = `sigma_learning_materials_${subjectId}`;
                    let materials = getStoredJson(materialsKey, []);
                    let matUpdated = false;
                    materials = materials.map(mat => {
                        const isMatQuiz = Boolean(mat.type === 'Quiz' || String(mat.type || '').toLowerCase().includes('quiz') || mat.category === 'Quiz' || String(mat.category || '').toLowerCase().includes('quiz') );
                        if (isMatQuiz) {
                            if (mat.hasRubric || mat.rubric || mat.rubricFileName || mat.rubricName || mat.rubricFile) {
                                mat.rubricName = '';
                                mat.rubricFile = '';
                                mat.rubricFileName = '';
                                mat.rubricUrl = '';
                                mat.hasRubric = false;
                                mat.rubric = null;
                                matUpdated = true;
                            }
                        } else {
                            const rFile = config.assessmentRubrics[String(mat.id)] || config.assessmentRubrics[String(mat.title)] || config.assessmentRubrics[String(mat.name)];
                            if (rFile) {
                                mat.rubricName = rFile;
                                mat.rubricFile = rFile;
                                mat.rubricFileName = rFile;
                                mat.hasRubric = true;
                                matUpdated = true;
                            }
                        }
                        if (config.assessmentAllowFileUploads?.[String(mat.id)] !== undefined) {
                            mat.allowFileUpload = Boolean(config.assessmentAllowFileUploads[String(mat.id)]);
                            matUpdated = true;
                        } else if (config.assessmentAllowFileUploads?.[String(mat.title || mat.name)] !== undefined) {
                            mat.allowFileUpload = Boolean(config.assessmentAllowFileUploads[String(mat.title || mat.name)]);
                            matUpdated = true;
                        }
                        return mat;
                    });
                    if (matUpdated) localStorage.setItem(materialsKey, JSON.stringify(materials));

                    const adminSubjects = getStoredJson('sigma-admin-subjects', []);
                    let adminSubjUpdated = false;
                    let currentTeacher = null;
                    try {
                        const rawUser = sessionStorage.getItem('sigma-authenticated-user') || localStorage.getItem('sigma-logged-in-user') || localStorage.getItem('currentUser') || localStorage.getItem('sigma_active_user');
                        if (rawUser) currentTeacher = JSON.parse(rawUser);
                    } catch(e) {}
                    const userRole = String(currentTeacher?.role || currentTeacher?.userType || '').toLowerCase();
                    const isUserAdmin = userRole === 'admin' || userRole === 'administrator' || window.location.pathname.includes('admin.html');

                    adminSubjects.forEach(s => {
                        if (Array.isArray(s.materials)) {
                            s.materials.forEach(m => {
                                const isMQuiz = Boolean(m.type === 'Quiz' || String(m.type || '').toLowerCase().includes('quiz') || m.category === 'Quiz' || String(m.category || '').toLowerCase().includes('quiz') );
                                const mRole = String(m.authorRole || m.role || (m.isAdmin ? 'Admin' : '')).toLowerCase();
                                const adminOwnsRubric = m.rubricSetByAdmin === true || m.isAdmin === true || mRole === 'admin';
                                if (isMQuiz && !adminOwnsRubric) {
                                    if (m.hasRubric || m.rubric || m.rubricFileName || m.rubricName || m.rubricFile) {
                                        m.rubricFileName = '';
                                        m.rubricName = '';
                                        m.rubricFile = '';
                                        m.hasRubric = false;
                                        m.rubric = null;
                                        adminSubjUpdated = true;
                                    }
                                } else {
                                    const rRole = m.authorRole || m.role || (m.isTeacher ? 'Teacher' : (m.isAdmin ? 'Admin' : ''));
                                    const isTeacherMat = (typeof window.normalizeSubjectAuthorRole === 'function' ? window.normalizeSubjectAuthorRole(rRole) : rRole) === 'Teacher';
                                    if (!adminOwnsRubric && (isUserAdmin || isTeacherMat)) {
                                        const rFile = config.assessmentRubrics[String(m.id)] || config.assessmentRubrics[String(m.title)] || config.assessmentRubrics[String(m.name)];
                                        if (rFile) {
                                            m.rubricFileName = rFile;
                                            m.rubricName = rFile;
                                            m.rubricFile = rFile;
                                            m.hasRubric = true;
                                            m.rubric = rFile;
                                            adminSubjUpdated = true;
                                        } else if (draft._rubricDeleted) {
                                            m.rubricFileName = '';
                                            m.rubricName = '';
                                            m.rubricFile = '';
                                            m.hasRubric = false;
                                            m.rubric = '';
                                            adminSubjUpdated = true;
                                        }
                                    }
                                }
                                if (config.assessmentAllowFileUploads?.[String(m.id)] !== undefined) {
                                    m.allowFileUpload = Boolean(config.assessmentAllowFileUploads[String(m.id)]);
                                    adminSubjUpdated = true;
                                } else if (config.assessmentAllowFileUploads?.[String(m.title || m.name)] !== undefined) {
                                    m.allowFileUpload = Boolean(config.assessmentAllowFileUploads[String(m.title || m.name)]);
                                    adminSubjUpdated = true;
                                }
                            });
                        }
                        if (Array.isArray(s.topics)) {
                            s.topics.forEach(t => {
                                const subArrays = [t.assignments, t.quizzes, t.activities, t.performanceTasks, t.materials, t.handouts, t.videos];
                                subArrays.forEach(arr => {
                                    if (Array.isArray(arr)) {
                                        arr.forEach(it => {
                                            const isItQuiz = Boolean(it.type === 'Quiz' || String(it.type || '').toLowerCase().includes('quiz') || it.category === 'Quiz' || String(it.category || '').toLowerCase().includes('quiz') );
                                            const itRole = String(it.authorRole || it.role || (it.isAdmin ? 'Admin' : '')).toLowerCase();
                                            const adminOwnsTopicRubric = it.rubricSetByAdmin === true || it.isAdmin === true || itRole === 'admin';
                                            if (isItQuiz && !adminOwnsTopicRubric) {
                                                if (it.rubricFileName || it.rubricName || it.rubricFile || it.hasRubric) {
                                                    it.rubricFileName = '';
                                                    it.rubricName = '';
                                                    it.rubricFile = '';
                                                    it.hasRubric = false;
                                                    it.rubric = null;
                                                    adminSubjUpdated = true;
                                                }
                                            } else if (isUserAdmin && !adminOwnsTopicRubric) {
                                                const rFile = config.assessmentRubrics[String(it.id)] || config.assessmentRubrics[String(it.title)] || config.assessmentRubrics[String(it.name)];
                                                if (rFile) {
                                                    it.rubricFileName = rFile;
                                                    it.rubricName = rFile;
                                                    it.rubricFile = rFile;
                                                    it.hasRubric = true;
                                                    it.rubric = rFile;
                                                    adminSubjUpdated = true;
                                                } else if (draft._rubricDeleted) {
                                                    it.rubricFileName = '';
                                                    it.rubricName = '';
                                                    it.rubricFile = '';
                                                    it.hasRubric = false;
                                                    it.rubric = '';
                                                    adminSubjUpdated = true;
                                                }
                                            }
                                            if (config.assessmentAllowFileUploads?.[String(it.id)] !== undefined) {
                                                it.allowFileUpload = Boolean(config.assessmentAllowFileUploads[String(it.id)]);
                                                adminSubjUpdated = true;
                                            } else if (config.assessmentAllowFileUploads?.[String(it.title || it.name)] !== undefined) {
                                                it.allowFileUpload = Boolean(config.assessmentAllowFileUploads[String(it.title || it.name)]);
                                                adminSubjUpdated = true;
                                            }
                                        });
                                    }
                                });
                            });
                        }
                    });
                    if (adminSubjUpdated) localStorage.setItem('sigma-admin-subjects', JSON.stringify(adminSubjects));
                } catch (err) {}
            }, 0);
        }
    };

    window.saveTeacherTopicSchedule = function () {
        window.saveTeacherUnifiedSchedule('topics');
    };

    window.closeTeacherReleaseTopicsModal = function (returnToHub = false) {
        window.closeAllReleasedTopicActionMenus?.();
        window._topicReleaseDraftState = null;
        const overlay = document.getElementById('teacher-release-topics-overlay');
        if (!overlay) {
            window.closeManageCurriculumHub?.();
            return;
        }
        overlay.classList.remove('curriculum-hub-overlay--visible');
        overlay.remove();

        const activeSubjId = (typeof resolveTeacherActiveSubjectId === 'function')
            ? resolveTeacherActiveSubjectId(currentTopicState?.subjectId)
            : (currentTopicState?.subjectId || 'card-prog1');

        const hubOverlay = document.getElementById('curriculum-hub-overlay');
        if (hubOverlay) hubOverlay.remove();
        window.closeManageCurriculumHub?.();
        document.querySelectorAll('#teacher-release-topics-overlay, #teacher-topic-picker-overlay, #teacher-topic-schedule-overlay, #teacher-release-learning-materials-overlay, #teacher-release-assessments-overlay, #teacher-release-category-overlay').forEach(el => el.remove());
        if (typeof window.unlockBodyScroll === 'function') {
            window.unlockBodyScroll();
        } else {
            document.documentElement.classList.remove('dialog-open', 'modal-open', 'sigma-modal-open', 'has-modal-open');
            document.body.classList.remove('dialog-open', 'modal-open', 'sigma-modal-open', 'has-modal-open');
        }

        // Re-render topic view deferred without blocking modal dismissal
        if (activeSubjId) {
            setTimeout(() => {
                refreshTeacherTopicUIIfVisible(activeSubjId);
            }, 50);
        }

        window.flushTeacherReleaseToastQueue?.();
    };

    window.saveTeacherReleaseTopicsSettings = function () {
        window.saveTeacherUnifiedSchedule?.('topics');
    };

    // ── Helper: Collect Learning Materials for Subject & Section ──────────────
    window.getTeacherSubjectLearningMaterials = function (subjectId, section) {
        const resolvedSubjectId = (typeof resolveTeacherActiveSubjectId === 'function')
            ? resolveTeacherActiveSubjectId(subjectId)
            : (subjectId || 'card-prog1');
        const cleanId = String(resolvedSubjectId).replace(/^(card-|subj-)/, '').toLowerCase();

        const activeSec = String(
            section ||
            (typeof currentTopicState !== 'undefined' ? currentTopicState?.selectedSection : '') ||
            (typeof resolveTeacherActiveSection === 'function' ? resolveTeacherActiveSection() : '') ||
            localStorage.getItem('sigma-active-classroom-section') ||
            ''
        ).trim().toLowerCase();

        let currentTeacher = null;
        try {
            const rawUser = sessionStorage.getItem('sigma-authenticated-user') || localStorage.getItem('sigma-logged-in-user') || localStorage.getItem('currentUser') || localStorage.getItem('sigma_active_user');
            if (rawUser) currentTeacher = JSON.parse(rawUser);
        } catch(e) {}
        const currentTeacherId = currentTeacher ? String(currentTeacher.id || currentTeacher.uid || currentTeacher.username || '').trim() : '';
        const currentTeacherName = currentTeacher ? String(currentTeacher.name || `${currentTeacher.firstName || ''} ${currentTeacher.lastName || ''}`).trim().toLowerCase() : '';

        const adminSections = (typeof window.getStoredJson === 'function')
            ? window.getStoredJson('sigma-admin-sections', [])
            : [];
        const secRecord = adminSections.find(s => {
            const sName = String(s.name || s.sectionName || '').trim().toLowerCase();
            return sName === activeSec || (activeSec && (sName.includes(activeSec) || activeSec.includes(sName)));
        });
        const assignedTeacherName = (typeof window.getUnifiedClassroomTeacher === 'function')
            ? String(window.getUnifiedClassroomTeacher(activeSec, resolvedSubjectId) || '').trim().toLowerCase()
            : '';

        // Get the topics strictly scoped to this section and assigned teacher!
        let topics = (typeof getTeacherAllSubjectTopics === 'function')
            ? getTeacherAllSubjectTopics(resolvedSubjectId, activeSec)
            : [];

        if (topics.length === 0) {
            const data = (typeof getTopicData === 'function') ? getTopicData(resolvedSubjectId) : null;
            if (data && Array.isArray(data.q1Topics) && data.q1Topics.length > 0) {
                topics = data.q1Topics;
            }
        }

        const items = [];
        const seenIds = new Set();
        const isFake = (typeof window.isFakeAssessment === 'function') ? window.isFakeAssessment : (item) => {
            if (!item) return true;
            if (item.isFake === true || item.isSample === true) return true;
            const t = String(item.title || item.name || '').trim();
            if (!t) return true;
            if (t.startsWith('"') || t.startsWith("'")) return true;
            const id = String(item.id || '').trim().toLowerCase();
            const authorId = String(item.authorId || item.uid || '').trim().toLowerCase();
            const authorName = String(item.authorName || item.author || '').trim().toLowerCase();
            if (id.includes('sample_01') || authorId === 'teacher_sample_01' || authorName.includes('johnathan smith')) return true;
            return false;
        };

        const isMaterialAllowed = (m) => {
            if (!m || isFake(m)) return false;
            const mSec = String(m.section || m.roomSection || '').trim().toLowerCase();
            const mAuthorId = String(m.authorId || m.uid || '').trim().toLowerCase();
            const mAuthorName = String(m.authorName || m.author || '').trim().toLowerCase();
            const rawRole = m.authorRole || m.role || (m.isAdmin ? 'Admin' : (m.isTeacher ? 'Teacher' : ''));
            const isTeacherMat = rawRole === 'Teacher' || m.isTeacher;

            // 1. Explicit section tag
            if (mSec && activeSec) {
                const clean = s => String(s || '').replace(/^grade\s*\d+\s*[-–]?\s*/i, '').replace(/[^a-z0-9]/g, '');
                if (mSec !== activeSec && clean(mSec) !== clean(activeSec) && mSec !== 'all') {
                    return false;
                }
                return true;
            }

            // 2. Admin material (institutional) - always allowed for all sections
            if (!isTeacherMat || rawRole === 'Admin' || m.isAdmin || !rawRole) {
                return true;
            }

            // 3. Teacher material without section tag:
            if (assignedTeacherName && (mAuthorName === assignedTeacherName || mAuthorName.includes(assignedTeacherName) || assignedTeacherName.includes(mAuthorName))) {
                return true;
            }
            if (secRecord && typeof window.isSectionAssignedToTeacher === 'function') {
                if (window.isSectionAssignedToTeacher(secRecord, { id: mAuthorId, name: mAuthorName })) {
                    return true;
                }
            }
            if (currentTeacher) {
                const isMatchCurrent = (currentTeacherId && mAuthorId && currentTeacherId === mAuthorId) ||
                    (currentTeacherName && mAuthorName && (currentTeacherName === mAuthorName || currentTeacherName.includes(mAuthorName) || mAuthorName.includes(currentTeacherName)));
                if (isMatchCurrent) {
                    if (!secRecord || !activeSec || (typeof window.isSectionAssignedToTeacher === 'function' && window.isSectionAssignedToTeacher(secRecord, currentTeacher))) {
                        return true;
                    }
                }
            }

            return false;
        };

        topics.forEach((t, tIdx) => {
            const topicTitle = t.title || t.name || `Topic ${tIdx + 1}`;
            const topicId = t.id !== undefined ? String(t.id) : `topic-${tIdx}`;

            // 1. Videos
            let vids = [];
            if (typeof window.getUnifiedTopicVideos === 'function') {
                vids = window.getUnifiedTopicVideos(resolvedSubjectId, tIdx, t.videos || []);
            } else if (Array.isArray(t.videos)) {
                vids = t.videos;
            }
            vids.forEach((v, vIdx) => {
                if (!isMaterialAllowed(v)) return;
                const vidId = String(v.id || `video-${topicId}-${vIdx}`);
                if (!seenIds.has(vidId)) {
                    seenIds.add(vidId);
                    items.push({
                        ...v,
                        id: vidId,
                        title: v.title || 'Course Lecture Video',
                        type: 'Video',
                        category: 'learning',
                        quarter: String(v.quarter || t.quarter || 'q1').toLowerCase(),
                        topicId: topicId,
                        topicTitle: topicTitle,
                        url: v.url || v.link || ''
                    });
                }
            });

            // 2. Handouts / Lessons / Materials
            let lessons = [];
            if (typeof window.getUnifiedTopicHandouts === 'function') {
                lessons = window.getUnifiedTopicHandouts(resolvedSubjectId, tIdx, [...(t.handouts || []), ...(t.lessons || []), ...(t.materials || [])]);
            } else {
                lessons = [...(Array.isArray(t.handouts) ? t.handouts : []), ...(Array.isArray(t.lessons) ? t.lessons : []), ...(Array.isArray(t.materials) ? t.materials : [])];
            }
            lessons.forEach((l, lIdx) => {
                if (!isMaterialAllowed(l)) return;
                const rawType = String(l.type || '').trim().toLowerCase();
                const isAssessment = rawType === 'assignment' || rawType === 'assignments' ||
                                     rawType === 'quiz' || rawType === 'quizzes' ||
                                     rawType === 'activity' || rawType === 'activities' ||
                                     rawType === 'performance task' || rawType === 'performance tasks' ||
                                     rawType === 'performance' || rawType === 'perf. task' ||
                                     rawType === 'task' || rawType === 'tasks' ||
                                     /^(performance task|activity \d|assignment \d|quiz \d)/i.test(l.title || '');
                if (isAssessment) return;

                const lessonId = String(l.id || `lesson-${topicId}-${lIdx}`);
                if (!seenIds.has(lessonId)) {
                    seenIds.add(lessonId);
                    items.push({
                        ...l,
                        id: lessonId,
                        title: l.title || l.fileName || 'Lesson Handout',
                        type: 'Lesson',
                        category: 'learning',
                        quarter: String(l.quarter || t.quarter || 'q1').toLowerCase(),
                        topicId: topicId,
                        topicTitle: topicTitle,
                        url: l.url || l.link || ''
                    });
                }
            });
        });

        // Also check standalone materials for this subject that belong to this section/teacher
        try {
            const matSources = [
                `sigma_custom_materials_${resolvedSubjectId}`,
                `sigma_materials_${resolvedSubjectId}`,
                `sigma_custom_materials_${cleanId}`,
                `sigma_materials_${cleanId}`
            ];
            for (const storeKey of matSources) {
                const rawMats = localStorage.getItem(storeKey);
                if (rawMats) {
                    const parsedMats = JSON.parse(rawMats);
                    if (Array.isArray(parsedMats)) {
                        parsedMats.forEach((m, mIdx) => {
                            if (!isMaterialAllowed(m)) return;
                            const rawType = String(m.type || m.category || '').toLowerCase();
                            const isAssessment = rawType === 'assignment' || rawType === 'quiz' || rawType === 'activity' || rawType === 'performance task' || rawType === 'performance' || rawType === 'task' || rawType === 'tasks';
                            if (isAssessment) return;
                            const matId = String(m.id || `custom-mat-${mIdx}`);
                            if (!seenIds.has(matId)) {
                                seenIds.add(matId);
                                items.push({
                                    ...m,
                                    id: matId,
                                    title: m.title || m.name || m.fileName || `Material ${mIdx + 1}`,
                                    type: (rawType === 'video') ? 'Video' : 'Lesson',
                                    category: 'learning',
                                    quarter: String(m.quarter || 'q1').toLowerCase(),
                                    topicId: m.topicId || '',
                                    topicTitle: m.topicTitle || '',
                                    url: m.url || m.fileUrl || m.videoUrl || ''
                                });
                            }
                        });
                    }
                }
            }
        } catch (e) {}

        const dedupFn = (typeof window.deduplicateMaterialsArray === 'function') ? window.deduplicateMaterialsArray : (arr => arr);
        return dedupFn(items);
    };

    // ── Helper: Collect Assessments for Subject & Section ─────────────────────
    window.getTeacherSubjectAssessments = function (subjectId, section) {
        const resolvedSubjectId = (typeof resolveTeacherActiveSubjectId === 'function')
            ? resolveTeacherActiveSubjectId(subjectId)
            : (subjectId || 'card-prog1');
        const cleanId = String(resolvedSubjectId).replace(/^(card-|subj-)/, '').toLowerCase();

        const activeSec = String(
            section ||
            (typeof currentTopicState !== 'undefined' ? currentTopicState?.selectedSection : '') ||
            (typeof resolveTeacherActiveSection === 'function' ? resolveTeacherActiveSection() : '') ||
            localStorage.getItem('sigma-active-classroom-section') ||
            ''
        ).trim().toLowerCase();

        let currentTeacher = null;
        try {
            const rawUser = sessionStorage.getItem('sigma-authenticated-user') || localStorage.getItem('sigma-logged-in-user') || localStorage.getItem('currentUser') || localStorage.getItem('sigma_active_user');
            if (rawUser) currentTeacher = JSON.parse(rawUser);
        } catch(e) {}
        const currentTeacherId = currentTeacher ? String(currentTeacher.id || currentTeacher.uid || currentTeacher.username || '').trim() : '';
        const currentTeacherName = currentTeacher ? String(currentTeacher.name || `${currentTeacher.firstName || ''} ${currentTeacher.lastName || ''}`).trim().toLowerCase() : '';

        const adminSections = (typeof window.getStoredJson === 'function')
            ? window.getStoredJson('sigma-admin-sections', [])
            : [];
        const secRecord = adminSections.find(s => {
            const sName = String(s.name || s.sectionName || '').trim().toLowerCase();
            return sName === activeSec || (activeSec && (sName.includes(activeSec) || activeSec.includes(sName)));
        });
        const assignedTeacherName = (typeof window.getUnifiedClassroomTeacher === 'function')
            ? String(window.getUnifiedClassroomTeacher(activeSec, resolvedSubjectId) || '').trim().toLowerCase()
            : '';

        // Get the topics strictly scoped to this section and assigned teacher!
        let topics = (typeof getTeacherAllSubjectTopics === 'function')
            ? getTeacherAllSubjectTopics(resolvedSubjectId, activeSec)
            : [];

        if (topics.length === 0) {
            const data = (typeof getTopicData === 'function') ? getTopicData(resolvedSubjectId) : null;
            if (data && Array.isArray(data.q1Topics) && data.q1Topics.length > 0) {
                topics = data.q1Topics;
            }
        }

        // Build Topic Title and Quarter Map for resolving topic IDs correctly
        const topicTitleMap = new Map();
        const topicQuarterMap = new Map();
        topics.forEach((t, tIdx) => {
            const tTitle = t.title || t.name || `Topic ${tIdx + 1}`;
            const tIdStr = String(t.id !== undefined ? t.id : `topic-${tIdx + 1}`);
            const tQuarter = String(t.quarter || 'q1').toLowerCase();
            topicTitleMap.set(tIdStr, tTitle);
            topicTitleMap.set(`topic-${tIdx + 1}`, tTitle);
            topicTitleMap.set(`topic-${tIdx}`, tTitle);
            topicTitleMap.set(String(tIdx + 1), tTitle);
            topicTitleMap.set(String(tIdx), tTitle);
            topicQuarterMap.set(tIdStr, tQuarter);
            topicQuarterMap.set(`topic-${tIdx + 1}`, tQuarter);
            topicQuarterMap.set(`topic-${tIdx}`, tQuarter);
            topicQuarterMap.set(String(tIdx + 1), tQuarter);
            topicQuarterMap.set(String(tIdx), tQuarter);
        });

        const isFake = (typeof window.isFakeAssessment === 'function') ? window.isFakeAssessment : (item) => {
            if (!item) return true;
            if (item.isFake === true || item.isSample === true) return true;
            const t = String(item.title || item.name || '').trim();
            if (!t) return true;
            if (t.startsWith('"') || t.startsWith("'")) return true;
            const id = String(item.id || '').trim().toLowerCase();
            const authorId = String(item.authorId || item.uid || '').trim().toLowerCase();
            const authorName = String(item.authorName || item.author || '').trim().toLowerCase();
            if (id.includes('sample_01') || authorId === 'teacher_sample_01' || authorName.includes('johnathan smith')) return true;
            return false;
        };

        const isAssessmentAllowed = (item) => {
            if (!item || isFake(item)) return false;
            const aSec = String(item.section || item.roomSection || '').trim().toLowerCase();
            const aAuthorId = String(item.authorId || item.uid || '').trim().toLowerCase();
            const aAuthorName = String(item.authorName || item.author || '').trim().toLowerCase();
            const rawRole = item.authorRole || item.role || (item.isAdmin ? 'Admin' : (item.isTeacher ? 'Teacher' : ''));
            const isTeacherItem = rawRole === 'Teacher' || item.isTeacher;

            // 1. Explicit section tag
            if (aSec && activeSec) {
                const clean = s => String(s || '').replace(/^grade\s*\d+\s*[-–]?\s*/i, '').replace(/[^a-z0-9]/g, '');
                if (aSec !== activeSec && clean(aSec) !== clean(activeSec) && aSec !== 'all') {
                    return false;
                }
                return true;
            }

            // 2. Admin item (institutional) - always distributed to all sections
            if (!isTeacherItem || rawRole === 'Admin' || item.isAdmin || !rawRole) {
                return true;
            }

            // 3. Teacher item without section tag:
            if (assignedTeacherName && (aAuthorName === assignedTeacherName || aAuthorName.includes(assignedTeacherName) || assignedTeacherName.includes(aAuthorName))) {
                return true;
            }
            if (secRecord && typeof window.isSectionAssignedToTeacher === 'function') {
                if (window.isSectionAssignedToTeacher(secRecord, { id: aAuthorId, name: aAuthorName })) {
                    return true;
                }
            }
            if (currentTeacher) {
                const isMatchCurrent = (currentTeacherId && aAuthorId && currentTeacherId === aAuthorId) ||
                    (currentTeacherName && aAuthorName && (currentTeacherName === aAuthorName || currentTeacherName.includes(aAuthorName) || aAuthorName.includes(currentTeacherName)));
                if (isMatchCurrent) {
                    if (!secRecord || !activeSec || (typeof window.isSectionAssignedToTeacher === 'function' && window.isSectionAssignedToTeacher(secRecord, currentTeacher))) {
                        return true;
                    }
                }
            }

            return false;
        };

        const resolveItemType = (item) => {
            const raw = String(item.type || item.category || '').trim().toLowerCase();
            if (raw === 'quiz' || raw === 'quizzes' || item.quizId || item.selectedQuizId) return 'Quiz';
            if (raw === 'activity' || raw === 'activities') return 'Activity';
            if (raw === 'performance task' || raw === 'performance' || raw === 'perf. task') return 'Performance Task';
            if (raw === 'assignment' || raw === 'assignments') return 'Assignment';
            if (raw === 'task' || raw === 'tasks') return 'Task';
            return 'Task';
        };

        const items = [];
        const seenIds = new Set();
        const seenCleanTitles = new Set();

        const addItem = (item, defaultTopicId = '', defaultTopicTitle = '') => {
            if (!item || !isAssessmentAllowed(item)) return;

            const rawType = String(item.type || '').trim().toLowerCase();
            if (rawType === 'lesson' || rawType === 'video' || rawType === 'handout' || rawType === 'resource') return;

            const aType = resolveItemType(item);
            const tId = String(item.topicId !== undefined && item.topicId !== '' ? item.topicId : defaultTopicId || '');
            let tTitle = item.topicTitle || defaultTopicTitle || topicTitleMap.get(tId) || '';
            if (!tTitle && topics.length > 0) {
                tTitle = topics[0].title || topics[0].name || 'Topic 1';
            }
            if (!tTitle) tTitle = 'Basic Syntax and Data Types';

            const cleanTitle = String(item.title || item.name || '').trim().toLowerCase().replace(/\.(pdf|docx|pptx|ppt)$/i, '');
            if (!cleanTitle) return;

            const itemId = String(item.id || `assess-${cleanTitle}-${tId || '0'}`);
            if (seenIds.has(itemId) || seenCleanTitles.has(cleanTitle)) {
                return;
            }

            seenIds.add(itemId);
            seenCleanTitles.add(cleanTitle);

            const rName = item.rubricFileName || item.perfRubricFileName || (typeof item.rubric === 'string' ? item.rubric : (item.rubric?.fileName || item.rubric?.title || '')) || '';

            items.push({
                ...item,
                id: itemId,
                title: item.title || item.name || `${aType}`,
                type: aType,
                category: 'assessment',
                quarter: String(item.quarter || topicQuarterMap.get(tId) || 'q1').toLowerCase(),
                topicId: tId,
                topicTitle: tTitle,
                dueTime: item.dueDate || item.dueTime || '',
                rubric: item.rubric || null,
                rubricName: rName,
                rubricFile: item.rubricFile || null,
                rubricFileName: item.rubricFileName || item.perfRubricFileName || rName,
                hasRubric: Boolean(item.hasRubric || item.rubric || item.rubricFileName || item.perfRubricFileName || rName),
                attachments: item.attachments || [],
                rawItem: item
            });
        };

        // 1. Collect materials from topics
        topics.forEach((t, tIdx) => {
            const topicTitle = t.title || t.name || `Topic ${tIdx + 1}`;
            const topicId = String(t.id !== undefined ? t.id : `topic-${tIdx + 1}`);

            ['assignments', 'tasks', 'quizzes', 'activities', 'performanceTasks', 'materials'].forEach(prop => {
                if (Array.isArray(t[prop])) {
                    t[prop].forEach(m => addItem(m, topicId, topicTitle));
                }
            });
        });

        // 2. Collect from sigma-admin-subjects and master subject records
        try {
            const subjectStoreKeys = ['sigma-admin-subjects', 'sigma_subjects_v2', 'sigma-teacher-subjects', 'sigma_subjects'];
            const candidateIds = [resolvedSubjectId, subjectId, cleanId, `card-${cleanId}`, `subj-${cleanId}`].filter(Boolean);
            for (const storeKey of subjectStoreKeys) {
                const subjs = (typeof getStoredJson === 'function') ? getStoredJson(storeKey, []) : JSON.parse(localStorage.getItem(storeKey) || '[]');
                if (Array.isArray(subjs)) {
                    for (const subj of subjs) {
                        if (!subj) continue;
                        const sId = String(subj.id || '').toLowerCase();
                        const sCode = String(subj.code || '').toLowerCase();
                        const isMatch = candidateIds.some(cid => String(cid).toLowerCase() === sId || String(cid).toLowerCase() === sCode);
                        if (isMatch) {
                            if (Array.isArray(subj.materials)) {
                                subj.materials.forEach(m => {
                                    const mTopicId = String(m.topicId || '');
                                    const mTopicTitle = m.topicTitle || topicTitleMap.get(mTopicId) || '';
                                    addItem(m, mTopicId, mTopicTitle);
                                });
                            }
                            if (Array.isArray(subj.topics)) {
                                subj.topics.forEach((t, tIdx) => {
                                    const tTitle = t.title || t.name || `Topic ${tIdx + 1}`;
                                    const tId = String(t.id !== undefined ? t.id : `topic-${tIdx + 1}`);
                                    ['assignments', 'tasks', 'quizzes', 'activities', 'performanceTasks', 'materials'].forEach(prop => {
                                        if (Array.isArray(t[prop])) {
                                            t[prop].forEach(m => addItem(m, tId, tTitle));
                                        }
                                    });
                                });
                            }
                        }
                    }
                }
            }
        } catch (e) {}

        // 3. Collect from custom materials / assessments keys
        try {
            const assessSources = [
                localStorage.getItem(`sigma_custom_assessments_${resolvedSubjectId}`),
                localStorage.getItem(`sigma_assessments_${resolvedSubjectId}`),
                localStorage.getItem(`sigma_custom_materials_${resolvedSubjectId}`),
                localStorage.getItem(`sigma_materials_${resolvedSubjectId}`),
                localStorage.getItem(`sigma_custom_assessments_${cleanId}`),
                localStorage.getItem(`sigma_assessments_${cleanId}`),
                localStorage.getItem(`sigma_custom_materials_${cleanId}`),
                localStorage.getItem(`sigma_materials_${cleanId}`)
            ].filter(Boolean);

            for (const rawMats of assessSources) {
                const parsedMats = JSON.parse(rawMats);
                if (Array.isArray(parsedMats)) {
                    parsedMats.forEach(m => {
                        const mTopicId = String(m.topicId || '');
                        const mTopicTitle = m.topicTitle || topicTitleMap.get(mTopicId) || '';
                        addItem(m, mTopicId, mTopicTitle);
                    });
                }
            }
        } catch (e) {}

        const dedupFn = (typeof window.deduplicateMaterialsArray === 'function') ? window.deduplicateMaterialsArray : (arr => arr);
        return dedupFn(items);
    };

    // ── Standalone Release Learning Materials Modal ───────────────────────────
    window.openTeacherReleaseLearningMaterialsModal = function (fromPicker = false) {
        if (!fromPicker) {
            window.closeManageCurriculumHub?.();
        }
        const subjectId = resolveTeacherActiveSubjectId(typeof currentTopicState !== 'undefined' ? currentTopicState?.subjectId : null);
        const section = resolveTeacherActiveSection(typeof currentTopicState !== 'undefined' ? currentTopicState?.selectedSection : null);
        if (typeof currentTopicState !== 'undefined' && currentTopicState) {
            currentTopicState.subjectId = subjectId;
            currentTopicState.selectedSection = section;
            window.currentTopicState = currentTopicState;
        }
        const allMaterials = window.getTeacherSubjectLearningMaterials(subjectId, section);

        // Section details
        const adminSections = getStoredJson('sigma-admin-sections', []);
        const cleanSectionName = (section || '').trim().toLowerCase();
        const matchedSec = adminSections.find(s => {
            const sName = (s.name || s.sectionName || '').trim().toLowerCase();
            return sName === cleanSectionName || (cleanSectionName && (sName.includes(cleanSectionName) || cleanSectionName.includes(sName)));
        });

        let sectionNameOnly = matchedSec?.name || section;
        let gradeLevel = matchedSec?.grade || (section.includes('Grade 12') ? 'Grade 12' : 'Grade 11');
        let roomNumber = matchedSec?.room || '302';
        let schoolYear = matchedSec?.schoolYear || '2026–2027';

        if (!matchedSec && section && section.includes(' - ')) {
            const parts = section.split(' - ');
            if (parts[0].includes('Grade')) gradeLevel = parts[0].trim();
            sectionNameOnly = parts.slice(1).join(' - ').trim() || section;
        }

        // Release configuration
        let releaseConfig = { releasedMaterialIds: [], hiddenMaterialIds: [], materialReleaseDates: {}, materialSchedules: {} };
        try {
            const saved = (typeof window.getLearningMaterialReleaseConfig === 'function')
                ? window.getLearningMaterialReleaseConfig(subjectId, section)
                : getStoredJson(`sigma_learning_release_${subjectId}_${section}`, null);
            if (saved) releaseConfig = { ...releaseConfig, ...saved };
        } catch (e) {}
        if (!Array.isArray(releaseConfig.releasedMaterialIds)) releaseConfig.releasedMaterialIds = [];
        if (!Array.isArray(releaseConfig.hiddenMaterialIds)) releaseConfig.hiddenMaterialIds = [];
        if (!releaseConfig.materialReleaseDates) releaseConfig.materialReleaseDates = {};

        // Draft state
        if (!window._learningMaterialsReleaseDraftState || !fromPicker) {
            window._learningMaterialsReleaseDraftState = {
                pendingMaterialIds: (window._learningMaterialsReleaseDraftState?.pendingMaterialIds && fromPicker)
                    ? window._learningMaterialsReleaseDraftState.pendingMaterialIds
                    : []
            };
        }
        const pendingIds = window._learningMaterialsReleaseDraftState.pendingMaterialIds || [];
        const releasedIds = releaseConfig.releasedMaterialIds.map(String);

        const availableQuarters = (typeof window.getSubjectReleaseQuarters === 'function')
            ? window.getSubjectReleaseQuarters(subjectId)
            : ['q1', 'q2'];
        let activeQuarter = (typeof window.getActiveReleaseQuarter === 'function') ? window.getActiveReleaseQuarter() : 'q1';
        if (!availableQuarters.includes(activeQuarter.toLowerCase())) {
            activeQuarter = availableQuarters[0] || 'q1';
            window.setActiveReleaseQuarter?.(activeQuarter);
        }
        const quarterMaterials = allMaterials.filter(m => (m.quarter || 'q1').toLowerCase() === activeQuarter.toLowerCase());

        const pendingList = quarterMaterials.filter(m => pendingIds.includes(String(m.id)));
        const releasedList = quarterMaterials.filter(m => releasedIds.includes(String(m.id)));

        // Helper date formatter
        const formatDateText = (isoStr) => {
            if (!isoStr) {
                const now = new Date();
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                let h = now.getHours();
                const m = now.getMinutes();
                const p = h >= 12 ? 'PM' : 'AM';
                if (h > 12) h -= 12;
                if (h === 0) h = 12;
                return `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()} • ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${p}`;
            }
            try {
                const d = new Date(isoStr);
                if (!isNaN(d.getTime())) {
                    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    let h = d.getHours();
                    const m = d.getMinutes();
                    const p = h >= 12 ? 'PM' : 'AM';
                    if (h > 12) h -= 12;
                    if (h === 0) h = 12;
                    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} • ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${p}`;
                }
            } catch (e) {}
            return isoStr;
        };

        // Helper to group items by Topic
        const groupItemsByTopic = (items) => {
            const groups = [];
            const groupMap = new Map();
            items.forEach(item => {
                const topicKey = item.topicTitle || 'General Topic';
                if (!groupMap.has(topicKey)) {
                    const groupObj = { topicTitle: topicKey, items: [] };
                    groupMap.set(topicKey, groupObj);
                    groups.push(groupObj);
                }
                groupMap.get(topicKey).items.push(item);
            });
            return groups;
        };

        // Pending Selected HTML
        let selectedHtml = '';
        if (pendingList.length > 0) {
            const groupedPending = groupItemsByTopic(pendingList);
            selectedHtml = `
                <div class="border-y border-black/10 border-x-0 rounded-none sigma-selected-faded-panel overflow-hidden font-['Inter'] divide-y divide-black/10">
                    ${groupedPending.map(group => `
                        <div class="topic-group-block">
                            <div class="px-4 py-2 bg-black/[0.03] border-b border-black/10 flex items-center gap-2">
                                <i class="fa-solid fa-book-bookmark text-xs text-[#15803d]"></i>
                                <span class="text-xs font-bold text-black font-['Inter']">${escapeHtml(group.topicTitle)}</span>
                            </div>
                            <div class="divide-y divide-black/10">
                                ${group.items.map(m => {
                                    const isVid = m.type === 'Video';
                                    const iconClass = isVid ? 'fa-solid fa-circle-play text-red-600' : 'fa-solid fa-file-lines text-blue-600';
                                    const bgClass = isVid ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100';
                                    return `
                                        <div class="p-3.5 hover:bg-black/[0.03] transition-colors flex items-center justify-between">
                                            <div class="flex items-center gap-3.5 min-w-0 flex-1">
                                                <div class="w-9 h-9 rounded-xl ${bgClass} border flex items-center justify-center shrink-0">
                                                    <i class="${iconClass} text-sm"></i>
                                                </div>
                                                <div class="min-w-0 flex-1">
                                                    <p class="text-xs sm:text-sm font-bold text-black tracking-tight">${escapeHtml(m.title)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        // Released Materials HTML
        let releasedHtml = '';
        if (releasedList.length > 0) {
            const groupedReleased = groupItemsByTopic(releasedList);
            releasedHtml = `
                <div class="border-y border-black/10 border-x-0 rounded-none sigma-selected-faded-panel overflow-hidden font-['Inter'] divide-y divide-black/10">
                    ${groupedReleased.map(group => `
                        <div class="topic-group-block">
                            <div class="px-4 py-2 bg-black/[0.03] border-b border-black/10 flex items-center gap-2">
                                <i class="fa-solid fa-book-bookmark text-xs text-[#15803d]"></i>
                                <span class="text-xs font-bold text-black font-['Inter']">${escapeHtml(group.topicTitle)}</span>
                            </div>
                            <div class="divide-y divide-black/10">
                                ${group.items.map(m => {
                                    const isVid = m.type === 'Video';
                                    const isHidden = releaseConfig.hiddenMaterialIds.map(String).includes(String(m.id));
                                    const iconClass = isVid ? 'fa-solid fa-circle-play text-red-600' : 'fa-solid fa-file-lines text-blue-600';
                                    const bgClass = isVid ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100';
                                    const dateText = formatDateText(releaseConfig.materialReleaseDates[m.id]);
                                    const matSchedule = releaseConfig.materialSchedules ? releaseConfig.materialSchedules[m.id] : null;
                                    const isFuture = matSchedule && matSchedule !== 'now' && matSchedule !== 'immediate' && (!isNaN(new Date(matSchedule).getTime()) && new Date(matSchedule).getTime() > Date.now());
                                    const relDateText = isFuture ? formatDateText(matSchedule) : dateText;

                                    return `
                                        <div class="p-3.5 hover:bg-black/[0.03] transition-colors flex items-center justify-between relative font-['Inter']">
                                            <div class="flex items-start gap-3.5 min-w-0 flex-1">
                                                <div class="w-9 h-9 rounded-xl ${bgClass} border flex items-center justify-center shrink-0">
                                                    <i class="${iconClass} text-sm"></i>
                                                </div>
                                                <div class="min-w-0 flex-1">
                                                    <div class="flex items-center gap-2 flex-wrap">
                                                        <p class="text-xs sm:text-sm font-bold text-black tracking-tight">${escapeHtml(m.title)}</p>
                                                        ${isHidden ? `
                                                            <div class="inline-flex items-center gap-1.5 text-xs font-semibold text-black shrink-0">
                                                                <i class="fa-solid fa-eye-slash text-xs text-black"></i>
                                                                <span>Hidden</span>
                                                            </div>
                                                        ` : (isFuture ? `
                                                            <div class="inline-flex items-center gap-1.5 text-xs font-semibold text-black shrink-0">
                                                                <i class="fa-solid fa-clock text-xs text-black"></i>
                                                                <span>Scheduled</span>
                                                            </div>
                                                        ` : '')}
                                                    </div>
                                                    <p class="text-[10px] font-normal text-black-fade mt-0.5">${relDateText}</p>
                                                </div>
                                            </div>
                                            <div class="shrink-0 ml-4 flex items-center gap-3">
                                                <button type="button" id="released-learning-btn-${escapeHtml(String(m.id))}"
                                                    onclick="window.toggleReleasedLearningMaterialMenu?.('${escapeHtml(String(m.id))}', '${escapeHtml(m.title)}', ${isHidden ? 'true' : 'false'}, event)"
                                                    class="w-7 h-7 flex items-center justify-center text-black hover:text-[#FFD000] transition-colors cursor-pointer"
                                                    title="Options">
                                                    <i class="fa-solid fa-ellipsis-vertical text-base"></i>
                                                </button>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            const quarterLabel = (typeof window.getReleaseQuarterLabel === 'function') ? window.getReleaseQuarterLabel(activeQuarter) : '1st Quarter';
            releasedHtml = `
                <div class="sigma-empty-state-black-fade p-6 rounded-2xl border-2 border-dashed border-black/10 bg-black/[0.02] text-center font-['Inter']">
                    <p class="empty-title text-xs font-semibold text-black/60 font-['Inter']" style="color: rgba(0,0,0,0.60);">No ${quarterLabel} Learning Materials Released Yet</p>
                    <p class="empty-desc text-[11px] font-normal text-black-fade mt-0.5 font-['Inter']" style="color: rgba(0,0,0,0.45);">Click "Select Materials" to choose video lectures and lesson handouts to release for this section</p>
                </div>
            `;
        }

        let overlay = document.getElementById('teacher-release-learning-materials-overlay');
        let isNew = false;
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'teacher-release-learning-materials-overlay';
            overlay.className = 'curriculum-hub-overlay';
            overlay.dataset._historyPushed = 'true';
            overlay.onclick = function (e) {
                window.closeAllReleasedTopicActionMenus?.();
                e.stopPropagation();
            };
            isNew = true;
        } else {
            overlay.className = 'curriculum-hub-overlay';
            overlay.classList.remove('hidden');
            overlay.style.display = '';
        }

        if (isNew && !fromPicker && typeof window.pushModalHistoryState === 'function') {
            window.pushModalHistoryState('teacher-release-learning-materials-overlay');
        }

        overlay.innerHTML = `
            <div class="curriculum-hub-panel curriculum-release-panel-fixed w-full !max-w-[860px] flex flex-col overflow-hidden" style="height: 740px; min-height: min(740px, calc(100vh - 40px)); max-height: calc(100vh - 40px); max-width: 860px;" onclick="window.closeAllReleasedTopicActionMenus?.(); event.stopPropagation()">
                <!-- Header -->
                <div class="px-6 sm:px-8 py-5 border-b border-slate-100 flex items-center justify-between shrink-0 font-['Inter']">
                    <div>
                        <h2 class="text-xl font-bold text-black font-['Inter'] tracking-tight">Release Learning Materials</h2>
                        <p class="text-xs font-medium text-black-fade font-['Inter'] mt-0.5">Manage learning materials visibility and release schedule for students</p>
                    </div>
                </div>

                <!-- Main Content -->
                <div class="p-6 sm:p-8 py-6 overflow-y-auto flex-1 space-y-6 font-['Inter']">
                    <!-- Context Strip -->
                    <div class="flex flex-wrap items-center gap-2 sm:gap-4 px-4 py-2.5 bg-black/[0.03] border border-black/10 rounded-xl text-xs font-['Inter'] font-medium text-black">
                        <span><b>Section:</b> ${escapeHtml(sectionNameOnly)}</span>
                        <span class="text-black/20">|</span>
                        <span><b>Grade:</b> ${escapeHtml(gradeLevel)}</span>
                        <span class="text-black/20">|</span>
                        <span><b>Room:</b> ${escapeHtml(roomNumber)}</span>
                        <span class="text-black/20">|</span>
                        <span><b>SY:</b> ${escapeHtml(schoolYear)}</span>
                    </div>

                    <!-- Quarter Filter Tabs (Below Context Strip) -->
                    <div class="flex items-center justify-start">
                        ${window.renderReleaseQuarterToggleHtml?.(subjectId, activeQuarter)}
                    </div>

                    <!-- Released Learning Materials Section -->
                    <div class="space-y-3 font-['Inter']">
                        <div class="release-section-header-bar flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b-2 border-black transition-colors gap-1.5 sm:gap-3 w-full">
                            <div class="flex items-center gap-2.5 min-w-0">
                                <button type="button" onclick="window.openTeacherLearningMaterialsPickerModal?.()"
                                    class="inline-flex items-center gap-2 text-sm sm:text-[17px] font-bold text-black hover:text-[#FFD000] transition-colors cursor-pointer font-['Inter'] tracking-tight text-left">
                                    <i class="fa-solid fa-plus text-sm sm:text-base text-[#15803d] shrink-0"></i>
                                    <span class="whitespace-nowrap">Select Materials</span>
                                </button>
                            </div>
                            <p class="release-section-subtitle text-[11px] sm:text-xs font-normal text-left sm:text-right shrink-0" style="color: rgba(0,0,0,0.45);">Learning materials configured for release for this section</p>
                        </div>
                        ${releasedHtml}
                    </div>
                </div>

                <!-- Footer -->
                <div class="px-6 sm:px-8 py-5 flex items-center justify-end gap-3 shrink-0 font-['Inter']">
                    <button type="button" onclick="window.closeTeacherReleaseLearningMaterialsModal?.(false)"
                        class="sigma-btn sigma-btn-white sigma-btn-md cursor-pointer font-['Inter']">
                        Close
                    </button>
                </div>
            </div>
        `;

        if (isNew) {
            document.body.appendChild(overlay);
        }
        overlay.classList.remove('hidden');
        overlay.style.display = '';
        if (typeof window.lockBodyScroll === 'function') window.lockBodyScroll();
        overlay.classList.add('curriculum-hub-overlay--visible');
    };

    window.cancelTeacherReleaseLearningMaterialsDraft = function () {
        if (window._learningMaterialsReleaseDraftState) {
            window._learningMaterialsReleaseDraftState.pendingMaterialIds = [];
        }
        window.openTeacherReleaseLearningMaterialsModal(true);
    };

    // ── Dedicated Sub-Modal for Learning Materials Picker ─────────────────────
    window.openTeacherLearningMaterialsPickerModal = function () {
        const subjectId = (typeof resolveTeacherActiveSubjectId === 'function')
            ? resolveTeacherActiveSubjectId(typeof currentTopicState !== 'undefined' ? currentTopicState?.subjectId : null)
            : ((typeof currentTopicState !== 'undefined' ? currentTopicState?.subjectId : null) || window.currentTopicState?.subjectId || 'card-prog1');
        const section = (typeof resolveTeacherActiveSection === 'function')
            ? resolveTeacherActiveSection(typeof currentTopicState !== 'undefined' ? currentTopicState?.selectedSection : null)
            : ((typeof currentTopicState !== 'undefined' ? currentTopicState?.selectedSection : null) || window.currentTopicState?.selectedSection || '');
        if (typeof currentTopicState !== 'undefined' && currentTopicState) {
            currentTopicState.subjectId = subjectId;
            currentTopicState.selectedSection = section;
            window.currentTopicState = currentTopicState;
        }
        const allMaterials = window.getTeacherSubjectLearningMaterials(subjectId, section);

        // Section details
        const adminSections = getStoredJson('sigma-admin-sections', []);
        const cleanSectionName = (section || '').trim().toLowerCase();
        const matchedSec = adminSections.find(s => {
            const sName = (s.name || s.sectionName || '').trim().toLowerCase();
            return sName === cleanSectionName || (cleanSectionName && (sName.includes(cleanSectionName) || cleanSectionName.includes(sName)));
        });

        let sectionNameOnly = matchedSec?.name || section;
        let gradeLevel = matchedSec?.grade || (section.includes('Grade 12') ? 'Grade 12' : 'Grade 11');
        let roomNumber = matchedSec?.room || '302';
        let schoolYear = matchedSec?.schoolYear || '2026–2027';

        if (!matchedSec && section && section.includes(' - ')) {
            const parts = section.split(' - ');
            if (parts[0].includes('Grade')) gradeLevel = parts[0].trim();
            sectionNameOnly = parts.slice(1).join(' - ').trim() || section;
        }

        // Already released materials
        let releaseConfig = { releasedMaterialIds: [] };
        try {
            const saved = getStoredJson(`sigma_learning_release_${subjectId}_${section}`, null);
            if (saved && Array.isArray(saved.releasedMaterialIds)) releaseConfig = saved;
        } catch (e) {}
        const releasedIds = releaseConfig.releasedMaterialIds.map(String);

        const availableQuarters = (typeof window.getSubjectReleaseQuarters === 'function')
            ? window.getSubjectReleaseQuarters(subjectId)
            : ['q1', 'q2'];
        let activeQuarter = (typeof window.getActiveReleaseQuarter === 'function') ? window.getActiveReleaseQuarter() : 'q1';
        if (!availableQuarters.includes(activeQuarter.toLowerCase())) {
            activeQuarter = availableQuarters[0] || 'q1';
            window.setActiveReleaseQuarter?.(activeQuarter);
        }
        const quarterMaterials = allMaterials.filter(m => (m.quarter || 'q1').toLowerCase() === activeQuarter.toLowerCase());

        // Unreleased items
        const unreleased = quarterMaterials.filter(m => !releasedIds.includes(String(m.id)));
        const unreleasedVideos = unreleased.filter(m => m.type === 'Video');
        const unreleasedLessons = unreleased.filter(m => m.type === 'Lesson');

        const draftPendingIds = window._learningMaterialsReleaseDraftState?.pendingMaterialIds || [];

        // Hide manager modal temporarily without tearing it down
        const prevModal = document.getElementById('teacher-release-learning-materials-overlay');

        let existing = document.getElementById('teacher-learning-picker-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'teacher-learning-picker-overlay';
        overlay.className = 'curriculum-hub-overlay curriculum-hub-overlay--visible';
        overlay.dataset._historyPushed = 'true';
        overlay.onclick = function (e) { e.stopPropagation(); };

        if (typeof window.pushModalHistoryState === 'function') {
            window.pushModalHistoryState('teacher-learning-picker-overlay');
        }

        window._learningMaterialsPickerWorkingIds = [...draftPendingIds];
        window._learningMaterialsPickerUnreleasedList = unreleased;
        window.syncCurrentLearningItemCheck = function (input) {
            if (!Array.isArray(window._learningMaterialsPickerWorkingIds)) {
                window._learningMaterialsPickerWorkingIds = [];
            }
            const id = String(input.value);
            const arr = window._learningMaterialsPickerWorkingIds.map(String);
            if (input.checked) {
                if (!arr.includes(id)) arr.push(id);
            } else {
                const idx = arr.indexOf(id);
                if (idx !== -1) arr.splice(idx, 1);
            }
            window._learningMaterialsPickerWorkingIds = arr;
            window.syncLearningPickerSubmitBtn?.();
        };

        const quarterLabel = (typeof window.getReleaseQuarterLabel === 'function') ? window.getReleaseQuarterLabel(activeQuarter) : '1st Quarter';
        window.renderLearningPickerGroupedList = function (list, emptyLabel = 'materials') {
            const currentWorking = window._learningMaterialsPickerWorkingIds || [];
            if (!list || list.length === 0) {
                return `
                    <div class="sigma-empty-state-black-fade p-6 rounded-2xl border-2 border-dashed border-black/10 bg-black/[0.02] text-center font-['Inter']">
                        <p class="empty-title text-xs font-semibold text-black/60 font-['Inter']" style="color: rgba(0,0,0,0.60);">No ${quarterLabel} ${String(emptyLabel || '').replace(/\b\w/g, function (ch) { return ch.toUpperCase(); })} Available to Release</p>
                        <p class="empty-desc text-[11px] font-normal text-black-fade mt-0.5 font-['Inter']" style="color: rgba(0,0,0,0.45);">All matching items may have already been released or none match this category.</p>
                    </div>
                `;
            }

            // Group items by topic
            const topicMap = new Map();
            list.forEach(m => {
                const topicKey = (m.topicTitle && m.topicTitle.trim()) ? m.topicTitle.trim() : 'General Curriculum';
                if (!topicMap.has(topicKey)) {
                    topicMap.set(topicKey, []);
                }
                topicMap.get(topicKey).push(m);
            });

            return `
                <div class="space-y-3.5 font-['Inter']">
                    ${Array.from(topicMap.entries()).map(([topicName, items]) => `
                        <div class="border border-black/10 rounded-xl overflow-hidden bg-white shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                            <!-- Topic Section Header -->
                            <div class="px-4 py-2.5 bg-black/[0.04] border-b border-black/10 flex items-center justify-between">
                                <div class="flex items-center gap-2 min-w-0">
                                    <span class="inline-flex items-center justify-center w-5 h-5 rounded-md bg-[#15803d]/10 text-[#15803d] shrink-0">
                                        <i class="fa-solid fa-book-bookmark text-[10px]"></i>
                                    </span>
                                    <span class="text-xs font-bold text-black font-['Inter'] tracking-tight truncate">
                                        Topic: ${escapeHtml(topicName)}
                                    </span>
                                </div>
                                <span class="text-[11px] font-semibold text-black/60 shrink-0 font-['Inter'] px-2 py-0.5 rounded-full bg-black/[0.05]">
                                    ${items.length} ${items.length === 1 ? 'item' : 'items'}
                                </span>
                            </div>
                            <!-- Items under this topic -->
                            <div class="divide-y divide-black/5">
                                ${items.map(m => {
                                    const isChecked = currentWorking.includes(String(m.id));
                                    const isVid = m.type === 'Video';
                                    const iconClass = isVid ? 'fa-solid fa-circle-play text-red-600' : 'fa-solid fa-file-lines text-blue-600';
                                    const bgClass = isVid ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100';
                                    return `
                                        <label class="p-3 hover:bg-black/[0.02] flex items-center justify-between gap-3.5 cursor-pointer transition-colors">
                                             <div class="flex items-center gap-3 min-w-0 flex-1">
                                                <div class="w-7 h-7 rounded-lg ${bgClass} border flex items-center justify-center shrink-0">
                                                    <i class="${iconClass} text-xs"></i>
                                                </div>
                                                <div class="min-w-0 flex-1">
                                                    <h4 class="text-xs font-bold text-black font-['Inter'] truncate">${escapeHtml(m.title)}</h4>
                                                </div>
                                            </div>
                                            <input type="checkbox" name="picker-learning-item" value="${escapeHtml(String(m.id))}" ${isChecked ? 'checked' : ''}
                                                style="accent-color: #15803d;"
                                                onchange="window.syncCurrentLearningItemCheck?.(this)"
                                                class="w-4 h-4 rounded border-slate-300 accent-[#15803d] text-[#15803d] focus:ring-0 cursor-pointer shrink-0" />
                                        </label>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        };

        overlay.innerHTML = `
            <div class="curriculum-hub-panel curriculum-picker-panel-fixed curriculum-release-panel-fixed w-full !max-w-[860px] flex flex-col overflow-hidden" style="height: 740px; min-height: min(740px, calc(100vh - 40px)); max-height: calc(100vh - 40px); max-width: 860px;" onclick="event.stopPropagation()">
                <!-- Header -->
                <div class="px-6 sm:px-8 py-5 border-b border-slate-100 flex items-center justify-between shrink-0 font-['Inter']">
                    <div class="flex items-center gap-3">
                        <button type="button" 
                            class="picker-header-back-btn p-1 bg-transparent hover:bg-transparent flex sm:hidden items-center justify-center text-black hover:text-black/70 transition-colors cursor-pointer shrink-0 border-0 outline-none"
                            onclick="window.closeTeacherLearningPickerModal?.(true, true)"
                            title="Back">
                            <i class="fa-solid fa-chevron-left text-sm text-black"></i>
                        </button>
                        <div>
                            <h2 class="text-xl font-bold text-black font-['Inter'] tracking-tight">Select Learning Materials to Release</h2>
                            <p class="text-xs font-medium text-black-fade font-['Inter'] mt-0.5">Select curriculum resources to make available for this section</p>
                        </div>
                    </div>
                </div>

                <!-- Main Content -->
                <div class="p-6 sm:p-8 py-5 overflow-y-auto flex-1 space-y-4 font-['Inter']">
                    <!-- Context Strip -->
                    <div class="flex flex-wrap items-center gap-2 sm:gap-4 px-4 py-2 bg-black/[0.03] border border-black/10 rounded-xl text-xs font-['Inter'] font-medium text-black">
                        <span><b>Section:</b> ${escapeHtml(sectionNameOnly)}</span>
                        <span class="text-black/20">|</span>
                        <span><b>Grade:</b> ${escapeHtml(gradeLevel)}</span>
                        <span class="text-black/20">|</span>
                        <span><b>Room:</b> ${escapeHtml(roomNumber)}</span>
                        <span class="text-black/20">|</span>
                        <span><b>SY:</b> ${escapeHtml(schoolYear)}</span>
                    </div>

                    <!-- Quarter Filter Tabs (Below Context Strip) -->
                    <div class="flex items-center justify-start">
                        ${window.renderReleaseQuarterToggleHtml?.(subjectId, activeQuarter)}
                    </div>

                    <!-- Category Filter Chips (Pill Design) -->
                    <div class="flex flex-wrap items-center justify-between border-b border-black/10 pb-2.5 pt-1 gap-2 font-['Inter']">
                        <div class="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5" id="learning-picker-filter-chips">
                            <button type="button" onclick="window.setLearningPickerFilter('all')" id="learning-filter-all"
                                class="quiz-storage-filter-chip px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer bg-[#15803d] text-white shadow-2xs" data-filter="all">
                                All
                            </button>
                            <button type="button" onclick="window.setLearningPickerFilter('videos')" id="learning-filter-videos"
                                class="quiz-storage-filter-chip px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 bg-slate-100 text-black-fade hover:text-black hover:bg-slate-200/70" data-filter="videos">
                                <i class="fa-solid fa-circle-play text-[11px]"></i>
                                <span>Draft Videos (${unreleasedVideos.length})</span>
                            </button>
                            <button type="button" onclick="window.setLearningPickerFilter('lessons')" id="learning-filter-lessons"
                                class="quiz-storage-filter-chip px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 bg-slate-100 text-black-fade hover:text-black hover:bg-slate-200/70" data-filter="lessons">
                                <i class="fa-solid fa-file-lines text-[11px]"></i>
                                <span>Draft Lessons (${unreleasedLessons.length})</span>
                            </button>
                        </div>
                        <div class="flex items-center gap-1 text-xs font-semibold shrink-0 ml-auto font-['Inter']">
                            <button type="button" onclick="window.selectAllLearningPickerItems()" class="px-2 py-1 rounded-lg text-[#15803d] hover:bg-emerald-50 active:bg-emerald-100 transition-colors cursor-pointer" style="color: #15803d;">Select All</button>
                            <span class="text-slate-300">|</span>
                            <button type="button" onclick="window.deselectAllLearningPickerItems()" class="px-2 py-1 rounded-lg text-[#15803d] hover:bg-emerald-50 active:bg-emerald-100 transition-colors cursor-pointer" style="color: #15803d;">Deselect All</button>
                        </div>
                    </div>

                    <!-- Materials Container -->
                    <div id="learning-picker-content-container" class="space-y-1 font-['Inter']">
                        ${window.renderLearningPickerGroupedList(unreleased, 'learning materials')}
                    </div>
                </div>

                <!-- Footer -->
                <div class="px-6 sm:px-8 py-4 sm:py-5 flex items-center justify-between gap-3 shrink-0 font-['Inter'] w-full">
                    <button type="button" onclick="window.closeTeacherLearningPickerModal?.(true, true)"
                        class="picker-footer-back-btn sigma-btn sigma-btn-white sigma-btn-md cursor-pointer font-['Inter']">
                        Back
                    </button>
                    <button type="button" id="learning-picker-submit-btn" onclick="window.submitLearningMaterialsPicker?.()"
                        disabled
                        class="sigma-btn sigma-btn-primary h-9 sm:h-[42px] px-5 sm:px-7 text-xs sm:text-sm font-semibold rounded-xl opacity-40 cursor-not-allowed pointer-events-none font-['Inter'] inline-flex items-center gap-2 order-2 ml-auto">
                        <span>Set Schedule</span>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        if (prevModal && prevModal !== overlay) {
            prevModal.classList.add('hidden');
        }
        window.syncLearningPickerSubmitBtn?.();
    };

    window.syncLearningPickerSubmitBtn = function () {
        const currentWorking = window._learningMaterialsPickerWorkingIds || [];
        const selectBtn = document.getElementById('learning-picker-submit-btn');
        if (selectBtn) {
            const count = currentWorking.length;
            if (count > 0) {
                selectBtn.disabled = false;
                selectBtn.className = "sigma-btn sigma-btn-primary sigma-btn-md cursor-pointer font-['Inter'] inline-flex items-center gap-2";
                selectBtn.innerHTML = `
                    <span>Set Schedule</span>
                    ${count > 1 ? `
                        <span class="px-1.5 py-0.5 rounded-full bg-white/20 text-white text-xs font-bold leading-none min-w-[20px] text-center">
                            ${count}
                        </span>
                    ` : ''}
                `;
            } else {
                selectBtn.disabled = true;
                selectBtn.className = "sigma-btn sigma-btn-primary sigma-btn-md font-['Inter'] opacity-40 cursor-not-allowed pointer-events-none inline-flex items-center gap-2";
                selectBtn.innerHTML = `<span>Set Schedule</span>`;
            }
        }
    };

    window.closeTeacherLearningPickerModal = function (returnToReleaseModal = false, isCancel = false) {
        if (returnToReleaseModal) {
            if (isCancel && window._learningMaterialsReleaseDraftState) {
                window._learningMaterialsReleaseDraftState.pendingMaterialIds = [];
            }
            window._learningMaterialsPickerWorkingIds = [];
            const prev = document.getElementById('teacher-release-learning-materials-overlay');
            if (prev) {
                prev.classList.remove('hidden');
                prev.style.display = '';
                prev.classList.add('curriculum-hub-overlay--visible');
            } else {
                window.openTeacherReleaseLearningMaterialsModal?.(true);
            }
        } else {
            window.closeManageCurriculumHub?.();
            document.querySelectorAll('#curriculum-hub-overlay, #teacher-release-learning-materials-overlay, #teacher-learning-picker-overlay, #teacher-topic-schedule-overlay').forEach(el => el.remove());
            if (typeof window.unlockBodyScroll === 'function') window.unlockBodyScroll();
        }
        const overlay = document.getElementById('teacher-learning-picker-overlay');
        if (overlay) overlay.remove();
    };

    window.setAssessmentsPickerFilter = function (filter) {
        document.querySelectorAll('#teacher-assessments-picker-overlay input[name="picker-assessment-item"]').forEach(el => {
            window.syncCurrentAssessmentItemCheck?.(el);
        });

        const filterIds = ['all', 'quiz', 'task', 'assign', 'act', 'pt'];
        filterIds.forEach(f => {
            const btn = document.getElementById(`assess-filter-${f}`);
            if (!btn) return;
            const hasIcon = btn.querySelector('i') !== null;
            if (f === filter) {
                btn.className = `quiz-storage-filter-chip px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${hasIcon ? 'flex items-center gap-1.5' : ''} bg-[#15803d] text-white shadow-2xs`;
            } else {
                btn.className = `quiz-storage-filter-chip px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${hasIcon ? 'flex items-center gap-1.5' : ''} bg-slate-100 text-black-fade hover:text-black hover:bg-slate-200/70`;
            }
        });

        const all = window._assessmentsPickerUnreleasedList || [];
        let filtered = all;
        let emptyLabel = 'assessments';
        if (filter === 'quiz') {
            filtered = all.filter(m => m.type === 'Quiz');
            emptyLabel = 'quizzes';
        } else if (filter === 'task' || filter === 'tasks' || filter === 'assign' || filter === 'act' || filter === 'pt') {
            filtered = all.filter(m => m.type === 'Task' || m.type === 'Assignment' || m.type === 'Activity' || m.type === 'Performance Task');
            emptyLabel = 'tasks';
        }

        const container = document.getElementById('assess-picker-content-container');
        if (container && typeof window.renderAssessmentsPickerGroupedList === 'function') {
            container.innerHTML = window.renderAssessmentsPickerGroupedList(filtered, emptyLabel);
        }
        window.syncAssessmentsPickerSubmitBtn?.();
    };

    window.setLearningPickerFilter = function (filter) {
        document.querySelectorAll('#teacher-learning-picker-overlay input[name="picker-learning-item"]').forEach(el => {
            window.syncCurrentLearningItemCheck?.(el);
        });

        const filterIds = ['all', 'videos', 'lessons'];
        filterIds.forEach(f => {
            const btn = document.getElementById(`learning-filter-${f}`);
            if (!btn) return;
            const hasIcon = btn.querySelector('i') !== null;
            if (f === filter) {
                btn.className = `quiz-storage-filter-chip px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${hasIcon ? 'flex items-center gap-1.5' : ''} bg-[#15803d] text-white shadow-2xs`;
            } else {
                btn.className = `quiz-storage-filter-chip px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${hasIcon ? 'flex items-center gap-1.5' : ''} bg-slate-100 text-black-fade hover:text-black hover:bg-slate-200/70`;
            }
        });

        const all = window._learningMaterialsPickerUnreleasedList || [];
        let filtered = all;
        let emptyLabel = 'materials';
        if (filter === 'videos') {
            filtered = all.filter(m => m.type === 'Video');
            emptyLabel = 'videos';
        } else if (filter === 'lessons') {
            filtered = all.filter(m => m.type === 'Lesson');
            emptyLabel = 'lessons';
        }

        const container = document.getElementById('learning-picker-content-container');
        if (container && typeof window.renderLearningPickerGroupedList === 'function') {
            container.innerHTML = window.renderLearningPickerGroupedList(filtered, emptyLabel);
        }
        window.syncLearningPickerSubmitBtn?.();
    };

    window.switchLearningPickerTab = function (tab) {
        window.setLearningPickerFilter(tab);
    };

    window.selectAllLearningPickerItems = function () {
        const unreleased = window._learningMaterialsPickerUnreleasedList || [];
        window._learningMaterialsPickerWorkingIds = unreleased.map(m => String(m.id));
        document.querySelectorAll('#teacher-learning-picker-overlay input[name="picker-learning-item"]').forEach(el => {
            el.checked = true;
        });
        window.syncLearningPickerSubmitBtn?.();
    };

    window.deselectAllLearningPickerItems = function () {
        window._learningMaterialsPickerWorkingIds = [];
        document.querySelectorAll('#teacher-learning-picker-overlay input[name="picker-learning-item"]').forEach(el => {
            el.checked = false;
        });
        window.syncLearningPickerSubmitBtn?.();
    };

    window.submitLearningMaterialsPicker = function () {
        document.querySelectorAll('#teacher-learning-picker-overlay input[name="picker-learning-item"]').forEach(el => {
            window.syncCurrentLearningItemCheck?.(el);
        });
        const currentWorking = window._learningMaterialsPickerWorkingIds || [];
        if (currentWorking.length === 0) return;
        if (!window._learningMaterialsReleaseDraftState) window._learningMaterialsReleaseDraftState = {};
        window._learningMaterialsReleaseDraftState.pendingMaterialIds = [...currentWorking];
        window._learningMaterialsReleaseDraftState._isPickerFlow = true;

        window.openTeacherUnifiedScheduleModal?.('learning', null, '', 'schedule');
    };

    window.saveTeacherReleasedLearningMaterials = function () {
        window.saveTeacherUnifiedSchedule?.('learning');
    };

    window.closeTeacherReleaseLearningMaterialsModal = function (returnToHub = false) {
        window.closeAllReleasedTopicActionMenus?.();
        window._learningMaterialsReleaseDraftState = null;
        const overlay = document.getElementById('teacher-release-learning-materials-overlay');
        if (!overlay) {
            window.closeManageCurriculumHub?.();
            return;
        }
        overlay.classList.remove('curriculum-hub-overlay--visible');
        overlay.remove();

        const activeSubjId = (typeof resolveTeacherActiveSubjectId === 'function')
            ? resolveTeacherActiveSubjectId(currentTopicState?.subjectId)
            : (currentTopicState?.subjectId || 'card-prog1');

        const hubOverlay = document.getElementById('curriculum-hub-overlay');
        if (hubOverlay) hubOverlay.remove();
        window.closeManageCurriculumHub?.();
        document.querySelectorAll('#teacher-release-topics-overlay, #teacher-topic-picker-overlay, #teacher-topic-schedule-overlay, #teacher-release-learning-materials-overlay, #teacher-release-assessments-overlay, #teacher-release-category-overlay').forEach(el => el.remove());
        if (typeof window.unlockBodyScroll === 'function') {
            window.unlockBodyScroll();
        } else {
            document.documentElement.classList.remove('dialog-open', 'modal-open', 'sigma-modal-open', 'has-modal-open');
            document.body.classList.remove('dialog-open', 'modal-open', 'sigma-modal-open', 'has-modal-open');
        }

        // Re-render topic view deferred without blocking modal dismissal
        if (activeSubjId) {
            setTimeout(() => {
                refreshTeacherTopicUIIfVisible(activeSubjId);
            }, 50);
        }

        window.flushTeacherReleaseToastQueue?.();
    };

    window.toggleReleasedLearningMaterialMenu = function (matId, title, isHidden = false, e) {
        window.toggleReleasedItemActionMenu('learning', matId, title, isHidden, e);
    };

    window.toggleTeacherLearningMaterialHidden = function (matId, e) {
        window.toggleUnifiedItemHidden('learning', matId, true, e);
    };

    window.unreleaseTeacherLearningMaterial = function (matId, e, title = '') {
        window.unreleaseUnifiedItem('learning', matId, e, title);
    };

    window.toggleReleaseTopicCollapse = function (topicSafeId, e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        window.closeAllReleasedTopicActionMenus?.();
        const bodyEl = document.getElementById(`topic-collapse-body-${topicSafeId}`);
        const chevronEl = document.getElementById(`topic-chevron-${topicSafeId}`);
        if (!bodyEl) return;
        const isCollapsed = bodyEl.classList.contains('hidden');
        if (!window._topicReleaseCollapsedState) window._topicReleaseCollapsedState = {};
        if (isCollapsed) {
            bodyEl.classList.remove('hidden');
            if (chevronEl) chevronEl.style.transform = 'rotate(0deg)';
            window._topicReleaseCollapsedState[topicSafeId] = false;
        } else {
            bodyEl.classList.add('hidden');
            if (chevronEl) chevronEl.style.transform = 'rotate(-90deg)';
            window._topicReleaseCollapsedState[topicSafeId] = true;
        }
    };

    window.toggleReleaseDivisionCollapse = function (divisionSafeId, e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        const bodyEl = document.getElementById(`division-body-${divisionSafeId}`);
        const chevronEl = document.getElementById(`division-chevron-${divisionSafeId}`);
        if (!bodyEl) return;
        const isCollapsed = bodyEl.classList.contains('hidden');
        if (isCollapsed) {
            bodyEl.classList.remove('hidden');
            if (chevronEl) chevronEl.style.transform = 'rotate(0deg)';
        } else {
            bodyEl.classList.add('hidden');
            if (chevronEl) chevronEl.style.transform = 'rotate(-90deg)';
        }
    };

    // ── Standalone Release Assessments Modal ─────────────────────────────────
    window.openTeacherReleaseAssessmentsModal = function (fromPicker = false) {
        if (!fromPicker) {
            window.closeManageCurriculumHub?.();
        }
        const subjectId = resolveTeacherActiveSubjectId(typeof currentTopicState !== 'undefined' ? currentTopicState?.subjectId : null);
        const section = resolveTeacherActiveSection(typeof currentTopicState !== 'undefined' ? currentTopicState?.selectedSection : null);
        if (typeof currentTopicState !== 'undefined' && currentTopicState) {
            currentTopicState.subjectId = subjectId;
            currentTopicState.selectedSection = section;
            window.currentTopicState = currentTopicState;
        }
        const allAssessments = (typeof window.getTeacherSubjectAssessments === 'function')
            ? window.getTeacherSubjectAssessments(subjectId, section)
            : [];
        const allMaterials = (typeof window.getTeacherSubjectLearningMaterials === 'function')
            ? window.getTeacherSubjectLearningMaterials(subjectId, section)
            : [];
        const allTopics = (typeof getTeacherAllSubjectTopics === 'function')
            ? getTeacherAllSubjectTopics(subjectId, section)
            : [];

        // Section details
        const adminSections = getStoredJson('sigma-admin-sections', []);
        const cleanSectionName = (section || '').trim().toLowerCase();
        const matchedSec = adminSections.find(s => {
            const sName = (s.name || s.sectionName || '').trim().toLowerCase();
            return sName === cleanSectionName || (cleanSectionName && (sName.includes(cleanSectionName) || cleanSectionName.includes(sName)));
        });

        let sectionNameOnly = matchedSec?.name || section;
        let gradeLevel = matchedSec?.grade || (section.includes('Grade 12') ? 'Grade 12' : 'Grade 11');
        let roomNumber = matchedSec?.room || '302';
        let schoolYear = matchedSec?.schoolYear || '2026–2027';

        if (!matchedSec && section && section.includes(' - ')) {
            const parts = section.split(' - ');
            if (parts[0].includes('Grade')) gradeLevel = parts[0].trim();
            sectionNameOnly = parts.slice(1).join(' - ').trim() || section;
        }

        // Assessment Release configuration
        let releaseConfig = { releasedMaterialIds: [], hiddenMaterialIds: [], materialReleaseDates: {} };
        try {
            const saved = (typeof window.getAssessmentReleaseConfig === 'function')
                ? window.getAssessmentReleaseConfig(subjectId, section)
                : getStoredJson(`sigma_assessment_release_${subjectId}_${section}`, null);
            if (saved) releaseConfig = { ...releaseConfig, ...saved };
        } catch (e) {}
        if (!Array.isArray(releaseConfig.releasedMaterialIds)) {
            releaseConfig.releasedMaterialIds = Array.isArray(releaseConfig.releasedAssessmentIds) ? releaseConfig.releasedAssessmentIds : [];
        }
        if (!Array.isArray(releaseConfig.hiddenMaterialIds)) {
            releaseConfig.hiddenMaterialIds = Array.isArray(releaseConfig.hiddenAssessmentIds) ? releaseConfig.hiddenAssessmentIds : [];
        }
        if (!releaseConfig.materialReleaseDates) {
            releaseConfig.materialReleaseDates = releaseConfig.assessmentReleaseDates || {};
        }

        // Learning Materials Release configuration
        let learningReleaseConfig = { releasedMaterialIds: [], hiddenMaterialIds: [], materialReleaseDates: {}, materialSchedules: {} };
        try {
            const saved = (typeof window.getLearningMaterialReleaseConfig === 'function')
                ? window.getLearningMaterialReleaseConfig(subjectId, section)
                : getStoredJson(`sigma_learning_release_${subjectId}_${section}`, null);
            if (saved) learningReleaseConfig = { ...learningReleaseConfig, ...saved };
        } catch (e) {}
        if (!Array.isArray(learningReleaseConfig.releasedMaterialIds)) learningReleaseConfig.releasedMaterialIds = [];
        if (!Array.isArray(learningReleaseConfig.hiddenMaterialIds)) learningReleaseConfig.hiddenMaterialIds = [];
        if (!learningReleaseConfig.materialReleaseDates) learningReleaseConfig.materialReleaseDates = {};

        // Topics Release configuration
        let topicReleaseConfig = { publishAll: true, releasedTopicIds: [], releaseStartTime: '', topicSchedules: {}, hiddenTopicIds: [], topicReleaseDates: {} };
        try {
            const saved = (typeof window.getTopicReleaseConfig === 'function')
                ? window.getTopicReleaseConfig(subjectId, section)
                : getStoredJson(`sigma_topic_release_${subjectId}_${section}`, null);
            if (saved) topicReleaseConfig = { ...topicReleaseConfig, ...saved };
        } catch (e) {}
        if (!Array.isArray(topicReleaseConfig.releasedTopicIds)) topicReleaseConfig.releasedTopicIds = [];
        if (!Array.isArray(topicReleaseConfig.hiddenTopicIds)) topicReleaseConfig.hiddenTopicIds = [];
        if (!topicReleaseConfig.topicSchedules || typeof topicReleaseConfig.topicSchedules !== 'object') topicReleaseConfig.topicSchedules = {};
        if (!topicReleaseConfig.topicReleaseDates || typeof topicReleaseConfig.topicReleaseDates !== 'object') topicReleaseConfig.topicReleaseDates = {};
        const releasedTopicIds = topicReleaseConfig.releasedTopicIds.map(s => String(s).trim().toLowerCase());
        const isTopicCandidateReleased = (candList) => {
            return candList.some(c => releasedTopicIds.includes(String(c).trim().toLowerCase()));
        };

        // Draft state
        if (!window._assessmentsReleaseDraftState || !fromPicker) {
            window._assessmentsReleaseDraftState = {
                pendingMaterialIds: (window._assessmentsReleaseDraftState?.pendingMaterialIds && fromPicker)
                    ? window._assessmentsReleaseDraftState.pendingMaterialIds
                    : []
            };
        }
        window._assessmentsReleaseDraftState._section = section;
        window._assessmentsReleaseDraftState._subjectId = subjectId;
        const pendingIds = window._assessmentsReleaseDraftState.pendingMaterialIds || [];
        const releasedAssessmentIds = releaseConfig.releasedMaterialIds.map(s => String(s).trim().toLowerCase());
        const releasedLearningIds = learningReleaseConfig.releasedMaterialIds.map(s => String(s).trim().toLowerCase());

        const availableQuarters = (typeof window.getSubjectReleaseQuarters === 'function')
            ? window.getSubjectReleaseQuarters(subjectId)
            : ['q1', 'q2'];
        let activeQuarter = (typeof window.getActiveReleaseQuarter === 'function') ? window.getActiveReleaseQuarter() : 'q1';
        if (!availableQuarters.includes(activeQuarter.toLowerCase())) {
            activeQuarter = availableQuarters[0] || 'q1';
            window.setActiveReleaseQuarter?.(activeQuarter);
        }

        const quarterTopics = allTopics.filter(t => (t.quarter || 'q1').toLowerCase() === activeQuarter.toLowerCase());
        const quarterAssessments = allAssessments.filter(m => (m.quarter || 'q1').toLowerCase() === activeQuarter.toLowerCase());
        const quarterMaterials = allMaterials.filter(m => (m.quarter || 'q1').toLowerCase() === activeQuarter.toLowerCase());

        const pendingList = quarterAssessments.filter(m => pendingIds.includes(String(m.id)));

        // Match released assessments by any alias form
        const rawReleasedAssessments = quarterAssessments.filter(m => {
            const candidates = [
                String(m.id || ''),
                String(m.title || '').trim().toLowerCase(),
                String(m.materialId || ''),
                String(m.quizId || ''),
                String(m.selectedQuizId || ''),
                String(m.originalAdminId || ''),
                String(m.origId || ''),
            ].filter(Boolean).map(s => s.trim().toLowerCase());
            return candidates.some(c => releasedAssessmentIds.includes(c));
        });
        const dedupReleasedFn = (typeof window.deduplicateMaterialsArray === 'function') ? window.deduplicateMaterialsArray : (arr => arr);
        const releasedAssessmentsList = dedupReleasedFn(rawReleasedAssessments);

        // Match released learning materials by any alias form
        const rawReleasedMaterials = quarterMaterials.filter(m => {
            const candidates = [
                String(m.id || ''),
                String(m.title || '').trim().toLowerCase(),
                String(m.materialId || ''),
                String(m.originalAdminId || ''),
                String(m.origId || ''),
            ].filter(Boolean).map(s => s.trim().toLowerCase());
            return candidates.some(c => releasedLearningIds.includes(c));
        });
        const releasedMaterialsList = dedupReleasedFn(rawReleasedMaterials);

        // Helper date formatter
        const formatDateText = (isoStr) => {
            if (!isoStr) {
                const now = new Date();
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                let h = now.getHours();
                const m = now.getMinutes();
                const p = h >= 12 ? 'PM' : 'AM';
                if (h > 12) h -= 12;
                if (h === 0) h = 12;
                return `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()} • ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${p}`;
            }
            try {
                const d = new Date(isoStr);
                if (!isNaN(d.getTime())) {
                    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    let h = d.getHours();
                    const m = d.getMinutes();
                    const p = h >= 12 ? 'PM' : 'AM';
                    if (h > 12) h -= 12;
                    if (h === 0) h = 12;
                    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} • ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${p}`;
                }
            } catch (e) {}
            return isoStr;
        };

        const getAssessmentIconClass = (type) => {
            if (type === 'Quiz') return { icon: 'fa-solid fa-stopwatch text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' };
            return { icon: 'fa-solid fa-clipboard-list text-amber-600', bg: 'bg-amber-50 border-amber-100' };
        };

        // Group topics and their respective learning materials and assessments
        const topicGroups = [];
        const topicMap = new Map();

        // 1. Seed with defined topics for the active quarter
        quarterTopics.forEach((t, idx) => {
            const rawTitle = String(t.title || t.name || '').trim();
            if (!rawTitle) return;
            const key = rawTitle.toLowerCase();
            if (!topicMap.has(key)) {
                const grp = {
                    topicTitle: rawTitle,
                    topicId: t.id !== undefined ? String(t.id) : `topic-${idx}`,
                    originalTopic: t,
                    index: idx,
                    learningMaterials: [],
                    assessments: []
                };
                topicMap.set(key, grp);
                topicGroups.push(grp);
            }
        });

        // 2. Helper to find or add topic group
        const getGroupForTopicTitle = (tTitle) => {
            const cleanTitle = String(tTitle || '').trim() || (quarterTopics[0]?.title || 'Basic Syntax and Data Types');
            const key = cleanTitle.toLowerCase();
            if (!topicMap.has(key)) {
                const grp = {
                    topicTitle: cleanTitle,
                    topicId: '',
                    originalTopic: null,
                    index: topicGroups.length,
                    learningMaterials: [],
                    assessments: []
                };
                topicMap.set(key, grp);
                topicGroups.push(grp);
            }
            return topicMap.get(key);
        };

        // 3. Add released learning materials to corresponding topic
        releasedMaterialsList.forEach(m => {
            const grp = getGroupForTopicTitle(m.topicTitle);
            grp.learningMaterials.push(m);
        });

        // 4. Add released assessments to corresponding topic
        releasedAssessmentsList.forEach(a => {
            const grp = getGroupForTopicTitle(a.topicTitle);
            grp.assessments.push(a);
        });

        const visibleTopicGroups = topicGroups.filter((group, gIdx) => {
            if (group.learningMaterials.length > 0 || group.assessments.length > 0) return true;
            const originalIdx = group.index !== undefined ? group.index : gIdx;
            const topicEffectiveId = group.topicId || (group.originalTopic?.id !== undefined ? String(group.originalTopic.id) : `topic-${originalIdx}`);
            const topicCand = [
                topicEffectiveId,
                group.topicId ? String(group.topicId) : null,
                group.originalTopic?.id !== undefined ? String(group.originalTopic.id) : null,
                group.topicTitle ? String(group.topicTitle).trim() : null,
                group.topicTitle ? String(group.topicTitle).trim().toLowerCase() : null,
                `topic-${originalIdx}`,
                `topic-${originalIdx + 1}`
            ].filter(Boolean);
            return isTopicCandidateReleased(topicCand);
        });

        const releasedQuarterTopicsCount = quarterTopics.filter((t, idx) => {
            const topicCand = [
                t?.id !== undefined && t?.id !== '' ? String(t.id) : `topic-${idx}`,
                t?.title ? String(t.title).trim() : '',
                t?.title ? String(t.title).trim().toLowerCase() : ''
            ].filter(Boolean);
            if (!t?.id) topicCand.push(`topic-${idx}`);
            return isTopicCandidateReleased(topicCand);
        }).length;
        const totalReleasedCount = (releasedQuarterTopicsCount > 0 ? releasedQuarterTopicsCount : visibleTopicGroups.length) + releasedMaterialsList.length + releasedAssessmentsList.length;

        // Released Topics HTML with Divisions inside each topic
        let releasedHtml = '';
        if (visibleTopicGroups.length > 0) {
            releasedHtml = `
                <div class="border-y border-black/10 border-x-0 rounded-none sigma-selected-faded-panel overflow-hidden font-['Inter'] divide-y divide-black/10">
                    ${visibleTopicGroups.map((group, gIdx) => {
                        const originalIdx = group.index !== undefined ? group.index : gIdx;
                        const topicEffectiveId = group.topicId || (group.originalTopic?.id !== undefined ? String(group.originalTopic.id) : `topic-${originalIdx}`);
                        const topicSafeId = String(topicEffectiveId).replace(/[^a-zA-Z0-9_-]/g, '_') || `topic_grp_${gIdx}`;

                        const topicCand = [
                            topicEffectiveId,
                            group.topicId ? String(group.topicId) : null,
                            group.originalTopic?.id !== undefined ? String(group.originalTopic.id) : null,
                            group.topicTitle ? String(group.topicTitle).trim() : null,
                            group.topicTitle ? String(group.topicTitle).trim().toLowerCase() : null,
                            `topic-${originalIdx}`,
                            `topic-${originalIdx + 1}`
                        ].filter(Boolean);

                        let topicSchedule = null;
                        if (topicReleaseConfig.topicSchedules) {
                            for (const cid of topicCand) {
                                if (topicReleaseConfig.topicSchedules[cid]) {
                                    topicSchedule = topicReleaseConfig.topicSchedules[cid];
                                    break;
                                }
                            }
                        }
                        if (!topicSchedule) topicSchedule = topicReleaseConfig.releaseStartTime || null;
                        const topicIsFuture = topicSchedule && topicSchedule !== 'now' && topicSchedule !== 'immediate' && (!isNaN(new Date(topicSchedule).getTime()) && new Date(topicSchedule).getTime() > Date.now());
                        const topicIsHidden = Array.isArray(topicReleaseConfig.hiddenTopicIds) && topicCand.some(cid => topicReleaseConfig.hiddenTopicIds.map(String).includes(cid));
                        const matchedDate = topicReleaseConfig.topicReleaseDates ? topicCand.map(cid => topicReleaseConfig.topicReleaseDates[cid]).find(Boolean) : null;
                        const topicRelDateText = topicIsFuture ? formatDateText(topicSchedule) : formatDateText(matchedDate || topicReleaseConfig.updatedAt || null);
                        const isExplicitlyCollapsed = window._topicReleaseCollapsedState && window._topicReleaseCollapsedState[topicSafeId] === true;
                        const isTopicExpanded = !isExplicitlyCollapsed;

                        return `
                            <div class="topic-group-block">
                                <!-- Topic Header Banner with Release Panel & Chevron Dropdown -->
                                <div class="px-3 sm:px-4 py-2 sm:py-2.5 bg-black/[0.03] border-b border-black/10 flex items-center justify-between cursor-pointer select-none hover:bg-black/[0.05] transition-colors"
                                    onclick="window.toggleReleaseTopicCollapse('${topicSafeId}', event)">
                                    <div class="flex items-start gap-2 sm:gap-2.5 min-w-0 flex-1 mr-2 sm:mr-3">
                                        <i class="fa-solid fa-book-bookmark text-xs text-[#15803d] shrink-0 mt-0.5"></i>
                                        <div class="flex-1" style="min-width:0;">
                                            <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                                <span class="text-xs sm:text-sm font-normal text-black font-['Inter']" style="overflow-wrap:anywhere; word-break:break-word; text-overflow:clip; white-space:normal;">${escapeHtml(group.topicTitle)}</span>
                                                ${topicIsHidden ? `
                                                    <div class="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold text-black shrink-0">
                                                        <i class="fa-solid fa-eye-slash text-xs text-black"></i>
                                                        <span>Hidden</span>
                                                    </div>
                                                ` : (topicIsFuture ? `
                                                    <div class="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold text-black shrink-0">
                                                        <i class="fa-solid fa-clock text-xs text-black"></i>
                                                        <span>Scheduled</span>
                                                    </div>
                                                ` : '')}
                                            </div>
                                            <p class="text-[10px] font-normal text-black-fade mt-0.5">${topicRelDateText}</p>
                                        </div>
                                    </div>

                                    <div class="flex items-center gap-1.5 sm:gap-3 shrink-0">
                                        <!-- 3-Dots Menu Button -->
                                        <button type="button" id="released-topic-btn-${escapeHtml(String(topicEffectiveId))}"
                                            onclick="event.stopPropagation(); window.toggleReleasedItemActionMenu ? window.toggleReleasedItemActionMenu('topics', '${escapeHtml(String(topicEffectiveId))}', '${escapeHtml(group.topicTitle)}', ${topicIsHidden ? 'true' : 'false'}, event) : window.toggleReleasedTopicActionMenu?.('${escapeHtml(String(topicEffectiveId))}', '${escapeHtml(group.topicTitle)}', ${topicIsHidden ? 'true' : 'false'}, event)"
                                            class="w-7 h-7 flex items-center justify-center text-black hover:text-[#FFD000] transition-colors cursor-pointer"
                                            title="Topic Options">
                                            <i class="fa-solid fa-ellipsis-vertical text-base"></i>
                                        </button>

                                        <!-- Chevron Dropdown Icon -->
                                        <div class="w-6 h-6 flex items-center justify-center text-black pointer-events-none">
                                            <i id="topic-chevron-${topicSafeId}" class="fa-solid fa-chevron-down text-xs transition-transform duration-200" style="transform: ${isTopicExpanded ? 'rotate(0deg)' : 'rotate(-90deg)'};"></i>
                                        </div>
                                    </div>
                                </div>

                                <!-- Collapsible Topic Body (Contains Divisions) -->
                                <div id="topic-collapse-body-${topicSafeId}" class="${isTopicExpanded ? '' : 'hidden'}">
                                    <!-- Division 1: Learning Materials -->
                                    <div class="topic-division-learning">
                                        <div class="px-3.5 sm:px-4 py-2 bg-slate-50 border-b border-black/10 flex items-center justify-between">
                                            <div class="flex items-center gap-2">
                                                <i class="fa-solid fa-book-open text-xs text-blue-600"></i>
                                                <span class="text-xs font-normal text-black font-['Inter']">Learning Materials</span>
                                            </div>
                                            <span class="text-[11px] font-semibold text-black/50 font-['Inter']">${group.learningMaterials.length} Released</span>
                                        </div>
                                        <div>
                                            ${group.learningMaterials.length > 0 ? `
                                                <div class="divide-y divide-black/10">
                                                    ${group.learningMaterials.map(m => {
                                                        const isHidden = learningReleaseConfig.hiddenMaterialIds.map(String).includes(String(m.id));
                                                        const isVid = m.type === 'Video';
                                                        const iconClass = isVid ? 'fa-solid fa-circle-play text-red-600' : 'fa-solid fa-file-lines text-blue-600';
                                                        const bgClass = isVid ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100';
                                                        const dateText = formatDateText(learningReleaseConfig.materialReleaseDates[m.id]);
                                                        const matSchedule = learningReleaseConfig.materialSchedules ? learningReleaseConfig.materialSchedules[m.id] : null;
                                                        const isFuture = matSchedule && matSchedule !== 'now' && matSchedule !== 'immediate' && (!isNaN(new Date(matSchedule).getTime()) && new Date(matSchedule).getTime() > Date.now());
                                                        const relDateText = isFuture ? formatDateText(matSchedule) : dateText;

                                                        return `
                                                            <div class="p-3 sm:p-3.5 bg-white relative font-['Inter'] release-item-row" style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
                                                                <div class="flex items-start gap-2.5 sm:gap-3.5 flex-1 release-item-title-box" style="min-width:0;">
                                                                    <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl ${bgClass} border flex items-center justify-center shrink-0">
                                                                        <i class="${iconClass} text-xs sm:text-sm"></i>
                                                                    </div>
                                                                    <div class="flex-1" style="min-width:0;">
                                                                        <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                                                            <p class="text-xs sm:text-sm font-normal text-black tracking-tight" style="overflow-wrap:anywhere; word-break:break-word; text-overflow:clip; white-space:normal;">${escapeHtml(m.title)}</p>
                                                                            ${isHidden ? `
                                                                                <div class="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold text-black shrink-0">
                                                                                    <i class="fa-solid fa-eye-slash text-xs text-black"></i>
                                                                                    <span>Hidden</span>
                                                                                </div>
                                                                            ` : (isFuture ? `
                                                                                <div class="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold text-black shrink-0">
                                                                                    <i class="fa-solid fa-clock text-xs text-black"></i>
                                                                                    <span>Scheduled</span>
                                                                                </div>
                                                                            ` : '')}
                                                                        </div>
                                                                        <p class="text-[10px] font-normal text-black-fade mt-0.5">${relDateText}</p>
                                                                    </div>
                                                                </div>
                                                                <div class="flex items-center gap-2 sm:gap-3 release-item-status-actions" style="flex:0 0 auto;">
                                                                    <button type="button" id="released-learning-btn-${escapeHtml(String(m.id))}"
                                                                        onclick="window.toggleReleasedItemActionMenu ? window.toggleReleasedItemActionMenu('learning', '${escapeHtml(String(m.id))}', '${escapeHtml(m.title)}', ${isHidden ? 'true' : 'false'}, event) : window.toggleReleasedLearningMaterialMenu?.('${escapeHtml(String(m.id))}', '${escapeHtml(m.title)}', ${isHidden ? 'true' : 'false'}, event)"
                                                                        class="w-7 h-7 flex items-center justify-center text-black hover:text-[#FFD000] transition-colors cursor-pointer"
                                                                        title="Options">
                                                                        <i class="fa-solid fa-ellipsis-vertical text-base"></i>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        `;
                                                    }).join('')}
                                                </div>
                                            ` : `
                                                <div class="px-4 py-3 bg-black/[0.015] text-center border-b border-black/5">
                                                    <p class="text-xs text-black/40 italic font-['Inter']">No learning materials released under this topic</p>
                                                </div>
                                            `}
                                        </div>
                                    </div>

                                    <!-- Division 2: Assessment Materials -->
                                    <div class="topic-division-assessments">
                                        <div class="px-3.5 sm:px-4 py-2 bg-slate-50 border-t border-b border-black/10 flex items-center justify-between">
                                            <div class="flex items-center gap-2">
                                                <i class="fa-solid fa-clipboard-check text-xs text-amber-600"></i>
                                                <span class="text-xs font-normal text-black font-['Inter']">Assessment Materials</span>
                                            </div>
                                            <span class="text-[11px] font-semibold text-black/50 font-['Inter']">${group.assessments.length} Released</span>
                                        </div>
                                        <div>
                                            ${group.assessments.length > 0 ? `
                                                <div class="divide-y divide-black/10">
                                                    ${group.assessments.map(m => {
                                                        const isHidden = releaseConfig.hiddenMaterialIds.map(String).includes(String(m.id));
                                                        const { icon, bg } = getAssessmentIconClass(m.type);
                                                        const dateText = formatDateText(releaseConfig.materialReleaseDates[m.id]);
                                                        const matSchedule = releaseConfig.materialSchedules ? releaseConfig.materialSchedules[m.id] : null;
                                                        const matEndSchedule = (releaseConfig.assessmentEndSchedules && releaseConfig.assessmentEndSchedules[m.id]) || (releaseConfig.materialEndSchedules && releaseConfig.materialEndSchedules[m.id]) || null;
                                                        const isFuture = matSchedule && matSchedule !== 'now' && matSchedule !== 'immediate' && (!isNaN(new Date(matSchedule).getTime()) && new Date(matSchedule).getTime() > Date.now());
                                                        const relDateText = isFuture ? formatDateText(matSchedule) : dateText;
                                                        const dueText = matEndSchedule ? formatDateText(matEndSchedule) : '';

                                                        return `
                                                            <div class="p-3 sm:p-3.5 bg-white relative font-['Inter'] release-item-row" style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
                                                                <div class="flex items-start gap-2.5 sm:gap-3.5 flex-1 release-item-title-box" style="min-width:0;">
                                                                    <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl ${bg} border flex items-center justify-center shrink-0">
                                                                        <i class="${icon} text-xs sm:text-sm"></i>
                                                                    </div>
                                                                    <div class="flex-1" style="min-width:0;">
                                                                        <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                                                            <p class="text-xs sm:text-sm font-normal text-black tracking-tight" style="overflow-wrap:anywhere; word-break:break-word; text-overflow:clip; white-space:normal;">${escapeHtml(m.title)}</p>
                                                                            ${isHidden ? `
                                                                                <div class="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold text-black shrink-0">
                                                                                    <i class="fa-solid fa-eye-slash text-xs text-black"></i>
                                                                                    <span>Hidden</span>
                                                                                </div>
                                                                            ` : (isFuture ? `
                                                                                <div class="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold text-black shrink-0">
                                                                                    <i class="fa-solid fa-clock text-xs text-black"></i>
                                                                                    <span>Scheduled</span>
                                                                                </div>
                                                                            ` : '')}
                                                                        </div>
                                                                        <p class="text-[10px] font-normal text-black-fade mt-0.5">${dueText ? 'Release: ' : ''}${relDateText}${dueText ? ` • Due: ${dueText}` : ''}</p>
                                                                    </div>
                                                                </div>
                                                                <div class="flex items-center gap-2 sm:gap-3 release-item-status-actions" style="flex:0 0 auto;">
                                                                    <button type="button" id="released-assessment-btn-${escapeHtml(String(m.id))}"
                                                                        onclick="window.toggleReleasedItemActionMenu ? window.toggleReleasedItemActionMenu('assessments', '${escapeHtml(String(m.id))}', '${escapeHtml(m.title)}', ${isHidden ? 'true' : 'false'}, event) : window.toggleReleasedAssessmentMenu?.('${escapeHtml(String(m.id))}', '${escapeHtml(m.title)}', ${isHidden ? 'true' : 'false'}, event)"
                                                                        class="w-7 h-7 flex items-center justify-center text-black hover:text-[#FFD000] transition-colors cursor-pointer"
                                                                        title="Options">
                                                                        <i class="fa-solid fa-ellipsis-vertical text-base"></i>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        `;
                                                    }).join('')}
                                                </div>
                                            ` : `
                                                <div class="px-4 py-3 bg-black/[0.015] text-center">
                                                    <p class="text-xs text-black/40 italic font-['Inter']">No assessment materials released under this topic</p>
                                                </div>
                                            `}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        } else {
            const quarterLabel = (typeof window.getReleaseQuarterLabel === 'function') ? window.getReleaseQuarterLabel(activeQuarter) : '1st Quarter';
            releasedHtml = `
                <div class="sigma-empty-state-black-fade p-6 rounded-2xl border-2 border-dashed border-black/10 bg-black/[0.02] text-center font-['Inter']">
                    <p class="empty-title text-xs font-semibold text-black/60 font-['Inter']" style="color: rgba(0,0,0,0.60);">No ${quarterLabel} Topics or Materials Released Yet</p>
                    <p class="empty-desc text-[11px] font-normal text-black-fade mt-0.5 font-['Inter']" style="color: rgba(0,0,0,0.45);">Click "Select Topics and Materials" to choose topics, learning materials, and assessments to release for this section</p>
                </div>
            `;
        }

        let overlay = document.getElementById('teacher-release-assessments-overlay');
        let isNew = false;
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'teacher-release-assessments-overlay';
            overlay.className = 'curriculum-hub-overlay';
            overlay.dataset._historyPushed = 'true';
            overlay.onclick = function (e) {
                window.closeAllReleasedTopicActionMenus?.();
                e.stopPropagation();
            };
            isNew = true;
        } else {
            overlay.className = 'curriculum-hub-overlay';
            overlay.classList.remove('hidden');
            overlay.style.display = '';
        }

        if (isNew && !fromPicker && typeof window.pushModalHistoryState === 'function') {
            window.pushModalHistoryState('teacher-release-assessments-overlay');
        }

        overlay.innerHTML = `
            <div class="curriculum-hub-panel curriculum-release-panel-fixed w-full !max-w-[860px] flex flex-col overflow-hidden" style="height: 740px; min-height: min(740px, calc(100vh - 40px)); max-height: calc(100vh - 40px); max-width: 860px;" onclick="window.closeAllReleasedTopicActionMenus?.(); event.stopPropagation()">
                <!-- Header -->
                <div class="px-4 sm:px-8 py-3.5 sm:py-5 border-b border-slate-100 flex items-center justify-between shrink-0 font-['Inter']">
                    <div>
                        <h2 class="text-lg sm:text-xl font-bold text-black font-['Inter'] tracking-tight">Release Topics & Materials</h2>
                        <p class="text-[11px] sm:text-xs font-medium text-black-fade font-['Inter'] mt-0.5">Manage topic, learning material, and assessment visibility and release schedule for students</p>
                    </div>
                </div>

                <!-- Main Content -->
                <div class="p-3.5 sm:p-8 py-4 sm:py-6 overflow-y-auto flex-1 space-y-4 sm:space-y-6 font-['Inter']">
                    <!-- Context Strip -->
                    <div class="flex flex-wrap items-center gap-1.5 sm:gap-4 px-3 sm:px-4 py-2 sm:py-2.5 bg-black/[0.03] border border-black/10 rounded-xl text-[11px] sm:text-xs font-['Inter'] font-medium text-black release-context-strip">
                        <span><b>Section:</b> ${escapeHtml(sectionNameOnly)}</span>
                        <span class="text-black/20 release-strip-sep">|</span>
                        <span><b>Grade:</b> ${escapeHtml(gradeLevel)}</span>
                        <span class="text-black/20 release-strip-sep">|</span>
                        <span><b>Room:</b> ${escapeHtml(roomNumber)}</span>
                        <span class="text-black/20 release-strip-sep">|</span>
                        <span><b>SY:</b> ${escapeHtml(schoolYear)}</span>
                    </div>

                    <!-- Quarter Filter Tabs (Below Context Strip) -->
                    <div class="flex items-center justify-start">
                        ${window.renderReleaseQuarterToggleHtml?.(subjectId, activeQuarter)}
                    </div>

                    <!-- Released Topics & Materials Section -->
                    <div class="space-y-3 font-['Inter']">
                        <div class="release-section-header-bar flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b-2 border-black transition-colors gap-1.5 sm:gap-3 w-full">
                            <div class="flex items-center gap-2 min-w-0">
                                <button type="button" onclick="window.openTeacherTopicsAndMaterialsPickerModal ? window.openTeacherTopicsAndMaterialsPickerModal() : window.openTeacherAssessmentsPickerModal?.()"
                                    class="inline-flex items-center gap-2 text-sm sm:text-[17px] font-bold text-black hover:text-[#FFD000] transition-colors cursor-pointer font-['Inter'] tracking-tight text-left">
                                    <i class="fa-solid fa-plus text-sm sm:text-base text-[#15803d] shrink-0"></i>
                                    <span class="whitespace-nowrap">Select Topics and Materials</span>
                                </button>
                            </div>
                            <p class="release-section-subtitle text-[11px] sm:text-xs font-normal text-left sm:text-right shrink-0" style="color: rgba(0,0,0,0.45);">Topics and materials configured for release for this section</p>
                        </div>
                        ${releasedHtml}
                    </div>
                </div>

                <!-- Footer -->
                <div class="px-4 sm:px-8 py-3 sm:py-5 flex items-center justify-end gap-3 shrink-0 font-['Inter']">
                    <button type="button" onclick="window.closeTeacherReleaseAssessmentsModal?.(false)"
                        class="sigma-btn sigma-btn-white h-9 sm:h-[46px] px-4 sm:px-6 text-xs sm:text-sm font-semibold sm:font-bold rounded-xl cursor-pointer font-['Inter']">
                        Close
                    </button>
                </div>
            </div>
        `;

        if (isNew) {
            document.body.appendChild(overlay);
        }
        overlay.classList.remove('hidden');
        overlay.style.display = '';
        if (typeof window.lockBodyScroll === 'function') window.lockBodyScroll();
        overlay.classList.add('curriculum-hub-overlay--visible');
    };

    // ── Dedicated Sub-Modal for Topics and Materials Picker ───────────────────
    window.openTeacherTopicsAndMaterialsPickerModal = function () {
        const subjectId = (typeof resolveTeacherActiveSubjectId === 'function')
            ? resolveTeacherActiveSubjectId(typeof currentTopicState !== 'undefined' ? currentTopicState?.subjectId : null)
            : ((typeof currentTopicState !== 'undefined' ? currentTopicState?.subjectId : null) || window.currentTopicState?.subjectId || 'card-prog1');
        const section = (typeof resolveTeacherActiveSection === 'function')
            ? resolveTeacherActiveSection(typeof currentTopicState !== 'undefined' ? currentTopicState?.selectedSection : null)
            : ((typeof currentTopicState !== 'undefined' ? currentTopicState?.selectedSection : null) || window.currentTopicState?.selectedSection || '');
        if (typeof currentTopicState !== 'undefined' && currentTopicState) {
            currentTopicState.subjectId = subjectId;
            currentTopicState.selectedSection = section;
            window.currentTopicState = currentTopicState;
        }

        const allTopics = (typeof getTeacherAllSubjectTopics === 'function')
            ? getTeacherAllSubjectTopics(subjectId, section)
            : [];
        const allMaterials = (typeof window.getTeacherSubjectLearningMaterials === 'function')
            ? window.getTeacherSubjectLearningMaterials(subjectId, section)
            : [];
        const allAssessments = (typeof window.getTeacherSubjectAssessments === 'function')
            ? window.getTeacherSubjectAssessments(subjectId, section)
            : [];

        // Section details
        const adminSections = getStoredJson('sigma-admin-sections', []);
        const cleanSectionName = (section || '').trim().toLowerCase();
        const matchedSec = adminSections.find(s => {
            const sName = (s.name || s.sectionName || '').trim().toLowerCase();
            return sName === cleanSectionName || (cleanSectionName && (sName.includes(cleanSectionName) || cleanSectionName.includes(sName)));
        });

        let sectionNameOnly = matchedSec?.name || section;
        let gradeLevel = matchedSec?.grade || (section.includes('Grade 12') ? 'Grade 12' : 'Grade 11');
        let roomNumber = matchedSec?.room || '302';
        let schoolYear = matchedSec?.schoolYear || '2026–2027';

        if (!matchedSec && section && section.includes(' - ')) {
            const parts = section.split(' - ');
            if (parts[0].includes('Grade')) gradeLevel = parts[0].trim();
            sectionNameOnly = parts.slice(1).join(' - ').trim() || section;
        }

        // 1. Topic Release config
        let topicReleaseConfig = { releasedTopicIds: [] };
        try {
            const saved = (typeof window.getTopicReleaseConfig === 'function')
                ? window.getTopicReleaseConfig(subjectId, section)
                : getStoredJson(`sigma_topic_release_${subjectId}_${section}`, null);
            if (saved) topicReleaseConfig = { ...topicReleaseConfig, ...saved };
        } catch (e) {}
        const releasedTopicIds = (topicReleaseConfig.releasedTopicIds || []).map(s => String(s).trim().toLowerCase());
        const isTopicReleased = (t, idx) => {
            const cands = [
                t?.id !== undefined && t?.id !== '' ? String(t.id) : null,
                t?.title ? String(t.title).trim() : null,
                t?.title ? String(t.title).trim().toLowerCase() : null,
                `topic-${idx}`,
                `topic-${idx + 1}`
            ].filter(Boolean);
            return cands.some(c => releasedTopicIds.includes(String(c).toLowerCase()));
        };

        // 2. Learning Material Release config
        let learningReleaseConfig = { releasedMaterialIds: [] };
        try {
            const saved = (typeof window.getLearningMaterialReleaseConfig === 'function')
                ? window.getLearningMaterialReleaseConfig(subjectId, section)
                : getStoredJson(`sigma_learning_release_${subjectId}_${section}`, null);
            if (saved) learningReleaseConfig = { ...learningReleaseConfig, ...saved };
        } catch (e) {}
        const releasedLearningIds = (learningReleaseConfig.releasedMaterialIds || []).map(s => String(s).trim().toLowerCase());
        const isLearningReleased = (m) => {
            const cands = [m?.id, m?.title, m?.materialId, m?.originalAdminId, m?.origId]
                .filter(Boolean)
                .map(s => String(s).trim().toLowerCase());
            return cands.some(c => releasedLearningIds.includes(c));
        };

        // 3. Assessment Release config
        let assessmentReleaseConfig = { releasedMaterialIds: [] };
        try {
            const saved = (typeof window.getAssessmentReleaseConfig === 'function')
                ? window.getAssessmentReleaseConfig(subjectId, section)
                : getStoredJson(`sigma_assessment_release_${subjectId}_${section}`, null);
            if (saved) assessmentReleaseConfig = { ...assessmentReleaseConfig, ...saved };
        } catch (e) {}
        const releasedAssessmentIds = (assessmentReleaseConfig.releasedMaterialIds || assessmentReleaseConfig.releasedAssessmentIds || []).map(s => String(s).trim().toLowerCase());
        const isAssessmentReleased = (m) => {
            const cands = [m?.id, m?.title, m?.materialId, m?.quizId, m?.selectedQuizId, m?.originalAdminId, m?.origId]
                .filter(Boolean)
                .map(s => String(s).trim().toLowerCase());
            return cands.some(c => releasedAssessmentIds.includes(c));
        };

        const availableQuarters = (typeof window.getSubjectReleaseQuarters === 'function')
            ? window.getSubjectReleaseQuarters(subjectId)
            : ['q1', 'q2'];
        let activeQuarter = (typeof window.getActiveReleaseQuarter === 'function') ? window.getActiveReleaseQuarter() : 'q1';
        if (!availableQuarters.includes(activeQuarter.toLowerCase())) {
            activeQuarter = availableQuarters[0] || 'q1';
            window.setActiveReleaseQuarter?.(activeQuarter);
        }

        const quarterTopics = allTopics.filter(t => (t.quarter || 'q1').toLowerCase() === activeQuarter.toLowerCase());
        const quarterMaterials = allMaterials.filter(m => (m.quarter || 'q1').toLowerCase() === activeQuarter.toLowerCase());
        const quarterAssessments = allAssessments.filter(m => (m.quarter || 'q1').toLowerCase() === activeQuarter.toLowerCase());

        // Unreleased items
        const unreleasedTopics = quarterTopics.filter((t, idx) => !isTopicReleased(t, idx));
        const unreleasedMaterials = quarterMaterials.filter(m => !isLearningReleased(m));
        const unreleasedAssessments = quarterAssessments.filter(m => !isAssessmentReleased(m));

        const totalUnreleased = unreleasedTopics.length + unreleasedMaterials.length + unreleasedAssessments.length;

        // Group unreleased items under topics
        const topicPickerGroups = [];
        const topicPickerMap = new Map();

        quarterTopics.forEach((t, idx) => {
            const rawTitle = String(t.title || t.name || '').trim();
            if (!rawTitle) return;
            const key = rawTitle.toLowerCase();
            const topReleased = isTopicReleased(t, idx);
            const grp = {
                topicTitle: rawTitle,
                topicId: t.id !== undefined ? String(t.id) : `topic-${idx}`,
                originalTopic: t,
                index: idx,
                isTopicReleased: topReleased,
                isTopicUnreleased: !topReleased,
                learningMaterials: [],
                assessments: []
            };
            topicPickerMap.set(key, grp);
            topicPickerGroups.push(grp);
        });

        // Add unreleased learning materials to their topic groups
        unreleasedMaterials.forEach(m => {
            const tTitle = String(m.topicTitle || '').trim() || (quarterTopics[0]?.title || 'Basic Syntax and Data Types');
            const key = tTitle.toLowerCase();
            let grp = topicPickerMap.get(key);
            if (!grp) {
                grp = {
                    topicTitle: tTitle,
                    topicId: '',
                    originalTopic: null,
                    index: topicPickerGroups.length,
                    isTopicReleased: true,
                    isTopicUnreleased: false,
                    learningMaterials: [],
                    assessments: []
                };
                topicPickerMap.set(key, grp);
                topicPickerGroups.push(grp);
            }
            grp.learningMaterials.push(m);
        });

        // Add unreleased assessments to their topic groups
        unreleasedAssessments.forEach(a => {
            const tTitle = String(a.topicTitle || '').trim() || (quarterTopics[0]?.title || 'Basic Syntax and Data Types');
            const key = tTitle.toLowerCase();
            let grp = topicPickerMap.get(key);
            if (!grp) {
                grp = {
                    topicTitle: tTitle,
                    topicId: '',
                    originalTopic: null,
                    index: topicPickerGroups.length,
                    isTopicReleased: true,
                    isTopicUnreleased: false,
                    learningMaterials: [],
                    assessments: []
                };
                topicPickerMap.set(key, grp);
                topicPickerGroups.push(grp);
            }
            grp.assessments.push(a);
        });

        // Filter to groups that have at least one unreleased thing: unreleased topic, unreleased material, or unreleased assessment
        const activeGroups = topicPickerGroups.filter(grp => grp.isTopicUnreleased || grp.learningMaterials.length > 0 || grp.assessments.length > 0);

        // Keep previous release modal visible until the picker is mounted to avoid dismissing
        const prevModal = document.getElementById('teacher-release-assessments-overlay')
            || document.getElementById('teacher-release-topics-overlay')
            || document.getElementById('teacher-release-learning-materials-overlay');

        let existing = document.getElementById('teacher-topics-materials-picker-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'teacher-topics-materials-picker-overlay';
        overlay.className = 'curriculum-hub-overlay curriculum-hub-overlay--visible';
        overlay.dataset._historyPushed = 'true';
        overlay.onclick = function (e) { e.stopPropagation(); };

        if (typeof window.pushModalHistoryState === 'function') {
            window.pushModalHistoryState('teacher-topics-materials-picker-overlay');
        }

        window._topicsAndMaterialsPickerWorking = new Map();

        const quarterLabel = (typeof window.getReleaseQuarterLabel === 'function') ? window.getReleaseQuarterLabel(activeQuarter) : '1st Quarter';

        overlay.innerHTML = `
            <div class="curriculum-hub-panel curriculum-picker-panel-fixed curriculum-release-panel-fixed w-full !max-w-[860px] flex flex-col overflow-hidden" style="height: 740px; min-height: min(740px, calc(100vh - 40px)); max-height: calc(100vh - 40px); max-width: 860px;" onclick="event.stopPropagation()">
                <!-- Header -->
                <div class="px-6 sm:px-8 py-5 border-b border-slate-100 flex items-center justify-between shrink-0 font-['Inter']">
                    <div class="flex items-center gap-3">
                        <button type="button" 
                            class="picker-header-back-btn p-1 bg-transparent hover:bg-transparent flex sm:hidden items-center justify-center text-black hover:text-black/70 transition-colors cursor-pointer shrink-0 border-0 outline-none"
                            onclick="window.closeTeacherTopicsAndMaterialsPickerModal?.(true)"
                            title="Back">
                            <i class="fa-solid fa-chevron-left text-sm text-black"></i>
                        </button>
                        <div>
                            <h2 class="text-xl font-bold text-black font-['Inter'] tracking-tight">Select Topics and Materials to Release</h2>
                            <p class="text-xs font-medium text-black-fade font-['Inter'] mt-0.5">Select topics, learning materials, and assessments to make available for this section</p>
                        </div>
                    </div>
                </div>

                <!-- Main Content -->
                <div class="p-6 sm:p-8 py-5 overflow-y-auto flex-1 space-y-4 font-['Inter']">
                    <!-- Context Strip -->
                    <div class="flex flex-wrap items-center gap-2 sm:gap-4 px-4 py-2 bg-black/[0.03] border border-black/10 rounded-xl text-xs font-['Inter'] font-medium text-black release-context-strip">
                        <span><b>Section:</b> ${escapeHtml(sectionNameOnly)}</span>
                        <span class="text-black/20 release-strip-sep">|</span>
                        <span><b>Grade:</b> ${escapeHtml(gradeLevel)}</span>
                        <span class="text-black/20 release-strip-sep">|</span>
                        <span><b>Room:</b> ${escapeHtml(roomNumber)}</span>
                        <span class="text-black/20 release-strip-sep">|</span>
                        <span><b>SY:</b> ${escapeHtml(schoolYear)}</span>
                    </div>

                    <!-- Quarter Filter Tabs (Below Context Strip) -->
                    <div class="flex items-center justify-start">
                        ${window.renderReleaseQuarterToggleHtml?.(subjectId, activeQuarter)}
                    </div>

                    <!-- Category Filter Chips (Pill Design) -->
                    <div class="flex flex-wrap items-center justify-between border-b border-black/10 pb-2.5 pt-1 gap-2 font-['Inter']">
                        <div class="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5" id="unified-picker-filter-chips">
                            <button type="button" onclick="window.setTopicsAndMaterialsPickerFilter('all')" id="unified-filter-all"
                                class="quiz-storage-filter-chip px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer bg-[#15803d] text-white shadow-2xs" data-filter="all">
                                All (${totalUnreleased})
                            </button>
                            <button type="button" onclick="window.setTopicsAndMaterialsPickerFilter('topics')" id="unified-filter-topics"
                                class="quiz-storage-filter-chip px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 bg-slate-100 text-black-fade hover:text-black hover:bg-slate-200/70" data-filter="topics">
                                <i class="fa-solid fa-book-bookmark text-[11px]"></i>
                                <span>Draft Topics (${unreleasedTopics.length})</span>
                            </button>
                            <button type="button" onclick="window.setTopicsAndMaterialsPickerFilter('learning')" id="unified-filter-learning"
                                class="quiz-storage-filter-chip px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 bg-slate-100 text-black-fade hover:text-black hover:bg-slate-200/70" data-filter="learning">
                                <i class="fa-solid fa-book-open text-[11px]"></i>
                                <span>Draft <span class="hidden sm:inline">Learning </span>Materials (${unreleasedMaterials.length})</span>
                            </button>
                            <button type="button" onclick="window.setTopicsAndMaterialsPickerFilter('assessments')" id="unified-filter-assessments"
                                class="quiz-storage-filter-chip px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 bg-slate-100 text-black-fade hover:text-black hover:bg-slate-200/70" data-filter="assessments">
                                <i class="fa-solid fa-clipboard-check text-[11px]"></i>
                                <span>Draft Assessments (${unreleasedAssessments.length})</span>
                            </button>
                        </div>
                        <div class="flex items-center gap-2 text-xs font-semibold shrink-0">
                            <button type="button" onclick="window.selectAllTopicsAndMaterialsPickerItems()" class="px-2 py-1 rounded-lg text-[#15803d] hover:bg-emerald-50 active:bg-emerald-100 transition-colors cursor-pointer" style="color: #15803d;">Select All</button>
                            <span class="text-slate-300">|</span>
                            <button type="button" onclick="window.deselectAllTopicsAndMaterialsPickerItems()" class="px-2 py-1 rounded-lg text-[#15803d] hover:bg-emerald-50 active:bg-emerald-100 transition-colors cursor-pointer" style="color: #15803d;">Deselect All</button>
                        </div>
                    </div>

                    <!-- Topics and Materials List -->
                    <div id="unified-picker-list-container" class="space-y-3 font-['Inter']">
                        ${activeGroups.length > 0 ? `
                            ${activeGroups.map((grp, gIdx) => {
                                const originalIdx = grp.index !== undefined ? grp.index : gIdx;
                                const topicEffectiveId = grp.topicId || (grp.originalTopic?.id !== undefined ? String(grp.originalTopic.id) : `topic-${originalIdx}`);

                                const hasChildren = (grp.learningMaterials.length > 0 || grp.assessments.length > 0);

                                return `
                                    <div class="topic-picker-card border border-black/10 rounded-xl overflow-hidden bg-white shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                                        data-has-topic="${grp.isTopicUnreleased ? '1' : '0'}"
                                        data-has-learning="${grp.learningMaterials.length > 0 ? '1' : '0'}"
                                        data-has-assessments="${grp.assessments.length > 0 ? '1' : '0'}">
                                        
                                        <!-- Topic Header -->
                                        ${grp.isTopicUnreleased ? `
                                            <label class="topic-picker-header px-4 py-2.5 bg-black/[0.04] ${hasChildren ? 'border-b border-black/10' : ''} flex items-center justify-between cursor-pointer hover:bg-black/[0.07] transition-colors select-none">
                                                <div class="flex items-center gap-2.5 min-w-0 flex-1 mr-3 pointer-events-none">
                                                    <span class="inline-flex items-center justify-center w-5 h-5 rounded-md bg-[#15803d]/10 text-[#15803d] shrink-0">
                                                        <i class="fa-solid fa-book-bookmark text-[10px]"></i>
                                                    </span>
                                                    <span class="text-xs font-normal text-black font-['Inter'] tracking-tight whitespace-normal break-words leading-tight">
                                                        Topic: ${escapeHtml(grp.topicTitle)}
                                                    </span>
                                                </div>
                                                <div class="topic-release-row flex items-center gap-2 shrink-0 select-none">
                                                    <span class="text-[11px] font-semibold text-black/60 font-['Inter']">Release Topic</span>
                                                    <input type="checkbox" name="picker-unified-item"
                                                        data-category="topics"
                                                        data-id="${escapeHtml(String(topicEffectiveId))}"
                                                        data-title="${escapeHtml(grp.topicTitle)}"
                                                        onchange="window.syncCurrentUnifiedPickerItemCheck?.(this)"
                                                        style="accent-color: #15803d;"
                                                        class="w-4 h-4 rounded border-slate-300 accent-[#15803d] text-[#15803d] focus:ring-0 cursor-pointer shrink-0" />
                                                </div>
                                            </label>
                                        ` : `
                                            <div class="topic-picker-header px-4 py-2.5 bg-black/[0.04] ${hasChildren ? 'border-b border-black/10' : ''} flex items-center justify-between">
                                                <div class="flex items-center gap-2.5 min-w-0 flex-1 mr-3">
                                                    <span class="inline-flex items-center justify-center w-5 h-5 rounded-md bg-[#15803d]/10 text-[#15803d] shrink-0">
                                                        <i class="fa-solid fa-book-bookmark text-[10px]"></i>
                                                    </span>
                                                    <span class="text-xs font-normal text-black font-['Inter'] tracking-tight whitespace-normal break-words leading-tight">
                                                        Topic: ${escapeHtml(grp.topicTitle)}
                                                    </span>
                                                </div>
                                                <span class="text-[11px] font-semibold text-black/40 shrink-0 font-['Inter']">
                                                    ${grp.learningMaterials.length + grp.assessments.length} ${(grp.learningMaterials.length + grp.assessments.length) === 1 ? 'item' : 'items'}
                                                </span>
                                            </div>
                                        `}

                                        <!-- Items under this topic -->
                                        ${(grp.learningMaterials.length > 0 || grp.assessments.length > 0) ? `
                                            <div class="divide-y divide-black/5">
                                                <!-- Learning Materials -->
                                                ${grp.learningMaterials.map(m => `
                                                    <label class="picker-item-row picker-item-learning p-3 hover:bg-black/[0.02] flex items-center justify-between gap-3.5 cursor-pointer transition-colors" data-picker-category="learning">
                                                        <div class="flex items-center gap-3 min-w-0 flex-1">
                                                            <div class="w-7 h-7 rounded-lg ${m.type === 'Video' ? 'bg-red-50 border-red-100 text-red-600' : 'bg-blue-50 border-blue-100 text-blue-600'} border flex items-center justify-center shrink-0">
                                                                <i class="${m.type === 'Video' ? 'fa-solid fa-circle-play' : 'fa-solid fa-file-lines'} text-xs"></i>
                                                            </div>
                                                            <div class="min-w-0 flex-1">
                                                                <h4 class="text-xs font-normal text-black font-['Inter'] whitespace-normal break-words leading-tight">${escapeHtml(m.title)}</h4>
                                                                <p class="text-[10px] text-black/50 font-['Inter'] mt-0.5">Learning Material</p>
                                                            </div>
                                                        </div>
                                                        <input type="checkbox" name="picker-unified-item"
                                                            data-category="learning"
                                                            data-id="${escapeHtml(String(m.id))}"
                                                            data-title="${escapeHtml(m.title)}"
                                                            onchange="window.syncCurrentUnifiedPickerItemCheck?.(this)"
                                                            style="accent-color: #15803d;"
                                                            class="w-4 h-4 rounded border-slate-300 accent-[#15803d] text-[#15803d] focus:ring-0 cursor-pointer shrink-0" />
                                                    </label>
                                                `).join('')}

                                                <!-- Assessment Materials -->
                                                ${grp.assessments.map(m => `
                                                    <label class="picker-item-row picker-item-assessments p-3 hover:bg-black/[0.02] flex items-center justify-between gap-3.5 cursor-pointer transition-colors" data-picker-category="assessments">
                                                        <div class="flex items-center gap-3 min-w-0 flex-1">
                                                            <div class="w-7 h-7 rounded-lg ${m.type === 'Quiz' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-amber-50 border-amber-100 text-amber-600'} border flex items-center justify-center shrink-0">
                                                                <i class="${m.type === 'Quiz' ? 'fa-solid fa-stopwatch' : 'fa-solid fa-clipboard-list'} text-xs"></i>
                                                            </div>
                                                            <div class="min-w-0 flex-1">
                                                                <h4 class="text-xs font-normal text-black font-['Inter'] whitespace-normal break-words leading-tight">${escapeHtml(m.title)}</h4>
                                                                <p class="text-[10px] text-black/50 font-['Inter'] mt-0.5">Assessment</p>
                                                            </div>
                                                        </div>
                                                        <input type="checkbox" name="picker-unified-item"
                                                            data-category="assessments"
                                                            data-id="${escapeHtml(String(m.id))}"
                                                            data-title="${escapeHtml(m.title)}"
                                                            onchange="window.syncCurrentUnifiedPickerItemCheck?.(this)"
                                                            style="accent-color: #15803d;"
                                                            class="w-4 h-4 rounded border-slate-300 accent-[#15803d] text-[#15803d] focus:ring-0 cursor-pointer shrink-0" />
                                                    </label>
                                                `).join('')}
                                            </div>
                                        ` : ''}
                                    </div>
                                `;
                            }).join('')}
                        ` : `
                            <div class="sigma-empty-state-black-fade p-8 rounded-2xl border-2 border-dashed border-black/10 bg-black/[0.02] text-center font-['Inter']">
                                <p class="text-sm font-semibold text-black/60 font-['Inter']">No ${quarterLabel} Topics or Materials Available to Release</p>
                                <p class="text-xs font-normal text-black-fade mt-1 font-['Inter']">All matching topics, learning materials, and assessments have already been released for this section.</p>
                            </div>
                        `}
                    </div>
                </div>

                <!-- Footer -->
                <div class="px-6 sm:px-8 py-4 sm:py-5 flex items-center justify-between gap-3 shrink-0 font-['Inter'] w-full">
                    <button type="button" onclick="window.closeTeacherTopicsAndMaterialsPickerModal?.(true)"
                        class="picker-footer-back-btn sigma-btn sigma-btn-white sigma-btn-md cursor-pointer font-['Inter']">
                        Back
                    </button>
                    <button type="button" id="topics-materials-picker-submit-btn" onclick="window.submitTopicsAndMaterialsPicker?.()"
                        disabled
                        class="sigma-btn sigma-btn-primary h-9 sm:h-[42px] px-5 sm:px-7 text-xs sm:text-sm font-semibold rounded-xl opacity-40 cursor-not-allowed pointer-events-none font-['Inter'] inline-flex items-center gap-2 order-2 ml-auto">
                        <span>Set Schedule</span>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        if (prevModal && prevModal !== overlay) {
            prevModal.classList.add('hidden');
        }
        window.syncTopicsAndMaterialsPickerSubmitBtn?.();
    };

    window.setTopicsAndMaterialsPickerFilter = function (filter) {
        const chips = document.querySelectorAll('#unified-picker-filter-chips .quiz-storage-filter-chip');
        chips.forEach(chip => {
            if (chip.dataset.filter === filter) {
                chip.className = "quiz-storage-filter-chip px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer bg-[#15803d] text-white shadow-2xs";
            } else {
                chip.className = "quiz-storage-filter-chip px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 bg-slate-100 text-black-fade hover:text-black hover:bg-slate-200/70";
            }
        });

        const cards = document.querySelectorAll('#teacher-topics-materials-picker-overlay .topic-picker-card');
        cards.forEach(card => {
            let cardHasVisibleItems = false;

            const topicReleaseRow = card.querySelector('.topic-release-row');
            const topicHeader = card.querySelector('.topic-picker-header');
            if (topicReleaseRow) {
                if (filter === 'all' || filter === 'topics') {
                    topicReleaseRow.style.display = '';
                    if (topicHeader && topicHeader.tagName === 'LABEL') {
                        topicHeader.classList.add('cursor-pointer', 'hover:bg-black/[0.07]');
                        topicHeader.classList.remove('pointer-events-none');
                    }
                    cardHasVisibleItems = true;
                } else {
                    topicReleaseRow.style.display = 'none';
                    if (topicHeader && topicHeader.tagName === 'LABEL') {
                        topicHeader.classList.remove('cursor-pointer', 'hover:bg-black/[0.07]');
                        topicHeader.classList.add('pointer-events-none');
                    }
                }
            }

            const learningItems = card.querySelectorAll('.picker-item-learning');
            learningItems.forEach(el => {
                if (filter === 'all' || filter === 'learning') {
                    el.style.display = '';
                    cardHasVisibleItems = true;
                } else {
                    el.style.display = 'none';
                }
            });

            const assessmentItems = card.querySelectorAll('.picker-item-assessments');
            assessmentItems.forEach(el => {
                if (filter === 'all' || filter === 'assessments') {
                    el.style.display = '';
                    cardHasVisibleItems = true;
                } else {
                    el.style.display = 'none';
                }
            });

            card.style.display = cardHasVisibleItems ? '' : 'none';
        });
    };

    window.syncCurrentUnifiedPickerItemCheck = function (input) {
        if (!input) return;
        const cat = input.dataset.category;
        const id = String(input.dataset.id || input.value);
        const title = input.dataset.title || '';
        const key = `${cat}::${id}`;
        if (!window._topicsAndMaterialsPickerWorking) {
            window._topicsAndMaterialsPickerWorking = new Map();
        }
        if (input.checked) {
            window._topicsAndMaterialsPickerWorking.set(key, { category: cat, id, title });
        } else {
            window._topicsAndMaterialsPickerWorking.delete(key);
        }
        window.syncTopicsAndMaterialsPickerSubmitBtn?.();
    };

    window.selectAllTopicsAndMaterialsPickerItems = function () {
        if (!window._topicsAndMaterialsPickerWorking) window._topicsAndMaterialsPickerWorking = new Map();
        document.querySelectorAll('#teacher-topics-materials-picker-overlay input[name="picker-unified-item"]').forEach(el => {
            const itemRow = el.closest('.picker-item-row') || el.closest('.topic-release-row') || el.closest('.topic-picker-header');
            const card = el.closest('.topic-picker-card');
            if ((!itemRow || itemRow.style.display !== 'none') && (!card || card.style.display !== 'none')) {
                el.checked = true;
                const cat = el.dataset.category;
                const id = String(el.dataset.id || el.value);
                const title = el.dataset.title || '';
                window._topicsAndMaterialsPickerWorking.set(`${cat}::${id}`, { category: cat, id, title });
            }
        });
        window.syncTopicsAndMaterialsPickerSubmitBtn?.();
    };

    window.deselectAllTopicsAndMaterialsPickerItems = function () {
        if (!window._topicsAndMaterialsPickerWorking) window._topicsAndMaterialsPickerWorking = new Map();
        document.querySelectorAll('#teacher-topics-materials-picker-overlay input[name="picker-unified-item"]').forEach(el => {
            el.checked = false;
            const cat = el.dataset.category;
            const id = String(el.dataset.id || el.value);
            window._topicsAndMaterialsPickerWorking.delete(`${cat}::${id}`);
        });
        window.syncTopicsAndMaterialsPickerSubmitBtn?.();
    };

    window.syncTopicsAndMaterialsPickerSubmitBtn = function () {
        const working = window._topicsAndMaterialsPickerWorking || new Map();
        const count = working.size;
        const selectBtn = document.getElementById('topics-materials-picker-submit-btn');
        if (selectBtn) {
            if (count > 0) {
                selectBtn.disabled = false;
                selectBtn.className = "sigma-btn sigma-btn-primary sigma-btn-md cursor-pointer font-['Inter'] inline-flex items-center gap-2";
                selectBtn.innerHTML = `
                    <span>Set Schedule</span>
                    <span class="px-1.5 py-0.5 rounded-full bg-white/20 text-white text-xs font-bold leading-none min-w-[20px] text-center">
                        ${count}
                    </span>
                `;
            } else {
                selectBtn.disabled = true;
                selectBtn.className = "sigma-btn sigma-btn-primary sigma-btn-md font-['Inter'] opacity-40 cursor-not-allowed pointer-events-none inline-flex items-center gap-2";
                selectBtn.innerHTML = `<span>Set Schedule</span>`;
            }
        }
    };

    window.submitTopicsAndMaterialsPicker = function () {
        const working = window._topicsAndMaterialsPickerWorking || new Map();
        if (working.size === 0) return;

        const selectedTopics = [];
        const selectedLearning = [];
        const selectedAssessments = [];

        working.forEach(item => {
            if (item.category === 'topics') selectedTopics.push(item);
            else if (item.category === 'learning') selectedLearning.push(item);
            else if (item.category === 'assessments') selectedAssessments.push(item);
        });

        const subjectId = (typeof resolveTeacherActiveSubjectId === 'function')
            ? resolveTeacherActiveSubjectId(currentTopicState?.subjectId)
            : (currentTopicState?.subjectId || 'card-prog1');
        const section = (typeof resolveTeacherActiveSection === 'function')
            ? resolveTeacherActiveSection(currentTopicState?.selectedSection)
            : (currentTopicState?.selectedSection || '');

        window._unifiedPickerSelection = {
            subjectId,
            section,
            topics: selectedTopics.map(t => String(t.id)),
            learning: selectedLearning.map(m => String(m.id)),
            assessments: selectedAssessments.map(a => String(a.id)),
            allSelected: Array.from(working.values())
        };
        window._topicReleaseCollapsedState = {};

        let primaryCategory = 'topics';
        if (selectedTopics.length > 0) primaryCategory = 'topics';
        else if (selectedLearning.length > 0) primaryCategory = 'learning';
        else if (selectedAssessments.length > 0) primaryCategory = 'assessments';

        if (selectedTopics.length > 0) {
            if (!window._topicReleaseDraftState) window._topicReleaseDraftState = {};
            window._topicReleaseDraftState.pendingTopicIds = selectedTopics.map(t => String(t.id));
            window._topicReleaseDraftState._isPickerFlow = true;
            window._topicReleaseDraftState._subjectId = subjectId;
            window._topicReleaseDraftState._section = section;
        }
        if (selectedLearning.length > 0) {
            if (!window._learningMaterialsReleaseDraftState) window._learningMaterialsReleaseDraftState = {};
            window._learningMaterialsReleaseDraftState.pendingMaterialIds = selectedLearning.map(m => String(m.id));
            window._learningMaterialsReleaseDraftState._isPickerFlow = true;
            window._learningMaterialsReleaseDraftState._subjectId = subjectId;
            window._learningMaterialsReleaseDraftState._section = section;
        }
        if (selectedAssessments.length > 0) {
            if (!window._assessmentsReleaseDraftState) window._assessmentsReleaseDraftState = {};
            window._assessmentsReleaseDraftState.pendingMaterialIds = selectedAssessments.map(a => String(a.id));
            window._assessmentsReleaseDraftState._isPickerFlow = true;
            window._assessmentsReleaseDraftState._subjectId = subjectId;
            window._assessmentsReleaseDraftState._section = section;
        }

        const initialTargetId = selectedTopics.length > 0 ? String(selectedTopics[0].id) : null;
        window.openTeacherUnifiedScheduleModal?.(primaryCategory, initialTargetId, '', 'schedule');
    };

    window.closeTeacherTopicsAndMaterialsPickerModal = function (returnToReleaseModal = true) {
        window._topicsAndMaterialsPickerWorking = new Map();
        if (returnToReleaseModal) {
            const prev = document.getElementById('teacher-release-assessments-overlay')
                || document.getElementById('teacher-release-topics-overlay')
                || document.getElementById('teacher-release-learning-materials-overlay');
            if (prev) {
                prev.classList.remove('hidden');
                prev.style.display = '';
                prev.classList.add('curriculum-hub-overlay--visible');
            } else {
                window.openTeacherReleaseAssessmentsModal?.(true);
            }
        }
        const overlay = document.getElementById('teacher-topics-materials-picker-overlay');
        if (overlay) overlay.remove();
    };
    window.openTeacherReleaseTopicsAndMaterialsModal = window.openTeacherReleaseAssessmentsModal;

    window.cancelTeacherReleaseAssessmentsDraft = function () {
        if (window._assessmentsReleaseDraftState) {
            window._assessmentsReleaseDraftState.pendingMaterialIds = [];
        }
        window.openTeacherReleaseAssessmentsModal(true);
    };

    // ── Dedicated Sub-Modal for Assessments Picker ────────────────────────────
    window.openTeacherAssessmentsPickerModal = function () {
        const subjectId = (typeof resolveTeacherActiveSubjectId === 'function')
            ? resolveTeacherActiveSubjectId(typeof currentTopicState !== 'undefined' ? currentTopicState?.subjectId : null)
            : ((typeof currentTopicState !== 'undefined' ? currentTopicState?.subjectId : null) || window.currentTopicState?.subjectId || 'card-prog1');
        const section = (typeof resolveTeacherActiveSection === 'function')
            ? resolveTeacherActiveSection(typeof currentTopicState !== 'undefined' ? currentTopicState?.selectedSection : null)
            : ((typeof currentTopicState !== 'undefined' ? currentTopicState?.selectedSection : null) || window.currentTopicState?.selectedSection || '');
        if (typeof currentTopicState !== 'undefined' && currentTopicState) {
            currentTopicState.subjectId = subjectId;
            currentTopicState.selectedSection = section;
            window.currentTopicState = currentTopicState;
        }
        const allAssessments = window.getTeacherSubjectAssessments(subjectId, section);

        // Section details
        const adminSections = getStoredJson('sigma-admin-sections', []);
        const cleanSectionName = (section || '').trim().toLowerCase();
        const matchedSec = adminSections.find(s => {
            const sName = (s.name || s.sectionName || '').trim().toLowerCase();
            return sName === cleanSectionName || (cleanSectionName && (sName.includes(cleanSectionName) || cleanSectionName.includes(sName)));
        });

        let sectionNameOnly = matchedSec?.name || section;
        let gradeLevel = matchedSec?.grade || (section.includes('Grade 12') ? 'Grade 12' : 'Grade 11');
        let roomNumber = matchedSec?.room || '302';
        let schoolYear = matchedSec?.schoolYear || '2026–2027';

        if (!matchedSec && section && section.includes(' - ')) {
            const parts = section.split(' - ');
            if (parts[0].includes('Grade')) gradeLevel = parts[0].trim();
            sectionNameOnly = parts.slice(1).join(' - ').trim() || section;
        }

        // Already released
        let releaseConfig = { releasedMaterialIds: [] };
        try {
            const saved = (typeof window.getAssessmentReleaseConfig === 'function')
                ? window.getAssessmentReleaseConfig(subjectId, section)
                : getStoredJson(`sigma_assessment_release_${subjectId}_${section}`, null);
            if (saved && Array.isArray(saved.releasedMaterialIds)) releaseConfig = saved;
        } catch (e) {}
        const releasedIds = (releaseConfig.releasedMaterialIds || []).map(s => String(s).trim().toLowerCase());
        const assessmentIsReleased = (m) => {
            const candidates = [m.id, m.title, m.materialId, m.quizId, m.selectedQuizId]
                .filter(v => v !== undefined && v !== null && String(v).trim() !== '')
                .map(v => String(v).trim().toLowerCase());
            return candidates.some(c => releasedIds.includes(c));
        };

        const availableQuarters = (typeof window.getSubjectReleaseQuarters === 'function')
            ? window.getSubjectReleaseQuarters(subjectId)
            : ['q1', 'q2'];
        let activeQuarter = (typeof window.getActiveReleaseQuarter === 'function') ? window.getActiveReleaseQuarter() : 'q1';
        if (!availableQuarters.includes(activeQuarter.toLowerCase())) {
            activeQuarter = availableQuarters[0] || 'q1';
            window.setActiveReleaseQuarter?.(activeQuarter);
        }
        const quarterAssessments = allAssessments.filter(m => (m.quarter || 'q1').toLowerCase() === activeQuarter.toLowerCase());

        // Unreleased items
        const unreleased = quarterAssessments.filter(m => !assessmentIsReleased(m));
        const unreleasedAssign = unreleased.filter(m => m.type === 'Assignment');
        const unreleasedQuizzes = unreleased.filter(m => m.type === 'Quiz');
        const unreleasedAct = unreleased.filter(m => m.type === 'Activity');
        const unreleasedPt = unreleased.filter(m => m.type === 'Performance Task');
        const unreleasedTasks = unreleased.filter(m => m.type === 'Task' || m.type === 'Assignment' || m.type === 'Activity' || m.type === 'Performance Task' || m.type !== 'Quiz');

        const draftPendingIds = window._assessmentsReleaseDraftState?.pendingMaterialIds || [];

        // Hide manager modal temporarily without tearing it down
        const prevModal = document.getElementById('teacher-release-assessments-overlay');

        let existing = document.getElementById('teacher-assessments-picker-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'teacher-assessments-picker-overlay';
        overlay.className = 'curriculum-hub-overlay curriculum-hub-overlay--visible';
        overlay.dataset._historyPushed = 'true';
        overlay.onclick = function (e) { e.stopPropagation(); };

        if (typeof window.pushModalHistoryState === 'function') {
            window.pushModalHistoryState('teacher-assessments-picker-overlay');
        }

        window._assessmentsPickerWorkingIds = [...draftPendingIds];
        window._assessmentsPickerUnreleasedList = unreleased;
        window.syncCurrentAssessmentItemCheck = function (input) {
            if (!Array.isArray(window._assessmentsPickerWorkingIds)) {
                window._assessmentsPickerWorkingIds = [];
            }
            const id = String(input.value);
            const arr = window._assessmentsPickerWorkingIds.map(String);
            if (input.checked) {
                if (!arr.includes(id)) arr.push(id);
            } else {
                const idx = arr.indexOf(id);
                if (idx !== -1) arr.splice(idx, 1);
            }
            window._assessmentsPickerWorkingIds = arr;
            window.syncAssessmentsPickerSubmitBtn?.();
        };

        const quarterLabel = (typeof window.getReleaseQuarterLabel === 'function') ? window.getReleaseQuarterLabel(activeQuarter) : '1st Quarter';
        window.renderAssessmentsPickerGroupedList = function (list, emptyLabel = 'assessments') {
            const currentWorking = window._assessmentsPickerWorkingIds || [];
            if (!list || list.length === 0) {
                return `
                    <div class="sigma-empty-state-black-fade p-6 rounded-2xl border-2 border-dashed border-black/10 bg-black/[0.02] text-center font-['Inter']">
                        <p class="empty-title text-xs font-semibold text-black/60 font-['Inter']" style="color: rgba(0,0,0,0.60);">No ${quarterLabel} ${String(emptyLabel || '').replace(/\b\w/g, function (ch) { return ch.toUpperCase(); })} Available to Release</p>
                        <p class="empty-desc text-[11px] font-normal text-black-fade mt-0.5 font-['Inter']" style="color: rgba(0,0,0,0.45);">All matching tasks may have already been released or none match this category.</p>
                    </div>
                `;
            }

            const getIcon = (type) => {
                if (type === 'Quiz') return { icon: 'fa-solid fa-stopwatch text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' };
                return { icon: 'fa-solid fa-clipboard-list text-amber-600', bg: 'bg-amber-50 border-amber-100' };
            };

            // Group items by topic
            const topicMap = new Map();
            list.forEach(m => {
                const topicKey = (m.topicTitle && m.topicTitle.trim()) ? m.topicTitle.trim() : 'General Assessments';
                if (!topicMap.has(topicKey)) {
                    topicMap.set(topicKey, []);
                }
                topicMap.get(topicKey).push(m);
            });

            return `
                <div class="space-y-3.5 font-['Inter']">
                    ${Array.from(topicMap.entries()).map(([topicName, items]) => `
                        <div class="border border-black/10 rounded-xl overflow-hidden bg-white shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                            <!-- Topic Section Header -->
                            <div class="px-4 py-2.5 bg-black/[0.04] border-b border-black/10 flex items-center justify-between">
                                <div class="flex items-center gap-2 min-w-0">
                                    <span class="inline-flex items-center justify-center w-5 h-5 rounded-md bg-[#15803d]/10 text-[#15803d] shrink-0">
                                        <i class="fa-solid fa-book-bookmark text-[10px]"></i>
                                    </span>
                                    <span class="text-xs font-bold text-black font-['Inter'] tracking-tight truncate">
                                        Topic: ${escapeHtml(topicName)}
                                    </span>
                                </div>
                                <span class="text-[11px] font-semibold text-black/60 shrink-0 font-['Inter'] px-2 py-0.5 rounded-full bg-black/[0.05]">
                                    ${items.length} ${items.length === 1 ? 'task' : 'tasks'}
                                </span>
                            </div>
                            <!-- Items under this topic -->
                            <div class="divide-y divide-black/5">
                                ${items.map(m => {
                                    const isChecked = currentWorking.includes(String(m.id));
                                    const { icon, bg } = getIcon(m.type);
                                    return `
                                        <label class="p-3 hover:bg-black/[0.02] flex items-center justify-between gap-3.5 cursor-pointer transition-colors">
                                             <div class="flex items-center gap-3 min-w-0 flex-1">
                                                <div class="w-7 h-7 rounded-lg ${bg} border flex items-center justify-center shrink-0">
                                                    <i class="${icon} text-xs"></i>
                                                </div>
                                                <div class="min-w-0 flex-1">
                                                    <h4 class="text-xs font-bold text-black font-['Inter'] truncate">${escapeHtml(m.title)}</h4>
                                                </div>
                                            </div>
                                            <input type="checkbox" name="picker-assessment-item" value="${escapeHtml(String(m.id))}" ${isChecked ? 'checked' : ''}
                                                style="accent-color: #15803d;"
                                                onchange="window.syncCurrentAssessmentItemCheck?.(this)"
                                                class="w-4 h-4 rounded border-slate-300 accent-[#15803d] text-[#15803d] focus:ring-0 cursor-pointer shrink-0" />
                                        </label>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        };

        overlay.innerHTML = `
            <div class="curriculum-hub-panel curriculum-picker-panel-fixed curriculum-release-panel-fixed w-full !max-w-[860px] flex flex-col overflow-hidden" style="height: 740px; min-height: min(740px, calc(100vh - 40px)); max-height: calc(100vh - 40px); max-width: 860px;" onclick="event.stopPropagation()">
                <!-- Header -->
                <div class="px-6 sm:px-8 py-5 border-b border-slate-100 flex items-center justify-between shrink-0 font-['Inter']">
                    <div class="flex items-center gap-3">
                        <button type="button" 
                            class="picker-header-back-btn p-1 bg-transparent hover:bg-transparent flex sm:hidden items-center justify-center text-black hover:text-black/70 transition-colors cursor-pointer shrink-0 border-0 outline-none"
                            onclick="window.closeTeacherAssessmentsPickerModal?.(true, true)"
                            title="Back">
                            <i class="fa-solid fa-chevron-left text-sm text-black"></i>
                        </button>
                        <div>
                            <h2 class="text-xl font-bold text-black font-['Inter'] tracking-tight">Select Assessments to Release</h2>
                            <p class="text-xs font-medium text-black-fade font-['Inter'] mt-0.5">Select assessment tasks to make available for this section</p>
                        </div>
                    </div>
                </div>

                <!-- Main Content -->
                <div class="p-6 sm:p-8 py-5 overflow-y-auto flex-1 space-y-4 font-['Inter']">
                    <!-- Context Strip -->
                    <div class="flex flex-wrap items-center gap-2 sm:gap-4 px-4 py-2 bg-black/[0.03] border border-black/10 rounded-xl text-xs font-['Inter'] font-medium text-black">
                        <span><b>Section:</b> ${escapeHtml(sectionNameOnly)}</span>
                        <span class="text-black/20">|</span>
                        <span><b>Grade:</b> ${escapeHtml(gradeLevel)}</span>
                        <span class="text-black/20">|</span>
                        <span><b>Room:</b> ${escapeHtml(roomNumber)}</span>
                        <span class="text-black/20">|</span>
                        <span><b>SY:</b> ${escapeHtml(schoolYear)}</span>
                    </div>

                    <!-- Quarter Filter Tabs (Below Context Strip) -->
                    <div class="flex items-center justify-start">
                        ${window.renderReleaseQuarterToggleHtml?.(subjectId, activeQuarter)}
                    </div>

                    <!-- Category Filter Chips (Pill Design) -->
                    <div class="flex flex-wrap items-center justify-between border-b border-black/10 pb-2.5 pt-1 gap-2 font-['Inter']">
                        <div class="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5" id="assess-picker-filter-chips">
                            <button type="button" onclick="window.setAssessmentsPickerFilter('all')" id="assess-filter-all"
                                class="quiz-storage-filter-chip px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer bg-[#15803d] text-white shadow-2xs" data-filter="all">
                                All
                            </button>
                            <button type="button" onclick="window.setAssessmentsPickerFilter('quiz')" id="assess-filter-quiz"
                                class="quiz-storage-filter-chip px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 bg-slate-100 text-black-fade hover:text-black hover:bg-slate-200/70" data-filter="quiz">
                                <i class="fa-solid fa-stopwatch text-[11px]"></i>
                                <span>Draft Quizzes (${unreleasedQuizzes.length})</span>
                            </button>
                            <button type="button" onclick="window.setAssessmentsPickerFilter('task')" id="assess-filter-task"
                                class="quiz-storage-filter-chip px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 bg-slate-100 text-black-fade hover:text-black hover:bg-slate-200/70" data-filter="task">
                                <i class="fa-solid fa-clipboard-list text-[11px]"></i>
                                <span>Draft Tasks (${unreleasedTasks.length})</span>
                            </button>
                        </div>
                        <div class="flex items-center gap-1 text-xs font-semibold shrink-0 ml-auto font-['Inter']">
                            <button type="button" onclick="window.selectAllAssessmentsPickerItems()" class="px-2 py-1 rounded-lg text-[#15803d] hover:bg-emerald-50 active:bg-emerald-100 transition-colors cursor-pointer" style="color: #15803d;">Select All</button>
                            <span class="text-slate-300">|</span>
                            <button type="button" onclick="window.deselectAllAssessmentsPickerItems()" class="px-2 py-1 rounded-lg text-[#15803d] hover:bg-emerald-50 active:bg-emerald-100 transition-colors cursor-pointer" style="color: #15803d;">Deselect All</button>
                        </div>
                    </div>

                    <!-- Assessments Container -->
                    <div id="assess-picker-content-container" class="space-y-1 font-['Inter']">
                        ${window.renderAssessmentsPickerGroupedList(unreleased, 'assessments')}
                    </div>
                </div>

                <!-- Footer -->
                <div class="px-6 sm:px-8 py-4 sm:py-5 flex items-center justify-between gap-3 shrink-0 font-['Inter'] w-full">
                    <button type="button" onclick="window.closeTeacherAssessmentsPickerModal?.(true, true)"
                        class="picker-footer-back-btn sigma-btn sigma-btn-white sigma-btn-md cursor-pointer font-['Inter']">
                        Back
                    </button>
                    <button type="button" id="assessments-picker-submit-btn" onclick="window.submitAssessmentsPicker?.()"
                        disabled
                        class="sigma-btn sigma-btn-primary h-9 sm:h-[42px] px-5 sm:px-7 text-xs sm:text-sm font-semibold rounded-xl opacity-40 cursor-not-allowed pointer-events-none font-['Inter'] inline-flex items-center gap-2 order-2 ml-auto">
                        <span>Set Schedule</span>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        if (prevModal && prevModal !== overlay) {
            prevModal.classList.add('hidden');
        }
        window.syncAssessmentsPickerSubmitBtn?.();
    };

    window.syncAssessmentsPickerSubmitBtn = function () {
        const currentWorking = window._assessmentsPickerWorkingIds || [];
        const selectBtn = document.getElementById('assessments-picker-submit-btn');
        if (selectBtn) {
            const count = currentWorking.length;
            if (count > 0) {
                selectBtn.disabled = false;
                selectBtn.className = "sigma-btn sigma-btn-primary sigma-btn-md cursor-pointer font-['Inter'] inline-flex items-center gap-2";
                selectBtn.innerHTML = `
                    <span>Set Schedule</span>
                    ${count > 1 ? `
                        <span class="px-1.5 py-0.5 rounded-full bg-white/20 text-white text-xs font-bold leading-none min-w-[20px] text-center">
                            ${count}
                        </span>
                    ` : ''}
                `;
            } else {
                selectBtn.disabled = true;
                selectBtn.className = "sigma-btn sigma-btn-primary sigma-btn-md font-['Inter'] opacity-40 cursor-not-allowed pointer-events-none inline-flex items-center gap-2";
                selectBtn.innerHTML = `<span>Set Schedule</span>`;
            }
        }
    };

    window.closeTeacherAssessmentsPickerModal = function (returnToReleaseModal = false, isCancel = false) {
        if (returnToReleaseModal) {
            if (isCancel && window._assessmentsReleaseDraftState) {
                window._assessmentsReleaseDraftState.pendingMaterialIds = [];
            }
            window._assessmentsPickerWorkingIds = [];
            const prev = document.getElementById('teacher-release-assessments-overlay');
            if (prev) {
                prev.classList.remove('hidden');
                prev.style.display = '';
                prev.classList.add('curriculum-hub-overlay--visible');
            } else {
                window.openTeacherReleaseAssessmentsModal?.(true);
            }
        } else {
            window.closeManageCurriculumHub?.();
            document.querySelectorAll('#curriculum-hub-overlay, #teacher-release-assessments-overlay, #teacher-assessments-picker-overlay, #teacher-topic-schedule-overlay').forEach(el => el.remove());
            if (typeof window.unlockBodyScroll === 'function') window.unlockBodyScroll();
        }
        const overlay = document.getElementById('teacher-assessments-picker-overlay');
        if (overlay) overlay.remove();
    };

    

    window.switchAssessmentsPickerTab = function (tab) {
        window.setAssessmentsPickerFilter(tab);
    };

    window.selectAllAssessmentsPickerItems = function () {
        const unreleased = window._assessmentsPickerUnreleasedList || [];
        window._assessmentsPickerWorkingIds = unreleased.map(m => String(m.id));
        document.querySelectorAll('#teacher-assessments-picker-overlay input[name="picker-assessment-item"]').forEach(el => {
            el.checked = true;
        });
        window.syncAssessmentsPickerSubmitBtn?.();
    };

    window.deselectAllAssessmentsPickerItems = function () {
        window._assessmentsPickerWorkingIds = [];
        document.querySelectorAll('#teacher-assessments-picker-overlay input[name="picker-assessment-item"]').forEach(el => {
            el.checked = false;
        });
        window.syncAssessmentsPickerSubmitBtn?.();
    };

    window.submitAssessmentsPicker = function () {
        document.querySelectorAll('#teacher-assessments-picker-overlay input[name="picker-assessment-item"]').forEach(el => {
            window.syncCurrentAssessmentItemCheck?.(el);
        });
        const currentWorking = window._assessmentsPickerWorkingIds || [];
        if (currentWorking.length === 0) return;
        if (!window._assessmentsReleaseDraftState) window._assessmentsReleaseDraftState = {};
        window._assessmentsReleaseDraftState.pendingMaterialIds = [...currentWorking];
        window._assessmentsReleaseDraftState._isPickerFlow = true;

        window.openTeacherUnifiedScheduleModal?.('assessments', null, '', 'schedule');
    };

    window.saveTeacherReleasedAssessments = function () {
        window.saveTeacherUnifiedSchedule?.('assessments');
    };

    window.closeTeacherReleaseAssessmentsModal = function (returnToHub = false) {
        window.closeAllReleasedTopicActionMenus?.();
        window._assessmentsReleaseDraftState = null;
        const overlay = document.getElementById('teacher-release-assessments-overlay');
        if (!overlay) {
            window.closeManageCurriculumHub?.();
            return;
        }
        overlay.classList.remove('curriculum-hub-overlay--visible');
        overlay.remove();

        const activeSubjId = (typeof resolveTeacherActiveSubjectId === 'function')
            ? resolveTeacherActiveSubjectId(currentTopicState?.subjectId)
            : (currentTopicState?.subjectId || 'card-prog1');

        const hubOverlay = document.getElementById('curriculum-hub-overlay');
        if (hubOverlay) hubOverlay.remove();
        window.closeManageCurriculumHub?.();
        document.querySelectorAll('#teacher-release-topics-overlay, #teacher-topic-picker-overlay, #teacher-topic-schedule-overlay, #teacher-release-learning-materials-overlay, #teacher-learning-picker-overlay, #teacher-release-assessments-overlay, #teacher-assessments-picker-overlay').forEach(el => el.remove());
        if (typeof window.unlockBodyScroll === 'function') {
            window.unlockBodyScroll();
        } else {
            document.documentElement.classList.remove('dialog-open', 'modal-open', 'sigma-modal-open', 'has-modal-open');
            document.body.classList.remove('dialog-open', 'modal-open', 'sigma-modal-open', 'has-modal-open');
        }

        if (activeSubjId) {
            setTimeout(() => {
                refreshTeacherTopicUIIfVisible(activeSubjId);
            }, 50);
        }

        window.flushTeacherReleaseToastQueue?.();
    };

    window.toggleReleasedAssessmentMenu = function (matId, title, isHidden = false, e) {
        window.toggleReleasedItemActionMenu('assessments', matId, title, isHidden, e);
    };

    window.toggleTeacherAssessmentHidden = function (matId, e) {
        window.toggleUnifiedItemHidden('assessments', matId, true, e);
    };

    window.unreleaseTeacherAssessment = function (matId, e, title = '') {
        window.unreleaseUnifiedItem('assessments', matId, e, title);
    };

    window._filterTopicStudents = function (query) {
        const list = document.getElementById('topic-student-picker-list');
        if (!list) return;
        const q = query.toLowerCase().trim();
        list.querySelectorAll('.topic-student-item').forEach(btn => {
            const name = (btn.dataset.name || '').toLowerCase();
            btn.style.display = name.includes(q) ? '' : 'none';
        });
    };
})();
