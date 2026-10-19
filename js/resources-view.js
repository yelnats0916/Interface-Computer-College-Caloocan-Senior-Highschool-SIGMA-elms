/**
 * SIGMA ELMS - Unified Learning Resources View
 * Shared across Teacher, Student, and Admin portals.
 * Modern Subject & Classroom Shelf with Cloud Workspace Controls.
 */
(function () {
    'use strict';

    const STORAGE_KEY = 'sigma-shared-resources-v2';

    // Default seed resources if storage is empty (cleared: now dynamically connected to real uploaded subject materials)
    const DEFAULT_RESOURCES = [];

    // Internal State
    let _activeCategoryFilter = 'all';
    let _activeTypeFilter = 'all';
    let _searchQuery = '';
    let _currentViewMode = localStorage.getItem('sigma_resources_view_mode') || 'table'; // 'table' (default) | 'grid'
    let _activeAuthorFilter = null; // null: all resources | string: specific author (e.g. current admin or other instructor)
    let _activeSchoolYearFilter = '2026-2027'; // '2026-2027' | 'all' | '2025-2026' | 'archive'
    let _currentPage = 1;
    const _pageSize = 20;
    let studentSubmissionsOnly = false;
    let ownUploadsOnly = false;
    function resourceViewer() {
        let auth = {}; try { auth = JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}'); } catch (_) {}
        const student = /student/i.test(location.pathname) || /student/i.test(auth.role || auth.type || '');
        const user = student ? (window.getLoggedInStudentUser?.() || auth) : auth;
        return {user,student,teacher:!student && (/teacher/i.test(location.pathname) || /teacher/i.test(auth.role || auth.type || ''))};
    }
    const resourceIsSubmission = item => item.isStudentSubmission || /^(sub-|indiv-)/.test(String(item.id));
    const resourceCanUpload = item => {
        const viewer = resourceViewer();
        return !viewer.student && !resourceIsSubmission(item) && (!viewer.teacher || resourceIsOwned(item,viewer.user));
    };
    function resourceIsOwned(item, user) {
        const id = String(user.uid || user.id || user.studentNumber || user.lrn || '');
        const owner = String(item.studentId || item.sourceAuthorId || item.uploadedById || '');
        if (owner && id) return owner === id;
        const name = formatFirstLastName(user.fullName || user.name || [user.firstName,user.lastName].filter(Boolean).join(' ')).toLowerCase();
        return Boolean(name && name !== 'instructor' && formatFirstLastName(item.author || item.uploadedBy || '').toLowerCase() === name);
    }
    function resourceInViewerClass(item, viewer) {
        const norm = value => String(value || '').toLowerCase().replace(/^(card-|subj-|gen-)/,'').replace(/[^a-z0-9]/g,'');
        const subjects = [item.subjectCode,item.subject].filter(Boolean).map(norm);
        if (viewer.teacher) {
            const assigned = window.getTeacherAssignedSubjectsAndSections?.(window.getLoggedInTeacherUser?.() || viewer.user) || [];
            return assigned.some(row => [row.subjectId,row.subjectCode,row.subject,row.title].filter(Boolean).some(value => subjects.includes(norm(value))));
        }
        let sections = []; try { sections = JSON.parse(localStorage.getItem('sigma-admin-sections') || '[]'); } catch (_) {}
        return sections.some(section => window.isSectionAssignedToStudent?.(section,viewer.user) &&
            [section.subject,section.subjectName,...(Array.isArray(section.subjects) ? section.subjects : [])].some(value =>
                [typeof value === 'object' ? value.id : value, value?.code,value?.name,value?.subject].filter(Boolean).some(alias => subjects.includes(norm(alias)))));
    }

    function isMobileResourcesViewport() {
        return typeof window !== 'undefined' && window.innerWidth <= 768;
    }

    function getEffectiveViewMode() {
        return isMobileResourcesViewport() ? 'grid' : _currentViewMode;
    }

    function getCurrentAdminUser() {
        try {
            const auth = JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}');
            const prof = JSON.parse(localStorage.getItem('sigma_user_profile') || '{}');
            let name = auth.name || auth.fullName || prof.name || prof.fullName || '';
            if (!name && typeof window.getLoggedInAdminUser === 'function') {
                const u = window.getLoggedInAdminUser();
                name = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name || '';
            }
            if (!name) name = 'Stanley Garcia';
            const role = auth.role || prof.role || 'Administrator';
            return { name, role };
        } catch (_) {
            return { name: 'Stanley Garcia', role: 'Administrator' };
        }
    }

    function isCurrentAdmin(authorName) {
        if (!authorName) return false;
        const admin = getCurrentAdminUser();
        const aLow = String(authorName).toLowerCase().trim();
        const admLow = String(admin.name || '').toLowerCase().trim();
        return aLow === admLow || 
               admLow.includes(aLow) || 
               aLow.includes(admLow) ||
               aLow === 'curriculum office' || 
               aLow.includes('curriculum') || 
               aLow.includes('admin') ||
               aLow.includes('stanley');
    }

    /**
     * Helper: format author name strictly as First Name + Last Name
     * Strips titles, middle names, and middle initials, while respecting compound surnames.
     */
    function formatFirstLastName(name) {
        if (!name) return 'Instructor';
        let raw = String(name).trim();
        if (!raw) return 'Instructor';

        // 1. Try to match with registered user accounts in localStorage
        try {
            const rawUsers = localStorage.getItem('sigma-user-accounts');
            if (rawUsers) {
                const users = JSON.parse(rawUsers);
                if (Array.isArray(users)) {
                    const rawLow = raw.toLowerCase();
                    const match = users.find(u => {
                        if (!u) return false;
                        const fn = String(u.fullName || '').toLowerCase().trim();
                        const compFn = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase().trim();
                        const revFn = `${u.lastName || ''}, ${u.firstName || ''}`.toLowerCase().trim();
                        return rawLow === fn || rawLow === compFn || rawLow === revFn;
                    });
                    if (match && match.firstName && match.lastName) {
                        return `${match.firstName.trim()} ${match.lastName.trim()}`;
                    }
                }
            }
        } catch (_) {}

        // 2. Remove common prefixes/titles
        raw = raw.replace(/^(prof\.|dr\.|mr\.|ms\.|mrs\.|engr\.|atty\.|rev\.)\s+/i, '');

        // 3. Handle "Lastname, Firstname Middle..." format
        if (raw.includes(',')) {
            const parts = raw.split(',');
            const last = parts[0].trim();
            const firstTokens = parts[1].trim().split(/\s+/).filter(Boolean);
            const first = firstTokens[0] || '';
            return `${first} ${last}`.trim();
        }

        // 4. Split by whitespace
        const words = raw.split(/\s+/).filter(Boolean);
        if (words.length <= 2) return words.join(' ');

        // Check for common compound surname prefixes (e.g. Dela Cruz, De La Cruz, San Juan)
        const compoundPrefixes = ['dela', 'de', 'delos', 'del', 'san', 'santa', 'van', 'von', 'dos', 'da'];
        if (words.length === 3 && compoundPrefixes.includes(words[1].toLowerCase())) {
            return `${words[0]} ${words[1]} ${words[2]}`;
        }
        if (words.length === 4 && compoundPrefixes.includes(words[1].toLowerCase()) && compoundPrefixes.includes(words[2].toLowerCase())) {
            return `${words[0]} ${words[1]} ${words[2]} ${words[3]}`;
        }

        // Default: First token + Last token (omits middle name/initial)
        return `${words[0]} ${words[words.length - 1]}`;
    }

    function resolveAuthorAvatar(authorName) {
        if (!authorName) return '';
        const aLow = String(authorName).toLowerCase().trim();

        // 1. If it's current admin, check profile photo
        if (isCurrentAdmin(authorName)) {
            try {
                const prof = JSON.parse(localStorage.getItem('sigma_user_profile') || '{}');
                if (prof.photo || prof.avatar) return prof.photo || prof.avatar;
            } catch (_) {}
            const admAvatar = localStorage.getItem('sigma_avatar_0000000');
            if (admAvatar) return admAvatar;
        }

        // 2. Search registered users in sigma-user-accounts
        try {
            const rawUsers = localStorage.getItem('sigma-user-accounts');
            if (rawUsers) {
                const users = JSON.parse(rawUsers);
                if (Array.isArray(users)) {
                    const match = users.find(u => {
                        if (!u) return false;
                        const fn = String(u.fullName || `${u.firstName || ''} ${u.lastName || ''}`).toLowerCase().trim();
                        const reverseFn = String(`${u.lastName || ''}, ${u.firstName || ''}`).toLowerCase().trim();
                        const uid = String(u.uid || u.id || '').toLowerCase().trim();
                        return fn === aLow || reverseFn === aLow || aLow.includes(fn) || fn.includes(aLow);
                    });
                    if (match) {
                        if (typeof window.resolveUserAvatar === 'function') {
                            const res = window.resolveUserAvatar(match);
                            if (res) return res;
                        }
                        if (match.photo || match.avatar) return match.photo || match.avatar;
                        const matchId = String(match.uid || match.id || '').replace(/^#/, '').trim();
                        if (matchId) {
                            const av = localStorage.getItem(`sigma_avatar_${matchId}`);
                            if (av) return av;
                        }
                    }
                }
            }
        } catch (_) {}

        return '';
    }

    // Helper: determine if an item has a real uploaded file (pdf, docx, pptx, mp4, zip)
    function extractRealUploadedFile(mat, defaultCategory = 'Handout') {
        if (!mat) return null;

        // Candidate file names from material structure
        const candidates = [
            { name: mat.fileName, url: mat.fileUrl || mat.fileData || mat.dataUrl || mat.url, size: mat.fileSize, type: mat.fileType || mat.type },
            { name: mat.perfGuidelinesFileName, url: mat.perfGuidelinesUrl || mat.perfGuidelinesFileUrl, size: mat.perfGuidelinesFileSize, type: 'docx' },
            { name: mat.rubricFileName, url: mat.rubricFileUrl || mat.rubricUrl, size: mat.rubricFileSize, type: 'docx' },
            { name: (typeof mat.rubric === 'object' && mat.rubric ? mat.rubric.fileName : ''), url: mat.rubric?.fileUrl || mat.rubric?.url, size: '', type: 'docx' }
        ];

        // Also check if title or url has a real file extension
        if (mat.title && /\.(pdf|docx?|pptx?|mp4|mov|zip|rar)$/i.test(mat.title.trim())) {
            candidates.push({ name: mat.title.trim(), url: mat.fileUrl || mat.dataUrl || mat.url, size: mat.fileSize, type: mat.fileType || mat.type });
        }
        if (mat.url && /\.(pdf|docx?|pptx?|mp4|mov|zip|rar)$/i.test(mat.url.trim())) {
            const urlBase = mat.url.split('/').pop().split('?')[0];
            if (urlBase) {
                candidates.push({ name: urlBase, url: mat.url, size: mat.fileSize, type: mat.fileType || mat.type });
            }
        }

        const validFiles = [];
        const seenCandidateNames = new Set();

        candidates.forEach(cand => {
            if (!cand || !cand.name || typeof cand.name !== 'string') return;
            const rawName = cand.name.trim();
            if (!rawName || seenCandidateNames.has(rawName.toLowerCase())) return;

            // Must match real file extensions: pdf, doc/docx, ppt/pptx, mp4/mov, zip/rar
            const match = rawName.match(/\.(pdf|docx?|pptx?|mp4|mov|zip|rar)$/i);
            if (!match) return;

            seenCandidateNames.add(rawName.toLowerCase());
            const extLower = match[1].toLowerCase();
            let normType = 'pdf';
            if (extLower.startsWith('ppt')) normType = 'pptx';
            else if (extLower.startsWith('doc')) normType = 'docx';
            else if (extLower === 'mp4' || extLower === 'mov') normType = 'video';
            else if (extLower === 'zip' || extLower === 'rar') normType = 'zip';

            validFiles.push({
                fileName: rawName,
                fileUrl: cand.url || '',
                fileType: normType,
                fileSize: cand.size || mat.fileSize || '2.4 MB'
            });
        });

        return validFiles;
    }

    // Connect and harvest real materials from subjects, topics, and sections
    function getRealSubjectMaterials() {
        const harvested = [];
        const seenIds = new Set();
        const admin = getCurrentAdminUser();

        // 1. Check all subject stores
        const subjectKeys = [
            'sigma-admin-subjects',
            'sigma_subjects_v2',
            'sigma-teacher-subjects',
            'sigma_subjects',
            'sigma_subjects_data'
        ];

        subjectKeys.forEach(key => {
            try {
                const raw = localStorage.getItem(key);
                if (!raw) return;
                const subjects = JSON.parse(raw);
                if (!Array.isArray(subjects)) return;

                subjects.forEach(subj => {
                    const subjTitle = subj.name || subj.title || 'General';
                    const subjCode = subj.code || subj.subjectCode || '';

                    // Check top-level materials
                    if (Array.isArray(subj.materials)) {
                        subj.materials.forEach(mat => {
                            if (!mat || (typeof window.isFakeSampleMaterial === 'function' && window.isFakeSampleMaterial(mat))) return;

                            const files = extractRealUploadedFile(mat, mat.category || 'Handout');
                            if (!files || files.length === 0) return;

                            files.forEach((f, fIdx) => {
                                const fileId = String(mat.id || '') + '-' + f.fileName;
                                if (seenIds.has(fileId)) return;
                                seenIds.add(fileId);

                                const author = mat.authorName || mat.author || admin.name;
                                const materialTitle = mat.title || subjTitle || 'General Material';
                                harvested.push({
                                    id: mat.id ? `${mat.id}-f${fIdx}` : `mat-${Date.now()}-${Math.random()}`,
                                    sourceAuthorId: mat.authorId || '',
                                    sourceAuthorRole: mat.authorRole || mat.role || '',
                                    rawMaterialId: mat.id || '',
                                    title: f.fileName,
                                    fileUrl: f.fileUrl,
                                    materialTitle: materialTitle,
                                    subject: subjTitle,
                                    subjectCode: subjCode,
                                    type: f.fileType,
                                    category: mat.category || (f.fileType === 'video' ? 'Lecture Slides' : 'Handout'),
                                    quarter: mat.quarter || '1st Quarter',
                                    size: f.fileSize,
                                    date: mat.createdAt ? new Date(mat.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'Recent',
                                    schoolYear: mat.schoolYear || subj.schoolYear || '2026-2027',
                                    author: author,
                                    sharedWithStudents: mat.sharedWithStudents !== false,
                                    downloads: mat.downloads || 0,
                                    description: mat.title ? `${mat.title} (${subjTitle})` : `${f.fileName} for ${subjTitle}`
                                });
                            });
                        });
                    }

                    // Check materials embedded in topics
                    if (Array.isArray(subj.topics)) {
                        subj.topics.forEach(t => {
                            if (!t) return;
                            const topicMats = [
                                ...(t.activity || []),
                                ...(t.tasks || []),
                                ...(t.assignments || []),
                                ...(t.quizzes || []),
                                ...(t.lessons || []),
                                ...(t.performanceTasks || []),
                                ...(t.materials || [])
                            ];

                            topicMats.forEach(mat => {
                                if (!mat || (typeof window.isFakeSampleMaterial === 'function' && window.isFakeSampleMaterial(mat))) return;

                                const files = extractRealUploadedFile(mat, mat.category || 'Handout');
                                if (!files || files.length === 0) return;

                                files.forEach((f, fIdx) => {
                                    const fileId = String(mat.id || '') + '-' + f.fileName;
                                    if (seenIds.has(fileId)) return;
                                    seenIds.add(fileId);

                                    const author = mat.authorName || mat.author || admin.name;
                                    const materialTitle = mat.title || t.title || subjTitle || 'General Material';
                                    harvested.push({
                                        id: mat.id ? `${mat.id}-f${fIdx}` : `mat-${Date.now()}-${Math.random()}`,
                                        rawMaterialId: mat.id || '',
                                        sourceAuthorId: mat.authorId || '',
                                        sourceAuthorRole: mat.authorRole || mat.role || '',
                                        title: f.fileName,
                                    fileUrl: f.fileUrl,
                                        materialTitle: materialTitle,
                                        subject: subjTitle,
                                        subjectCode: subjCode,
                                        type: f.fileType,
                                        category: mat.category || (f.fileType === 'video' ? 'Lecture Slides' : 'Handout'),
                                        quarter: mat.quarter || t.quarter || '1st Quarter',
                                        size: f.fileSize,
                                        date: mat.createdAt ? new Date(mat.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'Recent',
                                        schoolYear: mat.schoolYear || t.schoolYear || subj.schoolYear || '2026-2027',
                                        author: author,
                                        sharedWithStudents: mat.sharedWithStudents !== false,
                                        downloads: mat.downloads || 0,
                                        description: mat.title ? `${mat.title} (${t.title || subjTitle})` : `${f.fileName} for ${subjTitle}`
                                    });
                                });
                            });
                        });
                    }
                });
            } catch (_) {}
        });

        // 2. Also harvest from sigma-admin-sections if materials or topics exist there
        try {
            const rawSec = localStorage.getItem('sigma-admin-sections');
            if (rawSec) {
                const sections = JSON.parse(rawSec);
                if (Array.isArray(sections)) {
                    sections.forEach(sec => {
                        const secSubj = sec.subject || sec.subjectName || 'General';
                        const secMats = [
                            ...(sec.materials || []),
                            ...(sec.topics ? sec.topics.flatMap(t => [...(t.activity || []), ...(t.tasks || []), ...(t.lessons || []), ...(t.materials || [])]) : [])
                        ];
                        secMats.forEach(mat => {
                            if (!mat || (typeof window.isFakeSampleMaterial === 'function' && window.isFakeSampleMaterial(mat))) return;

                            const files = extractRealUploadedFile(mat, mat.category || 'Handout');
                            if (!files || files.length === 0) return;

                            files.forEach((f, fIdx) => {
                                const fileId = String(mat.id || '') + '-' + f.fileName;
                                if (seenIds.has(fileId)) return;
                                seenIds.add(fileId);

                                harvested.push({
                                    id: mat.id ? `${mat.id}-f${fIdx}` : `mat-${Date.now()}-${Math.random()}`,
                                    rawMaterialId: mat.id || '',
                                    sourceAuthorId: mat.authorId || '',
                                    sourceAuthorRole: mat.authorRole || mat.role || '',
                                    title: f.fileName,
                                    fileUrl: f.fileUrl,
                                    materialTitle: mat.title || secSubj || 'General Material',
                                    subject: secSubj,
                                    subjectCode: '',
                                    type: f.fileType,
                                    category: mat.category || (f.fileType === 'video' ? 'Lecture Slides' : 'Handout'),
                                    quarter: mat.quarter || '1st Quarter',
                                    size: f.fileSize,
                                    date: mat.createdAt ? new Date(mat.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'Recent',
                                    schoolYear: mat.schoolYear || sec.schoolYear || '2026-2027',
                                    author: mat.authorName || mat.author || admin.name,
                                    sharedWithStudents: mat.sharedWithStudents !== false,
                                    downloads: mat.downloads || 0,
                                    description: mat.title ? `${mat.title} (${secSubj})` : `${f.fileName} for ${secSubj}`
                                });
                            });
                        });
                    });
                }
            }
        } catch (_) {}

        // 3. Harvest teacher custom topics & lesson uploads (sigma_custom_topics_*)
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (!k) continue;

                // Check custom teacher topic keys: sigma_custom_topics_*
                if (k.startsWith('sigma_custom_topics_') || k.startsWith('sigma_teacher_topics_')) {
                    try {
                        const rawTopics = localStorage.getItem(k);
                        if (!rawTopics) continue;
                        const topics = JSON.parse(rawTopics);
                        if (!Array.isArray(topics)) continue;

                        topics.forEach(t => {
                            if (!t) return;
                            const tMats = [
                                ...(t.activity || []),
                                ...(t.tasks || []),
                                ...(t.assignments || []),
                                ...(t.quizzes || []),
                                ...(t.lessons || []),
                                ...(t.performanceTasks || []),
                                ...(t.materials || [])
                            ];

                            tMats.forEach(mat => {
                                if (!mat || (typeof window.isFakeSampleMaterial === 'function' && window.isFakeSampleMaterial(mat))) return;
                                const files = extractRealUploadedFile(mat, mat.category || 'Handout');
                                if (!files || files.length === 0) return;

                                files.forEach((f, fIdx) => {
                                    const fileId = String(mat.id || '') + '-' + f.fileName;
                                    if (seenIds.has(fileId)) return;
                                    seenIds.add(fileId);

                                    harvested.push({
                                        id: mat.id ? `${mat.id}-f${fIdx}` : `mat-${Date.now()}-${Math.random()}`,
                                        rawMaterialId: mat.id || '',
                                        sourceAuthorId: mat.authorId || t.authorId || '',
                                        sourceAuthorRole: 'Teacher',
                                        title: f.fileName,
                                    fileUrl: f.fileUrl,
                                        materialTitle: mat.title || t.title || 'General Material',
                                        subject: mat.subject || t.subject || 'General',
                                        subjectCode: '',
                                        type: f.fileType,
                                        category: mat.category || (f.fileType === 'video' ? 'Lecture Slides' : 'Handout'),
                                        quarter: mat.quarter || t.quarter || '1st Quarter',
                                        size: f.fileSize,
                                        date: mat.createdAt ? new Date(mat.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'Recent',
                                        schoolYear: mat.schoolYear || t.schoolYear || '2026-2027',
                                        author: mat.authorName || mat.author || 'Instructor',
                                        sharedWithStudents: mat.sharedWithStudents !== false,
                                        downloads: mat.downloads || 0,
                                        description: mat.title ? `${mat.title} (${t.title || 'Topic'})` : `${f.fileName}`
                                    });
                                });
                            });
                        });
                    } catch (_) {}
                }
            }
        } catch (_) {}

        // 4. Harvest Student Uploaded Files & Work Submissions
        try {
            // Check master submissions bucket: sigma_student_assessment_submissions
            const subBuckets = ['sigma_student_assessment_submissions'];
            subBuckets.forEach(bKey => {
                try {
                    const raw = localStorage.getItem(bKey);
                    if (!raw) return;
                    const bucket = JSON.parse(raw);
                    if (typeof bucket !== 'object' || !bucket) return;

                    Object.keys(bucket).forEach(studentIdOrKey => {
                        const studentRecord = bucket[studentIdOrKey];
                        if (!studentRecord || typeof studentRecord !== 'object') return;

                        // Each student entry contains submissions keyed by assessment or topic
                        Object.keys(studentRecord).forEach(subKey => {
                            const sub = studentRecord[subKey];
                            if (!sub || typeof sub !== 'object') return;

                            // Extract real uploaded student files
                            const studentFiles = [];

                            // Check single file properties
                            if (sub.fileName && /\.(pdf|docx?|pptx?|mp4|mov|zip|rar)$/i.test(sub.fileName.trim())) {
                                studentFiles.push({
                                    name: sub.fileName.trim(),
                                    fileUrl: sub.fileUrl || sub.dataUrl || sub.url,
                                    size: sub.fileSize || '1.8 MB'
                                });
                            }

                            // Check file lists / attachments
                            const candidateArrays = [sub.files, sub.attachments, sub.fileList];
                            candidateArrays.forEach(arr => {
                                if (Array.isArray(arr)) {
                                    arr.forEach(fileItem => {
                                        if (!fileItem) return;
                                        const fn = String(fileItem.name || fileItem.fileName || fileItem.title || '').trim();
                                        if (fn && /\.(pdf|docx?|pptx?|mp4|mov|zip|rar)$/i.test(fn)) {
                                            studentFiles.push({
                                                name: fn,
                                                fileUrl: fileItem.fileUrl || fileItem.dataUrl || fileItem.url,
                                                size: fileItem.size ? (typeof fileItem.size === 'number' ? (fileItem.size / (1024 * 1024)).toFixed(1) + ' MB' : String(fileItem.size)) : (sub.fileSize || '1.8 MB')
                                            });
                                        }
                                    });
                                }
                            });

                            // Check attempts for file uploads
                            if (Array.isArray(sub.attempts)) {
                                sub.attempts.forEach(att => {
                                    if (!att || typeof att !== 'object') return;
                                    if (att.fileName && /\.(pdf|docx?|pptx?|mp4|mov|zip|rar)$/i.test(att.fileName.trim())) {
                                        studentFiles.push({
                                            name: att.fileName.trim(),
                                            fileUrl: att.fileUrl || att.dataUrl || att.url,
                                            size: att.fileSize || sub.fileSize || '1.8 MB'
                                        });
                                    }
                                    if (Array.isArray(att.files)) {
                                        att.files.forEach(af => {
                                            if (!af) return;
                                            const fn = String(af.name || af.fileName || '').trim();
                                            if (fn && /\.(pdf|docx?|pptx?|mp4|mov|zip|rar)$/i.test(fn)) {
                                                studentFiles.push({
                                                    name: fn,
                                                    fileUrl: af.fileUrl || af.dataUrl || af.url,
                                                    size: af.size ? (typeof af.size === 'number' ? (af.size / (1024 * 1024)).toFixed(1) + ' MB' : String(af.size)) : '1.8 MB'
                                                });
                                            }
                                        });
                                    }
                                });
                            }

                            if (studentFiles.length === 0) return;

                            const author = sub.studentName || sub.name || sub.author || studentIdOrKey;
                            const subject = sub.subjectName || sub.subject || sub.subjectId || 'Coursework';
                            const quarter = sub.quarter ? (typeof sub.quarter === 'number' ? `${sub.quarter} Quarter` : String(sub.quarter)) : '1st Quarter';
                            const date = sub.submittedAt || sub.gradedAt || sub.createdAt || sub.timestamp;
                            const displayDate = date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'Recent';

                            studentFiles.forEach((f, fIdx) => {
                                const fileId = `sub-${studentIdOrKey}-${subKey}-${f.name}`;
                                if (seenIds.has(fileId)) return;
                                seenIds.add(fileId);

                                const extMatch = f.name.match(/\.(pdf|docx?|pptx?|mp4|mov|zip|rar)$/i);
                                const extLower = extMatch ? extMatch[1].toLowerCase() : 'pdf';
                                let normType = 'pdf';
                                if (extLower.startsWith('ppt')) normType = 'pptx';
                                else if (extLower.startsWith('doc')) normType = 'docx';
                                else if (extLower === 'mp4' || extLower === 'mov') normType = 'video';
                                else if (extLower === 'zip' || extLower === 'rar') normType = 'zip';

                                harvested.push({
                                    id: `sub-${studentIdOrKey}-${subKey}-${fIdx}`,
                                    isStudentSubmission: true,
                                    studentId: sub.studentId || sub.studentUid || studentIdOrKey,
                                    title: f.name,
                                    fileUrl: f.fileUrl,
                                    materialTitle: sub.title || sub.taskTitle || sub.assignmentTitle || sub.activityTitle || subject || 'Coursework Task',
                                    subject: subject,
                                    subjectCode: '',
                                    type: normType,
                                    category: sub.category || 'Handout',
                                    quarter: quarter,
                                    size: f.size,
                                    date: displayDate,
                                    schoolYear: sub.schoolYear || '2026-2027',
                                    author: author,
                                    sharedWithStudents: true,
                                    downloads: 0,
                                    description: sub.title ? `Student submission: ${sub.title}` : `Submitted coursework file`
                                });
                            });
                        });
                    });
                } catch (_) {}
            });

            // Also check individual sigma_submission_* and sigma_sub_* keys
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (!k) continue;
                if ((k.startsWith('sigma_submission_') || k.startsWith('sigma_sub_')) && k !== 'sigma_submission_replies') {
                    try {
                        const raw = localStorage.getItem(k);
                        if (!raw) continue;
                        const sub = JSON.parse(raw);
                        if (!sub || typeof sub !== 'object') continue;

                        const fn = String(sub.fileName || (Array.isArray(sub.files) && sub.files[0] ? (sub.files[0].name || sub.files[0].fileName) : '') || '').trim();
                        if (fn && /\.(pdf|docx?|pptx?|mp4|mov|zip|rar)$/i.test(fn)) {
                            const fileId = `indiv-${k}-${fn}`;
                            if (seenIds.has(fileId)) continue;
                            seenIds.add(fileId);

                            const extMatch = fn.match(/\.(pdf|docx?|pptx?|mp4|mov|zip|rar)$/i);
                            const extLower = extMatch ? extMatch[1].toLowerCase() : 'pdf';
                            let normType = 'pdf';
                            if (extLower.startsWith('ppt')) normType = 'pptx';
                            else if (extLower.startsWith('doc')) normType = 'docx';
                            else if (extLower === 'mp4' || extLower === 'mov') normType = 'video';
                            else if (extLower === 'zip' || extLower === 'rar') normType = 'zip';

                            const author = sub.studentName || sub.authorName || sub.author || 'Student';
                            harvested.push({
                                id: `indiv-${k}`,
                                isStudentSubmission: true,
                                studentId: sub.studentId || sub.studentUid || sub.userId || '',
                                title: fn,
                                fileUrl: sub.fileUrl || sub.dataUrl || sub.url,
                                materialTitle: sub.title || sub.taskTitle || sub.assignmentTitle || 'Coursework Task',
                                subject: sub.subject || sub.subjectName || 'Coursework',
                                subjectCode: '',
                                type: normType,
                                category: sub.category || 'Handout',
                                quarter: sub.quarter || '1st Quarter',
                                size: sub.fileSize || '1.8 MB',
                                date: sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'Recent',
                                schoolYear: sub.schoolYear || '2026-2027',
                                author: author,
                                sharedWithStudents: true,
                                downloads: 0,
                                description: sub.title ? `Student submission: ${sub.title}` : `Submitted coursework file`
                            });
                        }
                    } catch (_) {}
                }
            }
        } catch (_) {}

        // 5. Harvest Quiz Storage (Exempt from School Year archive; saved continuously as PDF)
        try {
            const quizKeys = [
                'sigma_quiz_storage',
                'sigma-quiz-storage-library',
                'quizLibrary',
                'sigma_quizzes_data',
                'sigma_quizzes',
                'quizzes',
                'sigma_teacher_quizzes'
            ];

            quizKeys.forEach(qKey => {
                try {
                    const raw = localStorage.getItem(qKey);
                    if (!raw) return;
                    const list = JSON.parse(raw);
                    if (!Array.isArray(list)) return;

                    list.forEach(q => {
                        if (!q || !q.title) return;
                        if (String(q.id || '').startsWith('quiz-seed-')) return;

                        // Ensure title has .pdf
                        let title = String(q.title).trim();
                        if (!/\.pdf$/i.test(title)) {
                            title = `${title}.pdf`;
                        }

                        const fileId = `quiz-${q.id || title}`;
                        if (seenIds.has(fileId)) return;
                        seenIds.add(fileId);

                        const qCount = Array.isArray(q.questions) ? q.questions.length : (q.questionsCount || 0);
                        const estSize = `${Math.max(120, (qCount * 45) + 80)} KB`;
                        const author = q.authorName || q.author || q.createdBy || admin.name;
                        const subject = q.subject || q.subjectName || 'General';

                        harvested.push({
                            id: `quiz-storage-${q.id || Date.now()}`,
                            title: title,
                            materialTitle: q.title || 'Online Assessment',
                            subject: subject,
                            subjectCode: q.subjectCode || '',
                            type: 'pdf',
                            category: 'Handout',
                            quarter: 'All Quarters', // Perpetual, never bound to a specific school year / not archived
                            schoolYear: 'Perpetual',
                            isPerpetual: true,
                            size: estSize,
                            date: q.updatedAt || q.createdAt ? new Date(q.updatedAt || q.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'Recent',
                            author: author,
                            sharedWithStudents: true,
                            downloads: 0,
                            description: `Quiz Assessment (${qCount} Questions) - Perpetual Storage`
                        });
                    });
                } catch (_) {}
            });
        } catch (_) {}

        return harvested;
    }

    function getStoredResources() {
        let userUploads = [];
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    // Filter out the old hardcoded fake seeds and any non-file entries
                    userUploads = parsed.filter(item => {
                        const id = String(item.id || '');
                        if (id.startsWith('res-') && parseInt(id.replace('res-', ''), 10) <= 100) return false;
                        const title = String(item.title || item.fileName || '').trim();
                        return /\.(pdf|docx?|pptx?|mp4|mov|zip|rar)$/i.test(title);
                    });
                }
            }
        } catch (_) {}

        // Combine direct uploads with real uploaded materials from Add/Edit Topics & Materials
        const realSubjectMats = getRealSubjectMaterials();
        const combined = [...userUploads];
        realSubjectMats.forEach(mat => {
            if (!combined.some(c => c.id === mat.id || (c.title === mat.title && c.subject === mat.subject))) {
                combined.push(mat);
            }
        });

        // Normalize all author names to strictly "First Name Last Name"
        combined.forEach(item => {
            if (item) {
                item.author = formatFirstLastName(item.author || item.uploadedBy || 'Instructor');
            }
        });

        const viewer = resourceViewer();
        if (ownUploadsOnly) return combined.filter(item => resourceIsOwned(item,viewer.user) && (!viewer.student || resourceIsSubmission(item)));
        if (viewer.student) return combined.filter(item => resourceIsSubmission(item)
            ? studentSubmissionsOnly && resourceIsOwned(item,viewer.user)
            : !studentSubmissionsOnly && item.sharedWithStudents !== false && resourceInViewerClass(item,viewer));
        if (viewer.teacher) return combined.filter(item => !resourceIsSubmission(item) && (resourceIsOwned(item,viewer.user) || resourceInViewerClass(item,viewer)));
        return combined;
    }

    function saveResources(list) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        } catch (_) {}
    }

    // --- SCHOOL YEAR & ARCHIVE RESOLUTION UTILITIES ---
    function getAvailableSchoolYears() {
        const yearsMap = new Map();

        // 1. Check canonical helper getActiveSchoolYearRecord
        let activeRecord = null;
        try {
            if (typeof window.getActiveSchoolYearRecord === 'function') {
                activeRecord = window.getActiveSchoolYearRecord();
            }
        } catch (_) {}

        const activeStart = activeRecord ? (Number(activeRecord.yearStart) || 2026) : 2026;

        // 2. Load stored school year records
        try {
            const raw = localStorage.getItem('sigma_school_year_records') || localStorage.getItem('sigma-school-years');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    parsed.forEach(r => {
                        if (!r || r.isDeleted) return;
                        const yStart = Number(r.yearStart) || (r.name ? Number(String(r.name).match(/\d{4}/)?.[0]) : null);
                        const yEnd = Number(r.yearEnd) || (yStart ? yStart + 1 : null);
                        const sy = (yStart && yEnd) ? `${yStart}-${yEnd}` : (r.name || r.id);
                        if (sy) {
                            const isAct = r.status === 'Active' || (activeRecord && (activeRecord.id === r.id || String(activeRecord.yearStart) === String(r.yearStart)));
                            const rawStatus = String(r.status || '').trim();
                            // Only past years or explicitly archived statuses are Archived
                            const isExplicitArchived = rawStatus.toLowerCase().includes('archive') || rawStatus.toLowerCase().includes('complete');
                            const isPastYear = yStart && yStart < activeStart;
                            const isArchived = !isAct && (isExplicitArchived || isPastYear);
                            // Future years (e.g. 2027-2028) are Upcoming / Inactive (not yet active)
                            const isUpcoming = !isAct && !isArchived;

                            yearsMap.set(String(sy), {
                                sy: String(sy),
                                label: `S.Y. ${sy}`,
                                status: isAct ? 'Active' : (isArchived ? 'Archived' : 'Inactive'),
                                isArchived: isArchived,
                                isUpcoming: isUpcoming,
                                yearStart: yStart || activeStart
                            });
                        }
                    });
                }
            }
        } catch (_) {}

        // 3. Load historical archives from sigma_sy_archives
        try {
            const rawArc = localStorage.getItem('sigma_sy_archives');
            if (rawArc) {
                const archives = JSON.parse(rawArc);
                if (Array.isArray(archives)) {
                    archives.forEach(arc => {
                        if (!arc) return;
                        const sy = (arc.yearStart && arc.yearEnd) ? `${arc.yearStart}-${arc.yearEnd}` : arc.syId;
                        if (sy && !yearsMap.has(String(sy))) {
                            yearsMap.set(String(sy), {
                                sy: String(sy),
                                label: `S.Y. ${sy}`,
                                status: 'Archived',
                                isArchived: true,
                                isUpcoming: false,
                                yearStart: Number(arc.yearStart) || 2025
                            });
                        }
                    });
                }
            }
        } catch (_) {}

        // 4. Default fallbacks if empty
        if (!yearsMap.has('2026-2027')) {
            yearsMap.set('2026-2027', {
                sy: '2026-2027',
                label: 'S.Y. 2026-2027',
                status: 'Active',
                isArchived: false,
                isUpcoming: false,
                yearStart: 2026
            });
        }

        return Array.from(yearsMap.values()).sort((a, b) => {
            if (a.status === 'Active') return -1;
            if (b.status === 'Active') return 1;
            return (b.yearStart || 0) - (a.yearStart || 0);
        });
    }

    function isSchoolYearArchived(sy) {
        if (!sy || sy === 'all') return false;
        if (sy === 'archive' || sy === 'archived') return true;
        const years = getAvailableSchoolYears();
        const found = years.find(y => y.sy === sy || y.label === sy);
        return found ? found.isArchived : (sy !== '2026-2027' && sy !== '2027-2028');
    }

    function getSelectedSchoolYearLabel() {
        if (_activeSchoolYearFilter === 'all') return 'All School Years';
        if (_activeSchoolYearFilter === 'archive') return 'All Archived Years';
        const years = getAvailableSchoolYears();
        const found = years.find(y => y.sy === _activeSchoolYearFilter);
        return found ? found.label : `S.Y. ${_activeSchoolYearFilter}`;
    }

    function buildSchoolYearSelectorHtml() {
        const years = getAvailableSchoolYears();
        const activeYear = years.find(year => year.status === 'Active') || { sy: '2026-2027', label: 'S.Y. 2026-2027' };
        _activeSchoolYearFilter = activeYear.sy;
        return `
            <div class="relative shrink-0" id="resource-sy-selector-wrap">
                <button type="button" id="btn-resource-sy-toggle" class="sigma-btn sigma-btn-white sigma-btn-md gap-2.5 shrink-0" aria-expanded="false" aria-controls="resource-sy-dropdown" aria-haspopup="true" title="Active School Year">
                    <i class="fa-solid fa-calendar-check text-[#15803d] text-xs" aria-hidden="true"></i>
                    <span id="resource-sy-current-label" class="text-xs font-semibold text-black">${escapeHtml(activeYear.label)}</span>
                    <i class="fa-solid fa-chevron-down resource-sy-chevron" aria-hidden="true"></i>
                </button>
                <div id="resource-sy-dropdown" class="hidden absolute right-0 top-full mt-1.5 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 font-['Inter']">
                    <div class="px-3.5 py-1.5 border-b border-slate-100 text-xs font-bold text-black">Active School Year</div>
                    <button type="button" class="btn-select-sy w-full text-left px-3.5 py-2 text-xs flex items-center gap-2.5 cursor-pointer" data-sy="${escapeHtml(activeYear.sy)}" aria-pressed="true">
                        <i class="fa-solid fa-calendar-check text-[#15803d]" aria-hidden="true"></i>
                        <span>${escapeHtml(activeYear.label)}</span>
                        <span class="ml-auto text-[#15803d]">Active</span>
                    </button>
                </div>
            </div>
        `;
    }

    function bindSchoolYearDropdownEvents(section) {
        const toggleBtn = section.querySelector('#btn-resource-sy-toggle');
        const dropdown = section.querySelector('#resource-sy-dropdown');
        if (!toggleBtn || !dropdown) return;
        const setOpen = open => {
            dropdown.classList.toggle('hidden', !open);
            toggleBtn.setAttribute('aria-expanded', String(open));
            if (open) {
                const rect = toggleBtn.getBoundingClientRect();
                if (window.innerWidth <= 768 || rect.left < 200) {
                    dropdown.style.left = '0';
                    dropdown.style.right = 'auto';
                } else {
                    dropdown.style.left = 'auto';
                    dropdown.style.right = '0';
                }
                const typeDropdown = section.querySelector('#resource-type-dropdown');
                const typeToggleBtn = section.querySelector('#btn-resource-type-toggle');
                if (typeDropdown) typeDropdown.classList.add('hidden');
                if (typeToggleBtn) typeToggleBtn.setAttribute('aria-expanded', 'false');
            }
        };

        toggleBtn.onclick = (e) => {
            e.stopPropagation();
            const isHidden = dropdown.classList.contains('hidden');
            setOpen(isHidden);
        };

        dropdown.querySelectorAll('.btn-select-sy').forEach(btn => {
            btn.setAttribute('aria-pressed', String(btn.dataset.sy === _activeSchoolYearFilter));
            btn.onclick = (e) => {
                e.stopPropagation();
                setOpen(false);
                const sy = btn.dataset.sy;
                if (sy && sy !== _activeSchoolYearFilter) {
                    _activeSchoolYearFilter = sy;
                    _currentPage = 1;
                    updateResourcesContentOnly(section);
                }
            };
        });

        const handleOutsideClick = (e) => {
            if (!section.querySelector('#resource-sy-selector-wrap')?.contains(e.target)) {
                setOpen(false);
            }
        };
        if (section._syOutsideClickHandler) {
            document.removeEventListener('click', section._syOutsideClickHandler);
        }
        section._syOutsideClickHandler = handleOutsideClick;
        document.addEventListener('click', handleOutsideClick);
        toggleBtn.onkeydown = dropdown.onkeydown = e => {
            if (e.key === 'Escape') { setOpen(false); toggleBtn.focus(); }
        };
    }

    function getFileTypeDetails(type) {
        const t = String(type || '').toLowerCase();
        if (t.includes('pdf')) {
            return {
                label: 'PDF',
                iconClass: 'fa-solid fa-file-pdf text-red-500',
                badgeClass: 'bg-red-50 border-red-200/70 text-red-700'
            };
        }
        if (t.includes('ppt') || t.includes('slide')) {
            return {
                label: 'PPTX',
                iconClass: 'fa-solid fa-file-powerpoint text-orange-600',
                badgeClass: 'bg-orange-50 border-orange-200/70 text-orange-700'
            };
        }
        if (t.includes('zip') || t.includes('code') || t.includes('rar') || t.includes('7z') || t.includes('tar')) {
            return {
                label: 'ZIP',
                iconClass: 'fa-solid fa-file-zipper text-amber-600',
                badgeClass: 'bg-amber-50 border-amber-200/70 text-amber-700'
            };
        }
        if (t.includes('video') || t.includes('mp4') || t.includes('mov') || t.includes('webm')) {
            return {
                label: 'VIDEO',
                iconClass: 'fa-solid fa-file-video text-rose-600',
                badgeClass: 'bg-rose-50 border-rose-200/70 text-rose-700'
            };
        }
        if (t.includes('xls') || t.includes('csv')) {
            return {
                label: 'XLSX',
                iconClass: 'fa-solid fa-file-excel text-emerald-600',
                badgeClass: 'bg-emerald-50 border-emerald-200/70 text-[#15803d]'
            };
        }
        if (t.includes('png') || t.includes('jpg') || t.includes('jpeg') || t.includes('gif') || t.includes('svg')) {
            return {
                label: 'IMG',
                iconClass: 'fa-solid fa-file-image text-purple-600',
                badgeClass: 'bg-purple-50 border-purple-200/70 text-purple-700'
            };
        }
        return {
            label: 'DOCX',
            iconClass: 'fa-solid fa-file-word text-blue-600',
            badgeClass: 'bg-blue-50 border-blue-200/70 text-blue-700'
        };
    }

    function filterResourcesList(allResources) {
        const qLower = _searchQuery.toLowerCase().trim();
        const hideAuthorCol = _activeAuthorFilter && isCurrentAdmin(_activeAuthorFilter);

        return allResources.filter(r => {
            // 1. Author Filter
            if (_activeAuthorFilter) {
                if (hideAuthorCol) {
                    if (!resourceIsOwned(r,resourceViewer().user)) return false;
                } else {
                    const rAuth = formatFirstLastName(r.author || r.uploadedBy || '').toLowerCase().trim();
                    const filterAuth = formatFirstLastName(_activeAuthorFilter).toLowerCase().trim();
                    if (rAuth !== filterAuth) return false;
                }
            }

            // 2. Category & Type Filters
            if (_activeCategoryFilter !== 'all' && String(r.category || '').toLowerCase().trim() !== String(_activeCategoryFilter).toLowerCase().trim()) return false;
            if (_activeTypeFilter !== 'all') {
                const t = String(r.type || '').toLowerCase();
                if (_activeTypeFilter === 'pdf' && !t.includes('pdf')) return false;
                if (_activeTypeFilter === 'pptx' && !t.includes('ppt')) return false;
                if (_activeTypeFilter === 'zip' && !t.includes('zip') && !t.includes('code')) return false;
                if (_activeTypeFilter === 'video' && !t.includes('video') && !t.includes('mp4')) return false;
                if (_activeTypeFilter === 'docx' && !t.includes('doc')) return false;
            }

            // 3. Search query: ONLY search resources (title, subject, description, category), NOT author names
            if (qLower) {
                const title = String(r.title || '').toLowerCase();
                const subj = String(r.subject || '').toLowerCase();
                const desc = String(r.description || '').toLowerCase();
                const cat = String(r.category || '').toLowerCase();
                if (!title.includes(qLower) && !subj.includes(qLower) && !desc.includes(qLower) && !cat.includes(qLower)) return false;
            }

            // 4. School Year & Archive Filter
            if (_activeSchoolYearFilter && _activeSchoolYearFilter !== 'all') {
                if (r.isPerpetual) {
                    // Perpetual quiz items remain accessible in active academic years
                    if (_activeSchoolYearFilter === 'archive' || isSchoolYearArchived(_activeSchoolYearFilter)) {
                        return false;
                    }
                } else {
                    const rSy = String(r.schoolYear || '2026-2027').trim();
                    if (_activeSchoolYearFilter === 'archive') {
                        if (!isSchoolYearArchived(rSy) && !r.isArchived) return false;
                    } else {
                        if (rSy !== _activeSchoolYearFilter) return false;
                    }
                }
            }

            return true;
        });
    }

    function buildContentHtml(filtered) {
        if (!resourceViewer().student && !ownUploadsOnly && !_activeAuthorFilter && !_searchQuery.trim()) {
            return `
                <div class="resources-empty-card bg-white rounded-3xl border border-slate-200/80 p-8 sm:p-12 text-center shadow-sm" role="status">
                    <div class="flex flex-col items-center justify-center gap-3">
                        <i class="fa-solid fa-magnifying-glass text-4xl sm:text-5xl" style="color:rgba(0,0,0,0.35)" aria-hidden="true"></i>
                        <h3 class="text-sm sm:text-base font-bold text-black font-['Inter']">Search Resources</h3>
                        <p class="text-xs sm:text-sm max-w-sm mx-auto leading-relaxed font-['Inter']" style="color:rgba(0,0,0,0.55)">
                            Enter a file name, material, subject, or uploader in the search bar, then press Enter or click Search to see results.
                        </p>
                    </div>
                </div>`;
        }
        const hideAuthorCol = ownUploadsOnly || !!_activeAuthorFilter;
        const isArchiveActive = _activeSchoolYearFilter === 'archive' || isSchoolYearArchived(_activeSchoolYearFilter);
        const syNotice = isArchiveActive ? `
            <div class="mb-4 px-4 py-3 bg-amber-50/80 border border-amber-200/90 rounded-2xl flex items-center justify-between text-xs text-amber-900 font-['Inter'] shadow-xs">
                <div class="flex items-center gap-2.5">
                    <div class="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                        <i class="fa-solid fa-box-archive text-xs"></i>
                    </div>
                    <div>
                        <span class="font-bold">Archived Academic Session</span>
                        <span class="text-amber-800 ml-1">— Showing preserved educational resources for <strong>${escapeHtml(getSelectedSchoolYearLabel())}</strong>.</span>
                    </div>
                </div>
                <button type="button" class="btn-reset-sy font-semibold text-amber-800 hover:text-amber-950 underline cursor-pointer ml-3 shrink-0">Return to Active S.Y.</button>
            </div>
        ` : '';

        const viewMode = getEffectiveViewMode();

        if (filtered.length === 0) {
            if (viewMode === 'table') {
                return `
                    ${syNotice}
                    <div class="w-full overflow-visible">
                        <table class="w-full border-collapse table-fixed">
                            <colgroup>
                                <col style="width: 4%;">  <!-- No. -->
                                <col style="${hideAuthorCol ? 'width: 25%;' : 'width: 22%;'}"> <!-- Name -->
                                <col style="${hideAuthorCol ? 'width: 28%;' : 'width: 20%;'}"> <!-- Material -->
                                ${hideAuthorCol ? '' : '<col style="width: 14%;">' /* Author */}
                                <col style="${hideAuthorCol ? 'width: 20%;' : 'width: 17%;'}"> <!-- Assigned Subject -->
                                <col style="${hideAuthorCol ? 'width: 11%;' : 'width: 11%;'}"> <!-- Category -->
                                <col style="width: 6%;">  <!-- Type -->
                                <col style="width: 6%;">  <!-- Action -->
                            </colgroup>
                            <thead class="sticky top-0 bg-[#15803d] z-10 border-b border-[#137638]">
                                <tr>
                                    <th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter'] border-r border-[#137638]">No.</th>
                                    <th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter'] border-r border-[#137638]">Name</th>
                                    <th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter'] border-r border-[#137638]">Material</th>
                                    ${hideAuthorCol ? '' : `<th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-sans border-r border-[#137638]">Author</th>`}
                                    <th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter'] border-r border-[#137638]">Assigned Subject</th>
                                    <th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter'] border-r border-[#137638]">Category</th>
                                    <th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter'] border-r border-[#137638]">Type</th>
                                    <th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter']">Action</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100">
                                <tr id="resource-empty-state" class="bg-white">
                                    <td colspan="${hideAuthorCol ? '7' : '8'}" class="py-28 text-center">
                                        <div class="flex flex-col items-center justify-center space-y-3">
                                            <i class="fa-solid fa-folder-open text-6xl text-black-fade" style="color: rgba(0, 0, 0, 0.35) !important;"></i>
                                            <p class="text-base font-bold text-black font-['Inter']">No Matching Resources Found</p>
                                            <p class="text-xs text-black-fade font-['Inter']" style="color: rgba(0, 0, 0, 0.45) !important;">Try adjusting your search keywords or filter settings.</p>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                `;
            }

            return `
                ${syNotice}
                <!-- Empty State -->
                <div class="resources-empty-card bg-white rounded-3xl border border-slate-200/80 p-10 sm:p-16 text-center shadow-sm">
                    <div class="flex flex-col items-center justify-center space-y-3 mb-6">
                        <i class="fa-solid fa-folder-open text-5xl sm:text-6xl text-black-fade" style="color: rgba(0, 0, 0, 0.35) !important;"></i>
                        <h3 class="text-sm sm:text-base font-bold text-black font-['Inter']">No Matching Resources</h3>
                        <p class="text-[11px] sm:text-xs text-black-fade max-w-sm mx-auto font-['Inter'] leading-relaxed" style="color: rgba(0, 0, 0, 0.45) !important;">
                            No learning materials found matching your search. Clear your search or manage resources to upload new content.
                        </p>
                    </div>
                    <div class="inline-flex items-center gap-2.5 sm:gap-3 flex-wrap justify-center">
                        <button type="button" id="btn-reset-filters" class="sigma-btn sigma-btn-white sigma-btn-md gap-2">
                            Reset Filters
                        </button>
                        <button type="button" onclick="document.getElementById('btn-open-upload')?.click()" class="sigma-btn sigma-btn-primary sigma-btn-md gap-2.5">
                            <i class="fa-solid fa-plus text-xs"></i>
                            <span>My Uploads</span>
                        </button>
                    </div>
                </div>
            `;
        }

        // Pagination calculation
        const pageSize = viewMode === 'grid' ? 12 : 20;
        const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
        if (_currentPage > totalPages) _currentPage = totalPages;
        if (_currentPage < 1) _currentPage = 1;
        const startIndex = (_currentPage - 1) * pageSize;
        const pagedItems = filtered.slice(startIndex, startIndex + pageSize);

        // Build Pagination HTML (Exact style as sigma-log-pagination)
        let paginationHtml = '';
        if (totalPages > 1) {
            const countFrom = startIndex + 1;
            const countTo = Math.min(_currentPage * pageSize, filtered.length);
            const countText = `${countFrom}-${countTo} of ${filtered.length}`;

            // Calculate page numbers with ellipsis
            const spread = (typeof window !== 'undefined' && window.innerWidth <= 600) ? 1 : 2;
            const numbers = [...new Set([1, ...Array.from({ length: spread * 2 + 1 }, (_, index) => _currentPage - spread + index).filter(n => n >= 1 && n <= totalPages), totalPages])].sort((a, b) => a - b);

            let buttonsHtml = `
                <button type="button" class="sigma-pagination-btn sigma-pagination-btn--nav btn-resource-page" data-page="${_currentPage - 1}" aria-label="Previous page" title="Previous page" ${_currentPage <= 1 ? 'disabled' : ''}>
                    <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
                </button>
            `;

            numbers.forEach((num, idx) => {
                if (idx > 0 && num > numbers[idx - 1] + 1) {
                    buttonsHtml += `<span class="sigma-pagination-ellipsis">...</span>`;
                }
                const isActive = num === _currentPage;
                buttonsHtml += `
                    <button type="button" class="sigma-pagination-btn sigma-pagination-btn--number btn-resource-page ${isActive ? 'is-active' : ''}" data-page="${num}" aria-label="Page ${num}" title="Page ${num}" ${isActive ? 'aria-current="page"' : ''}>
                        ${num}
                    </button>
                `;
            });

            buttonsHtml += `
                <button type="button" class="sigma-pagination-btn sigma-pagination-btn--nav btn-resource-page" data-page="${_currentPage + 1}" aria-label="Next page" title="Next page" ${_currentPage >= totalPages ? 'disabled' : ''}>
                    <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
                </button>
            `;

            paginationHtml = `
                <nav class="sigma-log-pagination" aria-label="Resources pagination">
                    <span class="sigma-log-page-count text-black-fade">${countText}</span>
                    <div class="sigma-log-page-controls">
                        ${buttonsHtml}
                    </div>
                </nav>
            `;
        }

        if (viewMode === 'grid') {
            return `
                ${syNotice}
                <div class="resources-card-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    ${pagedItems.map(item => {
                        const meta = getFileTypeDetails(item.type);
                        const authorAvatar = resolveAuthorAvatar(item.author || item.uploadedBy);
                        const authorName = item.author || item.uploadedBy || 'Instructor';
                        const materialName = item.materialTitle || item.description || item.subject || 'General Material';
                        const fileSize = item.size || 'N/A';
                        const fileDate = item.date || 'Recent';

                        return `
                        <div class="resource-card-item bg-white hover:bg-slate-50/50 rounded-2xl p-4 sm:p-5 border border-slate-200/80 hover:border-emerald-500/60 hover:shadow-sm transition-all flex flex-col justify-between font-['Inter'] group select-none">
                            <div>
                                <!-- Top: Icon + Title + Size -->
                                <div class="resource-card-top flex items-start gap-3.5 mb-3.5">
                                    <!-- Exact File Type Icon Box from Attached File Panels -->
                                    <div class="resource-card-icon-box w-11 h-11 rounded-2xl bg-white border border-slate-200/80 flex items-center justify-center shrink-0 shadow-2xs">
                                        <i class="${meta.iconClass} text-xl"></i>
                                    </div>
                                    <!-- Title & Size (Equal Row with Icon) -->
                                    <div class="min-w-0 flex-1 pt-0.5">
                                        <button type="button" class="resource-card-title-btn text-left p-0 border-0 bg-transparent cursor-pointer block max-w-full group/title" onclick="window.openResourceFile('${item.id}', event)" title="Open ${escapeHtml(item.title)}">
                                            <h4 class="resource-card-title text-sm font-bold text-black transition-colors line-clamp-1 leading-snug font-['Inter'] cursor-pointer no-underline" title="${escapeHtml(item.title)}">
                                                ${escapeHtml(item.title)}
                                            </h4>
                                        </button>
                                        <div class="resource-card-size text-xs text-black-fade font-['Inter'] mt-0.5 leading-none" style="color: rgba(0, 0, 0, 0.45) !important;">
                                            ${escapeHtml(fileSize)}
                                        </div>
                                    </div>
                                </div>

                                <!-- Material / Location Subtitle (Black Fade) -->
                                <div class="resource-card-subtitle text-[12px] text-black-fade font-['Inter'] line-clamp-2 leading-relaxed mb-4 pl-0.5" style="color: rgba(0, 0, 0, 0.45) !important;" title="${escapeHtml(materialName)} (${escapeHtml(item.subject)})">
                                    ${escapeHtml(materialName)}
                                </div>
                            </div>

                            <!-- Bottom Footer: Clickable Author Profile + Action Buttons -->
                            <div class="resource-card-footer pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 gap-2">
                                <!-- Author info: Avatar & Name are clickable to filter by author; Date is plain text (not clickable) -->
                                <div class="flex items-center gap-2.5 min-w-0" ${ownUploadsOnly ? 'hidden style="display:none"' : ''}>
                                    <button type="button" class="btn-filter-author resource-card-author-btn flex items-center shrink-0 border-0 p-0 bg-transparent cursor-pointer" data-author="${escapeHtml(authorName)}" title="See all files uploaded by ${escapeHtml(authorName)}">
                                        ${authorAvatar ? `
                                            <img src="${escapeHtml(authorAvatar)}" alt="${escapeHtml(authorName)}" class="resource-card-avatar w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0 select-none" onerror="this.outerHTML='<div class=\\'resource-card-avatar w-7 h-7 rounded-full bg-[#e2e8f0] flex items-center justify-center shrink-0 border border-slate-200/70 select-none overflow-hidden\\'><i class=\\'fa-solid fa-user text-[11px] text-[#94a3b8]\\'></i></div>'">
                                        ` : `
                                            <div class="resource-card-avatar w-7 h-7 rounded-full bg-[#e2e8f0] flex items-center justify-center shrink-0 border border-slate-200/70 select-none overflow-hidden">
                                                <i class="fa-solid fa-user text-[11px] text-[#94a3b8]"></i>
                                            </div>
                                        `}
                                    </button>
                                    <div class="flex flex-col min-w-0 text-left">
                                        <button type="button" class="btn-filter-author resource-card-author-btn text-left p-0 border-0 bg-transparent cursor-pointer min-w-0 block" data-author="${escapeHtml(authorName)}" title="See all files uploaded by ${escapeHtml(authorName)}">
                                            <span class="resource-card-author-name text-[12px] font-semibold text-black transition-colors truncate font-['Inter'] leading-tight block no-underline cursor-pointer">
                                                ${escapeHtml(authorName)}
                                            </span>
                                        </button>
                                        <span class="resource-card-date text-[10px] text-black-fade font-['Inter'] leading-tight select-none pointer-events-none" style="color: rgba(0, 0, 0, 0.45) !important;">
                                            ${escapeHtml(fileDate)}
                                        </span>
                                    </div>
                                </div>
                                
                                <!-- Action Buttons: Download + Upload (No Delete) -->
                                <div class="resource-card-actions flex items-center gap-1.5 shrink-0 ml-auto">
                                    <!-- Download Button -->
                                    <button type="button" onclick="window.downloadResourceItem('${item.id}', event)" class="resource-card-action-btn w-8 h-8 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 hover:border-slate-300 flex items-center justify-center transition-colors text-black cursor-pointer shadow-2xs" title="Download ${escapeHtml(item.title)}">
                                        <i class="fa-solid fa-cloud-arrow-down text-xs" style="color: #000000 !important;"></i>
                                    </button>
                                    <!-- Upload / Replace Button -->
                                    ${resourceCanUpload(item) ? `<button type="button" onclick="window.openAdminResourceModal('${item.id}', event)" class="resource-card-action-btn w-8 h-8 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 hover:border-slate-300 flex items-center justify-center transition-colors text-black cursor-pointer shadow-2xs" title="Upload / Replace ${escapeHtml(item.title)}">
                                        <i class="fa-solid fa-cloud-arrow-up text-xs" style="color: #000000 !important;"></i>
                                    </button>` : ''}
                                </div>
                            </div>
                        </div>
                        `;
                    }).join('')}
                </div>
                ${paginationHtml}
            `;
        }

        // Table View (Matches User Accounts table structure and styling)
        return `
            ${syNotice}
            <div class="w-full overflow-visible">
                <table class="w-full border-collapse table-fixed">
                    <colgroup>
                        <col style="width: 4%;">  <!-- No. -->
                        <col style="${hideAuthorCol ? 'width: 25%;' : 'width: 22%;'}"> <!-- Name -->
                        <col style="${hideAuthorCol ? 'width: 28%;' : 'width: 20%;'}"> <!-- Material -->
                        ${hideAuthorCol ? '' : '<col style="width: 14%;">' /* Author */}
                        <col style="${hideAuthorCol ? 'width: 20%;' : 'width: 17%;'}"> <!-- Assigned Subject -->
                        <col style="${hideAuthorCol ? 'width: 11%;' : 'width: 11%;'}"> <!-- Category -->
                        <col style="width: 6%;">  <!-- Type -->
                        <col style="width: 6%;">  <!-- Action -->
                    </colgroup>
                    <thead class="sticky top-0 bg-[#15803d] z-10 border-b border-[#137638]">
                        <tr>
                            <th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter'] border-r border-[#137638]">No.</th>
                            <th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter'] border-r border-[#137638]">Name</th>
                            <th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter'] border-r border-[#137638]">Material</th>
                            ${hideAuthorCol ? '' : `<th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-sans border-r border-[#137638]">Author</th>`}
                            <th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter'] border-r border-[#137638]">Assigned Subject</th>
                            <th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter'] border-r border-[#137638]">Category</th>
                            <th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter'] border-r border-[#137638]">Type</th>
                            <th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter']">Action</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        ${pagedItems.map((item, rowIdx) => {
                            const meta = getFileTypeDetails(item.type);
                            const rowStripe = rowIdx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white';
                            const displayNo = startIndex + rowIdx + 1;
                            const materialName = item.materialTitle || item.description || item.subject || 'General Material';
                            return `
                            <tr class="transition-colors ${rowStripe} hover:bg-slate-50/80">
                                <td class="px-4 py-4 text-center" style="border-right: 1px solid rgba(0, 0, 0, 0.08) !important;">
                                    <div class="text-[13px] font-normal text-black text-center tracking-wide font-['Inter']" style="color: #000000 !important;">${displayNo}</div>
                                </td>
                                <td class="px-4 py-3.5 text-left" style="border-right: 1px solid rgba(0, 0, 0, 0.08) !important;">
                                    <div class="min-w-0 text-left">
                                        <button type="button" class="resource-file-title-btn text-left p-0 border-0 bg-transparent cursor-pointer block max-w-full group" onclick="window.openResourceFile('${item.id}', event)" title="Open ${escapeHtml(item.title)}">
                                            <span class="text-[13px] font-normal text-black truncate font-['Inter'] leading-snug text-left block max-w-full group-hover:underline cursor-pointer">
                                                ${escapeHtml(item.title)}
                                            </span>
                                        </button>
                                        <div class="text-[11px] text-black-fade font-['Inter'] mt-0.5 leading-none" style="color: rgba(0, 0, 0, 0.45) !important;">
                                            ${escapeHtml(item.size || 'N/A')}
                                        </div>
                                    </div>
                                </td>
                                <td class="px-4 py-3.5 text-left" style="border-right: 1px solid rgba(0, 0, 0, 0.08) !important;">
                                    <div class="text-[13px] font-normal text-black truncate font-['Inter'] leading-snug text-left block max-w-full" title="${escapeHtml(materialName)}">
                                        ${escapeHtml(materialName)}
                                    </div>
                                </td>
                                ${hideAuthorCol ? '' : `
                                <td class="px-4 py-3.5 text-left" style="border-right: 1px solid rgba(0, 0, 0, 0.08) !important;">
                                    <button type="button" class="btn-filter-author flex items-center justify-start gap-2.5 text-left group cursor-pointer max-w-full" data-author="${escapeHtml(item.author || item.uploadedBy || 'Prof. Carlos Santos')}" title="See all files uploaded by ${escapeHtml(item.author || item.uploadedBy || 'Prof. Carlos Santos')}">
                                        ${(() => {
                                            const aName = item.author || item.uploadedBy || 'Prof. Carlos Santos';
                                            const aPhoto = resolveAuthorAvatar(aName) || (typeof window.resolveUserAvatar === 'function' ? window.resolveUserAvatar(aName) : '');
                                            return aPhoto
                                                ? `<img src="${escapeHtml(aPhoto)}" alt="${escapeHtml(aName)}" class="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0 select-none" onerror="this.outerHTML='<div class=\\'w-8 h-8 rounded-full bg-[#e2e8f0] flex items-center justify-center shrink-0 border border-slate-200/70 select-none overflow-hidden\\'><i class=\\'fa-solid fa-user text-xs text-[#94a3b8]\\'></i></div>'">`
                                                : `<div class="w-8 h-8 rounded-full bg-[#e2e8f0] flex items-center justify-center shrink-0 border border-slate-200/70 select-none overflow-hidden"><i class="fa-solid fa-user text-xs text-[#94a3b8]"></i></div>`;
                                        })()}
                                        <span class="author-name-text text-[13px] font-normal text-black font-['Inter'] leading-snug truncate text-left" style="text-underline-offset: 3px;">
                                            ${escapeHtml(item.author || item.uploadedBy || 'Prof. Carlos Santos')}
                                        </span>
                                    </button>
                                </td>
                                `}
                                <td class="px-4 py-3.5 text-center" style="border-right: 1px solid rgba(0, 0, 0, 0.08) !important;">
                                    <div class="text-[13px] font-normal text-black text-center font-['Inter']">${escapeHtml(item.subject)}</div>
                                </td>
                                <td class="px-4 py-3.5 text-center">
                                    <div class="text-[13px] font-normal text-black text-center font-['Inter']">${escapeHtml(item.category || 'Handout')}</div>
                                </td>
                                <td class="px-4 py-4 text-center">
                                    <div class="text-[13px] font-medium text-black text-center font-['Inter'] uppercase tracking-wider">${meta.label}</div>
                                </td>
                                <td class="px-4 py-4 text-center">
                                    <div class="flex justify-center">
                                        <div class="action-dropdown-container">
                                            <button onclick="window.toggleResourceActionDropdown('${item.id}', event)" 
                                                id="res-dots-btn-${item.id}"
                                                class="action-dots-btn cursor-pointer" 
                                                title="Actions">
                                                <i class="fa-solid fa-ellipsis"></i>
                                            </button>
                                            <div id="res-action-menu-${item.id}" class="action-dropdown-menu">
                                                <button onclick="window.downloadResourceItem('${item.id}', event)" class="action-dropdown-item">
                                                    <i class="fa-solid fa-cloud-arrow-down" style="color: #000000 !important; font-size: 13px; width: 16px; text-align: center;"></i>
                                                    <span style="color: #000000 !important;">Download</span>
                                                </button>
                                                ${resourceCanUpload(item) ? `<button onclick="window.openAdminResourceModal('${item.id}', event)" class="action-dropdown-item">
                                                    <i class="fa-solid fa-cloud-arrow-up" style="color: #000000 !important; font-size: 13px; width: 16px; text-align: center;"></i>
                                                    <span style="color: #000000 !important;">Upload / Replace</span>
                                                </button>` : ''}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
                ${paginationHtml}
            </div>
        `;

    }

    function getSearchMatches(allResources) {
        if (!_searchQuery.trim()) return [];
        const qLower = _searchQuery.toLowerCase().trim();
        const hideAuthorCol = _activeAuthorFilter && isCurrentAdmin(_activeAuthorFilter);

        return allResources.filter(r => {
            if (_activeAuthorFilter) {
                if (hideAuthorCol) {
                    if (!resourceIsOwned(r,resourceViewer().user)) return false;
                } else {
                    const rAuth = formatFirstLastName(r.author || r.uploadedBy || '').toLowerCase().trim();
                    const filterAuth = formatFirstLastName(_activeAuthorFilter).toLowerCase().trim();
                    if (rAuth !== filterAuth) return false;
                }
            }
            if (_activeTypeFilter !== 'all') {
                const t = String(r.type || '').toLowerCase();
                if (_activeTypeFilter === 'pdf' && !t.includes('pdf')) return false;
                if (_activeTypeFilter === 'pptx' && !t.includes('ppt')) return false;
                if (_activeTypeFilter === 'zip' && !t.includes('zip') && !t.includes('code')) return false;
                if (_activeTypeFilter === 'video' && !t.includes('video') && !t.includes('mp4')) return false;
                if (_activeTypeFilter === 'docx' && !t.includes('doc')) return false;
            }
            if (_activeSchoolYearFilter && _activeSchoolYearFilter !== 'all') {
                if (r.isPerpetual) {
                    if (_activeSchoolYearFilter === 'archive' || isSchoolYearArchived(_activeSchoolYearFilter)) return false;
                } else {
                    const rSy = String(r.schoolYear || '2026-2027').trim();
                    if (_activeSchoolYearFilter === 'archive') {
                        if (!isSchoolYearArchived(rSy) && !r.isArchived) return false;
                    } else {
                        if (rSy !== _activeSchoolYearFilter) return false;
                    }
                }
            }

            const title = String(r.title || '').toLowerCase();
            const subj = String(r.subject || '').toLowerCase();
            const desc = String(r.description || '').toLowerCase();
            const cat = String(r.category || '').toLowerCase();
            return (title.includes(qLower) || subj.includes(qLower) || desc.includes(qLower) || cat.includes(qLower));
        });
    }

    function buildCategoryPillsHtml(allResources) {
        if (!resourceViewer().student && !ownUploadsOnly && !_searchQuery.trim()) return '';
        // If in author/manage view, do not show main category pills row
        if (_activeAuthorFilter) {
            return '';
        }

        // Count categories across all accessible resources (or filtered by search if search is active)
        const targetList = _searchQuery.trim() ? getSearchMatches(allResources) : allResources;

        const categoriesMap = new Map();
        targetList.forEach(r => {
            const rawCat = String(r.category || '').trim();
            if (rawCat) {
                // Capitalize first letter cleanly
                const cat = rawCat.charAt(0).toUpperCase() + rawCat.slice(1);
                categoriesMap.set(cat, (categoriesMap.get(cat) || 0) + 1);
            }
        });

        // Only show pills for categories that have at least 1 file/resource
        const activeCategories = Array.from(categoriesMap.entries())
            .filter(([_, count]) => count > 0)
            .sort((a, b) => b[1] - a[1]); // Order by count descending

        return `
            <div id="resources-pills-row" class="resources-pills-bar flex items-center justify-between gap-2.5 sm:gap-3 bg-white p-2.5 sm:p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
                <!-- Category Pills -->
                <div class="resources-pills-list flex items-center gap-1.5 sm:gap-2 overflow-x-auto max-w-full">
                    <button type="button" class="category-filter-btn px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 ${_activeCategoryFilter === 'all' ? 'bg-[#15803d] text-white hover:bg-[#166534] shadow-xs' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'}" data-category="all">
                        All
                    </button>
                    ${activeCategories.map(([cat]) => `
                        <button type="button" class="category-filter-btn px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${String(_activeCategoryFilter).toLowerCase() === String(cat).toLowerCase() ? 'bg-[#15803d] text-white hover:bg-[#166534] shadow-xs' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'}" data-category="${escapeHtml(cat)}">
                            ${escapeHtml(cat)}
                        </button>
                    `).join('')}
                </div>

                <!-- Secondary Filter: Type (Only shows types present in resources) -->
                ${(() => {
                    const typeDefinitions = [
                        { key: 'pdf', label: 'PDF Documents', shortLabel: 'PDF', test: t => t.includes('pdf') },
                        { key: 'docx', label: 'Word Documents', shortLabel: 'DOCX', test: t => t.includes('doc') },
                        { key: 'pptx', label: 'Slide Decks (PPTX)', shortLabel: 'PPTX', test: t => t.includes('ppt') },
                        { key: 'video', label: 'Video / Media', shortLabel: 'Video', test: t => t.includes('video') || t.includes('mp4') },
                        { key: 'zip', label: 'Code / Lab ZIP', shortLabel: 'ZIP', test: t => t.includes('zip') || t.includes('code') || t.includes('rar') }
                    ];

                    const availableTypes = typeDefinitions.filter(def => {
                        return targetList.some(r => def.test(String(r.type || '').toLowerCase()));
                    });

                    // If active type is no longer in available types, fall back to 'all'
                    if (_activeTypeFilter !== 'all' && !availableTypes.some(t => t.key === _activeTypeFilter)) {
                        _activeTypeFilter = 'all';
                    }

                    const activeDef = availableTypes.find(t => t.key === _activeTypeFilter);
                    const currentTypeLabel = activeDef ? activeDef.label : 'All Types';

                    return `
                        <div class="relative flex items-center shrink-0 ml-auto" id="resource-type-selector-wrap">
                            <button type="button" id="btn-resource-type-toggle" class="resources-type-filter-btn sigma-btn sigma-btn-white sigma-btn-md gap-2.5 shrink-0" aria-expanded="false" aria-controls="resource-type-dropdown" aria-haspopup="true" title="Filter by file type">
                                <span id="resource-type-current-label" class="text-xs font-semibold text-black truncate">${escapeHtml(currentTypeLabel)}</span>
                                <i class="fa-solid fa-chevron-down resource-type-chevron" aria-hidden="true"></i>
                            </button>
                            <div id="resource-type-dropdown" class="hidden absolute right-0 top-full mt-1.5 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 font-['Inter']">
                                <button type="button" class="btn-select-resource-type w-full text-left px-3.5 py-2 text-xs flex items-center gap-2.5 cursor-pointer" data-type="all" aria-pressed="${_activeTypeFilter === 'all' ? 'true' : 'false'}">
                                    <span>All Types</span>
                                </button>
                                ${availableTypes.map(def => {
                                    const isSelected = _activeTypeFilter === def.key;
                                    return `
                                        <button type="button" class="btn-select-resource-type w-full text-left px-3.5 py-2 text-xs flex items-center gap-2.5 cursor-pointer" data-type="${def.key}" aria-pressed="${isSelected ? 'true' : 'false'}">
                                            <span>${escapeHtml(def.label)}</span>
                                        </button>
                                    `;
                                }).join('')}
                            </div>
                            <select id="type-filter-select" aria-label="Filter by type" class="sr-only hidden" tabindex="-1">
                                <option value="all" ${_activeTypeFilter === 'all' ? 'selected' : ''}>All Types</option>
                                ${availableTypes.map(def => `<option value="${def.key}" ${_activeTypeFilter === def.key ? 'selected' : ''}>${def.label}</option>`).join('')}
                            </select>
                        </div>
                    `;
                })()}
            </div>
        `;
    }

    function bindPillEvents(section) {
        section.querySelectorAll('.category-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                _activeCategoryFilter = btn.dataset.category || 'all';
                _currentPage = 1;
                updateResourcesContentOnly(section);
            });
        });

        const typeToggleBtn = section.querySelector('#btn-resource-type-toggle');
        const typeDropdown = section.querySelector('#resource-type-dropdown');
        const typeSelect = section.querySelector('#type-filter-select');

        if (typeToggleBtn && typeDropdown) {
            const setTypeOpen = (open) => {
                typeDropdown.classList.toggle('hidden', !open);
                typeToggleBtn.setAttribute('aria-expanded', String(open));
                if (open) {
                    const syDropdown = section.querySelector('#resource-sy-dropdown');
                    const syToggleBtn = section.querySelector('#btn-resource-sy-toggle');
                    if (syDropdown) syDropdown.classList.add('hidden');
                    if (syToggleBtn) syToggleBtn.setAttribute('aria-expanded', 'false');
                }
            };

            typeToggleBtn.onclick = (e) => {
                e.stopPropagation();
                const isHidden = typeDropdown.classList.contains('hidden');
                setTypeOpen(isHidden);
            };

            typeDropdown.querySelectorAll('.btn-select-resource-type').forEach(btn => {
                btn.setAttribute('aria-pressed', String((btn.dataset.type || 'all') === _activeTypeFilter));
                btn.onclick = (e) => {
                    e.stopPropagation();
                    setTypeOpen(false);
                    const chosenType = btn.dataset.type || 'all';
                    if (chosenType !== _activeTypeFilter) {
                        _activeTypeFilter = chosenType;
                        if (typeSelect) typeSelect.value = chosenType;
                        _currentPage = 1;
                        updateResourcesContentOnly(section);
                    }
                };
            });

            const handleTypeOutsideClick = (e) => {
                if (!section.querySelector('#resource-type-selector-wrap')?.contains(e.target)) {
                    setTypeOpen(false);
                }
            };
            if (section._typeOutsideClickHandler) {
                document.removeEventListener('click', section._typeOutsideClickHandler);
            }
            section._typeOutsideClickHandler = handleTypeOutsideClick;
            document.addEventListener('click', handleTypeOutsideClick);
            typeToggleBtn.onkeydown = typeDropdown.onkeydown = e => {
                if (e.key === 'Escape') { setTypeOpen(false); typeToggleBtn.focus(); }
            };
        }

        typeSelect?.addEventListener('change', (e) => {
            _activeTypeFilter = e.target.value;
            _currentPage = 1;
            updateResourcesContentOnly(section);
        });
    }

    function updateResourcesContentOnly(section) {
        const contentContainer = section.querySelector('#resources-content-area');
        const pillsArea = section.querySelector('#resources-pills-area');
        if (!contentContainer) {
            renderResourcesView();
            return;
        }

        const allResources = getStoredResources();

        if (pillsArea) {
            const pillsHtml = buildCategoryPillsHtml(allResources);
            pillsArea.innerHTML = pillsHtml;
            pillsArea.style.display = pillsHtml.trim() ? '' : 'none';
            if (pillsHtml.trim()) {
                bindPillEvents(section);
            }
        }

        const filtered = filterResourcesList(allResources);
        contentContainer.innerHTML = buildContentHtml(filtered);

        // Update active class on view toggles
        const gridBtn = section.querySelector('#btn-view-grid');
        const tableBtn = section.querySelector('#btn-view-table');
        if (gridBtn && tableBtn) {
            gridBtn.classList.toggle('is-active', _currentViewMode === 'grid');
            tableBtn.classList.toggle('is-active', _currentViewMode === 'table');
        }

        // Update School Year Archive Selector UI
        const syWrap = section.querySelector('#resource-sy-selector-wrap');
        if (syWrap) {
            syWrap.outerHTML = buildSchoolYearSelectorHtml();
            bindSchoolYearDropdownEvents(section);
        }
    }

    function renderResourcesView() {
        const section = document.getElementById('resources-view');
        if (!section) return;
        if (resourceViewer().student) {
            ownUploadsOnly = true;
            studentSubmissionsOnly = true;
            _activeAuthorFilter = null;
            window.setPortalHeader?.('Resources', 'My Uploads');
        }

        section.removeAttribute('data-sigma-skeleton-active');
        if (typeof window.SigmaPageLoading?.hideContentSkeleton === 'function') {
            window.SigmaPageLoading.hideContentSkeleton(section);
        }
        section.querySelectorAll('.sigma-content-skeleton').forEach(el => el.remove());

        const allResources = getStoredResources();
        const searchMatches = getSearchMatches(allResources);
        const filtered = filterResourcesList(allResources);
        const isAuthorView = !!_activeAuthorFilter || ownUploadsOnly;
        const currentAdmin = getCurrentAdminUser();

        section.innerHTML = `
        <style>
            /* Table view: underline on hover */
            #btn-back-to-all .resources-back-mobile { display: none; }
            @media (max-width: 768px) {
                #btn-back-to-all .resources-back-desktop { display: none; }
                #btn-back-to-all .resources-back-mobile { display: inline-block; }
            }
            table .resource-file-title-btn:hover span,
            table .resource-file-title-btn:focus-visible span,
            table .btn-filter-author:hover span,
            table .btn-filter-author:hover .author-name-text {
                text-decoration: underline !important;
                text-underline-offset: 3px !important;
                cursor: pointer !important;
            }
            /* Card shelf view: yellow text on hover, strictly NO underline */
            .resource-card-title-btn:hover h4,
            .resource-card-author-btn:hover .resource-card-author-name {
                color: #eab308 !important; /* Yellow text */
                text-decoration: none !important;
                cursor: pointer !important;
            }
            .resource-card-title-btn:hover,
            .resource-card-author-btn:hover {
                text-decoration: none !important;
            }
            .resource-card-title-btn h4,
            .resource-card-author-btn .resource-card-author-name {
                text-decoration: none !important;
            }
            .action-dropdown-item {
                color: #000000 !important;
                display: flex !important;
                align-items: center !important;
                gap: 10px !important;
                padding: 9px 14px !important;
                border-radius: 10px !important;
                font-size: 13px !important;
                font-weight: 500 !important;
                transition: background-color 0.15s ease !important;
                cursor: pointer !important;
                width: 100% !important;
                background: transparent !important;
                border: none !important;
            }
            .action-dropdown-item i {
                color: #000000 !important;
                font-size: 13px !important;
                width: 16px !important;
                text-align: center !important;
            }
            .action-dropdown-item span {
                color: #000000 !important;
                font-size: 13px !important;
                font-weight: 500 !important;
            }
            .action-dropdown-item:hover {
                background-color: #f1f5f9 !important;
            }
            .action-dropdown-item:hover i,
            .action-dropdown-item:hover span {
                color: #000000 !important;
            }

            /* Page Shell Vertical Panel Gaps (Desktop + Mobile) */
            #resources-view .resources-page-shell {
                display: flex !important;
                flex-direction: column !important;
                gap: 18px !important;
            }
            #resources-view .resources-page-shell > * {
                margin-top: 0 !important;
                margin-bottom: 0 !important;
            }
            #resources-view #resources-pills-area:empty {
                display: none !important;
            }

            /* Toolbar, Pills, Dropdowns & Pagination Alignment (Desktop + Mobile) */
            #resources-view .resources-header-toolbar {
                display: flex !important;
                align-items: center !important;
                justify-content: space-between !important;
                gap: 12px !important;
                flex-wrap: nowrap !important;
                width: 100% !important;
            }
            #resources-view .resources-toolbar-actions {
                display: flex !important;
                align-items: center !important;
                gap: 10px !important;
                flex-shrink: 0 !important;
            }
            #resources-view .resources-search-box {
                height: 42px !important;
                min-height: 42px !important;
                display: flex !important;
                align-items: center !important;
                border-radius: 14px !important;
            }
            #resources-view .resources-view-toggle-group {
                height: 42px !important;
                align-items: center !important;
            }
            #resources-view #btn-resource-sy-toggle,
            #resources-view #btn-open-upload {
                height: 42px !important;
                min-height: 42px !important;
                border-radius: 14px !important;
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
            }

            /* Pills Bar & Type Dropdown Alignment (Copied from School Year Dropdown) */
            #resources-view #resources-pills-row {
                display: flex !important;
                align-items: center !important;
                justify-content: space-between !important;
                flex-wrap: nowrap !important;
                gap: 12px !important;
            }
            #resources-view .resources-pills-list {
                display: flex !important;
                align-items: center !important;
                gap: 8px !important;
                overflow-x: auto !important;
                scrollbar-width: none !important;
                -ms-overflow-style: none !important;
                padding-bottom: 0 !important;
                margin-bottom: 0 !important;
                flex: 1 1 auto !important;
                min-width: 0 !important;
            }
            #resources-view .resources-pills-list::-webkit-scrollbar {
                display: none !important;
            }
            #resources-view .category-filter-btn,
            #resources-view #btn-resource-type-toggle {
                height: 34px !important;
                min-height: 34px !important;
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                line-height: 1 !important;
                border-radius: 11px !important;
            }
            #resources-view #btn-resource-type-toggle {
                min-width: 118px !important;
                padding: 0 12px !important;
                background-color: #ffffff !important;
                border: 1.5px solid #e2e8f0 !important;
                color: #000000 !important;
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) !important;
                transition: all 0.2s ease !important;
            }
            #resources-view #btn-resource-type-toggle:is(:hover, :focus-visible, [aria-expanded="true"]) {
                background-color: #e2e8f0 !important;
                border-color: #e2e8f0 !important;
                color: #000000 !important;
            }
            #resources-view #btn-resource-type-toggle .resource-type-chevron {
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                width: 12px !important;
                height: 12px !important;
                flex: 0 0 12px !important;
                margin-left: 2px !important;
                font-size: 10px !important;
                line-height: 1 !important;
                color: #000000 !important;
                transition: transform 0.15s ease !important;
            }
            #resources-view #btn-resource-type-toggle[aria-expanded="true"] .resource-type-chevron {
                transform: rotate(180deg) !important;
            }
            #resources-view #resource-type-dropdown .btn-select-resource-type {
                background: #ffffff !important;
                color: #000000 !important;
                font-weight: 500 !important;
            }
            #resources-view #resource-type-dropdown .btn-select-resource-type:is(:hover, :focus-visible) {
                background: #f1f5f9 !important;
                color: #000000 !important;
            }
            #resources-view #resource-type-dropdown .btn-select-resource-type[aria-pressed="true"],
            #resources-view #resource-type-dropdown .btn-select-resource-type[aria-pressed="true"]:hover {
                background: #dcfce7 !important;
                color: #000000 !important;
                font-weight: 500 !important;
            }

            /* Pagination Bar - Desktop & Mobile Unified Alignment (Both Student & Teacher) */
            #resources-view .sigma-log-pagination {
                display: flex !important;
                flex-direction: row !important;
                align-items: center !important;
                justify-content: space-between !important;
                flex-wrap: nowrap !important;
                gap: 12px !important;
                margin-top: 20px !important;
                padding: 12px 4px 4px !important;
                border-top: 1px solid rgba(226, 232, 240, 0.85) !important;
                width: 100% !important;
            }
            #resources-view .sigma-log-page-count {
                display: inline-flex !important;
                align-items: center !important;
                width: auto !important;
                font-size: 12px !important;
                font-weight: 500 !important;
                line-height: 1 !important;
                color: rgba(0, 0, 0, 0.45) !important;
                white-space: nowrap !important;
                margin: 0 !important;
            }
            #resources-view .sigma-log-page-controls {
                display: inline-flex !important;
                align-items: center !important;
                justify-content: flex-end !important;
                gap: 6px !important;
                flex-wrap: nowrap !important;
                margin-left: auto !important;
            }
            #resources-view .sigma-pagination-btn {
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                font-family: 'Inter', sans-serif !important;
                font-size: 12px !important;
                font-weight: 600 !important;
                line-height: 1 !important;
                cursor: pointer !important;
                transition: all 0.16s ease !important;
                user-select: none !important;
            }
            #resources-view .sigma-pagination-btn--nav {
                width: 34px !important;
                height: 34px !important;
                min-width: 34px !important;
                border-radius: 9999px !important;
                border: 1px solid #e2e8f0 !important;
                background: #ffffff !important;
                color: #0f172a !important;
                padding: 0 !important;
            }
            #resources-view .sigma-pagination-btn--nav:hover:not(:disabled) {
                background: #f1f5f9 !important;
                border-color: #cbd5e1 !important;
            }
            #resources-view .sigma-pagination-btn--nav:disabled {
                opacity: 0.45 !important;
                cursor: not-allowed !important;
            }
            #resources-view .sigma-pagination-btn--number {
                width: 34px !important;
                min-width: 34px !important;
                height: 34px !important;
                padding: 0 !important;
                border-radius: 9999px !important;
                border: 1px solid #e2e8f0 !important;
                background: #ffffff !important;
                color: #0f172a !important;
            }
            #resources-view .sigma-pagination-btn--number:hover:not(.is-active) {
                background: #f1f5f9 !important;
                border-color: #cbd5e1 !important;
                color: #0f172a !important;
                border-radius: 9999px !important;
            }
            #resources-view .sigma-pagination-btn--number.is-active {
                background: #15803d !important;
                border-color: #15803d !important;
                color: #ffffff !important;
                font-weight: 700 !important;
                border-radius: 9999px !important;
                box-shadow: 0 1px 2px rgba(21, 128, 61, 0.18) !important;
            }
            #resources-view .sigma-pagination-ellipsis {
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                min-width: 20px !important;
                font-size: 12px !important;
                color: #94a3b8 !important;
            }

            /* Mobile View (<= 768px): Hide Toggle, Force Card View, Fix Panel Gaps, Put Dropdown Above Pills & Prevent Squeezing */
            @media (max-width: 768px) {
                #resources-view .resources-view-toggle-group {
                    display: none !important;
                }
                #resources-view .resources-page-shell {
                    display: flex !important;
                    flex-direction: column !important;
                    gap: 12px !important;
                    padding: 12px 12px 24px !important;
                }
                #resources-view .resources-header-toolbar {
                    flex-direction: column !important;
                    align-items: stretch !important;
                    gap: 10px !important;
                    padding: 12px !important;
                    border-radius: 16px !important;
                }
                #resources-view .resources-search-box {
                    width: 100% !important;
                    max-width: 100% !important;
                    height: 36px !important;
                    min-height: 36px !important;
                    border-radius: 10px !important;
                }
                #resources-view .resources-search-box input {
                    height: 36px !important;
                    min-height: 36px !important;
                    font-size: 12px !important;
                    padding: 0 36px 0 12px !important;
                    border-radius: 10px !important;
                }
                #resources-view .resources-search-btn {
                    width: 32px !important;
                    height: 32px !important;
                }
                #resources-view .resources-search-btn svg {
                    width: 14px !important;
                    height: 14px !important;
                }
                #resources-view .resources-toolbar-actions {
                    width: 100% !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: space-between !important;
                    flex-wrap: nowrap !important;
                    gap: 8px !important;
                }
                #resources-view #resource-sy-selector-wrap {
                    flex: 0 0 auto !important;
                    width: auto !important;
                }
                #resources-view #btn-resource-sy-toggle {
                    width: auto !important;
                    height: 34px !important;
                    min-height: 34px !important;
                    padding: 0 10px !important;
                    font-size: 11px !important;
                    gap: 5px !important;
                    border-radius: 10px !important;
                    white-space: nowrap !important;
                }
                #resources-view #btn-resource-sy-toggle #resource-sy-current-label {
                    font-size: 11px !important;
                    white-space: nowrap !important;
                    overflow: visible !important;
                    text-overflow: clip !important;
                }
                #resources-view #btn-open-upload {
                    flex: 1 1 auto !important;
                    width: auto !important;
                    height: 34px !important;
                    min-height: 34px !important;
                    padding: 0 10px !important;
                    font-size: 11px !important;
                    gap: 5px !important;
                    border-radius: 10px !important;
                    white-space: nowrap !important;
                }
                #resources-view #btn-open-upload i {
                    font-size: 10px !important;
                }
                #resources-view #btn-open-upload span {
                    font-size: 11px !important;
                    white-space: nowrap !important;
                }

                /* Put Type Dropdown ABOVE the Pills on Mobile & Prevent Squeezing */
                #resources-view #resources-pills-row {
                    display: flex !important;
                    flex-direction: column !important;
                    align-items: stretch !important;
                    justify-content: flex-start !important;
                    padding: 12px !important;
                    gap: 10px !important;
                    border-radius: 16px !important;
                }
                #resources-view #resource-type-selector-wrap {
                    order: -1 !important;
                    width: 100% !important;
                    margin-left: 0 !important;
                }
                #resources-view .resources-type-filter-btn {
                    width: 100% !important;
                    max-width: 100% !important;
                    height: 34px !important;
                    min-height: 34px !important;
                    padding: 0 12px !important;
                    font-size: 11.5px !important;
                    border-radius: 10px !important;
                    justify-content: space-between !important;
                    gap: 8px !important;
                }
                #resources-view #resource-sy-dropdown {
                    left: 0 !important;
                    right: auto !important;
                    max-width: calc(100vw - 24px) !important;
                    width: 256px !important;
                }
                #resources-view #resource-type-dropdown {
                    left: 0 !important;
                    right: 0 !important;
                    width: 100% !important;
                }
                #resources-view .resources-pills-list {
                    order: 1 !important;
                    width: 100% !important;
                    display: flex !important;
                    align-items: center !important;
                    flex-wrap: wrap !important;
                    gap: 6px !important;
                    overflow-x: visible !important;
                }
                #resources-view .category-filter-btn {
                    flex: 1 1 auto !important;
                    height: 30px !important;
                    min-height: 30px !important;
                    padding: 0 10px !important;
                    font-size: 11px !important;
                    border-radius: 9px !important;
                    white-space: nowrap !important;
                    text-align: center !important;
                }

                /* Scaled-down Card View on Mobile */
                #resources-view .resources-card-grid {
                    display: grid !important;
                    gap: 12px !important;
                }
                #resources-view .resource-card-item {
                    padding: 12px 14px !important;
                    border-radius: 16px !important;
                }
                #resources-view .resource-card-top {
                    gap: 10px !important;
                    margin-bottom: 8px !important;
                }
                #resources-view .resource-card-icon-box {
                    width: 36px !important;
                    height: 36px !important;
                    border-radius: 10px !important;
                }
                #resources-view .resource-card-icon-box i {
                    font-size: 15px !important;
                }
                #resources-view .resource-card-title {
                    font-size: 12.5px !important;
                    line-height: 1.3 !important;
                }
                #resources-view .resource-card-size {
                    font-size: 10.5px !important;
                    margin-top: 2px !important;
                }
                #resources-view .resource-card-subtitle {
                    font-size: 11px !important;
                    margin-bottom: 10px !important;
                    line-height: 1.4 !important;
                }
                #resources-view .resource-card-footer {
                    padding-top: 8px !important;
                }
                #resources-view .resource-card-avatar {
                    width: 24px !important;
                    height: 24px !important;
                }
                #resources-view .resource-card-author-name {
                    font-size: 11px !important;
                }
                #resources-view .resource-card-date {
                    font-size: 9.5px !important;
                }
                #resources-view .resource-card-action-btn {
                    width: 28px !important;
                    height: 28px !important;
                    border-radius: 8px !important;
                }
                #resources-view .resource-card-action-btn i {
                    font-size: 11px !important;
                }

                /* Mobile Pagination Scaling & Single-Row Alignment */
                #resources-view .sigma-log-pagination {
                    margin-top: 14px !important;
                    padding: 10px 2px 2px !important;
                    gap: 8px !important;
                }
                #resources-view .sigma-log-page-count {
                    font-size: 11px !important;
                }
                #resources-view .sigma-log-page-controls {
                    gap: 4px !important;
                }
                #resources-view .sigma-pagination-btn--nav {
                    width: 28px !important;
                    height: 28px !important;
                    min-width: 28px !important;
                    border-radius: 9999px !important;
                    font-size: 10px !important;
                }
                #resources-view .sigma-pagination-btn--number {
                    width: 28px !important;
                    min-width: 28px !important;
                    height: 28px !important;
                    padding: 0 !important;
                    font-size: 11px !important;
                    border-radius: 9999px !important;
                }
            }
        </style>
        <div class="resources-page-shell w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6 font-['Inter']">
            <!-- 1. Header Toolbar -->
            <div id="resources-toolbar" class="resources-header-toolbar">
                ${isAuthorView ? `
                    <!-- Left: Back Button + Header with Profile Icon or Big Header "My Uploads" -->
                    <div class="flex items-center gap-2.5 sm:gap-3">
                        ${!resourceViewer().student ? `<button type="button" id="btn-back-to-all" title="Back to All Resources" aria-label="Back to All Resources"
                            class="w-8 h-8 rounded-full flex items-center justify-center text-black hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer border-0 p-0 shadow-none outline-none -ml-1 shrink-0">
                            <i class="resources-back-desktop fa-solid fa-arrow-left text-sm text-black" aria-hidden="true"></i>
                            <i class="resources-back-mobile fa-solid fa-chevron-left text-sm text-black" aria-hidden="true"></i>
                        </button>` : ''}
                        ${ownUploadsOnly ? `
                            <h1 class="text-lg sm:text-2xl font-bold text-black tracking-tight font-['Inter'] leading-none">My Uploads</h1>
                        ` : `
                            ${(() => {
                                const photo = resolveAuthorAvatar(_activeAuthorFilter);
                                const displayName = formatFirstLastName(_activeAuthorFilter);
                                return photo 
                                    ? `<img src="${escapeHtml(photo)}" alt="${escapeHtml(displayName)}" class="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover border border-slate-200 shrink-0 select-none shadow-sm" onerror="this.outerHTML='<div class=\\'w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#e2e8f0] flex items-center justify-center shrink-0 border border-slate-200/70 select-none overflow-hidden\\'><i class=\\'fa-solid fa-user text-sm text-[#94a3b8]\\'></i></div>'">`
                                    : `<div class="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#e2e8f0] flex items-center justify-center shrink-0 border border-slate-200/70 select-none overflow-hidden"><i class="fa-solid fa-user text-sm text-[#94a3b8]"></i></div>`;
                            })()}
                            <h1 class="text-base sm:text-2xl font-bold text-black tracking-tight font-['Inter'] leading-none">${escapeHtml(formatFirstLastName(_activeAuthorFilter))}</h1>
                        `}
                    </div>

                    <!-- Right Controls: View Toggle + Search Bar on the Right -->
                    <div class="resources-toolbar-actions flex items-center gap-2.5 sm:gap-3 shrink-0 ml-auto">
                        <!-- View Toggle -->
                        <div class="resources-view-toggle-group inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 shrink-0">
                            <button type="button" id="btn-view-grid" title="Card Shelf View" class="resources-view-toggle-btn ${_currentViewMode === 'grid' ? 'is-active' : ''}">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
                            </button>
                            <button type="button" id="btn-view-table" title="List View" class="resources-view-toggle-btn ${_currentViewMode === 'table' ? 'is-active' : ''}">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                            </button>
                        </div>

                        <!-- School Year Archive Selector -->
                        ${buildSchoolYearSelectorHtml()}

                        <!-- Search Bar next to Toggle Buttons -->
                        <div class="resources-search-box" style="width: 320px;">
                            <input type="text" id="resource-search-input" value="${escapeHtml(_searchQuery)}" placeholder="Search resources...">
                            <button type="button" id="btn-resource-search" class="resources-search-btn" title="Search" aria-label="Search">
                                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                ` : `
                    <!-- Default Mode: Left Search Bar -->
                    <div class="resources-search-box">
                        <input type="text" id="resource-search-input" value="${escapeHtml(_searchQuery)}" placeholder="Search resources...">
                        <button type="button" id="btn-resource-search" class="resources-search-btn" title="Search" aria-label="Search">
                            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                            </svg>
                        </button>
                    </div>

                    <!-- Right Controls: View Toggle + School Year Archive Selector + Manage Resources Button -->
                    <div class="resources-toolbar-actions flex items-center gap-2.5 sm:gap-3 shrink-0">
                        <!-- View Toggle -->
                        <div class="resources-view-toggle-group inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 shrink-0">
                            <button type="button" id="btn-view-grid" title="Card Shelf View" class="resources-view-toggle-btn ${_currentViewMode === 'grid' ? 'is-active' : ''}">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
                            </button>
                            <button type="button" id="btn-view-table" title="List View" class="resources-view-toggle-btn ${_currentViewMode === 'table' ? 'is-active' : ''}">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                            </button>
                        </div>

                        <!-- School Year Archive Selector (Left side of Manage Resources) -->
                        ${buildSchoolYearSelectorHtml()}

                        <!-- Manage Resources Button -->
                        <button type="button" id="btn-resource-material-upload" class="sigma-btn sigma-btn-white sigma-btn-md gap-2.5 shrink-0" onclick="window.openAdminResourceModal(null, event)">
                            <i class="fa-solid fa-cloud-arrow-up text-xs" aria-hidden="true"></i>
                            <span>Upload</span>
                        </button>
                        <button type="button" id="btn-open-upload" class="sigma-btn sigma-btn-primary sigma-btn-md gap-2.5 sm:gap-3 shrink-0">
                            <i class="fa-solid fa-plus text-xs"></i>
                            <span>My Uploads</span>
                        </button>
                    </div>
                `}
            </div>

            <!-- 2. Category Pills Area -->
            <div id="resources-pills-area" style="${buildCategoryPillsHtml(allResources).trim() ? '' : 'display:none;'}">
                ${buildCategoryPillsHtml(allResources)}
            </div>

            <!-- 3. Resource Content Area (Fast Target Container) -->
            <div id="resources-content-area">
                ${buildContentHtml(filtered)}
            </div>
        </div>

        <!-- 5. MANAGE RESOURCES MODAL -->
        <div id="teacher-resource-upload-modal" class="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[300] hidden flex items-center justify-center p-4 font-['Inter']">
            <div class="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
                <!-- Modal Header -->
                <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <div class="flex items-center gap-2.5">
                        <div class="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                            <i class="fa-solid fa-folder-open text-xs"></i>
                        </div>
                        <div>
                            <h3 class="text-sm font-bold text-slate-900">My Uploads</h3>
                            <p class="text-[11px] text-slate-400">Admin Uploads & Institutional Files</p>
                        </div>
                    </div>
                    <button type="button" id="btn-close-upload-modal" class="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <!-- Tabs: My Uploads vs Upload New -->
                <div class="px-6 pt-3 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
                    <div class="flex items-center gap-2" id="manage-modal-tabs">
                        <button type="button" id="tab-btn-my-uploads" class="px-4 py-2 border-b-2 border-emerald-600 text-emerald-700 font-bold text-xs cursor-pointer flex items-center gap-1.5">
                            <i class="fa-solid fa-cloud-arrow-up text-xs"></i>
                            <span>My Uploaded Files (<span id="modal-my-uploads-count">0</span>)</span>
                        </button>
                        <button type="button" id="tab-btn-upload-new" class="px-4 py-2 border-b-2 border-transparent text-slate-500 hover:text-slate-700 font-semibold text-xs cursor-pointer flex items-center gap-1.5">
                            <i class="fa-solid fa-plus text-xs"></i>
                            <span>Upload New Resource</span>
                        </button>
                    </div>
                    <button type="button" id="btn-filter-table-my-uploads" class="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer flex items-center gap-1">
                        <span>Show in Table</span>
                        <i class="fa-solid fa-arrow-up-right-from-square text-[9px]"></i>
                    </button>
                </div>

                <!-- Tab 1: My Uploaded Files List -->
                <div id="modal-tab-content-uploads" class="p-6 overflow-y-auto flex-1">
                    <div id="modal-admin-files-list" class="space-y-2.5">
                        <!-- Populated dynamically -->
                    </div>
                </div>

                <!-- Tab 2: Upload Form (hidden by default) -->
                <div id="modal-tab-content-form" class="p-6 overflow-y-auto flex-1 hidden">
                    <form id="resource-upload-form" class="space-y-4">
                        <!-- Dropzone -->
                        <div id="dropzone-box" class="border-2 border-dashed border-slate-200 hover:border-emerald-600 rounded-2xl p-6 text-center bg-slate-50/50 hover:bg-emerald-50/20 transition-all cursor-pointer">
                            <svg class="w-8 h-8 text-emerald-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                            <p class="text-xs font-bold text-slate-800" id="dropzone-filename">Click to choose a file or drag here</p>
                            <p class="text-[11px] text-slate-400 mt-1">PDF, DOCX, PPTX, MP4, ZIP (Up to 100MB)</p>
                            <input type="file" id="real-file-input" aria-label="Resource file" class="hidden">
                        </div>

                        <div>
                            <label for="upload-title" class="block text-xs font-bold text-slate-700 mb-1">Resource Title *</label>
                            <input type="text" id="upload-title" required placeholder="e.g. DepEd Senior High School Curriculum Guide" class="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600 focus:bg-white">
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label for="upload-subject" class="block text-xs font-bold text-slate-700 mb-1">Assign to Subject *</label>
                                <select id="upload-subject" class="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600">
                                    <option>General Institutional</option>
                                    <option>Computer Programming 1</option>
                                    <option>Web Development</option>
                                    <option>Database Management</option>
                                </select>
                            </div>
                            <div>
                                <label for="upload-quarter" class="block text-xs font-bold text-slate-700 mb-1">Target Quarter</label>
                                <select id="upload-quarter" class="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600">
                                    <option>All Quarters</option>
                                    <option>1st Quarter</option>
                                    <option>2nd Quarter</option>
                                    <option>3rd Quarter</option>
                                    <option>4th Quarter</option>
                                </select>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label for="upload-category" class="block text-xs font-bold text-slate-700 mb-1">Material Category</label>
                                <select id="upload-category" class="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600">
                                    <option>Syllabus</option>
                                    <option selected>Handout</option>
                                    <option>Lecture Slides</option>
                                    <option>Lab Activity</option>
                                    <option>Rubrics</option>
                                </select>
                            </div>
                            <div>
                                <label for="upload-sy" class="block text-xs font-bold text-slate-700 mb-1">School Year</label>
                                <select id="upload-sy" class="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600">
                                    <option value="2026-2027" selected>S.Y. 2026-2027 (Active)</option>
                                    <option value="2025-2026">S.Y. 2025-2026 (Archived)</option>
                                </select>
                            </div>
                        </div>

                        <div class="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                            <button type="button" id="btn-cancel-upload" class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
                            <button type="submit" class="px-5 py-2 rounded-xl text-xs font-bold bg-[#15803d] hover:bg-[#166534] text-white shadow-sm flex items-center gap-1.5 cursor-pointer">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                                <span>Save & Upload</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
        `;

        // Event Bindings
        bindEvents(section);

        // Keep page strictly pinned to top on render/tab navigation
        if (typeof window.sigmaResetScrollToTop === 'function') {
            window.sigmaResetScrollToTop(section);
        } else {
            window.scrollTo(0, 0);
            if (section) section.scrollTop = 0;
            const main = document.getElementById('main-content') || document.getElementById('admin-main');
            if (main) main.scrollTop = 0;
        }
        requestAnimationFrame(() => {
            window.scrollTo(0, 0);
            if (section) section.scrollTop = 0;
            const main = document.getElementById('main-content') || document.getElementById('admin-main');
            if (main) main.scrollTop = 0;
        });
    }

    function bindEvents(section) {
        // Search Input - strictly Enter key or button click (no auto-search on input)
        const searchInput = section.querySelector('#resource-search-input');
        const searchBtn = section.querySelector('#btn-resource-search');

        const executeSearch = () => {
            _searchQuery = (searchInput?.value || '').trim();
            _currentPage = 1;
            updateResourcesContentOnly(section);
        };

        if (searchInput) {
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    executeSearch();
                }
            });
        }

        if (searchBtn) {
            searchBtn.addEventListener('click', (e) => {
                e.preventDefault();
                executeSearch();
            });
        }

        // View Mode Toggles
        section.querySelector('#btn-view-grid')?.addEventListener('click', () => {
            if (_currentViewMode === 'grid') return;
            _currentViewMode = 'grid';
            _currentPage = 1;
            try { localStorage.setItem('sigma_resources_view_mode', 'grid'); } catch (_) {}
            updateResourcesContentOnly(section);
        });
        section.querySelector('#btn-view-table')?.addEventListener('click', () => {
            if (_currentViewMode === 'table') return;
            _currentViewMode = 'table';
            _currentPage = 1;
            try { localStorage.setItem('sigma_resources_view_mode', 'table'); } catch (_) {}
            updateResourcesContentOnly(section);
        });

        // Pill and Type Filters
        bindPillEvents(section);

        // School Year & Archive Dropdown
        bindSchoolYearDropdownEvents(section);

        // Event Delegation on #resources-content-area
        const contentArea = section.querySelector('#resources-content-area');
        contentArea?.addEventListener('click', (e) => {
            const resetSyBtn = e.target.closest('.btn-reset-sy');
            if (resetSyBtn) {
                _activeSchoolYearFilter = '2026-2027';
                _currentPage = 1;
                updateResourcesContentOnly(section);
                return;
            }

            const shareBtn = e.target.closest('.btn-toggle-share');
            if (shareBtn) {
                const id = shareBtn.dataset.id;
                const list = getStoredResources();
                const item = list.find(r => r.id === id);
                if (item) {
                    item.sharedWithStudents = !item.sharedWithStudents;
                    saveResources(list);
                    updateResourcesContentOnly(section);
                    showNotification(item.sharedWithStudents ? 'Resource shared with students.' : 'Resource unshared from students.');
                }
                return;
            }

            const downloadBtn = e.target.closest('.btn-download-resource');
            if (downloadBtn) {
                const id = downloadBtn.dataset.id;
                const list = getStoredResources();
                const item = list.find(r => r.id === id);
                if (item) {
                    item.downloads = (item.downloads || 0) + 1;
                    saveResources(list);
                    showNotification(`Downloading ${item.title}...`);
                }
                return;
            }


            const authorBtn = e.target.closest('.btn-filter-author');
            if (authorBtn) {
                const author = authorBtn.dataset.author || authorBtn.textContent.trim();
                _activeAuthorFilter = author;
                _searchQuery = '';
                _activeCategoryFilter = 'all';
                _currentPage = 1;
                renderResourcesView();
                return;
            }

            const pageBtn = e.target.closest('.btn-resource-page');
            if (pageBtn && !pageBtn.disabled) {
                const targetPage = Number(pageBtn.dataset.page);
                if (targetPage && targetPage !== _currentPage) {
                    _currentPage = targetPage;
                    updateResourcesContentOnly(section);
                    // Smoothly scroll to top of resources list/grid
                    const scrollTarget = section.querySelector('#resources-content-area') || section.querySelector('table');
                    if (scrollTarget) {
                        scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                }
                return;
            }

            const resetBtn = e.target.closest('#btn-reset-filters');
            if (resetBtn) {
                _activeCategoryFilter = 'all';
                _activeTypeFilter = 'all';
                _searchQuery = '';
                _activeAuthorFilter = null;
                _activeSchoolYearFilter = '2026-2027';
                _currentPage = 1;
                renderResourcesView();
                return;
            }
        });

        // Back to All Resources Button
        section.querySelector('#btn-back-to-all')?.addEventListener('click', () => {
            ownUploadsOnly = false;
            studentSubmissionsOnly = false;
            _activeAuthorFilter = null;
            _searchQuery = '';
            _activeCategoryFilter = 'all';
            _currentPage = 1;
            renderResourcesView();
        });

        // Helper: retrieve current logged-in user
        function getCurrentAdminUser() {
            try {
                const auth = JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}');
                const prof = JSON.parse(localStorage.getItem('sigma_user_profile') || '{}');
                const name = auth.name || auth.fullName || prof.name || prof.fullName || 'Curriculum Office';
                const role = auth.role || prof.role || 'Administrator';
                return { name, role };
            } catch (_) {
                return { name: 'Curriculum Office', role: 'Administrator' };
            }
        }

        // Helper: get admin uploaded files
        function getAdminUploadedFiles() {
            const admin = getCurrentAdminUser();
            const list = getStoredResources();
            const adminNameLow = (admin.name || '').toLowerCase().trim();
            return list.filter(r => {
                const authLow = (r.author || '').toLowerCase().trim();
                return authLow === adminNameLow || 
                       authLow === 'curriculum office' || 
                       authLow.includes('curriculum') || 
                       authLow.includes('admin');
            });
        }

        // Helper: Render admin files inside the modal
        function renderAdminFilesModalList() {
            const container = section.querySelector('#modal-admin-files-list');
            const countSpan = section.querySelector('#modal-my-uploads-count');
            if (!container) return;

            const adminFiles = getAdminUploadedFiles();
            if (countSpan) countSpan.textContent = adminFiles.length;

            if (adminFiles.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-12 px-4">
                        <div class="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                            <i class="fa-solid fa-folder-open text-xl"></i>
                        </div>
                        <h4 class="text-xs font-bold text-slate-700">No uploaded files yet</h4>
                        <p class="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">You haven't uploaded any resources yet. Click "Upload New Resource" to add materials.</p>
                        <button type="button" id="btn-empty-go-upload" class="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-[#15803d] hover:bg-[#166534] text-white inline-flex items-center gap-1.5 cursor-pointer">
                            <i class="fa-solid fa-plus text-xs"></i>
                            <span>Upload Your First File</span>
                        </button>
                    </div>
                `;
                container.querySelector('#btn-empty-go-upload')?.addEventListener('click', () => {
                    switchModalTab('form');
                });
                return;
            }

            container.innerHTML = adminFiles.map(file => {
                const badge = getFileTypeDetails(file.type);
                return `
                    <div class="group flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/20 transition-all bg-white" data-file-id="${file.id}">
                        <div class="flex items-center gap-3 min-w-0 flex-1">
                            <div class="w-10 h-10 rounded-xl ${badge.bg} ${badge.text} flex items-center justify-center font-bold text-xs shrink-0">
                                ${badge.label}
                            </div>
                            <div class="min-w-0 flex-1 pr-2">
                                <h4 class="text-xs font-bold text-slate-900 truncate" title="${escapeHtml(file.title)}">${escapeHtml(file.title)}</h4>
                                <div class="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                                    <span class="font-semibold text-slate-600">${escapeHtml(file.category || 'Handout')}</span>
                                    <span>•</span>
                                    <span>${escapeHtml(file.size || '2.4 MB')}</span>
                                    <span>•</span>
                                    <span>${escapeHtml(file.date || 'Recent')}</span>
                                    <span>•</span>
                                    <span class="text-emerald-700 font-medium">${file.downloads || 0} dl</span>
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center gap-1.5 shrink-0">
                            <button type="button" class="btn-modal-dl-file p-2 rounded-xl text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer" title="Download file" data-id="${file.id}">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                            </button>
                            <button type="button" class="btn-modal-del-file p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer" title="Delete file" data-id="${file.id}">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

            // Modal actions: download & delete
            container.querySelectorAll('.btn-modal-dl-file').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const id = btn.dataset.id;
                    const list = getStoredResources();
                    const item = list.find(r => r.id === id);
                    if (item) {
                        item.downloads = (item.downloads || 0) + 1;
                        saveResources(list);
                        renderAdminFilesModalList();
                        updateResourcesContentOnly(section);
                        showNotification(`Downloading ${item.title}...`);
                    }
                });
            });

            container.querySelectorAll('.btn-modal-del-file').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const id = btn.dataset.id;
                    const list = getStoredResources();
                    const item = list.find(r => r.id === id);
                    if (!item) return;

                    if (confirm(`Are you sure you want to delete "${item.title}"?`)) {
                        const updated = list.filter(r => r.id !== id);
                        saveResources(updated);
                        renderAdminFilesModalList();
                        updateResourcesContentOnly(section);
                        showNotification(`"${item.title}" has been deleted.`);
                    }
                });
            });
        }

        // Tab switcher
        function switchModalTab(tab) {
            const tabUploads = section.querySelector('#modal-tab-content-uploads');
            const tabForm = section.querySelector('#modal-tab-content-form');
            const btnUploads = section.querySelector('#tab-btn-my-uploads');
            const btnForm = section.querySelector('#tab-btn-upload-new');

            if (tab === 'uploads') {
                tabUploads?.classList.remove('hidden');
                tabForm?.classList.add('hidden');
                btnUploads?.classList.add('border-emerald-600', 'text-emerald-700', 'font-bold');
                btnUploads?.classList.remove('border-transparent', 'text-slate-500');
                btnForm?.classList.remove('border-emerald-600', 'text-emerald-700', 'font-bold');
                btnForm?.classList.add('border-transparent', 'text-slate-500');
                renderAdminFilesModalList();
            } else {
                tabUploads?.classList.add('hidden');
                tabForm?.classList.remove('hidden');
                btnForm?.classList.add('border-emerald-600', 'text-emerald-700', 'font-bold');
                btnForm?.classList.remove('border-transparent', 'text-slate-500');
                btnUploads?.classList.remove('border-emerald-600', 'text-emerald-700', 'font-bold');
                btnUploads?.classList.add('border-transparent', 'text-slate-500');
            }
        }

        // Modal Controls & Handlers
        const uploadModal = section.querySelector('#teacher-resource-upload-modal');
        const openBtn = section.querySelector('#btn-open-upload');
        const closeBtn = section.querySelector('#btn-close-upload-modal');
        const cancelBtn = section.querySelector('#btn-cancel-upload');
        const dropzone = section.querySelector('#dropzone-box');
        const fileInput = section.querySelector('#real-file-input');
        const dropzoneLabel = section.querySelector('#dropzone-filename');
        const form = section.querySelector('#resource-upload-form');

        // Tab click bindings
        section.querySelector('#tab-btn-my-uploads')?.addEventListener('click', () => switchModalTab('uploads'));
        section.querySelector('#tab-btn-upload-new')?.addEventListener('click', () => switchModalTab('form'));

        // "Show in Table" filter button
        section.querySelector('#btn-filter-table-my-uploads')?.addEventListener('click', () => {
            const admin = getCurrentAdminUser();
            const searchInput = section.querySelector('#resource-search-input');
            if (searchInput) searchInput.value = admin.name;
            _searchQuery = admin.name;
            _activeCategoryFilter = 'all';
            _currentPage = 1;
            closeModal();
            updateResourcesContentOnly(section);
        });

        const closeModal = () => {
            uploadModal?.classList.add('hidden');
            if (form) {
                form.reset();
                form.dataset.editId = '';
            }
            if (dropzoneLabel) dropzoneLabel.textContent = 'Click to choose a file or drag here';
        };

        window.openAdminResourceModal = function(resourceId, e) {
            e?.stopPropagation(); e?.preventDefault();
            const user = JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}');
            const role = String(user.role || user.type || '').toLowerCase();
            const isTeacher = role.includes('teacher') || /teacher/.test(location.pathname);
            if (role.includes('student') || /student/.test(location.pathname)) return;
            const item = resourceId ? getStoredResources().find(r => String(r.id) === String(resourceId)) : null;
            if (resourceId && !item) { showNotification('This resource is no longer available.'); return; }
            if (item && !resourceCanUpload(item)) { showNotification('This resource is available for viewing and download only.'); return; }
            const norm = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            let subjects = [];
            for (const key of ['sigma-admin-subjects','sigma_curriculum_subjects','sigma-teacher-subjects']) {
                try { const list = JSON.parse(localStorage.getItem(key) || '[]'); if (Array.isArray(list)) subjects.push(...list); } catch (_) {}
            }
            const matches = (subject, value) => value && [subject.code,subject.id,subject.subjectCode,subject.name,subject.title,subject.subjectTitle].some(v => norm(v) === norm(value));
            const assigned = isTeacher ? (window.getTeacherAssignedSubjectsAndSections?.(window.getLoggedInTeacherUser?.() || user) || []) : [];
            let choices = isTeacher ? assigned.map(a => {
                const subject = subjects.find(s => matches(s,a.subjectId) || matches(s,a.subjectCode) || matches(s,a.subject || a.title));
                return subject ? {subject,section:a.sectionName || a.section || a.name || ''} : null;
            }).filter(Boolean) : subjects.map(subject => ({subject,section:''}));
            choices = choices.filter((choice,index,list) => list.findIndex(c => norm(c.subject.code || c.subject.id || c.subject.name) === norm(choice.subject.code || choice.subject.id || choice.subject.name) && c.section === choice.section) === index);
            if (item) choices = choices.filter(c => matches(c.subject,item.subjectCode) || matches(c.subject,item.subject));
            const open = choice => {
                const quarter = item?.quarter && window.normalizeQuarterKey?.(item.quarter);
                if (quarter) { window.currentSubjectMaterialQuarter = quarter; window.currentSubjectTopicQuarter = quarter; }
                window.openSubjectEditor?.(choice.subject.code || choice.subject.id || choice.subject.name, 3, {
                    standalone:true, focus:'content', title:'Add/Edit Topics & Materials', hideBars:true,
                    section:choice.section, selectedSection:choice.section,
                    targetMaterialId:item?.rawMaterialId || null,
                    targetMaterialTitle:item?.materialTitle || null,
                    targetMaterialMode:'view', targetMaterialScope:true,
                    targetMaterialAuthorId:item?.sourceAuthorId || '',
                    targetMaterialAuthorName:item?.author || '',
                    targetMaterialAuthorRole:item?.sourceAuthorRole || ''
                });
            };
            if (!choices.length) { showNotification(isTeacher ? 'No assigned subject matches this resource.' : 'No matching subject is available.'); return; }
            if (!item) {
                document.getElementById('resource-subject-picker')?.remove();
                const picker = document.createElement('dialog'); picker.id = 'resource-subject-picker';
                picker.setAttribute('aria-labelledby', 'resource-subject-picker-title');
                picker.style.cssText = 'width:min(560px,calc(100vw - 32px));max-height:80vh;overflow:auto;padding:24px;border:1px solid #e2e8f0;border-radius:18px;color:#000';
                const heading = document.createElement('h2'); heading.id = 'resource-subject-picker-title';
                heading.textContent = isTeacher ? 'Choose your subject and section' : 'Choose a subject';
                heading.style.cssText = 'font-size:20px;font-weight:600;margin:0 0 20px';
                const list = document.createElement('div');
                list.style.cssText = 'max-height:calc(80vh - 180px);overflow-y:auto;overscroll-behavior:contain';
                const paint = () => {
                    list.replaceChildren();
                    choices.forEach(choice => {
                        const button = document.createElement('button'); button.type = 'button'; button.className = 'sigma-btn sigma-btn-white sigma-btn-md';
                        button.style.cssText = 'width:100%;min-height:48px;margin:6px 0;padding:12px 16px;text-align:left;justify-content:flex-start;white-space:normal';
                        button.textContent = [choice.subject.name || choice.subject.title || choice.subject.code,choice.section].filter(Boolean).join(' — ');
                        button.onclick = () => { picker.close(); open(choice); }; list.append(button);
                    });
                    if (!list.children.length) { const empty = document.createElement('p'); empty.textContent = 'No matching subjects.'; list.append(empty); }
                };
                const cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'sigma-btn sigma-btn-white sigma-btn-md';
                cancel.textContent = 'Cancel'; cancel.style.marginTop = '16px'; cancel.onclick = () => picker.close();
                picker.addEventListener('close', () => picker.remove());
                picker.append(heading, list, cancel); paint(); document.body.append(picker); picker.showModal();
                return;
            }
            const activeSubject = window.currentClassroomSubject || window.originalEditingSubjectCode || window.activeSubjectId || '';
            const activeSection = window.currentClassroomSectionName || '';
            const choice = choices.find(c => matches(c.subject, activeSubject) && (!activeSection || c.section === activeSection))
                || choices.find(c => matches(c.subject, activeSubject)) || choices[0];
            open(choice);
        };
        const resourceUserRole = String(JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}').role || '').toLowerCase();
        if (resourceUserRole.includes('student') || /student/.test(location.pathname)) {
            section.querySelector('#btn-resource-material-upload')?.remove();
            section.querySelectorAll('[onclick*="openAdminResourceModal"]').forEach(button => button.remove());
            if (openBtn) openBtn.innerHTML = '<i class="fa-solid fa-folder-open text-xs" aria-hidden="true"></i><span>My Uploads</span>';
        }

        openBtn?.addEventListener('click', () => {
            ownUploadsOnly = true;
            if (resourceViewer().student) {
                studentSubmissionsOnly = true; _activeAuthorFilter = null; _searchQuery = ''; _activeCategoryFilter = 'all'; _currentPage = 1;
                renderResourcesView(); return;
            }
            _activeAuthorFilter = null;
            _searchQuery = '';
            _activeCategoryFilter = 'all';
            _currentPage = 1;
            renderResourcesView();
        });

        closeBtn?.addEventListener('click', closeModal);
        cancelBtn?.addEventListener('click', closeModal);
        uploadModal?.addEventListener('click', (e) => {
            if (e.target === uploadModal) closeModal();
        });

        dropzone?.addEventListener('click', () => fileInput?.click());
        fileInput?.addEventListener('change', () => {
            if (fileInput.files && fileInput.files[0]) {
                const f = fileInput.files[0];
                if (dropzoneLabel) dropzoneLabel.textContent = `${f.name} (${(f.size / (1024 * 1024)).toFixed(1)} MB)`;
                const titleInput = section.querySelector('#upload-title');
                if (titleInput && !titleInput.value) {
                    titleInput.value = f.name;
                }
            }
        });

        form?.addEventListener('submit', (e) => {
            e.preventDefault();
            const titleInput = section.querySelector('#upload-title');
            const subjectSelect = section.querySelector('#upload-subject');
            const quarterSelect = section.querySelector('#upload-quarter');
            const categorySelect = section.querySelector('#upload-category');
            const sySelect = section.querySelector('#upload-sy');

            if (!titleInput?.value.trim()) return;

            const filename = titleInput.value.trim();
            let ext = 'pdf';
            if (filename.toLowerCase().endsWith('.pptx') || filename.toLowerCase().endsWith('.ppt')) ext = 'pptx';
            else if (filename.toLowerCase().endsWith('.zip') || filename.toLowerCase().endsWith('.rar')) ext = 'zip';
            else if (filename.toLowerCase().endsWith('.docx') || filename.toLowerCase().endsWith('.doc')) ext = 'docx';
            else if (filename.toLowerCase().endsWith('.mp4') || filename.toLowerCase().endsWith('.mov')) ext = 'video';

            const admin = getCurrentAdminUser();
            const authorName = admin.name || 'Curriculum Office';
            const editId = form?.dataset.editId;

            const list = getStoredResources();

            if (editId) {
                // Update existing resource item
                let existing = list.find(r => String(r.id) === String(editId));
                if (!existing) {
                    const allRes = getRealSubjectMaterials();
                    const harvestedItem = allRes.find(r => String(r.id) === String(editId));
                    existing = {
                        ...(harvestedItem || {}),
                        id: editId
                    };
                    list.unshift(existing);
                }
                existing.title = filename;
                existing.materialTitle = filename;
                existing.subject = subjectSelect?.value || existing.subject || 'General Institutional';
                existing.subjectCode = (existing.subject || '').replace(/\s+/g, '').substring(0, 6).toUpperCase();
                existing.quarter = quarterSelect?.value || existing.quarter || '1st Quarter';
                existing.category = categorySelect?.value || existing.category || 'Handout';
                existing.schoolYear = sySelect?.value || existing.schoolYear || '2026-2027';

                if (fileInput?.files && fileInput.files[0]) {
                    const f = fileInput.files[0];
                    existing.size = (f.size / (1024 * 1024)).toFixed(1) + ' MB';
                    existing.type = ext;
                }

                saveResources(list);
                closeModal();
                updateResourcesContentOnly(section);
                showNotification(`"${existing.title}" updated successfully!`);
            } else {
                // Create new resource
                const newResource = {
                    id: 'res-' + Date.now(),
                    title: filename,
                    materialTitle: filename,
                    subject: subjectSelect?.value || 'General Institutional',
                    subjectCode: (subjectSelect?.value || '').replace(/\s+/g, '').substring(0, 6).toUpperCase(),
                    type: ext,
                    category: categorySelect?.value || 'Handout',
                    quarter: quarterSelect?.value || '1st Quarter',
                    schoolYear: sySelect?.value || '2026-2027',
                    size: (fileInput?.files && fileInput.files[0])
                        ? (fileInput.files[0].size / (1024 * 1024)).toFixed(1) + ' MB'
                        : (Math.random() * 8 + 1.2).toFixed(1) + ' MB',
                    date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
                    author: authorName,
                    sharedWithStudents: true,
                    downloads: 0,
                    description: `${categorySelect?.value || 'Handout'} for ${subjectSelect?.value}`
                };

                list.unshift(newResource);
                saveResources(list);
                closeModal();
                updateResourcesContentOnly(section);
                showNotification(`"${newResource.title}" uploaded successfully!`);
            }
        });
    }

    function showNotification(msg) {
        let toast = document.getElementById('sigma-resource-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'sigma-resource-toast';
            toast.className = 'fixed bottom-6 right-6 z-[999] bg-[#15803d] text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg border border-[#137638] transition-all transform duration-200 pointer-events-none opacity-0 translate-y-2';
            toast.style.backgroundColor = '#15803d';
            toast.style.borderColor = '#137638';
            toast.style.color = '#ffffff';
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.classList.remove('opacity-0', 'translate-y-2');
        toast.classList.add('opacity-100', 'translate-y-0');
        setTimeout(() => {
            toast.classList.remove('opacity-100', 'translate-y-0');
            toast.classList.add('opacity-0', 'translate-y-2');
        }, 2600);
    }

    function escapeHtml(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // =========================================================================
    // INSTITUTIONAL ACTION THREE-DOTS DROPDOWN HANDLERS (MATCHES USER ACCOUNTS)
    // =========================================================================
    window.toggleResourceActionDropdown = function(resourceId, event) {
        if (event) event.stopPropagation();

        const menuId = `res-action-menu-${resourceId}`;
        const btnId = `res-dots-btn-${resourceId}`;
        const menu = document.getElementById(menuId);
        const btn = document.getElementById(btnId);

        // Close all other dropdown menus across the page
        document.querySelectorAll('.action-dropdown-menu').forEach(m => {
            if (m.id !== menuId) {
                m.classList.remove('show');
                m.classList.remove('dropup');
            }
        });
        document.querySelectorAll('.action-dots-btn').forEach(b => {
            if (b.id !== btnId) b.classList.remove('active');
        });

        if (menu && btn) {
            const isShowing = menu.classList.contains('show');
            if (!isShowing) {
                if (typeof window.closeAllTableActionDropdowns === 'function') {
                    window.closeAllTableActionDropdowns(menu);
                }
                menu.classList.add('show');
                btn.classList.add('active');
                if (typeof window.positionActionDropdown === 'function') {
                    window.positionActionDropdown(menu, btn);
                } else {
                    menu.style.position = 'fixed';
                    menu.style.right = 'auto';
                    menu.style.bottom = 'auto';
                    menu.style.marginTop = '0';
                    menu.style.marginBottom = '0';
                    menu.style.zIndex = '9999';
                    const btnRect = btn.getBoundingClientRect();
                    const menuRect = menu.getBoundingClientRect();
                    const menuWidth = menuRect.width || menu.offsetWidth || 195;
                    const menuHeight = menuRect.height || menu.offsetHeight || 160;
                    const viewportW = window.innerWidth || document.documentElement.clientWidth;
                    const viewportH = window.innerHeight || document.documentElement.clientHeight;
                    let left = btnRect.right - menuWidth;
                    if (left < 12) left = 12;
                    if (left + menuWidth > viewportW - 12) left = Math.max(12, viewportW - menuWidth - 12);
                    const spaceBelow = viewportH - btnRect.bottom;
                    const spaceAbove = btnRect.top;
                    let top;
                    if (spaceBelow < menuHeight + 16 && spaceAbove > spaceBelow) {
                        top = Math.max(12, btnRect.top - menuHeight - 6);
                        menu.classList.add('dropup');
                    } else {
                        top = Math.min(viewportH - menuHeight - 12, btnRect.bottom + 6);
                        menu.classList.remove('dropup');
                    }
                    menu.style.left = Math.round(left) + 'px';
                    menu.style.top = Math.round(top) + 'px';
                }
            } else {
                menu.classList.remove('show', 'dropup');
                window.resetActionDropdownPosition?.(menu);
                btn.classList.remove('active');
            }
        }
    };

    window.toggleResourceShare = function(resourceId, event) {
        if (event) event.stopPropagation();
        document.querySelectorAll('.action-dropdown-menu').forEach(m => {
            m.classList.remove('show');
            m.classList.remove('dropup');
        });
        document.querySelectorAll('.action-dots-btn').forEach(b => b.classList.remove('active'));

        const list = getStoredResources();
        const item = list.find(r => r.id === resourceId);
        if (item) {
            item.sharedWithStudents = !item.sharedWithStudents;
            saveResources(list);
            const section = document.getElementById('resources-view');
            if (section) updateResourcesContentOnly(section);
            showNotification(item.sharedWithStudents ? `"${item.title}" shared with students.` : `"${item.title}" unshared from students.`);
        }
    };

    window.openResourceFile = async function(resourceId, event) {
        event?.stopPropagation();
        const item = getStoredResources().find(row => String(row.id) === String(resourceId));
        if (!item) return;
        const extension = String(item.title || '').split('.').pop().toLowerCase();
        if (isMobileResourcesViewport() && extension !== 'pdf') return window.downloadResourceItem(resourceId,event);
        if (typeof window.openDocumentViewer === 'function') return window.openDocumentViewer(item.title,item.fileUrl || item.dataUrl || item.url || '',extension);
        showNotification('File preview is unavailable.');
    };

    window.downloadResourceItem = async function(resourceId, event) {
        if (event) event.stopPropagation();
        document.querySelectorAll('.action-dropdown-menu').forEach(m => {
            m.classList.remove('show');
            m.classList.remove('dropup');
        });
        document.querySelectorAll('.action-dots-btn').forEach(b => b.classList.remove('active'));

        const list = getStoredResources();
        const item = list.find(r => r.id === resourceId);
        if (item) {
            try {
                const stored = await window.sigmaGetStoredDocument?.(item.title);
                const source = item.fileUrl || item.dataUrl || item.url || stored?.data;
                if (!source) { showNotification('The uploaded file could not be found.'); return; }
                const objectUrl = typeof source === 'string' ? null : URL.createObjectURL(source instanceof Blob ? source : new Blob([source]));
                const link = document.createElement('a'); link.href = objectUrl || source; link.download = item.title; document.body.append(link); link.click(); link.remove();
                if (objectUrl) setTimeout(() => URL.revokeObjectURL(objectUrl),60000);
            } catch (_) { showNotification('Unable to download this file.'); }
        }
    };

    window.deleteResourceItem = function(resourceId, event) {
        if (event) event.stopPropagation();
        document.querySelectorAll('.action-dropdown-menu').forEach(m => {
            m.classList.remove('show');
            m.classList.remove('dropup');
        });
        document.querySelectorAll('.action-dots-btn').forEach(b => b.classList.remove('active'));

        const list = getStoredResources();
        const idx = list.findIndex(r => r.id === resourceId);
        if (idx !== -1) {
            const removed = list.splice(idx, 1)[0];
            saveResources(list);
            const section = document.getElementById('resources-view');
            if (section) updateResourcesContentOnly(section);
            showNotification(`"${removed.title}" removed.`);
        }
    };

    // Global outside click listener to close action dropdown
    if (!window._resourceDropdownClickAttached) {
        window._resourceDropdownClickAttached = true;
        document.addEventListener('pointerdown', (e) => {
            if (!e.target.closest('.action-dropdown-container')) {
                document.querySelectorAll('.action-dropdown-menu.show').forEach(m => {
                    m.classList.remove('show', 'dropup');
                    window.resetActionDropdownPosition?.(m);
                });
                document.querySelectorAll('.action-dots-btn.active').forEach(b => {
                    b.classList.remove('active');
                });
            }
        }, true);
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.action-dropdown-menu.show').forEach(m => {
                    m.classList.remove('show', 'dropup');
                    window.resetActionDropdownPosition?.(m);
                });
                document.querySelectorAll('.action-dots-btn.active').forEach(b => {
                    b.classList.remove('active');
                });
            }
        });
        window.addEventListener('scroll', () => {
            if (typeof window.repositionActiveAdminDropdowns === 'function') {
                window.repositionActiveAdminDropdowns();
            } else {
                document.querySelectorAll('.action-dropdown-menu.show').forEach(m => {
                    m.classList.remove('show', 'dropup');
                });
                document.querySelectorAll('.action-dots-btn.active').forEach(b => {
                    b.classList.remove('active');
                });
            }
        }, { passive: true, capture: true });
    }

    // Re-render content when crossing mobile breakpoint (768px) so mobile is always Card View
    let _lastWasMobile = isMobileResourcesViewport();
    window.addEventListener('resize', () => {
        const nowMobile = isMobileResourcesViewport();
        if (nowMobile !== _lastWasMobile) {
            _lastWasMobile = nowMobile;
            const section = document.getElementById('resources-view');
            if (section && !section.classList.contains('hidden')) {
                updateResourcesContentOnly(section);
            }
        }
    });

    // Re-render whenever the section becomes visible (navigation)
    const _observer = new MutationObserver(() => {
        const section = document.getElementById('resources-view');
        if (section && !section.classList.contains('hidden') && !section.querySelector('#resource-search-input')) {
            renderResourcesView();
        }
    });

    const _initTarget = document.getElementById('resources-view');
    if (_initTarget) {
        renderResourcesView();
        if (_initTarget.parentElement) {
            _observer.observe(_initTarget.parentElement, { attributes: true, subtree: true, attributeFilter: ['class'] });
        }
    } else if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            renderResourcesView();
            const section = document.getElementById('resources-view');
            if (section && section.parentElement) {
                _observer.observe(section.parentElement, { attributes: true, subtree: true, attributeFilter: ['class'] });
            }
        });
    } else {
        renderResourcesView();
        const section = document.getElementById('resources-view');
        if (section && section.parentElement) {
            _observer.observe(section.parentElement, { attributes: true, subtree: true, attributeFilter: ['class'] });
        }
    }

    window.renderResourcesView = renderResourcesView;
    window.refreshResourcesView = function (query = null) {
        if (query !== null) {
            _searchQuery = query;
        }
        _currentPage = 1;
        renderResourcesView();
    };
    window.resetResourcesView = function () {
        ownUploadsOnly = false;
        studentSubmissionsOnly = false;
        _activeAuthorFilter = null;
        _searchQuery = '';
        _activeCategoryFilter = 'all';
        _activeTypeFilter = 'all';
        _currentPage = 1;
        renderResourcesView();
        window.sigmaResetScrollToTop?.();
    };
    window.filterResourcesByAuthor = function (author) {
        const section = document.getElementById('resources-view');
        const input = section?.querySelector('#resource-search-input');
        if (input) input.value = author;
        _searchQuery = author;
        _activeCategoryFilter = 'all';
        if (section) updateResourcesContentOnly(section);
    };
    const refreshSubmissionResources = () => {
        const section = document.getElementById('resources-view');
        if (section && !section.classList.contains('hidden')) updateResourcesContentOnly(section);
    };
    window.addEventListener('sigma:submission-files-updated', refreshSubmissionResources);
    window.addEventListener('storage', event => { if (event.key === 'sigma_student_assessment_submissions' || event.key === 'sigma-deleted-submission-files') refreshSubmissionResources(); });
    window.filterResourcesBySubject = function (subj) {
        const section = document.getElementById('resources-view');
        const input = section?.querySelector('#resource-search-input');
        if (input) input.value = subj;
        _searchQuery = subj;
        _activeCategoryFilter = 'all';
        if (section) updateResourcesContentOnly(section);
    };
})();

