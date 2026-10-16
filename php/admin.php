<?php
/**
 * SIGMA ELMS - Administrator Portal Dashboard
 * Interface Computer College - Caloocan Senior High School ELMS
 */

$pageTitle = "Interface Computer College - Admin";
$extraCss  = ["css/admin.css", "css/settings-view.css", "css/ai-log-details.css", "css/service-vault-security.css"];
$bodyClass = "bg-admin-bg min-h-screen font-['Inter'] flex flex-col sidebar-collapsed text-slate-700";
$extraHead = '<link rel="stylesheet" href="css/classroom-room.css"><script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js"></script>';
$extraJs   = ["js/time-picker-dial.js", "js/classroom-room.js", "js/recaptcha-client.js", "js/system-settings-history.js", "js/ai-routing-settings.js", "js/notification-logs.js", "js/authentication-logs.js", "js/activity-logs.js", "js/audit-log-search.js", "js/admin.js", "js/admin-insight-report.js"];
$topbarHeaderId = "admin-header";

require_once __DIR__ . "/../config/app.php";
require_once __DIR__ . "/includes/header.php";
require_once __DIR__ . "/includes/topbar.php";
?>

    <!-- ═══ REUSABLE ADMIN SIDEBAR ═══════════════════════════════ -->
    <?php require_once __DIR__ . "/includes/sidebar_admin.php"; ?>

    <!-- Mobile Sidebar Overlay -->
    <div id="sidebar-overlay"
        class="fixed left-0 right-0 bottom-0 bg-black/40 z-[200] hidden transition-opacity duration-300 lg:hidden"
        style="top: var(--shell-offset)"></div>

    <!-- SUB-SIDEBAR FLYOUT (shared controller) -->
    <aside id="sub-sidebar" class="fixed z-[10500] hidden">
        <div id="sub-sidebar-header"
            class="px-4 py-4 border-b border-gray-100 bg-white flex items-center min-h-[60px] hidden">
            <h3 id="sub-sidebar-title" class="font-black text-gray-900 text-[15px] leading-tight truncate w-full">
                Menu
            </h3>
        </div>
        <div id="sub-sidebar-content" class="flex-1 overflow-y-auto p-2 space-y-1"></div>
    </aside>

    <!-- MAIN WRAPPER (Shifted for Fixed Sidebar) -->
    <div id="layout-wrapper" class="flex-1 flex flex-col min-h-screen">
        <!-- DASHBOARD CONTENT -->
        <main id="admin-main" class="flex-1 bg-admin-bg relative">
            <?php require_once __DIR__ . "/includes/user_profile_view.php"; ?>
            <section id="user-settings-view" class="dynamic-section hidden" data-shared-settings-view></section>

            <section id="dashboard-view" class="dynamic-section hidden">
                <!-- Dashboard Workspace -->
                <div class="dashboard-grid">
                    <!-- 1. Left Section (3/12) - Sticky Metrics Rail -->
                    <div class="lg:col-span-3 mt-2 home-sticky-rail home-sticky-rail--left">
                        <div id="dashboard-metrics-container"
                            class="max-h-[calc(100vh-106px)] overflow-y-auto pr-2">
                            <!-- Dynamic live templates rendered via pocket-card.js -->
                        </div>
                    </div>
                    <!-- End home-sticky-rail--left -->

                    <!-- 2. Middle Section (6/12) -->
                    <div class="lg:col-span-6 space-y-3.5 mt-2 main-dashboard-column">
                        <?php
                        $welcomeRole = 'admin';
                        $welcomeImgId = 'welcome-panel-admin-img';
                        require __DIR__ . "/includes/home_welcome_panel.php";
                        ?>

                        <!-- Announcement Composer Trigger -->
                        <div class="bg-white border border-slate-200 standard-panel-shadow rounded-[22px] p-3">
                            <button id="trigger-announcement-composer" onclick="window.openComposerModal()"
                                class="w-full h-10 bg-slate-100 hover:bg-slate-200 transition-all rounded-full px-6 text-left text-black-fade text-[13px] font-medium flex items-center gap-3 group">
                                <i class="fa-solid fa-bullhorn text-[12px] icon-black-fade"></i>
                                <span>What do you want to announce?</span>
                            </button>
                        </div>

                        <!-- Announcements Section -->
                        <!-- Tabs Area -->
                        <div class="sigma-feed-tabs-container">
                                <button type="button" class="sigma-feed-tab-btn active" data-announcement-tab="all">Announcements</button>
                                <button type="button" class="sigma-feed-tab-btn" data-announcement-tab="important">Important</button>
                                <button type="button" class="sigma-feed-tab-btn" data-announcement-tab="posts">Posts</button>
                            </div>

                            <!-- Feed Area (Outside the panel) -->
                            <div id="admin-announcements-feed" class="space-y-3.5">
                                <!-- Injected by JS -->
                            </div>
                        </div>

                        <!-- 3. Right Section (3/12) - Charts -->
                        <div class="lg:col-span-3 sticky top-[106px] mt-2 home-sticky-rail home-sticky-rail--right">
                            <div class="home-dashboard-panels" id="admin-home-right-rail">
                                <div class="home-overview-card">
                                <!-- Header Area -->
                                <div class="h-14 flex items-center px-4 border-b border-slate-200 bg-white flex-shrink-0">
                                    <button id="prev-overview-page"
                                        class="w-8 h-8 flex items-center justify-center rounded-full text-black hover:bg-slate-200 transition-none">
                                        <i class="fa-solid fa-chevron-left text-[11px]"></i>
                                    </button>
                                    <h3 id="overview-header-title"
                                        class="text-xs font-black text-black tracking-normal text-center flex-1">
                                        Users Overview</h3>
                                    <button id="next-overview-page"
                                        class="w-8 h-8 flex items-center justify-center rounded-full text-black hover:bg-slate-200 transition-none">
                                        <i class="fa-solid fa-chevron-right text-[11px]"></i>
                                    </button>
                                </div>

                                <!-- Sub-Nav Area (Status Controls) -->
                                <div id="overview-status-controls"
                                    class="px-2 py-2.5 border-b border-slate-200 bg-white transition-none flex-shrink-0">
                                    <div class="flex items-stretch justify-between gap-1">
                                        <button id="tab-overall-users"
                                            class="flex-1 py-1.5 px-1 flex flex-col items-center justify-center gap-1 rounded-xl bg-[#15803d] text-white transition-none"
                                            title="Show Overall">
                                            <i class="fa-solid fa-layer-group text-[10px]"></i>
                                            <span
                                                class="text-[9px] font-bold tracking-normal text-center leading-tight">Overall</span>
                                        </button>
                                        <button id="tab-active-users"
                                            class="flex-1 py-1.5 px-1 flex flex-col items-center justify-center gap-1 rounded-xl text-black-fade hover:bg-slate-100 transition-none"
                                            title="Show Active">
                                            <i class="fa-solid fa-user-check text-[10px]"></i>
                                            <span
                                                class="text-[9px] font-bold tracking-normal text-center leading-tight">Active</span>
                                        </button>
                                        <button id="tab-inactive-users"
                                            class="flex-1 py-1.5 px-1 flex flex-col items-center justify-center gap-1 rounded-xl text-black-fade hover:bg-slate-100 transition-none"
                                            title="Show Inactive">
                                            <i class="fa-solid fa-user-slash text-[10px]"></i>
                                            <span
                                                class="text-[9px] font-bold tracking-normal text-center leading-tight">Inactive</span>
                                        </button>
                                    </div>
                                </div>

                                <!-- Content Area (Multi-page Support) -->
                                <div id="overview-pages-container" class="relative flex-1 flex flex-col">
                                    <!-- Page 1: Distribution Chart -->
                                    <div id="overview-page-1" class="flex-1 flex flex-col items-center p-4 pb-0">
                                        <div class="relative w-36 h-36 mx-auto my-1 flex items-center justify-center">
                                            <canvas id="userDistributionChart" class="w-full h-full block"></canvas>
                                        </div>

                                        <!-- Legend -->
                                        <div class="w-full mt-3 px-1 divide-y divide-slate-200 border-t border-b border-slate-200">
                                            <!-- Admins -->
                                            <div class="flex items-center justify-between py-2.5">
                                                <div class="flex items-center gap-2.5">
                                                    <div class="w-2.5 h-2.5 flex-shrink-0 rounded-[3px] bg-[#2563eb]"></div>
                                                    <span class="text-xs font-bold text-black tracking-normal">Admins</span>
                                                </div>
                                                <span id="count-admins" class="text-xs font-bold text-black">0</span>
                                            </div>
                                            <!-- Teachers -->
                                            <div class="flex items-center justify-between py-2.5">
                                                <div class="flex items-center gap-2.5">
                                                    <div class="w-2.5 h-2.5 flex-shrink-0 rounded-[3px] bg-[#FFD000]"></div>
                                                    <span class="text-xs font-bold text-black tracking-normal">Teachers</span>
                                                </div>
                                                <span id="count-teachers" class="text-xs font-bold text-black">0</span>
                                            </div>
                                            <!-- Students -->
                                            <div class="flex items-center justify-between py-2.5">
                                                <div class="flex items-center gap-2.5">
                                                    <div class="w-2.5 h-2.5 flex-shrink-0 rounded-[3px] bg-[#15803d]"></div>
                                                    <span class="text-xs font-bold text-black tracking-normal">Students</span>
                                                </div>
                                                <span id="count-students" class="text-xs font-bold text-black">0</span>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Page 2: Subjects Overview -->
                                    <div id="overview-page-2" class="p-6 hidden">
                                        <!-- Chart Container -->
                                        <div class="flex justify-center mb-6">
                                            <div class="relative w-36 h-36 mx-auto flex items-center justify-center">
                                                <canvas id="subjectDistributionChart" class="w-full h-full block"></canvas>
                                            </div>
                                        </div>

                                        <div class="w-full px-2 divide-y divide-slate-200 border-t border-b border-slate-200">
                                            <!-- Core Subjects -->
                                            <div class="flex items-center justify-between py-2.5">
                                                <div class="flex items-center gap-3">
                                                    <div class="w-2.5 h-2.5 rounded-[3px] bg-[#15803d]"></div>
                                                    <span class="text-xs font-bold text-black tracking-normal">Core Subjects</span>
                                                </div>
                                                <span id="count-core-subjects" class="text-xs font-bold text-black">0</span>
                                            </div>
                                            <!-- Applied Subjects -->
                                            <div class="flex items-center justify-between py-2.5">
                                                <div class="flex items-center gap-3">
                                                    <div class="w-2.5 h-2.5 rounded-[3px] bg-[#FFD000]"></div>
                                                    <span class="text-xs font-bold text-black tracking-normal">Applied Subjects</span>
                                                </div>
                                                <span id="count-applied-subjects" class="text-xs font-bold text-black">0</span>
                                            </div>
                                            <!-- Specialized Subjects -->
                                            <div class="flex items-center justify-between py-2.5">
                                                <div class="flex items-center gap-3">
                                                    <div class="w-2.5 h-2.5 rounded-[3px] bg-[#2563eb]"></div>
                                                    <span class="text-xs font-bold text-black tracking-normal">Specialized Subjects</span>
                                                </div>
                                                <span id="count-specialized-subjects" class="text-xs font-bold text-black">0</span>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Page 3: Sections Overview -->
                                    <div id="overview-page-3" class="p-6 hidden">
                                        <!-- Chart Container -->
                                        <div class="flex justify-center mb-6">
                                            <div class="relative w-36 h-36 mx-auto flex items-center justify-center">
                                                <canvas id="sectionDistributionChart" class="w-full h-full block"></canvas>
                                            </div>
                                        </div>

                                        <div class="w-full px-2 divide-y divide-slate-200 border-t border-b border-slate-200">
                                            <!-- Grade 11 -->
                                            <div class="flex items-center justify-between py-2.5">
                                                <div class="flex items-center gap-3">
                                                    <div class="w-2.5 h-2.5 rounded-[3px] bg-[#15803d]"></div>
                                                    <span class="text-xs font-bold text-black tracking-normal">Grade 11 Sections</span>
                                                </div>
                                                <span id="count-grade11-sections" class="text-xs font-bold text-black">0</span>
                                            </div>
                                            <!-- Grade 12 -->
                                            <div class="flex items-center justify-between py-2.5">
                                                <div class="flex items-center gap-3">
                                                    <div class="w-2.5 h-2.5 rounded-[3px] bg-[#FFD000]"></div>
                                                    <span class="text-xs font-bold text-black tracking-normal">Grade 12 Sections</span>
                                                </div>
                                                <span id="count-grade12-sections" class="text-xs font-bold text-black">0</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <!-- End 1. Users Overview Card -->

                            <!-- 2. Academic Calendar Milestones Card -->
                            <div id="admin-pinned-calendar-card" class="pinned-calendar-card">
                                <div class="h-11 flex items-center px-4 border-b border-slate-200 bg-white flex-shrink-0">
                                    <div class="flex items-center gap-2">
                                        <i class="fa-solid fa-calendar-days text-[#15803d] text-xs"></i>
                                        <h3 class="text-xs font-bold text-black tracking-normal">Academic Calendar</h3>
                                    </div>
                                </div>
                                <div id="admin-pinned-milestones-list" class="flex flex-col">
                                    <!-- Injected dynamically by JS -->
                                </div>
                            </div>
                        </div>
                    </div>
                    <!-- End home-sticky-rail--right -->
                </div>
                <!-- End dashboard-grid -->
                </section>

                <!-- USER ACCOUNTS VIEW -->
                <section id="users-view" class="dynamic-section hidden">
                    <div class="flex flex-col h-full bg-white min-h-screen border-b border-slate-200">
                        <!-- Metric / Counter Cards (Universal Elevated Suite) -->
                        <div class="px-10 pt-8 pb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <!-- Total Users -->
                            <div class="sigma-interactive-metric-card rounded-xl p-5 group flex items-center justify-between">
                                <div class="metric-text-content">
                                    <div class="metric-text-base">
                                        <span class="text-xs font-bold text-black tracking-normal block font-['Inter']">Total Users</span>
                                        <span id="metric-total-users" class="text-3xl md:text-[34px] font-extrabold text-slate-900 block mt-1.5 font-['Inter'] tracking-tight">0</span>
                                    </div>
                                    <div class="metric-text-spotlight" aria-hidden="true">
                                        <span class="text-xs font-bold tracking-normal block font-['Inter']">Total Users</span>
                                        <span id="metric-total-users-spotlight" class="text-3xl md:text-[34px] font-extrabold block mt-1.5 font-['Inter'] tracking-tight">0</span>
                                    </div>
                                </div>
                                <div class="metric-icon-box w-10 h-10 rounded-lg flex items-center justify-center text-base shrink-0">
                                    <i class="fa-solid fa-users metric-icon-base"></i>
                                    <i class="fa-solid fa-users metric-icon-spotlight" aria-hidden="true"></i>
                                </div>
                            </div>

                            <!-- Students -->
                            <div class="sigma-interactive-metric-card rounded-xl p-5 group flex items-center justify-between">
                                <div class="metric-text-content">
                                    <div class="metric-text-base">
                                        <span class="text-xs font-bold text-black tracking-normal block font-['Inter']">Students</span>
                                        <span id="metric-student-users" class="text-3xl md:text-[34px] font-extrabold text-slate-900 block mt-1.5 font-['Inter'] tracking-tight">0</span>
                                    </div>
                                    <div class="metric-text-spotlight" aria-hidden="true">
                                        <span class="text-xs font-bold tracking-normal block font-['Inter']">Students</span>
                                        <span id="metric-student-users-spotlight" class="text-3xl md:text-[34px] font-extrabold block mt-1.5 font-['Inter'] tracking-tight">0</span>
                                    </div>
                                </div>
                                <div class="metric-icon-box w-10 h-10 rounded-lg flex items-center justify-center text-base shrink-0">
                                    <i class="fa-solid fa-user-graduate metric-icon-base"></i>
                                    <i class="fa-solid fa-user-graduate metric-icon-spotlight" aria-hidden="true"></i>
                                </div>
                            </div>

                            <!-- Teachers -->
                            <div class="sigma-interactive-metric-card rounded-xl p-5 group flex items-center justify-between">
                                <div class="metric-text-content">
                                    <div class="metric-text-base">
                                        <span class="text-xs font-bold text-black tracking-normal block font-['Inter']">Teachers</span>
                                        <span id="metric-teacher-users" class="text-3xl md:text-[34px] font-extrabold text-slate-900 block mt-1.5 font-['Inter'] tracking-tight">0</span>
                                    </div>
                                    <div class="metric-text-spotlight" aria-hidden="true">
                                        <span class="text-xs font-bold tracking-normal block font-['Inter']">Teachers</span>
                                        <span id="metric-teacher-users-spotlight" class="text-3xl md:text-[34px] font-extrabold block mt-1.5 font-['Inter'] tracking-tight">0</span>
                                    </div>
                                </div>
                                <div class="metric-icon-box w-10 h-10 rounded-lg flex items-center justify-center text-base shrink-0">
                                    <i class="fa-solid fa-chalkboard-user metric-icon-base"></i>
                                    <i class="fa-solid fa-chalkboard-user metric-icon-spotlight" aria-hidden="true"></i>
                                </div>
                            </div>

                            <!-- Admins -->
                            <div class="sigma-interactive-metric-card rounded-xl p-5 group flex items-center justify-between">
                                <div class="metric-text-content">
                                    <div class="metric-text-base">
                                        <span class="text-xs font-bold text-black tracking-normal block font-['Inter']">Admins</span>
                                        <span id="metric-admin-users" class="text-3xl md:text-[34px] font-extrabold text-slate-900 block mt-1.5 font-['Inter'] tracking-tight">0</span>
                                    </div>
                                    <div class="metric-text-spotlight" aria-hidden="true">
                                        <span class="text-xs font-bold tracking-normal block font-['Inter']">Admins</span>
                                        <span id="metric-admin-users-spotlight" class="text-3xl md:text-[34px] font-extrabold block mt-1.5 font-['Inter'] tracking-tight">0</span>
                                    </div>
                                </div>
                                <div class="metric-icon-box w-10 h-10 rounded-lg flex items-center justify-center text-base shrink-0">
                                    <i class="fa-solid fa-user-shield metric-icon-base"></i>
                                    <i class="fa-solid fa-user-shield metric-icon-spotlight" aria-hidden="true"></i>
                                </div>
                            </div>
                        </div>

                        <!-- Actions & Search Toolbar (Single Unified Row - Shared Code) -->
                        <div id="user-accounts-toolbar" class="px-10 pb-8 flex flex-wrap items-center justify-between gap-4">
                            <!-- Left: Create User Button -->
                            <button onclick="window.toggleUserOverlay(true)"
                                class="sigma-btn sigma-btn-primary sigma-btn-md gap-3 shrink-0">
                                <i class="fa-solid fa-plus text-xs"></i>
                                <span>Create User</span>
                            </button>

                            <!-- Right: Combined Search, Role, Filter, and Search Button -->
                            <div class="flex flex-wrap items-center gap-3">
                                <!-- Combined ID & Name Search -->
                                <div id="field-search" class="w-[280px] relative">
                                    <input type="text" id="user-search-query" aria-label="Search user accounts by ID or Name" 
                                        placeholder="Search ID or Name"
                                        maxlength="50"
                                        autocomplete="off"
                                        autocorrect="off"
                                        autocapitalize="off"
                                        spellcheck="false"
                                        oninput="this.value = this.value.replace(/^\s+/, '').replace(/[^a-zA-Z0-9\s.\-']/g, '').replace(/\s{2,}/g, ' ')"
                                        onkeydown="if(event.key==='Enter'){event.preventDefault();window.applyUserAccountSearch(true);}"
                                        class="sigma-input">
                                </div>

                                <!-- Role Dropdown -->
                                <div id="field-role" class="w-[180px] relative">
                                    <div class="sigma-select-wrapper">
                                        <select id="user-search-role" aria-label="Filter user accounts by role" class="sigma-select">
                                            <option value="" selected>All</option>
                                            <option value="Master Admin">Master Admin</option>
                                            <option value="Admin">Admin</option>
                                            <option value="Teacher">Teacher</option>
                                            <option value="Student">Student</option>
                                        </select>
                                        <i class="fa-solid fa-chevron-down sigma-select-icon"></i>
                                    </div>
                                </div>

                                <!-- Filter Configuration Button & Dropdown -->
                                <div class="relative">
                                    <button onclick="window.toggleUserFilterDropdown(event)"
                                        class="sigma-filter-config-btn"
                                        title="Filter Configuration">
                                        <i class="fa-solid fa-sliders text-sm"></i>
                                    </button>

                                    <!-- Filter Dropdown Panel (Manage Search Fields) -->
                                    <div id="user-filter-dropdown" class="sigma-filter-dropdown hidden">
                                        <span class="sigma-filter-dropdown-title">Manage Search Fields</span>
                                        <label>
                                            <span>Search ID & Name</span>
                                            <input type="checkbox" aria-label="Toggle user search field" checked onchange="window.toggleSearchField('field-search', this.checked)">
                                        </label>
                                        <label>
                                            <span>Search Role</span>
                                            <input type="checkbox" aria-label="Toggle user role field" checked onchange="window.toggleSearchField('field-role', this.checked)">
                                        </label>
                                    </div>
                                </div>

                                <!-- Search Button -->
                                <button onclick="window.applyUserAccountSearch(true)"
                                    class="sigma-btn sigma-btn-primary sigma-btn-md min-w-[100px]">
                                    <span>Search</span>
                                </button>
                            </div>
                        </div>

                        <!-- Standardized Institutional Table -->
                        <div class="flex-1 flex flex-col bg-white px-10">
                            <table class="w-full border-collapse table-fixed">
                                <colgroup>
                                    <col style="width: 5%;">  <!-- No. -->
                                    <col style="width: 12%;"> <!-- ID -->
                                    <col style="width: 21%;"> <!-- Name -->
                                    <col style="width: 21%;"> <!-- Email -->
                                    <col style="width: 11%;"> <!-- Role -->
                                    <col style="width: 11%;"> <!-- Status -->
                                    <col style="width: 11%;"> <!-- Date Created -->
                                    <col style="width: 8%;">  <!-- Action -->
                                </colgroup>
                                <thead class="sticky top-0 bg-[#15803d] z-10 border-b border-[#137638]">
                                    <tr>
                                        <th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter'] border-r border-[#137638]">No.</th>
                                        <th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter'] border-r border-[#137638]">ID</th>
                                        <th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter'] border-r border-[#137638]">Name</th>
                                        <th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter'] border-r border-[#137638]">Email</th>
                                        <th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter'] border-r border-[#137638]">Role</th>
                                        <th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter'] border-r border-[#137638]">Status</th>
                                        <th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter'] border-r border-[#137638]">Date Created</th>
                                        <th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter']">Action</th>
                                    </tr>
                                </thead>
                                <tbody id="userTableBody"
                                    class="divide-y divide-slate-100">
                                    <!-- Populated by JS -->
                                </tbody>
                            </table>
                            <div id="user-pagination-container" class="py-6 border-t border-slate-100 flex items-center justify-between bg-white"></div>
                        </div>
                    </div>
                </section>


                <!-- USER PASSWORD EDIT OVERLAY (Standardized Workstation Shell) -->
                <div id="user-password-edit-overlay"
                    class="fixed inset-0 bg-[#f8fafc] z-[1000] hidden flex flex-col items-center p-0 overflow-y-auto font-['Inter']">

                    <!-- Exit Control (Far Right - Standard Workstation Shell) -->
                    <button type="button" onclick="window.handleUserPasswordExit()"
                        class="fixed top-10 right-10 w-12 h-12 rounded-full hover:bg-slate-200 flex items-center justify-center text-black transition-all z-[1001] cursor-pointer"
                        title="Exit Editor">
                        <i class="fa-solid fa-xmark text-xl"></i>
                    </button>

                    <div class="branch-edit-shell mx-auto w-full animate-in slide-in-from-top-4 duration-500">
                        <!-- White Panel (Standard 1024px Width, Centered, Full Height) -->
                        <div class="branch-edit-panel bg-white border border-slate-200 min-h-screen p-0 standard-panel-shadow relative flex flex-col mx-auto max-w-[1024px]">
                            <!-- Header -->
                            <div class="px-10 py-8 border-b border-slate-50 flex items-center justify-between bg-white sticky top-0 z-20 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                                <h1 class="text-2xl font-bold text-black tracking-tight font-['Inter']">Change Account Password</h1>
                            </div>

                            <!-- Body -->
                            <div class="flex-1 p-10 pt-6 space-y-6 font-['Inter']">
                                <div class="max-w-md space-y-6">
                                    <p id="password-change-instructions" class="text-sm font-normal text-black-fade leading-relaxed font-['Inter']">
                                        Please enter and confirm your new account password below. Make sure it is secure and easy for you to remember.
                                    </p>

                                    <!-- Password Form Inputs Container -->
                                    <div id="password-fields-container" class="space-y-6">
                                        <!-- Reset to Initial Default Action Box -->
                                        <div class="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                                            <div class="pr-3">
                                                <span class="text-sm font-bold text-black block font-['Inter']">Reset to Initial Default</span>
                                                <span id="user-default-password-hint" class="text-xs text-black-fade font-normal">Revert to default initial password format</span>
                                            </div>
                                            <button type="button" onclick="window.applyDefaultInitialPassword()"
                                                class="sigma-btn sigma-btn-secondary sigma-btn-sm whitespace-nowrap cursor-pointer">
                                                <i class="fa-solid fa-rotate-left text-xs"></i>
                                                <span>Use Default</span>
                                            </button>
                                        </div>

                                        <div class="space-y-3">
                                             <label for="new-user-password" class="text-base font-bold text-black capitalize tracking-normal ml-1">New Password</label>
                                             <div class="relative">
                                                 <input type="password" id="new-user-password" placeholder="••••••••"
                                                     oninput="this.value = this.value.replace(/[^a-zA-Z0-9\W]/g, ''); window.validateChangePasswordForm(); window.updatePasswordEyeState && window.updatePasswordEyeState(this);"
                                                     class="w-full bg-slate-50 border-b-2 border-slate-300 rounded-none px-4 py-4 pr-12 text-base font-medium text-black outline-none hover:bg-slate-100 hover:border-slate-400 focus:bg-slate-100 focus:border-black transition-all placeholder:text-black/40 font-['Inter'] shadow-none">
                                                 <button type="button" class="password-toggle-btn absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black focus:outline-none bg-transparent border-none p-0 cursor-pointer opacity-0 pointer-events-none transition-opacity"
                                                     onclick="window.togglePasswordVisibility && window.togglePasswordVisibility('new-user-password', this)" onmousedown="event.preventDefault()">
                                                     <i class="fa-solid fa-eye-slash text-lg"></i>
                                                 </button>
                                             </div>
                                             <div id="new-password-warning" class="hidden text-xs font-semibold text-rose-600 flex items-center gap-1.5 pt-1 ml-1 font-['Inter']"></div>
                                        </div>
                                        <div class="space-y-3">
                                             <label for="retype-user-password" class="text-base font-bold text-black capitalize tracking-normal ml-1">Retype Password</label>
                                             <div class="relative">
                                                 <input type="password" id="retype-user-password" placeholder="••••••••"
                                                     oninput="this.value = this.value.replace(/[^a-zA-Z0-9\W]/g, ''); window.validateChangePasswordForm(); window.updatePasswordEyeState && window.updatePasswordEyeState(this);"
                                                     class="w-full bg-slate-50 border-b-2 border-slate-300 rounded-none px-4 py-4 pr-12 text-base font-medium text-black outline-none hover:bg-slate-100 hover:border-slate-400 focus:bg-slate-100 focus:border-black transition-all placeholder:text-black/40 font-['Inter'] shadow-none">
                                                 <button type="button" class="password-toggle-btn absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black focus:outline-none bg-transparent border-none p-0 cursor-pointer opacity-0 pointer-events-none transition-opacity"
                                                     onclick="window.togglePasswordVisibility && window.togglePasswordVisibility('retype-user-password', this)" onmousedown="event.preventDefault()">
                                                     <i class="fa-solid fa-eye-slash text-lg"></i>
                                                 </button>
                                             </div>
                                             <div id="retype-password-warning" class="hidden text-xs font-semibold text-rose-600 flex items-center gap-1.5 pt-1 ml-1 font-['Inter']"></div>
                                        </div>
                                    </div>

                                    <!-- Reset Password State (Shown when password has been changed) -->
                                    <div id="password-reset-state-container" class="hidden space-y-4 pt-2">
                                        <div class="p-4 rounded-2xl bg-green-50 border border-green-200 text-green-800 text-sm font-medium flex items-center gap-3">
                                            <i class="fa-solid fa-circle-check text-green-600 text-base shrink-0"></i>
                                            <span>Password has been successfully changed for this user account.</span>
                                        </div>
                                        <button type="button" onclick="window.resetPasswordFormInputs()"
                                            class="sigma-btn sigma-btn-secondary sigma-btn-md gap-2 font-semibold">
                                            <i class="fa-solid fa-rotate-left text-xs"></i>
                                            <span>Reset Password</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- Action Footer -->
                            <div class="sigma-modal-footer flex justify-end items-center px-10 py-6 border-t border-slate-200 bg-white sticky bottom-0 z-30 shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
                                <div class="flex items-center gap-3">
                                    <button type="button" id="user-password-save-btn"
                                        onclick="window.executePasswordChange()"
                                        class="sigma-btn sigma-btn-primary sigma-btn-lg min-w-[160px] cursor-pointer">
                                        <span id="user-password-save-label">Update Password</span>
                                        <i class="fa-solid fa-circle-notch fa-spin hidden"
                                            id="user-password-save-loading"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- SCHOOL PROFILE VIEW (Shared Component) -->
                <?php require_once __DIR__ . "/includes/school_profile_view.php"; ?>

                <!-- ACTIVITY LOGS VIEW -->


                <!-- SCHOOL YEAR MANAGEMENT VIEW (Shared Component) -->
                <?php require_once __DIR__ . "/includes/school_year_view.php"; ?>

                <!-- SYSTEM SETTINGS (Shared Component) -->
                <?php require_once __DIR__ . "/includes/system_settings_views.php"; ?>



                <!-- SCHOOL SECTIONS VIEW (Shared Component) -->
                <?php require_once __DIR__ . "/includes/school_sections_view.php"; ?>

                <!-- SCHOOL SUBJECTS VIEW (Shared Component) -->
                <?php require_once __DIR__ . "/includes/school_subjects_view.php"; ?>

                <!-- REPORTS AI VIEW -->
<?php include __DIR__ . '/includes/ai_insight_report.php'; ?>

                                <!-- REPORTS ATTENDANCE VIEW -->
                <section id="reports-attendance-view" class="dynamic-section hidden">
                    <div class="flex flex-col h-full bg-white min-h-screen border-b border-slate-200">
                        <!-- Metric / Counter Cards (Universal Elevated Suite) -->
                        <div class="px-10 pt-8 pb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <!-- Present -->
                            <div class="sigma-interactive-metric-card rounded-xl p-5 group flex items-center justify-between">
                                <div class="metric-text-content">
                                    <div class="metric-text-base">
                                        <span id="metric-attendance-present-label" class="text-xs font-bold text-black tracking-normal block font-['Inter']">Present Today</span>
                                        <span id="metric-attendance-present" class="text-3xl md:text-[34px] font-extrabold text-slate-900 block mt-1.5 font-['Inter'] tracking-tight">193</span>
                                    </div>
                                    <div class="metric-text-spotlight" aria-hidden="true">
                                        <span id="metric-attendance-present-spotlight-label" class="text-xs font-bold tracking-normal block font-['Inter']">Present Today</span>
                                        <span id="metric-attendance-present-spotlight" class="text-3xl md:text-[34px] font-extrabold block mt-1.5 font-['Inter'] tracking-tight">193</span>
                                    </div>
                                </div>
                                <div class="metric-icon-box w-10 h-10 rounded-lg flex items-center justify-center text-base shrink-0">
                                    <i class="fa-solid fa-user-check metric-icon-base"></i>
                                    <i class="fa-solid fa-user-check metric-icon-spotlight" aria-hidden="true"></i>
                                </div>
                            </div>

                            <!-- Absent -->
                            <div class="sigma-interactive-metric-card rounded-xl p-5 group flex items-center justify-between">
                                <div class="metric-text-content">
                                    <div class="metric-text-base">
                                        <span id="metric-attendance-absent-label" class="text-xs font-bold text-black tracking-normal block font-['Inter']">Absent Today</span>
                                        <span id="metric-attendance-absent" class="text-3xl md:text-[34px] font-extrabold text-slate-900 block mt-1.5 font-['Inter'] tracking-tight">10</span>
                                    </div>
                                    <div class="metric-text-spotlight" aria-hidden="true">
                                        <span id="metric-attendance-absent-spotlight-label" class="text-xs font-bold tracking-normal block font-['Inter']">Absent Today</span>
                                        <span id="metric-attendance-absent-spotlight" class="text-3xl md:text-[34px] font-extrabold block mt-1.5 font-['Inter'] tracking-tight">10</span>
                                    </div>
                                </div>
                                <div class="metric-icon-box w-10 h-10 rounded-lg flex items-center justify-center text-base shrink-0">
                                    <i class="fa-solid fa-user-xmark metric-icon-base"></i>
                                    <i class="fa-solid fa-user-xmark metric-icon-spotlight" aria-hidden="true"></i>
                                </div>
                            </div>

                            <!-- Late -->
                            <div class="sigma-interactive-metric-card rounded-xl p-5 group flex items-center justify-between">
                                <div class="metric-text-content">
                                    <div class="metric-text-base">
                                        <span id="metric-attendance-late-label" class="text-xs font-bold text-black tracking-normal block font-['Inter']">Late Today</span>
                                        <span id="metric-attendance-late" class="text-3xl md:text-[34px] font-extrabold text-slate-900 block mt-1.5 font-['Inter'] tracking-tight">6</span>
                                    </div>
                                    <div class="metric-text-spotlight" aria-hidden="true">
                                        <span id="metric-attendance-late-spotlight-label" class="text-xs font-bold tracking-normal block font-['Inter']">Late Today</span>
                                        <span id="metric-attendance-late-spotlight" class="text-3xl md:text-[34px] font-extrabold block mt-1.5 font-['Inter'] tracking-tight">6</span>
                                    </div>
                                </div>
                                <div class="metric-icon-box w-10 h-10 rounded-lg flex items-center justify-center text-base shrink-0">
                                    <i class="fa-solid fa-clock metric-icon-base"></i>
                                    <i class="fa-solid fa-clock metric-icon-spotlight" aria-hidden="true"></i>
                                </div>
                            </div>

                            <!-- Attendance Rate -->
                            <div class="sigma-interactive-metric-card rounded-xl p-5 group flex items-center justify-between">
                                <div class="metric-text-content">
                                    <div class="metric-text-base">
                                        <span class="text-xs font-bold text-black tracking-normal block font-['Inter']">Attendance Rate</span>
                                        <span id="metric-attendance-rate" class="text-3xl md:text-[34px] font-extrabold text-slate-900 block mt-1.5 font-['Inter'] tracking-tight">92.3%</span>
                                    </div>
                                    <div class="metric-text-spotlight" aria-hidden="true">
                                        <span class="text-xs font-bold tracking-normal block font-['Inter']">Attendance Rate</span>
                                        <span id="metric-attendance-rate-spotlight" class="text-3xl md:text-[34px] font-extrabold block mt-1.5 font-['Inter'] tracking-tight">92.3%</span>
                                    </div>
                                </div>
                                <div class="metric-icon-box w-10 h-10 rounded-lg flex items-center justify-center text-base shrink-0">
                                    <i class="fa-solid fa-chart-pie metric-icon-base"></i>
                                    <i class="fa-solid fa-chart-pie metric-icon-spotlight" aria-hidden="true"></i>
                                </div>
                            </div>
                        </div>

                        <!-- Actions & Search Toolbar (Single Unified Row - Shared Code) -->
                        <div id="attendance-report-toolbar" class="px-10 pb-8 flex flex-wrap items-center justify-end gap-4">

                            <!-- Right: Combined Search, Role/Filter, and Search Button -->
                            <div class="flex flex-wrap items-center gap-3">
                                <!-- Search Section / Subject / Teacher -->
                                <div class="w-[280px] relative">
                                    <input type="text" id="attendance-search-query" aria-label="Search section, subject or teacher" 
                                        placeholder="Search Section, Subject or Teacher"
                                        maxlength="50"
                                        autocomplete="off"
                                        autocorrect="off"
                                        autocapitalize="off"
                                        spellcheck="false"
                                        oninput="this.value = this.value.replace(/^\s+/, '').replace(/[^a-zA-Z0-9\s.\-']/g, '').replace(/\s{2,}/g, ' ')"
                                        onkeydown="if(event.key==='Enter'){event.preventDefault();window.applyAttendanceSearch && window.applyAttendanceSearch();}"
                                        class="sigma-input">
                                </div>

                                <!-- Filter Section Dropdown -->
                                <div class="w-[180px] relative">
                                    <div class="sigma-select-wrapper">
                                        <select id="attendance-filter-section" onchange="window.applyAttendanceSearch && window.applyAttendanceSearch()" aria-label="Filter by Section" class="sigma-select">
                                            <option value="" selected>All Sections</option>
                                            <option value="11-Einstein">Grade 11 - Einstein</option>
                                            <option value="11-Rizal">Grade 11 - Rizal</option>
                                            <option value="12-Newton">Grade 12 - Newton</option>
                                        </select>
                                        <i class="fa-solid fa-chevron-down sigma-select-icon"></i>
                                    </div>
                                </div>

                                <!-- Filter Date Range Dropdown -->
                                <div class="w-[160px] relative">
                                    <div class="sigma-select-wrapper">
                                        <select id="attendance-filter-date" onchange="window.applyAttendanceSearch && window.applyAttendanceSearch()" aria-label="Filter by Date Range" class="sigma-select">
                                            <option value="today" selected>Today</option>
                                            <option value="week">This Week</option>
                                            <option value="month">This Month</option>
                                            <option value="last_month">Last Month</option>
                                        </select>
                                        <i class="fa-solid fa-chevron-down sigma-select-icon"></i>
                                    </div>
                                </div>

                                <!-- Search Button -->
                                <button onclick="window.applyAttendanceSearch && window.applyAttendanceSearch()"
                                    class="sigma-btn sigma-btn-primary sigma-btn-md min-w-[100px]">
                                    <span>Search</span>
                                </button>
                            </div>
                        </div>

                        <!-- Standardized Institutional Table (Exact User Accounts Style, Non-Paneled) -->
                        <div class="flex-1 flex flex-col bg-white px-10">
                                                        <table class="sigma-table w-full border-collapse table-fixed">
                                <colgroup>
                                    <col style="width: 16%;">  <!-- Section -->
                                    <col style="width: 16%;">  <!-- Subject -->
                                    <col style="width: 16%;">  <!-- Teacher -->
                                    <col style="width: 8%;">   <!-- Enrolled -->
                                    <col style="width: 8.5%;"> <!-- Present -->
                                    <col style="width: 8.5%;"> <!-- Absent -->
                                    <col style="width: 8%;">   <!-- Late -->
                                    <col style="width: 14%;">  <!-- Attendance Rate -->
                                    <col style="width: 5%;">   <!-- Action -->
                                </colgroup>
                                <thead class="sticky top-0 bg-[#15803d] z-10 border-b border-[#137638]">
                                    <tr>
                                        <th class="px-3 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter'] whitespace-nowrap overflow-hidden text-ellipsis border-r border-[#137638]" style="border-right: 1px solid #137638 !important;">Section</th>
                                        <th class="px-3 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter'] whitespace-nowrap overflow-hidden text-ellipsis border-r border-[#137638]" style="border-right: 1px solid #137638 !important;">Subject</th>
                                        <th class="px-3 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter'] whitespace-nowrap overflow-hidden text-ellipsis border-r border-[#137638]" style="border-right: 1px solid #137638 !important;">Teacher</th>
                                        <th class="px-2 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter'] whitespace-nowrap overflow-hidden text-ellipsis border-r border-[#137638]" style="border-right: 1px solid #137638 !important;">Enrolled</th>
                                        <th id="th-attendance-present" title="Present" class="px-2 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter'] whitespace-nowrap overflow-hidden text-ellipsis border-r border-[#137638]" style="border-right: 1px solid #137638 !important;">Present</th>
                                        <th id="th-attendance-absent" title="Absent" class="px-2 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter'] whitespace-nowrap overflow-hidden text-ellipsis border-r border-[#137638]" style="border-right: 1px solid #137638 !important;">Absent</th>
                                        <th id="th-attendance-late" title="Late" class="px-2 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter'] whitespace-nowrap overflow-hidden text-ellipsis border-r border-[#137638]" style="border-right: 1px solid #137638 !important;">Late</th>
                                        <th class="px-3 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter'] whitespace-nowrap overflow-hidden text-ellipsis border-r border-[#137638]" style="border-right: 1px solid #137638 !important;">Attendance Rate</th>
                                        <th class="px-2 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter'] whitespace-nowrap overflow-hidden text-ellipsis" title="Actions"><span class="sr-only">Actions</span><i class="fa-solid fa-ellipsis"></i></th>
                                    </tr>
                                </thead>
                                <tbody id="attendanceReportTableBody" class="divide-y divide-slate-100">
                                    <tr class="transition-colors hover:bg-slate-50/80">
                                        <td class="px-3 py-4 text-center">
                                            <div class="text-[13px] font-bold text-black text-center font-['Inter']">Einstein</div>
                                            <div class="text-[11px] font-normal text-slate-500 text-center font-['Inter']">Grade 11</div>
                                        </td>
                                        <td class="px-3 py-4 text-center">
                                            <div class="text-[13px] font-normal text-black text-center font-['Inter']">Statistics and Probability</div>
                                        </td>
                                        <td class="px-3 py-3.5 text-left" style="border-right: 1px solid #e2e8f0;">
                                            <div class="flex items-center justify-start gap-2.5 text-left">
                                                <div class="w-8 h-8 rounded-full bg-[#e2e8f0] flex items-center justify-center shrink-0 border border-slate-200/70 select-none overflow-hidden">
                                                    <i class="fa-solid fa-user text-xs text-[#94a3b8]"></i>
                                                </div>
                                                <div class="text-[13px] font-normal text-black break-words font-['Inter'] leading-snug text-left">
                                                    Jose Cruz Dela Pena
                                                </div>
                                            </div>
                                        </td>
                                        <td class="px-2 py-4 text-center" style="border-right: 1px solid #e2e8f0;">
                                            <div class="text-[13px] font-normal text-black text-center font-['Inter']">40</div>
                                        </td>
                                        <td class="px-2 py-4 text-center">
                                            <div class="text-[13px] font-normal text-black text-center font-['Inter']">38</div>
                                        </td>
                                        <td class="px-2 py-4 text-center" style="border-right: 1px solid #e2e8f0;">
                                            <div class="text-[13px] font-normal text-black text-center font-['Inter']">1</div>
                                        </td>
                                        <td class="px-2 py-4 text-center">
                                            <div class="text-[13px] font-normal text-black text-center font-['Inter']">1</div>
                                        </td>
                                        <td class="px-3 py-4 text-center whitespace-nowrap" style="border-right: 1px solid #e2e8f0;">
                                            <div class="text-[13px] font-normal text-[#15803d] text-center font-['Inter']">95.0%</div>
                                        </td>
                                        <td class="px-2 py-4 text-center">
                                            <div class="flex justify-center">
                                                <div class="action-dropdown-container">
                                                    <button type="button" onclick="window.toggleAttendanceActionDropdown(1, event)"
                                                        id="attendance-dots-btn-1"
                                                        class="action-dots-btn cursor-pointer" 
                                                        title="Actions">
                                                        <i class="fa-solid fa-ellipsis"></i>
                                                    </button>
                                                    <div id="attendance-action-menu-1" class="action-dropdown-menu">
                                                        <button type="button" onclick="window.viewAttendanceDetails && window.viewAttendanceDetails('Grade 11 - Einstein'); document.querySelectorAll('.action-dropdown-menu').forEach(m => m.classList.remove('show'));" class="action-dropdown-item cursor-pointer">
                                                            <i class="fa-solid fa-eye"></i>
                                                            <span>View Details</span>
                                                        </button>
                                                        <button type="button" onclick="window.exportAttendanceSheet && window.exportAttendanceSheet('Grade 11 - Einstein'); document.querySelectorAll('.action-dropdown-menu').forEach(m => m.classList.remove('show'));" class="action-dropdown-item cursor-pointer">
                                                            <i class="fa-solid fa-file-export"></i>
                                                            <span>Export Sheet</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                    <tr class="transition-colors bg-slate-50/60 hover:bg-slate-50/80">
                                        <td class="px-3 py-4 text-center">
                                            <div class="text-[13px] font-bold text-black text-center font-['Inter']">Rizal</div>
                                            <div class="text-[11px] font-normal text-slate-500 text-center font-['Inter']">Grade 11</div>
                                        </td>
                                        <td class="px-3 py-4 text-center">
                                            <div class="text-[13px] font-normal text-black text-center font-['Inter']">Oral Communication</div>
                                        </td>
                                        <td class="px-3 py-3.5 text-left" style="border-right: 1px solid #e2e8f0;">
                                            <div class="flex items-center justify-start gap-2.5 text-left">
                                                <div class="w-8 h-8 rounded-full bg-[#e2e8f0] flex items-center justify-center shrink-0 border border-slate-200/70 select-none overflow-hidden">
                                                    <i class="fa-solid fa-user text-xs text-[#94a3b8]"></i>
                                                </div>
                                                <div class="text-[13px] font-normal text-black break-words font-['Inter'] leading-snug text-left">
                                                    Maria Santos Ramos
                                                </div>
                                            </div>
                                        </td>
                                        <td class="px-2 py-4 text-center" style="border-right: 1px solid #e2e8f0;">
                                            <div class="text-[13px] font-normal text-black text-center font-['Inter']">44</div>
                                        </td>
                                        <td class="px-2 py-4 text-center">
                                            <div class="text-[13px] font-normal text-black text-center font-['Inter']">41</div>
                                        </td>
                                        <td class="px-2 py-4 text-center" style="border-right: 1px solid #e2e8f0;">
                                            <div class="text-[13px] font-normal text-black text-center font-['Inter']">2</div>
                                        </td>
                                        <td class="px-2 py-4 text-center">
                                            <div class="text-[13px] font-normal text-black text-center font-['Inter']">1</div>
                                        </td>
                                        <td class="px-3 py-4 text-center whitespace-nowrap" style="border-right: 1px solid #e2e8f0;">
                                            <div class="text-[13px] font-normal text-[#15803d] text-center font-['Inter']">93.2%</div>
                                        </td>
                                        <td class="px-2 py-4 text-center">
                                            <div class="flex justify-center">
                                                <div class="action-dropdown-container">
                                                    <button type="button" onclick="window.toggleAttendanceActionDropdown(2, event)"
                                                        id="attendance-dots-btn-2"
                                                        class="action-dots-btn cursor-pointer" 
                                                        title="Actions">
                                                        <i class="fa-solid fa-ellipsis"></i>
                                                    </button>
                                                    <div id="attendance-action-menu-2" class="action-dropdown-menu">
                                                        <button type="button" onclick="window.viewAttendanceDetails && window.viewAttendanceDetails('Grade 11 - Rizal'); document.querySelectorAll('.action-dropdown-menu').forEach(m => m.classList.remove('show'));" class="action-dropdown-item cursor-pointer">
                                                            <i class="fa-solid fa-eye"></i>
                                                            <span>View Details</span>
                                                        </button>
                                                        <button type="button" onclick="window.exportAttendanceSheet && window.exportAttendanceSheet('Grade 11 - Rizal'); document.querySelectorAll('.action-dropdown-menu').forEach(m => m.classList.remove('show'));" class="action-dropdown-item cursor-pointer">
                                                            <i class="fa-solid fa-file-export"></i>
                                                            <span>Export Sheet</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                    <tr class="transition-colors hover:bg-slate-50/80">
                                        <td class="px-3 py-4 text-center">
                                            <div class="text-[13px] font-bold text-black text-center font-['Inter']">Rizal</div>
                                            <div class="text-[11px] font-normal text-slate-500 text-center font-['Inter']">Grade 11</div>
                                        </td>
                                        <td class="px-3 py-4 text-center">
                                            <div class="text-[13px] font-normal text-black text-center font-['Inter']">Empowerment Technologies</div>
                                        </td>
                                        <td class="px-3 py-3.5 text-left" style="border-right: 1px solid #e2e8f0;">
                                            <div class="flex items-center justify-start gap-2.5 text-left">
                                                <div class="w-8 h-8 rounded-full bg-[#e2e8f0] flex items-center justify-center shrink-0 border border-slate-200/70 select-none overflow-hidden">
                                                    <i class="fa-solid fa-user text-xs text-[#94a3b8]"></i>
                                                </div>
                                                <div class="text-[13px] font-normal text-black break-words font-['Inter'] leading-snug text-left">
                                                    Jose Cruz Dela Pena
                                                </div>
                                            </div>
                                        </td>
                                        <td class="px-2 py-4 text-center" style="border-right: 1px solid #e2e8f0;">
                                            <div class="text-[13px] font-normal text-black text-center font-['Inter']">42</div>
                                        </td>
                                        <td class="px-2 py-4 text-center">
                                            <div class="text-[13px] font-normal text-black text-center font-['Inter']">39</div>
                                        </td>
                                        <td class="px-2 py-4 text-center" style="border-right: 1px solid #e2e8f0;">
                                            <div class="text-[13px] font-normal text-black text-center font-['Inter']">2</div>
                                        </td>
                                        <td class="px-2 py-4 text-center">
                                            <div class="text-[13px] font-normal text-black text-center font-['Inter']">1</div>
                                        </td>
                                        <td class="px-3 py-4 text-center whitespace-nowrap" style="border-right: 1px solid #e2e8f0;">
                                            <div class="text-[13px] font-normal text-[#15803d] text-center font-['Inter']">92.9%</div>
                                        </td>
                                        <td class="px-2 py-4 text-center">
                                            <div class="flex justify-center">
                                                <div class="action-dropdown-container">
                                                    <button type="button" onclick="window.toggleAttendanceActionDropdown(3, event)"
                                                        id="attendance-dots-btn-3"
                                                        class="action-dots-btn cursor-pointer" 
                                                        title="Actions">
                                                        <i class="fa-solid fa-ellipsis"></i>
                                                    </button>
                                                    <div id="attendance-action-menu-3" class="action-dropdown-menu">
                                                        <button type="button" onclick="window.viewAttendanceDetails && window.viewAttendanceDetails('Grade 11 - Rizal'); document.querySelectorAll('.action-dropdown-menu').forEach(m => m.classList.remove('show'));" class="action-dropdown-item cursor-pointer">
                                                            <i class="fa-solid fa-eye"></i>
                                                            <span>View Details</span>
                                                        </button>
                                                        <button type="button" onclick="window.exportAttendanceSheet && window.exportAttendanceSheet('Grade 11 - Rizal'); document.querySelectorAll('.action-dropdown-menu').forEach(m => m.classList.remove('show'));" class="action-dropdown-item cursor-pointer">
                                                            <i class="fa-solid fa-file-export"></i>
                                                            <span>Export Sheet</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                    <tr class="transition-colors bg-slate-50/60 hover:bg-slate-50/80">
                                        <td class="px-3 py-4 text-center">
                                            <div class="text-[13px] font-bold text-black text-center font-['Inter']">Rizal</div>
                                            <div class="text-[11px] font-normal text-slate-500 text-center font-['Inter']">Grade 11</div>
                                        </td>
                                        <td class="px-3 py-4 text-center">
                                            <div class="text-[13px] font-normal text-black text-center font-['Inter']">Computer Programming 1</div>
                                        </td>
                                        <td class="px-3 py-3.5 text-left" style="border-right: 1px solid #e2e8f0;">
                                            <div class="flex items-center justify-start gap-2.5 text-left">
                                                <div class="w-8 h-8 rounded-full bg-[#e2e8f0] flex items-center justify-center shrink-0 border border-slate-200/70 select-none overflow-hidden">
                                                    <i class="fa-solid fa-user text-xs text-[#94a3b8]"></i>
                                                </div>
                                                <div class="text-[13px] font-normal text-black break-words font-['Inter'] leading-snug text-left">
                                                    Maria Santos Ramos
                                                </div>
                                            </div>
                                        </td>
                                        <td class="px-2 py-4 text-center" style="border-right: 1px solid #e2e8f0;">
                                            <div class="text-[13px] font-normal text-black text-center font-['Inter']">45</div>
                                        </td>
                                        <td class="px-2 py-4 text-center">
                                            <div class="text-[13px] font-normal text-black text-center font-['Inter']">42</div>
                                        </td>
                                        <td class="px-2 py-4 text-center" style="border-right: 1px solid #e2e8f0;">
                                            <div class="text-[13px] font-normal text-black text-center font-['Inter']">2</div>
                                        </td>
                                        <td class="px-2 py-4 text-center">
                                            <div class="text-[13px] font-normal text-black text-center font-['Inter']">1</div>
                                        </td>
                                        <td class="px-3 py-4 text-center whitespace-nowrap" style="border-right: 1px solid #e2e8f0;">
                                            <div class="text-[13px] font-normal text-[#15803d] text-center font-['Inter']">93.3%</div>
                                        </td>
                                        <td class="px-2 py-4 text-center">
                                            <div class="flex justify-center">
                                                <div class="action-dropdown-container">
                                                    <button type="button" onclick="window.toggleAttendanceActionDropdown(4, event)"
                                                        id="attendance-dots-btn-4"
                                                        class="action-dots-btn cursor-pointer" 
                                                        title="Actions">
                                                        <i class="fa-solid fa-ellipsis"></i>
                                                    </button>
                                                    <div id="attendance-action-menu-4" class="action-dropdown-menu">
                                                        <button type="button" onclick="window.viewAttendanceDetails && window.viewAttendanceDetails('Grade 11 - Rizal'); document.querySelectorAll('.action-dropdown-menu').forEach(m => m.classList.remove('show'));" class="action-dropdown-item cursor-pointer">
                                                            <i class="fa-solid fa-eye"></i>
                                                            <span>View Details</span>
                                                        </button>
                                                        <button type="button" onclick="window.exportAttendanceSheet && window.exportAttendanceSheet('Grade 11 - Rizal'); document.querySelectorAll('.action-dropdown-menu').forEach(m => m.classList.remove('show'));" class="action-dropdown-item cursor-pointer">
                                                            <i class="fa-solid fa-file-export"></i>
                                                            <span>Export Sheet</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                    <tr class="transition-colors hover:bg-slate-50/80">
                                        <td class="px-3 py-4 text-center">
                                            <div class="text-[13px] font-bold text-black text-center font-['Inter']">Newton</div>
                                            <div class="text-[11px] font-normal text-slate-500 text-center font-['Inter']">Grade 12</div>
                                        </td>
                                        <td class="px-3 py-4 text-center">
                                            <div class="text-[13px] font-normal text-black text-center font-['Inter']">General Mathematics</div>
                                        </td>
                                        <td class="px-3 py-3.5 text-left" style="border-right: 1px solid #e2e8f0;">
                                            <div class="flex items-center justify-start gap-2.5 text-left">
                                                <div class="w-8 h-8 rounded-full bg-[#e2e8f0] flex items-center justify-center shrink-0 border border-slate-200/70 select-none overflow-hidden">
                                                    <i class="fa-solid fa-user text-xs text-[#94a3b8]"></i>
                                                </div>
                                                <div class="text-[13px] font-normal text-black break-words font-['Inter'] leading-snug text-left">
                                                    Jose Cruz Dela Pena
                                                </div>
                                            </div>
                                        </td>
                                        <td class="px-2 py-4 text-center" style="border-right: 1px solid #e2e8f0;">
                                            <div class="text-[13px] font-normal text-black text-center font-['Inter']">38</div>
                                        </td>
                                        <td class="px-2 py-4 text-center">
                                            <div class="text-[13px] font-normal text-black text-center font-['Inter']">35</div>
                                        </td>
                                        <td class="px-2 py-4 text-center" style="border-right: 1px solid #e2e8f0;">
                                            <div class="text-[13px] font-normal text-black text-center font-['Inter']">2</div>
                                        </td>
                                        <td class="px-2 py-4 text-center">
                                            <div class="text-[13px] font-normal text-black text-center font-['Inter']">1</div>
                                        </td>
                                        <td class="px-3 py-4 text-center whitespace-nowrap" style="border-right: 1px solid #e2e8f0;">
                                            <div class="text-[13px] font-normal text-[#15803d] text-center font-['Inter']">92.1%</div>
                                        </td>
                                        <td class="px-2 py-4 text-center">
                                            <div class="flex justify-center">
                                                <div class="action-dropdown-container">
                                                    <button type="button" onclick="window.toggleAttendanceActionDropdown(5, event)"
                                                        id="attendance-dots-btn-5"
                                                        class="action-dots-btn cursor-pointer" 
                                                        title="Actions">
                                                        <i class="fa-solid fa-ellipsis"></i>
                                                    </button>
                                                    <div id="attendance-action-menu-5" class="action-dropdown-menu">
                                                        <button type="button" onclick="window.viewAttendanceDetails && window.viewAttendanceDetails('Grade 12 - Newton'); document.querySelectorAll('.action-dropdown-menu').forEach(m => m.classList.remove('show'));" class="action-dropdown-item cursor-pointer">
                                                            <i class="fa-solid fa-eye"></i>
                                                            <span>View Details</span>
                                                        </button>
                                                        <button type="button" onclick="window.exportAttendanceSheet && window.exportAttendanceSheet('Grade 12 - Newton'); document.querySelectorAll('.action-dropdown-menu').forEach(m => m.classList.remove('show'));" class="action-dropdown-item cursor-pointer">
                                                            <i class="fa-solid fa-file-export"></i>
                                                            <span>Export Sheet</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            <!-- Pagination Footer -->
                            <div id="attendance-pagination-container" class="py-6 border-t border-slate-100 flex items-center justify-between bg-white">
                                <p class="text-xs text-slate-400 font-medium font-['Inter']">Showing 1 to 5 of 12 records</p>
                                <div class="flex items-center gap-2">
                                    <button type="button" class="w-8 h-8 rounded-lg border border-slate-200 text-xs font-semibold text-slate-500 hover:bg-slate-50 flex items-center justify-center transition-colors">‹</button>
                                    <button type="button" class="w-8 h-8 rounded-lg bg-[#15803d] text-xs font-semibold text-white flex items-center justify-center">1</button>
                                    <button type="button" class="w-8 h-8 rounded-lg border border-slate-200 text-xs font-semibold text-slate-500 hover:bg-slate-50 flex items-center justify-center transition-colors">2</button>
                                    <button type="button" class="w-8 h-8 rounded-lg border border-slate-200 text-xs font-semibold text-slate-500 hover:bg-slate-50 flex items-center justify-center transition-colors">›</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                
                <!-- ═══ SCHOOL GRADEBOOKS VIEW ═══ -->
                <section id="school-grades-view" class="dynamic-section hidden">
                </section>

                <!-- REPORTS PERFORMANCE VIEW -->
                <section id="reports-performance-view" class="dynamic-section hidden">
                    <div class="mx-auto max-w-[1024px] w-full">
                        <div
                            class="bg-white border-x border-b border-slate-200 min-h-screen p-0 standard-panel-shadow relative flex flex-col">
                            
                            <div class="px-10 py-8 space-y-8">
                                <!-- Summary Cards -->
                                <div class="grid grid-cols-4 gap-4">
                                    <div class="border border-slate-200 rounded-2xl p-5 bg-slate-50 space-y-1">
                                        <div
                                            class="w-8 h-8 bg-[#15803d]/10 rounded-xl flex items-center justify-center mb-2">
                                            <i class="fa-solid fa-chart-bar text-[#15803d] text-sm"></i>
                                        </div>
                                        <p class="text-2xl font-black text-black">84.7</p>
                                        <p class="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Class
                                            Average</p>
                                    </div>
                                    <div class="border border-slate-200 rounded-2xl p-5 bg-slate-50 space-y-1">
                                        <div
                                            class="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center mb-2">
                                            <i class="fa-solid fa-trophy text-amber-500 text-sm"></i>
                                        </div>
                                        <p class="text-2xl font-black text-black">98</p>
                                        <p class="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Highest
                                            Score</p>
                                    </div>
                                    <div class="border border-slate-200 rounded-2xl p-5 bg-slate-50 space-y-1">
                                        <div
                                            class="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center mb-2">
                                            <i class="fa-solid fa-circle-check text-blue-500 text-sm"></i>
                                        </div>
                                        <p class="text-2xl font-black text-black">87.6%</p>
                                        <p class="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Passing
                                            Rate</p>
                                    </div>
                                    <div class="border border-slate-200 rounded-2xl p-5 bg-slate-50 space-y-1">
                                        <div
                                            class="w-8 h-8 bg-red-100 rounded-xl flex items-center justify-center mb-2">
                                            <i class="fa-solid fa-circle-xmark text-red-500 text-sm"></i>
                                        </div>
                                        <p class="text-2xl font-black text-black">156</p>
                                        <p class="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Failing
                                            Students</p>
                                    </div>
                                </div>
                                <!-- Assessments Section -->
                                <div class="space-y-4">
                                    <div class="flex items-center gap-3">
                                        <div class="w-1 h-6 bg-[#15803d] rounded-full"></div>
                                        <h3 class="text-[11px] font-bold text-black uppercase tracking-widest">
                                            Assessments</h3>
                                    </div>
                                    <div class="flex items-center gap-3">
                                        <select id="admin-reports-filter-subject" name="reports_subject" aria-label="Filter by Subject"
                                            class="w-44 h-9 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 px-3 outline-none">
                                            <option value="">All Subjects</option>
                                            <option value="prog-101">Computer Programming 1</option>
                                            <option value="oral-comm">Oral Communication</option>
                                            <option value="gen-math">General Mathematics</option>
                                            <option value="emp-tech">Empowerment Technologies</option>
                                            <option value="abm-fin">Business Finance</option>
                                        </select>
                                        <select id="admin-reports-filter-section" name="reports_section" aria-label="Filter by Section"
                                            class="w-44 h-9 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 px-3 outline-none">
                                            <option value="">All Sections</option>
                                            <option value="11-ICT-A">Grade 11 - ICT A</option>
                                            <option value="11-ABM-A">Grade 11 - ABM A</option>
                                            <option value="11-STEM-A">Grade 11 - STEM A</option>
                                            <option value="12-ICT-A">Grade 12 - ICT A</option>
                                            <option value="12-HUMSS-A">Grade 12 - HUMSS A</option>
                                        </select>
                                        <button
                                            class="ml-auto px-5 h-9 bg-[#15803d] text-white text-[10px] font-bold rounded-xl uppercase tracking-widest hover:bg-[#166534] transition-all">Export</button>
                                    </div>
                                    <div class="border border-slate-200 rounded-2xl overflow-hidden">
                                        <table class="w-full text-left border-collapse">
                                            <thead class="bg-[#15803d] border-b border-[#137638]">
                                                <tr>
                                                    <th
                                                        class="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-white">
                                                        Student Name</th>
                                                    <th
                                                        class="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-white">
                                                        Subject</th>
                                                    <th
                                                        class="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-white">
                                                        Type</th>
                                                    <th
                                                        class="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-white">
                                                        Score</th>
                                                    <th
                                                        class="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-white">
                                                        Result</th>
                                                </tr>
                                            </thead>
                                            <tbody class="divide-y divide-slate-100">
                                                <tr>
                                                    <td class="px-5 py-3 text-sm font-medium text-black">Juan dela Cruz
                                                    </td>
                                                    <td class="px-5 py-3 text-xs text-slate-500">Mathematics</td>
                                                    <td class="px-5 py-3 text-xs text-slate-500">Quarterly Exam</td>
                                                    <td class="px-5 py-3 text-xs font-bold text-black">88/100</td>
                                                    <td class="px-5 py-3"><span
                                                            class="px-3 py-1 bg-green-100 text-green-700 text-[9px] font-bold rounded-xl uppercase">Passed</span>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td class="px-5 py-3 text-sm font-medium text-black">Maria Santos
                                                    </td>
                                                    <td class="px-5 py-3 text-xs text-slate-500">Science</td>
                                                    <td class="px-5 py-3 text-xs text-slate-500">Written Work</td>
                                                    <td class="px-5 py-3 text-xs font-bold text-black">62/100</td>
                                                    <td class="px-5 py-3"><span
                                                            class="px-3 py-1 bg-yellow-100 text-yellow-700 text-[9px] font-bold rounded-xl uppercase">Needs
                                                            Review</span></td>
                                                </tr>
                                                <tr>
                                                    <td class="px-5 py-3 text-sm font-medium text-black">Carlo Reyes
                                                    </td>
                                                    <td class="px-5 py-3 text-xs text-slate-500">English</td>
                                                    <td class="px-5 py-3 text-xs text-slate-500">Performance Task</td>
                                                    <td class="px-5 py-3 text-xs font-bold text-black">55/100</td>
                                                    <td class="px-5 py-3"><span
                                                            class="px-3 py-1 bg-red-100 text-red-700 text-[9px] font-bold rounded-xl uppercase">Failed</span>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td class="px-5 py-3 text-sm font-medium text-black">Ana Flores</td>
                                                    <td class="px-5 py-3 text-xs text-slate-500">Filipino</td>
                                                    <td class="px-5 py-3 text-xs text-slate-500">Quarterly Exam</td>
                                                    <td class="px-5 py-3 text-xs font-bold text-black">92/100</td>
                                                    <td class="px-5 py-3"><span
                                                            class="px-3 py-1 bg-green-100 text-green-700 text-[9px] font-bold rounded-xl uppercase">Passed</span>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                <!-- Grades Section -->
                                <div class="space-y-4">
                                    <div class="flex items-center gap-3">
                                        <div class="w-1 h-6 bg-blue-500 rounded-full"></div>
                                        <h3 class="text-[11px] font-bold text-black uppercase tracking-widest">Grades
                                        </h3>
                                    </div>
                                    <div class="grid grid-cols-2 gap-4">
                                        <!-- Grade Distribution -->
                                        <div class="border border-slate-200 rounded-2xl p-6 bg-slate-50 space-y-3">
                                            <p class="text-xs font-bold text-black mb-3">Grade Distribution</p>
                                            <div class="space-y-2">
                                                <div class="flex items-center gap-3"><span
                                                        class="text-[10px] font-bold text-slate-600 w-6">A</span>
                                                    <div class="flex-1 bg-slate-200 rounded-lg overflow-hidden h-5">
                                                        <div class="bg-[#15803d] h-full rounded-lg" style="width:42%">
                                                        </div>
                                                    </div><span
                                                        class="text-[10px] font-bold text-slate-500 w-8">42%</span>
                                                </div>
                                                <div class="flex items-center gap-3"><span
                                                        class="text-[10px] font-bold text-slate-600 w-6">B</span>
                                                    <div class="flex-1 bg-slate-200 rounded-lg overflow-hidden h-5">
                                                        <div class="bg-blue-400 h-full rounded-lg" style="width:28%">
                                                        </div>
                                                    </div><span
                                                        class="text-[10px] font-bold text-slate-500 w-8">28%</span>
                                                </div>
                                                <div class="flex items-center gap-3"><span
                                                        class="text-[10px] font-bold text-slate-600 w-6">C</span>
                                                    <div class="flex-1 bg-slate-200 rounded-lg overflow-hidden h-5">
                                                        <div class="bg-yellow-400 h-full rounded-lg" style="width:18%">
                                                        </div>
                                                    </div><span
                                                        class="text-[10px] font-bold text-slate-500 w-8">18%</span>
                                                </div>
                                                <div class="flex items-center gap-3"><span
                                                        class="text-[10px] font-bold text-slate-600 w-6">D</span>
                                                    <div class="flex-1 bg-slate-200 rounded-lg overflow-hidden h-5">
                                                        <div class="bg-red-400 h-full rounded-lg" style="width:12%">
                                                        </div>
                                                    </div><span
                                                        class="text-[10px] font-bold text-slate-500 w-8">12%</span>
                                                </div>
                                            </div>
                                        </div>
                                        <!-- Top Performers -->
                                        <div class="border border-slate-200 rounded-2xl p-6 bg-slate-50 space-y-3">
                                            <p class="text-xs font-bold text-black mb-1">Top Performers</p>
                                            <div class="space-y-2">
                                                <div
                                                    class="flex items-center gap-3 p-2 bg-white rounded-xl border border-slate-100">
                                                    <div
                                                        class="w-7 h-7 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 text-[9px] font-black">
                                                        1</div>
                                                    <span class="flex-1 text-xs font-medium text-black">Ana
                                                        Flores</span>
                                                    <span class="text-[10px] font-black text-[#15803d]">98</span>
                                                </div>
                                                <div
                                                    class="flex items-center gap-3 p-2 bg-white rounded-xl border border-slate-100">
                                                    <div
                                                        class="w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 text-[9px] font-black">
                                                        2</div>
                                                    <span class="flex-1 text-xs font-medium text-black">Ramon
                                                        Garcia</span>
                                                    <span class="text-[10px] font-black text-[#15803d]">95</span>
                                                </div>
                                                <div
                                                    class="flex items-center gap-3 p-2 bg-white rounded-xl border border-slate-100">
                                                    <div
                                                        class="w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 text-[9px] font-black">
                                                        3</div>
                                                    <span class="flex-1 text-xs font-medium text-black">Juan dela
                                                        Cruz</span>
                                                    <span class="text-[10px] font-black text-[#15803d]">91</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
                <!-- RESOURCES VIEW -->
                <!-- SHARED CALENDAR PAGE COMPONENT -->
                <?php include __DIR__ . '/includes/calendar_page.php'; ?>

                <section id="resources-view" class="dynamic-section hidden">
                    <div class="mx-auto max-w-[1024px] w-full">
                        <div
                            class="bg-white border-x border-b border-slate-200 min-h-screen p-0 standard-panel-shadow relative flex flex-col">
                            <!-- No Page Header: Content starts immediately -->
                            <div class="px-10 py-8 space-y-8">
                                <!-- Top Actions -->
                                <div class="flex items-center justify-between">
                                    <div class="relative w-[320px]">
                                        <i
                                            class="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-black text-xs"></i>
                                        <input type="text" id="admin-resources-search-input" aria-label="Search institutional resources" name="resources-search-input" maxlength="100" placeholder="Search resources..."
                                            class="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2.5 rounded-2xl text-[11px] font-medium text-black tracking-widest outline-none focus:border-black transition-all placeholder:text-slate-400">
                                    </div>
                                    <div class="flex items-center gap-3">
                                        <button
                                            class="px-5 py-2.5 bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all">
                                            <i class="fa-solid fa-filter mr-2"></i>Filter
                                        </button>
                                        <button
                                            class="px-6 py-2.5 bg-[#15803d] text-white hover:bg-[#166534] rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm">
                                            <i class="fa-solid fa-cloud-arrow-up mr-2"></i>Upload File
                                        </button>
                                    </div>
                                </div>

                                <!-- Storage Overview -->
                                <div class="grid grid-cols-3 gap-4">
                                    <div
                                        class="border border-slate-200 rounded-2xl p-5 bg-slate-50 flex items-center gap-4">
                                        <div
                                            class="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                                            <i class="fa-solid fa-file-pdf text-blue-600 text-base"></i>
                                        </div>
                                        <div>
                                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                Documents</p>
                                            <div class="flex items-baseline gap-2">
                                                <p class="text-xl font-black text-black">1,248</p>
                                                <p
                                                    class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                    Files</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div
                                        class="border border-slate-200 rounded-2xl p-5 bg-slate-50 flex items-center gap-4">
                                        <div
                                            class="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                                            <i class="fa-solid fa-image text-amber-600 text-base"></i>
                                        </div>
                                        <div>
                                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                Media</p>
                                            <div class="flex items-baseline gap-2">
                                                <p class="text-xl font-black text-black">342</p>
                                                <p
                                                    class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                    Files</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div
                                        class="border border-slate-200 rounded-2xl p-5 bg-slate-50 flex items-center gap-4">
                                        <div
                                            class="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center shrink-0">
                                            <i class="fa-solid fa-hard-drive text-purple-600 text-base"></i>
                                        </div>
                                        <div class="w-full">
                                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                Storage Used</p>
                                            <div class="flex items-center justify-between mb-1.5 mt-0.5">
                                                <p class="text-xs font-black text-black">12.4 GB</p>
                                                <p
                                                    class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                    82%</p>
                                            </div>
                                            <div class="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                <div class="w-[82%] h-full bg-purple-500 rounded-full"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Recent Files Section -->
                                <div class="space-y-4">
                                    <div class="flex items-center justify-between">
                                        <div class="flex items-center gap-3">
                                            <div class="w-1 h-5 bg-[#15803d] rounded-full"></div>
                                            <h3 class="text-[11px] font-bold text-black uppercase tracking-widest">
                                                Recent Uploads</h3>
                                        </div>
                                        <button
                                            class="text-[9px] font-bold text-[#15803d] uppercase tracking-widest hover:underline">View
                                            All</button>
                                    </div>

                                    <div class="border border-slate-200 rounded-2xl overflow-hidden">
                                        <table class="w-full text-left border-collapse">
                                            <thead class="bg-[#15803d] border-b border-slate-200">
                                                <tr>
                                                    <th
                                                        class="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-white w-2/5">
                                                        File Name</th>
                                                    <th
                                                        class="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-white">
                                                        Type</th>
                                                    <th
                                                        class="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-white">
                                                        Size</th>
                                                    <th
                                                        class="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-white">
                                                        Uploaded By</th>
                                                    <th
                                                        class="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-white text-right">
                                                        Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody class="divide-y divide-slate-100">
                                                <tr class="hover:bg-slate-50 transition-colors group">
                                                    <td class="px-5 py-4">
                                                        <div class="flex items-center gap-3">
                                                            <div
                                                                class="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                                                                <i class="fa-solid fa-file-pdf"></i>
                                                            </div>
                                                            <div>
                                                                <p class="text-xs font-bold text-black">
                                                                    Student_Handbook_2025-2026.pdf</p>
                                                                <p class="text-[9px] font-medium text-slate-400 mt-0.5">
                                                                    Apr 28, 2026 at 10:45 AM</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td class="px-5 py-4"><span
                                                            class="px-2.5 py-1 bg-slate-100 text-slate-600 text-[9px] font-bold rounded-lg uppercase tracking-widest">Document</span>
                                                    </td>
                                                    <td class="px-5 py-4 text-xs font-medium text-slate-500">4.2 MB</td>
                                                    <td class="px-5 py-4">
                                                        <div class="flex items-center gap-2">
                                                            <div
                                                                class="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-500 shrink-0">
                                                                MA</div>
                                                            <p class="text-xs font-medium text-slate-600">Master Admin
                                                            </p>
                                                        </div>
                                                    </td>
                                                    <td class="px-5 py-4 text-right">
                                                        <div
                                                            class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                class="w-7 h-7 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-black transition-colors"><i
                                                                    class="fa-solid fa-download text-xs"></i></button>
                                                            <button
                                                                class="w-7 h-7 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-black transition-colors"><i
                                                                    class="fa-solid fa-ellipsis-vertical text-xs"></i></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                                <tr class="hover:bg-slate-50 transition-colors group">
                                                    <td class="px-5 py-4">
                                                        <div class="flex items-center gap-3">
                                                            <div
                                                                class="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                                                                <i class="fa-solid fa-file-word"></i>
                                                            </div>
                                                            <div>
                                                                <p class="text-xs font-bold text-black">
                                                                    Memo_042_Faculty_Meeting.docx</p>
                                                                <p class="text-[9px] font-medium text-slate-400 mt-0.5">
                                                                    Apr 27, 2026 at 02:15 PM</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td class="px-5 py-4"><span
                                                            class="px-2.5 py-1 bg-slate-100 text-slate-600 text-[9px] font-bold rounded-lg uppercase tracking-widest">Document</span>
                                                    </td>
                                                    <td class="px-5 py-4 text-xs font-medium text-slate-500">1.8 MB</td>
                                                    <td class="px-5 py-4">
                                                        <div class="flex items-center gap-2">
                                                            <div
                                                                class="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-500 shrink-0">
                                                                MA</div>
                                                            <p class="text-xs font-medium text-slate-600">Master Admin
                                                            </p>
                                                        </div>
                                                    </td>
                                                    <td class="px-5 py-4 text-right">
                                                        <div
                                                            class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                class="w-7 h-7 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-black transition-colors"><i
                                                                    class="fa-solid fa-download text-xs"></i></button>
                                                            <button
                                                                class="w-7 h-7 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-black transition-colors"><i
                                                                    class="fa-solid fa-ellipsis-vertical text-xs"></i></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                                <tr class="hover:bg-slate-50 transition-colors group">
                                                    <td class="px-5 py-4">
                                                        <div class="flex items-center gap-3">
                                                            <div
                                                                class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                                                                <i class="fa-solid fa-file-excel"></i>
                                                            </div>
                                                            <div>
                                                                <p class="text-xs font-bold text-black">
                                                                    Q1_Enrollment_Statistics.xlsx</p>
                                                                <p class="text-[9px] font-medium text-slate-400 mt-0.5">
                                                                    Apr 25, 2026 at 09:30 AM</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td class="px-5 py-4"><span
                                                            class="px-2.5 py-1 bg-slate-100 text-slate-600 text-[9px] font-bold rounded-lg uppercase tracking-widest">Spreadsheet</span>
                                                    </td>
                                                    <td class="px-5 py-4 text-xs font-medium text-slate-500">856 KB</td>
                                                    <td class="px-5 py-4">
                                                        <div class="flex items-center gap-2">
                                                            <div
                                                                class="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-500 shrink-0">
                                                                MA</div>
                                                            <p class="text-xs font-medium text-slate-600">Master Admin
                                                            </p>
                                                        </div>
                                                    </td>
                                                    <td class="px-5 py-4 text-right">
                                                        <div
                                                            class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                class="w-7 h-7 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-black transition-colors"><i
                                                                    class="fa-solid fa-download text-xs"></i></button>
                                                            <button
                                                                class="w-7 h-7 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-black transition-colors"><i
                                                                    class="fa-solid fa-ellipsis-vertical text-xs"></i></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                                <tr class="hover:bg-slate-50 transition-colors group">
                                                    <td class="px-5 py-4">
                                                        <div class="flex items-center gap-3">
                                                            <div
                                                                class="w-8 h-8 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                                                                <i class="fa-solid fa-image"></i>
                                                            </div>
                                                            <div>
                                                                <p class="text-xs font-bold text-black">
                                                                    Campus_Map_Updated.png</p>
                                                                <p class="text-[9px] font-medium text-slate-400 mt-0.5">
                                                                    Apr 22, 2026 at 11:20 AM</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td class="px-5 py-4"><span
                                                            class="px-2.5 py-1 bg-slate-100 text-slate-600 text-[9px] font-bold rounded-lg uppercase tracking-widest">Image</span>
                                                    </td>
                                                    <td class="px-5 py-4 text-xs font-medium text-slate-500">2.4 MB</td>
                                                    <td class="px-5 py-4">
                                                        <div class="flex items-center gap-2">
                                                            <div
                                                                class="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-500 shrink-0">
                                                                SA</div>
                                                            <p class="text-xs font-medium text-slate-600">Master Admin
                                                            </p>
                                                        </div>
                                                    </td>
                                                    <td class="px-5 py-4 text-right">
                                                        <div
                                                            class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                class="w-7 h-7 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-black transition-colors"><i
                                                                    class="fa-solid fa-download text-xs"></i></button>
                                                            <button
                                                                class="w-7 h-7 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-black transition-colors"><i
                                                                    class="fa-solid fa-ellipsis-vertical text-xs"></i></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- AUDIT LOGS: AI LOGS VIEW -->
                <section id="audit-ai-view" class="dynamic-section hidden">
                    <div class="mx-auto max-w-[1024px] w-full">
                        <div
                            class="bg-white border-x border-b border-slate-200 min-h-screen p-0 standard-panel-shadow relative flex flex-col">
                            <div class="px-10 py-8 border-b border-slate-100">
                                <h1 class="text-2xl font-bold text-black tracking-tight font-['Inter']">AI Logs</h1>
                            </div>
                            <div class="flex-1">
<!-- AI Logs Table -->
                                <div class="sigma-table-container overflow-x-auto">
                                    <table class="sigma-table sigma-audit-table" aria-label="AI interaction logs">
                                        <thead>
                                            <tr>
                                                <th class="text-left">User</th>
                                                <th class="text-left">AI Feature</th>
                                                <th class="text-left">Model</th>
                                                <th>Status</th>
                                                <th class="text-right">Timestamp</th>
                                            </tr>
                                        </thead>
<tbody><tr><td colspan="5" class="text-black-fade">No AI logs yet.</td></tr></tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- AUDIT LOGS: ACTIVITY LOGS VIEW -->
                <section id="audit-activity-view" class="dynamic-section hidden">
                    <div class="mx-auto max-w-[1024px] w-full">
                        <div
                            class="bg-white border-x border-b border-slate-200 min-h-screen p-0 standard-panel-shadow relative flex flex-col">
                            <div class="px-10 py-8 border-b border-slate-100">
                                <h1 class="text-2xl font-bold text-black tracking-tight font-['Inter']">Activity Logs</h1>
                            </div>
                            <div class="flex-1">
<!-- Activity Logs Table -->
                                <div class="sigma-table-container overflow-x-auto">
                                    <table class="sigma-table sigma-audit-table" aria-label="Activity logs">
                                        <thead>
                                            <tr>
                                                <th>User</th>
                                                <th>Activity</th>
                                                <th>Module</th>
                                                <th>Timestamp</th>
                                            </tr>
                                        </thead>
                                        <tbody id="activity-log-rows"><tr><td colspan="4" class="text-center text-black-fade">No activity events recorded yet.</td></tr></tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- AUDIT LOGS: AUTHENTICATION LOGS VIEW -->
                <section id="audit-auth-view" class="dynamic-section hidden">
                    <div class="mx-auto max-w-[1024px] w-full">
                        <div
                            class="bg-white border-x border-b border-slate-200 min-h-screen p-0 standard-panel-shadow relative flex flex-col">
                            <div class="px-10 py-8 border-b border-slate-100">
                                <h1 class="text-2xl font-bold text-black tracking-tight font-['Inter']">Authentication Logs</h1>
                            </div>
                            <div class="flex-1">
<!-- Authentication Logs Table -->
                                <div class="sigma-table-container overflow-x-auto">
                                    <table class="sigma-table sigma-audit-table" aria-label="Authentication logs">
                                        <thead>
                                            <tr>
                                                <th>User</th>
                                                <th>Event</th>
                                                <th>IP / Device</th>
                                                <th>Timestamp</th>
                                                <th class="text-center" data-auth-actions="true">Action</th>
                                            </tr>
                                        </thead>
<tbody><tr><td colspan="5" class="text-center text-black-fade">No authentication events recorded yet.</td></tr></tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section id="audit-notifications-view" class="dynamic-section hidden">
                    <div class="audit-log-layout bg-white border-b border-slate-200 min-h-screen p-0 relative">
                        <aside class="audit-log-sidebar">
                            <nav class="flex flex-col gap-2" aria-label="Audit log categories" id="notification-log-navigation"></nav>
                        </aside>
                        <div class="flex-1 min-w-0">
                            <div class="sigma-table-container overflow-x-auto">
                                <table class="sigma-table sigma-audit-table" aria-label="Notification logs">
                                    <thead><tr><th>Sender</th><th>Recipient</th><th>Notification</th><th>Status</th><th>Read</th><th>Timestamp</th><th class="text-center" data-notification-actions="true">Action</th></tr></thead>
                                    <tbody id="notification-log-rows"></tbody>
                                </table>
                            </div>
                            <div class="flex items-center justify-between gap-3 p-5">
                            </div>
                        </div>
                    </div>
                </section>
            </main>

        <!-- USER ACCOUNT CREATE/EDIT OVERLAY (Standardized Workstation) -->
        <div id="user-edit-overlay" class="sigma-modal-overlay hidden">
            <!-- Exit Control (Far Right) -->
            <button type="button" onclick="window.handleUserExit()"
                class="fixed top-10 right-10 w-12 h-12 rounded-full hover:bg-slate-200 flex items-center justify-center text-black transition-all z-[1001]"
                title="Exit Editor">
                <i class="fa-solid fa-xmark text-xl"></i>
            </button>

            <div class="sigma-modal-shell">
                <div class="sigma-modal-panel">
                    <!-- Header -->
                    <div class="border-b border-slate-100 sticky top-0 bg-white z-20">
                        <div class="px-10 py-5 flex items-center justify-between">
                            <div class="flex items-center gap-3">
                                <button type="button" id="user-back-btn" onclick="window.handleUserStepBack()"
                                    title="Back"
                                    class="hidden w-8 h-8 rounded-full flex items-center justify-center text-black hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer border-0 p-0 shadow-none outline-none -ml-1">
                                    <i class="fa-solid fa-arrow-left text-sm text-black"></i>
                                </button>
                                <h2 id="user-editor-title" class="text-2xl font-bold text-black tracking-tight font-['Inter']">Create User Account</h2>
                                <span id="user-modal-status-badge" class="hidden text-xs font-bold px-2.5 py-1 rounded-full font-['Inter']"></span>
                            </div>
                        </div>
                        <!-- Segmented Navigation Header -->
                        <div id="user-segmented-header" class="flex w-full bg-slate-100 border-y border-slate-200 pointer-events-none select-none">
                            <!-- Step 1: Account -->
                            <div id="user-step-bar-1"
                                class="flex-1 pt-4 pb-0 flex flex-col items-center justify-between transition-all border-r border-slate-200 bg-[#15803d]/10 pointer-events-none select-none">
                                <span id="step-bar-1-label"
                                     class="text-base font-bold capitalize tracking-normal transition-colors text-[#15803d] mb-3">Add Account</span>
                                <div id="step-bar-1-track"
                                     class="w-full h-1.5 bg-[#15803d] transition-all"></div>
                            </div>

                            <!-- Step 2: Credentials -->
                            <div id="user-step-bar-2"
                                class="flex-1 pt-4 pb-0 flex flex-col items-center justify-between transition-all border-r border-slate-200 bg-slate-100 pointer-events-none select-none">
                                <span id="step-bar-2-label"
                                    class="text-base font-bold capitalize tracking-normal transition-colors text-slate-500 mb-3">Add Credentials</span>
                                <div id="step-bar-2-track"
                                    class="w-full h-1.5 bg-slate-200 transition-all"></div>
                            </div>

                            <!-- Step 3: Send -->
                            <div id="user-step-bar-3"
                                class="flex-1 pt-4 pb-0 flex flex-col items-center justify-between transition-all bg-slate-100 pointer-events-none select-none">
                                <span id="step-bar-3-label"
                                    class="text-base font-bold capitalize tracking-normal transition-colors text-slate-500 mb-3">Send Credentials</span>
                                <div id="step-bar-3-track"
                                    class="w-full h-1.5 bg-slate-200 transition-all"></div>
                            </div>
                        </div>
                    </div>

                    <!-- Form Body -->
                    <div id="user-edit-form-body" class="sigma-modal-body">
                        <!-- STEP 1: ACCOUNT -->
                        <div id="user-step-1" class="space-y-6">
                            <!-- School Branch -->
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div class="space-y-3">
                                    <label for="edit-user-school-branch" class="sigma-subject-label text-base font-bold text-black capitalize tracking-normal ml-1">School Branch</label>
                                    <div class="relative">
                                        <select id="edit-user-school-branch" class="sigma-subject-select w-full bg-slate-100/70 border-b-2 border-slate-200 rounded-none px-4 py-4 text-base font-medium text-slate-500 outline-none appearance-none cursor-not-allowed font-['Inter'] shadow-none" disabled>
                                            <option value="Main Campus">Main Campus</option>
                                        </select>
                                        <i class="fa-solid fa-chevron-down absolute right-5 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none"></i>
                                    </div>
                                </div>
                            </div>

                            <!-- Institutional Role -->
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div class="space-y-3">
                                    <label for="edit-user-role" class="sigma-subject-label text-base font-bold text-black capitalize tracking-normal ml-1">Institutional Role <span class="text-red-500">*</span></label>
                                    <div class="relative">
                                        <select id="edit-user-role" onchange="window.handleRoleChange(this.value)"
                                            class="sigma-subject-select w-full bg-slate-50 border-b-2 border-slate-300 rounded-none px-4 py-4 text-base font-medium text-black outline-none hover:bg-slate-100 hover:border-slate-400 focus:bg-slate-100 focus:border-black transition-all appearance-none cursor-pointer font-['Inter'] shadow-none">
                                            <option value="" disabled selected hidden>Select Role</option>
                                            <option value="Admin">Admin</option>
                                            <option value="Teacher">Teacher</option>
                                            <option value="Student">Student</option>
                                        </select>
                                        <i class="fa-solid fa-chevron-down absolute right-5 top-1/2 -translate-y-1/2 text-xs text-black pointer-events-none"></i>
                                    </div>
                                </div>
                            </div>

                            <!-- Name Fields (3 Columns) -->
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div class="space-y-3">
                                    <label for="edit-user-firstname" class="sigma-subject-label text-base font-bold text-black capitalize tracking-normal ml-1">Firstname <span class="text-red-500">*</span></label>
                                    <input type="text" id="edit-user-firstname" placeholder="Enter first name"
                                        maxlength="40"
                                        oninput="this.value = this.value.replace(/[^a-zA-ZñÑ\s]/g, '').replace(/(?:^|\s)\S/g, c => c.toUpperCase())"
                                        class="sigma-subject-input w-full bg-slate-50 border-b-2 border-slate-300 rounded-none px-4 py-4 text-base font-medium text-black outline-none hover:bg-slate-100 hover:border-slate-400 focus:bg-slate-100 focus:border-black transition-all placeholder:text-black/40 font-['Inter'] shadow-none">
                                </div>
                                <div class="space-y-3">
                                    <label for="edit-user-middlename" class="sigma-subject-label text-base font-bold text-black capitalize tracking-normal ml-1">Middlename <span class="text-red-500">*</span></label>
                                    <input type="text" id="edit-user-middlename" placeholder="Enter middle name"
                                        maxlength="40"
                                        oninput="this.value = this.value.replace(/[^a-zA-ZñÑ\s]/g, '').replace(/(?:^|\s)\S/g, c => c.toUpperCase())"
                                        class="sigma-subject-input w-full bg-slate-50 border-b-2 border-slate-300 rounded-none px-4 py-4 text-base font-medium text-black outline-none hover:bg-slate-100 hover:border-slate-400 focus:bg-slate-100 focus:border-black transition-all placeholder:text-black/40 font-['Inter'] shadow-none">
                                </div>
                                <div class="space-y-3">
                                    <label for="edit-user-lastname" class="sigma-subject-label text-base font-bold text-black capitalize tracking-normal ml-1">Lastname <span class="text-red-500">*</span></label>
                                    <input type="text" id="edit-user-lastname" placeholder="Enter last name"
                                        maxlength="40"
                                        oninput="this.value = this.value.replace(/[^a-zA-ZñÑ\s]/g, '').replace(/(?:^|\s)\S/g, c => c.toUpperCase())"
                                        class="sigma-subject-input w-full bg-slate-50 border-b-2 border-slate-300 rounded-none px-4 py-4 text-base font-medium text-black outline-none hover:bg-slate-100 hover:border-slate-400 focus:bg-slate-100 focus:border-black transition-all placeholder:text-black/40 font-['Inter'] shadow-none">
                                </div>
                            </div>

                            <!-- Gender Field -->
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div class="space-y-3">
                                    <label for="edit-user-gender" class="sigma-subject-label text-base font-bold text-black capitalize tracking-normal ml-1">Gender <span class="text-red-500">*</span></label>
                                    <div class="relative">
                                        <select id="edit-user-gender"
                                            class="sigma-subject-select w-full bg-slate-50 border-b-2 border-slate-300 rounded-none px-4 py-4 text-base font-medium text-black outline-none hover:bg-slate-100 hover:border-slate-400 focus:bg-slate-100 focus:border-black transition-all appearance-none cursor-pointer font-['Inter'] shadow-none">
                                            <option value="" disabled selected hidden>Select Gender</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                        </select>
                                        <i class="fa-solid fa-chevron-down absolute right-5 top-1/2 -translate-y-1/2 text-xs text-black pointer-events-none"></i>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- STEP 2: CREDENTIALS -->
                        <div id="user-step-2" class="hidden space-y-6 pt-6">
                            <!-- ID Number & Gmail Symmetrically Paired in 2 Columns -->
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div class="space-y-3">
                                    <label for="edit-user-id" class="sigma-subject-label text-base font-bold text-black capitalize tracking-normal ml-1">ID Number</label>
                                    <input type="text" id="edit-user-id" placeholder="ID Number"
                                        readonly disabled
                                        class="sigma-subject-input w-full bg-slate-100/70 border-b-2 border-slate-200 rounded-none px-4 py-4 text-base font-bold text-slate-700 outline-none cursor-not-allowed font-['Inter'] shadow-none">
                                </div>

                                <div class="space-y-3">
                                    <div class="flex items-center justify-between ml-1">
                                        <label for="edit-user-email" class="sigma-subject-label text-base font-bold text-black capitalize tracking-normal">Gmail <span class="text-red-500">*</span></label>
                                        <button type="button" onclick="window.autoGenerateUserEmail()"
                                            class="text-xs font-bold text-[#15803d] hover:text-[#166534] bg-transparent hover:bg-emerald-50 px-2 py-0.5 rounded-md transition-all flex items-center gap-1.5 cursor-pointer border-0 font-['Inter']"
                                            title="Auto-generate a default placeholder Gmail using Name and ID">
                                            <i class="fa-solid fa-wand-magic-sparkles text-[10px]"></i>
                                            <span>Generate Default</span>
                                        </button>
                                    </div>
                                    <div class="relative flex items-center">
                                        <input type="text" id="edit-user-email" placeholder="gmail username"
                                            maxlength="64"
                                            oninput="this.value = this.value.replace(/[^a-zA-Z0-9.]/g, '').toLowerCase(); window.validateUserStep2()"
                                            class="sigma-subject-input w-full bg-slate-50 border-b-2 border-slate-300 rounded-none pl-4 pr-28 py-4 text-base font-medium text-black outline-none hover:bg-slate-100 hover:border-slate-400 focus:bg-slate-100 focus:border-black transition-all placeholder:text-black/40 font-['Inter'] shadow-none">
                                        <span class="absolute right-4 text-sm font-bold text-black pointer-events-none select-none">@gmail.com</span>
                                    </div>
                                    <div id="user-email-duplicate-warning" class="hidden text-xs font-semibold text-rose-600 flex items-center gap-1.5 pt-1 ml-1 font-['Inter']"></div>
                                </div>
                            </div>

                            <div id="user-account-preview-card" class="pt-6 border-t border-slate-200">
                                <span class="sigma-label mb-4 block">Account Preview</span>
                                <div class="max-w-xl rounded-[20px] bg-[#15803d] border border-green-700/40 p-7 space-y-5 shadow-md">
                                    <div class="flex items-center justify-between gap-6">
                                        <span class="text-xs font-bold uppercase tracking-wider text-green-100">Login id</span>
                                        <span id="user-preview-id" class="text-lg font-bold text-white tracking-tight">Not Generated</span>
                                    </div>
                                    <div class="h-px bg-white/30"></div>
                                    <div class="flex items-center justify-between gap-6">
                                        <span class="text-xs font-bold uppercase tracking-wider text-green-100">Password</span>
                                        <span id="user-preview-password" class="text-lg font-bold text-white tracking-tight">Waiting</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- STEP 3: SUCCESS -->
                        <div id="user-step-3" class="space-y-4 hidden">
                            <!-- Green Credential Panel (Screenshot Style) -->
                            <div id="credential-screenshot-panel"
                                class="relative overflow-hidden rounded-[24px] bg-[#15803d] p-6 mx-auto max-w-md border-2 border-white/20 shadow-none">
                                <div class="absolute top-0 right-0 p-4 opacity-10">
                                    <i class="fa-solid fa-shield-halved text-7xl"></i>
                                </div>

                                <div class="relative z-10 space-y-4">
                                    <div class="flex items-center gap-3 border-b border-white/20 pb-4">
                                        <img src="../image/ICC logo.jpg" alt="ICC Logo"
                                            class="w-10 h-10 rounded-full border-2 border-white/30 bg-white object-contain">
                                        <div>
                                            <p class="text-[10px] font-medium uppercase tracking-widest text-white/70">
                                                 Institutional Credentials</p>
                                            <h4 class="text-base font-bold text-white">Interface Computer College</h4>
                                        </div>
                                    </div>

                                    <div class="space-y-4">
                                        <div class="space-y-1">
                                            <span class="text-[10px] font-bold uppercase tracking-wider text-white/60 block">Login ID</span>
                                            <div id="user-final-id" class="text-2xl font-bold text-white tracking-tight">-</div>
                                        </div>
                                        <div class="space-y-1">
                                            <span class="text-[10px] font-bold uppercase tracking-wider text-white/60 block">Password</span>
                                            <div id="user-final-password" class="text-xl font-bold text-white/95 font-mono tracking-wider">-</div>
                                        </div>
                                    </div>

                                    <div class="pt-3 border-t border-white/10 flex items-center justify-between">
                                        <p class="text-[10px] font-semibold text-white/50 uppercase tracking-wider">Confidential Information</p>
                                        <i class="fa-solid fa-qrcode text-white/30 text-lg"></i>
                                    </div>
                                </div>
                            </div>

                            <div class="max-w-md mx-auto flex flex-col items-center gap-2 pt-2">
                                <p class="text-sm font-bold text-black text-center tracking-normal">
                                    Take a Screenshot of the Credentials Above, or
                                </p>
                                <button type="button" onclick="window.sendCredentialsViaGmail()"
                                    class="sigma-btn sigma-btn-secondary sigma-btn-lg w-full !rounded-2xl gap-3 text-black font-semibold">
                                    <i class="fa-solid fa-envelope text-red-500"></i>
                                    <span class="text-black font-semibold">Send via Gmail</span>
                                </button>
                            </div>
                        </div>

                        <!-- Actions Row (Below Content) -->
                        <div id="user-form-actions-row" class="flex items-center justify-end gap-3 pt-6 mt-6 border-t border-slate-100 font-['Inter']">
                            <button type="button" id="user-step-next-btn" onclick="window.handleUserStepNext()"
                                class="sigma-btn sigma-btn-primary sigma-btn-md min-w-[120px] flex items-center justify-center gap-2 cursor-pointer font-['Inter']">
                                <span>Next</span>
                            </button>
                            <button type="button" id="user-save-btn" onclick="window.handleUserSave()"
                                class="sigma-btn sigma-btn-primary sigma-btn-md min-w-[140px] hidden flex items-center justify-center gap-2 cursor-pointer font-['Inter']">
                                <span id="user-save-label">Create Account</span>
                                <i class="fa-solid fa-circle-notch fa-spin hidden ml-1" id="user-save-loading"></i>
                            </button>
                            <button type="button" id="user-add-another-btn" onclick="window.resetUserModalForNew()"
                                class="sigma-btn sigma-btn-secondary sigma-btn-md hidden flex items-center justify-center gap-2 cursor-pointer font-['Inter']">
                                <i class="fa-solid fa-user-plus text-xs"></i>
                                <span>Add Another User</span>
                            </button>
                            <button type="button" id="user-finish-btn" onclick="window.finishUserCreation()"
                                class="sigma-btn sigma-btn-primary sigma-btn-md min-w-[140px] hidden flex items-center justify-center gap-2 cursor-pointer font-['Inter']">
                                <span>Close & Finish</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>







    <!-- Permissions Unsaved Changes Confirmation Overlay -->
    <div id="permissions-discard-modal"
        class="fixed inset-0 z-[2100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm hidden transition-all duration-300">
        <div class="bg-white w-[400px] rounded-[22px] shadow-2xl p-10 text-center animate-slide-up">
            <h3 class="text-lg font-bold text-slate-900 mb-8 font-['Inter']">Do you want to go unsave changes?</h3>
            <div class="flex flex-col gap-4">
                <button onclick="window.cancelPermissionsDiscard()"
                    class="w-full py-3.5 bg-[#15803d] text-white rounded-2xl text-sm font-bold capitalize tracking-normal transition-all hover:bg-[#166534] font-['Inter'] cursor-pointer">
                    Cancel
                </button>
                <button onclick="window.confirmPermissionsDiscard()"
                    class="w-full py-3.5 bg-slate-100 text-black rounded-2xl text-sm font-bold capitalize tracking-normal transition-all hover:bg-slate-200 font-['Inter'] cursor-pointer">
                    Discard
                </button>
            </div>
        </div>
    </div>
    <div id="delete-account-modal-1"
        class="fixed inset-0 z-[2200] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm hidden transition-all duration-300">
        <div class="bg-white w-[400px] rounded-[22px] shadow-2xl p-10 text-center animate-slide-up">
            <h3 class="text-lg font-bold text-slate-900 mb-8 font-['Inter']">Are you sure do you want to DELETE THIS
                ACCOUNT?</h3>
            <div class="flex flex-col gap-4">
                <button onclick="document.getElementById('delete-account-modal-1').classList.add('hidden')"
                    class="w-full py-3.5 bg-[#15803d] text-white rounded-2xl text-sm font-bold capitalize tracking-normal transition-all hover:bg-[#166534] font-['Inter'] cursor-pointer">
                    Cancel
                </button>
                <button onclick="window.showDeleteAccountModal2()"
                    class="w-full py-3.5 bg-transparent text-red-600 rounded-2xl text-sm font-bold capitalize tracking-normal transition-all hover:bg-red-50 font-['Inter'] cursor-pointer">
                    Yes, Delete
                </button>
            </div>
        </div>
    </div>

    <!-- Delete Account Modal 2: Validation -->
    <div id="delete-account-modal-2"
        class="fixed inset-0 z-[2200] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm hidden transition-all duration-300">
        <div class="bg-white w-[400px] rounded-[22px] shadow-2xl p-10 text-center animate-slide-up">
            <h3 class="text-lg font-bold text-slate-900 mb-4 font-['Inter']">To delete, please type DELETE below</h3>
            <p class="text-[10px] text-black-fade font-bold uppercase tracking-widest mb-8" style="color: var(--sigma-black-fade) !important; -webkit-text-fill-color: var(--sigma-black-fade) !important;">This action is irreversible
            </p>
            <div class="space-y-6">
                <input type="text" id="delete-account-input" aria-label="Type DELETE to confirm account deletion" maxlength="10" placeholder="Type DELETE here"
                    oninput="document.getElementById('final-delete-btn').disabled = (this.value !== 'DELETE')"
                    class="w-full bg-slate-50 border border-slate-200 px-6 py-4 rounded-2xl text-sm font-bold text-black outline-none focus:border-[#FFD000] transition-all text-center">

                <div class="flex flex-col gap-4">
                    <button onclick="window.executeDeleteAccount()" id="final-delete-btn" disabled
                        class="sigma-btn sigma-btn-primary w-full py-3.5 bg-[#15803d] text-white rounded-2xl text-sm font-bold capitalize tracking-normal transition-all hover:bg-[#166534] font-['Inter'] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                        Delete Account
                    </button>
                    <button onclick="document.getElementById('delete-account-modal-2').classList.add('hidden')"
                        class="w-full py-3.5 bg-transparent text-black rounded-2xl text-sm font-bold capitalize tracking-normal transition-all hover:bg-slate-100 font-['Inter'] cursor-pointer">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Deactivate Account Modal -->
    <div id="deactivate-account-modal"
        class="fixed inset-0 z-[2200] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm hidden transition-all duration-300">
        <div class="bg-white w-[400px] rounded-[22px] shadow-2xl p-10 text-center animate-slide-up">
            <h3 class="text-lg font-bold text-slate-900 mb-8 font-['Inter']">Do you want to deactivate this account?
            </h3>
            <div class="flex flex-col gap-4">
                <button onclick="window.confirmDeactivateUser()"
                    class="w-full py-4 bg-red-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all hover:bg-red-700 font-['Inter']">
                    Yes, Deactivate
                </button>
                <button onclick="document.getElementById('deactivate-account-modal').classList.add('hidden')"
                    class="w-full py-4 bg-transparent text-black rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all hover:bg-slate-100 font-['Inter']">
                    Cancel
                </button>
            </div>
        </div>
    </div>

    <!-- Activate Account Modal -->
    <div id="activate-account-modal"
        class="fixed inset-0 z-[2200] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm hidden transition-all duration-300">
        <div class="bg-white w-[400px] rounded-[22px] shadow-2xl p-10 text-center animate-slide-up">
            <h3 class="text-lg font-bold text-slate-900 mb-8 font-['Inter']">Do you want to activate this account?</h3>
            <div class="flex flex-col gap-4">
                <button onclick="window.confirmActivateUser()"
                    class="w-full py-4 bg-[#15803d] text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all hover:bg-[#166534] font-['Inter']">
                    Yes, Activate
                </button>
                <button onclick="document.getElementById('activate-account-modal').classList.add('hidden')"
                    class="w-full py-4 bg-transparent text-black rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all hover:bg-slate-100 font-['Inter']">
                    Cancel
                </button>
            </div>
        </div>
    </div>

    <!-- USER PERMISSIONS OVERLAY -->
    <?php require_once __DIR__ . "/includes/user_permissions_overlay.php"; ?>

    <script>
        // Global SY Context (Wireframe)
        const sy = "SY 2026-2027";
    </script>
    <!-- API VAULT UNLOCK OVERLAY -->
    <div id="vault-unlock-overlay"
        class="hidden fixed inset-0 bg-white/90 backdrop-blur-md z-[1000] flex items-center justify-center p-6 animate-in fade-in duration-500">
        <div class="w-full max-w-[400px] bg-white rounded-none shadow-2xl border border-black p-8 relative">
            <div class="flex justify-between items-center mb-8">
                <h3 class="text-[14px] font-black text-black uppercase tracking-[0.2em]">Institutional Authentication</h3>
                <button onclick="window.closeVaultModal()" class="text-black">
                    <i class="fa-solid fa-xmark text-lg"></i>
                </button>
            </div>

            <div class="space-y-6">
                <div class="space-y-2">
                    <label for="vault-auth-pass" class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verify Password</label>
                    <input type="password" id="vault-auth-pass"
                        placeholder="Institutional Password"
                        class="w-full bg-slate-50 border border-slate-200 px-6 py-4 rounded-none text-sm font-bold text-black outline-none focus:border-black transition-all">
                </div>

                <div id="vault-auth-error" class="hidden text-[10px] font-bold text-red-500 uppercase tracking-widest">
                    Password Failed. Access Denied.</div>

                <div class="pt-4">
                    <button onclick="window.verifyVaultModal()"
                        class="w-full bg-[#15803d] text-white py-4 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-[#166534] transition-all flex items-center justify-center gap-3">
                        <span>Unlock Vault</span>
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- INSTITUTIONAL PASSWORD EDIT OVERLAY -->
    <div id="vault-password-edit-overlay"
        class="hidden fixed inset-0 bg-white/90 backdrop-blur-md z-[1000] flex items-center justify-center p-6 animate-in fade-in duration-500">
        <div class="w-full max-w-[400px] bg-white rounded-none shadow-2xl border border-black p-8 relative">
            <div class="flex justify-between items-center mb-8">
                <h3 class="text-[14px] font-black text-black uppercase tracking-[0.2em]">Change Institutional Password</h3>
                <button onclick="window.closePasswordChange()" class="text-black">
                    <i class="fa-solid fa-xmark text-lg"></i>
                </button>
            </div>

            <div class="space-y-6">
                <div class="space-y-2">
                    <label for="new-vault-password" class="text-[10px] font-black text-slate-400 uppercase tracking-widest">New Password</label>
                    <input type="password" id="new-vault-password"
                        placeholder="Enter new password"
                        class="w-full bg-slate-50 border border-slate-200 px-6 py-4 rounded-none text-sm font-bold text-black outline-none focus:border-black transition-all">
                </div>

                <div class="pt-4">
                    <button id="vault-password-save-btn" onclick="window.updateVaultPassword()"
                        class="w-full bg-[#15803d] text-white py-4 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-[#166534] transition-all flex items-center justify-center gap-3">
                        <span id="vault-password-save-label">Update Global Password</span>
                        <i id="vault-password-save-loading" class="fa-solid fa-circle-notch fa-spin hidden"></i>
                    </button>
                </div>
            </div>
        </div>
    </div>

<?php require_once __DIR__ . "/includes/footer.php"; ?>

