/**
 * SIGMA ELMS - Global Search Results View Controller (js/search-results.js)
 * Displays a dedicated, full-page search results experience across Admin, Teacher, and Student portals.
 */

(function () {
    'use strict';

    let lastActiveSectionId = null;
    let lastActiveSectionName = 'Previous Page';
    let currentSearchQuery = '';
    let currentCategoryFilter = 'all';

    const SEARCH_PAGE_SIZE = 12;
    let displayedCount = 0;
    let allFilteredResults = [];
    let searchIntersectionObserver = null;

    function getPortalRole() {
        const path = (window.location.pathname || '').toLowerCase();
        if (path.includes('teacher') || document.getElementById('teacher-main') || document.body.classList.contains('teacher-portal') || document.querySelector('[data-portal="teacher"]')) {
            return 'teacher';
        }
        if (path.includes('student') || document.getElementById('student-main') || document.body.classList.contains('student-portal') || document.querySelector('[data-portal="student"]')) {
            return 'student';
        }
        return 'admin';
    }

    function isEmailAddress(str) {
        if (!str || typeof str !== 'string') return false;
        return str.includes('@') || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str.trim());
    }

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function ensureSearchResultsView() {
        let view = document.getElementById('search-results-view');
        if (!view || !document.body.contains(view)) {
            const container = document.getElementById('content-sections') ||
                              document.querySelector('main #content-sections') ||
                              document.querySelector('main') ||
                              document.body;

            view = document.createElement('section');
            view.id = 'search-results-view';
            view.className = 'dynamic-section hidden w-full min-h-screen bg-slate-50/60 font-[\'Inter\']';
            view.innerHTML = `
                <div class="max-w-[1440px] mx-auto p-4 md:p-8 space-y-6">
                    <!-- Top Header (Clean text style matching System Settings style) -->
                    <div class="flex items-center justify-between px-1">
                        <h1 class="text-[20px] sm:text-[22px] font-bold text-slate-900 tracking-tight flex items-center gap-3">
                            <i class="fa-solid fa-magnifying-glass text-slate-400 text-[18px]"></i>
                            <span>Search Results for <span id="search-results-query-text" class="text-icc-yellow">""</span></span>
                        </h1>
                    </div>

                    <!-- Main Integrated Layout (Integrated Sidebar style like Settings) -->
                    <div class="search-results-layout bg-white rounded-[24px] border border-slate-200/90 shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[650px]">
                        <!-- Left Integrated Sidebar -->
                        <aside class="search-results-sidebar w-full md:w-[280px] border-b md:border-b-0 md:border-r border-slate-200/90 p-5 bg-white flex-shrink-0">
                            <h2 class="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-6 px-2">Filter Results</h2>
                            <nav class="search-filter-container flex flex-col gap-1.5" role="tablist" aria-label="Search Categories" id="search-results-filter-pills">
                                <!-- Hydrated dynamically -->
                            </nav>
                        </aside>

                        <!-- Right Integrated Content -->
                        <main class="search-results-main flex-1 bg-slate-50/40 p-5 sm:p-8 min-w-0">
                            <div id="search-results-cards-container" class="space-y-4">
                                <!-- Hydrated dynamically -->
                            </div>

                            <!-- Sentinel for Infinite Scroll -->
                            <div id="search-results-sentinel" class="py-8 flex justify-center opacity-0 pointer-events-none">
                                <div class="w-8 h-8 border-4 border-slate-200 border-t-slate-600 rounded-full animate-spin"></div>
                            </div>

                            <!-- Empty State -->
                            <div id="search-results-empty-state" class="hidden py-16 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
                                <div class="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 text-2xl mb-4">
                                    <i class="fa-solid fa-magnifying-glass text-black"></i>
                                </div>
                                <h3 class="text-base font-bold text-slate-800 mb-1" id="search-results-empty-title">No matches found</h3>
                                <p class="text-xs text-slate-500 max-w-sm mx-auto mb-6">We couldn't find anything matching your search. Check for typos or try searching by name or subject.</p>
                                <button type="button" id="search-results-empty-return-btn" class="sigma-btn sigma-btn-primary search-action-btn search-action-btn--primary">
                                    Return to Previous Page
                                </button>
                            </div>
                        </main>
                    </div>
                </div>
            `;

            container.appendChild(view);
        }

        const backBtn = view.querySelector('#search-results-back-btn');
        if (backBtn && !backBtn.dataset.bound) {
            backBtn.dataset.bound = 'true';
            backBtn.addEventListener('click', (e) => {
                e.preventDefault();
                closeSearchResultsView();
            });
        }

        const emptyReturnBtn = view.querySelector('#search-results-empty-return-btn');
        if (emptyReturnBtn && !emptyReturnBtn.dataset.bound) {
            emptyReturnBtn.dataset.bound = 'true';
            emptyReturnBtn.addEventListener('click', (e) => {
                e.preventDefault();
                closeSearchResultsView();
            });
        }

        return view;
    }

    function gatherSearchResults(query) {
        const raw = (query || '').trim();
        if (!raw) return [];
        const lower = raw.toLowerCase();
        const results = [];
        const seen = new Set();

        function resolveAvatar(u) {
            if (!u) return '';
            if (typeof window.resolveUserAvatar === 'function') {
                try {
                    const res = window.resolveUserAvatar(u);
                    if (res && typeof res === 'string' && res.trim() && !res.includes('null') && !res.includes('undefined')) {
                        return res.trim();
                    }
                } catch (_) {}
            }
            const id = String(u.uid || u.id || u.lrn || u.studentNumber || u.employeeId || '').replace(/^#/, '').trim();
            if (id) {
                const stored = localStorage.getItem(`sigma_avatar_${id}`);
                if (stored && typeof stored === 'string' && stored.trim() && stored !== 'null' && stored !== 'undefined') {
                    return stored.trim();
                }
            }
            const direct = u.avatar || u.profilePicture || u.photo || u.profileImage || u.avatarUrl || '';
            if (direct && typeof direct === 'string' && direct.trim() && direct !== 'null' && direct !== 'undefined') {
                return direct.trim();
            }
            if (typeof window.getCurrentUserAvatar === 'function') {
                try {
                    const cur = window.getCurrentUserAvatar(id || u.fullName || u.name || '');
                    if (cur && typeof cur === 'string' && cur.trim() && cur !== 'null' && cur !== 'undefined') {
                        return cur.trim();
                    }
                } catch (_) {}
            }
            return '';
        }

        function addResult(item) {
            if (!item || !item.title) return;
            const idKey = item.id ? String(item.id).toLowerCase().replace(/[^a-z0-9]/g, '') : '';
            const titleTokens = item.title.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean).sort().join('_');

            if (idKey && seen.has(`id_${idKey}`)) return;
            if (titleTokens && seen.has(`title_${item.category}_${titleTokens}`)) return;

            if (idKey) seen.add(`id_${idKey}`);
            if (titleTokens) seen.add(`title_${item.category}_${titleTokens}`);
            results.push(item);
        }

        // Flexible search matcher: checks if target contains query, or matches individual words
        function matchesQuery(targetText, queryStr) {
            if (!targetText || !queryStr) return false;
            const t = String(targetText).toLowerCase().trim();
            const q = String(queryStr).toLowerCase().trim();
            if (!q) return false;
            if (t.includes(q)) return true;
            // Multi-word support: every term in query must match
            const terms = q.split(/\s+/).filter(Boolean);
            if (terms.length > 1 && terms.every(term => t.includes(term))) {
                return true;
            }
            return false;
        }

        const portalRole = getPortalRole();

        // Get current authenticated user ID to exclude self from results
        let authUserId = '';
        try {
            const authUser = JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}');
            authUserId = String(authUser.uid || authUser.id || '').trim();
        } catch (e) {}

        // 1. Scan The Users (Primary: sigma-admin-users, the canonical user system database)
        const allCandidateUsers = [];
        const seenCandidateKeys = new Set();

        function getUserDedupeKeys(u) {
            const keys = [];
            if (!u) return keys;
            const uid = String(u.uid || u.id || u.lrn || u.studentNumber || u.employeeId || '').replace(/^#/, '').trim().toLowerCase();
            
            if (uid) keys.push(`id:${uid}`);

            const email = String(u.email || '').trim().toLowerCase();
            if (email && !email.includes('@icc')) keys.push(`email:${email}`);

            const rawName = String(u.fullName || u.name || `${u.firstName || ''} ${u.lastName || ''}`).trim();
            const tokens = rawName.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean).sort();
            if (tokens.length >= 2) {
                keys.push(`tokens:${tokens.join('_')}`);
                if (tokens.length > 2 && u.firstName && u.lastName) {
                    const fn = String(u.firstName).toLowerCase().replace(/[^a-z0-9]/g, '');
                    const ln = String(u.lastName).toLowerCase().replace(/[^a-z0-9]/g, '');
                    if (fn && ln) keys.push(`fl:${fn}_${ln}`);
                }
            } else if (tokens.length === 1 && tokens[0].length >= 3) {
                keys.push(`token:${tokens[0]}`);
            }
            return keys;
        }

        function registerUserCandidate(u) {
            if (!u) return;
            
            // Strictly exclude current user by ID
            const uid = String(u.uid || u.id || u.lrn || u.studentNumber || u.employeeId || '').replace(/^#/, '').trim().toLowerCase();
            if (authUserId && uid === authUserId.toLowerCase()) return;
            
            const keys = getUserDedupeKeys(u);
            if (keys.some(k => seenCandidateKeys.has(k))) {
                return;
            }
            keys.forEach(k => seenCandidateKeys.add(k));
            allCandidateUsers.push(u);
        }

        // Canonical Source 1: The Users (sigma-admin-users)
        try {
            const adminUsers = (typeof window.getStoredJson === 'function')
                ? window.getStoredJson('sigma-admin-users', [])
                : JSON.parse(localStorage.getItem('sigma-admin-users') || '[]');
            if (Array.isArray(adminUsers)) {
                adminUsers.forEach(registerUserCandidate);
            }
        } catch (_) {}

        // Fallback secondary keys only for users not already in master database
        const secondaryKeys = portalRole === 'admin'
            ? ['sigma-users-list', 'sigma-teacher-users', 'sigma-student-users', 'sigma-users']
            : (portalRole === 'teacher'
                ? ['sigma-student-users', 'sigma-teacher-users', 'sigma-users-list']
                : ['sigma-teacher-users', 'sigma-student-users', 'sigma-users-list']);

        for (const k of secondaryKeys) {
            try {
                const list = JSON.parse(localStorage.getItem(k) || '[]');
                if (Array.isArray(list)) {
                    list.forEach(registerUserCandidate);
                }
            } catch (_) {}
        }

        allCandidateUsers.forEach(u => {
            if (!u) return;
            const role = (u.role || u.type || '').toLowerCase();
            if (portalRole === 'student' && (role.includes('admin') || role.includes('master'))) return;
            if (portalRole === 'teacher' && role.includes('admin') && !role.includes('teacher') && !role.includes('faculty')) return;

            let fullName = '';
            if (u.firstName || u.lastName) {
                // Only First and Last name
                const parts = [u.firstName, u.lastName].filter(Boolean);
                fullName = parts.join(' ').trim();
            }
            if (!fullName) {
                fullName = (u.fullName || u.name || '').trim();
                // If full name contains middle names, try to extract first and last
                const tokens = fullName.split(/\s+/).filter(Boolean);
                if (tokens.length > 2) {
                    fullName = `${tokens[0]} ${tokens[tokens.length - 1]}`;
                }
            }
            if (fullName.includes(',') && !u.firstName && !u.lastName) {
                const [last, first] = fullName.split(',').map(s => s.trim());
                if (first && last) {
                    fullName = `${first} ${last}`;
                }
            }

            const idStr = String(u.id || u.uid || u.lrn || u.studentNumber || u.employeeId || '');
            const sectionStr = String(u.section || u.gradeSection || u.gradeLevel || '');
            const deptStr = String(u.department || '');

            const isMatch = matchesQuery(fullName, raw) ||
                            matchesQuery(u.firstName, raw) ||
                            matchesQuery(u.lastName, raw) ||
                            matchesQuery(idStr, raw) ||
                            matchesQuery(sectionStr, raw) ||
                            matchesQuery(deptStr, raw);

            if (isMatch && fullName) {
                const isTeacher = role.includes('teacher') || role.includes('faculty') || role.includes('instructor');
                const isStudent = role.includes('student') || (!isTeacher && !role.includes('admin') && !role.includes('master'));
                const category = isTeacher ? 'teacher' : (isStudent ? 'student' : 'user');
                
                // User metadata: show academic/departmental info only, NO ID or LRN
                let userSubtitle = '';
                let userDetail = '';

                if (isStudent) {
                    userSubtitle = u.section || u.gradeSection || u.gradeLevel || 'Enrolled Student';
                    userDetail = (u.gradeLevel && u.section && u.gradeLevel !== u.section) ? u.gradeLevel : '';
                } else if (isTeacher) {
                    userSubtitle = u.department || 'Senior High Faculty';
                    userDetail = '';
                } else {
                    userSubtitle = 'Administrator';
                    userDetail = '';
                }

                const photo = resolveAvatar(u);

                addResult({
                    id: u.uid || u.id || u.lrn || u.employeeId,
                    title: fullName,
                    category: category,
                    roleLabel: isTeacher ? 'Teacher' : (isStudent ? 'Student' : 'Administrator'),
                    subtitle: userSubtitle,
                    detail: userDetail,
                    avatar: photo,
                    rawUser: u
                });
            }
        });

        // 2. Scan Subjects & Classes scoped by role
        const subjectKeys = portalRole === 'student'
            ? ['sigma_classroom_materials', 'sigma_subjects_v2', 'sigma-subjects-list']
            : ['sigma-admin-subjects', 'sigma-subjects-list', 'sigma_subjects_v2', 'sigma_classroom_materials'];
        for (const k of subjectKeys) {
            try {
                const list = JSON.parse(localStorage.getItem(k) || '[]');
                if (Array.isArray(list)) {
                    list.forEach(s => {
                        if (!s) return;
                        const name = (s.name || s.title || s.subjectName || '').trim();
                        const code = (s.code || s.subjectCode || '').trim();
                        const section = (s.section || '').trim();

                        const isMatch = matchesQuery(name, raw) || matchesQuery(code, raw) || matchesQuery(section, raw);

                        if (isMatch && name) {
                            addResult({
                                id: code || s.id,
                                title: name,
                                category: 'class',
                                roleLabel: 'Subject / Class',
                                subtitle: code ? `Code: ${code}` : 'Senior High Curriculum',
                                detail: section || 'All Active Sections',
                                icon: 'fa-book-open',
                                rawSubject: s
                            });
                        }
                    });
                }
            } catch (_) {}
        }

        // 3. Scan Navigation Pages
        document.querySelectorAll('#sidebar .nav-link, #sidebar .nav-sublink').forEach(link => {
            const label = link.querySelector('span')?.textContent?.trim() || link.textContent?.trim();
            if (label && matchesQuery(label, raw)) {
                addResult({
                    id: link.id,
                    title: label,
                    category: 'page',
                    roleLabel: 'System Page',
                    subtitle: 'Sidebar Navigation Destination',
                    detail: 'Interface Computer College Portal',
                    icon: 'fa-layer-group',
                    action: () => link.click()
                });
            }
        });

        // Prioritize: People FIRST at the top of result, then Classes & Subjects, then Pages
        function getCategoryWeight(cat) {
            if (isPersonCategory(cat)) return 1;
            if (cat === 'class') return 2;
            if (cat === 'page') return 3;
            return 4;
        }

        results.sort((a, b) => {
            const weightA = getCategoryWeight(a.category);
            const weightB = getCategoryWeight(b.category);
            if (weightA !== weightB) {
                return weightA - weightB; // People (1) will always be at the very top!
            }

            const aTitle = (a.title || '').toLowerCase();
            const bTitle = (b.title || '').toLowerCase();
            const aStarts = aTitle.startsWith(lower);
            const bStarts = bTitle.startsWith(lower);
            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;
            return aTitle.localeCompare(bTitle);
        });

        return results;
    }

    function isPersonCategory(category) {
        return category === 'people' || category === 'student' || category === 'teacher' || category === 'user';
    }

    function renderSearchResults(query) {
        const view = ensureSearchResultsView();
        const results = gatherSearchResults(query);

        // Update header query text
        const queryTextEl = view.querySelector('#search-results-query-text');
        if (queryTextEl) queryTextEl.textContent = `"${query}"`;

        // Compute category counts: combine students and teachers into People
        const peopleCount = results.filter(r => isPersonCategory(r.category)).length;
        const classCount = results.filter(r => r.category === 'class').length;
        const pageCount = results.filter(r => r.category === 'page').length;

        const categories = [
            { id: 'all', label: 'All', icon: 'fa-solid fa-list-ul', count: results.length },
            ...(peopleCount > 0 ? [{ id: 'people', label: 'People', icon: 'fa-solid fa-user-group', count: peopleCount }] : []),
            ...(classCount > 0 ? [{ id: 'class', label: 'Classes & Subjects', icon: 'fa-solid fa-book-bookmark', count: classCount }] : []),
            ...(pageCount > 0 ? [{ id: 'page', label: 'Pages', icon: 'fa-solid fa-layer-group', count: pageCount }] : [])
        ];

        // Sanitize current filter if previous category no longer exists
        if (!categories.some(c => c.id === currentCategoryFilter)) {
            currentCategoryFilter = (currentCategoryFilter === 'student' || currentCategoryFilter === 'teacher') && peopleCount > 0
                ? 'people'
                : 'all';
        }

        // Render category filters into the Left Section white panel
        const pillsContainer = view.querySelector('#search-results-filter-pills');
        if (pillsContainer) {
            pillsContainer.innerHTML = categories.map(cat => `
                <button type="button" class="search-filter-item ${currentCategoryFilter === cat.id ? 'active' : ''}" data-cat="${cat.id}" role="tab" aria-selected="${currentCategoryFilter === cat.id}">
                    <span class="flex items-center gap-3.5 min-w-0">
                        <i class="${cat.icon} text-[15px]"></i>
                        <span class="truncate">${cat.label}</span>
                    </span>
                </button>
            `).join('');

            pillsContainer.querySelectorAll('.search-filter-item').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    currentCategoryFilter = btn.dataset.cat;
                    pillsContainer.querySelectorAll('.search-filter-item').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    filterAndDisplayCards(results);
                });
            });
        }

        filterAndDisplayCards(results);
    }

    function filterAndDisplayCards(results) {
        const view = ensureSearchResultsView();
        const container = view.querySelector('#search-results-cards-container');
        const emptyState = view.querySelector('#search-results-empty-state');
        const sentinel = view.querySelector('#search-results-sentinel');
        if (!container || !emptyState) return;

        allFilteredResults = currentCategoryFilter === 'all'
            ? results
            : (currentCategoryFilter === 'people'
                ? results.filter(r => isPersonCategory(r.category))
                : results.filter(r => r.category === currentCategoryFilter));

        if (allFilteredResults.length === 0) {
            container.innerHTML = '';
            emptyState.classList.remove('hidden');
            emptyState.style.display = 'block';
            if (sentinel) sentinel.classList.add('hidden');
            const emptyTitle = emptyState.querySelector('#search-results-empty-title');
            if (emptyTitle) {
                emptyTitle.textContent = currentSearchQuery
                    ? `No matches found for "${currentSearchQuery}"`
                    : 'No matches found';
            }
            return;
        }

        emptyState.classList.add('hidden');
        emptyState.style.display = 'none';
        
        // Reset pagination
        displayedCount = 0;
        container.innerHTML = '';
        
        // Initial render
        renderNextBatch();
        
        // Setup Infinite Scroll
        setupInfiniteScroll();
    }

    function setupInfiniteScroll() {
        const sentinel = document.getElementById('search-results-sentinel');
        if (!sentinel) return;

        if (searchIntersectionObserver) {
            searchIntersectionObserver.disconnect();
        }

        searchIntersectionObserver = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && displayedCount < allFilteredResults.length) {
                renderNextBatch();
            }
        }, { rootMargin: '200px' });

        searchIntersectionObserver.observe(sentinel);
    }

    function renderNextBatch() {
        const view = ensureSearchResultsView();
        const container = view.querySelector('#search-results-cards-container');
        const sentinel = view.querySelector('#search-results-sentinel');
        if (!container) return;

        const startIdx = displayedCount;
        const nextBatch = allFilteredResults.slice(startIdx, startIdx + SEARCH_PAGE_SIZE);
        
        if (nextBatch.length === 0) {
            if (sentinel) sentinel.classList.add('hidden');
            return;
        }

        const html = nextBatch.map((item, idxInBatch) => {
            const itemIdx = startIdx + idxInBatch;
            const isStudent = item.category === 'student';
            const isTeacher = item.category === 'teacher';
            const isClass = item.category === 'class';
            const isPage = item.category === 'page';

            let iconOrAvatarHtml = '';
            if (item.avatar) {
                iconOrAvatarHtml = `
                    <img src="${escapeHtml(item.avatar)}" alt="${escapeHtml(item.title)}" 
                        class="w-11 h-11 rounded-full object-cover aspect-square flex-shrink-0 border border-slate-200" 
                        onerror="this.onerror=null;this.parentElement.innerHTML='<div class=\\'w-11 h-11 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 text-base flex-shrink-0 aspect-square select-none\\'><i class=\\'fa-solid fa-user\\'></i></div>';">
                `;
            } else if (isStudent || isTeacher || item.category === 'user') {
                iconOrAvatarHtml = `
                    <div class="w-11 h-11 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 text-base flex-shrink-0 aspect-square select-none">
                        <i class="fa-solid fa-user"></i>
                    </div>
                `;
            } else if (isClass) {
                iconOrAvatarHtml = `
                    <div class="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center text-lg flex-shrink-0">
                        <i class="fa-solid fa-book-bookmark"></i>
                    </div>
                `;
            } else if (isPage) {
                iconOrAvatarHtml = `
                    <div class="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center text-lg flex-shrink-0">
                        <i class="fa-solid fa-layer-group"></i>
                    </div>
                `;
            } else {
                iconOrAvatarHtml = `
                    <div class="w-11 h-11 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 text-base flex-shrink-0 aspect-square select-none">
                        <i class="fa-solid fa-user"></i>
                    </div>
                `;
            }

            let badgeHtml = '';
            if (isStudent) {
                badgeHtml = `<span class="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#2563eb] text-white shadow-sm">Student</span>`;
            } else if (isTeacher) {
                badgeHtml = `<span class="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#d97706] text-white shadow-sm">Teacher</span>`;
            } else if (isClass) {
                badgeHtml = `<span class="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#7c3aed] text-white shadow-sm">Subject</span>`;
            } else if (item.category === 'user') {
                badgeHtml = `<span class="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#475569] text-white shadow-sm">Admin</span>`;
            } else {
                badgeHtml = `<span class="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#475569] text-white shadow-sm">Page</span>`;
            }

            let actionsHtml = '';
            if (isStudent) {
                actionsHtml = `
                    <div class="flex flex-wrap items-center gap-2.5 mt-3 sm:mt-0">
                        <button type="button" class="sigma-btn sigma-btn-primary search-action-btn search-action-btn--primary" data-action="profile" data-name="${escapeHtml(item.title)}" data-id="${escapeHtml(item.id || '')}" data-role="student" data-index="${itemIdx}">
                            <span>View Profile</span>
                        </button>
                    </div>
                `;
            } else if (isTeacher) {
                actionsHtml = `
                    <div class="flex flex-wrap items-center gap-2.5 mt-3 sm:mt-0">
                        <button type="button" class="sigma-btn sigma-btn-primary search-action-btn search-action-btn--primary" data-action="profile" data-name="${escapeHtml(item.title)}" data-id="${escapeHtml(item.id || '')}" data-role="teacher" data-index="${itemIdx}">
                            <span>View Profile</span>
                        </button>
                    </div>
                `;
            } else if (item.category === 'user') {
                actionsHtml = `
                    <div class="flex flex-wrap items-center gap-2.5 mt-3 sm:mt-0">
                        <button type="button" class="sigma-btn sigma-btn-primary search-action-btn search-action-btn--primary" data-action="profile" data-name="${escapeHtml(item.title)}" data-id="${escapeHtml(item.id || '')}" data-role="admin" data-index="${itemIdx}">
                            <span>View Profile</span>
                        </button>
                    </div>
                `;
            } else if (isClass) {
                actionsHtml = `
                    <div class="flex flex-wrap items-center gap-2.5 mt-3 sm:mt-0">
                        <button type="button" class="sigma-btn sigma-btn-primary search-action-btn search-action-btn--primary" data-action="classroom" data-code="${escapeHtml(item.id || '')}" data-name="${escapeHtml(item.title)}" data-index="${itemIdx}">
                            <span>Open Classroom</span>
                        </button>
                    </div>
                `;
            } else {
                actionsHtml = `
                    <div class="flex flex-wrap items-center gap-2.5 mt-3 sm:mt-0">
                        <button type="button" class="sigma-btn sigma-btn-primary search-action-btn search-action-btn--primary" data-action="page" data-page-id="${escapeHtml(item.id || '')}" data-index="${itemIdx}">
                            <span>Go to Page</span>
                        </button>
                    </div>
                `;
            }

            return `
                <div class="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div class="flex items-center gap-3.5 min-w-0 flex-1">
                        ${iconOrAvatarHtml}
                        <div class="min-w-0 flex-1">
                            <div class="flex items-center gap-2 flex-wrap">
                                <h3 class="text-sm sm:text-base font-bold text-slate-900 truncate">${escapeHtml(item.title)}</h3>
                                ${badgeHtml}
                            </div>
                            ${(!isStudent && !isTeacher && item.category !== 'user') ? `
                            <div class="text-xs text-slate-500 font-medium truncate mt-0.5">
                                ${item.subtitle ? escapeHtml(item.subtitle) : ''}${item.subtitle && item.detail ? ' • ' : ''}${item.detail ? `<span class="text-slate-400">${escapeHtml(item.detail)}</span>` : ''}
                            </div>
                            ` : ''}
                        </div>
                    </div>
                    ${actionsHtml}
                </div>
            `;
        }).join('');

        container.insertAdjacentHTML('beforeend', html);
        
        // Bind actions to the newly added elements
        bindCardActions(container, startIdx, nextBatch.length);
        
        displayedCount += nextBatch.length;

        if (displayedCount >= allFilteredResults.length) {
            if (sentinel) sentinel.classList.add('hidden');
        } else {
            if (sentinel) sentinel.classList.remove('hidden');
        }
    }

    function bindCardActions(container, startIdx, count) {
        container.querySelectorAll('button[data-action]').forEach(btn => {
            const idx = parseInt(btn.dataset.index, 10);
            if (isNaN(idx) || idx < startIdx || idx >= startIdx + count) return;
            
            if (btn.dataset.bound) return;
            btn.dataset.bound = 'true';

            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const action = btn.dataset.action;
                const item = allFilteredResults[idx];
                if (!item) return;

                if (action === 'attendance') {
                    const studentName = btn.dataset.student;
                    goToAttendanceWithStudent(studentName);
                } else if (action === 'profile') {
                    const studentName = btn.dataset.name;
                    const studentId = btn.dataset.id;
                    const role = btn.dataset.role || 'student';
                    goToUserProfile(studentName, studentId, role, item.rawUser);
                } else if (action === 'classes' || action === 'classroom') {
                    goToClasses();
                } else if (action === 'page') {
                    const pageId = btn.dataset.pageId;
                    const link = document.getElementById(pageId);
                    if (link) {
                        closeSearchResultsView();
                        link.click();
                    }
                }
            });
        });
    }

    function goToAttendanceWithStudent(studentName) {
        closeSearchResultsView();
        const portal = getPortalRole();

        if (portal === 'teacher') {
            if (typeof window.switchTab === 'function') {
                window.switchTab('nav-attendance');
            }
            // Highlight and filter student in attendance table
            setTimeout(() => {
                const searchInput = document.getElementById('searchBar');
                if (searchInput) searchInput.value = studentName;
                
                // Highlight row in attendance table if present
                const rows = document.querySelectorAll('#attendance-recording-body tr, table tbody tr');
                rows.forEach(r => {
                    const name = r.textContent || '';
                    if (name.toLowerCase().includes(studentName.toLowerCase())) {
                        r.classList.add('bg-yellow-100/60');
                        r.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    } else if (rows.length > 5) {
                        r.style.display = 'none';
                    }
                });
            }, 100);
        } else {
            if (typeof window.switchTab === 'function') {
                window.switchTab('nav-users-accounts');
            }
        }
    }

    function goToUserProfile(name, id, role, rawUser) {
        closeSearchResultsView();

        const targetUser = rawUser || { id, name, fullName: name, role: role || 'student' };
        targetUser.fromSearch = true; // Mark as coming from search result

        if (typeof window.openUserProfile === 'function') {
            window.openUserProfile(targetUser);
            return;
        }

        if (typeof window.openProfileView === 'function') {
            window.openProfileView(targetUser);
            return;
        }

        if (typeof window.switchTab === 'function') {
            window.switchTab('nav-profile');
        }
    }

    function goToClasses() {
        closeSearchResultsView();
        if (typeof window.switchTab === 'function') {
            window.switchTab('nav-classes');
        }
    }

    window.openSearchResultsView = function (query) {
        currentSearchQuery = (query || '').trim();
        if (!currentSearchQuery) return;

        // Sync search input value
        const searchInput = document.getElementById('searchBar');
        if (searchInput && searchInput.value !== currentSearchQuery) {
            searchInput.value = currentSearchQuery;
        }

        // Remember currently active section (that is NOT search-results-view)
        const activeSec = Array.from(document.querySelectorAll('.dynamic-section'))
            .find(sec => sec.id !== 'search-results-view' && !sec.classList.contains('hidden') && sec.style.display !== 'none');
        if (activeSec) {
            lastActiveSectionId = activeSec.id;
            // Determine friendly section name
            if (activeSec.id.includes('attendance')) lastActiveSectionName = 'Attendance';
            else if (activeSec.id.includes('dashboard') || activeSec.id.includes('home')) lastActiveSectionName = 'Home';
            else if (activeSec.id.includes('user') || activeSec.id.includes('account')) lastActiveSectionName = 'User Accounts';
            else if (activeSec.id.includes('class') || activeSec.id.includes('subject')) lastActiveSectionName = 'Classes';
            else if (activeSec.id.includes('grade')) lastActiveSectionName = 'Gradebook';
            else lastActiveSectionName = 'Previous Page';
        }

        // Hide all other dynamic sections
        document.querySelectorAll('.dynamic-section').forEach(sec => {
            if (sec.id !== 'search-results-view') {
                sec.classList.add('hidden');
                sec.style.display = 'none';
            }
        });

        // Show search results section
        const view = ensureSearchResultsView();
        view.classList.remove('hidden');
        view.style.display = 'block';

        currentCategoryFilter = 'all';
        renderSearchResults(currentSearchQuery);

        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.closeSearchResultsView = function () {
        const view = document.getElementById('search-results-view');
        if (view) {
            view.classList.add('hidden');
            view.style.display = 'none';
        }

        // Clear search input on exit
        const searchInput = document.getElementById('searchBar');
        if (searchInput) searchInput.value = '';

        // Restore last active section
        if (lastActiveSectionId) {
            const prev = document.getElementById(lastActiveSectionId);
            if (prev) {
                prev.classList.remove('hidden');
                prev.style.display = 'block';
                return;
            }
        }

        // Fallback: User accounts, Dashboard, or Home
        const fallback = document.getElementById('users-view') ||
                         document.getElementById('section-dashboard') ||
                         document.getElementById('dashboard-view') ||
                         document.getElementById('section-home');
        if (fallback) {
            fallback.classList.remove('hidden');
            fallback.style.display = 'block';
        }
    };

})();
