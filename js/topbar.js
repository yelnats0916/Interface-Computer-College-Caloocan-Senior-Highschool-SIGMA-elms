/**
 * SIGMA ELMS - Shared Topbar Interactivity Controller
 * Interface Computer College - Caloocan Senior High School ELMS
 * Unified navbar header, search, and dropdown controllers across Admin, Teacher, and Student portals.
 */

// ─── 0. Top-Nav Full Line Progress Bar Controller (Slim Line Style) ──────────
(function initTopNavLoadingController() {
    let activeLoadingCount = 0;
    let currentProgress = 0;
    let progressTimer = null;
    let finishTimer = null;

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
        setProgress(100);
        const bar = getOrCreateLoadingBar();
        if (bar) bar.classList.add('finishing');
        if (finishTimer) clearTimeout(finishTimer);
        finishTimer = setTimeout(() => {
            if (bar) {
                bar.classList.remove('active', 'finishing');
            }
            setTimeout(() => {
                setProgress(0);
            }, 250);
        }, 300);
    };

    // Track Real Network Requests (Fetch & XHR) - strictly when loading, no fake timers
    if (!window.__topNavNetworkInterceptorsBound) {
        window.__topNavNetworkInterceptorsBound = true;

        if (typeof window.fetch === 'function') {
            const originalFetch = window.fetch;
            window.fetch = function (...args) {
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
                this.__topNavTracked = true;
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
            brandTitle.classList.remove('cursor-pointer', 'pointer-events-auto');
            brandTitle.onclick = null;
            brandTitle.innerHTML = `
                <div class="breadcrumb-line-group">
                    <span class="breadcrumb-subject">${escapeText(parentText)}</span>
                    <span class="breadcrumb-topic">${escapeText(childText)}</span>
                </div>
            `;
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

window.hideHeaderOverlays = function (exceptMenu, exceptBtn) {
    // In mobile panel mode, dismissal is handled strictly via the panel back button
    if (document.body.classList.contains('mobile-panel-open')) return;

    document.querySelectorAll('.header-panel, #calendar-dropdown, #noti-dropdown, #profile-dropdown, #profileDropdownMenu, #sigmaAiPanel').forEach(p => {
        if (p !== exceptMenu) p.classList.add('hidden');
    });
    document.querySelectorAll('.header-icon-btn, .header-profile-btn, #calendar-toggle, #noti-toggle, #profile-toggle, #profileDropdownBtn, #sigma-toggle').forEach(b => {
        if (b !== exceptBtn) b.classList.remove('active');
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
    if (calendarToggle && calendarDropdown && !calendarToggle.dataset.topbarBound) {
        calendarToggle.dataset.topbarBound = 'true';
        calendarToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const isOpen = !calendarDropdown.classList.contains('hidden') && calendarToggle.classList.contains('active');
            if (isOpen) {
                // Desktop toggle dismissal: clicking active icon closes panel
                calendarDropdown.classList.add('hidden');
                calendarToggle.classList.remove('active');
            } else {
                window.hideHeaderOverlays(calendarDropdown, calendarToggle);
                calendarDropdown.classList.remove('hidden');
                calendarToggle.classList.add('active');
                window.revisitActivePanel('calendar');
            }
        });
        calendarDropdown.addEventListener('click', (e) => e.stopPropagation());
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
        document.addEventListener('click', (e) => {
            if (document.body.classList.contains('mobile-panel-open')) return;
            const isClickInside = e.target.closest('.header-panel, #calendar-dropdown, #noti-dropdown, #profile-dropdown, #profileDropdownMenu, #sigmaAiPanel, .header-icon-btn, .header-profile-btn, #calendar-toggle, #noti-toggle, #profile-toggle, #profileDropdownBtn, #sigma-toggle');
            if (!isClickInside) {
                window.hideHeaderOverlays();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                window.hideHeaderOverlays();
            }
        });
    }

    // Global Search Key Handler
    const searchBar = document.getElementById('searchBar');
    const globalSearchBtn = document.getElementById('globalSearchBtn');

    if (searchBar && !searchBar.dataset.searchBound) {
        searchBar.dataset.searchBound = 'true';
        searchBar.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                executeGlobalSearch(searchBar.value.trim());
            }
        });
    }

    if (globalSearchBtn && searchBar && !globalSearchBtn.dataset.searchBound) {
        globalSearchBtn.dataset.searchBound = 'true';
        globalSearchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            executeGlobalSearch(searchBar.value.trim());
        });
    }

    function executeGlobalSearch(query) {
        if (!query) return;
        console.log(`[SIGMA Search] Executing search for: ${query}`);
        window.dispatchEvent(new CustomEvent('sigma:search', { detail: { query } }));
    }

    // 6. Mobile Search Toggle & Overlay
    const mobileSearchToggleBtn = document.getElementById('mobileSearchToggleBtn');
    const mobileSearchOverlay = document.getElementById('mobile-search-overlay');
    const mobileSearchBackdrop = document.getElementById('mobile-search-backdrop');
    const mobileSearchBackBtn = document.getElementById('mobileSearchBackBtn');
    const mobileSearchCloseBtn = document.getElementById('mobileSearchCloseBtn');
    const mobileSearchSubmitBtn = document.getElementById('mobileSearchSubmitBtn');
    const mobileSearchInput = document.getElementById('mobileSearchInput');

    function openMobileSearch() {
        if (mobileSearchOverlay) mobileSearchOverlay.classList.remove('hidden');
        if (mobileSearchBackdrop) mobileSearchBackdrop.classList.remove('hidden');
        if (mobileSearchInput) {
            mobileSearchInput.focus();
        }
    }

    function closeMobileSearch() {
        if (mobileSearchOverlay) mobileSearchOverlay.classList.add('hidden');
        if (mobileSearchBackdrop) mobileSearchBackdrop.classList.add('hidden');
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

    // 2. Dim Light Backdrop (Touching outside returns to page)
    if (mobileSearchBackdrop && !mobileSearchBackdrop.dataset.topbarBound) {
        mobileSearchBackdrop.dataset.topbarBound = 'true';
        mobileSearchBackdrop.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeMobileSearch();
        });
        mobileSearchBackdrop.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeMobileSearch();
        }, { passive: false });
    }

    // 3. Magnifying Glass Enter Button
    if (mobileSearchSubmitBtn && !mobileSearchSubmitBtn.dataset.topbarBound) {
        mobileSearchSubmitBtn.dataset.topbarBound = 'true';
        mobileSearchSubmitBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const q = mobileSearchInput ? mobileSearchInput.value.trim() : '';
            if (q) executeGlobalSearch(q);
            closeMobileSearch();
        });
    }

    if (mobileSearchInput && !mobileSearchInput.dataset.topbarBound) {
        mobileSearchInput.dataset.topbarBound = 'true';
        mobileSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                executeGlobalSearch(mobileSearchInput.value.trim());
                closeMobileSearch();
            } else if (e.key === 'Escape') {
                closeMobileSearch();
            }
        });
    }

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
            container.innerHTML = `
                <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p class="text-xs font-black text-emerald-700 uppercase tracking-widest mb-1">Academic Status</p>
                    <p class="text-sm font-bold text-slate-800">1st Quarter GWA: 94.25</p>
                    <p class="text-[11px] text-slate-500 mt-1">Excellent performance. Keep it up!</p>
                </div>
                <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p class="text-xs font-black text-yellow-600 uppercase tracking-widest mb-1">Attendance Rate</p>
                    <p class="text-sm font-bold text-slate-800">98.5% Attendance</p>
                    <p class="text-[11px] text-slate-500 mt-1">Zero unexcused absences recorded.</p>
                </div>
            `;
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

        // Clear active/selected classes on all subbar buttons
        document.querySelectorAll('.mobile-subbar-btn').forEach(btn => {
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
    mobilePanelViewport.addEventListener('change', () => {
        window.closeMobileTopPanel();
        window.closeMobileAccountPanel();
        document.querySelectorAll('.mobile-pull-up-panel, .mobile-sigma-sheet, .mobile-sigma-sheet-backdrop')
            .forEach(panel => panel.classList.remove('open'));
        document.querySelectorAll('.header-icon-btn, .header-profile-btn, .mobile-subbar-btn')
            .forEach(button => button.classList.remove('active', 'selected'));
        const header = document.getElementById('student-header') || document.getElementById('teacher-header') || document.querySelector('header');
        header?.classList.remove('subbar-hidden');
        document.body.classList.remove('subbar-hidden');
        window.updateMobileAppBarActiveState?.();
    });

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

