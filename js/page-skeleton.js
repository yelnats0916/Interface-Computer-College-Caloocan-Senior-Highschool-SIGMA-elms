(function () {
    'use strict';
    let overlay;
    let active = 0;
    let target;
    let previousBusy;
    let initialFrame = false;
    let initialPending = 0;
    const panelSelector = '.sigma-black-fade-panel,.topic-progress-card,.topic-card,.sigma-card,.home-dashboard-card,.home-overview-card,.announcement-card,.sigma-announcements-empty-state,.assessment-material-main-card,.topic-overview-body-card,.topic-video-player-panel,.welcome-panel,.classroom-room-hero-banner,.gwa-card,.student-grades-insights-card,.student-grades-summary-panel,.subject-performance-card,.sigma-interactive-metric-card,.active-question-card,.deck-thumbnail-card,.quiz-empty-question-state,.quiz-deck-empty-state,.quiz-skeleton-card,.quiz-skeleton-deck-card,.sigma-empty-state';

    document.documentElement.classList.add('sigma-initial-loading');

    let initialDismissed = false;
    let earlyRouteObserver;

    function revealInitial() {
        if (initialDismissed) return;
        if (initialPending > 0) return;
        initialDismissed = true;
        if (earlyRouteObserver) earlyRouteObserver.disconnect();
        document.documentElement.classList.remove('sigma-initial-loading');
    }

    function create() {
        if (overlay) return overlay;
        overlay = document.createElement('div');
        overlay.className = 'sigma-skeleton';
        overlay.setAttribute('role', 'status');
        overlay.setAttribute('aria-label', 'Loading page');
        document.body.appendChild(overlay);
        return overlay;
    }

    function mainScope() {
        return document.getElementById('main-content') || document.getElementById('admin-main');
    }

    function draw(scope) {
        if (!overlay || overlay.hidden || !scope) return;
        const rect = scope.getBoundingClientRect();
        const top = Math.max(0, rect.top);
        const left = Math.max(0, rect.left);
        overlay.style.inset = `${top}px auto auto ${left}px`;
        overlay.style.width = `${Math.max(0, Math.min(rect.right, window.innerWidth) - left)}px`;
        overlay.style.height = `${Math.max(0, window.innerHeight - top)}px`;
        overlay.replaceChildren();
        const candidates = scope.querySelectorAll('h1,h2,h3,h4,h5,p,img,button,input,select,textarea,table,.standard-panel-shadow,.active-question-card,.deck-thumbnail-card,.quiz-general-image-panel,' + panelSelector);
        let count = 0;
        candidates.forEach(node => {
            if (count >= 160) return;
            if (node.closest('[role="dialog"], [aria-modal="true"], [id*="modal"], .modal, .header-panel, [data-sigma-loading="exclude"], #export-quiz-dropdown-menu, .dropdown-menu')) return;
            const panel = node.closest(panelSelector);
            if (panel && panel !== node) return;
            const box = node.getBoundingClientRect();
            const computed = window.getComputedStyle(node);
            if (!box.width || !box.height || box.bottom <= top || box.top >= window.innerHeight
                || computed.visibility === 'hidden' || computed.display === 'none') return;
            const block = document.createElement('div');
            block.className = 'sigma-skeleton-block sigma-skeleton-matched';
            block.setAttribute('aria-hidden', 'true');
            const isText = /^(H[1-6]|P|LABEL|SPAN)$/.test(node.tagName) && box.height < 32;
            const isHero = node.matches('.welcome-panel, #welcome-panel, .welcome-panel-container, .classroom-room-hero-banner');
            const isPill = node.matches('.sigma-feed-tab-btn, [data-announcement-tab], .header-search-shell, .header-search-container, .feed-filter-btn, .sigma-filter-pill');
            const isCircle = node.matches('.sigma-user-avatar, .header-icon-btn, .header-profile-btn, .header-avatar, .student-grade-teacher-avatar, img.rounded-full') || (Math.abs(box.width - box.height) <= 6 && box.width <= 48);
            const isSubCard = node.matches('.active-question-card, .deck-thumbnail-card, .quiz-empty-question-state, .quiz-deck-empty-state, .quiz-general-image-panel, .sigma-table, table, #attendance-table-container, .student-grades-summary-panel');
            const isCard = node.matches(panelSelector) || box.height >= 90;

            let radius = '4px';
            if (isCircle) {
                radius = '50%';
            } else if (isPill) {
                radius = '9999px';
            } else if (isHero) {
                radius = window.innerWidth <= 768 ? '20px' : '24px';
            } else if (isCard && !isSubCard) {
                radius = window.innerWidth <= 768 ? '16px' : '20px';
            } else if (isSubCard || box.height >= 40) {
                radius = window.innerWidth <= 768 ? '12px' : '16px';
            } else if (computed.borderRadius && computed.borderRadius !== '0px') {
                radius = computed.borderRadius;
            }

            block.style.left = `${box.left - left}px`;
            block.style.top = `${box.top - top}px`;
            block.style.width = `${box.width}px`;
            block.style.height = `${box.height}px`;
            block.style.borderRadius = radius;
            block.classList.toggle('sigma-skeleton-surface', !isText && box.height > 80);
            overlay.appendChild(block);
            count++;
        });
    }

    function finish(token) {
        if (token !== active) return;
        if (overlay) overlay.hidden = true;
        if (target) {
            if (previousBusy === null) target.removeAttribute('aria-busy');
            else target.setAttribute('aria-busy', previousBusy);
        }
        target = null;
    }

    function begin(scope, layout = 'dashboard') {
        scope = scope || mainScope();
        if (!scope) return () => {};
        finish(active);
        const token = ++active;
        const element = create();
        element.hidden = false;
        element.dataset.layout = layout;
        if (scope) {
            target = scope;
            previousBusy = scope.getAttribute('aria-busy');
            scope.setAttribute('aria-busy', 'true');
        }
        draw(scope);
        requestAnimationFrame(() => { if (token === active) draw(scope); });
        return () => finish(token);
    }

    const feedRevealTokens = new WeakMap();
    window.SigmaPageLoading = {
        async waitForInitial(operation) {
            initialPending++;
            try { return await operation(); }
            finally {
                initialPending--;
                if (initialFrame) requestAnimationFrame(revealInitial);
            }
        },
        showRenderingLoading(scope, durationMs) {
            if (!scope) return () => {};
            scope.classList.add('sigma-rendering-loading');
            scope.setAttribute('aria-busy', 'true');
            let cleared = false;
            const clear = () => {
                if (cleared) return;
                cleared = true;
                scope.classList.remove('sigma-rendering-loading');
                scope.removeAttribute('aria-busy');
            };
            if (typeof durationMs === 'number' && durationMs > 0) {
                setTimeout(clear, durationMs);
            }
            return clear;
        },
        async wrapRendering(scope, operation, minMs = 0, minDisplayMs = 0) {
            if (!scope || typeof operation !== 'function') return operation ? operation() : undefined;
            const start = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
            const clear = this.showRenderingLoading(scope);
            const targetMin = (typeof minDisplayMs === 'number' && minDisplayMs > 0) ? minDisplayMs : (typeof minMs === 'number' ? minMs : 0);
            try {
                return await operation();
            } finally {
                const elapsed = ((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - start;
                const remaining = Math.max(0, targetMin - elapsed);
                if (remaining > 0) {
                    setTimeout(clear, remaining);
                } else {
                    clear();
                }
            }
        },
        revealFeed(scope) {
            if (!scope) return;
            const previous = feedRevealTokens.get(scope);
            const state = { busy: previous ? previous.busy : scope.getAttribute('aria-busy') };
            feedRevealTokens.set(scope, state);
            scope.classList.add('sigma-feed-initial-loading');
            scope.setAttribute('aria-busy', 'true');
            // Allow the blank loading surface to paint before revealing the rendered batch.
            requestAnimationFrame(() => requestAnimationFrame(() => {
                if (feedRevealTokens.get(scope) !== state) return;
                scope.classList.remove('sigma-feed-initial-loading');
                if (state.busy === null) scope.removeAttribute('aria-busy');
                else scope.setAttribute('aria-busy', state.busy);
                feedRevealTokens.delete(scope);
            }));
        },
        begin,
        async run(scope, operation, layout) {
            const done = begin(scope, layout);
            try { return await operation(); } finally { done(); }
        },
        resolveRouteFromHash,
        resolveLayoutFromSectionId,
        getContentSkeletonHtml,
        showContentSkeleton,
        hideContentSkeleton,
        mountEarlyHashSkeleton
    };

    function resolveRouteFromHash(hash) {
        const clean = String(hash || '').replace(/^#/, '').trim();
        if (!clean || clean === 'dashboard' || clean === 'home' || clean === 'nav-dashboard') {
            return { sectionId: 'dashboard-view,section-dashboard,section-home', layout: 'dashboard' };
        }
        if (clean.startsWith('topic-content') || clean.startsWith('topic_content')) {
            return { sectionId: 'section-topic-content', layout: 'topic-content' };
        }
        if (clean.startsWith('topic-detail') || clean.startsWith('topic_detail') || clean.startsWith('topic:')) {
            return { sectionId: 'section-topic-detail', layout: 'topic-detail' };
        }
        if (clean.startsWith('classroom')) {
            return { sectionId: 'section-classroom-detail,classroom-detail-view', layout: 'classroom-detail' };
        }
        if (clean.startsWith('curriculum')) {
            return { sectionId: 'section-curriculum-page', layout: 'curriculum' };
        }
        if (clean.startsWith('grade') || clean.startsWith('analytics')) {
            return { sectionId: 'section-grades,school-grades-view,reports-performance-view', layout: 'grades' };
        }
        if (clean.startsWith('attendance') || clean.startsWith('calendar')) {
            return { sectionId: 'section-attendance,reports-attendance-view', layout: 'attendance' };
        }
        if (clean.startsWith('resources')) {
            return { sectionId: 'resources-view', layout: 'materials' };
        }
        if (clean.startsWith('materials')) {
            return { sectionId: 'section-materials', layout: 'materials' };
        }
        if (clean.startsWith('assessment') || clean.startsWith('assignment')) {
            return { sectionId: 'section-assessments,section-assignments', layout: 'assessments' };
        }
        if (clean.startsWith('user') || clean.startsWith('profile')) {
            return { sectionId: 'user-profile-view,users-view', layout: 'generic' };
        }
        if (clean.startsWith('setting')) {
            return { sectionId: 'user-settings-view', layout: 'generic' };
        }
        return { sectionId: 'section-topic-content', layout: 'generic' };
    }

    function resolveLayoutFromSectionId(id) {
        const clean = String(id || '').replace(/^#/, '').trim();
        if (clean === 'section-topic-content') return 'topic-content';
        if (clean === 'section-topic-detail') return 'topic-detail';
        if (clean === 'section-classroom-detail' || clean === 'classroom-detail-view') return 'classroom-detail';
        if (clean === 'section-curriculum-page') return 'curriculum';
        if (clean === 'section-grades' || clean === 'school-grades-view' || clean === 'reports-performance-view') return 'grades';
        if (clean === 'section-attendance' || clean === 'reports-attendance-view') return 'attendance';
        if (clean === 'section-materials' || clean === 'resources-view') return 'materials';
        if (clean === 'section-assessments' || clean === 'section-assignments') return 'assessments';
        return 'generic';
    }

    function getContentSkeletonHtml(layoutType = 'generic', options = {}) {
        const layout = String(layoutType || 'generic').toLowerCase();

        if (layout === 'topic-content') {
            return `
<div class="sigma-content-skeleton sigma-skeleton-topic-content p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto font-['Inter']" data-sigma-skeleton="topic-content">
    <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="space-y-2">
            <div class="sigma-skeleton-block h-4 w-48 rounded"></div>
            <div class="flex items-center gap-3">
                <div class="sigma-skeleton-block h-8 w-72 sm:w-96 rounded-lg"></div>
                <div class="sigma-skeleton-block h-6 w-28 rounded-full"></div>
            </div>
        </div>
        <div class="flex items-center gap-3">
            <div class="sigma-feed-tab-btn sigma-skeleton-block h-9 w-28 rounded-full"></div>
            <div class="sigma-feed-tab-btn sigma-skeleton-block h-9 w-9 rounded-full"></div>
        </div>
    </div>

    <div class="flex items-center gap-3 border-b border-slate-200 pb-3">
        <div class="sigma-feed-tab-btn sigma-skeleton-block h-9 w-32 rounded-full"></div>
        <div class="sigma-feed-tab-btn sigma-skeleton-block h-9 w-36 rounded-full"></div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div class="lg:col-span-8 space-y-6">
            <div class="assessment-material-main-card sigma-skeleton-card sigma-card p-6 rounded-[20px] min-h-[460px] space-y-6">
                <div class="flex flex-wrap items-center justify-between gap-4">
                    <div class="space-y-2">
                        <div class="sigma-skeleton-block h-6 w-64 rounded-md"></div>
                        <div class="sigma-skeleton-block h-4 w-40 rounded"></div>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="sigma-skeleton-block h-7 w-20 rounded-full"></div>
                        <div class="sigma-skeleton-block h-7 w-24 rounded-full"></div>
                    </div>
                </div>

                <div class="space-y-2.5 pt-2">
                    <div class="sigma-skeleton-block h-4 w-full rounded"></div>
                    <div class="sigma-skeleton-block h-4 w-11/12 rounded"></div>
                    <div class="sigma-skeleton-block h-4 w-4/5 rounded"></div>
                </div>

                <div class="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="sigma-skeleton-block h-10 w-10 rounded-lg"></div>
                            <div class="space-y-1.5">
                                <div class="sigma-skeleton-block h-4 w-48 rounded"></div>
                                <div class="sigma-skeleton-block h-3 w-24 rounded"></div>
                            </div>
                        </div>
                        <div class="sigma-skeleton-block h-8 w-24 rounded-lg"></div>
                    </div>
                    <div class="sigma-skeleton-block h-56 sm:h-72 w-full rounded-lg"></div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div class="border border-slate-200 rounded-xl p-4 space-y-3">
                        <div class="sigma-skeleton-block h-4 w-32 rounded"></div>
                        <div class="space-y-2">
                            <div class="flex justify-between items-center"><div class="sigma-skeleton-block h-3 w-20 rounded"></div><div class="sigma-skeleton-block h-3 w-24 rounded"></div></div>
                            <div class="flex justify-between items-center"><div class="sigma-skeleton-block h-3 w-24 rounded"></div><div class="sigma-skeleton-block h-3 w-28 rounded"></div></div>
                            <div class="flex justify-between items-center"><div class="sigma-skeleton-block h-3 w-16 rounded"></div><div class="sigma-skeleton-block h-3 w-20 rounded"></div></div>
                        </div>
                    </div>
                    <div class="border border-slate-200 rounded-xl p-4 space-y-3">
                        <div class="sigma-skeleton-block h-4 w-36 rounded"></div>
                        <div class="space-y-2">
                            <div class="flex justify-between items-center"><div class="sigma-skeleton-block h-3 w-20 rounded"></div><div class="sigma-skeleton-block h-3 w-24 rounded"></div></div>
                            <div class="flex justify-between items-center"><div class="sigma-skeleton-block h-3 w-28 rounded"></div><div class="sigma-skeleton-block h-3 w-20 rounded"></div></div>
                            <div class="flex justify-between items-center"><div class="sigma-skeleton-block h-3 w-16 rounded"></div><div class="sigma-skeleton-block h-3 w-24 rounded"></div></div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="sigma-skeleton-card sigma-card p-6 rounded-[20px] min-h-[200px] space-y-4">
                <div class="sigma-skeleton-block h-6 w-48 rounded"></div>
                <div class="sigma-skeleton-block h-24 w-full rounded-xl"></div>
            </div>
        </div>

        <div class="lg:col-span-4 space-y-6">
            <div class="home-dashboard-card sigma-skeleton-card sigma-card p-5 rounded-[20px] min-h-[280px] space-y-4">
                <div class="flex items-center justify-between">
                    <div class="sigma-skeleton-block h-5 w-32 rounded"></div>
                    <div class="sigma-skeleton-block h-6 w-20 rounded-full"></div>
                </div>
                <div class="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <div class="sigma-skeleton-block h-9 w-9 rounded-full shrink-0"></div>
                    <div class="space-y-1.5 flex-1">
                        <div class="sigma-skeleton-block h-3.5 w-24 rounded"></div>
                        <div class="sigma-skeleton-block h-3 w-32 rounded"></div>
                    </div>
                </div>
                <div class="space-y-1.5">
                    <div class="sigma-skeleton-block h-3 w-20 rounded"></div>
                    <div class="sigma-skeleton-block h-10 w-full rounded-xl"></div>
                </div>
                <div class="space-y-1.5">
                    <div class="sigma-skeleton-block h-3 w-28 rounded"></div>
                    <div class="sigma-skeleton-block h-20 w-full rounded-xl"></div>
                </div>
                <div class="sigma-skeleton-block h-10 w-full rounded-xl"></div>
            </div>

            <div class="home-dashboard-card sigma-skeleton-card sigma-card p-5 rounded-[20px] min-h-[240px] space-y-4">
                <div class="flex items-center justify-between">
                    <div class="sigma-skeleton-block h-5 w-28 rounded"></div>
                    <div class="sigma-skeleton-block h-4 w-12 rounded"></div>
                </div>
                <div class="space-y-3">
                    <div class="flex items-center gap-3 p-2.5 rounded-lg border border-slate-100">
                        <div class="sigma-skeleton-block h-8 w-8 rounded-lg shrink-0"></div>
                        <div class="space-y-1 flex-1">
                            <div class="sigma-skeleton-block h-3.5 w-36 rounded"></div>
                            <div class="sigma-skeleton-block h-2.5 w-20 rounded"></div>
                        </div>
                    </div>
                    <div class="flex items-center gap-3 p-2.5 rounded-lg border border-slate-100">
                        <div class="sigma-skeleton-block h-8 w-8 rounded-lg shrink-0"></div>
                        <div class="space-y-1 flex-1">
                            <div class="sigma-skeleton-block h-3.5 w-40 rounded"></div>
                            <div class="sigma-skeleton-block h-2.5 w-24 rounded"></div>
                        </div>
                    </div>
                    <div class="flex items-center gap-3 p-2.5 rounded-lg border border-slate-100">
                        <div class="sigma-skeleton-block h-8 w-8 rounded-lg shrink-0"></div>
                        <div class="space-y-1 flex-1">
                            <div class="sigma-skeleton-block h-3.5 w-32 rounded"></div>
                            <div class="sigma-skeleton-block h-2.5 w-16 rounded"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
`;
        }

        if (layout === 'topic-detail') {
            return `
<div class="sigma-content-skeleton sigma-skeleton-topic-detail p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto font-['Inter']" data-sigma-skeleton="topic-detail">
    <div class="classroom-room-hero-banner sigma-skeleton-card min-h-[140px] rounded-[24px] p-6 sm:p-8 space-y-4">
        <div class="sigma-skeleton-block h-4 w-36 rounded"></div>
        <div class="flex flex-wrap items-center justify-between gap-4">
            <div class="space-y-2">
                <div class="sigma-skeleton-block h-8 w-72 sm:w-96 rounded-lg"></div>
                <div class="sigma-skeleton-block h-4 w-60 rounded"></div>
            </div>
            <div class="sigma-skeleton-block h-8 w-32 rounded-full"></div>
        </div>
        <div class="flex items-center gap-3 pt-2 border-t border-slate-100">
            <div class="sigma-feed-tab-btn sigma-skeleton-block h-9 w-28 rounded-full"></div>
            <div class="sigma-feed-tab-btn sigma-skeleton-block h-9 w-28 rounded-full"></div>
            <div class="sigma-feed-tab-btn sigma-skeleton-block h-9 w-32 rounded-full"></div>
        </div>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        ${Array.from({ length: 6 }).map(() => `
        <div class="topic-card sigma-skeleton-card sigma-card min-h-[220px] rounded-[20px] p-5 space-y-4">
            <div class="sigma-skeleton-block h-36 w-full rounded-xl"></div>
            <div class="space-y-2">
                <div class="sigma-skeleton-block h-4 w-4/5 rounded"></div>
                <div class="sigma-skeleton-block h-3 w-1/2 rounded"></div>
            </div>
            <div class="flex items-center justify-between pt-2 border-t border-slate-100">
                <div class="sigma-skeleton-block h-6 w-20 rounded-full"></div>
                <div class="sigma-skeleton-block h-8 w-24 rounded-lg"></div>
            </div>
        </div>
        `).join('')}
    </div>
</div>
`;
        }

        if (layout === 'classroom-detail') {
            return `
<div class="sigma-content-skeleton sigma-skeleton-classroom-detail p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto font-['Inter']" data-sigma-skeleton="classroom-detail">
    <div class="classroom-room-hero-banner sigma-skeleton-card min-h-[160px] rounded-[24px] p-6 sm:p-8 space-y-3 flex flex-col justify-end">
        <div class="sigma-skeleton-block h-5 w-24 rounded-full"></div>
        <div class="sigma-skeleton-block h-8 w-72 sm:w-96 rounded-lg"></div>
        <div class="sigma-skeleton-block h-4 w-48 rounded"></div>
    </div>
    <div class="flex items-center gap-3 border-b border-slate-200 pb-3">
        <div class="sigma-feed-tab-btn sigma-skeleton-block h-9 w-24 rounded-full"></div>
        <div class="sigma-feed-tab-btn sigma-skeleton-block h-9 w-28 rounded-full"></div>
        <div class="sigma-feed-tab-btn sigma-skeleton-block h-9 w-24 rounded-full"></div>
        <div class="sigma-feed-tab-btn sigma-skeleton-block h-9 w-24 rounded-full"></div>
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div class="lg:col-span-8 space-y-5">
            <div class="home-feed-card sigma-skeleton-card sigma-card min-h-[100px] rounded-[20px] p-5 space-y-3">
                <div class="flex items-center gap-3">
                    <div class="sigma-skeleton-block h-10 w-10 rounded-full shrink-0"></div>
                    <div class="sigma-skeleton-block h-10 flex-1 rounded-full"></div>
                </div>
            </div>
            <div class="home-feed-card sigma-skeleton-card sigma-card min-h-[280px] rounded-[20px] p-6 space-y-4">
                <div class="flex items-center gap-3">
                    <div class="sigma-skeleton-block h-10 w-10 rounded-full shrink-0"></div>
                    <div class="space-y-1.5 flex-1">
                        <div class="sigma-skeleton-block h-4 w-40 rounded"></div>
                        <div class="sigma-skeleton-block h-3 w-24 rounded"></div>
                    </div>
                </div>
                <div class="space-y-2">
                    <div class="sigma-skeleton-block h-4 w-full rounded"></div>
                    <div class="sigma-skeleton-block h-4 w-5/6 rounded"></div>
                </div>
            </div>
            <div class="home-feed-card sigma-skeleton-card sigma-card min-h-[240px] rounded-[20px] p-6 space-y-4">
                <div class="flex items-center gap-3">
                    <div class="sigma-skeleton-block h-10 w-10 rounded-full shrink-0"></div>
                    <div class="space-y-1.5 flex-1">
                        <div class="sigma-skeleton-block h-4 w-36 rounded"></div>
                        <div class="sigma-skeleton-block h-3 w-28 rounded"></div>
                    </div>
                </div>
                <div class="space-y-2">
                    <div class="sigma-skeleton-block h-4 w-full rounded"></div>
                    <div class="sigma-skeleton-block h-4 w-3/4 rounded"></div>
                </div>
            </div>
        </div>
        <div class="lg:col-span-4 space-y-5">
            <div class="home-dashboard-card sigma-skeleton-card sigma-card min-h-[260px] rounded-[20px] p-5 space-y-4">
                <div class="sigma-skeleton-block h-5 w-32 rounded"></div>
                <div class="space-y-3">
                    <div class="space-y-1.5"><div class="sigma-skeleton-block h-4 w-44 rounded"></div><div class="sigma-skeleton-block h-3 w-24 rounded"></div></div>
                    <div class="space-y-1.5"><div class="sigma-skeleton-block h-4 w-36 rounded"></div><div class="sigma-skeleton-block h-3 w-20 rounded"></div></div>
                </div>
            </div>
            <div class="home-dashboard-card sigma-skeleton-card sigma-card min-h-[220px] rounded-[20px] p-5 space-y-4">
                <div class="sigma-skeleton-block h-5 w-28 rounded"></div>
                <div class="space-y-3">
                    <div class="space-y-1.5"><div class="sigma-skeleton-block h-4 w-40 rounded"></div><div class="sigma-skeleton-block h-3 w-20 rounded"></div></div>
                </div>
            </div>
        </div>
    </div>
</div>
`;
        }

        if (layout === 'curriculum') {
            return `
<div class="sigma-content-skeleton sigma-skeleton-curriculum p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1200px] mx-auto font-['Inter']" data-sigma-skeleton="curriculum">
    <div class="sigma-card sigma-skeleton-card min-h-[90px] rounded-[20px] p-6 space-y-4">
        <div class="flex items-center justify-between">
            <div class="sigma-skeleton-block h-7 w-64 rounded-lg"></div>
            <div class="flex items-center gap-2">
                <div class="sigma-feed-tab-btn sigma-skeleton-block h-8 w-16 rounded-full"></div>
                <div class="sigma-feed-tab-btn sigma-skeleton-block h-8 w-16 rounded-full"></div>
                <div class="sigma-feed-tab-btn sigma-skeleton-block h-8 w-16 rounded-full"></div>
                <div class="sigma-feed-tab-btn sigma-skeleton-block h-8 w-16 rounded-full"></div>
            </div>
        </div>
    </div>
    <div class="space-y-4">
        ${Array.from({ length: 4 }).map(() => `
        <div class="topic-card sigma-skeleton-card sigma-card min-h-[160px] rounded-[20px] p-5 sm:p-6 space-y-4">
            <div class="flex items-center justify-between">
                <div class="space-y-1.5 flex-1">
                    <div class="sigma-skeleton-block h-5 w-48 sm:w-64 rounded"></div>
                    <div class="sigma-skeleton-block h-3.5 w-32 sm:w-40 rounded"></div>
                </div>
                <div class="sigma-skeleton-block h-8 w-24 rounded-full"></div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div class="flex items-center gap-3 p-2.5 rounded-xl border border-slate-100">
                    <div class="sigma-skeleton-block h-8 w-8 rounded-lg shrink-0"></div>
                    <div class="space-y-1 flex-1">
                        <div class="sigma-skeleton-block h-3.5 w-36 rounded"></div>
                        <div class="sigma-skeleton-block h-2.5 w-20 rounded"></div>
                    </div>
                </div>
                <div class="flex items-center gap-3 p-2.5 rounded-xl border border-slate-100">
                    <div class="sigma-skeleton-block h-8 w-8 rounded-lg shrink-0"></div>
                    <div class="space-y-1 flex-1">
                        <div class="sigma-skeleton-block h-3.5 w-32 rounded"></div>
                        <div class="sigma-skeleton-block h-2.5 w-16 rounded"></div>
                    </div>
                </div>
            </div>
        </div>
        `).join('')}
    </div>
</div>
`;
        }

        if (layout === 'grades') {
            return `
<div class="sigma-content-skeleton sigma-skeleton-grades p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto font-['Inter']" data-sigma-skeleton="grades">
    <div class="sigma-card sigma-skeleton-card min-h-[72px] rounded-[20px] p-4 flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-3">
            <div class="sigma-skeleton-block h-10 w-36 rounded-xl"></div>
            <div class="sigma-skeleton-block h-10 w-44 rounded-xl"></div>
        </div>
        <div class="flex items-center gap-3">
            <div class="sigma-skeleton-block h-10 w-56 rounded-xl"></div>
            <div class="sigma-skeleton-block h-10 w-28 rounded-xl"></div>
        </div>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="gwa-card sigma-skeleton-card sigma-card min-h-[140px] rounded-[20px] p-5 space-y-2">
            <div class="sigma-skeleton-block h-4 w-24 rounded"></div>
            <div class="sigma-skeleton-block h-8 w-16 rounded-lg"></div>
            <div class="sigma-skeleton-block h-3 w-32 rounded"></div>
        </div>
        <div class="gwa-card sigma-skeleton-card sigma-card min-h-[140px] rounded-[20px] p-5 space-y-2">
            <div class="sigma-skeleton-block h-4 w-28 rounded"></div>
            <div class="sigma-skeleton-block h-8 w-20 rounded-lg"></div>
            <div class="sigma-skeleton-block h-3 w-36 rounded"></div>
        </div>
        <div class="gwa-card sigma-skeleton-card sigma-card min-h-[140px] rounded-[20px] p-5 space-y-2">
            <div class="sigma-skeleton-block h-4 w-36 rounded"></div>
            <div class="sigma-skeleton-block h-8 w-14 rounded-lg"></div>
            <div class="sigma-skeleton-block h-3 w-28 rounded"></div>
        </div>
    </div>
    <div class="sigma-table sigma-skeleton-card sigma-card min-h-[440px] rounded-[20px] p-5 space-y-4">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <div class="sigma-skeleton-block h-5 w-40 rounded"></div>
            <div class="sigma-skeleton-block h-8 w-28 rounded-lg"></div>
        </div>
        <div class="space-y-3">
            ${Array.from({ length: 8 }).map(() => `
            <div class="flex items-center justify-between p-3 rounded-xl border border-slate-100">
                <div class="flex items-center gap-3">
                    <div class="sigma-skeleton-block h-9 w-9 rounded-full shrink-0"></div>
                    <div class="space-y-1.5">
                        <div class="sigma-skeleton-block h-3.5 w-32 sm:w-44 rounded"></div>
                        <div class="sigma-skeleton-block h-2.5 w-20 sm:w-28 rounded"></div>
                    </div>
                </div>
                <div class="flex items-center gap-2 sm:gap-4">
                    <div class="sigma-skeleton-block h-7 w-14 sm:w-20 rounded-lg"></div>
                    <div class="sigma-skeleton-block h-7 w-12 sm:w-16 rounded-lg"></div>
                    <div class="sigma-skeleton-block h-7 w-16 sm:w-24 rounded-full"></div>
                </div>
            </div>
            `).join('')}
        </div>
    </div>
</div>
`;
        }

        if (layout === 'attendance') {
            return `
<div class="sigma-content-skeleton sigma-skeleton-attendance p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto font-['Inter']" data-sigma-skeleton="attendance">
    <div class="sigma-card sigma-skeleton-card min-h-[64px] rounded-[20px] p-4 flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-3">
            <div class="sigma-feed-tab-btn sigma-skeleton-block h-9 w-24 rounded-full"></div>
            <div class="sigma-skeleton-block h-9 w-36 rounded-lg"></div>
        </div>
        <div class="flex items-center gap-3">
            <div class="sigma-feed-tab-btn sigma-skeleton-block h-9 w-20 rounded-full"></div>
            <div class="sigma-feed-tab-btn sigma-skeleton-block h-9 w-20 rounded-full"></div>
            <div class="sigma-feed-tab-btn sigma-skeleton-block h-9 w-20 rounded-full"></div>
        </div>
    </div>
    <div class="sigma-table sigma-skeleton-card sigma-card min-h-[480px] rounded-[20px] p-5 space-y-4">
        <div class="grid grid-cols-7 gap-2 pb-3 border-b border-slate-100">
            ${Array.from({ length: 7 }).map(() => `<div class="sigma-skeleton-block h-6 w-full rounded"></div>`).join('')}
        </div>
        <div class="space-y-3">
            ${Array.from({ length: 8 }).map(() => `
            <div class="flex items-center justify-between p-3 rounded-xl border border-slate-100">
                <div class="flex items-center gap-3 w-48 sm:w-60 shrink-0">
                    <div class="sigma-skeleton-block h-8 w-8 rounded-full shrink-0"></div>
                    <div class="space-y-1">
                        <div class="sigma-skeleton-block h-3.5 w-28 sm:w-36 rounded"></div>
                        <div class="sigma-skeleton-block h-2.5 w-16 rounded"></div>
                    </div>
                </div>
                <div class="flex items-center justify-around flex-1 gap-1 sm:gap-2">
                    <div class="sigma-skeleton-block h-7 w-7 sm:w-8 rounded-lg shrink-0"></div>
                    <div class="sigma-skeleton-block h-7 w-7 sm:w-8 rounded-lg shrink-0"></div>
                    <div class="sigma-skeleton-block h-7 w-7 sm:w-8 rounded-lg shrink-0"></div>
                    <div class="sigma-skeleton-block h-7 w-7 sm:w-8 rounded-lg shrink-0"></div>
                    <div class="sigma-skeleton-block h-7 w-7 sm:w-8 rounded-lg shrink-0"></div>
                </div>
            </div>
            `).join('')}
        </div>
    </div>
</div>
`;
        }

        if (layout === 'materials') {
            return `
<div class="sigma-content-skeleton sigma-skeleton-materials p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto font-['Inter']" data-sigma-skeleton="materials">
    <div class="sigma-card sigma-skeleton-card min-h-[64px] rounded-[20px] p-4 flex flex-wrap items-center justify-between gap-4">
        <div class="sigma-skeleton-block h-10 w-64 rounded-xl"></div>
        <div class="flex items-center gap-3">
            <div class="sigma-feed-tab-btn sigma-skeleton-block h-9 w-24 rounded-full"></div>
            <div class="sigma-feed-tab-btn sigma-skeleton-block h-9 w-24 rounded-full"></div>
            <div class="sigma-feed-tab-btn sigma-skeleton-block h-9 w-24 rounded-full"></div>
        </div>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        ${Array.from({ length: 6 }).map(() => `
        <div class="sigma-card sigma-skeleton-card min-h-[220px] rounded-[20px] p-5 space-y-4">
            <div class="sigma-skeleton-block h-36 w-full rounded-xl"></div>
            <div class="space-y-2">
                <div class="sigma-skeleton-block h-4 w-4/5 rounded"></div>
                <div class="sigma-skeleton-block h-3 w-1/2 rounded"></div>
            </div>
            <div class="flex items-center justify-between pt-2 border-t border-slate-100">
                <div class="sigma-skeleton-block h-6 w-20 rounded-full"></div>
                <div class="sigma-skeleton-block h-8 w-24 rounded-lg"></div>
            </div>
        </div>
        `).join('')}
    </div>
</div>
`;
        }

        if (layout === 'assessments') {
            return `
<div class="sigma-content-skeleton sigma-skeleton-assessments p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto font-['Inter']" data-sigma-skeleton="assessments">
    <div class="sigma-card sigma-skeleton-card min-h-[64px] rounded-[20px] p-4 flex flex-wrap items-center justify-between gap-4">
        <div class="sigma-skeleton-block h-10 w-64 rounded-xl"></div>
        <div class="flex items-center gap-3">
            <div class="sigma-feed-tab-btn sigma-skeleton-block h-9 w-24 rounded-full"></div>
            <div class="sigma-feed-tab-btn sigma-skeleton-block h-9 w-28 rounded-full"></div>
            <div class="sigma-feed-tab-btn sigma-skeleton-block h-9 w-24 rounded-full"></div>
        </div>
    </div>
    <div class="space-y-4">
        ${Array.from({ length: 5 }).map(() => `
        <div class="sigma-card sigma-skeleton-card min-h-[100px] rounded-[20px] p-5 flex flex-wrap items-center justify-between gap-4">
            <div class="flex items-center gap-4 flex-1 min-w-[240px]">
                <div class="sigma-skeleton-block h-12 w-12 rounded-xl shrink-0"></div>
                <div class="space-y-2 flex-1">
                    <div class="sigma-skeleton-block h-4 w-48 sm:w-64 rounded"></div>
                    <div class="flex items-center gap-3">
                        <div class="sigma-skeleton-block h-3 w-28 rounded"></div>
                        <div class="sigma-skeleton-block h-3 w-20 rounded"></div>
                    </div>
                </div>
            </div>
            <div class="flex items-center gap-3">
                <div class="sigma-skeleton-block h-7 w-24 rounded-full"></div>
                <div class="sigma-skeleton-block h-9 w-28 rounded-xl"></div>
            </div>
        </div>
        `).join('')}
    </div>
</div>
`;
        }

        return `
<div class="sigma-content-skeleton sigma-skeleton-generic p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto font-['Inter']" data-sigma-skeleton="generic">
    <div class="sigma-card sigma-skeleton-card min-h-[100px] rounded-[20px] p-6 space-y-3">
        <div class="sigma-skeleton-block h-7 w-56 rounded-lg"></div>
        <div class="sigma-skeleton-block h-4 w-80 rounded"></div>
    </div>
    <div class="sigma-card sigma-skeleton-card min-h-[460px] rounded-[20px] p-6 space-y-4">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100">
            <div class="sigma-skeleton-block h-5 w-40 rounded"></div>
            <div class="sigma-skeleton-block h-9 w-32 rounded-xl"></div>
        </div>
        <div class="space-y-3">
            <div class="sigma-skeleton-block h-12 w-full rounded-xl"></div>
            <div class="sigma-skeleton-block h-12 w-full rounded-xl"></div>
            <div class="sigma-skeleton-block h-12 w-full rounded-xl"></div>
            <div class="sigma-skeleton-block h-12 w-full rounded-xl"></div>
        </div>
    </div>
</div>
`;
    }

    function showContentSkeleton(targetOrId, layoutType) {
        if (!targetOrId) return () => {};
        const element = (typeof targetOrId === 'string')
            ? (typeof document !== 'undefined' && typeof document.getElementById === 'function' ? document.getElementById(targetOrId) : null)
            : targetOrId;
        if (!element) return () => {};

        const layout = layoutType || resolveLayoutFromSectionId(element.id) || 'generic';
        if (element.querySelector('.sigma-content-skeleton')) {
            element.setAttribute('data-sigma-skeleton-active', 'true');
            element.classList.remove('hidden');
            element.style.removeProperty('display');
            return function hide() {
                hideContentSkeleton(element);
            };
        }

        const targetContainer = element.querySelector('#grades-layout, #assessments-layout, #curriculum-page-shell, #classroom-detail-view') || element;
        targetContainer.innerHTML = getContentSkeletonHtml(layout);
        element.setAttribute('data-sigma-skeleton-active', 'true');
        if (targetContainer !== element) {
            targetContainer.setAttribute('data-sigma-skeleton-active', 'true');
        }
        element.classList.remove('hidden');
        element.style.removeProperty('display');

        return function hide() {
            hideContentSkeleton(element);
        };
    }

    function hideContentSkeleton(targetOrId) {
        if (!targetOrId) return;
        const element = (typeof targetOrId === 'string')
            ? (typeof document !== 'undefined' && typeof document.getElementById === 'function' ? document.getElementById(targetOrId) : null)
            : targetOrId;
        if (!element) return;

        element.removeAttribute('data-sigma-skeleton-active');
        if (typeof element.querySelectorAll === 'function') {
            const activeChildren = element.querySelectorAll('[data-sigma-skeleton-active]');
            activeChildren.forEach(child => child.removeAttribute('data-sigma-skeleton-active'));
            const skels = element.querySelectorAll('.sigma-content-skeleton');
            skels.forEach(skel => skel.remove());
        } else if (typeof element.querySelector === 'function') {
            const skel = element.querySelector('.sigma-content-skeleton');
            if (skel && typeof skel.remove === 'function') skel.remove();
        }
    }

    function mountEarlyHashSkeleton() {
        try {
            if (typeof window === 'undefined' || !window.location || typeof document === 'undefined' || typeof document.getElementById !== 'function') {
                return;
            }
            const hash = (window.location.hash || '').replace(/^#/, '').trim();
            if (!hash || hash === 'dashboard' || hash === 'home' || hash === 'nav-dashboard') return;

            const routeInfo = resolveRouteFromHash(hash);
            if (!routeInfo || !routeInfo.sectionId) return;

            const targetIds = routeInfo.sectionId.split(',').map(s => s.trim().replace(/^#/, ''));
            for (const tid of targetIds) {
                const sec = document.getElementById(tid);
                if (sec) {
                    sec.classList.remove('hidden');
                    sec.style.removeProperty('display');
                    if (sec.querySelector('.sigma-content-skeleton')) {
                        sec.setAttribute('data-sigma-skeleton-active', 'true');
                    } else if (!sec.children.length || !sec.innerHTML.trim() || sec.getAttribute('data-sigma-skeleton-active') === 'true') {
                        showContentSkeleton(sec, routeInfo.layout);
                    }
                    break;
                }
            }
        } catch (_) {}
    }

    function initial() {
        if (initialFrame) return;
        initialFrame = true;
        mountEarlyHashSkeleton();
        requestAnimationFrame(revealInitial);
    }

    try {
        mountEarlyHashSkeleton();
        // This script loads before the routed sections have been parsed.
        if (document.readyState === 'loading' && typeof MutationObserver === 'function') {
            earlyRouteObserver = new MutationObserver(() => {
                const route = resolveRouteFromHash((window.location.hash || '').replace(/^#/, ''));
                if (!route || !route.sectionId) return;
                const mounted = route.sectionId.split(',').some(id => {
                    const section = document.getElementById(id.trim().replace(/^#/, ''));
                    return section && section.children.length > 0;
                });
                if (!mounted) return;
                mountEarlyHashSkeleton();
                earlyRouteObserver.disconnect();
            });
            earlyRouteObserver.observe(document.documentElement, { childList: true, subtree: true });
        }
    } catch (_) {}

    if (typeof setTimeout === 'function') setTimeout(revealInitial, 200);
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initial, { once: true });
    } else {
        initial();
    }

    window.addEventListener('pageshow', event => {
        if (event.persisted) {
            revealInitial();
            finish(active);
        }
    });
})();

