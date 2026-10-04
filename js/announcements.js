/**
 * SIGMA ELMS - Unified Modern Announcements System (v2.0)
 * Single source of truth for Announcement creation, audience targeting,
 * video limit validation, Facebook-style composer modal, and feed rendering across Admin, Teacher, and Student portals.
 */

(function (window, document) {
    'use strict';

    const getStoredJson = (typeof window !== 'undefined' && typeof window.getStoredJson === 'function')
        ? window.getStoredJson
        : function (key, fallback) {
            try {
                const raw = localStorage.getItem(key);
                if (!raw || raw === 'undefined' || raw === 'null' || raw === 'NaN') return fallback;
                const parsed = JSON.parse(raw);
                if (fallback !== null && fallback !== undefined) {
                    if (Array.isArray(fallback) && !Array.isArray(parsed)) return fallback;
                    if (!Array.isArray(fallback) && typeof fallback === 'object' && (typeof parsed !== 'object' || Array.isArray(parsed))) return fallback;
                }
                return parsed;
            } catch (e) {
                return fallback;
            }
        };

    const escapeHtml = (typeof window !== 'undefined' && typeof window.escapeHtml === 'function')
        ? window.escapeHtml
        : function (str) {
            if (str === null || str === undefined) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        };
    if (typeof window !== 'undefined' && !window.escapeHtml) {
        window.escapeHtml = escapeHtml;
    }

    const STORAGE_KEY = 'sigma_announcements_feed_v3';
    const VIDEO_LIMIT_KEY = 'sigma_settings_video_max_mb';
    const DEFAULT_VIDEO_LIMIT_MB = 500;
    const MIN_VIDEO_LIMIT_MB = 250;
    const MAX_VIDEO_LIMIT_MB = 700;

    // Character Limits
    const MAX_TITLE_CHARS = 300;
    const MAX_BODY_CHARS = 10000;

    // Default Seed Announcements: empty so only real announcements created by users exist
    const SEED_ANNOUNCEMENTS = [];

    // Current State
    let currentRole = 'teacher'; // 'admin', 'teacher', or 'student'
    let currentUser = {
        name: 'Maria Santos Ramos',
        role: 'teacher',
        avatar: ''
    };
    let currentActiveTab = 'all'; // 'all', 'important', 'posts'
    let activeAudience = 'everyone';
    let activeAudienceLabel = 'Public';
    let activeAudienceIcon = 'fa-users';
    let activeSubject = '';
    let activeClassroomKey = '';
    let activePriority = 'normal';
    let activePriorityLabel = 'Announcement';
    let activePriorityIcon = 'fa-bullhorn';
    const MAX_ATTACHED_PHOTOS = 12; // Configurable photo limit (6 clean pairs in 2 columns)
    let attachedImages = []; // Array of up to MAX_ATTACHED_PHOTOS images: [{ dataUrl, name, sizeBytes }]
    let attachedFile = null; // For video: { type: 'video', dataUrl, sizeBytes, sizeMB, limitMB, isExceeded, name }
    let isAudienceLocked = false; // When inside a room or editing, audience is locked to that room/subject

    // Teacher Student Picker State & Data
    let selectedStudentIds = []; // Empty = All students in section
    let tempSelectedStudentIds = [];

    function isCurrentlyInsideClassroomRoom() {
        const hash = (window.location.hash || '').toLowerCase();
        if (hash.startsWith('#classroom:')) {
            return true;
        }
        const teacherRoomSection = document.getElementById('detail-section-room');
        const teacherClassroomDetail = document.getElementById('teacher-classroom-detail');
        if (teacherClassroomDetail && !teacherClassroomDetail.classList.contains('hidden') && teacherRoomSection && !teacherRoomSection.classList.contains('hidden')) {
            return true;
        }
        const adminClassroomDetail = document.getElementById('classroom-detail-view');
        if (adminClassroomDetail && !adminClassroomDetail.classList.contains('hidden')) {
            return true;
        }
        return false;
    }

    function getTeacherAssignedSections() {
        const adminSections = getStoredJson('sigma-admin-sections', []);
        
        if (!Array.isArray(adminSections) || adminSections.length === 0) {
            return [];
        }

        let authTeacher = null;
        try {
            authTeacher = JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}');
        } catch (e) {}
        if (!authTeacher || !authTeacher.id) {
            if (typeof window.getLoggedInTeacherUser === 'function') {
                authTeacher = window.getLoggedInTeacherUser();
            }
        }
        if (!authTeacher) {
            authTeacher = currentUser;
        }

        const cleanStr = s => String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

        const tId = String(authTeacher?.id || authTeacher?.uid || '').replace(/^#/, '').trim().toLowerCase();
        const tEmail = String(authTeacher?.email || '').toLowerCase().trim();
        const tFullName = cleanStr(authTeacher?.fullName || authTeacher?.name || `${authTeacher?.firstName || ''} ${authTeacher?.lastName || ''}`);
        const tRevName = cleanStr(`${authTeacher?.lastName || ''} ${authTeacher?.firstName || ''}`);
        const tFirst = cleanStr(authTeacher?.firstName || '');
        const tLast = cleanStr(authTeacher?.lastName || '');

        const isNameMatch = (targetName) => {
            if (!targetName) return false;
            const tNorm = cleanStr(targetName);
            if (!tNorm) return false;
            if (tFullName && (tNorm === tFullName || tNorm === tRevName)) return true;
            if (tFullName && (tNorm.includes(tFullName) || tFullName.includes(tNorm))) return true;
            if (tFirst && tLast && tFirst.length >= 2 && tLast.length >= 2) {
                const words = new Set(tNorm.split(' '));
                if (words.has(tFirst) && words.has(tLast)) return true;
            }
            return false;
        };

        const assigned = adminSections.filter(sec => {
            if (!sec || sec.status === 'Draft') return false;
            if (Array.isArray(sec.teachers) && sec.teachers.length > 0) {
                return sec.teachers.some(t => {
                    if (!t) return false;
                    if (typeof t === 'string') return isNameMatch(t);
                    const u = String(t.uid || t.id || '').replace(/^#/, '').trim().toLowerCase();
                    const em = String(t.email || '').toLowerCase().trim();
                    const n = t.name || t.fullName || `${t.firstName || ''} ${t.lastName || ''}`;
                    if (tId && u && tId === u) return true;
                    if (tEmail && em && tEmail === em) return true;
                    return isNameMatch(n);
                });
            }
            if (sec.teacherUid && tId && String(sec.teacherUid).toLowerCase().trim() === tId) return true;
            if (sec.teacherEmail && tEmail && String(sec.teacherEmail).toLowerCase().trim() === tEmail) return true;
            if (sec.teacher && isNameMatch(sec.teacher)) return true;
            if (sec.adviserId && tId && String(sec.adviserId).toLowerCase().trim() === tId) return true;
            if (sec.adviser && isNameMatch(sec.adviser)) return true;
            return false;
        });

        return assigned;
    }

    function formatSectionRoomName(rawRoom) {
        if (!rawRoom) return '';
        const trimmed = String(rawRoom).trim();
        if (!trimmed || trimmed === '-' || trimmed.toLowerCase() === 'unassigned') return '';
        if (/^(room|rm|lab|laboratory)\b/i.test(trimmed)) {
            return trimmed;
        }
        return `Room ${trimmed}`;
    }

    function getSectionRoom(sec) {
        if (!sec) return '';
        let rawRoom = sec.room || sec.roomNumber || sec.classroom || '';
        if (!rawRoom) {
            try {
                const adminSections = getStoredJson('sigma-admin-sections', []);
                const sMatch = adminSections.find(s => (s.id && s.id === sec.id) || (s.name && sec.name && s.name.toLowerCase() === sec.name.toLowerCase()));
                if (sMatch && sMatch.room) rawRoom = sMatch.room;
            } catch (e) {}
        }
        if (!rawRoom && typeof window.classroomData === 'object' && window.classroomData) {
            const cMatch = Object.values(window.classroomData).find(c => {
                const cSec = String(c.section || c.sectionName || '').trim().toLowerCase();
                const sName = String(sec.name || '').trim().toLowerCase();
                return cSec && sName && (cSec === sName || cSec.includes(sName));
            });
            if (cMatch && cMatch.room) rawRoom = cMatch.room;
        }
        if (!rawRoom && typeof getTeacherSectionCards === 'function') {
            try {
                const cards = getTeacherSectionCards();
                const cMatch = cards.find(c => {
                    const cSec = String(c.sectionName || c.section || c.name || '').trim().toLowerCase();
                    const sName = String(sec.name || '').trim().toLowerCase();
                    return cSec && sName && (cSec === sName || cSec.includes(sName));
                });
                if (cMatch && cMatch.room) rawRoom = cMatch.room;
            } catch (e) {}
        }
        if (!rawRoom) {
            rawRoom = 'Room 101';
        }
        return formatSectionRoomName(rawRoom);
    }

    function stripRoomFromLabel(label, sectionRoom) {
        if (!label || typeof label !== 'string') return '';
        let parts = label.split('•').map(p => p.trim()).filter(Boolean);
        parts = parts.filter(p => {
            if (/^(?:Room|Rm\.?|Lab|Laboratory)\b/i.test(p)) return false;
            if (sectionRoom && p.toLowerCase() === String(sectionRoom).trim().toLowerCase()) return false;
            if (sectionRoom && /^(?:Room|Rm\.?|Lab|Laboratory)/i.test(sectionRoom) && p.toLowerCase().includes(String(sectionRoom).trim().toLowerCase())) return false;
            return true;
        });
        let result = parts.join(' • ');
        result = result.replace(/\s*•\s*(?:Room|Rm\.?|Lab|Laboratory)\s*[a-z0-9\-_.]+/gi, '');
        result = result.replace(/(?:Room|Rm\.?)\s*[a-z0-9\-_.]+\s*•\s*/gi, '');
        return result.trim();
    }

    function getSectionFullLabel(sec) {
        if (!sec) return '';
        const roomName = getSectionRoom(sec);
        const rawName = sec.name || 'Section';
        const cleanName = stripRoomFromLabel(rawName, roomName) || rawName;
        const gradePart = sec.grade || sec.gradeLevel;
        return gradePart ? `${gradePart} - ${cleanName}` : cleanName;
    }

    function isPostCommentsEnabled(post) {
        if (!post) return false;
        // Only teacher posts have comments
        if (post.authorRole !== 'teacher' && post.authorRole !== 'faculty') {
            return false;
        }

        const sec = post.sectionName || post.audience || post.audienceLabel || '';
        const subj = post.subject || '';
        const key = post.classroomKey || (sec && subj ? `${sec}::${subj}` : '');

        // 1. Try unified teacher function with section, subject, and key
        if (typeof window.isClassroomSectionCommentsEnabled === 'function') {
            if (window.isClassroomSectionCommentsEnabled(sec, subj, key)) return true;
        }

        // 2. Check localStorage for exact keys
        const checkKeys = [key, (sec && subj) ? `${sec}::${subj}` : '', sec].filter(Boolean);
        for (const ck of checkKeys) {
            const clean = String(ck).trim().toLowerCase();
            const val = localStorage.getItem(`classroom-comment-mode-${clean}`);
            if (val) return val === 'enabled';
        }

        // 3. Check shared state
        const modes = getStoredJson('sigma-room-comment-mode-v1', {});
        for (const ck of checkKeys) {
            const clean = String(ck).trim().toLowerCase();
            for (const [k, v] of Object.entries(modes)) {
                if (k.trim().toLowerCase() === clean) {
                    return v === 'enabled';
                }
            }
        }

        return false;
    }

    function getStudentsForCurrentSection() {
        const adminSections = getStoredJson('sigma-admin-sections', []);
        
        if (!Array.isArray(adminSections) || adminSections.length === 0) {
            return [];
        }

        const cleanAudience = String(activeAudience || '').trim().toLowerCase();
        const cleanLabel = String(activeAudienceLabel || '').trim().toLowerCase();
        const cleanSubj = String(activeSubject || '').trim().toLowerCase();

        const sec = adminSections.find(s => {
            if (s.status === 'Draft') return false;
            const sName = String(s.name || '').trim().toLowerCase();
            const sId = String(s.id || '').trim().toLowerCase();
            const sSubj = String(s.subject || '').trim().toLowerCase();
            const sFull = String(s.grade || s.gradeLevel ? `${s.grade || s.gradeLevel} - ${s.name}` : s.name).trim().toLowerCase();
            const secMatch = (sName === cleanAudience || sId === cleanAudience || sFull === cleanAudience ||
                   sName === cleanLabel || sFull === cleanLabel ||
                   (sName && cleanLabel.includes(sName)) ||
                   (sName && cleanAudience.includes(sName)));
            if (cleanSubj) {
                const subjMatch = (sSubj === cleanSubj || sSubj.includes(cleanSubj) || cleanSubj.includes(sSubj));
                return secMatch && subjMatch;
            }
            return secMatch;
        }) || adminSections.find(s => {
            if (s.status === 'Draft') return false;
            const sName = String(s.name || '').trim().toLowerCase();
            const sId = String(s.id || '').trim().toLowerCase();
            const sFull = String(s.grade || s.gradeLevel ? `${s.grade || s.gradeLevel} - ${s.name}` : s.name).trim().toLowerCase();
            return sName === cleanAudience || sId === cleanAudience || sFull === cleanAudience;
        });

        if (!sec || !Array.isArray(sec.students) || sec.students.length === 0) {
            return [];
        }

        const colors = ['#3b82f6', '#ec4899', '#10b981', '#8b5cf6', '#f59e0b', '#06b6d4', '#6366f1', '#14b8a6'];

        return sec.students.map((s, idx) => {
            const sid = String(s.uid || s.id || `s_${idx + 1}`);
            const name = s.fullName || s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Student';
            const fName = s.firstName || name;
            const initial = (fName[0] || 'S').toUpperCase();
            const color = colors[idx % colors.length];
            return {
                ...s,
                id: sid,
                uid: sid,
                name: name,
                fullName: name,
                firstName: s.firstName || '',
                lastName: s.lastName || '',
                avatar: s.avatar || s.photo || s.profilePicture || '',
                photo: s.photo || s.avatar || s.profilePicture || '',
                profilePicture: s.profilePicture || s.avatar || s.photo || '',
                initial: initial,
                color: color
            };
        });
    }

    let editingPostId = null;
    let originalEditingPostState = null;
    let postToDeleteId = null;

    function getComposerStateSnapshot() {
        const titleInput = document.getElementById('sigma-composer-input-title');
        const bodyInput = document.getElementById('sigma-composer-input-body');
        return JSON.stringify({
            title: (titleInput?.value || '').trim(),
            body: (bodyInput?.innerHTML || '').trim(),
            audience: activeAudience || 'everyone',
            priority: activePriority || 'normal',
            images: (attachedImages || []).map(img => img.dataUrl || img.name),
            file: attachedFile ? (attachedFile.dataUrl || attachedFile.name) : null,
            students: (selectedStudentIds || []).slice().sort()
        });
    }

    function validateInputs() {
        const titleInput = document.getElementById('sigma-composer-input-title');
        const bodyInput = document.getElementById('sigma-composer-input-body');
        const submitBtn = document.getElementById('sigma-composer-btn-submit');
        if (bodyInput) {
            const nonText = bodyInput.querySelectorAll('img, video, audio, svg, canvas, iframe, object, embed, picture, source');
            if (nonText.length > 0) nonText.forEach(el => el.remove());
        }
        const bodyText = (bodyInput?.innerText || '').trim();
        const titleText = (titleInput?.value || '').trim();
        const hasText = bodyText.length > 0 || titleText.length > 0;
        const hasAttachment = (attachedImages && attachedImages.length > 0) || attachedFile !== null;
        const isTooLarge = attachedFile && attachedFile.type === 'video' && attachedFile.isExceeded;
        const isTitleWithinLimit = titleText.length <= MAX_TITLE_CHARS;
        const isBodyWithinLimit = bodyText.length <= MAX_BODY_CHARS;
        let isValid = (hasText || hasAttachment) && !isTooLarge && isTitleWithinLimit && isBodyWithinLimit;

        if (editingPostId && originalEditingPostState) {
            const currentState = getComposerStateSnapshot();
            if (currentState === originalEditingPostState) {
                isValid = false;
            }
        }

        if (submitBtn) {
            submitBtn.disabled = !isValid;
            submitBtn.style.opacity = isValid ? '1' : '0.5';
            submitBtn.style.cursor = isValid ? 'pointer' : 'not-allowed';
            submitBtn.style.pointerEvents = isValid ? 'auto' : 'none';
        }
    }

    // Detect user role & profile from DOM / URL / localStorage
    function detectContext() {
        const path = window.location.pathname.toLowerCase();
        let authUser = {};
        try {
            authUser = JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}');
        } catch (e) {}
        const allUsers = (typeof window.getStoredJson === 'function') ? window.getStoredJson('sigma-admin-users', []) : [];

        if (path.includes('student') || document.body.id === 'student-portal-body' || document.getElementById('student-header')) {
            currentRole = 'student';
            let studentUser = (typeof window.getLoggedInStudentUser === 'function') ? window.getLoggedInStudentUser() : null;
            if (!studentUser && authUser && (authUser.role === 'Student' || authUser.type === 'Student')) {
                studentUser = authUser;
            }
            if (!studentUser && Array.isArray(allUsers)) {
                studentUser = allUsers.find(u => String(u.role || u.type || '').toLowerCase().includes('stud'));
            }
            const sName = studentUser ? (`${studentUser.firstName || ''} ${studentUser.lastName || ''}`.trim() || studentUser.fullName || studentUser.name || 'Juan Dela Cruz') : 'Juan Dela Cruz';
            const sUid = studentUser ? String(studentUser.uid || studentUser.id || '2222222').replace(/^#/, '').trim() : '2222222';
            const sSec = studentUser?.gradeSection || studentUser?.section || (localStorage.getItem('sigma_student_section') || 'Grade 11 - STEM A');

            let sAvatar = studentUser?.profilePicture || studentUser?.avatar || studentUser?.photo || studentUser?.profileImage || '';
            if (!sAvatar && typeof window.getCurrentUserAvatar === 'function') {
                sAvatar = window.getCurrentUserAvatar(sUid) || window.getCurrentUserAvatar(sName) || '';
            }
            if (!sAvatar && sUid) {
                sAvatar = localStorage.getItem(`sigma_avatar_${sUid}`) || '';
            }
            if (!sAvatar) {
                sAvatar = localStorage.getItem('sigma_student_avatar_base64') || localStorage.getItem('userAvatar') || '';
            }

            currentUser = {
                uid: sUid,
                id: sUid,
                name: sName,
                role: 'student',
                avatar: sAvatar,
                grade: 'Grade 11',
                section: sSec
            };
        } else if (path.includes('teacher') || document.body.id === 'teacher-portal-body' || document.getElementById('teacher-header')) {
            currentRole = 'teacher';
            let teacherUser = (typeof window.getLoggedInTeacherUser === 'function') ? window.getLoggedInTeacherUser() : null;
            if (!teacherUser && authUser && (authUser.role === 'Teacher' || authUser.type === 'Teacher')) {
                teacherUser = authUser;
            }
            if (!teacherUser && Array.isArray(allUsers)) {
                teacherUser = allUsers.find(u => String(u.role || u.type || '').toLowerCase().includes('teach'));
            }
            const tName = teacherUser ? (`${teacherUser.firstName || ''} ${teacherUser.lastName || ''}`.trim() || teacherUser.fullName || teacherUser.name || 'Maria Santos Ramos') : 'Maria Santos Ramos';
            const tUid = teacherUser ? String(teacherUser.uid || teacherUser.id || '1111111').replace(/^#/, '').trim() : '1111111';

            let tAvatar = teacherUser?.profilePicture || teacherUser?.avatar || teacherUser?.photo || teacherUser?.profileImage || '';
            if (!tAvatar && typeof window.getCurrentUserAvatar === 'function') {
                tAvatar = window.getCurrentUserAvatar(tUid) || window.getCurrentUserAvatar(tName) || '';
            }
            if (!tAvatar && tUid) {
                tAvatar = localStorage.getItem(`sigma_avatar_${tUid}`) || '';
            }
            if (!tAvatar) {
                tAvatar = localStorage.getItem('sigma_teacher_avatar_base64') || localStorage.getItem('userAvatar') || '';
            }

            currentUser = {
                uid: tUid,
                id: tUid,
                name: tName,
                role: 'teacher',
                avatar: tAvatar
            };
            const assigned = getTeacherAssignedSections();
            if (assigned.length > 0) {
                const firstSec = assigned[0];
                const secRoom = getSectionRoom(firstSec);
                const cleanSecName = stripRoomFromLabel(firstSec.name, secRoom) || firstSec.name;
                const fullLabel = getSectionFullLabel(firstSec);
                activeAudience = cleanSecName || fullLabel;
                const rawLabel = firstSec.subject ? `${fullLabel} • ${firstSec.subject}` : fullLabel;
                activeAudienceLabel = stripRoomFromLabel(rawLabel, secRoom) || rawLabel;
                activeAudienceIcon = 'fa-graduation-cap';
            } else {
                activeAudience = '';
                activeAudienceLabel = 'No Section Assigned';
                activeAudienceIcon = 'fa-graduation-cap';
            }
        } else {
            currentRole = 'admin';
            let adminUser = (typeof window.getLoggedInAdminUser === 'function') ? window.getLoggedInAdminUser() : null;
            if (!adminUser && authUser && (authUser.role === 'Admin' || authUser.role === 'Master Admin' || authUser.type === 'Admin')) {
                adminUser = authUser;
            }
            if (!adminUser && Array.isArray(allUsers)) {
                adminUser = allUsers.find(u => String(u.uid || u.id) === '0000000' || String(u.role || u.type || '').toLowerCase().includes('admin'));
            }
            const aName = adminUser ? (`${adminUser.firstName || ''} ${adminUser.lastName || ''}`.trim() || adminUser.fullName || adminUser.name || 'Stanley Garcia') : 'Stanley Garcia';
            const aUid = adminUser ? String(adminUser.uid || adminUser.id || '0000000').replace(/^#/, '').trim() : '0000000';

            let aAvatar = adminUser?.profilePicture || adminUser?.avatar || adminUser?.photo || adminUser?.profileImage || '';
            if (!aAvatar && typeof window.getCurrentUserAvatar === 'function') {
                aAvatar = window.getCurrentUserAvatar(aUid) || window.getCurrentUserAvatar(aName) || '';
            }
            if (!aAvatar && aUid) {
                aAvatar = localStorage.getItem(`sigma_avatar_${aUid}`) || '';
            }
            if (!aAvatar) {
                aAvatar = localStorage.getItem('sigma_admin_avatar_base64') || localStorage.getItem('userAvatar') || '';
            }

            currentUser = {
                uid: aUid,
                id: aUid,
                name: aName,
                role: 'admin',
                avatar: aAvatar
            };
            activeAudience = 'everyone';
            activeAudienceLabel = 'Public';
            activeAudienceIcon = 'fa-users';
        }
    }

    // Storage Helpers
    function getStoredAnnouncements() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            let parsed = [];
            if (!raw) {
                parsed = [];
            } else {
                parsed = JSON.parse(raw);
                if (!Array.isArray(parsed)) {
                    parsed = [];
                }
            }

            let migrated = false;

            // Automatically purge all fake/seed announcement templates and dummy posts
            const fakeSeedPrefixes = ['ann_seed_', 'ann-seed-', 'ann-post-'];
            const initialCount = parsed.length;
            parsed = parsed.filter(p => {
                if (!p || !p.id) return false;
                return !fakeSeedPrefixes.some(prefix => String(p.id).startsWith(prefix));
            });
            if (parsed.length !== initialCount) {
                migrated = true;
            }

            // Migrate any old broken avatar paths or outdated labels
            parsed = parsed.map(post => {
                if (post.authorAvatar === 'image/icc-logo.png' || post.authorAvatar === 'image/ICC logo.jpg' || post.authorAvatar === 'image/Welcome.jpg') {
                    post.authorAvatar = '';
                    migrated = true;
                }
                if (post.authorRole === 'Faculty' || post.authorRole === 'faculty') {
                    post.authorRole = 'teacher';
                    migrated = true;
                }
                if (post.audienceLabel && post.audienceLabel.includes('School-Wide')) {
                    post.audienceLabel = 'Public';
                    migrated = true;
                }
                if (post.audienceLabel && (post.audienceLabel.includes('Faculty Only') || post.audienceLabel.includes('Faculty / Teachers'))) {
                    post.audienceLabel = 'Faculty';
                    migrated = true;
                }
                if (post.audienceLabel) {
                    const cleanedLabel = stripRoomFromLabel(post.audienceLabel, post.sectionRoom);
                    if (cleanedLabel !== post.audienceLabel) {
                        post.audienceLabel = cleanedLabel;
                        migrated = true;
                    }
                }
                return post;
            });

            if (migrated) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
            }

            // Merge in-memory posts if newer posts were added in this session
            if (window._sigmaAnnouncementsMemoryStore && window._sigmaAnnouncementsMemoryStore.length > 0) {
                const idMap = new Map();
                parsed.forEach(p => { if (p && p.id) idMap.set(p.id, p); });
                window._sigmaAnnouncementsMemoryStore.forEach(p => {
                    if (p && p.id) idMap.set(p.id, p);
                });
                parsed = Array.from(idMap.values()).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
            }

            // Hydrate idb: references from memory or trigger async IndexedDB fetch
            parsed.forEach(p => {
                if (p.mediaUrl && typeof p.mediaUrl === 'string' && p.mediaUrl.startsWith('idb:')) {
                    const mId = p.mediaUrl.slice(4);
                    if (window._sigmaMediaMemoryCache.has(mId)) {
                        p.mediaUrl = window._sigmaMediaMemoryCache.get(mId);
                    } else {
                        getMediaBlob(mId).then(blobUrl => {
                            if (blobUrl) {
                                p.mediaUrl = blobUrl;
                                document.querySelectorAll(`[data-idb-media="${mId}"]`).forEach(el => {
                                    el.src = blobUrl;
                                    el.removeAttribute('data-idb-pending');
                                    const grid = el.closest('.sigma-card-photo-grid');
                                    if (grid) grid.classList.add('is-ready');
                                    const box = el.closest('.sigma-card-media-picture-container, .sigma-card-media-video-container');
                                    if (box) box.classList.add('is-ready');
                                });
                            }
                        });
                    }
                }
                if (Array.isArray(p.mediaUrls)) {
                    p.mediaUrls = p.mediaUrls.map(u => {
                        if (typeof u === 'string' && u.startsWith('idb:')) {
                            const mId = u.slice(4);
                            if (window._sigmaMediaMemoryCache.has(mId)) {
                                return window._sigmaMediaMemoryCache.get(mId);
                            }
                            getMediaBlob(mId).then(blobUrl => {
                                if (blobUrl) {
                                    document.querySelectorAll(`[data-idb-media="${mId}"]`).forEach(el => {
                                        el.src = blobUrl;
                                        el.removeAttribute('data-idb-pending');
                                        const grid = el.closest('.sigma-card-photo-grid');
                                        if (grid) grid.classList.add('is-ready');
                                        const box = el.closest('.sigma-card-media-picture-container, .sigma-card-media-video-container');
                                        if (box) box.classList.add('is-ready');
                                    });
                                }
                            });
                        }
                        return u;
                    });
                }
            });

            return parsed;
        } catch (e) {
            console.warn('[Announcements] Failed to parse stored posts', e);
            return [];
        }
    }

    // --- IndexedDB & Media Storage Helpers for Photos and Videos ---
    const ANNOUNCEMENTS_MEDIA_DB = 'sigma_announcements_media_db';
    const ANNOUNCEMENTS_MEDIA_STORE = 'media_blobs';
    const ANNOUNCEMENTS_MEDIA_VERSION = 2; // Bumped to v2 to guarantee object store creation
    window._sigmaMediaMemoryCache = window._sigmaMediaMemoryCache || new Map();
    window._sigmaAnnouncementsMemoryStore = window._sigmaAnnouncementsMemoryStore || [];

    let _announcementsDbPromise = null;

    function openAnnouncementsMediaDB() {
        if (_announcementsDbPromise) return _announcementsDbPromise;
        if (typeof window === 'undefined' || !window.indexedDB) {
            return Promise.resolve(null);
        }
        _announcementsDbPromise = new Promise((resolve) => {
            try {
                const req = indexedDB.open(ANNOUNCEMENTS_MEDIA_DB, ANNOUNCEMENTS_MEDIA_VERSION);
                req.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains(ANNOUNCEMENTS_MEDIA_STORE)) {
                        db.createObjectStore(ANNOUNCEMENTS_MEDIA_STORE, { keyPath: 'id' });
                    }
                };
                req.onsuccess = (e) => {
                    const db = e.target.result;
                    db.onversionchange = () => {
                        try { db.close(); } catch (_) {}
                        _announcementsDbPromise = null;
                    };
                    resolve(db);
                };
                req.onerror = (err) => {
                    console.warn('[Announcements IDB] Open error:', err);
                    _announcementsDbPromise = null;
                    resolve(null);
                };
                req.onblocked = (err) => {
                    console.warn('[Announcements IDB] Open blocked:', err);
                    _announcementsDbPromise = null;
                    resolve(null);
                };
            } catch (err) {
                console.warn('[Announcements IDB] Catch error:', err);
                _announcementsDbPromise = null;
                resolve(null);
            }
        });
        return _announcementsDbPromise;
    }

    async function storeMediaBlob(id, dataUrl) {
        if (!id || !dataUrl) return false;
        window._sigmaMediaMemoryCache.set(id, dataUrl);
        try {
            const db = await openAnnouncementsMediaDB();
            if (!db) return false;
            return new Promise((resolve) => {
                try {
                    const tx = db.transaction(ANNOUNCEMENTS_MEDIA_STORE, 'readwrite');
                    const store = tx.objectStore(ANNOUNCEMENTS_MEDIA_STORE);
                    store.put({ id, dataUrl, timestamp: Date.now() });
                    tx.oncomplete = () => resolve(true);
                    tx.onerror = () => resolve(false);
                    tx.onabort = () => resolve(false);
                } catch (err) {
                    console.warn('[Announcements IDB] storeMediaBlob tx error:', err);
                    resolve(false);
                }
            });
        } catch (_) {
            return false;
        }
    }

    function mediaUrlFromRecord(row) {
        if (!row) return null;
        if (typeof row === 'string') return row;
        if (typeof row.dataUrl === 'string' && row.dataUrl && !row.dataUrl.startsWith('idb:')) return row.dataUrl;
        if (typeof row.url === 'string' && row.url && !row.url.startsWith('idb:')) return row.url;
        const blob = row.blob || row.data;
        if (typeof Blob !== 'undefined' && blob instanceof Blob) {
            if (!window._sigmaMediaObjectUrls) window._sigmaMediaObjectUrls = new Map();
            const key = row.id || '';
            if (key && window._sigmaMediaObjectUrls.has(key)) return window._sigmaMediaObjectUrls.get(key);
            const objUrl = URL.createObjectURL(blob);
            if (key) window._sigmaMediaObjectUrls.set(key, objUrl);
            return objUrl;
        }
        return null;
    }

    function readMediaStore(db, mode, onStore) {
        return new Promise((resolve) => {
            try {
                const tx = db.transaction(ANNOUNCEMENTS_MEDIA_STORE, 'readonly');
                const store = tx.objectStore(ANNOUNCEMENTS_MEDIA_STORE);
                const req = onStore(store);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => resolve(mode === 'all' ? [] : null);
            } catch (_) {
                resolve(mode === 'all' ? [] : null);
            }
        });
    }

    async function getMediaBlob(id) {
        if (!id) return null;
        const cacheId = String(id).replace(/^idb:/, '');
        if (window._sigmaMediaMemoryCache.has(cacheId)) return window._sigmaMediaMemoryCache.get(cacheId);
        if (cacheId !== id && window._sigmaMediaMemoryCache.has(id)) return window._sigmaMediaMemoryCache.get(id);
        try {
            const db = await openAnnouncementsMediaDB();
            if (!db) return null;
            return new Promise((resolve) => {
                try {
                    const tx = db.transaction(ANNOUNCEMENTS_MEDIA_STORE, 'readonly');
                    const store = tx.objectStore(ANNOUNCEMENTS_MEDIA_STORE);
                    const req = store.get(cacheId);
                    req.onsuccess = () => {
                        const direct = mediaUrlFromRecord(req.result);
                        if (direct) {
                            window._sigmaMediaMemoryCache.set(cacheId, direct);
                            resolve(direct);
                        } else {
                            // Secondary fallback scan if ID had slight prefix variance
                            const allReq = store.getAll();
                            allReq.onsuccess = () => {
                                const rows = allReq.result || [];
                                const hit = rows.find((r) => r && (r.id === cacheId || r.id === id || String(r.id || '').endsWith(cacheId)));
                                const scanned = mediaUrlFromRecord(hit);
                                if (scanned) {
                                    window._sigmaMediaMemoryCache.set(cacheId, scanned);
                                    resolve(scanned);
                                } else {
                                    resolve(null);
                                }
                            };
                            allReq.onerror = () => resolve(null);
                        }
                    };
                    req.onerror = () => resolve(null);
                } catch (err) {
                    console.warn('[Announcements IDB] getMediaBlob tx error:', err);
                    resolve(null);
                }
            });
        } catch (_) {
            return null;
        }
    }

    function paintAnnouncementMedia(root) {
        if (!root || !root.querySelectorAll) return;
        root.querySelectorAll('[data-idb-media]').forEach((el) => {
            const mId = el.getAttribute('data-idb-media');
            if (!mId) return;
            const apply = (url) => {
                if (!url || typeof url !== 'string' || url.startsWith('idb:')) return;
                el.src = url;
                el.removeAttribute('data-idb-pending');
                const grid = el.closest('.sigma-card-photo-grid');
                if (grid) grid.classList.add('is-ready');
                const box = el.closest('.sigma-card-media-picture-container, .sigma-card-media-video-container');
                if (box) box.classList.add('is-ready');
            };
            if (window._sigmaMediaMemoryCache && window._sigmaMediaMemoryCache.has(mId)) {
                apply(window._sigmaMediaMemoryCache.get(mId));
                return;
            }
            getMediaBlob(mId).then((url) => {
                if (url) {
                    apply(url);
                } else {
                    el.removeAttribute('data-idb-pending');
                }
            });
        });
    }

    // Auto-compress uploaded photos with Canvas to prevent huge base64 strings
    function compressImageFile(file, maxWidth = 1080, maxHeight = 1080, quality = 0.78) {
        return new Promise((resolve) => {
            if (!file || !file.type || !file.type.startsWith('image/')) {
                resolve(null);
                return;
            }
            if (file.type === 'image/gif' || file.type === 'image/svg+xml') {
                const r = new FileReader();
                r.onload = (e) => resolve(e.target.result);
                r.onerror = () => resolve(null);
                r.readAsDataURL(file);
                return;
            }
            const r = new FileReader();
            r.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    let w = img.width;
                    let h = img.height;
                    if (w > maxWidth || h > maxHeight) {
                        if (w > h) {
                            h = Math.round((h * maxWidth) / w);
                            w = maxWidth;
                        } else {
                            w = Math.round((w * maxHeight) / h);
                            h = maxHeight;
                        }
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = w;
                    canvas.height = h;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, w, h);
                    const result = canvas.toDataURL('image/jpeg', quality);
                    resolve(result);
                };
                img.onerror = () => resolve(e.target.result);
                img.src = e.target.result;
            };
            r.onerror = () => resolve(null);
            r.readAsDataURL(file);
        });
    }

    function saveStoredAnnouncements(posts) {
        if (!Array.isArray(posts)) return;
        window._sigmaAnnouncementsMemoryStore = [...posts];

        // Process any large media (e.g. videos or raw image data URLs)
        // Store in IndexedDB/Memory and replace with idb: references for localStorage persistence
        const sanitized = posts.map(post => {
            const p = { ...post };
            // Video: always offload to IndexedDB & memory cache to prevent localStorage quota exhaustion
            if (p.mediaType === 'video' && p.mediaUrl && p.mediaUrl.length > 50000) {
                const mediaId = `ann_vid_${p.id}`;
                storeMediaBlob(mediaId, p.mediaUrl);
                p.mediaUrl = `idb:${mediaId}`;
                p.mediaUrls = [`idb:${mediaId}`];
            }
            // Images: always offload raw data URLs to IndexedDB to keep localStorage footprint tiny
            if (Array.isArray(p.mediaUrls) && p.mediaUrls.length > 0) {
                p.mediaUrls = p.mediaUrls.map((url, idx) => {
                    if (typeof url === 'string' && url.startsWith('data:')) {
                        const mediaId = `ann_img_${p.id}_${idx}`;
                        storeMediaBlob(mediaId, url);
                        return `idb:${mediaId}`;
                    }
                    return url;
                });
                if (p.mediaUrl && p.mediaUrl.startsWith('data:')) {
                    p.mediaUrl = p.mediaUrls[0];
                }
            } else if (p.mediaUrl && typeof p.mediaUrl === 'string' && p.mediaUrl.startsWith('data:')) {
                const mediaId = `ann_img_${p.id}_0`;
                storeMediaBlob(mediaId, p.mediaUrl);
                p.mediaUrl = `idb:${mediaId}`;
                p.mediaUrls = [`idb:${mediaId}`];
            }
            return p;
        });

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
        } catch (e) {
            console.warn('[Announcements] localStorage full, offloading all dataUrl media...', e);
            const minimal = sanitized.map(post => {
                const p = { ...post };
                if (p.mediaUrl && p.mediaUrl.startsWith('data:')) {
                    const mediaId = `ann_media_${p.id}_0`;
                    storeMediaBlob(mediaId, p.mediaUrl);
                    p.mediaUrl = `idb:${mediaId}`;
                }
                if (Array.isArray(p.mediaUrls)) {
                    p.mediaUrls = p.mediaUrls.map((u, i) => {
                        if (typeof u === 'string' && u.startsWith('data:')) {
                            const mediaId = `ann_media_${p.id}_${i}`;
                            storeMediaBlob(mediaId, u);
                            return `idb:${mediaId}`;
                        }
                        return u;
                    });
                }
                return p;
            });
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(minimal));
            } catch (err2) {
                console.error('[Announcements] Critical storage failure, retaining in memory', err2);
            }
        }
    }

    function getExpandedPosts() {
        try {
            return new Set(JSON.parse(sessionStorage.getItem('sigma-expanded-announcements') || '[]'));
        } catch (e) {
            return new Set();
        }
    }

    function saveExpandedPost(postId) {
        try {
            const set = getExpandedPosts();
            set.add(postId);
            sessionStorage.setItem('sigma-expanded-announcements', JSON.stringify([...set]));
        } catch (e) {}
    }

    function removeExpandedPost(postId) {
        try {
            const set = getExpandedPosts();
            set.delete(postId);
            sessionStorage.setItem('sigma-expanded-announcements', JSON.stringify([...set]));
        } catch (e) {}
    }

    function getMaxVideoLimitMB() {
        const stored = localStorage.getItem(VIDEO_LIMIT_KEY);
        const val = parseInt(stored, 10);
        if (!isNaN(val) && val > 0) {
            return Math.min(MAX_VIDEO_LIMIT_MB, Math.max(MIN_VIDEO_LIMIT_MB, val));
        }
        return DEFAULT_VIDEO_LIMIT_MB;
    }

    // Modern Custom Toast Notification Panel (Replaces ugly browser alert popups)
    function showToastNotice({ title = 'Notice', message = '', type = 'warning' }) {
        let container = document.getElementById('sigma-announcement-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'sigma-announcement-toast-container';
            container.className = 'sigma-toast-container';
            document.body.appendChild(container);
        }

        const iconClass = type === 'error'
            ? 'fa-circle-xmark text-rose-500'
            : (type === 'info' ? 'fa-circle-info text-blue-500' : 'fa-triangle-exclamation text-amber-500');

        const toast = document.createElement('div');
        toast.className = `sigma-toast-panel sigma-toast-${type}`;
        toast.innerHTML = `
            <div class="sigma-toast-icon">
                <i class="fa-solid ${iconClass}"></i>
            </div>
            <div class="sigma-toast-content">
                <div class="sigma-toast-title">${title}</div>
                <div class="sigma-toast-desc">${message}</div>
            </div>
            <button type="button" class="sigma-toast-close" title="Dismiss">
                <i class="fa-solid fa-xmark"></i>
            </button>
        `;

        const closeBtn = toast.querySelector('.sigma-toast-close');
        let timer = null;
        const removeToast = () => {
            if (timer) clearTimeout(timer);
            toast.classList.add('hide');
            setTimeout(() => {
                if (toast.parentElement) toast.remove();
            }, 250);
        };
        if (closeBtn) closeBtn.addEventListener('click', removeToast);
        timer = setTimeout(removeToast, 4500);

        container.appendChild(toast);
    }

    // Audience / Section options by Role (Monochrome FontAwesome icons only)
    function getAudienceOptionsForRole() {
        if (currentRole === 'admin') {
            return [
                {
                    group: 'Audience',
                    options: [
                        { key: 'everyone', label: 'Public', icon: 'fa-earth-americas' },
                        { key: 'teachers_only', label: 'Faculty', icon: 'fa-chalkboard-user' },
                        { key: 'all_students', label: 'All Students', icon: 'fa-user-graduate' }
                    ]
                }
            ];
        } else {
            // Teacher Options: Real sections and subjects assigned to this teacher
            const assigned = getTeacherAssignedSections();
            if (assigned.length === 0) {
                return [
                    {
                        group: 'Classes & Sections',
                        empty: true,
                        options: []
                    }
                ];
            }
            return [
                {
                    group: 'Classes & Sections',
                    options: assigned.map(sec => {
                        const roomName = getSectionRoom(sec);
                        const cleanSecName = stripRoomFromLabel(sec.name, roomName) || sec.name;
                        const fullLabel = getSectionFullLabel(sec);
                        const subj = sec.subject || '';
                        let displayLabel = subj ? `${fullLabel} • ${subj}` : fullLabel;
                        displayLabel = stripRoomFromLabel(displayLabel, roomName) || displayLabel;
                        const classKey = subj ? `${cleanSecName}::${subj}` : cleanSecName;
                        const gradePart = sec.grade || sec.gradeLevel;
                        const baseLabel = gradePart ? `${gradePart} - ${cleanSecName}` : cleanSecName;
                        return {
                            key: classKey,
                            label: displayLabel,
                            baseLabel: baseLabel,
                            room: roomName,
                            sectionId: sec.id,
                            sectionName: cleanSecName,
                            subject: subj,
                            classroomKey: classKey,
                            icon: 'fa-graduation-cap'
                        };
                    })
                }
            ];
        }
    }

    const PRIORITY_OPTIONS = [
        { key: 'normal', label: 'Announcement', icon: 'fa-bullhorn', badgeClass: 'bg-emerald-100 text-emerald-800' },
        { key: 'important', label: 'Important', icon: 'fa-star', badgeClass: 'bg-amber-100 text-amber-900' }
    ];

    // Active attempt close composer reference for discard confirmations
    let currentAttemptCloseComposer = null;

    // Build the Composer Modal DOM dynamically if not present (Admin & Teacher only)
    function ensureComposerModalDOM() {
        const path = (window.location.pathname || '').toLowerCase();
        if (path.endsWith('index.html') || path === '/' || path.endsWith('/') || document.getElementById('landingMain') || document.getElementById('loginModal')) {
            const existing = document.getElementById('sigma-composer-modal-backdrop');
            if (existing) existing.remove();
            return;
        }

        detectContext();
        if (currentRole === 'student') {
            const existing = document.getElementById('sigma-composer-modal-backdrop');
            if (existing) existing.remove();
            return;
        }
        const existing = document.getElementById('sigma-composer-modal-backdrop');
        if (existing) existing.remove();

        const isTeacher = currentRole === 'teacher';

        const modalHTML = `
        <div id="sigma-composer-modal-backdrop" class="sigma-composer-backdrop">
            <div class="sigma-composer-modal">
                <!-- Header -->
                <div class="sigma-composer-header">
                    <button type="button" class="sigma-composer-back-btn" id="sigma-composer-back-btn" onclick="window.SigmaAnnouncements ? window.SigmaAnnouncements.closeComposer() : (window.closeClassroomComposer && window.closeClassroomComposer())" title="Back">
                        <i class="fa-solid fa-chevron-left"></i>
                    </button>
                    <h3 class="sigma-composer-title">Create Post</h3>
                </div>

                <!-- Body -->
                <div class="sigma-composer-body">
                    <!-- Author & Dropdown Pills -->
                    <div class="sigma-composer-author-row">
                        <div id="sigma-composer-author-avatar-wrap">
                            ${(typeof window.renderUserAvatarHtml === 'function') ? window.renderUserAvatarHtml(currentUser, 'md') : '<div class="sigma-user-avatar sigma-user-avatar--md"><i class="fa-solid fa-user"></i></div>'}
                        </div>
                        <div class="sigma-composer-author-details">
                            <span id="sigma-composer-author-name-text" class="sigma-composer-author-name">${currentUser.name}</span>
                            <div class="sigma-composer-pills-row">
                                <!-- Audience / Section Pill -->
                                <div style="position: relative;">
                                    <button type="button" class="sigma-composer-pill-btn" id="sigma-composer-pill-audience">
                                        <i id="sigma-composer-audience-icon" class="fa-solid ${activeAudienceIcon} text-black-fade"></i>
                                        <span id="sigma-composer-audience-label">${activeAudienceLabel}</span>
                                        <i id="sigma-composer-audience-chevron" class="fa-solid fa-chevron-down text-[10px] text-black-fade"></i>
                                    </button>
                                    <div class="sigma-composer-dropdown-menu" id="sigma-composer-audience-menu"></div>
                                </div>

                                <!-- Students Target Pill (Only for Section/Subject Audience) -->
                                <div class="relative" id="sigma-composer-pill-students-container" style="display: ${currentRole === 'teacher' ? 'block' : 'none'};">
                                    <button type="button" class="sigma-composer-pill-btn" id="sigma-composer-pill-students" title="Target specific students">
                                        <i class="fa-solid fa-user-group text-black-fade"></i>
                                        <span id="sigma-composer-students-label">All students</span>
                                    </button>
                                </div>

                            </div>
                        </div>
                    </div>

                    <!-- Title (Optional, Max 300 characters) -->
                    <div class="sigma-composer-title-wrap">
                        <input type="text" id="sigma-composer-input-title" class="sigma-composer-title-input" placeholder="Announcement Title (Optional)" maxlength="300">
                    </div>

                    <!-- Rich Text Editor Container with Formatting Toolbar (WYSIWYG) -->
                    <div class="sigma-composer-editor-box" id="sigma-composer-editor-box">
                        <div class="sigma-composer-toolbar" id="sigma-composer-toolbar">
                            <button type="button" class="sigma-composer-tool-btn" data-tool="bold" title="Bold (Ctrl+B)">
                                <i class="fa-solid fa-bold text-xs"></i>
                            </button>
                            <button type="button" class="sigma-composer-tool-btn" data-tool="italic" title="Italic (Ctrl+I)">
                                <i class="fa-solid fa-italic text-xs"></i>
                            </button>
                            <button type="button" class="sigma-composer-tool-btn" data-tool="underline" title="Underline (Ctrl+U)">
                                <i class="fa-solid fa-underline text-xs"></i>
                            </button>
                            <div class="sigma-composer-tool-divider"></div>
                            <button type="button" class="sigma-composer-tool-btn" data-tool="bullet" title="Bulleted List">
                                <i class="fa-solid fa-list-ul text-xs"></i>
                            </button>
                            <button type="button" class="sigma-composer-tool-btn" data-tool="number" title="Numbered List">
                                <i class="fa-solid fa-list-ol text-xs"></i>
                            </button>
                        </div>
                        <div id="sigma-composer-input-body" class="sigma-composer-textarea" contenteditable="true" data-placeholder="Share updates, announcements, or materials with your class..."></div>
                    </div>

                    <!-- Attachments Preview Area -->
                    <div id="sigma-composer-attachments-container" class="sigma-composer-attachments-preview" style="display: none;"></div>
                </div>

                <!-- Footer / Pinned Actions & Post Button -->
                <div class="sigma-composer-footer">
                    <!-- Add to your post Bar (Always pinned right above Post Button) -->
                    <div class="sigma-composer-add-to-post-card">
                        <span class="sigma-add-to-post-label">Attach to Announcement</span>
                        <div class="sigma-add-to-post-actions">
                            <button type="button" class="sigma-action-icon-btn sigma-icon-photo" id="sigma-composer-btn-add-photo" title="Attach Photo (Max ${MAX_ATTACHED_PHOTOS})">
                                <i class="fa-solid fa-image"></i>
                            </button>
                            <button type="button" class="sigma-action-icon-btn sigma-icon-video" id="sigma-composer-btn-add-video" title="Attach Video">
                                <i class="fa-solid fa-video"></i>
                            </button>
                            <button type="button" class="sigma-action-icon-btn sigma-icon-important" id="sigma-composer-btn-toggle-important" title="Mark as Important">
                                <i class="fa-solid fa-star"></i>
                            </button>
                        </div>
                    </div>

                    <button type="button" class="sigma-composer-submit-btn" id="sigma-composer-btn-submit" disabled>
                        <span>Post Announcement</span>
                    </button>
                </div>
            </div>

            <!-- Hidden File Pickers (Off-screen rendered for 100% mobile browser & desktop compatibility) -->
            <input type="file" id="sigma-file-picker-photo" accept="image/*,image/png,image/jpeg,image/webp,image/gif" multiple class="sr-only" style="position:fixed;top:-9999px;left:-9999px;opacity:0;pointer-events:none;width:1px;height:1px;">
            <input type="file" id="sigma-file-picker-video" accept="video/*,video/mp4,video/webm,video/quicktime,video/x-m4v" class="sr-only" style="position:fixed;top:-9999px;left:-9999px;opacity:0;pointer-events:none;width:1px;height:1px;">
        </div>

        <!-- Student Picker Modal (Google Classroom "Announce to" style) -->
        <div id="sigma-student-picker-backdrop" class="sigma-student-picker-backdrop">
            <div class="sigma-student-picker-card">
                <div class="sigma-student-picker-header">
                    <h4 class="sigma-student-picker-title">Announce to</h4>
                </div>
                <div class="sigma-student-picker-list" id="sigma-student-picker-list"></div>
                <div class="sigma-student-picker-footer">
                    <button type="button" class="sigma-student-btn-done" id="sigma-student-btn-done">Done</button>
                </div>
            </div>
        </div>

        <!-- Discard Confirmation Dialog Panel -->
        <div id="sigma-discard-dialog-backdrop" class="sigma-discard-dialog-backdrop">
            <div class="sigma-discard-dialog">
                <div class="sigma-discard-icon-circle">
                    <i class="fa-solid fa-trash-can"></i>
                </div>
                <h4 class="sigma-discard-dialog-title">Discard Announcement?</h4>
                <p class="sigma-discard-dialog-desc">You have unsaved changes in your announcement. If you leave now, everything you typed will be lost.</p>
                <div class="sigma-discard-dialog-actions">
                    <button type="button" class="sigma-discard-btn-cancel" id="sigma-discard-btn-cancel">Keep Editing</button>
                    <button type="button" class="sigma-discard-btn-confirm" id="sigma-discard-btn-confirm">Discard</button>
                </div>
            </div>
        </div>
        `;

        const wrapper = document.createElement('div');
        wrapper.innerHTML = modalHTML;
        while (wrapper.firstElementChild) {
            document.body.appendChild(wrapper.firstElementChild);
        }

        bindComposerEvents();
    }

    // Student Picker Modal Logic (Image 3)
    function openStudentPickerModal() {
        const backdrop = document.getElementById('sigma-student-picker-backdrop');
        const listContainer = document.getElementById('sigma-student-picker-list');
        if (!backdrop || !listContainer) return;

        const students = getStudentsForCurrentSection();
        if (selectedStudentIds.length === 0) {
            tempSelectedStudentIds = students.map(s => s.id);
        } else {
            tempSelectedStudentIds = [...selectedStudentIds];
        }

        renderStudentPickerList();
        backdrop.classList.add('active');
    }

    function closeStudentPickerModal() {
        const backdrop = document.getElementById('sigma-student-picker-backdrop');
        if (backdrop) backdrop.classList.remove('active');
    }

    function renderStudentPickerList() {
        const listContainer = document.getElementById('sigma-student-picker-list');
        if (!listContainer) return;

        const students = getStudentsForCurrentSection();
        if (students.length === 0) {
            listContainer.innerHTML = `
            <div class="py-12 px-4 text-center text-xs text-slate-500 font-['Inter'] flex flex-col items-center justify-center gap-2 select-none">
                <i class="fa-solid fa-users-slash text-2xl text-slate-300"></i>
                <span class="font-bold text-slate-700">No students enrolled</span>
                <span class="text-[11px] text-slate-400">There are no students assigned to this section yet.</span>
            </div>`;
            return;
        }

        const allChecked = students.length > 0 && students.every(s => tempSelectedStudentIds.includes(s.id));

        let html = `
        <div class="sigma-student-row" id="sigma-student-row-all">
            <input type="checkbox" id="sigma-student-chk-all" class="sigma-student-checkbox" ${allChecked ? 'checked' : ''}>
            <div class="sigma-student-avatar-badge">
                <i class="fa-solid fa-users text-[11px] text-slate-600"></i>
            </div>
            <span class="sigma-student-name font-semibold text-slate-900">All students</span>
        </div>
        <div class="border-t border-slate-100 my-1 mx-1"></div>`;

        students.forEach(s => {
            const isChecked = tempSelectedStudentIds.includes(s.id);
            const avatarHtml = (typeof window.renderUserAvatarHtml === 'function')
                ? window.renderUserAvatarHtml(s, 'sm', 'sigma-student-avatar-badge')
                : (s.avatar ? `<div class="sigma-student-avatar-badge"><img src="${s.avatar}" alt="${escapeHtml(s.name)}"></div>` : `<div class="sigma-student-avatar-badge"><i class="fa-solid fa-user text-[#64748b] text-[11px]"></i></div>`);

            html += `
            <div class="sigma-student-row" data-student-id="${s.id}">
                <input type="checkbox" class="sigma-student-checkbox sigma-student-item-chk" data-student-id="${s.id}" ${isChecked ? 'checked' : ''}>
                ${avatarHtml}
                <span class="sigma-student-name">${escapeHtml(s.name)}</span>
            </div>`;
        });

        listContainer.innerHTML = html;

        // "All students" checkbox change
        const chkAll = document.getElementById('sigma-student-chk-all');
        const rowAll = document.getElementById('sigma-student-row-all');
        if (chkAll) {
            chkAll.addEventListener('change', (e) => {
                if (e.target.checked) {
                    tempSelectedStudentIds = students.map(s => s.id);
                } else {
                    tempSelectedStudentIds = [];
                }
                renderStudentPickerList();
            });
        }
        if (rowAll && chkAll) {
            rowAll.addEventListener('click', (e) => {
                if (e.target !== chkAll) {
                    chkAll.checked = !chkAll.checked;
                    chkAll.dispatchEvent(new Event('change'));
                }
            });
        }

        // Row clicks and individual checkbox changes
        listContainer.querySelectorAll('.sigma-student-row[data-student-id]').forEach(row => {
            row.addEventListener('click', (e) => {
                const chk = row.querySelector('.sigma-student-item-chk');
                if (e.target !== chk) {
                    chk.checked = !chk.checked;
                }
                const sid = chk.getAttribute('data-student-id');
                if (chk.checked) {
                    if (!tempSelectedStudentIds.includes(sid)) tempSelectedStudentIds.push(sid);
                } else {
                    tempSelectedStudentIds = tempSelectedStudentIds.filter(id => id !== sid);
                }
                const chkAll = document.getElementById('sigma-student-chk-all');
                if (chkAll) chkAll.checked = students.length > 0 && students.every(s => tempSelectedStudentIds.includes(s.id));
            });
        });
    }

    // Bind all Interactive Events for the Composer
    function bindComposerEvents() {
        const backdrop = document.getElementById('sigma-composer-modal-backdrop');
        const closeBtn = document.getElementById('sigma-composer-btn-close');
        const submitBtn = document.getElementById('sigma-composer-btn-submit');
        const titleInput = document.getElementById('sigma-composer-input-title');
        const bodyInput = document.getElementById('sigma-composer-input-body');

        const pillAudience = document.getElementById('sigma-composer-pill-audience');
        const menuAudience = document.getElementById('sigma-composer-audience-menu');
        const pillStudents = document.getElementById('sigma-composer-pill-students');
        const pillPriority = document.getElementById('sigma-composer-pill-priority');
        const menuPriority = document.getElementById('sigma-composer-priority-menu');

        const btnAddPhoto = document.getElementById('sigma-composer-btn-add-photo');
        const btnAddVideo = document.getElementById('sigma-composer-btn-add-video');
        const btnToggleImportant = document.getElementById('sigma-composer-btn-toggle-important');

        const filePickerPhoto = document.getElementById('sigma-file-picker-photo');
        const filePickerVideo = document.getElementById('sigma-file-picker-video');

        const btnCancelStudent = document.getElementById('sigma-student-btn-cancel');
        const btnDoneStudent = document.getElementById('sigma-student-btn-done');
        const studentPickerBackdrop = document.getElementById('sigma-student-picker-backdrop');

        const discardBackdrop = document.getElementById('sigma-discard-dialog-backdrop');
        const btnDiscardCancel = document.getElementById('sigma-discard-btn-cancel');
        const btnDiscardConfirm = document.getElementById('sigma-discard-btn-confirm');

        function openDiscardDialog() {
            if (discardBackdrop) discardBackdrop.classList.add('active');
        }

        function closeDiscardDialog() {
            if (discardBackdrop) discardBackdrop.classList.remove('active');
        }

        if (btnDiscardCancel) {
            btnDiscardCancel.addEventListener('click', closeDiscardDialog);
        }

        if (btnDiscardConfirm) {
            btnDiscardConfirm.addEventListener('click', () => {
                closeDiscardDialog();
                // Reset inputs and attachments on discard
                const titleInput = document.getElementById('sigma-composer-input-title');
                const bodyInput = document.getElementById('sigma-composer-input-body');
                if (titleInput) titleInput.value = '';
                if (bodyInput) bodyInput.innerHTML = '';
                attachedImages = [];
                attachedFile = null;
                renderAttachmentPreview();
                closeComposerModal();
            });
        }

        if (discardBackdrop) {
            discardBackdrop.addEventListener('click', (e) => {
                if (e.target === discardBackdrop) closeDiscardDialog();
            });
        }

        function attemptCloseComposer() {
            const executeDiscard = () => {
                const titleInput = document.getElementById('sigma-composer-input-title');
                const bodyInput = document.getElementById('sigma-composer-input-body');
                if (titleInput) titleInput.value = '';
                if (bodyInput) bodyInput.innerHTML = '';
                attachedImages = [];
                attachedFile = null;
                renderAttachmentPreview();
                closeComposerModal();
            };

            if (editingPostId && originalEditingPostState && typeof getComposerStateSnapshot === 'function') {
                const hasChanges = getComposerStateSnapshot() !== originalEditingPostState;
                if (hasChanges) {
                    if (typeof window.openAskingPanel === 'function') {
                        window.openAskingPanel({
                            title: 'Discard Changes?',
                            message: 'You have unsaved changes in your announcement. If you leave now, your changes will be discarded.',
                            type: 'warning',
                            icon: 'fa-solid fa-triangle-exclamation text-amber-500',
                            confirmText: 'Discard',
                            cancelText: 'Keep Editing',
                            showCancel: true,
                            onConfirm: executeDiscard
                        });
                    } else {
                        openDiscardDialog();
                    }
                    return;
                }
                closeComposerModal();
                return;
            }

            const title = (document.getElementById('sigma-composer-input-title')?.value || '').trim();
            const body = (document.getElementById('sigma-composer-input-body')?.innerText || '').trim();
            const hasMedia = (Array.isArray(attachedImages) && attachedImages.length > 0) || attachedFile !== null;
            const hasChanges = title.length > 0 || body.length > 0 || hasMedia;

            if (hasChanges) {
                if (typeof window.openAskingPanel === 'function') {
                    window.openAskingPanel({
                        title: 'Discard Announcement?',
                        message: 'You have unsaved changes in your announcement. If you leave now, everything you typed will be lost.',
                        type: 'warning',
                        icon: 'fa-solid fa-triangle-exclamation text-amber-500',
                        confirmText: 'Discard',
                        cancelText: 'Keep Editing',
                        showCancel: true,
                        onConfirm: executeDiscard
                    });
                } else {
                    openDiscardDialog();
                }
                return;
            }
            closeComposerModal();
        }

        currentAttemptCloseComposer = attemptCloseComposer;

        const composerBackBtn = document.getElementById('sigma-composer-back-btn') || backdrop.querySelector('.sigma-composer-back-btn');
        if (composerBackBtn) {
            composerBackBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                attemptCloseComposer();
            };
        }

        // Close on X click (if present)
        if (closeBtn) closeBtn.addEventListener('click', attemptCloseComposer);

        // Close on clicking backdrop outside the modal
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) attemptCloseComposer();
        });

        if (studentPickerBackdrop) {
            studentPickerBackdrop.addEventListener('click', (e) => {
                if (e.target === studentPickerBackdrop) closeStudentPickerModal();
            });
        }

        // Close on ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const viewer = document.getElementById('sigma-targeted-students-viewer-backdrop');
                if (viewer && viewer.classList.contains('active')) {
                    closeTargetedStudentsViewer();
                } else if (discardBackdrop && discardBackdrop.classList.contains('active')) {
                    closeDiscardDialog();
                } else if (studentPickerBackdrop && studentPickerBackdrop.classList.contains('active')) {
                    closeStudentPickerModal();
                } else if (backdrop && backdrop.classList.contains('active')) {
                    attemptCloseComposer();
                }
            }
        });

        // Student Picker Buttons
        if (pillStudents) {
            pillStudents.addEventListener('click', (e) => {
                e.stopPropagation();
                openStudentPickerModal();
            });
        }

        if (btnCancelStudent) {
            btnCancelStudent.addEventListener('click', closeStudentPickerModal);
        }

        if (btnDoneStudent) {
            btnDoneStudent.addEventListener('click', () => {
                const students = getStudentsForCurrentSection();
                const labelEl = document.getElementById('sigma-composer-students-label');
                if (tempSelectedStudentIds.length === 0 || tempSelectedStudentIds.length === students.length) {
                    selectedStudentIds = []; // All students
                    if (labelEl) {
                        labelEl.textContent = 'All students';
                        labelEl.title = 'All students';
                    }
                } else if (tempSelectedStudentIds.length === 1) {
                    selectedStudentIds = [...tempSelectedStudentIds];
                    const matched = students.find(s => s.id === selectedStudentIds[0]);
                    const studentName = matched ? matched.name : '1 student';
                    if (labelEl) {
                        labelEl.textContent = studentName;
                        labelEl.title = studentName;
                    }
                } else {
                    selectedStudentIds = [...tempSelectedStudentIds];
                    if (labelEl) {
                        labelEl.textContent = `${selectedStudentIds.length} students`;
                        labelEl.title = `${selectedStudentIds.length} students`;
                    }
                }
                closeStudentPickerModal();
            });
        }

        // Helper functions for contenteditable rich text body
        function sanitizeNonText(node) {
            if (!node) return;
            const nonText = node.querySelectorAll('img, video, audio, svg, canvas, iframe, object, embed, picture, source');
            if (nonText.length > 0) {
                nonText.forEach(el => el.remove());
            }
        }

        function getBodyHtml() {
            if (!bodyInput) return '';
            sanitizeNonText(bodyInput);
            return bodyInput.innerHTML.trim();
        }

        function getBodyText() {
            if (!bodyInput) return '';
            sanitizeNonText(bodyInput);
            return bodyInput.innerText.trim();
        }

        function setBodyHtml(html) {
            if (!bodyInput) return;
            const temp = document.createElement('div');
            temp.innerHTML = html || '';
            sanitizeNonText(temp);
            bodyInput.innerHTML = temp.innerHTML;
        }

        function updateToolbarActiveStates() {
            if (!bodyInput) return;
            const formatToolBtns = document.querySelectorAll('.sigma-composer-tool-btn');
            formatToolBtns.forEach(btn => {
                const tool = btn.getAttribute('data-tool');
                let isActive = false;
                try {
                    if (tool === 'bold') isActive = document.queryCommandState('bold');
                    else if (tool === 'italic') isActive = document.queryCommandState('italic');
                    else if (tool === 'underline') isActive = document.queryCommandState('underline');
                    else if (tool === 'bullet') isActive = document.queryCommandState('insertUnorderedList');
                    else if (tool === 'number') isActive = document.queryCommandState('insertOrderedList');
                } catch (err) {}
                if (isActive) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }

        if (titleInput) {
            titleInput.addEventListener('input', () => {
                if (titleInput.value.length > MAX_TITLE_CHARS) {
                    titleInput.value = titleInput.value.slice(0, MAX_TITLE_CHARS);
                }
                validateInputs();
            });
        }
        if (bodyInput) {
            const editorBox = bodyInput.closest('.sigma-composer-editor-box');

            const handleBodyInputLimit = (e) => {
                sanitizeNonText(bodyInput);
                const text = bodyInput.innerText || '';
                if (text.length > MAX_BODY_CHARS) {
                    showToastNotice({
                        title: 'Character Limit Reached',
                        message: `The description cannot exceed ${MAX_BODY_CHARS.toLocaleString()} characters.`,
                        type: 'warning'
                    });
                }
                validateInputs();
                updateToolbarActiveStates();
            };

            bodyInput.addEventListener('input', handleBodyInputLimit);
            bodyInput.addEventListener('keyup', updateToolbarActiveStates);
            bodyInput.addEventListener('mouseup', updateToolbarActiveStates);
            bodyInput.addEventListener('focus', () => {
                if (editorBox) editorBox.classList.add('focused');
                updateToolbarActiveStates();
            });
            bodyInput.addEventListener('blur', () => {
                if (editorBox) editorBox.classList.remove('focused');
            });

            // Mobile & desktop touch/wheel event protection: stop propagation so global locks never intercept scrolling
            const stopScrollPropagation = (e) => {
                e.stopPropagation();
            };
            bodyInput.addEventListener('touchmove', stopScrollPropagation, { passive: true });
            bodyInput.addEventListener('touchstart', stopScrollPropagation, { passive: true });
            bodyInput.addEventListener('touchend', stopScrollPropagation, { passive: true });
            bodyInput.addEventListener('wheel', stopScrollPropagation, { passive: true });

            // Drag and drop restrictions: reject images and files
            bodyInput.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (e.dataTransfer && e.dataTransfer.types) {
                    const types = Array.from(e.dataTransfer.types || []);
                    if (types.includes('Files')) {
                        e.dataTransfer.dropEffect = 'none';
                    }
                }
            });

            bodyInput.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const dt = e.dataTransfer;
                if (!dt) return;

                let hasFiles = (dt.files && dt.files.length > 0);
                if (!hasFiles && dt.items) {
                    for (let i = 0; i < dt.items.length; i++) {
                        if (dt.items[i].kind === 'file' || (dt.items[i].type && dt.items[i].type.startsWith('image/'))) {
                            hasFiles = true;
                            break;
                        }
                    }
                }

                if (hasFiles) {
                    showToastNotice({
                        title: 'Images Not Allowed',
                        message: 'Images cannot be placed in the description. Use "Attach to Announcement" below to add photos.',
                        type: 'warning'
                    });
                    return;
                }

                const text = dt.getData('text/plain');
                if (text) {
                    document.execCommand('insertText', false, text);
                    handleBodyInputLimit();
                }
            });

            // Paste restrictions: STRICTLY allow ONLY plain text, NO images or non-text
            bodyInput.addEventListener('paste', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const clipboardData = e.clipboardData || window.clipboardData;
                if (!clipboardData) return;

                let hasImageOrFile = false;
                if (clipboardData.files && clipboardData.files.length > 0) {
                    hasImageOrFile = true;
                } else if (clipboardData.items) {
                    for (let i = 0; i < clipboardData.items.length; i++) {
                        const item = clipboardData.items[i];
                        if (item.kind === 'file' || (item.type && item.type.toLowerCase().startsWith('image/'))) {
                            hasImageOrFile = true;
                            break;
                        }
                    }
                }

                const htmlData = clipboardData.getData('text/html') || '';
                const hasImgTags = /<img[\s\S]*?>/i.test(htmlData);
                let text = clipboardData.getData('text/plain') || '';

                if (hasImageOrFile || (hasImgTags && !text.trim())) {
                    showToastNotice({
                        title: 'Images Not Allowed',
                        message: 'Images cannot be pasted into the description. Use "Attach to Announcement" below to add photos.',
                        type: 'warning'
                    });
                    if (!text.trim()) {
                        return;
                    }
                } else if (hasImgTags) {
                    showToastNotice({
                        title: 'Images Removed',
                        message: 'Images were stripped from pasted content. Only text was inserted.',
                        type: 'warning'
                    });
                }

                if (text) {
                    const currentText = bodyInput.innerText || '';
                    const remaining = MAX_BODY_CHARS - currentText.length;
                    if (remaining <= 0) {
                        showToastNotice({
                            title: 'Description Limit Exceeded',
                            message: `The description cannot exceed ${MAX_BODY_CHARS.toLocaleString()} characters.`,
                            type: 'warning'
                        });
                        return;
                    }
                    if (text.length > remaining) {
                        text = text.slice(0, remaining);
                        showToastNotice({
                            title: 'Text Truncated',
                            message: `Pasted text was truncated to stay within the ${MAX_BODY_CHARS.toLocaleString()} character limit.`,
                            type: 'warning'
                        });
                    }
                    document.execCommand('insertText', false, text);
                    handleBodyInputLimit();
                }
            });

            // MutationObserver to clean up any dynamically added images or non-text tags
            try {
                const bodyObserver = new MutationObserver(() => {
                    const nonText = bodyInput.querySelectorAll('img, video, audio, svg, canvas, iframe, object, embed, picture, source');
                    if (nonText.length > 0) {
                        nonText.forEach(el => el.remove());
                        handleBodyInputLimit();
                        showToastNotice({
                            title: 'Images Not Allowed',
                            message: 'Non-text content was removed. Only text is allowed in descriptions.',
                            type: 'warning'
                        });
                    }
                });
                bodyObserver.observe(bodyInput, { childList: true, subtree: true });
            } catch (err) {}
        }

        document.addEventListener('selectionchange', () => {
            if (document.activeElement === bodyInput) {
                updateToolbarActiveStates();
            }
        });

        function applyTextFormatting(formatType) {
            if (!bodyInput) return;
            bodyInput.focus();

            if (formatType === 'bold') {
                document.execCommand('bold', false, null);
            } else if (formatType === 'italic') {
                document.execCommand('italic', false, null);
            } else if (formatType === 'underline') {
                document.execCommand('underline', false, null);
            } else if (formatType === 'bullet') {
                document.execCommand('insertUnorderedList', false, null);
            } else if (formatType === 'number') {
                document.execCommand('insertOrderedList', false, null);
            }
            validateInputs();
            updateToolbarActiveStates();
        }

        // Toolbar Button click handlers
        const formatToolBtns = document.querySelectorAll('.sigma-composer-tool-btn');
        formatToolBtns.forEach(btn => {
            btn.addEventListener('mousedown', (e) => {
                e.preventDefault(); // Preserve selection in contenteditable div
            });
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const tool = btn.getAttribute('data-tool');
                applyTextFormatting(tool);
            });
        });

        // Ctrl+B, Ctrl+I, Ctrl+U Shortcuts
        if (bodyInput) {
            bodyInput.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
                    e.preventDefault();
                    applyTextFormatting('bold');
                } else if ((e.ctrlKey || e.metaKey) && (e.key === 'i' || e.key === 'I')) {
                    e.preventDefault();
                    applyTextFormatting('italic');
                } else if ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U')) {
                    e.preventDefault();
                    applyTextFormatting('underline');
                }
            });
        }

        function positionComposerDropdown(menu, pill) {
            if (!menu || !pill) return;
            menu.style.left = '0';
            menu.style.right = 'auto';
            menu.style.width = 'max-content';
            menu.style.minWidth = '0';
            menu.style.maxWidth = 'calc(100vw - 24px)';

            const pillRect = pill.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const padding = 12;

            const composerModal = pill.closest('.sigma-composer-modal') || document.body;
            const modalRect = composerModal.getBoundingClientRect();
            const availableRight = Math.min(viewportWidth - padding, modalRect.right - padding);
            const menuWidth = menu.offsetWidth || 200;

            if (pillRect.left + menuWidth > availableRight) {
                const overflow = (pillRect.left + menuWidth) - availableRight;
                menu.style.left = `${-Math.max(0, overflow)}px`;
                menu.style.right = 'auto';
            } else {
                menu.style.left = '0';
                menu.style.right = 'auto';
            }
        }

        // Audience Dropdown Toggle & Rendering
        pillAudience.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isAudienceLocked) {
                return;
            }
            if (menuPriority) menuPriority.classList.remove('show');
            renderAudienceDropdown();
            menuAudience.classList.toggle('show');
            if (menuAudience.classList.contains('show')) {
                positionComposerDropdown(menuAudience, pillAudience);
            }
        });

        // Priority Dropdown Toggle & Rendering (if present)
        if (pillPriority && menuPriority) {
            pillPriority.addEventListener('click', (e) => {
                e.stopPropagation();
                if (menuAudience) menuAudience.classList.remove('show');
                renderPriorityDropdown();
                menuPriority.classList.toggle('show');
                if (menuPriority.classList.contains('show')) {
                    positionComposerDropdown(menuPriority, pillPriority);
                }
            });
        }

        // Close dropdowns on outside click
        document.addEventListener('click', () => {
            if (menuAudience) menuAudience.classList.remove('show');
            if (menuPriority) menuPriority.classList.remove('show');
        });

        // Reposition on window resize if open
        window.addEventListener('resize', () => {
            if (menuAudience && menuAudience.classList.contains('show') && pillAudience) {
                positionComposerDropdown(menuAudience, pillAudience);
            }
            if (menuPriority && menuPriority.classList.contains('show') && pillPriority) {
                positionComposerDropdown(menuPriority, pillPriority);
            }
        });

        // Photo / Video picker triggers (Guaranteed cross-platform trigger for mobile & desktop)
        function triggerPhotoPicker(e) {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            if (filePickerPhoto) filePickerPhoto.click();
        }

        function triggerVideoPicker(e) {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            if (filePickerVideo) filePickerVideo.click();
        }

        if (btnAddPhoto) {
            btnAddPhoto.addEventListener('click', triggerPhotoPicker);
        }
        if (btnAddVideo) {
            btnAddVideo.addEventListener('click', triggerVideoPicker);
        }

        filePickerPhoto.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files || []);
            if (files.length === 0) return;

            const remaining = MAX_ATTACHED_PHOTOS - attachedImages.length;
            if (remaining <= 0) {
                showToastNotice({
                    title: 'Maximum Photos Reached',
                    message: `You have reached the maximum limit of ${MAX_ATTACHED_PHOTOS} pictures per post.`,
                    type: 'warning'
                });
                filePickerPhoto.value = '';
                return;
            }

            if (files.length > remaining) {
                showToastNotice({
                    title: 'Photo Limit Notice',
                    message: `You can only attach up to ${MAX_ATTACHED_PHOTOS} pictures. Only the first ${remaining} picture(s) were added.`,
                    type: 'warning'
                });
            }

            const filesToProcess = files.slice(0, remaining);
            attachedFile = null; // Clear attached video when adding pictures

            for (const file of filesToProcess) {
                try {
                    const dataUrl = await compressImageFile(file, 1280, 1280, 0.82);
                    if (dataUrl) {
                        attachedImages.push({
                            type: 'image',
                            dataUrl: dataUrl,
                            sizeBytes: Math.round((dataUrl.length * 3) / 4),
                            name: file.name
                        });
                    }
                } catch (err) {
                    console.warn('Failed to compress image file', err);
                }
            }

            renderAttachmentPreview();
            validateInputs();
            filePickerPhoto.value = '';
        });

        filePickerVideo.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const limitMB = getMaxVideoLimitMB();
            const sizeMB = file.size / (1024 * 1024);
            const isExceeded = sizeMB > limitMB;

            const reader = new FileReader();
            reader.onload = (loadEvt) => {
                attachedImages = []; // Clear pictures when attaching a video
                attachedFile = {
                    type: 'video',
                    dataUrl: loadEvt.target.result,
                    sizeBytes: file.size,
                    sizeMB: sizeMB.toFixed(1),
                    limitMB: limitMB,
                    isExceeded: isExceeded,
                    name: file.name
                };
                renderAttachmentPreview();
                validateInputs();
            };
            reader.readAsDataURL(file);
            filePickerVideo.value = '';
        });

        // Important toggle quick action (Allows toggling on and off cleanly on mobile and desktop)
        if (btnToggleImportant) {
            btnToggleImportant.addEventListener('click', (e) => {
                if (e) {
                    e.preventDefault();
                    e.stopPropagation();
                }
                if (activePriority === 'important') {
                    activePriority = 'normal';
                    activePriorityLabel = 'Announcement';
                    activePriorityIcon = 'fa-bullhorn';
                    btnToggleImportant.classList.remove('active');
                    btnToggleImportant.setAttribute('title', 'Mark as Important');
                } else {
                    activePriority = 'important';
                    activePriorityLabel = 'Important';
                    activePriorityIcon = 'fa-star';
                    btnToggleImportant.classList.add('active');
                    btnToggleImportant.setAttribute('title', 'Marked as Important (Click to unmark)');
                }
                btnToggleImportant.blur(); // Clear mobile touch hover/focus state immediately

                const priLabelEl = document.getElementById('sigma-composer-priority-label');
                if (priLabelEl) priLabelEl.textContent = activePriorityLabel;
                const priIconEl = document.getElementById('sigma-composer-priority-icon');
                if (priIconEl) priIconEl.className = `fa-solid ${activePriorityIcon} text-black-fade`;

                const priMenu = document.getElementById('sigma-composer-priority-menu');
                if (priMenu) {
                    priMenu.querySelectorAll('.sigma-dropdown-item').forEach(btn => {
                        btn.classList.toggle('active', btn.getAttribute('data-priority') === activePriority);
                    });
                }

                validateInputs();
            });
        }

        // Submit Post
        submitBtn.addEventListener('click', () => {
            const title = (titleInput?.value || '').trim();
            const rawHtml = bodyInput ? bodyInput.innerHTML.trim() : '';
            const plainText = bodyInput ? bodyInput.innerText.trim() : '';
            const body = plainText.length > 0 ? rawHtml : '';
            const hasMedia = attachedImages.length > 0 || attachedFile !== null;
            if (!title && !body && !hasMedia) return;

            // Enforce Section & Subject selection for teachers
            if (currentRole === 'teacher' && (!activeAudience || !activeSubject || activeAudience === '' || activeAudienceLabel === 'Select a section and subject')) {
                showToastNotice({
                    title: 'Select Section & Subject',
                    message: 'Please select a section and subject before posting your announcement.',
                    type: 'warning'
                });
                const pillAud = document.getElementById('sigma-composer-pill-audience');
                const menuAud = document.getElementById('sigma-composer-audience-menu');
                if (pillAud) {
                    pillAud.focus();
                    pillAud.classList.add('ring-2', 'ring-amber-400');
                    setTimeout(() => pillAud.classList.remove('ring-2', 'ring-amber-400'), 2500);
                }
                if (menuAud && !menuAud.classList.contains('show') && pillAud) {
                    renderAudienceDropdown();
                    menuAud.classList.add('show');
                    positionComposerDropdown(menuAud, pillAud);
                }
                return;
            }

            submitBtn.disabled = true;
            const origContent = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-sm mr-2"></i><span>' + (editingPostId ? 'Saving changes...' : 'Posting...') + '</span>';

            setTimeout(async () => {
                try {
                    const students = getStudentsForCurrentSection();
                    const targetedNames = selectedStudentIds.length > 0
                        ? students.filter(s => selectedStudentIds.includes(s.id)).map(s => s.name)
                        : [];
                    const targetStudentsLabel = targetedNames.length > 0
                        ? (targetedNames.length === 1 ? targetedNames[0] : `${targetedNames.length} Students`)
                        : 'All Students';

                    const isVideo = attachedFile && attachedFile.type === 'video';
                    const activePostId = editingPostId || ('ann-' + Date.now());

                    let mediaType = null;
                    let mediaUrl = null;
                    let mediaUrls = [];

                    if (isVideo) {
                        mediaType = 'video';
                        const vidMediaId = `ann_vid_${activePostId}`;
                        await storeMediaBlob(vidMediaId, attachedFile.dataUrl);
                        mediaUrl = `idb:${vidMediaId}`;
                        mediaUrls = [`idb:${vidMediaId}`];
                    } else if (attachedImages.length > 0) {
                        mediaType = attachedImages.length === 1 ? 'image' : 'images';
                        mediaUrls = await Promise.all(attachedImages.map(async (img, idx) => {
                            if (typeof img.dataUrl === 'string' && img.dataUrl.startsWith('idb:')) {
                                return img.dataUrl;
                            }
                            const imgMediaId = `ann_img_${activePostId}_${idx}`;
                            await storeMediaBlob(imgMediaId, img.dataUrl);
                            return `idb:${imgMediaId}`;
                        }));
                        mediaUrl = mediaUrls[0] || null;
                    }

                    const posts = getStoredAnnouncements();

                    let postSectionRoom = '';
                    if (currentRole === 'teacher') {
                        const assigned = getTeacherAssignedSections();
                        const matchedSec = assigned.find(s => {
                            const sName = String(s.name || '').toLowerCase();
                            const aud = String(activeAudience).toLowerCase();
                            const audLbl = String(activeAudienceLabel).toLowerCase();
                            return aud === sName || aud.includes(sName) || audLbl.includes(sName);
                        });
                        if (matchedSec) {
                            postSectionRoom = getSectionRoom(matchedSec);
                        }
                    }

                    if (editingPostId) {
                        const existingIndex = posts.findIndex(p => String(p.id) === String(editingPostId));
                        if (existingIndex !== -1) {
                            posts[existingIndex].title = title || '';
                            posts[existingIndex].body = body;
                            posts[existingIndex].audience = activeAudience;
                            posts[existingIndex].audienceLabel = stripRoomFromLabel(activeAudienceLabel, postSectionRoom);
                            posts[existingIndex].audienceIcon = activeAudienceIcon;
                            posts[existingIndex].subject = activeSubject || (activeClassroomKey ? activeClassroomKey.split('::')[1] : (posts[existingIndex].subject || ''));
                            posts[existingIndex].classroomKey = activeClassroomKey || (activeAudience && activeSubject ? `${activeAudience}::${activeSubject}` : (posts[existingIndex].classroomKey || ''));
                            posts[existingIndex].sectionName = activeAudience ? String(activeAudience).split('::')[0] : '';
                            posts[existingIndex].sectionRoom = postSectionRoom;
                            posts[existingIndex].priority = activePriority;
                            posts[existingIndex].priorityLabel = activePriorityLabel;
                            posts[existingIndex].priorityIcon = activePriorityIcon;
                            posts[existingIndex].isImportant = (activePriority === 'important');
                            if (activePriority === 'important') {
                                posts[existingIndex].type = 'important';
                            } else if (posts[existingIndex].type === 'urgent' || posts[existingIndex].type === 'important') {
                                posts[existingIndex].type = 'announcement';
                            }
                            posts[existingIndex].mediaType = mediaType;
                            posts[existingIndex].mediaUrl = mediaUrl;
                            posts[existingIndex].mediaUrls = mediaUrls;
                            posts[existingIndex].targetStudentIds = [...selectedStudentIds];
                            posts[existingIndex].targetStudents = targetedNames;
                            posts[existingIndex].targetStudentsLabel = targetStudentsLabel;
                        }
                    } else {
                        const resolvedClassroomKey = activeClassroomKey || (activeAudience && activeSubject ? `${activeAudience}::${activeSubject}` : '');
                        const newPost = {
                            id: activePostId,
                            title: title || '',
                            body: body,
                            authorId: currentUser.id || currentUser.uid || '',
                            authorName: currentUser.name,
                            authorRole: currentUser.role,
                            authorAvatar: currentUser.avatar,
                            audience: activeAudience,
                            audienceLabel: stripRoomFromLabel(activeAudienceLabel, postSectionRoom),
                            audienceIcon: activeAudienceIcon,
                            subject: activeSubject || (resolvedClassroomKey ? resolvedClassroomKey.split('::')[1] : ''),
                            classroomKey: resolvedClassroomKey,
                            sectionName: activeAudience ? String(activeAudience).split('::')[0] : '',
                            sectionRoom: postSectionRoom,
                            targetStudentIds: [...selectedStudentIds],
                            targetStudents: targetedNames,
                            targetStudentsLabel: currentRole === 'teacher' ? targetStudentsLabel : '',
                            priority: activePriority,
                            priorityLabel: activePriorityLabel,
                            priorityIcon: activePriorityIcon,
                            isImportant: (activePriority === 'important'),
                            mediaType: mediaType,
                            mediaUrl: mediaUrl,
                            mediaUrls: mediaUrls,
                            createdAt: new Date().toISOString(),
                            likes: 0,
                            likedByMe: false,
                            comments: []
                        };
                        posts.unshift(newPost);
                    }

                    saveStoredAnnouncements(posts);
                    closeComposerModal();
                    currentActiveTab = 'all';
                    refreshAllFeeds();
                    showToastNotice({
                        title: editingPostId ? 'Announcement Updated' : 'Announcement Posted',
                        message: editingPostId ? 'Your changes have been saved successfully.' : 'Your announcement has been posted successfully.',
                        type: 'success'
                    });
                } catch (err) {
                    console.error('[Announcements] Failed to submit post:', err);
                    showToastNotice({
                        title: 'Posting Error',
                        message: 'An error occurred while saving the announcement. Please try again.',
                        type: 'error'
                    });
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = origContent;
                }
            }, 50);
        });
    }

    function renderAudienceDropdown() {
        const menu = document.getElementById('sigma-composer-audience-menu');
        if (!menu) return;
        const groups = getAudienceOptionsForRole();
        let html = '';
        groups.forEach(g => {
            if (g.group) {
                html += `<div class="sigma-dropdown-group-title">${g.group}</div>`;
            }
            if (g.empty || !g.options || g.options.length === 0) {
                html += `
                <div class="px-3 py-4 text-center text-xs text-slate-500 font-['Inter'] flex flex-col items-center justify-center gap-1.5 select-none">
                    <i class="fa-solid fa-folder-open text-base text-slate-300"></i>
                    <span>No sections assigned yet</span>
                </div>`;
            } else {
                html += `<div class="sigma-dropdown-scroll-list">`;
                g.options.forEach(opt => {
                    let isSelected = false;
                    const optKey = String(opt.classroomKey || opt.key || '').trim().toLowerCase();
                    const curClassKey = String(activeClassroomKey || (activeAudience && activeSubject ? `${activeAudience}::${activeSubject}` : '')).trim().toLowerCase();
                    const curAudience = String(activeAudience || '').trim().toLowerCase();
                    const curSubject = String(activeSubject || '').trim().toLowerCase();
                    const optSubject = String(opt.subject || '').trim().toLowerCase();
                    const optSection = String(opt.sectionName || '').trim().toLowerCase();
                    const optLabel = String(opt.label || '').trim().toLowerCase();
                    const curLabel = String(activeAudienceLabel || '').trim().toLowerCase();

                    if (curClassKey && optKey) {
                        isSelected = (optKey === curClassKey);
                    } else if (optSubject && curSubject) {
                        const secMatches = (optSection === curAudience || optKey.startsWith(curAudience + '::') || optLabel === curLabel || curLabel.includes(optSection));
                        isSelected = secMatches && (optSubject === curSubject);
                    } else if (!optSubject && !curSubject) {
                        isSelected = (optKey === curAudience || optLabel === curLabel || opt.key === activeAudience);
                    } else {
                        isSelected = (optLabel === curLabel && (optKey === curAudience || optSection === curAudience));
                    }

                    const cleanItemLabel = stripRoomFromLabel(opt.label, opt.room) || opt.label;
                    html += `
                    <button type="button" class="sigma-dropdown-item ${isSelected ? 'active' : ''}" 
                        data-audience="${opt.sectionName || opt.key}" 
                        data-subject="${opt.subject || ''}" 
                        data-classroom-key="${opt.classroomKey || ''}" 
                        data-label="${cleanItemLabel}" 
                        data-icon="${opt.icon}" 
                        title="${cleanItemLabel}">
                        <span class="sigma-dropdown-item-text">${cleanItemLabel}</span>
                    </button>`;
                });
                html += `</div>`;
            }
        });
        menu.innerHTML = html;

        menu.querySelectorAll('.sigma-dropdown-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                activeAudience = btn.getAttribute('data-audience');
                activeSubject = btn.getAttribute('data-subject') || '';
                activeClassroomKey = btn.getAttribute('data-classroom-key') || (activeAudience && activeSubject ? `${activeAudience}::${activeSubject}` : '');
                activeAudienceLabel = stripRoomFromLabel(btn.getAttribute('data-label'));
                activeAudienceIcon = btn.getAttribute('data-icon') || 'fa-users';

                const labelEl = document.getElementById('sigma-composer-audience-label');
                if (labelEl) labelEl.textContent = activeAudienceLabel;
                const iconEl = document.getElementById('sigma-composer-audience-icon');
                if (iconEl) iconEl.className = `fa-solid ${activeAudienceIcon} text-black-fade`;

                menu.querySelectorAll('.sigma-dropdown-item').forEach(item => {
                    item.classList.toggle('active', item === btn);
                });

                // Reset student target to All students when section is changed
                selectedStudentIds = [];
                const studentsLabelEl = document.getElementById('sigma-composer-students-label');
                if (studentsLabelEl) studentsLabelEl.textContent = 'All students';

                menu.classList.remove('show');
                validateInputs();
            });
        });
    }

    function renderPriorityDropdown() {
        const menu = document.getElementById('sigma-composer-priority-menu');
        if (!menu) return;
        let html = '<div class="sigma-dropdown-scroll-list">';
        PRIORITY_OPTIONS.forEach(opt => {
            const isSelected = opt.key === activePriority;
            html += `
            <button type="button" class="sigma-dropdown-item ${isSelected ? 'active' : ''}" data-priority="${opt.key}" data-label="${opt.label}" data-icon="${opt.icon}" title="${opt.label}">
                <i class="fa-solid ${opt.icon}"></i>
                <span class="sigma-dropdown-item-text">${opt.label}</span>
            </button>`;
        });
        html += '</div>';
        menu.innerHTML = html;

        menu.querySelectorAll('.sigma-dropdown-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                activePriority = btn.getAttribute('data-priority');
                activePriorityLabel = btn.getAttribute('data-label');
                activePriorityIcon = btn.getAttribute('data-icon') || 'fa-bullhorn';

                const labelEl = document.getElementById('sigma-composer-priority-label');
                if (labelEl) labelEl.textContent = activePriorityLabel;
                const iconEl = document.getElementById('sigma-composer-priority-icon');
                if (iconEl) iconEl.className = `fa-solid ${activePriorityIcon} text-black-fade`;

                const btnToggle = document.getElementById('sigma-composer-btn-toggle-important');
                if (btnToggle) {
                    if (activePriority === 'important') {
                        btnToggle.classList.add('active');
                        btnToggle.setAttribute('title', 'Marked as Important (Click to unmark)');
                    } else {
                        btnToggle.classList.remove('active');
                        btnToggle.setAttribute('title', 'Mark as Important');
                    }
                }

                menu.classList.remove('show');
                validateInputs();
            });
        });
    }

    function renderAttachmentPreview() {
        const container = document.getElementById('sigma-composer-attachments-container');
        if (!container) return;

        const modalEl = document.querySelector('#sigma-composer-modal-backdrop .sigma-composer-modal');
        const hasMedia = (attachedImages && attachedImages.length > 0) || (attachedFile !== null);
        if (modalEl) {
            if (hasMedia) {
                modalEl.classList.add('has-media');
            } else {
                modalEl.classList.remove('has-media');
            }
        }

        if (attachedImages.length === 0 && !attachedFile) {
            container.style.display = 'none';
            container.innerHTML = '';
            return;
        }

        container.style.display = 'flex';
        let previewContent = '';

        if (attachedImages.length > 0) {
            const count = attachedImages.length;
            if (count === 1) {
                // 1 uploaded image: whole pic inside dialog panel
                previewContent = `
                <div class="sigma-composer-preview-header-bar">
                    <span class="sigma-composer-preview-counter">Attached Photo (1/${MAX_ATTACHED_PHOTOS})</span>
                    <button type="button" class="sigma-composer-btn-add-more" id="sigma-composer-btn-add-more-photos">+ Add more</button>
                </div>
                <div class="sigma-attachment-item sigma-composer-single-photo-box">
                    <img src="${attachedImages[0].dataUrl}" alt="Attached photo">
                    <button type="button" class="sigma-attachment-remove-btn" onclick="window.SigmaAnnouncements.removeAttachedImage(0)" title="Remove photo">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>`;
            } else {
                // 2 or more uploaded images: strictly 2 columns with tight spacing (compact rows)
                const isPairOnly = (count === 2);
                previewContent = `
                <div class="sigma-composer-preview-header-bar">
                    <span class="sigma-composer-preview-counter">Attached Photos (${count}/${MAX_ATTACHED_PHOTOS})</span>
                    ${count < MAX_ATTACHED_PHOTOS ? '<button type="button" class="sigma-composer-btn-add-more" id="sigma-composer-btn-add-more-photos">+ Add more</button>' : ''}
                </div>
                <div class="sigma-composer-multi-preview-grid ${isPairOnly ? 'is-pair-only' : ''}">
                    ${attachedImages.map((img, idx) => `
                        <div class="sigma-composer-preview-thumb-box">
                            <img src="${img.dataUrl}" alt="Photo ${idx + 1}">
                            <button type="button" class="sigma-composer-preview-thumb-remove" onclick="window.SigmaAnnouncements.removeAttachedImage(${idx})" title="Remove photo">
                                <i class="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                    `).join('')}
                </div>`;
            }
        } else if (attachedFile && attachedFile.type === 'video') {
            previewContent = `
            <div class="sigma-attachment-item sigma-composer-video-preview-item">
                <video src="${attachedFile.dataUrl}" controls preload="metadata"></video>
                <div class="sigma-attachment-meta-badge">
                    🎥 ${attachedFile.sizeMB} MB / ${attachedFile.limitMB} MB limit
                </div>
                <button type="button" class="sigma-attachment-remove-btn" id="sigma-composer-btn-remove-attachment" title="Remove video">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>`;

            if (attachedFile.isExceeded) {
                previewContent += `
                <div class="sigma-attachment-size-warning">
                    <i class="fa-solid fa-circle-exclamation text-base"></i>
                    <span>This video is ${attachedFile.sizeMB} MB, exceeding the maximum allowed size of ${attachedFile.limitMB} MB set in Admin Settings.</span>
                </div>`;
            }
        }

        container.innerHTML = previewContent;

        const btnAddMore = document.getElementById('sigma-composer-btn-add-more-photos');
        if (btnAddMore) {
            btnAddMore.addEventListener('click', () => {
                const picker = document.getElementById('sigma-file-picker-photo');
                if (picker) picker.click();
            });
        }

        const removeBtn = document.getElementById('sigma-composer-btn-remove-attachment');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                attachedFile = null;
                renderAttachmentPreview();
                validateInputs();
            });
        }
    }

    function openComposerModal(postIdToEdit = null, preselectedAudience = null, preselectedSubject = null) {
        detectContext();
        if (currentRole === 'student') return;
        ensureComposerModalDOM();

        const titleInput = document.getElementById('sigma-composer-input-title');
        const bodyInput = document.getElementById('sigma-composer-input-body');
        const submitBtn = document.getElementById('sigma-composer-btn-submit');
        const modalTitle = document.querySelector('#sigma-composer-modal-backdrop .sigma-composer-title');

        const insideRoom = isCurrentlyInsideClassroomRoom();
        const hasRoomPreselection = Boolean(preselectedAudience && (preselectedSubject || insideRoom));

        if (postIdToEdit) {
            isAudienceLocked = true;
            editingPostId = postIdToEdit;
            const posts = getStoredAnnouncements();
            const post = posts.find(p => String(p.id) === String(postIdToEdit));
            if (post) {
                if (modalTitle) modalTitle.textContent = 'Edit Post';
                if (submitBtn) submitBtn.textContent = 'Save Changes';
                if (titleInput) titleInput.value = post.title || '';
                if (bodyInput) bodyInput.innerHTML = post.body || '';
                activeAudience = post.audience || 'everyone';
                activeSubject = post.subject || (post.classroomKey ? post.classroomKey.split('::')[1] : '');
                activeClassroomKey = post.classroomKey || (activeAudience && activeSubject ? `${activeAudience}::${activeSubject}` : '');
                activeAudienceLabel = post.audienceLabel || (activeSubject ? `${activeAudience} • ${activeSubject}` : 'Public');
                activeAudienceIcon = post.audienceIcon || 'fa-users';
                const isPostImp = post.priority === 'important' || post.priorityLabel === 'Important' || post.type === 'urgent' || Boolean(post.isImportant);
                activePriority = isPostImp ? 'important' : (post.priority || 'normal');
                activePriorityLabel = isPostImp ? 'Important' : (post.priorityLabel || 'Announcement');
                activePriorityIcon = isPostImp ? 'fa-star' : (post.priorityIcon || 'fa-bullhorn');

                // Restore targeted students for this specific post
                if (post.targetStudentIds && Array.isArray(post.targetStudentIds) && post.targetStudentIds.length > 0) {
                    selectedStudentIds = [...post.targetStudentIds];
                } else if (post.targetStudents && Array.isArray(post.targetStudents) && post.targetStudents.length > 0) {
                    const allSecStudents = getStudentsForCurrentSection();
                    selectedStudentIds = allSecStudents.filter(s => post.targetStudents.includes(s.name)).map(s => s.id);
                } else {
                    selectedStudentIds = [];
                }

                const resolveStoredUrl = (u) => {
                    if (typeof u === 'string' && u.startsWith('idb:')) {
                        const mId = u.slice(4);
                        if (window._sigmaMediaMemoryCache && window._sigmaMediaMemoryCache.has(mId)) {
                            return window._sigmaMediaMemoryCache.get(mId);
                        }
                    }
                    return u;
                };

                const isPostVideo = post.mediaType === 'video' || (post.mediaUrl && (post.mediaUrl.startsWith('idb:ann_vid_') || post.mediaUrl.endsWith('.mp4') || (typeof post.mediaUrl === 'string' && post.mediaUrl.startsWith('data:video'))));

                if (isPostVideo) {
                    attachedImages = [];
                    const vUrl = resolveStoredUrl(post.mediaUrl || (post.mediaUrls && post.mediaUrls[0]));
                    attachedFile = {
                        type: 'video',
                        dataUrl: vUrl,
                        sizeBytes: 0,
                        sizeMB: '0.0',
                        limitMB: getMaxVideoLimitMB(),
                        isExceeded: false
                    };
                } else if (post.mediaUrls && post.mediaUrls.length > 0) {
                    attachedImages = post.mediaUrls.map(u => ({ type: 'image', dataUrl: resolveStoredUrl(u), sizeBytes: 0, name: 'photo' }));
                    attachedFile = null;
                } else if (post.mediaType === 'image' && post.mediaUrl) {
                    attachedImages = [{ type: 'image', dataUrl: resolveStoredUrl(post.mediaUrl), sizeBytes: 0, name: 'photo' }];
                    attachedFile = null;
                } else {
                    attachedImages = [];
                    attachedFile = null;
                }
            }
        } else if (hasRoomPreselection || insideRoom) {
            // Inside Classroom Room -> Lock audience to this room & subject
            isAudienceLocked = true;
            editingPostId = null;
            originalEditingPostState = null;
            selectedStudentIds = [];
            if (modalTitle) modalTitle.textContent = 'Create Post';
            if (submitBtn) submitBtn.textContent = 'Post Announcement';
            if (titleInput) titleInput.value = '';
            if (bodyInput) bodyInput.innerHTML = '';
            attachedImages = [];
            attachedFile = null;

            let cleanAud = preselectedAudience || getActiveRoomSectionName();
            let cleanSubj = preselectedSubject || getActiveRoomSubjectName();
            if (cleanAud && cleanAud.includes('::')) {
                const parts = cleanAud.split('::');
                cleanAud = parts[0];
                if (!cleanSubj) cleanSubj = parts[1];
            }
            activeAudience = cleanAud;
            activeSubject = cleanSubj;
            activeClassroomKey = (cleanAud && cleanSubj) ? `${cleanAud}::${cleanSubj}` : cleanAud;

            const assigned = getTeacherAssignedSections();
            const matchedSec = assigned.find(s => {
                const sName = String(s.name || '').toLowerCase();
                const sSubj = String(s.subject || '').toLowerCase();
                const sLabel = String(s.grade || s.gradeLevel ? `${s.grade || s.gradeLevel} - ${s.name}` : s.name).toLowerCase();
                const audMatch = (cleanAud && (cleanAud.toLowerCase() === sName || cleanAud.toLowerCase() === sLabel || cleanAud.toLowerCase().includes(sName)));
                if (cleanSubj) {
                    return audMatch && (sSubj === cleanSubj.toLowerCase() || sSubj.includes(cleanSubj.toLowerCase()));
                }
                return audMatch;
            }) || assigned.find(s => {
                const sName = String(s.name || '').toLowerCase();
                const sLabel = String(s.grade || s.gradeLevel ? `${s.grade || s.gradeLevel} - ${s.name}` : s.name).toLowerCase();
                return cleanAud && (cleanAud.toLowerCase() === sName || cleanAud.toLowerCase() === sLabel || cleanAud.toLowerCase().includes(sName));
            });

            if (matchedSec) {
                const secRoom = getSectionRoom(matchedSec);
                const fullLabel = getSectionFullLabel(matchedSec);
                const rawLabel = matchedSec.subject ? `${fullLabel} • ${matchedSec.subject}` : fullLabel;
                activeAudienceLabel = stripRoomFromLabel(rawLabel, secRoom) || rawLabel;
                if (matchedSec.subject && !activeSubject) activeSubject = matchedSec.subject;
            } else {
                activeAudienceLabel = stripRoomFromLabel(cleanSubj ? `${cleanAud} • ${cleanSubj}` : cleanAud);
            }
            activeAudienceIcon = 'fa-graduation-cap';
            activePriority = 'normal';
            activePriorityLabel = 'Announcement';
            activePriorityIcon = 'fa-bullhorn';
        } else {
            // Home Page / Dashboard -> Unlocked audience picker
            isAudienceLocked = false;
            editingPostId = null;
            originalEditingPostState = null;
            selectedStudentIds = [];
            if (modalTitle) modalTitle.textContent = 'Create Post';
            if (submitBtn) submitBtn.textContent = 'Post Announcement';
            if (titleInput) titleInput.value = '';
            if (bodyInput) bodyInput.innerHTML = '';
            attachedImages = [];
            attachedFile = null;

            if (currentRole === 'teacher') {
                activeAudience = '';
                activeSubject = '';
                activeClassroomKey = '';
                activeAudienceLabel = 'Select a section and subject';
                activeAudienceIcon = 'fa-graduation-cap';
            } else {
                activeAudience = 'everyone';
                activeSubject = '';
                activeClassroomKey = '';
                activeAudienceLabel = 'Public';
                activeAudienceIcon = 'fa-users';
            }
            activePriority = 'normal';
            activePriorityLabel = 'Announcement';
            activePriorityIcon = 'fa-bullhorn';
        }

        const avatarWrap = document.getElementById('sigma-composer-author-avatar-wrap');
        if (avatarWrap && typeof window.renderUserAvatarHtml === 'function') {
            avatarWrap.innerHTML = window.renderUserAvatarHtml(currentUser, 'md');
        }
        const authorNameEl = document.getElementById('sigma-composer-author-name-text');
        if (authorNameEl) authorNameEl.textContent = currentUser.name;
        const composerBody = document.getElementById('sigma-composer-input-body');
        if (composerBody) composerBody.setAttribute('data-placeholder', 'Share updates, announcements, or materials with your class...');

        renderAttachmentPreview();

        if (postIdToEdit) {
            originalEditingPostState = getComposerStateSnapshot();
        } else {
            originalEditingPostState = null;
        }

        validateInputs();

        const studentsContainer = document.getElementById('sigma-composer-pill-students-container');
        if (studentsContainer) {
            studentsContainer.style.display = currentRole === 'teacher' ? 'block' : 'none';
        }
        const studentsLabelEl = document.getElementById('sigma-composer-students-label');
        if (studentsLabelEl) {
            if (selectedStudentIds.length === 0) {
                studentsLabelEl.textContent = 'All students';
                studentsLabelEl.title = 'All students';
            } else if (selectedStudentIds.length === 1) {
                const students = getStudentsForCurrentSection();
                const matched = students.find(s => s.id === selectedStudentIds[0]);
                const studentName = matched ? matched.name : '1 student';
                studentsLabelEl.textContent = studentName;
                studentsLabelEl.title = studentName;
            } else {
                studentsLabelEl.textContent = `${selectedStudentIds.length} students`;
                studentsLabelEl.title = `${selectedStudentIds.length} students`;
            }
        }

        const audLabelEl = document.getElementById('sigma-composer-audience-label');
        if (audLabelEl) audLabelEl.textContent = stripRoomFromLabel(activeAudienceLabel) || activeAudienceLabel;
        const audIconEl = document.getElementById('sigma-composer-audience-icon');
        if (audIconEl) audIconEl.className = `fa-solid ${activeAudienceIcon} text-black-fade`;

        // Update chevron & locked state on audience pill
        const chevronEl = document.getElementById('sigma-composer-audience-chevron');
        const pillAudienceEl = document.getElementById('sigma-composer-pill-audience');
        if (isAudienceLocked) {
            if (chevronEl) chevronEl.style.display = 'none';
            if (pillAudienceEl) {
                pillAudienceEl.classList.add('locked');
                pillAudienceEl.style.cursor = 'default';
                pillAudienceEl.setAttribute('title', 'Locked to this classroom');
            }
        } else {
            if (chevronEl) chevronEl.style.display = '';
            if (pillAudienceEl) {
                pillAudienceEl.classList.remove('locked');
                pillAudienceEl.style.cursor = 'pointer';
                pillAudienceEl.removeAttribute('title');
            }
        }

        const priLabelEl = document.getElementById('sigma-composer-priority-label');
        if (priLabelEl) priLabelEl.textContent = activePriorityLabel;
        const priIconEl = document.getElementById('sigma-composer-priority-icon');
        if (priIconEl) priIconEl.className = `fa-solid ${activePriorityIcon} text-black-fade`;

        const btnToggle = document.getElementById('sigma-composer-btn-toggle-important');
        if (btnToggle) {
            if (activePriority === 'important') {
                btnToggle.classList.add('active');
                btnToggle.setAttribute('title', 'Marked as Important (Click to unmark)');
            } else {
                btnToggle.classList.remove('active');
                btnToggle.setAttribute('title', 'Mark as Important');
            }
        }

        const priMenu = document.getElementById('sigma-composer-priority-menu');
        if (priMenu) {
            priMenu.querySelectorAll('.sigma-dropdown-item').forEach(btn => {
                btn.classList.toggle('active', btn.getAttribute('data-priority') === activePriority);
            });
        }

        renderAudienceDropdown();
        renderPriorityDropdown();

        const backdrop = document.getElementById('sigma-composer-modal-backdrop');
        const modal = backdrop ? backdrop.querySelector('.sigma-composer-modal') : null;
        const isMobileOrTablet = window.innerWidth <= 1024 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (backdrop) {
            if (isMobileOrTablet) {
                backdrop.style.padding = '0';
                backdrop.style.background = '#ffffff';
                if (modal) {
                    modal.style.width = '100vw';
                    modal.style.maxWidth = '100vw';
                    modal.style.minWidth = '100vw';
                    modal.style.height = '100vh';
                    modal.style.maxHeight = '100vh';
                    modal.style.minHeight = '100vh';
                    modal.style.borderRadius = '0';
                    modal.style.border = 'none';
                    modal.style.margin = '0';
                    modal.style.boxShadow = 'none';
                    modal.style.transform = 'none';
                }
            } else {
                backdrop.style.padding = '';
                backdrop.style.background = '';
                if (modal) {
                    modal.style.width = '';
                    modal.style.maxWidth = '';
                    modal.style.minWidth = '';
                    modal.style.height = '';
                    modal.style.maxHeight = '';
                    modal.style.minHeight = '';
                    modal.style.borderRadius = '';
                    modal.style.border = '';
                    modal.style.margin = '';
                    modal.style.boxShadow = '';
                    modal.style.transform = '';
                }
            }
            backdrop.classList.add('active');
            document.body.classList.add('sigma-composer-open');
            document.documentElement.classList.add('sigma-composer-open');
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';
        }
    }

    function closeComposerModal() {
        const backdrop = document.getElementById('sigma-composer-modal-backdrop');
        if (backdrop) backdrop.classList.remove('active');
        document.body.classList.remove('sigma-composer-open');
        document.documentElement.classList.remove('sigma-composer-open');
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
        editingPostId = null;
        originalEditingPostState = null;
        selectedStudentIds = [];
    }

    // Delete Confirmation Dialog Management
    function ensureDeleteDialogDOM() {
        let backdrop = document.getElementById('sigma-delete-dialog-backdrop');
        if (!backdrop) {
            const dialogHTML = `
            <div id="sigma-delete-dialog-backdrop" class="sigma-delete-dialog-backdrop">
                <div class="sigma-delete-dialog">
                    <div class="sigma-delete-icon-circle">
                        <i class="fa-solid fa-trash-can"></i>
                    </div>
                    <h3 class="sigma-delete-dialog-title">Delete Post?</h3>
                    <p class="sigma-delete-dialog-desc">Are you sure you want to delete this post? This action cannot be undone and it will be removed from all feeds.</p>
                    <div class="sigma-delete-dialog-actions">
                        <button type="button" class="sigma-delete-btn-cancel" id="sigma-delete-btn-cancel" onclick="window.SigmaAnnouncements ? window.SigmaAnnouncements.closeDeleteDialog(event) : (window.closeAnnouncementDeleteDialog && window.closeAnnouncementDeleteDialog(event))">Cancel</button>
                        <button type="button" class="sigma-delete-btn-confirm" id="sigma-delete-btn-confirm" onclick="window.SigmaAnnouncements ? window.SigmaAnnouncements.confirmDeletePost(event) : (window.confirmAnnouncementDeletePost && window.confirmAnnouncementDeletePost(event))">Delete</button>
                    </div>
                </div>
            </div>`;
            document.body.insertAdjacentHTML('beforeend', dialogHTML);
            backdrop = document.getElementById('sigma-delete-dialog-backdrop');
        }

        const cancelBtn = document.getElementById('sigma-delete-btn-cancel');
        if (cancelBtn) {
            cancelBtn.onclick = function (e) {
                if (e) { e.preventDefault(); e.stopPropagation(); }
                closeDeleteDialog();
            };
        }

        const confirmBtn = document.getElementById('sigma-delete-btn-confirm');
        if (confirmBtn) {
            confirmBtn.onclick = function (e) {
                if (e) { e.preventDefault(); e.stopPropagation(); }
                confirmDeletePost();
            };
        }

        if (backdrop) {
            backdrop.onclick = function (e) {
                if (e.target === backdrop) closeDeleteDialog();
            };
        }
    }

    function openDeleteDialog(postId) {
        postToDeleteId = postId;
        ensureDeleteDialogDOM();
        const backdrop = document.getElementById('sigma-delete-dialog-backdrop');
        if (backdrop) {
            backdrop.style.display = 'flex';
            requestAnimationFrame(() => {
                backdrop.classList.add('active');
            });
        }
    }

    function closeDeleteDialog(e) {
        if (e && e.preventDefault) e.preventDefault();
        if (e && e.stopPropagation) e.stopPropagation();
        postToDeleteId = null;
        const backdrop = document.getElementById('sigma-delete-dialog-backdrop');
        if (backdrop) {
            backdrop.classList.remove('active');
            setTimeout(() => {
                if (!backdrop.classList.contains('active')) {
                    backdrop.style.display = 'none';
                }
            }, 180);
        }
    }

    function notifyModeratedRemoval(author, title, body) {
        const role = String(author.authorRole || '').toLowerCase();
        const targetRole = role === 'faculty' ? 'teacher' : role;
        if (!['teacher', 'student', 'admin'].includes(targetRole) || (!author.authorId && !author.authorName)) return;
        let sender = {};
        try { sender = JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}'); } catch (_) {}
        const senderId = currentUser.id || sender.id || sender.uid;
        if (author.authorId && String(author.authorId) === String(senderId)) return;
        if (!author.authorId && author.authorName === currentUser.name) return;
        const avatar = (senderId && window.getCurrentUserAvatar?.(senderId))
            || currentUser.avatar || sender.avatar || sender.profilePicture
            || (senderId && localStorage.getItem(`sigma_avatar_${senderId}`)) || '';
        window.SigmaNotifications?.sendToRole(targetRole, {
            id: 'notif_del_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
            senderId, senderName: currentUser.name || sender.fullName || sender.name || 'Moderator',
            avatarImg: avatar, title, body, timestamp: new Date().toISOString(), read: false,
            recipientId: author.authorId || null, recipientName: author.authorName || ''
        });
    }

    function confirmDeletePost(e) {
        if (e && e.preventDefault) e.preventDefault();
        if (e && e.stopPropagation) e.stopPropagation();
        if (!postToDeleteId) {
            closeDeleteDialog();
            return;
        }
        const posts = getStoredAnnouncements();

        const removedPost = posts.find(post => post.id === postToDeleteId);
        if (removedPost && currentRole === 'admin') {
            notifyModeratedRemoval(removedPost, 'Announcement Removed', `Your announcement${removedPost.title ? ` "${removedPost.title}"` : ''} was removed by an administrator.`);
        }
        const updated = posts.filter(p => p.id !== postToDeleteId);
        saveStoredAnnouncements(updated);

        // Also clean up from classroom room specific storage if present
        try {
            const sharedKey = 'sigma-classroom-announcements-v2';
            const rawRoom = localStorage.getItem(sharedKey);
            if (rawRoom) {
                const roomData = JSON.parse(rawRoom);
                let changed = false;
                for (const k in roomData) {
                    if (Array.isArray(roomData[k])) {
                        const beforeLen = roomData[k].length;
                        roomData[k] = roomData[k].filter(p => p && p.id !== postToDeleteId);
                        if (roomData[k].length !== beforeLen) changed = true;
                    }
                }
                if (changed) localStorage.setItem(sharedKey, JSON.stringify(roomData));
            }
        } catch (err) {
            console.error('[Announcements] Error cleaning room posts storage:', err);
        }

        closeDeleteDialog();
        refreshAllFeeds();
        if (typeof window.renderRoomAnnouncementsFeed === 'function') {
            window.renderRoomAnnouncementsFeed();
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // READ-ONLY TARGETED STUDENTS VIEWER MODAL (Non-editable list panel)
    // ═════════════════════════════════════════════════════════════════════════
    function ensureTargetedStudentsViewerDOM() {
        if (document.getElementById('sigma-targeted-students-viewer-backdrop')) return;
        const dialogHTML = `
        <div id="sigma-targeted-students-viewer-backdrop" class="sigma-student-picker-backdrop">
            <div class="sigma-student-picker-card" style="max-width: 400px; padding: 24px; border-radius: 24px; box-shadow: 0 25px 65px rgba(0, 0, 0, 0.25);">
                <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                    <div>
                        <h3 class="text-base font-black text-slate-800 tracking-tight" id="sigma-viewer-title">Students</h3>
                        <p class="text-xs text-slate-900 font-normal mt-0.5" id="sigma-viewer-subtitle">Visible only to these students</p>
                    </div>
                    <button type="button" class="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors" onclick="window.SigmaAnnouncements.closeTargetedStudentsViewer()" title="Close">
                        <i class="fa-solid fa-xmark text-sm"></i>
                    </button>
                </div>

                <div id="sigma-viewer-students-list" class="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                    <!-- Dynamic Read-only Student list -->
                </div>

                <div class="mt-5 pt-3 border-t border-slate-100 flex justify-end">
                    <button type="button" class="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl transition-all shadow-sm cursor-pointer" onclick="window.SigmaAnnouncements.closeTargetedStudentsViewer()">
                        Close
                    </button>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', dialogHTML);

        const backdrop = document.getElementById('sigma-targeted-students-viewer-backdrop');
        if (backdrop) {
            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) closeTargetedStudentsViewer();
            });
        }
    }

    function openTargetedStudentsViewer(postId, e) {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        ensureTargetedStudentsViewerDOM();
        const posts = getStoredAnnouncements();
        const post = posts.find(p => p.id === postId);
        if (!post) return;

        const students = (post.targetStudents && Array.isArray(post.targetStudents) && post.targetStudents.length > 0)
            ? post.targetStudents
            : [];

        const titleEl = document.getElementById('sigma-viewer-title');
        const subtitleEl = document.getElementById('sigma-viewer-subtitle');
        const listEl = document.getElementById('sigma-viewer-students-list');

        if (titleEl) titleEl.textContent = 'Students';
        if (subtitleEl) subtitleEl.textContent = `${students.length} Student${students.length > 1 ? 's' : ''} Can See This Announcement`;

        if (listEl) {
            const COLORS = ['#3b82f6', '#ec4899', '#e11d48', '#10b981', '#8b5cf6', '#f59e0b', '#06b6d4'];
            let html = '';
            students.forEach((name, idx) => {
                const initial = (name.trim()[0] || 'S').toLowerCase();
                const color = COLORS[idx % COLORS.length];
                html += `
                <div class="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100/70 transition-colors">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-xs shrink-0 shadow-sm" style="background-color: ${color};">
                        ${initial}
                    </div>
                    <div class="flex-1 min-w-0">
                        <span class="text-xs font-bold text-slate-800 truncate block">${escapeHtml(name)}</span>
                        <span class="text-[10px] text-slate-400 font-medium">Student</span>
                    </div>
                    <i class="fa-solid fa-check text-emerald-500 text-xs mr-1"></i>
                </div>`;
            });
            listEl.innerHTML = html || '<p class="text-xs text-slate-400 text-center py-4">No students targeted.</p>';
        }

        const backdrop = document.getElementById('sigma-targeted-students-viewer-backdrop');
        if (backdrop) {
            backdrop.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    function closeTargetedStudentsViewer() {
        const backdrop = document.getElementById('sigma-targeted-students-viewer-backdrop');
        if (backdrop) {
            backdrop.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    function getStudentEnrolledSectionNames() {
        const names = new Set();
        let student = null;
        try {
            student = JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}');
        } catch (e) {}
        if (!student || !student.id) {
            if (typeof window.getLoggedInStudentUser === 'function') {
                student = window.getLoggedInStudentUser();
            }
        }
        if (!student) {
            student = currentUser || {};
        }

        const sId = String(student.id || student.uid || '').replace(/^#/, '').trim().toLowerCase();
        const sName = String(student.fullName || student.name || `${student.firstName || ''} ${student.lastName || ''}`).trim().toLowerCase();
        const sLast = String(student.lastName || '').trim().toLowerCase();
        const sEmail = String(student.email || '').trim().toLowerCase();
        const profSec = String(student.section || localStorage.getItem('sigma_student_section') || '').trim();

        if (profSec) {
            names.add(profSec.toLowerCase());
        }

        if (typeof window.classroomData === 'object' && window.classroomData) {
            Object.values(window.classroomData).forEach(cls => {
                if (cls && cls.section) names.add(String(cls.section).trim().toLowerCase());
                if (cls && cls.name) names.add(String(cls.name).trim().toLowerCase());
            });
        }

        try {
            const storedList = getStoredJson('sigma_student_enrolled_classes', []);
            if (Array.isArray(storedList)) {
                storedList.forEach(cls => {
                    if (cls && cls.section) names.add(String(cls.section).trim().toLowerCase());
                    if (cls && cls.name) names.add(String(cls.name).trim().toLowerCase());
                });
            }
        } catch (e) {}

        try {
            const adminSections = getStoredJson('sigma-admin-sections', []);
            if (Array.isArray(adminSections)) {
                adminSections.forEach(sec => {
                    if (!sec || sec.status === 'Draft') return;
                    let isMember = false;
                    if (Array.isArray(sec.students)) {
                        isMember = sec.students.some(st => {
                            if (!st) return false;
                            if (typeof st === 'string') {
                                const stLower = st.toLowerCase().trim();
                                return (sId && stLower.includes(sId)) || (sName && stLower.includes(sName)) || (sLast && stLower.includes(sLast));
                            }
                            const stId = String(st.id || st.uid || '').replace(/^#/, '').trim().toLowerCase();
                            if (sId && stId && sId === stId) return true;
                            const stEmail = String(st.email || '').trim().toLowerCase();
                            if (sEmail && stEmail && sEmail === stEmail) return true;
                            const stName = String(st.name || st.fullName || `${st.lastName || ''}, ${st.firstName || ''}`).trim().toLowerCase();
                            if (stName && (stName === sName || (sLast && stName.includes(sLast)))) return true;
                            return false;
                        });
                    }
                    if (sec.name && profSec && String(sec.name).trim().toLowerCase() === profSec.toLowerCase()) {
                        isMember = true;
                    }
                    if (isMember) {
                        if (sec.name) names.add(String(sec.name).trim().toLowerCase());
                        const fullSecLabel = (sec.grade && !String(sec.name).toLowerCase().includes(String(sec.grade).toLowerCase()))
                            ? `${String(sec.grade).toLowerCase()} - ${String(sec.name).toLowerCase()}`
                            : String(sec.name).toLowerCase();
                        names.add(fullSecLabel);
                    }
                });
            }
        } catch (e) {}

        return Array.from(names);
    }

    // Filter Posts by Role, Audience & Tab
    function filterPostsForCurrentViewer(posts, activeTab = 'all') {
        detectContext();

        const studentSections = currentRole === 'student' ? getStudentEnrolledSectionNames() : [];
        const teacherAssignedSections = currentRole === 'teacher' ? getTeacherAssignedSections() : [];

        return posts.filter(post => {
            // 1. Filter by Active Tab
            if (activeTab === 'important') {
                const isImportant = post.priority === 'important'
                    || post.priorityLabel === 'Important'
                    || post.type === 'urgent'
                    || Boolean(post.isImportant);
                if (!isImportant) return false;
            } else if (activeTab === 'posts') {
                // Connect directly to Posts: Teacher/Instructor updates, Classroom posts, Section posts, and Author posts
                const isPost = (post.authorRole === 'teacher' || post.authorRole === 'faculty' || post.authorRole === 'student')
                    || (post.authorRole !== 'admin' && !post.isAdmin)
                    || Boolean(post.isClassroomPost)
                    || Boolean(post.classroomKey)
                    || (post.audience && post.audience !== 'everyone' && post.audience !== 'all')
                    || (post.authorName && currentUser.name && post.authorName.toLowerCase() === currentUser.name.toLowerCase());
                if (!isPost) return false;
            }

            // 2. Filter by Audience Visibility
            if (currentRole === 'admin') {
                return true; // Admin sees everything
            }

            if (currentRole === 'teacher') {
                // Author always sees their own posts
                const myName = (currentUser.name || '').toLowerCase().trim();
                const myId = String(currentUser.id || currentUser.uid || '').replace(/^#/, '').trim().toLowerCase();
                const postAuthorName = (post.authorName || '').toLowerCase().trim();
                const postAuthorId = String(post.authorId || '').replace(/^#/, '').trim().toLowerCase();

                if (myId && postAuthorId && myId === postAuthorId) return true;
                if (myName && postAuthorName && myName === postAuthorName) return true;

                // Schoolwide / faculty-wide announcements
                const aud = (post.audience || '').toLowerCase().trim();
                if (aud === 'everyone' || aud === 'all' || aud === 'teachers_only') {
                    return true;
                }

                // If post was sent to a specific section:
                // Teacher MUST be assigned to that section to see it
                const audLabel = (post.audienceLabel || '').toLowerCase().trim();
                const clsKey = (post.classroomKey || '').toLowerCase().trim();

                const isAssigned = teacherAssignedSections.some(sec => {
                    const sName = String(sec.name || '').toLowerCase().trim();
                    const sId = String(sec.id || '').toLowerCase().trim();
                    const fullSecLabel = (sec.grade && !sName.includes(String(sec.grade).toLowerCase()))
                        ? `${String(sec.grade).toLowerCase()} - ${sName}`
                        : sName;

                    return (aud && (aud === sName || aud === fullSecLabel || aud === sId || aud.includes(sName) || sName.includes(aud)))
                        || (audLabel && (audLabel === sName || audLabel === fullSecLabel || audLabel.includes(sName) || sName.includes(audLabel)))
                        || (clsKey && (clsKey.includes(sName) || clsKey.includes(sId)));
                });

                return isAssigned;
            }

            if (currentRole === 'student') {
                // Student NEVER sees teachers_only
                if (post.audience === 'teachers_only') return false;

                // Targeted individual students check:
                if (post.targetStudents && Array.isArray(post.targetStudents) && post.targetStudents.length > 0) {
                    const myName = (currentUser.name || '').toLowerCase().trim();
                    const myId = String(currentUser.id || currentUser.uid || '').replace(/^#/, '').toLowerCase().trim();
                    const isTargeted = post.targetStudents.some(name => {
                        const n = String(name || '').toLowerCase().trim();
                        return n && (n === myName || myName.includes(n) || n.includes(myName));
                    }) || (post.targetStudentIds && Array.isArray(post.targetStudentIds) && post.targetStudentIds.some(id => String(id).replace(/^#/, '').toLowerCase().trim() === myId));
                    if (!isTargeted) return false;
                }

                // Schoolwide public posts for students
                const aud = (post.audience || '').toLowerCase().trim();
                if (aud === 'everyone' || aud === 'all' || aud === 'all_students') {
                    return true;
                }

                // Section-targeted announcements:
                const audLabel = (post.audienceLabel || '').toLowerCase().trim();
                const clsKey = (post.classroomKey || '').toLowerCase().trim();

                const isEnrolled = studentSections.some(secName => {
                    const s = secName.toLowerCase().trim();
                    return (aud && (aud === s || aud.includes(s) || s.includes(aud)))
                        || (audLabel && (audLabel === s || audLabel.includes(s) || s.includes(audLabel)))
                        || (clsKey && clsKey.includes(s));
                });

                if (isEnrolled) return true;

                // all_my_classes:
                if (aud === 'all_my_classes' || audLabel === 'all my classes') {
                    const postAuthor = (post.authorName || '').toLowerCase().trim();
                    if (!postAuthor) return false;

                    let hasTeacher = false;
                    if (typeof window.classroomData === 'object' && window.classroomData) {
                        hasTeacher = Object.values(window.classroomData).some(cls => {
                            const t = String(cls.teacher || '').toLowerCase().trim();
                            return t && (t === postAuthor || t.includes(postAuthor) || postAuthor.includes(t));
                        });
                    }
                    if (!hasTeacher) {
                        try {
                            const stored = getStoredJson('sigma_student_enrolled_classes', []);
                            if (Array.isArray(stored)) {
                                hasTeacher = stored.some(cls => {
                                    const t = String(cls.teacher || '').toLowerCase().trim();
                                    return t && (t === postAuthor || t.includes(postAuthor) || postAuthor.includes(t));
                                });
                            }
                        } catch (e) {}
                    }
                    return hasTeacher;
                }

                return false;
            }

            return true;
        });
    }

    // Rich Text Formatter for Announcement Cards
    function formatAnnouncementRichText(text) {
        if (!text) return '';

        // If text contains HTML tags (e.g. from rich text editor)
        const hasHtmlTags = /<[a-z][\s\S]*>/i.test(text);

        if (hasHtmlTags) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/html');

            // Remove unsafe tags
            const unsafeTags = ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'link', 'meta'];
            unsafeTags.forEach(tag => {
                doc.querySelectorAll(tag).forEach(el => el.remove());
            });

            // Strip dangerous attributes (e.g. inline event handlers, javascript: href)
            const allElements = doc.body.querySelectorAll('*');
            allElements.forEach(el => {
                const attrs = Array.from(el.attributes);
                attrs.forEach(attr => {
                    const name = attr.name.toLowerCase();
                    const val = attr.value.toLowerCase();
                    if (name.startsWith('on') || val.startsWith('javascript:')) {
                        el.removeAttribute(attr.name);
                    }
                });
            });

            return doc.body.innerHTML;
        }

        let escaped = escapeHtml(text);
        // Bold: **text**
        escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>');
        // Italic: *text*
        escaped = escaped.replace(/(^|[^\*])\*([^\*]+)\*([^\*]|$)/g, '$1<em class="italic">$2</em>$3');
        // Underline: &lt;u&gt;text&lt;/u&gt;
        escaped = escaped.replace(/&lt;u&gt;(.*?)&lt;\/u&gt;/gi, '<u class="underline decoration-slate-400 underline-offset-2">$1</u>');

        // Lists
        const lines = escaped.split('\n');
        let inBulletList = false;
        let inNumberedList = false;
        const result = [];

        lines.forEach(line => {
            const bulletMatch = line.match(/^(\s*)(•|-|\*)\s+(.*)$/);
            const numberMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);

            if (bulletMatch) {
                if (inNumberedList) {
                    result.push('</ol>');
                    inNumberedList = false;
                }
                if (!inBulletList) {
                    result.push('<ul class="list-disc pl-5 my-1 space-y-0.5">');
                    inBulletList = true;
                }
                result.push(`<li>${bulletMatch[3]}</li>`);
            } else if (numberMatch) {
                if (inBulletList) {
                    result.push('</ul>');
                    inBulletList = false;
                }
                if (!inNumberedList) {
                    result.push('<ol class="list-decimal pl-5 my-1 space-y-0.5">');
                    inNumberedList = true;
                }
                result.push(`<li>${numberMatch[3]}</li>`);
            } else {
                if (inBulletList) {
                    result.push('</ul>');
                    inBulletList = false;
                }
                if (inNumberedList) {
                    result.push('</ol>');
                    inNumberedList = false;
                }
                result.push(line);
            }
        });

        if (inBulletList) result.push('</ul>');
        if (inNumberedList) result.push('</ol>');

        return result.join('<br>').replace(/<\/ul><br>/g, '</ul>').replace(/<\/ol><br>/g, '</ol>');
    }

    function getActiveRoomSectionName() {
        if (window.currentClassroomSectionName && typeof window.currentClassroomSectionName === 'string' && window.currentClassroomSectionName.trim()) {
            return window.currentClassroomSectionName.trim();
        }
        try {
            const storedSec = localStorage.getItem('sigma-active-classroom-section');
            if (storedSec && typeof storedSec === 'string' && storedSec.trim()) {
                return storedSec.trim();
            }
        } catch (_) {}
        try {
            const nav = getStoredJson('sigma-teacher-nav-state', {});
            if (nav && (nav.type === 'classroom' || nav.className) && nav.className) {
                return String(nav.className).trim();
            }
        } catch (_) {}
        try {
            const hash = window.location.hash || '';
            if (hash.startsWith('#classroom:')) {
                const parts = hash.split(':');
                if (parts[1]) return decodeURIComponent(parts[1]).trim();
            }
        } catch (_) {}
        if (window.currentRoomClassData && window.currentRoomClassData.section) {
            return String(window.currentRoomClassData.section).trim();
        }
        if (window.currentClassroom && window.currentClassroom.section) {
            return String(window.currentClassroom.section).trim();
        }
        if (window.currentStudentSection) {
            return String(window.currentStudentSection).trim();
        }
        return '';
    }

    function getActiveRoomSubjectName() {
        if (window.currentClassroomSubject && typeof window.currentClassroomSubject === 'string' && window.currentClassroomSubject.trim()) {
            return window.currentClassroomSubject.trim();
        }
        try {
            const storedSubj = localStorage.getItem('sigma-active-classroom-subject');
            if (storedSubj && typeof storedSubj === 'string' && storedSubj.trim()) {
                return storedSubj.trim();
            }
        } catch (_) {}
        try {
            const nav = getStoredJson('sigma-teacher-nav-state', {});
            if (nav && nav.subject) {
                return String(nav.subject).trim();
            }
        } catch (_) {}
        try {
            const hash = window.location.hash || '';
            if (hash.startsWith('#classroom:')) {
                const parts = hash.split(':');
                if (parts[2] && parts[2] !== 'room' && parts[2] !== 'members' && parts[2] !== 'attendance') {
                    return decodeURIComponent(parts[2]).trim();
                }
            }
        } catch (_) {}
        if (window.currentClassroomKey && typeof window.currentClassroomKey === 'string' && window.currentClassroomKey.includes('::')) {
            const kSub = window.currentClassroomKey.split('::')[1];
            if (kSub && kSub.trim()) return kSub.trim();
        }
        if (window.currentRoomClassData && window.currentRoomClassData.subject) {
            return String(window.currentRoomClassData.subject).trim();
        }
        if (window.currentClassroom && window.currentClassroom.subject) {
            return String(window.currentClassroom.subject).trim();
        }
        if (window.currentStudentSubject) {
            return String(window.currentStudentSubject).trim();
        }
        return '';
    }

    // Feed Infinite Scroll / Lazy Load Pagination Configuration (4 posts initially, 4 on scroll)
    const FEED_PAGE_SIZE = 4;
    const feedPaginationState = {};
    let feedIntersectionObserver = null;

    function getFeedIntersectionObserver() {
        if (typeof window === 'undefined' || !window.IntersectionObserver) return null;
        if (!feedIntersectionObserver) {
            feedIntersectionObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const feedId = entry.target.getAttribute('data-feed-id');
                        if (feedId) {
                            loadNextFeedBatch(feedId);
                        }
                    }
                });
            }, {
                root: null,
                rootMargin: '250px 0px',
                threshold: 0.01
            });
        }
        return feedIntersectionObserver;
    }

    function setupFeedScrollListeners() {
        if (typeof window === 'undefined' || window._sigmaFeedScrollListenerAttached) return;
        window._sigmaFeedScrollListenerAttached = true;

        let ticking = false;
        const checkSentinels = () => {
            ticking = false;
            const sentinels = document.querySelectorAll('.sigma-feed-sentinel[data-feed-id]');
            if (!sentinels.length) return;
            const vHeight = window.innerHeight || document.documentElement.clientHeight;
            sentinels.forEach(sentinel => {
                const rect = sentinel.getBoundingClientRect();
                if (rect.top <= vHeight + 300 && rect.bottom >= -150) {
                    const feedId = sentinel.getAttribute('data-feed-id');
                    if (feedId) loadNextFeedBatch(feedId);
                }
            });
        };

        const onScroll = () => {
            if (!ticking) {
                ticking = true;
                window.requestAnimationFrame(checkSentinels);
            }
        };

        window.addEventListener('scroll', onScroll, { passive: true });
        document.addEventListener('scroll', onScroll, { passive: true, capture: true });
        window.addEventListener('resize', onScroll, { passive: true });
    }

    function cleanupFeedSentinel(feedId) {
        const container = document.getElementById(feedId);
        if (!container) return;
        const sentinel = container.querySelector(`.sigma-feed-sentinel[data-feed-id="${feedId}"]`);
        if (sentinel) {
            const observer = getFeedIntersectionObserver();
            if (observer) observer.unobserve(sentinel);
            sentinel.remove();
        }
    }

    function loadNextFeedBatch(feedId) {
        const state = feedPaginationState[feedId];
        if (!state || state.isLoading) return;
        if (state.currentIndex >= state.visiblePosts.length) {
            cleanupFeedSentinel(feedId);
            return;
        }

        const container = document.getElementById(feedId);
        if (!container) return;

        state.isLoading = true;
        const nextBatch = state.visiblePosts.slice(state.currentIndex, state.currentIndex + FEED_PAGE_SIZE);
        state.currentIndex += nextBatch.length;

        let batchHtml = '';
        nextBatch.forEach(post => {
            batchHtml += renderSinglePostCardHtml(post, feedId);
        });

        const sentinel = container.querySelector(`.sigma-feed-sentinel[data-feed-id="${feedId}"]`);
        if (sentinel) {
            sentinel.insertAdjacentHTML('beforebegin', batchHtml);
        } else {
            container.insertAdjacentHTML('beforeend', batchHtml);
        }

        paintAnnouncementMedia(container);

        if (state.currentIndex >= state.visiblePosts.length) {
            cleanupFeedSentinel(feedId);
        } else {
            // If viewport is tall enough that sentinel remains visible, trigger next load seamlessly
            setTimeout(() => {
                const currentSentinel = container.querySelector(`.sigma-feed-sentinel[data-feed-id="${feedId}"]`);
                if (currentSentinel && currentSentinel.isConnected) {
                    const rect = currentSentinel.getBoundingClientRect();
                    const vHeight = window.innerHeight || document.documentElement.clientHeight;
                    if (rect.top <= vHeight + 250 && rect.bottom >= -100) {
                        loadNextFeedBatch(feedId);
                    }
                }
            }, 80);
        }

        state.isLoading = false;
    }

    function renderSinglePostCardHtml(post, targetContainerId) {
        const timeAgo = formatTimeAgo(post.createdAt);
        const authorRoleText = (post.authorRole === 'admin' || post.authorRole === 'Administrator')
            ? 'Administrator'
            : ((post.authorRole === 'student' || post.authorRole === 'Student') ? 'Student' : 'Teacher');

        const authorAvatarHtml = (typeof window.renderUserAvatarHtml === 'function')
            ? window.renderUserAvatarHtml(post.authorId ? { uid: post.authorId, name: post.authorName, avatar: (post.authorAvatar && post.authorAvatar !== 'image/Welcome.jpg' ? post.authorAvatar : '') } : (post.authorName || 'User'), 'md', 'sigma-card-author-avatar-img')
            : `<div class="sigma-user-avatar sigma-user-avatar--md sigma-card-author-avatar-img"><i class="fa-solid fa-user"></i></div>`;

        // Permissions for Edit & Delete options
        const canManagePost = currentRole === 'admin' || (currentRole !== 'student' && post.authorName === currentUser.name);

        // Targeted Students metadata
        let targetedStudentNames = (post.targetStudents && Array.isArray(post.targetStudents) && post.targetStudents.length > 0)
            ? post.targetStudents
            : [];
        if (targetedStudentNames.length === 0 && post.targetStudentsLabel && post.targetStudentsLabel !== 'All Students' && post.targetStudentsLabel !== 'All students') {
            targetedStudentNames = [post.targetStudentsLabel];
        }
        const isTargetedToStudents = targetedStudentNames.length > 0;
        const targetBadgeTooltip = isTargetedToStudents ? targetedStudentNames.join(', ') : '';

        // Determine Template Type (1: Text-only, 2: Picture, 3: Video)
        let templateModifierClass = 'sigma-announcement-card--text-only';
        const hasVideoMedia = post.mediaType === 'video' || (post.mediaUrl && (post.mediaUrl.startsWith('idb:ann_vid_') || post.mediaUrl.endsWith('.mp4') || (typeof post.mediaUrl === 'string' && post.mediaUrl.startsWith('data:video'))));
        const hasPictureMedia = !hasVideoMedia && (post.mediaType === 'image' || post.mediaType === 'images' || (post.mediaUrls && post.mediaUrls.length > 0) || (post.mediaUrl && !hasVideoMedia));

        if (hasPictureMedia) {
            templateModifierClass = 'sigma-announcement-card--picture';
        } else if (hasVideoMedia) {
            templateModifierClass = 'sigma-announcement-card--video';
        }

        const fullBody = post.body || '';
        const isImportant = post.priority === 'important' || post.priorityLabel === 'Important' || post.type === 'urgent' || Boolean(post.isImportant);

        // Audience & Section Badges Generator for All Posts
        let audienceBadgeHTML = '';

        const hasSection = (post.audience && (post.audience.startsWith('Grade') || post.audience.startsWith('grade_') || post.audience.startsWith('section_') || (!['everyone', 'all', 'teachers_only', 'faculty', 'all_students'].includes(post.audience)))) || (post.audienceLabel && (post.audienceLabel.startsWith('Grade') || post.audienceLabel.includes('•')));
        let sectionLabel = stripRoomFromLabel(post.audienceLabel || post.audience || '', post.sectionRoom);

        // 1. If post belongs to a section (e.g. Grade 11 - STEM A), always show section badge
        if (hasSection && sectionLabel) {
            let badgeTextContent = escapeHtml(sectionLabel);
            if (sectionLabel.includes(' • ')) {
                const secBulletParts = sectionLabel.split(' • ');
                const secPart = secBulletParts[0];
                const subjPart = secBulletParts.slice(1).join(' • ');
                badgeTextContent = `<span class="sigma-badge-sec-name">${escapeHtml(secPart)}</span><span class="sigma-badge-bullet">&nbsp;• </span><span class="sigma-badge-subj-name">${escapeHtml(subjPart)}</span>`;
            }
            audienceBadgeHTML += `
            <span class="sigma-card-section-badge sigma-card-audience-badge inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-700 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-[10px] transition-all" title="Section: ${escapeHtml(sectionLabel)}">
                <i class="fa-solid fa-graduation-cap text-[9.5px] text-amber-500 shrink-0"></i>
                <span class="sigma-card-badge-label-text">${badgeTextContent}</span>
            </span>`;
        }

        // 2. Targeted Students badge (clickable popup)
        if (isTargetedToStudents) {
            audienceBadgeHTML += `
            <button type="button" class="sigma-card-audience-badge sigma-card-targeted-badge inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200/90 border border-slate-200/80 px-2 py-0.5 rounded-[10px] transition-all cursor-pointer hover:shadow-sm shrink-0" onclick="window.SigmaAnnouncements.openTargetedStudentsViewer('${post.id}', event)" title="${escapeHtml(targetBadgeTooltip)}">
                <i class="fa-solid fa-user-check text-[9px] text-emerald-600 shrink-0"></i>
                <span>${escapeHtml(targetedStudentNames.length === 1 ? targetedStudentNames[0] : `${targetedStudentNames.length} students`)}</span>
            </button>`;
        } else if (!hasSection) {
            // If not a section and not targeted to students, render Public / Faculty / All Students badge
            if (post.audience === 'teachers_only' || post.audienceLabel === 'Faculty' || post.audience === 'faculty') {
                audienceBadgeHTML += `
                <span class="sigma-card-audience-badge inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-700 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-[10px] transition-all shrink-0" title="Visible only to Faculty &amp; Teachers">
                    <i class="fa-solid fa-chalkboard-user text-[9.5px] text-indigo-500 shrink-0"></i>
                    <span>Faculty</span>
                </span>`;
            } else if (post.audience === 'all_students' || post.audienceLabel === 'All Students') {
                audienceBadgeHTML += `
                <span class="sigma-card-audience-badge inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-700 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-[10px] transition-all shrink-0" title="Visible to all students">
                    <i class="fa-solid fa-user-graduate text-[9.5px] text-emerald-600 shrink-0"></i>
                    <span>All Students</span>
                </span>`;
            } else {
                audienceBadgeHTML += `
                <span class="sigma-card-audience-badge inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-700 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-[10px] transition-all shrink-0" title="Public Announcement (Visible to everyone)">
                    <i class="fa-solid fa-earth-americas text-[9.5px] text-blue-500 shrink-0"></i>
                    <span>Public</span>
                </span>`;
            }
        }

        // 3. Important badge if isImportant (rendered next to author name)
        let importantBadgeHtml = '';
        if (isImportant) {
            importantBadgeHtml = `
            <span class="sigma-badge-important inline-flex items-center justify-center text-amber-900 bg-amber-100 border border-amber-200/90 px-1.5 py-0.5 rounded-full transition-all shrink-0 select-none shadow-xs ml-0.5" title="Important Announcement" aria-label="Important Announcement">
                <i class="fa-solid fa-star text-[9.5px] text-amber-500"></i>
            </span>`;
        }

        return `
        <article class="sigma-announcement-card ${templateModifierClass}" data-post-id="${post.id}">
            <!-- Header Row -->
            <div class="sigma-card-header-row">
                <div class="sigma-card-author-meta">
                    <div onclick="if(typeof window.openUserProfile==='function') window.openUserProfile('${escapeHtml(post.authorId || post.authorName)}')" class="cursor-pointer">
                        ${authorAvatarHtml}
                    </div>
                    <div class="sigma-card-author-text-col">
                        <div class="sigma-card-author-fullname flex items-center gap-1.5 flex-wrap">
                            <span class="cursor-pointer hover:underline" onclick="if(typeof window.openUserProfile==='function') window.openUserProfile('${escapeHtml(post.authorId || post.authorName)}')">${escapeHtml(post.authorName)}</span>
                            ${importantBadgeHtml}
                        </div>
                        <div class="sigma-card-author-subrow flex items-center gap-1.5 flex-nowrap">
                            <span class="sigma-card-author-role-subtitle">${authorRoleText}</span>
                            ${audienceBadgeHTML}
                        </div>
                    </div>
                </div>

                <div class="sigma-card-header-right">
                    <span class="sigma-card-timestamp-text" data-timestamp="${post.createdAt || ''}">${timeAgo}</span>
                    <div class="sigma-card-options-wrapper">
                        <button type="button" class="sigma-card-options-btn" data-post-id="${post.id}" onclick="window.SigmaAnnouncements ? window.SigmaAnnouncements.toggleOptions('${post.id}', event) : (window.toggleAnnouncementOptions && window.toggleAnnouncementOptions('${post.id}', event))" title="Post options">
                            <i class="fa-solid fa-ellipsis pointer-events-none"></i>
                        </button>
                        <div class="sigma-card-options-dropdown" id="sigma-card-options-${targetContainerId}-${post.id}" data-post-id="${post.id}">
                            ${canManagePost ? `
                            <button type="button" class="sigma-card-options-item" onclick="window.SigmaAnnouncements ? window.SigmaAnnouncements.editPost('${post.id}') : (window.editAnnouncementPost && window.editAnnouncementPost('${post.id}'))">
                                <i class="fa-solid fa-pen-to-square text-slate-700"></i>
                                <span>Edit Post</span>
                            </button>
                            <button type="button" class="sigma-card-options-item delete-item" onclick="window.SigmaAnnouncements ? window.SigmaAnnouncements.deletePost('${post.id}') : (window.deleteAnnouncementPost && window.deleteAnnouncementPost('${post.id}'))">
                                <i class="fa-solid fa-trash-can text-slate-700"></i>
                                <span>Delete Post</span>
                            </button>` : `
                            <button type="button" class="sigma-card-options-item" onclick="if(navigator.clipboard){navigator.clipboard.writeText(window.location.href); if(typeof window.showToast==='function') window.showToast('Post link copied to clipboard'); else alert('Post link copied');}">
                                <i class="fa-solid fa-link text-slate-700"></i>
                                <span>Copy Link</span>
                            </button>
                            <button type="button" class="sigma-card-options-item" onclick="if(typeof window.showToast==='function') window.showToast('Post reported to administrator'); else alert('Post reported to administrator');">
                                <i class="fa-regular fa-flag text-slate-700"></i>
                                <span>Report Post</span>
                            </button>`}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Post Title -->
            ${post.title ? `<h3 class="sigma-card-post-title">${escapeHtml(post.title)}</h3>` : ''}

            <!-- Post Body: Text with 'See more...' and 'See less' buttons -->
            ${(() => {
                if (!fullBody) return '';
                const isExpanded = getExpandedPosts().has(post.id);
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = fullBody;
                const plainText = tempDiv.textContent || tempDiv.innerText || fullBody;
                const isLong = plainText.length > 250 || plainText.split('\n').length > 4;
                if (isLong) {
                    let shortText = plainText.slice(0, 240);
                    const lastSpace = shortText.lastIndexOf(' ');
                    if (lastSpace > 160) {
                        shortText = shortText.slice(0, lastSpace);
                    }
                    return `<div class="sigma-card-post-body" id="sigma-card-body-${post.id}"><span id="sigma-body-preview-${post.id}" style="${isExpanded ? 'display: none;' : ''}">${escapeHtml(shortText)}... <button type="button" class="sigma-card-see-more-btn" onclick="window.SigmaAnnouncements.toggleSeeMore('${post.id}', this)">See more...</button></span><span id="sigma-body-full-${post.id}" style="${isExpanded ? 'display: block;' : 'display: none;'}">${formatAnnouncementRichText(fullBody)} <button type="button" class="sigma-card-see-more-btn" onclick="window.SigmaAnnouncements.toggleSeeLess('${post.id}', this)">See less</button></span></div>`;
                }
                return `<div class="sigma-card-post-body">${formatAnnouncementRichText(fullBody)}</div>`;
            })()}

            <!-- Template 2 & 3: Picture / Photo Grid or Video Attachment -->
            ${(() => {
                const isVideo = post.mediaType === 'video' || (post.mediaUrl && (post.mediaUrl.startsWith('idb:ann_vid_') || post.mediaUrl.endsWith('.mp4') || (typeof post.mediaUrl === 'string' && post.mediaUrl.startsWith('data:video'))));

                if (isVideo) {
                    let vidSrc = post.mediaUrl || (post.mediaUrls && post.mediaUrls[0]) || '';
                    let vidIdbAttr = '';
                    if (typeof vidSrc === 'string' && vidSrc.startsWith('idb:')) {
                        const mId = vidSrc.slice(4);
                        vidIdbAttr = ` data-idb-media="${mId}"`;
                        if (window._sigmaMediaMemoryCache && window._sigmaMediaMemoryCache.has(mId)) {
                            vidSrc = window._sigmaMediaMemoryCache.get(mId);
                        } else {
                            getMediaBlob(mId).then(bUrl => {
                                if (bUrl) {
                                    document.querySelectorAll(`[data-idb-media="${mId}"]`).forEach(el => { el.src = bUrl; });
                                }
                            });
                        }
                    }
                    return `
                    <div class="sigma-card-media-video-container" style="position: relative;">
                        <video src="${vidSrc}" controls preload="metadata" playsinline${vidIdbAttr}></video>
                    </div>`;
                }

                const photos = (post.mediaUrls && post.mediaUrls.length > 0)
                    ? post.mediaUrls
                    : (post.mediaType === 'image' && post.mediaUrl ? [post.mediaUrl] : []);

                const resolvePhotoSrc = (raw) => {
                    let src = raw || '';
                    let attr = '';
                    if (typeof src === 'string' && src.startsWith('idb:')) {
                        const mId = src.slice(4);
                        attr = ` data-idb-media="${mId}"`;
                        if (window._sigmaMediaMemoryCache && window._sigmaMediaMemoryCache.has(mId)) {
                            src = window._sigmaMediaMemoryCache.get(mId);
                        }
                    }
                    const showSrc = (typeof src === 'string' && src && !src.startsWith('idb:')) ? src : '';
                    return { src: showSrc, attr, pending: !showSrc && !!attr };
                };

                if (photos.length === 1) {
                    const { src, attr, pending } = resolvePhotoSrc(photos[0]);
                    return `
                    <div class="sigma-card-media-picture-container${pending ? '' : ' is-ready'}" onclick="window.SigmaAnnouncements.openPostLightbox('${post.id}', 0)" title="Click to enlarge image">
                        <img ${src ? `src="${src}"` : ''} alt="Post image"${attr}${pending ? ' data-idb-pending="1"' : ''} onerror="this.style.opacity='0';">
                    </div>`;
                } else if (photos.length >= 2) {
                    const totalPhotos = photos.length;
                    const countClass = `count-${Math.min(totalPhotos, 4)}`;
                    const displayPhotos = photos.slice(0, 4);
                    const remainingCount = totalPhotos - 4;

                    const anyPending = displayPhotos.some((rawUrl) => resolvePhotoSrc(rawUrl).pending);
                    return `
                    <div class="sigma-card-photo-grid ${countClass}${anyPending ? '' : ' is-ready'}">
                        ${displayPhotos.map((rawUrl, idx) => {
                            const { src, attr, pending } = resolvePhotoSrc(rawUrl);
                            const isLastWithMore = (idx === 3 && remainingCount > 0);
                            return `
                            <div class="sigma-grid-img-cell" onclick="window.SigmaAnnouncements.openPostLightbox('${post.id}', ${idx})" title="Click to enlarge image">
                                <img ${src ? `src="${src}"` : ''} alt="Post photo ${idx + 1}"${attr}${pending ? ' data-idb-pending="1"' : ''} onerror="this.style.opacity='0';">
                                ${isLastWithMore ? `<div class="sigma-grid-more-overlay"><span>+${remainingCount}</span></div>` : ''}
                            </div>`;
                        }).join('')}
                    </div>`;
                }
                return '';
            })()}

            <!-- Actions Bar: Likes and Comments -->
            <div class="sigma-card-footer-row">
                <button type="button" class="sigma-card-like-btn ${post.likedByMe ? 'liked' : ''}" onclick="window.SigmaAnnouncements.toggleLike('${post.id}', event)" title="Like post">
                    <i class="${post.likedByMe ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
                    <span>${post.likes || 0} ${(post.likes === 1 ? 'Like' : 'Likes')}</span>
                </button>
                ${isPostCommentsEnabled(post) ? `
                <button type="button" class="sigma-card-comment-btn" onclick="window.SigmaAnnouncements.openPostDialog('${post.id}', event)" title="Comment on post">
                    <i class="fa-regular fa-comment"></i>
                    <span>${(post.comments && post.comments.length) ? `${post.comments.length} ${(post.comments.length === 1 ? 'Comment' : 'Comments')}` : 'Comment'}</span>
                </button>
                ` : ''}
            </div>
        </article>`;
    }

    // Render Announcement Feed into a target container (4 posts at first, auto-load next 4 on scroll)
    function renderFeed(targetContainerId, activeTab = 'all', sectionFilter = null, subjectFilter = null) {
        const container = document.getElementById(targetContainerId);
        if (!container) return;

        detectContext();
        const allPosts = getStoredAnnouncements();
        let visiblePosts = filterPostsForCurrentViewer(allPosts, activeTab);

        // Strict Section & Subject Room Isolation (Only posts for THIS section and subject)
        let activeSectionFilter = sectionFilter;
        let activeSubjectFilter = subjectFilter;
        if ((targetContainerId === 'room-announcements-feed' || targetContainerId === 'admin-room-announcements-feed') && !activeSectionFilter) {
            activeSectionFilter = getActiveRoomSectionName();
            if (activeSectionFilter && !window.currentClassroomSectionName) {
                window.currentClassroomSectionName = activeSectionFilter;
            }
        }
        if ((targetContainerId === 'room-announcements-feed' || targetContainerId === 'admin-room-announcements-feed') && !activeSubjectFilter) {
            activeSubjectFilter = getActiveRoomSubjectName();
            if (activeSubjectFilter && !window.currentClassroomSubject) {
                window.currentClassroomSubject = activeSubjectFilter;
            }
        }

        if (targetContainerId === 'room-announcements-feed' || targetContainerId === 'admin-room-announcements-feed' || activeSectionFilter) {
            const sec = (activeSectionFilter || '').toLowerCase().trim();
            const subj = (activeSubjectFilter || '').toLowerCase().trim();

            visiblePosts = visiblePosts.filter(p => {
                // NEVER show general schoolwide Admin / Public announcements inside a Section Room stream
                if (p.audience === 'everyone' || p.audience === 'all' || p.audience === 'all_students') return false;
                if ((p.authorRole === 'admin' || p.isAdmin) && !p.classroomKey && p.audience !== sec && p.sectionName !== sec) return false;

                const pAud = (p.audience || '').toLowerCase().trim();
                const pAudLabel = (p.audienceLabel || '').toLowerCase().trim();
                const pKey = (p.classroomKey || '').toLowerCase().trim();
                const pSubj = (p.subject || '').toLowerCase().trim();
                const pSecName = (p.sectionName || '').toLowerCase().trim();

                const matchesSec = Boolean(sec && (
                    pAud === sec ||
                    pAudLabel === sec ||
                    pSecName === sec ||
                    pKey.startsWith(sec + '::') ||
                    pKey === sec ||
                    sec.includes(pAud) ||
                    pAud.includes(sec) ||
                    sec.includes(pAudLabel) ||
                    pAudLabel.includes(sec)
                ));

                if (!matchesSec) {
                    if (pAud === 'all_my_classes' || pAudLabel === 'all my classes') {
                        const roomTeacher = String(window.currentRoomClassData?.teacher || window.currentClassroom?.teacher || '').toLowerCase().trim();
                        const pAuthor = String(p.authorName || '').toLowerCase().trim();
                        const isMyTeacher = Boolean(
                            (roomTeacher && pAuthor && (roomTeacher === pAuthor || roomTeacher.includes(pAuthor) || pAuthor.includes(roomTeacher))) ||
                            (currentRole === 'teacher' && pAuthor && currentUser.name && pAuthor === currentUser.name.toLowerCase().trim())
                        );
                        if (!isMyTeacher) return false;
                    } else {
                        return false;
                    }
                }

                // If subject filter is present, ensure post strictly belongs to this subject
                if (subj) {
                    const matchesSubj = Boolean(
                        (pSubj && (pSubj === subj || pSubj.includes(subj) || subj.includes(pSubj))) ||
                        (pKey && pKey.includes('::') && (pKey.endsWith('::' + subj) || pKey.includes('::' + subj))) ||
                        (pAudLabel && pAudLabel.toLowerCase().includes(subj))
                    );
                    if (!matchesSubj) {
                        return false;
                    }
                }

                if (currentRole === 'student' && p.targetStudents && Array.isArray(p.targetStudents) && p.targetStudents.length > 0) {
                    const myName = (currentUser.name || '').toLowerCase().trim();
                    const myId = String(currentUser.id || currentUser.uid || '').replace(/^#/, '').toLowerCase().trim();
                    const isTargeted = p.targetStudents.some(name => {
                        const n = String(name || '').toLowerCase().trim();
                        return n && (n === myName || myName.includes(n) || n.includes(myName));
                    }) || (p.targetStudentIds && Array.isArray(p.targetStudentIds) && p.targetStudentIds.some(id => String(id).replace(/^#/, '').toLowerCase().trim() === myId));
                    if (!isTargeted) return false;
                }

                return true;
            });
        }

        if (visiblePosts.length === 0) {
            cleanupFeedSentinel(targetContainerId);
            delete feedPaginationState[targetContainerId];

            let emptyIcon = 'fa-solid fa-bullhorn';
            let emptyTitle = 'No Announcements Yet';
            let emptySubtitle = "When announcements are posted, they'll appear here.";

            if (targetContainerId === 'room-announcements-feed' || targetContainerId === 'admin-room-announcements-feed') {
                emptyIcon = 'fa-regular fa-bell-slash';
                emptyTitle = 'No Announcements Yet';
                emptySubtitle = 'Announcements shared with this section will appear here.';
            } else if (activeTab === 'important') {
                emptyIcon = 'fa-solid fa-triangle-exclamation';
                emptyTitle = 'No Important Announcements Yet';
                emptySubtitle = 'There are no urgent or high-priority announcements at this time.';
            } else if (activeTab === 'posts') {
                emptyIcon = 'fa-solid fa-newspaper';
                emptyTitle = 'No Posts Yet';
                emptySubtitle = 'You have not announced or published any posts yet.';
            }

            container.innerHTML = `
            <div class="sigma-announcements-empty-state">
                <div class="sigma-empty-icon-circle">
                    <i class="${emptyIcon}"></i>
                </div>
                <h4 class="sigma-empty-title">${emptyTitle}</h4>
                <p class="sigma-empty-subtitle">${emptySubtitle}</p>
            </div>`;
            return;
        }

        // Initialize / reset pagination state for this feed container
        cleanupFeedSentinel(targetContainerId);
        feedPaginationState[targetContainerId] = {
            visiblePosts: visiblePosts,
            currentIndex: 0,
            isLoading: false
        };

        const initialBatch = visiblePosts.slice(0, FEED_PAGE_SIZE);
        feedPaginationState[targetContainerId].currentIndex = initialBatch.length;

        let html = '';
        initialBatch.forEach(post => {
            html += renderSinglePostCardHtml(post, targetContainerId);
        });

        if (visiblePosts.length > FEED_PAGE_SIZE) {
            html += `
            <div class="sigma-feed-sentinel" data-feed-id="${targetContainerId}">
                <div class="sigma-feed-sentinel-badge">
                    <i class="fa-solid fa-circle-notch fa-spin text-emerald-600"></i>
                    <span>Loading more posts...</span>
                </div>
            </div>`;
        }

        container.innerHTML = html;
        paintAnnouncementMedia(container);

        if (visiblePosts.length > FEED_PAGE_SIZE) {
            const sentinel = container.querySelector(`.sigma-feed-sentinel[data-feed-id="${targetContainerId}"]`);
            if (sentinel) {
                const observer = getFeedIntersectionObserver();
                if (observer) observer.observe(sentinel);
            }
            setupFeedScrollListeners();
        }
    }

    /**
     * Relative Time & Timestamp Formatting Standard (AGENTS.md Section 7)
     * - Seconds (< 60s): 1sec, 2secs, ... 59secs
     * - Minutes (< 60m): 1min, 2mins, ... 59mins
     * - Hours (< 24h same day): 1hr, 2hrs, ... 22hrs
     * - Yesterday: Yesterday at 12:30 pm (12-hour format with am/pm)
     * - Past Week (< 7 days): Monday at 4:20 am, Saturday at 7:30 pm
     * - Older / Extended Dates: April 30 at 6:07 pm (Month Day at Time)
     */
    function formatTimeAgo(isoString) {
        if (!isoString) return '1sec';
        const now = new Date();
        const past = new Date(isoString);
        if (isNaN(past.getTime())) return '1sec';

        const diffSecs = Math.max(0, Math.floor((now.getTime() - past.getTime()) / 1000));

        // Helper for 12-hour time format with lowercase am/pm
        const formatTimeOnly = (d) => {
            let h = d.getHours();
            const m = d.getMinutes().toString().padStart(2, '0');
            const ampm = h >= 12 ? 'pm' : 'am';
            h = h % 12 || 12;
            return `${h}:${m} ${ampm}`;
        };

        // Seconds (< 60s): 1sec, 2secs, ... 59secs
        if (diffSecs < 60) {
            const s = Math.max(1, diffSecs);
            return `${s}sec${s > 1 ? 's' : ''}`;
        }

        // Minutes (< 60m): 1min, 2mins, ... 59mins
        const diffMins = Math.floor(diffSecs / 60);
        if (diffMins < 60) {
            return `${diffMins}min${diffMins > 1 ? 's' : ''}`;
        }

        // Hours (< 24h same day): 1hr, 2hrs, ... 22hrs
        const diffHours = Math.floor(diffMins / 60);
        const isSameDay = now.getFullYear() === past.getFullYear() &&
                          now.getMonth() === past.getMonth() &&
                          now.getDate() === past.getDate();

        if (isSameDay && diffHours < 24) {
            return `${diffHours}hr${diffHours > 1 ? 's' : ''}`;
        }

        // Yesterday check
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        const isYesterday = yesterday.getFullYear() === past.getFullYear() &&
                            yesterday.getMonth() === past.getMonth() &&
                            yesterday.getDate() === past.getDate();
        if (isYesterday) {
            return `Yesterday at ${formatTimeOnly(past)}`;
        }

        if (diffHours < 24) {
            return `${diffHours}hr${diffHours > 1 ? 's' : ''}`;
        }

        // Past Week (< 7 days): Monday at 4:20 am
        const diffDays = Math.floor(diffSecs / 86400);
        if (diffDays < 7) {
            const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            return `${weekdays[past.getDay()]} at ${formatTimeOnly(past)}`;
        }

        // Older / Extended Dates: April 30 at 6:07 pm
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        return `${months[past.getMonth()]} ${past.getDate()} at ${formatTimeOnly(past)}`;
    }

    function updatePostLikeUI(postId, post) {
        if (!postId || !post) return;
        const count = post.likes || 0;
        const text = `${count} ${count === 1 ? 'Like' : 'Likes'}`;

        const targets = document.querySelectorAll(`
            .sigma-announcement-card[data-post-id="${postId}"] .sigma-card-like-btn,
            [data-post-id="${postId}"] .sigma-card-like-btn,
            #sigma-post-dialog-modal .sigma-card-like-btn
        `);

        targets.forEach(btn => {
            btn.classList.toggle('liked', Boolean(post.likedByMe));
            const icon = btn.querySelector('i');
            if (icon) {
                icon.className = `${post.likedByMe ? 'fa-solid' : 'fa-regular'} fa-heart`;
            }
            const span = btn.querySelector('span');
            if (span) {
                span.textContent = text;
            }
        });
    }

    function updatePostCommentCountUI(postId, count) {
        if (!postId) return;
        const text = (count && count > 0) ? `${count} ${count === 1 ? 'Comment' : 'Comments'}` : 'Comment';
        const targets = document.querySelectorAll(`
            .sigma-announcement-card[data-post-id="${postId}"] .sigma-card-comment-btn span,
            [data-post-id="${postId}"] .sigma-card-comment-btn span
        `);
        targets.forEach(span => {
            span.textContent = text;
        });
    }

    function toggleLike(postId, e) {
        if (e) {
            if (typeof e.preventDefault === 'function') e.preventDefault();
            if (typeof e.stopPropagation === 'function') e.stopPropagation();
        }
        const posts = getStoredAnnouncements();
        const post = posts.find(p => p.id === postId);
        if (!post) return;
        post.likedByMe = !post.likedByMe;
        post.likes = (post.likes || 0) + (post.likedByMe ? 1 : -1);
        if (post.likes < 0) post.likes = 0;
        saveStoredAnnouncements(posts);

        // Update UI in-place across all feeds without full re-render (preserves scroll position completely)
        updatePostLikeUI(postId, post);

        if (currentLightboxPostId === postId) {
            updateLightboxLikeUI();
        }
    }

    function resolveOptionsTrigger(postId, e) {
        let btn = null;
        if (e && e.currentTarget && e.currentTarget.closest) {
            btn = e.currentTarget.closest('.sigma-card-options-btn');
        }
        if (!btn && e && e.target && e.target.closest) {
            btn = e.target.closest('.sigma-card-options-btn');
        }

        let dropdown = btn ? btn.closest('.sigma-card-options-wrapper')?.querySelector('.sigma-card-options-dropdown') : null;

        if (!dropdown && postId) {
            const classroomDetail = document.getElementById('section-classroom-detail');
            const roomFeed = document.getElementById('room-announcements-feed');
            const roomOpen = classroomDetail && !classroomDetail.classList.contains('hidden');
            const scope = (roomOpen && roomFeed) ? roomFeed : document;
            dropdown = scope.querySelector(`.sigma-card-options-dropdown[data-post-id="${postId}"]`)
                || document.getElementById(`sigma-card-options-${postId}`);
            if (dropdown && !btn) {
                btn = dropdown.closest('.sigma-card-options-wrapper')?.querySelector('.sigma-card-options-btn');
            }
        }

        return { btn, dropdown };
    }

    function closeAllCardOptions() {
        const openDropdowns = document.querySelectorAll('.sigma-card-options-dropdown.show');
        if (!openDropdowns.length) return;
        openDropdowns.forEach(d => {
            d.classList.remove('show');
            const parentWrapper = d.closest('.sigma-card-options-wrapper');
            if (parentWrapper) {
                parentWrapper.style.zIndex = '';
                const btn = parentWrapper.querySelector('.sigma-card-options-btn');
                if (btn) btn.classList.remove('active');
            }
        });
    }

    function toggleOptions(postId, e) {
        if (e) {
            if (typeof e.stopPropagation === 'function') e.stopPropagation();
            if (typeof e.preventDefault === 'function') e.preventDefault();
        }
        const resolved = resolveOptionsTrigger(postId, e);
        const dropdown = resolved.dropdown;
        if (!dropdown) return;
        const isShown = dropdown.classList.contains('show');
        
        // Close all open dropdowns first
        closeAllCardOptions();

        if (!isShown) {
            // Position using fixed coordinates to escape any overflow containers
            const btn = resolved.btn;
            if (btn) {
                btn.classList.add('active');
                const rect = btn.getBoundingClientRect();
                const dropdownHeight = dropdown.offsetHeight || 92;
                if (rect.bottom + 4 + dropdownHeight > window.innerHeight && rect.top > dropdownHeight) {
                    dropdown.style.top = Math.max(8, rect.top - dropdownHeight - 4) + 'px';
                } else {
                    dropdown.style.top = (rect.bottom + 4) + 'px';
                }
                const rightOffset = window.innerWidth - rect.right;
                dropdown.style.right = Math.max(8, rightOffset) + 'px';
                dropdown.style.left = 'auto';
            }
            dropdown.classList.add('show');
            const parentWrapper = dropdown.closest('.sigma-card-options-wrapper');
            if (parentWrapper) parentWrapper.style.zIndex = '999';
        }
    }

    function toggleSeeMore(postId, btn) {
        saveExpandedPost(postId);
        const previewEl = document.getElementById(`sigma-body-preview-${postId}`);
        const fullEl = document.getElementById(`sigma-body-full-${postId}`);
        if (!previewEl || !fullEl) return;

        previewEl.style.display = 'none';
        fullEl.style.display = 'inline';
    }

    function toggleSeeLess(postId, btn) {
        removeExpandedPost(postId);
        const previewEl = document.getElementById(`sigma-body-preview-${postId}`);
        const fullEl = document.getElementById(`sigma-body-full-${postId}`);
        if (!previewEl || !fullEl) return;

        fullEl.style.display = 'none';
        previewEl.style.display = 'inline';
    }

    // ═════════════════════════════════════════════════════════════════════════
    // LIGHTBOX GALLERY & NAVIGATION (Images, Videos, Previous, Next, Exit)
    // ═════════════════════════════════════════════════════════════════════════
    // ═════════════════════════════════════════════════════════════════════════
    // LIGHTBOX GALLERY & NAVIGATION (Images, Videos, Previous, Next, Exit)
    // ═════════════════════════════════════════════════════════════════════════
    let currentLightboxPhotos = [];
    let currentLightboxIndex = 0;
    let currentLightboxPostId = null;

    function openPostLightbox(postIdOrUrl, index = 0) {
        if (!postIdOrUrl) return;

        if (Array.isArray(postIdOrUrl)) {
            currentLightboxPhotos = postIdOrUrl.map(item => (typeof item === 'string' ? { type: (item.endsWith('.mp4') || item.endsWith('.webm')) ? 'video' : 'image', url: item } : item));
            currentLightboxIndex = index;
            currentLightboxPostId = null;
        } else if (postIdOrUrl instanceof File || postIdOrUrl instanceof Blob) {
            const blobUrl = URL.createObjectURL(postIdOrUrl);
            const isVideo = (postIdOrUrl.type && postIdOrUrl.type.startsWith('video/')) || /\.(mp4|webm)$/i.test(postIdOrUrl.name || '');
            currentLightboxPhotos = [{ type: isVideo ? 'video' : 'image', url: blobUrl }];
            currentLightboxIndex = 0;
            currentLightboxPostId = null;
        } else if (typeof postIdOrUrl === 'string' && (postIdOrUrl.startsWith('image/') || postIdOrUrl.startsWith('data:') || postIdOrUrl.startsWith('http') || postIdOrUrl.startsWith('/') || postIdOrUrl.startsWith('blob:') || /\.(png|jpg|jpeg|gif|webp|svg|mp4|webm)/i.test(postIdOrUrl))) {
            const isVideo = postIdOrUrl.endsWith('.mp4') || postIdOrUrl.endsWith('.webm') || postIdOrUrl.includes('video');
            currentLightboxPhotos = [{ type: isVideo ? 'video' : 'image', url: postIdOrUrl }];
            currentLightboxIndex = 0;
            currentLightboxPostId = null;
        } else {
            const posts = getStoredAnnouncements();
            const post = posts.find(p => p.id === postIdOrUrl);
            if (post) {
                currentLightboxPostId = post.id;
                const isVideo = post.mediaType === 'video' || (post.mediaUrl && (post.mediaUrl.startsWith('idb:ann_vid_') || post.mediaUrl.endsWith('.mp4') || (typeof post.mediaUrl === 'string' && post.mediaUrl.startsWith('data:video'))));
                if (isVideo) {
                    let vUrl = post.mediaUrl || (post.mediaUrls && post.mediaUrls[0]) || '';
                    if (typeof vUrl === 'string' && vUrl.startsWith('idb:')) {
                        const mId = vUrl.slice(4);
                        if (window._sigmaMediaMemoryCache && window._sigmaMediaMemoryCache.has(mId)) {
                            vUrl = window._sigmaMediaMemoryCache.get(mId);
                        } else {
                            getMediaBlob(mId).then(fetched => {
                                if (fetched && currentLightboxPhotos.length > 0 && currentLightboxPhotos[0].type === 'video') {
                                    currentLightboxPhotos[0].url = fetched;
                                    renderLightboxMedia();
                                }
                            });
                        }
                    }
                    currentLightboxPhotos = [{ type: 'video', url: vUrl }];
                    currentLightboxIndex = 0;
                } else {
                    let photos = (post.mediaUrls && post.mediaUrls.length > 0)
                        ? post.mediaUrls
                        : (post.mediaType === 'image' && post.mediaUrl ? [post.mediaUrl] : []);
                    photos = photos.map((u, pIdx) => {
                        if (typeof u === 'string' && u.startsWith('idb:')) {
                            const mId = u.slice(4);
                            if (window._sigmaMediaMemoryCache && window._sigmaMediaMemoryCache.has(mId)) {
                                return window._sigmaMediaMemoryCache.get(mId);
                            }
                            getMediaBlob(mId).then(fetched => {
                                if (fetched && currentLightboxPhotos[pIdx]) {
                                    currentLightboxPhotos[pIdx].url = fetched;
                                    renderLightboxMedia();
                                }
                            });
                        }
                        return u;
                    });
                    currentLightboxPhotos = photos.map(u => (typeof u === 'string' ? { type: 'image', url: u } : u));
                    currentLightboxIndex = Math.max(0, Math.min(index, currentLightboxPhotos.length - 1));
                }
            } else {
                currentLightboxPhotos = [{ type: 'image', url: postIdOrUrl }];
                currentLightboxIndex = 0;
                currentLightboxPostId = null;
            }
        }

        if (!currentLightboxPhotos.length) return;

        // Immediately pause any video currently playing in the feed panels
        document.querySelectorAll('video').forEach(v => {
            if (!v.closest('#announcement-image-lightbox')) {
                try { v.pause(); } catch (_) {}
            }
        });
        setTimeout(() => {
            document.querySelectorAll('video').forEach(v => {
                if (!v.closest('#announcement-image-lightbox')) {
                    try { v.pause(); } catch (_) {}
                }
            });
        }, 50);

        let overlay = document.getElementById('announcement-image-lightbox');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'announcement-image-lightbox';
            overlay.className = 'sigma-image-lightbox-overlay';
            overlay.innerHTML = `
                <!-- Exit button outside the image/video: pure exit icon without highlighted circle -->
                <button type="button" class="sigma-image-lightbox-close" id="sigma-lightbox-btn-close" title="Close preview (Esc)">
                    <i class="fa-solid fa-xmark"></i>
                </button>
                
                <!-- Left Navigation (Previous) - only shown for multi-image posts -->
                <button type="button" class="sigma-lightbox-nav-btn sigma-lightbox-nav-prev hidden" id="sigma-lightbox-btn-prev" style="display: none !important;" title="Previous (Left arrow)">
                    <i class="fa-solid fa-chevron-left"></i>
                </button>

                <!-- Centered Media Container -->
                <div class="sigma-image-lightbox-container" id="sigma-lightbox-img-container"></div>

                <!-- Right Navigation (Next) - only shown for multi-image posts -->
                <button type="button" class="sigma-lightbox-nav-btn sigma-lightbox-nav-next hidden" id="sigma-lightbox-btn-next" style="display: none !important;" title="Next (Right arrow)">
                    <i class="fa-solid fa-chevron-right"></i>
                </button>

                <!-- Counter - only shown for multi-image posts -->
                <div class="sigma-lightbox-counter hidden" id="sigma-lightbox-counter" style="display: none !important;"></div>

                <!-- Floating Post Like Button (Synchronized with Panel Post) -->
                <div class="sigma-lightbox-actions-bar hidden" id="sigma-lightbox-actions" style="display: none !important;">
                    <button type="button" class="sigma-lightbox-like-btn" id="sigma-lightbox-btn-like" title="Like post">
                        <i class="fa-regular fa-heart" id="sigma-lightbox-like-icon"></i>
                        <span id="sigma-lightbox-like-text">0</span>
                    </button>
                </div>
            `;
            document.body.appendChild(overlay);

            overlay.addEventListener('click', (e) => {
                if (e.target.id === 'announcement-image-lightbox' || e.target.closest('#sigma-lightbox-btn-close')) {
                    closeLightbox();
                }
            });

            document.getElementById('sigma-lightbox-btn-prev').addEventListener('click', (e) => {
                e.stopPropagation();
                if (currentLightboxPhotos.length > 1) navigateLightbox(-1);
            });

            document.getElementById('sigma-lightbox-btn-next').addEventListener('click', (e) => {
                e.stopPropagation();
                if (currentLightboxPhotos.length > 1) navigateLightbox(1);
            });

            document.addEventListener('keydown', (e) => {
                const lb = document.getElementById('announcement-image-lightbox');
                if (!lb || !lb.classList.contains('active')) return;
                if (e.key === 'Escape') {
                    closeLightbox();
                } else if (e.key === 'ArrowLeft' && currentLightboxPhotos.length > 1) {
                    navigateLightbox(-1);
                } else if (e.key === 'ArrowRight' && currentLightboxPhotos.length > 1) {
                    navigateLightbox(1);
                }
            });

            // Trap wheel and touch scroll events while lightbox is open
            overlay.addEventListener('wheel', (e) => {
                e.preventDefault();
            }, { passive: false });

            let touchStartX = 0;
            let touchStartY = 0;
            overlay.addEventListener('touchstart', (e) => {
                if (e.touches && e.touches.length === 1) {
                    touchStartX = e.touches[0].clientX;
                    touchStartY = e.touches[0].clientY;
                }
            }, { passive: true });

            overlay.addEventListener('touchend', (e) => {
                if (e.changedTouches && e.changedTouches.length === 1 && currentLightboxPhotos.length > 1) {
                    const diffX = e.changedTouches[0].clientX - touchStartX;
                    const diffY = e.changedTouches[0].clientY - touchStartY;
                    if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY) * 1.3) {
                        if (diffX < 0) {
                            navigateLightbox(1);
                        } else {
                            navigateLightbox(-1);
                        }
                    }
                }
            }, { passive: true });
        }

        updateLightboxView();
        updateLightboxLikeUI();
        overlay.classList.add('active');
        document.documentElement.classList.add('sigma-lightbox-open', 'overflow-hidden');
        document.body.classList.add('sigma-lightbox-open', 'overflow-hidden');
    }

    function updateLightboxLikeUI() {
        const overlay = document.getElementById('announcement-image-lightbox');
        if (!overlay) return;
        const actionsBar = overlay.querySelector('#sigma-lightbox-actions');
        const likeBtn = overlay.querySelector('#sigma-lightbox-btn-like');
        const likeIcon = overlay.querySelector('#sigma-lightbox-like-icon');
        const likeText = overlay.querySelector('#sigma-lightbox-like-text');
        if (!actionsBar || !likeBtn || !likeIcon || !likeText) return;

        likeBtn.onclick = function (e) {
            e.stopPropagation();
            e.preventDefault();
            if (currentLightboxPostId) {
                toggleLike(currentLightboxPostId);
            }
        };

        if (!currentLightboxPostId) {
            actionsBar.classList.add('hidden');
            actionsBar.style.setProperty('display', 'none', 'important');
            return;
        }

        const posts = getStoredAnnouncements();
        const post = posts.find(p => p.id === currentLightboxPostId);
        if (!post) {
            actionsBar.classList.add('hidden');
            actionsBar.style.setProperty('display', 'none', 'important');
            return;
        }

        actionsBar.classList.remove('hidden');
        actionsBar.style.setProperty('display', 'inline-flex', 'important');
        if (post.likedByMe) {
            likeBtn.classList.add('liked');
            likeIcon.className = 'fa-solid fa-heart';
        } else {
            likeBtn.classList.remove('liked');
            likeIcon.className = 'fa-regular fa-heart';
        }
        likeText.textContent = `${post.likes || 0}`;
    }

    function updateLightboxView() {
        const overlay = document.getElementById('announcement-image-lightbox');
        if (!overlay || !currentLightboxPhotos.length) return;

        const container = overlay.querySelector('#sigma-lightbox-img-container');
        const prevBtn = overlay.querySelector('#sigma-lightbox-btn-prev');
        const nextBtn = overlay.querySelector('#sigma-lightbox-btn-next');
        const counter = overlay.querySelector('#sigma-lightbox-counter');

        const currentItem = currentLightboxPhotos[currentLightboxIndex];
        const isVideo = (currentItem && (currentItem.type === 'video' || (typeof currentItem === 'string' && (currentItem.endsWith('.mp4') || currentItem.endsWith('.webm') || currentItem.startsWith('data:video')))));
        let mediaUrl = typeof currentItem === 'string' ? currentItem : currentItem.url;
        let idbAttr = '';

        if (typeof mediaUrl === 'string' && mediaUrl.startsWith('idb:')) {
            const mId = mediaUrl.slice(4);
            idbAttr = ` data-idb-media="${mId}"`;
            if (window._sigmaMediaMemoryCache && window._sigmaMediaMemoryCache.has(mId)) {
                mediaUrl = window._sigmaMediaMemoryCache.get(mId);
            } else {
                getMediaBlob(mId).then(bUrl => {
                    if (bUrl) {
                        const targetEl = overlay.querySelector(`[data-idb-media="${mId}"]`);
                        if (targetEl) targetEl.src = bUrl;
                    }
                });
            }
        }

        if (container) {
            if (isVideo) {
                container.innerHTML = `
                    <video src="${mediaUrl}" controls autoplay playsinline class="sigma-image-lightbox-video" id="sigma-lightbox-video"${idbAttr}></video>
                `;
            } else {
                container.innerHTML = `
                    <img src="${mediaUrl}" class="sigma-image-lightbox-img" id="sigma-lightbox-img" alt="Enlarged view"${idbAttr}>
                `;
            }
        }

        const isMulti = currentLightboxPhotos.length > 1;
        overlay.classList.toggle('has-multi-media', isMulti);

        if (prevBtn) {
            if (isMulti) {
                prevBtn.classList.remove('hidden');
                prevBtn.style.setProperty('display', 'flex', 'important');
            } else {
                prevBtn.classList.add('hidden');
                prevBtn.style.setProperty('display', 'none', 'important');
            }
        }
        if (nextBtn) {
            if (isMulti) {
                nextBtn.classList.remove('hidden');
                nextBtn.style.setProperty('display', 'flex', 'important');
            } else {
                nextBtn.classList.add('hidden');
                nextBtn.style.setProperty('display', 'none', 'important');
            }
        }
        if (counter) {
            if (isMulti) {
                counter.classList.remove('hidden');
                counter.style.setProperty('display', 'inline-flex', 'important');
                counter.textContent = `${currentLightboxIndex + 1} / ${currentLightboxPhotos.length}`;
            } else {
                counter.classList.add('hidden');
                counter.style.setProperty('display', 'none', 'important');
            }
        }

        updateLightboxLikeUI();
    }

    function navigateLightbox(direction) {
        if (!currentLightboxPhotos.length) return;
        const total = currentLightboxPhotos.length;
        currentLightboxIndex = (currentLightboxIndex + direction + total) % total;
        updateLightboxView();
    }

    function closeLightbox() {
        const overlay = document.getElementById('announcement-image-lightbox');
        if (overlay) {
            const vid = overlay.querySelector('video');
            if (vid) {
                vid.pause();
                vid.src = '';
            }
            overlay.classList.remove('active');
        }

        // Guarantee all videos in the dashboard panels remain strictly paused upon exiting
        document.querySelectorAll('.sigma-card-media-video-container video, article.sigma-announcement-card video').forEach(v => {
            try {
                v.pause();
            } catch (_) {}
        });

        document.documentElement.classList.remove('sigma-lightbox-open', 'overflow-hidden');
        document.body.classList.remove('sigma-lightbox-open', 'overflow-hidden');
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 10. FACEBOOK-STYLE POST DIALOG MODAL & COMMENTS SYSTEM
    // ═════════════════════════════════════════════════════════════════════════
    let activeDialogPostId = null;
    let activeReplyTarget = null; // { commentId, authorName }

    function ensurePostDialogDOM() {
        let backdrop = document.getElementById('sigma-post-dialog-backdrop');
        if (backdrop) {
            let backBtn = backdrop.querySelector('.sigma-post-dialog-back-btn');
            if (!backBtn) {
                const header = backdrop.querySelector('.sigma-post-dialog-header');
                if (header) {
                    header.insertAdjacentHTML('afterbegin', `
                        <button type="button" class="sigma-post-dialog-back-btn" onclick="window.SigmaAnnouncements.closePostDialog()" title="Back">
                            <i class="fa-solid fa-chevron-left"></i>
                        </button>
                    `);
                }
            }
            return backdrop;
        }

        backdrop = document.createElement('div');
        backdrop.id = 'sigma-post-dialog-backdrop';
        backdrop.className = 'sigma-post-dialog-backdrop';
        backdrop.innerHTML = `
        <div class="sigma-post-dialog-modal" id="sigma-post-dialog-modal" onclick="event.stopPropagation()">
            <div class="sigma-post-dialog-header">
                <button type="button" class="sigma-post-dialog-back-btn" onclick="window.SigmaAnnouncements.closePostDialog()" title="Back">
                    <i class="fa-solid fa-chevron-left"></i>
                </button>
                <h3 class="sigma-post-dialog-title" id="sigma-post-dialog-title">Post</h3>
                <button type="button" class="sigma-composer-close-btn" onclick="window.SigmaAnnouncements.closePostDialog()" title="Close">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
            <div class="sigma-post-dialog-body" id="sigma-post-dialog-body"></div>
            <div class="sigma-post-dialog-footer" id="sigma-post-dialog-footer"></div>
        </div>`;

        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) {
                closePostDialog();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const dlg = document.getElementById('sigma-post-dialog-backdrop');
                if (dlg && dlg.classList.contains('active')) {
                    closePostDialog();
                }
            }
        });

        document.body.appendChild(backdrop);
        return backdrop;
    }

    function handlePostCardClick(postId, e) {
        // Post dialog only opens when the Comments button is explicitly clicked
        return;
    }

    function openPostDialog(postId, e) {
        if (e) {
            if (typeof e.preventDefault === 'function') e.preventDefault();
            if (typeof e.stopPropagation === 'function') e.stopPropagation();
        }
        activeDialogPostId = postId;
        activeReplyTarget = null;
        const backdrop = ensurePostDialogDOM();
        renderPostDialogContent(postId);

        // Dynamically match width to post panel (or full-screen on mobile)
        const modalEl = document.getElementById('sigma-post-dialog-modal');
        const backdropEl = document.getElementById('sigma-post-dialog-backdrop');
        const isMobileOrTablet = window.innerWidth <= 1024 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobileOrTablet) {
            if (backdropEl) {
                backdropEl.style.padding = '0';
                backdropEl.style.background = '#ffffff';
            }
            if (modalEl) {
                modalEl.style.width = '100vw';
                modalEl.style.maxWidth = '100vw';
                modalEl.style.minWidth = '100vw';
                modalEl.style.height = '100vh';
                modalEl.style.maxHeight = '100vh';
                modalEl.style.minHeight = '100vh';
                modalEl.style.borderRadius = '0';
                modalEl.style.border = 'none';
                modalEl.style.margin = '0';
                modalEl.style.boxShadow = 'none';
            }
        } else {
            if (backdropEl) {
                backdropEl.style.padding = '';
                backdropEl.style.background = '';
            }
            if (modalEl) {
                modalEl.style.height = '';
                modalEl.style.maxHeight = '';
                modalEl.style.minHeight = '';
                modalEl.style.borderRadius = '';
                modalEl.style.border = '';
                modalEl.style.margin = '';
                modalEl.style.boxShadow = '';
                const cardEl = document.querySelector(`.sigma-announcement-card[data-post-id="${postId}"]`);
                const feedEl = document.getElementById('admin-announcements-feed') ||
                               document.getElementById('student-announcements-feed') ||
                               document.querySelector('.main-dashboard-column');
                const targetEl = cardEl || feedEl;
                if (targetEl) {
                    const targetRect = targetEl.getBoundingClientRect();
                    if (targetRect.width > 200) {
                        modalEl.style.width = targetRect.width + 'px';
                        modalEl.style.maxWidth = '100%';
                    } else {
                        modalEl.style.width = '100%';
                        modalEl.style.maxWidth = '680px';
                    }
                } else {
                    modalEl.style.width = '100%';
                    modalEl.style.maxWidth = '680px';
                }
            }
        }

        backdrop.classList.add('active');
        document.documentElement.classList.add('overflow-hidden');
    }

    function closePostDialog() {
        const input = document.getElementById('sigma-dialog-comment-input');
        const hasText = input && input.value && input.value.trim().length > 0;

        const performClose = () => {
            const backdrop = document.getElementById('sigma-post-dialog-backdrop');
            if (backdrop) backdrop.classList.remove('active');
            document.documentElement.classList.remove('overflow-hidden');
            activeDialogPostId = null;
            activeReplyTarget = null;
        };

        if (hasText) {
            if (typeof window.openAskingPanel === 'function') {
                window.openAskingPanel({
                    title: 'Discard Comment?',
                    message: 'You have an unsaved comment. Are you sure you want to discard your writing and exit?',
                    type: 'warning',
                    icon: 'fa-solid fa-triangle-exclamation text-amber-500',
                    confirmText: 'Discard',
                    cancelText: 'Keep Editing',
                    showCancel: true,
                    onConfirm: () => {
                        if (input) input.value = '';
                        performClose();
                    }
                });
            } else if (typeof window.showConfirmDialog === 'function') {
                window.showConfirmDialog({
                    title: 'Discard Comment?',
                    message: 'You have an unsaved comment. Are you sure you want to discard your writing and exit?',
                    type: 'warning',
                    confirmText: 'Discard',
                    cancelText: 'Keep Editing',
                    showCancel: true,
                    onConfirm: () => {
                        if (input) input.value = '';
                        performClose();
                    }
                });
            } else {
                if (confirm('You have an unsaved comment. Discard and exit?')) {
                    if (input) input.value = '';
                    performClose();
                }
            }
            return;
        }

        performClose();
    }

    function renderPostDialogContent(postId) {
        detectContext();
        const post = getStoredAnnouncements().find(p => p.id === postId);
        if (!post) {
            closePostDialog();
            return;
        }

        const titleEl = document.getElementById('sigma-post-dialog-title');
        if (titleEl) {
            const authorFirstName = (post.authorName || 'Teacher').trim().split(' ')[0];
            titleEl.textContent = `${authorFirstName}'s Post`;
        }

        const headerEl = document.querySelector('#sigma-post-dialog-modal .sigma-post-dialog-header');
        if (headerEl && !headerEl.querySelector('.sigma-post-dialog-back-btn')) {
            headerEl.insertAdjacentHTML('afterbegin', `
                <button type="button" class="sigma-post-dialog-back-btn" onclick="window.SigmaAnnouncements.closePostDialog()" title="Back">
                    <i class="fa-solid fa-chevron-left"></i>
                </button>
            `);
        }

        const bodyEl = document.getElementById('sigma-post-dialog-body');
        const footerEl = document.getElementById('sigma-post-dialog-footer');
        if (!bodyEl || !footerEl) return;

        const timeAgo = formatTimeAgo(post.createdAt);
        const authorAvatarHtml = (typeof window.renderUserAvatarHtml === 'function')
            ? window.renderUserAvatarHtml(post.authorId ? { uid: post.authorId, name: post.authorName, avatar: (post.authorAvatar && post.authorAvatar !== 'image/Welcome.jpg' ? post.authorAvatar : '') } : (post.authorName || 'User'), 'md', 'w-10 h-10 rounded-full object-cover')
            : `<div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200"><i class="fa-solid fa-user text-[#94a3b8] text-sm"></i></div>`;

        // Section badge
        const hasSection = (post.audience && (post.audience.startsWith('Grade') || post.audience.startsWith('grade_') || post.audience.startsWith('section_') || (!['everyone', 'all', 'teachers_only', 'faculty', 'all_students'].includes(post.audience)))) || (post.audienceLabel && (post.audienceLabel.startsWith('Grade') || post.audienceLabel.includes('•')));
        let sectionLabel = stripRoomFromLabel(post.audienceLabel || post.audience || '', post.sectionRoom);

        let sectionBadgeHtml = '';
        if (hasSection && sectionLabel) {
            let badgeTextContent = escapeHtml(sectionLabel);
            if (sectionLabel.includes(' • ')) {
                const secBulletParts = sectionLabel.split(' • ');
                const secPart = secBulletParts[0];
                const subjPart = secBulletParts.slice(1).join(' • ');
                badgeTextContent = `<span class="sigma-badge-sec-name">${escapeHtml(secPart)}</span><span class="sigma-badge-bullet">&nbsp;• </span><span class="sigma-badge-subj-name">${escapeHtml(subjPart)}</span>`;
            }
            sectionBadgeHtml = `
            <span class="sigma-card-section-badge sigma-card-audience-badge inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-700 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-[10px]" title="Section: ${escapeHtml(sectionLabel)}">
                <i class="fa-solid fa-graduation-cap text-[9.5px] text-amber-500 shrink-0"></i>
                <span class="sigma-card-badge-label-text">${badgeTextContent}</span>
            </span>`;
        }

        let targetedBadgeHtml = '';
        let dialogTargetedNames = (post.targetStudents && Array.isArray(post.targetStudents) && post.targetStudents.length > 0)
            ? post.targetStudents
            : [];
        if (dialogTargetedNames.length === 0 && post.targetStudentsLabel && post.targetStudentsLabel !== 'All Students' && post.targetStudentsLabel !== 'All students') {
            dialogTargetedNames = [post.targetStudentsLabel];
        }
        if (dialogTargetedNames.length > 0) {
            const studentDisplayText = dialogTargetedNames.length === 1 ? dialogTargetedNames[0] : `${dialogTargetedNames.length} students`;
            targetedBadgeHtml = `
            <button type="button" class="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200/90 border border-slate-200/80 px-2.5 py-0.5 rounded-full transition-all cursor-pointer hover:shadow-sm" onclick="window.SigmaAnnouncements.openTargetedStudentsViewer('${post.id}', event)" title="${escapeHtml(dialogTargetedNames.join(', '))}">
                <i class="fa-solid fa-user-check text-[9px] text-emerald-600"></i>
                <span>${escapeHtml(studentDisplayText)}</span>
            </button>`;
        }

        const isPostImportant = post.priority === 'important' || post.priorityLabel === 'Important' || post.type === 'urgent' || Boolean(post.isImportant);
        let importantBadgeHtml = '';
        if (isPostImportant) {
            importantBadgeHtml = `
            <span class="sigma-badge-important inline-flex items-center justify-center text-amber-900 bg-amber-100 border border-amber-200/90 px-1.5 py-0.5 rounded-full transition-all shrink-0 select-none shadow-xs ml-0.5" title="Important Announcement" aria-label="Important Announcement">
                <i class="fa-solid fa-star text-[9.5px] text-amber-500"></i>
            </span>`;
        }

        // Attached media
        let mediaHtml = '';
        const isVideo = post.mediaType === 'video' || (post.mediaUrl && (post.mediaUrl.startsWith('idb:ann_vid_') || post.mediaUrl.endsWith('.mp4') || (typeof post.mediaUrl === 'string' && post.mediaUrl.startsWith('data:video'))));
        if (isVideo) {
            let vidUrl = post.mediaUrl;
            if (typeof vidUrl === 'string' && vidUrl.startsWith('idb:')) {
                const mId = vidUrl.slice(4);
                if (window._sigmaMediaMemoryCache && window._sigmaMediaMemoryCache.has(mId)) {
                    vidUrl = window._sigmaMediaMemoryCache.get(mId);
                }
            }
            mediaHtml = `
            <div class="rounded-2xl overflow-hidden bg-black max-h-[380px] flex items-center justify-center my-3 border border-slate-200">
                <video src="${vidUrl}" controls playsinline class="max-h-[380px] w-full object-contain"></video>
            </div>`;
        } else if (post.mediaUrls && post.mediaUrls.length > 0) {
            mediaHtml = `
            <div class="grid gap-2 my-3 ${post.mediaUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}">
                ${post.mediaUrls.map((url, idx) => `
                <div class="rounded-xl overflow-hidden bg-black border border-slate-200 max-h-[260px] flex items-center justify-center">
                    <img src="${url}" class="w-full h-full object-contain max-h-[260px]" alt="Photo ${idx + 1}">
                </div>`).join('')}
            </div>`;
        }

        // Comments list with nested replies
        const comments = Array.isArray(post.comments) ? post.comments : [];
        let commentsListHtml = '';
        if (comments.length === 0) {
            commentsListHtml = `
            <div class="py-8 text-center text-xs text-black-fade select-none">
                <i class="fa-regular fa-comments text-3xl text-slate-300 block mb-2"></i>
                <span class="font-medium">No comments yet. Be the first to comment!</span>
            </div>`;
        } else {
            const renderSingleCommentHtml = (c, isReply = false) => {
                const indentClass = isReply ? 'ml-8 pl-2 border-l-2 border-slate-100' : 'mb-3.5';
                let authorPhoto = c.authorAvatar || '';
                const aId = String(c.authorId || '').replace(/^#/, '').trim();
                const aName = String(c.authorName || '').trim();

                const isMockPhoto = (p) => {
                    if (!p || typeof p !== 'string') return true;
                    const s = p.trim().toLowerCase();
                    return s === '' || s === 'null' || s === 'undefined' ||
                           s.includes('icc logo') || s.includes('icc-logo') || s.includes('welcome.jpg') || s.includes('favicon');
                };

                if (isMockPhoto(authorPhoto)) authorPhoto = '';

                if (!authorPhoto && typeof window.getCurrentUserAvatar === 'function') {
                    if (aId) authorPhoto = window.getCurrentUserAvatar(aId);
                    if (isMockPhoto(authorPhoto) && aName) authorPhoto = window.getCurrentUserAvatar(aName);
                }
                if (isMockPhoto(authorPhoto) && aId) {
                    authorPhoto = localStorage.getItem(`sigma_avatar_${aId}`) || '';
                }
                if (isMockPhoto(authorPhoto) && aName) {
                    const allUsers = (typeof window.getStoredJson === 'function') ? window.getStoredJson('sigma-admin-users', []) : [];
                    const match = Array.isArray(allUsers) && allUsers.find(u => {
                        const fn = `${u.firstName || ''} ${u.lastName || ''}`.trim().toLowerCase();
                        const rev = `${u.lastName || ''}, ${u.firstName || ''}`.trim().toLowerCase();
                        const raw = String(u.name || u.fullName || '').trim().toLowerCase();
                        const search = aName.toLowerCase();
                        return fn === search || rev === search || raw === search;
                    });
                    if (match) {
                        authorPhoto = match.profilePicture || match.avatar || match.photo || match.profileImage || '';
                        if (isMockPhoto(authorPhoto) && (match.uid || match.id)) {
                            authorPhoto = localStorage.getItem(`sigma_avatar_${match.uid || match.id}`) || '';
                        }
                    }
                }
                if (isMockPhoto(authorPhoto)) {
                    const lower = aName.toLowerCase();
                    if (c.authorRole === 'student' || lower.includes('juan dela cruz') || lower.includes('dela cruz')) {
                        authorPhoto = localStorage.getItem('sigma_avatar_2222222') || localStorage.getItem('sigma_student_avatar_base64') || '';
                    } else if (c.authorRole === 'teacher' || lower.includes('maria santos') || lower.includes('ramos')) {
                        authorPhoto = localStorage.getItem('sigma_avatar_1111111') || localStorage.getItem('sigma_teacher_avatar_base64') || '';
                    }
                }
                if (isMockPhoto(authorPhoto)) authorPhoto = '';

                const cAvatar = (typeof window.renderUserAvatarHtml === 'function')
                    ? window.renderUserAvatarHtml({ uid: aId, name: aName, avatar: authorPhoto, profilePicture: authorPhoto }, 'sm')
                    : (authorPhoto
                        ? `<div class="sigma-user-avatar sigma-user-avatar--sm"><img src="${escapeHtml(authorPhoto)}" alt="${escapeHtml(aName)}" onerror="this.remove();"><i class="fa-solid fa-user"></i></div>`
                        : `<div class="sigma-user-avatar sigma-user-avatar--sm"><i class="fa-solid fa-user text-[#94a3b8] text-xs"></i></div>`);
                // Check permission: Is user the comment author? Or is user teacher/admin with moderation enabled?
                const isOwnComment = (currentUser.name && c.authorName && currentUser.name.trim().toLowerCase() === c.authorName.trim().toLowerCase()) ||
                                     (currentUser.id && c.authorId && String(currentUser.id) === String(c.authorId));

                const isTeacherOrAdmin = currentUser.role === 'teacher' ||
                                         currentUser.role === 'admin' ||
                                         currentRole === 'teacher' ||
                                         currentRole === 'admin';

                // Check if this comment was deleted by a moderator/teacher
                if (c.isDeleted) {
                    // Only the owner of the comment (or teachers/admins) should see the "removed" notice. Other students won't see it at all.
                    if (!isOwnComment && !isTeacherOrAdmin) {
                        return '';
                    }

                    const deletedNotice = isOwnComment
                        ? (c.deletedByRole === 'admin' 
                            ? 'Your comment was removed by an Administrator'
                            : 'Your comment was removed by a Teacher')
                        : (c.deletedByRole === 'admin'
                            ? `Comment by ${escapeHtml(c.authorName)} was removed by an Administrator`
                            : `Comment by ${escapeHtml(c.authorName)} was removed by a Teacher`);

                    return `
                    <div class="flex items-center gap-2.5 ${indentClass} py-1.5 opacity-70 italic text-slate-500 text-xs" id="dialog-comment-${c.id}">
                        <div class="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-xs border border-slate-200 shrink-0">
                            <i class="fa-solid fa-ban text-[11px]"></i>
                        </div>
                        <div class="flex-1 bg-slate-50 border border-slate-200/70 rounded-xl px-3 py-1.5 flex items-center justify-between">
                            <span class="text-[12px] font-medium text-slate-600">
                                <i class="fa-solid fa-circle-info mr-1 text-[10px] text-slate-400"></i>${deletedNotice}
                            </span>
                            <span class="text-[10px] text-slate-400 not-italic">${formatTimeAgo(c.deletedAt || c.createdAt)}</span>
                        </div>
                    </div>`;
                }

                const roleStr = String(currentUser.role || currentRole || '').toLowerCase();
                const isMasterAdmin = roleStr.includes('master') || roleStr.includes('super') || roleStr.includes('head') || String(currentUser.uid || currentUser.id || '') === '0000000';

                let hasModerationPermission = (roleStr === 'teacher') || isMasterAdmin;
                const currentUserId = currentUser.id || currentUser.uid || 'default';
                try {
                    const rawPref = localStorage.getItem(`sigma_settings_preferences_${currentUserId}`);
                    if (rawPref) {
                        const parsed = JSON.parse(rawPref);
                        if (parsed && typeof parsed.canModerateComments === 'boolean') {
                            hasModerationPermission = parsed.canModerateComments;
                        }
                    }

                    // Also check role-based permissions from admin user management if assigned
                    const allUsers = (typeof window.getStoredJson === 'function') ? window.getStoredJson('sigma-admin-users', []) : [];
                    const foundUser = Array.isArray(allUsers) && allUsers.find(u => String(u.uid || u.id || '') === String(currentUserId));
                    if (foundUser) {
                        const uRole = String(foundUser.role || foundUser.type || '').toLowerCase();
                        if (uRole.includes('master') || String(foundUser.uid || foundUser.id || '') === '0000000') {
                            hasModerationPermission = true;
                        } else if (foundUser.permissions) {
                            if (uRole === 'teacher' && typeof foundUser.permissions.teacherDeleteComments === 'boolean') {
                                hasModerationPermission = foundUser.permissions.teacherDeleteComments;
                            } else if (uRole.includes('admin') && typeof foundUser.permissions.actionDeleteComments === 'boolean') {
                                hasModerationPermission = foundUser.permissions.actionDeleteComments;
                            }
                        } else if (uRole.includes('admin') && !uRole.includes('master')) {
                            // Regular admin without explicit permission defaults to false
                            hasModerationPermission = false;
                        }
                    }
                } catch (e) {}

                const isCommentTeacher = (c.authorRole === 'teacher' || c.authorRole === 'admin') ||
                                         (aName.toLowerCase().includes('maria santos') || aName.toLowerCase().includes('ramos') || aName.toLowerCase().includes('teacher'));
                const isPostAuthor = (post.author && c.authorName && post.author.trim().toLowerCase() === c.authorName.trim().toLowerCase()) ||
                                     (post.authorName && c.authorName && post.authorName.trim().toLowerCase() === c.authorName.trim().toLowerCase());
                const isAuthorOrTeacher = isCommentTeacher || isPostAuthor;
                
                // Active user is comment author, or teacher/admin, or post author
                const canDelete = isOwnComment || isTeacherOrAdmin || isPostAuthor;

                return `
                <div class="flex items-start gap-2.5 ${indentClass} group" id="dialog-comment-${c.id}">
                    <div class="flex-shrink-0">
                        ${cAvatar}
                    </div>
                    <div class="flex flex-col max-w-[85%]">
                        <div class="sigma-comment-bubble">
                            <div class="flex items-center gap-1.5 flex-wrap">
                                <span class="text-xs font-bold text-black">${escapeHtml(c.authorName)}</span>
                                ${isCommentTeacher ? `<span class="text-[9.5px] font-bold text-black-fade bg-slate-100 border border-black/10 px-1.5 py-0.5 rounded-full leading-none">Teacher</span>` : (isPostAuthor ? `<span class="text-[9.5px] font-bold text-blue-800 bg-blue-100 px-1.5 py-0.5 rounded-full leading-none">Author</span>` : '')}
                            </div>
                            <div class="text-[10.5px] text-black-fade font-normal -mt-0.5 mb-1 leading-tight">
                                ${formatTimeAgo(c.createdAt)}
                            </div>
                            <p class="text-[13px] text-slate-800 leading-relaxed break-words m-0">
                                ${c.replyToAuthorName ? `<span class="text-[12px] font-semibold text-black bg-slate-100 px-1.5 py-0.5 rounded mr-1 inline-block">@${escapeHtml(c.replyToAuthorName)}</span>` : ''}${escapeHtml(c.text)}
                            </p>
                        </div>
                        <div class="flex items-center gap-1.5 pt-1.5 text-[12px] text-black-fade">
                            <button type="button" class="text-black-fade hover:text-black hover:bg-slate-100 px-2 py-0.5 rounded-full font-semibold cursor-pointer transition-colors text-[11.5px] leading-normal bg-transparent border-0 select-none" onclick="window.SigmaAnnouncements.startReply('${post.id}', '${c.id}', '${escapeHtml(c.authorName)}')" title="Reply to ${escapeHtml(c.authorName)}">
                                Reply
                            </button>
                            <button type="button" class="inline-flex items-center gap-1 hover:text-black hover:bg-slate-100 px-1.5 py-0.5 rounded-full transition-colors cursor-pointer text-black-fade text-[11.5px] leading-normal bg-transparent border-0 select-none" onclick="window.SigmaAnnouncements.toggleCommentLike('${post.id}', '${c.id}')" title="${c.likedByMe ? 'Unlike' : 'Like'}">
                                <i class="${c.likedByMe ? 'fa-solid text-red-500' : 'fa-regular'} fa-heart text-[12px]"></i>
                                ${c.likes ? `<span class="font-semibold">${c.likes}</span>` : ''}
                            </button>
                            ${canDelete ? `
                            <button type="button" class="sigma-comment-delete-btn w-6 h-6 rounded-full flex items-center justify-center text-black-fade hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer bg-transparent border-0 text-xs" onclick="window.SigmaAnnouncements.deleteComment('${post.id}', '${c.id}')" title="Delete comment">
                                <i class="fa-regular fa-trash-can text-[11.5px]"></i>
                            </button>` : ''}
                        </div>
                    </div>
                </div>`;
            };

            const topLevelComments = [];
            const repliesByParentId = new Map();

            comments.forEach(c => {
                if (c.replyToCommentId) {
                    if (!repliesByParentId.has(c.replyToCommentId)) {
                        repliesByParentId.set(c.replyToCommentId, []);
                    }
                    repliesByParentId.get(c.replyToCommentId).push(c);
                } else {
                    topLevelComments.push(c);
                }
            });

            const renderedCommentIds = new Set();
            let htmlAcc = '';

            const renderThreadRecursive = (comment, isReply = false) => {
                renderedCommentIds.add(comment.id);
                let threadHtml = renderSingleCommentHtml(comment, isReply);
                const children = repliesByParentId.get(comment.id) || [];
                children.forEach(child => {
                    threadHtml += renderThreadRecursive(child, true);
                });
                return threadHtml;
            };

            topLevelComments.forEach(topC => {
                htmlAcc += renderThreadRecursive(topC, false);
            });

            comments.forEach(c => {
                if (!renderedCommentIds.has(c.id)) {
                    htmlAcc += renderSingleCommentHtml(c, Boolean(c.replyToCommentId));
                }
            });

            commentsListHtml = htmlAcc;
        }

        bodyEl.innerHTML = `
        <div class="flex flex-col">
            <!-- Author Row -->
            <div class="flex items-center gap-3 mb-3">
                <div class="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                    ${authorAvatarHtml}
                </div>
                <div class="flex flex-col min-w-0 flex-1">
                    <div class="flex items-center gap-1.5 flex-wrap">
                        <span class="text-sm font-bold text-black truncate">${escapeHtml(post.authorName)}</span>
                        ${importantBadgeHtml}
                    </div>
                    <div class="flex items-center gap-1.5 flex-wrap text-xs text-slate-500 mt-0.5">
                        <span class="font-medium text-slate-700">${post.authorRole === 'admin' ? 'Administrator' : (post.authorRole === 'student' ? 'Student' : 'Teacher')}</span>
                        <span class="text-slate-400">&bull;</span>
                        <span class="text-slate-500">${timeAgo}</span>
                        ${sectionBadgeHtml}
                        ${targetedBadgeHtml}
                    </div>
                </div>
            </div>

            <!-- Title & Body -->
            ${post.title ? `<h4 class="text-base font-bold text-black mb-1.5 leading-snug">${escapeHtml(post.title)}</h4>` : ''}
            ${post.body ? `<div class="text-[14px] text-slate-800 leading-relaxed font-['Inter'] whitespace-pre-wrap mb-2">${formatAnnouncementRichText(post.body)}</div>` : ''}

            <!-- Media -->
            ${mediaHtml}

            <!-- Reactions / Likes & Comments Counter -->
            <div class="flex items-center gap-2 py-2 border-y border-slate-100 my-2">
                <button type="button" class="sigma-card-like-btn ${post.likedByMe ? 'liked' : ''}" onclick="window.SigmaAnnouncements.toggleDialogLike('${post.id}')" title="Like post">
                    <i class="${post.likedByMe ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
                    <span>${post.likes || 0} Likes</span>
                </button>
                <div class="sigma-card-comment-btn" style="cursor: default;" title="Comments">
                    <i class="fa-regular fa-comment"></i>
                    <span>${comments.length} ${comments.length === 1 ? 'Comment' : 'Comments'}</span>
                </div>
            </div>

            <!-- Comments List -->
            <div class="mt-2" id="dialog-comments-list-container">
                ${commentsListHtml}
            </div>
        </div>`;

        // Footer Comment Composer
        const canComment = isPostCommentsEnabled(post);
        if (canComment) {
            detectContext();
            const userAvatarHtml = (typeof window.renderUserAvatarHtml === 'function')
                ? window.renderUserAvatarHtml(currentUser, 'sm')
                : `<div class="sigma-user-avatar sigma-user-avatar--sm"><i class="fa-solid fa-user text-[#94a3b8] text-xs"></i></div>`;

            const replyBannerHtml = activeReplyTarget ? `
            <div class="flex items-center justify-between bg-slate-100 text-[11.5px] text-slate-700 px-3 py-1 rounded-t-xl border border-slate-200/80 mb-1.5">
                <span>Replying to <b class="text-black font-semibold">@${escapeHtml(activeReplyTarget.authorName)}</b></span>
                <button type="button" class="w-5 h-5 rounded-full flex items-center justify-center text-slate-400 hover:text-black hover:bg-slate-200 transition-colors cursor-pointer" onclick="window.SigmaAnnouncements.cancelReply('${post.id}')" title="Cancel reply">
                    <i class="fa-solid fa-xmark text-xs"></i>
                </button>
            </div>` : '';

            const placeholderText = activeReplyTarget ? `Reply to ${activeReplyTarget.authorName}...` : 'Share your thoughts...';

            footerEl.innerHTML = `
            ${replyBannerHtml}
            <div class="flex items-center gap-2.5">
                <div class="flex-shrink-0">
                    ${userAvatarHtml}
                </div>
                <div class="sigma-comment-input-pill flex-1">
                    <textarea id="sigma-dialog-comment-input" rows="1" class="sigma-comment-textarea flex-1" placeholder="${escapeHtml(placeholderText)}" maxlength="1000" oninput="window.SigmaAnnouncements ? window.SigmaAnnouncements.autoResizeCommentInput(this) : null" onkeydown="if((event.key==='Enter'||event.keyCode===13||event.which===13)&&!event.shiftKey&&!event.isComposing){event.preventDefault();event.stopPropagation();window.SigmaAnnouncements.submitComment('${post.id}');}"></textarea>
                    <button type="button" id="sigma-dialog-comment-send-btn" class="w-7 h-7 flex items-center justify-center text-emerald-700 hover:text-emerald-800 transition-transform hover:scale-110 cursor-pointer shrink-0" onclick="window.SigmaAnnouncements.submitComment('${post.id}')" title="Post comment">
                        <i class="fa-solid fa-paper-plane text-xs"></i>
                    </button>
                </div>
            </div>`;
        } else {
            footerEl.innerHTML = `
            <div class="text-center py-1 text-xs text-black-fade font-medium">
                <i class="fa-solid fa-lock mr-1.5 text-[10px]"></i>Comments are turned off for this section.
            </div>`;
        }
    }

    function autoResizeCommentInput(textarea) {
        if (!textarea) return;
        textarea.style.height = '36px';
        const scrollH = textarea.scrollHeight;
        if (scrollH > 38) {
            const newH = Math.min(scrollH, 120);
            textarea.style.height = newH + 'px';
            textarea.style.overflowY = scrollH > 120 ? 'auto' : 'hidden';
        } else {
            textarea.style.height = '36px';
            textarea.style.overflowY = 'hidden';
        }
    }

    function startReply(postId, commentId, authorName) {
        activeReplyTarget = { commentId, authorName };
        renderPostDialogContent(postId);
        const input = document.getElementById('sigma-dialog-comment-input');
        if (input) {
            input.focus();
            autoResizeCommentInput(input);
        }
    }

    function cancelReply(postId) {
        activeReplyTarget = null;
        renderPostDialogContent(postId);
    }

    function toggleDialogLike(postId) {
        toggleLike(postId);
        renderPostDialogContent(postId);
    }

    function submitComment(postId) {
        detectContext();
        const input = document.getElementById('sigma-dialog-comment-input');
        if (!input) return;
        const text = input.value.trim();
        if (!text) return;

        const sendBtn = document.getElementById('sigma-dialog-comment-send-btn');
        if (sendBtn) {
            sendBtn.disabled = true;
            sendBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-xs"></i>';
        }
        input.disabled = true;

        setTimeout(() => {
            const posts = getStoredAnnouncements();
            const post = posts.find(p => p.id === postId);
            if (!post) return;

            if (!Array.isArray(post.comments)) {
                post.comments = [];
            }

            let authorAvatar = currentUser.avatar || '';
            const uid = currentUser.id || currentUser.uid || '';
            const uname = currentUser.name || '';
            if (!authorAvatar && typeof window.getCurrentUserAvatar === 'function') {
                if (uid) authorAvatar = window.getCurrentUserAvatar(uid);
                if (!authorAvatar && uname) authorAvatar = window.getCurrentUserAvatar(uname);
            }
            if (!authorAvatar && uid) {
                authorAvatar = localStorage.getItem(`sigma_avatar_${uid}`) || '';
            }
            if (!authorAvatar) {
                if (currentUser.role === 'student' || uname.toLowerCase().includes('juan dela cruz')) {
                    authorAvatar = localStorage.getItem('sigma_avatar_2222222') || localStorage.getItem('sigma_student_avatar_base64') || '';
                } else {
                    authorAvatar = localStorage.getItem('sigma_avatar_1111111') || localStorage.getItem('sigma_teacher_avatar_base64') || '';
                }
            }

            const newComment = {
                id: 'cmt-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
                authorId: uid,
                authorName: uname || (currentUser.role === 'student' ? 'Student' : 'Teacher'),
                authorRole: currentUser.role || 'teacher',
                authorAvatar: authorAvatar || '',
                text: text,
                createdAt: new Date().toISOString(),
                likes: 0,
                likedByMe: false,
                replyToCommentId: activeReplyTarget ? activeReplyTarget.commentId : null,
                replyToAuthorName: activeReplyTarget ? activeReplyTarget.authorName : null
            };

            post.comments.push(newComment);
            saveStoredAnnouncements(posts);

            activeReplyTarget = null;
            renderPostDialogContent(postId);
            updatePostCommentCountUI(postId, post.comments ? post.comments.length : 0);

            // Auto scroll to newly added comment
            const bodyEl = document.getElementById('sigma-post-dialog-body');
            if (bodyEl) {
                bodyEl.scrollTop = bodyEl.scrollHeight;
            }
        }, 300);
    }

    function deleteComment(postId, commentId) {
        const executeDelete = () => {
            const posts = getStoredAnnouncements();
            const post = posts.find(p => p.id === postId);
            if (!post || !Array.isArray(post.comments)) return;

            const targetComment = post.comments.find(c => c.id === commentId);
            if (!targetComment) return;

            const isOwnComment = (currentUser.name && targetComment.authorName && currentUser.name.trim().toLowerCase() === targetComment.authorName.trim().toLowerCase()) ||
                                 (currentUser.id && targetComment.authorId && String(currentUser.id) === String(targetComment.authorId));

            const isTeacherOrAdmin = currentUser.role === 'teacher' ||
                                     currentUser.role === 'admin' ||
                                     currentRole === 'teacher' ||
                                     currentRole === 'admin';

            // If deleted by a teacher or admin (moderation of someone else's comment), mark as deleted with an indicator
            if (isTeacherOrAdmin && !isOwnComment) {
                if (targetComment.isDeleted) return;
                targetComment.isDeleted = true;
                targetComment.deletedByRole = currentUser.role || currentRole || 'teacher';
                targetComment.deletedByName = currentUser.name || (currentUser.role === 'teacher' ? 'Teacher' : 'Administrator');
                targetComment.deletedAt = new Date().toISOString();
                targetComment.originalText = targetComment.text;
                targetComment.text = '[This comment was removed by a moderator]';
            } else {
                // If author deletes their own comment, remove it and its child replies
                post.comments = post.comments.filter(c => c.id !== commentId && c.replyToCommentId !== commentId);
            }

            saveStoredAnnouncements(posts);
            if (isTeacherOrAdmin && !isOwnComment) {
                notifyModeratedRemoval(targetComment, 'Comment Removed', `Your comment${post.title ? ` on "${post.title}"` : ''} was removed by ${currentRole === 'admin' ? 'an administrator' : 'a teacher'}.`);
            }
            renderPostDialogContent(postId);
            updatePostCommentCountUI(postId, post.comments ? post.comments.length : 0);
        };

        if (typeof window.openAskingPanel === 'function') {
            window.openAskingPanel({
                title: 'Delete Comment',
                message: 'Are you sure you want to delete this comment? This action cannot be undone.',
                type: 'primary',
                icon: 'fa-solid fa-trash-can text-red-600',
                confirmText: 'Delete',
                cancelText: 'Cancel',
                showCancel: true,
                onConfirm: executeDelete
            });
        } else if (typeof window.showConfirmDialog === 'function') {
            window.showConfirmDialog({
                title: 'Delete Comment',
                message: 'Are you sure you want to delete this comment? This action cannot be undone.',
                type: 'primary',
                icon: 'fa-solid fa-trash-can text-red-600',
                confirmText: 'Delete',
                cancelText: 'Cancel',
                showCancel: true,
                onConfirm: executeDelete
            });
        } else {
            if (confirm('Are you sure you want to delete this comment?')) {
                executeDelete();
            }
        }
    }

    function toggleCommentLike(postId, commentId) {
        const posts = getStoredAnnouncements();
        const post = posts.find(p => p.id === postId);
        if (!post || !Array.isArray(post.comments)) return;

        const comment = post.comments.find(c => c.id === commentId);
        if (!comment) return;

        comment.likedByMe = !comment.likedByMe;
        comment.likes = (comment.likes || 0) + (comment.likedByMe ? 1 : -1);
        if (comment.likes < 0) comment.likes = 0;

        saveStoredAnnouncements(posts);
        renderPostDialogContent(postId);
    }

    // Global listener to close options dropdown when clicking/tapping outside, scrolling, or pressing Escape
    function handleCardOptionsOutsideInteraction(e) {
        if (e.target && typeof e.target.closest === 'function') {
            if (e.target.closest('.sigma-card-options-dropdown') || e.target.closest('.sigma-card-options-btn')) {
                return;
            }
        }
        closeAllCardOptions();
    }

    // Capture phase listeners ensure clicks/taps outside dismiss immediately, even if stopPropagation is used elsewhere
    document.addEventListener('pointerdown', handleCardOptionsOutsideInteraction, true);
    document.addEventListener('click', handleCardOptionsOutsideInteraction, true);

    // Dismiss immediately when scrolling anywhere (window, document, or any scrollable container), resizing, or pressing Escape
    window.addEventListener('scroll', closeAllCardOptions, { capture: true, passive: true });
    window.addEventListener('wheel', closeAllCardOptions, { capture: true, passive: true });
    window.addEventListener('touchmove', closeAllCardOptions, { capture: true, passive: true });
    window.addEventListener('resize', closeAllCardOptions, { passive: true });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeAllCardOptions();
    });

    function syncTabButtonsUI(activeTabKey = currentActiveTab) {
        const normalized = (activeTabKey === 'announcements' || activeTabKey === 'general' || activeTabKey === 'overall' || !activeTabKey) ? 'all' : activeTabKey;
        const tabBtns = document.querySelectorAll('.sigma-feed-tab-btn, [data-announcement-tab], #tab-announcement-overall, #tab-announcement-important, #tab-announcement-posts, #announcement-tab-all, #announcement-tab-important, #announcement-tab-posts');
        tabBtns.forEach(btn => {
            let tabKey = btn.getAttribute('data-announcement-tab');
            if (!tabKey) {
                const id = btn.id || '';
                if (id.includes('important')) tabKey = 'important';
                else if (id.includes('post')) tabKey = 'posts';
                else tabKey = 'all';
            }
            if (tabKey === 'announcements' || tabKey === 'general' || tabKey === 'overall') {
                tabKey = 'all';
            }

            // If student role, hide posts tab button
            if (currentRole === 'student' && tabKey === 'posts') {
                btn.style.display = 'none';
                return;
            }

            const isActive = (tabKey === normalized);
            if (isActive) {
                btn.classList.add('active', 'bg-[#15803d]', 'text-white');
                btn.classList.remove('text-slate-900', 'hover:bg-slate-50');
                btn.style.setProperty('background-color', '#15803d', 'important');
                btn.style.setProperty('color', '#ffffff', 'important');
            } else {
                btn.classList.remove('active', 'bg-[#15803d]', 'text-white');
                btn.classList.add('text-slate-900');
                btn.style.removeProperty('background-color');
                btn.style.removeProperty('color');
            }
        });
    }

    function refreshAllFeeds() {
        const targets = [
            'admin-announcements-feed',
            'teacher-announcements-feed',
            'student-announcements-feed',
            'institutional-announcements-list'
        ];
        targets.forEach(id => {
            if (document.getElementById(id)) renderFeed(id, currentActiveTab);
        });
        const roomFeed = document.getElementById('room-announcements-feed');
        if (roomFeed) {
            const sec = getActiveRoomSectionName();
            const subj = getActiveRoomSubjectName();
            if (sec && !window.currentClassroomSectionName) {
                window.currentClassroomSectionName = sec;
            }
            if (subj && !window.currentClassroomSubject) {
                window.currentClassroomSubject = subj;
            }
            renderFeed('room-announcements-feed', 'all', sec || null, subj || null);
        }
        const adminRoomFeed = document.getElementById('admin-room-announcements-feed');
        if (adminRoomFeed) {
            const sec = getActiveRoomSectionName();
            const subj = getActiveRoomSubjectName();
            renderFeed('admin-room-announcements-feed', 'all', sec || null, subj || null);
        }
        syncTabButtonsUI(currentActiveTab);
    }

    // Dynamically build and unify Announcement Tabs across all portals
    function ensureTabsDOM() {
        detectContext();
        const feedContainers = [
            'admin-announcements-feed',
            'teacher-announcements-feed',
            'student-announcements-feed',
            'institutional-announcements-list'
        ];

        feedContainers.forEach(id => {
            const feedEl = document.getElementById(id);
            if (!feedEl || !feedEl.parentElement) return;

            let tabsContainer = feedEl.previousElementSibling;
            if (!tabsContainer || !tabsContainer.classList.contains('sigma-feed-tabs-container')) {
                tabsContainer = feedEl.parentElement.querySelector('.sigma-feed-tabs-container');
            }

            const isStudent = currentRole === 'student';
            const tabsHTML = isStudent
                ? `<button type="button" class="sigma-feed-tab-btn" data-announcement-tab="all">Announcements</button><button type="button" class="sigma-feed-tab-btn" data-announcement-tab="important">Important</button>`
                : `<button type="button" class="sigma-feed-tab-btn" data-announcement-tab="all">Announcements</button><button type="button" class="sigma-feed-tab-btn" data-announcement-tab="important">Important</button><button type="button" class="sigma-feed-tab-btn" data-announcement-tab="posts">Posts</button>`;

            if (tabsContainer) {
                tabsContainer.innerHTML = tabsHTML;
            } else if (feedEl.parentElement) {
                const newTabs = document.createElement('div');
                newTabs.className = 'sigma-feed-tabs-container';
                newTabs.innerHTML = tabsHTML;
                feedEl.parentElement.insertBefore(newTabs, feedEl);
            }
        });
    }

    // Auto-bind to trigger buttons and tabs on the page
    function autoBindTriggers() {
        detectContext();
        ensureTabsDOM();

        // 1. Only create composer modal and bind triggers for Admin and Teacher
        if (currentRole !== 'student') {
            ensureComposerModalDOM();
            ensureDeleteDialogDOM();

            const triggers = document.querySelectorAll('#trigger-announcement-composer, .trigger-announcement-composer-btn');
            triggers.forEach(btn => {
                if (!btn || !btn.parentNode) return;
                const clone = btn.cloneNode(true);
                btn.parentNode.replaceChild(clone, btn);
                clone.addEventListener('click', (e) => {
                    e.preventDefault();
                    openComposerModal();
                });
            });
        } else {
            // Remove any rogue composer DOM if present on student page
            const rogueModal = document.getElementById('sigma-composer-modal-backdrop');
            if (rogueModal) rogueModal.remove();
        }

        // 2. Bind filter tabs
        const tabBtns = document.querySelectorAll('.sigma-feed-tab-btn, [data-announcement-tab], #tab-announcement-overall, #tab-announcement-important, #tab-announcement-posts, #announcement-tab-all, #announcement-tab-important, #announcement-tab-posts');
        tabBtns.forEach(btn => {
            if (!btn || !btn.parentNode) return;
            const clone = btn.cloneNode(true);
            btn.parentNode.replaceChild(clone, btn);
            clone.addEventListener('click', (e) => {
                e.preventDefault();
                let tabKey = clone.getAttribute('data-announcement-tab');
                if (!tabKey) {
                    const id = clone.id || '';
                    if (id.includes('important')) tabKey = 'important';
                    else if (id.includes('post')) tabKey = 'posts';
                    else tabKey = 'all';
                }
                if (tabKey === 'announcements' || tabKey === 'general' || tabKey === 'overall') {
                    tabKey = 'all';
                }
                currentActiveTab = tabKey;
                syncTabButtonsUI(currentActiveTab);
                refreshAllFeeds();
            });
        });

        syncTabButtonsUI(currentActiveTab);
    }

    // Cross-tab real-time storage event synchronization
    window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY || e.key === 'sigma-classroom-announcements-v2') {
            refreshAllFeeds();
            if (activeDialogPostId) {
                renderPostDialogContent(activeDialogPostId);
            }
        }
    });

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            autoBindTriggers();
            refreshAllFeeds();
        });
    } else {
        autoBindTriggers();
        refreshAllFeeds();
    }

    function removeAttachedImage(index) {
        if (index >= 0 && index < attachedImages.length) {
            attachedImages.splice(index, 1);
            renderAttachmentPreview();
            validateInputs();
        }
    }

    // Expose Public API
    window.SigmaAnnouncements = {
        openComposer: openComposerModal,
        closeComposer: function () {
            if (typeof currentAttemptCloseComposer === 'function') {
                currentAttemptCloseComposer();
            } else {
                closeComposerModal();
            }
        },
        attemptCloseComposer: function () {
            if (typeof currentAttemptCloseComposer === 'function') {
                currentAttemptCloseComposer();
            } else {
                closeComposerModal();
            }
        },
        closeComposerModal: closeComposerModal,
        renderFeed: renderFeed,
        loadNextBatch: loadNextFeedBatch,
        toggleLike: toggleLike,
        toggleOptions: toggleOptions,
        toggleSeeMore: toggleSeeMore,
        toggleSeeLess: toggleSeeLess,
        enlargeImage: openPostLightbox,
        openPostLightbox: openPostLightbox,
        removeAttachedImage: removeAttachedImage,
        editPost: function (postId) {
            closeAllCardOptions();
            openComposerModal(postId);
        },
        deletePost: function (postId) {
            closeAllCardOptions();
            openDeleteDialog(postId);
        },
        closeAllOptions: closeAllCardOptions,
        openDeleteDialog: openDeleteDialog,
        closeDeleteDialog: closeDeleteDialog,
        confirmDeletePost: confirmDeletePost,
        openTargetedStudentsViewer: openTargetedStudentsViewer,
        closeTargetedStudentsViewer: closeTargetedStudentsViewer,
        openPostDialog: openPostDialog,
        closePostDialog: closePostDialog,
        handlePostCardClick: handlePostCardClick,
        toggleDialogLike: toggleDialogLike,
        submitComment: submitComment,
        deleteComment: deleteComment,
        toggleCommentLike: toggleCommentLike,
        startReply: startReply,
        cancelReply: cancelReply,
        refresh: refreshAllFeeds,
        getActiveRoomSectionName: getActiveRoomSectionName,
        getActiveRoomSubjectName: getActiveRoomSubjectName,
        formatTimeAgo: formatTimeAgo,
        autoResizeCommentInput: autoResizeCommentInput,
        setMaxVideoLimitMB: function (limit) {
            localStorage.setItem(VIDEO_LIMIT_KEY, limit);
        },
        getMaxVideoLimitMB: getMaxVideoLimitMB,
        showToast: showToastNotice,
        // Developer & Designer Preview Helpers
        loadDemoData: function () {
            const demoPosts = [
                {
                    id: 'demo-post-1',
                    title: 'Welcome to Academic Year 2026-2027!',
                    body: 'Immaculate Conception College warmly welcomes all Senior High School and College students to the new academic year. Please check your assigned schedules, classrooms, and orientation guidelines.',
                    authorName: 'Maria Santos Ramos',
                    authorRole: 'teacher',
                    authorAvatar: '',
                    audience: 'everyone',
                    audienceLabel: 'Public',
                    priority: 'important',
                    priorityLabel: 'Important',
                    mediaType: 'image',
                    mediaUrls: ['image/ICC Shs.jpg', 'image/ICC Immersion.jpg'],
                    mediaUrl: 'image/ICC Shs.jpg',
                    createdAt: new Date().toISOString(),
                    likes: 12,
                    likedByMe: true,
                    comments: [
                        { id: 'c1', authorName: 'Elena Cruz', authorRole: 'student', authorAvatar: '', text: 'Excited for this school year!', createdAt: new Date(Date.now() - 3600000).toISOString() }
                    ]
                },
                {
                    id: 'demo-post-2',
                    title: 'Campus Tour & Laboratory Guidelines',
                    body: 'Please review the updated laboratory and campus safety protocols before attending hands-on sessions in the computer and science labs.',
                    authorName: 'Maria Santos Ramos',
                    authorRole: 'teacher',
                    authorAvatar: '',
                    audience: 'Grade 11 - STEM A',
                    audienceLabel: 'Grade 11 - STEM A',
                    priority: 'normal',
                    priorityLabel: 'Announcement',
                    mediaType: 'video',
                    mediaUrl: 'image/campus-clip.mp4',
                    createdAt: new Date(Date.now() - 7200000).toISOString(),
                    likes: 5,
                    likedByMe: false,
                    comments: []
                },
                {
                    id: 'demo-post-3',
                    title: 'Quarterly Project Submission Reminder',
                    body: 'All research papers and capstone proposals must be submitted through the portal before Friday midnight. Late submissions will be flagged automatically.',
                    authorName: 'ICC Administration',
                    authorRole: 'admin',
                    authorAvatar: '',
                    audience: 'all_students',
                    audienceLabel: 'All Students',
                    priority: 'normal',
                    priorityLabel: 'Announcement',
                    mediaType: null,
                    mediaUrl: null,
                    createdAt: new Date(Date.now() - 86400000).toISOString(),
                    likes: 8,
                    likedByMe: false,
                    comments: []
                }
            ];
            saveStoredAnnouncements(demoPosts);
            refreshAllFeeds();
            showToastNotice('Loaded demo template posts for preview!', 'success');
        },
        clearAll: function () {
            saveStoredAnnouncements([]);
            refreshAllFeeds();
            showToastNotice('Cleared all announcements to empty state.', 'info');
        }
    };

    // Backward-Compatibility Bridge for legacy callers
    window.openComposerModal = (postId = null, audience = null, subject = null) => openComposerModal(postId, audience, subject);
    window.openUniversalImageLightbox = (urlOrFile, idx = 0) => openPostLightbox(urlOrFile, idx);
    window.enlargeAnnouncementImage = (url) => openPostLightbox(url);
    window.renderTeacherAnnouncements = () => refreshAllFeeds();
    window.renderAdminAnnouncements = () => refreshAllFeeds();
    window.renderStudentHomeAnnouncements = () => refreshAllFeeds();
    window.renderInstitutionalAnnouncements = () => refreshAllFeeds();
    window.loadDemoData = () => window.SigmaAnnouncements.loadDemoData();
    window.clearAllAnnouncements = () => window.SigmaAnnouncements.clearAll();
    window.openAnnouncementDeleteDialog = (postId) => openDeleteDialog(postId);
    window.closeAnnouncementDeleteDialog = () => closeDeleteDialog();
    window.confirmAnnouncementDeletePost = () => confirmDeletePost();
    window.toggleAnnouncementOptions = (postId, e) => toggleOptions(postId, e);
    window.editAnnouncementPost = (postId) => window.SigmaAnnouncements.editPost(postId);
    window.deleteAnnouncementPost = (postId) => window.SigmaAnnouncements.deletePost(postId);

})(window, document);

