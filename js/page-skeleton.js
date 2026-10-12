(function () {
    'use strict';
    let overlay;
    let active = 0;
    let target;
    let previousBusy;
    let initialFrame = false;
    let initialPending = 0;
    const minDisplayMs = 500;
    const startTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    const panelSelector = '.sigma-black-fade-panel,.topic-progress-card,.topic-card,.sigma-card,.home-dashboard-card,.home-overview-card,.announcement-card,.sigma-announcements-empty-state,.assessment-material-main-card,.topic-overview-body-card,.topic-video-player-panel,.welcome-panel,.classroom-room-hero-banner,.gwa-card,.student-grades-insights-card,.student-grades-summary-panel,.subject-performance-card,.sigma-interactive-metric-card,.active-question-card,.deck-thumbnail-card,.quiz-empty-question-state,.quiz-deck-empty-state,.quiz-skeleton-card,.quiz-skeleton-deck-card,.sigma-empty-state';

    document.documentElement.classList.add('sigma-initial-loading');

    let initialDismissed = false;
    let initialTimer = null;

    function revealInitial() {
        if (initialDismissed) return;
        if (initialPending > 0) return;
        // In browser environment with window.setTimeout, ensure smooth single-shot minimum duration for visible shimmer wave
        if (typeof setTimeout === 'function' && typeof window !== 'undefined' && typeof window.setTimeout === 'function') {
            const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
            const elapsed = now - startTime;
            const remaining = Math.max(0, minDisplayMs - elapsed);
            if (remaining > 0) {
                if (initialTimer) return; // Prevent scheduling duplicate timers
                initialTimer = setTimeout(() => {
                    initialTimer = null;
                    if (initialPending <= 0 && !initialDismissed) {
                        initialDismissed = true;
                        document.documentElement.classList.remove('sigma-initial-loading');
                    }
                }, remaining);
                return;
            }
        }
        initialDismissed = true;
        if (initialTimer) {
            clearTimeout(initialTimer);
            initialTimer = null;
        }
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
        async wrapRendering(scope, operation, minMs = 380) {
            if (!scope || typeof operation !== 'function') return operation ? operation() : undefined;
            const start = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
            const clear = this.showRenderingLoading(scope);
            try {
                return await operation();
            } finally {
                const elapsed = ((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - start;
                const remaining = Math.max(0, minMs - elapsed);
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
        }
    };

    function initial() {
        if (initialFrame) return;
        initialFrame = true;
        requestAnimationFrame(revealInitial);
    }

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
