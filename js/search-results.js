/**
 * SIGMA ELMS - Global Search Results View Controller (js/search-results.js)
 * Displays a dedicated, full-page search results experience across Admin, Teacher, and Student portals.
 */

(function () {
    'use strict';

    let lastActiveSectionId = null;
    let lastActiveSectionName = 'Previous Page';
    let lastActiveNavId = null;
    let lastActiveHeader = null;
    let currentSearchQuery = '';
    let currentCategoryFilter = 'all';
    let openedAtHash = null;
    function isCurrentHashActive() {
        const view = document.getElementById('search-results-view');
        return Boolean(view && !view.classList.contains('hidden') && view.style.display !== 'none' && location.hash === openedAtHash);
    }
    window.SigmaSearchNavigation = Object.freeze({isCurrentHashActive});
    // A route event queued before opening search must not hide its results after
    // the directory arrives. New navigation still belongs to the portal router.
    window.addEventListener('hashchange', event => {
        if (isCurrentHashActive()) event.stopImmediatePropagation();
    }, true);

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
            view.className = 'dynamic-section hidden w-full font-[\'Inter\']';
            view.innerHTML = `
                <!-- Main Layout (Closed Gap with Sidebar & Navbar, System Settings Style) -->
                <div class="search-results-layout">
                    <!-- Left Section Panel (Closed gap with sidebar and navbar, sticky in view) -->
                    <aside class="search-results-sidebar">
                        <!-- Search Results Query Title -->
                        <div class="search-results-header mb-6 pb-4 border-b border-slate-100 flex-shrink-0">
                            <h1 class="text-[18px] sm:text-[20px] font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                                <i class="fa-solid fa-magnifying-glass text-black text-[16px]"></i>
                                <span>Search Results for <span id="search-results-query-text" class="text-black">""</span></span>
                            </h1>
                        </div>

                        <h2 class="search-results-filter-title text-[13px] font-bold text-black-fade mb-3 px-4 flex-shrink-0">Filter Results</h2>
                        <nav class="search-filter-container flex flex-col gap-1.5 flex-shrink-0" role="tablist" aria-label="Search Categories" id="search-results-filter-pills">
                            <!-- Hydrated dynamically -->
                        </nav>
                    </aside>

                    <!-- Right Content Area (Standalone Cards on Page Background, Not in a Big White Panel) -->
                    <main class="search-results-main">
                        <div class="search-results-inner">
                            <div id="search-results-cards-container" class="space-y-4">
                                <!-- Hydrated dynamically -->
                            </div>

                            <!-- Sentinel for Infinite Scroll -->
                            <div id="search-results-sentinel" class="py-8 flex justify-center opacity-0 pointer-events-none">
                                <div class="w-8 h-8 border-4 border-slate-200 border-t-slate-600 rounded-full animate-spin"></div>
                            </div>

                            <!-- Empty State -->
                            <div id="search-results-empty-state" class="hidden py-16 text-center bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
                                <div class="search-empty-icon-wrap w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-2xl mb-4" style="color: rgba(0, 0, 0, 0.45) !important;">
                                    <i class="fa-solid fa-magnifying-glass" style="color: rgba(0, 0, 0, 0.45) !important;"></i>
                                </div>
                                <h3 class="text-base font-bold text-slate-800 mb-1.5 text-center" id="search-results-empty-title">No matches found</h3>
                                <p class="text-xs text-black-fade max-w-sm mx-auto text-center font-['Inter'] leading-relaxed" style="color: rgba(0, 0, 0, 0.45) !important; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important; text-align: center !important;">We couldn't find anything matching your search. Check for typos or try searching by name or subject.</p>
                            </div>
                        </div>
                    </main>
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

        if (!view.dataset.selectionPreventBound) {
            view.dataset.selectionPreventBound = 'true';
            view.addEventListener('selectstart', (e) => {
                if (!e.target.closest('input, textarea')) {
                    e.preventDefault();
                }
            });
        }

        return view;
    }

    function gatherSearchResults(query) {
        const raw = String(query || '').trim();
        if (!raw) return [];
        const lower = raw.toLowerCase();
        const results = window.SigmaSearchData?.results(raw) || [];
        const addResult = item => { if (!results.some(row => row.category === item.category && row.id === item.id)) results.push(item); };
        const matchesQuery = (value, text) => window.SigmaSearch.text(value, text);

        // School information is available to every signed-in portal through a
        // separate read-only view, independent of school-editing permissions.
        const school = window.SigmaSchoolProfileView?.getProfile();
        if (school && matchesQuery(`School Profile Institution ${school.schoolName}`, raw)) {
            addResult({id:'public-school-profile-view', title:'School Profile', category:'page',
                roleLabel:'Institution', subtitle:school.schoolName, detail:'View school information', schoolLogo:school.logo});
        }
        // 3. Scan Navigation Pages
        document.querySelectorAll('#sidebar .nav-link, #sidebar .nav-sublink').forEach(link => {
            if (link.id === 'nav-school-profile' || link.closest('[data-role-access-hidden], [data-permission-hidden]') || link.style.display === 'none') return;
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
        return category === 'people' || category === 'student' || category === 'teacher' || category === 'user' || category === 'admin';
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
            ...(classCount > 0 ? [{ id: 'class', label: 'Classes', icon: 'fa-solid fa-book-bookmark', count: classCount }] : []),
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
                    <span class="flex items-center gap-3.5 min-w-0 w-full">
                        <i class="${cat.icon} text-[15px] w-5 text-center flex-shrink-0 inline-flex items-center justify-center" aria-hidden="true"></i>
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
        const state = window.SigmaSearchData?.status();
        let status = view.querySelector('#search-data-status');
        if (!status) {
            status = document.createElement('div'); status.id = 'search-data-status';
            status.setAttribute('role','status');
            view.querySelector('.search-results-inner')?.prepend(status);
        }
        status.replaceChildren();
        if (state?.loading && !results.length) {
            status.innerHTML = window.SigmaContentLoading?.html({label:'Searching'}) || 'Searching…';
            view.querySelector('#search-results-empty-state')?.classList.add('hidden');
            const empty = view.querySelector('#search-results-empty-state'); if (empty) empty.style.display = 'none';
        } else if (state?.error) {
            const message = document.createElement('p'); message.textContent = state.error; status.append(message);
            const retry = document.createElement('button'); retry.type = 'button'; retry.className = 'sigma-retry-link'; retry.textContent = 'Try again';
            retry.onclick = () => window.SigmaSearchData?.refresh(); status.append(retry);
        }
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
            emptyState.style.display = 'flex';
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
        
        if (sentinel) sentinel.classList.add('hidden');

        // Assign global index for click handlers
        allFilteredResults.forEach((item, idx) => {
            item._globalIdx = idx;
        });

        const categoryDefs = [
            { id: 'people', label: 'People', icon: 'fa-solid fa-user-group', match: (r) => isPersonCategory(r.category) },
            { id: 'class', label: 'Classes', icon: 'fa-solid fa-book-bookmark', match: (r) => r.category === 'class' },
            { id: 'page', label: 'Pages', icon: 'fa-solid fa-layer-group', match: (r) => r.category === 'page' }
        ];

        let panelsHtml = '';

        categoryDefs.forEach(catDef => {
            if (currentCategoryFilter !== 'all' && currentCategoryFilter !== catDef.id) {
                return;
            }
            const groupItems = allFilteredResults.filter(catDef.match);
            if (groupItems.length === 0) return;

            panelsHtml += `
                <div class="search-category-panel bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-5 last:mb-0" data-category="${catDef.id}">
                    <div class="search-category-panel-header px-4 py-2.5 sm:px-5 sm:py-3 bg-slate-50/80 border-b border-slate-200/70 flex items-center justify-between">
                        <div class="search-category-panel-header-left flex items-center gap-2">
                            <i class="${catDef.icon} search-category-panel-header-icon text-xs sm:text-sm text-black-fade" style="color: rgba(0, 0, 0, 0.45) !important;"></i>
                            <span class="search-category-panel-header-title text-xs sm:text-sm font-bold tracking-tight text-black-fade" style="color: rgba(0, 0, 0, 0.45) !important;">${catDef.label}</span>
                        </div>
                    </div>
                    <div class="search-category-panel-body divide-y divide-slate-100">
                        ${groupItems.map(item => renderCardItem(item, item._globalIdx)).join('')}
                    </div>
                </div>
            `;
        });

        // Any leftover items that don't match the standard 3 categories
        const otherItems = allFilteredResults.filter(r => !isPersonCategory(r.category) && r.category !== 'class' && r.category !== 'page');
        if (otherItems.length > 0 && (currentCategoryFilter === 'all' || currentCategoryFilter === 'other')) {
            panelsHtml += `
                <div class="search-category-panel bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-5 last:mb-0" data-category="other">
                    <div class="search-category-panel-header px-4 py-2.5 sm:px-5 sm:py-3 bg-slate-50/80 border-b border-slate-200/70 flex items-center justify-between">
                        <div class="search-category-panel-header-left flex items-center gap-2">
                            <i class="fa-solid fa-list search-category-panel-header-icon text-xs sm:text-sm text-black-fade" style="color: rgba(0, 0, 0, 0.45) !important;"></i>
                            <span class="search-category-panel-header-title text-xs sm:text-sm font-bold tracking-tight text-black-fade" style="color: rgba(0, 0, 0, 0.45) !important;">Other Results</span>
                        </div>
                    </div>
                    <div class="search-category-panel-body divide-y divide-slate-100">
                        ${otherItems.map(item => renderCardItem(item, item._globalIdx)).join('')}
                    </div>
                </div>
            `;
        }

        container.innerHTML = panelsHtml;
        bindCardActions(container);
    }

    function renderCardItem(item, itemIdx) {
        const itemRole = String(item.role || item.userRole || item.roleLabel || item.rawUser?.role || item.rawUser?.type || '').toLowerCase();
        const isClass = item.category === 'class';
        const isPage = item.category === 'page';
        const isStudent = !isClass && !isPage && (item.category === 'student' || (!item.category && itemRole.includes('student')) || itemRole === 'student');
        const isTeacher = !isClass && !isPage && !isStudent && (item.category === 'teacher' || itemRole.includes('teacher') || itemRole.includes('faculty') || itemRole.includes('instructor'));
        const isAdmin = !isClass && !isPage && !isStudent && !isTeacher && (item.category === 'user' || item.category === 'admin' || itemRole.includes('admin') || itemRole.includes('master'));

        let iconOrAvatarHtml = '';
        if (item.id === 'public-school-profile-view') {
            let logo = 'image/ICC logo.jpg';
            try {
                const candidate = new URL(item.schoolLogo || logo, location.href);
                if (['http:', 'https:', 'blob:'].includes(candidate.protocol) || /^data:image\/(png|jpe?g|gif|webp);/i.test(item.schoolLogo || '')) logo = candidate.href;
            } catch (_) {}
            iconOrAvatarHtml = `<img src="${escapeHtml(logo)}" alt="School profile logo"
                class="search-result-avatar w-[34px] h-[34px] sm:w-[38px] sm:h-[38px] rounded-full object-contain bg-white aspect-square flex-shrink-0 border border-slate-200"
                onerror="this.onerror=null;this.src='image/ICC logo.jpg';">`;
        } else if (item.avatar) {
            iconOrAvatarHtml = `
                <img src="${escapeHtml(item.avatar)}" alt="${escapeHtml(item.title)}" 
                    class="search-result-avatar w-[34px] h-[34px] sm:w-[38px] sm:h-[38px] rounded-full object-cover aspect-square flex-shrink-0 border border-slate-200" 
                    onerror="this.onerror=null;this.parentElement.innerHTML='<div class=\\'search-result-avatar w-[34px] h-[34px] sm:w-[38px] sm:h-[38px] rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 text-sm flex-shrink-0 aspect-square select-none\\'><i class=\\'fa-solid fa-user\\'></i></div>';">
            `;
        } else if (isStudent || isTeacher || isAdmin || item.category === 'user' || item.category === 'people') {
            iconOrAvatarHtml = `
                <div class="search-result-avatar w-[34px] h-[34px] sm:w-[38px] sm:h-[38px] rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 text-sm flex-shrink-0 aspect-square select-none">
                    <i class="fa-solid fa-user"></i>
                </div>
            `;
        } else if (isClass) {
            iconOrAvatarHtml = `
                <div class="search-result-avatar w-[34px] h-[34px] sm:w-[38px] sm:h-[38px] rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center text-sm sm:text-base flex-shrink-0 aspect-square select-none">
                    <i class="fa-solid fa-book-bookmark"></i>
                </div>
            `;
        } else if (isPage) {
            iconOrAvatarHtml = `
                <div class="search-result-avatar w-[34px] h-[34px] sm:w-[38px] sm:h-[38px] rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center text-sm sm:text-base flex-shrink-0 aspect-square select-none">
                    <i class="fa-solid fa-layer-group"></i>
                </div>
            `;
        } else {
            iconOrAvatarHtml = `
                <div class="search-result-avatar w-[34px] h-[34px] sm:w-[38px] sm:h-[38px] rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 text-sm flex-shrink-0 aspect-square select-none">
                    <i class="fa-solid fa-user"></i>
                </div>
            `;
        }

        let badgeHtml = '';
        if (isStudent) {
            badgeHtml = `<span class="search-role-badge search-role-badge--student px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-white shadow-sm" style="background-color: #2563eb !important; color: #ffffff !important; display: inline-flex !important; align-items: center !important;">Student</span>`;
        } else if (isTeacher) {
            badgeHtml = `<span class="search-role-badge search-role-badge--teacher px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-white shadow-sm" style="background-color: #2563eb !important; color: #ffffff !important; display: inline-flex !important; align-items: center !important;">Teacher</span>`;
        } else if (isAdmin) {
            badgeHtml = `<span class="search-role-badge search-role-badge--admin px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-white shadow-sm" style="background-color: #2563eb !important; color: #ffffff !important; display: inline-flex !important; align-items: center !important;">Admin</span>`;
        } else if (isClass) {
            badgeHtml = `<span class="search-role-badge search-role-badge--subject px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-white shadow-sm" style="background-color: #7c3aed !important; color: #ffffff !important; display: inline-flex !important; align-items: center !important;">Subject</span>`;
        } else {
            badgeHtml = `<span class="search-role-badge search-role-badge--page px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-white shadow-sm" style="background-color: #64748b !important; color: #ffffff !important; display: inline-flex !important; align-items: center !important;">Page</span>`;
        }

        let actionsHtml = '';
        if (isStudent) {
            actionsHtml = `
                <div class="search-result-actions flex flex-wrap items-center gap-2.5 mt-3 sm:mt-0">
                    <button type="button" class="sigma-btn sigma-btn-primary search-action-btn search-action-btn--primary" data-action="profile" data-name="${escapeHtml(item.title)}" data-id="${escapeHtml(item.id || '')}" data-role="student" data-index="${itemIdx}">
                        <span>View Profile</span>
                    </button>
                </div>
            `;
        } else if (isTeacher) {
            actionsHtml = `
                <div class="search-result-actions flex flex-wrap items-center gap-2.5 mt-3 sm:mt-0">
                    <button type="button" class="sigma-btn sigma-btn-primary search-action-btn search-action-btn--primary" data-action="profile" data-name="${escapeHtml(item.title)}" data-id="${escapeHtml(item.id || '')}" data-role="teacher" data-index="${itemIdx}">
                        <span>View Profile</span>
                    </button>
                </div>
            `;
        } else if (isAdmin || item.category === 'user') {
            actionsHtml = `
                <div class="search-result-actions flex flex-wrap items-center gap-2.5 mt-3 sm:mt-0">
                    <button type="button" class="sigma-btn sigma-btn-primary search-action-btn search-action-btn--primary" data-action="profile" data-name="${escapeHtml(item.title)}" data-id="${escapeHtml(item.id || '')}" data-role="admin" data-index="${itemIdx}">
                        <span>View Profile</span>
                    </button>
                </div>
            `;
        } else if (isClass) {
            actionsHtml = `
                <div class="search-result-actions flex flex-wrap items-center gap-2.5 mt-3 sm:mt-0">
                    <button type="button" class="sigma-btn sigma-btn-primary search-action-btn search-action-btn--primary" data-action="classroom" data-code="${escapeHtml(item.id || '')}" data-name="${escapeHtml(item.title)}" data-index="${itemIdx}">
                        <span>Open Classroom</span>
                    </button>
                </div>
            `;
        } else {
            actionsHtml = `
                <div class="search-result-actions flex flex-wrap items-center gap-2.5 mt-3 sm:mt-0">
                    <button type="button" class="sigma-btn sigma-btn-primary search-action-btn search-action-btn--primary" data-action="page" data-page-id="${escapeHtml(item.id || '')}" data-index="${itemIdx}">
                        <span>${item.id === 'public-school-profile-view' ? 'View Profile' : 'Go to Page'}</span>
                    </button>
                </div>
            `;
        }

        return `
            <div class="search-result-card search-result-row p-3 sm:p-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4" data-index="${itemIdx}">
                <div class="search-result-card-info flex items-center gap-3.5 min-w-0 flex-1">
                    ${iconOrAvatarHtml}
                    <div class="min-w-0 flex-1">
                        <div class="search-result-card-title-row flex items-center gap-1.5 flex-nowrap min-w-0">
                            <h3 class="search-result-title text-xs sm:text-sm font-bold text-slate-900 truncate min-w-0">${escapeHtml(item.title)}</h3>
                            ${badgeHtml}
                        </div>
                        ${isClass ? `
                        <div class="search-result-subtitle text-xs text-black-fade font-normal leading-relaxed mt-1 font-['Inter']" style="color: rgba(0, 0, 0, 0.45) !important;">
                            <div>Section: ${escapeHtml(item.section || '')}</div>
                            <div>Grade Level: ${escapeHtml(item.gradeLevel || '')}</div>
                        </div>
                        ` : (!isStudent && !isTeacher && !isAdmin && item.category !== 'user') ? `
                        <div class="search-result-subtitle text-xs text-slate-500 font-medium truncate mt-0.5">
                            ${item.subtitle ? escapeHtml(item.subtitle) : ''}${item.subtitle && item.detail ? ' • ' : ''}${item.detail ? `<span class="text-slate-400">${escapeHtml(item.detail)}</span>` : ''}
                        </div>
                        ` : ''}
                    </div>
                </div>
                ${actionsHtml}
            </div>
        `;
    }

    function bindCardActions(container) {
        if (!container) return;

        container.querySelectorAll('button[data-action]').forEach(btn => {
            const idx = parseInt(btn.dataset.index, 10);
            if (isNaN(idx)) return;
            
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
                    goToClasses(item);
                } else if (action === 'page') {
                    const pageId = btn.dataset.pageId;
                    if (['public-school-profile-view', 'nav-school-profile'].includes(pageId)) {
                        closeSearchResultsView();
                        window.SigmaSchoolProfileView?.open();
                        return;
                    }
                    const link = document.getElementById(pageId);
                    if (link) {
                        closeSearchResultsView();
                        link.click();
                    }
                }
            });
        });

        // Also allow clicking the info area of a class card to directly open the classroom
        container.querySelectorAll('.search-result-card').forEach((cardEl) => {
            const idx = parseInt(cardEl.dataset.index, 10);
            if (isNaN(idx)) return;
            const item = allFilteredResults[idx];
            if (item && item.category === 'class') {
                const infoEl = cardEl.querySelector('.search-result-card-info');
                if (infoEl && !infoEl.dataset.clickBound) {
                    infoEl.dataset.clickBound = 'true';
                    infoEl.classList.add('cursor-pointer');
                    infoEl.addEventListener('click', (e) => {
                        if (e.target.closest('button')) return;
                        goToClasses(item);
                    });
                }
            }
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

    function goToClasses(item) {
        closeSearchResultsView();
        if (item) {
            const sec = (item.section || '').replace(/^Grade\s*\d+\s*[-–:]*\s*/i, '').trim();
            const subj = item.title || item.subject || '';
            const cardId = item.id || '';

            // 1. Admin Portal
            if (typeof window.showAdminClassroom === 'function' && sec && subj) {
                window.showAdminClassroom(sec, subj, 'room');
                window.location.hash = `#classroom:${encodeURIComponent(sec)}:${encodeURIComponent(subj)}:room`;
                return;
            }

            // 2. Teacher Portal
            if (typeof window.showStudentList === 'function' && sec && subj) {
                window.showStudentList(sec, subj, 'room');
                window.location.hash = `#classroom:${encodeURIComponent(sec)}:${encodeURIComponent(subj)}:room`;
                return;
            }

            // 3. Student Portal
            if (typeof window.showClassroomDetail === 'function') {
                window.showClassroomDetail(cardId || subj, true, 'room');
                return;
            }

            // 4. Authoritative openClassroomTopics helper
            if (typeof window.openClassroomTopics === 'function') {
                window.openClassroomTopics(cardId, sec, subj);
                return;
            }

            // 5. Deep Link Hash Fallback
            if (sec && subj) {
                window.location.hash = `#classroom:${encodeURIComponent(sec)}:${encodeURIComponent(subj)}:room`;
                return;
            }
        }
        if (typeof window.switchTab === 'function') {
            window.switchTab('nav-classes');
        }
    }

    window.openSearchResultsView = function (query) {
        currentSearchQuery = (query || '').trim();
        if (!currentSearchQuery) return;
        openedAtHash = location.hash;

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

        // Remember currently active sidebar nav link (if any)
        const activeLink = document.querySelector('#sidebar .nav-link.active, #sidebar .nav-sublink.active, #sidebar .teacher-section-room-link.active, #sidebar .student-section-room-link.active');
        if (activeLink && activeLink.id) {
            lastActiveNavId = activeLink.id;
        }

        // Remember current navbar header title
        const brandTitle = document.getElementById('nav-context-text') || document.getElementById('header-brand-title');
        if (brandTitle) {
            const topic = brandTitle.querySelector('.breadcrumb-topic');
            const subj = brandTitle.querySelector('.breadcrumb-subject');
            if (topic && subj) {
                lastActiveHeader = { title: subj.textContent.trim(), subtitle: topic.textContent.trim() };
            } else {
                lastActiveHeader = { title: brandTitle.textContent.trim() };
            }
        }

        // Set navbar header to the name of the school
        if (typeof window.setPortalHeader === 'function') {
            window.setPortalHeader('Interface Computer College');
        } else if (brandTitle) {
            brandTitle.textContent = 'Interface Computer College';
        }

        // Make sure no sidebar tabs are selected on search result page
        document.querySelectorAll('#sidebar .nav-link, #sidebar .nav-sublink, #sidebar .teacher-section-room-link, #sidebar .student-section-room-link, .nav-link, .nav-sublink').forEach(link => {
            link.classList.remove('active');
            link.setAttribute('aria-selected', 'false');
        });
        document.querySelectorAll('#sidebar [data-toggle="submenu"], #sidebar .nav-link--group').forEach(btn => {
            btn.classList.remove('active', 'open');
            btn.setAttribute('aria-expanded', 'false');
        });

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
        try { window.getSelection?.()?.removeAllRanges?.(); } catch (_) {}
        renderSearchResults(currentSearchQuery);
        window.SigmaSearchData?.refresh();

        const mainScroll = view.querySelector('.search-results-main');
        if (mainScroll) mainScroll.scrollTop = 0;
        const sideScroll = view.querySelector('.search-results-sidebar');
        if (sideScroll) sideScroll.scrollTop = 0;
        const layoutWrapper = document.getElementById('layout-wrapper');
        if (layoutWrapper) layoutWrapper.scrollTop = 0;
        const mainContent = document.getElementById('main-content');
        if (mainContent) mainContent.scrollTop = 0;
        const adminMain = document.getElementById('admin-main');
        if (adminMain) adminMain.scrollTop = 0;
        const contentSections = document.getElementById('content-sections');
        if (contentSections) contentSections.scrollTop = 0;
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        try { window.scrollTo({ top: 0, behavior: 'instant' }); } catch (e) { window.scrollTo(0, 0); }
    };

    window.addEventListener('sigma:search-data-ready', () => {
        const view = document.getElementById('search-results-view');
        if (view && !view.classList.contains('hidden') && currentSearchQuery) renderSearchResults(currentSearchQuery);
    });

    window.closeSearchResultsView = function () {
        const view = document.getElementById('search-results-view');
        if (view) {
            view.classList.add('hidden');
            view.style.display = 'none';
        }

        // Clear search input on exit
        const searchInput = document.getElementById('searchBar');
        if (searchInput) searchInput.value = '';

        // If we remembered a specific navId and switchTab is available, restore via switchTab
        if (lastActiveNavId && typeof window.switchTab === 'function') {
            window.switchTab(lastActiveNavId);
            return;
        }

        // Restore last active section
        if (lastActiveSectionId) {
            const prev = document.getElementById(lastActiveSectionId);
            if (prev) {
                prev.classList.remove('hidden');
                prev.style.display = 'block';

                // Restore active state in sidebar
                if (lastActiveNavId) {
                    const navEl = document.getElementById(lastActiveNavId);
                    if (navEl) navEl.classList.add('active');
                }

                // Restore portal header
                if (lastActiveHeader && typeof window.setPortalHeader === 'function') {
                    window.setPortalHeader(lastActiveHeader.title, lastActiveHeader.subtitle);
                }
                return;
            }
        }

        // Fallback: Dashboard, User accounts, or Home
        if (typeof window.switchTab === 'function') {
            window.switchTab('nav-dashboard') || window.switchTab('nav-home') || window.switchTab('nav-users');
            return;
        }
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
