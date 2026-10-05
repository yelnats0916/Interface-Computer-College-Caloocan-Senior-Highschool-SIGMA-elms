/**
 * SIGMA ELMS - Unified In-App Settings View Controller
 * Standardized across Admin, Teacher, and Student portals.
 */

(function () {
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

    const NOTIFICATION_STORAGE_PREFIX = 'sigma_settings_notifications_';

    function _esc(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function getActivePortal() {
        const path = window.location.pathname.toLowerCase();
        if (path.includes('admin')) return 'admin';
        if (path.includes('teacher')) return 'teacher';
        if (path.includes('student')) return 'student';
        return 'admin';
    }

    function getActiveUser() {
        let merged = {};

        // Start with central portal data if available (prefer getLoggedInUserData to avoid picking up another viewed profile)
        const fetchUserDataFn = (typeof window.getLoggedInUserData === 'function')
            ? window.getLoggedInUserData
            : (typeof window.getActiveUserData === 'function' ? window.getActiveUserData : null);
        if (fetchUserDataFn) {
            try {
                const centralData = fetchUserDataFn();
                if (centralData && (centralData.id || centralData.uid || centralData.email)) {
                    Object.assign(merged, centralData);
                }
            } catch (e) {}
        }

        // Layer in session storage
        try {
            const authUser = JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}');
            // Session wins over central for fields it has
            Object.assign(merged, authUser);
        } catch (e) {}

        // Layer in localStorage profile
        try {
            const userProfile = getStoredJson('sigma_user_profile', {});
            // Profile fills in gaps only
            Object.keys(userProfile).forEach(k => {
                if (!merged[k]) merged[k] = userProfile[k];
            });
        } catch (e) {}

        // Always cross-reference localStorage user lists to fill missing fields
        // (firstName, lastName, middleName, gender may not be in session/central data)
        const storageKeys = ['sigma-admin-users', 'sigma-teacher-users', 'sigma-student-users', 'sigma-users-list'];
        const mergedId = String(merged.id || merged.uid || '').trim();
        const mergedEmail = (merged.email || '').toLowerCase().trim();
        for (const k of storageKeys) {
            try {
                const list = getStoredJson(k, []);
                if (!Array.isArray(list)) continue;
                const match = list.find(u =>
                    (mergedId && String(u.uid || u.id) === mergedId) ||
                    (mergedEmail && u.email && u.email.toLowerCase() === mergedEmail)
                );
                if (match) {
                    // Full record fills gaps; session/central values stay on top
                    Object.keys(match).forEach(k2 => {
                        if (!merged[k2]) merged[k2] = match[k2];
                    });
                    // Always pull name fields from full record if session lacks them
                    if (!merged.firstName && match.firstName) merged.firstName = match.firstName;
                    if (!merged.lastName && match.lastName) merged.lastName = match.lastName;
                    if (!merged.middleName && match.middleName) merged.middleName = match.middleName;
                    if (!merged.gender && match.gender) merged.gender = match.gender;
                    if (!merged.role && (match.role || match.type)) merged.role = match.role || match.type;
                    break;
                }
            } catch (e) {}
        }

        return merged;
    }


    const DEFAULT_NOTIFICATION_PREFERENCES = {
            schoolAnnouncements: true,
            classAnnouncements: true,
            topicReleases: true,
            materialReleases: true,
            assessmentReleases: true,
            dueDates: true,
            grades: true,
    };
    function getNotificationPreferences(userId) {
        const defaultPrefs = { ...DEFAULT_NOTIFICATION_PREFERENCES };
        try {
            const raw = localStorage.getItem(NOTIFICATION_STORAGE_PREFIX + (userId || 'default'));
            if (raw) {
                const saved = JSON.parse(raw);
                return { ...defaultPrefs, ...saved,
                    schoolAnnouncements: saved.schoolAnnouncements ?? saved.announcements ?? true,
                    classAnnouncements: saved.classAnnouncements ?? saved.announcements ?? true,
                    topicReleases: saved.topicReleases ?? saved.coursework ?? true,
                    materialReleases: saved.materialReleases ?? saved.coursework ?? true,
                    assessmentReleases: saved.assessmentReleases ?? saved.coursework ?? true };
            }
        } catch (e) {}
        return defaultPrefs;
    }

    function saveNotificationPreferences(userId, prefs) {
        try {
            localStorage.setItem(NOTIFICATION_STORAGE_PREFIX + (userId || 'default'), JSON.stringify(prefs));
            return true;
        } catch (e) {
            console.error('Failed to save notification preferences', e);
            return false;
        }
    }

    function showToast(message, icon = 'fa-circle-check') {
        const existing = document.getElementById('sigma-settings-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.id = 'sigma-settings-toast';
        toast.className = 'sigma-settings-toast';
        toast.innerHTML = `<i class="fa-solid ${icon} text-emerald-400"></i><span>${_esc(message)}</span>`;
        document.body.appendChild(toast);

        setTimeout(() => {
            if (toast) toast.remove();
        }, 3200);
    }

    function renderSettingsView(containerId = 'user-settings-view', activeTab = 'notifications') {
        const container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
        if (!container) return;

        // Robust tab normalization
        let currentTab = String(activeTab || 'notifications').toLowerCase().trim();
        if (currentTab === 'account-settings' || currentTab === 'settings' || currentTab === 'user-settings' || !currentTab) {
            currentTab = 'notifications';
        }
        if (currentTab.startsWith('account-settings-')) currentTab = currentTab.replace('account-settings-', '');
        if (currentTab.startsWith('settings-')) currentTab = currentTab.replace('settings-', '');

        const validTabs = ['notifications', 'account', 'security'];

        if (!validTabs.includes(currentTab)) {
            currentTab = 'notifications';
        }

        const user = getActiveUser();
        const userId = user.uid || user.id || 'default';
        const notifPrefs = getNotificationPreferences(userId);

        const tabs = [
            { id: 'notifications', label: 'Notifications', icon: 'fa-bell', title: 'Notifications' },
            { id: 'account', label: 'Account Information', icon: 'fa-user', title: 'Account Information' },
            { id: 'security', label: 'Security & Password', icon: 'fa-lock', title: 'Security & Password' },
        ];

        const activeMeta = tabs.find(t => t.id === currentTab) || tabs[0];

        const isMobileScreen = typeof window !== 'undefined' && (window.innerWidth < 1024 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
        if (isMobileScreen && container.dataset.mobileSettingsView !== 'detail') {
            container.dataset.mobileSettingsView = 'list';
        }

        let html = `
        <div class="sigma-settings-layout sigma-account-settings ${container.dataset.mobileSettingsView === 'detail' ? 'sigma-settings-detail' : ''}">
            <!-- Left Categories Sidebar -->
            <aside class="sigma-settings-sidebar">
                <nav class="flex flex-col gap-2" role="tablist" aria-label="Account Settings Categories">
                    ${tabs.map(t => {
                        const isActive = t.id === currentTab;
                        return `
                            <button type="button" 
                                class="sigma-settings-cat-btn ${isActive ? 'active bg-icc-yellow text-white' : 'text-black hover:bg-slate-100'}" 
                                onclick="window.openSettingsCategory('${container.id}', '${t.id}')"
                                role="tab"
                                aria-selected="${isActive}">
                                <span class="sigma-settings-cat-icon">
                                    <i class="fa-solid ${t.icon} text-inherit"></i>
                                </span>
                                <span class="sigma-settings-cat-text text-inherit">${t.label}</span>
                                <span class="sigma-settings-cat-chevron">
                                    <i class="fa-solid fa-chevron-right"></i>
                                </span>
                            </button>
                        `;
                    }).join('')}
                </nav>
            </aside>

            <!-- Right Content Area -->
            <section class="sigma-settings-main">
                <div class="sigma-settings-inner space-y-8">
        `;

        // ═════════════════════════════════════════════════════════════════════
        // TAB 1: NOTIFICATIONS
        // ═════════════════════════════════════════════════════════════════════
        if (currentTab === 'notifications') {
            html += `
                <div class="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                    <div>
                        <h2 class="text-lg font-bold text-black">Notification Preferences</h2>
                        <p class="text-xs text-black-fade font-medium mt-1">Control real-time alerts and digests delivered across your account.</p>
                    </div>

                    <div class="divide-y divide-slate-100 pt-2">
                        <!-- Announcements -->
                        <div class="flex items-center justify-between py-4 gap-4">
                            <div>
                                <h3 class="text-sm font-bold text-black">School Announcements</h3>
                                <p class="text-xs text-black-fade font-medium mt-0.5">Receive alerts for announcements posted by administrators.</p>
                            </div>
                            <label class="sigma-toggle-switch shrink-0 ml-4">
                                <input type="checkbox" id="notif-pref-schoolAnnouncements" aria-label="School Announcements" ${notifPrefs.schoolAnnouncements ? 'checked' : ''}>
                                <span class="sigma-toggle-slider"></span>
                            </label>
                        </div>

                        <div class="flex items-center justify-between py-4 gap-4">
                            <div>
                                <h3 class="text-sm font-bold text-black">Class Announcements</h3>
                                <p class="text-xs text-black-fade font-medium mt-0.5">Receive alerts for announcements posted by teachers in your ${getActivePortal() === 'student' ? 'enrolled' : 'assigned'} classes.</p>
                            </div>
                            <label class="sigma-toggle-switch shrink-0 ml-4">
                                <input type="checkbox" id="notif-pref-classAnnouncements" aria-label="Class Announcements" ${notifPrefs.classAnnouncements ? 'checked' : ''}>
                                <span class="sigma-toggle-slider"></span>
                            </label>
                        </div>
                        ${getActivePortal() === 'student' ? [
                            ['topicReleases', 'Released Topics', 'Receive alerts when a topic becomes available in your enrolled classes.'],
                            ['materialReleases', 'Released Learning Materials', 'Receive alerts when lessons, handouts, or videos become available in your enrolled classes.'],
                            ['assessmentReleases', 'Released Assessments', 'Receive alerts when tasks, assignments, or quizzes become available in your enrolled classes.']
                        ].map(([key, title, description]) => `<div class="flex items-center justify-between py-4 gap-4">
                            <div><h3 class="text-sm font-bold text-black">${title}</h3><p class="text-xs text-black-fade font-medium mt-0.5">${description}</p></div>
                            <label class="sigma-toggle-switch shrink-0 ml-4"><input type="checkbox" id="notif-pref-${key}" aria-label="${title}" ${notifPrefs[key] ? 'checked' : ''}><span class="sigma-toggle-slider"></span></label>
                        </div>`).join('') : ''}
                        <!-- Due Dates / Submissions -->
                        <div class="flex items-center justify-between py-4 gap-4">
                            <div>
                                <h3 class="text-sm font-bold text-black">Upcoming Due Dates</h3>
                                <p class="text-xs text-black-fade font-medium mt-0.5">Receive reminders for unfinished assessments due within 24 hours.</p>
                            </div>
                            <label class="sigma-toggle-switch shrink-0 ml-4">
                                <input type="checkbox" id="notif-pref-dueDates" ${notifPrefs.dueDates ? 'checked' : ''}>
                                <span class="sigma-toggle-slider"></span>
                            </label>
                        </div>

                        <!-- Grades & Assessments -->
                        <div class="flex items-center justify-between py-4 gap-4">
                            <div>
                                <h3 class="text-sm font-bold text-black">Graded Submissions</h3>
                                <p class="text-xs text-black-fade font-medium mt-0.5">Receive alerts when your teacher grades a submission or updates its score.</p>
                            </div>
                            <label class="sigma-toggle-switch shrink-0 ml-4">
                                <input type="checkbox" id="notif-pref-grades" ${notifPrefs.grades ? 'checked' : ''}>
                                <span class="sigma-toggle-slider"></span>
                            </label>
                        </div>


                    </div>
                    <div class="flex justify-end pt-4 border-t border-slate-100">
                        <button type="button" data-notification-reset class="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-transparent text-[#15803d] hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-[#15803d] text-xs font-bold transition-colors" title="Reset notification preferences">
                            <i class="fa-solid fa-arrow-rotate-left" aria-hidden="true"></i><span>Reset</span>
                        </button>
                    </div>
                </div>
            `;
        }

        // ═════════════════════════════════════════════════════════════════════
        // TAB 2: ACCOUNT INFORMATION
        // ═════════════════════════════════════════════════════════════════════
        else if (currentTab === 'account') {
            function normalizeRole(r) {
                const s = String(r || '').toLowerCase().trim();
                if (s.includes('master')) return 'Master Admin';
                if (s.includes('admin')) return 'Admin';
                if (s.includes('teacher') || s.includes('faculty') || s.includes('instructor')) return 'Teacher';
                if (s.includes('student') || s.includes('learner')) return 'Student';
                return r || '';
            }
            const roleName = normalizeRole(user.role || user.type || '');
            const fullName = [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ');
            html += `
                <div class="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                    <div>
                        <h2 class="text-lg font-bold text-black">Personal &amp; Identity Details</h2>
                        <p class="text-xs text-black-fade font-medium mt-1">Review your registered profile credentials and institutional account data.</p>
                    </div>

                    <!-- VIEW MODE -->
                    <div id="acc-view-mode" class="flex flex-col divide-y divide-slate-100 pt-2">
                        <div class="flex items-center py-3 gap-6">
                            <p class="text-sm font-semibold text-black w-40 shrink-0">ID</p>
                            <p class="text-sm font-normal text-black-fade">${_esc(userId) || '<span class="text-slate-300">—</span>'}</p>
                        </div>
                        <div class="flex items-center py-3 gap-6">
                            <p class="text-sm font-semibold text-black w-40 shrink-0">Name</p>
                            <p class="text-sm font-normal text-black-fade">${_esc(fullName) || '<span class="text-slate-300">—</span>'}</p>
                        </div>
                        <div class="flex items-center py-3 gap-6">
                            <p class="text-sm font-semibold text-black w-40 shrink-0">Gender</p>
                            <p class="text-sm font-normal text-black-fade">${_esc(user.gender) || '<span class="text-slate-300">—</span>'}</p>
                        </div>
                        <div class="flex items-center py-3 gap-6">
                            <p class="text-sm font-semibold text-black w-40 shrink-0">Role</p>
                            <p class="text-sm font-normal text-black-fade">${_esc(roleName) || '<span class="text-slate-300">—</span>'}</p>
                        </div>
                        <div class="flex items-center py-3 gap-6">
                            <p class="text-sm font-semibold text-black w-40 shrink-0">Email Address</p>
                            <p class="text-sm font-normal text-black-fade break-all">${_esc(user.email) || '<span class="text-slate-300">—</span>'}</p>
                        </div>
                    </div>

                    <div class="flex justify-end pt-4 border-t border-slate-100">
                        <button type="button" class="sigma-btn sigma-btn-md sigma-btn-primary flex items-center gap-2 cursor-pointer" onclick="window.openSelfEditInformation()">
                            <i class="fa-solid fa-pen"></i><span>Edit Information</span>
                        </button>
                    </div>
                </div>
            `;
        }

        // ═════════════════════════════════════════════════════════════════════
        // TAB 3: SECURITY & PASSWORD
        // ═════════════════════════════════════════════════════════════════════
        else if (currentTab === 'security') {
            html += `
                <div class="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                    <div>
                        <h2 class="text-lg font-bold text-black">Password Credentials</h2>
                        <p class="text-xs text-black-fade font-medium mt-1">Safely update your login password. Passwords must be at least 6 characters with letters, numbers, and symbols.</p>
                    </div>

                    <!-- Clickable row — opens modal -->
                    <div class="flex items-center gap-3.5 px-4 py-3 -mx-4 rounded-2xl hover:bg-slate-100 transition-all cursor-pointer"
                        onclick="window.openSettingsPasswordModal ? window.openSettingsPasswordModal() : (document.getElementById('pw-modal').style.display='flex');">
                        <span class="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-black-fade shrink-0">
                            <i class="fa-solid fa-lock text-xs"></i>
                        </span>
                        <span class="text-sm font-semibold text-black">Change Password</span>
                        <i class="fa-solid fa-chevron-right text-[10px] text-black-fade ml-auto"></i>
                    </div>
                </div>

            `;
        }


        html += `
                </div>
            </section>
        </div>
        `;

        container.innerHTML = html;
        const detailHeading = container.querySelector('.sigma-settings-inner h2');
        if (detailHeading) {
            const headingRow = document.createElement('div');
            headingRow.className = 'sigma-settings-detail-heading';
            const back = document.createElement('button');
            back.type = 'button';
            back.className = 'sigma-settings-mobile-back';
            back.setAttribute('aria-label', 'Back to Account Settings');
            back.title = 'Back';
            back.innerHTML = '<i class="fa-solid fa-chevron-left" aria-hidden="true"></i>';
            back.addEventListener('click', () => window.showSettingsCategories(container.id));
            detailHeading.before(headingRow);
            headingRow.append(back, detailHeading);
        }
        requestAnimationFrame(updateMobileSettingsHeight);
        if (currentTab === 'notifications') {
            container.querySelector('[data-notification-reset]')?.addEventListener('click', () => {
                const reset = () => {
                if (saveNotificationPreferences(userId, { ...DEFAULT_NOTIFICATION_PREFERENCES })) {
                    container.querySelectorAll('input[id^="notif-pref-"]').forEach(toggle => {
                        toggle.checked = DEFAULT_NOTIFICATION_PREFERENCES[toggle.id.replace('notif-pref-', '')];
                    });
                } else {
                    showToast('Unable to reset notification preferences. Please try again.', 'fa-circle-exclamation');
                }
                };
                if (typeof window.showSigmaDialog === 'function') {
                    window.showSigmaDialog({
                        title: 'Reset Notification Preferences',
                        desc: 'Restore your notification preferences to their defaults? This will save immediately.',
                        icon: 'fa-solid fa-arrow-rotate-left text-[#15803d]',
                        confirmText: 'Reset', cancelText: 'Cancel', onConfirm: reset
                    });
                } else if (window.confirm('Reset notification preferences to their defaults?')) {
                    reset();
                }
            });
            container.querySelectorAll('input[id^="notif-pref-"]').forEach(toggle => {
                toggle.addEventListener('change', () => {
                    if (!window.handleSaveNotificationSettings(userId)) toggle.checked = !toggle.checked;
                });
            });
        }

        // ── Inject password modal directly into document.body ──────────────────
        // Must be a direct child of <body> so position:fixed covers the full
        // viewport — including sidebar & navbar — regardless of any CSS
        // transform/will-change/filter on ancestor elements (which would
        // otherwise create a new stacking context and clip the overlay).
        const existingModal = document.getElementById('pw-modal');
        if (existingModal) existingModal.remove();

        const pwModal = document.createElement('div');
        pwModal.id = 'pw-modal';
        pwModal.style.cssText = [
            'display:none',
            'position:fixed',
            'inset:0',
            'top:0',
            'left:0',
            'right:0',
            'bottom:0',
            'width:100vw',
            'height:100vh',
            'z-index:999999',
            'background:rgba(0,0,0,0.65)',
            'align-items:center',
            'justify-content:center',
        ].join(';');
        pwModal.innerHTML = `
            <div class="bg-white rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.18)] w-full max-w-[480px] mx-4 p-8 flex flex-col gap-6 font-['Inter'] relative animate-in fade-in zoom-in-95 duration-200">
                <!-- Header -->
                <div class="space-y-1">
                    <h3 class="text-2xl font-bold text-black tracking-tight font-['Inter']">Change Password</h3>
                    <p class="text-sm font-normal text-black-fade leading-relaxed font-['Inter']">
                        Please enter your current password and your new account password below.
                    </p>
                </div>

                <!-- Fields -->
                <div class="space-y-5">
                    <!-- Current Password -->
                    <div class="space-y-2">
                        <label for="settings-sec-current-pw" class="text-sm font-bold text-black capitalize tracking-normal ml-1">Current Password</label>
                        <div class="relative">
                            <input type="password" id="settings-sec-current-pw" placeholder="••••••••"
                                oninput="this.value = this.value.replace(/[^a-zA-Z0-9\\W]/g, ''); window.validateSettingsPasswordForm(); window.updateSettingsPwEyeState(this);"
                                class="w-full bg-slate-50 border-b-2 border-slate-300 rounded-none px-4 py-3.5 pr-12 text-base font-medium text-black outline-none hover:bg-slate-100 hover:border-slate-400 focus:bg-slate-100 focus:border-black transition-all placeholder:text-black/40 font-['Inter'] shadow-none">
                            <button type="button" class="password-toggle-btn absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black focus:outline-none bg-transparent border-none p-0 cursor-pointer opacity-0 pointer-events-none transition-opacity"
                                onclick="window.toggleSettingsPwVisibility('settings-sec-current-pw', this)" onmousedown="event.preventDefault()">
                                <i class="fa-solid fa-eye-slash text-lg"></i>
                            </button>
                        </div>
                        <div id="settings-current-pw-warning" class="hidden text-xs font-semibold text-rose-600 flex items-center gap-1.5 pt-1 ml-1 font-['Inter']"></div>
                    </div>

                    <!-- New Password -->
                    <div class="space-y-2">
                        <label for="settings-sec-new-pw" class="text-sm font-bold text-black capitalize tracking-normal ml-1">New Password</label>
                        <div class="relative">
                            <input type="password" id="settings-sec-new-pw" placeholder="••••••••"
                                oninput="this.value = this.value.replace(/[^a-zA-Z0-9\\W]/g, ''); window.validateSettingsPasswordForm(); window.updateSettingsPwEyeState(this);"
                                class="w-full bg-slate-50 border-b-2 border-slate-300 rounded-none px-4 py-3.5 pr-12 text-base font-medium text-black outline-none hover:bg-slate-100 hover:border-slate-400 focus:bg-slate-100 focus:border-black transition-all placeholder:text-black/40 font-['Inter'] shadow-none">
                            <button type="button" class="password-toggle-btn absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black focus:outline-none bg-transparent border-none p-0 cursor-pointer opacity-0 pointer-events-none transition-opacity"
                                onclick="window.toggleSettingsPwVisibility('settings-sec-new-pw', this)" onmousedown="event.preventDefault()">
                                <i class="fa-solid fa-eye-slash text-lg"></i>
                            </button>
                        </div>
                        <div id="settings-new-pw-warning" class="hidden text-xs font-semibold text-rose-600 flex items-center gap-1.5 pt-1 ml-1 font-['Inter']"></div>
                    </div>

                    <!-- Confirm New Password -->
                    <div class="space-y-2">
                        <label for="settings-sec-confirm-pw" class="text-sm font-bold text-black capitalize tracking-normal ml-1">Confirm New Password</label>
                        <div class="relative">
                            <input type="password" id="settings-sec-confirm-pw" placeholder="••••••••"
                                oninput="this.value = this.value.replace(/[^a-zA-Z0-9\\W]/g, ''); window.validateSettingsPasswordForm(); window.updateSettingsPwEyeState(this);"
                                class="w-full bg-slate-50 border-b-2 border-slate-300 rounded-none px-4 py-3.5 pr-12 text-base font-medium text-black outline-none hover:bg-slate-100 hover:border-slate-400 focus:bg-slate-100 focus:border-black transition-all placeholder:text-black/40 font-['Inter'] shadow-none">
                            <button type="button" class="password-toggle-btn absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black focus:outline-none bg-transparent border-none p-0 cursor-pointer opacity-0 pointer-events-none transition-opacity"
                                onclick="window.toggleSettingsPwVisibility('settings-sec-confirm-pw', this)" onmousedown="event.preventDefault()">
                                <i class="fa-solid fa-eye-slash text-lg"></i>
                            </button>
                        </div>
                        <div id="settings-confirm-pw-warning" class="hidden text-xs font-semibold text-rose-600 flex items-center gap-1.5 pt-1 ml-1 font-['Inter']"></div>
                    </div>

                    <!-- Forgot password link -->
                    <div class="pt-1">
                        <button type="button" id="pw-forgot-btn"
                            onclick="window.__openForgotPw && window.__openForgotPw()"
                            class="text-xs font-semibold text-green-700 hover:text-green-800 hover:underline cursor-pointer bg-transparent border-0 p-0 font-['Inter']">
                            Forgot Password?
                        </button>
                    </div>
                </div>

                <!-- Inline error message -->
                <p id="pw-modal-error" class="hidden text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 font-['Inter']"></p>
                <!-- Success message -->
                <p id="pw-modal-success" class="hidden text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-xl p-3 font-['Inter']"></p>

                <!-- Footer -->
                <div class="flex items-center justify-between gap-3 pt-4 border-t border-slate-100 font-['Inter']">
                    <button type="button" class="sigma-btn sigma-btn-md sigma-btn-secondary cursor-pointer"
                        onclick="window.closeSettingsPasswordModal()">
                        Cancel
                    </button>
                    <button type="button" id="pw-submit-btn" disabled
                        class="sigma-btn sigma-btn-md sigma-btn-primary flex items-center gap-2"
                        style="opacity: 0.45; cursor: not-allowed;"
                        onclick="window.handleSavePassword('${userId}')">
                        <span>Change Password</span>
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(pwModal);

        // Expose forgot-password handler so the inline onclick can reach it
        window.__openForgotPw = function () {
            const modal = document.getElementById('pw-modal');
            if (!modal) return;
            const panelSize = modal.firstElementChild.getBoundingClientRect();
            modal.firstElementChild.style.display = 'none';
            let recovery = modal.querySelector('#pw-recovery-view');
            if (!recovery) {
                recovery = document.createElement('div');
                recovery.id = 'pw-recovery-view';
                recovery.className = "bg-white rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.18)] w-full max-w-[480px] mx-4 p-8 font-['Inter'] relative";
                modal.appendChild(recovery);
            }
            recovery.style.cssText = `height:${panelSize.height}px;max-height:calc(100dvh - 32px);overflow:auto;display:flex;flex-direction:column;`;
            renderForgotPasswordInfo(recovery, getActiveUser());
            recovery.style.display = 'flex';
            recovery.querySelector('button')?.focus();
        };
    }

    // ─── Forgot Password Info Panel ───
    function renderForgotPasswordInfo(container, user) {
        const userId = String(user.id || user.uid || '').trim();
        const cleanId = userId.replace(/^USER-/i, '').trim();
        const lastName = String(user.lastName || '').trim()
            .replace(/[^a-zA-Z0-9]/g, '')
            .toLowerCase();
        const defaultPassword = lastName && cleanId ? `${lastName}${cleanId}` : (cleanId || 'your school ID');

        container.innerHTML = `
                <!-- Header -->
                <div style="display:flex;align-items:center;gap:14px;margin-bottom:24px;">
                    <button type="button" class="pw-recovery-header-back" aria-label="Back to Change Password" title="Back to Change Password" onclick="window.__backToPassword && window.__backToPassword()">
                        <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
                    </button>
                    <div>
                        <h2 class="text-2xl font-bold text-black" style="margin:0;">Forgot Password</h2>
                        <p style="margin:2px 0 0;font-size:0.8rem;color:rgba(0,0,0,0.45);">Your account recovery info</p>
                    </div>
                </div>

                <!-- Default Password Card -->
                <div style="background:rgba(0,0,0,0.04);border:1px solid rgba(0,0,0,0.08);border-radius:8px;padding:18px 20px;margin-bottom:16px;">
                    <p style="margin:0 0 6px;font-size:0.75rem;font-weight:600;color:rgba(0,0,0,0.55);letter-spacing:0;">Your Default Password</p>
                    <p style="margin:0;font-size:1.25rem;font-weight:700;color:#000;letter-spacing:0;font-family:monospace;overflow-wrap:anywhere;">${_esc(defaultPassword)}</p>
                    <p style="margin:8px 0 0;font-size:0.75rem;color:rgba(0,0,0,0.45);">This is the initial password assigned to your account.</p>
                </div>

                <!-- Advisory Notice -->
                <div style="background:#fefce8;border:1px solid #fde68a;border-radius:0.75rem;padding:16px 20px;margin-bottom:24px;display:flex;gap:12px;align-items:flex-start;">
                    <i class="fa-solid fa-circle-info" style="color:#d97706;margin-top:2px;flex-shrink:0;"></i>
                    <p style="margin:0;font-size:0.82rem;color:#92400e;line-height:1.55;">
                        If you have already changed your password and forgot it, please visit the <strong>Admin's Office</strong> to have your password reset.
                    </p>
                </div>

                <!-- Back Button -->
                <div class="pw-recovery-footer" style="margin-top:auto;display:flex;flex-wrap:wrap;gap:12px;padding-top:16px;border-top:1px solid #f1f5f9;">
                <button type="button"
                    class="sigma-btn sigma-btn-md sigma-btn-secondary"
                    onclick="window.__backToPassword && window.__backToPassword()">
                    <i class="fa-solid fa-arrow-left" aria-hidden="true"></i>
                    <span>Back</span>
                </button>
                </div>
        `;
        // Register a one-shot back-navigation helper
        window.__backToPassword = function () {
            const modal = document.getElementById('pw-modal');
            if (!modal) return;
            modal.querySelector('#pw-recovery-view').style.display = 'none';
            modal.firstElementChild.style.display = '';
            document.getElementById('pw-forgot-btn')?.focus();
        };
    }

    // ─── Handlers ───
    window.handleSaveNotificationSettings = function (userId) {
        const prefs = {
            schoolAnnouncements: document.getElementById('notif-pref-schoolAnnouncements')?.checked ?? true,
            classAnnouncements: document.getElementById('notif-pref-classAnnouncements')?.checked ?? true,
            topicReleases: document.getElementById('notif-pref-topicReleases')?.checked ?? getNotificationPreferences(userId).topicReleases,
            materialReleases: document.getElementById('notif-pref-materialReleases')?.checked ?? getNotificationPreferences(userId).materialReleases,
            assessmentReleases: document.getElementById('notif-pref-assessmentReleases')?.checked ?? getNotificationPreferences(userId).assessmentReleases,
            dueDates: document.getElementById('notif-pref-dueDates')?.checked ?? true,
            grades: document.getElementById('notif-pref-grades')?.checked ?? true,
        };

        if (saveNotificationPreferences(userId, prefs)) {
            window.SigmaNotifications?.refresh();
            return true;
        }
        showToast('Unable to save notification preferences. Please try again.');
        return false;
    };

    let editInformationReturnFocus;
    window.closeSelfEditInformation = function () {
        document.getElementById('self-edit-information')?.remove();
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
        editInformationReturnFocus?.focus();
    };

    window.openSelfEditInformation = function () {
        window.closeSelfEditInformation();
        const user = getActiveUser();
        editInformationReturnFocus = document.activeElement;

        const branchDisplay = user.schoolBranch || user.branch || 'Interface Computer College Caloocan';
        const rawRole = user.role || user.type || (getActivePortal() === 'student' ? 'Student' : (getActivePortal() === 'teacher' ? 'Teacher' : 'Admin'));
        const roleDisplay = rawRole.charAt(0).toUpperCase() + rawRole.slice(1);
        const cleanUserId = String(user.id || user.uid || '').replace(/^#/, '');
        const rawEmail = user.email || '';
        const gmailUsername = rawEmail.replace(/@gmail\.com$/i, '').replace(/@.*$/i, '');

        const overlay = document.createElement('div');
        overlay.id = 'self-edit-information';
        overlay.className = 'sigma-modal-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'self-edit-information-title');
        overlay.style.zIndex = '100000';

        overlay.innerHTML = `
            <!-- Exit Control (Far Right) -->
            <button type="button" onclick="window.closeSelfEditInformation()"
                class="self-edit-exit fixed top-10 right-10 w-12 h-12 rounded-full hover:bg-slate-200 flex items-center justify-center text-black transition-all z-[1001] cursor-pointer"
                title="Exit Editor">
                <i class="fa-solid fa-xmark text-xl"></i>
            </button>

            <div class="sigma-modal-shell animate-in slide-in-from-top-4 duration-300">
                <div class="sigma-modal-panel">
                    <!-- Header -->
                    <div class="border-b border-slate-100 sticky top-0 bg-white z-20">
                        <div class="self-edit-header px-10 py-5 flex items-center justify-between">
                            <div class="flex items-center gap-3">
                                <button type="button" class="self-edit-back" onclick="window.closeSelfEditInformation()" title="Back" aria-label="Back"><i class="fa-solid fa-chevron-left" aria-hidden="true"></i></button>
                                <h2 id="self-edit-information-title" class="text-2xl font-bold text-black tracking-tight font-['Inter']">Edit Information</h2>
                                <span class="text-xs font-bold px-2.5 py-1 rounded-full font-['Inter'] bg-emerald-100 text-emerald-800 border border-emerald-200">Active</span>
                            </div>
                        </div>
                    </div>

                    <!-- Form Body -->
                    <form id="self-edit-form" class="flex-1 custom-scrollbar px-10 py-6 space-y-6">
                        <!-- Name Fields (3 Columns) -->
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div class="space-y-3">
                                <label for="self-edit-firstname" class="sigma-subject-label text-base font-bold text-black capitalize tracking-normal ml-1">Firstname <span class="text-red-500">*</span></label>
                                <input type="text" id="self-edit-firstname" placeholder="Enter first name"
                                    maxlength="40" required autocomplete="given-name"
                                    value="${_esc(user.firstName || '')}"
                                    oninput="this.value = this.value.replace(/[^a-zA-ZñÑ\\s]/g, '').replace(/(?:^|\\s)\\S/g, c => c.toUpperCase())"
                                    class="sigma-subject-input w-full bg-slate-50 border-b-2 border-slate-300 rounded-none px-4 py-4 text-base font-medium text-black outline-none hover:bg-slate-100 hover:border-slate-400 focus:bg-slate-100 focus:border-black transition-all placeholder:text-black/40 font-['Inter'] shadow-none">
                            </div>
                            <div class="space-y-3">
                                <label for="self-edit-middlename" class="sigma-subject-label text-base font-bold text-black capitalize tracking-normal ml-1">Middlename <span class="text-red-500">*</span></label>
                                <input type="text" id="self-edit-middlename" placeholder="Enter middle name"
                                    maxlength="40" autocomplete="additional-name"
                                    value="${_esc(user.middleName || '')}"
                                    oninput="this.value = this.value.replace(/[^a-zA-ZñÑ\\s]/g, '').replace(/(?:^|\\s)\\S/g, c => c.toUpperCase())"
                                    class="sigma-subject-input w-full bg-slate-50 border-b-2 border-slate-300 rounded-none px-4 py-4 text-base font-medium text-black outline-none hover:bg-slate-100 hover:border-slate-400 focus:bg-slate-100 focus:border-black transition-all placeholder:text-black/40 font-['Inter'] shadow-none">
                            </div>
                            <div class="space-y-3">
                                <label for="self-edit-lastname" class="sigma-subject-label text-base font-bold text-black capitalize tracking-normal ml-1">Lastname <span class="text-red-500">*</span></label>
                                <input type="text" id="self-edit-lastname" placeholder="Enter last name"
                                    maxlength="40" required autocomplete="family-name"
                                    value="${_esc(user.lastName || '')}"
                                    oninput="this.value = this.value.replace(/[^a-zA-ZñÑ\\s]/g, '').replace(/(?:^|\\s)\\S/g, c => c.toUpperCase())"
                                    class="sigma-subject-input w-full bg-slate-50 border-b-2 border-slate-300 rounded-none px-4 py-4 text-base font-medium text-black outline-none hover:bg-slate-100 hover:border-slate-400 focus:bg-slate-100 focus:border-black transition-all placeholder:text-black/40 font-['Inter'] shadow-none">
                            </div>
                        </div>

                        <!-- Gender Field -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div class="space-y-3">
                                <label for="self-edit-gender" class="sigma-subject-label text-base font-bold text-black capitalize tracking-normal ml-1">Gender <span class="text-red-500">*</span></label>
                                <div class="relative">
                                    <select id="self-edit-gender" required
                                        class="sigma-subject-select w-full bg-slate-50 border-b-2 border-slate-300 rounded-none px-4 py-4 text-base font-medium text-black outline-none hover:bg-slate-100 hover:border-slate-400 focus:bg-slate-100 focus:border-black transition-all appearance-none cursor-pointer font-['Inter'] shadow-none">
                                        <option value="" disabled ${!user.gender ? 'selected' : ''} hidden>Select Gender</option>
                                        <option value="Male" ${user.gender === 'Male' ? 'selected' : ''}>Male</option>
                                        <option value="Female" ${user.gender === 'Female' ? 'selected' : ''}>Female</option>
                                        ${user.gender && user.gender !== 'Male' && user.gender !== 'Female' ? `<option value="${_esc(user.gender)}" selected>${_esc(user.gender)}</option>` : ''}
                                    </select>
                                    <i class="fa-solid fa-chevron-down absolute right-5 top-1/2 -translate-y-1/2 text-xs text-black pointer-events-none"></i>
                                </div>
                            </div>
                        </div>

                        <!-- ID Number & Gmail Symmetrically Paired in 2 Columns -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div class="space-y-3">
                                <label for="self-edit-id" class="sigma-subject-label text-base font-bold text-black capitalize tracking-normal ml-1">ID Number</label>
                                <input type="text" id="self-edit-id" placeholder="ID Number"
                                    maxlength="10"
                                    value="${_esc(cleanUserId)}"
                                    readonly disabled
                                    class="sigma-subject-input w-full bg-slate-100/70 border-b-2 border-slate-200 rounded-none px-4 py-4 text-base font-bold text-slate-700 outline-none cursor-not-allowed font-['Inter'] shadow-none">
                            </div>

                            <div class="space-y-3">
                                <label for="self-edit-email" class="sigma-subject-label text-base font-bold text-black capitalize tracking-normal ml-1">Gmail <span class="text-red-500">*</span></label>
                                <div class="relative flex items-center">
                                    <input type="text" id="self-edit-email" placeholder="gmail username"
                                        value="${_esc(gmailUsername)}"
                                        readonly disabled
                                        class="sigma-subject-input w-full bg-slate-100/70 border-b-2 border-slate-200 rounded-none pl-4 pr-28 py-4 text-base font-medium text-slate-700 outline-none cursor-not-allowed font-['Inter'] shadow-none">
                                    <span class="absolute right-4 text-sm font-bold text-black pointer-events-none select-none">@gmail.com</span>
                                </div>
                            </div>
                        </div>
                    </form>

                    <!-- Pinned Modal Footer -->
                    <div class="sigma-modal-footer flex items-center justify-end gap-3 px-10 py-5 border-t border-slate-200 bg-white sticky bottom-0 z-30 font-['Inter']">
                        <button type="submit" form="self-edit-form" id="self-edit-save-btn"
                            class="sigma-btn sigma-btn-primary sigma-btn-md !h-[48px] !px-8 !rounded-xl !text-base !font-bold transition-all cursor-pointer">
                            <span>Save Changes</span>
                        </button>
                    </div>
                </div>
            </div>`;

        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';

        overlay.querySelector('#self-edit-form').addEventListener('submit', event => {
            event.preventDefault();
            window.handleSaveAccountInfo(String(user.id || user.uid || ''));
        });

        overlay.addEventListener('keydown', event => {
            if (event.key === 'Escape') {
                event.preventDefault();
                window.closeSelfEditInformation();
            }
            if (event.key === 'Tab') {
                const controls = [...overlay.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled])')];
                if (controls.length > 0) {
                    const first = controls[0], last = controls[controls.length - 1];
                    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
                    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
                }
            }
        });

        document.body.appendChild(overlay);
        overlay.querySelector('#self-edit-firstname')?.focus();
    };

    window.handleSaveAccountInfo = function (userId) {
        const activeUser = getActiveUser();
        const effectiveId = userId || activeUser.id || activeUser.uid;
        if (!effectiveId) return;

        const fname = (document.getElementById('self-edit-firstname')?.value || document.getElementById('settings-acc-firstname')?.value || '').trim();
        const mname = (document.getElementById('self-edit-middlename')?.value || document.getElementById('settings-acc-middlename')?.value || '').trim();
        const lname = (document.getElementById('self-edit-lastname')?.value || document.getElementById('settings-acc-lastname')?.value || '').trim();
        const fullName = [fname, mname, lname].filter(Boolean).join(' ');
        const gender = (document.getElementById('self-edit-gender')?.value || document.getElementById('settings-acc-gender')?.value || activeUser.gender || '');
        const email = activeUser.email;

        if (!fname || !lname) {
            alert('First name and last name cannot be empty.');
            return;
        }

        // Capture previous user state
        let previousUser = null;
        try {
            const rawAuth = sessionStorage.getItem('sigma-authenticated-user');
            if (rawAuth) previousUser = JSON.parse(rawAuth);
        } catch (e) {}
        if (!previousUser) {
            const adminUsers = getStoredJson('sigma-admin-users', []);
            previousUser = adminUsers.find(u => String(u.id || u.uid) === String(effectiveId)) || null;
        }

        const updatedUser = {
            id: effectiveId,
            uid: effectiveId,
            firstName: fname,
            middleName: mname,
            lastName: lname,
            fullName: fullName,
            gender: gender,
            email: email
        };

        // Update authenticated user in session
        try {
            const auth = JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}');
            auth.firstName = fname;
            auth.middleName = mname;
            auth.lastName = lname;
            auth.fullName = fullName;
            auth.gender = gender;
            auth.email = email;
            sessionStorage.setItem('sigma-authenticated-user', JSON.stringify(auth));
        } catch (e) {}

        // Update in localStorage users list
        const cleanEffectiveId = String(effectiveId).replace(/^#/, '').trim();
        const storageKeys = ['sigma-admin-users', 'sigma-teacher-users', 'sigma-student-users', 'sigma-users-list'];
        storageKeys.forEach(k => {
            try {
                const list = getStoredJson(k, []);
                if (Array.isArray(list)) {
                    let updated = false;
                    list.forEach(u => {
                        const cleanUId = String(u.uid || u.id || '').replace(/^#/, '').trim();
                        if (cleanUId === cleanEffectiveId) {
                            u.firstName = fname;
                            u.middleName = mname;
                            u.lastName = lname;
                            u.fullName = fullName;
                            u.gender = gender;
                            u.email = email;
                            updated = true;
                        }
                    });
                    if (updated) window.saveStoredJson(k, list);
                }
            } catch (e) {}
        });

        // Also update sigma_user_profile if present
        try {
            const userProfile = getStoredJson('sigma_user_profile', null);
            if (userProfile && typeof userProfile === 'object') {
                userProfile.firstName = fname;
                userProfile.middleName = mname;
                userProfile.lastName = lname;
                userProfile.fullName = fullName;
                userProfile.gender = gender;
                window.saveStoredJson('sigma_user_profile', userProfile);
            }
        } catch (e) {}

        // Propagate across all connected sections, subjects, rosters, and session
        if (typeof window.propagateUserUpdateToAllConnected === 'function') {
            window.propagateUserUpdateToAllConnected(updatedUser, previousUser);
        }

        // Sync header name
        const headerFname = document.getElementById('header-dropdown-firstName');
        const headerLname = document.getElementById('header-dropdown-lastName');
        if (headerFname) headerFname.textContent = fname;
        if (headerLname) headerLname.textContent = lname;

        // Sync Admin table and profile views if present
        if (typeof window.renderUserAccountsTable === 'function') {
            window.renderUserAccountsTable();
        }
        if (typeof window.syncUserProfileData === 'function') {
            window.syncUserProfileData();
        }
        window.dispatchEvent(new CustomEvent('sigma:user-profile-updated', { detail: updatedUser }));

        window.closeSelfEditInformation();
        showToast('Account details updated successfully!');

        // Refresh settings account tab to view mode
        const settingsContainer = document.querySelector('[data-settings-container]');
        if (settingsContainer && typeof window.renderSettingsView === 'function') {
            window.renderSettingsView(settingsContainer.id, 'account');
        }
    };

    window.toggleSettingsPwVisibility = function (inputId, btn) {
        const input = document.getElementById(inputId);
        if (!input) return;
        const isPass = input.type === 'password';
        input.type = isPass ? 'text' : 'password';
        const icon = btn.querySelector('i');
        if (icon) {
            icon.classList.toggle('fa-eye', isPass);
            icon.classList.toggle('fa-eye-slash', !isPass);
        }
    };

    window.updateSettingsPwEyeState = function (input) {
        if (!input) return;
        const btn = input.parentElement ? input.parentElement.querySelector('.password-toggle-btn') : null;
        if (btn) {
            const hasVal = Boolean(input.value);
            btn.classList.toggle('opacity-0', !hasVal);
            btn.classList.toggle('pointer-events-none', !hasVal);
        }
    };

    window.validateSettingsPasswordForm = function (showIfEmpty = false) {
        const curInput = document.getElementById('settings-sec-current-pw');
        const newPassInput = document.getElementById('settings-sec-new-pw');
        const confirmPassInput = document.getElementById('settings-sec-confirm-pw');

        const curWarning = document.getElementById('settings-current-pw-warning');
        const newWarning = document.getElementById('settings-new-pw-warning');
        const confirmWarning = document.getElementById('settings-confirm-pw-warning');
        const submitBtn = document.getElementById('pw-submit-btn');

        const cur = curInput ? curInput.value : '';
        const newPass = newPassInput ? newPassInput.value : '';
        const confirmPass = confirmPassInput ? confirmPassInput.value : '';

        let curError = '';
        let newPassError = '';
        let confirmPassError = '';

        if (cur.length > 0 || showIfEmpty) {
            if (!cur) {
                curError = 'Current password is required.';
            }
        }

        if (newPass.length > 0 || showIfEmpty) {
            if (!newPass) {
                newPassError = 'Password is required.';
            } else if (/\s/.test(newPass)) {
                newPassError = 'Password cannot contain spaces.';
            } else if (newPass.length < 6) {
                newPassError = 'Password must be at least 6 characters.';
            } else if (!/[A-Z]/.test(newPass)) {
                newPassError = 'Password must contain at least 1 uppercase letter.';
            } else if (!/[a-z]/.test(newPass)) {
                newPassError = 'Password must contain lowercase letters.';
            } else if (!/[0-9]/.test(newPass)) {
                newPassError = 'Password must contain at least 1 number.';
            } else if (!/[^\w\s]/.test(newPass)) {
                newPassError = 'Password must contain at least 1 special character.';
            }
        }

        if (confirmPass.length > 0 || (showIfEmpty && newPass)) {
            if (!confirmPass) {
                confirmPassError = 'Please confirm your new password.';
            } else if (newPass !== confirmPass) {
                confirmPassError = 'Passwords do not match.';
            }
        }

        if (curWarning) {
            if (curError) {
                curWarning.innerHTML = `<i class="fa-solid fa-circle-exclamation text-xs"></i><span>${curError}</span>`;
                curWarning.classList.remove('hidden');
            } else {
                curWarning.innerHTML = '';
                curWarning.classList.add('hidden');
            }
        }

        if (newWarning) {
            if (newPassError) {
                newWarning.innerHTML = `<i class="fa-solid fa-circle-exclamation text-xs"></i><span>${newPassError}</span>`;
                newWarning.classList.remove('hidden');
            } else {
                newWarning.innerHTML = '';
                newWarning.classList.add('hidden');
            }
        }

        if (confirmWarning) {
            if (confirmPassError) {
                confirmWarning.innerHTML = `<i class="fa-solid fa-circle-exclamation text-xs"></i><span>${confirmPassError}</span>`;
                confirmWarning.classList.remove('hidden');
            } else {
                confirmWarning.innerHTML = '';
                confirmWarning.classList.add('hidden');
            }
        }

        const isFormValid = cur.length > 0 &&
            !/\s/.test(newPass) &&
            newPass.length >= 6 &&
            /[A-Z]/.test(newPass) &&
            /[a-z]/.test(newPass) &&
            /[0-9]/.test(newPass) &&
            /[^\w\s]/.test(newPass) &&
            newPass === confirmPass;

        if (submitBtn) {
            submitBtn.disabled = !isFormValid;
            submitBtn.style.opacity = isFormValid ? '1' : '0.45';
            submitBtn.style.cursor = isFormValid ? 'pointer' : 'not-allowed';
        }

        return isFormValid;
    };

    window.closeSettingsPasswordModal = function () {
        const modal = document.getElementById('pw-modal');
        if (modal) {
            modal.style.display = 'none';
            modal.querySelector('#pw-recovery-view')?.remove();
            if (modal.firstElementChild) modal.firstElementChild.style.display = '';
        }

        const cur = document.getElementById('settings-sec-current-pw');
        const nxt = document.getElementById('settings-sec-new-pw');
        const conf = document.getElementById('settings-sec-confirm-pw');
        if (cur) { cur.value = ''; cur.type = 'password'; }
        if (nxt) { nxt.value = ''; nxt.type = 'password'; }
        if (conf) { conf.value = ''; conf.type = 'password'; }

        // Reset eye toggle button icons and visibility
        ['settings-sec-current-pw', 'settings-sec-new-pw', 'settings-sec-confirm-pw'].forEach(id => {
            const inp = document.getElementById(id);
            if (inp) {
                window.updateSettingsPwEyeState(inp);
                const btn = inp.parentElement ? inp.parentElement.querySelector('.password-toggle-btn') : null;
                if (btn) {
                    const icon = btn.querySelector('i');
                    if (icon) {
                        icon.classList.remove('fa-eye');
                        icon.classList.add('fa-eye-slash');
                    }
                }
            }
        });

        const curW = document.getElementById('settings-current-pw-warning');
        const nxtW = document.getElementById('settings-new-pw-warning');
        const confW = document.getElementById('settings-confirm-pw-warning');
        if (curW) { curW.innerHTML = ''; curW.classList.add('hidden'); }
        if (nxtW) { nxtW.innerHTML = ''; nxtW.classList.add('hidden'); }
        if (confW) { confW.innerHTML = ''; confW.classList.add('hidden'); }

        const er = document.getElementById('pw-modal-error');
        const ok = document.getElementById('pw-modal-success');
        if (er) { er.classList.add('hidden'); er.style.display = 'none'; er.textContent = ''; }
        if (ok) { ok.classList.add('hidden'); ok.style.display = 'none'; ok.textContent = ''; }

        const btn = document.getElementById('pw-submit-btn');
        if (btn) {
            btn.disabled = true;
            btn.style.opacity = '0.45';
            btn.style.cursor = 'not-allowed';
        }
    };

    window.openSettingsPasswordModal = function () {
        if (typeof window.closeSettingsPasswordModal === 'function') {
            window.closeSettingsPasswordModal();
        }
        const modal = document.getElementById('pw-modal');
        if (modal) {
            modal.style.display = 'flex';
            setTimeout(() => {
                document.getElementById('settings-sec-current-pw')?.focus();
            }, 60);
        }
    };

    window.handleSavePassword = function (userId) {
        const isValid = window.validateSettingsPasswordForm ? window.validateSettingsPasswordForm(true) : true;
        if (!isValid) return;

        const cur = document.getElementById('settings-sec-current-pw')?.value || '';
        const nxt = document.getElementById('settings-sec-new-pw')?.value || '';
        const conf = document.getElementById('settings-sec-confirm-pw')?.value || '';

        const errEl = document.getElementById('pw-modal-error');
        const okEl = document.getElementById('pw-modal-success');

        function showErr(msg) {
            if (errEl) { errEl.textContent = msg; errEl.classList.remove('hidden'); errEl.style.display = 'block'; }
            if (okEl) { okEl.classList.add('hidden'); okEl.style.display = 'none'; okEl.textContent = ''; }
        }
        function clearMessages() {
            if (errEl) { errEl.classList.add('hidden'); errEl.style.display = 'none'; errEl.textContent = ''; }
            if (okEl) { okEl.classList.add('hidden'); okEl.style.display = 'none'; okEl.textContent = ''; }
        }

        clearMessages();

        const storageKeys = ['sigma-admin-users', 'sigma-teacher-users', 'sigma-student-users', 'sigma-users-list'];

        // Verify current password against account record
        let currentRealPw = '';
        for (const k of storageKeys) {
            try {
                const list = getStoredJson(k, []);
                if (Array.isArray(list)) {
                    const found = list.find(u => String(u.uid || u.id) === String(userId));
                    if (found) {
                        const defaultPw = found.lastName ? (String(found.lastName).trim().replace(/[^a-zA-Z0-9]/g, '').toLowerCase() + String(found.uid || found.id).trim()) : '';
                        currentRealPw = String(found.password || defaultPw);
                        break;
                    }
                }
            } catch (e) {}
        }

        if (!currentRealPw) {
            try {
                const auth = JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}');
                if (auth && auth.password) currentRealPw = String(auth.password);
            } catch (e) {}
        }

        if (currentRealPw && cur !== currentRealPw) {
            showErr('Current password does not match your account password.');
            return;
        }

        // Save in user record
        storageKeys.forEach(k => {
            try {
                const list = getStoredJson(k, []);
                if (Array.isArray(list)) {
                    let updated = false;
                    list.forEach(u => {
                        if (String(u.uid || u.id) === String(userId)) {
                            u.password = nxt;
                            updated = true;
                        }
                    });
                    if (updated) window.saveStoredJson(k, list);
                }
            } catch (e) {}
        });

        // Update session storage if matching active user
        try {
            const auth = JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}');
            if (auth && (String(auth.uid || auth.id) === String(userId) || !auth.id)) {
                auth.password = nxt;
                sessionStorage.setItem('sigma-authenticated-user', JSON.stringify(auth));
            }
        } catch (e) {}

        // Show success inline, then auto-close modal
        if (okEl) {
            okEl.textContent = 'Password changed successfully!';
            okEl.classList.remove('hidden');
            okEl.style.display = 'block';
        }
        if (window.showToast) {
            window.showToast('Password updated successfully');
        }
        setTimeout(() => {
            window.closeSettingsPasswordModal();
        }, 1200);
    };


    // ─── Global Navigation Triggers ───
    function updateMobileSettingsHeight() {
        document.querySelectorAll('.sigma-account-settings').forEach(layout => {
            if (!layout.getClientRects().length) return;
            const top = Math.max(0, layout.getBoundingClientRect().top + window.scrollY);
            layout.style.setProperty('--settings-mobile-top', `${top}px`);
        });
    }
    window.addEventListener('resize', updateMobileSettingsHeight);

    window.openSettingsCategory = function (containerId, tab) {
        const container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
        if (!container) return;
        container.dataset.mobileSettingsView = 'detail';
        renderSettingsView(container, tab);
        if (typeof history !== 'undefined' && history.pushState) {
            history.pushState({ type: 'settings-detail', tab: tab, containerId: container.id }, '', '#account-settings-' + tab);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
        container.querySelector('.sigma-settings-mobile-back')?.focus();
    };

    window.showSettingsCategories = function (containerId) {
        const container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
        if (!container) return;
        container.dataset.mobileSettingsView = 'list';
        const layout = container.querySelector('.sigma-account-settings');
        if (layout) {
            layout.classList.remove('sigma-settings-detail');
        }
        if (typeof history !== 'undefined' && history.pushState && window.location.hash.startsWith('#account-settings-')) {
            history.pushState({ type: 'tab', navId: 'nav-settings', page: 'settings' }, '', '#account-settings');
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
        const firstCat = container.querySelector('.sigma-settings-cat-btn');
        if (firstCat) firstCat.focus();
    };

    window.navigateToAccountSettings = function (tabName = 'notifications') {
        // 0. Force dismiss any pending or stuck top-nav loading sweep
        if (typeof window.forceHideTopNavLoading === 'function') {
            window.forceHideTopNavLoading();
        } else if (typeof window.hideTopNavLoading === 'function') {
            window.hideTopNavLoading();
        }
        const bar = document.getElementById('top-nav-loading-bar');
        if (bar) {
            bar.style.opacity = '0';
            bar.style.width = '0%';
            bar.classList.add('hidden');
        }

        // 1. Fully dismiss mobile full-screen panels & drawers
        if (typeof window.closeMobileAccountPanel === 'function') {
            window.closeMobileAccountPanel();
        }
        if (typeof window.closeMobileTopPanel === 'function') {
            window.closeMobileTopPanel();
        }

        // 2. Remove mobile overlay lock classes so main-content pointer events & touch are restored
        document.body.classList.remove('mobile-account-fullscreen', 'mobile-panel-open');
        document.documentElement.classList.remove('mobile-account-fullscreen', 'mobile-panel-open');

        // 3. Close mobile sidebar if open
        if (typeof window.collapseSidebar === 'function') {
            window.collapseSidebar();
        }
        const sb = document.getElementById('sidebar');
        if (sb) sb.classList.remove('sidebar-visible');
        const ov = document.getElementById('sidebar-overlay');
        if (ov) ov.classList.add('hidden');

        // 4. Dismiss desktop / topbar overlays
        if (typeof window.hideHeaderOverlays === 'function') {
            window.hideHeaderOverlays();
        }

        // Close profile panel dropdown
        const profDropdown = document.getElementById('profile-dropdown') || document.getElementById('profileDropdownMenu');
        if (profDropdown) {
            profDropdown.classList.remove('mobile-account-fullscreen');
            profDropdown.classList.add('hidden');
        }
        const profToggle = document.getElementById('profile-toggle') || document.getElementById('profileDropdownBtn');
        if (profToggle) profToggle.classList.remove('active');

        // Hide all dynamic sections
        document.querySelectorAll('.dynamic-section').forEach(s => s.classList.add('hidden'));

        // Close sub-sidebar overlay if open
        const subSidebar = document.getElementById('sub-sidebar');
        if (subSidebar) {
            subSidebar.classList.add('hidden');
            subSidebar.classList.remove('sub-sidebar-visible');
        }

        // Header Title: Update to "Account Settings" via unified topbar controller
        if (typeof window.setPortalHeader === 'function') {
            window.setPortalHeader('Account Settings');
        }

        // Show settings view section
        let settingsView = document.getElementById('user-settings-view');
        if (!settingsView) {
            settingsView = document.createElement('section');
            settingsView.id = 'user-settings-view';
            settingsView.className = 'dynamic-section py-6 px-4 md:px-8';
            const mainContainer = document.getElementById('admin-main') 
                || document.getElementById('main-content')
                || document.querySelector('main')
                || document.body;
            mainContainer.appendChild(settingsView);
        }

        settingsView.classList.remove('hidden');

        const isMobile = typeof window !== 'undefined' && (window.innerWidth < 1024 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));

        // When on mobile:
        // Always load the left category menu as a page first (Level 1)
        // unless a specific sub-detail tab (account or security) was explicitly requested via deep link
        if (isMobile) {
            if (!tabName || tabName === 'notifications' || tabName === 'account-settings' || tabName === 'settings') {
                settingsView.dataset.mobileSettingsView = 'list';
            } else {
                settingsView.dataset.mobileSettingsView = 'detail';
            }
        } else {
            settingsView.dataset.mobileSettingsView = 'list';
        }

        const targetTab = tabName && tabName !== 'account-settings' && tabName !== 'settings' ? tabName : 'notifications';
        const hash = '#account-settings' + (isMobile && settingsView.dataset.mobileSettingsView === 'list' ? '' : (targetTab !== 'notifications' ? `-${targetTab}` : ''));
        if (window.location.hash !== hash && history.pushState) {
            history.pushState({ type: 'tab', navId: 'nav-settings', page: 'settings', tab: targetTab }, '', hash);
        }

        renderSettingsView('user-settings-view', targetTab);

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.navigateToSettings = function (tabName = 'security') {
        const portal = getActivePortal();
        if (portal === 'admin') {
            const systemTabs = ['security', 'branding', 'integrations', 'preference', 'storage', 'api'];
            const normalizedTab = String(tabName || '').toLowerCase().replace('nav-settings-', '');
            if (systemTabs.includes(normalizedTab)) {
                if (typeof window.switchTab === 'function') {
                    window.switchTab('nav-settings-' + normalizedTab);
                    return;
                }
            }
        }
        window.navigateToAccountSettings(tabName);
    };

    // Browser back/forward handler for seamless mobile list <-> detail transitions
    if (typeof window !== 'undefined') {
        window.addEventListener('popstate', () => {
            const container = document.getElementById('user-settings-view');
            if (!container || container.classList.contains('hidden')) return;
            const isMobile = window.innerWidth < 1024 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            if (!isMobile) return;

            const hash = window.location.hash || '';
            if (hash === '#account-settings' || hash === '#settings' || !hash) {
                if (container.dataset.mobileSettingsView === 'detail') {
                    container.dataset.mobileSettingsView = 'list';
                    container.querySelector('.sigma-account-settings')?.classList.remove('sigma-settings-detail');
                }
            } else if (hash.startsWith('#account-settings-')) {
                const subTab = hash.replace('#account-settings-', '');
                if (['notifications', 'account', 'security'].includes(subTab)) {
                    container.dataset.mobileSettingsView = 'detail';
                    renderSettingsView(container, subTab);
                }
            }
        });
    }

    window.renderSettingsView = renderSettingsView;
    window.getNotificationPreferences = getNotificationPreferences;

})();
