/**
 * SIGMA ELMS - Unified Sidebar Component Controller
 * Interface Computer College - Caloocan Senior High School ELMS
 * Unified sidebar collapse, submenu accordions, and active state management.
 * Borrowed by Admin, Teacher, and Student portals.
 */

window.syncSidebarDropdownsOnExpand = function () {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    const isCollapsed = document.body.classList.contains('sidebar-collapsed') && window.innerWidth >= 1024;
    const isMobileHidden = window.innerWidth < 1024 && !sidebar.classList.contains('sidebar-visible');
    if (isCollapsed || isMobileHidden) return;

    const groups = sidebar.querySelectorAll('.nav-group');
    groups.forEach(group => {
        const submenu = group.querySelector('.sidebar-submenu');
        const button = group.querySelector('[data-toggle="submenu"], .nav-link--group');
        const chevron = group.querySelector('.sidebar-group-chevron');
        if (!submenu || !button) return;

        // Check if this group contains an active child item
        const hasActiveChild = Boolean(
            submenu.querySelector('.nav-sublink.active, .teacher-section-room-link.active, .student-section-room-link.active, [data-selected="true"]')
        );

        if (hasActiveChild) {
            submenu.classList.remove('hidden');
            button.setAttribute('aria-expanded', 'true');
            button.classList.add('open');
            if (chevron) {
                chevron.classList.add('rotate-90');
                chevron.style.setProperty('transform', 'rotate(90deg)', 'important');
            }
        } else {
            submenu.classList.add('hidden');
            button.setAttribute('aria-expanded', 'false');
            button.classList.remove('open');
            if (chevron) {
                chevron.classList.remove('rotate-90');
                chevron.style.setProperty('transform', 'rotate(0deg)', 'important');
            }
        }
    });
};

window.collapseSidebar = function () {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const subSidebar = document.getElementById('sub-sidebar');

    if (subSidebar) {
        subSidebar.classList.add('hidden');
        subSidebar.classList.remove('sub-sidebar-visible');
        subSidebar.classList.remove('subjects-hover-subsidebar');
    }
    document.body.classList.remove('sub-sidebar-open');

    if (window.innerWidth < 1024) {
        if (sidebar) sidebar.classList.remove('sidebar-visible');
        if (overlay) overlay.classList.add('hidden');
    } else {
        document.body.classList.add('sidebar-collapsed');
        if (sidebar) sidebar.classList.add('sidebar-collapsed');
        if (overlay) overlay.classList.add('hidden');
    }

    window.dispatchEvent(new CustomEvent('sidebar:toggle', {
        detail: { collapsed: true }
    }));
};

window.toggleSidebar = function () {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const subSidebar = document.getElementById('sub-sidebar');
    
    // Always hide any floating sub-sidebar overlay when toggling sidebar
    if (subSidebar) {
        subSidebar.classList.add('hidden');
        subSidebar.classList.remove('sub-sidebar-visible');
        subSidebar.classList.remove('subjects-hover-subsidebar');
    }
    document.body.classList.remove('sub-sidebar-open');

    if (window.innerWidth < 1024) {
        if (sidebar) {
            const isVisible = sidebar.classList.toggle('sidebar-visible');
            if (overlay) overlay.classList.toggle('hidden', !isVisible);
            if (isVisible) {
                window.syncSidebarDrawerProfile?.();
                if (typeof window.pushModalHistoryState === 'function') {
                    window.pushModalHistoryState('mobile-sidebar');
                }
            }
        }
    } else {
        document.body.classList.toggle('sidebar-collapsed');
        if (sidebar) sidebar.classList.toggle('sidebar-collapsed');
        if (overlay) overlay.classList.add('hidden');
    }

    const isCollapsed = document.body.classList.contains('sidebar-collapsed') && window.innerWidth >= 1024;
    if (!isCollapsed) {
        window.syncSidebarDropdownsOnExpand?.();
    }
    
    // Dispatch event for components that need to resize (e.g. charts)
    window.dispatchEvent(new CustomEvent('sidebar:toggle', {
        detail: { collapsed: isCollapsed }
    }));
};

window.positionSubSidebarBeside = function (parentEl) {
    const subSidebar = document.getElementById('sub-sidebar');
    if (!subSidebar || !parentEl) return;

    // Dismiss any in-page dropdown menus so they never overlap or cut into the sub-sidebar
    const gradesDropdownMenu = document.getElementById('admin-grades-subject-picker-menu');
    if (gradesDropdownMenu && !gradesDropdownMenu.classList.contains('hidden')) {
        gradesDropdownMenu.classList.add('hidden');
    }
    const legacyPickerPanel = document.getElementById('gradebook-subject-picker-panel');
    if (legacyPickerPanel && !legacyPickerPanel.classList.contains('hidden')) {
        legacyPickerPanel.classList.add('hidden');
    }

    const rect = parentEl.getBoundingClientRect();
    const sidebarTopOffset = 82;

    // Anchor top flush with parent button so the white active rail tab connects seamlessly to the white panel
    const targetTop = Math.max(sidebarTopOffset, Math.round(rect.top));
    subSidebar.style.setProperty('top', `${targetTop}px`, 'important');
    subSidebar.style.setProperty('max-height', `calc(100vh - ${targetTop}px - 16px)`, 'important');
};

window.updateLayout = function () {
    restoreShellAfterViewportChange();
};

var lastShellWidth = window.innerWidth;
var lastShellHeight = window.innerHeight;

function restoreShellAfterViewportChange() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const wrap = document.getElementById('layout-wrapper');

    if (window.innerWidth >= 1024) {
        if (sidebar) {
            sidebar.classList.remove('sidebar-visible');
            sidebar.style.removeProperty('transform');
        }
        if (overlay) overlay.classList.add('hidden');
    }

    document.documentElement.scrollLeft = 0;
    document.body.scrollLeft = 0;
    if (wrap) wrap.scrollLeft = 0;

    // Detect if viewport expanded significantly (e.g. closing DevTools/F12)
    const heightExpanded = window.innerHeight - lastShellHeight > 80;
    const widthExpanded = window.innerWidth - lastShellWidth > 80;
    const modeSwitched = (lastShellWidth < 1024 && window.innerWidth >= 1024);

    if (heightExpanded || widthExpanded || modeSwitched) {
        if (window.innerWidth >= 1024) {
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
            if (wrap) wrap.scrollTop = 0;

            const leftRail = document.getElementById('sigma-panels-container') || document.getElementById('dashboard-metrics-container');
            if (leftRail) leftRail.scrollTop = 0;
            const rightRail = document.querySelector('.home-dashboard-panels');
            if (rightRail) rightRail.scrollTop = 0;

            if (typeof renderTeacherAnnouncements === 'function') renderTeacherAnnouncements();
            if (typeof renderTeacherHomeDashboardPanels === 'function') renderTeacherHomeDashboardPanels();
            if (typeof renderStudentHomeAnnouncements === 'function') renderStudentHomeAnnouncements();
            if (typeof renderStudentHomeDashboardPanels === 'function') renderStudentHomeDashboardPanels();
            if (typeof PocketCards !== 'undefined' && typeof PocketCards.render === 'function') {
                PocketCards.render('sigma-panels-container');
            }
        }
    }

    lastShellWidth = window.innerWidth;
    lastShellHeight = window.innerHeight;

    // Nudge Chrome to recompute media queries / flex after DevTools dock/undock
    document.documentElement.style.setProperty('--viewport-width-sync', window.innerWidth + 'px');
}

(function bindViewportLayoutSync() {
    let ticking = false;
    const onViewportChange = () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            ticking = false;
            restoreShellAfterViewportChange();
        });
    };

    window.addEventListener('resize', onViewportChange);
    window.addEventListener('orientationchange', onViewportChange);
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', onViewportChange);
    }
})();

function initSidebar() {
    // 1. DOM Elements
    const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    // 2. Hamburger Button Sidebar Toggle
    if (sidebarToggleBtn) {
        // Remove any cloned/duplicate listeners by replacing element or clean handler
        sidebarToggleBtn.onclick = function (e) {
            e.preventDefault();
            if (typeof window.toggleSidebar === 'function') {
                window.toggleSidebar();
            }
        };
    }

    // 3. Sidebar Overlay Click
    if (sidebarOverlay) {
        sidebarOverlay.onclick = function () {
            if (window.innerWidth < 1024 && sidebar && sidebar.classList.contains('sidebar-visible')) {
                sidebar.classList.remove('sidebar-visible');
                sidebarOverlay.classList.add('hidden');
            }
        };
    }

    // 4. Unified Sub-Sidebar Flyout & Submenu Accordion Controller
    let subSidebarHoverTimer = null;

    window.hideSubSidebar = function () {
        const subSidebar = document.getElementById('sub-sidebar');
        if (subSidebar) {
            subSidebar.classList.add('hidden');
            subSidebar.classList.remove('sub-sidebar-visible');
            subSidebar.classList.remove('subjects-hover-subsidebar');
        }
        document.body.classList.remove('sub-sidebar-open');
        document.querySelectorAll('[data-toggle="submenu"], .nav-link--group, .nav-link').forEach(btn => btn.classList.remove('open-flyout'));
    };

    window.renderDefaultSubSidebar = function (groupButton) {
        const subSidebar = document.getElementById('sub-sidebar');
        const subHeader = document.getElementById('sub-sidebar-header');
        const subTitle = document.getElementById('sub-sidebar-title');
        const subContent = document.getElementById('sub-sidebar-content');
        if (!subSidebar || !groupButton) return;

        const group = groupButton.closest('.nav-group');
        if (!group) return;

        const submenu = group.querySelector('.sidebar-submenu');
        if (!submenu) return;

        const fullLabel = groupButton.querySelector('.full-label')?.textContent?.trim();
        const railLabel = groupButton.querySelector('.rail-label')?.textContent?.trim();
        const titleText = fullLabel || railLabel || 'Menu';

        if (subTitle) subTitle.textContent = titleText;
        if (subHeader) subHeader.classList.remove('hidden');

        if (subContent) {
            subContent.innerHTML = '';
            const childLinks = submenu.querySelectorAll('.nav-sublink, a:not(.nav-link)');
            childLinks.forEach(sourceLink => {
                if (sourceLink.classList.contains('hidden') || sourceLink.style.display === 'none' || sourceLink.dataset.permHidden === 'true') {
                    return;
                }

                const item = document.createElement('a');
                item.href = sourceLink.getAttribute('href') || '#';
                item.className = `sub-sidebar-link ${sourceLink.classList.contains('active') ? 'active' : ''}`;

                const iconEl = sourceLink.querySelector('i');
                const iconClass = iconEl ? iconEl.className : 'fa-solid fa-circle text-[8px]';
                const labelSpan = sourceLink.querySelector('span');
                const labelText = labelSpan ? labelSpan.textContent.trim() : sourceLink.textContent.trim();
                const isActive = sourceLink.classList.contains('active');

                item.innerHTML = `<i class="${iconClass}"${isActive ? ' style="color:#ffffff !important"' : ''}></i><span>${labelText}</span>`;

                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.hideSubSidebar?.();
                    sourceLink.click();
                });

                subContent.appendChild(item);
            });
        }

        if (typeof window.positionSubSidebarBeside === 'function') {
            window.positionSubSidebarBeside(groupButton);
        }

        subSidebar.classList.remove('hidden');
        subSidebar.classList.add('sub-sidebar-visible');
        document.body.classList.add('sub-sidebar-open');
        groupButton.classList.add('open-flyout');
        if (typeof window.pushModalHistoryState === 'function') {
            window.pushModalHistoryState('sub-sidebar');
        }
    };

    const submenuButtons = document.querySelectorAll('[data-toggle="submenu"], .nav-link--group');
    submenuButtons.forEach(button => {
        if (button.dataset.accordionBound === 'true') return;
        button.dataset.accordionBound = 'true';

        button.addEventListener('click', (e) => {
            const isCollapsed = document.body.classList.contains('sidebar-collapsed') && window.innerWidth >= 1024;
            
            // Collapsed Mode: Toggle floating sub-sidebar card
            if (isCollapsed) {
                // If this element has its own bespoke controller (e.g. Teacher classrooms/grades/subjects), delegate
                const isTeacherPortal = Boolean(document.getElementById('teacher-main') || window.location.pathname.includes('teacher'));
                if (button.dataset.customSubsidebar === 'true' || (isTeacherPortal && (button.id === 'nav-classes' || button.id === 'nav-classrooms' || button.id === 'nav-grades' || button.id === 'nav-subjects'))) {
                    return;
                }

                e.preventDefault();
                e.stopPropagation();

                const subSidebar = document.getElementById('sub-sidebar');
                const isCurrentlyVisible = subSidebar && !subSidebar.classList.contains('hidden') && subSidebar.classList.contains('sub-sidebar-visible');
                const isSameButton = button.classList.contains('open-flyout');

                if (isCurrentlyVisible && isSameButton) {
                    window.hideSubSidebar();
                } else {
                    document.querySelectorAll('[data-toggle="submenu"], .nav-link--group').forEach(b => b.classList.remove('open-flyout'));
                    window.renderDefaultSubSidebar(button);
                }
                return;
            }

            // Expanded Mode: If element has its own bespoke controller (e.g. Teacher classrooms/grades/subjects), delegate
            const isTeacherPortalExpanded = Boolean(document.getElementById('teacher-main') || window.location.pathname.includes('teacher'));
            if (isTeacherPortalExpanded && (button.id === 'nav-classes' || button.id === 'nav-classrooms' || button.id === 'nav-grades' || button.id === 'nav-subjects')) {
                return;
            }

            // Expanded Mode: Inline Accordion Toggle
            e.preventDefault();
            e.stopPropagation();
            const group = button.closest('.nav-group');
            if (!group) return;

            const submenu = group.querySelector('.sidebar-submenu');
            const chevron = group.querySelector('.sidebar-group-chevron');

            if (submenu) {
                const willOpen = submenu.classList.contains('hidden');
                submenu.classList.toggle('hidden', !willOpen);
                button.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
                button.classList.toggle('open', willOpen);
                
                if (chevron) {
                    chevron.classList.toggle('rotate-90', willOpen);
                    chevron.style.setProperty('transform', willOpen ? 'rotate(90deg)' : 'rotate(0deg)', 'important');
                }

                const groupId = group.dataset.sidebarGroup || button.id.replace('nav-', '');
                window.dispatchEvent(new CustomEvent('sidebar:group-toggle', {
                    detail: {
                        button,
                        group,
                        submenu,
                        groupId,
                        isOpen: willOpen
                    }
                }));
            }
        });

        // Hover mode behavior in collapsed state: auto-show sub-sidebar card beside the hovered button without selecting it
        button.addEventListener('mouseenter', () => {
            const isCollapsed = document.body.classList.contains('sidebar-collapsed') && window.innerWidth >= 1024;
            if (!isCollapsed) return;
            if (subSidebarHoverTimer) clearTimeout(subSidebarHoverTimer);

            const isTeacherPortalHover = Boolean(document.getElementById('teacher-main') || window.location.pathname.includes('teacher'));
            if (button.dataset.customSubsidebar === 'true' || (isTeacherPortalHover && (button.id === 'nav-classes' || button.id === 'nav-classrooms' || button.id === 'nav-grades' || button.id === 'nav-subjects'))) {
                return;
            }

            window.renderDefaultSubSidebar(button);
        });
    });

    // Hover-out dismissals
    if (sidebar) {
        sidebar.addEventListener('mouseleave', () => {
            const isCollapsed = document.body.classList.contains('sidebar-collapsed') && window.innerWidth >= 1024;
            if (!isCollapsed) return;
            subSidebarHoverTimer = setTimeout(() => {
                window.hideSubSidebar();
            }, 180);
        });
        sidebar.addEventListener('mouseenter', () => {
            if (subSidebarHoverTimer) clearTimeout(subSidebarHoverTimer);
        });
    }

    const subSidebarEl = document.getElementById('sub-sidebar');
    if (subSidebarEl) {
        subSidebarEl.addEventListener('mouseenter', () => {
            if (subSidebarHoverTimer) clearTimeout(subSidebarHoverTimer);
        });
        subSidebarEl.addEventListener('mouseleave', (e) => {
            const isCollapsed = document.body.classList.contains('sidebar-collapsed') && window.innerWidth >= 1024;
            if (!isCollapsed) return;
            if (sidebar && sidebar.contains(e.relatedTarget)) return;
            subSidebarHoverTimer = setTimeout(() => {
                window.hideSubSidebar();
            }, 180);
        });

        subSidebarEl.addEventListener('click', (e) => {
            const clickable = e.target.closest('a, button, .sub-sidebar-link, [data-grades-tab], [data-classroom-id], [data-section-name], [data-program-key]');
            if (clickable) {
                window.hideSubSidebar();
                window.collapseSidebar?.();
            }
        });
    }

    // Dismiss sub-sidebar on outside clicks
    document.addEventListener('click', (e) => {
        const isCollapsed = document.body.classList.contains('sidebar-collapsed') && window.innerWidth >= 1024;
        const subSidebar = document.getElementById('sub-sidebar');
        if (isCollapsed && subSidebar && !subSidebar.classList.contains('hidden')) {
            if (!subSidebar.contains(e.target) && !sidebar?.contains(e.target)) {
                window.hideSubSidebar();
            }
        }
    });

    // 5. Nav Link Click Active Highlighting & Auto-Collapse
    if (sidebar) {
        sidebar.addEventListener('click', (e) => {
            const link = e.target.closest('.nav-link, .nav-sublink, .teacher-section-room-link, .student-section-room-link, [data-grades-tab], [data-classroom-id], [data-section-name]');
            if (!link) return;

            // If it's a submenu group toggle button (accordion header), don't collapse sidebar
            if (link.dataset.toggle === 'submenu' || link.classList.contains('nav-link--group')) {
                return;
            }

            // Remove active from other top-level links
            document.querySelectorAll('#sidebar .nav-link, #sidebar .nav-sublink, #sidebar .teacher-section-room-link, #sidebar .student-section-room-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // If clicking a main top-level link (not a group toggle or child), collapse all submenus and clear child active classes
            if (link.classList.contains('nav-link') && !link.classList.contains('nav-link--group') && link.dataset.toggle !== 'submenu') {
                document.querySelectorAll('#sidebar .teacher-section-room-link, #sidebar .student-section-room-link, #sidebar .nav-sublink, .student-section-room-link, .teacher-section-room-link').forEach(l => l.classList.remove('active'));
                document.querySelectorAll('#sidebar .sidebar-submenu').forEach(sm => sm.classList.add('hidden'));
                document.querySelectorAll('#sidebar [data-toggle="submenu"], #sidebar .nav-link--group').forEach(btn => {
                    btn.setAttribute('aria-expanded', 'false');
                    btn.classList.remove('open');
                });
                document.querySelectorAll('#sidebar .sidebar-group-chevron').forEach(ch => {
                    ch.classList.remove('rotate-90');
                    ch.style.transform = 'rotate(0deg)';
                });
            }

            // Auto-collapse sidebar (on desktop: go back to mini rail; on mobile: close drawer)
            window.collapseSidebar?.();
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSidebar);
} else {
    initSidebar();
}
