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

document.addEventListener('DOMContentLoaded', initStudentPortal);
if (document.readyState === 'interactive' || document.readyState === 'complete') {
    initStudentPortal();
}

function initStudentPortal() {
    if (window.studentPortalInitialized) return;
    window.studentPortalInitialized = true;

    document.documentElement.classList.add('no-transition');

    // --- BRANDING LOGO SYNC ---
    const customNavLogo = localStorage.getItem('sigma-custom-nav-logo');
    if (customNavLogo) {
        const navLogos = document.querySelectorAll('header img[alt="ICC Logo"], .sidebar img[alt="ICC Logo"]');
        navLogos.forEach(img => img.src = customNavLogo);
    }

    // --- WELCOME PANEL SYNC ---
    let welcomePanel = localStorage.getItem('sigma-welcome-panel');
    if (!welcomePanel || welcomePanel === 'image/Welcome.jpg' || welcomePanel === '../image/Welcome.jpg') {
        welcomePanel = 'image/ICC Goals.jpeg';
        localStorage.setItem('sigma-welcome-panel', welcomePanel);
    }
    const studentImg = document.getElementById('welcome-panel-student-img');
    if (studentImg) {
        studentImg.src = welcomePanel;
        studentImg.onerror = function() { this.src = 'image/ICC Goals.jpeg'; };
    }
    window.addEventListener('storage', (e) => {
        if (e.key === 'sigma-welcome-panel' && e.newValue) {
            const img = document.getElementById('welcome-panel-student-img');
            if (img) img.src = e.newValue;
        }
    });
    window.addEventListener('sigma:welcome-panel-changed', (e) => {
        const url = e.detail;
        if (url) {
            const img = document.getElementById('welcome-panel-student-img');
            if (img) img.src = url;
        }
    });

    window.addEventListener('storage', (e) => {
        if (!e || !e.key) return;
        const isScoreOrGradeKey = (
            e.key === 'sigma-assessment-scored-broadcast' ||
            e.key === 'sigma-teacher-gradebook-scores-v2' ||
            e.key === 'sigma-teacher-gradebook-statuses-v2' ||
            e.key === 'sigma_gradebook_scores' ||
            e.key === 'sigma_gradebook_statuses' ||
            e.key === 'gradebookScores' ||
            e.key === 'gradebookStatuses' ||
            e.key === 'sigma_student_assessment_submissions' ||
            e.key.startsWith('sigma_quiz_result_') ||
            e.key.startsWith('sigma_sub_') ||
            e.key.startsWith('sigma_submission_')
        );
        if (isScoreOrGradeKey) {
            window.invalidateTeacherGradebookCache?.();
            window.invalidateSharedAssessmentSubmissionsStorage?.();
            window.clearCategoryDetailsCache?.();
            if (typeof _renderTopicContentMain === 'function') {
                const topicSection = document.getElementById('section-topic-content');
                if (topicSection && !topicSection.classList.contains('hidden')) {
                    const activeEl = document.activeElement;
                    const isUserTyping = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable);
                    if (!isUserTyping) {
                        const prevScrollY = window.scrollY;
                        const prevScrollX = window.scrollX;
                        _renderTopicContentMain();
                        try { window.scrollTo({ left: prevScrollX, top: prevScrollY, behavior: 'instant' }); } catch (_) { }
                    }
                }
            }
            if (typeof renderGradesPage === 'function') {
                const gradesSection = document.getElementById('section-grades');
                if (gradesSection && !gradesSection.classList.contains('hidden')) {
                    renderGradesPage();
                }
            }
        }
    });

    function escapeHtml(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
    if (!window.escapeHtml) window.escapeHtml = escapeHtml;

    const sidebar = document.getElementById('sidebar');
    const subSidebar = document.getElementById('sub-sidebar');
    const layoutWrapper = document.getElementById('layout-wrapper');
    const navLinks = document.querySelectorAll('.nav-link, .nav-sublink');
    const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
    let isMobileStatus = window.innerWidth < 1024;
    let overlay = document.getElementById('sidebar-overlay');
    window._scAssessmentDetailIdx = null;
    let activeStudentClassroomId = '';
    let activeStudentRoomTab = 'room';
    let studentSectionsSubmenuOpen = false;

    // Topic Content State variables (declared early to prevent TDZ)
    let _tcSubjectId = null, _tcTopicIdx = 0, _tcTab = 'videos', _tcVideoIdx = null;

    function updateLayout() {
        if (typeof window.updateLayout === 'function') {
            window.updateLayout();
        }
    }

    // SIGMA AI Elements
    const sigmaAiNotch = document.getElementById('sigmaAiNotch');
    const sigmaAiPanel = document.getElementById('sigmaAiPanel');
    const sigmaAiMessages = document.getElementById('sigmaAiMessages');
    const sigmaAiInput = document.getElementById('sigmaAiInput');
    const sigmaAiSendBtn = document.getElementById('sigmaAiSendBtn');
    const sigmaAiCloseBtn = document.getElementById('sigmaAiCloseBtn');
    let sigmaAiWaiting = false;

    // Header Dropdowns
    let suppressNextHeaderClose = false;
    const calendarToggle = document.getElementById('calendar-toggle');
    const calendarDropdown = document.getElementById('calendar-dropdown');
    const notiToggle = document.getElementById('noti-toggle');
    const notiDropdown = document.getElementById('noti-dropdown');
    const profileDropdownBtn = document.getElementById('profileDropdownBtn');
    const profileDropdownMenu = document.getElementById('profileDropdownMenu');

    let currentInlineProgram = null;
    let currentCurriculumProgram = null;
    let currentCurriculumCluster = null;
    let inlineAnimationToken = 0;
    let inlineAnimationTimers = [];
    let dynamicCurriculumSubjects = {};

    const sectionMap = {
        'nav-home': 'section-home',
        'nav-courses': 'section-courses',
        'nav-classrooms': 'section-classroom-detail',
        'nav-assignments': 'section-assignments',
        'nav-assessments': 'section-assignments',
        'nav-grades': 'section-grades',
        'nav-attendance': 'section-attendance',
        'nav-resources': 'resources-view',
        'nav-profile': 'user-profile-view',
        'nav-settings': 'user-settings-view',
        'nav-topic-detail': 'section-topic-detail',
        'nav-topic-content': 'section-topic-content'
    };

    const navIdByPage = {
        'home': 'nav-home',
        'dashboard': 'nav-home',
        'classrooms': 'nav-classrooms',
        'classes': 'nav-classrooms',
        'sections': 'nav-classrooms',
        'assignments': 'nav-assignments',
        'assessments': 'nav-assignments',
        'grades': 'nav-grades',
        'attendance': 'nav-attendance',
        'resources': 'nav-resources',
        'profile': 'nav-profile',
        'courses': 'nav-courses',
        'topic-detail': 'nav-topic-detail',
        'topic-content': 'nav-topic-content',
        'settings': 'nav-settings',
        'account-settings': 'nav-settings'
    };

    const USER_STORAGE_KEY = 'sigma-admin-users';
    const USER_AVATAR_STORAGE_KEY = 'sigma_student_avatar_base64';



    function getProfileTarget() {
        let authUser = {};
        try {
            authUser = JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}');
        }
        catch (e) { console.error('Auth parse error', e); }
        const users = getStoredJson(USER_STORAGE_KEY, []);
        const matchedUser = users.find(u => String(u.uid || u.id) === String(authUser.id)) || {};
        return {
            data: { ...authUser, ...matchedUser },
            isLoggedIn: !!authUser.id
        };
    }
    function saveProfileTarget(profileData) {
        let authUser = {};
        try {
            authUser = JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}');
        }
        catch (e) { console.error('Auth parse error', e); }
        const users = getStoredJson(USER_STORAGE_KEY, []);
        let idx = users.findIndex(u => String(u.uid || u.id) === String(authUser.id));
        if (idx === -1) {
            // If user not in list, add them
            users.push({ ...authUser, ...profileData });
            idx = users.length - 1;
        } else {
            users[idx] = { ...users[idx], ...profileData };
        }

        if (typeof window.saveStoredJson === 'function') {
            window.saveStoredJson(USER_STORAGE_KEY, users);
        } else {
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(users));
        }
        // Also sync session storage
        const updatedSession = { ...authUser, ...profileData };
        sessionStorage.setItem('sigma-authenticated-user', JSON.stringify(updatedSession));

        // Sync local state
        if (window.currentUserProfileData) {
            window.currentUserProfileData.avatar = profileData.avatar || '';
            window.currentUserProfileData.uploads = profileData.uploads || [];
        }
    }
    // Unified profile view controller functions are loaded via js/profile-view.js.
    window.toggleMobilePeoplePanel = function () {
        const panel = document.getElementById('classroom-mobile-people-panel');
        if (!panel) return;
        // Remove any stale backdrop
        const oldBackdrop = document.getElementById('classroom-people-backdrop');
        if (oldBackdrop) oldBackdrop.remove();
        const isActive = panel.classList.contains('active');
        if (!isActive) {
            // Teleport to body to escape parent stacking contexts
            if (!panel._originalParent) {
                panel._originalParent = panel.parentElement;
                panel._originalNextSibling = panel.nextSibling;
            }
            document.body.appendChild(panel);
            // Show until the top of the screen
            panel.style.top = '0';
            // Rest exactly on top of the bottom app bar (68px height)
            panel.style.bottom = '68px';
            panel.style.borderRadius = '0';
            // Double rAF: first frame paints panel in off-screen start position,
            // second frame triggers the CSS transition so it slides up cleanly
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    // Auto-reset scroll position
                    panel.scrollTop = 0;
                    panel.querySelectorAll('.student-room-people__list').forEach(list => list.scrollTop = 0);

                    panel.classList.add('active');
                });
            });
            // Attach swipe-to-close only once
            if (!panel._swipeInit) {
                panel._swipeInit = true;
                let startY = 0;
                let currentY = 0;
                let isDragging = false;

                panel.addEventListener('touchstart', (e) => {
                    // Only initiate drag when at the top of the panel scroll
                    if (panel.scrollTop > 0) return;
                    startY = e.touches[0].clientY;
                    isDragging = true;
                    panel.style.transition = 'none';
                }, { passive: true });

                panel.addEventListener('touchmove', (e) => {
                    if (!isDragging) return;
                    currentY = e.touches[0].clientY;
                    const deltaY = currentY - startY;
                    if (deltaY > 0) {
                        panel.style.transform = `translateY(${deltaY}px)`;
                    }
                }, { passive: true });

                panel.addEventListener('touchend', () => {
                    if (!isDragging) return;
                    isDragging = false;
                    const deltaY = currentY - startY;
                    panel.style.transition = '';
                    if (deltaY > 80) {
                        // Enough drag   close
                        window.toggleMobilePeoplePanel();
                    }
                    else {
                        // Snap back to open position
                        panel.style.transform = 'translateY(0)';
                    }
                }, { passive: true });
            }
        }
        else {
            panel.style.transform = '';
            panel.classList.remove('active');
            // Restore to original position after transition ends
            setTimeout(() => {
                if (panel._originalParent && !panel.classList.contains('active')) {
                    panel._originalParent.insertBefore(panel, panel._originalNextSibling || null);
                    panel._originalParent = null;
                    // Reset inline styles
                    panel.style.top = '';
                    panel.style.bottom = '';
                    panel.style.borderRadius = '';
                }
            }, 320);
        }
    };
    // Note: Profile view controller functions (switchUserProfileTab, renderUserProfileTab,
    // populateUserProfilePage, toggleEditUserBio, etc.) are centralized in js/profile-view.js.
    const hasSubSidebar = [];
    isMobileStatus = window.innerWidth < 1024;
    const schoolYearQuarterOrder = {

        '1st Quarter': 1,

        '2nd Quarter': 2,

        '3rd Quarter': 3,

        '4th Quarter': 4

    };
    const schoolYearSemesterOrder = {

        '1st Semester': 1,

        '2nd Semester': 2

    };
    let schoolYearRecords = [];
    const loadSYFromStorage = () => {
        const saved = localStorage.getItem('sigma_school_year_records');
        if (saved) {
            try {

                schoolYearRecords = JSON.parse(saved);

            }
            catch (e) {

                console.error('Failed to parse school year records', e);

                schoolYearRecords = [];

            }

        }

    };
    const getSortedSchoolYearRecords = () => [...schoolYearRecords].filter(r => !r.isDeleted).sort((left, right) => {
        if (left.status === 'Active' && right.status !== 'Active') return -1;
        if (left.status !== 'Active' && right.status === 'Active') return 1;
        const leftYear = Number(left.yearStart) || 0;
        const rightYear = Number(right.yearStart) || 0;
        if (leftYear !== rightYear) return leftYear - rightYear;
        const leftSemester = schoolYearSemesterOrder[left.semester] || 99;
        const rightSemester = schoolYearSemesterOrder[right.semester] || 99;
        if (leftSemester !== rightSemester) return leftSemester - rightSemester;
        const leftQuarter = schoolYearQuarterOrder[left.quarter] || 99;
        const rightQuarter = schoolYearQuarterOrder[right.quarter] || 99;
        return leftQuarter - rightQuarter;
    });
    const getActiveSchoolYearRecord = () => {
        loadSYFromStorage();
        return schoolYearRecords.find((record) => !record.isDeleted && record.status === 'Active') || null;
    };
    function updateGlobalSYDisplay() {
        if (typeof window.updateGlobalSYDisplay === 'function') {
            window.updateGlobalSYDisplay();
        }
    }

    updateGlobalSYDisplay();
    // Sync with Admin changes in other tabs

    window.addEventListener('storage', (e) => {
        if (e.key === 'sigma_school_year_records') {

            updateGlobalSYDisplay();

        }

    });
    window.getComputedStyle(document.documentElement).opacity;
    document.documentElement.classList.remove('no-transition');
    //   Layout  

    // Submenu Toggles

    document.querySelectorAll('[data-toggle="submenu"]').forEach(btn => {

        btn.addEventListener('click', (e) => {

            e.preventDefault();
            const submenuId = btn.id.replace('nav-', '') + '-submenu';
            const submenu = document.getElementById(submenuId);
            const chevron = btn.querySelector('.sidebar-group-chevron');
            if (submenu) {
                const isHidden = submenu.classList.contains('hidden');

                submenu.classList.toggle('hidden', !isHidden);
                if (chevron) {

                    chevron.style.transform = isHidden ? 'rotate(90deg)' : 'rotate(0deg)';

                }

            }

        });

    });
    function setSubjectsPanelsMode(enabled) {
        document.body.classList.toggle('subjects-panels-mode', enabled && window.innerWidth >= 1024);

    }
    function setCurriculumMode(enabled) {
        document.body.classList.toggle('curriculum-mode', enabled);

    }
    function hideAllSections() {
        document.querySelectorAll('.dynamic-section').forEach(s => {

            s.classList.add('hidden');

            s.style.display = 'none';

        });

    }
    function showSection(id) {
        const earlyStyle = document.getElementById('early-home-style');
        if (earlyStyle) earlyStyle.remove();
        document.documentElement.classList.remove('sigma-hash-navigating');
        document.getElementById('sigma-early-hash-style')?.remove();
        const el = document.getElementById(id);
        if (!el) return;

        el.classList.remove('hidden');

        el.style.display = '';

        if (id !== 'section-topic-content') {
            window._studentSubmissionMode = false;
            window._studentViewSubmissionMode = false;
            window._sharedViewSubmissionMode = false;
            window._tcAssessmentDetailIdx = null;
            window._scAssessmentDetailIdx = null;
            window._activeMaterialTitle = null;
            window._activeSubmissionAttemptPage = {};
        }
    }
    //   Nav Context Title  

    function setNavContext(text) {
        if (typeof window.setPortalHeader === 'function') {
            window.setPortalHeader(text);
            return;
        }
        const ctxText = document.getElementById('nav-context-text');
        if (!ctxText) return;
        if (text) {
            ctxText.textContent = text;
            ctxText.parentElement.classList.remove('hidden');
        } else {
            ctxText.parentElement.classList.add('hidden');
        }
    }
    const SHARED_ANNOUNCEMENTS_KEY = 'sigma-room-announcements-v1';
    try {
        let store = getStoredJson(SHARED_ANNOUNCEMENTS_KEY, {});
        if (store['Grade 11 - STEM A::General Mathematics']) {
            delete store['Grade 11 - STEM A::General Mathematics'];
            window.saveStoredJson(SHARED_ANNOUNCEMENTS_KEY, store);
        }
    }
    catch (e) { }
    const SHARED_ATTENDANCE_MODE_KEY = 'sigma-attendance-mode-v1';
    const SHARED_ATTENDANCE_RECORDS_KEY = 'sigma-attendance-records-v1';
    const SHARED_COMMENT_MODE_KEY = 'sigma-room-comment-mode-v1';
    const SHARED_ANNOUNCEMENT_COMMENTS_KEY = 'sigma-room-announcement-comments-v1';
    const ADMIN_SUBJECTS_STORAGE_KEY = 'sigma-admin-subjects';
    const SHARED_ADMIN_ANNOUNCEMENTS_KEY = 'sigma-admin-announcements-v1';
    let currentStudentName = 'Juan Dela Cruz';
    let currentStudentSection = 'Grade 11 - STEM A';

    function getLoggedInStudentUser() {
        let authUser = {};
        try {
            authUser = JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}');
        } catch (e) {}

        const users = getStoredJson(USER_STORAGE_KEY, getStoredJson('sigma-admin-users', []));

        const authId = String(authUser.id || authUser.uid || '').trim();
        let matchedUser = null;
        if (authId && !authId.toLowerCase().includes('default')) {
            matchedUser = users.find(u => String(u.uid || u.id).trim() === authId);
        }
        if (!matchedUser && authUser.email) {
            const authEmail = authUser.email.toLowerCase().trim();
            matchedUser = users.find(u => (u.email || '').toLowerCase().trim() === authEmail);
        }
        if (!matchedUser && (authId || authUser.fullName || authUser.firstName || authUser.name)) {
            matchedUser = authUser;
        }
        if (!matchedUser) {
            matchedUser = users.find(u => String(u.uid || u.id) === '2222222')
                || { id: '2222222', uid: '2222222', firstName: 'Juan', middleName: 'Abad', lastName: 'Dela Cruz', fullName: 'Juan Abad Dela Cruz', role: 'Student' };
        }

        const id = String(matchedUser?.id || matchedUser?.uid || authUser?.id || '2222222').trim();
        const knownAccount = Boolean(matchedUser && String(matchedUser.id || matchedUser.uid || '') !== '2222222' && (matchedUser.fullName || matchedUser.name || matchedUser.firstName));
        let fn = matchedUser?.firstName || authUser?.firstName || (knownAccount ? '' : 'Juan');
        let ln = matchedUser?.lastName || authUser?.lastName || (knownAccount ? '' : 'Dela Cruz');
        const full = matchedUser?.fullName || matchedUser?.name || authUser?.fullName || `${fn} ${ln}`.trim();
        if (knownAccount && (!fn || !ln)) {
            const parts = String(full || '').replace(/,/g, ' ').trim().split(/\s+/).filter(Boolean);
            if (!fn && parts.length) fn = parts[0];
            if (!ln && parts.length > 1) ln = parts[parts.length - 1];
        }

        let sec = (matchedUser?.section || matchedUser?.gradeSection || matchedUser?.sectionName || authUser?.section || authUser?.gradeSection || '').trim();
        if (!sec) {
            try {
                const adminSections = getStoredJson('sigma-admin-sections', []);
                if (Array.isArray(adminSections)) {
                    const foundSec = adminSections.find(s => {
                        if (!s || !Array.isArray(s.students)) return false;
                        return s.students.some(st => {
                            if (!st) return false;
                            const stId = String(typeof st === 'object' ? (st.id || st.uid || st.studentId || '') : st).trim().toLowerCase();
                            const stName = String(typeof st === 'object' ? (st.name || st.fullName || '') : st).trim().toLowerCase();
                            const revName = `${ln}, ${fn}`.toLowerCase();
                            const idMatch = (id && (stId === id.toLowerCase() || stId === `std-${id.toLowerCase()}` || stName === id.toLowerCase()));
                            const nameMatch = (full && (stName === full.toLowerCase() || stName === revName || stName.includes(full.toLowerCase()) || full.toLowerCase().includes(stName)));
                            const partsMatch = (ln && fn && stName.includes(ln.toLowerCase()) && (stName.includes(fn.toLowerCase()) || fn.toLowerCase().includes(stName)));
                            return idMatch || nameMatch || partsMatch;
                        });
                    });
                    if (foundSec && foundSec.name) {
                        sec = String(foundSec.name).trim();
                    }
                }
            } catch (e) {}
        }
        if (!sec && typeof currentStudentSection !== 'undefined' && currentStudentSection) {
            sec = currentStudentSection;
        }
        if (!sec && typeof window.currentClassroomSectionName === 'string') {
            sec = window.currentClassroomSectionName.trim();
        }

        return {
            ...matchedUser,
            ...authUser,
            id: id,
            uid: id,
            firstName: fn,
            lastName: ln,
            fullName: full,
            name: full,
            section: sec,
            gradeSection: sec
        };
    }
    window.getLoggedInStudentUser = getLoggedInStudentUser;

    function getSubjectIcon(subjectName) {
        const s = String(subjectName || '').toLowerCase();
        if (s.includes('math') || s.includes('calculus') || s.includes('stat') || s.includes('algebra')) return 'fa-solid fa-calculator';
        if (s.includes('program') || s.includes('code') || s.includes('software') || s.includes('web') || s.includes('cs') || s.includes('it')) return 'fa-solid fa-code';
        if (s.includes('science') || s.includes('physics') || s.includes('chem') || s.includes('bio')) return 'fa-solid fa-flask';
        if (s.includes('english') || s.includes('literature') || s.includes('reading') || s.includes('communication') || s.includes('oral')) return 'fa-solid fa-comments';
        if (s.includes('history') || s.includes('filipino') || s.includes('social') || s.includes('society') || s.includes('culture') || s.includes('politics')) return 'fa-solid fa-landmark';
        if (s.includes('pe') || s.includes('physical') || s.includes('health') || s.includes('fitness') || s.includes('sports')) return 'fa-solid fa-heart-pulse';
        if (s.includes('art') || s.includes('music') || s.includes('creative')) return 'fa-solid fa-palette';
        if (s.includes('account') || s.includes('business') || s.includes('entrepreneur') || s.includes('finance') || s.includes('abm')) return 'fa-solid fa-chart-line';
        return 'fa-solid fa-book';
    }

    let activeHomeAnnouncementTab = 'all';
    let currentStudentAttendance = {
        name: currentStudentName,
        sharedKey: 'Grade 11 - STEM A::Programming 1',
        subject: 'Computer Programming 1',
        time: 'April 8, 2026   8:00 AM'
    };
    function loadSharedState(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;

        }
        catch {
            return fallback;

        }

    }

    function isFakeSampleTopic(t) {
        if (!t) return false;
        if (typeof window.isFakeSampleTopic === 'function' && window.isFakeSampleTopic !== isFakeSampleTopic) {
            return window.isFakeSampleTopic(t);
        }
        if (typeof t === 'string') {
            const lower = t.toLowerCase().trim();
            return lower.includes('advanced diagnostic procedures') || lower === 'arrays' || lower === 'introduction to debugging' || lower === 'debugging';
        }
        const id = String(t.id || '').trim().toLowerCase();
        const authorId = String(t.authorId || '').trim().toLowerCase();
        const authorName = String(t.authorName || '').trim().toLowerCase();
        const title = String(t.title || t.name || '').trim().toLowerCase();
        return id === 'topic_teacher_sample_01' ||
               id === 'topic-teacher-sample-01' ||
               authorId === 'teacher_sample_01' ||
               authorName.includes('johnathan smith') ||
               title.includes('advanced diagnostic procedures') ||
               title === 'arrays' ||
               title === 'introduction to debugging' ||
               title === 'debugging' ||
               title.startsWith('arrays') ||
               title.startsWith('introduction to debugging') ||
               t.isFake === true ||
               t.isSample === true;
    }
    window.isFakeSampleTopic = isFakeSampleTopic;

    function sanitizeSubjectCurriculumData() {
        try {
            const subjectsKey = 'sigma-admin-subjects';
            const rawSubjs = localStorage.getItem(subjectsKey);
            if (rawSubjs) {
                const subjs = JSON.parse(rawSubjs);
                if (Array.isArray(subjs)) {
                    let changed = false;
                    subjs.forEach(s => {
                        if (s && Array.isArray(s.topics)) {
                            const originalLen = s.topics.length;
                            s.topics = s.topics.filter(t => !isFakeSampleTopic(t));
                            if (s.topics.length !== originalLen) changed = true;
                        }
                    });
                    if (changed) {
                        localStorage.setItem(subjectsKey, JSON.stringify(subjs));
                    }
                }
            }

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('sigma_custom_topics_')) {
                    try {
                        const val = getStoredJson(key, []);
                        if (Array.isArray(val)) {
                            const filtered = val.filter(t => !isFakeSampleTopic(t));
                            if (filtered.length !== val.length) {
                                window.saveStoredJson(key, filtered);
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
    function stripHtmlTags(value) {
        return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

    }
    function formatAdminAnnouncementBody(body) {
        return escapeHtml(body).replace(/\n/g, '<br>');

    }
    function parseAnnouncementDateValue(value) {
        if (!value) return 0;
        const direct = new Date(value);
        if (!Number.isNaN(direct.getTime())) return direct.getTime();
        const currentYear = new Date().getFullYear();
        const normalized = new Date(`${value}, ${currentYear}`);
        if (!Number.isNaN(normalized.getTime())) return normalized.getTime();
        return 0;

    }
    function formatAnnouncementTimestamp(value) {
        const timestamp = parseAnnouncementDateValue(value);
        if (!timestamp) return 'Just now';
        return new Date(timestamp).toLocaleString('en-US', {

            month: 'short',

            day: 'numeric',

            hour: 'numeric',

            minute: '2-digit'

        });

    }
    function seedDefaultAdminAnnouncements() {
        // No seed posts in clean state
    }
    function getAdminAnnouncements() {

        seedDefaultAdminAnnouncements();
        const posts = loadSharedState(SHARED_ADMIN_ANNOUNCEMENTS_KEY, []);
        return Array.isArray(posts) ? posts : [];

    }
    function normalizeSubjectKey(value) {
        return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

    }
    function getAdminSubjectCoverConfig(subjectName) {
        const normalized = normalizeSubjectKey(subjectName);
        if (!normalized) return null;
        const subjects = loadSharedState(ADMIN_SUBJECTS_STORAGE_KEY, []);
        if (!Array.isArray(subjects)) return null;
        return subjects.find(item => {
            const subjectLabel = normalizeSubjectKey(item?.name);
            if (!subjectLabel) return false;
            return subjectLabel === normalized || normalized.includes(subjectLabel) || subjectLabel.includes(normalized);

        }) || null;

    }
    function getSharedAnnouncements(sharedKey, fallback = []) {
        const store = loadSharedState(SHARED_ANNOUNCEMENTS_KEY, {});
        return store[sharedKey]?.length ? store[sharedKey] : fallback;

    }
    function getSharedCommentMode(sharedKey) {
        const store = loadSharedState(SHARED_COMMENT_MODE_KEY, {});
        return store[sharedKey] || 'disabled';

    }
    function buildAnnouncementId(sharedKey, post, index) {
        if (post?.id) return post.id;
        const author = (post?.author || 'teacher').toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const stamp = (post?.timestamp || `post-${index + 1}`).toLowerCase().replace(/[^a-z0-9]+/g, '-');
        return `${sharedKey}-${author}-${stamp}`;

    }
    function getSharedAnnouncementComments(sharedKey, postId) {
        const store = loadSharedState(SHARED_ANNOUNCEMENT_COMMENTS_KEY, {});
        return store[sharedKey]?.[postId] || [];

    }
    function saveStudentAnnouncementComment(sharedKey, postId, text) {
        const store = loadSharedState(SHARED_ANNOUNCEMENT_COMMENTS_KEY, {});
        if (!store[sharedKey]) store[sharedKey] = {};
        if (!store[sharedKey][postId]) store[sharedKey][postId] = [];

        store[sharedKey][postId].push({

            author: currentStudentName,

            text,

            timestamp: new Date().toLocaleString('en-US', {

                month: 'short',

                day: 'numeric',

                hour: 'numeric',

                minute: '2-digit'

            })

        });

        localStorage.setItem(SHARED_ANNOUNCEMENT_COMMENTS_KEY, JSON.stringify(store));

    }
    function saveStudentSelfPresent(sharedKey) {
        const modeStore = loadSharedState(SHARED_ATTENDANCE_MODE_KEY, {});
        const recordStore = loadSharedState(SHARED_ATTENDANCE_RECORDS_KEY, {});
        const mode = modeStore[sharedKey] || 'manual';
        if (!recordStore[sharedKey]) {

            recordStore[sharedKey] = {

                mode,

                updatedAt: new Date().toISOString(),

                statuses: {}

            };

        }
        if (!recordStore[sharedKey].statuses) recordStore[sharedKey].statuses = {};
        if (!recordStore[sharedKey].excuses) recordStore[sharedKey].excuses = {};

        recordStore[sharedKey].mode = mode;

        recordStore[sharedKey].updatedAt = new Date().toISOString();

        recordStore[sharedKey].statuses[currentStudentName] = 'P';

        localStorage.setItem(SHARED_ATTENDANCE_RECORDS_KEY, JSON.stringify(recordStore));

    }
    function saveStudentAbsentExcuse(sharedKey, comment, files) {
        const modeStore = loadSharedState(SHARED_ATTENDANCE_MODE_KEY, {});
        const recordStore = loadSharedState(SHARED_ATTENDANCE_RECORDS_KEY, {});
        const mode = modeStore[sharedKey] || 'manual';
        if (!recordStore[sharedKey]) {

            recordStore[sharedKey] = {

                mode,

                updatedAt: new Date().toISOString(),

                statuses: {},

                excuses: {}

            };

        }
        if (!recordStore[sharedKey].statuses) recordStore[sharedKey].statuses = {};
        if (!recordStore[sharedKey].excuses) recordStore[sharedKey].excuses = {};

        recordStore[sharedKey].mode = mode;

        recordStore[sharedKey].updatedAt = new Date().toISOString();

        recordStore[sharedKey].statuses[currentStudentName] = 'A';

        recordStore[sharedKey].excuses[currentStudentName] = {

            comment,

            files,

            submittedAt: new Date().toLocaleString('en-US', {

                month: 'short',

                day: 'numeric',

                hour: 'numeric',

                minute: '2-digit'

            })

        };

        localStorage.setItem(SHARED_ATTENDANCE_RECORDS_KEY, JSON.stringify(recordStore));

    }
    function getStudentAttendanceSnapshot(attendanceContext = currentStudentAttendance) {
        const modeStore = loadSharedState(SHARED_ATTENDANCE_MODE_KEY, {});
        const recordStore = loadSharedState(SHARED_ATTENDANCE_RECORDS_KEY, {});
        const mode = modeStore[attendanceContext.sharedKey] || 'manual';
        const status = recordStore[attendanceContext.sharedKey]?.statuses?.[attendanceContext.name] || '';
        const excuse = recordStore[attendanceContext.sharedKey]?.excuses?.[attendanceContext.name] || null;
        let label = 'Pending';
        let meta = mode === 'trust'

            ? `Tap Present to confirm you are inside ${attendanceContext.subject}.`

            : 'Waiting for teacher attendance confirmation.';
        let badgeClass = 'bg-gray-100 text-gray-500';
        if (status === 'P') {

            label = 'Present';

            meta = mode === 'trust'

                ? `You marked yourself present for ${attendanceContext.subject}.`

                : `Teacher marked you present for ${attendanceContext.subject}.`;

            badgeClass = 'bg-green-50 text-green-600';

        }
        else if (status === 'A') {

            label = 'Absent';

            meta = excuse

                ? `Your absence and excuse were submitted for ${attendanceContext.subject}.`

                : `Teacher marked you absent for ${attendanceContext.subject}.`;

            badgeClass = 'bg-red-50 text-red-600';

        }
        else if (status === 'L') {

            label = 'Late';

            meta = `Teacher marked you late for ${attendanceContext.subject}.`;

            badgeClass = 'bg-yellow-50 text-yellow-600';

        }
        return {

            label,

            meta,

            badgeClass,

            mode,

            status,

            time: attendanceContext.time,

            excuse

        };

    }
    function updateStudentAttendanceStatus(attendanceContext = currentStudentAttendance) {
        const valueEl = document.getElementById('student-attendance-live-value');
        const metaEl = document.getElementById('student-attendance-live-meta');
        const badgeEl = document.getElementById('student-attendance-live-badge');
        if (!valueEl || !metaEl || !badgeEl) return;
        const snapshot = getStudentAttendanceSnapshot(attendanceContext);



        valueEl.textContent = snapshot.label;

        metaEl.textContent = `${snapshot.meta} ${snapshot.time}`;

        badgeEl.textContent = snapshot.label;

        badgeEl.className = `px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${snapshot.badgeClass}`;
    }

    let studentAttendanceRecords = [];
    let studentAttendancePage = 1;
    const studentAttendancePerPage = 10;
    let activeAttendanceSubjectFilter = null;

    function getStudentAttendanceFromTeacher(studentName, subjectFilter = null) {
        const SHARED_ATTENDANCE_RECORDS_KEY = 'sigma-attendance-records-v1';
        let recordsByClassroom = {};
        try {
            const raw = localStorage.getItem(SHARED_ATTENDANCE_RECORDS_KEY);
            if (raw) recordsByClassroom = JSON.parse(raw);
        } catch (e) {}

        let authUser = null;
        try {
            authUser = JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || 'null');
        } catch (e) {}

        const loggedStudent = (typeof getLoggedInStudentUser === 'function' ? getLoggedInStudentUser() : null) ||
                              (typeof window.getActiveUserData === 'function' ? window.getActiveUserData() : null);

        const records = [];

        function normalizeTokens(str) {
            return String(str || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').trim().split(/\s+/).filter(Boolean);
        }

        function studentNamesMatch(name1, name2) {
            if (!name1 || !name2) return false;
            const s1 = String(name1).trim().toLowerCase();
            const s2 = String(name2).trim().toLowerCase();
            if (s1 === s2) return true;

            const t1 = normalizeTokens(name1);
            const t2 = normalizeTokens(name2);
            if (t1.length === 0 || t2.length === 0) return false;

            // Exact tokens match in any order (e.g. "Herald Jamero Kalipungan" vs "Kalipungan, Herald Jamero")
            if (t1.slice().sort().join(' ') === t2.slice().sort().join(' ')) return true;

            // Filter out single-letter initials (like middle initial 'J' or 'A')
            const full1 = t1.filter(t => t.length > 1);
            const full2 = t2.filter(t => t.length > 1);
            if (full1.length > 0 && full2.length > 0 && full1.slice().sort().join(' ') === full2.slice().sort().join(' ')) {
                return true;
            }

            // Check if one is a subset of the other (e.g. "Juan Dela Cruz" in "Juan Abad Dela Cruz")
            const set1 = new Set(t1);
            const set2 = new Set(t2);
            const isSubset1 = t1.every(t => set2.has(t));
            const isSubset2 = t2.every(t => set1.has(t));
            if (isSubset1 || isSubset2) {
                return true;
            }

            return false;
        }

        const candidateNames = [
            studentName,
            loggedStudent?.id,
            loggedStudent?.uid,
            authUser?.id,
            authUser?.uid,
            loggedStudent?.fullName,
            loggedStudent?.name,
            (loggedStudent?.lastName && loggedStudent?.firstName) ? `${loggedStudent.lastName}, ${loggedStudent.firstName}` : '',
            (loggedStudent?.firstName && loggedStudent?.lastName) ? `${loggedStudent.firstName} ${loggedStudent.lastName}` : '',
            (loggedStudent?.lastName && loggedStudent?.firstName && loggedStudent?.middleName) ? `${loggedStudent.lastName}, ${loggedStudent.firstName} ${loggedStudent.middleName}` : '',
            (loggedStudent?.firstName && loggedStudent?.middleName && loggedStudent?.lastName) ? `${loggedStudent.firstName} ${loggedStudent.middleName} ${loggedStudent.lastName}` : '',
            authUser?.fullName,
            authUser?.name,
            (authUser?.lastName && authUser?.firstName) ? `${authUser.lastName}, ${authUser.firstName}` : '',
            (authUser?.firstName && authUser?.lastName) ? `${authUser.firstName} ${authUser.lastName}` : ''
        ].filter(Boolean);

        // Clean out legacy mock attendance records if present
        if (recordsByClassroom['Grade 11 - STEM A::General Mathematics']) {
            delete recordsByClassroom['Grade 11 - STEM A::General Mathematics'];
            try {
                localStorage.setItem(SHARED_ATTENDANCE_RECORDS_KEY, JSON.stringify(recordsByClassroom));
            } catch (e) {}
        }

        const stripGrade = (s) => String(s || '').replace(/^grade\s*\d+\s*[-–]?\s*/i, '').replace(/^g\d+\s*[-–]?\s*/i, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();

        // Determine enrolled sections for the student to avoid reading ghost records from other sections
        const allowedSections = new Set();
        function addAllowedSection(sec) {
            if (!sec) return;
            const raw = String(sec).toLowerCase().trim();
            allowedSections.add(raw);
            const base = stripGrade(raw);
            if (base) allowedSections.add(base);
        }

        if (loggedStudent?.section) addAllowedSection(loggedStudent.section);
        if (authUser?.section) addAllowedSection(authUser.section);
        if (typeof activeStudentClassroomId !== 'undefined' && activeStudentClassroomId && window.classroomData && window.classroomData[activeStudentClassroomId]) {
            const currentC = window.classroomData[activeStudentClassroomId];
            if (currentC.section) addAllowedSection(currentC.section);
        }
        if (typeof window.classroomData === 'object' && window.classroomData) {
            Object.values(window.classroomData).forEach(c => {
                if (c?.section) addAllowedSection(c.section);
            });
        }
        try {
            const adminSections = getStoredJson('sigma-admin-sections', []);
            if (Array.isArray(adminSections)) {
                adminSections.forEach(sec => {
                    if (!sec || sec.status === 'Draft') return;
                    if (Array.isArray(sec.students)) {
                        const isEnrolled = sec.students.some(st => {
                            const stId = typeof st === 'object' ? (st.id || st.uid) : '';
                            const stName = typeof st === 'object' ? (st.name || st.fullName) : st;
                            return (stId && candidateNames.includes(stId)) ||
                                   (stName && candidateNames.some(cn => studentNamesMatch(cn, stName)));
                        });
                        if (isEnrolled && sec.name) {
                            addAllowedSection(sec.name);
                        }
                    }
                });
            }
        } catch (e) {}

        const normalizeSubj = (s) => String(s || '').toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').replace(/\s*&\s*/g, ' and ').trim();

        Object.keys(recordsByClassroom).forEach(classroomKey => {
            const [secName = '', subjName = ''] = classroomKey.split('::');
            if (allowedSections.size > 0 && secName) {
                const rawSec = secName.toLowerCase().trim();
                const baseSec = stripGrade(rawSec);
                if (!allowedSections.has(rawSec) && (!baseSec || !allowedSections.has(baseSec))) {
                    return; // Skip classrooms for sections the student is not enrolled in
                }
            }

            if (subjectFilter) {
                const s1 = normalizeSubj(subjName);
                const s2 = normalizeSubj(subjectFilter);
                if (s1 !== s2) {
                    return;
                }
            }

            const cData = recordsByClassroom[classroomKey] || {};
            Object.keys(cData).forEach(dateKey => {
                if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return;
                const entry = cData[dateKey];
                const statuses = (entry && entry.statuses) || {};

                // Find status matching student name or candidate names
                let foundStatus = '';
                for (const candidate of candidateNames) {
                    if (statuses[candidate]) {
                        foundStatus = statuses[candidate];
                        break;
                    }
                    for (const sName in statuses) {
                        if (studentNamesMatch(sName, candidate)) {
                            foundStatus = statuses[sName];
                            break;
                        }
                    }
                    if (foundStatus) break;
                }

                if (foundStatus) {
                    const canonicalSubj = (typeof window.ClassroomRoom?.formatSubjectTitle === 'function')
                        ? window.ClassroomRoom.formatSubjectTitle(subjName || subjectFilter || 'Subject')
                        : (subjName || subjectFilter || 'Subject').replace(/[-_]+/g, ' ').trim();
                    records.push({
                        date: dateKey,
                        subject: canonicalSubj,
                        status: foundStatus
                    });
                }
            });
        });

        // Deduplicate records by date and subject
        const seen = new Set();
        const uniqueRecords = [];
        for (const r of records) {
            const normSubj = normalizeSubj(r.subject || '');
            const key = `${r.date}::${normSubj}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueRecords.push(r);
            }
        }

        // If teacher records exist for this student/subject, sort descending and return
        if (uniqueRecords.length > 0) {
            uniqueRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
        }
        return uniqueRecords;
    }

    let studentAttendanceViewingMonth = new Date().getMonth();
    let studentAttendanceViewingYear = new Date().getFullYear();
    let studentAttendancePickerYear = studentAttendanceViewingYear;
    let studentAttendanceSelectedDay = -1;
    let studentAttendanceCalendarPopupMode = 'days';
    let studentAttendancePopupViewingMonth = new Date().getMonth();
    let studentAttendancePopupViewingYear = new Date().getFullYear();
    const studentMonthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    window.toggleStudentAttendanceCalendarPopup = function (event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        const popup = document.getElementById('student-attendance-calendar-popup');
        if (!popup) return;

        const isCurrentlyOpen = !popup.classList.contains('hidden');
        if (isCurrentlyOpen) {
            popup.classList.add('hidden');
            return;
        }

        studentAttendancePopupViewingMonth = studentAttendanceViewingMonth;
        studentAttendancePopupViewingYear = studentAttendanceViewingYear;
        studentAttendancePickerYear = studentAttendanceViewingYear;
        studentAttendanceCalendarPopupMode = 'days';

        renderStudentAttendanceCalendarPopup();
        popup.classList.remove('hidden');
    };

    window.closeStudentAttendanceCalendarPopup = function (event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        const popup = document.getElementById('student-attendance-calendar-popup');
        if (popup) {
            popup.classList.add('hidden');
        }
    };

    window.switchStudentAttendancePopupMode = function (mode, event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        studentAttendanceCalendarPopupMode = mode;
        if (mode === 'months') {
            studentAttendancePickerYear = studentAttendancePopupViewingYear;
        }
        renderStudentAttendanceCalendarPopup();
    };

    window.changeStudentAttendancePopupMonth = function (delta, event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        studentAttendancePopupViewingMonth += delta;
        if (studentAttendancePopupViewingMonth > 11) {
            studentAttendancePopupViewingMonth = 0;
            studentAttendancePopupViewingYear++;
        } else if (studentAttendancePopupViewingMonth < 0) {
            studentAttendancePopupViewingMonth = 11;
            studentAttendancePopupViewingYear--;
        }
        renderStudentAttendanceCalendarPopup();
    };

    window.changeStudentAttendancePickerYear = function (delta, event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        studentAttendancePickerYear += delta;
        renderStudentAttendanceCalendarPopup();
    };

    window.selectStudentAttendancePopupDay = function (year, month, day, event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        studentAttendanceViewingYear = year;
        studentAttendanceViewingMonth = month;
        studentAttendanceSelectedDay = day;

        window.closeStudentAttendanceCalendarPopup();
        const displayEl = document.getElementById('student-attendance-month-display');
        if (displayEl) {
            displayEl.textContent = `${studentMonthNames[studentAttendanceViewingMonth]} ${studentAttendanceViewingYear}`;
        }
        renderAttendanceHistoryTable('classroom-attendance-history-body', 'classroom-attendance-pagination-controls', 'classroom-attendance-empty-state', activeAttendanceSubjectFilter);

        // Highlight & scroll to selected day row if present
        setTimeout(() => {
            const selectedRow = document.getElementById('student-attendance-row-selected');
            if (selectedRow) {
                selectedRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }, 50);
    };

    window.selectStudentAttendancePopupMonth = function (monthIndex, event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        studentAttendancePopupViewingMonth = monthIndex;
        studentAttendancePopupViewingYear = studentAttendancePickerYear;
        studentAttendanceViewingMonth = monthIndex;
        studentAttendanceViewingYear = studentAttendancePickerYear;
        studentAttendanceSelectedDay = -1;

        studentAttendanceCalendarPopupMode = 'days';
        const displayEl = document.getElementById('student-attendance-month-display');
        if (displayEl) {
            displayEl.textContent = `${studentMonthNames[studentAttendanceViewingMonth]} ${studentAttendanceViewingYear}`;
        }
        renderAttendanceHistoryTable('classroom-attendance-history-body', 'classroom-attendance-pagination-controls', 'classroom-attendance-empty-state', activeAttendanceSubjectFilter);
        renderStudentAttendanceCalendarPopup();
        const popup = document.getElementById('student-attendance-calendar-popup');
        if (popup) {
            popup.classList.remove('hidden');
        }
    };

    window.selectStudentAttendancePopupToday = function (event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        const now = new Date();
        window.selectStudentAttendancePopupDay(now.getFullYear(), now.getMonth(), now.getDate(), event);
    };

    window.selectStudentAttendancePopupThisMonth = function (event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        const now = new Date();
        studentAttendancePickerYear = now.getFullYear();
        studentAttendancePopupViewingYear = now.getFullYear();
        studentAttendancePopupViewingMonth = now.getMonth();
        studentAttendanceViewingYear = now.getFullYear();
        studentAttendanceViewingMonth = now.getMonth();
        studentAttendanceSelectedDay = -1;

        studentAttendanceCalendarPopupMode = 'days';
        const displayEl = document.getElementById('student-attendance-month-display');
        if (displayEl) {
            displayEl.textContent = `${studentMonthNames[studentAttendanceViewingMonth]} ${studentAttendanceViewingYear}`;
        }
        renderAttendanceHistoryTable('classroom-attendance-history-body', 'classroom-attendance-pagination-controls', 'classroom-attendance-empty-state', activeAttendanceSubjectFilter);
        renderStudentAttendanceCalendarPopup();
        const popup = document.getElementById('student-attendance-calendar-popup');
        if (popup) {
            popup.classList.remove('hidden');
        }
    };

    function renderStudentAttendanceCalendarPopup() {
        const popup = document.getElementById('student-attendance-calendar-popup');
        if (!popup) return;

        if (!popup.dataset.clickBound) {
            popup.dataset.clickBound = 'true';
            popup.addEventListener('click', (e) => e.stopPropagation());
            popup.addEventListener('pointerdown', (e) => e.stopPropagation());
        }

        const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const todayNow = new Date();

        if (studentAttendanceCalendarPopupMode === 'months') {
            let monthsHtml = '';
            shortMonths.forEach((m, idx) => {
                const isSelected = (studentAttendancePickerYear === studentAttendanceViewingYear && idx === studentAttendanceViewingMonth);
                monthsHtml += `
                    <button type="button" class="cal-picker-month-btn ${isSelected ? 'active' : ''}" style="color: ${isSelected ? '#ffffff' : '#000000'} !important; font-weight: 600;" onclick="window.selectStudentAttendancePopupMonth(${idx}, event)">
                        ${m}
                    </button>
                `;
            });

            popup.innerHTML = `
                <div class="cal-picker-header flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                    <button type="button" class="cal-picker-year-btn w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-black hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer" onclick="window.changeStudentAttendancePickerYear(-1, event)" title="Previous Year">
                        <i class="fa-solid fa-chevron-left text-xs text-black"></i>
                    </button>
                    <span class="cal-picker-year-label text-[15px] font-bold text-black font-['Inter']">${studentAttendancePickerYear}</span>
                    <button type="button" class="cal-picker-year-btn w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-black hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer" onclick="window.changeStudentAttendancePickerYear(1, event)" title="Next Year">
                        <i class="fa-solid fa-chevron-right text-xs text-black"></i>
                    </button>
                </div>
                <div class="cal-picker-months-grid grid grid-cols-3 gap-2 mb-3">
                    ${monthsHtml}
                </div>
                <div class="cal-picker-footer flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs">
                    <button type="button" class="cal-picker-footer-today text-xs font-bold text-[#15803d] hover:bg-slate-100 active:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer" onclick="window.selectStudentAttendancePopupThisMonth(event)">
                        This month
                    </button>
                    <button type="button" class="cal-picker-footer-mode text-xs font-bold text-[#15803d] hover:bg-slate-100 active:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer" onclick="window.switchStudentAttendancePopupMode('days', event)">
                        Days view
                    </button>
                </div>
            `;
        } else {
            const year = studentAttendancePopupViewingYear;
            const month = studentAttendancePopupViewingMonth;
            const firstDayIndex = new Date(year, month, 1).getDay();
            const totalDays = new Date(year, month + 1, 0).getDate();

            let daysHtml = '';
            for (let i = 0; i < firstDayIndex; i++) {
                daysHtml += `<div class="calendar-day-cell calendar-day-cell--empty"></div>`;
            }

            for (let d = 1; d <= totalDays; d++) {
                const isToday = (todayNow.getFullYear() === year && todayNow.getMonth() === month && todayNow.getDate() === d);
                const isSelected = (studentAttendanceViewingYear === year && studentAttendanceViewingMonth === month && studentAttendanceSelectedDay === d);

                let cellClasses = 'calendar-day-cell font-semibold transition-all';
                let styleExtra = '';

                if (isToday) {
                    cellClasses += ' calendar-day-cell--today font-bold cursor-pointer';
                    styleExtra = 'background-color: #FFD000 !important; color: #000000 !important; font-weight: 700 !important; border: none !important; box-shadow: none !important;';
                } else if (isSelected) {
                    cellClasses += ' calendar-day-cell--selected font-bold cursor-pointer';
                    styleExtra = 'background-color: #15803d !important; color: #ffffff !important; font-weight: 700 !important; border: none !important; box-shadow: none !important;';
                } else {
                    cellClasses += ' text-black cursor-pointer';
                    styleExtra = 'color: #000000 !important;';
                }

                daysHtml += `
                    <button type="button" class="${cellClasses}" style="${styleExtra}" onclick="window.selectStudentAttendancePopupDay(${year}, ${month}, ${d}, event)">
                        ${d}
                    </button>
                `;
            }

            popup.innerHTML = `
                <div class="grid grid-cols-7 gap-1 text-center mb-1">
                    <div class="calendar-weekday-header">Sun</div>
                    <div class="calendar-weekday-header">Mon</div>
                    <div class="calendar-weekday-header">Tue</div>
                    <div class="calendar-weekday-header">Wed</div>
                    <div class="calendar-weekday-header">Thu</div>
                    <div class="calendar-weekday-header">Fri</div>
                    <div class="calendar-weekday-header">Sat</div>
                </div>
                <div class="grid grid-cols-7 gap-1 text-center mb-2">
                    ${daysHtml}
                </div>
                <div class="cal-picker-footer flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs">
                    <button type="button" class="cal-picker-footer-today text-xs font-bold text-[#15803d] hover:bg-slate-100 active:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer" onclick="window.selectStudentAttendancePopupToday(event)">
                        Today
                    </button>
                    <button type="button" class="cal-picker-footer-mode text-xs font-bold text-[#15803d] hover:bg-slate-100 active:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer" onclick="window.switchStudentAttendancePopupMode('months', event)">
                        Month & Year
                    </button>
                </div>
            `;
        }
    }

    window.openStudentNativeDatePicker = window.toggleStudentAttendanceCalendarPopup;
    window.onStudentNativeDatePicked = function (val) {
        if (!val) return;
        const parts = val.split('-');
        if (parts.length < 2) return;
        const yr = parseInt(parts[0], 10);
        const mo = parseInt(parts[1], 10) - 1;
        if (isNaN(yr) || isNaN(mo)) return;
        studentAttendanceViewingMonth = mo;
        studentAttendanceViewingYear = yr;
        studentAttendanceSelectedDay = -1;
        const displayEl = document.getElementById('student-attendance-month-display');
        if (displayEl) {
            displayEl.textContent = `${studentMonthNames[studentAttendanceViewingMonth]} ${studentAttendanceViewingYear}`;
        }
        renderAttendanceHistoryTable('classroom-attendance-history-body', 'classroom-attendance-pagination-controls', 'classroom-attendance-empty-state', activeAttendanceSubjectFilter);
    };

    function handleStudentAttendancePopupDismiss(e) {
        const popup = document.getElementById('student-attendance-calendar-popup');
        if (!popup || popup.classList.contains('hidden')) return;

        if (popup.contains(e.target)) return;

        const pickerBtn = document.querySelector('.student-attendance-month-picker-btn');
        if (pickerBtn && (pickerBtn === e.target || pickerBtn.contains(e.target))) return;

        if (e.target && (e.target.closest?.('#student-attendance-calendar-popup') ||
                         e.target.closest?.('.cal-picker-month-btn') ||
                         e.target.closest?.('.cal-picker-year-btn') ||
                         e.target.closest?.('.cal-picker-footer-today') ||
                         e.target.closest?.('.cal-picker-footer-mode') ||
                         e.target.closest?.('.calendar-day-cell'))) {
            return;
        }

        popup.classList.add('hidden');
    }

    window.addEventListener('pointerdown', handleStudentAttendancePopupDismiss, true);
    window.addEventListener('click', handleStudentAttendancePopupDismiss, true);

    window.addEventListener('scroll', (e) => {
        const popup = document.getElementById('student-attendance-calendar-popup');
        if (!popup || popup.classList.contains('hidden')) return;
        if (e.target && popup.contains(e.target)) return;
        popup.classList.add('hidden');
    }, { capture: true, passive: true });

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const popup = document.getElementById('student-attendance-calendar-popup');
            if (popup && !popup.classList.contains('hidden')) {
                popup.classList.add('hidden');
            }
        }
    }, true);

    window.navStudentAttendanceMonth = function (dir) {
        studentAttendanceViewingMonth += dir;
        if (studentAttendanceViewingMonth > 11) {
            studentAttendanceViewingMonth = 0;
            studentAttendanceViewingYear++;
        } else if (studentAttendanceViewingMonth < 0) {
            studentAttendanceViewingMonth = 11;
            studentAttendanceViewingYear--;
        }
        studentAttendancePickerYear = studentAttendanceViewingYear;
        studentAttendanceSelectedDay = -1;
        window.closeStudentAttendanceCalendarPopup?.();

        const displayEl = document.getElementById('student-attendance-month-display');
        if (displayEl) {
            displayEl.textContent = `${studentMonthNames[studentAttendanceViewingMonth]} ${studentAttendanceViewingYear}`;
        }
        renderAttendanceHistoryTable('classroom-attendance-history-body', 'classroom-attendance-pagination-controls', 'classroom-attendance-empty-state', activeAttendanceSubjectFilter);
    };

    window.goToTodayStudentAttendance = function () {
        const today = new Date();
        studentAttendanceViewingMonth = today.getMonth();
        studentAttendanceViewingYear = today.getFullYear();
        studentAttendancePickerYear = today.getFullYear();
        studentAttendanceSelectedDay = -1;
        const displayEl = document.getElementById('student-attendance-month-display');
        if (displayEl) {
            displayEl.textContent = `${studentMonthNames[studentAttendanceViewingMonth]} ${studentAttendanceViewingYear}`;
        }
        renderAttendanceHistoryTable('classroom-attendance-history-body', 'classroom-attendance-pagination-controls', 'classroom-attendance-empty-state', activeAttendanceSubjectFilter);
    };

    function renderAttendanceHistoryTable(bodyId, paginationId, emptyStateId, subjectFilter = null) {
        const body = document.getElementById(bodyId);
        const pagination = document.getElementById(paginationId);
        const emptyState = document.getElementById(emptyStateId);
        if (!body) return;

        activeAttendanceSubjectFilter = subjectFilter;

        // Resolve current student name from auth or profile
        const loggedStudent = (typeof getLoggedInStudentUser === 'function' ? getLoggedInStudentUser() : null) ||
                              (typeof window.getActiveUserData === 'function' ? window.getActiveUserData() : null);
        let studentName = loggedStudent?.fullName || loggedStudent?.name || '';
        if (!studentName && loggedStudent?.lastName && loggedStudent?.firstName) {
            studentName = `${loggedStudent.lastName}, ${loggedStudent.firstName}`;
        }
        if (!studentName) {
            try {
                const authUser = JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || 'null');
                if (authUser && (authUser.fullName || authUser.name || authUser.firstName)) {
                    studentName = authUser.fullName || authUser.name || `${authUser.lastName || ''}, ${authUser.firstName || ''}`.trim();
                }
            } catch (e) {}
        }
        if (!studentName) studentName = 'Juan Dela Cruz';

        const mockRecords = getStudentAttendanceFromTeacher(studentName, subjectFilter);

        const isClassroomTab = bodyId === 'classroom-attendance-history-body';
        const displayRecords = isClassroomTab
            ? mockRecords.filter(r => {
                const d = new Date(r.date);
                return d.getMonth() === studentAttendanceViewingMonth && d.getFullYear() === studentAttendanceViewingYear;
              })
            : mockRecords.slice((studentAttendancePage - 1) * studentAttendancePerPage, (studentAttendancePage - 1) * studentAttendancePerPage + studentAttendancePerPage);

        // Calculate summary statistics for subject or all records
        const statSourceRecords = isClassroomTab ? displayRecords : mockRecords;
        const presentCount = statSourceRecords.filter(r => r.status === 'P').length;
        const lateCount = statSourceRecords.filter(r => r.status === 'L').length;
        const absentCount = statSourceRecords.filter(r => r.status === 'A').length;
        const totalCount = statSourceRecords.length;

        const statPercentEls = document.querySelectorAll('[data-attendance-stat="percent"], #student-attendance-stat-percent, #classroom-attendance-stat-percent');
        const statPresentEls = document.querySelectorAll('[data-attendance-stat="present"], #student-attendance-stat-present, #classroom-attendance-stat-present');
        const statLateEls = document.querySelectorAll('[data-attendance-stat="late"], #student-attendance-stat-late, #classroom-attendance-stat-late');
        const statAbsentEls = document.querySelectorAll('[data-attendance-stat="absent"], #student-attendance-stat-absent, #classroom-attendance-stat-absent');

        if (totalCount === 0) {
            statPercentEls.forEach(el => { el.textContent = '--'; });
            statPresentEls.forEach(el => { el.textContent = '0'; });
            statLateEls.forEach(el => { el.textContent = '0'; });
            statAbsentEls.forEach(el => { el.textContent = '0'; });
        } else {
            const attendanceRate = ((presentCount + lateCount) / totalCount * 100).toFixed(1);
            statPercentEls.forEach(el => { el.textContent = `${attendanceRate}%`; });
            statPresentEls.forEach(el => { el.textContent = `${presentCount}`; });
            statLateEls.forEach(el => { el.textContent = `${lateCount}`; });
            statAbsentEls.forEach(el => { el.textContent = `${absentCount}`; });
        }

        if (displayRecords.length === 0) {
            body.innerHTML = '';
            if (emptyState) emptyState.classList.remove('hidden');
            if (pagination) pagination.innerHTML = '';
            return;
        }

        if (emptyState) emptyState.classList.add('hidden');

        body.innerHTML = displayRecords.map((record, index) => {
            const dateObj = new Date(record.date);
            const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
            const isDaySelected = (studentAttendanceSelectedDay > 0 && dateObj.getDate() === studentAttendanceSelectedDay && dateObj.getMonth() === studentAttendanceViewingMonth && dateObj.getFullYear() === studentAttendanceViewingYear);

            let statusLabel = 'Present';
            let statusColor = 'text-green-600';
            if (record.status === 'A') { statusLabel = 'Absent'; statusColor = 'text-red-600'; }
            if (record.status === 'L') { statusLabel = 'Late'; statusColor = 'text-yellow-600'; }

            const rowBg = isDaySelected
                ? 'style="background-color: #ecfdf5 !important;"'
                : (index % 2 === 1 ? 'style="background-color:#f8fafc;"' : '');
            const rowClass = isDaySelected
                ? 'id="student-attendance-row-selected" class="border-b-2 border-emerald-500 font-semibold ring-1 ring-inset ring-emerald-400"'
                : 'class="border-b border-slate-200"';

            return `
                <tr ${rowClass}>
                    <td class="px-4 py-3.5 text-center hover:bg-slate-100 transition-colors" ${rowBg}>
                        <p class="text-[13px] font-normal text-black font-['Inter']">${formattedDate}${isDaySelected ? ' <span class="inline-block ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#15803d] text-white">Selected</span>' : ''}</p>
                    </td>
                    <td class="px-4 py-3.5 text-center hover:bg-slate-100 transition-colors" ${rowBg}>
                        <span class="text-[13px] font-semibold ${statusColor} inline-block font-['Inter']">
                            ${statusLabel}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');

        if (!isClassroomTab && pagination && typeof window.renderPaginationControls === 'function') {
            window.renderPaginationControls(paginationId, mockRecords.length, {
                itemsPerPage: studentAttendancePerPage,
                currentPage: studentAttendancePage
            }, (newPage) => {
                studentAttendancePage = newPage;
                renderAttendanceHistoryTable(bodyId, paginationId, emptyStateId, activeAttendanceSubjectFilter);
            });
        } else if (isClassroomTab && pagination) {
            pagination.innerHTML = '';
        }
    }

    window.renderStudentAttendanceHistory = function () {
        renderAttendanceHistoryTable('student-attendance-history-body', 'student-attendance-pagination-controls', 'student-attendance-empty-state');
    };

    window.onAttendancePageChange_student_attendance_pagination_controls = function(newPage) {
        studentAttendancePage = newPage;
        renderAttendanceHistoryTable('student-attendance-history-body', 'student-attendance-pagination-controls', 'student-attendance-empty-state', activeAttendanceSubjectFilter);
    };
    window['onAttendancePageChange_student-attendance-pagination-controls'] = window.onAttendancePageChange_student_attendance_pagination_controls;

    window['onAttendancePageChange_classroom-attendance-pagination-controls'] = function(newPage) {
        studentAttendancePage = newPage;
        renderAttendanceHistoryTable('classroom-attendance-history-body', 'classroom-attendance-pagination-controls', 'classroom-attendance-empty-state', activeAttendanceSubjectFilter);
    };

    function setGreenNavContext(trackText) {
        const gradeEl = document.getElementById('green-grade-label');
        const trackEl = document.getElementById('green-track-label');
        if (gradeEl) gradeEl.textContent = 'Grade 11';
        if (trackEl) trackEl.textContent = 'AY 2025-2026   2nd Term';

    }
    //   Tab Switching (internal   no history push)  

    function scrollToTop() {
        window.scrollTo(0, 0);
        document.body.scrollTop = 0;
        document.documentElement.scrollTop = 0;
        const mainContent = document.getElementById('main-content');
        if (mainContent) mainContent.scrollTop = 0;
        const layoutWrapper = document.getElementById('layout-wrapper');
        if (layoutWrapper) layoutWrapper.scrollTop = 0;
    }

    function _applyTab(navId) {
        window.invalidateSigmaViewCaches?.();
        scrollToTop();
        const requestedNavId = navId;
        if (!sectionMap[navId] || !document.getElementById(sectionMap[navId])) {
            navId = navId && navId.startsWith('nav-subjects-') ? 'nav-courses' : 'nav-home';
            if (!sectionMap[navId] || !document.getElementById(sectionMap[navId])) navId = 'nav-home';
            console.warn(`Unknown student tab "${requestedNavId}". Falling back to "${navId}".`);
        }
        // Auto-close mobile sidebar - REMOVED per user request
        /*
        if (window.innerWidth < 1024) {
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebar-overlay');
if (sidebar) sidebar.classList.remove('sidebar-visible');
if (overlay) overlay.classList.add('hidden');
        }
        */

        const targetSectionId = sectionMap[navId];
        // Reset context-specific state if moving to main landing pages
        setCurriculumMode(false);
        // Close other open side panels, but keep AI panel if user wants it persistent

        // closeAiPanel();
        // Removed

        document.querySelectorAll('[id$="Menu"], [id$="Panel"]').forEach(m => m.classList.add('hidden'));
        document.querySelectorAll('.relative button').forEach(b => b.classList.remove('active'));
        const navCtx = document.getElementById('nav-subject-context');
        if (navCtx) { navCtx.classList.add('hidden'); navCtx.classList.remove('flex'); }
        // Clear sub-sidebar highlights and submenu states
        document.querySelectorAll('#sub-sidebar .active, #sub-sidebar .bg-icc-light, .sidebar-submenu .active, .subject-nav-child.active, .student-section-room-link.active').forEach(el => {
            el.classList.remove('active', 'bg-icc-light', 'text-icc');
        });
        // Reset subject-sidebar internal variables
        if (typeof window.resetStudentSubjectSidebarState === 'function') {
            window.resetStudentSubjectSidebarState();
        }

        navLinks.forEach(l => l.classList.remove('active'));
        const activeLink = document.getElementById(navId);
        if (activeLink) {

            activeLink.classList.add('active');
            // Also update context text

            const labelEl = activeLink.querySelector('.full-label') || activeLink.querySelector('span');
            if (labelEl) setNavContext(labelEl.textContent);

        }



        hideAllSections();

        showSection(targetSectionId);
        if (navId !== 'nav-classrooms' && navId !== 'nav-assignments' && navId !== 'nav-assessments' && navId !== 'nav-topic-detail' && navId !== 'nav-topic-content') {
            const mainContent = document.getElementById('main-content');
            if (mainContent) {
                mainContent.style.removeProperty('padding-top');
                mainContent.style.removeProperty('padding-bottom');
                mainContent.style.removeProperty('padding-left');
                mainContent.style.removeProperty('padding-right');
                mainContent.classList.remove('p-0', 'pt-0', 'pb-0');
            }
            activeStudentClassroomId = '';
            window.activeStudentClassroomId = '';
            studentSectionsSubmenuOpen = false;
            renderStudentSectionsNavChildren('');
            syncStudentSectionsNavState(false);
            hideStudentClassroomSectionsSidebar();
        }
        if (navId === 'nav-assignments' || navId === 'nav-assessments') {
            if (activeStudentClassroomId && typeof switchStudentRoomTab === 'function') {
                switchStudentRoomTab('topics');
            } else {
                switchTab('nav-classrooms');
            }
            return;
        }
        else if (navId === 'nav-grades') {

            renderGradesPage();

        }
        else if (navId === 'nav-attendance') {
            updateStudentAttendanceStatus();
            renderStudentAttendanceHistory();
        }
        else if (navId === 'nav-settings') {
            setNavContext('Account Settings');
            if (typeof window.renderSettingsView === 'function') {
                window.renderSettingsView('user-settings-view', 'notifications');
            }
        }
        else if (navId === 'nav-classrooms') {
            const fallbackId = activeStudentClassroomId
                || (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('sigma-last-active-classroom'))
                || (typeof getStudentSectionClassItems === 'function' && getStudentSectionClassItems()?.[0]?.id);
            if (fallbackId && typeof showClassroomDetail === 'function') {
                showClassroomDetail(fallbackId, false, 'room');
            } else {
                _applyTab('nav-home');
            }
        }
        else if (navId === 'nav-profile') {
            hideStudentClassroomSectionsSidebar();
            if (typeof window.closeMobileAccountPanel === 'function') {
                window.closeMobileAccountPanel();
            }
            if (typeof window.closeMobileTopPanel === 'function') {
                window.closeMobileTopPanel();
            }
            document.body.classList.remove('mobile-account-fullscreen', 'mobile-panel-open', 'overflow-hidden');
            document.documentElement.classList.remove('mobile-account-fullscreen', 'mobile-panel-open', 'overflow-hidden');
            document.body.style.removeProperty('overflow');
            document.body.style.removeProperty('touch-action');
            document.documentElement.style.removeProperty('overflow');
            document.documentElement.style.removeProperty('touch-action');
            try {
                if (typeof window.populateUserProfilePage === 'function') {
                    window.populateUserProfilePage();
                }
            } catch (err) {
                console.error('[StudentPortal] Failed to populate profile page:', err);
            }
        }
        else if (navId === 'nav-home') {
            hideStudentClassroomSectionsSidebar();
            if (typeof renderStudentHomeDashboardPanels === 'function') renderStudentHomeDashboardPanels();
            if (window.SigmaAnnouncements && typeof window.SigmaAnnouncements.resetToDefaultTab === 'function') {
                window.SigmaAnnouncements.resetToDefaultTab();
            } else if (typeof renderInstitutionalAnnouncements === 'function') {
                renderInstitutionalAnnouncements();
            }
        }
        else {
            hideStudentClassroomSectionsSidebar();
        }
        // Nav context title per tab

        const navContextMap = {

            'nav-home': 'Interface Computer College', 'nav-classrooms': 'My Classes', 'nav-courses': 'Subjects',

            'nav-assignments': 'Interface Computer College', 'nav-grades': 'Grades',

            'nav-attendance': 'Attendance', 'nav-mail': 'Mail', 'nav-profile': 'Interface Computer College'

        };
        const ctx = navContextMap[navId] || '';

        setNavContext(ctx);
        const shouldShowSub = hasSubSidebar.includes(navId);
        if (shouldShowSub) {

            _showSubSidebarInstant();

            updateSubSidebar(navId);

        }
        else {

            _hideSubSidebarInstant();

        }



        updateLayout();
        if (window.innerWidth < 1024) sidebar.classList.remove('sidebar-visible');
        // Sync Sections chevron visibility
        if (typeof syncStudentSectionsNavState === 'function') {
            syncStudentSectionsNavState();
        }
        window.sigmaResetScrollToTop ? window.sigmaResetScrollToTop() : window.scrollTo(0, 0);
    }
    //   Sub-sidebar instant show/hide (NO slide animation)  

    function _hideSubSidebarInstant() {

        subSidebar.style.transition = 'none';

        subSidebar.classList.remove('sub-sidebar-visible');

        subSidebar.classList.add('hidden');
        // restore transition after frame

        requestAnimationFrame(() => { subSidebar.style.transition = ''; });

    }
    function _showSubSidebarInstant() {

        subSidebar.style.transition = 'none';

        subSidebar.classList.remove('hidden');

        subSidebar.classList.add('sub-sidebar-visible');

        requestAnimationFrame(() => { subSidebar.style.transition = ''; });

    }
    //   Public switchTab   pushes history  

    function switchTab(navId, pushState = true) {
        const pageKey = Object.entries(navIdByPage).find(([k, v]) => v === navId)?.[0] || 'home';
        if (pushState) {
            const currentHash = (window.location.hash || '').replace('#', '');
            if (currentHash !== pageKey) {
                const nextHash = '#' + pageKey;
                const historyState = { page: pageKey };
                if (window.studentHistoryScreenKey && window.studentHistoryScreenKey('#' + currentHash) === window.studentHistoryScreenKey(nextHash)) {
                    history.replaceState(historyState, '', nextHash);
                } else {
                    history.pushState(historyState, '', nextHash);
                }
                try {
                    sessionStorage.setItem('sigma-student-nav-state', JSON.stringify({ type: 'tab', page: pageKey, navId }));
                } catch (e) {}
            }
        }

        _applyTab(navId);
        window.noteStudentHistoryScreen?.();
    }
    window.switchTab = switchTab;



    navLinks.forEach(link => {
        link.addEventListener('click', e => {
            // If it's a submenu toggle, don't trigger switchTab
            if (link.dataset.toggle === 'submenu') return;

            e.preventDefault();

            if (link.id === 'nav-grades') {
                window.activeStudentGradeSubjectFilter = null;
            }

            switchTab(link.id);
        });
    });
    function initSubjectParentSidebar() {
        const parent = document.getElementById('nav-courses');
        const submenu = document.getElementById('subjects-submenu');
        const chevron = parent?.querySelector('.sidebar-group-chevron');
        const subSidebar = document.getElementById('sub-sidebar');
        const subTitle = document.getElementById('sub-sidebar-title');
        const subHeader = document.getElementById('sub-sidebar-header');
        const subContent = document.getElementById('sub-sidebar-content');
        const items = [
            { id: 'nav-subjects-core', key: 'core-subjects', label: 'Core Subjects', icon: 'fa-solid fa-layer-group' },
            { id: 'nav-subjects-applied', key: 'applied-subjects', label: 'Applied Subjects', icon: 'fa-solid fa-book-open' },
            { id: 'nav-subjects-specialized', key: 'specialized-subjects', label: 'Specialized Subjects', icon: 'fa-solid fa-briefcase' }
        ];
        if (!parent || !submenu || !subSidebar || !subContent) return;
        let open = false;
        let hoverTimer = null;
        // Exposed state for switchTab to reset
        let activeProgram = null;
        let activeGroup = null;
        let activeSubjectId = null;
        window.resetStudentSubjectSidebarState = function () {
            activeProgram = null;
            activeGroup = null;
            activeSubjectId = null;
            // Also close all groups in the DOM
            document.querySelectorAll('.subject-nav-group').forEach(g => {
                g.classList.remove('open');
                const children = g.querySelector('.subject-nav-children');
                if (children) children.classList.add('hidden');
            });
        };
        window.setStudentActiveSubject = function (id) {
            activeSubjectId = id;
            syncSelectedSubject();
        };
        const collapsed = () => document.body.classList.contains('sidebar-collapsed') && window.innerWidth >= 1024;
        const escapeText = value => String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
        const programCategory = { 'core-subjects': 'core', 'applied-subjects': 'applied', 'specialized-subjects': 'specialized' };
        const getProgramSubjects = (programKey) => {
            try {
                const category = programCategory[programKey];
                return [...(subjectsData.enrolled || []), ...(subjectsData.completed || [])]
                    .filter(subject => getHomeSubjectCategory(subject) === category)
                    .map(subject => ({ id: subject.id, label: subject.text }));
            }
            catch (error) {
                return [];
            }
        };
        const syncSelectedSubject = () => {
            document.querySelectorAll('.subject-nav-child').forEach(child => {
                child.classList.toggle('active', child.dataset.subjectId === activeSubjectId);
            });
            document.querySelectorAll('.subject-nav-group-toggle').forEach(group => {
                group.classList.toggle('active', group.dataset.subjectGroup === activeProgram);
            });
            document.querySelectorAll('#subjects-submenu .nav-sublink').forEach(link => {
                link.classList.toggle('active', link.dataset.programKey === activeProgram);
            });
        };
        const openSubjectTopic = (programKey, subjectId, label) => {
            activeProgram = programKey;
            activeGroup = programKey;
            activeSubjectId = subjectId;
            const targetId = resolveHomeSubjectTopicSourceId(subjectId, label);
            switchToTopicPage(targetId);
            // On mobile: auto-close removed
            if (window.innerWidth < 1024) {
                const sidebar = document.getElementById('sidebar');
                const overlay = document.getElementById('sidebar-overlay');
                if (sidebar) sidebar.classList.remove('sidebar-visible');
                if (overlay) overlay.classList.add('hidden');
            }
            // Restore expanded state on desktop if needed
            if (!document.body.classList.contains('sidebar-collapsed')) {
                sidebar?.classList.remove('sidebar-collapsed');
            }
            parent.classList.add('active');
            document.querySelectorAll('#subjects-submenu .nav-sublink').forEach(link => {
                link.classList.toggle('active', link.dataset.programKey === programKey);
            });
            syncSelectedSubject();
            if (!collapsed()) hideOverlay();
        };
        const renderGroup = (item, surface) => {
            const isOpen = activeGroup === item.key;
            const subjects = getProgramSubjects(item.key);
            return `
                <div class="subject-nav-group ${isOpen ? 'open' : ''}">
                    <button type="button" class="${surface === 'overlay' ? 'sub-sidebar-link' : 'nav-sublink'} subject-nav-group-toggle w-full ${activeProgram === item.key ? 'active' : ''}" data-subject-group="${item.key}">
                        <i class="${item.icon}"></i>
                        <span>${item.label}</span>
                        <i class="fa-solid fa-chevron-right subject-nav-chevron"></i>
                    </button>
                    <div class="subject-nav-children ${isOpen ? '' : 'hidden'}">
                        ${subjects.map(subject => `
                            <button type="button" class="subject-nav-child ${activeSubjectId === subject.id ? 'active' : ''}" data-subject-program="${item.key}" data-subject-id="${escapeText(subject.id)}" data-subject-label="${escapeText(subject.label)}">
                                <i class="fa-solid fa-book subject-nav-child-icon" aria-hidden="true"></i>
                                <span>${escapeText(subject.label)}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;
        };
        const bindSubjectNav = (root, surface) => {
            root.querySelectorAll('[data-subject-group]').forEach(btn => {
                btn.addEventListener('click', event => {
                    event.preventDefault();
                    event.stopPropagation();
                    activeGroup = activeGroup === btn.dataset.subjectGroup ? null : btn.dataset.subjectGroup;
                    activeProgram = btn.dataset.subjectGroup;
                    if (surface === 'overlay') renderOverlay();
                    else renderInline();
                });
            });
            root.querySelectorAll('[data-subject-id]').forEach(btn => {
                btn.addEventListener('click', event => {
                    event.preventDefault();
                    event.stopPropagation();
                    const _prog = btn.dataset.subjectProgram;
                    const _sid = btn.dataset.subjectId;
                    const _lbl = btn.dataset.subjectLabel;
                    activeProgram = _prog;
                    activeGroup = _prog;
                    activeSubjectId = _sid;
                    // Close mobile sidebar removed
                    if (window.innerWidth < 1024) {
                        const sidebar = document.getElementById('sidebar');
                        const overlay = document.getElementById('sidebar-overlay');
                        if (sidebar) sidebar.classList.remove('sidebar-visible');
                        if (overlay) overlay.classList.add('hidden');
                    }
                    const _targetId = resolveHomeSubjectTopicSourceId(_sid, _lbl);
                    if (_targetId && window.switchToTopicPage) window.switchToTopicPage(_targetId);
                    parent.classList.add('active');
                    syncSelectedSubject();
                    if (!collapsed()) hideOverlay();
                });
            });
        };
        const renderInline = () => {
            submenu.innerHTML = items.map(item => renderGroup(item, 'inline')).join('');
            bindSubjectNav(submenu, 'inline');
        };
        const syncInline = () => {
            const isOpen = open && !collapsed();
            if (isOpen) renderInline();
            submenu.classList.toggle('hidden', !isOpen);
            parent.classList.toggle('open', isOpen);
            parent.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            if (chevron) {
                chevron.classList.toggle('rotate-90', isOpen);
                chevron.style.setProperty('transform', isOpen ? 'rotate(90deg)' : 'rotate(0deg)', 'important');
            }
        };
        const hideOverlay = () => {
            subSidebar.classList.add('hidden');
            subSidebar.classList.remove('sub-sidebar-visible');
            subSidebar.classList.remove('subjects-hover-subsidebar');
            parent?.classList.remove('open-flyout');
        };
        const renderOverlay = () => {
            // Sub-sidebar overlay not needed on mobile
            if (!collapsed() || window.innerWidth < 1024) {
                hideOverlay();
                return;
            }

            if (subTitle) subTitle.textContent = 'Subjects';
            subHeader?.classList.remove('hidden');
            subContent.innerHTML = items.map(item => renderGroup(item, 'overlay')).join('');
            bindSubjectNav(subContent, 'overlay');
            if (parent && typeof window.positionSubSidebarBeside === 'function') {
                window.positionSubSidebarBeside(parent);
            }
            parent?.classList.add('open-flyout');
            subSidebar.classList.remove('hidden');
            subSidebar.classList.add('sub-sidebar-visible');
            subSidebar.classList.add('subjects-hover-subsidebar');
        };
        const openProgram = (programKey) => {
            activeProgram = programKey;
            document.querySelectorAll('#subjects-submenu .nav-sublink').forEach(link => {
                link.classList.toggle('active', link.dataset.programKey === programKey);
            });
            if (typeof window.openCurriculumProgram === 'function') {
                window.openCurriculumProgram(programKey);
            }
            else {
                switchTab('nav-courses');
            }
            if (!collapsed()) hideOverlay();
        };

        parent.addEventListener('click', event => {
            event.preventDefault();
            if (collapsed()) {
                renderOverlay();
                return;
            }
            open = !open;
            if (open && !activeGroup) activeGroup = 'core-subjects';
            syncInline();
            // On mobile: keep sidebar open, just toggle submenu
            // switchTab('nav-courses') removed to prevent blank page and highlight on toggle
        });
        document.querySelectorAll('#subjects-submenu .nav-sublink').forEach(link => {
            link.addEventListener('click', event => {
                event.preventDefault();
                event.stopImmediatePropagation();
                open = true;
                syncInline();
                openProgram(link.dataset.programKey);
            }, true);
        });
        parent.addEventListener('mouseenter', () => {
            if (hoverTimer) clearTimeout(hoverTimer);
            if (collapsed()) renderOverlay();
        });
        sidebar?.addEventListener('mouseleave', () => {
            if (!collapsed()) return;
            hoverTimer = setTimeout(hideOverlay, 160);
        });
        subSidebar.addEventListener('mouseenter', () => {
            if (hoverTimer) clearTimeout(hoverTimer);
        });
        subSidebar.addEventListener('mouseleave', event => {
            if (!collapsed() || sidebar?.contains(event.relatedTarget)) return;
            hideOverlay();
        });
        document.addEventListener('click', event => {
            if (!collapsed()) return;
            if (!subSidebar.contains(event.target) && !parent.contains(event.target)) hideOverlay();
        });
        const originalToggle = window.toggleSidebar;
        window.toggleSidebar = function () {
            originalToggle?.();
            const isCollapsed = document.body.classList.contains('sidebar-collapsed') && window.innerWidth >= 1024;
            if (!isCollapsed) {
                if (!collapsed()) hideOverlay();
                syncInline();
                const isClassroomActive = Boolean(activeStudentClassroomId) || (typeof isStudentClassroomDetailVisible === 'function' && isStudentClassroomDetailVisible());
                if (isClassroomActive && activeStudentClassroomId) {
                    renderStudentClassroomSectionsSidebar(activeStudentClassroomId, false);
                    syncStudentSectionsNavState(true);
                } else if (isClassroomActive) {
                    syncStudentSectionsNavState(true);
                } else {
                    syncStudentSectionsNavState(false);
                }
            } else {
                syncInline();
                syncStudentSectionsNavState(false);
            }
        };
        syncInline();
    }
    function resolvePageStateFromLocation(state) {
        const hash = window.location.hash || '';
        if (!hash) return state?.page || 'home';
        const clean = hash.replace(/^#/, '');
        if (clean === 'home' || clean === 'dashboard' || clean === 'classrooms' || clean === 'classes' || clean === 'sections' || clean === 'courses' || clean === 'assignments' || clean === 'grades' || clean === 'attendance' || clean === 'resources' || clean === 'profile') {
            return clean;
        }
        if (clean === 'settings' || clean === 'account-settings' || clean.startsWith('account-settings-') || clean.startsWith('settings-')) {
            return 'settings';
        }
        if (clean.startsWith('subjects-')) {
            const parts = clean.replace('subjects-', '').split('-');
            if (parts.length >= 2) {
                const programKey = parts[0] === 'core' ? 'core-subjects'

                    : parts[0] === 'elective' ? 'applied-subjects'

                        : parts[0] === 'work' ? 'specialized-subjects'

                            : parts[0];
                const remainder = clean.replace(`subjects-${programKey}-`, '');
                if (remainder !== clean) return `inline-cluster:${programKey}:${remainder}`;
                return `inline:${programKey}`;

            }

        }
        if (clean.startsWith('classroom-') || clean.startsWith('classroom:')) return `classroom:${clean.replace(/^classroom[-:]/, '')}`;
        if (clean.startsWith('topic-content:') || clean.startsWith('topic-content-') || clean.startsWith('topic_content:') || clean.startsWith('topic_content-')) {
            const raw = clean.replace(/^topic[-_]content[-:]/, '');
            return `topic-content:${raw}`;
        }
        if (clean.startsWith('topic-') || clean.startsWith('topic:')) return `topic:${clean.replace(/^topic[-:]/, '')}`;
        if (clean.startsWith('tc-')) {
            const raw = clean.replace(/^tc-/, '');
            if (raw.includes(':')) {
                return `topic-content:${raw}`;
            }
            const parts = raw.split('-');
            if (parts.length >= 4 && /^v\d+$/.test(parts[parts.length - 1])) {
                const videoPart = parts.pop();
                const tab = parts.pop();
                const topicIdx = parts.pop();
                const subjectId = parts.join('-');
                return `topic-content:${subjectId}:${topicIdx}:${tab}:${videoPart.replace('v', '')}`;
            }
            if (parts.length >= 3) {
                const tab = parts.pop();
                const topicIdx = parts.pop();
                const subjectId = parts.join('-');
                return `topic-content:${subjectId}:${topicIdx}:${tab}`;
            }
        }
        if (clean.startsWith('nav-')) {
            const stripped = clean.replace(/^nav-/, '');
            if (navIdByPage[stripped] || navIdByPage[clean]) {
                return stripped;
            }
        }
        return state?.page || 'home';

    }
    function applyHistoryPage(page, state = null) {
        if (!page) {
            _applyTab('nav-home');
            return;
        }
        if (page.startsWith('curriculum:')) {
            _applyTab('nav-courses');
            openCurriculumProgram(page.replace('curriculum:', ''), false);
        }
        else if (page.startsWith('cluster:')) {
            _applyTab('nav-courses');
            const [, programKey, clusterKey] = page.split(':');
            openCurriculumCluster(programKey, clusterKey, false);
        }
        else if (page.startsWith('topic-content:')) {
            navLinks.forEach(l => l.classList.remove('active'));
            document.getElementById('nav-courses')?.classList.add('active');
            const parts = page.replace(/^topic-content:/, '').split(':');
            const subjectId = parts[0];
            const topicIdx = parseInt(parts[1]);
            const tab = parts[2] || 'videos';
            const rawVIdx = parts[3];
            const videoIdx = (rawVIdx === 'null' || rawVIdx === 'undefined' || !rawVIdx) ? null : parseInt(rawVIdx);
            const isSubmissionSubMode = Boolean(parts[4] === 'submission' || parts[5] === 'submission' || state?.viewSubmission === true);
            const isSubmitSubMode = Boolean(parts[4] === 'submit' || parts[5] === 'submit' || state?.submitMode === true);

            window._studentViewSubmissionMode = isSubmissionSubMode;
            window._sharedViewSubmissionMode = isSubmissionSubMode;
            window._studentSubmissionMode = isSubmitSubMode;

            if (!isSubmissionSubMode && !isSubmitSubMode) {
                window._activeSubmissionAttemptPage = window._activeSubmissionAttemptPage || {};
                if (videoIdx !== null && !isNaN(videoIdx)) {
                    window._activeSubmissionAttemptPage[`${subjectId}_${topicIdx}_${tab}_${videoIdx}`] = 1;
                } else {
                    window._activeSubmissionAttemptPage = {};
                }
            }

            if (typeof window.restoreStudentTopicSection === 'function') {
                window.restoreStudentTopicSection(subjectId);
            }
            _tcSubjectId = subjectId;
            _tcTopicIdx = topicIdx;
            _tcTab = tab;
            _tcVideoIdx = (tab === 'videos' || tab === 'handouts') ? videoIdx : null;
            window._scAssessmentDetailIdx = (tab !== 'videos' && tab !== 'handouts') ? videoIdx : null;
            window._tcAssessmentDetailIdx = (tab !== 'videos' && tab !== 'handouts') ? videoIdx : null;

            const contentSection = document.getElementById('section-topic-content');
            if (contentSection && !contentSection.classList.contains('hidden')) {
                _renderTopicContentMain(subjectId, topicIdx, tab);
            } else {
                _showTopicContent(subjectId, topicIdx, tab, videoIdx);
            }
            if (videoIdx !== null || isSubmissionSubMode || isSubmitSubMode) {
                try {
                    window.scrollTo({ left: 0, top: 0, behavior: 'instant' });
                    document.documentElement.scrollTop = 0;
                    document.body.scrollTop = 0;
                    const mc = document.getElementById('main-content');
                    if (mc) mc.scrollTop = 0;
                } catch (_) { }
            }
        }
        else if (page.startsWith('classroom:') || page.startsWith('classroom-')) {
            const raw = page.replace(/^classroom[-:]/, '');
            const parts = raw.split(':');
            const classroomId = decodeURIComponent(parts[0]);
            const targetTab = parts[1] || state?.initialTab || 'room';
            activeStudentRoomTab = targetTab;
            showClassroomDetail(classroomId, false, targetTab);
        }
        else if (page.startsWith('topic:')) {
            navLinks.forEach(l => l.classList.remove('active'));
            document.getElementById('nav-courses')?.classList.add('active');
            const subjectId = page.replace('topic:', '');
            const resolvedTopicIdx = Number.isInteger(state?.topicIdx)
                ? state.topicIdx
                : (_tcSubjectId === subjectId && Number.isInteger(_tcTopicIdx) ? _tcTopicIdx : 0);
            _tcSubjectId = subjectId;
            _tcTopicIdx = resolvedTopicIdx;
            _buildAndShowTopicPage(subjectId);
        }
        else {
            const navId = navIdByPage[page] || 'nav-home';
            if (navId === 'nav-home' || navId === 'nav-profile') {
                hideStudentClassroomSectionsSidebar();
            }
            _applyTab(navId);
        }
    }
    //   Browser back/forward
    // One back press moves one screen. Extra history rows for the same
    // material, quiz, or room are skipped in that same press.

    window.studentHistoryScreenKey = function (hash) {
        const clean = String(hash == null ? (window.location.hash || '') : hash).replace(/^#/, '');
        if (!clean) return 'home';
        if (clean.startsWith('topic-content:') || clean.startsWith('topic-content-') || clean.startsWith('topic_content:') || clean.startsWith('topic_content-')) {
            const parts = clean.replace(/^topic[-_]content[-:]/, '').split(':');
            const subjectId = parts[0] || '';
            const topicIdx = parts[1] || '0';
            let tab = parts[2] || 'videos';
            if (['assignments', 'quiz', 'activity', 'performance', 'assessments'].includes(tab)) tab = 'assessments';
            let item = parts[3];
            if (item === undefined || item === '' || item === 'null' || item === 'undefined') item = 'list';
            const rest = parts.slice(4);
            let mode = 'page';
            if (rest.indexOf('submission') !== -1) mode = 'submission';
            else if (rest.indexOf('submit') !== -1) mode = 'submit';
            return `topic-content:${subjectId}:${topicIdx}:${tab}:${item}:${mode}`;
        }
        if (clean.startsWith('topic:') || clean.startsWith('topic-')) {
            return `topic:${clean.replace(/^topic[-:]/, '').split(':')[0]}`;
        }
        if (clean.startsWith('classroom:') || clean.startsWith('classroom-')) {
            return `classroom:${clean.replace(/^classroom[-:]/, '')}`;
        }
        return clean;
    };

    window.noteStudentHistoryScreen = function () {
        window._studentShownHistoryKey = window.studentHistoryScreenKey(window.location.hash);
        window._studentHistoryHandledHash = window.location.hash || '';
    };

    window.studentQuizPlayerIsOpen = function () {
        const modal = document.getElementById('sigma-quiz-form-modal');
        if (!modal || modal.classList.contains('hidden')) return false;
        try {
            const style = window.getComputedStyle(modal);
            return style.display !== 'none' && style.visibility !== 'hidden';
        } catch (e) {
            return true;
        }
    };

    if (!window._studentShownHistoryKey) window.noteStudentHistoryScreen();

    window.addEventListener('popstate', e => {
        if (window._isProcessingPopstate || window._isProcessingBack) {
            return;
        }
        if (window.studentQuizPlayerIsOpen()) {
            return;
        }
        if (typeof window.__hasOpenMobileOverlay === 'function' && window.__hasOpenMobileOverlay()) {
            window.__closeOpenMobileOverlay();
            return;
        }

        const landedKey = window.studentHistoryScreenKey(window.location.hash);
        const shownKey = window._studentShownHistoryKey;
        const sameScreen = Boolean(shownKey) && landedKey === shownKey;
        if (sameScreen && (window._studentSameScreenSkips || 0) < 12) {
            window._studentSkippingSameScreen = true;
            window._studentSameScreenSkips = (window._studentSameScreenSkips || 0) + 1;
            const beforeHref = window.location.href;
            window.history.back();
            setTimeout(() => {
                if (window._studentSkippingSameScreen && window.location.href === beforeHref) {
                    window._studentSkippingSameScreen = false;
                    window._studentSameScreenSkips = 0;
                }
            }, 350);
            return;
        }

        window._studentSkippingSameScreen = false;
        window._studentSameScreenSkips = 0;
        window.noteStudentHistoryScreen();

        const page = resolvePageStateFromLocation(e.state);

        applyHistoryPage(page, e.state);

    });

    window.addEventListener('hashchange', () => {
        if (window._studentSkippingSameScreen) return;
        if (window._isProcessingPopstate || window._isProcessingBack) {
            return;
        }
        if ((window.location.hash || '') === window._studentHistoryHandledHash) return;
        window.noteStudentHistoryScreen();
        const page = resolvePageStateFromLocation(history.state);
        applyHistoryPage(page, history.state);
    });
    //   Subjects Data (q1Percent + q2Percent for bar)  

    const subjectsData = {
        enrolled: [],
        completed: []
    };
    const currentStudentCurriculumLabel = 'Curriculum';
    function getHomeSubjectCategory(subject) {
        const subtitle = String(subject?.subtitle || '').toLowerCase();
        const subjectId = String(subject?.id || '').toLowerCase();
        const subjectText = String(subject?.text || '').toLowerCase();
        if (
            subtitle.includes('specialized')
            || subtitle.includes('immersion')
            || subjectId.includes('immersion')
            || subjectText.includes('specialized')
        ) {
            return 'specialized';
        }
        if (String(subject?.id || '').startsWith('core-') || subtitle.includes('core subject')) {
            return 'core';
        }
        if (subtitle.includes('cluster') || subtitle.includes('strand')) {
            return 'specialized';
        }
        return 'applied';
    }
    const curriculumPrograms = {
        'core-subjects': {
            title: 'Core Subjects',
            kicker: 'Shared Foundation',
            image: 'image/core-subjects.jpg',
            overview: 'Core subjects build the shared academic foundation for every Senior High School learner across all strands through communication, mathematics, science, literature, and social awareness.',
            subjects: [
                { id: 'card-oralcomm', title: 'Oral Communication', overview: 'Developing effective speaking and listening skills for various real-life and academic contexts.', image: 'image/book1.jpg' },
                { id: 'card-genmath', title: 'General Mathematics', overview: 'Functions, business math, loans, interest rates, and logical problem solving.', image: 'image/book2.jpg' },
                { id: 'card-stats', title: 'Statistics & Probability', overview: 'Understanding data analysis, probability distributions, sampling, and hypothesis testing.', image: 'image/book5.jpg' },
                { id: 'card-earthsci', title: 'Earth and Life Science', overview: 'Earth systems, geology, biology, ecosystems, and environmental principles.', image: 'image/book6.jpg' },
                { id: 'core-history-society', title: 'Understanding Culture, Society and Politics', overview: 'Philippine society, governance, citizenship, culture, and human rights.', image: 'image/book3.jpg' }
            ]
        },
        'applied-subjects': {
            title: 'Applied Subjects',
            kicker: 'Essential Skills',
            image: 'image/academic-track.jpg',
            overview: 'Practical subjects that develop contextualized competencies across all tracks, focusing on real-world applications of learning.',
            subjects: [
                { id: 'card-empowerment', title: 'Empowerment Technologies', overview: 'Developing modern ICT skills, productivity suites, and collaborative online work tools.', image: 'image/book4.jpg' },
                { id: 'applied-eapp', title: 'English for Academic and Professional Purposes', overview: 'Critical reading, academic writing, and concept paper development.', image: 'image/book1.jpg' },
                { id: 'applied-research1', title: 'Practical Research 1', overview: 'Qualitative research design, data collection methods, and thematic analysis.', image: 'image/book2.jpg' },
                { id: 'applied-entrepreneurship', title: 'Entrepreneurship', overview: 'Business planning, market validation, product development, and small business management.', image: 'image/book5.jpg' }
            ]
        },
        'specialized-subjects': {
            title: 'Specialized Subjects',
            kicker: '5 SHS Strands',
            image: 'image/work-immersion.jpg',
            overview: 'Strand-specific specialization subjects for the 5 Senior High School Strands of Interface Computer College Caloocan: ICT, ABM, HUMSS, GAS, and HE.',
            subjects: [
                // ICT Strand
                { id: 'card-prog1', title: 'Computer Programming 1', overview: 'Learn the fundamentals of software development, logic, and algorithms.', image: 'image/book1.jpg', strand: 'ICT' },
                { id: 'card-webdev', title: 'Web Development 1', overview: 'Build responsive websites using modern HTML5, CSS3, and JavaScript.', image: 'image/book4.jpg', strand: 'ICT' },
                { id: 'card-database', title: 'Database Management 1', overview: 'Relational database architecture, SQL queries, and schema normalization.', image: 'image/book2.jpg', strand: 'ICT' },
                // ABM Strand
                { id: 'abm-fabm1', title: 'Fundamentals of ABM 1', overview: 'Basic accounting principles, journal entries, and financial statement preparation.', image: 'image/book3.jpg', strand: 'ABM' },
                { id: 'abm-busmath', title: 'Business Mathematics', overview: 'Commercial computations, markup, discounts, commission, and financial ratios.', image: 'image/book5.jpg', strand: 'ABM' },
                // HUMSS Strand
                { id: 'humss-creative-writing', title: 'Creative Writing', overview: 'Fiction, poetry, drama, and craft techniques for imaginative literary expression.', image: 'image/book6.jpg', strand: 'HUMSS' },
                { id: 'humss-politics', title: 'Philippine Politics & Governance', overview: 'Democratic institutions, the constitution, and political structures in the Philippines.', image: 'image/book7.jpg', strand: 'HUMSS' },
                // GAS Strand
                { id: 'gas-economics', title: 'Applied Economics', overview: 'Economic analysis, market structures, price determination, and Philippine economic issues.', image: 'image/book8.jpg', strand: 'GAS' },
                { id: 'gas-drrr', title: 'Disaster Readiness & Risk Reduction', overview: 'Natural hazard analysis, emergency response, and community disaster preparedness.', image: 'image/book1.jpg', strand: 'GAS' },
                // HE Strand
                { id: 'he-cookery', title: 'Cookery 1', overview: 'Culinary arts fundamentals, commercial food preparation, and food safety standards.', image: 'image/book2.jpg', strand: 'HE' },
                { id: 'he-bread-pastry', title: 'Bread and Pastry Production', overview: 'Baking science, pastries, cake decorating, and bakery kitchen operations.', image: 'image/book3.jpg', strand: 'HE' }
            ]
        }
    };
    const curriculumTopicCatalog = {
        'core-effective-communication': {
            text: 'Effective Communication',
            subtitle: 'Core Subject   Grade 11',
            instructor: 'DepEd Core Curriculum',
            icon: 'fa-solid fa-comments',
            bg: 'image/book1.jpg',
            q1Percent: 0,
            q2Percent: 0,
            summary: 'A core communication subject that strengthens speaking, listening, and writing for everyday and academic use.',
            q1Topics: [],
            q2Topics: [],
            q3Topics: [],
            q4Topics: []
        },
        'core-life-and-career-skills': {
            text: 'Life and Career Skills',
            subtitle: 'Core Subject   Grade 11',
            instructor: 'DepEd Core Curriculum',
            icon: 'fa-solid fa-heart-circle-check',
            bg: 'image/book4.jpg',
            q1Percent: 0,
            q2Percent: 0,
            summary: 'A core subject that prepares learners for career planning, self-management, financial literacy, and workplace readiness.',
            q1Topics: [],
            q2Topics: [],
            q3Topics: [],
            q4Topics: []
        },
        'core-general-mathematics': {
            text: 'General Mathematics',
            subtitle: 'Core Subject   Grade 11',
            instructor: 'DepEd Core Curriculum',
            icon: 'fa-solid fa-square-root-variable',
            bg: 'image/book2.jpg',
            q1Percent: 0,
            q2Percent: 0,
            summary: 'A core mathematics subject focused on functions, business math, interest, loans, and logic for real-life use.',
            q1Topics: [],
            q2Topics: [],
            q3Topics: [],
            q4Topics: []
        },
        'core-general-science': {
            text: 'General Science',
            subtitle: 'Core Subject   Grade 11',
            instructor: 'DepEd Core Curriculum',
            icon: 'fa-solid fa-flask',
            bg: 'image/book3.jpg',
            q1Percent: 0,
            q2Percent: 0,
            summary: 'A science foundation that connects earth systems, life science, matter, energy, and real-world scientific reasoning.',
            q1Topics: [],
            q2Topics: [],
            q3Topics: [],
            q4Topics: []
        },
        'core-history-society': {
            text: 'Pag-aaral ng Kasaysayan at Lipunang Pilipino',
            subtitle: 'Core Subject â€¢ Grade 11',
            instructor: 'DepEd Core Curriculum',
            icon: 'fa-solid fa-landmark',
            bg: 'image/book5.jpg',
            q1Percent: 0,
            q2Percent: 0,
            summary: 'A core subject that builds understanding of Philippine society, governance, citizenship, and historical identity.',
            q1Topics: [],
            q2Topics: [],
            q3Topics: [],
            q4Topics: []
        },
        'subj-prog1': {
            text: 'Programming 1',
            subtitle: 'Applied Subject â€¢ Grade 11',
            instructor: 'Alex Reyes',
            icon: 'fa-solid fa-code',
            bg: 'image/techpro-track.jpg',
            q1Percent: 0,
            q2Percent: 0,
            q3Percent: 0,
            q4Percent: 0,
            summary: 'Introduction to computer programming using Java, covering syntax, logic, and object-oriented concepts.',
            q1Topics: [],
            q2Topics: [],
            q3Topics: [],
            q4Topics: []
        },
        'immersion-stage-1': {
            text: 'Pre-Immersion',
            subtitle: 'Specialized Stage â€¢ Grade 12',
            instructor: 'Immersion Coordinator',
            icon: 'fa-solid fa-user-clock',
            bg: 'image/book6.jpg',
            q1Percent: 0,
            q2Percent: 0,
            summary: 'Orientation and readiness for work immersion placement.',
            q1Topics: []
        },
        'immersion-stage-2': {
            text: 'Immersion Proper',
            subtitle: 'Specialized Stage â€¢ Grade 12',
            instructor: 'Company Supervisor',
            icon: 'fa-solid fa-briefcase',
            bg: 'image/book7.jpg',
            q1Percent: 0,
            q2Percent: 0,
            summary: 'Supervised performance and practical training in a real work environment.',
            q1Topics: []
        },
        'immersion-stage-3': {
            text: 'Post-Immersion',
            subtitle: 'Specialized Stage â€¢ Grade 12',
            instructor: 'Immersion Coordinator',
            icon: 'fa-solid fa-graduation-cap',
            bg: 'image/book8.jpg',
            q1Percent: 0,
            q2Percent: 0,
            summary: 'Final evaluation and portfolio building after the immersion period.',
            q1Topics: []
        },
        'card-earthsci': {
            text: 'Earth and Life Science',
            subtitle: 'Core Subject • Grade 11',
            instructor: 'Roberto Diaz',
            icon: 'fa-solid fa-earth-americas',
            bg: 'image/book6.jpg',
            q1Percent: 0,
            q2Percent: 0,
            summary: 'A core science foundation connecting earth systems, life processes, bioenergetics, and ecosystems.',
            q1Topics: [],
            q2Topics: [],
            q3Topics: [],
            q4Topics: []
        },
        'card-oralcomm': {
            text: 'Oral Communication',
            subtitle: 'Core Subject • Grade 11',
            instructor: 'Grace Tan',
            icon: 'fa-solid fa-comments',
            bg: 'image/book1.jpg',
            q1Percent: 0,
            q2Percent: 0,
            summary: 'Developing effective speaking and listening skills for interpersonal, group, and public communication.',
            q1Topics: [],
            q2Topics: [],
            q3Topics: [],
            q4Topics: []
        },
        'card-prog1': {
            text: 'Computer Programming 1',
            subtitle: 'Core Subject • Grade 11',
            instructor: 'Maria Santos Ramos',
            icon: 'fa-solid fa-code',
            bg: 'image/book1.jpg',
            q1Percent: 0,
            q2Percent: 0,
            q3Percent: 0,
            q4Percent: 0,
            summary: 'Learn the fundamentals of programming using modern languages.',
            q1Topics: [],
            q2Topics: [],
            q3Topics: [],
            q4Topics: []
        },
        'card-webdev': {
            text: 'Web Development 1',
            subtitle: 'Applied Subject • Grade 11',
            instructor: 'Maria Santos Ramos',
            icon: 'fa-solid fa-globe',
            bg: 'image/book4.jpg',
            q1Percent: 0,
            q2Percent: 0,
            q3Percent: 0,
            q4Percent: 0,
            summary: 'Build responsive websites using HTML, CSS, and JavaScript.',
            q1Topics: [],
            q2Topics: [],
            q3Topics: [],
            q4Topics: []
        },
        'card-database': {
            text: 'Database Management 1',
            subtitle: 'Specialized Subject   Grade 11',
            instructor: 'Elena Reyes',
            icon: 'fa-solid fa-database',
            bg: 'image/book2.jpg',
            q1Percent: 0,
            q2Percent: 0,
            summary: 'Master SQL and database design principles.',
            q1Topics: [],
            q2Topics: [],
            q3Topics: [],
            q4Topics: []
        },
        'card-empowerment': {
            text: 'Empowerment Technologies',
            subtitle: 'Core Subject   Grade 11',
            instructor: 'Roberto Diaz',
            icon: 'fa-solid fa-bolt',
            bg: 'image/book3.jpg',
            q1Percent: 0,
            q2Percent: 0,
            summary: 'Developing ICT skills for professional environments.',
            q1Topics: [],
            q2Topics: [],
            q3Topics: [],
            q4Topics: []
        },
        'card-stats': {
            text: 'Statistics & Probability',
            subtitle: 'Core Subject   Grade 11',
            instructor: 'Jennifer Santos',
            icon: 'fa-solid fa-chart-line',
            bg: 'image/book5.jpg',
            q1Percent: 0,
            q2Percent: 0,
            summary: 'Understanding data analysis and probability theory.',
            q1Topics: [],
            q2Topics: [],
            q3Topics: [],
            q4Topics: []
        },
        'card-genmath': {
            text: 'General Mathematics',
            subtitle: 'Core Subject • Grade 11',
            instructor: 'Elena Cruz',
            icon: 'fa-solid fa-infinity',
            bg: 'image/book2.jpg',
            q1Percent: 0,
            q2Percent: 0,
            summary: 'Functions, business math, loans, interest rates, logic, and practical mathematical problem-solving.',
            q1Topics: [],
            q2Topics: [],
            q3Topics: [],
            q4Topics: []
        },
        'applied-eapp': {
            text: 'English for Academic and Professional Purposes',
            subtitle: 'Applied Subject • Grade 11',
            instructor: 'Grace Tan',
            icon: 'fa-solid fa-pen-nib',
            bg: 'image/book1.jpg',
            q1Percent: 0,
            q2Percent: 0,
            summary: 'Develops critical reading, academic analysis, concept paper formulation, and professional paper writing skills.',
            q1Topics: [],
            q2Topics: []
        },
        'applied-research1': {
            text: 'Practical Research 1',
            subtitle: 'Applied Subject • Grade 11',
            instructor: 'Dr. Santos',
            icon: 'fa-solid fa-magnifying-glass-chart',
            bg: 'image/book2.jpg',
            q1Percent: 0,
            q2Percent: 0,
            summary: 'Qualitative research design, problem formulation, qualitative data gathering, and thematic content analysis.',
            q1Topics: [],
            q2Topics: []
        },
        'applied-entrepreneurship': {
            text: 'Entrepreneurship',
            subtitle: 'Applied Subject • Grade 11',
            instructor: 'Mark Davis',
            icon: 'fa-solid fa-lightbulb',
            bg: 'image/book5.jpg',
            q1Percent: 0,
            q2Percent: 0,
            summary: 'Business planning, market validation, value proposition creation, and enterprise management.',
            q1Topics: [],
            q2Topics: []
        },
        'abm-fabm1': {
            text: 'Fundamentals of ABM 1',
            subtitle: 'Specialized Subject (ABM) • Grade 11',
            instructor: 'ABM Strand Faculty',
            icon: 'fa-solid fa-calculator',
            bg: 'image/book3.jpg',
            q1Percent: 0,
            q2Percent: 0,
            summary: 'Basic accounting concepts, the accounting equation, rules of debit and credit, and journalizing.',
            q1Topics: [],
            q2Topics: []
        },
        'abm-busmath': {
            text: 'Business Mathematics',
            subtitle: 'Specialized Subject (ABM) • Grade 11',
            instructor: 'ABM Strand Faculty',
            icon: 'fa-solid fa-coins',
            bg: 'image/book5.jpg',
            q1Percent: 0,
            q2Percent: 0,
            summary: 'Commercial computations, fractions and decimals in business, mark-on, markdown, and profit margins.',
            q1Topics: [],
            q2Topics: []
        },
        'humss-creative-writing': {
            text: 'Creative Writing',
            subtitle: 'Specialized Subject (HUMSS) • Grade 11',
            instructor: 'HUMSS Strand Faculty',
            icon: 'fa-solid fa-feather-pointed',
            bg: 'image/book6.jpg',
            q1Percent: 0,
            q2Percent: 0,
            summary: 'Fiction, poetry, drama, and craft techniques for imaginative literary expression.',
            q1Topics: [],
            q2Topics: []
        },
        'humss-politics': {
            text: 'Philippine Politics & Governance',
            subtitle: 'Specialized Subject (HUMSS) • Grade 11',
            instructor: 'HUMSS Strand Faculty',
            icon: 'fa-solid fa-landmark-dome',
            bg: 'image/book7.jpg',
            q1Percent: 0,
            q2Percent: 0,
            summary: 'Democratic institutions, the constitution, branches of government, and political participation in the Philippines.',
            q1Topics: [],
            q2Topics: []
        },
        'gas-economics': {
            text: 'Applied Economics',
            subtitle: 'Specialized Subject (GAS) • Grade 11',
            instructor: 'GAS Strand Faculty',
            icon: 'fa-solid fa-money-bill-trend-up',
            bg: 'image/book8.jpg',
            q1Percent: 0,
            q2Percent: 0,
            summary: 'Economic analysis, market structures, demand and supply, and contemporary Philippine socioeconomic issues.',
            q1Topics: [],
            q2Topics: []
        },
        'gas-drrr': {
            text: 'Disaster Readiness & Risk Reduction',
            subtitle: 'Specialized Subject (GAS) • Grade 11',
            instructor: 'GAS Strand Faculty',
            icon: 'fa-solid fa-shield-halved',
            bg: 'image/book1.jpg',
            q1Percent: 0,
            q2Percent: 0,
            summary: 'Natural hazard analysis, emergency response, and community disaster preparedness.',
            q1Topics: [],
            q2Topics: []
        },
        'he-cookery': {
            text: 'Cookery 1',
            subtitle: 'Specialized Subject (HE) • Grade 11',
            instructor: 'HE Strand Faculty',
            icon: 'fa-solid fa-utensils',
            bg: 'image/book2.jpg',
            q1Percent: 0,
            q2Percent: 0,
            summary: 'Culinary arts fundamentals, kitchen safety and sanitation, commercial food preparation, and plating.',
            q1Topics: [],
            q2Topics: []
        },
        'he-bread-pastry': {
            text: 'Bread and Pastry Production',
            subtitle: 'Specialized Subject (HE) • Grade 11',
            instructor: 'HE Strand Faculty',
            icon: 'fa-solid fa-cake-candles',
            bg: 'image/book3.jpg',
            q1Percent: 0,
            q2Percent: 0,
            summary: 'Baking science, yeast doughs, pastries, pies, cookies, and bakery kitchen management.',
            q1Topics: [],
            q2Topics: []
        }
    };
    function getAssessmentsForSubject(subjectId, category) {
        const data = getTopicData(subjectId);
        if (!data) return [];

        const labels = {
            'assignment': 'Assignment',
            'quiz': 'Quiz',
            'activity': 'Activity',
            'perf. task': 'PT'
        };
        const label = labels[category] || category;
        const generated = [];

        ['q1Topics', 'q2Topics', 'q3Topics', 'q4Topics'].forEach((termKey, termIdx) => {
            const topics = data[termKey] || [];
            topics.forEach((topic, tIdx) => {
                generated.push({
                    title: `${label} #${tIdx + 1}: Introduction to ${topic.title}`,
                    date: null,
                    max: 100,
                    subjectId: subjectId,
                    term: termIdx + 1,
                    topicIdx: tIdx,
                    itemIdx: 0
                });
                generated.push({
                    title: `${label} #${tIdx + 1}.2: Advanced concepts in ${topic.title}`,
                    date: null,
                    max: 100,
                    subjectId: subjectId,
                    term: termIdx + 1,
                    topicIdx: tIdx,
                    itemIdx: 1
                });
            });
        });
        return generated;
    }

    function buildAssessmentRows() {
        const rows = [];
        const baseDate = new Date('2026-03-26T08:00:00');
        const seen = new Set();
        const sEnrolled = (typeof subjectsData !== 'undefined' && Array.isArray(subjectsData?.enrolled)) ? subjectsData.enrolled : (Array.isArray(window.subjectsData?.enrolled) ? window.subjectsData.enrolled : []);
        const sCompleted = (typeof subjectsData !== 'undefined' && Array.isArray(subjectsData?.completed)) ? subjectsData.completed : (Array.isArray(window.subjectsData?.completed) ? window.subjectsData.completed : []);
        const sources = [
            ...sEnrolled.map(subject => subject.id),
            ...sCompleted.map(subject => subject.id)
        ];

        if (sources.length === 0 && typeof topicDataBySubject !== 'undefined' && topicDataBySubject) {
            Object.keys(topicDataBySubject).forEach(id => sources.push(id));
        }

        sources.forEach((subjectId, sIdx) => {
            if (seen.has(subjectId)) return;
            seen.add(subjectId);

            const subject = typeof getTopicSubject === 'function' ? getTopicSubject(subjectId) : null;
            const subjectName = subject ? (typeof getSubjectDisplayName === 'function' ? getSubjectDisplayName(subject) : (subject.text || subject.name || subject.title || subjectId)) : subjectId;
            if (!subjectName) return;

            const categories = ['assignment', 'quiz', 'activity', 'perf. task'];

            const isCompletedSubject = Array.isArray(sCompleted) && sCompleted.some(s => s.id === subjectId);

            categories.forEach(cat => {
                const assessments = getAssessmentsForSubject(subjectId, cat);
                assessments.forEach((ass, aIdx) => {
                    const startDate = new Date(baseDate);
                    startDate.setDate(baseDate.getDate() - (aIdx * 5 + (sIdx * 2) + 2));
                    const dueDate = new Date(startDate);
                    dueDate.setDate(startDate.getDate() + 7);

                    let status = 'not-started';
                    if (isCompletedSubject) {
                        status = 'graded';
                    } else if (aIdx % 4 === 0) {
                        status = 'graded';
                    } else if (aIdx % 4 === 1) {
                        status = 'submitted';
                    } else if (aIdx % 4 === 2) {
                        status = 'waiting';
                    } else if (aIdx % 5 === 0) {
                        status = 'overdue';
                    }

                    const score = status === 'graded' ? 85 + (aIdx % 15) : 0;
                    const tabMap = { 'assignment': 'assignments', 'quiz': 'quiz', 'activity': 'activity', 'perf. task': 'performance' };

                    rows.push({
                        subjectId: subjectId,
                        subject: subjectName,
                        activity: ass.title,
                        category: cat,
                        tab: tabMap[cat] || 'activity',
                        topicIdx: ass.topicIdx,
                        itemIdx: ass.itemIdx,
                        status: status,
                        score: score,
                        max: ass.max,
                        startDate: startDate,
                        dueDate: dueDate,
                        submittedOn: status !== 'not-started' ? new Date(startDate.getTime() + 86400000) : null,
                        gradedOn: status === 'graded' ? new Date(startDate.getTime() + 259200000) : null
                    });
                });
            });
        });

        return rows.sort((a, b) => b.startDate - a.startDate);
    }
    function openStudentAssessmentsPage(subjectName, sectionName) {
        if (activeStudentClassroomId && typeof switchStudentRoomTab === 'function') {
            switchStudentRoomTab('topics');
            return;
        }
        if (typeof window.openTopicSectionFromRail === 'function' && sectionName) {
            window.openTopicSectionFromRail(sectionName);
            return;
        }
        if (typeof switchTab === 'function') switchTab('nav-classrooms');
    }
    window.openStudentAssessmentsPage = openStudentAssessmentsPage;

    function renderAssessmentsPage(filterSubject, filterSection) {
        const assignmentsSection = document.getElementById('section-assignments');
        if (!assignmentsSection || assignmentsSection.classList.contains('hidden')) {
            return;
        }
        if (activeStudentClassroomId && typeof switchStudentRoomTab === 'function') {
            switchStudentRoomTab('topics');
        } else if (typeof switchTab === 'function') {
            switchTab('nav-classrooms');
        }
    }


    let currentGradesView = 'overall';
    let currentGradesAnalyticsMode = 'terms';
    let gradesCarouselIndex = 0;
    function clampPercent(value) {
        return Math.max(0, Math.min(100, Math.round(value || 0)));

    }
    function getTopicAveragePercent(topic) {
        if (!topic?.grades) return null;
        const values = ['quiz', 'assignment', 'activity', 'performance']

            .map(key => topic.grades[key])

            .filter(value => typeof value === 'number' && value > 0);
        if (!values.length) return null;
        return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);

    }
    function resolveSubjectType(subjectName, rawObj) {
        const nameLower = String(subjectName || rawObj?.name || rawObj?.title || rawObj?.subject || '').trim().toLowerCase();

        // 1. Direct explicit subject type check on the object (if explicitly set)
        const directType = String(rawObj?.subjectType || rawObj?.type || rawObj?.category || '').trim().toLowerCase();
        if (directType === 'core' || directType === 'core subject') return 'Core';
        if (directType === 'applied' || directType === 'applied subject') return 'Applied';
        if (directType === 'specialized' || directType === 'specialized subject') return 'Specialized';

        // 2. Exact / Keyword Title Heuristics (Standard DepEd SHS Curriculum)
        const coreMatches = [
            'oral communication', 'oral com', 'reading and writing', 'reading & writing',
            'komunikasyon', 'pagbasa', '21st century', 'contemporary arts', 'cpar',
            'media and information', 'media and info', 'mil', 'general mathematics', 'general math',
            'gen math', 'genmath', 'statistics and probability', 'statistics', 'probability', 'stats',
            'earth and life', 'earth & life', 'physical science', 'introduction to the philosophy',
            'philosophy', 'physical education', 'pe and health', 'p.e.', 'hope', 'personal development',
            'personal dev', 'perdev', 'understanding culture', 'ucsp', 'society and politics'
        ];
        if (coreMatches.some(k => nameLower.includes(k))) return 'Core';

        const appliedMatches = [
            'empowerment technologies', 'empowerment tech', 'e-tech', 'etech',
            'english for academic', 'eapp', 'practical research 1', 'practical research 2',
            'research 1', 'research 2', 'entrepreneurship', 'filipino sa piling larang',
            'piling larang', 'inquiries, investigations', 'inquiries'
        ];
        if (appliedMatches.some(k => nameLower.includes(k))) return 'Applied';

        const specializedMatches = [
            'programming', 'computer programming', 'prog 1', 'prog 2', 'web development',
            'web dev', 'database management', 'database', 'dbms', 'computer systems', 'animation',
            'fundamentals of abm', 'fabm', 'business math', 'business finance', 'organization and management',
            'org and mgt', 'org & mgt', 'principles of marketing', 'marketing', 'creative writing',
            'creative nonfiction', 'philippine politics', 'politics and governance', 'community engagement',
            'disciplines and ideas', 'diss', 'diass', 'applied economics', 'disaster readiness',
            'drrr', 'cookery', 'bread and pastry', 'food and beverage', 'fbs', 'housekeeping',
            'tourism', 'css', 'pre-calculus', 'precalc', 'basic calculus', 'calculus',
            'general biology', 'biology', 'general physics', 'physics', 'general chemistry',
            'chemistry', 'work immersion', 'immersion'
        ];
        if (specializedMatches.some(k => nameLower.includes(k))) return 'Specialized';

        // 3. Check in adminSubjects
        try {
            const adminSubjects = loadSharedState(ADMIN_SUBJECTS_STORAGE_KEY, []);
            if (Array.isArray(adminSubjects)) {
                const match = adminSubjects.find(s => {
                    if (!s) return false;
                    const sName = String(s.name || s.title || s.subject || '').trim().toLowerCase();
                    const sCode = String(s.code || s.id || '').trim().toLowerCase();
                    return sName === nameLower || sCode === nameLower || (nameLower && sName && (sName.includes(nameLower) || nameLower.includes(sName)));
                });
                if (match) {
                    const matchType = String(match.type || match.category || '').trim().toLowerCase();
                    if (matchType.includes('specialized')) return 'Specialized';
                    if (matchType.includes('applied')) return 'Applied';
                    if (matchType.includes('core')) return 'Core';
                }
            }
        } catch (e) {}

        // 4. Check curriculumPrograms catalog
        if (typeof curriculumPrograms !== 'undefined' && curriculumPrograms) {
            const inCore = (curriculumPrograms['core-subjects']?.subjects || []).some(s => {
                const t = String(s.title || s.name || '').trim().toLowerCase();
                return t === nameLower || (t && nameLower && (t.includes(nameLower) || nameLower.includes(t)));
            });
            if (inCore) return 'Core';

            const inApplied = (curriculumPrograms['applied-subjects']?.subjects || []).some(s => {
                const t = String(s.title || s.name || '').trim().toLowerCase();
                return t === nameLower || (t && nameLower && (t.includes(nameLower) || nameLower.includes(t)));
            });
            if (inApplied) return 'Applied';

            const inSpec = (curriculumPrograms['specialized-subjects']?.subjects || []).some(s => {
                const t = String(s.title || s.name || '').trim().toLowerCase();
                return t === nameLower || (t && nameLower && (t.includes(nameLower) || nameLower.includes(t)));
            });
            if (inSpec) return 'Specialized';
        }

        return 'Core';
    }
    window.resolveSubjectType = resolveSubjectType;

    function getSubjectGradeRows() {
        if (typeof syncStudentEnrolledClassrooms === 'function') {
            syncStudentEnrolledClassrooms();
        }
        const student = (typeof getLoggedInStudentUser === 'function') ? getLoggedInStudentUser() : {};
        const studentId = String(student?.uid || student?.id || '').trim();
        const studentEmail = (student?.email || '').toLowerCase().trim();
        const studentFullName = (student?.fullName || student?.name || `${student?.firstName || ''} ${student?.lastName || ''}`).toLowerCase().trim();
        const studentNameRev = `${student?.lastName || ''}, ${student?.firstName || ''}`.toLowerCase().trim();
        const studentLastName = (student?.lastName || '').toLowerCase().trim();
        const studentSection = String(student?.section || student?.gradeSection || '').toLowerCase().trim();

        // 1. Gather all enrolled sections/classes for the logged-in student ONLY
        const combinedAdminSections = [];
        const seenStudentSecKeys = new Set();
        ['sigma-admin-sections', 'sigma-sections-list', 'sigma-admin-sections-v1', 'sigma-sections'].forEach(key => {
            const list = getStoredJson(key, []);
            if (Array.isArray(list)) {
                list.forEach(sec => {
                    if (!sec) return;
                    const sId = String(sec.id || '');
                    const sName = String(sec.name || sec.sectionName || '').trim().toLowerCase();
                    const sSubj = String(sec.subject || sec.assignedSubject || (Array.isArray(sec.assignedSubjects) && sec.assignedSubjects[0]) || '').trim().toLowerCase();
                    const k = `${sId}::${sName}::${sSubj}`;
                    if (!seenStudentSecKeys.has(k)) {
                        seenStudentSecKeys.add(k);
                        combinedAdminSections.push(sec);
                    }
                });
            }
        });

        const deployedSections = combinedAdminSections.filter(s => s && s.status !== 'Archived');

        const enrolledSections = deployedSections.filter(sec => {
            if (typeof window.isSectionAssignedToStudent === 'function') {
                return window.isSectionAssignedToStudent(sec, student);
            }
            if (Array.isArray(sec.students) && sec.students.length > 0) {
                const hasStudent = sec.students.some(st => {
                    if (!st) return false;
                    if (typeof st === 'string') {
                        const stLower = st.toLowerCase().trim();
                        return (studentId && stLower.includes(studentId)) ||
                               (studentFullName && stLower.includes(studentFullName)) ||
                               (studentNameRev && stLower.includes(studentNameRev)) ||
                               (studentLastName && stLower.includes(studentLastName));
                    }
                    const stId = String(st.id || st.uid || '').trim();
                    if (stId && studentId && stId === studentId) return true;
                    const stEmail = (st.email || '').toLowerCase().trim();
                    if (stEmail && studentEmail && stEmail === studentEmail) return true;
                    const stName = (st.name || st.fullName || `${st.lastName || ''}, ${st.firstName || ''}`).toLowerCase().trim();
                    if (stName && (
                        stName === studentFullName ||
                        stName === studentNameRev ||
                        stName.includes(studentFullName) ||
                        studentFullName.includes(stName) ||
                        (studentLastName && stName.includes(studentLastName))
                    )) return true;
                    return false;
                });
                if (hasStudent) return true;
            }
            if (studentSection && sec.name && sec.name.toLowerCase().trim() === studentSection) {
                return true;
            }
            return false;
        });

        // Also check classroom cards from classroomData if available
        const classroomCards = (typeof getStudentClassroomCards === 'function') ? getStudentClassroomCards() : [];

        let adminSubjects = [];
        try {
            adminSubjects = loadSharedState(ADMIN_SUBJECTS_STORAGE_KEY, []);
        } catch (e) {}

        const adminLookup = new Map();
        if (Array.isArray(adminSubjects)) {
            adminSubjects.forEach(s => {
                if (s.id) adminLookup.set(String(s.id).toLowerCase(), s);
                if (s.code) adminLookup.set(normalizeSubjectKey(s.code), s);
                if (s.name) adminLookup.set(normalizeSubjectKey(s.name), s);
            });
        }

        const subjectMap = new Map();

        const addAssignedSubject = (subj) => {
            if (!subj) return;
            const name = subj.subject || subj.title || subj.name || subj.text;
            if (!name) return;
            const key = normalizeSubjectKey(name);
            if (!key) return;

            const teacher = subj.teacher || (subj.teachers && subj.teachers[0] ? subj.teachers[0].name : '') || subj.instructor || 'Subject Teacher';
            const type = resolveSubjectType(name, subj);

            if (!subjectMap.has(key)) {
                subjectMap.set(key, {
                    id: subj.id || `subj-${key}`,
                    name: name,
                    teacher: teacher,
                    type: type,
                    q1Percent: subj.q1Percent,
                    q2Percent: subj.q2Percent,
                    q3Percent: subj.q3Percent,
                    q4Percent: subj.q4Percent,
                    q1Topics: subj.q1Topics,
                    q2Topics: subj.q2Topics,
                    q3Topics: subj.q3Topics,
                    q4Topics: subj.q4Topics,
                    topics: subj.topics,
                    raw: subj
                });
            } else {
                const existing = subjectMap.get(key);
                if ((!existing.teacher || existing.teacher === 'Subject Teacher') && teacher && teacher !== 'Subject Teacher') {
                    existing.teacher = teacher;
                }
                if (type && type !== 'Core') {
                    existing.type = type;
                }
            }
        };

        // Add strictly from enrolled sections & classroom cards of the student
        enrolledSections.forEach(sec => {
            addAssignedSubject({
                id: sec.id || `sec-${sec.code || sec.name}`,
                subject: sec.subject || sec.name,
                teacher: sec.teacher || (sec.teachers && sec.teachers[0] ? sec.teachers[0].name : 'Subject Teacher'),
                type: sec.type || sec.category || sec.track,
                q1Percent: sec.q1Percent,
                q2Percent: sec.q2Percent,
                q3Percent: sec.q3Percent,
                q4Percent: sec.q4Percent,
                q1Topics: sec.q1Topics,
                q2Topics: sec.q2Topics,
                q3Topics: sec.q3Topics,
                q4Topics: sec.q4Topics,
                topics: sec.topics,
                strand: sec.strand,
                raw: sec
            });
        });

        classroomCards.forEach(card => {
            addAssignedSubject({
                id: card.id,
                subject: card.subject || card.name,
                teacher: card.teacher,
                type: card.type || card.category,
                raw: card
            });
        });

        const rows = [];
        subjectMap.forEach((subject, key) => {
            const adminMatch = adminLookup.get(key) || adminLookup.get(String(subject.id).toLowerCase());
            const data = adminMatch || subject.raw || subject;

            const calculateTermAverage = (topics) => {
                if (Array.isArray(topics) && topics.length > 0) {
                    const topicAverages = topics
                        .map(getTopicAveragePercent)
                        .filter(value => value !== null && !isNaN(value));

                    if (topicAverages.length > 0) {
                        return clampPercent(topicAverages.reduce((sum, value) => sum + value, 0) / topicAverages.length);
                    }
                }
                return null;
            };

            const term1Val = calculateTermAverage(data.q1Topics || data.topics);
            const term2Val = calculateTermAverage(data.q2Topics);
            const term3Val = calculateTermAverage(data.q3Topics);
            const term4Val = calculateTermAverage(data.q4Topics);

            const validQuarterVals = [term1Val, term2Val, term3Val, term4Val].filter(t => typeof t === 'number');
            const overallVal = validQuarterVals.length > 0 ? clampPercent(validQuarterVals.reduce((sum, t) => sum + t, 0) / validQuarterVals.length) : null;

            const term1 = term1Val !== null ? term1Val : '-';
            const term2 = term2Val !== null ? term2Val : '-';
            const term3 = term3Val !== null ? term3Val : '-';
            const term4 = term4Val !== null ? term4Val : '-';
            const overall = overallVal !== null ? overallVal : '-';

            const allTopics = [
                ...(Array.isArray(data.q1Topics) ? data.q1Topics : (Array.isArray(data.topics) ? data.topics : [])),
                ...(Array.isArray(data.q2Topics) ? data.q2Topics : []),
                ...(Array.isArray(data.q3Topics) ? data.q3Topics : []),
                ...(Array.isArray(data.q4Topics) ? data.q4Topics : [])
            ];
            const completedTopics = allTopics.filter(topic => topic && typeof topic === 'object' && topic.status === 'completed').length;
            const totalTopics = allTopics.length || 1;
            const completion = clampPercent((completedTopics / totalTopics) * 100);

            const remark = typeof overallVal === 'number'
                ? (overallVal >= 90 ? 'Outstanding'
                    : overallVal >= 85 ? 'Very Good'
                        : overallVal >= 80 ? 'Good'
                            : overallVal >= 75 ? 'Passing'
                                : 'At Risk')
                : 'No Grades Yet';

            const finalType = resolveSubjectType(subject.name, subject);

            rows.push({
                id: subject.id,
                subject: subject.name,
                teacher: subject.teacher || 'Subject Teacher',
                track: finalType,
                activeQuarters: Array.isArray(data.activeQuarters) && data.activeQuarters.length ? data.activeQuarters : ['q1', 'q2'],
                term1,
                term2,
                term3,
                term4,
                term1Val,
                term2Val,
                term3Val,
                term4Val,
                overall,
                overallVal,
                completion,
                remark
            });
        });

        return rows;
    }
    function renderGradesAnalytics(rows, filteredSubjectName = '') {
        rows = Array.isArray(rows) ? rows : [];

        const validOverallRows = rows.filter(r => typeof r.overallVal === 'number' && !isNaN(r.overallVal));
        const hasGrades = validOverallRows.length > 0;
        const gwa = hasGrades ? (validOverallRows.reduce((sum, r) => sum + r.overallVal, 0) / validOverallRows.length) : null;

        let subjectCards = '';
        rows.forEach(function (row, index) {
            if (typeof window.renderSharedSubjectPerformanceCardHtml === 'function') {
                subjectCards += window.renderSharedSubjectPerformanceCardHtml({
                    id: row.id,
                    title: row.subject,
                    subtitle: row.track,
                    activeQuarters: row.activeQuarters,
                    openGrades: true,
                    overallScore: row.overallVal,
                    quarterValues: [row.term1Val, row.term2Val, row.term3Val, row.term4Val],
                    strokeColor: '#15803d'
                });
            }
        });

        let aiMessage = rows.length ? 'No grades recorded yet.' : 'No grades to display.';
        if (hasGrades) {
            if (filteredSubjectName) {
                if (gwa >= 90) {
                    aiMessage = `Outstanding academic mastery in ${escapeHtml(filteredSubjectName)}! With a subject average of ${gwa.toFixed(1)}, you are maintaining honors-level competency across all quarters.`;
                } else if (gwa >= 85) {
                    aiMessage = `Very satisfactory academic performance in ${escapeHtml(filteredSubjectName)}! Your average is ${gwa.toFixed(1)}. Keep up the solid participation and consistent submissions.`;
                } else if (gwa >= 75) {
                    aiMessage = `Satisfactory progress in ${escapeHtml(filteredSubjectName)} (Average: ${gwa.toFixed(1)}). Review quarters where scores dipped to reinforce your learning targets.`;
                } else {
                    aiMessage = `Your current standing in ${escapeHtml(filteredSubjectName)} is ${gwa.toFixed(1)}. Work closely with your instructor and submit remedial activities to achieve passing standing.`;
                }
            } else {
                if (gwa >= 90) {
                    aiMessage = `Outstanding academic standing! Your General Weighted Average is ${gwa.toFixed(1)}, demonstrating excellence across your Senior High School subjects. Keep up the high level of consistency and engagement.`;
                } else if (gwa >= 85) {
                    aiMessage = `Very satisfactory academic performance! With a GWA of ${gwa.toFixed(1)}, you are maintaining strong quarterly momentum. Continue focusing on key assessment areas.`;
                } else if (gwa >= 75) {
                    aiMessage = `Satisfactory overall progress (GWA: ${gwa.toFixed(1)}). Review quarters where scores dipped to reinforce your learning targets for upcoming quarters.`;
                } else {
                    aiMessage = `Your current GWA is ${gwa.toFixed(1)}. Work closely with your teachers and access remedial handouts to raise your performance above the 75 passing threshold.`;
                }
            }
        }

        const topTitle = filteredSubjectName ? `${filteredSubjectName} Average` : 'General Weighted Average';

        const topHtml = typeof window.renderSharedAnalyticsTopSectionHtml === 'function'
            ? window.renderSharedAnalyticsTopSectionHtml({
                gwa: gwa,
                title: topTitle,
                aiMessage: aiMessage,
                role: 'student'
            })
            : '';

        return {
            top: topHtml,
            breakdown: `
            <div class="font-['Inter']">
                <div class="flex items-center justify-between flex-wrap gap-3 mb-4 font-['Inter']">
                    <h3 class="text-xl font-bold text-slate-900 font-['Inter']">Performance</h3>
                    <div class="flex items-center gap-2 text-xs font-medium text-black-fade font-['Inter']" style="color: rgba(0, 0, 0, 0.45);">
                        <span class="flex items-center gap-1.5"><div class="w-2 h-2 rounded-full" style="background-color: rgba(0, 0, 0, 0.45);"></div> Q1-Q4 Trend</span>
                    </div>
                </div>
                <div class="student-performance-grid grid gap-4 font-['Inter']">
                    ${subjectCards}
                </div>
            </div>
            `
        };
    }
    let comparingSubjectIds = null;
    let selectingComparisonSubjects = false;
    function renderGradesPage(filterSubject = null) {
        window.renderGradesPage = renderGradesPage;
        const layout = document.getElementById('grades-layout');
        if (!layout) return;
        try {
            const allRows = getSubjectGradeRows() || [];

            let rows = allRows;
            let filterBannerHtml = '';
            let filteredSubjectName = '';
            const activeFilter = filterSubject || window.activeStudentGradeSubjectFilter;

            if (activeFilter) {
                const targetId = String(typeof activeFilter === 'object' ? (activeFilter.id || '') : activeFilter).trim().toLowerCase();
                const targetName = String(typeof activeFilter === 'object' ? (activeFilter.name || '') : activeFilter).trim().toLowerCase();

                const filtered = allRows.filter(r => {
                    const rId = String(r.id || '').trim().toLowerCase();
                    const rSubj = String(r.subject || '').trim().toLowerCase();
                    if (targetId && (rId === targetId || rId.includes(targetId) || targetId.includes(rId))) return true;
                    if (targetName && (rSubj === targetName || rSubj.includes(targetName) || targetName.includes(rSubj))) return true;
                    return false;
                });

                if (filtered.length > 0) {
                    rows = filtered;
                    filteredSubjectName = filtered[0].subject || (typeof activeFilter === 'object' ? activeFilter.name : activeFilter) || 'Subject';
                }
            }

            if (comparingSubjectIds !== null) {
                rows = allRows.filter(r => comparingSubjectIds.has(String(r.id)));
                filteredSubjectName = rows.length === 1 ? rows[0].subject : '';
            }
            const analyticsRows = rows;
            if (selectingComparisonSubjects) rows = allRows;
            filterBannerHtml = `
                <div class="student-performance-filter flex items-center flex-wrap gap-3">
                    <button type="button" id="student-subject-filter-toggle" aria-pressed="${selectingComparisonSubjects}">
                        <i class="fa-solid ${selectingComparisonSubjects ? 'fa-list-check text-green-700' : 'fa-filter'}" aria-hidden="true"></i>
                        <span>Filter by Subject</span>
                    </button>
                    ${selectingComparisonSubjects ? '<button type="button" id="student-subject-filter-reset" class="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-transparent hover:bg-gray-100 text-green-700 cursor-pointer" title="Reset subject filter" aria-label="Reset subject filter"><i class="fa-solid fa-arrow-rotate-left" aria-hidden="true"></i></button>' : ''}
                    ${selectingComparisonSubjects ? `<label class="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" id="student-comparison-all" ${analyticsRows.length === allRows.length ? 'checked' : ''} style="accent-color:#15803d;">All Subjects</label>` : `<span class="text-xs text-black-fade">${analyticsRows.length === allRows.length ? 'All Subjects' : `${analyticsRows.length} Subjects Selected`}</span>`}
                    ${selectingComparisonSubjects ? '<button type="button" id="student-subject-filter-done" class="sigma-btn sigma-btn-sm sigma-btn-primary"><span>Done</span></button>' : ''}
                </div>`;

            gradesCarouselIndex = 0;
            const analytics = renderGradesAnalytics(analyticsRows, filteredSubjectName);

            layout.innerHTML = `
            <div class="space-y-6 sm:space-y-8 font-['Inter']">
                <!-- Analytics Top -->
                ${analytics.top}

                ${filterBannerHtml}

                <div class="student-grades-summary-panel w-full bg-white font-['Inter']">
                    <div class="overflow-x-auto font-['Inter']">
                        <table class="student-grades-summary-table ${window.studentGradesShowQuarters ? 'student-grades-show-quarters' : ''} w-full text-left border-collapse font-['Inter']">
                            <thead class="sticky top-0 bg-[#15803d] z-10 border-b border-[#166534]">
                                <tr class="bg-[#15803d] select-none text-white font-['Inter']">
                                    <th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-left font-['Inter'] w-1/3">Subject</th>
                                    <th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-left font-['Inter']"><div class="student-grades-column-heading"><span>Teacher</span><button type="button" class="student-grades-column-next" title="Show quarterly and final grades" aria-label="Show quarterly and final grades"><i class="fa-solid fa-chevron-right" aria-hidden="true"></i></button></div></th>
                                    <th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter']"><div class="student-grades-quarter-heading"><button type="button" class="student-grades-column-prev" title="Show subjects and teachers" aria-label="Show subjects and teachers"><i class="fa-solid fa-chevron-left" aria-hidden="true"></i></button><span>1st Quarter</span></div></th>
                                    <th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter']">2nd Quarter</th>
                                    <th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter']">3rd Quarter</th>
                                    <th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter']">4th Quarter</th>
                                    <th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter']">Final Grade</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 font-['Inter']">
                                ${rows.map((row, i) => `
                                    <tr class="hover:bg-slate-50/80 transition-colors font-['Inter'] ${i % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}">
                                        <td class="px-4 py-4 align-middle text-left font-['Inter'] border-r border-slate-100">
                                            <div class="flex flex-col items-start">
                                                <div class="flex items-center gap-2.5">
                                                ${selectingComparisonSubjects ? `<input type="checkbox" class="student-comparison-checkbox" data-row-index="${allRows.indexOf(row)}" aria-label="Select ${escapeHtml(row.subject)}" ${analyticsRows.includes(row) ? 'checked' : ''} style="accent-color:#15803d;">` : ''}
                                                ${selectingComparisonSubjects ? `<span class="text-sm font-bold text-black cursor-default font-['Inter'] leading-snug">${escapeHtml(row.subject)}</span>` : `<button type="button" class="grade-subject-link text-left inline-block p-0 bg-transparent border-0 cursor-pointer group" data-subject-id="${row.id}">
                                                    <span class="grade-subject-title text-sm font-bold text-black transition-colors font-['Inter'] leading-snug">${row.subject}</span>
                                                </button>`}
                                                </div>
                                                <span class="text-xs text-black-fade mt-1 font-medium tracking-normal font-['Inter'] cursor-default" style="color: rgba(0, 0, 0, 0.45);">${row.track}</span>
                                            </div>
                                        </td>
                                        <td class="px-4 py-4 align-middle text-left font-['Inter'] border-r border-slate-100">
                                            <div class="flex items-center gap-2.5">
                                                <span class="student-grade-teacher-avatar w-7 h-7 md:w-8 md:h-8 rounded-full bg-slate-100 text-black-fade inline-flex items-center justify-center shrink-0" aria-hidden="true">
                                                    <i class="fa-solid fa-user text-xs md:text-sm"></i>
                                                </span>
                                                <span class="text-xs md:text-sm font-medium text-black font-['Inter'] block leading-normal">${row.teacher}</span>
                                            </div>
                                        </td>
                                        <td class="px-4 py-4 text-center align-middle font-['Inter'] border-r border-slate-100">
                                            ${typeof row.term1Val === 'number'
                                                ? `<span class="text-sm md:text-base font-medium text-slate-900 font-['Inter'] block">${row.term1Val}</span>`
                                                : `<span class="text-sm md:text-base font-medium text-black-fade font-['Inter'] block" style="color: rgba(0, 0, 0, 0.45);">-</span>`}
                                        </td>
                                        <td class="px-4 py-4 text-center align-middle font-['Inter'] border-r border-slate-100">
                                            ${typeof row.term2Val === 'number'
                                                ? `<span class="text-sm md:text-base font-medium text-slate-900 font-['Inter'] block">${row.term2Val}</span>`
                                                : `<span class="text-sm md:text-base font-medium text-black-fade font-['Inter'] block" style="color: rgba(0, 0, 0, 0.45);">-</span>`}
                                        </td>
                                        <td class="px-4 py-4 text-center align-middle font-['Inter'] border-r border-slate-100">
                                            ${typeof row.term3Val === 'number'
                                                ? `<span class="text-sm md:text-base font-medium text-slate-900 font-['Inter'] block">${row.term3Val}</span>`
                                                : `<span class="text-sm md:text-base font-medium text-black-fade font-['Inter'] block" style="color: rgba(0, 0, 0, 0.45);">-</span>`}
                                        </td>
                                        <td class="px-4 py-4 text-center align-middle font-['Inter'] border-r border-slate-100">
                                            ${typeof row.term4Val === 'number'
                                                ? `<span class="text-sm md:text-base font-medium text-slate-900 font-['Inter'] block">${row.term4Val}</span>`
                                                : `<span class="text-sm md:text-base font-medium text-black-fade font-['Inter'] block" style="color: rgba(0, 0, 0, 0.45);">-</span>`}
                                        </td>
                                        <td class="px-4 py-4 text-center align-middle font-['Inter']">
                                            ${typeof row.overallVal === 'number'
                                                ? `<span class="text-sm md:text-base font-medium text-slate-900 font-['Inter'] block">${row.overallVal}</span>`
                                                : `<span class="text-sm md:text-base font-medium text-black-fade font-['Inter'] block" style="color: rgba(0, 0, 0, 0.45);">-</span>`}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Subject Breakdown (Below Table) -->
                <section class="student-performance-section">
                    ${analytics.breakdown}
                </section>
            </div>
            `;



            layout.querySelectorAll('.grade-view-tab').forEach(button => {

                button.addEventListener('click', () => {

                    currentGradesView = button.dataset.gradeView;

                    renderGradesPage();

                });

            });

            const summaryTable = layout.querySelector('.student-grades-summary-table');
            const switchMobileColumns = showQuarters => {
                window.studentGradesShowQuarters = showQuarters;
                summaryTable?.classList.toggle('student-grades-show-quarters', showQuarters);
                if (summaryTable?.parentElement) summaryTable.parentElement.scrollLeft = 0;
                layout.querySelector(showQuarters ? '.student-grades-column-prev' : '.student-grades-column-next')?.focus({ preventScroll: true });
            };
            layout.querySelector('.student-grades-column-next')?.addEventListener('click', () => switchMobileColumns(true));
            layout.querySelector('.student-grades-column-prev')?.addEventListener('click', () => switchMobileColumns(false));



            layout.querySelector('#student-subject-filter-toggle')?.addEventListener('click', () => {
                if (!selectingComparisonSubjects && comparingSubjectIds === null) comparingSubjectIds = new Set(analyticsRows.map(r => String(r.id)));
                selectingComparisonSubjects = !selectingComparisonSubjects;
                renderGradesPage();
            });
            layout.querySelector('#student-subject-filter-done')?.addEventListener('click', () => {
                selectingComparisonSubjects = false;
                renderGradesPage();
                document.getElementById('student-subject-filter-toggle')?.focus({ preventScroll: true });
            });
            layout.querySelector('#student-subject-filter-reset')?.addEventListener('click', () => {
                comparingSubjectIds = new Set(allRows.map(r => String(r.id)));
                window.activeStudentGradeSubjectFilter = null;
                renderGradesPage();
                document.getElementById('student-subject-filter-reset')?.focus({ preventScroll: true });
            });
            layout.querySelector('#student-comparison-all')?.addEventListener('change', event => {
                comparingSubjectIds = new Set(event.target.checked ? allRows.map(r => String(r.id)) : []);
                renderGradesPage();
            });
            layout.querySelectorAll('.student-comparison-checkbox').forEach(checkbox => {
                checkbox.addEventListener('change', () => {
                    comparingSubjectIds ??= new Set(allRows.map(r => String(r.id)));
                    const id = String(allRows[Number(checkbox.dataset.rowIndex)].id);
                    if (checkbox.checked) comparingSubjectIds.add(id); else comparingSubjectIds.delete(id);
                    renderGradesPage();
                });
            });
            layout.querySelectorAll('.grade-subject-link').forEach(button => {

                button.addEventListener('click', event => {

                    event.preventDefault();

                    event.stopPropagation();

                    const row = allRows.find(r => String(r.id) === button.dataset.subjectId);
                    if (!row || selectingComparisonSubjects) return;
                    const classroomId = resolveStudentClassroomId({ id: row.id, name: row.subject });
                    if (classroomId) {
                        window.collapseSidebar?.();
                        showClassroomDetail(classroomId, true, 'room');
                    }

                });

            });
            //   Carousel init  

            const carousel = layout.querySelector('#grade-subject-carousel');
            if (carousel) {
                const track = carousel.querySelector('.grade-carousel-track');
                const dots = carousel.querySelectorAll('.grade-carousel-dot');
                const prevBtn = carousel.querySelector('.grade-carousel-prev');
                const nextBtn = carousel.querySelector('.grade-carousel-next');
                const totalSlides = rows.length;
                function updateCarousel() {

                    track.style.transform = 'translateX(-' + (gradesCarouselIndex * 100) + '%)';

                    dots.forEach(function (dot, i) {
                        if (i === gradesCarouselIndex) {

                            dot.style.background = '#15803d';

                            dot.style.width = '24px';

                            dot.style.borderRadius = '9999px';

                        }
                        else {

                            dot.style.background = '#e2e8f0';

                            dot.style.width = '8px';

                        }

                    });

                    prevBtn.style.opacity = totalSlides <= 1 ? '0.3' : '1';

                    nextBtn.style.opacity = totalSlides <= 1 ? '0.3' : '1';

                }



                prevBtn.addEventListener('click', function () {

                    gradesCarouselIndex = (gradesCarouselIndex - 1 + totalSlides) % totalSlides;

                    updateCarousel();

                });



                nextBtn.addEventListener('click', function () {

                    gradesCarouselIndex = (gradesCarouselIndex + 1) % totalSlides;

                    updateCarousel();

                });



                dots.forEach(function (dot, i) {

                    dot.addEventListener('click', function () {

                        gradesCarouselIndex = i;

                        updateCarousel();

                    });

                });
                // Clamp index in case subject count changed

                if (gradesCarouselIndex >= totalSlides) gradesCarouselIndex = 0;

                updateCarousel();

            }

        }
        catch (error) {

            console.error('Failed to render grades page:', error);

            layout.innerHTML = `

                <div class="bg-white rounded-2xl border border-red-100 shadow-sm p-8">

                    <p class="text-[11px] font-black uppercase tracking-widest text-red-500">Grades</p>

                    <h3 class="text-2xl font-black text-gray-900 mt-2">Grade content could not load.</h3>

                    <p class="text-sm text-gray-500 mt-3">We hit a render error while building this page. The student script has been hardened, so after a refresh this section should recover instead of staying blank.</p>

                </div>

            `;

        }

    }
    //   Calendar Logic (Admin Copy)  

    const dailySchedule = [];
    const upcomingAssessmentItems = [];
    function timeToMinutes(value) {
        if (!value) return 0;
        const [hour, minute] = value.split(':').map(Number);
        return (hour * 60) + minute;
    }
    function getUpcomingClasses(limit = 2) {
        if (typeof getStudentUpcomingSectionClasses === 'function') {
            return getStudentUpcomingSectionClasses(limit) || [];
        }
        return [];
    }
    function normalizeSubjectKey(value) {
        return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
    }

    function getTopicData(subjectId) {
        if (!subjectId) return null;
        const details = typeof subjectDetails !== 'undefined' ? subjectDetails : {};
        const catalog = typeof curriculumTopicCatalog !== 'undefined' ? curriculumTopicCatalog : {};
        const dynamicSubs = typeof dynamicCurriculumSubjects !== 'undefined' ? dynamicCurriculumSubjects : {};

        let data = catalog[subjectId] || dynamicSubs[subjectId] || details[subjectId] || null;

        try {
            const adminSubjects = loadSharedState(ADMIN_SUBJECTS_STORAGE_KEY, []);
            const subject = getTopicSubject(subjectId);
            const targetName = normalizeSubjectKey(subject?.title || subject?.name || subject?.text || data?.text || subjectId);
            const targetCode = normalizeSubjectKey(subjectId.replace(/^card-|^subj-|^gen-/, ''));
            let adminSubj = (typeof window.findMatchingSubject === 'function')
                ? window.findMatchingSubject(adminSubjects, subjectId)
                : null;
            if (!adminSubj) {
                adminSubj = adminSubjects.find(s => {
                    const sName = normalizeSubjectKey(s.name);
                    const sCode = normalizeSubjectKey(s.code);
                    return sName === targetName || (targetName && sName && (targetName.includes(sName) || sName.includes(targetName))) ||
                           (targetCode && sCode && (sCode === targetCode || sCode.replace(/[^a-z0-9]/g, '') === targetCode));
                });
            }
            if (adminSubj && Array.isArray(adminSubj.topics) && adminSubj.topics.length > 0) {
                if (!data) {
                    data = {
                        text: adminSubj.name,
                        subtitle: `${adminSubj.strand || 'Core'} • ${adminSubj.type || 'Subject'}`,
                        instructor: subject?.instructor || 'Faculty Member',
                        icon: subject?.icon || 'fa-solid fa-book-open',
                        bg: adminSubj.bg || 'image/book1.jpg',
                        q1Percent: subject?.q1Percent || 0,
                        q2Percent: subject?.q2Percent || 0,
                        q1Topics: []
                    };
                }
                const isMockTitle = () => false;

                const releaseSection = (typeof window.resolveStudentReleaseSection === 'function')
                    ? window.resolveStudentReleaseSection('')
                    : String(window.currentClassroomSectionName || '').trim();
                let releasedTopicIds = null;
                if (releaseSection && typeof window.getTopicReleaseConfig === 'function') {
                    const relCfg = window.getTopicReleaseConfig(subjectId, releaseSection);
                    if (relCfg && Array.isArray(relCfg.releasedTopicIds)) {
                        releasedTopicIds = new Set(relCfg.releasedTopicIds.map(id => String(id)));
                    }
                }
                const canonSection = (raw) => {
                    const text = String(raw || '').trim();
                    if (!text) return '';
                    const mapped = (typeof window.canonicalizeSectionLookup === 'function')
                        ? window.canonicalizeSectionLookup(text)
                        : text;
                    return String(mapped || text).trim().toLowerCase();
                };
                const stripGrade = (value) => String(value || '').replace(/^grade\s*\d+\s*[-–]?\s*/i, '').trim();
                const mySection = canonSection(releaseSection);
                const sameSection = (raw) => {
                    const value = canonSection(raw);
                    if (!value || !mySection) return false;
                    return value === mySection || stripGrade(value) === stripGrade(mySection);
                };

                data.q1Topics = adminSubj.topics
                    .filter(t => !isFakeSampleTopic(t))
                    .filter(t => {
                        if (typeof t === 'string') return true;
                        const rawRole = t.authorRole || t.role || (t.isAdmin ? 'Admin' : (t.isTeacher ? 'Teacher' : 'Admin'));
                        const authorRole = (typeof window.normalizeSubjectAuthorRole === 'function') ? window.normalizeSubjectAuthorRole(rawRole) : (rawRole === 'Teacher' ? 'Teacher' : 'Admin');
                        const tagged = String(t.section || t.roomSection || '').trim();
                        if (tagged && !sameSection(tagged)) return false;
                        if (authorRole !== 'Teacher') return true;

                        if (releasedTopicIds && mySection) {
                            const tCand = [t.id, t.title, t.title ? t.title.toLowerCase() : ''].filter(Boolean);
                            if (tCand.some(c => releasedTopicIds.has(String(c)))) return true;
                        }

                        if (!tagged && typeof window.topicHasReleasedAssessment === 'function' && window.topicHasReleasedAssessment(subjectId, releaseSection, t)) {
                            return true;
                        }

                        return sameSection(tagged);
                    })
                    .map((t, idx) => {
                        if (typeof t === 'string') {
                            return {
                                id: `topic-${idx + 1}`,
                                title: t,
                                overview: 'Topic overview and learning materials.',
                                image: (window.topicTemplates && window.topicTemplates[idx % window.topicTemplates.length]) || 'image/Topic.jpg',
                                status: 'not-started'
                            };
                        }
                        return {
                            id: t.id || `topic-${idx + 1}`,
                            title: t.title || t.name || `Topic ${idx + 1}`,
                            overview: t.description || t.overview || 'Topic overview and learning materials.',
                            image: t.image || (window.topicTemplates && window.topicTemplates[idx % window.topicTemplates.length]) || 'image/Topic.jpg',
                            status: t.status || 'not-started',
                            ...t
                        };
                    });

                // Also merge custom topics stored under subject keys
                try {
                    const customTopicKeys = [subjectId, cleanCode, `card-${cleanCode}`, adminSubj.code, adminSubj.id].filter(Boolean);
                    const customTopicsList = [];
                    for (const ck of customTopicKeys) {
                        const rawCt = localStorage.getItem(`sigma_custom_topics_${ck}`);
                        if (rawCt) {
                            try {
                                const parsedCt = JSON.parse(rawCt);
                                if (Array.isArray(parsedCt)) {
                                    parsedCt.forEach(pt => {
                                        if (pt && !customTopicsList.some(ex => (ex.id && pt.id && ex.id === pt.id) || (ex.title && pt.title && ex.title.trim().toLowerCase() === pt.title.trim().toLowerCase()))) {
                                            customTopicsList.push(pt);
                                        }
                                    });
                                }
                            } catch (_) {}
                        }
                    }
                    if (customTopicsList.length > 0) {
                        const existingTopicIds = new Set(data.q1Topics.map(t => String(t.id)).filter(Boolean));
                        const existingTitles = new Set(data.q1Topics.map(t => String(t.title || '').trim().toLowerCase()).filter(Boolean));
                        customTopicsList.forEach(ct => {
                            const ctRole = String(ct.authorRole || ct.role || (ct.isTeacher ? 'Teacher' : '')).toLowerCase();
                            const ctSection = String(ct.section || ct.roomSection || '').trim();
                            if (ctSection && !sameSection(ctSection)) return;
                            const ctId = String(ct.id || '');
                            const ctTitle = String(ct.title || '').trim().toLowerCase();
                            if ((!ctId || !existingTopicIds.has(ctId)) && (!ctTitle || !existingTitles.has(ctTitle))) {
                                data.q1Topics.push(ct);
                                if (ctId) existingTopicIds.add(ctId);
                                if (ctTitle) existingTitles.add(ctTitle);
                            }
                        });
                    }
                } catch (e) {}
                if (adminSubj.bg || adminSubj.cover) data.bg = adminSubj.bg || adminSubj.cover;
                return data;
            }
        } catch (e) {}

        if (!data) {
            const subject = getTopicSubject(subjectId);
            if (subject) {
                data = {
                    text: subject.title || subject.name || subject.text || 'Subject Content',
                    subtitle: 'Curriculum Topics',
                    instructor: subject.instructor || 'Faculty Member',
                    icon: subject.icon || 'fa-solid fa-book-open',
                    bg: subject.bg || 'image/book1.jpg',
                    q1Percent: subject.q1Percent || 0,
                    q2Percent: subject.q2Percent || 0,
                    q1Topics: []
                };
                if (typeof dynamicCurriculumSubjects !== 'undefined') {
                    dynamicCurriculumSubjects[subjectId] = data;
                }
            }
        }
        return data || null;
    }
    window.getTopicData = getTopicData;

    function getTopicSubject(subjectId) {
        if (!subjectId) return null;
        const details = typeof subjectDetails !== 'undefined' ? subjectDetails : {};
        const catalog = typeof curriculumTopicCatalog !== 'undefined' ? curriculumTopicCatalog : {};
        const dynamicSubs = typeof dynamicCurriculumSubjects !== 'undefined' ? dynamicCurriculumSubjects : {};
        const programs = typeof curriculumPrograms !== 'undefined' ? curriculumPrograms : {};
        const subjData = typeof subjectsData !== 'undefined' ? subjectsData : {};

        const programSubjects = [];
        Object.values(programs).forEach(p => {
            if (p.subjects) programSubjects.push(...p.subjects);
            if (p.stages) programSubjects.push(...p.stages);
        });
        const exactMatch = programSubjects.find(s => (s.id === subjectId || s.key === subjectId));
        if (exactMatch) return { ...exactMatch, name: exactMatch.title || exactMatch.text || exactMatch.name };

        // Check assigned subjectsData
        const allEnrolled = (subjData.enrolled || []).concat(subjData.completed || []);
        const enrolledMatch = allEnrolled.find(s => s.id === subjectId || s.key === subjectId);
        if (enrolledMatch) return { ...enrolledMatch, name: enrolledMatch.text || enrolledMatch.title || enrolledMatch.name };

        if (catalog[subjectId]) {
            return { id: subjectId, title: catalog[subjectId].text, name: catalog[subjectId].text, ...catalog[subjectId] };
        }
        if (details[subjectId]) {
            const subTitle = details[subjectId].text || details[subjectId].title || details[subjectId].name || 'Subject';
            return { id: subjectId, text: subTitle, title: subTitle, name: subTitle, ...details[subjectId] };
        }
        // Check clusters
        for (const p of Object.values(programs)) {
            if (p.clusters) {
                for (const cluster of p.clusters) {
                    const titleMatch = (cluster.subjects || []).find(t => `gen-${slugify(t)}` === subjectId);
                    if (titleMatch) return ensureSubjectDataForTitle(titleMatch, cluster.title);
                }
            }
        }
        if (dynamicSubs[subjectId]) {
            const dynamicName = dynamicSubs[subjectId].text || dynamicSubs[subjectId].title || dynamicSubs[subjectId].name;
            return { id: subjectId, name: dynamicName, title: dynamicName, ...dynamicSubs[subjectId] };
        }
        return null;
    }
    window.getTopicSubject = getTopicSubject;
    function ensureSubjectDataForTitle(title, clusterTitle) {
        const subjectId = `gen-${slugify(title)}`;
        if (!dynamicCurriculumSubjects[subjectId]) {
            dynamicCurriculumSubjects[subjectId] = {
                id: subjectId,
                text: title,
                subtitle: `${clusterTitle} • Grade 11`,
                instructor: 'Cluster Faculty',
                icon: 'fa-solid fa-book-open',
                bg: 'image/book1.jpg',
                q1Percent: 0,
                q2Percent: 0,
                q3Percent: 0,
                q4Percent: 0,
                summary: `${title} is part of the ${clusterTitle} cluster and introduces the essential ideas, skills, and outputs learners will study in this learning path.`,
                q1Topics: [],
                q2Topics: [],
                q3Topics: [],
                q4Topics: []
            };
        }
        return dynamicCurriculumSubjects[subjectId];
    }
    function slugify(text) {
        return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    }
    function setSubjectsPageScrollLocked(locked) {
        // Standardize: Main scrollbar should always be visible/available
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
    }
    function getInlineAnchor(programKey) {
        return 'left';
    }
    function getElectiveMode() {
        if (currentStudentCurriculumLabel === 'K to 12 Curriculum') return 'k12';
        if (currentStudentCurriculumLabel === 'MATATAG Curriculum') return 'matatag';
        return 'default';
    }
    function buildElectiveTrackSections() {
        const program = curriculumPrograms['applied-subjects'];
        if (!program) return [];
        const mode = getElectiveMode();
        const trackMap = new Map();
        if (mode === 'k12') {
            (program.k12Groups || []).forEach(group => {
                if (!trackMap.has(group.track)) trackMap.set(group.track, []);
                const items = trackMap.get(group.track);
                const sourceClusters = (program.clusters || []).filter(cluster => (group.sourceKeys || []).includes(cluster.key));

                sourceClusters.forEach(cluster => {
                    (cluster.subjects || []).forEach(title => {
                        const subject = ensureSubjectDataForTitle(title, group.title);
                        items.push({
                            kind: 'subject',
                            id: subject.id,
                            title,
                            copy: subject.summary || `${title} is one of the elective subjects under ${group.title}.`,
                            media: subject.bg || group.image || program.image,
                            meta: group.title,
                            aiInsight: subject.summary || `${title} belongs to ${group.title} under ${group.track}.`,
                            progress: 0
                        });
                    });
                });
            });
        }
        else {
            (program.clusters || []).forEach(cluster => {
                if (!trackMap.has(cluster.track)) trackMap.set(cluster.track, []);
                const items = trackMap.get(cluster.track);
                (cluster.subjects || []).forEach(title => {
                    const subject = ensureSubjectDataForTitle(title, cluster.title);
                    items.push({
                        kind: 'subject',
                        id: subject.id,
                        title,
                        copy: subject.summary || `${title} is one of the subjects under ${cluster.title}.`,
                        media: subject.bg || cluster.image || program.image,
                        meta: cluster.title,
                        aiInsight: subject.summary || `${title} belongs to ${cluster.title} under ${cluster.track}.`,
                        progress: 0
                    });
                });
            });
        }
        return Array.from(trackMap.entries()).map(([track, items]) => {
            const seen = new Set();
            return {
                title: track,
                items: items.filter(item => {
                    const key = `${track}:${item.title}`;
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                })
            };
        });
    }
    function buildInlineItems(programKey) {
        const program = curriculumPrograms[programKey];
        if (!program) return [];
        if (program.subjects) {
            return program.subjects.map(item => {
                const subjectData = getTopicData(item.id) || {};
                return {
                    kind: 'subject',
                    id: item.id,
                    title: item.title,
                    copy: subjectData.summary || item.overview,
                    media: item.image,
                    meta: programKey === 'core-subjects' ? '' : (subjectData.subtitle || ''),
                    aiInsight: '',
                    progress: 0
                };
            });
        }
        if (program.clusters) {
            return program.clusters.map(item => ({
                kind: 'cluster',
                key: item.key,
                title: item.title,
                copy: item.overview,
                media: item.image || '',
                meta: `${item.track}   ${item.subjectCount} Subjects`
            }));
        }
        return [];
    }
    function buildTrackClusterSubjectItems(programKey, clusterKey) {
        if (programKey === 'applied-subjects') {
            const k12Group = (curriculumPrograms[programKey]?.k12Groups || []).find(group => group.key === clusterKey);
            if (k12Group) {
                const sourceClusters = (curriculumPrograms[programKey]?.clusters || []).filter(cluster => (k12Group.sourceKeys || []).includes(cluster.key));
                const seen = new Set();
                const titles = [];
                sourceClusters.forEach(cluster => {
                    (cluster.subjects || []).forEach(title => {
                        if (!seen.has(title)) {
                            seen.add(title);
                            titles.push(title);
                        }
                    });
                });
                return titles.map(title => {
                    const subject = ensureSubjectDataForTitle(title, k12Group.title);
                    return {
                        kind: 'subject',
                        id: subject.id,
                        title,
                        copy: subject.summary,
                        media: subject.bg,
                        progress: 0
                    };
                });
            }
        }
        return [];
    }
    function getProgressVisuals(progress) {
        if (progress >= 100) return { color: '#15803d', gradient: 'linear-gradient(to top, #15803d, #166534)' };
        if (progress >= 50) return { color: '#ca8a04', gradient: 'linear-gradient(to top, #ca8a04, #a16207)' };
        return { color: '#b91c1c', gradient: 'linear-gradient(to top, #b91c1c, #991b1b)' };
    }
    function askSigmaAbout(title, insight) {
        openAiPanel();
        addAiMessage(`Tell me about ${title}. ${insight}`, true);
        setSigmaAiWaiting(true);
        setTimeout(() => {
            setSigmaAiWaiting(false);
            addAiMessage(`SIGMA AI analysis for ${title}: This subject is an essential part of your curriculum, focusing on practical skills and foundational knowledge required for your chosen track.`);
        }, 1500);
    }
    function syncInlinePanelBackButtons() {
        // Implementation for syncing back buttons if needed
    }
    function handleInlineCardSelection(programKey, item) {
        if (item.kind === 'subject') {
            switchToTopicPage(item.id);
            return;
        }
        const subject = ensureSubjectDataForTitle(item.title, curriculumPrograms[programKey]?.title || 'Program');
        switchToTopicPage(subject.id);
    }
    function getSubjectDisplayName(subject) {
        if (!subject) return '';
        return subject.text || subject.title || '';
    }
    function getSubjectDisplaySubtitle(subject) {
        if (!subject) return '';
        return subject.subtitle || subject.kicker || '';
    }
    function formatAssessmentDate(date) {
        if (!date) return '<span class="text-black-fade font-normal text-[13px] select-none font-[\'Inter\']" style="color: rgba(0, 0, 0, 0.45) !important;">-</span>';
        const d = (date instanceof Date) ? date : new Date(date);
        if (isNaN(d.getTime())) return date;
        const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        return `${dateStr}<br><span class="text-[10px] text-black-fade font-normal" style="color: rgba(0, 0, 0, 0.45) !important;">${timeStr}</span>`;
    }
    function scrollToSubjectCard(subjectId) {
        const subject = [...(subjectsData.enrolled || []), ...(subjectsData.completed || [])].find(item => item.id === subjectId);
        switchToTopicPage(resolveHomeSubjectTopicSourceId(subjectId, subject?.text));
    }
    function renderCalendarDropdownSummary() {
        const classesWrap = document.getElementById('calendarDropdownUpcomingClassList');
        const assessmentsWrap = document.getElementById('calendarDropdownAssessmentList');
        if (!classesWrap || !assessmentsWrap) return;

        // Removed as per request to hide Next Class, Upcoming Class, and Submissions in dropdown
        classesWrap.innerHTML = '';
        assessmentsWrap.innerHTML = '';
    }
    function initCalendarEvents() {
        const prevMonthBtn = document.getElementById('calendarDropdownPrevMonthBtn');
        const nextMonthBtn = document.getElementById('calendarDropdownNextMonthBtn');
        if (prevMonthBtn) {
            prevMonthBtn.onclick = (e) => {
                e.stopPropagation();
                if (typeof currentCalDate !== 'undefined') currentCalDate.setMonth(currentCalDate.getMonth() - 1);
                if (typeof renderCalendarGrid === 'function') renderCalendarGrid();
            };
        }
        if (nextMonthBtn) {
            nextMonthBtn.onclick = (e) => {
                e.stopPropagation();
                if (typeof currentCalDate !== 'undefined') currentCalDate.setMonth(currentCalDate.getMonth() + 1);
                if (typeof renderCalendarGrid === 'function') renderCalendarGrid();
            };
        }

        if (typeof renderCalendarGrid === 'function') renderCalendarGrid();
        renderCalendarDropdownSummary();
        // Update header calendar icon date
        const dateEl = document.getElementById('calendar-date-number');
        if (dateEl) {
            dateEl.textContent = new Date().getDate();
        }
    }

    const WELCOME_MSG = `Hello, <strong>User!</strong> I'm <span class="font-black">SIGMA</span>, your system AI. What do you need today?`;
    let isDragging = false;
    let startX = 0;
    let startRight = 0;
    let wasDragged = false;
    const sigmaAiTimestampFormatter = new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
    function getSigmaAiTimestamp() {
        return sigmaAiTimestampFormatter.format(new Date());
    }
    function escapeSigmaAiText(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
    function addAiMessage(content, isUser = false) {
        const msg = document.createElement('div');
        if (!isUser && content === WELCOME_MSG) msg.dataset.sigmaGreeting = 'true';
        msg.className = `sigma-ai-message ${isUser ? 'sigma-ai-message--user' : 'sigma-ai-message--assistant'}`;
        const stamp = getSigmaAiTimestamp();
        msg.innerHTML = `
            <div class="sigma-ai-message__meta">${stamp}</div>
            <div class="sigma-ai-message__row">
                ${!isUser ? `<div class="sigma-ai-message__icon"><i class="fa-solid fa-bolt"></i></div>` : ''}
                <div class="sigma-ai-message__bubble ${isUser ? 'sigma-ai-message__bubble--user' : 'sigma-ai-message__bubble--assistant'}">${content}</div>
            </div>
        `;
        if (sigmaAiMessages) {
            sigmaAiMessages.appendChild(msg);
            sigmaAiMessages.scrollTop = sigmaAiMessages.scrollHeight;
        }
        return msg;
    }
    function setSigmaAiWaiting(waiting) {
        sigmaAiWaiting = waiting;
        if (sigmaAiSendBtn) {
            sigmaAiSendBtn.disabled = waiting;
            sigmaAiSendBtn.classList.toggle('is-loading', waiting);
        }
    }
    function updateNotchPosition() {
        if (!sigmaAiNotch || !sigmaAiPanel) return;
        const isMobile = window.innerWidth < 1024;
        const isOpen = sigmaAiPanel.classList.contains('open');
        if (isMobile) {
            sigmaAiNotch.style.right = '0';
        }
        else {
            if (isOpen) {
                sigmaAiNotch.style.right = '400px';
            }
            else {
                sigmaAiNotch.style.right = '0';
            }
        }
    }
    function closeMobilePullUpSurfacesForAi() {
        if (window.innerWidth >= 1024) return;
        document.querySelectorAll('.mobile-pull-up-panel').forEach(panel => panel.classList.remove('open'));
        document.getElementById('mobile-sigma-sheet')?.classList.remove('open');
        document.getElementById('mobile-sigma-sheet-backdrop')?.classList.remove('open');
        window.updateMobileAppBarActiveState?.();
    }
    window.__pushMobileOverlayHistory = window.__pushMobileOverlayHistory || function (kind) {
        if (window.innerWidth >= 1024) return;
        if (history.state?.mobileOverlay === kind) return;
        history.pushState({ ...(history.state || {}), mobileOverlay: kind }, '', window.location.href);
    };
    window.__hasOpenMobileOverlay = window.__hasOpenMobileOverlay || function () {
        return window.innerWidth < 1024 && Boolean(
            document.getElementById('sigmaAiPanel')?.classList.contains('open') ||
            document.getElementById('mobile-sigma-sheet')?.classList.contains('open') ||
            document.querySelector('.mobile-pull-up-panel.open')
        );
    };
    window.__closeOpenMobileOverlay = window.__closeOpenMobileOverlay || function () {
        document.getElementById('sigmaAiPanel')?.classList.remove('open');
        document.getElementById('sigmaAiNotch')?.classList.remove('open');
        document.getElementById('mobile-sigma-sheet')?.classList.remove('open');
        document.querySelectorAll('.mobile-pull-up-panel').forEach(panel => panel.classList.remove('open'));
        document.getElementById('mobile-sigma-sheet-backdrop')?.classList.remove('open');
        window.updateMobileAppBarActiveState?.();
    };
    window.__closeMobileSidebarForOverlay = window.__closeMobileSidebarForOverlay || function () {
        if (window.innerWidth >= 1024) return;
        document.getElementById('sidebar')?.classList.remove('sidebar-visible');
        document.getElementById('sub-sidebar')?.classList.remove('sub-sidebar-visible');
    };
    function openAiPanel() {
        closeMobilePullUpSurfacesForAi();
        window.__closeMobileSidebarForOverlay?.();
        window.__pushMobileOverlayHistory?.('sigma-ai');
        if (typeof window.hideHeaderOverlays === 'function') {
            window.hideHeaderOverlays(sigmaAiPanel, document.getElementById('sigma-toggle'));
        }
        if (sigmaAiPanel) sigmaAiPanel.classList.remove('hidden');
        document.getElementById('sigma-toggle')?.classList.add('active');
        const input = document.getElementById('sigmaAiInput');
        if (input) setTimeout(() => input.focus(), 50);
        sessionStorage.setItem('sigmaPanelOpen', 'true');
    }
    function closeAiPanel() {
        if (sigmaAiPanel) sigmaAiPanel.classList.add('hidden');
        document.getElementById('sigma-toggle')?.classList.remove('active');
        sessionStorage.setItem('sigmaPanelOpen', 'false');
    }
    function hideHeaderOverlays(exceptMenu = null, exceptButton = null, keepAiOpen = false) {
        if (typeof window.hideHeaderOverlays === 'function') {
            window.hideHeaderOverlays(exceptMenu, exceptButton);
            return;
        }
        document.querySelectorAll('.header-panel, #sigmaAiPanel').forEach(panel => {
            if (panel !== exceptMenu) panel.classList.add('hidden');
        });

        [calendarToggle, notiToggle, profileDropdownBtn, document.getElementById('sigma-toggle')].forEach(button => {
            if (button && button !== exceptButton) button.classList.remove('active');
        });
        if (!keepAiOpen) {
            closeAiPanel();
        }
    }
    document.querySelectorAll('.sigma-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            addAiMessage(chip.textContent.trim(), true);
            setTimeout(() => addAiMessage('Full AI integration coming soon!', false), 600);
        });
    });

    function sendAiMessage() {
        if (sigmaAiWaiting) return;
        const v = sigmaAiInput?.value.trim();
        if (!v) return;
        addAiMessage(v, true);
        sigmaAiInput.value = '';
        setSigmaAiWaiting(true);
        setTimeout(() => {
            addAiMessage('Wireframe mode — Gemini AI coming next semester.', false);
            setSigmaAiWaiting(false);
        }, 600);
    }
    if (sigmaAiSendBtn) sigmaAiSendBtn.addEventListener('click', sendAiMessage);
    if (sigmaAiCloseBtn) sigmaAiCloseBtn.addEventListener('click', closeAiPanel);
    if (sigmaAiInput) {
        sigmaAiInput.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendAiMessage();
            }
        });
    }
    const isFirstVisit = sessionStorage.getItem('sigmaFirstVisit') !== 'true';
    const panelWasOpen = sessionStorage.getItem('sigmaPanelOpen') === 'true';
    if (isFirstVisit) {

        sessionStorage.setItem('sigmaFirstVisit', 'true');

        setTimeout(() => {

            addAiMessage(WELCOME_MSG, false);

        }, 900);

    }
    else {

        addAiMessage(WELCOME_MSG, false);

    }
    // Ensure all header overlays are hidden on load

    hideHeaderOverlays(null, null, false);
    // if (panelWasOpen) openAiPanel();
    //   Sub-Sidebar (Subjects list)  

    function resetCompactSubSidebar(content, title, header) {
        if (!content) return;
        if (title) title.innerHTML = '';
        if (header) header.classList.add('hidden');

        content.style.paddingTop = '8px';

        content.innerHTML = '';

    }
    function updateSubSidebar(tabId) {
        const content = document.getElementById('sub-sidebar-content');
        const title = document.getElementById('sub-sidebar-title');
        const header = document.getElementById('sub-sidebar-header');
        if (!content) return;
        // Hide header on subjects list   no redundancy

        if (header) header.classList.add('hidden');

        content.innerHTML = '';

    }
    function renderCurriculumSidebar(programKey) {
        const content = document.getElementById('sub-sidebar-content');
        const title = document.getElementById('sub-sidebar-title');
        const header = document.getElementById('sub-sidebar-header');
        if (!content) return;
        // Hide header and reset content

        if (header) header.classList.add('hidden');

        content.style.paddingTop = '';

        content.innerHTML = '';
        // Set the title to "Subjects"

        if (title) {

            title.innerHTML = 'Subjects';

        }
        // Create subjects list with only Core Subjects

        const subjectsContainer = document.createElement('div');

        subjectsContainer.className = 'px-2 pb-3 space-y-1';
        // Core Subjects section only

        const coreSection = document.createElement('div');

        coreSection.className = 'mb-3';

        coreSection.innerHTML = `

            <div class="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Core Subjects</div>

        `;



        subjectsContainer.appendChild(coreSection);
        // No click handlers needed - headers are display only



        content.appendChild(subjectsContainer);

    }
    function openCurriculumProgram(programKey, pushState = true) {
        const program = curriculumPrograms[programKey];
        if (!program) return;
        // Keep elective subjects inside the existing panel flow (no separate curriculum page).

        if (programKey === 'applied-subjects') {

            _applyTab('nav-courses');
            // openInlineProgramFocus removed

            return;

        }
        if (programKey === 'specialized-subjects') {

            _applyTab('nav-courses');
            // openInlineProgramFocus removed

            return;

        }



        currentCurriculumProgram = programKey;

        currentCurriculumCluster = null;

        setSubjectsPanelsMode(false);

        setCurriculumMode(true);
        if (pushState) history.pushState({ page: `curriculum:${programKey}` }, '', `#${programKey}`);



        hideAllSections();

        showSection('section-curriculum-page');

        navLinks.forEach(l => l.classList.remove('bg-white/20'));
        document.getElementById('nav-courses')?.classList.add('bg-white/20');

        setNavContext(program.title);



        _hideSubSidebarInstant();

        updateLayout();

        renderCurriculumPage(programKey);
        window.scrollTo({ top: 0, behavior: 'smooth' });

    }
    window.openCurriculumProgram = openCurriculumProgram;
    function openCurriculumCluster(programKey, clusterKey, pushState = true) {
        const program = curriculumPrograms[programKey];
        const cluster = (program?.clusters || []).find(c => c.key === clusterKey) || (program?.stages || []).find(s => s.key === clusterKey);
        if (!program || !cluster) return;
        // Keep elective clusters inside the existing panel flow (no separate curriculum page).

        if (programKey === 'applied-subjects' || programKey === 'specialized-subjects') {

            _applyTab('nav-courses');
            // openInlineProgramFocus removed

            currentCurriculumCluster = clusterKey;
            // renderSubjectsInlineDetail removed

            syncInlinePanelBackButtons();
            if (pushState) {

                history.pushState({ page: `inline-cluster:${programKey}:${clusterKey}` }, '', `#subjects-${programKey}-${clusterKey}`);

            }
            return;

        }



        currentCurriculumProgram = programKey;

        currentCurriculumCluster = clusterKey;

        setSubjectsPanelsMode(false);

        setCurriculumMode(true);
        if (pushState) history.pushState({ page: `cluster:${programKey}:${clusterKey}` }, '', `#${programKey}-${clusterKey}`);



        hideAllSections();

        showSection('section-curriculum-page');

        navLinks.forEach(l => l.classList.remove('bg-white/20'));
        document.getElementById('nav-courses')?.classList.add('bg-white/20');

        setNavContext(cluster.title);



        _hideSubSidebarInstant();

        updateLayout();

        renderCurriculumPage(programKey, clusterKey);
        window.scrollTo({ top: 0, behavior: 'smooth' });

    }
    window.openCurriculumCluster = openCurriculumCluster;
    function renderCurriculumPage(programKey, clusterKey = null) {
        const shell = document.getElementById('curriculum-page-shell');
        const program = curriculumPrograms[programKey];
        if (!shell || !program) return;
        const currentCluster = clusterKey

            ? (program.clusters || program.stages || []).find(c => c.key === clusterKey)

            : null;
        const isSubjectPage = !!currentCluster || !!program.subjects;
        const items = currentCluster

            ? (currentCluster.subjects || currentCluster.requirements || []).map(item => typeof item === 'string' ? item : item.title)

            : (program.subjects || program.clusters || program.stages || []);
        const pageTitle = currentCluster ? currentCluster.title : program.title;
        const pageKicker = currentCluster ? (programKey === 'specialized-subjects' ? 'Stage Requirements' : 'Cluster Overview') : program.kicker;
        const pageOverview = currentCluster ? currentCluster.overview : program.overview;
        const image = currentCluster ? currentCluster.image : program.image;
        const hideHeroImage = !currentCluster && programKey === 'core-subjects';
        const cardHtml = currentCluster

            ? items.map((label, index) => `

                <article class="curriculum-subject-card" data-subject-title="${label}" data-cluster-title="${currentCluster.title}">

                    <h4 class="curriculum-subject-title">${label}</h4>

                    <p class="curriculum-subject-text">${programKey === 'specialized-subjects' ? 'Requirement ' + (index + 1) + ' for this stage.' : buildCurriculumCardText(programKey, label)}</p>

                </article>

            `).join('')

            : program.subjects

                ? items.map(item => {
                    const progress = Math.floor(Math.random() * 80) + 10;
                    return `

                    <article class="curriculum-subject-card curriculum-core-card horizontal-panel" data-subject-id="${item.id}">

                        <img src="${item.image}" alt="${item.title}" class="curriculum-cluster-image">

                        <div class="subject-info-col">

                            <h4 class="curriculum-subject-title">${item.title}</h4>

                            <p class="curriculum-subject-text">${item.overview}</p>

                        </div>

                        <div class="subject-progress-bar">

                            <div class="subject-progress-fill" style="width:${progress}%"></div>

                        </div>

                    </article>

                `;

                }).join('')

                : items.map(item => `

                    <article class="curriculum-subject-card curriculum-cluster-card curriculum-track-card" data-cluster-key="${item.key}">

                        <h4 class="curriculum-subject-title">${item.title}</h4>

                        <p class="curriculum-subject-text">${item.overview}</p>

                        <p class="text-[10px] font-black uppercase tracking-widest text-green-700 mt-auto">${programKey === 'specialized-subjects' ? 'Open Stage' : `${item.subjectCount} Subjects`}</p>

                    </article>

                `).join('');



        shell.innerHTML = `

            <div class="flex flex-col">

                <div class="curriculum-hero ${hideHeroImage ? 'curriculum-hero--no-image' : ''}">

                    ${hideHeroImage ? '' : `<img src="${image}" alt="${pageTitle}" class="curriculum-hero-image">`}

                    <div class="curriculum-hero-copy">

                        <h2 class="curriculum-hero-title">${pageTitle}</h2>

                    </div>

                </div>

                <div class="curriculum-subject-grid ${program.subjects ? 'core-horizontal-list' : ''} ${isSubjectPage && !program.subjects ? 'curriculum-subject-grid--list' : ''}">

                    ${cardHtml}

                </div>

            </div>

        `;
        if (currentCluster) {

            shell.querySelectorAll('.curriculum-subject-card[data-subject-title]').forEach(card => {

                card.addEventListener('click', () => {
                    const subject = ensureSubjectDataForTitle(card.dataset.subjectTitle, currentCluster.title);

                    switchToTopicPage(subject.id, subject.text);

                });

            });

        }
        else if (program.subjects) {

            shell.querySelectorAll('.curriculum-core-card[data-subject-id]').forEach(card => {

                card.addEventListener('click', () => switchToTopicPage(card.dataset.subjectId));

            });

        }
        else {

            shell.querySelectorAll('.curriculum-cluster-card[data-cluster-key]').forEach(card => {

                card.addEventListener('click', () => openCurriculumCluster(programKey, card.dataset.clusterKey));

            });

        }

    }
    window.addEventListener('resize', () => {
        const subjectsVisible = !document.getElementById('section-courses')?.classList.contains('hidden') && !currentCurriculumProgram;

        setSubjectsPanelsMode(subjectsVisible);

    });
    function buildCurriculumCardText(programKey, label) {
        const copy = {

            'core-subjects': {

                'Effective Communication': 'Focuses on communication models, speech contexts, speech acts, and writing and delivering effective speeches.',

                'Life and Career Skills': 'Covers self-assessment, career pathways, work readiness, financial literacy, and practical career planning.',

                'General Mathematics': 'Builds real-life math skills through functions, interest, loans, business math, and logic.',

                'General Science': 'Introduces earth systems, life processes, matter, energy, and scientific reasoning for everyday use.',

                'Pag-aaral ng Kasaysayan at Lipunang Pilipino': 'Explores Philippine society, governance, citizenship, history, and social change in local context.'

            }[label] || `This subject gives students a readable overview of the core learning area and the topics they will study across the shared curriculum foundation.`,

            'applied-subjects': `${label} is part of the applied pathway and may belong to either the Academic Track or the TechPro Track depending on the learner's assigned cluster and curriculum setup.`,

            'specialized-subjects': `${label} represents a staged work experience where students prepare, perform, and reflect on workplace-style tasks and outputs.`

        };
        return copy[programKey];

    }















    // Nav items scroll to topic card in main content

    //   Subject Details  

    const subjectDetails = {
        'card-oralcomm': { bg: 'image/book1.jpg', q1Percent: 0, q2Percent: 0, q1Topics: [] },
        'card-genmath': { bg: 'image/book2.jpg', q1Percent: 0, q2Percent: 0, q1Topics: [] },
        'card-earthsci': { bg: 'image/book6.jpg', q1Percent: 0, q2Percent: 0, q1Topics: [] },
        'card-prog1': { bg: 'image/book1.jpg', q1Percent: 0, q2Percent: 0, q1Topics: [] },
        'card-webdev': { bg: 'image/book4.jpg', q1Percent: 0, q2Percent: 0, q1Topics: [] },
        'card-database': { bg: 'image/book2.jpg', q1Percent: 0, q2Percent: 0, q1Topics: [] },
        'card-empowerment': { bg: 'image/book3.jpg', q1Percent: 0, q2Percent: 0, q1Topics: [] },
        'card-stats': { bg: 'image/book5.jpg', q1Percent: 0, q2Percent: 0, q1Topics: [] },
        'default-subject-placeholder': {
            text: 'Subject',
            subtitle: 'SHS Strand / Subject',
            instructor: 'Faculty Member',
            icon: 'fa-solid fa-book-open',
            bg: 'image/book6.jpg',
            q1Percent: 0,
            q2Percent: 0,
            summary: 'Course curriculum topics and competencies.',
            q1Topics: []
        }
    };
    //   Topic Page  

    function switchToTopicPage(subjectId, activeTopicIdx = null, pushHistory = true) {
        const resolvedTopicIdx = Number.isInteger(activeTopicIdx)
            ? activeTopicIdx
            : (_tcSubjectId === subjectId && Number.isInteger(_tcTopicIdx) ? _tcTopicIdx : 0);
        _tcSubjectId = subjectId;
        _tcTopicIdx = resolvedTopicIdx;

        if (activeStudentClassroomId) {
            try {
                sessionStorage.setItem('sigma-last-active-classroom', activeStudentClassroomId);
            } catch (e) {}
        }

        navLinks.forEach(link => link.classList.remove('active'));
        document.getElementById('nav-courses')?.classList.add('active');

        if (typeof window.setSubjectHeaderTitle === 'function') {
            window.setSubjectHeaderTitle(subjectId);
        }

        if (pushHistory) {
            const currentHash = window.location.hash || '';
            if (currentHash !== '#topic:' + subjectId && currentHash !== '#topic-' + subjectId) {
                const nextHash = `#topic:${subjectId}`;
                const historyState = { page: `topic:${subjectId}`, topicIdx: resolvedTopicIdx };
                if (window.studentHistoryScreenKey && window.studentHistoryScreenKey(currentHash) === window.studentHistoryScreenKey(nextHash)) {
                    history.replaceState(historyState, '', nextHash);
                } else {
                    history.pushState(historyState, '', nextHash);
                }
            }
            window.noteStudentHistoryScreen?.();
        }
        try {
            sessionStorage.setItem('sigma-student-nav-state', JSON.stringify({
                type: 'topic',
                page: `topic:${subjectId}`,
                subjectId,
                topicIdx: resolvedTopicIdx,
                hash: `#topic:${subjectId}`
            }));
        } catch (e) {}
        window._studentSubmissionMode = false;
        window._studentViewSubmissionMode = false;
        window._sharedViewSubmissionMode = false;
        window._tcAssessmentDetailIdx = null;
        window._scAssessmentDetailIdx = null;
        window._activeMaterialTitle = null;
        window._activeSubmissionAttemptPage = {};

        if (window.setStudentActiveSubject) window.setStudentActiveSubject(subjectId);

        _buildAndShowTopicPage(subjectId);
        window.sigmaResetScrollToTop ? window.sigmaResetScrollToTop() : window.scrollTo(0, 0);
    }
    window.switchToTopicPage = switchToTopicPage;

    function resolveStudentTopicSubjectId(cardId, subjectName) {
        const cleanSubject = String(subjectName || '').trim().toLowerCase();
        const cleanId = String(cardId || '').trim().toLowerCase();
        const aliases = {
            'card-prog1': 'card-prog1',
            'card prog1': 'card-prog1',
            'prog1': 'card-prog1',
            'prog-1': 'card-prog1',
            'prog 1': 'card-prog1',
            'card-webdev': 'card-webdev',
            'card webdev': 'card-webdev',
            'webdev': 'card-webdev',
            'card-database': 'card-database',
            'card database': 'card-database',
            'database': 'card-database',
            'card-stats': 'card-stats',
            'card stats': 'card-stats',
            'stats': 'card-stats',
            'card-empowerment': 'card-empowerment',
            'card empowerment': 'card-empowerment',
            'card-emptech': 'card-empowerment',
            'card-blank-1': 'card-empowerment',
            'card-genmath': 'card-genmath',
            'card genmath': 'card-genmath',
            'genmath': 'card-genmath',
            'card-blank-2': 'card-genmath',
            'card-oralcomm': 'card-oralcomm',
            'card oralcomm': 'card-oralcomm',
            'oralcomm': 'card-oralcomm',
            'card-blank-3': 'card-oralcomm',
            'card-earthsci': 'card-earthsci',
            'card earthsci': 'card-earthsci',
            'earthsci': 'card-earthsci',
            'card-blank-4': 'card-earthsci',
            'abm-fabm1': 'abm-fabm1',
            'abm-busmath': 'abm-busmath',
            'humss-creative-writing': 'humss-creative-writing',
            'humss-politics': 'humss-politics',
            'gas-economics': 'gas-economics',
            'gas-drrr': 'gas-drrr',
            'he-cookery': 'he-cookery',
            'he-bread-pastry': 'he-bread-pastry',
            'applied-eapp': 'applied-eapp',
            'applied-research1': 'applied-research1',
            'applied-entrepreneurship': 'applied-entrepreneurship',
            'core-history-society': 'core-history-society'
        };
        if (aliases[cardId]) return aliases[cardId];
        if (aliases[cleanId]) return aliases[cleanId];
        if (cardId && (curriculumTopicCatalog[cardId] || subjectDetails?.[cardId])) return cardId;
        if (cleanSubject.includes('programming') || cleanSubject.includes('prog1') || cleanSubject.includes('prog 1')) return 'card-prog1';
        if (cleanSubject.includes('web dev')) return 'card-webdev';
        if (cleanSubject.includes('database')) return 'card-database';
        if (cleanSubject.includes('empowerment')) return 'card-empowerment';
        if (cleanSubject.includes('statistic') || cleanSubject.includes('probab')) return 'card-stats';
        if (cleanSubject.includes('genmath') || (cleanSubject.includes('general') && cleanSubject.includes('math'))) return 'card-genmath';
        if (cleanSubject.includes('oral') || cleanSubject.includes('communicat')) return 'card-oralcomm';
        if (cleanSubject.includes('earth') || cleanSubject.includes('life') || cleanSubject.includes('science')) return 'card-earthsci';
        if (cleanSubject.includes('fabm') || cleanSubject.includes('accountancy') || cleanSubject.includes('fundamentals of abm')) return 'abm-fabm1';
        if (cleanSubject.includes('business math')) return 'abm-busmath';
        if (cleanSubject.includes('creative writing')) return 'humss-creative-writing';
        if (cleanSubject.includes('politics') || cleanSubject.includes('governance')) return 'humss-politics';
        if (cleanSubject.includes('applied econ') || cleanSubject.includes('economics')) return 'gas-economics';
        if (cleanSubject.includes('disaster') || cleanSubject.includes('risk') || cleanSubject.includes('drrr')) return 'gas-drrr';
        if (cleanSubject.includes('cookery')) return 'he-cookery';
        if (cleanSubject.includes('bread') || cleanSubject.includes('pastry')) return 'he-bread-pastry';
        if (cleanSubject.includes('eapp') || cleanSubject.includes('academic and professional')) return 'applied-eapp';
        if (cleanSubject.includes('research')) return 'applied-research1';
        if (cleanSubject.includes('entrepreneur')) return 'applied-entrepreneurship';
        if (cleanSubject.includes('culture') || cleanSubject.includes('society') || cleanSubject.includes('politics')) return 'core-history-society';
        return cardId || 'card-prog1';
    }
    window.resolveStudentTopicSubjectId = resolveStudentTopicSubjectId;

    window.openStudentTopicPage = function(cardId, subjectName) {
        const topicId = resolveStudentTopicSubjectId(cardId, subjectName);
        if (typeof switchToTopicPage === 'function') {
            switchToTopicPage(topicId);
        }
    };

    function _buildAndShowTopicPage(subjectId) {
        const data = getTopicData(subjectId) || { q1Topics: [] };
        const subject = getTopicSubject(subjectId) || { name: 'Subject', title: 'Subject' };

        const statusIconClass = {
            completed: 'fa-check-circle text-green-500',
            'in-progress': 'fa-circle-half-stroke text-yellow-500',
            'not-started': 'fa-circle text-gray-300',
            locked: 'fa-lock text-gray-300'
        };

        if (typeof window.setSubjectHeaderTitle === 'function') {
            window.setSubjectHeaderTitle(subject);
        } else {
            const navContextText = document.getElementById('nav-context-text');
            if (navContextText) {
                const subjectName = subject?.name || subject?.title || 'Topics';
                navContextText.className = 'admin-topbar__brand-label text-black';
                navContextText.textContent = subjectName;
            }
        }
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.classList.remove('pt-3', 'px-4', 'pb-4');
            mainContent.classList.add('p-0');
        }

        buildTopicPage(subjectId, subject, data, statusIconClass);
        setSubjectsPanelsMode(false);
        setCurriculumMode(true);
        hideAllSections();
        showSection('section-topic-detail');

        navLinks.forEach(l => l.classList.remove('bg-white/20'));

        _hideSubSidebarInstant();
        updateLayout();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }


    function _buildProgressRail(data) {
        return '';
    }

    function buildTopicPage(subjectId, subject, data, statusIconClass) {
        const page = document.getElementById('section-topic-detail');
        if (!page) return;
        if (typeof window.buildSharedTopicPage === 'function') {
            window.buildSharedTopicPage(page, subjectId, subject, data, statusIconClass, false);
        }
    }

    function refreshStudentTopicUIIfVisible(subjId) {
        const subjectId = subjId || _tcSubjectId || (typeof _activeSubjectId !== 'undefined' ? _activeSubjectId : '') || 'card-prog1';
        if (!subjectId) return;

        const topicContentVisible = !document.getElementById('section-topic-content')?.classList.contains('hidden');
        const topicDetailVisible = !document.getElementById('section-topic-detail')?.classList.contains('hidden');
        const roomTopics = document.getElementById('detail-section-topics');
        const roomMount = document.getElementById('room-topics-mount');
        if (roomMount && roomTopics && !roomTopics.classList.contains('hidden') && typeof window.renderRoomTopicsPanel === 'function') {
            window.renderRoomTopicsPanel();
        }

        if (topicContentVisible) {
            if (typeof _renderTopicContentMain === 'function') {
                _renderTopicContentMain(subjectId, (_tcTopicIdx !== undefined && _tcTopicIdx !== null) ? _tcTopicIdx : 0, _tcTab || 'videos');
            }
        } else if (topicDetailVisible) {
            const data = (typeof getTopicData === 'function') ? getTopicData(subjectId) : null;
            const subject = (typeof getTopicSubject === 'function') ? getTopicSubject(subjectId) : null;
            const finalSubject = subject || { id: subjectId, name: data?.text || data?.title || 'Subject' };
            if (data) {
                const statusIconClass = {
                    completed: 'fa-check-circle text-green-500',
                    'in-progress': 'fa-circle-half-stroke text-yellow-500',
                    'not-started': 'fa-circle text-gray-300'
                };
                buildTopicPage(subjectId, finalSubject, data, statusIconClass);
            }
        }
    }
    window.refreshStudentTopicUIIfVisible = refreshStudentTopicUIIfVisible;

    //   Topic Content System  

    _tcSubjectId = _tcSubjectId || null;

    const topicVideos = {};

        function showUnavailableStudentMaterial(subjectId) {
            hideAllSections();
            showSection('section-topic-content');
            const page = document.getElementById('section-topic-content');
            if (!page) return;
            page.innerHTML = `<section class="bg-white p-6 sm:p-8">
                <i class="fa-solid fa-lock text-xl text-black-fade" aria-hidden="true"></i>
                <h2 class="text-lg font-bold mt-4">This content is currently unavailable</h2>
                <p class="material-detail-body-text">Your teacher may have unpublished this content or changed its availability for your class. Return to your room to see the topics and materials you can access.</p>
                <button type="button" class="sigma-btn sigma-btn-md sigma-btn-primary mt-5"><i class="fa-solid fa-arrow-left" aria-hidden="true"></i><span>Back to Room</span></button>
            </section>`;
            page.querySelector('button').onclick = () => {
                activeStudentClassroomId = '';
                sessionStorage.removeItem('sigma-last-active-classroom');
                window.returnToStudentRoomFromTopic(subjectId);
            };
            window.scrollTo({ top: 0 });
        }

    function getAccessibleStudentTopicAssessments(subjectId, topicIdx, topic, section) {
        const defaults = ['assignments', 'quiz', 'activity', 'performance']
            .flatMap(key => Array.isArray(topic?.[key]) ? topic[key] : []);
        const unified = typeof window.getUnifiedTopicAssessments === 'function'
            ? window.getUnifiedTopicAssessments('assessments', subjectId, topicIdx, defaults, section, topic)
            : defaults;
        return (Array.isArray(unified) ? unified : []).filter((item, index) => {
            const releaseIndex = Number(item.itemIdx ?? item.unifiedIdx ?? index);
            const status = window.getStudentAssessmentReleaseStatus?.(subjectId, item, topicIdx, releaseIndex, 'assessments', section);
            return !status || (!status.isLocked && !status.isHidden && !status.isUnreleased);
        });
    }

        window.openTopicContent = function (subjectId, topicIdx, tab = 'videos', videoIdx = null, _fromCard = false, options = null) {
        const pickedSection = options && (options.selectedSection || options.section);
        if (pickedSection && typeof window.rememberStudentTopicSection === 'function') {
            window.rememberStudentTopicSection(pickedSection, subjectId);
        } else if (typeof window.restoreStudentTopicSection === 'function') {
            window.restoreStudentTopicSection(subjectId);
        }
        const data = getTopicData(subjectId);
        const subject = getTopicSubject(subjectId);
        if (!data || !subject) return;

        const qKey = window.currentSelectedTopicQuarter || 'q1';
        const rawIdx = parseInt(topicIdx, 10);
        const validIdx = (!isNaN(rawIdx) && rawIdx >= 0) ? rawIdx : 0;
        const topic = (data?.[qKey + 'Topics'] && data[qKey + 'Topics'][validIdx])
            || (data?.q1Topics && data.q1Topics[validIdx])
            || (data?.topics && data.topics[validIdx])
            || (Array.isArray(data?.[qKey + 'Topics']) && data[qKey + 'Topics'].length > 0 ? data[qKey + 'Topics'][0] : null)
            || (Array.isArray(data?.q1Topics) && data.q1Topics.length > 0 ? data.q1Topics[0] : null)
            || (Array.isArray(data?.topics) && data.topics.length > 0 ? data.topics[0] : null);
        if (!topic) return;

        // Guard against opening locked/unreleased topics for students
        if (typeof window.getStudentTopicReleaseStatus === 'function') {
            const releaseStatus = window.getStudentTopicReleaseStatus(subjectId, topic, topicIdx);
            if (releaseStatus.isLocked) {
                showUnavailableStudentMaterial(subjectId);
                return;
                const formattedDate = releaseStatus.releaseDate ? new Date(releaseStatus.releaseDate).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
                const lockMsg = releaseStatus.reason === 'scheduled' && formattedDate
                    ? `Available on ${formattedDate}`
                    : 'Unreleased by Teacher';
                if (typeof window.showSigmaDialog === 'function') {
                    window.showSigmaDialog({
                        title: 'Topic Locked',
                        desc: `This topic module has not been released yet for your section. ${lockMsg}.`,
                        confirmText: 'Got it',
                        cancelText: null
                    });
                }
                return;
            }
        }

        // If tab is an assessment category, normalize to unified 'assessments' tab
        const assessmentTabs = ['assignments', 'quiz', 'activity', 'performance', 'assessments'];
        if (assessmentTabs.includes(tab)) {
            const openSection = (typeof window.resolveStudentAssessmentSection === 'function')
                ? window.resolveStudentAssessmentSection(subjectId, topic, '')
                : (window.resolveStudentReleaseSection?.('') || '');

            if (videoIdx !== null && videoIdx !== undefined && tab !== 'assessments') {
                const subArray = Array.isArray(topic?.[tab]) ? topic[tab] : [];
                const targetItem = subArray[videoIdx];
                if (targetItem) {
                    const cleanTargetTitle = String(targetItem.title || targetItem.name || '').trim().toLowerCase();
                    const targetId = String(targetItem.id || '');
                    const accessible = getAccessibleStudentTopicAssessments(subjectId, topicIdx, topic, openSection);
                    const foundUnifiedIdx = accessible.findIndex(a => {
                        if (targetId && String(a.id || '') === targetId) return true;
                        const aTitle = String(a.title || a.name || '').trim().toLowerCase();
                        return cleanTargetTitle && aTitle === cleanTargetTitle;
                    });
                    if (foundUnifiedIdx !== -1) {
                        videoIdx = foundUnifiedIdx;
                    } else {
                        showUnavailableStudentMaterial(subjectId);
                        return;
                    }
                } else {
                    showUnavailableStudentMaterial(subjectId);
                    return;
                }
            }
            tab = 'assessments';
        }

        _tcSubjectId = subjectId;
        _tcTopicIdx = topicIdx;
        _tcTab = tab;
        _tcVideoIdx = videoIdx;
        window._scAssessmentDetailIdx = videoIdx;
        window._tcAssessmentDetailIdx = videoIdx; // Support both naming conventions for parity
        const isSubMode = (options && Object.prototype.hasOwnProperty.call(options, 'viewSubmission'))
            ? Boolean(options.viewSubmission)
            : Boolean(typeof window.location !== 'undefined' && window.location.hash && window.location.hash.includes(':submission'));
        window._studentSubmissionMode = false;
        window._studentViewSubmissionMode = isSubMode;
        window._sharedViewSubmissionMode = isSubMode;
        if (videoIdx === null || videoIdx === undefined) {
            window._activeMaterialTitle = null;
            window._activeSubmissionAttemptPage = {};
        }

        const subSuffix = isSubMode ? ':submission' : '';
        const pageId = videoIdx === null || videoIdx === undefined
            ? `topic-content:${subjectId}:${topicIdx}:${tab}${subSuffix}`
            : `topic-content:${subjectId}:${topicIdx}:${tab}:${videoIdx}${subSuffix}`;
        const hashId = `#topic-content:${subjectId}:${topicIdx}:${tab}:${videoIdx ?? 'null'}${subSuffix}`;

        try {
            sessionStorage.setItem('sigma-student-nav-state', JSON.stringify({
                type: 'topic-content',
                page: pageId,
                subjectId,
                topicIdx,
                tab,
                videoIdx,
                hash: hashId,
                viewSubmission: isSubMode
            }));
        } catch (e) {}

        const currentHash = window.location.hash || '';
        if (currentHash !== hashId) {
            const historyState = { page: pageId, subjectId, topicIdx, tab, videoIdx, viewSubmission: isSubMode };
            if (window.studentHistoryScreenKey && window.studentHistoryScreenKey(currentHash) === window.studentHistoryScreenKey(hashId)) {
                history.replaceState(historyState, '', hashId);
            } else {
                history.pushState(historyState, '', hashId);
            }
        }
        window.noteStudentHistoryScreen?.();
        _showTopicContent(subjectId, topicIdx, tab, videoIdx);
        window.sigmaResetScrollToTop ? window.sigmaResetScrollToTop() : window.scrollTo(0, 0);
        if (isSubMode) {
            window.scrollSubmissionViewToTop?.();
        }

        // Update sidebar to highlight SUBJECTS (nav-courses)
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        const activeLink = document.getElementById('nav-courses');
        if (activeLink) {
            activeLink.classList.add('active');
        }
    };
    window.switchToTopicContent = window.openTopicContent;

    window.returnToTopicsPage = function () {
        if (_tcSubjectId) {
            switchToTopicPage(_tcSubjectId, null, true);
            return;
        }
        history.back();
    };

    window.switchTopicTab = function (tab, assessmentIdx = null, preserveSubMode = false) {
        if (typeof window.stopAllTopicMedia === 'function') {
            window.stopAllTopicMedia();
        }
        if (!_tcSubjectId) {
            if (typeof window !== 'undefined' && window.location?.hash?.startsWith('#topic-content:')) {
                const hParts = window.location.hash.replace(/^#topic-content:/, '').split(':');
                if (hParts[0]) _tcSubjectId = hParts[0];
                if (hParts[1] !== undefined && !isNaN(parseInt(hParts[1], 10))) _tcTopicIdx = parseInt(hParts[1], 10);
            }
        }
        if (!_tcSubjectId) _tcSubjectId = 'card-prog1';

        const assessmentTabs = ['assignments', 'quiz', 'activity', 'performance', 'assessments'];
        if (assessmentTabs.includes(tab)) {
            tab = 'assessments';
        }

        const isMediaTab = (tab === 'videos' || tab === 'handouts');
        _tcTab = tab;
        _tcVideoIdx = isMediaTab ? assessmentIdx : null;
        window._scAssessmentDetailIdx = !isMediaTab ? assessmentIdx : null;
        window._tcAssessmentDetailIdx = !isMediaTab ? assessmentIdx : null;
        if (!preserveSubMode || isMediaTab) {
            if (window._studentDeadlineWatch) {
                clearTimeout(window._studentDeadlineWatch);
                window._studentDeadlineWatch = null;
            }
            window._studentSubmissionMode = false;
            window._studentViewSubmissionMode = false;
            window._sharedViewSubmissionMode = false;
        }
        if (assessmentIdx === null || assessmentIdx === undefined || isMediaTab) {
            if (window._studentDeadlineWatch) {
                clearTimeout(window._studentDeadlineWatch);
                window._studentDeadlineWatch = null;
            }
            window._studentSubmissionMode = false;
            window._studentViewSubmissionMode = false;
            window._sharedViewSubmissionMode = false;
            window._activeMaterialTitle = null;
            window._activeSubmissionAttemptPage = {};
        }

        const isSubMode = Boolean(preserveSubMode && (window._studentViewSubmissionMode || window._sharedViewSubmissionMode));
        const isSubmitMode = Boolean(preserveSubMode && window._studentSubmissionMode && !isSubMode);
        const subSuffix = isSubMode ? ':submission' : (isSubmitMode ? ':submit' : '');
        const hash = `#topic-content:${_tcSubjectId}:${_tcTopicIdx}:${tab}:${assessmentIdx ?? 'null'}${subSuffix}`;
        const pageId = `topic-content:${_tcSubjectId}:${_tcTopicIdx}:${tab}:${assessmentIdx ?? 'null'}${subSuffix}`;

        try {
            sessionStorage.setItem('sigma-student-nav-state', JSON.stringify({
                type: 'topic-content',
                page: pageId,
                subjectId: _tcSubjectId,
                topicIdx: _tcTopicIdx,
                tab,
                assessmentIdx,
                hash,
                viewSubmission: isSubMode
            }));
        } catch (e) {}

        const currentHash = window.location.hash || '';
        if (currentHash !== hash) {
            const historyState = { page: pageId, subjectId: _tcSubjectId, topicIdx: _tcTopicIdx, tab, assessmentIdx, viewSubmission: isSubMode, submitMode: isSubmitMode };
            if (window.studentHistoryScreenKey && window.studentHistoryScreenKey(currentHash) === window.studentHistoryScreenKey(hash)) {
                history.replaceState(historyState, '', hash);
            } else {
                history.pushState(historyState, '', hash);
            }
        }
        window.noteStudentHistoryScreen?.();
        window.sigmaResetScrollToTop ? window.sigmaResetScrollToTop() : window.scrollTo(0, 0);
        _renderTopicContentMain(_tcSubjectId, _tcTopicIdx, tab);
        window.sigmaResetScrollToTop ? window.sigmaResetScrollToTop() : window.scrollTo(0, 0);
        if (isSubMode) {
            window.scrollSubmissionViewToTop?.();
        }

        document.querySelectorAll('.topic-content-nav-item').forEach(el => {
            el.classList.toggle('active', el.dataset.tab === tab);
        });
    };

    function _showTopicContent(subjectId, topicIdx, tab, videoIdx = null) {
        _tcSubjectId = subjectId;
        _tcTopicIdx = topicIdx;
        _tcTab = tab;
        _tcVideoIdx = videoIdx;
        if (videoIdx === null || videoIdx === undefined) {
            window._activeMaterialTitle = null;
        }

        const data = getTopicData(subjectId) || { q1Topics: [] };
        const subject = getTopicSubject(subjectId) || { name: 'Subject', title: 'Subject' };

        setSubjectsPanelsMode(false);
        setCurriculumMode(true);
        hideAllSections();
        showSection('section-topic-content');

        // Hide sub-sidebar overlay when topic content workstation is active
        const subSidebar = document.getElementById('sub-sidebar');
        if (subSidebar) {
            subSidebar.classList.add('hidden');
            subSidebar.classList.remove('sub-sidebar-visible');
            subSidebar.classList.remove('subjects-hover-subsidebar');
        }
        document.body.classList.remove('sub-sidebar-open');

        updateLayout();

        _renderTopicContentMain(subjectId, topicIdx, tab);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function _renderTopicContentMain(subjectId, topicIdx, tab) {
        window._renderTopicContentMain = _renderTopicContentMain;
        window.renderTopicContentMain = _renderTopicContentMain;
        const page = document.getElementById('section-topic-content');
        if (!page) return;

        let hashSubj = '', hashTIdx = null, hashTab = '', hashItemIdx = null;
        if (typeof window !== 'undefined' && window.location?.hash?.startsWith('#topic-content:')) {
            const hParts = window.location.hash.replace(/^#topic-content:/, '').split(':');
            if (hParts[0]) hashSubj = hParts[0];
            if (hParts[1] !== undefined && !isNaN(parseInt(hParts[1], 10))) hashTIdx = parseInt(hParts[1], 10);
            if (hParts[2]) hashTab = hParts[2];
            if (hParts[3] && hParts[3] !== 'null' && hParts[3] !== 'undefined' && !isNaN(parseInt(hParts[3], 10))) hashItemIdx = parseInt(hParts[3], 10);
        }

        const effectiveSubjectId = subjectId || _tcSubjectId || hashSubj || (typeof _activeSubjectId !== 'undefined' ? _activeSubjectId : '') || 'card-prog1';
        const rawIdx = (topicIdx !== undefined && topicIdx !== null) ? parseInt(topicIdx, 10) : ((_tcTopicIdx !== undefined && _tcTopicIdx !== null) ? parseInt(_tcTopicIdx, 10) : (hashTIdx !== null ? hashTIdx : 0));
        const validIdx = (!isNaN(rawIdx) && rawIdx >= 0) ? rawIdx : 0;
        const effectiveTab = tab || _tcTab || hashTab || 'videos';
        if (hashItemIdx !== null && (window._scAssessmentDetailIdx === null || window._scAssessmentDetailIdx === undefined)) {
            window._scAssessmentDetailIdx = hashItemIdx;
            window._tcAssessmentDetailIdx = hashItemIdx;
        }

        _tcSubjectId = effectiveSubjectId;
        _tcTopicIdx = validIdx;
        _tcTab = effectiveTab;
        if (typeof window.restoreStudentTopicSection === 'function') {
            window.restoreStudentTopicSection(effectiveSubjectId);
        }

        const data = getTopicData(effectiveSubjectId) || { q1Topics: [] };
        const subject = getTopicSubject(effectiveSubjectId) || { name: 'Subject', title: 'Subject' };
        const qKey = window.currentSelectedTopicQuarter || 'q1';
        const topicLists = [data?.[qKey + 'Topics'], data?.q1Topics, data?.topics].filter(Array.isArray);
        let topic = null;
        let queryIdx = validIdx;
        for (let i = 0; i < topicLists.length && !topic; i++) {
            if (topicLists[i][validIdx]) topic = topicLists[i][validIdx];
        }
        if (!topic) {
            for (let i = 0; i < topicLists.length && !topic; i++) {
                if (topicLists[i].length > 0) {
                    topic = topicLists[i][0];
                    queryIdx = 0;
                }
            }
        }
        if (!topic) {
            topic = {
                title: 'Topic ' + (validIdx + 1),
                overview: 'Topic overview and learning materials.',
                handouts: [],
                videos: []
            };
        }
        const assessmentTabs = ['assignments', 'quiz', 'activity', 'performance', 'assessments'];
        const isAssessment = assessmentTabs.includes(effectiveTab);
        const studentSection = (typeof window.resolveStudentAssessmentSection === 'function' && isAssessment)
            ? window.resolveStudentAssessmentSection(effectiveSubjectId, topic, '')
            : (window.resolveStudentReleaseSection?.('') || '');
        const topicAccess = window.getStudentTopicReleaseStatus?.(effectiveSubjectId, topic, queryIdx, studentSection);
        let materialAccess = null;
        const selectedIdx = isAssessment ? (window._scAssessmentDetailIdx ?? hashItemIdx) : (_tcVideoIdx ?? hashItemIdx);
        if (selectedIdx !== null && selectedIdx !== undefined) {
            const items = isAssessment
                ? getAccessibleStudentTopicAssessments(effectiveSubjectId, queryIdx, topic, studentSection)
                : (effectiveTab === 'videos' ? topic.videos : topic.handouts);
            const item = items?.[Number(selectedIdx)];
            materialAccess = !item ? { isLocked: true } : (isAssessment
                ? null
                : window.getStudentLearningMaterialReleaseStatus?.(effectiveSubjectId, item, queryIdx, Number(selectedIdx), effectiveTab === 'videos' ? 'video' : 'lesson', studentSection));
        }
        if ([topicAccess, materialAccess].some(status => status && (status.isLocked || status.isHidden || status.isUnreleased))) {
            showUnavailableStudentMaterial(effectiveSubjectId);
            return;
        }
        if (studentSection && typeof window.rememberStudentTopicSection === 'function') {
            window.rememberStudentTopicSection(studentSection, effectiveSubjectId);
        }

        const config = (typeof window.getTopicReleaseConfig === 'function') ? window.getTopicReleaseConfig(effectiveSubjectId, studentSection) : null;
        const qTopics = data?.[qKey + 'Topics'] || data?.q1Topics || data?.topics || [];

        let visibleTopics = qTopics;
        if (config && Array.isArray(config.releasedTopicIds) && config.releasedTopicIds.length > 0) {
            visibleTopics = qTopics.filter((t, idx) => {
                const tId = t?.id !== undefined && t?.id !== '' ? String(t.id) : '';
                const tTitle = t?.title ? String(t.title).trim() : '';
                const candidates = [tId, tTitle, tTitle.toLowerCase(), `topic-${idx}`, `topic-${idx + 1}`].filter(Boolean);
                return candidates.some(cid => config.releasedTopicIds.map(String).includes(cid));
            });
        }

        const openingDetail = isAssessment && window._scAssessmentDetailIdx !== null && window._scAssessmentDetailIdx !== undefined && String(window._scAssessmentDetailIdx) !== '' && !Number.isNaN(Number(window._scAssessmentDetailIdx));
        const openingSubmission = Boolean(
            window._studentViewSubmissionMode ||
            window._sharedViewSubmissionMode ||
            window._studentSubmissionMode ||
            (typeof location !== 'undefined' && location.hash && (location.hash.includes(':submission') || location.hash.includes(':submit')))
        );
        window.currentTopicState = window.currentTopicState || {};
        window.currentTopicState.subjectId = effectiveSubjectId;
        window.currentTopicState.topicIdx = queryIdx;
        window.currentTopicState.selectedSection = studentSection;
        const topicsPanelHtml = (!openingDetail && !openingSubmission && typeof window.renderSharedTopicsPanelHtml === 'function')
            ? window.renderSharedTopicsPanelHtml({
                subjectId: effectiveSubjectId,
                section: studentSection,
                activeIdx: queryIdx,
                subject,
                data
            })
            : '';
        const taskProgressHtml = (!openingDetail && !openingSubmission && typeof window.renderSharedTaskProgressPanelHtml === 'function')
            ? window.renderSharedTaskProgressPanelHtml({
                subjectId: effectiveSubjectId,
                currentQuarter: qKey,
                topics: visibleTopics.length > 0 ? visibleTopics : qTopics,
                allTopics: visibleTopics.length > 0 ? visibleTopics : qTopics,
                isTeacher: false,
                section: studentSection,
                data: data,
                topicIdx: queryIdx
            })
            : '';
        const listRailHtml = `${topicsPanelHtml}${taskProgressHtml}`;

        let tabResult = { mainHtml: '', rightHtml: null };
        if (effectiveTab === 'videos') {
            const vRes = _buildVideosTab(subject, topic, effectiveSubjectId, validIdx);
            const extraRight = (_tcVideoIdx === null || _tcVideoIdx === undefined) ? null : vRes.rightHtml;
            tabResult = {
                mainHtml: vRes.mainHtml,
                rightHtml: extraRight ? extraRight : listRailHtml,
                railModeClass: 'topic-rail-follow'
            };
        }
        else if (effectiveTab === 'handouts') {
            const hRes = _buildHandoutsTab(subject, topic, effectiveSubjectId, validIdx);
            const extraRight = (_tcVideoIdx === null || _tcVideoIdx === undefined) ? null : hRes.rightHtml;
            tabResult = {
                mainHtml: hRes.mainHtml,
                rightHtml: extraRight ? extraRight : listRailHtml,
                railModeClass: 'topic-rail-follow'
            };
        }
        else if (isAssessment) {
            const aRes = _buildAssessmentTab(effectiveTab, subject, topic, data, effectiveSubjectId, queryIdx);
            tabResult = {
                mainHtml: aRes.mainHtml,
                rightHtml: aRes.rightHtml ? aRes.rightHtml : listRailHtml,
                railModeClass: aRes.railModeClass || 'topic-rail-follow'
            };
        }
        else {
            const cRes = _buildComingSoonTab(effectiveTab, subject, topic);
            tabResult = {
                mainHtml: cRes.mainHtml,
                rightHtml: cRes.rightHtml ? cRes.rightHtml : listRailHtml,
                railModeClass: 'topic-rail-follow'
            };
        }
        const isDetailView = (effectiveTab === 'videos' && _tcVideoIdx !== null && _tcVideoIdx !== undefined && !Number.isNaN(Number(_tcVideoIdx))) ||
            (effectiveTab === 'handouts' && _tcVideoIdx !== null && _tcVideoIdx !== undefined && !Number.isNaN(Number(_tcVideoIdx))) ||
            (isAssessment && window._scAssessmentDetailIdx !== null && window._scAssessmentDetailIdx !== undefined && !Number.isNaN(Number(window._scAssessmentDetailIdx))) ||
            Boolean(window._studentSubmissionMode || window._studentViewSubmissionMode || window._sharedViewSubmissionMode);

        if (!isDetailView) {
            window._activeMaterialTitle = null;
        }

        const tabNavHtml = isDetailView ? '' : _tabNav(effectiveTab);

        if (typeof window.setTopicHeaderBreadcrumb === 'function') {
            window.setTopicHeaderBreadcrumb(subject, topic || validIdx, topic?.title, {
                materialTitle: isDetailView ? window._activeMaterialTitle : null,
                isViewSubmission: Boolean(window._studentViewSubmissionMode || window._sharedViewSubmissionMode)
            });
        } else {
            const navContextText = document.getElementById('nav-context-text');
            if (navContextText) {
                const subjectName = subject?.name || subject?.title || 'Subject';
                const topicTitle = topic?.title || ('Topic ' + (Number(topicIdx) + 1));
                let scaleClass = '';
                const bottomTextLen = String(topicTitle || '').trim().length;
                if (bottomTextLen > 42) {
                    scaleClass = ' is-very-long-title';
                } else if (bottomTextLen > 24) {
                    scaleClass = ' is-long-title';
                } else if (bottomTextLen > 16) {
                    scaleClass = ' is-medium-title';
                }
                navContextText.className = 'admin-topbar__brand-label text-black has-breadcrumb';
                navContextText.innerHTML = `
                    <div class="breadcrumb-line-group">
                        <span class="breadcrumb-subject">${subjectName}</span>
                        <span class="breadcrumb-topic${scaleClass}">${topicTitle}</span>
                    </div>
                `;
            }
        }

        const _scrollX = (typeof window !== 'undefined') ? window.scrollX : 0;
        const _scrollY = (typeof window !== 'undefined') ? window.scrollY : 0;

        page.innerHTML = `
            <div class="student-topic-page-shell pt-0 px-0 pb-0 overflow-visible">
                <!-- Top Header: Category Selection Tabs (Hidden inside material panel / detail view) -->
                ${!isDetailView ? `
                <div class="topic-page-tabs-header">
                    <div id="topic-content-header" class="w-full">
                        ${tabNavHtml}
                    </div>
                </div>` : ''}

                <!-- Main Content Grid: Direct canvas without 1040p panel box -->
                <div class="topic-detail-grid ${!tabResult.rightHtml ? 'no-rail' : ''}">
                    <div id="topic-content-main" class="w-full flex-1">
                        ${tabResult.mainHtml}
                    </div>

                    <!-- Right Section: Tab Specific Sidebar & Progress Panel -->
                    ${tabResult.rightHtml ? `
                    <div id="topic-right-section" class="student-topic-progress-rail font-['Inter'] flex flex-col gap-4 ${tabResult.railModeClass || ''}">
                        ${tabResult.rightHtml}
                    </div>` : ''}
                </div>
            </div>`;

        window.relocateAssessmentPrimaryAction?.(page);

        if (isDetailView) {
            const _resetDetailScrollToTop = () => {
                try {
                    window.scrollTo({ left: 0, top: 0, behavior: 'instant' });
                    document.documentElement.scrollTop = 0;
                    document.body.scrollTop = 0;
                    const mainContent = document.getElementById('main-content');
                    if (mainContent) mainContent.scrollTop = 0;
                    const layoutWrapper = document.getElementById('layout-wrapper');
                    if (layoutWrapper) layoutWrapper.scrollTop = 0;
                    const contentSection = document.getElementById('section-topic-content');
                    if (contentSection) contentSection.scrollTop = 0;
                    const pageShell = document.querySelector('.student-topic-page-shell');
                    if (pageShell) pageShell.scrollTop = 0;
                } catch (_) { }
            };
            _resetDetailScrollToTop();
            requestAnimationFrame(_resetDetailScrollToTop);
            setTimeout(_resetDetailScrollToTop, 50);
        } else {
            try {
                window.scrollTo({ left: _scrollX, top: _scrollY, behavior: 'instant' });
            } catch (_) { }
        }

        if (window._studentSubmissionMode && typeof window.armStudentSubmitDeadlineWatch === 'function') {
            const watchIdx = (window._scAssessmentDetailIdx !== null && window._scAssessmentDetailIdx !== undefined)
                ? window._scAssessmentDetailIdx
                : queryIdx;
            window.armStudentSubmitDeadlineWatch(effectiveSubjectId, validIdx, effectiveTab || 'assessments', watchIdx);
        }

        if (tab === 'handouts') {
            const defaultH = (typeof topicHandouts !== 'undefined' && (topicHandouts[`${subjectId}-${topicIdx}`] || topicHandouts.default)) || [];
            const handouts = topic?.handouts || defaultH;
            if (Array.isArray(handouts)) {
                handouts.forEach((h, i) => {
                    if (h && h.type === 'ppt' && h.slides && typeof HandoutSlider !== 'undefined') {
                        new HandoutSlider(`handout-slider-${i}`, h.slides);
                    }
                });
            }
        }
    }

    //   Tab linear navigation helper  

    const TAB_ORDER = ['videos', 'handouts', 'assessments'];
    const TAB_LABELS = { videos: 'Videos', handouts: 'Lessons', assessments: 'Assessments', task: 'Tasks', tasks: 'Tasks', assignments: 'Tasks', quiz: 'Quizzes', activity: 'Tasks', performance: 'Tasks' };
    const TAB_ICONS = {
        videos: 'fa-solid fa-circle-play',
        handouts: 'fa-solid fa-file-lines',
        assessments: 'fa-solid fa-clipboard-check',
        task: 'fa-solid fa-clipboard-list',
        tasks: 'fa-solid fa-clipboard-list',
        assignments: 'fa-solid fa-clipboard-list',
        quiz: 'fa-solid fa-stopwatch',
        activity: 'fa-solid fa-clipboard-list',
        performance: 'fa-solid fa-clipboard-list'
    };
    function getTopicTabs() {
        return TAB_ORDER;
    }
    function _tabNav(currentTab) {
        if (typeof window.renderTopicContentTabBarHtml === 'function') {
            return window.renderTopicContentTabBarHtml({
                currentTab,
                subjectId: _tcSubjectId,
                topicIdx: _tcTopicIdx,
                role: 'student'
            });
        }
        return '';
    }

    function _buildVideosTab(subject, topic, subjectId, topicIdx) {
        const defaultVideos = topic?.videos || topicVideos[`${subjectId}-${topicIdx}`] || topicVideos[subjectId] || [];
        let videos = typeof window.getUnifiedTopicVideos === 'function'
            ? window.getUnifiedTopicVideos(subjectId, topicIdx, defaultVideos)
            : defaultVideos;

        const allVideosBeforeFilter = [...videos];
        // Filter out unreleased/hidden/scheduled videos for student
        if (typeof window.getStudentLearningMaterialReleaseStatus === 'function') {
            videos = videos.filter((v, idx) => {
                const status = window.getStudentLearningMaterialReleaseStatus(subjectId, v, topicIdx, idx, 'video');
                return !status.isLocked && !status.isHidden && !status.isUnreleased;
            });
        }

        if (_tcVideoIdx !== null && _tcVideoIdx !== undefined && !Number.isNaN(Number(_tcVideoIdx))) {
            const numV = Number(_tcVideoIdx);
            const activeV = videos[numV] || allVideosBeforeFilter[numV] || allVideosBeforeFilter.find(v => String(v.id) === String(_tcVideoIdx) || Number(v.itemIdx) === numV);
            if (activeV && !videos.includes(activeV)) {
                videos = [...videos, activeV];
            }
        }

        let mainHtml = typeof window.renderSharedVideosTabHtml === 'function'
            ? window.renderSharedVideosTabHtml({
                videos,
                activeIdx: _tcVideoIdx,
                subjectId,
                topicIdx,
                role: 'student',
                getOverviewFn: getTopicOverview
            })
            : '';

        if (!mainHtml) {
            mainHtml = (typeof window.renderTopicEmptyStateHtml === 'function')
                ? window.renderTopicEmptyStateHtml('videos')
                : `<div class="py-24 text-center font-['Inter'] select-none"><div class="w-20 h-20 md:w-24 md:h-24 rounded-[28px] bg-slate-100 flex items-center justify-center mx-auto mb-6"><i class="fa-solid fa-circle-play text-4xl md:text-5xl" style="color: rgba(0, 0, 0, 0.3) !important;"></i></div><h3 class="text-xl md:text-2xl font-bold text-slate-800 mb-2">No Videos Available</h3><p class="text-xs md:text-sm text-black/40 max-w-sm mx-auto">Video lectures and materials will appear here once posted.</p></div>`;
        }

        let rightHtml = null;
        if (_tcVideoIdx !== null && _tcVideoIdx !== undefined && !Number.isNaN(Number(_tcVideoIdx)) && videos.length > 0) {
            const tasksPanelHtml = typeof window.renderSharedTasksPanelHtml === 'function'
                ? window.renderSharedTasksPanelHtml({
                    items: videos.map((v, i) => ({
                        title: v.title || `Video ${i + 1}`,
                        isActive: i === Number(_tcVideoIdx),
                        onClick: `openTopicContent('${subjectId}', ${topicIdx}, 'videos', ${i})`
                    }))
                })
                : '';

            rightHtml = tasksPanelHtml ? `<div class="space-y-6 font-['Inter'] hidden md:block">${tasksPanelHtml}</div>` : null;
        } else {
            rightHtml = null;
        }

        return { mainHtml, rightHtml };
    }

    function _buildHandoutsTab(subject, topic, subjectId, topicIdx) {
        const defaultH = topic?.handouts || topicHandouts[`${subjectId}-${topicIdx}`] || topicHandouts[subjectId] || [];
        let handouts = typeof window.getUnifiedTopicHandouts === 'function'
            ? window.getUnifiedTopicHandouts(subjectId, topicIdx, defaultH)
            : defaultH;

        const allHandoutsBeforeFilter = [...handouts];
        if (typeof window.getStudentLearningMaterialReleaseStatus === 'function') {
            handouts = handouts.filter((h, idx) => {
                const status = window.getStudentLearningMaterialReleaseStatus(subjectId, h, topicIdx, idx, 'handout');
                return !status.isLocked && !status.isHidden && !status.isUnreleased;
            });
        }

        if (_tcVideoIdx !== null && _tcVideoIdx !== undefined && !Number.isNaN(Number(_tcVideoIdx))) {
            const numH = Number(_tcVideoIdx);
            const activeH = handouts[numH] || allHandoutsBeforeFilter[numH] || allHandoutsBeforeFilter.find(h => String(h.id) === String(_tcVideoIdx) || Number(h.itemIdx) === numH);
            if (activeH && !handouts.includes(activeH)) {
                handouts = [...handouts, activeH];
            }
        }

        const renderFn = window.renderSharedLessonsTabHtml || window.renderSharedHandoutsTabHtml;
        let mainHtml = typeof renderFn === 'function'
            ? renderFn({
                handouts,
                activeIdx: _tcVideoIdx,
                subjectId,
                topicIdx,
                role: 'student',
                emptyTabKey: 'lessons',
                getOverviewFn: getTopicOverview
            })
            : '';

        if (!mainHtml) {
            mainHtml = (typeof window.renderTopicEmptyStateHtml === 'function')
                ? window.renderTopicEmptyStateHtml('lessons')
                : `<div class="py-24 text-center font-['Inter'] select-none"><div class="w-20 h-20 md:w-24 md:h-24 rounded-[28px] bg-slate-100 flex items-center justify-center mx-auto mb-6"><i class="fa-solid fa-file-lines text-4xl md:text-5xl" style="color: rgba(0, 0, 0, 0.3) !important;"></i></div><h3 class="text-xl md:text-2xl font-bold text-slate-800 mb-2">No Lessons Available</h3><p class="text-xs md:text-sm text-black/40 max-w-sm mx-auto">Lesson handouts and notes will appear here once posted.</p></div>`;
        }

        let rightHtml = null;
        if (_tcVideoIdx !== null && _tcVideoIdx !== undefined && !Number.isNaN(Number(_tcVideoIdx)) && handouts.length > 0) {
            const tasksPanelHtml = typeof window.renderSharedTasksPanelHtml === 'function'
                ? window.renderSharedTasksPanelHtml({
                    items: handouts.map((h, i) => ({
                        title: h.title || `Lesson ${i + 1}`,
                        isActive: i === Number(_tcVideoIdx),
                        onClick: `openTopicContent('${subjectId}', ${topicIdx}, 'handouts', ${i})`
                    }))
                })
                : '';
            rightHtml = tasksPanelHtml ? `<div class="space-y-6 font-['Inter'] hidden md:block">${tasksPanelHtml}</div>` : null;
        }

        return { mainHtml, rightHtml };
    }

    function _buildAssessmentTab(tab, subject, topic, data, subjectId, topicIdx) {
        const studentSec = (typeof window.resolveStudentAssessmentSection === 'function')
            ? window.resolveStudentAssessmentSection(subjectId, topic, '')
            : ((typeof window.resolveStudentReleaseSection === 'function') ? window.resolveStudentReleaseSection('') : '');
        const assessments = getAccessibleStudentTopicAssessments(subjectId, topicIdx, topic, studentSec);

        const numDetailIdx = (window._scAssessmentDetailIdx !== null && window._scAssessmentDetailIdx !== undefined && window._scAssessmentDetailIdx !== '') ? Number(window._scAssessmentDetailIdx) : null;
        const hasDetailIdx = (numDetailIdx !== null && !Number.isNaN(numDetailIdx));
        const activeAss = hasDetailIdx ? assessments[numDetailIdx] : null;

        let scorePanelHtml = '';
        let tasksPanelHtml = '';
        if (activeAss) {
            const isSubmissionPage = Boolean(
                window._studentViewSubmissionMode ||
                window._sharedViewSubmissionMode ||
                window._studentSubmissionMode ||
                (typeof location !== 'undefined' && location.hash && (location.hash.includes(':submission') || location.hash.includes(':submit')))
            );

            const studentUser = (typeof window.getLoggedInStudentUser === 'function') ? window.getLoggedInStudentUser() : null;
            const taskRows = assessments.map((a, i) => ({ a, i })).filter(({ a, i }) => {
                if (!isSubmissionPage || i === numDetailIdx) return true;
                if (!studentUser || typeof window.studentHasAssessmentSubmission !== 'function') return false;
                return window.studentHasAssessmentSubmission(studentUser, a, subjectId, a._category || a.category || a.type || 'assessments');
            });
            tasksPanelHtml = (typeof window.renderSharedTasksPanelHtml === 'function')
                ? window.renderSharedTasksPanelHtml({
                    forceShow: true,
                    items: taskRows.map(({ a, i }) => ({
                        title: a.title,
                        isActive: i === numDetailIdx,
                        onClick: isSubmissionPage ? `window.openSubmissionTask(${i})` : `window.openMaterialTask(${i})`
                    }))
                })
                : '';

            scorePanelHtml = (typeof window.renderSharedAssessmentScorePanelHtml === 'function')
                ? window.renderSharedAssessmentScorePanelHtml({
                    ass: activeAss,
                    subjectId,
                    topicIdx,
                    tab: 'assessments',
                    activeIdx: numDetailIdx,
                    role: 'student',
                    section: studentSec
                })
                : '';
        }

        let mainHtml = typeof window.renderSharedAssessmentsTabHtml === 'function'
            ? window.renderSharedAssessmentsTabHtml({
                tab: 'assessments',
                assessments,
                activeIdx: window._scAssessmentDetailIdx,
                subjectId,
                topicIdx,
                role: 'student',
                section: studentSec,
                showThreeDots: false,
                topicTitle: topic?.title || topic?.name || '',
                topicNumber: (Number(topicIdx || 0) + 1),
                scorePanelHtml,
                onCardClick: (t, i) => `window.switchTopicTab('assessments', ${i})`,
                onBackClick: `window.switchTopicTab('assessments', null)`
            })
            : '';

        if (!mainHtml) {
            mainHtml = (typeof window.renderTopicEmptyStateHtml === 'function')
                ? window.renderTopicEmptyStateHtml('assessments')
                : `<div class="py-24 text-center font-['Inter'] select-none"><div class="w-20 h-20 md:w-24 md:h-24 rounded-[28px] bg-slate-100 flex items-center justify-center mx-auto mb-6"><i class="fa-solid fa-clipboard-check text-4xl md:text-5xl" style="color: rgba(0, 0, 0, 0.3) !important;"></i></div><h3 class="text-xl md:text-2xl font-bold text-slate-800 mb-2">No Assessments Available</h3><p class="text-xs md:text-sm text-black/40 max-w-sm mx-auto">Assessments and coursework items will appear here once posted.</p></div>`;
        }

        let rightHtml = null;
        if (activeAss) {
            rightHtml = `
                <div class="space-y-6 font-['Inter']">
                    ${scorePanelHtml}
                    ${tasksPanelHtml}
                </div>
            `;
        }

        return { mainHtml, rightHtml, railModeClass: rightHtml ? 'topic-rail-score-follow' : '' };
    }

    function _buildComingSoonTab(tab, subject, topic) {
        return {
            mainHtml: typeof window.renderTopicEmptyStateHtml === 'function'
                ? window.renderTopicEmptyStateHtml(tab)
                : `<div class="py-24 text-center font-['Inter']"><h3 class="text-xl font-bold text-black/60 mb-2">No Content Available</h3></div>`,
            rightHtml: null
        };
    }

    // syncHeaderToggleState and hideHeaderOverlays are provided by js/topbar.js — do NOT redefine here.

    // Header name/avatar sync handled by js/profile.js (syncUserProfileData)
    // Welcome banner (student-specific)
    const _welcomeName = document.getElementById('welcome-user-firstName');
    if (_welcomeName) {
        let authUser = null;
        try {
            authUser = JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || 'null');
        } catch (e) {
            authUser = null;
        }
        const isAuth = !!(authUser && (authUser.id || authUser.uid) && !String(authUser.id).toLowerCase().includes('default'));
        if (isAuth) {
            let studentFn = authUser.firstName || '';
            if (!studentFn && (authUser.fullName || authUser.name)) {
                const raw = authUser.fullName || authUser.name;
                studentFn = raw.includes(',') ? raw.split(',')[1].trim().split(' ')[0] : raw.trim().split(/\s+/)[0];
            }
            _welcomeName.textContent = studentFn || 'Student';
        } else {
            _welcomeName.textContent = 'Student';
        }
    }

    window.showMyProfile = (e) => {
        if (e) e.preventDefault();

        hideHeaderOverlays();

        switchTab('nav-profile');

    };
    document.getElementById('viewCalendarBtn')?.addEventListener('click', e => {

        e.preventDefault();

        hideHeaderOverlays();

        switchTab('nav-attendance');

    });
    window.addEventListener('click', () => {
        if (suppressNextHeaderClose) return;

        hideHeaderOverlays(null, null, true);

    });
    document.querySelectorAll('[data-assignment]').forEach(el => el.addEventListener('click', () => switchTab('nav-assignments')));
    //   Classroom Detail  

    const classroomPeopleBySection = {
        'Grade 11 - ICT A': [
            'Abad, Juan',
            'Bautista, Maria',
            'Cruz, Jose',
            'Dela Cruz, Ana',
            'Estacio, Ricardo',
            'Ferrer, Liza',
            'Garcia, Antonio',
            'Hernandez, Elena'
        ],
        'ICT-11A': [
            'Abad, Juan',
            'Bautista, Maria',
            'Cruz, Jose',
            'Dela Cruz, Ana',
            'Estacio, Ricardo',
            'Ferrer, Liza',
            'Garcia, Antonio',
            'Hernandez, Elena'
        ]
    };
    const classroomAnnouncementById = {};
    const classroomData = {};

    const formatClockValue = (v, f) => window.SigmaPanels?.formatClockValue ? window.SigmaPanels.formatClockValue(v, f) : (window.formatClockValue ? window.formatClockValue(v, f) : v);
    const clockValueToMinutes = (v, f) => window.SigmaPanels?.clockValueToMinutes ? window.SigmaPanels.clockValueToMinutes(v, f) : (window.clockValueToMinutes ? window.clockValueToMinutes(v, f) : 0);
    const parseClassSchedule = (s) => window.SigmaPanels?.parseClassSchedule ? window.SigmaPanels.parseClassSchedule(s) : (window.parseClassSchedule ? window.parseClassSchedule(s) : { label: s || 'Schedule TBA', startMinutes: 0, endMinutes: 0 });

    function syncStudentEnrolledClassrooms() {
        const student = getLoggedInStudentUser();
        const studentId = String(student.uid || student.id || '').trim();
        const studentEmail = (student.email || '').toLowerCase().trim();
        const studentFullName = (student.fullName || student.name || `${student.firstName || ''} ${student.lastName || ''}`).toLowerCase().trim();
        const studentNameRev = `${student.lastName || ''}, ${student.firstName || ''}`.toLowerCase().trim();
        const studentLastName = (student.lastName || '').toLowerCase().trim();
        const studentSection = String(student.section || '').toLowerCase().trim();

        const combinedAdminSections = [];
        const seenStudentSecKeys = new Set();
        ['sigma-admin-sections', 'sigma-sections-list', 'sigma-admin-sections-v1', 'sigma-sections'].forEach(key => {
            const list = getStoredJson(key, []);
            if (Array.isArray(list)) {
                list.forEach(sec => {
                    if (!sec) return;
                    const sId = String(sec.id || '');
                    const sName = String(sec.name || sec.sectionName || '').trim().toLowerCase();
                    const sSubj = String(sec.subject || sec.assignedSubject || (Array.isArray(sec.assignedSubjects) && sec.assignedSubjects[0]) || '').trim().toLowerCase();
                    const k = `${sId}::${sName}::${sSubj}`;
                    if (!seenStudentSecKeys.has(k)) {
                        seenStudentSecKeys.add(k);
                        combinedAdminSections.push(sec);
                    }
                });
            }
        });

        const deployedSections = combinedAdminSections.filter(s => s && s.status !== 'Archived');

        // Match sections to this student:
        const enrolledSections = deployedSections.filter(sec => {
            if (typeof window.isSectionAssignedToStudent === 'function') {
                return window.isSectionAssignedToStudent(sec, student);
            }
            if (Array.isArray(sec.students) && sec.students.length > 0) {
                const hasStudent = sec.students.some(st => {
                    if (!st) return false;
                    if (typeof st === 'string') {
                        const stLower = st.toLowerCase().trim();
                        return (studentId && stLower.includes(studentId)) ||
                               (studentFullName && stLower.includes(studentFullName)) ||
                               (studentNameRev && stLower.includes(studentNameRev)) ||
                               (studentLastName && stLower.includes(studentLastName));
                    }
                    const stId = String(st.id || st.uid || '').trim();
                    if (stId && studentId && stId === studentId) return true;

                    const stEmail = (st.email || '').toLowerCase().trim();
                    if (stEmail && studentEmail && stEmail === studentEmail) return true;

                    const stName = (st.name || st.fullName || `${st.lastName || ''}, ${st.firstName || ''}`).toLowerCase().trim();
                    if (stName && (
                        stName === studentFullName ||
                        stName === studentNameRev ||
                        stName.includes(studentFullName) ||
                        studentFullName.includes(stName) ||
                        (studentLastName && stName.includes(studentLastName))
                    )) return true;

                    return false;
                });
                if (hasStudent) return true;
            }

            if (studentSection && sec.name && sec.name.toLowerCase().trim() === studentSection) {
                return true;
            }

            return false;
        });

        // Clear and rebuild classroomData
        const newClassroomData = {};

        enrolledSections.forEach(sec => {
            const secId = String(sec.id || `sec-${sec.code || sec.name}`);
            const scheduleParsed = parseClassSchedule(sec.schedule || (sec.startTime && sec.endTime ? `${sec.daysFormatted || ''} ${sec.startTime} - ${sec.endTime}` : 'Schedule TBA'));
            const subjectName = sec.subject || sec.name || 'Subject';
            const sectionName = sec.name || 'Section';
            const teacherName = sec.teacher || (sec.teachers && sec.teachers[0] ? sec.teachers[0].name : 'Teacher');

            newClassroomData[secId] = {
                id: secId,
                subject: subjectName,
                section: sectionName,
                room: sec.room || 'Room TBA',
                teacher: teacherName,
                teachers: sec.teachers || (sec.teacher ? [{ name: sec.teacher, role: 'Teacher', isPrimary: true }] : []),
                students: sec.students || [],
                studentsCount: sec.studentsCount != null ? sec.studentsCount : (sec.students ? sec.students.length : 0),
                schedule: scheduleParsed,
                rawSchedule: sec.schedule || '',
                startTime: sec.startTime || '',
                endTime: sec.endTime || '',
                days: sec.days || [],
                daysFormatted: sec.daysFormatted || '',
                schoolYear: sec.schoolYear || '2026-2027',
                grade: sec.grade || sec.gradeLevel || 'Grade 11',
                bgColor: 'bg-[#15803d]',
                icon: getSubjectIcon(subjectName),
                sharedKey: `${sectionName}::${subjectName}`
            };

            // Also register in subjectsData.enrolled if present
            if (typeof subjectsData !== 'undefined' && Array.isArray(subjectsData.enrolled)) {
                const existingSubj = subjectsData.enrolled.find(s => s.id === secId || s.text === subjectName);
                if (!existingSubj) {
                    subjectsData.enrolled.push({
                        id: secId,
                        text: subjectName,
                        title: subjectName,
                        subtitle: resolveSubjectType(subjectName, sec),
                        icon: getSubjectIcon(subjectName),
                        color: 'text-green-600',
                        q1Percent: 0,
                        q2Percent: 0,
                        q3Percent: 0,
                        q4Percent: 0
                    });
                }
            }
        });

        Object.keys(classroomData).forEach(k => delete classroomData[k]);
        Object.assign(classroomData, newClassroomData);

        if (enrolledSections.length > 0) {
            currentStudentSection = enrolledSections[0].name || student.section || currentStudentSection;
            currentStudentName = student.fullName || student.name || `${student.lastName || ''}, ${student.firstName || ''}`.trim();
        }

        try {
            const serialized = JSON.stringify(Object.values(classroomData));
            if (localStorage.getItem('sigma_student_enrolled_classes') !== serialized) {
                localStorage.setItem('sigma_student_enrolled_classes', serialized);
            }
        } catch (e) {}

        return Object.values(classroomData);
    }
    window.syncStudentEnrolledClassrooms = syncStudentEnrolledClassrooms;

    function getStudentSectionClassItems() {
        if (Object.keys(classroomData).length === 0) {
            syncStudentEnrolledClassrooms();
        }
        const defaultClasses = Object.entries(classroomData).map(([id, data]) => {
            const rawSched = data.rawSchedule || (typeof data.schedule === 'string' ? data.schedule : '') || (data.schedule?.label || '');
            return {
                id: String(id),
                subject: data.subject || 'Subject',
                section: data.section || currentStudentSection || '',
                room: data.room || 'Room TBA',
                teacher: data.teacher || '',
                schedule: parseClassSchedule(rawSched),
                rawSchedule: rawSched,
                days: data.days || [],
                daysFormatted: data.daysFormatted || '',
                dailySchedules: data.dailySchedules || [],
                schoolYear: data.schoolYear || '2026-2027',
                bgColor: data.bgColor || 'bg-[#15803d]',
                icon: data.icon || getSubjectIcon(data.subject),
                sharedKey: data.sharedKey
            };
        });

        let activeData = null;
        try {
            const storedClasses = localStorage.getItem('sigma_student_enrolled_classes');
            if (storedClasses) activeData = JSON.parse(storedClasses);
        } catch (e) {}

        if (!activeData || (Array.isArray(activeData) && activeData.length < defaultClasses.length) || (typeof activeData === 'object' && Object.keys(activeData).length === 0)) {
            return defaultClasses;
        }

        const rawList = Array.isArray(activeData)
            ? activeData.map((data, idx) => [data?.id || `stud-cls-${idx + 1}`, data])
            : Object.entries(activeData);

        const items = rawList
            .filter(([, data]) => Boolean(data && typeof data === 'object'))
            .map(([id, data]) => {
                const rawSched = data.rawSchedule || (typeof data.schedule === 'string' ? data.schedule : '') || (data.schedule?.label || '');
                const schedule = parseClassSchedule(rawSched);
                return {
                    id: String(id || data.id || 'stud-cls-1'),
                    subject: data.subject || 'Subject',
                    section: data.section || currentStudentSection || '',
                    room: data.room || 'Room TBA',
                    teacher: data.teacher || '',
                    schedule,
                    rawSchedule: rawSched,
                    days: data.days || [],
                    daysFormatted: data.daysFormatted || '',
                    dailySchedules: data.dailySchedules || [],
                    schoolYear: data.schoolYear || '2026-2027',
                    bgColor: data.bgColor || 'bg-[#15803d]',
                    icon: data.icon || getSubjectIcon(data.subject)
                };
            })
            .sort((a, b) => (a.schedule?.startMinutes || 0) - (b.schedule?.startMinutes || 0) || a.subject.localeCompare(b.subject));

        return items.length > 0 ? items : defaultClasses;
    }
    window.getStudentSectionClassItems = getStudentSectionClassItems;

    function getStudentUpcomingSectionClasses(limit = 2) {
        const classes = getStudentSectionClassItems();
        if (window.SigmaPanels && typeof window.SigmaPanels.filterUpcomingClasses === 'function') {
            return window.SigmaPanels.filterUpcomingClasses(classes, limit);
        }
        if (typeof filterUpcomingClasses === 'function') {
            return filterUpcomingClasses(classes, limit);
        }
        return [];
    }

    function formatHomeAssessmentWhen(date) {
        if (!date) return 'Due date TBA';
        const d = date instanceof Date ? date : new Date(date);
        if (Number.isNaN(d.getTime())) return String(date);
        const today = new Date();
        const sameDay = d.toDateString() === today.toDateString();
        const dateLabel = sameDay ? 'Due Today' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const timeLabel = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        return `${dateLabel} ${timeLabel}`;
    }

    function isStudentRowSubmitted(row) {
        if (!row) return false;
        const loggedStudent = (typeof window.getLoggedInStudentUser === 'function') ? window.getLoggedInStudentUser() : null;
        if (row.submittedOn || row.gradedOn || row.isSubmitted) {
            if (row.studentId && loggedStudent && !window.isSubmissionMatchForStudent?.(row, loggedStudent)) {
                return false;
            }
            return true;
        }

        // Check window.getStudentAssessmentSubmission with loggedStudent
        if (typeof window.getStudentAssessmentSubmission === 'function') {
            const rowCat = String(row.category || row.type || (row.tab || '')).toLowerCase();
            const specificTab = rowCat.includes('quiz') ? 'quiz' : (rowCat.includes('assign') ? 'assignments' : (row.tab || 'assessments'));
            const rowTopicIdx = row.topicIdx !== undefined ? row.topicIdx : (row.topicIndex !== undefined ? row.topicIndex : null);
            const sub = window.getStudentAssessmentSubmission(row.subjectId, row.tab || 'assessments', row.unifiedIdx !== undefined ? row.unifiedIdx : row.itemIdx, rowTopicIdx, row, loggedStudent)
                     || window.getStudentAssessmentSubmission(row.cardId || row.subjectId, row.tab || 'assessments', row.itemIdx !== undefined ? row.itemIdx : row.unifiedIdx, rowTopicIdx, row, loggedStudent)
                     || (specificTab !== (row.tab || 'assessments') ? window.getStudentAssessmentSubmission(row.subjectId, specificTab, row.itemIdx !== undefined ? row.itemIdx : row.unifiedIdx, rowTopicIdx, row, loggedStudent) : null);
            if (sub && (sub.status === 'Submitted' || sub.status === 'Pending' || sub.status === 'Graded' || sub.submittedAt || sub.submissionDate || sub.completedAt || sub.fileName || sub.file || sub.textAnswer || sub.answers)) {
                return true;
            }
        }

        return false;
    }

    function getStudentOverdueSubmissionItems(limit = 20) {
        let rows = [];
        if (window.AssessmentsPage && typeof window.AssessmentsPage.buildAssessmentRows === 'function') {
            rows = window.AssessmentsPage.buildAssessmentRows('student');
        } else {
            rows = getStoredJson('sigma_student_assessments', []);
        }
        if (!Array.isArray(rows)) rows = [];
        const now = Date.now();
        const maxOverdueMs = 7 * 24 * 60 * 60 * 1000; // 7 Days (1 School Week) dismissal cutoff
        const filtered = rows.filter(row => {
            if (isStudentRowSubmitted(row)) return false;
            const isNoDue = !row.dueDate || row.dueDate === '-' || row.dueDate === 'none' || row.dueDate === 'no-deadline' || String(row.dueDate).toLowerCase() === 'no deadline' || String(row.dueDate).toLowerCase() === 'no due date';
            if (isNoDue) return false;
            const due = new Date(row.dueDate).getTime();
            if (!due || isNaN(due)) return false;
            const elapsed = now - due;
            // Overdue if past deadline, but automatically drops off if older than 7 days
            return elapsed > 0 && elapsed <= maxOverdueMs;
        });
        return filtered
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
            .slice(0, limit);
    }

    function getStudentDueSubmissionItems(limit = 20) {
        let rows = [];
        if (window.AssessmentsPage && typeof window.AssessmentsPage.buildAssessmentRows === 'function') {
            rows = window.AssessmentsPage.buildAssessmentRows('student');
        } else {
            rows = getStoredJson('sigma_student_assessments', []);
        }
        if (!Array.isArray(rows)) rows = [];
        const now = Date.now();
        const next24h = now + 24 * 60 * 60 * 1000;
        const filtered = rows.filter(row => {
            if (isStudentRowSubmitted(row)) return false;
            const isNoDue = !row.dueDate || row.dueDate === '-' || row.dueDate === 'none' || row.dueDate === 'no-deadline' || String(row.dueDate).toLowerCase() === 'no deadline' || String(row.dueDate).toLowerCase() === 'no due date';
            if (isNoDue) return false;
            const due = new Date(row.dueDate).getTime();
            return due && !isNaN(due) && due >= now && due <= next24h;
        });
        return filtered
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
            .slice(0, limit);
    }

    function getStudentUpcomingSubmissionItems(limit = 20) {
        let rows = [];
        if (window.AssessmentsPage && typeof window.AssessmentsPage.buildAssessmentRows === 'function') {
            rows = window.AssessmentsPage.buildAssessmentRows('student');
        } else {
            rows = getStoredJson('sigma_student_assessments', []);
        }
        if (!Array.isArray(rows)) rows = [];
        const now = Date.now();
        const next24h = now + 24 * 60 * 60 * 1000;
        const filtered = rows.filter(row => {
            if (isStudentRowSubmitted(row)) return false;
            const isNoDue = !row.dueDate || row.dueDate === '-' || row.dueDate === 'none' || row.dueDate === 'no-deadline' || String(row.dueDate).toLowerCase() === 'no deadline' || String(row.dueDate).toLowerCase() === 'no due date';
            if (isNoDue) {
                // Open active assessment without specific deadline
                return true;
            }
            const due = new Date(row.dueDate).getTime();
            if (!due || isNaN(due)) return true;
            return due > next24h;
        });
        return filtered
            .sort((a, b) => {
                const isNoDueA = !a.dueDate || a.dueDate === '-' || a.dueDate === 'none' || a.dueDate === 'no-deadline' || String(a.dueDate).toLowerCase() === 'no deadline' || String(a.dueDate).toLowerCase() === 'no due date' || isNaN(new Date(a.dueDate).getTime());
                const isNoDueB = !b.dueDate || b.dueDate === '-' || b.dueDate === 'none' || b.dueDate === 'no-deadline' || String(b.dueDate).toLowerCase() === 'no deadline' || String(b.dueDate).toLowerCase() === 'no due date' || isNaN(new Date(b.dueDate).getTime());

                const timeA = isNoDueA ? 0 : new Date(a.dueDate).getTime();
                const timeB = isNoDueB ? 0 : new Date(b.dueDate).getTime();

                if (isNoDueA && isNoDueB) {
                    const startA = a.startDate ? new Date(a.startDate).getTime() : 0;
                    const startB = b.startDate ? new Date(b.startDate).getTime() : 0;
                    return startB - startA;
                }
                if (isNoDueA) return 1;
                if (isNoDueB) return -1;
                return timeA - timeB;
            })
            .slice(0, limit);
    }

    function renderStudentHomeDashboardPanels() {
        const nextList = document.getElementById('student-home-next-class-list');
        let todoList = document.getElementById('student-home-todo-list');
        const dueList = document.getElementById('student-home-due-submission-list');
        const sectionTodoList = document.getElementById('student-sections-todo-list');
        const sectionDueList = document.getElementById('student-sections-due-submission-list');
        if (!nextList && !dueList && !todoList && !sectionTodoList && !sectionDueList) return;

        // Clean up any existing Tasks / To-Do slots on student dashboard and sections rails
        const leftoverTodo = document.getElementById('student-home-todo-list');
        if (leftoverTodo) {
            const grp = leftoverTodo.closest('.home-dashboard-group');
            if (grp) grp.remove();
            else leftoverTodo.remove();
        }
        const leftoverSectionTodo = document.getElementById('student-sections-todo-list');
        if (leftoverSectionTodo) {
            const grp = leftoverSectionTodo.closest('.home-dashboard-group');
            if (grp) grp.remove();
            else leftoverSectionTodo.remove();
        }

        // ── Class Panel (shared renderer — student's own enrolled subjects) ──
        if (nextList) {
            const classes = getStudentUpcomingSectionClasses(2);
            if (window.SigmaPanels && typeof window.SigmaPanels.renderClassPanel === 'function') {
                window.SigmaPanels.renderClassPanel('student-home-next-class-list', classes, {
                    emptyTitle: 'No Classes Today',
                    emptyMeta: 'Your enrolled subjects will appear here.',
                    onClassClick: function (item) {
                        showClassroomDetail(item.id, true, 'room');
                    }
                });
            }
        }

        // ── Submissions Panel (student's enrolled subjects only) ─────────────
        const allDueTargets = [dueList, sectionDueList].filter(Boolean);
        if (allDueTargets.length > 0) {
            const overdueItems = getStudentOverdueSubmissionItems(20);
            const dueItems = getStudentDueSubmissionItems(20);
            const upcomingItems = getStudentUpcomingSubmissionItems(20);

            allDueTargets.forEach(target => {
                if (window.SigmaPanels && typeof window.SigmaPanels.renderStudentSubmissionsPanel === 'function') {
                    window.SigmaPanels.renderStudentSubmissionsPanel(target, {
                        overdueItems: overdueItems,
                        dueItems: dueItems,
                        upcomingItems: upcomingItems
                    }, {
                        limit: 3,
                        onItemClick: function (row) {
                            if (typeof window.openTopicContent === 'function') {
                                const itemIdx = (row.unifiedIdx !== undefined && row.unifiedIdx !== null) ? Number(row.unifiedIdx) : (row.itemIdx !== '' && row.itemIdx !== undefined ? Number(row.itemIdx) : null);
                                window.openTopicContent(row.subjectId, Number(row.topicIdx || 0), 'assessments', itemIdx);
                            }
                        },
                        onSubjectClick: function (row) {
                            const cId = resolveStudentClassroomId(row);
                            if (cId && typeof showClassroomDetail === 'function') {
                                showClassroomDetail(cId, true, 'room');
                            } else if (typeof window.showClassroomDetail === 'function' && cId) {
                                window.showClassroomDetail(cId, true, 'room');
                            } else if (typeof window.openTopicContent === 'function') {
                                window.openTopicContent(row.subjectId, Number(row.topicIdx || 0), 'assessments', null);
                            }
                        }
                    });
                }
            });
        }
    }
    window.renderStudentHomeDashboardPanels = renderStudentHomeDashboardPanels;


    const classroomTopicSourceById = {
        'card-prog1': 'card-prog1',
        'card-webdev': 'card-webdev',
        'card-stats': 'gen-statistics-probability'
    };
    const classroomTopicSourceBySubject = {
        'computer programming 1': 'card-prog1',
        'web development 1': 'card-webdev',
        'database management 1': 'card-database',
        'empowerment technology': 'card-empowerment',
        'empowerment technologies': 'card-empowerment',
        'statistics & probability': 'gen-statistics-probability',
        'statistics and probability': 'gen-statistics-probability',
        'intro to computing': 'card-introcomp',
        'animation': 'card-animation',
        'system architecture': 'card-sysarch',
        'general mathematics': 'core-general-mathematics',
        'oral communication': 'card-oralcomm'
    };

    function resolveStudentClassroomId(subj) {
        if (!subj) return '';
        const name = typeof subj === 'string' ? subj : (subj.name || subj.subject || subj.subjectName || '');
        const id = typeof subj === 'object' ? (subj.subjectId || subj.classroomId || subj.id || '') : (typeof subj === 'string' ? subj : '');

        // 1. Direct classroomData match
        if (id && classroomData[id]) return id;

        // 2. Enrolled classes match by ID
        const enrolled = typeof getStudentSectionClassItems === 'function' ? getStudentSectionClassItems() : [];
        if (id) {
            const matchById = enrolled.find(c => String(c.id || '').toLowerCase() === String(id).toLowerCase());
            if (matchById) return matchById.id;
        }

        // 3. Match by subject name in classroomData
        const cleanName = String(name || '').toLowerCase().trim();
        if (cleanName) {
            const entry = Object.entries(classroomData).find(([, data]) => {
                const sName = String(data?.subject || '').toLowerCase().trim();
                return sName === cleanName || sName.includes(cleanName) || cleanName.includes(sName);
            });
            if (entry) return entry[0];

            // 4. Match by subject name in enrolled classes
            const matchByName = enrolled.find(c => {
                const sName = String(c?.subject || '').toLowerCase().trim();
                return sName === cleanName || sName.includes(cleanName) || cleanName.includes(sName);
            });
            if (matchByName) return matchByName.id;
        }

        // 5. Look up topic subject title if id matches a known topic ID (e.g. card-prog1)
        if (typeof getTopicSubject === 'function') {
            const topicSubj = getTopicSubject(id) || getTopicSubject(cleanName);
            const title = (topicSubj?.name || topicSubj?.title || '').toLowerCase().trim();
            if (title) {
                const matchByTopic = enrolled.find(c => {
                    const sName = String(c?.subject || '').toLowerCase().trim();
                    return sName === title || sName.includes(title) || title.includes(sName);
                });
                if (matchByTopic) return matchByTopic.id;
            }
        }

        // 6. Return first enrolled class if available, or '' - NEVER fabricate a fake 'card-card-...' ID
        if (enrolled.length > 0) return enrolled[0].id;
        return '';
    }
    window.resolveStudentClassroomId = resolveStudentClassroomId;
    function normalizeTopicSubjectTitle(value) {
        return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
    }
    function findTopicSourceIdByTitle(title) {
        const normalizedTitle = normalizeTopicSubjectTitle(title);
        if (!normalizedTitle) return '';
        const aliasId = classroomTopicSourceBySubject[normalizedTitle];
        if (aliasId) return aliasId;
        const catalogMatch = Object.entries(curriculumTopicCatalog).find(([, item]) => (
            normalizeTopicSubjectTitle(item?.text || item?.title) === normalizedTitle
        ));
        if (catalogMatch) return catalogMatch[0];
        const detailMatch = Object.entries(subjectDetails || {}).find(([, item]) => (
            normalizeTopicSubjectTitle(item?.text || item?.title) === normalizedTitle
        ));
        if (detailMatch) return detailMatch[0];
        return '';
    }
    function resolveClassroomTopicSourceId(classroomId, classroom = classroomData[classroomId]) {
        const mappedId = classroomTopicSourceById[classroomId];
        if (mappedId && getTopicData(mappedId)) return mappedId;
        const titleMatchedId = findTopicSourceIdByTitle(classroom?.subject);
        if (titleMatchedId && getTopicData(titleMatchedId)) return titleMatchedId;
        if (getTopicData(classroomId)) return classroomId;
        const fallbackId = mappedId || titleMatchedId;
        if (fallbackId && classroom?.subject) {
            ensureSubjectDataForTitle(classroom.subject, 'Subjects');
            if (getTopicData(fallbackId)) return fallbackId;
        }
        if (classroom?.subject) return ensureSubjectDataForTitle(classroom.subject, 'Subjects').id;
        return classroomId;
    }
    function resolveHomeSubjectTopicSourceId(subjectId, subjectTitle = '') {
        const mappedId = classroomTopicSourceById[subjectId];
        if (mappedId && getTopicData(mappedId)) return mappedId;
        const titleMatchedId = findTopicSourceIdByTitle(subjectTitle);
        if (titleMatchedId && getTopicData(titleMatchedId)) return titleMatchedId;
        if (getTopicData(subjectId)) return subjectId;
        if (mappedId && subjectTitle) {
            ensureSubjectDataForTitle(subjectTitle, 'Subjects');
            if (getTopicData(mappedId)) return mappedId;
        }
        if (subjectTitle) return ensureSubjectDataForTitle(subjectTitle, 'Subjects').id;
        return mappedId || subjectId;
    }
    function getStudentVisibleAdminAnnouncements() {
        return getAdminAnnouncements()

            .filter(post => ['all', 'students', 'specific'].includes(post?.audience || 'all'))

            .map(post => ({

                id: post.id || `admin-${post.createdAt || Date.now()}`,

                kind: 'admin',

                priority: post.type === 'urgent' ? 'Important' : 'Admin Update',

                channelLabel: 'Admin Announcement',

                title: post.title || 'School Announcement',

                bodyHtml: formatAdminAnnouncementBody(post.body || ''),

                bodyText: String(post.body || '').trim(),

                author: post.author || 'Admin Office',

                meta: getAdminAnnouncementAudienceLabel(post.audience),

                stamp: formatAnnouncementTimestamp(post.createdAt),

                sortValue: parseAnnouncementDateValue(post.createdAt),

                type: post.type || 'regular'

            }));

    }
    function getAdminAnnouncementAudienceLabel(audience) {
        return {

            all: 'All Roles',

            students: 'Students',

            teachers: 'Teachers',

            specific: 'Specific Strand / Dept'

        }[audience] || 'All Roles';

    }
    function getTeacherSectionAnnouncements() {
        return Object.entries(classroomData)

            .filter(([, data]) => data.section === currentStudentSection || data.section === 'ICT-11A' || data.section === 'Grade 11 - ICT A')

            .flatMap(([classroomId, data]) => {
                const posts = getSharedAnnouncements(data.sharedKey || classroomId, classroomAnnouncementById[classroomId] || []);
                return posts.map((post, index) => ({

                    id: buildAnnouncementId(data.sharedKey || classroomId, post, index),

                    kind: 'teacher',

                    priority: 'Section Update',

                    channelLabel: 'Teacher Announcement',

                    title: data.subject,

                    bodyHtml: post.html || `<p>${escapeHtml(post.text || '')}</p>`,

                    bodyText: stripHtmlTags(post.html || post.text || ''),

                    author: post.author || data.teacher,

                    meta: `${data.section}   ${data.subject}`,

                    stamp: formatAnnouncementTimestamp(post.createdAt || post.timestamp),

                    sortValue: parseAnnouncementDateValue(post.createdAt || post.timestamp),

                    type: 'regular'

                }));

            });

    }
    function getStudentHomeAnnouncements(tab = activeHomeAnnouncementTab) {
        const adminPosts = getStudentVisibleAdminAnnouncements();
        const teacherPosts = getTeacherSectionAnnouncements();
        if (tab === 'important') {
            return [...adminPosts, ...teacherPosts]

                .filter(p => p.type === 'urgent' || p.isImportant)

                .sort((a, b) => b.sortValue - a.sortValue);

        }
        // overall / default

        return [...adminPosts, ...teacherPosts].sort((a, b) => b.sortValue - a.sortValue);

    }

    function renderStudentHomeAnnouncements() {
        if (window.SigmaAnnouncements && typeof window.SigmaAnnouncements.resetToDefaultTab === 'function') {
            window.SigmaAnnouncements.resetToDefaultTab();
        } else if (window.SigmaAnnouncements && typeof window.SigmaAnnouncements.refresh === 'function') {
            window.SigmaAnnouncements.refresh();
        }
    }


    activeStudentClassroomId = activeStudentClassroomId || '';
    activeStudentRoomTab = activeStudentRoomTab || 'room';
    function getStudentClassroomCards() {
        if (Object.keys(classroomData || {}).length === 0) {
            syncStudentEnrolledClassrooms();
        }
        const cards = Object.entries(classroomData || {})
            .map(([id, data]) => ({ id, ...data }));
        if (typeof window.sortClassroomCards === 'function') {
            return window.sortClassroomCards(cards);
        }
        return cards.slice().sort((a, b) => {
            const subjA = String(a.subject || a.name || '').trim();
            const subjB = String(b.subject || b.name || '').trim();
            const cmp = subjA.localeCompare(subjB, undefined, { sensitivity: 'base', numeric: true });
            if (cmp !== 0) return cmp;
            const secA = String(a.section || a.sectionName || '').trim();
            const secB = String(b.section || b.sectionName || '').trim();
            return secA.localeCompare(secB, undefined, { sensitivity: 'base', numeric: true });
        });
    }
    function getStudentRoomSubtitle(data) {
        return `${data.section || 'Section'} - ${data.room || 'Room'}`.trim();
    }
    function ensureStudentSectionsSubmenu() {
        const parent = document.getElementById('nav-classrooms');
        if (!parent) return null;

        parent.classList.add('nav-link--group');
        if (!parent.querySelector('.sidebar-group-chevron')) {
            const chevron = document.createElement('i');
            chevron.className = 'fa-solid fa-chevron-right sidebar-group-chevron';
            parent.appendChild(chevron);
        }
        let submenu = document.getElementById('student-sections-submenu');
        if (!submenu) {
            submenu = document.createElement('div');
            submenu.id = 'student-sections-submenu';
            submenu.className = 'sidebar-submenu hidden student-section-nav-children';
            parent.insertAdjacentElement('afterend', submenu);
        }
        return submenu;
    }
    function renderStudentSectionsNavChildren(activeClassroomId = activeStudentClassroomId) {
        const submenu = ensureStudentSectionsSubmenu();
        if (!submenu) return;

        const cards = getStudentClassroomCards();
        if (cards.length === 0) {
            submenu.innerHTML = `
                <div class="px-4 py-3 text-xs text-gray-400 select-none">
                    No sections assigned
                </div>
            `;
            return;
        }

        submenu.innerHTML = cards.map(card => {
            const active = card.id === activeClassroomId;
            return `
                <button type="button"
                    class="student-section-room-link ${active ? 'active' : ''}"
                    data-classroom-id="${card.id}">
                    <i class="fa-solid fa-door-open student-section-room-link__icon"></i>
                    <span class="student-section-room-link__content">
                        <span class="student-section-room-link__title">${card.subject}</span>
                        <span class="student-section-room-link__meta">${getStudentRoomSubtitle(card)}</span>
                    </span>
                </button>
            `;
        }).join('');

        submenu.querySelectorAll('[data-classroom-id]').forEach(button => {
            button.addEventListener('click', event => {
                event.preventDefault();
                event.stopPropagation();
                window.collapseSidebar?.();
                showClassroomDetail(button.dataset.classroomId, true, 'room');
            });
        });
    }
    function syncStudentSectionsNavState(showChildren = studentSectionsSubmenuOpen) {
        const parent = document.getElementById('nav-classrooms');
        const submenu = ensureStudentSectionsSubmenu();
        if (!parent || !submenu) return;
        const isCollapsed = document.body.classList.contains('sidebar-collapsed') && window.innerWidth >= 1024;
        const isDetailVisible = isStudentClassroomDetailVisible();

        parent.classList.toggle('active', isDetailVisible && Boolean(activeStudentClassroomId));
        const isShow = showChildren && !isCollapsed;
        parent.classList.toggle('open', isShow);
        parent.setAttribute('aria-expanded', isShow ? 'true' : 'false');

        const chevron = parent.querySelector('.sidebar-group-chevron');
        if (chevron) {
            chevron.classList.toggle('rotate-90', isShow);
            chevron.style.setProperty('transform', isShow ? 'rotate(90deg)' : 'rotate(0deg)', 'important');
        }

        submenu.classList.toggle('hidden', !isShow);
    }
    function isStudentClassroomDetailVisible() {
        const detailSection = document.getElementById('section-classroom-detail');
        return Boolean(activeStudentClassroomId && detailSection && !detailSection.classList.contains('hidden'));
    }
    function hideStudentClassroomSectionsSidebar() {
        const subSidebar = document.getElementById('sub-sidebar');
        const content = document.getElementById('sub-sidebar-content');
        const header = document.getElementById('sub-sidebar-header');
        if (subSidebar) {
            subSidebar.classList.add('hidden');
            subSidebar.classList.remove('sub-sidebar-visible');
            subSidebar.classList.remove('subjects-hover-subsidebar');
        }
        if (content) content.innerHTML = '';
        header?.classList.add('hidden');
        document.body.classList.remove('sub-sidebar-open');
    }
    function renderStudentClassroomSectionsSidebar(activeClassroomId = activeStudentClassroomId, showCollapsedOverlay = false) {
        const subSidebar = document.getElementById('sub-sidebar');
        const content = document.getElementById('sub-sidebar-content');
        const title = document.getElementById('sub-sidebar-title');
        const header = document.getElementById('sub-sidebar-header');
        if (!subSidebar || !content) return;

        renderStudentSectionsNavChildren(activeClassroomId);
        syncStudentSectionsNavState(true);
        const isCollapsed = document.body.classList.contains('sidebar-collapsed') && window.innerWidth >= 1024;

        // If sidebar is expanded (not collapsed), hide the sub-sidebar
        if (!isCollapsed) {
            subSidebar.classList.add('hidden');
            subSidebar.classList.remove('sub-sidebar-visible');
            subSidebar.classList.remove('subjects-hover-subsidebar');
            document.body.classList.remove('sub-sidebar-open');
            updateLayout();
            return;
        }

        // If explicitly asked to stay hidden (e.g. on refresh/load), hide it
        if (!showCollapsedOverlay) {
            subSidebar.classList.add('hidden');
            subSidebar.classList.remove('sub-sidebar-visible');
            subSidebar.classList.remove('subjects-hover-subsidebar');
            document.body.classList.remove('sub-sidebar-open');
            updateLayout();
            return;
        }
        if (title) title.textContent = 'My Classes';
        header?.classList.remove('hidden');

        const navClassesBtn = document.getElementById('nav-classrooms') || document.getElementById('nav-classes');
        if (navClassesBtn && typeof window.positionSubSidebarBeside === 'function') {
            window.positionSubSidebarBeside(navClassesBtn);
        } else if (navClassesBtn) {
            const rect = navClassesBtn.getBoundingClientRect();
            const sidebarTopOffset = 82;
            const targetTop = Math.max(sidebarTopOffset, Math.round(rect.top));
            subSidebar.style.setProperty('top', `${targetTop}px`, 'important');
            subSidebar.style.setProperty('max-height', `calc(100vh - ${targetTop}px - 16px)`, 'important');
        }

        const cards = getStudentClassroomCards();
        if (cards.length === 0) {
            content.innerHTML = `
                <div class="py-16 px-4 text-center select-none font-['Inter']">
                    <div class="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                        <i class="fa-solid fa-door-closed text-xl text-black-fade"></i>
                    </div>
                    <p class="text-sm font-bold text-black mb-1">No Classes Available</p>
                    <p class="text-xs text-black-fade">No classes have been published yet.</p>
                </div>
            `;
        } else {
            content.innerHTML = `
                <div class="student-section-room-list">
                    ${cards.map(card => `
                        <button type="button"
                            class="student-section-room-link ${card.id === activeClassroomId ? 'active' : ''}"
                            data-classroom-id="${card.id}">
                            <i class="fa-solid fa-door-open student-section-room-link__icon"></i>
                            <span class="student-section-room-link__content">
                                <span class="student-section-room-link__title">${card.subject}</span>
                                <span class="student-section-room-link__meta">${getStudentRoomSubtitle(card)}</span>
                            </span>
                        </button>
                    `).join('')}
                </div>
            `;

            content.querySelectorAll('[data-classroom-id]').forEach(button => {
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.collapseSidebar?.();
                    showClassroomDetail(button.dataset.classroomId, true, 'room');
                });
            });
        }

        subSidebar.classList.remove('hidden');
        subSidebar.classList.add('sub-sidebar-visible');
        document.body.classList.add('sub-sidebar-open');
        updateLayout();
    }
    // Track whether the student sections inline submenu is open
    studentSectionsSubmenuOpen = false;

    document.getElementById('nav-classrooms')?.addEventListener('click', event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        const isCollapsed = document.body.classList.contains('sidebar-collapsed') && window.innerWidth >= 1024;

        if (isCollapsed) {
            renderStudentClassroomSectionsSidebar(activeStudentClassroomId, true);
        } else {
            const submenu = ensureStudentSectionsSubmenu();
            const isCurrentlyHidden = submenu ? submenu.classList.contains('hidden') : true;
            const willOpen = isCurrentlyHidden;
            studentSectionsSubmenuOpen = willOpen;
            renderStudentSectionsNavChildren(activeStudentClassroomId);
            syncStudentSectionsNavState(willOpen);
        }
    }, true);

    let studentClassroomHoverTimer = null;
    document.getElementById('nav-classrooms')?.addEventListener('mouseenter', () => {
        const isCollapsed = document.body.classList.contains('sidebar-collapsed') && window.innerWidth >= 1024;
        if (!isCollapsed) return;
        if (studentClassroomHoverTimer) clearTimeout(studentClassroomHoverTimer);
        renderStudentClassroomSectionsSidebar(activeStudentClassroomId, true);
    });

    const studentSidebarEl = document.getElementById('sidebar');
    const studentSubSidebarEl = document.getElementById('sub-sidebar');
    studentSidebarEl?.addEventListener('mouseleave', () => {
        const isCollapsed = document.body.classList.contains('sidebar-collapsed') && window.innerWidth >= 1024;
        if (!isCollapsed) return;
        studentClassroomHoverTimer = setTimeout(() => {
            hideStudentClassroomSectionsSidebar();
        }, 160);
    });
    studentSubSidebarEl?.addEventListener('mouseenter', () => {
        if (studentClassroomHoverTimer) clearTimeout(studentClassroomHoverTimer);
    });
    studentSubSidebarEl?.addEventListener('mouseleave', (e) => {
        const isCollapsed = document.body.classList.contains('sidebar-collapsed') && window.innerWidth >= 1024;
        if (!isCollapsed) return;
        if (studentSidebarEl && studentSidebarEl.contains(e.relatedTarget)) return;
        hideStudentClassroomSectionsSidebar();
    });
    function renderStudentRoomPanel(classroomId, data, announcements) {
        if (activeStudentRoomTab === 'attendance') {
            return `
                <div class="student-room-panel student-room-attendance pb-8 w-full">
                    <div class="student-attendance-split-layout">
                        <!-- Left: Attendance Table Panel -->
                        <div class="student-attendance-split-layout__table bg-white border border-slate-200 rounded-[22px] overflow-hidden standard-panel-shadow flex flex-col">
                            <!-- Monthly Navigation Header matching Teacher -->
                            <div class="attendance-monthly-header flex items-center justify-center w-full py-2.5 sm:py-3 px-4 border-b border-slate-100 bg-white relative">
                                <div class="relative inline-flex items-center gap-1 sm:gap-2">
                                    <button type="button" class="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-black hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer" onclick="window.navStudentAttendanceMonth(-1)" title="Previous Month" aria-label="Previous Month">
                                        <i class="fa-solid fa-chevron-left text-[11px] sm:text-xs text-black"></i>
                                    </button>
                                    <span id="student-attendance-month-display" class="attendance-month-display text-xs sm:text-base font-bold text-black font-['Inter'] select-none">
                                        ${studentMonthNames[studentAttendanceViewingMonth]} ${studentAttendanceViewingYear}
                                    </span>
                                    <button type="button" class="student-attendance-month-picker-btn flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full hover:bg-slate-100 text-[#15803d] hover:text-[#166534] transition-all cursor-pointer" onclick="window.toggleStudentAttendanceCalendarPopup(event)" title="Select Date / Month">
                                        <i class="fa-regular fa-calendar text-xs sm:text-sm text-[#15803d]"></i>
                                    </button>
                                    <button type="button" class="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-black hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer" onclick="window.navStudentAttendanceMonth(1)" title="Next Month" aria-label="Next Month">
                                        <i class="fa-solid fa-chevron-right text-[11px] sm:text-xs text-black"></i>
                                    </button>
                                    <div id="student-attendance-calendar-popup" class="student-attendance-calendar-popup teacher-attendance-calendar-popup hidden"></div>
                                </div>
                            </div>
                            <div class="overflow-x-auto">
                                <table class="w-full border-collapse">
                                    <thead style="background-color: #15803d !important;">
                                        <tr style="background-color: #15803d !important;" class="select-none text-white">
                                            <th class="student-attendance-heading px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter']">Date</th>
                                            <th class="student-attendance-heading px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter']">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody id="classroom-attendance-history-body" class="divide-y divide-slate-100"></tbody>
                                </table>
                            </div>
                            <div id="classroom-attendance-empty-state" class="hidden p-16 text-center">
                                <i class="fa-solid fa-calendar-xmark text-3xl text-black-fade mb-2 block"></i>
                                <p class="text-sm font-bold text-black">No Attendance Records for This Month</p>
                            </div>
                        </div>

                        <!-- Right: Attendance Stat Cards (Vertical Stack) -->
                        <div class="student-attendance-split-layout__stats">
                            <!-- Stat 1: Overall Attendance Rate -->
                            <div class="bg-white border border-slate-200 rounded-[22px] p-5 standard-panel-shadow flex items-center justify-between">
                                <div>
                                    <p class="text-xs font-semibold text-black-fade font-['Inter'] mb-1">Attendance</p>
                                    <h3 id="classroom-attendance-stat-percent" data-attendance-stat="percent" class="text-2xl font-black text-black font-['Inter'] leading-none">--</h3>
                                </div>
                                <div class="w-11 h-11 rounded-full bg-emerald-50 text-[#15803d] flex items-center justify-center text-lg shrink-0">
                                    <i class="fa-solid fa-chart-pie"></i>
                                </div>
                            </div>

                            <!-- Stat 2: Present Days -->
                            <div class="bg-white border border-slate-200 rounded-[22px] p-5 standard-panel-shadow flex items-center justify-between">
                                <div>
                                    <p class="text-xs font-semibold text-black-fade font-['Inter'] mb-1">Present</p>
                                    <h3 id="classroom-attendance-stat-present" data-attendance-stat="present" class="text-2xl font-black text-black font-['Inter'] leading-none">--</h3>
                                </div>
                                <div class="w-11 h-11 rounded-full bg-green-50 text-green-600 flex items-center justify-center text-lg shrink-0">
                                    <i class="fa-solid fa-circle-check"></i>
                                </div>
                            </div>

                            <!-- Stat 3: Late Days -->
                            <div class="bg-white border border-slate-200 rounded-[22px] p-5 standard-panel-shadow flex items-center justify-between">
                                <div>
                                    <p class="text-xs font-semibold text-black-fade font-['Inter'] mb-1">Late</p>
                                    <h3 id="classroom-attendance-stat-late" data-attendance-stat="late" class="text-2xl font-black text-black font-['Inter'] leading-none">--</h3>
                                </div>
                                <div class="w-11 h-11 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-lg shrink-0">
                                    <i class="fa-solid fa-clock"></i>
                                </div>
                            </div>

                            <!-- Stat 4: Absent Days -->
                            <div class="bg-white border border-slate-200 rounded-[22px] p-5 standard-panel-shadow flex items-center justify-between">
                                <div>
                                    <p class="text-xs font-semibold text-black-fade font-['Inter'] mb-1">Absent</p>
                                    <h3 id="classroom-attendance-stat-absent" data-attendance-stat="absent" class="text-2xl font-black text-black font-['Inter'] leading-none">--</h3>
                                </div>
                                <div class="w-11 h-11 rounded-full bg-red-50 text-red-600 flex items-center justify-center text-lg shrink-0">
                                    <i class="fa-solid fa-circle-xmark"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        const sec = data?.section || data?.name || currentStudentSection || '';
        return `
            <div id="room-announcements-feed" class="room-announcements-feed space-y-3.5 w-full">
            </div>
        `;
    }

    function renderPeopleTabContent(classroomId) {
        const data = classroomData[classroomId];
        return renderPeopleTab(data);
    }

    function renderPeopleTab(data) {
        if (!data) return '';
        const sec = data.section || data.code || 'Grade 11 - STEM A';
        const subj = data.subject || '';
        const teachers = (Array.isArray(data.teachers) && data.teachers.length > 0)
            ? data.teachers
            : (data.teacher ? [{ name: data.teacher, role: 'Teacher', isPrimary: true }] : []);
        const teacherName = teachers.map(t => (typeof t === 'string' ? t : (t.name || t.fullName || ''))).filter(Boolean)[0]
            || (typeof window.getUnifiedClassroomTeacher === 'function' ? window.getUnifiedClassroomTeacher(sec, subj) : 'Teacher');
        const classmates = (Array.isArray(data.students) && data.students.length > 0)
            ? data.students.map(s => typeof s === 'string' ? s : (s.name || `${s.lastName || ''}, ${s.firstName || ''}`.trim())).filter(Boolean)
            : ((typeof window.getUnifiedSectionStudents === 'function')
                ? window.getUnifiedSectionStudents(sec)
                : (classroomPeopleBySection[sec] || classroomPeopleBySection['Grade 11 - STEM A'] || classroomPeopleBySection['ICT-11A'] || []));

        if (typeof window.renderRoomMembersTabContent === 'function') {
            return window.renderRoomMembersTabContent({
                teacherName: teacherName,
                teachers: teachers,
                students: classmates,
                section: sec,
                subject: subj,
                role: 'student'
            });
        }
        return '';
    }
    window.backToClassrooms = function () {
        activeStudentClassroomId = '';
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.style.removeProperty('padding-top');
            mainContent.style.removeProperty('padding-bottom');
            mainContent.style.removeProperty('padding-left');
            mainContent.style.removeProperty('padding-right');
            mainContent.classList.remove('p-0', 'pt-0', 'pb-0');
        }
        if (typeof switchTab === 'function') {
            switchTab('nav-home');
        }
    };

    function renderStudentRoomSubmissions(classroomId, data) {
        const slot = document.getElementById('student-room-submissions-panel-slot');
        if (!slot) return;
        slot.innerHTML = '';

        const subjectName = (data && (data.subject || data.title || data.name)) || '';
        const cleanSubj = subjectName.toLowerCase().trim();

        const overdueAll = getStudentOverdueSubmissionItems(20);
        const dueAll = getStudentDueSubmissionItems(20);
        const upcomingAll = getStudentUpcomingSubmissionItems(20);

        const matchesSubject = (item) => {
            if (!item) return false;
            if (item.subjectId && (item.subjectId === classroomId || (data && item.subjectId === data.id))) return true;
            if (item.subject && cleanSubj && (item.subject.toLowerCase().trim() === cleanSubj || cleanSubj.includes(item.subject.toLowerCase().trim()) || item.subject.toLowerCase().trim().includes(cleanSubj))) return true;
            return false;
        };

        let overdueItems = overdueAll.filter(matchesSubject);
        let dueItems = dueAll.filter(matchesSubject);
        let upcomingItems = upcomingAll.filter(matchesSubject);

        if (window.SigmaPanels && typeof window.SigmaPanels.renderStudentSubmissionsPanel === 'function') {
            window.SigmaPanels.renderStudentSubmissionsPanel(slot, {
                overdueItems: overdueItems,
                dueItems: dueItems,
                upcomingItems: upcomingItems
            }, {
                limit: 4,
                isRoomPage: true,
                onItemClick: function (row) {
                    if (typeof window.openTopicContent === 'function') {
                        const itemIdx = (row.unifiedIdx !== undefined && row.unifiedIdx !== null) ? Number(row.unifiedIdx) : (row.itemIdx !== '' && row.itemIdx !== undefined ? Number(row.itemIdx) : null);
                        window.openTopicContent(row.subjectId || classroomId, Number(row.topicIdx || 0), 'assessments', itemIdx);
                    }
                },
                onSubjectClick: function (row) {
                    if (typeof window.openTopicContent === 'function') {
                        window.openTopicContent(row.subjectId || classroomId, Number(row.topicIdx || 0), 'assessments', null);
                    }
                }
            });
        }
    }

    window.renderRoomTopicsPanel = function () {
        const mount = document.getElementById('room-topics-mount');
        if (!mount || typeof window.buildSharedTopicPage !== 'function') return;
        const classroomId = activeStudentClassroomId;
        const card = (typeof classroomData !== 'undefined' && classroomData[classroomId]) || {};
        const subjectName = card.subject || card.name || window.currentClassroomSubject || '';
        const sectionName = card.section || card.sectionName || window.currentClassroomSectionName || '';
        const subjectId = (typeof resolveStudentTopicSubjectId === 'function')
            ? resolveStudentTopicSubjectId(classroomId, subjectName)
            : (classroomId || 'card-prog1');
        window.currentClassroomSectionName = sectionName;
        window.currentClassroomSubject = subjectName;
        if (sectionName && typeof window.rememberStudentTopicSection === 'function') {
            window.rememberStudentTopicSection(sectionName, [subjectId, subjectName].filter(Boolean).join('||'));
        }
        if (typeof window.currentTopicState !== 'undefined' || sectionName) {
            window.currentTopicState = window.currentTopicState || {};
            if (sectionName) window.currentTopicState.selectedSection = sectionName;
        }
        try {
            if (sectionName) localStorage.setItem('sigma-active-classroom-section', sectionName);
        } catch (e) {}
        const topicData = (typeof getTopicData === 'function') ? (getTopicData(subjectId) || { q1Topics: [] }) : { q1Topics: [] };
        const subject = (typeof getTopicSubject === 'function')
            ? (getTopicSubject(subjectId) || { id: subjectId, name: subjectName || 'Subject' })
            : { id: subjectId, name: subjectName || 'Subject' };
        window.buildSharedTopicPage(mount, subjectId, subject, topicData, {
            completed: 'fa-check-circle text-green-500',
            'in-progress': 'fa-circle-half-stroke text-yellow-500',
            'not-started': 'fa-circle text-gray-300',
            locked: 'fa-lock text-gray-300'
        }, false, { embedded: true, section: sectionName });
    };

    function showClassroomDetail(classroomId, pushState = true, initialTab = null) {
        scrollToTop();
        if (!classroomId) {
            if (typeof window.switchTab === 'function') window.switchTab('nav-classrooms');
            return;
        }

        let data = classroomData[classroomId];
        if (!data) {
            const enrolled = getStudentSectionClassItems();
            data = enrolled.find(c => c.id === classroomId);
        }
        if (!data) {
            const resolvedId = resolveStudentClassroomId(classroomId);
            if (resolvedId && resolvedId !== classroomId) {
                classroomId = resolvedId;
                data = classroomData[classroomId] || (getStudentSectionClassItems() || []).find(c => c.id === classroomId);
            }
        }
        if (!data) {
            const cleanSubj = String(classroomId || '').toLowerCase().trim();
            const enrolled = getStudentSectionClassItems() || [];
            const matchBySubj = enrolled.find(c => {
                const sName = String(c?.subject || '').toLowerCase().trim();
                return sName === cleanSubj || sName.includes(cleanSubj) || cleanSubj.includes(sName);
            });
            if (matchBySubj) {
                data = matchBySubj;
                classroomId = data.id;
            }
        }
        if (!data) {
            const enrolled = getStudentSectionClassItems() || [];
            if (enrolled.length > 0) {
                data = enrolled[0];
                classroomId = data.id;
            } else {
                if (typeof window.switchTab === 'function') {
                    window.switchTab('nav-classrooms');
                }
                return;
            }
        }

        activeStudentClassroomId = classroomId;
        window.activeStudentClassroomId = classroomId;
        try {
            sessionStorage.setItem('sigma-last-active-classroom', classroomId);
        } catch (e) {}

        if (initialTab === 'materials') initialTab = 'topics';
        if (initialTab) {
            if (initialTab === 'assessments') {
                activeStudentRoomTab = 'topics';
            } else {
                activeStudentRoomTab = initialTab;
            }
        } else if (!activeStudentRoomTab) {
            activeStudentRoomTab = 'room';
        }

        hideAllSections();
        showSection('section-classroom-detail');
        const detailView = document.getElementById('classroom-detail-view');
        if (detailView) {
            detailView.classList.remove('hidden');
            detailView.style.setProperty('display', 'block', 'important');
        }

        if (pushState) {
            try {
                sessionStorage.setItem('sigma-student-nav-state', JSON.stringify({ type: 'classroom', classroomId, initialTab: activeStudentRoomTab || 'room' }));
            } catch (e) {}
            const hash = `#classroom:${encodeURIComponent(classroomId)}:${activeStudentRoomTab || 'room'}`;
            const currentHash = window.location.hash || '';
            if (currentHash !== hash) {
                const historyState = { type: 'classroom', page: `classroom:${classroomId}:${activeStudentRoomTab || 'room'}`, classroomId, initialTab: activeStudentRoomTab || 'room' };
                if (window.studentHistoryScreenKey && window.studentHistoryScreenKey(currentHash) === window.studentHistoryScreenKey(hash)) {
                    history.replaceState(historyState, '', hash);
                } else {
                    history.pushState(historyState, '', hash);
                }
            }
            window.noteStudentHistoryScreen?.();
        }
        const content = document.getElementById('class-detail-content') || document.getElementById('classroom-detail-content');
        if (!content && !document.getElementById('section-classroom-detail')) return;
        const classmates = classroomPeopleBySection[data.section] || classroomPeopleBySection['Grade 11 - STEM A'] || classroomPeopleBySection['ICT-11A'] || [];
        const announcements = getSharedAnnouncements(data.sharedKey || classroomId, classroomAnnouncementById[classroomId] || []);
        const showPeoplePanel = activeStudentRoomTab === 'room';
        const subjectCoverConfig = getAdminSubjectCoverConfig(data.subject);
        const showBannerImage = subjectCoverConfig?.coverVisibleToUsers !== false;
        const bookImages = ['image/book1.jpg', 'image/book2.jpg', 'image/book3.jpg', 'image/book4.jpg',
            'image/book5.jpg', 'image/book6.jpg', 'image/book7.jpg', 'image/book8.jpg'];
        let _nameHash = 0;
        for (let i = 0; i < (data.subject || '').length; i++) _nameHash += (data.subject || '').charCodeAt(i);
        const defaultBannerImg = bookImages[_nameHash % bookImages.length];
        const bannerImage = subjectCoverConfig?.cover || defaultBannerImg;



        activeStudentClassroomId = classroomId;
        window.currentClassroomSectionName = data.section || data.name || '';
        if (window.currentClassroomSectionName && typeof window.rememberStudentTopicSection === 'function') {
            const rememberedSubjectId = (typeof resolveStudentTopicSubjectId === 'function')
                ? resolveStudentTopicSubjectId(classroomId, data.subject || data.name || '')
                : (data.subject || data.name || '');
            window.rememberStudentTopicSection(window.currentClassroomSectionName, [rememberedSubjectId, data.subject || data.name || ''].filter(Boolean).join('||'));
        }
        window.currentClassroomKey = `${data.section || ''}::${data.subject || ''}`;
        window.currentClassroomMeta = data;

        const scheduleTime = typeof data.schedule === 'string' ? data.schedule : (data.schedule?.label || '8:00 AM - 9:30 AM');
        currentStudentAttendance = {

            name: currentStudentName,

            sharedKey: data.sharedKey || classroomId,

            subject: data.subject,

            time: `April 8, 2026   ${scheduleTime.split(' ')[1]?.trim() || ''}`.trim()

        };
        // Switch to classroom detail view
        const sectionDetail = document.getElementById('section-classroom-detail');
        if (sectionDetail) { sectionDetail.classList.remove('hidden'); sectionDetail.style.display = ''; }

        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.classList.remove('pt-3', 'px-4', 'pb-4');
            mainContent.classList.add('p-0', 'pt-0', 'pb-0');
            mainContent.style.setProperty('padding-top', '0', 'important');
            mainContent.style.setProperty('padding-bottom', '0', 'important');
            mainContent.style.setProperty('padding-left', '0', 'important');
            mainContent.style.setProperty('padding-right', '0', 'important');
        }

        setNavContext('My Classes');
        const navContextText = document.getElementById('nav-context-text');
        if (navContextText) {
            navContextText.classList.remove('cursor-pointer');
            navContextText.onclick = null;
        }

        // Ensure the sidebar reflects the correct tab (Sections)
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(l => l.classList.remove('active'));
        const sectionsLink = document.getElementById('nav-classrooms');
        if (sectionsLink) sectionsLink.classList.add('active');

        // Pass false to ensure sub-sidebar doesn't auto-show on refresh/load
        renderStudentClassroomSectionsSidebar(classroomId, false);

        const bannerHtml = window.ClassroomRoom ? window.ClassroomRoom.renderBanner({
            subject: data.subject,
            section: data.section || 'Grade 11 - ICT A',
            room: data.room || 'Room 406',
            teacher: data.teacher || 'Jennifer Santos',
            schedule: scheduleTime,
            bannerImage: bannerImage,
            role: 'student'
        }) : `
            <div class="classroom-room-hero-banner relative overflow-hidden rounded-[18px] md:rounded-[24px] w-full bg-[#14532d] min-h-[195px] p-8 text-white flex items-end">
                <h1 class="text-3xl font-black">${data.subject}</h1>
            </div>
        `;

        const tabBarHtml = window.ClassroomRoom ? window.ClassroomRoom.renderTabBar({
            role: 'student',
            activeTab: activeStudentRoomTab
        }) : '';

        window.switchStudentRoomTab = function (tab, pushHistory = true) {
            const effectiveTab = tab === 'materials' ? 'topics' : (tab === 'people' ? 'members' : tab);
            if (effectiveTab === 'topics' || effectiveTab === 'assessments') {
                activeStudentRoomTab = 'topics';
                showClassroomDetail(classroomId, pushHistory, 'topics');
                return;
            }
            activeStudentRoomTab = effectiveTab;
            showClassroomDetail(classroomId, pushHistory, effectiveTab);
        };

        let tabContentHtml = '';
        if (activeStudentRoomTab === 'members' || activeStudentRoomTab === 'people') {
            tabContentHtml = `
                <div id="detail-section-members" class="classroom-tab-section">
                    ${renderPeopleTabContent(classroomId)}
                </div>
            `;
        } else if (activeStudentRoomTab === 'topics') {
            tabContentHtml = `
                <div id="detail-section-topics" class="classroom-tab-section">
                    <div id="room-topics-mount"></div>
                </div>
            `;
        } else if (activeStudentRoomTab === 'attendance') {
            tabContentHtml = `
                <div id="detail-section-attendance" class="classroom-tab-section">
                    ${renderStudentRoomPanel(classroomId, data, announcements)}
                </div>
            `;
        } else {
            tabContentHtml = `
                <div id="detail-section-room" class="classroom-room-panel classroom-tab-section">
                    <div class="classroom-room-panel__inner">
                        <div class="classroom-room-layout">
                            <div class="classroom-room-main flex-1 min-w-0 w-full">
                                ${renderStudentRoomPanel(classroomId, data, announcements)}
                            </div>

                            <!-- Right Column: Quick Links Sidebar (Desktop Mode) -->
                            <div class="student-room-sidebar classroom-room-sidebar w-full lg:w-[280px] xl:w-[320px] flex-shrink-0">
                                <div class="space-y-3.5 sticky top-6 classroom-room-sidebar__stack">
                                    <div class="home-dashboard-card !p-2 !gap-0 rounded-[22px] flex flex-col w-full flex-shrink-0">
                                        <button type="button"
                                            onclick="window.openStudentClassroomGradesModal && window.openStudentClassroomGradesModal('${escapeHtml(classroomId)}')"
                                            class="w-full py-2.5 px-3.5 rounded-xl flex items-center justify-between text-left bg-transparent hover:bg-slate-100 active:bg-slate-200 cursor-pointer font-['Inter'] transition-all">
                                            <div class="flex items-center gap-2.5">
                                                <i class="fa-solid fa-chart-simple text-[#15803d] text-sm w-4 text-center shrink-0"></i>
                                                <span class="text-xs sm:text-[13px] font-semibold text-black">View Grades</span>
                                            </div>
                                            <i class="fa-solid fa-arrow-right text-xs text-[#15803d]"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        const bannerWrapper = document.getElementById('student-classroom-banner-wrapper');
        const tabsWrapper = document.getElementById('student-classroom-tabs-wrapper');
        const classDetailContent = document.getElementById('class-detail-content');

        if (bannerWrapper && tabsWrapper && classDetailContent) {
            bannerWrapper.innerHTML = bannerHtml;
            tabsWrapper.outerHTML = tabBarHtml;
            classDetailContent.innerHTML = tabContentHtml;
        } else if (content) {
            content.innerHTML = `
                <div class="w-full flex flex-col">
                    ${bannerHtml}
                    ${tabBarHtml}

                    <div id="class-detail-content" class="classroom-detail-content">
                        ${tabContentHtml}
                    </div>
                </div>
            `;
        }

        if (activeStudentRoomTab === 'topics') {
            window.renderRoomTopicsPanel?.();
        }

        if (!activeStudentRoomTab || activeStudentRoomTab === 'room') {
            renderStudentRoomSubmissions(classroomId, data);
            const secName = data.section || data.name || currentStudentSection || '';
            const subjName = data.subject || data.name || '';
            window.currentClassroomSectionName = secName;
            window.currentClassroomSubject = subjName;
            window.currentClassroomKey = `${secName}::${subjName}`;
            if (window.SigmaAnnouncements && typeof window.SigmaAnnouncements.renderFeed === 'function') {
                window.SigmaAnnouncements.renderFeed('room-announcements-feed', 'all', secName, subjName);
            }
        }

        if (activeStudentRoomTab === 'attendance') {
            studentAttendancePage = 1;
            renderAttendanceHistoryTable('classroom-attendance-history-body', 'classroom-attendance-pagination-controls', 'classroom-attendance-empty-state', data.subject);
        }

        const detailRoot = document.getElementById('section-classroom-detail') || content;

        detailRoot.querySelectorAll('[data-room-tab]').forEach(button => {
            button.addEventListener('click', () => {
                const tab = button.dataset.roomTab;
                if (typeof window.switchStudentRoomTab === 'function') {
                    window.switchStudentRoomTab(tab);
                } else {
                    activeStudentRoomTab = tab;
                    showClassroomDetail(classroomId);
                }
            });
        });

        detailRoot.querySelectorAll('[data-room-back-btn]').forEach(btn => btn.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            if (typeof window.backToClassrooms === 'function') {
                window.backToClassrooms();
            } else if (window.switchTab) {
                window.switchTab('nav-classrooms');
            }
        }));

        detailRoot.querySelectorAll('[data-room-topic-btn]').forEach(btn => btn.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            const targetId = resolveClassroomTopicSourceId(classroomId, data);
            switchToTopicPage(targetId);
        }));

        detailRoot.querySelectorAll('[data-topic-subject-id][data-topic-index]').forEach(target => {
            target.addEventListener('click', () => {
                const subjectId = target.dataset.topicSubjectId;
                const topicIdx = Number(target.dataset.topicIndex);
                openTopicContent(subjectId, topicIdx, 'videos');
            });
        });

        detailRoot.querySelectorAll('[data-student-comment-submit]').forEach(button => {
            button.addEventListener('click', () => {
                const postId = button.dataset.studentCommentSubmit;
                const input = detailRoot.querySelector(`[data-comment-input="${postId}"]`);
                const text = input?.value.trim();
                if (!postId || !text) return;

                saveStudentAnnouncementComment(data.sharedKey, postId, text);

                showClassroomDetail(classroomId);

            });

        });



        content.querySelectorAll('[data-comment-input]').forEach(input => {

            input.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {

                    event.preventDefault();
                    const postId = input.dataset.commentInput;
                    const button = content.querySelector(`[data-student-comment-submit="${postId}"]`);

                    button?.click();

                }

            });

        });



        content.querySelectorAll('[data-student-present]').forEach(button => {

            button.addEventListener('click', () => {

                saveStudentSelfPresent(button.dataset.studentPresent);

                updateStudentAttendanceStatus(currentStudentAttendance);

                showClassroomDetail(classroomId);

            });

        });



        content.querySelectorAll('[data-student-absent-toggle]').forEach(button => {

            button.addEventListener('click', () => {
                const panel = content.querySelector('[data-student-absent-panel]');

                panel?.classList.toggle('hidden');

            });

        });



        content.querySelectorAll('[data-student-absent-files]').forEach(input => {

            input.addEventListener('change', () => {
                const list = content.querySelector('[data-student-absent-file-list]');
                const files = Array.from(input.files || []).slice(0, 10);
                if (list) {

                    list.innerHTML = files.length

                        ? files.map(file => `<span class="student-room-attendance-excuse__file-chip">${file.name}</span>`).join('')

                        : '';

                }

            });

        });



        content.querySelectorAll('[data-student-absent-submit]').forEach(button => {

            button.addEventListener('click', () => {
                const sharedKey = button.dataset.studentAbsentSubmit;
                const commentInput = content.querySelector('[data-student-absent-comment]');
                const filesInput = content.querySelector('[data-student-absent-files]');
                const comment = commentInput?.value.trim() || '';
                const files = Array.from(filesInput?.files || []).slice(0, 10).map(file => ({

                    name: file.name,

                    size: file.size,

                    type: file.type || 'file'

                }));
                if (!sharedKey) return;
                if (!comment && !files.length) return;

                saveStudentAbsentExcuse(sharedKey, comment, files);

                updateStudentAttendanceStatus(currentStudentAttendance);

                showClassroomDetail(classroomId);

            });

        });


        window.scrollTo({ top: 0 });
    }
    window.showClassroomDetail = showClassroomDetail;

    // ─── Student Classroom Grades Modal (Desktop & In-Room Shortcut) ───────────
    window.openStudentClassroomGradesModal = function (classroomId, selectedSubjectName) {
        const cId = classroomId || activeStudentClassroomId || '';
        const data = classroomData[cId] || {};
        const subjectName = selectedSubjectName || data.subject || data.name || window.currentClassroomSubject || 'Subject Grades';
        const sectionName = data.section || data.name || window.currentClassroomSectionName || currentStudentSection || '';
        const teacherName = (Array.isArray(data.teachers) && data.teachers[0]?.name) || data.teacher || (typeof window.getUnifiedClassroomTeacher === 'function' ? window.getUnifiedClassroomTeacher(sectionName, subjectName) : 'Teacher');

        // Retrieve matching grade record for this student
        const rows = typeof getSubjectGradeRows === 'function' ? getSubjectGradeRows() : [];
        let match = rows.find(r => r.id === cId || (r.subject && subjectName && r.subject.toLowerCase() === subjectName.toLowerCase())) || {
            subject: subjectName,
            teacher: teacherName,
            track: sectionName,
            term1Val: null,
            term2Val: null,
            term3Val: null,
            term4Val: null,
            overallVal: null
        };

        let existingModal = document.getElementById('student-classroom-grades-modal-overlay');
        if (existingModal) {
            existingModal.cleanupViewport?.();
            existingModal.remove();
        }

        const overlay = document.createElement('div');
        overlay.id = 'student-classroom-grades-modal-overlay';
        overlay.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-3 sm:p-6 font-[\'Inter\']';
        overlay.style.zIndex = '99999';

        const fmtGrade = (v) => {
            if (typeof v === 'number') return String(v);
            if (v && v !== '-' && v !== '--') return String(v);
            return '<span class="text-black-fade" style="color: rgba(0, 0, 0, 0.45) !important;">-</span>';
        };

        const quarterNumVals = [match.term1Val, match.term2Val, match.term3Val, match.term4Val]
            .map(v => (typeof v === 'number' ? v : parseFloat(v)))
            .filter(v => !isNaN(v) && v > 0);

        let finalGradeDisplay = '<span class="text-white/80">-</span>';
        if (typeof match.overallVal === 'number' && match.overallVal > 0) {
            finalGradeDisplay = match.overallVal % 1 === 0 ? String(match.overallVal) : match.overallVal.toFixed(1);
        } else if (quarterNumVals.length > 0) {
            const avg = quarterNumVals.reduce((a, b) => a + b, 0) / quarterNumVals.length;
            finalGradeDisplay = (avg % 1 === 0) ? String(Math.round(avg)) : avg.toFixed(1);
        }

        const qTerms = [
            { label: '1st Quarter', short: 'Q1', val: (typeof match.term1Val === 'number' ? match.term1Val : parseFloat(match.term1Val)) },
            { label: '2nd Quarter', short: 'Q2', val: (typeof match.term2Val === 'number' ? match.term2Val : parseFloat(match.term2Val)) },
            { label: '3rd Quarter', short: 'Q3', val: (typeof match.term3Val === 'number' ? match.term3Val : parseFloat(match.term3Val)) },
            { label: '4th Quarter', short: 'Q4', val: (typeof match.term4Val === 'number' ? match.term4Val : parseFloat(match.term4Val)) }
        ];

        const validQTerms = qTerms.filter(t => !isNaN(t.val) && t.val > 0);
        const hasQData = validQTerms.length > 0;
        const qAvg = hasQData ? (validQTerms.reduce((sum, t) => sum + t.val, 0) / validQTerms.length) : null;
        const qAvgDisplay = qAvg !== null ? (qAvg % 1 === 0 ? String(qAvg) : qAvg.toFixed(1)) : '<span class="text-black-fade" style="color: rgba(0, 0, 0, 0.45) !important;">-</span>';

        const hasFailingQuarter = hasQData && validQTerms.some(t => t.val < 75);
        const isOverallPassed = hasQData && !hasFailingQuarter && qAvg !== null && (qAvg >= 75);

        let aiInsightMessage = `No assessment records or quarterly grades published yet for ${escapeHtml(subjectName)}. Analytics and quarterly trends will update automatically as scores are submitted.`;
        if (hasQData) {
            const failingQuarters = validQTerms.filter(t => t.val < 75);
            if (failingQuarters.length > 0) {
                const failingNames = failingQuarters.map(t => t.short).join(', ');
                aiInsightMessage = `Attention required: ${failingNames} ${failingQuarters.length === 1 ? 'is' : 'are'} currently below the 75 passing standard. Focus on upcoming deliverables and remedial tasks to improve overall standing.`;
            } else if (qAvg >= 90) {
                aiInsightMessage = `Outstanding academic mastery in ${escapeHtml(subjectName)}! The student maintains an honors-tier trajectory (${qAvg.toFixed(1)} average) with consistent performance across quarterly learning competencies.`;
            } else if (qAvg >= 85) {
                aiInsightMessage = `Very satisfactory academic performance in ${escapeHtml(subjectName)} with a current average of ${qAvg.toFixed(1)}. Maintaining steady progress on performance tasks and periodical assessments will help push into the 90+ honors tier.`;
            } else {
                aiInsightMessage = `Satisfactory academic standing in ${escapeHtml(subjectName)} (Average: ${qAvg.toFixed(1)}). Focus on upcoming quarterly topics and performance tasks to reinforce comprehension and elevate overall standing.`;
            }
        }

        const assessmentRows = window.AssessmentsPage?.buildAssessmentRows?.('student') || [];
        const normalizeAssessmentScope = value => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
        const assessmentBars = assessmentRows.filter(row =>
            normalizeAssessmentScope(row.section) === normalizeAssessmentScope(sectionName)
            && normalizeAssessmentScope(row.subject) === normalizeAssessmentScope(subjectName)
        ).map(row => {
            const hasScore = row.score !== null && row.score !== undefined
                && String(row.score).trim() !== '' && Number.isFinite(Number(row.score));
            const scored = hasScore
                && row.max !== null && row.max !== ''
                && Number.isFinite(Number(row.max)) && Number(row.max) > 0;
            return { label: row.activity || 'Assessment',
                quarter: String(row.quarter || '').toLowerCase().replace(/^q/, ''),
                score: hasScore ? Number(row.score) : null,
                maximum: scored ? Number(row.max) : null,
                val: scored ? Math.max(0, Math.min(100, Number(row.score) / Number(row.max) * 100)) : null };
        });
        aiInsightMessage = 'No AI assessment insight available yet.';
        const configuredQuarters = Array.isArray(match.activeQuarters) && match.activeQuarters.length
            ? match.activeQuarters
            : (Array.isArray(data.activeQuarters) && data.activeQuarters.length ? data.activeQuarters : ['q1', 'q2']);
        const availableAssessmentQuarters = [...new Set(configuredQuarters.map(quarter =>
            Number(String(quarter).trim().toLowerCase().replace(/^q/, ''))
        ).filter(quarter => Number.isInteger(quarter) && quarter >= 1 && quarter <= 4))].sort((a, b) => a - b);

        overlay.innerHTML = `
            <div class="curriculum-hub-panel curriculum-release-panel-fixed w-full !max-w-[860px] flex flex-col overflow-hidden font-['Inter'] rounded-2xl sm:rounded-3xl shadow-2xl" style="height: auto; max-height: min(740px, calc(100dvh - 24px)); max-width: 860px;" onclick="event.stopPropagation()">
                <!-- Modal Header -->
                <div class="px-4 sm:px-8 py-3.5 sm:py-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0 font-['Inter']">
                    <div class="flex items-center gap-2 min-w-0">
                        <button type="button" class="student-grades-modal-back" aria-label="Back" title="Back" onclick="window.closeStudentClassroomGradesModal()"><i class="fa-solid fa-chevron-left" aria-hidden="true"></i></button>
                    <div class="min-w-0">
                        <h2 class="text-base sm:text-xl font-bold text-black font-['Inter'] tracking-tight truncate">Grades</h2>
                    </div>
                    </div>
                </div>

                <!-- Modal Body (Scrollable) -->
                <div class="student-grades-modal-body p-3.5 sm:p-8 overflow-y-auto space-y-3.5 sm:space-y-5 flex-1 custom-scrollbar font-['Inter']">
                    <!-- Final Grade Summary Card (Shared Green Background & White Text) -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4 font-['Inter']">
                        <div class="p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-[#15803d] text-white flex flex-col shadow-xs font-['Inter']">
                            <span class="text-[11px] sm:text-xs font-semibold text-white/90 font-['Inter']">Final Grade</span>
                            <span class="text-xl sm:text-3xl font-black text-white mt-0.5 sm:mt-1 font-['Inter'] leading-tight">${finalGradeDisplay}</span>
                        </div>
                    </div>

                    <!-- Quarterly Grades Table -->
                    <div class="border border-slate-200 rounded-xl sm:rounded-2xl overflow-hidden bg-white shadow-xs font-['Inter']">
                        <table class="w-full text-left border-collapse text-xs font-['Inter'] table-fixed">
                            <thead>
                                <tr class="bg-[#15803d] text-white select-none">
                                    <th class="w-1/4 px-2 py-3 sm:py-3.5 font-semibold text-white tracking-normal font-['Inter'] text-center border-r border-[#166534] text-xs sm:text-xs" style="border-right: 1px solid #166534 !important;"><span class="sigma-mobile-only">Q1</span><span class="sigma-desktop-only">1st Quarter</span></th>
                                    <th class="w-1/4 px-2 py-3 sm:py-3.5 font-semibold text-white tracking-normal font-['Inter'] text-center border-r border-[#166534] text-xs sm:text-xs" style="border-right: 1px solid #166534 !important;"><span class="sigma-mobile-only">Q2</span><span class="sigma-desktop-only">2nd Quarter</span></th>
                                    <th class="w-1/4 px-2 py-3 sm:py-3.5 font-semibold text-white tracking-normal font-['Inter'] text-center border-r border-[#166534] text-xs sm:text-xs" style="border-right: 1px solid #166534 !important;"><span class="sigma-mobile-only">Q3</span><span class="sigma-desktop-only">3rd Quarter</span></th>
                                    <th class="w-1/4 px-2 py-3 sm:py-3.5 font-semibold text-white tracking-normal font-['Inter'] text-center text-xs sm:text-xs" style="border-right: none !important;"><span class="sigma-mobile-only">Q4</span><span class="sigma-desktop-only">4th Quarter</span></th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 font-['Inter']">
                                <tr class="hover:bg-slate-50/80 transition-colors">
                                    <td class="w-1/4 px-2 py-4 sm:py-5 text-center font-bold text-slate-900 border-none text-sm sm:text-base align-middle" style="border-right: none !important; border-left: none !important;">${fmtGrade(match.term1Val)}</td>
                                    <td class="w-1/4 px-2 py-4 sm:py-5 text-center font-bold text-slate-900 border-none text-sm sm:text-base align-middle" style="border-right: none !important; border-left: none !important;">${fmtGrade(match.term2Val)}</td>
                                    <td class="w-1/4 px-2 py-4 sm:py-5 text-center font-bold text-slate-900 border-none text-sm sm:text-base align-middle" style="border-right: none !important; border-left: none !important;">${fmtGrade(match.term3Val)}</td>
                                    <td class="w-1/4 px-2 py-4 sm:py-5 text-center font-bold text-slate-900 border-none text-sm sm:text-base align-middle" style="border-right: none !important; border-left: none !important;">${fmtGrade(match.term4Val)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- Full Width Subject Performance Analytics (Quarterly Horizontal Bar Chart) -->
                    <div class="border border-slate-200 rounded-xl sm:rounded-2xl bg-white shadow-xs font-['Inter'] overflow-hidden">
                        <div class="px-4 sm:px-6 py-3 sm:py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-2 font-['Inter']">
                            <div class="flex items-center gap-2 sm:gap-2.5 font-['Inter'] min-w-0 flex-1">
                                <div class="w-6 h-6 sm:w-7 sm:h-7 bg-[#15803d] rounded-lg flex items-center justify-center text-white shadow-xs font-['Inter'] shrink-0">
                                    <i class="fa-solid fa-chart-simple text-[11px] sm:text-xs"></i>
                                </div>
                                <div class="min-w-0 flex-1">
                                    <h3 class="text-xs sm:text-sm font-bold text-slate-900 leading-tight font-['Inter'] truncate">Assessment Performance</h3>
                                </div>
                            </div>
                            <select class="student-assessment-quarter-select" aria-label="Assessment quarter" style="font-size:12px; color:#000; background:white; border:1px solid #e2e8f0; border-radius:6px; padding:5px 8px; flex-shrink:0; max-width:120px; cursor:pointer;">
                                <option value="all">All Quarters</option>
                                ${availableAssessmentQuarters.map(quarter => `<option value="${quarter}">Q${quarter}</option>`).join('')}
                            </select>
                        </div>

                        <div class="p-4 sm:p-6 font-['Inter']" style="min-width:0;">
                            <div style="width:100%; min-width:0;">
                            <!-- Horizontal Bar Chart -->
                            <div class="space-y-3.5 sm:space-y-4 font-['Inter']">
                                ${assessmentBars.length ? assessmentBars.map(q => {
                                    const hasVal = Number.isFinite(q.val);
                                    const pct = hasVal ? Math.min(100, Math.max(0, q.val)) : 0;
                                    const isPassing = hasVal && q.val >= 75;
                                    const barColor = isPassing ? 'bg-[#15803d]' : (hasVal ? 'bg-amber-500' : 'bg-slate-200');
                                    return `
                                        <div class="student-assessment-quarter-row font-['Inter']" data-quarter="${escapeHtml(q.quarter)}">
                                            <div class="text-left mb-2">
                                                <span class="student-assessment-bar-label text-[11px] sm:text-xs font-medium font-['Inter']" style="color:#000000 !important; overflow-wrap:anywhere;">${escapeHtml(q.label)}</span>
                                            </div>
                                            <div class="flex items-center gap-2.5 sm:gap-4">
                                            <div class="student-assessment-progress-bar flex-1 relative flex items-center bg-black/[0.04] rounded-full overflow-hidden" style="min-width:0; height:24px; background-color: rgba(0, 0, 0, 0.04) !important;" ${hasVal ? `role="progressbar" aria-label="${escapeHtml(q.label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"` : ''}>
                                                ${hasVal ? `
                                                    <div class="h-full rounded-full ${barColor} transition-all duration-500" style="width: ${pct}%;"></div>
                                                ` : `
                                                    <div class="h-full w-0"></div>
                                                `}
                                                ${hasVal ? `<span style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:none; color:#222222 !important; font-size:10px; line-height:16px; font-weight:500;">${Math.round(q.val)}%</span>${isPassing ? `<span aria-hidden="true" style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:none; color:#ffffff !important; font-size:10px; line-height:16px; font-weight:500; clip-path:inset(0 ${100 - pct}% 0 0);">${Math.round(q.val)}%</span>` : ''}` : ''}
                                            </div>
                                            <div class="flex-shrink-0 text-right" style="min-width:48px; max-width:40%; overflow-wrap:anywhere;">
                                                <span class="text-xs sm:text-sm font-['Inter']">
                                                    ${Number.isFinite(q.score) ? `<span class="font-medium text-slate-900">${q.score}${Number.isFinite(q.maximum) ? `/${q.maximum}` : ''}</span>` : '<span class="text-black-fade font-medium" style="color: rgba(0, 0, 0, 0.45) !important;">-</span>'}
                                                </span>
                                            </div>
                                            </div>
                                        </div>
                                    `;
                                }).join('') : '<p class="text-xs text-black-fade">No assessments available for this subject.</p>'}
                                <p class="student-assessment-quarter-empty text-xs text-black-fade" hidden>No assessments for this quarter.</p>
                            </div>

                            </div>
                        </div>
                    </div>

                    <!-- AI Subject Insights Box -->
                    <div class="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-emerald-50/70 border border-emerald-100 flex flex-col font-['Inter'] shadow-xs">
                        <div class="flex items-center gap-2 mb-1.5 sm:mb-2 font-['Inter']">
                            <div class="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-[#FFD000] flex items-center justify-center flex-shrink-0 shadow-2xs font-['Inter']">
                                <i class="fa-solid fa-bolt text-black text-[10px] sm:text-[11px]"></i>
                            </div>
                            <span class="text-xs sm:text-[13px] font-bold text-black font-['Inter']" style="color: #000000 !important;">SIGMA AI Assessment Insights</span>
                        </div>
                        <p class="text-[11.5px] sm:text-xs font-medium leading-relaxed font-['Inter'] ${hasQData ? 'text-slate-700' : 'text-black-fade'}" ${!hasQData ? 'style="color: rgba(0, 0, 0, 0.45) !important;"' : ''}>
                            ${aiInsightMessage}
                        </p>
                    </div>
                </div>

                <!-- Modal Footer -->
                ${typeof window.renderSigmaModalFooter === 'function' ? window.renderSigmaModalFooter({
                    cancelText: 'Close',
                    cancelBtnClass: 'student-grades-modal-close sigma-btn sigma-btn-white sigma-modal-btn',
                    cancelOnClick: 'window.closeStudentClassroomGradesModal()',
                    confirmText: 'View Analytics',
                    mobileConfirmText: 'View Analytics',
                    confirmOnClick: "window.viewSubjectGrades && window.viewSubjectGrades('" + String(cId || '').replace(/'/g, "\\'") + "', '" + String(subjectName || '').replace(/'/g, "\\'") + "');",
                    confirmIcon: ''
                }) : `
                <div class="sigma-modal-footer">
                    <button type="button" class="student-grades-modal-close sigma-btn sigma-btn-white sigma-modal-btn" onclick="window.closeStudentClassroomGradesModal()">
                        Close
                    </button>
                    <button type="button" class="sigma-btn sigma-btn-primary sigma-modal-btn" onclick="window.viewSubjectGrades && window.viewSubjectGrades('${String(cId || '').replace(/'/g, "\\'")}', '${String(subjectName || '').replace(/'/g, "\\'")}');">
                        <span>View Analytics</span>
                    </button>
                </div>
                `}
            </div>
        `;

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) window.closeStudentClassroomGradesModal();
        });

        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';
        overlay.querySelector('.student-assessment-quarter-select')?.addEventListener('change', event => {
            let visible = 0;
            overlay.querySelectorAll('.student-assessment-quarter-row').forEach(row => {
                const included = event.target.value === 'all' || row.dataset.quarter === event.target.value;
                row.hidden = !included;
                row.style.display = included ? '' : 'none';
                if (included) visible++;
            });
            overlay.querySelector('.student-assessment-quarter-empty').hidden = visible > 0 || event.target.value === 'all';
        });
        const viewport = window.visualViewport;
        const syncViewport = () => {
            overlay.style.setProperty('--grades-viewport-height', `${viewport ? viewport.height : window.innerHeight}px`);
            overlay.style.setProperty('--grades-viewport-top', `${viewport ? viewport.offsetTop : 0}px`);
        };
        syncViewport();
        viewport?.addEventListener('resize', syncViewport);
        viewport?.addEventListener('scroll', syncViewport);
        window.addEventListener('resize', syncViewport);
        overlay.cleanupViewport = () => {
            viewport?.removeEventListener('resize', syncViewport);
            viewport?.removeEventListener('scroll', syncViewport);
            window.removeEventListener('resize', syncViewport);
        };
    };

    window.closeStudentClassroomGradesModal = function () {
        const overlay = document.getElementById('student-classroom-grades-modal-overlay');
        if (overlay) {
            overlay.cleanupViewport?.();
            overlay.remove();
        }
        document.body.style.overflow = '';
    };

    window.activeStudentGradeSubjectFilter = null;

    window.viewSubjectGrades = function (classroomId, subjectName) {
        comparingSubjectIds = null;
        selectingComparisonSubjects = false;
        if (typeof window.closeStudentClassroomGradesModal === 'function') {
            window.closeStudentClassroomGradesModal();
        }
        window.activeStudentGradeSubjectFilter = {
            id: classroomId || '',
            name: subjectName || ''
        };
        if (typeof switchTab === 'function') {
            switchTab('nav-grades');
        } else if (typeof renderGradesPage === 'function') {
            renderGradesPage();
        }
        requestAnimationFrame(() => {
            document.querySelector('#grades-layout .student-performance-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    };

    window.clearStudentGradeSubjectFilter = function () {
        comparingSubjectIds = null;
        selectingComparisonSubjects = false;
        window.activeStudentGradeSubjectFilter = null;
        if (typeof renderGradesPage === 'function') {
            renderGradesPage();
        }
    };
    window.addEventListener('storage', (e) => {
        if (!e || !e.key) return;

        if (e.key === 'sigma-announcements-posts' || e.key === 'sigma-classroom-announcements-v2') {
            renderStudentHomeAnnouncements();
        }

        if (e.key === 'sigma-attendance-records-v1') {
            updateStudentAttendanceStatus();
            if (typeof renderStudentAttendanceHistory === 'function') {
                renderStudentAttendanceHistory();
            }
            const clsAttendanceBody = document.getElementById('classroom-attendance-history-body');
            if (clsAttendanceBody) {
                const cSubj = (activeStudentClassroomId && window.classroomData ? window.classroomData[activeStudentClassroomId]?.subject : null) || activeAttendanceSubjectFilter;
                renderAttendanceHistoryTable('classroom-attendance-history-body', 'classroom-attendance-pagination-controls', 'classroom-attendance-empty-state', cSubj);
            }
            const stdAttendanceBody = document.getElementById('student-attendance-history-body');
            if (stdAttendanceBody && typeof renderAttendanceHistoryTable === 'function') {
                renderAttendanceHistoryTable('student-attendance-history-body', 'student-attendance-pagination-controls', 'student-attendance-empty-state', activeAttendanceSubjectFilter);
            }
        }

        if (e.key === 'sigma-admin-sections' || e.key === 'sigma-classroom-materials-v1' || e.key === 'sigma_released_videos') {
            const detailSection = document.getElementById('section-classroom-detail');
            if (activeStudentClassroomId && detailSection && !detailSection.classList.contains('hidden')) {
                const currentScroll = window.scrollY;
                showClassroomDetail(activeStudentClassroomId);
                window.scrollTo({ top: currentScroll });
            }
        }
    });

    window.addEventListener('sigma:attendance-changed', () => {
        updateStudentAttendanceStatus();
        if (typeof renderStudentAttendanceHistory === 'function') {
            renderStudentAttendanceHistory();
        }
        const clsAttendanceBody = document.getElementById('classroom-attendance-history-body');
        if (clsAttendanceBody) {
            const cSubj = (activeStudentClassroomId && window.classroomData ? window.classroomData[activeStudentClassroomId]?.subject : null) || activeAttendanceSubjectFilter;
            renderAttendanceHistoryTable('classroom-attendance-history-body', 'classroom-attendance-pagination-controls', 'classroom-attendance-empty-state', cSubj);
        }
        const stdAttendanceBody = document.getElementById('student-attendance-history-body');
        if (stdAttendanceBody && typeof renderAttendanceHistoryTable === 'function') {
            renderAttendanceHistoryTable('student-attendance-history-body', 'student-attendance-pagination-controls', 'student-attendance-empty-state', activeAttendanceSubjectFilter);
        }
    });
    //  

    window.addEventListener('pageshow', () => {
        if (typeof renderStudentHomeDashboardPanels === 'function') renderStudentHomeDashboardPanels();
        if (typeof renderInstitutionalAnnouncements === 'function') renderInstitutionalAnnouncements();
    });
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            if (typeof renderStudentHomeDashboardPanels === 'function') renderStudentHomeDashboardPanels();
            if (typeof renderInstitutionalAnnouncements === 'function') renderInstitutionalAnnouncements();
        }
    });
    const rawHash = (window.location.hash || '').replace(/^#/, '').trim();
    const savedState = JSON.parse(sessionStorage.getItem('sigma-student-nav-state') || localStorage.getItem('sigma-student-nav-state') || 'null');
    let initialPage = resolvePageStateFromLocation(history.state);

    if (!rawHash) {
        if (savedState && savedState.page && savedState.page !== 'home') {
            if (savedState.type === 'tab') initialPage = savedState.page;
            else if (savedState.type === 'classroom') initialPage = `classroom:${savedState.classroomId}:${savedState.initialTab || 'room'}`;
            else if (savedState.type === 'topic') initialPage = `topic:${savedState.subjectId}`;
            else if (savedState.type === 'topic-content') initialPage = savedState.page;
        } else {
            initialPage = 'home';
            try {
                sessionStorage.setItem('sigma-student-nav-state', JSON.stringify({
                    type: 'tab',
                    page: 'home',
                    navId: 'nav-home'
                }));
            } catch (e) {}
        }
    } else {
        initialPage = resolvePageStateFromLocation(history.state);
    }

    const targetHash = window.location.hash || (initialPage === 'home' ? '#home' : `#${initialPage}`);

    if (!history.state?.page) {
        if (initialPage.startsWith('topic-content:')) {
            const parts = initialPage.replace(/^topic-content:/, '').split(':');
            const subjectId = parts[0];
            const topicIdx = parseInt(parts[1]) || 0;
            const tab = parts[2] || 'videos';
            const rawVIdx = parts[3];
            const videoIdx = (rawVIdx === 'null' || rawVIdx === 'undefined' || !rawVIdx) ? null : parseInt(rawVIdx);

            history.replaceState(
                { page: initialPage, subjectId, topicIdx, tab, videoIdx },
                '',
                `${window.location.pathname}${window.location.search}${targetHash}`
            );
        } else if (initialPage.startsWith('topic:')) {
            const subjectId = initialPage.replace(/^topic:/, '');
            history.replaceState(
                { page: initialPage, subjectId },
                '',
                `${window.location.pathname}${window.location.search}${targetHash}`
            );
        } else if (initialPage.startsWith('classroom:') || initialPage.startsWith('classroom-')) {
            history.replaceState(
                { page: initialPage, type: 'classroom' },
                '',
                `${window.location.pathname}${window.location.search}${targetHash}`
            );
        } else {
            history.replaceState(
                { page: initialPage, type: 'tab', navId: navIdByPage[initialPage] || 'nav-home' },
                '',
                `${window.location.pathname}${window.location.search}${targetHash}`
            );
        }
    }
    const featureNotifications = [
        { icon: 'fa-solid fa-graduation-cap', title: 'Grade Update', message: 'Your final grade for Computer Programming 1 has been posted.', nav: 'nav-grades' },
        { icon: 'fa-solid fa-calendar-check', title: 'Attendance Alert', message: 'You have been marked present for all classes today.', nav: 'nav-home' },
        { icon: 'fa-solid fa-clipboard-list', title: 'New Quiz', message: 'Teacher Sarah Lim posted a new quiz in Web Development 1.', nav: 'nav-assignments' },
        { icon: 'fa-solid fa-envelope', title: 'New Message', message: 'You have an unread message from Prof. Maria Clara.', nav: 'nav-home' }
    ];
    function buildScheduleNotifications() {
        const notifList = document.getElementById('noti-dropdown');
        const notifBadge = document.getElementById('noti-badge');
        if (!notifList) return;
        const container = notifList.querySelector('.overflow-y-auto > div');
        if (!container) return;
        let html = '';
        featureNotifications.forEach(item => {
            html += `
                <div class="notif-item px-4 py-4 hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-100 rounded-xl mb-2 transition-all" 
                     data-nav="${item.nav}">
                    <div class="flex gap-4 items-start">
                        <div class="w-10 h-10 bg-white rounded-full flex items-center justify-center text-black text-sm shadow-sm border border-slate-200/60">
                            <i class="${item.icon}"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-[13px] font-bold text-gray-800 leading-tight font-['Inter']">${item.title}</p>
                            <p class="text-[12px] text-gray-500 mt-1 font-['Inter']">${item.message}</p>
                        </div>
                    </div>
                </div>`;
        });

        container.innerHTML = html;

        container.querySelectorAll('.notif-item[data-nav]').forEach(item => {
            item.addEventListener('click', () => {
                switchTab(item.dataset.nav);
                hideHeaderOverlays();
            });
        });
        if (notifBadge) notifBadge.classList.toggle('hidden', featureNotifications.length === 0);
    }

    syncStudentEnrolledClassrooms();
    renderStudentSectionsNavChildren('');

    window.addEventListener('storage', (e) => {
        if (e.key === 'sigma-admin-sections' || e.key === 'sigma-admin-users') {
            syncStudentEnrolledClassrooms();
            renderStudentSectionsNavChildren(activeStudentClassroomId);
            if (typeof renderStudentHomeDashboardPanels === 'function') {
                renderStudentHomeDashboardPanels();
            }
        }
    });
    window.addEventListener('sigma:section-deployed', () => {
        syncStudentEnrolledClassrooms();
        renderStudentSectionsNavChildren(activeStudentClassroomId);
        if (typeof renderStudentHomeDashboardPanels === 'function') {
            renderStudentHomeDashboardPanels();
        }
    });

    try {
        applyHistoryPage(initialPage);
    } catch (err) {
        console.error('[StudentPortal] Failed to apply initial page, falling back to home:', err);
        _applyTab('nav-home');
    }

    initCalendarEvents();
    renderStudentHomeAnnouncements();
    renderStudentHomeDashboardPanels();
    updateStudentAttendanceStatus();

    // Defer heavy secondary tabs that are not visible on initial load
    const deferSecondaryTabs = () => {
        if (initialPage === 'assignments') {
            renderAssessmentsPage();
        } else if (initialPage === 'grades') {
            renderGradesPage();
        } else if (initialPage === 'courses') {
            renderClassroomsGrid();
        }
        buildScheduleNotifications();
    };

    if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(deferSecondaryTabs, { timeout: 800 });
    } else {
        setTimeout(deferSecondaryTabs, 20);
    }

    setInterval(buildScheduleNotifications, 60000);

    function renderClassroomsGrid() {
        if (window.SectionsPanel && typeof window.SectionsPanel.render === 'function') {
            window.SectionsPanel.render('student');
            return;
        }
        const grid = document.getElementById('classrooms-grid');
        if (!grid) return;
        grid.classList.remove('hidden');
        grid.style.setProperty('display', 'grid', 'important');
        const gridWrapper = document.getElementById('classrooms-grid-wrapper');
        if (gridWrapper) gridWrapper.classList.remove('hidden');
        if (typeof initCardSortable === 'function') initCardSortable();
    }
    // --- Card Drag & Drop (SortableJS) ---
    function initCardSortable() {
        if (window.SectionsPanel && typeof window.SectionsPanel.initSortable === 'function') {
            window.SectionsPanel.initSortable('student');
        }
    }
    initCardSortable();
    // Subjects tab hover subsidebar disabled   no hover popup
    function initSubjectsHoverSubsidebar() {
        // Hover sub-sidebar removed per design requirement
    }

    initSubjectsHoverSubsidebar();
    // ... (rest of the code remains the same)


    //   Global Search Functionality (Matched with Admin)  

    const searchBar = document.getElementById('searchBar');
    const searchBtn = document.getElementById('globalSearchBtn');
    const triggerGlobalSearch = () => {
        const query = (searchBar?.value || '').trim();
        const visibleSection = Array.from(document.querySelectorAll('.dynamic-section:not(.hidden)'))[0];
        if (!visibleSection) return;
        const sectionId = visibleSection.id;
        // Keep dashboard panels fresh when searching from Home.

        if (sectionId === 'section-home') {
            renderStudentHomeDashboardPanels();

        }

    };
    if (searchBar) {

        searchBar.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {

                e.preventDefault();

                triggerGlobalSearch();

            }

        });

    }
    if (searchBtn) {
        searchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            triggerGlobalSearch();
        });
    }
    // Mobile Search Toggle
    document.querySelector('.header-search-shell')?.addEventListener('click', (e) => {
        if (window.innerWidth < 1024) {
            const header = document.getElementById('student-header');
            if (!header?.classList.contains('mobile-search-active')) {
                header?.classList.add('mobile-search-active');
                searchBar?.focus();
            }
        }
    });
    // Mobile Search Back Button
    document.getElementById('mobileSearchBackBtn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('student-header')?.classList.remove('mobile-search-active');
        if (searchBar) searchBar.value = '';
    });
    // Close mobile search if clicking outside
    document.addEventListener('mousedown', (e) => {
        if (window.innerWidth < 1024) {
            const header = document.getElementById('student-header');
            const searchShell = document.querySelector('.header-search-shell');
            if (header?.classList.contains('mobile-search-active') && !searchShell?.contains(e.target)) {
                header?.classList.remove('mobile-search-active');
            }
        }
    });
    // Global function to locate current curriculum subject
    window.locateCurriculumSubject = function () {
        // Try to get the current subject from various sources
        const activeElement = document.querySelector('.topic-content-nav-item.active');
        if (activeElement && activeElement.dataset.subjectId) {
            const subjectId = activeElement.dataset.subjectId;
            // Check core subjects
            const coreMatch = curriculumPrograms['core-subjects']?.subjects?.find(item => item.id === subjectId);
            if (coreMatch) {
                return { programKey: 'core-subjects', subjectId };
            }
            // Check applied subjects
            const appliedMatch = curriculumPrograms['applied-subjects']?.subjects?.find(item => item.id === subjectId);
            if (appliedMatch) {
                return { programKey: 'applied-subjects', subjectId };
            }
            // Check specialized subjects
            const specializedMatch = curriculumPrograms['specialized-subjects']?.subjects?.find(item => item.id === subjectId);
            if (specializedMatch) {
                return { programKey: 'specialized-subjects', subjectId };
            }
        }
        return null;
    };

    // --- MOBILE APP BAR LOGIC (Ported from Teacher) ---
    const mobileAppBar = document.getElementById('mobile-bottom-appbar');
    const profileBtn = document.getElementById('mobile-appbar-profile');
    const calendarBtn = document.getElementById('mobile-appbar-calendar');
    const sigmaBtn = document.getElementById('mobile-appbar-sigma');
    const notiBtn = document.getElementById('mobile-appbar-notifications');
    const sigmaSheet = document.getElementById('mobile-sigma-sheet');
    const sigmaBackdrop = document.getElementById('mobile-sigma-sheet-backdrop');
    const sigmaClose = document.getElementById('mobile-sigma-sheet-close');
    const sigmaCards = document.getElementById('mobile-sigma-cards');

    if (sigmaSheet && sigmaBackdrop && sigmaCards) {
        const isMobile = () => window.innerWidth <= 1023;

        const updateMobileAppBarActiveState = () => {
            if (!mobileAppBar || !isMobile()) return;
            [profileBtn, calendarBtn, sigmaBtn, notiBtn].forEach(btn => btn?.classList.remove('active'));

            if (sigmaSheet && sigmaSheet.classList.contains('open')) {
                sigmaBtn?.classList.add('active');
                return;
            }

            const openPanel = document.querySelector('.mobile-pull-up-panel.open');
            if (openPanel) {
                if (openPanel.id === 'mobile-calendar-panel') calendarBtn?.classList.add('active');
                if (openPanel.id === 'mobile-noti-panel') notiBtn?.classList.add('active');
                return;
            }

            const profileView = document.getElementById('user-profile-view');
            if (profileView && window.getComputedStyle(profileView).display !== 'none' && !profileView.classList.contains('hidden')) {
                profileBtn?.classList.add('active');
            }
        };

        window.updateMobileAppBarActiveState = updateMobileAppBarActiveState;

        const hydrateSigmaCards = () => {
            sigmaCards.innerHTML = '';
            const source = document.getElementById('sigma-panels-container');
            if (!source) return;
            const cards = Array.from(source.children || []);
            cards.forEach((card, index) => {
                const clone = card.cloneNode(true);
                clone.classList.remove('cursor-grab', 'select-none');
                clone.dataset.id = card.dataset.id || `sigma-card-${index}`;
                sigmaCards.appendChild(clone);
            });
        };

        const openSigmaSheet = () => {
            if (!isMobile()) return;
            document.querySelectorAll('.mobile-pull-up-panel').forEach(p => p.classList.remove('open'));
            sigmaSheet.classList.add('open');
            sigmaBackdrop.classList.add('open');
            hydrateSigmaCards();

            // Auto-reset scroll position
            const cardsContainer = document.getElementById('mobile-sigma-cards');
            if (cardsContainer) cardsContainer.scrollTop = 0;

            updateMobileAppBarActiveState();
        };

        const closeSigmaSheet = () => {
            sigmaSheet.classList.remove('open');
            sigmaBackdrop.classList.remove('open');
            updateMobileAppBarActiveState();
        };

        window.closeMobilePanel = (id) => {
            document.getElementById(id)?.classList.remove('open');
            if (!sigmaSheet.classList.contains('open') && !document.querySelector('.mobile-pull-up-panel.open')) {
                sigmaBackdrop.classList.remove('open');
            }
            updateMobileAppBarActiveState();
        };

        const openMobilePanel = (id) => {
            if (!isMobile()) return;
            document.querySelectorAll('.mobile-pull-up-panel').forEach(p => p.classList.remove('open'));
            closeSigmaSheet();

            const panelEl = document.getElementById(id);
            if (panelEl) {
                panelEl.classList.add('open');
                // Auto-reset scroll position
                panelEl.scrollTop = 0;
                const scrollContainers = panelEl.querySelectorAll('.mobile-pull-up-content, .overflow-y-auto, .overflow-y-scroll');
                scrollContainers.forEach(container => container.scrollTop = 0);
            }

            sigmaBackdrop.classList.add('open');
            updateMobileAppBarActiveState();
        };

        profileBtn?.addEventListener('click', () => {
            closeSigmaSheet();
            document.querySelectorAll('.mobile-pull-up-panel').forEach(p => p.classList.remove('open'));
            sigmaBackdrop.classList.remove('open');
            _applyTab('nav-profile');
            updateMobileAppBarActiveState();
        });

        calendarBtn?.addEventListener('click', () => {
            if (document.getElementById('mobile-calendar-panel')?.classList.contains('open')) {
                window.closeMobilePanel('mobile-calendar-panel');
            } else {
                openMobilePanel('mobile-calendar-panel');
            }
        });

        sigmaBtn?.addEventListener('click', () => {
            if (sigmaSheet.classList.contains('open')) {
                closeSigmaSheet();
            } else {
                openSigmaSheet();
            }
        });

        notiBtn?.addEventListener('click', () => {
            if (document.getElementById('mobile-noti-panel')?.classList.contains('open')) {
                window.closeMobilePanel('mobile-noti-panel');
            } else {
                openMobilePanel('mobile-noti-panel');
            }
        });

        sigmaClose?.addEventListener('click', closeSigmaSheet);
        sigmaBackdrop?.addEventListener('click', () => {
            closeSigmaSheet();
            document.querySelectorAll('.mobile-pull-up-panel').forEach(p => p.classList.remove('open'));
            sigmaBackdrop.classList.remove('open');
            updateMobileAppBarActiveState();
        });

        const bindPullDownToClose = (panel, closeFn) => {
            if (!panel) return;
            let startY = 0;
            let latestY = 0;
            let dragging = false;

            const canStartDrag = target => {
                if (target.closest('button, a, input, select, textarea, [contenteditable="true"]')) return false;
                return Boolean(target.closest('.mobile-pull-up-header, .mobile-sigma-sheet__head, .mobile-sigma-sheet__grab'));
            };

            panel.addEventListener('pointerdown', event => {
                if (!isMobile() || !panel.classList.contains('open') || !canStartDrag(event.target)) return;
                dragging = true;
                startY = event.clientY;
                latestY = startY;
                panel.style.transition = 'none';
                panel.setPointerCapture?.(event.pointerId);
            });

            panel.addEventListener('pointermove', event => {
                if (!dragging) return;
                latestY = event.clientY;
                const deltaY = Math.max(0, latestY - startY);
                panel.style.transform = `translateY(${deltaY}px)`;
            });

            const endDrag = () => {
                if (!dragging) return;
                const deltaY = Math.max(0, latestY - startY);
                dragging = false;
                panel.style.transition = '';
                panel.style.transform = '';
                if (deltaY > 90) closeFn();
            };

            panel.addEventListener('pointerup', endDrag);
            panel.addEventListener('pointercancel', endDrag);
        };

        bindPullDownToClose(sigmaSheet, () => {
            closeSigmaSheet();
            updateMobileAppBarActiveState();
        });
        document.querySelectorAll('.mobile-pull-up-panel').forEach(panel => {
            bindPullDownToClose(panel, () => window.closeMobilePanel(panel.id));
        });
    }

    buildScheduleNotifications();

    setInterval(buildScheduleNotifications, 60000);

    // Initial population
    if (typeof window.populateUserProfilePage === 'function') {
        window.populateUserProfilePage();
    }
    if (typeof initSubjectParentSidebar === 'function') initSubjectParentSidebar();

    // Re-render announcements and panels when switching between mobile and desktop layouts
    let lastWidth = window.innerWidth;
    window.addEventListener('resize', () => {
        const currentWidth = window.innerWidth;
        const wasMobile = lastWidth < 1024;
        const isMobile = currentWidth < 1024;

        if (wasMobile !== isMobile) {
            if (typeof renderStudentHomeAnnouncements === 'function') {
                renderStudentHomeAnnouncements();
            }
            if (typeof renderStudentHomeDashboardPanels === 'function') {
                renderStudentHomeDashboardPanels();
            }
            if (typeof PocketCards !== 'undefined' && typeof PocketCards.render === 'function') {
                PocketCards.render('sigma-panels-container');
            }
        }
        lastWidth = currentWidth;
    });

    window.returnToStudentRoomFromTopic = function (subjectId) {
        let classroomId = activeStudentClassroomId;
        if (!classroomId) {
            try {
                classroomId = sessionStorage.getItem('sigma-last-active-classroom') || '';
            } catch (e) {}
        }

        const enrolled = (typeof getStudentSectionClassItems === 'function') ? getStudentSectionClassItems() : [];

        // Check if current classroomId is valid in classroomData or enrolled classes
        let isValid = Boolean(classroomId && (classroomData[classroomId] || enrolled.some(c => c.id === classroomId)));
        if (!isValid) {
            classroomId = '';
        }

        if (!classroomId) {
            const subId = subjectId || _tcSubjectId;
            if (subId) {
                const resolved = (typeof resolveStudentClassroomId === 'function') ? resolveStudentClassroomId(subId) : null;
                if (resolved && (classroomData[resolved] || enrolled.some(c => c.id === resolved))) {
                    classroomId = resolved;
                } else {
                    const topicSubj = (typeof getTopicSubject === 'function') ? getTopicSubject(subId) : null;
                    const cleanSubj = String(topicSubj?.name || topicSubj?.title || subId).toLowerCase().trim();
                    const match = enrolled.find(c => {
                        const sName = String(c?.subject || c?.title || c?.id || '').toLowerCase().trim();
                        return sName === cleanSubj || sName.includes(cleanSubj) || cleanSubj.includes(sName);
                    });
                    if (match) classroomId = match.id;
                }
            }
        }

        if (!classroomId && enrolled.length > 0) {
            classroomId = enrolled[0].id;
        }

        if (classroomId && typeof showClassroomDetail === 'function') {
            showClassroomDetail(classroomId, true, 'topics');
        } else if (typeof window.showClassroomDetail === 'function' && classroomId) {
            window.showClassroomDetail(classroomId, true, 'topics');
        } else {
            if (typeof window.switchTab === 'function') {
                window.switchTab('nav-classrooms');
            } else if (typeof window.backToClassrooms === 'function') {
                window.backToClassrooms();
            } else {
                window.history.back();
            }
        }
    };
    // Auto-refresh dashboard panels so ended classes disappear immediately
    setInterval(() => {
        if (document.visibilityState === 'visible') {
            if (typeof renderStudentHomeDashboardPanels === 'function') {
                renderStudentHomeDashboardPanels();
            }
        }
    }, 30000);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            if (typeof renderStudentHomeDashboardPanels === 'function') {
                renderStudentHomeDashboardPanels();
            }
        }
    });

    window.showClassroomDetail = showClassroomDetail;

    window.addEventListener('classroom-banner-theme-changed', function () {
        if (activeStudentClassroomId) {
            const detailView = document.getElementById('section-classroom-detail');
            if (detailView && !detailView.classList.contains('hidden')) {
                showClassroomDetail(activeStudentClassroomId, false, activeStudentRoomTab);
            }
        }
    });

    window.addEventListener('storage', function (e) {
        if (e.key === 'sigma-classroom-custom-themes-v1' && activeStudentClassroomId) {
            const detailView = document.getElementById('section-classroom-detail');
            if (detailView && !detailView.classList.contains('hidden')) {
                showClassroomDetail(activeStudentClassroomId, false, activeStudentRoomTab);
            }
        }
    });
}

    window.addEventListener("sigma-classroom-order-changed", () => {
        if (typeof renderStudentHomeDashboardPanels === "function") {
            renderStudentHomeDashboardPanels();
        }
        const subSidebar = document.getElementById("sub-sidebar");
        const isSubSidebarVisible = subSidebar && subSidebar.classList.contains("sub-sidebar-visible");
        if (typeof renderStudentClassroomSectionsSidebar === "function") {
            renderStudentClassroomSectionsSidebar(activeStudentClassroomId, isSubSidebarVisible);
        }
    });
