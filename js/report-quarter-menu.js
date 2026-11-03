(function () {
    'use strict';
    let current = null, serial = 0;
    function close(restoreFocus = false) {
        if (!current) return;
        const { dropdown, menu, summary, layered } = current;
        current = null;
        if (layered) { try { menu.hidePopover(); } catch (_) {} }
        else dropdown.append(menu);
        menu.classList.remove('sigma-report-quarter-menu');
        delete dropdown._sigmaQuarterFloatingMenu;
        dropdown.open = false;
        summary.setAttribute('aria-expanded', 'false');
        if (restoreFocus && summary.isConnected) summary.focus({ preventScroll: true });
    }
    function open(dropdown) {
        close();
        const menu = dropdown.querySelector('.sigma-quarter-dropdown-menu'), summary = dropdown.querySelector('summary');
        if (!menu || !summary) return;
        const layered = typeof menu.showPopover === 'function';
        current = { dropdown, menu, summary, layered };
        dropdown._sigmaQuarterFloatingMenu = menu;
        menu.classList.add('sigma-report-quarter-menu');
        if (layered) { menu.setAttribute('popover', 'manual'); menu.showPopover(); }
        else document.body.append(menu);
        const rect = summary.getBoundingClientRect(), viewport = window.visualViewport;
        const leftEdge = (viewport?.offsetLeft || 0) + 8, topEdge = (viewport?.offsetTop || 0) + 8;
        const rightEdge = (viewport?.offsetLeft || 0) + (viewport?.width || innerWidth) - 8;
        const bottomEdge = (viewport?.offsetTop || 0) + (viewport?.height || innerHeight) - 8;
        const width = Math.min(Math.max(rect.width, 150), rightEdge - leftEdge);
        menu.style.setProperty('width', width + 'px', 'important');
        menu.style.setProperty('max-height', Math.max(40, bottomEdge - topEdge) + 'px', 'important');
        const height = menu.getBoundingClientRect().height;
        const below = bottomEdge - rect.bottom - 4, above = rect.top - topEdge - 4;
        const upward = height > below && above > below;
        menu.style.setProperty('max-height', Math.max(40, upward ? above : below) + 'px', 'important');
        menu.style.setProperty('left', Math.max(leftEdge, Math.min(rect.left, rightEdge - width)) + 'px', 'important');
        menu.style.setProperty('top', (upward ? Math.max(topEdge, rect.top - Math.min(height, above) - 4) : rect.bottom + 4) + 'px', 'important');
        summary.setAttribute('aria-expanded', 'true');
    }
    window.SigmaReportQuarterMenu = {
        connect(dropdown) {
            if (!dropdown.closest('#student-classroom-grades-modal-overlay')) return;
            const menu = dropdown.querySelector('.sigma-quarter-dropdown-menu'), summary = dropdown.querySelector('summary');
            menu.id = 'sigma-report-quarter-menu-' + (++serial);
            summary.setAttribute('aria-controls', menu.id);
            summary.setAttribute('aria-expanded', 'false');
            dropdown.addEventListener('toggle', () => {
                if (dropdown.open && current?.dropdown !== dropdown) open(dropdown);
                else if (!dropdown.open && current?.dropdown === dropdown) close();
            });
        }
    };
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && current) close(true); });
    window.addEventListener('resize', () => close());
    window.visualViewport?.addEventListener('resize', () => close());
    new MutationObserver(() => { if (current && !current.dropdown.isConnected) close(); }).observe(document.documentElement, { childList: true, subtree: true });
})();
