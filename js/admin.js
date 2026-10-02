var getStoredJson = window.getStoredJson || function (key, fallback) {
    try {
        if (!key || typeof localStorage === 'undefined') return fallback;
        const raw = localStorage.getItem(key);
        if (!raw || raw === 'undefined' || raw === 'null') return fallback;
        const parsed = JSON.parse(raw);
        if (parsed === null || parsed === undefined) return fallback;
        if (Array.isArray(fallback) && !Array.isArray(parsed)) return fallback;
        return parsed;
    } catch (e) {
        return fallback;
    }
};

var USER_STORAGE_KEY = window.USER_STORAGE_KEY || 'sigma-admin-users';
var SUBJECTS_STORAGE_KEY = window.SUBJECTS_STORAGE_KEY || 'sigma-admin-subjects';
var SECTIONS_STORAGE_KEY = window.SECTIONS_STORAGE_KEY || 'sigma-admin-sections';
var MANAGED_USERS_RESET_KEY = window.MANAGED_USERS_RESET_KEY || 'sigma-managed-users-reset-v1';
var LOGIN_SECURITY_KEY = window.LOGIN_SECURITY_KEY || 'sigma-login-security-config';

window.sectionSearchState = window.sectionSearchState || {
    name: '',
    room: '',
    grade: '',
    hasSearched: false
};

window.subjectSearchState = window.subjectSearchState || {
    code: '',
    name: '',
    type: '',
    hasSearched: false
};

window.userPaginationState = { currentPage: 1, itemsPerPage: 20 };
window.sectionPaginationState = { currentPage: 1, itemsPerPage: 20 };
window.subjectPaginationState = { currentPage: 1, itemsPerPage: 20 };

// Users Overview Pagination state
var currentOverviewPage = window.currentOverviewPage || 1;
var totalOverviewPages = window.totalOverviewPages || 3;

function getLoggedInAdminUser() {
    let authUser = {};
    try {
        authUser = JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}');
    } catch {}
    const allUsers = (typeof getStoredJson === 'function') ? getStoredJson(USER_STORAGE_KEY, []) : [];
    const authId = String(authUser.uid || authUser.id || '');
    const authEmail = (authUser.email || '').toLowerCase();

    // 1. If explicit authenticated user found in DB:
    let loggedIn = (authId ? allUsers.find(u => String(u.uid || u.id) === authId) : null)
        || (authEmail ? allUsers.find(u => u.email && u.email.toLowerCase() === authEmail) : null);

    if (loggedIn) return loggedIn;

    // 2. If authUser in sessionStorage has an explicit role:
    if (authUser && (authUser.role || authUser.type)) {
        return authUser;
    }

    // 3. In Admin portal, default institutional logged-in user is Master Admin (Stanley Garcia - 0000000)
    const masterAdmin = allUsers.find(u => String(u.uid || u.id) === '0000000')
        || allUsers.find(u => (u.role || u.type || '').toLowerCase().includes('master'))
        || { id: '0000000', uid: '0000000', role: 'Master Admin', type: 'Master Admin', firstName: 'Stanley', lastName: 'Garcia' };

    return masterAdmin;
}
window.getLoggedInAdminUser = getLoggedInAdminUser;

function normalizeUserRole(role) {
    if (typeof window.normalizeUserRole === 'function' && window.normalizeUserRole !== normalizeUserRole) {
        return window.normalizeUserRole(role);
    }
    const r = String(role || '').trim().toLowerCase();
    if (r === 'master admin' || r === 'master' || r === 'super admin' || r === 'head admin') return 'Master Admin';
    if (r === 'admin' || r === 'administrator' || r === 'institutional admin') return 'Admin';
    if (r === 'teacher' || r === 'instructor' || r === 'faculty') return 'Teacher';
    if (r === 'student' || r === 'pupil' || r === 'learner') return 'Student';
    return role ? (role.charAt(0).toUpperCase() + role.slice(1)) : 'Student';
}
window.normalizeUserRole = normalizeUserRole;



// User data must be preserved across admin roles. Master Admin seeding is handled below.

// SEED MASTER ADMIN & PERMANENT USERS: Ensure Stanley Garcia (0000000), Teacher (1111111), and Student (2222222) exist
(function initializeUserSequences() {
    const USER_STORAGE_KEY = 'sigma-admin-users';
    const masterAdmin = {
        id: "0000000",
        uid: "0000000",
        firstName: "Stanley",
        middleName: "Vargas",
        lastName: "Garcia",
        fullName: "Stanley Vargas Garcia",
        email: "stanley.garcia@gmail.com",
        password: "garcia0000000",
        role: "Master Admin",
        type: "Master Admin",
        status: "Active",
        gender: "Male",
        branch: "Main Campus",
        seq: 0,
        createdAt: "2026-06-01T08:00:00+08:00",
        createdVia: "system-seed",
        permissions: { bio: true, achievements: true, subjects: true, sections: true }
    };

    const permanentTeacher = {
        id: "1111111",
        uid: "1111111",
        firstName: "Maria",
        middleName: "Santos",
        lastName: "Ramos",
        fullName: "Maria Santos Ramos",
        email: "maria.ramos@gmail.com",
        password: "ramos1111111",
        role: "Teacher",
        type: "Teacher",
        status: "Active",
        gender: "Female",
        branch: "Main Campus",
        department: "Senior High School - Faculty",
        createdAt: "2026-09-02T08:00:00+08:00",
        createdVia: "system-seed",
        permissions: { bio: true, achievements: true, subjects: true, sections: true, actionView: true, actionEdit: true }
    };

    const permanentStudent = {
        id: "2222222",
        uid: "2222222",
        firstName: "Juan",
        middleName: "Abad",
        lastName: "Dela Cruz",
        fullName: "Juan Abad Dela Cruz",
        email: "juan.delacruz@gmail.com",
        password: "delacruz2222222",
        role: "Student",
        type: "Student",
        status: "Active",
        gender: "Male",
        branch: "Main Campus",
        gradeSection: "Grade 11 - ICT A",
        strand: "TVL - ICT",
        createdAt: "2026-09-03T08:00:00+08:00",
        createdVia: "system-seed",
        permissions: { bio: true, achievements: true, subjects: true, sections: true, actionView: true }
    };

    try {
        let users = getStoredJson(USER_STORAGE_KEY, []);
        const mergeUser = (map, user) => {
            if (!user) return;
            const id = String(user.uid || user.id || user.email || '').trim().toLowerCase();
            if (!id) return;
            map.set(id, { ...(map.get(id) || {}), ...user });
        };

        // Recover original creation dates from untouched storage keys if available
        const originalCreationDates = new Map();
        ['sigma-student-users', 'sigma-teacher-users'].forEach((storageKey) => {
            try {
                const stored = getStoredJson(storageKey, []);
                if (Array.isArray(stored)) {
                    stored.forEach((u) => {
                        const uid = String(u.uid || u.id || u.email || '').trim().toLowerCase();
                        if (uid && u.createdAt && !String(u.createdAt).includes('2026-08-')) {
                            originalCreationDates.set(uid, u.createdAt);
                        }
                    });
                }
            } catch (e) {}
        });

        const mergedUsers = new Map();
        ['sigma-admin-users', 'sigma-users-list', 'sigma-teacher-users', 'sigma-student-users'].forEach((storageKey) => {
            try {
                const storedUsers = getStoredJson(storageKey, []);
                if (Array.isArray(storedUsers)) {
                    storedUsers.forEach((user) => mergeUser(mergedUsers, user));
                }
            } catch (e) {}
        });
        users.forEach((user) => mergeUser(mergedUsers, user));
        users = Array.from(mergedUsers.values());

        // Thorough automated migration to @gmail.com with surname across all users
        users.forEach(u => {
            if (!u) return;
            const uid = String(u.uid || u.id || '').replace(/^#/, '').trim();
            if (uid === '0000000' || String(u.role || u.type || '').toLowerCase().includes('master')) {
                u.id = '0000000';
                u.uid = '0000000';
                u.firstName = 'Stanley';
                u.middleName = 'Vargas';
                u.lastName = 'Garcia';
                u.fullName = 'Stanley Vargas Garcia';
                u.email = 'stanley.garcia@gmail.com';
                u.role = 'Master Admin';
                u.type = 'Master Admin';
                u.createdAt = '2026-06-01T08:00:00+08:00';
            } else if (uid === '1111111' || (String(u.role || u.type || '').toLowerCase().includes('teach') && (u.firstName === 'Maria' || String(u.email).includes('1111111')))) {
                u.id = '1111111';
                u.uid = '1111111';
                u.firstName = 'Maria';
                u.middleName = 'Santos';
                u.lastName = 'Ramos';
                u.fullName = 'Maria Santos Ramos';
                u.email = 'maria.ramos@gmail.com';
                u.password = 'ramos1111111';
                u.role = 'Teacher';
                u.type = 'Teacher';
                u.createdAt = '2026-09-02T08:00:00+08:00';
            } else if (uid === '2222222' || (String(u.role || u.type || '').toLowerCase().includes('stud') && (u.firstName === 'Juan' || String(u.email).includes('2222222')))) {
                u.id = '2222222';
                u.uid = '2222222';
                u.firstName = 'Juan';
                u.middleName = 'Abad';
                u.lastName = 'Dela Cruz';
                u.fullName = 'Juan Abad Dela Cruz';
                u.email = 'juan.delacruz@gmail.com';
                u.password = 'delacruz2222222';
                u.role = 'Student';
                u.type = 'Student';
                u.createdAt = '2026-09-03T08:00:00+08:00';
            } else if (u.email && (u.email.includes('@icc') || !u.email.includes('@gmail.com'))) {
                const fn = (u.firstName || 'user').toLowerCase().replace(/[^a-z0-9]/g, '');
                const ln = (u.lastName || 'account').toLowerCase().replace(/[^a-z0-9]/g, '');
                u.email = `${fn}.${ln}@gmail.com`;
            }
        });
        
        // 1. Ensure Master Admin exists
        const masterIdx = users.findIndex(u => String(u.uid || u.id) === masterAdmin.id);
        if (masterIdx === -1) {
            users.unshift(masterAdmin);
        } else {
            users[masterIdx] = {
                ...masterAdmin,
                ...users[masterIdx],
                email: masterAdmin.email,
                role: "Master Admin",
                type: "Master Admin",
                status: users[masterIdx].status || "Active",
                gender: (!users[masterIdx].gender || users[masterIdx].gender === 'Not specified') ? "Male" : users[masterIdx].gender,
                permissions: {
                    ...masterAdmin.permissions,
                    ...(users[masterIdx].permissions || {})
                }
            };
        }

        // 2. Ensure Permanent Teacher (1111111) exists
        const teacherIdx = users.findIndex(u => String(u.uid || u.id) === permanentTeacher.id);
        if (teacherIdx === -1) {
            users.push(permanentTeacher);
        } else {
            users[teacherIdx] = {
                ...permanentTeacher,
                ...users[teacherIdx],
                email: permanentTeacher.email,
                lastName: permanentTeacher.lastName,
                fullName: permanentTeacher.fullName,
                password: permanentTeacher.password,
                role: "Teacher",
                type: "Teacher",
                status: users[teacherIdx].status || "Active"
            };
        }

        // 3. Ensure Permanent Student (2222222) exists
        const studentIdx = users.findIndex(u => String(u.uid || u.id) === permanentStudent.id);
        if (studentIdx === -1) {
            users.push(permanentStudent);
        } else {
            users[studentIdx] = {
                ...permanentStudent,
                ...users[studentIdx],
                email: permanentStudent.email,
                lastName: permanentStudent.lastName,
                fullName: permanentStudent.fullName,
                password: permanentStudent.password,
                role: "Student",
                type: "Student",
                status: users[studentIdx].status || "Active"
            };
        }

        // 4. STRICT CREATION DATE & TIME CHRONOLOGY:
        const nonMasterUsers = users.filter(u => String(u.uid || u.id) !== '0000000' && !String(u.role || u.type || '').toLowerCase().includes('master'));
        const masterUser = users.find(u => String(u.uid || u.id) === '0000000' || String(u.role || u.type || '').toLowerCase().includes('master')) || masterAdmin;

        // Sort ascending by authentic creation date and time (oldest first):
        nonMasterUsers.sort((a, b) => {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return timeA - timeB;
        });

        nonMasterUsers.forEach((u, idx) => {
            u.seq = idx + 1;
        });

        masterUser.seq = 0;
        masterUser.createdAt = '2026-06-01T08:00:00+08:00';

        users = [masterUser, ...nonMasterUsers];
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(users));
        localStorage.setItem('sigma-users-list', JSON.stringify(users));

        // 4. REAL USER ACCOUNT ACTIVITY & REGISTRATION PERSISTENCE:
        // Strictly use actual login sessions (zero fake/fabricated active times)
        const authUserRaw = sessionStorage.getItem('sigma-authenticated-user');
        let currentAuthId = '0000000';
        try {
            if (authUserRaw) {
                const parsedAuth = JSON.parse(authUserRaw);
                currentAuthId = String(parsedAuth.uid || parsedAuth.id || '0000000').trim();
            }
        } catch (e) {}

        users = users.map((u) => {
            const uid = String(u.uid || u.id || '').trim();
            let lastLogin = null;

            if (uid === currentAuthId || uid === '0000000' || uid === String(masterAdmin.id)) {
                // Currently authenticated user is actively logged in
                lastLogin = new Date().toISOString();
            } else if (u.hasRealLoginSession && u.lastLogin) {
                // Keep only genuinely recorded logins from login portal
                lastLogin = u.lastLogin;
            } else {
                // Never logged in - zero fake times
                lastLogin = null;
            }

            return {
                ...u,
                lastLogin,
                lastActive: lastLogin
            };
        });

        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(users));
        localStorage.setItem('sigma-users-list', JSON.stringify(users));
    } catch (e) {
        console.error('Failed to initialize user sequences:', e);
    }
})();

// SEED DEFAULT ACADEMIC DATA (Teachers, Students & Subjects for Assign flows)
(function seedDefaultAcademicData() {
    try {
        const USER_STORAGE_KEY = window.USER_STORAGE_KEY || 'sigma-admin-users';
        const SUBJECTS_STORAGE_KEY = window.SUBJECTS_STORAGE_KEY || 'sigma-admin-subjects';

        let users = getStoredJson(USER_STORAGE_KEY, []);
        const hasTeachers = users.some(u => String(u.role || u.type || '').toLowerCase().includes('teach'));
        const hasStudents = users.some(u => String(u.role || u.type || '').toLowerCase().includes('stud'));

        if (!hasTeachers || !hasStudents) {
            const defaultTeachers = [
                { id: "1111111", uid: "1111111", firstName: "Maria", middleName: "Santos", lastName: "Ramos", fullName: "Maria Santos Ramos", email: "maria.ramos@gmail.com", password: "ramos1111111", role: "Teacher", type: "Teacher", status: "Active", gender: "Female", branch: "Main Campus", department: "Senior High School - Faculty", createdAt: "2026-09-03T08:00:00+08:00", createdVia: "system-seed" }
            ];

            const defaultStudents = [
                { id: "2222222", uid: "2222222", firstName: "Juan", middleName: "Abad", lastName: "Dela Cruz", fullName: "Juan Abad Dela Cruz", email: "juan.delacruz@gmail.com", password: "delacruz2222222", role: "Student", type: "Student", status: "Active", gender: "Male", branch: "Main Campus", gradeSection: "Grade 11 - ICT A", strand: "TVL - ICT", createdAt: "2026-09-03T08:00:00+08:00", createdVia: "system-seed" }
            ];

            if (!hasTeachers) {
                defaultTeachers.forEach(t => {
                    if (!users.some(u => String(u.uid || u.id) === t.id)) users.push(t);
                });
            }
            if (!hasStudents) {
                defaultStudents.forEach(s => {
                    if (!users.some(u => String(u.uid || u.id) === s.id)) users.push(s);
                });
            }

            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(users));
            localStorage.setItem('sigma-users-list', JSON.stringify(users));
        }

        let subjects = getStoredJson(SUBJECTS_STORAGE_KEY, []);
        if (!Array.isArray(subjects)) {
            subjects = [];
            localStorage.setItem(SUBJECTS_STORAGE_KEY, JSON.stringify(subjects));
        }
    } catch (e) {
        console.error('Failed to seed academic data:', e);
    }
})();



// Global Input Capitalization Logic
document.addEventListener('input', function (e) {
    const target = e.target;
    const isTextBox = (target.tagName === 'INPUT' && (target.type === 'text' || target.type === 'search')) || target.tagName === 'TEXTAREA';

    if (isTextBox && !target.readOnly && !target.disabled) {
        // Skip capitalization for specific fields like Email
        if (target.id === 'edit-user-email') return;

        const start = target.selectionStart;
        const end = target.selectionEnd;
        const val = target.value;

        if (val.length > 0) {
            const newVal = val.charAt(0).toUpperCase() + val.slice(1);
            if (newVal !== val) {
                target.value = newVal;
                // Maintain cursor position
                if (target.setSelectionRange) {
                    target.setSelectionRange(start, end);
                }
            }
        }
    }
});
var ORG_PROFILE_STORAGE_KEY = window.ORG_PROFILE_STORAGE_KEY || 'sigma-admin-organization';
var ADMIN_ANNOUNCEMENTS_STORAGE_KEY = window.ADMIN_ANNOUNCEMENTS_STORAGE_KEY || 'sigma-admin-announcements-v1';
var ADMIN_ANNOUNCEMENT_DRAFT_KEY = window.ADMIN_ANNOUNCEMENT_DRAFT_KEY || 'sigma-admin-announcement-draft-v1';
var DEFAULT_ORG_PROFILE = window.DEFAULT_ORG_PROFILE || {
    schoolName: "Interface Computer College Caloocan",
    location: "Caloocan City",
    address: "10th Avenue corner Rizal Avenue Extension",
    contactNumber: "09947669267",
    emailAddress: "information@interface.edu.ph",
    bios: [
        {
            title: "Mission",
            description: "To provide affordable, high-quality, industry-aligned education and comprehensive training that empowers learners with practical skills, innovative mindset, and moral integrity for academic and career excellence."
        },
        {
            title: "Vision",
            description: "Interface Computer College envisions itself as a leading educational institution producing globally competent, socially responsible, and values-oriented professionals in technology and management."
        }
    ],
    logo: 'image/ICC logo.jpg',
    profileUploads: ['image/ICC logo.jpg'],
    administratorId: '',
    administratorName: '',
    status: 'Active'
};

let switchTabHandler = null;
let activeAnnouncementType = 'regular';

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
window.escapeHtml = escapeHtml;
const escapeSigmaAiText = escapeHtml;

window.renderPaginationControls = function (containerId, totalItems, state, onPageChange) {
    const container = (typeof containerId === 'string') ? document.getElementById(containerId) : containerId;
    if (!container) return;

    // Helper to find the footer container if container is an inner div
    const wrapper = container.closest ? (container.closest('.border-t') || container) : container;

    if (totalItems === 0) {
        container.innerHTML = '';
        if (wrapper) wrapper.style.display = 'none';
        return;
    }

    const itemsPerPage = (state && state.itemsPerPage) || 20;
    const currentPage = (state && state.currentPage) || 1;
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

    if (totalPages <= 1) {
        container.innerHTML = '';
        if (wrapper) wrapper.style.display = 'none';
        return;
    }

    if (wrapper) {
        wrapper.style.display = '';
    }

    let pagesHtml = '';

    // Previous Button
    const prevDisabled = currentPage <= 1;
    const prevAction = typeof onPageChange === 'function' ? `data-page="${currentPage - 1}"` : `onclick="window.${onPageChange}(${currentPage - 1})"`;
    pagesHtml += `
        <button type="button" ${prevAction} 
            ${prevDisabled ? 'disabled' : ''}
            class="sigma-pagination-btn sigma-pagination-btn--nav sigma-pagination-btn--prev ${prevDisabled ? 'is-disabled' : ''}"
            aria-label="Previous page">
            <i class="fa-solid fa-chevron-left text-[11px]"></i>
        </button>
    `;

    // Dynamic Page Numbers (Window of 5)
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);

    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }
    startPage = Math.max(1, startPage);

    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === currentPage;
        const pageAction = typeof onPageChange === 'function' ? `data-page="${i}"` : `onclick="window.${onPageChange}(${i})"`;
        pagesHtml += `
            <button type="button" ${pageAction} 
                class="sigma-pagination-btn sigma-pagination-btn--number ${isActive ? 'is-active' : ''}"
                aria-label="Page ${i}"
                ${isActive ? 'aria-current="page"' : ''}>
                ${i}
            </button>
        `;
    }

    // Next Button
    const nextDisabled = currentPage >= totalPages;
    const nextAction = typeof onPageChange === 'function' ? `data-page="${currentPage + 1}"` : `onclick="window.${onPageChange}(${currentPage + 1})"`;
    pagesHtml += `
        <button type="button" ${nextAction} 
            ${nextDisabled ? 'disabled' : ''}
            class="sigma-pagination-btn sigma-pagination-btn--nav sigma-pagination-btn--next ${nextDisabled ? 'is-disabled' : ''}"
            aria-label="Next page">
            <i class="fa-solid fa-chevron-right text-[11px]"></i>
        </button>
    `;

    container.innerHTML = `
        <div class="sigma-pagination-container">
            ${pagesHtml}
        </div>
    `;

    if (typeof onPageChange === 'function') {
        container.querySelectorAll('button[data-page]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetPage = parseInt(e.currentTarget.dataset.page, 10);
                if (!isNaN(targetPage) && targetPage >= 1 && targetPage <= totalPages && targetPage !== currentPage) {
                    onPageChange(targetPage);
                }
            });
        });
    }
};

window.onUserPageChange = function (page) {
    window.userPaginationState.currentPage = page;
    renderUserAccountsTable();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};
window.onSectionPageChange = function (page) {
    window.sectionPaginationState.currentPage = page;
    renderSectionsTable();
};
window.onSubjectPageChange = function (page) {
    window.subjectPaginationState.currentPage = page;
    renderSubjectsTable();
};



function loadAdminAnnouncements() {
    return getStoredJson(ADMIN_ANNOUNCEMENTS_STORAGE_KEY, []);
}

function saveAdminAnnouncements(posts) {
    window.saveStoredJson(ADMIN_ANNOUNCEMENTS_STORAGE_KEY, Array.isArray(posts) ? posts : []);
}

function getAnnouncementAudienceLabel(audience) {
    return {
        all: 'Everyone',
        students: 'Students',
        teachers: 'Teachers',
        specific: 'Specific Strand / Dept'
    }[audience] || 'Everyone';
}

function formatAnnouncementDate(dateValue) {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return 'Just now';
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
}

function renderAnnouncementActivePosts() {
    const announcementActivePosts = document.getElementById('announcement-active-posts');
    if (!announcementActivePosts) return;
    const posts = loadAdminAnnouncements();

    if (!posts.length) {
        announcementActivePosts.innerHTML = `
            <div class="py-12 border-2 border-dashed border-slate-100 rounded-[32px] flex flex-col items-center justify-center gap-3">
                <i class="fa-solid fa-bullhorn text-3xl text-black-fade"></i>
                <p class="text-sm font-bold text-black font-['Inter']">No Active Posts</p>
            </div>
        `;
        return;
    }

    announcementActivePosts.innerHTML = posts.map(post => `
        <article class="admin-card p-5 border border-slate-100">
            <div class="flex items-start justify-between gap-4">
                <div class="min-w-0 space-y-3">
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${post.type === 'urgent' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}">${post.type}</span>
                        <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-100 text-black border border-slate-200">${escapeHtml(getAnnouncementAudienceLabel(post.audience))}</span>
                    </div>
                    <div>
                        <h5 class="text-base font-black text-slate-900 leading-tight">${escapeHtml(post.title)}</h5>
                        <p class="mt-2 text-sm text-black leading-relaxed">${escapeHtml(post.body)}</p>
                    </div>
                    <p class="text-[11px] font-bold text-black uppercase tracking-widest">${escapeHtml(post.author || 'Admin Office')} • ${formatAnnouncementDate(post.createdAt)}</p>
                </div>
                <button type="button" data-announcement-delete="${escapeHtml(post.id)}" class="w-10 h-10 rounded-2xl bg-slate-50 text-black hover:bg-red-50 hover:text-red-500 transition-colors flex items-center justify-center" aria-label="Delete announcement">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        </article>
    `).join('');
}

function setAnnouncementType(type) {
    activeAnnouncementType = type === 'urgent' ? 'urgent' : 'regular';
    const buttons = document.querySelectorAll('[data-announcement-type]');
    buttons.forEach(button => {
        const isActive = button.dataset.announcementType === activeAnnouncementType;
        button.classList.toggle('border-super-accent', isActive && activeAnnouncementType === 'regular');
        button.classList.toggle('bg-super-accent/5', isActive && activeAnnouncementType === 'regular');
        button.classList.toggle('text-super-accent', isActive && activeAnnouncementType === 'regular');
        button.classList.toggle('border-red-300', isActive && activeAnnouncementType === 'urgent');
        button.classList.toggle('bg-red-50', isActive && activeAnnouncementType === 'urgent');
        button.classList.toggle('text-red-600', isActive && activeAnnouncementType === 'urgent');
        button.classList.toggle('border-slate-100', !isActive);
        button.classList.toggle('text-black', !isActive);
    });
}

// Global Click Outside Handler for Filter Menus
document.addEventListener('click', function (event) {
    const filterMenus = [
        { btnId: 'subject-filter-btn', menuId: 'subject-filter-menu' },
        { btnId: 'user-filter-btn', menuId: 'user-filter-menu' },
        { btnId: 'section-filter-btn', menuId: 'section-filter-menu' }
    ];

    filterMenus.forEach(config => {
        const btn = document.getElementById(config.btnId);
        const menu = document.getElementById(config.menuId);

        if (menu && !menu.classList.contains('hidden')) {
            const isClickInsideMenu = menu.contains(event.target);
            const isClickOnBtn = btn && btn.contains(event.target);

            if (!isClickInsideMenu && !isClickOnBtn) {
                menu.classList.add('hidden');
            }
        }
    });
});

const saveStoredJson = window.saveStoredJson || function (key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        if (key === USER_STORAGE_KEY) {
            localStorage.setItem('sigma-users-list', JSON.stringify(data));
        }
        if (key === SECTIONS_STORAGE_KEY || key === 'sigma-admin-sections') {
            localStorage.setItem('sigma-sections-list', JSON.stringify(data));
        }
        return true;
    } catch (e) {
        console.error('Failed to save JSON to localStorage:', e);
        return false;
    }
};

function buildManagedUserPassword(lastName, userId) {
    const safeLastName = String(lastName || 'user')
        .trim()
        .replace(/[^a-zA-Z0-9]/g, '')
        .toLowerCase();
    return `${safeLastName}${String(userId || '').trim()}`;
}

function purgeLegacyManagedUsers() {
    if (localStorage.getItem(MANAGED_USERS_RESET_KEY) === 'true') {
        return;
    }

    const users = getStoredJson(USER_STORAGE_KEY, []);
    const normalizedUsers = users.filter(Boolean).map((user) => ({
        ...user,
        createdVia: user.createdVia || 'admin-panel'
    }));
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(normalizedUsers));
    localStorage.setItem('sigma-users-list', JSON.stringify(normalizedUsers));
    localStorage.setItem(MANAGED_USERS_RESET_KEY, 'true');
}

purgeLegacyManagedUsers();

function getOrganizationProfile() {
    const stored = getStoredJson(ORG_PROFILE_STORAGE_KEY, {});
    const base = {
        ...DEFAULT_ORG_PROFILE,
        ...stored
    };
    if (!base.bios || !base.bios.length) {
        base.bios = [...DEFAULT_ORG_PROFILE.bios];
    }
    return base;
}

function saveOrganizationProfile(profile) {
    try {
        localStorage.setItem(ORG_PROFILE_STORAGE_KEY, JSON.stringify(profile));
    } catch (e) {
        console.error("Failed to save organization profile:", e);
        // If it fails, try to save without the upload history to recover space
        if (profile.profileUploads) {
            console.warn("Storage full, clearing school profile upload history...");
            const slimProfile = { ...profile, profileUploads: [] };
            localStorage.setItem(ORG_PROFILE_STORAGE_KEY, JSON.stringify(slimProfile));
        }
    }
}

function getRegisteredAdministrators() {
    const users = getStoredJson(USER_STORAGE_KEY, []);
    const seen = new Set();

    return users
        .filter((user) => {
            const role = String(user?.type || user?.role || '').toLowerCase();
            return role === 'admin' || role === 'institutional admin';
        })
        .map((user, index) => {
            const name = [
                user?.firstName,
                user?.middleName,
                user?.lastName
            ].filter(Boolean).join(' ').trim() || user?.fullName || user?.name || user?.email || `Administrator ${index + 1}`;
            const id = String(user?.id || user?.uid || user?.email || `admin-${index}`);
            return { id, name };
        })
        .filter((admin) => {
            if (seen.has(admin.id)) {
                return false;
            }
            seen.add(admin.id);
            return true;
        });
}

const SCHOOL_PROFILE_TAB_CONTENT = {
    bio: {
        eyebrow: '',
        title: '',
        body: '',
        items: []
    }
};

function getUserInitials(name) {
    if (!name || typeof name !== 'string') return 'U';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'U';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
window.getUserInitials = getUserInitials;

function resolveUserAvatar(user) {
    if (!user) return '';
    const id = String(user.uid || user.id || '').replace(/^#/, '').trim();

    // 1. Direct account avatar properties
    if (user.avatar && typeof user.avatar === 'string' && user.avatar.trim() && user.avatar !== 'null' && user.avatar !== 'undefined') return user.avatar.trim();
    if (user.profilePicture && typeof user.profilePicture === 'string' && user.profilePicture.trim() && user.profilePicture !== 'null' && user.profilePicture !== 'undefined') return user.profilePicture.trim();
    if (user.photo && typeof user.photo === 'string' && user.photo.trim() && user.photo !== 'null' && user.photo !== 'undefined') return user.photo.trim();
    if (user.profileImage && typeof user.profileImage === 'string' && user.profileImage.trim() && user.profileImage !== 'null' && user.profileImage !== 'undefined') return user.profileImage.trim();

    // 2. User-specific localStorage avatar storage
    if (id) {
        const stored = localStorage.getItem(`sigma_avatar_${id}`);
        if (stored && typeof stored === 'string' && stored.trim() && stored !== 'null' && stored !== 'undefined') return stored.trim();
    }
    if (id === '0000000') {
        const masterAvatar = localStorage.getItem('sigma_avatar_0000000');
        if (masterAvatar && typeof masterAvatar === 'string' && masterAvatar.trim() && masterAvatar !== 'null' && masterAvatar !== 'undefined') return masterAvatar.trim();
    }

    // 3. Shared profile-view system lookup (strict target lookup)
    if (typeof window.getCurrentUserAvatar === 'function' && id) {
        const sharedAvatar = window.getCurrentUserAvatar(id);
        if (sharedAvatar && typeof sharedAvatar === 'string' && sharedAvatar.trim() && sharedAvatar !== 'null' && sharedAvatar !== 'undefined') return sharedAvatar.trim();
    }

    // 4. Return empty to display clean default avatar
    return '';
}
window.resolveUserAvatar = resolveUserAvatar;

function formatUserCreatedDate(dateValue) {
    if (!dateValue) return 'Sep 3, 2026';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return 'Sep 3, 2026';
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}
window.formatUserCreatedDate = formatUserCreatedDate;

function formatUserLastActive(lastLoginVal, isCurrentSelf) {
    if (isCurrentSelf) return 'Active now';
    if (!lastLoginVal) {
        return 'Never logged in';
    }
    const d = new Date(lastLoginVal);
    if (Number.isNaN(d.getTime())) return 'Never logged in';

    // Reference time: September 3, 2026 (SY 2026-2027)
    const baseNow = new Date('2026-09-03T18:02:44+08:00').getTime();
    const diffMs = Math.max(0, baseNow - d.getTime());
    const diffMin = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMin < 1) return 'Active now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
window.formatUserLastActive = formatUserLastActive;

function updateUserMetricCards() {
    const allUsers = (typeof getStoredJson === 'function') ? getStoredJson(USER_STORAGE_KEY, []) : [];
    let students = 0;
    let teachers = 0;
    let admins = 0;

    allUsers.forEach(u => {
        const role = String(u.type || u.role || 'Student').toLowerCase();
        if (role.includes('student')) students++;
        else if (role.includes('teacher') || role.includes('faculty') || role.includes('instructor')) teachers++;
        else if (role.includes('admin') || role.includes('master')) admins++;
    });

    const totalEl = document.getElementById('metric-total-users');
    const studentEl = document.getElementById('metric-student-users');
    const teacherEl = document.getElementById('metric-teacher-users');
    const adminEl = document.getElementById('metric-admin-users');

    const totalSpotlight = document.getElementById('metric-total-users-spotlight');
    const studentSpotlight = document.getElementById('metric-student-users-spotlight');
    const teacherSpotlight = document.getElementById('metric-teacher-users-spotlight');
    const adminSpotlight = document.getElementById('metric-admin-users-spotlight');

    if (totalEl) totalEl.textContent = allUsers.length;
    if (totalSpotlight) totalSpotlight.textContent = allUsers.length;

    if (studentEl) studentEl.textContent = students;
    if (studentSpotlight) studentSpotlight.textContent = students;

    if (teacherEl) teacherEl.textContent = teachers;
    if (teacherSpotlight) teacherSpotlight.textContent = teachers;

    if (adminEl) adminEl.textContent = admins;
    if (adminSpotlight) adminSpotlight.textContent = admins;

    if (typeof window.bindInteractiveMetricCards === 'function') {
        window.bindInteractiveMetricCards();
    }
}
window.updateUserMetricCards = updateUserMetricCards;

function renderUserAccountsTable() {
    window.renderUserAccountsTable = renderUserAccountsTable;
    const tableBody = document.getElementById('userTableBody');
    if (!tableBody) return;

    if (typeof updateUserMetricCards === 'function') {
        updateUserMetricCards();
    }

    // Canonical Table Structure: Centralized in this single file (js/admin.js)
    // Ensures admin.html, php/admin.php, and any portal view edit 1 single file of code
    const tableEl = tableBody.closest('table');
    if (tableEl && !tableEl.dataset.canonicalInitialized) {
        tableEl.dataset.canonicalInitialized = 'true';
        tableEl.classList.add('w-full', 'border-collapse', 'table-fixed');
        let thead = tableEl.querySelector('thead');
        if (!thead) {
            thead = document.createElement('thead');
            tableEl.insertBefore(thead, tableBody);
        }
        thead.className = 'sticky top-0 bg-[#15803d] z-10 border-b border-[#166534]';
        thead.innerHTML = `
            <tr>
                <th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter'] border-r border-[#166534]">No.</th>
                <th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter'] border-r border-[#166534]">ID</th>
                <th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter'] border-r border-[#166534]">Name</th>
                <th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter'] border-r border-[#166534]">Email</th>
                <th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter'] border-r border-[#166534]">Role</th>
                <th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter'] border-r border-[#166534]">Status</th>
                <th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter'] border-r border-[#166534]">Date Created</th>
                <th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter']">Action</th>
            </tr>
        `;
    }

    const queryVal = String(window.userAccountSearchState?.query || window.userAccountSearchState?.id || window.userAccountSearchState?.name || '').trim().toLowerCase();
    const roleQuery = String(window.userAccountSearchState?.role || '').trim().toLowerCase();
    const statusQuery = String(window.userAccountSearchState?.status || '').trim().toLowerCase();
    const displayUsers = getFilteredUsersBySearch({ query: queryVal, role: roleQuery, status: statusQuery });

    if (displayUsers.length === 0) {
        tableBody.innerHTML = `
            <tr id="user-empty-state" class="bg-white">
                <td colspan="8" class="py-32 text-center">
                    <div class="flex flex-col items-center justify-center space-y-4">
                        <i class="fa-solid fa-users-viewfinder text-6xl text-black-fade"></i>
                        <p class="text-base font-bold text-black font-['Inter']">No Matching Accounts Found</p>
                    </div>
                </td>
            </tr>
        `;
        document.getElementById('user-pagination-container').innerHTML = '';
        return;
    }

    const totalItems = displayUsers.length;
    const startIndex = (window.userPaginationState.currentPage - 1) * window.userPaginationState.itemsPerPage;
    const paginatedUsers = displayUsers.slice(startIndex, startIndex + window.userPaginationState.itemsPerPage);

    const currentLoggedIn = (typeof window.getLoggedInAdminUser === 'function')
        ? window.getLoggedInAdminUser()
        : getLoggedInAdminUser();
    const rawRole = String(currentLoggedIn?.role || currentLoggedIn?.type || 'Master Admin').toLowerCase();
    const isViewerMaster = rawRole.includes('master') || rawRole.includes('super') || rawRole.includes('head') || String(currentLoggedIn?.uid || currentLoggedIn?.id || '') === '0000000';
    const viewerPerms = currentLoggedIn?.permissions || {};

    tableBody.innerHTML = paginatedUsers.map((user, rowIdx) => {
        const rowStripe = rowIdx % 2 === 1 ? 'bg-slate-50/60' : '';
        const isThisUserMaster = String(user.uid || user.id || '').replace(/^#/, '').trim() === '0000000' || String(user.role || user.type || '').toLowerCase().includes('master');
        const rowNumber = isThisUserMaster ? 0 : (user.seq !== undefined && user.seq !== null && Number(user.seq) > 0 ? Number(user.seq) : (totalItems - startIndex - rowIdx - 1));
        const fullName = user.fullName || `${user.firstName || ''} ${user.middleName ? user.middleName + ' ' : ''}${user.lastName || ''}`.trim() || 'N/A';
        const initials = getUserInitials(fullName);
        const photo = resolveUserAvatar(user, rowIdx);
        let email = (user.email && !user.email.includes('@icc') && user.email.includes('@gmail.com')) ? user.email : '';
        if (!email) {
            const cleanFn = (user.firstName || 'user').toLowerCase().replace(/[^a-z0-9]/g, '');
            const cleanLn = (user.lastName || 'account').toLowerCase().replace(/[^a-z0-9]/g, '');
            email = (cleanFn && cleanLn) ? `${cleanFn}.${cleanLn}@gmail.com` : `${cleanFn || 'user'}@gmail.com`;
        }
        const id = user.uid || user.id || 'N/A';
        const role = normalizeUserRole(user.type || user.role || 'Student');
        const status = user.status || 'Active';

        const isRowMasterAdmin = role === 'Master Admin';
        const isRowAdmin = role === 'Admin';
        const isRowTeacher = role === 'Teacher';
        const isRowStudent = role === 'Student';
        const cleanCurrentId = String(currentLoggedIn.uid || currentLoggedIn.id || '0000000').replace(/^#/, '').trim();
        const cleanRowId = String(id).replace(/^#/, '').trim();
        const isSelf = (cleanCurrentId === cleanRowId) || (cleanCurrentId === '0000000' && cleanRowId === '0000000');

        // Authority checks for this row
        let canEditThisUser = !isSelf;
        let canLockThisUser = !isSelf;

        if (!isViewerMaster) {
            if (isRowMasterAdmin) {
                canEditThisUser = false;
                canLockThisUser = false;
            } else if (isRowAdmin) {
                canEditThisUser = !isSelf && (viewerPerms.manageAdmins === true);
                canLockThisUser = canEditThisUser && (viewerPerms.lock !== false);
            } else if (isRowTeacher) {
                canEditThisUser = !isSelf && (viewerPerms.manageTeachers !== false);
                canLockThisUser = canEditThisUser && (viewerPerms.lock !== false);
            } else if (isRowStudent) {
                canEditThisUser = !isSelf && (viewerPerms.manageStudents !== false);
                canLockThisUser = canEditThisUser && (viewerPerms.lock !== false);
            }
        } else {
            if (isSelf) {
                canEditThisUser = false;
                canLockThisUser = false;
            }
            if (isRowMasterAdmin) {
                const totalMasters = displayUsers.filter(u => normalizeUserRole(u.type || u.role) === 'Master Admin').length;
                if (totalMasters <= 1) {
                    canLockThisUser = false;
                }
            }
        }

        const lowerStatus = status.toLowerCase();
        const isStatusActive = lowerStatus === 'active';
        const isLocked = lowerStatus === 'locked' || user.isLocked === true;
        const isDeactivated = lowerStatus === 'inactive' || lowerStatus === 'deactivated';
        const statusClass = isStatusActive ? 'text-[#15803d]' : (isLocked || isDeactivated) ? 'text-red-500' : 'text-slate-400';

        // Connect real last login / activity timestamp
        const createdDateText = formatUserCreatedDate(user.createdAt);

        const defaultProfileAvatarHtml = `<div class="w-8 h-8 rounded-full bg-[#e2e8f0] flex items-center justify-center shrink-0 border border-slate-200/70 select-none overflow-hidden"><i class="fa-solid fa-user text-xs text-[#94a3b8]"></i></div>`;
        const avatarElement = photo
            ? `<img src="${escapeHtml(photo)}" alt="${escapeHtml(fullName)}" class="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0" onerror="this.outerHTML='<div class=\\'w-8 h-8 rounded-full bg-[#e2e8f0] flex items-center justify-center shrink-0 border border-slate-200/70 select-none overflow-hidden\\'><i class=\\'fa-solid fa-user text-xs text-[#94a3b8]\\'></i></div>'">`
            : defaultProfileAvatarHtml;

        return `
            <tr class="transition-colors ${rowStripe} hover:bg-slate-50/80">
                <td class="px-4 py-4 text-center">
                    <div class="text-[13px] font-normal text-black text-center tracking-wide font-['Inter']" style="color: #000000 !important;">${rowNumber}</div>
                </td>
                <td class="px-4 py-4 text-center">
                    <div class="text-[13px] font-normal text-black text-center tracking-wide font-['Inter']">${id}</div>
                </td>
                <td class="px-4 py-3.5 text-left">
                    <div class="flex items-center justify-start gap-3 text-left">
                        ${avatarElement}
                        <div class="text-[13px] font-normal text-black break-words font-['Inter'] leading-snug text-left">
                            ${escapeHtml(fullName)}
                        </div>
                    </div>
                </td>
                <td class="px-4 py-3.5 text-center">
                    <div class="text-[13px] font-normal text-black break-words font-['Inter'] text-center leading-snug" style="color: #000000 !important;">
                        ${escapeHtml(email)}
                    </div>
                </td>
                <td class="px-4 py-4 text-center">
                    <div class="text-[13px] font-normal text-black text-center font-['Inter']">${escapeHtml(role)}</div>
                </td>
                <td class="px-4 py-4 text-center">
                    <div class="text-[13px] font-normal ${statusClass} text-center font-['Inter']">
                        ${escapeHtml(status)}
                    </div>
                </td>
                <td class="px-4 py-3.5 text-center">
                    <div class="text-[13px] font-normal text-black text-center font-['Inter']">
                        ${escapeHtml(createdDateText)}
                    </div>
                </td>
                <td class="px-4 py-4 text-center">
                    <div class="flex justify-center">
                        <div class="action-dropdown-container">
                            <button onclick="window.toggleUserActionDropdown('${id}', event)" 
                                id="dots-btn-${id}"
                                class="action-dots-btn cursor-pointer" 
                                title="Actions">
                                <i class="fa-solid fa-ellipsis"></i>
                            </button>
                            <div id="action-menu-${id}" class="action-dropdown-menu">
                                <button onclick="window.viewUserProfile('${id}'); document.querySelectorAll('.action-dropdown-menu').forEach(m => m.classList.remove('show'));" class="action-dropdown-item">
                                    <i class="fa-solid fa-circle-user"></i>
                                    <span>View Profile</span>
                                </button>
                                ${canLockThisUser && !isDeactivated ? `
                                <button onclick="window.toggleUserLock('${id}'); document.querySelectorAll('.action-dropdown-menu').forEach(m => m.classList.remove('show'));" class="action-dropdown-item ${isLocked ? 'text-[#15803d]' : 'text-red-600'}">
                                    <i class="fa-solid ${isLocked ? 'fa-lock-open' : 'fa-lock'}"></i>
                                    <span>${isLocked ? 'Unlock Account' : 'Lock Account'}</span>
                                </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    // Fill remaining rows to reach itemsPerPage (20) to keep the table height fixed
    const itemsPerPage = window.userPaginationState.itemsPerPage;
    const remainingRows = itemsPerPage - paginatedUsers.length;
    if (remainingRows > 0) {
        for (let i = 0; i < remainingRows; i++) {
            const rowIndex = paginatedUsers.length + i;
            const stripeBg = rowIndex % 2 === 1 ? 'bg-slate-50/60' : '';
            const emptyRow = `
                <tr class="border-transparent ${stripeBg}">
                    <td class="px-4 py-4 text-center"><div class="text-sm">&nbsp;</div></td>
                    <td class="px-4 py-4 text-center"><div class="text-sm">&nbsp;</div></td>
                    <td class="px-6 py-4 text-left"><div class="text-sm">&nbsp;</div></td>
                    <td class="px-6 py-4 text-left"><div class="text-sm">&nbsp;</div></td>
                    <td class="px-4 py-4 text-center"><div class="text-sm">&nbsp;</div></td>
                    <td class="px-4 py-4 text-center"><div class="text-sm">&nbsp;</div></td>
                    <td class="px-4 py-4 text-center"><div class="text-sm">&nbsp;</div></td>
                    <td class="px-4 py-4 text-center"><div class="text-sm">&nbsp;</div></td>
                </tr>
            `;
            tableBody.innerHTML += emptyRow;
        }
    }

    renderPaginationControls('user-pagination-container', totalItems, window.userPaginationState, 'onUserPageChange');
}

window.positionActionDropdown = function (menu, btn) {
    if (!menu || !btn) return;
    menu.classList.remove('dropup');
    const btnRect = btn.getBoundingClientRect();
    const menuHeight = (menu.offsetHeight > 0) ? menu.offsetHeight : 240;
    const spaceBelow = window.innerHeight - btnRect.bottom;
    const spaceAbove = btnRect.top;

    if (spaceBelow < menuHeight + 16 && spaceAbove > spaceBelow) {
        menu.classList.add('dropup');
    } else {
        menu.classList.remove('dropup');
    }
};

window.repositionActiveAdminDropdowns = function () {
    document.querySelectorAll('.action-dropdown-menu.show').forEach(menu => {
        const parent = menu.closest('.action-dropdown-container');
        const btn = parent ? parent.querySelector('.action-dots-btn') : null;
        if (btn) window.positionActionDropdown(menu, btn);
    });
    document.querySelectorAll('.teacher-dropdown-menu:not(.hidden)').forEach(menu => {
        const parent = menu.parentElement;
        const btn = parent ? parent.querySelector('button') : null;
        if (btn) window.positionActionDropdown(menu, btn);
    });
    document.querySelectorAll('.sy-action-dropdown:not(.hidden)').forEach(menu => {
        const parent = menu.closest('.sy-action-dropdown-container');
        const btn = parent ? parent.querySelector('.sy-dots-btn') : null;
        if (btn) window.positionActionDropdown(menu, btn);
    });
};

if (!window._adminDropdownScrollAttached) {
    window._adminDropdownScrollAttached = true;
    window.addEventListener('scroll', window.repositionActiveAdminDropdowns, { passive: true });
    window.addEventListener('resize', window.repositionActiveAdminDropdowns, { passive: true });
}

window.toggleUserActionDropdown = function (userId, event) {
    if (event) event.stopPropagation();

    const menuId = `action-menu-${userId}`;
    const btnId = `dots-btn-${userId}`;
    const menu = document.getElementById(menuId);
    const btn = document.getElementById(btnId);

    // Close all other menus first
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
            menu.classList.add('show');
            btn.classList.add('active');
            window.positionActionDropdown(menu, btn);
        } else {
            menu.classList.remove('show');
            menu.classList.remove('dropup');
            btn.classList.remove('active');
        }
    }
};

window.toggleSectionActionDropdown = function (index, event) {
    if (event) event.stopPropagation();
    const menuId = `section-action-menu-${index}`;
    const btnId = `section-dots-btn-${index}`;
    const menu = document.getElementById(menuId);
    const btn = document.getElementById(btnId);

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
            menu.classList.add('show');
            btn.classList.add('active');
            window.positionActionDropdown(menu, btn);
        } else {
            menu.classList.remove('show');
            menu.classList.remove('dropup');
            btn.classList.remove('active');
        }
    }
};

window.toggleSubjectActionDropdown = function (index, event) {
    if (event) event.stopPropagation();
    const menuId = `subject-action-menu-${index}`;
    const btnId = `subject-dots-btn-${index}`;
    const menu = document.getElementById(menuId);
    const btn = document.getElementById(btnId);

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
            menu.classList.add('show');
            btn.classList.add('active');
            window.positionActionDropdown(menu, btn);
        } else {
            menu.classList.remove('show');
            menu.classList.remove('dropup');
            btn.classList.remove('active');
        }
    }
};


window.switchPermissionsCategoryTab = function (categoryName) {
    const allCategories = ['authority', 'institutional', 'metrics', 'security', 'teacher-tools', 'student-tools'];
    allCategories.forEach(cat => {
        const btn = document.getElementById(`perm-tab-${cat}`);
        const panel = document.getElementById(`perm-panel-${cat}`);
        const icon = btn ? btn.querySelector('i') : null;
        const span = btn ? btn.querySelector('span') : null;
        const isActive = (cat === categoryName);
        if (btn) {
            btn.classList.toggle('active', isActive);
            if (isActive) {
                btn.style.setProperty('background-color', '#FFD000', 'important');
                btn.style.setProperty('color', '#ffffff', 'important');
                btn.style.setProperty('font-weight', '600', 'important');
                btn.classList.add('shadow-sm', 'text-white');
                btn.classList.remove('hover:bg-slate-100', 'text-slate-700', 'text-black');
                if (span) span.style.setProperty('color', '#ffffff', 'important');
                if (icon) icon.style.setProperty('color', '#ffffff', 'important');
            } else {
                btn.style.setProperty('background-color', 'transparent', 'important');
                btn.style.setProperty('color', '#000000', 'important');
                btn.style.setProperty('font-weight', '600', 'important');
                btn.classList.remove('shadow-sm', 'hover:bg-slate-100', 'text-slate-700', 'text-white');
                btn.classList.add('text-black');
                if (span) span.style.setProperty('color', '#000000', 'important');
                if (icon) icon.style.setProperty('color', '#000000', 'important');
            }
        }
        if (panel) {
            panel.classList.toggle('hidden', !isActive);
        }
    });
};

window.switchPermissionsRoleTab = function (roleName) {
    if (roleName === 'teacher') window.switchPermissionsCategoryTab('teacher-tools');
    else if (roleName === 'student') window.switchPermissionsCategoryTab('student-tools');
    else window.switchPermissionsCategoryTab('authority');
};

window.switchAdminSubTab = function (tabName) {
    window.switchPermissionsCategoryTab(tabName);
};

window.togglePermCategory = function (cat) {
    const mainToggle = document.getElementById(`perm-admin-${cat}-main`);
    const subContainer = document.getElementById(`perm-admin-${cat}-sub`);
    if (mainToggle && subContainer) {
        subContainer.classList.toggle('hidden', !mainToggle.checked);
    }
    window.trackPermissionChanges();
};

window.collectCurrentPermissionsState = function () {
    return {
        masterAdmin: document.getElementById('perm-role-master')?.checked ?? false,
        // Role Management Authority (Which roles this admin can edit permissions for)
        manageAdmins: document.getElementById('perm-manage-admins')?.checked ?? false,
        manageTeachers: document.getElementById('perm-manage-teachers')?.checked ?? false,
        manageStudents: document.getElementById('perm-manage-students')?.checked ?? false,
        // User Account Actions & Moderation
        actionPassword: document.getElementById('perm-action-password')?.checked ?? true,
        actionLock: document.getElementById('perm-action-lock')?.checked ?? true,
        actionDeactivate: document.getElementById('perm-action-deactivate')?.checked ?? false,
        actionDelete: document.getElementById('perm-action-delete')?.checked ?? false,
        actionDeleteComments: document.getElementById('perm-admin-delete-comments')?.checked ?? true,
        // Home Page Configuration Metrics (6 Pocket Cards)
        metricsMain: document.getElementById('perm-admin-metrics-main')?.checked ?? true,
        metricHealth: document.getElementById('perm-metric-health')?.checked ?? true,
        metricAi: document.getElementById('perm-metric-ai')?.checked ?? true,
        metricStorage: document.getElementById('perm-metric-storage')?.checked ?? true,
        metricSecurity: document.getElementById('perm-metric-security')?.checked ?? true,
        metricDatabase: document.getElementById('perm-metric-database')?.checked ?? true,
        metricGrading: document.getElementById('perm-metric-grading')?.checked ?? true,
        // School Management
        schoolMain: document.getElementById('perm-admin-school-main')?.checked ?? true,
        schoolProfile: document.getElementById('perm-school-profile')?.checked === true,
        
        // School Year Granular
        syAuthority: document.getElementById('perm-sy-authority')?.checked ?? true,
        syManage: document.getElementById('perm-sy-manage')?.checked ?? true,
        syCreateEdit: document.getElementById('perm-sy-create-edit')?.checked ?? true,
        syDelete: document.getElementById('perm-sy-delete')?.checked ?? false,

        schoolSections: document.getElementById('perm-school-sections')?.checked ?? true,
        schoolSectionsDelete: document.getElementById('perm-school-sections-delete')?.checked ?? false,

        // School Subject Granular
        subjectAuthority: document.getElementById('perm-subject-authority')?.checked ?? true,
        subjectManage: document.getElementById('perm-subject-manage')?.checked ?? true,
        subjectCreateEdit: document.getElementById('perm-subject-create-edit')?.checked ?? true,
        subjectDelete: document.getElementById('perm-subject-delete')?.checked ?? false,
        subjectPublish: document.getElementById('perm-subject-publish')?.checked ?? false,
        subjectUnpublish: document.getElementById('perm-subject-unpublish')?.checked ?? false,
        // Reports
        reportsMain: document.getElementById('perm-admin-reports-main')?.checked ?? true,
        reportsDescriptive: document.getElementById('perm-reports-descriptive')?.checked ?? true,
        reportsPredictive: document.getElementById('perm-reports-predictive')?.checked ?? true,
        reportsPrescriptive: document.getElementById('perm-reports-prescriptive')?.checked ?? true,
        // Resources
        resourcesMain: document.getElementById('perm-admin-resources-main')?.checked ?? true,
        resourcesMaterials: document.getElementById('perm-resources-materials')?.checked ?? true,
        resourcesStorage: document.getElementById('perm-resources-storage')?.checked ?? true,
        // Audit Logs
        auditMain: document.getElementById('perm-admin-audit-main')?.checked ?? true,
        auditAi: document.getElementById('perm-audit-ai')?.checked ?? true,
        auditActivity: document.getElementById('perm-audit-activity')?.checked ?? true,
        auditAuth: document.getElementById('perm-audit-auth')?.checked ?? true,
        // Settings
        settingsMain: document.getElementById('perm-admin-settings-main')?.checked ?? true,
        settingsBranding: document.getElementById('perm-settings-branding')?.checked ?? true,
        settingsApi: document.getElementById('perm-settings-api')?.checked ?? true,
        settingsSecurity: document.getElementById('perm-settings-security')?.checked ?? true,
        // Teacher
        teacherGrades: document.getElementById('perm-teacher-grades')?.checked ?? true,
        teacherAttendance: document.getElementById('perm-teacher-attendance')?.checked ?? true,
        teacherMaterials: document.getElementById('perm-teacher-materials')?.checked ?? true,
        teacherDeleteComments: document.getElementById('perm-teacher-delete-comments')?.checked ?? true,
        teacherAnnouncements: document.getElementById('perm-teacher-announcements')?.checked ?? true,
        // Student
        studentSubmissions: document.getElementById('perm-student-submissions')?.checked ?? true,
        studentGrades: document.getElementById('perm-student-grades')?.checked ?? true,
        studentBio: document.getElementById('perm-student-bio')?.checked ?? true,
        // System Access
        noticeMessage: document.getElementById('perm-notice-message')?.checked ?? false
    };
};

window.getLoggedInAdminUser = function () {
    let authUser = {};
    try {
        authUser = JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}');
    } catch {}
    const allUsers = getStoredJson(USER_STORAGE_KEY, []);
    const authId = String(authUser.uid || authUser.id || '');
    const authEmail = (authUser.email || '').toLowerCase();

    // 1. If explicit authenticated user found in DB:
    let loggedIn = (authId ? allUsers.find(u => String(u.uid || u.id) === authId) : null)
        || (authEmail ? allUsers.find(u => u.email && u.email.toLowerCase() === authEmail) : null);

    if (loggedIn) return loggedIn;

    // 2. If authUser in sessionStorage has an explicit role:
    if (authUser && (authUser.role || authUser.type)) {
        return authUser;
    }

    // 3. In Admin portal, default institutional logged-in user is Master Admin (Stanley Garcia - 0000000)
    const masterAdmin = allUsers.find(u => String(u.uid || u.id) === '0000000')
        || allUsers.find(u => normalizeUserRole(u.role || u.type) === 'Master Admin')
        || { id: '0000000', uid: '0000000', role: 'Master Admin', type: 'Master Admin', firstName: 'Stanley', lastName: 'Garcia' };

    return masterAdmin;
};

window.canCurrentAdminManageRole = function (targetRole) {
    const currentLoggedIn = window.getLoggedInAdminUser();
    const rawRole = String(currentLoggedIn.role || currentLoggedIn.type || '').toLowerCase();
    const isMaster = rawRole.includes('master') || rawRole.includes('super') || rawRole.includes('head');
    const normTarget = normalizeUserRole(targetRole);

    // Master Admin has full authority over all roles
    if (isMaster) return true;

    // Regular Admins can NEVER configure or edit a Master Admin
    if (normTarget === 'Master Admin') {
        return false;
    }

    const perms = currentLoggedIn.permissions || {};

    if (normTarget === 'Admin') {
        return perms.manageAdmins === true;
    }
    if (normTarget === 'Teacher') {
        return perms.manageTeachers !== false;
    }
    if (normTarget === 'Student') {
        return perms.manageStudents !== false;
    }

    return false;
};

window.canCurrentAdminDelete = function (feature) {
    const user = typeof window.getLoggedInAdminUser === 'function' ? window.getLoggedInAdminUser() : null;
    if (!user) {
        if (typeof window.isCurrentMasterAdmin === 'function' && window.isCurrentMasterAdmin()) return true;
        return false;
    }
    const role = typeof normalizeUserRole === 'function' ? normalizeUserRole(user.role || user.type) : (user.role || user.type || 'Admin');
    const isMaster = role === 'Master Admin' || String(user.uid || user.id) === '0000000' || !!user.isMaster;
    if (isMaster) return true;

    const perms = user.permissions || {};
    if (feature === 'subject' || feature === 'schoolSubjects') return perms.subjectDelete === true;
    if (feature === 'section' || feature === 'schoolSections') return perms.schoolSectionsDelete === true || perms.sectionDelete === true;
    if (feature === 'topic' || feature === 'schoolTopics') return perms.topicDelete === true || perms.subjectDelete === true;
    if (feature === 'material' || feature === 'schoolMaterials') return perms.materialDelete === true || perms.subjectDelete === true;
    if (feature === 'schoolYear' || feature === 'sy') return perms.syDelete === true;
    if (feature === 'user' || feature === 'users') return perms.userDelete === true || perms.usersDelete === true;
    return false;
};

window.canCurrentAdminPublishSubject = function () {
    const user = typeof window.getLoggedInAdminUser === 'function' ? window.getLoggedInAdminUser() : null;
    if (!user) return false;
    const role = typeof normalizeUserRole === 'function' ? normalizeUserRole(user.role || user.type) : 'Admin';
    const isMaster = role === 'Master Admin' || String(user.uid || user.id) === '0000000' || !!user.isMaster;
    if (isMaster) return true;
    const perms = user.permissions || {};
    return perms.subjectPublish === true;
};

window.canCurrentAdminUnpublishSubject = function () {
    const user = typeof window.getLoggedInAdminUser === 'function' ? window.getLoggedInAdminUser() : null;
    if (!user) return false;
    const role = typeof normalizeUserRole === 'function' ? normalizeUserRole(user.role || user.type) : 'Admin';
    const isMaster = role === 'Master Admin' || String(user.uid || user.id) === '0000000' || !!user.isMaster;
    if (isMaster) return true;
    const perms = user.permissions || {};
    return perms.subjectUnpublish === true;
};

window.editUserPermissions = function (userId) {
    window.currentEditingUserId = userId;
    window.permissionsChanged = false;

    const users = getStoredJson(USER_STORAGE_KEY, []);
    const user = users.find(u => String(u.uid || u.id || '') === String(userId));
    if (!user) {
        console.error('User not found for permissions edit:', userId);
        return;
    }

    const currentLoggedIn = window.getLoggedInAdminUser();
    const targetRole = normalizeUserRole(user.role || user.type);
    const isTargetAdmin = targetRole === 'Admin' || targetRole === 'Master Admin';
    const isTargetTeacher = targetRole === 'Teacher';
    const isTargetStudent = targetRole === 'Student';

    // Authority Enforcement
    if (!window.canCurrentAdminManageRole(targetRole)) {
        window.showUserConfirm('Access Denied', `You do not have permission to modify ${targetRole} permissions.`, null, true);
        return;
    }

    const loggedInRoleStr = String(currentLoggedIn.role || currentLoggedIn.type || 'Master Admin').toLowerCase();
    const isMaster = loggedInRoleStr.includes('master') || loggedInRoleStr.includes('super') || loggedInRoleStr.includes('head');
    const callerPerms = currentLoggedIn.permissions || {};

    const canManageAdmins = isMaster || (callerPerms.manageAdmins === true);
    const canManageTeachers = isMaster || (callerPerms.manageTeachers !== false);
    const canManageStudents = isMaster || (callerPerms.manageStudents !== false);

    // Show role-specific category navigation in the left sidebar
    const adminNav = document.getElementById('perm-nav-admin');
    const teacherNav = document.getElementById('perm-nav-teacher');
    const studentNav = document.getElementById('perm-nav-student');

    if (isTargetTeacher) {
        adminNav?.classList.add('hidden');
        teacherNav?.classList.remove('hidden');
        studentNav?.classList.add('hidden');
        window.switchPermissionsCategoryTab('teacher-tools');
    } else if (isTargetStudent) {
        adminNav?.classList.add('hidden');
        teacherNav?.classList.add('hidden');
        studentNav?.classList.remove('hidden');
        window.switchPermissionsCategoryTab('student-tools');
    } else {
        adminNav?.classList.remove('hidden');
        teacherNav?.classList.add('hidden');
        studentNav?.classList.add('hidden');
        window.switchPermissionsCategoryTab('authority');
    }

    // Header Title
    const header = document.getElementById('user-permissions-header');
    if (header) {
        header.innerText = isTargetAdmin ? 'Edit Roles and Permissions' : 'Edit Permissions';
    }

    // Apply Permissions (default to true if new/undefined)
    const perms = user.permissions || {};
    const getVal = (k, defaultVal = true) => perms[k] !== undefined ? !!perms[k] : defaultVal;

    // Admin Role Section (Only Master Admin can see and configure Role Authority)
    const roleSection = document.getElementById('perm-role-section');
    const masterToggle = document.getElementById('perm-role-master');
    const isTargetMaster = targetRole === 'Master Admin';

    if (roleSection && masterToggle) {
        // Section 1 (Master Admin Elevation + Permitted Role Modifications) is only visible if target is Admin AND viewer is Master Admin
        const showRoleSection = isTargetAdmin && isMaster;
        roleSection.classList.toggle('hidden', !showRoleSection);
        masterToggle.checked = isTargetMaster;

        // Lock Logic: If target is the last remaining Master Admin, it cannot be revoked/toggled off
        const totalMasterAdmins = users.filter(u => normalizeUserRole(u.role) === 'Master Admin').length;
        const isLastMaster = isTargetMaster && totalMasterAdmins <= 1;
        const isDisabled = !isMaster || isLastMaster;

        masterToggle.disabled = isDisabled;
        const lockIcon = document.getElementById('perm-role-master-lock');
        if (lockIcon) lockIcon.classList.toggle('hidden', !isDisabled);

        const descEl = document.getElementById('perm-role-master-desc');
        if (descEl) {
            if (isLastMaster) {
                descEl.textContent = "Last remaining Master Admin. Role cannot be revoked.";
                descEl.classList.add('text-red-500');
            } else {
                descEl.textContent = "Full system access with the ability to manage other administrative accounts.";
                descEl.classList.remove('text-red-500');
            }
        }
    }

    // Permitted Role Management Toggles (Default: manageAdmins is false for regular admins)
    const manageAdminsEl = document.getElementById('perm-manage-admins');
    const manageTeachersEl = document.getElementById('perm-manage-teachers');
    const manageStudentsEl = document.getElementById('perm-manage-students');

    if (manageAdminsEl) {
        manageAdminsEl.checked = isTargetMaster ? true : (perms.manageAdmins === true);
        manageAdminsEl.disabled = false;
    }
    if (manageTeachersEl) {
        manageTeachersEl.checked = isTargetMaster ? true : (perms.manageTeachers !== false);
        manageTeachersEl.disabled = false;
    }
    if (manageStudentsEl) {
        manageStudentsEl.checked = isTargetMaster ? true : (perms.manageStudents !== false);
        manageStudentsEl.disabled = false;
    }

    // Set Admin Toggles
    const setCheck = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.checked = !!val;
    };

    setCheck('perm-admin-metrics-main', getVal('metricsMain', true));
    setCheck('perm-metric-health', getVal('metricHealth', true));
    setCheck('perm-metric-ai', getVal('metricAi', true));
    setCheck('perm-metric-storage', getVal('metricStorage', true));
    setCheck('perm-metric-security', getVal('metricSecurity', true));
    setCheck('perm-metric-database', getVal('metricDatabase', true));
    setCheck('perm-metric-grading', getVal('metricGrading', true));
    window.togglePermCategory('metrics');

    setCheck('perm-admin-school-main', getVal('schoolMain', true));

    // School Profile: Default is false for regular admins, only true if target is Master Admin or explicitly granted
    const permSchoolProfileVal = isTargetMaster ? true : (perms.schoolProfile === true);
    setCheck('perm-school-profile', permSchoolProfileVal);

    const permSchoolProfileEl = document.getElementById('perm-school-profile');
    const permSchoolProfileLock = document.getElementById('perm-school-profile-lock');
    if (permSchoolProfileEl) {
        // Only Master Admin can modify / permit School Profile
        permSchoolProfileEl.disabled = !isMaster;
        permSchoolProfileEl.classList.toggle('cursor-not-allowed', !isMaster);
        permSchoolProfileEl.classList.toggle('opacity-60', !isMaster);
        permSchoolProfileEl.title = isMaster ? 'Permit access to School Profile & Info' : 'Only Master Admin can permit School Profile access';
    }
    if (permSchoolProfileLock) {
        permSchoolProfileLock.classList.toggle('hidden', isMaster);
    }

    // School Year Granular
    setCheck('perm-sy-authority', getVal('syAuthority', getVal('schoolYear', true)));
    setCheck('perm-sy-manage', getVal('syManage', getVal('schoolYear', true)));
    setCheck('perm-sy-create-edit', getVal('syCreateEdit', getVal('schoolYear', true)));
    setCheck('perm-sy-delete', getVal('syDelete', isTargetMaster ? true : false));

    setCheck('perm-school-sections', getVal('schoolSections', true));
    setCheck('perm-school-sections-delete', getVal('schoolSectionsDelete', isTargetMaster ? true : false));

    // School Subjects Granular
    setCheck('perm-subject-authority', getVal('subjectAuthority', getVal('schoolSubjects', true)));
    setCheck('perm-subject-manage', getVal('subjectManage', getVal('schoolSubjects', true)));
    setCheck('perm-subject-create-edit', getVal('subjectCreateEdit', getVal('schoolSubjects', true)));
    setCheck('perm-subject-delete', getVal('subjectDelete', isTargetMaster ? true : false));
    setCheck('perm-subject-publish', getVal('subjectPublish', isTargetMaster ? true : false));
    setCheck('perm-subject-unpublish', getVal('subjectUnpublish', isTargetMaster ? true : false));

    window.togglePermCategory('school');

    setCheck('perm-admin-reports-main', getVal('reportsMain', true));
    setCheck('perm-reports-descriptive', getVal('reportsDescriptive', true));
    setCheck('perm-reports-predictive', getVal('reportsPredictive', true));
    setCheck('perm-reports-prescriptive', getVal('reportsPrescriptive', true));
    window.togglePermCategory('reports');

    setCheck('perm-admin-resources-main', getVal('resourcesMain', true));
    setCheck('perm-resources-materials', getVal('resourcesMaterials', true));
    setCheck('perm-resources-storage', getVal('resourcesStorage', true));
    window.togglePermCategory('resources');

    setCheck('perm-admin-audit-main', getVal('auditMain', true));
    setCheck('perm-audit-ai', getVal('auditAi', true));
    setCheck('perm-audit-activity', getVal('auditActivity', true));
    setCheck('perm-audit-auth', getVal('auditAuth', true));
    window.togglePermCategory('audit');

    setCheck('perm-admin-settings-main', getVal('settingsMain', true));
    setCheck('perm-settings-branding', getVal('settingsBranding', true));
    setCheck('perm-settings-api', getVal('settingsApi', true));
    setCheck('perm-settings-security', getVal('settingsSecurity', true));
    window.togglePermCategory('settings');

    // Set User Account Moderation Actions Toggles
    setCheck('perm-action-password', getVal('actionPassword', true));
    setCheck('perm-action-lock', getVal('actionLock', true));
    setCheck('perm-action-deactivate', getVal('actionDeactivate', isTargetMaster ? true : false));
    setCheck('perm-action-delete', getVal('actionDelete', isTargetMaster ? true : false));
    setCheck('perm-admin-delete-comments', getVal('actionDeleteComments', isTargetMaster ? true : false));
    if (isTargetTeacher) {
        window.switchPermissionsCategoryTab('teacher-tools');
    } else if (isTargetStudent) {
        window.switchPermissionsCategoryTab('student-tools');
    } else {
        window.switchPermissionsCategoryTab('authority');
    }

    // Teacher Toggles
    setCheck('perm-teacher-grades', getVal('teacherGrades', true));
    setCheck('perm-teacher-attendance', getVal('teacherAttendance', true));
    setCheck('perm-teacher-materials', getVal('teacherMaterials', true));
    setCheck('perm-teacher-delete-comments', getVal('teacherDeleteComments', true));
    setCheck('perm-teacher-announcements', getVal('teacherAnnouncements', true));

    // Student Toggles
    setCheck('perm-student-submissions', getVal('studentSubmissions', true));
    setCheck('perm-student-grades', getVal('studentGrades', true));
    setCheck('perm-student-bio', getVal('studentBio', true));

    // System Access — Notice Message permission (always false by default for regular admins)
    const noticeMessageEl = document.getElementById('perm-notice-message');
    if (noticeMessageEl) {
        noticeMessageEl.checked = isTargetMaster ? true : (getVal('noticeMessage', false) === true);
        // Only Master Admin can grant this permission
        noticeMessageEl.disabled = !isMaster;
        noticeMessageEl.classList.toggle('cursor-not-allowed', !isMaster);
        noticeMessageEl.classList.toggle('opacity-50', !isMaster);
    }

    // Snapshot initial state
    window.initialPermissions = window.collectCurrentPermissionsState();

    window.permissionsChanged = false;

    const saveBtn = document.getElementById('save-permissions-btn');
    if (saveBtn) saveBtn.disabled = true;

    // Show standardized modal overlay
    const overlay = document.getElementById('user-permissions-overlay');
    if (overlay) {
        overlay.classList.remove('hidden');
        document.documentElement.classList.add('sigma-modal-open');
        document.body.classList.add('sigma-modal-open');
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
    }
};

window.handleMasterAdminToggle = function (checkbox) {
    const isPromoting = checkbox.checked;
    const users = getStoredJson(USER_STORAGE_KEY, []);
    const totalMasterAdmins = users.filter(u => normalizeUserRole(u.role) === 'Master Admin').length;

    if (!isPromoting && totalMasterAdmins <= 1) {
        window.showUserConfirm('Action Denied', 'There must be at least one Master Admin in the system. Role revocation denied.', null, true);
        checkbox.checked = true;
        return;
    }

    const title = isPromoting ? 'Master Admin Elevation' : 'Master Admin Revocation';
    const desc = isPromoting
        ? 'Do you want to promote this account to Master Admin?'
        : 'Do you want to demote this account back to a regular Admin?';

    window.showUserConfirm(
        title,
        desc,
        () => {
            checkbox.checked = isPromoting;
            if (isPromoting) {
                const manageAdminsEl = document.getElementById('perm-manage-admins');
                const manageTeachersEl = document.getElementById('perm-manage-teachers');
                const manageStudentsEl = document.getElementById('perm-manage-students');
                if (manageAdminsEl) manageAdminsEl.checked = true;
                if (manageTeachersEl) manageTeachersEl.checked = true;
                if (manageStudentsEl) manageStudentsEl.checked = true;
            }
            window.trackPermissionChanges();
        },
        false,
        () => {
            checkbox.checked = !isPromoting;
            window.trackPermissionChanges();
        }
    );
};

window.trackPermissionChanges = function () {
    const current = window.collectCurrentPermissionsState();
    const hasChanged = JSON.stringify(current) !== JSON.stringify(window.initialPermissions);
    window.permissionsChanged = hasChanged;

    const saveBtn = document.getElementById('save-permissions-btn');
    if (saveBtn) saveBtn.disabled = !hasChanged;
};

window.handlePermissionsExit = function () {
    const closeOverlay = () => {
        window.permissionsChanged = false;
        document.getElementById('user-permissions-overlay')?.classList.add('hidden');
        document.documentElement.classList.remove('sigma-modal-open');
        document.body.classList.remove('sigma-modal-open');
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
    };

    if (window.permissionsChanged) {
        window.showUserConfirm(
            'Discard Changes',
            'You have unsaved permission changes. Are you sure you want to discard them?',
            closeOverlay
        );
    } else {
        closeOverlay();
    }
};

window.saveUserPermissions = function () {
    const userId = window.currentViewingUserId || window.currentEditingUserId;
    if (!userId) return;

    const users = getStoredJson(USER_STORAGE_KEY, []);
    const userIndex = users.findIndex(u => String(u.uid || u.id || '') === String(userId));
    if (userIndex === -1) return;

    const loading = document.getElementById('save-permissions-loading');
    const label = document.getElementById('save-permissions-label');
    const saveBtn = document.getElementById('save-permissions-btn');

    if (loading) loading.classList.remove('hidden');
    if (label) label.classList.add('hidden');
    if (saveBtn) saveBtn.disabled = true;

    setTimeout(() => {
        const currentLoggedIn = typeof window.getLoggedInAdminUser === 'function' ? window.getLoggedInAdminUser() : {};
        const loggedInRoleStr = String(currentLoggedIn.role || currentLoggedIn.type || 'Master Admin').toLowerCase();
        const isEditorMaster = loggedInRoleStr.includes('master') || loggedInRoleStr.includes('super') || loggedInRoleStr.includes('head') || String(currentLoggedIn.uid || currentLoggedIn.id || '') === '0000000';

        const perms = window.collectCurrentPermissionsState();
        if (!isEditorMaster) {
            // Non-master admins CANNOT grant or toggle School Profile permissions
            perms.schoolProfile = users[userIndex].permissions?.schoolProfile === true;
        }

        users[userIndex].permissions = perms;

        const masterToggle = document.getElementById('perm-role-master');
        if (masterToggle && !masterToggle.disabled) {
            const newRole = masterToggle.checked ? 'Master Admin' : 'Admin';
            users[userIndex].role = newRole;
            users[userIndex].type = newRole;
        }

        saveStoredJson(USER_STORAGE_KEY, users);

        // Update auth user in sessionStorage if editing self
        const authUser = JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}');
        if (String(authUser.uid || authUser.id || '') === String(userId)) {
            const updatedAuth = { ...authUser, ...users[userIndex] };
            sessionStorage.setItem('sigma-authenticated-user', JSON.stringify(updatedAuth));
        }

        window.permissionsChanged = false;
        window.initialPermissions = { ...perms };

        if (loading) loading.classList.add('hidden');
        if (label) label.classList.remove('hidden');

        document.getElementById('user-permissions-overlay')?.classList.add('hidden');
        document.documentElement.classList.remove('sigma-modal-open');
        document.body.classList.remove('sigma-modal-open');
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';

        if (typeof renderUserAccountsTable === 'function') renderUserAccountsTable();
        if (typeof window.populateUserProfilePage === 'function') window.populateUserProfilePage();
        if (typeof window.renderAdminPocketCards === 'function') window.renderAdminPocketCards();
        if (typeof window.applyCurrentAdminPermissions === 'function') window.applyCurrentAdminPermissions();

        window.showUserConfirm('Success', 'Permissions updated successfully.', null, true);
    }, 400);
};

window.toggleProfileSettingsMenu = function (event, forceClose = false) {
    if (event) event.stopPropagation();
    const menu = document.getElementById('profile-settings-menu');
    const btn = document.getElementById('profile-settings-btn');
    if (!menu) return;

    if (forceClose) {
        menu.classList.add('hidden');
        if (btn) btn.classList.remove('active');
        return;
    }

    const isHidden = menu.classList.contains('hidden');
    menu.classList.toggle('hidden', !isHidden);
    if (btn) btn.classList.toggle('active', !isHidden);
};

window.showDeleteAccountModal1 = function () {
    const modal = document.getElementById('delete-account-modal-1');
    if (modal) modal.classList.remove('hidden');
};

window.showDeleteAccountModal2 = function () {
    document.getElementById('delete-account-modal-1').classList.add('hidden');
    const modal = document.getElementById('delete-account-modal-2');
    if (modal) {
        modal.classList.remove('hidden');
        const input = document.getElementById('delete-account-input');
        const btn = document.getElementById('final-delete-btn');
        if (input) {
            input.value = '';
            input.focus();
        }
        if (btn) btn.disabled = true;
    }
};

window.executeDeleteAccount = function () {
    const input = document.getElementById('delete-account-input');
    const userId = String(window.currentViewingUserId || window.currentEditingUserId || '').replace(/^#/, '').trim();
    if (!input || !userId) return;

    if (input.value.trim().toUpperCase() !== 'DELETE') {
        alert('Please type DELETE to confirm');
        return;
    }

    const allKeys = ['sigma-admin-users', 'sigma-teacher-users', 'sigma-student-users', 'sigma-users-list', USER_STORAGE_KEY];
    allKeys.forEach(k => {
        const list = getStoredJson(k, []);
        if (Array.isArray(list)) {
            const filtered = list.filter(u => String(u.uid || u.id || '').replace(/^#/, '').trim() !== userId);
            localStorage.setItem(k, JSON.stringify(filtered));
        }
    });

    try {
        localStorage.removeItem(`sigma_user_avatar_${userId}`);
        localStorage.removeItem(`sigma_user_photos_${userId}`);
        localStorage.removeItem(`sigma-profile-custom-${userId}`);
    } catch (e) {}

    // Hide modals
    const modal2 = document.getElementById('delete-account-modal-2');
    if (modal2) modal2.classList.add('hidden');
    const modal1 = document.getElementById('delete-account-modal-1');
    if (modal1) modal1.classList.add('hidden');

    // Clean URL hash so browser is never stuck on deleted profile
    if (window.history && window.history.replaceState) {
        window.history.replaceState({ tab: 'nav-users-accounts' }, '', '#users');
    } else {
        window.location.hash = '#users';
    }

    // Exit profile view directly back to User Accounts
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
        window.showToastNotification('User account has been permanently deleted.', 'success');
    }
};

window.toggleUserLock = function (userId) {
    if (!userId) return;

    // Close any open dropdown menus and settings popovers
    document.querySelectorAll('.action-dropdown-menu').forEach(m => m.classList.remove('show'));
    const profileMenu = document.getElementById('profile-settings-menu');
    if (profileMenu) profileMenu.classList.add('hidden');
    const profileBtn = document.getElementById('profile-settings-btn');
    if (profileBtn) profileBtn.classList.remove('active');

    const users = getStoredJson(USER_STORAGE_KEY, []);
    const userIdx = users.findIndex(u => String(u.uid || u.id || '') === String(userId));

    if (userIdx !== -1) {
        const user = users[userIdx];
        const currentStatus = (user.status || 'Active').toLowerCase();

        // Hierarchy rule: When account is deactivated, it cannot be locked nor unlocked
        if (currentStatus === 'inactive' || currentStatus === 'deactivated') {
            if (typeof window.showSigmaDialog === 'function') {
                window.showSigmaDialog({
                    title: 'Action Prohibited',
                    desc: 'This account is currently deactivated. A deactivated account cannot be locked or unlocked until it is reactivated.',
                    icon: 'fa-solid fa-ban text-red-500',
                    confirmText: 'OK',
                    isNotification: true
                });
            } else if (typeof window.showUserConfirm === 'function') {
                window.showUserConfirm('Action Prohibited', 'This account is currently deactivated. A deactivated account cannot be locked or unlocked until it is reactivated.', null, true);
            }
            return;
        }

        const isLocking = currentStatus !== 'locked';
        const newStatus = isLocking ? 'Locked' : 'Active';
        const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'this user';

        const title = isLocking ? 'Lock Account' : 'Unlock Account';
        const desc = isLocking
            ? `Are you sure you want to lock the account for ${userName}? The user will be unable to log in until unlocked.`
            : `Are you sure you want to unlock the account for ${userName}? The user will regain normal access to log in.`;

        const executeToggle = () => {
            users[userIdx].status = newStatus;
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(users));
            localStorage.setItem('sigma-users-list', JSON.stringify(users));

            // Update local state if currently viewing this user
            if (window.currentUserProfileData && String(window.currentUserProfileData.id) === String(userId)) {
                window.currentUserProfileData.status = newStatus;
            }

            // Refresh UI
            window.populateUserProfilePage();
            if (typeof renderUserAccountsTable === 'function') renderUserAccountsTable();

            // Custom Notification Dialog
            const successTitle = isLocking ? 'Account Locked' : 'Account Unlocked';
            const successMsg = isLocking
                ? `Account for ${userName} has been successfully locked.`
                : `Account for ${userName} has been successfully unlocked.`;

            if (typeof window.showSigmaDialog === 'function') {
                window.showSigmaDialog({
                    title: successTitle,
                    desc: successMsg,
                    icon: isLocking ? 'fa-solid fa-lock text-amber-500' : 'fa-solid fa-lock-open text-[#15803d]',
                    confirmText: 'OK',
                    isNotification: true
                });
            } else if (typeof window.showUserConfirm === 'function') {
                window.showUserConfirm(successTitle, successMsg, null, true);
            }
        };

        if (typeof window.showSigmaDialog === 'function') {
            window.showSigmaDialog({
                title: title,
                desc: desc,
                icon: isLocking ? 'fa-solid fa-lock text-amber-500' : 'fa-solid fa-lock-open text-[#15803d]',
                confirmText: isLocking ? 'Lock Account' : 'Unlock Account',
                cancelText: 'Cancel',
                isDanger: false,
                onConfirm: executeToggle
            });
        } else if (typeof window.showUserConfirm === 'function') {
            window.showUserConfirm(title, desc, executeToggle);
        } else {
            executeToggle();
        }
    }
};

// Global click listener to close action dropdowns
document.addEventListener('click', (e) => {
    if (!e.target.closest('.action-dropdown-container')) {
        document.querySelectorAll('.action-dropdown-menu').forEach(m => {
            m.classList.remove('show');
            m.classList.remove('dropup');
        });
        document.querySelectorAll('.action-dots-btn').forEach(b => b.classList.remove('active'));
    }
    // Close profile settings menu
    if (!e.target.closest('#profile-settings-btn') && !e.target.closest('#profile-settings-menu')) {
        window.toggleProfileSettingsMenu(null, true);
    }
});

function getFilteredUsersBySearch(searchState) {
    const users = getStoredJson(USER_STORAGE_KEY, []);
    const query = String(searchState?.query || '').trim().toLowerCase();
    const idQuery = String(searchState?.id || '').trim().toLowerCase();
    const nameQuery = String(searchState?.name || '').trim().toLowerCase();
    const roleQuery = String(searchState?.role || '').trim().toLowerCase();
    const statusQuery = String(searchState?.status || '').trim().toLowerCase();

    // Get current authenticated user ID to exclude
    let authUser = {};
    try {
        authUser = JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}');
    } catch (e) {}
    const authUserId = String(authUser.uid || authUser.id || '');

    const filtered = users.filter(user => {
        const id = String(user.uid || user.id || '').trim();
        const idLower = id.toLowerCase();

        const firstName = String(user.firstName || '').trim();
        const lastName = String(user.lastName || '').trim();
        const middleName = String(user.middleName || '').trim();
        const fnameLower = firstName.toLowerCase();
        const lnameLower = lastName.toLowerCase();
        const mnameLower = middleName.toLowerCase();
        const fullName = [fnameLower, mnameLower, lnameLower].filter(Boolean).join(' ');
        const nameWords = [fnameLower, lnameLower, mnameLower, ...fullName.split(/\s+/)].filter(Boolean);
        const normalizedRole = normalizeUserRole(user.type || user.role || '').toLowerCase();
        const userStatus = String(user.status || 'Active').toLowerCase();

        let matchesSearch = true;
        const searchTarget = query || idQuery || nameQuery;
        if (searchTarget) {
            matchesSearch = idLower.includes(searchTarget)
                || fnameLower.includes(searchTarget)
                || lnameLower.includes(searchTarget)
                || fullName.includes(searchTarget)
                || nameWords.some(w => w.startsWith(searchTarget));
        }

        let matchesRole = true;
        if (roleQuery && roleQuery !== 'all users' && roleQuery !== 'all' && roleQuery !== 'all roles') {
            if (roleQuery === 'admin') {
                matchesRole = normalizedRole === 'admin' || normalizedRole === 'master admin' || normalizedRole.includes('admin');
            } else if (roleQuery === 'master admin' || roleQuery === 'master') {
                matchesRole = normalizedRole === 'master admin' || String(user.role || '').toLowerCase().includes('master');
            } else {
                matchesRole = normalizedRole === roleQuery;
            }
        }
        const matchesStatus = !statusQuery || userStatus === statusQuery;

        return matchesSearch && matchesRole && matchesStatus;
    });

    // REVERSE STACK: Strictly by date and time created (newest at top, oldest at bottom)
    return filtered.sort((a, b) => {
        const isMasterA = String(a.uid || a.id) === '0000000' || String(a.role || a.type || '').toLowerCase().includes('master');
        const isMasterB = String(b.uid || b.id) === '0000000' || String(b.role || b.type || '').toLowerCase().includes('master');
        if (isMasterA) return 1;
        if (isMasterB) return -1;

        // 1. Strictly by Date and Time Created: Newest date & time is ALWAYS at the top, oldest at the bottom
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (timeA !== timeB) {
            return timeB - timeA;
        }

        // 2. Fallback if timestamps are identical: seq descending
        const seqA = a.seq !== undefined && a.seq !== null ? Number(a.seq) : -1;
        const seqB = b.seq !== undefined && b.seq !== null ? Number(b.seq) : -1;
        if (seqA !== -1 && seqB !== -1 && seqA !== seqB) {
            return seqB - seqA;
        }

        return 0;
    });
}

window.userAccountSearchState = window.userAccountSearchState || {
    query: '',
    id: '',
    name: '',
    role: '',
    status: '',
    hasSearched: false
};

window.applyUserAccountSearch = function (isFromButton = false) {
    const statusRadio = document.querySelector('input[name="user-status-filter"]:checked');
    const roleVal = document.getElementById('user-search-role')?.value || '';
    const roleClean = (roleVal && roleVal !== 'All Users' && roleVal !== 'all' && roleVal !== 'All Roles' && roleVal !== 'All') ? normalizeUserRole(roleVal) : '';
    const rawQuery = String(document.getElementById('user-search-query')?.value || '').trim();
    const queryVal = rawQuery.replace(/[^a-zA-Z0-9\s.\-']/g, '').slice(0, 50);

    window.userAccountSearchState = {
        query: queryVal,
        id: queryVal || String(document.getElementById('user-search-id')?.value || '').trim(),
        name: queryVal || String(document.getElementById('user-search-name')?.value || '').trim(),
        role: roleClean,
        status: statusRadio ? statusRadio.value : '',
        hasSearched: true
    };
    window.userPaginationState.currentPage = 1;
    renderUserAccountsTable();

    if (isFromButton) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

window.toggleUserFilterDropdown = function (event) {
    if (event) event.stopPropagation();
    const dropdown = document.getElementById('user-filter-dropdown');
    if (!dropdown) return;

    const isShowing = !dropdown.classList.contains('hidden');
    dropdown.classList.toggle('hidden', isShowing);
};

window.resetUserFilters = function () {
    const queryInput = document.getElementById('user-search-query');
    const idInput = document.getElementById('user-search-id');
    const nameInput = document.getElementById('user-search-name');
    const roleSelect = document.getElementById('user-search-role');
    const statusRadios = document.querySelectorAll('input[name="user-status-filter"]');

    if (queryInput) queryInput.value = '';
    if (idInput) idInput.value = '';
    if (nameInput) nameInput.value = '';
    if (roleSelect) roleSelect.value = '';
    if (statusRadios.length > 0) statusRadios[0].checked = true;

    window.applyUserAccountSearch(true);
};

// Close dropdown when clicking outside or scrolling
document.addEventListener('click', (e) => {
    document.querySelectorAll('.sigma-filter-dropdown:not(.hidden)').forEach(dropdown => {
        const toggleBtn = dropdown.parentElement ? dropdown.parentElement.querySelector('button') : null;
        if (!dropdown.contains(e.target) && (!toggleBtn || !toggleBtn.contains(e.target))) {
            dropdown.classList.add('hidden');
        }
    });
});

window.addEventListener('scroll', () => {
    document.querySelectorAll('.sigma-filter-dropdown:not(.hidden)').forEach(dropdown => {
        dropdown.classList.add('hidden');
    });
}, { passive: true });

function bindUserAccountSearch() {
    const idInput = document.getElementById('user-search-id');
    const nameInput = document.getElementById('user-search-name');
    const queryInput = document.getElementById('user-search-query');

    [idInput, nameInput, queryInput].forEach((input) => {
        if (!input || input.dataset.searchBound === 'true') return;
        input.dataset.searchBound = 'true';

        // Trigger search strictly on Enter key
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                window.applyUserAccountSearch(true);
            }
        });
    });
}

window.rolesPermissionSearchState = window.rolesPermissionSearchState || {
    id: '',
    name: '',
    role: ''
};

function renderRolesPermissionsTable() {
    const tableBody = document.getElementById('rolesPermissionTableBody');
    if (!tableBody) return;

    const idQuery = String(window.rolesPermissionSearchState?.id || '').trim().toLowerCase();
    const nameQuery = String(window.rolesPermissionSearchState?.name || '').trim().toLowerCase();
    const roleQuery = String(window.rolesPermissionSearchState?.role || '').trim().toLowerCase();
    const displayUsers = getFilteredUsersBySearch({ id: idQuery, name: nameQuery, role: roleQuery });
    const hasActiveFilters = Boolean(idQuery || nameQuery || roleQuery);

    if (!hasActiveFilters) {
        tableBody.innerHTML = `
            <tr id="roles-empty-state" class="bg-white">
                <td colspan="6" class="py-32 text-center">
                    <div class="flex flex-col items-center justify-center space-y-4">
                        <i class="fa-solid fa-user-shield text-5xl text-black-fade"></i>
                        <p class="text-sm font-bold text-black font-['Inter']">Search to Reveal Roles</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    if (displayUsers.length === 0) {
        tableBody.innerHTML = `
            <tr id="roles-empty-state" class="bg-white">
                <td colspan="6" class="py-32 text-center">
                    <div class="flex flex-col items-center justify-center space-y-4">
                        <i class="fa-solid fa-user-shield text-5xl text-black-fade"></i>
                        <p class="text-sm font-bold text-black font-['Inter']">No Matching Roles Found</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = displayUsers.map(user => {
        const fullName = user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim();
        const firstName = user.firstName || fullName.split(' ').filter(Boolean)[0] || 'N/A';
        const lastName = user.lastName || fullName.split(' ').filter(Boolean).slice(1).join(' ') || 'N/A';
        const role = normalizeUserRole(user.type || user.role || 'Student');
        const id = user.uid || user.id || 'N/A';
        const status = user.status || 'Active';

        const statusClass = status.toLowerCase() === 'active'
            ? 'text-[#15803d]'
            : 'text-slate-400';

        return `
            <tr class="group hover:bg-slate-50 transition-colors">
                <td class="px-8 py-6 text-center">
                    <div class="text-sm font-medium text-black text-center tracking-wide">${id}</div>
                </td>
                <td class="px-8 py-6 text-center">
                    <div class="text-sm font-medium text-black text-center tracking-tight">${escapeHtml(firstName)}</div>
                </td>
                <td class="px-8 py-6 text-center">
                    <div class="text-sm font-medium text-black text-center tracking-tight">${escapeHtml(lastName)}</div>
                </td>
                <td class="px-8 py-6 text-center">
                    <div class="text-sm font-medium text-black text-center">${escapeHtml(role)}</div>
                </td>
                <td class="px-8 py-6 text-center">
                    <div class="text-sm font-medium ${statusClass} text-center">${escapeHtml(status)}</div>
                </td>
                <td class="px-8 py-6 text-center">
                    <button onclick="editUserPermissions('${id}')" class="inline-flex items-center justify-center w-10 h-10 rounded-full text-black hover:text-[#FFD000] transition-colors" title="Edit Permissions" aria-label="Edit Permissions">
                        <i class="fa-solid fa-user-shield text-base"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

window.applyRolesPermissionSearch = function () {
    window.rolesPermissionSearchState = {
        id: String(document.getElementById('roles-search-id')?.value || '').trim(),
        name: String(document.getElementById('roles-search-name')?.value || '').trim(),
        role: normalizeUserRole(document.getElementById('roles-search-role')?.value || '')
    };
    renderRolesPermissionsTable();
};

function bindRolesPermissionSearch() {
    const idInput = document.getElementById('roles-search-id');
    const nameInput = document.getElementById('roles-search-name');
    const roleSelect = document.getElementById('roles-search-role');
    const searchBtn = document.getElementById('roles-search-btn');

    [idInput, nameInput].forEach((input) => {
        if (!input || input.dataset.enterBound === 'true') return;
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                window.applyRolesPermissionSearch();
            }
        });
        input.dataset.enterBound = 'true';
    });

    if (roleSelect && roleSelect.dataset.enterBound !== 'true') {
        roleSelect.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                window.applyRolesPermissionSearch();
            }
        });
        roleSelect.dataset.enterBound = 'true';
    }

    if (searchBtn && searchBtn.dataset.searchBound !== 'true') {
        searchBtn.addEventListener('click', window.applyRolesPermissionSearch);
        searchBtn.dataset.searchBound = 'true';
    }
}


window.showUserAccounts = function () {
    if (switchTabHandler) {
        switchTabHandler('nav-users-accounts', 'users-view');
        bindUserAccountSearch();
        renderUserAccountsTable();
    }
};

function populateAdministratorSelect(selectedId = '') {
    const select = document.getElementById('org-administrator');
    if (!select) {
        return;
    }

    const admins = getRegisteredAdministrators();
    const baseOption = '<option value="" disabled selected hidden>Select administrator</option>';
    const adminOptions = admins.map((admin) => `
        <option value="${admin.id}">${admin.name}</option>
    `).join('');

    select.innerHTML = baseOption + adminOptions;
    select.value = admins.some((admin) => admin.id === selectedId) ? selectedId : '';
}

function setOrganizationLogoPreview(src) {
    const preview = document.getElementById('org-logo-preview');
    if (preview) {
        preview.src = src || DEFAULT_ORG_PROFILE.logo;
    }
}

function fillOrganizationForm() {
    const profile = getOrganizationProfile();
    const schoolNameInput = document.getElementById('org-school-name');
    const addressInput = document.getElementById('org-school-address');
    const cityInput = document.getElementById('org-school-city');
    const contactInput = document.getElementById('org-contact-number');
    const emailInput = document.getElementById('org-email-address');

    // Select new fields via placeholder/name
    const regForm = document.getElementById('organization-registration-form');
    const mottoInput = regForm?.querySelector('input[placeholder*="Excellence"]');
    const schoolIdInput = regForm?.querySelector('input[placeholder*="405123"]');
    const visionInput = regForm?.querySelector('textarea[placeholder*="vision"]');
    const missionInput = regForm?.querySelector('textarea[placeholder*="mission"]');

    if (schoolNameInput) schoolNameInput.value = profile.schoolName;
    if (addressInput) addressInput.value = profile.address;
    if (cityInput) cityInput.value = profile.city || '';
    if (contactInput) contactInput.value = profile.contactNumber;
    if (emailInput) emailInput.value = profile.emailAddress;

    if (mottoInput) mottoInput.value = profile.motto || '';
    if (schoolIdInput) schoolIdInput.value = profile.schoolId || '';
    if (visionInput) visionInput.value = profile.vision || '';
    if (missionInput) missionInput.value = profile.mission || '';

    populateAdministratorSelect(profile.administratorId);
    setOrganizationLogoPreview(profile.logo);
}

function renderSchoolYearCard(data) {
    const container = document.getElementById('sy-list-container');
    const emptyState = document.getElementById('sy-empty-state');
    if (!container) {
        return;
    }

    if (emptyState) {
        emptyState.remove();
    }

    const fmtStart = data.start !== 'Not set'
        ? new Date(data.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'Not set';
    const fmtEnd = data.end !== 'Not set'
        ? new Date(data.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'Not set';

    container.innerHTML = `
        <div class="admin-card border-l-4 border-super-accent bg-super-accent/[0.02] animate-slide-up">
            <div class="flex justify-between items-start mb-6">
                <div class="px-3 py-1 bg-super-accent text-white text-[8px] font-black rounded uppercase tracking-widest">Current Cycle</div>
                <button class="text-black hover:text-slate-900 transition-all"><i class="fa-solid fa-ellipsis-vertical"></i></button>
            </div>
            <h4 class="text-2xl font-black text-slate-900 tracking-tighter mb-1">SY ${data.year}</h4>
            <p class="text-sm font-bold text-black mb-6">${data.semester}</p>

            <div class="space-y-4">
                <div class="flex items-center justify-between text-[10px] font-bold">
                    <span class="text-black uppercase tracking-widest">Progress</span>
                    <span class="text-super-accent font-black">Active</span>
                </div>
                <div class="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div class="h-full bg-super-accent w-[5%] rounded-full animate-pulse"></div>
                </div>
                <div class="flex gap-10 pt-4">
                    <div>
                        <p class="text-[9px] text-black font-black uppercase tracking-widest mb-1">Start Date</p>
                        <p class="text-xs font-bold text-slate-700">${fmtStart}</p>
                    </div>
                    <div>
                        <p class="text-[9px] text-black font-black uppercase tracking-widest mb-1">Expected End</p>
                        <p class="text-xs font-bold text-slate-700">${fmtEnd}</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function updateGlobalSYDisplay() {
    const el = document.getElementById('global-sy-display');
    if (!el) return;
    const records = (typeof schoolYearRecords !== 'undefined' && Array.isArray(schoolYearRecords))
        ? schoolYearRecords
        : getStoredJson('SIGMA_SCHOOL_YEARS', []);
    const active = records.find(r => r.status === 'Active' && !r.isDeleted);
    if (!active) {
        el.textContent = 'No active school year';
        return;
    }
    const yearRange = `${active.yearStart}-${active.yearEnd}`;
    let currentQuarter = null;
    const quarters = [
        { name: '1st Quarter', start: active.q1Start, end: active.q1End },
        { name: '2nd Quarter', start: active.q2Start, end: active.q2End },
        { name: '3rd Quarter', start: active.q3Start, end: active.q3End },
        { name: '4th Quarter', start: active.q4Start, end: active.q4End }
    ];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (const q of quarters) {
        if (q.start && q.end) {
            const startDate = new Date(`${q.start}T00:00:00`);
            if (today >= startDate) {
                currentQuarter = q.name;
            }
        }
    }
    const qText = currentQuarter || '1st Quarter';
    el.textContent = `S.Y. ${yearRange} • ${qText}`;
}
window.updateGlobalSYDisplay = updateGlobalSYDisplay;

window.toggleAdminForm = function () {
    const form = document.getElementById('provision-admin-form');
    if (form) {
        form.classList.toggle('hidden');
    }
};

window.toggleOrgForm = function () {
    window.openOrganizationRegistrationView();
};

window.toggleSYForm = function () {
    const form = document.getElementById('sy-form');
    if (form) {
        form.classList.toggle('hidden');
    }
};

window.toggleTableEdit = function (tableId) {
    const table = document.getElementById(tableId);
    if (!table) return;

    const actionCols = table.querySelectorAll('.actions-column');
    actionCols.forEach(col => {
        col.classList.toggle('hidden');
    });
};

window.selectTableRow = function (row) {
    const table = row.closest('table');
    const editBtn = document.getElementById('top-edit-btn');

    // Check if current row is already selected
    const isSelected = row.classList.contains('admin-row-selected');

    // Clear all other selections in this table
    table.querySelectorAll('tr').forEach(r => {
        r.classList.remove('admin-row-selected');
    });

    if (!isSelected) {
        // Select this row
        row.classList.add('admin-row-selected');

        if (editBtn) {
            editBtn.disabled = false;
            editBtn.classList.remove('text-black');
            editBtn.classList.add('text-[#15803d]');
        }
    } else {
        // Deselect
        if (editBtn) {
            editBtn.disabled = true;
            editBtn.classList.add('text-black');
            editBtn.classList.remove('text-[#15803d]');
        }
    }
};

window.openUserEditView = function () {
    if (switchTabHandler) {
        switchTabHandler('nav-users', 'users-edit-view');
    }
}

window.closeUserEditView = function () {
    if (switchTabHandler) {
        switchTabHandler('nav-users');
    }
};

// Add listener for the top Edit button to open edit view
document.addEventListener('DOMContentLoaded', () => {
    const editBtn = document.getElementById('top-edit-btn');
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            const selectedRow = document.querySelector('tr.admin-row-selected');
            if (selectedRow) {
                window.openUserEditView();
            }
        });
    }
});

window.activateSchoolYear = function () {
    const year = document.getElementById('sy-input-year')?.value;
    const semester = document.getElementById('sy-input-semester')?.value;
    const startDate = document.getElementById('sy-input-start')?.value;
    const endDate = document.getElementById('sy-input-end')?.value;

    if (!year || !semester) {
        alert('Please fill in both School Year and Quarter');
        return;
    }

    const syData = {
        year,
        semester,
        start: startDate || 'Not set',
        end: endDate || 'Not set'
    };

    localStorage.setItem('sigma_school_year', JSON.stringify(syData));
    window.deleteBio = function (index) {
        if (!confirm('Are you sure you want to delete this bio entry?')) return;

        const profile = getOrganizationProfile();
        const nextBios = [...(profile.bios || [])];
        nextBios.splice(index, 1);

        saveOrganizationProfile({
            ...profile,
            bios: nextBios
        });
        renderSchoolProfileTab('bio');
    };

    updateGlobalSYDisplay();
    renderSchoolYearCard(syData);
    window.toggleSYForm();
    alert(`School Year ${year} - ${semester} has been activated globally.`);
};

window.toggleEditAboutField = function (field, shouldSave) {
    const viewEl = document.getElementById(`view-${field}`);
    const containerEl = document.getElementById(`edit-${field}-container`);
    const inputEl = document.getElementById(`edit-${field}-input`);
    const editBtn = document.getElementById(`edit-${field}-btn`);
    if (!viewEl || !containerEl || !inputEl) return;

    const isEditing = !containerEl.classList.contains('hidden');

    if (isEditing) {
        if (shouldSave) {
            const newValue = inputEl.value.trim();
            if (newValue) {
                const profile = getOrganizationProfile();
                const nextProfile = { ...profile };

                if (field === 'address') nextProfile.address = newValue;
                if (field === 'contact') nextProfile.contactNumber = newValue;
                if (field === 'email') nextProfile.emailAddress = newValue;

                // Sync with branchRecords as well (assuming first record is the one being viewed)
                if (typeof branchRecords !== 'undefined' && branchRecords[0]) {
                    if (field === 'address') branchRecords[0].street = newValue;
                    if (field === 'contact') branchRecords[0].contact = newValue;
                    if (field === 'email') branchRecords[0].email = newValue;

                    // Update localStorage for branchRecords if it exists
                    localStorage.setItem('sigma_branches', JSON.stringify(branchRecords));
                }

                saveOrganizationProfile(nextProfile);
                syncProfileDisplay();

                // If there's a function to refresh the branch list UI, call it
                if (typeof renderBranchTable === 'function') {
                    renderBranchTable();
                }
            }
        }
        // Exit edit mode
        containerEl.classList.add('hidden');
        viewEl.classList.remove('hidden');
        if (editBtn) editBtn.classList.remove('hidden');
    } else {
        // Enter edit mode
        inputEl.value = viewEl.textContent.trim();
        viewEl.classList.add('hidden');
        if (editBtn) editBtn.classList.add('hidden');
        containerEl.classList.remove('hidden');
        inputEl.focus();

        // Handle Escape key only (Save/Discard buttons handle the rest)
        inputEl.onkeydown = (e) => {
            if (e.key === 'Escape') {
                window.toggleEditAboutField(field, false);
            }
        };
    }
};

window.openOrganizationRegistrationView = function () {
    fillOrganizationForm();
    if (switchTabHandler) {
        switchTabHandler('nav-organizations', 'organization-registration-view');
    }
}

window.closeOrganizationRegistrationView = function () {
    if (switchTabHandler) {
        switchTabHandler('nav-organizations');
    }
};

const SETTINGS_TAB_META = {
    appearance: {
        section: 'System Settings',
        title: 'Appearance',
        description: 'Manage branding, academic cycle controls, and global visual assets.',
        badge: 'Appearance'
    },
    api: {
        section: 'System Settings',
        title: 'API',
        description: 'Configure AI providers, credentials, and external integration endpoints.',
        badge: 'API'
    },
    security: {
        section: 'System Settings',
        title: 'Security',
        description: 'Adjust platform protection, verification, and session controls.',
        badge: 'Security'
    },
    storage: {
        section: 'System Settings',
        title: 'Storage',
        description: 'Control Drive connectivity, allocation limits, and asset routing.',
        badge: 'Storage'
    },

};



function updateSettingsPanel(tabId, overrides = {}) {
    const meta = SETTINGS_TAB_META[tabId] || SETTINGS_TAB_META.appearance;
    const eyebrow = document.getElementById('settings-panel-eyebrow');
    const title = document.getElementById('settings-panel-title');
    const description = document.getElementById('settings-panel-description');
    const badge = document.getElementById('settings-panel-badge');

    if (eyebrow) eyebrow.textContent = overrides.section || meta.section;
    if (title) title.textContent = overrides.title || meta.title;
    if (description) description.textContent = overrides.description || meta.description;
    if (badge) badge.textContent = overrides.badge || meta.badge;
}



window.scrollToSettingsSection = function (panelId, btnEl) {
    const target = document.getElementById(panelId);
    if (!target) return;

    // Helper: apply active or inactive visual classes to a button
    function applyBtnState(btn, isActive) {
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
        if (isActive) {
            btn.classList.add('bg-icc-yellow', 'text-white');
            btn.classList.remove('text-black', 'hover:bg-slate-100');
        } else {
            btn.classList.remove('bg-icc-yellow', 'text-white');
            btn.classList.add('text-black', 'hover:bg-slate-100');
        }
    }
    
    // Set active button immediately on click and lock it
    const view = btnEl ? btnEl.closest('.dynamic-section') : target.closest('.dynamic-section');
    if (view) {
        view._isUserNavigating = true;
        clearTimeout(view._userNavTimeout);
        view._userNavTimeout = setTimeout(() => {
            view._isUserNavigating = false;
        }, 150);

        const aside = (btnEl ? btnEl.closest('aside') : null) || view.querySelector('.sigma-settings-sidebar');
        if (aside) {
            aside.querySelectorAll('.sigma-settings-cat-btn').forEach(b => {
                const isSelected = btnEl ? (b === btnEl) : (b.getAttribute('data-settings-target') === panelId);
                applyBtnState(b, isSelected);
            });
        }
    }
    
    // Fast instant scroll to target section without animated travel delays
    const mainPane = view ? view.querySelector('.sigma-settings-main') : null;
    if (mainPane && mainPane.scrollHeight > mainPane.clientHeight + 10) {
        const paneRect = mainPane.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const offset = targetRect.top - paneRect.top + mainPane.scrollTop - 24;
        mainPane.scrollTop = Math.max(0, offset);
    } else {
        const headerOffset = 90;
        const targetTop = target.getBoundingClientRect().top + window.pageYOffset - headerOffset;
        window.scrollTo({ top: Math.max(0, targetTop), behavior: 'auto' });
    }
};

window.setupSettingsScrollSpy = function (viewId) {
    const view = document.getElementById(viewId);
    if (!view) return;
    
    const mainPane = view.querySelector('.sigma-settings-main');
    const buttons = view.querySelectorAll('.sigma-settings-cat-btn');
    if (!buttons.length) return;
    
    const updateActiveButton = () => {
        // If user just explicitly clicked a category button, don't overwrite it during scroll jump
        if (view._isUserNavigating) return;

        const panels = [];
        buttons.forEach(btn => {
            const targetId = btn.getAttribute('data-settings-target');
            const targetEl = document.getElementById(targetId);
            if (targetEl) {
                panels.push({ id: targetId, el: targetEl, btn });
            }
        });
        if (!panels.length) return;

        let activePanelId = panels[0].id;
        const paneTop = mainPane ? mainPane.getBoundingClientRect().top : 82;

        // Check if user scrolled near the bottom of main container
        const isNearBottom = mainPane && (mainPane.scrollHeight > mainPane.clientHeight) && 
                             (mainPane.scrollTop + mainPane.clientHeight >= mainPane.scrollHeight - 50);

        if (isNearBottom) {
            activePanelId = panels[panels.length - 1].id;
        } else {
            // Pick the panel currently active in the reading viewport
            for (let i = 0; i < panels.length; i++) {
                const rect = panels[i].el.getBoundingClientRect();
                const relTop = rect.top - paneTop;
                const relBottom = rect.bottom - paneTop;
                if (relTop <= 160 && relBottom > 40) {
                    activePanelId = panels[i].id;
                    break;
                }
            }
        }

        buttons.forEach(btn => {
            const isMatch = btn.getAttribute('data-settings-target') === activePanelId;
            btn.classList.toggle('active', isMatch);
            btn.setAttribute('aria-selected', isMatch ? 'true' : 'false');
            if (isMatch) {
                btn.classList.add('bg-icc-yellow', 'text-white');
                btn.classList.remove('text-black', 'hover:bg-slate-100');
            } else {
                btn.classList.remove('bg-icc-yellow', 'text-white');
                btn.classList.add('text-black', 'hover:bg-slate-100');
            }
        });
    };

    // Run immediately to activate the current panel
    updateActiveButton();
    setTimeout(updateActiveButton, 60);

    // Attach scroll listener to main container and window
    if (!view._scrollSpyAttached) {
        view._scrollSpyAttached = true;
        let ticking = false;
        const onScroll = () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    updateActiveButton();
                    ticking = false;
                });
                ticking = true;
            }
        };

        if (mainPane) mainPane.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('scroll', onScroll, { passive: true });
    }
};

window.switchSettingsTab = function (tabId) {
    if (tabId === 'security' || tabId === 'nav-settings-security') {
        if (typeof window.switchTab === 'function') window.switchTab('nav-settings-security');
        return;
    }
    if (tabId === 'preference' || tabId === 'branding' || tabId === 'nav-settings-branding') {
        if (typeof window.switchTab === 'function') window.switchTab('nav-settings-branding');
        return;
    }
    if (tabId === 'storage' || tabId === 'api' || tabId === 'integrations' || tabId === 'nav-settings-integrations') {
        if (typeof window.switchTab === 'function') window.switchTab('nav-settings-integrations');
        return;
    }
    
    if (tabId === 'security' && typeof window.loadLoginSecuritySettings === 'function') {
        window.loadLoginSecuritySettings();
    }
    const links = document.querySelectorAll('[data-settings-tab]');
    links.forEach(link => {
        const isActive = link.dataset.settingsTab === tabId;
        link.classList.toggle('active', isActive);
        link.classList.toggle('text-black', !isActive);
    });

    const catBtns = document.querySelectorAll('[data-system-cat]');
    catBtns.forEach(btn => {
        const isActive = btn.dataset.systemCat === tabId;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    const views = document.querySelectorAll('[id^="set-view-"]');
    views.forEach(view => {
        const isTarget = view.id === `set-view-${tabId}`;
        view.classList.toggle('hidden', !isTarget);
    });

    const activeTitleEl = document.getElementById('system-settings-active-title');
    if (activeTitleEl) {
        const titleMap = {
            security: 'Login Security',
            preference: 'Preferences & Branding',
            storage: 'Storage Limits',
            api: 'API Keys'
        };
        activeTitleEl.textContent = titleMap[tabId] || 'System Settings';
    }

    if (typeof window.setPortalHeader === 'function') {
        window.setPortalHeader('System Settings');
    } else {
        const brandHeader = document.getElementById('nav-context-text') || document.getElementById('header-brand-title');
        if (brandHeader) brandHeader.textContent = 'System Settings';
    }

    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });

    if (typeof updateSettingsPanel === 'function') updateSettingsPanel(tabId);
};

window.saveSettings = function () {
    const btn = document.querySelector('#settings-action-bar button:last-child');
    const originalText = btn.innerHTML;

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i> Saving...';

    setTimeout(() => {
        btn.innerHTML = '<i class="fa-solid fa-check mr-2"></i> Settings Saved';
        btn.classList.replace('bg-[#123524]', 'bg-emerald-600');

        setTimeout(() => {
            btn.disabled = false;
            btn.innerHTML = originalText;
            btn.classList.replace('bg-emerald-600', 'bg-[#123524]');
            alert('System settings have been updated successfully.');
        }, 1500);
    }, 1000);
};

window.saveSecuritySettings = function () {
    const btn = document.getElementById('security-save-btn');
    const icon = btn?.querySelector('i');
    if (btn) btn.disabled = true;
    if (icon) {
        icon.classList.remove('hidden');
        icon.style.display = 'inline-block';
    }

    const loginIdInput = document.getElementById('login-id-attempts');
    const passwordInput = document.getElementById('password-lockout-attempts');
    const maintenanceToggle = document.getElementById('settings-maintenance-toggle');
    const maintenanceMsgInput = document.getElementById('settings-maintenance-message');

    if (loginIdInput && passwordInput) {
        const config = {
            loginIdAttempts: parseInt(loginIdInput.value) || 3,
            passwordAttempts: parseInt(passwordInput.value) || 8
        };
        localStorage.setItem('sigma-login-security-config', JSON.stringify(config));
    }

    if (typeof window.setMaintenanceConfig === 'function' && typeof window.canCurrentAdminManageMaintenance === 'function' && window.canCurrentAdminManageMaintenance()) {
        const payload = {};
        if (maintenanceToggle) payload.enabled = Boolean(maintenanceToggle.checked);
        if (maintenanceMsgInput) payload.message = maintenanceMsgInput.value.trim();
        window.setMaintenanceConfig(payload);
    }

    setTimeout(() => {
        if (btn) btn.disabled = false;
        if (icon) icon.style.display = 'none';
        if (typeof window.updateAdminAccessLockdownUI === 'function') {
            window.updateAdminAccessLockdownUI();
        }
        if (typeof window.showToast === 'function') window.showToast('Security settings saved successfully!');
        else alert('Security settings saved successfully!');
    }, 800);
};

window.loadLoginSecuritySettings = function () {
    const raw = localStorage.getItem('sigma-login-security-config');
    if (raw) {
        try {
            const config = JSON.parse(raw);
            const loginIdInput = document.getElementById('login-id-attempts');
            const passwordInput = document.getElementById('password-lockout-attempts');
            if (loginIdInput) loginIdInput.value = config.loginIdAttempts;
            if (passwordInput) passwordInput.value = config.passwordAttempts;
        } catch (e) {}
    }

    if (typeof window.getMaintenanceConfig === 'function') {
        const mConfig = window.getMaintenanceConfig();
        const maintenanceToggle = document.getElementById('settings-maintenance-toggle');
        const maintenanceMsgInput = document.getElementById('settings-maintenance-message');
        if (maintenanceToggle) maintenanceToggle.checked = Boolean(mConfig.enabled);
        if (maintenanceMsgInput && !maintenanceMsgInput.value) maintenanceMsgInput.value = mConfig.message || '';
    }

    if (typeof window.updateAdminAccessLockdownUI === 'function') {
        window.updateAdminAccessLockdownUI();
    }
};

window.canCurrentAdminManageMaintenance = function () {
    return typeof window.isCurrentMasterAdmin === 'function' && window.isCurrentMasterAdmin();
};

window.canCurrentAdminEditNoticeMessage = function () {
    // Master Admin can always edit; regular admin only if granted noticeMessage permission
    if (typeof window.isCurrentMasterAdmin === 'function' && window.isCurrentMasterAdmin()) return true;
    const user = typeof window.getLoggedInAdminUser === 'function' ? window.getLoggedInAdminUser() : null;
    if (!user) return false;
    return user.permissions?.noticeMessage === true;
};

window.showMaintenancePermissionDenied = function () {
    if (typeof window.showUserConfirm === 'function') {
        window.showUserConfirm(
            'Permission Denied',
            'Only Master Administrators are permitted to activate maintenance mode or update the restricted access notice.',
            null,
            true
        );
    } else {
        alert('Only Master Administrators are permitted to activate maintenance mode or update the restricted access notice.');
    }
};

window.updateMaintenanceAccessControls = function () {
    const canToggle = typeof window.canCurrentAdminManageMaintenance === 'function'
        ? window.canCurrentAdminManageMaintenance()
        : false;
    const canNotice = typeof window.canCurrentAdminEditNoticeMessage === 'function'
        ? window.canCurrentAdminEditNoticeMessage()
        : false;

    const toggle = document.getElementById('settings-maintenance-toggle');
    const toggleLabel = toggle ? toggle.closest('label') : null;
    const messageInput = document.getElementById('settings-maintenance-message');
    const saveButton = document.getElementById('settings-maintenance-message-save');
    const masterNote = document.getElementById('settings-maintenance-master-note');
    const noticeMsgSection = document.getElementById('sec-notice-message-section');

    // Maintenance toggle — Master Admin only
    if (toggle) {
        toggle.disabled = !canToggle;
        toggle.title = canToggle
            ? 'Toggle maintenance mode'
            : 'Only Master Admin can change maintenance mode';
    }
    if (toggleLabel) {
        toggleLabel.classList.toggle('opacity-60', !canToggle);
        toggleLabel.classList.toggle('cursor-not-allowed', !canToggle);
        toggleLabel.classList.toggle('cursor-pointer', canToggle);
        toggleLabel.title = canToggle
            ? 'Maintenance mode control'
            : 'Only Master Admin can change maintenance mode';
    }

    // Hide the entire toggle row for non-master admins (they should only see notice section)
    const toggleRow = document.getElementById('sec-maintenance-toggle-row');
    if (toggleRow) {
        toggleRow.classList.toggle('hidden', !canToggle);
    }

    // Notice message section — Master Admin or permitted regular admin
    if (noticeMsgSection) {
        noticeMsgSection.classList.toggle('hidden', !canNotice);
    }
    if (messageInput) {
        messageInput.disabled = !canNotice;
        messageInput.classList.toggle('opacity-60', !canNotice);
        messageInput.classList.toggle('cursor-not-allowed', !canNotice);
        messageInput.title = canNotice
            ? 'Edit the restricted access notice'
            : 'Only Master Admin can edit the restricted access notice';
    }
    if (saveButton) {
        saveButton.disabled = !canNotice;
        saveButton.classList.toggle('opacity-60', !canNotice);
        saveButton.classList.toggle('cursor-not-allowed', !canNotice);
        saveButton.classList.toggle('hover:bg-slate-200', canNotice);
        saveButton.title = canNotice
            ? 'Save the restricted access notice'
            : 'Only Master Admin can save the restricted access notice';
    }

    // Master note banner
    if (masterNote) {
        // Show banner when user can see the panel but cannot toggle maintenance
        masterNote.classList.toggle('hidden', canToggle);
    }
};

window.applyAdminMaintenanceToggleChange = function (enabled) {
    if (typeof window.canCurrentAdminManageMaintenance === 'function' && !window.canCurrentAdminManageMaintenance()) {
        if (typeof window.updateAdminAccessLockdownUI === 'function') {
            window.updateAdminAccessLockdownUI();
        }
        window.showMaintenancePermissionDenied();
        return;
    }

    const toggle = document.getElementById('settings-maintenance-toggle');
    const nextState = Boolean(enabled);

    if (typeof window.setMaintenanceConfig === 'function') {
        window.setMaintenanceConfig({ enabled: nextState });
    }
    if (typeof window.updateAdminAccessLockdownUI === 'function') {
        window.updateAdminAccessLockdownUI();
    }
    if (typeof window.openAskingPanel === 'function') {
        window.openAskingPanel({
            title: nextState ? 'Maintenance Mode Activated' : 'Operational',
            message: nextState
                ? 'Regular users were logged out and access is now restricted. Administrators remain connected.'
                : 'Maintenance mode has been turned off. The system is now operational and open for all users.',
            type: nextState ? 'warning' : 'info',
            confirmText: 'OK'
        });
    } else {
        alert(nextState
            ? 'Maintenance mode activated. Regular users were logged out and access is now restricted.'
            : 'Maintenance mode has been turned off. The system is now operational and open for all users.');
    }
};

window.handleAdminMaintenanceToggleChange = function (enabled) {
    const toggle = document.getElementById('settings-maintenance-toggle');
    const nextState = Boolean(enabled);
    const canManageMaintenance = typeof window.canCurrentAdminManageMaintenance === 'function'
        ? window.canCurrentAdminManageMaintenance()
        : false;

    if (!canManageMaintenance) {
        if (typeof window.updateAdminAccessLockdownUI === 'function') {
            window.updateAdminAccessLockdownUI();
        } else if (toggle && typeof window.getMaintenanceConfig === 'function') {
            toggle.checked = Boolean(window.getMaintenanceConfig().enabled);
        }
        window.showMaintenancePermissionDenied();
        return;
    }

    if (nextState && typeof window.openAskingPanel === 'function') {
        window.openAskingPanel({
            title: 'Activate Maintenance Mode',
            message: 'This will immediately log out all active Student and Teacher sessions and block new sign-ins. Administrators will remain connected.',
            type: 'warning',
            showCancel: true,
            confirmText: 'Activate',
            cancelText: 'Cancel',
            onConfirm: function () {
                window.applyAdminMaintenanceToggleChange(true);
            },
            onCancel: function () {
                if (toggle) toggle.checked = false;
            }
        });
        return;
    }

    if (nextState) {
        const proceed = confirm('Enable Maintenance / Lockdown Mode and immediately log out all active Student and Teacher sessions? Administrators will remain connected.');
        if (!proceed) {
            if (toggle) toggle.checked = false;
            return;
        }
    }

    window.applyAdminMaintenanceToggleChange(nextState);
};

window.saveMaintenanceMessageOnly = function () {
    const textarea = document.getElementById('settings-maintenance-message');
    if (typeof window.canCurrentAdminManageMaintenance === 'function' && !window.canCurrentAdminManageMaintenance()) {
        if (typeof window.updateAdminAccessLockdownUI === 'function') {
            window.updateAdminAccessLockdownUI();
        }
        window.showMaintenancePermissionDenied();
        return;
    }

    const msg = textarea ? textarea.value.trim() : '';
    if (typeof window.setMaintenanceConfig === 'function') {
        window.setMaintenanceConfig({ message: msg });
    }
    if (typeof window.openAskingPanel === 'function') {
        window.openAskingPanel({
            title: 'Notice Message Saved',
            message: 'The restricted access notice has been updated successfully.',
            type: 'info',
            confirmText: 'OK'
        });
    } else {
        alert('Restricted access notice updated successfully!');
    }
};

window.handleAdminEmergencyForceLogout = function () {
    if (typeof window.openAskingPanel === 'function') {
        window.openAskingPanel({
            title: 'Force Logout All Users',
            message: 'This will immediately disconnect all active Student and Teacher sessions. Administrators will remain connected.',
            type: 'warning',
            showCancel: true,
            confirmText: 'Proceed',
            cancelText: 'Cancel',
            onConfirm: function () {
                if (typeof window.broadcastForceLogout === 'function') {
                    window.broadcastForceLogout('Emergency session termination by Administrator.');
                }
                window.openAskingPanel({
                    title: 'Sessions Disconnected',
                    message: 'The force logout request has been broadcast successfully to all active Student and Teacher sessions.',
                    type: 'info',
                    confirmText: 'OK'
                });
            }
        });
        return;
    }

    const proceed = confirm('Are you sure you want to terminate all active Student and Teacher sessions immediately? They will be safely disconnected.');
    if (!proceed) return;

    if (typeof window.broadcastForceLogout === 'function') {
        window.broadcastForceLogout('Emergency session termination by Administrator.');
    }
    alert('Force logout broadcasted! All student and teacher sessions disconnected.');
};

window.resetSettings = function () {
    if (confirm('Are you sure you want to discard all unsaved changes?')) {
        location.reload();
    }
};

window.handleSliderUpload = function () {
    const count = document.querySelectorAll('#slider-manager-grid .group').length;
    if (count >= 7) {
        alert('Maximum of 7 slides allowed.');
        return;
    }
    alert('Image upload dialog would open here.');
};

window.removeSlide = function (btn) {
    const slide = btn.closest('.group');
    if (slide) {
        slide.remove();
        updateSliderCount();
    }
};

function updateSliderCount() {
    const count = document.querySelectorAll('#slider-manager-grid .group').length;
    const display = document.getElementById('slider-count');
    if (display) display.textContent = count;
}

document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.nav-link, .nav-sublink');
    const sections = document.querySelectorAll('.dynamic-section');
    const sidebar = document.getElementById('sidebar');
    const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
    const subSidebar = document.getElementById('sub-sidebar');
    const subSidebarTitle = document.getElementById('sub-sidebar-title');
    const subSidebarContent = document.getElementById('sub-sidebar-content');
    const headerBrandTitle = document.getElementById('nav-context-text') || document.getElementById('header-brand-title');

    // Attach click listeners to all sidebar navigation links to route through switchTab
    document.querySelectorAll('#sidebar nav a.nav-link:not(.nav-link--group):not([data-toggle="submenu"]), #sidebar nav a.nav-sublink:not(.nav-link--group):not([data-toggle="submenu"])').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            if (link.id && typeof window.switchTab === 'function') {
                window.switchTab(link.id);
            }
        });
    });


    // Initialize logged-in user display — handled by js/profile.js (syncUserProfileData)
    const authUser = (function(){ try { return JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}'); } catch(e){ return {}; } })();
    const userProfile = getStoredJson('sigma_user_profile', {});
    const loggedUser = { ...userProfile, ...authUser };

    // Welcome Banner (admin-specific)
    const welcomeName = document.getElementById('welcome-user-firstName');
    const welcomeRole = document.getElementById('welcome-user-role');
    const isAuthAdmin = !!(authUser && (authUser.id || authUser.uid || authUser.email) && !String(authUser.id || '').toLowerCase().includes('default'));
    if (isAuthAdmin) {
        let adminFn = loggedUser.firstName || '';
        if (!adminFn && (loggedUser.name || loggedUser.fullName)) {
            const raw = loggedUser.fullName || loggedUser.name;
            adminFn = raw.includes(',') ? raw.split(',')[1].trim().split(' ')[0] : raw.trim().split(/\s+/)[0];
        }
        if (welcomeRole) welcomeRole.textContent = 'Admin ';
        if (welcomeName) welcomeName.textContent = adminFn || 'Admin';
    } else {
        if (welcomeRole) welcomeRole.textContent = 'Admin';
        if (welcomeName) welcomeName.textContent = '';
    }


    const navSectionMap = {
        'nav-dashboard': 'dashboard-view',
        'nav-grades': 'school-grades-view',
        'nav-organizations': 'organization-registration-view',
        'nav-reports-ai': 'reports-ai-view',
        'nav-reports-attendance': 'reports-attendance-view',
        'nav-reports-performance': 'reports-performance-view',
        'nav-analytics': 'reports-performance-view',
        'nav-grades-analytics': 'reports-performance-view',
        'nav-grades-gradebook': 'school-grades-view',
        'nav-reports-gradebooks': 'school-grades-view',
        'nav-gradebooks': 'school-grades-view',
        'nav-resources': 'resources-view',
        'nav-users': 'users-view',
        'nav-users-accounts': 'users-view',
        'nav-school-grades': 'school-grades-view',
        'nav-school-library': 'school-library-view',
        'nav-school-profile': 'school-profile-view',
        'nav-school-year': 'school-year-view',
        'nav-school-subjects': 'school-subjects-view',
        'nav-school-sections': 'school-sections-view',
        'nav-announcements': 'announcements-view',
        'nav-settings-security': 'settings-security-view',
        'nav-settings-branding': 'settings-branding-view',
        'nav-settings-integrations': 'settings-integrations-view',
        'nav-settings-preference': 'settings-branding-view',
        'nav-settings-storage': 'settings-integrations-view',
        'nav-settings-api': 'settings-integrations-view',
        'nav-profile': 'user-profile-view',
        'nav-profile-dropdown': 'user-profile-view',
        'nav-audit-ai': 'audit-ai-view',
        'nav-audit-activity': 'audit-activity-view',
        'nav-audit-auth': 'audit-auth-view',

    };

    const schoolMgmtBtn = document.getElementById('nav-school-mgmt');
    const schoolMgmtSubmenu = document.getElementById('school-mgmt-submenu');
    const schoolMgmtChevron = document.getElementById('school-mgmt-chevron');
    const gradesBtn = document.getElementById('nav-grades');
    const gradesSubmenu = document.getElementById('grades-submenu');
    const gradesChevron = document.getElementById('grades-chevron');
    const reportsBtn = document.getElementById('nav-reports');
    const reportsSubmenu = document.getElementById('reports-submenu');
    const reportsChevron = document.getElementById('reports-chevron');
    const settingsBtn = document.getElementById('nav-settings');
    const settingsSubmenu = document.getElementById('settings-submenu');
    const settingsChevron = document.getElementById('settings-chevron');


    // Handle Dropdown Toggles
    const notiToggle = document.getElementById('noti-toggle');
    const notiDropdown = document.getElementById('noti-dropdown');
    const profileToggle = document.getElementById('profile-toggle');
    const profileDropdown = document.getElementById('profile-dropdown');
    const calendarToggle = document.getElementById('calendar-toggle');
    const calendarDropdown = document.getElementById('calendar-dropdown');
    const sigmaAiNotch = document.getElementById('sigmaAiNotch');
    const sigmaAiPanel = document.getElementById('sigmaAiPanel');
    const sigmaAiMessages = document.getElementById('sigmaAiMessages');
    const sigmaAiInput = document.getElementById('sigmaAiInput');
    const sigmaAiSendBtn = document.getElementById('sigmaAiSendBtn');
    const sigmaAiCloseBtn = document.getElementById('sigmaAiCloseBtn');
    let sigmaAiWaiting = false;

    const syncHeaderToggleState = () => {
        if (notiToggle && notiDropdown) {
            notiToggle.classList.toggle('active', !notiDropdown.classList.contains('hidden'));
        }
        if (profileToggle && profileDropdown) {
            profileToggle.classList.toggle('active', !profileDropdown.classList.contains('hidden'));
        }
        if (calendarToggle && calendarDropdown) {
            calendarToggle.classList.toggle('active', !calendarDropdown.classList.contains('hidden'));
        }
    };

    let suppressNextHeaderClose = false;

    // Dropdown toggle handling is centralized in js/calendar.js, js/notifications.js, and js/profile.js

    let activeOverlayGroup = null;
    let manualSubSidebarDismiss = false;

    function hideSubSidebarOverlay() {
        activeOverlayGroup = null;
        if (typeof window.hideSubSidebar === 'function') {
            window.hideSubSidebar();
        } else if (subSidebar) {
            subSidebar.classList.remove('sub-sidebar-visible');
            subSidebar.classList.add('hidden');
        }
        if (subSidebarContent) {
            subSidebarContent.innerHTML = '';
        }
    }

    function getNavLabelText(navId) {
        const link = document.getElementById(navId);
        if (!link) return '';

        const fullLabel = link.querySelector('.full-label');
        if (fullLabel) {
            return fullLabel.textContent.trim();
        }

        const spanLabels = Array.from(link.querySelectorAll('span'))
            .map((span) => span.textContent.trim())
            .filter(Boolean);
        if (spanLabels.length) {
            return spanLabels[spanLabels.length - 1];
        }

        return link.textContent.trim();
    }


    function executeNavActionById(navId) {
        const link = document.getElementById(navId);
        if (!link) return;

        if (link.dataset.settingsTab) {
            groupStates.settings = true;
            switchTab(link.id);
            window.switchSettingsTab(link.dataset.settingsTab);
            return;
        }



        switchTab(link.id);
    }

    function renderSubSidebar(groupName) {
        const group = sidebarGroups[groupName];
        if (!group) return;

        if (group.button && typeof window.renderDefaultSubSidebar === 'function') {
            activeOverlayGroup = groupName;
            window.renderDefaultSubSidebar(group.button);
            return;
        }

        if (!subSidebar || !subSidebarTitle || !subSidebarContent) {
            return;
        }

        subSidebarTitle.textContent = group.title;
        subSidebarContent.innerHTML = '';

        group.childIds.forEach((childId) => {
            const sourceLink = document.getElementById(childId);
            if (!sourceLink || sourceLink.classList.contains('hidden') || sourceLink.style.display === 'none' || sourceLink.dataset.permHidden === 'true') return;

            const item = document.createElement('a');
            item.href = '#';
            item.className = 'sub-sidebar-link';
            if (currentNavId === childId) {
                item.classList.add('active');
            }

            const iconClass = sourceLink.querySelector('i')?.className || 'fa-solid fa-circle';
            const labelText = sourceLink.querySelector('span')?.textContent?.trim() || sourceLink.textContent.trim();
            const isActive = currentNavId === childId;
            item.innerHTML = `<i class="${iconClass}"${isActive ? ' style="color:#ffffff !important"' : ''}></i><span>${escapeHtml(labelText)}</span>`;

            item.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                executeNavActionById(childId);
                hideSubSidebarOverlay();
            });

            subSidebarContent.appendChild(item);
        });

        if (group.button) {
            if (typeof window.positionSubSidebarBeside === 'function') {
                window.positionSubSidebarBeside(group.button);
            } else {
                const rect = group.button.getBoundingClientRect();
                const sidebarTopOffset = 82;
                const targetTop = Math.max(sidebarTopOffset, Math.round(rect.top));
                subSidebar.style.setProperty('top', `${targetTop}px`, 'important');
                subSidebar.style.setProperty('max-height', `calc(100vh - ${targetTop}px - 16px)`, 'important');
            }
            group.button.classList.add('open-flyout');
        }

        subSidebar.classList.remove('hidden');
        subSidebar.classList.add('sub-sidebar-visible');
        activeOverlayGroup = groupName;
    }

    // Close dropdowns on outside click
    document.addEventListener('click', (e) => {
        const isHeaderOverlayClick = [notiDropdown, profileDropdown, calendarDropdown].some(d => d && d.contains(e.target));
        const isHeaderToggleClick = [notiToggle, profileToggle, calendarToggle].some(t => t && t.contains(e.target));
        const isAiClick = [sigmaAiPanel, sigmaAiNotch].some(el => el && el.contains(e.target));

        if (!isHeaderOverlayClick && !isHeaderToggleClick && !isAiClick) {
            hideHeaderOverlays();
        }

        if (
            document.body.classList.contains('sidebar-collapsed') &&
            subSidebar &&
            !subSidebar.contains(e.target) &&
            sidebar &&
            !sidebar.contains(e.target) &&
            sidebarToggleBtn &&
            !sidebarToggleBtn.contains(e.target)
        ) {
            hideSubSidebarOverlay();
        }

        syncHeaderToggleState();
    });

    syncHeaderToggleState();


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

    function addAiMessage(content, isUser = false) {
        if (!sigmaAiMessages) return;
        const msg = document.createElement('div');
        msg.className = `sigma-ai-message ${isUser ? 'sigma-ai-message--user' : 'sigma-ai-message--assistant'}`;
        const stamp = getSigmaAiTimestamp();
        msg.innerHTML = `
            <div class="sigma-ai-message__meta">${stamp}</div>
            <div class="sigma-ai-message__row">
                ${!isUser ? `<div class="sigma-ai-message__icon"><i class="fa-solid fa-bolt"></i></div>` : ''}
                <div class="sigma-ai-message__bubble ${isUser ? 'sigma-ai-message__bubble--user' : 'sigma-ai-message__bubble--assistant'}">${content}</div>
            </div>
        `;
        sigmaAiMessages.appendChild(msg);
        sigmaAiMessages.scrollTop = sigmaAiMessages.scrollHeight;
        return msg;
    }

    function setSigmaAiWaiting(waiting) {
        sigmaAiWaiting = waiting;
        if (sigmaAiSendBtn) {
            sigmaAiSendBtn.disabled = waiting;
            sigmaAiSendBtn.classList.toggle('is-loading', waiting);
        }
    }

    function openAiPanel() {
        if (!sigmaAiPanel) return;
        if (typeof window.hideHeaderOverlays === 'function') {
            window.hideHeaderOverlays(sigmaAiPanel, document.getElementById('sigma-toggle'));
        }
        sigmaAiPanel.classList.remove('hidden');
        document.getElementById('sigma-toggle')?.classList.add('active');
        const input = document.getElementById('sigmaAiInput');
        if (input) setTimeout(() => input.focus(), 50);
        sessionStorage.setItem('sigmaPanelOpen', 'true');
    }

    function closeAiPanel() {
        if (!sigmaAiPanel) return;
        sigmaAiPanel.classList.add('hidden');
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
        document.querySelectorAll('.relative button').forEach(button => {
            if (button !== exceptButton) button.classList.remove('active');
        });
        if (!keepAiOpen) closeAiPanel();
    }

    document.querySelectorAll('.sigma-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            addAiMessage(chip.textContent.trim(), true);
            setTimeout(() => addAiMessage('Full AI integration coming soon!', false), 600);
        });
    });

    // ─── Calendar Dropdown Logic delegated to unified js/calendar.js ───

    function sendAiMessage() {
        if (sigmaAiWaiting) return;
        const v = sigmaAiInput?.value.trim();
        if (!v) return;
        addAiMessage(v, true);
        sigmaAiInput.value = '';
        sigmaAiInput.style.height = 'auto';
        setSigmaAiWaiting(true);
        setTimeout(() => {
            addAiMessage('Wireframe mode — Gemini AI coming next semester.', false);
            setSigmaAiWaiting(false);
        }, 600);
    }

    if (sigmaAiSendBtn) sigmaAiSendBtn.addEventListener('click', sendAiMessage);
    if (sigmaAiCloseBtn) sigmaAiCloseBtn.addEventListener('click', closeAiPanel);
    if (sigmaAiInput) {
        sigmaAiInput.addEventListener('input', function () {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });
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
            // openAiPanel(); // Disabled auto-open on login
            addAiMessage(WELCOME_MSG, false);
        }, 900);
    } else {
        addAiMessage(WELCOME_MSG, false);
    }

    if (panelWasOpen) openAiPanel();

    // Final Reset
    if (notiDropdown) notiDropdown.classList.add('hidden');
    if (profileDropdown) profileDropdown.classList.add('hidden');

    // Ensure sidebar state is synced on initialization
    setTimeout(() => {
        if (typeof syncSidebarGroups === 'function') {
            syncSidebarGroups();
        }
    }, 100);

    let currentNavId = 'nav-dashboard';
    const groupStates = {};
    const sidebarGroups = {
        'school-mgmt': {
            button: schoolMgmtBtn, submenu: schoolMgmtSubmenu, chevron: schoolMgmtChevron,
            title: 'School Management',
            childIds: ['nav-school-profile', 'nav-school-year', 'nav-school-sections', 'nav-school-subjects', 'nav-school-grades']
        },
        'reports': {
            button: reportsBtn, submenu: reportsSubmenu, chevron: reportsChevron,
            title: 'Reports',
            childIds: ['nav-reports-ai', 'nav-reports-attendance']
        },
        'settings': {
            button: settingsBtn, submenu: settingsSubmenu, chevron: settingsChevron,
            title: 'System Settings',
            childIds: ['nav-settings-security', 'nav-settings-branding', 'nav-settings-integrations']
        },
        'audit-logs': {
            button: document.getElementById('nav-audit-logs'),
            submenu: document.getElementById('audit-logs-submenu'),
            chevron: document.getElementById('audit-logs-chevron'),
            title: 'Audit Logs',
            childIds: ['nav-audit-ai', 'nav-audit-activity', 'nav-audit-auth']
        },
    };

    // Direct accordion listener binding (matching teacher and student)
    Object.entries(sidebarGroups).forEach(([name, group]) => {
        if (!group.button || !group.submenu || !group.chevron) return;
        if (group.button.dataset.accordionBoundAdmin === 'true') return;
        group.button.dataset.accordionBoundAdmin = 'true';

        group.button.addEventListener('click', (event) => {
            const isCollapsed = document.body.classList.contains('sidebar-collapsed') && window.innerWidth >= 1024;
            if (isCollapsed) {
                event.preventDefault();
                event.stopPropagation();
                renderSubSidebar(name);
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            const willOpen = group.submenu.classList.contains('hidden');
            groupStates[name] = willOpen;
            group.submenu.classList.toggle('hidden', !willOpen);
            group.button.classList.toggle('open', willOpen);
            group.button.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
            group.chevron.classList.toggle('rotate-90', willOpen);
            group.chevron.style.setProperty('transform', willOpen ? 'rotate(90deg)' : 'rotate(0deg)', 'important');
        }, true);
    });

    function getGroupIdForNav(navId) {
        for (const [groupId, group] of Object.entries(sidebarGroups)) {
            if (group.childIds && group.childIds.includes(navId)) {
                return groupId;
            }
        }
        return null;
    }

    function getParentTitleForNav(navId) {
        if (navId === 'nav-dashboard') {
            return 'Home';
        }

        const groupId = getGroupIdForNav(navId);
        if (groupId && sidebarGroups[groupId]?.button) {
            return getNavLabelText(sidebarGroups[groupId].button.id);
        }

        return getNavLabelText(navId);
    }


    function resetOtherGroups(activeName) {
        Object.keys(groupStates).forEach((key) => {
            if (key !== activeName) {
                groupStates[key] = false;
            }
        });
    }

    function clearAllGroups() {
        Object.keys(groupStates).forEach((key) => {
            groupStates[key] = false;
        });
    }

    function getActiveParentId() {
        const groupId = getGroupIdForNav(currentNavId);
        const group = groupId ? sidebarGroups[groupId] : null;

        // If it's a standalone link or a group with no button
        if (!groupId || !group?.button) {
            return currentNavId;
        }

        return group.button.id;
    }

    function syncSidebarGroups(forceActiveReset = false) {
        const isSidebarCollapsed = document.body.classList.contains('sidebar-collapsed');
        const activeParentId = getActiveParentId();
        const activeGroupId = getGroupIdForNav(currentNavId);

        // When forceActiveReset is true (on sidebar expand or new page navigation),
        // set default active child's dropdown to open. When user manually clicks accordion, preserve their toggle.
        if (!isSidebarCollapsed && forceActiveReset) {
            Object.keys(groupStates).forEach(key => {
                groupStates[key] = (key === activeGroupId);
            });
        }

        // 1. Handle Sidebar Groups (Expand/Collapse states)
        Object.entries(sidebarGroups).forEach(([name, group]) => {
            if (!group.button || !group.submenu || !group.chevron) return;
            const isDomOpen = !group.submenu.classList.contains('hidden');
            const shouldOpen = forceActiveReset ? (name === activeGroupId) : (groupStates[name] !== undefined ? Boolean(groupStates[name]) : isDomOpen);
            groupStates[name] = shouldOpen;

            if (isSidebarCollapsed) {
                group.submenu.classList.add('hidden');
                group.button.classList.remove('open');
                group.button.setAttribute('aria-expanded', 'false');
                group.chevron.classList.remove('rotate-90');
                group.chevron.style.setProperty('transform', 'rotate(0deg)', 'important');
            } else {
                group.submenu.classList.toggle('hidden', !shouldOpen);
                group.button.classList.toggle('open', shouldOpen);
                group.button.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
                group.chevron.classList.toggle('rotate-90', shouldOpen);
                group.chevron.style.setProperty('transform', shouldOpen ? 'rotate(90deg)' : 'rotate(0deg)', 'important');
            }
        });

        // 2. Dual Highlight Logic (Parent + Child)
        navLinks.forEach(link => {
            const isTargetChild = link.id === currentNavId;
            const isTargetParent = link.id === activeParentId;

            // Highlight if it's the specific child OR the active parent
            link.classList.toggle('active', isTargetChild || isTargetParent);

            // Ensure standalone links (like Home) are visible if not hidden by permission engine
            if (!getGroupIdForNav(link.id)) {
                if (link.dataset.permHidden !== 'true' && link.style.display !== 'none') {
                    link.classList.remove('hidden');
                }
            }
        });

        if (!isSidebarCollapsed) {
            hideSubSidebarOverlay();
            manualSubSidebarDismiss = false;
        } else {
            // We are in Icon Mode (Collapsed)
            if (activeOverlayGroup) {
                renderSubSidebar(activeOverlayGroup);
            } else {
                hideSubSidebarOverlay();
            }
        }
    }

    window.addEventListener('sidebar:toggle', (e) => {
        const isCollapsed = e.detail?.collapsed;
        if (!isCollapsed) {
            syncSidebarGroups(true);
        } else {
            syncSidebarGroups(false);
        }
    });

    // Synchronize groupStates with canonical sidebar.js accordion events
    window.addEventListener('sidebar:group-toggle', (e) => {
        const detail = e.detail || {};
        const gId = detail.groupId;
        if (gId && groupStates.hasOwnProperty(gId)) {
            groupStates[gId] = detail.isOpen;
        }
    });

    window.loadLoginSecuritySettings();

    window.updateNavState = function (navId) {
        currentNavId = navId;
        const currentGroupId = getGroupIdForNav(navId);

        if (currentGroupId) {
            groupStates[currentGroupId] = true;
        } else {
            clearAllGroups();
            hideSubSidebarOverlay();
        }

        // Reset manual dismissal when navigating to a new section
        manualSubSidebarDismiss = false;

        syncSidebarGroups();
    }


    let hoverResetTimer = null;

    if (sidebar) {
        sidebar.addEventListener('mouseleave', () => {
            if (document.body.classList.contains('sidebar-collapsed')) {
                hoverResetTimer = setTimeout(() => {
                    activeOverlayGroup = null;
                    syncSidebarGroups();
                }, 150);
            }
        });
        sidebar.addEventListener('mouseenter', () => {
            if (hoverResetTimer) clearTimeout(hoverResetTimer);
        });
    }

    if (subSidebar) {
        subSidebar.addEventListener('mouseenter', () => {
            if (hoverResetTimer) clearTimeout(hoverResetTimer);
        });
        subSidebar.addEventListener('mouseleave', (e) => {
            if (document.body.classList.contains('sidebar-collapsed')) {
                // If moving back to sidebar, don't hide immediately
                if (sidebar && sidebar.contains(e.relatedTarget)) return;

                activeOverlayGroup = null;
                syncSidebarGroups();
            }
        });
    }
    const announcementForm = document.getElementById('announcement-form');
    const typeButtons = document.querySelectorAll('[data-announcement-type]');
    const announcementActivePosts = document.getElementById('announcement-active-posts');

    typeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            setAnnouncementType(btn.dataset.announcementType);
        });
    });

    announcementForm?.addEventListener('submit', event => {
        event.preventDefault();
        const titleInput = document.getElementById('announcement-title-input');
        const bodyInput = document.getElementById('announcement-body-input');
        const audienceSelect = document.getElementById('announcement-audience-select');
        const submitBtn = document.getElementById('announcement-submit-btn');

        const title = titleInput?.value.trim() || '';
        const body = bodyInput?.value.trim() || '';
        const audience = audienceSelect?.value || 'all';

        if (!title || !body) return;

        const posts = loadAdminAnnouncements();
        posts.unshift({
            id: `admin-${Date.now()}`,
            title,
            body,
            audience,
            type: activeAnnouncementType,
            author: 'Admin Office',
            createdAt: new Date().toISOString()
        });
        saveAdminAnnouncements(posts.slice(0, 25));

        titleInput.value = '';
        bodyInput.value = '';
        setAnnouncementType('regular');
        renderAnnouncementActivePosts();

        if (submitBtn) {
            const original = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fa-solid fa-check mr-2"></i> Posted';
            submitBtn.classList.add('bg-emerald-500', 'shadow-emerald-500/20');
            setTimeout(() => {
                submitBtn.innerHTML = original;
                submitBtn.classList.remove('bg-emerald-500', 'shadow-emerald-500/20');
            }, 1800);
        }
    });

    announcementActivePosts?.addEventListener('click', event => {
        const button = event.target.closest('[data-announcement-delete]');
        if (!button) return;
        const postId = button.dataset.announcementDelete;
        if (!postId) return;

        // Use a simple confirm for now since openConfirmPanel might not be defined in admin.js
        if (confirm('Remove this announcement from all feeds?')) {
            const filtered = loadAdminAnnouncements().filter(post => post.id !== postId);
            saveAdminAnnouncements(filtered);
            renderAnnouncementActivePosts();
        }
    });

    window.canAccessAdminSection = function (sectionId) {
        const user = typeof window.getLoggedInAdminUser === 'function' ? window.getLoggedInAdminUser() : null;
        if (!user) return true;
        const role = typeof normalizeUserRole === 'function' ? normalizeUserRole(user.role || user.type) : 'Admin';
        const isMaster = role === 'Master Admin' || String(user.uid || user.id) === '0000000' || !!user.isMaster;
        if (isMaster) return true;

        const perms = user.permissions || {};
        const canSchoolMain = perms.schoolMain !== false;

        switch (sectionId) {
            case 'school-profile-view':
                return canSchoolMain && perms.schoolProfile === true;
            case 'school-year-view':
                return canSchoolMain && perms.schoolYear !== false && perms.syAuthority !== false;
            case 'school-sections-view':
                return canSchoolMain && perms.schoolSections !== false;
            case 'school-subjects-view':
                return canSchoolMain && perms.schoolSubjects !== false && perms.subjectAuthority !== false;
            case 'reports-ai-view':
                return perms.reportsMain !== false && perms.reportsPredictive !== false;
            case 'reports-attendance-view':
                return perms.reportsMain !== false && perms.reportsDescriptive !== false;
            case 'reports-performance-view':
            case 'school-grades-view':
                return perms.reportsMain !== false && perms.reportsPrescriptive !== false;
            case 'resources-view':
                return perms.resourcesMain !== false;
            case 'audit-ai-view':
                return perms.auditMain !== false && perms.auditAi !== false;
            case 'audit-activity-view':
                return perms.auditMain !== false && perms.auditActivity !== false;
            case 'audit-auth-view':
                return perms.auditMain !== false && perms.auditAuth !== false;
            case 'settings-view':
                return perms.settingsMain !== false;
            case 'settings-security-view':
                return perms.settingsMain !== false && perms.settingsSecurity !== false;
            case 'settings-branding-view':
                return perms.settingsMain !== false && perms.settingsBranding !== false;
            case 'settings-integrations-view':
                return perms.settingsMain !== false && perms.settingsApi !== false;
            case 'users-view':
                return perms.manageAdmins !== false || perms.manageTeachers !== false || perms.manageStudents !== false;
            default:
                return true;
        }
    };

    window.showSection = function (sectionId, navId) {
        if (typeof window.canAccessAdminSection === 'function' && !window.canAccessAdminSection(sectionId)) {
            sectionId = 'dashboard-view';
            navId = 'nav-dashboard';
        }

        updateNavState(navId);

        const gradesSection = document.getElementById('school-grades-view');
        const gradesWasVisible = Boolean(gradesSection && !gradesSection.classList.contains('hidden'));
        const enteringGrades = sectionId === 'school-grades-view';
        const gradesNav = (typeof window.syncSharedGradesNavigation === 'function')
            ? window.syncSharedGradesNavigation({
                enteringGrades,
                gradesWasVisible,
                role: 'admin',
                hashWantsGradebook: String(window.location.hash || '').includes('gradebook')
            })
            : { targetTab: 'analytics' };

        sections.forEach((section) => {
            section.classList.add('hidden');
        });

        // Clear new user toast if navigating away from user accounts
        if (sectionId !== 'users-view') {
            sessionStorage.removeItem('sigma-new-user-toast');
            const toast = document.getElementById('new-user-toast-bar');
            if (toast) toast.remove();
        }

        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            // Save tab state for reloads
            sessionStorage.setItem('sigma-admin-active-tab', JSON.stringify({ sectionId, navId }));

            // Reset page residue (clear search inputs and filters)
            const inputs = targetSection.querySelectorAll('input:not([readonly])');
            inputs.forEach(input => {
                if (input.type === 'text' || input.type === 'search') input.value = '';
            });
            const selects = targetSection.querySelectorAll('select');
            selects.forEach(select => select.selectedIndex = 0);

            targetSection.classList.remove('hidden');
        }

        if (sectionId === 'user-profile-view' && typeof window.populateUserProfilePage === 'function') {
            window.populateUserProfilePage();
        }

        if (sectionId === 'school-grades-view') {
            const topbarLabel = document.getElementById('nav-context-text') || document.getElementById('header-brand-title');
            if (topbarLabel) topbarLabel.textContent = 'Grades';
            const targetTab = gradesNav.targetTab || 'analytics';
            if (window.sigmaGradesState) window.sigmaGradesState.activeTab = targetTab;
            if (typeof window.renderSigmaGradebookWorkstation === 'function') {
                window.renderSigmaGradebookWorkstation('school-grades-view', { role: 'admin', tab: targetTab });
            }
        }

        // Reset specific search states
        if (sectionId === 'users-view') {
            window.userAccountSearchState = { id: '', name: '', role: '', status: '' };
        }
        if (sectionId === 'school-subjects-view') {
            window.subjectSearchState = { code: '', name: '', type: '' };
        }
        if (sectionId === 'school-sections-view') {
            window.sectionSearchState = { name: '', room: '', grade: '' };
        }



        if (sectionId === 'user-settings-view' || navId === 'account-settings' || navId === 'nav-account-settings') {
            if (typeof window.setPortalHeader === 'function') {
                window.setPortalHeader('Account Settings');
            }
            if (typeof window.renderSettingsView === 'function') {
                window.renderSettingsView('user-settings-view', 'notifications');
            }
        } else if (sectionId === 'settings-view' || (navId && navId.startsWith('nav-settings'))) {
            if (typeof window.setPortalHeader === 'function') {
                window.setPortalHeader('System Settings');
            }
        } else if (sectionId === 'user-profile-view' || navId === 'nav-profile') {
            if (typeof window.setPortalHeader === 'function') {
                window.setPortalHeader('Interface Computer College');
            }
        } else if (sectionId === 'section-topic-content' || sectionId === 'section-topic-detail') {
            // Do not override breadcrumb header for topic workstation/materials/submissions or topic detail
        } else if (navId === 'nav-dashboard' || !navId) {
            if (typeof window.setPortalHeader === 'function') {
                window.setPortalHeader('Interface Computer College');
            }
        } else {
            const parentTitle = getParentTitleForNav(navId);
            const activeTitle = parentTitle || 'Interface Computer College';
            if (typeof window.setPortalHeader === 'function') {
                window.setPortalHeader(activeTitle);
            } else if (headerBrandTitle) {
                headerBrandTitle.textContent = activeTitle;
            }
        }

        if (sectionId === 'announcements-view') {
            renderAnnouncementActivePosts();
        }

        if (sectionId === 'users-view') {
            bindUserAccountSearch();
            renderUserAccountsTable();
        }

        if (sectionId === 'school-subjects-view') {
            bindSubjectSearch();
            renderSubjectsTable();
        }

        if (sectionId === 'school-sections-view') {
            bindSectionSearch();
            renderSectionsTable();
        }

        if (sectionId === 'dashboard-view') {
            if (typeof window.updateDashboardUserStats === 'function') {
                window.updateDashboardUserStats('all');
            }
        }

        if (sectionId === 'logs-view') {
            const logsContainer = document.getElementById('logs-terminal');
            if (logsContainer) {
                logsContainer.scrollTop = logsContainer.scrollHeight;
            }
        }

        const adminMain = document.getElementById('admin-main');
        if (adminMain) {
            adminMain.scrollTop = 0;
        }
    };

    window.switchTab = function (rawTabId, skipHashUpdate = false) {
        const tabId = String(rawTabId || '').replace(/^#/, '').replace(/_/g, '-');
        if (tabId && !tabId.includes('profile') && !tabId.includes('edit-user')) {
            window._lastActiveNavTab = tabId;
        }
        let sectionId;

        if (tabId === 'nav-users-accounts' || tabId === 'nav-users') sectionId = 'users-view';
        else if (tabId === 'nav-grades' || tabId === 'grades' || tabId === 'nav-school-grades' || tabId === 'school-grades' || tabId === 'nav-reports-gradebooks' || tabId === 'nav-gradebooks' || tabId === 'nav-reports-performance' || tabId === 'nav-analytics') sectionId = 'school-grades-view';
        else if (tabId === 'nav-school-profile') sectionId = 'school-profile-view';
        else if (tabId === 'nav-school-year') sectionId = 'school-year-view';
        else if (tabId.startsWith('topic:') || tabId.startsWith('nav-topic:')) {
            const cleanTabId = tabId.startsWith('nav-') ? tabId.replace(/^nav-/, '') : tabId;
            const subjId = decodeURIComponent(cleanTabId.split(':')[1] || '');
            if (typeof window.switchToAdminTopicPage === 'function') {
                window.switchToAdminTopicPage(subjId, '', '', !skipHashUpdate);
                return;
            }
        }
        else if (tabId.startsWith('topic-content:') || tabId.startsWith('nav-topic-content:')) {
            const cleanTabId = tabId.startsWith('nav-') ? tabId.replace(/^nav-/, '') : tabId;
            const parts = cleanTabId.split(':');
            const subjId = decodeURIComponent(parts[1] || '');
            const topIdx = parseInt(parts[2] || '0', 10) || 0;
            const tabName = parts[3] || 'videos';
            const itmIdx = (parts[4] !== undefined && parts[4] !== '' && parts[4] !== 'null') ? parseInt(parts[4], 10) : null;
            const isSubMode = cleanTabId.includes(':submission');
            if (typeof window.openTopicContent === 'function') {
                window.openTopicContent(subjId, topIdx, tabName, itmIdx, !skipHashUpdate, isSubMode ? { viewSubmission: true, _studentViewSubmissionMode: true, _sharedViewSubmissionMode: true } : {});
                return;
            }
        }
        else if (tabId === 'account-settings' || tabId === 'user-settings' || tabId === 'nav-account-settings' || tabId.startsWith('account-settings-')) {
            const subTab = tabId.replace('account-settings-', '').replace('account-settings', '').replace('user-settings', '') || 'notifications';
            if (typeof window.navigateToAccountSettings === 'function') {
                window.navigateToAccountSettings(subTab);
            }
            return;
        }
        else if (tabId === 'nav-settings' || tabId === 'nav-settings-security' || tabId === 'settings-security-view') {
            sectionId = 'settings-security-view';
            hideHeaderOverlays();
            hideSubSidebarOverlay();
            window.showSection('settings-security-view', 'nav-settings-security');
            if (typeof window.loadLoginSecuritySettings === 'function') window.loadLoginSecuritySettings();
            if (typeof window.updateAdminAccessLockdownUI === 'function') window.updateAdminAccessLockdownUI();
            if (typeof window.setupSettingsScrollSpy === 'function') window.setupSettingsScrollSpy('settings-security-view');
            if (!skipHashUpdate) window.location.hash = 'nav-settings-security';
            return;
        }
        else if (tabId === 'nav-settings-branding' || tabId === 'settings-branding-view' || tabId === 'nav-settings-preference') {
            sectionId = 'settings-branding-view';
            hideHeaderOverlays();
            hideSubSidebarOverlay();
            window.showSection('settings-branding-view', 'nav-settings-branding');
            if (typeof window.setupSettingsScrollSpy === 'function') window.setupSettingsScrollSpy('settings-branding-view');
            if (!skipHashUpdate) window.location.hash = 'nav-settings-branding';
            return;
        }
        else if (tabId === 'nav-settings-integrations' || tabId === 'settings-integrations-view' || tabId === 'nav-settings-storage' || tabId === 'nav-settings-api') {
            sectionId = 'settings-integrations-view';
            hideHeaderOverlays();
            hideSubSidebarOverlay();
            window.showSection('settings-integrations-view', 'nav-settings-integrations');
            if (typeof window.setupSettingsScrollSpy === 'function') window.setupSettingsScrollSpy('settings-integrations-view');
            if (!skipHashUpdate) window.location.hash = 'nav-settings-integrations';
            return;
        }
        else sectionId = tabId.replace('nav-', '') + '-view';

        hideHeaderOverlays();
        window.showSection(sectionId, tabId);

        if (!skipHashUpdate) {
            window.location.hash = tabId;
        }
    };

    switchTabHandler = window.switchTab;

    let branchRecords = [
        {
            name: "Interface Computer College Caloocan",
            street: "10th Avenue corner Rizal Avenue Extension",
            barangay: "Grace Park West",
            city: "Caloocan City",
            region: "NCR",
            zip: "1406",
            contact: "09947669267",
            email: "information@interface.edu.ph"
        }
    ];
    let editingBranchIndex = -1;
    let initialBranchValues = {};

    window.getSchoolBranchOptions = function () {
        return branchRecords.map((branch, index) => ({
            name: String(branch?.name || '').trim(),
            code: String(index + 1).padStart(2, '0')
        })).filter(branch => branch.name);
    };

    window.getDefaultSchoolBranch = function () {
        return branchRecords[0] ? { ...branchRecords[0], code: '01' } : { name: '', code: '01' };
    };

    window.getSchoolBranchCode = function (branchName) {
        const matchedBranch = window.getSchoolBranchOptions().find((branch) => branch.name === String(branchName || '').trim());
        return matchedBranch?.code || window.getDefaultSchoolBranch().code;
    };

    window.populateUserSchoolBranchSelect = function (selectedBranchName = '') {
        const branchSelect = document.getElementById('edit-user-school-branch');
        if (!branchSelect) return;

        const branchOptions = window.getSchoolBranchOptions();
        const fallbackBranch = window.getDefaultSchoolBranch().name;
        const resolvedBranch = branchOptions.some((branch) => branch.name === selectedBranchName)
            ? selectedBranchName
            : fallbackBranch;

        branchSelect.innerHTML = branchOptions
            .map((branch) => `<option value="${escapeHtml(branch.name)}">${escapeHtml(branch.name)}</option>`)
            .join('');
        branchSelect.value = resolvedBranch;
        branchSelect.disabled = branchOptions.length <= 1;
        branchSelect.classList.toggle('cursor-not-allowed', branchOptions.length <= 1);
        branchSelect.classList.toggle('bg-slate-100', branchOptions.length <= 1);
        branchSelect.classList.toggle('text-black/70', branchOptions.length <= 1);
        branchSelect.classList.toggle('cursor-pointer', branchOptions.length > 1);
        branchSelect.classList.toggle('bg-slate-50', branchOptions.length > 1);
        branchSelect.classList.toggle('text-black', branchOptions.length > 1);
    };

    window.syncManagedUsersToSchoolBranch = function () {
        const users = getStoredJson(USER_STORAGE_KEY, []);
        if (!Array.isArray(users) || users.length === 0) return;

        const branchOptions = window.getSchoolBranchOptions();
        const defaultBranch = branchOptions[0];
        if (!defaultBranch) return;

        let didUpdate = false;
        const nextUsers = users.map((user) => {
            if (!user || user.createdVia !== 'admin-panel') {
                return user;
            }

            const currentBranch = String(user.schoolBranch || '').trim();
            const nextBranchName = branchOptions.length === 1
                ? defaultBranch.name
                : (branchOptions.some((branch) => branch.name === currentBranch) ? currentBranch : defaultBranch.name);
            const nextBranchCode = window.getSchoolBranchCode(nextBranchName);

            if (currentBranch === nextBranchName && String(user.branchCode || '') === nextBranchCode) {
                return user;
            }

            didUpdate = true;
            return {
                ...user,
                schoolBranch: nextBranchName,
                branchCode: nextBranchCode
            };
        });

        if (didUpdate) {
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUsers));
        }
    };

    window.renderBranchTable = function () {
        const tableBody = document.getElementById('branchTableBody');
        if (!tableBody) return;

        tableBody.innerHTML = '';

        branchRecords.forEach((branch, index) => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-slate-50 transition-colors group';
            row.innerHTML = `
                <td class="px-10 py-6 text-center">
                    <button onclick="window.openBranchEditor(${index})" 
                        class="text-sm font-medium text-black text-center hover:text-[#FFD000] transition-colors cursor-pointer outline-none">
                        ${branch.name}
                    </button>
                </td>
                <td class="px-10 py-6 text-center">
                    <div class="text-sm font-medium text-black text-center">${branch.city}</div>
                </td>
                <td class="px-10 py-6 text-center">
                    <div class="flex justify-center">
                        <button onclick="window.openBranchEditor(${index})"
                            class="text-black hover:text-[#FFD000] transition-colors cursor-pointer text-lg"
                            title="Edit Branch">
                            <i class="fa-regular fa-pen-to-square text-lg"></i>
                        </button>
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
        });

        // Add placeholders for striped effect
        for (let i = branchRecords.length; i < 8; i++) {
            const row = document.createElement('tr');
            row.className = 'h-16';
            row.innerHTML = '<td></td><td></td><td></td>';
            tableBody.appendChild(row);
        }
    };

    window.openBranchEditor = function (index) {
        editingBranchIndex = index;
        const titleEl = document.getElementById('branch-editor-title');
        const saveLabel = document.getElementById('branch-save-label');

        if (titleEl) titleEl.textContent = 'Edit Branch';
        if (saveLabel) saveLabel.textContent = 'Save Changes';

        const branch = branchRecords[index];
        document.getElementById('edit-branch-name').value = branch.name;
        document.getElementById('edit-branch-street').value = branch.street;
        document.getElementById('edit-branch-barangay').value = branch.barangay;
        document.getElementById('edit-branch-city').value = branch.city;
        document.getElementById('edit-branch-region').value = branch.region;
        document.getElementById('edit-branch-zip').value = branch.zip;
        document.getElementById('edit-branch-contact').value = branch.contact;
        document.getElementById('edit-branch-email').value = branch.email;

        window.toggleBranchOverlay(true);
    };

    window.toggleBranchOverlay = function (show) {
        const overlay = document.getElementById('branch-edit-overlay');
        if (!overlay) return;

        if (show) {
            document.body.classList.add('branch-edit-mode');
            document.documentElement.style.overflow = 'hidden';
            document.body.style.overflow = 'hidden';
            overlay.classList.remove('hidden');
            overlay.scrollTop = 0;
            const formBody = document.getElementById('branch-edit-form-body');
            if (formBody) formBody.scrollTop = 0;
            // Capture initial values to detect changes
            initialBranchValues = {
                name: document.getElementById('edit-branch-name').value,
                street: document.getElementById('edit-branch-street').value,
                barangay: document.getElementById('edit-branch-barangay').value,
                city: document.getElementById('edit-branch-city').value,
                region: document.getElementById('edit-branch-region').value,
                zip: document.getElementById('edit-branch-zip').value,
                contact: document.getElementById('edit-branch-contact').value,
                email: document.getElementById('edit-branch-email').value
            };
        } else {
            overlay.classList.add('hidden');
            overlay.scrollTop = 0;
            document.body.classList.remove('branch-edit-mode');
            document.documentElement.style.overflow = '';
            document.body.style.overflow = '';
        }
    };

    window.hasBranchChanges = function () {
        const currentValues = {
            name: document.getElementById('edit-branch-name').value,
            street: document.getElementById('edit-branch-street').value,
            barangay: document.getElementById('edit-branch-barangay').value,
            city: document.getElementById('edit-branch-city').value,
            region: document.getElementById('edit-branch-region').value,
            zip: document.getElementById('edit-branch-zip').value,
            contact: document.getElementById('edit-branch-contact').value,
            email: document.getElementById('edit-branch-email').value
        };
        // Simple string comparison for equality
        return JSON.stringify(initialBranchValues) !== JSON.stringify(currentValues);
    };

    window.showBranchConfirm = function (title, desc, onProceed) {
        const overlay = document.getElementById('branch-confirm-overlay');
        const titleEl = document.getElementById('branch-confirm-title');
        const descEl = document.getElementById('branch-confirm-desc');
        const cancelBtn = document.getElementById('branch-confirm-cancel');
        const proceedBtn = document.getElementById('branch-confirm-proceed');

        if (!overlay || !titleEl || !descEl || !cancelBtn || !proceedBtn) return;

        titleEl.textContent = title;
        descEl.textContent = desc;
        overlay.classList.remove('hidden');

        const close = () => overlay.classList.add('hidden');

        cancelBtn.onclick = close;
        proceedBtn.onclick = () => {
            onProceed();
            close();
        };
    };

    window.handleBranchExit = function () {
        if (window.hasBranchChanges()) {
            window.showBranchConfirm(
                'Discard Changes?',
                'You have unsaved modifications. Are you sure you want to exit and discard all changes?',
                () => window.toggleBranchOverlay(false)
            );
        } else {
            window.toggleBranchOverlay(false);
        }
    };

    window.handleBranchDiscard = window.handleBranchExit;

    window.handleBranchSave = function () {
        const name = document.getElementById('edit-branch-name').value.trim();
        const city = document.getElementById('edit-branch-city').value.trim();

        if (!name || !city) {
            alert('Branch Name and City are required.');
            return;
        }

        window.showBranchConfirm(
            'Save Changes?',
            'Are you sure you want to apply these updates to the branch profile?',
            () => {
                const saveBtn = document.getElementById('branch-save-btn');
                const loading = document.getElementById('branch-save-loading');

                if (saveBtn && loading) {
                    saveBtn.disabled = true;
                    loading.classList.remove('hidden');

                    // Simulate API Call
                    setTimeout(() => {
                        const branchData = {
                            name: name,
                            street: document.getElementById('edit-branch-street').value.trim(),
                            barangay: document.getElementById('edit-branch-barangay').value.trim(),
                            city: city,
                            region: document.getElementById('edit-branch-region').value.trim(),
                            zip: document.getElementById('edit-branch-zip').value.trim(),
                            contact: document.getElementById('edit-branch-contact').value.trim(),
                            email: document.getElementById('edit-branch-email').value.trim()
                        };

                        branchRecords[editingBranchIndex] = branchData;
                        window.syncManagedUsersToSchoolBranch();

                        saveBtn.disabled = false;
                        loading.classList.add('hidden');
                        window.renderBranchTable();
                        syncProfileDisplay();
                        window.toggleBranchOverlay(false);
                    }, 800);
                }
            }
        );
    };

    // Initial render
    window.renderBranchTable();
    window.syncManagedUsersToSchoolBranch();

    navLinks.forEach((link) => {
        link.addEventListener('click', (event) => {
            const isGroupParent = link.dataset.toggle === 'submenu' || link.classList.contains('nav-link--group');
            const groupId = getGroupIdForNav(link.id);

            if (isGroupParent) {
                // Handled cleanly by shared sidebar.js
                return;
            }

            // For other links (Standalone or Child tabs)
            event.preventDefault();
            executeNavActionById(link.id);

            // Only clear groups if we're switching to a truly standalone section (like Home or Broadcast)
            if (!groupId) {
                clearAllGroups();
                syncSidebarGroups();
            }

            // Automatically collapse the expanded sidebar upon selecting a tab
            window.collapseSidebar?.();
        });

        // Hover behavior for standalone links in collapsed mode
        link.addEventListener('mouseenter', () => {
            if (document.body.classList.contains('sidebar-collapsed')) {
                const isGroupParent = link.dataset.toggle === 'submenu';
                // If it's a standalone link (e.g. HOME, BROADCAST), hide the active sub-sidebar overlay on hover
                if (!isGroupParent) {
                    hideSubSidebarOverlay();
                    syncSidebarGroups();
                }
            }
        });
    });

    // Add event listener for profile dropdown link
    const profileDropdownLink = document.getElementById('nav-profile-dropdown');
    if (profileDropdownLink) {
        profileDropdownLink.addEventListener('click', (event) => {
            event.preventDefault();
            executeNavActionById(profileDropdownLink.id);
        });
    }





    switchSettingsTab('appearance');
    syncSidebarGroups();

    const logoInput = document.getElementById('org-logo-file');
    if (logoInput) {
        logoInput.addEventListener('change', (event) => {
            const file = event.target.files?.[0];
            if (!file) {
                return;
            }

            const reader = new FileReader();
            reader.onload = () => {
                setOrganizationLogoPreview(reader.result);
            };
            reader.readAsDataURL(file);
        });
    }

    // --- BRANDING LOGO SYNC ---
    const brandingLogos = [
        { inputId: 'login-logo-input', previewId: 'login-logo-preview', storageKey: 'sigma-custom-login-logo', cancelId: 'login-logo-cancel' },
        { inputId: 'login-bar-logo-input', previewId: 'login-bar-logo-preview', storageKey: 'sigma-custom-login-bar-logo', cancelId: 'login-bar-logo-cancel' },
        { inputId: 'nav-logo-input', previewId: 'nav-logo-preview', storageKey: 'sigma-custom-nav-logo', cancelId: 'nav-logo-cancel' }
    ];

    brandingLogos.forEach(logo => {
        const input = document.getElementById(logo.inputId);
        const preview = document.getElementById(logo.previewId);

        // Load existing
        const saved = localStorage.getItem(logo.storageKey);
        if (saved) {
            if (preview) {
                preview.src = saved;
            }

            // Apply to live instances
            if (logo.storageKey === 'sigma-custom-nav-logo') {
                const navLogos = document.querySelectorAll('header img[alt="ICC Logo"], .sidebar img[alt="ICC Logo"]');
                navLogos.forEach(img => img.src = saved);
            }
        }

        if (input) {
            input.addEventListener('change', (e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = () => {
                    const img = new Image();
                    img.onload = () => {
                        // Compress/Downscale image to keep localStorage healthy
                        const canvas = document.createElement('canvas');
                        const MAX_WIDTH = 800; // Sufficient for any logo
                        let width = img.width;
                        let height = img.height;

                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }

                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);

                        const compressedUrl = canvas.toDataURL('image/jpeg', 0.7);
                        if (preview) {
                            preview.src = compressedUrl;
                            const cancelBtn = document.getElementById(logo.cancelId);
                            if (cancelBtn) cancelBtn.classList.remove('hidden');
                        }
                    };
                    img.src = reader.result;
                };
                reader.readAsDataURL(file);
            });
        }
    });

    window.saveBrandingSettings = () => {
        const btn = document.getElementById('branding-save-btn');
        const icon = btn?.querySelector('i');
        if (btn) btn.disabled = true;
        if (icon) {
            icon.classList.remove('hidden');
            icon.style.display = 'inline-block';
        }

        try {
            brandingLogos.forEach(logo => {
                const preview = document.getElementById(logo.previewId);
                if (preview) {
                    if (preview.src.startsWith('data:')) {
                        // Save new upload
                        localStorage.setItem(logo.storageKey, preview.src);
                    } else if (preview.src.includes('image/ICC logo.jpg')) {
                        // Reverted to default, remove from storage
                        localStorage.removeItem(logo.storageKey);
                    }
                    // If it's the existing saved URL, we just leave it as is

                    // Live update for the current page (Dashboard Navbar)
                    if (logo.storageKey === 'sigma-custom-nav-logo') {
                        const saved = localStorage.getItem(logo.storageKey);
                        const currentSrc = saved || 'image/ICC logo.jpg';
                        const navLogos = document.querySelectorAll('header img[alt="ICC Logo"], .sidebar img[alt="ICC Logo"]');
                        navLogos.forEach(img => img.src = currentSrc);
                    }
                }
            });
        } catch (err) {
            console.error('Branding Save Error:', err);
            alert('Failed to save branding. The image might be too large.');
        } finally {
            setTimeout(() => {
                if (btn) btn.disabled = false;
                if (icon) icon.style.display = 'none';
                if (window.showToast) window.showToast('Branding settings saved successfully');
                else alert('Branding settings saved successfully');
            }, 800);
        }
    };

    const profilePictureInput = document.getElementById('profile-picture-input');
    if (profilePictureInput) {
        profilePictureInput.addEventListener('change', (event) => {
            const file = event.target.files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = () => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 300;
                    const MAX_HEIGHT = 300;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    const nextImage = canvas.toDataURL('image/jpeg', 0.6);
                    if (!nextImage) return;

                    const profile = getOrganizationProfile();
                    const uploads = Array.isArray(profile.profileUploads) ? [...profile.profileUploads] : [];
                    const dedupedUploads = uploads.filter((src) => src !== nextImage);
                    dedupedUploads.unshift(nextImage);

                    // Limit school profile uploads too
                    if (dedupedUploads.length > 6) dedupedUploads.pop();

                    saveOrganizationProfile({
                        ...profile,
                        logo: nextImage,
                        profileUploads: dedupedUploads
                    });
                    syncProfileDisplay();
                    renderProfilePictureUploads();
                    profilePictureInput.value = '';
                };
                img.src = reader.result;
            };
            reader.readAsDataURL(file);
        });
    }

    const userProfilePictureInput = document.getElementById('user-profile-picture-input');
    if (userProfilePictureInput) {
        userProfilePictureInput.addEventListener('change', (event) => {
            const file = event.target.files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = () => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_SIZE = 300;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height *= MAX_SIZE / width;
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width *= MAX_SIZE / height;
                            height = MAX_SIZE;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    const nextImage = canvas.toDataURL('image/jpeg', 0.6);
                    if (!nextImage) return;

                    const target = getProfileTarget();
                    const uploads = Array.isArray(target.data.uploads) ? [...target.data.uploads] : [];
                    const dedupedUploads = uploads.filter((src) => src !== nextImage);
                    dedupedUploads.unshift(nextImage);

                    if (dedupedUploads.length > 6) dedupedUploads.pop();

                    target.data.uploads = dedupedUploads;
                    saveProfileTarget(target.data);

                    syncUserProfileDisplay();
                    renderUserProfilePictureUploads();
                    userProfilePictureInput.value = '';
                };
                img.src = reader.result;
            };
            reader.readAsDataURL(file);
        });
    }

    const registrationForm = document.getElementById('organization-registration-form');
    if (registrationForm) {
        registrationForm.addEventListener('submit', (event) => {
            event.preventDefault();

            const profile = getOrganizationProfile();
            const administratorSelect = document.getElementById('org-administrator');
            const logoPreview = document.getElementById('org-logo-preview');

            // Get values from all fields (including new ones)
            const schoolName = document.getElementById('org-school-name')?.value.trim() || DEFAULT_ORG_PROFILE.schoolName;
            const motto = registrationForm.querySelector('input[placeholder*="Excellence"]')?.value.trim() || '';
            const schoolId = registrationForm.querySelector('input[placeholder*="405123"]')?.value.trim() || '';
            const vision = registrationForm.querySelector('textarea[placeholder*="vision"]')?.value.trim() || '';
            const mission = registrationForm.querySelector('textarea[placeholder*="mission"]')?.value.trim() || '';

            const address = document.getElementById('org-school-address')?.value.trim() || DEFAULT_ORG_PROFILE.address;
            const city = document.getElementById('org-school-city')?.value.trim() || '';
            const contactNumber = document.getElementById('org-contact-number')?.value.trim() || '';
            const emailAddress = document.getElementById('org-email-address')?.value.trim() || '';
            const administratorId = administratorSelect?.value || '';
            const administratorName = administratorId
                ? administratorSelect.options[administratorSelect.selectedIndex]?.text || ''
                : '';

            const nextProfile = {
                ...profile,
                schoolName,
                motto,
                schoolId,
                vision,
                mission,
                address,
                city,
                contactNumber,
                emailAddress,
                administratorId,
                administratorName,
                logo: logoPreview?.src || profile.logo || DEFAULT_ORG_PROFILE.logo,
                location: DEFAULT_ORG_PROFILE.location,
                status: 'Active'
            };

            saveOrganizationProfile(nextProfile);
            syncProfileDisplay();
            toggleProfileEditMode();
            console.log('Institutional profile updated successfully.');
        });
    }

    window.toggleProfileEditMode = function () {
        // View is currently blank
    };

    window.toggleEditBio = function (shouldSave, index = null) {
        const panel = document.getElementById('school-profile-tab-panel');
        if (!panel) return;
        const isEditing = panel.querySelector('#edit-bio-form') !== null;

        if (isEditing) {
            if (shouldSave) {
                const title = (document.getElementById('edit-bio-title')?.value || '').trim();
                const description = (document.getElementById('edit-bio-description')?.value || '').trim();

                const profile = getOrganizationProfile();
                let nextBios = [...(profile.bios || [])];

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

                saveOrganizationProfile({
                    ...profile,
                    bios: nextBios
                });
            }
            renderSchoolProfileTab('bio');
        } else {
            const profile = getOrganizationProfile();
            const bioToEdit = (index !== null && profile.bios && profile.bios[index])
                ? profile.bios[index]
                : { title: '', description: '' };

            panel.innerHTML = `
                <div class="rounded-[28px] border border-slate-200 bg-white p-7 md:p-8 space-y-5 shadow-sm min-h-[360px] flex flex-col">
                    <div id="edit-bio-form" class="space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div class="flex items-center justify-between">
                            <h4 class="text-sm md:text-base font-bold text-black font-['Inter']">${index !== null ? 'Edit Bio' : 'Add Bio'}</h4>
                        </div>
                        <div class="space-y-4">
                            <div class="space-y-1.5">
                                <label class="text-xs font-bold text-black font-['Inter']">Title</label>
                                <input type="text" id="edit-bio-title" placeholder="e.g. Mission, Vision, Overview" maxlength="40" 
                                    value="${escapeHtml(bioToEdit.title)}"
                                    class="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium text-black outline-none focus:border-[#FFD000] transition-all font-['Inter']">
                            </div>
                            <div class="space-y-1.5">
                                <div class="flex items-center justify-between">
                                    <label class="text-xs font-bold text-black font-['Inter']">Description</label>
                                    <span id="bio-char-counter" class="text-xs font-medium text-slate-400 font-['Inter']">${bioToEdit.description.length}/500</span>
                                </div>
                                <textarea id="edit-bio-description" placeholder="Write description here..." maxlength="500" rows="4"
                                    class="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium text-black outline-none focus:border-[#FFD000] transition-all font-['Inter'] resize-none">${escapeHtml(bioToEdit.description)}</textarea>
                            </div>
                        </div>
                        <div class="flex items-center justify-between pt-2">
                            <button onclick="document.getElementById('edit-bio-title').value=''; document.getElementById('edit-bio-description').value=''; document.getElementById('bio-char-counter').textContent='0/500';" 
                                class="text-xs font-bold text-black hover:bg-slate-100 transition-all font-['Inter'] px-3 py-2 rounded-lg">Clear</button>
                            <div class="flex items-center gap-3">
                                <button onclick="window.toggleEditBio(false)" class="text-xs font-bold text-black hover:bg-slate-100 px-3.5 py-2 rounded-lg transition-colors font-['Inter']">Cancel</button>
                                <button onclick="window.toggleEditBio(true, ${index})" class="bg-[#15803d] text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-[#15803d]/90 transition-colors font-['Inter']">Save</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            const titleInput = document.getElementById('edit-bio-title');
            const descInput = document.getElementById('edit-bio-description');
            const counter = document.getElementById('bio-char-counter');

            if (descInput && counter) {
                descInput.oninput = () => {
                    counter.textContent = `${descInput.value.length}/500`;
                };
            }

            if (titleInput) titleInput.focus();
        }
    };

    function renderSchoolProfileTab(tabId = 'bio') {
        const panel = document.getElementById('school-profile-tab-panel');
        if (!panel) return;

        const profile = getOrganizationProfile();
        const bios = profile.bios || [];

        panel.innerHTML = `
            <div class="rounded-[28px] border border-slate-200 bg-white p-7 md:p-8 space-y-5 shadow-sm min-h-[360px] flex flex-col">
                <div class="flex items-center justify-between">
                    <h4 class="text-sm md:text-base font-bold text-black font-['Inter']">Bio</h4>
                    ${bios.length < 5 ? `
                        <button type="button" onclick="window.toggleEditBio()"
                            class="text-xs md:text-sm font-bold text-black hover:text-yellow-500 transition-colors flex items-center gap-1.5 font-['Inter'] cursor-pointer group">
                            <span class="group-hover:text-yellow-500 transition-colors">Add Bio</span>
                            <i class="fa-solid fa-pen text-[10px] group-hover:text-yellow-500 transition-colors"></i>
                        </button>
                    ` : ''}
                </div>

                <div id="school-profile-bio-content" class="space-y-3">
                    ${bios.length > 0 ? `
                        <div class="space-y-3">
                            ${bios.map((bio, index) => `
                                <div class="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-start justify-between group">
                                    <div class="space-y-1.5 pr-2">
                                        <h5 class="text-sm md:text-base font-bold text-black font-['Inter']">${escapeHtml(bio.title)}</h5>
                                        <p class="text-sm md:text-base text-black leading-relaxed font-['Inter']">${escapeHtml(bio.description)}</p>
                                    </div>
                                    <button type="button" class="text-slate-400 hover:text-yellow-500 transition-colors pt-0.5" onclick="window.toggleEditBio(false, ${index})">
                                        <i class="fa-solid fa-pen text-xs"></i>
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <div class="flex flex-col items-center justify-center py-12 gap-3">
                            <i class="fa-solid fa-note-sticky text-3xl text-black-fade"></i>
                            <p class="text-sm md:text-base font-bold text-black font-['Inter']">Tell Me About the School</p>
                        </div>
                    `}
                </div>
            </div>
        `;
    }

    window.switchSchoolProfileTab = function (tab) {
        const tabs = ['bio']; // Add more tabs here if needed

        tabs.forEach(t => {
            const el = document.getElementById('school-tab-' + t);
            if (!el) return;
            if (t === tab) {
                // Active: yellow text, green border, bold
                el.classList.remove('border-transparent', 'text-slate-400', 'font-normal');
                el.classList.add('border-[#15803d]', 'text-[#FFD000]', 'font-bold');
            } else {
                // Inactive
                el.classList.remove('border-[#15803d]', 'text-[#FFD000]', 'font-bold');
                el.classList.add('border-transparent', 'text-slate-400', 'font-normal');
            }
        });

        renderSchoolProfileTab(tab);
    };



    let pendingSelectedSchoolAvatarUrl = null;

    function buildSchoolAvatarSvg(seed = 0) {
        const bgColors = ['#0284c7', '#eab308', '#22c55e', '#d97706', '#0d9488', '#0284c7', '#eab308', '#16a34a', '#0d9488', '#9333ea'];
        const skinTones = ['#fde047', '#fbcfe8', '#fed7aa', '#fca5a5', '#fdba74', '#fed7aa'];
        const hairColors = ['#0f172a', '#451a03', '#78350f', '#1c1917', '#172554'];
        const shirtColors = ['#2563eb', '#9333ea', '#dc2626', '#059669', '#0d9488', '#ea580c', '#4f46e5', '#16a34a', '#0284c7', '#7c3aed'];

        const bg = bgColors[seed % bgColors.length];
        const face = skinTones[seed % skinTones.length];
        const hairColor = hairColors[seed % hairColors.length];
        const shirtColor = shirtColors[seed % shirtColors.length];

        const hasGlasses = seed % 3 === 0;
        const hasBeard = seed % 4 === 1;
        const isLongHair = seed % 2 === 0;

        const glasses = hasGlasses ? `
            <circle cx="53" cy="56" r="8" fill="none" stroke="#0f172a" stroke-width="2.5"/>
            <circle cx="75" cy="56" r="8" fill="none" stroke="#0f172a" stroke-width="2.5"/>
            <path d="M61 56h6" stroke="#0f172a" stroke-width="2.5"/>
        ` : '';

        const beard = hasBeard ? `
            <path d="M47 62c3 14 13 22 17 22s14-8 17-22c-7 2-11 3-17 3s-10-1-17-3z" fill="${hairColor}"/>
        ` : '';

        const hairShape = isLongHair ? `
            <path d="M36 48c0 24 6 38 10 42-4-8-6-20-6-32 0-14 9-28 24-28s24 14 24 28c0 12-2 24-6 32 4-4 10-18 10-42 0-18-12-32-28-32s-28 14-28 32z" fill="${hairColor}"/>
        ` : `
            <path d="M38 45c0-16 11-29 26-29s26 13 26 29c-8-6-17-9-26-9s-18 3-26 9z" fill="${hairColor}"/>
        `;

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

    function getSchoolProfileAvatars() {
        return Array.from({ length: 20 }, (_, index) => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(buildSchoolAvatarSvg(index))}`);
    }

    function isSchoolSvgAvatar(url) {
        return typeof url === 'string' && (url.startsWith('data:image/svg+xml') || url.includes('<svg'));
    }

    window.updateSchoolAvatarActionButtons = function () {
        const selectBtn = document.getElementById('school-profile-select-avatar-btn');
        const removeBtn = document.getElementById('school-profile-remove-avatar-btn');
        if (!selectBtn || !removeBtn) return;

        const profile = getOrganizationProfile();
        const currentLogo = profile.logo || DEFAULT_ORG_PROFILE.logo;
        const hasSvgAvatar = isSchoolSvgAvatar(currentLogo);

        if (pendingSelectedSchoolAvatarUrl) {
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

    window.renderSchoolGeneratedAvatars = function () {
        const container = document.getElementById('school-profile-generated-avatars');
        if (!container) return;

        const avatars = getSchoolProfileAvatars();
        const profile = getOrganizationProfile();
        const currentLogo = profile.logo || DEFAULT_ORG_PROFILE.logo;

        container.innerHTML = avatars.map((avatarUrl, index) => {
            const isSelected = (pendingSelectedSchoolAvatarUrl === avatarUrl) || (!pendingSelectedSchoolAvatarUrl && currentLogo && isSchoolSvgAvatar(currentLogo) && avatarUrl === currentLogo);
            return `
                <button type="button"
                    class="aspect-square rounded-full overflow-hidden bg-white hover:scale-105 transition-all shadow-sm cursor-pointer p-0 ${isSelected ? 'ring-4 ring-[#15803d] ring-offset-2 scale-105' : ''}"
                    onclick="window.selectSchoolGeneratedAvatar(${index})"
                    title="Avatar ${index + 1}">
                    <img src="${avatarUrl}" alt="Avatar ${index + 1}" class="w-full h-full object-cover select-none">
                </button>
            `;
        }).join('');
    };

    window.selectSchoolGeneratedAvatar = function (index) {
        const avatars = getSchoolProfileAvatars();
        if (index < 0 || index >= avatars.length) return;
        pendingSelectedSchoolAvatarUrl = avatars[index];
        window.updateSchoolAvatarActionButtons();
        window.renderSchoolGeneratedAvatars();
    };

    window.confirmAndApplySchoolAvatar = function () {
        if (!pendingSelectedSchoolAvatarUrl) return;

        const applySelected = function () {
            const profile = getOrganizationProfile();
            saveOrganizationProfile({
                ...profile,
                logo: pendingSelectedSchoolAvatarUrl
            });
            pendingSelectedSchoolAvatarUrl = null;
            syncProfileDisplay();
            window.toggleProfilePictureOverlay(false);
        };

        if (typeof window.showActionConfirm === 'function') {
            window.showActionConfirm({
                title: 'Select Avatar',
                message: 'Do you want to make this your avatar?',
                confirmText: 'Yes',
                cancelText: 'Cancel',
                icon: 'fa-circle-user',
                layout: 'grid-2',
                onConfirm: applySelected
            });
        } else {
            if (confirm('Do you want to make this your avatar?')) {
                applySelected();
            }
        }
    };

    window.confirmAndRemoveSchoolAvatar = function () {
        const performRemove = function () {
            const profile = getOrganizationProfile();
            saveOrganizationProfile({
                ...profile,
                logo: ''
            });
            pendingSelectedSchoolAvatarUrl = null;
            syncProfileDisplay();
            window.updateSchoolAvatarActionButtons();
            window.renderSchoolGeneratedAvatars();
            renderProfilePictureUploads();
            if (typeof window.closeSchoolPhotoLightbox === 'function') {
                window.closeSchoolPhotoLightbox();
            }
            if (typeof window.closeAllSchoolPhotoOptionMenus === 'function') {
                window.closeAllSchoolPhotoOptionMenus();
            }
        };

        if (typeof window.showActionConfirm === 'function') {
            window.showActionConfirm({
                title: 'Remove Profile Picture',
                message: 'Are you sure you want to remove the current profile picture?',
                type: 'delete',
                icon: 'fa-user-minus',
                confirmText: 'Remove',
                cancelText: 'Cancel',
                layout: 'grid-2',
                onConfirm: performRemove
            });
        } else {
            if (confirm('Are you sure you want to remove the current profile picture?')) {
                performRemove();
            }
        }
    };

    window.toggleProfilePictureOverlay = function (show) {
        const overlay = document.getElementById('profile-picture-overlay');
        if (!overlay) return;

        overlay.classList.toggle('hidden', !show);
        if (show) {
            pendingSelectedSchoolAvatarUrl = null;
            renderProfilePictureUploads();
            window.renderSchoolGeneratedAvatars();
            window.updateSchoolAvatarActionButtons();
        }
    };

    function resolveOrgLogoPath(src) {
        if (!src) return '';
        if (src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://') || src.startsWith('/')) {
            return src;
        }
        const isPhp = window.location.pathname.toLowerCase().includes('/php/') || window.location.pathname.toLowerCase().endsWith('.php');
        if (isPhp) {
            return src.startsWith('../') ? src : '../' + src;
        } else {
            return src.startsWith('../') ? src.substring(3) : src;
        }
    }

    let currentSchoolLightboxPhotoIdx = null;

    function ensureSharedSchoolPhotoLightbox() {
        if (document.getElementById('sigma-school-photo-lightbox')) return;
        const lightbox = document.createElement('div');
        lightbox.id = 'sigma-school-photo-lightbox';
        lightbox.className = 'fixed inset-0 bg-black/90 z-[3500] hidden flex items-center justify-center p-4 select-none';
        lightbox.onclick = function (e) {
            if (e.target === lightbox || e.target.id === 'school-lightbox-image-container') {
                window.closeSchoolPhotoLightbox();
            }
        };
        lightbox.innerHTML = `
            <!-- Top Controls (Three Dots & Close) -->
            <div class="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-3 z-[3600]" onclick="event.stopPropagation()">
                <!-- Three dots options button -->
                <div class="relative">
                    <button type="button" id="school-lightbox-options-btn"
                        onclick="window.toggleSchoolLightboxOptionsMenu(event)"
                        class="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer shadow-lg backdrop-blur-md"
                        title="Options">
                        <i class="fa-solid fa-ellipsis-vertical text-base"></i>
                    </button>
                    <!-- Lightbox Options Menu -->
                    <div id="school-lightbox-options-menu"
                        class="school-photo-options-menu hidden absolute top-14 right-0 min-w-[200px] bg-white rounded-2xl border border-slate-200 shadow-2xl z-[3700] py-1.5 overflow-hidden font-['Inter'] text-left">
                    </div>
                </div>
                <!-- Close Button -->
                <button type="button" onclick="window.closeSchoolPhotoLightbox()"
                    class="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer shadow-lg backdrop-blur-md"
                    title="Close">
                    <i class="fa-solid fa-xmark text-2xl"></i>
                </button>
            </div>

            <!-- Centered Image Container -->
            <div id="school-lightbox-image-container" class="relative max-w-full max-h-full flex items-center justify-center p-2">
                <img id="school-lightbox-image" src="" alt="Full view" class="max-h-[85vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl transition-transform" onclick="event.stopPropagation()">
            </div>
        `;
        document.body.appendChild(lightbox);

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                window.closeSchoolPhotoLightbox();
            }
        });
    }

    function getSchoolPhotoUploadsList() {
        const profile = getOrganizationProfile();
        let rawUploads = Array.isArray(profile.profileUploads) && profile.profileUploads.length
            ? profile.profileUploads
            : [DEFAULT_ORG_PROFILE.logo];

        const uploads = rawUploads.filter(src => !isSchoolSvgAvatar(src));
        if (!uploads.includes(DEFAULT_ORG_PROFILE.logo) && !uploads.some(u => u.includes('ICC logo.jpg'))) {
            uploads.unshift(DEFAULT_ORG_PROFILE.logo);
        }
        return uploads;
    }

    window.openSchoolPhotoLightbox = function (idx, event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        ensureSharedSchoolPhotoLightbox();
        const uploads = getSchoolPhotoUploadsList();
        if (idx < 0 || idx >= uploads.length) return;

        currentSchoolLightboxPhotoIdx = idx;
        const img = document.getElementById('school-lightbox-image');
        if (img) {
            img.src = resolveOrgLogoPath(uploads[idx]);
        }

        const lightbox = document.getElementById('sigma-school-photo-lightbox');
        if (lightbox) {
            lightbox.classList.remove('hidden');
        }
        const menu = document.getElementById('school-lightbox-options-menu');
        if (menu) {
            menu.classList.add('hidden');
        }
    };

    window.closeSchoolPhotoLightbox = function () {
        const lightbox = document.getElementById('sigma-school-photo-lightbox');
        if (lightbox) {
            lightbox.classList.add('hidden');
        }
        const menu = document.getElementById('school-lightbox-options-menu');
        if (menu) {
            menu.classList.add('hidden');
        }
        currentSchoolLightboxPhotoIdx = null;
    };

    window.toggleSchoolLightboxOptionsMenu = function (event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        const menu = document.getElementById('school-lightbox-options-menu');
        if (!menu || currentSchoolLightboxPhotoIdx === null) return;

        if (!menu.classList.contains('hidden')) {
            menu.classList.add('hidden');
            return;
        }

        const uploads = getSchoolPhotoUploadsList();
        const profile = getOrganizationProfile();
        const activeLogo = typeof profile.logo === 'string' ? profile.logo : DEFAULT_ORG_PROFILE.logo;
        const src = uploads[currentSchoolLightboxPhotoIdx];
        const resolvedSrc = resolveOrgLogoPath(src);
        const isCurrentAvatar = !!(activeLogo && (src === activeLogo || resolvedSrc === resolveOrgLogoPath(activeLogo)));
        const isDefault = src === DEFAULT_ORG_PROFILE.logo || src.includes('ICC logo.jpg') || resolvedSrc === resolveOrgLogoPath(DEFAULT_ORG_PROFILE.logo);

        menu.innerHTML = `
            ${isCurrentAvatar ? `
                <button type="button"
                    onclick="window.confirmAndRemoveSchoolAvatar(); window.closeSchoolPhotoLightbox();"
                    class="w-full px-4 py-2.5 flex items-center gap-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors text-left whitespace-nowrap cursor-pointer">
                    <i class="fa-solid fa-user-minus text-sm text-black w-4 text-center"></i>
                    <span>Remove profile picture</span>
                </button>
            ` : `
                <button type="button"
                    onclick="window.selectProfilePicture('${encodeURIComponent(src)}'); window.closeSchoolPhotoLightbox();"
                    class="w-full px-4 py-2.5 flex items-center gap-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors text-left whitespace-nowrap cursor-pointer">
                    <i class="fa-regular fa-circle-user text-sm text-black w-4 text-center"></i>
                    <span>Make profile picture</span>
                </button>
            `}
            ${!isDefault ? `
                <div class="h-px bg-slate-100 my-1"></div>
                <button type="button"
                    onclick="window.deleteProfilePicture('${encodeURIComponent(src)}'); window.closeSchoolPhotoLightbox();"
                    class="w-full px-4 py-2.5 flex items-center gap-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors text-left whitespace-nowrap cursor-pointer">
                    <i class="fa-solid fa-trash-can text-sm text-red-600 w-4 text-center"></i>
                    <span>Delete photo</span>
                </button>
            ` : ''}
        `;
        menu.classList.remove('hidden');
    };

    window.toggleSchoolPhotoOptionsMenu = function (idx, event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        document.querySelectorAll('.school-photo-options-menu').forEach(menu => {
            if (menu.id !== 'school-photo-options-menu-' + idx) {
                menu.classList.add('hidden');
            }
        });

        const targetMenu = document.getElementById('school-photo-options-menu-' + idx);
        if (targetMenu) {
            targetMenu.classList.toggle('hidden');
        }
    };

    window.closeAllSchoolPhotoOptionMenus = function () {
        document.querySelectorAll('.school-photo-options-menu').forEach(menu => {
            menu.classList.add('hidden');
        });
    };

    document.addEventListener('click', function () {
        if (typeof window.closeAllSchoolPhotoOptionMenus === 'function') {
            window.closeAllSchoolPhotoOptionMenus();
        }
    });

    function renderProfilePictureUploads() {
        const uploadsContainer = document.getElementById('profile-picture-uploads');
        if (!uploadsContainer) return;

        const profile = getOrganizationProfile();
        let rawUploads = Array.isArray(profile.profileUploads) && profile.profileUploads.length
            ? profile.profileUploads
            : [DEFAULT_ORG_PROFILE.logo];

        // Filter out svg avatars from photo uploads, and ensure the school logo is always included
        const uploads = rawUploads.filter(src => !isSchoolSvgAvatar(src));
        if (!uploads.includes(DEFAULT_ORG_PROFILE.logo) && !uploads.some(u => u.includes('ICC logo.jpg'))) {
            uploads.unshift(DEFAULT_ORG_PROFILE.logo);
        }

        const activeLogo = typeof profile.logo === 'string' ? profile.logo : DEFAULT_ORG_PROFILE.logo;

        if (uploads.length === 0) {
            uploadsContainer.innerHTML = `
                <div class="col-span-full py-4 text-center text-xs font-medium text-slate-400 font-['Inter']">
                    No recent photo uploads
                </div>
            `;
            return;
        }

        uploadsContainer.innerHTML = uploads.map((src, index) => {
            const resolvedSrc = resolveOrgLogoPath(src);
            const isCurrentAvatar = !!(activeLogo && (src === activeLogo || resolvedSrc === resolveOrgLogoPath(activeLogo)));
            const isDefault = src === DEFAULT_ORG_PROFILE.logo || src.includes('ICC logo.jpg') || resolvedSrc === resolveOrgLogoPath(DEFAULT_ORG_PROFILE.logo);
            const isLeftCol = (index % 2 === 0);
            const menuAlignClass = isLeftCol ? 'left-0' : 'right-0';

            return `
            <div class="photo-upload-card relative group aspect-square rounded-2xl overflow-visible bg-slate-100 shadow-sm transition-all">
                <!-- Image thumbnail: clicking opens full-screen lightbox! -->
                <img src="${resolvedSrc}" alt="School upload ${index + 1}"
                    class="w-full h-full object-contain rounded-2xl select-none cursor-pointer p-2 bg-white"
                    onclick="window.openSchoolPhotoLightbox(${index}, event)">

                <!-- Three-dots kebab button matching User Profile -->
                <button type="button"
                    class="photo-options-trigger absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-all shadow-md z-20 cursor-pointer"
                    title="Photo options"
                    onclick="window.toggleSchoolPhotoOptionsMenu(${index}, event)">
                    <i class="fa-solid fa-ellipsis-vertical text-xs"></i>
                </button>

                <!-- Options Menu Popup -->
                <div id="school-photo-options-menu-${index}"
                    class="school-photo-options-menu hidden absolute top-12 ${menuAlignClass} min-w-[185px] bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 py-1.5 overflow-hidden font-['Inter'] text-left"
                    onclick="event.stopPropagation()">
                    ${isCurrentAvatar ? `
                        <button type="button"
                            onclick="window.confirmAndRemoveSchoolAvatar()"
                            class="w-full px-4 py-2.5 flex items-center gap-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors text-left whitespace-nowrap cursor-pointer">
                            <i class="fa-solid fa-user-minus text-sm text-black w-4 text-center"></i>
                            <span>Remove profile picture</span>
                        </button>
                    ` : `
                        <button type="button"
                            onclick="window.selectProfilePicture('${encodeURIComponent(src)}')"
                            class="w-full px-4 py-2.5 flex items-center gap-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors text-left whitespace-nowrap cursor-pointer">
                            <i class="fa-regular fa-circle-user text-sm text-black w-4 text-center"></i>
                            <span>Make profile picture</span>
                        </button>
                    `}
                    ${!isDefault ? `
                        <div class="h-px bg-slate-100 my-1"></div>
                        <button type="button"
                            onclick="window.deleteProfilePicture('${encodeURIComponent(src)}')"
                            class="w-full px-4 py-2.5 flex items-center gap-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors text-left whitespace-nowrap cursor-pointer">
                            <i class="fa-solid fa-trash-can text-sm text-red-600 w-4 text-center"></i>
                            <span>Delete photo</span>
                        </button>
                    ` : ''}
                </div>
            </div>
            `;
        }).join('');
    }

    window.selectProfilePicture = function (encodedSrc) {
        const src = decodeURIComponent(encodedSrc);
        const profile = getOrganizationProfile();
        const uploads = Array.isArray(profile.profileUploads) && profile.profileUploads.length
            ? profile.profileUploads
            : [profile.logo || DEFAULT_ORG_PROFILE.logo];

        saveOrganizationProfile({
            ...profile,
            logo: src,
            profileUploads: uploads
        });
        syncProfileDisplay();
        window.toggleProfilePictureOverlay(false);
    };

    window.deleteProfilePicture = function (encodedSrc) {
        const src = decodeURIComponent(encodedSrc);
        const profile = getOrganizationProfile();
        const uploads = Array.isArray(profile.profileUploads) ? [...profile.profileUploads] : [];

        const performDelete = function () {
            const nextUploads = uploads.filter((item) => item !== src);
            const nextLogo = profile.logo === src
                ? ''
                : (profile.logo || '');

            saveOrganizationProfile({
                ...profile,
                logo: nextLogo,
                profileUploads: nextUploads
            });
            syncProfileDisplay();
            renderProfilePictureUploads();
            window.updateSchoolAvatarActionButtons();
            if (typeof window.closeSchoolPhotoLightbox === 'function') {
                window.closeSchoolPhotoLightbox();
            }
            if (typeof window.closeAllSchoolPhotoOptionMenus === 'function') {
                window.closeAllSchoolPhotoOptionMenus();
            }
        };

        if (typeof window.showActionConfirm === 'function') {
            window.showActionConfirm({
                title: 'Delete Photo',
                message: 'Are you sure you want to delete this photo from your uploads?',
                type: 'delete',
                icon: 'fa-trash-can',
                confirmText: 'Delete',
                cancelText: 'Cancel',
                layout: 'grid-2',
                onConfirm: performDelete
            });
        } else if (typeof window.showSigmaDialog === 'function') {
            window.showSigmaDialog({
                title: 'Delete Photo',
                desc: 'Are you sure you want to delete this photo from your uploads?',
                confirmText: 'Delete',
                cancelText: 'Cancel',
                isDanger: true,
                icon: 'fa-solid fa-trash-can',
                onConfirm: performDelete
            });
        } else {
            if (confirm('Are you sure you want to delete this photo from your uploads?')) {
                performDelete();
            }
        }
    };

    // Note: Profile view controller functions (toggleUserProfilePictureOverlay, renderUserProfilePictureUploads,
    // toggleUserAvatarMenu, selectUserProfilePicture, deleteUserProfilePicture, populateUserProfilePage, etc.)
    // are unified and shared via js/profile-view.js.

    function syncUserProfileDisplay() {
        if (typeof window.syncUserProfileData === 'function') {
            window.syncUserProfileData();
        }
        if (typeof window.populateUserProfilePage === 'function') {
            window.populateUserProfilePage();
        }
    }

    function syncProfileDisplay() {
        const profile = getOrganizationProfile();
        const defaultBranch = window.getDefaultSchoolBranch();
        const branchName = profile.schoolName || defaultBranch.name || `${DEFAULT_ORG_PROFILE.schoolName} ${DEFAULT_ORG_PROFILE.location}`.trim();
        const logoSrc = profile.logo || DEFAULT_ORG_PROFILE.logo;

        const branchNameEl = document.getElementById('view-school-branch-name');
        const addressEl = document.getElementById('view-address');
        const contactEl = document.getElementById('view-contact');
        const emailEl = document.getElementById('view-email');
        const logoEl = document.getElementById('view-school-logo');
        const placeholderEl = document.getElementById('view-school-logo-placeholder');

        if (branchNameEl) branchNameEl.textContent = branchName;
        if (addressEl) addressEl.textContent = defaultBranch.street || profile.address || DEFAULT_ORG_PROFILE.address;
        if (contactEl) contactEl.textContent = defaultBranch.contact || profile.contactNumber || DEFAULT_ORG_PROFILE.contactNumber;
        if (emailEl) emailEl.textContent = defaultBranch.email || profile.emailAddress || DEFAULT_ORG_PROFILE.emailAddress;
        
        if (logoEl) {
            if (profile.logo && profile.logo.trim() !== '') {
                logoEl.src = resolveOrgLogoPath(profile.logo);
                logoEl.classList.remove('hidden');
                if (placeholderEl) placeholderEl.classList.add('hidden');
            } else {
                logoEl.src = '';
                logoEl.classList.add('hidden');
                if (placeholderEl) placeholderEl.classList.remove('hidden');
            }
        }

        window.switchSchoolProfileTab('bio');
        renderProfilePictureUploads();
        syncUserProfileDisplay();
    }

    // Handle User Registration (Provisioning)
    const adminRegisterForm = document.querySelector('#provision-admin-form form');
    if (adminRegisterForm) {
        adminRegisterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const inputs = adminRegisterForm.querySelectorAll('input, select');
            const generatedUid = 'USR' + Math.floor(Math.random() * 9999).toString().padStart(4, '0');
            const rawNameParts = String(inputs[0].value || '').trim().split(/\s+/).filter(Boolean);
            const generatedLastName = rawNameParts.slice(1).join(' ') || 'User';
            const defaultBranch = window.getDefaultSchoolBranch();
            const userRole = inputs[2].value;
            let defaultPerms = { bio: true, achievements: false, subjects: false, sections: false };
            if (userRole === 'Teacher') {
                defaultPerms = { bio: true, achievements: false, subjects: true, sections: true };
            } else if (userRole === 'Student') {
                defaultPerms = { bio: true, achievements: true, subjects: true, sections: true };
            }

            const userData = {
                id: 'USER-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
                uid: generatedUid,
                firstName: rawNameParts[0] || 'New',
                lastName: generatedLastName,
                email: inputs[1].value,
                role: userRole,
                type: userRole,
                schoolBranch: defaultBranch.name,
                branchCode: defaultBranch.code,
                status: 'Active',
                regDate: new Date().toLocaleDateString(),
                createdVia: 'admin-panel',
                password: buildManagedUserPassword(generatedLastName, generatedUid),
                permissions: defaultPerms
            };

            const users = getStoredJson(USER_STORAGE_KEY, []);
            users.unshift(userData);
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(users));
            localStorage.setItem('sigma-users-list', JSON.stringify(users));

            adminRegisterForm.reset();
            toggleAdminForm();
            renderUserAccountsTable();
            populateAdministratorSelect();

            alert(`${userData.role} Account Created Successfully!`);
        });
    }

    updateGlobalSYDisplay();
    fillOrganizationForm();
    syncProfileDisplay();
    bindUserAccountSearch();
    renderUserAccountsTable();

    // ─── CHARTS INITIALIZATION ───────────────────────────────────────────
    const userChartCtx = document.getElementById('userDistributionChart');
    let userChart;

    function renderUserChart(countsArray) {
        if (!userChartCtx) return;

        const total = countsArray.reduce((a, b) => a + b, 0);
        const isEmpty = total === 0;
        const labels = isEmpty ? ['No users yet'] : ['Students', 'Teachers', 'Admins'];
        const chartData = isEmpty ? [1] : countsArray;
        const bgColors = isEmpty ? ['#e2e8f0'] : ['#15803d', '#FFD000', '#2563eb'];

        if (userChart) {
            const currentData = userChart.data.datasets[0].data;
            const currentLabels = userChart.data.labels;
            const isSame = currentData.length === chartData.length &&
                currentData.every((v, i) => v === chartData[i]) &&
                currentLabels.length === labels.length &&
                currentLabels.every((v, i) => v === labels[i]);
            if (isSame) return;

            userChart.data.labels = labels;
            userChart.data.datasets[0].data = chartData;
            userChart.data.datasets[0].backgroundColor = bgColors;
            userChart.data.datasets[0].hoverOffset = isEmpty ? 0 : 6;
            userChart.options.plugins.tooltip.enabled = !isEmpty;
            userChart.update('none');
            return;
        }

        userChart = new Chart(userChartCtx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: chartData,
                    backgroundColor: bgColors,
                    borderWidth: 0,
                    hoverOffset: isEmpty ? 0 : 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 300 },
                layout: { padding: 4 },
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: !isEmpty }
                }
            }
        });
    }

    const subjectChartCtx = document.getElementById('subjectDistributionChart');
    let subjectChart;

    function renderSubjectChart(data) {
        if (!subjectChartCtx) return;

        const total = data.reduce((a, b) => a + b, 0);
        const isEmpty = total === 0;
        const labels = isEmpty ? ['No subjects yet'] : ['Core', 'Applied', 'Specialized'];
        const chartData = isEmpty ? [1] : data;
        const bgColors = isEmpty ? ['#e2e8f0'] : ['#15803d', '#FFD000', '#0f172a'];

        if (subjectChart) {
            const currentData = subjectChart.data.datasets[0].data;
            const currentLabels = subjectChart.data.labels;
            const isSame = currentData.length === chartData.length &&
                currentData.every((v, i) => v === chartData[i]) &&
                currentLabels.length === labels.length &&
                currentLabels.every((v, i) => v === labels[i]);
            if (isSame) return;

            subjectChart.data.labels = labels;
            subjectChart.data.datasets[0].data = chartData;
            subjectChart.data.datasets[0].backgroundColor = bgColors;
            subjectChart.data.datasets[0].hoverOffset = isEmpty ? 0 : 6;
            subjectChart.options.plugins.tooltip.enabled = !isEmpty;
            subjectChart.update('none');
            return;
        }

        subjectChart = new Chart(subjectChartCtx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: chartData,
                    backgroundColor: bgColors,
                    borderWidth: 0,
                    hoverOffset: isEmpty ? 0 : 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 300 },
                layout: { padding: 4 },
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: !isEmpty }
                }
            }
        });
    }

    const sectionChartCtx = document.getElementById('sectionDistributionChart');
    let sectionChart;

    function renderSectionChart(data) {
        if (!sectionChartCtx) return;

        const total = data.reduce((a, b) => a + b, 0);
        const isEmpty = total === 0;
        const labels = isEmpty ? ['No sections yet'] : ['Grade 11', 'Grade 12'];
        const chartData = isEmpty ? [1] : data;
        const bgColors = isEmpty ? ['#e2e8f0'] : ['#15803d', '#FFD000'];

        if (sectionChart) {
            const currentData = sectionChart.data.datasets[0].data;
            const currentLabels = sectionChart.data.labels;
            const isSame = currentData.length === chartData.length &&
                currentData.every((v, i) => v === chartData[i]) &&
                currentLabels.length === labels.length &&
                currentLabels.every((v, i) => v === labels[i]);
            if (isSame) return;

            sectionChart.data.labels = labels;
            sectionChart.data.datasets[0].data = chartData;
            sectionChart.data.datasets[0].backgroundColor = bgColors;
            sectionChart.data.datasets[0].hoverOffset = isEmpty ? 0 : 6;
            sectionChart.options.plugins.tooltip.enabled = !isEmpty;
            sectionChart.update('none');
            return;
        }

        sectionChart = new Chart(sectionChartCtx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: chartData,
                    backgroundColor: bgColors,
                    borderWidth: 0,
                    hoverOffset: isEmpty ? 0 : 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 300 },
                layout: { padding: 4 },
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: !isEmpty }
                }
            }
        });
    }

    const tabOverall = document.getElementById('tab-overall-users');
    const tabActive = document.getElementById('tab-active-users');
    const tabInactive = document.getElementById('tab-inactive-users');

    function setActiveTab(activeTab) {
        [tabOverall, tabActive, tabInactive].forEach(tab => {
            if (!tab) return;
            if (tab === activeTab) {
                tab.classList.add('bg-[#15803d]', 'text-white');
                tab.classList.remove('text-black-fade', 'hover:bg-slate-100');
            } else {
                tab.classList.add('text-black-fade', 'hover:bg-slate-100');
                tab.classList.remove('bg-[#15803d]', 'text-white', 'shadow-sm');
            }
        });
    }

    window.updateDashboardUserStats = function (statusFilter = 'all') {
        if (currentOverviewPage !== 1) return;

        const users = getStoredJson(USER_STORAGE_KEY, []);
        
        let filteredUsers = users;
        if (statusFilter === 'active') {
            filteredUsers = users.filter(u => u.status === 'Active');
        } else if (statusFilter === 'inactive') {
            filteredUsers = users.filter(u => u.status === 'Inactive');
        }

        const counts = {
            admin: filteredUsers.filter(u => {
                const r = normalizeUserRole(u.role || u.type || '');
                return r === 'Admin' || r === 'Master Admin' || r.toLowerCase().includes('admin');
            }).length,
            teacher: filteredUsers.filter(u => normalizeUserRole(u.role || u.type) === 'Teacher').length,
            student: filteredUsers.filter(u => normalizeUserRole(u.role || u.type) === 'Student').length
        };


        const adminEl = document.getElementById('count-admins');
        const teacherEl = document.getElementById('count-teachers');
        const studentEl = document.getElementById('count-students');

        if (adminEl) adminEl.textContent = counts.admin;
        if (teacherEl) teacherEl.textContent = counts.teacher;
        if (studentEl) studentEl.textContent = counts.student;


        renderUserChart([counts.student, counts.teacher, counts.admin]);

    };

    if (tabOverall) {
        tabOverall.addEventListener('click', () => {
            setActiveTab(tabOverall);
            window.updateDashboardUserStats('all');
        });
    }

    if (tabActive) {
        tabActive.addEventListener('click', () => {
            setActiveTab(tabActive);
            window.updateDashboardUserStats('active');
        });
    }

    if (tabInactive) {
        tabInactive.addEventListener('click', () => {
            setActiveTab(tabInactive);
            window.updateDashboardUserStats('inactive');
        });
    }

    // Initial call
    window.updateDashboardUserStats('all');

    function updateOverviewPageUI() {
        const titleEl = document.getElementById('overview-header-title');
        const statusControls = document.getElementById('overview-status-controls');

        const titles = {
            1: 'Users Overview',
            2: 'Subjects Overview',
            3: 'Sections Overview'
        };

        if (titleEl) titleEl.textContent = titles[currentOverviewPage];

        // Only show status controls on page 1
        if (statusControls) {
            if (currentOverviewPage === 1) {
                statusControls.classList.remove('hidden');
            } else {
                statusControls.classList.add('hidden');
            }
        }

        for (let i = 1; i <= totalOverviewPages; i++) {
            const page = document.getElementById(`overview-page-${i}`);
            if (page) {
                if (i === currentOverviewPage) {
                    page.classList.remove('hidden');
                } else {
                    page.classList.add('hidden');
                }
            }
        }
    }

    const btnPrevPage = document.getElementById('prev-overview-page');
    const btnNextPage = document.getElementById('next-overview-page');

    if (btnPrevPage && btnNextPage) {
        btnPrevPage.addEventListener('click', () => {
            currentOverviewPage = currentOverviewPage > 1 ? currentOverviewPage - 1 : totalOverviewPages;
            updateOverviewPageUI();
            if (typeof updateOverviewCharts === 'function') updateOverviewCharts();
        });

        btnNextPage.addEventListener('click', () => {
            currentOverviewPage = currentOverviewPage < totalOverviewPages ? currentOverviewPage + 1 : 1;
            updateOverviewPageUI();
            if (typeof updateOverviewCharts === 'function') updateOverviewCharts();
        });
    }

    // ─── PINNED ACADEMIC CALENDAR MILESTONES ─────────────────────────────
    function renderAdminPinnedMilestones() {
        const listEl = document.getElementById('admin-pinned-milestones-list');
        if (!listEl) return;

        let milestones = [];
        try {
            const raw = localStorage.getItem('sigma-admin-pinned-milestones');
            if (raw !== null) {
                milestones = JSON.parse(raw);
            }
        } catch {
            milestones = [];
        }

        if (!milestones || milestones.length === 0) {
            listEl.innerHTML = `
                <div class="p-3 text-center flex flex-col items-center justify-center">
                    <p class="text-[11.5px] font-semibold text-black-fade leading-tight">No Events Scheduled</p>
                </div>
            `;
            return;
        }

        listEl.innerHTML = milestones.map(item => `
            <div class="pinned-milestone-item">
                <div class="w-4 h-4 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <i class="fa-solid fa-thumbtack text-[8px]"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <span class="text-[11px] font-bold text-slate-800 leading-tight cursor-pointer hover:text-[#15803d] transition-colors duration-150 block">${item.date} · ${item.title}</span>
                    <p class="text-[9.5px] text-slate-500 font-medium leading-tight mt-0.5">${item.desc}</p>
                </div>
            </div>
        `).join('');
    }

    // Initial render for Right Rail new panels
    renderAdminPinnedMilestones();

    window.renderAdminPinnedMilestones = renderAdminPinnedMilestones;

    // Real-time synchronization for user lists and overview charts
    window.addEventListener('storage', function (e) {
        if (e.key === 'sigma-admin-users' || e.key === 'sigma-users-list' || e.key === 'sigma-subjects-list' || e.key === 'sigma-sections-list') {
            if (typeof updateOverviewCharts === 'function') updateOverviewCharts();
        }
    });

    // --- Dashboard Announcements (Unified in js/announcements.js) ---
    function renderAdminAnnouncements() {
        if (window.SigmaAnnouncements && typeof window.SigmaAnnouncements.refresh === 'function') {
            window.SigmaAnnouncements.refresh();
        }
    }

    // ─── Wire all 3 overview panels to live localStorage data ───────────────
    function updateOverviewCharts() {
        // --- Users ---
        window.updateDashboardUserStats('all');

        // --- Subjects ---
        const subjects = getStoredJson(SUBJECTS_STORAGE_KEY, []);
        const coreCount       = subjects.filter(s => (s.type || s.category || '').toLowerCase() === 'core').length;
        const appliedCount    = subjects.filter(s => (s.type || s.category || '').toLowerCase() === 'applied').length;
        const specializedCount = subjects.filter(s => (s.type || s.category || '').toLowerCase() === 'specialized').length;

        const coreEl         = document.getElementById('count-core-subjects');
        const appliedEl      = document.getElementById('count-applied-subjects');
        const specializedEl  = document.getElementById('count-specialized-subjects');
        if (coreEl)        coreEl.textContent        = coreCount;
        if (appliedEl)     appliedEl.textContent     = appliedCount;
        if (specializedEl) specializedEl.textContent = specializedCount;

        renderSubjectChart([coreCount, appliedCount, specializedCount]);

        // --- Sections ---
        const sections = getStoredJson(SECTIONS_STORAGE_KEY, []);
        const grade11Count = sections.filter(s => String(s.gradeLevel || s.grade || '').includes('11')).length;
        const grade12Count = sections.filter(s => String(s.gradeLevel || s.grade || '').includes('12')).length;

        const g11El = document.getElementById('count-grade11-sections');
        const g12El = document.getElementById('count-grade12-sections');
        if (g11El) g11El.textContent = grade11Count;
        if (g12El) g12El.textContent = grade12Count;

        renderSectionChart([grade11Count, grade12Count]);
    }

    updateOverviewCharts();
});

const SYSTEM_STATUS_CONFIG = {
    operational: {
        label: 'Operational',
        message: 'All systems running normally',
        color: '#15803d',
        latency: 'Fast',
        uptime: '99.9',
        latencyPercent: '100%'
    },
    stable: {
        label: 'Stable',
        message: 'System is running with minor issues',
        color: '#2563eb',
        latency: 'Normal',
        uptime: '95.2',
        latencyPercent: '85%'
    },
    degraded: {
        label: 'Degraded',
        message: 'Some services are experiencing slowdowns',
        color: '#ca8a04',
        latency: 'Slow',
        uptime: '75.4',
        latencyPercent: '50%'
    },
    partial_outage: {
        label: 'Partial Outage',
        message: 'Some modules are currently unavailable',
        color: '#ea580c',
        latency: 'Slow',
        uptime: '55.0',
        latencyPercent: '30%'
    },
    critical: {
        label: 'Critical',
        message: 'System is experiencing major failures',
        color: '#dc2626',
        latency: 'Very Slow',
        uptime: '30.1',
        latencyPercent: '10%'
    },
    offline: {
        label: 'Offline',
        message: 'System is currently offline',
        color: '#000000',
        latency: 'Very Slow',
        uptime: '0',
        latencyPercent: '0%'
    }
};

window.updateSystemStatus = function (statusKey) {
    const config = SYSTEM_STATUS_CONFIG[statusKey];
    if (!config) return;

    const label = document.getElementById('system-status-label');
    const indicator = document.getElementById('system-status-indicator');
    const uptimeValue = document.getElementById('system-uptime-value');
    const statusMessage = document.getElementById('system-status-message');
    const latencyLabel = document.getElementById('system-latency-label');
    const latencyBar = document.getElementById('system-latency-bar');

    if (label) {
        label.innerText = config.label;
        label.style.color = config.color;
    }
    if (indicator) {
        indicator.style.backgroundColor = config.color;
    }
    if (uptimeValue) {
        uptimeValue.innerText = config.uptime;
    }
    if (statusMessage) {
        statusMessage.innerText = config.message;
    }
    if (latencyLabel) {
        latencyLabel.innerText = config.latency;
        latencyLabel.style.color = config.color;
    }
    if (latencyBar) {
        latencyBar.style.backgroundColor = config.color;
        latencyBar.style.width = config.latencyPercent;
    }
};

// Initialize with operational state
document.addEventListener('DOMContentLoaded', () => {
    const SECTIONS_GRID_ORDER_KEY = 'sigma-sections-grid-order';

    function applySavedOrder(containerId, storageKey) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const savedOrder = localStorage.getItem(storageKey);
        if (savedOrder) {
            try {
                const order = JSON.parse(savedOrder);
                order.forEach(id => {
                    const el = container.querySelector(`[data-id="${id}"]`);
                    if (el) container.appendChild(el);
                });
            } catch (e) {
                console.error("Error restoring order:", e);
            }
        }
    }

    applySavedOrder('sections-grid', SECTIONS_GRID_ORDER_KEY);

    const sectionsGrid = document.getElementById('sections-grid');
    if (sectionsGrid && typeof Sortable !== 'undefined') {
        const sectionsSortable = new Sortable(sectionsGrid, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            dragClass: 'sortable-drag',
            forceFallback: true,
            fallbackClass: 'sortable-drag',
            scroll: true,
            bubbleScroll: true,
            dataIdAttr: 'data-id',
            onStart: () => document.body.style.cursor = 'grabbing',
            onEnd: () => {
                document.body.style.cursor = '';
                const order = sectionsSortable.toArray();
                localStorage.setItem(SECTIONS_GRID_ORDER_KEY, JSON.stringify(order));
            }
        });
    }

    setTimeout(() => {
        if (typeof window.updateSystemStatus === 'function') {
            window.updateSystemStatus('operational');
        }
        if (typeof window.updateAiUsage === 'function') {
            window.updateAiUsage(42);
        }
        if (typeof window.updateStorageUsage === 'function') {
            window.updateStorageUsage(83, 12.4);
        }
    }, 500);
});

const AI_USAGE_LEVELS = [
    { max: 40, label: 'Efficient', color: '#15803d', icon: 'fa-brain' },
    { max: 60, label: 'Normal', color: '#15803d', icon: 'fa-brain' },
    { max: 75, label: 'Moderate', color: '#ca8a04', icon: 'fa-brain' },
    { max: 90, label: 'Heavy', color: '#ea580c', icon: 'fa-brain' },
    { max: 99, label: 'Critical', color: '#dc2626', icon: 'fa-triangle-exclamation' },
    { max: 100, label: 'Exceeded', color: '#dc2626', icon: 'fa-triangle-exclamation' }
];

window.updateAiUsage = function (percent) {
    const level = AI_USAGE_LEVELS.find(l => percent <= l.max) || AI_USAGE_LEVELS[AI_USAGE_LEVELS.length - 1];
    const label = document.getElementById('ai-status-label');
    const icon = document.getElementById('ai-status-icon');
    const usagePercent = document.getElementById('ai-usage-percent');
    const bar = document.getElementById('ai-usage-bar');

    if (label) {
        label.innerText = level.label;
        label.style.color = level.color;
    }
    if (icon) {
        icon.style.color = level.color;
        if (level.icon) {
            icon.className = `fa-solid ${level.icon} pocket-metric-status-icon`;
        }
    }
    if (usagePercent) {
        usagePercent.innerText = `${percent}%`;
    }
    if (bar) {
        bar.style.width = `${percent}%`;
        bar.style.backgroundColor = level.color;
    }
};

const AI_MODEL_DATA = {
    gemini: {
        daily: { requests: '1,242', percent: 42, label: 'Requests Today', sub: '(Sunday)' },
        monthly: { requests: '45,820', percent: 18, label: 'Requests in this Month', sub: '(April)' }
    },
    groq: {
        daily: { requests: '842', percent: 65, label: 'Requests Today', sub: '(Sunday)' },
        monthly: { requests: '24,150', percent: 12, label: 'Requests in this Month', sub: '(April)' }
    }
};

let currentAiModel = 'gemini';
let currentAiPeriod = 'daily';

window.setAiModel = function (model) {
    currentAiModel = model;
    const geminiBtn = document.getElementById('btn-ai-gemini');
    const groqBtn = document.getElementById('btn-ai-groq');

    if (model === 'gemini') {
        geminiBtn?.classList.add('bg-white', 'text-black', 'shadow-sm');
        geminiBtn?.classList.remove('text-black-fade');
        groqBtn?.classList.remove('bg-white', 'text-black', 'shadow-sm');
        groqBtn?.classList.add('text-black-fade');
    } else {
        groqBtn?.classList.add('bg-white', 'text-black', 'shadow-sm');
        groqBtn?.classList.remove('text-black-fade');
        geminiBtn?.classList.remove('bg-white', 'text-black', 'shadow-sm');
        geminiBtn?.classList.add('text-black-fade');
    }
    updateAiDisplay();
};

window.setAiPeriod = function (period) {
    currentAiPeriod = period;
    const dailyBtn = document.getElementById('btn-period-daily');
    const monthlyBtn = document.getElementById('btn-period-monthly');

    if (period === 'daily') {
        dailyBtn?.classList.add('bg-white', 'text-black', 'shadow-sm');
        dailyBtn?.classList.remove('text-black-fade');
        monthlyBtn?.classList.remove('bg-white', 'text-black', 'shadow-sm');
        monthlyBtn?.classList.add('text-black-fade');
    } else {
        monthlyBtn?.classList.add('bg-white', 'text-black', 'shadow-sm');
        monthlyBtn?.classList.remove('text-black-fade');
        dailyBtn?.classList.remove('bg-white', 'text-black', 'shadow-sm');
        dailyBtn?.classList.add('text-black-fade');
    }
    updateAiDisplay();
};

function updateAiDisplay() {
    const data = AI_MODEL_DATA[currentAiModel][currentAiPeriod];
    const descEl = document.getElementById('ai-period-desc');
    const reqVal = document.getElementById('ai-requests-value');
    const quotaLabel = document.getElementById('ai-quota-label');

    if (descEl) descEl.innerText = `${data.label} ${data.sub}`;
    if (reqVal) reqVal.innerText = data.requests;
    if (quotaLabel) quotaLabel.innerText = currentAiPeriod === 'daily' ? 'Daily Quota' : 'Monthly Quota';

    window.updateAiUsage(data.percent);
}

window.updateStorageUsage = function (percent, usedGB) {
    const label = document.getElementById('storage-status-label');
    const icon = document.getElementById('storage-status-icon');
    const usedValue = document.getElementById('storage-used-value');
    const percentLabel = document.getElementById('storage-percent-label');
    const bar = document.getElementById('storage-usage-bar');

    let statusLabel = 'Optimal';
    let color = '#15803d';

    if (percent > 95) {
        statusLabel = 'Critical';
        color = '#dc2626';
    } else if (percent > 85) {
        statusLabel = 'Warning';
        color = '#ea580c';
    } else if (percent > 70) {
        statusLabel = 'Notice';
        color = '#ca8a04';
    } else {
        statusLabel = 'Optimal';
        color = '#15803d';
    }

    if (label) {
        label.innerText = statusLabel;
        label.style.color = color;
    }
    if (icon) {
        icon.style.color = color;
    }
    if (usedValue && usedGB !== undefined) usedValue.innerText = usedGB;
    if (percentLabel) percentLabel.innerText = `${percent}% Full`;
    if (bar) {
        bar.style.width = `${percent}%`;
        bar.style.backgroundColor = color;
    }
};

window.updateSecurityStatus = function (statusKey) {
    const label = document.getElementById('security-status-label');
    const icon = document.getElementById('security-status-icon');
    const statusMap = {
        secure: { label: 'Secure', color: '#15803d', icon: 'fa-shield-halved' },
        warning: { label: 'Warning', color: '#ea580c', icon: 'fa-shield-halved' },
        threat: { label: 'Alert', color: '#dc2626', icon: 'fa-triangle-exclamation' }
    };
    const s = statusMap[statusKey] || statusMap.secure;
    if (label) {
        label.innerText = s.label;
        label.style.color = s.color;
    }
    if (icon) {
        icon.style.color = s.color;
        icon.className = `fa-solid ${s.icon} pocket-metric-status-icon`;
    }
};

window.updateDatabaseStatus = function (statusKey) {
    const label = document.getElementById('database-status-label');
    const icon = document.getElementById('database-status-icon');
    const statusMap = {
        healthy: { label: 'Healthy', color: '#15803d' },
        slow: { label: 'Degraded', color: '#ca8a04' },
        error: { label: 'Down', color: '#dc2626' }
    };
    const s = statusMap[statusKey] || statusMap.healthy;
    if (label) {
        label.innerText = s.label;
        label.style.color = s.color;
    }
    if (icon) {
        icon.style.color = s.color;
    }
};

// =============================================================
// SCHOOL YEAR MANAGEMENT LOGIC
// =============================================================

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
let schoolYearPaginationState = { currentPage: 1, itemsPerPage: 20 };

window.onSchoolYearPageChange = function (page) {
    schoolYearPaginationState.currentPage = page;
    renderSchoolYearTable();
    const adminMain = document.getElementById('admin-main');
    if (adminMain) adminMain.scrollTop = 0;
};

const defaultSchoolYearRecords = [
    {
        id: 'sy-2026-2027',
        yearStart: 2026,
        yearEnd: 2027,
        q1Start: '2026-08-03',
        q1End: '2026-10-16',
        q2Start: '2026-10-19',
        q2End: '2027-01-08',
        q3Start: '2027-01-11',
        q3End: '2027-03-19',
        q4Start: '2027-03-22',
        q4End: '2027-06-04',
        status: 'Active',
        isDeleted: false
    },
    {
        id: 'sy-2025-2026',
        yearStart: 2025,
        yearEnd: 2026,
        q1Start: '2025-08-04',
        q1End: '2025-10-17',
        q2Start: '2025-10-20',
        q2End: '2026-01-09',
        q3Start: '2026-01-12',
        q3End: '2026-03-20',
        q4Start: '2026-03-23',
        q4End: '2026-06-05',
        status: 'Inactive',
        isDeleted: false
    }
];

// Persistence Helpers
const saveSYToStorage = () => {
    localStorage.setItem('sigma_school_year_records', JSON.stringify(schoolYearRecords));
    localStorage.setItem('sigma-school-years', JSON.stringify(schoolYearRecords));
};

const isRecordOngoingToday = (record) => {
    if (!record || record.isDeleted) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const starts = [record.q1Start, record.q2Start, record.q3Start, record.q4Start].filter(Boolean);
    const ends = [record.q1End, record.q2End, record.q3End, record.q4End].filter(Boolean);
    if (starts.length === 0 || ends.length === 0) return false;
    const earliestStart = new Date(`${starts[0]}T00:00:00`);
    const latestEnd = new Date(`${ends[ends.length - 1]}T23:59:59`);
    return today >= earliestStart && today <= latestEnd;
};

const loadSYFromStorage = () => {
    const saved = localStorage.getItem('sigma_school_year_records') || localStorage.getItem('sigma-school-years');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
                // Enforce academic year uniqueness: keep the most complete/active entry per year
                const uniqueMap = new Map();
                parsed.forEach(record => {
                    const key = String(record.yearStart || record.id);
                    if (!uniqueMap.has(key) || record.status === 'Active') {
                        uniqueMap.set(key, record);
                    }
                });
                let records = Array.from(uniqueMap.values());
                schoolYearRecords = records;
                saveSYToStorage();
                return;
            }
        } catch (e) {
            console.error('Failed to parse school year records', e);
        }
    }

    // Default seed when no records or storage empty
    schoolYearRecords = [...defaultSchoolYearRecords];
    saveSYToStorage();
};

// Initial Load
loadSYFromStorage();

window.resetSchoolYearData = function () {
    localStorage.removeItem('sigma_sy_zero_reset_v4');
    localStorage.removeItem('sigma_sy_clean_reset_v3');
    localStorage.removeItem('sigma_school_year_records');
    localStorage.removeItem('sigma-school-years');
    loadSYFromStorage();
    if (typeof renderSchoolYearTable === 'function') renderSchoolYearTable();
    if (typeof renderSchoolYearSummaryBar === 'function') renderSchoolYearSummaryBar();
    if (typeof updateGlobalSYDisplay === 'function') updateGlobalSYDisplay();
    location.reload();
};

let initialSYValues = {};
let currentSYRecordId = null;

const formatSchoolYearDate = (value) => {
    if (!value) return '—';

    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;

    // Returns MM/DD/YYYY
    return date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
    });
};

const formatLongDate = (value) => {
    if (!value) return '';
    try {
        const date = new Date(`${value}T00:00:00`);
        if (Number.isNaN(date.getTime())) return value;
        return date.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    } catch {
        return value;
    }
};

const getSortedSchoolYearRecords = () => [...schoolYearRecords].sort((left, right) => {
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

const getActiveSchoolYearRecord = () => schoolYearRecords.find((record) => !record.isDeleted && record.status === 'Active') || null;

const getSYFormValues = () => {
    const rawStart = document.getElementById('edit-sy-year-start')?.value || '';
    const yrStart = rawStart.includes('-') ? rawStart.split('-')[0] : rawStart;
    return {
        yearStart: yrStart.trim(),
        yearEnd: document.getElementById('edit-sy-year-end').value.trim(),
        q1Start: document.getElementById('edit-sy-q1-start').value,
        q1End: document.getElementById('edit-sy-q1-end').value,
        q2Start: document.getElementById('edit-sy-q2-start').value,
        q2End: document.getElementById('edit-sy-q2-end').value,
        q3Start: document.getElementById('edit-sy-q3-start').value,
        q3End: document.getElementById('edit-sy-q3-end').value,
        q4Start: document.getElementById('edit-sy-q4-start').value,
        q4End: document.getElementById('edit-sy-q4-end').value
    };
};

const setSYFormValues = (record) => {
    window._manualActiveQuarter = null;
    window.setSYYearStartValue(record.yearStart || new Date().getFullYear());

    if (window.updateEndOptions) window.updateEndOptions();

    document.getElementById('edit-sy-year-end').value = record.yearEnd || '';
    document.getElementById('edit-sy-q1-start').value = record.q1Start || '';
    document.getElementById('edit-sy-q1-end').value = record.q1End || '';
    document.getElementById('edit-sy-q2-start').value = record.q2Start || '';
    document.getElementById('edit-sy-q2-end').value = record.q2End || '';
    document.getElementById('edit-sy-q3-start').value = record.q3Start || '';
    document.getElementById('edit-sy-q3-end').value = record.q3End || '';
    document.getElementById('edit-sy-q4-start').value = record.q4Start || '';
    document.getElementById('edit-sy-q4-end').value = record.q4End || '';

    // Apply date constraints based on year values
    window.updateSYDateConstraints();
    window.updateSYQuarterStatuses();
};

window.handleSYYearStartChange = function () {
    const startInput = document.getElementById('edit-sy-year-start');
    const endInput = document.getElementById('edit-sy-year-end');
    if (!startInput || !endInput) return;

    const currentYear = new Date().getFullYear();
    const minAllowedYear = currentSYRecordId !== null ? 1900 : currentYear;

    let yr = null;
    if (startInput.value) {
        const raw = startInput.value.replace(/[^0-9]/g, '');
        yr = parseInt(raw);
    }
    if (yr && !isNaN(yr) && yr >= minAllowedYear && yr <= 2200) {
        startInput.value = String(yr);
        endInput.value = String(yr + 1);
    } else if (yr && yr < minAllowedYear) {
        populateSYYearOptions();
    } else if (!startInput.value) {
        endInput.value = '';
    }

    window.updateSYDateConstraints();
    if (typeof window.checkSYFormValidity === 'function') {
        window.checkSYFormValidity();
    }
};

window.handleSYYearStartInput = function (event) {
    const input = event.target || document.getElementById('edit-sy-year-start');
    if (!input) return;

    // Keep numbers only, max 4 digits
    input.value = input.value.replace(/[^0-9]/g, '').slice(0, 4);

    const endInput = document.getElementById('edit-sy-year-end');
    if (input.value.length === 4) {
        const yr = parseInt(input.value);
        if (!isNaN(yr)) {
            if (endInput) endInput.value = String(yr + 1);
            window.updateSYDateConstraints();
            if (typeof window.checkSYFormValidity === 'function') {
                window.checkSYFormValidity();
            }
        }
    } else {
        if (endInput) endInput.value = '';
        window.updateSYDateConstraints();
        if (typeof window.checkSYFormValidity === 'function') {
            window.checkSYFormValidity();
        }
    }
};

window.setSYYearStartValue = function (year) {
    const startInput = document.getElementById('edit-sy-year-start');
    const endInput = document.getElementById('edit-sy-year-end');
    if (!startInput) return;

    let yr = null;
    if (year) {
        const str = String(year).replace(/[^0-9]/g, '');
        yr = parseInt(str);
    }
    if (!yr || isNaN(yr)) yr = new Date().getFullYear();

    startInput.value = String(yr);
    if (endInput) endInput.value = String(yr + 1);
};

window.toggleSYYearDropdown = function (event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    const panel = document.getElementById('sy-year-dropdown-panel');
    if (!panel) return;

    const isHidden = panel.classList.contains('hidden');
    if (isHidden) {
        window.openSYYearDropdown();
    } else {
        window.closeSYYearDropdown();
    }
};

window.openSYYearDropdown = function () {
    const panel = document.getElementById('sy-year-dropdown-panel');
    const list = document.getElementById('sy-year-dropdown-list');
    const startInput = document.getElementById('edit-sy-year-start');
    if (!panel || !list) return;

    const currentYear = new Date().getFullYear();
    const existingYearStarts = new Set(
        schoolYearRecords
            .filter(r => !r.isDeleted && (currentSYRecordId === null || r.id !== currentSYRecordId))
            .map(r => String(r.yearStart))
    );

    let firstAvailableYear = currentYear;
    while (existingYearStarts.has(String(firstAvailableYear))) {
        firstAvailableYear++;
    }

    const selectedYear = startInput ? (parseInt(startInput.value) || firstAvailableYear) : firstAvailableYear;

    // Never go back in time: minimum year is currentYear (or existing record's year if editing an older record)
    const minYear = currentSYRecordId !== null ? Math.min(currentYear, selectedYear) : currentYear;
    const maxYear = Math.max(currentYear + 8, selectedYear + 5);

    let html = '';
    for (let yr = minYear; yr <= maxYear; yr++) {
        const isSelected = yr === selectedYear;
        const isTaken = existingYearStarts.has(String(yr));

        html += `
            <button type="button"
                onclick="window.selectSYYear(${yr})"
                ${isTaken ? 'disabled title="School year already exists"' : ''}
                class="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-between ${
                    isSelected
                        ? 'sy-year-selected bg-[#15803d] text-white font-bold shadow-xs'
                        : isTaken
                            ? 'bg-slate-50/70 text-black/40 cursor-not-allowed border-b border-slate-100 last:border-b-0'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-b border-slate-100 last:border-b-0'
                }">
                <span class="${isTaken ? 'text-black/40' : ''}">${yr}</span>
                ${isSelected ? '<i class="fa-solid fa-check text-xs text-white"></i>' : (isTaken ? '<span class="text-[10px] text-black/40 font-medium">Exists</span>' : '')}
            </button>
        `;
    }

    list.innerHTML = html;
    panel.classList.remove('hidden');

    setTimeout(() => {
        const selectedBtn = list.querySelector('.sy-year-selected');
        if (selectedBtn) {
            selectedBtn.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }, 50);
};

window.closeSYYearDropdown = function () {
    const panel = document.getElementById('sy-year-dropdown-panel');
    if (panel) {
        panel.classList.add('hidden');
    }
};

window.selectSYYear = function (year) {
    window.setSYYearStartValue(year);
    window.closeSYYearDropdown();
    window.updateSYDateConstraints();
    if (typeof window.checkSYFormValidity === 'function') {
        window.checkSYFormValidity();
    }
};

if (!window._syYearDropdownInitialized) {
    window._syYearDropdownInitialized = true;
    document.addEventListener('click', (e) => {
        const container = document.getElementById('sy-year-start-container');
        const panel = document.getElementById('sy-year-dropdown-panel');
        if (panel && !panel.classList.contains('hidden')) {
            if (container && !container.contains(e.target)) {
                window.closeSYYearDropdown();
            }
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            window.closeSYYearDropdown();
        }
    });
}

const populateSYYearOptions = () => {
    const startInput = document.getElementById('edit-sy-year-start');
    const endInput = document.getElementById('edit-sy-year-end');
    if (!startInput || !endInput) return;

    const currentYear = new Date().getFullYear();

    const existingYearStarts = new Set(
        schoolYearRecords
            .filter(r => !r.isDeleted && (currentSYRecordId === null || r.id !== currentSYRecordId))
            .map(r => String(r.yearStart))
    );

    let firstAvailableYear = currentYear;
    while (existingYearStarts.has(String(firstAvailableYear))) {
        firstAvailableYear++;
    }

    if (currentSYRecordId !== null) {
        const currentRecord = schoolYearRecords.find(r => r.id === currentSYRecordId);
        if (currentRecord) {
            window.setSYYearStartValue(currentRecord.yearStart);
        }
    } else {
        window.setSYYearStartValue(firstAvailableYear);
    }

    window.updateSYDateConstraints();
};

window.updateSYDateConstraints = function () {
    const rawYearStart = document.getElementById('edit-sy-year-start')?.value;
    const yearStart = rawYearStart ? (rawYearStart.includes('-') ? rawYearStart.split('-')[0] : rawYearStart) : '';
    const rawYearEnd = document.getElementById('edit-sy-year-end')?.value;
    const yearEnd = rawYearEnd ? (rawYearEnd.includes('-') ? rawYearEnd.split('-')[0] : rawYearEnd) : (yearStart ? Number(yearStart) + 1 : '');

    const isEditing = currentSYRecordId !== null;

    const dateIds = [
        'edit-sy-q1-start', 'edit-sy-q1-end',
        'edit-sy-q2-start', 'edit-sy-q2-end',
        'edit-sy-q3-start', 'edit-sy-q3-end',
        'edit-sy-q4-start', 'edit-sy-q4-end'
    ];

    let lastDate = null;

    dateIds.forEach((id) => {
        const input = document.getElementById(id);
        if (!input) return;

        // 1. Global constraints from year selection:
        // Beginning of 1st quarter can be from January 1 of the School Year start year
        // Cannot go back to previous year (min = `${yearStart}-01-01`), but CAN go back to past days within the year
        let min = yearStart ? `${yearStart}-01-01` : '';
        let max = yearEnd ? `${yearEnd}-12-31` : '';

        // 2. Sequential constraints (Next date must be at least 1 day after the previous date)
        if (lastDate) {
            const nextDay = new Date(lastDate);
            nextDay.setDate(nextDay.getDate() + 1);
            const minStr = `${nextDay.getFullYear()}-${String(nextDay.getMonth() + 1).padStart(2, '0')}-${String(nextDay.getDate()).padStart(2, '0')}`;
            if (!min || minStr > min) min = minStr;
        }

        if (min) input.min = min; else input.removeAttribute('min');
        if (max) input.max = max; else input.removeAttribute('max');

        // 3. Validation: If current value is invalid based on new constraints, clear it (unless disabled/read-only existing record)
        if (input.value && min && input.value < min) {
            if (!isEditing || !input.disabled) {
                input.value = '';
            }
        }

        // Update lastDate for the next input in sequence
        if (input.value) {
            lastDate = input.value;
        }
    });

    window.updateSYQuarterStatuses();
    window.checkSYFormValidity();
};

window.checkSYFormValidity = function () {
    const isEditing = currentSYRecordId !== null;
    const saveBtn = document.getElementById('sy-save-btn') || document.getElementById('edit-sy-save-btn');
    if (!saveBtn) return;

    if (isEditing) {
        saveBtn.disabled = false;
        saveBtn.style.opacity = '1';
        saveBtn.style.cursor = 'pointer';
        return;
    }

    const q1Start = document.getElementById('edit-sy-q1-start')?.value;
    const q1End = document.getElementById('edit-sy-q1-end')?.value;
    const isValid = !!(q1Start && q1End);

    saveBtn.disabled = !isValid;
    saveBtn.style.opacity = isValid ? '1' : '0.5';
    saveBtn.style.cursor = isValid ? 'pointer' : 'not-allowed';
};

window.setSYActiveQuarter = function (targetQKey) {
    const qOrder = ['q1', 'q2', 'q3', 'q4'];
    const targetIdx = qOrder.indexOf(targetQKey);
    if (targetIdx === -1) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const currentRecord = currentSYRecordId !== null ? schoolYearRecords.find(r => r.id === currentSYRecordId) : null;
    const isSYActive = currentRecord ? currentRecord.status === 'Active' : false;

    // Check if the quarter is already active
    let currentActiveQ = window._manualActiveQuarter || null;
    if (!currentActiveQ) {
        for (const qKey of qOrder) {
            const startVal = document.getElementById(`edit-sy-${qKey}-start`)?.value;
            const endVal = document.getElementById(`edit-sy-${qKey}-end`)?.value;
            if (startVal) {
                const sDate = new Date(`${startVal}T00:00:00`);
                const eDate = new Date(`${endVal || startVal}T23:59:59`);
                if (today >= sDate && today <= eDate) {
                    currentActiveQ = qKey;
                    break;
                }
            }
        }
        if (!currentActiveQ && isSYActive) currentActiveQ = 'q1';
    }

    if (currentActiveQ === targetQKey) {
        return; // Already active, no action needed
    }

    const qNames = { q1: '1st Quarter', q2: '2nd Quarter', q3: '3rd Quarter', q4: '4th Quarter' };
    const qName = qNames[targetQKey] || targetQKey.toUpperCase();
    const todayFormatted = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const confirmMsg = `Are you sure you want to set ${qName} as Active? This will automatically set its start date to today (${todayFormatted}) and conclude the preceding quarter.`;

    const executeQuarterActivation = () => {
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

        const rawYearStart = document.getElementById('edit-sy-year-start')?.value;
        const yearStart = rawYearStart ? (rawYearStart.includes('-') ? rawYearStart.split('-')[0] : rawYearStart) : String(now.getFullYear());
        const rawYearEnd = document.getElementById('edit-sy-year-end')?.value;
        const yearEnd = rawYearEnd ? (rawYearEnd.includes('-') ? rawYearEnd.split('-')[0] : rawYearEnd) : String(Number(yearStart) + 1);

        const targetStartEl = document.getElementById(`edit-sy-${targetQKey}-start`);
        const targetEndEl = document.getElementById(`edit-sy-${targetQKey}-end`);

        // 1. Set the starting date of the target quarter to Today
        if (targetStartEl) {
            targetStartEl.value = todayStr;
        }

        // 2. Ensure target quarter end date is valid (after today)
        if (targetEndEl) {
            if (!targetEndEl.value || targetEndEl.value <= todayStr) {
                const defaultEnd = new Date(now);
                defaultEnd.setDate(defaultEnd.getDate() + 30);
                targetEndEl.value = `${defaultEnd.getFullYear()}-${String(defaultEnd.getMonth() + 1).padStart(2, '0')}-${String(defaultEnd.getDate()).padStart(2, '0')}`;
            }
        }

        // 3. For previous quarters (index < targetIdx):
        // The immediately preceding quarter ends on yesterday
        for (let i = targetIdx - 1; i >= 0; i--) {
            const prevKey = qOrder[i];
            const prevStartEl = document.getElementById(`edit-sy-${prevKey}-start`);
            const prevEndEl = document.getElementById(`edit-sy-${prevKey}-end`);

            if (i === targetIdx - 1) {
                if (prevEndEl) {
                    prevEndEl.value = yesterdayStr;
                }
                if (prevStartEl) {
                    if (!prevStartEl.value || prevStartEl.value > yesterdayStr) {
                        const defaultPrevStart = new Date(yesterday);
                        defaultPrevStart.setDate(defaultPrevStart.getDate() - 30);
                        prevStartEl.value = `${defaultPrevStart.getFullYear()}-${String(defaultPrevStart.getMonth() + 1).padStart(2, '0')}-${String(defaultPrevStart.getDate()).padStart(2, '0')}`;
                    }
                }
            } else {
                const nextKey = qOrder[i + 1];
                const nextStartVal = document.getElementById(`edit-sy-${nextKey}-start`)?.value;
                if (nextStartVal && prevEndEl && (!prevEndEl.value || prevEndEl.value >= nextStartVal)) {
                    const prevEndDate = new Date(nextStartVal);
                    prevEndDate.setDate(prevEndDate.getDate() - 1);
                    prevEndEl.value = `${prevEndDate.getFullYear()}-${String(prevEndDate.getMonth() + 1).padStart(2, '0')}-${String(prevEndDate.getDate()).padStart(2, '0')}`;
                }
            }
        }

        // 4. For subsequent quarters (index > targetIdx):
        // Ensure subsequent quarter starts after target quarter ends
        for (let i = targetIdx + 1; i < qOrder.length; i++) {
            const subKey = qOrder[i];
            const prevInSeq = qOrder[i - 1];
            const prevEndVal = document.getElementById(`edit-sy-${prevInSeq}-end`)?.value;
            const subStartEl = document.getElementById(`edit-sy-${subKey}-start`);
            const subEndEl = document.getElementById(`edit-sy-${subKey}-end`);

            if (prevEndVal && subStartEl && subStartEl.value && subStartEl.value <= prevEndVal) {
                const nextStartDate = new Date(prevEndVal);
                nextStartDate.setDate(nextStartDate.getDate() + 1);
                subStartEl.value = `${nextStartDate.getFullYear()}-${String(nextStartDate.getMonth() + 1).padStart(2, '0')}-${String(nextStartDate.getDate()).padStart(2, '0')}`;
                
                if (subEndEl && subEndEl.value && subEndEl.value <= subStartEl.value) {
                    const nextEndDate = new Date(nextStartDate);
                    nextEndDate.setDate(nextEndDate.getDate() + 30);
                    subEndEl.value = `${nextEndDate.getFullYear()}-${String(nextEndDate.getMonth() + 1).padStart(2, '0')}-${String(nextEndDate.getDate()).padStart(2, '0')}`;
                }
            }
        }

        window._manualActiveQuarter = targetQKey;

        // Permanently persist the updated dates into the school year records
        const recordIdToUpdate = currentSYRecordId !== null ? currentSYRecordId : (getActiveSchoolYearRecord()?.id || null);
        if (recordIdToUpdate) {
            const formVals = getSYFormValues();
            schoolYearRecords = schoolYearRecords.map(r => {
                if (r.id === recordIdToUpdate) {
                    return {
                        ...r,
                        ...formVals
                    };
                }
                return r;
            });
            saveSYToStorage();
            if (typeof renderSchoolYearTable === 'function') renderSchoolYearTable();
            if (typeof updateGlobalSYDisplay === 'function') updateGlobalSYDisplay();
            if (typeof renderSchoolYearSummaryBar === 'function') renderSchoolYearSummaryBar();
            if (typeof window.checkQuarterEndReminders === 'function') window.checkQuarterEndReminders();
        }

        window.updateSYDateConstraints();
        window.updateSYQuarterStatuses();
        window.checkSYFormValidity();

        if (typeof window.showToast === 'function') {
            window.showToast(`${qName} is now set as Active. Dates have been permanently updated.`, 'success');
        } else if (typeof window.showGlobalToast === 'function') {
            window.showGlobalToast(`${qName} is now set as Active. Dates have been permanently updated.`, 'success');
        }
    };

    if (typeof window.openAskingPanel === 'function') {
        window.openAskingPanel({
            title: `Activate ${qName}?`,
            message: confirmMsg,
            confirmText: 'Yes, Set Active',
            cancelText: 'Cancel',
            type: 'primary',
            icon: 'fa-solid fa-calendar-check text-[#15803d]',
            onConfirm: () => {
                executeQuarterActivation();
            }
        });
    } else if (typeof window.showSYConfirm === 'function') {
        window.showSYConfirm(
            `Activate ${qName}?`,
            confirmMsg,
            () => executeQuarterActivation(),
            'Yes, Set Active',
            'Cancel'
        );
    } else {
        if (confirm(confirmMsg)) {
            executeQuarterActivation();
        }
    }
};

window.updateSYQuarterStatuses = function () {
    const isEditing = currentSYRecordId !== null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const qOrder = ['q1', 'q2', 'q3', 'q4'];

    const currentRecord = isEditing ? schoolYearRecords.find(r => r.id === currentSYRecordId) : null;
    const isSYActive = currentRecord ? currentRecord.status === 'Active' : false;

    // Determine active quarter (manual override or date-based)
    let determinedActiveQ = window._manualActiveQuarter || null;
    if (!determinedActiveQ) {
        for (const qKey of qOrder) {
            const startVal = document.getElementById(`edit-sy-${qKey}-start`)?.value;
            const endVal = document.getElementById(`edit-sy-${qKey}-end`)?.value;
            if (startVal) {
                const sDate = new Date(`${startVal}T00:00:00`);
                const eDate = new Date(`${endVal || startVal}T23:59:59`);
                if (today >= sDate && today <= eDate) {
                    determinedActiveQ = qKey;
                    break;
                }
            }
        }
        // Only fallback to 'q1' if the school year itself is Active in the system
        if (!determinedActiveQ && isSYActive) {
            determinedActiveQ = 'q1';
        }
    }

    qOrder.forEach(qKey => {
        const statusBadge = document.getElementById(`edit-sy-${qKey}-status`);
        if (!statusBadge) return;

        // In Create mode, hide all quarter status badges completely
        if (!isEditing) {
            statusBadge.textContent = '';
            statusBadge.innerHTML = '';
            statusBadge.classList.add('hidden');
            return;
        }

        statusBadge.classList.remove('hidden');

        const isActive = (qKey === determinedActiveQ);

        if (isActive) {
            statusBadge.innerHTML = `
                <button type="button" onclick="window.setSYActiveQuarter('${qKey}')" 
                    title="Click to set Active"
                    class="cursor-pointer inline-flex items-center justify-end gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-[#15803d] bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition-all shadow-none">
                    <span class="w-1.5 h-1.5 rounded-full bg-[#15803d] animate-pulse shrink-0"></span>
                    <span>Active</span>
                </button>
            `;
            statusBadge.className = 'text-xs font-bold text-right flex items-center justify-end';
        } else {
            statusBadge.innerHTML = `
                <button type="button" onclick="window.setSYActiveQuarter('${qKey}')" 
                    title="Click to set this Quarter Active"
                    class="cursor-pointer inline-flex items-center justify-end gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-red-500 bg-red-50/60 hover:bg-red-100 hover:text-red-700 border border-red-200/80 transition-all shadow-none hover:scale-[1.02] active:scale-[0.98]">
                    <span>InActive</span>
                </button>
            `;
            statusBadge.className = 'text-xs font-bold text-red-500 text-right flex items-center justify-end';
        }
    });

    window.checkSYFormValidity();
};

window.checkQuarterEndReminders = function () {
    const activeRecord = getActiveSchoolYearRecord();
    if (!activeRecord) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const quarters = [
        { key: 'q1', name: '1st Quarter', nextKey: 'q2', nextName: '2nd Quarter', start: activeRecord.q1Start, end: activeRecord.q1End },
        { key: 'q2', name: '2nd Quarter', nextKey: 'q3', nextName: '3rd Quarter', start: activeRecord.q2Start, end: activeRecord.q2End },
        { key: 'q3', name: '3rd Quarter', nextKey: 'q4', nextName: '4th Quarter', start: activeRecord.q3Start, end: activeRecord.q3End },
        { key: 'q4', name: '4th Quarter', nextKey: null, nextName: 'Next School Year', start: activeRecord.q4Start, end: activeRecord.q4End }
    ];

    quarters.forEach((q) => {
        if (!q.start || !q.end) return;

        const startDate = new Date(`${q.start}T00:00:00`);
        const endDate = new Date(`${q.end}T23:59:59`);

        // Check if currently within or approaching end of quarter
        if (today >= startDate && today <= endDate) {
            const diffTime = endDate.getTime() - today.getTime();
            const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // Reminder triggered if within 7 days of quarter ending
            if (daysRemaining <= 7 && daysRemaining >= 0) {
                const nextQStart = q.nextKey ? activeRecord[`${q.nextKey}Start`] : null;
                const nextQMissing = q.nextKey && !nextQStart;

                const notifId = `sy-quarter-reminder-${activeRecord.id}-${q.key}-${today.toISOString().split('T')[0]}`;
                const storageKey = 'sigma-notifications-admin-v3';
                const existingNotifs = getStoredJson(storageKey, []);

                // Avoid duplicate daily notification
                if (!existingNotifs.some(n => n.id === notifId)) {
                    const daysLabel = daysRemaining === 0 ? 'ends today' : daysRemaining === 1 ? 'ends in 1 day' : `ends in ${daysRemaining} days`;
                    const newNotif = {
                        id: notifId,
                        senderName: 'Academic Calendar',
                        icon: 'fa-calendar-exclamation',
                        senderColor: '#15803d',
                        title: `${q.name} Ending Soon (${daysLabel})`,
                        body: `${q.name} for SY ${activeRecord.yearStart}–${activeRecord.yearEnd} ${daysLabel} (${formatSchoolYearDate(q.end)}).${nextQMissing ? ` Please configure the start and end dates for ${q.nextName}.` : ''}`,
                        timestamp: new Date().toISOString(),
                        read: false
                    };

                    existingNotifs.unshift(newNotif);
                    localStorage.setItem(storageKey, JSON.stringify(existingNotifs));

                    if (window.dispatchEvent) {
                        window.dispatchEvent(new Event('storage'));
                        window.dispatchEvent(new CustomEvent('notifications-updated'));
                    }
                }
            }
        }
    });
};

document.addEventListener('DOMContentLoaded', () => {
    populateSYYearOptions();
    renderSchoolYearSummaryBar();
    renderSchoolYearTable();
    window.checkQuarterEndReminders();

    // Bind sequential date validation and dynamic status updates
    const dateIds = [
        'edit-sy-q1-start', 'edit-sy-q1-end',
        'edit-sy-q2-start', 'edit-sy-q2-end',
        'edit-sy-q3-start', 'edit-sy-q3-end',
        'edit-sy-q4-start', 'edit-sy-q4-end'
    ];
    dateIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', () => {
                if (el.value && el.min && el.value < el.min && !el.disabled) {
                    el.value = el.min;
                }
                window.updateSYDateConstraints();
                window.updateSYQuarterStatuses();
            });
            el.addEventListener('input', () => {
                if (el.value && el.min && el.value < el.min && !el.disabled) {
                    el.value = el.min;
                }
                window.updateSYDateConstraints();
                window.updateSYQuarterStatuses();
            });
        }
    });
});

const renderSchoolYearSummaryBar = () => {
    const activeRecord = getActiveSchoolYearRecord();
    const schoolYearEl = document.getElementById('sy-bar-year');
    const quarterEl = document.getElementById('sy-bar-quarter');
    const datesContainerEl = document.getElementById('sy-bar-dates');
    const startEl = document.getElementById('sy-bar-start');
    const dividerEl = document.getElementById('sy-bar-divider');
    const endEl = document.getElementById('sy-bar-end');

    const schoolYearSpotlightEl = document.getElementById('sy-bar-year-spotlight');
    const quarterSpotlightEl = document.getElementById('sy-bar-quarter-spotlight');
    const datesContainerSpotlightEl = document.getElementById('sy-bar-dates-spotlight');
    const startSpotlightEl = document.getElementById('sy-bar-start-spotlight');
    const dividerSpotlightEl = document.getElementById('sy-bar-divider-spotlight');
    const endSpotlightEl = document.getElementById('sy-bar-end-spotlight');

    const globalDisplay = document.getElementById('global-sy-display');

    const setYear = (val) => {
        if (schoolYearEl) schoolYearEl.textContent = val;
        if (schoolYearSpotlightEl) schoolYearSpotlightEl.textContent = val;
    };
    const setQuarter = (val) => {
        if (quarterEl) quarterEl.textContent = val;
        if (quarterSpotlightEl) quarterSpotlightEl.textContent = val;
    };
    const showDates = (startVal, endVal) => {
        if (datesContainerEl) datesContainerEl.classList.remove('hidden');
        if (datesContainerSpotlightEl) datesContainerSpotlightEl.classList.remove('hidden');
        if (startEl) startEl.textContent = startVal;
        if (startSpotlightEl) startSpotlightEl.textContent = startVal;
        if (endEl) endEl.textContent = endVal;
        if (endSpotlightEl) endSpotlightEl.textContent = endVal;
        if (dividerEl) dividerEl.classList.remove('hidden');
        if (dividerSpotlightEl) dividerSpotlightEl.classList.remove('hidden');
    };
    const hideDates = () => {
        if (datesContainerEl) datesContainerEl.classList.add('hidden');
        if (datesContainerSpotlightEl) datesContainerSpotlightEl.classList.add('hidden');
    };

    const now = new Date();
    const currentYear = now.getFullYear();
    const defaultYearRange = `${currentYear}-${currentYear + 1}`;

    if (!activeRecord) {
        setYear('---- - ----');
        setQuarter('No active school year');
        hideDates();
        if (globalDisplay) globalDisplay.textContent = '';
        return;
    }

    // Determine current quarter based on today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let activeQuarterObj = null;
    let anyQuarterStarted = false;
    let hasAnyDates = false;

    const quarters = [
        { name: '1st Quarter', start: activeRecord.q1Start, end: activeRecord.q1End },
        { name: '2nd Quarter', start: activeRecord.q2Start, end: activeRecord.q2End },
        { name: '3rd Quarter', start: activeRecord.q3Start, end: activeRecord.q3End },
        { name: '4th Quarter', start: activeRecord.q4Start, end: activeRecord.q4End }
    ];

    for (const q of quarters) {
        if (q.start && q.end) {
            hasAnyDates = true;
            const startDate = new Date(`${q.start}T00:00:00`);
            const endDate = new Date(`${q.end}T23:59:59`);

            if (today >= startDate && today <= endDate) {
                activeQuarterObj = q;
            }
            if (today >= startDate) {
                anyQuarterStarted = true;
                if (!activeQuarterObj) activeQuarterObj = q;
            }
        }
    }

    let allQuartersEnded = true;
    if (anyQuarterStarted) {
        for (const q of quarters) {
            if (q.end) {
                const endDate = new Date(`${q.end}T23:59:59`);
                if (today <= endDate) {
                    allQuartersEnded = false;
                    break;
                }
            }
        }
    } else {
        allQuartersEnded = false;
    }

    const yearRange = `${activeRecord.yearStart}-${activeRecord.yearEnd}`;

    if (!hasAnyDates) {
        // NO SCHEDULE CREATED
        setYear(yearRange);
        setQuarter('End of School Year');
        hideDates();
        if (globalDisplay) globalDisplay.textContent = '';
    } else if (anyQuarterStarted && !allQuartersEnded && activeQuarterObj) {
        // ACTIVE
        const quarterText = activeQuarterObj.name || 'Transition';
        setYear(yearRange);
        setQuarter(quarterText);
        showDates(`Starts on ${formatLongDate(activeQuarterObj.start)}`, `Ends on ${formatLongDate(activeQuarterObj.end)}`);

        if (globalDisplay) {
            globalDisplay.textContent = `S.Y. ${yearRange} • ${quarterText}`;
        }
    } else if (!anyQuarterStarted) {
        // UPCOMING
        setYear(yearRange);
        setQuarter('Upcoming');
        if (quarters[0].start && quarters[0].end) {
            showDates(`Starts on ${formatLongDate(quarters[0].start)}`, `Ends on ${formatLongDate(quarters[0].end)}`);
        } else {
            hideDates();
        }
        if (globalDisplay) globalDisplay.textContent = `S.Y. ${yearRange} • Upcoming`;
    } else {
        // COMPLETED (Year has ended)
        setYear(yearRange);
        setQuarter('End of School Year');
        hideDates();
        if (globalDisplay) globalDisplay.textContent = '';
    }

    if (typeof window.bindInteractiveMetricCards === 'function') {
        window.bindInteractiveMetricCards();
    }
};

const renderSchoolYearTable = () => {
    const tableBody = document.getElementById('schoolYearTableBody');
    if (!tableBody) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let allQuarters = [];

    schoolYearRecords.filter(r => !r.isDeleted).forEach((record) => {
        const quarters = [
            { name: '1st Quarter', quarterKey: 'q1', semester: '1st Semester', start: record.q1Start, end: record.q1End, yearStart: record.yearStart, yearEnd: record.yearEnd, id: record.id, recordStatus: record.status },
            { name: '2nd Quarter', quarterKey: 'q2', semester: '1st Semester', start: record.q2Start, end: record.q2End, yearStart: record.yearStart, yearEnd: record.yearEnd, id: record.id, recordStatus: record.status },
            { name: '3rd Quarter', quarterKey: 'q3', semester: '2nd Semester', start: record.q3Start, end: record.q3End, yearStart: record.yearStart, yearEnd: record.yearEnd, id: record.id, recordStatus: record.status },
            { name: '4th Quarter', quarterKey: 'q4', semester: '2nd Semester', start: record.q4Start, end: record.q4End, yearStart: record.yearStart, yearEnd: record.yearEnd, id: record.id, recordStatus: record.status }
        ];

        quarters.forEach((q) => {
            if (q.start) {
                allQuarters.push(q);
            }
        });
    });

    // Sort by startDate DESCENDING so the latest quarters are on top
    allQuarters.sort((a, b) => new Date(b.start) - new Date(a.start));

    if (allQuarters.length === 0) {
        tableBody.innerHTML = `
            <tr id="school-year-empty-state" class="bg-white">
                <td colspan="8" class="py-32 text-center">
                    <div class="flex flex-col items-center justify-center space-y-4">
                        <i class="fa-solid fa-calendar-days text-6xl text-black-fade"></i>
                        <p class="text-base font-bold text-black font-['Inter']">No School Years Found</p>
                    </div>
                </td>
            </tr>
        `;
        const pagEl = document.getElementById('school-year-pagination-container');
        if (pagEl) pagEl.innerHTML = '';
        renderSchoolYearSummaryBar();
        return;
    }

    const totalItems = allQuarters.length;
    const startIndex = (schoolYearPaginationState.currentPage - 1) * schoolYearPaginationState.itemsPerPage;
    const paginatedQuarters = allQuarters.slice(startIndex, startIndex + schoolYearPaginationState.itemsPerPage);

    const html = paginatedQuarters.map((q, idx) => {
        let status = 'InActive';
        let statusClass = 'text-red-500';
        let rowStripe = (idx % 2 === 1) ? 'bg-slate-50/60' : '';

        // Robust date parsing (ensures local time consistency)
        const startDate = new Date(`${q.start}T00:00:00`);
        const endDate = new Date(`${q.end || q.start}T23:59:59`);

        if (today > endDate) {
            status = 'Completed';
            statusClass = 'text-black';
        } else if (q.recordStatus === 'Active' && today >= startDate && today <= endDate) {
            status = 'Active';
            statusClass = 'text-[#15803d] font-bold';
        } else {
            status = 'InActive';
            statusClass = 'text-red-500';
        }

        return `
            <tr class="transition-all hover:bg-slate-50 ${rowStripe}">
                <td class="px-4 py-4 text-center">
                    <div class="text-[14px] font-normal text-black font-['Inter'] tracking-wide">${totalItems - (startIndex + idx)}</div>
                </td>
                <td class="px-4 py-4 text-center">
                    <div class="text-[14px] font-normal text-black font-['Inter'] tracking-wide">${q.yearStart}</div>
                </td>
                <td class="px-4 py-4 text-center border-r border-slate-200">
                    <div class="text-[14px] font-normal text-black font-['Inter'] tracking-wide">${q.yearEnd}</div>
                </td>
                <td class="px-4 py-4 text-center">
                    <div class="text-[14px] font-normal text-black font-['Inter'] tracking-tight">${q.name}</div>
                </td>
                <td class="px-4 py-4 text-center">
                    <div class="text-[14px] font-normal text-black font-['Inter'] tracking-wide">${formatSchoolYearDate(q.start)}</div>
                </td>
                <td class="px-4 py-4 text-center border-r border-slate-200">
                    <div class="text-[14px] font-normal text-black font-['Inter'] tracking-wide">${formatSchoolYearDate(q.end)}</div>
                </td>
                <td class="px-4 py-4 text-center">
                    <div class="text-[14px] font-medium ${statusClass} font-['Inter'] tracking-wide">${status}</div>
                </td>
                <td class="px-4 py-4 text-center">
                    <div class="flex justify-center">
                        <button type="button" onclick="window.openSYEditor('${q.id}', '${q.quarterKey}')" class="sy-table-edit-btn text-black hover:text-[#FFD000] transition-colors cursor-pointer text-base bg-transparent border-0 p-1" title="Edit ${q.name}">
                            <i class="fa-solid fa-pen-to-square transition-colors"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    tableBody.innerHTML = html;

    // Fill remaining rows to reach itemsPerPage (20) to keep the table height fixed
    const syItemsPerPage = schoolYearPaginationState.itemsPerPage;
    const syRemainingRows = syItemsPerPage - paginatedQuarters.length;
    if (syRemainingRows > 0) {
        for (let i = 0; i < syRemainingRows; i++) {
            const rowIndex = paginatedQuarters.length + i;
            const stripeBg = rowIndex % 2 === 1 ? 'bg-slate-50/60' : '';
            const emptyRow = `
                <tr class="border-transparent ${stripeBg}">
                    <td class="px-4 py-4 text-center"><div class="text-[14px]">&nbsp;</div></td>
                    <td class="px-4 py-4 text-center"><div class="text-[14px]">&nbsp;</div></td>
                    <td class="px-4 py-4 text-center border-r border-slate-200"><div class="text-[14px]">&nbsp;</div></td>
                    <td class="px-4 py-4 text-center"><div class="text-[14px]">&nbsp;</div></td>
                    <td class="px-4 py-4 text-center"><div class="text-[14px]">&nbsp;</div></td>
                    <td class="px-4 py-4 text-center border-r border-slate-200"><div class="text-[14px]">&nbsp;</div></td>
                    <td class="px-4 py-4 text-center"><div class="text-[14px]">&nbsp;</div></td>
                    <td class="px-4 py-4 text-center"><div class="text-[14px]">&nbsp;</div></td>
                </tr>
            `;
            tableBody.innerHTML += emptyRow;
        }
    }

    renderPaginationControls('school-year-pagination-container', totalItems, schoolYearPaginationState, 'onSchoolYearPageChange');
    renderSchoolYearSummaryBar();
};

let isOpenedFromSYManager = false;

window.openSYEditor = function (recordId = null, targetQuarterKey = null, fromManager = false) {
    const overlay = document.getElementById('sy-edit-overlay');
    const title = document.getElementById('sy-editor-title');
    const saveLabel = document.getElementById('sy-save-label');
    if (!overlay || !title || !saveLabel) return;

    isOpenedFromSYManager = !!fromManager;

    const deleteBtn = document.getElementById('sy-delete-btn');

    const existingRecord = recordId !== null ? schoolYearRecords.find((record) => String(record.id) === String(recordId)) : null;
    const activeRecord = getActiveSchoolYearRecord();

    currentSYRecordId = existingRecord ? existingRecord.id : null;
    populateSYYearOptions();

    if (existingRecord) {
        deleteBtn?.classList.remove('hidden');
    } else {
        deleteBtn?.classList.add('hidden');
    }

    if (existingRecord) {
        setSYFormValues(existingRecord);
        title.textContent = 'Edit School Year';
        saveLabel.textContent = 'Save Changes';
    } else {
        const currentYear = new Date().getFullYear();
        const existingYearStarts = new Set(
            schoolYearRecords
                .filter(r => !r.isDeleted && (currentSYRecordId === null || r.id !== currentSYRecordId))
                .map(r => String(r.yearStart))
        );
        let firstAvailableYear = currentYear;
        while (existingYearStarts.has(String(firstAvailableYear))) {
            firstAvailableYear++;
        }

        setSYFormValues({
            yearStart: String(firstAvailableYear),
            yearEnd: String(firstAvailableYear + 1),
            semester: activeRecord?.semester || '1st Semester',
            quarter: activeRecord?.quarter || '1st Quarter',
            dateStart: '',
            dateEnd: '',
            status: 'Inactive'
        });
        title.textContent = 'Create School Year';
        saveLabel.textContent = 'Create School Year';
    }

    // Configure locked/unlocked states: if editing a specific quarter, lock year start and other quarters
    const yearStartSelect = document.getElementById('edit-sy-year-start');
    if (yearStartSelect) {
        if (targetQuarterKey) {
            yearStartSelect.disabled = true;
            yearStartSelect.classList.add('cursor-not-allowed', 'opacity-60');
        } else {
            yearStartSelect.disabled = false;
            yearStartSelect.classList.remove('cursor-not-allowed', 'opacity-60');
        }
    }

    const allQuarterKeys = ['q1', 'q2', 'q3', 'q4'];
    allQuarterKeys.forEach(qKey => {
        const startInput = document.getElementById(`edit-sy-${qKey}-start`);
        const endInput = document.getElementById(`edit-sy-${qKey}-end`);
        const isEditable = !targetQuarterKey || (qKey === targetQuarterKey);

        if (startInput) {
            startInput.disabled = !isEditable;
            startInput.readOnly = !isEditable;
            if (!isEditable) {
                startInput.classList.add('cursor-not-allowed', 'opacity-60');
            } else {
                startInput.classList.remove('cursor-not-allowed', 'opacity-60');
            }
        }
        if (endInput) {
            endInput.disabled = !isEditable;
            endInput.readOnly = !isEditable;
            if (!isEditable) {
                endInput.classList.add('cursor-not-allowed', 'opacity-60');
            } else {
                endInput.classList.remove('cursor-not-allowed', 'opacity-60');
            }
        }
    });

    document.body.classList.add('sy-edit-mode');
    overlay.classList.remove('hidden');
    overlay.scrollTop = 0;
    if (typeof window.pushModalHistoryState === 'function') {
        window.pushModalHistoryState('sy-edit-overlay');
    }
    initialSYValues = getSYFormValues();
    window.checkSYFormValidity();
};

window.toggleSYOverlay = function (show) {
    const overlay = document.getElementById('sy-edit-overlay');
    if (!overlay) return;

    if (typeof window.closeSYYearDropdown === 'function') {
        window.closeSYYearDropdown();
    }

    if (show) {
        window.openSYEditor();
        return;
    }

    overlay.classList.add('hidden');
    overlay.scrollTop = 0;
    document.body.classList.remove('sy-edit-mode');
    currentSYRecordId = null;
};

window.hasSYChanges = function () {
    return JSON.stringify(initialSYValues) !== JSON.stringify(getSYFormValues());
};

window.handleSYExit = function () {
    const doExit = () => {
        window.toggleSYOverlay(false);
    };

    if (typeof window.hasSYChanges === 'function' && window.hasSYChanges()) {
        if (typeof window.openAskingPanel === 'function') {
            window.openAskingPanel({
                title: 'Discard Changes?',
                desc: 'You have unsaved changes in this school year setup. Are you sure you want to discard them and leave?',
                type: 'warning',
                confirmText: 'Discard',
                cancelText: 'Stay',
                showCancel: true,
                onConfirm: doExit
            });
            return;
        } else if (confirm('You have unsaved changes in this school year setup. Are you sure you want to discard them and leave?')) {
            doExit();
            return;
        }
        return;
    }

    doExit();
};

window.showSYConfirm = function (title, desc, onProceed, proceedLabel = 'Proceed', cancelLabel = 'Cancel') {
    const overlay = document.getElementById('sy-confirm-overlay');
    const titleEl = document.getElementById('sy-confirm-title');
    const descEl = document.getElementById('sy-confirm-desc');
    const cancelBtn = document.getElementById('sy-confirm-cancel');
    const proceedBtn = document.getElementById('sy-confirm-proceed');

    if (!overlay || !titleEl || !descEl || !cancelBtn || !proceedBtn) return;

    titleEl.textContent = title;
    descEl.textContent = desc;
    proceedBtn.textContent = proceedLabel;
    cancelBtn.textContent = cancelLabel;

    cancelBtn.className = 'sigma-btn sigma-btn-ghost sigma-btn-lg text-black cursor-pointer';

    // Use red button only for permanent delete, shared primary green for archive, activate, restore, and normal actions
    const lowerLabel = (proceedLabel || '').toLowerCase();
    if (lowerLabel.includes('permanent') || lowerLabel === 'delete') {
        proceedBtn.className = 'sigma-btn sigma-btn-danger sigma-btn-lg cursor-pointer';
    } else {
        proceedBtn.className = 'sigma-btn sigma-btn-primary sigma-btn-lg cursor-pointer';
    }

    overlay.classList.remove('hidden');

    const close = () => overlay.classList.add('hidden');

    cancelBtn.onclick = close;
    proceedBtn.onclick = () => {
        onProceed();
        close();
    };
};

/* SCHOOL YEAR MANAGER (Directory & Archive Bin) */
let currentSYManagerTab = 'active';

window.isCurrentMasterAdmin = function () {
    const user = typeof window.getLoggedInAdminUser === 'function' ? window.getLoggedInAdminUser() : null;
    if (user) {
        const role = typeof normalizeUserRole === 'function' ? normalizeUserRole(user.role || user.type) : (user.role || user.type || '');
        if (role === 'Master Admin' || String(user.uid || user.id) === '0000000' || !!user.isMaster) return true;
        if (role === 'Admin' || role === 'Teacher' || role === 'Student') return false;
    }
    const authUser = (function(){ try { return JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}'); } catch(e){ return {}; } })();
    const userProfile = getStoredJson('sigma_user_profile', {});
    const loggedUser = { ...userProfile, ...authUser };
    const userRole = (loggedUser.role || loggedUser.type || '').trim().toLowerCase();
    return !userRole || userRole === 'master admin' || userRole === 'super admin';
};

window.openSYManager = function () {
    const isMaster = window.isCurrentMasterAdmin();
    const canDeleteSY = isMaster || (typeof window.canCurrentAdminDelete === 'function' && window.canCurrentAdminDelete('schoolYear'));
    
    const archivedBtn = document.getElementById('sy-tab-archived-btn');
    if (archivedBtn) {
        archivedBtn.classList.toggle('hidden', !isMaster);
    }

    const trashBtn = document.getElementById('sy-tab-trash-btn');
    if (trashBtn) {
        trashBtn.classList.toggle('hidden', !canDeleteSY);
    }

    window.switchSYManagerTab('active');
    const overlay = document.getElementById('sy-manager-overlay');
    if (!overlay) return;
    document.body.classList.add('sy-edit-mode');
    overlay.classList.remove('hidden');
    overlay.scrollTop = 0;
    if (typeof window.pushModalHistoryState === 'function') {
        window.pushModalHistoryState('sy-manager-overlay');
    }
};

window.toggleSYManager = function (show = false) {
    const overlay = document.getElementById('sy-manager-overlay');
    if (!overlay) return;
    if (show) {
        window.openSYManager();
    } else {
        overlay.classList.add('hidden');
        document.body.classList.remove('sy-edit-mode');
    }
};

window.switchSYManagerTab = function (tab) {
    const isMaster = window.isCurrentMasterAdmin();
    const canDeleteSY = isMaster || (typeof window.canCurrentAdminDelete === 'function' && window.canCurrentAdminDelete('schoolYear'));
    if (tab === 'archived' && !isMaster) {
        tab = 'active';
    }
    if (tab === 'trash' && !canDeleteSY) {
        tab = 'active';
    }
    currentSYManagerTab = tab;
    const activeBtn = document.getElementById('sy-tab-active-btn');
    const archivedBtn = document.getElementById('sy-tab-archived-btn');
    const trashBtn = document.getElementById('sy-tab-trash-btn');

    if (archivedBtn) {
        archivedBtn.classList.toggle('hidden', !isMaster);
    }
    if (trashBtn) {
        trashBtn.classList.toggle('hidden', !canDeleteSY);
    }

    const activeBadge = document.getElementById('sy-active-count-badge');
    const archivedBadge = document.getElementById('sy-archived-count-badge');
    const trashBadge = document.getElementById('sy-trash-count-badge');

    [
        { btn: activeBtn, badge: activeBadge, id: 'active' },
        { btn: archivedBtn, badge: archivedBadge, id: 'archived' },
        { btn: trashBtn, badge: trashBadge, id: 'trash' }
    ].forEach(({ btn, badge, id }) => {
        if (!btn) return;
        if (id === tab) {
            btn.classList.add('bg-white', 'shadow-sm');
            btn.classList.remove('text-black-fade', 'text-black');
            btn.style.color = '#000';
            btn.style.backgroundColor = '';
            if (badge) {
                badge.classList.add('bg-slate-100');
                badge.classList.remove('bg-slate-200', 'text-black-fade', 'text-black');
                badge.style.color = '#000';
            }
        } else {
            btn.classList.remove('bg-white', 'shadow-sm', 'text-black', 'text-black-fade');
            btn.style.color = 'rgba(0,0,0,0.50)';
            btn.style.backgroundColor = '';
            if (badge) {
                badge.classList.remove('bg-slate-100', 'text-black', 'text-black-fade');
                badge.classList.add('bg-slate-200');
                badge.style.color = 'rgba(0,0,0,0.50)';
            }
        }
    });

    window.renderSYManagerList();
};

window.toggleSYActionDropdown = function (event, recordId) {
    if (event) event.stopPropagation();
    const dropdown = document.getElementById(`sy-dropdown-${recordId}`);
    const btn = event ? event.currentTarget : null;
    const isCurrentlyOpen = dropdown && !dropdown.classList.contains('hidden');

    window.closeAllSYDropdowns();

    if (!isCurrentlyOpen && dropdown) {
        dropdown.classList.remove('hidden');
        if (btn) {
            btn.classList.add('bg-slate-100', 'border-slate-200');
            window.positionActionDropdown(dropdown, btn);
        }
    }
};

window.closeAllSYDropdowns = function () {
    document.querySelectorAll('.sy-action-dropdown').forEach(el => {
        el.classList.add('hidden');
        el.classList.remove('dropup');
    });
    document.querySelectorAll('.sy-dots-btn').forEach(btn => {
        btn.classList.remove('bg-slate-100', 'border-slate-200', '!text-[#FFD000]', 'bg-amber-50', 'border-amber-200');
        const icon = btn.querySelector('i');
        if (icon) icon.classList.remove('!text-[#FFD000]');
    });
};

if (!window._syDropdownClickAttached) {
    window._syDropdownClickAttached = true;
    document.addEventListener('click', function (e) {
        if (!e.target.closest('.sy-action-dropdown-container')) {
            window.closeAllSYDropdowns();
        }
    });
}

window.renderSYManagerList = function () {
    const listContainer = document.getElementById('sy-manager-list');
    const activeCountBadge = document.getElementById('sy-active-count-badge');
    const archivedCountBadge = document.getElementById('sy-archived-count-badge');
    const trashCountBadge = document.getElementById('sy-trash-count-badge');
    if (!listContainer) return;

    const isMaster = window.isCurrentMasterAdmin();
    const canDeleteSY = isMaster || (typeof window.canCurrentAdminDelete === 'function' && window.canCurrentAdminDelete('schoolYear'));

    const archivedBtn = document.getElementById('sy-tab-archived-btn');
    if (archivedBtn) {
        archivedBtn.classList.toggle('hidden', !isMaster);
    }
    const trashBtn = document.getElementById('sy-tab-trash-btn');
    if (trashBtn) {
        trashBtn.classList.toggle('hidden', !canDeleteSY);
    }

    const activeYears = schoolYearRecords.filter(r => !r.isDeleted && r.status !== 'Completed (Archived)');
    const archivedYears = schoolYearRecords.filter(r => !r.isDeleted && r.status === 'Completed (Archived)');
    const trashYears = schoolYearRecords.filter(r => !!r.isDeleted);

    if (activeCountBadge) activeCountBadge.textContent = activeYears.length;
    if (archivedCountBadge) archivedCountBadge.textContent = archivedYears.length;
    if (trashCountBadge) trashCountBadge.textContent = trashYears.length;

    let currentList = [];
    if (currentSYManagerTab === 'active') currentList = activeYears;
    else if (currentSYManagerTab === 'archived') currentList = archivedYears;
    else if (currentSYManagerTab === 'trash') currentList = trashYears;

    if (currentList.length === 0) {
        let emptyIcon = 'fa-calendar-xmark';
        let emptyTitle = 'No academic years found';
        let emptyDesc = 'Create a school year to get started.';

        if (currentSYManagerTab === 'archived') {
            emptyIcon = 'fa-box-archive';
            emptyTitle = 'No archived school years';
            emptyDesc = 'Completed or archived school years will appear here.';
        } else if (currentSYManagerTab === 'trash') {
            emptyIcon = 'fa-trash-can';
            emptyTitle = 'Trash bin is empty';
            emptyDesc = 'Deleted school years will appear here.';
        }

        listContainer.innerHTML = `
            <div class="py-24 text-center border-2 border-dashed border-slate-200 rounded-3xl p-8 bg-slate-50/50">
                <div class="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-sm border border-slate-100 mb-4">
                    <i class="fa-solid ${emptyIcon} text-2xl text-black-fade icon-black-fade"></i>
                </div>
                <p class="text-base font-bold text-black">${emptyTitle}</p>
                <p class="text-xs text-black-fade font-medium mt-1">${emptyDesc}</p>
            </div>
        `;
        return;
    }

    listContainer.innerHTML = currentList.map(record => {
        const isCurrentActive = record.status === 'Active';
        const yearTitle = `${record.yearStart} - ${record.yearEnd}`;
        
        let quarterCount = 0;
        ['q1', 'q2', 'q3', 'q4'].forEach(k => {
            if (record[`${k}Start`] && record[`${k}End`]) quarterCount++;
        });

        if (currentSYManagerTab === 'active') {
            const cardBgStyle = isCurrentActive 
                ? 'bg-[#eaf7ee] border-2 border-[#15803d] shadow-sm' 
                : 'bg-white border-2 border-slate-200 hover:border-slate-300';

            const inlineCardStyle = isCurrentActive ? 'style="background-color: #eaf7ee !important; border: 2px solid #15803d !important;"' : '';

            return `
                <div class="p-6 ${cardBgStyle} rounded-3xl hover:shadow-md transition-all flex items-center justify-between gap-4 relative" ${inlineCardStyle}>
                    <div class="flex-1 min-w-0 space-y-2">
                        <div class="flex items-center gap-3 flex-wrap">
                            <h3 class="text-xl font-bold text-black tracking-tight">${yearTitle}</h3>
                            ${isCurrentActive 
                                ? '<span class="inline-flex items-center gap-1.5 px-3 py-1 bg-white/95 text-[#15803d] text-xs font-bold rounded-full border border-[#86efac] shadow-xs"><span class="w-2 h-2 rounded-full bg-[#15803d] animate-pulse"></span> Active Year</span>' 
                                : '<span class="inline-flex items-center px-3 py-1 bg-slate-100 text-black text-xs font-bold rounded-full border border-slate-200">Inactive</span>'}
                        </div>
                        <div class="text-xs text-black-fade font-medium flex items-center gap-4 flex-wrap">
                            <span class="inline-flex items-center"><i class="fa-solid fa-calendar-check icon-black-fade mr-1.5"></i>${quarterCount} Quarters Configured</span>
                            <span class="inline-flex items-center"><i class="fa-solid fa-clock icon-black-fade mr-1.5"></i>${record.q1Start ? formatSchoolYearDate(record.q1Start) : '—'} to ${record.q4End ? formatSchoolYearDate(record.q4End) : '—'}</span>
                        </div>
                    </div>

                    <div class="relative sy-action-dropdown-container flex items-center justify-center shrink-0">
                        <button type="button" onclick="window.toggleSYActionDropdown(event, '${record.id}')"
                            class="sy-dots-btn w-9 h-9 rounded-xl border border-transparent text-black hover:text-[#FFD000] hover:bg-black/5 flex items-center justify-center transition-all cursor-pointer group"
                            title="More actions">
                            <i class="fa-solid fa-ellipsis-vertical text-base text-black group-hover:text-[#FFD000] transition-colors"></i>
                        </button>

                        <div id="sy-dropdown-${record.id}"
                            class="sy-action-dropdown hidden absolute right-0 top-full mt-1.5 w-48 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 p-1.5 font-['Inter']">
                            
                            <button type="button" onclick="window.closeAllSYDropdowns(); window.toggleSYManager(false); window.openSYEditor('${record.id}', null, true)"
                                class="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold text-black hover:bg-slate-100 flex items-center gap-2.5 transition-colors cursor-pointer">
                                <i class="fa-solid fa-pen-to-square text-black text-xs w-4 text-center"></i>
                                <span>Edit</span>
                            </button>

                            ${isCurrentActive ? (isMaster ? `
                                <button type="button" onclick="window.closeAllSYDropdowns(); window.promptArchiveSchoolYear('${record.id}')"
                                    class="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold text-black hover:bg-slate-100 flex items-center gap-2.5 transition-colors cursor-pointer">
                                    <i class="fa-solid fa-box-archive text-black text-xs w-4 text-center"></i>
                                    <span>Archive Year</span>
                                </button>
                            ` : '') : `
                                <button type="button" onclick="window.closeAllSYDropdowns(); window.setSYAsActive('${record.id}')"
                                    class="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold text-black hover:bg-slate-100 flex items-center gap-2.5 transition-colors cursor-pointer">
                                    <i class="fa-solid fa-power-off text-black text-xs w-4 text-center"></i>
                                    <span>Set as Active</span>
                                </button>
                                ${canDeleteSY ? `
                                    <button type="button" onclick="window.closeAllSYDropdowns(); window.deleteSYToTrash('${record.id}')"
                                        class="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors cursor-pointer">
                                        <i class="fa-regular fa-trash-can text-red-500 text-xs w-4 text-center"></i>
                                        <span>Move to Trash Bin</span>
                                    </button>
                                ` : ''}
                            `}
                        </div>
                    </div>
                </div>
            `;
        } else if (currentSYManagerTab === 'archived') {
            return `
                <div class="p-6 bg-amber-50/20 border-2 border-amber-200 rounded-3xl hover:shadow-md transition-all flex items-center justify-between gap-4 relative">
                    <div class="flex-1 min-w-0 space-y-2">
                        <div class="flex items-center gap-3 flex-wrap">
                            <h3 class="text-xl font-bold text-black tracking-tight">${yearTitle}</h3>
                            <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-900 text-xs font-bold rounded-full border border-amber-200">
                                <i class="fa-solid fa-box-archive text-amber-700 text-xs"></i> Completed (Archived)
                            </span>
                        </div>
                        <div class="text-xs text-black-fade font-medium flex items-center gap-4 flex-wrap">
                            <span class="inline-flex items-center"><i class="fa-solid fa-calendar-check icon-black-fade mr-1.5"></i>${quarterCount} Quarters Configured</span>
                            <span class="inline-flex items-center"><i class="fa-solid fa-clock icon-black-fade mr-1.5"></i>${record.q1Start ? formatSchoolYearDate(record.q1Start) : '—'} to ${record.q4End ? formatSchoolYearDate(record.q4End) : '—'}</span>
                            ${record.archivedAt ? `<span class="inline-flex items-center"><i class="fa-solid fa-box-archive icon-black-fade mr-1.5"></i>Archived on ${formatSchoolYearDate(record.archivedAt)}</span>` : ''}
                        </div>
                    </div>

                    <div class="relative sy-action-dropdown-container flex items-center justify-center shrink-0">
                        <button type="button" onclick="window.toggleSYActionDropdown(event, '${record.id}')"
                            class="sy-dots-btn w-9 h-9 rounded-xl border border-transparent text-black hover:text-[#FFD000] hover:bg-amber-50/60 flex items-center justify-center transition-all cursor-pointer group"
                            title="More actions">
                            <i class="fa-solid fa-ellipsis-vertical text-base text-black group-hover:text-[#FFD000] transition-colors"></i>
                        </button>

                        <div id="sy-dropdown-${record.id}"
                            class="sy-action-dropdown hidden absolute right-0 top-full mt-1.5 w-48 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 p-1.5 font-['Inter']">
                            <button type="button" onclick="window.closeAllSYDropdowns(); window.toggleSYManager(false); window.openSYEditor('${record.id}', null, true)"
                                class="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold text-black hover:bg-slate-100 flex items-center gap-2.5 transition-colors cursor-pointer">
                                <i class="fa-solid fa-pen-to-square text-black text-xs w-4 text-center"></i>
                                <span>Edit</span>
                            </button>
                            <button type="button" onclick="window.closeAllSYDropdowns(); window.promptRestoreSchoolYear('${record.id}')"
                                class="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold text-black hover:bg-slate-100 flex items-center gap-2.5 transition-colors cursor-pointer">
                                <i class="fa-solid fa-rotate-left text-black text-xs w-4 text-center"></i>
                                <span>Restore Year</span>
                            </button>
                            ${canDeleteSY ? `
                                <button type="button" onclick="window.closeAllSYDropdowns(); window.deleteSYToTrash('${record.id}')"
                                    class="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors cursor-pointer">
                                    <i class="fa-regular fa-trash-can text-red-500 text-xs w-4 text-center"></i>
                                    <span>Move to Trash Bin</span>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="p-6 bg-white border-2 border-red-100 rounded-3xl hover:shadow-md transition-all flex items-center justify-between gap-4 relative">
                    <div class="flex-1 min-w-0 space-y-2">
                        <div class="flex items-center gap-3 flex-wrap">
                            <h3 class="text-xl font-bold text-black tracking-tight">${yearTitle}</h3>
                            <span class="inline-flex items-center px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full border border-red-200">In Trash Bin</span>
                        </div>
                        <div class="text-xs text-black-fade font-medium flex items-center gap-4 flex-wrap">
                            <span class="inline-flex items-center"><i class="fa-solid fa-calendar-xmark icon-black-fade mr-1.5"></i>Deleted Record</span>
                            <span>${record.deletedAt ? 'Deleted on ' + formatSchoolYearDate(record.deletedAt) : 'Deleted Year'}</span>
                        </div>
                    </div>

                    <div class="relative sy-action-dropdown-container flex items-center justify-center shrink-0">
                        <button type="button" onclick="window.toggleSYActionDropdown(event, '${record.id}')"
                            class="sy-dots-btn w-9 h-9 rounded-xl border border-transparent text-black hover:text-[#FFD000] hover:bg-amber-50/60 flex items-center justify-center transition-all cursor-pointer group"
                            title="More actions">
                            <i class="fa-solid fa-ellipsis-vertical text-base text-black group-hover:text-[#FFD000] transition-colors"></i>
                        </button>

                        <div id="sy-dropdown-${record.id}"
                            class="sy-action-dropdown hidden absolute right-0 top-full mt-1.5 w-48 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 p-1.5 font-['Inter']">
                            <button type="button" onclick="window.closeAllSYDropdowns(); window.restoreSYFromTrash('${record.id}')"
                                class="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold text-black hover:bg-slate-100 flex items-center gap-2.5 transition-colors cursor-pointer">
                                <i class="fa-solid fa-rotate-left text-black text-xs w-4 text-center"></i>
                                <span>Restore Year</span>
                            </button>
                            <button type="button" onclick="window.closeAllSYDropdowns(); window.permanentDeleteSY('${record.id}')"
                                class="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors cursor-pointer">
                                <i class="fa-solid fa-ban text-red-500 text-xs w-4 text-center"></i>
                                <span>Delete Permanently</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
    }).join('');
};

window.setSYAsActive = function (recordId) {
    const target = schoolYearRecords.find(r => String(r.id) === String(recordId));
    if (!target) return;

    window.showSYConfirm(
        'Set as Active School Year?',
        `Are you sure you want to activate School Year ${target.yearStart}-${target.yearEnd}? This will become the live academic session for all portals immediately.`,
        () => {
            schoolYearRecords = schoolYearRecords.map(record => ({
                ...record,
                status: String(record.id) === String(recordId) ? 'Active' : 'Inactive'
            }));

            saveSYToStorage();
            renderSchoolYearTable();
            renderSchoolYearSummaryBar();
            updateGlobalSYDisplay();
            window.renderSYManagerList();

            if (typeof window.broadcastForceLogout === 'function') {
                window.broadcastForceLogout(`School Year ${target.yearStart}-${target.yearEnd} has been activated. Please log in again.`, 'non-master');
            }
        },
        'Activate',
        'Cancel'
    );
};

window.deleteSYToTrash = function (recordId) {
    const canDeleteSY = window.isCurrentMasterAdmin() || (typeof window.canCurrentAdminDelete === 'function' && window.canCurrentAdminDelete('schoolYear'));
    if (!canDeleteSY) {
        if (typeof window.showUserConfirm === 'function') {
            window.showUserConfirm('Permission Denied', 'You do not have permission to delete or move school years to the trash bin.', null, true);
        } else {
            alert('Permission Denied: You do not have permission to delete or move school years to the trash bin.');
        }
        return;
    }

    const target = schoolYearRecords.find(r => String(r.id) === String(recordId));
    if (!target) return;

    if (target.status === 'Active') {
        if (typeof window.showUserConfirm === 'function') {
            window.showUserConfirm('Cannot Move Active Year', 'Cannot move the currently active school year to the trash bin. Please set another year as active first.', null, true);
        } else {
            alert('Cannot move the currently active school year to the trash bin. Please set another year as active first.');
        }
        return;
    }

    window.showSYConfirm(
        'Move to Trash Bin?',
        `Are you sure you want to move School Year ${target.yearStart} - ${target.yearEnd} to the trash bin? It can be restored anytime from the Trash Bin tab.`,
        () => {
            schoolYearRecords = schoolYearRecords.map(r => 
                String(r.id) === String(recordId) ? { ...r, isDeleted: true, deletedAt: new Date().toISOString().split('T')[0] } : r
            );
            saveSYToStorage();
            renderSchoolYearTable();
            renderSchoolYearSummaryBar();
            updateGlobalSYDisplay();
            window.renderSYManagerList();
        },
        'Move to Trash',
        'Cancel'
    );
};

window.restoreSYFromTrash = function (recordId) {
    const canDeleteSY = window.isCurrentMasterAdmin() || (typeof window.canCurrentAdminDelete === 'function' && window.canCurrentAdminDelete('schoolYear'));
    if (!canDeleteSY) {
        if (typeof window.showUserConfirm === 'function') {
            window.showUserConfirm('Permission Denied', 'You do not have permission to restore school years from the trash bin.', null, true);
        } else {
            alert('Permission Denied.');
        }
        return;
    }

    schoolYearRecords = schoolYearRecords.map(r => 
        String(r.id) === String(recordId) ? { ...r, isDeleted: false, deletedAt: null } : r
    );
    saveSYToStorage();
    renderSchoolYearTable();
    renderSchoolYearSummaryBar();
    updateGlobalSYDisplay();
    window.renderSYManagerList();
};

window.permanentDeleteSY = function (recordId) {
    const canDeleteSY = window.isCurrentMasterAdmin() || (typeof window.canCurrentAdminDelete === 'function' && window.canCurrentAdminDelete('schoolYear'));
    if (!canDeleteSY) {
        if (typeof window.showUserConfirm === 'function') {
            window.showUserConfirm('Permission Denied', 'You do not have permission to permanently delete school years.', null, true);
        } else {
            alert('Permission Denied.');
        }
        return;
    }

    const target = schoolYearRecords.find(r => String(r.id) === String(recordId));
    if (!target) return;

    window.showSYConfirm(
        'Delete Permanently?',
        `Are you sure you want to permanently erase School Year ${target.yearStart}-${target.yearEnd}? This action cannot be undone.`,
        () => {
            schoolYearRecords = schoolYearRecords.filter(r => String(r.id) !== String(recordId));
            saveSYToStorage();
            renderSchoolYearTable();
            renderSchoolYearSummaryBar();
            updateGlobalSYDisplay();
            window.renderSYManagerList();
        },
        'Delete',
        'Cancel'
    );
};

window.handleSYBack = function () {
    window.toggleSYOverlay(false);
    if (isOpenedFromSYManager) {
        window.openSYManager();
    }
};

window.handleSYExit = function () {
    window.toggleSYOverlay(false);
};

window.handleSYDiscard = window.handleSYExit;

window.handleSYDelete = function () {
    const canDeleteSY = window.isCurrentMasterAdmin() || (typeof window.canCurrentAdminDelete === 'function' && window.canCurrentAdminDelete('schoolYear'));
    if (!canDeleteSY) {
        if (typeof window.showUserConfirm === 'function') {
            window.showUserConfirm('Permission Denied', 'You do not have permission to delete or move school years to the trash bin.', null, true);
        } else {
            alert('Permission Denied: You do not have permission to delete or move school years to the trash bin.');
        }
        return;
    }

    if (!currentSYRecordId) return;
    const target = schoolYearRecords.find(r => String(r.id) === String(currentSYRecordId));
    if (!target) return;

    if (target.status === 'Active') {
        window.showSYConfirm(
            'Cannot Move Active Year',
            'This school year is currently active. Please set another school year as active in Manage School Years before moving this one to the trash bin.',
            () => {},
            'Understood',
            'Cancel'
        );
        return;
    }

    window.showSYConfirm(
        'Move to Trash Bin?',
        `Are you sure you want to move School Year ${target.yearStart}-${target.yearEnd} to the trash bin? It can be restored anytime from the Trash Bin tab.`,
        () => {
            schoolYearRecords = schoolYearRecords.map(r => 
                String(r.id) === String(currentSYRecordId) ? { ...r, isDeleted: true, deletedAt: new Date().toISOString().split('T')[0] } : r
            );
            saveSYToStorage();
            renderSchoolYearTable();
            renderSchoolYearSummaryBar();
            updateGlobalSYDisplay();
            window.toggleSYOverlay(false);
            window.openSYManager();
        },
        'Move to Trash',
        'Cancel'
    );
};

window.performSYSave = function (formValues) {
    const saveBtn = document.getElementById('sy-save-btn');
    const loading = document.getElementById('sy-save-loading');

    if (saveBtn && loading) {
        saveBtn.disabled = true;
        loading.classList.remove('hidden');

        // Simulate API Call
        setTimeout(() => {
            const isEditing = currentSYRecordId !== null;
            const existingRecord = isEditing ? schoolYearRecords.find(r => r.id === currentSYRecordId) : null;
            
            // Check if today falls in the new year's dates
            const starts = [formValues.q1Start, formValues.q2Start, formValues.q3Start, formValues.q4Start].filter(Boolean);
            const ends = [formValues.q1End, formValues.q2End, formValues.q3End, formValues.q4End].filter(Boolean);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const isOngoingToday = starts.length > 0 && ends.length > 0 &&
                today >= new Date(`${starts[0]}T00:00:00`) &&
                today <= new Date(`${ends[ends.length - 1]}T23:59:59`);

            // Check if there is already an active school year that is ongoing
            const existingActive = schoolYearRecords.find(r => !r.isDeleted && r.status === 'Active' && r.id !== currentSYRecordId);
            const existingOngoing = existingActive && isRecordOngoingToday(existingActive);

            let targetStatus = 'Inactive';
            if (isEditing) {
                targetStatus = existingRecord?.status || 'Inactive';
            } else {
                if (!existingActive) {
                    targetStatus = 'Active';
                } else if (isOngoingToday && !existingOngoing) {
                    targetStatus = 'Active';
                } else {
                    targetStatus = 'Inactive';
                }
            }

            const savedRecord = {
                id: currentSYRecordId || Date.now(),
                ...formValues,
                status: targetStatus
            };

            if (isEditing) {
                schoolYearRecords = schoolYearRecords.map((record) => (
                    record.id === currentSYRecordId ? savedRecord : (targetStatus === 'Active' ? { ...record, status: 'Inactive' } : record)
                ));
            } else {
                if (targetStatus === 'Active') {
                    schoolYearRecords = schoolYearRecords.map(r => ({ ...r, status: 'Inactive' }));
                }
                schoolYearRecords = [savedRecord, ...schoolYearRecords];
            }

            renderSchoolYearTable();
            updateGlobalSYDisplay();
            saveSYToStorage(); // Save to localStorage
            window.checkQuarterEndReminders();
            initialSYValues = {};
            saveBtn.disabled = false;
            loading.classList.add('hidden');
            window.toggleSYOverlay(false);

            if (window.showCreationBar) {
                window.showCreationBar({
                    type: 'school-year',
                    label: isEditing ? 'Updated School Year' : 'Created School Year',
                    primaryLabel: 'Academic Year',
                    primaryValue: `${savedRecord.yearStart} - ${savedRecord.yearEnd}`,
                    secondaryLabel: 'Status',
                    secondaryValue: savedRecord.status || 'Inactive',
                    status: 'published'
                });
            }
        }, 1500);
    }
};

window.handleSYSave = function () {
    const formValues = getSYFormValues();
    const isEditing = currentSYRecordId !== null;
    const actionLabel = isEditing ? 'Save School Year?' : 'Create School Year?';
    const actionDescription = isEditing
        ? 'Are you sure you want to apply these updates to the school year configuration?'
        : 'Are you sure you want to create this school year configuration?';

    if (!formValues.yearStart || !formValues.yearEnd) {
        alert('Please provide both Year Start and Year End.');
        return;
    }

    if (Number(formValues.yearEnd) < Number(formValues.yearStart)) {
        alert('Year End must be equal to or greater than Year Start.');
        return;
    }

    // 1st Quarter Start and End are strictly required when creating a school year
    if (!isEditing && (!formValues.q1Start || !formValues.q1End)) {
        window.showSYConfirm(
            '1st Quarter Dates Required',
            'Please set both the Start and End dates for the 1st Quarter before creating the school year. Subsequent quarters (2nd, 3rd, 4th) can be configured later.',
            () => {
                if (!formValues.q1Start) document.getElementById('edit-sy-q1-start')?.focus();
                else document.getElementById('edit-sy-q1-end')?.focus();
            },
            'OK',
            'Cancel'
        );
        return;
    }

    const minAllowedStart = formValues.yearStart ? `${formValues.yearStart}-01-01` : '1900-01-01';
    if (!isEditing && formValues.q1Start && formValues.q1Start < minAllowedStart) {
        window.showSYConfirm(
            'Invalid Date',
            `School year quarter dates cannot be set before January 1, ${formValues.yearStart}.`,
            () => {
                document.getElementById('edit-sy-q1-start')?.focus();
            },
            'OK',
            'Cancel'
        );
        return;
    }

    // Uniqueness restriction: ensure yearStart is not already created when adding a new record
    if (!isEditing) {
        const isDuplicate = schoolYearRecords.some(r => !r.isDeleted && String(r.yearStart) === String(formValues.yearStart));
        if (isDuplicate) {
            window.showSYConfirm(
                'School Year Already Exists',
                `School Year ${formValues.yearStart}-${formValues.yearEnd} already exists. Each academic year can only be created once. Please edit the existing year from 'Manage School Years'.`,
                () => {},
                'Understood',
                'Cancel'
            );
            return;
        }
    }

    formValues.status = isEditing ? (schoolYearRecords.find(r => r.id === currentSYRecordId)?.status || 'Inactive') : 'Inactive';

    window.showSYConfirm(
        actionLabel,
        actionDescription,
        () => window.performSYSave(formValues)
    );
};

// =============================================================
// SYSTEM ACCESS CONTROL & END SCHOOL YEAR WORKFLOWS
// =============================================================

window.updateAdminAccessLockdownUI = function () {
    const cfg = typeof window.getMaintenanceConfig === 'function' ? window.getMaintenanceConfig() : { enabled: false };
    const btn = document.getElementById('admin-access-lockdown-btn');
    const dot = document.getElementById('admin-access-lockdown-dot');
    const txt = document.getElementById('admin-access-lockdown-text');
    if (btn && dot && txt) {
        if (cfg.enabled) {
            btn.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1.5 bg-amber-500/25 text-amber-200 border border-amber-400/40 shadow-xs';
            btn.title = 'Maintenance mode active: Student and Teacher access is restricted.';
            dot.className = 'fa-solid fa-triangle-exclamation text-[9px] text-amber-300 animate-pulse';
            txt.textContent = 'Maintenance';
        } else {
            btn.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1.5 bg-white/15 text-white';
            btn.title = 'System operational: All users can log in normally.';
            dot.className = 'fa-solid fa-gauge-high text-[9px] text-white/90';
            txt.textContent = 'Operational';
        }
    }
    const toggle = document.getElementById('settings-maintenance-toggle');
    if (toggle && toggle.checked !== Boolean(cfg.enabled)) {
        toggle.checked = Boolean(cfg.enabled);
    }
    if (typeof window.updateMaintenanceAccessControls === 'function') {
        window.updateMaintenanceAccessControls();
    }
};

// Listen for maintenance config updates across tabs
window.addEventListener('storage', function (e) {
    if (e.key === 'sigma_maintenance_mode') {
        window.updateAdminAccessLockdownUI();
    }
});
window.addEventListener('sigma:maintenance_change', function () {
    window.updateAdminAccessLockdownUI();
});

// Run once on load
const initAdminSecuritySettings = function () {
    if (typeof window.loadLoginSecuritySettings === 'function') {
        window.loadLoginSecuritySettings();
    }
    if (typeof window.updateAdminAccessLockdownUI === 'function') {
        window.updateAdminAccessLockdownUI();
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdminSecuritySettings);
} else {
    setTimeout(initAdminSecuritySettings, 100);
}

// ─── ARCHIVE & RESTORE SCHOOL YEAR LOGIC (SHARED CONFIRMATION) ───

window.promptArchiveSchoolYear = function (recordId) {
    if (!window.isCurrentMasterAdmin()) {
        if (typeof window.showUserConfirm === 'function') {
            window.showUserConfirm('Permission Denied', 'Only Master Administrators are permitted to archive a school year.', null, true);
        } else {
            alert('Only Master Administrators are permitted to archive a school year.');
        }
        return;
    }

    const target = schoolYearRecords.find(r => String(r.id) === String(recordId));
    if (!target) return;

    const yearTitle = `${target.yearStart} - ${target.yearEnd}`;
    const inactiveYears = schoolYearRecords.filter(r => !r.isDeleted && r.status === 'Inactive' && String(r.id) !== String(recordId));

    // Step 1: Prompt "Archive School Year {yearTitle}?" with detailed explanation of effects
    window.showSYConfirm(
        `Archive School Year ${yearTitle}?`,
        `Archiving will conclude and finalize the ${yearTitle} academic session, freeze student submissions, and safely disconnect active non-admin sessions. All historical records will be preserved in the archive.`,
        () => {
            // Step 2: When user clicks "Archive Year", if a candidate exists, ask to activate it
            if (inactiveYears.length > 0) {
                const nextCandidate = inactiveYears[0];
                const nextTitle = `${nextCandidate.yearStart} - ${nextCandidate.yearEnd}`;

                // Show Activation confirmation modal (background panel remains unchanged)
                setTimeout(() => {
                    window.showSYConfirm(
                        `Activate School Year ${nextTitle}?`,
                        `Archiving School Year ${yearTitle} will conclude the current academic session. Would you like to activate School Year ${nextTitle} as the current live academic year now?`,
                        () => {
                            // On "Activate", perform archive + activate together and transfer panel
                            window.executeArchiveAndActivate(recordId, nextCandidate.id);
                        },
                        'Activate',
                        'Cancel'
                    );
                }, 50);
            } else {
                // If no other school years available, archive directly
                window.executeArchiveSchoolYear(recordId);
            }
        },
        'Archive Year',
        'Cancel'
    );
};

window.executeArchiveAndActivate = function (archiveRecordId, activateRecordId) {
    if (!window.isCurrentMasterAdmin()) return;

    const target = schoolYearRecords.find(r => String(r.id) === String(archiveRecordId));
    if (!target) return;

    const yearTitle = `${target.yearStart}-${target.yearEnd}`;
    const archiveTimestamp = new Date().toISOString();

    // 1. Freeze Incoming Activity
    localStorage.setItem('sigma_sy_submission_frozen', 'true');
    localStorage.setItem('sigma_sy_last_archived_year', yearTitle);

    // 2. Force Logout All Active Student, Teacher, and Non-Master Admin Sessions
    if (typeof window.broadcastForceLogout === 'function') {
        const nextRecord = schoolYearRecords.find(r => String(r.id) === String(activateRecordId));
        const activatedYearText = nextRecord ? `School Year ${nextRecord.yearStart}-${nextRecord.yearEnd}` : 'A new academic year';
        window.broadcastForceLogout(`${activatedYearText} has been activated. Please log in again.`, 'non-master');
    }

    // 3. Save Academic Snapshot into School Year Archives
    try {
        const existingArchives = getStoredJson('sigma_sy_archives', []);
        const archiveRecord = {
            id: 'sy_archived_' + Date.now(),
            syId: target.id,
            yearStart: target.yearStart,
            yearEnd: target.yearEnd,
            status: 'Completed (Archived)',
            archivedAt: archiveTimestamp,
            archivedBy: (typeof window.getActiveUserData === 'function' && window.getActiveUserData()?.fullName) ? window.getActiveUserData().fullName : 'Master Admin',
            snapshot: {
                schoolYear: { ...target },
                subjectsCount: (getStoredJson('sigma-admin-subjects', [])).length,
                sectionsCount: (getStoredJson('sigma-sections-list', [])).length,
                studentsCount: (getStoredJson('sigma-student-users', [])).length
            }
        };
        existingArchives.unshift(archiveRecord);
        window.saveStoredJson('sigma_sy_archives', existingArchives);
    } catch (e) {
        console.error('Failed to create archive record:', e);
    }

    // 4. Archive target year AND activate candidate year together
    schoolYearRecords = schoolYearRecords.map(record => {
        if (String(record.id) === String(archiveRecordId)) {
            return {
                ...record,
                status: 'Completed (Archived)',
                archivedAt: archiveTimestamp
            };
        } else if (activateRecordId && String(record.id) === String(activateRecordId)) {
            return {
                ...record,
                status: 'Active'
            };
        } else if (activateRecordId && record.status === 'Active') {
            return {
                ...record,
                status: 'Inactive'
            };
        }
        return record;
    });

    // 5. Persist & Update UI (Panel and badges transfer now)
    saveSYToStorage();
    renderSchoolYearTable();
    renderSchoolYearSummaryBar();
    updateGlobalSYDisplay();
    if (typeof window.renderSYManagerList === 'function') {
        window.renderSYManagerList();
    }
};

window.executeArchiveSchoolYear = function (recordId) {
    if (!window.isCurrentMasterAdmin()) {
        if (typeof window.showUserConfirm === 'function') {
            window.showUserConfirm('Permission Denied', 'Only Master Administrators are permitted to archive a school year.', null, true);
        } else {
            alert('Only Master Administrators are permitted to archive a school year.');
        }
        return;
    }

    const target = schoolYearRecords.find(r => String(r.id) === String(recordId));
    if (!target) return;

    const yearTitle = `${target.yearStart}-${target.yearEnd}`;
    const archiveTimestamp = new Date().toISOString();

    // 1. Freeze Incoming Activity
    localStorage.setItem('sigma_sy_submission_frozen', 'true');
    localStorage.setItem('sigma_sy_last_archived_year', yearTitle);

    // 2. Force Logout All Active Student, Teacher, and Non-Master Admin Sessions
    if (typeof window.broadcastForceLogout === 'function') {
        window.broadcastForceLogout(`School Year ${yearTitle} has officially concluded and been archived. All student and teacher sessions have ended.`, 'non-master');
    }

    // 3. Save Academic Snapshot into School Year Archives
    try {
        const existingArchives = getStoredJson('sigma_sy_archives', []);
        const archiveRecord = {
            id: 'sy_archived_' + Date.now(),
            syId: target.id,
            yearStart: target.yearStart,
            yearEnd: target.yearEnd,
            status: 'Completed (Archived)',
            archivedAt: archiveTimestamp,
            archivedBy: (typeof window.getActiveUserData === 'function' && window.getActiveUserData()?.fullName) ? window.getActiveUserData().fullName : 'Master Admin',
            snapshot: {
                schoolYear: { ...target },
                subjectsCount: (getStoredJson('sigma-admin-subjects', [])).length,
                sectionsCount: (getStoredJson('sigma-sections-list', [])).length,
                studentsCount: (getStoredJson('sigma-student-users', [])).length
            }
        };
        existingArchives.unshift(archiveRecord);
        window.saveStoredJson('sigma_sy_archives', existingArchives);
    } catch (e) {
        console.error('Failed to create archive record:', e);
    }

    // 4. Mark School Year Record as Completed (Archived)
    schoolYearRecords = schoolYearRecords.map(record => {
        if (String(record.id) === String(target.id)) {
            return {
                ...record,
                status: 'Completed (Archived)',
                archivedAt: archiveTimestamp
            };
        }
        return record;
    });

    // 5. Persist & Update UI
    saveSYToStorage();
    renderSchoolYearTable();
    renderSchoolYearSummaryBar();
    updateGlobalSYDisplay();
    if (typeof window.renderSYManagerList === 'function') {
        window.renderSYManagerList();
    }
};

window.promptRestoreSchoolYear = function (recordId) {
    const target = schoolYearRecords.find(r => String(r.id) === String(recordId));
    if (!target) return;

    const yearTitle = `${target.yearStart} - ${target.yearEnd}`;
    window.showSYConfirm(
        `Restore School Year ${yearTitle}?`,
        `Are you sure you want to restore School Year ${yearTitle}? This will reactivate this school year, unfreeze submissions, and set it as the active session.`,
        () => {
            window.executeRestoreSchoolYear(recordId);
        },
        'Restore Year',
        'Cancel'
    );
};

window.executeRestoreSchoolYear = function (recordId) {
    const target = schoolYearRecords.find(r => String(r.id) === String(recordId));
    if (!target) return;

    const yearTitle = `${target.yearStart} - ${target.yearEnd}`;

    // 1. Unfreeze Submissions & Broadcast Force Logout
    localStorage.removeItem('sigma_sy_submission_frozen');

    if (typeof window.broadcastForceLogout === 'function') {
        window.broadcastForceLogout(`School Year ${yearTitle} has been restored and activated. Please log in again.`, 'non-master');
    }

    // 2. Set this record to Active, others to Inactive
    schoolYearRecords = schoolYearRecords.map(record => {
        if (String(record.id) === String(recordId)) {
            const copy = { ...record, status: 'Active' };
            delete copy.archivedAt;
            return copy;
        } else if (record.status === 'Active') {
            return { ...record, status: 'Inactive' };
        }
        return record;
    });

    // Persist & Update UI
    saveSYToStorage();
    renderSchoolYearTable();
    renderSchoolYearSummaryBar();
    updateGlobalSYDisplay();
    if (typeof window.renderSYManagerList === 'function') {
        window.renderSYManagerList();
    }

    if (typeof window.openAskingPanel === 'function') {
        window.openAskingPanel({
            title: 'School Year Restored',
            message: `School Year ${yearTitle} has been restored and is now the active school year. Submissions are active and normal operations have resumed.`,
            icon: 'fa-solid fa-rotate-left text-emerald-500',
            confirmText: 'Done',
            showCancel: false
        });
    }
};

// Aliases for backwards compatibility
window.openEndSchoolYearModal = function () {
    const activeSY = schoolYearRecords.find(r => !r.isDeleted && r.status === 'Active');
    if (activeSY) {
        window.promptArchiveSchoolYear(activeSY.id);
    }
};
window.closeEndSchoolYearModal = function () {
    const overlay = document.getElementById('sy-confirm-overlay');
    if (overlay) overlay.classList.add('hidden');
};
window.executeEndAndArchiveSchoolYear = function () {
    const activeSY = schoolYearRecords.find(r => !r.isDeleted && r.status === 'Active');
    if (activeSY) {
        window.executeArchiveSchoolYear(activeSY.id);
    }
};

// =============================================================
// SCHOOL PROFILE MANAGEMENT LOGIC
// =============================================================

let initialProfileValues = {};

window.toggleProfileOverlay = function (show) {
    const overlay = document.getElementById('profile-edit-overlay');
    if (show) {
        overlay.classList.remove('hidden');
        // Capture initial values to detect changes
        initialProfileValues = {
            name: document.getElementById('edit-profile-name').value,
            motto: document.getElementById('edit-profile-motto').value,
            id: document.getElementById('edit-profile-id').value,
            vision: document.getElementById('edit-profile-vision').value,
            mission: document.getElementById('edit-profile-mission').value,
            address: document.getElementById('edit-profile-address').value,
            city: document.getElementById('edit-profile-city').value,
            contact: document.getElementById('edit-profile-contact').value,
            email: document.getElementById('edit-profile-email').value
        };
    } else {
        overlay.classList.add('hidden');
    }
};

window.hasProfileChanges = function () {
    const currentValues = {
        name: document.getElementById('edit-profile-name').value,
        motto: document.getElementById('edit-profile-motto').value,
        id: document.getElementById('edit-profile-id').value,
        vision: document.getElementById('edit-profile-vision').value,
        mission: document.getElementById('edit-profile-mission').value,
        address: document.getElementById('edit-profile-address').value,
        city: document.getElementById('edit-profile-city').value,
        contact: document.getElementById('edit-profile-contact').value,
        email: document.getElementById('edit-profile-email').value
    };
    return JSON.stringify(initialProfileValues) !== JSON.stringify(currentValues);
};

window.showProfileConfirm = function (title, desc, onProceed) {
    const overlay = document.getElementById('profile-confirm-overlay');
    const titleEl = document.getElementById('profile-confirm-title');
    const descEl = document.getElementById('profile-confirm-desc');
    const cancelBtn = document.getElementById('profile-confirm-cancel');
    const proceedBtn = document.getElementById('profile-confirm-proceed');

    if (!overlay || !titleEl || !descEl || !cancelBtn || !proceedBtn) return;

    titleEl.textContent = title;
    descEl.textContent = desc;
    overlay.classList.remove('hidden');

    const close = () => overlay.classList.add('hidden');

    cancelBtn.onclick = close;
    proceedBtn.onclick = () => {
        onProceed();
        close();
    };
};

window.handleProfileExit = function () {
    if (window.hasProfileChanges()) {
        window.showProfileConfirm(
            'Discard Changes?',
            'You have unsaved modifications to the institutional profile. Are you sure you want to exit?',
            () => window.toggleProfileOverlay(false)
        );
    } else {
        window.toggleProfileOverlay(false);
    }
};

window.handleProfileDiscard = window.handleProfileExit;

window.handleProfileSave = function () {
    window.showProfileConfirm(
        'Save Institutional Profile?',
        'Are you sure you want to apply these updates to the school profile database?',
        () => {
            const saveBtn = document.getElementById('profile-save-btn');
            const loading = document.getElementById('profile-save-loading');

            if (saveBtn && loading) {
                saveBtn.disabled = true;
                loading.classList.remove('hidden');

                // Simulate API Call
                setTimeout(() => {
                    saveBtn.disabled = false;
                    loading.classList.add('hidden');
                    const profile = getOrganizationProfile();
                    saveOrganizationProfile({
                        ...profile,
                        schoolName: document.getElementById('edit-profile-name').value.trim() || profile.schoolName,
                        motto: document.getElementById('edit-profile-motto').value.trim(),
                        schoolId: document.getElementById('edit-profile-id').value.trim(),
                        vision: document.getElementById('edit-profile-vision').value.trim(),
                        mission: document.getElementById('edit-profile-mission').value.trim(),
                        address: document.getElementById('edit-profile-address').value.trim(),
                        city: document.getElementById('edit-profile-city').value.trim(),
                        contactNumber: document.getElementById('edit-profile-contact').value.trim(),
                        emailAddress: document.getElementById('edit-profile-email').value.trim()
                    });
                    syncProfileDisplay();
                    window.toggleProfileOverlay(false);
                }, 1500);
            }
        }
    );
};

// =============================================================
// SECTION MANAGEMENT LOGIC
// =============================================================

let initialSectionValues = {};
window.currentSectionStep = 1;
window.isEditingSection = false;

window.getSectionPrerequisitesStatus = function () {
    const allUsers = (typeof getStoredJson === 'function') ? getStoredJson(USER_STORAGE_KEY, []) : [];
    const allSubjects = (typeof getStoredJson === 'function') ? getStoredJson(SUBJECTS_STORAGE_KEY, []) : [];

    const teachers = allUsers.filter(u => {
        const role = String(u.type || u.role || '').toLowerCase();
        return role.includes('teach') || role.includes('faculty') || role.includes('instructor');
    });

    const students = allUsers.filter(u => {
        const role = String(u.type || u.role || '').toLowerCase();
        return role.includes('student') || role.startsWith('stud');
    });

    const subjects = allSubjects.filter(s => {
        return Boolean(s && (s.name || s.title || s.subjectName));
    });

    const missing = [];
    if (teachers.length === 0) {
        missing.push({
            type: 'teacher',
            label: 'Teacher User',
            desc: 'No teacher accounts found in Users & Accounts'
        });
    }
    if (students.length === 0) {
        missing.push({
            type: 'student',
            label: 'Student User',
            desc: 'No student accounts found in Users & Accounts'
        });
    }
    if (subjects.length === 0) {
        missing.push({
            type: 'subject',
            label: 'Subject',
            desc: 'No subjects created in School Subjects'
        });
    }

    return {
        hasTeachers: teachers.length > 0,
        hasStudents: students.length > 0,
        hasSubjects: subjects.length > 0,
        missing: missing,
        isReady: missing.length === 0
    };
};

window.toggleSectionOverlay = function (show, sectionId = null) {
    const overlay = document.getElementById('section-edit-overlay');
    const titleEl = document.getElementById('section-modal-title');
    window.currentEditingSectionId = sectionId;

    if (show) {
        if (!sectionId) {
            const prereqs = window.getSectionPrerequisitesStatus();
            if (!prereqs.isReady) {
                const missingListHtml = prereqs.missing.map(m => `
                    <li class="flex items-start gap-2.5">
                        <i class="fa-solid fa-circle-exclamation text-amber-500 text-xs mt-0.5 shrink-0"></i>
                        <div>
                            <p class="text-xs font-bold text-slate-900 font-['Inter']">${escapeHtml(m.label)}</p>
                            <p class="text-[11px] text-slate-500 font-['Inter']">${escapeHtml(m.desc)}</p>
                        </div>
                    </li>
                `).join('');

                const descHtml = `
                    <div class="space-y-3 text-left font-['Inter']">
                        <p class="text-xs text-slate-700 leading-relaxed font-['Inter']">
                            Before creating a section, you must first create the following required records:
                        </p>
                        <ul class="space-y-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                            ${missingListHtml}
                        </ul>
                        <p class="text-[11px] text-slate-500 leading-relaxed font-['Inter']">
                            Please create these records in their respective modules before setting up a section.
                        </p>
                    </div>
                `;

                if (typeof window.showSigmaDialog === 'function') {
                    window.showSigmaDialog({
                        title: 'Prerequisites Required',
                        desc: descHtml,
                        icon: 'fa-solid fa-triangle-exclamation text-amber-500',
                        confirmText: 'OK',
                        isNotification: true
                    });
                } else if (typeof window.showAlertDialog === 'function') {
                    const plainList = prereqs.missing.map(m => `• ${m.label}: ${m.desc}`).join('\n');
                    window.showAlertDialog('Prerequisites Required', `Before creating a section, please create the following first:\n\n${plainList}`);
                } else {
                    alert('Before creating a section, please create teacher users, student users, and subjects first.');
                }
                return;
            }
        }

        document.body.classList.add('section-edit-mode');
        overlay.classList.remove('hidden');
        overlay.scrollTop = 0;
        if (typeof window.pushModalHistoryState === 'function') {
            window.pushModalHistoryState('section-edit-overlay');
        }
        window.currentSectionStep = 1;
        window.handleSectionStep(1);

        window.selectedSectionStudents = [];
        window.renderSelectedStudents();

        window.closeSectionSubpage();

        if (sectionId) {
            window.enforceSingleAdviserOnStoredSections();
            const sections = getStoredJson(SECTIONS_STORAGE_KEY, []);
            const sec = sections.find(s => (s.id && String(s.id) === String(sectionId)) || (s.name && String(s.name).toLowerCase() === String(sectionId).toLowerCase()));
            if (sec) {
                window.isEditingSection = true;
                window.currentEditingSectionId = sec.id || sec.name;
                document.getElementById('edit-section-name').value = sec.name || '';
                document.getElementById('edit-section-grade').value = sec.gradeLevel || sec.grade || '';
                document.getElementById('edit-section-room').value = sec.room || '';
                document.getElementById('edit-section-teacher').value = sec.teacher || '';
                document.getElementById('edit-section-role').value = sec.role || 'Teacher';
                document.getElementById('edit-section-subject').value = sec.subject || '';

                if (Array.isArray(sec.dailySchedules) && sec.dailySchedules.length > 0) {
                    window.selectedSectionDailySchedule = JSON.parse(JSON.stringify(sec.dailySchedules));
                } else if (sec.startTime && sec.endTime) {
                    window.selectedSectionDailySchedule = window.getDefaultSectionDailySchedule(sec.days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], sec.startTime, sec.endTime);
                } else {
                    window.selectedSectionDailySchedule = [];
                }

                window.populateSectionSchoolYearDropdown(sec.schoolYear || '');

                const safeParseList = (val) => {
                    if (!val) return [];
                    if (Array.isArray(val)) return val;
                    if (typeof val === 'string') {
                        try {
                            const parsed = JSON.parse(val);
                            if (Array.isArray(parsed)) return parsed;
                            if (parsed && typeof parsed === 'object') return [parsed];
                        } catch (e) {}
                        return val.split(',').map(s => s.trim()).filter(Boolean);
                    }
                    if (typeof val === 'object') return [val];
                    return [];
                };

                const rawSecTeachers = safeParseList(sec.teachers);
                const allUsers = (typeof getStoredJson === 'function') ? getStoredJson(USER_STORAGE_KEY, []) : [];
                const cleanStr = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

                if (rawSecTeachers.length > 0) {
                    window.selectedSectionTeachers = rawSecTeachers.map((t, idx) => {
                        const tName = typeof t === 'object' ? (t.name || t.fullName || '') : String(t);
                        const tClean = cleanStr(tName);
                        const matchedU = allUsers.find(u => {
                            if (typeof window.isUserNameMatch === 'function') {
                                return window.isUserNameMatch(t, u);
                            }
                            const uId = String(u.uid || u.id || '').trim().toLowerCase();
                            if (t.id && uId === String(t.id).trim().toLowerCase()) return true;
                            if (t.uid && uId === String(t.uid).trim().toLowerCase()) return true;
                            const uName = cleanStr(u.fullName || u.name || `${u.firstName || ''} ${u.lastName || ''}`);
                            const uRev = cleanStr(`${u.lastName || ''} ${u.firstName || ''}`);
                            return uName === tClean || uRev === tClean || (tClean && (uName.includes(tClean) || tClean.includes(uName)));
                        });
                        return {
                            id: (typeof t === 'object' && (t.id || t.uid)) || matchedU?.uid || matchedU?.id || '',
                            uid: (typeof t === 'object' && (t.uid || t.id)) || matchedU?.uid || matchedU?.id || '',
                            name: (matchedU && (matchedU.fullName || `${matchedU.firstName || ''} ${matchedU.lastName || ''}`.trim())) || tName,
                            role: typeof t === 'object' ? (t.role || 'Teacher') : 'Teacher',
                            email: (typeof t === 'object' && t.email) || matchedU?.email || '',
                            isPrimary: typeof t === 'object' ? Boolean(t.isPrimary) : (idx === 0)
                        };
                    }).filter(t => t.name);
                    if (window.selectedSectionTeachers.length > 0 && !window.selectedSectionTeachers.some(t => t.isPrimary)) {
                        window.selectedSectionTeachers[0].isPrimary = true;
                    }
                    window.collapseExtraAdviserRoles(window.selectedSectionTeachers);
                } else if (sec.teacher) {
                    const tClean = cleanStr(sec.teacher);
                    const matchedU = allUsers.find(u => {
                        if (typeof window.isUserNameMatch === 'function') {
                            return window.isUserNameMatch(sec.teacher, u);
                        }
                        const uName = cleanStr(u.fullName || u.name || `${u.firstName || ''} ${u.lastName || ''}`);
                        const uRev = cleanStr(`${u.lastName || ''} ${u.firstName || ''}`);
                        return uName === tClean || uRev === tClean || (tClean && (uName.includes(tClean) || tClean.includes(uName)));
                    });
                    window.selectedSectionTeachers = [{
                        id: sec.teacherId || sec.teacherUid || matchedU?.uid || matchedU?.id || '',
                        uid: sec.teacherId || sec.teacherUid || matchedU?.uid || matchedU?.id || '',
                        name: (matchedU && (matchedU.fullName || `${matchedU.firstName || ''} ${matchedU.lastName || ''}`.trim())) || sec.teacher,
                        role: sec.role || 'Teacher',
                        email: sec.teacherEmail || matchedU?.email || '',
                        isPrimary: true
                    }];
                } else {
                    window.selectedSectionTeachers = [];
                }

                window.selectedSectionStudents = safeParseList(sec.students);
                window.renderAssignSectionOverview();

                if (titleEl) titleEl.textContent = 'Edit Assigned Section';
                const canDeleteSection = (typeof window.canCurrentAdminDelete === 'function') ? window.canCurrentAdminDelete('section') : true;
                const secDelBtn = document.getElementById('section-delete-btn');
                const splitDelBtn = document.getElementById('section-split-delete-btn');
                if (secDelBtn) {
                    secDelBtn.classList.toggle('hidden', !canDeleteSection);
                    if (canDeleteSection) {
                        secDelBtn.style.removeProperty('display');
                        delete secDelBtn.dataset.permHidden;
                    } else {
                        secDelBtn.style.setProperty('display', 'none', 'important');
                    }
                }
                if (splitDelBtn) {
                    splitDelBtn.classList.toggle('hidden', !canDeleteSection);
                }

                // Edit mode: primary = "Save Changes", secondary = "+ Save & Create" hidden
                const saveLabelEdit = document.getElementById('section-save-label');
                if (saveLabelEdit) saveLabelEdit.textContent = 'Save Changes';
                const createLabelEdit = document.getElementById('section-deploy-create-label');
                if (createLabelEdit) createLabelEdit.textContent = 'Save & Create';
                document.getElementById('section-deploy-create-btn')?.classList.add('hidden');
                document.getElementById('section-split-btn-group')?.classList.remove('hidden');
                document.getElementById('section-back-btn')?.classList.add('hidden');

                // Hide step tabs and show status badge
                const stepTabs = document.getElementById('section-step-tabs-container');
                if (stepTabs) stepTabs.classList.add('hidden');
                const statusBadge = document.getElementById('section-modal-status-badge');
                if (statusBadge) {
                    const isDraft = (sec.status === 'Draft' || sec.status === 'draft');
                    statusBadge.className = isDraft
                        ? "text-xs font-bold px-2.5 py-0.5 rounded-full font-['Inter'] bg-amber-100 text-amber-800 border border-amber-200"
                        : "text-xs font-bold px-2.5 py-0.5 rounded-full font-['Inter'] bg-emerald-100 text-emerald-800 border border-emerald-200";
                    statusBadge.textContent = isDraft ? 'Draft' : 'Deployed';
                    statusBadge.classList.remove('hidden');
                }
            }
        } else {
            window.isEditingSection = false;
            // Reset form for new section
            document.getElementById('edit-section-name').value = '';
            document.getElementById('edit-section-grade').value = '';
            document.getElementById('edit-section-room').value = '';
            document.getElementById('edit-section-teacher').value = '';
            document.getElementById('edit-section-role').value = 'Teacher';
            document.getElementById('edit-section-subject').value = '';

            const startTimeInput = document.getElementById('edit-section-start-time');
            const endTimeInput = document.getElementById('edit-section-end-time');
            if (startTimeInput) startTimeInput.value = '';
            if (endTimeInput) endTimeInput.value = '';

            window.setSelectedSectionDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
            window.selectedSectionDailySchedule = [];

            // Pre-select the active school year, if any
            const activeSY = schoolYearRecords.find(r => r.status === 'Active');
            const activeSYLabel = activeSY ? `${activeSY.yearStart}\u2013${activeSY.yearEnd}` : '';
            window.populateSectionSchoolYearDropdown(activeSYLabel);

            window.selectedSectionTeachers = [];
            window.selectedSectionStudents = [];
            window.renderAssignSectionOverview();

            if (titleEl) titleEl.textContent = 'Create Section';
            const secDelBtn = document.getElementById('section-delete-btn');
            const splitDelBtn = document.getElementById('section-split-delete-btn');
            if (secDelBtn) {
                secDelBtn.classList.add('hidden');
                secDelBtn.style.setProperty('display', 'none', 'important');
            }
            if (splitDelBtn) {
                splitDelBtn.classList.add('hidden');
            }

            // Restore step tabs and hide status badge in Create mode
            const stepTabs = document.getElementById('section-step-tabs-container');
            if (stepTabs) stepTabs.classList.remove('hidden');
            const statusBadge = document.getElementById('section-modal-status-badge');
            if (statusBadge) statusBadge.classList.add('hidden');

            // Create mode: primary = "Deploy Section", secondary = "+ Deploy & Create"
            const saveLabelCreate = document.getElementById('section-save-label');
            if (saveLabelCreate) saveLabelCreate.textContent = 'Deploy Section';
            const createLabelCreate = document.getElementById('section-deploy-create-label');
            if (createLabelCreate) createLabelCreate.textContent = 'Deploy & Create';
            document.getElementById('section-split-btn-group')?.classList.remove('hidden');
        }

        // Capture initial state for change detection BEFORE running validation
        initialSectionValues = {
            name: document.getElementById('edit-section-name')?.value.trim() || '',
            grade: document.getElementById('edit-section-grade')?.value || '',
            room: document.getElementById('edit-section-room')?.value.trim() || '',
            schoolYear: document.getElementById('edit-section-school-year')?.value || '',
            startTime: document.getElementById('edit-section-start-time')?.value || '',
            endTime: document.getElementById('edit-section-end-time')?.value || '',
            days: window.getSelectedSectionDays ? window.getSelectedSectionDays() : [],
            teacher: document.getElementById('edit-section-teacher')?.value.trim() || '',
            role: document.getElementById('edit-section-role')?.value || '',
            subject: document.getElementById('edit-section-subject')?.value.trim() || '',
            dailySchedules: JSON.stringify(window.selectedSectionDailySchedule || []),
            teachers: JSON.stringify(window.selectedSectionTeachers || []),
            students: JSON.stringify(window.selectedSectionStudents || [])
        };

        if (typeof window.populateSectionNameSuggestions === 'function') {
            window.populateSectionNameSuggestions();
        }
        window.validateSectionStep1();
        if (typeof window.updateSelectPlaceholderColors === 'function') {
            window.updateSelectPlaceholderColors(overlay);
        }
    } else {
        if (overlay) {
            overlay.classList.add('hidden');
            overlay.scrollTop = 0;
        }
        document.body.classList.remove('section-edit-mode');
        window.isEditingSection = false;
        window.currentEditingSectionId = null;
        window.selectedSectionStudents = [];
        window.selectedSectionTeachers = [];
        window.selectedSectionDailySchedule = [];
        window.currentSectionStep = 1;
        if (typeof window.closeSectionSubpage === 'function') window.closeSectionSubpage();
        if (typeof window.handleSectionStep === 'function') window.handleSectionStep(1);
    }
};

window.handleSectionStepClick = function (targetStep) {
    // Step bars and titles are purely visual progress indicators and unclickable
    return;
};

window.handleSectionStep = function (step) {
    window.currentSectionStep = step;

    const bar1 = document.getElementById('section-step-bar-1-label');
    const track1 = document.getElementById('section-step-bar-1-track');
    const bar2 = document.getElementById('section-step-bar-2-label');
    const track2 = document.getElementById('section-step-bar-2-track');
    const step1 = document.getElementById('section-step-1');
    const step2 = document.getElementById('section-step-2');

    const barWrap1 = document.getElementById('section-step-bar-1');
    const barWrap2 = document.getElementById('section-step-bar-2');
    const stepTabs = document.getElementById('section-step-tabs-container');

    if (stepTabs) {
        if (window.isEditingSection) {
            stepTabs.classList.add('hidden');
            stepTabs.style.setProperty('display', 'none', 'important');
        } else {
            stepTabs.classList.remove('hidden');
            stepTabs.style.removeProperty('display');
        }
    }

    if (step === 1) {
        step1?.classList.remove('hidden');
        step2?.classList.add('hidden');

        // Step 1 Active
        if (barWrap1) {
            barWrap1.classList.add('bg-[#15803d]/10');
            barWrap1.classList.remove('bg-slate-100');
        }
        if (barWrap2) {
            barWrap2.classList.remove('bg-[#15803d]/10');
            barWrap2.classList.add('bg-slate-100');
        }
        if (bar1) {
            bar1.textContent = 'Add Section';
            bar1.className = 'text-base font-bold capitalize tracking-normal transition-colors text-[#15803d] mb-3';
        }
        if (track1) {
            track1.className = 'w-full h-1.5 bg-[#15803d] transition-all';
        }

        // Step 2 Inactive
        if (bar2) {
            bar2.textContent = 'Assign Section';
            bar2.className = 'text-base font-bold capitalize tracking-normal transition-colors text-black-fade mb-3';
        }
        if (track2) {
            track2.className = 'w-full h-1.5 bg-slate-200 transition-all';
        }

        document.getElementById('section-back-btn')?.classList.add('hidden');
        document.getElementById('section-next-btn')?.classList.remove('hidden');
        document.getElementById('section-modal-footer')?.classList.remove('hidden');
        document.getElementById('section-split-btn-group')?.classList.remove('hidden');
        document.getElementById('section-deploy-create-btn')?.classList.toggle('hidden', window.isEditingSection);
        window.validateSectionStep1();
    } else {
        step1?.classList.add('hidden');
        step2?.classList.remove('hidden');

        // Step 1 Completed
        if (barWrap1) {
            barWrap1.classList.remove('bg-[#15803d]/10');
            barWrap1.classList.add('bg-slate-100');
        }
        if (barWrap2) {
            barWrap2.classList.add('bg-[#15803d]/10');
            barWrap2.classList.remove('bg-slate-100');
        }
        if (bar1) {
            bar1.textContent = 'Add Section';
            bar1.className = 'text-base font-bold capitalize tracking-normal transition-colors text-[#15803d] mb-3';
        }
        if (track1) {
            track1.className = 'w-full h-1.5 bg-[#15803d] transition-all';
        }

        // Step 2 Active
        if (bar2) {
            bar2.textContent = 'Assign Section';
            bar2.className = 'text-base font-bold capitalize tracking-normal transition-colors text-[#15803d] mb-3';
        }
        if (track2) {
            track2.className = 'w-full h-1.5 bg-[#15803d] transition-all';
        }

        document.getElementById('section-back-btn')?.classList.remove('hidden');
        document.getElementById('section-next-btn')?.classList.add('hidden');
        document.getElementById('section-modal-footer')?.classList.add('hidden');
        document.getElementById('section-split-btn-group')?.classList.remove('hidden');
        document.getElementById('section-deploy-create-btn')?.classList.toggle('hidden', window.isEditingSection);
        window.validateSectionDeployment();
        if (typeof window.renderAssignSectionOverview === 'function') {
            window.renderAssignSectionOverview();
        }
    }
};

window.switchEditSection = function (sectionId) {
    const sections = getStoredJson(SECTIONS_STORAGE_KEY, []);
    const target = sections.find(s => String(s.id) === String(sectionId) || String(s.name) === String(sectionId));
    if (!target) return;

    if (confirm(`Switch to editing Section "${target.name}"? Any unsaved changes on the current form will be discarded.`)) {
        window.toggleSectionOverlay(true, target);
    }
};

window.renderSectionScheduleAvailability = function (container, room, schoolYear, days, startTime, endTime, conflict) {
    if (!container) return;

    if (!room) {
        container.innerHTML = `
            <div class="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <i class="fa-solid fa-circle-info text-slate-400"></i>
                <span>Enter a <strong>Room number</strong> above to view live schedule & availability.</span>
            </div>
        `;
        return;
    }

    const sections = getStoredJson(SECTIONS_STORAGE_KEY, []);
    const roomSections = sections.filter(s => {
        if (window.isEditingSection && String(s.id) === String(window.currentEditingSectionId)) return false;
        if (schoolYear && (s.schoolYear || '').trim() !== schoolYear.trim()) return false;
        return (s.room || '').trim().toLowerCase() === room.toLowerCase();
    });

    let html = '';

    // Schedule Conflict or Time Error Warning
    if (startTime && endTime && startTime >= endTime) {
        html += `
            <div class="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs font-semibold text-rose-700 mb-3">
                <i class="fa-solid fa-circle-exclamation text-rose-600 text-base shrink-0"></i>
                <div>
                    <span class="font-bold">Invalid Hours:</span>
                    <p class="font-normal text-rose-600 mt-0.5">
                        End Time cannot be earlier than or equal to Start Time. Please select an End Time after <strong>${escapeHtml(formatSectionSchedule(startTime, '') || startTime)}</strong>.
                    </p>
                </div>
            </div>
        `;
    } else if (conflict) {
        const confDays = Array.isArray(conflict.days) ? conflict.days.filter(d => days.includes(d)).join(', ') : (conflict.daysFormatted || 'same days');
        html += `
            <div class="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2 mb-3">
                <div class="flex items-start justify-between gap-3">
                    <div class="flex items-start gap-2 text-xs font-semibold text-rose-700">
                        <i class="fa-solid fa-triangle-exclamation text-rose-600 mt-0.5 text-sm shrink-0"></i>
                        <div>
                            <span class="font-bold">Schedule Conflict in Room ${escapeHtml(room)}:</span>
                            <p class="font-normal text-rose-600 mt-0.5 leading-relaxed">
                                Overlaps on <strong>${escapeHtml(confDays)}</strong> with Section <strong>"${escapeHtml(conflict.name)}"</strong> (${escapeHtml(conflict.schedule || 'Scheduled')}).
                            </p>
                        </div>
                    </div>
                    <button type="button" onclick="window.switchEditSection('${escapeHtml(conflict.id)}')"
                        class="px-2.5 py-1.5 bg-white hover:bg-rose-100 border border-rose-300 rounded-lg text-xs font-bold text-rose-700 transition-colors shadow-sm shrink-0 cursor-pointer flex items-center gap-1.5">
                        <i class="fa-solid fa-pen text-[10px]"></i>
                        <span>Edit ${escapeHtml(conflict.name)}</span>
                    </button>
                </div>
            </div>
        `;
    } else if (startTime && endTime && startTime < endTime && days.length > 0) {
        html += `
            <div class="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs font-semibold text-emerald-800 mb-3">
                <div class="flex items-center gap-2">
                    <i class="fa-solid fa-circle-check text-emerald-600 text-sm shrink-0"></i>
                    <span>Room ${escapeHtml(room)} is <strong>available</strong> for this schedule (${formatSectionDaysString(days)} • ${formatSectionSchedule(startTime, endTime)}).</span>
                </div>
            </div>
        `;
    }

    // Room Occupancy Breakdown
    if (roomSections.length > 0) {
        html += `
            <div class="space-y-1.5">
                <span class="text-[11px] font-bold uppercase tracking-wider block" style="color: rgba(0, 0, 0, 0.45);">
                    Existing Sections in Room ${escapeHtml(room)} (S.Y. ${escapeHtml(schoolYear || 'Current')}):
                </span>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        `;
        roomSections.forEach(s => {
            html += `
                <div class="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl text-xs">
                    <div class="truncate mr-2">
                        <span class="font-bold text-black">${escapeHtml(s.name)}</span>
                        <span class="text-slate-500 text-[11px]">(${escapeHtml(s.gradeLevel || s.grade || 'Grade 11')})</span>
                        <div class="text-slate-500 text-[11px] truncate">${escapeHtml(s.schedule || 'No schedule')}</div>
                    </div>
                    <button type="button" onclick="window.switchEditSection('${escapeHtml(s.id)}')"
                        class="px-2 py-1 text-[11px] font-bold text-[#15803d] hover:underline shrink-0 cursor-pointer">
                        Edit
                    </button>
                </div>
            `;
        });
        html += `
                </div>
            </div>
        `;
    } else {
        html += `
            <div class="flex items-center gap-2 text-xs text-slate-500">
                <i class="fa-solid fa-door-open text-emerald-600"></i>
                <span>Room ${escapeHtml(room)} has no other scheduled sections in S.Y. ${escapeHtml(schoolYear || 'selected')}.</span>
            </div>
        `;
    }

    container.innerHTML = html;
};

function formatSectionSchedule(startTime, endTime) {
    if (!startTime && !endTime) return '';
    const formatTime12 = (t) => {
        if (!t) return '';
        const [h, m] = t.split(':').map(Number);
        if (isNaN(h)) return t;
        const period = h >= 12 ? 'PM' : 'AM';
        const displayH = h % 12 === 0 ? 12 : h % 12;
        return `${String(displayH).padStart(2, '0')}:${String(m || 0).padStart(2, '0')} ${period}`;
    };
    if (startTime && endTime) {
        return `${formatTime12(startTime)} – ${formatTime12(endTime)}`;
    }
    return formatTime12(startTime || endTime);
}
window.formatSectionSchedule = formatSectionSchedule;

window.getDefaultSectionDailySchedule = function (days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], startTime = '', endTime = '') {
    const daysOrder = [
        { day: 'Sun', fullDay: 'Sunday' },
        { day: 'Mon', fullDay: 'Monday' },
        { day: 'Tue', fullDay: 'Tuesday' },
        { day: 'Wed', fullDay: 'Wednesday' },
        { day: 'Thu', fullDay: 'Thursday' },
        { day: 'Fri', fullDay: 'Friday' },
        { day: 'Sat', fullDay: 'Saturday' }
    ];
    const daysSet = new Set(Array.isArray(days) ? days : []);
    return daysOrder.map(d => ({
        day: d.day,
        fullDay: d.fullDay,
        active: daysSet.has(d.day),
        startTime: daysSet.has(d.day) ? (startTime || '') : '',
        endTime: daysSet.has(d.day) ? (endTime || '') : ''
    }));
};

window.formatFormattedScheduleSummary = function (dailyScheduleArray) {
    if (!Array.isArray(dailyScheduleArray)) return 'No schedule assigned';
    const activeItems = dailyScheduleArray.filter(d => d.active && d.startTime && d.endTime);
    if (activeItems.length === 0) return 'No schedule assigned';

    // Group days that have identical start & end times
    const groups = {};
    activeItems.forEach(item => {
        const timeKey = `${item.startTime}–${item.endTime}`;
        if (!groups[timeKey]) groups[timeKey] = [];
        groups[timeKey].push(item.day);
    });

    const parts = [];
    for (const [timeKey, days] of Object.entries(groups)) {
        const [st, et] = timeKey.split('–');
        const daysStr = formatSectionDaysString(days);
        const timeStr = formatSectionSchedule(st, et);
        parts.push(`${daysStr} • ${timeStr}`);
    }
    return parts.join(', ');
};

window.renderScheduleSubpage = function () {
    const listContainer = document.getElementById('subpage-days-schedule-list');
    if (!listContainer) return;

    if (!Array.isArray(window.stagedSectionDailySchedule) || window.stagedSectionDailySchedule.length === 0) {
        window.stagedSectionDailySchedule = window.getDefaultSectionDailySchedule(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], '', '');
    }

    const activeFirst = window.stagedSectionDailySchedule.find(d => d.active && d.startTime && d.endTime);
    const masterStart = document.getElementById('subpage-master-start-time');
    const masterEnd = document.getElementById('subpage-master-end-time');
    if (masterStart) {
        if (activeFirst && activeFirst.startTime) {
            masterStart.value = activeFirst.startTime;
        } else if (!masterStart.value) {
            masterStart.value = '09:00';
        }
    }
    if (masterEnd) {
        if (activeFirst && activeFirst.endTime) {
            masterEnd.value = activeFirst.endTime;
        } else if (!masterEnd.value) {
            masterEnd.value = '10:30';
        }
    }

    const conflicts = window.getScheduleSubpageConflicts ? window.getScheduleSubpageConflicts(window.stagedSectionDailySchedule) : [];

    let rowsHtml = window.stagedSectionDailySchedule.map((item) => {
        const isActive = Boolean(item.active);
        const dayConflict = isActive ? conflicts.find(c => c.day === item.fullDay || c.day === item.day) : null;

        let badgeHtml = '';
        if (!isActive) {
            badgeHtml = `<span class="text-xs font-semibold text-black-fade">Off</span>`;
        } else if (dayConflict) {
            badgeHtml = `<span class="text-xs font-bold text-rose-600" title="Occupied by Section ${escapeHtml(dayConflict.section.name)}">Room Occupied</span>`;
        } else if (item.startTime && item.endTime) {
            badgeHtml = `<span class="text-xs font-bold text-emerald-600">Available</span>`;
        } else {
            badgeHtml = `<span class="text-xs font-semibold text-amber-600">Set Hours</span>`;
        }

        return `
            <div class="p-4 hover:bg-black/[0.02] transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-['Inter'] ${isActive ? (dayConflict ? 'bg-rose-50/40' : '') : 'opacity-40'}">
                <!-- Day Toggle & Name -->
                <div class="flex items-center gap-3.5 min-w-[150px]">
                    <input type="checkbox" ${isActive ? 'checked' : ''} onchange="window.handleScheduleDayToggle('${item.day}')"
                        class="w-5 h-5 rounded ${isActive ? 'accent-blue-600 text-blue-600 focus:ring-blue-500' : 'border-black/35 bg-black/[0.04] hover:border-black/60'} cursor-pointer transition-colors">
                    <span class="text-sm font-bold ${isActive ? (dayConflict ? 'text-rose-700' : 'text-black') : 'text-black-fade'}">${escapeHtml(item.fullDay)}</span>
                </div>

                <!-- Native Browser Hours Pickers -->
                <div class="flex items-center gap-3 flex-1 w-full sm:w-auto">
                    <div class="flex items-center gap-2">
                        <!-- Start Time Input Box -->
                        <div class="time-input-box relative flex items-center ${!isActive ? 'bg-black/[0.03] border border-black/10 opacity-50 pointer-events-none' : (dayConflict ? 'bg-white border border-rose-300' : 'bg-white border border-slate-200 hover:border-slate-300')} focus-within:border-slate-400 rounded-xl h-10 px-3 transition-all shadow-2xs font-['Inter'] w-[170px] sm:w-[195px] shrink-0 cursor-text">
                            <input type="time" value="${item.startTime || ''}"
                                ${!isActive ? 'disabled' : ''}                                oninput="window.handleScheduleDayTimeChange('${item.day}', 'start', this.value, this)"
                                onchange="window.handleScheduleDayTimeChange('${item.day}', 'start', this.value, this)"
                                style="color-scheme: light;"
                                class="w-full h-full bg-transparent text-xs font-semibold ${dayConflict ? 'text-rose-700' : 'text-black'} outline-none border-none p-0 font-['Inter']" />
                        </div>

                        <span class="text-black-fade font-bold text-xs select-none px-0.5">—</span>

                        <!-- End Time Input Box -->
                        <div class="time-input-box relative flex items-center ${!isActive ? 'bg-black/[0.03] border border-black/10 opacity-50 pointer-events-none' : (dayConflict ? 'bg-white border border-rose-300' : 'bg-white border border-slate-200 hover:border-slate-300')} focus-within:border-slate-400 rounded-xl h-10 px-3 transition-all shadow-2xs font-['Inter'] w-[170px] sm:w-[195px] shrink-0 cursor-text">
                            <input type="time" value="${item.endTime || ''}"
                                ${!isActive ? 'disabled' : ''}                                oninput="window.handleScheduleDayTimeChange('${item.day}', 'end', this.value, this)"
                                onchange="window.handleScheduleDayTimeChange('${item.day}', 'end', this.value, this)"
                                style="color-scheme: light;"
                                class="w-full h-full bg-transparent text-xs font-semibold ${dayConflict ? 'text-rose-700' : 'text-black'} outline-none border-none p-0 font-['Inter']" />
                        </div>
                    </div>
                </div>

                <!-- Status Badge -->
                <div class="shrink-0 text-right min-w-[100px]">
                    ${badgeHtml}
                </div>
            </div>
        `;
    }).join('');

    listContainer.innerHTML = `
        <div class="divide-y divide-black/10 border-y border-black/10 border-x-0 rounded-none sigma-selected-faded-panel overflow-hidden">
            ${rowsHtml}
        </div>
    `;
    window.validateSubpageScheduleRoomConflict();
};

function formatSectionTime12(t) {
    if (!t || t === '--:-- --') return '--:-- --';
    const match = String(t).match(/(\d{1,2})[:.](\d{2})(?:\s*([AP]M))?/i);
    if (!match) return t;
    let h = parseInt(match[1], 10);
    let m = parseInt(match[2], 10);
    let p = match[3] ? match[3].toUpperCase() : (h >= 12 ? 'PM' : 'AM');
    if (!match[3]) {
        if (h >= 12) {
            if (h > 12) h -= 12;
        } else if (h === 0) {
            h = 12;
        }
    }
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${p}`;
}

function parseSectionTime24(t) {
    if (!t || t === '--:-- --') return '';
    const match = String(t).match(/(\d{1,2})[:.](\d{2})(?:\s*([AP]M))?/i);
    if (!match) return t;
    let h = parseInt(match[1], 10);
    let m = parseInt(match[2], 10);
    let p = match[3] ? match[3].toUpperCase() : null;
    if (p === 'PM' && h < 12) h += 12;
    if (p === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

let _adminSharedTimePickerCloseCallback = null;

window.openSharedAdminTimePickerPopover = function ({ anchorElement, initialTime, onChange, onClose }) {
    let popover = document.getElementById('admin-schedule-time-dial-popover');
    if (!popover) {
        popover = document.createElement('div');
        popover.id = 'admin-schedule-time-dial-popover';
        popover.style.cssText = 'position: fixed; z-index: 999999; width: 194px; background: #ffffff; border-radius: 0; border: 1px solid #cbd5e1; padding: 0.55rem; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15); display: none; flex-direction: column; align-items: center;';
        popover.innerHTML = `
            <div id="admin-schedule-time-dial-mount" style="width: 100%; display: flex; justify-content: center;"></div>
            <button type="button" onclick="window.closeSharedAdminTimePickerPopover(event)" 
                style="margin-top: 0.35rem; width: 100%; padding: 0.32rem 0.5rem; background: #f1f5f9; color: #000000; font-size: 11px; font-weight: 700; border-radius: 6px; border: none; cursor: pointer; transition: all 0.15s ease;"
                onmouseenter="this.style.backgroundColor='#e2e8f0'"
                onmouseleave="this.style.backgroundColor='#f1f5f9'">
                Done
            </button>
        `;
        popover.addEventListener('click', (e) => e.stopPropagation());
        document.body.appendChild(popover);

        window.addEventListener('click', () => {
            const p = document.getElementById('admin-schedule-time-dial-popover');
            if (p && p.style.display !== 'none') {
                window.closeSharedAdminTimePickerPopover();
            }
        });
    }

    _adminSharedTimePickerCloseCallback = onClose || null;

    // Toggle: if this popover is already open and the same icon is clicked, close it
    const iconBtn = anchorElement?.querySelector('button') || (anchorElement?.tagName === 'BUTTON' ? anchorElement : null);
    const isAlreadyOpen = popover.style.display !== 'none' && iconBtn?.dataset?.active === 'true';
    if (isAlreadyOpen) {
        window.closeSharedAdminTimePickerPopover();
        return;
    }

    // Reset previous active buttons & mark current trigger button active
    document.querySelectorAll('[data-admin-time-btn="true"]').forEach(b => {
        b.dataset.active = 'false';
        b.style.backgroundColor = 'transparent';
        b.style.color = 'rgba(0, 0, 0, 0.45)';
    });
    if (iconBtn) {
        iconBtn.dataset.adminTimeBtn = 'true';
        iconBtn.dataset.active = 'true';
        iconBtn.style.backgroundColor = '#e2e8f0';
        iconBtn.style.color = '#000000';
    }

    // Position popover right below anchorElement, right-aligned
    popover.style.display = 'flex';
    const rect = anchorElement.getBoundingClientRect();
    const popoverHeight = popover.offsetHeight || 215;
    let top = Math.round(rect.bottom - 1);
    let left = Math.round(rect.right - 194); // stick to the right edge
    if (left < 10) left = 10;
    if (left + 194 > window.innerWidth - 10) {
        left = window.innerWidth - 204;
    }
    if (top + popoverHeight > window.innerHeight - 8 && rect.top > popoverHeight + 8) {
        top = Math.round(rect.top - popoverHeight + 1);
    }
    popover.style.top = `${top}px`;
    popover.style.left = `${left}px`;

    const mount = document.getElementById('admin-schedule-time-dial-mount');
    if (mount && typeof window.createCircularTimePicker === 'function') {
        mount.innerHTML = '';
        window._adminSharedTimePickerInstance = window.createCircularTimePicker(mount, {
            initialTime: (initialTime && initialTime !== '--:-- --') ? initialTime : null,
            onChange: onChange
        });
    }
};

window.closeSharedAdminTimePickerPopover = function (e) {
    if (e) e.stopPropagation();
    const popover = document.getElementById('admin-schedule-time-dial-popover');
    if (popover) popover.style.display = 'none';

    document.querySelectorAll('[data-admin-time-btn="true"]').forEach(b => {
        b.dataset.active = 'false';
        b.style.backgroundColor = 'transparent';
        b.style.color = 'rgba(0, 0, 0, 0.45)';
    });

    if (window._adminSharedTimePickerInstance?.unselect) {
        window._adminSharedTimePickerInstance.unselect();
    }
    if (typeof _adminSharedTimePickerCloseCallback === 'function') {
        const cb = _adminSharedTimePickerCloseCallback;
        _adminSharedTimePickerCloseCallback = null;
        cb();
    }
};

window.openScheduleDayTimePicker = function (e, day, type) {
    if (e) e.stopPropagation();
    const item = window.stagedSectionDailySchedule?.find(d => d.day === day);
    if (!item) return;

    const currentVal24 = type === 'start' ? (item.startTime || '09:00') : (item.endTime || '10:30');
    const triggerBtn = e.currentTarget || e.target;
    const container = triggerBtn.closest('.relative') || triggerBtn.parentElement;

    window.openSharedAdminTimePickerPopover({
        anchorElement: container,
        initialTime: currentVal24,
        onChange: (t) => {
            if (type === 'start') {
                item.startTime = t.time24;
                if (item.endTime && item.endTime <= t.time24) {
                    const [h, m] = t.time24.split(':').map(Number);
                    let nextH = Math.min(23, h + 1);
                    let nextM = nextH === 23 ? 59 : m;
                    item.endTime = `${String(nextH).padStart(2, '0')}:${String(nextM).padStart(2, '0')}`;
                }
            } else {
                item.endTime = t.time24;
            }
            const input = container.querySelector('input');
            if (input) input.value = `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')} ${t.period.toUpperCase()}`;
            window.validateSubpageScheduleRoomConflict?.();
        },
        onClose: () => {
            window.renderScheduleSubpage();
        }
    });
};

window.openMasterScheduleTimePicker = function (e, type) {
    if (e) e.stopPropagation();
    const input = document.getElementById(type === 'start' ? 'subpage-master-start-time' : 'subpage-master-end-time');
    const container = input ? input.closest('.relative') : (e.currentTarget || e.target).parentElement;
    const rawVal = input?.value || (type === 'start' ? '09:00' : '10:30');
    const init24 = parseSectionTime24(rawVal) || (type === 'start' ? '09:00' : '10:30');

    window.openSharedAdminTimePickerPopover({
        anchorElement: container,
        initialTime: init24,
        onChange: (t) => {
            if (input) {
                input.value = `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')} ${t.period.toUpperCase()}`;
                input.dataset.time24 = t.time24;
            }
        },
        onClose: () => {}
    });
};

window.handleScheduleDayTextInput = function (day, type, value) {
    if (!value || value === '--:-- --') return;
    const match = String(value).match(/(\d{1,2})(?:[:.](\d{0,2}))?(?:\s*([AP]M)?)?/i);
    if (!match) return;
    let h = parseInt(match[1], 10);
    let m = match[2] !== undefined && match[2] !== '' ? parseInt(match[2], 10) : 0;
    let p = match[3] ? match[3].toUpperCase() : undefined;
    if (isNaN(h)) return;

    const item = window.stagedSectionDailySchedule?.find(d => d.day === day);
    if (!item) return;

    if (h > 12 && (!p || p === 'AM')) {
        p = 'PM';
        h -= 12;
    } else if (h === 0) {
        h = 12;
        p = 'AM';
    }
    if (m > 59) m = 59;

    let h24 = h;
    if (p === 'PM' && h24 < 12) h24 += 12;
    if (p === 'AM' && h24 === 12) h24 = 0;
    const time24 = `${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

    if (type === 'start') {
        item.startTime = time24;
    } else {
        item.endTime = time24;
    }
    if (window._adminSharedTimePickerInstance) {
        window._adminSharedTimePickerInstance.setTime(h, m, p);
    }
    window.validateSubpageScheduleRoomConflict?.();
};

window.formatScheduleDayTextInput = function (day, type, input) {
    if (!input) return;
    const item = window.stagedSectionDailySchedule?.find(d => d.day === day);
    if (!item) return;
    const t = type === 'start' ? item.startTime : item.endTime;
    input.value = t ? formatSectionTime12(t) : '--:-- --';
};

window.handleMasterTimeInput = function (type, value) {
    const input = document.getElementById(type === 'start' ? 'subpage-master-start-time' : 'subpage-master-end-time');
    if (!input || !value || value === '--:-- --') return;
    const match = String(value).match(/(\d{1,2})(?:[:.](\d{0,2}))?(?:\s*([AP]M)?)?/i);
    if (!match) return;
    let h = parseInt(match[1], 10);
    let m = match[2] !== undefined && match[2] !== '' ? parseInt(match[2], 10) : 0;
    let p = match[3] ? match[3].toUpperCase() : undefined;
    if (isNaN(h)) return;

    if (h > 12 && (!p || p === 'AM')) {
        p = 'PM';
        h -= 12;
    } else if (h === 0) {
        h = 12;
        p = 'AM';
    }
    if (m > 59) m = 59;

    let h24 = h;
    if (p === 'PM' && h24 < 12) h24 += 12;
    if (p === 'AM' && h24 === 12) h24 = 0;
    input.dataset.time24 = `${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

window.formatMasterTimeInput = function (type, input) {
    if (!input) return;
    const t24 = input.dataset.time24 || parseSectionTime24(input.value);
    if (t24) {
        input.value = formatSectionTime12(t24);
        input.dataset.time24 = t24;
    } else {
        input.value = '--:-- --';
    }
};

window.handleScheduleDayToggle = function (day) {
    if (!Array.isArray(window.stagedSectionDailySchedule)) return;
    const item = window.stagedSectionDailySchedule.find(d => d.day === day);
    if (!item) return;
    item.active = !item.active;
    if (item.active && (!item.startTime || !item.endTime)) {
        const startInp = document.getElementById('subpage-master-start-time');
        const endInp = document.getElementById('subpage-master-end-time');
        const masterStart = startInp?.value || '09:00';
        const masterEnd = endInp?.value || '10:30';
        const anyActive = window.stagedSectionDailySchedule.find(d => d.active && d.day !== day && d.startTime && d.endTime);
        item.startTime = masterStart || (anyActive ? anyActive.startTime : '09:00');
        item.endTime = masterEnd || (anyActive ? anyActive.endTime : '10:30');
    }
    window.renderScheduleSubpage();
};

window.handleScheduleDayTimeChange = function (day, type, value, inputEl) {
    if (!Array.isArray(window.stagedSectionDailySchedule)) return;
    const item = window.stagedSectionDailySchedule.find(d => d.day === day);
    if (!item) return;
    if (type === 'start') {
        item.startTime = value;
        if (item.endTime && item.endTime <= value) {
            const [h, m] = value.split(':').map(Number);
            let nextH = Math.min(23, h + 1);
            let nextM = nextH === 23 ? 59 : m;
            item.endTime = `${String(nextH).padStart(2, '0')}:${String(nextM).padStart(2, '0')}`;
            if (inputEl) {
                const row = inputEl.closest('.flex');
                const endInput = row?.querySelectorAll('input[type="time"]')?.[1];
                if (endInput) endInput.value = item.endTime;
            }
        }
    } else if (type === 'end') {
        if (item.startTime && value && value <= item.startTime) {
            if (typeof window.showAlertDialog === 'function') {
                window.showAlertDialog({
                    title: 'Invalid Schedule Time',
                    message: 'End Time must be later than Start Time within the same 24-hour day (00:00 – 11:59 PM). Schedules cannot exceed 11:59 PM or roll over into the next day.',
                    icon: 'fa-solid fa-clock'
                });
            } else {
                alert('End Time must be later than Start Time within the same 24-hour day (00:00 – 11:59 PM). Schedules cannot exceed 11:59 PM or roll over into the next day.');
            }
            item.endTime = '';
            if (inputEl) inputEl.value = '';
        } else {
            item.endTime = value;
        }
    }
    window.validateSubpageScheduleRoomConflict?.();
};

window.applySchedulePresetDays = function (preset) {
    if (!Array.isArray(window.stagedSectionDailySchedule)) {
        window.stagedSectionDailySchedule = window.getDefaultSectionDailySchedule([], '', '');
    }
    const startInp = document.getElementById('subpage-master-start-time');
    const endInp = document.getElementById('subpage-master-end-time');
    const masterStart = startInp?.value || '09:00';
    const masterEnd = endInp?.value || '10:30';

    let targetDays = [];
    if (preset === 'mon-fri') targetDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    else if (preset === 'mon-sat') targetDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    else if (preset === 'mwf') targetDays = ['Mon', 'Wed', 'Fri'];
    else if (preset === 'tth') targetDays = ['Tue', 'Thu'];

    const targetSet = new Set(targetDays);
    window.stagedSectionDailySchedule.forEach(item => {
        item.active = targetSet.has(item.day);
        if (item.active && (!item.startTime || !item.endTime)) {
            item.startTime = masterStart;
            item.endTime = masterEnd;
        }
    });
    window.renderScheduleSubpage();
};

window.applyMasterTimeToActiveDays = function () {
    const startInp = document.getElementById('subpage-master-start-time');
    const endInp = document.getElementById('subpage-master-end-time');
    const masterStart = startInp?.value || '09:00';
    const masterEnd = endInp?.value || '10:30';

    if (!masterStart || !masterEnd) {
        if (typeof window.showAlertDialog === 'function') {
            window.showAlertDialog({
                title: 'Time Required',
                message: 'Please enter both Start Time and End Time in the Quick Set box first.',
                icon: 'fa-solid fa-clock'
            });
        } else {
            alert('Please enter both Start Time and End Time in the Quick Set box first.');
        }
        return;
    }
    if (masterStart >= masterEnd) {
        if (typeof window.showAlertDialog === 'function') {
            window.showAlertDialog({
                title: 'Invalid Schedule Time',
                message: 'End Time must be later than Start Time within the same 24-hour day (00:00 – 11:59 PM). Schedules cannot exceed 11:59 PM or roll over into the next day.',
                icon: 'fa-solid fa-clock'
            });
        } else {
            alert('End Time must be later than Start Time within the same 24-hour day (00:00 – 11:59 PM). Schedules cannot exceed 11:59 PM or roll over into the next day.');
        }
        return;
    }
    if (!Array.isArray(window.stagedSectionDailySchedule)) {
        window.stagedSectionDailySchedule = window.getDefaultSectionDailySchedule();
    }
    window.stagedSectionDailySchedule.forEach(item => {
        if (item.active) {
            item.startTime = masterStart;
            item.endTime = masterEnd;
        }
    });
    window.renderScheduleSubpage();
};

window.getScheduleSubpageConflicts = function (scheduleList = null) {
    const room = document.getElementById('edit-section-room')?.value.trim();
    const schoolYear = document.getElementById('edit-section-school-year')?.value.trim();
    const listToCheck = scheduleList || window.stagedSectionDailySchedule || window.selectedSectionDailySchedule || [];
    const activeDays = listToCheck.filter(d => d.active && d.startTime && d.endTime);

    if (!room || activeDays.length === 0) return [];

    const sections = getStoredJson(SECTIONS_STORAGE_KEY, []);
    const conflicts = [];
    const parseMins = (t) => {
        if (!t) return 0;
        const [h, m] = t.split(':');
        return (parseInt(h, 10) * 60) + parseInt(m || '0', 10);
    };

    activeDays.forEach(dayItem => {
        const dStart = parseMins(dayItem.startTime);
        const dEnd = parseMins(dayItem.endTime);

        sections.forEach(s => {
            if (window.isEditingSection && String(s.id) === String(window.currentEditingSectionId)) return;
            if (s.status === 'Draft') return;
            if (schoolYear && (s.schoolYear || '').trim() !== schoolYear) return;
            if ((s.room || '').trim().toLowerCase() !== room.toLowerCase()) return;

            let sOccupies = false;
            let sStart = 0;
            let sEnd = 0;
            let sScheduleLabel = s.schedule || '';

            if (Array.isArray(s.dailySchedules)) {
                const matchDay = s.dailySchedules.find(sd => sd.day === dayItem.day && sd.active && sd.startTime && sd.endTime);
                if (matchDay) {
                    sOccupies = true;
                    sStart = parseMins(matchDay.startTime);
                    sEnd = parseMins(matchDay.endTime);
                    sScheduleLabel = `${matchDay.day} ${formatSectionSchedule(matchDay.startTime, matchDay.endTime)}`;
                }
            } else if (Array.isArray(s.days) && s.days.includes(dayItem.day) && s.startTime && s.endTime) {
                sOccupies = true;
                sStart = parseMins(s.startTime);
                sEnd = parseMins(s.endTime);
            }

            if (sOccupies && Math.max(dStart, sStart) < Math.min(dEnd, sEnd)) {
                conflicts.push({ day: dayItem.fullDay || dayItem.day, section: s, scheduleLabel: sScheduleLabel });
            }
        });
    });

    return conflicts;
};

window.validateSubpageScheduleRoomConflict = function () {
    const alertEl = document.getElementById('subpage-schedule-room-conflict-alert');
    if (!alertEl) return;
    const room = document.getElementById('edit-section-room')?.value.trim();
    const activeDays = (window.stagedSectionDailySchedule || []).filter(d => d.active && d.startTime && d.endTime);

    if (!room) {
        alertEl.innerHTML = `
            <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 flex items-center gap-2">
                <i class="fa-solid fa-circle-info text-slate-400"></i>
                <span>Room number not set in Step 1.</span>
            </div>
        `;
        return;
    }

    if (activeDays.length === 0) {
        alertEl.innerHTML = `
            <div class="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-800 flex items-center gap-2">
                <i class="fa-solid fa-circle-exclamation text-amber-600"></i>
                <span>No active meeting days selected yet. Turn on at least 1 day above.</span>
            </div>
        `;
        return;
    }

    const conflicts = window.getScheduleSubpageConflicts(window.stagedSectionDailySchedule);

    if (conflicts.length > 0) {
        const conflictDays = [...new Set(conflicts.map(c => c.day))].join(', ');

        // Group by section — show section name + subject
        const sectionMap = new Map();
        conflicts.forEach(c => {
            const key = c.section.name;
            if (!sectionMap.has(key)) {
                sectionMap.set(key, { name: c.section.name, subject: c.section.subject || '', days: new Set() });
            }
            sectionMap.get(key).days.add(c.day);
        });

        const sectionLines = [...sectionMap.values()].map(s => {
            const subjectLabel = s.subject ? ` — teaching <strong>${escapeHtml(s.subject)}</strong>` : '';
            return `<li>Section <strong>"${escapeHtml(s.name)}"</strong>${subjectLabel} on ${[...s.days].join(', ')}</li>`;
        }).join('');

        alertEl.innerHTML = `
            <div class="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-1.5 text-xs text-rose-700">
                <div class="flex items-center gap-2 font-bold text-rose-800">
                    <i class="fa-solid fa-triangle-exclamation text-rose-600 text-sm"></i>
                    <span>Room ${escapeHtml(room)} Schedule Conflict Detected (Saving Restricted)</span>
                </div>
                <p class="font-normal leading-relaxed text-rose-600">The following section(s) are already using this room at the selected time:</p>
                <ul class="list-disc list-inside space-y-0.5 font-normal text-rose-600 leading-relaxed">
                    ${sectionLines}
                </ul>
                <p class="font-normal text-rose-500 pt-0.5">Please adjust the hours or days before saving.</p>
            </div>
        `;
    } else {
        alertEl.innerHTML = `
            <div class="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-emerald-800">
                <i class="fa-solid fa-circle-check text-emerald-600"></i>
                <span>Room ${escapeHtml(room)} is <strong>available</strong> for all selected hours.</span>
            </div>
        `;
    }
};

window.setExistingSectionPickerSelected = function (isOpen) {
    const btn = document.getElementById('section-existing-picker-btn') || document.getElementById('section-select-existing-btn');
    const icon = document.getElementById('section-existing-picker-icon');
    const text = document.getElementById('section-existing-picker-text');
    const chevron = document.getElementById('section-existing-picker-chevron');
    if (isOpen) {
        if (btn) {
            btn.classList.add('bg-slate-100', 'border-slate-200');
            btn.classList.remove('bg-white', 'hover:bg-slate-50', 'border-[#FFD000]', 'bg-amber-50/40');
        }
        if (icon) {
            icon.classList.remove('text-[#FFD000]');
            icon.classList.add('text-black');
        }
        if (text) {
            text.classList.remove('text-[#FFD000]');
            text.classList.add('text-black');
        }
        if (chevron) {
            chevron.classList.remove('text-[#FFD000]', 'rotate-0');
            chevron.classList.add('text-black', 'rotate-180');
        }
    } else {
        if (btn) {
            btn.classList.remove('border-[#FFD000]', 'bg-amber-50/40', 'bg-slate-100');
            btn.classList.add('border-slate-200', 'bg-white', 'hover:bg-slate-50');
        }
        if (icon) {
            icon.classList.remove('text-[#FFD000]');
            icon.classList.add('text-black');
        }
        if (text) {
            text.classList.remove('text-[#FFD000]');
            text.classList.add('text-black');
        }
        if (chevron) {
            chevron.classList.remove('text-[#FFD000]', 'rotate-180');
            chevron.classList.add('text-black', 'rotate-0');
        }
    }
};

window.toggleExistingSectionsMenu = function (e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    const menu = document.getElementById('section-existing-menu');
    if (!menu) return;
    const isHidden = menu.classList.contains('hidden');
    if (isHidden) {
        menu.classList.remove('hidden');
        window.setExistingSectionPickerSelected(true);
        const searchInput = document.getElementById('section-existing-search-input');
        if (searchInput) {
            searchInput.value = '';
            setTimeout(() => searchInput.focus(), 50);
        }
        window.renderExistingSectionsList('');
    } else {
        menu.classList.add('hidden');
        window.setExistingSectionPickerSelected(false);
    }
};

window.filterExistingSectionsMenu = function (query) {
    window.renderExistingSectionsList(query || '');
};

window.renderExistingSectionsList = function (query = '') {
    const listContainer = document.getElementById('section-existing-list');
    if (!listContainer) return;

    const sections = getStoredJson(SECTIONS_STORAGE_KEY, []);
    const cleanQ = (query || '').trim().toLowerCase();

    // Group sections by unique identity: Name + Grade + School Year
    const profileMap = new Map();
    sections.forEach(s => {
        if (s.status === 'Draft' || s.status === 'draft') return;
        const name = (s.name || '').trim();
        const grade = (s.gradeLevel || s.grade || '').trim();
        const schoolYear = (s.schoolYear || '').trim();
        if (!name || !grade) return;

        const key = `${name.toLowerCase()}___${grade.toLowerCase()}___${schoolYear.toLowerCase()}`;
        if (!profileMap.has(key)) {
            profileMap.set(key, {
                id: s.id,
                name: name,
                gradeLevel: grade,
                schoolYear: schoolYear,
                room: s.room || '',
                teachers: Array.isArray(s.teachers) && s.teachers.length > 0 ? s.teachers : (s.teacher ? [{ name: s.teacher, uid: s.teacherUid || '' }] : []),
                students: Array.isArray(s.students) ? s.students : [],
                subjects: []
            });
        }
        const profile = profileMap.get(key);
        if (s.subject && !profile.subjects.includes(s.subject)) {
            profile.subjects.push(s.subject);
        }
        if ((!profile.room || profile.room === '') && s.room) {
            profile.room = s.room;
        }
        if (profile.students.length === 0 && Array.isArray(s.students) && s.students.length > 0) {
            profile.students = s.students;
        }
        if (profile.teachers.length === 0 && Array.isArray(s.teachers) && s.teachers.length > 0) {
            profile.teachers = s.teachers;
        }
    });

    let profiles = Array.from(profileMap.values());

    if (cleanQ) {
        profiles = profiles.filter(p => {
            return (p.name || '').toLowerCase().includes(cleanQ) ||
                   (p.gradeLevel || '').toLowerCase().includes(cleanQ) ||
                   (p.schoolYear || '').toLowerCase().includes(cleanQ) ||
                   (p.room || '').toLowerCase().includes(cleanQ);
        });
    }

    if (profiles.length === 0) {
        listContainer.innerHTML = `
            <div class="col-span-2 py-8 px-3 text-center text-xs text-black-fade font-['Inter'] font-medium flex flex-col items-center justify-center gap-1.5">
                <i class="fa-solid fa-folder-open text-lg icon-black-fade block"></i>
                <span>${cleanQ ? 'No matching sections found' : 'No existing sections found yet'}</span>
            </div>
        `;
        return;
    }

    listContainer.innerHTML = profiles.map(p => {
        const studentCount = (p.students || []).length;
        const teacherCount = (p.teachers || []).length;
        const teacherLabel = teacherCount > 0 ? (p.teachers[0].name || 'Assigned') : 'No Teacher';
        const syLabel = p.schoolYear ? `S.Y. ${escapeHtml(p.schoolYear)}` : 'No SY';
        const roomLabel = p.room ? `Room ${escapeHtml(p.room)}` : 'No Room';

        return `
            <button type="button" onclick="window.pickExistingSectionProfile('${escapeHtml(String(p.id))}', '${escapeHtml(p.name)}', '${escapeHtml(p.gradeLevel)}', '${escapeHtml(p.schoolYear)}')"
                class="w-full text-left p-4 hover:bg-slate-50 hover:border-slate-300 bg-white border border-slate-200/90 rounded-2xl transition-all flex flex-col gap-2.5 cursor-pointer group shadow-none font-['Inter']">
                <div class="flex items-center justify-between gap-2">
                    <span class="text-sm font-bold text-black truncate font-['Inter']">${escapeHtml(p.name)}</span>
                    <span class="text-xs font-normal text-black shrink-0 font-['Inter'] flex items-center gap-1.5"><i class="fa-solid fa-graduation-cap text-xs text-[#15803d]"></i>${escapeHtml(p.gradeLevel)}</span>
                </div>
                <div class="flex items-center justify-between text-xs text-black font-normal gap-2 font-['Inter']">
                    <span class="truncate flex items-center gap-1.5"><i class="fa-regular fa-calendar text-[#15803d] text-xs"></i>${syLabel}</span>
                    <span class="shrink-0 flex items-center gap-1.5"><i class="fa-solid fa-door-closed text-[#15803d] text-xs"></i>${roomLabel}</span>
                </div>
                <div class="flex items-center justify-between text-xs text-black font-normal pt-2 border-t border-slate-100 gap-2 font-['Inter']">
                    <span class="truncate flex items-center gap-1.5"><i class="fa-solid fa-chalkboard-user text-[#15803d] text-xs"></i>${escapeHtml(teacherLabel)}</span>
                    <span class="shrink-0 flex items-center gap-1.5"><i class="fa-solid fa-user-group text-[#15803d] text-xs"></i>${studentCount} Students</span>
                </div>
            </button>
        `;
    }).join('');
};

window.pickExistingSectionProfile = function (sectionId, name, grade, schoolYear) {
    const sections = getStoredJson(SECTIONS_STORAGE_KEY, []);
    const cleanName = (name || '').trim().toLowerCase();
    const cleanGrade = (grade || '').trim().toLowerCase();
    const cleanSY = (schoolYear || '').trim().toLowerCase();

    const sec = sections.find(s => String(s.id) === String(sectionId)) ||
                sections.find(s => (s.name || '').trim().toLowerCase() === cleanName &&
                                   (s.gradeLevel || s.grade || '').trim().toLowerCase() === cleanGrade &&
                                   (s.schoolYear || '').trim().toLowerCase() === cleanSY);
    if (!sec) return;

    // Set Section Name
    const nameInput = document.getElementById('edit-section-name');
    if (nameInput) nameInput.value = sec.name || '';

    // Set Grade Level
    const gradeSelect = document.getElementById('edit-section-grade');
    if (gradeSelect) gradeSelect.value = sec.gradeLevel || sec.grade || '';

    // Set Room
    const roomInput = document.getElementById('edit-section-room');
    if (roomInput) roomInput.value = sec.room || '';

    // Set School Year
    const sySelect = document.getElementById('edit-section-school-year');
    if (sySelect) sySelect.value = sec.schoolYear || '';

    // Copy Teachers
    let copiedTeachers = [];
    if (Array.isArray(sec.teachers) && sec.teachers.length > 0) {
        copiedTeachers = JSON.parse(JSON.stringify(sec.teachers));
    } else if (sec.teacher) {
        copiedTeachers = [{ name: sec.teacher, uid: sec.teacherUid || '' }];
    }
    window.selectedSectionTeachers = copiedTeachers;

    // Copy Students
    window.selectedSectionStudents = Array.isArray(sec.students) ? JSON.parse(JSON.stringify(sec.students)) : [];

    // Keep Subject EMPTY for new subject class assignment
    const subjectInput = document.getElementById('edit-section-subject');
    if (subjectInput) subjectInput.value = '';
    window.stagedSectionSubject = '';

    // Keep Schedule EMPTY for new schedule assignment
    window.selectedSectionDailySchedule = [];
    window.stagedSectionDailySchedule = [];

    // Close menu
    const menu = document.getElementById('section-existing-menu');
    if (menu) menu.classList.add('hidden');
    window.setExistingSectionPickerSelected(false);

    // Run validation & update select appearance
    if (typeof window.updateSelectPlaceholderColors === 'function') {
        window.updateSelectPlaceholderColors();
    }
    window.validateSectionStep1();
    if (typeof window.renderAssignSectionOverview === 'function') {
        window.renderAssignSectionOverview();
    }

    if (typeof window.showToast === 'function') {
        window.showToast(`Loaded roster from ${sec.name} (${sec.gradeLevel || sec.grade || ''})`, 'success');
    }
};

window.populateSectionNameSuggestions = function () {
    const datalist = document.getElementById('section-name-suggestions');
    const sections = getStoredJson(SECTIONS_STORAGE_KEY, []);
    
    // Gather all unique section names
    const uniqueNames = [];
    sections.forEach(s => {
        const n = (s.name || '').trim();
        if (n && !uniqueNames.includes(n)) {
            uniqueNames.push(n);
        }
    });

    if (datalist) {
        datalist.innerHTML = uniqueNames.map(name => `<option value="${escapeHtml(name)}"></option>`).join('');
    }

    // Update existing section picker button visibility if editing vs creating
    const pickerWrapper = document.getElementById('section-existing-picker-wrapper');
    if (pickerWrapper) {
        if (window.isEditingSection) {
            pickerWrapper.classList.add('hidden');
        } else {
            pickerWrapper.classList.remove('hidden');
        }
    }
};

window.pickSectionNamePreset = function (name) {
    const input = document.getElementById('edit-section-name');
    if (input) {
        input.value = name;
        window.validateSectionStep1();
    }
};

window.validateSectionStep1 = function () {
    const nameInput = document.getElementById('edit-section-name');
    const name = nameInput?.value.trim();
    const grade = document.getElementById('edit-section-grade')?.value;
    const schoolYear = document.getElementById('edit-section-school-year')?.value;

    const dupWarningEl = document.getElementById('section-name-duplicate-warning');

    // Check duplicate with subject (only if subject is selected, otherwise Step 1 allows reuse)
    const duplicate = window.checkSectionNameDuplicate ? window.checkSectionNameDuplicate(true) : null;

    if (duplicate && name) {
        if (nameInput) {
            nameInput.classList.add('!border-rose-500', '!text-rose-700');
        }
        if (dupWarningEl) {
            dupWarningEl.innerHTML = `<i class="fa-solid fa-circle-exclamation text-rose-500"></i> A section named "<strong>${escapeHtml(duplicate.name)}</strong>" already exists for <strong>${escapeHtml(duplicate.subject || 'this subject')}</strong> (${escapeHtml(duplicate.gradeLevel || duplicate.grade)} in S.Y. ${escapeHtml(duplicate.schoolYear)}).`;
            dupWarningEl.classList.remove('hidden');
        }
    } else {
        if (nameInput) {
            nameInput.classList.remove('!border-rose-500', '!text-rose-700');
        }
        if (dupWarningEl) {
            dupWarningEl.classList.add('hidden');
            dupWarningEl.innerHTML = '';
        }
    }

    // Check for unfinished draft match (silent detection for Next Step popup dialog)
    const sections = getStoredJson(SECTIONS_STORAGE_KEY, []);
    let matchingDraft = null;
    if (name && grade && !window.isEditingSection) {
        matchingDraft = sections.find(s => {
            const isDraft = (s.status === 'Draft' || s.status === 'draft');
            if (!isDraft) return false;
            const sameName = (s.name || '').trim().toLowerCase() === name.toLowerCase();
            const sameGrade = (s.gradeLevel || s.grade || '').trim().toLowerCase() === grade.toLowerCase();
            const sameSY = !schoolYear || !s.schoolYear || (s.schoolYear || '').trim().toLowerCase() === schoolYear.toLowerCase();
            return sameName && sameGrade && sameSY;
        });
    }
    window.detectedMatchingDraft = matchingDraft;

    // Update Next Button state
    const nextBtn = document.getElementById('section-next-btn');
    if (nextBtn) {
        nextBtn.disabled = false;
        nextBtn.style.opacity = '1';
        nextBtn.style.cursor = 'pointer';
        nextBtn.style.pointerEvents = 'auto';
    }

    if (typeof window.validateSectionDeployment === 'function') {
        window.validateSectionDeployment();
    }
};

window.populateSectionSchoolYearDropdown = function (selectedValue = '') {
    const select = document.getElementById('edit-section-school-year');
    if (!select) return;

    // Rebuild options
    select.innerHTML = '<option value="" disabled hidden>Select School Year</option>';

    const records = [...schoolYearRecords].sort((a, b) => {
        const ya = Number(a.yearStart) || 0;
        const yb = Number(b.yearStart) || 0;
        return yb - ya; // most recent first
    });

    if (records.length === 0) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.disabled = true;
        opt.textContent = 'No school years configured';
        select.appendChild(opt);
    } else {
        records.forEach(record => {
            const label = `${record.yearStart}–${record.yearEnd}`;
            const opt = document.createElement('option');
            opt.value = label;
            opt.textContent = label + (record.status === 'Active' ? ' (Active)' : '');
            if (label === selectedValue) opt.selected = true;
            select.appendChild(opt);
        });
    }

    // If nothing matched, fall back to placeholder selected
    if (!selectedValue) {
        select.selectedIndex = 0;
    }

    if (typeof window.updateSelectPlaceholderColors === 'function') {
        window.updateSelectPlaceholderColors(select.closest('.relative') || select.parentElement || document);
    }
};

window.handleSectionNext = function () {
    if (window.currentSectionStep === 1) {
        const nameInput = document.getElementById('edit-section-name');
        const name = nameInput?.value.trim();
        const gradeSelect = document.getElementById('edit-section-grade');
        const grade = gradeSelect?.value;
        const roomInput = document.getElementById('edit-section-room');
        const room = roomInput?.value.trim();
        const sySelect = document.getElementById('edit-section-school-year');
        const schoolYear = sySelect?.value;

        if (!name) {
            nameInput?.focus();
            if (typeof window.showAlertDialog === 'function') {
                window.showAlertDialog('Missing Section Name', 'Please enter a name for this section (e.g. Einstein, Rizal).');
            } else {
                alert('Please enter a name for this section.');
            }
            return;
        }

        if (!grade) {
            gradeSelect?.focus();
            if (typeof window.showAlertDialog === 'function') {
                window.showAlertDialog('Missing Grade Level', 'Please select a Grade Level (Grade 11 or Grade 12).');
            } else {
                alert('Please select a Grade Level (Grade 11 or Grade 12).');
            }
            return;
        }

        if (!room) {
            roomInput?.focus();
            if (typeof window.showAlertDialog === 'function') {
                window.showAlertDialog('Missing Room Number', 'Please enter a Room number for this section (e.g. 401, 302).');
            } else {
                alert('Please enter a Room number for this section.');
            }
            return;
        }

        if (!schoolYear) {
            sySelect?.focus();
            if (typeof window.showAlertDialog === 'function') {
                window.showAlertDialog('Missing School Year', 'Please select a School Year.');
            } else {
                alert('Please select a School Year.');
            }
            return;
        }

        const duplicate = window.checkSectionNameDuplicate ? window.checkSectionNameDuplicate() : null;
        if (duplicate) {
            nameInput?.focus();
            if (typeof window.showAlertDialog === 'function') {
                window.showAlertDialog('Duplicate Section Name', `A section named "${duplicate.name}" already exists for ${duplicate.gradeLevel || duplicate.grade} in School Year ${duplicate.schoolYear}. Please use a unique section name.`);
            } else {
                alert(`A section named "${duplicate.name}" already exists for ${duplicate.gradeLevel || duplicate.grade} in School Year ${duplicate.schoolYear}.`);
            }
            return;
        }

        if (window.detectedMatchingDraft && !window.isEditingSection) {
            const draft = window.detectedMatchingDraft;
            const draftDetailsHtml = `
                <div class="text-left space-y-3 pt-1 font-['Inter']">
                    <p class="text-sm font-semibold text-black leading-snug">
                        An unfinished draft with the same information was found:
                    </p>
                    <div class="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5 text-xs">
                        <div class="flex items-center justify-between border-b border-slate-200/80 pb-1.5">
                            <span class="font-normal text-black-fade">Section Name</span>
                            <span class="font-bold text-black">${escapeHtml(draft.name)}</span>
                        </div>
                        <div class="flex items-center justify-between border-b border-slate-200/80 pb-1.5">
                            <span class="font-normal text-black-fade">Grade Level</span>
                            <span class="font-bold text-black">${escapeHtml(draft.gradeLevel || draft.grade || '—')}</span>
                        </div>
                        <div class="flex items-center justify-between ${draft.room ? 'border-b border-slate-200/80 pb-1.5' : ''}">
                            <span class="font-normal text-black-fade">School Year</span>
                            <span class="font-bold text-black">${escapeHtml(draft.schoolYear || '—')}</span>
                        </div>
                        ${draft.room ? `
                        <div class="flex items-center justify-between">
                            <span class="font-normal text-black-fade">Room</span>
                            <span class="font-bold text-black">Room ${escapeHtml(draft.room)}</span>
                        </div>` : ''}
                    </div>
                    <p class="text-xs text-black-fade font-normal">
                        Would you like to resume editing this saved draft, or delete it and create a new section?
                    </p>
                </div>
            `;

            if (typeof window.showSigmaDialog === 'function') {
                window.showSigmaDialog({
                    title: 'Unfinished Draft Found',
                    desc: draftDetailsHtml,
                    confirmText: 'Resume Draft',
                    cancelText: 'Delete and Create New',
                    onConfirm: () => {
                        window.toggleSectionOverlay(true, draft.id || draft.name);
                    },
                    onCancel: () => {
                        let sections = getStoredJson(SECTIONS_STORAGE_KEY, []);
                        sections = sections.filter(s => String(s.id || s.name) !== String(draft.id || draft.name));
                        saveStoredJson(SECTIONS_STORAGE_KEY, sections);
                        window.detectedMatchingDraft = null;
                        if (typeof window.renderSectionsTable === 'function') {
                            window.renderSectionsTable();
                        }
                        window.handleSectionStep(2);
                    },
                    onClose: () => {
                        // User cancelled via exit button / Esc - stay on Step 1 with no changes applied
                    }
                });
            } else {
                window.toggleSectionOverlay(true, draft.id || draft.name);
            }
            return;
        }

        window.handleSectionStep(2);
    }
};

window.handleSectionBack = function () {
    const isScheduleSubpageOpen = !document.getElementById('section-subpage-schedule')?.classList.contains('hidden');
    const isTeacherSubpageOpen = !document.getElementById('section-subpage-teacher')?.classList.contains('hidden');
    const isSubjectSubpageOpen = !document.getElementById('section-subpage-subject')?.classList.contains('hidden');
    const isStudentsSubpageOpen = !document.getElementById('section-subpage-students')?.classList.contains('hidden');

    if (isScheduleSubpageOpen) {
        const isScheduleChanged = window.subpageScheduleInitialSnapshot && JSON.stringify(window.stagedSectionDailySchedule || []) !== window.subpageScheduleInitialSnapshot;
        if (isScheduleChanged) {
            const promptOptions = {
                title: 'Do you want to discard?',
                message: 'Unsaved schedule changes will be lost.',
                discardText: 'Discard',
                cancelText: 'Keep Editing',
                onDiscard: () => {
                    window.stagedSectionDailySchedule = JSON.parse(JSON.stringify(window.selectedSectionDailySchedule || []));
                    window.closeSectionSubpage();
                }
            };
            if (typeof window.showDiscardConfirm === 'function') {
                window.showDiscardConfirm(promptOptions);
            } else if (typeof window.showSigmaDialog === 'function') {
                window.showSigmaDialog({
                    title: promptOptions.title,
                    desc: promptOptions.message,
                    confirmText: promptOptions.discardText,
                    cancelText: promptOptions.cancelText,
                    isDestructive: true,
                    onConfirm: promptOptions.onDiscard
                });
            } else if (confirm('Discard unsaved schedule changes?')) {
                promptOptions.onDiscard();
            }
            return;
        }
        window.closeSectionSubpage();
        return;
    }

    if (isTeacherSubpageOpen) {
        const isTeacherChanged = window.subpageTeacherInitialSnapshot && JSON.stringify(window.stagedSectionTeachers || []) !== window.subpageTeacherInitialSnapshot;
        if (isTeacherChanged) {
            const promptOptions = {
                title: 'Do you want to discard?',
                message: 'Unsaved teacher selections will be lost.',
                discardText: 'Discard',
                cancelText: 'Keep Editing',
                onDiscard: () => {
                    window.stagedSectionTeachers = JSON.parse(JSON.stringify(window.selectedSectionTeachers || []));
                    window.closeSectionSubpage();
                }
            };
            if (typeof window.showDiscardConfirm === 'function') {
                window.showDiscardConfirm(promptOptions);
            } else if (typeof window.showSigmaDialog === 'function') {
                window.showSigmaDialog({
                    title: promptOptions.title,
                    desc: promptOptions.message,
                    confirmText: promptOptions.discardText,
                    cancelText: promptOptions.cancelText,
                    isDestructive: true,
                    onConfirm: promptOptions.onDiscard
                });
            } else if (confirm('Discard unsaved teacher selections?')) {
                promptOptions.onDiscard();
            }
            return;
        }
        window.closeSectionSubpage();
        return;
    }

    if (isSubjectSubpageOpen) {
        const isSubjectChanged = window.subpageSubjectInitialSnapshot !== undefined && (window.stagedSectionSubject || '') !== window.subpageSubjectInitialSnapshot;
        if (isSubjectChanged) {
            const promptOptions = {
                title: 'Do you want to discard?',
                message: 'Unsaved subject selection will be lost.',
                discardText: 'Discard',
                cancelText: 'Keep Editing',
                onDiscard: () => {
                    window.stagedSectionSubject = document.getElementById('edit-section-subject')?.value || '';
                    window.closeSectionSubpage();
                }
            };
            if (typeof window.showDiscardConfirm === 'function') {
                window.showDiscardConfirm(promptOptions);
            } else if (typeof window.showSigmaDialog === 'function') {
                window.showSigmaDialog({
                    title: promptOptions.title,
                    desc: promptOptions.message,
                    confirmText: promptOptions.discardText,
                    cancelText: promptOptions.cancelText,
                    isDestructive: true,
                    onConfirm: promptOptions.onDiscard
                });
            } else if (confirm('Discard unsaved subject selection?')) {
                promptOptions.onDiscard();
            }
            return;
        }
        window.closeSectionSubpage();
        return;
    }

    if (isStudentsSubpageOpen) {
        const isStudentsChanged = window.subpageStudentsInitialSnapshot && JSON.stringify(window.stagedSectionStudents || []) !== window.subpageStudentsInitialSnapshot;
        if (isStudentsChanged) {
            const promptOptions = {
                title: 'Do you want to discard?',
                message: 'Unsaved student roster changes will be lost.',
                discardText: 'Discard',
                cancelText: 'Keep Editing',
                onDiscard: () => {
                    window.stagedSectionStudents = JSON.parse(JSON.stringify(window.selectedSectionStudents || []));
                    window.closeSectionSubpage();
                }
            };
            if (typeof window.showDiscardConfirm === 'function') {
                window.showDiscardConfirm(promptOptions);
            } else if (typeof window.showSigmaDialog === 'function') {
                window.showSigmaDialog({
                    title: promptOptions.title,
                    desc: promptOptions.message,
                    confirmText: promptOptions.discardText,
                    cancelText: promptOptions.cancelText,
                    isDestructive: true,
                    onConfirm: promptOptions.onDiscard
                });
            } else if (confirm('Discard unsaved student roster changes?')) {
                promptOptions.onDiscard();
            }
            return;
        }
        window.closeSectionSubpage();
        return;
    }

    if (window.currentSectionStep === 2) {
        window.handleSectionStep(1);
    }
};

window.getSelectedSectionDays = function () {
    const activeBtns = Array.from(document.querySelectorAll('#section-days-container .section-day-btn'))
        .filter(btn => btn.dataset.active === 'true');
    return activeBtns.map(btn => btn.dataset.day);
};

window.setSelectedSectionDays = function (days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']) {
    let daysArray = [];
    if (Array.isArray(days)) {
        daysArray = days;
    } else if (typeof days === 'string') {
        const dStr = days.trim();
        if (dStr === 'Mon-Fri' || dStr === 'Mon–Fri') {
            daysArray = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
        } else if (dStr === 'Mon-Sat' || dStr === 'Mon–Sat') {
            daysArray = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        } else if (dStr === 'MWF') {
            daysArray = ['Mon', 'Wed', 'Fri'];
        } else if (dStr === 'TTh') {
            daysArray = ['Tue', 'Thu'];
        } else {
            daysArray = dStr.split(/[\s,\/]+/).filter(Boolean);
        }
    }
    const daysSet = new Set(daysArray);

    document.querySelectorAll('#section-days-container .section-day-btn').forEach(btn => {
        const isSelected = daysSet.has(btn.dataset.day);
        btn.dataset.active = isSelected ? 'true' : 'false';
        if (isSelected) {
            btn.className = 'section-day-btn flex-1 py-3 rounded-xl border text-xs font-bold transition-all cursor-pointer bg-[#15803d] text-white border-[#15803d] shadow-sm text-center';
        } else {
            btn.className = 'section-day-btn flex-1 py-3 rounded-xl border text-xs font-bold transition-all cursor-pointer bg-white text-slate-700 border-slate-200 hover:bg-slate-100 text-center';
        }
    });
};

window.toggleSectionDay = function (btn) {
    const isCurrentlyActive = btn.dataset.active === 'true';
    btn.dataset.active = isCurrentlyActive ? 'false' : 'true';
    if (!isCurrentlyActive) {
        btn.className = 'section-day-btn flex-1 py-3 rounded-xl border text-xs font-bold transition-all cursor-pointer bg-[#15803d] text-white border-[#15803d] shadow-sm text-center';
    } else {
        btn.className = 'section-day-btn flex-1 py-3 rounded-xl border text-xs font-bold transition-all cursor-pointer bg-white text-slate-700 border-slate-200 hover:bg-slate-100 text-center';
    }
    window.validateSectionStep1();
};

window.setSectionDaysPreset = function (preset) {
    if (preset === 'mon-fri') {
        window.setSelectedSectionDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
    } else if (preset === 'mon-sat') {
        window.setSelectedSectionDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
    } else if (preset === 'mwf') {
        window.setSelectedSectionDays(['Mon', 'Wed', 'Fri']);
    } else if (preset === 'tth') {
        window.setSelectedSectionDays(['Tue', 'Thu']);
    }
    window.validateSectionStep1();
};

function formatSectionDaysString(daysArray) {
    if (!daysArray || daysArray.length === 0) return '';
    const allDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const selected = allDays.filter(d => daysArray.includes(d));
    if (selected.length === 5 && selected.join(',') === 'Mon,Tue,Wed,Thu,Fri') return 'Mon–Fri';
    if (selected.length === 6 && selected.join(',') === 'Mon,Tue,Wed,Thu,Fri,Sat') return 'Mon–Sat';
    if (selected.length === 3 && selected.join(',') === 'Mon,Wed,Fri') return 'MWF';
    if (selected.length === 2 && selected.join(',') === 'Tue,Thu') return 'TTh';
    return selected.join(', ');
}

window.deleteSection = function (sectionNameToDelete = null) {
    const user = typeof window.getLoggedInAdminUser === 'function' ? window.getLoggedInAdminUser() : null;
    const isMaster = user && (normalizeUserRole(user.role || user.type) === 'Master Admin' || String(user.uid || user.id) === '0000000' || user.isMaster);
    const perms = (user && user.permissions) || {};
    const canDelete = isMaster || perms.schoolSectionsDelete === true || perms.sectionDelete === true;

    if (!canDelete) {
        if (typeof window.showAlertDialog === 'function') {
            window.showAlertDialog({
                title: 'Permission Denied',
                message: 'Section deletion requires Master Admin authorization or explicit delete permissions.',
                buttonText: 'OK'
            });
        } else {
            alert('Section deletion requires Master Admin authorization or explicit delete permissions.');
        }
        return;
    }

    let targetId = window.currentEditingSectionId;
    let targetName = document.getElementById('edit-section-name')?.value || '';

    if (sectionNameToDelete) {
        const sections = getStoredJson(SECTIONS_STORAGE_KEY, []);
        const found = sections.find(s => String(s.name) === String(sectionNameToDelete) || String(s.id) === String(sectionNameToDelete));
        if (found) {
            targetId = found.id;
            targetName = found.name;
        } else {
            targetName = sectionNameToDelete;
        }
    }

    if (!targetId && !targetName) return;

    window.showSectionConfirm(
        'Delete Section?',
        `This action cannot be undone. All class records for "${targetName || 'this section'}" will be removed permanently.`,
        () => {
            const sections = getStoredJson(SECTIONS_STORAGE_KEY, []);
            const newSections = sections.filter(s => String(s.id) !== String(targetId) && String(s.name) !== String(targetName));
            saveStoredJson(SECTIONS_STORAGE_KEY, newSections);

            window.toggleSectionOverlay(false);
            if (typeof renderSectionsTable === 'function') {
                renderSectionsTable();
            } else {
                window.location.reload();
            }
        }
    );
};

window.showSectionConfirm = function (title, desc, onProceed, confirmText = 'Proceed') {
    if (typeof window.showSigmaDialog === 'function') {
        window.showSigmaDialog({
            title: title,
            desc: desc,
            confirmText: confirmText || 'Proceed',
            cancelText: 'Cancel',
            onConfirm: onProceed
        });
        return;
    }

    const overlay = document.getElementById('section-confirm-overlay');
    const titleEl = document.getElementById('section-confirm-title');
    const descEl = document.getElementById('section-confirm-desc');
    const cancelBtn = document.getElementById('section-confirm-cancel');
    const proceedBtn = document.getElementById('section-confirm-proceed');

    if (!overlay || !titleEl || !descEl || !cancelBtn || !proceedBtn) return;

    titleEl.textContent = title;
    descEl.textContent = desc;
    proceedBtn.textContent = confirmText || 'Proceed';
    overlay.classList.remove('hidden');

    const close = () => overlay.classList.add('hidden');
    cancelBtn.onclick = close;
    proceedBtn.onclick = () => {
        onProceed();
        close();
    };
};

window.openCreateSectionModal = function () {
    window.toggleSectionOverlay(true);
};

window.hasSectionFormChanges = function () {
    if (!initialSectionValues) return false;
    const currentValues = {
        name: document.getElementById('edit-section-name')?.value.trim() || '',
        grade: document.getElementById('edit-section-grade')?.value || '',
        room: document.getElementById('edit-section-room')?.value.trim() || '',
        schoolYear: document.getElementById('edit-section-school-year')?.value || '',
        startTime: document.getElementById('edit-section-start-time')?.value || '',
        endTime: document.getElementById('edit-section-end-time')?.value || '',
        days: window.getSelectedSectionDays ? window.getSelectedSectionDays() : [],
        teacher: document.getElementById('edit-section-teacher')?.value.trim() || '',
        role: document.getElementById('edit-section-role')?.value || '',
        subject: document.getElementById('edit-section-subject')?.value.trim() || '',
        dailySchedules: JSON.stringify(window.selectedSectionDailySchedule || []),
        teachers: JSON.stringify(window.selectedSectionTeachers || []),
        students: JSON.stringify(window.selectedSectionStudents || [])
    };
    if (window.isEditingSection) {
        return JSON.stringify(initialSectionValues) !== JSON.stringify(currentValues);
    }
    return Boolean(
        currentValues.name || currentValues.grade || currentValues.room ||
        (window.selectedSectionTeachers && window.selectedSectionTeachers.length > 0) ||
        (window.selectedSectionStudents && window.selectedSectionStudents.length > 0) ||
        (window.selectedSectionDailySchedule && window.selectedSectionDailySchedule.length > 0)
    );
};

window.handleSectionExit = function () {
    const doExit = () => {
        window.toggleSectionOverlay(false);
    };

    if (typeof window.hasSectionFormChanges === 'function' && window.hasSectionFormChanges()) {
        if (typeof window.openAskingPanel === 'function') {
            window.openAskingPanel({
                title: 'Discard Changes?',
                desc: 'You have unsaved changes in this section. Are you sure you want to discard them and leave?',
                type: 'warning',
                confirmText: 'Discard',
                cancelText: 'Stay',
                showCancel: true,
                onConfirm: doExit
            });
            return;
        } else if (confirm('You have unsaved changes in this section. Are you sure you want to discard them and leave?')) {
            doExit();
            return;
        }
        return;
    }

    doExit();
};

window.closeSectionModal = function () {
    window.toggleSectionOverlay(false);
};

window.editSection = function (id) {
    window.toggleSectionOverlay(true, id);
};

// =============================================================
// SECTION CLASSROOM ROOM VIEW (ADMIN ACCOUNT)
// =============================================================

window.currentAdminClassroomSection = null;
window.currentAdminClassroomTab = 'topics';

window.viewSection = function (sectionIdOrName, passedSubject, initialTab) {
    if (!sectionIdOrName) return;
    const sections = (typeof getStoredJson === 'function') ? getStoredJson(SECTIONS_STORAGE_KEY, []) : [];
    let sec = null;
    if (passedSubject) {
        const normSubj = String(passedSubject).toLowerCase().trim();
        sec = sections.find(s => (String(s.id) === String(sectionIdOrName) || String(s.name || '').toLowerCase().trim() === String(sectionIdOrName).toLowerCase().trim()) && String(s.subject || s.assignedSubject || (Array.isArray(s.assignedSubjects) && s.assignedSubjects[0]) || '').toLowerCase().trim() === normSubj);
    }
    if (!sec) {
        sec = sections.find(s => String(s.id) === String(sectionIdOrName));
    }
    if (!sec) {
        sec = sections.find(s => String(s.name || '').toLowerCase().trim() === String(sectionIdOrName).toLowerCase().trim());
    }

    const sectionName = sec ? (sec.name || sec.sectionName || sec.id) : sectionIdOrName;
    const subjectName = passedSubject || (sec ? (sec.subject || sec.assignedSubject || (Array.isArray(sec.assignedSubjects) && sec.assignedSubjects[0]) || '') : '');

    window.showAdminClassroom(sectionName, subjectName, initialTab || 'room', sec);
};

window.showAdminClassroom = function (sectionName, subjectName, initialTab = 'room', preResolvedSec = null) {
    if (!sectionName) return;
    const sections = (typeof getStoredJson === 'function') ? getStoredJson(SECTIONS_STORAGE_KEY, []) : [];
    let sec = preResolvedSec || null;
    if (!sec && subjectName) {
        const normSubj = String(subjectName).toLowerCase().trim();
        const normSec = String(sectionName).toLowerCase().trim();
        sec = sections.find(s => (String(s.name || '').toLowerCase().trim() === normSec || String(s.id) === String(sectionName)) && String(s.subject || s.assignedSubject || (Array.isArray(s.assignedSubjects) && s.assignedSubjects[0]) || '').toLowerCase().trim() === normSubj);
    }
    if (!sec) {
        sec = sections.find(s => String(s.id) === String(sectionName));
    }
    if (!sec) {
        sec = sections.find(s => String(s.name || '').toLowerCase().trim() === String(sectionName).toLowerCase().trim());
    }

    const effectiveSection = sec ? (sec.name || sec.sectionName || sec.id) : sectionName;
    const effectiveSubject = subjectName || (sec ? (sec.subject || sec.assignedSubject || (Array.isArray(sec.assignedSubjects) && sec.assignedSubjects[0]) || '') : '') || 'Computer Programming 1';

    window.currentAdminClassroomSection = {
        id: sec?.id || '',
        name: effectiveSection,
        subject: effectiveSubject,
        room: sec?.room || 'Room 302',
        schedule: sec?.schedule || 'Mon–Fri • 09:00 AM – 10:30 AM',
        teacher: sec?.teacher || (sec?.teachers && sec?.teachers[0] ? sec?.teachers[0].name : 'Maria Santos Ramos'),
        teachers: sec?.teachers || (sec?.teacher ? [{ name: sec.teacher, role: sec.role || 'Teacher', isPrimary: true }] : []),
        students: sec?.students || [],
        gradeLevel: sec?.gradeLevel || sec?.grade || 'Grade 11',
        strand: sec?.strand || 'ICT'
    };

    window.currentClassroomSectionName = effectiveSection;
    window.currentClassroomSubject = effectiveSubject;
    window.currentClassroomKey = `${effectiveSection}::${effectiveSubject}`;

    // 1. Render Hero Banner using shared ClassroomRoom module
    const bannerWrapper = document.getElementById('admin-classroom-banner-wrapper');
    if (bannerWrapper && window.ClassroomRoom && typeof window.ClassroomRoom.renderBanner === 'function') {
        bannerWrapper.innerHTML = window.ClassroomRoom.renderBanner({
            id: sec?.id || '',
            subject: effectiveSubject,
            section: effectiveSection,
            room: window.currentAdminClassroomSection.room,
            schedule: window.currentAdminClassroomSection.schedule,
            teacher: window.currentAdminClassroomSection.teacher,
            teachers: window.currentAdminClassroomSection.teachers,
            role: 'admin'
        });
    }

    // 2. Render Announcements feed
    const feed = document.getElementById('admin-room-announcements-feed');
    if (feed && window.SigmaAnnouncements && typeof window.SigmaAnnouncements.renderFeed === 'function') {
        window.SigmaAnnouncements.renderFeed('admin-room-announcements-feed', 'all', effectiveSection, effectiveSubject);
    }

    // 3. Render Members tab
    const membersContainer = document.getElementById('detail-section-members');
    if (membersContainer && typeof window.renderRoomMembersTabContent === 'function') {
        membersContainer.innerHTML = window.renderRoomMembersTabContent({
            teacherName: window.currentAdminClassroomSection.teacher,
            teachers: window.currentAdminClassroomSection.teachers,
            students: window.currentAdminClassroomSection.students,
            section: effectiveSection,
            subject: effectiveSubject,
            role: 'admin'
        });
    }

    // 4. Show section
    window.showSection('classroom-detail-view', 'nav-school-sections');
    const headerTitle = document.getElementById('nav-context-text') || document.getElementById('header-brand-title');
    if (headerTitle) {
        headerTitle.textContent = 'School Management';
    }

    // 5. Switch to active tab and update URL hash
    const roomTabs = ['topics', 'room', 'members'];
    const safeTab = roomTabs.includes(initialTab) ? initialTab : 'room';
    window.switchAdminClassDetailTab(safeTab, true);
    const hash = `#classroom:${encodeURIComponent(effectiveSection)}:${encodeURIComponent(effectiveSubject)}:${safeTab}`;
    if (window.location.hash !== hash) {
        history.pushState({ type: 'classroom', section: effectiveSection, subject: effectiveSubject, tab: safeTab }, '', hash);
    }
};

window.switchAdminClassDetailTab = function (tabName, skipHash = false) {
    const roomTabs = ['topics', 'room', 'members'];
    if (!roomTabs.includes(tabName)) tabName = 'room';
    window.currentAdminClassroomTab = tabName;
    roomTabs.forEach(t => {
        const btn = document.getElementById(`tab-btn-${t}`);
        const sec = document.getElementById(`detail-section-${t}`);
        if (btn) btn.classList.toggle('active', t === tabName);
        if (sec) sec.classList.toggle('hidden', t !== tabName);
    });
    if (tabName === 'topics') window.renderAdminRoomTopicsPanel?.();
    window.syncRoomQuarterSwitch?.();

    if (!skipHash && window.currentAdminClassroomSection) {
        const hash = `#classroom:${encodeURIComponent(window.currentAdminClassroomSection.name)}:${encodeURIComponent(window.currentAdminClassroomSection.subject)}:${tabName}`;
        history.replaceState({ type: 'classroom', section: window.currentAdminClassroomSection.name, subject: window.currentAdminClassroomSection.subject, tab: tabName }, '', hash);
    }
};

window.renderAdminRoomTopicsPanel = function () {
    const mount = document.getElementById('room-topics-mount');
    if (!mount || typeof window.buildSharedTopicPage !== 'function') return;
    const current = window.currentAdminClassroomSection || {};
    const subjectName = current.subject || window.currentClassroomSubject || '';
    const sectionName = current.name || window.currentClassroomSectionName || '';
    let subjectId = (typeof window.resolveSubjectTopicId === 'function')
        ? window.resolveSubjectTopicId(subjectName, subjectName)
        : '';
    if (!subjectId) subjectId = subjectName || 'card-prog1';
    const packed = (typeof getAdminTopicSubjectAndData === 'function')
        ? getAdminTopicSubjectAndData(subjectId, subjectName, sectionName)
        : { subject: { id: subjectId, name: subjectName || 'Subject' }, data: { q1Topics: [] } };
    window.currentTopicState = Object.assign({}, window.currentTopicState || {}, {
        subjectId: subjectId,
        selectedSection: sectionName,
        activeTab: (window.currentTopicState && window.currentTopicState.activeTab) || 'videos',
        topicIdx: (window.currentTopicState && window.currentTopicState.topicIdx) || 0,
        selectedStudent: (window.currentTopicState && window.currentTopicState.selectedStudent) || 'All'
    });
    window.buildSharedTopicPage(
        mount,
        subjectId,
        packed.subject || { id: subjectId, name: subjectName || 'Subject' },
        packed.data || { q1Topics: [], text: subjectName },
        {
            completed: 'fa-check-circle text-green-500',
            'in-progress': 'fa-circle-half-stroke text-yellow-500',
            'not-started': 'fa-circle text-gray-300'
        },
        true,
        { embedded: true }
    );
};
window.renderRoomTopicsPanel = window.renderAdminRoomTopicsPanel;

window.openAdminClassroomGradebook = function () {
    if (typeof window.switchTab === 'function') window.switchTab('nav-school-grades');
};

function getAdminTopicSubjectAndData(subjectId, subjectName, sectionName) {
    const subjects = (typeof getStoredJson === 'function') ? getStoredJson(SUBJECTS_STORAGE_KEY, []) : [];
    const effName = String(subjectName || '').trim();
    const effId = String(subjectId || '').trim();

    let adminSubj = null;
    if (typeof window.findMatchingSubject === 'function') {
        adminSubj = window.findMatchingSubject(subjects, effId) || window.findMatchingSubject(subjects, effName);
    }
    if (!adminSubj) {
        const targetClean = effName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const idClean = effId.toLowerCase().replace(/[^a-z0-9]/g, '');
        adminSubj = subjects.find(s => {
            const sName = String(s.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const sCode = String(s.code || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const sId = String(s.id || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            return (sId && idClean && (sId === idClean || idClean.includes(sId))) ||
                   (sCode && idClean && (sCode === idClean || idClean.includes(sCode))) ||
                   (sName && targetClean && (sName === targetClean || targetClean.includes(sName) || sName.includes(targetClean)));
        });
    }

    const getHumanReadableSubjectName = (rawName, rawId) => {
        const idStr = String(rawId || '').toLowerCase().trim();
        const nameStr = String(rawName || '').trim();
        const idMap = {
            'card-prog1': 'Computer Programming 1',
            'prog1': 'Computer Programming 1',
            'card prog1': 'Computer Programming 1',
            'prog-1': 'Computer Programming 1',
            'prog 1': 'Computer Programming 1',
            'programming 1': 'Computer Programming 1',
            'card-webdev': 'Web Development',
            'webdev': 'Web Development',
            'card webdev': 'Web Development',
            'card-database': 'Database Management',
            'database': 'Database Management',
            'card database': 'Database Management',
            'card-stats': 'Statistics and Probability',
            'stats': 'Statistics and Probability',
            'card stats': 'Statistics and Probability',
            'card-empowerment': 'Empowerment Technologies',
            'empowerment': 'Empowerment Technologies',
            'card empowerment': 'Empowerment Technologies',
            'card-genmath': 'General Mathematics',
            'genmath': 'General Mathematics',
            'card genmath': 'General Mathematics',
            'card-oralcomm': 'Oral Communication',
            'oralcomm': 'Oral Communication',
            'card oralcomm': 'Oral Communication',
            'card-earthsci': 'Earth and Life Science',
            'earthsci': 'Earth and Life Science',
            'card earthsci': 'Earth and Life Science'
        };
        if (idMap[idStr]) return idMap[idStr];
        if (idMap[nameStr.toLowerCase()]) return idMap[nameStr.toLowerCase()];
        if (nameStr && nameStr !== 'Subject' && !nameStr.startsWith('card-')) return nameStr;
        return idMap[idStr] || (nameStr && nameStr !== 'Subject' ? nameStr : 'Computer Programming 1');
    };

    const title = (adminSubj && adminSubj.name && !adminSubj.name.startsWith('card-'))
        ? adminSubj.name
        : getHumanReadableSubjectName(effName, effId);
    const code = adminSubj?.code || effId || 'SUBJ';
    const type = adminSubj?.type || 'Core Subject';
    const strand = adminSubj?.strand || 'Grade 11';
    const icon = adminSubj?.icon || 'fa-solid fa-book-open';
    const bg = adminSubj?.bg || 'image/book1.jpg';

    const subject = {
        id: effId,
        code: code,
        name: title,
        title: title,
        type: type,
        strand: strand,
        icon: icon,
        bg: bg,
        activeQuarters: (adminSubj && Array.isArray(adminSubj.activeQuarters) && adminSubj.activeQuarters.length > 0) ? adminSubj.activeQuarters : ['q1', 'q2']
    };

    const makeTopicVideos = (topicTitle, tIdx) => [
        {
            id: `v-${tIdx}-1`,
            title: `${topicTitle}: Interactive Video Lecture`,
            duration: '18:45',
            teacher: 'Faculty Instructor',
            thumb: 'image/Topic.jpg',
            url: 'image/campus-clip.mp4',
            sourceType: 'mp4',
            fileType: 'mp4',
            fileName: 'campus-clip.mp4',
            description: `Comprehensive video lecture and tutorial walkthrough on ${topicTitle}.`
        },
        {
            id: `v-${tIdx}-2`,
            title: `${topicTitle}: Practical Applications & Case Analysis`,
            duration: '14:20',
            teacher: 'Faculty Instructor',
            thumb: 'image/ICC logo.jpg',
            url: 'image/campus-clip.mp4',
            sourceType: 'mp4',
            fileType: 'mp4',
            fileName: 'campus-clip.mp4',
            description: `Guided demonstration and practical problem-solving breakdown.`
        }
    ];

    const makeTopicHandouts = (topicTitle, tIdx) => [
        {
            id: `h-${tIdx}-1`,
            title: `${topicTitle} - Complete Study Module & Notes`,
            type: 'PDF',
            fileType: 'pdf',
            fileName: `${topicTitle.replace(/[^a-zA-Z0-9]/g, '_')}_Module.pdf`,
            url: 'image/PDF.svg',
            size: '2.4 MB',
            date: 'Sep 12, 2026',
            description: `Structured syllabus, key definitions, formulas, and lecture handouts.`
        },
        {
            id: `h-${tIdx}-2`,
            title: `${topicTitle} - Guided Exercises & Worksheets`,
            type: 'DOCX',
            fileType: 'docx',
            fileName: `${topicTitle.replace(/[^a-zA-Z0-9]/g, '_')}_Exercises.docx`,
            url: 'image/Doc.svg',
            size: '1.1 MB',
            date: 'Sep 15, 2026',
            description: `Practice problems, worksheets, and supplementary domain references.`
        }
    ];

    const makeTopicAssessments = (topicTitle, tIdx) => [
        {
            id: `ass-${tIdx}-1`,
            title: `${topicTitle}: Written Task & Practice Exercise`,
            category: 'Assignment',
            type: 'DOCX',
            fileType: 'docx',
            fileName: `Written_Task_${tIdx + 1}.docx`,
            size: '1.2 MB',
            max: 50,
            points: 50,
            date: 'Sep 25, 2026',
            attempts: 1,
            description: `Answer analytical questions, scenario evaluations, and practical problems covering ${topicTitle}.`,
            rubric: {
                fileName: 'Task_Grading_Rubric.pdf',
                type: 'pdf',
                url: ''
            },
            hasRubric: true
        },
        {
            id: `ass-${tIdx}-2`,
            title: `Quiz ${tIdx + 1}: ${topicTitle} Mastery Test`,
            category: 'Quiz',
            type: 'quiz',
            fileType: 'quiz',
            size: '10 Questions',
            max: 20,
            points: 20,
            date: 'Sep 28, 2026',
            attempts: 1,
            timeLimit: '15 Minutes',
            hasTimer: true,
            selectedQuizQuestions: 10,
            description: `Standardized mastery test assessing conceptual knowledge and application proficiency.`
        },
        {
            id: `ass-${tIdx}-3`,
            title: `Activity: ${topicTitle} Collaborative Workshop`,
            category: 'Activity',
            type: 'DOCX',
            fileType: 'docx',
            fileName: `Activity_Worksheet_${tIdx + 1}.docx`,
            size: '1.5 MB',
            max: 30,
            points: 30,
            date: 'Oct 02, 2026',
            attempts: 1,
            description: `Hands-on exploratory activity and collaborative domain problem solving.`
        },
        {
            id: `ass-${tIdx}-4`,
            title: `Performance Task: ${topicTitle} Practical Project`,
            category: 'Performance Task',
            type: 'DOCX',
            fileType: 'docx',
            fileName: `Performance_Task_Brief_${tIdx + 1}.docx`,
            size: '2.8 MB',
            max: 100,
            points: 100,
            date: 'Oct 10, 2026',
            attempts: 1,
            description: `Culminating performance task demonstrating practical proficiency and mastery of ${topicTitle}.`,
            rubric: {
                fileName: 'Performance_Task_Standard_Rubric.pdf',
                type: 'pdf',
                url: ''
            },
            hasRubric: true
        }
    ];

    let q1Topics = [];
    if (adminSubj && Array.isArray(adminSubj.topics) && adminSubj.topics.length > 0) {
        const isFakeTopic = (t) => {
            if (!t) return true;
            if (typeof window.isFakeSampleTopic === 'function') return window.isFakeSampleTopic(t);
            return false;
        };
        const isFakeMat = (m) => {
            if (!m) return true;
            if (typeof window.isFakeSampleMaterial === 'function') return window.isFakeSampleMaterial(m);
            return false;
        };
        q1Topics = adminSubj.topics.filter(t => !isFakeTopic(t)).map((t, idx) => {
            const topicTitle = t.title || t.name || `Topic ${idx + 1}`;
            const ass = (Array.isArray(t.assessments) ? t.assessments : []).filter(item => !isFakeMat(item));
            const vids = (Array.isArray(t.videos) ? t.videos : []).filter(item => !isFakeMat(item));
            const hands = (Array.isArray(t.handouts) ? t.handouts : (Array.isArray(t.materials) ? t.materials : [])).filter(item => !isFakeMat(item));
            return {
                ...t,
                id: (t.id !== undefined && t.id !== '') ? String(t.id) : `topic-${idx}`,
                title: topicTitle,
                overview: t.overview || t.description || t.summary || '',
                quarter: String(t.quarter || 'q1').toLowerCase(),
                status: t.status || (idx === 0 ? 'completed' : 'in-progress'),
                image: t.image || 'image/Topic.jpg',
                videos: vids,
                handouts: hands,
                materials: hands,
                assignments: (Array.isArray(t.assignments) ? t.assignments : []).filter(item => !isFakeMat(item)),
                quiz: (Array.isArray(t.quiz) ? t.quiz : []).filter(item => !isFakeMat(item)),
                activity: (Array.isArray(t.activity) ? t.activity : []).filter(item => !isFakeMat(item)),
                performance: (Array.isArray(t.performance) ? t.performance : []).filter(item => !isFakeMat(item)),
                assessments: ass
            };
        });
    } else {
        q1Topics = [];
    }

    const materials = (adminSubj && Array.isArray(adminSubj.materials))
        ? adminSubj.materials.filter(m => (typeof window.isFakeSampleMaterial === 'function' ? !window.isFakeSampleMaterial(m) : true))
        : [];

    const data = {
        subjectId: effId,
        text: title,
        title: title,
        subtitle: `${strand} • ${type}`,
        instructor: 'Administrator View',
        icon: icon,
        bg: bg,
        section: sectionName,
        q1Topics: q1Topics,
        materials: materials
    };

    return { subject, data };
}

window.getAdminTopicSubjectAndData = getAdminTopicSubjectAndData;
window.getTopicSubject = function (id) {
    const res = getAdminTopicSubjectAndData(id);
    return res?.subject || null;
};
window.getTopicData = function (id) {
    const res = getAdminTopicSubjectAndData(id);
    return res?.data || null;
};

window.refreshAdminTopicUIIfVisible = function () {
    const classroom = document.getElementById('classroom-detail-view');
    const topics = document.getElementById('detail-section-topics');
    if (classroom && topics && !classroom.classList.contains('hidden') && !topics.classList.contains('hidden')) {
        window.renderAdminRoomTopicsPanel?.();
    }
};

window.switchToAdminTopicPage = function (subjectId, sectionName, subjectName, pushHistory = true, targetSection = null) {
    const page = document.getElementById('section-topic-detail');
    if (!page) return;

    if (typeof sectionName === 'boolean') {
        pushHistory = sectionName;
        sectionName = targetSection || (typeof arguments[4] === 'string' ? arguments[4] : null);
    }

    let currentSec = window.currentAdminClassroomSection;
    let effSection = sectionName || currentSec?.name || '';
    let effSubjectName = subjectName || currentSec?.subject || '';
    let effSubjId = subjectId;

    if (!currentSec || !effSection || !effSubjectName || (effSection && currentSec.name !== effSection) || (effSubjectName && currentSec.subject !== effSubjectName)) {
        const sections = (typeof getStoredJson === 'function') ? getStoredJson(SECTIONS_STORAGE_KEY, []) : [];
        let matchedSec = null;
        if (effSection && effSubjectName) {
            const normSec = String(effSection).toLowerCase().trim();
            const normSubj = String(effSubjectName).toLowerCase().trim();
            matchedSec = sections.find(s => (String(s.name || '').toLowerCase().trim() === normSec || String(s.id) === String(effSection)) && String(s.subject || s.assignedSubject || (Array.isArray(s.assignedSubjects) && s.assignedSubjects[0]) || '').toLowerCase().trim() === normSubj);
        }
        if (!matchedSec && effSection) {
            matchedSec = sections.find(s => String(s.name || '').toLowerCase().trim() === String(effSection).toLowerCase().trim() || String(s.id) === String(effSection));
        }
        if (!matchedSec && !effSection && (effSubjId || effSubjectName)) {
            matchedSec = sections.find(s => {
                const sSubj = String(s.subject || s.assignedSubject || (Array.isArray(s.assignedSubjects) && s.assignedSubjects[0]) || '').toLowerCase();
                return (effSubjectName && sSubj.includes(effSubjectName.toLowerCase())) ||
                       (effSubjId && sSubj.includes(effSubjId.toLowerCase().replace('card-', '')));
            });
        }
        if (matchedSec) {
            effSection = effSection || matchedSec.name || matchedSec.sectionName || matchedSec.id;
            effSubjectName = effSubjectName || matchedSec.subject || matchedSec.assignedSubject || (Array.isArray(matchedSec.assignedSubjects) && matchedSec.assignedSubjects[0]) || '';
            window.currentAdminClassroomSection = {
                id: matchedSec.id || '',
                name: effSection,
                subject: effSubjectName,
                room: matchedSec.room || 'Room 302',
                schedule: matchedSec.schedule || 'Mon–Fri • 09:00 AM – 10:30 AM',
                teacher: matchedSec.teacher || (matchedSec.teachers && matchedSec.teachers[0] ? matchedSec.teachers[0].name : 'Maria Santos Ramos'),
                teachers: matchedSec.teachers || (matchedSec.teacher ? [{ name: matchedSec.teacher, role: matchedSec.role || 'Teacher', isPrimary: true }] : []),
                students: matchedSec.students || [],
                gradeLevel: matchedSec.gradeLevel || matchedSec.grade || 'Grade 11',
                strand: matchedSec.strand || 'ICT'
            };
        }
    }

    if (!effSubjId && typeof window.resolveSubjectTopicId === 'function') {
        effSubjId = window.resolveSubjectTopicId(effSubjectName, effSubjectName);
    }
    if (!effSubjId) effSubjId = 'card-prog1';
    if (!effSubjectName) effSubjectName = 'Computer Programming 1';

    window.currentTopicState = {
        subjectId: effSubjId,
        topicIdx: 0,
        activeTab: 'videos',
        videoIdx: 0,
        activeIdx: null,
        selectedSection: effSection,
        selectedStudent: 'All',
        showGradebookPanel: false
    };

    if (effSection) {
        window.showAdminClassroom(effSection, effSubjectName || effSubjId, 'topics');
        return;
    }

    const { subject, data } = getAdminTopicSubjectAndData(effSubjId, effSubjectName, effSection);

    const statusIconClass = {
        completed: 'fa-check-circle text-green-500',
        'in-progress': 'fa-circle-half-stroke text-yellow-500',
        'not-started': 'fa-circle text-gray-300'
    };

    if (typeof window.buildSharedTopicPage === 'function') {
        page.innerHTML = '<div id="admin-standalone-quarter" class="room-quarter-switch" data-room-quarter-switch></div><div id="admin-standalone-topics"></div>';
        const mount = document.getElementById('admin-standalone-topics');
        window.buildSharedTopicPage(mount || page, effSubjId, subject, data, statusIconClass, true, { embedded: true });
        const quarterHost = document.getElementById('admin-standalone-quarter');
        if (quarterHost && typeof window.renderRoomQuarterSwitchHtml === 'function') {
            quarterHost.hidden = false;
            quarterHost.innerHTML = window.renderRoomQuarterSwitchHtml(effSubjId);
        }
    }

    window.showSection('section-topic-detail', 'nav-school-sections');

    const subjTitle = subject?.name || subject?.title || effSubjectName || 'Computer Programming 1';
    const headerTitle = document.getElementById('nav-context-text') || document.getElementById('header-brand-title');
    if (headerTitle) {
        headerTitle.textContent = subjTitle;
    }
    if (typeof window.setPortalHeader === 'function') {
        window.setPortalHeader(subjTitle);
    }

    if (pushHistory) {
        const secPart = effSection ? `:${encodeURIComponent(effSection)}` : '';
        const subjPart = (effSection && effSubjectName) ? `:${encodeURIComponent(effSubjectName)}` : '';
        const hash = `#topic:${encodeURIComponent(effSubjId)}${secPart}${subjPart}`;
        if (window.location.hash !== hash) {
            history.pushState({ type: 'admin-topic', subjectId: effSubjId, section: effSection, subject: effSubjectName }, '', hash);
        }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
};
window.switchToTopicPage = window.switchToAdminTopicPage;

window.openAdminClassroomTopics = function () {
    window.switchAdminClassDetailTab('topics');
};

window.returnToRoomFromTopic = function (subjId) {
    if (window.currentAdminClassroomSection) {
        window.viewSection(
            window.currentAdminClassroomSection.id || window.currentAdminClassroomSection.name,
            window.currentAdminClassroomSection.subject,
            'topics'
        );
    } else if (typeof window.switchTab === 'function') {
        window.switchTab('nav-school-sections');
    }
};

window.returnToSections = function () {
    if (window.currentAdminClassroomSection) {
        window.viewSection(
            window.currentAdminClassroomSection.id || window.currentAdminClassroomSection.name,
            window.currentAdminClassroomSection.subject,
            'topics'
        );
    } else if (typeof window.switchTab === 'function') {
        window.switchTab('nav-school-sections');
    }
};

window.returnToAdminRoomFromTopic = window.returnToRoomFromTopic;

window.openManageCurriculumHub = function (view = 'main', pushHistory = true) {
    const current = window.currentAdminClassroomSection;
    if (current) {
        const subjectName = current.subject || '';
        let subjectId = (window.currentTopicState && window.currentTopicState.subjectId) || '';
        if (!subjectId && typeof window.resolveSubjectTopicId === 'function') {
            subjectId = window.resolveSubjectTopicId(subjectName, subjectName);
        }
        window.currentTopicState = Object.assign({}, window.currentTopicState || {}, {
            subjectId: subjectId || subjectName,
            selectedSection: current.name || (window.currentTopicState && window.currentTopicState.selectedSection) || ''
        });
    }
    let overlay = document.getElementById('curriculum-hub-overlay');
    const isNew = !overlay;
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'curriculum-hub-overlay';
        overlay.className = 'curriculum-hub-overlay';
        overlay.dataset._historyPushed = 'true';
        overlay.onclick = function (e) {
            if (e.target === overlay) window.closeManageCurriculumHub?.();
        };
    }

    overlay.dataset.currentView = view;
    overlay.dataset._lastRecordedView = view;
    if (view === 'main') {
        overlay.dataset._openedFromMain = 'true';
    } else if (!overlay.dataset._openedFromMain) {
        overlay.dataset._openedFromMain = 'false';
    }

    if (pushHistory && typeof window.pushModalHistoryState === 'function') {
        window.pushModalHistoryState('curriculum-hub-' + view);
    }

    if (view === 'release-hub') {
        window.closeManageCurriculumHub?.();
        if (typeof window.openTeacherReleaseAssessmentsModal === 'function') {
            window.openTeacherReleaseAssessmentsModal();
        }
        return;
    }

    // Boxes panel deleted: directly close and return to main page
    window.closeManageCurriculumHub?.();
};

window.closeManageCurriculumHub = function () {
    window.stopAllVideos?.();
    const overlay = document.getElementById('curriculum-hub-overlay');
    if (!overlay) return;
    overlay.classList.remove('curriculum-hub-overlay--visible');
    overlay.remove();
    if (typeof window.unlockBodyScroll === 'function') {
        window.unlockBodyScroll();
    } else {
        document.documentElement.classList.remove('dialog-open', 'modal-open', 'sigma-modal-open', 'has-modal-open');
        document.body.classList.remove('dialog-open', 'modal-open', 'sigma-modal-open', 'has-modal-open');
    }
};

window.handleCurriculumHubBack = function (currentView) {
    window.closeManageCurriculumHub?.();
};

window.openTopicContent = function (subjectId, topicIdx = 0, tab = 'videos', subIdx = null, pushHistory = true, stateOverrides = {}) {
    const page = document.getElementById('section-topic-content');
    if (!page) return;

    const isSubMode = (stateOverrides && Object.prototype.hasOwnProperty.call(stateOverrides, 'viewSubmission'))
        ? Boolean(stateOverrides.viewSubmission)
        : Boolean(
            stateOverrides?._studentViewSubmissionMode ||
            stateOverrides?._sharedViewSubmissionMode ||
            window._studentViewSubmissionMode ||
            window._sharedViewSubmissionMode ||
            (typeof window.location !== 'undefined' && window.location.hash && window.location.hash.includes(':submission'))
        );
    window._studentSubmissionMode = false;
    window._studentViewSubmissionMode = isSubMode;
    window._sharedViewSubmissionMode = isSubMode;

    let currentSec = window.currentAdminClassroomSection;
    let effSection = stateOverrides?.selectedSection || currentSec?.name || '';
    let effSubjectName = currentSec?.subject || '';
    let effSubjId = subjectId;

    if (!currentSec || !effSection || !effSubjectName || (effSection && currentSec.name !== effSection)) {
        const sections = (typeof getStoredJson === 'function') ? getStoredJson(SECTIONS_STORAGE_KEY, []) : [];
        let matchedSec = null;
        if (effSection) {
            matchedSec = sections.find(s => String(s.name || '').toLowerCase() === String(effSection).toLowerCase() || String(s.id) === String(effSection));
        }
        if (!matchedSec && !effSection && (effSubjId || effSubjectName)) {
            matchedSec = sections.find(s => {
                const sSubj = String(s.subject || s.assignedSubject || (Array.isArray(s.assignedSubjects) && s.assignedSubjects[0]) || '').toLowerCase();
                return (effSubjectName && sSubj.includes(effSubjectName.toLowerCase())) ||
                       (effSubjId && sSubj.includes(effSubjId.toLowerCase().replace('card-', '')));
            });
        }
        if (matchedSec) {
            effSection = effSection || matchedSec.name || matchedSec.sectionName || matchedSec.id;
            effSubjectName = effSubjectName || matchedSec.subject || matchedSec.assignedSubject || (Array.isArray(matchedSec.assignedSubjects) && matchedSec.assignedSubjects[0]) || '';
            window.currentAdminClassroomSection = {
                name: effSection,
                subject: effSubjectName,
                room: matchedSec.room || 'Room 302',
                schedule: matchedSec.schedule || 'Mon–Fri • 09:00 AM – 10:30 AM',
                teacher: matchedSec.teacher || (matchedSec.teachers && matchedSec.teachers[0] ? matchedSec.teachers[0].name : 'Maria Santos Ramos'),
                teachers: matchedSec.teachers || (matchedSec.teacher ? [{ name: matchedSec.teacher, role: matchedSec.role || 'Teacher', isPrimary: true }] : []),
                students: matchedSec.students || [],
                gradeLevel: matchedSec.gradeLevel || matchedSec.grade || 'Grade 11',
                strand: matchedSec.strand || 'ICT'
            };
        }
    }

    if (!effSubjId && typeof window.resolveSubjectTopicId === 'function') {
        effSubjId = window.resolveSubjectTopicId(effSubjectName, effSubjectName);
    }
    if (!effSubjId) effSubjId = 'card-prog1';
    if (!effSubjectName) effSubjectName = 'Computer Programming 1';

    const normalizedTopicIdx = Number(topicIdx || 0);
    const assessmentTabs = ['assignments', 'quiz', 'activity', 'performance', 'assessments'];
    let normalizedTab = tab;
    if (assessmentTabs.includes(tab)) {
        normalizedTab = 'assessments';
    } else if (tab === 'lessons') {
        normalizedTab = 'handouts';
    } else if (!normalizedTab) {
        normalizedTab = 'videos';
    }

    const isMediaTab = (normalizedTab === 'videos' || normalizedTab === 'handouts');
    const effItemIdx = (subIdx !== null && subIdx !== undefined && subIdx !== '' && subIdx !== 'null') ? Number(subIdx) : (isMediaTab && subIdx !== 'null' && subIdx !== null && subIdx !== undefined ? 0 : null);

    window.currentTopicState = {
        subjectId: effSubjId,
        topicIdx: normalizedTopicIdx,
        activeTab: normalizedTab,
        videoIdx: isMediaTab ? effItemIdx : null,
        activeIdx: effItemIdx,
        selectedSection: effSection,
        selectedStudent: stateOverrides?.selectedStudent || 'All',
        showGradebookPanel: false
    };
    window._tcAssessmentDetailIdx = (normalizedTab === 'assessments') ? effItemIdx : null;
    window._scAssessmentDetailIdx = (normalizedTab === 'assessments') ? effItemIdx : null;

    window.showSection('section-topic-content', 'nav-school-sections');

    window.renderAdminTopicContentWorkstation();

    if (pushHistory) {
        const subSuffix = isSubMode ? ':submission' : '';
        const itmPart = (effItemIdx !== null && effItemIdx !== undefined && !Number.isNaN(effItemIdx)) ? effItemIdx : '';
        const secPart = effSection ? `:${encodeURIComponent(effSection)}` : '';
        const hash = `#topic-content:${encodeURIComponent(effSubjId)}:${normalizedTopicIdx}:${normalizedTab}:${itmPart}${secPart}${subSuffix}`;
        if (window.location.hash !== hash) {
            history.pushState({ type: 'admin-topic-content', subjectId: effSubjId, topicIdx: normalizedTopicIdx, tab: normalizedTab, subIdx: effItemIdx, viewSubmission: isSubMode }, '', hash);
        }
    }
    if (isSubMode) {
        window.scrollSubmissionViewToTop?.();
    } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};
window.switchToTopicContent = window.openTopicContent;

window.navigateToAssessmentFromGradebook = function (category, index, customSubject = '', customSection = '') {
    if (typeof window.keepGradebookForAssessmentOpen === 'function') {
        window.keepGradebookForAssessmentOpen();
    }
    const subSec = window.sigmaGradesState?.selectedSubjectSection;
    let subjectId = customSubject || subSec?.subject || '';
    let section = customSection || subSec?.sectionName || '';
    const currentQ = window.sigmaGradesState?.activeQuarter || 1;

    const getCatFn = (typeof window.getCategoryDetails === 'function') ? window.getCategoryDetails : null;
    let items = getCatFn ? (getCatFn(category, currentQ, subjectId, section) || []) : [];
    let item = items[index];
    if (!item && getCatFn) {
        const wwItems = getCatFn('ww', currentQ, subjectId, section) || [];
        item = wwItems[index] || wwItems.find(it => it.itemIdx === index || it.id === index);
    }
    if (!item && getCatFn) {
        const ptItems = getCatFn('pt', currentQ, subjectId, section) || [];
        item = ptItems[index] || ptItems.find(it => it.itemIdx === index || it.id === index);
    }
    if (!item && getCatFn) {
        const qaItems = getCatFn('qa', currentQ, subjectId, section) || [];
        item = qaItems[index] || qaItems.find(it => it.itemIdx === index || it.id === index);
    }

    const topicIdx = (item && item.topicIdx !== undefined) ? item.topicIdx : 0;
    const itemIdx = (item && item.topicItemIdx !== undefined) ? item.topicItemIdx : index;
    const actualSubjId = (item && item.subjectId) ? item.subjectId : subjectId;

    if (typeof window.openTopicContent === 'function') {
        window.openTopicContent(actualSubjId, topicIdx, 'assessments', itemIdx, true, {
            selectedSection: section,
            viewSubmission: true,
            _studentViewSubmissionMode: true,
            _sharedViewSubmissionMode: true
        });
    }
};

window.renderAdminTopicContentWorkstation = function () {
    const page = document.getElementById('section-topic-content');
    if (!page) return;

    const currentTopicState = window.currentTopicState || {};
    const { subjectId, topicIdx, activeTab, videoIdx, activeIdx } = currentTopicState;
    const currentSec = window.currentAdminClassroomSection;
    const effSection = currentTopicState.selectedSection || currentSec?.name || '';
    const effSubjectName = currentSec?.subject || 'Subject';

    const { subject, data } = getAdminTopicSubjectAndData(subjectId, effSubjectName, effSection);
    const topic = (data?.q1Topics && data.q1Topics[topicIdx]) || { title: `Topic ${Number(topicIdx || 0) + 1}` };

    const defaultVideos = topic?.videos || [];
    const videos = typeof window.getUnifiedTopicVideos === 'function'
        ? window.getUnifiedTopicVideos(subjectId, topicIdx, defaultVideos, effSection)
        : defaultVideos;

    const defaultHandouts = topic?.handouts || topic?.materials || [];
    const handouts = typeof window.getUnifiedTopicHandouts === 'function'
        ? window.getUnifiedTopicHandouts(subjectId, topicIdx, defaultHandouts, effSection)
        : defaultHandouts;

    const rawAssign = Array.isArray(topic?.assignments) ? topic.assignments : [];
    const rawQuiz = Array.isArray(topic?.quiz) ? topic.quiz : [];
    const rawAct = Array.isArray(topic?.activity) ? topic.activity : [];
    const rawPerf = Array.isArray(topic?.performance) ? topic.performance : [];
    let assessments = [...rawAssign, ...rawQuiz, ...rawAct, ...rawPerf];
    if (typeof window.getUnifiedTopicAssessments === 'function') {
        assessments = window.getUnifiedTopicAssessments('assessments', subjectId, topicIdx, assessments, effSection);
    }
    if (typeof window.deduplicateMaterialsArray === 'function') {
        assessments = window.deduplicateMaterialsArray(assessments, { collapseRoles: true });
    }

    const rawTabKey = String(activeTab || 'videos').toLowerCase();
    const currentTabKey = (rawTabKey === 'lessons' ? 'handouts' : rawTabKey);
    const effItemIdx = (activeIdx !== null && activeIdx !== undefined) ? activeIdx : videoIdx;

    const isVideoDetail = (currentTabKey === 'videos' && effItemIdx !== null && effItemIdx !== undefined && !Number.isNaN(Number(effItemIdx)) && Boolean(videos[effItemIdx]));
    const isHandoutDetail = (currentTabKey === 'handouts' && effItemIdx !== null && effItemIdx !== undefined && !Number.isNaN(Number(effItemIdx)) && Boolean(handouts[effItemIdx]));
    const isAssessmentDetail = (['assessments', 'assignments', 'quiz', 'activity', 'performance'].includes(currentTabKey) && effItemIdx !== null && effItemIdx !== undefined && !Number.isNaN(Number(effItemIdx)) && Boolean(assessments[effItemIdx]));
    const isDetailView = isVideoDetail || isHandoutDetail || isAssessmentDetail || Boolean(window._studentSubmissionMode || window._studentViewSubmissionMode || window._sharedViewSubmissionMode);

    const isViewSubmission = Boolean(window._studentViewSubmissionMode || window._sharedViewSubmissionMode);
    if (typeof window.setTopicHeaderBreadcrumb === 'function') {
        window.setTopicHeaderBreadcrumb(subject, topic || topicIdx, topic?.title, {
            materialTitle: isDetailView ? window._activeMaterialTitle : null,
            isViewSubmission: isViewSubmission
        });
    } else {
        const navContextText = document.getElementById('nav-context-text') || document.getElementById('header-brand-title');
        if (navContextText) {
            const subjTitle = subject?.name || subject?.title || effSubjectName;
            const topicTitle = topic?.title || `Topic ${Number(topicIdx || 0) + 1}`;
            navContextText.className = 'admin-topbar__brand-label text-black has-breadcrumb';
            navContextText.innerHTML = `
                <div class="breadcrumb-line-group">
                    <span class="breadcrumb-subject">${escapeHtml(subjTitle)}</span>
                    <span class="breadcrumb-topic">${escapeHtml(topicTitle)}</span>
                </div>
            `;
        }
    }

    let mainContentHtml = '';

    if (currentTabKey === 'videos') {
        if (typeof window.renderSharedVideosTabHtml === 'function') {
            mainContentHtml = window.renderSharedVideosTabHtml({
                videos,
                activeIdx: effItemIdx,
                activeVideoIdx: effItemIdx,
                subjectId,
                topicIdx,
                role: 'admin',
                section: effSection
            });
        }
        if (!mainContentHtml) {
            mainContentHtml = (typeof window.renderTopicEmptyStateHtml === 'function') ? window.renderTopicEmptyStateHtml('videos') : '<div class="p-12 text-center text-slate-400">No Videos Available</div>';
        }
    } else if (currentTabKey === 'handouts') {
        if (typeof window.renderSharedLessonsTabHtml === 'function') {
            mainContentHtml = window.renderSharedLessonsTabHtml({
                handouts,
                activeIdx: effItemIdx,
                subjectId,
                topicIdx,
                role: 'admin',
                section: effSection,
                emptyTabKey: 'handouts'
            });
        }
        if (!mainContentHtml) {
            mainContentHtml = (typeof window.renderTopicEmptyStateHtml === 'function') ? window.renderTopicEmptyStateHtml('lessons') : '<div class="p-12 text-center text-slate-400">No Lessons Available</div>';
        }
    } else if (['assessments', 'assignments', 'quiz', 'activity', 'performance'].includes(currentTabKey)) {
        if (typeof window.renderSharedAssessmentsTabHtml === 'function') {
            mainContentHtml = window.renderSharedAssessmentsTabHtml({
                tab: currentTabKey,
                assessments,
                activeIdx: effItemIdx,
                subjectId,
                topicIdx,
                role: 'admin',
                section: effSection,
                emptyTabKey: currentTabKey
            });
        }
        if (!mainContentHtml) {
            mainContentHtml = (typeof window.renderTopicEmptyStateHtml === 'function') ? window.renderTopicEmptyStateHtml(currentTabKey) : '<div class="p-12 text-center text-slate-400">No Assessments Available</div>';
        }
    }

    const tabNavHtml = isDetailView ? '' : ((typeof window.renderTopicContentTabBarHtml === 'function')
        ? window.renderTopicContentTabBarHtml({
            currentTab: currentTabKey,
            subjectId,
            topicIdx,
            role: 'admin',
            currentSection: effSection || currentSec?.name || ''
        })
        : '');

    let tasksHtml = '';
    if (isDetailView) {
        if (['assessments', 'assignments', 'quiz', 'activity', 'performance'].includes(currentTabKey)) {
            tasksHtml = (typeof window.renderSharedTasksPanelHtml === 'function') ? window.renderSharedTasksPanelHtml({
                forceShow: true,
                items: assessments.map((a, i) => ({
                    title: a.title,
                    isActive: i === Number(effItemIdx),
                    onClick: isViewSubmission ? `window.openSubmissionTask(${i})` : `window.openMaterialTask(${i})`
                }))
            }) : '';
        } else if (currentTabKey === 'videos') {
            tasksHtml = (typeof window.renderSharedTasksPanelHtml === 'function') ? window.renderSharedTasksPanelHtml({
                forceShow: true,
                items: videos.map((v, i) => ({
                    title: v.title || `Video ${i + 1}`,
                    isActive: i === Number(effItemIdx),
                    onClick: `window.switchTopicTab('videos', ${i})`
                }))
            }) : '';
        } else if (currentTabKey === 'handouts') {
            tasksHtml = (typeof window.renderSharedTasksPanelHtml === 'function') ? window.renderSharedTasksPanelHtml({
                forceShow: true,
                items: handouts.map((h, i) => ({
                    title: (h.title || h.name || 'Lesson Document').replace(/\.(pdf|docx|pptx|ppt)$/i, ''),
                    isActive: i === Number(effItemIdx),
                    onClick: `window.switchTopicTab('handouts', ${i})`
                }))
            }) : '';
        }
    }

    const baseRailHtml = (typeof window.buildTopicSectionSelectorCard === 'function')
        ? window.buildTopicSectionSelectorCard(data, false)
        : '';

    const assessmentRailDetail = isDetailView && ['assessments', 'assignments', 'quiz', 'activity', 'performance'].includes(currentTabKey);
    const railModeClass = assessmentRailDetail
        ? (isViewSubmission ? 'topic-rail-score-follow' : 'topic-rail-follow')
        : '';
    const detailRailTop = (assessmentRailDetail && isViewSubmission) ? baseRailHtml : '';

    const railHtml = `
        <div class="space-y-6 font-['Inter'] ${railModeClass === 'topic-rail-score-follow' ? 'h-full' : ''}">
            ${isDetailView ? detailRailTop : baseRailHtml}
            ${tasksHtml}
        </div>
    `;

    page.innerHTML = `
        <div class="topic-page-shell student-topic-page-shell teacher-topic-page-shell font-['Inter']">
            <!-- Top Header: Category Selection Tabs -->
            ${!isDetailView ? `
            <div class="topic-page-tabs-header">
                <div id="topic-content-header" class="w-full">
                    ${tabNavHtml}
                </div>
            </div>` : ''}

            <!-- Main Content Grid -->
            <div class="topic-detail-grid teacher-topic-page-grid">
                <div id="topic-content-main" class="w-full flex-1 min-w-0">
                    ${mainContentHtml}
                </div>

                <!-- Progress Rail: Class Panel -->
                <div id="topic-right-section" class="topic-progress-rail teacher-topic-progress-rail font-['Inter'] ${railModeClass}">
                    ${railHtml}
                </div>
            </div>
        </div>
    `;
};

window.switchTopicTab = function (tab, itemIdx = null, preserveSubMode = false) {
    if (typeof window.stopAllTopicMedia === 'function') {
        window.stopAllTopicMedia();
    }
    if (!window.currentTopicState) window.currentTopicState = {};
    const assessmentTabs = ['assignments', 'quiz', 'activity', 'performance', 'assessments'];
    let normalizedTab = tab;
    if (assessmentTabs.includes(tab)) {
        normalizedTab = 'assessments';
    } else if (tab === 'lessons') {
        normalizedTab = 'handouts';
    } else if (!normalizedTab) {
        normalizedTab = 'videos';
    }

    const isMediaTab = (normalizedTab === 'videos' || normalizedTab === 'handouts');
    const effItemIdx = (itemIdx !== null && itemIdx !== undefined && itemIdx !== '' && itemIdx !== 'null') ? Number(itemIdx) : null;
    window.currentTopicState.activeTab = normalizedTab;
    window.currentTopicState.videoIdx = isMediaTab ? effItemIdx : null;
    window.currentTopicState.activeIdx = effItemIdx;
    window._tcAssessmentDetailIdx = (normalizedTab === 'assessments') ? effItemIdx : null;
    window._scAssessmentDetailIdx = (normalizedTab === 'assessments') ? effItemIdx : null;

    if (!preserveSubMode || isMediaTab) {
        window._studentSubmissionMode = false;
        window._studentViewSubmissionMode = false;
        window._sharedViewSubmissionMode = false;
    }
    if (effItemIdx === null || isMediaTab) {
        window._studentSubmissionMode = false;
        window._studentViewSubmissionMode = false;
        window._sharedViewSubmissionMode = false;
        window._activeMaterialTitle = null;
        window._activeSubmissionAttemptPage = {};
    }

    const { subjectId, topicIdx } = window.currentTopicState;
    const isSubMode = Boolean(preserveSubMode && (window._studentViewSubmissionMode || window._sharedViewSubmissionMode));
    const subSuffix = isSubMode ? ':submission' : '';
    const itmPart = (effItemIdx !== null && effItemIdx !== undefined && !Number.isNaN(effItemIdx)) ? effItemIdx : '';
    const hash = `#topic-content:${encodeURIComponent(subjectId || '')}:${Number(topicIdx || 0)}:${normalizedTab}:${itmPart}${subSuffix}`;
    if (window.location.hash !== hash) {
        history.pushState({ type: 'admin-topic-content', subjectId, topicIdx, tab: normalizedTab, subIdx: effItemIdx, viewSubmission: isSubMode }, '', hash);
    }

    if (typeof window.renderAdminTopicContentWorkstation === 'function') {
        window.renderAdminTopicContentWorkstation();
    }
    if (effItemIdx !== null || isMediaTab || isSubMode) {
        try {
            window.scrollTo({ left: 0, top: 0, behavior: 'instant' });
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
            const mc = document.getElementById('main-content');
            if (mc) mc.scrollTop = 0;
        } catch (_) { }
    }
    if (isSubMode) {
        window.scrollSubmissionViewToTop?.();
    }
};

window.openAdminClassroomAssessments = function () {
    if (typeof window.switchTab === 'function') {
        window.switchTab('nav-school-grades');
    }
};

window.openAdminClassroomComposer = function () {
    if (typeof window.openComposerModal === 'function') {
        window.openComposerModal();
    }
};

window.closeViewSectionModal = function () {
    const overlay = document.getElementById('view-section-overlay');
    if (overlay) overlay.remove();
};


window.validateSectionDeployment = function () {
    const name = document.getElementById('edit-section-name')?.value.trim();
    const grade = document.getElementById('edit-section-grade')?.value;
    const room = document.getElementById('edit-section-room')?.value.trim();
    const schoolYear = document.getElementById('edit-section-school-year')?.value;
    const activeScheduleDays = (window.selectedSectionDailySchedule || []).filter(d => d.active && d.startTime && d.endTime).length;
    const roomConflicts = (window.getScheduleSubpageConflicts && activeScheduleDays > 0) ? window.getScheduleSubpageConflicts(window.selectedSectionDailySchedule) : [];
    const teacherCount = (window.selectedSectionTeachers || []).length;
    const subject = document.getElementById('edit-section-subject')?.value.trim();
    const studentCount = window.selectedSectionStudents?.length || 0;

    const isStep1Filled = Boolean(name && grade && room && schoolYear);

    let isEligible = Boolean(isStep1Filled && activeScheduleDays > 0 && roomConflicts.length === 0 && teacherCount > 0 && subject && studentCount > 0);

    if (window.isEditingSection) {
        const hasChanges = (typeof window.hasSectionFormChanges === 'function') ? window.hasSectionFormChanges() : true;
        if (!hasChanges) {
            isEligible = false;
        }
    }

    const deployBtn = document.getElementById('section-save-btn');
    const deployDropdownBtn = document.getElementById('section-split-dropdown-btn');
    const deployCreateBtn = document.getElementById('section-deploy-create-btn');
    const draftBtn = document.getElementById('section-draft-btn');

    if (deployBtn) {
        deployBtn.disabled = !isEligible;
        deployBtn.style.opacity = isEligible ? '1' : '0.5';
        deployBtn.style.cursor = isEligible ? 'pointer' : 'not-allowed';
        deployBtn.classList.toggle('opacity-50', !isEligible);
        deployBtn.classList.toggle('cursor-not-allowed', !isEligible);
    }
    if (deployDropdownBtn) {
        const canOpenDropdown = window.isEditingSection || isStep1Filled;
        deployDropdownBtn.disabled = !canOpenDropdown;
        deployDropdownBtn.style.opacity = canOpenDropdown ? '1' : '0.5';
        deployDropdownBtn.style.cursor = canOpenDropdown ? 'pointer' : 'not-allowed';
        deployDropdownBtn.classList.toggle('opacity-50', !canOpenDropdown);
        deployDropdownBtn.classList.toggle('cursor-not-allowed', !canOpenDropdown);
    }
    if (deployCreateBtn) {
        deployCreateBtn.disabled = !isEligible;
        deployCreateBtn.style.opacity = isEligible ? '1' : '0.5';
        deployCreateBtn.style.cursor = isEligible ? 'pointer' : 'not-allowed';
        deployCreateBtn.classList.toggle('opacity-50', !isEligible);
        deployCreateBtn.classList.toggle('cursor-not-allowed', !isEligible);
    }
    if (draftBtn) {
        // Save as Draft triggers when all fields in Add Section (Step 1) are filled
        const isDraftEligible = isStep1Filled;
        draftBtn.disabled = !isDraftEligible;
        draftBtn.style.opacity = isDraftEligible ? '1' : '0.5';
        draftBtn.style.cursor = isDraftEligible ? 'pointer' : 'not-allowed';
        draftBtn.classList.toggle('opacity-50', !isDraftEligible);
        draftBtn.classList.toggle('cursor-not-allowed', !isDraftEligible);
    }
};

window.checkSectionNameDuplicate = function (checkSubject = true) {
    const name = document.getElementById('edit-section-name')?.value.trim();
    const grade = document.getElementById('edit-section-grade')?.value;
    const schoolYear = document.getElementById('edit-section-school-year')?.value;
    const subject = document.getElementById('edit-section-subject')?.value?.trim();
    if (!name || !grade || !schoolYear) return null;
    if (checkSubject && !subject) return null;

    const sections = getStoredJson(SECTIONS_STORAGE_KEY, []);
    const duplicate = sections.find(s => {
        if (window.isEditingSection && String(s.id) === String(window.currentEditingSectionId)) {
            return false;
        }
        if (s.status === 'Draft') return false;
        const sameName = (s.name || '').trim().toLowerCase() === name.toLowerCase();
        const sameGrade = (s.gradeLevel || s.grade || '').trim().toLowerCase() === grade.toLowerCase();
        const sameSY = (s.schoolYear || '').trim().toLowerCase() === schoolYear.toLowerCase();
        
        if (checkSubject) {
            const sameSubject = (s.subject || '').trim().toLowerCase() === subject.toLowerCase();
            return sameName && sameGrade && sameSY && sameSubject;
        }
        return false;
    });

    return duplicate;
};

window.checkSectionRoomScheduleConflict = function () {
    const room = document.getElementById('edit-section-room')?.value.trim();
    const startTime = document.getElementById('edit-section-start-time')?.value || '';
    const endTime = document.getElementById('edit-section-end-time')?.value || '';
    const schoolYear = document.getElementById('edit-section-school-year')?.value || '';
    const days = window.getSelectedSectionDays ? window.getSelectedSectionDays() : [];

    if (!room || !startTime || !endTime || !days || days.length === 0 || !schoolYear) return null;

    const parseMins = (t) => {
        if (!t) return 0;
        const [h, m] = t.split(':');
        return (parseInt(h, 10) * 60) + parseInt(m || '0', 10);
    };

    const startM = parseMins(startTime);
    const endM = parseMins(endTime);
    if (startM >= endM) return null;

    const sections = getStoredJson(SECTIONS_STORAGE_KEY, []);
    const conflict = sections.find(s => {
        if (window.isEditingSection && String(s.id) === String(window.currentEditingSectionId)) {
            return false;
        }
        if ((s.schoolYear || '').trim() !== schoolYear.trim()) return false;
        if ((s.room || '').trim().toLowerCase() !== room.toLowerCase()) return false;

        const sDays = Array.isArray(s.days) ? s.days : [];
        const hasDayOverlap = days.some(d => sDays.includes(d));
        if (!hasDayOverlap) return false;

        if (!s.startTime || !s.endTime) return false;
        const sStart = parseMins(s.startTime);
        const sEnd = parseMins(s.endTime);

        return Math.max(startM, sStart) < Math.min(endM, sEnd);
    });

    return conflict;
};

window.toggleSectionSaveDropdown = function (eventOrShow) {
    if (eventOrShow && typeof eventOrShow.stopPropagation === 'function') {
        eventOrShow.stopPropagation();
    }
    const menu = document.getElementById('section-split-dropdown-menu');
    const chevron = document.getElementById('section-split-chevron');
    if (!menu) return;
    const willOpen = (typeof eventOrShow === 'boolean') ? eventOrShow : menu.classList.contains('hidden');
    menu.classList.toggle('hidden', !willOpen);
    if (chevron) {
        chevron.classList.toggle('rotate-180', willOpen);
    }
};

document.addEventListener('click', function (e) {
    const splitGroup = document.getElementById('section-split-btn-group');
    const menu = document.getElementById('section-split-dropdown-menu');
    if (splitGroup && menu && !menu.classList.contains('hidden')) {
        if (!splitGroup.contains(e.target)) {
            window.toggleSectionSaveDropdown(false);
        }
    }
});

window.handleSectionSave = function (status, createAnother = false) {
    // 1. Check duplicate section name + subject
    const duplicate = window.checkSectionNameDuplicate ? window.checkSectionNameDuplicate(true) : null;
    if (duplicate) {
        const errorMsg = `A section named "${duplicate.name}" already exists for subject "${duplicate.subject || 'this subject'}" (${duplicate.gradeLevel || duplicate.grade} in School Year ${duplicate.schoolYear}). Please use a different subject or edit the existing section.`;
        if (typeof window.showAlertDialog === 'function') {
            window.showAlertDialog('Duplicate Section & Subject', errorMsg);
        } else {
            alert(errorMsg);
        }
        return;
    }

    // 2. Check room schedule conflict (same room, overlapping days & hours)
    const conflicts = window.getScheduleSubpageConflicts ? window.getScheduleSubpageConflicts(window.selectedSectionDailySchedule) : [];
    if (conflicts.length > 0) {
        const conflict = conflicts[0];
        const roomName = document.getElementById('edit-section-room')?.value || '';
        const conflictMsg = `Room ${roomName} is already assigned to Section "${conflict.section.name}" on ${conflict.day} (${conflict.scheduleLabel || 'overlapping hours'}). Please assign a different room or adjust your schedule.`;
        if (typeof window.showAlertDialog === 'function') {
            window.showAlertDialog('Room Schedule Conflict', conflictMsg);
        } else {
            alert(conflictMsg);
        }
        return;
    }

    // 3. Check Teacher schedule conflicts
    for (const t of (window.selectedSectionTeachers || [])) {
        const tConflict = window.getTeacherScheduleConflict ? window.getTeacherScheduleConflict(t.name) : null;
        if (tConflict) {
            const msg = `Teacher Schedule Conflict: ${t.name} is already assigned to teach Section "${tConflict.section.name}" on ${tConflict.day} (${tConflict.scheduleLabel}). A teacher cannot teach two sections at the same time.`;
            if (typeof window.showAlertDialog === 'function') {
                window.showAlertDialog('Teacher Conflict', msg);
            } else {
                alert(msg);
            }
            return;
        }
    }

    // 4. Check Student schedule conflicts
    for (const s of (window.selectedSectionStudents || [])) {
        const sConflict = window.getStudentScheduleConflict ? window.getStudentScheduleConflict(s.id || s.uid) : null;
        if (sConflict) {
            const sName = s.name || `${s.lastName || ''}, ${s.firstName || ''}`;
            const msg = `Student Schedule Conflict: ${sName} is already enrolled in Section "${sConflict.section.name}" on ${sConflict.day} (${sConflict.scheduleLabel}). A student cannot attend multiple overlapping sections.`;
            if (typeof window.showAlertDialog === 'function') {
                window.showAlertDialog('Student Conflict', msg);
            } else {
                alert(msg);
            }
            return;
        }
    }

    let title = '';
    let desc = '';
    const existingSection = (window.isEditingSection && window.currentEditingSectionId)
        ? getStoredJson(SECTIONS_STORAGE_KEY, []).find(s => (s.id && String(s.id) === String(window.currentEditingSectionId)) || (s.name && String(s.name).toLowerCase() === String(window.currentEditingSectionId).toLowerCase()))
        : null;
    const isAlreadyDeployed = window.isEditingSection && existingSection && (existingSection.status === 'Deployed' || existingSection.status === 'deployed' || !existingSection.status);

    let confirmBtnText = 'Proceed';
    if (status === 'Draft') {
        title = window.isEditingSection ? 'Save changes as draft?' : 'Do you want to save this as a draft?';
        desc = 'The section will be saved as a draft and can be deployed later.';
        confirmBtnText = 'Save Draft';
    } else if (createAnother) {
        title = 'Deploy and create another section?';
        desc = 'This will deploy the current section and immediately open a blank form to create another.';
        confirmBtnText = 'Deploy & Create';
    } else if (window.isEditingSection && isAlreadyDeployed) {
        title = 'Save changes to this section?';
        desc = 'All updates to the section schedule, teachers, and student roster will be saved.';
        confirmBtnText = 'Save Changes';
    } else if (window.isEditingSection) {
        title = 'Do you want to deploy this section?';
        desc = 'This will deploy the draft section and make it available for enrollment and scheduling.';
        confirmBtnText = 'Deploy';
    } else {
        title = 'Do you want to deploy this section?';
        desc = 'This will make the section available for enrollment and scheduling.';
        confirmBtnText = 'Deploy';
    }

    window.showSectionConfirm(title, desc, () => {
        let btnId = 'section-save-btn';
        let loadingId = 'section-save-loading';
        if (status === 'Draft') {
            btnId = 'section-draft-btn';
            loadingId = 'section-draft-loading';
        } else if (createAnother) {
            btnId = 'section-deploy-create-btn';
            loadingId = 'section-deploy-create-loading';
        }

        const saveBtn = document.getElementById(btnId);
        const loading = document.getElementById(loadingId);

        if (saveBtn && loading) {
            saveBtn.disabled = true;
            loading.classList.remove('hidden');

            setTimeout(() => {
                window.collapseExtraAdviserRoles(window.selectedSectionTeachers);
                const primaryTeacher = (window.selectedSectionTeachers || []).find(t => t.isPrimary) || (window.selectedSectionTeachers || [])[0];
                const adviserTeacher = (window.selectedSectionTeachers || []).find(t => t.role === 'Adviser') ||
                    (document.getElementById('edit-section-role')?.value === 'Adviser' ? primaryTeacher : null);
                const activeDays = (window.selectedSectionDailySchedule || []).filter(d => d.active).map(d => d.day);
                const primarySlot = (window.selectedSectionDailySchedule || []).find(d => d.active && d.startTime && d.endTime);
                const startTime = primarySlot ? primarySlot.startTime : '';
                const endTime = primarySlot ? primarySlot.endTime : '';
                const daysFormatted = formatSectionDaysString(activeDays);
                const fullSchedule = window.formatFormattedScheduleSummary(window.selectedSectionDailySchedule);

                const subjectVal = (document.getElementById('edit-section-subject')?.value || window.selectedSectionSubject || '').trim();

                const sectionData = {
                    id: window.currentEditingSectionId || `SEC-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
                    name: document.getElementById('edit-section-name').value.trim(),
                    grade: document.getElementById('edit-section-grade').value,
                    room: document.getElementById('edit-section-room').value.trim(),
                    schoolYear: document.getElementById('edit-section-school-year').value,
                    startTime: startTime,
                    endTime: endTime,
                    days: activeDays,
                    daysFormatted: daysFormatted,
                    schedule: fullSchedule,
                    dailySchedules: window.selectedSectionDailySchedule || [],
                    teacher: primaryTeacher ? primaryTeacher.name : (document.getElementById('edit-section-teacher')?.value.trim() || ''),
                    role: primaryTeacher ? primaryTeacher.role : (document.getElementById('edit-section-role')?.value || 'Teacher'),
                    teachers: window.selectedSectionTeachers || [],
                    adviser: adviserTeacher ? adviserTeacher.name : '',
                    adviserId: adviserTeacher ? (adviserTeacher.id || adviserTeacher.uid || '') : '',
                    subject: subjectVal,
                    assignedSubjects: subjectVal ? [subjectVal] : [],
                    subjects: subjectVal ? [subjectVal] : [],
                    students: window.selectedSectionStudents || [],
                    studentsCount: window.selectedSectionStudents.length,
                    status: status, // 'Deployed' or 'Draft'
                    updatedAt: new Date().toISOString(),
                    createdAt: window.currentEditingSectionCreatedAt || new Date().toISOString()
                };

                const sections = getStoredJson(SECTIONS_STORAGE_KEY, []);

                if (window.isEditingSection && window.currentEditingSectionId) {
                    const existingIndex = sections.findIndex(s => String(s.id) === String(window.currentEditingSectionId));
                    if (existingIndex !== -1) {
                        sectionData.id = sections[existingIndex].id;
                        sections[existingIndex] = { ...sections[existingIndex], ...sectionData };
                    } else {
                        sections.unshift(sectionData);
                    }
                } else {
                    // New section creation - ALWAYS add as a new distinct entry!
                    sections.unshift(sectionData);
                }

                const savedRecord = sections.find(section => section && String(section.id) === String(sectionData.id)) || sectionData;
                const savedAdviser = (savedRecord.teachers || []).find(teacher => teacher && teacher.role === 'Adviser') || null;
                if (savedAdviser) {
                    sections.forEach((section) => {
                        if (!section || String(section.id) === String(savedRecord.id)) return;
                        if (window.sectionAdviserGroupKey(section) !== window.sectionAdviserGroupKey(savedRecord)) return;
                        window.applyCanonicalAdviserToSection(section, savedAdviser);
                    });
                }

                saveStoredJson(SECTIONS_STORAGE_KEY, sections);

                // Update connected student and teacher user accounts with their assigned section and subject
                try {
                    const cleanStr = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

                    const studentIdSet = new Set((sectionData.students || []).map(s => String(s.id || s.uid || s.lrn || '').trim().toLowerCase()).filter(Boolean));
                    const studentNameSet = new Set((sectionData.students || []).map(s => cleanStr(s.name || s.fullName || `${s.firstName || ''} ${s.lastName || ''}`)).filter(Boolean));
                    (sectionData.students || []).forEach(s => {
                        const rev = cleanStr(`${s.lastName || ''} ${s.firstName || ''}`);
                        if (rev) studentNameSet.add(rev);
                    });

                    const teacherIdSet = new Set((sectionData.teachers || []).map(t => String(t.id || t.uid || '').trim().toLowerCase()).filter(Boolean));
                    const teacherEmailSet = new Set((sectionData.teachers || []).map(t => String(t.email || '').toLowerCase().trim()).filter(Boolean));
                    const teacherNameSet = new Set();

                    const addTeacherToSets = (t) => {
                        if (!t) return;
                        const name = typeof t === 'object' ? (t.name || t.fullName || `${t.firstName || ''} ${t.lastName || ''}`) : String(t);
                        const cName = cleanStr(name);
                        if (cName) {
                            teacherNameSet.add(cName);
                            const parts = cName.split(' ');
                            if (parts.length > 1) {
                                teacherNameSet.add(`${parts[parts.length - 1]} ${parts.slice(0, -1).join(' ')}`);
                            }
                        }
                        if (typeof t === 'object') {
                            const tid = String(t.id || t.uid || '').trim().toLowerCase();
                            if (tid) teacherIdSet.add(tid);
                            const temail = String(t.email || '').trim().toLowerCase();
                            if (temail) teacherEmailSet.add(temail);
                        }
                    };

                    (sectionData.teachers || []).forEach(addTeacherToSets);
                    if (sectionData.teacher) addTeacherToSets(sectionData.teacher);
                    if (sectionData.adviser) addTeacherToSets(sectionData.adviser);

                    ['sigma-admin-users', 'sigma-users-list', 'sigma-teacher-users', 'sigma-student-users', 'sigma-users'].forEach(storageKey => {
                        const users = getStoredJson(storageKey, []);
                        if (!Array.isArray(users) || users.length === 0) return;

                        let usersChanged = false;
                        users.forEach(u => {
                            const uid = String(u.uid || u.id || u.lrn || '').trim().toLowerCase();
                            const uEmail = String(u.email || '').toLowerCase().trim();
                            const uFullName = cleanStr(u.fullName || u.name || `${u.firstName || ''} ${u.lastName || ''}`);
                            const uRevName = cleanStr(`${u.lastName || ''} ${u.firstName || ''}`);
                            const uFirst = cleanStr(u.firstName || '');
                            const uLast = cleanStr(u.lastName || '');

                            const isUserStudent = String(u.role || u.type || '').toLowerCase().includes('stud');
                            const isUserTeacher = String(u.role || u.type || '').toLowerCase().includes('teach') || String(u.role || u.type || '').toLowerCase().includes('adviser') || (!isUserStudent && !String(u.role || u.type || '').toLowerCase().includes('admin'));

                            // Match student
                            if (isUserStudent) {
                                let isStudentMatch = (uid && studentIdSet.has(uid)) ||
                                    studentNameSet.has(uFullName) ||
                                    studentNameSet.has(uRevName);

                                if (!isStudentMatch && uFirst && uLast && uFirst.length >= 2 && uLast.length >= 2) {
                                    for (const sName of studentNameSet) {
                                        const words = new Set(sName.split(' '));
                                        if (words.has(uFirst) && words.has(uLast)) {
                                            isStudentMatch = true;
                                            break;
                                        }
                                    }
                                }

                                if (isStudentMatch) {
                                    u.section = sectionData.name;
                                    if (sectionData.grade) u.gradeLevel = sectionData.grade;
                                    if (!Array.isArray(u.enrolledSections)) u.enrolledSections = [];
                                    if (!u.enrolledSections.includes(sectionData.id)) u.enrolledSections.push(sectionData.id);
                                    if (!u.enrolledSections.includes(sectionData.name)) u.enrolledSections.push(sectionData.name);

                                    if (!Array.isArray(u.sections)) u.sections = [];
                                    if (!u.sections.includes(sectionData.id)) u.sections.push(sectionData.id);
                                    if (!u.sections.includes(sectionData.name)) u.sections.push(sectionData.name);

                                    if (!Array.isArray(u.assignedSections)) u.assignedSections = [];
                                    if (!u.assignedSections.includes(sectionData.id)) u.assignedSections.push(sectionData.id);
                                    if (!u.assignedSections.includes(sectionData.name)) u.assignedSections.push(sectionData.name);

                                    if (sectionData.subject) {
                                        if (!Array.isArray(u.enrolledSubjects)) u.enrolledSubjects = [];
                                        if (!u.enrolledSubjects.includes(sectionData.subject)) u.enrolledSubjects.push(sectionData.subject);
                                        if (!Array.isArray(u.subjects)) u.subjects = [];
                                        if (!u.subjects.includes(sectionData.subject)) u.subjects.push(sectionData.subject);
                                        if (!Array.isArray(u.assignedSubjects)) u.assignedSubjects = [];
                                        if (!u.assignedSubjects.includes(sectionData.subject)) u.assignedSubjects.push(sectionData.subject);
                                    }
                                    usersChanged = true;
                                }
                            }

                            // Match teacher (Lead Teacher, Co-Teacher, Adviser, etc.)
                            if (isUserTeacher) {
                                let isTeacherMatch = (uid && teacherIdSet.has(uid)) ||
                                    (uEmail && teacherEmailSet.has(uEmail)) ||
                                    teacherNameSet.has(uFullName) ||
                                    teacherNameSet.has(uRevName);

                                if (!isTeacherMatch && uFirst && uLast && uFirst.length >= 2 && uLast.length >= 2) {
                                    for (const tName of teacherNameSet) {
                                        const words = new Set(tName.split(' '));
                                        if (words.has(uFirst) && words.has(uLast)) {
                                            isTeacherMatch = true;
                                            break;
                                        }
                                    }
                                }

                                if (isTeacherMatch) {
                                    if (!u.section || u.section === 'Unassigned') {
                                        u.section = sectionData.name;
                                    }
                                    if (!Array.isArray(u.assignedSections)) u.assignedSections = [];
                                    if (!u.assignedSections.includes(sectionData.id)) u.assignedSections.push(sectionData.id);
                                    if (!u.assignedSections.includes(sectionData.name)) u.assignedSections.push(sectionData.name);

                                    if (!Array.isArray(u.sections)) u.sections = [];
                                    if (!u.sections.includes(sectionData.id)) u.sections.push(sectionData.id);
                                    if (!u.sections.includes(sectionData.name)) u.sections.push(sectionData.name);

                                    if (sectionData.subject) {
                                        if (!Array.isArray(u.assignedSubjects)) u.assignedSubjects = [];
                                        if (!u.assignedSubjects.includes(sectionData.subject)) u.assignedSubjects.push(sectionData.subject);
                                        if (!Array.isArray(u.subjects)) u.subjects = [];
                                        if (!u.subjects.includes(sectionData.subject)) u.subjects.push(sectionData.subject);
                                    }
                                    usersChanged = true;
                                }
                            }
                        });

                        if (usersChanged) {
                            try {
                                localStorage.setItem(storageKey, JSON.stringify(users));
                            } catch (e) {}
                        }
                    });

                    // Dispatch cross-tab / window sync event
                    try {
                        window.dispatchEvent(new CustomEvent('sigma:section-deployed', { detail: sectionData }));
                    } catch (e) {}
                } catch (e) {
                    console.error('Error updating user section links:', e);
                }

                // Store creation bar data before reload (persists via sessionStorage)
                if (window.showCreationBar) {
                    window.showCreationBar({
                        type: 'section',
                        label: sectionData.status === 'Draft' ? 'Saved as Draft' : 'Deployed Section',
                        primaryLabel: 'Section Name',
                        primaryValue: sectionData.name,
                        secondaryLabel: sectionData.status === 'Draft' ? 'Status' : 'Grade Level',
                        secondaryValue: sectionData.status === 'Draft' ? 'Draft' : (sectionData.gradeLevel || sectionData.grade || '—'),
                        status: sectionData.status === 'Draft' ? 'draft' : 'published'
                    });
                }

                saveBtn.disabled = false;
                loading.classList.add('hidden');

                if (createAnother) {
                    window.showToast?.(`Section "${sectionData.name}" deployed successfully!`);
                    if (typeof renderSectionsTable === 'function') {
                        renderSectionsTable();
                    }
                    // Reset modal to fresh Step 1 for next section
                    window.toggleSectionOverlay(true, null);
                } else {
                    window.toggleSectionOverlay(false);
                    window.location.reload();
                }
            }, 1000);
        }
    }, confirmBtnText);
};

// =============================================================
// GLOBAL SECTION-USER CROSS-LINKING & SYNCHRONIZATION
// =============================================================
window.syncAllSectionsWithUsers = function () {
    try {
        if (typeof window.syncAllConnectedUserRecords === 'function') {
            window.syncAllConnectedUserRecords();
        }

        const cleanStr = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
        const getSafeList = (val) => {
            if (!val) return [];
            if (Array.isArray(val)) return val;
            if (typeof val === 'string') {
                try {
                    const parsed = JSON.parse(val);
                    if (Array.isArray(parsed)) return parsed;
                    if (parsed && typeof parsed === 'object') return [parsed];
                } catch (e) {}
                return val.split(',').map(s => s.trim()).filter(Boolean);
            }
            if (typeof val === 'object') return [val];
            return [];
        };

        const allSections = [];
        const seenSecKeys = new Set();
        [SECTIONS_STORAGE_KEY, 'sigma-admin-sections', 'sigma-sections-list'].forEach(key => {
            const list = getStoredJson(key, []);
            if (Array.isArray(list)) {
                list.forEach(sec => {
                    if (!sec) return;
                    const sId = String(sec.id || '');
                    const sName = String(sec.name || sec.sectionName || '').trim().toLowerCase();
                    const sSubj = String(sec.subject || sec.assignedSubject || (Array.isArray(sec.assignedSubjects) && sec.assignedSubjects[0]) || '').trim().toLowerCase();
                    const k = `${sId}::${sName}::${sSubj}`;
                    if (!seenSecKeys.has(k)) {
                        seenSecKeys.add(k);
                        allSections.push(sec);
                    }
                });
            }
        });

        if (allSections.length === 0) return;

        ['sigma-admin-users', 'sigma-users-list', 'sigma-teacher-users', 'sigma-student-users', 'sigma-users'].forEach(storageKey => {
            const users = getStoredJson(storageKey, []);
            if (!Array.isArray(users) || users.length === 0) return;

            let usersChanged = false;
            users.forEach(u => {
                const uid = String(u.uid || u.id || u.lrn || '').trim().toLowerCase();
                const uEmail = String(u.email || '').toLowerCase().trim();
                const uFullName = cleanStr(u.fullName || u.name || `${u.firstName || ''} ${u.lastName || ''}`);
                const uRevName = cleanStr(`${u.lastName || ''} ${u.firstName || ''}`);
                const uFirst = cleanStr(u.firstName || '');
                const uLast = cleanStr(u.lastName || '');

                const isUserStudent = String(u.role || u.type || '').toLowerCase().includes('stud') || storageKey.includes('student');
                const isUserTeacher = String(u.role || u.type || '').toLowerCase().includes('teach') || String(u.role || u.type || '').toLowerCase().includes('adviser') || (!isUserStudent && !String(u.role || u.type || '').toLowerCase().includes('admin'));

                allSections.forEach(sec => {
                    const secId = String(sec.id || '').trim();
                    const secName = String(sec.name || sec.sectionName || '').trim();
                    const secSubj = String(sec.subject || sec.assignedSubject || (Array.isArray(sec.assignedSubjects) && sec.assignedSubjects[0]) || '').trim();
                    if (!secId && !secName) return;

                    if (isUserTeacher) {
                        const secTeachers = getSafeList(sec.teachers)
                            .concat(getSafeList(sec.assignedTeachers))
                            .concat(getSafeList(sec.coTeachers))
                            .concat(getSafeList(sec.instructors));

                        if (sec.teacher) secTeachers.push(sec.teacher);
                        if (sec.adviser) secTeachers.push(sec.adviser);
                        if (sec.leadTeacher) secTeachers.push(sec.leadTeacher);
                        if (sec.coTeacher) secTeachers.push(sec.coTeacher);

                        const isTeacherMatch = secTeachers.some(t => {
                            if (!t) return false;
                            if (typeof window.isUserNameMatch === 'function') {
                                return window.isUserNameMatch(t, u);
                            }
                            const tName = typeof t === 'object' ? (t.name || t.fullName || `${t.firstName || ''} ${t.lastName || ''}`) : String(t);
                            const tClean = cleanStr(tName);
                            if (['teacher', 'adviser', 'instructor', 'faculty', 'none', 'n a', 'tba', 'unassigned', 'staff'].includes(tClean)) return false;
                            if (typeof t === 'object') {
                                const tid = String(t.id || t.uid || '').trim().toLowerCase();
                                if (tid && uid && tid === uid) return true;
                                const temail = String(t.email || '').trim().toLowerCase();
                                if (temail && uEmail && temail === uEmail) return true;
                            }
                            if (uFullName && (tClean === uFullName || tClean === uRevName)) return true;
                            if (uFullName && (tClean.includes(uFullName) || uFullName.includes(tClean))) return true;
                            if (uFirst && uLast && uFirst.length >= 2 && uLast.length >= 2) {
                                const words = new Set(tClean.split(' '));
                                if (words.has(uFirst) && words.has(uLast)) return true;
                            }
                            return false;
                        });

                        if (isTeacherMatch) {
                            if (!u.section || u.section === 'Unassigned') u.section = secName;
                            if (!Array.isArray(u.assignedSections)) u.assignedSections = [];
                            if (secId && !u.assignedSections.includes(secId)) u.assignedSections.push(secId);
                            if (secName && !u.assignedSections.includes(secName)) u.assignedSections.push(secName);

                            if (!Array.isArray(u.sections)) u.sections = [];
                            if (secId && !u.sections.includes(secId)) u.sections.push(secId);
                            if (secName && !u.sections.includes(secName)) u.sections.push(secName);

                            if (secSubj) {
                                if (!Array.isArray(u.assignedSubjects)) u.assignedSubjects = [];
                                if (!u.assignedSubjects.includes(secSubj)) u.assignedSubjects.push(secSubj);
                                if (!Array.isArray(u.subjects)) u.subjects = [];
                                if (!u.subjects.includes(secSubj)) u.subjects.push(secSubj);
                            }
                            usersChanged = true;
                        }
                    }

                    if (isUserStudent) {
                        const secStudents = getSafeList(sec.students)
                            .concat(getSafeList(sec.enrolledStudents))
                            .concat(getSafeList(sec.classmates));

                        const isStudentMatch = secStudents.some(st => {
                            if (!st) return false;
                            if (typeof window.isUserNameMatch === 'function') {
                                return window.isUserNameMatch(st, u);
                            }
                            const stName = typeof st === 'object' ? (st.name || st.fullName || `${st.firstName || ''} ${st.lastName || ''}`) : String(st);
                            const stClean = cleanStr(stName);
                            if (typeof st === 'object') {
                                const stId = String(st.id || st.uid || st.lrn || '').trim().toLowerCase();
                                if (stId && uid && stId === uid) return true;
                                const stEmail = String(st.email || '').trim().toLowerCase();
                                if (stEmail && uEmail && stEmail === uEmail) return true;
                            }
                            if (uFullName && (stClean === uFullName || stClean === uRevName)) return true;
                            if (uFullName && (stClean.includes(uFullName) || uFullName.includes(stClean))) return true;
                            if (uFirst && uLast && uFirst.length >= 2 && uLast.length >= 2) {
                                const words = new Set(stClean.split(' '));
                                if (words.has(uFirst) && words.has(uLast)) return true;
                            }
                            return false;
                        });

                        if (isStudentMatch) {
                            if (!Array.isArray(u.sections)) u.sections = [];
                            if (secId && !u.sections.includes(secId)) u.sections.push(secId);
                            if (secName && !u.sections.includes(secName)) u.sections.push(secName);

                            if (!Array.isArray(u.assignedSections)) u.assignedSections = [];
                            if (secId && !u.assignedSections.includes(secId)) u.assignedSections.push(secId);
                            if (secName && !u.assignedSections.includes(secName)) u.assignedSections.push(secName);

                            if (secSubj) {
                                if (!Array.isArray(u.enrolledSubjects)) u.enrolledSubjects = [];
                                if (!u.enrolledSubjects.includes(secSubj)) u.enrolledSubjects.push(secSubj);
                                if (!Array.isArray(u.subjects)) u.subjects = [];
                                if (!u.subjects.includes(secSubj)) u.subjects.push(secSubj);
                                if (!Array.isArray(u.assignedSubjects)) u.assignedSubjects = [];
                                if (!u.assignedSubjects.includes(secSubj)) u.assignedSubjects.push(secSubj);
                            }
                            usersChanged = true;
                        }
                    }
                });
            });

            if (usersChanged) {
                try {
                    localStorage.setItem(storageKey, JSON.stringify(users));
                } catch (e) {}
            }
        });
    } catch (e) {
        console.error('Failed to sync all sections with users:', e);
    }
};

// Auto-run sync on admin load
try {
    window.syncAllSectionsWithUsers();
} catch (e) {}

// =============================================================
// SECTION PEOPLE & ROSTER ARCHITECTURE (TEACHERS, SUBJECTS, STUDENTS)
// =============================================================

window.selectedSectionStudents = [];
window.selectedSectionTeachers = [];
window.stagedSectionTeachers = [];
window.stagedSectionSubject = '';
window.stagedSectionStudents = [];
window.activeSectionSubpage = null;

window.toggleSectionExitButton = function (show = true) {
    const exitBtns = document.querySelectorAll('#section-modal-exit-btn, button[onclick*="handleSectionExit"]');
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

window.openSectionSubpage = function (subpageType, isChangeMode = false) {
    window.toggleSectionExitButton(false);
    const currentSubject = (document.getElementById('edit-section-subject')?.value || window.stagedSectionSubject || '').trim();
    const isSubjectSet = !!currentSubject;
    const activeScheduleDays = (window.selectedSectionDailySchedule || []).filter(d => d.active && d.startTime && d.endTime);
    const isScheduleSet = activeScheduleDays.length > 0;

    if (subpageType === 'schedule' && !isSubjectSet) {
        window.toggleSectionExitButton(true);
        const msg = 'Please assign a Subject first before setting the Class Schedule.';
        if (typeof window.showAlertDialog === 'function') {
            window.showAlertDialog('Subject Required', msg);
        } else {
            alert(msg);
        }
        return;
    }

    if ((subpageType === 'teacher' || subpageType === 'students') && !isScheduleSet) {
        window.toggleSectionExitButton(true);
        const msg = 'Please assign and save the Class Schedule first before assigning teachers or students.';
        if (typeof window.showAlertDialog === 'function') {
            window.showAlertDialog('Schedule Required', msg);
        } else {
            alert(msg);
        }
        return;
    }

    window.activeSectionSubpage = subpageType;
    if (subpageType !== 'subject') {
        const subjectChip = document.getElementById('section-subpage-subject-selected-panel');
        if (subjectChip) {
            subjectChip.innerHTML = '';
            subjectChip.classList.add('hidden');
        }
    }
    if (subpageType !== 'teacher') {
        const teacherChip = document.getElementById('section-subpage-teacher-selected-panel');
        if (teacherChip) {
            teacherChip.innerHTML = '';
            teacherChip.classList.add('hidden');
        }
    }
    if (subpageType !== 'students') {
        const studentsChip = document.getElementById('section-subpage-students-selected-panel');
        if (studentsChip) {
            studentsChip.innerHTML = '';
            studentsChip.classList.add('hidden');
        }
    }
    if (!isChangeMode) {
        window.teacherSubpageReplaceIndex = null;
    }
    const headerContainer = document.getElementById('section-modal-header-container');
    const tabsContainer = document.getElementById('section-step-tabs-container');
    const titleEl = document.getElementById('section-modal-title');
    const subtitleEl = document.getElementById('section-modal-subtitle');
    const step2 = document.getElementById('section-step-2');
    const scheduleSubpage = document.getElementById('section-subpage-schedule');
    const teacherSubpage = document.getElementById('section-subpage-teacher');
    const subjectSubpage = document.getElementById('section-subpage-subject');
    const studentsSubpage = document.getElementById('section-subpage-students');

    if (headerContainer) headerContainer.classList.remove('hidden');
    if (tabsContainer) tabsContainer.classList.add('hidden');
    if (step2) step2.classList.add('hidden');

    if (scheduleSubpage) scheduleSubpage.classList.add('hidden');
    if (teacherSubpage) teacherSubpage.classList.add('hidden');
    if (subjectSubpage) subjectSubpage.classList.add('hidden');
    if (studentsSubpage) studentsSubpage.classList.add('hidden');

    // Helper to set subtitle
    const setSubtitle = (text) => {
        if (subtitleEl) {
            subtitleEl.textContent = text;
            subtitleEl.classList.toggle('hidden', !text);
        }
    };

    // Show Back button in header, hide split group & Next button while in subpage
    document.getElementById('section-back-btn')?.classList.remove('hidden');
    document.getElementById('section-split-btn-group')?.classList.add('hidden');
    document.getElementById('section-next-btn')?.classList.add('hidden');
    document.getElementById('section-modal-footer')?.classList.add('hidden');

    const footerEl = document.getElementById('section-subpage-footer');
    if (footerEl) footerEl.classList.remove('hidden');

    const confirmBtn = document.getElementById('section-subpage-confirm-btn');
    const confirmLabel = document.getElementById('section-subpage-confirm-label');
    if (confirmBtn) {
        confirmBtn.classList.remove('hidden');
        confirmBtn.onclick = window.confirmSectionSubpage;
    }

    if (subpageType === 'schedule') {
        if (titleEl) titleEl.textContent = 'Class Schedule';
        setSubtitle('Set the days and time slots for this section\'s weekly class meetings.');
        window.stagedSectionDailySchedule = JSON.parse(JSON.stringify(
            (window.selectedSectionDailySchedule && window.selectedSectionDailySchedule.length > 0)
            ? window.selectedSectionDailySchedule
            : window.getDefaultSectionDailySchedule(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], '', '')
        ));
        if (scheduleSubpage) {
            scheduleSubpage.classList.remove('hidden');
            window.renderScheduleSubpage();
        }
        window.subpageScheduleInitialSnapshot = JSON.stringify(window.stagedSectionDailySchedule || []);
        if (confirmLabel) confirmLabel.textContent = 'Save Schedule';
    } else if (subpageType === 'teacher') {
        if (titleEl) titleEl.textContent = 'Assign Teacher';
        setSubtitle('Search and select the teacher responsible for handling this section.');
        // When clicking Assign Teacher, start fresh (empty) so existing teachers from the main section are not displayed
        if (isChangeMode && window.teacherSubpageReplaceIndex !== null && window.teacherSubpageReplaceIndex !== undefined) {
            const currentTarget = (window.selectedSectionTeachers || [])[window.teacherSubpageReplaceIndex];
            window.stagedSectionTeachers = currentTarget ? [JSON.parse(JSON.stringify(currentTarget))] : [];
        } else {
            window.stagedSectionTeachers = [];
        }
        window.subpageTeacherInitialSnapshot = JSON.stringify(window.stagedSectionTeachers || []);
        if (teacherSubpage) {
            teacherSubpage.classList.remove('hidden');
            const search = document.getElementById('section-subpage-teacher-search');
            if (search) { search.value = ''; search.focus(); }
            const roleSelect = document.getElementById('section-subpage-teacher-role');
            if (roleSelect) {
                if (isChangeMode && window.stagedSectionTeachers[0]) {
                    roleSelect.value = window.stagedSectionTeachers[0].role || 'Teacher';
                } else {
                    roleSelect.value = 'Teacher';
                }
            }
            window.syncSectionAdviserRoleSelect();
            document.getElementById('section-subpage-teacher-dropdown')?.classList.add('hidden');
            window.renderSubpageTeacherSelectedPanel();
        }
        if (confirmLabel) {
            if (isChangeMode) {
                confirmLabel.textContent = 'Change Teacher';
            } else {
                confirmLabel.textContent = 'Select Teacher';
            }
        }
    } else if (subpageType === 'subject') {
        if (titleEl) titleEl.textContent = 'Assign Subject';
        setSubtitle('Search and select the subject to be taught in this section.');
        // Stage current subject so changes are only applied on confirm
        window.stagedSectionSubject = document.getElementById('edit-section-subject')?.value || '';
        window.subpageSubjectInitialSnapshot = window.stagedSectionSubject || '';
        if (subjectSubpage) {
            subjectSubpage.classList.remove('hidden');
            const search = document.getElementById('section-subpage-subject-search');
            if (search) { search.value = ''; search.focus(); }
            document.getElementById('section-subpage-subject-dropdown')?.classList.add('hidden');
            window.renderSubpageSubjectSelectedPanel();
        }
        if (confirmLabel) confirmLabel.textContent = 'Select Subject';
    } else if (subpageType === 'students') {
        if (titleEl) titleEl.textContent = 'Assign Students';
        setSubtitle('Search and add students to enroll in this section.');
        // Stage current students roster so changes are only applied on confirm
        window.stagedSectionStudents = JSON.parse(JSON.stringify(window.selectedSectionStudents || []));
        window.subpageStudentsInitialSnapshot = JSON.stringify(window.stagedSectionStudents || []);
        if (studentsSubpage) {
            studentsSubpage.classList.remove('hidden');
            const search = document.getElementById('section-subpage-students-search');
            if (search) { search.value = ''; search.focus(); }
            document.getElementById('section-subpage-students-dropdown')?.classList.add('hidden');
            window.renderSubpageStudentsSelectedPanel();
        }
        const count = window.stagedSectionStudents?.length || 0;
        const studentsConfirmLabel = document.getElementById('section-subpage-students-confirm-label') || confirmLabel;
        if (studentsConfirmLabel) studentsConfirmLabel.textContent = count > 0 ? `Select Students (${count})` : 'Select Students';
    }
};

window.confirmSectionSubpage = function () {
    if (window.activeSectionSubpage === 'schedule') {
        const conflicts = window.getScheduleSubpageConflicts ? window.getScheduleSubpageConflicts(window.stagedSectionDailySchedule) : [];
        if (conflicts.length > 0) {
            const conflict = conflicts[0];
            const roomName = document.getElementById('edit-section-room')?.value || '';
            const msg = `Schedule Conflict in Room ${roomName}: Overlaps on ${conflict.day} with Section "${conflict.section.name}" (${conflict.scheduleLabel || 'scheduled hours'}). You cannot save while overlapping with another section. Please adjust your hours or days.`;
            if (typeof window.showAlertDialog === 'function') {
                window.showAlertDialog('Schedule Conflict Detected', msg);
            } else {
                alert(msg);
            }
            return;
        }

        const activeDays = (window.stagedSectionDailySchedule || []).filter(d => d.active && d.startTime && d.endTime);
        if (activeDays.length === 0) {
            const msg = 'Please activate at least 1 day with valid Start and End hours before saving.';
            if (typeof window.showAlertDialog === 'function') {
                window.showAlertDialog('Incomplete Schedule', msg);
            } else {
                alert(msg);
            }
            return;
        }

        window.selectedSectionDailySchedule = JSON.parse(JSON.stringify(window.stagedSectionDailySchedule || []));
    } else if (window.activeSectionSubpage === 'teacher') {
        for (const t of (window.stagedSectionTeachers || [])) {
            const tConflict = window.getTeacherScheduleConflict(t.name);
            if (tConflict) {
                const msg = `Teacher Schedule Conflict: ${t.name} is already assigned to teach Section "${tConflict.section.name}" on ${tConflict.day} (${tConflict.scheduleLabel}).`;
                if (typeof window.showAlertDialog === 'function') {
                    window.showAlertDialog('Teacher Conflict Detected', msg);
                } else {
                    alert(msg);
                }
                return;
            }
        }

        if (!window.selectedSectionTeachers) window.selectedSectionTeachers = [];

        if (window.teacherSubpageReplaceIndex !== null && window.teacherSubpageReplaceIndex !== undefined) {
            const replaceIdx = window.teacherSubpageReplaceIndex;
            if (window.stagedSectionTeachers && window.stagedSectionTeachers.length > 0) {
                const newT = window.stagedSectionTeachers[0];
                if (newT.role === 'Adviser' && window.sectionHasDifferentAdviser(newT, replaceIdx)) {
                    window.notifySingleAdviserLimit();
                    return;
                }
                window.selectedSectionTeachers[replaceIdx] = newT;
            }
        } else {
            // Adding new teacher from subpage
            if (window.stagedSectionTeachers && window.stagedSectionTeachers.length > 0) {
                const newT = window.stagedSectionTeachers[0];
                if (newT.role === 'Adviser' && window.sectionHasDifferentAdviser(newT, null)) {
                    window.notifySingleAdviserLimit();
                    return;
                }
                const exists = window.selectedSectionTeachers.some(st => (st.name || '').toLowerCase() === (newT.name || '').toLowerCase());
                if (!exists) {
                    if (window.selectedSectionTeachers.length === 0) {
                        newT.isPrimary = true;
                        window.selectedSectionTeachers.push(newT);
                    } else if (window.selectedSectionTeachers.length < 2) {
                        newT.isPrimary = false;
                        window.selectedSectionTeachers.push(newT);
                    } else {
                        newT.isPrimary = false;
                        window.selectedSectionTeachers[1] = newT;
                    }
                }
            }
        }

        // Ensure lead teacher
        if (window.selectedSectionTeachers.length > 0) {
            const hasPrimary = window.selectedSectionTeachers.some(t => t.isPrimary);
            if (!hasPrimary) window.selectedSectionTeachers[0].isPrimary = true;
        }

        const primary = (window.selectedSectionTeachers || []).find(t => t.isPrimary) || (window.selectedSectionTeachers || [])[0];
        const teacherInput = document.getElementById('edit-section-teacher');
        const roleInput = document.getElementById('edit-section-role');
        if (teacherInput) teacherInput.value = primary ? primary.name : '';
        if (roleInput) roleInput.value = primary ? primary.role : 'Teacher';
    } else if (window.activeSectionSubpage === 'subject') {
        window.selectedSectionSubject = window.stagedSectionSubject || '';
        const subjectInput = document.getElementById('edit-section-subject');
        if (subjectInput) subjectInput.value = window.selectedSectionSubject;
    } else if (window.activeSectionSubpage === 'students') {
        window.selectedSectionStudents = JSON.parse(JSON.stringify(window.stagedSectionStudents || []));
    }

    window.closeSectionSubpage();
    window.validateSectionDeployment?.();
};

window.closeSectionSubpage = function () {
    window.activeSectionSubpage = null;
    window.teacherSubpageReplaceIndex = null;
    const headerContainer = document.getElementById('section-modal-header-container');
    const tabsContainer = document.getElementById('section-step-tabs-container');
    const titleEl = document.getElementById('section-modal-title');
    const step2 = document.getElementById('section-step-2');
    const scheduleSubpage = document.getElementById('section-subpage-schedule');
    const teacherSubpage = document.getElementById('section-subpage-teacher');
    const subjectSubpage = document.getElementById('section-subpage-subject');
    const studentsSubpage = document.getElementById('section-subpage-students');

    if (scheduleSubpage) scheduleSubpage.classList.add('hidden');
    if (teacherSubpage) teacherSubpage.classList.add('hidden');
    if (subjectSubpage) subjectSubpage.classList.add('hidden');
    if (studentsSubpage) studentsSubpage.classList.add('hidden');

    ['section-subpage-subject-selected-panel', 'section-subpage-teacher-selected-panel', 'section-subpage-students-selected-panel'].forEach((id) => {
        const chip = document.getElementById(id);
        if (chip) {
            chip.innerHTML = '';
            chip.classList.add('hidden');
        }
    });

    // Hide subpage footer & confirm button
    document.getElementById('section-subpage-footer')?.classList.add('hidden');
    document.getElementById('section-subpage-confirm-btn')?.classList.add('hidden');

    if (headerContainer) headerContainer.classList.remove('hidden');

    if (titleEl) {
        titleEl.textContent = window.isEditingSection ? 'Edit Assigned Section' : 'Create Section';
    }
    // Hide subtitle when returning to the section editor
    const subtitleEl = document.getElementById('section-modal-subtitle');
    if (subtitleEl) { subtitleEl.textContent = ''; subtitleEl.classList.add('hidden'); }

    if (tabsContainer) {
        if (window.isEditingSection) {
            tabsContainer.classList.add('hidden');
            tabsContainer.style.setProperty('display', 'none', 'important');
        } else {
            tabsContainer.classList.remove('hidden');
            tabsContainer.style.removeProperty('display');
        }
    }

    if (window.currentSectionStep === 2 || window.isEditingSection) {
        if (step2) step2.classList.remove('hidden');
        document.getElementById('section-back-btn')?.classList.toggle('hidden', Boolean(window.isEditingSection));
        document.getElementById('section-split-btn-group')?.classList.remove('hidden');
        document.getElementById('section-deploy-create-btn')?.classList.toggle('hidden', Boolean(window.isEditingSection));
        document.getElementById('section-next-btn')?.classList.add('hidden');
        document.getElementById('section-modal-footer')?.classList.add('hidden');
    } else if (window.currentSectionStep === 1) {
        document.getElementById('section-back-btn')?.classList.add('hidden');
        document.getElementById('section-split-btn-group')?.classList.remove('hidden');
        document.getElementById('section-next-btn')?.classList.remove('hidden');
        document.getElementById('section-modal-footer')?.classList.remove('hidden');
    }

    window.renderAssignSectionOverview();
    if (typeof window.toggleSectionExitButton === 'function') {
        window.toggleSectionExitButton(true);
    }
};

window.syncTeacherMenuButtons = function () {
    document.querySelectorAll('[id^="teacher-menu-btn-"]').forEach(btn => {
        const id = btn.id.replace('teacher-menu-btn-', '');
        const menu = document.getElementById(`teacher-menu-${id}`);
        const icon = btn.querySelector('i');
        const isOpen = menu && !menu.classList.contains('hidden');
        if (isOpen) {
            btn.classList.add('text-[#FFD000]');
            btn.classList.remove('text-black');
            if (icon) {
                icon.classList.add('text-[#FFD000]');
                icon.classList.remove('text-black');
            }
        } else {
            btn.classList.remove('text-[#FFD000]');
            btn.classList.add('text-black');
            if (icon) {
                icon.classList.remove('text-[#FFD000]');
                icon.classList.add('text-black');
            }
        }
    });
};

// Global click listener to dismiss any open teacher 3-dots menu, year picker dropdown, or existing section menu
document.addEventListener('click', (e) => {
    if (!e.target.closest('.teacher-dropdown-menu') && !e.target.closest('[onclick*="toggleTeacherMenu"]')) {
        document.querySelectorAll('.teacher-dropdown-menu').forEach(m => {
            m.classList.add('hidden');
            m.classList.remove('dropup');
        });
        window.syncTeacherMenuButtons();
    }
    if (!e.target.closest('#sy-year-start-container')) {
        document.getElementById('edit-sy-year-picker-dropdown')?.classList.add('hidden');
    }
    if (!e.target.closest('#section-existing-picker-wrapper')) {
        document.getElementById('section-existing-menu')?.classList.add('hidden');
        window.setExistingSectionPickerSelected(false);
    }
});

window.toggleTeacherMenu = function (event, menuId) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    const menu = document.getElementById(`teacher-menu-${menuId}`);
    const btn = document.getElementById(`teacher-menu-btn-${menuId}`) || (event ? event.currentTarget : null);
    const allMenus = document.querySelectorAll('.teacher-dropdown-menu');
    allMenus.forEach(m => {
        if (m !== menu) {
            m.classList.add('hidden');
            m.classList.remove('dropup');
        }
    });
    if (menu) {
        const isHidden = menu.classList.contains('hidden');
        if (isHidden) {
            menu.classList.remove('hidden');
            if (btn) window.positionActionDropdown(menu, btn);
        } else {
            menu.classList.add('hidden');
            menu.classList.remove('dropup');
        }
    }
    window.syncTeacherMenuButtons();
};

window.setSectionPrimaryTeacher = function (index) {
    if (!window.selectedSectionTeachers || !window.selectedSectionTeachers[index]) return;
    window.selectedSectionTeachers.forEach((t, i) => {
        t.isPrimary = (i === index);
    });
    const primary = window.selectedSectionTeachers[index];
    const teacherInput = document.getElementById('edit-section-teacher');
    const roleInput = document.getElementById('edit-section-role');
    if (teacherInput) teacherInput.value = primary.name;
    if (roleInput) roleInput.value = primary.role;
    window.renderAssignSectionOverview();
};

window.sameSectionTeacher = function (a, b) {
    if (!a || !b) return false;
    const idOf = (person) => String(typeof person === 'object' ? (person.id || person.uid || '') : '').trim().toLowerCase();
    const nameOf = (person) => String(typeof person === 'object' ? (person.name || person.fullName || '') : person).trim().toLowerCase();
    const idA = idOf(a);
    const idB = idOf(b);
    if (idA && idB && idA === idB) return true;
    const nameA = nameOf(a);
    const nameB = nameOf(b);
    return !!(nameA && nameB && nameA === nameB);
};

window.sectionAdviserGroupKey = function (section) {
    const name = String(section?.name || '').trim().toLowerCase();
    const gradeText = String(section?.grade || section?.gradeLevel || '').trim().toLowerCase();
    const grade = gradeText.includes('12') ? '12' : (gradeText.includes('11') ? '11' : gradeText.replace(/\s+/g, ''));
    const yearText = String(section?.schoolYear || section?.schoolyear || section?.sy || section?.academicYear || '')
        .trim()
        .toLowerCase()
        .replace(/[\u2013\u2014]/g, '-');
    const yearMatch = yearText.match(/(\d{4})\s*-\s*(\d{4})/);
    const year = yearMatch ? `${yearMatch[1]}-${yearMatch[2]}` : yearText.replace(/\s+/g, '');
    if (!name || !grade || !year) return '';
    return `${name}|${grade}|${year}`;
};

window.sectionHasDifferentAdviser = function (candidate, ignoreIndex) {
    const list = window.selectedSectionTeachers || [];
    const blockedOnThisSubject = list.some((teacher, index) => {
        if (!teacher || teacher.role !== 'Adviser') return false;
        if (ignoreIndex !== null && ignoreIndex !== undefined && Number(index) === Number(ignoreIndex)) return false;
        if (candidate && window.sameSectionTeacher(teacher, candidate)) return false;
        return true;
    });
    if (blockedOnThisSubject) return true;

    const name = document.getElementById('edit-section-name')?.value.trim() || '';
    const grade = document.getElementById('edit-section-grade')?.value || '';
    const year = document.getElementById('edit-section-school-year')?.value || '';
    const key = window.sectionAdviserGroupKey({ name, grade, schoolYear: year });
    if (!key || typeof getStoredJson !== 'function') return false;
    const currentId = window.currentEditingSectionId;
    const sections = getStoredJson(SECTIONS_STORAGE_KEY, []);
    if (!Array.isArray(sections)) return false;
    return sections.some((section) => {
        if (!section) return false;
        if (currentId && String(section.id) === String(currentId)) return false;
        if (window.sectionAdviserGroupKey(section) !== key) return false;
        const adviser = (Array.isArray(section.teachers) ? section.teachers : []).find(teacher => teacher && teacher.role === 'Adviser');
        if (!adviser && section.adviser) {
            const named = { name: section.adviser, id: section.adviserId || '' };
            if (candidate && window.sameSectionTeacher(named, candidate)) return false;
            return true;
        }
        if (!adviser) return false;
        if (candidate && window.sameSectionTeacher(adviser, candidate)) return false;
        return true;
    });
};

window.notifySingleAdviserLimit = function () {
    const title = 'One Adviser Only';
    const message = 'This section already has an adviser for this grade level and school year. The same section name in another grade, or in another school year, can have its own adviser.';
    if (typeof window.showAlertDialog === 'function') {
        window.showAlertDialog(title, message);
    } else {
        alert(message);
    }
};

window.collapseExtraAdviserRoles = function (teachers) {
    if (!Array.isArray(teachers)) return false;
    let kept = null;
    let changed = false;
    teachers.forEach((teacher) => {
        if (!teacher || teacher.role !== 'Adviser') return;
        if (!kept) {
            kept = teacher;
            return;
        }
        if (window.sameSectionTeacher(kept, teacher)) return;
        teacher.role = 'Teacher';
        changed = true;
    });
    return changed;
};

window.applyCanonicalAdviserToSection = function (section, canonical) {
    if (!section || typeof section !== 'object') return false;
    let changed = false;
    const teachers = Array.isArray(section.teachers) ? section.teachers : [];
    teachers.forEach((teacher) => {
        if (!teacher) return;
        const isCanonical = canonical && window.sameSectionTeacher(teacher, canonical);
        if (isCanonical && teacher.role !== 'Adviser') {
            teacher.role = 'Adviser';
            changed = true;
        } else if (!isCanonical && teacher.role === 'Adviser') {
            teacher.role = 'Teacher';
            changed = true;
        }
    });
    const kept = canonical ? teachers.find(teacher => teacher && window.sameSectionTeacher(teacher, canonical)) : null;
    if (kept) {
        const keptId = kept.id || kept.uid || '';
        if (section.adviser !== kept.name) {
            section.adviser = kept.name || '';
            changed = true;
        }
        if (String(section.adviserId || '') !== String(keptId)) {
            section.adviserId = keptId;
            changed = true;
        }
    } else if (section.adviser || section.adviserId) {
        const named = { name: section.adviser, id: section.adviserId || '' };
        if (!canonical || !window.sameSectionTeacher(named, canonical)) {
            section.adviser = '';
            section.adviserId = '';
            changed = true;
        }
    }
    const primary = teachers.find(teacher => teacher && teacher.isPrimary) || teachers[0];
    if (primary && primary.role === 'Adviser' && section.role !== 'Adviser') {
        section.role = 'Adviser';
        changed = true;
    } else if (primary && section.role === 'Adviser' && primary.role !== 'Adviser') {
        section.role = primary.role || 'Teacher';
        changed = true;
    }
    return changed;
};

window.normalizeSectionSingleAdviser = function (section) {
    if (!section || typeof section !== 'object') return false;
    window.collapseExtraAdviserRoles(section.teachers);
    const kept = (Array.isArray(section.teachers) ? section.teachers : []).find(teacher => teacher && teacher.role === 'Adviser') || null;
    return window.applyCanonicalAdviserToSection(section, kept);
};

window.enforceSingleAdviserOnStoredSections = function () {
    if (typeof getStoredJson !== 'function' || typeof saveStoredJson !== 'function') return;
    const sections = getStoredJson(SECTIONS_STORAGE_KEY, []);
    if (!Array.isArray(sections)) return;
    let changed = false;
    const groups = new Map();
    sections.forEach((section, index) => {
        if (!section) return;
        if (window.collapseExtraAdviserRoles(section.teachers)) changed = true;
        const key = window.sectionAdviserGroupKey(section);
        if (!key) {
            if (window.normalizeSectionSingleAdviser(section)) changed = true;
            return;
        }
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push({ section, index });
    });
    groups.forEach((entries) => {
        const advisers = [];
        entries.forEach(({ section, index }) => {
            const adviser = (Array.isArray(section.teachers) ? section.teachers : []).find(teacher => teacher && teacher.role === 'Adviser');
            if (!adviser) return;
            advisers.push({
                adviser,
                created: Date.parse(section.createdAt || '') || index
            });
        });
        const distinct = [];
        advisers.forEach((item) => {
            if (!distinct.some(existing => window.sameSectionTeacher(existing.adviser, item.adviser))) distinct.push(item);
        });
        distinct.forEach((item) => {
            item.coverage = entries.filter(({ section }) => {
                const teachers = Array.isArray(section.teachers) ? section.teachers : [];
                return teachers.some(teacher => window.sameSectionTeacher(teacher, item.adviser));
            }).length;
        });
        distinct.sort((a, b) => (b.coverage - a.coverage) || (a.created - b.created));
        const canonical = distinct[0] ? distinct[0].adviser : null;
        entries.forEach(({ section }) => {
            if (window.applyCanonicalAdviserToSection(section, canonical)) changed = true;
        });
    });
    if (changed) saveStoredJson(SECTIONS_STORAGE_KEY, sections);
};

window.syncSectionAdviserRoleSelect = function () {
    const roleSelect = document.getElementById('section-subpage-teacher-role');
    if (!roleSelect) return;
    const adviserOption = roleSelect.querySelector('option[value="Adviser"]');
    if (!adviserOption) return;
    const replaceIndex = (window.teacherSubpageReplaceIndex !== null && window.teacherSubpageReplaceIndex !== undefined)
        ? window.teacherSubpageReplaceIndex
        : null;
    const staged = (window.stagedSectionTeachers && window.stagedSectionTeachers[0]) || null;
    const blocked = window.sectionHasDifferentAdviser(staged, replaceIndex);
    adviserOption.disabled = blocked;
    adviserOption.textContent = blocked ? 'Adviser unavailable' : 'Adviser';
    roleSelect.title = blocked
        ? 'This grade and school year already has an adviser for this section.'
        : '';
    if (blocked && roleSelect.value === 'Adviser') {
        roleSelect.value = 'Teacher';
        if (staged) staged.role = 'Teacher';
    }
};

window.setSectionTeacherRole = function (index, role) {
    if (!window.selectedSectionTeachers || !window.selectedSectionTeachers[index]) return;
    const normalizedRole = (role === 'Adviser') ? 'Adviser' : 'Teacher';
    const teacher = window.selectedSectionTeachers[index];
    document.querySelectorAll('.teacher-dropdown-menu').forEach(menu => menu.classList.add('hidden'));
    if (normalizedRole === 'Adviser' && window.sectionHasDifferentAdviser(teacher, index)) {
        window.notifySingleAdviserLimit();
        return;
    }
    teacher.role = normalizedRole;
    const primary = window.selectedSectionTeachers.find(t => t.isPrimary) || window.selectedSectionTeachers[0];
    const roleInput = document.getElementById('edit-section-role');
    if (roleInput) roleInput.value = primary ? primary.role : 'Teacher';
    window.renderAssignSectionOverview();
};

window.changeSectionTeacher = function (index) {
    window.teacherSubpageReplaceIndex = index;
    const target = window.selectedSectionTeachers[index];
    if (target) {
        const roleSelect = document.getElementById('section-subpage-teacher-role');
        if (roleSelect) roleSelect.value = target.role || 'Teacher';
    }
    window.openSectionSubpage('teacher', true);
};

window.removeSectionTeacherIndex = function (index) {
    if (!window.selectedSectionTeachers) return;
    const wasPrimary = window.selectedSectionTeachers[index]?.isPrimary;
    window.selectedSectionTeachers.splice(index, 1);
    if (wasPrimary && window.selectedSectionTeachers.length > 0) {
        window.selectedSectionTeachers[0].isPrimary = true;
    }
    const primary = window.selectedSectionTeachers.find(t => t.isPrimary) || window.selectedSectionTeachers[0];
    const teacherInput = document.getElementById('edit-section-teacher');
    const roleInput = document.getElementById('edit-section-role');
    if (teacherInput) teacherInput.value = primary ? primary.name : '';
    if (roleInput) roleInput.value = primary ? primary.role : 'Teacher';
    window.renderAssignSectionOverview();
};

const SECTION_STEP_CHECK_SVG = `<svg class="w-3 h-3 text-white" style="width:12px;height:12px;display:block;" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 7.75L6.5 10.75L12.5 4.75"/></svg>`;

function setSectionStepBadgeState(el, state, stepNum) {
    if (!el) return;
    if (state === 'completed') {
        el.className = 'w-6 h-6 rounded-full bg-[#15803d] text-white flex items-center justify-center font-[\'Inter\'] transition-colors shrink-0';
        el.style.backgroundColor = '#15803d';
        el.innerHTML = SECTION_STEP_CHECK_SVG;
    } else if (state === 'locked') {
        el.className = 'w-6 h-6 rounded-full bg-black/10 text-black/40 text-xs font-bold flex items-center justify-center font-[\'Inter\'] transition-colors shrink-0';
        el.style.backgroundColor = '';
        el.textContent = String(stepNum);
    } else {
        el.className = 'w-6 h-6 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center font-[\'Inter\'] transition-colors shrink-0';
        el.style.backgroundColor = '';
        el.textContent = String(stepNum);
    }
}

window.renderAssignSectionOverview = function () {
    const teacherDisplay = document.getElementById('section-assigned-teacher-display');
    const subjectDisplay = document.getElementById('section-assigned-subject-display');
    const studentsDisplay = document.getElementById('section-assigned-students-display');
    const studentsCountEl = document.getElementById('section-assigned-students-count');

    // 0. Update Section Context Banner
    const nameVal = document.getElementById('edit-section-name')?.value.trim() || '—';
    const gradeVal = document.getElementById('edit-section-grade')?.value.trim() || '—';
    const roomVal = document.getElementById('edit-section-room')?.value.trim() || '—';
    const syVal = document.getElementById('edit-section-school-year')?.value.trim() || '—';
    const ctxName = document.getElementById('section-context-name');
    const ctxGrade = document.getElementById('section-context-grade');
    const ctxRoom = document.getElementById('section-context-room');
    const ctxSy = document.getElementById('section-context-sy');
    if (ctxName) ctxName.innerHTML = `<b>Section:</b> ${escapeHtml(nameVal)}`;
    if (ctxGrade) ctxGrade.innerHTML = `<b>Grade:</b> ${escapeHtml(gradeVal)}`;
    if (ctxRoom) ctxRoom.innerHTML = `<b>Room:</b> ${escapeHtml(roomVal)}`;
    if (ctxSy) ctxSy.innerHTML = `<b>SY:</b> ${escapeHtml(syVal)}`;

    // Core States
    const subjectName = (document.getElementById('edit-section-subject')?.value || window.stagedSectionSubject || '').trim();
    const isSubjectSet = !!subjectName;
    const activeScheduleDays = (window.selectedSectionDailySchedule || []).filter(d => d.active && d.startTime && d.endTime);
    const isScheduleSet = activeScheduleDays.length > 0;
    const teachersList = window.selectedSectionTeachers || [];
    const studentsList = window.selectedSectionStudents || [];

    // 1. Render Subject Overview (Step 1 - Always Unlocked)
    const assignSubjectHeaderBtn = document.getElementById('section-assign-subject-header-btn');
    const subjectStepNum = document.getElementById('section-subject-step-num');
    const subjectHeaderRow = document.getElementById('section-subject-header-row');
    const subjectTitle = document.getElementById('section-subject-title');
    const subjectSubtitle = document.getElementById('section-subject-subtitle');

    if (subjectHeaderRow) subjectHeaderRow.className = 'flex items-center justify-between pb-2 border-b-2 border-black transition-colors gap-3';
    if (subjectTitle) subjectTitle.className = 'text-base sm:text-[17px] font-bold text-black font-[\'Inter\'] tracking-tight transition-colors';
    if (subjectSubtitle) subjectSubtitle.setAttribute('style', 'color: rgba(0,0,0,0.45);');

    if (subjectStepNum) {
        if (isSubjectSet) {
            setSectionStepBadgeState(subjectStepNum, 'completed', 1);
        } else {
            setSectionStepBadgeState(subjectStepNum, 'active', 1);
        }
    }

    if (assignSubjectHeaderBtn) {
        assignSubjectHeaderBtn.classList.remove('opacity-40', 'cursor-not-allowed', 'pointer-events-none');
        assignSubjectHeaderBtn.classList.add('hover:text-[#FFD000]', 'cursor-pointer');
        assignSubjectHeaderBtn.removeAttribute('title');
        if (isSubjectSet) {
            assignSubjectHeaderBtn.innerHTML = `<i class="fa-solid fa-book text-base text-[#15803d]"></i> <span id="section-assign-subject-btn-text">Change Subject</span>`;
        } else {
            assignSubjectHeaderBtn.innerHTML = `<i class="fa-solid fa-book-medical text-base text-[#15803d]"></i> <span id="section-assign-subject-btn-text">Assign Subject</span>`;
        }
    }

    if (subjectDisplay) {
        if (isSubjectSet) {
            subjectDisplay.innerHTML = `
                <div class="divide-y divide-black/10 border-y border-black/10 border-x-0 rounded-none sigma-selected-faded-panel overflow-hidden">
                    <div class="p-4 hover:bg-black/[0.03] transition-colors flex items-center justify-between">
                        <div class="flex items-center gap-4 min-w-0">
                            <div class="w-10 h-10 rounded-full bg-[#15803d] text-white flex items-center justify-center font-bold text-sm shrink-0 border border-green-700/20">
                                <i class="fa-solid fa-book text-xs text-white"></i>
                            </div>
                            <p class="text-sm font-bold text-black tracking-tight truncate">${escapeHtml(subjectName)}</p>
                        </div>
                    </div>
                </div>
            `;
        } else {
            subjectDisplay.innerHTML = '';
        }
    }

    // 2. Render Class Schedule Overview (Step 2 - Unlocked once Subject is set)
    const scheduleDisplay = document.getElementById('section-assigned-schedule-display');
    const scheduleBadge = document.getElementById('section-assigned-schedule-badge');
    const assignScheduleHeaderBtn = document.getElementById('section-assign-schedule-header-btn');
    const scheduleStepNum = document.getElementById('section-schedule-step-num');
    const scheduleHeaderRow = document.getElementById('section-schedule-header-row');
    const scheduleTitle = document.getElementById('section-schedule-title');
    const scheduleSubtitle = document.getElementById('section-schedule-subtitle');
    const conflicts = (window.getScheduleSubpageConflicts && activeScheduleDays.length > 0) ? window.getScheduleSubpageConflicts(window.selectedSectionDailySchedule) : [];

    if (!isSubjectSet) {
        // Locked state
        if (scheduleHeaderRow) scheduleHeaderRow.className = 'flex items-center justify-between pb-2 border-b border-black/10 transition-colors gap-3';
        if (scheduleTitle) scheduleTitle.className = 'text-base sm:text-[17px] font-bold text-black/35 font-[\'Inter\'] tracking-tight transition-colors';
        if (scheduleSubtitle) scheduleSubtitle.setAttribute('style', 'color: rgba(0,0,0,0.25);');
        if (scheduleStepNum) {
            setSectionStepBadgeState(scheduleStepNum, 'locked', 2);
        }
        if (assignScheduleHeaderBtn) {
            assignScheduleHeaderBtn.classList.add('opacity-40', 'cursor-not-allowed', 'pointer-events-none');
            assignScheduleHeaderBtn.classList.remove('hover:text-[#FFD000]', 'cursor-pointer');
            assignScheduleHeaderBtn.setAttribute('title', 'Please assign Subject first');
            assignScheduleHeaderBtn.innerHTML = `<i class="fa-solid fa-lock text-sm mr-1.5 text-black-fade"></i> <span id="section-assign-schedule-btn-text" class="text-black-fade">Requires Subject</span>`;
        }
        if (scheduleBadge) scheduleBadge.textContent = '';
        if (scheduleDisplay) scheduleDisplay.innerHTML = '';
    } else {
        // Unlocked state
        if (scheduleHeaderRow) scheduleHeaderRow.className = 'flex items-center justify-between pb-2 border-b-2 border-black transition-colors gap-3';
        if (scheduleTitle) scheduleTitle.className = 'text-base sm:text-[17px] font-bold text-black font-[\'Inter\'] tracking-tight transition-colors';
        if (scheduleSubtitle) scheduleSubtitle.setAttribute('style', 'color: rgba(0,0,0,0.45);');
        if (assignScheduleHeaderBtn) {
            assignScheduleHeaderBtn.classList.remove('opacity-40', 'cursor-not-allowed', 'pointer-events-none');
            assignScheduleHeaderBtn.classList.add('hover:text-[#FFD000]', 'cursor-pointer');
            assignScheduleHeaderBtn.removeAttribute('title');
        }

        if (isScheduleSet) {
            if (scheduleStepNum) {
                setSectionStepBadgeState(scheduleStepNum, 'completed', 2);
            }
            if (assignScheduleHeaderBtn) {
                assignScheduleHeaderBtn.innerHTML = `<i class="fa-solid fa-calendar-days text-base text-[#15803d]"></i> <span id="section-assign-schedule-btn-text">Change Schedule</span>`;
            }
            if (scheduleBadge) {
                if (conflicts.length > 0) {
                    scheduleBadge.innerHTML = `<span class="text-rose-600 font-bold"><i class="fa-solid fa-triangle-exclamation"></i> Room Conflict</span>`;
                } else {
                    scheduleBadge.textContent = `${activeScheduleDays.length} active day${activeScheduleDays.length === 1 ? '' : 's'}`;
                }
            }

            if (scheduleDisplay) {
                let conflictBannerHtml = '';
                if (conflicts.length > 0) {
                    const uniqueSecs = [...new Set(conflicts.map(c => c.section.name))].join(', ');
                    conflictBannerHtml = `
                        <div class="mb-3 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
                            <i class="fa-solid fa-triangle-exclamation text-rose-600 mt-0.5 text-sm shrink-0"></i>
                            <div class="space-y-0.5">
                                <p class="text-xs font-bold text-rose-700">Room ${escapeHtml(document.getElementById('edit-section-room')?.value || '—')} Schedule Conflict</p>
                                <p class="text-xs text-rose-600 leading-relaxed">This room is already assigned to Section <strong>"${escapeHtml(uniqueSecs)}"</strong> during these hours. Please click <strong>"Change Schedule"</strong> to adjust hours or change the room.</p>
                            </div>
                        </div>
                    `;
                }

                const rowsHtml = activeScheduleDays.map((d) => {
                    const timeStr = formatSectionSchedule(d.startTime, d.endTime);
                    const dayConflict = conflicts.find(c => c.day === d.fullDay || c.day === d.day);

                    return `
                        <div class="p-4 hover:bg-black/[0.03] transition-colors flex items-center justify-between font-['Inter'] ${dayConflict ? 'bg-rose-50/50' : ''}">
                            <div class="flex items-center gap-4 min-w-0">
                                <div class="w-10 h-10 rounded-full ${dayConflict ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-[#15803d] text-white border-green-700/20'} flex items-center justify-center font-bold text-sm shrink-0 border">
                                    <i class="fa-solid fa-calendar-day text-xs ${dayConflict ? 'text-rose-600' : 'text-white'}"></i>
                                </div>
                                <div class="min-w-0">
                                    <div class="flex items-center gap-2">
                                        <p class="text-sm font-bold ${dayConflict ? 'text-rose-700' : 'text-black'} tracking-tight truncate">${escapeHtml(d.fullDay || d.day)}</p>
                                        ${dayConflict ? `<span class="text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded border border-rose-200">Conflict with "${escapeHtml(dayConflict.section.name)}"</span>` : ''}
                                    </div>
                                    <p class="text-xs font-medium mt-0.5 ${dayConflict ? 'text-rose-600' : ''}" style="${dayConflict ? '' : 'color: rgba(0,0,0,0.45);'}">${escapeHtml(timeStr)}</p>
                                </div>
                            </div>
                            <div class="flex items-center gap-3 shrink-0">
                                <span class="text-xs font-medium ${dayConflict ? 'text-rose-600' : ''}" style="${dayConflict ? '' : 'color: #15803d;'}">Room ${escapeHtml(document.getElementById('edit-section-room')?.value || '—')}</span>
                            </div>
                        </div>
                    `;
                }).join('');

                scheduleDisplay.innerHTML = `
                    ${conflictBannerHtml}
                    <div class="divide-y divide-black/10 border-y border-black/10 border-x-0 rounded-none sigma-selected-faded-panel overflow-hidden">
                        ${rowsHtml}
                    </div>
                `;
            }
        } else {
            if (scheduleStepNum) {
                setSectionStepBadgeState(scheduleStepNum, 'active', 2);
            }
            if (assignScheduleHeaderBtn) {
                assignScheduleHeaderBtn.innerHTML = `<i class="fa-solid fa-calendar-days text-base text-[#15803d]"></i> <span id="section-assign-schedule-btn-text">Assign Schedule</span>`;
            }
            if (scheduleBadge) scheduleBadge.textContent = '';
            if (scheduleDisplay) scheduleDisplay.innerHTML = '';
        }
    }

    // 3. Render Teachers Overview (Step 3)
    const assignTeacherHeaderBtn = document.getElementById('section-assign-teacher-header-btn');
    const teacherStepNum = document.getElementById('section-teacher-step-num');
    const teacherHeaderRow = document.getElementById('section-teacher-header-row');
    const teacherTitle = document.getElementById('section-teacher-title');
    const teacherSubtitle = document.getElementById('section-teacher-subtitle');
    const hasTeachers = teachersList.length > 0;

    if (!isScheduleSet) {
        // Schedule is not yet set
        if (hasTeachers) {
            // Teachers are already loaded (e.g. from Existing Section)
            if (teacherHeaderRow) teacherHeaderRow.className = 'flex items-center justify-between pb-2 border-b-2 border-black transition-colors gap-3';
            if (teacherTitle) teacherTitle.className = 'text-base sm:text-[17px] font-bold text-black font-[\'Inter\'] tracking-tight transition-colors';
            if (teacherSubtitle) teacherSubtitle.setAttribute('style', 'color: rgba(0,0,0,0.45);');
            setSectionStepBadgeState(teacherStepNum, 'completed', 3);
        } else {
            if (teacherHeaderRow) teacherHeaderRow.className = 'flex items-center justify-between pb-2 border-b border-black/10 transition-colors gap-3';
            if (teacherTitle) teacherTitle.className = 'text-base sm:text-[17px] font-bold text-black/35 font-[\'Inter\'] tracking-tight transition-colors';
            if (teacherSubtitle) teacherSubtitle.setAttribute('style', 'color: rgba(0,0,0,0.25);');
            setSectionStepBadgeState(teacherStepNum, 'locked', 3);
        }

        if (assignTeacherHeaderBtn) {
            assignTeacherHeaderBtn.classList.remove('hidden');
            assignTeacherHeaderBtn.classList.add('opacity-40', 'cursor-not-allowed', 'pointer-events-none');
            assignTeacherHeaderBtn.classList.remove('hover:text-[#FFD000]', 'cursor-pointer');
            assignTeacherHeaderBtn.setAttribute('title', 'Please assign Class Schedule first');
            assignTeacherHeaderBtn.innerHTML = `<i class="fa-solid fa-lock text-sm mr-1.5 text-black-fade"></i> <span id="section-assign-teacher-btn-text" class="text-black-fade">Requires Schedule</span>`;
        }
    } else {
        // Unlocked state
        if (teacherHeaderRow) teacherHeaderRow.className = 'flex items-center justify-between pb-2 border-b-2 border-black transition-colors gap-3';
        if (teacherTitle) teacherTitle.className = 'text-base sm:text-[17px] font-bold text-black font-[\'Inter\'] tracking-tight transition-colors';
        if (teacherSubtitle) teacherSubtitle.setAttribute('style', 'color: rgba(0,0,0,0.45);');
        if (hasTeachers) {
            setSectionStepBadgeState(teacherStepNum, 'completed', 3);
        } else {
            setSectionStepBadgeState(teacherStepNum, 'active', 3);
        }

        if (assignTeacherHeaderBtn) {
            assignTeacherHeaderBtn.classList.remove('hidden', 'opacity-40', 'cursor-not-allowed', 'pointer-events-none');
            assignTeacherHeaderBtn.classList.add('hover:text-[#FFD000]', 'cursor-pointer');
            assignTeacherHeaderBtn.removeAttribute('title');
            if (teachersList.length >= 2) {
                assignTeacherHeaderBtn.innerHTML = `<i class="fa-solid fa-users text-base text-[#15803d]"></i> <span id="section-assign-teacher-btn-text">Teachers (${teachersList.length})</span>`;
            } else if (hasTeachers) {
                assignTeacherHeaderBtn.innerHTML = `<i class="fa-solid fa-user-plus text-base text-[#15803d]"></i> <span id="section-assign-teacher-btn-text">Add Teacher</span>`;
            } else {
                assignTeacherHeaderBtn.innerHTML = `<i class="fa-solid fa-user-plus text-base text-[#15803d]"></i> <span id="section-assign-teacher-btn-text">Assign Teacher</span>`;
            }
        }
    }

    // Render Teachers List if any are present (even if loaded from Existing Section before schedule)
    if (teacherDisplay) {
        if (teachersList.length === 0) {
            teacherDisplay.innerHTML = '';
        } else {
            const rowsHtml = teachersList.map((t, idx) => {
                return `
                    <div class="p-4 hover:bg-black/[0.03] transition-colors flex items-center justify-between relative">
                        <div class="flex items-center gap-4 min-w-0">
                            ${renderUserAvatarHtml(t.name, 'w-10 h-10', 'text-sm')}
                            <div class="truncate">
                                <div class="flex items-center gap-3">
                                    <p class="text-sm font-bold text-black tracking-tight truncate">${escapeHtml(t.name)}</p>
                                    ${t.role === 'Adviser' ? '<span class="text-[11px] font-bold text-black bg-[#FFD000] px-2 py-0.5 rounded border border-black/10 tracking-tight font-[\'Inter\'] shrink-0">Adviser</span>' : ''}
                                </div>
                            </div>
                        </div>
                        <div class="relative flex items-center gap-2 shrink-0">
                            <button type="button" id="teacher-menu-btn-${idx}" onclick="window.toggleTeacherMenu(event, '${idx}')"
                                class="p-2 bg-transparent hover:bg-transparent text-black hover:text-[#FFD000] flex items-center justify-center transition-colors cursor-pointer group"
                                title="Options">
                                <i class="fa-solid fa-ellipsis-vertical text-base text-black group-hover:text-[#FFD000] transition-colors"></i>
                            </button>
                            <div id="teacher-menu-${idx}" class="teacher-dropdown-menu absolute right-0 top-full mt-1.5 w-52 bg-white border border-slate-200 rounded-xl shadow-2xl z-40 py-1.5 hidden animate-in fade-in duration-150 font-['Inter']">
                                ${t.role === 'Adviser' ? `
                                    <button type="button" onclick="window.setSectionTeacherRole(${idx}, 'Teacher')"
                                        class="w-full text-left px-4 py-2.5 text-xs font-semibold text-black hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer">
                                        <i class="fa-solid fa-chalkboard-user text-black text-xs"></i>
                                        <span>Set as Teacher</span>
                                    </button>
                                ` : (window.sectionHasDifferentAdviser(t, idx) ? `
                                    <button type="button" disabled
                                        class="w-full text-left px-4 py-2.5 text-xs font-semibold text-black/35 flex items-center gap-2.5 cursor-not-allowed"
                                        title="This grade and school year already has an adviser for this section">
                                        <i class="fa-solid fa-award text-black/35 text-xs"></i>
                                        <span>Assign as Section Adviser</span>
                                    </button>
                                ` : `
                                    <button type="button" onclick="window.setSectionTeacherRole(${idx}, 'Adviser')"
                                        class="w-full text-left px-4 py-2.5 text-xs font-semibold text-black hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer">
                                        <i class="fa-solid fa-award text-black text-xs"></i>
                                        <span>Assign as Section Adviser</span>
                                    </button>
                                `)}
                                <button type="button" onclick="window.changeSectionTeacher(${idx})"
                                    class="w-full text-left px-4 py-2.5 text-xs font-semibold text-black hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer">
                                    <i class="fa-solid fa-arrows-rotate text-black text-xs"></i>
                                    <span>Change</span>
                                </button>
                                <div class="border-t border-slate-100 my-1"></div>
                                <button type="button" onclick="window.removeSectionTeacherIndex(${idx})"
                                    class="w-full text-left px-4 py-2.5 text-xs font-semibold text-black hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer">
                                    <i class="fa-solid fa-trash-can text-black text-xs"></i>
                                    <span>Remove</span>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            teacherDisplay.innerHTML = `
                <div class="divide-y divide-black/10 border-y border-black/10 border-x-0 rounded-none sigma-selected-faded-panel overflow-visible">
                    ${rowsHtml}
                </div>
            `;
        }
    }

    // 4. Render Students Overview (Step 4)
    const count = studentsList.length;
    const assignStudentsHeaderBtn = document.getElementById('section-assign-students-header-btn');
    const studentsStepNum = document.getElementById('section-students-step-num');
    const studentsHeaderRow = document.getElementById('section-students-header-row');
    const studentsTitle = document.getElementById('section-students-title');
    const studentsSubtitle = document.getElementById('section-students-subtitle');
    const hasStudents = count > 0;

    if (studentsCountEl) {
        studentsCountEl.textContent = `${count} student${count === 1 ? '' : 's'}`;
    }

    if (!isScheduleSet) {
        // Schedule not yet set
        if (hasStudents) {
            // Students are already loaded (e.g. from Existing Section)
            if (studentsHeaderRow) studentsHeaderRow.className = 'flex items-center justify-between pb-2 border-b-2 border-black transition-colors gap-3';
            if (studentsTitle) studentsTitle.className = 'text-base sm:text-[17px] font-bold text-black font-[\'Inter\'] tracking-tight transition-colors';
            if (studentsSubtitle) studentsSubtitle.setAttribute('style', 'color: rgba(0,0,0,0.45);');
            if (studentsCountEl) studentsCountEl.setAttribute('style', 'color: rgba(0,0,0,0.45);');
            setSectionStepBadgeState(studentsStepNum, 'completed', 4);
        } else {
            if (studentsHeaderRow) studentsHeaderRow.className = 'flex items-center justify-between pb-2 border-b border-black/10 transition-colors gap-3';
            if (studentsTitle) studentsTitle.className = 'text-base sm:text-[17px] font-bold text-black/35 font-[\'Inter\'] tracking-tight transition-colors';
            if (studentsSubtitle) studentsSubtitle.setAttribute('style', 'color: rgba(0,0,0,0.25);');
            if (studentsCountEl) studentsCountEl.setAttribute('style', 'color: rgba(0,0,0,0.25);');
            setSectionStepBadgeState(studentsStepNum, 'locked', 4);
        }

        if (assignStudentsHeaderBtn) {
            assignStudentsHeaderBtn.classList.add('opacity-40', 'cursor-not-allowed', 'pointer-events-none');
            assignStudentsHeaderBtn.classList.remove('hover:text-[#FFD000]', 'cursor-pointer');
            assignStudentsHeaderBtn.setAttribute('title', 'Please assign Class Schedule first');
            assignStudentsHeaderBtn.innerHTML = `<i class="fa-solid fa-lock text-sm mr-1.5 text-black-fade"></i> <span id="section-assign-students-btn-text" class="text-black-fade">Requires Schedule</span>`;
        }
    } else {
        // Unlocked state
        if (studentsHeaderRow) studentsHeaderRow.className = 'flex items-center justify-between pb-2 border-b-2 border-black transition-colors gap-3';
        if (studentsTitle) studentsTitle.className = 'text-base sm:text-[17px] font-bold text-black font-[\'Inter\'] tracking-tight transition-colors';
        if (studentsSubtitle) studentsSubtitle.setAttribute('style', 'color: rgba(0,0,0,0.45);');
        if (studentsCountEl) studentsCountEl.setAttribute('style', 'color: rgba(0,0,0,0.45);');
        if (hasStudents) {
            setSectionStepBadgeState(studentsStepNum, 'completed', 4);
        } else {
            setSectionStepBadgeState(studentsStepNum, 'active', 4);
        }

        if (assignStudentsHeaderBtn) {
            assignStudentsHeaderBtn.classList.remove('opacity-40', 'cursor-not-allowed', 'pointer-events-none');
            assignStudentsHeaderBtn.classList.add('hover:text-[#FFD000]', 'cursor-pointer');
            assignStudentsHeaderBtn.removeAttribute('title');
            assignStudentsHeaderBtn.innerHTML = `<i class="fa-solid fa-user-plus text-base text-[#15803d]"></i> <span id="section-assign-students-btn-text">Assign Students</span>`;
        }
    }

    // Always render students roster if any are selected (even if loaded from existing section)
    if (studentsDisplay) {
        if (count === 0) {
            studentsDisplay.innerHTML = '';
        } else {
            const sorted = [...studentsList].sort((a, b) => {
                const nameA = `${a.lastName || ''}, ${a.firstName || ''}`.toLowerCase();
                const nameB = `${b.lastName || ''}, ${b.firstName || ''}`.toLowerCase();
                return nameA.localeCompare(nameB);
            });

            const rowsHtml = sorted.map((s) => renderStudentRosterItemHtml(s, 'window.removeSectionStudent', 'Remove Student', 'p-4', false)).join('');
            studentsDisplay.innerHTML = `
                <div class="divide-y divide-black/10 border-y border-black/10 border-x-0 rounded-none sigma-selected-faded-panel overflow-hidden">
                    ${rowsHtml}
                </div>
            `;
        }
    }

    window.validateSectionDeployment();
};

// Helper: Shared Component for Section Student Item Row
function renderStudentRosterItemHtml(student, removeHandlerFnName, removeTitle = 'Remove Student', paddingClass = 'p-3.5 sm:p-4', showRemove = true) {
    const displayName = student.name || `${student.lastName || ''}, ${student.firstName || ''}`.trim();
    const id = String(student.id || student.uid || '');
    return `
        <div class="${paddingClass} hover:bg-black/[0.03] transition-colors flex items-center justify-between font-['Inter']">
            <div class="flex items-center gap-4 min-w-0">
                ${renderUserAvatarHtml(student, 'w-10 h-10', 'text-sm')}
                <div class="min-w-0">
                    <p class="text-sm font-bold text-black tracking-tight truncate font-['Inter']">${escapeHtml(displayName)}</p>
                    ${id ? `<p class="text-xs font-medium mt-0.5" style="color: rgba(0,0,0,0.45);">ID: ${escapeHtml(id)}</p>` : ''}
                </div>
            </div>
            ${showRemove ? `
            <button type="button" onclick="${removeHandlerFnName}('${escapeHtml(id)}')"
                class="w-9 h-9 rounded-full bg-transparent hover:bg-black/5 text-black flex items-center justify-center transition-colors cursor-pointer shrink-0" title="${escapeHtml(removeTitle)}">
                <i class="fa-solid fa-xmark text-sm text-black"></i>
            </button>` : ''}
        </div>
    `;
}

// Helper: User avatar rendering is handled canonically by window.renderUserAvatarHtml in shared-components.js

// =============================================================
// SUBPAGE 1: ASSIGN TEACHER (SEARCH & SELECTED PANEL)
// =============================================================

// Helper: Check if a teacher has a schedule conflict with another section in the same School Year
window.getTeacherScheduleConflict = function (teacherName) {
    if (!teacherName) return null;
    const cleanName = teacherName.trim().toLowerCase();
    const schoolYear = document.getElementById('edit-section-school-year')?.value.trim();
    const scheduleList = window.stagedSectionDailySchedule || window.selectedSectionDailySchedule || [];
    const activeDays = scheduleList.filter(d => d.active && d.startTime && d.endTime);
    if (activeDays.length === 0) return null;

    const sections = getStoredJson(SECTIONS_STORAGE_KEY, []);
    const parseMins = (t) => {
        if (!t) return 0;
        const [h, m] = t.split(':');
        return (parseInt(h, 10) * 60) + parseInt(m || '0', 10);
    };

    for (const dayItem of activeDays) {
        const dStart = parseMins(dayItem.startTime);
        const dEnd = parseMins(dayItem.endTime);

        for (const s of sections) {
            if (window.isEditingSection && String(s.id) === String(window.currentEditingSectionId)) continue;
            if (s.status === 'Draft') continue;
            if (schoolYear && (s.schoolYear || '').trim() !== schoolYear) continue;

            const teachesThis = (s.teacher && s.teacher.trim().toLowerCase() === cleanName) ||
                (Array.isArray(s.teachers) && s.teachers.some(t => {
                    const name = typeof t === 'object' ? (t.name || '') : String(t);
                    return name.trim().toLowerCase() === cleanName;
                }));

            if (!teachesThis) continue;

            let sOccupies = false;
            let sStart = 0;
            let sEnd = 0;
            let sScheduleLabel = s.schedule || '';

            if (Array.isArray(s.dailySchedules)) {
                const matchDay = s.dailySchedules.find(sd => sd.day === dayItem.day && sd.active && sd.startTime && sd.endTime);
                if (matchDay) {
                    sOccupies = true;
                    sStart = parseMins(matchDay.startTime);
                    sEnd = parseMins(matchDay.endTime);
                    sScheduleLabel = `${matchDay.day} ${formatSectionSchedule(matchDay.startTime, matchDay.endTime)}`;
                }
            } else if (Array.isArray(s.days) && s.days.includes(dayItem.day) && s.startTime && s.endTime) {
                sOccupies = true;
                sStart = parseMins(s.startTime);
                sEnd = parseMins(s.endTime);
            }

            if (sOccupies && Math.max(dStart, sStart) < Math.min(dEnd, sEnd)) {
                return {
                    day: dayItem.fullDay || dayItem.day,
                    section: s,
                    scheduleLabel: sScheduleLabel
                };
            }
        }
    }
    return null;
};

// Helper: Check if a student has a schedule conflict or is already enrolled in another section in the same School Year
window.getStudentScheduleConflict = function (studentId) {
    if (!studentId) return null;
    const cleanId = String(studentId).trim();
    const schoolYear = document.getElementById('edit-section-school-year')?.value.trim();
    const scheduleList = window.stagedSectionDailySchedule || window.selectedSectionDailySchedule || [];
    const activeDays = scheduleList.filter(d => d.active && d.startTime && d.endTime);
    if (activeDays.length === 0) return null;

    const sections = getStoredJson(SECTIONS_STORAGE_KEY, []);
    const parseMins = (t) => {
        if (!t) return 0;
        const [h, m] = t.split(':');
        return (parseInt(h, 10) * 60) + parseInt(m || '0', 10);
    };

    for (const s of sections) {
        if (window.isEditingSection && String(s.id) === String(window.currentEditingSectionId)) continue;
        if (s.status === 'Draft') continue;
        if (schoolYear && (s.schoolYear || '').trim() !== schoolYear) continue;

        const isEnrolled = Array.isArray(s.students) && s.students.some(st => String(st.id || st.uid || '') === cleanId);
        if (!isEnrolled) continue;

        for (const dayItem of activeDays) {
            const dStart = parseMins(dayItem.startTime);
            const dEnd = parseMins(dayItem.endTime);

            let sOccupies = false;
            let sStart = 0;
            let sEnd = 0;
            let sScheduleLabel = s.schedule || '';

            if (Array.isArray(s.dailySchedules)) {
                const matchDay = s.dailySchedules.find(sd => sd.day === dayItem.day && sd.active && sd.startTime && sd.endTime);
                if (matchDay) {
                    sOccupies = true;
                    sStart = parseMins(matchDay.startTime);
                    sEnd = parseMins(matchDay.endTime);
                    sScheduleLabel = `${matchDay.day} ${formatSectionSchedule(matchDay.startTime, matchDay.endTime)}`;
                }
            } else if (Array.isArray(s.days) && s.days.includes(dayItem.day) && s.startTime && s.endTime) {
                sOccupies = true;
                sStart = parseMins(s.startTime);
                sEnd = parseMins(s.endTime);
            }

            if (sOccupies && Math.max(dStart, sStart) < Math.min(dEnd, sEnd)) {
                return {
                    day: dayItem.fullDay || dayItem.day,
                    section: s,
                    scheduleLabel: sScheduleLabel
                };
            }
        }
    }
    return null;
};

// Helper: Check if a subject has a grade level mismatch
window.getSubjectGradeMismatch = function (subjectName) {
    if (!subjectName) return null;
    const sectionGrade = document.getElementById('edit-section-grade')?.value || '';
    if (!sectionGrade) return null;

    const subjects = getStoredJson(SUBJECTS_STORAGE_KEY, []);
    const match = subjects.find(s => (s.name || '').trim().toLowerCase() === subjectName.trim().toLowerCase());
    if (match && match.gradeLevel && match.gradeLevel !== 'All' && match.gradeLevel !== sectionGrade) {
        return {
            sectionGrade: sectionGrade,
            subjectGrade: match.gradeLevel
        };
    }
    return null;
};

window.executeSubpageTeacherSearch = function () {
    const input = document.getElementById('section-subpage-teacher-search');
    const rawVal = input ? input.value : '';
    // Restrictions: Sanitize input and limit length
    const cleanQuery = String(rawVal || '').replace(/[^a-zA-Z0-9\s.\-']/g, '').slice(0, 50).trim();
    if (input && input.value !== cleanQuery && cleanQuery !== '') {
        input.value = cleanQuery;
    }

    // Teacher Restriction: Max 2 teachers per section
    const isReplacing = (window.teacherSubpageReplaceIndex !== null && window.teacherSubpageReplaceIndex !== undefined);
    if (!isReplacing && (window.selectedSectionTeachers || []).length >= 2) {
        const dropdown = document.getElementById('section-subpage-teacher-dropdown');
        if (dropdown) {
            dropdown.innerHTML = `
                <div class="p-4 text-center text-xs font-normal font-['Inter'] flex flex-col items-center justify-center gap-1.5 bg-red-50/70 border border-red-200 rounded-xl m-2">
                    <i class="fa-solid fa-circle-exclamation text-lg text-red-600 mb-0.5"></i>
                    <span class="text-sm font-normal text-red-600">Maximum Teachers Assigned (2/2)</span>
                    <span class="text-xs font-normal text-red-600 max-w-sm leading-relaxed">This section already has 2 teachers assigned. Please remove or click "Change" on an existing teacher below to assign another.</span>
                </div>`;
            dropdown.classList.remove('hidden');
        }
        return;
    }

    window.handleSubpageTeacherSearch(cleanQuery);
};

window.handleSubpageTeacherSearch = function (query = '') {
    const dropdown = document.getElementById('section-subpage-teacher-dropdown');
    if (!dropdown) return;

    const q = (query || '').toLowerCase().trim();
    const isReplacing = (window.teacherSubpageReplaceIndex !== null && window.teacherSubpageReplaceIndex !== undefined);
    const existingList = isReplacing
        ? (window.selectedSectionTeachers || []).filter((t, idx) => idx !== window.teacherSubpageReplaceIndex)
        : (window.selectedSectionTeachers || []);
    const assignedTeacherNames = new Set(
        existingList.map(t => (t.name || '').toLowerCase().trim())
    );

    const users = getStoredJson(USER_STORAGE_KEY, []);
    const teachers = users.filter(u => {
        const role = String(u.type || u.role || '').toLowerCase();
        const full = `${u.firstName || ''} ${u.lastName || ''}`.trim().toLowerCase();
        return (role.includes('teach') || role.includes('faculty') || role.includes('instructor')) && !assignedTeacherNames.has(full);
    });

    const filtered = q ? teachers.filter(t => {
        const full = `${t.firstName || ''} ${t.lastName || ''}`.toLowerCase();
        const uid = String(t.uid || t.id || '').toLowerCase();
        const email = String(t.email || '').toLowerCase();
        return full.includes(q) || uid.includes(q) || email.includes(q);
    }) : teachers;

    const teacherRows = filtered.length === 0
        ? `<div class="p-6 text-center font-['Inter']"><p class="sigma-empty-title">No Teachers Found</p>${q ? `<p class="sigma-empty-subtitle">No teachers match "${escapeHtml(query)}".</p>` : ''}</div>`
        : filtered.map(t => {
        const fullName = `${t.firstName || ''} ${t.lastName || ''}`.trim();
        const conflict = window.getTeacherScheduleConflict(fullName);

        return `
            <div onclick="window.selectSubpageTeacher('${escapeHtml(fullName)}', '${escapeHtml(t.uid || t.id || '')}')"
                class="p-4 hover:bg-black/[0.03] transition-colors flex items-center justify-between cursor-pointer font-['Inter'] ${conflict ? 'bg-rose-50/50' : ''}">
                <div class="flex items-center gap-4 min-w-0">
                    ${renderUserAvatarHtml(t, 'w-10 h-10', 'text-sm')}
                    <div class="min-w-0">
                        <div class="flex items-center gap-2 truncate">
                            <p class="text-sm font-bold text-black tracking-tight truncate">${escapeHtml(fullName)}</p>
                            ${conflict ? `<span class="text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded border border-rose-200">Not Available</span>` : ''}
                        </div>
                        <p class="text-xs font-medium mt-0.5" style="color: rgba(0,0,0,0.45);">ID: ${escapeHtml(t.uid || t.id || '—')}${conflict ? ` • Teaching Section "${escapeHtml(conflict.section.name)}" (${escapeHtml(conflict.scheduleLabel)})` : ''}</p>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    dropdown.innerHTML = `
        <div class="divide-y divide-black/10 border-y border-black/10 border-x-0 rounded-none sigma-selected-faded-panel overflow-hidden">
            ${teacherRows}
        </div>
    `;

    dropdown.classList.remove('hidden');
};

window.selectSubpageTeacher = function (fullName, id = '') {
    const conflict = window.getTeacherScheduleConflict(fullName);
    if (conflict) {
        const msg = `Teacher Schedule Conflict: ${fullName} is already assigned to teach Section "${conflict.section.name}" on ${conflict.day} (${conflict.scheduleLabel}). A teacher cannot teach two sections at the same time. Please select another teacher or adjust the schedule.`;
        if (typeof window.showAlertDialog === 'function') {
            window.showAlertDialog('Teacher Conflict Detected', msg);
        } else {
            alert(msg);
        }
        return;
    }

    const roleSelect = document.getElementById('section-subpage-teacher-role');
    const currentRole = (roleSelect?.value === 'Adviser') ? 'Adviser' : 'Teacher';
    const searchInput = document.getElementById('section-subpage-teacher-search');
    const dropdown = document.getElementById('section-subpage-teacher-dropdown');

    const allAdminUsers = (typeof getStoredJson === 'function') ? getStoredJson(USER_STORAGE_KEY, []) : [];
    const cleanFn = fullName.toLowerCase().trim();
    const matchedTeacherUser = allAdminUsers.find(u => {
        const uFull = (u.fullName || u.name || `${u.firstName || ''} ${u.lastName || ''}`).toLowerCase().trim();
        const uRev = `${u.lastName || ''}, ${u.firstName || ''}`.toLowerCase().trim();
        return uFull === cleanFn || uRev === cleanFn || uFull.includes(cleanFn) || cleanFn.includes(uFull);
    });

    const isReplacing = (window.teacherSubpageReplaceIndex !== null && window.teacherSubpageReplaceIndex !== undefined);
    const wasPrimary = isReplacing
        ? window.selectedSectionTeachers?.[window.teacherSubpageReplaceIndex]?.isPrimary
        : (!window.selectedSectionTeachers || window.selectedSectionTeachers.length === 0);

    const teacherObj = {
        id: matchedTeacherUser?.uid || matchedTeacherUser?.id || id || '',
        uid: matchedTeacherUser?.uid || matchedTeacherUser?.id || id || '',
        name: fullName,
        role: currentRole,
        email: matchedTeacherUser?.email || '',
        isPrimary: wasPrimary !== undefined ? wasPrimary : false
    };

    window.stagedSectionTeachers = [teacherObj];

    if (searchInput) searchInput.value = '';
    if (dropdown) dropdown.classList.add('hidden');

    window.syncSectionAdviserRoleSelect();
    window.renderSubpageTeacherSelectedPanel();
};

window.renderSubpageTeacherSelectedPanel = function () {
    const panel = document.getElementById('section-subpage-teacher-selected-panel');
    const confirmBtn = document.getElementById('section-subpage-confirm-btn');
    const confirmLabel = document.getElementById('section-subpage-confirm-label');
    const isReplacing = (window.teacherSubpageReplaceIndex !== null && window.teacherSubpageReplaceIndex !== undefined);

    let displayList = [];
    if (isReplacing) {
        if (window.stagedSectionTeachers && window.stagedSectionTeachers.length > 0) {
            displayList = [{ ...window.stagedSectionTeachers[0], _actualIdx: window.teacherSubpageReplaceIndex }];
        }
    } else {
        displayList = (window.stagedSectionTeachers || []).map((t, i) => ({ ...t, _actualIdx: i }));
    }

    const count = displayList.length;

    if (!panel) return;

    if (count === 0 || window.activeSectionSubpage !== 'teacher') {
        panel.innerHTML = '';
        panel.classList.add('hidden');
        if (confirmBtn && window.activeSectionSubpage === 'teacher') {
            confirmBtn.disabled = true;
            confirmBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
        return;
    }

    if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        if (confirmLabel) {
            confirmLabel.textContent = isReplacing ? 'Change Teacher' : 'Select Teacher';
        }
    }

    const users = getStoredJson(USER_STORAGE_KEY, []);
    const teacher = displayList[0];
    const matched = users.find(u => `${u.firstName || ''} ${u.lastName || ''}`.trim() === teacher.name);
    const roleLabel = teacher.role === 'Adviser' ? 'Adviser' : '';

    panel.classList.remove('hidden');
    panel.innerHTML = `
        <div class="flex items-center gap-2 min-w-0 h-10 pl-1.5 pr-1 rounded-xl bg-slate-50 border border-slate-200" title="${escapeHtml(teacher.name)}">
            ${renderUserAvatarHtml(matched || teacher.name, 'w-7 h-7', 'text-[10px]')}
            <p class="text-sm font-bold text-black tracking-tight truncate font-['Inter']">${escapeHtml(teacher.name)}</p>
            ${roleLabel ? '<span class="text-[11px] font-bold text-black bg-[#FFD000] px-2 py-0.5 rounded border border-black/10 tracking-tight font-[\'Inter\'] shrink-0">Adviser</span>' : ''}
            <button type="button" onclick="window.clearSubpageTeacherSelection()"
                class="w-8 h-8 rounded-full bg-transparent hover:bg-black/5 text-black flex items-center justify-center transition-colors cursor-pointer shrink-0" title="Remove Teacher">
                <i class="fa-solid fa-xmark text-sm text-black"></i>
            </button>
        </div>
    `;
};

window.clearSubpageTeacherSelection = function () {
    window.stagedSectionTeachers = [];
    window.renderSubpageTeacherSelectedPanel();
};

window.setSectionPrimaryTeacherInSubpage = function (index) {
    if (!window.stagedSectionTeachers || !window.stagedSectionTeachers[index]) return;
    window.stagedSectionTeachers.forEach((t, i) => {
        t.isPrimary = (i === index);
    });
    window.renderSubpageTeacherSelectedPanel();
};

window.setTeacherSubpageRole = function (index, role) {
    if (!window.stagedSectionTeachers || !window.stagedSectionTeachers[index]) return;
    const normalizedRole = (role === 'Adviser') ? 'Adviser' : 'Teacher';
    const replaceIndex = (window.teacherSubpageReplaceIndex !== null && window.teacherSubpageReplaceIndex !== undefined)
        ? window.teacherSubpageReplaceIndex
        : null;
    if (normalizedRole === 'Adviser' && window.sectionHasDifferentAdviser(window.stagedSectionTeachers[index], replaceIndex)) {
        window.syncSectionAdviserRoleSelect();
        window.notifySingleAdviserLimit();
        return;
    }
    window.stagedSectionTeachers[index].role = normalizedRole;
    const roleSelect = document.getElementById('section-subpage-teacher-role');
    if (roleSelect) roleSelect.value = normalizedRole;
    window.renderSubpageTeacherSelectedPanel();
};

window.removeSectionTeacherInSubpage = function (index) {
    if (!window.stagedSectionTeachers) return;
    const wasPrimary = window.stagedSectionTeachers[index]?.isPrimary;
    window.stagedSectionTeachers.splice(index, 1);
    if (wasPrimary && window.stagedSectionTeachers.length > 0) {
        window.stagedSectionTeachers[0].isPrimary = true;
    }
    window.renderSubpageTeacherSelectedPanel();
};

window.updateTeacherSubpageRole = function (role) {
    const hiddenRole = document.getElementById('edit-section-role');
    const normalizedRole = (role === 'Adviser') ? 'Adviser' : 'Teacher';
    const replaceIndex = (window.teacherSubpageReplaceIndex !== null && window.teacherSubpageReplaceIndex !== undefined)
        ? window.teacherSubpageReplaceIndex
        : null;
    const targetIdx = (replaceIndex !== null)
        ? 0
        : ((window.stagedSectionTeachers && window.stagedSectionTeachers.length > 0) ? window.stagedSectionTeachers.length - 1 : -1);
    const candidate = (targetIdx >= 0 && window.stagedSectionTeachers) ? window.stagedSectionTeachers[targetIdx] : null;
    if (normalizedRole === 'Adviser' && window.sectionHasDifferentAdviser(candidate, replaceIndex)) {
        const roleSelect = document.getElementById('section-subpage-teacher-role');
        if (roleSelect) roleSelect.value = 'Teacher';
        window.syncSectionAdviserRoleSelect();
        window.notifySingleAdviserLimit();
        return;
    }
    if (hiddenRole) hiddenRole.value = normalizedRole;
    if (candidate) candidate.role = normalizedRole;
    window.renderSubpageTeacherSelectedPanel();
};

// =============================================================
// SUBPAGE 2: ASSIGN SUBJECT (SEARCH & SELECTED PANEL)
// =============================================================

window.isSubjectAlreadyAssignedToSection = function (subjectName) {
    if (!subjectName) return false;
    const name = document.getElementById('edit-section-name')?.value.trim();
    const grade = document.getElementById('edit-section-grade')?.value;
    const schoolYear = document.getElementById('edit-section-school-year')?.value;
    if (!name || !grade || !schoolYear) return false;

    const sections = getStoredJson(SECTIONS_STORAGE_KEY, []);
    return sections.some(s => {
        if (window.isEditingSection && String(s.id) === String(window.currentEditingSectionId)) return false;
        if (s.status === 'Draft') return false;
        const sameName = (s.name || '').trim().toLowerCase() === name.toLowerCase();
        const sameGrade = (s.gradeLevel || s.grade || '').trim().toLowerCase() === grade.toLowerCase();
        const sameSY = (s.schoolYear || '').trim().toLowerCase() === schoolYear.toLowerCase();
        const sameSub = (s.subject || '').trim().toLowerCase() === subjectName.trim().toLowerCase();
        return sameName && sameGrade && sameSY && sameSub;
    });
};

window.executeSubpageSubjectSearch = function () {
    const input = document.getElementById('section-subpage-subject-search');
    const rawVal = input ? input.value : '';
    // Restrictions: Sanitize input and limit length
    const cleanQuery = String(rawVal || '').replace(/[^a-zA-Z0-9\s.\-']/g, '').slice(0, 50).trim();
    if (input && input.value !== cleanQuery && cleanQuery !== '') {
        input.value = cleanQuery;
    }

    window.handleSubpageSubjectSearch(cleanQuery);
};

window.handleSubpageSubjectSearch = function (query = '') {
    const dropdown = document.getElementById('section-subpage-subject-dropdown');
    if (!dropdown) return;

    const q = (query || '').toLowerCase().trim();
    const currentSelectedSubject = (window.stagedSectionSubject || '').toLowerCase().trim();
    const sectionGrade = document.getElementById('edit-section-grade')?.value || '';
    const subjects = getStoredJson(SUBJECTS_STORAGE_KEY, []);

    // Allow published or active subjects (default to published)
    const publishedSubjects = subjects.filter(s => {
        const status = String(s.status || 'published').toLowerCase().trim();
        return status === 'published' || status === 'active';
    });
    const unassignedSubjects = publishedSubjects.filter(s => (s.name || '').toLowerCase().trim() !== currentSelectedSubject);

    const filtered = q ? unassignedSubjects.filter(s => {
        const name = (s.name || '').toLowerCase();
        const code = (s.code || '').toLowerCase();
        return name.includes(q) || code.includes(q);
    }) : unassignedSubjects;

    if (filtered.length === 0) {
        dropdown.innerHTML = `
            <div class="divide-y divide-black/10 border-y border-black/10 border-x-0 rounded-none sigma-selected-faded-panel overflow-hidden">
                <div class="p-6 text-center font-['Inter'] flex flex-col items-center justify-center gap-1.5">
                    <i class="fa-solid fa-file-circle-exclamation sigma-empty-icon" aria-hidden="true"></i>
                    <p class="sigma-empty-title">No Published Subjects Found</p>
                    <p class="sigma-empty-subtitle">Only subjects with "Published" status can be assigned to sections.</p>
                </div>
            </div>`;
        dropdown.classList.remove('hidden');
        return;
    }

    // Sort: matching section grade first
    filtered.sort((a, b) => {
        const matchA = (a.gradeLevel === sectionGrade || a.gradeLevel === 'All') ? 1 : 0;
        const matchB = (b.gradeLevel === sectionGrade || b.gradeLevel === 'All') ? 1 : 0;
        return matchB - matchA;
    });

    dropdown.innerHTML = filtered.map(s => {
        const isMismatch = (sectionGrade && s.gradeLevel && s.gradeLevel !== 'All' && s.gradeLevel !== sectionGrade);
        const isAlreadyAssigned = window.isSubjectAlreadyAssignedToSection ? window.isSubjectAlreadyAssignedToSection(s.name) : false;
        
        let statusBadge = '';
        if (isAlreadyAssigned) {
            const secName = document.getElementById('edit-section-name')?.value.trim() || 'this Section';
            statusBadge = `<span class="text-xs font-semibold text-rose-600 flex items-center gap-1.5 shrink-0 font-['Inter']"><i class="fa-solid fa-circle-exclamation text-xs text-rose-600"></i>Already Assigned to Section ${escapeHtml(secName)}</span>`;
        } else if (s.gradeLevel) {
            statusBadge = isMismatch ? `<span class="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">${escapeHtml(s.gradeLevel)}</span>` : `<span class="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">${escapeHtml(s.gradeLevel)}</span>`;
        }

        return `
            <div onclick="window.selectSubpageSubject('${escapeHtml(s.name)}')"
                class="p-4 hover:bg-black/[0.03] transition-colors flex items-center justify-between cursor-pointer font-['Inter'] ${isAlreadyAssigned ? 'bg-rose-50/50' : ''}">
                <div class="flex items-center gap-4 min-w-0">
                    <div class="w-10 h-10 rounded-full ${isAlreadyAssigned ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-slate-100 text-black border-slate-200/60'} flex items-center justify-center font-bold text-sm shrink-0 border">
                        <i class="fa-solid fa-book text-xs ${isAlreadyAssigned ? 'text-rose-600' : 'text-black'}"></i>
                    </div>
                    <div class="min-w-0">
                        <div class="flex items-center gap-2 truncate">
                            <p class="text-sm font-bold text-black tracking-tight truncate">${escapeHtml(s.name)}</p>
                            ${statusBadge}
                        </div>
                        <p class="text-xs font-medium mt-0.5" style="color: rgba(0,0,0,0.45);">Code: ${escapeHtml(s.code || '—')}${isMismatch ? ` • Recommended for ${escapeHtml(s.gradeLevel)}` : ''}</p>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    dropdown.innerHTML = `
        <div class="divide-y divide-black/10 border-y border-black/10 border-x-0 rounded-none sigma-selected-faded-panel overflow-hidden">
            ${dropdown.innerHTML}
        </div>
    `;

    dropdown.classList.remove('hidden');
};

window.selectSubpageSubject = function (subjectName) {
    if (window.isSubjectAlreadyAssignedToSection && window.isSubjectAlreadyAssignedToSection(subjectName)) {
        const secName = document.getElementById('edit-section-name')?.value.trim() || 'This section';
        const secGrade = document.getElementById('edit-section-grade')?.value || '';
        const secSY = document.getElementById('edit-section-school-year')?.value || '';
        const msg = `Subject Conflict: A class for "${subjectName}" already exists in Section "${secName}" (${secGrade}, S.Y. ${secSY}). Please select a different subject.`;
        if (typeof window.showAlertDialog === 'function') {
            window.showAlertDialog('Subject Already Assigned', msg);
        } else {
            alert(msg);
        }
        return;
    }

    const mismatch = window.getSubjectGradeMismatch(subjectName);
    if (mismatch) {
        const msg = `Grade Level Mismatch: "${subjectName}" is configured for ${mismatch.subjectGrade}, but this section is ${mismatch.sectionGrade}. Are you sure you want to assign this subject to this section?`;
        if (typeof window.showSectionConfirm === 'function') {
            window.showSectionConfirm('Grade Level Mismatch', msg, () => {
                window.stagedSectionSubject = subjectName;
                const searchInput = document.getElementById('section-subpage-subject-search');
                const dropdown = document.getElementById('section-subpage-subject-dropdown');
                if (searchInput) searchInput.value = '';
                if (dropdown) dropdown.classList.add('hidden');
                window.renderSubpageSubjectSelectedPanel();
            });
            return;
        }
    }

    window.stagedSectionSubject = subjectName;
    const searchInput = document.getElementById('section-subpage-subject-search');
    const dropdown = document.getElementById('section-subpage-subject-dropdown');

    if (searchInput) searchInput.value = '';
    if (dropdown) dropdown.classList.add('hidden');

    window.renderSubpageSubjectSelectedPanel();
};

window.renderSubpageSubjectSelectedPanel = function () {
    const panel = document.getElementById('section-subpage-subject-selected-panel');
    const subjectName = window.stagedSectionSubject || '';
    const confirmBtn = document.getElementById('section-subpage-confirm-btn');

    if (!panel) return;

    if (!subjectName || window.activeSectionSubpage !== 'subject') {
        panel.innerHTML = '';
        panel.classList.add('hidden');
        if (confirmBtn && window.activeSectionSubpage === 'subject') {
            confirmBtn.disabled = true;
            confirmBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
        return;
    }

    if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }

    const mismatch = window.getSubjectGradeMismatch(subjectName);
    const subjects = getStoredJson(SUBJECTS_STORAGE_KEY, []);
    const subObj = subjects.find(s => (s.name || '').toLowerCase().trim() === subjectName.toLowerCase().trim());
    const codeText = subObj?.code ? subObj.code : '';

    panel.classList.remove('hidden');
    panel.innerHTML = `
        <div class="flex items-center gap-2 min-w-0 h-10 pl-3 pr-1 rounded-xl bg-slate-50 border border-slate-200" title="${escapeHtml(subjectName)}${codeText ? ` (${codeText})` : ''}">
            <i class="fa-solid fa-book text-xs text-[#15803d] shrink-0"></i>
            <p class="text-sm font-bold text-black tracking-tight truncate font-['Inter']">${escapeHtml(subjectName)}</p>
            ${codeText ? `<span class="text-xs font-semibold text-black/45 shrink-0 font-['Inter']">${escapeHtml(codeText)}</span>` : ''}
            ${mismatch ? `<i class="fa-solid fa-triangle-exclamation text-xs text-amber-700 shrink-0" title="Configured for ${escapeHtml(mismatch.subjectGrade)} (Section is ${escapeHtml(mismatch.sectionGrade)})"></i>` : ''}
            <button type="button" onclick="window.clearSubpageSubjectSelection()"
                class="w-8 h-8 rounded-full bg-transparent hover:bg-black/5 text-black flex items-center justify-center transition-colors cursor-pointer shrink-0" title="Remove Subject">
                <i class="fa-solid fa-xmark text-sm text-black"></i>
            </button>
        </div>
    `;
};

window.clearSubpageSubjectSelection = function () {
    window.stagedSectionSubject = '';
    window.renderSubpageSubjectSelectedPanel();
};

window.removeAssignedSubject = function () {
    const subjectInput = document.getElementById('edit-section-subject');
    if (subjectInput) subjectInput.value = '';
    window.renderAssignSectionOverview();
};

// =============================================================
// SUBPAGE 3: ASSIGN STUDENTS (SEARCH & ROSTER PANEL)
// =============================================================

window.executeSubpageStudentsSearch = function () {
    const input = document.getElementById('section-subpage-students-search');
    const rawVal = input ? input.value : '';
    // Restrictions: Sanitize input and limit length
    const cleanQuery = String(rawVal || '').replace(/[^a-zA-Z0-9\s.\-']/g, '').slice(0, 50).trim();
    if (input && input.value !== cleanQuery && cleanQuery !== '') {
        input.value = cleanQuery;
    }

    window.handleSubpageStudentsSearch(cleanQuery);
};

window.handleSubpageStudentsSearch = function (query = '') {
    const dropdown = document.getElementById('section-subpage-students-dropdown');
    if (!dropdown) return;

    const q = (query || '').toLowerCase().trim();
    const assignedIdSet = new Set((window.stagedSectionStudents || []).map(s => String(s.id || s.uid)));

    const users = getStoredJson(USER_STORAGE_KEY, []);
    const students = users.filter(u => {
        const r = String(u.role || u.type || '').toLowerCase().trim();
        const isStudent = (r.includes('student') || r.startsWith('stud'));
        const uid = String(u.uid || u.id || '');
        return isStudent && !assignedIdSet.has(uid);
    });

    const filtered = q ? students.filter(s => {
        const fname = String(s.firstName || s.firstname || '').toLowerCase();
        const lname = String(s.lastName || s.lastname || '').toLowerCase();
        const full = String(s.fullName || '').toLowerCase();
        const sid = String(s.uid || s.id || '').toLowerCase();
        const email = String(s.email || '').toLowerCase();
        return fname.includes(q) || lname.includes(q) || full.includes(q) || sid.includes(q) || email.includes(q);
    }) : students;

    const studentRows = filtered.length === 0
        ? `<div class="p-6 text-center font-['Inter']"><p class="sigma-empty-title">No Students Found</p>${q ? `<p class="sigma-empty-subtitle">No students match "${escapeHtml(query)}".</p>` : ''}</div>`
        : filtered.map(s => {
        const id = String(s.uid || s.id || '');
        const lastName = s.lastName || s.lastname || '';
        const firstName = s.firstName || s.firstname || '';
        const fullName = `${lastName}, ${firstName}`.trim().replace(/^,|,$/g, '');
        const conflict = window.getStudentScheduleConflict(id);

        return `
            <div onclick="window.addSubpageStudent('${escapeHtml(id)}')"
                class="p-4 hover:bg-black/[0.03] transition-colors flex items-center justify-between cursor-pointer font-['Inter'] ${conflict ? 'bg-rose-50/50' : ''}">
                <div class="flex items-center gap-4 min-w-0">
                    ${renderUserAvatarHtml(s, 'w-10 h-10', 'text-sm')}
                    <div class="min-w-0">
                        <div class="flex items-center gap-2 truncate">
                            <p class="text-sm font-bold ${conflict ? 'text-rose-700' : 'text-black'} tracking-tight truncate">${escapeHtml(fullName)}</p>
                            ${conflict ? `<span class="text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded border border-rose-200">Already Enrolled</span>` : ''}
                        </div>
                        <p class="text-xs font-medium mt-0.5" style="color: rgba(0,0,0,0.45);">ID: ${escapeHtml(id)}${conflict ? ` • In Section "${escapeHtml(conflict.section.name)}" (${escapeHtml(conflict.scheduleLabel)})` : ''}</p>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    dropdown.innerHTML = `
        <div class="divide-y divide-black/10 border-y border-black/10 border-x-0 rounded-none sigma-selected-faded-panel overflow-hidden">
            ${studentRows}
        </div>
    `;

    dropdown.classList.remove('hidden');
};

window.addSubpageStudent = function (studentId) {
    const id = String(studentId);
    const conflict = window.getStudentScheduleConflict(id);
    if (conflict) {
        const users = getStoredJson(USER_STORAGE_KEY, []);
        const st = users.find(u => String(u.uid || u.id) === id);
        const name = st ? `${st.lastName || ''}, ${st.firstName || ''}` : 'This student';
        const msg = `Student Schedule Conflict: ${name} is already enrolled in Section "${conflict.section.name}" on ${conflict.day} (${conflict.scheduleLabel}). A student cannot attend multiple overlapping sections.`;
        if (typeof window.showAlertDialog === 'function') {
            window.showAlertDialog('Student Conflict Detected', msg);
        } else {
            alert(msg);
        }
        return;
    }

    if (!window.stagedSectionStudents) window.stagedSectionStudents = [];
    const existingIndex = window.stagedSectionStudents.findIndex(s => String(s.id || s.uid) === id);

    if (existingIndex === -1) {
        const users = getStoredJson(USER_STORAGE_KEY, []);
        const student = users.find(u => String(u.uid || u.id) === id);
        if (student) {
            const lastName = student.lastName || student.lastname || '';
            const firstName = student.firstName || student.firstname || '';
            const middleName = student.middleName || student.middlename || '';
            const name = `${lastName}, ${firstName} ${middleName}`.trim().replace(/\s+,/, ',');

            window.stagedSectionStudents.push({
                id: id,
                lastName: lastName,
                firstName: firstName,
                middleName: middleName,
                name: name,
                email: student.email || ''
            });
        }
    }

    const searchInput = document.getElementById('section-subpage-students-search');
    if (searchInput) searchInput.value = '';
    const dropdown = document.getElementById('section-subpage-students-dropdown');
    if (dropdown) dropdown.classList.add('hidden');

    window.renderSubpageStudentsSelectedPanel();
};

window.removeSubpageStudent = function (studentId) {
    const id = String(studentId);
    window.stagedSectionStudents = (window.stagedSectionStudents || []).filter(s => String(s.id || s.uid) !== id);
    window.renderSubpageStudentsSelectedPanel();
};

window.clearAllSubpageStudents = function () {
    window.stagedSectionStudents = [];
    window.renderSubpageStudentsSelectedPanel();
};

window.renderSubpageStudentsSelectedPanel = function () {
    const panel = document.getElementById('section-subpage-students-selected-panel');
    const selectedCountEl = document.getElementById('section-subpage-selected-count');
    const confirmLabel = document.getElementById('section-subpage-confirm-label');
    const count = window.stagedSectionStudents?.length || 0;

    if (selectedCountEl) selectedCountEl.textContent = `${count} assigned`;
    if (confirmLabel && window.activeSectionSubpage === 'students') {
        confirmLabel.textContent = count > 0 ? `Select Students (${count})` : 'Select Students';
    }

    if (!panel) return;

    if (count === 0 || window.activeSectionSubpage !== 'students') {
        panel.innerHTML = '';
        panel.classList.add('hidden');
        return;
    }

    const sorted = [...window.stagedSectionStudents].sort((a, b) => {
        const nameA = `${a.lastName || ''}, ${a.firstName || ''}`.toLowerCase();
        const nameB = `${b.lastName || ''}, ${b.firstName || ''}`.toLowerCase();
        return nameA.localeCompare(nameB);
    });

    const chips = sorted.map((s) => {
        const id = String(s.id || s.uid || '');
        const displayName = s.name || `${s.lastName || ''}, ${s.firstName || ''}`.trim();
        return `
            <div class="flex items-center gap-2 min-w-0 h-10 pl-1.5 pr-1 rounded-xl bg-slate-50 border border-slate-200 shrink-0 max-w-[16rem]" title="${escapeHtml(displayName)}">
                ${renderUserAvatarHtml(s, 'w-7 h-7', 'text-[10px]')}
                <p class="text-sm font-bold text-black tracking-tight truncate font-['Inter']">${escapeHtml(displayName)}</p>
                <button type="button" onclick="window.removeSubpageStudent('${escapeHtml(id)}')"
                    class="w-8 h-8 rounded-full bg-transparent hover:bg-black/5 text-black flex items-center justify-center transition-colors cursor-pointer shrink-0" title="Remove from section">
                    <i class="fa-solid fa-xmark text-sm text-black"></i>
                </button>
            </div>
        `;
    }).join('');

    panel.classList.remove('hidden');
    panel.innerHTML = `<div class="flex items-center gap-2 min-w-0 overflow-x-auto">${chips}</div>`;
};

window.removeSectionStudent = function (studentId) {
    window.selectedSectionStudents = (window.selectedSectionStudents || []).filter(s => String(s.id || s.uid) !== String(studentId));
    window.renderAssignSectionOverview();
};

window.renderSelectedStudents = function () {
    window.renderAssignSectionOverview();
};

// Search results stay on the page under the search bar.

// =============================================================
// SUBJECT & TOPIC & MATERIAL EDITOR
// Centralized shared module in js/subject-editor.js
// =============================================================

window.applySubjectSearch = function (isFromButton = false) {
    const queryInput = document.getElementById('subject-search-query');
    const codeInput = document.getElementById('subject-search-code');
    const nameInput = document.getElementById('subject-search-name');
    const typeSelect = document.getElementById('subject-search-type');
    const statusSelect = document.getElementById('subject-search-status');

    let rawQuery = queryInput ? queryInput.value : '';
    if (!rawQuery && codeInput) rawQuery = codeInput.value;
    if (!rawQuery && nameInput) rawQuery = nameInput.value;

    const cleanQuery = String(rawQuery || '')
        .trim()
        .replace(/[^a-zA-Z0-9\s.\-']/g, '')
        .replace(/\s{2,}/g, ' ')
        .slice(0, 50);

    const typeVal = String(typeSelect?.value || '').trim();
    const cleanType = (typeVal && typeVal.toLowerCase() !== 'all' && typeVal.toLowerCase() !== 'all types') ? typeVal : '';

    const statusVal = String(statusSelect?.value || '').trim();
    const cleanStatus = (statusVal && statusVal.toLowerCase() !== 'all' && statusVal.toLowerCase() !== 'all status') ? statusVal : '';

    window.subjectSearchState = {
        query: cleanQuery,
        code: cleanQuery,
        name: cleanQuery,
        type: cleanType,
        status: cleanStatus,
        hasSearched: isFromButton ? true : window.subjectSearchState.hasSearched
    };
    window.subjectPaginationState.currentPage = 1;
    renderSubjectsTable();
    if (isFromButton) window.scrollTo({ top: 0, behavior: 'smooth' });
};

function bindSubjectSearch() {
    const queryInput = document.getElementById('subject-search-query');
    const codeInput = document.getElementById('subject-search-code');
    const nameInput = document.getElementById('subject-search-name');
    const typeSelect = document.getElementById('subject-search-type');
    const statusSelect = document.getElementById('subject-search-status');
    const searchBtn = document.getElementById('subject-search-btn');

    [queryInput, codeInput, nameInput].forEach(input => {
        if (input && input.dataset.enterBound !== 'true') {
            input.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    window.applySubjectSearch(true);
                }
            });
            input.dataset.enterBound = 'true';
        }
    });

    if (typeSelect && typeSelect.dataset.changeBound !== 'true') {
        typeSelect.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                window.applySubjectSearch(true);
            }
        });
        typeSelect.dataset.changeBound = 'true';
    }

    if (statusSelect && statusSelect.dataset.changeBound !== 'true') {
        statusSelect.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                window.applySubjectSearch(true);
            }
        });
        statusSelect.dataset.changeBound = 'true';
    }

    if (searchBtn && searchBtn.dataset.searchBound !== 'true') {
        searchBtn.addEventListener('click', () => window.applySubjectSearch(true));
        searchBtn.dataset.searchBound = 'true';
    }
}

// --- SECTIONS SEARCH LOGIC ---

function updateSectionMetricCards() {
    const allSections = (typeof getStoredJson === 'function') ? getStoredJson(SECTIONS_STORAGE_KEY, []) : [];
    let grade11 = 0;
    let grade12 = 0;
    const uniqueRooms = new Set();

    allSections.forEach(sec => {
        const grade = String(sec.grade || sec.gradeLevel || '').toLowerCase();
        if (grade.includes('11')) grade11++;
        else if (grade.includes('12')) grade12++;

        const room = String(sec.room || '').trim();
        if (room && room !== 'Room —' && room !== '—' && room !== 'Unassigned') {
            uniqueRooms.add(room.toLowerCase());
        }
    });

    const totalEl = document.getElementById('metric-total-sections');
    const roomsEl = document.getElementById('metric-rooms-sections');
    const g11El = document.getElementById('metric-grade11-sections');
    const g12El = document.getElementById('metric-grade12-sections');

    const totalSpotlight = document.getElementById('metric-total-sections-spotlight');
    const roomsSpotlight = document.getElementById('metric-rooms-sections-spotlight');
    const g11Spotlight = document.getElementById('metric-grade11-sections-spotlight');
    const g12Spotlight = document.getElementById('metric-grade12-sections-spotlight');

    if (totalEl) totalEl.textContent = allSections.length;
    if (totalSpotlight) totalSpotlight.textContent = allSections.length;

    if (roomsEl) roomsEl.textContent = uniqueRooms.size;
    if (roomsSpotlight) roomsSpotlight.textContent = uniqueRooms.size;

    if (g11El) g11El.textContent = grade11;
    if (g11Spotlight) g11Spotlight.textContent = grade11;

    if (g12El) g12El.textContent = grade12;
    if (g12Spotlight) g12Spotlight.textContent = grade12;

    // Attach interactive cursor spotlight to cards & magnetic icon connection
    if (typeof window.bindInteractiveMetricCards === 'function') {
        window.bindInteractiveMetricCards();
    }
}
window.updateSectionMetricCards = updateSectionMetricCards;

// State already initialized at top of file
window.applySectionSearch = function (isFromButton = false) {
    const query = String(document.getElementById('section-search-query')?.value || document.getElementById('section-search-name')?.value || '').trim();
    window.sectionSearchState = {
        query: query,
        name: query,
        room: String(document.getElementById('section-search-room')?.value || '').trim(),
        grade: String(document.getElementById('section-search-grade')?.value || '').trim(),
        status: String(document.getElementById('section-search-status')?.value || '').trim(),
        hasSearched: isFromButton ? true : window.sectionSearchState.hasSearched
    };
    window.sectionPaginationState.currentPage = 1;
    renderSectionsTable();
    if (isFromButton) window.scrollTo({ top: 0, behavior: 'smooth' });
};

function bindSectionSearch() {
    const queryInput = document.getElementById('section-search-query') || document.getElementById('section-search-name');
    const gradeSelect = document.getElementById('section-search-grade');
    const statusSelect = document.getElementById('section-search-status');
    const searchBtn = document.getElementById('section-search-btn');

    if (queryInput && queryInput.dataset.enterBound !== 'true') {
        queryInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                window.applySectionSearch(true);
            }
        });
        queryInput.dataset.enterBound = 'true';
    }

    [gradeSelect, statusSelect].forEach(select => {
        if (select && select.dataset.changeBound !== 'true') {
            select.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    window.applySectionSearch(true);
                }
            });
            select.dataset.changeBound = 'true';
        }
    });

    if (searchBtn && searchBtn.dataset.searchBound !== 'true') {
        searchBtn.addEventListener('click', () => window.applySectionSearch(true));
        searchBtn.dataset.searchBound = 'true';
    }
}

function getFilteredSectionsBySearch(searchState) {
    const sections = getStoredJson(SECTIONS_STORAGE_KEY, []);
    const query = String(searchState?.query || searchState?.name || '').trim().toLowerCase();
    const room = String(searchState?.room || '').trim().toLowerCase();
    const grade = String(searchState?.grade || '').trim().toLowerCase();
    const status = String(searchState?.status || '').trim().toLowerCase();

    return sections.filter(sec => {
        const secName = String(sec.name || '').toLowerCase();
        const secRoom = String(sec.room || '').toLowerCase();
        const secStrand = String(sec.strand || sec.track || '').toLowerCase();

        let matchesSearch = true;
        if (query) {
            matchesSearch = secName.includes(query) || secRoom.includes(query) || secStrand.includes(query);
        } else if (room) {
            matchesSearch = secRoom.includes(room);
        }

        const matchesGrade = !grade || grade === 'all' || grade === 'all grades' || String(sec.grade || sec.gradeLevel || '').toLowerCase() === grade;
        const secStatus = String(sec.status || 'active').toLowerCase();
        const matchesStatus = !status || status === 'all' || status === 'all status' || secStatus === status;

        return matchesSearch && matchesGrade && matchesStatus;
    });
}

function renderSectionsTable() {
    window.renderSectionsTable = renderSectionsTable;
    window.enforceSingleAdviserOnStoredSections();
    const tableBody = document.getElementById('sectionTableBody');
    if (!tableBody) return;

    if (typeof updateSectionMetricCards === 'function') {
        updateSectionMetricCards();
    }

    const displaySections = getFilteredSectionsBySearch(window.sectionSearchState);

    const totalItems = displaySections.length;
    const startIndex = (window.sectionPaginationState.currentPage - 1) * window.sectionPaginationState.itemsPerPage;
    const paginatedSections = displaySections.slice(startIndex, startIndex + window.sectionPaginationState.itemsPerPage);

    if (displaySections.length === 0) {
        tableBody.innerHTML = `
            <tr id="section-empty-state" class="bg-white">
                <td colspan="9" class="py-32 text-center">
                    <div class="flex flex-col items-center justify-center space-y-4">
                        <i class="fa-solid fa-layer-group text-6xl text-black-fade"></i>
                        <p class="text-base font-bold text-black font-['Inter']">${window.sectionSearchState.hasSearched ? 'No Matching Sections Found' : 'No Sections Found'}</p>
                    </div>
                </td>
            </tr>
        `;
        const pagEl = document.getElementById('section-pagination-container');
        if (pagEl) pagEl.innerHTML = '';
        return;
    }

    tableBody.innerHTML = paginatedSections.map((sec, idx) => {
        const isInactive = (sec.status || 'Active').toLowerCase() === 'inactive';
        const rowStripe = (idx % 2 === 1) ? 'bg-slate-50/60' : '';
        const rowNumber = totalItems - startIndex - idx;
        const strandBadge = sec.strand ? `<span class="inline-block text-[11px] font-bold text-emerald-800 uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 font-['Inter']">${escapeHtml(sec.strand)}</span>` : '';

        // Format Teacher(s) cell
        let teacherCellHtml = '';
        const rawTeachers = (Array.isArray(sec.teachers) && sec.teachers.length > 0)
            ? sec.teachers
            : (sec.teacher ? [{ name: sec.teacher, role: sec.role || (sec.adviser === sec.teacher ? 'Adviser' : 'Teacher'), isPrimary: true }] : []);

        if (sec.adviser && !rawTeachers.some(t => (typeof t === 'object' ? t.name : t) === sec.adviser)) {
            rawTeachers.push({ name: sec.adviser, role: 'Adviser', isPrimary: false });
        }

        if (rawTeachers.length > 0) {
            teacherCellHtml = `<div class="flex flex-col items-stretch w-full min-w-0">` + rawTeachers.map((t, tIdx) => {
                const tName = typeof t === 'object' ? (t.name || t.fullName || '') : String(t);
                if (!tName) return '';
                const tRole = typeof t === 'object' ? (t.role || 'Teacher') : 'Teacher';
                const teacherRef = (typeof t === 'object' && t) ? t : { name: tName };
                const avatarHtml = (typeof window.renderUserAvatarHtml === 'function')
                    ? window.renderUserAvatarHtml(teacherRef, 'xs', 'section-teacher-avatar')
                    : '';
                const adviserBadge = tRole === 'Adviser'
                    ? '<span class="text-[11px] font-bold text-black bg-[#FFD000] px-2 py-0.5 rounded border border-black/10 tracking-tight font-[\'Inter\'] shrink-0">Adviser</span>'
                    : '';
                return `
                    <div class="flex items-center justify-start gap-3 min-w-0 w-full text-left ${tIdx > 0 ? 'mt-2' : ''}">
                        ${avatarHtml}
                        <span class="text-[13px] font-normal text-black font-['Inter'] leading-snug break-words min-w-0" title="${escapeHtml(tName)}">${escapeHtml(tName)}</span>
                        ${adviserBadge}
                    </div>
                `;
            }).join('') + `</div>`;
        } else {
            teacherCellHtml = `
                <div class="flex flex-col items-start text-left">
                    <span class="text-[14px] font-normal text-black tracking-tight font-['Inter']">Unassigned</span>
                    <span class="text-[11px] font-normal text-black-fade font-['Inter']">No Teacher</span>
                </div>
            `;
        }

        const scheduleLinesHtml = String(sec.schedule || '')
            .split(',')
            .flatMap(part => part.split('•').map(piece => piece.trim()).filter(Boolean))
            .map(line => '<span class="block w-full shrink-0 text-[11px] font-normal text-black-fade font-[\'Inter\'] leading-4 text-center">' + escapeHtml(line) + '</span>')
            .join('');

        return `
            <tr class="transition-colors ${rowStripe} hover:bg-emerald-50/20">
                <td class="px-3 py-4 text-center">
                    <div class="text-[14px] font-normal text-black text-center tracking-wide font-['Inter']">${rowNumber}</div>
                </td>
                <td class="px-3 py-4 text-center align-middle">
                    <div class="flex flex-col items-center gap-0.5 max-w-full shrink-0">
                        <span class="text-[14px] font-semibold text-black tracking-tight font-['Inter']">${escapeHtml(sec.name)}</span>
                        <div class="flex items-center justify-center gap-1.5 flex-wrap">
                            <span class="text-[12px] font-medium text-black-fade font-['Inter']">${escapeHtml(sec.gradeLevel || sec.grade || 'Grade 11')}</span>
                            ${strandBadge}
                        </div>
                    </div>
                </td>
                <td class="px-3 py-4 text-center align-middle">
                    <div class="text-[14px] font-normal text-black text-center tracking-tight font-['Inter'] leading-5 break-words">${escapeHtml(sec.subject || sec.track || '—')}</div>
                </td>
                <td class="px-3 py-4 text-center align-middle">
                    <div class="flex flex-col items-center gap-0.5 max-w-full shrink-0">
                        <span class="text-[14px] font-normal text-black text-center tracking-tight font-['Inter']">${escapeHtml(sec.room || 'Room —')}</span>
                        ${scheduleLinesHtml}
                    </div>
                </td>
                <td class="px-3 py-4 text-left align-middle">
                    ${teacherCellHtml}
                </td>
                <td class="px-3 py-4 text-center">
                    <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-normal bg-slate-100 text-black font-['Inter']">
                        <i class="fa-solid fa-users text-xs mr-1.5" style="color: rgba(0, 0, 0, 0.4) !important;"></i>
                        <span class="text-black font-normal">${sec.studentsCount || (Array.isArray(sec.students) ? sec.students.length : 0)}</span>
                    </span>
                </td>
                <td class="px-3 py-4 text-center">
                    <div class="flex flex-col items-center gap-0.5 max-w-full shrink-0">
                        <span class="text-[13px] font-medium text-black text-center tracking-wide font-['Inter']">${escapeHtml(sec.schoolYear || '2026–2027')}</span>
                        <span class="text-[11px] font-normal text-black-fade text-center font-['Inter'] mt-0.5 leading-4">Created: ${(typeof formatUserCreatedDate === 'function') ? formatUserCreatedDate(sec.createdAt) : 'Sep 3, 2026'}</span>
                    </div>
                </td>
                <td class="px-3 py-4 text-center">
                    <div class="text-[14px] font-medium text-center tracking-tight font-['Inter']" style="${(sec.status || '').toLowerCase() === 'draft' ? 'color: #eab308 !important;' : 'color: #15803d !important;'}">${escapeHtml(sec.status || 'Deployed')}</div>
                </td>
                <td class="px-3 py-4 text-center">
                    <div class="flex justify-center">
                        <div class="action-dropdown-container">
                            <button onclick="window.toggleSectionActionDropdown(${startIndex + idx}, event)" 
                                id="section-dots-btn-${startIndex + idx}"
                                class="action-dots-btn cursor-pointer" 
                                title="Actions">
                                <i class="fa-solid fa-ellipsis"></i>
                            </button>
                            <div id="section-action-menu-${startIndex + idx}" class="action-dropdown-menu">
                                <button onclick="window.viewSection('${escapeHtml(sec.id || sec.name)}', '${escapeHtml(sec.subject || sec.assignedSubject || (Array.isArray(sec.assignedSubjects) && sec.assignedSubjects[0]) || '')}')" class="action-dropdown-item cursor-pointer">
                                    <i class="fa-solid fa-eye"></i>
                                    <span>View Section</span>
                                </button>
                                <button onclick="window.editSection('${escapeHtml(sec.id || sec.name)}')" class="action-dropdown-item cursor-pointer">
                                    <i class="fa-solid fa-pen-to-square"></i>
                                    <span>Edit Section</span>
                                </button>
                                ${(typeof window.canCurrentAdminDelete === 'function' && window.canCurrentAdminDelete('section')) ? `
                                <div class="h-px bg-slate-100 my-1"></div>
                                <button onclick="window.deleteSection('${escapeHtml(sec.id || sec.name)}')" class="action-dropdown-item cursor-pointer">
                                    <i class="fa-solid fa-trash-can"></i>
                                    <span>Delete Section</span>
                                </button>` : ''}
                            </div>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    // Fill remaining rows to reach itemsPerPage to keep the table height fixed
    const sectionItemsPerPage = window.sectionPaginationState.itemsPerPage;
    const sectionRemainingRows = sectionItemsPerPage - paginatedSections.length;
    if (sectionRemainingRows > 0) {
        for (let i = 0; i < sectionRemainingRows; i++) {
            const rowIndex = paginatedSections.length + i;
            const stripeBg = rowIndex % 2 === 1 ? 'bg-slate-50/60' : '';
            const emptyRow = `
                <tr class="border-transparent ${stripeBg}">
                    <td class="px-4 py-4 text-center"><div class="text-[14px]">&nbsp;</div></td>
                    <td class="px-4 py-4 text-center"><div class="text-[14px]">&nbsp;</div></td>
                    <td class="px-4 py-4 text-center"><div class="text-[14px]">&nbsp;</div></td>
                    <td class="px-4 py-4 text-center"><div class="text-[14px]">&nbsp;</div></td>
                    <td class="px-4 py-4 text-center"><div class="text-[14px]">&nbsp;</div></td>
                    <td class="px-4 py-4 text-center"><div class="text-[14px]">&nbsp;</div></td>
                    <td class="px-4 py-4 text-center"><div class="text-[14px]">&nbsp;</div></td>
                    <td class="px-4 py-4 text-center"><div class="text-[14px]">&nbsp;</div></td>
                    <td class="px-4 py-4 text-center"><div class="text-[14px]">&nbsp;</div></td>
                </tr>
            `;
            tableBody.innerHTML += emptyRow;
        }
    }

    renderPaginationControls('section-pagination-container', totalItems, window.sectionPaginationState, 'onSectionPageChange');
}


function getFilteredSubjectsBySearch(searchState) {
    const subjects = getStoredJson(SUBJECTS_STORAGE_KEY, []);
    const query = String(searchState?.query || searchState?.code || searchState?.name || '').trim().toLowerCase();
    const type = String(searchState?.type || '').trim().toLowerCase();
    const status = String(searchState?.status || '').trim().toLowerCase();

    return subjects.filter(sub => {
        const subCode = String(sub.code || '').toLowerCase();
        const subName = String(sub.name || '').toLowerCase();

        let matchesSearch = true;
        if (query) {
            matchesSearch = subCode.includes(query) || subName.includes(query);
        }

        const matchesType = !type || type === 'all' || type === 'all types' || subCode.includes(type) || String(sub.type || '').toLowerCase().includes(type);
        const subStatus = String(sub.status || 'published').toLowerCase();
        const matchesStatus = !status || status === 'all' || status === 'all status' || subStatus === status;

        return matchesSearch && matchesType && matchesStatus;
    });
}

function updateSubjectMetricCards() {
    const allSubjects = (typeof getStoredJson === 'function') ? getStoredJson(SUBJECTS_STORAGE_KEY, []) : [];
    let core = 0;
    let applied = 0;
    let specialized = 0;

    allSubjects.forEach(s => {
        const type = String(s.type || 'Core').toLowerCase();
        if (type.includes('core')) core++;
        else if (type.includes('applied')) applied++;
        else if (type.includes('specialized')) specialized++;
        else core++;
    });

    const totalEl = document.getElementById('metric-total-subjects');
    const coreEl = document.getElementById('metric-core-subjects');
    const appliedEl = document.getElementById('metric-applied-subjects');
    const specializedEl = document.getElementById('metric-specialized-subjects');

    const totalSpotlight = document.getElementById('metric-total-subjects-spotlight');
    const coreSpotlight = document.getElementById('metric-core-subjects-spotlight');
    const appliedSpotlight = document.getElementById('metric-applied-subjects-spotlight');
    const specializedSpotlight = document.getElementById('metric-specialized-subjects-spotlight');

    if (totalEl) totalEl.textContent = allSubjects.length;
    if (totalSpotlight) totalSpotlight.textContent = allSubjects.length;

    if (coreEl) coreEl.textContent = core;
    if (coreSpotlight) coreSpotlight.textContent = core;

    if (appliedEl) appliedEl.textContent = applied;
    if (appliedSpotlight) appliedSpotlight.textContent = applied;

    if (specializedEl) specializedEl.textContent = specialized;
    if (specializedSpotlight) specializedSpotlight.textContent = specialized;

    if (typeof window.bindInteractiveMetricCards === 'function') {
        window.bindInteractiveMetricCards();
    }
}
window.updateSubjectMetricCards = updateSubjectMetricCards;

window.isSubjectReadyForPublish = function (sub) {
    if (!sub) return false;
    const hasCode = !!String(sub.code || '').trim();
    const hasName = !!String(sub.name || '').trim();
    const hasUnits = !!String(sub.units || '').trim();
    const type = String(sub.type || 'Core').trim().toLowerCase();
    const hasStrand = (type === 'specialized') ? !!String(sub.strand || '').trim() : true;
    const hasTopics = Array.isArray(sub.topics) && sub.topics.length > 0;
    const hasMaterials = Array.isArray(sub.materials) && sub.materials.length > 0;

    return hasCode && hasName && hasUnits && hasStrand && hasTopics && hasMaterials;
};

window.publishSubjectPrompt = function (code) {
    const subjects = getStoredJson(SUBJECTS_STORAGE_KEY, []);
    const targetCode = String(code || '').trim().toLowerCase();
    const sub = subjects.find(s => (s.code || '').trim().toLowerCase() === targetCode);
    if (!sub) return;

    if (!window.isSubjectReadyForPublish(sub)) {
        if (typeof window.showAlertDialog === 'function') {
            window.showAlertDialog({
                title: 'Requirements Incomplete',
                message: 'All requirements (Subject Code, Name, Units, Topics, and Materials) must be completed before this subject can be published. Please edit the subject to complete them.',
                buttonText: 'OK'
            });
        }
        return;
    }

    window.showUserConfirm(
        "Publish Subject?",
        "This will publish the subject with all added topics and materials to the catalog.",
        () => {
            sub.status = 'Published';
            saveStoredJson(SUBJECTS_STORAGE_KEY, subjects);
            renderSubjectsTable();
            if (window.showToast) window.showToast(`"${sub.name || sub.code}" published successfully`);
        }
    );
};

window.unpublishSubjectPrompt = function (code) {
    const subjects = getStoredJson(SUBJECTS_STORAGE_KEY, []);
    const targetCode = String(code || '').trim().toLowerCase();
    const sub = subjects.find(s => (s.code || '').trim().toLowerCase() === targetCode);
    if (!sub) return;

    window.showUserConfirm(
        "Revert to Draft?",
        "This will revert the subject to draft status. It will no longer be available for section assignments.",
        () => {
            sub.status = 'Draft';
            saveStoredJson(SUBJECTS_STORAGE_KEY, subjects);
            renderSubjectsTable();
            if (window.showToast) window.showToast(`"${sub.name || sub.code}" moved back to draft`);
        }
    );
};

function renderSubjectsTable() {
    window.renderSubjectsTable = renderSubjectsTable;
    const tableBody = document.getElementById('subjectTableBody');
    if (!tableBody) return;

    if (typeof updateSubjectMetricCards === 'function') {
        updateSubjectMetricCards();
    }

    const displaySubjects = getFilteredSubjectsBySearch(window.subjectSearchState);

    const totalItems = displaySubjects.length;
    const startIndex = (window.subjectPaginationState.currentPage - 1) * window.subjectPaginationState.itemsPerPage;
    const paginatedSubjects = displaySubjects.slice(startIndex, startIndex + window.subjectPaginationState.itemsPerPage);

    if (displaySubjects.length === 0) {
        tableBody.innerHTML = `
            <tr id="subject-empty-state" class="bg-white">
                <td colspan="8" class="py-32 text-center">
                    <div class="flex flex-col items-center justify-center space-y-4">
                        <i class="fa-solid fa-book-open text-6xl text-black-fade"></i>
                        <p class="text-base font-bold text-black font-['Inter']">${window.subjectSearchState.hasSearched ? 'No Matching Subjects Found' : 'No Subjects Found'}</p>
                    </div>
                </td>
            </tr>
        `;
        const pagEl = document.getElementById('subject-pagination-container');
        if (pagEl) pagEl.innerHTML = '';
        return;
    }

    tableBody.innerHTML = paginatedSubjects.map((sub, idx) => {
        const isDraft = (sub.status || '').toLowerCase() === 'draft';
        const statusHtml = `<div class="text-[14px] font-medium text-center tracking-tight font-['Inter']" style="${isDraft ? 'color: #eab308 !important;' : 'color: #15803d !important;'}">${isDraft ? 'Draft' : 'Published'}</div>`;
        const rowStripe = (idx % 2 === 1) ? 'bg-slate-50/60' : '';

        // Mapping for Type
        let typeDisplay = sub.type;
        if (sub.type.toLowerCase() === 'core') typeDisplay = 'Core Subject';
        else if (sub.type.toLowerCase() === 'applied') typeDisplay = 'Applied Subject';
        else if (sub.type.toLowerCase() === 'specialized') typeDisplay = 'Specialized Subject';

        // Format units to always have .0 if integer
        let unitsDisplay = String(sub.units || '0');
        if (!unitsDisplay.includes('.')) unitsDisplay += '.0';

        const createdDateText = (typeof formatUserCreatedDate === 'function') ? formatUserCreatedDate(sub.createdAt) : 'Sep 3, 2026';
        const isReadyForPublish = window.isSubjectReadyForPublish ? window.isSubjectReadyForPublish(sub) : false;

        return `
            <tr class="transition-colors ${rowStripe} hover:bg-emerald-50/20">
                <td class="px-4 py-4 text-center">
                    <div class="text-[14px] font-normal text-black text-center tracking-wide font-['Inter']">${totalItems - startIndex - idx}</div>
                </td>
                <td class="px-4 py-4 text-center">
                    <div class="text-[14px] font-normal text-black text-center tracking-wide font-['Inter']">${escapeHtml(sub.code)}</div>
                </td>
                <td class="px-4 py-4 text-center">
                    <div class="text-[14px] font-normal text-black text-center tracking-tight font-['Inter']">${escapeHtml(sub.name)}</div>
                </td>
                <td class="px-4 py-4 text-center">
                    <div class="text-[14px] font-normal text-black text-center tracking-tight font-['Inter']">${typeDisplay}</div>
                </td>
                <td class="px-4 py-4 text-center">
                    <div class="text-[14px] font-normal text-black text-center tracking-wide font-['Inter']">${unitsDisplay}</div>
                </td>
                <td class="px-4 py-4 text-center">
                    <div class="flex items-center justify-center">
                        ${statusHtml}
                    </div>
                </td>
                <td class="px-4 py-4 text-center">
                    <div class="text-[13px] font-normal text-black text-center font-['Inter']">
                        ${escapeHtml(createdDateText)}
                    </div>
                </td>
                <td class="px-4 py-4 text-center">
                    <div class="flex justify-center">
                        <div class="action-dropdown-container">
                            <button onclick="window.toggleSubjectActionDropdown(${startIndex + idx}, event)" 
                                id="subject-dots-btn-${startIndex + idx}"
                                class="action-dots-btn cursor-pointer" 
                                title="Actions">
                                <i class="fa-solid fa-ellipsis"></i>
                            </button>
                            <div id="subject-action-menu-${startIndex + idx}" class="action-dropdown-menu">
                                <button onclick="window.editSubject('${escapeHtml(sub.code)}')" class="action-dropdown-item cursor-pointer">
                                    <i class="fa-solid fa-pen-to-square"></i>
                                    <span>Edit Subject</span>
                                </button>
                                <button onclick="window.editSubjectContent('${escapeHtml(sub.code)}')" class="action-dropdown-item cursor-pointer">
                                    <i class="fa-solid fa-layer-group"></i>
                                    <span>Add/Edit Topics & Materials</span>
                                </button>
                                ${isDraft ? (isReadyForPublish && (typeof window.canCurrentAdminPublishSubject === 'function' && window.canCurrentAdminPublishSubject()) ? `
                                <button onclick="window.publishSubjectPrompt('${escapeHtml(sub.code)}')" class="action-dropdown-item cursor-pointer">
                                    <i class="fa-solid fa-cloud-arrow-up"></i>
                                    <span>Publish Subject</span>
                                </button>` : '') : (typeof window.canCurrentAdminUnpublishSubject === 'function' && window.canCurrentAdminUnpublishSubject() ? `
                                <button onclick="window.unpublishSubjectPrompt('${escapeHtml(sub.code)}')" class="action-dropdown-item cursor-pointer">
                                    <i class="fa-solid fa-file-pen"></i>
                                    <span>Revert to Draft</span>
                                </button>` : '')}
                                ${(typeof window.canCurrentAdminDelete === 'function' && window.canCurrentAdminDelete('subject')) ? `
                                <div class="h-px bg-slate-100 my-1"></div>
                                <button onclick="window.deleteSubjectPrompt('${escapeHtml(sub.code)}')" class="action-dropdown-item cursor-pointer">
                                    <i class="fa-solid fa-trash-can"></i>
                                    <span>Delete Subject</span>
                                </button>` : ''}
                            </div>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    // Fill remaining rows to reach itemsPerPage to keep the table height fixed
    const subjectItemsPerPage = window.subjectPaginationState.itemsPerPage;
    const subjectRemainingRows = subjectItemsPerPage - paginatedSubjects.length;
    if (subjectRemainingRows > 0) {
        for (let i = 0; i < subjectRemainingRows; i++) {
            const rowIndex = paginatedSubjects.length + i;
            const stripeBg = rowIndex % 2 === 1 ? 'bg-slate-50/60' : '';
            const emptyRow = `
                <tr class="border-transparent ${stripeBg}">
                    <td class="px-4 py-4 text-center"><div class="text-[14px]">&nbsp;</div></td>
                    <td class="px-4 py-4 text-center"><div class="text-[14px]">&nbsp;</div></td>
                    <td class="px-4 py-4 text-center"><div class="text-[14px]">&nbsp;</div></td>
                    <td class="px-4 py-4 text-center"><div class="text-[14px]">&nbsp;</div></td>
                    <td class="px-4 py-4 text-center"><div class="text-[14px]">&nbsp;</div></td>
                    <td class="px-4 py-4 text-center"><div class="text-[14px]">&nbsp;</div></td>
                    <td class="px-4 py-4 text-center"><div class="text-[14px]">&nbsp;</div></td>
                    <td class="px-4 py-4 text-center"><div class="text-[14px]">&nbsp;</div></td>
                </tr>
            `;
            tableBody.innerHTML += emptyRow;
        }
    }

    renderPaginationControls('subject-pagination-container', totalItems, window.subjectPaginationState, 'onSubjectPageChange');
}

// =============================================================
// USER ACCOUNT MANAGEMENT LOGIC
// =============================================================

let initialUserValues = {};
let editingUserId = null;
let currentUserEditorStep = 1;

window.showUserConfirm = function (title, desc, onProceed, isNotification = false, onCancel = null) {
    if (typeof window.showSigmaDialog === 'function') {
        window.showSigmaDialog({
            title: title,
            desc: desc,
            onConfirm: onProceed,
            isNotification: isNotification,
            onCancel: onCancel,
            confirmText: isNotification ? 'OK' : 'Proceed',
            cancelText: 'Cancel'
        });
        return;
    }

    // Fallback if panels.js is not yet loaded
    const overlay = document.getElementById('user-confirm-overlay');
    const titleEl = document.getElementById('user-confirm-title');
    const descEl = document.getElementById('user-confirm-desc');
    const proceedBtn = document.getElementById('user-confirm-proceed');
    const cancelBtn = document.getElementById('user-confirm-cancel');

    if (!overlay || !titleEl || !descEl || !proceedBtn || !cancelBtn) return;

    titleEl.textContent = title;
    descEl.textContent = desc;

    if (isNotification) {
        cancelBtn.classList.add('hidden');
        proceedBtn.textContent = 'OK';
        proceedBtn.parentElement.classList.remove('grid-cols-2');
        proceedBtn.parentElement.classList.add('grid-cols-1');
    } else {
        cancelBtn.classList.remove('hidden');
        proceedBtn.textContent = 'Proceed';
        proceedBtn.parentElement.classList.remove('grid-cols-1');
        proceedBtn.parentElement.classList.add('grid-cols-2');
    }

    const closeOverlay = () => {
        overlay.classList.add('hidden');
        proceedBtn.removeEventListener('click', handleProceed);
        cancelBtn.removeEventListener('click', handleCancel);
    };

    const handleProceed = () => {
        if (onProceed) onProceed();
        closeOverlay();
    };

    const handleCancel = () => {
        if (onCancel) onCancel();
        closeOverlay();
    };

    proceedBtn.addEventListener('click', handleProceed);
    cancelBtn.addEventListener('click', handleCancel);

    overlay.classList.remove('hidden');
};

window.addEventListener('sigma:subjectUpdated', function () {
    if (typeof renderSubjectsTable === 'function') {
        renderSubjectsTable();
    }
    if (typeof updateSubjectMetricCards === 'function') {
        updateSubjectMetricCards();
    }
});





// Global variable to store current user profile data
window.currentUserProfileData = {};

// Profile page logic is unified in js/profile-view.js


window.toggleEditUserField = function (field, shouldSave = false) {
    const container = document.getElementById(`edit-user-${field}-container`);
    const viewElement = document.getElementById(`view-user-${field}`);
    const inputElement = document.getElementById(`edit-user-${field}-input`);

    if (!container || !viewElement || !inputElement) return;

    if (container.classList.contains('hidden')) {
        // Show edit mode
        container.classList.remove('hidden');
        inputElement.value = (viewElement.textContent === 'Not provided' || viewElement.textContent === 'Not specified' || viewElement.textContent === 'N/A')
            ? ''
            : viewElement.textContent.trim();
        inputElement.focus();
    } else {
        if (shouldSave) {
            // Save the value
            const newValue = inputElement.value.trim();
            const displayValue = newValue || (field === 'grade' ? 'Not specified' : 'Not provided');
            viewElement.textContent = displayValue;

            // Update the in-memory data
            window.currentUserProfileData[field] = newValue;

            // If it's a name field, update the banner as well
            if (field === 'firstName' || field === 'lastName') {
                const fName = field === 'firstName' ? newValue : (window.currentUserProfileData.firstName || '');
                const lName = field === 'lastName' ? newValue : (window.currentUserProfileData.lastName || '');

                if (field === 'firstName') {
                    const banner = document.getElementById('view-user-firstName-banner');
                    if (banner) banner.textContent = newValue || 'Firstname';
                } else {
                    const banner = document.getElementById('view-user-lastName-banner');
                    if (banner) banner.textContent = newValue || 'Lastname';
                }

                if (typeof window.setPortalHeader === 'function') {
                    window.setPortalHeader('Interface Computer College');
                } else {
                    const brandHeader = document.getElementById('nav-context-text') || document.getElementById('header-brand-title');
                    if (brandHeader) brandHeader.textContent = 'Interface Computer College';
                }
            }

            // Persist to storage
            if (window.currentUserProfileData.id === '0000000') {
                // Logged-in admin (Self)
                const userProfile = getStoredJson('sigma_user_profile', {});
                userProfile[field] = newValue;
                window.saveStoredJson('sigma_user_profile', userProfile);

                // Update dropdown name in real-time
                if (field === 'firstName') {
                    const el = document.getElementById('header-dropdown-firstName');
                    if (el) el.textContent = newValue || 'Firstname';
                } else if (field === 'lastName') {
                    const el = document.getElementById('header-dropdown-lastName');
                    if (el) el.textContent = newValue || 'Lastname';
                }
            } else {
                // Managed user account
                const users = getStoredJson(USER_STORAGE_KEY, []);
                const uIdx = users.findIndex(u => String(u.uid || u.id) === String(window.currentUserProfileData.id));
                if (uIdx !== -1) {
                    users[uIdx][field] = newValue;
                    saveStoredJson(USER_STORAGE_KEY, users);
                }
            }
        }
        // Hide edit mode
        container.classList.add('hidden');
    }
};



// Click outside to hide User Filter Menu
document.addEventListener('click', (e) => {
    const filterMenu = document.getElementById('user-filter-menu');
    const filterBtn = filterMenu?.previousElementSibling; // The filter button

    if (filterMenu && !filterMenu.classList.contains('hidden')) {
        if (!filterMenu.contains(e.target) && !filterBtn?.contains(e.target)) {
            filterMenu.classList.add('hidden');
        }
    }
});

window.showMyProfile = function (event) {
    if (typeof window.navigateToUserProfile === 'function') {
        window.navigateToUserProfile(event);
    }
};

// --- USER CREATION MULTI-STEP LOGIC ---
let userStep = 1;

// Setup Enter key listeners for User Creation inputs
(function setupUserCreationEnterListeners() {
    // UI logical order for Step 1
    const step1Ids = ['edit-user-role', 'edit-user-firstname', 'edit-user-middlename', 'edit-user-lastname', 'edit-user-gender'];
    const step2Ids = ['edit-user-email'];

    document.addEventListener('keydown', (e) => {
        const activeId = document.activeElement?.id;
        if (!activeId || !activeId.startsWith('edit-user-')) return;

        if (e.key === 'Enter') {
            if (step1Ids.includes(activeId)) {
                e.preventDefault();
                const currentIndex = step1Ids.indexOf(activeId);

                // If it's the last input of Step 1, try to proceed
                if (currentIndex === step1Ids.length - 1) {
                    window.handleUserStepNext();
                } else {
                    // Otherwise focus next
                    const nextEl = document.getElementById(step1Ids[currentIndex + 1]);
                    if (nextEl) nextEl.focus();
                }
            } else if (step2Ids.includes(activeId)) {
                e.preventDefault();
                window.handleUserSave();
            }
        }
    });
})();

window.getUserFormStateSnapshot = function () {
    return JSON.stringify({
        role: (document.getElementById('edit-user-role')?.value || '').trim(),
        firstName: (document.getElementById('edit-user-firstname')?.value || '').trim(),
        middleName: (document.getElementById('edit-user-middlename')?.value || '').trim(),
        lastName: (document.getElementById('edit-user-lastname')?.value || '').trim(),
        gender: (document.getElementById('edit-user-gender')?.value || '').trim(),
        branch: (document.getElementById('edit-user-school-branch')?.value || '').trim(),
        email: (document.getElementById('edit-user-email')?.value || '').trim().toLowerCase()
    });
};

window.toggleUserOverlay = function (show, userData = null) {
    const overlay = document.getElementById('user-edit-overlay');
    if (!overlay) return;

    if (!overlay._hasUserChangeListeners) {
        overlay._hasUserChangeListeners = true;
        overlay.addEventListener('input', () => {
            if (window.isEditingUser) window.validateUserStep2();
        });
        overlay.addEventListener('change', () => {
            if (window.isEditingUser) window.validateUserStep2();
        });
    }

    const titleEl = document.getElementById('user-editor-title');
    const saveLabel = document.getElementById('user-save-label');
    const roleEl = document.getElementById('edit-user-role');
    const idEl = document.getElementById('edit-user-id');

    if (show) {
        overlay.classList.remove('hidden');
        overlay.style.removeProperty('display');
        if (typeof window.pushModalHistoryState === 'function') {
            window.pushModalHistoryState('user-edit-overlay');
        }
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        userStep = 1;
        window.userAccountCreated = false; // Reset creation state
        window.isEditingUser = !!userData;
        window.currentEditingUserId = userData ? (userData.id || userData.uid || null) : null;

        const statusBadge = document.getElementById('user-modal-status-badge');
        const segHeader = document.getElementById('user-segmented-header');

        // Reset/Populate fields
        if (userData) {
            if (titleEl) titleEl.textContent = 'Edit Information';
            if (saveLabel) saveLabel.textContent = 'Save Changes';

            if (segHeader) segHeader.classList.add('hidden');
            if (statusBadge) {
                const isInactive = userData.status === 'Inactive' || userData.status === 'Deactivated' || userData.status === 'Locked';
                statusBadge.className = isInactive
                    ? "text-xs font-bold px-2.5 py-1 rounded-full font-['Inter'] bg-amber-100 text-amber-800 border border-amber-200"
                    : "text-xs font-bold px-2.5 py-1 rounded-full font-['Inter'] bg-emerald-100 text-emerald-800 border border-emerald-200";
                statusBadge.textContent = isInactive ? (userData.status || 'Inactive') : 'Active';
                statusBadge.classList.remove('hidden');
            }

            if (roleEl) roleEl.value = userData.role || '';
            const fnEl = document.getElementById('edit-user-firstname');
            if (fnEl) fnEl.value = userData.firstName || '';
            const mnEl = document.getElementById('edit-user-middlename');
            if (mnEl) mnEl.value = userData.middleName || '';
            const lnEl = document.getElementById('edit-user-lastname');
            if (lnEl) lnEl.value = userData.lastName || '';
            const gnEl = document.getElementById('edit-user-gender');
            if (gnEl) gnEl.value = userData.gender || '';
            const brEl = document.getElementById('edit-user-school-branch');
            if (brEl) brEl.value = userData.branch || '';
            const emEl = document.getElementById('edit-user-email');
            if (emEl) emEl.value = (userData.email || '').replace(/@gmail\.com$/i, '').replace(/@.*$/i, '');
            if (idEl) {
                idEl.value = userData.id || userData.uid || '';
                idEl.readOnly = true;
            }
            const pwEl = document.getElementById('edit-user-password');
            if (pwEl) pwEl.value = userData.password || '••••••••';
            const previewId = document.getElementById('user-preview-id');
            if (previewId) previewId.textContent = userData.id || userData.uid || '—';
            const previewName = document.getElementById('user-preview-name');
            if (previewName) previewName.textContent = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || '—';
            const previewEmail = document.getElementById('user-preview-email');
            if (previewEmail) previewEmail.textContent = userData.email || '—';
            const previewRole = document.getElementById('user-preview-role');
            if (previewRole) previewRole.textContent = userData.role || '—';
        } else {
            window.originalEditingUserState = null;
            if (titleEl) titleEl.textContent = 'Create User Account';
            if (saveLabel) saveLabel.textContent = 'Create Account';
            if (segHeader) segHeader.classList.remove('hidden');
            if (statusBadge) statusBadge.classList.add('hidden');

            if (idEl) {
                idEl.value = '';
                idEl.readOnly = false;
            }

            const inputs = overlay.querySelectorAll('input, select');
            inputs.forEach(input => {
                if (input.tagName === 'SELECT') {
                    input.selectedIndex = 0;
                } else {
                    input.value = '';
                }
            });
        }

        window.updateUserStepUI();

        if (typeof window.updateSelectPlaceholderColors === 'function') {
            window.updateSelectPlaceholderColors(overlay);
        }

        // Populate school branch dropdown from live branch records
        if (typeof window.populateUserSchoolBranchSelect === 'function') {
            window.populateUserSchoolBranchSelect(userData ? (userData.branch || '') : '');
        }

        if (userData) {
            window.originalEditingUserState = window.getUserFormStateSnapshot();
            if (typeof window.validateUserStep2 === 'function') {
                window.validateUserStep2();
            }
        }

        overlay.scrollTop = 0;
        const formBody = document.getElementById('user-edit-form-body');
        if (formBody) formBody.scrollTop = 0;
    } else {
        overlay.classList.add('hidden');
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
        window.isEditingUser = false;
        window.originalEditingUserState = null;
        window.currentEditingUserId = null;
        userStep = 1;
        window.updateUserStepUI();
        const newUserData = sessionStorage.getItem('sigma-new-user-toast');
        if (newUserData) {
            try {
                const data = JSON.parse(newUserData);
                if (typeof window.showNewUserToast === 'function') {
                    window.showNewUserToast(data.id, data.name);
                }
            } catch (e) {}
        }
    }
};

window.handleUserExit = function () {
    if (userStep >= 3) {
        window.finishUserCreation();
        return;
    }
    const doExit = () => {
        window.toggleUserOverlay(false);
    };

    let hasChanges = false;
    if (window.isEditingUser && window.originalEditingUserState) {
        hasChanges = (typeof window.getUserFormStateSnapshot === 'function' && window.getUserFormStateSnapshot() !== window.originalEditingUserState);
    } else {
        const role = (document.getElementById('edit-user-role')?.value || '').trim();
        const fname = (document.getElementById('edit-user-firstname')?.value || '').trim();
        const mname = (document.getElementById('edit-user-middlename')?.value || '').trim();
        const lname = (document.getElementById('edit-user-lastname')?.value || '').trim();
        const email = (document.getElementById('edit-user-email')?.value || '').trim();
        hasChanges = Boolean(fname || mname || lname || email);
    }

    if (hasChanges) {
        if (typeof window.openAskingPanel === 'function') {
            window.openAskingPanel({
                title: 'Discard Changes?',
                desc: 'You have unsaved changes in this user account. Are you sure you want to discard them and leave?',
                type: 'warning',
                confirmText: 'Discard',
                cancelText: 'Stay',
                showCancel: true,
                onConfirm: doExit
            });
            return;
        } else if (confirm('You have unsaved changes in this user account. Are you sure you want to discard them and leave?')) {
            doExit();
            return;
        }
        return;
    }

    doExit();
};

window.confirmDiscard = function () {
    const confirmModal = document.getElementById('user-exit-confirm-modal');
    if (confirmModal) confirmModal.classList.add('hidden');
    window.toggleUserOverlay(false);
};

window.cancelExit = function () {
    const confirmModal = document.getElementById('user-exit-confirm-modal');
    if (confirmModal) confirmModal.classList.add('hidden');
};

window.handleUserStepNext = function () {
    if (userStep < 3) {
        if (userStep === 1) {
            // Validation for step 1
            const role = (document.getElementById('edit-user-role')?.value || '').trim();
            const fname = (document.getElementById('edit-user-firstname')?.value || '').trim();
            const mname = (document.getElementById('edit-user-middlename')?.value || '').trim();
            const lname = (document.getElementById('edit-user-lastname')?.value || '').trim();
            const gender = (document.getElementById('edit-user-gender')?.value || '').trim();

            if (!role || !fname || !mname || !lname || !gender) {
                window.showUserConfirm('Missing Fields', 'Please fill in all required fields (Role, First Name, Middle Name, Last Name, and Gender).', null, true);
                return;
            }

            // Check Duplicate: Block ONLY if Same Name + Same Gender + Same Role
            const currentUserId = window.isEditingUser ? (window.currentEditingUserId || document.getElementById('edit-user-id')?.value) : null;
            const users = getStoredJson(USER_STORAGE_KEY, []);
            const normalizeStr = s => String(s || '').trim().toLowerCase();
            const normalizedRole = normalizeUserRole(role);

            const duplicateUser = users.find(u => {
                if (currentUserId && String(u.uid || u.id || '') === String(currentUserId)) {
                    return false; // Skip current user in edit mode
                }
                const uFname = normalizeStr(u.firstName || u.fname);
                const uMname = normalizeStr(u.middleName || u.mname || u.middlename);
                const uLname = normalizeStr(u.lastName || u.lname);
                const uGender = normalizeStr(u.gender);
                const uRole = normalizeUserRole(u.role || u.type);

                const isSameName = (uFname === normalizeStr(fname)) &&
                                   (uMname === normalizeStr(mname)) &&
                                   (uLname === normalizeStr(lname));
                const isSameGender = uGender === normalizeStr(gender);
                const isSameRole = uRole === normalizedRole;

                return isSameName && isSameGender && isSameRole;
            });

            if (duplicateUser) {
                const fullDisplayName = `${fname} ${mname ? mname + ' ' : ''}${lname}`.trim();
                const dupId = duplicateUser.id || duplicateUser.uid || 'N/A';
                const dupMsg = `An active ${role} account for "${fullDisplayName}" (${gender}) already exists in the system with Login ID: ${dupId}.`;
                
                if (typeof window.showAlertDialog === 'function') {
                    window.showAlertDialog({
                        title: 'Duplicate Account Detected',
                        message: dupMsg,
                        buttonText: 'OK',
                        icon: 'fa-solid fa-triangle-exclamation text-amber-500'
                    });
                } else if (typeof window.showUserConfirm === 'function') {
                    window.showUserConfirm('Duplicate Account Detected', dupMsg, null, true);
                } else {
                    alert(dupMsg);
                }
                return;
            }

            window.generateUserId(role);
        } else if (userStep === 2) {
            // Validation for step 2
            const email = document.getElementById('edit-user-email').value.trim();
            if (!email) {
                window.showUserConfirm('Email Required', 'Please enter a Gmail username.', null, true);
                return;
            }
        }
        userStep++;
        window.updateUserStepUI();
    }
};

window.handleUserStepBack = function () {
    if (userStep === 2) {
        userStep--;
        window.updateUserStepUI();
    }
};

window.updateUserStepUI = function () {
    const previewCard = document.getElementById('user-account-preview-card');
    const segHeader = document.getElementById('user-segmented-header');
    const backBtn = document.getElementById('user-back-btn') || document.getElementById('user-step-back-btn');
    const nextBtn = document.getElementById('user-step-next-btn');
    const saveBtn = document.getElementById('user-save-btn');
    const finishBtn = document.getElementById('user-finish-btn');
    const addAnotherBtn = document.getElementById('user-add-another-btn');
    const saveLabel = document.getElementById('user-save-label');

    const setBtnVisibility = (btn, show) => {
        if (!btn) return;
        btn.classList.toggle('hidden', !show);
        if (!show) {
            btn.style.setProperty('display', 'none', 'important');
        } else {
            btn.style.removeProperty('display');
        }
    };

    if (window.isEditingUser) {
        // Edit Mode: Show all account fields together in one clean view
        const step1 = document.getElementById('user-step-1');
        const step2 = document.getElementById('user-step-2');
        const step3 = document.getElementById('user-step-3');
        if (step1) step1.classList.remove('hidden');
        if (step2) step2.classList.remove('hidden');
        if (step3) step3.classList.add('hidden');

        if (previewCard) previewCard.classList.add('hidden');
        if (segHeader) segHeader.classList.add('hidden');

        setBtnVisibility(backBtn, false);
        setBtnVisibility(nextBtn, false);
        setBtnVisibility(finishBtn, false);
        setBtnVisibility(addAnotherBtn, false);
        setBtnVisibility(saveBtn, true);
        if (saveLabel) saveLabel.textContent = 'Save Changes';
        window.validateUserStep2();
    } else {
        // Create Mode: 3-step wizard
        for (let i = 1; i <= 3; i++) {
            const step = document.getElementById(`user-step-${i}`);
            if (step) step.classList.toggle('hidden', i !== userStep);
        }

        if (previewCard) previewCard.classList.remove('hidden');
        if (segHeader) segHeader.classList.remove('hidden');

        setBtnVisibility(backBtn, userStep === 2); // Back button visible ONLY on step 2 (not step 1 or step 3)
        setBtnVisibility(nextBtn, userStep === 1); // Only next on step 1
        setBtnVisibility(saveBtn, userStep === 2); // Save (Create Account) on step 2
        if (saveLabel) saveLabel.textContent = 'Create Account';
        if (userStep === 2) window.validateUserStep2();
        setBtnVisibility(finishBtn, userStep === 3); // Close & Finish only on step 3
        setBtnVisibility(addAnotherBtn, userStep === 3); // Add Another User only on step 3

        // Animate bar tracks and labels (matching Subject & Section shared pattern)
        for (let n = 1; n <= 3; n++) {
            const bar = document.getElementById(`user-step-bar-${n}`);
            const track = document.getElementById(`step-bar-${n}-track`);
            const label = document.getElementById(`step-bar-${n}-label`);

            if (bar) {
                bar.classList.toggle('bg-[#15803d]/10', n === userStep);
                bar.classList.toggle('bg-slate-100', n !== userStep);
            }
            if (label && track) {
                if (n <= userStep) {
                    label.className = 'text-base font-bold capitalize tracking-normal transition-colors text-[#15803d] mb-3';
                    track.className = 'w-full h-1.5 bg-[#15803d] transition-all';
                } else {
                    label.className = 'text-base font-bold capitalize tracking-normal transition-colors text-black-fade mb-3';
                    track.className = 'w-full h-1.5 bg-slate-200 transition-all';
                }
            }
        }
    }
};

window.resetUserModalForNew = function () {
    const finalId = document.getElementById('user-final-id')?.textContent || '';
    const fname = document.getElementById('edit-user-firstname')?.value || '';
    const lname = document.getElementById('edit-user-lastname')?.value || '';
    const fullName = `${fname} ${lname}`.trim();

    userStep = 1;
    window.toggleUserOverlay(true);

    if (fullName && finalId && finalId !== '-' && finalId !== 'Unknown') {
        if (typeof window.showCreationBar === 'function') {
            window.showCreationBar({
                type: 'user',
                label: 'Created Account',
                primaryLabel: 'Full Name',
                primaryValue: fullName,
                secondaryLabel: 'Login ID',
                secondaryValue: finalId,
                status: 'published'
            });
        }
    }
};

window.handleRoleChange = function (role) {
    const gradeField = document.getElementById('grade-level-field');
    if (gradeField) gradeField.classList.toggle('hidden', role !== 'Student');
    // Auto-generate ID preview immediately when role is selected
    if (role) {
        window.generateUserId(role);
    }
};

// Storage keys for sequential counters
const USER_SEQ_KEY_PREFIX = 'sigma_id_seq_';

window.peekUserSeq = function (role) {
    const key = USER_SEQ_KEY_PREFIX + String(role).toLowerCase();
    return parseInt(localStorage.getItem(key) || '0') + 1;
};

window.commitUserSeq = function (role) {
    const key = USER_SEQ_KEY_PREFIX + String(role).toLowerCase();
    const next = parseInt(localStorage.getItem(key) || '0') + 1;
    localStorage.setItem(key, String(next));
};

window.generateUserId = function (role) {
    if (!role) return;

    // YY — last 2 digits of current year
    const year = String(new Date().getFullYear()).slice(-2);

    // BB — branch code from selected branch dropdown
    const branchSelect = document.getElementById('edit-user-school-branch');
    const selectedBranch = branchSelect ? branchSelect.value.trim() : '';
    const branchCode = (typeof window.getSchoolBranchCode === 'function')
        ? window.getSchoolBranchCode(selectedBranch)
        : '01';

    // RR — role code
    const roleCode = role === 'Master Admin' ? '00' : role === 'Admin' ? '01' : role === 'Teacher' ? '02' : '03';

    // S — sequential (peek: what the NEXT number will be, without committing yet)
    const seq = window.peekUserSeq(role);

    const id = `${year}${branchCode}${roleCode}${seq}`;

    const idInput = document.getElementById('edit-user-id');
    if (idInput) idInput.value = id;

    window.updateUserPreview();
};

window.updateUserPreview = function () {
    const idInput = document.getElementById('edit-user-id');
    const lnameInput = document.getElementById('edit-user-lastname');
    const emailInput = document.getElementById('edit-user-email');

    const id = idInput ? idInput.value || 'Not generated yet' : 'Not generated yet';
    const lname = lnameInput ? lnameInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';

    // Password = lowercase(lastname) + id  e.g. garcia26-01-03-1
    const password = lname && id !== 'Not generated yet'
        ? `${lname.toLowerCase()}${id}`
        : null;

    const prevId = document.getElementById('user-preview-id');
    const prevPass = document.getElementById('user-preview-password');
    const instEmail = document.getElementById('user-instruction-email');
    const finalId = document.getElementById('user-final-id');
    const finalPass = document.getElementById('user-final-password');
    const passInput = document.getElementById('edit-user-password');
    const instCopy = document.getElementById('user-instruction-copy');

    if (prevId) prevId.textContent = id;
    if (prevPass) prevPass.textContent = password || 'Waiting for last name';
    if (passInput) passInput.value = password || '';
    if (instEmail) instEmail.textContent = email ? `${email}@gmail.com` : 'the provided Gmail';
    if (finalId) finalId.textContent = id;
    if (finalPass) finalPass.textContent = password || '-';
    if (instCopy) instCopy.innerHTML = `Login ID: ${id}<br>Password: ${password || '-'}`;
};

window.autoGenerateUserEmail = function () {
    const fname = (document.getElementById('edit-user-firstname')?.value || '').trim();
    const lname = (document.getElementById('edit-user-lastname')?.value || '').trim();
    const id = (document.getElementById('edit-user-id')?.value || '').trim();
    const emailInput = document.getElementById('edit-user-email');

    if (!emailInput) return;

    let basePrefix = '';
    const cleanFirst = fname.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanLast = lname.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanId = id.toLowerCase().replace(/[^0-9]/g, '');

    if (cleanFirst && cleanLast) {
        basePrefix = `${cleanFirst}.${cleanLast}`;
    } else if (cleanLast) {
        basePrefix = `${cleanLast}.${cleanId || 'user'}`;
    } else if (cleanFirst) {
        basePrefix = `${cleanFirst}.${cleanId || 'user'}`;
    } else {
        basePrefix = `user.${cleanId || Math.floor(1000 + Math.random() * 9000)}`;
    }

    emailInput.value = basePrefix;
    window.validateUserStep2();
    if (typeof window.updateUserCredentialPreview === 'function') {
        window.updateUserCredentialPreview();
    }
};

window.validateUserStep2 = function () {
    const emailInput = document.getElementById('edit-user-email');
    const emailPrefix = (emailInput?.value || '').trim().toLowerCase();
    const saveBtn = document.getElementById('user-save-btn');
    const dupWarningEl = document.getElementById('user-email-duplicate-warning');

    if (!emailPrefix) {
        if (emailInput) {
            emailInput.classList.remove('!border-rose-500', '!text-rose-700');
        }
        if (dupWarningEl) {
            dupWarningEl.classList.add('hidden');
            dupWarningEl.innerHTML = '';
        }
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.style.opacity = '0.5';
            saveBtn.style.cursor = 'not-allowed';
        }
        return false;
    }

    const fullEmail = `${emailPrefix}@gmail.com`;
    const users = getStoredJson(USER_STORAGE_KEY, []);
    const currentId = window.isEditingUser ? (window.currentEditingUserId || document.getElementById('edit-user-id')?.value) : null;

    // Check duplicate against all stored users
    const duplicateUser = users.find(u => {
        if (currentId && String(u.uid || u.id || '') === String(currentId)) {
            return false; // Skip current user when editing
        }
        const userEmail = String(u.email || '').trim().toLowerCase();
        const userPrefix = userEmail.replace(/@gmail\.com$/i, '').replace(/@.*$/i, '');
        return userEmail === fullEmail || userPrefix === emailPrefix;
    });

    // Also check against Master Admin if not current user
    const isMasterAdminDup = (!currentId || currentId !== '0000000') && (emailPrefix === 'stanley' || fullEmail === 'stanley@gmail.com');

    if (duplicateUser || isMasterAdminDup) {
        const dupName = duplicateUser ? (duplicateUser.fullName || `${duplicateUser.firstName || ''} ${duplicateUser.lastName || ''}`.trim() || `User #${duplicateUser.id || duplicateUser.uid}`) : 'Master Admin (Stanley Garcia)';
        const dupId = duplicateUser ? (duplicateUser.id || duplicateUser.uid || '') : '0000000';

        if (emailInput) {
            emailInput.classList.add('!border-rose-500', '!text-rose-700');
        }
        if (dupWarningEl) {
            dupWarningEl.innerHTML = `<i class="fa-solid fa-circle-exclamation text-rose-500"></i> This Gmail is already in use by <strong>${escapeHtml(dupName)}</strong> (ID #${escapeHtml(dupId)}).`;
            dupWarningEl.classList.remove('hidden');
        }
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.style.opacity = '0.5';
            saveBtn.style.cursor = 'not-allowed';
        }
        return false;
    }

    if (emailInput) {
        emailInput.classList.remove('!border-rose-500', '!text-rose-700');
    }
    if (dupWarningEl) {
        dupWarningEl.classList.add('hidden');
        dupWarningEl.innerHTML = '';
    }

    let hasChanges = true;
    if (window.isEditingUser) {
        if (window.originalEditingUserState && typeof window.getUserFormStateSnapshot === 'function') {
            hasChanges = window.getUserFormStateSnapshot() !== window.originalEditingUserState;
        } else {
            hasChanges = false;
        }
    }

    const canSave = Boolean(emailPrefix) && hasChanges;

    if (saveBtn) {
        saveBtn.disabled = !canSave;
        saveBtn.style.opacity = canSave ? '1' : '0.5';
        saveBtn.style.cursor = canSave ? 'pointer' : 'not-allowed';
    }
    return canSave;
};

window.handleUserSave = function () {
    if (!window.validateUserStep2()) {
        const emailInput = document.getElementById('edit-user-email');
        emailInput?.focus();
        return;
    }

    const loadingIcon = document.getElementById('user-save-loading');
    const saveLabel = document.getElementById('user-save-label');

    if (loadingIcon) loadingIcon.classList.remove('hidden');
    if (saveLabel) saveLabel.textContent = 'Creating...';

    setTimeout(() => {
        try {
            const users = getStoredJson(USER_STORAGE_KEY, []);

            const idEl = document.getElementById('edit-user-id');
            const fnameEl = document.getElementById('edit-user-firstname');
            const mnameEl = document.getElementById('edit-user-middlename');
            const lnameEl = document.getElementById('edit-user-lastname');
            const emailEl = document.getElementById('edit-user-email');
            const roleEl = document.getElementById('edit-user-role');
            const genderEl = document.getElementById('edit-user-gender');
            const branchEl = document.getElementById('edit-user-school-branch');

            const id = idEl ? idEl.value : '';
            const fname = fnameEl ? fnameEl.value.trim() : '';
            const mname = mnameEl ? mnameEl.value.trim() : '';
            const lname = lnameEl ? lnameEl.value.trim() : '';
            const email = emailEl ? emailEl.value.trim() : '';
            const role = roleEl ? roleEl.value : 'User';
            const gender = genderEl ? genderEl.value : '';
            const branch = branchEl ? branchEl.value : 'Main Campus';

            const isNewMaster = role === 'Master Admin';
            let defaultPerms = {
                masterAdmin: isNewMaster,
                schoolMain: true,
                schoolProfile: isNewMaster, // Default false for all created Admins, only Master Admin defaults to true
                schoolYear: true,
                syAuthority: true,
                syManage: true,
                syCreateEdit: true,
                syDelete: isNewMaster,
                schoolSections: true,
                schoolSectionsDelete: isNewMaster,
                schoolSubjects: true,
                subjectAuthority: true,
                subjectManage: true,
                subjectCreateEdit: true,
                subjectDelete: isNewMaster,
                manageAdmins: isNewMaster,
                manageTeachers: true,
                manageStudents: true,
                actionPassword: true,
                actionLock: true,
                actionDeactivate: isNewMaster,
                actionDelete: isNewMaster,
                reportsMain: true,
                reportsDescriptive: true,
                reportsPredictive: true,
                reportsPrescriptive: true,
                resourcesMain: true,
                resourcesMaterials: true,
                resourcesStorage: true,
                auditMain: true,
                auditAi: true,
                auditActivity: true,
                auditAuth: true,
                settingsMain: true,
                settingsBranding: true,
                settingsApi: true,
                settingsSecurity: true,
                bio: true,
                achievements: isNewMaster || role === 'Student',
                subjects: isNewMaster || role === 'Teacher' || role === 'Student',
                sections: isNewMaster || role === 'Teacher' || role === 'Student'
            };

            const userFullName = [fname, mname, lname].filter(Boolean).join(' ');

            const userData = {
                id: id,
                uid: id,
                firstName: fname,
                middleName: mname,
                lastName: lname,
                fullName: userFullName,
                gender: gender,
                branch: branch,
                email: email ? `${email}@gmail.com` : '',
                role: role,
                type: role.toUpperCase(),
                status: 'Active',
                password: lname ? `${lname.toLowerCase()}${id}` : id,
                permissions: defaultPerms
            };

            const existingIndex = users.findIndex(u => String(u.id || u.uid) === String(id));
            const previousUser = existingIndex !== -1 ? { ...users[existingIndex] } : null;
            if (existingIndex !== -1) {
                // Update existing user - preserve createdAt, password, status, permissions, picture
                users[existingIndex] = {
                    ...users[existingIndex],
                    ...userData,
                    status: users[existingIndex].status || 'Active',
                    password: users[existingIndex].password || userData.password,
                    permissions: users[existingIndex].permissions || userData.permissions,
                    updatedAt: new Date().toISOString()
                };
            } else {
                // Add new user
                userData.createdAt = new Date().toISOString();
                userData.createdVia = 'admin-panel';
                
                // Calculate sequential number (highest seq + 1)
                const maxSeq = users.reduce((max, u) => Math.max(max, u.seq || 0), -1);
                userData.seq = maxSeq + 1;
                
                users.unshift(userData);

                // Commit the sequential counter for this role (only for new users)
                if (typeof window.commitUserSeq === 'function') {
                    window.commitUserSeq(role);
                }
            }

            saveStoredJson(USER_STORAGE_KEY, users);

            // Propagate user changes to all connected sections, subjects, rosters, and session
            if (typeof window.propagateUserUpdateToAllConnected === 'function') {
                window.propagateUserUpdateToAllConnected(existingIndex !== -1 ? users[existingIndex] : userData, previousUser);
            }

            // Save info for the notification bar (only for new users)
            if (!window.isEditingUser) {
                sessionStorage.setItem('sigma-new-user-toast', JSON.stringify({
                    id: userData.id,
                    name: `${userData.firstName} ${userData.lastName}`
                }));
                // After saving new user, move to Step 3 (Success Screen)
                userStep = 3;
                window.updateUserStepUI();
            } else {
                window.toggleUserOverlay(false);
                if (typeof window.showToastNotification === 'function') {
                    window.showToastNotification(`User #${userData.id} updated successfully.`, 'success');
                }
                const updatedUser = users[existingIndex];
                if (window.currentUserProfileData && String(window.currentUserProfileData.id || window.currentUserProfileData.uid) === String(userData.id)) {
                    window.currentUserProfileData = { ...updatedUser };
                    if (typeof window.populateUserProfilePage === 'function') {
                        window.populateUserProfilePage(updatedUser);
                    }
                    if (typeof window.syncUserProfileData === 'function') {
                        window.syncUserProfileData();
                    }
                }
            }

            if (typeof renderUserAccountsTable === 'function') {
                renderUserAccountsTable();
            }
        } catch (error) {
            console.error('Error saving user:', error);
            window.showUserConfirm('Error', 'An error occurred while saving the account. Please try again.', null, true);
        } finally {
            if (loadingIcon) loadingIcon.classList.add('hidden');
            if (saveLabel) saveLabel.textContent = window.isEditingUser ? 'Save Changes' : 'Create Account';
        }
    }, 1000);
};

window.openEditUserInformation = function (userId) {
    if (!userId) return;
    const users = getStoredJson(USER_STORAGE_KEY, []);
    const user = users.find(u => String(u.uid || u.id || '') === String(userId));
    if (!user) return;
    if (typeof window.toggleUserOverlay === 'function') {
        window.toggleUserOverlay(true, user);
    }
};

window.sendCredentialsViaGmail = function () {
    const email = document.getElementById('edit-user-email')?.value;
    const fullEmail = email ? `${email}@gmail.com` : '';
    const id = document.getElementById('user-final-id')?.textContent || '';
    const pass = document.getElementById('user-final-password')?.textContent || '';

    const subject = encodeURIComponent('Your SIGMA ELMS Login Credentials');
    const body = encodeURIComponent(`Hello,\n\nYour account has been created successfully.\n\nLogin ID: ${id}\nPassword: ${pass}\n\nYou can log in at the portal using either your ID or Gmail address.\n\nBest regards,\nInterface Computer College`);

    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${fullEmail}&su=${subject}&body=${body}`;
    window.open(gmailUrl, '_blank');
};

window.handleUserSaveAndClose = function () {
    window.handleUserSave();
};

window.finishUserCreation = function () {
    const finalId = document.getElementById('user-final-id')?.textContent || '';
    const fname = document.getElementById('edit-user-firstname')?.value || '';
    const lname = document.getElementById('edit-user-lastname')?.value || '';
    const fullName = `${fname} ${lname}`.trim();

    window.toggleUserOverlay(false);
    if (typeof renderUserAccountsTable === 'function') {
        renderUserAccountsTable();
    }

    if (fullName && finalId && finalId !== '-' && finalId !== 'Unknown') {
        if (typeof window.showCreationBar === 'function') {
            window.showCreationBar({
                type: 'user',
                label: 'Created Account',
                primaryLabel: 'Full Name',
                primaryValue: fullName,
                secondaryLabel: 'Login ID',
                secondaryValue: finalId,
                status: 'published'
            });
        }
    }
};

window.downloadUserCredentialsTXT = function () {
    const finalId = document.getElementById('user-final-id')?.textContent ||
        document.getElementById('edit-user-id')?.value || 'Unknown';
    const finalPass = document.getElementById('user-final-password')?.textContent ||
        document.getElementById('edit-user-password')?.value || 'Unknown';
    const fname = document.getElementById('edit-user-firstname')?.value || '';
    const lname = document.getElementById('edit-user-lastname')?.value || '';
    const role = document.getElementById('edit-user-role')?.value || 'User';

    const textContent = `SIGMA ELMS - ACCOUNT CREDENTIALS
================================

Name: ${fname} ${lname}
Role: ${role}

Login ID: ${finalId}
Password: ${finalPass}

Please keep this file secure. You can use these credentials to log in at the index page.`;

    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${lname.toLowerCase()}_credentials.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

window.sendUserCredentialsEmail = function () {
    const email = document.getElementById('edit-user-email')?.value || '';
    if (email) {
        window.showUserConfirm('Success', `Account credentials have been sent to ${email}@gmail.com successfully.`, null, true);
    } else {
        window.showUserConfirm('Sent', 'Account credentials have been sent to the user\'s email.', null, true);
    }
};

window.viewUserProfile = function (userId) {
    if (!userId) return;
    window.editUser(userId, true);
};

window.editUserAccountProfile = function (userId) {
    const loggedIn = (typeof window.getLoggedInAdminUser === 'function') ? window.getLoggedInAdminUser() : null;
    const cleanAuthId = String(loggedIn?.uid || loggedIn?.id || '').replace(/^#/, '').trim();
    const cleanTargetId = String(userId || '').replace(/^#/, '').trim();
    if (cleanAuthId && cleanTargetId && (cleanAuthId === cleanTargetId || (cleanAuthId === '0000000' && cleanTargetId === '0000000'))) {
        window.editUser(userId, true);
        return;
    }
    window.editUser(userId, false);
};

window.handleUserDiscard = function () {
    window.showUserConfirm('Discard Changes', 'Are you sure you want to discard your changes?', () => {
        window.toggleUserOverlay(false);
    });
};

window.editUser = function (userId, isReadOnly = false) {
    if (!userId) return;

    const cleanId = String(userId).replace(/^#/, '').trim();
    const users = getStoredJson(USER_STORAGE_KEY, []);
    const user = users.find(u => String(u.uid || u.id || '').replace(/^#/, '').trim() === cleanId);

    if (!user) {
        console.warn('User not found:', userId, '- Redirecting to User Accounts view.');
        if (window.history && window.history.replaceState) {
            window.history.replaceState({ tab: 'nav-users-accounts' }, '', '#users');
        } else {
            window.location.hash = '#users';
        }
        const profileView = document.getElementById('user-profile-view');
        if (profileView) profileView.classList.add('hidden');
        window.currentUserProfileData = {};
        window.currentViewingUserId = null;
        window.currentEditingUserId = null;

        const usersView = document.getElementById('users-view');
        if (usersView) usersView.classList.remove('hidden');

        if (typeof window.switchTab === 'function') {
            window.switchTab('nav-users-accounts', false);
        }
        if (typeof window.renderUserAccountsTable === 'function') {
            window.renderUserAccountsTable();
        }
        return;
    }

    const targetHash = `${isReadOnly ? 'profile' : 'edit-user'}-${cleanId}`;

    if (window.location.hash.slice(1) !== targetHash) {
        history.pushState({ type: isReadOnly ? 'profile' : 'edit-user', userId }, '', '#' + targetHash);
    }

    window.currentViewingUserId = userId;
    window.currentEditingUserId = isReadOnly ? null : userId;
    const sections = document.querySelectorAll('.dynamic-section');
    sections.forEach(s => s.classList.add('hidden'));

    const adminMain = document.getElementById('admin-main');
    if (adminMain) adminMain.scrollTop = 0;
    window.scrollTo(0, 0);

    const target = document.getElementById('user-profile-view');
    if (target) target.classList.remove('hidden');

    // Close header profile dropdown / slideout drawer so it never pops open or shows edited user
    const profileDropdown = document.getElementById('profileDropdownMenu') || document.getElementById('profile-dropdown');
    if (profileDropdown) profileDropdown.classList.add('hidden');
    const profileToggleBtn = document.getElementById('profileDropdownBtn') || document.getElementById('profile-toggle');
    if (profileToggleBtn) profileToggleBtn.classList.remove('active');
    if (typeof window.hideHeaderOverlays === 'function') {
        window.hideHeaderOverlays();
    }

    // Keep navigation state on user accounts in the sidebar
    if (typeof window.updateNavState === 'function') {
        window.updateNavState('nav-users-accounts');
    }

    const selfAdminAvatar = (String(user.uid || user.id) === '0000000')
        ? (window.getCurrentUserAvatar ? window.getCurrentUserAvatar('0000000') : localStorage.getItem('sigma_admin_avatar_base64'))
        : '';

    window.currentUserProfileData = {
        id: user.uid || user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role || user.type,
        status: user.status || 'Active',
        gender: user.gender || 'Not specified',
        phone: user.phone || 'Not provided',
        address: user.address || 'Not provided',
        gradeLevel: user.grade || user.gradeLevel || 'N/A',
        schoolBranch: user.schoolBranch || 'Main Campus',
        bios: user.bios || [],
        avatar: user.avatar || selfAdminAvatar || '',
        permissions: user.permissions || { bio: true, achievements: false, subjects: false, sections: false },
        isReadOnly
    };

    if (typeof window.populateUserProfilePage === 'function') {
        window.populateUserProfilePage();
    }

    // Explicitly guarantee topbar header profile icon and dropdown menu remain the logged-in admin
    if (typeof window.syncUserProfileData === 'function') {
        window.syncUserProfileData();
    }

    document.querySelectorAll('.action-dropdown-menu').forEach(m => m.classList.remove('show'));
    document.querySelectorAll('.action-dots-btn').forEach(b => b.classList.remove('active'));
};

window.openUserEditor = function (userId) {
    if (userId) {
        window.editUserAccountProfile(userId);
    } else {
        window.toggleUserOverlay(true);
    }
};

// Return to Dashboard on Logo Click
// Global Search Bar Integration
document.addEventListener('DOMContentLoaded', () => {
    const searchBar = document.getElementById('searchBar');
    const searchBtn = document.getElementById('globalSearchBtn');

    const triggerGlobalSearch = () => {
        const query = (searchBar?.value || '').trim();

        // Check for User Edit Overlay
        const userEditOverlay = document.getElementById('user-edit-overlay');
        if (userEditOverlay && !userEditOverlay.classList.contains('hidden')) {
            if (typeof window.toggleUserOverlay === 'function') {
                window.toggleUserOverlay(false);
                return;
            }
        }

        // Check for Permissions Overlay
        const permOverlay = document.getElementById('user-permissions-overlay');
        if (permOverlay && !permOverlay.classList.contains('hidden')) {
            if (typeof window.toggleUserPermissionsOverlay === 'function') {
                window.toggleUserPermissionsOverlay(false);
                return;
            }
        }

        const visibleSection = Array.from(document.querySelectorAll('.dynamic-section:not(.hidden)'))[0];
        if (!visibleSection) return;

        const sectionId = visibleSection.id;

        // Handle Back from Profile View
        if (sectionId === 'user-profile-view') {
            if (typeof window.switchTab === 'function') {
                window.switchTab('nav-users-accounts');
                // If there's a query, wait for the tab switch then apply it
                if (query) {
                    setTimeout(() => {
                        const nameInput = document.getElementById('user-search-name');
                        if (nameInput) {
                            nameInput.value = query;
                            if (typeof window.applyUserAccountSearch === 'function') window.applyUserAccountSearch();
                        }
                    }, 50);
                }
            }
            return;
        }

        if (sectionId === 'users-view') {
            const nameInput = document.getElementById('user-search-name');
            if (nameInput) {
                nameInput.value = query;
                if (typeof window.applyUserAccountSearch === 'function') window.applyUserAccountSearch();
            }
        } else if (sectionId === 'school-subjects-view') {
            const nameInput = document.getElementById('subject-search-name');
            if (nameInput) {
                nameInput.value = query;
                if (typeof window.applySubjectSearch === 'function') window.applySubjectSearch();
            }
        } else if (sectionId === 'school-sections-view') {
            const nameInput = document.getElementById('section-search-name');
            if (nameInput) {
                nameInput.value = query;
                if (typeof window.applySectionSearch === 'function') window.applySectionSearch();
            }
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

    const logoBtn = document.getElementById('nav-logo-btn');
    if (logoBtn) {
        logoBtn.addEventListener('click', () => {
            if (typeof window.switchTab === 'function') {
                window.switchTab('nav-dashboard');
            }
        });
    }
    // Update header calendar icon date
    const dateNumberEl = document.getElementById('calendar-date-number');
    if (dateNumberEl) {
        dateNumberEl.textContent = new Date().getDate();
    }
    // Handle browser back/forward buttons and hash navigation
    function handleAdminRouteOrPopState(isPopState = false) {
        // If an active modal, form, or overlay is currently being closed via back navigation, let modal closer handle it
        if (typeof window.getSigmaActiveModalCloser === 'function' && window.getSigmaActiveModalCloser()) {
            return;
        }

        let rawHash = '';
        try {
            rawHash = decodeURIComponent((window.location.hash || '').replace(/^#/, '').trim());
        } catch (e) {
            rawHash = (window.location.hash || '').replace(/^#/, '').trim();
        }
        const hash = rawHash.replace(/[_\s]+/g, '-');

        // Close floating overlays when navigating
        const editOverlay = document.getElementById('user-edit-overlay');
        if (editOverlay && !editOverlay.classList.contains('hidden')) {
            if (typeof window.toggleUserOverlay === 'function') {
                window.toggleUserOverlay(false);
            } else {
                editOverlay.classList.add('hidden');
            }
        }

        const permOverlay = document.getElementById('user-permissions-overlay');
        if (permOverlay && !permOverlay.classList.contains('hidden')) {
            permOverlay.classList.add('hidden');
        }

        const profileView = document.getElementById('user-profile-view');
        const isProfileHash = hash.startsWith('profile-') || hash.startsWith('edit-user-');

        if (profileView && !profileView.classList.contains('hidden') && !isProfileHash) {
            profileView.classList.add('hidden');
            window.currentUserProfileData = {};
            window.currentViewingUserId = null;
            window.currentEditingUserId = null;
        }

        if (!hash || hash === 'nav-dashboard' || hash === 'dashboard' || hash === 'home') {
            window.switchTab('nav-dashboard', true);
            return;
        }

        if (hash.startsWith('classroom:') || hash.startsWith('#classroom:')) {
            const cleanHash = hash.replace(/^#/, '');
            const parts = cleanHash.split(':');
            const secName = decodeURIComponent(parts[1] || '');
            const subjName = decodeURIComponent(parts[2] || '');
            const tabName = parts[3] || 'topics';
            if (typeof window.showAdminClassroom === 'function') {
                window.showAdminClassroom(secName, subjName, tabName);
            }
            return;
        }

        if (hash.startsWith('topic:') || hash.startsWith('#topic:')) {
            const cleanHash = hash.replace(/^#/, '');
            const parts = cleanHash.split(':');
            const subjId = decodeURIComponent(parts[1] || '');
            const secName = decodeURIComponent(parts[2] || '');
            const subjName = decodeURIComponent(parts[3] || '');
            if (typeof window.switchToAdminTopicPage === 'function') {
                window.switchToAdminTopicPage(subjId, secName, subjName, false);
            }
            return;
        }

        if (hash.startsWith('topic-content:') || hash.startsWith('#topic-content:')) {
            const cleanHash = hash.replace(/^#/, '');
            const parts = cleanHash.split(':');
            const subjId = decodeURIComponent(parts[1] || '');
            const topIdx = parseInt(parts[2] || '0', 10) || 0;
            const tabName = parts[3] || 'videos';
            const itmIdx = (parts[4] !== undefined && parts[4] !== '' && parts[4] !== 'null') ? parseInt(parts[4], 10) : null;
            const secName = (parts[5] && parts[5] !== 'submission') ? decodeURIComponent(parts[5]) : '';
            const isSubMode = cleanHash.includes(':submission');
            if (typeof window.openTopicContent === 'function') {
                window.openTopicContent(subjId, topIdx, tabName, itmIdx, false, {
                    selectedSection: secName,
                    viewSubmission: isSubMode,
                    _studentViewSubmissionMode: isSubMode,
                    _sharedViewSubmissionMode: isSubMode
                });
            }
            return;
        }

        if (hash.startsWith('profile-')) {
            const userId = hash.replace('profile-', '');
            window.editUser(userId, true);
        } else if (hash.startsWith('edit-user-')) {
            const userId = hash.replace('edit-user-', '');
            window.editUser(userId, false);
        } else if (hash === 'nav-users' || hash === 'nav-users-accounts' || hash === 'users' || hash === 'users-accounts') {
            window.switchTab('nav-users-accounts', true);
        } else if (hash === 'sections' || hash === 'school-sections' || hash === 'nav-school-sections') {
            window.switchTab('nav-school-sections', true);
        } else if (hash === 'subjects' || hash === 'school-subjects' || hash === 'nav-school-subjects') {
            window.switchTab('nav-school-subjects', true);
        } else if (hash === 'school-year' || hash === 'nav-school-year') {
            window.switchTab('nav-school-year', true);
        } else if (hash === 'school-profile' || hash === 'nav-school-profile') {
            window.switchTab('nav-school-profile', true);
        } else if (hash === 'resources' || hash === 'nav-resources') {
            window.switchTab('nav-resources', true);
        } else if (hash === 'grades' || hash === 'nav-grades' || hash === 'school-grades' || hash === 'nav-school-grades' || hash === 'gradebooks' || hash === 'analytics' || hash.startsWith('grades:') || hash.startsWith('school-grades:')) {
            const savedState = (typeof window.loadSigmaGradesState === 'function') ? window.loadSigmaGradesState(false) : null;
            let targetTab = 'analytics';
            if (hash.includes('gradebook') || hash === 'gradebooks') {
                targetTab = 'gradebook';
            } else if (window._gradebookReturnPending && savedState?.activeTab === 'gradebook') {
                targetTab = 'gradebook';
            } else if (hash.includes('analytics') || hash === 'analytics') {
                targetTab = 'analytics';
            }
            if (window.sigmaGradesState) {
                window.sigmaGradesState.activeTab = targetTab;
            }
            window.switchTab('nav-school-grades', true);
        } else if (hash.startsWith('nav-')) {
            window.switchTab(hash, true);
        } else if (hash === 'account-settings' || hash.startsWith('account-settings-') || hash === 'user-settings') {
            const tab = hash.replace('account-settings-', '').replace('account-settings', '').replace('user-settings', '') || 'notifications';
            if (typeof window.navigateToAccountSettings === 'function') {
                window.navigateToAccountSettings(tab);
            }
        } else if (hash === 'settings' || hash.startsWith('settings-') || hash === 'system-settings') {
            const tab = hash.replace('settings-', '').replace('settings', '') || 'security';
            window.switchTab('nav-settings-' + (tab || 'security'), true);
        } else {
            window.switchTab('nav-' + hash, true);
        }
    }

    window.addEventListener('popstate', (e) => {
        setTimeout(() => {
            if (window._isProcessingBack) return;
            handleAdminRouteOrPopState(true);
        }, 15);
    });

    window.addEventListener('hashchange', () => {
        setTimeout(() => {
            if (window._isProcessingBack) return;
            handleAdminRouteOrPopState(false);
        }, 15);
    });

    // Initial navigation based on hash or saved tab
    const rawInitialHash = (window.location.hash || '').replace(/^#/, '').trim();
    if (rawInitialHash) {
        setTimeout(() => handleAdminRouteOrPopState(false), 20);
    } else {
        // Check saved active tab in sessionStorage
        const savedTab = sessionStorage.getItem('sigma-admin-active-tab');
        if (savedTab) {
            try {
                const { navId } = JSON.parse(savedTab);
                if (navId) {
                    setTimeout(() => window.switchTab(navId), 20);
                    return;
                }
            } catch (e) {}
        }
        // Default to dashboard if no hash or saved tab
        setTimeout(() => window.switchTab('nav-dashboard', true), 20);
    }
    // --- SLIDER MANAGEMENT ---
    window.handleSlideUpload = (event, index) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const preview = document.getElementById(`login-slide-${index}-preview`);
        const placeholder = document.getElementById(`login-slide-${index}-placeholder`);
        const cancelBtn = document.getElementById(`login-slide-${index}-cancel`);

        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');

                // Proportional resizing (MAX 1920x1080) - NO CROPPING
                const MAX_WIDTH = 1920;
                const MAX_HEIGHT = 1080;
                let width = img.width;
                let height = img.height;

                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height); // Draws the WHOLE image

                const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                if (preview) {
                    preview.src = dataUrl;
                    preview.classList.remove('hidden');
                    if (cancelBtn) cancelBtn.classList.remove('hidden');
                }
                if (placeholder) placeholder.classList.add('hidden');
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    };

    window.saveSlidesSettings = () => {
        const btn = document.getElementById('slides-save-btn');
        const icon = btn?.querySelector('i');
        if (btn) btn.disabled = true;
        if (icon) {
            icon.classList.remove('hidden');
            icon.style.display = 'inline-block';
        }

        try {
            const slides = [];
            for (let i = 1; i <= 7; i++) {
                const preview = document.getElementById(`login-slide-${i}-preview`);
                if (preview && preview.src && !preview.classList.contains('hidden')) {
                    // Check if it's a valid data URL or a default path
                    if (preview.src.includes('data:image') || preview.src.includes('image/')) {
                        slides.push({
                            src: preview.src,
                            alt: `Campus Slide ${i}`
                        });
                    }
                }
            }

            if (slides.length === 0) {
                localStorage.removeItem('sigma-custom-login-slides');
            } else {
                localStorage.setItem('sigma-custom-login-slides', JSON.stringify(slides));
            }
        } catch (err) {
            console.error('Slider Save Error:', err);
            alert('Failed to save slides. Try fewer or smaller images.');
        } finally {
            setTimeout(() => {
                if (btn) btn.disabled = false;
                if (icon) icon.style.display = 'none';

                // Hide all cancel buttons as changes are now saved
                for (let i = 1; i <= 7; i++) {
                    const cancelBtn = document.getElementById(`login-slide-${i}-cancel`);
                    if (cancelBtn) cancelBtn.classList.add('hidden');
                }

                if (window.showToast) window.showToast('Login slideshow saved successfully');
                else alert('Login slideshow saved successfully');
            }, 800);
        }
    };

    // Initialize Slider Previews from Storage
    function initSliderPreviews() {
        const savedRaw = localStorage.getItem('sigma-custom-login-slides');
        if (savedRaw) {
            const saved = JSON.parse(savedRaw);
            saved.forEach((slide, idx) => {
                const i = idx + 1;
                const preview = document.getElementById(`login-slide-${i}-preview`);
                const placeholder = document.getElementById(`login-slide-${i}-placeholder`);
                const cancelBtn = document.getElementById(`login-slide-${i}-cancel`);
                if (preview) {
                    preview.src = slide.src;
                    preview.classList.remove('hidden');
                }
                if (placeholder) placeholder.classList.add('hidden');
            });
            // Hide/Clear others beyond saved length
            for (let i = saved.length + 1; i <= 7; i++) {
                const preview = document.getElementById(`login-slide-${i}-preview`);
                const placeholder = document.getElementById(`login-slide-${i}-placeholder`);
                const cancelBtn = document.getElementById(`login-slide-${i}-cancel`);
                if (preview) {
                    preview.src = '';
                    preview.classList.add('hidden');
                }
                if (placeholder) placeholder.classList.remove('hidden');
                if (cancelBtn) cancelBtn.classList.add('hidden');
            }
        }
    }
    initSliderPreviews();

    // --- CLEARING / CANCELING FUNCTIONS ---
    window.clearBrandingPreview = (logoType) => {
        const preview = document.getElementById(`${logoType}-preview`);
        const placeholder = document.getElementById(`${logoType}-placeholder`);
        const cancelBtn = document.getElementById(`${logoType}-cancel`);

        // Revert to last saved photo in localStorage
        const storageKey = logoType === 'login-logo' ? 'sigma-custom-login-logo' :
            logoType === 'login-bar-logo' ? 'sigma-custom-login-bar-logo' : 'sigma-custom-nav-logo';
        const saved = localStorage.getItem(storageKey);

        if (preview) {
            preview.src = saved ? saved : 'image/ICC logo.jpg';
            preview.classList.remove('hidden');
        }
        if (placeholder) placeholder.classList.add('hidden');
        if (cancelBtn) cancelBtn.classList.add('hidden');

        const input = document.getElementById(`${logoType}-input`);
        if (input) input.value = '';
    };

    window.deleteBranding = (logoType) => {
        const preview = document.getElementById(`${logoType}-preview`);
        const placeholder = document.getElementById(`${logoType}-placeholder`);
        const cancelBtn = document.getElementById(`${logoType}-cancel`);

        if (preview) {
            preview.src = '';
            preview.classList.add('hidden');
        }
        if (placeholder) placeholder.classList.remove('hidden');
        if (cancelBtn) cancelBtn.classList.remove('hidden');

        const input = document.getElementById(`${logoType}-input`);
        if (input) input.value = '';
    };

    window.clearSlidePreview = (index) => {
        const preview = document.getElementById(`login-slide-${index}-preview`);
        const placeholder = document.getElementById(`login-slide-${index}-placeholder`);
        const cancelBtn = document.getElementById(`login-slide-${index}-cancel`);

        if (cancelBtn) cancelBtn.classList.add('hidden');

        // Revert to last saved slide from localStorage
        const savedRaw = localStorage.getItem('sigma-custom-login-slides');
        let restored = false;
        if (savedRaw) {
            const saved = JSON.parse(savedRaw);
            // Check if there is a slide at this index (0-indexed in array)
            if (saved[index - 1]) {
                if (preview) {
                    preview.src = saved[index - 1].src;
                    preview.classList.remove('hidden');
                }
                if (placeholder) placeholder.classList.add('hidden');
                restored = true;
            }
        }

        // If no custom saved slide, check for factory defaults (1-5)
        if (!restored) {
            const defaults = [
                'image/ICC Shs.jpg',
                'image/ICC Enrollment.jpg',
                'image/ICC Immersion.jpg',
                'image/ICC Interfacer.jpg',
                'image/ICC Learning.jpg'
            ];
            const factoryDefault = defaults[index - 1];

            if (factoryDefault) {
                if (preview) {
                    preview.src = factoryDefault;
                    preview.classList.remove('hidden');
                }
                if (placeholder) placeholder.classList.add('hidden');
            } else {
                // Truly blank (Slide 6-7)
                if (preview) {
                    preview.src = '';
                    preview.classList.add('hidden');
                }
                if (placeholder) placeholder.classList.remove('hidden');
            }
        }

        if (cancelBtn) cancelBtn.classList.add('hidden');
        // Clear file input
        const input = document.getElementById(`login-slide-${index}-input`);
        if (input) input.value = '';
    };

    window.deleteSlide = (index) => {
        const preview = document.getElementById(`login-slide-${index}-preview`);
        const placeholder = document.getElementById(`login-slide-${index}-placeholder`);
        const cancelBtn = document.getElementById(`login-slide-${index}-cancel`);

        if (preview) {
            preview.src = '';
            preview.classList.add('hidden');
        }
        if (placeholder) placeholder.classList.remove('hidden');
        if (cancelBtn) cancelBtn.classList.remove('hidden');

        const input = document.getElementById(`login-slide-${index}-input`);
        if (input) input.value = '';
    };

    // --- WELCOME PANEL MANAGEMENT ---
    window.handleWelcomePanelUpload = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const preview = document.getElementById('welcome-panel-preview');
        const cancelBtn = document.getElementById('welcome-panel-cancel');

        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                if (preview) {
                    preview.src = reader.result;
                }
                if (cancelBtn) cancelBtn.classList.remove('hidden');
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    };

    window.saveWelcomePanelSettings = () => {
        const btn = document.getElementById('welcome-panel-save-btn');
        const icon = btn?.querySelector('i');
        const cancelBtn = document.getElementById('welcome-panel-cancel');
        if (btn) btn.disabled = true;
        if (icon) {
            icon.classList.remove('hidden');
            icon.style.display = 'inline-block';
        }

        try {
            const welcomePanel = document.getElementById('welcome-panel-preview')?.src || 'image/ICC Goals.jpeg';
            localStorage.setItem('sigma-welcome-panel', welcomePanel);

            // Immediately update the admin dashboard banner on the live page
            const adminDashImg = document.getElementById('welcome-panel-admin-img');
            if (adminDashImg) {
                adminDashImg.src = welcomePanel;
            }

            window.dispatchEvent(new CustomEvent('sigma:welcome-panel-changed', { detail: welcomePanel }));

            setTimeout(() => {
                if (btn) btn.disabled = false;
                if (icon) {
                    icon.classList.add('hidden');
                    icon.style.display = 'none';
                }
                if (cancelBtn) cancelBtn.classList.add('hidden');
                if (window.showToast) window.showToast('Welcome panel saved successfully');
                else alert('Welcome panel saved successfully');
            }, 500);
        } catch (error) {
            console.error('Error saving welcome panel:', error);
            if (btn) btn.disabled = false;
            if (icon) {
                icon.classList.add('hidden');
                icon.style.display = 'none';
            }
            alert('Failed to save welcome panel');
        }
    };

    window.clearWelcomePanelPreview = () => {
        const preview = document.getElementById('welcome-panel-preview');
        const cancelBtn = document.getElementById('welcome-panel-cancel');

        if (cancelBtn) cancelBtn.classList.add('hidden');

        let saved = localStorage.getItem('sigma-welcome-panel');
        if (saved === 'image/Welcome.jpg') {
            saved = 'image/ICC Goals.jpeg';
            localStorage.setItem('sigma-welcome-panel', saved);
        }
        if (saved) {
            if (preview) preview.src = saved;
        } else {
            if (preview) preview.src = 'image/ICC Goals.jpeg';
        }

        const input = document.getElementById('welcome-panel-input');
        if (input) input.value = '';
    };

    window.deleteWelcomePanel = () => {
        const preview = document.getElementById('welcome-panel-preview');
        const cancelBtn = document.getElementById('welcome-panel-cancel');

        if (preview) {
            preview.src = 'image/ICC Goals.jpeg';
        }
        if (cancelBtn) cancelBtn.classList.remove('hidden');

        const input = document.getElementById('welcome-panel-input');
        if (input) input.value = '';
    };

    function initWelcomePanel() {
        let saved = localStorage.getItem('sigma-welcome-panel');
        if (!saved || saved === 'image/Welcome.jpg' || saved === '../image/Welcome.jpg') {
            saved = 'image/ICC Goals.jpeg';
            localStorage.setItem('sigma-welcome-panel', saved);
        }
        const preview = document.getElementById('welcome-panel-preview');
        if (preview) {
            preview.src = saved;
            preview.onerror = function() { this.src = 'image/ICC Goals.jpeg'; };
        }
        const adminDashImg = document.getElementById('welcome-panel-admin-img');
        if (adminDashImg) {
            adminDashImg.src = saved;
            adminDashImg.onerror = function() { this.src = 'image/ICC Goals.jpeg'; };
        }
    }
    initWelcomePanel();

    window.addEventListener('storage', (e) => {
        if (e.key === 'sigma-welcome-panel' && e.newValue) {
            const adminDashImg = document.getElementById('welcome-panel-admin-img');
            if (adminDashImg) adminDashImg.src = e.newValue;
            const previewImg = document.getElementById('welcome-panel-preview');
            if (previewImg) previewImg.src = e.newValue;
        }
    });

    window.addEventListener('sigma:welcome-panel-changed', (e) => {
        const url = e.detail;
        if (url) {
            const adminDashImg = document.getElementById('welcome-panel-admin-img');
            if (adminDashImg) adminDashImg.src = url;
            const previewImg = document.getElementById('welcome-panel-preview');
            if (previewImg) previewImg.src = url;
        }
    });

    // --- MATERIAL LIMITS MANAGEMENT ---
    let _savedMaterialLimitsSnapshot = '';

    function getMaterialLimitsFormSnapshot() {
        const getVal = (id) => document.getElementById(id)?.value?.trim() || '';
        return JSON.stringify({
            videoEmbed: getVal('limit-video-embed'),
            videoMp4: getVal('limit-video-mp4'),
            videoExt: getVal('limit-video-ext'),
            docxStd: getVal('limit-docx-std') || getVal('limit-docx-reg'),
            docxExt: getVal('limit-docx-ext'),
            pdfStd: getVal('limit-pdf-std') || getVal('limit-pdf-reg'),
            pdfExt: getVal('limit-pdf-ext'),
            pptxStd: getVal('limit-pptx-std') || getVal('limit-pptx-reg'),
            pptxExt: getVal('limit-pptx-ext')
        });
    }

    window.updateMaterialLimitsButtonState = function () {
        const btn = document.getElementById('limits-save-btn') || document.querySelector('#integ-limits-panel button[onclick*="saveMaterialLimits"]');
        if (!btn) return;
        const currentSnapshot = getMaterialLimitsFormSnapshot();
        const isDirty = Boolean(_savedMaterialLimitsSnapshot && (currentSnapshot !== _savedMaterialLimitsSnapshot));
        
        btn.disabled = !isDirty;
        const icon = btn.querySelector('i');
        const span = btn.querySelector('span');
        
        if (isDirty) {
            // Unlocked State (Active Green)
            btn.className = "flex items-center gap-2 px-8 py-3 bg-[#15803d] text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-[#166534] transition-all shadow-sm cursor-pointer";
            if (icon) {
                icon.className = "fa-solid fa-floppy-disk text-xs";
            }
            if (span) {
                span.textContent = "Save File Limits";
            }
        } else {
            // Locked State (Muted Slate with Lock Icon)
            btn.className = "flex items-center gap-2 px-8 py-3 bg-slate-100 text-slate-400 border border-slate-200 text-xs font-bold uppercase tracking-wider rounded-xl cursor-not-allowed transition-all shadow-none";
            if (icon) {
                icon.className = "fa-solid fa-lock text-xs";
            }
            if (span) {
                span.textContent = "Save File Limits";
            }
        }
    };

    window.saveMaterialLimits = function () {
        const btn = document.getElementById('limits-save-btn') || event?.target?.closest('button') || document.querySelector('#integ-limits-panel button');
        if (btn) {
            btn.disabled = true;
            btn.className = "flex items-center gap-2 px-8 py-3 bg-slate-100 text-slate-500 border border-slate-200 text-xs font-bold uppercase tracking-wider rounded-xl cursor-wait transition-all shadow-none";
            const icon = btn.querySelector('i');
            if (icon) icon.className = "fa-solid fa-circle-notch fa-spin text-xs";
            const span = btn.querySelector('span');
            if (span) span.textContent = "Syncing...";
        }

        const clampStd = (val, def = 500) => {
            const num = Number(val);
            if (Number.isNaN(num) || num <= 0) return def;
            return Math.min(700, Math.max(250, num));
        };

        const clampExt = (val, def = 50) => {
            const num = Number(val);
            if (Number.isNaN(num) || num <= 0) return def;
            return Math.min(100, Math.max(25, num));
        };

        const mp4Val = clampStd(document.getElementById('limit-video-mp4')?.value, 500);
        const videoExt = clampExt(document.getElementById('limit-video-ext')?.value, 50);

        const docxStd = clampStd(document.getElementById('limit-docx-std')?.value || document.getElementById('limit-docx-reg')?.value, 500);
        const docxExt = clampExt(document.getElementById('limit-docx-ext')?.value, 50);

        const pdfStd = clampStd(document.getElementById('limit-pdf-std')?.value || document.getElementById('limit-pdf-reg')?.value, 500);
        const pdfExt = clampExt(document.getElementById('limit-pdf-ext')?.value, 50);

        const pptxStd = clampStd(document.getElementById('limit-pptx-std')?.value || document.getElementById('limit-pptx-reg')?.value, 500);
        const pptxExt = clampExt(document.getElementById('limit-pptx-ext')?.value, 50);

        const limits = {
            video: {
                embed: Math.min(2, Math.max(1, Number(document.getElementById('limit-video-embed')?.value) || 1)),
                mp4: mp4Val,
                std: mp4Val,
                ext: videoExt
            },
            docx: {
                std: docxStd,
                reg: docxStd,
                ext: docxExt
            },
            pdf: {
                std: pdfStd,
                reg: pdfStd,
                ext: pdfExt
            },
            pptx: {
                std: pptxStd,
                reg: pptxStd,
                ext: pptxExt
            }
        };

        localStorage.setItem('sigma-material-limits', JSON.stringify(limits));
        localStorage.setItem('sigma_settings_video_max_mb', String(mp4Val + videoExt));

        setTimeout(() => {
            _savedMaterialLimitsSnapshot = getMaterialLimitsFormSnapshot();
            window.updateMaterialLimitsButtonState();
            if (window.showToast) window.showToast('File upload limits updated and synced (Standard: 500 MB)');
            else alert('File upload limits updated and synced (Standard: 500 MB)');
        }, 800);
    };

    function initMaterialLimits() {
        const saved = localStorage.getItem('sigma-material-limits');
        const limits = saved ? JSON.parse(saved) : {};
        
        function setElementVal(id, val) {
            const el = document.getElementById(id);
            if (el) el.value = val;
        }

        if (document.getElementById('limit-video-embed')) document.getElementById('limit-video-embed').value = limits.video?.embed || 1;
        if (document.getElementById('limit-video-mp4')) document.getElementById('limit-video-mp4').value = limits.video?.mp4 || limits.video?.std || 500;
        setElementVal('limit-video-ext', limits.video?.ext || 50);
        
        const docxStdVal = limits.docx?.std || limits.docx?.reg || 500;
        setElementVal('limit-docx-std', docxStdVal);
        setElementVal('limit-docx-reg', docxStdVal);
        setElementVal('limit-docx-ext', limits.docx?.ext || 50);

        const pdfStdVal = limits.pdf?.std || limits.pdf?.reg || 500;
        setElementVal('limit-pdf-std', pdfStdVal);
        setElementVal('limit-pdf-reg', pdfStdVal);
        setElementVal('limit-pdf-ext', limits.pdf?.ext || 50);

        const pptxStdVal = limits.pptx?.std || limits.pptx?.reg || 500;
        setElementVal('limit-pptx-std', pptxStdVal);
        setElementVal('limit-pptx-reg', pptxStdVal);
        setElementVal('limit-pptx-ext', limits.pptx?.ext || 50);

        _savedMaterialLimitsSnapshot = getMaterialLimitsFormSnapshot();
        window.updateMaterialLimitsButtonState();

        const panel = document.getElementById('integ-limits-panel');
        if (panel && !panel._limitsListenersBound) {
            panel._limitsListenersBound = true;
            panel.addEventListener('input', window.updateMaterialLimitsButtonState);
            panel.addEventListener('change', window.updateMaterialLimitsButtonState);
        }
    }
    window.initMaterialLimits = initMaterialLimits;
    initMaterialLimits();

    // --- AI API KEY VAULT LOGIC ---
    // Perform a one-time reset as requested by user
    localStorage.removeItem('sigma-api-vault-pass');
    localStorage.removeItem('sigma-api-keys');

    let INSTITUTIONAL_PASS = "";
    let currentVaultId = null;
    let originalKeys = {};

    window.triggerVault = function (id) {
        currentVaultId = id;
        const overlay = document.getElementById('vault-unlock-overlay');
        const passInput = document.getElementById('vault-auth-pass');
        const errorText = document.getElementById('vault-auth-error');

        if (overlay) {
            overlay.classList.remove('hidden');
            document.body.style.overflow = 'hidden'; // Lock scroll
            if (passInput) {
                passInput.value = '';
                passInput.focus();
            }
            if (errorText) errorText.classList.add('hidden');
        }
    };

    window.closeVaultModal = function () {
        const overlay = document.getElementById('vault-unlock-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
            document.body.style.overflow = ''; // Unlock scroll
        }
        currentVaultId = null;
    };

    window.verifyVaultModal = function () {
        if (!currentVaultId) return;

        const passInput = document.getElementById('vault-auth-pass');
        const errorText = document.getElementById('vault-auth-error');
        const keyField = document.getElementById(`key-field-${currentVaultId}`);
        const keyInput = document.getElementById(`api-key-${currentVaultId}`);
        const mask = document.getElementById(`mask-${currentVaultId}`);
        const btn = document.getElementById(`btn-vault-${currentVaultId}`);

        if (!passInput) return;

        if (passInput.value === INSTITUTIONAL_PASS) {
            if (keyInput) originalKeys[currentVaultId] = keyInput.value;

            window.closeVaultModal();
            if (keyField) keyField.classList.remove('hidden');
            if (btn) btn.classList.add('hidden');
            if (mask) {
                mask.textContent = "DECRYPTED ACCESS";
                mask.classList.replace('text-slate-200', 'text-green-500');
            }
            if (window.showToast) window.showToast(`${currentVaultId.toUpperCase()} Vault Unlocked`);
        } else {
            if (errorText) errorText.classList.remove('hidden');
            passInput.classList.add('border-red-500');
            setTimeout(() => passInput.classList.remove('border-red-500'), 2000);
        }
    };

    window.saveKeyField = function (id) {
        const keyInput = document.getElementById(`api-key-${id}`);
        const keyField = document.getElementById(`key-field-${id}`);
        const btn = document.getElementById(`btn-vault-${id}`);
        const mask = document.getElementById(`mask-${id}`);

        if (!keyInput) return;

        const saved = localStorage.getItem('sigma-api-keys');
        let keys = saved ? JSON.parse(saved) : {};
        keys[id] = keyInput.value;
        localStorage.setItem('sigma-api-keys', JSON.stringify(keys));

        if (keyField) keyField.classList.add('hidden');
        if (btn) btn.classList.remove('hidden');
        if (mask) {
            mask.textContent = "••••••••••••••••";
            mask.classList.replace('text-green-500', 'text-slate-200');
        }

        if (window.showToast) window.showToast(`${id.toUpperCase()} Key Saved Successfully`);
    };

    window.cancelKeyField = function (id) {
        const keyInput = document.getElementById(`api-key-${id}`);
        const keyField = document.getElementById(`key-field-${id}`);
        const btn = document.getElementById(`btn-vault-${id}`);
        const mask = document.getElementById(`mask-${id}`);

        if (keyInput && originalKeys[id] !== undefined) {
            keyInput.value = originalKeys[id];
        }

        if (keyField) keyField.classList.add('hidden');
        if (btn) btn.classList.remove('hidden');
        if (mask) {
            mask.textContent = "••••••••••••••••";
            mask.classList.replace('text-green-500', 'text-slate-200');
        }
    };

    window.triggerPasswordChange = function (id) {
        currentVaultId = id;
        const overlay = document.getElementById('vault-password-edit-overlay');
        const input = document.getElementById('new-vault-password');
        if (overlay) {
            overlay.classList.remove('hidden');
            document.body.style.overflow = 'hidden'; // Lock scroll
            if (input) {
                input.value = '';
                input.focus();
            }
        }
    };

    window.closePasswordChange = function () {
        const overlay = document.getElementById('vault-password-edit-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
            document.body.style.overflow = ''; // Unlock scroll
        }
    };

    window.updateVaultPassword = function () {
        const input = document.getElementById('new-vault-password');
        const btn = document.getElementById('vault-password-save-btn');
        const label = document.getElementById('vault-password-save-label');
        const loading = document.getElementById('vault-password-save-loading');

        if (!input || !input.value.trim()) return;

        const pass = input.value.trim();
        if (pass.length > 30) return;

        if (btn) btn.disabled = true;
        if (label) label.textContent = 'Updating...';
        if (loading) loading.classList.remove('hidden');

        setTimeout(() => {
            INSTITUTIONAL_PASS = pass;
            localStorage.setItem('sigma-api-vault-pass', INSTITUTIONAL_PASS);

            if (btn) btn.disabled = false;
            if (label) label.textContent = 'Update Global Password';
            if (loading) loading.classList.add('hidden');

            window.closePasswordChange();
            if (window.showToast) window.showToast('Institutional Password Updated Successfully');
            else alert('Institutional Password Updated Successfully');
        }, 800);
    };

    window.saveApiKeys = function () {
        const keys = {
            gemini: document.getElementById('api-key-gemini')?.value || '',
            groq: document.getElementById('api-key-groq')?.value || '',
            recaptcha: document.getElementById('api-key-recaptcha')?.value || '',
            drive: document.getElementById('api-key-drive')?.value || ''
        };

        localStorage.setItem('sigma-api-keys', JSON.stringify(keys));

        const btn = event.currentTarget;
        const originalText = btn.innerHTML;
        btn.innerHTML = '<span>Synchronizing...</span>';
        btn.disabled = true;

        setTimeout(() => {
            btn.disabled = false;
            btn.innerHTML = '<span>Vault Synchronized</span>';
            btn.classList.add('bg-black');
            btn.classList.remove('bg-[#15803d]');

            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.classList.add('bg-[#15803d]');
                btn.classList.remove('bg-black');
            }, 2000);

            if (window.showToast) window.showToast('API Vault Synchronized Successfully');
        }, 1000);
    };

    function initApiVault() {
        const saved = localStorage.getItem('sigma-api-keys');
        if (saved) {
            const keys = JSON.parse(saved);
            if (document.getElementById('api-key-gemini')) document.getElementById('api-key-gemini').value = keys.gemini || '';
            if (document.getElementById('api-key-groq')) document.getElementById('api-key-groq').value = keys.groq || '';
            if (document.getElementById('api-key-recaptcha')) document.getElementById('api-key-recaptcha').value = keys.recaptcha || '';
            if (document.getElementById('api-key-drive')) document.getElementById('api-key-drive').value = keys.drive || '';
        }
    }
    initApiVault();

    function getUserDefaultInitialPassword(target, userId) {
        if (!target) return 'password';
        if (target.defaultPassword) return target.defaultPassword;
        if (target.initialPassword) return target.initialPassword;

        const userUid = target.uid || target.id || userId || '';
        const cleanUid = String(userUid).replace(/^USER-/i, '').trim();

        let lastName = String(target.lastName || '').trim();
        if (!lastName) {
            const fullName = String(target.fullName || target.name || '').trim();
            if (fullName) {
                const parts = fullName.split(' ').filter(Boolean);
                lastName = parts.length > 1 ? parts[parts.length - 1] : parts[0];
            }
        }
        return buildManagedUserPassword(lastName, cleanUid);
    }

    window.togglePasswordVisibility = function (targetId, btn) {
        const input = document.getElementById(targetId);
        if (!input) return;
        const isPass = input.type === 'password';
        input.type = isPass ? 'text' : 'password';
        const icon = btn.querySelector('i');
        if (icon) {
            icon.classList.toggle('fa-eye', isPass);
            icon.classList.toggle('fa-eye-slash', !isPass);
        }
    };

    window.updatePasswordEyeState = function (input) {
        if (!input) return;
        const btn = input.parentElement ? input.parentElement.querySelector('.password-toggle-btn') : null;
        if (btn) {
            const hasVal = Boolean(input.value);
            btn.classList.toggle('opacity-0', !hasVal);
            btn.classList.toggle('pointer-events-none', !hasVal);
        }
    };

    window.validateChangePasswordForm = function (showIfEmpty = false) {
        const newPassInput = document.getElementById('new-user-password');
        const retypePassInput = document.getElementById('retype-user-password');
        const newWarning = document.getElementById('new-password-warning');
        const retypeWarning = document.getElementById('retype-password-warning');
        const saveBtn = document.getElementById('user-password-save-btn');

        const newPass = newPassInput ? newPassInput.value : '';
        const retypePass = retypePassInput ? retypePassInput.value : '';

        const userId = window.currentChangingPasswordUserId || window.currentEditingUserId || window.currentViewingUserId;
        const users = getStoredJson('sigma-admin-users', []);
        const target = users.find(u => String(u.uid || u.id || '') === String(userId)) || {};
        const defaultPass = getUserDefaultInitialPassword(target, userId);
        const isDefaultPassword = Boolean(newPass && defaultPass && (newPass === defaultPass));

        let newPassError = '';
        let retypePassError = '';

        if (newPass.length > 0 || showIfEmpty) {
            if (!newPass) {
                newPassError = 'Password is required.';
            } else if (/\s/.test(newPass)) {
                newPassError = 'Password cannot contain spaces.';
            } else if (!isDefaultPassword) {
                if (newPass.length < 6) {
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
        }

        if (retypePass.length > 0 || (showIfEmpty && newPass)) {
            if (!retypePass) {
                retypePassError = 'Please retype your password.';
            } else if (newPass !== retypePass) {
                retypePassError = 'Passwords do not match.';
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

        if (retypeWarning) {
            if (retypePassError) {
                retypeWarning.innerHTML = `<i class="fa-solid fa-circle-exclamation text-xs"></i><span>${retypePassError}</span>`;
                retypeWarning.classList.remove('hidden');
            } else {
                retypeWarning.innerHTML = '';
                retypeWarning.classList.add('hidden');
            }
        }

        const passesComplexity = isDefaultPassword || (
            newPass.length >= 6 &&
            /[A-Z]/.test(newPass) &&
            /[a-z]/.test(newPass) &&
            /[0-9]/.test(newPass) &&
            /[^\w\s]/.test(newPass)
        );

        const isFormValid = Boolean(newPass) &&
            !/\s/.test(newPass) &&
            passesComplexity &&
            newPass === retypePass;

        if (saveBtn) {
            saveBtn.disabled = !isFormValid;
        }

        return isFormValid;
    };

    window.applyDefaultInitialPassword = function () {
        const userId = window.currentChangingPasswordUserId || window.currentEditingUserId || window.currentViewingUserId;
        const users = getStoredJson('sigma-admin-users', []);
        const target = users.find(u => String(u.uid || u.id || '') === String(userId)) || {};
        const defaultPass = getUserDefaultInitialPassword(target, userId);

        const newPass = document.getElementById('new-user-password');
        const retypePass = document.getElementById('retype-user-password');
        if (newPass) {
            newPass.value = defaultPass;
            window.updatePasswordEyeState(newPass);
        }
        if (retypePass) {
            retypePass.value = defaultPass;
            window.updatePasswordEyeState(retypePass);
        }

        if (typeof window.validateChangePasswordForm === 'function') {
            window.validateChangePasswordForm(false);
        }

        if (window.showToast) {
            window.showToast(`Initial default password filled (${defaultPass})`);
        }
    };

    window.requestPasswordChange = function (userId) {
        window.currentChangingPasswordUserId = userId || window.currentEditingUserId || window.currentViewingUserId;
        const overlay = document.getElementById('user-password-edit-overlay');
        if (overlay) {
            // Snapshot current scroll positions BEFORE opening to ensure exact restoration on exit
            const adminMain = document.getElementById('admin-main');
            const mainContent = document.getElementById('main-content');
            window._passwordChangeScrollSnapshot = {
                windowX: window.scrollX || window.pageXOffset || 0,
                windowY: window.scrollY || window.pageYOffset || 0,
                adminScroll: adminMain ? adminMain.scrollTop : 0,
                mainScroll: mainContent ? mainContent.scrollTop : 0,
                docScroll: document.documentElement.scrollTop || document.body.scrollTop || 0
            };

            overlay.classList.remove('hidden');
            overlay.style.removeProperty('display');
            overlay.scrollTop = 0;

            const users = getStoredJson('sigma-admin-users', []);
            const target = users.find(u => String(u.uid || u.id || '') === String(window.currentChangingPasswordUserId)) || {};
            const defaultPass = getUserDefaultInitialPassword(target, window.currentChangingPasswordUserId);

            const hintEl = document.getElementById('user-default-password-hint');
            if (hintEl) {
                hintEl.textContent = `Revert to initial default: ${defaultPass}`;
            }

            if (typeof window.resetPasswordFormInputs === 'function') {
                window.resetPasswordFormInputs();
            }
        }
    };

    window.resetPasswordFormInputs = function () {
        const fieldsContainer = document.getElementById('password-fields-container');
        const resetStateContainer = document.getElementById('password-reset-state-container');
        const saveBtn = document.getElementById('user-password-save-btn');
        const newPass = document.getElementById('new-user-password');
        const retypePass = document.getElementById('retype-user-password');
        const loading = document.getElementById('user-password-save-loading');
        const label = document.getElementById('user-password-save-label');
        const newWarning = document.getElementById('new-password-warning');
        const retypeWarning = document.getElementById('retype-password-warning');

        if (fieldsContainer) fieldsContainer.classList.remove('hidden');
        if (resetStateContainer) resetStateContainer.classList.add('hidden');
        if (saveBtn) {
            saveBtn.classList.remove('hidden');
            saveBtn.disabled = true;
        }
        if (loading) loading.classList.add('hidden');
        if (label) label.classList.remove('hidden');

        if (newWarning) {
            newWarning.innerHTML = '';
            newWarning.classList.add('hidden');
        }
        if (retypeWarning) {
            retypeWarning.innerHTML = '';
            retypeWarning.classList.add('hidden');
        }

        [newPass, retypePass].forEach(inp => {
            if (inp) {
                inp.value = '';
                inp.type = 'password';
                window.updatePasswordEyeState(inp);
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

        if (newPass) {
            setTimeout(() => newPass.focus(), 60);
        }
    };

    window.handleUserPasswordExit = function () {
        const overlay = document.getElementById('user-password-edit-overlay');
        const fieldsContainer = document.getElementById('password-fields-container');
        const newPass = (document.getElementById('new-user-password')?.value || '').trim();
        const retypePass = (document.getElementById('retype-user-password')?.value || '').trim();

        const isDirty = fieldsContainer && !fieldsContainer.classList.contains('hidden') && (newPass || retypePass);

        const performExit = () => {
            if (overlay) overlay.classList.add('hidden');
            document.documentElement.style.overflow = '';
            document.body.style.overflow = '';

            const snapshot = window._passwordChangeScrollSnapshot;
            if (snapshot) {
                const doRestore = () => {
                    if (typeof snapshot.windowY === 'number') {
                        window.scrollTo({ left: snapshot.windowX || 0, top: snapshot.windowY, behavior: 'instant' });
                    }
                    if (typeof snapshot.docScroll === 'number' && snapshot.docScroll > 0) {
                        document.documentElement.scrollTop = snapshot.docScroll;
                        document.body.scrollTop = snapshot.docScroll;
                    }
                    const adminMain = document.getElementById('admin-main');
                    if (adminMain && typeof snapshot.adminScroll === 'number') {
                        adminMain.scrollTop = snapshot.adminScroll;
                    }
                    const mainContent = document.getElementById('main-content');
                    if (mainContent && typeof snapshot.mainScroll === 'number') {
                        mainContent.scrollTop = snapshot.mainScroll;
                    }
                };
                doRestore();
                requestAnimationFrame(() => {
                    doRestore();
                    setTimeout(doRestore, 30);
                });
            }
        };

        if (isDirty) {
            if (typeof window.showDiscardConfirm === 'function') {
                window.showDiscardConfirm({
                    onDiscard: performExit
                });
                return;
            }
            const confirmModal = document.getElementById('user-exit-confirm-modal');
            if (confirmModal) {
                confirmModal.classList.remove('hidden');
                return;
            }
        }

        performExit();
    };

    window.executePasswordChange = function () {
        const isValid = window.validateChangePasswordForm ? window.validateChangePasswordForm(true) : true;
        if (!isValid) {
            return;
        }

        const userId = window.currentChangingPasswordUserId;
        const newPass = document.getElementById('new-user-password')?.value;
        const retypePass = document.getElementById('retype-user-password')?.value;

        if (!newPass || newPass !== retypePass) {
            return;
        }

        const loading = document.getElementById('user-password-save-loading');
        const label = document.getElementById('user-password-save-label');
        const btn = document.getElementById('user-password-save-btn');
        const fieldsContainer = document.getElementById('password-fields-container');
        const resetStateContainer = document.getElementById('password-reset-state-container');

        // Show Loading
        if (loading) loading.classList.remove('hidden');
        if (label) label.classList.add('hidden');
        if (btn) btn.disabled = true;

        // Logic to update user password in localStorage
        const users = getStoredJson('sigma-admin-users', []);
        const userIndex = users.findIndex(u => String(u.uid || u.id || '') === String(userId));

        setTimeout(() => {
            if (userIndex !== -1) {
                users[userIndex].password = newPass;
                window.saveStoredJson('sigma-admin-users', users);
            }

            if (loading) loading.classList.add('hidden');
            if (label) label.classList.remove('hidden');

            // Switch to Reset state (hide password fields, show reset container, hide update button)
            if (fieldsContainer) fieldsContainer.classList.add('hidden');
            if (resetStateContainer) resetStateContainer.classList.remove('hidden');
            if (btn) btn.classList.add('hidden');

            if (window.showToast) window.showToast('Password updated successfully');
        }, 700);
    };

});

// Note: switchUserProfileTab & renderUserProfileTab are unified in js/profile-view.js.



window.requestDeactivateUser = function (userId) {
    const currentLoggedIn = window.getLoggedInAdminUser ? window.getLoggedInAdminUser() : {};
    const selfId = String(currentLoggedIn.uid || currentLoggedIn.id || '0000000');
    if (String(userId) === selfId) {
        if (window.showUserConfirm) {
            window.showUserConfirm('Action Prohibited', 'You cannot deactivate your own active account while logged in.', null, true);
        } else {
            alert('You cannot deactivate your own active account while logged in.');
        }
        return;
    }

    const users = getStoredJson('sigma-admin-users', []);
    const target = users.find(u => String(u.uid || u.id || '') === String(userId));
    if (target && normalizeUserRole(target.role || target.type) === 'Master Admin') {
        const totalMasters = users.filter(u => normalizeUserRole(u.role || u.type) === 'Master Admin').length;
        if (totalMasters <= 1) {
            if (window.showUserConfirm) {
                window.showUserConfirm('Action Prohibited', 'Cannot deactivate the last remaining Master Admin account.', null, true);
            } else {
                alert('Cannot deactivate the last remaining Master Admin account.');
            }
            return;
        }
    }

    window.userToDeactivateId = userId;
    const modal = document.getElementById('deactivate-account-modal');
    if (modal) {
        document.body.classList.add('dialog-open', 'modal-open');
        modal.classList.remove('hidden');
        document.querySelectorAll('.action-dropdown-menu').forEach(m => m.classList.remove('show'));
        document.querySelectorAll('.action-dots-btn').forEach(b => b.classList.remove('active'));
    }
};

window.confirmDeactivateUser = function () {
    const userId = window.userToDeactivateId;
    if (!userId) return;

    const users = getStoredJson('sigma-admin-users', []);
    const userIndex = users.findIndex(u => String(u.uid || u.id || '') === String(userId));

    if (userIndex !== -1) {
        users[userIndex].status = 'Inactive';
        window.saveStoredJson('sigma-admin-users', users);

        if (window.currentUserProfileData && String(window.currentUserProfileData.id) === String(userId)) {
            window.currentUserProfileData.status = 'Inactive';
        }
        if (typeof window.populateUserProfilePage === 'function') {
            window.populateUserProfilePage();
        }

        document.body.classList.remove('dialog-open', 'modal-open');
        document.getElementById('deactivate-account-modal').classList.add('hidden');
        if (typeof renderUserAccountsTable === 'function') renderUserAccountsTable();

        if (window.showToast) {
            window.showToast('Account successfully deactivated');
        } else if (typeof window.showSigmaDialog === 'function') {
            window.showSigmaDialog({
                title: 'Account Deactivated',
                desc: 'Account has been successfully deactivated.',
                icon: 'fa-solid fa-user-slash text-red-500',
                confirmText: 'OK',
                isNotification: true
            });
        } else if (typeof window.showUserConfirm === 'function') {
            window.showUserConfirm('Account Deactivated', 'Account has been successfully deactivated.', null, true);
        }
    }
};

window.requestActivateUser = function (userId) {
    window.userToActivateId = userId;
    const modal = document.getElementById('activate-account-modal');
    if (modal) {
        document.body.classList.add('dialog-open', 'modal-open');
        modal.classList.remove('hidden');
        // Close dropdown
        document.querySelectorAll('.action-dropdown-menu').forEach(m => m.classList.remove('show'));
        document.querySelectorAll('.action-dots-btn').forEach(b => b.classList.remove('active'));
    }
};

window.confirmActivateUser = function () {
    const userId = window.userToActivateId;
    if (!userId) return;

    const users = getStoredJson('sigma-admin-users', []);
    const userIndex = users.findIndex(u => String(u.uid || u.id || '') === String(userId));

    if (userIndex !== -1) {
        users[userIndex].status = 'Active';
        window.saveStoredJson('sigma-admin-users', users);

        if (window.currentUserProfileData && String(window.currentUserProfileData.id) === String(userId)) {
            window.currentUserProfileData.status = 'Active';
        }
        if (typeof window.populateUserProfilePage === 'function') {
            window.populateUserProfilePage();
        }

        document.body.classList.remove('dialog-open', 'modal-open');
        document.getElementById('activate-account-modal').classList.add('hidden');
        if (typeof renderUserAccountsTable === 'function') renderUserAccountsTable();

        if (window.showToast) {
            window.showToast('Account successfully activated');
        } else if (typeof window.showSigmaDialog === 'function') {
            window.showSigmaDialog({
                title: 'Account Activated',
                desc: 'Account has been successfully activated.',
                icon: 'fa-solid fa-user-check text-[#15803d]',
                confirmText: 'OK',
                isNotification: true
            });
        } else if (typeof window.showUserConfirm === 'function') {
            window.showUserConfirm('Account Activated', 'Account has been successfully activated.', null, true);
        }
    }
};

window.toggleSearchField = function (fieldId, isVisible) {
    const field = document.getElementById(fieldId);
    if (field) {
        if (isVisible) {
            field.classList.remove('hidden');
        } else {
            field.classList.add('hidden');
            const input = field.querySelector('input, select');
            if (input) input.value = '';
            if (fieldId.startsWith('subject-')) {
                window.applySubjectSearch();
            } else if (fieldId.startsWith('section-')) {
                window.applySectionSearch();
            } else {
                window.applyUserAccountSearch();
            }
        }
    }
};

// NEW: Persistent Admin Search Fields
window.toggleAdminSearchField = function (module, fieldKey, isVisible) {
    const fieldId = `${module}-field-${fieldKey}`;
    const checkId = `${module}-check-${fieldKey}`;
    const field = document.getElementById(fieldId);
    const checkbox = document.getElementById(checkId);

    if (field) {
        field.classList.toggle('hidden', !isVisible);
        if (!isVisible) {
            const input = field.querySelector('input, select');
            if (input) {
                input.value = '';
                // Trigger re-render to clear filter effect
                if (module === 'section') window.applySectionSearch();
                if (module === 'subject') window.applySubjectSearch();
            }
        }
    }

    // Save preference
    const prefs = getStoredJson('sigma-admin-search-prefs', {});
    if (!prefs[module]) prefs[module] = {};
    prefs[module][fieldKey] = isVisible;
    window.saveStoredJson('sigma-admin-search-prefs', prefs);
};

window.initSearchFieldPreferences = function () {
    const prefs = getStoredJson('sigma-admin-search-prefs', {});
    const modules = ['section', 'subject'];
    const fields = {
        section: ['name', 'room', 'grade', 'strand', 'status'],
        subject: ['code', 'name', 'type', 'status']
    };

    modules.forEach(module => {
        if (fields[module]) {
            fields[module].forEach(fieldKey => {
                // Default visibility: check if explicitly saved as false, otherwise default to what's in HTML (but we force sync)
                // Actually, let's look at the HTML defaults: Section Name and Subject Code are usually visible.
                let isVisible = true; 
                if (prefs[module] && prefs[module][fieldKey] !== undefined) {
                    isVisible = prefs[module][fieldKey];
                } else {
                    // Fallback to HTML state if no pref saved
                    const checkbox = document.getElementById(`${module}-check-${fieldKey}`);
                    if (checkbox) isVisible = checkbox.checked;
                }

                // Apply state
                const fieldId = `${module}-field-${fieldKey}`;
                const checkId = `${module}-check-${fieldKey}`;
                const field = document.getElementById(fieldId);
                const checkbox = document.getElementById(checkId);

                if (field) field.classList.toggle('hidden', !isVisible);
                if (checkbox) checkbox.checked = isVisible;
            });
        }
    });
};

// Auto-init on script load or soon after
setTimeout(() => {
    window.initSearchFieldPreferences();

    // SHOW CREATION BAR (Shared — Users, Subjects, Sections, School Years)
    if (typeof window.restoreCreationBar === 'function') {
        window.restoreCreationBar();
    }

    if (typeof window.updateSelectPlaceholderColors === 'function') {
        window.updateSelectPlaceholderColors();
    }
}, 100);

window.updateSelectPlaceholderColors = function (container = document) {
    container.querySelectorAll('select').forEach(sel => {
        if (!sel.value) {
            sel.classList.add('is-placeholder');
            sel.style.color = 'rgba(0, 0, 0, 0.40)';
        } else {
            sel.classList.remove('is-placeholder');
            sel.style.color = '#000000';
        }
    });
};

document.addEventListener('change', function (e) {
    if (e.target && e.target.tagName === 'SELECT') {
        if (!e.target.value) {
            e.target.classList.add('is-placeholder');
            e.target.style.color = 'rgba(0, 0, 0, 0.40)';
        } else {
            e.target.classList.remove('is-placeholder');
            e.target.style.color = '#000000';
        }
    }
});

// =============================================================
// SHARED CREATION BAR — Works for Users, Subjects, Sections, School Years
// =============================================================

let _creationBarTimer = null;

window.dismissCreationBar = function () {
    if (_creationBarTimer) {
        clearTimeout(_creationBarTimer);
        _creationBarTimer = null;
    }
    const existing = document.getElementById('sigma-creation-bar');
    if (existing) {
        existing.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease';
        existing.style.transform = 'translateY(100%)';
        existing.style.opacity = '0';
        setTimeout(() => {
            if (existing && existing.parentNode) existing.remove();
        }, 400);
    }
    sessionStorage.removeItem('sigma-creation-bar');
    sessionStorage.removeItem('sigma-new-user-toast');
};

/**
 * showCreationBar({ type, label, primaryLabel, primaryValue, secondaryLabel, secondaryValue, status })
 */
window.showCreationBar = function ({ type = 'user', label, primaryLabel, primaryValue, secondaryLabel, secondaryValue, status = 'published' } = {}) {
    const STORAGE_KEY = 'sigma-creation-bar';

    // Remove existing bar immediately if active
    const oldBar = document.getElementById('sigma-creation-bar');
    if (oldBar) oldBar.remove();
    if (_creationBarTimer) {
        clearTimeout(_creationBarTimer);
        _creationBarTimer = null;
    }

    // Choose icon per type
    const iconMap = {
        'user':        'fa-user-plus',
        'subject':     'fa-book',
        'section':     'fa-layer-group',
        'school-year': 'fa-calendar-days',
    };
    const icon = iconMap[type] || 'fa-check-circle';

    // Choose color palette: draft = Yellow (#FFD000) with green/black accents, published = Green (#15803d) with yellow/white accents
    const isDraft = String(status).toLowerCase() === 'draft';
    const bgColor = isDraft ? '#FFD000' : '#15803d';
    const textColor = isDraft ? '#000000' : '#ffffff';
    const tagColor = isDraft ? '#15803d' : 'rgba(255, 255, 255, 0.75)';
    const subLabelColor = isDraft ? 'rgba(0, 0, 0, 0.55)' : 'rgba(255, 255, 255, 0.50)';
    const secLabelColor = isDraft ? '#15803d' : '#FFD000';
    const dividerBg = isDraft ? 'rgba(21, 128, 61, 0.25)' : 'rgba(255, 255, 255, 0.20)';
    const iconBg = isDraft ? '#15803d' : 'rgba(255, 255, 255, 0.20)';
    const iconColor = '#ffffff';
    const closeBtnColor = isDraft ? 'text-black/70 hover:text-black hover:bg-black/10' : 'text-white/70 hover:text-white hover:bg-white/10';

    const toTitleCase = (str) => {
        if (!str) return '';
        return String(str)
            .toLowerCase()
            .split(' ')
            .map(word => word ? word.charAt(0).toUpperCase() + word.slice(1) : '')
            .join(' ');
    };

    const displayLabel = toTitleCase(label || 'Published Subject');
    const displayPrimaryLabel = toTitleCase(primaryLabel || 'Subject Name');
    const displayPrimaryValue = primaryValue || '';
    const displaySecondaryLabel = toTitleCase(secondaryLabel || 'Subject Code');
    const displaySecondaryValue = secondaryValue || '';

    const bar = document.createElement('div');
    bar.id = 'sigma-creation-bar';
    bar.className = 'fixed bottom-0 left-0 right-0 z-[100000] border-none select-none';
    bar.style.transform = 'translateY(100%)';
    bar.style.opacity = '0';
    bar.style.transition = 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease';
    bar.setAttribute('onclick', 'window.dismissCreationBar()');
    bar.innerHTML = `
        <div style="background-color: ${bgColor} !important; color: ${textColor} !important; border: none !important; box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);" class="px-10 py-4 flex items-center justify-between border-0 font-['Inter']">
            <div class="flex items-center gap-10">
                <div class="flex items-center gap-4">
                    <div style="background-color: ${iconBg};" class="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                        <i class="fa-solid ${icon}" style="color: ${iconColor}; font-size: 13px;"></i>
                    </div>
                    <div>
                        <p class="text-[10px] font-bold tracking-normal leading-tight" style="color: ${tagColor};">${displayLabel}</p>
                        <p class="text-sm font-bold tracking-tight my-0.5" style="color: ${textColor};">${displayPrimaryValue}</p>
                        <p class="text-[10px] font-medium tracking-normal leading-tight" style="color: ${subLabelColor};">${displayPrimaryLabel}</p>
                    </div>
                </div>
                <div class="h-10 w-px" style="background-color: ${dividerBg};"></div>
                <div>
                    <p class="text-[10px] font-bold tracking-normal leading-tight" style="color: ${secLabelColor};">${displaySecondaryLabel}</p>
                    <p class="text-base font-bold tracking-tight mt-0.5" style="color: ${textColor};">${displaySecondaryValue}</p>
                </div>
            </div>
            <button onclick="event.stopPropagation(); window.dismissCreationBar()" class="w-8 h-8 flex items-center justify-center ${closeBtnColor} rounded-full transition-all cursor-pointer" title="Dismiss">
                <i class="fa-solid fa-xmark text-lg"></i>
            </button>
        </div>
    `;

    const startTimer = () => {
        if (_creationBarTimer) clearTimeout(_creationBarTimer);
        _creationBarTimer = setTimeout(() => {
            window.dismissCreationBar();
        }, 3500);
    };

    bar.addEventListener('mouseenter', () => {
        if (_creationBarTimer) clearTimeout(_creationBarTimer);
    });

    bar.addEventListener('mouseleave', () => {
        startTimer();
    });

    document.body.appendChild(bar);

    // Trigger smooth slide up
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            bar.style.transform = 'translateY(0)';
            bar.style.opacity = '1';
        });
    });

    startTimer();
};

// Restore creation bar on page load (legacy fallback removed to avoid stale bars)
window.restoreCreationBar = function () {
    // Intentionally no-op to prevent old bars lingering on refresh
};

// Keep backward compat alias
window.showNewUserToast = function (userId, userName) {
    window.showCreationBar({
        type: 'user',
        label: 'Created Account',
        primaryLabel: 'Full Name',
        primaryValue: userName,
        secondaryLabel: 'Login ID',
        secondaryValue: userId,
        status: 'published'
    });
};

// =============================================================
// PERMISSION ENFORCEMENT ENGINE
// =============================================================

window.applyCurrentAdminPermissions = function () {
    const user = typeof window.getLoggedInAdminUser === 'function' ? window.getLoggedInAdminUser() : null;
    if (!user) return;

    const role = typeof normalizeUserRole === 'function' ? normalizeUserRole(user.role || user.type) : 'Admin';
    const isMaster = role === 'Master Admin' || String(user.uid || user.id) === '0000000' || !!user.isMaster;
    const perms = user.permissions || {};

    const toggleElement = (elOrId, visible) => {
        const el = typeof elOrId === 'string' ? document.getElementById(elOrId) : elOrId;
        if (!el) return;
        el.classList.toggle('hidden', !visible);
        if (!visible) {
            el.dataset.permHidden = 'true';
            el.style.display = 'none';
        } else {
            delete el.dataset.permHidden;
            el.style.display = '';
        }
    };

    // 1. School Management Category
    const canSchoolMain = isMaster || perms.schoolMain !== false;
    const canSchoolProfile = isMaster || (canSchoolMain && perms.schoolProfile === true);
    const canSyAuthority = isMaster || (canSchoolMain && perms.schoolYear !== false && perms.syAuthority !== false);
    const canSyManage = isMaster || (canSchoolMain && perms.schoolYear !== false && perms.syManage !== false);
    const canSyCreateEdit = isMaster || (canSchoolMain && perms.schoolYear !== false && perms.syCreateEdit !== false);
    const canSyDelete = isMaster || perms.syDelete === true;

    const canSchoolSections = isMaster || (canSchoolMain && perms.schoolSections !== false);
    const canSectionDelete = isMaster || perms.schoolSectionsDelete === true || perms.sectionDelete === true;

    const canSubjectAuthority = isMaster || (canSchoolMain && perms.schoolSubjects !== false && perms.subjectAuthority !== false);
    const canSubjectCreateEdit = isMaster || (canSchoolMain && perms.schoolSubjects !== false && perms.subjectCreateEdit !== false);
    const canSubjectDelete = isMaster || perms.subjectDelete === true;
    const canSchoolGrades = isMaster || (canSchoolMain && perms.grades !== false);

    toggleElement('nav-school-profile', canSchoolProfile);
    toggleElement('nav-school-year', canSyAuthority);
    toggleElement('nav-school-sections', canSchoolSections);
    toggleElement('nav-school-subjects', canSubjectAuthority);
    toggleElement('nav-school-grades', canSchoolGrades);
    toggleElement('nav-grades', canSchoolGrades);

    // Parent group for School Management
    const hasAnySchoolSublink = canSchoolProfile || canSyAuthority || canSchoolSections || canSubjectAuthority || canSchoolGrades;
    const canSchoolMgmt = isMaster || (canSchoolMain && hasAnySchoolSublink);
    const schoolMgmtBtn = document.getElementById('nav-school-mgmt');
    const schoolMgmtGroup = schoolMgmtBtn ? (schoolMgmtBtn.closest('.nav-group') || schoolMgmtBtn) : null;
    toggleElement(schoolMgmtGroup, canSchoolMgmt);

    // In-page school buttons
    toggleElement('open-manage-sy-btn', canSyManage);
    toggleElement('open-create-sy-btn', canSyCreateEdit);
    toggleElement('btn-create-sy-active', canSyCreateEdit);
    toggleElement('open-subject-overlay-btn', canSubjectCreateEdit);
    toggleElement('subject-delete-btn', canSubjectDelete && !!window.isEditingSubject);
    toggleElement('section-delete-btn', canSectionDelete && !!window.isEditingSection);

    // 2. Reports Category
    const canReportsMain = isMaster || perms.reportsMain !== false;
    const canReportsAi = isMaster || (canReportsMain && perms.reportsPredictive !== false);
    const canReportsAttendance = isMaster || (canReportsMain && perms.reportsDescriptive !== false);
    const canReportsPerformance = isMaster || (canReportsMain && perms.reportsPrescriptive !== false);

    toggleElement('nav-reports-ai', canReportsAi);
    toggleElement('nav-reports-attendance', canReportsAttendance);
    toggleElement('nav-reports-performance', canReportsPerformance);

    const hasAnyReportsSublink = canReportsAi || canReportsAttendance || canReportsPerformance;
    const canReportsGroup = isMaster || (canReportsMain && hasAnyReportsSublink);
    const reportsBtn = document.getElementById('nav-reports');
    const reportsGroup = reportsBtn ? (reportsBtn.closest('.nav-group') || reportsBtn) : null;
    toggleElement(reportsGroup, canReportsGroup);

    // 3. Resources Category
    const canResourcesMain = isMaster || perms.resourcesMain !== false;
    const resourcesBtn = document.getElementById('nav-resources');
    const resourcesGroup = resourcesBtn ? (resourcesBtn.closest('.nav-group') || resourcesBtn) : null;
    toggleElement(resourcesGroup, canResourcesMain);

    // 4. Audit Logs Category
    const canAuditMain = isMaster || perms.auditMain !== false;
    const canAuditAi = isMaster || (canAuditMain && perms.auditAi !== false);
    const canAuditActivity = isMaster || (canAuditMain && perms.auditActivity !== false);
    const canAuditAuth = isMaster || (canAuditMain && perms.auditAuth !== false);

    toggleElement('nav-audit-ai', canAuditAi);
    toggleElement('nav-audit-activity', canAuditActivity);
    toggleElement('nav-audit-auth', canAuditAuth);

    const hasAnyAuditSublink = canAuditAi || canAuditActivity || canAuditAuth;
    const canAuditGroup = isMaster || (canAuditMain && hasAnyAuditSublink);
    const auditBtn = document.getElementById('nav-audit-logs');
    const auditGroup = auditBtn ? (auditBtn.closest('.nav-group') || auditBtn) : null;
    toggleElement(auditGroup, canAuditGroup);

    // 5. Settings Category
    const canSettingsMain = isMaster || perms.settingsMain !== false;
    const canSettingsSecurity = isMaster || (canSettingsMain && perms.settingsSecurity !== false);
    const canSettingsBranding = isMaster || (canSettingsMain && perms.settingsBranding !== false);
    const canSettingsIntegrations = isMaster || (canSettingsMain && perms.settingsApi !== false);

    toggleElement('nav-settings-security', canSettingsSecurity);
    toggleElement('nav-settings-branding', canSettingsBranding);
    toggleElement('nav-settings-integrations', canSettingsIntegrations);
    toggleElement('nav-settings-preference', canSettingsBranding);
    toggleElement('nav-settings-storage', canSettingsIntegrations);
    toggleElement('nav-settings-api', canSettingsIntegrations);

    const hasAnySettingsSublink = canSettingsSecurity || canSettingsBranding || canSettingsIntegrations;
    const canSettingsGroup = isMaster || (canSettingsMain && hasAnySettingsSublink);
    const settingsBtn = document.getElementById('nav-settings');
    const settingsGroup = settingsBtn ? (settingsBtn.closest('.nav-group') || settingsBtn) : null;
    toggleElement(settingsGroup, canSettingsGroup);

    // 6. User Accounts Navigation
    const canManageAnyUsers = isMaster || perms.manageAdmins !== false || perms.manageTeachers !== false || perms.manageStudents !== false;
    const navUsers = document.getElementById('nav-users-accounts');
    toggleElement(navUsers, canManageAnyUsers);

    // 7. System Access & Maintenance panel
    // Regular admins cannot see the Maintenance/Lockdown toggle at all.
    // They can only see the Notice Message section IF the Master Admin has granted noticeMessage permission.
    const canSeeMaintenance = isMaster || (perms.noticeMessage === true);
    toggleElement('sec-maintenance-panel', canSeeMaintenance);
    toggleElement('nav-settings-maintenance', canSeeMaintenance);
    if (canSeeMaintenance && typeof window.updateMaintenanceAccessControls === 'function') {
        window.updateMaintenanceAccessControls();
    }

    // 8. Active View Protection: Redirect if on a forbidden section
    const activeSection = document.querySelector('.dynamic-section:not(.hidden)');
    if (activeSection) {
        const activeId = activeSection.id;
        if (typeof window.canAccessAdminSection === 'function' && !window.canAccessAdminSection(activeId)) {
            if (typeof window.switchTab === 'function') {
                window.switchTab('nav-dashboard');
            } else {
                const dashboardLink = document.getElementById('nav-dashboard');
                if (dashboardLink) dashboardLink.click();
            }
        }
    }
};

// Initialize permissions enforcement and quiz creator return flow on page load
document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.applyCurrentAdminPermissions === 'function') {
        window.applyCurrentAdminPermissions();
    }

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('openQuizStorage') === '1') {
        const pendingQuizId = localStorage.getItem('sigma_pending_selected_quiz_id');
        const autoConfirm = urlParams.get('autoConfirm') === '1';

        setTimeout(() => {
            if (pendingQuizId) {
                window.selectedStorageQuizId = pendingQuizId;
                localStorage.removeItem('sigma_pending_selected_quiz_id');

                if (autoConfirm) {
                    window.confirmSelectedStorageQuiz();
                } else {
                    window.addSubjectMaterial('Quiz', true);
                    window.renderQuizStorageView();
                }
            } else {
                window.addSubjectMaterial('Quiz', true);
                window.renderQuizStorageView();
            }
        }, 300);
    }
});
