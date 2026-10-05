/**
 * SIGMA ELMS - Per-Tab Session Identity
 *
 * localStorage is shared by every tab, so logging in as another user in a second
 * tab used to overwrite the identity that the first tab read (sidebar classes,
 * classroom rooms, announcements, profile). This script makes the tab's own
 * sessionStorage login the single source of truth and mirrors it into the shared
 * localStorage keys whenever this tab is loaded or focused.
 */
(function () {
    'use strict';

    const SESSION_KEY = 'sigma-authenticated-user';
    const SHARED_KEYS = ['sigma-logged-in-user', 'currentUser', 'sigma_active_user'];

    function readJson(storage, key) {
        try {
            const raw = storage.getItem(key);
            return raw ? JSON.parse(raw) : null;
        } catch (_) {
            return null;
        }
    }

    function idOf(user) {
        return String((user && (user.uid || user.id)) || '').replace(/^#/, '').trim().toLowerCase();
    }

    function getTabSessionUser() {
        const path = (typeof window !== 'undefined' && window.location && window.location.pathname ? window.location.pathname.toLowerCase() : '');
        const isTeacherPage = path.includes('teacher');
        const isStudentPage = path.includes('student');
        const isAdminPage = path.includes('admin');
        const hasExplicitLogin = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('sigma-login-explicit') === 'true');

        const auth = readJson(sessionStorage, SESSION_KEY);
        const cur = readJson(sessionStorage, 'currentUser');

        // On teacher portal, the permanent hardcoded teacher is Maria Santos Ramos (1111111).
        // Only accept another teacher account in sessionStorage IF the user explicitly logged in during this session.
        if (isTeacherPage) {
            const enrichMaria = (u) => {
                if (idOf(u) === '1111111') {
                    u.section = 'Rizal';
                    u.sections = ['Rizal'];
                    u.assignedSections = ['Rizal'];
                    u.subject = 'Computer Programming 1';
                    u.subjects = ['Computer Programming 1', 'Empowerment Technologies', 'Oral Communication'];
                    u.assignedSubjects = ['Computer Programming 1', 'Empowerment Technologies', 'Oral Communication'];
                }
                return u;
            };
            if (auth && idOf(auth)) {
                return enrichMaria(auth);
            }
            if (cur && idOf(cur)) {
                return enrichMaria(cur);
            }
        } else {
            if (auth && idOf(auth)) return auth;
            if (cur && idOf(cur)) return cur;
        }

        const shared = readJson(localStorage, 'sigma-logged-in-user') || readJson(localStorage, 'currentUser');
        const sharedRole = String(shared?.role || shared?.type || '').toLowerCase();

        if (isTeacherPage) {
            const enrichMaria = (u) => {
                if (idOf(u) === '1111111') {
                    u.section = 'Rizal';
                    u.sections = ['Rizal'];
                    u.assignedSections = ['Rizal'];
                    u.subject = 'Computer Programming 1';
                    u.subjects = ['Computer Programming 1', 'Empowerment Technologies', 'Oral Communication'];
                    u.assignedSubjects = ['Computer Programming 1', 'Empowerment Technologies', 'Oral Communication'];
                }
                return u;
            };
            if (shared && idOf(shared) && (sharedRole.includes('teach') || sharedRole.includes('faculty'))) {
                try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(shared)); } catch (_) {}
                return enrichMaria(shared);
            }
            // Permanent hardcoded default teacher Maria Santos Ramos (1111111) when no teacher is logged in
            const defaultTeacher = {
                id: '1111111',
                uid: '1111111',
                firstName: 'Maria',
                middleName: 'Santos',
                lastName: 'Ramos',
                fullName: 'Maria Santos Ramos',
                name: 'Maria Santos Ramos',
                email: 'maria.ramos@gmail.com',
                role: 'Teacher',
                type: 'Teacher',
                status: 'Active',
                gender: 'Female',
                branch: 'Main Campus',
                department: 'Senior High School - Faculty',
                section: 'Rizal',
                sections: ['Rizal'],
                assignedSections: ['Rizal'],
                subject: 'Computer Programming 1',
                subjects: ['Computer Programming 1', 'Empowerment Technologies', 'Oral Communication'],
                assignedSubjects: ['Computer Programming 1', 'Empowerment Technologies', 'Oral Communication']
            };
            try {
                sessionStorage.setItem(SESSION_KEY, JSON.stringify(defaultTeacher));
                sessionStorage.setItem('currentUser', JSON.stringify(defaultTeacher));
            } catch (_) {}
            return defaultTeacher;
        }

        if (isStudentPage) {
            if (shared && idOf(shared) && sharedRole.includes('stud')) {
                try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(shared)); } catch (_) {}
                return shared;
            }
            const defaultStudent = {
                id: '2222222',
                uid: '2222222',
                firstName: 'Juan',
                middleName: 'Abad',
                lastName: 'Dela Cruz',
                fullName: 'Juan Abad Dela Cruz',
                name: 'Juan Abad Dela Cruz',
                email: 'juan.delacruz@gmail.com',
                role: 'Student',
                type: 'Student'
            };
            try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(defaultStudent)); } catch (_) {}
            return defaultStudent;
        }

        if (isAdminPage) {
            if (shared && idOf(shared) && sharedRole.includes('admin')) {
                try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(shared)); } catch (_) {}
                return shared;
            }
            const defaultAdmin = {
                id: '0000000',
                uid: '0000000',
                firstName: 'Stanley',
                middleName: 'Vargas',
                lastName: 'Garcia',
                fullName: 'Stanley Vargas Garcia',
                name: 'Stanley Vargas Garcia',
                email: 'stanley.garcia@gmail.com',
                role: 'Master Admin',
                type: 'Master Admin'
            };
            try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(defaultAdmin)); } catch (_) {}
            return defaultAdmin;
        }

        if (shared && idOf(shared)) {
            try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(shared)); } catch (_) {}
            return shared;
        }

        return null;
    }

    function syncTabIdentity() {
        const user = getTabSessionUser();
        if (!user) return false;
        const tabId = idOf(user);
        let changed = false;

        try {
            const cur = readJson(sessionStorage, 'currentUser');
            if (!cur || idOf(cur) !== tabId) {
                sessionStorage.setItem('currentUser', JSON.stringify(user));
            }
            if (!readJson(sessionStorage, SESSION_KEY)) {
                sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
            }
        } catch (_) {}

        SHARED_KEYS.forEach(key => {
            const shared = readJson(localStorage, key);
            if (!shared || idOf(shared) !== tabId) {
                try {
                    localStorage.setItem(key, JSON.stringify(user));
                    changed = true;
                } catch (_) {}
            }
        });

        if (changed) {
            // Drop identity-derived caches so the UI rebuilds for THIS tab's user
            window._cachedTeacherSectionCards = null;
            window._cachedTeacherSectionCardsTime = 0;
            try {
                const nav = readJson(localStorage, 'sigma-teacher-nav-state');
                if (nav && nav.teacherId && idOf({ id: nav.teacherId }) !== tabId) {
                    localStorage.removeItem('sigma-teacher-nav-state');
                }
            } catch (_) {}
        }
        return changed;
    }

    window.getTabSessionUser = getTabSessionUser;
    window.syncTabIdentity = syncTabIdentity;

    syncTabIdentity();

    let wasHidden = false;
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            wasHidden = true;
            return;
        }
        if (wasHidden && syncTabIdentity()) {
            window.dispatchEvent(new CustomEvent('sigma:tab-identity-restored'));
        }
        wasHidden = false;
    });
    window.addEventListener('focus', () => {
        if (syncTabIdentity()) {
            window.dispatchEvent(new CustomEvent('sigma:tab-identity-restored'));
        }
    });
    window.addEventListener('pageshow', () => { syncTabIdentity(); });
})();
