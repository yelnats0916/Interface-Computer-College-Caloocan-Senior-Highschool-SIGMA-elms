/**
 * SIGMA ELMS - Unified Profile View Controller (js/profile-view.js)
 * Interface Computer College - Caloocan Senior High School ELMS
 * Standardized and shared across Admin, Teacher, and Student portals.
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

    const escapeHtml = (typeof window !== 'undefined' && typeof window.escapeHtml === 'function')
        ? window.escapeHtml
        : function (str) {
            if (str === null || str === undefined) return '';
            return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        };

    const saveStoredJson = (typeof window !== 'undefined' && typeof window.saveStoredJson === 'function')
        ? window.saveStoredJson
        : function (key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch (e) {}
        };

    const AUTH_STORAGE_KEY = 'sigma-authenticated-user';
    const USER_STORAGE_KEY = 'sigma-admin-users';
    const USERS_KEY        = 'sigma-users';

    function getPortalRoleKey() {
        const path = (window.location.pathname || '').toLowerCase();
        if (path.includes('teacher') || document.getElementById('teacher-main') || document.body.classList.contains('teacher-portal') || document.querySelector('[data-portal="teacher"]')) {
            return 'teacher';
        }
        if (path.includes('student') || document.getElementById('student-main') || document.body.classList.contains('student-portal') || document.querySelector('[data-portal="student"]')) {
            return 'student';
        }
        return 'admin';
    }

    function getUserAvatarStorageKey() {
        const role = getPortalRoleKey();
        return `sigma_${role}_avatar_base64`;
    }

    function getUserAvatarStorageKey(userId) {
        const id = String(userId || (typeof getActiveUserData === 'function' ? getActiveUserData().id : '') || '');
        if (id) {
            return `sigma_avatar_${id}`;
        }
        const role = getPortalRoleKey();
        return `sigma_${role}_avatar_base64`;
    }

    function getUserAvatarHistoryStorageKey(userId) {
        let authId = '';
        if (!userId) {
            try {
                const auth = JSON.parse(sessionStorage.getItem(AUTH_STORAGE_KEY) || '{}');
                authId = auth.uid || auth.id || '';
            } catch (e) {}
        }
        const id = String(userId || authId || '');
        if (id) {
            return `sigma_avatar_history_${id}`;
        }
        const role = getPortalRoleKey();
        return `sigma_${role}_avatar_history`;
    }

    function getUserProfileStorageKey() {
        const role = getPortalRoleKey();
        return `sigma_${role}_user_profile`;
    }

    function resolveLoggedInUserId() {
        let auth = {};
        try {
            auth = JSON.parse(sessionStorage.getItem(AUTH_STORAGE_KEY) || '{}');
        } catch (e) {}
        const authId = String(auth.uid || auth.id || auth.accountId || auth.userId || '').replace(/^#/, '').trim();
        if (authId) return authId;
        const portal = getPortalRoleKey();
        if (portal === 'admin') return '0000000';
        return `${portal}_default`;
    }

    function resolveTargetUserId(userId) {
        if (userId) return String(userId).replace(/^#/, '').trim();
        const portal = getPortalRoleKey();
        if (portal === 'admin' && (window.currentViewingUserId || window.currentEditingUserId)) {
            return String(window.currentViewingUserId || window.currentEditingUserId).replace(/^#/, '').trim();
        }
        return resolveLoggedInUserId();
    }

    function getCurrentUserAvatar(targetUserId) {
        // 1. If targetUserId is explicitly provided, look up ONLY that specific target user!
        if (targetUserId !== undefined && targetUserId !== null && targetUserId !== '') {
            const rawId = String(targetUserId).replace(/^#/, '').trim();
            if (rawId) {
                const allKeys = ['sigma-admin-users', 'sigma-student-users', 'sigma-teacher-users', 'sigma-users-list', 'sigma-users'];
                for (const k of allKeys) {
                    const arr = getStoredJson(k, []);
                    if (Array.isArray(arr)) {
                        const cleanTarget = rawId.toLowerCase();
                        const matched = arr.find(u => {
                            if (!u) return false;
                            const uid = String(u.uid || u.id || u.lrn || '').replace(/^#/, '').trim().toLowerCase();
                            const fwd = `${u.firstName || ''} ${u.lastName || ''}`.trim().toLowerCase();
                            const rev = `${u.lastName || ''}, ${u.firstName || ''}`.trim().toLowerCase();
                            const raw = String(u.name || u.fullName || '').trim().toLowerCase();
                            const email = String(u.email || '').trim().toLowerCase();
                            return uid === cleanTarget || fwd === cleanTarget || rev === cleanTarget || raw === cleanTarget || email === cleanTarget;
                        });
                        if (matched) {
                            const direct = matched.avatar || matched.profilePicture || matched.photo || matched.profileImage;
                            if (direct && typeof direct === 'string' && direct.trim() && direct !== 'null' && direct !== 'undefined') {
                                return direct.trim();
                            }
                            const matchedId = String(matched.uid || matched.id || '').replace(/^#/, '').trim();
                            if (matchedId) {
                                const userSpecific = localStorage.getItem(`sigma_avatar_${matchedId}`);
                                if (userSpecific && typeof userSpecific === 'string' && userSpecific.trim() && userSpecific !== 'null' && userSpecific !== 'undefined') {
                                    return userSpecific.trim();
                                }
                            }
                        }
                    }
                }

                const userSpecific = localStorage.getItem(`sigma_avatar_${rawId}`);
                if (userSpecific && typeof userSpecific === 'string' && userSpecific.trim() && userSpecific !== 'null' && userSpecific !== 'undefined') {
                    return userSpecific.trim();
                }

                if (rawId === '0000000') {
                    const masterAvatar = localStorage.getItem('sigma_avatar_0000000') || localStorage.getItem('sigma_admin_avatar_base64');
                    if (masterAvatar && typeof masterAvatar === 'string' && masterAvatar.trim() && masterAvatar !== 'null' && masterAvatar !== 'undefined') {
                        return masterAvatar.trim();
                    }
                }
            }
            // Strict isolation: if querying another specific user, NEVER fall back to logged in user's session!
            return '';
        }

        // 2. Only when targetUserId is omitted (i.e. self / active logged-in user)
        const id = resolveLoggedInUserId();
        if (id) {
            const allUsers = getStoredJson(USER_STORAGE_KEY, []);
            if (Array.isArray(allUsers)) {
                const matched = allUsers.find(u => String(u.uid || u.id || '').replace(/^#/, '').trim() === id);
                if (matched && typeof matched.avatar === 'string' && matched.avatar.trim() && matched.avatar !== 'null' && matched.avatar !== 'undefined') {
                    return matched.avatar.trim();
                }
            }

            const userSpecific = localStorage.getItem(`sigma_avatar_${id}`);
            if (userSpecific && typeof userSpecific === 'string' && userSpecific.trim() && userSpecific !== 'null' && userSpecific !== 'undefined') {
                return userSpecific.trim();
            }

            if (id === '0000000') {
                const masterAvatar = localStorage.getItem('sigma_avatar_0000000') || localStorage.getItem('sigma_admin_avatar_base64');
                if (masterAvatar && typeof masterAvatar === 'string' && masterAvatar.trim() && masterAvatar !== 'null' && masterAvatar !== 'undefined') {
                    return masterAvatar.trim();
                }
            }
        }

        let authUser = {};
        try {
            authUser = JSON.parse(sessionStorage.getItem(AUTH_STORAGE_KEY) || '{}');
        } catch (e) {}

        if (authUser && typeof authUser.avatar === 'string' && authUser.avatar.trim() && authUser.avatar !== 'null' && authUser.avatar !== 'undefined') {
            return authUser.avatar.trim();
        }

        return '';
    }
    window.getCurrentUserAvatar = getCurrentUserAvatar;

    function setCurrentUserAvatar(val, targetUserId) {
        const id = resolveTargetUserId(targetUserId);

        if (id) {
            if (val) {
                localStorage.setItem(`sigma_avatar_${id}`, val);
            } else {
                localStorage.removeItem(`sigma_avatar_${id}`);
            }

            // Update in persistent users database for this user specifically
            const allUsers = getStoredJson(USER_STORAGE_KEY, []);
            if (Array.isArray(allUsers)) {
                const uIdx = allUsers.findIndex(u => String(u.uid || u.id || '').replace(/^#/, '').trim() === id);
                if (uIdx !== -1) {
                    allUsers[uIdx].avatar = val || '';
                    saveStoredJson(USER_STORAGE_KEY, allUsers);
                }
            }
        }

        // Clean up legacy keys across the board ONLY if specifically 0000000
        if (id === '0000000') {
            if (val) {
                localStorage.setItem('sigma_admin_avatar_base64', val);
                localStorage.setItem('sigma_user_avatar_base64', val);
            } else {
                localStorage.removeItem('sigma_admin_avatar_base64');
                localStorage.removeItem('sigma_user_avatar_base64');
            }
        }

        // Keep active session storage in sync ONLY if editing self
        try {
            const currentAuth = JSON.parse(sessionStorage.getItem(AUTH_STORAGE_KEY) || '{}');
            const currentAuthId = String(currentAuth.uid || currentAuth.id || currentAuth.accountId || '').replace(/^#/, '').trim();
            const isEditingOther = !!(window.currentViewingUserId || window.currentEditingUserId || targetUserId);
            if (currentAuthId && currentAuthId === id && (!isEditingOther || String(window.currentViewingUserId || window.currentEditingUserId || targetUserId) === currentAuthId)) {
                currentAuth.avatar = val || '';
                sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(currentAuth));
            }
        } catch (e) {}

        if (window.currentUserProfileData && (String(window.currentUserProfileData.id || '').replace(/^#/, '').trim() === id || !targetUserId)) {
            window.currentUserProfileData.avatar = val || '';
        }

        if (typeof window.renderUserAccountsTable === 'function') {
            window.renderUserAccountsTable();
        }
    }

    function getCurrentUserAvatarHistory(userId) {
        const id = resolveTargetUserId(userId);
        
        if (id) {
            const userHistory = getStoredJson(`sigma_avatar_history_${id}`, null);
            if (Array.isArray(userHistory)) return userHistory;
        }

        return [];
    }

    function saveCurrentUserAvatarHistory(history, userId) {
        const id = resolveTargetUserId(userId);

        if (id) {
            saveStoredJson(`sigma_avatar_history_${id}`, history);
        }
    }

    window.currentUserProfileData = window.currentUserProfileData || {};

    const USER_PROFILE_TAB_CONTENT = {
        bio: {
            eyebrow: 'Personal',
            title: 'Bio',
            content: 'Personal information and background'
        },
        achievements: {
            eyebrow: 'Recognition',
            title: 'Achievements',
            icon: 'fa-trophy',
            emptyText: 'No Achievements Documented'
        },
        subjects: {
            eyebrow: 'Academic',
            title: 'Subjects',
            icon: 'fa-book-open',
            emptyText: 'No Subjects Assigned'
        },
        sections: {
            eyebrow: 'Academic',
            title: 'Sections',
            icon: 'fa-users-viewfinder',
            emptyText: 'No Sections Assigned'
        }
    };

    function findAccountInAllStores(queryIdOrEmail) {
        if (!queryIdOrEmail) return null;
        const q = String(queryIdOrEmail).trim().toLowerCase().replace(/^#/, '');
        if (!q) return null;
        const keys = ['sigma-admin-users', 'sigma-teacher-users', 'sigma-student-users', 'sigma-users-list', 'sigma-users'];
        for (const key of keys) {
            const arr = getStoredJson(key, []);
            if (Array.isArray(arr)) {
                const found = arr.find(u => {
                    if (!u) return false;
                    const uId = String(u.uid || u.id || u.accountId || u.userId || '').trim().toLowerCase().replace(/^#/, '');
                    const uEmail = String(u.email || '').trim().toLowerCase();
                    return (uId && uId === q) || (uEmail && uEmail === q);
                });
                if (found) return found;
            }
        }
        return null;
    }

    function parseNameComponents(userObj, defaultRole) {
        if (!userObj) {
            return { firstName: defaultRole || 'User', middleName: 'Santos', lastName: '', fullName: defaultRole || 'User' };
        }
        let firstName = userObj.firstName || '';
        let lastName = userObj.lastName || '';
        let middleName = userObj.middleName || '';
        let fullName = userObj.fullName || userObj.name || '';

        if ((!firstName || !lastName) && fullName) {
            const rawName = fullName.trim();
            if (rawName.includes(',')) {
                const parts = rawName.split(',');
                if (!lastName) lastName = parts[0].trim();
                const firstParts = parts[1].trim().split(/\s+/);
                if (!firstName) firstName = firstParts[0] || '';
                if (firstParts.length > 1 && !middleName) {
                    middleName = firstParts.slice(1).join(' ');
                }
            } else {
                const parts = rawName.split(/\s+/);
                if (!firstName) firstName = parts[0] || '';
                if (parts.length > 1 && !lastName) {
                    lastName = parts.slice(1).join(' ');
                }
            }
        }

        if (!firstName) {
            firstName = defaultRole || 'User';
        }
        if (!fullName) {
            fullName = [firstName, middleName, lastName].filter(Boolean).join(' ') || firstName;
        }

        return { firstName, middleName, lastName, fullName };
    }

    function getAdminFallbackUser() {
        if (!document.getElementById('admin-main') && getPortalRoleKey() !== 'admin') return {};
        const found = findAccountInAllStores('0000000');
        if (found) return found;
        const users = getStoredJson(USER_STORAGE_KEY, []);
        if (Array.isArray(users)) {
            const admin = users.find(user => String(user.uid || user.id || '') === '0000000')
                || users.find(user => String(user.role || user.type || '').toLowerCase().includes('admin'));
            if (admin) return admin;
        }
        return {
            id: "0000000",
            uid: "0000000",
            firstName: "Stanley",
            middleName: "Vargas",
            lastName: "Garcia",
            fullName: "Stanley Vargas Garcia",
            email: "stanley.garcia@gmail.com",
            role: "Master Admin",
            type: "Master Admin",
            gender: "Male",
            status: "Active"
        };
    }

    function getTeacherFallbackUser() {
        return {
            id: "1111111",
            uid: "1111111",
            firstName: "Maria",
            middleName: "Santos",
            lastName: "Ramos",
            fullName: "Maria Santos Ramos",
            email: "maria.ramos@gmail.com",
            role: "Teacher",
            type: "Teacher",
            gender: "Female",
            status: "Active",
            department: "Senior High School - Faculty"
        };
    }

    function getStudentFallbackUser() {
        return {
            id: "2222222",
            uid: "2222222",
            firstName: "Juan",
            middleName: "Abad",
            lastName: "Dela Cruz",
            fullName: "Juan Abad Dela Cruz",
            email: "juan.delacruz@gmail.com",
            role: "Student",
            type: "Student",
            gender: "Male",
            status: "Active",
            gradeSection: "Grade 11 - ICT A",
            strand: "TVL - ICT"
        };
    }

    function getLoggedInUserData() {
        const portal = getPortalRoleKey(); // 'admin', 'teacher', or 'student'

        let authUser = {};
        try {
            authUser = JSON.parse(sessionStorage.getItem(AUTH_STORAGE_KEY) || '{}');
        } catch (e) {
            authUser = {};
        }

        const validAuthUser = (authUser && typeof authUser === 'object' && Object.keys(authUser).length > 0) ? authUser : {};
        const localProfile = getStoredJson(getUserProfileStorageKey(), {});
        const authId = String(validAuthUser.uid || validAuthUser.id || validAuthUser.accountId || validAuthUser.userId || '');
        const authEmail = (validAuthUser.email || '').toLowerCase();

        let matchedUser = null;
        if (authId || authEmail) {
            matchedUser = findAccountInAllStores(authId || authEmail);
        }

        if (portal === 'admin') {
            const adminUser = (typeof window.getLoggedInAdminUser === 'function') ? window.getLoggedInAdminUser() : null;
            let profileUser = adminUser || {};
            if (!profileUser || Object.keys(profileUser).length === 0) {
                if (matchedUser) {
                    profileUser = { ...matchedUser, ...validAuthUser };
                } else if (authId || authEmail) {
                    profileUser = { ...validAuthUser };
                } else {
                    profileUser = { ...getAdminFallbackUser(), ...localProfile };
                }
            }

            const id = profileUser.uid || profileUser.id || profileUser.accountId || profileUser.userId || '0000000';
            const rawRole = profileUser.role || profileUser.type || (id === '0000000' ? 'Master Admin' : 'Admin');
            const role = window.normalizeUserRole ? window.normalizeUserRole(rawRole) : rawRole;
            const isMasterAdmin = String(id) === '0000000' || String(role).toLowerCase().includes('master');
            const defaultRole = isMasterAdmin ? 'Master Admin' : 'Admin';

            const nameInfo = parseNameComponents(profileUser, defaultRole);
            const gender = profileUser.gender && profileUser.gender !== 'Not specified' ? profileUser.gender : (isMasterAdmin ? 'Male' : 'Not specified');

            let userAvatar = profileUser.avatar || '';
            if (!userAvatar && String(id) === '0000000') {
                userAvatar = localStorage.getItem('sigma_avatar_0000000') || localStorage.getItem('sigma_admin_avatar_base64') || '';
            }
            if (!userAvatar) {
                userAvatar = getCurrentUserAvatar(id) || '';
            }

            return {
                id,
                firstName: nameInfo.firstName,
                middleName: nameInfo.middleName,
                lastName: nameInfo.lastName,
                fullName: nameInfo.fullName,
                name: nameInfo.fullName,
                email: profileUser.email || (isMasterAdmin ? 'stanley.garcia@gmail.com' : 'Not provided'),
                role,
                status: profileUser.status || 'Active',
                gender,
                phone: profileUser.phone || 'Not provided',
                address: profileUser.address || 'Not provided',
                bios: profileUser.bios || localProfile.bios || [],
                avatar: userAvatar,
                permissions: profileUser.permissions || { bio: true, achievements: false, subjects: true, sections: true },
                isReadOnly: false
            };
        }

        // Dedicated isolated states for Teacher and Student portals
        const defaultRole = portal === 'teacher' ? 'Teacher' : 'Student';
        const defaultFallback = portal === 'teacher' ? getTeacherFallbackUser() : getStudentFallbackUser();

        const profileUser = { ...defaultFallback, ...localProfile, ...validAuthUser, ...(matchedUser || {}) };
        const id = profileUser.uid || profileUser.id || profileUser.accountId || profileUser.userId || (portal === 'teacher' ? '1111111' : '2222222');
        const role = profileUser.role || profileUser.type || defaultRole;
        const defaultPerms = portal === 'student'
            ? { bio: true, achievements: true, subjects: true, sections: true }
            : { bio: true, achievements: false, subjects: true, sections: true };

        const nameInfo = parseNameComponents(profileUser, defaultRole);
        const rawEmail = (profileUser.email || (localProfile.email && localProfile.email.includes('@') ? localProfile.email : '')).trim();
        const safeEmail = (rawEmail && !rawEmail.includes('asdasda') && !rawEmail.includes('@icc')) ? rawEmail : (portal === 'teacher' ? 'maria.ramos@gmail.com' : 'juan.delacruz@gmail.com');

        return {
            id: id || (portal === 'teacher' ? '1111111' : '2222222'),
            firstName: nameInfo.firstName,
            middleName: nameInfo.middleName,
            lastName: nameInfo.lastName,
            fullName: nameInfo.fullName,
            name: nameInfo.fullName,
            email: safeEmail,
            role,
            status: profileUser.status || 'Active',
            gender: profileUser.gender || (portal === 'teacher' ? 'Female' : 'Male'),
            phone: profileUser.phone || 'Not provided',
            address: profileUser.address || 'Not provided',
            bios: localProfile.bios || [],
            avatar: profileUser.avatar || getCurrentUserAvatar(id) || '',
            permissions: defaultPerms,
            isReadOnly: false
        };
    }
    window.getLoggedInUserData = getLoggedInUserData;

    function getActiveUserData() {
        // Use currentUserProfileData if explicitly set for viewing another user profile
        if ((window.currentViewingUserId || window.currentEditingUserId) && window.currentUserProfileData && Object.keys(window.currentUserProfileData).length > 0) {
            return Object.assign({}, window.currentUserProfileData);
        }
        return getLoggedInUserData();
    }

    // Export so other modules (e.g. settings-view.js) can resolve the active user's full data
    window.getActiveUserData = getActiveUserData;

    window.getProfileTarget = function () {
        let authUser = {};
        try {
            authUser = JSON.parse(sessionStorage.getItem(AUTH_STORAGE_KEY) || '{}');
        } catch (e) {
            authUser = {};
        }

        const users = getStoredJson(USER_STORAGE_KEY, []);
        const authId = authUser.id || authUser.uid || authUser.accountId || authUser.userId;
        const matchedUser = Array.isArray(users)
            ? users.find(u => String(u.uid || u.id || u.accountId || u.userId) === String(authId)) || {}
            : {};

        return {
            data: { ...authUser, ...matchedUser },
            isLoggedIn: !!authId
        };
    };

    window.saveProfileTarget = function (profileData) {
        let authUser = {};
        try {
            authUser = JSON.parse(sessionStorage.getItem(AUTH_STORAGE_KEY) || '{}');
        } catch (e) {
            authUser = {};
        }

        const users = getStoredJson(USER_STORAGE_KEY, []);
        const nextUsers = Array.isArray(users) ? [...users] : [];
        const authId = authUser.id || authUser.uid || authUser.accountId || authUser.userId;
        let idx = nextUsers.findIndex(u => String(u.uid || u.id || u.accountId || u.userId) === String(authId));

        if (idx === -1) {
            nextUsers.push({ ...authUser, ...profileData });
            idx = nextUsers.length - 1;
        } else {
            nextUsers[idx] = { ...nextUsers[idx], ...profileData };
        }

        saveStoredJson(USER_STORAGE_KEY, nextUsers);
        sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ ...authUser, ...profileData }));

        if (window.currentUserProfileData) {
            window.currentUserProfileData.avatar = profileData.avatar || '';
            window.currentUserProfileData.uploads = profileData.uploads || [];
        }
    };

    function ensureSharedUserProfileView() {
        const section = document.getElementById('user-profile-view');
        if (!section || section.dataset.sharedProfileRendered === 'true') return;

        section.classList.add('dynamic-section');
        section.innerHTML = `
            <!-- TOP HEADER WHITE PANEL (Centered 1040px Banner, Avatar, Info, and Tabs) -->
            <div class="w-full bg-white border-b border-slate-200 shadow-sm">
                <div class="mx-auto max-w-[1040px] w-full px-6 md:px-10">
                    <!-- Green Hero Banner -->
                    <div class="relative min-h-[220px] md:min-h-[310px]">
                        <div class="absolute inset-0 overflow-hidden rounded-b-[44px] bg-[#15803d]">
                            <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.18),_transparent_38%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.14),_transparent_34%)]"></div>
                            <div class="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(90deg,transparent_0,transparent_22px,rgba(250,204,21,0.4)_22px,rgba(250,204,21,0.4)_23px)]"></div>
                            <div class="absolute bottom-0 left-1/3 right-0 h-px bg-white/10"></div>
                        </div>
                        <div class="relative px-6 md:px-10 pt-10 pb-0 min-h-[220px] md:min-h-[310px] flex items-end">
                            <div class="relative z-10 flex flex-row items-center gap-3 md:gap-8 w-full">
                                <button type="button" id="user-profile-picture-trigger"
                                    onclick="window.toggleUserProfilePictureOverlay(true)"
                                    class="w-40 h-40 md:w-48 md:h-48 rounded-full bg-[#e2e8f0] flex items-center justify-center focus:outline-none shrink-0 mb-[-74px] overflow-hidden cursor-pointer border-4 border-white shadow-md"
                                    title="Change profile picture">
                                    <img id="user-avatar-img" src="" alt="User Avatar" class="absolute inset-0 w-full h-full object-cover hidden rounded-full">
                                    <i id="user-avatar-placeholder" class="fa-solid fa-user text-6xl md:text-7xl text-[#94a3b8]"></i>
                                </button>
                                <div class="flex-1 md:pb-5">
                                    <div class="flex flex-col items-start gap-1.5">
                                        <h2 class="text-[1.85rem] md:text-[2.6rem] font-bold text-white tracking-tight leading-[1.02] whitespace-nowrap overflow-hidden text-ellipsis">
                                            <span id="view-user-name-banner">User Name</span>
                                        </h2>
                                        <div class="flex items-center gap-3">
                                            <span id="view-user-role" class="profile-role-badge">Role</span>
                                            <span id="view-user-id" class="text-xs md:text-sm font-bold tracking-wider text-white drop-shadow-sm">ID: #000000</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="relative self-end mb-6">
                                    <!-- 1. Settings Gear Button (Only for "Edit Account" mode) -->
                                    <button type="button" id="profile-settings-btn"
                                        onclick="window.toggleProfileSettingsMenu(event)"
                                        class="hidden w-10 h-10 bg-white hover:bg-slate-50 border border-slate-200 rounded-full flex items-center justify-center text-black transition-all group shadow-sm"
                                        title="Account Settings">
                                        <i class="fa-solid fa-gear text-base group-hover:rotate-90 transition-transform duration-500 text-black"></i>
                                    </button>
                                    <div id="profile-settings-menu"
                                        class="hidden absolute right-0 top-full mt-2.5 w-64 bg-white border border-slate-200 rounded-[28px] shadow-[0_20px_50px_rgba(0,0,0,0.12)] z-[110] p-3.5 overflow-hidden font-['Inter']">
                                        <div class="space-y-1">
                                            <button type="button" id="profile-edit-info-btn" onclick="window.openEditUserInformation(window.currentEditingUserId || window.currentViewingUserId); window.toggleProfileSettingsMenu(null, true)"
                                                class="w-full flex items-center gap-3.5 px-3.5 py-3 hover:bg-slate-50 rounded-2xl transition-all group text-left">
                                                <div class="w-6 flex items-center justify-center shrink-0">
                                                    <i class="fa-solid fa-user-pen text-black text-sm"></i>
                                                </div>
                                                <span id="profile-edit-info-label" class="text-xs md:text-sm font-medium text-black font-['Inter']">Edit Information</span>
                                            </button>
                                            <button type="button" id="profile-edit-permissions-btn" onclick="window.editUserPermissions(window.currentEditingUserId || window.currentViewingUserId); window.toggleProfileSettingsMenu(null, true)"
                                                class="w-full flex items-center gap-3.5 px-3.5 py-3 hover:bg-slate-50 rounded-2xl transition-all group text-left">
                                                <div class="w-6 flex items-center justify-center shrink-0">
                                                    <i class="fa-solid fa-user-shield text-black text-sm"></i>
                                                </div>
                                                <span id="profile-edit-permissions-label" class="text-xs md:text-sm font-medium text-black font-['Inter']">Edit Permissions</span>
                                            </button>
                                            <button type="button" id="profile-change-pw-btn" onclick="window.requestPasswordChange(window.currentEditingUserId || window.currentViewingUserId); window.toggleProfileSettingsMenu(null, true)"
                                                class="w-full flex items-center gap-3.5 px-3.5 py-3 hover:bg-slate-50 rounded-2xl transition-all group text-left">
                                                <div class="w-6 flex items-center justify-center shrink-0">
                                                    <i class="fa-solid fa-key text-black text-sm"></i>
                                                </div>
                                                <span class="text-xs md:text-sm font-medium text-black font-['Inter']">Change Password</span>
                                            </button>
                                            <button type="button" id="profile-force-signout-btn" onclick="window.requestForceSignOut(window.currentEditingUserId || window.currentViewingUserId); window.toggleProfileSettingsMenu(null, true)"
                                                class="hidden w-full flex items-center gap-3.5 px-3.5 py-3 hover:bg-slate-50 rounded-2xl transition-all group text-left text-black">
                                                <div class="w-6 flex items-center justify-center shrink-0">
                                                    <i class="fa-solid fa-right-from-bracket text-black text-sm"></i>
                                                </div>
                                                <span class="text-xs md:text-sm font-medium text-black font-['Inter']">Sign Out</span>
                                            </button>
                                            <div id="profile-settings-danger-divider" class="h-px bg-slate-200 my-1"></div>
                                            <button type="button" id="profile-lock-btn" onclick="window.toggleUserLock(window.currentEditingUserId || window.currentViewingUserId); window.toggleProfileSettingsMenu(null, true)"
                                                class="w-full flex items-center gap-3.5 px-3.5 py-3 hover:bg-red-50 rounded-2xl transition-all group text-left text-red-600">
                                                <div class="w-6 flex items-center justify-center shrink-0">
                                                    <i id="profile-lock-icon" class="fa-solid fa-lock text-red-600 text-sm"></i>
                                                </div>
                                                <span id="profile-lock-label" class="text-xs md:text-sm font-medium text-red-600 font-['Inter']">Lock Account</span>
                                            </button>
                                            <button type="button" id="profile-status-btn" onclick="window.handleProfileMenuToggleStatus(); window.toggleProfileSettingsMenu(null, true)"
                                                class="w-full flex items-center gap-3.5 px-3.5 py-3 hover:bg-red-50 rounded-2xl transition-all group text-left text-red-600">
                                                <div class="w-6 flex items-center justify-center shrink-0">
                                                    <i id="profile-status-icon" class="fa-solid fa-user-slash text-red-600 text-sm"></i>
                                                </div>
                                                <span id="profile-status-label" class="text-xs md:text-sm font-medium text-red-600 font-['Inter']">Deactivate Account</span>
                                            </button>
                                            <button type="button" id="profile-delete-btn" onclick="window.requestDeleteUser(window.currentEditingUserId || window.currentViewingUserId); window.toggleProfileSettingsMenu(null, true)"
                                                class="w-full flex items-center gap-3.5 px-3.5 py-3 hover:bg-red-50 rounded-2xl transition-all group text-left text-red-600">
                                                <div class="w-6 flex items-center justify-center shrink-0">
                                                    <i class="fa-solid fa-trash-can text-red-600 text-sm"></i>
                                                </div>
                                                <span class="text-xs md:text-sm font-medium text-red-600 font-['Inter']">Delete Account</span>
                                            </button>
                                        </div>
                                    </div>

                                    <!-- 2. Three Dots Action Button (Only for "View Profile" mode from table) -->
                                    <button type="button" id="profile-actions-dots-btn"
                                        onclick="window.toggleProfileActionsMenu(event)"
                                        class="hidden w-10 h-10 bg-white hover:bg-slate-50 border border-slate-200 rounded-full flex items-center justify-center text-black transition-all group shadow-sm"
                                        title="Actions">
                                        <i class="fa-solid fa-ellipsis text-base text-black"></i>
                                    </button>
                                    <div id="profile-actions-menu"
                                        class="hidden absolute right-0 top-full mt-2.5 w-56 bg-white border border-slate-200 rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.12)] z-[110] p-2 overflow-hidden font-['Inter']">
                                        <div class="space-y-1">
                                            <button type="button" id="profile-actions-edit-btn" onclick="window.editUserAccountProfile(window.currentViewingUserId || window.currentEditingUserId); window.toggleProfileActionsMenu(null, true)"
                                                class="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-slate-50 rounded-2xl transition-all group text-left">
                                                <div class="w-6 flex items-center justify-center shrink-0">
                                                    <i class="fa-solid fa-user-pen text-black text-sm"></i>
                                                </div>
                                                <span class="text-xs md:text-sm font-medium text-black font-['Inter']">Edit Account</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Clearance below avatar & Tabs inside Top White Header Panel -->
                    <div class="pt-3 pb-0">
                        <!-- Account Status Indicator (Positioned in white space below settings gear) -->
                        <div class="min-h-[76px] flex items-center justify-end px-6 md:px-10 pb-3">
                            <div id="profile-account-status-box" class="hidden items-center gap-3.5 px-4 py-2.5 rounded-2xl border transition-all max-w-lg shadow-sm">
                                <div id="profile-status-box-icon-wrap" class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0">
                                    <i id="profile-status-box-icon" class="text-sm"></i>
                                </div>
                                <div class="flex flex-col text-left">
                                    <div class="flex items-center gap-2">
                                        <span id="profile-status-box-title" class="text-xs font-bold font-['Inter']"></span>
                                        <span id="profile-status-box-badge" class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full font-['Inter']"></span>
                                    </div>
                                    <p id="profile-status-box-desc" class="text-xs font-medium font-['Inter'] mt-0.5 text-black-fade" style="color: var(--sigma-black-fade) !important; -webkit-text-fill-color: var(--sigma-black-fade) !important;"></p>
                                </div>
                            </div>
                        </div>

                        <div id="user-profile-tabs-header-grid" class="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4 md:gap-8 items-center border-t border-slate-200 pt-3 px-6 md:px-10">
                            <div class="flex items-center justify-center shrink-0">
                                <h3 class="text-sm font-semibold text-black tracking-normal font-['Inter'] leading-5">About</h3>
                            </div>
                            <div id="user-profile-tabs-container" class="flex justify-between w-full md:w-auto md:justify-start md:gap-3">
                                <p id="profile-tab-achievements" class="px-3.5 md:px-4 py-2 border-b-[3.5px] border-[#15803d] text-sm font-semibold text-[#15803d] tracking-normal font-['Inter'] cursor-pointer transition-colors whitespace-nowrap leading-5" onclick="window.switchUserProfileTab('achievements')">Achievements</p>
                                <p id="profile-tab-subjects" class="px-3.5 md:px-4 py-2 border-b-[3.5px] border-transparent text-sm font-semibold text-black hover:bg-slate-100 hover:rounded-lg tracking-normal font-['Inter'] cursor-pointer transition-all whitespace-nowrap leading-5" onclick="window.switchUserProfileTab('subjects')">Subjects</p>
                                <p id="profile-tab-sections" class="px-3.5 md:px-4 py-2 border-b-[3.5px] border-transparent text-sm font-semibold text-black hover:bg-slate-100 hover:rounded-lg tracking-normal font-['Inter'] cursor-pointer transition-all whitespace-nowrap leading-5" onclick="window.switchUserProfileTab('sections')">Sections</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- TWO PANELS DIRECTLY ON THE DEFAULT PAGE (No enclosing big panel behind them) -->
            <div id="user-profile-panels-grid" class="mx-auto max-w-[1040px] w-full px-6 md:px-10 py-6 grid grid-cols-1 md:grid-cols-[320px_1fr] gap-6 md:gap-8 flex-1">
                <!-- Left Column: Basic Details (and Bio Card when right tabs exist) -->
                <aside id="user-profile-left-column" class="flex flex-col gap-6 h-fit w-full">
                    <!-- Basic Details Card (Email, ID, Gender, Institutional Role with Colored Icons & Visible Divider Lines) -->
                    <div class="rounded-[28px] border border-slate-200 bg-white p-7 md:p-8 space-y-4 shadow-sm divide-y divide-slate-200">
                        <!-- Email -->
                        <div class="space-y-1.5 pt-0">
                            <div class="flex items-center gap-2.5">
                                <i class="fa-solid fa-envelope text-sm md:text-base text-[#15803d]"></i>
                                <p class="text-sm md:text-base font-semibold text-black font-['Inter']">Email</p>
                            </div>
                            <p id="view-user-email" class="text-base md:text-lg font-medium text-black font-['Inter'] break-words">Not provided</p>
                        </div>

                        <!-- ID -->
                        <div class="space-y-1.5 pt-4">
                            <div class="flex items-center gap-2.5">
                                <i class="fa-solid fa-id-badge text-sm md:text-base text-[#15803d]"></i>
                                <p class="text-sm md:text-base font-semibold text-black font-['Inter']">ID</p>
                            </div>
                            <p id="view-user-sidebar-id" class="text-base md:text-lg font-normal text-black font-['Inter']">#0000000</p>
                        </div>

                        <!-- Gender -->
                        <div class="space-y-1.5 pt-4">
                            <div class="flex items-center gap-2.5">
                                <i class="fa-solid fa-venus-mars text-sm md:text-base text-[#15803d]"></i>
                                <p class="text-sm md:text-base font-semibold text-black font-['Inter']">Gender</p>
                            </div>
                            <p id="view-user-gender" class="text-base md:text-lg font-medium text-black font-['Inter']">Not specified</p>
                        </div>

                        <!-- Institutional Role -->
                        <div class="space-y-1.5 pt-4">
                            <div class="flex items-center gap-2.5">
                                <i class="fa-solid fa-user-shield text-sm md:text-base text-[#15803d]"></i>
                                <p class="text-sm md:text-base font-semibold text-black font-['Inter']">Institutional Role</p>
                            </div>
                            <p id="view-user-sidebar-role" class="text-base md:text-lg font-medium text-black font-['Inter']">User</p>
                        </div>
                    </div>

                    <!-- Bio Card Container (Stacked on Left when right tabs exist, e.g. for Teacher/Student) -->
                    <div id="user-profile-bio-card-left-container" class="w-full"></div>
                    <div id="user-profile-bio-card-container" class="w-full"></div>
                </aside>

                <!-- Right Column: Tab Panel for Achievements, Subjects, Sections OR Bio Card for Admin -->
                <section id="user-profile-right-panel" class="w-full flex flex-col gap-6">
                    <!-- Tab Panel (Achievements, Subjects, Sections) -->
                    <div id="user-profile-tab-panel-container" class="rounded-[28px] border border-slate-200 bg-white p-7 min-h-[360px] shadow-sm">
                        <div id="user-profile-tab-panel" class="space-y-6"></div>
                    </div>

                    <!-- Bio Card Container (When NO right tabs exist, e.g. for Admin, Bio is Right Section!) -->
                    <div id="user-profile-bio-card-right-container" class="w-full"></div>
                </section>
            </div>
        `;

        section.dataset.sharedProfileRendered = 'true';
    }

    function ensureSharedProfilePictureOverlay() {
        if (document.getElementById('user-profile-picture-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'user-profile-picture-overlay';
        overlay.className = 'fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[1500] hidden flex items-center justify-center p-4';
        overlay.innerHTML = `
            <div class="bg-white rounded-[32px] border border-slate-200 shadow-2xl w-full max-w-3xl p-6 sm:p-8 space-y-6 max-h-[90vh] flex flex-col">
                <div class="flex items-center justify-between gap-4">
                    <h3 class="text-2xl font-bold text-black tracking-tight font-['Inter']">Choose Profile Picture</h3>
                    <button type="button" onclick="window.toggleUserProfilePictureOverlay(false)"
                        class="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-black transition-colors"
                        title="Close picture chooser">
                        <i class="fa-solid fa-xmark text-lg"></i>
                    </button>
                </div>
                <div class="flex items-center gap-3 flex-wrap">
                    <input type="file" id="user-profile-picture-input" accept="image/*" class="hidden">
                    <button type="button" id="user-profile-upload-btn"
                        onclick="document.getElementById('user-profile-picture-input').click()"
                        class="px-5 py-2.5 bg-[#15803d] text-white text-xs font-semibold rounded-xl hover:bg-[#166534] transition-colors font-['Inter'] flex items-center gap-2 cursor-pointer shadow-sm">
                        <i class="fa-solid fa-plus text-xs"></i>
                        <span>Upload Photo</span>
                    </button>
                    <button type="button"
                        id="user-profile-select-avatar-btn"
                        disabled
                        onclick="window.confirmAndApplyAvatar()"
                        class="px-5 py-2.5 bg-slate-100 text-slate-400 opacity-50 cursor-not-allowed text-xs font-semibold rounded-xl transition-all font-['Inter'] flex items-center gap-2">
                        <span>Select Avatar</span>
                    </button>
                    <button type="button"
                        id="user-profile-remove-avatar-btn"
                        onclick="window.confirmAndRemoveAvatar()"
                        class="hidden px-5 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold rounded-xl transition-colors font-['Inter'] flex items-center gap-2 cursor-pointer shadow-sm">
                        <span>Remove Avatar</span>
                    </button>
                </div>
                <div class="border-t border-slate-200 pt-5 space-y-6 overflow-y-auto pr-1 flex-1">
                    <div class="space-y-3">
                        <div class="flex items-center justify-between">
                            <p class="text-sm font-bold text-black font-['Inter']">Uploads</p>
                        </div>
                        <div id="user-profile-picture-uploads"
                            class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 min-h-[40px]"></div>
                    </div>
                    <div class="space-y-3 pt-4 border-t border-slate-200">
                        <div class="flex items-center justify-between">
                            <p class="text-sm font-bold text-black font-['Inter']">Select An Avatar</p>
                        </div>
                        <div id="user-profile-generated-avatars"
                            class="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-3 sm:gap-4 p-3 bg-slate-50/70 rounded-2xl border border-slate-200 max-h-[300px] overflow-y-auto"></div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        initProfileHeroListeners();
        window.renderGeneratedProfileAvatars();
    }

    // ─── 1. POPULATE USER PROFILE PAGE ──────────────────────────────────────────
    window.populateUserProfilePage = function () {
        ensureSharedUserProfileView();
        ensureSharedProfilePictureOverlay();
        const userData = getActiveUserData();
        let authUser = {};
        try {
            authUser = JSON.parse(sessionStorage.getItem(AUTH_STORAGE_KEY) || '{}');
        } catch (e) {}

        const portal = getPortalRoleKey();
        const defaultRole = portal === 'teacher' ? 'Teacher' : portal === 'student' ? 'Student' : 'User';
        const firstName = userData.firstName || defaultRole;
        const lastName = userData.lastName || '';
        const fullName = (firstName + ' ' + lastName).trim() || userData.name || defaultRole;
        const role = userData.role || defaultRole;
        const formattedRole = role ? (role.charAt(0).toUpperCase() + role.slice(1).toLowerCase()) : defaultRole;
        const userId = userData.id || '';
        const email = userData.email || 'Not provided';
        const localProfile = getStoredJson(getUserProfileStorageKey(), {});

        // Banner names (unified as 1 code)
        const nameBanner = document.getElementById('view-user-name-banner');
        if (nameBanner) nameBanner.textContent = fullName;
        const firstNameBanner = document.getElementById('view-user-firstName-banner');
        if (firstNameBanner) firstNameBanner.textContent = firstName;
        const lastNameBanner = document.getElementById('view-user-lastName-banner');
        if (lastNameBanner) lastNameBanner.textContent = lastName;

        // Role & ID on Banner
        const roleEl = document.getElementById('view-user-role');
        if (roleEl) roleEl.textContent = formattedRole;
        const idEl = document.getElementById('view-user-id');
        if (idEl) {
            if (!userId || userId === 'Not provided') {
                idEl.textContent = 'ID: Not assigned';
            } else {
                idEl.textContent = `ID: ${String(userId).startsWith('#') ? userId : '#' + userId}`;
            }
        }

        // Registration Info (Email, ID, Gender, Institutional Role)
        const emailEl = document.getElementById('view-user-email');
        if (emailEl) emailEl.textContent = email;
        const sidebarIdEl = document.getElementById('view-user-sidebar-id');
        if (sidebarIdEl) {
            if (!userId || userId === 'Not provided') {
                sidebarIdEl.textContent = 'Not assigned';
            } else {
                sidebarIdEl.textContent = String(userId).startsWith('#') ? String(userId) : `#${userId}`;
            }
        }
        const isMasterAdmin = portal === 'admin' && (String(userId) === '0000000' || String(role).toLowerCase().includes('master'));
        const userGender = userData.gender && userData.gender !== 'Not specified' ? userData.gender : (isMasterAdmin ? 'Male' : 'Not specified');
        const genderEl = document.getElementById('view-user-gender');
        if (genderEl) genderEl.textContent = userGender.charAt(0).toUpperCase() + userGender.slice(1).toLowerCase();
        const sidebarRoleEl = document.getElementById('view-user-sidebar-role');
        if (sidebarRoleEl) sidebarRoleEl.textContent = formattedRole;

        // Render Bio Card in Left Column
        window.renderUserBioCard();

        // Avatars
        const currentAuthId = String(authUser.uid || authUser.id || authUser.accountId || authUser.userId || '');
        const isSelf = currentAuthId
            ? (String(userData.id) === currentAuthId)
            : (portal === 'admin' && String(userData.id) === '0000000');

        let userAvatar = userData.avatar || getCurrentUserAvatar(userData.id) || '';
        const hasAvatar = !!(userAvatar && typeof userAvatar === 'string' && userAvatar.trim() !== '' && userAvatar !== 'null' && userAvatar !== 'undefined');
        const bannerImg = document.getElementById('user-avatar-img');
        const bannerPlaceholder = document.getElementById('user-avatar-placeholder');
        if (bannerImg && bannerPlaceholder) {
            if (hasAvatar) {
                bannerImg.src = userAvatar;
                bannerImg.classList.remove('hidden');
                bannerPlaceholder.classList.add('hidden');
            } else {
                bannerImg.src = '';
                bannerImg.classList.add('hidden');
                bannerPlaceholder.classList.remove('hidden');
            }
        }

        // Profile picture trigger interactivity
        const avatarTrigger = document.getElementById('user-profile-picture-trigger');
        if (avatarTrigger) {
            if (userData.isReadOnly && !isSelf) {
                avatarTrigger.classList.remove('cursor-pointer');
                avatarTrigger.classList.add('cursor-default');
                avatarTrigger.onclick = null;
                avatarTrigger.title = '';
            } else {
                avatarTrigger.classList.add('cursor-pointer');
                avatarTrigger.classList.remove('cursor-default');
                avatarTrigger.onclick = () => window.toggleUserProfilePictureOverlay(true);
                avatarTrigger.title = 'Change profile picture';
            }
        }

        // 1. Viewer & Target Permissions Authority
        const loggedInAdminUser = (typeof window.getLoggedInAdminUser === 'function') ? window.getLoggedInAdminUser() : authUser;
        const cleanAuthId = String(loggedInAdminUser?.uid || loggedInAdminUser?.id || authUser?.uid || authUser?.id || '').replace(/^#/, '').trim();
        const rawAuthRole = String(loggedInAdminUser?.role || loggedInAdminUser?.type || authUser?.role || authUser?.type || '').toLowerCase();
        const isViewerMaster = portal === 'admin' && (
            cleanAuthId === '0000000' ||
            rawAuthRole.includes('master') ||
            rawAuthRole.includes('super') ||
            rawAuthRole.includes('head')
        );

        const cleanTargetId = String(userData.id || userData.uid || '').replace(/^#/, '').trim();
        const isTargetMaster = cleanTargetId === '0000000' || String(role).toLowerCase().includes('master');
        const isSelfUser = isSelf || (cleanAuthId && cleanTargetId && cleanAuthId === cleanTargetId);

        const viewerPerms = loggedInAdminUser?.permissions || {};
        const canActionPassword = isViewerMaster || (viewerPerms.actionPassword === true || viewerPerms.actionPassword === undefined);
        const canActionLock = isViewerMaster || (viewerPerms.actionLock === true || viewerPerms.actionLock === undefined);
        const canActionDeactivate = isViewerMaster || (viewerPerms.actionDeactivate === true);
        const canDelete = (isViewerMaster || (viewerPerms.actionDelete === true)) && !isSelfUser && !isTargetMaster;

        // 2. Header Action Buttons:
        // - Settings Gear Menu (Shown when in edit/manage profile mode in admin portal)
        // - Three Dots Action Menu (Shown when in view-only profile mode in admin portal)
        const settingsBtn = document.getElementById('profile-settings-btn');
        const actionsBtn = document.getElementById('profile-actions-dots-btn');

        const isViewProfileMode = portal === 'admin' && (userData.isReadOnly === true);
        const isEditAccountMode = portal === 'admin' && (userData.isReadOnly !== true);

        // isNavSelf: true only when the admin navigated to their own profile via the avatar
        // (not via User Accounts "View Profile"/"Edit Account", where management buttons should still appear)
        const isNavSelf = isSelfUser && !window.currentViewingUserId && !window.currentEditingUserId;

        const targetRoleStr = String(role || '').toLowerCase();
        const isRowAdmin = !isTargetMaster && targetRoleStr.includes('admin');
        const isRowTeacher = !isTargetMaster && !isRowAdmin && targetRoleStr.includes('teacher');
        const isRowStudent = !isTargetMaster && !isRowAdmin && !isRowTeacher && (targetRoleStr.includes('student') || targetRoleStr === 'user');
        let canEditThisUser = !isSelfUser;
        if (!isViewerMaster) {
            if (isTargetMaster) canEditThisUser = false;
            else if (isRowAdmin) canEditThisUser = viewerPerms.manageAdmins === true;
            else if (isRowTeacher) canEditThisUser = viewerPerms.manageTeachers !== false;
            else if (isRowStudent) canEditThisUser = viewerPerms.manageStudents !== false;
        } else if (isSelfUser) {
            canEditThisUser = false;
        }

        let canDeactivateThisUser = !isSelfUser;
        if (!isViewerMaster) {
            if (isTargetMaster) canDeactivateThisUser = false;
            else if (isRowAdmin) canDeactivateThisUser = viewerPerms.manageAdmins === true;
            else if (isRowTeacher) canDeactivateThisUser = viewerPerms.manageTeachers !== false;
            else if (isRowStudent) canDeactivateThisUser = viewerPerms.manageStudents !== false;
        } else if (isSelfUser) {
            canDeactivateThisUser = false;
        } else if (isTargetMaster) {
            const storedUsers = getStoredJson(USER_STORAGE_KEY, []);
            const totalMasters = storedUsers.filter(function (u) {
                const uRole = String(u.role || u.type || '').toLowerCase();
                const uId = String(u.uid || u.id || '').replace(/^#/, '').trim();
                return uId === '0000000' || uRole.includes('master');
            }).length;
            if (totalMasters <= 1) canDeactivateThisUser = false;
        }
        const cleanDeleteId = String(userData.id || userData.uid || '').replace(/^#/, '').trim();
        const canDeleteThisUser = canDeactivateThisUser && !isTargetMaster && cleanDeleteId !== '1111111' && cleanDeleteId !== '2222222';

        if (settingsBtn) {
            settingsBtn.classList.toggle('hidden', !(isViewProfileMode || isEditAccountMode) || isNavSelf);
            const backBtn = document.getElementById('profile-settings-back-btn');
            if (backBtn) {
                backBtn.classList.toggle('hidden', portal !== 'admin' || (!window.currentViewingUserId && !window.currentEditingUserId));
            }
            const infoBtn = document.getElementById('profile-edit-info-btn');
            if (infoBtn) infoBtn.classList.toggle('hidden', !canEditThisUser);
            const permsBtn = document.getElementById('profile-edit-permissions-btn');
            if (permsBtn) {
                permsBtn.classList.toggle('hidden', !canEditThisUser);
            }
            const permsLabel = document.getElementById('profile-edit-permissions-label');
            if (permsLabel) {
                permsLabel.textContent = (role === 'Master Admin' || role === 'Admin') ? 'Edit Roles and Permissions' : 'Edit Permissions';
            }
            const changePwBtn = document.getElementById('profile-change-pw-btn');
            if (changePwBtn) {
                changePwBtn.classList.toggle('hidden', (isSelfUser && !isViewerMaster) || !canActionPassword);
            }
        }

        const statusBtn = document.getElementById('profile-status-btn');
        const statusIcon = document.getElementById('profile-status-icon');
        const statusLabel = document.getElementById('profile-status-label');
        if (statusBtn && statusIcon && statusLabel) {
            if (!canDeactivateThisUser) {
                statusBtn.classList.add('hidden');
            } else {
                statusBtn.classList.remove('hidden');
                const isDeactivated = userData.status === 'Inactive' || userData.status === 'Deactivated';
                if (isDeactivated) {
                    statusBtn.className = "w-full flex items-center gap-3.5 px-3.5 py-3 hover:bg-green-50 rounded-2xl transition-all group text-left text-green-600";
                    statusIcon.className = "fa-solid fa-user-check text-green-600 text-sm";
                    statusLabel.className = "text-xs md:text-sm font-medium text-green-600 font-['Inter']";
                    statusLabel.textContent = "Activate Account";
                } else {
                    statusBtn.className = "w-full flex items-center gap-3.5 px-3.5 py-3 hover:bg-red-50 rounded-2xl transition-all group text-left text-red-600";
                    statusIcon.className = "fa-solid fa-user-slash text-red-600 text-sm";
                    statusLabel.className = "text-xs md:text-sm font-medium text-red-600 font-['Inter']";
                    statusLabel.textContent = "Deactivate Account";
                }
            }
        }

        // Account Status Indicator & Description Callout in White Space below Settings Gear
        const statusBox = document.getElementById('profile-account-status-box');
        const statusBoxIcon = document.getElementById('profile-status-box-icon');
        const statusBoxIconWrap = document.getElementById('profile-status-box-icon-wrap');
        const statusBoxTitle = document.getElementById('profile-status-box-title');
        const statusBoxBadge = document.getElementById('profile-status-box-badge');
        const statusBoxDesc = document.getElementById('profile-status-box-desc');

        if (statusBox && statusBoxIcon && statusBoxIconWrap && statusBoxTitle && statusBoxBadge && statusBoxDesc) {
            const rawStatus = String(userData.status || 'Active').trim();
            const lowerStatus = rawStatus.toLowerCase();
            const isAccLocked = lowerStatus === 'locked' || userData.isLocked === true;
            const isAccDeactivated = lowerStatus === 'inactive' || lowerStatus === 'deactivated';

            if (isAccDeactivated) {
                statusBox.className = 'flex items-center gap-3.5 px-4 py-2.5 rounded-2xl border border-amber-200 bg-amber-50/70 shadow-sm max-w-lg transition-all';
                statusBoxIconWrap.className = 'w-9 h-9 rounded-xl bg-amber-100 border border-amber-200/80 flex items-center justify-center shrink-0 text-amber-700';
                statusBoxIcon.className = 'fa-solid fa-user-slash text-sm text-amber-700';
                statusBoxTitle.className = "text-xs font-bold text-amber-800 font-['Inter']";
                statusBoxTitle.textContent = 'Account Deactivated';
                statusBoxBadge.className = "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-800 font-['Inter']";
                statusBoxBadge.textContent = 'Inactive';
                statusBoxDesc.textContent = 'This account is currently deactivated. Portal access and system privileges are suspended.';
                statusBox.classList.remove('hidden');
            } else if (isAccLocked) {
                statusBox.className = 'flex items-center gap-3.5 px-4 py-2.5 rounded-2xl border border-red-200 bg-red-50/70 shadow-sm max-w-lg transition-all';
                statusBoxIconWrap.className = 'w-9 h-9 rounded-xl bg-red-100 border border-red-200/80 flex items-center justify-center shrink-0 text-red-600';
                statusBoxIcon.className = 'fa-solid fa-lock text-sm text-red-600';
                statusBoxTitle.className = "text-xs font-bold text-red-700 font-['Inter']";
                statusBoxTitle.textContent = 'Account Locked';
                statusBoxBadge.className = "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-200/80 text-red-800 font-['Inter']";
                statusBoxBadge.textContent = 'Locked';
                statusBoxDesc.textContent = 'This account is currently locked. Login access is disabled until unlocked by an administrator.';
                statusBox.classList.remove('hidden');
            } else {
                statusBox.className = 'hidden';
            }
        }

        const lockBtn = document.getElementById('profile-lock-btn');
        const lockIcon = document.getElementById('profile-lock-icon');
        const lockLabel = document.getElementById('profile-lock-label');
        const isLocked = (userData.status || '').toLowerCase() === 'locked';

        if (lockBtn) {
            // Hierarchy rule: When account is deactivated, it cannot be locked nor unlocked
            const isTargetDeactivated = (userData.status || '').toLowerCase() === 'inactive' || (userData.status || '').toLowerCase() === 'deactivated';
            lockBtn.classList.toggle('hidden', isSelf || isSelfUser || isTargetMaster || !canActionLock || isTargetDeactivated);
        }
        if (lockLabel) {
            lockLabel.textContent = isLocked ? 'Unlock Account' : 'Lock Account';
            lockLabel.className = isLocked
                ? "text-xs md:text-sm font-medium text-black font-['Inter']"
                : "text-xs md:text-sm font-medium text-red-600 font-['Inter']";
        }
        if (lockBtn && !lockBtn.classList.contains('hidden')) {
            lockBtn.className = isLocked
                ? 'w-full flex items-center gap-3.5 px-3.5 py-3 hover:bg-slate-50 rounded-2xl transition-all group text-left text-black'
                : 'w-full flex items-center gap-3.5 px-3.5 py-3 hover:bg-red-50 rounded-2xl transition-all group text-left text-red-600';
        }
        if (lockIcon) {
            lockIcon.className = isLocked ? 'fa-solid fa-lock-open text-black text-sm' : 'fa-solid fa-lock text-red-600 text-sm';
        }

        const deleteBtn = document.getElementById('profile-delete-btn');
        if (deleteBtn) {
            deleteBtn.classList.toggle('hidden', !canDeleteThisUser);
        }

        const dangerDivider = document.getElementById('profile-settings-danger-divider');
        const forceSignOutBtn = document.getElementById('profile-force-signout-btn');
        if (forceSignOutBtn) forceSignOutBtn.classList.toggle('hidden', portal !== 'admin' || !canEditThisUser || !canActionLock || isTargetMaster || isSelfUser);
        const dangerVisible = (lockBtn && !lockBtn.classList.contains('hidden'))
            || (statusBtn && !statusBtn.classList.contains('hidden'))
            || (deleteBtn && !deleteBtn.classList.contains('hidden'));
        if (dangerDivider) dangerDivider.classList.toggle('hidden', !dangerVisible);

        if (settingsBtn) {
            const gearItems = ['profile-edit-info-btn', 'profile-edit-permissions-btn', 'profile-change-pw-btn', 'profile-force-signout-btn', 'profile-lock-btn', 'profile-status-btn', 'profile-delete-btn'];
            const hasGearAction = gearItems.some(function (itemId) {
                const item = document.getElementById(itemId);
                return item && !item.classList.contains('hidden');
            });
            if (!hasGearAction) settingsBtn.classList.add('hidden');
        }

        if (actionsBtn) {
            actionsBtn.classList.add('hidden');
            const actionsEditBtn = document.getElementById('profile-actions-edit-btn');
            if (actionsEditBtn) {
                const targetRoleStr = String(role || '').toLowerCase();
                let canManageTarget = true;
                if (!isViewerMaster) {
                    if (isTargetMaster) {
                        canManageTarget = false;
                    } else if (targetRoleStr.includes('admin')) {
                        canManageTarget = viewerPerms.manageAdmins === true;
                    } else if (targetRoleStr.includes('teacher')) {
                        canManageTarget = viewerPerms.manageTeachers !== false;
                    } else if (targetRoleStr.includes('student')) {
                        canManageTarget = viewerPerms.manageStudents !== false;
                    }
                }
                actionsEditBtn.classList.toggle('hidden', !canManageTarget || isSelfUser);
            }
        }

        // Ensure container is visible if either button is active
        const bannerButtonsContainer = (settingsBtn || actionsBtn)?.closest('.relative');
        if (bannerButtonsContainer) {
            bannerButtonsContainer.classList.toggle('hidden', isNavSelf || (!isEditAccountMode && !isViewProfileMode));
        }

        // Target Profile Role Determination
        const targetRole = String(role || '').toLowerCase();
        const isAdminProfile = targetRole.includes('admin') || (portal === 'admin' && (!targetRole || targetRole === 'user' || targetRole === 'master admin'));
        const isTeacherProfile = !isAdminProfile && targetRole.includes('teacher');
        const isStudentProfile = !isAdminProfile && targetRole.includes('student');

        const hasAchievements = isStudentProfile;
        const hasSubjects = isTeacherProfile || isStudentProfile;
        const hasSections = isTeacherProfile || isStudentProfile;
        const hasAnyRightTabs = hasAchievements || hasSubjects || hasSections;

        // Header Grid Layout & Tabs Container Visibility
        const tabsHeaderGrid = document.getElementById('user-profile-tabs-header-grid');
        const tabsContainer = document.getElementById('user-profile-tabs-container');
        const panelsGrid = document.getElementById('user-profile-panels-grid');
        const rightPanel = document.getElementById('user-profile-right-panel');
        const rightTabContainer = document.getElementById('user-profile-tab-panel-container');
        const leftBioContainer = document.getElementById('user-profile-bio-card-left-container');
        const rightBioContainer = document.getElementById('user-profile-bio-card-right-container');

        if (tabsHeaderGrid) {
            tabsHeaderGrid.className = hasAnyRightTabs
                ? "grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4 md:gap-8 items-center border-t-2 border-slate-300 pt-4"
                : "grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 items-center border-t-2 border-slate-300 pt-4";
        }
        if (tabsContainer) {
            tabsContainer.classList.toggle('hidden', !hasAnyRightTabs);
        }
        if (panelsGrid) {
            panelsGrid.className = hasAnyRightTabs
                ? "mx-auto max-w-[1040px] w-full px-6 md:px-10 py-6 grid grid-cols-1 md:grid-cols-[320px_1fr] gap-6 md:gap-8 flex-1"
                : "mx-auto max-w-[1040px] w-full px-6 md:px-10 py-6 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 flex-1";
        }
        if (rightPanel) {
            rightPanel.classList.remove('hidden');
        }
        if (rightTabContainer) {
            rightTabContainer.classList.toggle('hidden', !hasAnyRightTabs);
        }
        if (leftBioContainer) {
            leftBioContainer.classList.toggle('hidden', !hasAnyRightTabs);
        }
        if (rightBioContainer) {
            rightBioContainer.classList.toggle('hidden', hasAnyRightTabs);
        }

        const tabs = ['achievements', 'subjects', 'sections'];
        const perms = {
            achievements: hasAchievements,
            subjects: hasSubjects,
            sections: hasSections
        };
        let firstVisibleTab = isStudentProfile ? 'achievements' : (isTeacherProfile ? 'subjects' : null);

        tabs.forEach(t => {
            const tabEl = document.getElementById('profile-tab-' + t);
            if (tabEl) {
                tabEl.classList.toggle('hidden', !perms[t]);
            }
        });

        if (firstVisibleTab) {
            window.switchUserProfileTab(firstVisibleTab);
        }
    };

    // ─── 2. TAB SWITCHING ────────────────────────────────────────────────────────
    window.switchUserProfileTab = function (tabKey) {
        const portal = getPortalRoleKey();
        const userData = getActiveUserData();
        const role = userData.role || (portal === 'teacher' ? 'Teacher' : portal === 'student' ? 'Student' : 'User');
        const targetRole = String(role || '').toLowerCase();
        const isAdminProfile = targetRole.includes('admin') || (portal === 'admin' && (!targetRole || targetRole === 'user' || targetRole === 'master admin'));
        const isTeacherProfile = !isAdminProfile && targetRole.includes('teacher');
        const isStudentProfile = !isAdminProfile && targetRole.includes('student');

        const perms = {
            achievements: isStudentProfile,
            subjects: isTeacherProfile || isStudentProfile,
            sections: isTeacherProfile || isStudentProfile
        };

        const tabs = ['achievements', 'subjects', 'sections'];
        tabs.forEach(t => {
            const el = document.getElementById('profile-tab-' + t);
            if (el) {
                if (!perms[t]) {
                    el.className = "hidden";
                } else if (t === tabKey) {
                    el.className = "px-3.5 md:px-4 py-2 border-b-[3.5px] border-[#15803d] text-sm font-semibold text-[#15803d] tracking-normal font-['Inter'] cursor-pointer transition-colors whitespace-nowrap leading-5";
                } else {
                    el.className = "px-3.5 md:px-4 py-2 border-b-[3.5px] border-transparent text-sm font-semibold text-black hover:bg-slate-100 hover:rounded-lg tracking-normal font-['Inter'] cursor-pointer transition-all whitespace-nowrap leading-5";
                }
            }
        });

        if (perms[tabKey]) {
            window.renderUserProfileTab(tabKey);
        }
    };

    // ─── 3. TAB CONTENT RENDERING (Right Panel) ──────────────────────────────────
    window.renderUserProfileTab = function (tabId) {
        const portal = getPortalRoleKey();
        const userData = getActiveUserData();
        const role = userData.role || (portal === 'teacher' ? 'Teacher' : portal === 'student' ? 'Student' : 'User');
        const isStudent = portal === 'student' || String(role).toLowerCase() === 'student';

        let effectiveTab = tabId || (isStudent ? 'achievements' : 'subjects');
        if (effectiveTab === 'achievements' && !isStudent) {
            effectiveTab = 'subjects';
        }

        const panel = document.getElementById('user-profile-tab-panel');
        if (!panel) return;

        const tabMeta = USER_PROFILE_TAB_CONTENT[effectiveTab] || {
            title: effectiveTab.charAt(0).toUpperCase() + effectiveTab.slice(1),
            icon: 'fa-chalkboard',
            emptyText: `No ${effectiveTab} Assigned`
        };

        panel.innerHTML = `
            <div class="space-y-2">
                <h3 class="text-base md:text-lg font-bold text-black font-['Inter']">${escapeHtml(tabMeta.title)}</h3>
            </div>
            <div class="flex flex-col items-center justify-center py-16 gap-3">
                <i class="fa-solid ${tabMeta.icon || 'fa-folder'} text-4xl text-black-fade"></i>
                <p class="text-sm font-bold text-black font-['Inter']">${escapeHtml(tabMeta.emptyText)}</p>
            </div>
        `;
    };

    // ─── 4. BIO CARD RENDERING & EDITING (Left or Right Column) ──────────────────
    function getUserBioActiveContainer() {
        const portal = getPortalRoleKey();
        const userData = getActiveUserData();
        const role = userData.role || (portal === 'teacher' ? 'Teacher' : portal === 'student' ? 'Student' : 'User');
        const targetRole = String(role || '').toLowerCase();
        const isAdminProfile = targetRole.includes('admin') || (portal === 'admin' && (!targetRole || targetRole === 'user' || targetRole === 'master admin'));
        const isTeacherProfile = !isAdminProfile && targetRole.includes('teacher');
        const isStudentProfile = !isAdminProfile && targetRole.includes('student');
        const hasAnyRightTabs = isTeacherProfile || isStudentProfile;

        return hasAnyRightTabs
            ? (document.getElementById('user-profile-bio-card-left-container') || document.getElementById('user-profile-bio-card-container') || document.getElementById('user-profile-bio-card-right-container'))
            : (document.getElementById('user-profile-bio-card-right-container') || document.getElementById('user-profile-bio-card-container') || document.getElementById('user-profile-bio-card-left-container'));
    }

    window.renderUserBioCard = function () {
        const portal = getPortalRoleKey();
        const userData = getActiveUserData();
        const role = userData.role || (portal === 'teacher' ? 'Teacher' : portal === 'student' ? 'Student' : 'User');
        const targetRole = String(role || '').toLowerCase();
        const isAdminProfile = targetRole.includes('admin') || (portal === 'admin' && (!targetRole || targetRole === 'user' || targetRole === 'master admin'));
        const isTeacherProfile = !isAdminProfile && targetRole.includes('teacher');
        const isStudentProfile = !isAdminProfile && targetRole.includes('student');
        const hasAnyRightTabs = isTeacherProfile || isStudentProfile;

        const container = getUserBioActiveContainer();

        const otherContainer = hasAnyRightTabs
            ? document.getElementById('user-profile-bio-card-right-container')
            : (document.getElementById('user-profile-bio-card-left-container') || document.getElementById('user-profile-bio-card-container'));

        if (otherContainer && otherContainer !== container) {
            otherContainer.innerHTML = '';
        }

        if (!container) return;

        const userBios = userData.bios || [];

        container.innerHTML = `
            <div class="rounded-[28px] border border-slate-200 bg-white p-7 md:p-8 space-y-5 shadow-sm min-h-[360px] flex flex-col">
                <div class="flex items-center justify-between">
                    <h4 class="text-base md:text-lg font-bold text-black font-['Inter']">Bio</h4>
                    ${!userData.isReadOnly && userBios.length < 5 ? `
                        <button type="button" onclick="window.toggleEditUserBio()"
                            class="text-xs md:text-sm font-bold text-black hover:text-yellow-500 transition-colors flex items-center gap-1.5 font-['Inter'] cursor-pointer group">
                            <span class="group-hover:text-yellow-500 transition-colors">Add Bio</span>
                            <i class="fa-solid fa-pen text-[10px] group-hover:text-yellow-500 transition-colors"></i>
                        </button>
                    ` : ''}
                </div>

                <div id="user-profile-bio-content" class="space-y-3">
                    ${userBios.length > 0 ? `
                        <div class="space-y-3">
                            ${userBios.map((bio, index) => `
                                <div class="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-start justify-between group">
                                    <div class="space-y-1.5 pr-2">
                                        <h5 class="text-sm md:text-base font-bold text-black font-['Inter']">${escapeHtml(bio.title)}</h5>
                                        <p class="text-sm md:text-base text-black leading-relaxed font-['Inter']">${escapeHtml(bio.description)}</p>
                                    </div>
                                    ${!userData.isReadOnly ? `
                                        <button type="button" class="text-slate-400 hover:text-yellow-500 transition-colors pt-0.5" onclick="window.toggleEditUserBio(false, ${index})">
                                            <i class="fa-solid fa-pen text-xs"></i>
                                        </button>
                                    ` : ''}
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <div class="flex flex-col items-center justify-center py-8 gap-3 text-black-fade">
                            <i class="fa-solid fa-note-sticky text-3xl icon-black-fade"></i>
                            <p class="text-sm md:text-base font-medium text-black-fade font-['Inter']">Tell me about yourself</p>
                        </div>
                    `}
                </div>
            </div>
        `;
    };

    window.toggleEditUserBio = function (shouldSave, index = null) {
        const container = getUserBioActiveContainer();
        if (!container) return;
        const isEditing = container.querySelector('#edit-user-bio-form') !== null;
        const userData = getActiveUserData();

        if (isEditing) {
            if (shouldSave) {
                const titleEl = document.getElementById('edit-user-bio-title');
                const descEl = document.getElementById('edit-user-bio-description');
                const title = titleEl ? titleEl.value.trim() : '';
                const description = descEl ? descEl.value.trim() : '';

                let nextBios = [...(userData.bios || [])];

                if (index !== null && index >= 0) {
                    if (!title && !description) {
                        nextBios.splice(index, 1);
                    } else {
                        nextBios[index] = { title, description };
                    }
                } else if (nextBios.length < 5) {
                    if (title || description) {
                        nextBios.push({ title, description });
                    }
                }

                userData.bios = nextBios;
                window.currentUserProfileData.bios = nextBios;

                let authUser = {};
                try {
                    authUser = JSON.parse(sessionStorage.getItem(AUTH_STORAGE_KEY) || '{}');
                } catch (e) {}

                if (!userData.id || userData.id === '0000000' || String(userData.id) === String(authUser.id)) {
                    const localProfile = getStoredJson(getUserProfileStorageKey(), {});
                    localProfile.bios = nextBios;
                    saveStoredJson(getUserProfileStorageKey(), localProfile);
                } else {
                    const users = getStoredJson(USERS_KEY, []);
                    const uIdx = users.findIndex(u => String(u.uid || u.id) === String(userData.id));
                    if (uIdx !== -1) {
                        users[uIdx].bios = nextBios;
                        saveStoredJson(USERS_KEY, users);
                    }
                }
            }
            window.renderUserBioCard();
        } else {
            const userBios = userData.bios || [];
            const bioToEdit = (index !== null && userBios[index])
                ? userBios[index]
                : { title: '', description: '' };

            container.innerHTML = `
                <div class="rounded-[28px] border border-slate-200 bg-white p-7 md:p-8 shadow-sm">
                    <div id="edit-user-bio-form" class="space-y-4 animate-in fade-in duration-200 font-['Inter']">
                        <div class="flex items-center justify-between">
                            <h4 class="text-sm md:text-base font-bold text-black font-['Inter']">${index !== null ? 'Edit Bio' : 'Add Bio'}</h4>
                        </div>
                        <div class="space-y-3">
                            <div class="space-y-1.5">
                                <label class="text-sm font-bold text-black font-['Inter']">Title</label>
                                <input type="text" id="edit-user-bio-title" placeholder="Bio Title" maxlength="50"
                                    value="${escapeHtml(bioToEdit.title)}"
                                    class="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-sm font-medium text-black outline-none focus:border-slate-400 transition-all font-['Inter']">
                            </div>
                            <div class="space-y-1.5">
                                <div class="flex items-center justify-between">
                                    <label class="text-sm font-bold text-black font-['Inter']">Description</label>
                                    <span id="user-bio-char-counter" class="text-xs font-bold text-black font-['Inter']">${bioToEdit.description.length}/200</span>
                                </div>
                                <textarea id="edit-user-bio-description" placeholder="Bio Description" maxlength="200" rows="3"
                                    class="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-sm font-medium text-black outline-none focus:border-slate-400 transition-all font-['Inter'] resize-none">${escapeHtml(bioToEdit.description)}</textarea>
                            </div>
                        </div>
                        <div class="flex items-center justify-end gap-2 pt-1">
                            <button type="button" onclick="window.renderUserBioCard()"
                                class="px-4 py-2 text-xs md:text-sm font-semibold text-black hover:text-yellow-500 rounded-xl transition-colors font-['Inter'] cursor-pointer">
                                Cancel
                            </button>
                            <button type="button" onclick="window.toggleEditUserBio(true, ${index !== null ? index : 'null'})"
                                class="px-5 py-2 bg-[#15803d] hover:bg-[#166534] text-white text-xs md:text-sm font-bold rounded-xl shadow-sm transition-all font-['Inter'] cursor-pointer">
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            `;

            const descInput = document.getElementById('edit-user-bio-description');
            const counter = document.getElementById('user-bio-char-counter');
            if (descInput && counter) {
                descInput.addEventListener('input', () => {
                    counter.textContent = `${descInput.value.length}/200`;
                });
            }
        }
    };

    // ─── 5. PROFILE PICTURE CHOOSER OVERLAY ──────────────────────────────────────
    let pendingSelectedAvatarUrl = null;

    function isSvgAvatar(url) {
        if (!url || typeof url !== 'string') return false;
        return url.startsWith('data:image/svg+xml') || url.includes('<svg') || getDefaultProfileAvatars().includes(url);
    }

    window.toggleUserProfilePictureOverlay = function (show) {
        ensureSharedProfilePictureOverlay();
        const overlay = document.getElementById('user-profile-picture-overlay');
        if (!overlay) return;

        if (show) {
            pendingSelectedAvatarUrl = null;
            overlay.classList.remove('hidden');
            initProfileHeroListeners();
            window.updateAvatarActionButtons();
            window.renderUserProfilePictureUploads();
            window.renderGeneratedProfileAvatars();
        } else {
            pendingSelectedAvatarUrl = null;
            overlay.classList.add('hidden');
        }
    };

    function buildAvatarSvg(index) {
        const backgrounds = ['#0891b2', '#eab308', '#22c55e', '#d97706', '#64748b', '#0284c7', '#67e8f9', '#16a34a', '#0f766e', '#84cc16'];
        const skin = ['#f8d7b0', '#7c4a28', '#3b2417', '#c08457', '#f1c27d', '#8d5524', '#5c3420', '#e0ac69'];
        const hair = ['#111827', '#3b2417', '#78350f', '#facc15', '#6b3f24', '#1f2937', '#92400e', '#0f172a'];
        const shirt = ['#0ea5e9', '#15803d', '#facc15', '#6d28d9', '#0f766e', '#334155', '#dc2626', '#14b8a6'];
        const bg = backgrounds[index % backgrounds.length];
        const face = skin[index % skin.length];
        const hairColor = hair[(index * 2) % hair.length];
        const shirtColor = shirt[(index * 3) % shirt.length];
        const hasGlasses = index % 4 === 0;
        const hasLongHair = index % 3 === 0;
        const hasBeard = index % 7 === 0;
        const hairShape = hasLongHair
            ? `<path d="M34 39c0-18 12-29 30-29s30 11 30 29v33c-7 10-17 15-30 15S41 82 34 72V39z" fill="${hairColor}"/>`
            : `<path d="M31 43c2-20 15-33 33-33s31 13 33 33c-9-8-19-12-33-12S40 35 31 43z" fill="${hairColor}"/>`;
        const glasses = hasGlasses
            ? `<g fill="none" stroke="#111827" stroke-width="3"><circle cx="52" cy="56" r="8"/><circle cx="76" cy="56" r="8"/><path d="M60 56h8"/></g>`
            : '';
        const beard = hasBeard
            ? `<path d="M48 69c4 11 28 11 32 0v7c-5 9-27 9-32 0v-7z" fill="${hairColor}" opacity=".9"/>`
            : '';

        return `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
                <circle cx="64" cy="64" r="64" fill="${bg}"/>
                ${hairShape}
                <path d="M21 112c8-22 24-34 43-34s35 12 43 34c-12 10-26 16-43 16s-31-6-43-16z" fill="${shirtColor}"/>
                <circle cx="64" cy="56" r="25" fill="${face}"/>
                <path d="M39 47c7-15 18-23 34-23 12 2 20 9 25 21-11-7-23-10-36-10-9 0-17 4-23 12z" fill="${hairColor}"/>
                <circle cx="54" cy="57" r="3" fill="#111827"/>
                <circle cx="74" cy="57" r="3" fill="#111827"/>
                <path d="M56 70c5 4 11 4 16 0" fill="none" stroke="#7c2d12" stroke-width="3" stroke-linecap="round"/>
                ${glasses}
                ${beard}
            </svg>
        `.replace(/\s+/g, ' ').trim();
    }

    function getDefaultProfileAvatars() {
        return Array.from({ length: 20 }, (_, index) => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(buildAvatarSvg(index))}`);
    }
    window.buildAvatarSvg = buildAvatarSvg;
    window.getDefaultProfileAvatars = getDefaultProfileAvatars;

    window.updateAvatarActionButtons = function () {
        const selectBtn = document.getElementById('user-profile-select-avatar-btn');
        const removeBtn = document.getElementById('user-profile-remove-avatar-btn');
        if (!selectBtn || !removeBtn) return;

        const portal = getPortalRoleKey();
        const isEditingOtherUser = portal === 'admin' && (!!window.currentViewingUserId || !!window.currentEditingUserId);
        const targetId = isEditingOtherUser ? (window.currentViewingUserId || window.currentEditingUserId) : (getActiveUserData().id);

        const currentAvatar = getCurrentUserAvatar(targetId);
        const hasSvgAvatar = isSvgAvatar(currentAvatar);

        if (pendingSelectedAvatarUrl) {
            selectBtn.classList.remove('hidden', 'opacity-50', 'cursor-not-allowed', 'bg-slate-100', 'text-slate-400');
            selectBtn.classList.add('bg-[#15803d]', 'hover:bg-[#166534]', 'text-white', 'cursor-pointer', 'shadow-sm');
            selectBtn.disabled = false;
            removeBtn.classList.add('hidden');
        } else if (hasSvgAvatar) {
            selectBtn.classList.add('hidden');
            removeBtn.classList.remove('hidden');
        } else {
            selectBtn.classList.remove('hidden', 'bg-[#15803d]', 'hover:bg-[#166534]', 'text-white', 'cursor-pointer', 'shadow-sm');
            selectBtn.classList.add('opacity-50', 'cursor-not-allowed', 'bg-slate-100', 'text-slate-400');
            selectBtn.disabled = true;
            removeBtn.classList.add('hidden');
        }
    };

    window.renderGeneratedProfileAvatars = function () {
        const container = document.getElementById('user-profile-generated-avatars');
        if (!container) return;

        const portal = getPortalRoleKey();
        const isEditingOtherUser = portal === 'admin' && (!!window.currentViewingUserId || !!window.currentEditingUserId);
        const targetId = isEditingOtherUser ? (window.currentViewingUserId || window.currentEditingUserId) : (getActiveUserData().id);

        const avatars = getDefaultProfileAvatars();
        const currentAvatar = getCurrentUserAvatar(targetId);

        container.innerHTML = avatars.map((avatarUrl, index) => {
            const isSelected = (pendingSelectedAvatarUrl === avatarUrl) || (!pendingSelectedAvatarUrl && currentAvatar && isSvgAvatar(currentAvatar) && avatarUrl === currentAvatar);
            return `
                <button type="button"
                    class="aspect-square rounded-full overflow-hidden bg-white hover:scale-105 transition-all shadow-sm cursor-pointer p-0 ${isSelected ? 'ring-4 ring-[#15803d] ring-offset-2 scale-105' : ''}"
                    onclick="window.selectGeneratedProfileAvatar(${index})"
                    title="Avatar ${index + 1}">
                    <img src="${avatarUrl}" alt="Avatar ${index + 1}" class="w-full h-full object-cover select-none">
                </button>
            `;
        }).join('');
    };

    window.selectGeneratedProfileAvatar = function (index) {
        const avatars = getDefaultProfileAvatars();
        if (index < 0 || index >= avatars.length) return;
        pendingSelectedAvatarUrl = avatars[index];
        window.updateAvatarActionButtons();
        window.renderGeneratedProfileAvatars();
    };

    window.generateAndSelectNewAvatar = function () {
        const avatars = getDefaultProfileAvatars();
        const nextAvatar = avatars[Math.floor(Math.random() * avatars.length)];
        pendingSelectedAvatarUrl = nextAvatar;
        window.updateAvatarActionButtons();
        window.renderGeneratedProfileAvatars();
    };

    window.togglePhotoOptionsMenu = function (idx, event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        document.querySelectorAll('.photo-options-menu').forEach(menu => {
            if (menu.id !== 'photo-options-menu-' + idx) {
                menu.classList.add('hidden');
            }
        });
        document.querySelectorAll('.photo-upload-card').forEach(card => {
            card.classList.remove('photo-card-active');
        });

        const targetMenu = document.getElementById('photo-options-menu-' + idx);
        if (targetMenu) {
            const isHidden = targetMenu.classList.contains('hidden');
            if (isHidden) {
                targetMenu.classList.remove('hidden');
                const parentCard = targetMenu.closest('.photo-upload-card');
                if (parentCard) parentCard.classList.add('photo-card-active');
            } else {
                targetMenu.classList.add('hidden');
            }
        }
    };

    window.closeAllPhotoOptionMenus = function () {
        document.querySelectorAll('.photo-options-menu').forEach(menu => {
            menu.classList.add('hidden');
        });
        document.querySelectorAll('.photo-upload-card').forEach(card => {
            card.classList.remove('photo-card-active');
        });
    };

    /* ── Shared helper: builds options panel HTML for a photo (grid or lightbox) ── */
    function buildPhotoOptionsMenuHtml(idx, isCurrentAvatar, alignClass = 'right-0', suffix = '') {
        const menuId = 'photo-options-menu-' + idx + (suffix ? '-' + suffix : '');
        return `
            <div id="${menuId}"
                class="photo-options-menu hidden absolute top-12 ${alignClass} min-w-[185px] bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 py-1.5 overflow-hidden font-['Inter'] text-left">
                ${isCurrentAvatar ? `
                    <button type="button"
                        onclick="window.removeCurrentProfilePicture(event)"
                        class="w-full px-4 py-2.5 flex items-center gap-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors text-left whitespace-nowrap">
                        <i class="fa-solid fa-user-minus text-sm text-black w-4 text-center"></i>
                        <span>Remove profile picture</span>
                    </button>
                ` : `
                    <button type="button"
                        onclick="window.confirmMakeProfilePicture(${idx}, event)"
                        class="w-full px-4 py-2.5 flex items-center gap-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors text-left whitespace-nowrap">
                        <i class="fa-regular fa-circle-user text-sm text-black w-4 text-center"></i>
                        <span>Make profile picture</span>
                    </button>
                `}
                <div class="h-px bg-slate-100 my-1"></div>
                <button type="button"
                    onclick="window.deleteUserProfilePicture(${idx}, event)"
                    class="w-full px-4 py-2.5 flex items-center gap-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors text-left whitespace-nowrap">
                    <i class="fa-solid fa-trash-can text-sm text-red-600 w-4 text-center"></i>
                    <span>Delete photo</span>
                </button>
            </div>
        `;
    }

    let currentLightboxPhotoIdx = null;

    function ensureSharedPhotoLightbox() {
        if (document.getElementById('sigma-photo-lightbox')) return;
        const lightbox = document.createElement('div');
        lightbox.id = 'sigma-photo-lightbox';
        lightbox.className = 'fixed inset-0 bg-black/90 z-[3500] hidden flex items-center justify-center p-4 select-none';
        lightbox.onclick = function (e) {
            if (e.target === lightbox || e.target.id === 'lightbox-image-container') {
                window.closePhotoLightbox();
            }
        };
        lightbox.innerHTML = `
            <!-- Top Controls (Three Dots & Close) -->
            <div class="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-3 z-[3600]" onclick="event.stopPropagation()">
                <!-- Three dots options button -->
                <div class="relative">
                    <button type="button" id="lightbox-options-btn"
                        onclick="window.toggleLightboxOptionsMenu(event)"
                        class="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer shadow-lg backdrop-blur-md"
                        title="Options">
                        <i class="fa-solid fa-ellipsis-vertical text-base"></i>
                    </button>
                    <!-- Lightbox Options Menu -->
                    <div id="lightbox-options-menu"
                        class="photo-options-menu hidden absolute top-14 right-0 min-w-[200px] bg-white rounded-2xl border border-slate-200 shadow-2xl z-[3700] py-1.5 overflow-hidden font-['Inter'] text-left">
                    </div>
                </div>
                <!-- Close Button -->
                <button type="button" onclick="window.closePhotoLightbox()"
                    class="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer shadow-lg backdrop-blur-md"
                    title="Close">
                    <i class="fa-solid fa-xmark text-2xl"></i>
                </button>
            </div>

            <!-- Centered Image Container -->
            <div id="lightbox-image-container" class="relative max-w-full max-h-full flex items-center justify-center p-2">
                <img id="lightbox-image" src="" alt="Full view" class="max-h-[85vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl transition-transform" onclick="event.stopPropagation()">
            </div>
        `;
        document.body.appendChild(lightbox);

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                window.closePhotoLightbox();
            }
        });
    }

    window.openPhotoLightbox = function (idx, event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        ensureSharedPhotoLightbox();
        const uploads = getCurrentUserAvatarHistory();
        if (idx < 0 || idx >= uploads.length) return;

        currentLightboxPhotoIdx = idx;
        const img = document.getElementById('lightbox-image');
        if (img) {
            img.src = uploads[idx];
        }

        const lightbox = document.getElementById('sigma-photo-lightbox');
        if (lightbox) {
            lightbox.classList.remove('hidden');
        }
        const menu = document.getElementById('lightbox-options-menu');
        if (menu) {
            menu.classList.add('hidden');
        }
    };

    window.closePhotoLightbox = function () {
        const lightbox = document.getElementById('sigma-photo-lightbox');
        if (lightbox) {
            lightbox.classList.add('hidden');
        }
        const menu = document.getElementById('lightbox-options-menu');
        if (menu) {
            menu.classList.add('hidden');
        }
        currentLightboxPhotoIdx = null;
    };

    window.toggleLightboxOptionsMenu = function (event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        const menu = document.getElementById('lightbox-options-menu');
        if (!menu || currentLightboxPhotoIdx === null) return;

        if (!menu.classList.contains('hidden')) {
            menu.classList.add('hidden');
            return;
        }

        const uploads = getCurrentUserAvatarHistory();
        const currentAvatar = getCurrentUserAvatar();
        const imgUrl = uploads[currentLightboxPhotoIdx];
        const isCurrentAvatar = !!(currentAvatar && imgUrl === currentAvatar);

        menu.innerHTML = `
            ${isCurrentAvatar ? `
                <button type="button"
                    onclick="window.removeCurrentProfilePicture(event); window.closePhotoLightbox();"
                    class="w-full px-4 py-2.5 flex items-center gap-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors text-left whitespace-nowrap">
                    <i class="fa-solid fa-user-minus text-sm text-black w-4 text-center"></i>
                    <span>Remove profile picture</span>
                </button>
            ` : `
                <button type="button"
                    onclick="window.confirmMakeProfilePicture(${currentLightboxPhotoIdx}, event)"
                    class="w-full px-4 py-2.5 flex items-center gap-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors text-left whitespace-nowrap">
                    <i class="fa-regular fa-circle-user text-sm text-black w-4 text-center"></i>
                    <span>Make profile picture</span>
                </button>
            `}
            <div class="h-px bg-slate-100 my-1"></div>
            <button type="button"
                onclick="window.deleteUserProfilePicture(${currentLightboxPhotoIdx}, event); window.closePhotoLightbox();"
                class="w-full px-4 py-2.5 flex items-center gap-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors text-left whitespace-nowrap">
                <i class="fa-solid fa-trash-can text-sm text-red-600 w-4 text-center"></i>
                <span>Delete photo</span>
            </button>
        `;
        menu.classList.remove('hidden');
    };

    window.confirmMakeProfilePicture = function (idx, event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        window.closeAllPhotoOptionMenus();
        const menu = document.getElementById('lightbox-options-menu');
        if (menu) menu.classList.add('hidden');

        const portal = getPortalRoleKey();
        const isEditingOtherUser = portal === 'admin' && (!!window.currentViewingUserId || !!window.currentEditingUserId);
        const targetId = isEditingOtherUser ? (window.currentViewingUserId || window.currentEditingUserId) : (getActiveUserData().id);
        const uploads = getCurrentUserAvatarHistory(targetId);
        if (idx < 0 || idx >= uploads.length) return;

        const imgUrl = uploads[idx];
        const applyPhoto = () => {
            window.selectUserProfilePicture(imgUrl, false);
            if (typeof window.closePhotoLightbox === 'function') {
                window.closePhotoLightbox();
            }
            window.toggleUserProfilePictureOverlay(false);
        };

        if (typeof window.showSigmaDialog === 'function') {
            window.showSigmaDialog({
                title: 'Set Profile Picture',
                desc: 'Do you want to set this photo as the active profile picture?',
                confirmText: 'Set Picture',
                cancelText: 'Cancel',
                icon: 'fa-regular fa-circle-user',
                onConfirm: applyPhoto
            });
        } else {
            applyPhoto();
        }
    };

    window.confirmAndApplyAvatar = function () {
        if (!pendingSelectedAvatarUrl) return;
        if (typeof window.showSigmaDialog === 'function') {
            window.showSigmaDialog({
                title: 'Set Profile Picture',
                desc: 'Do you want to set this avatar as your profile picture?',
                confirmText: 'Set Avatar',
                cancelText: 'Cancel',
                icon: 'fa-regular fa-circle-user',
                onConfirm: () => {
                    window.selectUserProfilePicture(pendingSelectedAvatarUrl, false);
                    pendingSelectedAvatarUrl = null;
                    window.toggleUserProfilePictureOverlay(false);
                }
            });
        } else {
            window.selectUserProfilePicture(pendingSelectedAvatarUrl, false);
            pendingSelectedAvatarUrl = null;
            window.toggleUserProfilePictureOverlay(false);
        }
    };

    window.confirmAndRemoveAvatar = function () {
        const portal = getPortalRoleKey();
        const isEditingOtherUser = portal === 'admin' && (!!window.currentViewingUserId || !!window.currentEditingUserId);
        const targetId = isEditingOtherUser ? (window.currentViewingUserId || window.currentEditingUserId) : (getActiveUserData().id);

        const performRemove = () => {
            setCurrentUserAvatar('', targetId);

            if (isEditingOtherUser) {
                if (window.currentUserProfileData) {
                    window.currentUserProfileData.avatar = '';
                }
                const bannerImg = document.getElementById('user-avatar-img');
                const bannerPlaceholder = document.getElementById('user-avatar-placeholder');
                if (bannerImg && bannerPlaceholder) {
                    bannerImg.src = '';
                    bannerImg.classList.add('hidden');
                    bannerPlaceholder.classList.remove('hidden');
                }
            } else {
                // Remove avatar from active session
                try {
                    const auth = JSON.parse(sessionStorage.getItem(AUTH_STORAGE_KEY) || '{}');
                    auth.avatar = '';
                    sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
                } catch (e) {}

                document.querySelectorAll('#user-avatar-img, #header-avatar-img, #sidebar-avatar-img, .header-avatar-img').forEach(img => {
                    img.src = '';
                    img.classList.add('hidden');
                });
                document.querySelectorAll('#user-avatar-placeholder, #header-avatar-placeholder, #sidebar-avatar-placeholder, .header-avatar-placeholder').forEach(ph => {
                    ph.classList.remove('hidden');
                });
            }

            pendingSelectedAvatarUrl = null;
            window.updateAvatarActionButtons();

            if (typeof window.renderUserProfilePictureUploads === 'function') {
                window.renderUserProfilePictureUploads();
            }

            if (typeof window.populateUserProfilePage === 'function') {
                window.populateUserProfilePage();
            }

            if (!isEditingOtherUser && typeof window.syncUserProfileData === 'function') {
                window.syncUserProfileData();
            }
        };

        if (typeof window.showSigmaDialog === 'function') {
            window.showSigmaDialog({
                title: 'Remove Profile Picture',
                desc: 'Are you sure you want to remove the current profile picture?',
                confirmText: 'Remove',
                cancelText: 'Cancel',
                isDanger: true,
                icon: 'fa-solid fa-trash-can',
                onConfirm: performRemove
            });
        } else {
            if (confirm('Are you sure you want to remove the current profile picture?')) {
                performRemove();
            }
        }
    };

    window.renderUserProfilePictureUploads = function () {
        const container = document.getElementById('user-profile-picture-uploads');
        if (!container) return;

        const portal = getPortalRoleKey();
        const isEditingOtherUser = portal === 'admin' && (!!window.currentViewingUserId || !!window.currentEditingUserId);
        const targetId = isEditingOtherUser ? (window.currentViewingUserId || window.currentEditingUserId) : (getActiveUserData().id);

        const uploads = getCurrentUserAvatarHistory(targetId);
        const currentAvatar = getCurrentUserAvatar(targetId);

        if (uploads.length === 0) {
            container.innerHTML = `
                <div class="col-span-full py-8 text-center text-black-fade text-xs font-medium font-['Inter']">
                    No recent photo uploads
                </div>
            `;
            return;
        }

        container.innerHTML = uploads.map((imgUrl, idx) => {
            const isCurrentAvatar = !!(currentAvatar && imgUrl === currentAvatar);
            const isLeftCol = (idx % 2 === 0);
            const menuAlignClass = isLeftCol ? 'left-0' : 'right-0';
            return `
                <div class="photo-upload-card relative group aspect-square rounded-2xl overflow-visible bg-slate-100 shadow-sm transition-all">
                    <!-- Clicking image opens lightbox -->
                    <img src="${imgUrl}" alt="Upload ${idx + 1}"
                        class="w-full h-full object-cover rounded-2xl select-none cursor-pointer"
                        onclick="window.openPhotoLightbox(${idx}, event)">

                    <!-- Edit/dots button: only visible on hover -->
                    <button type="button"
                        class="photo-options-trigger absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-all shadow-md z-20 opacity-0 group-hover:opacity-100"
                        title="Photo options"
                        onclick="window.togglePhotoOptionsMenu(${idx}, event)">
                        <i class="fa-solid fa-ellipsis-vertical text-xs"></i>
                    </button>

                    ${buildPhotoOptionsMenuHtml(idx, isCurrentAvatar, menuAlignClass)}
                </div>
            `;
        }).join('');
    };


    window.selectUserProfilePictureByIndex = function (idx, event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        window.closeAllPhotoOptionMenus();
        const portal = getPortalRoleKey();
        const isEditingOtherUser = portal === 'admin' && (!!window.currentViewingUserId || !!window.currentEditingUserId);
        const targetId = isEditingOtherUser ? (window.currentViewingUserId || window.currentEditingUserId) : (getActiveUserData().id);
        const uploads = getCurrentUserAvatarHistory(targetId);
        if (idx >= 0 && idx < uploads.length) {
            window.selectUserProfilePicture(uploads[idx]);
        }
    };

    window.deleteUserProfilePicture = function (idx, event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        window.closeAllPhotoOptionMenus();
        const portal = getPortalRoleKey();
        const isEditingOtherUser = portal === 'admin' && (!!window.currentViewingUserId || !!window.currentEditingUserId);
        const targetId = isEditingOtherUser ? (window.currentViewingUserId || window.currentEditingUserId) : (getActiveUserData().id);

        const uploads = getCurrentUserAvatarHistory(targetId);
        if (idx < 0 || idx >= uploads.length) return;

        const photoToDelete = uploads[idx];
        const currentAvatar = getCurrentUserAvatar(targetId);
        const isDeletingActiveAvatar = !!(currentAvatar && photoToDelete === currentAvatar);

        const performDelete = () => {
            const freshUploads = getCurrentUserAvatarHistory(targetId);
            freshUploads.splice(idx, 1);
            saveCurrentUserAvatarHistory(freshUploads, targetId);

            if (isDeletingActiveAvatar) {
                setCurrentUserAvatar('', targetId);

                if (isEditingOtherUser) {
                    if (window.currentUserProfileData) {
                        window.currentUserProfileData.avatar = '';
                    }
                    const bannerImg = document.getElementById('user-avatar-img');
                    const bannerPlaceholder = document.getElementById('user-avatar-placeholder');
                    if (bannerImg && bannerPlaceholder) {
                        bannerImg.src = '';
                        bannerImg.classList.add('hidden');
                        bannerPlaceholder.classList.remove('hidden');
                    }
                } else {
                    try {
                        const auth = JSON.parse(sessionStorage.getItem(AUTH_STORAGE_KEY) || '{}');
                        auth.avatar = '';
                        sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
                    } catch (e) {}

                    document.querySelectorAll('#user-avatar-img, #header-avatar-img, #sidebar-avatar-img, .header-avatar-img').forEach(img => {
                        img.src = '';
                        img.classList.add('hidden');
                    });
                    document.querySelectorAll('#user-avatar-placeholder, #header-avatar-placeholder, #sidebar-avatar-placeholder, .header-avatar-placeholder').forEach(ph => {
                        ph.classList.remove('hidden');
                    });
                }
            }

            if (typeof window.renderUserProfilePictureUploads === 'function') {
                window.renderUserProfilePictureUploads();
            }

            if (typeof window.populateUserProfilePage === 'function') {
                window.populateUserProfilePage();
            }

            if (!isEditingOtherUser && typeof window.syncUserProfileData === 'function') {
                window.syncUserProfileData();
            }
        };

        if (typeof window.showSigmaDialog === 'function') {
            window.showSigmaDialog({
                title: 'Delete Photo',
                desc: 'Are you sure you want to permanently delete this photo from your uploads?',
                confirmText: 'Delete',
                cancelText: 'Cancel',
                isDanger: true,
                icon: 'fa-solid fa-trash-can text-red-600',
                onConfirm: performDelete
            });
        } else {
            performDelete();
        }
    };

    window.removeCurrentProfilePicture = function (event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        window.closeAllPhotoOptionMenus();
        const menu = document.getElementById('lightbox-options-menu');
        if (menu) menu.classList.add('hidden');

        window.confirmAndRemoveAvatar();
    };

    window.selectUserProfilePicture = function (avatarBase64, trackUpload = true) {
        if (!avatarBase64) return;
        const portal = getPortalRoleKey();
        const isEditingOtherUser = portal === 'admin' && (!!window.currentViewingUserId || !!window.currentEditingUserId);
        const targetId = isEditingOtherUser ? (window.currentViewingUserId || window.currentEditingUserId) : (getActiveUserData().id);

        setCurrentUserAvatar(avatarBase64, targetId);

        // Update local history list for targetId across all roles (Admin, Master Admin, Teacher, Student)
        let history = getCurrentUserAvatarHistory(targetId);
        if (trackUpload && !history.includes(avatarBase64)) {
            history.unshift(avatarBase64);
            if (history.length > 12) history.pop();
            saveCurrentUserAvatarHistory(history, targetId);
        }

        if (isEditingOtherUser) {
            if (window.currentUserProfileData) {
                window.currentUserProfileData.avatar = avatarBase64;
            }
            const bannerImg = document.getElementById('user-avatar-img');
            const bannerPlaceholder = document.getElementById('user-avatar-placeholder');
            if (bannerImg && bannerPlaceholder) {
                bannerImg.src = avatarBase64;
                bannerImg.classList.remove('hidden');
                bannerPlaceholder.classList.add('hidden');
            }
        } else {
            // Update authUser session
            try {
                const auth = JSON.parse(sessionStorage.getItem(AUTH_STORAGE_KEY) || '{}');
                auth.avatar = avatarBase64;
                sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
            } catch (e) {}

            // Sync all avatar elements everywhere across the page!
            document.querySelectorAll('#user-avatar-img, #header-avatar-img, #sidebar-avatar-img, .header-avatar-img').forEach(img => {
                img.src = avatarBase64;
                img.classList.remove('hidden');
            });
            document.querySelectorAll('#user-avatar-placeholder, #header-avatar-placeholder, #sidebar-avatar-placeholder, .header-avatar-placeholder').forEach(ph => {
                ph.classList.add('hidden');
            });
        }

        if (typeof window.renderUserProfilePictureUploads === 'function') {
            window.renderUserProfilePictureUploads();
        }

        if (typeof window.populateUserProfilePage === 'function') {
            window.populateUserProfilePage();
        }

        if (!isEditingOtherUser && typeof window.syncUserProfileData === 'function') {
            window.syncUserProfileData();
        }
    };

    // ─── 6. PROFILE SETTINGS MENU ───────────────────────────────────────────────
    window.toggleProfileSettingsMenu = function (event, forceClose = false) {
        if (event) event.stopPropagation();
        const menu = document.getElementById('profile-settings-menu');
        if (!menu) return;

        if (forceClose || !menu.classList.contains('hidden')) {
            menu.classList.add('hidden');
        } else {
            menu.classList.remove('hidden');
        }
    };

    window.toggleProfileActionsMenu = function (event, forceClose = false) {
        if (event) event.stopPropagation();
        const menu = document.getElementById('profile-actions-menu');
        if (!menu) return;

        if (forceClose || !menu.classList.contains('hidden')) {
            menu.classList.add('hidden');
        } else {
            menu.classList.remove('hidden');
        }
    };

    window.requestDeleteUser = function (userId) {
        const targetId = String(userId || window.currentEditingUserId || window.currentViewingUserId || '').replace(/^#/, '').trim();
        if (!targetId) return;

        // Security check: Only Master Admin can delete accounts
        let authUser = {};
        try {
            authUser = JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}');
        } catch (e) {}
        const portal = getPortalRoleKey();
        const loggedInAdmin = (typeof window.getLoggedInAdminUser === 'function') ? window.getLoggedInAdminUser() : authUser;
        const loggedInId = String(loggedInAdmin?.uid || loggedInAdmin?.id || authUser?.uid || authUser?.id || '').replace(/^#/, '').trim();
        const loggedInRole = String(loggedInAdmin?.role || loggedInAdmin?.type || authUser?.role || authUser?.type || '').toLowerCase();
        const isViewerMasterAdmin = portal === 'admin' && (
            loggedInId === '0000000' ||
            loggedInRole.includes('master') ||
            loggedInRole.includes('super') ||
            loggedInRole.includes('head')
        );

        const viewerPerms = loggedInAdmin?.permissions || {};
        const canDeleteUser = isViewerMasterAdmin || (viewerPerms.actionDelete === true);

        if (!canDeleteUser) {
            if (typeof window.showSigmaDialog === 'function') {
                window.showSigmaDialog({
                    title: 'Permission Denied',
                    desc: 'You do not have permission to delete user accounts.',
                    isNotification: true,
                    icon: 'fa-solid fa-triangle-exclamation text-red-600 text-3xl'
                });
            }
            return;
        }

        if (targetId === '0000000' || targetId === '1111111' || targetId === '2222222' || (loggedInId && targetId === loggedInId)) {
            if (typeof window.showSigmaDialog === 'function') {
                window.showSigmaDialog({
                    title: 'Action Not Allowed',
                    desc: 'Permanent institutional accounts cannot be deleted.',
                    isNotification: true,
                    icon: 'fa-solid fa-circle-exclamation text-amber-500 text-3xl'
                });
            }
            return;
        }

        // Retrieve user data to display name
        const users = getStoredJson('sigma-admin-users', []);
        const targetUser = users.find(u => String(u.uid || u.id || '').replace(/^#/, '').trim() === targetId) || {};
        const displayName = targetUser.fullName || [targetUser.firstName, targetUser.lastName].filter(Boolean).join(' ') || `User #${targetId}`;

        // Remove any existing delete modal
        const oldModal = document.getElementById('sigma-delete-user-modal');
        if (oldModal) oldModal.remove();

        const currentScrollX = window.scrollX || window.pageXOffset || 0;
        const currentScrollY = window.scrollY || window.pageYOffset || 0;
        const adminMain = document.getElementById('admin-main');
        const adminScrollTop = adminMain ? adminMain.scrollTop : 0;

        const modal = document.createElement('div');
        modal.id = 'sigma-delete-user-modal';
        modal.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 select-none';
        modal.innerHTML = `
            <div class="bg-white rounded-3xl w-full max-w-md p-7 shadow-2xl border border-slate-200 relative font-['Inter']" onclick="event.stopPropagation()">
                <!-- Icon & Header -->
                <div class="flex items-center gap-4 mb-4">
                    <div class="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shrink-0">
                        <i class="fa-solid fa-triangle-exclamation text-xl"></i>
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-black font-['Inter']">Delete User Account</h3>
                        <p class="text-xs text-black-fade font-medium" style="color: var(--sigma-black-fade) !important; -webkit-text-fill-color: var(--sigma-black-fade) !important;">Permanent deletion of account and data</p>
                    </div>
                </div>

                <!-- Warning Notice -->
                <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-5">
                    <p class="text-xs leading-relaxed text-black-fade font-medium" style="color: var(--sigma-black-fade) !important; -webkit-text-fill-color: var(--sigma-black-fade) !important;">
                        Are you sure you want to permanently delete <strong class="text-black font-semibold">${escapeHtml(displayName)}</strong> (<span class="font-mono text-black font-bold">#${escapeHtml(targetId)}</span>)? This action is irreversible.
                    </p>
                </div>

                <!-- Confirmation Input Requirement -->
                <div class="space-y-2 mb-6">
                    <label class="text-xs font-bold text-black block">
                        Please write <span class="text-red-600 font-black tracking-wider">DELETE</span> to confirm:
                    </label>
                    <input type="text" id="delete-user-confirm-input" placeholder="Type DELETE" autocomplete="off"
                        class="w-full px-4 py-3 bg-white border-2 border-slate-200 focus:border-[#FFD000] rounded-xl text-sm font-semibold text-black placeholder-slate-400 outline-none transition-colors">
                </div>

                <!-- Action Buttons -->
                <div class="flex items-center justify-end gap-3">
                    <button type="button" id="delete-user-cancel-btn"
                        class="sigma-btn sigma-btn-secondary sigma-btn-md px-6 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-black hover:bg-slate-100 transition-colors capitalize tracking-normal font-['Inter'] cursor-pointer">
                        Cancel
                    </button>
                    <button type="button" id="delete-user-submit-btn" disabled
                        class="sigma-btn sigma-btn-primary sigma-btn-md px-6 py-2.5 rounded-2xl text-xs font-bold capitalize tracking-normal opacity-40 cursor-not-allowed transition-all flex items-center gap-2 cursor-pointer font-['Inter']">
                        <i class="fa-solid fa-trash-can text-xs"></i>
                        <span>Delete Account</span>
                    </button>
                </div>
            </div>
        `;

        if (typeof window.lockBodyScroll === 'function') {
            window.lockBodyScroll();
        } else {
            document.documentElement.classList.add('dialog-open', 'modal-open', 'sigma-modal-open', 'has-modal-open');
            document.body.classList.add('dialog-open', 'modal-open', 'sigma-modal-open', 'has-modal-open');
        }
        document.body.prepend(modal);

        // Register history state so browser back / phone back / hardware back dismisses this dialog
        if (typeof window.pushModalHistoryState === 'function') {
            window.pushModalHistoryState('sigma-delete-user-modal');
            modal.dataset._historyPushed = 'true';
        }

        // Keep scroll position completely undisturbed
        window.scrollTo(currentScrollX, currentScrollY);
        if (adminMain) adminMain.scrollTop = adminScrollTop;

        const input = document.getElementById('delete-user-confirm-input');
        const submitBtn = document.getElementById('delete-user-submit-btn');
        const cancelBtn = document.getElementById('delete-user-cancel-btn');

        const closeModal = () => {
            if (typeof window.unlockBodyScroll === 'function') {
                window.unlockBodyScroll();
            } else {
                document.documentElement.classList.remove('dialog-open', 'modal-open', 'sigma-modal-open', 'has-modal-open');
                document.body.classList.remove('dialog-open', 'modal-open', 'sigma-modal-open', 'has-modal-open');
            }
            modal.remove();
            delete modal.dataset._historyPushed;
            window.scrollTo(currentScrollX, currentScrollY);
            if (adminMain) adminMain.scrollTop = adminScrollTop;
            window.closeDeleteUserModal = null;
        };
        window.closeDeleteUserModal = closeModal;

        if (input) {
            setTimeout(() => {
                if (typeof input.focus === 'function') {
                    input.focus({ preventScroll: true });
                    window.scrollTo(currentScrollX, currentScrollY);
                    if (adminMain) adminMain.scrollTop = adminScrollTop;
                }
            }, 30);
            input.addEventListener('input', () => {
                const isMatch = input.value.trim() === 'DELETE';
                if (isMatch) {
                    submitBtn.disabled = false;
                    submitBtn.classList.remove('opacity-40', 'cursor-not-allowed');
                } else {
                    submitBtn.disabled = true;
                    submitBtn.classList.add('opacity-40', 'cursor-not-allowed');
                }
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' || (e.altKey && (e.key === 'ArrowLeft' || e.keyCode === 37))) {
                    e.preventDefault();
                    closeModal();
                    return;
                }
                if (e.key === 'Enter' && input.value.trim() === 'DELETE') {
                    e.preventDefault();
                    submitBtn.click();
                }
            });
        }

        if (cancelBtn) cancelBtn.onclick = closeModal;
        modal.onclick = closeModal;

        if (submitBtn) {
            submitBtn.onclick = () => {
                if (input.value.trim() !== 'DELETE') return;

                // Execute Account Deletion Across All Storage Arrays
                const allStorageKeys = ['sigma-admin-users', 'sigma-teacher-users', 'sigma-student-users', 'sigma-users-list'];
                allStorageKeys.forEach(storageKey => {
                    const storedList = getStoredJson(storageKey, []);
                    if (Array.isArray(storedList)) {
                        const filteredList = storedList.filter(u => {
                            const uid = String(u.uid || u.id || '').replace(/^#/, '').trim();
                            return uid !== targetId;
                        });
                        saveStoredJson(storageKey, filteredList);
                    }
                });

                if (typeof window.syncUserToDB === 'function') {
                    window.syncUserToDB({ id: targetId }, 'delete');
                }

                // Purge any avatar or user-specific cache keys
                try {
                    localStorage.removeItem(`sigma_user_avatar_${targetId}`);
                    localStorage.removeItem(`sigma_user_photos_${targetId}`);
                    localStorage.removeItem(`sigma-profile-custom-${targetId}`);
                } catch (e) {}

                closeModal();

                // Clean URL hash so browser is never stuck on deleted profile
                try {
                    if (window.history && window.history.replaceState) {
                        window.history.replaceState({ tab: 'nav-users-accounts' }, '', '#users');
                    } else {
                        window.location.hash = '#users';
                    }
                } catch (e) {}

                // Return back directly to user accounts table
                if (typeof window.backFromUserProfile === 'function') {
                    window.backFromUserProfile(true);
                }

                if (typeof window.switchTab === 'function') {
                    window.switchTab('nav-users-accounts', false);
                }

                if (typeof window.renderUserAccountsTable === 'function') {
                    window.renderUserAccountsTable();
                }

                if (typeof window.showToastNotification === 'function') {
                    window.showToastNotification(`User #${targetId} (${displayName}) has been permanently deleted.`, 'success');
                }
            };
        }
    };

    window.backFromUserProfile = function (forceDirect = false) {
        window.currentUserProfileData = {};
        window.currentViewingUserId = null;
        window.currentEditingUserId = null;

        const pView = document.getElementById('user-profile-view');
        if (pView) pView.classList.add('hidden');

        // If history entries exist and forceDirect is not requested, use history.back() so browser history stays 1-to-1 in sync
        if (!forceDirect && window.history.length > 1) {
            window.history.back();
            return;
        }

        const portal = getPortalRoleKey();
        if (portal === 'admin') {
            try {
                if (window.history && window.history.replaceState) {
                    window.history.replaceState({ tab: 'nav-users-accounts' }, '', '#users');
                } else {
                    window.location.hash = '#users';
                }
            } catch (e) {}
            const usersView = document.getElementById('users-view');
            if (usersView) usersView.classList.remove('hidden');

            const prevTab = window._sigmaPreviousNavTab || window._lastActiveNavTab || 'nav-users-accounts';
            if (typeof window.switchTab === 'function') {
                try {
                    window.switchTab(prevTab, false);
                } catch (e) {}
            } else if (typeof window.showSection === 'function') {
                try {
                    window.showSection('users-view', prevTab);
                } catch (e) {}
            }

            // Update sidebar nav active link
            document.querySelectorAll('.nav-item, [id^="nav-"]').forEach(el => {
                el.classList.remove('active', 'active-yellow');
            });
            const userNavBtn = document.getElementById(prevTab) || document.querySelector(`[data-tab="${prevTab}"]`);
            if (userNavBtn) userNavBtn.classList.add('active');

            if (typeof window.renderUserAccountsTable === 'function') {
                window.renderUserAccountsTable();
            } else if (typeof window.renderUsersTable === 'function') {
                window.renderUsersTable();
            }
        } else {
            const fallbackTab = window._sigmaPreviousNavTab || (portal === 'teacher' ? 'nav-dashboard' : 'nav-home');
            if (typeof window.switchTab === 'function') {
                window.switchTab(fallbackTab, false);
            } else if (typeof window._applyTab === 'function') {
                window._applyTab(fallbackTab);
            } else if (typeof window.showSection === 'function') {
                window.showSection(fallbackTab === 'nav-dashboard' ? 'section-dashboard' : 'section-home', fallbackTab);
            }
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.handleProfileMenuEditAccount = function () {
        const userId = window.currentViewingUserId || (getActiveUserData().id);
        if (typeof window.editUserAccountProfile === 'function') {
            window.editUserAccountProfile(userId);
        } else if (typeof window.editUser === 'function') {
            window.editUser(userId, false);
        }
    };

    window.handleProfileMenuEditPermissions = function () {
        const userId = window.currentViewingUserId || (getActiveUserData().id);
        if (typeof window.editUserPermissions === 'function') {
            window.editUserPermissions(userId);
        }
    };

    window.handleProfileMenuToggleStatus = function () {
        const userId = window.currentEditingUserId || window.currentViewingUserId || (getActiveUserData().id);
        const users = getStoredJson(USER_STORAGE_KEY, []);
        const targetUser = users.find(u => String(u.uid || u.id || '').replace(/^#/, '').trim() === String(userId).replace(/^#/, '').trim()) || getActiveUserData();
        const isDeactivated = targetUser.status === 'Inactive' || targetUser.status === 'Deactivated';
        if (isDeactivated) {
            if (typeof window.requestActivateUser === 'function') {
                window.requestActivateUser(userId);
            }
        } else {
            if (typeof window.requestDeactivateUser === 'function') {
                window.requestDeactivateUser(userId);
            }
        }
    };

    // Close settings/actions and photo options dropdown on outside click
    document.addEventListener('click', (e) => {
        const menu = document.getElementById('profile-actions-menu') || document.getElementById('profile-settings-menu');
        const btn = document.getElementById('profile-actions-dots-btn') || document.getElementById('profile-settings-btn');
        if (menu && !menu.classList.contains('hidden')) {
            if (!menu.contains(e.target) && (!btn || !btn.contains(e.target))) {
                menu.classList.add('hidden');
            }
        }

        if (!e.target.closest('.photo-options-menu') && !e.target.closest('.photo-options-trigger')) {
            window.closeAllPhotoOptionMenus();
        }
    });


    // ─── 7. NAVIGATE TO OWN PROFILE ───────────────────────────────────────────
    let isNavigatingToProfile = false;
    window.navigateToUserProfile = function (event) {
        if (event) {
            try {
                event.preventDefault();
                event.stopPropagation();
            } catch (e) {}
        }

        if (isNavigatingToProfile) return;
        isNavigatingToProfile = true;
        setTimeout(() => { isNavigatingToProfile = false; }, 300);

        // Close header dropdown / slideout drawer
        if (typeof window.hideHeaderOverlays === 'function') {
            window.hideHeaderOverlays();
        }
        const profileDropdown = document.getElementById('profile-dropdown') || document.getElementById('profileDropdownMenu');
        if (profileDropdown) profileDropdown.classList.add('hidden');
        const profileToggleBtn = document.getElementById('profile-toggle') || document.getElementById('profileDropdownBtn');
        if (profileToggleBtn) profileToggleBtn.classList.remove('active', 'active-yellow');

        // Reset viewing profile data to self
        window.currentUserProfileData = {};
        window.currentViewingUserId = null;
        window.currentEditingUserId = null;

        // Switch to profile view
        if (typeof window.switchTab === 'function') {
            try {
                window.switchTab('nav-profile');
            } catch (e) {
                console.warn('switchTab error, falling back to direct section display', e);
            }
        } else if (typeof window.showSection === 'function') {
            try {
                window.showSection('user-profile-view', 'nav-profile');
            } catch (e) {
                console.warn('showSection error, falling back to direct section display', e);
            }
        }

        // Guarantee profile view is visible and other main sections are hidden
        const pView = document.getElementById('user-profile-view');
        if (pView) {
            document.querySelectorAll('.dynamic-section').forEach(s => {
                if (s !== pView) s.classList.add('hidden');
            });
            document.querySelectorAll('main > section').forEach(s => {
                if (s !== pView && s.id !== 'user-profile-view') s.classList.add('hidden');
            });
            pView.classList.remove('hidden');
        }

        if (typeof window.populateUserProfilePage === 'function') {
            window.populateUserProfilePage();
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.showMyProfile = window.navigateToUserProfile;
    window.viewMyProfile = window.navigateToUserProfile;

    // ─── 8. UNIFIED TOPBAR / DRAWER PROFILE SYNC ─────────────────────────────
    window.syncUserProfileData = function () {
        const portal = typeof getPortalRoleKey === 'function' ? getPortalRoleKey() : '';
        const defaultRole = portal === 'teacher' ? 'Teacher' : portal === 'student' ? 'Student' : 'Admin';
        // ALWAYS synchronize header, topbar, and profile drawer with the logged-in authenticated user!
        const loggedInUser = typeof getLoggedInUserData === 'function' ? getLoggedInUserData() : (typeof getActiveUserData === 'function' ? getActiveUserData() : {});

        const rawRole = loggedInUser.role || defaultRole;
        const role = window.normalizeUserRole ? window.normalizeUserRole(rawRole) : (rawRole || 'Administrator');

        const firstName = loggedInUser.firstName || defaultRole;
        const lastName = loggedInUser.lastName || '';
        const accountId = loggedInUser.id || '';

        // Get avatar using unified getCurrentUserAvatar for the logged-in user specifically
        const userAvatar = getCurrentUserAvatar(accountId) || loggedInUser.avatar || '';
        const hasAvatar = !!(userAvatar && typeof userAvatar === 'string' && userAvatar.trim() !== '' && userAvatar !== 'null' && userAvatar !== 'undefined');

        // Sync Name displays
        document.querySelectorAll('#header-dropdown-firstName, .header-user-firstname').forEach(el => el.textContent = firstName);
        document.querySelectorAll('#header-dropdown-lastName, .header-user-lastname').forEach(el => el.textContent = lastName ? ` ${lastName}` : '');

        // Sync Welcome Banner elements (ALL ROLES: Student, Teacher, Admin, Head Admin, Master Admin)
        const welcomeRole = String(role).toLowerCase().includes('admin') ? 'Admin ' : (String(role).toLowerCase().includes('teacher') || String(role).toLowerCase().includes('faculty') || String(role).toLowerCase().includes('instructor') ? 'Teacher ' : '');
        document.querySelectorAll('#welcome-user-firstName, .welcome-user-firstName').forEach(el => el.textContent = firstName);
        document.querySelectorAll('#welcome-user-role, .welcome-user-role').forEach(el => el.textContent = welcomeRole);

        // Sync Role badge display
        document.querySelectorAll('#header-dropdown-role, .header-user-role, .profile-panel-role-badge').forEach(el => el.textContent = role);

        // Sync Account ID display
        const accountIdEl = document.getElementById('header-dropdown-accountId');
        if (accountIdEl) {
            accountIdEl.textContent = accountId ? `ID: ${accountId}` : 'ID: —';
        }

        // Sync Topbar Header and Slideout Sidebar Avatars
        const avatarImgs = document.querySelectorAll('#header-avatar-img, #sidebar-avatar-img, .header-avatar-img');
        const avatarPlaceholders = document.querySelectorAll('#header-avatar-placeholder, #sidebar-avatar-placeholder, .header-avatar-placeholder');

        if (hasAvatar) {
            avatarImgs.forEach(img => {
                img.src = userAvatar;
                img.classList.remove('hidden');
            });
            avatarPlaceholders.forEach(ph => ph.classList.add('hidden'));
        } else {
            avatarImgs.forEach(img => {
                img.src = '';
                img.classList.add('hidden');
            });
            avatarPlaceholders.forEach(ph => ph.classList.remove('hidden'));
        }
    };
    window.syncUserProfileAvatar = window.syncUserProfileData;

    // ─── 9. INITIALIZE AVATAR & HERO LISTENERS ───────────────────────────────────
    function initProfileHeroListeners() {
        const avatarInput = document.getElementById('user-profile-picture-input');
        if (avatarInput && !avatarInput.dataset.listenerBound) {
            avatarInput.dataset.listenerBound = 'true';
            avatarInput.addEventListener('change', function (e) {
                const file = e.target.files && e.target.files[0];
                if (!file) return;

                const MAX_AVATAR_SIZE = 500 * 1024 * 1024; // 500MB standard limit
                if (file.size > MAX_AVATAR_SIZE) {
                    if (typeof window.showToast === 'function') {
                        window.showToast('Profile picture exceeds the 500MB limit.', 'error');
                    } else if (typeof window.showGlobalToast === 'function') {
                        window.showGlobalToast('Profile picture exceeds the 500MB limit.', 'error');
                    } else {
                        alert('Profile picture exceeds the 500MB limit.');
                    }
                    avatarInput.value = '';
                    return;
                }

                const reader = new FileReader();
                reader.onload = function (evt) {
                    window.selectUserProfilePicture(evt.target.result);
                };
                reader.readAsDataURL(file);
                avatarInput.value = '';
            });
        }

        // Setup Logout handlers
        const logoutLinks = document.querySelectorAll('a[href="index.html"], .profile-logout-btn');
        logoutLinks.forEach(link => {
            if (!link.dataset.logoutBound && (link.textContent.toLowerCase().includes('logout') || link.textContent.toLowerCase().includes('sign out') || link.querySelector('.fa-right-from-bracket'))) {
                link.dataset.logoutBound = 'true';
                link.addEventListener('click', () => {
                    try {
                        if (window.SigmaPresenceTracker && typeof window.SigmaPresenceTracker.logout === 'function') {
                            window.SigmaPresenceTracker.logout();
                        } else {
                            sessionStorage.clear();
                        }
                    } catch (e) {}
                });
            }
        });

        // Bind profile panel hero elements to navigate to profile page
        document.querySelectorAll('.profile-panel-hero').forEach(el => {
            el.style.cursor = 'pointer';
            el.setAttribute('title', 'View Profile');
            if (!el.dataset.profileClickBound && !el.getAttribute('onclick')) {
                el.dataset.profileClickBound = 'true';
                el.addEventListener('click', (e) => window.navigateToUserProfile(e));
            }
        });

        // Initial sync of topbar data
        window.syncUserProfileData();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initProfileHeroListeners);
    } else {
        initProfileHeroListeners();
    }

})();
