/**
 * SIGMA ELMS - Unified Subject & Curriculum Editor Component
 * Shared across Admin and Teacher portals.
 * Provides the 3-step Subject Creation & Editing Workstation:
 *   - Step 1: Add Subject (Code, Name, Units, Type, Strand)
 *   - Step 2: Add Topic (Reorderable topics list, topic editor drawer)
 *   - Step 3: Add Material (Categorized materials, search, material editor drawer, quiz picker)
 */

(function () {
    const SUBJECTS_STORAGE_KEY = window.SUBJECTS_STORAGE_KEY || 'sigma-admin-subjects';
    window.SUBJECTS_STORAGE_KEY = SUBJECTS_STORAGE_KEY;

    // Helper functions
    function _getStored(key, defaultVal) {
        if (typeof window.getStoredJson === 'function') return window.getStoredJson(key, defaultVal);
        try {
            const raw = localStorage.getItem(key);
            if (!raw || raw === 'undefined' || raw === 'null' || raw === 'NaN') return defaultVal;
            const parsed = JSON.parse(raw);
            if (defaultVal !== null && defaultVal !== undefined) {
                if (Array.isArray(defaultVal) && !Array.isArray(parsed)) return defaultVal;
                if (!Array.isArray(defaultVal) && typeof defaultVal === 'object' && (typeof parsed !== 'object' || Array.isArray(parsed))) return defaultVal;
            }
            return parsed;
        } catch (e) {
            return defaultVal;
        }
    }

    function _saveStored(key, val) {
        if (typeof window.saveStoredJson === 'function') return window.saveStoredJson(key, val);
        try {
            localStorage.setItem(key, JSON.stringify(val));
        } catch (e) {}
    }

    function sanitizeMaterialForStorage(mat) {
        if (!mat || typeof mat !== 'object') return mat;
        const clean = { ...mat };
        delete clean.file;
        delete clean.rubricFile;
        delete clean.perfGuidelinesFile;
        delete clean.perfRubricFile;

        // Ensure binary file is stored in IndexedDB before discarding raw data URL from LocalStorage payload
        if (clean.fileName && typeof clean.fileUrl === 'string' && clean.fileUrl.startsWith('data:')) {
            if (typeof window.sigmaStoreDocument === 'function') {
                window.sigmaStoreDocument(clean.fileName, clean.fileUrl, {
                    name: clean.fileName,
                    title: clean.title || clean.name || '',
                    type: clean.fileType || (clean.fileName ? clean.fileName.split('.').pop() : 'docx'),
                    url: 'image/' + clean.fileName
                });
            }
        }
        // Fallback: if fileUrl is still a blob: (FileReader didn't finish in time), retrieve the
        // original File object from memory and persist it to IndexedDB so the file isn't lost.
        if (clean.fileName && typeof clean.fileUrl === 'string' && clean.fileUrl.startsWith('blob:')) {
            if (typeof window.sigmaStoreDocument === 'function') {
                const _map = window._sigmaUploadedFiles;
                const _storedFile = _map && (_map.get(clean.fileUrl) || _map.get(clean.fileName) || _map.get(clean.fileName.toLowerCase()));
                if (_storedFile) {
                    window.sigmaStoreDocument(clean.fileName, _storedFile, {
                        name: clean.fileName,
                        title: clean.title || clean.name || '',
                        type: clean.fileType || (clean.fileName ? clean.fileName.split('.').pop() : 'docx'),
                        url: 'image/' + clean.fileName
                    });
                }
            }
        }
        if (clean.rubricFileName && typeof clean.rubricUrl === 'string' && clean.rubricUrl.startsWith('data:')) {
            if (typeof window.sigmaStoreDocument === 'function') {
                window.sigmaStoreDocument(clean.rubricFileName, clean.rubricUrl, {
                    name: clean.rubricFileName,
                    title: clean.rubricFileName,
                    type: (clean.rubricFileName ? clean.rubricFileName.split('.').pop() : 'docx'),
                    url: 'image/' + clean.rubricFileName
                });
            }
        }
        if (clean.rubricFileName && typeof clean.rubricUrl === 'string' && clean.rubricUrl.startsWith('blob:')) {
            if (typeof window.sigmaStoreDocument === 'function') {
                const _map = window._sigmaUploadedFiles;
                const _storedFile = _map && (_map.get(clean.rubricUrl) || _map.get(clean.rubricFileName) || _map.get(clean.rubricFileName.toLowerCase()));
                if (_storedFile) {
                    window.sigmaStoreDocument(clean.rubricFileName, _storedFile, {
                        name: clean.rubricFileName,
                        title: clean.rubricFileName,
                        type: (clean.rubricFileName ? clean.rubricFileName.split('.').pop() : 'docx'),
                        url: 'image/' + clean.rubricFileName
                    });
                }
            }
        }
        if (clean.perfGuidelinesFileName && typeof clean.perfGuidelinesUrl === 'string' && clean.perfGuidelinesUrl.startsWith('data:')) {
            if (typeof window.sigmaStoreDocument === 'function') {
                window.sigmaStoreDocument(clean.perfGuidelinesFileName, clean.perfGuidelinesUrl, {
                    name: clean.perfGuidelinesFileName,
                    title: clean.perfGuidelinesFileName,
                    type: (clean.perfGuidelinesFileName ? clean.perfGuidelinesFileName.split('.').pop() : 'docx'),
                    url: 'image/' + clean.perfGuidelinesFileName
                });
            }
        }
        if (clean.perfGuidelinesFileName && typeof clean.perfGuidelinesUrl === 'string' && clean.perfGuidelinesUrl.startsWith('blob:')) {
            if (typeof window.sigmaStoreDocument === 'function') {
                const _map = window._sigmaUploadedFiles;
                const _storedFile = _map && (_map.get(clean.perfGuidelinesUrl) || _map.get(clean.perfGuidelinesFileName) || _map.get(clean.perfGuidelinesFileName.toLowerCase()));
                if (_storedFile) {
                    window.sigmaStoreDocument(clean.perfGuidelinesFileName, _storedFile, {
                        name: clean.perfGuidelinesFileName,
                        title: clean.perfGuidelinesFileName,
                        type: (clean.perfGuidelinesFileName ? clean.perfGuidelinesFileName.split('.').pop() : 'docx'),
                        url: 'image/' + clean.perfGuidelinesFileName
                    });
                }
            }
        }
        if (clean.perfRubricFileName && typeof clean.perfRubricUrl === 'string' && clean.perfRubricUrl.startsWith('data:')) {
            if (typeof window.sigmaStoreDocument === 'function') {
                window.sigmaStoreDocument(clean.perfRubricFileName, clean.perfRubricUrl, {
                    name: clean.perfRubricFileName,
                    title: clean.perfRubricFileName,
                    type: (clean.perfRubricFileName ? clean.perfRubricFileName.split('.').pop() : 'docx'),
                    url: 'image/' + clean.perfRubricFileName
                });
            }
        }
        if (clean.perfRubricFileName && typeof clean.perfRubricUrl === 'string' && clean.perfRubricUrl.startsWith('blob:')) {
            if (typeof window.sigmaStoreDocument === 'function') {
                const _map = window._sigmaUploadedFiles;
                const _storedFile = _map && (_map.get(clean.perfRubricUrl) || _map.get(clean.perfRubricFileName) || _map.get(clean.perfRubricFileName.toLowerCase()));
                if (_storedFile) {
                    window.sigmaStoreDocument(clean.perfRubricFileName, _storedFile, {
                        name: clean.perfRubricFileName,
                        title: clean.perfRubricFileName,
                        type: (clean.perfRubricFileName ? clean.perfRubricFileName.split('.').pop() : 'docx'),
                        url: 'image/' + clean.perfRubricFileName
                    });
                }
            }
        }

        // Clean out huge base64 data URLs & blob URLs for compact LocalStorage footprint
        if (typeof clean.fileUrl === 'string' && (clean.fileUrl.startsWith('data:') || clean.fileUrl.startsWith('blob:'))) {
            clean.fileUrl = clean.fileName ? `image/${clean.fileName}` : '';
        }
        if (typeof clean.url === 'string' && (clean.url.startsWith('data:') || clean.url.startsWith('blob:'))) {
            clean.url = clean.fileName ? `image/${clean.fileName}` : (clean.type === 'Video' ? 'image/campus-clip.mp4' : '');
        }
        if (typeof clean.videoUrl === 'string' && (clean.videoUrl.startsWith('data:') || clean.videoUrl.startsWith('blob:'))) {
            clean.videoUrl = clean.fileName ? `image/${clean.fileName}` : 'image/campus-clip.mp4';
        }
        if (typeof clean.rubricUrl === 'string' && (clean.rubricUrl.startsWith('data:') || clean.rubricUrl.startsWith('blob:'))) {
            clean.rubricUrl = clean.rubricFileName ? `image/${clean.rubricFileName}` : '';
        }
        if (typeof clean.perfGuidelinesUrl === 'string' && (clean.perfGuidelinesUrl.startsWith('data:') || clean.perfGuidelinesUrl.startsWith('blob:'))) {
            clean.perfGuidelinesUrl = clean.perfGuidelinesFileName ? `image/${clean.perfGuidelinesFileName}` : '';
        }
        if (typeof clean.perfRubricUrl === 'string' && (clean.perfRubricUrl.startsWith('data:') || clean.perfRubricUrl.startsWith('blob:'))) {
            clean.perfRubricUrl = clean.perfRubricFileName ? `image/${clean.perfRubricFileName}` : '';
        }
        return clean;
    }

    function sanitizeTopicForStorage(top) {
        if (!top || typeof top !== 'object') return top;
        const clean = { ...top };
        ['activity', 'activities', 'assignments', 'tasks', 'task', 'quiz', 'quizzes', 'performanceTasks', 'performance', 'materials', 'handouts', 'videos', 'allMaterials'].forEach(field => {
            if (Array.isArray(clean[field])) {
                clean[field] = clean[field].map(sanitizeMaterialForStorage);
            }
        });
        return clean;
    }

    function _escape(str) {
        if (typeof window.escapeHtml === 'function') return window.escapeHtml(str);
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function getCurrentEditorUser() {
        let authUser = null;
        try {
            authUser = JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}');
        } catch (e) {}

        if (authUser && (authUser.id || authUser.uid || authUser.name || authUser.firstName)) {
            return authUser;
        }

        if (typeof window.getLoggedInAdminUser === 'function') {
            const adminUser = window.getLoggedInAdminUser();
            if (adminUser) return adminUser;
        }

        if (typeof window.getLoggedInTeacherUser === 'function') {
            const teacherUser = window.getLoggedInTeacherUser();
            if (teacherUser) return teacherUser;
        }

        if (typeof window.getLoggedInUser === 'function') {
            const user = window.getLoggedInUser();
            if (user) return user;
        }

        try {
            const userStr = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
            if (userStr) return JSON.parse(userStr);
        } catch (e) {}

        return null;
    }

    function normalizeSubjectAuthorRole(role) {
        const raw = String(role || '').trim().toLowerCase();
        if (raw.includes('teacher') || raw.includes('faculty') || raw.includes('instructor')) {
            return 'Teacher';
        }
        return 'Admin';
    }

    function getSubjectAdminAuthorName() {
        if (typeof window.getLoggedInAdminUser === 'function') {
            const u = window.getLoggedInAdminUser();
            if (u) {
                const name = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name;
                if (name && !name.toLowerCase().includes('teacher') && !name.toLowerCase().includes('maria')) return name;
            }
        }
        return 'Stanley Garcia';
    }
    window.getSubjectAdminAuthorName = getSubjectAdminAuthorName;

    const QUARTER_LABELS = {
        'q1': '1st Quarter',
        'q2': '2nd Quarter',
        'q3': '3rd Quarter',
        'q4': '4th Quarter'
    };
    window.QUARTER_LABELS = QUARTER_LABELS;

    function normalizeQuarterKey(val) {
        if (!val && val !== 0) return 'q1';
        const s = String(val).trim().toLowerCase();
        if (s === 'q1' || s === 'q2' || s === 'q3' || s === 'q4') return s;
        if (s === '1' || s === '2' || s === '3' || s === '4') return 'q' + s;
        const qMatch = s.match(/(?:quarter|^q)\s*([1-4])/i) || s.match(/([1-4])(?:st|nd|rd|th)?\s*quarter/i) || s.match(/([1-4])/);
        if (qMatch && qMatch[1]) return 'q' + qMatch[1];
        return 'q1';
    }
    window.normalizeQuarterKey = normalizeQuarterKey;

    window.currentSubjectTopicQuarter = 'q1';
    window.currentSubjectMaterialQuarter = 'q1';

    function getActiveSubjectQuarters() {
        const sem1 = document.getElementById('edit-subject-sem1');
        const sem2 = document.getElementById('edit-subject-sem2');
        const quarters = [];
        if (sem1 && sem1.checked) {
            quarters.push('q1', 'q2');
        }
        if (sem2 && sem2.checked) {
            quarters.push('q3', 'q4');
        }
        if (quarters.length > 0) return quarters;

        // Fallback for individual checkboxes if present in DOM
        ['q1', 'q2', 'q3', 'q4'].forEach(q => {
            const cb = document.getElementById(`edit-subject-${q}`);
            if (cb && cb.checked) quarters.push(q);
        });
        if (quarters.length > 0) return quarters;

        return [];
    }
    window.getActiveSubjectQuarters = getActiveSubjectQuarters;

    window.handleActiveQuartersChange = function () {
        const active = getActiveSubjectQuarters();
        if (active.length > 0) {
            if (!active.includes(window.currentSubjectTopicQuarter)) {
                window.currentSubjectTopicQuarter = active[0] || 'q1';
            }
            if (!active.includes(window.currentSubjectMaterialQuarter)) {
                window.currentSubjectMaterialQuarter = active[0] || 'q1';
            }
        }
        window.renderSubjectQuarterTabs?.();
        window.renderSubjectTopics?.();
        window.renderSubjectMaterials?.();
        window.checkSubjectDraftStatus?.();
        window.checkSubjectFormValidity?.();
    };

    window.renderSubjectQuarterTabs = function () {
        const activeQuarters = getActiveSubjectQuarters();
        const topicPills = document.getElementById('subject-topics-quarter-pills');
        const matPills = document.getElementById('subject-materials-quarter-pills');

        if (!activeQuarters.includes(window.currentSubjectTopicQuarter)) {
            window.currentSubjectTopicQuarter = activeQuarters[0] || 'q1';
        }
        if (!activeQuarters.includes(window.currentSubjectMaterialQuarter)) {
            window.currentSubjectMaterialQuarter = activeQuarters[0] || 'q1';
        }

        if (topicPills) {
            topicPills.innerHTML = activeQuarters.map(q => {
                const isActive = (q === window.currentSubjectTopicQuarter);
                const label = QUARTER_LABELS[q] || q;
                return `
                    <button type="button" onclick="window.setSubjectTopicQuarter('${q}')"
                        class="px-4 py-2 rounded-lg text-xs font-bold transition-all font-['Inter'] cursor-pointer ${
                            isActive 
                                ? 'bg-white shadow-sm' 
                                : ''
                        }" style="${isActive ? 'color:#000' : 'color:rgba(0,0,0,0.50)'}"
                        onmouseenter="${!isActive ? `this.style.backgroundColor='rgba(0,0,0,0.06)'` : ''}" onmouseleave="${!isActive ? `this.style.backgroundColor=''` : ''}">
                        ${label}
                    </button>
                `;
            }).join('');
        }

        if (matPills) {
            matPills.innerHTML = activeQuarters.map(q => {
                const isActive = (q === window.currentSubjectMaterialQuarter);
                const label = QUARTER_LABELS[q] || q;
                return `
                    <button type="button" onclick="window.setSubjectMaterialQuarter('${q}')"
                        class="px-4 py-2 rounded-lg text-xs font-bold transition-all font-['Inter'] cursor-pointer ${
                            isActive 
                                ? 'bg-white shadow-sm' 
                                : ''
                        }" style="${isActive ? 'color:#000' : 'color:rgba(0,0,0,0.50)'}"
                        onmouseenter="${!isActive ? `this.style.backgroundColor='rgba(0,0,0,0.06)'` : ''}" onmouseleave="${!isActive ? `this.style.backgroundColor=''` : ''}">
                        ${label}
                    </button>
                `;
            }).join('');
        }
    };

    window.setSubjectTopicQuarter = function (quarterKey) {
        window.currentSubjectTopicQuarter = quarterKey;
        window.renderSubjectQuarterTabs();
        window.renderSubjectTopics();
    };

    window.setSubjectMaterialQuarter = function (quarterKey) {
        window.currentSubjectMaterialQuarter = quarterKey;
        window.renderSubjectQuarterTabs();
        window.renderSubjectMaterials();
    };


    function isFakeSampleTopic(t) {
        if (!t) return false;
        if (typeof window.isFakeSampleTopic === 'function' && window.isFakeSampleTopic !== isFakeSampleTopic) {
            return window.isFakeSampleTopic(t);
        }
        const id = String(t.id || '').trim().toLowerCase();
        const title = String(t.title || t.name || (typeof t === 'string' ? t : '')).trim().toLowerCase();
        const authorId = String(t.authorId || '').trim().toLowerCase();
        const authorName = String(t.authorName || '').trim().toLowerCase();
        if (id === 'topic_teacher_sample_01' ||
            id === 'topic-teacher-sample-01' ||
            authorId === 'teacher_sample_01' ||
            authorName.includes('johnathan smith') ||
            t.isFake === true ||
            t.isSample === true) {
            return true;
        }
        const fakeTopicTitles = [
            'arrays',
            'introduction to debugging',
            'debugging',
            'random variables & probability distributions',
            'normal distribution & sampling techniques',
            'nature and elements of communication',
            'communication strategies & speech delivery',
            'introduction to programming logic',
            'control structures & algorithms',
            'functions and their graphs',
            'business mathematics & financial logic',
            'introduction to relational databases',
            'sql fundamentals & database queries',
            'introduction to web development',
            'html5, css3 & javascript basics',
            'origin and structure of the earth',
            'earth materials, processes & life systems',
            'information and communications technology today',
            'applied productivity tools & web content creation',
            'unit 1: fundamentals and key concepts',
            'unit 2: applied methodologies & practical workflows',
            'advanced diagnostic procedures',
            'topic 7',
            'topic 8',
            'control structures',
            'string manipulation',
            'module 1: advanced research methods',
            'repetition control structures',
            'functions and methods',
            'loops and iteration',
            'functions and modular programming',
            'introduction to object-oriented programming'
        ];
        return fakeTopicTitles.some(f => title === f || title.startsWith(f) || (f.length > 10 && title.includes(f)));
    }
    window.isFakeSampleTopic = isFakeSampleTopic;

    function isFakeSampleMaterial(m) {
        if (!m) return false;
        if (typeof window.isFakeSampleMaterial === 'function' && window.isFakeSampleMaterial !== isFakeSampleMaterial) {
            return window.isFakeSampleMaterial(m);
        }
        const id = String(m.id || '').trim().toLowerCase();
        const title = String(m.title || m.name || (typeof m === 'string' ? m : '')).trim().toLowerCase();
        const fileName = String(m.fileName || '').trim().toLowerCase();
        const authorId = String(m.authorId || '').trim().toLowerCase();
        const authorName = String(m.authorName || '').trim().toLowerCase();
        if (id.includes('sample_01') ||
            authorId === 'teacher_sample_01' ||
            authorName.includes('johnathan smith') ||
            m.isFake === true ||
            m.isSample === true) {
            return true;
        }
        const fakeMatKeywords = [
            'written task & practice exercise',
            'written task',
            'mastery test',
            'collaborative workshop',
            'practical project',
            'performance task: ',
            'complete study module & notes',
            'guided exercises & worksheets',
            'interactive video lecture',
            'practical applications & case analysis',
            'campus-clip.mp4'
        ];
        return fakeMatKeywords.some(f => title.includes(f) || fileName.includes(f));
    }
    window.isFakeSampleMaterial = isFakeSampleMaterial;

    function canCurrentSubjectEditorDeleteSubject() {
        if (isCurrentEditorTeacher()) return false;
        if (typeof window.canCurrentAdminDelete === 'function') {
            return window.canCurrentAdminDelete('subject');
        }
        const user = typeof window.getLoggedInAdminUser === 'function' ? window.getLoggedInAdminUser() : null;
        if (user) {
            const role = (typeof normalizeUserRole === 'function' ? normalizeUserRole(user.role || user.type) : (user.role || user.type || ''));
            const isMaster = role === 'Master Admin' || String(user.uid || user.id) === '0000000' || user.isMaster;
            if (isMaster) return true;
            const perms = user.permissions || {};
            return perms.subjectDelete === true;
        }
        return typeof window.isCurrentMasterAdmin === 'function' ? window.isCurrentMasterAdmin() : false;
    }
    window.canCurrentSubjectEditorDeleteSubject = canCurrentSubjectEditorDeleteSubject;

    function canCurrentSubjectEditorDeleteTopic(topic) {
        const isStandalone = Boolean(window.subjectEditorOptions?.standalone);
        const isTeacher = isCurrentEditorTeacher();
        if (topic) {
            const rawRole = topic.authorRole || topic.role || (topic.isAdmin ? 'Admin' : (topic.isTeacher ? 'Teacher' : 'Admin'));
            const authorRole = normalizeSubjectAuthorRole(rawRole);
            const isOwn = isCurrentUserAuthor(topic.authorId, topic.authorName, authorRole);
            if (!isOwn) return false;
        }
        if (isTeacher || isStandalone) {
            return true;
        }
        if (typeof window.canCurrentAdminDelete === 'function') {
            return window.canCurrentAdminDelete('topic') || window.canCurrentAdminDelete('subject');
        }
        const user = typeof window.getLoggedInAdminUser === 'function' ? window.getLoggedInAdminUser() : null;
        if (user) {
            const role = (typeof normalizeUserRole === 'function' ? normalizeUserRole(user.role || user.type) : (user.role || user.type || ''));
            const isMaster = role === 'Master Admin' || String(user.uid || user.id) === '0000000' || user.isMaster;
            if (isMaster) return true;
            const perms = user.permissions || {};
            return perms.topicDelete === true || perms.subjectDelete === true;
        }
        return typeof window.isCurrentMasterAdmin === 'function' ? window.isCurrentMasterAdmin() : false;
    }
    window.canCurrentSubjectEditorDeleteTopic = canCurrentSubjectEditorDeleteTopic;

    function sanitizeSubjectCurriculumData() {
        try {
            const subjectsKey = 'sigma-admin-subjects';
            const rawSubjs = localStorage.getItem(subjectsKey);
            if (rawSubjs) {
                const subjs = JSON.parse(rawSubjs);
                if (Array.isArray(subjs)) {
                    let changed = false;
                    subjs.forEach(s => {
                        if (s) {
                            if (Array.isArray(s.topics)) {
                                const originalLen = s.topics.length;
                                s.topics = s.topics.filter(t => !isFakeSampleTopic(t));
                                if (s.topics.length !== originalLen) changed = true;
                            }
                            if (Array.isArray(s.materials)) {
                                const originalMatLen = s.materials.length;
                                s.materials = s.materials.filter(m => !isFakeSampleMaterial(m));
                                if (s.materials.length !== originalMatLen) changed = true;
                            }
                        }
                    });
                    if (changed) {
                        localStorage.setItem(subjectsKey, JSON.stringify(subjs));
                    }
                }
            }

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.startsWith('sigma_custom_topics_') || key.startsWith('sigma_section_topic_stats_'))) {
                    try {
                        const val = _getStored(key, []);
                        if (Array.isArray(val)) {
                            const filtered = val.filter(t => !isFakeSampleTopic(t));
                            if (filtered.length !== val.length) {
                                _saveStored(key, filtered);
                            }
                        }
                    } catch (err) {}
                }
            }
        } catch (e) {
            console.warn('sanitizeSubjectCurriculumData error:', e);
        }
    }
    window.sanitizeSubjectCurriculumData = sanitizeSubjectCurriculumData;
    sanitizeSubjectCurriculumData();

    // Fetch Assigned Teachers for a Subject across all sections
    function getAssignedTeachersForSubject(subjectData) {
        const teachersMap = new Map();
        if (!subjectData) return [];

        const curCode = (subjectData.code || subjectData.subjectCode || '').toLowerCase().trim();
        const curName = (subjectData.name || subjectData.subjectName || subjectData.title || '').toLowerCase().trim();

        const addTeacher = (id, name, sectionName, role, status) => {
            const cleanId = String(id || '').trim();
            const cleanName = (name || '').trim();
            if (!cleanName && !cleanId) return;

            const key = cleanId || cleanName.toLowerCase();
            if (teachersMap.has(key)) {
                const existing = teachersMap.get(key);
                if (sectionName && !existing.sections.includes(sectionName)) {
                    existing.sections.push(sectionName);
                }
                if (!existing.id && cleanId) existing.id = cleanId;
            } else {
                teachersMap.set(key, {
                    id: cleanId,
                    name: cleanName,
                    role: role || 'Teacher',
                    status: status || 'Active',
                    sections: sectionName ? [sectionName] : [],
                    avatar: '',
                    email: '',
                    department: ''
                });
            }
        };

        // 1. Check sections assigned to this subject
        try {
            const adminSections = _getStored('sigma-admin-sections', []);
        } catch (e) {}
    }
    window.getAssignedTeachersForSubject = getAssignedTeachersForSubject;

    function formatMaterialDate(dateVal) {
        if (!dateVal) return 'Sep 7, 2026';
        const d = new Date(dateVal);
        if (Number.isNaN(d.getTime())) return String(dateVal);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    window.formatMaterialDate = formatMaterialDate;

    function isCurrentEditorTeacher() {
        if (typeof document !== 'undefined') {
            if (document.getElementById('teacher-header') || document.getElementById('nav-classes') || document.getElementById('teacher-sidebar')) return true;
            if (document.getElementById('nav-school-mgmt') || document.getElementById('nav-users-accounts') || document.getElementById('admin-sidebar')) return false;
        }
        if (typeof window.location !== 'undefined' && window.location.href) {
            if (window.location.href.includes('teacher.html') || (window.location.pathname && window.location.pathname.includes('teacher'))) return true;
            if (window.location.href.includes('admin.html') || (window.location.pathname && window.location.pathname.includes('admin'))) return false;
        }
        if (typeof window.teacherPortalInitialized === 'boolean' && window.teacherPortalInitialized) return true;

        const user = getCurrentEditorUser();
        if (user) {
            const role = normalizeSubjectAuthorRole(user.role || user.type);
            if (role === 'Teacher') return true;
            if (String(user.role || user.type || '').toLowerCase().includes('teacher')) return true;
        }
        if (typeof window.getLoggedInTeacherUser === 'function' && !!window.getLoggedInTeacherUser()) return true;
        return false;
    }
    window.isCurrentEditorTeacher = isCurrentEditorTeacher;

    function isCurrentViewOnlyScope() {
        const isTeacher = isCurrentEditorTeacher();
        const isStandalone = Boolean(window.subjectEditorOptions?.standalone);
        if (isTeacher || isStandalone) return false;
        return Boolean(window.activeCurriculumScope && window.activeCurriculumScope !== 'master');
    }
    window.isCurrentViewOnlyScope = isCurrentViewOnlyScope;

    function isCurrentUserAuthor(authorId, authorName, authorRole) {
        const isTeacherPage = isCurrentEditorTeacher();
        const normRole = normalizeSubjectAuthorRole(authorRole);
        const currentUser = getCurrentEditorUser();

        if (isTeacherPage) {
            // Teacher portal: Admin-created materials/topics cannot be edited by teachers
            if (normRole === 'Admin') return false;
            if (normRole === 'Teacher') {
                if (!authorId && !authorName) return true;
                const currentUserId = currentUser ? String(currentUser.id || currentUser.uid || currentUser.username || '').trim().toLowerCase() : '';
                const myFullName = currentUser ? (`${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.name || '').trim().toLowerCase() : '';
                const targetAuthorId = String(authorId || '').trim().toLowerCase();
                const targetAuthorName = String(authorName || '').trim().toLowerCase();
                if (targetAuthorId && currentUserId && targetAuthorId === currentUserId) return true;
                if (targetAuthorName && myFullName && (targetAuthorName === myFullName || targetAuthorName.includes(myFullName) || myFullName.includes(targetAuthorName))) return true;
                if (targetAuthorId || targetAuthorName) return false;
                return true;
            }
        } else {
            // Admin portal: Teacher-created materials cannot be edited from admin
            if (normRole === 'Teacher') return false;
            if (normRole === 'Admin') return true;
        }

        return false;
    }

    window.getCurrentEditorUser = getCurrentEditorUser;
    window.isCurrentEditorTeacher = isCurrentEditorTeacher;
    window.isCurrentUserAuthor = isCurrentUserAuthor;

    function resolveSubjectItemSection(item) {
        if (!item) return '';
        let sec = String(item.section || item.roomSection || item.selectedSection || '').trim();
        if (sec) return sec;
        try {
            const adminSections = (typeof _getStored === 'function')
                ? _getStored('sigma-admin-sections', [])
                : JSON.parse(localStorage.getItem('sigma-admin-sections') || '[]');
            const authorId = String(item.authorId || item.uid || '').trim().toLowerCase();
            const authorName = String(item.authorName || item.author || '').trim().toLowerCase();
            if ((authorId || authorName) && Array.isArray(adminSections)) {
                const matches = adminSections.filter(s => {
                    if (!s) return false;
                    const sTeacher = String(s.teacher || '').trim().toLowerCase();
                    const sTeachers = Array.isArray(s.teachers) ? s.teachers : [];
                    const hasTeacherName = (authorName && (sTeacher === authorName || sTeachers.some(t => {
                        const tName = String(t.name || `${t.firstName || ''} ${t.lastName || ''}`).trim().toLowerCase();
                        return tName === authorName;
                    })));
                    const hasTeacherId = (authorId && sTeachers.some(t => String(t.id || t.uid || '').trim().toLowerCase() === authorId));
                    return hasTeacherName || hasTeacherId;
                });
                if (matches.length === 1) {
                    return String(matches[0].name || matches[0].sectionName || '').trim();
                }
            }
        } catch (_) {}
        return '';
    }
    window.resolveSubjectItemSection = resolveSubjectItemSection;

    function formatSubjectTimestamp(val) {
        if (!val) return 'Just now';
        if (typeof val === 'string') {
            const trimmed = val.trim();
            if (trimmed.includes(' at ') || trimmed.toLowerCase() === 'just now' || trimmed.toLowerCase().includes('ago')) {
                return trimmed;
            }
        }
        const d = new Date(val);
        if (isNaN(d.getTime())) return String(val);

        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();

        if (diffMs >= 0 && diffMs < 60000) {
            return 'Just now';
        }
        if (diffDays === 0 && d.getDate() === now.getDate()) {
            return `Today at ${timeStr}`;
        }
        if (diffDays === 1 || (diffDays === 0 && d.getDate() !== now.getDate())) {
            return `Yesterday at ${timeStr}`;
        }
        if (diffDays >= 0 && diffDays < 7) {
            const dayName = d.toLocaleDateString([], { weekday: 'long' });
            return `${dayName} at ${timeStr}`;
        }

        const monthName = d.toLocaleDateString([], { month: 'short' });
        const day = d.getDate();
        const year = d.getFullYear();
        const currentYear = now.getFullYear();

        if (year === currentYear) {
            return `${monthName} ${day} at ${timeStr}`;
        }
        return `${monthName} ${day}, ${year} at ${timeStr}`;
    }

    function stopAllVideos(container = document) {
        if (!container) return;
        try {
            const mediaElements = container.querySelectorAll ? container.querySelectorAll('video, audio') : [];
            mediaElements.forEach(media => {
                try {
                    media.pause();
                } catch (e) {}
            });

            const iframes = container.querySelectorAll ? container.querySelectorAll('iframe') : [];
            iframes.forEach(iframe => {
                try {
                    iframe.contentWindow?.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
                } catch (e) {}
            });
        } catch (e) {}
    }

    window.stopAllVideos = stopAllVideos;
    window.stopVideoPlayback = stopAllVideos;

    function resetSubjectEditorScrollToTop() {
        const doScroll = () => {
            const overlay = document.getElementById('subject-edit-overlay') || document.querySelector('.sigma-modal-overlay:not(.hidden)');
            if (overlay) {
                overlay.scrollTop = 0;
                try { overlay.scrollTo({ top: 0, behavior: 'instant' }); } catch (e) { overlay.scrollTop = 0; }
            }
            const allOverlays = document.querySelectorAll('.sigma-modal-overlay');
            allOverlays.forEach(ov => {
                ov.scrollTop = 0;
                try { ov.scrollTo({ top: 0, behavior: 'instant' }); } catch (e) { ov.scrollTop = 0; }
            });
            const modal = document.getElementById('subject-editor-modal');
            if (modal) {
                modal.scrollTop = 0;
                try { modal.scrollTo({ top: 0, behavior: 'instant' }); } catch (e) { modal.scrollTop = 0; }
            }
            const modalBody = document.getElementById('subject-edit-form-body');
            if (modalBody) {
                modalBody.scrollTop = 0;
                try { modalBody.scrollTo({ top: 0, behavior: 'instant' }); } catch (e) { modalBody.scrollTop = 0; }
            }
            const panels = document.querySelectorAll('.sigma-modal-panel');
            panels.forEach(panel => {
                panel.scrollTop = 0;
                try { panel.scrollTo({ top: 0, behavior: 'instant' }); } catch (e) { panel.scrollTop = 0; }
            });
            const shells = document.querySelectorAll('.sigma-modal-shell');
            shells.forEach(shell => {
                shell.scrollTop = 0;
                try { shell.scrollTo({ top: 0, behavior: 'instant' }); } catch (e) { shell.scrollTop = 0; }
            });
            const matEditorView = document.getElementById('subject-material-editor-view');
            if (matEditorView) {
                matEditorView.scrollTop = 0;
                try { matEditorView.scrollTo({ top: 0, behavior: 'instant' }); } catch (e) { matEditorView.scrollTop = 0; }
            }
            const topicEditorView = document.getElementById('subject-topic-editor-view');
            if (topicEditorView) {
                topicEditorView.scrollTop = 0;
                try { topicEditorView.scrollTo({ top: 0, behavior: 'instant' }); } catch (e) { topicEditorView.scrollTop = 0; }
            }
            const matMainView = document.getElementById('subject-materials-main-view');
            if (matMainView) {
                matMainView.scrollTop = 0;
                try { matMainView.scrollTo({ top: 0, behavior: 'instant' }); } catch (e) { matMainView.scrollTop = 0; }
            }
            const topicMainView = document.getElementById('subject-topics-main-view');
            if (topicMainView) {
                topicMainView.scrollTop = 0;
                try { topicMainView.scrollTo({ top: 0, behavior: 'instant' }); } catch (e) { topicMainView.scrollTop = 0; }
            }
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
            if (typeof window.scrollTo === 'function') {
                try { window.scrollTo({ top: 0, behavior: 'instant' }); } catch (e) { window.scrollTo(0, 0); }
            }
        };

        doScroll();
        if (typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(doScroll);
        }
        setTimeout(doScroll, 10);
        setTimeout(doScroll, 50);
        setTimeout(doScroll, 120);
        setTimeout(doScroll, 250);
    }
    window.resetSubjectEditorScrollToTop = resetSubjectEditorScrollToTop;

    // Global navigation & lifecycle video stopping
    window.addEventListener('beforeunload', () => stopAllVideos());
    window.addEventListener('pagehide', () => stopAllVideos());
    window.addEventListener('popstate', () => stopAllVideos());
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) stopAllVideos();
    });

    window.formatSubjectTimestamp = formatSubjectTimestamp;
    window.formatMaterialRelativeTime = formatSubjectTimestamp;
    window.normalizeSubjectAuthorRole = normalizeSubjectAuthorRole;

    // State Variables
    window.currentSubjectStep = 1;
    window.currentSubjectTopics = window.currentSubjectTopics || [];
    window.currentSubjectMaterials = window.currentSubjectMaterials || [];
    window.isEditingSubject = false;
    window.currentEditingSubjectStatus = null;
    window.originalEditingSubjectCode = null;
    window.currentEditingTopicIndex = -1;
    window.currentEditingMaterialIndex = -1;
    window.currentEditingMaterialType = 'Lesson';
    window.selectedTopicIdForNewMaterial = null;
    window.lastUploadedGenericFile = null;
    window.pendingQuizData = null;
    window.pendingRubricFile = null;
    window.rubricRemoved = false;
    window.subjectMaterialSearchQuery = '';

    // Topic Templates & Cover Asset Management
    const TOPIC_TEMPLATES_STORAGE_KEY = 'sigma_topic_templates';
    const TOPIC_TRASH_STORAGE_KEY = 'sigma_topic_templates_trash';
    const TOPIC_RECENTS_STORAGE_KEY = 'sigma_recent_topic_templates';
    const DEFAULT_SYSTEM_TOPIC_TEMPLATES = [
        'image/Topic.jpg',
        'image/Topic2.jpg',
        'image/book1.jpg',
        'image/book2.jpg',
        'image/book3.jpg',
        'image/book4.jpg',
        'image/book5.jpg',
        'image/book6.jpg',
        'image/book7.jpg',
        'image/book8.jpg'
    ];

    function getStoredTopicTemplates() {
        try {
            const data = localStorage.getItem(TOPIC_TEMPLATES_STORAGE_KEY);
            if (data) {
                let parsed = JSON.parse(data);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    DEFAULT_SYSTEM_TOPIC_TEMPLATES.forEach(t => {
                        if (!parsed.includes(t)) parsed.push(t);
                    });
                    return parsed;
                }
            }
        } catch {}
        return [...DEFAULT_SYSTEM_TOPIC_TEMPLATES];
    }

    function saveStoredTopicTemplates(list) {
        localStorage.setItem(TOPIC_TEMPLATES_STORAGE_KEY, JSON.stringify(list));
        window.topicTemplates = list;
    }

    function getStoredTopicTrash() {
        try {
            const data = localStorage.getItem(TOPIC_TRASH_STORAGE_KEY);
            if (data) {
                const parsed = JSON.parse(data);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch {}
        return [];
    }

    function saveStoredTopicTrash(list) {
        localStorage.setItem(TOPIC_TRASH_STORAGE_KEY, JSON.stringify(list));
    }

    function getStoredRecentTopicTemplates() {
        try {
            const data = localStorage.getItem(TOPIC_RECENTS_STORAGE_KEY);
            if (data) {
                let parsed = JSON.parse(data);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    DEFAULT_SYSTEM_TOPIC_TEMPLATES.forEach(t => {
                        if (!parsed.includes(t)) parsed.push(t);
                    });
                    return parsed;
                }
            }
        } catch {}
        return [...DEFAULT_SYSTEM_TOPIC_TEMPLATES];
    }

    function recordRecentTopicTemplate(src) {
        if (!src) return;
        let recents = getStoredRecentTopicTemplates().filter(s => s !== src);
        recents.unshift(src);
        recents = recents.slice(0, 3);
        localStorage.setItem(TOPIC_RECENTS_STORAGE_KEY, JSON.stringify(recents));
    }

    window.topicTemplates = getStoredTopicTemplates();
    window.selectedTopicTrashItems = new Set();
    window.pendingTopicTemplateSelection = null;

    // Curriculum Scope View State (Admin Only)
    window.activeCurriculumScope = 'master';
    window.activeCurriculumScopeLabel = 'Master Syllabus';

    function getSubjectAssignedTeachers(subjectCode, subjectName) {
        const teachersMap = new Map();
        const curCode = String(subjectCode || window.originalEditingSubjectCode || document.getElementById('edit-subject-code')?.value || window.currentSubjectCode || '').trim().toLowerCase();
        const curName = String(subjectName || document.getElementById('edit-subject-name')?.value || '').trim().toLowerCase();

        const addOrMergeTeacher = (tData) => {
            const rawName = String(tData.name || '').trim();
            if (!rawName) return;
            const normKey = rawName.toLowerCase().replace(/\s+/g, ' ');
            const secName = String(tData.section || '').trim();

            if (!teachersMap.has(normKey)) {
                teachersMap.set(normKey, {
                    id: String(tData.id || normKey),
                    name: rawName,
                    section: secName,
                    role: tData.role || 'Teacher',
                    department: tData.department || 'Senior High School',
                    avatar: tData.avatar || ''
                });
            } else {
                const existing = teachersMap.get(normKey);
                if (tData.id && (!existing.id || existing.id === normKey)) {
                    existing.id = String(tData.id);
                }
                if (tData.avatar && !existing.avatar) {
                    existing.avatar = tData.avatar;
                }
                if (tData.department && (!existing.department || existing.department === 'Faculty')) {
                    existing.department = tData.department;
                }
                if (secName) {
                    const secList = (existing.section ? existing.section.split(', ') : []).map(s => s.trim()).filter(Boolean);
                    if (!secList.includes(secName)) {
                        secList.push(secName);
                        existing.section = secList.join(', ');
                    }
                }
            }
        };

        // 1. Check sections assigned to this subject
        try {
            const adminSections = _getStored('sigma-admin-sections', []);
            if (Array.isArray(adminSections)) {
                adminSections.forEach(sec => {
                    const secSubj = String(sec.subject || sec.subjectName || sec.subjectCode || '').trim().toLowerCase();
                    const secSubjsList = Array.isArray(sec.subjects) ? sec.subjects.map(s => String(s.code || s.name || s || '').trim().toLowerCase()) : [];
                    
                    const matchesSubject = (curCode && (secSubj === curCode || secSubjsList.includes(curCode))) ||
                                          (curName && (secSubj === curName || secSubjsList.includes(curName)));

                    if (matchesSubject) {
                        const secName = sec.name || sec.sectionName || sec.section || '';
                        
                        // Extract teachers from section.teachers array
                        if (Array.isArray(sec.teachers)) {
                            sec.teachers.forEach(t => {
                                const tName = (typeof t === 'string' ? t : (t.name || `${t.firstName || ''} ${t.lastName || ''}`.trim() || t.fullName || '')).trim();
                                const tId = String(t.id || t.uid || '').trim();
                                if (tName) {
                                    addOrMergeTeacher({
                                        id: tId,
                                        name: tName,
                                        section: secName,
                                        role: t.role || 'Teacher',
                                        department: t.department || 'Senior High School',
                                        avatar: t.avatar || t.photo || ''
                                    });
                                }
                            });
                        }

                        // Also check primary teacher / adviser string
                        const singleTeacher = String(sec.teacher || sec.adviser || sec.teacherName || '').trim();
                        if (singleTeacher) {
                            addOrMergeTeacher({
                                id: String(sec.teacherId || sec.adviserId || ''),
                                name: singleTeacher,
                                section: secName,
                                role: 'Teacher',
                                department: 'Senior High School',
                                avatar: ''
                            });
                        }
                    }
                });
            }
        } catch (e) {}

        // 2. Also check if any teacher authors exist in this subject's stored topics or materials
        try {
            const allSubjs = _getStored(SUBJECTS_STORAGE_KEY, []);
            const foundSubj = allSubjs.find(s => {
                const sCode = (s.code || '').trim().toLowerCase();
                const sName = (s.name || '').trim().toLowerCase();
                return (curCode && (sCode === curCode || curCode.includes(sCode) || sCode.includes(curCode))) ||
                       (curName && (sName === curName || curName.includes(sName) || sName.includes(curName)));
            });
            if (foundSubj) {
                const storedTopics = Array.isArray(foundSubj.topics) ? foundSubj.topics : [];
                const storedMats = Array.isArray(foundSubj.materials) ? foundSubj.materials : [];
                [...storedTopics, ...storedMats].forEach(item => {
                    if (!item) return;
                    const role = normalizeSubjectAuthorRole(item.authorRole || item.role || '');
                    if (role === 'Teacher') {
                        const id = String(item.authorId || '').trim();
                        const name = String(item.authorName || '').trim();
                        if (id === 'teacher_sample_01' || name.toLowerCase().includes('johnathan smith')) return;
                        if (name) {
                            addOrMergeTeacher({
                                id: id,
                                name: name,
                                section: item.section || '',
                                role: 'Teacher',
                                department: 'Faculty',
                                avatar: ''
                            });
                        }
                    }
                });
            }
        } catch (e) {}

        const allTopics = window.currentSubjectAllTopics || window.currentSubjectTopics || [];
        const allMaterials = window.currentSubjectAllMaterials || window.currentSubjectMaterials || [];

        [...allTopics, ...allMaterials].forEach(item => {
            if (!item) return;
            const role = normalizeSubjectAuthorRole(item.authorRole || item.role || '');
            if (role === 'Teacher') {
                const id = String(item.authorId || '').trim();
                const name = String(item.authorName || '').trim();
                if (id === 'teacher_sample_01' || name.toLowerCase().includes('johnathan smith')) return;
                if (name) {
                    addOrMergeTeacher({
                        id: id,
                        name: name,
                        section: item.section || '',
                        role: 'Teacher',
                        department: 'Faculty',
                        avatar: ''
                    });
                }
            }
        });

        // 3. Enrich teacher details (avatar, email, department) from sigma-admin-users
        //    AND canonicalize names from the authoritative user record
        try {
            const allUsers = _getStored('sigma-admin-users', []);
            if (Array.isArray(allUsers)) {
                teachersMap.forEach((t) => {
                    const found = allUsers.find(u => {
                        const uId = String(u.id || u.uid || u.username || '').trim().toLowerCase();
                        const uName = (`${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name || u.fullName || '').trim().toLowerCase();
                        const uFullName = (u.fullName || u.name || '').trim().toLowerCase();
                        const tNameLow = t.name.toLowerCase();
                        // Match by ID or exact name or first+last name matching (ignoring middle name)
                        const tParts = tNameLow.split(/\s+/);
                        const tFirst = tParts[0] || '';
                        const tLast = tParts[tParts.length - 1] || '';
                        const uParts = uName.split(/\s+/);
                        const uFirst = uParts[0] || '';
                        const uLast = uParts[uParts.length - 1] || '';
                        const sameFirstLast = tFirst && tLast && uFirst && uLast && tFirst === uFirst && tLast === uLast;
                        return (t.id && uId === String(t.id).toLowerCase()) ||
                               (t.name && (uName === tNameLow || uFullName === tNameLow || sameFirstLast));
                    });
                    if (found) {
                        // Canonicalize name to the authoritative record (firstName + middleName + lastName)
                        const canonicalName = ([found.firstName, found.middleName, found.lastName].filter(Boolean).join(' ').trim() || found.fullName || found.name || t.name).trim();
                        if (canonicalName) t.name = canonicalName;
                        if (found.id || found.uid) t.id = String(found.id || found.uid);
                        if (!t.avatar) {
                            if (typeof window.resolveUserAvatar === 'function') {
                                t.avatar = window.resolveUserAvatar(found);
                            } else {
                                t.avatar = found.avatar || found.profilePicture || found.photo || found.profileImage || '';
                            }
                        }
                        if (!t.email) t.email = found.email || '';
                        if (!t.department || t.department === 'Faculty') t.department = found.department || found.strand || 'Senior High School';
                        if (!t.section && found.section) t.section = found.section;
                    }
                });
            }
        } catch (e) {}

        // 4. Final deduplication pass: collapse entries that share the same teacher ID
        //    or the same canonical first+last name (handles stale old names like "Maria Santos Ramos" vs "Maria Santos Ramos")
        const dedupedMap = new Map(); // key: canonical dedup key
        teachersMap.forEach((t) => {
            // Dedup key: prefer ID if real (not a name-derived key), else first+last words of name
            const nameParts = t.name.trim().toLowerCase().split(/\s+/);
            const firstLast = `${nameParts[0] || ''} ${nameParts[nameParts.length - 1] || ''}`.trim();
            const hasRealId = t.id && t.id !== t.name.toLowerCase().replace(/\s+/g, ' ');
            const dedupKey = hasRealId ? String(t.id).toLowerCase() : firstLast;

            if (!dedupedMap.has(dedupKey)) {
                dedupedMap.set(dedupKey, { ...t });
            } else {
                // Merge: keep the entry with more complete data; prefer LONGER name (preserves middle name)
                const existing = dedupedMap.get(dedupKey);
                // Prefer the name with MORE words (firstName + middleName + lastName wins over firstName + lastName)
                const existingParts = existing.name.trim().split(/\s+/);
                const tParts2 = t.name.trim().split(/\s+/);
                if (tParts2.length > existingParts.length) existing.name = t.name;
                // Merge sections
                if (t.section) {
                    const secList = (existing.section ? existing.section.split(', ') : []).map(s => s.trim()).filter(Boolean);
                    t.section.split(', ').forEach(s => { if (s && !secList.includes(s)) secList.push(s); });
                    existing.section = secList.join(', ');
                }
                // Prefer real ID
                if (hasRealId && (!existing.id || existing.id === existing.name.toLowerCase())) existing.id = t.id;
                // Prefer avatar / email
                if (t.avatar && !existing.avatar) existing.avatar = t.avatar;
                if (t.email && !existing.email) existing.email = t.email;
            }
        });

        return Array.from(dedupedMap.values());
    }
    window.getSubjectAssignedTeachers = getSubjectAssignedTeachers;
    window.getSigmaRegisteredTeachers = getSubjectAssignedTeachers;

    window.ensureScopePickerModalInDom = function () {
        let modal = document.getElementById('curriculum-scope-picker-modal');
        if (modal) modal.remove();

        modal = document.createElement('div');
        modal.id = 'curriculum-scope-picker-modal';
        modal.className = 'fixed inset-0 z-[100050] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs hidden';
        modal.onclick = function (e) {
            if (e.target === modal) window.closeCurriculumScopePicker();
        };

        modal.innerHTML = `
            <div class="w-full max-w-lg p-6 bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[85vh] font-['Inter'] animate-in fade-in zoom-in-95 duration-150" onclick="event.stopPropagation()">
                <!-- Modal Header -->
                <div class="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-base shrink-0">
                            <i class="fa-solid fa-users-viewfinder"></i>
                        </div>
                        <div>
                            <h3 class="text-base font-bold text-black font-['Inter'] leading-tight">View Scope</h3>
                            <p class="text-xs text-black-fade font-normal font-['Inter'] mt-0.5">Filter syllabus by assigned teacher section</p>
                        </div>
                    </div>
                </div>

                <!-- Scope List Options (Scrollable) -->
                <div id="curriculum-scope-items-container" class="overflow-y-auto space-y-2 py-3 pr-1 font-['Inter'] custom-scrollbar max-h-[55vh]">
                    <!-- Injected dynamically -->
                </div>

                <!-- Modal Footer -->
                <div class="pt-4 mt-2 border-t border-slate-100 flex items-center justify-end">
                    <button type="button" onclick="window.closeCurriculumScopePicker()"
                        class="sigma-btn sigma-btn-white sigma-btn-sm font-bold font-['Inter'] cursor-pointer">
                        Close
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        return modal;
    };

    window.openCurriculumScopePicker = function () {
        const modal = window.ensureScopePickerModalInDom();
        window.renderCurriculumScopeItems('');
        modal.classList.remove('hidden');
    };

    window.closeCurriculumScopePicker = function () {
        const modal = document.getElementById('curriculum-scope-picker-modal');
        if (modal) modal.classList.add('hidden');
    };

    function updateCurriculumScopeButtonUi() {
        const isTeacher = isCurrentEditorTeacher();
        const isCustomScope = !isTeacher && window.activeCurriculumScope && window.activeCurriculumScope !== 'master';

        const headerBackBtn = document.getElementById('subject-header-scope-back-btn');
        if (headerBackBtn) {
            headerBackBtn.classList.toggle('hidden', !isCustomScope);
        }

        const topicLabel = document.getElementById('subject-topic-scope-label');
        const matLabel = document.getElementById('subject-material-scope-label');

        [topicLabel, matLabel].forEach(lbl => {
            if (!lbl) return;
            if (isCustomScope) {
                lbl.textContent = `Viewing: ${window.activeCurriculumScopeLabel || 'Teacher Scope'}`;
                lbl.className = "text-xs font-bold text-amber-600 whitespace-nowrap overflow-hidden text-ellipsis";
            } else {
                lbl.textContent = "View Scope";
                lbl.className = "text-xs font-semibold text-black whitespace-nowrap overflow-hidden text-ellipsis";
            }
            const btn = lbl.closest('button');
            if (btn) {
                if (isCustomScope) {
                    btn.classList.add('bg-amber-50/80', 'border-amber-200/90', 'hover:border-amber-300');
                    btn.classList.remove('bg-slate-50', 'border-slate-200', 'hover:border-slate-300');
                } else {
                    btn.classList.remove('bg-amber-50/80', 'border-amber-200/90', 'hover:border-amber-300');
                    btn.classList.add('bg-slate-50', 'border-slate-200', 'hover:border-slate-300');
                }
            }
        });
    }
    window.updateCurriculumScopeButtonUi = updateCurriculumScopeButtonUi;

    window.selectCurriculumScope = function (scopeId, scopeLabel) {
        if (scopeId !== 'master' && !window.subjectStepBeforeViewScope) {
            window.subjectStepBeforeViewScope = window.currentSubjectStep || 2;
        }
        window.activeCurriculumScope = scopeId;
        window.activeCurriculumScopeLabel = scopeLabel;

        // Reset topic panels so they always default to closed/collapsed when switching scope
        window.expandedSubjectTopicIds = {};

        updateCurriculumScopeButtonUi();

        window.closeCurriculumScopePicker();

        // If switching into a view-only teacher scope from step 1, automatically move to step 2 (Topics)
        const isViewOnlyScope = isCurrentViewOnlyScope();
        if (isViewOnlyScope && window.currentSubjectStep === 1) {
            window.handleSubjectStep(2);
        } else {
            window.handleSubjectStep(window.currentSubjectStep || 2);
        }

        window.renderSubjectTopics();
        window.renderSubjectMaterials();
    };

    window.returnToMasterSubjectPanel = function () {
        window.activeCurriculumScope = 'master';
        window.activeCurriculumScopeLabel = 'Master Syllabus';
        window.expandedSubjectTopicIds = {};
        if (typeof window.updateCurriculumScopeButtonUi === 'function') {
            window.updateCurriculumScopeButtonUi();
        }
        const targetStep = window.subjectStepBeforeViewScope || (window.currentSubjectStep === 3 ? 3 : 2);
        window.subjectStepBeforeViewScope = null;
        window.handleSubjectStep(targetStep);
    };

    window.filterCurriculumScopeList = function (query) {
        window.renderCurriculumScopeItems(query);
    };

    window.renderCurriculumScopeItems = function (query = '') {
        const container = document.getElementById('curriculum-scope-items-container');
        if (!container) return;

        const q = String(query || '').toLowerCase().trim();
        const currentScope = window.activeCurriculumScope || 'master';

        const allTopics = window.currentSubjectAllTopics || window.currentSubjectTopics || [];
        const allMaterials = window.currentSubjectAllMaterials || window.currentSubjectMaterials || [];

        // Count for Admin Master Core
        const masterTopics = allTopics.filter(t => normalizeSubjectAuthorRole(t.authorRole || t.role) === 'Admin');
        const masterMaterials = allMaterials.filter(m => normalizeSubjectAuthorRole(m.authorRole || m.role) === 'Admin');

        // Only get teachers assigned to THIS subject
        const teachers = getSubjectAssignedTeachers();

        let html = '';

        // Section: Assigned Teachers
        const filteredTeachers = teachers.filter(t => {
            if (!q) return true;
            const target = `${t.name} ${t.section} ${t.department} ${t.email}`.toLowerCase();
            return target.includes(q);
        });

        html += `
            <div class="pb-1 flex items-center justify-between">
                <span class="text-xs font-bold text-black-fade font-['Inter']">Assigned Teacher Sections</span>
            </div>
        `;

        if (filteredTeachers.length === 0) {
            html += `
                <div class="p-6 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200">
                    <p class="text-sm font-bold text-black">No Assigned Teacher Sections Found</p>
                </div>
            `;
        }

        if (filteredTeachers.length > 0) {
            filteredTeachers.forEach(teacher => {
                const isTeacherActive = String(currentScope) === String(teacher.id) || (window.activeCurriculumScopeLabel === teacher.name);
                
                const tName = teacher.name.trim().toLowerCase();
                // Count custom additions by this teacher
                const teacherTopics = allTopics.filter(t => {
                    const r = normalizeSubjectAuthorRole(t.authorRole || t.role);
                    if (r !== 'Teacher') return false;
                    if (t.authorId && String(t.authorId) === String(teacher.id)) return true;
                    if (t.authorName) {
                        const aName = t.authorName.trim().toLowerCase();
                        if (aName === tName || aName.includes(tName) || tName.includes(aName)) return true;
                    }
                    return false;
                });
                const teacherMaterials = allMaterials.filter(m => {
                    const r = normalizeSubjectAuthorRole(m.authorRole || m.role);
                    if (r !== 'Teacher') return false;
                    if (m.authorId && String(m.authorId) === String(teacher.id)) return true;
                    if (m.authorName) {
                        const aName = m.authorName.trim().toLowerCase();
                        if (aName === tName || aName.includes(tName) || tName.includes(aName)) return true;
                    }
                    return false;
                });

                const sectionBadge = teacher.section ? `Section: ${teacher.section}` : (teacher.department || 'Teacher');
                const teacherScopeLabel = teacher.section ? `${teacher.name} (${teacher.section})` : teacher.name;
                const teacherAvatarHtml = (typeof window.renderUserAvatarHtml === 'function')
                    ? window.renderUserAvatarHtml(teacher, 'md')
                    : (teacher.avatar
                        ? `<div class="sigma-user-avatar sigma-user-avatar--md"><img src="${_escape(teacher.avatar)}" alt="${_escape(teacher.name)}" onerror="this.remove();"><i class="fa-solid fa-user"></i></div>`
                        : `<div class="sigma-user-avatar sigma-user-avatar--md"><i class="fa-solid fa-user"></i></div>`
                    );

                const teacherTopicText = teacherTopics.length > 0 ? `+${teacherTopics.length} Custom Topics` : `${masterTopics.length} Topics`;
                const teacherMatText = teacherMaterials.length > 0 ? `+${teacherMaterials.length} Materials` : `${masterMaterials.length} Materials`;

                html += `
                    <div onclick="window.selectCurriculumScope('${_escape(teacher.id)}', '${_escape(teacherScopeLabel)}')"
                        class="p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 font-['Inter'] ${isTeacherActive ? 'bg-amber-50/60 border-[#FFD000] shadow-xs' : 'bg-slate-50/60 hover:bg-slate-100/80 border-slate-200'}">
                        <div class="flex items-center gap-3 min-w-0 flex-1">
                            ${teacherAvatarHtml}
                            <div class="min-w-0 flex-1">
                                <div class="flex items-center gap-2">
                                    <span class="text-xs font-bold text-black font-['Inter'] truncate">${_escape(teacher.name)}</span>
                                </div>
                                <p class="text-xs text-black-fade truncate font-normal font-['Inter'] mt-0.5">${_escape(sectionBadge)}</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-3 shrink-0">
                            <span class="text-xs font-medium text-black font-['Inter'] flex items-center gap-1.5">
                                <span>${teacherTopicText}</span>
                                <span class="text-black/40">/</span>
                                <span>${teacherMatText}</span>
                            </span>
                            ${isTeacherActive ? '<i class="fa-solid fa-circle-check text-[#15803d] text-sm ml-1"></i>' : ''}
                        </div>
                    </div>
                `;
            });
        } else if (teachers.length === 0) {
            html += `
                <div class="py-6 px-4 flex flex-col items-center justify-center text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-black-fade">
                    <i class="fa-solid fa-user-slash text-2xl text-black-fade mb-2"></i>
                    <p class="text-xs font-semibold text-black">No teachers assigned to this subject yet</p>
                    <p class="text-xs text-black-fade mt-0.5">Assign this subject to a section to view teacher custom additions.</p>
                </div>
            `;
        } else {
            html += `
                <div class="py-8 flex flex-col items-center justify-center text-center">
                    <i class="fa-solid fa-user-xmark text-2xl text-black-fade mb-2"></i>
                    <p class="text-xs font-bold text-black">No matching teachers found</p>
                    <p class="text-xs text-black-fade mt-0.5">No assigned teachers match "${_escape(q)}"</p>
                </div>
            `;
        }

        container.innerHTML = html;
    };

    window.toggleSubjectSaveDropdown = function (eventOrShow) {
        if (eventOrShow && typeof eventOrShow.stopPropagation === 'function') {
            eventOrShow.stopPropagation();
        }
        const menu = document.getElementById('subject-split-dropdown-menu');
        const chevron = document.getElementById('subject-split-chevron');
        if (!menu) return;
        const willOpen = (typeof eventOrShow === 'boolean') ? eventOrShow : menu.classList.contains('hidden');
        menu.classList.toggle('hidden', !willOpen);
        if (chevron) {
            chevron.classList.toggle('rotate-180', willOpen);
        }
    };

    document.addEventListener('click', function (e) {
        const splitGroup = document.getElementById('subject-split-btn-group');
        const menu = document.getElementById('subject-split-dropdown-menu');
        if (splitGroup && menu && !menu.classList.contains('hidden')) {
            if (!splitGroup.contains(e.target)) {
                window.toggleSubjectSaveDropdown(false);
            }
        }
    });

    /**
     * Injects the full #subject-edit-overlay modal markup if not already present in the DOM.
     */
    window.ensureSubjectEditOverlay = function () {
        let overlay = document.getElementById('subject-edit-overlay');
        if (overlay) return overlay;

        const container = document.createElement('div');
        container.id = 'subject-edit-overlay';
        container.className = 'sigma-modal-overlay hidden';
        container.innerHTML = `
            <!-- Exit Control (Far Right) -->
            <button type="button" id="subject-modal-exit-btn" onclick="window.handleSubjectExit()"
                class="fixed top-10 right-10 w-12 h-12 rounded-full hover:bg-slate-200 flex items-center justify-center text-black transition-all z-[1001] cursor-pointer"
                title="Exit Editor">
                <i class="fa-solid fa-xmark text-xl"></i>
            </button>

            <div class="sigma-modal-shell">
                <!-- White Panel (Full Height Column) -->
                <div class="sigma-modal-panel">
                    <div id="subject-modal-header" class="border-b border-slate-100 sticky top-0 bg-white z-40">
                        <div class="px-4 sm:px-8 py-3 sm:py-4 min-h-[52px] sm:min-h-[72px] flex items-center justify-between gap-2.5 sm:gap-4">
                            <!-- Left: Return Chevron / Back Button & Title -->
                            <div class="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                                <!-- Dedicated Mobile Return Chevron Button (Teacher Mobile) -->
                                <button type="button" id="subject-mobile-return-btn" onclick="window.handleSubjectBack()"
                                    title="Return" aria-label="Return"
                                    class="hidden w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-black hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer border-0 p-0 shadow-none outline-none shrink-0 -ml-1">
                                    <i class="fa-solid fa-chevron-left text-sm text-black"></i>
                                </button>
                                <button type="button" id="subject-header-scope-back-btn" onclick="window.selectCurriculumScope('master', 'Master Syllabus')"
                                    title="Back to Master Syllabus"
                                    class="hidden w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-full hover:bg-slate-100 active:bg-slate-200 flex items-center justify-center text-black transition-all cursor-pointer -ml-1 shrink-0">
                                    <i class="fa-solid fa-arrow-left text-sm text-black"></i>
                                </button>
                                <button type="button" id="subject-back-btn" onclick="window.handleSubjectBack()"
                                    title="Back"
                                    class="hidden w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-black hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer border-0 p-0 shadow-none outline-none shrink-0">
                                    <i class="fa-solid fa-arrow-left text-sm text-black"></i>
                                </button>
                                <h1 id="subject-editor-title" class="text-sm sm:text-base md:text-xl font-bold text-black tracking-tight font-['Inter'] line-clamp-3 break-words">Create Subject</h1>
                                <span id="subject-modal-status-badge" class="hidden text-xs font-bold px-2.5 py-0.5 rounded-full font-['Inter'] shrink-0"></span>
                            </div>

                            <!-- Right: Actions (Publish Split Button, Delete, Edit Material) -->
                            <div id="subject-header-actions" class="flex items-center gap-2.5 shrink-0">
                                <!-- Edit Material Button (Shown only when viewing own material detail) -->
                                <button type="button" id="subject-header-edit-mat-btn" onclick="window.editMaterialFromDetail()" title="Edit Material"
                                    class="sigma-btn sigma-btn-primary sigma-btn-md gap-2 px-6 cursor-pointer font-['Inter'] hidden" style="display: none !important;">
                                    <i class="fa-solid fa-pen text-xs"></i>
                                    <span>Edit Material</span>
                                </button>

                                <!-- Delete Subject Button -->
                                <button type="button" id="subject-delete-btn" onclick="window.deleteSubjectPrompt()" title="Delete Subject"
                                    class="w-10 h-10 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all hidden flex items-center justify-center cursor-pointer">
                                    <i class="fa-solid fa-trash-can text-sm"></i>
                                </button>

                                <!-- Publish Split Button Group -->
                                <div id="subject-split-btn-group" class="relative inline-flex items-center shadow-xs rounded-xl">
                                    <button type="button" id="subject-save-btn" onclick="window.handleSubjectSave('Published')"
                                        class="h-10 px-5 rounded-l-xl bg-[#15803d] hover:bg-[#14532d] active:bg-[#0f3d1e] text-white font-bold text-sm flex items-center gap-2 transition-all cursor-pointer border-r border-white/20 font-['Inter'] shadow-xs">
                                        <i class="fa-solid fa-circle-notch fa-spin hidden" id="subject-save-loading"></i>
                                        <span id="subject-save-btn-text">Publish</span>
                                    </button>
                                    <button type="button" id="subject-split-dropdown-btn" onclick="window.toggleSubjectSaveDropdown(event)"
                                        class="h-10 px-3.5 rounded-r-xl bg-[#15803d] hover:bg-[#14532d] active:bg-[#0f3d1e] text-white flex items-center justify-center transition-all cursor-pointer font-['Inter'] shadow-xs"
                                        title="More save options">
                                        <i class="fa-solid fa-chevron-down text-xs text-white/90 transition-transform duration-150" id="subject-split-chevron"></i>
                                    </button>

                                    <!-- Dropdown Menu -->
                                    <div id="subject-split-dropdown-menu"
                                        class="hidden absolute right-0 top-full mt-2 w-56 bg-emerald-50/95 backdrop-blur-xs rounded-2xl border border-emerald-200/90 shadow-xl z-[260] p-1.5 space-y-0.5 animate-in fade-in zoom-in-95 duration-100 font-['Inter']">
                                        <button type="button" id="subject-add-another-btn" onclick="window.publishAndCreateSubject(); window.toggleSubjectSaveDropdown(false)"
                                            class="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-slate-200/70 text-black rounded-xl text-xs font-semibold transition-colors text-left cursor-pointer">
                                            <i class="fa-solid fa-plus text-xs text-black"></i>
                                            <span id="subject-add-another-btn-text">Publish & Create Another</span>
                                        </button>
                                        <button type="button" id="subject-draft-btn" onclick="window.handleSubjectSave('Draft'); window.toggleSubjectSaveDropdown(false)"
                                            class="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-slate-200/70 text-black rounded-xl text-xs font-semibold transition-colors text-left cursor-pointer">
                                            <i class="fa-regular fa-bookmark text-xs text-black"></i>
                                            <span>Save as Draft</span>
                                            <i class="fa-solid fa-circle-notch fa-spin hidden ml-auto" id="subject-draft-loading"></i>
                                        </button>
                                        <button type="button" id="subject-split-delete-btn" onclick="window.deleteSubjectPrompt(); window.toggleSubjectSaveDropdown(false)"
                                            class="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-slate-200/70 text-black rounded-xl text-xs font-semibold transition-colors text-left cursor-pointer hidden">
                                            <i class="fa-solid fa-trash-can text-xs text-black"></i>
                                            <span>Delete Subject</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- Quiz Storage Top Right Header Actions -->
                            <div id="quiz-storage-header-actions" class="hidden flex items-center gap-2 sm:gap-2.5 shrink-0 font-['Inter']">
                                <button type="button" onclick="window.openQuizCreatorTab()" title="Create New Quiz"
                                    class="h-8 sm:h-10 px-3 sm:px-5 bg-white border border-slate-300 hover:bg-slate-50 active:bg-slate-100 text-slate-800 rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer font-['Inter'] shadow-xs">
                                    <i class="fa-solid fa-plus text-xs text-black"></i>
                                    <span>Create Quiz</span>
                                </button>
                                <button type="button" id="quiz-storage-header-select-btn" onclick="window.confirmSelectedStorageQuiz()" title="Select Quiz" disabled
                                    class="h-8 sm:h-10 px-3.5 sm:px-5 bg-[#15803d] hover:bg-[#166534] active:bg-[#0f3d1e] text-white rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition-all font-['Inter'] shadow-xs opacity-50 cursor-not-allowed pointer-events-none">
                                    <span>Select Quiz</span>
                                </button>
                            </div>
                        </div>
                        <!-- Segmented Navigation Header -->
                        <div id="subject-segmented-header" class="hidden flex w-full bg-slate-100 border-y border-slate-200 select-none">
                            <!-- Step 1: Subject -->
                            <div id="subject-step-bar-1" onclick="window.handleSubjectStep(1)" role="button" tabindex="0"
                                class="flex-1 pt-4 pb-0 flex flex-col items-center justify-between transition-all border-r border-slate-200 bg-[#15803d]/10 cursor-pointer select-none">
                                <span id="subject-step-bar-1-label"
                                    class="text-base font-bold capitalize tracking-normal transition-colors text-[#15803d] mb-3">Add Subject</span>
                                <div id="subject-step-bar-1-track"
                                    class="w-full h-1.5 bg-[#15803d] transition-all"></div>
                            </div>

                            <!-- Step 2: Topics & Materials -->
                            <div id="subject-step-bar-2" onclick="window.handleSubjectStep(window.subjectContentNextStep ? window.subjectContentNextStep() : 3)" role="button" tabindex="0"
                                class="flex-1 pt-4 pb-0 flex flex-col items-center justify-between transition-all border-r border-slate-200 bg-slate-100 cursor-pointer select-none">
                                <span id="subject-step-bar-2-label"
                                    class="text-base font-bold capitalize tracking-normal transition-colors text-slate-500 mb-3">Add Topics & Materials</span>
                                <div id="subject-step-bar-2-track"
                                    class="w-full h-1.5 bg-slate-200 transition-all"></div>
                            </div>

                            <!-- Step 3: Materials -->
                            <div id="subject-step-bar-3"
                                class="hidden flex-1 pt-4 pb-0 flex flex-col items-center justify-between transition-all bg-slate-100 select-none">
                                <span id="subject-step-bar-3-label"
                                    class="text-base font-bold capitalize tracking-normal transition-colors text-slate-500 mb-3">Add Material</span>
                                <div id="subject-step-bar-3-track"
                                    class="w-full h-1.5 bg-slate-200 transition-all"></div>
                            </div>
                        </div>
                    </div>

                    <!-- Form Body -->
                    <div id="subject-edit-form-body" class="flex-1 px-4 sm:px-8 md:px-10 pt-4 sm:pt-5 pb-8 sm:pb-10 space-y-4 sm:space-y-6">
                        <!-- Step 1: Create Subject -->
                        <div id="subject-step-1" class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div class="space-y-3">
                                <label for="edit-subject-code" class="sigma-subject-label text-base font-bold text-black capitalize tracking-normal ml-1">Subject Code <span class="text-red-500">*</span></label>
                                <input type="text" id="edit-subject-code" maxlength="20" placeholder="e.g. PROG-101"
                                    oninput="this.value = this.value.replace(/[^a-zA-Z0-9\-]/g, '').toUpperCase(); window.checkSubjectDraftStatus?.(); window.checkSubjectFormValidity?.()"
                                    class="sigma-subject-input w-full bg-slate-50 border-b-2 border-slate-300 rounded-none px-4 py-4 text-base font-medium text-black outline-none hover:bg-slate-100 hover:border-slate-400 focus:bg-slate-100 focus:border-[#FFD000] transition-all placeholder:text-black/40 font-['Inter'] shadow-none">
                            </div>

                            <div class="space-y-3">
                                <div class="flex items-center justify-between ml-1">
                                    <label for="edit-subject-name" class="sigma-subject-label text-base font-bold text-black capitalize tracking-normal">Subject Name <span class="text-red-500">*</span></label>
                                    <span id="edit-subject-name-counter" class="text-xs font-bold text-slate-400 uppercase tracking-widest">0 / 100</span>
                                </div>
                                <input type="text" id="edit-subject-name" maxlength="100"
                                    oninput="this.value = this.value.replace(/[^a-zA-Z0-9\s.,!?'&()\-]/g, ''); const cnt = document.getElementById('edit-subject-name-counter'); if (cnt) cnt.textContent = this.value.length + ' / 100'; window.syncDepEdWeightsDefault?.(); window.checkSubjectDraftStatus?.(); window.checkSubjectFormValidity?.()"
                                    placeholder="Full Subject Name"
                                    class="sigma-subject-input w-full bg-slate-50 border-b-2 border-slate-300 rounded-none px-4 py-4 text-base font-medium text-black outline-none hover:bg-slate-100 hover:border-slate-400 focus:bg-slate-100 focus:border-[#FFD000] transition-all placeholder:text-black/40 font-['Inter'] shadow-none">
                            </div>

                            <div class="grid grid-cols-2 gap-8">
                                <div class="space-y-3">
                                    <label for="edit-subject-units" class="sigma-subject-label text-base font-bold text-black capitalize tracking-normal ml-1">Units <span class="text-red-500">*</span></label>
                                    <input type="text" id="edit-subject-units" maxlength="2" placeholder="e.g. 3"
                                        oninput="this.value = this.value.replace(/[^0-9]/g, ''); window.checkSubjectDraftStatus?.(); window.checkSubjectFormValidity?.()"
                                        class="sigma-subject-input w-full bg-slate-50 border-b-2 border-slate-300 rounded-none px-4 py-4 text-base font-medium text-black outline-none hover:bg-slate-100 hover:border-slate-400 focus:bg-slate-100 focus:border-[#FFD000] transition-all placeholder:text-black/40 font-['Inter'] shadow-none">
                                </div>
                                <div class="space-y-3">
                                    <label for="edit-subject-type" class="sigma-subject-label text-base font-bold text-black capitalize tracking-normal ml-1">Subject Type <span class="text-red-500">*</span></label>
                                    <div class="relative">
                                        <select id="edit-subject-type" onchange="window.handleSubjectTypeChange?.()"
                                            class="sigma-subject-select w-full bg-slate-50 border-b-2 border-slate-300 rounded-none px-4 py-4 text-base font-medium text-black outline-none hover:bg-slate-100 hover:border-slate-400 focus:bg-slate-100 focus:border-[#FFD000] transition-all appearance-none cursor-pointer font-['Inter'] shadow-none">
                                            <option value="Core">Core Subject</option>
                                            <option value="Applied">Applied Subject</option>
                                            <option value="Specialized">Specialized Subject</option>
                                        </select>
                                        <i class="fa-solid fa-chevron-down absolute right-5 top-1/2 -translate-y-1/2 text-xs text-black pointer-events-none"></i>
                                    </div>
                                </div>
                            </div>

                            <div id="edit-subject-strand-container" class="space-y-3 hidden">
                                <label for="edit-subject-strand" class="sigma-subject-label text-base font-bold text-black capitalize tracking-normal ml-1">Strand Requirement <span class="text-red-500">*</span></label>
                                <div class="relative">
                                    <select id="edit-subject-strand" onchange="window.syncDepEdWeightsDefault?.(); window.checkSubjectDraftStatus?.(); window.checkSubjectFormValidity?.()"
                                        class="sigma-subject-select w-full bg-slate-50 border-b-2 border-slate-300 rounded-none px-4 py-4 text-base font-medium text-black outline-none hover:bg-slate-100 hover:border-slate-400 focus:bg-slate-100 focus:border-[#FFD000] transition-all appearance-none cursor-pointer font-['Inter'] shadow-none">
                                        <option value="ABM">ABM (Accountancy, Business, and Management)</option>
                                        <option value="HUMSS">HUMSS (Humanities and Social Sciences)</option>
                                        <option value="GAS">GAS (General Academic Strand)</option>
                                        <option value="ICT">ICT (Information and Communications Technology)</option>
                                        <option value="HE">HE (Home Economics)</option>
                                    </select>
                                    <i class="fa-solid fa-chevron-down absolute right-5 top-1/2 -translate-y-1/2 text-xs text-black pointer-events-none"></i>
                                </div>
                            </div>

                            <!-- Assessment Weights (DepEd Senior High School Presets) -->
                            <div class="space-y-3" id="edit-subject-weights-wrapper">
                                <label for="edit-subject-weights" class="sigma-subject-label text-base font-bold text-black capitalize tracking-normal ml-1">Assessment Weights <span class="text-red-500">*</span></label>
                                <div class="relative">
                                    <select id="edit-subject-weights" onchange="window.handleSubjectWeightPresetChange?.(); window.checkSubjectDraftStatus?.(); window.checkSubjectFormValidity?.();"
                                        class="sigma-subject-select w-full bg-slate-50 border-b-2 border-slate-300 rounded-none px-4 py-4 text-base font-medium text-black outline-none hover:bg-slate-100 hover:border-slate-400 focus:bg-slate-100 focus:border-[#FFD000] transition-all appearance-none cursor-pointer font-['Inter'] shadow-none">
                                        <option value="core" data-ww="25" data-pt="50" data-qa="25">Core Subjects (All Strands) — WW 25% · PT 50% · QA 25%</option>
                                        <option value="acad-specialized" data-ww="25" data-pt="45" data-qa="30">Academic Strands (ABM, GAS, HUMSS) — WW 25% · PT 45% · QA 30%</option>
                                        <option value="acad-immersion" data-ww="35" data-pt="40" data-qa="25">Academic Strands (Research / Immersion) — WW 35% · PT 40% · QA 25%</option>
                                        <option value="tvl-specialized" data-ww="30" data-pt="50" data-qa="20">TVL Strands (ICT & HE) — Applied & Specialized — WW 30% · PT 50% · QA 20%</option>
                                        <option value="tvl-immersion" data-ww="20" data-pt="60" data-qa="20">TVL Strands (ICT & HE) — Work Immersion / Practicum — WW 20% · PT 60% · QA 20%</option>
                                    </select>
                                    <i class="fa-solid fa-chevron-down absolute right-5 top-1/2 -translate-y-1/2 text-xs text-black pointer-events-none"></i>
                                </div>
                            </div>

                            <!-- Active Semester & Quarters Checkboxes -->
                            <div class="space-y-3">
                                <div class="flex items-center justify-between ml-1">
                                    <span class="text-base font-bold text-black capitalize tracking-normal">Active Semester & Quarters <span class="text-red-500">*</span></span>
                                    <span class="text-xs font-medium text-black-fade">Select the active semesters for this subject</span>
                                </div>
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <label class="flex items-center gap-3.5 p-3.5 rounded-2xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 hover:border-slate-300 transition-all select-none">
                                        <input type="checkbox" name="edit-subject-semester" id="edit-subject-sem1" value="sem1"
                                            onchange="window.handleActiveQuartersChange?.(); window.checkSubjectDraftStatus?.(); window.checkSubjectFormValidity?.()"
                                            class="w-4 h-4 rounded text-[#15803d] focus:ring-[#15803d] cursor-pointer accent-[#15803d]" />
                                        <div class="flex flex-col">
                                            <span class="text-sm font-bold text-black">1st Semester</span>
                                            <span class="text-xs font-medium text-black-fade">1st Quarter & 2nd Quarter</span>
                                        </div>
                                    </label>
                                    <label class="flex items-center gap-3.5 p-3.5 rounded-2xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 hover:border-slate-300 transition-all select-none">
                                        <input type="checkbox" name="edit-subject-semester" id="edit-subject-sem2" value="sem2"
                                            onchange="window.handleActiveQuartersChange?.(); window.checkSubjectDraftStatus?.(); window.checkSubjectFormValidity?.()"
                                            class="w-4 h-4 rounded text-[#15803d] focus:ring-[#15803d] cursor-pointer accent-[#15803d]" />
                                        <div class="flex flex-col">
                                            <span class="text-sm font-bold text-black">2nd Semester</span>
                                            <span class="text-xs font-medium text-black-fade">3rd Quarter & 4th Quarter</span>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <!-- Step 2: Create Topics -->
                        <div id="subject-step-2" class="space-y-5 hidden">
                            <!-- Main Topics List View -->
                            <div id="subject-topics-main-view" class="space-y-5">
                                <div class="mb-1 hidden">
                                    <!-- Header Title & Subtitle -->
                                    <div>
                                        <div class="flex items-center gap-2">
                                            <h3 id="subject-step-2-title" class="text-lg font-bold text-black tracking-tight font-['Inter']">Add Topics</h3>
                                        </div>
                                        <p id="subject-step-2-subtitle" class="text-xs font-medium text-black-fade truncate">Add and organize subject topics</p>
                                    </div>
                                </div>

                                <!-- Topics Quarter Pill Tabs with Add Topic on the right and Scope Button beside pills -->
                                <div id="subject-topics-quarter-bar" class="flex items-center justify-between gap-3 pb-1 border-b border-slate-100 flex-wrap">
                                    <div class="flex items-center gap-2.5 flex-wrap">
                                        <div id="subject-topics-quarter-pills" class="flex gap-1 bg-slate-100 rounded-xl p-1">
                                            <!-- Dynamically rendered -->
                                        </div>

                                        <!-- Scope Selector Button (Admin Only) beside quarter pills -->
                                        <div id="subject-topic-scope-container" class="hidden shrink-0 flex items-center">
                                            <button type="button" onclick="window.openCurriculumScopePicker()"
                                                class="h-9 px-3.5 bg-white hover:bg-slate-100 active:bg-slate-200 border border-slate-200 hover:border-slate-300 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer font-['Inter'] group shadow-2xs w-auto">
                                                <i class="fa-solid fa-users-viewfinder text-xs text-amber-600 transition-colors shrink-0"></i>
                                                <span id="subject-topic-scope-label" class="text-xs font-semibold text-black whitespace-nowrap overflow-hidden text-ellipsis">View Scope</span>
                                            </button>
                                        </div>
                                    </div>
                                    <div class="flex items-center shrink-0">
                                        <button type="button" id="subject-add-topic-header-btn" onclick="window.addSubjectTopic()"
                                            class="h-9 px-3.5 bg-white hover:bg-slate-100 active:bg-slate-200 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-black flex items-center gap-2 transition-all cursor-pointer font-['Inter'] shadow-2xs">
                                            <i class="fa-solid fa-plus text-xs text-black"></i>
                                            <span>Add Topic</span>
                                        </button>
                                    </div>
                                </div>

                                <!-- Topics List Container -->
                                <div id="subject-topics-list" class="space-y-4"></div>

                                <!-- Add Another Topic Dashed Button -->
                                <div id="subject-topics-add-another-container" class="pt-2 hidden">
                                    <button type="button" onclick="window.addSubjectTopic()"
                                        class="sigma-add-topic-dashed-btn w-full py-4 rounded-2xl text-sm font-bold capitalize transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 group">
                                        <i class="fa-solid fa-plus text-xs"></i>
                                        <span>Add Another Topic</span>
                                    </button>
                                </div>

                                <!-- Empty State for Topics -->
                                <div id="subject-topics-empty"
                                    class="flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-[32px] border-2 border-dashed border-slate-200 text-black-fade">
                                    <i class="fa-solid fa-layer-group sigma-empty-icon" aria-hidden="true"></i>
                                    <p class="sigma-empty-title">No Topics Added Yet</p>
                                </div>
                            </div>

                            <!-- Dedicated Topic Editor View -->
                            <div id="subject-topic-editor-view" class="hidden space-y-10"></div>
                        </div>

                        <!-- Step 3: Add Materials -->
                        <div id="subject-step-3" class="space-y-5 hidden">
                            <div id="subject-materials-main-view" class="space-y-5">
                                <div class="mb-1 hidden">
                                    <!-- Header Title & Subtitle -->
                                    <div>
                                        <div class="flex items-center gap-2">
                                            <h3 id="subject-step-3-title" class="text-lg font-bold text-black tracking-tight font-['Inter']">Add Materials</h3>
                                        </div>
                                        <p id="subject-step-3-subtitle" class="text-xs font-medium text-black-fade truncate">Add and organize subject content</p>
                                    </div>
                                </div>

                                <!-- Materials Quarter Pill Tabs with Scope Button beside it, and Add Material dropdown on the right -->
                                <div id="subject-materials-quarter-bar" class="flex items-center justify-between gap-2.5 sm:gap-3 pb-2 sm:pb-1 border-b border-slate-100 flex-wrap">
                                    <div class="flex items-center gap-2 sm:gap-2.5 flex-wrap">
                                        <div id="subject-materials-quarter-pills" class="flex gap-1 bg-slate-100 rounded-xl p-1">
                                            <!-- Dynamically rendered -->
                                        </div>

                                        <!-- Scope Selector Button (Admin Only) beside quarter pills -->
                                        <div id="subject-material-scope-container" class="hidden shrink-0 flex items-center">
                                            <button type="button" onclick="window.openCurriculumScopePicker()"
                                                class="h-8 sm:h-9 px-2.5 sm:px-3.5 bg-white hover:bg-slate-100 active:bg-slate-200 border border-slate-200 hover:border-slate-300 rounded-xl flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer font-['Inter'] group shadow-2xs w-auto">
                                                <i class="fa-solid fa-users-viewfinder text-xs text-amber-600 transition-colors shrink-0"></i>
                                                <span id="subject-material-scope-label" class="text-xs font-semibold text-black whitespace-nowrap overflow-hidden text-ellipsis">View Scope</span>
                                            </button>
                                        </div>
                                    </div>
                                    <!-- Add Material Dropdown on the Right of Quarter Bar -->
                                    <div class="relative shrink-0 flex items-center justify-start sm:justify-end gap-1.5 sm:gap-2 flex-wrap">
                                        <button type="button" id="subject-content-reorder-btn" onclick="window.openTopicOrderPanel()"
                                            class="hidden h-8 sm:h-9 px-2.5 sm:px-3.5 bg-white hover:bg-slate-100 active:bg-slate-200 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-semibold sm:font-bold text-black flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer font-['Inter'] shadow-2xs whitespace-nowrap">
                                            <i class="fa-solid fa-arrow-down-up text-xs text-black"></i>
                                            <span>Reorder</span>
                                        </button>
                                        <button type="button" id="subject-content-add-topic-btn" onclick="window.addSubjectTopic()"
                                            class="hidden h-8 sm:h-9 px-2.5 sm:px-3.5 bg-white hover:bg-slate-100 active:bg-slate-200 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-semibold sm:font-bold text-black flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer font-['Inter'] shadow-2xs whitespace-nowrap">
                                            <i class="fa-solid fa-plus text-xs text-black"></i>
                                            <span>Add Topic</span>
                                        </button>
                                        <div class="relative inline-block shrink-0">
                                            <button id="add-material-trigger" type="button"
                                                onclick="window.toggleMaterialDropdown(event)"
                                                class="h-8 sm:h-9 px-2.5 sm:px-3.5 bg-white hover:bg-slate-100 active:bg-slate-200 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-semibold sm:font-bold text-black flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer font-['Inter'] shadow-2xs whitespace-nowrap">
                                                <i class="fa-solid fa-plus text-xs text-black transition-transform duration-200"></i>
                                                <span>Add Material</span>
                                            </button>

                                            <!-- Dropdown Menu -->
                                            <div id="add-material-dropdown"
                                                class="absolute right-0 sm:right-0 top-full mt-2 w-56 sm:w-64 md:w-72 bg-white border border-slate-200 rounded-xl sm:rounded-2xl shadow-xl hidden z-[100] max-h-[30rem] overflow-y-auto p-1.5 sm:p-2 font-['Inter']">
                                                <div class="px-2.5 pt-1.5 pb-0.5 text-[10px] sm:text-xs font-bold text-black-fade uppercase tracking-wider">Learning Materials</div>
                                                <button type="button" onclick="window.addSubjectMaterial('Video')"
                                                    class="w-full flex items-center gap-2.5 px-2 py-1.5 hover:bg-slate-50 rounded-lg sm:rounded-xl transition-all text-left cursor-pointer group">
                                                    <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-red-50 group-hover:bg-red-100/70 border border-red-100 flex items-center justify-center shrink-0 transition-colors">
                                                        <i class="fa-solid fa-circle-play text-red-600 text-xs sm:text-sm"></i>
                                                    </div>
                                                    <div class="min-w-0">
                                                        <span class="text-xs font-bold text-black block leading-tight">Add Video</span>
                                                        <span class="text-[9.5px] sm:text-[10px] text-black-fade font-normal block leading-tight mt-0.5">MP4 or YouTube link</span>
                                                    </div>
                                                </button>
                                                <button type="button" onclick="window.addSubjectMaterial('Lesson')"
                                                    class="w-full flex items-center gap-2.5 px-2 py-1.5 hover:bg-slate-50 rounded-lg sm:rounded-xl transition-all text-left cursor-pointer group">
                                                    <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-50 group-hover:bg-blue-100/70 border border-blue-100 flex items-center justify-center shrink-0 transition-colors">
                                                        <i class="fa-solid fa-file-lines text-blue-600 text-xs sm:text-sm"></i>
                                                    </div>
                                                    <div class="min-w-0">
                                                        <span class="text-xs font-bold text-black block leading-tight">Add Lesson</span>
                                                        <span class="text-[9.5px] sm:text-[10px] text-black-fade font-normal block leading-tight mt-0.5">PDF, DOCX, presentation</span>
                                                    </div>
                                                </button>
                                                <div class="h-px bg-slate-100 my-1 mx-1.5"></div>
                                                <div class="px-2.5 pt-1 pb-0.5 text-[10px] sm:text-xs font-bold text-black-fade uppercase tracking-wider">Assessment Materials</div>
                                                <button type="button" onclick="window.addSubjectMaterial('Quiz')"
                                                    class="w-full flex items-center gap-2.5 px-2 py-1.5 hover:bg-slate-50 rounded-lg sm:rounded-xl transition-all text-left cursor-pointer group">
                                                    <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 group-hover:bg-emerald-100/70 border border-emerald-100 flex items-center justify-center shrink-0 transition-colors">
                                                        <i class="fa-solid fa-stopwatch text-emerald-600 text-xs sm:text-sm"></i>
                                                    </div>
                                                    <div class="min-w-0">
                                                        <span class="text-xs font-bold text-black block leading-tight">Add Quiz</span>
                                                        <span class="text-[9.5px] sm:text-[10px] text-black-fade font-normal block leading-tight mt-0.5">Questions</span>
                                                    </div>
                                                </button>
                                                <button type="button" onclick="window.addSubjectMaterial('Task')"
                                                    class="w-full flex items-center gap-2.5 px-2 py-1.5 hover:bg-slate-50 rounded-lg sm:rounded-xl transition-all text-left cursor-pointer group">
                                                    <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-50 group-hover:bg-amber-100/70 border border-amber-100 flex items-center justify-center shrink-0 transition-colors">
                                                        <i class="fa-solid fa-clipboard-list text-amber-600 text-xs sm:text-sm"></i>
                                                    </div>
                                                    <div class="min-w-0">
                                                        <span class="text-xs font-bold text-black block leading-tight">Add Task</span>
                                                        <span class="text-[9.5px] sm:text-[10px] text-black-fade font-normal block leading-tight mt-0.5">Documents, worksheets & files</span>
                                                    </div>
                                                </button>
                                            </div>
                                        </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Materials Topic Sections Container -->
                                <div id="subject-materials-grid" class="space-y-6"></div>

                                <!-- Empty State for Materials -->
                                <div id="subject-materials-empty"
                                    class="flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-[40px] border-2 border-dashed border-slate-200 text-black-fade">
                                    <i class="fa-solid fa-folder-open sigma-empty-icon" aria-hidden="true"></i>
                                    <p class="sigma-empty-title">No Materials Added Yet</p>
                                </div>

                            </div>

                            <!-- Material Editor View -->
                            <div id="subject-material-editor-view" class="hidden"></div>

                            <!-- Material Paper Detail View -->
                            <div id="subject-material-detail-view" class="hidden"></div>
                        </div>
                    </div>

                    <!-- Subject Modal Footer (Shared Modal Footer) -->
                    ${typeof window.renderSubjectModalFooter === 'function' ? window.renderSubjectModalFooter() : `
                    <div id="subject-modal-footer" class="sigma-modal-footer flex items-center justify-end gap-3 px-8 sm:px-10 py-4 border-t border-slate-200 bg-white sticky bottom-0 z-30 font-['Inter']" style="justify-content: flex-end !important;">
                        <button type="button" id="subject-next-btn" onclick="window.handleSubjectNext()"
                            class="subject-next-btn sigma-btn sigma-btn-primary sigma-btn-md min-w-[120px] cursor-pointer ml-auto flex items-center justify-center gap-2 font-['Inter']">
                            <span>Next</span>
                            <i class="fa-solid fa-arrow-right text-xs"></i>
                        </button>
                    </div>
                    `}

                    <!-- Final Action Footer (Visible only during inner sub-editors: Topic Editor, Material Editor, Quiz Storage) -->
                    <div id="subject-global-footer" class="hidden px-4 sm:px-8 py-3 sm:py-4 bg-white border-t border-slate-200 flex items-center justify-end sticky bottom-0 z-30 font-['Inter']">
                        <!-- Hidden back btn placeholders (kept for JS compatibility, never shown) -->
                        <button type="button" id="topic-editor-back-btn" onclick="window.handleTopicEditorBack()" class="hidden" style="display:none!important" aria-hidden="true"></button>
                        <button type="button" id="mat-editor-back-btn" onclick="window.cancelMaterialEditor()" class="hidden" style="display:none!important" aria-hidden="true"></button>
                        <button type="button" id="mat-detail-back-btn" onclick="window.closeSubjectMaterialDetail()" class="hidden" style="display:none!important" aria-hidden="true"></button>

                        <div class="flex items-center gap-2 sm:gap-3">
                            <button type="button" id="mat-detail-edit-btn" onclick="window.editMaterialFromDetail()"
                                class="sigma-btn sigma-btn-primary h-9 sm:h-[46px] px-3.5 sm:px-6 text-xs sm:text-sm font-bold rounded-xl gap-1.5 sm:gap-2 cursor-pointer font-['Inter'] hidden items-center justify-center">
                                <i class="fa-solid fa-pen text-xs sm:text-sm"></i>
                                <span>Edit Material</span>
                            </button>

                            <!-- Topic Editor specific buttons (Pinned at bottom) -->
                            <button type="button" id="topic-editor-delete-btn" onclick="window.removeSubjectTopicFromEditor()"
                                class="sigma-btn sigma-btn-white h-9 sm:h-[46px] px-3.5 sm:px-5 text-xs sm:text-sm font-bold rounded-xl gap-1.5 sm:gap-2 cursor-pointer font-['Inter'] text-black hidden items-center">
                                <i class="fa-solid fa-trash-can text-xs sm:text-sm text-black"></i>
                                <span>Delete Topic</span>
                            </button>
                            <button type="button" id="topic-editor-add-another-btn" onclick="window.saveAndAddAnotherTopic()"
                                class="sigma-btn sigma-btn-white h-9 sm:h-[46px] px-3.5 sm:px-5 text-xs sm:text-sm font-bold rounded-xl gap-1.5 sm:gap-2 cursor-pointer font-['Inter'] text-black hidden items-center shadow-2xs">
                                <i class="fa-solid fa-plus text-xs sm:text-sm"></i>
                                <span>Save & Add Another Topic</span>
                            </button>
                            <button type="button" id="topic-editor-save-btn" onclick="window.saveTopicFromEditor()"
                                class="sigma-btn sigma-btn-primary h-9 sm:h-[46px] px-4 sm:px-6 text-xs sm:text-sm font-bold rounded-xl gap-1.5 sm:gap-2 cursor-pointer font-['Inter'] hidden items-center justify-center shadow-2xs">
                                <span id="topic-editor-save-btn-text">Save Topic</span>
                            </button>

                            <!-- Material Editor specific buttons (Pinned at bottom) -->
                            <button type="button" id="mat-editor-delete-btn" onclick="window.deleteCurrentEditingMaterial()"
                                class="sigma-btn sigma-btn-white h-9 sm:h-[46px] px-3.5 sm:px-5 text-xs sm:text-sm font-bold rounded-xl gap-1.5 sm:gap-2 cursor-pointer font-['Inter'] text-black hidden items-center">
                                <i class="fa-solid fa-trash-can text-xs sm:text-sm text-black"></i>
                                <span>Delete Material</span>
                            </button>
                            <button type="button" id="mat-editor-add-another-btn" onclick="window.saveAndAddAnotherMaterial()"
                                class="sigma-btn sigma-btn-white h-9 sm:h-[46px] px-3.5 sm:px-5 text-xs sm:text-sm font-bold rounded-xl gap-1.5 sm:gap-2 cursor-pointer font-['Inter'] text-black hidden items-center shadow-2xs">
                                <i class="fa-solid fa-plus text-xs sm:text-sm"></i>
                                <span id="mat-editor-add-another-btn-text">Save & Add Lesson</span>
                            </button>
                            <button type="button" id="mat-editor-save-btn" onclick="window.performSaveMaterial()"
                                class="sigma-btn sigma-btn-primary h-9 sm:h-[46px] px-4 sm:px-6 text-xs sm:text-sm font-bold rounded-xl gap-1.5 sm:gap-2 cursor-pointer font-['Inter'] hidden items-center justify-center shadow-2xs">
                                <span id="mat-editor-save-btn-text">Add Material</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(container);
        return container;
    };

    /**
     * Unified entrypoint to open the Subject Editor modal.
     * @param {string|object} subjectDataOrId - Subject code, id, or object
     * @param {number} initialStep - 1 (Subject), 2 (Topics - Image 3), 3 (Materials - Image 4)
     * @param {object|null} options - Optional flags { standalone, title, hideBars, standaloneStep }
     */
    window.openSubjectEditor = function (subjectDataOrId, initialStep = 1, options = null) {
        const hash = String(window.location.hash || '');
        const isClassroomRoute = hash.startsWith('#classroom:');
        let resolvedSec = options?.section || options?.selectedSection || '';
        if (!resolvedSec && isClassroomRoute) {
            resolvedSec = (window.currentAdminClassroomSection ? (window.currentAdminClassroomSection.name || window.currentAdminClassroomSection.section) : '')
                || (typeof window.currentClassroomSectionName !== 'undefined' ? window.currentClassroomSectionName : '')
                || (typeof currentClassroomSectionName !== 'undefined' ? currentClassroomSectionName : '')
                || (typeof currentTopicState !== 'undefined' ? currentTopicState?.selectedSection : '')
                || (typeof window.currentTopicState !== 'undefined' ? window.currentTopicState?.selectedSection : '');
        } else if (!resolvedSec && typeof window.isCurrentEditorTeacher === 'function' && window.isCurrentEditorTeacher()) {
            resolvedSec = (typeof resolveTeacherActiveSection === 'function' ? resolveTeacherActiveSection() : '')
                || localStorage.getItem('sigma-active-classroom-section')
                || '';
        }
        window.activeSubjectEditorSection = resolvedSec || '';
        window.originalEditingSubjectId = (typeof subjectDataOrId === 'string') 
            ? subjectDataOrId 
            : (subjectDataOrId?.id || subjectDataOrId?.code || null);
        window.originalEditingSubjectCode = null;
        window.originalEditingSubjectName = null;

        let subjectData = null;
        let subjects = _getStored(SUBJECTS_STORAGE_KEY, []);

        const _norm = str => String(str || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

        if (typeof window.findMatchingSubject === 'function') {
            subjectData = window.findMatchingSubject(subjects, subjectDataOrId);
        }

        if (subjectData) {
            window.originalEditingSubjectCode = subjectData.code || null;
            window.originalEditingSubjectName = subjectData.name || null;
            window.originalEditingSubjectId = subjectData.id || window.originalEditingSubjectId || null;
        }

        if (!subjectData) {
            if (typeof subjectDataOrId === 'object' && subjectDataOrId !== null) {
                const code = (subjectDataOrId.code || '').trim().toLowerCase();
                const name = (subjectDataOrId.name || subjectDataOrId.title || subjectDataOrId.text || '').trim().toLowerCase();
                const normCode = _norm(code);
                const normName = _norm(name);

                const matched = subjects.find(s => {
                    const sCode = (s.code || '').trim().toLowerCase();
                    const sName = (s.name || '').trim().toLowerCase();
                    return (code && sCode === code) || (name && sName === name) ||
                           (normCode && _norm(sCode) === normCode) || (normName && _norm(sName) === normName);
                });
                subjectData = matched ? JSON.parse(JSON.stringify(matched)) : subjectDataOrId;
            } else if (typeof subjectDataOrId === 'string' && subjectDataOrId.trim()) {
                const idToFind = subjectDataOrId.trim().toLowerCase();
                const normId = _norm(idToFind);
                const cleanKey = _norm(idToFind.replace(/^card-|^subj-|^gen-/, ''));

                subjectData = subjects.find(s => {
                    const sCode = (s.code || '').trim().toLowerCase();
                    const sName = (s.name || '').trim().toLowerCase();
                    const sId = (s.id || '').trim().toLowerCase();
                    return sCode === idToFind || sName === idToFind || sId === idToFind ||
                           (normId && (_norm(sCode) === normId || _norm(sName) === normId || _norm(sId) === normId)) ||
                           (cleanKey && (_norm(sCode) === cleanKey || _norm(sName).includes(cleanKey) || cleanKey.includes(_norm(sName))));
                });

                if (!subjectData) {
                    const getSub = window.getTopicSubject;
                    const getDat = window.getTopicData;
                    const subObj = getSub ? getSub(subjectDataOrId) : null;
                    const datObj = getDat ? getDat(subjectDataOrId) : null;
                    const resolvedName = (subObj?.name || subObj?.title || datObj?.text || '').trim().toLowerCase();
                    const resolvedCode = (subObj?.code || datObj?.code || '').trim().toLowerCase();
                    const normResolvedName = _norm(resolvedName);
                    const normResolvedCode = _norm(resolvedCode);
                    
                    if (normResolvedName || normResolvedCode) {
                        subjectData = subjects.find(s => {
                            const sCode = _norm(s.code);
                            const sName = _norm(s.name);
                            return (normResolvedName && (sName === normResolvedName || sName.includes(normResolvedName) || normResolvedName.includes(sName))) ||
                                   (normResolvedCode && (sCode === normResolvedCode || sCode.includes(normResolvedCode) || normResolvedCode.includes(sCode)));
                        });
                    }
                }
            }
        }

        if (subjectData) {
            subjectData = JSON.parse(JSON.stringify(subjectData));
        }

        if (!subjectData) {
            subjectData = {
                code: (typeof subjectDataOrId === 'string' ? subjectDataOrId.toUpperCase() : 'SUBJ-101'),
                name: (typeof subjectDataOrId === 'string' ? subjectDataOrId : 'Subject Content'),
                units: '3',
                type: 'Core',
                strand: 'All',
                status: 'Draft',
                topics: [],
                materials: []
            };
        } else {
            subjectData.topics = Array.isArray(subjectData.topics)
                ? subjectData.topics.filter(t => !isFakeSampleTopic(t))
                : [];
            if (!Array.isArray(subjectData.materials)) {
                let existingMats = [];
                const existingIds = new Set();
                subjectData.topics.forEach((top, tIdx) => {
                    const tId = top.id || `topic-${tIdx + 1}`;
                    const embedded = [
                        ...(Array.isArray(top.activity) ? top.activity : (Array.isArray(top.activities) ? top.activities : [])),
                        ...(Array.isArray(top.assignments) ? top.assignments : []),
                        ...(Array.isArray(top.quiz) ? top.quiz : (Array.isArray(top.quizzes) ? top.quizzes : [])),
                        ...(Array.isArray(top.performanceTasks) ? top.performanceTasks : (Array.isArray(top.performance) ? top.performance : [])),
                        ...(Array.isArray(top.materials) ? top.materials : (Array.isArray(top.handouts) ? top.handouts : [])),
                        ...(Array.isArray(top.videos) ? top.videos : []),
                        ...(Array.isArray(top.allMaterials) ? top.allMaterials : [])
                    ];
                    embedded.forEach(em => {
                        if (em && typeof em === 'object' && !isFakeSampleMaterial(em)) {
                            const emId = em.id || (em.title ? `mat-${tId}-${String(em.title).replace(/[^a-z0-9]/gi, '_').toLowerCase()}` : `mat-${tId}`);
                            if (!existingIds.has(emId)) {
                                existingMats.push({ ...em, id: emId, topicId: em.topicId || tId });
                                existingIds.add(emId);
                            }
                        }
                    });
                });
                subjectData.materials = existingMats;
            } else {
                subjectData.materials = subjectData.materials.filter(m => !isFakeSampleMaterial(m));
            }
        }

        window.toggleSubjectOverlay(true, subjectData, initialStep, options);
    };

    /**
     * Toggles the Subject Overlay open/closed.
     */
    window.toggleSubjectOverlay = function (show, subjectData = null, initialStep = 1, options = null) {
        if (options !== null && options !== undefined) {
            window.subjectEditorOptions = options;
        } else if (!show) {
            window.subjectEditorOptions = null;
        }
        const overlay = window.ensureSubjectEditOverlay();
        if (show && typeof window.getDepEdWeightPresets === 'function') {
            const select = document.getElementById('edit-subject-weights');
            if (select) {
                const previousValue = select.value;
                const options = window.getDepEdWeightPresets().map(preset => {
                    const option = document.createElement('option');
                    option.value = preset.id;
                    option.textContent = `${preset.label} - WW ${preset.ww}% / PT ${preset.pt}% / QA ${preset.qa}%`;
                    ['ww', 'pt', 'qa'].forEach(key => { option.dataset[key] = String(preset[key]); });
                    return option;
                });
                select.replaceChildren(...options);
                if (options.some(option => option.value === previousValue)) select.value = previousValue;
            }
        }
        const isTeacherEditor = typeof isCurrentEditorTeacher === 'function' ? isCurrentEditorTeacher() : false;
        const isContentFocus = window.subjectEditorOptions?.focus === 'content';
        const isStandalone = Boolean(window.subjectEditorOptions?.standalone);
        const hideBars = Boolean(window.subjectEditorOptions?.hideBars) || isContentFocus || isStandalone || isTeacherEditor;
        if (overlay) {
            overlay.classList.toggle('teacher-mode', isTeacherEditor);
            overlay.classList.toggle('standalone-mode', isStandalone);
            overlay.classList.toggle('content-mode', isContentFocus);
            overlay.classList.toggle('hide-bars', hideBars);
        }
        const titleEl = document.getElementById('subject-editor-title');
        const segmentedHeader = document.getElementById('subject-segmented-header');

        // Always reset sub-editor views to main list views and clear sub-editor states
        const initTopicMain = document.getElementById('subject-topics-main-view');
        const initTopicEdit = document.getElementById('subject-topic-editor-view');
        const initMatMain = document.getElementById('subject-materials-main-view');
        const initMatEdit = document.getElementById('subject-material-editor-view');
        const initMatDetail = document.getElementById('subject-material-detail-view');

        if (initTopicMain) { initTopicMain.classList.remove('hidden'); initTopicMain.style.removeProperty('display'); }
        if (initTopicEdit) { initTopicEdit.classList.add('hidden'); initTopicEdit.style.setProperty('display', 'none', 'important'); }
        if (initMatMain) { initMatMain.classList.remove('hidden'); initMatMain.style.removeProperty('display'); }
        if (initMatEdit) { initMatEdit.classList.add('hidden'); initMatEdit.style.setProperty('display', 'none', 'important'); }
        if (initMatDetail) { initMatDetail.classList.add('hidden'); initMatDetail.style.setProperty('display', 'none', 'important'); }
        document.getElementById('topic-editor-back-btn')?.classList.add('hidden');
        document.getElementById('topic-editor-add-another-btn')?.classList.add('hidden');
        document.getElementById('topic-editor-delete-btn')?.classList.add('hidden');
        document.getElementById('topic-editor-save-btn')?.classList.add('hidden');
        document.getElementById('mat-editor-back-btn')?.classList.add('hidden');
        document.getElementById('mat-editor-add-another-btn')?.classList.add('hidden');
        document.getElementById('mat-editor-delete-btn')?.classList.add('hidden');
        document.getElementById('mat-detail-back-btn')?.classList.add('hidden');
        document.getElementById('mat-detail-edit-btn')?.classList.add('hidden');
        const initHeaderEditMatBtn = document.getElementById('subject-header-edit-mat-btn');
        if (initHeaderEditMatBtn) {
            initHeaderEditMatBtn.classList.add('hidden');
            initHeaderEditMatBtn.style.setProperty('display', 'none', 'important');
        }
        document.getElementById('quiz-storage-select-btn')?.classList.add('hidden');
        document.getElementById('quiz-storage-preview-btn')?.classList.add('hidden');
        document.getElementById('quiz-storage-copy-btn')?.classList.add('hidden');

        window.currentEditingTopicIndex = -1;
        window.currentEditingMaterialIndex = -1;
        window.expandedSubjectTopicIds = {};

        if (show) {
            document.body.style.overflow = 'hidden';
            window._hasAddedNewTopic = false;
            window._hasEditedExistingTopic = false;
            window._hasAddedNewMaterial = false;
            window._hasEditedExistingMaterial = false;
            window._initialSubjectTopicsCount = (window.currentSubjectTopics || []).length;
            window._initialSubjectMaterialsCount = (window.currentSubjectMaterials || []).length;

            if (subjectData) {
                window.isEditingSubject = true;
                window.currentEditingSubjectStatus = subjectData.status || null;
                window.originalEditingSubjectCode = subjectData.code || window.originalEditingSubjectCode || null;
                window.originalEditingSubjectName = subjectData.name || window.originalEditingSubjectName || null;
                window.originalEditingSubjectId = subjectData.id || window.originalEditingSubjectId || null;
                window.activeCurriculumScope = 'master';
                window.activeCurriculumScopeLabel = 'Master Syllabus';
                if (typeof window.updateCurriculumScopeButtonUi === 'function') {
                    window.updateCurriculumScopeButtonUi();
                }

                const codeInput = document.getElementById('edit-subject-code');
                const nameInput = document.getElementById('edit-subject-name');
                const unitsInput = document.getElementById('edit-subject-units');
                const typeInput = document.getElementById('edit-subject-type');
                const strandInput = document.getElementById('edit-subject-strand');

                if (codeInput) codeInput.value = subjectData.code || '';
                if (nameInput) nameInput.value = subjectData.name || '';
                if (unitsInput) unitsInput.value = subjectData.units || '';
                if (typeInput) typeInput.value = subjectData.type || 'Applied';
                if (strandInput) strandInput.value = subjectData.strand || 'ABM';

                const weightsInput = document.getElementById('edit-subject-weights');
                if (weightsInput) {
                    const existingW = (typeof window.getSubjectGradebookWeights === 'function' ? window.getSubjectGradebookWeights(subjectData.name || subjectData.code) : null) || subjectData.weights;
                    let matchedPreset = existingW?.preset;
                    if (!matchedPreset && existingW) {
                        const ww = Number(existingW.ww);
                        const pt = Number(existingW.pt);
                        const qa = Number(existingW.qa);
                        if (ww === 30 && pt === 50 && qa === 20) matchedPreset = 'tvl-specialized';
                        else if (ww === 20 && pt === 60 && qa === 20) matchedPreset = 'tvl-immersion';
                        else if (ww === 35 && pt === 40 && qa === 25) matchedPreset = 'acad-immersion';
                        else if (ww === 25 && pt === 45 && qa === 30) matchedPreset = 'acad-specialized';
                        else matchedPreset = 'core';
                    }
                    if (!matchedPreset && typeof window.resolveDepEdWeightPreset === 'function') {
                        matchedPreset = window.resolveDepEdWeightPreset(subjectData.name, subjectData.type, subjectData.strand);
                    }
                    weightsInput.value = matchedPreset || 'core';
                    window._userManuallySelectedWeights = Boolean(subjectData.weights);
                    if (typeof window.handleSubjectWeightPresetChange === 'function') {
                        window.handleSubjectWeightPresetChange();
                    }
                }

                const activeQuarters = typeof window.getSubjectActiveQuarters === 'function'
                    ? window.getSubjectActiveQuarters(subjectData.id || subjectData.name, subjectData)
                    : ['q1', 'q2'];
                
                const hasSem1 = activeQuarters.includes('q1') || activeQuarters.includes('q2');
                const hasSem2 = activeQuarters.includes('q3') || activeQuarters.includes('q4');
                const sem1Checkbox = document.getElementById('edit-subject-sem1');
                const sem2Checkbox = document.getElementById('edit-subject-sem2');
                if (sem1Checkbox) sem1Checkbox.checked = hasSem1;
                if (sem2Checkbox) sem2Checkbox.checked = hasSem2;

                ['q1', 'q2', 'q3', 'q4'].forEach(q => {
                    const cb = document.getElementById(`edit-subject-${q}`);
                    if (cb) cb.checked = activeQuarters.includes(q);
                });
                window.currentSubjectTopicQuarter = activeQuarters[0] || 'q1';
                window.currentSubjectMaterialQuarter = activeQuarters[0] || 'q1';

                const isTeacher = isCurrentEditorTeacher();
                const currentUser = getCurrentEditorUser();
                const currentUserId = currentUser ? String(currentUser.id || currentUser.uid || currentUser.username || '') : '';
                const currentUserName = currentUser ? (`${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.name || '') : '';
                const myName = currentUserName.trim().toLowerCase();

                const rawTopics = JSON.parse(JSON.stringify(subjectData.topics || [])).filter(t => !isFakeSampleTopic(t));
                const allProcessedTopics = rawTopics.map((t, idx) => {
                    const tQuarter = t.quarter ? normalizeQuarterKey(t.quarter) : (activeQuarters[0] || 'q1');
                    if (typeof t === 'string') {
                        return {
                            id: `topic-${idx + 1}`,
                            title: t,
                            description: '',
                            image: (window.topicTemplates && window.topicTemplates[idx % window.topicTemplates.length]) || 'image/Topic.jpg',
                            quarter: tQuarter,
                            authorRole: 'Admin',
                            authorName: 'Administrator',
                            authorId: '',
                            timestamp: new Date().toISOString(),
                            isEditing: false
                        };
                    }
                    const tAuthorName = String(t.authorName || t.author || '').toLowerCase();
                    const isTeacherTopic = (t.authorRole && normalizeSubjectAuthorRole(t.authorRole) === 'Teacher') ||
                                           (t.role && normalizeSubjectAuthorRole(t.role) === 'Teacher') ||
                                           Boolean(t.isTeacher) ||
                                           tAuthorName.includes('maria') || tAuthorName.includes('ramos') || tAuthorName.includes('teacher');
                    const tRawRole = isTeacherTopic ? 'Teacher' : (t.isAdmin ? 'Admin' : (t.authorRole || t.role || 'Admin'));
                    return {
                        ...t,
                        id: t.id || `topic-${idx + 1}`,
                        title: t.title || t.name || 'Untitled Topic',
                        description: t.description || '',
                        image: t.image || (window.topicTemplates && window.topicTemplates[idx % window.topicTemplates.length]) || 'image/Topic.jpg',
                        quarter: tQuarter,
                        authorRole: normalizeSubjectAuthorRole(tRawRole),
                        authorName: t.authorName || '',
                        authorId: t.authorId ? String(t.authorId) : '',
                        timestamp: t.timestamp || t.createdAt || t.date || new Date().toISOString(),
                        isEditing: false
                    };
                });

                const rawMaterials = JSON.parse(JSON.stringify(subjectData.materials || [])).filter(m => !isFakeSampleMaterial(m));
                const allProcessedMaterials = rawMaterials.map((m, mIdx) => {
                    let matchedTopic = allProcessedTopics.find(t => String(t.id) === String(m.topicId));
                    if (!matchedTopic && m.topicId) {
                        const cleanNum = String(m.topicId).replace(/[^0-9]/g, '');
                        if (cleanNum) {
                            const numIdx = parseInt(cleanNum, 10);
                            matchedTopic = allProcessedTopics.find((t, idx) => String(t.id) === `topic-${numIdx}` || (idx + 1) === numIdx || idx === numIdx);
                        }
                    }
                    if (!matchedTopic && m.topicTitle) {
                        matchedTopic = allProcessedTopics.find(t => (t.title || '').trim().toLowerCase() === (m.topicTitle || '').trim().toLowerCase());
                    }
                    const assignedTopicId = matchedTopic ? matchedTopic.id : (m.topicId || (allProcessedTopics[0] ? allProcessedTopics[0].id : '_unassigned'));
                    const parentTopic = allProcessedTopics.find(t => String(t.id) === String(assignedTopicId));
                    const mQuarter = m.quarter ? normalizeQuarterKey(m.quarter) : (parentTopic?.quarter ? normalizeQuarterKey(parentTopic.quarter) : (activeQuarters[0] || 'q1'));
                    if (typeof m === 'string') {
                        const fileExt = m.split('.').pop().toLowerCase();
                        const cleanTitle = m.replace(/\.[^/.]+$/, "");
                        let mType = 'Lesson';
                        if (['mp4', 'mkv', 'webm', 'mov'].includes(fileExt)) mType = 'Video';
                        else if (m.toLowerCase().includes('quiz')) mType = 'Quiz';
                        else if (m.toLowerCase().includes('assignment')) mType = 'Assignment';
                        else if (m.toLowerCase().includes('activity')) mType = 'Activity';
                        else if (m.toLowerCase().includes('task') || m.toLowerCase().includes('pt')) mType = 'Performance Task';

                        return {
                            id: `mat-${mIdx + 1}-${Date.now()}`,
                            title: cleanTitle || m,
                            type: mType,
                            fileType: fileExt || 'docx',
                            fileName: m,
                            topicId: assignedTopicId,
                            quarter: mQuarter,
                            authorRole: 'Admin',
                            authorName: 'Administrator',
                            authorId: '',
                            timestamp: new Date().toISOString(),
                            isEditing: false
                        };
                    }
                    const mAuthorName = String(m.authorName || m.author || '').toLowerCase();
                    const isTeacherMat = (m.authorRole && normalizeSubjectAuthorRole(m.authorRole) === 'Teacher') ||
                                         (m.role && normalizeSubjectAuthorRole(m.role) === 'Teacher') ||
                                         Boolean(m.isTeacher) ||
                                         mAuthorName.includes('maria') || mAuthorName.includes('ramos') || mAuthorName.includes('teacher') ||
                                         (parentTopic && normalizeSubjectAuthorRole(parentTopic.authorRole) === 'Teacher');
                    const mRawRole = isTeacherMat ? 'Teacher' : (m.isAdmin ? 'Admin' : (m.authorRole || m.role || 'Admin'));
                    return {
                        ...m,
                        id: m.id || `mat-${mIdx + 1}-${Date.now()}`,
                        title: m.title || m.name || m.fileName || 'Untitled Material',
                        type: m.type || 'Lesson',
                        fileType: m.fileType || (m.fileName ? m.fileName.split('.').pop().toLowerCase() : 'docx'),
                        topicId: assignedTopicId,
                        quarter: mQuarter,
                        authorRole: normalizeSubjectAuthorRole(mRawRole),
                        authorName: m.authorName || '',
                        authorId: m.authorId ? String(m.authorId) : '',
                        timestamp: m.timestamp || new Date().toISOString(),
                        isEditing: false
                    };
                });

                window.currentSubjectAllTopics = allProcessedTopics;
                window.currentSubjectAllMaterials = allProcessedMaterials;
                window.currentSubjectTopics = allProcessedTopics;
                window.currentSubjectMaterials = allProcessedMaterials;

                if (titleEl) {
                    const focus = window.subjectEditorOptions?.focus;
                    titleEl.textContent = (isStandalone || focus === 'content')
                        ? (window.subjectEditorOptions?.title || 'Add/Edit Topics & Materials')
                        : 'Edit Subject';
                }
                if (segmentedHeader) {
                    if (hideBars) {
                        segmentedHeader.classList.add('hidden');
                        segmentedHeader.style.setProperty('display', 'none', 'important');
                    } else {
                        segmentedHeader.classList.remove('hidden');
                        segmentedHeader.style.removeProperty('display');
                    }
                }
            } else {
                window.isEditingSubject = false;
                window.currentEditingSubjectStatus = null;
                window.originalEditingSubjectCode = null;
                window.originalEditingSubjectName = null;
                window.originalEditingSubjectId = null;
                window.currentSubjectTopics = [];
                window.currentSubjectMaterials = [];
                window.currentSubjectAllTopics = [];
                window.currentSubjectAllMaterials = [];
                window.activeCurriculumScope = 'master';
                window.activeCurriculumScopeLabel = 'Master Syllabus';

                const codeInput = document.getElementById('edit-subject-code');
                const nameInput = document.getElementById('edit-subject-name');
                const unitsInput = document.getElementById('edit-subject-units');
                const typeInput = document.getElementById('edit-subject-type');
                const strandInput = document.getElementById('edit-subject-strand');
                if (codeInput) codeInput.value = '';
                if (nameInput) nameInput.value = '';
                if (unitsInput) unitsInput.value = '';
                if (typeInput) typeInput.value = 'Core';
                if (strandInput) strandInput.value = 'STEM';

                const sem1Checkbox = document.getElementById('edit-subject-sem1');
                const sem2Checkbox = document.getElementById('edit-subject-sem2');
                if (sem1Checkbox) sem1Checkbox.checked = true;
                if (sem2Checkbox) sem2Checkbox.checked = false;
                ['q1', 'q2', 'q3', 'q4'].forEach(q => {
                    const cb = document.getElementById(`edit-subject-${q}`);
                    if (cb) cb.checked = false;
                });
                window.currentSubjectTopicQuarter = 'q1';
                window.currentSubjectMaterialQuarter = 'q1';

                if (titleEl) {
                    const focus = window.subjectEditorOptions?.focus;
                    titleEl.textContent = (isStandalone || focus === 'content')
                        ? (window.subjectEditorOptions?.title || 'Add/Edit Topics & Materials')
                        : 'Create Subject';
                }
                if (segmentedHeader) {
                    if (hideBars) {
                        segmentedHeader.classList.add('hidden');
                        segmentedHeader.style.setProperty('display', 'none', 'important');
                    } else {
                        segmentedHeader.classList.remove('hidden');
                        segmentedHeader.style.removeProperty('display');
                    }
                }
            }

            const subjectDeleteBtn = document.getElementById('subject-delete-btn');
            if (subjectDeleteBtn) {
                subjectDeleteBtn.classList.add('hidden');
                subjectDeleteBtn.style.setProperty('display', 'none', 'important');
            }

            const statusBadge = document.getElementById('subject-modal-status-badge');
            if (statusBadge) {
                if (window.isEditingSubject && !isStandalone && !isContentFocus) {
                    const isDraft = (String(window.currentEditingSubjectStatus || '').toLowerCase() === 'draft');
                    statusBadge.className = isDraft
                        ? "text-xs font-bold px-2.5 py-1 rounded-full font-['Inter'] bg-amber-100 text-amber-800 border border-amber-200"
                        : "text-xs font-bold px-2.5 py-1 rounded-full font-['Inter'] bg-emerald-100 text-emerald-800 border border-emerald-200";
                    statusBadge.textContent = isDraft ? 'Draft' : 'Published';
                    statusBadge.classList.remove('hidden');
                } else {
                    statusBadge.classList.add('hidden');
                }
            }

            const isTeacher = isCurrentEditorTeacher();
            let stepToOpen = initialStep || 1;
            if ((isTeacher || isStandalone || hideBars || isCurrentViewOnlyScope()) && stepToOpen === 1) {
                stepToOpen = 3;
            }
            window.currentSubjectStep = stepToOpen;
            window.handleSubjectStep(stepToOpen);
            window.handleSubjectTypeChange();
            window.renderSubjectQuarterTabs?.();
            window.renderSubjectTopics();
            window.renderSubjectMaterials();
            window.originalEditingSubjectState = window.getSubjectFormStateSnapshot ? window.getSubjectFormStateSnapshot() : null;
            window.checkSubjectFormValidity();

            overlay.classList.remove('hidden');
            if (typeof window.pushModalHistoryState === 'function') {
                window.pushModalHistoryState('subject-edit-overlay');
            }
            resetSubjectEditorScrollToTop();
        } else {
            window.stopAllVideos?.();
            document.body.style.overflow = '';
            if (overlay) overlay.classList.add('hidden');
            const closeHeaderEditMatBtn = document.getElementById('subject-header-edit-mat-btn');
            if (closeHeaderEditMatBtn) {
                closeHeaderEditMatBtn.classList.add('hidden');
                closeHeaderEditMatBtn.style.setProperty('display', 'none', 'important');
            }
            window.isEditingSubject = false;
            window.subjectEditorOptions = null;
            window.originalEditingSubjectState = null;

            // Reset form fields to defaults on exit
            const codeInput = document.getElementById('edit-subject-code');
            const nameInput = document.getElementById('edit-subject-name');
            const unitsInput = document.getElementById('edit-subject-units');
            const typeInput = document.getElementById('edit-subject-type');
            const strandInput = document.getElementById('edit-subject-strand');
            if (codeInput) codeInput.value = '';
            if (nameInput) nameInput.value = '';
            if (unitsInput) unitsInput.value = '';
            if (typeInput) typeInput.value = 'Core';
            if (strandInput) strandInput.value = 'ABM';
            window._userManuallySelectedWeights = false;
            const weightsInput = document.getElementById('edit-subject-weights');
            if (weightsInput) weightsInput.value = 'core';
            if (typeof window.handleSubjectWeightPresetChange === 'function') window.handleSubjectWeightPresetChange();
            const sem1Checkbox = document.getElementById('edit-subject-sem1');
            const sem2Checkbox = document.getElementById('edit-subject-sem2');
            if (sem1Checkbox) sem1Checkbox.checked = true;
            if (sem2Checkbox) sem2Checkbox.checked = false;
            ['q1', 'q2', 'q3', 'q4'].forEach(q => {
                const cb = document.getElementById(`edit-subject-${q}`);
                if (cb) cb.checked = (q === 'q1' || q === 'q2');
            });
            window.currentSubjectTopicQuarter = 'q1';
            window.currentSubjectMaterialQuarter = 'q1';
            window.handleSubjectTypeChange?.();
            window.currentSubjectTopics = [];
            window.currentSubjectMaterials = [];
            window.currentSubjectAllTopics = [];
            window.currentSubjectAllMaterials = [];
            window.activeCurriculumScope = 'master';
            window.activeCurriculumScopeLabel = 'Master Syllabus';
            window.expandedSubjectTopicIds = {};
            window.currentSubjectTopics = [];
            window.currentSubjectMaterials = [];
        }
    };

    /**
     * Shared Subject Modal Header Synchronizer
     * Ensures identical header text size, back button behavior, and status badge across main pages and sub-editors
     */
    window.toggleSubjectExitButton = function (show = true) {
        const exitBtns = document.querySelectorAll('#subject-modal-exit-btn, button[onclick*="handleSubjectExit"]');
        exitBtns.forEach(btn => {
            if (show) {
                btn.classList.remove('hidden');
                btn.style.removeProperty('display');
            } else {
                btn.classList.add('hidden');
                btn.style.setProperty('display', 'none', 'important');
            }
        });
    };

    window.syncSubjectModalHeader = function ({
        title = '',
        showBack = false,
        showActions = true,
        showQuizStorageActions = false,
        showStatus = true,
        showExit = undefined
    } = {}) {
        const modalHeader = document.getElementById('subject-modal-header');
        if (modalHeader) {
            modalHeader.classList.remove('hidden');
            modalHeader.style.removeProperty('display');
        }

        const titleEl = document.getElementById('subject-editor-title');
        if (titleEl && title) {
            titleEl.textContent = title;
        }

        const returnBtn = document.getElementById('subject-mobile-return-btn');
        if (returnBtn) {
            returnBtn.onclick = (e) => {
                if (e) {
                    e.preventDefault();
                    e.stopPropagation();
                }
                window.handleSubjectBack();
            };
        }

        const backBtn = document.getElementById('subject-back-btn');
        if (backBtn) {
            backBtn.classList.toggle('hidden', !showBack);
            if (showBack) {
                backBtn.style.removeProperty('display');
            } else {
                backBtn.style.setProperty('display', 'none', 'important');
            }
            backBtn.onclick = () => window.handleSubjectBack();
        }

        // Scope back button is deprecated; we use the single unified main back button (#subject-back-btn)
        const scopeBackBtn = document.getElementById('subject-header-scope-back-btn');
        if (scopeBackBtn) {
            scopeBackBtn.classList.add('hidden');
            scopeBackBtn.style.setProperty('display', 'none', 'important');
        }

        const headerActions = document.getElementById('subject-header-actions');
        if (headerActions) {
            headerActions.classList.toggle('hidden', !showActions);
        }

        const headerEditMatBtn = document.getElementById('subject-header-edit-mat-btn');
        if (headerEditMatBtn) {
            headerEditMatBtn.classList.add('hidden');
            headerEditMatBtn.style.setProperty('display', 'none', 'important');
        }

        const quizStorageActions = document.getElementById('quiz-storage-header-actions');
        if (quizStorageActions) {
            quizStorageActions.classList.toggle('hidden', !showQuizStorageActions);
        }

        if (showExit !== undefined) {
            window.toggleSubjectExitButton(Boolean(showExit));
        }

        const statusBadge = document.getElementById('subject-modal-status-badge');
        if (statusBadge) {
            if (showStatus && window.isEditingSubject && !window.subjectEditorOptions?.standalone) {
                const isDraft = (String(window.currentEditingSubjectStatus || '').toLowerCase() === 'draft');
                statusBadge.className = isDraft
                    ? "text-xs font-bold px-2.5 py-1 rounded-full font-['Inter'] bg-amber-100 text-amber-800 border border-amber-200"
                    : "text-xs font-bold px-2.5 py-1 rounded-full font-['Inter'] bg-emerald-100 text-emerald-800 border border-emerald-200";
                statusBadge.textContent = isDraft ? 'Draft' : 'Published';
                statusBadge.classList.remove('hidden');
                statusBadge.style.removeProperty('display');
            } else {
                statusBadge.classList.add('hidden');
                statusBadge.style.setProperty('display', 'none', 'important');
            }
        }
    };

    function ensureSubjectStepBottomButtonsInDom() {
        // Step 2 & Step 3 Previous buttons are removed - return back is handled by the header back button
        const step2Prev = document.getElementById('subject-step2-prev-btn');
        if (step2Prev) {
            step2Prev.remove();
        }
        const step3Actions = document.getElementById('subject-step3-bottom-actions');
        if (step3Actions) {
            step3Actions.remove();
        }
        const step3Prev = document.getElementById('subject-step3-prev-btn');
        if (step3Prev) {
            step3Prev.remove();
        }
    }

    /**
     * Switch steps in the Subject Editor (Step 1, Step 2, Step 3)
     */
    window.handleSubjectStep = function (step) {
        window.stopAllVideos?.();
        if (step < 1 || step > 3) return;
        ensureSubjectStepBottomButtonsInDom();
        const isStandalone = Boolean(window.subjectEditorOptions?.standalone);
        const isTeacher = isCurrentEditorTeacher();
        const isViewOnlyScope = isCurrentViewOnlyScope();
        const hideBars = Boolean(window.subjectEditorOptions?.hideBars) || window.subjectEditorOptions?.focus === 'content' || isStandalone || isTeacher;

        // In view-only mode, teacher mode, standalone content mode, or content focus, step 1 (Edit Subject) is completely inaccessible
        if ((isViewOnlyScope || isTeacher || isStandalone || hideBars) && step === 1) {
            step = 3;
        }

        // Enforce Step 1 validation before advancing to Step 2 or 3 in Create mode
        if (step > 1 && !isStandalone && !window.isEditingSubject && typeof window.isSubjectStep1Valid === 'function' && !window.isSubjectStep1Valid()) {
            window.validateSubjectStep1();
            return;
        }

        window.currentSubjectStep = step;
        resetSubjectEditorScrollToTop();

        // Reset sub-editor views
        const topicMain = document.getElementById('subject-topics-main-view');
        const topicEdit = document.getElementById('subject-topic-editor-view');
        const matMain = document.getElementById('subject-materials-main-view');
        const matEdit = document.getElementById('subject-material-editor-view');
        const matDetail = document.getElementById('subject-material-detail-view');

        if (topicMain) { topicMain.classList.remove('hidden'); topicMain.style.removeProperty('display'); }
        if (topicEdit) { topicEdit.classList.add('hidden'); topicEdit.style.setProperty('display', 'none', 'important'); }
        if (matMain) { matMain.classList.remove('hidden'); matMain.style.removeProperty('display'); }
        if (matEdit) { matEdit.classList.add('hidden'); matEdit.style.setProperty('display', 'none', 'important'); }
        if (matDetail) { matDetail.classList.add('hidden'); matDetail.style.setProperty('display', 'none', 'important'); }

        // Toggle container views
        ['subject-step-1', 'subject-step-2', 'subject-step-3'].forEach((id, idx) => {
            const el = document.getElementById(id);
            if (el) {
                if (idx + 1 === step) {
                    el.classList.remove('hidden');
                    el.style.removeProperty('display');
                } else {
                    el.classList.add('hidden');
                    el.style.removeProperty('display');
                }
            }
        });

        const segmentedHeader = document.getElementById('subject-segmented-header');
        if (segmentedHeader) {
            const showBars = !isTeacher && !isStandalone && !hideBars && !isViewOnlyScope;
            if (showBars) {
                segmentedHeader.classList.remove('hidden');
                segmentedHeader.style.removeProperty('display');
            } else {
                segmentedHeader.classList.add('hidden');
                segmentedHeader.style.setProperty('display', 'none', 'important');
            }
        }

        // Hide Step 1 ("Edit Subject") tab completely in view-only teacher scope
        const stepBar1 = document.getElementById('subject-step-bar-1');
        if (stepBar1) {
            stepBar1.classList.toggle('hidden', isViewOnlyScope);
        }

        // Determine step title
        let stepTitle = '';
        if (isViewOnlyScope) {
            if (step === 2) stepTitle = 'View Scope Topics';
            else if (step === 3) stepTitle = 'View Scope Materials';
            else stepTitle = 'View Scope';
        } else if ((window.subjectEditorOptions?.focus === 'content') || (step === 3 && window.usesCombinedSubjectContent && window.usesCombinedSubjectContent())) {
            stepTitle = window.subjectEditorOptions?.title || 'Add/Edit Topics & Materials';
        } else if (step === 2) {
            stepTitle = (window.isEditingSubject && !isStandalone) ? 'Edit Topics' : 'Add Topics';
        } else if (step === 3) {
            stepTitle = (window.isEditingSubject && !isStandalone) ? 'Edit Materials' : 'Add Materials';
        } else {
            stepTitle = window.isEditingSubject ? 'Edit Subject' : 'Create Subject';
        }

        // Back button visibility:
        // Topics & Materials uses the exit icon only. View Scope uses the arrow to return to the main form.
        const contentList = window.subjectEditorOptions?.focus === 'content' && step === 3 && !isViewOnlyScope;
        const hideBackBtn = contentList || (!isViewOnlyScope && (step === 1 || ((isTeacher || isStandalone) && step === 2)));
        window.syncSubjectModalHeader({
            title: stepTitle,
            showBack: !hideBackBtn,
            showActions: !isViewOnlyScope,
            showStatus: true,
            showExit: true
        });

        // Update Step Bar labels, active states and tracks
        const barWrap1 = document.getElementById('subject-step-bar-1');
        const barWrap2 = document.getElementById('subject-step-bar-2');
        const barWrap3 = document.getElementById('subject-step-bar-3');
        const bar1Label = document.getElementById('subject-step-bar-1-label');
        const bar2Label = document.getElementById('subject-step-bar-2-label');
        const bar3Label = document.getElementById('subject-step-bar-3-label');
        const track1 = document.getElementById('subject-step-bar-1-track');
        const track2 = document.getElementById('subject-step-bar-2-track');
        const track3 = document.getElementById('subject-step-bar-3-track');

        if (barWrap3) {
            barWrap3.classList.add('hidden');
            barWrap3.style.setProperty('display', 'none', 'important');
        }

        if (bar1Label) bar1Label.textContent = window.isEditingSubject ? 'Edit Subject' : 'Add Subject';
        if (bar2Label) bar2Label.textContent = 'Add Topics & Materials';

        const isContentStep = (step === 2 || step === 3);

        if (barWrap1) {
            barWrap1.style.cursor = 'pointer';
            barWrap1.onclick = () => window.handleSubjectStep(1);
            barWrap1.classList.toggle('bg-[#15803d]/10', !isContentStep);
            barWrap1.classList.toggle('bg-slate-100', isContentStep);
        }
        if (bar1Label && track1) {
            if (!isContentStep) {
                bar1Label.className = 'text-base font-bold capitalize tracking-normal transition-colors text-[#15803d] mb-3';
                track1.className = 'w-full h-1.5 bg-[#15803d] transition-all';
            } else {
                bar1Label.className = 'text-base font-bold capitalize tracking-normal transition-colors text-slate-500 mb-3';
                track1.className = 'w-full h-1.5 bg-slate-200 transition-all';
            }
        }

        if (barWrap2) {
            barWrap2.style.cursor = 'pointer';
            barWrap2.onclick = () => window.handleSubjectStep(window.subjectContentNextStep ? window.subjectContentNextStep() : 3);
            barWrap2.classList.toggle('bg-[#15803d]/10', isContentStep);
            barWrap2.classList.toggle('bg-slate-100', !isContentStep);
        }
        if (bar2Label && track2) {
            if (isContentStep) {
                bar2Label.className = 'text-base font-bold capitalize tracking-normal transition-colors text-[#15803d] mb-3';
                track2.className = 'w-full h-1.5 bg-[#15803d] transition-all';
            } else {
                bar2Label.className = 'text-base font-bold capitalize tracking-normal transition-colors text-slate-500 mb-3';
                track2.className = 'w-full h-1.5 bg-slate-200 transition-all';
            }
        }

        // Update Step 2 & Step 3 Subtitles based on mode
        const step2Subtitle = document.getElementById('subject-step-2-subtitle');
        const step3Subtitle = document.getElementById('subject-step-3-subtitle');
        if (step2Subtitle) {
            step2Subtitle.textContent = window.isEditingSubject ? 'Edit and organize subject topics' : 'Add and organize subject topics';
        }
        if (step3Subtitle) {
            step3Subtitle.textContent = window.isEditingSubject ? 'Edit and organize subject content' : 'Add and organize subject content';
        }

        const subjectDeleteBtn = document.getElementById('subject-delete-btn');
        if (subjectDeleteBtn) {
            subjectDeleteBtn.classList.add('hidden');
            subjectDeleteBtn.style.setProperty('display', 'none', 'important');
        }

        window.setSubjectFooterBackButton(null);

        // Hide sub-editor buttons
        document.getElementById('topic-editor-add-another-btn')?.classList.add('hidden');
        document.getElementById('topic-editor-delete-btn')?.classList.add('hidden');
        document.getElementById('topic-editor-save-btn')?.classList.add('hidden');
        document.getElementById('mat-editor-add-another-btn')?.classList.add('hidden');
        document.getElementById('mat-editor-delete-btn')?.classList.add('hidden');
        document.getElementById('mat-detail-edit-btn')?.classList.add('hidden');
        const stepHeaderEditMatBtn = document.getElementById('subject-header-edit-mat-btn');
        if (stepHeaderEditMatBtn) {
            stepHeaderEditMatBtn.classList.add('hidden');
            stepHeaderEditMatBtn.style.setProperty('display', 'none', 'important');
        }
        document.getElementById('quiz-storage-select-btn')?.classList.add('hidden');
        document.getElementById('quiz-storage-preview-btn')?.classList.add('hidden');
        document.getElementById('quiz-storage-copy-btn')?.classList.add('hidden');

        // Navigation & Action buttons
        const nextBtns = document.querySelectorAll('.subject-next-btn, #subject-next-btn, #subject-step1-next-btn, #subject-step2-next-btn');
        const step2PrevBtn = document.getElementById('subject-step2-prev-btn');
        const addAnotherSubjectBtn = document.getElementById('subject-add-another-btn');
        const saveBtn = document.getElementById('subject-save-btn');
        const splitGroup = document.getElementById('subject-split-btn-group');
        const splitDropdownBtn = document.getElementById('subject-split-dropdown-btn');
        const splitDeleteBtn = document.getElementById('subject-split-delete-btn');
        const saveBtnText = document.getElementById('subject-save-btn-text');
        const draftBtn = document.getElementById('subject-draft-btn');
        const globalFooter = document.getElementById('subject-global-footer');

        // The footer is only shown inside sub-editors (Topic Editor, Material Editor, Quiz Storage)
        if (globalFooter) globalFooter.classList.add('hidden');
        if (step2PrevBtn) step2PrevBtn.classList.add('hidden');
        document.getElementById('subject-step3-bottom-actions')?.remove();
        window.syncSubjectModalFooterVisibility?.();
        const editorFocus = window.subjectEditorOptions?.focus || '';
        nextBtns.forEach(btn => {
            if (editorFocus === 'info' || editorFocus === 'content') {
                btn.classList.add('hidden');
                return;
            }
            if (btn.id === 'subject-step1-next-btn') {
                btn.classList.toggle('hidden', step !== 1);
            } else if (btn.id === 'subject-step2-next-btn') {
                btn.classList.toggle('hidden', step !== 2);
            } else {
                btn.classList.toggle('hidden', step === 3);
            }
        });
        const contentAddTopicBtn = document.getElementById('subject-content-add-topic-btn');
        const contentReorderBtn = document.getElementById('subject-content-reorder-btn');
        if (contentAddTopicBtn || contentReorderBtn) {
            const showAddTopic = window.usesCombinedSubjectContent && window.usesCombinedSubjectContent() && step === 3;
            [contentAddTopicBtn, contentReorderBtn].forEach(function (btn) {
                if (!btn) return;
                btn.classList.toggle('hidden', !showAddTopic);
                btn.style.display = showAddTopic ? 'flex' : 'none';
            });
            if (typeof window.syncTopicReorderLock === 'function') window.syncTopicReorderLock();
        }

        const isPublishedEdit = window.isEditingSubject && String(window.currentEditingSubjectStatus || '').toLowerCase() === 'published';
        const canPublish = typeof window.canCurrentAdminPublishSubject === 'function' ? window.canCurrentAdminPublishSubject() : true;
        const canDel = Boolean(window.isEditingSubject) && !isTeacher && !isViewOnlyScope && canCurrentSubjectEditorDeleteSubject();

        if (isViewOnlyScope || isTeacher || isStandalone || editorFocus === 'content') {
            // View-Only scope, Teacher mode, Standalone, or Topics & Materials:
            // Hide the top-right header save/publish/draft buttons completely.
            // Topics and materials are saved immediately into storage when clicking "Save Topic" / "Save [Material]" in the sub-editor form.
            if (splitGroup) splitGroup.classList.add('hidden');
            if (addAnotherSubjectBtn) addAnotherSubjectBtn.classList.add('hidden');
            if (saveBtn) saveBtn.classList.add('hidden');
            if (draftBtn) draftBtn.classList.add('hidden');
            if (splitDeleteBtn) splitDeleteBtn.classList.add('hidden');
            if (splitDropdownBtn) splitDropdownBtn.classList.add('hidden');
            if (step === 2) {
                window.renderSubjectTopics();
            } else if (step === 3) {
                window.subjectMaterialSearchQuery = '';
                const searchInput = document.getElementById('subject-mat-search');
                if (searchInput) searchInput.value = '';
                window.renderSubjectMaterials();
            }
        } else if (isPublishedEdit) {
            // Editing an existing published subject: "Save Changes" + dropdown with "Save as Draft" + "Delete Subject"
            if (splitGroup) splitGroup.classList.remove('hidden');
            if (addAnotherSubjectBtn) addAnotherSubjectBtn.classList.add('hidden');
            // Show "Save as Draft" in the dropdown so the user can revert to draft
            if (draftBtn) draftBtn.classList.toggle('hidden', !canPublish);
            if (splitDeleteBtn) splitDeleteBtn.classList.toggle('hidden', !canDel);

            const hasDropdown = canPublish || canDel;
            if (splitDropdownBtn) splitDropdownBtn.classList.toggle('hidden', !hasDropdown);

            if (saveBtn) {
                saveBtn.classList.remove('hidden');
                if (hasDropdown) {
                    saveBtn.classList.remove('rounded-xl');
                    saveBtn.classList.add('rounded-l-xl', 'border-r', 'border-white/20');
                } else {
                    saveBtn.classList.remove('!rounded-r-none', 'rounded-l-xl', 'border-r', 'border-white/20');
                    saveBtn.classList.add('rounded-xl');
                }
                if (saveBtnText) saveBtnText.textContent = 'Save Changes';
            }
            if (step === 2) {
                window.renderSubjectTopics();
            } else if (step === 3) {
                window.subjectMaterialSearchQuery = '';
                const searchInput = document.getElementById('subject-mat-search');
                if (searchInput) searchInput.value = '';
                window.renderSubjectMaterials();
            }
        } else {
            // Full Create / Draft Edit mode
            if (splitGroup) splitGroup.classList.remove('hidden');
            if (addAnotherSubjectBtn) {
                addAnotherSubjectBtn.classList.toggle('hidden', Boolean(window.isEditingSubject) || !canPublish);
            }
            if (draftBtn) {
                draftBtn.classList.toggle('hidden', !canPublish);
            }
            if (splitDeleteBtn) {
                splitDeleteBtn.classList.toggle('hidden', !canDel);
            }

            const hasDropdown = canPublish || canDel;
            if (splitDropdownBtn) splitDropdownBtn.classList.toggle('hidden', !hasDropdown);

            if (saveBtn) {
                saveBtn.classList.toggle('hidden', !canPublish);
                if (hasDropdown) {
                    saveBtn.classList.remove('rounded-xl');
                    saveBtn.classList.add('rounded-l-xl', 'border-r', 'border-white/20');
                } else {
                    saveBtn.classList.remove('!rounded-r-none', 'rounded-l-xl', 'border-r', 'border-white/20');
                    saveBtn.classList.add('rounded-xl');
                }
                if (saveBtnText) saveBtnText.textContent = 'Publish';
            }
            if (step === 2) {
                window.renderSubjectTopics();
            } else if (step === 3) {
                window.subjectMaterialSearchQuery = '';
                const searchInput = document.getElementById('subject-mat-search');
                if (searchInput) searchInput.value = '';
                window.renderSubjectMaterials();
            }
        }

        window.checkSubjectFormValidity();

        // Update progress bar
        const isContentStepFinal = (step === 2 || step === 3);
        const finalBarWrap1 = document.getElementById('subject-step-bar-1');
        const finalBarWrap2 = document.getElementById('subject-step-bar-2');
        const finalBarWrap3 = document.getElementById('subject-step-bar-3');
        const finalLabel1 = document.getElementById('subject-step-bar-1-label');
        const finalLabel2 = document.getElementById('subject-step-bar-2-label');
        const finalTrack1 = document.getElementById('subject-step-bar-1-track');
        const finalTrack2 = document.getElementById('subject-step-bar-2-track');

        if (finalBarWrap3) {
            finalBarWrap3.classList.add('hidden');
            finalBarWrap3.style.setProperty('display', 'none', 'important');
        }
        if (finalBarWrap1) {
            finalBarWrap1.classList.toggle('bg-[#15803d]/10', !isContentStepFinal);
            finalBarWrap1.classList.toggle('bg-slate-100', isContentStepFinal);
        }
        if (finalLabel1 && finalTrack1) {
            if (!isContentStepFinal) {
                finalLabel1.className = 'text-base font-bold capitalize tracking-normal transition-colors text-[#15803d] mb-3';
                finalTrack1.className = 'w-full h-1.5 bg-[#15803d] transition-all';
            } else {
                finalLabel1.className = 'text-base font-bold capitalize tracking-normal transition-colors text-slate-500 mb-3';
                finalTrack1.className = 'w-full h-1.5 bg-slate-200 transition-all';
            }
        }
        if (finalBarWrap2) {
            finalBarWrap2.classList.toggle('bg-[#15803d]/10', isContentStepFinal);
            finalBarWrap2.classList.toggle('bg-slate-100', !isContentStepFinal);
        }
        if (finalLabel2 && finalTrack2) {
            if (isContentStepFinal) {
                finalLabel2.className = 'text-base font-bold capitalize tracking-normal transition-colors text-[#15803d] mb-3';
                finalTrack2.className = 'w-full h-1.5 bg-[#15803d] transition-all';
            } else {
                finalLabel2.className = 'text-base font-bold capitalize tracking-normal transition-colors text-slate-500 mb-3';
                finalTrack2.className = 'w-full h-1.5 bg-slate-200 transition-all';
            }
        }
    };

    window.setSubjectFooterBackButton = function (activeBtnId) {
        const allBackBtnIds = [
            'topic-editor-back-btn',
            'mat-editor-back-btn',
            'mat-detail-back-btn'
        ];
        allBackBtnIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                if (id === activeBtnId) {
                    el.classList.remove('hidden');
                    el.style.removeProperty('display');
                } else {
                    el.classList.add('hidden');
                    el.style.setProperty('display', 'none', 'important');
                }
            }
        });
        const globalFooter = document.getElementById('subject-global-footer');
        if (globalFooter) {
            globalFooter.classList.toggle('hidden', !activeBtnId);
        }
        window.syncSubjectModalFooterVisibility?.();
    };

    window.syncSubjectModalFooterVisibility = function () {
        const footer = document.getElementById('subject-modal-footer');
        if (!footer) return;
        const globalFooter = document.getElementById('subject-global-footer');
        const isGlobalFooterVisible = globalFooter && !globalFooter.classList.contains('hidden');
        const isStandalone = Boolean(window.subjectEditorOptions?.standalone);
        const isTeacher = isCurrentEditorTeacher();
        const isViewOnlyScope = isCurrentViewOnlyScope();
        const editorFocus = window.subjectEditorOptions?.focus || '';
        const step = window.currentSubjectStep || 1;

        const shouldShow = !isGlobalFooterVisible && !isViewOnlyScope && !isTeacher && !isStandalone && editorFocus !== 'info' && editorFocus !== 'content' && (step === 1 || step === 2);

        if (shouldShow) {
            footer.classList.remove('hidden');
            footer.style.removeProperty('display');
        } else {
            footer.classList.add('hidden');
            footer.style.setProperty('display', 'none', 'important');
        }
    };

    window.isSubjectStep1Valid = function () {
        const code = (document.getElementById('edit-subject-code')?.value || '').trim();
        const name = (document.getElementById('edit-subject-name')?.value || '').trim();
        const units = (document.getElementById('edit-subject-units')?.value || '').trim();
        const type = document.getElementById('edit-subject-type')?.value || 'Core';
        const strand = (document.getElementById('edit-subject-strand')?.value || '').trim();
        const weights = (document.getElementById('edit-subject-weights')?.value || '').trim();
        const activeQuarters = getActiveSubjectQuarters();

        if (!code || !name || !units || !weights) return false;
        if (type === 'Specialized' && !strand) return false;
        if (!activeQuarters || activeQuarters.length < 2) return false;
        return true;
    };

    window.isSubjectStep2Valid = function () {
        return true;
    };

    window.isSubjectStep3Valid = function () {
        return true;
    };

    window.checkSubjectDraftStatus = function () {
        if (typeof window.checkSubjectFormValidity === 'function') {
            window.checkSubjectFormValidity();
        }
    };

    window.checkSubjectFormValidity = function () {
        const nextBtn = document.getElementById('subject-next-btn');
        const draftBtn = document.getElementById('subject-draft-btn');
        const saveBtn = document.getElementById('subject-save-btn');
        const splitDropdownBtn = document.getElementById('subject-split-dropdown-btn');
        const splitDeleteBtn = document.getElementById('subject-split-delete-btn');
        const addAnotherSubjectBtn = document.getElementById('subject-add-another-btn');
        const isStandalone = Boolean(window.subjectEditorOptions?.standalone);
        const isTeacher = isCurrentEditorTeacher();
        const isViewOnlyScope = isCurrentViewOnlyScope();

        window.syncSubjectModalFooterVisibility?.();

        if (isViewOnlyScope || isTeacher || isStandalone || window.subjectEditorOptions?.focus === 'content') {
            // View-Only scope, Teacher mode, Standalone, or Topics & Materials:
            // Save Changes / Publish / Draft buttons are completely hidden.
            if (draftBtn) draftBtn.classList.add('hidden');
            if (saveBtn) saveBtn.classList.add('hidden');
            if (addAnotherSubjectBtn) addAnotherSubjectBtn.classList.add('hidden');
            const splitGroup = document.getElementById('subject-split-btn-group');
            if (splitGroup) splitGroup.classList.add('hidden');
            if (splitDropdownBtn) splitDropdownBtn.classList.add('hidden');
            if (splitDeleteBtn) splitDeleteBtn.classList.add('hidden');
            const allNextBtns = document.querySelectorAll('.subject-next-btn, #subject-next-btn, #subject-step1-next-btn, #subject-step2-next-btn');
            allNextBtns.forEach(btn => {
                const focus = window.subjectEditorOptions?.focus;
                if (focus === 'info' || focus === 'content') {
                    btn.classList.add('hidden');
                    return;
                }
                if (btn.id === 'subject-step2-next-btn') {
                    btn.classList.toggle('hidden', window.currentSubjectStep !== 2);
                } else if (btn.id === 'subject-step1-next-btn') {
                    btn.classList.toggle('hidden', window.currentSubjectStep !== 1);
                } else {
                    btn.classList.toggle('hidden', window.currentSubjectStep === 3);
                }
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
                btn.classList.remove('opacity-50', 'cursor-not-allowed');
            });
            const step2PrevBtn = document.getElementById('subject-step2-prev-btn');
            if (step2PrevBtn) {
                step2PrevBtn.classList.add('hidden');
            }
            document.getElementById('subject-step3-bottom-actions')?.remove();
            return;
        }

        // On main form (!isViewOnlyScope):
        const step2PrevBtn = document.getElementById('subject-step2-prev-btn');
        if (step2PrevBtn) step2PrevBtn.classList.add('hidden');
        document.getElementById('subject-step3-bottom-actions')?.remove();

        const nextBtns = document.querySelectorAll('.subject-next-btn, #subject-next-btn');
        const isStep1Valid = window.isSubjectStep1Valid();

        // Dropdown trigger is always accessible and crisp like quiz-creator.html
        if (splitDropdownBtn) {
            splitDropdownBtn.disabled = false;
            splitDropdownBtn.style.opacity = '1';
            splitDropdownBtn.style.cursor = 'pointer';
            splitDropdownBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }

        if (window.currentSubjectStep === 1) {
            nextBtns.forEach(btn => {
                btn.disabled = !isStep1Valid;
                btn.style.opacity = isStep1Valid ? '1' : '0.5';
                btn.style.cursor = isStep1Valid ? 'pointer' : 'not-allowed';
                btn.classList.toggle('opacity-50', !isStep1Valid);
                btn.classList.toggle('cursor-not-allowed', !isStep1Valid);
            });
            if (draftBtn) {
                draftBtn.disabled = !isStep1Valid;
                draftBtn.style.opacity = isStep1Valid ? '1' : '0.5';
                draftBtn.style.cursor = isStep1Valid ? 'pointer' : 'not-allowed';
                draftBtn.classList.toggle('opacity-50', !isStep1Valid);
                draftBtn.classList.toggle('cursor-not-allowed', !isStep1Valid);
            }
            if (saveBtn) {
                if (isStandalone) {
                    const hasChanges = (typeof window.hasSubjectChanges === 'function') ? window.hasSubjectChanges() : true;
                    const canSave = isStep1Valid && hasChanges;
                    saveBtn.disabled = !canSave;
                    saveBtn.style.opacity = canSave ? '1' : '0.5';
                    saveBtn.style.cursor = canSave ? 'pointer' : 'not-allowed';
                    saveBtn.classList.toggle('opacity-50', !canSave);
                    saveBtn.classList.toggle('cursor-not-allowed', !canSave);
                    if (!hasChanges) {
                        saveBtn.setAttribute('title', 'No changes made yet');
                    } else {
                        saveBtn.removeAttribute('title');
                    }
                } else {
                    const isPublishedEdit = window.isEditingSubject && String(window.currentEditingSubjectStatus || '').toLowerCase() === 'published';
                    let canSave = isStep1Valid;
                    if (isPublishedEdit && typeof window.hasSubjectChanges === 'function') {
                        if (!window.hasSubjectChanges()) canSave = false;
                    }
                    saveBtn.disabled = !canSave;
                    saveBtn.style.opacity = canSave ? '1' : '0.5';
                    saveBtn.style.cursor = canSave ? 'pointer' : 'not-allowed';
                    saveBtn.classList.toggle('opacity-50', !canSave);
                    saveBtn.classList.toggle('cursor-not-allowed', !canSave);
                    if (!isStep1Valid) {
                        saveBtn.setAttribute('title', 'Please complete all required fields on Step 1');
                    } else {
                        saveBtn.removeAttribute('title');
                    }
                }
            }
            if (addAnotherSubjectBtn) {
                addAnotherSubjectBtn.disabled = !isStep1Valid;
                addAnotherSubjectBtn.style.opacity = isStep1Valid ? '1' : '0.5';
                addAnotherSubjectBtn.style.cursor = isStep1Valid ? 'pointer' : 'not-allowed';
                addAnotherSubjectBtn.classList.toggle('opacity-50', !isStep1Valid);
                addAnotherSubjectBtn.classList.toggle('cursor-not-allowed', !isStep1Valid);
                if (!isStep1Valid) {
                    addAnotherSubjectBtn.setAttribute('title', 'Please complete all required fields on Step 1');
                } else {
                    addAnotherSubjectBtn.removeAttribute('title');
                }
            }
        } else if (window.currentSubjectStep === 2) {
            nextBtns.forEach(btn => {
                btn.classList.remove('hidden');
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
                btn.classList.remove('opacity-50', 'cursor-not-allowed');
            });
            if (draftBtn) {
                draftBtn.disabled = false;
                draftBtn.style.opacity = '1';
                draftBtn.style.cursor = 'pointer';
                draftBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            }
            if (saveBtn) {
                if (isStandalone) {
                    const hasChanges = (typeof window.hasSubjectChanges === 'function') ? window.hasSubjectChanges() : true;
                    saveBtn.disabled = !hasChanges;
                    saveBtn.style.opacity = hasChanges ? '1' : '0.5';
                    saveBtn.style.cursor = hasChanges ? 'pointer' : 'not-allowed';
                    saveBtn.classList.toggle('opacity-50', !hasChanges);
                    saveBtn.classList.toggle('cursor-not-allowed', !hasChanges);
                    if (!hasChanges) {
                        saveBtn.setAttribute('title', 'No changes made yet');
                    } else {
                        saveBtn.removeAttribute('title');
                    }
                } else {
                    const isPublishedEdit = window.isEditingSubject && String(window.currentEditingSubjectStatus || '').toLowerCase() === 'published';
                    let canSave = true;
                    if (isPublishedEdit && typeof window.hasSubjectChanges === 'function') {
                        if (!window.hasSubjectChanges()) canSave = false;
                    }
                    saveBtn.disabled = !canSave;
                    saveBtn.style.opacity = canSave ? '1' : '0.5';
                    saveBtn.style.cursor = canSave ? 'pointer' : 'not-allowed';
                    saveBtn.classList.toggle('opacity-50', !canSave);
                    saveBtn.classList.toggle('cursor-not-allowed', !canSave);
                    saveBtn.removeAttribute('title');
                }
            }
            if (addAnotherSubjectBtn) {
                addAnotherSubjectBtn.disabled = false;
                addAnotherSubjectBtn.style.opacity = '1';
                addAnotherSubjectBtn.style.cursor = 'pointer';
                addAnotherSubjectBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                addAnotherSubjectBtn.removeAttribute('title');
            }
        } else {
            // Step 3 (Materials): Publish is allowed with 0 materials
            if (saveBtn) {
                const isPublishedEdit = window.isEditingSubject && String(window.currentEditingSubjectStatus || '').toLowerCase() === 'published';
                const saveBtnText = document.getElementById('subject-save-btn-text');
                const isEditSaveBtn = isStandalone || isPublishedEdit || (saveBtnText && saveBtnText.textContent.trim() === 'Save Changes');

                let canSave = true;
                let hasChanges = true;
                if (isEditSaveBtn && typeof window.hasSubjectChanges === 'function') {
                    hasChanges = window.hasSubjectChanges();
                    if (!hasChanges) {
                        canSave = false;
                    }
                }

                saveBtn.disabled = !canSave;
                saveBtn.style.opacity = canSave ? '1' : '0.5';
                saveBtn.style.cursor = canSave ? 'pointer' : 'not-allowed';
                saveBtn.classList.toggle('opacity-50', !canSave);
                saveBtn.classList.toggle('cursor-not-allowed', !canSave);
                if (isEditSaveBtn && !hasChanges) {
                    saveBtn.setAttribute('title', 'No changes made yet');
                } else {
                    saveBtn.removeAttribute('title');
                }
            }

            if (addAnotherSubjectBtn) {
                addAnotherSubjectBtn.disabled = false;
                addAnotherSubjectBtn.style.opacity = '1';
                addAnotherSubjectBtn.style.cursor = 'pointer';
                addAnotherSubjectBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                addAnotherSubjectBtn.removeAttribute('title');
            }

            if (draftBtn) {
                draftBtn.disabled = false;
                draftBtn.style.opacity = '1';
                draftBtn.style.cursor = 'pointer';
                draftBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                draftBtn.removeAttribute('title');
            }
        }
    };

    window.validateSubjectStep1 = function () {
        const code = (document.getElementById('edit-subject-code')?.value || '').trim();
        const name = (document.getElementById('edit-subject-name')?.value || '').trim();
        const units = (document.getElementById('edit-subject-units')?.value || '').trim();
        const type = document.getElementById('edit-subject-type')?.value || 'Core';
        const strand = (document.getElementById('edit-subject-strand')?.value || '').trim();
        const weights = (document.getElementById('edit-subject-weights')?.value || '').trim();
        const activeQuarters = getActiveSubjectQuarters();

        if (!code) {
            if (typeof window.showToast === 'function') {
                window.showToast('Please provide a Subject Code.');
            } else {
                alert('Please provide a Subject Code.');
            }
            document.getElementById('edit-subject-code')?.focus();
            return false;
        }
        if (!name) {
            if (typeof window.showToast === 'function') {
                window.showToast('Please provide a Subject Name.');
            } else {
                alert('Please provide a Subject Name.');
            }
            document.getElementById('edit-subject-name')?.focus();
            return false;
        }
        if (!units) {
            if (typeof window.showToast === 'function') {
                window.showToast('Please specify the Units.');
            } else {
                alert('Please specify the Units.');
            }
            document.getElementById('edit-subject-units')?.focus();
            return false;
        }
        if (type === 'Specialized' && !strand) {
            if (typeof window.showToast === 'function') {
                window.showToast('Please select a Strand Requirement.');
            } else {
                alert('Please select a Strand Requirement.');
            }
            document.getElementById('edit-subject-strand')?.focus();
            return false;
        }
        if (!weights) {
            if (typeof window.showToast === 'function') {
                window.showToast('Please select the Assessment Weights.');
            } else {
                alert('Please select the Assessment Weights.');
            }
            document.getElementById('edit-subject-weights')?.focus();
            return false;
        }
        if (!activeQuarters || activeQuarters.length < 2) {
            if (typeof window.showToast === 'function') {
                window.showToast('Please select at least 2 active quarters.');
            } else {
                alert('Please select at least 2 active quarters.');
            }
            return false;
        }
        return true;
    };

    window.validateSubjectStep2 = function () {
        return true;
    };

    /**
     * Captures a normalized JSON snapshot of the current subject form state.
     */
    window.getSubjectFormStateSnapshot = function () {
        const topicsList = (Array.isArray(window.currentSubjectAllTopics) && window.currentSubjectAllTopics.length > 0)
            ? window.currentSubjectAllTopics
            : (window.currentSubjectTopics || []);
        const materialsList = (Array.isArray(window.currentSubjectAllMaterials) && window.currentSubjectAllMaterials.length > 0)
            ? window.currentSubjectAllMaterials
            : (window.currentSubjectMaterials || []);

        return JSON.stringify({
            code: (document.getElementById('edit-subject-code')?.value || '').trim(),
            name: (document.getElementById('edit-subject-name')?.value || '').trim(),
            units: (document.getElementById('edit-subject-units')?.value || '').trim(),
            type: document.getElementById('edit-subject-type')?.value || 'Core',
            strand: document.getElementById('edit-subject-strand')?.value || 'ABM',
            activeQuarters: getActiveSubjectQuarters(),
            topics: topicsList.map(t => ({
                id: String(t.id || ''),
                title: (t.title || t.name || '').trim(),
                description: (t.description || '').trim(),
                image: String(t.image || ''),
                quarter: t.quarter || 'q1'
            })),
            materials: materialsList.map(m => ({
                id: String(m.id || ''),
                title: (m.title || m.name || '').trim(),
                type: m.type || 'Lesson',
                topicId: String(m.topicId || ''),
                quarter: m.quarter || 'q1',
                description: (m.description || '').trim(),
                fileName: m.fileName || null,
                fileType: m.fileType || null,
                videoUrl: m.videoUrl || null,
                sourceType: m.sourceType || null,
                quizData: m.quizData || null,
                rubric: m.rubric ? { fileName: m.rubric.fileName } : null
            }))
        });
    };

    /**
     * Checks if the topic editor form currently has unsaved modifications.
     */
    window.hasTopicEditorChanges = function () {
        const topicEditorView = document.getElementById('subject-topic-editor-view');
        if (!topicEditorView || topicEditorView.classList.contains('hidden') || topicEditorView.style.display === 'none') {
            return false;
        }
        const titleInput = document.getElementById('topic-editor-title-input') || document.getElementById('topic-edit-title');
        const descInput = document.getElementById('topic-editor-desc-input') || document.getElementById('topic-edit-desc');
        const quarterSelect = document.getElementById('topic-editor-quarter-select');
        const imageInput = document.getElementById('topic-selected-image');

        const curTitle = (titleInput?.value || '').trim();
        const curDesc = (descInput?.value || '').trim();
        const curQuarter = quarterSelect ? quarterSelect.value : (window.editingTopicState?.quarter || 'q1');
        const curImage = imageInput ? imageInput.value : (window.editingTopicState?.image || 'image/Topic.jpg');

        if (window.editingTopicOriginalState) {
            try {
                const orig = JSON.parse(window.editingTopicOriginalState);
                const origTitle = (orig.title || '').trim();
                const origDesc = (orig.description || '').trim();
                const origQuarter = orig.quarter || 'q1';
                const origImage = orig.image || 'image/Topic.jpg';

                return curTitle !== origTitle || curDesc !== origDesc || curQuarter !== origQuarter || curImage !== origImage;
            } catch (e) {
                return false;
            }
        }
        return Boolean(curTitle || curDesc);
    };

    /**
     * Checks if the material editor form currently has unsaved modifications.
     */
    window.hasMaterialEditorChanges = function () {
        const matEditorView = document.getElementById('subject-material-editor-view');
        if (!matEditorView || matEditorView.classList.contains('hidden') || matEditorView.style.display === 'none') {
            return false;
        }
        const titleInput = document.getElementById('mat-editor-title');
        const descInput = document.getElementById('mat-editor-desc');
        const topicSelect = document.getElementById('mat-topic-id');
        const urlInput = document.getElementById('mat-video-url-input');
        const state = window.editingMaterialState || {};

        const curTitle = (titleInput?.value || state.title || '').trim();
        const curDesc = (descInput?.value || state.description || '').trim();
        const curTopicId = String((topicSelect ? topicSelect.value : (state.topicId || '')) || '');
        const curType = state.type || 'Lesson';
        const curSourceType = state.sourceType || 'embed';
        const curVideoUrl = (urlInput ? urlInput.value : (state.videoUrl || '')).trim();
        const curFileName = state.fileName || '';
        const curFileType = state.fileType || '';
        const curHasRubric = Boolean(state.hasRubric);
        const curRubricFileName = state.rubricFileName || '';
        const curQuizId = state.selectedQuizId || null;

        if (window.editingMaterialOriginalState) {
            try {
                const orig = JSON.parse(window.editingMaterialOriginalState);
                const origTitle = (orig.title || '').trim();
                const origDesc = (orig.description || '').trim();
                const origTopicId = String(orig.topicId || '');
                const origType = orig.type || 'Lesson';
                const origSourceType = orig.sourceType || 'embed';
                const origVideoUrl = (orig.videoUrl || '').trim();
                const origFileName = orig.fileName || '';
                const origFileType = orig.fileType || '';
                const origHasRubric = Boolean(orig.hasRubric);
                const origRubricFileName = orig.rubricFileName || '';
                const origQuizId = orig.selectedQuizId || null;

                return curTitle !== origTitle ||
                    curDesc !== origDesc ||
                    curTopicId !== origTopicId ||
                    curType !== origType ||
                    curSourceType !== origSourceType ||
                    curVideoUrl !== origVideoUrl ||
                    curFileName !== origFileName ||
                    curFileType !== origFileType ||
                    curHasRubric !== origHasRubric ||
                    curRubricFileName !== origRubricFileName ||
                    String(curQuizId || '') !== String(origQuizId || '');
            } catch (e) {
                return false;
            }
        }
        return Boolean(curTitle || curDesc || curFileName || curVideoUrl || curQuizId);
    };

    /**
     * Detects if unsaved changes were made in the subject editor.
     */
    window.hasSubjectChanges = function () {
        // In view-only mode (e.g. Admin inspecting a teacher's section), closing/exiting is pure read-only
        const isTeacher = isCurrentEditorTeacher();
        const isViewOnlyScope = isCurrentViewOnlyScope();
        if (isViewOnlyScope) {
            if (typeof window.hasTopicEditorChanges === 'function' && window.hasTopicEditorChanges()) return true;
            if (typeof window.hasMaterialEditorChanges === 'function' && window.hasMaterialEditorChanges()) return true;
            return false;
        }

        // Standalone mode (Teacher Add Topics / Add Materials) or Teacher mode
        if (window.subjectEditorOptions?.standalone || isTeacher) {
            if (typeof window.hasTopicEditorChanges === 'function' && window.hasTopicEditorChanges()) return true;
            if (typeof window.hasMaterialEditorChanges === 'function' && window.hasMaterialEditorChanges()) return true;
            return false;
        }

        // 1. If topic editor drawer is open and user has entered modifications
        if (typeof window.hasTopicEditorChanges === 'function' && window.hasTopicEditorChanges()) {
            return true;
        }

        // 2. If material editor drawer is open and user has entered modifications
        if (typeof window.hasMaterialEditorChanges === 'function' && window.hasMaterialEditorChanges()) {
            return true;
        }

        // Topics and materials save as soon as their own form is saved.
        // The exit icon should ask only when one of those forms still has unsaved text.
        if (window.subjectEditorOptions?.focus === 'content') {
            return false;
        }

        const currentSnapshot = window.getSubjectFormStateSnapshot();
        if (window.originalEditingSubjectState !== undefined && window.originalEditingSubjectState !== null) {
            return currentSnapshot !== window.originalEditingSubjectState;
        }

        // If creating a brand new subject and initial state wasn't explicitly saved
        const code = (document.getElementById('edit-subject-code')?.value || '').trim();
        const name = (document.getElementById('edit-subject-name')?.value || '').trim();
        const units = (document.getElementById('edit-subject-units')?.value || '').trim();

        return Boolean(code || name || units);
    };

    window.handleSubjectNext = function () {
        if (window.subjectEditorOptions?.focus === 'info' || window.subjectEditorOptions?.focus === 'content') return;
        if (window.currentSubjectStep === 3) return;
        if (window.currentSubjectStep === 1) {
            if (!window.validateSubjectStep1()) return;
            window.handleSubjectStep(window.subjectContentNextStep ? window.subjectContentNextStep() : 2);
        } else if (window.currentSubjectStep === 2) {
            if (!isCurrentViewOnlyScope() && !window.validateSubjectStep2()) return;
            window.handleSubjectStep(3);
        }
    };

    window.handleSubjectStep2Prev = function () {
        if (isCurrentViewOnlyScope()) {
            if (typeof window.returnToMasterSubjectPanel === 'function') {
                window.returnToMasterSubjectPanel();
            } else if (typeof window.selectCurriculumScope === 'function') {
                window.selectCurriculumScope('master', 'Master Syllabus');
            }
        } else {
            window.handleSubjectStep(1);
        }
    };

    window.handleSubjectBack = function () {
        window.stopAllVideos?.();
        const backHeaderEditMatBtn = document.getElementById('subject-header-edit-mat-btn');
        if (backHeaderEditMatBtn) {
            backHeaderEditMatBtn.classList.add('hidden');
            backHeaderEditMatBtn.style.setProperty('display', 'none', 'important');
        }
        const isTeacher = isCurrentEditorTeacher();
        const isViewOnlyScope = isCurrentViewOnlyScope();

        // Check quiz storage picker first
        const quizPickerShell = document.getElementById('quiz-storage-picker-shell') || document.getElementById('quiz-storage-list-container');
        if (quizPickerShell && !quizPickerShell.closest('.hidden')) {
            if (typeof window.handleQuizStorageBack === 'function') {
                window.handleQuizStorageBack();
                return;
            }
        }

        // Check internal sub-views inside Subject Form first
        const topicEdit = document.getElementById('subject-topic-editor-view');
        if (topicEdit && !topicEdit.classList.contains('hidden') && topicEdit.style.display !== 'none') {
            if (typeof window.handleTopicEditorBack === 'function') {
                window.handleTopicEditorBack();
                return;
            }
        }

        const matDetail = document.getElementById('subject-material-detail-view');
        if (matDetail && !matDetail.classList.contains('hidden') && matDetail.style.display !== 'none') {
            if (typeof window.closeSubjectMaterialDetail === 'function') {
                window.closeSubjectMaterialDetail();
                return;
            }
        }

        const matEdit = document.getElementById('subject-material-editor-view');
        if (matEdit && !matEdit.classList.contains('hidden') && matEdit.style.display !== 'none') {
            if (typeof window.cancelMaterialEditor === 'function') {
                window.cancelMaterialEditor();
                return;
            }
        }

        if (isViewOnlyScope) {
            if (typeof window.returnToMasterSubjectPanel === 'function') {
                window.returnToMasterSubjectPanel();
            } else if (typeof window.selectCurriculumScope === 'function') {
                window.selectCurriculumScope('master', 'Master Syllabus');
            }
            return;
        }

        if (window.currentSubjectStep === 3) {
            const backStep = window.subjectContentBackStep ? window.subjectContentBackStep() : 2;
            if (backStep === 'close') {
                window.toggleSubjectOverlay(false);
                return;
            }
            window.handleSubjectStep(backStep);
            return;
        }

        if (window.subjectEditorOptions?.standalone || isTeacher) {
            const onBack = window.subjectEditorOptions?.onBack || window.subjectEditorOptions?.onExit;
            window.originalEditingSubjectState = null;
            window.toggleSubjectOverlay(false);
            if (typeof onBack === 'function') {
                onBack();
            }
            return;
        }

        if (window.currentSubjectStep === 2) {
            window.handleSubjectStep(1);
            return;
        }
        window.handleSubjectExit();
    };

    window.handleSubjectExit = function () {
        const doExit = () => {
            window.stopAllVideos?.();
            const onExit = window.subjectEditorOptions?.onExit || window.subjectEditorOptions?.onBack;
            window.originalEditingSubjectState = null;
            window.toggleSubjectOverlay(false);
            if (typeof onExit === 'function') {
                onExit();
            }
        };

        if (typeof window.hasSubjectChanges === 'function' && window.hasSubjectChanges()) {
            if (typeof window.openAskingPanel === 'function') {
                window.openAskingPanel({
                    title: 'Discard Changes?',
                    desc: 'You have unsaved changes in this subject. Are you sure you want to discard them and leave?',
                    type: 'warning',
                    confirmText: 'Discard',
                    cancelText: 'Stay',
                    showCancel: true,
                    onConfirm: doExit
                });
                return;
            } else if (confirm('You have unsaved changes in this subject. Are you sure you want to discard them and leave?')) {
                doExit();
                return;
            }
            return;
        }

        doExit();
    };

    window.closeSubjectModal = window.handleSubjectExit;

    window.resolveDepEdWeightPreset = function (subjectName, subjectType, strand) {
        const sStr = String(subjectName || '').toLowerCase().trim();
        const sType = String(subjectType || 'Core').trim().toLowerCase();
        const sStrand = String(strand || 'ABM').trim().toUpperCase();

        if (sType === 'core') {
            return 'core';
        }

        // 1. TVL Immersion / Work Immersion / Practicum (20/60/20) - Interface Computer College Caloocan ICT & HE
        if (sStr.includes('immersion') || sStr.includes('practicum') || sStr.includes('culminating') || sStr.includes('ojt')) {
            if (sStrand === 'ICT' || sStrand === 'HE' || sStr.includes('tvl') || sStr.includes('ict') || sStr.includes('he') || (!sStr.includes('acad') && !sStr.includes('research'))) {
                return 'tvl-immersion';
            }
            return 'acad-immersion';
        }

        // 2. Academic Immersion / Research (35/40/25) - DepEd SHS ABM, GAS, HUMSS
        if (
            sStr.includes('research') ||
            sStr.includes('inquiries') ||
            sStr.includes('investigation') ||
            sStr.includes('capstone') ||
            sStr.includes('enterprise simulation')
        ) {
            return 'acad-immersion';
        }

        // 3. TVL Strands (ICT & HE) Applied & Specialized (30/50/20) - Interface Computer College Caloocan
        if (
            sStrand === 'ICT' || sStrand === 'HE' ||
            sStr.includes('programming') || sStr.includes('prog1') || sStr.includes('database') ||
            sStr.includes('web dev') || sStr.includes('webdev') || sStr.includes('computing') ||
            sStr.includes('computer') || sStr.includes('empowerment') || sStr.includes('animation') ||
            sStr.includes('illustration') || sStr.includes('css') || sStr.includes('servicing') ||
            sStr.includes('food') || sStr.includes('beverage') || sStr.includes('cookery') ||
            sStr.includes('bread') || sStr.includes('pastry') || sStr.includes('housekeeping') ||
            sStr.includes('bartending') || sStr.includes('tourism') || sStr.includes('electrical') ||
            sStr.includes('electronics') || sStr.includes('ict') || sStr.includes('tvl')
        ) {
            if (sType === 'specialized' || sType === 'applied' || sType.includes('special') || sType.includes('appl')) {
                return 'tvl-specialized';
            }
        }

        // 4. Academic Strands (ABM, GAS, HUMSS) Applied & Specialized (25/45/30) - Interface Computer College Caloocan
        if (sType === 'specialized' || sType === 'applied' || sType.includes('special') || sType.includes('appl')) {
            if (sStrand === 'ICT' || sStrand === 'HE' ||
                sStr.includes('programming') || sStr.includes('database') || sStr.includes('web') ||
                sStr.includes('computing') || sStr.includes('animation') || sStr.includes('empowerment')) {
                return 'tvl-specialized';
            }
            return 'acad-specialized';
        }

        // 5. Core Subjects (All Strands) (25/50/25) - DepEd SHS / Interface Computer College Caloocan
        return 'core';
    };

    window.syncDepEdWeightsDefault = function (force = false) {
        const type = document.getElementById('edit-subject-type')?.value || 'Core';
        if (type === 'Core') {
            const weightsSelect = document.getElementById('edit-subject-weights');
            if (weightsSelect) weightsSelect.value = 'core';
            window.handleSubjectWeightPresetChange?.();
            return;
        }
        if (!force && window._userManuallySelectedWeights) return;
        const weightsSelect = document.getElementById('edit-subject-weights');
        if (!weightsSelect) return;
        const name = (document.getElementById('edit-subject-name')?.value || '').trim();
        const strand = (document.getElementById('edit-subject-strand')?.value || 'ABM').trim();

        const preset = window.resolveDepEdWeightPreset(name, type, strand);
        weightsSelect.value = preset;
        window.handleSubjectWeightPresetChange?.();
    };

    window.handleSubjectTypeChange = function () {
        const typeSelect = document.getElementById('edit-subject-type');
        const strandContainer = document.getElementById('edit-subject-strand-container');
        if (typeSelect && strandContainer) {
            strandContainer.classList.toggle('hidden', typeSelect.value !== 'Specialized');
        }
        if (typeof window.syncDepEdWeightsDefault === 'function') {
            window.syncDepEdWeightsDefault(true);
        }
        if (typeof window.checkSubjectFormValidity === 'function') {
            window.checkSubjectFormValidity();
        }
    };

    window.handleSubjectWeightPresetChange = function () {
        window._userManuallySelectedWeights = true;
        const sel = document.getElementById('edit-subject-weights');
        const badge = document.getElementById('edit-subject-weights-badge');
        if (!sel || !badge) return;
        const opt = sel.selectedOptions?.[0];
        if (!opt) return;
        const ww = opt.dataset.ww || '25';
        const pt = opt.dataset.pt || '50';
        const qa = opt.dataset.qa || '25';
        badge.textContent = `WW ${ww}% · PT ${pt}% · QA ${qa}%`;
    };

    // ── STEP 2: TOPICS MANAGEMENT ──────────────────────────────────────────

    window.checkTopicValidity = function () {
        const titleInput = document.getElementById('topic-editor-title-input') || document.getElementById('topic-edit-title');
        const saveBtn = document.getElementById('topic-editor-save-btn');
        const title = (titleInput?.value || '').trim();
        const isValid = Boolean(title);

        const isEdit = (typeof window.currentEditingTopicIndex === 'number' && window.currentEditingTopicIndex >= 0);
        let hasChanges = true;
        if (isEdit && window.editingTopicOriginalState) {
            try {
                const orig = JSON.parse(window.editingTopicOriginalState);
                const descInput = document.getElementById('topic-editor-desc-input') || document.getElementById('topic-edit-desc');
                const quarterSelect = document.getElementById('topic-editor-quarter-select');
                const imageInput = document.getElementById('topic-selected-image');

                const curTitle = (titleInput?.value || '').trim();
                const curDesc = (descInput?.value || '').trim();
                const curQuarter = quarterSelect ? quarterSelect.value : (orig.quarter || 'q1');
                const curImage = imageInput ? imageInput.value : orig.image;

                const origTitle = (orig.title || '').trim();
                const origDesc = (orig.description || '').trim();
                const origQuarter = orig.quarter || 'q1';
                const origImage = orig.image;

                if (curTitle === origTitle && curDesc === origDesc && curQuarter === origQuarter && curImage === origImage) {
                    hasChanges = false;
                }
            } catch (e) {
                hasChanges = true;
            }
        }

        const canSave = isValid && (!isEdit || hasChanges);

        if (saveBtn) {
            saveBtn.disabled = !canSave;
            saveBtn.style.opacity = canSave ? '1' : '0.5';
            saveBtn.style.cursor = canSave ? 'pointer' : 'not-allowed';
            saveBtn.classList.toggle('opacity-50', !canSave);
            saveBtn.classList.toggle('cursor-not-allowed', !canSave);
            if (isEdit && !hasChanges) {
                saveBtn.setAttribute('title', 'No changes made yet');
            } else {
                saveBtn.removeAttribute('title');
            }
        }

        const addAnotherBtn = document.getElementById('topic-editor-add-another-btn');
        if (addAnotherBtn) {
            addAnotherBtn.disabled = !isValid;
            addAnotherBtn.style.opacity = isValid ? '1' : '0.5';
            addAnotherBtn.style.cursor = isValid ? 'pointer' : 'not-allowed';
            addAnotherBtn.classList.toggle('opacity-50', !isValid);
            addAnotherBtn.classList.toggle('cursor-not-allowed', !isValid);
        }
    };

    window.renderSubjectTopics = function () {
        const list = document.getElementById('subject-topics-list');
        const empty = document.getElementById('subject-topics-empty');
        if (!list) return;

        let addAnotherWrap = document.getElementById('subject-topics-add-another-container');
        if (!addAnotherWrap && list.parentNode) {
            addAnotherWrap = document.createElement('div');
            addAnotherWrap.id = 'subject-topics-add-another-container';
            addAnotherWrap.className = 'pt-2';
            addAnotherWrap.innerHTML = `
                <button type="button" onclick="window.addSubjectTopic()"
                    class="sigma-add-topic-dashed-btn w-full py-4 rounded-2xl text-sm font-bold capitalize transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 group">
                    <i class="fa-solid fa-plus text-xs group-hover:text-[#FFD000] transition-colors"></i>
                    <span class="group-hover:text-[#FFD000] transition-colors">Add Another Topic</span>
                </button>
            `;
            list.parentNode.insertBefore(addAnotherWrap, list.nextSibling);
        }

        const isTeacher = isCurrentEditorTeacher();
        const currentUser = getCurrentEditorUser();
        const currentUserName = currentUser ? (`${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.name || '') : '';
        const currentUserId = currentUser ? String(currentUser.id || currentUser.uid || currentUser.username || '') : '';
        const myName = currentUserName.trim().toLowerCase();

        // Scope Container Visibility & Label Handling
        const isEdit = Boolean(window.isEditingSubject);
        const isStandalone = Boolean(window.subjectEditorOptions?.standalone);
        const isViewOnlyScope = isCurrentViewOnlyScope();
        const topicScopeContainer = document.getElementById('subject-topic-scope-container');
        if (topicScopeContainer) {
            // Admins can inspect scopes while editing an existing subject, including the standalone content form.
            if (isTeacher || !isEdit) {
                topicScopeContainer.classList.add('hidden');
            } else {
                topicScopeContainer.classList.remove('hidden');
                updateCurriculumScopeButtonUi();
            }
        }

        // Add Topic Header Button Visibility (Hidden in View-Only Scope)
        const addTopicHeaderBtn = document.getElementById('subject-add-topic-header-btn');
        if (addTopicHeaderBtn) {
            if (isViewOnlyScope) {
                addTopicHeaderBtn.classList.add('hidden');
            } else {
                addTopicHeaderBtn.classList.remove('hidden');
            }
        }

        // Determine all available topics
        const rawAll = (window.currentSubjectAllTopics && window.currentSubjectAllTopics.length > 0)
            ? window.currentSubjectAllTopics
            : (window.currentSubjectTopics || []);
        const allTopics = rawAll.filter(t => !isFakeSampleTopic(t));
        window.currentSubjectAllTopics = allTopics;

        let topics = [];
        if (isTeacher) {
            const activeSection = String(
                window.activeSubjectEditorSection
                || (typeof window.currentClassroomSectionName !== 'undefined' && window.currentClassroomSectionName)
                || (typeof currentClassroomSectionName !== 'undefined' && currentClassroomSectionName)
                || (typeof currentTopicState !== 'undefined' ? currentTopicState?.selectedSection : '')
                || (typeof window.currentTopicState !== 'undefined' ? window.currentTopicState?.selectedSection : '')
                || (typeof resolveTeacherActiveSection === 'function' ? resolveTeacherActiveSection() : '')
                || localStorage.getItem('sigma-active-classroom-section')
                || ''
            ).trim().toLowerCase();
            const currentUserId = currentUser ? String(currentUser.id || currentUser.uid || currentUser.username || '').trim().toLowerCase() : '';
            const myFullName = currentUser ? (`${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.name || '').trim().toLowerCase() : '';

            topics = allTopics.filter(t => {
                const rawRole = t.authorRole || t.role || (t.isAdmin ? 'Admin' : (t.isTeacher ? 'Teacher' : 'Admin'));
                const authorRole = normalizeSubjectAuthorRole(rawRole);
                if (authorRole === 'Admin') return true;

                const tSection = String(resolveSubjectItemSection(t)).trim().toLowerCase();
                const tAuthorId = String(t.authorId || t.uid || '').trim().toLowerCase();
                const tAuthorName = String(t.authorName || t.author || '').trim().toLowerCase();

                if (activeSection) {
                    return tSection === activeSection;
                }
                if (isCurrentUserAuthor(t.authorId, t.authorName, 'Teacher')) return true;
                if (tAuthorId && currentUserId && tAuthorId === currentUserId) return true;
                if (tAuthorName && myFullName && (tAuthorName === myFullName || tAuthorName.includes(myFullName) || myFullName.includes(tAuthorName))) return true;

                return false;
            });
        } else {
            const scope = window.activeCurriculumScope || 'master';
            if (scope === 'master') {
                topics = allTopics.filter(t => {
                    const tAuthorName = String(t.authorName || t.author || '').toLowerCase();
                    const isTeacherTopic = (t.authorRole && normalizeSubjectAuthorRole(t.authorRole) === 'Teacher') ||
                                           (t.role && normalizeSubjectAuthorRole(t.role) === 'Teacher') ||
                                           Boolean(t.isTeacher) ||
                                           tAuthorName.includes('maria') || tAuthorName.includes('ramos') || tAuthorName.includes('teacher');
                    const rawRole = isTeacherTopic ? 'Teacher' : (t.isAdmin ? 'Admin' : (t.authorRole || t.role || 'Admin'));
                    return normalizeSubjectAuthorRole(rawRole) === 'Admin';
                });
            } else if (scope === 'all') {
                topics = [...allTopics];
            } else {
                // Teacher scope
                const scopeLabel = String(window.activeCurriculumScopeLabel || '').trim().toLowerCase();
                const cleanTeacherName = scopeLabel.replace(/\s*\(.*?\)\s*/g, '').trim();
                topics = allTopics.filter(t => {
                    const tAuthorName = String(t.authorName || t.author || '').toLowerCase();
                    const isTeacherTopic = (t.authorRole && normalizeSubjectAuthorRole(t.authorRole) === 'Teacher') ||
                                           (t.role && normalizeSubjectAuthorRole(t.role) === 'Teacher') ||
                                           Boolean(t.isTeacher) ||
                                           tAuthorName.includes('maria') || tAuthorName.includes('ramos') || tAuthorName.includes('teacher');
                    const rawRole = isTeacherTopic ? 'Teacher' : (t.isAdmin ? 'Admin' : (t.authorRole || t.role || 'Admin'));
                    const authorRole = normalizeSubjectAuthorRole(rawRole);
                    if (authorRole === 'Admin') return true; // Admin core always pinned
                    if (t.authorId && String(t.authorId) === String(scope)) return true;
                    if (t.authorName) {
                        const tAuthor = t.authorName.trim().toLowerCase();
                        if (cleanTeacherName && (tAuthor === cleanTeacherName || cleanTeacherName.includes(tAuthor) || tAuthor.includes(cleanTeacherName))) return true;
                        if (scopeLabel && (scopeLabel.includes(tAuthor) || tAuthor.includes(scopeLabel))) return true;
                    }
                    return false;
                });
            }
        }

        window.renderSubjectQuarterTabs?.();
        const activeQuarters = getActiveSubjectQuarters();
        const normalizedTopicQ = normalizeQuarterKey(window.currentSubjectTopicQuarter);
        if (!activeQuarters.includes(normalizedTopicQ)) {
            window.currentSubjectTopicQuarter = activeQuarters[0] || 'q1';
        } else {
            window.currentSubjectTopicQuarter = normalizedTopicQ;
        }
        const curQ = normalizeQuarterKey(window.currentSubjectTopicQuarter || activeQuarters[0] || 'q1');

        const filteredTopics = topics.filter(t => {
            const tQ = normalizeQuarterKey(t.quarter || activeQuarters[0] || 'q1');
            return tQ === curQ;
        });

        // Always ensure Admin topics are at the top and Teacher-created topics are below all Admin topics
        const adminTopicsList = filteredTopics.filter(t => {
            const rawRole = t.authorRole || t.role || (t.isAdmin ? 'Admin' : (t.isTeacher ? 'Teacher' : 'Admin'));
            return normalizeSubjectAuthorRole(rawRole) === 'Admin';
        });
        const teacherTopicsList = filteredTopics.filter(t => {
            const rawRole = t.authorRole || t.role || (t.isAdmin ? 'Admin' : (t.isTeacher ? 'Teacher' : 'Admin'));
            return normalizeSubjectAuthorRole(rawRole) === 'Teacher';
        });
        const sortedFilteredTopics = [...adminTopicsList, ...teacherTopicsList];

        window.currentSubjectTopics = sortedFilteredTopics;
        topics = sortedFilteredTopics;

        const step2Title = document.getElementById('subject-step-2-title');
        if (step2Title) {
            step2Title.textContent = window.isEditingSubject ? 'Edit Topics' : 'Add Topics';
        }
        const quarterCountEl = document.getElementById('subject-topics-quarter-count');
        if (quarterCountEl) {
            quarterCountEl.textContent = '';
        }
        const bar2Label = document.getElementById('subject-step-bar-2-label');
        if (bar2Label && !(window.usesCombinedSubjectContent && window.usesCombinedSubjectContent())) {
            bar2Label.textContent = window.isEditingSubject ? 'Edit Topics' : 'Add Topic';
        }

        if (filteredTopics.length === 0) {
            list.innerHTML = '';
            if (empty) {
                empty.innerHTML = `
                    <i class="fa-solid fa-layer-group sigma-empty-icon" aria-hidden="true"></i>
                    <p class="sigma-empty-title">No Topics Added for ${QUARTER_LABELS[curQ] || curQ} Yet</p>
                `;
                empty.classList.remove('hidden');
            }
            if (addAnotherWrap) addAnotherWrap.classList.add('hidden');
            if (typeof window.checkSubjectFormValidity === 'function') {
                window.checkSubjectFormValidity();
            }
            return;
        }

        if (empty) empty.classList.add('hidden');
        if (addAnotherWrap) {
            if (isViewOnlyScope) {
                addAnotherWrap.classList.add('hidden');
            } else {
                addAnotherWrap.classList.remove('hidden');
            }
        }
        if (typeof window.checkSubjectFormValidity === 'function') {
            window.checkSubjectFormValidity();
        }

        // View-Only Teacher Scope: Split Admin Core Topics & Teacher's Added Panel
        if (isViewOnlyScope) {
            const adminTopics = topics.filter(t => {
                const rawRole = t.authorRole || t.role || (t.isAdmin ? 'Admin' : (t.isTeacher ? 'Teacher' : 'Admin'));
                return normalizeSubjectAuthorRole(rawRole) === 'Admin';
            });

            const teacherTopics = topics.filter(t => {
                const rawRole = t.authorRole || t.role || (t.isAdmin ? 'Admin' : (t.isTeacher ? 'Teacher' : 'Admin'));
                return normalizeSubjectAuthorRole(rawRole) === 'Teacher';
            });

            const teacherName = (window.activeCurriculumScopeLabel || 'Teacher').replace(/\s*\(.*?\)\s*/g, '').trim();
            const teacherSection = (window.activeCurriculumScopeLabel || '').match(/\((.*?)\)/)?.[1] || 'Assigned Section';

            let outputHtml = '';

            // 1. Admin Core Topics Section
            outputHtml += `
                <div class="space-y-3.5">
                    <div class="flex items-center justify-between pb-2 border-b border-slate-200/80">
                        <h3 class="text-sm font-bold text-black font-['Inter']">Master Syllabus</h3>
                    </div>
            `;

            if (adminTopics.length === 0) {
                outputHtml += `
                    <div class="p-6 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center text-center">
                        <p class="text-sm font-bold text-black">No Admin Topics</p>
                        <p class="text-xs text-black-fade mt-0.5">No core syllabus topics created yet.</p>
                    </div>
                `;
            } else {
                outputHtml += adminTopics.map((topic, index) => {
                    const rawRole = topic.authorRole || topic.role || (topic.isAdmin ? 'Admin' : (topic.isTeacher ? 'Teacher' : 'Admin'));
                    const authorRole = normalizeSubjectAuthorRole(rawRole);
                    let authorName = topic.authorName || '';
                    if (authorRole === 'Admin') {
                        if (!authorName || authorName.toLowerCase().includes('maria') || authorName.toLowerCase().includes('teacher')) {
                            authorName = getSubjectAdminAuthorName();
                        }
                    } else if (authorRole === 'Teacher') {
                        if (!authorName) {
                            authorName = isTeacher ? (currentUserName || 'Maria Santos Ramos') : 'Teacher';
                        }
                    }
                    const isOwnTopic = isCurrentUserAuthor(topic.authorId, topic.authorName, authorRole);
                    const rawDate = topic.createdAt || topic.createdDate || topic.date || topic.timestamp || (topic.createdTime ? new Date(topic.createdTime).toISOString() : '');
                    const createdDateFormatted = formatMaterialDate(rawDate);

                    return `
                    <div id="topic-item-${topic.id || index}" data-topic-index="${index}" data-id="${topic.id || index}"
                        class="sigma-black-fade-panel select-none relative rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 font-['Inter']">
                        
                        <!-- Left: Number, Cover, Info (No Drag Grip) -->
                        <div class="flex items-center gap-3.5 sm:gap-4 min-w-0 flex-1 select-none">
                            <!-- Topic Number Badge -->
                            <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#15803d] text-white flex items-center justify-center text-xs font-bold shrink-0 font-['Inter'] shadow-xs select-none">
                                ${index + 1}
                            </div>

                            <!-- Thumbnail -->
                            <div class="w-16 h-20 rounded-xl overflow-hidden shrink-0 bg-slate-50 shadow-sm select-none pointer-events-none">
                                <img src="${topic.image || 'image/Topic.jpg'}" class="w-full h-full object-cover select-none pointer-events-none" alt="Topic Cover" draggable="false" onerror="this.onerror=null; this.src='image/Topic.jpg';">
                            </div>

                            <!-- Title & Description & Metadata -->
                            <div class="flex-1 min-w-0 pr-2 select-none">
                                <h4 class="text-base font-bold text-black truncate font-['Inter'] select-none">${_escape(topic.title || 'Untitled Topic')}</h4>
                                <p class="text-xs text-black-fade font-normal line-clamp-1 mt-0.5 break-words font-['Inter'] select-none">${_escape(topic.description || 'No description provided.')}</p>
                                <div class="flex items-center gap-2 text-[11px] font-normal text-black-fade mt-1.5 font-['Inter'] flex-wrap select-none">
                                    <span class="px-1.5 py-0.5 bg-black/5 text-black-fade rounded font-bold text-[10px]">${_escape(authorRole)}</span>
                                    ${authorName ? `
                                        <span class="text-black-fade font-medium">${_escape(authorName)}</span>
                                    ` : ''}
                                    ${isTeacher ? '' : `
                                        <span class="text-black-fade text-[11px] font-normal flex items-center gap-1.5"><i class="fa-regular fa-calendar text-[10px]"></i> ${createdDateFormatted}</span>
                                    `}
                                </div>
                            </div>
                        </div>

                        <!-- Right: Actions -->
                        <div class="flex items-center gap-2 shrink-0"></div>
                    </div>
                    `;
                }).join('');
            }

            outputHtml += `</div>`; // Close admin section

            // 2. Teacher's Added Panel below Admin Topics
            outputHtml += `
                <div class="mt-8 pt-6 border-t border-slate-200/80 space-y-3.5">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-sm shrink-0">
                                <i class="fa-solid fa-chalkboard-user"></i>
                            </div>
                            <div>
                                <h3 class="text-sm font-bold text-black font-['Inter']">${_escape(teacherName)}'s Added Panel</h3>
                                <p class="text-[11px] text-black-fade font-['Inter'] mt-0.5">Custom topics added by this teacher for their section</p>
                            </div>
                        </div>
                        <span class="text-xs font-bold text-black-fade select-none">
                            ${teacherTopics.length} Added ${teacherTopics.length === 1 ? 'Topic' : 'Topics'}
                        </span>
                    </div>
            `;

            if (teacherTopics.length === 0) {
                outputHtml += `
                    <div class="p-6 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center text-center">
                        <div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                            <i class="fa-solid fa-book-open-reader text-lg"></i>
                        </div>
                        <p class="text-xs font-semibold text-slate-700">No Custom Topics Added Yet</p>
                        <p class="text-[11px] text-slate-400 mt-0.5 max-w-sm">This teacher has not added any additional section-specific topics beyond the Admin core syllabus.</p>
                    </div>
                `;
            } else {
                outputHtml += teacherTopics.map((topic, tIdx) => {
                    const rawRole = topic.authorRole || topic.role || (topic.isAdmin ? 'Admin' : (topic.isTeacher ? 'Teacher' : 'Admin'));
                    const authorRole = normalizeSubjectAuthorRole(rawRole);
                    let authorName = topic.authorName || '';
                    if (authorRole === 'Admin') {
                        if (!authorName || authorName.toLowerCase().includes('maria') || authorName.toLowerCase().includes('teacher')) {
                            authorName = getSubjectAdminAuthorName();
                        }
                    } else if (authorRole === 'Teacher') {
                        if (!authorName) {
                            authorName = isTeacher ? (currentUserName || 'Maria Santos Ramos') : 'Teacher';
                        }
                    }
                    const isOwnTopic = isCurrentUserAuthor(topic.authorId, topic.authorName, authorRole);
                    const rawDate = topic.createdAt || topic.createdDate || topic.date || topic.timestamp || (topic.createdTime ? new Date(topic.createdTime).toISOString() : '');
                    const createdDateFormatted = formatMaterialDate(rawDate);
                    const kebabId = `topic-kebab-teacher-${tIdx}`;
                    const tOverallIdx = adminTopics.length + tIdx;

                    return `
                    <div id="topic-item-teacher-${topic.id || tIdx}" data-topic-index="${tOverallIdx}" data-id="${topic.id || tIdx}"
                        class="sigma-black-fade-panel border-amber-200/60 select-none relative rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 font-['Inter'] shadow-2xs">
                        
                        <!-- Left: Number, Cover, Info (No Drag Grip) -->
                        <div class="flex items-center gap-3.5 sm:gap-4 min-w-0 flex-1 select-none">
                            <!-- Topic Number Badge -->
                            <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold shrink-0 font-['Inter'] shadow-xs select-none">
                                +${tIdx + 1}
                            </div>

                            <!-- Thumbnail -->
                            <div class="w-16 h-20 rounded-xl overflow-hidden shrink-0 bg-slate-50 shadow-sm select-none pointer-events-none">
                                <img src="${topic.image || 'image/Topic.jpg'}" class="w-full h-full object-cover select-none pointer-events-none" alt="Topic Cover" draggable="false" onerror="this.onerror=null; this.src='image/Topic.jpg';">
                            </div>

                            <!-- Title & Description & Metadata -->
                            <div class="flex-1 min-w-0 pr-2 select-none">
                                <h4 class="text-base font-bold text-black truncate font-['Inter'] select-none">${_escape(topic.title || 'Untitled Topic')}</h4>
                                <p class="text-xs text-black-fade font-normal line-clamp-1 mt-0.5 break-words font-['Inter'] select-none">${_escape(topic.description || 'No description provided.')}</p>
                                <div class="flex items-center gap-2 text-[11px] font-normal text-black-fade mt-1.5 font-['Inter'] flex-wrap select-none">
                                    <span class="px-1.5 py-0.5 bg-black/5 text-black-fade rounded font-bold text-[10px]">${_escape(authorRole)}</span>
                                    ${authorName ? `
                                        <span class="text-black-fade font-medium">${_escape(authorName)}</span>
                                    ` : ''}
                                    ${isTeacher ? '' : `
                                        <span class="text-black-fade text-[11px] font-normal flex items-center gap-1.5"><i class="fa-regular fa-calendar text-[10px]"></i> ${createdDateFormatted}</span>
                                    `}
                                </div>
                            </div>
                        </div>

                        <!-- Right: Actions Three-Dots Kebab Menu -->
                        <div class="relative shrink-0" onclick="event.stopPropagation()">
                            <button type="button"
                                id="topic-kebab-btn-teacher-${tIdx}"
                                onclick="window.toggleSharedKebabMenu(event, 'topic-kebab-menu-teacher-${tIdx}')"
                                title="Topic Options"
                                class="mat-kebab-btn w-8 h-8 flex items-center justify-center cursor-pointer text-black focus:outline-none bg-transparent">
                                <i class="fa-solid fa-ellipsis-vertical text-base text-black"></i>
                            </button>
                            <!-- Kebab Dropdown Menu -->
                            <div id="topic-kebab-menu-teacher-${tIdx}"
                                class="shared-kebab-menu hidden absolute right-0 top-full mt-1.5 w-36 bg-white border border-slate-200/90 rounded-xl shadow-lg overflow-hidden z-[100] font-['Inter'] p-1 space-y-0.5 animate-in fade-in duration-150">
                                <button type="button" onclick="window.editSubjectTopic(${tOverallIdx})"
                                    class="w-full text-left px-2.5 py-1.5 hover:bg-slate-100 text-xs font-semibold text-black rounded-lg transition-colors flex items-center gap-2 cursor-pointer">
                                    <i class="fa-solid fa-pen text-xs text-black w-3.5 text-center"></i>
                                    <span class="text-black">Edit Topic</span>
                                </button>
                                <button type="button" onclick="window.removeSubjectTopic(${tOverallIdx})"
                                    class="w-full text-left px-2.5 py-1.5 hover:bg-slate-100 text-xs font-semibold text-black rounded-lg transition-colors flex items-center gap-2 cursor-pointer">
                                    <i class="fa-solid fa-trash-can text-xs text-black w-3.5 text-center"></i>
                                    <span class="text-black">Delete Topic</span>
                                </button>
                            </div>
                        </div>
                    </div>
                    `;
                }).join('');
            }

            outputHtml += `</div>`; // Close teacher section

            list.innerHTML = outputHtml;
        } else {
            // Standard Master Syllabus / Editable Scope
            const topicsCardsHtml = topics.map((topic, index) => {
                const rawDate = topic.createdAt || topic.createdDate || topic.date || topic.timestamp || (topic.createdTime ? new Date(topic.createdTime).toISOString() : '');
                const createdDateFormatted = formatMaterialDate(rawDate);
                const rawRole = topic.authorRole || topic.role || (topic.isAdmin ? 'Admin' : (topic.isTeacher ? 'Teacher' : 'Admin'));
                const authorRole = normalizeSubjectAuthorRole(rawRole);
                let authorName = topic.authorName || '';

                if (authorRole === 'Admin') {
                    if (!authorName || authorName.toLowerCase().includes('maria') || authorName.toLowerCase().includes('teacher')) {
                        authorName = getSubjectAdminAuthorName();
                    }
                } else if (authorRole === 'Teacher') {
                    if (!authorName) {
                        authorName = isTeacher ? (currentUserName || 'Maria Santos Ramos') : 'Teacher';
                    }
                }

                const topicAuthorId = topic.authorId ? String(topic.authorId) : '';
                const topicAuthorName = (topic.authorName || '').trim().toLowerCase();
                const myName = currentUserName.trim().toLowerCase();

                const isOwnTopic = isCurrentUserAuthor(topic.authorId, topic.authorName, authorRole);
                const canShowTopicKebab = isTeacher ? (authorRole !== 'Admin' && isOwnTopic) : true;
                const isLockedAdminTopic = isTeacher && authorRole === 'Admin';
                const movableClass = isLockedAdminTopic ? 'is-locked-core-topic' : 'is-movable-topic';
                const dragHandleHtml = isLockedAdminTopic ? '' : `
                    <!-- Reorder Grip Handle -->
                    <div class="topic-drag-handle cursor-grab active:cursor-grabbing text-slate-300 hover:text-black transition-colors p-1 shrink-0 select-none" title="Drag to reorder">
                        <i class="fa-solid fa-grip-vertical text-base pointer-events-none"></i>
                    </div>
                `;

                return `
                <div id="topic-item-${topic.id || index}" data-topic-index="${index}" data-id="${topic.id || index}"
                    class="sigma-black-fade-panel ${movableClass} select-none group relative rounded-2xl p-4 sm:p-5 hover:shadow-2xs transition-all flex items-center justify-between gap-4 font-['Inter']">
                    
                    <!-- Left: Drag Handle, Number, Cover, Info -->
                    <div class="flex items-center gap-3.5 sm:gap-4 min-w-0 flex-1 select-none">
                        ${dragHandleHtml}

                        <!-- Topic Number Badge -->
                        <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#15803d] text-white flex items-center justify-center text-xs font-bold shrink-0 font-['Inter'] shadow-xs select-none">
                            ${index + 1}
                        </div>

                        <!-- Thumbnail -->
                        <div class="w-16 h-20 rounded-xl overflow-hidden shrink-0 bg-slate-50 shadow-sm select-none pointer-events-none">
                            <img src="${topic.image || 'image/Topic.jpg'}" class="w-full h-full object-cover select-none pointer-events-none" alt="Topic Cover" draggable="false" onerror="this.onerror=null; this.src='image/Topic.jpg';">
                        </div>

                        <!-- Title & Description & Metadata -->
                        <div class="flex-1 min-w-0 pr-2 select-none">
                            <h4 class="text-base font-bold text-black truncate font-['Inter'] select-none">${_escape(topic.title || 'Untitled Topic')}</h4>
                            <p class="text-xs text-black-fade font-normal line-clamp-1 mt-0.5 break-words font-['Inter'] select-none">${_escape(topic.description || 'No description provided.')}</p>
                            <div class="flex items-center gap-2 text-[11px] font-normal text-black-fade mt-1.5 font-['Inter'] flex-wrap select-none">
                                <span class="px-1.5 py-0.5 bg-black/5 text-black-fade rounded font-bold text-[10px]">${_escape(authorRole)}</span>
                                ${authorName ? `
                                    <span class="text-black-fade font-medium">${_escape(authorName)}</span>
                                ` : ''}
                                <span class="text-black-fade text-[11px] font-normal flex items-center gap-1.5"><i class="fa-regular fa-calendar text-[10px]"></i> ${createdDateFormatted}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Right: Actions Three-Dots Kebab Menu -->
                    ${canShowTopicKebab ? `
                    <div class="relative shrink-0" onclick="event.stopPropagation()">
                        <button type="button"
                            id="topic-kebab-btn-${index}"
                            onclick="window.toggleSharedKebabMenu(event, 'topic-kebab-menu-${index}')"
                            title="Topic Options"
                            class="mat-kebab-btn w-8 h-8 flex items-center justify-center cursor-pointer text-black focus:outline-none bg-transparent">
                            <i class="fa-solid fa-ellipsis-vertical text-base text-black"></i>
                        </button>
                        <!-- Kebab Dropdown Menu -->
                        <div id="topic-kebab-menu-${index}"
                            class="shared-kebab-menu hidden absolute right-0 top-full mt-1.5 w-36 bg-white border border-slate-200/90 rounded-xl shadow-lg overflow-hidden z-[100] font-['Inter'] p-1 space-y-0.5 animate-in fade-in duration-150">
                            <button type="button" onclick="window.editSubjectTopic(${index})"
                                class="w-full text-left px-2.5 py-1.5 hover:bg-slate-100 text-xs font-semibold text-black rounded-lg transition-colors flex items-center gap-2 cursor-pointer">
                                <i class="fa-solid fa-pen text-xs text-black w-3.5 text-center"></i>
                                <span class="text-black">Edit Topic</span>
                            </button>
                            <button type="button" onclick="window.removeSubjectTopic(${index})"
                                class="w-full text-left px-2.5 py-1.5 hover:bg-slate-100 text-xs font-semibold text-black rounded-lg transition-colors flex items-center gap-2 cursor-pointer">
                                <i class="fa-solid fa-trash-can text-xs text-black w-3.5 text-center"></i>
                                <span class="text-black">Delete Topic</span>
                            </button>
                        </div>
                    </div>
                    ` : ''}
                </div>
                `;
            }).join('');

            list.innerHTML = topicsCardsHtml;
        }

        // Enable Sortable drag & drop if library exists (Disabled in View-Only Scope)
        if (isViewOnlyScope) {
            if (list && list._sortableInstance) {
                list._sortableInstance.destroy();
                list._sortableInstance = null;
            }
        } else if (window.Sortable && list) {
            if (list._sortableInstance) list._sortableInstance.destroy();

            list._sortableInstance = new Sortable(list, {
                animation: 150,
                draggable: '.is-movable-topic',
                handle: '.topic-drag-handle',
                filter: '.is-locked-core-topic, button, a, input, textarea, select, .sigma-btn',
                preventOnFilter: false,
                forceFallback: true,
                fallbackClass: 'sortable-drag',
                fallbackOnBody: true,
                fallbackTolerance: 3,
                scroll: true,
                scrollSensitivity: 100,
                scrollSpeed: 20,
                bubbleScroll: true,
                ghostClass: 'sortable-ghost',
                chosenClass: 'sortable-chosen',
                dragClass: 'sortable-drag',
                onMove: function (evt) {
                    if (evt.related && evt.related.classList.contains('is-locked-core-topic')) {
                        return false;
                    }
                    return true;
                },
                onChoose: function (evt) {
                    if (window.getSelection) {
                        try { window.getSelection().removeAllRanges(); } catch (e) {}
                    }
                    document.body.classList.add('sorting-subject-topics');
                    if (!evt || !evt.item) return;
                    const rect = evt.item.getBoundingClientRect();
                    evt.item.dataset.dragWidth = `${Math.round(rect.width)}`;
                    evt.item.dataset.dragHeight = `${Math.round(rect.height)}`;
                },
                onStart: function (evt) {
                    if (window.getSelection) {
                        try { window.getSelection().removeAllRanges(); } catch (e) {}
                    }
                    document.body.classList.add('sorting-subject-topics');
                    document.body.style.cursor = 'grabbing';
                    const dragEl = document.querySelector('body > .sortable-drag') || evt.clone;
                    if (dragEl) {
                        const width = (evt && evt.item && evt.item.dataset.dragWidth)
                            ? parseInt(evt.item.dataset.dragWidth, 10)
                            : (evt && evt.item ? Math.round(evt.item.getBoundingClientRect().width) : null);
                        const height = (evt && evt.item && evt.item.dataset.dragHeight)
                            ? parseInt(evt.item.dataset.dragHeight, 10)
                            : (evt && evt.item ? Math.round(evt.item.getBoundingClientRect().height) : null);
                        if (width) dragEl.style.width = `${width}px`;
                        if (height) dragEl.style.height = `${height}px`;
                        dragEl.style.transition = 'none';
                        dragEl.style.animation = 'none';
                        dragEl.style.setProperty('opacity', '1', 'important');
                        dragEl.style.setProperty('user-select', 'none', 'important');
                        dragEl.style.setProperty('-webkit-user-select', 'none', 'important');
                    }
                },
                onUnchoose: function () {
                    document.body.classList.remove('sorting-subject-topics');
                    if (window.getSelection) {
                        try { window.getSelection().removeAllRanges(); } catch (e) {}
                    }
                },
                onEnd: function (evt) {
                    document.body.classList.remove('sorting-subject-topics');
                    document.body.style.cursor = '';
                    if (window.getSelection) {
                        try { window.getSelection().removeAllRanges(); } catch (e) {}
                    }
                    if (typeof evt.oldIndex === 'number' && typeof evt.newIndex === 'number' && evt.oldIndex !== evt.newIndex) {
                        const itemElements = Array.from(list.querySelectorAll('.sigma-black-fade-panel'));
                        const newOrderedTopics = [];
                        itemElements.forEach(el => {
                            const topicId = el.dataset.id;
                            const t = window.currentSubjectTopics.find(item => String(item.id) === String(topicId) || (item.title && String(item.title) === String(el.querySelector('h4')?.textContent?.trim())));
                            if (t && !newOrderedTopics.includes(t)) newOrderedTopics.push(t);
                        });

                        if (newOrderedTopics.length === window.currentSubjectTopics.length) {
                            window.currentSubjectTopics = newOrderedTopics;
                        } else if (evt.oldIndex >= 0 && evt.oldIndex < window.currentSubjectTopics.length &&
                            evt.newIndex >= 0 && evt.newIndex < window.currentSubjectTopics.length) {
                            const item = window.currentSubjectTopics.splice(evt.oldIndex, 1)[0];
                            if (item) {
                                window.currentSubjectTopics.splice(evt.newIndex, 0, item);
                            }
                        }

                        // Sync with window.currentSubjectAllTopics
                        if (Array.isArray(window.currentSubjectAllTopics) && window.currentSubjectAllTopics.length > 0) {
                            const isMasterAdmin = !isCurrentEditorTeacher() && (!window.activeCurriculumScope || window.activeCurriculumScope === 'master');
                            if (isMasterAdmin) {
                                const nonAdminTopics = window.currentSubjectAllTopics.filter(t => {
                                    const rawRole = t.authorRole || t.role || (t.isAdmin ? 'Admin' : (t.isTeacher ? 'Teacher' : 'Admin'));
                                    return normalizeSubjectAuthorRole(rawRole) !== 'Admin';
                                });
                                window.currentSubjectAllTopics = [...window.currentSubjectTopics, ...nonAdminTopics];
                            } else {
                                const remaining = window.currentSubjectAllTopics.filter(t => !window.currentSubjectTopics.some(ct => String(ct.id) === String(t.id)));
                                window.currentSubjectAllTopics = [...window.currentSubjectTopics, ...remaining];
                            }
                        } else {
                            window.currentSubjectAllTopics = [...window.currentSubjectTopics];
                        }

                        if (typeof window.syncCurrentSubjectEditorToStorage === 'function') {
                            window.syncCurrentSubjectEditorToStorage();
                        }
                    }
                    window.renderSubjectTopics();
                }
            });
        }

        ensureSubjectStepBottomButtonsInDom();
        if (typeof window.checkSubjectFormValidity === 'function') {
            window.checkSubjectFormValidity();
        }
    };
window.addSubjectTopic = function () {
        window.openTopicEditor(-1);
    };

    window.editSubjectTopic = function (indexOrId) {
        const pools = [window.currentSubjectAllTopics, window.currentSubjectTopics].filter(Array.isArray);
        let topic = null;
        if (typeof indexOrId === 'number' && Array.isArray(window.currentSubjectTopics)) {
            topic = window.currentSubjectTopics[indexOrId] || null;
        }
        if (!topic && indexOrId !== undefined && indexOrId !== null && String(indexOrId) !== '') {
            const id = String(indexOrId);
            for (const list of pools) {
                topic = list.find(t => t && String(t.id) === id) || null;
                if (topic) break;
            }
        }
        if (!topic) return;

        if (!Array.isArray(window.currentSubjectTopics)) window.currentSubjectTopics = [];
        let index = window.currentSubjectTopics.findIndex(t => t && String(t.id) === String(topic.id));
        if (index < 0) {
            window.currentSubjectTopics.push(topic);
            index = window.currentSubjectTopics.length - 1;
        }
        if (!Array.isArray(window.currentSubjectAllTopics)) window.currentSubjectAllTopics = [];
        if (!window.currentSubjectAllTopics.some(t => t && String(t.id) === String(topic.id))) {
            window.currentSubjectAllTopics.push(topic);
        }
        window.openTopicEditor(index);
    };

    window.removeSubjectTopic = function (indexOrId) {
        const lists = [window.currentSubjectTopics, window.currentSubjectAllTopics].filter(Array.isArray);
        let topic = null;
        if (typeof indexOrId === 'number' && Array.isArray(window.currentSubjectTopics)) {
            topic = window.currentSubjectTopics[indexOrId] || null;
        }
        if (!topic && indexOrId !== undefined && indexOrId !== null && String(indexOrId) !== '') {
            const id = String(indexOrId);
            for (const list of lists) {
                topic = list.find(function (item) { return item && String(item.id) === id; }) || null;
                if (topic) break;
            }
        }
        if (!topic) return;
        if (!canCurrentSubjectEditorDeleteTopic(topic)) {
            const denied = {
                title: 'Topic Cannot Be Deleted',
                desc: 'This topic was created by someone else and cannot be deleted from here.',
                confirmText: 'Understood',
                showCancel: false
            };
            if (typeof window.openAskingPanel === 'function') {
                window.openAskingPanel(denied);
            } else if (typeof window.showSigmaDialog === 'function') {
                window.showSigmaDialog({ title: denied.title, desc: denied.desc, confirmText: denied.confirmText, cancelText: null });
            }
            return;
        }
        const topicName = topic?.title ? `"${topic.title}"` : 'this topic';

        // Find any materials attached to this topic
        const allMats = (Array.isArray(window.currentSubjectAllMaterials) && window.currentSubjectAllMaterials.length > 0)
            ? window.currentSubjectAllMaterials
            : (window.currentSubjectMaterials || []);
        const attachedMats = allMats.filter(m => topic && topic.id && String(m.topicId) === String(topic.id));
        const hasMaterials = attachedMats.length > 0;
        const matCount = attachedMats.length;

        const topicId = String(topic.id);
        const doRemove = () => {
            if (Array.isArray(window.currentSubjectTopics)) {
                window.currentSubjectTopics = window.currentSubjectTopics.filter(function (item) {
                    return !item || String(item.id) !== topicId;
                });
            }
            if (Array.isArray(window.currentSubjectAllTopics)) {
                window.currentSubjectAllTopics = window.currentSubjectAllTopics.filter(function (item) {
                    return !item || String(item.id) !== topicId;
                });
            }

            // 2. Cascade delete all materials inside this topic
            if (topic && topic.id) {
                if (Array.isArray(window.currentSubjectMaterials)) {
                    window.currentSubjectMaterials = window.currentSubjectMaterials.filter(m => String(m.topicId) !== String(topic.id));
                }
                if (Array.isArray(window.currentSubjectAllMaterials)) {
                    window.currentSubjectAllMaterials = window.currentSubjectAllMaterials.filter(m => String(m.topicId) !== String(topic.id));
                }
            }

            if (typeof window.syncCurrentSubjectEditorToStorage === 'function') {
                window.syncCurrentSubjectEditorToStorage();
            }

            const topicEditorView = document.getElementById('subject-topic-editor-view');
            if (topicEditorView && !topicEditorView.classList.contains('hidden')) {
                window.handleTopicEditorBack?.();
            }

            window.renderSubjectTopics();
            window.renderSubjectMaterials?.();
        };

        const dialogTitle = hasMaterials ? 'Delete Topic & Contents?' : 'Delete Topic';
        const dialogDesc = hasMaterials
            ? `${topicName} contains ${matCount} material${matCount === 1 ? '' : 's'}. Deleting this topic will also permanently delete all of its attached contents. Are you sure you want to proceed?`
            : `Are you sure you want to delete ${topicName}?`;
        const confirmBtnText = hasMaterials ? 'Delete All' : 'Delete';

        if (typeof window.openAskingPanel === 'function') {
            window.openAskingPanel({
                title: dialogTitle,
                desc: dialogDesc,
                type: 'warning',
                confirmText: confirmBtnText,
                cancelText: 'Cancel',
                showCancel: true,
                onConfirm: doRemove
            });
        } else if (typeof window.showSigmaDialog === 'function') {
            window.showSigmaDialog({
                title: dialogTitle,
                desc: dialogDesc,
                confirmText: confirmBtnText,
                cancelText: 'Cancel',
                isDanger: hasMaterials,
                onConfirm: doRemove
            });
        } else if (typeof window.showDiscardConfirm === 'function') {
            window.showDiscardConfirm({
                title: dialogTitle,
                message: dialogDesc,
                discardText: confirmBtnText,
                cancelText: 'Cancel',
                onDiscard: doRemove
            });
        } else {
            doRemove();
        }
    };

    window.openTopicEditor = function (index = -1) {
        window.currentEditingTopicIndex = index;
        const isEdit = index !== -1;
        const current = isEdit ? window.currentSubjectTopics[index] : null;

        if (isEdit && current) {
            const rawRole = current.authorRole || current.role || (current.isAdmin ? 'Admin' : (current.isTeacher ? 'Teacher' : 'Admin'));
            const authorRole = normalizeSubjectAuthorRole(rawRole);
            const isOwn = isCurrentUserAuthor(current.authorId, current.authorName, authorRole);
            if (!isOwn) {
                if (typeof window.showSigmaDialog === 'function') {
                    window.showSigmaDialog({
                        title: 'Topic Cannot Be Edited',
                        desc: isCurrentEditorTeacher()
                            ? 'This topic was created by Admin / another user and cannot be edited by teachers.'
                            : 'This topic was created by a teacher and cannot be edited from Admin.',
                        confirmText: 'Understood',
                        cancelText: null
                    });
                }
                return;
            }
        }

        const canDelete = isEdit && canCurrentSubjectEditorDeleteTopic(current);

        window.editingTopicState = current 
            ? { ...current }
            : { title: '', description: '', image: (window.topicTemplates && window.topicTemplates[0]) || 'image/Topic.jpg' };
        window.editingTopicOriginalState = JSON.stringify(window.editingTopicState);

        const mainView = document.getElementById('subject-topics-main-view');
        const editorView = document.getElementById('subject-topic-editor-view');
        if (mainView) {
            mainView.classList.add('hidden');
            mainView.style.setProperty('display', 'none', 'important');
        }
        if (editorView) {
            editorView.classList.remove('hidden');
            editorView.style.removeProperty('display');
            editorView.style.display = 'block';
        }
        if (window.usesCombinedSubjectContent && window.usesCombinedSubjectContent()) {
            const step2 = document.getElementById('subject-step-2');
            const step3 = document.getElementById('subject-step-3');
            if (step2) { step2.classList.remove('hidden'); step2.style.removeProperty('display'); }
            if (step3) { step3.classList.add('hidden'); step3.style.removeProperty('display'); }
        }

        // Synchronize unified modal header
        window.syncSubjectModalHeader({
            title: isEdit ? 'Edit Topic' : 'Add Topic',
            showBack: true,
            showActions: false,
            showStatus: false,
            showExit: false
        });

        // Hide wizard footer & sub-editor buttons
        const _modalFooter = document.getElementById('subject-modal-footer');
        if (_modalFooter) {
            _modalFooter.classList.add('hidden');
            _modalFooter.style.setProperty('display', 'none', 'important');
        }
        document.getElementById('subject-draft-btn')?.classList.add('hidden');
        document.getElementById('subject-next-btn')?.classList.add('hidden');
        document.getElementById('subject-save-btn')?.classList.add('hidden');
        document.getElementById('subject-step2-prev-btn')?.classList.add('hidden');
        document.getElementById('subject-step3-bottom-actions')?.classList.add('hidden');

        // Hide material sub-editor buttons
        document.getElementById('mat-editor-add-another-btn')?.classList.add('hidden');
        document.getElementById('mat-editor-delete-btn')?.classList.add('hidden');
        document.getElementById('mat-editor-save-btn')?.classList.add('hidden');
        document.getElementById('mat-detail-edit-btn')?.classList.add('hidden');

        // Show global footer and configure Topic Editor buttons
        window.setSubjectFooterBackButton('topic-editor-back-btn');
        const globalFooter = document.getElementById('subject-global-footer');
        if (globalFooter) {
            globalFooter.classList.remove('hidden');
            globalFooter.style.removeProperty('display');
            globalFooter.style.display = 'flex';
        }

        const topicSaveBtn = document.getElementById('topic-editor-save-btn');
        const topicSaveBtnText = document.getElementById('topic-editor-save-btn-text');
        if (topicSaveBtnText) {
            topicSaveBtnText.textContent = isEdit ? 'Save Changes' : 'Save Topic';
        }
        if (topicSaveBtn) {
            topicSaveBtn.classList.remove('hidden');
            topicSaveBtn.style.removeProperty('display');
            topicSaveBtn.style.display = 'inline-flex';
        }

        const topicAddAnotherBtn = document.getElementById('topic-editor-add-another-btn');
        if (topicAddAnotherBtn) {
            if (!isEdit) {
                topicAddAnotherBtn.classList.remove('hidden');
                topicAddAnotherBtn.style.removeProperty('display');
                topicAddAnotherBtn.style.display = 'inline-flex';
            } else {
                topicAddAnotherBtn.classList.add('hidden');
                topicAddAnotherBtn.style.setProperty('display', 'none', 'important');
            }
        }

        const topicDeleteBtn = document.getElementById('topic-editor-delete-btn');
        if (topicDeleteBtn) {
            if (isEdit && canDelete) {
                topicDeleteBtn.classList.remove('hidden');
                topicDeleteBtn.style.removeProperty('display');
                topicDeleteBtn.style.display = 'inline-flex';
            } else {
                topicDeleteBtn.classList.add('hidden');
                topicDeleteBtn.style.setProperty('display', 'none', 'important');
            }
        }

        if (editorView) {
            const topic = window.editingTopicState;
            editorView.innerHTML = `
                <div class="space-y-6 sm:space-y-8 font-['Inter']">
                    <!-- Form Content -->
                    <div class="flex flex-col md:flex-row gap-6 sm:gap-10 items-start">
                        <!-- Cover Image Section -->
                        <div class="shrink-0 space-y-2.5 w-full md:w-64 flex flex-col items-center md:items-start">
                            <span class="text-sm sm:text-base font-bold text-black capitalize tracking-normal ml-1 block w-full text-left">Cover Image</span>
                            <div class="relative group cursor-pointer w-40 sm:w-48 md:w-full aspect-[3/4] rounded-2xl border-2 border-dashed border-slate-300 hover:border-black flex flex-col items-center justify-center bg-slate-50 transition-all text-center overflow-hidden shadow-xs mx-auto md:mx-0"
                                onclick="window.openTopicEditorImagePicker()">
                                <img id="topic-editor-image-preview" src="${topic.image || 'image/Topic.jpg'}" class="absolute inset-0 w-full h-full object-cover rounded-2xl" alt="Topic Cover" onerror="this.onerror=null; this.src='image/Topic.jpg';">
                                <div class="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-3 text-white text-center z-10">
                                    <div class="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-1.5 shadow-sm">
                                        <i class="fa-solid fa-camera text-base text-white"></i>
                                    </div>
                                    <span class="text-xs font-bold capitalize">Change Cover</span>
                                </div>
                            </div>
                            <button type="button" onclick="window.openTopicEditorImagePicker()" 
                                class="sigma-btn sigma-btn-white w-40 sm:w-48 md:w-full h-8 sm:h-9 px-3 text-xs font-semibold rounded-xl gap-2 cursor-pointer mx-auto md:mx-0 flex items-center justify-center">
                                <i class="fa-solid fa-camera text-black text-xs"></i>
                                <span>Change Cover</span>
                            </button>
                            <input type="hidden" id="topic-selected-image" value="${topic.image || (window.topicTemplates && window.topicTemplates[0]) || 'image/Topic.jpg'}" />
                        </div>

                        <!-- Inputs Section -->
                        <div class="flex-1 space-y-4 sm:space-y-6 w-full pt-0 sm:pt-1">
                            <div class="space-y-1.5 sm:space-y-2">
                                <label for="topic-editor-quarter-select" class="text-xs sm:text-sm font-bold text-black capitalize tracking-normal ml-1">Quarter <span class="text-red-500">*</span></label>
                                <div class="relative">
                                    <select id="topic-editor-quarter-select"
                                        onchange="if (window.editingTopicState) window.editingTopicState.quarter = this.value; window.checkTopicValidity?.();"
                                        class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 sm:px-5 sm:py-3.5 text-xs sm:text-sm font-medium text-black outline-none focus:outline-none focus:ring-0 appearance-none cursor-pointer font-['Inter'] shadow-none">
                                        ${getActiveSubjectQuarters().map(q => `<option value="${q}" ${(topic.quarter || window.currentSubjectTopicQuarter) === q ? 'selected' : ''}>${QUARTER_LABELS[q] || q}</option>`).join('')}
                                    </select>
                                    <i class="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-xs text-black pointer-events-none"></i>
                                </div>
                            </div>

                            <div class="space-y-1.5 sm:space-y-2">
                                <div class="flex items-center justify-between ml-1">
                                    <label for="topic-editor-title-input" class="text-xs sm:text-sm font-bold text-black capitalize tracking-normal">Topic Title <span class="text-red-500">*</span></label>
                                    <span id="topic-editor-title-counter" class="text-[11px] font-bold text-slate-400 uppercase tracking-widest">${(topic.title || '').length} / 100</span>
                                </div>
                                <input type="text" id="topic-editor-title-input"
                                    maxlength="100"
                                    value="${_escape(topic.title || '')}"
                                    oninput="const cnt = document.getElementById('topic-editor-title-counter'); if (cnt) cnt.textContent = this.value.length + ' / 100'; if (window.editingTopicState) window.editingTopicState.title = this.value; window.checkTopicValidity();"
                                    placeholder="e.g. Fundamental Concepts"
                                    class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 sm:px-5 sm:py-3.5 text-xs sm:text-sm font-medium text-black outline-none focus:outline-none focus:ring-0 placeholder:text-black/40 font-['Inter'] shadow-none">
                            </div>

                            <div class="space-y-1.5 sm:space-y-2">
                                <div class="flex items-center justify-between ml-1">
                                    <label for="topic-editor-desc-input" class="text-xs sm:text-sm font-bold text-black capitalize tracking-normal">Description <span class="text-[11px] font-normal text-slate-400 normal-case">(Optional)</span></label>
                                    <span id="topic-editor-desc-counter" class="text-[11px] font-bold text-slate-400 uppercase tracking-widest">${(topic.description || '').length} / 500</span>
                                </div>
                                <textarea id="topic-editor-desc-input"
                                    maxlength="500"
                                    rows="3"
                                    oninput="const cnt = document.getElementById('topic-editor-desc-counter'); if (cnt) cnt.textContent = this.value.length + ' / 500'; if (window.editingTopicState) window.editingTopicState.description = this.value; window.checkTopicValidity();"
                                    placeholder="Enter Topic Description..."
                                    class="sigma-textarea w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 sm:px-5 sm:py-3.5 text-xs sm:text-sm font-medium text-black outline-none focus:outline-none focus:ring-0 placeholder:text-black/40 font-['Inter'] resize-none max-h-36 sm:max-h-48 overflow-y-auto break-words shadow-none">${_escape(topic.description || '')}</textarea>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            window.checkTopicValidity();
            resetSubjectEditorScrollToTop();
            setTimeout(() => {
                const topicTitleEl = document.getElementById('topic-editor-title-input') || document.getElementById('topic-edit-title');
                if (topicTitleEl) {
                    topicTitleEl.focus();
                }
            }, 80);
        }
    };

    window.handleTopicEditorBack = function (skipDirtyCheck) {
        window.stopAllVideos?.();

        const doGoBack = () => {
            const mainView = document.getElementById('subject-topics-main-view');
            const editorView = document.getElementById('subject-topic-editor-view');
            const modalHeader = document.getElementById('subject-modal-header');
            if (mainView) { mainView.classList.remove('hidden'); mainView.style.removeProperty('display'); }
            if (editorView) { editorView.classList.add('hidden'); editorView.style.setProperty('display', 'none', 'important'); }
            if (modalHeader) { modalHeader.classList.remove('hidden'); modalHeader.style.removeProperty('display'); }
            window.handleSubjectStep(window.subjectContentAfterTopicForm ? window.subjectContentAfterTopicForm() : 2);
            resetSubjectEditorScrollToTop();
        };

        if (skipDirtyCheck || window.editingTopicOriginalState === undefined) {
            doGoBack();
            return;
        }

        const titleInput = document.getElementById('topic-editor-title-input') || document.getElementById('topic-edit-title');
        const descInput = document.getElementById('topic-editor-desc-input') || document.getElementById('topic-edit-desc');
        const currentTitle = (titleInput?.value || '').trim();
        const currentDesc = (descInput?.value || '').trim();

        let isDirty = false;
        try {
            const orig = JSON.parse(window.editingTopicOriginalState);
            isDirty = currentTitle !== (orig.title || '').trim() || currentDesc !== (orig.description || '').trim();
        } catch (e) {
            isDirty = Boolean(currentTitle || currentDesc);
        }

        if (isDirty) {
            if (typeof window.openAskingPanel === 'function') {
                window.openAskingPanel({
                    title: 'Discard Changes?',
                    desc: 'You have unsaved changes in this topic. Are you sure you want to go back and discard them?',
                    type: 'warning',
                    confirmText: 'Discard',
                    cancelText: 'Stay',
                    showCancel: true,
                    onConfirm: doGoBack
                });
            } else if (confirm('You have unsaved changes. Discard them and go back?')) {
                doGoBack();
            }
            return;
        }

        doGoBack();
    };

    window.saveTopicFromEditor = function () {
        const titleInput = document.getElementById('topic-editor-title-input') || document.getElementById('topic-edit-title');
        const descInput = document.getElementById('topic-editor-desc-input') || document.getElementById('topic-edit-desc');
        const quarterSelect = document.getElementById('topic-editor-quarter-select');
        const title = (titleInput?.value || '').trim();
        const desc = (descInput?.value || '').trim();
        const image = window.editingTopicState?.image || (window.topicTemplates && window.topicTemplates[0]) || 'image/Topic.jpg';
        const activeQuarters = getActiveSubjectQuarters();
        const topicQuarter = (quarterSelect ? quarterSelect.value : (window.editingTopicState?.quarter || window.currentSubjectTopicQuarter)) || activeQuarters[0] || 'q1';

        if (!title) {
            alert('Please enter a topic title.');
            titleInput?.focus();
            return;
        }

        const currentUser = getCurrentEditorUser();
        const isTeacher = isCurrentEditorTeacher();
        const currentUserName = currentUser ? (`${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.name || '') : '';
        const currentUserId = currentUser ? String(currentUser.id || currentUser.uid || currentUser.username || '') : '';
        let authorRole = isTeacher ? 'Teacher' : 'Admin';
        if (!isTeacher && window.activeCurriculumScope && window.activeCurriculumScope !== 'master' && window.activeCurriculumScope !== 'all') {
            authorRole = 'Teacher';
        }
        const authorName = authorRole === 'Admin' ? getSubjectAdminAuthorName() : (currentUserName || 'Teacher');
        const authorId = authorRole === 'Admin' ? '0000000' : (currentUserId || '');
        const activeSection = window.activeSubjectEditorSection
            || (typeof window.subjectEditorOptions !== 'undefined' && (window.subjectEditorOptions?.section || window.subjectEditorOptions?.selectedSection))
            || (window.currentAdminClassroomSection ? (window.currentAdminClassroomSection.name || window.currentAdminClassroomSection.section) : '')
            || (typeof window.currentClassroomSectionName !== 'undefined' && window.currentClassroomSectionName)
            || (typeof currentClassroomSectionName !== 'undefined' && currentClassroomSectionName)
            || (typeof currentTopicState !== 'undefined' ? currentTopicState?.selectedSection : '')
            || (typeof window.currentTopicState !== 'undefined' ? window.currentTopicState?.selectedSection : '')
            || (authorRole === 'Teacher' ? (typeof resolveTeacherActiveSection === 'function' ? resolveTeacherActiveSection() : localStorage.getItem('sigma-active-classroom-section')) : '')
            || '';

        window.currentSubjectTopics = Array.isArray(window.currentSubjectTopics) ? window.currentSubjectTopics : [];
        window.currentSubjectAllTopics = Array.isArray(window.currentSubjectAllTopics) ? window.currentSubjectAllTopics : [];

        if (window.currentEditingTopicIndex >= 0 && window.currentEditingTopicIndex < window.currentSubjectTopics.length) {
            window._hasEditedExistingTopic = true;
            const currentItem = window.currentSubjectTopics[window.currentEditingTopicIndex];
            const updatedItem = {
                ...currentItem,
                title,
                description: desc,
                image,
                quarter: topicQuarter
            };
            if (!updatedItem.section && activeSection) {
                updatedItem.section = activeSection;
            }
            window.currentSubjectTopics[window.currentEditingTopicIndex] = updatedItem;
            const allIdx = window.currentSubjectAllTopics.findIndex(t => t.id === updatedItem.id || (currentItem && t.id === currentItem.id));
            if (allIdx >= 0) {
                window.currentSubjectAllTopics[allIdx] = updatedItem;
            } else {
                window.currentSubjectAllTopics.push(updatedItem);
            }
        } else {
            window._hasAddedNewTopic = true;
            const newItem = {
                id: window.editingTopicState?.id || `topic-${window.currentSubjectAllTopics.length + 1}-${Date.now()}`,
                title,
                description: desc,
                image,
                quarter: topicQuarter,
                authorId: authorId,
                authorName: authorName,
                authorRole: authorRole,
                section: activeSection,
                timestamp: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                status: 'not-started'
            };

            // Teacher topics are always appended at the bottom (below Admin topics)
            if (authorRole === 'Teacher') {
                window.currentSubjectTopics.push(newItem);
                if (!window.currentSubjectAllTopics.some(t => t.id === newItem.id)) {
                    window.currentSubjectAllTopics.push(newItem);
                }
            } else {
                // Admin topics are placed before teacher topics
                const firstTeacherIdx = window.currentSubjectTopics.findIndex(t => {
                    const r = t.authorRole || t.role || (t.isAdmin ? 'Admin' : (t.isTeacher ? 'Teacher' : 'Admin'));
                    return normalizeSubjectAuthorRole(r) === 'Teacher';
                });
                if (firstTeacherIdx >= 0) {
                    window.currentSubjectTopics.splice(firstTeacherIdx, 0, newItem);
                } else {
                    window.currentSubjectTopics.push(newItem);
                }
                if (!window.currentSubjectAllTopics.some(t => t.id === newItem.id)) {
                    const allFirstTeacherIdx = window.currentSubjectAllTopics.findIndex(t => {
                        const r = t.authorRole || t.role || (t.isAdmin ? 'Admin' : (t.isTeacher ? 'Teacher' : 'Admin'));
                        return normalizeSubjectAuthorRole(r) === 'Teacher';
                    });
                    if (allFirstTeacherIdx >= 0) {
                        window.currentSubjectAllTopics.splice(allFirstTeacherIdx, 0, newItem);
                    } else {
                        window.currentSubjectAllTopics.push(newItem);
                    }
                }
            }
        }

        if (typeof window.syncCurrentSubjectEditorToStorage === 'function') {
            window.syncCurrentSubjectEditorToStorage();
        }

        window.currentSubjectTopicQuarter = topicQuarter;
        window.editingTopicOriginalState = undefined;
        window.handleTopicEditorBack(true);
        window.renderSubjectTopics();
        if (typeof window.checkSubjectFormValidity === 'function') {
            window.checkSubjectFormValidity();
        }
        resetSubjectEditorScrollToTop();
    };

    window.saveAndAddAnotherTopic = function () {
        const titleInput = document.getElementById('topic-editor-title-input') || document.getElementById('topic-edit-title');
        const descInput = document.getElementById('topic-editor-desc-input') || document.getElementById('topic-edit-desc');
        const quarterSelect = document.getElementById('topic-editor-quarter-select');
        const title = (titleInput?.value || '').trim();
        const desc = (descInput?.value || '').trim();
        const image = window.editingTopicState?.image || (window.topicTemplates && window.topicTemplates[0]) || 'image/Topic.jpg';
        const activeQuarters = getActiveSubjectQuarters();
        const topicQuarter = (quarterSelect ? quarterSelect.value : (window.editingTopicState?.quarter || window.currentSubjectTopicQuarter)) || activeQuarters[0] || 'q1';

        if (!title) {
            alert('Please enter a topic title.');
            titleInput?.focus();
            return;
        }

        const currentUser = getCurrentEditorUser();
        const isTeacher = isCurrentEditorTeacher();
        const currentUserName = currentUser ? (`${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.name || '') : '';
        const currentUserId = currentUser ? String(currentUser.id || currentUser.uid || currentUser.username || '') : '';
        let authorRole = isTeacher ? 'Teacher' : 'Admin';
        if (!isTeacher && window.activeCurriculumScope && window.activeCurriculumScope !== 'master' && window.activeCurriculumScope !== 'all') {
            authorRole = 'Teacher';
        }
        const authorName = authorRole === 'Admin' ? getSubjectAdminAuthorName() : (currentUserName || 'Maria Santos Ramos');
        const authorId = authorRole === 'Admin' ? '0000000' : (currentUserId || 'teacher');

        const activeSection = window.activeSubjectEditorSection
            || (typeof window.subjectEditorOptions !== 'undefined' && (window.subjectEditorOptions?.section || window.subjectEditorOptions?.selectedSection))
            || (window.currentAdminClassroomSection ? (window.currentAdminClassroomSection.name || window.currentAdminClassroomSection.section) : '')
            || (typeof window.currentClassroomSectionName !== 'undefined' && window.currentClassroomSectionName)
            || (typeof currentClassroomSectionName !== 'undefined' && currentClassroomSectionName)
            || (typeof currentTopicState !== 'undefined' ? currentTopicState?.selectedSection : '')
            || (typeof window.currentTopicState !== 'undefined' ? window.currentTopicState?.selectedSection : '')
            || (authorRole === 'Teacher' ? (typeof resolveTeacherActiveSection === 'function' ? resolveTeacherActiveSection() : localStorage.getItem('sigma-active-classroom-section')) : '')
            || '';

        window.currentSubjectTopics = Array.isArray(window.currentSubjectTopics) ? window.currentSubjectTopics : [];
        window.currentSubjectAllTopics = Array.isArray(window.currentSubjectAllTopics) ? window.currentSubjectAllTopics : [];

        const newItem = {
            id: `topic-${window.currentSubjectAllTopics.length + 1}-${Date.now()}`,
            title,
            description: desc,
            image,
            quarter: topicQuarter,
            authorId: authorId,
            authorName: authorName,
            authorRole: authorRole,
            section: activeSection,
            timestamp: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            status: 'not-started'
        };

        if (authorRole === 'Teacher') {
            window.currentSubjectTopics.push(newItem);
            if (!window.currentSubjectAllTopics.some(t => t.id === newItem.id)) {
                window.currentSubjectAllTopics.push(newItem);
            }
        } else {
            const firstTeacherIdx = window.currentSubjectTopics.findIndex(t => {
                const r = t.authorRole || t.role || (t.isAdmin ? 'Admin' : (t.isTeacher ? 'Teacher' : 'Admin'));
                return normalizeSubjectAuthorRole(r) === 'Teacher';
            });
            if (firstTeacherIdx >= 0) {
                window.currentSubjectTopics.splice(firstTeacherIdx, 0, newItem);
            } else {
                window.currentSubjectTopics.push(newItem);
            }
            if (!window.currentSubjectAllTopics.some(t => t.id === newItem.id)) {
                const allFirstTeacherIdx = window.currentSubjectAllTopics.findIndex(t => {
                    const r = t.authorRole || t.role || (t.isAdmin ? 'Admin' : (t.isTeacher ? 'Teacher' : 'Admin'));
                    return normalizeSubjectAuthorRole(r) === 'Teacher';
                });
                if (allFirstTeacherIdx >= 0) {
                    window.currentSubjectAllTopics.splice(allFirstTeacherIdx, 0, newItem);
                } else {
                    window.currentSubjectAllTopics.push(newItem);
                }
            }
        }

        if (typeof window.syncCurrentSubjectEditorToStorage === 'function') {
            window.syncCurrentSubjectEditorToStorage();
        }

        window.renderSubjectTopics();
        if (typeof window.checkSubjectFormValidity === 'function') {
            window.checkSubjectFormValidity();
        }
        window.openTopicEditor(-1);
        resetSubjectEditorScrollToTop();
        setTimeout(() => {
            const topicTitleEl = document.getElementById('topic-editor-title-input') || document.getElementById('topic-edit-title');
            if (topicTitleEl) {
                topicTitleEl.focus();
            }
        }, 80);
    };

    window.removeSubjectTopicFromEditor = function () {
        if (window.currentEditingTopicIndex < 0) return;
        const topic = window.currentSubjectTopics[window.currentEditingTopicIndex];
        const topicName = topic?.title ? `"${topic.title}"` : 'this topic';

        // Find any materials attached to this topic
        const allMats = (Array.isArray(window.currentSubjectAllMaterials) && window.currentSubjectAllMaterials.length > 0)
            ? window.currentSubjectAllMaterials
            : (window.currentSubjectMaterials || []);
        const attachedMats = allMats.filter(m => topic && topic.id && String(m.topicId) === String(topic.id));
        const hasMaterials = attachedMats.length > 0;
        const matCount = attachedMats.length;

        const doRemove = () => {
            window.currentSubjectTopics.splice(window.currentEditingTopicIndex, 1);
            if (topic && Array.isArray(window.currentSubjectAllTopics)) {
                const allIdx = window.currentSubjectAllTopics.findIndex(t => t.id === topic.id);
                if (allIdx >= 0) {
                    window.currentSubjectAllTopics.splice(allIdx, 1);
                }
            }

            // Cascade delete all materials inside this topic
            if (topic && topic.id) {
                if (Array.isArray(window.currentSubjectMaterials)) {
                    window.currentSubjectMaterials = window.currentSubjectMaterials.filter(m => String(m.topicId) !== String(topic.id));
                }
                if (Array.isArray(window.currentSubjectAllMaterials)) {
                    window.currentSubjectAllMaterials = window.currentSubjectAllMaterials.filter(m => String(m.topicId) !== String(topic.id));
                }
            }

            if (typeof window.syncCurrentSubjectEditorToStorage === 'function') {
                window.syncCurrentSubjectEditorToStorage();
            }
            window.editingTopicOriginalState = undefined;
            window.handleTopicEditorBack(true);
            window.renderSubjectTopics();
            window.renderSubjectMaterials?.();
        };

        const dialogTitle = hasMaterials ? 'Delete Topic & Contents?' : 'Delete Topic?';
        const dialogDesc = hasMaterials
            ? `${topicName} contains ${matCount} material${matCount === 1 ? '' : 's'}. Deleting this topic will also permanently delete all of its attached contents. Are you sure you want to proceed?`
            : `Are you sure you want to delete ${topicName}?`;
        const confirmBtnText = hasMaterials ? 'Delete All' : 'Delete';

        if (typeof window.openAskingPanel === 'function') {
            window.openAskingPanel({
                title: dialogTitle,
                desc: dialogDesc,
                type: 'warning',
                confirmText: confirmBtnText,
                cancelText: 'Cancel',
                showCancel: true,
                onConfirm: doRemove
            });
        } else if (typeof window.showSigmaDialog === 'function') {
            window.showSigmaDialog({
                title: dialogTitle,
                desc: dialogDesc,
                confirmText: confirmBtnText,
                cancelText: 'Cancel',
                isDanger: hasMaterials,
                onConfirm: doRemove
            });
        } else {
            doRemove();
        }
    };

    // ── TOPIC DESIGN TEMPLATES MODAL ────────────────────────────────────────

    // ── TOPIC DESIGN TEMPLATES MODAL ────────────────────────────────────────

    let currentTopicLightboxSrc = null;
    let currentTopicLightboxIsTrash = false;

    window.openTopicEditorImagePicker = function (initialView = 'active') {
        window.currentTopicPickerView = initialView;
        window.selectedTopicTrashItems.clear();
        
        const activeTemplates = getStoredTopicTemplates();
        window.pendingTopicTemplateSelection = window.editingTopicState?.image || activeTemplates[0] || 'image/Topic.jpg';

        const existing = document.getElementById('topic-image-picker-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6';
        modal.id = 'topic-image-picker-modal';
        modal.style.cssText = 'position: fixed !important; inset: 0 !important; z-index: 100050 !important; display: flex !important; align-items: center !important; justify-content: center !important;';

        window.renderTopicPickerModalContent(modal);
        document.body.appendChild(modal);

        // Global listener to close open 3-dots menus when clicking outside
        const outsideClickListener = function (e) {
            if (!e.target.closest('.topic-options-trigger') && !e.target.closest('.topic-options-menu')) {
                document.querySelectorAll('.topic-options-menu').forEach(m => m.classList.add('hidden'));
                document.querySelectorAll('.topic-template-card').forEach(c => {
                    c.classList.remove('menu-open');
                    c.style.zIndex = '';
                });
            }
        };
        modal.removeEventListener('click', outsideClickListener);
        modal.addEventListener('click', outsideClickListener);
    };

    window.closeTopicEditorImagePicker = function () {
        const modal = document.getElementById('topic-image-picker-modal');
        if (modal) modal.remove();
    };

    window.switchTopicPickerView = function (view) {
        window.currentTopicPickerView = view;
        window.selectedTopicTrashItems.clear();
        const modal = document.getElementById('topic-image-picker-modal');
        if (modal) {
            window.renderTopicPickerModalContent(modal);
        }
    };

    window.selectTopicTemplateForPicker = function (encodedSrc) {
        const src = decodeURIComponent(encodedSrc);
        window.pendingTopicTemplateSelection = src;
        const modal = document.getElementById('topic-image-picker-modal');
        if (modal) {
            window.renderTopicPickerModalContent(modal);
        }
        window.closeTopicCoverLightbox();
    };

    window.applyTopicTemplateSelection = function () {
        const selected = window.pendingTopicTemplateSelection || 'image/Topic.jpg';
        recordRecentTopicTemplate(selected);
        if (window.editingTopicState) {
            window.editingTopicState.image = selected;
        }
        const preview = document.getElementById('topic-editor-image-preview');
        if (preview) preview.src = selected;
        const hiddenInput = document.getElementById('topic-selected-image');
        if (hiddenInput) hiddenInput.value = selected;
        window.closeTopicEditorImagePicker();
        window.closeTopicCoverLightbox();
        if (typeof window.checkTopicValidity === 'function') {
            window.checkTopicValidity();
        }
    };

    window.handleTopicEditorUpload = function (input) {
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = function (e) {
                const uploadedImg = e.target.result;
                let active = getStoredTopicTemplates();
                if (!active.includes(uploadedImg)) {
                    active.unshift(uploadedImg);
                    saveStoredTopicTemplates(active);
                }
                window.selectTopicTemplateForPicker(encodeURIComponent(uploadedImg));
            };
            reader.readAsDataURL(input.files[0]);
        }
    };

    window.renderTopicPickerModalContent = function (modal) {
        const isMaster = typeof window.isCurrentMasterAdmin === 'function' ? window.isCurrentMasterAdmin() : true;
        const activeTemplates = getStoredTopicTemplates();
        const trashedTemplates = getStoredTopicTrash();
        const recentTemplates = getStoredRecentTopicTemplates().slice(0, 3);
        const isTrashView = (window.currentTopicPickerView === 'trash');
        const selectedCover = window.pendingTopicTemplateSelection || activeTemplates[0] || 'image/Topic.jpg';

        if (isTrashView) {
            // TRASH BIN VIEW
            modal.innerHTML = `
                <div class="bg-white rounded-2xl sm:rounded-[24px] shadow-2xl w-full max-w-sm sm:max-w-md md:max-w-xl lg:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col font-['Inter']" onclick="event.stopPropagation()">
                    <!-- Header (Exit icon removed) -->
                    <div class="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-100 flex items-center justify-between shrink-0 gap-2">
                        <div class="min-w-0">
                            <h3 class="text-sm sm:text-base font-bold text-black tracking-tight truncate">Trash Bin - Design Templates</h3>
                            <p class="text-[11px] sm:text-xs font-normal text-black-fade mt-0.5">Manage and restore deleted topic templates</p>
                        </div>
                    </div>

                    <!-- Multi-Selection Action Toolbar -->
                    <div class="px-4 py-2 sm:px-6 sm:py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
                        <div class="flex items-center gap-2">
                            <input type="checkbox" id="topic-trash-select-all" onchange="window.toggleTopicTrashSelectAll(this.checked)"
                                class="w-3.5 h-3.5 sm:w-4 sm:h-4 accent-[#15803d] rounded cursor-pointer">
                            <label for="topic-trash-select-all" class="text-[11px] font-bold text-black cursor-pointer select-none">Select All</label>
                            <span id="topic-trash-selected-count" class="text-[10px] sm:text-[11px] font-medium text-black-fade ml-1">0 selected</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <button type="button" id="topic-trash-restore-bulk-btn" onclick="window.restoreSelectedTopicTrashItems()"
                                disabled class="sigma-btn sigma-btn-white h-7 px-2.5 text-[11px] rounded-lg gap-1.5 opacity-50 cursor-not-allowed">
                                <i class="fa-solid fa-rotate-left text-[10px] text-black"></i>
                                <span>Restore Selected</span>
                            </button>
                            <button type="button" id="topic-trash-delete-bulk-btn" onclick="window.deleteSelectedTopicTrashItemsPermanently()"
                                disabled class="sigma-btn sigma-btn-primary h-7 px-2.5 text-[11px] rounded-lg gap-1.5 opacity-50 cursor-not-allowed">
                                <i class="fa-solid fa-trash-can text-[10px] text-white"></i>
                                <span>Delete Permanently</span>
                            </button>
                        </div>
                    </div>

                    <!-- Trash Grid Content -->
                    <div class="flex-1 overflow-y-auto p-3.5 sm:p-5 custom-scrollbar">
                        ${trashedTemplates.length === 0 ? `
                            <div class="flex flex-col items-center justify-center py-12 sm:py-16 text-center">
                                <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/5 flex items-center justify-center text-black-fade mb-2.5 sm:mb-3">
                                    <i class="fa-solid fa-trash-can text-lg sm:text-xl text-black-fade"></i>
                                </div>
                                <h4 class="text-xs sm:text-sm font-bold text-black">Trash Bin is Empty</h4>
                                <p class="text-[10px] sm:text-[11px] font-normal text-black-fade mt-0.5">Deleted design templates will appear here.</p>
                            </div>
                        ` : `
                            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3.5">
                                ${trashedTemplates.map((item, idx) => {
                                    const src = item.src || item;
                                    const isChecked = window.selectedTopicTrashItems.has(src);
                                    return `
                                        <div class="topic-template-card relative aspect-[3/4] rounded-xl border border-slate-200 bg-white shadow-xs hover:shadow-md transition-all overflow-hidden group">
                                            <!-- Selection Checkbox -->
                                            <div class="absolute top-1.5 left-1.5 z-20" onclick="event.stopPropagation()">
                                                <input type="checkbox" ${isChecked ? 'checked' : ''}
                                                    onchange="window.toggleTopicTrashSelect('${encodeURIComponent(src)}', this.checked)"
                                                    class="w-3.5 h-3.5 sm:w-4 sm:h-4 accent-[#15803d] rounded cursor-pointer shadow-sm">
                                            </div>

                                            <!-- Image Thumbnail: Clicking opens Lightbox -->
                                            <img src="${src}" alt="Trashed template ${idx + 1}"
                                                class="w-full h-full object-cover cursor-pointer select-none"
                                                onclick="window.openTopicCoverLightbox('${encodeURIComponent(src)}', true, event)">

                                            <!-- Three dots options button -->
                                            <button type="button"
                                                class="topic-options-trigger absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-all shadow-md z-20 cursor-pointer"
                                                title="Template options"
                                                onclick="window.toggleTopicCardOptionsMenu('trash-${idx}', event)">
                                                <i class="fa-solid fa-ellipsis-vertical text-[10px]"></i>
                                            </button>

                                            <!-- Options Menu Dropdown -->
                                            <div id="topic-card-menu-trash-${idx}"
                                                class="topic-options-menu hidden"
                                                onclick="event.stopPropagation()">
                                                <button type="button"
                                                    onclick="window.restoreTopicTemplateFromTrash('${encodeURIComponent(src)}')"
                                                    class="topic-options-item">
                                                    <i class="fa-solid fa-rotate-left text-xs text-black w-4 text-center"></i>
                                                    <span>Restore Template</span>
                                                </button>
                                                <div class="h-px bg-slate-100 my-0.5"></div>
                                                <button type="button"
                                                    onclick="window.deleteTopicTemplatePermanently('${encodeURIComponent(src)}')"
                                                    class="topic-options-item danger">
                                                    <i class="fa-solid fa-trash-can text-xs text-red-600 w-4 text-center"></i>
                                                    <span>Delete Permanently</span>
                                                </button>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        `}
                    </div>

                    <!-- Footer -->
                    <div class="px-4 py-2.5 sm:px-6 sm:py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-start shrink-0">
                        <button type="button" onclick="window.switchTopicPickerView('active')" class="sigma-btn sigma-btn-secondary h-8 px-3.5 sm:px-4 text-xs font-semibold rounded-lg cursor-pointer">
                            <span>Back</span>
                        </button>
                    </div>
                </div>
            `;
        } else {
            // ACTIVE TEMPLATES VIEW
            modal.innerHTML = `
                <div class="bg-white rounded-2xl sm:rounded-[24px] shadow-2xl w-full max-w-sm sm:max-w-md md:max-w-xl lg:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col font-['Inter']" onclick="event.stopPropagation()">
                    <!-- Header (Exit icon removed) -->
                    <div class="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-100 flex items-center justify-between shrink-0 gap-2">
                        <div class="min-w-0">
                            <h3 class="text-sm sm:text-base font-bold text-black tracking-tight truncate">Design Templates</h3>
                            <p class="text-[11px] sm:text-xs font-normal text-black-fade mt-0.5">Choose or upload a topic cover</p>
                        </div>
                        <div class="flex items-center gap-2 shrink-0">
                            ${isMaster ? `
                                <button type="button" onclick="window.switchTopicPickerView('trash')"
                                    class="sigma-btn sigma-btn-white h-7 px-2.5 text-[11px] rounded-lg gap-1.5 cursor-pointer"
                                    title="View Deleted Templates">
                                    <i class="fa-solid fa-trash-can text-[11px] text-red-600"></i>
                                    <span>Trash Bin</span>
                                    <span id="topic-trash-badge" class="px-1.5 py-0.2 bg-slate-100 rounded-full text-[9px] font-bold text-black">${trashedTemplates.length}</span>
                                </button>
                            ` : ''}
                        </div>
                    </div>

                    <!-- Body -->
                    <div class="flex-1 overflow-y-auto p-3.5 sm:p-5 custom-scrollbar space-y-3.5 sm:space-y-4">
                        <!-- Top Section: Upload Panel + Recently Used -->
                        <div class="topic-template-top-grid grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4 items-stretch">
                            <!-- Upload / Current Selection Card (Left) -->
                            <div class="topic-template-upload relative group cursor-pointer w-32 sm:w-36 md:w-full mx-auto md:mx-0 aspect-[3/4] rounded-xl border-2 border-dashed border-slate-300 hover:border-black flex flex-col items-center justify-center p-2.5 sm:p-4 bg-slate-50 transition-all text-center overflow-hidden">
                                ${selectedCover ? `
                                    <img id="topic-picker-active-preview" src="${selectedCover}" class="absolute inset-0 w-full h-full object-cover rounded-xl" alt="Selected Template">
                                    <div class="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2.5 text-white text-center z-10">
                                        <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-1 shadow-sm">
                                            <i class="fa-solid fa-arrow-up-from-bracket text-sm sm:text-base text-white"></i>
                                        </div>
                                        <span class="text-[10px] sm:text-[11px] font-bold capitalize">Upload Template</span>
                                        <span class="text-[8.5px] sm:text-[9px] font-medium text-white/90 mt-0.5">600 × 800 px (3:4)</span>
                                    </div>
                                    <div class="absolute top-2 left-2 bg-[#15803d] text-white px-2 py-0.5 rounded-full text-[8.5px] sm:text-[9px] font-bold shadow-md flex items-center gap-1 pointer-events-none z-10">
                                        <i class="fa-solid fa-check text-[8px]"></i>
                                        <span>Selected</span>
                                    </div>
                                ` : `
                                    <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-green-50 border border-green-200 text-[#15803d] flex items-center justify-center mb-1.5 shadow-sm group-hover:scale-105 transition-transform">
                                        <i class="fa-solid fa-arrow-up-from-bracket text-base sm:text-lg"></i>
                                    </div>
                                    <span class="text-[11px] sm:text-xs font-bold text-black capitalize tracking-normal">Upload Template</span>
                                    <span class="text-[9px] sm:text-[10px] font-normal text-black-fade mt-0.5">600 × 800 px (3:4)</span>
                                `}
                                <input type="file" class="absolute inset-0 opacity-0 cursor-pointer z-20" accept="image/*" onchange="window.handleTopicEditorUpload(this)">
                            </div>

                            <!-- Recently Used (Right) -->
                            <div class="md:col-span-2 flex flex-col justify-start">
                                <div class="flex items-center justify-between mb-1.5 sm:mb-2">
                                    <h4 class="text-xs font-bold text-black capitalize tracking-normal">Recently Used</h4>
                                </div>
                                <div class="topic-template-recent-grid grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 flex-1">
                                    ${recentTemplates.map((src, idx) => {
                                        const isSelected = (src === selectedCover);
                                        return `
                                            <div class="topic-template-card relative aspect-[3/4] rounded-xl border border-slate-200 bg-white shadow-xs hover:shadow-md transition-all overflow-hidden group">
                                                ${isSelected ? `
                                                    <div class="absolute top-1.5 left-1.5 z-20 bg-[#15803d] text-white w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] shadow-md">
                                                        <i class="fa-solid fa-check"></i>
                                                    </div>
                                                ` : ''}
                                                <img src="${src}" alt="Recent cover ${idx + 1}"
                                                    class="w-full h-full object-cover cursor-pointer select-none"
                                                    onclick="window.openTopicCoverLightbox('${encodeURIComponent(src)}', false, event)">

                                                <!-- Three dots options button -->
                                                <button type="button"
                                                    class="topic-options-trigger absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-all shadow-md z-20 cursor-pointer"
                                                    title="Template options"
                                                    onclick="window.toggleTopicCardOptionsMenu('recent-${idx}', event)">
                                                    <i class="fa-solid fa-ellipsis-vertical text-[10px]"></i>
                                                </button>

                                                <!-- Options Menu Dropdown -->
                                                <div id="topic-card-menu-recent-${idx}"
                                                    class="topic-options-menu hidden"
                                                    onclick="event.stopPropagation()">
                                                    <button type="button"
                                                        onclick="window.selectTopicTemplateForPicker('${encodeURIComponent(src)}')"
                                                        class="topic-options-item">
                                                        <i class="fa-regular fa-circle-check text-xs text-black w-4 text-center"></i>
                                                        <span>Choose this template</span>
                                                    </button>
                                                    <div class="h-px bg-slate-100 my-0.5"></div>
                                                    <button type="button"
                                                        onclick="window.moveTopicTemplateToTrash('${encodeURIComponent(src)}')"
                                                        class="topic-options-item danger">
                                                        <i class="fa-solid fa-trash-can text-xs text-red-600 w-4 text-center"></i>
                                                        <span>Move to trash</span>
                                                    </button>
                                                </div>
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                        </div>

                        <!-- Bottom Section: Uploads & Library -->
                        <div>
                            <div class="flex items-center justify-between mb-1.5 sm:mb-2.5">
                                <div>
                                    <h4 class="text-xs font-bold text-black capitalize tracking-normal">Uploads & Library</h4>
                                    <p class="text-[10px] sm:text-[11px] font-normal text-black-fade mt-0.5">Click any image to view in fullscreen, or open menu to choose cover</p>
                                </div>
                            </div>
                            <div class="p-2.5 sm:p-3.5 bg-slate-50/60 rounded-xl sm:rounded-2xl border border-slate-200">
                                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                                    ${activeTemplates.map((src, idx) => {
                                        const isSelected = (src === selectedCover);
                                        return `
                                            <div class="topic-template-card relative aspect-[3/4] rounded-xl border border-slate-200 bg-white shadow-xs hover:shadow-md transition-all overflow-hidden group">
                                                ${isSelected ? `
                                                    <div class="absolute top-1.5 left-1.5 z-20 bg-[#15803d] text-white w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] shadow-md">
                                                        <i class="fa-solid fa-check"></i>
                                                    </div>
                                                ` : ''}
                                                <!-- Image Thumbnail: Clicking opens Lightbox -->
                                                <img src="${src}" alt="Template ${idx + 1}"
                                                    class="w-full h-full object-cover cursor-pointer select-none"
                                                    onclick="window.openTopicCoverLightbox('${encodeURIComponent(src)}', false, event)">

                                                <!-- Three dots options button -->
                                                <button type="button"
                                                    class="topic-options-trigger absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-all shadow-md z-20 cursor-pointer"
                                                    title="Template options"
                                                    onclick="window.toggleTopicCardOptionsMenu('active-${idx}', event)">
                                                    <i class="fa-solid fa-ellipsis-vertical text-[10px]"></i>
                                                </button>

                                                <!-- Options Menu Dropdown -->
                                                <div id="topic-card-menu-active-${idx}"
                                                    class="topic-options-menu hidden"
                                                    onclick="event.stopPropagation()">
                                                    <button type="button"
                                                        onclick="window.selectTopicTemplateForPicker('${encodeURIComponent(src)}')"
                                                        class="topic-options-item">
                                                        <i class="fa-regular fa-circle-check text-xs text-black w-4 text-center"></i>
                                                        <span>Choose this template</span>
                                                    </button>
                                                    <div class="h-px bg-slate-100 my-0.5"></div>
                                                    <button type="button"
                                                        onclick="window.moveTopicTemplateToTrash('${encodeURIComponent(src)}')"
                                                        class="topic-options-item danger">
                                                        <i class="fa-solid fa-trash-can text-xs text-red-600 w-4 text-center"></i>
                                                        <span>Move to trash</span>
                                                    </button>
                                                </div>
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Footer: Cancel on far left, Accept Template on far right -->
                    <div class="px-4 py-2.5 sm:px-6 sm:py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
                        <button type="button" onclick="window.closeTopicEditorImagePicker()" class="sigma-btn sigma-btn-secondary h-8 px-3.5 sm:px-4 text-xs font-semibold rounded-lg cursor-pointer">
                            <span>Cancel</span>
                        </button>
                        <button type="button" onclick="window.applyTopicTemplateSelection()" class="sigma-btn sigma-btn-primary h-8 px-4 sm:px-5 text-xs font-semibold rounded-lg min-w-[110px] sm:min-w-[130px] cursor-pointer">
                            <span>Accept Template</span>
                        </button>
                    </div>
                </div>
            `;
        }
    };

    window.toggleTopicCardOptionsMenu = function (menuId, event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        const targetMenu = document.getElementById(`topic-card-menu-${menuId}`);
        if (!targetMenu) return;
        const isHidden = targetMenu.classList.contains('hidden');
        document.querySelectorAll('.topic-options-menu').forEach(m => m.classList.add('hidden'));
        document.querySelectorAll('.topic-template-card').forEach(c => {
            c.classList.remove('menu-open');
            c.style.zIndex = '';
        });
        if (isHidden) {
            targetMenu.classList.remove('hidden');
            const card = targetMenu.closest('.topic-template-card');
            if (card) {
                card.classList.add('menu-open');
                // Only on mobile (< 768px): elevate zIndex and handle edge boundaries so it's always in front
                if (window.innerWidth < 768) {
                    card.style.zIndex = '10080';
                    const cardRect = card.getBoundingClientRect();
                    const modalEl = card.closest('#topic-image-picker-modal > div') || card.closest('.overflow-y-auto');
                    if (modalEl) {
                        const modalRect = modalEl.getBoundingClientRect();
                        if (cardRect.left - modalRect.left < 90) {
                            targetMenu.style.left = '0';
                            targetMenu.style.right = 'auto';
                        } else {
                            targetMenu.style.left = 'auto';
                            targetMenu.style.right = '0';
                        }
                    }
                }
            }
        }
    };

    window.setTopicEditorImage = function (encodedSrc) {
        const src = decodeURIComponent(encodedSrc);
        window.selectTopicTemplateForPicker(encodeURIComponent(src));
    };

    window.moveTopicTemplateToTrash = function (encodedSrc) {
        const src = decodeURIComponent(encodedSrc);
        let active = getStoredTopicTemplates();
        active = active.filter(s => s !== src);
        if (active.length === 0) {
            active = ['image/Topic.jpg', 'image/Topic2.jpg'];
        }
        saveStoredTopicTemplates(active);

        let trash = getStoredTopicTrash();
        if (!trash.some(t => (t.src || t) === src)) {
            trash.unshift({ id: 'trash_' + Date.now(), src: src, deletedAt: new Date().toISOString() });
            saveStoredTopicTrash(trash);
        }

        if (window.showToast) window.showToast('Template moved to trash');
        const modal = document.getElementById('topic-image-picker-modal');
        if (modal) window.renderTopicPickerModalContent(modal);
        window.closeTopicCoverLightbox();
    };

    window.restoreTopicTemplateFromTrash = function (encodedSrc) {
        const src = decodeURIComponent(encodedSrc);
        let trash = getStoredTopicTrash().filter(t => (t.src || t) !== src);
        saveStoredTopicTrash(trash);

        let active = getStoredTopicTemplates();
        if (!active.includes(src)) {
            active.unshift(src);
            saveStoredTopicTemplates(active);
        }

        if (window.showToast) window.showToast('Template restored successfully');
        const modal = document.getElementById('topic-image-picker-modal');
        if (modal) window.renderTopicPickerModalContent(modal);
        window.closeTopicCoverLightbox();
    };

    window.deleteTopicTemplatePermanently = function (encodedSrc) {
        const src = decodeURIComponent(encodedSrc);
        if (typeof window.showActionConfirm === 'function') {
            window.showActionConfirm({
                title: 'Delete Template Permanently',
                message: 'Are you sure you want to permanently delete this template? This action cannot be undone.',
                type: 'danger',
                confirmText: 'Delete Permanently',
                cancelText: 'Cancel',
                onConfirm: () => {
                    let trash = getStoredTopicTrash().filter(t => (t.src || t) !== src);
                    saveStoredTopicTrash(trash);
                    window.selectedTopicTrashItems.delete(src);

                    if (window.showToast) window.showToast('Template permanently deleted');
                    const modal = document.getElementById('topic-image-picker-modal');
                    if (modal) window.renderTopicPickerModalContent(modal);
                    window.closeTopicCoverLightbox();
                }
            });
        } else {
            let trash = getStoredTopicTrash().filter(t => (t.src || t) !== src);
            saveStoredTopicTrash(trash);
            window.selectedTopicTrashItems.delete(src);
            const modal = document.getElementById('topic-image-picker-modal');
            if (modal) window.renderTopicPickerModalContent(modal);
            window.closeTopicCoverLightbox();
        }
    };

    window.toggleTopicTrashSelect = function (encodedSrc, isChecked) {
        const src = decodeURIComponent(encodedSrc);
        if (isChecked) {
            window.selectedTopicTrashItems.add(src);
        } else {
            window.selectedTopicTrashItems.delete(src);
        }
        window.updateTopicTrashSelectionToolbar();
    };

    window.toggleTopicTrashSelectAll = function (isChecked) {
        const trash = getStoredTopicTrash();
        if (isChecked) {
            trash.forEach(t => window.selectedTopicTrashItems.add(t.src || t));
        } else {
            window.selectedTopicTrashItems.clear();
        }
        const modal = document.getElementById('topic-image-picker-modal');
        if (modal) window.renderTopicPickerModalContent(modal);
        window.updateTopicTrashSelectionToolbar();
    };

    window.updateTopicTrashSelectionToolbar = function () {
        const count = window.selectedTopicTrashItems.size;
        const countEl = document.getElementById('topic-trash-selected-count');
        const restoreBtn = document.getElementById('topic-trash-restore-bulk-btn');
        const deleteBtn = document.getElementById('topic-trash-delete-bulk-btn');
        const selectAllBox = document.getElementById('topic-trash-select-all');

        if (countEl) countEl.textContent = `${count} selected`;
        if (restoreBtn) {
            restoreBtn.disabled = count === 0;
            restoreBtn.classList.toggle('opacity-50', count === 0);
            restoreBtn.classList.toggle('cursor-not-allowed', count === 0);
        }
        if (deleteBtn) {
            deleteBtn.disabled = count === 0;
            deleteBtn.classList.toggle('opacity-50', count === 0);
            deleteBtn.classList.toggle('cursor-not-allowed', count === 0);
        }
        const trash = getStoredTopicTrash();
        if (selectAllBox) {
            selectAllBox.checked = trash.length > 0 && count === trash.length;
        }
    };

    window.restoreSelectedTopicTrashItems = function () {
        if (window.selectedTopicTrashItems.size === 0) return;
        const selected = Array.from(window.selectedTopicTrashItems);
        let trash = getStoredTopicTrash().filter(t => !selected.includes(t.src || t));
        saveStoredTopicTrash(trash);

        let active = getStoredTopicTemplates();
        selected.forEach(src => {
            if (!active.includes(src)) active.unshift(src);
        });
        saveStoredTopicTemplates(active);
        window.selectedTopicTrashItems.clear();

        if (window.showToast) window.showToast(`${selected.length} templates restored`);
        const modal = document.getElementById('topic-image-picker-modal');
        if (modal) window.renderTopicPickerModalContent(modal);
    };

    window.deleteSelectedTopicTrashItemsPermanently = function () {
        if (window.selectedTopicTrashItems.size === 0) return;
        const selected = Array.from(window.selectedTopicTrashItems);

        if (typeof window.showActionConfirm === 'function') {
            window.showActionConfirm({
                title: 'Delete Selected Templates',
                message: `Are you sure you want to permanently delete ${selected.length} template(s)? This action cannot be undone.`,
                type: 'danger',
                confirmText: 'Delete Permanently',
                cancelText: 'Cancel',
                onConfirm: () => {
                    let trash = getStoredTopicTrash().filter(t => !selected.includes(t.src || t));
                    saveStoredTopicTrash(trash);
                    window.selectedTopicTrashItems.clear();

                    if (window.showToast) window.showToast(`${selected.length} templates permanently deleted`);
                    const modal = document.getElementById('topic-image-picker-modal');
                    if (modal) window.renderTopicPickerModalContent(modal);
                }
            });
        } else {
            let trash = getStoredTopicTrash().filter(t => !selected.includes(t.src || t));
            saveStoredTopicTrash(trash);
            window.selectedTopicTrashItems.clear();
            const modal = document.getElementById('topic-image-picker-modal');
            if (modal) window.renderTopicPickerModalContent(modal);
        }
    };

    function ensureTopicCoverLightboxElement() {
        if (document.getElementById('sigma-topic-cover-lightbox')) return;
        const lightbox = document.createElement('div');
        lightbox.id = 'sigma-topic-cover-lightbox';
        lightbox.className = 'fixed inset-0 bg-black/90 hidden flex items-center justify-center p-4 select-none';
        lightbox.style.cssText = 'position: fixed !important; inset: 0 !important; z-index: 100060 !important;';
        lightbox.onclick = function (e) {
            if (e.target === lightbox || e.target.id === 'topic-lightbox-image-container') {
                window.closeTopicCoverLightbox();
            }
        };
        lightbox.innerHTML = `
            <!-- Top Controls (Three Dots & Close) -->
            <div class="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-3 z-[10070]" onclick="event.stopPropagation()">
                <!-- Three dots options button -->
                <div class="relative">
                    <button type="button" id="topic-lightbox-options-btn"
                        onclick="window.toggleTopicLightboxOptionsMenu(event)"
                        class="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer shadow-lg backdrop-blur-md"
                        title="Options">
                        <i class="fa-solid fa-ellipsis-vertical text-base"></i>
                    </button>
                    <!-- Lightbox Options Menu -->
                    <div id="topic-lightbox-options-menu"
                        class="topic-options-menu hidden absolute top-14 right-0 min-w-[200px] bg-white rounded-2xl border border-slate-200 shadow-2xl z-[10080] py-1.5 overflow-hidden font-['Inter'] text-left">
                    </div>
                </div>
                <!-- Close Button -->
                <button type="button" onclick="window.closeTopicCoverLightbox()"
                    class="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer shadow-lg backdrop-blur-md"
                    title="Close">
                    <i class="fa-solid fa-xmark text-2xl"></i>
                </button>
            </div>

            <!-- Centered Image Container -->
            <div id="topic-lightbox-image-container" class="relative max-w-full max-h-full flex items-center justify-center p-2">
                <img id="topic-lightbox-image" src="" alt="Full view" class="max-h-[85vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl transition-transform" onclick="event.stopPropagation()">
            </div>
        `;
        document.body.appendChild(lightbox);

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                window.closeTopicCoverLightbox();
            }
        });
    }

    window.openTopicCoverLightbox = function (encodedSrc, isTrash = false, event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        ensureTopicCoverLightboxElement();
        const src = decodeURIComponent(encodedSrc);
        currentTopicLightboxSrc = src;
        currentTopicLightboxIsTrash = !!isTrash;

        const img = document.getElementById('topic-lightbox-image');
        if (img) img.src = src;

        const lightbox = document.getElementById('sigma-topic-cover-lightbox');
        if (lightbox) lightbox.classList.remove('hidden');

        const menu = document.getElementById('topic-lightbox-options-menu');
        if (menu) menu.classList.add('hidden');
    };

    window.closeTopicCoverLightbox = function () {
        const lightbox = document.getElementById('sigma-topic-cover-lightbox');
        if (lightbox) lightbox.classList.add('hidden');
        const menu = document.getElementById('topic-lightbox-options-menu');
        if (menu) menu.classList.add('hidden');
        currentTopicLightboxSrc = null;
        currentTopicLightboxIsTrash = false;
    };

    window.toggleTopicLightboxOptionsMenu = function (event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        const menu = document.getElementById('topic-lightbox-options-menu');
        if (!menu || !currentTopicLightboxSrc) return;

        if (!menu.classList.contains('hidden')) {
            menu.classList.add('hidden');
            return;
        }

        const src = currentTopicLightboxSrc;
        const encoded = encodeURIComponent(src);

        if (currentTopicLightboxIsTrash) {
            menu.innerHTML = `
                <button type="button"
                    onclick="window.restoreTopicTemplateFromTrash('${encoded}')"
                    class="topic-options-item">
                    <i class="fa-solid fa-rotate-left text-sm text-black w-4 text-center"></i>
                    <span>Restore Template</span>
                </button>
                <div class="h-px bg-slate-100 my-0.5"></div>
                <button type="button"
                    onclick="window.deleteTopicTemplatePermanently('${encoded}')"
                    class="topic-options-item danger">
                    <i class="fa-solid fa-trash-can text-sm text-red-600 w-4 text-center"></i>
                    <span>Delete Permanently</span>
                </button>
            `;
        } else {
            menu.innerHTML = `
                <button type="button"
                    onclick="window.setTopicEditorImage('${encoded}')"
                    class="topic-options-item">
                    <i class="fa-regular fa-circle-check text-sm text-black w-4 text-center"></i>
                    <span>Choose this template</span>
                </button>
                <div class="h-px bg-slate-100 my-0.5"></div>
                <button type="button"
                    onclick="window.moveTopicTemplateToTrash('${encoded}')"
                    class="topic-options-item danger">
                    <i class="fa-solid fa-trash-can text-sm text-red-600 w-4 text-center"></i>
                    <span>Move to trash</span>
                </button>
            `;
        }
        menu.classList.remove('hidden');
    };

    // ── STEP 3: MATERIALS MANAGEMENT ────────────────────────────────────────

    window.toggleMaterialDropdown = function (event) {
        if (event) event.stopPropagation();
        const dropdown = document.getElementById('add-material-dropdown');
        const trigger = document.getElementById('add-material-trigger');
        const icon = trigger?.querySelector('i');
        if (dropdown) {
            const isOpening = dropdown.classList.contains('hidden');
            dropdown.classList.toggle('hidden', !isOpening);

            const setTriggerState = (open) => {
                if (trigger) {
                    if (open) {
                        trigger.classList.add('is-active', 'bg-slate-100', 'border-slate-300');
                        trigger.classList.remove('bg-white');
                        trigger.style.setProperty('background-color', '#f1f5f9', 'important');
                        trigger.style.setProperty('border-color', '#cbd5e1', 'important');
                    } else {
                        trigger.classList.remove('is-active', 'bg-slate-100', 'border-slate-300');
                        trigger.classList.add('bg-white');
                        trigger.style.removeProperty('background-color');
                        trigger.style.removeProperty('border-color');
                    }
                }
                if (icon) {
                    if (open) {
                        icon.className = 'fa-solid fa-chevron-down text-xs text-black transition-transform duration-200 transform rotate-180';
                    } else {
                        icon.className = 'fa-solid fa-plus text-xs text-black transition-transform duration-200 transform rotate-0';
                    }
                }
            };

            setTriggerState(isOpening);

            if (isOpening) {
                // Auto-clamp dropdown positioning to prevent clipping off screen edges
                requestAnimationFrame(() => {
                    dropdown.style.removeProperty('left');
                    dropdown.style.removeProperty('right');
                    const rect = dropdown.getBoundingClientRect();
                    const vw = window.innerWidth || document.documentElement.clientWidth || 360;
                    const margin = 8;

                    if (rect.left < margin) {
                        dropdown.style.setProperty('left', '0', 'important');
                        dropdown.style.setProperty('right', 'auto', 'important');
                        const newRect = dropdown.getBoundingClientRect();
                        if (newRect.left < margin) {
                            dropdown.style.setProperty('left', `${margin - newRect.left}px`, 'important');
                        }
                    } else if (rect.right > vw - margin) {
                        dropdown.style.setProperty('right', '0', 'important');
                        dropdown.style.setProperty('left', 'auto', 'important');
                        const newRect = dropdown.getBoundingClientRect();
                        if (newRect.right > vw - margin) {
                            dropdown.style.setProperty('right', `${newRect.right - (vw - margin)}px`, 'important');
                        }
                    }
                });

                const closeHandler = (e) => {
                    if (!dropdown.contains(e.target) && e.target !== trigger && !trigger?.contains(e.target)) {
                        dropdown.classList.add('hidden');
                        dropdown.style.removeProperty('left');
                        dropdown.style.removeProperty('right');
                        setTriggerState(false);
                        document.removeEventListener('click', closeHandler);
                        window.removeEventListener('scroll', scrollCloseHandler, true);
                    }
                };
                const scrollCloseHandler = (e) => {
                    if (!dropdown.classList.contains('hidden') && !dropdown.contains(e.target)) {
                        dropdown.classList.add('hidden');
                        dropdown.style.removeProperty('left');
                        dropdown.style.removeProperty('right');
                        setTriggerState(false);
                        document.removeEventListener('click', closeHandler);
                        window.removeEventListener('scroll', scrollCloseHandler, true);
                    }
                };
                setTimeout(() => {
                    document.addEventListener('click', closeHandler);
                    window.addEventListener('scroll', scrollCloseHandler, true);
                }, 10);
            } else {
                dropdown.style.removeProperty('left');
                dropdown.style.removeProperty('right');
            }
        }
    };

    window.toggleSubjectTopicDropdown = function (topicId, event) {
        if (event) {
            if (event.target && event.target.closest('button:not(.topic-dropdown-toggle-btn), a, input, select')) {
                return;
            }
            event.stopPropagation();
        }
        if (!window.expandedSubjectTopicIds) window.expandedSubjectTopicIds = {};
        const dropdown = document.getElementById(`topic-dropdown-${topicId}`);
        const chevron = document.getElementById(`topic-chevron-${topicId}`);
        const panel = document.getElementById(`subject-topic-panel-${topicId}`);

        const isCurrentlyExpanded = dropdown ? !dropdown.classList.contains('hidden') : (window.expandedSubjectTopicIds[topicId] !== undefined ? window.expandedSubjectTopicIds[topicId] === true : false);
        const willBeExpanded = !isCurrentlyExpanded;
        window.expandedSubjectTopicIds[topicId] = willBeExpanded;

        if (dropdown) {
            dropdown.classList.toggle('hidden', !willBeExpanded);
        }
        if (chevron) {
            chevron.classList.toggle('rotate-180', willBeExpanded);
        }
        if (panel) {
            const header = panel.querySelector('div:first-child');
            if (header) {
                header.classList.toggle('rounded-t-2xl', willBeExpanded);
                header.classList.toggle('rounded-2xl', !willBeExpanded);
            }
            panel.classList.toggle('hover:bg-slate-100', !willBeExpanded);
            panel.classList.remove('bg-white', 'bg-slate-100', 'bg-slate-50/80', 'border-slate-300');
            panel.classList.add('bg-slate-50', 'border-slate-200/90');
        }
    };

    window.renderSubjectMaterials = function () {
        const grid = document.getElementById('subject-materials-grid');
        const empty = document.getElementById('subject-materials-empty');
        if (!grid) return;
        grid.classList.remove('hidden');
        grid.style.removeProperty('display');
        if (empty) empty.style.removeProperty('display');

        const isTeacher = isCurrentEditorTeacher();
        const currentUser = getCurrentEditorUser();
        const currentUserName = currentUser ? (`${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.name || '') : '';
        const currentUserId = currentUser ? String(currentUser.id || currentUser.uid || currentUser.username || '') : '';
        const myName = currentUserName.trim().toLowerCase();

        // Scope Container Visibility & Label Handling
        const isEdit = Boolean(window.isEditingSubject);
        const isStandalone = Boolean(window.subjectEditorOptions?.standalone);
        const isViewOnlyScope = isCurrentViewOnlyScope();
        const matScopeContainer = document.getElementById('subject-material-scope-container');
        if (matScopeContainer) {
            // Admins can inspect scopes while editing an existing subject, including the standalone content form.
            if (isTeacher || !isEdit) {
                matScopeContainer.classList.add('hidden');
            } else {
                matScopeContainer.classList.remove('hidden');
                updateCurriculumScopeButtonUi();
            }
        }

        // Add Material Trigger Visibility (Hidden in View-Only Scope)
        const addMaterialTrigger = document.getElementById('add-material-trigger');
        if (addMaterialTrigger) {
            const wrap = addMaterialTrigger.closest('.relative') || addMaterialTrigger;
            if (isViewOnlyScope) {
                wrap.classList.add('hidden');
            } else {
                wrap.classList.remove('hidden');
            }
        }

        // Determine all available materials
        const rawMaterials = (window.currentSubjectAllMaterials && window.currentSubjectAllMaterials.length > 0)
            ? window.currentSubjectAllMaterials
            : (window.currentSubjectMaterials || []);
        const allMaterials = rawMaterials.filter(m => !isFakeSampleMaterial(m));
        window.currentSubjectAllMaterials = [...allMaterials];

        const allCurTopics = (window.currentSubjectAllTopics && window.currentSubjectAllTopics.length > 0)
            ? window.currentSubjectAllTopics
            : (window.currentSubjectTopics || []);
        window.currentSubjectAllTopics = [...allCurTopics];

        let materials = [];
        let scopeTopics = [];

        if (isTeacher) {
            const activeSection = String(
                window.activeSubjectEditorSection
                || (typeof window.currentClassroomSectionName !== 'undefined' && window.currentClassroomSectionName)
                || (typeof currentClassroomSectionName !== 'undefined' && currentClassroomSectionName)
                || (typeof currentTopicState !== 'undefined' ? currentTopicState?.selectedSection : '')
                || (typeof window.currentTopicState !== 'undefined' ? window.currentTopicState?.selectedSection : '')
                || (typeof resolveTeacherActiveSection === 'function' ? resolveTeacherActiveSection() : '')
                || localStorage.getItem('sigma-active-classroom-section')
                || ''
            ).trim().toLowerCase();
            const currentUserId = currentUser ? String(currentUser.id || currentUser.uid || currentUser.username || '').trim().toLowerCase() : '';
            const myFullName = currentUser ? (`${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.name || '').trim().toLowerCase() : '';

            // Filter out teacher materials that belong to other teachers / other sections
            const filteredMaterials = allMaterials.filter(m => {
                const r = m.authorRole || m.role || (m.isTeacher ? 'Teacher' : (m.isAdmin ? 'Admin' : ''));
                const isA = normalizeSubjectAuthorRole(r) === 'Admin';
                if (isA) return true;

                const mSection = String(resolveSubjectItemSection(m)).trim().toLowerCase();
                const mAuthorId = String(m.authorId || m.uid || '').trim().toLowerCase();
                const mAuthorName = String(m.authorName || m.author || '').trim().toLowerCase();

                if (activeSection) {
                    return mSection === activeSection;
                }
                if (isCurrentUserAuthor(m.authorId, m.authorName, 'Teacher')) return true;
                if (mAuthorId && currentUserId && mAuthorId === currentUserId) return true;
                if (mAuthorName && myFullName && (mAuthorName === myFullName || mAuthorName.includes(myFullName) || myFullName.includes(mAuthorName))) return true;

                return false;
            });

            const teacherMatMap = new Map();
            filteredMaterials.forEach(m => {
                const r = m.authorRole || m.role || (m.isTeacher ? 'Teacher' : (m.isAdmin ? 'Admin' : ''));
                const isT = normalizeSubjectAuthorRole(r) === 'Teacher';
                if (isT) {
                    if (activeSection) {
                        const mSec = String(resolveSubjectItemSection(m)).trim().toLowerCase();
                        if (mSec !== activeSection) return;
                    }
                    if (m.originalAdminId) teacherMatMap.set(String(m.originalAdminId), m);
                    if (m.title) teacherMatMap.set(String(m.title).trim().toLowerCase(), m);
                }
            });

            materials = filteredMaterials.filter(m => {
                const r = m.authorRole || m.role || (m.isTeacher ? 'Teacher' : (m.isAdmin ? 'Admin' : ''));
                const isA = normalizeSubjectAuthorRole(r) === 'Admin';
                if (isA) {
                    if (teacherMatMap.has(String(m.id)) || (m.title && teacherMatMap.has(String(m.title).trim().toLowerCase()))) {
                        return false;
                    }
                }
                return true;
            });

            // Scope topics for teacher should also filter out other teachers' topics
            scopeTopics = allCurTopics.filter(t => {
                const rawRole = t.authorRole || t.role || (t.isAdmin ? 'Admin' : (t.isTeacher ? 'Teacher' : 'Admin'));
                const authorRole = normalizeSubjectAuthorRole(rawRole);
                if (authorRole === 'Admin') return true;

                const tSection = String(resolveSubjectItemSection(t)).trim().toLowerCase();
                const tAuthorId = String(t.authorId || t.uid || '').trim().toLowerCase();
                const tAuthorName = String(t.authorName || t.author || '').trim().toLowerCase();

                if (activeSection) {
                    return tSection === activeSection;
                }
                if (isCurrentUserAuthor(t.authorId, t.authorName, 'Teacher')) return true;
                if (tAuthorId && currentUserId && tAuthorId === currentUserId) return true;
                if (tAuthorName && myFullName && (tAuthorName === myFullName || tAuthorName.includes(myFullName) || myFullName.includes(tAuthorName))) return true;

                return false;
            });
        } else {
            const scope = window.activeCurriculumScope || 'master';
            if (scope === 'master') {
                // Admin in Master Syllabus view: STRICTLY Admin-created materials and topics ONLY!
                materials = allMaterials.filter(m => {
                    const mAuthorName = String(m.authorName || m.author || '').toLowerCase();
                    const isTeacherMat = (m.authorRole && normalizeSubjectAuthorRole(m.authorRole) === 'Teacher') ||
                                         (m.role && normalizeSubjectAuthorRole(m.role) === 'Teacher') ||
                                         Boolean(m.isTeacher) ||
                                         mAuthorName.includes('maria') || mAuthorName.includes('ramos') || mAuthorName.includes('teacher');
                    const rawRole = isTeacherMat ? 'Teacher' : (m.isAdmin ? 'Admin' : (m.authorRole || m.role || 'Admin'));
                    return normalizeSubjectAuthorRole(rawRole) === 'Admin';
                });
                scopeTopics = allCurTopics.filter(t => {
                    const tAuthorName = String(t.authorName || t.author || '').toLowerCase();
                    const isTeacherTopic = (t.authorRole && normalizeSubjectAuthorRole(t.authorRole) === 'Teacher') ||
                                           (t.role && normalizeSubjectAuthorRole(t.role) === 'Teacher') ||
                                           Boolean(t.isTeacher) ||
                                           tAuthorName.includes('maria') || tAuthorName.includes('ramos') || tAuthorName.includes('teacher');
                    const rawRole = isTeacherTopic ? 'Teacher' : (t.isAdmin ? 'Admin' : (t.authorRole || t.role || 'Admin'));
                    return normalizeSubjectAuthorRole(rawRole) === 'Admin';
                });
            } else if (scope === 'all') {
                materials = [...allMaterials];
                scopeTopics = [...allCurTopics];
            } else {
                // Specific teacher scope selected in View Scope
                const scopeLabel = String(window.activeCurriculumScopeLabel || '').trim().toLowerCase();
                const cleanTeacherName = scopeLabel.replace(/\s*\(.*?\)\s*/g, '').trim();

                const thisTeacherMaterials = allMaterials.filter(m => {
                    const mAuthorName = String(m.authorName || m.author || '').toLowerCase();
                    const isTeacherMat = (m.authorRole && normalizeSubjectAuthorRole(m.authorRole) === 'Teacher') ||
                                         (m.role && normalizeSubjectAuthorRole(m.role) === 'Teacher') ||
                                         Boolean(m.isTeacher) ||
                                         mAuthorName.includes('maria') || mAuthorName.includes('ramos') || mAuthorName.includes('teacher');
                    if (!isTeacherMat) return false;
                    if (m.authorId && String(m.authorId) === String(scope)) return true;
                    if (m.authorName) {
                        const mAuthor = m.authorName.trim().toLowerCase();
                        if (cleanTeacherName && (mAuthor === cleanTeacherName || cleanTeacherName.includes(mAuthor) || mAuthor.includes(cleanTeacherName))) return true;
                        if (scopeLabel && (scopeLabel.includes(mAuthor) || mAuthor.includes(scopeLabel))) return true;
                    }
                    return false;
                });

                const teacherOverrideMap = new Map();
                thisTeacherMaterials.forEach(m => {
                    if (m.originalAdminId) teacherOverrideMap.set(String(m.originalAdminId), m);
                    if (m.title) teacherOverrideMap.set(String(m.title).trim().toLowerCase(), m);
                });

                materials = allMaterials.filter(m => {
                    const mAuthorName = String(m.authorName || m.author || '').toLowerCase();
                    const isTeacherMat = (m.authorRole && normalizeSubjectAuthorRole(m.authorRole) === 'Teacher') ||
                                         (m.role && normalizeSubjectAuthorRole(m.role) === 'Teacher') ||
                                         Boolean(m.isTeacher) ||
                                         mAuthorName.includes('maria') || mAuthorName.includes('ramos') || mAuthorName.includes('teacher');
                    const rawRole = isTeacherMat ? 'Teacher' : (m.isAdmin ? 'Admin' : (m.authorRole || m.role || 'Admin'));
                    const authorRole = normalizeSubjectAuthorRole(rawRole);
                    if (authorRole === 'Admin') {
                        if (teacherOverrideMap.has(String(m.id)) || (m.title && teacherOverrideMap.has(String(m.title).trim().toLowerCase()))) {
                            return false;
                        }
                        return true;
                    }
                    if (m.authorId && String(m.authorId) === String(scope)) return true;
                    if (m.authorName) {
                        const mAuthor = m.authorName.trim().toLowerCase();
                        if (cleanTeacherName && (mAuthor === cleanTeacherName || cleanTeacherName.includes(mAuthor) || mAuthor.includes(cleanTeacherName))) return true;
                        if (scopeLabel && (scopeLabel.includes(mAuthor) || mAuthor.includes(scopeLabel))) return true;
                    }
                    return false;
                });
                scopeTopics = allCurTopics.filter(t => {
                    const tAuthorName = String(t.authorName || t.author || '').toLowerCase();
                    const isTeacherTopic = (t.authorRole && normalizeSubjectAuthorRole(t.authorRole) === 'Teacher') ||
                                           (t.role && normalizeSubjectAuthorRole(t.role) === 'Teacher') ||
                                           Boolean(t.isTeacher) ||
                                           tAuthorName.includes('maria') || tAuthorName.includes('ramos') || tAuthorName.includes('teacher');
                    const rawRole = isTeacherTopic ? 'Teacher' : (t.isAdmin ? 'Admin' : (t.authorRole || t.role || 'Admin'));
                    const authorRole = normalizeSubjectAuthorRole(rawRole);
                    if (authorRole === 'Admin') return true; // Admin core shared
                    if (t.authorId && String(t.authorId) === String(scope)) return true;
                    if (t.authorName) {
                        const tAuthor = t.authorName.trim().toLowerCase();
                        if (cleanTeacherName && (tAuthor === cleanTeacherName || cleanTeacherName.includes(tAuthor) || tAuthor.includes(cleanTeacherName))) return true;
                        if (scopeLabel && (scopeLabel.includes(tAuthor) || tAuthor.includes(scopeLabel))) return true;
                    }
                    return false;
                });
            }
        }

        // Deduplicate materials and topics to ensure no item is rendered twice
        const _seenMatKeys = new Set();
        materials = materials.filter(m => {
            const k = String(m.id || m.title || '').trim().toLowerCase();
            if (!k) return true;
            if (_seenMatKeys.has(k)) return false;
            _seenMatKeys.add(k);
            return true;
        });

        const _seenTopicKeys = new Set();
        scopeTopics = scopeTopics.filter(t => {
            const k = String(t.id || t.title || '').trim().toLowerCase();
            if (!k) return true;
            if (_seenTopicKeys.has(k)) return false;
            _seenTopicKeys.add(k);
            return true;
        });

        window.currentSubjectMaterials = materials;
        window.currentSubjectTopics = scopeTopics;

        window.renderSubjectQuarterTabs?.();
        const activeQuarters = getActiveSubjectQuarters();
        const normalizedMatQ = normalizeQuarterKey(window.currentSubjectMaterialQuarter);
        if (!activeQuarters.includes(normalizedMatQ)) {
            window.currentSubjectMaterialQuarter = activeQuarters[0] || 'q1';
        } else {
            window.currentSubjectMaterialQuarter = normalizedMatQ;
        }
        const curQ = normalizeQuarterKey(window.currentSubjectMaterialQuarter || activeQuarters[0] || 'q1');

        const topics = scopeTopics.filter(t => {
            const tQ = normalizeQuarterKey(t.quarter || activeQuarters[0] || 'q1');
            return tQ === curQ;
        });
        window.currentVisibleQuarterTopics = topics.slice();
        if (typeof window.syncTopicReorderLock === 'function') window.syncTopicReorderLock();

        const filteredMaterials = materials.filter(m => {
            if (m.topicId && m.topicId !== '_unassigned') {
                const parentTopic = allCurTopics.find(t => String(t.id) === String(m.topicId));
                if (parentTopic) {
                    const parentQ = normalizeQuarterKey(parentTopic.quarter || activeQuarters[0] || 'q1');
                    return parentQ === curQ;
                }
            }
            const mQ = normalizeQuarterKey(m.quarter || activeQuarters[0] || 'q1');
            return mQ === curQ;
        });

        const step3Title = document.getElementById('subject-step-3-title');
        if (step3Title) {
            const combined = window.usesCombinedSubjectContent && window.usesCombinedSubjectContent();
            step3Title.textContent = combined
                ? (window.subjectEditorOptions?.title || 'Add/Edit Topics & Materials')
                : (window.isEditingSubject ? 'Edit Materials' : 'Add Materials');
        }
        const matQuarterCountEl = document.getElementById('subject-materials-quarter-count');
        if (matQuarterCountEl) {
            matQuarterCountEl.textContent = '';
        }
        const bar3Label = document.getElementById('subject-step-bar-3-label');
        if (bar3Label) {
            bar3Label.textContent = window.isEditingSubject ? 'Edit Materials' : 'Add Material';
        }

        const query = (window.subjectMaterialSearchQuery || '').toLowerCase().trim();

        if (topics.length === 0 && filteredMaterials.length === 0) {
            grid.innerHTML = '';
            if (empty) {
                empty.innerHTML = `
                    <i class="fa-solid fa-folder-open sigma-empty-icon" aria-hidden="true"></i>
                    <p class="sigma-empty-title">No Materials Added for ${QUARTER_LABELS[curQ] || curQ} Yet</p>
                `;
                empty.classList.remove('hidden');
                empty.style.removeProperty('display');
            }
            return;
        }

        if (empty) {
            empty.classList.add('hidden');
            empty.style.removeProperty('display');
        }

        // Group by Topic
        const grouped = {};
        topics.forEach(t => { grouped[t.id] = { topic: t, materials: [] }; });
        grouped['_unassigned'] = {
            topic: {
                id: '_unassigned',
                title: 'General Materials',
                description: 'Materials not assigned to any specific topic.',
                image: 'image/Topic.jpg',
                authorRole: 'Admin'
            },
            materials: []
        };

        const _seenGroupedMatKeys = new Set();
        filteredMaterials.forEach(m => {
            const matKey = String(m.id || m.title || '').trim().toLowerCase();
            if (matKey && _seenGroupedMatKeys.has(matKey)) return;
            if (matKey) _seenGroupedMatKeys.add(matKey);

            const matchesQuery = !query || (m.title || '').toLowerCase().includes(query) || (m.type || '').toLowerCase().includes(query);
            if (!matchesQuery) return;

            const tId = m.topicId && grouped[m.topicId] ? m.topicId : '_unassigned';
            if (grouped[tId]) grouped[tId].materials.push(m);
            else grouped['_unassigned'].materials.push(m);
        });

        window.expandedSubjectTopicIds = window.expandedSubjectTopicIds || {};

        let topicListToRender = [...topics];
        if (grouped['_unassigned'].materials.length > 0) {
            topicListToRender.push(grouped['_unassigned'].topic);
        }

        // In the combined Topics & Materials screen, keep topics that do not have files yet.
        if (!(window.usesCombinedSubjectContent && window.usesCombinedSubjectContent())) {
            topicListToRender = topicListToRender.filter(t => (grouped[t.id]?.materials?.length || 0) >= 1);
        }

        if (query) {
            topicListToRender = topicListToRender.filter(t => {
                const topicMats = grouped[t.id]?.materials || [];
                const matchesTopicName = (t.title || '').toLowerCase().includes(query);
                return topicMats.length > 0 || matchesTopicName;
            });

            if (topicListToRender.length === 0) {
                grid.innerHTML = `
                    <div class="flex flex-col items-center justify-center py-16 bg-slate-50/50 rounded-[32px] border-2 border-dashed border-slate-200 text-black-fade">
                        <i class="fa-solid fa-magnifying-glass sigma-empty-icon" aria-hidden="true"></i>
                        <p class="sigma-empty-title">No Materials Matching "${_escape(query)}"</p>
                    </div>
                `;
                return;
            }
        }

        if (topicListToRender.length === 0) {
            grid.innerHTML = '';
            if (empty) {
                empty.innerHTML = `
                    <i class="fa-solid fa-folder-open sigma-empty-icon" aria-hidden="true"></i>
                    <p class="sigma-empty-title">No Materials Added for ${QUARTER_LABELS[curQ] || curQ} Yet</p>
                `;
                empty.classList.remove('hidden');
                empty.style.removeProperty('display');
            }
            return;
        }

        let html = '';
        topicListToRender.forEach((topic, index) => {
            const grp = grouped[topic.id] || { topic, materials: [] };
            const rawRole = topic.authorRole || topic.role || (topic.isAdmin ? 'Admin' : (topic.isTeacher ? 'Teacher' : 'Admin'));
            const authorRole = normalizeSubjectAuthorRole(rawRole);
            let authorName = topic.authorName || '';
            if (authorRole === 'Admin') {
                if (!authorName || authorName.toLowerCase().includes('maria') || authorName.toLowerCase().includes('teacher')) {
                    authorName = getSubjectAdminAuthorName();
                }
            } else if (authorRole === 'Teacher') {
                if (!authorName) {
                    authorName = isTeacher ? (currentUserName || 'Maria Santos Ramos') : 'Teacher';
                }
            }
            const isOwnTopic = isCurrentUserAuthor(topic.authorId, topic.authorName, authorRole);

            // Default of topic panels should be closed (false)
            const isExpanded = window.expandedSubjectTopicIds[topic.id] !== undefined
                ? Boolean(window.expandedSubjectTopicIds[topic.id])
                : false;
            const panelActiveClasses = `bg-slate-50 border-slate-200/90 ${isExpanded ? '' : 'hover:bg-slate-100'} hover:border-slate-300 transition-all`;

            html += `
                <div id="subject-topic-panel-${topic.id}" class="${panelActiveClasses} border rounded-2xl font-['Inter'] shadow-2xs">
                    <!-- Topic Header Row (Full Width & Generous Clickable Target) -->
                    <div class="w-full flex items-center justify-between gap-2.5 sm:gap-4 px-3.5 py-3 sm:px-5 sm:py-4 cursor-pointer select-none transition-colors min-h-[52px] sm:min-h-[64px] ${isExpanded ? 'rounded-t-2xl' : 'rounded-2xl'} hover:bg-slate-100 active:bg-slate-200/60" onclick="window.toggleSubjectTopicDropdown('${topic.id}', event)">
                        <div class="flex items-center gap-2.5 sm:gap-4 min-w-0 flex-1">
                            <!-- Topic Number Badge -->
                            <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#15803d] text-white flex items-center justify-center text-[11px] sm:text-xs font-bold shrink-0 font-['Inter'] shadow-xs select-none">
                                ${topic.id === '_unassigned' ? '<i class="fa-solid fa-folder text-xs text-white"></i>' : (index + 1)}
                            </div>

                            <!-- Title & Subtitle Container -->
                            <div class="flex-1 min-w-0 pr-1 sm:pr-2 flex flex-col justify-center">
                                <div class="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                    <h4 class="text-sm sm:text-base font-medium text-black line-clamp-3 font-['Inter'] leading-snug">${_escape(topic.title || 'Untitled Topic')}</h4>
                                    ${isViewOnlyScope && authorRole === 'Teacher' ? `
                                        <span class="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200/80 rounded-md font-medium text-[10px] shrink-0">
                                            <i class="fa-solid fa-chalkboard-user mr-1 text-[9px]"></i>Teacher Topic
                                        </span>
                                    ` : ''}
                                </div>
                                <span class="text-[11px] sm:text-xs font-normal text-black-fade select-none whitespace-nowrap mt-0.5">${grp.materials.length} ${grp.materials.length === 1 ? 'Material' : 'Materials'}</span>
                            </div>
                        </div>

                        <!-- Right Actions: Chevron Toggle & Options -->
                        <div class="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
                            ${topic.id !== '_unassigned' && isOwnTopic ? `
                                <div class="relative shrink-0" onclick="event.stopPropagation()">
                                    <button type="button"
                                        onclick="window.toggleSharedKebabMenu(event, 'topic-row-menu-${encodeURIComponent(String(topic.id || ''))}')"
                                        title="Topic Options"
                                        class="mat-kebab-btn w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center cursor-pointer focus:outline-none bg-transparent hover:bg-slate-200/60 rounded-lg transition-colors">
                                        <i class="fa-solid fa-ellipsis-vertical text-sm sm:text-base pointer-events-none"></i>
                                    </button>
                                    <div id="topic-row-menu-${encodeURIComponent(String(topic.id || ''))}"
                                        class="shared-kebab-menu hidden absolute right-0 top-full mt-1.5 w-28 bg-white border border-slate-200/90 rounded-xl shadow-lg overflow-hidden z-[100] font-['Inter'] p-1 space-y-0.5 animate-in fade-in duration-150">
                                        <button type="button" onclick="window.editSubjectTopic(decodeURIComponent('${encodeURIComponent(String(topic.id || ''))}'))"
                                            class="w-full text-left px-2.5 py-1.5 hover:bg-slate-100 text-xs font-semibold text-black rounded-lg transition-colors flex items-center gap-2 cursor-pointer">
                                            <i class="fa-solid fa-pen text-xs text-black w-3.5 text-center"></i>
                                            <span>Edit</span>
                                        </button>
                                        <button type="button" onclick="window.removeSubjectTopic(decodeURIComponent('${encodeURIComponent(String(topic.id || ''))}'))"
                                            class="w-full text-left px-2.5 py-1.5 hover:bg-slate-100 text-xs font-semibold text-black rounded-lg transition-colors flex items-center gap-2 cursor-pointer">
                                            <i class="fa-solid fa-trash-can text-xs text-black w-3.5 text-center"></i>
                                            <span>Delete</span>
                                        </button>
                                    </div>
                                </div>
                            ` : ''}
                            <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-black pointer-events-none">
                                <i id="topic-chevron-${topic.id}" class="fa-solid fa-chevron-down text-xs sm:text-sm text-black transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}"></i>
                            </div>
                        </div>
                    </div>

                    <!-- Topic Materials Dropdown Content -->
                    <div id="topic-dropdown-${topic.id}" class="${isExpanded ? '' : 'hidden'} bg-slate-50 px-3.5 pb-3.5 pt-2.5 sm:px-5 sm:pb-5 sm:pt-3 border-t border-slate-200/80 space-y-2.5 sm:space-y-3 rounded-b-2xl">
                        ${grp.materials.length === 0 ? `
                            <div class="py-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-black-fade font-medium flex flex-col items-center justify-center gap-1">
                                <p class="sigma-empty-title">No Materials Inside This Topic Yet</p>
                            </div>
                        ` : `
                            <div class="space-y-2.5">
                                ${grp.materials.map(m => {
                                    const origIdx = (window.currentSubjectMaterials && window.currentSubjectMaterials.indexOf(m) >= 0)
                                        ? window.currentSubjectMaterials.indexOf(m)
                                        : ((Array.isArray(window.currentSubjectAllMaterials) && window.currentSubjectAllMaterials.indexOf(m) >= 0)
                                            ? window.currentSubjectAllMaterials.indexOf(m)
                                            : (m.id !== undefined && Array.isArray(window.currentSubjectAllMaterials)
                                                ? window.currentSubjectAllMaterials.findIndex(x => String(x.id) === String(m.id))
                                                : 0));
                                    const rawExt = (m.fileType || (m.fileName ? m.fileName.split('.').pop() : (m.url ? m.url.split('.').pop() : '')) || '').toLowerCase();
                                    
                                    const typeCfg = (typeof window.getSigmaMaterialTypeConfig === 'function')
                                        ? window.getSigmaMaterialTypeConfig(m.type)
                                        : {
                                            typeIcon: 'fa-file-lines',
                                            iconColorClass: 'text-blue-600',
                                            iconBoxClass: 'bg-blue-50 border border-blue-100',
                                            badgeClass: 'bg-blue-50 text-blue-600 border-blue-200/70',
                                            badgeTextClass: 'text-[10px] px-2.5 py-0.5 whitespace-nowrap'
                                        };

                                    const typeIcon = typeCfg.typeIcon;
                                    const iconColorClass = typeCfg.iconColorClass;
                                    const iconBoxClass = typeCfg.iconBoxClass;
                                    const badgeClass = typeCfg.badgeClass;
                                    const badgeTextClass = typeCfg.badgeTextClass;

                                    const rawRole = m.authorRole || m.role || (m.isAdmin ? 'Admin' : (m.isTeacher ? 'Teacher' : 'Admin'));
                                    const authorRole = normalizeSubjectAuthorRole(rawRole);
                                    let authorName = m.authorName || '';
                                    if (authorRole === 'Admin') {
                                        if (!authorName || authorName.toLowerCase().includes('maria') || authorName.toLowerCase().includes('teacher')) {
                                            authorName = getSubjectAdminAuthorName();
                                        }
                                    } else if (authorRole === 'Teacher') {
                                        if (!authorName) {
                                            authorName = isTeacher ? (currentUserName || 'Maria Santos Ramos') : 'Teacher';
                                        }
                                    }
                                    const isOwnMaterial = isCurrentUserAuthor(m.authorId, m.authorName, authorRole);
                                    const rawDate = m.createdAt || m.createdDate || m.date || m.timestamp || (m.createdTime ? new Date(m.createdTime).toISOString() : '');
                                    const createdDateFormatted = formatMaterialDate(rawDate);

                                    // View Scope Badge Logic:
                                    // Check if this material is a Teacher Addition (created by teacher OR has a teacher-uploaded rubric in this section)
                                    const scopeLabelStr = String(window.activeCurriculumScopeLabel || '').trim();
                                    const cleanScopeTeacherName = scopeLabelStr.replace(/\s*\(.*?\)\s*/g, '').trim();
                                    const scopeSecMatch = scopeLabelStr.match(/\(([^)]+)\)/);
                                    const scopeSecName = scopeSecMatch ? scopeSecMatch[1].trim() : '';

                                    let isTeacherAddition = (authorRole === 'Teacher');
                                    let displayTeacherName = authorRole === 'Teacher'
                                        ? (authorName || cleanScopeTeacherName || 'Teacher')
                                        : (cleanScopeTeacherName || authorName || 'Teacher');

                                    if (!isTeacherAddition && isViewOnlyScope) {
                                        try {
                                            const mIdStr = String(m.id || '').trim();
                                            const mTitleStr = String(m.title || m.name || '').trim().toLowerCase();
                                            const mCleanTitleStr = mTitleStr.replace(/\.(pdf|docx|pptx|ppt)$/i, '').trim();
                                            const scopeSubjId = String(window.originalEditingSubjectId || window.originalEditingSubjectCode || window.currentSubjectCode || window.currentSubjectData?.id || '').trim();
                                            const cleanScopeSubjId = scopeSubjId.toLowerCase().replace(/^(card-|subj-)/, '');

                                            const keysToScan = [];
                                            if (scopeSecName) {
                                                [
                                                    `sigma_assessment_release_${scopeSubjId}_${scopeSecName}`,
                                                    `sigma_assessment_release_${cleanScopeSubjId}_${scopeSecName}`,
                                                    `sigma_assessment_release_card-${cleanScopeSubjId}_${scopeSecName}`,
                                                    `sigma_teacher_rubrics_${scopeSubjId}_${scopeSecName}`,
                                                    `sigma_teacher_rubrics_${cleanScopeSubjId}_${scopeSecName}`,
                                                    `sigma_teacher_rubrics_card-${cleanScopeSubjId}_${scopeSecName}`
                                                ].forEach(k => { if (k.indexOf('__') < 0 && !keysToScan.includes(k)) keysToScan.push(k); });
                                            }

                                            for (const k of keysToScan) {
                                                const raw = localStorage.getItem(k);
                                                if (!raw) continue;
                                                const cfg = JSON.parse(raw);
                                                if (!cfg || typeof cfg !== 'object') continue;
                                                const rMap = cfg.assessmentRubrics || cfg.rubrics;
                                                if (!rMap || typeof rMap !== 'object') continue;

                                                const candKeys = [mIdStr, mTitleStr, mCleanTitleStr].filter(Boolean);
                                                for (const ck of candKeys) {
                                                    if (rMap[ck]) {
                                                        const rVal = rMap[ck];
                                                        const rName = typeof rVal === 'object' ? (rVal.fileName || rVal.name || '') : String(rVal);
                                                        if (rName && rName.trim() !== '') {
                                                            isTeacherAddition = true;
                                                            break;
                                                        }
                                                    }
                                                    for (const [mk, mv] of Object.entries(rMap)) {
                                                        if (!mv) continue;
                                                        const mkl = String(mk).trim().toLowerCase().replace(/\.(pdf|docx|pptx|ppt)$/i, '');
                                                        if (mkl === ck || (mIdStr && mkl === mIdStr)) {
                                                            const rName = typeof mv === 'object' ? (mv.fileName || mv.name || '') : String(mv);
                                                            if (rName && rName.trim() !== '') {
                                                                isTeacherAddition = true;
                                                                break;
                                                            }
                                                        }
                                                    }
                                                    if (isTeacherAddition) break;
                                                }
                                                if (isTeacherAddition) break;
                                            }
                                        } catch (_e) {}
                                    }

                                    const isSharedAdminMat = false;
                                    const matIdentifier = m.id || origIdx;

                                    return `
                                        <div class="sigma-attached-file-panel sigma-black-fade-panel group relative rounded-2xl p-4 sm:p-5 shadow-2xs transition-all flex items-center justify-between gap-4 font-['Inter'] select-none">
                                            <div class="mat-card-left flex items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
                                                <div class="material-panel-icon-group mat-icon-col w-16 sm:w-20 flex flex-col items-center gap-1.5 shrink-0 select-none">
                                                    <div class="mat-icon-box w-12 h-12 rounded-2xl ${iconBoxClass} flex items-center justify-center shrink-0 shadow-2xs">
                                                        <i class="fa-solid ${typeIcon} text-xl ${iconColorClass}"></i>
                                                    </div>
                                                    <span class="mat-type-badge ${badgeTextClass} ${badgeClass} border font-medium rounded-md leading-tight inline-flex items-center justify-center text-center capitalize">${_escape(m.type)}</span>
                                                </div>
                                                <div class="min-w-0 flex-1 flex flex-col justify-center">
                                                    <h4 onclick="window.viewSubjectMaterial('${matIdentifier}')"
                                                        class="sigma-file-panel-title sigma-file-panel-title--clickable text-sm sm:text-base font-medium text-black hover:text-[#FFD000] transition-colors line-clamp-3 font-['Inter'] cursor-pointer w-fit max-w-full leading-snug">${_escape(m.title || 'Untitled Material')}</h4>
                                                    <div class="flex items-center gap-2 text-[11px] font-normal text-black-fade mt-1.5 font-['Inter'] flex-wrap">
                                                        ${isViewOnlyScope ? (
                                                            isTeacherAddition
                                                                ? `<span class="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200/80 rounded-md font-medium text-[10px]"><i class="fa-solid fa-chalkboard-user mr-1 text-[9px]"></i>Teacher Addition: ${_escape(displayTeacherName)}</span>`
                                                                : `<span class="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200/80 rounded-md font-medium text-[10px]"><i class="fa-solid fa-shield-halved mr-1 text-[9px]"></i>Master Syllabus</span>`
                                                        ) : isTeacher ? `
                                                            <span class="px-1.5 py-0.5 bg-black/5 text-black-fade rounded font-medium text-[10px]">${authorRole === 'Teacher' ? 'Teacher' : 'Admin'}</span>
                                                        ` : `
                                                            ${authorRole === 'Teacher' ? `<span class="px-1.5 py-0.5 bg-black/5 text-black-fade rounded font-medium text-[10px]">Teacher</span>` : ''}
                                                            ${authorName ? `
                                                                <span class="text-black-fade font-medium">${_escape(authorName)}</span>
                                                            ` : ''}
                                                        `}
                                                        <span class="text-black-fade text-[11px] font-normal flex items-center gap-1.5"><i class="fa-regular fa-calendar text-[10px]"></i> ${createdDateFormatted}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            ${(!isViewOnlyScope && isOwnMaterial) ? `
                                                <div class="relative shrink-0" onclick="event.stopPropagation()">
                                                    <button type="button"
                                                        id="mat-kebab-btn-${origIdx}"
                                                        onclick="window.toggleSharedKebabMenu(event, 'mat-kebab-menu-${origIdx}')"
                                                        title="Material Options"
                                                        class="mat-kebab-btn w-8 h-8 flex items-center justify-center cursor-pointer text-black focus:outline-none bg-transparent">
                                                        <i class="fa-solid fa-ellipsis-vertical text-base text-black"></i>
                                                    </button>
                                                    <!-- Kebab Dropdown Menu -->
                                                    <div id="mat-kebab-menu-${origIdx}"
                                                        class="shared-kebab-menu hidden absolute right-0 top-full mt-1.5 w-36 bg-white border border-slate-200/90 rounded-xl shadow-lg overflow-hidden z-[100] font-['Inter'] p-1 space-y-0.5 animate-in fade-in duration-150">
                                                        <button type="button" onclick="window.addSubjectMaterial('', false, ${origIdx}, decodeURIComponent('${encodeURIComponent(String(m.id || ''))}'))"
                                                            class="w-full text-left px-2.5 py-1.5 hover:bg-slate-100 text-xs font-semibold text-black rounded-lg transition-colors flex items-center gap-2 cursor-pointer">
                                                            <i class="fa-solid fa-pen text-xs text-black w-3.5 text-center"></i>
                                                            <span class="text-black">Edit Material</span>
                                                        </button>
                                                        <button type="button" onclick="window.removeSubjectMaterial(${origIdx})"
                                                            class="w-full text-left px-2.5 py-1.5 hover:bg-slate-100 text-xs font-semibold text-black rounded-lg transition-colors flex items-center gap-2 cursor-pointer">
                                                            <i class="fa-solid fa-trash-can text-xs text-black w-3.5 text-center"></i>
                                                            <span class="text-black">Delete Material</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            ` : ''}
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        `}
                    </div>
                </div>
            `;
        });

        grid.innerHTML = html;
        ensureSubjectStepBottomButtonsInDom();
        if (typeof window.checkSubjectFormValidity === 'function') {
            window.checkSubjectFormValidity();
        }
    };

    function resolveMaterialRubric(m, subjId) {
        if (!m || typeof m !== 'object') return null;
        const isQuizType = m.type === 'Quiz' || String(m.type || '').toLowerCase().includes('quiz') || m.category === 'Quiz';
        if (isQuizType) return null;

        const isTeacherEditor = typeof isCurrentEditorTeacher === 'function' ? isCurrentEditorTeacher() : false;
        const isViewScope = Boolean(window.activeCurriculumScope && window.activeCurriculumScope !== 'master');
        const mRole = m.authorRole || m.role || (m.isAdmin ? 'Admin' : (m.isTeacher ? 'Teacher' : ''));
        const isMatAdmin = (typeof normalizeSubjectAuthorRole === 'function' ? normalizeSubjectAuthorRole(mRole) : mRole) === 'Admin';

        // The rubric stored on an admin material belongs to that material.
        // View Material and Edit Material keep showing it after a teacher saves a section.
        if (isMatAdmin) {
            const ownName = m.rubricFileName || m.perfRubricFileName || m.rubricName || (typeof m.rubric === 'string' ? m.rubric : (m.rubric?.fileName || '')) || '';
            const ownUrl = m.rubricUrl || m.perfRubricUrl || (typeof m.rubric === 'object' ? (m.rubric?.url || m.rubric?.fileUrl || '') : '') || '';
            return ownName ? { name: ownName, url: ownUrl } : null;
        }

        let rubricName = m.rubricFileName || m.perfRubricFileName || m.rubricName || (typeof m.rubric === 'string' ? m.rubric : (m.rubric?.fileName || '')) || '';
        let rubricUrl = m.rubricUrl || m.perfRubricUrl || (typeof m.rubric === 'object' ? (m.rubric?.url || m.rubric?.fileUrl || '') : '') || '';

        if (rubricName && rubricUrl) {
            return { name: rubricName, url: rubricUrl };
        }

        const curSubj = window.currentSubjectData || window.editingSubjectData;
        const effSubjId = subjId || curSubj?.code || curSubj?.id || window.currentSubjectCode || window.originalEditingSubjectCode || window.originalEditingSubjectId || (typeof currentTopicState !== 'undefined' ? currentTopicState?.subjectId : '') || 'card-prog1';
        const cleanSubjId = String(effSubjId).trim().toLowerCase().replace(/^(card-|subj-)/, '');

        const mId = String(m.id || '').trim();
        const mOrigId = String(m.originalAdminId || '').trim();
        const mTitle = String(m.title || m.name || '').trim();
        const mCleanTitle = mTitle.replace(/\.(pdf|docx|pptx|ppt)$/i, '').trim();

        const candKeys = [
            mId,
            mOrigId,
            mTitle,
            mCleanTitle,
            mTitle.toLowerCase(),
            mCleanTitle.toLowerCase()
        ].filter(Boolean);

        // Helper to extract rubric from any rMap
        const findRubricInMap = (rMap, rUrls) => {
            if (!rMap || typeof rMap !== 'object') return null;
            // 1. Direct key match
            for (const k of candKeys) {
                if (rMap[k] !== undefined || rMap[k.toLowerCase()] !== undefined) {
                    const val = rMap[k] !== undefined ? rMap[k] : rMap[k.toLowerCase()];
                    if (!val) continue;
                    const name = typeof val === 'object' ? (val.fileName || val.title || val.name || '') : String(val);
                    let url = rUrls ? (rUrls[k] || rUrls[k.toLowerCase()] || '') : '';
                    if (!url && typeof val === 'object') url = val.url || val.fileUrl || '';
                    return { name, url: typeof url === 'object' ? (url.url || url.fileUrl || '') : String(url || '') };
                }
            }
            // 2. Fuzzy/clean key match
            const mCleanLow = mCleanTitle.toLowerCase();
            for (const [k, v] of Object.entries(rMap)) {
                if (!v) continue;
                const cleanK = String(k).trim().toLowerCase().replace(/\.(pdf|docx|pptx|ppt)$/i, '');
                if (cleanK === mCleanLow || (mCleanLow && cleanK.includes(mCleanLow)) || (mCleanLow && mCleanLow.includes(cleanK)) || (mId && cleanK === mId.toLowerCase()) || (mOrigId && cleanK === mOrigId.toLowerCase())) {
                    const name = typeof v === 'object' ? (v.fileName || v.title || v.name || '') : String(v);
                    let url = rUrls ? (rUrls[k] || rUrls[cleanK] || '') : '';
                    if (!url && typeof v === 'object') url = v.url || v.fileUrl || '';
                    return { name, url: typeof url === 'object' ? (url.url || url.fileUrl || '') : String(url || '') };
                }
            }
            // 3. If there is only one entry in rMap, and we're looking for an assessment rubric, use it
            const mapEntries = Object.entries(rMap).filter(([k, v]) => Boolean(v));
            if (mapEntries.length === 1) {
                const [singleK, singleV] = mapEntries[0];
                const name = typeof singleV === 'object' ? (singleV.fileName || singleV.title || singleV.name || '') : String(singleV);
                let url = rUrls ? (rUrls[singleK] || '') : '';
                if (!url && typeof singleV === 'object') url = singleV.url || singleV.fileUrl || '';
                if (name) return { name, url: typeof url === 'object' ? (url.url || url.fileUrl || '') : String(url || '') };
            }
            return null;
        };

        // 1. Check teacher match in all materials strictly for current section
        let activeSection = '';
        if (isViewScope && window.activeCurriculumScopeLabel) {
            const match = String(window.activeCurriculumScopeLabel).match(/\(([^)]+)\)/);
            if (match && match[1]) activeSection = match[1].trim();
        }
        if (!activeSection) {
            activeSection = (typeof currentTopicState !== 'undefined' && currentTopicState?.selectedSection)
                ? currentTopicState.selectedSection
                : (typeof resolveTeacherActiveSection === 'function' ? resolveTeacherActiveSection() : '') ||
                  localStorage.getItem('sigma-active-classroom-section') || '';
        }
        const cleanActiveSec = String(activeSection || '').trim().toLowerCase();

        const allMats = (Array.isArray(window.currentSubjectAllMaterials) && window.currentSubjectAllMaterials.length > 0)
            ? window.currentSubjectAllMaterials
            : (window.currentSubjectMaterials || []);

        for (const other of allMats) {
            if (!other) continue;
            const otherSec = String(other.section || other.roomSection || '').trim().toLowerCase();
            const otherRole = other.authorRole || other.role || (other.isTeacher ? 'Teacher' : (other.isAdmin ? 'Admin' : ''));
            const isOtherTeacher = otherRole === 'Teacher' || other.isTeacher;
            if (isOtherTeacher && otherSec && cleanActiveSec && otherSec !== 'all' && otherSec !== cleanActiveSec && !otherSec.includes(cleanActiveSec) && !cleanActiveSec.includes(otherSec)) {
                continue; // Do not pull teacher rubrics from other sections
            }
            const otherId = String(other.id || '');
            const otherAdminId = String(other.originalAdminId || '');
            const otherTitle = String(other.title || other.name || '').trim().toLowerCase();
            const isMatch = (other !== m) && (
                (mId && (otherId === mId || otherAdminId === mId)) ||
                (mOrigId && (otherId === mOrigId || otherAdminId === mOrigId)) ||
                (mTitle && otherTitle === mTitle.toLowerCase()) ||
                (mCleanTitle && otherTitle === mCleanTitle.toLowerCase())
            );
            if (isMatch) {
                const oName = other.rubricFileName || other.perfRubricFileName || other.rubricName || (typeof other.rubric === 'string' ? other.rubric : (other.rubric?.fileName || ''));
                const oUrl = other.rubricUrl || other.perfRubricUrl || (typeof other.rubric === 'object' ? (other.rubric?.url || other.rubric?.fileUrl) : '');
                if (oName && !rubricName) rubricName = oName;
                if (oUrl && !rubricUrl) rubricUrl = oUrl;
                if (rubricName && rubricUrl) return { name: rubricName, url: rubricUrl };
            }
        }

        // 2. Check getAssessmentReleaseConfig strictly for activeSection
        if (activeSection && typeof window.getAssessmentReleaseConfig === 'function') {
            const subjsToCheck = [effSubjId, cleanSubjId, `card-${cleanSubjId}`].filter(Boolean);
            for (const sId of subjsToCheck) {
                try {
                    const cfg = window.getAssessmentReleaseConfig(sId, activeSection);
                    const match = findRubricInMap(cfg?.assessmentRubrics || cfg?.rubrics, cfg?.assessmentRubricUrls || cfg?.rubricUrls);
                    if (match && match.name) {
                        rubricName = match.name;
                        rubricUrl = match.url || rubricUrl;
                        break;
                    }
                    if (!rubricName && cfg?._uploadedRubricName) {
                        rubricName = cfg._uploadedRubricName;
                        rubricUrl = cfg._uploadedRubricUrl || rubricUrl;
                        break;
                    }
                } catch (e) {}
            }
        }

        // 3. Check active drafts in memory matching activeSection
        if (!rubricName && activeSection) {
            try {
                const drafts = [window._curriculumReleaseDraft, window._activeReleaseDraft];
                for (const d of drafts) {
                    if (!d || typeof d !== 'object') continue;
                    const dSec = String(d._section || d.section || '').trim().toLowerCase();
                    if (dSec && cleanActiveSec && dSec !== cleanActiveSec && !dSec.includes(cleanActiveSec) && !cleanActiveSec.includes(dSec)) {
                        continue;
                    }
                    const match = findRubricInMap(d.assessmentRubrics || d.rubrics, d.assessmentRubricUrls || d.rubricUrls);
                    if (match && match.name) {
                        rubricName = match.name;
                        rubricUrl = match.url || d._uploadedRubricUrl || rubricUrl;
                        break;
                    }
                    if (!rubricName && d._uploadedRubricName) {
                        rubricName = d._uploadedRubricName;
                        rubricUrl = d._uploadedRubricUrl || rubricUrl;
                        break;
                    }
                }
            } catch (e) {}
        }

        if (rubricName) {
            return { name: rubricName, url: rubricUrl };
        }
        return null;
    }
    window.resolveMaterialRubric = resolveMaterialRubric;

    window.viewSubjectMaterial = function (indexOrId) {
        let m = null;
        let index = -1;

        const allMats = (Array.isArray(window.currentSubjectAllMaterials) && window.currentSubjectAllMaterials.length > 0)
            ? window.currentSubjectAllMaterials
            : (window.currentSubjectMaterials || []);

        if (typeof indexOrId === 'string') {
            index = allMats.findIndex(item => String(item.id) === String(indexOrId));
            if (index >= 0) {
                m = allMats[index];
            } else if (!Number.isNaN(Number(indexOrId))) {
                const numIdx = Number(indexOrId);
                m = allMats[numIdx] || (window.currentSubjectMaterials && window.currentSubjectMaterials[numIdx]);
                index = numIdx;
            }
        } else if (typeof indexOrId === 'number') {
            index = indexOrId;
            m = allMats[index] || (window.currentSubjectMaterials && window.currentSubjectMaterials[index]);
        }
        if (!m) return;

        // Close kebab dropdown if open
        document.querySelectorAll('.shared-kebab-menu').forEach(menu => menu.classList.add('hidden'));

        const step3 = document.getElementById('subject-step-3');
        const detailView = document.getElementById('subject-material-detail-view');
        const mainView = document.getElementById('subject-materials-main-view');
        const grid = document.getElementById('subject-materials-grid');
        const empty = document.getElementById('subject-materials-empty');
        const editorView = document.getElementById('subject-material-editor-view');
        const modalHeader = document.getElementById('subject-modal-header');
        const segmentedHeader = document.getElementById('subject-segmented-header');
        const isTeacher = isCurrentEditorTeacher();
        const isViewOnlyScope = !isTeacher && window.activeCurriculumScope && window.activeCurriculumScope !== 'master';

        // Hide segmented step navigation bar when viewing material
        if (segmentedHeader) {
            segmentedHeader.classList.add('hidden');
            segmentedHeader.style.setProperty('display', 'none', 'important');
        }

        // Configure header title as "View Material" and show back button
        window.syncSubjectModalHeader({
            title: 'View Material',
            showBack: true,
            showActions: true,
            showStatus: false,
            showExit: false
        });

        const currentUser = getCurrentEditorUser();
        const currentUserName = currentUser ? (`${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.name || '') : '';
        const rawRole = m.authorRole || m.role || (m.isAdmin ? 'Admin' : (m.isTeacher ? 'Teacher' : 'Admin'));
        const authorRole = normalizeSubjectAuthorRole(rawRole);
        let authorName = m.authorName || '';
        if (authorRole === 'Admin') {
            if (!authorName || authorName.toLowerCase().includes('maria') || authorName.toLowerCase().includes('teacher')) {
                authorName = getSubjectAdminAuthorName();
            }
        } else if (authorRole === 'Teacher') {
            if (!authorName) {
                authorName = isTeacher ? (currentUserName || 'Maria Santos Ramos') : 'Teacher';
            }
        }
        const isOwnMaterial = isCurrentUserAuthor(m.authorId, m.authorName || authorName, authorRole);

        // Configure top header actions: Edit Material button is now placed in the footer
        document.getElementById('subject-split-btn-group')?.classList.add('hidden');
        document.getElementById('subject-delete-btn')?.classList.add('hidden');
        const headerEditMatBtn = document.getElementById('subject-header-edit-mat-btn');
        if (headerEditMatBtn) {
            headerEditMatBtn.classList.add('hidden');
            headerEditMatBtn.style.setProperty('display', 'none', 'important');
        }

        // Hide main list, topics grid, and editor view
        if (mainView) {
            mainView.classList.add('hidden');
            mainView.style.setProperty('display', 'none', 'important');
        }
        if (grid) {
            grid.classList.add('hidden');
            grid.style.setProperty('display', 'none', 'important');
        }
        if (empty) {
            empty.classList.add('hidden');
            empty.style.setProperty('display', 'none', 'important');
        }
        if (editorView) {
            editorView.classList.add('hidden');
            editorView.style.setProperty('display', 'none', 'important');
        }

        // Show only step 3 container and detail view
        if (step3) {
            step3.classList.remove('hidden');
            step3.style.removeProperty('display');
            step3.style.setProperty('display', 'block', 'important');
        }
        if (detailView) {
            detailView.classList.remove('hidden');
            detailView.style.removeProperty('display');
            detailView.style.setProperty('display', 'block', 'important');
        }

        window._currentDetailMaterialIndex = index;
        window._currentDetailMaterialId = m.id || '';
        window._currentDetailMaterialTopicId = m.topicId || '_unassigned';
        if (m.quarter) {
            window.currentSubjectMaterialQuarter = normalizeQuarterKey(m.quarter);
        } else if (m.topicId && m.topicId !== '_unassigned') {
            const allCurTopics = (window.currentSubjectAllTopics && window.currentSubjectAllTopics.length > 0)
                ? window.currentSubjectAllTopics
                : (window.currentSubjectTopics || []);
            const parentTopic = allCurTopics.find(t => String(t.id) === String(m.topicId));
            if (parentTopic && parentTopic.quarter) {
                window.currentSubjectMaterialQuarter = normalizeQuarterKey(parentTopic.quarter);
            }
        }
        if (!window.expandedSubjectTopicIds) window.expandedSubjectTopicIds = {};
        window.expandedSubjectTopicIds[window._currentDetailMaterialTopicId] = true;

        // Show the bottom footer with Back button and Edit Material button
        window.setSubjectFooterBackButton('mat-detail-back-btn');
        const globalFooter = document.getElementById('subject-global-footer');
        if (globalFooter) {
            globalFooter.classList.remove('hidden');
            globalFooter.style.removeProperty('display');
            globalFooter.style.display = 'flex';
        }
        const matDetailEditBtn = document.getElementById('mat-detail-edit-btn');
        if (matDetailEditBtn) {
            if (isViewOnlyScope || !isOwnMaterial) {
                matDetailEditBtn.classList.add('hidden');
                matDetailEditBtn.style.setProperty('display', 'none', 'important');
            } else {
                matDetailEditBtn.classList.remove('hidden');
                matDetailEditBtn.style.removeProperty('display');
                matDetailEditBtn.style.display = 'inline-flex';
            }
        }
        const matDetailBackBtn = document.getElementById('mat-detail-back-btn');
        if (matDetailBackBtn) {
            matDetailBackBtn.classList.remove('hidden');
            matDetailBackBtn.style.removeProperty('display');
            matDetailBackBtn.style.display = 'inline-flex';
        }

        const _detailModalFooter = document.getElementById('subject-modal-footer');
        if (_detailModalFooter) {
            _detailModalFooter.classList.add('hidden');
            _detailModalFooter.style.setProperty('display', 'none', 'important');
        }
        document.getElementById('subject-draft-btn')?.classList.add('hidden');
        document.getElementById('subject-save-btn')?.classList.add('hidden');
        document.getElementById('subject-next-btn')?.classList.add('hidden');
        document.getElementById('subject-add-another-btn')?.classList.add('hidden');
        document.getElementById('topic-editor-add-another-btn')?.classList.add('hidden');
        document.getElementById('topic-editor-save-btn')?.classList.add('hidden');
        document.getElementById('mat-editor-add-another-btn')?.classList.add('hidden');
        document.getElementById('mat-editor-delete-btn')?.classList.add('hidden');
        document.getElementById('mat-editor-save-btn')?.classList.add('hidden');
        document.getElementById('subject-step2-prev-btn')?.classList.add('hidden');
        document.getElementById('subject-step3-bottom-actions')?.classList.add('hidden');

        // Scroll overlay and body to top immediately
        const _ov = document.getElementById('subject-edit-overlay') || document.querySelector('.sigma-modal-overlay:not(.hidden)');
        if (_ov) { _ov.scrollTop = 0; }
        const _bodyEl = document.getElementById('subject-edit-form-body');
        if (_bodyEl) { _bodyEl.scrollTop = 0; }

        const rawType = (m.fileType || (m.fileName ? m.fileName.split('.').pop() : (m.url ? m.url.split('.').pop() : '')) || 'docx').toLowerCase();
        const typeCfg = (typeof window.getSigmaMaterialTypeConfig === 'function')
            ? window.getSigmaMaterialTypeConfig(m.type || m.category || 'Lesson')
            : null;
        let badgeClass = typeCfg?.badgeClass || 'bg-blue-50 text-blue-600 border-blue-200/70';
        let typeIcon = typeCfg?.typeIcon || 'fa-file-lines';
        let typeLabel = m.type || typeCfg?.type || 'Lesson';

        if (m.type === 'Video') {
            badgeClass = 'bg-red-50 text-red-600 border-red-200/70';
            typeIcon = 'fa-circle-play';
            typeLabel = 'Video Lesson';
        } else if (m.type === 'Lesson') {
            badgeClass = 'bg-blue-50 text-blue-600 border-blue-200/70';
            typeIcon = 'fa-file-lines';
            typeLabel = 'Lesson';
        } else if (m.type === 'Quiz') {
            badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200/70';
            typeIcon = 'fa-stopwatch';
            typeLabel = 'Quiz';
        } else if (m.type === 'Task' || m.type === 'Assignment' || m.type === 'Activity' || m.type === 'Performance Task') {
            badgeClass = 'bg-amber-50 text-amber-700 border-amber-200/70';
            typeIcon = 'fa-clipboard-list';
            typeLabel = 'Task';
        }

        const instructions = (m.description || m.instructions || m.summary || '').trim();
        const displayTitle = m.title || 'Material Document';
        const hasDescription = Boolean(instructions && instructions !== 'No instructions provided.' && instructions !== 'No description provided.');
        const rawDate = m.createdAt || m.createdDate || m.date || m.timestamp || (m.createdTime ? new Date(m.createdTime).toISOString() : '');
        const createdDateFormatted = formatMaterialDate(rawDate);

        // 2. Rubric Attached Section
        // Pre-patch: pull rubric from any saved assessment release config in localStorage
        // so it always shows even if resolveMaterialRubric misses it due to subject-ID filtering
        // Pre-patch: pull rubric from any saved assessment release config in localStorage.
        // Only applies when: (a) viewing as teacher, OR (b) admin is in a View Scope (specific teacher section).
        // Admin in master syllabus view must NOT see teacher-uploaded rubrics.
        const _isTeacherCtx = (typeof isCurrentEditorTeacher === 'function') ? isCurrentEditorTeacher() : false;
        const _isViewScopeCtx = Boolean(window.activeCurriculumScope && window.activeCurriculumScope !== 'master');
        const _viewRole = m.authorRole || m.role || (m.isAdmin ? 'Admin' : (m.isTeacher ? 'Teacher' : ''));
        const _viewIsAdminMat = (typeof normalizeSubjectAuthorRole === 'function' ? normalizeSubjectAuthorRole(_viewRole) : _viewRole) === 'Admin';
        if (!_viewIsAdminMat && (_isTeacherCtx || _isViewScopeCtx) && !m.rubricFileName && !m.hasRubric && m.type !== 'Quiz' && !String(m.type || '').toLowerCase().includes('quiz') && !String(m.category || '').toLowerCase().includes('quiz')) {
            try {
                const mIdStr = String(m.id || '').trim();
                const mTitleStr = String(m.title || m.name || '').trim().toLowerCase();
                const mCleanTitleStr = mTitleStr.replace(/\.(pdf|docx|pptx|ppt)$/i, '').trim();

                // Only scan release keys matching the active section (in view scope or teacher context)
                let _keysToScan = [];
                let _targetSection = '';
                if (_isViewScopeCtx && window.activeCurriculumScopeLabel) {
                    const _sectionMatch = String(window.activeCurriculumScopeLabel).match(/\(([^)]+)\)/);
                    if (_sectionMatch && _sectionMatch[1]) _targetSection = _sectionMatch[1].trim();
                } else if (_isTeacherCtx) {
                    _targetSection = (typeof currentTopicState !== 'undefined' && currentTopicState?.selectedSection)
                        ? currentTopicState.selectedSection
                        : (typeof resolveTeacherActiveSection === 'function' ? resolveTeacherActiveSection() : '') ||
                          localStorage.getItem('sigma-active-classroom-section') || '';
                }

                const _scopeSubjId = String(window.originalEditingSubjectId || window.originalEditingSubjectCode || window.currentSubjectCode || window.currentSubjectData?.id || '').trim();
                const _cleanScopeSubjId = _scopeSubjId.toLowerCase().replace(/^(card-|subj-)/, '');

                if (_targetSection) {
                    [
                        `sigma_assessment_release_${_scopeSubjId}_${_targetSection}`,
                        `sigma_assessment_release_${_cleanScopeSubjId}_${_targetSection}`,
                        `sigma_assessment_release_card-${_cleanScopeSubjId}_${_targetSection}`,
                    ].forEach(k => { if (k.indexOf('__') < 0 && !_keysToScan.includes(k)) _keysToScan.push(k); });
                }

                const _scanKey = (k) => {
                    if (!k) return false;
                    try {
                        const _raw = localStorage.getItem(k);
                        if (!_raw) return false;
                        const _cfg = JSON.parse(_raw);
                        if (!_cfg || typeof _cfg !== 'object') return false;
                        const _rMap = _cfg.assessmentRubrics || _cfg.rubrics;
                        const _rUrls = _cfg.assessmentRubricUrls || _cfg.rubricUrls;
                        if (!_rMap || typeof _rMap !== 'object') {
                            return false;
                        }
                        // Try to match by id or title
                        const _candKeys = [mIdStr, mTitleStr, mCleanTitleStr].filter(Boolean);
                        let _found = null;
                        for (const _ck of _candKeys) {
                            if (_rMap[_ck] !== undefined) { _found = { name: String(_rMap[_ck]), url: _rUrls ? (String(_rUrls[_ck] || '')) : '' }; break; }
                            // case-insensitive scan
                            for (const [_mk, _mv] of Object.entries(_rMap)) {
                                if (!_mv) continue;
                                const _mkl = String(_mk).trim().toLowerCase().replace(/\.(pdf|docx|pptx|ppt)$/i, '');
                                if (_mkl === _ck || (mIdStr && _mkl === mIdStr)) {
                                    const _n = typeof _mv === 'object' ? (_mv.fileName || _mv.name || '') : String(_mv);
                                    const _u = _rUrls ? (String(_rUrls[_mk] || _rUrls[_mkl] || '')) : '';
                                    _found = { name: _n, url: _u }; break;
                                }
                            }
                            if (_found) break;
                        }
                        if (_found && _found.name) {
                            m.rubricFileName = _found.name;
                            m.hasRubric = true;
                            if (_found.url) m.rubricUrl = _found.url;
                            if (_isViewScopeCtx) m._rubricInjectedByViewScope = true;
                            return true;
                        }
                    } catch (_e) {}
                    return false;
                };

                if (_keysToScan.length > 0) {
                    for (const _k of _keysToScan) {
                        if (_scanKey(_k)) break;
                    }
                }
            } catch (_e) {}
        }

        let rubricHtml = '';
        const isMatQuiz = m.type === 'Quiz' || String(m.type || '').toLowerCase().includes('quiz') || String(m.category || '').toLowerCase().includes('quiz');

        // In pure admin master view (not teacher, not view scope), clear any teacher-rubric
        // fields that were mutated onto the material object during a prior View Scope scan.
        // Without this reset, ghost rubrics appear after returning from View Scope.
        const _isMasterAdminView = !_isTeacherCtx && !_isViewScopeCtx;
        if (_isMasterAdminView) {
            const _mRawRole = m.authorRole || m.role || (m.isAdmin ? 'Admin' : (m.isTeacher ? 'Teacher' : 'Admin'));
            const _mIsAdmin = (typeof normalizeSubjectAuthorRole === 'function' ? normalizeSubjectAuthorRole(_mRawRole) : _mRawRole) === 'Admin';
            if (_mIsAdmin) {
                // Clear scan-mutated fields — the original material data had no teacher rubric
                if (m._rubricInjectedByViewScope) {
                    m.rubricFileName = '';
                    m.hasRubric = false;
                    m.rubricUrl = '';
                    delete m._rubricInjectedByViewScope;
                }
            }
        }

        const rInfo = !isMatQuiz ? resolveMaterialRubric(m, window.originalEditingSubjectId || window.originalEditingSubjectCode) : null;
        // In master admin view: only show rubric from rInfo (admin-created rubrics).
        // Never show m.rubricFileName on admin materials in master view — it may have been
        // set by a View Scope scan and must not bleed through.
        let rubricTitle, rubricUrl;
        if (isMatQuiz) {
            rubricTitle = '';
            rubricUrl = '';
        } else if (_isMasterAdminView) {
            const _mRawRole2 = m.authorRole || m.role || (m.isAdmin ? 'Admin' : (m.isTeacher ? 'Teacher' : 'Admin'));
            const _mIsAdmin2 = (typeof normalizeSubjectAuthorRole === 'function' ? normalizeSubjectAuthorRole(_mRawRole2) : _mRawRole2) === 'Admin';
            if (_mIsAdmin2) {
                // Admin master view: only trust rInfo (admin-created rubric), never teacher-uploaded
                rubricTitle = rInfo?.name || '';
                rubricUrl = rInfo?.url || '';
            } else {
                rubricTitle = rInfo?.name || m.rubricFileName || m.perfRubricFileName || (typeof m.rubric === 'string' && m.rubric ? m.rubric : (m.rubric?.fileName || m.rubric?.title || ''));
                rubricUrl = rInfo?.url || m.rubricUrl || (m.rubric?.url || m.rubric?.fileUrl || '');
            }
        } else {
            rubricTitle = rInfo?.name || m.rubricFileName || m.perfRubricFileName || (typeof m.rubric === 'string' && m.rubric ? m.rubric : (m.rubric?.fileName || m.rubric?.title || ''));
            rubricUrl = rInfo?.url || m.rubricUrl || (m.rubric?.url || m.rubric?.fileUrl || '');
        }

        const hasRubric = !isMatQuiz && Boolean(rubricTitle || m.hasRubric);
        if (hasRubric) {
            if (!rubricTitle) rubricTitle = 'Grading Rubric Criteria';
            const rubricExt = (rubricTitle.split('.').pop() || 'pdf').toLowerCase();

            const isTeacherEditor = typeof isCurrentEditorTeacher === 'function' ? isCurrentEditorTeacher() : false;
            const canAdminDeleteRubric = !isTeacherEditor;
            const rubricIdentifier = m.id || origIdx || index || 0;

            const rubricCardHtml = typeof window.renderSharedAttachedFilePanelHtml === 'function'
                ? window.renderSharedAttachedFilePanelHtml({
                    title: rubricTitle,
                    url: rubricUrl,
                    type: rubricExt,
                    badgeText: 'RUBRIC',
                    badgeClassOverride: 'bg-emerald-50 border-emerald-200/70 text-[#15803d]',
                    iconClassOverride: 'fa-file-circle-check text-[#15803d]',
                    onClick: `window.previewEditorFile('rubric')`,
                    showKebab: canAdminDeleteRubric,
                    kebabMenuId: `rubric-kebab-menu-${rubricIdentifier}`,
                    kebabMenuItems: [
                        {
                            label: 'Delete Rubric',
                            icon: 'fa-solid fa-trash-can text-black',
                            isDanger: false,
                            onClick: `window.deleteRubricFromMaterial('${rubricIdentifier}', event)`
                        }
                    ]
                })
                : `
                    <div class="sigma-attached-file-panel sigma-black-fade-panel group relative rounded-2xl p-4 sm:p-5 shadow-2xs transition-all flex items-center justify-between gap-4 font-['Inter'] select-none">
                        <div class="flex items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
                            <div class="w-16 sm:w-20 flex flex-col items-center gap-1.5 shrink-0 select-none">
                                <div class="w-12 h-12 rounded-2xl bg-white border border-slate-200/80 flex items-center justify-center shrink-0 shadow-2xs">
                                    <i class="fa-solid fa-file-circle-check text-xl text-[#15803d]"></i>
                                </div>
                                <span class="px-2.5 py-0.5 bg-emerald-50 border border-emerald-200/70 text-[#15803d] font-bold rounded-md text-[10px] leading-tight inline-flex items-center justify-center text-center uppercase whitespace-nowrap">${_escape('RUBRIC')}</span>
                            </div>
                            <div class="min-w-0 flex-1 flex flex-col justify-center">
                                <h4 onclick="window.previewEditorFile('rubric')" class="sigma-file-panel-title sigma-file-panel-title--clickable text-[12px] sm:text-[19px] font-bold text-black hover:text-[#FFD000] transition-colors truncate leading-snug font-['Inter'] cursor-pointer w-fit max-w-full">${_escape(rubricTitle)}</h4>
                            </div>
                        </div>
                        ${canAdminDeleteRubric ? `
                            <div class="relative shrink-0" onclick="event.stopPropagation()">
                                <button type="button"
                                    id="rubric-kebab-btn-${rubricIdentifier}"
                                    onclick="window.toggleSharedKebabMenu(event, 'rubric-kebab-menu-${rubricIdentifier}')"
                                    title="Options"
                                    class="mat-kebab-btn w-8 h-8 flex items-center justify-center cursor-pointer text-black focus:outline-none bg-transparent hover:text-[#FFD000]">
                                    <i class="fa-solid fa-ellipsis-vertical text-base text-black"></i>
                                </button>
                                <div id="rubric-kebab-menu-${rubricIdentifier}"
                                    class="shared-kebab-menu hidden absolute right-0 top-full mt-1.5 w-36 bg-white border border-slate-200/90 rounded-xl shadow-lg overflow-hidden z-[100] font-['Inter'] p-1 space-y-0.5 animate-in fade-in duration-150">
                                    <button type="button" onclick="window.deleteRubricFromMaterial('${rubricIdentifier}', event)"
                                        class="w-full text-left px-2.5 py-1.5 hover:bg-slate-100 text-xs font-semibold text-black rounded-lg transition-colors flex items-center gap-2 cursor-pointer">
                                        <i class="fa-solid fa-trash-can text-xs text-black w-3.5 text-center"></i>
                                        <span class="text-black">Delete Rubric</span>
                                    </button>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                `;

            rubricHtml = `
                <div class="material-detail-rubric-section border-t border-slate-200 pt-4 sm:pt-6">
                    <h3 class="material-detail-section-title text-sm sm:text-base font-bold text-black font-['Inter'] mb-2 sm:mb-2.5">Grading Rubric</h3>
                    ${rubricCardHtml}
                </div>
            `;
        }

        // Full Cinema Big Video Player Mode (matches student & teacher topic workstation)
        if (m.type === 'Video') {
            const videoUrl = m.url || m.videoUrl || m.file || '';
            const isMp4 = m.sourceType === 'mp4' || m.fileType === 'mp4' || (videoUrl && (videoUrl.endsWith('.mp4') || videoUrl.endsWith('.webm') || videoUrl.endsWith('.ogg') || videoUrl.startsWith('blob:') || videoUrl.startsWith('data:video/'))) || (m.fileName && m.fileName.toLowerCase().match(/\.(mp4|webm|mov|ogg)$/i));

            let finalEmbedUrl = videoUrl;
            const videoIdMatch = videoUrl.match(/(?:youtu\.be\/|(?:www\.|m\.|music\.)?youtube(?:-nocookie)?\.com\/(?:.*v(?:i)?[\/=]|.*[\?&]v=|embed\/|v\/|shorts\/|live\/|e\/))([\w-]{11})/i);
            if (videoIdMatch && videoIdMatch[1]) {
                finalEmbedUrl = `https://www.youtube.com/embed/${videoIdMatch[1]}?enablejsapi=1`;
            }

            const videoDuration = m.duration || '15:00';
            const videoThumb = m.thumb || m.poster || m.thumbnail || 'image/ICC logo.jpg';

            detailView.innerHTML = `
                <div class="material-detail-container space-y-5 sm:space-y-6 pb-10 font-['Inter']">
                    <!-- Video Player Container (No horizontal padding, fullwidth on mobile, auto-synced height) -->
                    <div class="material-detail-video-wrapper w-[calc(100%+2rem)] sm:w-full -mx-4 sm:mx-0 -mt-4 sm:mt-0 flex justify-center">
                        <div class="video-thumbnail-panel video-cinema-player material-detail-video-player bg-black rounded-none sm:rounded-2xl overflow-hidden flex items-center justify-center w-full relative" style="width: 100%; aspect-ratio: 16 / 9; height: auto; position: relative;">
                            ${isMp4 ? `
                                <video id="shared-cinema-video-el" src="${videoUrl || 'image/campus-clip.mp4'}" poster="${videoThumb}" preload="metadata" class="w-full h-full object-contain bg-black" controls playsinline
                                    style="width: 100%; height: 100%; aspect-ratio: 16 / 9; object-fit: contain; background: #000;">
                                </video>
                            ` : `
                                <iframe src="${finalEmbedUrl || 'https://www.youtube.com/embed/dQw4w9WgXcQ'}" class="w-full h-full border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="width: 100%; height: 100%; aspect-ratio: 16 / 9;"></iframe>
                            `}
                        </div>
                    </div>

                    <!-- Video Information & Badges (comfortably padded on mobile) -->
                    <div class="material-detail-info px-4 sm:px-0 space-y-2.5">
                        <h1 class="material-detail-title text-xl sm:text-2xl font-bold text-black tracking-tight font-['Inter'] leading-snug break-words">${_escape(displayTitle)}</h1>
                        <div class="material-detail-badge-row flex items-center gap-3 text-xs flex-wrap">
                            <span class="material-detail-badge material-detail-type-badge inline-flex items-center gap-1 px-2 py-0.5 rounded-md ${badgeClass} border font-bold text-[10px] capitalize leading-tight">
                                <i class="fa-solid ${typeIcon} text-[9px]"></i> ${typeLabel}
                            </span>
                        </div>
                        ${hasDescription ? `
                            <div class="material-detail-desc pt-3 border-t border-slate-100">
                                ${window.renderMaterialBodyText(instructions)}
                            </div>
                        ` : ''}
                    </div>

                    ${rubricHtml ? `<div class="px-4 sm:px-0">${rubricHtml}</div>` : ''}
                </div>
            `;
            // Ensure overlay is at top after Video content is rendered — no multi-timeout chain
            const _ovVid = document.getElementById('subject-edit-overlay') || document.querySelector('.sigma-modal-overlay:not(.hidden)');
            if (_ovVid) { _ovVid.scrollTop = 0; }
            return;
        }

        // 1. Attached Main File HTML (for Lessons, Assignments, Activities, Quizzes, Performance Tasks)
        let attachedFileHtml = '';
        if (m.type === 'Quiz') {
            const targetQuizId = m.selectedQuizId || m.quizId;
            let quizObj = null;
            if (targetQuizId && typeof window.getStoredQuizLibrary === 'function') {
                const lib = window.getStoredQuizLibrary();
                quizObj = lib.find(q => String(q.id) === String(targetQuizId) || (q.code && q.code === targetQuizId));
            }
            const hasQuizQuestions = Boolean(quizObj ? (quizObj.questionsCount || (Array.isArray(quizObj.questions) && quizObj.questions.length > 0)) : (m.selectedQuizQuestions || m.quizQuestionsCount || (Array.isArray(m.questions) && m.questions.length > 0)));
            const hasAttachedDigitalQuiz = Boolean(quizObj || hasQuizQuestions);

            if (hasAttachedDigitalQuiz && typeof window.renderSharedAttachedFilePanelHtml === 'function') {
                const quizTitle = quizObj?.title || m.selectedQuizTitle || m.quizTitle || m.title || 'Attached Quiz';
                const quizQuestions = quizObj ? (quizObj.questionsCount || (Array.isArray(quizObj.questions) ? quizObj.questions.length : 0)) : (m.selectedQuizQuestions || m.quizQuestionsCount || (Array.isArray(m.questions) && m.questions.length > 0));
                const quizPoints = quizObj ? (quizObj.totalPoints !== undefined ? quizObj.totalPoints : (quizObj.questions ? quizObj.questions.reduce((a, q) => a + (parseInt(q.points) || 0), 0) : 0)) : (m.selectedQuizPoints || m.quizPoints || m.max || 0);
                const quizTimeLimit = m.timeLimit || '30 Minutes';
                const safeQuizId = String(targetQuizId || '').replace(/'/g, '');

                attachedFileHtml = window.renderSharedAttachedFilePanelHtml({
                    title: quizTitle,
                    url: 'quiz',
                    type: 'quiz',
                    timeLimit: quizTimeLimit,
                    maxScore: quizPoints,
                    questionsCount: quizQuestions,
                    quizId: targetQuizId || '',
                    hasAttachedQuiz: true,
                    onClick: `window.openQuizPreviewModal ? window.openQuizPreviewModal('${safeQuizId}') : (window.openQuizCreatorTab ? window.openQuizCreatorTab() : window.open('quiz-creator.html', '_blank'))`
                });
            } else if (m.fileName || m.fileUrl || m.file || m.sourceUrl || (m.url && m.url !== 'quiz' && !m.url.includes('youtube.com'))) {
                const rawFileName = String(m.fileName || '').trim();
                const fileUrl = m.url || m.fileUrl || m.file || m.sourceUrl || '';
                const hasFile = Boolean(rawFileName || fileUrl);
                const docExt = (m.fileType || (rawFileName ? rawFileName.split('.').pop() : (fileUrl ? fileUrl.split('.').pop() : 'docx'))).toLowerCase();
                const fileName = rawFileName || (hasFile ? (m.title ? `${m.title}.${docExt}` : 'Document') : '');

                if (hasFile && fileName && typeof window.renderSharedAttachedFilePanelHtml === 'function') {
                    attachedFileHtml = window.renderSharedAttachedFilePanelHtml({
                        title: fileName,
                        url: fileUrl,
                        type: docExt,
                        onClick: `window.previewEditorFile('main')`
                    });
                } else {
                    attachedFileHtml = '';
                }
            } else {
                attachedFileHtml = '';
            }
        } else {
            const rawFileName = String(m.fileName || '').trim();
            const fileUrl = m.url || m.fileUrl || m.file || m.sourceUrl || '';
            const hasFile = Boolean(rawFileName || fileUrl);
            const docExt = (m.fileType || (rawFileName ? rawFileName.split('.').pop() : (fileUrl ? fileUrl.split('.').pop() : 'docx'))).toLowerCase();
            const fileName = rawFileName || (hasFile ? (m.title ? `${m.title}.${docExt}` : 'Document') : '');

            if (hasFile && fileName && typeof window.renderSharedAttachedFilePanelHtml === 'function') {
                attachedFileHtml = window.renderSharedAttachedFilePanelHtml({
                    title: fileName,
                    url: fileUrl,
                    type: docExt,
                    onClick: `window.previewEditorFile('main')`
                });
            } else {
                attachedFileHtml = '';
            }
        }

        detailView.innerHTML = `
            <div class="material-detail-container space-y-5 pb-8 font-['Inter']">
                <!-- Top Title & Badge & Info -->
                <div class="material-detail-info space-y-2">
                    <h1 class="material-detail-title text-xl sm:text-2xl font-bold text-black tracking-tight font-['Inter'] leading-snug break-words">${_escape(displayTitle)}</h1>
                    <div class="material-detail-badge-row flex items-center gap-2 text-xs flex-wrap">
                        <span class="material-detail-badge material-detail-type-badge inline-flex items-center gap-1 px-2 py-0.5 rounded-md ${badgeClass} border font-bold text-[10px] capitalize leading-tight">
                            <i class="fa-solid ${typeIcon} text-[9px]"></i> ${typeLabel}
                        </span>
                    </div>
                </div>

                <!-- Description / Instructions Section (Hidden if empty) -->
                ${hasDescription ? `
                    <div class="material-detail-desc border-t border-slate-100 pt-3.5 sm:pt-4">
                        ${window.renderMaterialBodyText(instructions)}
                    </div>
                ` : ''}

                <!-- Attached Document / Resource Section -->
                ${attachedFileHtml ? `
                    <div class="material-detail-attached-file border-t border-slate-200 pt-4 sm:pt-6">
                        <h3 class="material-detail-section-title text-sm sm:text-base font-bold text-black font-['Inter'] mb-2 sm:mb-2.5">${m.type === 'Quiz' ? 'Attached Quiz' : 'Attached Document'}</h3>
                        ${attachedFileHtml}
                    </div>
                ` : ''}

                <!-- Attached Rubric Section (If any) -->
                ${rubricHtml}
            </div>
        `;
        // Ensure overlay is at top after content is rendered — no multi-timeout chain
        const _ovDet = document.getElementById('subject-edit-overlay') || document.querySelector('.sigma-modal-overlay:not(.hidden)');
        if (_ovDet) { _ovDet.scrollTop = 0; }
    };

    window.deleteRubricFromMaterial = function (indexOrId, event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        document.querySelectorAll('.shared-kebab-menu').forEach(menu => menu.classList.add('hidden'));

        const allMats = (Array.isArray(window.currentSubjectAllMaterials) && window.currentSubjectAllMaterials.length > 0)
            ? window.currentSubjectAllMaterials
            : (window.currentSubjectMaterials || []);

        let m = null;
        let index = -1;
        if (typeof indexOrId === 'string') {
            index = allMats.findIndex(item => String(item.id) === String(indexOrId));
            if (index >= 0) {
                m = allMats[index];
            } else if (!Number.isNaN(Number(indexOrId))) {
                const numIdx = Number(indexOrId);
                m = allMats[numIdx] || (window.currentSubjectMaterials && window.currentSubjectMaterials[numIdx]);
                index = numIdx;
            }
        } else if (typeof indexOrId === 'number') {
            index = indexOrId;
            m = allMats[index] || (window.currentSubjectMaterials && window.currentSubjectMaterials[index]);
        }

        const doDelete = function () {
            if (m) {
                m.hasRubric = false;
                m.rubricFileName = '';
                m.rubricUrl = '';
                m.rubric = null;
                m.perfRubricFileName = '';
                m.perfRubricUrl = '';
                delete m._rubricInjectedByViewScope;
            }

            // Also clear on matching items in window.currentSubjectMaterials
            if (Array.isArray(window.currentSubjectMaterials)) {
                window.currentSubjectMaterials.forEach(item => {
                    if (m && (String(item.id) === String(m.id) || (m.title && item.title === m.title))) {
                        item.hasRubric = false;
                        item.rubricFileName = '';
                        item.rubricUrl = '';
                        item.rubric = null;
                        item.perfRubricFileName = '';
                        item.perfRubricUrl = '';
                        delete item._rubricInjectedByViewScope;
                    }
                });
            }

            // Sync removal to Add Task/Material form
            if (window.editingMaterialState) {
                window.editingMaterialState.hasRubric = false;
                window.editingMaterialState.rubricFileName = '';
                window.editingMaterialState.rubricFileSize = '';
                window.editingMaterialState.rubricFile = null;
                window.editingMaterialState.rubricUrl = '';
                if (typeof window.renderMaterialEditorForm === 'function') {
                    window.renderMaterialEditorForm();
                }
            }

            // Clear from active section release configs in localStorage and drafts
            const mIdStr = m ? String(m.id || '').trim() : '';
            const mTitleStr = m ? String(m.title || m.name || '').trim().toLowerCase() : '';
            const mCleanTitleStr = mTitleStr.replace(/\.(pdf|docx|pptx|ppt)$/i, '').trim();

            const scopeSubjId = String(window.originalEditingSubjectId || window.originalEditingSubjectCode || window.currentSubjectCode || window.currentSubjectData?.id || '').trim();
            const cleanScopeSubjId = scopeSubjId.toLowerCase().replace(/^(card-|subj-)/, '');

            let targetSection = '';
            if (window.activeCurriculumScopeLabel) {
                const match = String(window.activeCurriculumScopeLabel).match(/\(([^)]+)\)/);
                if (match && match[1]) targetSection = match[1].trim();
            }

            // Sync removal to teacher schedule drafts
            [window._teacherAssessScheduleDraft, window._teacherTasksScheduleDraft, window._teacherTopicScheduleDraft].forEach(d => {
                if (d && typeof d === 'object') {
                    d._rubricDeleted = true;
                    delete d._uploadedRubricName;
                    delete d._uploadedRubricUrl;
                    delete d._uploadedRubricFile;
                    delete d.rubric;
                    delete d._adminLockedRubric;
                    if (d.assessmentRubrics) {
                        [mIdStr, mTitleStr, mCleanTitleStr].filter(Boolean).forEach(ck => delete d.assessmentRubrics[ck]);
                        for (const mk of Object.keys(d.assessmentRubrics)) {
                            const mkl = String(mk).trim().toLowerCase().replace(/\.(pdf|docx|pptx|ppt)$/i, '');
                            if (mkl === mTitleStr || mkl === mCleanTitleStr || (mIdStr && mkl === mIdStr) || (mCleanTitleStr && mkl.includes(mCleanTitleStr)) || (mCleanTitleStr && mCleanTitleStr.includes(mkl))) {
                                delete d.assessmentRubrics[mk];
                            }
                        }
                    }
                    if (d.assessmentRubricUrls) {
                        [mIdStr, mTitleStr, mCleanTitleStr].filter(Boolean).forEach(ck => delete d.assessmentRubricUrls[ck]);
                        for (const mk of Object.keys(d.assessmentRubricUrls)) {
                            const mkl = String(mk).trim().toLowerCase().replace(/\.(pdf|docx|pptx|ppt)$/i, '');
                            if (mkl === mTitleStr || mkl === mCleanTitleStr || (mIdStr && mkl === mIdStr) || (mCleanTitleStr && mkl.includes(mCleanTitleStr)) || (mCleanTitleStr && mCleanTitleStr.includes(mkl))) {
                                delete d.assessmentRubricUrls[mk];
                            }
                        }
                    }
                    if (d.assessmentRubricFiles) {
                        [mIdStr, mTitleStr, mCleanTitleStr].filter(Boolean).forEach(ck => delete d.assessmentRubricFiles[ck]);
                    }
                }
            });



            // Clean localStorage keys
            const keysToClean = [];
            if (targetSection) {
                keysToClean.push(
                    `sigma_assessment_release_${scopeSubjId}_${targetSection}`,
                    `sigma_assessment_release_${cleanScopeSubjId}_${targetSection}`,
                    `sigma_assessment_release_card-${cleanScopeSubjId}_${targetSection}`
                );
            }
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && (k.startsWith('sigma_assessment_release_') || k.startsWith('sigma_released_') || k.startsWith('sigma_custom_materials_') || k.startsWith('sigma_teacher_rubrics_'))) {
                    if (!scopeSubjId || k.includes(scopeSubjId) || k.includes(cleanScopeSubjId) || (targetSection && k.includes(targetSection))) {
                        if (!keysToClean.includes(k)) keysToClean.push(k);
                    }
                }
            }

            keysToClean.forEach(k => {
                try {
                    const raw = localStorage.getItem(k);
                    if (!raw) return;
                    const cfg = JSON.parse(raw);
                    if (!cfg || typeof cfg !== 'object') return;
                    let updated = false;

                    ['assessmentRubrics', 'rubrics'].forEach(rk => {
                        if (cfg[rk] && typeof cfg[rk] === 'object') {
                            [mIdStr, mTitleStr, mCleanTitleStr].filter(Boolean).forEach(ck => {
                                if (cfg[rk][ck] !== undefined) {
                                    delete cfg[rk][ck];
                                    updated = true;
                                }
                            });
                            for (const mk of Object.keys(cfg[rk])) {
                                const mkl = String(mk).trim().toLowerCase().replace(/\.(pdf|docx|pptx|ppt)$/i, '');
                                if (mkl === mTitleStr || mkl === mCleanTitleStr || (mIdStr && mkl === mIdStr) || (mCleanTitleStr && mkl.includes(mCleanTitleStr)) || (mCleanTitleStr && mCleanTitleStr.includes(mkl))) {
                                    delete cfg[rk][mk];
                                    updated = true;
                                }
                            }
                        }
                    });

                    ['assessmentRubricUrls', 'rubricUrls'].forEach(rk => {
                        if (cfg[rk] && typeof cfg[rk] === 'object') {
                            [mIdStr, mTitleStr, mCleanTitleStr].filter(Boolean).forEach(ck => {
                                if (cfg[rk][ck] !== undefined) {
                                    delete cfg[rk][ck];
                                    updated = true;
                                }
                            });
                            for (const mk of Object.keys(cfg[rk])) {
                                const mkl = String(mk).trim().toLowerCase().replace(/\.(pdf|docx|pptx|ppt)$/i, '');
                                if (mkl === mTitleStr || mkl === mCleanTitleStr || (mIdStr && mkl === mIdStr) || (mCleanTitleStr && mkl.includes(mCleanTitleStr)) || (mCleanTitleStr && mCleanTitleStr.includes(mkl))) {
                                    delete cfg[rk][mk];
                                    updated = true;
                                }
                            }
                        }
                    });

                    if (Array.isArray(cfg)) {
                        cfg.forEach(it => {
                            if (it && (String(it.id) === mIdStr || (mTitleStr && String(it.title || it.name || '').trim().toLowerCase() === mTitleStr))) {
                                it.hasRubric = false;
                                it.rubricFileName = '';
                                it.rubricUrl = '';
                                it.rubric = null;
                                it.perfRubricFileName = '';
                                it.perfRubricUrl = '';
                                updated = true;
                            }
                        });
                    }

                    if (updated) {
                        localStorage.setItem(k, JSON.stringify(cfg));
                    }
                } catch (e) {}
            });

            // Clean in admin and teacher subjects storage
            ['sigma-admin-subjects', 'sigma-teacher-subjects', 'sigma_subjects_data', 'subjects'].forEach(storageKey => {
                try {
                    const raw = localStorage.getItem(storageKey);
                    if (!raw) return;
                    const subjects = JSON.parse(raw);
                    if (!Array.isArray(subjects)) return;
                    let updated = false;
                    subjects.forEach(s => {
                        if (!s) return;
                        const checkAndCleanMat = (it) => {
                            if (!it) return;
                            const idMatch = mIdStr && String(it.id || '').trim() === mIdStr;
                            const titleMatch = mCleanTitleStr && String(it.title || it.name || '').trim().toLowerCase().replace(/\.(pdf|docx|pptx|ppt)$/i, '') === mCleanTitleStr;
                            if (idMatch || titleMatch) {
                                it.hasRubric = false;
                                it.rubricFileName = '';
                                it.rubricUrl = '';
                                it.rubric = null;
                                it.perfRubricFileName = '';
                                it.perfRubricUrl = '';
                                delete it._rubricInjectedByViewScope;
                                updated = true;
                            }
                        };
                        if (Array.isArray(s.materials)) s.materials.forEach(checkAndCleanMat);
                        if (Array.isArray(s.topics)) {
                            s.topics.forEach(t => {
                                if (!t) return;
                                [t.assignments, t.quizzes, t.activities, t.performanceTasks, t.materials, t.handouts, t.videos].forEach(arr => {
                                    if (Array.isArray(arr)) arr.forEach(checkAndCleanMat);
                                });
                            });
                        }
                    });
                    if (updated) {
                        localStorage.setItem(storageKey, JSON.stringify(subjects));
                    }
                } catch (e) {}
            });

            // Save subject if in master editor
            if (typeof window.saveCurrentSubjectToStorage === 'function') {
                try { window.saveCurrentSubjectToStorage(); } catch (e) {}
            }

            // Re-render view material detail
            if (typeof window.viewSubjectMaterial === 'function') {
                window.viewSubjectMaterial(indexOrId);
            }

            if (typeof window.showSigmaDialog === 'function') {
                window.showSigmaDialog({
                    title: 'Rubric Deleted',
                    desc: 'The grading rubric has been successfully removed.',
                    icon: 'fa-solid fa-circle-check text-[#15803d]',
                    confirmText: 'OK',
                    isNotification: true
                });
            } else if (typeof window.showToast === 'function') {
                window.showToast('Rubric successfully removed.', 'success');
            }
        };

        if (typeof window.showSigmaDialog === 'function') {
            window.showSigmaDialog({
                title: 'Delete Rubric?',
                desc: 'Are you sure you want to delete this grading rubric from the material?',
                icon: 'fa-solid fa-trash-can text-black',
                confirmText: 'Delete Rubric',
                cancelText: 'Cancel',
                isDanger: false,
                onConfirm: doDelete
            });
        } else {
            if (confirm('Are you sure you want to delete this grading rubric from the material?')) {
                doDelete();
            }
        }
    };

    window.searchSubjectMaterials = function (query) {
        window.subjectMaterialSearchQuery = query || '';
        window.renderSubjectMaterials();
    };

    window.removeSubjectMaterial = function (indexOrId) {
        const allMats = (Array.isArray(window.currentSubjectAllMaterials) && window.currentSubjectAllMaterials.length > 0)
            ? window.currentSubjectAllMaterials
            : (window.currentSubjectMaterials || []);
        let material = null;
        if (typeof indexOrId === 'string' && isNaN(Number(indexOrId))) {
            material = allMats.find(m => String(m.id) === String(indexOrId));
        } else {
            const numIdx = Number(indexOrId);
            material = (window.currentSubjectMaterials && window.currentSubjectMaterials[numIdx]) || allMats[numIdx];
        }
        if (!material) return;
        const rawRole = material?.authorRole || material?.role || (material?.isAdmin ? 'Admin' : (material?.isTeacher ? 'Teacher' : 'Admin'));
        const authorRole = normalizeSubjectAuthorRole(rawRole);
        const isOwn = isCurrentUserAuthor(material?.authorId, material?.authorName, authorRole);
        if (!isOwn) {
            if (typeof window.showSigmaDialog === 'function') {
                window.showSigmaDialog({
                    title: 'Material Cannot Be Deleted',
                    desc: isCurrentEditorTeacher()
                        ? 'This material was created by Admin / another user and cannot be deleted by teachers.'
                        : 'This material was created by a teacher and cannot be deleted from Admin.',
                    confirmText: 'Understood',
                    cancelText: null
                });
            }
            return;
        }
        const matName = material?.title ? `"${material.title}"` : 'this material';
        const doRemove = () => {
            const targetId = String(material?.id || '');
            const targetTitle = String(material?.title || material?.name || '').trim().toLowerCase();
            const targetTopicId = String(material?.topicId || '');

            const isMatchingMat = (m) => {
                if (!m) return false;
                if (m === material) return true;
                if (targetId && m.id && String(m.id) === targetId) return true;
                if (targetTitle && (String(m.title || m.name || '').trim().toLowerCase() === targetTitle) && (String(m.topicId || '') === targetTopicId)) return true;
                return false;
            };

            if (Array.isArray(window.currentSubjectMaterials)) {
                window.currentSubjectMaterials = window.currentSubjectMaterials.filter(m => !isMatchingMat(m));
            }
            if (Array.isArray(window.currentSubjectAllMaterials)) {
                window.currentSubjectAllMaterials = window.currentSubjectAllMaterials.filter(m => !isMatchingMat(m));
            }
            if (typeof window.syncCurrentSubjectEditorToStorage === 'function') {
                window.syncCurrentSubjectEditorToStorage();
            }
            window.renderSubjectMaterials();
        };

        if (typeof window.showSigmaDialog === 'function') {
            window.showSigmaDialog({
                title: 'Delete Material?',
                desc: `Are you sure you want to delete ${matName}?`,
                confirmText: 'Delete',
                cancelText: 'Cancel',
                isDanger: false,
                onConfirm: doRemove
            });
        } else {
            doRemove();
        }
    };

    // ── RICH MATERIAL SUB-EDITORS & STORAGE ─────────────────────────────────

    window.editingMaterialState = {
        index: -1,
        type: 'Lesson',
        topicId: '',
        title: '',
        description: '',
        sourceType: 'embed', // for Video: 'embed' | 'file'
        videoUrl: '',
        fileType: 'docx', // 'docx' | 'pdf' | 'pptx'
        fileName: '',
        fileSize: '',
        hasRubric: false,
        rubricFileName: '',
        rubricFileSize: '',
        quizMode: 'storage', // 'storage' | 'upload'
        selectedQuizId: null,
        selectedQuizTitle: '',
        selectedQuizQuestions: 0,
        selectedQuizPoints: 0,
        perfGuidelinesFileName: '',
        perfRubricFileName: ''
    };

    function _getYouTubeId(url) {
        if (!url) return null;
        const match = url.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:.*v(?:i)?[\/=]|.*[\?&]v=|embed\/|v\/|shorts\/|live\/))([\w-]{11})/i);
        return match ? match[1] : null;
    }

    function findMaterialById(materialId) {
        if (!materialId) return null;
        const pools = [window.currentSubjectAllMaterials, window.currentSubjectMaterials];
        for (let p = 0; p < pools.length; p++) {
            const list = pools[p];
            if (!Array.isArray(list)) continue;
            const found = list.find(item => item && String(item.id) === String(materialId));
            if (found) return found;
        }
        return null;
    }

    function resolveMaterialForEdit(editIndex, materialId) {
        const byId = findMaterialById(materialId);
        if (byId) return byId;
        if (typeof editIndex !== 'number' || editIndex < 0) return null;
        const allMats = Array.isArray(window.currentSubjectAllMaterials) ? window.currentSubjectAllMaterials : [];
        const filtered = Array.isArray(window.currentSubjectMaterials) ? window.currentSubjectMaterials : [];
        const fromAll = allMats[editIndex] || null;
        const fromFiltered = filtered[editIndex] || null;
        if (fromAll && fromFiltered && String(fromAll.id || '') !== String(fromFiltered.id || '')) {
            return fromAll;
        }
        return fromFiltered || fromAll;
    }

    function commitSavedMaterial(existingMat, finalItem, teacherFork) {
        const lists = [window.currentSubjectMaterials, window.currentSubjectAllMaterials].filter(Array.isArray);
        const matches = (item) => {
            if (!item) return false;
            if (teacherFork && existingMat) {
                return String(item.id) === String(finalItem.id) || String(item.originalAdminId || '') === String(existingMat.id);
            }
            if (existingMat) {
                return item === existingMat || String(item.id) === String(existingMat.id) || String(item.id) === String(finalItem.id);
            }
            return String(item.id) === String(finalItem.id);
        };
        let wrote = false;
        lists.forEach(list => {
            for (let i = 0; i < list.length; i++) {
                if (matches(list[i])) {
                    list[i] = finalItem;
                    wrote = true;
                }
            }
        });
        if (!wrote) {
            if (!Array.isArray(window.currentSubjectMaterials)) window.currentSubjectMaterials = [];
            if (!Array.isArray(window.currentSubjectAllMaterials)) window.currentSubjectAllMaterials = [];
            window.currentSubjectMaterials.push(finalItem);
            if (!window.currentSubjectAllMaterials.some(item => item && String(item.id) === String(finalItem.id))) {
                window.currentSubjectAllMaterials.push(finalItem);
            }
        }
    }

    window.addSubjectMaterial = function (type = 'Lesson', preserveFields = false, editIndex = -1, materialId = '') {
        window._isQuizStoragePickerOpen = false;
        const resolvedId = materialId ? String(materialId) : '';
        const isEdit = editIndex !== -1 || Boolean(resolvedId);
        window.currentEditingMaterialIndex = editIndex;

        const allMats = (Array.isArray(window.currentSubjectAllMaterials) && window.currentSubjectAllMaterials.length > 0)
            ? window.currentSubjectAllMaterials
            : (window.currentSubjectMaterials || []);
        const targetMaterial = isEdit ? resolveMaterialForEdit(editIndex, resolvedId) : null;

        if (isEdit && targetMaterial) {
            const m = targetMaterial;
            const rawRole = m?.authorRole || m?.role || (m?.isAdmin ? 'Admin' : (m?.isTeacher ? 'Teacher' : 'Admin'));
            const authorRole = normalizeSubjectAuthorRole(rawRole);
            const isOwn = isCurrentUserAuthor(m?.authorId, m?.authorName, authorRole);
            if (!isOwn) {
                if (isCurrentEditorTeacher()) {
                    const mId = String(m?.id || '');
                    const mTitle = String(m?.title || m?.name || '').trim().toLowerCase();
                    const teacherCopyIdx = allMats.findIndex(other => {
                        if (!other || other === m) return false;
                        const otherRole = other.authorRole || other.role || (other.isTeacher ? 'Teacher' : '');
                        if (normalizeSubjectAuthorRole(otherRole) !== 'Teacher') return false;
                        const matchesId = (other.originalAdminId && String(other.originalAdminId) === mId) || String(other.id) === mId;
                        const matchesTitle = mTitle && String(other.title || other.name || '').trim().toLowerCase() === mTitle;
                        return matchesId || matchesTitle;
                    });
                    if (teacherCopyIdx >= 0) {
                        const teacherCopy = allMats[teacherCopyIdx];
                        return window.addSubjectMaterial(type, preserveFields, teacherCopyIdx, teacherCopy && teacherCopy.id);
                    }
                } else {
                    if (typeof window.showSigmaDialog === 'function') {
                        window.showSigmaDialog({
                            title: 'Material Cannot Be Edited',
                            desc: 'This material was created by a teacher and cannot be edited from Admin.',
                            confirmText: 'Understood',
                            cancelText: null
                        });
                    }
                    return;
                }
            }
            const activeType = m.type || type || 'Lesson';
            const isQuizType = activeType === 'Quiz' || String(activeType).toLowerCase().includes('quiz');
            const isTeacherEditor = typeof isCurrentEditorTeacher === 'function' ? isCurrentEditorTeacher() : false;
            const isViewScope = Boolean(window.activeCurriculumScope && window.activeCurriculumScope !== 'master');
            const mRole = m.authorRole || m.role || (m.isAdmin ? 'Admin' : (m.isTeacher ? 'Teacher' : ''));
            const isMatAdmin = (typeof normalizeSubjectAuthorRole === 'function' ? normalizeSubjectAuthorRole(mRole) : mRole) === 'Admin';
            const rInfo = (!isQuizType && (isTeacherEditor || isViewScope || !isMatAdmin)) ? resolveMaterialRubric(m, window.originalEditingSubjectId || window.originalEditingSubjectCode) : null;
            let rawRubricName = isQuizType ? '' : (rInfo?.name || m.rubricFileName || m.perfRubricFileName || (typeof m.rubric === 'string' ? m.rubric : (m.rubric?.fileName || '')) || '');
            let rawRubricUrl = isQuizType ? '' : (rInfo?.url || m.rubricUrl || m.perfRubricUrl || (typeof m.rubric === 'object' ? (m.rubric?.url || m.rubric?.fileUrl || '') : '') || '');

            const resolvedEditIndex = allMats.findIndex(item => item === m || (m.id && String(item.id) === String(m.id)));
            window.currentEditingMaterialIndex = resolvedEditIndex >= 0 ? resolvedEditIndex : editIndex;
            window.editingMaterialState = {
                index: window.currentEditingMaterialIndex,
                id: m.id || resolvedId || '',
                type: activeType,
                topicId: m.topicId || '',
                title: m.title || '',
                description: m.description || '',
                sourceType: m.sourceType || (m.videoUrl ? 'embed' : 'file'),
                videoUrl: m.videoUrl || '',
                fileType: m.fileType || 'docx',
                fileName: m.fileName || m.perfGuidelinesFileName || '',
                fileSize: m.fileSize || '',
                fileUrl: m.fileUrl || m.perfGuidelinesUrl || m.url || '',
                hasRubric: isQuizType ? false : Boolean(rawRubricName || m.hasRubric),
                rubricFileName: isQuizType ? '' : rawRubricName,
                rubricFileSize: isQuizType ? '' : (m.rubricFileSize || (rawRubricName ? 'Rubric File' : '')),
                rubricUrl: isQuizType ? '' : rawRubricUrl,
                quizMode: m.quizMode || (m.quizId || m.selectedQuizId ? 'storage' : 'upload'),
                selectedQuizId: m.selectedQuizId || m.quizId || null,
                selectedQuizTitle: m.selectedQuizTitle || m.quizTitle || '',
                selectedQuizQuestions: m.selectedQuizQuestions || m.quizQuestionsCount || 0,
                selectedQuizPoints: m.selectedQuizPoints || m.quizPoints || 0,
                selectedQuizIcon: m.selectedQuizIcon || m.quizIcon || m.icon || '',
                selectedQuizColor: m.selectedQuizColor || m.quizColor || m.color || '',
                selectedQuizIsAi: Boolean(m.selectedQuizIsAi || m.isAi),
                perfGuidelinesFileName: m.perfGuidelinesFileName || '',
                perfRubricFileName: isQuizType ? '' : (m.perfRubricFileName || '')
            };
        } else {
            const activeType = type || 'Lesson';
            const isQuizType = activeType === 'Quiz' || String(activeType).toLowerCase().includes('quiz');
            const prevTopicId = preserveFields ? (window.editingMaterialState?.topicId || '') : '';

            window.editingMaterialState = {
                index: -1,
                type: activeType,
                topicId: prevTopicId,
                title: preserveFields ? (window.editingMaterialState?.title || '') : '',
                description: preserveFields ? (window.editingMaterialState?.description || '') : '',
                sourceType: 'embed',
                videoUrl: '',
                fileType: isQuizType ? 'docx' : 'docx',
                fileName: '',
                fileSize: '',
                file: null,
                fileUrl: '',
                hasRubric: false,
                rubricFileName: '',
                rubricFileSize: '',
                rubricFile: null,
                rubricUrl: '',
                quizMode: 'storage',
                selectedQuizId: null,
                selectedQuizTitle: '',
                selectedQuizQuestions: 0,
                selectedQuizPoints: 0,
                perfGuidelinesFileName: '',
                perfRubricFileName: ''
            };
        }

        window.currentEditingMaterialType = window.editingMaterialState.type;
        window.editingMaterialOriginalState = JSON.stringify({
            title: (window.editingMaterialState.title || '').trim(),
            description: (window.editingMaterialState.description || '').trim(),
            topicId: String(window.editingMaterialState.topicId || ''),
            type: window.editingMaterialState.type || 'Lesson',
            sourceType: window.editingMaterialState.sourceType || 'embed',
            videoUrl: (window.editingMaterialState.videoUrl || '').trim(),
            fileName: window.editingMaterialState.fileName || '',
            fileType: window.editingMaterialState.fileType || '',
            hasRubric: Boolean(window.editingMaterialState.hasRubric),
            rubricFileName: window.editingMaterialState.rubricFileName || '',
            selectedQuizId: window.editingMaterialState.selectedQuizId || null
        });

        const step3 = document.getElementById('subject-step-3');
        const mainView = document.getElementById('subject-materials-main-view');
        const grid = document.getElementById('subject-materials-grid');
        const empty = document.getElementById('subject-materials-empty');
        const editorView = document.getElementById('subject-material-editor-view');
        const detailView = document.getElementById('subject-material-detail-view');
        const segmentedHeader = document.getElementById('subject-segmented-header');

        // Synchronize unified modal header
        window.syncSubjectModalHeader({
            title: (editIndex >= 0 ? 'Edit ' : 'Add ') + (type || 'Lesson'),
            showBack: true,
            showActions: false,
            showStatus: false,
            showExit: false
        });
        if (segmentedHeader) {
            segmentedHeader.classList.add('hidden');
            segmentedHeader.style.setProperty('display', 'none', 'important');
        }
        if (mainView) {
            mainView.classList.add('hidden');
            mainView.style.setProperty('display', 'none', 'important');
        }
        if (grid) {
            grid.classList.add('hidden');
            grid.style.setProperty('display', 'none', 'important');
        }
        if (empty) {
            empty.classList.add('hidden');
            empty.style.setProperty('display', 'none', 'important');
        }
        if (detailView) {
            detailView.classList.add('hidden');
            detailView.style.setProperty('display', 'none', 'important');
        }

        // Show only step 3 container and editor view
        if (step3) {
            step3.classList.remove('hidden');
            step3.style.removeProperty('display');
            step3.style.setProperty('display', 'block', 'important');
        }
        if (editorView) {
            editorView.classList.remove('hidden');
            editorView.style.removeProperty('display');
            editorView.style.setProperty('display', 'block', 'important');
        }
        const matDropdown = document.getElementById('add-material-dropdown');
        if (matDropdown) matDropdown.classList.add('hidden');
        const matTrigger = document.getElementById('add-material-trigger');
        if (matTrigger) {
            matTrigger.classList.remove('is-active', 'bg-slate-100', 'border-slate-300');
            const icon = matTrigger.querySelector('i');
            if (icon) icon.className = 'fa-solid fa-plus text-xs text-black transition-transform duration-200 transform rotate-0';
        }
        const _matModalFooter = document.getElementById('subject-modal-footer');
        if (_matModalFooter) {
            _matModalFooter.classList.add('hidden');
            _matModalFooter.style.setProperty('display', 'none', 'important');
        }
        document.getElementById('subject-draft-btn')?.classList.add('hidden');
        document.getElementById('subject-next-btn')?.classList.add('hidden');
        document.getElementById('subject-save-btn')?.classList.add('hidden');
        document.getElementById('subject-add-another-btn')?.classList.add('hidden');
        document.getElementById('topic-editor-add-another-btn')?.classList.add('hidden');
        document.getElementById('topic-editor-save-btn')?.classList.add('hidden');
        document.getElementById('topic-editor-delete-btn')?.classList.add('hidden');
        document.getElementById('quiz-storage-select-btn')?.classList.add('hidden');
        document.getElementById('subject-step2-prev-btn')?.classList.add('hidden');
        document.getElementById('subject-step3-bottom-actions')?.classList.add('hidden');

        window.renderMaterialEditorForm();
        // Ensure overlay and body are at top after editor form is rendered
        const _ovAdd = document.getElementById('subject-edit-overlay') || document.querySelector('.sigma-modal-overlay:not(.hidden)');
        if (_ovAdd) { _ovAdd.scrollTop = 0; }
        const _bodyAdd = document.getElementById('subject-edit-form-body');
        if (_bodyAdd) { _bodyAdd.scrollTop = 0; }
    };


    window.cancelMaterialEditor = function (skipDirtyCheck) {
        window._isQuizStoragePickerOpen = false;
        window.stopAllVideos?.();

        const doCancel = () => {
            const mainView = document.getElementById('subject-materials-main-view');
            const editorView = document.getElementById('subject-material-editor-view');
            const detailView = document.getElementById('subject-material-detail-view');
            const modalHeader = document.getElementById('subject-modal-header');
            const segmentedHeader = document.getElementById('subject-segmented-header');
            const empty = document.getElementById('subject-materials-empty');

            if (editorView) { editorView.classList.add('hidden'); editorView.style.setProperty('display', 'none', 'important'); }
            if (detailView) { detailView.classList.add('hidden'); detailView.style.setProperty('display', 'none', 'important'); }
            if (mainView) { mainView.classList.remove('hidden'); mainView.style.removeProperty('display'); mainView.style.display = 'block'; }
            if (modalHeader) { modalHeader.classList.remove('hidden'); modalHeader.style.removeProperty('display'); }
            if (segmentedHeader) {
                const isContentFocus = window.subjectEditorOptions?.focus === 'content';
                const hideBars = Boolean(window.subjectEditorOptions?.hideBars) || isContentFocus || Boolean(window.subjectEditorOptions?.standalone) || isCurrentEditorTeacher();
                const showBars = !hideBars && !isCurrentViewOnlyScope();
                segmentedHeader.classList.toggle('hidden', !showBars);
                if (!showBars) segmentedHeader.style.setProperty('display', 'none', 'important');
                else segmentedHeader.style.removeProperty('display');
            }
            if (empty) { empty.style.removeProperty('display'); }

            document.getElementById('mat-editor-add-another-btn')?.classList.add('hidden');
            document.getElementById('mat-editor-delete-btn')?.classList.add('hidden');
            document.getElementById('mat-editor-save-btn')?.classList.add('hidden');
            window.handleSubjectStep(3);
            resetSubjectEditorScrollToTop();
        };

        if (skipDirtyCheck || window.editingMaterialOriginalState === undefined) { doCancel(); return; }

        // Check if material form has unsaved changes
        let isDirty = false;
        if (window.editingMaterialOriginalState !== undefined) {
            try {
                const orig = JSON.parse(window.editingMaterialOriginalState);
                const titleInput = document.getElementById('mat-editor-title');
                const descInput = document.getElementById('mat-editor-desc');
                const topicSelect = document.getElementById('mat-editor-topic-select');
                const currentTitle = (titleInput?.value || window.editingMaterialState?.title || '').trim();
                const currentDesc = (descInput?.value || window.editingMaterialState?.description || '').trim();
                const currentTopicId = String(topicSelect?.value || window.editingMaterialState?.topicId || '');
                const currentVideoUrl = (window.editingMaterialState?.videoUrl || '').trim();
                const currentFileName = window.editingMaterialState?.fileName || '';
                const currentQuizId = window.editingMaterialState?.selectedQuizId || null;

                isDirty = currentTitle !== (orig.title || '').trim()
                    || currentDesc !== (orig.description || '').trim()
                    || currentTopicId !== String(orig.topicId || '')
                    || currentVideoUrl !== (orig.videoUrl || '').trim()
                    || currentFileName !== (orig.fileName || '')
                    || currentQuizId !== (orig.selectedQuizId || null);
            } catch (e) {
                const titleInput = document.getElementById('mat-editor-title');
                isDirty = Boolean((titleInput?.value || '').trim());
            }
        } else {
            const titleInput = document.getElementById('mat-editor-title');
            isDirty = Boolean((titleInput?.value || window.editingMaterialState?.title || '').trim());
        }

        if (isDirty) {
            if (typeof window.openAskingPanel === 'function') {
                window.openAskingPanel({
                    title: 'Discard Changes?',
                    desc: 'You have unsaved changes in this form. Are you sure you want to go back and discard them?',
                    type: 'warning',
                    confirmText: 'Discard',
                    cancelText: 'Stay',
                    showCancel: true,
                    onConfirm: doCancel
                });
            } else if (confirm('You have unsaved changes. Discard them and go back?')) {
                doCancel();
            }
            return;
        }

        doCancel();
    };


    window.closeSubjectMaterialDetail = function () {
        window.stopAllVideos?.();
        const mainView = document.getElementById('subject-materials-main-view');
        const editorView = document.getElementById('subject-material-editor-view');
        const detailView = document.getElementById('subject-material-detail-view');
        const modalHeader = document.getElementById('subject-modal-header');
        const segmentedHeader = document.getElementById('subject-segmented-header');
        const empty = document.getElementById('subject-materials-empty');

        if (editorView) {
            editorView.classList.add('hidden');
            editorView.style.setProperty('display', 'none', 'important');
        }
        if (detailView) {
            detailView.classList.add('hidden');
            detailView.style.setProperty('display', 'none', 'important');
        }
        if (mainView) {
            mainView.classList.remove('hidden');
            mainView.style.removeProperty('display');
            mainView.style.display = 'block';
        }
        if (modalHeader) {
            modalHeader.classList.remove('hidden');
            modalHeader.style.removeProperty('display');
        }
        if (segmentedHeader) {
            const isContentFocus = window.subjectEditorOptions?.focus === 'content';
            const hideBars = Boolean(window.subjectEditorOptions?.hideBars) || isContentFocus || Boolean(window.subjectEditorOptions?.standalone) || isCurrentEditorTeacher();
            const showBars = !hideBars && !isCurrentViewOnlyScope();
            segmentedHeader.classList.toggle('hidden', !showBars);
            if (!showBars) segmentedHeader.style.setProperty('display', 'none', 'important');
            else segmentedHeader.style.removeProperty('display');
        }
        if (empty) {
            empty.style.removeProperty('display');
        }

        const closeDetailHeaderEditMatBtn = document.getElementById('subject-header-edit-mat-btn');
        if (closeDetailHeaderEditMatBtn) {
            closeDetailHeaderEditMatBtn.classList.add('hidden');
            closeDetailHeaderEditMatBtn.style.setProperty('display', 'none', 'important');
        }
        document.getElementById('mat-detail-back-btn')?.classList.add('hidden');
        document.getElementById('mat-detail-edit-btn')?.classList.add('hidden');

        // Ensure the topic that was just viewed stays expanded when returning
        if (window._currentDetailMaterialTopicId) {
            if (!window.expandedSubjectTopicIds) window.expandedSubjectTopicIds = {};
            window.expandedSubjectTopicIds[window._currentDetailMaterialTopicId] = true;
        }

        window.handleSubjectStep(3);
        resetSubjectEditorScrollToTop();
    };

    window.editMaterialFromDetail = function () {
        const index = window._currentDetailMaterialIndex;
        const materialId = window._currentDetailMaterialId || '';
        window.stopAllVideos?.();
        const editDetailHeaderEditMatBtn = document.getElementById('subject-header-edit-mat-btn');
        if (editDetailHeaderEditMatBtn) {
            editDetailHeaderEditMatBtn.classList.add('hidden');
            editDetailHeaderEditMatBtn.style.setProperty('display', 'none', 'important');
        }
        document.getElementById('mat-detail-back-btn')?.classList.add('hidden');
        document.getElementById('mat-detail-edit-btn')?.classList.add('hidden');
        if ((typeof index === 'number' && index >= 0) || materialId) {
            window.addSubjectMaterial('', false, typeof index === 'number' ? index : -1, materialId);
        }
    };

    window.switchMaterialSourceTab = function (source) {
        if (window.editingMaterialState.sourceType === source) return;
        window.stopAllVideos?.();

        const currentSource = window.editingMaterialState.sourceType || 'embed';
        const urlInput = document.getElementById('mat-video-url-input');
        const currentUrl = (urlInput ? urlInput.value : window.editingMaterialState.videoUrl) || '';
        const currentFile = window.editingMaterialState.fileName || '';

        const hasEmbedContent = currentSource === 'embed' && Boolean(currentUrl.trim());
        const hasFileContent = currentSource === 'file' && Boolean(currentFile);

        const doSwitch = () => {
            if (currentSource === 'embed') {
                window.editingMaterialState.videoUrl = '';
            } else if (currentSource === 'file') {
                window.editingMaterialState.fileName = '';
                window.editingMaterialState.fileSize = '';
                window.editingMaterialState.videoUrl = '';
            }
            window.editingMaterialState.sourceType = source;
            window.renderMaterialEditorForm();
        };

        if (hasEmbedContent && source === 'file') {
            if (typeof window.showSigmaDialog === 'function') {
                window.showSigmaDialog({
                    title: 'Switch to Upload MP4 Video?',
                    desc: 'Switching video sources will discard the entered YouTube link. Do you want to continue?',
                    confirmText: 'Switch Source',
                    cancelText: 'Cancel',
                    isDanger: false,
                    onConfirm: doSwitch
                });
            } else if (confirm('Switching video sources will discard the entered YouTube link. Do you want to continue?')) {
                doSwitch();
            }
            return;
        }

        if (hasFileContent && source === 'embed') {
            if (typeof window.showSigmaDialog === 'function') {
                window.showSigmaDialog({
                    title: 'Switch to Embedded (YouTube)?',
                    desc: 'Switching video sources will remove the uploaded MP4 video. Do you want to continue?',
                    confirmText: 'Switch Source',
                    cancelText: 'Cancel',
                    isDanger: false,
                    onConfirm: doSwitch
                });
            } else if (confirm('Switching video sources will remove the uploaded MP4 video. Do you want to continue?')) {
                doSwitch();
            }
            return;
        }

        window.editingMaterialState.sourceType = source;
        window.renderMaterialEditorForm();
    };

    window.switchMaterialFileTypeTab = function (fileType) {
        window.editingMaterialState.fileType = fileType;
        window.renderMaterialEditorForm();
    };

    window.switchMaterialQuizMode = function (mode) {
        window.editingMaterialState.quizMode = mode;
        window.renderMaterialEditorForm();
    };

    window.toggleMaterialRubric = function (checked) {
        window.editingMaterialState.hasRubric = checked;
        if (checked && !window.editingMaterialState.rubricFileName) {
            const rInfo = resolveMaterialRubric(window.editingMaterialState, window.originalEditingSubjectId || window.originalEditingSubjectCode);
            if (rInfo && rInfo.name) {
                window.editingMaterialState.rubricFileName = rInfo.name;
                if (rInfo.url && !window.editingMaterialState.rubricUrl) window.editingMaterialState.rubricUrl = rInfo.url;
                if (!window.editingMaterialState.rubricFileSize) window.editingMaterialState.rubricFileSize = 'Rubric File';
            }
        }
        window.renderMaterialEditorForm();
    };

    window.handleMaterialVideoUrlChange = function (url) {
        window.editingMaterialState.videoUrl = url.trim();
        const container = document.getElementById('mat-video-preview-container');
        if (container) {
            container.innerHTML = window.getMaterialVideoPreviewHtml(window.editingMaterialState.videoUrl);
        }
        window.checkMaterialValidity?.();
    };

    window.getMaterialVideoPreviewHtml = function (url) {
        if (!url) {
            return `
                <div class="video-thumbnail-panel bg-black rounded-2xl overflow-hidden shadow-md relative w-full aspect-video flex items-center justify-center group" style="aspect-ratio: 16/9;">
                    <img src="image/ICC logo.jpg" alt="School Logo" class="absolute inset-0 w-full h-full object-contain opacity-30 filter brightness-95 pointer-events-none">
                    <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/60 pointer-events-none"></div>
                    <div class="video-play-btn w-14 h-14 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shadow-2xl relative z-20 group-hover:scale-105 transition-all duration-200">
                        <i class="fa-solid fa-play text-lg ml-0.5 text-white"></i>
                    </div>
                </div>
            `;
        }

        const ytId = _getYouTubeId(url);
        if (ytId) {
            return `
                <div class="space-y-3 font-['Inter']">
                    <div class="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-['Inter']">
                        <span class="text-emerald-700 font-bold flex items-center gap-2">
                            <i class="fa-brands fa-youtube text-red-600 text-sm"></i> YouTube Video Linked (${ytId})
                        </span>
                        <a href="https://www.youtube.com/watch?v=${ytId}" target="_blank" rel="noopener noreferrer" class="text-slate-700 hover:text-black font-semibold hover:underline flex items-center gap-1.5 transition-colors">
                            <span>Open on YouTube</span>
                            <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                        </a>
                    </div>
                    <div class="video-thumbnail-panel is-playing bg-black rounded-2xl overflow-hidden shadow-md relative w-full aspect-video flex items-center justify-center" style="aspect-ratio: 16/9;">
                        <iframe class="w-full h-full border-none rounded-2xl bg-black" src="https://www.youtube.com/embed/${ytId}?enablejsapi=1" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin"></iframe>
                    </div>
                </div>
            `;
        }

        if (url.match(/\.mp4(\?.*)?$/i) || url.startsWith('blob:') || url.startsWith('data:video/')) {
            const fileName = window.editingMaterialState?.fileName || 'Uploaded MP4 Video';
            const fileSize = window.editingMaterialState?.fileSize || '';
            return `
                <div class="space-y-3 font-['Inter']">
                    <div class="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                        <span class="text-black font-semibold flex items-center gap-2 truncate">
                            <i class="fa-solid fa-circle-play text-red-600 text-sm shrink-0"></i>
                            <span class="truncate font-bold">${_escape(fileName)}</span>
                            ${fileSize ? `<span class="text-slate-400 font-normal shrink-0">(${fileSize})</span>` : ''}
                        </span>
                        <div class="flex items-center gap-3 shrink-0">
                            <button type="button" onclick="document.getElementById('mat-video-file-input')?.click()" class="text-xs font-bold text-black hover:underline cursor-pointer flex items-center gap-1">
                                <i class="fa-solid fa-arrow-rotate-right text-[10px]"></i> Change
                            </button>
                            <span class="text-slate-300">|</span>
                            <button type="button" onclick="window.removeMaterialFile('main')" class="text-xs font-bold text-red-600 hover:underline cursor-pointer flex items-center gap-1">
                                <i class="fa-solid fa-trash-can text-[10px]"></i> Remove
                            </button>
                        </div>
                    </div>
                    <div class="video-thumbnail-panel bg-black rounded-2xl overflow-hidden shadow-md relative w-full aspect-video flex items-center justify-center group" style="aspect-ratio: 16/9;">
                        <video id="mat-preview-video-el" preload="metadata" poster="image/ICC logo.jpg" controls playsinline class="w-full h-full object-contain rounded-2xl bg-black" src="${_escape(url)}"
                            onloadedmetadata="const d = typeof window.formatSecondsToDuration === 'function' ? window.formatSecondsToDuration(this.duration) : ''; const b = document.getElementById('mat-preview-duration-badge'); if (b && d) { b.innerHTML = '<i class=\\'fa-regular fa-clock\\' style=\\'font-size: 11px;\\'></i> ' + d; b.classList.remove('hidden'); b.style.display = 'inline-flex'; }"
                            onplay="document.getElementById('mat-preview-play-overlay')?.classList.add('hidden'); this.closest('.video-thumbnail-panel')?.classList.add('is-playing');"
                            onpause="if (this.currentTime === 0) { document.getElementById('mat-preview-play-overlay')?.classList.remove('hidden'); } this.closest('.video-thumbnail-panel')?.classList.remove('is-playing');"
                            onended="this.closest('.video-thumbnail-panel')?.classList.remove('is-playing'); document.getElementById('mat-preview-play-overlay')?.classList.remove('hidden');"></video>
                        <div id="mat-preview-play-overlay" onclick="const v = document.getElementById('mat-preview-video-el'); if (v) { v.play().catch(()=>{}); this.classList.add('hidden'); this.closest('.video-thumbnail-panel')?.classList.add('is-playing'); }"
                            class="absolute inset-0 flex items-center justify-center bg-black/60 cursor-pointer transition-opacity z-30 group">
                            <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/60 pointer-events-none"></div>
                            <div class="text-center text-white/90 relative z-40 pointer-events-none flex flex-col items-center">
                                <div class="video-play-btn w-14 h-14 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shadow-2xl group-hover:scale-105 transition-all duration-200">
                                    <i class="fa-solid fa-play text-lg ml-0.5 text-white"></i>
                                </div>
                            </div>
                            <span id="mat-preview-duration-badge" class="video-badge-bottom-left" style="position: absolute !important; bottom: 12px !important; left: 12px !important; font-size: 11px !important; padding: 3px 8px !important; z-index: 40;"><i class="fa-regular fa-clock" style="font-size: 10px;"></i> 03:30</span>
                        </div>
                    </div>
                </div>
            `;
        }

        return `
            <div class="p-5 rounded-2xl bg-amber-50/80 border border-amber-200 text-center space-y-1.5 font-['Inter']">
                <div class="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto text-sm">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                </div>
                <p class="text-xs font-bold text-amber-900">Only YouTube Video Links are Supported</p>
                <p class="text-[11px] text-amber-700 max-w-sm mx-auto">Please enter a valid YouTube link (e.g. <code>https://www.youtube.com/watch?v=...</code> or <code>https://youtu.be/...</code>).</p>
            </div>
        `;
    };

    window.handleMaterialFileSelect = function (input, targetField = 'main') {
        const file = input.files && input.files[0];
        if (!file) return;

        const limits = typeof window.getSigmaMaterialLimits === 'function'
            ? window.getSigmaMaterialLimits()
            : { video: { mp4: 500 }, docx: { reg: 10, ext: 25 }, pdf: { reg: 10, ext: 25 }, pptx: { reg: 50, ext: 100 } };

        const sizeFormatted = file.size > 1024 * 1024
            ? (file.size / (1024 * 1024)).toFixed(1) + ' MB'
            : (file.size / 1024).toFixed(0) + ' KB';

        window._sigmaUploadedFiles = window._sigmaUploadedFiles || new Map();
        window._sigmaUploadedFiles.set(file.name, file);
        window._sigmaUploadedFiles.set(file.name.toLowerCase(), file);
        const blobUrl = URL.createObjectURL(file);
        window._sigmaUploadedFiles.set(blobUrl, file);
        if (typeof window.sigmaStoreDocument === 'function') {
            window.sigmaStoreDocument(file.name, file);
        }

        if (targetField === 'main') {
            if (window.editingMaterialState.type === 'Video') {
                const isMp4 = file.name.toLowerCase().endsWith('.mp4') || file.type === 'video/mp4';
                if (!isMp4) {
                    alert('Only .mp4 video files are supported for upload.');
                    input.value = '';
                    return;
                }
                const maxVideoMb = Number(limits.video?.max || (Number(limits.video?.mp4 || limits.video?.std || 500) + Number(limits.video?.ext || 0))) || 550;
                if (file.size > maxVideoMb * 1024 * 1024) {
                    alert(`Selected video file exceeds the system limit of ${maxVideoMb} MB.`);
                    input.value = '';
                    return;
                }
            } else {
                const ext = (file.name.split('.').pop() || '').toLowerCase();
                let maxDocMb = Number(limits.docx?.max || (Number(limits.docx?.std || limits.docx?.reg || 500) + Number(limits.docx?.ext || 50))) || 550;
                if (ext === 'pdf') maxDocMb = Number(limits.pdf?.max || (Number(limits.pdf?.std || limits.pdf?.reg || 500) + Number(limits.pdf?.ext || 50))) || 550;
                else if (ext === 'pptx' || ext === 'ppt') maxDocMb = Number(limits.pptx?.max || (Number(limits.pptx?.std || limits.pptx?.reg || 500) + Number(limits.pptx?.ext || 50))) || 550;
                else if (ext === 'docx' || ext === 'doc') maxDocMb = Number(limits.docx?.max || (Number(limits.docx?.std || limits.docx?.reg || 500) + Number(limits.docx?.ext || 50))) || 550;
                else if (ext === 'txt') maxDocMb = Number(limits.docx?.max || (Number(limits.docx?.std || limits.docx?.reg || 500) + Number(limits.docx?.ext || 50))) || 550;

                if (file.size > maxDocMb * 1024 * 1024) {
                    alert(`Selected document exceeds the system limit of ${maxDocMb} MB.`);
                    input.value = '';
                    return;
                }
            }
            window.editingMaterialState.file = file;
            window.editingMaterialState.fileName = file.name;
            window.editingMaterialState.fileSize = sizeFormatted;
            // Use blob URL immediately for in-session video preview; data URL will overwrite once ready
            window.editingMaterialState.fileUrl = blobUrl;
            window.editingMaterialState.url = blobUrl;
            if (window.editingMaterialState.type === 'Video') {
                window.editingMaterialState.videoUrl = blobUrl;
                window.editingMaterialState.fileType = 'mp4';
                try {
                    const tempVideo = document.createElement('video');
                    tempVideo.preload = 'metadata';
                    tempVideo.src = blobUrl;
                    tempVideo.onloadedmetadata = function () {
                        if (typeof window.formatSecondsToDuration === 'function') {
                            window.editingMaterialState.duration = window.formatSecondsToDuration(tempVideo.duration);
                        }
                    };
                } catch (e) {}
            } else {
                const ext = (file.name.split('.').pop() || 'docx').toLowerCase();
                window.editingMaterialState.fileType = (ext === 'doc' ? 'docx' : (ext === 'ppt' ? 'pptx' : ext));
            }
            // Convert to persistent base64 data URL so the file survives page reloads
            // (blob URLs are session-only and die on reload — data URLs embed the actual bytes)
            // We also keep the File object in state.file for same-session previews (avoids base64 decode round-trip)
            if (window.editingMaterialState.type !== 'Video') {
                (function (f, state) {
                    const r = new FileReader();
                    r.onload = function (ev) {
                        // Overwrite the blob URL so performSaveMaterial always persists the real data URL
                        state.fileUrl = ev.target.result;
                        state.url = ev.target.result;
                    };
                    r.readAsDataURL(f);
                })(file, window.editingMaterialState);
            }
        } else if (targetField === 'rubric') {
            const maxDocMb = Number(limits.docx?.max || (Number(limits.docx?.std || limits.docx?.reg || 500) + Number(limits.docx?.ext || 50))) || 550;
            if (file.size > maxDocMb * 1024 * 1024) {
                alert(`Selected rubric exceeds the system limit of ${maxDocMb} MB.`);
                input.value = '';
                return;
            }
            window.editingMaterialState.rubricFile = file;
            window.editingMaterialState.rubricFileName = file.name;
            window.editingMaterialState.rubricFileSize = sizeFormatted;
            window.editingMaterialState.rubricUrl = blobUrl;
            // Persist rubric as data URL
            (function (f, state) {
                const r = new FileReader();
                r.onload = function (ev) { state.rubricUrl = ev.target.result; };
                r.readAsDataURL(f);
            })(file, window.editingMaterialState);

            // ── Sync to Set Details schedule draft + UI (if modal is open) ──
            try {
                const modalOverlay = document.getElementById('teacher-topic-schedule-overlay');
                if (modalOverlay && typeof window.getUnifiedScheduleMeta === 'function') {
                    const cat = modalOverlay.dataset._category || 'assessments';
                    const meta = window.getUnifiedScheduleMeta(cat);
                    const draft = window[meta.draftStateKey];
                    if (draft) {
                        if (!draft.assessmentRubrics) draft.assessmentRubrics = {};
                        if (!draft.assessmentRubricUrls) draft.assessmentRubricUrls = {};
                        if (!draft.assessmentRubricFiles) draft.assessmentRubricFiles = {};
                        const effectiveId = draft._targetId;
                        const targetKeys = (draft.pendingMaterialIds && draft.pendingMaterialIds.length > 0)
                            ? draft.pendingMaterialIds.map(String)
                            : (effectiveId ? [String(effectiveId)] : []);
                        if (targetKeys.length === 0 && effectiveId) targetKeys.push(String(effectiveId));
                        targetKeys.forEach(function (k) {
                            draft.assessmentRubrics[k] = file.name;
                            draft.assessmentRubricFiles[k] = { fileName: file.name, fileSize: file.size, fileType: file.type };
                        });
                        draft._uploadedRubricName = file.name;
                        draft._rubricDeleted = false;
                        // Also persist data URL to draft
                        (function (f2, dk, keys) {
                            const r2 = new FileReader();
                            r2.onload = function (ev) {
                                const d = window[dk];
                                if (d && d.assessmentRubricUrls) {
                                    keys.forEach(function (k) {
                                        d.assessmentRubricUrls[k] = ev.target.result;
                                        if (d.assessmentRubricFiles && d.assessmentRubricFiles[k]) d.assessmentRubricFiles[k].fileUrl = ev.target.result;
                                    });
                                }
                            };
                            r2.readAsDataURL(f2);
                        })(file, meta.draftStateKey, targetKeys);

                    }
                }
            } catch (e) {}

        } else if (targetField === 'guidelines') {
            const maxDocMb = Number(limits.docx?.max || (Number(limits.docx?.std || limits.docx?.reg || 500) + Number(limits.docx?.ext || 50))) || 550;
            if (file.size > maxDocMb * 1024 * 1024) {
                alert(`Selected guidelines document exceeds the system limit of ${maxDocMb} MB.`);
                input.value = '';
                return;
            }
            window.editingMaterialState.perfGuidelinesFile = file;
            window.editingMaterialState.perfGuidelinesFileName = file.name;
            window.editingMaterialState.perfGuidelinesUrl = blobUrl;
            // Persist guidelines as data URL
            (function (f, state) {
                const r = new FileReader();
                r.onload = function (ev) { state.perfGuidelinesUrl = ev.target.result; };
                r.readAsDataURL(f);
            })(file, window.editingMaterialState);
        } else if (targetField === 'perfRubric') {
            const maxDocMb = Number(limits.docx?.max || (Number(limits.docx?.std || limits.docx?.reg || 500) + Number(limits.docx?.ext || 50))) || 550;
            if (file.size > maxDocMb * 1024 * 1024) {
                alert(`Selected rubric exceeds the system limit of ${maxDocMb} MB.`);
                input.value = '';
                return;
            }
            window.editingMaterialState.perfRubricFile = file;
            window.editingMaterialState.perfRubricFileName = file.name;
            window.editingMaterialState.perfRubricUrl = blobUrl;
            // Persist perf rubric as data URL
            (function (f, state) {
                const r = new FileReader();
                r.onload = function (ev) { state.perfRubricUrl = ev.target.result; };
                r.readAsDataURL(f);
            })(file, window.editingMaterialState);
        }

        try {
            input.value = '';
        } catch (e) {}

        window.renderMaterialEditorForm();
    };

    window.removeMaterialFile = function (targetField = 'main') {
        if (targetField === 'main') {
            window.editingMaterialState.fileName = '';
            window.editingMaterialState.fileSize = '';
            window.editingMaterialState.file = null;
            window.editingMaterialState.fileUrl = '';
            window.editingMaterialState.url = '';
            if (window.editingMaterialState.type === 'Video') {
                window.editingMaterialState.videoUrl = '';
            }
        } else if (targetField === 'rubric') {
            window.editingMaterialState.rubricFileName = '';
            window.editingMaterialState.rubricFileSize = '';
            window.editingMaterialState.rubricFile = null;
            window.editingMaterialState.rubricUrl = '';
            window.editingMaterialState.hasRubric = false;


        } else if (targetField === 'guidelines') {
            window.editingMaterialState.perfGuidelinesFileName = '';
            window.editingMaterialState.perfGuidelinesFile = null;
            window.editingMaterialState.perfGuidelinesUrl = '';
        } else if (targetField === 'perfRubric') {
            window.editingMaterialState.perfRubricFileName = '';
            window.editingMaterialState.perfRubricFile = null;
            window.editingMaterialState.perfRubricUrl = '';
        }
        window.renderMaterialEditorForm();
    };

    window.previewMaterialEditorFile = function (targetField = 'main') {
        let state = window.editingMaterialState;
        
        // If state is empty or has no file/fileName, check if we are viewing a material detail
        if (!state || (!state.file && !state.fileUrl && !state.url && !state.fileName)) {
            const list = window.currentSubjectMaterials || window.currentSubjectAllMaterials || [];
            let detailMat = null;
            if (typeof window._currentDetailMaterialIndex === 'number' && window._currentDetailMaterialIndex >= 0) {
                detailMat = list[window._currentDetailMaterialIndex];
            }
            if (!detailMat && window._currentDetailMaterialId) {
                detailMat = list.find(x => x && (String(x.id) === String(window._currentDetailMaterialId) || String(x.materialId) === String(window._currentDetailMaterialId)));
            }
            if (detailMat) {
                state = {
                    ...state,
                    title: detailMat.title || '',
                    fileName: detailMat.fileName || (detailMat.title ? `${detailMat.title}.${detailMat.fileType || 'docx'}` : 'Document'),
                    fileUrl: detailMat.url || detailMat.fileUrl || '',
                    url: detailMat.url || detailMat.fileUrl || '',
                    fileType: detailMat.fileType || 'docx',
                    rubricFileName: detailMat.rubricFileName || detailMat.perfRubricFileName || '',
                    rubricUrl: detailMat.rubricUrl || detailMat.perfRubricUrl || '',
                    perfGuidelinesFileName: detailMat.perfGuidelinesFileName || '',
                    perfGuidelinesUrl: detailMat.perfGuidelinesUrl || ''
                };
            }
        }
        
        if (!state) return;
        let fileName = '';
        let fileObjOrUrl = null;
        let ext = 'docx';

        if (targetField === 'main') {
            fileName = state.fileName || (state.title ? `${state.title}.${state.fileType || 'docx'}` : 'Document');
            fileObjOrUrl = state.file || state.fileUrl || state.url;
            ext = (state.fileType || (fileName ? fileName.split('.').pop() : 'docx')).toLowerCase();
        } else if (targetField === 'rubric') {
            fileName = state.rubricFileName || 'Rubric';
            fileObjOrUrl = state.rubricFile || state.rubricUrl;
            ext = (fileName ? fileName.split('.').pop() : 'docx').toLowerCase();
        } else if (targetField === 'guidelines') {
            fileName = state.perfGuidelinesFileName || 'Guidelines';
            fileObjOrUrl = state.perfGuidelinesFile || state.perfGuidelinesUrl;
            ext = (fileName ? fileName.split('.').pop() : 'docx').toLowerCase();
        } else if (targetField === 'perfRubric') {
            fileName = state.perfRubricFileName || 'Rubric';
            fileObjOrUrl = state.perfRubricFile || state.perfRubricUrl;
            ext = (fileName ? fileName.split('.').pop() : 'docx').toLowerCase();
        }

        if (!fileName && !fileObjOrUrl) return;

        if (typeof window.openDocumentViewer === 'function') {
            window.openDocumentViewer(fileName, fileObjOrUrl, ext);
        }
    };

    // Alias used by editor file card onClicks
    window.previewEditorFile = function (field) {
        if (typeof window.previewMaterialEditorFile === 'function') {
            window.previewMaterialEditorFile(field);
        }
    };

    window.handleQuizStorageBack = function () {
        window._isQuizStoragePickerOpen = false;
        window._quizStoragePickerSelectedQuizId = null;
        window.renderMaterialEditorForm();
        if (typeof window.resetSubjectEditorScrollToTop === 'function') {
            window.resetSubjectEditorScrollToTop();
        }
    };

    window.openQuizCreatorTab = function () {
        try {
            localStorage.removeItem('sigma_active_quiz_creator_id');
            const rawActive = localStorage.getItem('sigma_active_user') ||
                              localStorage.getItem('sigma-logged-in-user') ||
                              localStorage.getItem('currentUser');
            if (rawActive) {
                const u = JSON.parse(rawActive);
                const uid = u?.id || u?.username || u?.email || null;
                if (uid) localStorage.removeItem(`sigma_quiz_creator_session_${uid}`);
            }
            localStorage.removeItem('sigma_quiz_creator_session');
        } catch(e) {}
        window.open('quiz-creator.html?new=1', '_blank');
    };

    window._quizStoragePickerSearch = '';
    window._quizStoragePickerFilter = 'all';
    window._quizStorageHasSearched = false;
    window._quizStorageIsMyMode = false;
    window._isQuizStoragePickerOpen = false;
    window._quizStoragePickerSelectedQuizId = null;

    window.openQuizStoragePicker = function () {
        window._isQuizStoragePickerOpen = true;
        const editorView = document.getElementById('subject-material-editor-view');
        if (!editorView) return;

        if (typeof window.resetSubjectEditorScrollToTop === 'function') {
            window.resetSubjectEditorScrollToTop();
        }

        if (typeof window.syncSubjectModalHeader === 'function') {
            window.syncSubjectModalHeader({
                title: 'Select Quiz from Storage',
                showBack: true,
                showActions: false,
                showQuizStorageActions: true,
                showStatus: false,
                showExit: false
            });
        }

        // Hide footer completely when viewing Quiz Storage
        window.setSubjectFooterBackButton(null);
        const globalFooter = document.getElementById('subject-global-footer');
        if (globalFooter) {
            globalFooter.classList.add('hidden');
            globalFooter.style.setProperty('display', 'none', 'important');
        }

        document.getElementById('mat-editor-save-btn')?.classList.add('hidden');
        document.getElementById('mat-editor-add-another-btn')?.classList.add('hidden');
        document.getElementById('mat-editor-delete-btn')?.classList.add('hidden');
        document.getElementById('quiz-storage-back-btn')?.classList.add('hidden');
        document.getElementById('quiz-storage-select-btn')?.classList.add('hidden');
        document.getElementById('quiz-storage-preview-btn')?.classList.add('hidden');
        document.getElementById('quiz-storage-copy-btn')?.classList.add('hidden');
        document.getElementById('quiz-storage-resume-btn')?.classList.add('hidden');

        // Always open in fresh DEFAULT STATE with no lingering selection
        window._quizStoragePickerSearch = '';
        window._quizStoragePickerFilter = 'all';
        window._quizStorageHasSearched = false;
        window._quizStorageIsMyMode = false;
        window._quizStorageVisibleLimit = 10;
        window._quizStoragePickerSelectedQuizId = null;
        editorView.innerHTML = '';
        window.renderQuizStoragePickerContent();
        if (typeof window.resetSubjectEditorScrollToTop === 'function') {
            window.resetSubjectEditorScrollToTop();
        }
    };

    window.previewSelectedStorageQuiz = function () {
        const selectedQuizId = window.editingMaterialState?.selectedQuizId;
        if (!selectedQuizId) return;
        if (typeof window.openQuizPreviewModal === 'function') {
            window.openQuizPreviewModal(selectedQuizId);
        }
    };

    window.copySelectedStorageQuizInCreator = function () {
        const selectedQuizId = window.editingMaterialState?.selectedQuizId;
        if (!selectedQuizId) return;
        window.open(`quiz-creator.html?mode=customize&id=${encodeURIComponent(selectedQuizId)}`, '_blank');
    };

    window.editSelectedStorageQuizInCreator = function () {
        const selectedQuizId = window.editingMaterialState?.selectedQuizId;
        if (!selectedQuizId) return;
        const library = typeof window.getStoredQuizLibrary === 'function' ? window.getStoredQuizLibrary() : [];
        const selectedQuiz = library.find(q => q.id === selectedQuizId);
        const currentUser = getCurrentEditorUser();
        const isOwner = selectedQuiz ? (typeof window.isUserQuizOwner === 'function' ? window.isUserQuizOwner(selectedQuiz, currentUser) : true) : false;
        if (!isOwner) {
            if (typeof window.showSigmaToast === 'function') {
                window.showSigmaToast('Only the author can edit this quiz.', 'warning');
            }
            return;
        }
        window.loadQuizIntoEditor(selectedQuizId, true);
    };

    window.toggleQuizStorageMyFilter = function () {
        window._quizStorageIsMyMode = !window._quizStorageIsMyMode;
        const input = document.getElementById('storage-picker-search-input');
        const clearBtn = document.getElementById('storage-picker-clear-btn');

        if (window._quizStorageIsMyMode) {
            // Save search text before entering folder mode
            window._savedQuizSearchBeforeFolder = input ? input.value : (window._quizStoragePickerSearch || '');
            window._quizStoragePickerSearch = '';
            if (input) {
                input.value = '';
                input.placeholder = window.innerWidth < 640 ? 'Search my quizzes...' : 'Search my created quizzes by title or topic...';
            }
            if (clearBtn) clearBtn.classList.add('hidden');
            window._quizStorageHasSearched = true;
            window._quizStoragePickerFilter = 'all';
            window._quizStorageVisibleLimit = 10;
        } else {
            // Restore previous search when folder is unselected
            const restored = window._savedQuizSearchBeforeFolder || '';
            window._quizStoragePickerSearch = restored;
            if (input) {
                input.value = restored;
                input.placeholder = window.innerWidth < 640 ? 'Search by quiz title...' : 'Search by quiz title or topic...';
            }
            if (clearBtn) clearBtn.classList.toggle('hidden', !restored.trim());
            window._quizStorageHasSearched = Boolean(restored.trim());
            window._quizStoragePickerFilter = 'all';
            window._quizStorageVisibleLimit = 10;
        }

        document.querySelectorAll('.quiz-storage-filter-chip').forEach(chip => {
            const isAll = chip.getAttribute('data-filter') === 'all';
            const isAiChip = chip.getAttribute('data-filter') === 'ai';
            const isDraftChip = chip.getAttribute('data-filter') === 'draft';
            const isManualChip = chip.getAttribute('data-filter') === 'manual';
            if (isAll) {
                chip.className = `quiz-storage-filter-chip shrink-0 whitespace-nowrap px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold transition-all cursor-pointer bg-[#15803d] text-white shadow-2xs`;
            } else {
                chip.className = `quiz-storage-filter-chip shrink-0 whitespace-nowrap px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${isAiChip || isDraftChip || isManualChip ? 'flex items-center gap-1 sm:gap-1.5' : ''} bg-slate-100 text-black-fade hover:text-black hover:bg-slate-200/70`;
                if (isAiChip) {
                    const ic = chip.querySelector('i');
                    if (ic) ic.className = 'fa-solid fa-bolt text-[10px] sm:text-xs text-black-fade';
                }
                if (isDraftChip) {
                    const ic = chip.querySelector('i');
                    if (ic) ic.className = 'fa-solid fa-file-lines text-[10px] sm:text-xs text-black-fade';
                }
                if (isManualChip) {
                    const ic = chip.querySelector('i');
                    if (ic) ic.className = 'fa-solid fa-pen-nib text-[10px] sm:text-xs text-black-fade';
                }
            }
        });

        window.renderQuizStoragePickerContent();
    };

    window.executeQuizStorageSearch = function () {
        const input = document.getElementById('storage-picker-search-input');
        window._quizStoragePickerSearch = (input?.value || '').trim();
        window._quizStoragePickerFilter = 'all'; // Always select 'All' when searching
        window._quizStorageHasSearched = true;
        window._quizStorageVisibleLimit = 10;

        document.querySelectorAll('.quiz-storage-filter-chip').forEach(chip => {
            const isAll = chip.getAttribute('data-filter') === 'all';
            const isAiChip = chip.getAttribute('data-filter') === 'ai';
            const isDraftChip = chip.getAttribute('data-filter') === 'draft';
            const isManualChip = chip.getAttribute('data-filter') === 'manual';
            if (isAll) {
                chip.className = `quiz-storage-filter-chip shrink-0 whitespace-nowrap px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold transition-all cursor-pointer bg-[#15803d] text-white shadow-2xs`;
            } else {
                chip.className = `quiz-storage-filter-chip shrink-0 whitespace-nowrap px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${isAiChip || isDraftChip || isManualChip ? 'flex items-center gap-1 sm:gap-1.5' : ''} bg-slate-100 text-black-fade hover:text-black hover:bg-slate-200/70`;
                if (isAiChip) {
                    const ic = chip.querySelector('i');
                    if (ic) ic.className = 'fa-solid fa-bolt text-[10px] sm:text-xs text-black-fade';
                }
                if (isDraftChip) {
                    const ic = chip.querySelector('i');
                    if (ic) ic.className = 'fa-solid fa-file-lines text-[10px] sm:text-xs text-black-fade';
                }
                if (isManualChip) {
                    const ic = chip.querySelector('i');
                    if (ic) ic.className = 'fa-solid fa-pen-nib text-[10px] sm:text-xs text-black-fade';
                }
            }
        });

        window.renderQuizStoragePickerContent();
    };

    window.clearQuizStorageSearch = function () {
        window._quizStoragePickerSearch = '';
        const inp = document.getElementById('storage-picker-search-input');
        if (inp) inp.value = '';
        const clearBtn = document.getElementById('storage-picker-clear-btn');
        if (clearBtn) clearBtn.classList.add('hidden');
        window._quizStoragePickerFilter = 'all';
        window._quizStorageVisibleLimit = 10;
        if (!window._quizStorageIsMyMode) {
            window._quizStorageHasSearched = false;
        }
        window.renderQuizStoragePickerContent();
    };

    window.renderQuizStoragePickerContent = function () {
        if (!window._isQuizStoragePickerOpen) return;
        const editorView = document.getElementById('subject-material-editor-view');
        if (!editorView) return;

        const allQuizzes = typeof window.getStoredQuizLibrary === 'function' ? window.getStoredQuizLibrary() : [];
        const q = (window._quizStoragePickerSearch || '').toLowerCase().trim();
        const filter = window._quizStoragePickerFilter || 'all';

        const currentUser = window.getQuizActiveUser ? window.getQuizActiveUser() : getCurrentEditorUser();
        const isOwn = (item) => (window.isUserQuizOwner ? window.isUserQuizOwner(item, currentUser) : false);

        let filtered = allQuizzes.filter(item => {
            const isAiQuiz = Boolean(item.isAi || item.isAiGenerated || item.aiGenerated || item.source === 'ai' || item.generator === 'ai' || item.type === 'ai' || (item.tags && item.tags.includes('ai')) || (item.desc && item.desc.toLowerCase().includes('ai generated')) || (item.title && item.title.toLowerCase().includes('ai')) || item.engine);
            const isDraft = (item.status === 'draft' || item.isDraft === true);

            // Drafts are STRICTLY private — only visible to the actual author
            if (isDraft && !isOwn(item)) return false;

            if (window._quizStorageIsMyMode) {
                if (!isOwn(item)) return false;
            }

            if (filter === 'recent') {
                let itemTime = item.createdTimestamp || 0;
                if (!itemTime && item.createdAt) {
                    const parsed = new Date(item.createdAt).getTime();
                    if (!isNaN(parsed)) itemTime = parsed;
                }
                if (!itemTime && item.updatedAt) {
                    const parsed = new Date(item.updatedAt).getTime();
                    if (!isNaN(parsed)) itemTime = parsed;
                }
                const isUnder24Hours = Boolean(itemTime && (Date.now() - itemTime < 86400000) && (Date.now() - itemTime >= 0));
                return !isDraft && ((item.isNew && isUnder24Hours) || isUnder24Hours);
            } else if (filter === 'draft') {
                return isDraft && isOwn(item);
            } else if (filter === 'ai') {
                return isAiQuiz;
            } else if (filter === 'manual') {
                return !isAiQuiz;
            }
            return true; // 'all'
        });

        if (q) {
            const qNormalized = q.replace(/^#?qz-?/i, '');
            filtered = filtered.filter(item => {
                const codeNormalized = (item.code || item.quizCode || item.refCode || '').replace(/^#?qz-?/i, '');
                return (item.title || '').toLowerCase().includes(q) ||
                    (item.desc || '').toLowerCase().includes(q) ||
                    (item.subject || '').toLowerCase().includes(q) ||
                    (qNormalized && codeNormalized && codeNormalized.includes(qNormalized));
            });
        }

        // If quiz is new it stacks and starts on top first
        filtered.sort((a, b) => {
            const aIsDraft = a.status === 'draft' || a.isDraft === true;
            const bIsDraft = b.status === 'draft' || b.isDraft === true;
            const aTime = a.createdTimestamp || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
            const bTime = b.createdTimestamp || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
            const aIsNew = !aIsDraft && Boolean(aTime && (Date.now() - aTime < 86400000));
            const bIsNew = !bIsDraft && Boolean(bTime && (Date.now() - bTime < 86400000));

            if (aIsNew && !bIsNew) return -1;
            if (!aIsNew && bIsNew) return 1;

            const timeA = a.createdTimestamp || (a.updatedAt ? new Date(a.updatedAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0));
            const timeB = b.createdTimestamp || (b.updatedAt ? new Date(b.updatedAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0));
            return timeB - timeA;
        });

        let listHtml = '';
        if (filtered.length === 0) {
            listHtml = `
                <div class="py-10 sm:py-14 px-4 text-center font-['Inter'] space-y-1.5 animate-in fade-in duration-150">
                    <div class="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-slate-100 text-black flex items-center justify-center mx-auto text-base sm:text-xl mb-3 border border-slate-200/80 shadow-2xs">
                        <i class="fa-solid fa-folder text-black-fade"></i>
                    </div>
                    <p class="font-bold text-black text-sm sm:text-base tracking-tight">No Quizzes Found</p>
                    <p class="text-xs sm:text-sm text-black-fade max-w-sm mx-auto">No stored quizzes match this filter or search query.</p>
                </div>
            `;
        } else {
            // Build draft resume panel (only if current user owns a draft)
            let storageDraftPanelHtml = '';
            if (window._quizStorageIsMyMode || filter === 'draft' || filter === 'all') {
                const myDrafts = allQuizzes.filter(item => {
                    const isDraft = (item.status === 'draft' || item.isDraft === true);
                    return isDraft && isOwn(item);
                });
                myDrafts.sort((a, b) => {
                    const ta = a.createdTimestamp || (a.updatedAt ? new Date(a.updatedAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0));
                    const tb = b.createdTimestamp || (b.updatedAt ? new Date(b.updatedAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0));
                    return tb - ta;
                });
                const latestStorageDraft = myDrafts[0];
                if (latestStorageDraft) {
                    const _esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
                    const dTitle = _esc(latestStorageDraft.title || 'Untitled Draft');
                    const dCode  = (latestStorageDraft.code || latestStorageDraft.quizCode || latestStorageDraft.refCode || '').replace(/^#/, '');
                    const authorInfo = (typeof window.resolveQuizAuthor === 'function') ? window.resolveQuizAuthor(latestStorageDraft) : {
                        authorId: latestStorageDraft.authorId || '0000000',
                        authorName: latestStorageDraft.authorName || 'Stanley Garcia',
                        authorRole: 'Admin'
                    };
                    const dAuthor = _esc(authorInfo.authorName || 'Stanley Garcia');
                    const dRoleDisplay = _esc(authorInfo.authorRole || 'Admin');
                    storageDraftPanelHtml = `
                        <div class="mb-3 sm:mb-4 rounded-xl sm:rounded-2xl border border-amber-200 bg-amber-50 p-2.5 sm:p-4 flex items-center gap-2.5 sm:gap-3.5 shadow-2xs animate-in fade-in duration-150">
                            <div class="w-8.5 h-8.5 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0">
                                <i class="fa-solid fa-file-lines text-xs sm:text-base text-amber-800"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-[9.5px] sm:text-xs font-extrabold text-amber-600 tracking-wide mb-0.5 leading-tight">Continue Where You Left Off</p>
                                <p class="text-xs sm:text-base font-bold text-black truncate leading-snug">${dTitle}</p>
                                <div class="flex items-center gap-1.5 mt-0.5">
                                    ${dCode ? `<span class="text-[10px] sm:text-xs text-black-fade font-mono">${_esc(dCode)}</span>` : ''}
                                    ${dCode ? `<span class="text-[10px] sm:text-xs text-black-fade">·</span>` : ''}
                                    <span class="text-[10.5px] sm:text-xs text-black-fade font-medium">By <span class="font-semibold text-black-fade">${dAuthor}</span> <span class="text-[9.5px] sm:text-[11px] text-black-fade font-normal">(${dRoleDisplay})</span></span>
                                </div>
                            </div>
                            <button type="button" onclick="window.confirmResumeDraft('${_esc(latestStorageDraft.id)}', event);" class="sigma-btn sigma-btn-primary h-7 sm:h-9 px-2.5 sm:px-4 text-xs sm:text-sm font-semibold rounded-lg shrink-0 flex items-center gap-1.5 cursor-pointer">
                                <i class="fa-solid fa-arrow-rotate-right text-[10px] sm:text-xs"></i>
                                Resume
                            </button>
                        </div>
                    `;
                }
            }
            window._quizStorageCurrentFiltered = filtered;
            const limit = window._quizStorageVisibleLimit || 10;
            const displayed = filtered.slice(0, limit);
            const hasMore = filtered.length > limit;

            listHtml = `
                ${storageDraftPanelHtml}
                <div id="quiz-storage-grid" class="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3.5 max-h-[58vh] overflow-y-auto pt-1 pb-2 px-0.5 font-['Inter'] scrollbar-thin">
                    ${displayed.map(quiz => {
                        if (typeof window.renderQuizStorageCardHtml === 'function') {
                            return window.renderQuizStorageCardHtml(quiz, {
                                mode: 'select',
                                selectedQuizId: window._quizStoragePickerSelectedQuizId,
                                currentUser: currentUser,
                                onSelect: 'window.selectQuizFromStorage'
                            });
                        }
                        return '';
                    }).join('')}
                    ${hasMore ? `
                        <div id="quiz-storage-load-more-sentinel" class="col-span-full py-4 text-center">
                            <span class="inline-flex items-center gap-2 text-xs font-semibold text-black-fade bg-slate-100 px-3.5 py-1.5 rounded-full border border-slate-200/80 shadow-2xs">
                                <i class="fa-solid fa-circle-notch fa-spin text-[#15803d]"></i>
                                <span>Loading more quizzes...</span>
                            </span>
                        </div>
                    ` : ''}
                </div>
            `;
        }

        // If the container is already built, simply update the list container and UI elements
        const existingList = document.getElementById('quiz-storage-list-container');
        if (existingList) {
            existingList.innerHTML = listHtml;
            const chipsEl = document.getElementById('quiz-storage-filter-chips');
            if (chipsEl) {
                chipsEl.classList.remove('hidden');
            }
            const myBtn = document.getElementById('storage-filter-my-btn');
            if (myBtn) {
                if (window._quizStorageIsMyMode) {
                    myBtn.className = 'w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl border border-[#15803d] bg-[#15803d] text-white flex items-center justify-center cursor-pointer transition-colors shrink-0 shadow-2xs';
                    myBtn.innerHTML = '<i class="fa-solid fa-folder-open text-xs sm:text-sm text-white"></i>';
                } else {
                    myBtn.className = 'w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-black flex items-center justify-center cursor-pointer transition-colors shrink-0 shadow-2xs';
                    myBtn.innerHTML = '<i class="fa-solid fa-folder-open text-xs sm:text-sm text-black"></i>';
                }
            }

            const searchInput = document.getElementById('storage-picker-search-input');
            if (searchInput && searchInput.value !== (window._quizStoragePickerSearch || '')) {
                searchInput.value = window._quizStoragePickerSearch || '';
            }
            const clearBtn = document.getElementById('storage-picker-clear-btn');
            if (clearBtn) {
                clearBtn.classList.toggle('hidden', !(window._quizStoragePickerSearch || '').trim());
            }

            if (typeof window.updateQuizStorageSelectButtonState === 'function') {
                window.updateQuizStorageSelectButtonState();
            }

            if (typeof window.setupQuizStorageInfiniteScroll === 'function') {
                window.setupQuizStorageInfiniteScroll();
            }

            return;
        }

        editorView.innerHTML = `
            <div class="space-y-3.5 sm:space-y-4 animate-in fade-in duration-150 font-['Inter']">
                <!-- Search & Filters Section -->
                <div class="space-y-2.5 sm:space-y-3 shrink-0">
                    <!-- Search Bar with inside Green Search Button + Folder My Storage Button -->
                    <div class="flex items-center gap-2">
                        <div id="storage-picker-search-container" class="relative flex-1 flex items-center h-9 sm:h-11 bg-slate-50 border border-slate-300 rounded-xl px-2.5 sm:px-3.5 focus-within:bg-white focus-within:border-[#FFD000] focus-within:ring-0 focus-within:outline-none focus-within:shadow-none transition-all gap-1.5 sm:gap-2" style="box-shadow: none !important;">
                            <i class="fa-solid fa-magnifying-glass text-xs sm:text-sm text-black mr-1 sm:mr-2 shrink-0"></i>
                            <input type="text" id="storage-picker-search-input" placeholder="${window.innerWidth < 640 ? 'Search by quiz title...' : 'Search by quiz title or topic...'}"
                                value="${_escape(window._quizStoragePickerSearch || '')}"
                                class="flex-1 min-w-0 bg-transparent text-xs sm:text-sm font-medium text-black outline-none border-0 !border-none focus:ring-0 focus:outline-none focus:border-none shadow-none placeholder:text-black-fade truncate pr-2 sm:pr-3"
                                style="border: none !important; outline: none !important; box-shadow: none !important; background: transparent !important;"
                                autocomplete="off"
                                oninput="const clearBtn = document.getElementById('storage-picker-clear-btn'); if(clearBtn) clearBtn.classList.toggle('hidden', !this.value.trim());"
                                onkeydown="if(event.key === 'Enter'){ event.preventDefault(); window.executeQuizStorageSearch(); }">
                            <button type="button" onclick="window.clearQuizStorageSearch()" id="storage-picker-clear-btn" class="${window._quizStoragePickerSearch ? '' : 'hidden'} text-black-fade hover:text-black text-xs px-1 cursor-pointer shrink-0">
                                <i class="fa-solid fa-xmark"></i>
                            </button>
                            <button type="button" onclick="window.executeQuizStorageSearch()" id="storage-picker-search-btn"
                                class="h-7 sm:h-[34px] px-3 sm:px-5 bg-[#15803d] hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold flex items-center justify-center cursor-pointer transition-colors shrink-0 rounded-lg sm:rounded-xl shadow-none ml-1 sm:ml-1.5">
                                <span>Search</span>
                            </button>
                        </div>
                        <button type="button" onclick="window.toggleQuizStorageMyFilter()" id="storage-filter-my-btn"
                            title="My Storage (Quizzes created by you)"
                            class="w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl border ${window._quizStorageIsMyMode ? 'border-[#15803d] bg-[#15803d] text-white' : 'border-slate-200 bg-slate-100 hover:bg-slate-200 text-black'} flex items-center justify-center cursor-pointer transition-colors shrink-0 shadow-2xs">
                            <i class="fa-solid fa-folder-open text-xs sm:text-sm ${window._quizStorageIsMyMode ? 'text-white' : 'text-black'}"></i>
                        </button>
                    </div>

                    <!-- Category Filter Chips -->
                    <div class="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pt-1 flex-nowrap shrink-0" id="quiz-storage-filter-chips">
                        <button type="button" onclick="window.setQuizStorageFilter('all')"
                            class="quiz-storage-filter-chip shrink-0 whitespace-nowrap px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${filter === 'all' ? 'bg-[#15803d] text-white shadow-2xs' : 'bg-slate-100 text-black-fade hover:text-black hover:bg-slate-200/70'}" data-filter="all">
                            All
                        </button>
                        <button type="button" onclick="window.setQuizStorageFilter('recent')"
                            class="quiz-storage-filter-chip shrink-0 whitespace-nowrap px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${filter === 'recent' ? 'bg-[#15803d] text-white shadow-2xs' : 'bg-slate-100 text-black-fade hover:text-black hover:bg-slate-200/70'}" data-filter="recent">
                            Recent
                        </button>
                        <button type="button" onclick="window.setQuizStorageFilter('draft')"
                            class="quiz-storage-filter-chip shrink-0 whitespace-nowrap px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center gap-1 sm:gap-1.5 ${filter === 'draft' ? 'bg-[#15803d] text-white shadow-2xs' : 'bg-slate-100 text-black-fade hover:text-black hover:bg-slate-200/70'}" data-filter="draft">
                            <i class="fa-solid fa-file-lines text-[10px] sm:text-xs ${filter === 'draft' ? 'text-white' : 'text-black-fade'}"></i>
                            <span>Draft</span>
                        </button>
                        <button type="button" onclick="window.setQuizStorageFilter('ai')"
                            class="quiz-storage-filter-chip shrink-0 whitespace-nowrap px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center gap-1 sm:gap-1.5 ${filter === 'ai' ? 'bg-[#15803d] text-white shadow-2xs' : 'bg-slate-100 text-black-fade hover:text-black hover:bg-slate-200/70'}" data-filter="ai">
                            <i class="fa-solid fa-bolt text-[10px] sm:text-xs ${filter === 'ai' ? 'text-white' : 'text-black-fade'}"></i>
                            <span>AI Generated</span>
                        </button>
                        <button type="button" onclick="window.setQuizStorageFilter('manual')"
                            class="quiz-storage-filter-chip shrink-0 whitespace-nowrap px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center gap-1 sm:gap-1.5 ${filter === 'manual' ? 'bg-[#15803d] text-white shadow-2xs' : 'bg-slate-100 text-black-fade hover:text-black hover:bg-slate-200/70'}" data-filter="manual">
                            <i class="fa-solid fa-pen-nib text-[10px] sm:text-xs ${filter === 'manual' ? 'text-white' : 'text-black-fade'}"></i>
                            <span>Manual</span>
                        </button>
                    </div>
                </div>

                <!-- Quizzes List -->
                <div id="quiz-storage-list-container" class="space-y-2.5 sm:space-y-3 pt-1">
                    ${listHtml}
                </div>
            </div>
        `;

        if (typeof window.updateQuizStorageSelectButtonState === 'function') {
            window.updateQuizStorageSelectButtonState();
        }
        if (typeof window.setupQuizStorageInfiniteScroll === 'function') {
            window.setupQuizStorageInfiniteScroll();
        }
    };

    window.loadMoreQuizStorageItems = function () {
        const all = window._quizStorageCurrentFiltered || [];
        const currentLimit = window._quizStorageVisibleLimit || 10;
        if (currentLimit >= all.length) return;

        const nextBatch = all.slice(currentLimit, currentLimit + 10);
        window._quizStorageVisibleLimit = currentLimit + 10;

        const grid = document.getElementById('quiz-storage-grid');
        if (!grid) return;

        const sentinel = document.getElementById('quiz-storage-load-more-sentinel');
        const currentUser = window.getQuizActiveUser ? window.getQuizActiveUser() : getCurrentEditorUser();

        nextBatch.forEach(quiz => {
            if (typeof window.renderQuizStorageCardHtml === 'function') {
                const cardHtml = window.renderQuizStorageCardHtml(quiz, {
                    mode: 'select',
                    selectedQuizId: window.editingMaterialState?.selectedQuizId,
                    currentUser: currentUser,
                    onSelect: 'window.selectQuizFromStorage'
                });
                if (sentinel) {
                    sentinel.insertAdjacentHTML('beforebegin', cardHtml);
                } else {
                    grid.insertAdjacentHTML('beforeend', cardHtml);
                }
            }
        });

        if (window._quizStorageVisibleLimit >= all.length) {
            if (sentinel) sentinel.remove();
            if (grid._infiniteObserver) {
                grid._infiniteObserver.disconnect();
                grid._infiniteObserver = null;
            }
        }
    };

    window.setupQuizStorageInfiniteScroll = function () {
        const grid = document.getElementById('quiz-storage-grid');
        if (!grid) return;

        if (!grid._hasScrollListener) {
            grid._hasScrollListener = true;
            grid.addEventListener('scroll', function () {
                if (grid.scrollTop + grid.clientHeight >= grid.scrollHeight - 150) {
                    window.loadMoreQuizStorageItems();
                }
            }, { passive: true });
        }

        const sentinel = document.getElementById('quiz-storage-load-more-sentinel');
        if (sentinel && window.IntersectionObserver) {
            if (grid._infiniteObserver) {
                grid._infiniteObserver.disconnect();
            }
            grid._infiniteObserver = new IntersectionObserver((entries) => {
                if (entries[0] && entries[0].isIntersecting) {
                    window.loadMoreQuizStorageItems();
                }
            }, { root: grid, threshold: 0.1 });
            grid._infiniteObserver.observe(sentinel);
        }
    };

    window.updateQuizStorageSelectButtonState = function () {
        const btn = document.getElementById('quiz-storage-header-select-btn');
        if (!btn) return;
        const hasSelection = Boolean(window._quizStoragePickerSelectedQuizId);
        btn.disabled = !hasSelection;
        if (hasSelection) {
            btn.classList.remove('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
            btn.classList.add('cursor-pointer');
            btn.removeAttribute('disabled');
            btn.setAttribute('aria-disabled', 'false');
        } else {
            btn.classList.add('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
            btn.classList.remove('cursor-pointer');
            btn.setAttribute('disabled', 'disabled');
            btn.setAttribute('aria-disabled', 'true');
        }
    };

    window.setQuizStorageFilter = function (filterName) {
        window._quizStoragePickerFilter = filterName;
        window._quizStorageHasSearched = true;
        window._quizStorageVisibleLimit = 10;
        document.querySelectorAll('.quiz-storage-filter-chip').forEach(chip => {
            const filterAttr = chip.getAttribute('data-filter');
            const isMatch = filterAttr === filterName;
            const isAiChip = filterAttr === 'ai';
            const isDraftChip = filterAttr === 'draft';
            const isManualChip = filterAttr === 'manual';
            if (isMatch) {
                chip.className = `quiz-storage-filter-chip shrink-0 whitespace-nowrap px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${isAiChip || isDraftChip || isManualChip ? 'flex items-center gap-1 sm:gap-1.5' : ''} bg-[#15803d] text-white shadow-2xs`;
                if (isAiChip) {
                    const ic = chip.querySelector('i');
                    if (ic) ic.className = 'fa-solid fa-bolt text-[10px] sm:text-xs text-white';
                }
                if (isDraftChip) {
                    const ic = chip.querySelector('i');
                    if (ic) ic.className = 'fa-solid fa-file-lines text-[10px] sm:text-xs text-white';
                }
                if (isManualChip) {
                    const ic = chip.querySelector('i');
                    if (ic) ic.className = 'fa-solid fa-pen-nib text-[10px] sm:text-xs text-white';
                }
            } else {
                chip.className = `quiz-storage-filter-chip shrink-0 whitespace-nowrap px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${isAiChip || isDraftChip || isManualChip ? 'flex items-center gap-1 sm:gap-1.5' : ''} bg-slate-100 text-black-fade hover:text-black hover:bg-slate-200/70`;
                if (isAiChip) {
                    const ic = chip.querySelector('i');
                    if (ic) ic.className = 'fa-solid fa-bolt text-[10px] sm:text-xs text-black-fade';
                }
                if (isDraftChip) {
                    const ic = chip.querySelector('i');
                    if (ic) ic.className = 'fa-solid fa-file-lines text-[10px] sm:text-xs text-black-fade';
                }
                if (isManualChip) {
                    const ic = chip.querySelector('i');
                    if (ic) ic.className = 'fa-solid fa-pen-nib text-[10px] sm:text-xs text-black-fade';
                }
            }
        });
        window.renderQuizStoragePickerContent();
    };

    window.selectQuizFromStorage = function (quizId, event) {
        if (event) event.stopPropagation();
        window._quizStoragePickerSelectedQuizId = quizId;
        window.updateQuizStorageSelectButtonState();
        const grid = document.getElementById('quiz-storage-grid');
        const prevScroll = grid ? grid.scrollTop : 0;
        window.renderQuizStoragePickerContent();
        const newGrid = document.getElementById('quiz-storage-grid');
        if (newGrid && prevScroll) {
            newGrid.scrollTop = prevScroll;
        }
    };

    window.confirmSelectedStorageQuiz = function () {
        const selectedQuizId = window._quizStoragePickerSelectedQuizId;
        if (!selectedQuizId) {
            if (typeof window.showToastNotification === 'function') {
                window.showToastNotification('Please select a quiz first.', 'warning');
            } else if (typeof window.showSigmaToast === 'function') {
                window.showSigmaToast('Please select a quiz first.', 'warning');
            }
            return;
        }
        const library = typeof window.getStoredQuizLibrary === 'function' ? window.getStoredQuizLibrary() : [];
        const quiz = library.find(q => q.id === selectedQuizId);
        if (quiz) {
            window.editingMaterialState.selectedQuizId = quiz.id;
            window.editingMaterialState.selectedQuizTitle = quiz.title || 'Untitled Quiz';
            window.editingMaterialState.selectedQuizQuestions = Array.isArray(quiz.questions) ? quiz.questions.length : (quiz.totalQuestions || 0);
            window.editingMaterialState.selectedQuizPoints = quiz.totalPoints || (window.editingMaterialState.selectedQuizQuestions * 10);
            window.editingMaterialState.selectedQuizIcon = quiz.icon || '';
            window.editingMaterialState.selectedQuizColor = quiz.color || '';
            window.editingMaterialState.selectedQuizIsAi = Boolean(quiz.isAi || quiz.isAiGenerated || quiz.aiGenerated || quiz.source === 'ai' || quiz.generator === 'ai' || quiz.type === 'ai' || (Array.isArray(quiz.tags) && quiz.tags.includes('ai')) || (quiz.desc && quiz.desc.toLowerCase().includes('ai generated')) || (quiz.title && quiz.title.toLowerCase().includes('ai generated')) || (quiz.title && /\bai\b/i.test(quiz.title)) || quiz.engine);
            if (!document.getElementById('mat-editor-title')?.value && !window.editingMaterialState.title) {
                window.editingMaterialState.title = quiz.title;
            }
        }
        window._quizStoragePickerSelectedQuizId = null;
        if (typeof window.showToastNotification === 'function') {
            window.showToastNotification(`Attached quiz "${quiz?.title || 'Quiz'}" to material`, 'success');
        }
        window.renderMaterialEditorForm();
        if (typeof window.resetSubjectEditorScrollToTop === 'function') {
            window.resetSubjectEditorScrollToTop();
        }
    };

    window.renderMaterialEditorForm = function () {
        window._isQuizStoragePickerOpen = false;
        const editorView = document.getElementById('subject-material-editor-view');
        if (!editorView) return;

        const mainView = document.getElementById('subject-materials-main-view');
        const grid = document.getElementById('subject-materials-grid');
        const empty = document.getElementById('subject-materials-empty');
        const detailView = document.getElementById('subject-material-detail-view');
        const segmentedHeader = document.getElementById('subject-segmented-header');

        if (segmentedHeader) {
            segmentedHeader.classList.add('hidden');
            segmentedHeader.style.setProperty('display', 'none', 'important');
        }
        if (mainView) {
            mainView.classList.add('hidden');
            mainView.style.setProperty('display', 'none', 'important');
        }
        if (grid) {
            grid.classList.add('hidden');
            grid.style.setProperty('display', 'none', 'important');
        }
        if (empty) {
            empty.classList.add('hidden');
            empty.style.setProperty('display', 'none', 'important');
        }
        if (detailView) {
            detailView.classList.add('hidden');
            detailView.style.setProperty('display', 'none', 'important');
        }
        editorView.classList.remove('hidden');
        editorView.style.removeProperty('display');
        editorView.style.setProperty('display', 'block', 'important');

        document.getElementById('quiz-storage-select-btn')?.classList.add('hidden');
        document.getElementById('quiz-storage-preview-btn')?.classList.add('hidden');
        document.getElementById('quiz-storage-copy-btn')?.classList.add('hidden');
        document.getElementById('subject-step2-prev-btn')?.classList.add('hidden');
        document.getElementById('subject-step3-bottom-actions')?.classList.add('hidden');

        const state = window.editingMaterialState;
        const isEdit = state.index !== -1;
        const activeType = state.type || 'Lesson';



        if (typeof window.syncSubjectModalHeader === 'function') {
            window.syncSubjectModalHeader({
                title: (isEdit ? 'Edit ' : 'Add ') + (activeType || 'Lesson'),
                showBack: true,
                showActions: false,
                showQuizStorageActions: false,
                showStatus: false,
                showExit: false
            });
        }

        const isTeacher = isCurrentEditorTeacher();
        const currentUser = getCurrentEditorUser();
        const currentUserId = currentUser ? String(currentUser.id || currentUser.uid || currentUser.username || '') : '';
        const currentUserName = currentUser ? (`${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.name || '') : '';
        const myName = currentUserName.trim().toLowerCase();

        const activeQuarters = getActiveSubjectQuarters();
        const curMatQ = normalizeQuarterKey(window.currentSubjectMaterialQuarter || activeQuarters[0] || 'q1');
        const masterTopics = (window.currentSubjectAllTopics && window.currentSubjectAllTopics.length > 0)
            ? window.currentSubjectAllTopics
            : (window.currentSubjectTopics || []);

        const allTopics = masterTopics.filter(t => {
            if (state.topicId && String(t.id) === String(state.topicId)) return true;
            const tQ = normalizeQuarterKey(t.quarter || activeQuarters[0] || 'q1');
            return tQ === curMatQ;
        });

        const editorSection = String(
            window.activeSubjectEditorSection
            || (typeof currentTopicState !== 'undefined' ? currentTopicState?.selectedSection : '')
            || (typeof resolveTeacherActiveSection === 'function' ? resolveTeacherActiveSection() : '')
            || localStorage.getItem('sigma-active-classroom-section')
            || ''
        ).trim().toLowerCase();
        const sameEditorSection = (value) => {
            const raw = String(value || '').trim().toLowerCase();
            if (!raw || !editorSection) return false;
            if (raw === editorSection) return true;
            const stripGrade = (name) => name.replace(/^grade\s*\d+\s*[-–]\s*/i, '').trim();
            const left = stripGrade(raw);
            const right = stripGrade(editorSection);
            return Boolean(left && right && left === right);
        };

        const availableTopics = isTeacher ? allTopics.filter(t => {
            const rawRole = t.authorRole || t.role || (t.isAdmin ? 'Admin' : (t.isTeacher ? 'Teacher' : 'Admin'));
            const authorRole = normalizeSubjectAuthorRole(rawRole);
            if (authorRole === 'Admin') return true;
            if (!editorSection) return false;
            return sameEditorSection(t.section || t.roomSection || '');
        }) : (() => {
            const scope = window.activeCurriculumScope || 'master';
            if (scope === 'master') {
                return allTopics.filter(t => {
                    const role = normalizeSubjectAuthorRole(t.authorRole || t.role || (t.isAdmin ? 'Admin' : (t.isTeacher ? 'Teacher' : 'Admin')));
                    return role === 'Admin';
                });
            } else if (scope === 'all') {
                return [...allTopics];
            } else {
                const scopeLabel = String(window.activeCurriculumScopeLabel || '').trim().toLowerCase();
                const cleanTeacherName = scopeLabel.replace(/\s*\(.*?\)\s*/g, '').trim();
                return allTopics.filter(t => {
                    const role = normalizeSubjectAuthorRole(t.authorRole || t.role || (t.isAdmin ? 'Admin' : (t.isTeacher ? 'Teacher' : 'Admin')));
                    if (role === 'Admin') return true;
                    if (t.authorId && String(t.authorId) === String(scope)) return true;
                    if (t.authorName) {
                        const tAuthor = t.authorName.trim().toLowerCase();
                        if (cleanTeacherName && (tAuthor === cleanTeacherName || cleanTeacherName.includes(tAuthor) || tAuthor.includes(cleanTeacherName))) return true;
                        if (scopeLabel && (scopeLabel.includes(tAuthor) || tAuthor.includes(scopeLabel))) return true;
                    }
                    return false;
                });
            }
        })();

        const hasSelected = Boolean(state.topicId) && availableTopics.some(t => String(t.id) === String(state.topicId));
        const selectedTopicId = hasSelected ? String(state.topicId) : '';
        state.topicId = selectedTopicId;

        const placeholderOption = `<option value="" disabled ${!selectedTopicId ? 'selected' : ''}>Select Topic</option>`;
        const topicsOptions = availableTopics.length > 0
            ? placeholderOption + availableTopics.map(t => `<option value="${t.id}" ${String(t.id) === selectedTopicId ? 'selected' : ''}>${_escape(t.title)}</option>`).join('')
            : '<option value="" disabled selected>No topics available for this quarter</option>';

        // Get system material limits from settings
        const limits = typeof window.getSigmaMaterialLimits === 'function'
            ? window.getSigmaMaterialLimits()
            : { video: { max: 550 }, docx: { max: 550 }, pdf: { max: 550 }, pptx: { max: 550 } };
        const maxVideoMb = limits.video?.max || (Number(limits.video?.mp4 || limits.video?.std || 500) + Number(limits.video?.ext || 50)) || 550;
        const maxDocxMb = limits.docx?.max || (Number(limits.docx?.std || limits.docx?.reg || 500) + Number(limits.docx?.ext || 50)) || 550;
        const maxPdfMb = limits.pdf?.max || (Number(limits.pdf?.std || limits.pdf?.reg || 500) + Number(limits.pdf?.ext || 50)) || 550;
        const maxPptxMb = limits.pptx?.max || (Number(limits.pptx?.std || limits.pptx?.reg || 500) + Number(limits.pptx?.ext || 50)) || 550;

        // Specialized Sub-Editor Content
        let typeSpecificHtml = '';

        function getMaterialFileIconDetails(fileName, fallbackType = 'docx') {
            const ext = (fileName ? fileName.split('.').pop() : fallbackType || 'docx').toLowerCase();
            if (ext === 'pdf') {
                return {
                    icon: 'fa-file-pdf',
                    iconColor: 'text-red-500',
                    iconBox: 'bg-red-50 border-red-100 text-red-500',
                    hoverColor: 'group-hover:text-[#FFD000]',
                    badgeText: 'PDF',
                    badgeClass: 'bg-red-50 text-red-700 border-red-200/70'
                };
            } else if (ext === 'pptx' || ext === 'ppt') {
                return {
                    icon: 'fa-file-powerpoint',
                    iconColor: 'text-orange-500',
                    iconBox: 'bg-orange-50 border-orange-100 text-orange-500',
                    hoverColor: 'group-hover:text-[#FFD000]',
                    badgeText: 'PPTX',
                    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200/70'
                };
            } else if (ext === 'docx' || ext === 'doc') {
                return {
                    icon: 'fa-file-word',
                    iconColor: 'text-blue-600',
                    iconBox: 'bg-blue-50 border-blue-100 text-blue-600',
                    hoverColor: 'group-hover:text-[#FFD000]',
                    badgeText: 'DOCX',
                    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200/70'
                };
            } else if (ext === 'txt') {
                return {
                    icon: 'fa-file-lines',
                    iconColor: 'text-slate-700',
                    iconBox: 'bg-slate-100 border-slate-200 text-slate-700',
                    hoverColor: 'group-hover:text-[#FFD000]',
                    badgeText: 'TXT',
                    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300'
                };
            }
            return {
                icon: 'fa-file-lines',
                iconColor: 'text-blue-600',
                iconBox: 'bg-blue-50 border-blue-100 text-blue-600',
                hoverColor: 'group-hover:text-[#FFD000]',
                badgeText: ext.toUpperCase(),
                badgeClass: 'bg-blue-50 text-blue-700 border-blue-200/70'
            };
        }

        if (activeType === 'Video') {
            typeSpecificHtml = `
                <div class="space-y-3.5 sm:space-y-4 pt-1 sm:pt-2">
                    <!-- Video Source Switcher Toggle -->
                    <div class="space-y-1.5 sm:space-y-2">
                        <label for="mat-tab-video-embedded" class="text-xs sm:text-sm font-bold text-black capitalize tracking-normal ml-0.5">Video Source <span class="text-red-500">*</span></label>
                        <div class="flex gap-1 bg-slate-100 rounded-lg sm:rounded-xl p-1 w-fit font-['Inter']">
                            <button type="button" onclick="window.switchMaterialSourceTab('embed')" id="mat-tab-video-embedded"
                                class="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-md sm:rounded-lg text-xs font-semibold sm:font-bold transition-all font-['Inter'] cursor-pointer ${state.sourceType === 'embed' ? 'bg-white shadow-xs' : ''}"
                                style="${state.sourceType === 'embed' ? 'color:#000' : 'color:rgba(0,0,0,0.50)'}"
                                onmouseenter="${state.sourceType !== 'embed' ? `this.style.backgroundColor='rgba(0,0,0,0.06)'` : ''}"
                                onmouseleave="${state.sourceType !== 'embed' ? `this.style.backgroundColor=''` : ''}">
                                Embedded (YouTube)
                            </button>
                            <button type="button" onclick="window.switchMaterialSourceTab('file')" id="mat-tab-video-mp4"
                                class="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-md sm:rounded-lg text-xs font-semibold sm:font-bold transition-all font-['Inter'] cursor-pointer ${state.sourceType === 'file' ? 'bg-white shadow-xs' : ''}"
                                style="${state.sourceType === 'file' ? 'color:#000' : 'color:rgba(0,0,0,0.50)'}"
                                onmouseenter="${state.sourceType !== 'file' ? `this.style.backgroundColor='rgba(0,0,0,0.06)'` : ''}"
                                onmouseleave="${state.sourceType !== 'file' ? `this.style.backgroundColor=''` : ''}">
                                Upload MP4 Video
                            </button>
                        </div>
                    </div>

                    ${state.sourceType === 'embed' ? `
                        <!-- Video URL Input -->
                        <div id="material-video-source-input-container">
                            <input type="text" id="mat-video-url-input"
                                oninput="window.handleMaterialVideoUrlChange(this.value)"
                                value="${_escape(state.videoUrl || '')}"
                                placeholder="Paste YouTube URL (e.g. https://www.youtube.com/watch?v=... or https://youtu.be/...)"
                                class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 sm:px-5 sm:py-3.5 text-xs sm:text-sm font-medium text-black outline-none focus:outline-none focus:ring-0 placeholder:text-black/40 font-['Inter'] shadow-none">
                        </div>

                        <!-- Live Video Player / Preview -->
                        <div id="mat-video-preview-container" class="mt-3">
                            ${window.getMaterialVideoPreviewHtml(state.videoUrl)}
                        </div>
                    ` : `
                        <!-- MP4 File Dropzone & Video Preview -->
                        <div class="space-y-3 pt-1">
                            <input type="file" id="mat-video-file-input" accept=".mp4,video/mp4" class="hidden" onchange="window.handleMaterialFileSelect(this, 'main')" />
                            ${(state.fileName || state.videoUrl) ? `
                                <div id="mat-video-preview-container">
                                    ${window.getMaterialVideoPreviewHtml(state.videoUrl)}
                                </div>
                            ` : `
                                <div onclick="document.getElementById('mat-video-file-input').click()"
                                    class="sigma-dashed-dropzone rounded-2xl p-5 sm:p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all group">
                                    <div class="sigma-dropzone-icon-box w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-lg sm:text-xl mb-2 shadow-2xs text-black-fade">
                                        <i class="fa-solid fa-cloud-arrow-up"></i>
                                    </div>
                                    <p class="text-xs sm:text-sm font-bold text-black">Upload MP4 Video</p>
                                    <p class="text-[11px] sm:text-xs text-black-fade mt-0.5">Drag & drop your .mp4 video file here or click to browse</p>
                                </div>
                            `}
                        </div>
                    `}
                </div>
            `;
        } else if (activeType === 'Lesson') {
            const fileMeta = getMaterialFileIconDetails(state.fileName, state.fileType);
            const rawExt = (state.fileName ? state.fileName.split('.').pop() : (state.fileType || 'docx')).toLowerCase();

            typeSpecificHtml = `
                <div class="space-y-1.5 sm:space-y-2 pt-1 sm:pt-2">
                    <label for="mat-lesson-file-input" class="text-xs sm:text-sm font-bold text-black capitalize tracking-normal ml-0.5">Upload Document <span class="text-[11px] sm:text-xs font-normal text-slate-400 normal-case">(Optional)</span></label>
                    <!-- Handout Dropzone -->
                    <input type="file" id="mat-lesson-file-input" accept=".docx,.pdf,.pptx,.doc,.ppt,.txt" class="hidden" onchange="window.handleMaterialFileSelect(this, 'main')" />
                    ${state.fileName ? `
                        <div class="sigma-attached-file-panel sigma-black-fade-panel group relative rounded-xl p-2.5 sm:p-3.5 flex items-center justify-between font-['Inter'] hover:border-slate-300 transition-all shadow-2xs">
                            <div class="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                                <div class="w-12 sm:w-16 flex flex-col items-center gap-1 shrink-0 select-none">
                                    <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl ${fileMeta.iconBox} border flex items-center justify-center shrink-0">
                                        <i class="fa-solid ${fileMeta.icon} text-sm sm:text-base ${fileMeta.iconColor}"></i>
                                    </div>
                                    <span class="text-[8px] sm:text-[9px] px-1.5 py-0.5 whitespace-nowrap ${fileMeta.badgeClass || 'bg-blue-50 text-blue-700 border-blue-200/70'} border font-bold rounded leading-tight inline-flex items-center justify-center text-center uppercase">${fileMeta.badgeText || rawExt.toUpperCase()}</span>
                                </div>
                                <div class="min-w-0 flex-1 flex flex-col justify-center">
                                    <p onclick="window.previewMaterialEditorFile('main')" class="sigma-file-panel-title sigma-file-panel-title--clickable text-[12px] sm:text-[19px] font-bold text-black ${fileMeta.hoverColor} transition-colors truncate cursor-pointer w-fit max-w-full">${_escape(state.fileName)}</p>
                                    <p class="sigma-file-panel-meta text-[11px] sm:text-xs text-black-fade font-medium mt-0.5">${state.fileSize || (rawExt.toUpperCase() + ' Document')}</p>
                                </div>
                            </div>
                            <button type="button" onclick="event.stopPropagation(); window.removeMaterialFile('main')" class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg hover:bg-slate-100 text-black-fade hover:text-red-600 flex items-center justify-center cursor-pointer transition-colors" title="Remove File">
                                <i class="fa-solid fa-trash-can text-xs sm:text-sm"></i>
                            </button>
                        </div>
                    ` : `
                        <div onclick="document.getElementById('mat-lesson-file-input').click()"
                            class="sigma-dashed-dropzone rounded-2xl p-5 sm:p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all group">
                            <div class="sigma-dropzone-icon-box w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-lg sm:text-xl mb-2 shadow-2xs text-black-fade">
                                <i class="fa-solid fa-cloud-arrow-up"></i>
                            </div>
                            <p class="text-xs sm:text-sm font-bold text-black">Upload Lesson or Reading Material</p>
                            <p class="text-[11px] sm:text-xs text-black-fade mt-0.5">Supports DOCX, PDF, PPTX, TXT presentations & documents</p>
                        </div>
                    `}
                </div>
            `;
        } else if (activeType === 'Task' || activeType === 'Assignment' || activeType === 'Activity' || activeType === 'Performance Task') {
            const isTask = activeType === 'Task';
            const isActivity = activeType === 'Activity';
            const isPerformance = activeType === 'Performance Task';
            const fileMeta = getMaterialFileIconDetails(state.fileName, state.fileType);
            const rubricMeta = getMaterialFileIconDetails(state.rubricFileName, 'docx');

            const uploadLabel = isTask ? 'Upload Task Document / Guidelines' : (isPerformance ? 'Upload Performance Task' : (isActivity ? 'Upload Activity Worksheet' : 'Upload Assignment'));
            const dropzoneTitle = isTask ? 'Upload Task Document or Worksheet' : (isPerformance ? 'Upload Performance Task Guidelines' : (isActivity ? 'Upload Activity Worksheet' : 'Upload Assignment'));
            const dropzoneSubtitle = isTask ? 'Supports DOCX, PDF, PPTX, TXT worksheets, rubrics & guides' : (isPerformance ? 'Supports DOCX, PDF, PPTX, TXT guidelines & worksheets' : 'Supports DOCX, PDF, PPTX, TXT worksheets & guides');
            const rubricSubtitle = isTask ? 'Provide grading criteria / rubrics for this task' : (isPerformance ? 'Provide grading criteria / rubrics for this performance task' : `Provide grading criteria / rubrics for this ${activeType.toLowerCase()}`);

            typeSpecificHtml = `
                <div class="space-y-3.5 sm:space-y-4 pt-1 sm:pt-2">
                    <div class="space-y-1.5 sm:space-y-2">
                        <label for="mat-assign-file-input" class="text-xs sm:text-sm font-bold text-black capitalize tracking-normal ml-0.5">${uploadLabel} <span class="text-[11px] sm:text-xs font-normal text-slate-400 normal-case">(Optional)</span></label>
                        <!-- Worksheet / Task Dropzone -->
                        <input type="file" id="mat-assign-file-input" accept=".docx,.pdf,.pptx,.doc,.ppt,.txt" class="hidden" onchange="window.handleMaterialFileSelect(this, 'main')" />
                        ${state.fileName ? `
                            <div class="sigma-attached-file-panel sigma-black-fade-panel group relative rounded-xl p-2.5 sm:p-3.5 flex items-center justify-between font-['Inter'] hover:border-slate-300 transition-all shadow-2xs">
                                <div class="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                                    <div class="w-12 sm:w-16 flex flex-col items-center gap-1 shrink-0 select-none">
                                        <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl ${fileMeta.iconBox} border flex items-center justify-center shrink-0">
                                            <i class="fa-solid ${fileMeta.icon} text-sm sm:text-base ${fileMeta.iconColor}"></i>
                                        </div>
                                        <span class="text-[8px] sm:text-[9px] px-1.5 py-0.5 whitespace-nowrap ${fileMeta.badgeClass || 'bg-blue-50 text-blue-700 border-blue-200/70'} border font-bold rounded leading-tight inline-flex items-center justify-center text-center uppercase">${fileMeta.badgeText || 'DOCX'}</span>
                                    </div>
                                    <div class="min-w-0 flex-1 flex flex-col justify-center">
                                        <p onclick="window.previewMaterialEditorFile('main')" class="sigma-file-panel-title sigma-file-panel-title--clickable text-[12px] sm:text-[19px] font-bold text-black ${fileMeta.hoverColor} transition-colors truncate cursor-pointer w-fit max-w-full">${_escape(state.fileName)}</p>
                                        <p class="sigma-file-panel-meta text-[11px] sm:text-xs text-black-fade font-medium mt-0.5">${state.fileSize || 'Attached File'}</p>
                                    </div>
                                </div>
                                <button type="button" onclick="event.stopPropagation(); window.removeMaterialFile('main')" class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg hover:bg-slate-100 text-black-fade hover:text-red-600 flex items-center justify-center cursor-pointer transition-colors" title="Remove File">
                                    <i class="fa-solid fa-trash-can text-xs sm:text-sm"></i>
                                </button>
                            </div>
                        ` : `
                            <div onclick="document.getElementById('mat-assign-file-input').click()"
                                class="sigma-dashed-dropzone rounded-2xl p-5 sm:p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all group">
                                <div class="sigma-dropzone-icon-box w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-lg sm:text-xl mb-2 shadow-2xs text-black-fade">
                                    <i class="fa-solid fa-cloud-arrow-up"></i>
                                </div>
                                <p class="text-xs sm:text-sm font-bold text-black">${dropzoneTitle}</p>
                                <p class="text-[11px] sm:text-xs text-black-fade mt-0.5">${dropzoneSubtitle}</p>
                            </div>
                        `}
                    </div>

                    <!-- Rubric Attachment Toggle -->
                    <div class="pt-2 border-t border-slate-100">
                        <div class="flex items-center justify-between p-3 sm:p-3.5 bg-slate-50/80 rounded-xl border border-slate-200">
                            <div>
                                <h5 class="text-xs sm:text-sm font-bold text-black">Attach Scoring Rubric</h5>
                                <p class="text-[11px] sm:text-xs text-black-fade mt-0.5">${rubricSubtitle}</p>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" ${state.hasRubric ? 'checked' : ''} onchange="window.toggleMaterialRubric(this.checked)" class="sr-only peer">
                                <div class="w-10 h-5.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-[#15803d]"></div>
                            </label>
                        </div>

                        ${state.hasRubric ? `
                            <div class="mt-2.5">
                                <input type="file" id="mat-rubric-file-input" accept=".docx,.pdf,.doc,.txt" class="hidden" onchange="window.handleMaterialFileSelect(this, 'rubric')" />
                                ${state.rubricFileName ? `
                                    <div class="sigma-attached-file-panel sigma-black-fade-panel group relative rounded-xl p-2.5 sm:p-3.5 flex items-center justify-between font-['Inter'] hover:border-slate-300 transition-all shadow-2xs">
                                        <div class="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                                            <div class="w-12 sm:w-16 flex flex-col items-center gap-1 shrink-0 select-none">
                                                <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-emerald-50 border border-emerald-100 text-[#15803d] flex items-center justify-center shrink-0">
                                                    <i class="fa-solid fa-file-circle-check text-sm sm:text-base text-[#15803d]"></i>
                                                </div>
                                                <span class="text-[8px] sm:text-[9px] px-1.5 py-0.5 whitespace-nowrap bg-emerald-50 text-[#15803d] border border-emerald-200/70 font-bold rounded leading-tight inline-flex items-center justify-center text-center uppercase">RUBRIC</span>
                                            </div>
                                            <div class="min-w-0 flex-1 flex flex-col justify-center">
                                                <p onclick="window.previewMaterialEditorFile('rubric')" class="sigma-file-panel-title sigma-file-panel-title--clickable text-[12px] sm:text-[19px] font-bold text-black hover:text-[#FFD000] transition-colors truncate cursor-pointer w-fit max-w-full">${_escape(state.rubricFileName)}</p>
                                                <p class="sigma-file-panel-meta text-[11px] sm:text-xs text-black-fade font-medium mt-0.5">${state.rubricFileSize || 'Rubric File'}</p>
                                            </div>
                                        </div>
                                        <button type="button" onclick="event.stopPropagation(); window.removeMaterialFile('rubric')" class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg hover:bg-slate-100 text-black-fade hover:text-red-600 flex items-center justify-center cursor-pointer transition-colors" title="Remove File">
                                            <i class="fa-solid fa-trash-can text-xs sm:text-sm"></i>
                                        </button>
                                    </div>
                                ` : `
                                    <div onclick="document.getElementById('mat-rubric-file-input').click()"
                                        class="sigma-dashed-dropzone rounded-xl p-3 sm:p-3.5 flex items-center justify-center gap-2.5 cursor-pointer transition-all group">
                                        <i class="fa-solid fa-paperclip text-black-fade text-xs sm:text-sm"></i>
                                        <span class="text-xs sm:text-sm font-bold text-black">Click to attach Rubric Document (PDF, DOCX, TXT)</span>
                                    </div>
                                `}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        } else if (activeType === 'Quiz') {
            const quizMode = state.quizMode || 'storage';
            const fileMeta = getMaterialFileIconDetails(state.fileName, state.fileType);
            // Quiz never uses rubrics
            state.hasRubric = false;
            state.rubricFileName = '';
            state.rubricFileSize = '';
            state.rubricFile = null;
            state.rubricUrl = '';

            typeSpecificHtml = `
                <div class="space-y-4 pt-1 sm:pt-2">
                    <!-- Quiz Storage / Creator Selection Section -->
                    <div class="space-y-1.5 sm:space-y-2">
                        <label for="mat-quiz-picker" class="text-xs sm:text-sm font-bold text-black capitalize tracking-normal ml-0.5">Create Quiz <span class="text-red-500">*</span></label>
                        ${state.selectedQuizId ? `
                            ${(() => {
                                const targetQuizId = state.selectedQuizId;
                                let quizObj = null;
                                if (targetQuizId && typeof window.getStoredQuizLibrary === 'function') {
                                    const lib = window.getStoredQuizLibrary();
                                    quizObj = lib.find(q => String(q.id) === String(targetQuizId) || (q.code && q.code === targetQuizId));
                                }
                                const quizTitle = quizObj?.title || state.selectedQuizTitle || 'Selected Quiz';
                                const quizQuestions = quizObj ? (quizObj.questionsCount || (Array.isArray(quizObj.questions) ? quizObj.questions.length : 0)) : (state.selectedQuizQuestions || state.selectedQuizQuestionsCount || 0);
                                const quizPoints = quizObj ? (quizObj.totalPoints !== undefined ? quizObj.totalPoints : (quizObj.questions ? quizObj.questions.reduce((a, q) => a + (parseInt(q.points) || 0), 0) : 0)) : (state.selectedQuizPoints || 0);

                                const quizDetails = (typeof window.getQuizStorageIconInfo === 'function')
                                    ? window.getQuizStorageIconInfo(quizObj || state)
                                    : (typeof window.getQuizAiOrManualDetails === 'function'
                                        ? window.getQuizAiOrManualDetails(quizObj || state)
                                        : { isAi: false, icon: 'fa-gear', iconCls: 'fa-solid fa-gear', iconBox: 'border-emerald-200 bg-emerald-50 text-[#15803d]', iconBoxStyle: '', iconColor: 'text-[#15803d]', iconStyle: '', badgeBg: 'bg-slate-100 text-black border border-slate-200', badgeText: 'SELECTED QUIZ', typeLabel: 'Manual Quiz' });

                                const formIconBoxStyleAttr = quizDetails.iconBoxStyle ? ` style="${quizDetails.iconBoxStyle}"` : '';
                                const formIconStyleAttr = quizDetails.iconStyle ? ` style="${quizDetails.iconStyle}"` : '';
                                const formIconCls = quizDetails.iconCls || 'fa-solid fa-gear';

                                return `
                                    <div class="sigma-black-fade-panel group relative rounded-xl p-3 sm:p-3.5 flex items-center justify-between font-['Inter'] cursor-pointer hover:border-slate-300 transition-all shadow-2xs">
                                        <div onclick="window.openQuizPreviewModal('${state.selectedQuizId}')" class="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1 cursor-pointer">
                                            <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl border ${quizDetails.iconBox} flex items-center justify-center shrink-0 shadow-2xs"${formIconBoxStyleAttr}>
                                                <i class="${formIconCls} text-sm sm:text-base ${quizDetails.iconColor}"${formIconStyleAttr}></i>
                                            </div>
                                            <div class="min-w-0 flex-1">
                                                <p class="sigma-file-panel-title text-[12px] sm:text-[19px] font-bold text-black truncate group-hover:text-[#FFD000] transition-colors">${_escape(quizTitle)}</p>
                                                <p class="sigma-file-panel-meta text-[10.5px] sm:text-xs text-black-fade font-medium mt-0.5 flex items-center gap-1.5 flex-wrap">
                                                    <span>${quizQuestions} ${quizQuestions === 1 ? 'Question' : 'Questions'}</span>
                                                    <span class="text-slate-300">•</span>
                                                    <span class="flex items-center gap-1"><i class="fa-solid fa-star text-[#FFD000] text-[9.5px]"></i> ${quizPoints} Points</span>
                                                </p>
                                            </div>
                                        </div>
                                        <div class="flex items-center gap-2 shrink-0 ml-2 sm:ml-3">
                                            <button type="button" id="mat-quiz-picker" onclick="event.stopPropagation(); window.openQuizStoragePicker()" class="sigma-btn sigma-btn-white h-7 sm:h-8 px-2.5 sm:px-3 text-xs font-semibold rounded-lg font-['Inter'] cursor-pointer">
                                                Change
                                            </button>
                                            <button type="button" onclick="event.stopPropagation(); window.editingMaterialState.selectedQuizId = null; window.renderMaterialEditorForm();" class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg hover:bg-slate-100 text-black-fade hover:text-red-600 flex items-center justify-center cursor-pointer transition-colors" title="Deselect Quiz">
                                                <i class="fa-solid fa-trash-can text-xs sm:text-sm"></i>
                                            </button>
                                        </div>
                                    </div>
                                `;
                            })()}
                        ` : `
                            <button type="button" id="mat-quiz-picker" onclick="window.openQuizStoragePicker()"
                                class="sigma-dashed-dropzone rounded-2xl p-5 sm:p-6 flex flex-col items-center justify-center text-center font-['Inter'] group cursor-pointer transition-all w-full">
                                <div class="sigma-dropzone-icon-box w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-lg sm:text-xl mb-2 shadow-2xs text-black-fade">
                                    <i class="fa-solid fa-folder-open"></i>
                                </div>
                                <p class="text-xs sm:text-sm font-bold text-black">Attach from Quiz Storage</p>
                                <p class="text-[11px] sm:text-xs text-black-fade mt-0.5">Choose from existing quizzes in your Quiz Storage library or create a new quiz</p>
                            </button>
                        `}
                    </div>
                </div>
            `;
        }

        const isEditState = state.index !== -1;

        const typeLabelMap = {
            'Task': 'Task Title',
            'Assignment': 'Assignment Title',
            'Activity': 'Activity Title',
            'Performance Task': 'Performance Task Title',
            'Quiz': 'Quiz Title',
            'Video': 'Video Title',
            'Lesson': 'Material Title'
        };
        const titleLabelText = typeLabelMap[activeType] || (activeType ? `${activeType} Title` : 'Material Title');

        const titlePlaceholderMap = {
            'Task': 'e.g. Task 1 - Flowchart and Algorithm Design',
            'Assignment': 'e.g. Assignment 1 - Variables and Data Types Exercise',
            'Activity': 'e.g. Activity 1 - Hands-on Programming Exercise',
            'Performance Task': 'e.g. Performance Task 1 - Interactive Application Project',
            'Quiz': 'e.g. Quiz 1 - Introduction to Programming Logic',
            'Video': 'e.g. Lecture 1 - Understanding Flowcharts & Pseudocode',
            'Lesson': 'e.g. Chapter 1 Lesson or Handout'
        };
        const titlePlaceholderText = titlePlaceholderMap[activeType] || (activeType ? `e.g. Chapter 1 ${activeType}` : 'e.g. Chapter 1 Lesson or Video');

        const descPlaceholderMap = {
            'Task': 'Provide task instructions, guidelines, requirements, or notes...',
            'Assignment': 'Provide assignment instructions, submission guidelines, or notes...',
            'Activity': 'Provide activity instructions, steps, or notes...',
            'Performance Task': 'Provide performance task guidelines, criteria, or notes...',
            'Quiz': 'Provide quiz instructions, coverage, or notes...',
            'Video': 'Provide video summary, key timestamps, or notes...',
            'Lesson': 'Provide instructions, learning objectives, or notes...'
        };
        const descPlaceholderText = descPlaceholderMap[activeType] || (activeType ? `Provide ${activeType.toLowerCase()} instructions, details, or notes...` : 'Provide instructions, learning objectives, or notes...');

        // Ensure main modal header is configured for this material form using shared header helper
        if (typeof window.syncSubjectModalHeader === 'function') {
            window.syncSubjectModalHeader({
                title: (isEdit ? 'Edit ' : 'Add ') + activeType,
                showBack: true,
                showActions: false,
                showStatus: false,
                showExit: false
            });
        }

        // Render the full clean material form
        editorView.innerHTML = `
            <div class="space-y-4 sm:space-y-6 font-['Inter'] animate-in fade-in duration-150">
                <div class="space-y-3.5 sm:space-y-4">
                    <!-- Topic Selector -->
                    <div class="space-y-1.5 sm:space-y-2">
                        <label for="mat-topic-id" class="text-xs sm:text-sm font-bold text-black capitalize tracking-normal ml-0.5">Select Topic <span class="text-red-500">*</span></label>
                        <div class="relative">
                            <select id="mat-topic-id"
                                onchange="if (window.editingMaterialState) window.editingMaterialState.topicId = this.value; this.classList.toggle('text-black/40', !this.value); this.classList.toggle('text-black', !!this.value); window.checkMaterialValidity?.();"
                                class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 sm:px-5 sm:py-3.5 text-xs sm:text-sm font-medium ${!selectedTopicId ? 'text-black/40' : 'text-black'} outline-none focus:outline-none focus:ring-0 appearance-none cursor-pointer font-['Inter'] shadow-none">
                                ${topicsOptions}
                            </select>
                            <i class="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-xs text-black pointer-events-none"></i>
                        </div>
                    </div>

                    <!-- Material / Task Title -->
                    <div class="space-y-1.5 sm:space-y-2">
                        <div class="flex items-center justify-between ml-0.5">
                            <label for="mat-editor-title" class="text-xs sm:text-sm font-bold text-black capitalize tracking-normal">${titleLabelText} <span class="text-red-500">*</span></label>
                            <span id="mat-editor-title-counter" class="text-[11px] font-bold text-slate-400 uppercase tracking-widest">${(state.title || '').length} / 100</span>
                        </div>
                        <input type="text" id="mat-editor-title" placeholder="${titlePlaceholderText}"
                            maxlength="100"
                            value="${_escape(state.title || '')}"
                            oninput="const cnt = document.getElementById('mat-editor-title-counter'); if (cnt) cnt.textContent = this.value.length + ' / 100'; if (window.editingMaterialState) window.editingMaterialState.title = this.value; window.checkMaterialValidity?.();"
                            class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 sm:px-5 sm:py-3.5 text-xs sm:text-sm font-medium text-black outline-none focus:outline-none focus:ring-0 placeholder:text-black/40 font-['Inter'] shadow-none" />
                    </div>

                    <!-- Instructions / Description -->
                    <div class="space-y-1.5 sm:space-y-2">
                        <div class="flex items-center justify-between ml-0.5">
                            <label for="mat-editor-desc" class="text-xs sm:text-sm font-bold text-black capitalize tracking-normal">Instructions / Details <span class="text-[11px] sm:text-xs font-normal text-slate-400 normal-case">(Optional)</span></label>
                            <span id="mat-editor-desc-counter" class="text-[11px] font-bold text-slate-400 uppercase tracking-widest">${(state.description || '').length} / 8000</span>
                        </div>
                        <textarea id="mat-editor-desc" rows="4" placeholder="${descPlaceholderText}"
                            maxlength="8000"
                            oninput="const cnt = document.getElementById('mat-editor-desc-counter'); if (cnt) cnt.textContent = this.value.length + ' / 8000'; if (window.editingMaterialState) window.editingMaterialState.description = this.value; window.checkMaterialValidity?.();"
                            class="sigma-textarea w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 sm:px-5 sm:py-3.5 text-xs sm:text-sm font-medium text-black outline-none focus:outline-none focus:ring-0 placeholder:text-black/40 font-['Inter'] shadow-none resize-none max-h-36 sm:max-h-48 overflow-y-auto break-words">${_escape(state.description || '')}</textarea>
                    </div>

                    <!-- Type Specific Sub-Editor Section -->
                    <div class="pt-2 border-t border-slate-100">
                        ${typeSpecificHtml}
                    </div>

                </div>
            </div>
        `;

        // Hide wizard footer & sub-editor buttons
        const _renderModalFooter = document.getElementById('subject-modal-footer');
        if (_renderModalFooter) {
            _renderModalFooter.classList.add('hidden');
            _renderModalFooter.style.setProperty('display', 'none', 'important');
        }
        document.getElementById('subject-draft-btn')?.classList.add('hidden');
        document.getElementById('subject-next-btn')?.classList.add('hidden');
        document.getElementById('subject-save-btn')?.classList.add('hidden');
        document.getElementById('subject-step2-prev-btn')?.classList.add('hidden');
        document.getElementById('subject-step3-bottom-actions')?.classList.add('hidden');

        // Hide topic sub-editor buttons
        document.getElementById('topic-editor-add-another-btn')?.classList.add('hidden');
        document.getElementById('topic-editor-delete-btn')?.classList.add('hidden');
        document.getElementById('topic-editor-save-btn')?.classList.add('hidden');
        document.getElementById('mat-detail-edit-btn')?.classList.add('hidden');

        // Configure material editor buttons in the footer
        window.setSubjectFooterBackButton('mat-editor-back-btn');
        const globalFooter = document.getElementById('subject-global-footer');
        if (globalFooter) {
            globalFooter.classList.remove('hidden');
            globalFooter.style.removeProperty('display');
            globalFooter.style.display = 'flex';
        }

        const matSaveBtn = document.getElementById('mat-editor-save-btn');
        const matSaveBtnText = document.getElementById('mat-editor-save-btn-text');
        if (matSaveBtnText) {
            matSaveBtnText.textContent = isEditState ? 'Save Changes' : (activeType ? `Save ${activeType}` : 'Add Material');
        }
        if (matSaveBtn) {
            matSaveBtn.classList.remove('hidden');
            matSaveBtn.style.removeProperty('display');
            matSaveBtn.style.display = 'inline-flex';
        }

        const matAddAnotherBtn = document.getElementById('mat-editor-add-another-btn');
        const matAddAnotherBtnText = document.getElementById('mat-editor-add-another-btn-text');
        if (matAddAnotherBtn) {
            if (!isEditState) {
                if (matAddAnotherBtnText) {
                    matAddAnotherBtnText.textContent = `Save & Add ${activeType || 'Lesson'}`;
                }
                matAddAnotherBtn.classList.remove('hidden');
                matAddAnotherBtn.style.removeProperty('display');
                matAddAnotherBtn.style.display = 'inline-flex';
            } else {
                matAddAnotherBtn.classList.add('hidden');
                matAddAnotherBtn.style.setProperty('display', 'none', 'important');
            }
        }

        const matDeleteBtn = document.getElementById('mat-editor-delete-btn');
        if (matDeleteBtn) {
            if (isEditState) {
                matDeleteBtn.classList.remove('hidden');
                matDeleteBtn.style.removeProperty('display');
                matDeleteBtn.style.display = 'inline-flex';
            } else {
                matDeleteBtn.classList.add('hidden');
                matDeleteBtn.style.setProperty('display', 'none', 'important');
            }
        }

        window.checkMaterialValidity?.();
    };

    window.checkMaterialValidity = function () {
        const titleInput = document.getElementById('mat-editor-title');
        const descInput = document.getElementById('mat-editor-desc');
        const topicSelect = document.getElementById('mat-topic-id');
        const saveBtn = document.getElementById('mat-editor-save-btn');
        const addAnotherBtn = document.getElementById('mat-editor-add-another-btn');
        const title = (titleInput?.value || window.editingMaterialState?.title || '').trim();
        const desc = (descInput?.value || window.editingMaterialState?.description || '').trim();
        const topicId = (topicSelect ? topicSelect.value : window.editingMaterialState?.topicId) || '';
        let isValid = Boolean(title && topicId);

        const state = window.editingMaterialState;
        if (state && state.type === 'Video') {
            if (state.sourceType === 'embed') {
                const urlInput = document.getElementById('mat-video-url-input');
                const val = (urlInput ? urlInput.value : state.videoUrl) || '';
                const ytId = _getYouTubeId(val.trim());
                if (!ytId) {
                    isValid = false;
                }
            } else if (state.sourceType === 'file') {
                if (!state.fileName && !state.videoUrl) {
                    isValid = false;
                }
            }
        }

        const isEdit = (typeof window.currentEditingMaterialIndex === 'number' && window.currentEditingMaterialIndex >= 0);
        let hasChanges = true;
        if (isEdit && window.editingMaterialOriginalState) {
            try {
                const orig = JSON.parse(window.editingMaterialOriginalState);
                const urlInput = document.getElementById('mat-video-url-input');
                const curVideoUrl = (urlInput ? urlInput.value : (state?.videoUrl || '')).trim();
                const curTitle = title;
                const curDesc = desc;
                const curTopicId = String(topicId || '');
                const curType = state?.type || 'Lesson';
                const curSourceType = state?.sourceType || 'embed';
                const curFileName = state?.fileName || '';
                const curFileType = state?.fileType || '';
                const curHasRubric = Boolean(state?.hasRubric);
                const curRubricFileName = state?.rubricFileName || '';
                const curQuizId = state?.selectedQuizId || null;

                if (curTitle === orig.title &&
                    curDesc === orig.description &&
                    curTopicId === orig.topicId &&
                    curType === orig.type &&
                    curSourceType === orig.sourceType &&
                    curVideoUrl === (orig.videoUrl || '') &&
                    curFileName === (orig.fileName || '') &&
                    curFileType === (orig.fileType || '') &&
                    curHasRubric === orig.hasRubric &&
                    curRubricFileName === (orig.rubricFileName || '') &&
                    String(curQuizId || '') === String(orig.selectedQuizId || '')) {
                    hasChanges = false;
                }
            } catch (e) {
                hasChanges = true;
            }
        }

        const canSave = isValid && (!isEdit || hasChanges);

        if (saveBtn) {
            saveBtn.disabled = !canSave;
            saveBtn.style.opacity = canSave ? '1' : '0.5';
            saveBtn.style.cursor = canSave ? 'pointer' : 'not-allowed';
            saveBtn.classList.toggle('opacity-50', !canSave);
            saveBtn.classList.toggle('cursor-not-allowed', !canSave);
            if (isEdit && !hasChanges) {
                saveBtn.setAttribute('title', 'No changes made yet');
            } else {
                saveBtn.removeAttribute('title');
            }
        }
        if (addAnotherBtn) {
            addAnotherBtn.disabled = !isValid;
            addAnotherBtn.style.opacity = isValid ? '1' : '0.5';
            addAnotherBtn.style.cursor = isValid ? 'pointer' : 'not-allowed';
            addAnotherBtn.classList.toggle('opacity-50', !isValid);
            addAnotherBtn.classList.toggle('cursor-not-allowed', !isValid);
        }
    };

    window.performSaveMaterial = async function () {
        const titleInput = document.getElementById('mat-editor-title');
        const descInput = document.getElementById('mat-editor-desc');
        const topicSelect = document.getElementById('mat-topic-id');

        const title = (titleInput?.value || window.editingMaterialState.title || '').trim();
        const desc = (descInput?.value || window.editingMaterialState.description || '').trim();
        const topicId = (topicSelect?.value || window.editingMaterialState.topicId || '').trim();
        const type = window.editingMaterialState.type || 'Lesson';

        if (!topicId) {
            alert('Please select a topic.');
            topicSelect?.focus();
            return;
        }

        if (!title) {
            alert('Please enter a material title.');
            titleInput?.focus();
            return;
        }

        const state = window.editingMaterialState;

        if (type === 'Video') {
            if (state.sourceType === 'embed') {
                const urlInput = document.getElementById('mat-video-url-input');
                const val = (urlInput ? urlInput.value : state.videoUrl) || '';
                const ytId = _getYouTubeId(val.trim());
                if (!ytId) {
                    alert('Please enter a valid YouTube video link.');
                    urlInput?.focus();
                    return;
                }
                state.videoUrl = val.trim();
            } else if (state.sourceType === 'file') {
                if (!state.fileName && !state.videoUrl) {
                    alert('Please upload an MP4 video file.');
                    return;
                }
            }
        }

        const isTeacher = isCurrentEditorTeacher();
        const currentUser = getCurrentEditorUser();
        const currentUserId = currentUser ? String(currentUser.id || currentUser.uid || currentUser.username || '') : '';
        const currentUserName = currentUser ? (`${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.name || '') : '';
        const rawRole = currentUser ? (currentUser.role || currentUser.type || (isTeacher ? 'Teacher' : 'Admin')) : (isTeacher ? 'Teacher' : 'Admin');
        let authorRole = isTeacher ? 'Teacher' : normalizeSubjectAuthorRole(rawRole);
        let authorName = authorRole === 'Admin' ? getSubjectAdminAuthorName() : (currentUserName || 'Maria Santos Ramos');
        let authorId = authorRole === 'Admin' ? '0000000' : (currentUserId || 'teacher');

        // Admin editing in teacher view scope:
        if (!isTeacher && window.activeCurriculumScope && window.activeCurriculumScope !== 'master' && window.activeCurriculumScope !== 'all') {
            authorRole = 'Teacher';
            authorId = window.activeCurriculumScope;
            if (window.activeCurriculumScopeLabel) {
                authorName = window.activeCurriculumScopeLabel.replace(/\s*\(.*?\)\s*/g, '').trim();
            }
        }

        const existingMat = findMaterialById(state.id) || resolveMaterialForEdit(state.index, state.id);

        // --- Wait for FileReader data URL conversions to finish ---
        // If the user clicked Save immediately after selecting a file, the async FileReader
        // may not have finished converting the blob:// URL to a persistent data URL yet.
        // A blob URL dies on page reload, so we must ensure we save the data URL instead.
        if (type !== 'Video') {
            const needsWait = (url) => typeof url === 'string' && url.startsWith('blob:');
            const maxWaitMs = 3000;
            const stepMs = 50;
            let waited = 0;
            while (waited < maxWaitMs && (
                needsWait(state.fileUrl) ||
                needsWait(state.rubricUrl) ||
                needsWait(state.perfGuidelinesUrl) ||
                needsWait(state.perfRubricUrl)
            )) {
                await new Promise(r => setTimeout(r, stepMs));
                waited += stepMs;
            }
            // Fallback: if still blob: after waiting (large file / quick save), persist via
            // the original File object in memory so IndexedDB has the binary data.
            const _fMap = window._sigmaUploadedFiles;
            const _isHeavyUrl = (url) => typeof url === 'string' && (url.startsWith('blob:') || url.startsWith('data:'));
            const _ensureStored = async (url, fileName, fileObj, itemTitle, itemType) => {
                if (!fileName || typeof window.sigmaStoreDocument !== 'function') return;
                const fromMap = _fMap && (_fMap.get(url) || _fMap.get(fileName) || _fMap.get(fileName.toLowerCase()));
                const source = fileObj || fromMap || (_isHeavyUrl(url) ? url : null);
                if (!source) return;
                await window.sigmaStoreDocument(fileName, source, {
                    name: fileName,
                    title: itemTitle || title,
                    type: itemType || type,
                    url: 'image/' + fileName
                });
            };
            await _ensureStored(state.fileUrl, state.fileName, state.file, title, type);
            await _ensureStored(state.rubricUrl, state.rubricFileName, state.rubricFile, (state.rubricFileName || 'Rubric'), 'docx');
            await _ensureStored(state.perfGuidelinesUrl, state.perfGuidelinesFileName, state.perfGuidelinesFile, (state.perfGuidelinesFileName || 'Guidelines'), 'docx');
            await _ensureStored(state.perfRubricUrl, state.perfRubricFileName, state.perfRubricFile, (state.perfRubricFileName || 'Rubric'), 'docx');
            // Keep the file bytes in IndexedDB. localStorage only stores the file name.
            if (_isHeavyUrl(state.fileUrl) && state.fileName) { state.fileUrl = `image/${state.fileName}`; state.url = state.fileUrl; }
            if (_isHeavyUrl(state.rubricUrl) && state.rubricFileName) { state.rubricUrl = `image/${state.rubricFileName}`; }
            if (_isHeavyUrl(state.perfGuidelinesUrl) && state.perfGuidelinesFileName) { state.perfGuidelinesUrl = `image/${state.perfGuidelinesFileName}`; }
            if (_isHeavyUrl(state.perfRubricUrl) && state.perfRubricFileName) { state.perfRubricUrl = `image/${state.perfRubricFileName}`; }
        }

        const activeQuarters = getActiveSubjectQuarters();
        const allCurTopics = (window.currentSubjectAllTopics && window.currentSubjectAllTopics.length > 0)
            ? window.currentSubjectAllTopics
            : (window.currentSubjectTopics || []);
        const parentTopic = allCurTopics.find(t => String(t.id) === String(topicId));
        const matQuarter = normalizeQuarterKey(parentTopic?.quarter || window.currentSubjectMaterialQuarter || activeQuarters[0] || 'q1');

        const isSavingQuiz = type === 'Quiz' || String(type).toLowerCase().includes('quiz');

        let finalOriginalAdminId = existingMat?.originalAdminId || null;
        let finalId = existingMat?.id || null;

        const activeSection = window.activeSubjectEditorSection
            || (typeof window.subjectEditorOptions !== 'undefined' && (window.subjectEditorOptions?.section || window.subjectEditorOptions?.selectedSection))
            || (window.currentAdminClassroomSection ? (window.currentAdminClassroomSection.name || window.currentAdminClassroomSection.section) : '')
            || (typeof window.currentClassroomSectionName !== 'undefined' && window.currentClassroomSectionName)
            || (typeof currentClassroomSectionName !== 'undefined' && currentClassroomSectionName)
            || (typeof currentTopicState !== 'undefined' ? currentTopicState?.selectedSection : '')
            || (typeof window.currentTopicState !== 'undefined' ? window.currentTopicState?.selectedSection : '')
            || ((authorRole === 'Teacher' || isTeacher) ? (typeof resolveTeacherActiveSection === 'function' ? resolveTeacherActiveSection() : localStorage.getItem('sigma-active-classroom-section')) : '')
            || '';

        if (isTeacher) {
            authorRole = 'Teacher';
            authorId = currentUserId || '';
            authorName = currentUserName || 'Teacher';
            if (existingMat && (existingMat.isAdmin || normalizeSubjectAuthorRole(existingMat.authorRole || existingMat.role) === 'Admin')) {
                finalOriginalAdminId = existingMat.id;
                finalId = existingMat.originalAdminId ? existingMat.id : `mat-teacher-${authorId || 'custom'}-${Date.now()}`;
            } else if (!finalId) {
                finalId = `mat-teacher-${authorId || 'custom'}-${Date.now()}`;
            }
        } else {
            if (!finalId) {
                finalId = `mat-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
            }
        }

        const finalHasRubric = isSavingQuiz ? false : Boolean(state.hasRubric && state.rubricFileName);
        const finalRubricFileName = finalHasRubric ? (state.rubricFileName || '') : '';
        const finalRubricUrl = finalHasRubric ? (state.rubricUrl || '') : '';

        const finalItem = {
            id: finalId,
            originalAdminId: finalOriginalAdminId,
            title,
            description: desc,
            topicId,
            quarter: matQuarter,
            type,
            sourceType: type === 'Video' ? (state.sourceType === 'file' ? 'mp4' : (state.sourceType || 'embed')) : (state.sourceType || 'embed'),
            url: state.fileUrl || state.videoUrl || state.url || (state.fileName ? `image/${state.fileName}` : '') || (type === 'Video' ? 'image/campus-clip.mp4' : ''),
            fileUrl: state.fileUrl || state.url || '',
            videoUrl: state.videoUrl || state.fileUrl || state.url || (type === 'Video' ? 'image/campus-clip.mp4' : ''),
            fileType: type === 'Video' ? (state.sourceType === 'embed' ? 'youtube' : 'mp4') : (state.fileType || 'docx'),
            fileName: state.fileName || '',
            fileSize: state.fileSize || '',
            hasRubric: finalHasRubric,
            rubricFileName: finalRubricFileName,
            rubricFileSize: finalHasRubric ? (state.rubricFileSize || 'Rubric File') : '',
            rubricUrl: finalRubricUrl,
            rubric: finalRubricFileName,
            quizMode: state.quizMode || 'storage',
            quizId: state.selectedQuizId || null,
            selectedQuizId: state.selectedQuizId || null,
            quizTitle: state.selectedQuizTitle || '',
            selectedQuizTitle: state.selectedQuizTitle || '',
            quizQuestionsCount: state.selectedQuizQuestions || 0,
            selectedQuizQuestions: state.selectedQuizQuestions || 0,
            quizPoints: state.selectedQuizPoints || 0,
            selectedQuizPoints: state.selectedQuizPoints || 0,
            quizIcon: state.selectedQuizIcon || '',
            selectedQuizIcon: state.selectedQuizIcon || '',
            icon: state.selectedQuizIcon || '',
            quizColor: state.selectedQuizColor || '',
            selectedQuizColor: state.selectedQuizColor || '',
            color: state.selectedQuizColor || '',
            isAi: !!state.selectedQuizIsAi,
            selectedQuizIsAi: !!state.selectedQuizIsAi,
            perfGuidelinesFileName: state.perfGuidelinesFileName || '',
            perfGuidelinesUrl: state.perfGuidelinesUrl || '',
            perfRubricFileName: isSavingQuiz ? '' : (state.perfRubricFileName || ''),
            perfRubricUrl: isSavingQuiz ? '' : (state.perfRubricUrl || ''),
            duration: state.duration || existingMat?.duration || '',
            authorId: authorId,
            authorName: authorName,
            authorRole: authorRole,
            section: activeSection,
            isTeacher: isTeacher || authorRole === 'Teacher',
            isAdmin: !isTeacher && authorRole === 'Admin',
            rubricSetByAdmin: !isTeacher && authorRole === 'Admin' && finalHasRubric,
            timestamp: existingMat?.timestamp || new Date().toISOString(),
            createdAt: existingMat?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const editorHidRubric = !isTeacher && (!window.activeCurriculumScope || window.activeCurriculumScope === 'master');
        const existingIsAdmin = existingMat && normalizeSubjectAuthorRole(existingMat.authorRole || existingMat.role || (existingMat.isAdmin ? 'Admin' : '')) === 'Admin';
        if (editorHidRubric && existingIsAdmin && !finalItem.hasRubric && (existingMat.hasRubric || existingMat.rubricFileName || existingMat.rubric)) {
            finalItem.hasRubric = true;
            finalItem.rubricFileName = existingMat.rubricFileName || (typeof existingMat.rubric === 'string' ? existingMat.rubric : (existingMat.rubric && existingMat.rubric.fileName) || '');
            finalItem.rubricUrl = existingMat.rubricUrl || '';
            finalItem.rubricFileSize = existingMat.rubricFileSize || (finalItem.rubricFileName ? 'Rubric File' : '');
            finalItem.rubric = existingMat.rubric || finalItem.rubricFileName;
            finalItem.rubricSetByAdmin = true;
        }

        if (isSavingQuiz) {
            finalItem.isQuiz = true;
            finalItem.category = 'quiz';
            finalItem.component = 'ww';
            finalItem.gradebookComponent = 'ww';
        }

        if (topicId) {
            if (!window.expandedSubjectTopicIds) window.expandedSubjectTopicIds = {};
            window.expandedSubjectTopicIds[topicId] = true;
        }

        const teacherFork = Boolean(isTeacher && existingMat && (existingMat.isAdmin || normalizeSubjectAuthorRole(existingMat.authorRole || existingMat.role) === 'Admin'));
        if (existingMat || state.id || (typeof state.index === 'number' && state.index >= 0)) {
            window._hasEditedExistingMaterial = true;
            commitSavedMaterial(existingMat, finalItem, teacherFork);
        } else {
            window._hasAddedNewMaterial = true;
            commitSavedMaterial(null, finalItem, false);
        }

        if (typeof window.deduplicateMaterialsArray === 'function') {
            if (Array.isArray(window.currentSubjectMaterials)) {
                window.currentSubjectMaterials = window.deduplicateMaterialsArray(window.currentSubjectMaterials, { collapseRoles: false });
            }
            if (Array.isArray(window.currentSubjectAllMaterials)) {
                window.currentSubjectAllMaterials = window.deduplicateMaterialsArray(window.currentSubjectAllMaterials, { collapseRoles: false });
            }
        }

        // Sync rubric strictly to active section release config in localStorage
        // NOTE: Only teacher saves should modify section release configs.
        // Admin saves must NOT delete rubric entries — they only own the material definition,
        // not the per-section rubric assignments that teachers manage independently.
        const _isTeacherSave = isCurrentEditorTeacher();
        try {
            const curSubj = window.currentSubjectData || window.editingSubjectData;
            const effSubjId = curSubj?.code || curSubj?.id || window.currentSubjectCode || window.originalEditingSubjectId || '';
            const cleanSubj = String(effSubjId).toLowerCase().replace(/^(card-|subj-)/, '');
            const activeSec = (typeof currentTopicState !== 'undefined' && currentTopicState?.selectedSection)
                ? currentTopicState.selectedSection
                : (typeof resolveTeacherActiveSection === 'function' ? resolveTeacherActiveSection() : '') ||
                  localStorage.getItem('sigma-active-classroom-section') || '';
            const keysToSync = [finalItem.id, finalItem.title, finalItem.originalAdminId].filter(Boolean);

            if (activeSec && cleanSubj) {
                const keys = [
                    `sigma_assessment_release_${cleanSubj}_${activeSec}`,
                    `sigma_assessment_release_${effSubjId}_${activeSec}`,
                    `sigma_assessment_release_card-${cleanSubj}_${activeSec}`
                ];
                keys.forEach(lk => {
                    try {
                        const raw = localStorage.getItem(lk);
                        if (!raw) return;
                        const parsed = JSON.parse(raw);
                        if (!parsed || typeof parsed !== 'object') return;
                        if (!parsed.assessmentRubrics) parsed.assessmentRubrics = {};
                        if (!parsed.assessmentRubricUrls) parsed.assessmentRubricUrls = {};

                        if (finalHasRubric && finalRubricFileName) {
                            // Both admin and teacher can set a rubric on a material
                            for (const k of keysToSync) {
                                parsed.assessmentRubrics[k] = finalRubricFileName;
                                if (finalRubricUrl) parsed.assessmentRubricUrls[k] = finalRubricUrl;
                            }
                        } else if (!state.hasRubric && _isTeacherSave) {
                            // Only teachers (not admin) should delete section-specific rubric entries.
                            // Admins saving a no-rubric material must NOT wipe teacher-assigned rubrics.
                            for (const k of keysToSync) {
                                delete parsed.assessmentRubrics[k];
                                delete parsed.assessmentRubricUrls[k];
                            }
                        }
                        localStorage.setItem(lk, JSON.stringify(parsed));
                    } catch (e) {}
                });
            }
        } catch (err) {
            console.warn('[performSaveMaterial] Error syncing rubric to release configs:', err);
        }

        if (typeof window.syncCurrentSubjectEditorToStorage === 'function') {
            window.syncCurrentSubjectEditorToStorage();
        }

        window.currentSubjectMaterialQuarter = matQuarter;
        window.cancelMaterialEditor(true);
        window.renderSubjectMaterials();
        resetSubjectEditorScrollToTop();
    };

    window.saveAndAddAnotherMaterial = async function () {
        const titleInput = document.getElementById('mat-editor-title');
        const descInput = document.getElementById('mat-editor-desc');
        const topicSelect = document.getElementById('mat-topic-id');

        const title = (titleInput?.value || window.editingMaterialState.title || '').trim();
        const desc = (descInput?.value || window.editingMaterialState.description || '').trim();
        const topicId = (topicSelect?.value || window.editingMaterialState.topicId || '').trim();
        const type = window.editingMaterialState.type || 'Lesson';

        if (!topicId) {
            alert('Please select a topic.');
            topicSelect?.focus();
            return;
        }

        if (!title) {
            alert('Please enter a material title.');
            titleInput?.focus();
            return;
        }

        const state = window.editingMaterialState;

        if (type === 'Video') {
            if (state.sourceType === 'embed') {
                const urlInput = document.getElementById('mat-video-url-input');
                const val = (urlInput ? urlInput.value : state.videoUrl) || '';
                const ytId = _getYouTubeId(val.trim());
                if (!ytId) {
                    alert('Please enter a valid YouTube video link.');
                    urlInput?.focus();
                    return;
                }
                state.videoUrl = val.trim();
            } else if (state.sourceType === 'file') {
                if (!state.fileName && !state.videoUrl) {
                    alert('Please upload an MP4 video file.');
                    return;
                }
            }
        }

        const isTeacher = isCurrentEditorTeacher();
        const currentUser = getCurrentEditorUser();
        const currentUserId = currentUser ? String(currentUser.id || currentUser.uid || currentUser.username || '') : '';
        const currentUserName = currentUser ? (`${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.name || '') : '';
        const rawRole = currentUser ? (currentUser.role || currentUser.type || (isTeacher ? 'Teacher' : 'Admin')) : (isTeacher ? 'Teacher' : 'Admin');
        let authorRole = isTeacher ? 'Teacher' : normalizeSubjectAuthorRole(rawRole);
        let authorName = currentUserName || (authorRole === 'Admin' ? 'Administrator' : 'Teacher');
        let authorId = currentUserId || (isTeacher ? 'teacher' : 'admin');

        // Admin editing in teacher view scope:
        if (!isTeacher && window.activeCurriculumScope && window.activeCurriculumScope !== 'master' && window.activeCurriculumScope !== 'all') {
            authorRole = 'Teacher';
            authorId = window.activeCurriculumScope;
            if (window.activeCurriculumScopeLabel) {
                authorName = window.activeCurriculumScopeLabel.replace(/\s*\(.*?\)\s*/g, '').trim();
            }
        }

        // --- Wait for FileReader data URL conversions to finish ---
        if (type !== 'Video') {
            const needsWait = (url) => typeof url === 'string' && url.startsWith('blob:');
            const maxWaitMs = 3000;
            const stepMs = 50;
            let waited = 0;
            while (waited < maxWaitMs && (
                needsWait(state.fileUrl) ||
                needsWait(state.rubricUrl) ||
                needsWait(state.perfGuidelinesUrl) ||
                needsWait(state.perfRubricUrl)
            )) {
                await new Promise(r => setTimeout(r, stepMs));
                waited += stepMs;
            }
            // Persist via memory or stream to IndexedDB before LocalStorage payload is saved
            const _fMap = window._sigmaUploadedFiles;
            const _isHeavyUrl = (url) => typeof url === 'string' && (url.startsWith('blob:') || url.startsWith('data:'));
            const _ensureStored = async (url, fileName, fileObj, itemTitle, itemType) => {
                if (!fileName || typeof window.sigmaStoreDocument !== 'function') return;
                const fromMap = _fMap && (_fMap.get(url) || _fMap.get(fileName) || _fMap.get(fileName.toLowerCase()));
                const source = fileObj || fromMap || (_isHeavyUrl(url) ? url : null);
                if (!source) return;
                await window.sigmaStoreDocument(fileName, source, {
                    name: fileName,
                    title: itemTitle || title,
                    type: itemType || type,
                    url: 'image/' + fileName
                });
            };
            await _ensureStored(state.fileUrl, state.fileName, state.file, title, type);
            await _ensureStored(state.rubricUrl, state.rubricFileName, state.rubricFile, (state.rubricFileName || 'Rubric'), 'docx');
            await _ensureStored(state.perfGuidelinesUrl, state.perfGuidelinesFileName, state.perfGuidelinesFile, (state.perfGuidelinesFileName || 'Guidelines'), 'docx');
            await _ensureStored(state.perfRubricUrl, state.perfRubricFileName, state.perfRubricFile, (state.perfRubricFileName || 'Rubric'), 'docx');
            if (_isHeavyUrl(state.fileUrl) && state.fileName) { state.fileUrl = `image/${state.fileName}`; state.url = state.fileUrl; }
            if (_isHeavyUrl(state.rubricUrl) && state.rubricFileName) { state.rubricUrl = `image/${state.rubricFileName}`; }
            if (_isHeavyUrl(state.perfGuidelinesUrl) && state.perfGuidelinesFileName) { state.perfGuidelinesUrl = `image/${state.perfGuidelinesFileName}`; }
            if (_isHeavyUrl(state.perfRubricUrl) && state.perfRubricFileName) { state.perfRubricUrl = `image/${state.perfRubricFileName}`; }
        }

        const activeQuartersForAnother = getActiveSubjectQuarters();
        const allCurTopicsForAnother = (window.currentSubjectAllTopics && window.currentSubjectAllTopics.length > 0)
            ? window.currentSubjectAllTopics
            : (window.currentSubjectTopics || []);
        const parentTopicForAnother = allCurTopicsForAnother.find(t => String(t.id) === String(topicId));
        const matQuarterForAnother = normalizeQuarterKey(parentTopicForAnother?.quarter || window.currentSubjectMaterialQuarter || activeQuartersForAnother[0] || 'q1');

        const isSavingQuizAnother = type === 'Quiz' || String(type).toLowerCase().includes('quiz');
        const finalHasRubricAnother = isSavingQuizAnother ? false : Boolean(state.hasRubric && state.rubricFileName);
        const finalRubricFileNameAnother = finalHasRubricAnother ? (state.rubricFileName || '') : '';
        const finalRubricUrlAnother = finalHasRubricAnother ? (state.rubricUrl || '') : '';
        const finalIdAnother = isTeacher ? `mat-teacher-${authorId}-${Date.now()}` : `mat-${Date.now()}`;

        const activeSection = window.activeSubjectEditorSection
            || (typeof window.subjectEditorOptions !== 'undefined' && (window.subjectEditorOptions?.section || window.subjectEditorOptions?.selectedSection))
            || (window.currentAdminClassroomSection ? (window.currentAdminClassroomSection.name || window.currentAdminClassroomSection.section) : '')
            || (typeof window.currentClassroomSectionName !== 'undefined' && window.currentClassroomSectionName)
            || (typeof currentClassroomSectionName !== 'undefined' && currentClassroomSectionName)
            || (typeof currentTopicState !== 'undefined' ? currentTopicState?.selectedSection : '')
            || (typeof window.currentTopicState !== 'undefined' ? window.currentTopicState?.selectedSection : '')
            || ((authorRole === 'Teacher' || isTeacher) ? (typeof resolveTeacherActiveSection === 'function' ? resolveTeacherActiveSection() : localStorage.getItem('sigma-active-classroom-section')) : '')
            || '';

        const finalItem = {
            id: finalIdAnother,
            title,
            description: desc,
            topicId,
            quarter: matQuarterForAnother,
            type,
            sourceType: type === 'Video' ? (state.sourceType === 'file' ? 'mp4' : (state.sourceType || 'embed')) : (state.sourceType || 'embed'),
            url: state.fileUrl || state.videoUrl || state.url || (state.fileName ? `image/${state.fileName}` : '') || (type === 'Video' ? 'image/campus-clip.mp4' : ''),
            fileUrl: state.fileUrl || state.url || '',
            videoUrl: state.videoUrl || state.fileUrl || state.url || (type === 'Video' ? 'image/campus-clip.mp4' : ''),
            fileType: type === 'Video' ? (state.sourceType === 'embed' ? 'youtube' : 'mp4') : (state.fileType || 'docx'),
            fileName: state.fileName || '',
            fileSize: state.fileSize || '',
            hasRubric: finalHasRubricAnother,
            rubricFileName: finalRubricFileNameAnother,
            rubricFileSize: finalHasRubricAnother ? (state.rubricFileSize || 'Rubric File') : '',
            rubricUrl: finalRubricUrlAnother,
            rubric: finalRubricFileNameAnother,
            quizMode: state.quizMode || 'storage',
            quizId: state.selectedQuizId || null,
            quizTitle: state.selectedQuizTitle || '',
            quizQuestionsCount: state.selectedQuizQuestions || 0,
            quizPoints: state.selectedQuizPoints || 0,
            perfGuidelinesFileName: state.perfGuidelinesFileName || '',
            perfGuidelinesUrl: state.perfGuidelinesUrl || '',
            perfRubricFileName: isSavingQuizAnother ? '' : (state.perfRubricFileName || ''),
            perfRubricUrl: isSavingQuizAnother ? '' : (state.perfRubricUrl || ''),
            duration: state.duration || '',
            authorId: authorId,
            authorName: authorName,
            authorRole: authorRole,
            section: activeSection,
            isTeacher: isTeacher || authorRole === 'Teacher',
            isAdmin: !isTeacher && authorRole === 'Admin',
            rubricSetByAdmin: !isTeacher && authorRole === 'Admin' && finalHasRubricAnother,
            timestamp: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (isSavingQuizAnother) {
            finalItem.isQuiz = true;
            finalItem.category = 'quiz';
            finalItem.component = 'ww';
            finalItem.gradebookComponent = 'ww';
        }

        if (topicId) {
            if (!window.expandedSubjectTopicIds) window.expandedSubjectTopicIds = {};
            window.expandedSubjectTopicIds[topicId] = true;
        }

        window.currentSubjectMaterials.push(finalItem);
        if (Array.isArray(window.currentSubjectAllMaterials) && !window.currentSubjectAllMaterials.some(m => m.id === finalItem.id)) {
            window.currentSubjectAllMaterials.push(finalItem);
        }

        if (typeof window.deduplicateMaterialsArray === 'function') {
            if (Array.isArray(window.currentSubjectMaterials)) {
                window.currentSubjectMaterials = window.deduplicateMaterialsArray(window.currentSubjectMaterials, { collapseRoles: false });
            }
            if (Array.isArray(window.currentSubjectAllMaterials)) {
                window.currentSubjectAllMaterials = window.deduplicateMaterialsArray(window.currentSubjectAllMaterials, { collapseRoles: false });
            }
        }

        // Sync rubric strictly to active section release config in localStorage
        try {
            const curSubj = window.currentSubjectData || window.editingSubjectData;
            const effSubjId = curSubj?.code || curSubj?.id || window.currentSubjectCode || window.originalEditingSubjectId || '';
            const cleanSubj = String(effSubjId).toLowerCase().replace(/^(card-|subj-)/, '');
            const activeSec = (typeof currentTopicState !== 'undefined' && currentTopicState?.selectedSection)
                ? currentTopicState.selectedSection
                : (typeof resolveTeacherActiveSection === 'function' ? resolveTeacherActiveSection() : '') ||
                  localStorage.getItem('sigma-active-classroom-section') || '';
            const keysToSync = [finalItem.id, finalItem.title].filter(Boolean);

            if (activeSec && cleanSubj) {
                const keys = [
                    `sigma_assessment_release_${cleanSubj}_${activeSec}`,
                    `sigma_assessment_release_${effSubjId}_${activeSec}`,
                    `sigma_assessment_release_card-${cleanSubj}_${activeSec}`
                ];
                keys.forEach(lk => {
                    try {
                        const raw = localStorage.getItem(lk);
                        if (!raw) return;
                        const parsed = JSON.parse(raw);
                        if (!parsed || typeof parsed !== 'object') return;
                        if (!parsed.assessmentRubrics) parsed.assessmentRubrics = {};
                        if (!parsed.assessmentRubricUrls) parsed.assessmentRubricUrls = {};

                        if (finalHasRubricAnother && finalRubricFileNameAnother) {
                            for (const k of keysToSync) {
                                parsed.assessmentRubrics[k] = finalRubricFileNameAnother;
                                if (finalRubricUrlAnother) parsed.assessmentRubricUrls[k] = finalRubricUrlAnother;
                            }
                        }
                        localStorage.setItem(lk, JSON.stringify(parsed));
                    } catch (e) {}
                });
            }
        } catch (err) {
            console.warn('[saveAndAddAnotherMaterial] Error syncing rubric to release configs:', err);
        }

        if (typeof window.syncCurrentSubjectEditorToStorage === 'function') {
            window.syncCurrentSubjectEditorToStorage();
        }

        window.currentSubjectMaterialQuarter = matQuarterForAnother;

        window.renderSubjectMaterials();
        window.addSubjectMaterial(type, false, -1);
        if (window.editingMaterialState) {
            window.editingMaterialState.topicId = topicId;
        }
        window.renderMaterialEditorForm();
        resetSubjectEditorScrollToTop();
        setTimeout(() => {
            const titleInputEl = document.getElementById('mat-editor-title');
            if (titleInputEl) {
                titleInputEl.focus();
            }
        }, 80);
    };

    window.deleteCurrentEditingMaterial = function () {
        if (window.currentEditingMaterialIndex < 0) return;
        const material = window.currentSubjectMaterials[window.currentEditingMaterialIndex];
        const matName = material?.title ? `"${material.title}"` : 'this material';
        const doRemove = () => {
            const targetId = String(material?.id || '');
            const targetTitle = String(material?.title || material?.name || '').trim().toLowerCase();
            const targetTopicId = String(material?.topicId || '');

            const isMatchingMat = (m) => {
                if (!m) return false;
                if (m === material) return true;
                if (targetId && m.id && String(m.id) === targetId) return true;
                if (targetTitle && (String(m.title || m.name || '').trim().toLowerCase() === targetTitle) && (String(m.topicId || '') === targetTopicId)) return true;
                return false;
            };

            if (Array.isArray(window.currentSubjectMaterials)) {
                window.currentSubjectMaterials = window.currentSubjectMaterials.filter(m => !isMatchingMat(m));
            }
            if (Array.isArray(window.currentSubjectAllMaterials)) {
                window.currentSubjectAllMaterials = window.currentSubjectAllMaterials.filter(m => !isMatchingMat(m));
            }
            if (typeof window.syncCurrentSubjectEditorToStorage === 'function') {
                window.syncCurrentSubjectEditorToStorage();
            }
            window.cancelMaterialEditor(true);
            window.renderSubjectMaterials();
        };

        if (typeof window.showSigmaDialog === 'function') {
            window.showSigmaDialog({
                title: 'Delete Material?',
                desc: `Are you sure you want to delete ${matName}?`,
                confirmText: 'Delete',
                cancelText: 'Cancel',
                isDanger: false,
                onConfirm: doRemove
            });
        } else {
            doRemove();
        }
    };

    function findMatchingSubjectIndex(subjectsList, curCode, curName, origCode, origId, origName) {
        if (!Array.isArray(subjectsList) || subjectsList.length === 0) return -1;
        if (typeof window.findMatchingSubject === 'function') {
            const keysToTry = [origCode, origId, curCode, { code: curCode, name: curName, id: origId }].filter(Boolean);
            for (const k of keysToTry) {
                const matched = window.findMatchingSubject(subjectsList, k);
                if (matched) {
                    const idx = subjectsList.indexOf(matched);
                    if (idx > -1) return idx;
                }
            }
        }
        const _norm = str => String(str || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        const targetCodes = [origCode, origId, curCode].filter(Boolean).map(x => String(x).trim().toLowerCase());
        const normCodes = targetCodes.map(x => _norm(x));
        const normNames = [origName, curName].filter(Boolean).map(x => _norm(x));

        for (let i = 0; i < subjectsList.length; i++) {
            const s = subjectsList[i];
            if (!s) continue;
            const sCode = (s.code || '').trim().toLowerCase();
            const sId = (s.id || '').trim().toLowerCase();
            const sName = _norm(s.name || '');
            if (targetCodes.includes(sCode) || targetCodes.includes(sId)) return i;
            if (normCodes.includes(_norm(sCode)) || normCodes.includes(_norm(sId))) return i;
            if (sName && normNames.some(n => n && (sName === n || sName.includes(n) || n.includes(sName)))) return i;
        }
        return -1;
    }

    function syncCustomStorageKeys() {
        // Subject content is stored only on sigma-admin-subjects.
        // The extra topic/material copies were a second route, and they are what filled storage.
        try {
            const toRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const lk = localStorage.key(i);
                if (!lk || lk.includes('broadcast')) continue;
                if (
                    lk.includes('card-card-') || lk.includes('subj-card-') || lk.includes('gen-card-') ||
                    lk.startsWith('sigma_subject_topics_') || lk.startsWith('sigma_subject_materials_') ||
                    lk.startsWith('sigma_custom_topics_') || lk.startsWith('sigma_custom_materials_') ||
                    lk.startsWith('sigma_materials_') ||
                    lk === 'sigma_active_preview_doc'
                ) {
                    toRemove.push(lk);
                }
            }
            toRemove.forEach(k => { try { localStorage.removeItem(k); } catch (_) {} });
        } catch (e) {
            console.warn('[syncCustomStorageKeys] non-blocking error:', e);
        }
    }

    function _embedMaterialsIntoTopics(topics, materials) {
        if (!Array.isArray(topics)) return [];
        const matList = Array.isArray(materials) ? materials : [];
        return topics.map((t, tIdx) => {
            if (typeof t === 'string') {
                t = {
                    id: `topic-${tIdx + 1}`,
                    title: t,
                    description: '',
                    quarter: 'q1'
                };
            }
            const topicIdStr = String(t.id || `topic-${tIdx + 1}`);
            let matchingMats = matList.filter(m => {
                if (!m) return false;
                const mTopicId = String(m.topicId || '');
                if (mTopicId === topicIdStr) return true;
                if (mTopicId === `topic-${tIdx + 1}` || mTopicId === String(tIdx + 1)) return true;
                if (topicIdStr === `topic-${tIdx}` && (mTopicId === `topic-${tIdx}` || mTopicId === String(tIdx))) return true;
                return false;
            });
            if (typeof window.deduplicateMaterialsArray === 'function') {
                matchingMats = window.deduplicateMaterialsArray(matchingMats, { collapseRoles: false });
            }

            const activities = matchingMats.filter(m => {
                const type = String(m.type || m.category || '').toLowerCase();
                return type === 'activity' || type === 'activities';
            });
            const tasks = matchingMats.filter(m => {
                const type = String(m.type || m.category || '').toLowerCase();
                return type === 'task' || type === 'tasks';
            });
            const assignments = matchingMats.filter(m => {
                const type = String(m.type || m.category || '').toLowerCase();
                return type === 'assignment' || type === 'assignments' || type === 'task' || type === 'tasks';
            });
            const quizzes = matchingMats.filter(m => {
                const type = String(m.type || m.category || '').toLowerCase();
                return type === 'quiz' || type === 'quizzes';
            });
            const performanceTasks = matchingMats.filter(m => {
                const type = String(m.type || m.category || '').toLowerCase();
                return type === 'performance task' || type === 'performance tasks' || type === 'performance' || type === 'perf. task';
            });
            const lessons = matchingMats.filter(m => {
                const type = String(m.type || m.category || '').toLowerCase();
                return type === 'lesson' || type === 'lessons' || type === 'handout' || type === 'handouts' || (!type && m.fileName);
            });
            const videos = matchingMats.filter(m => {
                const type = String(m.type || m.category || '').toLowerCase();
                return type === 'video' || type === 'videos';
            });

            return {
                ...t,
                id: topicIdStr,
                activity: activities,
                activities: activities,
                assignments: assignments,
                tasks: tasks.length > 0 ? tasks : assignments,
                task: tasks.length > 0 ? tasks : assignments,
                quiz: quizzes,
                quizzes: quizzes,
                performanceTasks: performanceTasks,
                performance: performanceTasks,
                materials: lessons,
                handouts: lessons,
                videos: videos,
                allMaterials: matchingMats
            };
        });
    }

    window.syncCurrentSubjectEditorToStorage = function () {
        const isTeacher = isCurrentEditorTeacher();
        const isStandalone = Boolean(window.subjectEditorOptions?.standalone);
        if (!window.isEditingSubject && !isStandalone && !isTeacher) return;
        const code = (document.getElementById('edit-subject-code')?.value || window.originalEditingSubjectCode || window.originalEditingSubjectId || '').trim();
        const name = (document.getElementById('edit-subject-name')?.value || window.originalEditingSubjectName || '').trim();
        if (!code && !window.originalEditingSubjectId) return;

        const subjects = _getStored(SUBJECTS_STORAGE_KEY, []);
        const index = findMatchingSubjectIndex(subjects, code, name, window.originalEditingSubjectCode, window.originalEditingSubjectId, window.originalEditingSubjectName);
        
        const rawTopics = (window.currentSubjectAllTopics && window.currentSubjectAllTopics.length > 0)
            ? [...window.currentSubjectAllTopics]
            : [...(window.currentSubjectTopics || [])];

        // Always ensure Admin topics are placed first, and Teacher-added topics are placed below Admin topics
        const sortedRawTopics = [
            ...rawTopics.filter(t => {
                const r = t.authorRole || t.role || (t.isAdmin ? 'Admin' : (t.isTeacher ? 'Teacher' : 'Admin'));
                return normalizeSubjectAuthorRole(r) === 'Admin';
            }),
            ...rawTopics.filter(t => {
                const r = t.authorRole || t.role || (t.isAdmin ? 'Admin' : (t.isTeacher ? 'Teacher' : 'Admin'));
                return normalizeSubjectAuthorRole(r) === 'Teacher';
            })
        ];

        const finalMaterials = (window.currentSubjectAllMaterials && window.currentSubjectAllMaterials.length > 0)
            ? [...window.currentSubjectAllMaterials]
            : [...(window.currentSubjectMaterials || [])];

        const finalTopics = _embedMaterialsIntoTopics(sortedRawTopics, finalMaterials);
        const cleanFinalTopics = finalTopics.map(sanitizeTopicForStorage);
        const rawCleanFinalMaterials = finalMaterials.map(sanitizeMaterialForStorage);
        const cleanFinalMaterials = (typeof window.deduplicateMaterialsArray === 'function')
            ? window.deduplicateMaterialsArray(rawCleanFinalMaterials, { collapseRoles: false })
            : rawCleanFinalMaterials;

        let targetSubject = null;
        if (index > -1) {
            targetSubject = subjects[index];
            targetSubject.topics = cleanFinalTopics;
            targetSubject.materials = cleanFinalMaterials;
            targetSubject.activeQuarters = getActiveSubjectQuarters();
            if (name) targetSubject.name = name;
        } else {
            targetSubject = {
                id: window.originalEditingSubjectId || code,
                code: code,
                name: name || window.originalEditingSubjectName || 'Subject Content',
                units: '3',
                type: 'Core',
                strand: 'ABM',
                status: 'Published',
                activeQuarters: getActiveSubjectQuarters(),
                createdAt: new Date().toISOString(),
                topics: cleanFinalTopics,
                materials: cleanFinalMaterials
            };
            subjects.unshift(targetSubject);
        }

        _saveStored(SUBJECTS_STORAGE_KEY, subjects);
        if (typeof window.syncSubjectToDB === 'function') {
            window.syncSubjectToDB(targetSubject);
        }

        syncCustomStorageKeys(targetSubject, window.originalEditingSubjectCode, window.originalEditingSubjectId, window.originalEditingSubjectName);

        window.dispatchEvent(new CustomEvent('sigma:subjectUpdated', {
            detail: { subject: targetSubject, code: targetSubject.code, subjectId: window.originalEditingSubjectId || window.originalEditingSubjectCode || code }
        }));
    };

    // ── SAVING & PUBLISHING WORKSTATION DATA ──────────────────────────────────

    window.handleSubjectSave = function (status = 'Published') {
        const editorOpts = window.subjectEditorOptions;
        const isStandaloneMode = !!editorOpts?.standalone;
        const standaloneStep = editorOpts?.standaloneStep || 0;

        const subjects = _getStored(SUBJECTS_STORAGE_KEY, []);
        const rawCode = (document.getElementById('edit-subject-code')?.value || window.originalEditingSubjectCode || '').trim();
        const rawName = (document.getElementById('edit-subject-name')?.value || window.originalEditingSubjectName || '').trim();
        const index = findMatchingSubjectIndex(subjects, rawCode, rawName, window.originalEditingSubjectCode, window.originalEditingSubjectId, window.originalEditingSubjectName);
        const existingSubject = index > -1 ? subjects[index] : null;

        const code = (rawCode || (existingSubject ? existingSubject.code : '') || (existingSubject ? existingSubject.id : '') || window.originalEditingSubjectId || 'SUBJ-101').trim();
        const name = (rawName || (existingSubject ? existingSubject.name : '') || window.originalEditingSubjectName || 'Subject Content').trim();
        const units = (document.getElementById('edit-subject-units')?.value || (existingSubject ? existingSubject.units : '3') || '3').trim();
        const type = document.getElementById('edit-subject-type')?.value || (existingSubject ? existingSubject.type : 'Core') || 'Core';
        const strand = document.getElementById('edit-subject-strand')?.value || (existingSubject ? existingSubject.strand : 'ABM') || 'ABM';

        const weightsSelect = document.getElementById('edit-subject-weights');
        let subjectWeights = null;
        if (weightsSelect) {
            const opt = weightsSelect.selectedOptions?.[0];
            const ww = opt ? Number(opt.dataset.ww) : 25;
            const pt = opt ? Number(opt.dataset.pt) : 50;
            const qa = opt ? Number(opt.dataset.qa) : 25;
            subjectWeights = {
                ww: Number.isFinite(ww) ? ww : 25,
                pt: Number.isFinite(pt) ? pt : 50,
                qa: Number.isFinite(qa) ? qa : 25,
                preset: weightsSelect.value || 'core'
            };
        } else if (existingSubject && existingSubject.weights) {
            subjectWeights = { ...existingSubject.weights };
        } else {
            subjectWeights = { ww: 25, pt: 50, qa: 25, preset: 'core' };
        }

        if (!isStandaloneMode) {
            if (!code || !name) {
                alert('Please provide both a Subject Code and Subject Name.');
                window.handleSubjectStep(1);
                return;
            }

            if (typeof window.validateSubjectStep1 === 'function' && !window.validateSubjectStep1()) {
                window.handleSubjectStep(1);
                return;
            }
        }

        if (!isStandaloneMode && window.subjectEditorOptions?.focus === 'info') {
            if (index < 0) return;
            subjects[index].code = code;
            subjects[index].name = name;
            subjects[index].units = units;
            subjects[index].type = type;
            subjects[index].strand = strand;
            subjects[index].weights = subjectWeights;
            subjects[index].status = status;
            subjects[index].activeQuarters = getActiveSubjectQuarters();
            _saveStored(SUBJECTS_STORAGE_KEY, subjects);
            if (typeof window.syncSubjectToDB === 'function') {
                window.syncSubjectToDB(subjects[index]);
            }

            if (typeof window.saveSubjectGradebookWeights === 'function' && subjectWeights) {
                window.saveSubjectGradebookWeights(code, subjectWeights);
                window.saveSubjectGradebookWeights(name, subjectWeights);
                if (subjects[index]?.id) window.saveSubjectGradebookWeights(subjects[index].id, subjectWeights);
                if (window.originalEditingSubjectId) window.saveSubjectGradebookWeights(window.originalEditingSubjectId, subjectWeights);
                if (window.originalEditingSubjectCode) window.saveSubjectGradebookWeights(window.originalEditingSubjectCode, subjectWeights);
                if (window.originalEditingSubjectName) window.saveSubjectGradebookWeights(window.originalEditingSubjectName, subjectWeights);
            }

            window.toggleSubjectOverlay(false);
            window.dispatchEvent(new CustomEvent('sigma:subjectUpdated', {
                detail: {
                    subject: subjects[index],
                    code: subjects[index].code,
                    subjectId: window.originalEditingSubjectId || window.originalEditingSubjectCode || code
                }
            }));
            if (typeof window.renderSubjectsTable === 'function') window.renderSubjectsTable();
            if (typeof window.showToast === 'function') {
                window.showToast(status === 'Draft' ? 'Subject saved as draft' : 'Subject updated');
            }
            return;
        }

        const isTeacher = isCurrentEditorTeacher();
        const currentUser = getCurrentEditorUser();
        const currentUserId = currentUser ? String(currentUser.id || currentUser.uid || currentUser.username || '') : '';
        const currentUserName = currentUser ? (`${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.name || '') : '';
        const myName = currentUserName.trim().toLowerCase();

        let finalTopics = ((window.currentSubjectAllTopics && window.currentSubjectAllTopics.length > 0)
            ? [...window.currentSubjectAllTopics]
            : [...(window.currentSubjectTopics || [])]).filter(t => !isFakeSampleTopic(t));
        let finalMaterials = ((window.currentSubjectAllMaterials && window.currentSubjectAllMaterials.length > 0)
            ? [...window.currentSubjectAllMaterials]
            : [...(window.currentSubjectMaterials || [])]).filter(m => !isFakeSampleMaterial(m));

        // Embed materials into each topic's respective arrays
        finalTopics = _embedMaterialsIntoTopics(finalTopics, finalMaterials);

        // Keep in-memory full objects for active session
        window.currentSubjectAllTopics = finalTopics;
        window.currentSubjectAllMaterials = finalMaterials;
        window.currentSubjectTopics = finalTopics;
        window.currentSubjectMaterials = finalMaterials;

        const storedTopics = finalTopics.map(sanitizeTopicForStorage);
        const storedMaterials = finalMaterials.map(sanitizeMaterialForStorage);

        const newSubject = {
            id: (existingSubject ? existingSubject.id : null) || window.originalEditingSubjectId || code,
            code,
            name,
            units,
            type,
            strand,
            weights: subjectWeights,
            status,
            activeQuarters: getActiveSubjectQuarters(),
            createdAt: (existingSubject ? existingSubject.createdAt : null) || new Date().toISOString(),
            topics: storedTopics,
            materials: storedMaterials
        };

        if (index > -1) {
            subjects[index] = newSubject;
        } else {
            subjects.unshift(newSubject);
        }

        _saveStored(SUBJECTS_STORAGE_KEY, subjects);
        if (typeof window.syncSubjectToDB === 'function') {
            window.syncSubjectToDB(newSubject);
        }

        if (typeof window.saveSubjectGradebookWeights === 'function' && subjectWeights) {
            window.saveSubjectGradebookWeights(code, subjectWeights);
            window.saveSubjectGradebookWeights(name, subjectWeights);
            if (newSubject?.id) window.saveSubjectGradebookWeights(newSubject.id, subjectWeights);
            if (window.originalEditingSubjectId) window.saveSubjectGradebookWeights(window.originalEditingSubjectId, subjectWeights);
            if (window.originalEditingSubjectCode) window.saveSubjectGradebookWeights(window.originalEditingSubjectCode, subjectWeights);
            if (window.originalEditingSubjectName) window.saveSubjectGradebookWeights(window.originalEditingSubjectName, subjectWeights);
        }

        // Also sync custom topics and materials for teacher view across all aliases if applicable
        syncCustomStorageKeys(newSubject, window.originalEditingSubjectCode, window.originalEditingSubjectId, window.originalEditingSubjectName);

        // Determine badge label and type for creation bar
        let creationLabel = 'Published Subject';
        let creationType = 'subject';

        if (status === 'Draft') {
            creationLabel = 'Saved as Draft';
        } else if (isStandaloneMode) {
            if (standaloneStep === 2) {
                creationType = 'topic';
                if (window._hasAddedNewTopic || (finalTopics.length > (window._initialSubjectTopicsCount || 0))) {
                    creationLabel = 'Topic Added';
                } else if (window._hasEditedExistingTopic || (window._initialSubjectTopicsCount && window._initialSubjectTopicsCount > 0)) {
                    creationLabel = 'Topic Edited';
                } else {
                    creationLabel = 'Topic Added';
                }
            } else if (standaloneStep === 3) {
                creationType = 'material';
                if (window._hasAddedNewMaterial || (finalMaterials.length > (window._initialSubjectMaterialsCount || 0))) {
                    creationLabel = 'Material Added';
                } else if (window._hasEditedExistingMaterial || (window._initialSubjectMaterialsCount && window._initialSubjectMaterialsCount > 0)) {
                    creationLabel = 'Material Edited';
                } else {
                    creationLabel = 'Material Added';
                }
            }
        } else {
            const isPublishedEdit = window.isEditingSubject && String(window.currentEditingSubjectStatus || '').toLowerCase() === 'published';
            creationLabel = isPublishedEdit ? 'Updated Subject' : 'Published Subject';
        }

        window.toggleSubjectOverlay(false);

        // Notify other listeners (e.g. Teacher & Admin portals)
        window.dispatchEvent(new CustomEvent('sigma:subjectUpdated', {
            detail: { 
                subject: newSubject, 
                code: newSubject.code, 
                subjectId: window.originalEditingSubjectId || window.originalEditingSubjectCode || code 
            }
        }));

        if (typeof window.renderSubjectsTable === 'function') {
            window.renderSubjectsTable();
        }
        if (typeof window.showToast === 'function') {
            window.showToast(status === 'Draft' ? 'Subject saved as draft' : 'Subject published successfully');
        }

        // Show shared creation bar if available (for Admin full subject creation/publishing only)
        const isStandaloneOrTeacher = Boolean(editorOpts?.standalone) || isCurrentEditorTeacher();
        if (!isStandaloneOrTeacher && typeof window.showCreationBar === 'function') {
            window.showCreationBar({
                type: creationType,
                label: creationLabel,
                primaryLabel: 'Subject Name',
                primaryValue: newSubject.name,
                secondaryLabel: 'Subject Code',
                secondaryValue: newSubject.code,
                status: status.toLowerCase()
            });
        }

        if (editorOpts?.standalone) {
            const onSave = editorOpts?.onSave || editorOpts?.onBack || editorOpts?.onExit;
            if (typeof onSave === 'function') {
                onSave();
            }
        }
    };

    window.publishAndCreateSubject = function () {
        window.handleSubjectSave('Published');
    };

    window.saveAndAddAnotherSubject = function () {
        window.handleSubjectSave('Published');
        window.isEditingSubject = false;
        window.toggleSubjectOverlay(true, null);
        resetSubjectEditorScrollToTop();
    };

    window.editSubject = function (code) {
        window.openSubjectEditor(code, 1, { focus: 'info' });
    };

    window.editSubjectContent = function (code) {
        if (typeof window.openSharedTopicsAndMaterials === 'function') {
            window.openSharedTopicsAndMaterials({ subjectId: code });
        } else {
            window.openSubjectEditor(code, 3, {
                standalone: true,
                focus: 'content',
                title: 'Add/Edit Topics & Materials',
                hideBars: true
            });
        }
    };

    window.deleteSubjectPrompt = function (codeToDelete = null) {
        if (!canCurrentSubjectEditorDeleteSubject()) {
            if (typeof window.showAlertDialog === 'function') {
                window.showAlertDialog({
                    title: 'Permission Denied',
                    message: 'Subject deletion requires Master Admin authorization or explicit delete permissions.',
                    buttonText: 'OK'
                });
            } else {
                alert('Subject deletion requires Master Admin authorization or explicit delete permissions.');
            }
            return;
        }

        const code = codeToDelete || document.getElementById('edit-subject-code')?.value || window.originalEditingSubjectCode || '';

        const performDelete = () => {
            window.deleteSubject(code);
        };

        if (typeof window.showSigmaDialog === 'function') {
            window.showSigmaDialog({
                title: 'Delete Subject?',
                desc: `Are you sure you want to delete ${code ? `"${code}"` : 'this subject'}? This will remove the subject and all attached topics and materials from the catalog.`,
                confirmText: 'Delete',
                cancelText: 'Cancel',
                isDanger: false,
                onConfirm: performDelete
            });
        } else if (confirm(`Are you sure you want to delete ${code ? `"${code}"` : 'this subject'}? This will remove the subject and all attached topics and materials from the catalog.`)) {
            performDelete();
        }
    };

    window.deleteSubject = function (codeToDelete = null) {
        const code = codeToDelete || document.getElementById('edit-subject-code')?.value || window.originalEditingSubjectCode || '';
        if (!code) return;

        const subjects = _getStored(SUBJECTS_STORAGE_KEY, []);
        const newSubjects = subjects.filter(s => (s.code || '').trim().toLowerCase() !== code.trim().toLowerCase());
        _saveStored(SUBJECTS_STORAGE_KEY, newSubjects);
        if (typeof window.deleteSubjectFromDB === 'function') {
            window.deleteSubjectFromDB(code);
        }

        window.toggleSubjectOverlay(false);

        window.dispatchEvent(new CustomEvent('sigma:subjectDeleted', {
            detail: { code }
        }));

        if (typeof window.renderSubjectsTable === 'function') {
            window.renderSubjectsTable();
        }
        if (typeof window.renderTeacherSubjects === 'function') {
            window.renderTeacherSubjects();
        }
        if (typeof window.renderTeacherCatalog === 'function') {
            window.renderTeacherCatalog();
        }

        if (typeof window.showToast === 'function') {
            window.showToast('Subject deleted successfully');
        }
    };

    // Auto-mount on load
    document.addEventListener('DOMContentLoaded', () => {
        window.ensureSubjectEditOverlay();
    });
})();
