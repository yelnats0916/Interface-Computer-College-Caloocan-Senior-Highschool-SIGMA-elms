<?php
/**
 * SIGMA ELMS - Unified Portal Topbar Component
 * Shared across Admin, Teacher, and Student portals (Locked at exact 82px height).
 */
$topbarHeaderId = $topbarHeaderId ?? 'admin-header';
?>
<header id="<?= htmlspecialchars($topbarHeaderId) ?>" class="admin-topbar admin-global-header portal-global-header shrink-0 z-[250] fixed top-0 left-0 right-0 flex flex-col standard-panel-shadow">
    <!-- ═══ 1. GREEN SCHOOL YEAR STRIP (Height: 26px) ════════════════════════ -->
    <nav class="top-nav justify-between shrink-0">
        <div class="flex items-center gap-3">
            <span id="global-sy-display" class="text-white uppercase tracking-[0.2em] text-[10px] font-medium">
                <?= CURRENT_SCHOOL_YEAR ?>
            </span>
        </div>
        <div id="global-lang-btn" class="flex items-center gap-2 pr-4 cursor-pointer">
            <i class="fa-solid fa-globe text-[10px] text-white/50"></i>
            <span class="text-white text-[10px] font-medium">English (en)</span>
        </div>
        <div id="top-nav-loading-bar" class="top-nav-loading-bar" role="progressbar" aria-label="Loading indicator" aria-hidden="true"></div>
    </nav>

    <div class="admin-topbar__inner">
        <!-- Brand & Sidebar Toggle -->
        <div class="admin-topbar__brand">
            <button id="sidebarToggleBtn" type="button" aria-label="Toggle sidebar"
                class="w-[38px] h-[38px] rounded-full hover:bg-slate-100 focus:outline-none flex items-center justify-center no-underline transition-colors cursor-pointer">
                <i class="fa-solid fa-bars text-[17px] text-black"></i>
            </button>
            <div id="logo-container">
                <button id="nav-logo-btn" title="Go to Dashboard" onclick="if(typeof window.switchTab==='function') window.switchTab('nav-dashboard');">
                    <img src="../image/ICC logo.jpg" alt="ICC Logo">
                </button>
            </div>
            <div class="admin-topbar__brand-copy">
                <p id="nav-context-text" class="admin-topbar__brand-label text-black"><?= SCHOOL_NAME ?></p>
            </div>
        </div>

        <!-- Center Search Bar (Shared Length) -->
        <div class="header-search-container absolute left-1/2 -translate-x-1/2 w-full max-w-[480px] md:block z-[101]">
            <div
                class="header-search-shell relative flex items-center group bg-white border border-slate-300 rounded-full focus-within:border-[#FFD000] focus-within:bg-white hover:bg-white focus-within:ring-0 focus-within:outline-none focus-within:shadow-none transition-all overflow-hidden">
                <span
                    class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none opacity-0 group-focus-within:opacity-100 transition-opacity duration-300">
                    <i class="fa-solid fa-magnifying-glass text-black text-sm"></i>
                </span>
                <input id="searchBar" type="text" placeholder="Search" aria-label="Global search" maxlength="100" autocomplete="off"
                    class="block w-full h-[38px] pl-5 pr-4 bg-transparent border-0 text-[14.5px] placeholder-black-fade focus:outline-none focus:ring-0 focus:ring-offset-0 focus:shadow-none transition-all group-focus-within:pl-10 font-medium text-black font-['Inter']"
                    onkeydown="if(event.key==='Enter'){}">
                <button id="globalSearchBtn" type="button" aria-label="Search"
                    class="header-search-enter w-[72px] h-[38px] flex items-center justify-center border-l border-black/10 bg-black/[0.035] hover:bg-black/[0.08] transition-all flex-shrink-0 cursor-pointer text-black">
                    <i class="fa-solid fa-arrow-turn-down text-[10px] transform rotate-[-90deg] scale-y-[-1] text-black"></i>
                </button>
            </div>
        </div>

        <div class="flex-grow pl-8">
            <h1 id="main-content-header" class="text-xl font-black text-slate-900 tracking-tight uppercase"></h1>
        </div>

        <!-- Mobile Action Group: Search + Burger to the right of search -->
        <div class="admin-topbar__mobile-actions">
            <button id="mobileSearchToggleBtn" type="button" class="mobile-search-toggle-btn" aria-label="Search" title="Search">
                <i class="fa-solid fa-magnifying-glass text-black text-sm"></i>
            </button>
            <button id="mobileSidebarToggleBtn" type="button" class="mobile-sidebar-toggle-btn" aria-label="Toggle sidebar" title="Menu">
                <i class="fa-solid fa-bars text-[17px] text-black"></i>
            </button>
        </div>

        <!-- Right Side Action Icons -->
        <div class="admin-topbar__desktop-icons flex items-center gap-2 pr-4">
            <!-- SIGMA AI Toggle Button -->
            <div class="relative">
                <button id="sigma-toggle" type="button" title="SIGMA AI"
                    class="header-icon-btn relative w-[38px] h-[38px] rounded-full bg-slate-100 hover:bg-slate-200 focus:outline-none group flex items-center justify-center transition-colors no-underline cursor-pointer">
                    <i class="fa-solid fa-bolt text-black text-sm transition-transform group-hover:scale-110"></i>
                </button>
            </div>

            <!-- Calendar Toggle Button -->
            <div class="relative">
                <button id="calendar-toggle" type="button" title="Calendar"
                    class="header-icon-btn relative w-[38px] h-[38px] rounded-full bg-slate-100 hover:bg-slate-200 focus:outline-none group flex items-center justify-center transition-colors no-underline cursor-pointer">
                    <div class="relative flex items-center justify-center pointer-events-none">
                        <i class="fa-solid fa-calendar text-[22px] text-black transition-colors"></i>
                        <span id="calendar-date-number"
                            class="absolute pt-[5px] text-[9px] font-black text-white leading-none transition-colors"><?= date('j') ?></span>
                    </div>
                </button>
            </div>

            <!-- Notifications Toggle Button -->
            <div class="relative">
                <button id="noti-toggle" type="button" title="Notifications"
                    class="header-icon-btn relative w-[38px] h-[38px] rounded-full bg-slate-100 hover:bg-slate-200 focus:outline-none group flex items-center justify-center transition-colors no-underline cursor-pointer">
                    <i class="fa-solid fa-bell text-[21px] text-black transition-colors"></i>
                    <span id="noti-badge"
                        class="absolute top-2 right-2 w-2 h-2 bg-[#FFD000] rounded-full border-2 border-white pointer-events-none"></span>
                </button>
            </div>

            <!-- Profile Dropdown Toggle Button -->
            <div class="relative">
                <button id="profileDropdownBtn" type="button" title="User Profile"
                    class="header-profile-btn relative w-[38px] h-[38px] rounded-full bg-slate-100 hover:bg-slate-200 focus:outline-none group flex items-center justify-center text-black text-base font-bold no-underline transition-colors cursor-pointer">
                    <div class="absolute inset-0 rounded-full overflow-hidden flex items-center justify-center">
                        <img id="header-avatar-img" src="<?= !empty($_SESSION['avatar']) ? htmlspecialchars($_SESSION['avatar']) : '' ?>" alt="Avatar"
                            class="absolute inset-0 w-full h-full object-cover <?= !empty($_SESSION['avatar']) ? '' : 'hidden' ?>">
                        <i id="header-avatar-placeholder" class="fa-solid fa-user text-sm text-[#94a3b8] <?= !empty($_SESSION['avatar']) ? 'hidden' : '' ?>"></i>
                    </div>
                    <div class="absolute bottom-[-2px] right-[-2px] w-4.5 h-4.5 bg-white rounded-full border border-slate-200 shadow-sm flex items-center justify-center z-10">
                        <i class="header-profile-btn__chevron fa-solid fa-chevron-down text-[10px] font-bold text-black transition-colors"></i>
                    </div>
                </button>
            </div>
        </div>

        <!-- Mobile Search Overlay -->
        <div id="mobile-search-overlay" class="mobile-search-overlay hidden">
            <i class="fa-solid fa-magnifying-glass text-slate-400 text-sm ml-2"></i>
            <input id="mobileSearchInput" type="text" placeholder="Search announcements, subjects..." autocomplete="off" class="mobile-search-overlay__input">
            <button type="button" id="mobileSearchCloseBtn" class="mobile-search-overlay__close" aria-label="Close search">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>
    </div>

    <!-- Mobile Sub-Bar: Notification, Calendar, Sigma Analytics, AI Sigma, Profile -->
    <div id="mobile-header-subbar" class="mobile-header-subbar">
        <!-- 1. Notification (Abstract line icon) -->
        <button type="button" id="mobile-subbar-noti" class="mobile-subbar-btn" aria-label="Notifications" title="Notifications">
            <i class="fa-regular fa-bell text-[18px]"></i>
            <span id="mobile-noti-badge" class="mobile-subbar-badge hidden"></span>
        </button>

        <!-- 2. Calendar (Date display kept as is) -->
        <button type="button" id="mobile-subbar-calendar" class="mobile-subbar-btn" aria-label="Calendar" title="Calendar">
            <div class="mobile-subbar-calendar-icon">
                <i class="fa-solid fa-calendar text-[19px]"></i>
                <span id="mobile-calendar-date-number" class="mobile-subbar-date-number"><?= date('j') ?></span>
            </div>
        </button>

        <!-- 3. SIGMA Analytics (Abstract line chart icon) -->
        <button type="button" id="mobile-subbar-analytics" class="mobile-subbar-btn" aria-label="SIGMA Analytics" title="SIGMA Analytics">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
            </svg>
        </button>

        <!-- 4. AI SIGMA Chat (Abstract line bolt icon - for sigma panel chat) -->
        <button type="button" id="mobile-subbar-sigma" class="mobile-subbar-btn" aria-label="SIGMA AI Chat" title="SIGMA AI Chat">
            <svg class="mobile-subbar-icon-bolt" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
        </button>

        <!-- 5. Profile (Icon only, abstract unshaded, black fade) -->
        <button type="button" id="mobile-subbar-profile" class="mobile-subbar-btn" aria-label="Profile" title="Profile">
            <i class="fa-regular fa-user text-[18px]"></i>
        </button>
    </div>
</header>

<!-- ═══ 3. SHARED SLIDE-OUT PANELS (400px Drawer) ═══════════════════════════ -->

<!-- Calendar Dropdown -->
<div id="calendar-dropdown"
    class="header-panel hidden fixed right-0 top-[82px] h-[calc(100vh-82px)] w-[400px] bg-white border-l border-slate-200 flex flex-col z-[300] rounded-l-[24px] overflow-y-auto custom-scrollbar font-['Inter']">
    <!-- Top Title Bar (Identical to Notifications) -->
    <div class="calendar-header mobile-panel-header">
        <div class="mobile-panel-header-left">
            <button type="button" class="mobile-panel-header-back-btn" onclick="window.closeMobileTopPanel()" aria-label="Back">
                <i class="fa-solid fa-chevron-left"></i>
            </button>
            <h3 class="calendar-header__title mobile-panel-title">Calendar</h3>
        </div>
    </div>

    <!-- Month Navigation & Calendar Grid -->
    <div class="px-8 py-6 bg-white flex-shrink-0">
        <div class="calendar-month-nav flex items-center justify-center mb-5 gap-2 relative">
            <h3 id="calendarDropdownMonthYear"
                class="text-[16px] font-bold text-black leading-none tracking-tight text-center font-['Inter'] select-none">August 2026</h3>
            <button type="button" id="calendarDropdownMonthPickerBtn" class="relative flex items-center justify-center p-1 rounded-md hover:bg-slate-100 text-[#15803d] hover:text-[#166534] transition-all cursor-pointer" onclick="window.openCalendarNativeMonthPicker?.(event)" title="Select Date / Month">
                <i class="fa-regular fa-calendar text-base text-[#15803d]"></i>
                <input type="month" id="calendar-dropdown-native-picker" class="absolute inset-0 w-full h-full opacity-0 pointer-events-none z-[-1]" onchange="window.onCalendarNativeMonthPicked?.(this.value)" />
            </button>
        </div>
        <div class="grid grid-cols-7 gap-1 text-center border-t border-slate-100 pt-4 mb-2">
            <div class="calendar-weekday-header">Sun</div>
            <div class="calendar-weekday-header">Mon</div>
            <div class="calendar-weekday-header">Tue</div>
            <div class="calendar-weekday-header">Wed</div>
            <div class="calendar-weekday-header">Thu</div>
            <div class="calendar-weekday-header">Fri</div>
            <div class="calendar-weekday-header">Sat</div>
        </div>
        <div id="calendarDropdownDaysGrid" class="grid grid-cols-7 gap-1 text-center">
            <!-- Populated by js/calendar.js -->
        </div>

        <!-- View Calendar Link -->
        <div class="mt-6 mb-2 flex justify-center">
            <a href="#" class="view-calendar-anchor" aria-label="View Calendar">
                View Calendar →
            </a>
        </div>
    </div>

    <!-- Bottom Division Line -->
    <div class="border-t border-gray-100 w-full mt-auto"></div>
</div>

<!-- Notifications Dropdown -->
<div id="noti-dropdown"
    class="header-panel hidden fixed right-0 top-[82px] h-[calc(100vh-82px)] w-[400px] bg-white border-l border-slate-200 flex flex-col z-[300] rounded-l-[24px] overflow-hidden font-['Inter']">
    <!-- Top Title Bar -->
    <div class="notif-header mobile-panel-header">
        <div class="mobile-panel-header-left">
            <button type="button" class="mobile-panel-header-back-btn" onclick="window.closeMobileTopPanel()" aria-label="Back">
                <i class="fa-solid fa-chevron-left"></i>
            </button>
            <h3 class="notif-header__title mobile-panel-title">Notifications</h3>
        </div>
        <button type="button" id="notiMarkAllReadBtn" class="notif-header__mark-all">Mark all as read</button>
    </div>

    <!-- Filter Tabs: All, Unread + See all -->
    <div class="notif-tabs-bar">
        <div class="notif-tabs-group">
            <button type="button" id="noti-tab-all" class="notif-tab-btn active">All</button>
            <button type="button" id="noti-tab-unread" class="notif-tab-btn">Unread</button>
        </div>
        <a href="#" class="notif-see-all-btn" onclick="event.preventDefault()">See all</a>
    </div>

    <!-- Scrollable Notifications Area -->
    <div class="notif-scroll-area custom-scrollbar">
        <div id="noti-dropdown-feed">
            <!-- Injected by js/notifications.js -->
        </div>
    </div>

    <!-- Previous Notifications Button (shows if > 5 notifications) -->
    <div id="noti-prev-wrapper" class="notif-prev-btn-wrapper" style="display: none;">
        <button type="button" id="notiPrevNotificationsBtn" class="notif-prev-btn">
            <span>Previous Notifications</span>
            <i class="fa-solid fa-chevron-down text-[10px]"></i>
        </button>
    </div>
</div>

<!-- Profile Dropdown Menu -->
<div id="profileDropdownMenu"
    class="header-panel hidden fixed right-0 top-[82px] h-[calc(100vh-82px)] w-[400px] bg-white border-l border-slate-200 flex flex-col z-[300] rounded-l-[24px] overflow-hidden font-['Inter']">

    <!-- Mobile Header with Back Button -->
    <div class="mobile-profile-header mobile-panel-header hidden">
        <div class="mobile-panel-header-left">
            <button type="button" class="mobile-panel-header-back-btn" onclick="window.closeMobileTopPanel()" aria-label="Back">
                <i class="fa-solid fa-chevron-left"></i>
            </button>
            <h3 class="mobile-panel-title">Account</h3>
        </div>
    </div>

    <!-- ── Hero: Avatar + Name + ID ── -->
    <div class="profile-panel-hero" onclick="window.navigateToUserProfile(event)" title="View Profile" role="button" tabindex="0">
        <div class="profile-panel-avatar-wrap">
            <img id="sidebar-avatar-img" src="" alt="Avatar" class="hidden">
            <i id="sidebar-avatar-placeholder" class="fa-solid fa-user"></i>
        </div>
        <div style="text-align:center;">
            <h3 class="profile-panel-name">
                <span id="header-dropdown-firstName"><?= htmlspecialchars($_SESSION['first_name'] ?? 'Firstname') ?></span>
                <span id="header-dropdown-lastName"><?= htmlspecialchars($_SESSION['last_name'] ?? 'Lastname') ?></span>
            </h3>
            <p class="profile-panel-account-id" id="header-dropdown-accountId">ID: <?= htmlspecialchars($_SESSION['account_id'] ?? '—') ?></p>
        </div>
        <span class="profile-panel-role-badge">
            <?= htmlspecialchars(ucfirst($_SESSION['role'] ?? 'User')) ?>
        </span>
    </div>

    <!-- ── Menu ── -->
    <nav class="profile-panel-menu">
        <?php if (isset($topbarHeaderId) && $topbarHeaderId === 'student-header'): ?>
        <a href="#" id="profile-achievements-link"
            onclick="if(typeof window.navigateToUserProfile==='function'){ window.navigateToUserProfile(event, 'achievements'); } if(typeof window.hideHeaderOverlays==='function') window.hideHeaderOverlays();"
            class="profile-menu-item">
            <div class="profile-menu-item__icon">
                <i class="fa-solid fa-trophy"></i>
            </div>
            <div class="profile-menu-item__text">
                <span class="profile-menu-item__label">Achievements</span>
                <span class="profile-menu-item__sublabel">Your badges & milestones</span>
            </div>
        </a>
        <?php endif; ?>
        <a href="#account-settings" id="profile-settings-link"
            onclick="if(typeof window.navigateToAccountSettings==='function'){ window.navigateToAccountSettings('notifications'); } else if(typeof switchTab==='function'){ switchTab('account-settings'); } if(typeof window.hideHeaderOverlays==='function') window.hideHeaderOverlays(); return false;"
            class="profile-menu-item">
            <div class="profile-menu-item__icon">
                <i class="fa-solid fa-user-gear"></i>
            </div>
            <div class="profile-menu-item__text">
                <span class="profile-menu-item__label">Account Settings</span>
                <span class="profile-menu-item__sublabel">Notifications &amp; preferences</span>
            </div>
        </a>
        <a href="index.php" class="profile-menu-item profile-logout-btn" onclick="if(window.SigmaPresenceTracker && typeof window.SigmaPresenceTracker.logout==='function'){window.SigmaPresenceTracker.logout();}else{sessionStorage.clear();}">
            <div class="profile-menu-item__icon">
                <i class="fa-solid fa-right-from-bracket"></i>
            </div>
            <div class="profile-menu-item__text">
                <span class="profile-menu-item__label">Logout</span>
            </div>
        </a>
    </nav>
</div>

<!-- SIGMA AI Dropdown Panel (Shared across Admin, Teacher, Student) -->
<div id="sigmaAiPanel"
    class="header-panel hidden fixed right-0 top-[82px] h-[calc(100vh-82px)] w-[400px] bg-white border-l border-slate-200 flex flex-col z-[300] rounded-l-[24px] overflow-hidden font-['Inter']">
    <div class="mobile-panel-header sigma-ai-header">
        <div class="mobile-panel-header-left">
            <button type="button" class="mobile-panel-header-back-btn" onclick="window.closeMobileTopPanel()" aria-label="Back">
                <i class="fa-solid fa-chevron-left"></i>
            </button>
            <div class="flex items-center gap-2">
                <div class="sigma-ai-badge">
                    <i class="fa-solid fa-bolt"></i>
                </div>
                <h3 class="sigma-ai-title mobile-panel-title">SIGMA</h3>
            </div>
        </div>
    </div>
    <div id="sigmaAiMessages" class="flex-1 p-5 overflow-y-auto space-y-4 bg-gray-50/50"></div>
    <div class="p-4 bg-white border-t border-gray-100 flex-shrink-0">
        <div id="sigmaAiComposer" class="sigma-ai-composer">
            <div class="sigma-ai-composer__field">
                <textarea id="sigmaAiInput" aria-label="Ask SIGMA AI assistant" placeholder="Ask..." class="sigma-ai-composer__input"
                    rows="1"></textarea>
            </div>
            <button id="sigmaAiSendBtn" type="button" class="sigma-ai-send-btn" aria-label="Send message">
                <i class="fa-solid fa-arrow-up sigma-ai-send-icon"></i>
                <span class="sigma-ai-send-spinner" aria-hidden="true"></span>
            </button>
        </div>
    </div>
</div>

<!-- SIGMA Analytics Dropdown Panel -->
<div id="analytics-dropdown"
    class="header-panel hidden fixed right-0 top-[82px] h-[calc(100vh-82px)] w-[400px] bg-white border-l border-slate-200 flex flex-col z-[300] rounded-l-[24px] overflow-hidden font-['Inter']">
    <div class="notif-header mobile-panel-header">
        <div class="mobile-panel-header-left">
            <button type="button" class="mobile-panel-header-back-btn" onclick="window.closeMobileTopPanel()" aria-label="Back">
                <i class="fa-solid fa-chevron-left"></i>
            </button>
            <h3 class="notif-header__title mobile-panel-title">SIGMA Analytics</h3>
        </div>
    </div>
    <div id="analytics-dropdown-cards" class="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar">
        <!-- Injected via syncAnalyticsCards() -->
    </div>
</div>

