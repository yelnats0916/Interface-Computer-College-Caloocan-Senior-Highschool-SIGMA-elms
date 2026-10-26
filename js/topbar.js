/**
 * SIGMA ELMS - Shared Topbar Interactivity Controller
 * Interface Computer College - Caloocan Senior High School ELMS
 * Unified navbar header, search, and dropdown controllers across Admin, Teacher, and Student portals.
 */

// Reject browser autofill without filtering or clearing deliberate search queries.
function protectSearchFromAutofill(input) {
    if (!input || input.dataset.autofillGuardBound) return;
    input.dataset.autofillGuardBound = 'true';
    let deliberateQuery = '';
    const rejectAutofill = () => {
        let autofilled = false;
        try { autofilled = input.matches(':autofill'); } catch (_) {}
        try { autofilled = autofilled || input.matches(':-webkit-autofill'); } catch (_) {}
        if (!autofilled) return false;
        input.value = deliberateQuery;
        return true;
    };
    input.addEventListener('input', () => {
        if (!rejectAutofill()) deliberateQuery = input.value;
    }, true);
    input.addEventListener('animationstart', event => {
        if (event.animationName === 'sigma-search-autofill') rejectAutofill();
    });
    input.rememberSearchQuery = () => { deliberateQuery = input.value; };
    if (!document.getElementById('sigma-search-autofill-style')) {
        const style = document.createElement('style');
        style.id = 'sigma-search-autofill-style';
        style.textContent = `@keyframes sigma-search-autofill { from {} to {} }
            #searchBar:-webkit-autofill, #mobileSearchInput:-webkit-autofill {
                animation-name: sigma-search-autofill; animation-duration: 0.01s;
            }
            #searchBar::-webkit-search-cancel-button, #mobileSearchInput::-webkit-search-cancel-button {
                -webkit-appearance: none;
            }`;
        document.head.appendChild(style);
    }
    rejectAutofill();
}

// ─── 0. Top-Nav Full Line Progress Bar Controller (Slim Line Style) ──────────
(function initTopNavLoadingController() {
    let activeLoadingCount = 0;
    let currentProgress = 0;
    let progressTimer = null;
    let finishTimer = null;
    const initialPageOpening = () => document.readyState === 'loading'
        || document.documentElement.matches('.sigma-initial-loading,.sigma-hash-navigating,[data-sigma-session-check],[data-sigma-session-shimmer]');

    function getOrCreateLoadingBar() {
        let bar = document.getElementById('top-nav-loading-bar');
        if (!bar) {
            const topNav = document.querySelector('.top-nav');
            if (topNav) {
                bar = document.createElement('div');
                bar.id = 'top-nav-loading-bar';
                bar.className = 'top-nav-loading-bar';
                bar.setAttribute('role', 'progressbar');
                bar.setAttribute('aria-hidden', 'true');
                topNav.appendChild(bar);
            }
        }
        if (bar && !bar.querySelector('.top-nav-loading-bar__fill')) {
            const fill = document.createElement('div');
            fill.className = 'top-nav-loading-bar__fill';
            bar.appendChild(fill);
        }
        return bar;
    }

    function setProgress(val) {
        currentProgress = Math.min(100, Math.max(0, val));
        const bar = getOrCreateLoadingBar();
        if (!bar) return;
        const fill = bar.querySelector('.top-nav-loading-bar__fill');
        if (fill) {
            fill.style.width = currentProgress + '%';
        }
    }

    function startProgressTrickle() {
        if (progressTimer) clearInterval(progressTimer);
        // Quick initial advance to ~25%
        if (currentProgress < 20) {
            setProgress(20 + Math.random() * 12);
        }

        progressTimer = setInterval(() => {
            if (currentProgress < 60) {
                setProgress(currentProgress + (6 + Math.random() * 8));
            } else if (currentProgress < 85) {
                setProgress(currentProgress + (2 + Math.random() * 4));
            } else if (currentProgress < 95) {
                setProgress(currentProgress + 0.6);
            }
        }, 250);
    }

    window.setTopNavProgress = function (percent) {
        if (initialPageOpening()) return;
        if (percent >= 100 && progressTimer) {
            clearInterval(progressTimer);
            progressTimer = null;
        }
        const bar = getOrCreateLoadingBar();
        if (bar) {
            bar.classList.add('active');
            bar.classList.remove('finishing');
        }
        setProgress(percent);
    };

    window.showTopNavLoading = function () {
        if (initialPageOpening()) return;
        activeLoadingCount++;
        if (finishTimer) {
            clearTimeout(finishTimer);
            finishTimer = null;
        }
        const bar = getOrCreateLoadingBar();
        if (bar) {
            bar.classList.add('active');
            bar.classList.remove('finishing');
        }
        startProgressTrickle();
    };

    window.hideTopNavLoading = function () {
        // An untracked startup request must not flash the completion bar.
        if (activeLoadingCount === 0) return;
        activeLoadingCount = Math.max(0, activeLoadingCount - 1);
        if (activeLoadingCount === 0) {
            if (progressTimer) {
                clearInterval(progressTimer);
                progressTimer = null;
            }
            // Rapidly complete to 100% full line
            setProgress(100);
            const bar = getOrCreateLoadingBar();
            if (bar) bar.classList.add('finishing');

            if (finishTimer) clearTimeout(finishTimer);
            finishTimer = setTimeout(() => {
                if (activeLoadingCount === 0) {
                    if (bar) {
                        bar.classList.remove('active', 'finishing');
                    }
                    setTimeout(() => {
                        if (activeLoadingCount === 0) {
                            setProgress(0);
                        }
                    }, 250);
                }
            }, 300);
        }
    };

    window.forceHideTopNavLoading = function () {
        activeLoadingCount = 0;
        if (progressTimer) {
            clearInterval(progressTimer);
            progressTimer = null;
        }
        currentProgress = 0;
        const bar = getOrCreateLoadingBar();
        if (bar) {
            bar.classList.remove('active', 'finishing');
            const fill = bar.querySelector('.top-nav-loading-bar__fill');
            if (fill) fill.style.width = '0%';
        }
        if (finishTimer) clearTimeout(finishTimer);
        finishTimer = null;
    };

    // Track Real Network Requests (Fetch & XHR) - strictly when loading, no fake timers
    if (!window.__topNavNetworkInterceptorsBound) {
        window.__topNavNetworkInterceptorsBound = true;

        if (typeof window.fetch === 'function') {
            const originalFetch = window.fetch;
            window.fetch = function (...args) {
                const resource = args[0];
                const method = String(args[1]?.method || resource?.method || 'GET').toUpperCase();
                const url = String(resource?.url || resource || '');
                // Background API calls and initial page loads do not represent top navigation loading.
                if (/\/api\//.test(url) || document.documentElement.classList.contains('sigma-initial-loading')) return originalFetch.apply(this, args);
                window.showTopNavLoading();
                return originalFetch.apply(this, args)
                    .then(res => {
                        window.hideTopNavLoading();
                        return res;
                    })
                    .catch(err => {
                        window.hideTopNavLoading();
                        throw err;
                    });
            };
        }

        if (typeof window.XMLHttpRequest === 'function') {
            const originalOpen = XMLHttpRequest.prototype.open;
            const originalSend = XMLHttpRequest.prototype.send;

            XMLHttpRequest.prototype.open = function (...args) {
                this.__topNavTracked = !/\/api\//.test(String(args[1])) && !document.documentElement.classList.contains('sigma-initial-loading');
                return originalOpen.apply(this, args);
            };

            XMLHttpRequest.prototype.send = function (...args) {
                if (this.__topNavTracked) {
                    window.showTopNavLoading();
                    const onEnd = () => {
                        if (this.__topNavTracked) {
                            this.__topNavTracked = false;
                            window.hideTopNavLoading();
                        }
                        this.removeEventListener('loadend', onEnd);
                    };
                    this.addEventListener('loadend', onEnd);
                }
                return originalSend.apply(this, args);
            };
        }
    }
})();

window.revisitActivePanel = function (panelName) {
    const panels = {
        'noti': {
            el: document.getElementById('noti-dropdown'),
            load: () => typeof window.renderNotificationsFeed === 'function' && window.renderNotificationsFeed()
        },
        'calendar': {
            el: document.getElementById('calendar-dropdown'),
            load: () => typeof window.renderCalendarGrid === 'function' && window.renderCalendarGrid()
        },
        'profile': {
            el: document.getElementById('profileDropdownMenu') || document.getElementById('profile-dropdown'),
            load: () => typeof window.syncUserProfileData === 'function' && window.syncUserProfileData()
        },
        'sigma': {
            el: document.getElementById('sigmaAiPanel'),
            load: () => {
                const msgEl = document.getElementById('sigmaAiMessages');
                if (msgEl) msgEl.scrollTop = msgEl.scrollHeight;
                const input = document.getElementById('sigmaAiInput');
                if (input && window.innerWidth > 768) setTimeout(() => input.focus(), 50);
            }
        },
        'analytics': {
            el: document.getElementById('analytics-dropdown'),
            load: () => {
                if (typeof window.syncMobileAnalyticsCards === 'function') {
                    window.syncMobileAnalyticsCards();
                } else if (typeof syncMobileAnalyticsCards === 'function') {
                    syncMobileAnalyticsCards();
                }
            }
        },
        'schedule': {
            el: document.getElementById('schedule-dropdown'),
            load: () => {
                if (typeof window.syncMobileScheduleCards === 'function') {
                    window.syncMobileScheduleCards();
                } else if (typeof syncMobileScheduleCards === 'function') {
                    syncMobileScheduleCards();
                }
            }
        }
    };

    const target = panels[panelName];
    if (!target) return;

    if (target.el) {
        target.el.scrollTop = 0;
    }

    try {
        if (target.load) target.load();
    } catch (err) {
        console.error('[SIGMA Revisit]', err);
    }
};

/**
 * Unified portal header setter — edit all navbar header behavior in this single file.
 */
window.setPortalHeader = function (title, subtitle) {
    let parentText = '';
    let childText = '';

    if (typeof title === 'object' && title !== null) {
        parentText = title.parent || '';
        childText = title.title || title.child || '';
    } else if (subtitle) {
        parentText = String(title).trim();
        childText = String(subtitle).trim();
    } else {
        childText = String(title || 'Interface Computer College').trim();
    }

    parentText = parentText.replace(/\s+in\s+context$/i, '');
    childText = childText.replace(/\s+in\s+context$/i, '');

    const escapeText = (str) => {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    };
    
    // 1. Primary brand/section context title (beside the logo)
    const brandTitle = document.getElementById('nav-context-text') || document.getElementById('header-brand-title');
    if (brandTitle) {
        if (parentText && childText) {
            brandTitle.className = 'admin-topbar__brand-label text-black has-breadcrumb';
            brandTitle.classList.remove('cursor-pointer');
            brandTitle.onclick = null;

            const isAudit = parentText === 'Audit Logs';
            const isSchool = parentText === 'School Management' || parentText === 'School';
            const isSettings = parentText === 'System Settings' || parentText === 'Settings';

            let subjectAction = '';
            let topicAction = '';

            if (isAudit) {
                const childTab = childText === 'Activity Logs' ? 'nav-audit-activity'
                    : childText === 'Authentication Logs' ? 'nav-audit-auth'
                    : childText === 'Notification Logs' ? 'nav-audit-notifications'
                    : 'nav-audit-ai';
                subjectAction = `window.switchTab('nav-audit-ai')`;
                topicAction = `if (typeof window.getActiveModalCloser === 'function' && window.getActiveModalCloser()) { window.navigateSigmaBack(); } else if (typeof window.switchTab === 'function') { window.switchTab('${childTab}'); }`;
            } else if (isSchool) {
                subjectAction = `if (typeof window.switchTab === 'function') window.switchTab('nav-school-sections')`;
                topicAction = `if (typeof window.getActiveModalCloser === 'function' && window.getActiveModalCloser()) { window.navigateSigmaBack(); }`;
            } else if (isSettings) {
                subjectAction = `if (typeof window.switchTab === 'function') window.switchTab('nav-settings')`;
                topicAction = `if (typeof window.getActiveModalCloser === 'function' && window.getActiveModalCloser()) { window.navigateSigmaBack(); }`;
            } else {
                topicAction = `if (typeof window.getActiveModalCloser === 'function' && window.getActiveModalCloser()) { window.navigateSigmaBack(); }`;
            }

            brandTitle.innerHTML = `
                <div class="breadcrumb-line-group">
                    <span class="breadcrumb-subject ${subjectAction ? 'cursor-pointer hover:underline' : ''}" ${subjectAction ? `role="button" tabindex="0" onclick="${subjectAction}"` : ''}>${escapeText(parentText)}</span>
                    <span class="breadcrumb-topic ${topicAction ? 'cursor-pointer hover:underline' : ''}" ${topicAction ? `role="button" tabindex="0" onclick="${topicAction}"` : ''}>${escapeText(childText)}</span>
                </div>
            `;
            brandTitle.querySelectorAll('[role="button"]').forEach(btn => {
                btn.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        btn.click();
                    }
                });
            });
        } else {
            brandTitle.className = 'admin-topbar__brand-label text-black';
            brandTitle.classList.remove('has-breadcrumb', 'cursor-pointer', 'pointer-events-auto');
            brandTitle.onclick = null;
            brandTitle.textContent = childText;
        }
    }

    // 2. Clear/hide any redundant secondary main-content-header in the topbar
    const mainHeader = document.getElementById('main-content-header');
    if (mainHeader) {
        mainHeader.textContent = '';
        mainHeader.classList.add('hidden');
    }

    // 3. Keep document tab title synchronized across all role pages
    const fullDocTitle = parentText && childText ? `${childText} - ${parentText}` : childText;
    if (fullDocTitle && fullDocTitle !== 'Interface Computer College') {
        document.title = `${fullDocTitle} - Interface Computer College`;
    } else {
        const path = window.location.pathname.toLowerCase();
        let role = '';
        if (path.includes('admin')) role = 'Admin';
        else if (path.includes('teacher')) role = 'Teacher';
        else if (path.includes('student')) role = 'Student';
        document.title = role ? `Interface Computer College - ${role}` : 'Interface Computer College';
    }
};

window.setNavContext = window.setPortalHeader;

window.isActuallyCalendarPage = function () {
    const hash = (typeof window.location !== 'undefined' && window.location.hash) ? window.location.hash.toLowerCase() : '';

    // If the URL hash explicitly indicates a non-calendar page/route, it is NEVER the calendar page
    if (hash.startsWith('#classroom:') ||
        hash.startsWith('#topic:') ||
        hash.startsWith('#topic-content:') ||
        hash.startsWith('#topic_content:') ||
        hash.startsWith('#grades') ||
        hash.startsWith('#gradebook') ||
        hash.startsWith('#analytics') ||
        hash.startsWith('#settings') ||
        hash.startsWith('#account-settings') ||
        hash.startsWith('#announcement') ||
        hash.startsWith('#resource') ||
        hash.startsWith('#dashboard') ||
        hash.startsWith('#classes') ||
        hash.startsWith('#classrooms') ||
        hash.startsWith('#courses') ||
        hash.startsWith('#student') ||
        hash.startsWith('#users') ||
        hash.startsWith('#subjects') ||
        (hash.startsWith('#section-') && !hash.startsWith('#section-attendance'))) {
        return false;
    }

    const isCalendarHash = (
        hash === '#calendar' ||
        hash === '#attendance' ||
        hash === '#nav-attendance' ||
        hash === '#nav_attendance' ||
        hash === '#nav-calendar' ||
        hash === '#nav_calendar' ||
        hash === '#section-attendance'
    );
    if (isCalendarHash) {
        return true;
    }

    const otherVisibleSection = document.querySelector(
        '#section-dashboard:not(.hidden), #section-classes:not(.hidden), #section-classroom-detail:not(.hidden), ' +
        '#section-grades:not(.hidden), #section-analytics:not(.hidden), #section-topic-content:not(.hidden), ' +
        '#section-settings:not(.hidden), section#classroom-detail-view:not(.hidden), ' +
        '#section-home:not(.hidden), #dashboard-view:not(.hidden), #users-view:not(.hidden), #school-grades-view:not(.hidden), ' +
        '#school-profile-view:not(.hidden), #school-year-view:not(.hidden), #school-sections-view:not(.hidden), ' +
        '#school-subjects-view:not(.hidden), #announcements-view:not(.hidden), #resources-view:not(.hidden), ' +
        '#settings-security-view:not(.hidden), #settings-branding-view:not(.hidden), #settings-integrations-view:not(.hidden), ' +
        '#settings-ai-view:not(.hidden), #settings-gdrive-view:not(.hidden), #settings-recaptcha-view:not(.hidden), ' +
        '#settings-limits-view:not(.hidden), #audit-ai-view:not(.hidden), #audit-activity-view:not(.hidden), ' +
        '#audit-notifications-view:not(.hidden), #audit-auth-view:not(.hidden), #settings-recovery-view:not(.hidden)'
    );
    if (otherVisibleSection) {
        return false;
    }

    const calSection = document.getElementById('section-attendance') || document.getElementById('section-calendar');
    const isSectionVisible = Boolean(calSection && !calSection.classList.contains('hidden'));

    if (isSectionVisible) {
        return true;
    }

    if (document.body && document.body.classList.contains('calendar-page-mode')) {
        return true;
    }

    return false;
};

window.syncCalendarPageActiveState = function () {
    const isCalendar = (typeof window.isActuallyCalendarPage === 'function')
        ? window.isActuallyCalendarPage()
        : false;

    const calToggle = document.getElementById('calendar-toggle');
    const subbarCal = document.getElementById('mobile-subbar-calendar');
    const appbarCal = document.getElementById('mobile-appbar-calendar');
    const calDropdown = document.getElementById('calendar-dropdown');
    const calDropdownOpen = Boolean(calDropdown && !calDropdown.classList.contains('hidden'));
    const header = document.getElementById('student-header') || document.getElementById('teacher-header') || document.querySelector('header');
    const isMobileCalActive = document.body.classList.contains('mobile-panel-open') && header?.dataset.activeMobilePanel === 'calendar';

    if (isCalendar) {
        document.body.classList.add('calendar-page-mode');
        if (calToggle) calToggle.classList.add('active');
        if (subbarCal) subbarCal.classList.add('active', 'selected');
        if (appbarCal) appbarCal.classList.add('active');
    } else {
        document.body.classList.remove('calendar-page-mode');
        if (calToggle && !calDropdownOpen) {
            calToggle.classList.remove('active');
        }
        if (subbarCal && !isMobileCalActive) {
            subbarCal.classList.remove('active', 'selected');
        }
        if (appbarCal && !isMobileCalActive) {
            appbarCal.classList.remove('active');
        }
    }
};

window.hideHeaderOverlays = function (exceptMenu, exceptBtn) {
    // In mobile panel mode, dismissal is handled strictly via the panel back button
    if (document.body.classList.contains('mobile-panel-open')) return;

    document.querySelectorAll('.header-panel, #calendar-dropdown, #noti-dropdown, #profile-dropdown, #profileDropdownMenu, #sigmaAiPanel').forEach(p => {
        if (p !== exceptMenu) {
            p.classList.add('hidden');
            if (p.id === 'calendar-dropdown' && typeof window.resetCalendarDropdown === 'function') {
                window.resetCalendarDropdown();
            }
        }
    });
    const isCalendarMode = (typeof window.isActuallyCalendarPage === 'function')
        ? window.isActuallyCalendarPage()
        : false;
    if (!isCalendarMode) {
        document.body.classList.remove('calendar-page-mode');
    }
    document.querySelectorAll('.header-icon-btn, .header-profile-btn, #calendar-toggle, #noti-toggle, #profile-toggle, #profileDropdownBtn, #sigma-toggle').forEach(b => {
        if (b !== exceptBtn) {
            if (b.id === 'calendar-toggle' && isCalendarMode) return;
            b.classList.remove('active');
        }
    });
};

window.openAiPanel = function () {
    const sigmaToggle = document.getElementById('sigma-toggle');
    const sigmaAiPanel = document.getElementById('sigmaAiPanel');
    if (!sigmaAiPanel) return;
    window.hideHeaderOverlays(sigmaAiPanel, sigmaToggle);
    sigmaAiPanel.classList.remove('hidden');
    if (sigmaToggle) sigmaToggle.classList.add('active');
    const input = document.getElementById('sigmaAiInput');
    if (input) setTimeout(() => input.focus(), 50);
};

window.closeAiPanel = function () {
    const sigmaToggle = document.getElementById('sigma-toggle');
    const sigmaAiPanel = document.getElementById('sigmaAiPanel');
    if (!sigmaAiPanel) return;
    sigmaAiPanel.classList.add('hidden');
    if (sigmaToggle) sigmaToggle.classList.remove('active');
};

function isTopbarOverlayClickTarget(target) {
    return Boolean(target?.closest?.(
        '.header-panel, #calendar-dropdown, #noti-dropdown, #profile-dropdown, #profileDropdownMenu, #sigmaAiPanel, ' +
        '#analytics-dropdown, #schedule-dropdown, .header-icon-btn, .header-profile-btn, .mobile-subbar-btn, ' +
        '#calendar-toggle, #noti-toggle, #profile-toggle, #profileDropdownBtn, #sigma-toggle'
    ));
}

function hasOpenTopbarOverlay() {
    const header = document.getElementById('student-header') || document.getElementById('teacher-header') || document.querySelector('header');
    return Boolean(
        document.body.classList.contains('mobile-panel-open') ||
        header?.classList.contains('mobile-panel-open') ||
        document.querySelector(
            '.header-panel:not(.hidden), #calendar-dropdown:not(.hidden), #noti-dropdown:not(.hidden), ' +
            '#profile-dropdown:not(.hidden), #profileDropdownMenu:not(.hidden), #sigmaAiPanel:not(.hidden), ' +
            '#analytics-dropdown:not(.hidden), #schedule-dropdown:not(.hidden)'
        )
    );
}

function dismissTopbarOverlayFromOutside(event) {
    if (!hasOpenTopbarOverlay()) return;
    if (isTopbarOverlayClickTarget(event.target)) return;

    if (document.body.classList.contains('mobile-panel-open')) {
        if (typeof window.closeMobileTopPanel === 'function') window.closeMobileTopPanel();
        return;
    }

    window.hideHeaderOverlays();
}

function initSharedTopbarInteractions() {
    const calendarToggle = document.getElementById('calendar-toggle');
    const calendarDropdown = document.getElementById('calendar-dropdown');
    const notiToggle = document.getElementById('noti-toggle');
    const notiDropdown = document.getElementById('noti-dropdown');
    const profileDropdownBtn = document.getElementById('profileDropdownBtn') || document.getElementById('profile-toggle');
    const profileDropdownMenu = document.getElementById('profileDropdownMenu') || document.getElementById('profile-dropdown');
    const sigmaToggle = document.getElementById('sigma-toggle');
    const sigmaAiPanel = document.getElementById('sigmaAiPanel');
    const sigmaAiCloseBtn = document.getElementById('sigmaAiCloseBtn');

    // 1. Calendar Toggle Binding
    if (calendarToggle && !calendarToggle.dataset.topbarBound) {
        calendarToggle.dataset.topbarBound = 'true';
        calendarToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!calendarDropdown) return;

            const isCalendarMode = (typeof window.isActuallyCalendarPage === 'function')
                ? window.isActuallyCalendarPage()
                : (document.body.classList.contains('calendar-page-mode'));

            // When full calendar page is already open, do not show the mini calendar panel
            if (isCalendarMode) {
                calendarDropdown.classList.add('hidden');
                calendarToggle.classList.add('active');
                return;
            }

            const isOpen = !calendarDropdown.classList.contains('hidden');
            if (isOpen) {
                // Desktop toggle dismissal: clicking active icon closes panel
                calendarDropdown.classList.add('hidden');
                calendarToggle.classList.remove('active');
            } else {
                window.hideHeaderOverlays(calendarDropdown, calendarToggle);
                calendarDropdown.classList.remove('hidden');
                calendarToggle.classList.add('active');
                if (typeof window.renderCalendarGrid === 'function') {
                    window.renderCalendarGrid();
                }
                window.revisitActivePanel('calendar');
            }
        });
        if (calendarDropdown) {
            calendarDropdown.addEventListener('click', (e) => e.stopPropagation());
        }
    }

    // 2. Notification Toggle Binding
    if (notiToggle && notiDropdown && !notiToggle.dataset.topbarBound) {
        notiToggle.dataset.topbarBound = 'true';
        notiToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const isOpen = !notiDropdown.classList.contains('hidden') && notiToggle.classList.contains('active');
            if (isOpen) {
                // Desktop toggle dismissal: clicking active icon closes panel
                notiDropdown.classList.add('hidden');
                notiToggle.classList.remove('active');
            } else {
                window.hideHeaderOverlays(notiDropdown, notiToggle);
                notiDropdown.classList.remove('hidden');
                notiToggle.classList.add('active');
                window.revisitActivePanel('noti');
            }
        });
        notiDropdown.addEventListener('click', (e) => e.stopPropagation());
    }

    // 3. Profile Dropdown Toggle Binding
    if (profileDropdownBtn && profileDropdownMenu && !profileDropdownBtn.dataset.topbarBound) {
        profileDropdownBtn.dataset.topbarBound = 'true';
        profileDropdownBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const isOpen = !profileDropdownMenu.classList.contains('hidden') && profileDropdownBtn.classList.contains('active');
            if (isOpen) {
                // Desktop toggle dismissal: clicking active icon closes panel
                profileDropdownMenu.classList.add('hidden');
                profileDropdownBtn.classList.remove('active');
            } else {
                window.hideHeaderOverlays(profileDropdownMenu, profileDropdownBtn);
                profileDropdownMenu.classList.remove('hidden');
                profileDropdownBtn.classList.add('active');
                window.revisitActivePanel('profile');
            }
        });
        profileDropdownMenu.addEventListener('click', (e) => e.stopPropagation());
    }

    // 4. SIGMA AI Toggle Binding
    if (sigmaToggle && sigmaAiPanel && !sigmaToggle.dataset.topbarBound) {
        sigmaToggle.dataset.topbarBound = 'true';
        sigmaToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const isOpen = !sigmaAiPanel.classList.contains('hidden') && sigmaToggle.classList.contains('active');
            if (isOpen) {
                // Desktop toggle dismissal: clicking active icon closes panel
                sigmaAiPanel.classList.add('hidden');
                sigmaToggle.classList.remove('active');
            } else {
                window.hideHeaderOverlays(sigmaAiPanel, sigmaToggle);
                sigmaAiPanel.classList.remove('hidden');
                sigmaToggle.classList.add('active');
                window.revisitActivePanel('sigma');
            }
        });
        sigmaAiPanel.addEventListener('click', (e) => e.stopPropagation());
    }

    if (sigmaAiCloseBtn && sigmaAiPanel && !sigmaAiCloseBtn.dataset.topbarBound) {
        sigmaAiCloseBtn.dataset.topbarBound = 'true';
        sigmaAiCloseBtn.addEventListener('click', (e) => {
            e.preventDefault();
            sigmaAiPanel.classList.add('hidden');
            if (sigmaToggle) sigmaToggle.classList.remove('active');
        });
    }

    // 5. Global Outside Click and ESC key dismissals
    if (!document.body.dataset.topbarOverlaysBound) {
        document.body.dataset.topbarOverlaysBound = 'true';
        document.addEventListener('pointerdown', dismissTopbarOverlayFromOutside, true);
        document.addEventListener('click', dismissTopbarOverlayFromOutside, true);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (document.body.classList.contains('mobile-panel-open') && typeof window.closeMobileTopPanel === 'function') {
                    window.closeMobileTopPanel();
                } else {
                    window.hideHeaderOverlays();
                }
            }
        });
    }

    // Global Search Key Handler & Universal Search Dropdown
    const searchBar = document.getElementById('searchBar');
    protectSearchFromAutofill(searchBar);
    protectSearchFromAutofill(document.getElementById('mobileSearchInput'));
    const globalSearchBtn = document.getElementById('globalSearchBtn');

    // One-time cleanup of legacy shared search history key so it does not bleed into accounts
    try {
        if (localStorage.getItem('sigma_universal_search_history')) {
            localStorage.removeItem('sigma_universal_search_history');
        }
    } catch (_) {}

    function getCurrentUserAccountInfo() {
        let user = null;
        // 1. Check window.getActiveUserData or window.getLoggedInUserData
        if (typeof window.getActiveUserData === 'function') {
            try { user = window.getActiveUserData(); } catch (_) {}
        }
        if (!user && typeof window.getLoggedInUserData === 'function') {
            try { user = window.getLoggedInUserData(); } catch (_) {}
        }
        // 2. Check window.currentUser or window.currentUserProfileData
        if (!user && window.currentUser && typeof window.currentUser === 'object') {
            user = window.currentUser;
        }
        if (!user && window.currentUserProfileData && typeof window.currentUserProfileData === 'object') {
            user = window.currentUserProfileData;
        }
        // 3. Check sessionStorage and localStorage for authenticated user session
        if (!user) {
            const candidateKeys = ['sigma-authenticated-user', 'currentUser', 'sigma-logged-in-user', 'sigma_active_user'];
            for (const k of candidateKeys) {
                try {
                    const raw = sessionStorage.getItem(k) || localStorage.getItem(k);
                    if (raw) {
                        const parsed = JSON.parse(raw);
                        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
                            user = parsed;
                            break;
                        }
                    }
                } catch (_) {}
            }
        }

        // 4. Determine portal role
        const path = (window.location.pathname || '').toLowerCase();
        let role = 'admin';
        if (path.includes('teacher') || document.body.classList.contains('teacher-portal') || document.querySelector('[data-portal="teacher"]')) {
            role = 'teacher';
        } else if (path.includes('student') || document.body.classList.contains('student-portal') || document.querySelector('[data-portal="student"]')) {
            role = 'student';
        } else if (user && (user.role || user.type)) {
            const r = String(user.role || user.type).toLowerCase();
            if (r.includes('teacher')) role = 'teacher';
            else if (r.includes('student')) role = 'student';
            else role = 'admin';
        }

        // 5. Extract unique user ID
        let rawId = '';
        if (user) {
            rawId = String(user.uid || user.id || user.accountId || user.userId || user.employeeId || user.lrn || user.username || '').replace(/^#/, '').trim();
            if (!rawId && user.email) {
                rawId = String(user.email).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
            }
        }

        if (!rawId) {
            rawId = role === 'teacher' ? '1111111' : (role === 'student' ? '2222222' : '0000000');
        }

        return {
            role,
            userId: rawId,
            accountKey: `${role}_${rawId}`,
            rawUser: user
        };
    }

    function getSearchHistoryKey() {
        const info = getCurrentUserAccountInfo();
        return `sigma_search_history_${info.role}_${info.userId}`;
    }

    const MAX_HISTORY = 5;

    function getSearchHistory() {
        try {
            const key = getSearchHistoryKey();
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    }

    function saveSearchHistory(list) {
        try {
            const key = getSearchHistoryKey();
            localStorage.setItem(key, JSON.stringify(list.slice(0, MAX_HISTORY)));
        } catch (e) {
            console.warn('Failed to save search history', e);
        }
    }

    function addSearchHistory(query) {
        const trimmed = (query || '').trim();
        if (!trimmed) return;
        let list = getSearchHistory();
        list = list.filter(item => item.toLowerCase() !== trimmed.toLowerCase());
        list.unshift(trimmed);
        saveSearchHistory(list);
    }

    function removeSearchHistoryItem(query) {
        let list = getSearchHistory();
        list = list.filter(item => item.toLowerCase() !== (query || '').toLowerCase());
        saveSearchHistory(list);
        renderSearchDropdown();
        renderMobileSearchDropdown();
    }

    function clearSearchHistory() {
        saveSearchHistory([]);
        renderSearchDropdown();
        renderMobileSearchDropdown();
    }

    let searchDropdown = null;

    function ensureSearchDropdown() {
        if (searchDropdown && document.body.contains(searchDropdown)) return searchDropdown;
        const container = document.querySelector('.header-search-container');
        if (!container) return null;

        searchDropdown = document.createElement('div');
        searchDropdown.id = 'universal-search-dropdown';
        searchDropdown.hidden = true;
        container.appendChild(searchDropdown);

        // Outside click dismiss
        document.addEventListener('click', (e) => {
            if (!container.contains(e.target)) {
                hideSearchDropdown();
            }
        });

        return searchDropdown;
    }

    function showSearchDropdown() {
        const dd = ensureSearchDropdown();
        if (!dd) return;
        renderSearchDropdown();
        alignSearchDropdown();
    }

    function hideSearchDropdown() {
        if (searchDropdown) {
            searchDropdown.hidden = true;
        }
    }

    // Match labels from the start of each word.
    function strictWordMatch(text, query) {
        return Boolean(text && String(query || '').trim()) && window.SigmaSearch.text(text, query);
    }

    function getSearchScopeData() {
        const items = [];
        // Extract navigation links visible in sidebar
        document.querySelectorAll('#sidebar .nav-link, #sidebar .nav-sublink').forEach(link => {
            const label = link.querySelector('span')?.textContent?.trim() || link.textContent?.trim();
            if (label && !items.some(i => i.title.toLowerCase() === label.toLowerCase())) {
                items.push({
                    title: label,
                    category: 'Page',
                    action: () => link.click()
                });
            }
        });
        return items;
    }

    function isEmailAddress(str) {
        if (!str || typeof str !== 'string') return false;
        return str.includes('@') || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str.trim());
    }

    function isFirstLetterMatch(text, query) {
        if (!text || !query) return false;
        const lowerText = text.toLowerCase().trim();
        const lowerQuery = query.toLowerCase().trim();
        if (!lowerQuery) return false;

        // Strictly reject emails
        if (isEmailAddress(lowerText)) return false;

        // Match the start of each word in a page label.
        return window.SigmaSearch.text(lowerText, lowerQuery);
    }

    function alignSearchDropdown() {
        const dd = searchDropdown;
        if (!dd || dd.hidden || !searchBar) return;
        const container = searchBar.closest('.header-search-container');
        const shell = searchBar.closest('.header-search-shell');
        if (!container || !shell) return;

        // Clear any inline left/width/right styles so CSS left: -20px !important; right: 72px !important; width: auto !important
        // automatically aligns the dropdown with 100% precision from shell left edge to enter button divider line
        dd.style.removeProperty('left');
        dd.style.removeProperty('width');
        dd.style.removeProperty('right');
    }

    function highlightSuggestion(text, query) {
        if (!text) return '';
        const cleanQuery = (query || '').trim();
        if (!cleanQuery) return escapeSearchText(text);

        const lowerText = text.toLowerCase();
        const lowerQuery = cleanQuery.toLowerCase();

        // The text starts with the query: typed prefix is normal weight, rest is bold
        if (lowerText.startsWith(lowerQuery)) {
            const match = escapeSearchText(text.slice(0, cleanQuery.length));
            const after = escapeSearchText(text.slice(cleanQuery.length));
            return `${match}<b>${after}</b>`;
        }

        return escapeSearchText(text);
    }

    function getSearchSuggestions(query) {
        const rawQuery = (query || '').trim();
        if (!rawQuery) return [];

        const lowerQuery = rawQuery.toLowerCase();
        const suggestions = [];
        const seen = new Set();

        const userInfo = getCurrentUserAccountInfo();
        const userRole = userInfo.role;
        const currentUserObj = userInfo.rawUser || {};

        // Prepare current user's names for exclusion
        const authUid = String(currentUserObj.uid || currentUserObj.id || '').replace(/^#/, '').trim().toLowerCase();
        let authFirstName = String(currentUserObj.firstName || '').trim();
        let authLastName = String(currentUserObj.lastName || '').trim();
        let authFullName = String(currentUserObj.fullName || currentUserObj.name || '').trim();
        
        if (!authFirstName && !authLastName && authFullName) {
            const tokens = authFullName.split(/\s+/).filter(Boolean);
            if (tokens.length >= 2) {
                authFirstName = tokens[0];
                authLastName = tokens[tokens.length - 1];
            }
        }
        const authFirstLast = [authFirstName, authLastName].filter(Boolean).join(' ').trim().toLowerCase();
        const authFullLower = authFullName.toLowerCase();

        function addCandidate(text, isHistory = false) {
            if (!text || typeof text !== 'string') return;
            let clean = text.trim();
            // Strictly strip out any "ID: ..." or concatenated ID tags
            clean = clean.replace(/ID:\s*[\w\d-]+/gi, '')
                         .replace(/\(ID:.*?\)/gi, '')
                         .replace(/\[ID:.*?\]/gi, '')
                         .replace(/\s*ID:\s*$/gi, '')
                         .replace(/\bID[:#]?\s*[\w\d-]+/gi, '')
                         .trim();
            if (!clean || clean.length < 2 || clean.length > 60) return;
            
            // Exclude current user by name or partial name
            const cleanLower = clean.toLowerCase();
            const authFirstLower = authFirstName.toLowerCase();
            const authLastLower = authLastName.toLowerCase();
            
            if (authFirstLast && cleanLower === authFirstLast) return;
            if (authFullLower && cleanLower === authFullLower) return;
            if (authFirstLower && cleanLower === authFirstLower) return;
            if (authLastLower && cleanLower === authLastLower) return;
            
            // Strictly exclude any emails from suggestions
            if (isEmailAddress(clean)) return;

            // Strictly reject pure numbers/dates/IDs
            if (/^[\d\s\-_.:#@/()]+$/.test(clean) || /^id[:\s]/i.test(clean)) return;
            // Strictly ensure first letter of result starts with query
            if (!isFirstLetterMatch(clean, rawQuery)) return;
            // Never mirror the exact typed query in the suggestions panel
            if (clean.toLowerCase() === lowerQuery) return;

            const key = clean.toLowerCase();
            const tokenKey = clean.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean).sort().join('_');
            if (!seen.has(key) && !seen.has(tokenKey)) {
                seen.add(key);
                if (tokenKey) seen.add(tokenKey);
                suggestions.push({ text: clean, isHistory });
            }
        }

        // 1. Current Account's Search History matches (excluding emails)
        const history = getSearchHistory();
        history.forEach(item => {
            if (!isEmailAddress(item) && isFirstLetterMatch(item, rawQuery)) {
                addCandidate(item, true);
            }
        });

        // 2. Scan The Users (Primary: sigma-admin-users) then secondary fallbacks
        const primaryUsers = (typeof window.getStoredJson === 'function')
            ? window.getStoredJson('sigma-admin-users', [])
            : JSON.parse(localStorage.getItem('sigma-admin-users') || '[]');

        const secondaryUserKeys = userRole === 'admin'
            ? ['sigma-users-list', 'sigma-teacher-users', 'sigma-student-users']
            : (userRole === 'teacher'
                ? ['sigma-student-users', 'sigma-teacher-users', 'sigma-users-list']
                : ['sigma-teacher-users', 'sigma-student-users', 'sigma-users-list']);

        const seenUserIds = new Set();

        const processUserCandidate = (u) => {
            if (!u) return;
            const uid = String(u.uid || u.id || u.lrn || u.studentNumber || u.employeeId || '').replace(/^#/, '').trim().toLowerCase();
            
            // Exclude current logged in user from suggestions
            const authUserId = String(currentUserObj.uid || currentUserObj.id || '').replace(/^#/, '').trim().toLowerCase();
            if (uid && authUserId && uid === authUserId) return;

            const uRole = (u.role || u.type || '').toLowerCase();
            if (userRole === 'student' && (uRole.includes('admin') || uRole.includes('master'))) return;
            if (userRole === 'teacher' && uRole.includes('admin') && !uRole.includes('teacher') && !uRole.includes('faculty')) return;

            let fullName = '';
            if (u.firstName || u.lastName) {
                // Only First and Last name
                fullName = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
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
                if (first && last) fullName = `${first} ${last}`;
            }

            const normKey = fullName.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (uid && seenUserIds.has(uid)) return;
            if (normKey && seenUserIds.has(normKey)) return;

            if (uid) seenUserIds.add(uid);
            if (normKey) seenUserIds.add(normKey);

            if (fullName) {
                addCandidate(fullName);
            }
        };

        if (Array.isArray(primaryUsers)) {
            primaryUsers.forEach(processUserCandidate);
        }
        for (const key of secondaryUserKeys) {
            try {
                const list = JSON.parse(localStorage.getItem(key) || '[]');
                if (Array.isArray(list)) list.forEach(processUserCandidate);
            } catch (_) {}
        }

        // 3. Scan LocalStorage for Subjects (scoped to role)
        const subjectKeys = userRole === 'student'
            ? ['sigma_classroom_materials', 'sigma_subjects_v2', 'sigma-subjects-list']
            : ['sigma-admin-subjects', 'sigma-subjects-list', 'sigma_subjects_v2', 'sigma_classroom_materials'];

        for (const key of subjectKeys) {
            try {
                const raw = localStorage.getItem(key);
                if (raw) {
                    const list = JSON.parse(raw);
                    if (Array.isArray(list)) {
                        list.forEach(s => {
                            if (!s) return;
                            const name = s.name || s.title || s.subjectName || s.code;
                            if (name) {
                                addCandidate(name);
                            }
                        });
                    }
                }
            } catch (_) {}
        }

        // 4. Scan LocalStorage for Sections (scoped to role)
        const sectionKeys = userRole === 'student'
            ? []
            : ['sigma-sections-list', 'sigma_sections', 'sigma-admin-sections'];

        for (const key of sectionKeys) {
            try {
                const raw = localStorage.getItem(key);
                if (raw) {
                    const list = JSON.parse(raw);
                    if (Array.isArray(list)) {
                        list.forEach(sec => {
                            if (!sec) return;
                            const name = typeof sec === 'string' ? sec : (sec.name || sec.sectionName);
                            if (name) {
                                addCandidate(name);
                            }
                        });
                    }
                }
            } catch (_) {}
        }

        // 5. Sidebar Navigation Links
        document.querySelectorAll('#sidebar .nav-link, #sidebar .nav-sublink').forEach(link => {
            const label = link.querySelector('span')?.textContent?.trim() || link.textContent?.trim();
            if (label) {
                addCandidate(label);
            }
        });

        // 6. Page Table rows (names/titles only, strictly ignore emails and IDs)
        document.querySelectorAll('table tbody tr').forEach(row => {
            row.querySelectorAll('td').forEach(cell => {
                // If cell contains sub-elements, prioritize name elements to avoid concatenating with "ID: 2222222"
                const nameNode = cell.querySelector('.user-name, .student-name, .font-bold, .font-semibold, h3, h4, span:first-child');
                const raw = nameNode ? nameNode.textContent : (cell.childNodes[0]?.textContent || cell.textContent);
                let text = (raw || '').trim().replace(/ID:\s*[\w\d-]+/gi, '').replace(/\(ID:.*?\)/gi, '').trim();
                if (text && text.length > 2 && text.length < 50 && !isEmailAddress(text)) {
                    if (!text.includes('\n') && !/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(text) && !/^id[:\s]/i.test(text)) {
                        addCandidate(text);
                    }
                }
            });
        });

        // Sort: items starting with query first, then alphabetical (no mirroring of the typed text)
        suggestions.sort((a, b) => {
            const aLower = a.text.toLowerCase();
            const bLower = b.text.toLowerCase();
            const aStarts = aLower.startsWith(lowerQuery);
            const bStarts = bLower.startsWith(lowerQuery);
            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;

            return aLower.localeCompare(bLower);
        });

        return suggestions.slice(0, 8);
    }

    function selectSuggestion(queryText) {
        if (!queryText) return;
        if (searchBar) { searchBar.value = queryText; searchBar.rememberSearchQuery?.(); }
        const mobileInput = document.getElementById('mobileSearchInput');
        if (mobileInput) mobileInput.value = queryText;
        hideSearchDropdown();
        closeMobileSearch();
        executeGlobalSearch(queryText);
    }

    function renderSearchDropdown() {
        const dd = ensureSearchDropdown();
        if (!dd || !searchBar) return;

        const query = searchBar.value.trim();

        // If query is empty: Render History Panel (if any exist)
        if (!query) {
            const history = getSearchHistory().filter(item => !isEmailAddress(item));
            if (history.length === 0) {
                dd.innerHTML = '';
                dd.hidden = true;
                return;
            }

            dd.hidden = false;
            alignSearchDropdown();
            dd.innerHTML = `
                <div class="universal-search-history-header">
                    <span class="universal-search-history-title">Your Recent Searched</span>
                    <button type="button" class="universal-search-clear-all-btn">Clear All</button>
                </div>
                <div class="universal-search-history-list"></div>
            `;

            const clearBtn = dd.querySelector('.universal-search-clear-all-btn');
            if (clearBtn) {
                clearBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    clearSearchHistory();
                });
            }

            const listContainer = dd.querySelector('.universal-search-history-list');
            history.forEach(itemText => {
                const row = document.createElement('div');
                row.className = 'universal-search-item';
                row.dataset.query = itemText;
                row.innerHTML = `
                    <div class="universal-search-item-left">
                        <i class="fa-solid fa-magnifying-glass universal-search-item-icon"></i>
                        <span class="universal-search-item-text">${escapeSearchText(itemText)}</span>
                    </div>
                    <button type="button" class="universal-search-item-delete" title="Remove from history" aria-label="Remove from history">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                `;

                const handleSelect = (e) => {
                    if (e.target.closest('.universal-search-item-delete')) return;
                    e.preventDefault();
                    e.stopPropagation();
                    selectSuggestion(itemText);
                };

                row.addEventListener('mousedown', (e) => {
                    if (!e.target.closest('.universal-search-item-delete')) {
                        e.preventDefault(); // Prevents input blur from preempting or interfering with click
                    }
                });
                row.addEventListener('click', handleSelect);

                row.querySelector('.universal-search-item-delete').addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    removeSearchHistoryItem(itemText);
                });

                listContainer.appendChild(row);
            });
            return;
        }

        // If query is present: Render Suggestions Autocomplete Dropdown
        const suggestions = getSearchSuggestions(query);
        if (suggestions.length === 0) {
            dd.innerHTML = '';
            dd.hidden = true;
            return;
        }

        dd.hidden = false;
        alignSearchDropdown();
        dd.innerHTML = `<div class="universal-search-suggestions-list"></div>`;
        const listContainer = dd.querySelector('.universal-search-suggestions-list');

        suggestions.forEach(item => {
            const row = document.createElement('div');
            row.className = 'universal-search-item';
            row.dataset.query = item.text;
            row.innerHTML = `
                <div class="universal-search-item-left">
                    <i class="fa-solid fa-magnifying-glass universal-search-item-icon"></i>
                    <span class="universal-search-item-text">${highlightSuggestion(item.text, query)}</span>
                </div>
                ${item.isHistory ? `
                    <button type="button" class="universal-search-item-delete" title="Remove from history" aria-label="Remove from history">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                ` : ''}
            `;

            const handleSelect = (e) => {
                if (e.target.closest('.universal-search-item-delete')) return;
                e.preventDefault();
                e.stopPropagation();
                selectSuggestion(item.text);
            };

            row.addEventListener('mousedown', (e) => {
                if (!e.target.closest('.universal-search-item-delete')) {
                    e.preventDefault(); // Prevents input blur from preempting or interfering with click
                }
            });
            row.addEventListener('click', handleSelect);

            if (item.isHistory) {
                const delBtn = row.querySelector('.universal-search-item-delete');
                if (delBtn) {
                    delBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        removeSearchHistoryItem(item.text);
                    });
                }
            }

            listContainer.appendChild(row);
        });
    }

    function escapeSearchText(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    const searchShell = searchBar ? searchBar.closest('.header-search-shell') : null;
    if (searchShell && !searchShell.dataset.shellBound) {
        searchShell.dataset.shellBound = 'true';
        searchShell.addEventListener('click', (e) => {
            if (e.target !== searchBar && !globalSearchBtn?.contains(e.target)) {
                searchBar.focus();
            }
        });
    }

    if (searchBar && !searchBar.dataset.searchBound) {
        searchBar.dataset.searchBound = 'true';

        searchBar.addEventListener('focus', () => {
            showSearchDropdown();
        });

        searchBar.addEventListener('input', () => {
            // Displays suggestions autocomplete without triggering background page search
            showSearchDropdown();
        });

        searchBar.addEventListener('keydown', (e) => {
            const dd = ensureSearchDropdown();
            const isVisible = dd && !dd.hidden;
            const items = isVisible ? Array.from(dd.querySelectorAll('.universal-search-item')) : [];
            const currentIndex = items.findIndex(el => el.classList.contains('active'));

            if (e.key === 'ArrowDown') {
                if (isVisible && items.length > 0) {
                    e.preventDefault();
                    const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
                    items.forEach(el => el.classList.remove('active'));
                    items[nextIndex].classList.add('active');
                    items[nextIndex].scrollIntoView({ block: 'nearest' });
                    const val = items[nextIndex].dataset.query;
                    if (val) { searchBar.value = val; searchBar.rememberSearchQuery?.(); }
                }
            } else if (e.key === 'ArrowUp') {
                if (isVisible && items.length > 0) {
                    e.preventDefault();
                    const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
                    items.forEach(el => el.classList.remove('active'));
                    items[prevIndex].classList.add('active');
                    items[prevIndex].scrollIntoView({ block: 'nearest' });
                    const val = items[prevIndex].dataset.query;
                    if (val) { searchBar.value = val; searchBar.rememberSearchQuery?.(); }
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                if (isVisible && currentIndex >= 0 && items[currentIndex]) {
                    const selectedQuery = items[currentIndex].dataset.query;
                    selectSuggestion(selectedQuery);
                } else {
                    const q = searchBar.value.trim();
                    if (q) {
                        selectSuggestion(q);
                    } else {
                        hideSearchDropdown();
                    }
                }
            } else if (e.key === 'Escape') {
                hideSearchDropdown();
                searchBar.blur();
            }
        });

        window.addEventListener('resize', alignSearchDropdown);
        window.addEventListener('scroll', alignSearchDropdown, true);
    }

    if (globalSearchBtn && searchBar && !globalSearchBtn.dataset.searchBound) {
        globalSearchBtn.dataset.searchBound = 'true';
        globalSearchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const q = searchBar.value.trim();
            if (q) {
                addSearchHistory(q);
                executeGlobalSearch(q);
            }
            hideSearchDropdown();
        });
    }

    let lastGlobalSearchTime = 0;
    function executeGlobalSearch(query) {
        if (!query) return;
        const now = Date.now();
        if (now - lastGlobalSearchTime < 300) return;
        lastGlobalSearchTime = now;
        addSearchHistory(query);
        console.log(`[SIGMA Search] Executing search for: ${query}`);
        window.dispatchEvent(new CustomEvent('sigma:search', { detail: { query } }));
        if (typeof window.openSearchResultsView === 'function') {
            window.openSearchResultsView(query);
        }
    }


    // 6. Mobile Search Toggle, Overlay, Backdrop & Dropdown (History + Suggestions)
    const mobileSearchToggleBtn = document.getElementById('mobileSearchToggleBtn');
    const mobileSearchOverlay = document.getElementById('mobile-search-overlay');
    const mobileSearchBackdrop = document.getElementById('mobile-search-backdrop');
    const mobileSearchBackBtn = document.getElementById('mobileSearchBackBtn');
    const mobileSearchCloseBtn = document.getElementById('mobileSearchCloseBtn');
    const mobileSearchSubmitBtn = document.getElementById('mobileSearchSubmitBtn');
    const mobileSearchInput = document.getElementById('mobileSearchInput');

    let mobileSearchDropdown = null;

    function ensureMobileSearchBackdrop() {
        let bd = document.getElementById('mobile-search-backdrop');
        if (!bd) {
            bd = document.createElement('div');
            bd.id = 'mobile-search-backdrop';
            bd.className = 'mobile-search-backdrop hidden';
            document.body.appendChild(bd);
        } else if (bd.parentElement !== document.body) {
            // Move backdrop directly to document.body so it isn't trapped in header's stacking context
            document.body.appendChild(bd);
        }

        if (!bd.dataset.topbarBound) {
            bd.dataset.topbarBound = 'true';
            bd.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                closeMobileSearch();
            });
            bd.addEventListener('touchstart', (e) => {
                e.preventDefault();
                e.stopPropagation();
                closeMobileSearch();
            }, { passive: false });
        }
        return bd;
    }

    function alignMobileSearchBackdrop() {
        const overlay = document.getElementById('mobile-search-overlay');
        const bd = document.getElementById('mobile-search-backdrop');
        if (!overlay) return;
        const rect = overlay.getBoundingClientRect();
        const bottom = rect.bottom > 0 ? rect.bottom : (overlay.offsetHeight || 60);
        document.documentElement.style.setProperty('--mobile-search-bar-bottom', `${bottom}px`);
        if (bd) {
            bd.style.top = `${bottom}px`;
        }
        if (mobileSearchDropdown && !mobileSearchDropdown.hidden) {
            mobileSearchDropdown.style.top = `${bottom}px`;
        }
    }

    function ensureMobileSearchDropdown() {
        if (mobileSearchDropdown && document.body.contains(mobileSearchDropdown)) return mobileSearchDropdown;
        mobileSearchDropdown = document.createElement('div');
        mobileSearchDropdown.id = 'mobile-search-dropdown';
        mobileSearchDropdown.className = 'mobile-search-dropdown';
        mobileSearchDropdown.hidden = true;
        document.body.appendChild(mobileSearchDropdown);
        return mobileSearchDropdown;
    }

    function hideMobileSearchDropdown() {
        if (mobileSearchDropdown) {
            mobileSearchDropdown.hidden = true;
            mobileSearchDropdown.classList.add('hidden');
        }
    }

    function renderMobileSearchDropdown() {
        const dd = ensureMobileSearchDropdown();
        if (!dd) return;
        if (!mobileSearchInput) return;

        alignMobileSearchBackdrop();

        const query = mobileSearchInput.value.trim();

        // If query is empty: Render History Panel (if any exist)
        if (!query) {
            const history = getSearchHistory().filter(item => !isEmailAddress(item));
            if (history.length === 0) {
                dd.innerHTML = '';
                dd.hidden = true;
                dd.classList.add('hidden');
                return;
            }

            dd.hidden = false;
            dd.classList.remove('hidden');
            alignMobileSearchBackdrop();
            dd.innerHTML = `
                <div class="universal-search-history-header">
                    <span class="universal-search-history-title">Your Recent Searched</span>
                    <button type="button" class="universal-search-clear-all-btn">Clear All</button>
                </div>
                <div class="universal-search-history-list"></div>
            `;

            const clearBtn = dd.querySelector('.universal-search-clear-all-btn');
            if (clearBtn) {
                clearBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    clearSearchHistory();
                    renderMobileSearchDropdown();
                    renderSearchDropdown();
                });
            }

            const listContainer = dd.querySelector('.universal-search-history-list');
            history.forEach(itemText => {
                const row = document.createElement('div');
                row.className = 'universal-search-item';
                row.dataset.query = itemText;
                row.innerHTML = `
                    <div class="universal-search-item-left">
                        <i class="fa-solid fa-magnifying-glass universal-search-item-icon"></i>
                        <span class="universal-search-item-text">${escapeSearchText(itemText)}</span>
                    </div>
                    <button type="button" class="universal-search-item-delete" title="Remove from history" aria-label="Remove from history">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                `;

                let touchStartY = 0;
                let isScrolling = false;

                row.addEventListener('touchstart', (e) => {
                    if (e.touches && e.touches[0]) {
                        touchStartY = e.touches[0].clientY;
                    }
                    isScrolling = false;
                }, { passive: true });

                row.addEventListener('touchmove', (e) => {
                    if (e.touches && e.touches[0]) {
                        const delta = Math.abs(e.touches[0].clientY - touchStartY);
                        if (delta > 8) isScrolling = true;
                    }
                }, { passive: true });

                const handleMobileSelect = (e) => {
                    if (e.target.closest('.universal-search-item-delete')) return;
                    e.preventDefault();
                    e.stopPropagation();
                    selectSuggestion(itemText);
                };

                row.addEventListener('touchend', (e) => {
                    if (isScrolling) return;
                    handleMobileSelect(e);
                });

                row.addEventListener('mousedown', (e) => {
                    if (!e.target.closest('.universal-search-item-delete')) {
                        e.preventDefault(); // Prevents input blur/keyboard dismissal from canceling click
                    }
                });

                row.addEventListener('click', handleMobileSelect);

                const delBtn = row.querySelector('.universal-search-item-delete');
                if (delBtn) {
                    delBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        removeSearchHistoryItem(itemText);
                        renderMobileSearchDropdown();
                        renderSearchDropdown();
                    });
                }

                listContainer.appendChild(row);
            });
            return;
        }

        // If query is present: Render Suggestions Autocomplete Dropdown
        const suggestions = getSearchSuggestions(query);
        if (suggestions.length === 0) {
            dd.innerHTML = '';
            dd.hidden = true;
            dd.classList.add('hidden');
            return;
        }

        dd.hidden = false;
        dd.classList.remove('hidden');
        alignMobileSearchBackdrop();
        dd.innerHTML = `<div class="universal-search-suggestions-list"></div>`;
        const listContainer = dd.querySelector('.universal-search-suggestions-list');

        suggestions.forEach(item => {
            const row = document.createElement('div');
            row.className = 'universal-search-item';
            row.dataset.query = item.text;
            row.innerHTML = `
                <div class="universal-search-item-left">
                    <i class="fa-solid fa-magnifying-glass universal-search-item-icon"></i>
                    <span class="universal-search-item-text">${highlightSuggestion(item.text, query)}</span>
                </div>
                ${item.isHistory ? `
                    <button type="button" class="universal-search-item-delete" title="Remove from history" aria-label="Remove from history">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                ` : ''}
            `;

            let touchStartY = 0;
            let isScrolling = false;

            row.addEventListener('touchstart', (e) => {
                if (e.touches && e.touches[0]) {
                    touchStartY = e.touches[0].clientY;
                }
                isScrolling = false;
            }, { passive: true });

            row.addEventListener('touchmove', (e) => {
                if (e.touches && e.touches[0]) {
                    const delta = Math.abs(e.touches[0].clientY - touchStartY);
                    if (delta > 8) isScrolling = true;
                }
            }, { passive: true });

            const handleMobileSelect = (e) => {
                if (e.target.closest('.universal-search-item-delete')) return;
                e.preventDefault();
                e.stopPropagation();
                selectSuggestion(item.text);
            };

            row.addEventListener('touchend', (e) => {
                if (isScrolling) return;
                handleMobileSelect(e);
            });

            row.addEventListener('mousedown', (e) => {
                if (!e.target.closest('.universal-search-item-delete')) {
                    e.preventDefault(); // Prevents input blur/keyboard dismissal from canceling click
                }
            });

            row.addEventListener('click', handleMobileSelect);

            if (item.isHistory) {
                const delBtn = row.querySelector('.universal-search-item-delete');
                if (delBtn) {
                    delBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        removeSearchHistoryItem(item.text);
                        renderMobileSearchDropdown();
                        renderSearchDropdown();
                    });
                }
            }

            listContainer.appendChild(row);
        });
    }

    function openMobileSearch() {
        document.body.classList.add('mobile-search-active');
        const overlay = document.getElementById('mobile-search-overlay');
        const bd = ensureMobileSearchBackdrop();
        if (overlay) overlay.classList.remove('hidden');
        if (bd) {
            bd.classList.remove('hidden');
            bd.removeAttribute('hidden');
        }
        alignMobileSearchBackdrop();
        if (mobileSearchInput) {
            mobileSearchInput.focus();
            renderMobileSearchDropdown();
        }
    }

    function closeMobileSearch() {
        document.body.classList.remove('mobile-search-active');
        document.getElementById('teacher-header')?.classList.remove('mobile-search-active');
        document.getElementById('student-header')?.classList.remove('mobile-search-active');
        const overlay = document.getElementById('mobile-search-overlay');
        const bd = document.getElementById('mobile-search-backdrop');
        if (overlay) overlay.classList.add('hidden');
        if (bd) {
            bd.classList.add('hidden');
            bd.setAttribute('hidden', '');
        }
        hideMobileSearchDropdown();
    }

    if (mobileSearchToggleBtn && !mobileSearchToggleBtn.dataset.topbarBound) {
        mobileSearchToggleBtn.dataset.topbarBound = 'true';
        mobileSearchToggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            openMobileSearch();
        });
    }

    // 1. Chevron Back/Return Button
    if (mobileSearchBackBtn && !mobileSearchBackBtn.dataset.topbarBound) {
        mobileSearchBackBtn.dataset.topbarBound = 'true';
        mobileSearchBackBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeMobileSearch();
        });
    }

    // Legacy close btn support if present
    if (mobileSearchCloseBtn && !mobileSearchCloseBtn.dataset.topbarBound) {
        mobileSearchCloseBtn.dataset.topbarBound = 'true';
        mobileSearchCloseBtn.addEventListener('click', (e) => {
            e.preventDefault();
            closeMobileSearch();
        });
    }

    // Initialize backdrop if present in DOM
    ensureMobileSearchBackdrop();

    // 3. Magnifying Glass Enter Button
    if (mobileSearchSubmitBtn && !mobileSearchSubmitBtn.dataset.topbarBound) {
        mobileSearchSubmitBtn.dataset.topbarBound = 'true';
        mobileSearchSubmitBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const q = mobileSearchInput ? mobileSearchInput.value.trim() : '';
            if (q) {
                addSearchHistory(q);
                executeGlobalSearch(q);
            }
            closeMobileSearch();
        });
    }

    if (mobileSearchInput && !mobileSearchInput.dataset.topbarBound) {
        mobileSearchInput.dataset.topbarBound = 'true';
        mobileSearchInput.addEventListener('focus', () => {
            renderMobileSearchDropdown();
        });
        mobileSearchInput.addEventListener('click', () => {
            renderMobileSearchDropdown();
        });
        mobileSearchInput.addEventListener('input', () => {
            renderMobileSearchDropdown();
        });
        mobileSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const q = mobileSearchInput.value.trim();
                if (q) {
                    addSearchHistory(q);
                    executeGlobalSearch(q);
                }
                closeMobileSearch();
            } else if (e.key === 'Escape') {
                closeMobileSearch();
            }
        });
    }

    window.addEventListener('resize', alignMobileSearchBackdrop);
    window.addEventListener('scroll', alignMobileSearchBackdrop, true);
    window.addEventListener('orientationchange', () => {
        setTimeout(alignMobileSearchBackdrop, 120);
    });

    const mobileSidebarToggleBtn = document.getElementById('mobileSidebarToggleBtn');
    if (mobileSidebarToggleBtn && !mobileSidebarToggleBtn.dataset.topbarBound) {
        mobileSidebarToggleBtn.dataset.topbarBound = 'true';
        mobileSidebarToggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            document.getElementById('sidebarToggleBtn')?.click();
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 7. Mobile Full-Page Panel Controller (Abolishing Pull-Up Bottom Sheets)
    // ═══════════════════════════════════════════════════════════════════════════
    function syncMobileAnalyticsCards() {
        if (typeof window.renderMobileInsightCards === 'function') {
            window.renderMobileInsightCards();
            return;
        }
        const container = document.getElementById('analytics-dropdown-cards');
        if (!container) return;
        const source = document.getElementById('sigma-panels-container') || document.getElementById('mobile-sigma-cards');
        if (source && source.children.length > 0) {
            container.innerHTML = '';
            Array.from(source.children).forEach((card, idx) => {
                const clone = card.cloneNode(true);
                clone.classList.remove('cursor-grab', 'select-none');
                clone.dataset.id = card.dataset.id || `analytics-card-${idx}`;
                container.appendChild(clone);
            });
        } else if (typeof window.renderSigmaAnalytics === 'function') {
            window.renderSigmaAnalytics();
            const freshSource = document.getElementById('sigma-panels-container');
            if (freshSource && freshSource.children.length > 0) {
                container.innerHTML = '';
                Array.from(freshSource.children).forEach((card, idx) => {
                    const clone = card.cloneNode(true);
                    clone.classList.remove('cursor-grab', 'select-none');
                    clone.dataset.id = card.dataset.id || `analytics-card-${idx}`;
                    container.appendChild(clone);
                });
            }
        }
        if (!container.children.length) {
            container.innerHTML = '<div class="sigma-pending-content sigma-pending-content--compact" role="status" aria-label="Loading"><span class="sigma-dot-spinner" aria-hidden="true"></span></div>';
        }
    }

    function syncMobileScheduleCards() {
        const container = document.getElementById('schedule-dropdown-cards');
        if (!container) return;

        let classSlot = document.getElementById('mobile-schedule-class-slot');
        let tasksSlot = document.getElementById('mobile-schedule-tasks-slot');
        if (!classSlot || !tasksSlot) {
            container.innerHTML = '';
            classSlot = document.createElement('div');
            classSlot.id = 'mobile-schedule-class-slot';
            classSlot.className = 'home-dashboard-group';
            container.appendChild(classSlot);

            tasksSlot = document.createElement('div');
            tasksSlot.id = 'mobile-schedule-tasks-slot';
            tasksSlot.className = 'home-dashboard-group';
            container.appendChild(tasksSlot);
        }

        // 1. Invoke native portal dashboard panel renderers
        if (typeof window.renderStudentHomeDashboardPanels === 'function') {
            try { window.renderStudentHomeDashboardPanels(); } catch (e) { console.warn('[Mobile Schedule]', e); }
        } else if (typeof window.renderTeacherHomeDashboardPanels === 'function') {
            try { window.renderTeacherHomeDashboardPanels(); } catch (e) { console.warn('[Mobile Schedule]', e); }
        }

        // 2. Check if content was rendered into the slots
        const hasContent = (classSlot && classSlot.children.length > 0 && classSlot.innerText.trim().length > 0) ||
                           (tasksSlot && tasksSlot.children.length > 0 && tasksSlot.innerText.trim().length > 0);

        if (!hasContent) {
            // Check if desktop panels have content that can be cloned
            const source = document.querySelector('.home-dashboard-panels') || document.querySelector('.home-sticky-rail--right');
            const validSourceCards = source ? Array.from(source.querySelectorAll('.home-dashboard-card')).filter(c => c.innerText.trim().length > 0) : [];
            if (validSourceCards.length > 0) {
                container.innerHTML = '';
                validSourceCards.forEach(card => {
                    const clone = card.cloneNode(true);
                    clone.classList.remove('sticky', 'top-[106px]');
                    container.appendChild(clone);
                });
            } else {
                // Fallback styled cards
                container.innerHTML = `
                    <div class="home-dashboard-card home-dashboard-card--combined w-full">
                        <div class="home-dashboard-item">
                            <span class="home-dashboard-panel-title">
                                <i class="fa-solid fa-door-open"></i>Next Class
                            </span>
                            <p class="home-dashboard-empty-text">No Next Class</p>
                        </div>
                    </div>
                    <div class="home-dashboard-card home-dashboard-card--combined w-full">
                        <div class="home-dashboard-item">
                            <span class="home-dashboard-panel-title">
                                <i class="fa-solid fa-triangle-exclamation"></i>Due Submissions
                            </span>
                            <p class="home-dashboard-empty-text">No Due Submissions</p>
                        </div>
                        <div class="home-dashboard-item pt-3">
                            <span class="home-dashboard-panel-title">
                                <i class="fa-solid fa-calendar-days"></i>Upcoming Due
                            </span>
                            <p class="home-dashboard-empty-text">No Upcoming Due</p>
                        </div>
                    </div>
                `;
            }
        }
    }
    window.syncMobileScheduleCards = syncMobileScheduleCards;
    window.syncMobileAnalyticsCards = syncMobileAnalyticsCards;

    window.syncSidebarDrawerProfile = function () {
        const drawerAvatarImg = document.getElementById('mobile-sidebar-avatar-img');
        const drawerAvatarFallback = document.getElementById('mobile-sidebar-avatar-fallback');
        const drawerUserName = document.getElementById('mobile-sidebar-user-name');

        // 1. Sync Avatar Picture
        let avatarSrc = '';
        if (typeof window.getCurrentUserAvatar === 'function') {
            try { avatarSrc = window.getCurrentUserAvatar(); } catch (e) {}
        }
        if (!avatarSrc) {
            const candidates = [
                document.getElementById('header-avatar-img'),
                document.getElementById('sidebar-avatar-img'),
                document.getElementById('user-avatar-img'),
                document.querySelector('.header-avatar-img:not(#mobile-sidebar-avatar-img)')
            ];
            for (const img of candidates) {
                if (img && img.src && !img.classList.contains('hidden') && !img.src.endsWith('/') && !img.src.endsWith('#') && !img.src.includes('undefined')) {
                    avatarSrc = img.src;
                    break;
                }
            }
        }
        if (!avatarSrc) {
            try {
                const active = typeof getActiveUserData === 'function' ? getActiveUserData() : (window.currentUser || null);
                if (active) {
                    avatarSrc = active.avatar || active.profilePicture || active.photo || active.profileImage || '';
                }
            } catch (e) {}
        }
        if (!avatarSrc) {
            avatarSrc = localStorage.getItem('userAvatar') || localStorage.getItem('sigma_student_avatar_base64') || localStorage.getItem('sigma_teacher_avatar_base64') || '';
        }

        if (drawerAvatarImg && avatarSrc && typeof avatarSrc === 'string' && avatarSrc.trim() && avatarSrc !== 'null' && avatarSrc !== 'undefined') {
            drawerAvatarImg.src = avatarSrc.trim();
            drawerAvatarImg.classList.remove('hidden');
            if (drawerAvatarFallback) drawerAvatarFallback.classList.add('hidden');
        } else if (drawerAvatarImg && drawerAvatarFallback) {
            drawerAvatarImg.classList.add('hidden');
            drawerAvatarFallback.classList.remove('hidden');
        }

        // 2. Sync Name
        const firstName = document.getElementById('header-dropdown-firstName')?.textContent?.trim() || '';
        const lastName = document.getElementById('header-dropdown-lastName')?.textContent?.trim() || '';
        const welcomeName = document.getElementById('welcome-user-firstName')?.textContent?.trim() || '';
        const resolvedName = (firstName ? `${firstName} ${lastName}`.trim() : (welcomeName || 'Student'));
        if (drawerUserName && resolvedName) {
            drawerUserName.textContent = resolvedName;
        }
    };

    window.openMobileAccountPanel = function (e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        // 1. Close mobile sidebar
        if (typeof window.collapseSidebar === 'function') {
            window.collapseSidebar();
        } else {
            const sb = document.getElementById('sidebar');
            const ov = document.getElementById('sidebar-overlay');
            if (sb) sb.classList.remove('sidebar-visible');
            if (ov) ov.classList.add('hidden');
        }

        // 2. Close any open subbar panel
        window.closeMobileTopPanel();

        // 3. Open Account dropdown in fullscreen mode up to the green bar
        const profileDropdown = document.getElementById('profileDropdownMenu') || document.getElementById('profile-dropdown');
        if (!profileDropdown) return;
        document.body.classList.add('mobile-account-fullscreen');
        document.documentElement.classList.add('mobile-account-fullscreen');
        profileDropdown.classList.add('mobile-account-fullscreen');
        profileDropdown.classList.remove('hidden');

        // 4. Push history state so browser & phone back button closes this panel
        if (typeof window.pushModalHistoryState === 'function') {
            window.pushModalHistoryState('mobile-account-panel');
        }
    };

    window.closeMobileAccountPanel = function () {
        if (typeof window.forceHideTopNavLoading === 'function') {
            window.forceHideTopNavLoading();
        }
        const profileDropdown = document.getElementById('profileDropdownMenu') || document.getElementById('profile-dropdown');
        document.body.classList.remove('mobile-account-fullscreen');
        document.documentElement.classList.remove('mobile-account-fullscreen');
        if (profileDropdown) {
            profileDropdown.classList.remove('mobile-account-fullscreen');
            profileDropdown.classList.add('hidden');
        }
    };

    window.openMobileTopPanel = function (panelName) {
        const header = document.getElementById('student-header') || document.getElementById('teacher-header') || document.querySelector('header');
        if (!header) return;

        if (panelName === 'calendar') {
            const isCalendarMode = (typeof window.isActuallyCalendarPage === 'function')
                ? window.isActuallyCalendarPage()
                : (document.body.classList.contains('calendar-page-mode'));
            if (isCalendarMode) return;
        }

        // If fullscreen account panel is open, close it first
        window.closeMobileAccountPanel();

        const notiDropdown = document.getElementById('noti-dropdown');
        const calDropdown = document.getElementById('calendar-dropdown');
        const profileDropdown = document.getElementById('profileDropdownMenu') || document.getElementById('profile-dropdown');
        const sigmaAiPanel = document.getElementById('sigmaAiPanel');
        const analyticsDropdown = document.getElementById('analytics-dropdown');
        const scheduleDropdown = document.getElementById('schedule-dropdown');

        const panels = [
            { name: 'noti', el: notiDropdown },
            { name: 'calendar', el: calDropdown },
            { name: 'profile', el: profileDropdown },
            { name: 'sigma', el: sigmaAiPanel },
            { name: 'analytics', el: analyticsDropdown, btnId: 'mobile-subbar-analytics' },
            { name: 'schedule', el: scheduleDropdown, btnId: 'mobile-subbar-schedule' }
        ];

        // Panel button mapping
        const btnMap = {
            'noti': 'mobile-subbar-noti',
            'calendar': 'mobile-subbar-calendar',
            'profile': 'mobile-subbar-profile',
            'sigma': 'mobile-subbar-sigma',
            'analytics': 'mobile-subbar-analytics',
            'schedule': 'mobile-subbar-schedule'
        };

        // Ensure legacy pull up sheets are hidden
        document.querySelectorAll('.mobile-pull-up-panel, .mobile-sigma-sheet, .mobile-sigma-sheet-backdrop').forEach(p => {
            p.classList.remove('open');
            p.style.display = 'none';
        });

        document.body.classList.add('mobile-panel-open');
        document.documentElement.classList.add('mobile-panel-open');
        header.classList.add('mobile-panel-open');
        header.classList.remove('subbar-hidden');
        document.body.classList.remove('subbar-hidden');

        // Update active class on all subbar buttons
        document.querySelectorAll('.mobile-subbar-btn').forEach(btn => {
            btn.classList.remove('active', 'selected');
        });
        const activeBtn = document.getElementById(btnMap[panelName]);
        if (activeBtn) {
            activeBtn.classList.add('active', 'selected');
        }

        // Bell icon swap: fa-solid when notification is active, fa-regular otherwise
        const notiBtn = document.getElementById('mobile-subbar-noti');
        const notiIcon = notiBtn ? notiBtn.querySelector('.fa-bell') : null;
        if (notiIcon) {
            if (panelName === 'noti') {
                notiIcon.classList.remove('fa-regular');
                notiIcon.classList.add('fa-solid');
            } else {
                notiIcon.classList.remove('fa-solid');
                notiIcon.classList.add('fa-regular');
            }
        }

        // Schedule icon swap: fa-solid when schedule is active, fa-regular otherwise
        const schedBtn = document.getElementById('mobile-subbar-schedule');
        const schedIcon = schedBtn ? schedBtn.querySelector('.fa-calendar-check') : null;
        if (schedIcon) {
            if (panelName === 'schedule') {
                schedIcon.classList.remove('fa-regular');
                schedIcon.classList.add('fa-solid');
            } else {
                schedIcon.classList.remove('fa-solid');
                schedIcon.classList.add('fa-regular');
            }
        }

        const targetPanel = panels.find(p => p.name === panelName);
        if (targetPanel && targetPanel.el) {
            targetPanel.el.classList.remove('hidden');
            window.revisitActivePanel(panelName);
        }
        panels.forEach(p => {
            if (p !== targetPanel && p.el) {
                p.el.classList.add('hidden');
            }
        });

        header.dataset.activeMobilePanel = panelName;
    };

    window.closeMobileTopPanel = function () {
        const header = document.getElementById('student-header') || document.getElementById('teacher-header') || document.querySelector('header');
        document.body.classList.remove('mobile-panel-open');
        document.documentElement.classList.remove('mobile-panel-open');
        if (header) {
            header.classList.remove('mobile-panel-open');
            delete header.dataset.activeMobilePanel;
        }

        const isCalendarMode = (typeof window.isActuallyCalendarPage === 'function')
            ? window.isActuallyCalendarPage()
            : false;
        if (!isCalendarMode) {
            document.body.classList.remove('calendar-page-mode');
        }
        document.querySelectorAll('.mobile-subbar-btn').forEach(btn => {
            if (btn.id === 'mobile-subbar-calendar' && isCalendarMode) return;
            btn.classList.remove('active', 'selected');
        });

        // Restore bell icon to outline (fa-regular)
        const notiBtn = document.getElementById('mobile-subbar-noti');
        const notiIcon = notiBtn ? notiBtn.querySelector('.fa-bell') : null;
        if (notiIcon) {
            notiIcon.classList.remove('fa-solid');
            notiIcon.classList.add('fa-regular');
        }

        // Restore schedule icon to outline (fa-regular)
        const schedBtn = document.getElementById('mobile-subbar-schedule');
        const schedIcon = schedBtn ? schedBtn.querySelector('.fa-calendar-check') : null;
        if (schedIcon) {
            schedIcon.classList.remove('fa-solid');
            schedIcon.classList.add('fa-regular');
        }

        const notiDropdown = document.getElementById('noti-dropdown');
        const calDropdown = document.getElementById('calendar-dropdown');
        const profileDropdown = document.getElementById('profileDropdownMenu') || document.getElementById('profile-dropdown');
        const sigmaAiPanel = document.getElementById('sigmaAiPanel');
        const analyticsDropdown = document.getElementById('analytics-dropdown');
        const scheduleDropdown = document.getElementById('schedule-dropdown');

        [notiDropdown, calDropdown, profileDropdown, sigmaAiPanel, analyticsDropdown, scheduleDropdown].forEach(el => {
            if (el) el.classList.add('hidden');
        });
    };

    window.toggleMobilePanel = function (panelName) {
        const header = document.getElementById('student-header') || document.getElementById('teacher-header') || document.querySelector('header');
        if (header && header.classList.contains('mobile-panel-open') && header.dataset.activeMobilePanel === panelName) {
            // When already in mobile panel mode and tapping the same selected icon:
            // Revisit and reload the same thing without closing or unselecting!
            window.revisitActivePanel(panelName);
        } else {
            window.openMobileTopPanel(panelName);
        }
    };

    // Sub-Bar Buttons Binding
    const subbarNoti = document.getElementById('mobile-subbar-noti');
    const subbarCalendar = document.getElementById('mobile-subbar-calendar');
    const subbarAnalytics = document.getElementById('mobile-subbar-analytics');
    const subbarSigma = document.getElementById('mobile-subbar-sigma');
    const subbarProfile = document.getElementById('mobile-subbar-profile');
    const mobilePanelBackBtn = document.getElementById('mobile-panel-back-btn');

    const isMobileViewport = () => window.innerWidth <= 768;
    const mobilePanelViewport = window.matchMedia('(max-width: 768px)');
    const dismissResponsivePanels = () => {
        if (typeof window.closeMobileTopPanel === 'function') window.closeMobileTopPanel();
        if (typeof window.closeMobileAccountPanel === 'function') window.closeMobileAccountPanel();
        // Cleanly dismiss mobile search overlay, backdrop and dropdown
        const mobileSearchOverlay = document.getElementById('mobile-search-overlay');
        const mobileSearchBackdrop = document.getElementById('mobile-search-backdrop');
        if (mobileSearchOverlay) mobileSearchOverlay.classList.add('hidden');
        if (mobileSearchBackdrop) mobileSearchBackdrop.classList.add('hidden');
        hideMobileSearchDropdown();

        document.querySelectorAll('.mobile-pull-up-panel, .mobile-sigma-sheet, .mobile-sigma-sheet-backdrop')
            .forEach(panel => panel.classList.remove('open'));
        const isCalendarActive = (typeof window.isActuallyCalendarPage === 'function')
            ? window.isActuallyCalendarPage()
            : false;
        if (!isCalendarActive) {
            document.body.classList.remove('calendar-page-mode');
        }
        document.querySelectorAll('.header-icon-btn, .header-profile-btn, .mobile-subbar-btn')
            .forEach(button => {
                if ((button.id === 'calendar-toggle' || button.id === 'mobile-subbar-calendar') && isCalendarActive) return;
                button.classList.remove('active', 'selected');
            });
        const header = document.getElementById('student-header') || document.getElementById('teacher-header') || document.querySelector('header');
        header?.classList.remove('subbar-hidden');
        document.body.classList.remove('subbar-hidden');
        window.updateMobileAppBarActiveState?.();
    };
    mobilePanelViewport.addEventListener('change', dismissResponsivePanels);
    // DevTools can restore desktop width while a mobile panel or search overlay still owns the page.
    const dismissStaleMobilePanels = () => {
        if (mobilePanelViewport.matches) return;
        // Cleanly dismiss mobile search overlay, backdrop or dropdown upon returning to desktop viewport
        const mobileSearchOverlay = document.getElementById('mobile-search-overlay');
        const mobileSearchBackdrop = document.getElementById('mobile-search-backdrop');
        if (mobileSearchOverlay && !mobileSearchOverlay.classList.contains('hidden')) {
            mobileSearchOverlay.classList.add('hidden');
        }
        if (mobileSearchBackdrop && !mobileSearchBackdrop.classList.contains('hidden')) {
            mobileSearchBackdrop.classList.add('hidden');
        }
        hideMobileSearchDropdown();
        const mobileState = document.querySelector(
            '.mobile-panel-open, .mobile-account-fullscreen, .mobile-pull-up-panel.open, .mobile-sigma-sheet.open, .mobile-sigma-sheet-backdrop.open'
        );
        if (mobileState) dismissResponsivePanels();
    };
    window.addEventListener('resize', dismissStaleMobilePanels, { passive: true });
    window.addEventListener('pageshow', dismissStaleMobilePanels);
    dismissStaleMobilePanels();

    // Back button in mobile panel header (icon only)
    if (mobilePanelBackBtn && !mobilePanelBackBtn.dataset.topbarBound) {
        mobilePanelBackBtn.dataset.topbarBound = 'true';
        mobilePanelBackBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            window.closeMobileTopPanel();
        });
    }

    // Global delegation for back button
    document.addEventListener('click', (e) => {
        const backBtn = e.target.closest('#mobile-panel-back-btn, .mobile-panel-back-btn');
        if (backBtn) {
            e.preventDefault();
            e.stopPropagation();
            window.closeMobileTopPanel();
        }
    });

    if (subbarNoti && !subbarNoti.dataset.topbarBound) {
        subbarNoti.dataset.topbarBound = 'true';
        subbarNoti.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (isMobileViewport()) {
                window.toggleMobilePanel('noti');
            } else {
                document.getElementById('noti-toggle')?.click();
            }
        });
    }

    if (subbarCalendar && !subbarCalendar.dataset.topbarBound) {
        subbarCalendar.dataset.topbarBound = 'true';
        subbarCalendar.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const isCalendarMode = (typeof window.isActuallyCalendarPage === 'function')
                ? window.isActuallyCalendarPage()
                : (document.body.classList.contains('calendar-page-mode'));

            if (isCalendarMode) {
                if (calendarDropdown) calendarDropdown.classList.add('hidden');
                if (typeof window.closeMobileTopPanel === 'function') window.closeMobileTopPanel();
                subbarCalendar.classList.add('active', 'selected');
                return;
            }

            if (isMobileViewport()) {
                window.toggleMobilePanel('calendar');
            } else {
                document.getElementById('calendar-toggle')?.click();
            }
        });
    }

    if (subbarAnalytics && !subbarAnalytics.dataset.topbarBound) {
        subbarAnalytics.dataset.topbarBound = 'true';
        subbarAnalytics.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (isMobileViewport()) {
                window.toggleMobilePanel('analytics');
            } else {
                window.openMobileTopPanel('analytics');
            }
        });
    }

    if (subbarSigma && !subbarSigma.dataset.topbarBound) {
        subbarSigma.dataset.topbarBound = 'true';
        subbarSigma.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (isMobileViewport()) {
                window.toggleMobilePanel('sigma');
            } else {
                document.getElementById('sigma-toggle')?.click();
            }
        });
    }

    const subbarSchedule = document.getElementById('mobile-subbar-schedule') || document.getElementById('mobile-subbar-profile');
    if (subbarSchedule && !subbarSchedule.dataset.topbarBound) {
        subbarSchedule.dataset.topbarBound = 'true';
        subbarSchedule.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (isMobileViewport()) {
                window.toggleMobilePanel('schedule');
            } else {
                window.openMobileTopPanel('schedule');
            }
        });
    }

    // Sync mobile sidebar user profile on init
    if (typeof window.syncSidebarDrawerProfile === 'function') {
        window.syncSidebarDrawerProfile();
    }

    // Synchronize date and notification badges
    const desktopDate = document.getElementById('calendar-date-number');
    const subbarDate = document.getElementById('mobile-calendar-date-number');
    if (desktopDate && subbarDate) {
        subbarDate.textContent = desktopDate.textContent.trim() || new Date().getDate();
    }

    // Synchronize avatar picture with user profile
    const desktopAvatar = document.getElementById('header-avatar-img');
    const subbarAvatar = document.getElementById('mobile-header-avatar-img');
    const subbarAvatarPlaceholder = document.getElementById('mobile-header-avatar-placeholder');
    if (desktopAvatar && subbarAvatar) {
        if (desktopAvatar.src && !desktopAvatar.classList.contains('hidden')) {
            subbarAvatar.src = desktopAvatar.src;
            subbarAvatar.classList.remove('hidden');
            if (subbarAvatarPlaceholder) subbarAvatarPlaceholder.classList.add('hidden');
        } else {
            subbarAvatar.classList.add('hidden');
            if (subbarAvatarPlaceholder) subbarAvatarPlaceholder.classList.remove('hidden');
        }
    }

    // 8. Mobile Sub-Bar Scroll Detection (Hide on scroll down, show on scroll up)
    if (!window.__topbarScrollHandlerBound) {
        window.__topbarScrollHandlerBound = true;
        let lastScrollTop = 0;
        const scrollThreshold = 4;
        let ticking = false;

        function handleMobileSubbarScroll(e) {
            if (window.innerWidth > 768) return;
            if (document.body.classList.contains('mobile-panel-open')) return;

            let currentScroll = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
            if (e && e.target && e.target !== document && e.target !== document.documentElement && e.target !== document.body) {
                const target = e.target;
                if (target.id === 'layout-wrapper' || target.id === 'content-sections' || target.classList?.contains('main-dashboard-column')) {
                    currentScroll = target.scrollTop;
                }
            }

            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const header = document.getElementById('student-header') || document.getElementById('teacher-header') || document.querySelector('header');
                    if (!header) { ticking = false; return; }

                    // Don't auto-hide subbar if mobile panel is open
                    if (document.body.classList.contains('mobile-panel-open') || header.classList.contains('mobile-panel-open')) {
                        header.classList.remove('subbar-hidden');
                        document.body.classList.remove('subbar-hidden');
                        ticking = false;
                        return;
                    }

                    // Don't auto-hide subbar if search overlay is open or mobile sidebar is open
                    const searchOverlay = document.getElementById('mobile-search-overlay');
                    if (searchOverlay && !searchOverlay.classList.contains('hidden')) { 
                        header.classList.remove('subbar-hidden');
                        document.body.classList.remove('subbar-hidden');
                        ticking = false; 
                        return; 
                    }

                    // Near the top: always show the subbar
                    if (currentScroll <= 25) {
                        header.classList.remove('subbar-hidden');
                        document.body.classList.remove('subbar-hidden');
                        lastScrollTop = Math.max(0, currentScroll);
                        ticking = false;
                        return;
                    }

                    // Scroll Down -> Hide subbar
                    if (currentScroll > lastScrollTop + scrollThreshold) {
                        header.classList.add('subbar-hidden');
                        document.body.classList.add('subbar-hidden');
                    } 
                    // Scroll Up -> Show subbar
                    else if (currentScroll < lastScrollTop - scrollThreshold) {
                        header.classList.remove('subbar-hidden');
                        document.body.classList.remove('subbar-hidden');
                    }

                    lastScrollTop = Math.max(0, currentScroll);
                    ticking = false;
                });
                ticking = true;
            }
        }

        window.addEventListener('scroll', handleMobileSubbarScroll, { passive: true });
        document.addEventListener('scroll', handleMobileSubbarScroll, { passive: true, capture: true });
    }
}


// ═══════════════════════════════════════════════════════════════════════════
// 8. Universal Mobile Touch Scroll Lock Controller (Panels & Composer)
// ═══════════════════════════════════════════════════════════════════════════
(function initMobileScrollLock() {
    let touchStartY = 0;

    document.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches.length > 0) {
            touchStartY = e.touches[0].clientY;
        }
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
        const isLocked = document.body.classList.contains('mobile-panel-open') ||
                         document.documentElement.classList.contains('mobile-panel-open') ||
                         document.body.classList.contains('mobile-account-fullscreen') ||
                         document.documentElement.classList.contains('mobile-account-fullscreen') ||
                         document.body.classList.contains('sigma-composer-open') ||
                         document.documentElement.classList.contains('sigma-composer-open') ||
                         Boolean(document.getElementById('sigma-composer-modal-backdrop')?.classList.contains('active'));

        if (!isLocked) return;

        // Unblock description editor textarea completely for free touch scrolling
        if (e.target.closest('#sigma-composer-input-body, .sigma-composer-textarea')) {
            return;
        }

        // Find nearest scrollable container inside the active panel / modal
        const scrollable = e.target.closest(
            '#sigma-composer-input-body, .sigma-composer-textarea, ' +
            '#schedule-dropdown-cards, #analytics-dropdown-cards, #schedule-dropdown, #analytics-dropdown, ' +
            '#noti-dropdown .notif-scroll-area, #noti-dropdown, #calendar-dropdown, #sigmaAiMessages, #sigmaAiPanel, ' +
            '#profileDropdownMenu, .sigma-composer-modal, .sigma-composer-body, .sigma-composer-content, ' +
            '.sigma-composer-dropdown-menu, #sigma-composer-attachment-preview, .custom-scrollbar'
        );

        if (!scrollable) {
            // Touch is on fixed header, subbar, modal backdrop, buttons, or non-scrollable area: prevent main page drag
            if (e.cancelable) e.preventDefault();
            return;
        }

        const currentY = e.touches && e.touches.length > 0 ? e.touches[0].clientY : touchStartY;
        const isScrollingDown = currentY < touchStartY; // Dragging finger up -> scrolling downward
        const isScrollingUp = currentY > touchStartY;   // Dragging finger down -> scrolling upward

        const hasVerticalScroll = (scrollable.scrollHeight - scrollable.clientHeight) > 1;
        if (!hasVerticalScroll) {
            // Container doesn't have overflow/scrollable content: block dragging background
            if (e.cancelable) e.preventDefault();
            return;
        }

        const atTop = scrollable.scrollTop <= 0;
        const atBottom = scrollable.scrollTop + scrollable.clientHeight >= scrollable.scrollHeight - 1;

        if (isScrollingUp && atTop) {
            // At top boundary trying to scroll further up: prevent bounce dragging main page
            if (e.cancelable) e.preventDefault();
        } else if (isScrollingDown && atBottom) {
            // At bottom boundary trying to scroll further down: prevent bounce dragging main page
            if (e.cancelable) e.preventDefault();
        }
    }, { passive: false });
})();

if (document.readyState === 'loading') {
    if (typeof window.showTopNavLoading === 'function') window.showTopNavLoading();
    document.addEventListener('DOMContentLoaded', () => {
        initSharedTopbarInteractions();
        if (typeof window.hideTopNavLoading === 'function') window.hideTopNavLoading();
    });
    window.addEventListener('load', () => {
        if (typeof window.forceHideTopNavLoading === 'function') window.forceHideTopNavLoading();
    });
} else {
    initSharedTopbarInteractions();
}

// Automatically sync calendar page selection on browser Back/Forward (popstate & hashchange)
window.addEventListener('popstate', () => {
    window.syncCalendarPageActiveState?.();
}, true);

window.addEventListener('hashchange', () => {
    window.syncCalendarPageActiveState?.();
}, true);

// Global click delegation for any outside navigation / back button
document.addEventListener('click', (e) => {
    const target = e.target;
    if (!target) return;
    const isBackOrNav = target.closest?.(
        'button[id*="back"], button[class*="back"], a[id*="back"], a[class*="back"], ' +
        '#classroom-back-btn, #nav-context-back-btn, #topbar-back-btn, .gradebook-back-btn, ' +
        '#subject-back-btn, .nav-link, #sidebar a, #sidebar button'
    );
    if (isBackOrNav && !isBackOrNav.closest?.('#section-attendance')) {
        setTimeout(() => {
            window.syncCalendarPageActiveState?.();
        }, 0);
        setTimeout(() => {
            window.syncCalendarPageActiveState?.();
        }, 40);
    }
}, true);
