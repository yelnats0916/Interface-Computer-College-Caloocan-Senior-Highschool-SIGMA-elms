/**
 * SIGMA ELMS - Unified Notifications Component Controller
 * Interface Computer College - Caloocan Senior High School ELMS
 * Borrowed by Admin, Teacher, and Student portals.
 */

(function () {
    'use strict';

    // ─── Detect Portal Role (Admin, Teacher, Student) ─────────────────────────
    function getCurrentRole() {
        if (document.getElementById('admin-header') || location.pathname.toLowerCase().includes('admin')) {
            return 'admin';
        }
        if (document.getElementById('student-header') || location.pathname.toLowerCase().includes('student')) {
            return 'student';
        }
        return 'teacher';
    }

    const currentRole = getCurrentRole();
    const NOTIF_STORAGE_KEY = `sigma-notifications-${currentRole}-v3`;
    const INITIAL_LIMIT = 5;

    // ─── Relative Time Helper for Mock / Seed Data ────────────────────────────
    function secsAgo(s)  { return new Date(Date.now() - s * 1000).toISOString(); }
    function minsAgo(m)  { return new Date(Date.now() - m * 60 * 1000).toISOString(); }
    function hrsAgo(h)   { return new Date(Date.now() - h * 60 * 60 * 1000).toISOString(); }
    function daysAgo(d, hour = 14, min = 30) {
        const dObj = new Date(Date.now() - d * 24 * 60 * 60 * 1000);
        dObj.setHours(hour, min, 0, 0);
        return dObj.toISOString();
    }

    // ─── Role-Specific Demo Datasets (for preview & development testing) ──────
    const DEMO_ROLE_NOTIFICATIONS = {
        // ADMIN NOTIFICATIONS (System, AI, New Accounts, Profile Edits, Security, Backups)
        admin: [
            {
                id: 'adm-1',
                senderName: 'Account Management',
                icon: 'fa-user-plus',
                senderColor: '#15803d',
                title: 'New Student Account Created',
                body: 'Account created for 2026-00412 (Mark Bautista) in STEM 12-A.',
                timestamp: secsAgo(45), // "45secs"
                read: false
            },
            {
                id: 'adm-2',
                senderName: 'Sigma AI Monitor',
                icon: 'fa-robot',
                senderColor: '#7c3aed',
                title: 'AI Usage Quota Alert',
                body: 'Monthly AI query consumption reached 82% of allocated tier.',
                timestamp: minsAgo(15), // "15mins"
                read: false
            },
            {
                id: 'adm-3',
                senderName: 'Directory Service',
                icon: 'fa-user-pen',
                senderColor: '#d97706',
                title: 'Faculty Profile Edited',
                body: 'Teacher profile details updated for Engr. Roberto Tan (ID: 2024-00109).',
                timestamp: hrsAgo(2), // "2hrs"
                read: false
            },
            {
                id: 'adm-4',
                senderName: 'System Security',
                icon: 'fa-shield-halved',
                senderColor: '#0284c7',
                title: 'New Administrator Login',
                body: 'Authorized login detected from workstation IP 192.168.1.105.',
                timestamp: hrsAgo(22), // "22hrs"
                read: true
            },
            {
                id: 'adm-5',
                senderName: 'IT Infrastructure',
                icon: 'fa-gears',
                senderColor: '#475569',
                title: 'Scheduled Maintenance Complete',
                body: 'Database server index optimization completed with 0 errors.',
                timestamp: daysAgo(1, 12, 30), // "Yesterday at 12:30 pm"
                read: true
            },
            {
                id: 'adm-6',
                senderName: 'Database Cloud',
                icon: 'fa-cloud-arrow-up',
                senderColor: '#059669',
                title: 'Automated Daily Backup Finished',
                body: 'Full school database snapshot saved successfully to cloud storage.',
                timestamp: daysAgo(3, 16, 20), // "Day at 4:20 pm"
                read: true
            },
            {
                id: 'adm-7',
                senderName: 'Office of the Registrar',
                icon: 'fa-calendar-check',
                senderColor: '#db2777',
                title: 'Enrollment Window Closed',
                body: 'Late registration records processed for 2nd Semester.',
                timestamp: daysAgo(5, 19, 30), // "Day at 7:30 pm"
                read: true
            }
        ],

        // TEACHER NOTIFICATIONS (Student Submissions, Faculty Announcements, Attendance)
        teacher: [
            {
                id: 'tch-1',
                senderName: 'Juan Dela Cruz',
                senderInitials: 'JD',
                senderColor: '#1d4ed8',
                title: 'Lab Activity 3 Submitted',
                body: 'Submitted Lab Activity 3 – Sorting Algorithms on time.',
                timestamp: secsAgo(45), // "45secs"
                read: false
            },
            {
                id: 'tch-2',
                senderName: 'Academic Office',
                icon: 'fa-bell',
                senderColor: '#15803d',
                title: 'Grade Submission Reminder',
                body: 'Please finalize and submit 2nd Quarter grades before Friday.',
                timestamp: minsAgo(15), // "15mins"
                read: false
            },
            {
                id: 'tch-3',
                senderName: 'Mark Bautista',
                senderInitials: 'MB',
                senderColor: '#7c3aed',
                title: 'Quiz 2 Submitted',
                body: 'Completed and submitted Chapter 5 Data Structures Quiz.',
                timestamp: hrsAgo(2), // "2hrs"
                read: false
            },
            {
                id: 'tch-4',
                senderName: 'Principal Office',
                senderInitials: 'PO',
                senderColor: '#d97706',
                title: 'Faculty Assembly',
                body: 'Department briefing today at 3:00 PM in Conference Hall.',
                timestamp: hrsAgo(22), // "22hrs"
                read: true
            },
            {
                id: 'tch-5',
                senderName: 'Rosa Reyes',
                senderInitials: 'RR',
                senderColor: '#db2777',
                title: 'Attendance Confirmation',
                body: 'Daily attendance record for Section STEM-12A submitted.',
                timestamp: daysAgo(1, 12, 30), // "Yesterday at 12:30 pm"
                read: true
            },
            {
                id: 'tch-6',
                senderName: 'System Notice',
                icon: 'fa-calendar-check',
                senderColor: '#0284c7',
                title: 'Academic Calendar Synced',
                body: 'School Year 2026–2027 2nd Semester schedules are now active.',
                timestamp: daysAgo(3, 16, 20), // "Day at 4:20 pm"
                read: true
            }
        ],

        // STUDENT NOTIFICATIONS (Materials Posted, Grades Released, Schedule Changes)
        student: [
            {
                id: 'stu-1',
                senderName: 'Prof. Maria Santos',
                senderInitials: 'MS',
                senderColor: '#1d4ed8',
                title: 'New Assignment Posted',
                body: 'Task 1 – Variable Declaration Practice coursework is now available.',
                timestamp: secsAgo(45), // "45secs"
                read: false,
                target: {
                    subjectId: 'card-prog1',
                    topicIdx: 0,
                    tab: 'assessments',
                    itemIdx: 0,
                    materialTitle: 'Task 1 - Variable Declaration Practice'
                }
            },
            {
                id: 'stu-2',
                senderName: 'Engr. Roberto Tan',
                senderInitials: 'RT',
                senderColor: '#15803d',
                title: 'Midterm Grade Released',
                body: 'Your grade evaluation for Computer Programming 2 is now posted.',
                timestamp: minsAgo(20), // "20mins"
                read: false
            },
            {
                id: 'stu-3',
                senderName: 'Section STEM 12-A',
                icon: 'fa-bullhorn',
                senderColor: '#d97706',
                title: 'Room Assignment Change',
                body: 'Tomorrow morning lecture will be held in Computer Lab 3.',
                timestamp: hrsAgo(3), // "3hrs"
                read: false
            },
            {
                id: 'stu-4',
                senderName: 'Academic Office',
                icon: 'fa-calendar-days',
                senderColor: '#0284c7',
                title: 'Final Exam Schedule',
                body: 'Official examination schedule has been published for 2nd Quarter.',
                timestamp: hrsAgo(22), // "22hrs"
                read: true
            },
            {
                id: 'stu-5',
                senderName: 'Accounting Dept',
                icon: 'fa-receipt',
                senderColor: '#7c3aed',
                title: 'Exam Clearance Approved',
                body: 'Your student account clearance has been verified successfully.',
                timestamp: daysAgo(1, 12, 30), // "Yesterday at 12:30 pm"
                read: true
            }
        ]
    };

    // Clean initial state (0 notifications for new installs/resets)
    const defaultNotifications = [];

    // ─── Storage Operations ──────────────────────────────────────────────────
    function getNotifications() {
        try {
            const saved = localStorage.getItem(NOTIF_STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) return parsed.filter(isVisibleNotification);
            }
        } catch (e) {
            console.error('[SIGMA Notifications] Storage read error:', e);
        }
        return [];
    }

    function isVisibleNotification(notif) {
        if (!notif.assignmentScope) return !notif.target?.subjectId;
        const normalize = value => String(value || '').toLowerCase().replace(/^grade\s*\d+\s*[-–]?\s*/i, '').replace(/^(card-|subj-)/, '').replace(/[^a-z0-9]/g, '');
        const scope = notif.assignmentScope;
        if (!scope.section || !scope.subjectId) return false;
        if (currentRole === 'student') {
            const student = window.getLoggedInStudentUser?.();
            if (!student) return false;
            const sections = JSON.parse(localStorage.getItem('sigma-admin-sections') || '[]');
            const subject = window.getSubjectById?.(scope.subjectId) || window.getTopicSubject?.(scope.subjectId);
            const wanted = [scope.subjectId, scope.subjectName, subject?.name, subject?.title].map(normalize).filter(Boolean);
            return Array.isArray(sections) && sections.some(section => {
                if (section.status === 'Archived') return false;
                if (normalize(section.name || section.sectionName) !== normalize(scope.section) && normalize(section.id) !== normalize(scope.section)) return false;
                const subjects = [section.subject, section.subjectId, section.assignedSubject, ...(section.assignedSubjects || [])]
                    .map(value => normalize(typeof value === 'object' ? value.id || value.name || value.title : value)).filter(Boolean);
                return subjects.some(value => wanted.includes(value))
                    && window.isSectionAssignedToStudent?.(section, student) === true;
            });
        }
        if (currentRole !== 'teacher') return false;
        const teacher = window.getEffectiveTeacher?.();
        if (!teacher || typeof window.getTeacherAssignedSubjectsAndSections !== 'function') return false;
        return (window.getTeacherAssignedSubjectsAndSections(teacher) || []).some(assignment => {
            const section = normalize(assignment.sectionName || assignment.section);
            const subjects = [assignment.subject, assignment.subjectId, assignment.name].map(normalize).filter(Boolean);
            return section && section === normalize(scope.section)
                && [scope.subjectId, scope.subjectName].map(normalize).filter(Boolean).some(subject => subjects.includes(subject));
        });
    }

    function saveNotifications(notifs) {
        try {
            const existing = JSON.parse(localStorage.getItem(NOTIF_STORAGE_KEY) || '[]');
            const otherRecipients = Array.isArray(existing) ? existing.filter(n => !isVisibleNotification(n)) : [];
            localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify([...notifs, ...otherRecipients]));
        } catch (e) {
            console.error('[SIGMA Notifications] Storage save error:', e);
        }
    }

    // ─── Formatter for Timestamps ─────────────────────────────────────────────
    function formatTime(isoString) {
        if (!isoString) return '1sec';
        const now = Date.now();
        const then = new Date(isoString).getTime();
        const diffMs = Math.max(0, now - then);
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHrs  = Math.floor(diffMins / 60);

        if (diffSecs <= 1) return '1sec';
        if (diffSecs < 60) return `${diffSecs}secs`;
        if (diffMins === 1) return '1min';
        if (diffMins < 60) return `${diffMins}mins`;
        if (diffHrs === 1) return '1hr';
        if (diffHrs < 24) {
            // Check if same calendar day
            const dThen = new Date(then);
            const dNow = new Date(now);
            if (dThen.getDate() === dNow.getDate()) {
                return `${diffHrs}hrs`;
            }
        }

        const dateObj = new Date(then);
        const nowDate = new Date(now);

        // Format time string (e.g. "12:30 pm" or "4:20 am")
        let hours = dateObj.getHours();
        const minutes = dateObj.getMinutes();
        const ampm = hours >= 12 ? 'pm' : 'am';
        hours = hours % 12;
        hours = hours ? hours : 12; // '0' becomes 12
        const minutesStr = minutes < 10 ? '0' + minutes : minutes;
        const timeStr = `${hours}:${minutesStr} ${ampm}`;

        // Calendar day difference
        const midnightNow = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate()).getTime();
        const midnightThen = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()).getTime();
        const dayDiff = Math.round((midnightNow - midnightThen) / (24 * 60 * 60 * 1000));

        if (dayDiff === 1) {
            return `Yesterday at ${timeStr}`;
        }
        if (dayDiff > 1 && dayDiff < 7) {
            const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            return `${weekdays[dateObj.getDay()]} at ${timeStr}`;
        }

        // Older dates (e.g. "April 30 at 6:07 pm")
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        return `${months[dateObj.getMonth()]} ${dateObj.getDate()} at ${timeStr}`;
    }

    // ─── Badge Management ────────────────────────────────────────────────────
    function updateBadge(notifs) {
        const badge = document.getElementById('noti-badge');
        if (!badge) return;
        const unreadCount = notifs.filter(n => !n.read).length;
        if (unreadCount > 0) {
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }

    // ─── Feed Rendering State ────────────────────────────────────────────────
    let currentTab = 'all'; // 'all' | 'unread'
    let isExpanded = false; // toggled by "Previous Notifications"

    function buildNotificationItem(notif) {
        const item = document.createElement('div');
        item.className = `notif-item ${!notif.read ? 'notif-unread' : ''}`;
        item.dataset.id = notif.id;

        // Support FontAwesome icon, image avatar, or initials
        let avatarInner = '';
        if (notif.avatarImg) {
            avatarInner = '<img alt="Sender profile">';
        } else if (notif.assignmentScope) {
            avatarInner = '<i class="fa-solid fa-user text-[15px] text-white"></i>';
        } else if (notif.icon) {
            avatarInner = `<i class="fa-solid ${notif.icon} text-[15px] text-white"></i>`;
        } else if (notif.avatarImg) {
            avatarInner = `<img src="${notif.avatarImg}" alt="${notif.senderName || 'Avatar'}">`;
        } else {
            avatarInner = notif.senderInitials || 'SYS';
        }

        item.innerHTML = `
            <div class="notif-item__avatar" style="background-color: ${notif.senderColor || '#1d4ed8'}">
                ${avatarInner}
            </div>
            <div class="notif-item__body">
                <div class="notif-item__header">
                    <span class="notif-item__title">${notif.senderName || 'System'}</span>
                    ${!notif.read ? '<span class="notif-item__dot"></span>' : ''}
                </div>
                <p class="notif-item__context">${notif.title ? notif.title + ' — ' : ''}${notif.body}</p>
                <span class="notif-item__time">${formatTime(notif.timestamp)}</span>
            </div>
        `;
        const avatarImage = item.querySelector('.notif-item__avatar img');
        if (avatarImage) {
            avatarImage.src = notif.avatarImg;
            avatarImage.alt = notif.senderName || 'Sender profile';
            avatarImage.style.cssText = 'width:100%;height:100%;object-fit:cover;';
            avatarImage.onerror = () => {
                avatarImage.parentElement.innerHTML = '<i class="fa-solid fa-user text-[15px] text-white"></i>';
            };
        }

        item.addEventListener('click', () => {
            const notifs = getNotifications();
            const target = notifs.find(n => n.id === notif.id);
            if (target && !target.read) {
                target.read = true;
                saveNotifications(notifs);
                renderFeed();
            }

            // Close notification dropdown
            const notiDropdown = document.getElementById('noti-dropdown');
            if (notiDropdown) notiDropdown.classList.add('hidden');
            const notiToggleBtn = document.getElementById('notiToggleBtn');
            if (notiToggleBtn) notiToggleBtn.classList.remove('active');
            if (typeof window.hideHeaderOverlays === 'function') {
                window.hideHeaderOverlays();
            }

            // Navigate if notification points to a material / coursework
            if (currentRole === 'teacher' && notif.assignmentScope && typeof window.openTopicContent === 'function') {
                const target = notif.target || {};
                window.openTopicContent(target.subjectId, target.topicIdx, target.tab || 'assessments', target.itemIdx, true, {
                    selectedSection: target.selectedSection,
                    selectedStudent: target.selectedStudent,
                    viewSubmission: true
                });
            }
            if (currentRole === 'student' && typeof window.openTopicContent === 'function') {
                const navTarget = notif.target || {};
                const subjId = navTarget.subjectId || window._activeSubjectId || 'card-prog1';
                const topicIdx = (navTarget.topicIdx !== undefined && navTarget.topicIdx !== null) ? Number(navTarget.topicIdx) : 0;
                const tab = navTarget.tab || 'assessments';
                const itemIdx = (navTarget.itemIdx !== undefined && navTarget.itemIdx !== null) ? Number(navTarget.itemIdx) : 0;

                const notifTitle = String(notif.title || '').toLowerCase();
                const notifBody = String(notif.body || '').toLowerCase();
                const isCourseworkNotif = Boolean(
                    navTarget.materialTitle || navTarget.itemId || navTarget.tab ||
                    notifTitle.includes('assignment') || notifTitle.includes('quiz') || notifTitle.includes('task') || notifTitle.includes('material') || notifTitle.includes('lesson') || notifTitle.includes('posted') ||
                    notifBody.includes('assignment') || notifBody.includes('quiz') || notifBody.includes('task') || notifBody.includes('material') || notifBody.includes('lesson')
                );

                if (isCourseworkNotif) {
                    window.openTopicContent(subjId, topicIdx, tab, itemIdx, false, { selectedSection: notif.assignmentScope?.section });
                }
            }
        });

        return item;
    }

    function renderFeed() {
        const feedContainer = document.getElementById('noti-dropdown-feed');
        const prevBtnWrap = document.getElementById('noti-prev-wrapper');
        const scrollArea = document.querySelector('#noti-dropdown .notif-scroll-area');
        if (!feedContainer) return;

        const notifs = getNotifications();
        updateBadge(notifs);

        // Filter based on selected tab
        const filtered = currentTab === 'unread'
            ? notifs.filter(n => !n.read)
            : notifs;

        feedContainer.innerHTML = '';

        if (filtered.length === 0) {
            feedContainer.innerHTML = `
                <div class="notif-empty">
                    <i class="fa-regular fa-bell-slash"></i>
                    <p>${currentTab === 'unread' ? 'No unread notifications' : 'No notifications right now'}</p>
                </div>
            `;
            if (prevBtnWrap) prevBtnWrap.style.display = 'none';
            if (scrollArea) scrollArea.classList.remove('can-scroll');
            return;
        }

        // Apply 5-limit rule unless expanded
        const hasMany = filtered.length > INITIAL_LIMIT;
        const visibleItems = isExpanded ? filtered : filtered.slice(0, INITIAL_LIMIT);

        visibleItems.forEach(notif => {
            feedContainer.appendChild(buildNotificationItem(notif));
        });

        // "Previous Notifications" button logic
        if (prevBtnWrap) {
            if (hasMany && !isExpanded) {
                prevBtnWrap.style.display = 'block';
                if (scrollArea) scrollArea.classList.remove('can-scroll');
            } else {
                prevBtnWrap.style.display = 'none';
                if (scrollArea && isExpanded) {
                    scrollArea.classList.add('can-scroll');
                }
            }
        }
    }

    // ─── Component Initialization ────────────────────────────────────────────
    function setupTabs() {
        const tabAll = document.getElementById('noti-tab-all');
        const tabUnread = document.getElementById('noti-tab-unread');
        if (!tabAll || !tabUnread) return;

        function setTab(tab) {
            currentTab = tab;
            isExpanded = false; // reset expand on tab switch
            if (tab === 'all') {
                tabAll.classList.add('active');
                tabUnread.classList.remove('active');
            } else {
                tabAll.classList.remove('active');
                tabUnread.classList.add('active');
            }
            renderFeed();
        }

        tabAll.onclick = (e) => {
            e.preventDefault();
            setTab('all');
        };

        tabUnread.onclick = (e) => {
            e.preventDefault();
            setTab('unread');
        };
    }

    function initNotificationsComponent() {
        const notiToggleBtn = document.getElementById('noti-toggle');
        const notiDropdown = document.getElementById('noti-dropdown');
        const markAllReadBtn = document.getElementById('notiMarkAllReadBtn');
        const prevBtn = document.getElementById('notiPrevNotificationsBtn');

        const initialNotifs = getNotifications();
        updateBadge(initialNotifs);
        setupTabs();

        if (prevBtn) {
            prevBtn.onclick = (e) => {
                e.preventDefault();
                isExpanded = true;
                renderFeed();
            };
        }

        if (markAllReadBtn) {
            markAllReadBtn.onclick = (e) => {
                e.preventDefault();
                const notifs = getNotifications().map(n => ({ ...n, read: true }));
                saveNotifications(notifs);
                renderFeed();
            };
        }

        if (notiToggleBtn && notiDropdown && !notiToggleBtn.dataset.topbarBound) {
            notiToggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const isCurrentlyOpen = !notiDropdown.classList.contains('hidden');

                if (typeof window.hideHeaderOverlays === 'function') {
                    window.hideHeaderOverlays(notiDropdown, notiToggleBtn);
                } else {
                    document.querySelectorAll('.header-panel').forEach(p => {
                        if (p !== notiDropdown) p.classList.add('hidden');
                    });
                    document.querySelectorAll('.header-icon-btn, .header-profile-btn').forEach(b => {
                        if (b !== notiToggleBtn) b.classList.remove('active');
                    });
                }

                if (isCurrentlyOpen) {
                    notiDropdown.classList.add('hidden');
                    notiToggleBtn.classList.remove('active');
                } else {
                    isExpanded = false;
                    currentTab = 'all';
                    const tabAll = document.getElementById('noti-tab-all');
                    const tabUnread = document.getElementById('noti-tab-unread');
                    if (tabAll) tabAll.classList.add('active');
                    if (tabUnread) tabUnread.classList.remove('active');

                    renderFeed();
                    notiDropdown.classList.remove('hidden');
                    notiToggleBtn.classList.add('active');
                }
            });

            notiDropdown.addEventListener('click', (e) => e.stopPropagation());
        }
    }

    // ─── Global API & Factory Templates for Database Integration ──────────────
    window.SigmaNotifications = {
        templates: {
            newAccount: (data = {}) => ({
                id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                senderName: data.senderName || 'Account Service',
                icon: 'fa-user-plus',
                senderColor: '#15803d', // Green
                title: data.title || `New Account Created: ${data.userName || 'New User'}`,
                body: data.body || `Registered account for ID ${data.accountId || '—'} in ${data.section || 'General'}.`,
                timestamp: new Date().toISOString(),
                read: false
            }),
            accountEdited: (data = {}) => ({
                id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                senderName: data.senderName || 'Directory Service',
                icon: 'fa-user-pen',
                senderColor: '#d97706', // Amber
                title: data.title || `Account Updated: ${data.userName || 'User'}`,
                body: data.body || `Profile details and credentials modified for ID ${data.accountId || '—'}.`,
                timestamp: new Date().toISOString(),
                read: false
            }),
            aiUsage: (data = {}) => ({
                id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                senderName: data.senderName || 'Sigma AI Monitor',
                icon: 'fa-robot',
                senderColor: '#7c3aed', // Purple
                title: data.title || 'AI Usage Alert',
                body: data.body || 'Monthly AI query tokens reached threshold quota.',
                timestamp: new Date().toISOString(),
                read: false
            }),
            security: (data = {}) => ({
                id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                senderName: data.senderName || 'Security Center',
                icon: 'fa-shield-halved',
                senderColor: '#0284c7', // Sky blue
                title: data.title || 'Security Notice',
                body: data.body || 'System login detected from authorized session.',
                timestamp: new Date().toISOString(),
                read: false
            }),
            postDeleted: (data = {}) => ({
                id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                senderName: data.adminName || 'Administrator',
                icon: 'fa-trash-can',
                senderColor: '#ef4444', // Red
                title: data.title || 'Announcement Removed',
                body: data.body || `Your post titled "${data.postTitle || 'Untitled Announcement'}" was removed by ${data.adminName || 'an administrator'}.`,
                timestamp: new Date().toISOString(),
                read: false
            }),
            person: (data = {}) => ({
                id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                senderName: data.name || 'User',
                senderInitials: data.initials || 'US',
                senderColor: data.color || '#1d4ed8',
                title: data.title || 'New Message',
                body: data.body || '',
                timestamp: new Date().toISOString(),
                read: false
            })
        },
        sendToRole(targetRole, notif) {
            if (notif.assignmentScope && !notif.senderId) {
                try {
                    const sender = JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}');
                    const profile = currentRole === 'teacher' ? (window.getEffectiveTeacher?.() || sender) : sender;
                    notif = { ...notif, senderId: profile.id || profile.uid || sender.id || sender.uid,
                        senderName: profile.fullName || profile.name || sender.fullName || sender.name || notif.senderName,
                        avatarImg: profile.avatar || profile.profilePicture || sender.avatar || sender.profilePicture || '' };
                } catch (_) {}
            }
            const targetKey = `sigma-notifications-${targetRole}-v3`;
            let list = [];
            try {
                const saved = localStorage.getItem(targetKey);
                if (saved) {
                    list = JSON.parse(saved);
                } else {
                    list = [];
                }
            } catch (e) {
                list = [];
            }
            list.unshift(notif);
            try {
                localStorage.setItem(targetKey, JSON.stringify(list));
            } catch (e) {
                console.error('[SIGMA Notifications] Save error for role', targetRole, e);
            }
            if (currentRole === targetRole) {
                renderFeed();
            }
        },
        add(notif, role) {
            if (role && role !== currentRole) {
                window.SigmaNotifications.sendToRole(role, notif);
                return;
            }
            const list = getNotifications();
            list.unshift(notif);
            saveNotifications(list);
            renderFeed();
        },
        getAll: getNotifications,
        refresh: renderFeed,
        // Developer / Designer Preview Helpers
        loadDemoData: function () {
            const demoList = DEMO_ROLE_NOTIFICATIONS[currentRole] || DEMO_ROLE_NOTIFICATIONS.teacher;
            saveNotifications([...demoList]);
            renderFeed();
            if (window.SigmaAnnouncements && typeof window.SigmaAnnouncements.showToast === 'function') {
                window.SigmaAnnouncements.showToast('Loaded demo notifications for preview!', 'success');
            }
        },
        clearAll: function () {
            saveNotifications([]);
            renderFeed();
            if (window.SigmaAnnouncements && typeof window.SigmaAnnouncements.showToast === 'function') {
                window.SigmaAnnouncements.showToast('Cleared notifications to empty state.', 'info');
            }
        }
    };

    window.renderNotificationsFeed = renderFeed;
    window.loadDemoNotifications = () => window.SigmaNotifications.loadDemoData();
    window.clearDemoNotifications = () => window.SigmaNotifications.clearAll();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNotificationsComponent);
    } else {
        initNotificationsComponent();
    }
})();

