(function () {
    'use strict';
    let overlay;
    let active = 0;
    let target;
    let previousBusy;
    const panelSelector = '.sigma-black-fade-panel,.topic-progress-card,.topic-card,.sigma-card,.home-dashboard-card,.home-overview-card,.announcement-card,.sigma-announcements-empty-state,.assessment-material-main-card,.topic-overview-body-card,.topic-video-player-panel,.welcome-panel,.classroom-room-hero-banner,.gwa-card,.student-grades-insights-card,.student-grades-summary-panel,.subject-performance-card';
    document.documentElement.classList.add('sigma-initial-loading');
    function revealInitial() {
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
        const candidates = scope.querySelectorAll('h1,h2,h3,h4,h5,p,img,button,input,select,table,' + panelSelector);
        let count = 0;
        candidates.forEach(node => {
            if (count >= 160) return;
            if (node.closest('[role="dialog"], [aria-modal="true"], [id*="modal"], .modal, .header-panel')) return;
            const panel = node.closest(panelSelector);
            if (panel && panel !== node) return;
            const box = node.getBoundingClientRect();
            const computed = window.getComputedStyle(node);
            if (!box.width || !box.height || box.bottom <= top || box.top >= window.innerHeight
                || computed.visibility === 'hidden' || computed.display === 'none') return;
            const block = document.createElement('div');
            block.className = 'sigma-skeleton-block sigma-skeleton-matched';
            block.setAttribute('aria-hidden', 'true');
            const isText = /^(H[1-6]|P)$/.test(node.tagName);
            block.style.left = `${box.left - left}px`;
            block.style.top = `${box.top - top}px`;
            block.style.width = `${box.width}px`;
            block.style.height = `${box.height}px`;
            const gradesPanel = node.matches('.gwa-card,.student-grades-insights-card,.student-grades-summary-panel,.subject-performance-card');
            block.style.borderRadius = isText ? '4px' : (gradesPanel
                ? `${node.matches('.student-grades-summary-panel') || window.innerWidth <= 768 ? 16 : 24}px`
                : computed.borderRadius);
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
    window.SigmaPageLoading = {
        begin,
        async run(scope, operation, layout) {
            const done = begin(scope, layout);
            try { return await operation(); } finally { done(); }
        }
    };
    function initial() {
        function ready() { revealInitial(); }
        if (document.readyState === 'complete') ready();
        else window.addEventListener('load', ready, { once: true });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initial, { once: true });
    else initial();
    window.addEventListener('pageshow', event => { if (event.persisted) { revealInitial(); finish(active); } });
})();
