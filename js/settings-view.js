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
    const PREFERENCES_STORAGE_PREFIX = 'sigma_settings_preferences_';

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

    function getGeneralPreferences(userId) {
        const defaultPrefs = {
            lang: 'en',
            timefmt: '12h',
            canModerateComments: true
        };
        try {
            const raw = localStorage.getItem(PREFERENCES_STORAGE_PREFIX + (userId || 'default'));
            if (raw) return { ...defaultPrefs, ...JSON.parse(raw) };
        } catch (e) {}
        return defaultPrefs;
    }

    function saveGeneralPreferences(userId, prefs) {
        try {
            localStorage.setItem(PREFERENCES_STORAGE_PREFIX + (userId || 'default'), JSON.stringify(prefs));
            return true;
        } catch (e) {
            console.error('Failed to save general preferences', e);
            return false;
        }
    }

    function getNotificationPreferences(userId) {
        const defaultPrefs = {
            announcements: true,
            dueDates: true,
            grades: true,
            sounds: true,
            email: false
        };
        try {
            const raw = localStorage.getItem(NOTIFICATION_STORAGE_PREFIX + (userId || 'default'));
            if (raw) return { ...defaultPrefs, ...JSON.parse(raw) };
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

        const validTabs = ['notifications', 'account', 'security', 'preferences'];

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
            { id: 'preferences', label: 'Preferences', icon: 'fa-sliders', title: 'General Preferences' }
        ];

        const activeMeta = tabs.find(t => t.id === currentTab) || tabs[0];

        let html = `
        <div class="sigma-settings-layout">
            <!-- Left Categories Sidebar -->
            <aside class="sigma-settings-sidebar">
                <nav class="flex flex-col gap-2" role="tablist" aria-label="Account Settings Categories">
                    ${tabs.map(t => {
                        const isActive = t.id === currentTab;
                        return `
                            <button type="button" 
                                class="sigma-settings-cat-btn ${isActive ? 'active bg-icc-yellow text-white' : 'text-black hover:bg-slate-100'}" 
                                onclick="window.renderSettingsView('${container.id}', '${t.id}')"
                                role="tab"
                                aria-selected="${isActive}">
                                <span class="sigma-settings-cat-icon">
                                    <i class="fa-solid ${t.icon} text-inherit"></i>
                                </span>
                                <span class="sigma-settings-cat-text text-inherit">${t.label}</span>
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
                                <h3 class="text-sm font-bold text-black">Announcements & Bulletins</h3>
                                <p class="text-xs text-black-fade font-medium mt-0.5">Receive alerts when campus, department, or section bulletins are published.</p>
                            </div>
                            <label class="sigma-toggle-switch shrink-0 ml-4">
                                <input type="checkbox" id="notif-pref-announcements" ${notifPrefs.announcements ? 'checked' : ''}>
                                <span class="sigma-toggle-slider"></span>
                            </label>
                        </div>

                        <!-- Due Dates / Submissions -->
                        <div class="flex items-center justify-between py-4 gap-4">
                            <div>
                                <h3 class="text-sm font-bold text-black">Due Date & Submission Reminders</h3>
                                <p class="text-xs text-black-fade font-medium mt-0.5">Get timely reminders for assignment deadlines and upcoming quizzes.</p>
                            </div>
                            <label class="sigma-toggle-switch shrink-0 ml-4">
                                <input type="checkbox" id="notif-pref-dueDates" ${notifPrefs.dueDates ? 'checked' : ''}>
                                <span class="sigma-toggle-slider"></span>
                            </label>
                        </div>

                        <!-- Grades & Assessments -->
                        <div class="flex items-center justify-between py-4 gap-4">
                            <div>
                                <h3 class="text-sm font-bold text-black">Grade & Evaluation Updates</h3>
                                <p class="text-xs text-black-fade font-medium mt-0.5">Notify when teachers post quiz results, activity scores, or quarterly grade cards.</p>
                            </div>
                            <label class="sigma-toggle-switch shrink-0 ml-4">
                                <input type="checkbox" id="notif-pref-grades" ${notifPrefs.grades ? 'checked' : ''}>
                                <span class="sigma-toggle-slider"></span>
                            </label>
                        </div>

                        <!-- Sound Alerts -->
                        <div class="flex items-center justify-between py-4 gap-4">
                            <div>
                                <h3 class="text-sm font-bold text-black">Audio Chimes & Sound Effects</h3>
                                <p class="text-xs text-black-fade font-medium mt-0.5">Play a subtle audio chime when new notifications and messages arrive.</p>
                            </div>
                            <label class="sigma-toggle-switch shrink-0 ml-4">
                                <input type="checkbox" id="notif-pref-sounds" ${notifPrefs.sounds ? 'checked' : ''}>
                                <span class="sigma-toggle-slider"></span>
                            </label>
                        </div>

                        <!-- Email Notifications -->
                        <div class="flex items-center justify-between py-4 gap-4">
                            <div>
                                <h3 class="text-sm font-bold text-black">Email Digest & Urgent Alerts</h3>
                                <p class="text-xs text-black-fade font-medium mt-0.5">Send high-priority notifications and summaries to your registered email address.</p>
                            </div>
                            <label class="sigma-toggle-switch shrink-0 ml-4">
                                <input type="checkbox" id="notif-pref-email" ${notifPrefs.email ? 'checked' : ''}>
                                <span class="sigma-toggle-slider"></span>
                            </label>
                        </div>
                    </div>

                    <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                        <button type="button" class="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-black text-xs font-bold transition-all cursor-pointer" onclick="window.renderSettingsView('${container.id}', 'notifications')">
                            <span>Reset</span>
                        </button>
                        <button type="button" class="px-6 py-2.5 rounded-xl bg-[#15803d] hover:bg-[#166534] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer" onclick="window.handleSaveNotificationSettings('${userId}')">
                            <i class="fa-solid fa-check text-xs"></i>
                            <span>Save Preferences</span>
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

                    <!-- EDIT MODE (hidden by default) -->
                    <div id="acc-edit-mode" class="hidden" style="display:none;">
                        <div class="sm:col-span-2">
                            <label for="settings-acc-fullname" class="block text-xs font-bold text-black mb-2">Name</label>
                            <input type="text" id="settings-acc-fullname" maxlength="60" class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-black outline-none focus:border-[#15803d] transition-all" value="${_esc(fullName)}" placeholder="Enter full name">
                        </div>
                        <div>
                            <label for="settings-acc-gender" class="block text-xs font-bold text-black mb-2">Gender</label>
                            <select id="settings-acc-gender" class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-black outline-none focus:border-[#15803d] transition-all">
                                <option value="Male" ${user.gender === 'Male' ? 'selected' : ''}>Male</option>
                                <option value="Female" ${user.gender === 'Female' ? 'selected' : ''}>Female</option>
                                <option value="Prefer not to say" ${user.gender === 'Prefer not to say' ? 'selected' : ''}>Prefer not to say</option>
                            </select>
                        </div>
                        <div class="sm:col-span-2">
                            <label for="settings-acc-email" class="block text-xs font-bold text-black mb-2">Email Address</label>
                            <input type="email" id="settings-acc-email" maxlength="64" class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-black outline-none focus:border-[#15803d] transition-all" value="${_esc(user.email || '')}">
                        </div>
                    </div>

                    <!-- FOOTER BUTTONS -->
                    <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                        <!-- View mode: Edit button -->
                        <button id="acc-edit-btn" type="button"
                            class="px-6 py-2.5 rounded-xl bg-[#15803d] hover:bg-[#166534] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                            onclick="
                                document.getElementById('acc-view-mode').style.display='none';
                                var em=document.getElementById('acc-edit-mode'); em.style.display=''; em.style.display='grid'; em.className='grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2';
                                document.getElementById('acc-edit-btn').style.display='none';
                                var sa=document.getElementById('acc-save-actions'); sa.style.display='flex'; sa.className='flex items-center gap-3';
                            ">
                            <i class="fa-solid fa-pen text-xs"></i>
                            <span>Edit Profile</span>
                        </button>
                        <!-- Edit mode: Discard + Save (hidden by default) -->
                        <div id="acc-save-actions" style="display:none;" class="flex items-center gap-3">
                            <button type="button"
                                class="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-black text-xs font-bold transition-all cursor-pointer"
                                onclick="window.renderSettingsView('${container.id}', 'account')">
                                <span>Discard</span>
                            </button>
                            <button type="button"
                                class="px-6 py-2.5 rounded-xl bg-[#15803d] hover:bg-[#166534] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                                onclick="window.handleSaveAccountInfo('${userId}')">
                                <i class="fa-solid fa-floppy-disk text-xs"></i>
                                <span>Save Changes</span>
                            </button>
                        </div>
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
                        <span class="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-400 shrink-0">
                            <i class="fa-solid fa-lock text-xs"></i>
                        </span>
                        <span class="text-sm font-semibold text-black">Change Password</span>
                        <i class="fa-solid fa-chevron-right text-[10px] text-slate-300 ml-auto"></i>
                    </div>
                </div>

            `;
        }

        // ═════════════════════════════════════════════════════════════════════
        // TAB 4: GENERAL PREFERENCES
        // ═════════════════════════════════════════════════════════════════════
        else if (currentTab === 'preferences') {
            const generalPrefs = getGeneralPreferences(userId);
            html += `
                <div class="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                    <div>
                        <h2 class="text-lg font-bold text-black">Display & Regional Preferences</h2>
                        <p class="text-xs text-black-fade font-medium mt-1">Configure your personal localization, clock format, and display options.</p>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                        <div>
                            <label for="settings-pref-lang" class="block text-xs font-bold text-black mb-2">Interface Language</label>
                            <select id="settings-pref-lang" class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-black outline-none focus:border-[#15803d] transition-all">
                                <option value="en" ${generalPrefs.lang === 'en' ? 'selected' : ''}>English (en)</option>
                                <option value="fil" ${generalPrefs.lang === 'fil' ? 'selected' : ''}>Filipino (fil)</option>
                            </select>
                        </div>
                        <div>
                            <label for="settings-pref-timefmt" class="block text-xs font-bold text-black mb-2">Time Format Standard</label>
                            <select id="settings-pref-timefmt" class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-black outline-none focus:border-[#15803d] transition-all">
                                <option value="12h" ${generalPrefs.timefmt === '12h' ? 'selected' : ''}>12-Hour AM/PM (e.g. 3:30 PM)</option>
                                <option value="24h" ${generalPrefs.timefmt === '24h' ? 'selected' : ''}>24-Hour Military Format (e.g. 15:30)</option>
                            </select>
                        </div>
                        <div>
                            <label for="settings-pref-datefmt" class="block text-xs font-bold text-black mb-2">Date Format Standard</label>
                            <select id="settings-pref-datefmt" class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-black outline-none focus:border-[#15803d] transition-all">
                                <option value="mdy" ${generalPrefs.datefmt !== 'dmy' ? 'selected' : ''}>MM/DD/YYYY (e.g. 09/25/2026)</option>
                                <option value="dmy" ${generalPrefs.datefmt === 'dmy' ? 'selected' : ''}>DD/MM/YYYY (e.g. 25/09/2026)</option>
                            </select>
                        </div>
                        <div>
                            <label for="settings-pref-startview" class="block text-xs font-bold text-black mb-2">Default Start View</label>
                            <select id="settings-pref-startview" class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-black outline-none focus:border-[#15803d] transition-all">
                                <option value="home" ${generalPrefs.startView !== 'sections' ? 'selected' : ''}>Home & Announcements Feed</option>
                                <option value="sections" ${generalPrefs.startView === 'sections' ? 'selected' : ''}>My Sections & Subjects</option>
                            </select>
                        </div>
                    </div>

                    <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                        <button type="button" class="px-6 py-2.5 rounded-xl bg-[#15803d] hover:bg-[#166534] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer" onclick="window.handleSaveGeneralPreferences('${userId}')">
                            <i class="fa-solid fa-check text-xs"></i>
                            <span>Save Preferences</span>
                        </button>
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
            if (modal) modal.style.display = 'none';
            renderForgotPasswordInfo(container, getActiveUser());
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
        <div style="min-height:100vh;background:#f8fafc;display:flex;align-items:flex-start;justify-content:center;padding:48px 16px;">
            <div style="background:#fff;border-radius:1rem;box-shadow:0 4px 24px rgba(0,0,0,0.09);padding:36px 32px;max-width:460px;width:100%;">
                <!-- Header -->
                <div style="display:flex;align-items:center;gap:14px;margin-bottom:24px;">
                    <div style="width:44px;height:44px;background:#f0fdf4;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                        <i class="fa-solid fa-key" style="color:#15803d;font-size:1.1rem;"></i>
                    </div>
                    <div>
                        <h2 style="margin:0;font-size:1.15rem;font-weight:700;color:#000;">Forgot Password</h2>
                        <p style="margin:2px 0 0;font-size:0.8rem;color:rgba(0,0,0,0.45);">Your account recovery info</p>
                    </div>
                </div>

                <!-- Default Password Card -->
                <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:0.75rem;padding:18px 20px;margin-bottom:16px;">
                    <p style="margin:0 0 6px;font-size:0.75rem;font-weight:600;color:rgba(0,0,0,0.55);text-transform:uppercase;letter-spacing:0.05em;">Your Default Password</p>
                    <p style="margin:0;font-size:1.25rem;font-weight:700;color:#15803d;letter-spacing:0.04em;font-family:monospace;">${_esc(defaultPassword)}</p>
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
                <button type="button"
                    class="sigma-btn sigma-btn-sm sigma-btn-secondary"
                    style="display:flex;align-items:center;gap:8px;"
                    onclick="window.__backToSettings && window.__backToSettings()">
                    <i class="fa-solid fa-arrow-left" style="font-size:0.75rem;"></i>
                    <span>Back to Settings</span>
                </button>
            </div>
        </div>
        `;
        // Register a one-shot back-navigation helper
        window.__backToSettings = function () {
            window.__backToSettings = null;
            renderSettingsView(container, 'security');
        };
    }

    // ─── Handlers ───
    window.handleSaveNotificationSettings = function (userId) {
        const prefs = {
            announcements: document.getElementById('notif-pref-announcements')?.checked ?? true,
            dueDates: document.getElementById('notif-pref-dueDates')?.checked ?? true,
            grades: document.getElementById('notif-pref-grades')?.checked ?? true,
            sounds: document.getElementById('notif-pref-sounds')?.checked ?? true,
            email: document.getElementById('notif-pref-email')?.checked ?? false
        };

        if (saveNotificationPreferences(userId, prefs)) {
            showToast('Notification preferences saved successfully!');
        }
    };

    window.handleSaveAccountInfo = function (userId) {
        const fullName = (document.getElementById('settings-acc-fullname')?.value || '').trim();
        const gender = document.getElementById('settings-acc-gender')?.value;
        const email = document.getElementById('settings-acc-email')?.value.trim();

        if (!fullName) {
            alert('Name cannot be empty.');
            return;
        }

        // Parse full name into parts
        const nameParts = fullName.split(/\s+/).filter(Boolean);
        const fname = nameParts[0] || '';
        const lname = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
        const mname = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : '';

        // Capture previous user state
        let previousUser = null;
        try {
            const rawAuth = sessionStorage.getItem('sigma-authenticated-user');
            if (rawAuth) previousUser = JSON.parse(rawAuth);
        } catch (e) {}
        if (!previousUser) {
            const adminUsers = getStoredJson('sigma-admin-users', []);
            previousUser = adminUsers.find(u => String(u.id || u.uid) === String(userId)) || null;
        }

        const updatedUser = {
            id: userId,
            uid: userId,
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
        const storageKeys = ['sigma-admin-users', 'sigma-teacher-users', 'sigma-student-users', 'sigma-users-list'];
        storageKeys.forEach(k => {
            try {
                const list = getStoredJson(k, []);
                if (Array.isArray(list)) {
                    let updated = false;
                    list.forEach(u => {
                        if (String(u.uid || u.id) === String(userId)) {
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

        // Propagate across all connected sections, subjects, rosters, and session
        if (typeof window.propagateUserUpdateToAllConnected === 'function') {
            window.propagateUserUpdateToAllConnected(updatedUser, previousUser);
        }

        // Sync header name
        const headerFname = document.getElementById('header-dropdown-firstName');
        const headerLname = document.getElementById('header-dropdown-lastName');
        if (headerFname) headerFname.textContent = fname;
        if (headerLname) headerLname.textContent = lname;

        showToast('Account details updated successfully!');

        // Refresh settings account tab to view mode
        const settingsContainer = document.querySelector('[data-settings-container]');
        if (settingsContainer && typeof window.renderSettingsView === 'function') {
            window.renderSettingsView(settingsContainer.id, 'account');
        } else {
            const vMode = document.getElementById('acc-view-mode');
            const eMode = document.getElementById('acc-edit-mode');
            const eBtn = document.getElementById('acc-edit-btn');
            const sActions = document.getElementById('acc-save-actions');
            if (vMode) vMode.style.display = '';
            if (eMode) eMode.style.display = 'none';
            if (eBtn) eBtn.style.display = '';
            if (sActions) sActions.style.display = 'none';
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
        if (modal) modal.style.display = 'none';

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

    window.handleSaveGeneralPreferences = function (userId) {
        const lang = document.getElementById('settings-pref-lang')?.value || 'en';
        const timefmt = document.getElementById('settings-pref-timefmt')?.value || '12h';
        const datefmt = document.getElementById('settings-pref-datefmt')?.value || 'mdy';
        const startView = document.getElementById('settings-pref-startview')?.value || 'home';

        const prefs = {
            lang,
            timefmt,
            datefmt,
            startView
        };

        if (saveGeneralPreferences(userId, prefs)) {
            showToast('Preferences saved successfully!');
        }
    };

    // ─── Global Navigation Triggers ───
    window.navigateToAccountSettings = function (tabName = 'notifications') {
        if (typeof window.hideHeaderOverlays === 'function') {
            window.hideHeaderOverlays();
        }

        // Close profile panel dropdown
        const profDropdown = document.getElementById('profile-dropdown') || document.getElementById('profileDropdownMenu');
        if (profDropdown) profDropdown.classList.add('hidden');
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
        const hash = '#account-settings' + (tabName && tabName !== 'notifications' ? `-${tabName}` : '');
        if (window.location.hash !== hash && history.pushState) {
            history.pushState({ type: 'tab', navId: 'nav-settings', page: 'settings', tab: tabName }, '', hash);
        }

        renderSettingsView('user-settings-view', tabName);

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

    window.renderSettingsView = renderSettingsView;
    window.getNotificationPreferences = getNotificationPreferences;

})();
