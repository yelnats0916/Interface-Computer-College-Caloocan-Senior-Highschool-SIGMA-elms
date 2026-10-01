<?php
/**
 * SIGMA ELMS - Teacher Portal Dashboard
 * Interface Computer College - Caloocan Senior High School ELMS
 */

$pageTitle = "Interface Computer College - Teacher";
$extraCss  = [
    "css/teacher.css",
    "css/classroom-room.css",
    "css/settings-view.css",
    "css/topic-detail.css",
    "css/sidebar.css"
];
$bodyClass = "bg-admin-bg min-h-screen font-['Inter'] flex flex-col sidebar-collapsed text-slate-700";
$extraHead = '<script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js"></script>';
$extraJs   = ["js/time-picker-dial.js", "js/classroom-room.js", "js/assessments-page.js", "js/teacher.js"];
$topbarHeaderId = "teacher-header";

require_once __DIR__ . "/../config/app.php";
require_once __DIR__ . "/includes/header.php";
require_once __DIR__ . "/includes/topbar.php";
?>

    <!-- ═══ REUSABLE TEACHER SIDEBAR ═════════════════════════════ -->
    <?php require_once __DIR__ . "/includes/sidebar_teacher.php"; ?>

    <!-- Mobile Sidebar Overlay -->
    <div id="sidebar-overlay"
        class="fixed left-0 right-0 bottom-0 bg-black/40 z-[200] hidden transition-opacity duration-300 lg:hidden"
        style="top: var(--shell-offset)"></div>

    <aside id="sub-sidebar" class="fixed z-[10500] hidden">
        <div id="sub-sidebar-header"
            class="px-4 py-4 border-b border-gray-100 bg-white flex items-center min-h-[60px] hidden">
            <h3 id="sub-sidebar-title" class="font-black text-gray-900 text-[15px] leading-tight truncate w-full">
                Subjects</h3>
        </div>
        <div id="sub-sidebar-content" class="flex-1 overflow-y-auto p-2 space-y-1"></div>
    </aside>

    <!-- ═══ LAYOUT WRAPPER ═══════════════════════════════════════ -->
    <div id="layout-wrapper" class="flex-1 flex flex-col min-w-0">
        <main id="main-content" class="flex-1 relative">
            <div id="content-sections" class="w-full min-h-full">

                <!-- DASHBOARD SECTION -->
                <section id="section-dashboard" class="dynamic-section hidden transition-opacity duration-300">
                    <div class="dashboard-grid">
                        <!-- 1. Left Section (3/12) - Sticky Metrics Rail -->
                        <div class="lg:col-span-3 mt-2 home-sticky-rail home-sticky-rail--left">
                            <div id="sigma-panels-container" class="max-h-[calc(100vh-106px)] overflow-y-auto pr-2">
                                <!-- Populated dynamically by js/pocket-card.js with 4 initial cards and More expansion -->
                            </div>
                        </div>

                        <!-- 2. Middle Section (6/12) -->
                        <div class="lg:col-span-6 space-y-3.5 mt-2 main-dashboard-column">
                            <!-- Welcome Panel (Shared Template) -->
                            <?php
                                $welcomeImgId = "welcome-panel-teacher-img";
                                $welcomeRole  = "teacher";
                                require __DIR__ . "/includes/home_welcome_panel.php";
                            ?>

                            <!-- Composer Trigger (Shared Template) -->
                            <?php require __DIR__ . "/includes/home_composer_trigger.php"; ?>

                            <!-- Feed Tabs + Container (Shared Template: 3 tabs for teacher) -->
                            <?php
                                $feedContainerId = "admin-announcements-feed";
                                $showPostsTab    = true;
                                require __DIR__ . "/includes/home_feed_tabs.php";
                            ?>
                        </div>

                        <!-- 3. Right Section (3/12) - Sticky Sidebar -->
                        <div class="lg:col-span-3 sticky top-[106px] mt-2 home-sticky-rail home-sticky-rail--right">
                            <div class="home-dashboard-panels pb-8" id="teacher-home-dashboard-combined-list">
                                <section class="home-dashboard-group">
                                    <div id="teacher-class-panel-slot" class="home-dashboard-list"></div>
                                </section>
                                <section class="home-dashboard-group">
                                    <div id="teacher-submissions-panel-slot" class="home-dashboard-list"></div>
                                </section>
                            </div>
                        </div>
                    </div>
                </section><!-- END section-dashboard -->

                <!-- PROFILE SECTION (Standardized) -->
                <?php require_once __DIR__ . "/includes/user_profile_view.php"; ?>
                <section id="user-settings-view" class="dynamic-section hidden" data-shared-settings-view></section>



                <!-- ══ CLASSROOM DETAIL ════════════════════════════════ -->
                <section id="section-classroom-detail" class="dynamic-section hidden">
                    <div class="classroom-room-container">
                        <div id="classroom-detail-view" class="classroom-detail-shell">
                            <!-- Enhanced Header: Shared Classroom Room Banner -->
                            <div id="teacher-classroom-banner-wrapper" class="relative mb-0 w-full"></div>
                                <div id="classes-detail-tabs" class="hidden classroom-detail-tabs">
                                    <div class="flex items-center justify-between w-full">
                                        <div class="flex items-center gap-2 overflow-x-auto">
                                            <button onclick="switchClassDetailTab('room')" id="tab-btn-room"
                                                class="teacher-section-tab active"><i class="fa-solid fa-chalkboard"></i><span>Room</span></button>
                                            <button onclick="switchClassDetailTab('attendance')" id="tab-btn-attendance"
                                                class="teacher-section-tab"><i class="fa-solid fa-calendar-check"></i><span>Attendance</span></button>
                                            <button onclick="switchClassDetailTab('members')" id="tab-btn-members"
                                                class="teacher-section-tab"><i class="fa-solid fa-users"></i><span>Members</span></button>
                                        </div>

                                        <!-- Relocated Quick Actions / Settings -->
                                        <div class="flex items-center gap-2">
                                            <div class="relative hide-on-mobile">
                                                <button id="classroom-quick-settings-btn" class="classroom-quick-btn"
                                                    title="Settings">
                                                    <i class="fa-solid fa-gear"></i>
                                                </button>
                                                <div id="classroom-settings-menu"
                                                    class="classroom-settings-menu hidden">
                                                    <!-- Comments Toggle Row -->
                                                    <div class="classroom-settings-item flex items-center justify-between px-3.5 py-2.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer select-none"
                                                        onclick="window.handleClassroomCommentsRowClick && window.handleClassroomCommentsRowClick(event)">
                                                        <div class="flex items-center gap-2.5">
                                                            <i class="fa-regular fa-comments text-black text-[13px] w-4 text-center"></i>
                                                            <span class="text-[13px] font-semibold text-black tracking-tight">Student Comment</span>
                                                        </div>
                                                        <label class="sigma-toggle-switch" onclick="event.stopPropagation()">
                                                            <input type="checkbox" id="classroom-comments-toggle-switch" onchange="window.toggleCurrentClassroomComments && window.toggleCurrentClassroomComments(event)" aria-label="Toggle classroom comments switch">
                                                            <span class="sigma-toggle-slider"></span>
                                                        </label>
                                                    </div>
                                                    <!-- Customize Banner Button -->
                                                    <button type="button"
                                                        onclick="window.openCurrentClassroomCustomizer && window.openCurrentClassroomCustomizer()"
                                                        class="classroom-settings-item flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl hover:bg-slate-100 transition-colors w-full text-left text-[13px] font-semibold text-black cursor-pointer">
                                                        <i class="fa-solid fa-palette text-black text-[13px] w-4 text-center"></i>
                                                        <span class="text-black">Customize Banner</span>
                                                    </button>
                                                </div>
                                            </div>

                                            <!-- Mobile Ellipsis Dropdown -->
                                            <div class="relative show-on-mobile">
                                                <button id="classroom-mobile-ellipsis-btn" class="classroom-quick-btn"
                                                    onclick="document.getElementById('classroom-mobile-dropdown').classList.toggle('hidden')">
                                                    <i class="fa-solid fa-ellipsis-vertical"></i>
                                                </button>
                                                <div id="classroom-mobile-dropdown"
                                                    class="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-[14px] shadow-lg hidden z-50 flex flex-col py-2"
                                                    style="font-family:'Inter', sans-serif;">
                                                    <button
                                                        onclick="window.openCurrentClassroomTopics && window.openCurrentClassroomTopics(); document.getElementById('classroom-mobile-dropdown').classList.add('hidden')"
                                                        class="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 w-full text-left transition-colors"
                                                        style="color:#000000; font-weight:400; font-size:15px;">
                                                        <i class="fa-solid fa-book w-5 text-center text-slate-700"></i>
                                                        <span
                                                            style="color:#000000; font-weight:400; text-transform:capitalize;">Topics</span>
                                                    </button>
                                                    <button
                                                        onclick="switchClassDetailTab('members'); document.getElementById('classroom-mobile-dropdown').classList.add('hidden')"
                                                        class="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 w-full text-left transition-colors"
                                                        style="color:#000000; font-weight:400; font-size:15px;">
                                                        <i class="fa-solid fa-users w-5 text-center text-slate-700"></i>
                                                        <span
                                                            style="color:#000000; font-weight:400; text-transform:capitalize;">Members</span>
                                                    </button>
                                                    <button
                                                        onclick="window.returnToSections && window.returnToSections(); document.getElementById('classroom-mobile-dropdown').classList.add('hidden')"
                                                        class="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 w-full text-left transition-colors"
                                                        style="color:#000000; font-weight:400; font-size:15px;">
                                                        <i
                                                            class="fa-solid fa-door-open w-5 text-center text-slate-700"></i>
                                                        <span
                                                            style="color:#000000; font-weight:400; text-transform:capitalize;">My Classes</span>
                                                    </button>
                                                    <button
                                                        onclick="document.getElementById('classroom-mobile-dropdown').classList.add('hidden'); window.openCurrentClassroomCustomizer && window.openCurrentClassroomCustomizer();"
                                                        class="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 w-full text-left transition-colors"
                                                        style="color:#000000; font-weight:400; font-size:15px;">
                                                        <i class="fa-solid fa-palette w-5 text-center text-slate-700"></i>
                                                        <span
                                                            style="color:#000000; font-weight:400; text-transform:capitalize;">Customize Banner</span>
                                                    </button>
                                                    <button
                                                        onclick="document.getElementById('classroom-mobile-dropdown').classList.add('hidden'); document.getElementById('classroom-quick-settings-btn').click();"
                                                        class="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 w-full text-left transition-colors"
                                                        style="color:#000000; font-weight:400; font-size:15px;">
                                                        <i class="fa-solid fa-gear w-5 text-center text-slate-700"></i>
                                                        <span
                                                            style="color:#000000; font-weight:400; text-transform:capitalize;">Settings</span>
                                                    </button>
                                                </div>
                                            </div>

                                        </div>
                                    </div>
                                </div>

                                <!-- Tab Contents -->
                                <div id="class-detail-content" class="classroom-detail-content">
                                    <!-- Room Tab -->
                                    <div id="detail-section-room" class="classroom-room-panel classroom-tab-section">
                                        <div class="classroom-room-panel__inner">
                                            <div class="classroom-room-layout">
                                                <!-- Left Column: Announcements Stream (Reduced Width) -->
                                                <div class="classroom-room-main flex-1 min-w-0 w-full space-y-4">
                                                    <!-- Announcement Composer Trigger Card (Matches Home Composer Trigger) -->
                                                    <div class="bg-white border border-slate-200 standard-panel-shadow rounded-[22px] p-3 w-full">
                                                        <button type="button"
                                                            onclick="window.openClassroomComposer && window.openClassroomComposer()"
                                                            class="w-full h-10 bg-slate-100 hover:bg-slate-200 transition-all rounded-full px-6 text-left text-slate-500 text-[13px] font-medium flex items-center gap-3 group cursor-pointer">
                                                            <i class="fa-solid fa-bullhorn text-[12px] text-slate-400"></i>
                                                            <span>What do you want to announce?</span>
                                                        </button>
                                                    </div>

                                                    <div id="room-announcements-feed"
                                                        class="room-announcements-feed w-full"></div>
                                                </div>

                                                <!-- Right Column: Submissions Sidebar -->
                                                <div class="classroom-room-sidebar w-full lg:w-[280px] xl:w-[320px] flex-shrink-0">
                                                    <div class="space-y-3.5 sticky top-6 classroom-room-sidebar__stack">
                                                        <!-- Classwork Quick Links (1 Panel, No Title) -->
                                                        <div class="home-dashboard-card flex flex-col w-full !gap-1 flex-shrink-0">
                                                            <button type="button"
                                                                onclick="switchClassDetailTab('topics')"
                                                                class="w-full py-2.5 px-2.5 -mx-2.5 rounded-xl flex items-center justify-between text-left bg-transparent hover:bg-slate-100 cursor-pointer font-['Inter'] transition-colors">
                                                                <div class="flex items-center gap-2.5">
                                                                    <i class="fa-solid fa-book text-[#15803d] text-sm w-4 text-center shrink-0"></i>
                                                                    <span class="text-sm font-bold text-black">View Topics</span>
                                                                </div>
                                                                <i class="fa-solid fa-arrow-right text-xs text-[#15803d]"></i>
                                                            </button>
                                                            <div class="h-px bg-slate-100 my-0.5 -mx-2.5"></div>
                                                            <button type="button"
                                                                onclick="window.openTeacherClassroomGradebook?.()"
                                                                class="w-full py-2.5 px-2.5 -mx-2.5 rounded-xl flex items-center justify-between text-left bg-transparent hover:bg-slate-100 cursor-pointer font-['Inter'] transition-colors">
                                                                <div class="flex items-center gap-2.5">
                                                                    <i class="fa-solid fa-table-list text-[#15803d] text-sm w-4 text-center shrink-0"></i>
                                                                    <span class="text-sm font-bold text-black">View Gradebook</span>
                                                                </div>
                                                                <i class="fa-solid fa-arrow-right text-xs text-[#15803d]"></i>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Members Tab -->
                                    <div id="detail-section-members" class="hidden space-y-6 classroom-tab-section"></div>

                                    <div id="detail-section-students" class="hidden space-y-4 classroom-tab-section">
                                        <div class="mt-0 classroom-tab-surface">
                                            <div class="flex items-center justify-between mb-6">
                                                <h2
                                                    class="text-sm font-black text-black uppercase tracking-widest leading-none">
                                                    Student Roster</h2>
                                                <div class="flex items-center gap-2">
                                                    <span
                                                        class="px-3 py-1 bg-green-50 text-green-600 text-[10px] font-bold rounded-full">38
                                                        Active</span>
                                                </div>
                                            </div>
                                            <div class="overflow-x-auto">
                                                <table class="w-full text-left border-collapse">
                                                    <thead>
                                                        <tr class="bg-[#15803d] border-b border-[#166534] select-none text-white">
                                                            <th class="px-6 py-4 text-xs md:text-sm font-semibold text-white tracking-normal font-['Inter']">Student Name</th>
                                                            <th class="px-6 py-4 text-xs md:text-sm font-semibold text-white tracking-normal font-['Inter']">Status</th>
                                                            <th class="px-6 py-4 text-xs md:text-sm font-semibold text-white tracking-normal font-['Inter'] text-right">Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody id="student-roster-body" class="divide-y divide-gray-50">
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Attendance Tab (Now Recording Interface) -->
                                    <div id="detail-section-attendance" class="hidden space-y-4 classroom-tab-section">
                                        <!-- Content removed per user request. Will be updated later. -->
                                    </div>

                                    <!-- Performance Tab (Hidden) -->
                                    <div id="detail-section-analytics" class="hidden space-y-6 classroom-tab-section">
                                        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div
                                                class="bg-white p-6 rounded-2xl border border-gray-100 standard-panel-shadow col-span-2">
                                                <h3
                                                    class="text-sm font-black text-gray-800 uppercase tracking-widest mb-6">
                                                    Class Progress Overview</h3>
                                                <div class="h-64 flex items-end justify-between gap-4 px-4">
                                                    <div
                                                        class="flex-1 bg-icc-light/50 rounded-t-lg relative group h-[60%]">
                                                        <div
                                                            class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                                            Week 1: 82%</div>
                                                    </div>
                                                    <div
                                                        class="flex-1 bg-icc-light/50 rounded-t-lg relative group h-[75%]">
                                                        <div
                                                            class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                                            Week 2: 88%</div>
                                                    </div>
                                                    <div
                                                        class="flex-1 bg-icc rounded-t-lg relative group h-[85%] shadow-lg shadow-icc/10">
                                                        <div
                                                            class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                                            Week 3: 92%</div>
                                                    </div>
                                                    <div class="flex-1 bg-gray-100 rounded-t-lg h-[40%]"></div>
                                                    <div class="flex-1 bg-gray-100 rounded-t-lg h-[30%]"></div>
                                                </div>
                                                <div
                                                    class="flex justify-between mt-4 px-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                                    <span>Week 1</span><span>Week 2</span><span>Week
                                                        3</span><span>Week
                                                        4</span><span>Week 5</span>
                                                </div>
                                            </div>
                                            <div
                                                class="bg-white p-6 rounded-2xl border border-gray-100 standard-panel-shadow">
                                                <h3
                                                    class="text-sm font-black text-gray-800 uppercase tracking-widest mb-4">
                                                    Top Performers</h3>
                                                <div class="space-y-4">
                                                    <div
                                                        class="flex items-center justify-between p-2 bg-icc-light/20 rounded-xl">
                                                        <div class="flex items-center gap-3">
                                                            <div
                                                                class="w-8 h-8 rounded-full bg-icc text-white flex items-center justify-center text-[10px] font-black">
                                                                1</div>
                                                            <span class="text-xs font-bold text-gray-800">Bautista,
                                                                <span
                                                                    class="view-user-firstName-banner">Firstname</span></span>
                                                        </div>
                                                        <span class="text-xs font-black text-icc">98.5%</span>
                                                    </div>
                                                    <div
                                                        class="flex items-center justify-between p-2 hover:bg-gray-50 rounded-xl transition-colors">
                                                        <div class="flex items-center gap-3">
                                                            <div
                                                                class="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-[10px] font-black">
                                                                2</div>
                                                            <span class="text-xs font-bold text-gray-800">Dela Cruz,
                                                                Juan</span>
                                                        </div>
                                                        <span class="text-xs font-black text-gray-400">96.2%</span>
                                                    </div>
                                                    <div
                                                        class="flex items-center justify-between p-2 hover:bg-gray-50 rounded-xl transition-colors">
                                                        <div class="flex items-center gap-3">
                                                            <div
                                                                class="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-[10px] font-black">
                                                                3</div>
                                                            <span class="text-xs font-bold text-gray-800">Garcia,
                                                                Ana</span>
                                                        </div>
                                                        <span class="text-xs font-black text-gray-400">95.8%</span>
                                                    </div>
                                                </div>
                                                <button
                                                    class="w-full mt-6 py-2 text-[10px] font-black text-icc uppercase tracking-widest hover:underline">View
                                                    All Rankings</button>
                                            </div>
                                        </div>
                                    </div>

                                    <div id="detail-section-topics" class="hidden space-y-6 classroom-tab-section">
                                        <!-- Module List -->
                                        <div class="space-y-6 pt-6">
                                            <div class="flex items-center justify-between mb-4 px-6">
                                                <div id="admin-sync-indicator"
                                                    class="hidden flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full border border-blue-100">
                                                    <i class="fa-solid fa-rotate text-[10px] animate-spin"></i>
                                                    <span class="text-[10px] font-black uppercase tracking-widest">Admin
                                                        Sync Active</span>
                                                </div>
                                                <!-- Add Materials Trigger -->
                                                <div class="relative">
                                                    <button type="button" onclick="toggleMaterialsPopup()"
                                                        class="text-sm font-bold text-black transition-colors hover:text-[#FFD000] flex items-center gap-2 py-2">
                                                        <i class="fa-solid fa-plus text-xs"></i>
                                                        Add Materials
                                                    </button>

                                                    <!-- Materials Small Panel -->
                                                    <div id="materials-popup-panel"
                                                        class="hidden absolute top-full left-0 mt-2 w-48 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden animate-slide-up-sm">
                                                        <div class="px-5 py-3 border-b border-gray-50 bg-gray-50/50">
                                                            <h3
                                                                class="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                                Materials</h3>
                                                        </div>
                                                        <div class="p-1">
                                                            <button type="button" onclick="switchTab('nav-materials')"
                                                                class="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-gray-700 hover:bg-gray-50 hover:text-[#FFD000] rounded-xl transition-all group text-left">
                                                                <i
                                                                    class="fa-solid fa-folder-open text-gray-300 group-hover:text-[#FFD000] w-4 text-center"></i>
                                                                Storage
                                                            </button>
                                                            <button type="button"
                                                                onclick="window.toggleUploadMaterialOverlay(true)"
                                                                class="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-gray-700 hover:bg-gray-50 hover:text-[#FFD000] rounded-xl transition-all group text-left">
                                                                <i
                                                                    class="fa-solid fa-cloud-arrow-up text-gray-300 group-hover:text-[#FFD000] w-4 text-center"></i>
                                                                Upload Material
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div id="materials-list-grid"
                                                class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                </section>


                <!-- MATERIALS SECTION -->
                <section id="section-materials" class="dynamic-section hidden">

                    <!-- Content View (Grid) -->
                    <div id="materials-content-view" class="space-y-6 p-8">
                        <div class="flex items-center justify-between mb-8">
                            <div class="flex items-center gap-3">
                            </div>
                            <div id="admin-sync-indicator-main"
                                class="hidden flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full border border-blue-100">
                                <i class="fa-solid fa-rotate text-[10px] animate-spin"></i>
                                <span class="text-[10px] font-black uppercase tracking-widest">Admin Sync
                                    Active</span>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <!-- Sample Content -->
                            <div
                                class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:border-icc transition-all cursor-pointer group">
                                <div class="flex items-center justify-between mb-4">
                                    <div
                                        class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-icc group-hover:text-white transition-all">
                                        <i class="fa-solid fa-file-pdf text-lg"></i>
                                    </div>
                                    <span class="text-[9px] font-black text-gray-400 uppercase tracking-widest">Module
                                        1</span>
                                </div>
                                <h4 class="text-sm font-bold text-gray-800 mb-1">Course Introduction</h4>
                                <p class="text-[10px] text-gray-400 mb-4">PDF • 2.4 MB • Updated 2 days ago</p>
                                <div class="flex items-center justify-between pt-4 border-t border-gray-50">
                                    <span class="text-[10px] font-bold text-icc bg-icc-light px-2 py-0.5 rounded">Ready
                                        to Release</span>
                                    <button class="text-gray-400 hover:text-icc transition-colors"><i
                                            class="fa-solid fa-paper-plane text-xs"></i></button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section id="section-curriculum-page" class="dynamic-section hidden">
                    <div class="mx-auto max-w-[1024px] w-full">
                        <div id="curriculum-page-shell"
                            class="bg-white border-x border-slate-200 min-h-screen standard-panel-shadow"></div>
                    </div>
                </section>

                <section id="section-topic-detail" class="dynamic-section hidden">
                </section>

                <section id="section-topic-content" class="dynamic-section hidden">
                </section>

                <!-- ══ ASSESSMENTS SECTION ═════════════════════════════ -->
                <section id="section-assessments" class="dynamic-section hidden">
                    <div class="w-full">
                        <div id="assessments-layout" class="w-full h-full"></div>
                    </div>
                </section>

                <!-- ═══ GRADES SECTION ════════════════════════════════ -->
                <section id="section-grades" class="dynamic-section hidden">
                </section>



                <!-- ══ RESOURCES VIEW ════════════════════════════════ -->
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
                                        <input type="text" id="teacher-resources-search-input" aria-label="Search teacher resources" name="resources-search-input" maxlength="100" placeholder="Search resources..."
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
                                                        class="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-black w-2/5">
                                                        File Name</th>
                                                    <th
                                                        class="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-black">
                                                        Type</th>
                                                    <th
                                                        class="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-black">
                                                        Size</th>
                                                    <th
                                                        class="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-black">
                                                        Uploaded By</th>
                                                    <th
                                                        class="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-black text-right">
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
                                                                    Course_Syllabus_Programming1.docx</p>
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
                                                                FA</div>
                                                            <p class="text-xs font-medium text-slate-600">Faculty Admin
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
                                                                    Grading_Rubric_Template.xlsx</p>
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
                                                                FA</div>
                                                            <p class="text-xs font-medium text-slate-600">Faculty Admin
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
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                </section>

                <!-- ATTENDANCE SECTION -->
                <section id="section-attendance"
                    class="dynamic-section hidden flex-1 flex flex-col overflow-hidden pt-6 px-4 pb-4">
                    <div class="mb-2 flex flex-col md:flex-row items-center justify-start gap-3 flex-shrink-0">

                        <div class="flex items-center gap-3">
                            <div class="relative group">
                                <select id="attendance-year-select" aria-label="Select attendance year"
                                    class="px-9 py-2 bg-white border border-gray-300 rounded-full text-xs font-bold text-gray-800 focus:outline-none focus:border-icc appearance-none cursor-pointer shadow-sm min-w-[100px]">
                                    <option value="2019">2019</option>
                                    <option value="2020">2020</option>
                                    <option value="2021">2021</option>
                                    <option value="2022">2022</option>
                                    <option value="2023">2023</option>
                                    <option value="2024">2024</option>
                                    <option value="2025">2025</option>
                                    <option value="2026" selected>2026</option>
                                    <option value="2027">2027</option>
                                </select>
                                <button type="button" onclick="stepAttendanceSelect('attendance-year-select', -1)"
                                    class="absolute left-3 top-1/2 -translate-y-1/2 text-base font-black text-gray-500 hover:text-icc-yellow transition-colors z-10 leading-none bg-transparent border-none shadow-none outline-none focus:outline-none focus:ring-0 active:bg-transparent">&lt;</button>
                                <button type="button" onclick="stepAttendanceSelect('attendance-year-select', 1)"
                                    class="absolute right-3 top-1/2 -translate-y-1/2 text-base font-black text-gray-500 hover:text-icc-yellow transition-colors z-10 leading-none bg-transparent border-none shadow-none outline-none focus:outline-none focus:ring-0 active:bg-transparent">&gt;</button>
                            </div>

                            <div class="relative group">
                                <select id="attendance-month-select" aria-label="Select attendance month"
                                    class="px-9 py-2 bg-white border border-gray-300 rounded-full text-xs font-bold text-gray-800 focus:outline-none focus:border-icc appearance-none cursor-pointer shadow-sm min-w-[140px]">
                                    <option value="0">January</option>
                                    <option value="1">February</option>
                                    <option value="2" selected>March</option>
                                    <option value="3">April</option>
                                    <option value="4">May</option>
                                    <option value="5">June</option>
                                    <option value="6">July</option>
                                    <option value="7">August</option>
                                    <option value="8">September</option>
                                    <option value="9">October</option>
                                    <option value="10">November</option>
                                    <option value="11">December</option>
                                </select>
                                <button type="button" onclick="stepAttendanceSelect('attendance-month-select', -1)"
                                    class="absolute left-3 top-1/2 -translate-y-1/2 text-base font-black text-gray-500 hover:text-icc-yellow transition-colors z-10 leading-none bg-transparent border-none shadow-none outline-none focus:outline-none focus:ring-0 active:bg-transparent">&lt;</button>
                                <button type="button" onclick="stepAttendanceSelect('attendance-month-select', 1)"
                                    class="absolute right-3 top-1/2 -translate-y-1/2 text-base font-black text-gray-500 hover:text-icc-yellow transition-colors z-10 leading-none bg-transparent border-none shadow-none outline-none focus:outline-none focus:ring-0 active:bg-transparent">&gt;</button>
                            </div>

                            <button id="attendance-today-btn"
                                class="px-5 py-2 bg-white border border-gray-200 text-gray-600 rounded-full text-xs font-bold shadow-sm hover:bg-gray-100 transition-colors focus:outline-none focus:ring-0">Today</button>
                        </div>
                    </div>

                    <div id="attendance-calendar-shell"
                        class="flex-1 bg-white rounded-xl border border-black shadow-sm flex flex-col overflow-hidden relative w-full max-w-6xl ml-0 mb-0">
                        <div class="grid grid-cols-7 border-b border-black bg-white flex-shrink-0">
                            <div
                                class="py-3 text-[10px] font-black text-black uppercase tracking-widest text-center bg-icc-yellow border-r border-black">
                                Sun</div>
                            <div
                                class="py-3 text-[10px] font-black text-black uppercase tracking-widest text-center bg-icc border-r border-black">
                                Mon</div>
                            <div
                                class="py-3 text-[10px] font-black text-black uppercase tracking-widest text-center bg-icc border-r border-black">
                                Tue</div>
                            <div
                                class="py-3 text-[10px] font-black text-black uppercase tracking-widest text-center bg-icc border-r border-black">
                                Wed</div>
                            <div
                                class="py-3 text-[10px] font-black text-black uppercase tracking-widest text-center bg-icc border-r border-black">
                                Thu</div>
                            <div
                                class="py-3 text-[10px] font-black text-black uppercase tracking-widest text-center bg-icc border-r border-black">
                                Fri</div>
                            <div
                                class="py-3 text-[10px] font-black text-black uppercase tracking-widest text-center bg-icc-yellow border-r border-black">
                                Sat</div>
                        </div>

                        <div id="attendance-full-calendar-grid" class="flex-1 grid grid-cols-7 overflow-hidden">
                        </div>

                    </div>
                </section>
        </main>
    </div>

    <!-- Mobile Bottom App Bar -->
    <div id="mobile-bottom-appbar" class="mobile-bottom-appbar">
        <button type="button" id="mobile-appbar-profile" class="mobile-bottom-appbar__btn" aria-label="Profile">
            <i class="fa-solid fa-user"></i>
        </button>
        <button type="button" id="mobile-appbar-calendar" class="mobile-bottom-appbar__btn" aria-label="Calendar">
            <i class="fa-solid fa-calendar-days"></i>
        </button>
        <button type="button" id="mobile-appbar-sigma"
            class="mobile-bottom-appbar__btn mobile-bottom-appbar__btn--sigma" aria-label="SIGMA panels">
            <i class="fa-solid fa-bolt"></i>
        </button>
        <button type="button" id="mobile-appbar-notifications" class="mobile-bottom-appbar__btn"
            aria-label="Notifications">
            <i class="fa-solid fa-bell"></i>
        </button>
    </div>

    <div id="mobile-sigma-sheet-backdrop" class="mobile-sigma-sheet-backdrop"></div>
    <div id="mobile-sigma-sheet" class="mobile-sigma-sheet">
        <div class="mobile-sigma-sheet__grab"></div>
        <div class="mobile-sigma-sheet__head">
            <span class="mobile-sigma-sheet__title">SIGMA Analytics</span>
            <button type="button" id="mobile-sigma-sheet-close" class="mobile-sigma-sheet__close" aria-label="Close">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>
        <div class="mobile-sigma-cards custom-scrollbar" id="mobile-sigma-cards"></div>
    </div>

    <!-- Notification Pull-up -->
    <div id="mobile-noti-panel" class="mobile-pull-up-panel">
        <div class="mobile-pull-up-header">
            <span class="mobile-pull-up-title">Notifications</span>
            <button type="button" class="mobile-pull-up-close" onclick="closeMobilePanel('mobile-noti-panel')">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>
        <div class="mobile-pull-up-content">
            <div class="space-y-4">
                <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p class="text-xs font-black text-icc uppercase tracking-widest mb-1">New Submission</p>
                    <p class="text-sm font-bold text-slate-800">Juan Abad submitted: Logic Gates Quiz</p>
                    <p class="text-[11px] text-slate-500 mt-1">Grade 11 - ICT A • 10:45 AM</p>
                </div>
                <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p class="text-xs font-black text-blue-600 uppercase tracking-widest mb-1">Class Schedule</p>
                    <p class="text-sm font-bold text-slate-800">Next Class in 15 mins</p>
                    <p class="text-[11px] text-slate-500 mt-1">Web Development 1 • Room Lab 2</p>
                </div>
                <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p class="text-xs font-black text-yellow-600 uppercase tracking-widest mb-1">Announcement</p>
                    <p class="text-sm font-bold text-slate-800">2nd Quarter Updates</p>
                    <p class="text-[11px] text-slate-500 mt-1">Your announcement reached 45 students.</p>
                </div>
            </div>
        </div>
    </div>

    <!-- Calendar Pull-up -->
    <div id="mobile-calendar-panel" class="mobile-pull-up-panel">
        <div class="mobile-pull-up-header">
            <span class="mobile-pull-up-title">Calendar & Schedule</span>
            <button type="button" class="mobile-pull-up-close" onclick="closeMobilePanel('mobile-calendar-panel')">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>
        <div class="mobile-pull-up-content">
            <div id="mobile-calendar-container" class="mb-6">
                <!-- Inline calendar will be rendered here -->
            </div>
            <div class="mt-4 text-center">
                <button class="text-icc font-black uppercase tracking-widest text-xs">View Calendar →</button>
            </div>

            <div class="mt-8 space-y-6">
                <div>
                    <div class="p-4 bg-icc/5 rounded-2xl border border-icc/10">
                        <p class="text-sm font-bold text-slate-800">Web Development 1</p>
                        <p class="text-[11px] text-icc font-black mt-1">TODAY • 1:30 PM - 3:00 PM</p>
                        <p class="text-[10px] text-slate-500 mt-1">Room Lab 2 • Grade 11 - ICT A</p>
                    </div>
                </div>

                <div>
                    <div class="p-4 bg-red-50 rounded-2xl border border-red-100">
                        <p class="text-sm font-bold text-slate-800">Logic Gates Exercise</p>
                        <p class="text-[11px] text-red-600 font-black mt-1">DUE TODAY • 11:59 PM</p>
                    </div>
                </div>

                <div>
                    <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p class="text-sm font-bold text-slate-800">Final Project Proposal</p>
                        <p class="text-[11px] text-slate-500 font-black mt-1">DUE MAY 15 • 11:59 PM</p>
                    </div>
                </div>
            </div>
        </div>
    </div>




    <!-- ═══ LEAVE ROOM MODAL ══════════════════════════════════════ -->
    <div id="leaveRoomModal" class="hidden fixed inset-0 z-[10000] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
        <div class="bg-white rounded-[2.5rem] p-10 max-w-sm w-full relative z-10 shadow-2xl">
            <div class="text-center mb-8">
                <h3 class="text-2xl font-black text-gray-900 tracking-tight">Do you want to leave the room?</h3>
            </div>
            <div class="flex flex-col gap-3">
                <button onclick="confirmLeaveRoom()"
                    class="w-full py-4 bg-red-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.15em] shadow-lg shadow-red-200 hover:bg-red-700 transition-all transform active:scale-95">Yes</button>
                <button onclick="closeLeaveRoomModal()"
                    class="w-full py-4 bg-gray-50 text-gray-500 rounded-2xl text-[11px] font-black uppercase tracking-[0.15em] hover:bg-gray-100 transition-all">No</button>
            </div>
        </div>
    </div>

    <!-- Calendar Dropdown -->
    <div id="calendar-dropdown"
        class="header-panel hidden fixed right-0 top-[82px] h-[calc(100vh-82px)] w-[400px] bg-white border-l border-slate-200 flex flex-col z-[300] rounded-l-[24px] overflow-y-auto custom-scrollbar font-['Inter']">
        <!-- Top Title Bar (Identical to Notifications) -->
        <div class="calendar-header">
            <h3 class="calendar-header__title">Calendar</h3>
        </div>

        <!-- Month Navigation & Calendar Grid -->
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
                <!-- Populated by JS -->
            </div>

            <!-- View Calendar Link -->
            <div class="mt-6 mb-2 flex justify-center">
                <a href="#" class="view-calendar-anchor" aria-label="View Calendar">
                    View Calendar →
                </a>
            </div>
        </div>

        <div class="calendar-dropdown-summary flex-1 px-8 py-5 space-y-5 bg-white border-t border-gray-100 hidden">
            <div>
                <div id="calendarDropdownUpcomingClassList" class="space-y-3"></div>
            </div>
            <div>
                <div id="calendarDropdownAssessmentList" class="space-y-3"></div>
            </div>
        </div>

        <!-- Bottom Division Line -->
        <div class="border-t border-gray-100 w-full mt-auto"></div>
    </div>

    <!-- Notifications Dropdown -->
    <div id="noti-dropdown"
        class="header-panel hidden fixed right-0 top-[82px] h-[calc(100vh-82px)] w-[400px] bg-white border-l border-slate-200 flex flex-col z-[300] rounded-l-[24px] overflow-hidden font-['Inter']">
        <!-- Top Title Bar -->
        <div class="notif-header">
            <h3 class="notif-header__title">Notifications</h3>
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

    <!-- TEACHER MATERIAL UPLOAD OVERLAY (Full Screen Workstation) -->
    <div id="teacher-material-upload-overlay"
        class="fixed inset-0 bg-slate-50 z-[2000] hidden flex flex-col items-center p-0 overflow-y-auto">

        <!-- Exit Control (Far Right) -->
        <button type="button" onclick="window.toggleUploadMaterialOverlay(false)"
            class="fixed top-10 right-10 w-12 h-12 rounded-full hover:bg-slate-200 flex items-center justify-center text-black transition-all z-[2001]"
            title="Exit Editor">
            <i class="fa-solid fa-xmark text-xl"></i>
        </button>

        <div class="mx-auto max-w-[1024px] w-full p-0 animate-in slide-in-from-top-4 duration-500">
            <!-- White Panel (Full Height Column) -->
            <div
                class="bg-white border-x border-slate-200 min-h-screen p-0 shadow-sm relative flex flex-col overflow-y-auto">
                <div class="border-b border-slate-50">
                    <div class="px-10 py-8">
                        <h1 class="text-2xl font-bold text-black tracking-tight">Upload Materials</h1>
                    </div>
                </div>

                <div class="p-10 space-y-8">
                    <div id="teacher-materials-main-view" class="space-y-8">
                        <div class="flex items-center justify-between mb-2">
                            <div>
                                <h3 class="text-lg font-bold text-black tracking-tight">Classroom Materials</h3>
                                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Add and
                                    organize subject content</p>
                            </div>

                            <div class="flex items-center gap-6">
                                <!-- Material Search Box -->
                                <div
                                    class="flex items-center bg-slate-50 border border-slate-100 rounded-xl px-4 py-1.5 gap-3 shadow-sm group focus-within:border-black transition-all">
                                    <input type="text" id="teacher-mat-search" aria-label="Search teacher material" name="teacher-mat-search" placeholder="Search Material"
                                        maxlength="50" autocomplete="off"
                                        oninput="window.renderTeacherMaterialsList()"
                                        class="bg-transparent border-0 outline-none text-[12px] font-medium text-black w-48 placeholder:text-slate-400 placeholder:text-[10px] placeholder:font-black placeholder:uppercase placeholder:tracking-widest">
                                    <button
                                        class="w-9 h-9 flex items-center justify-center bg-slate-100 rounded-lg text-black hover:bg-slate-200 transition-all">
                                        <i class="fa-solid fa-magnifying-glass text-[12px] text-black"></i>
                                    </button>
                                </div>

                                <!-- Add Material Dropdown -->
                                <div class="relative">
                                    <button id="teacher-add-material-trigger" type="button"
                                        onclick="window.toggleTeacherMaterialDropdown(event)"
                                        class="text-[11px] font-black uppercase tracking-[0.2em] text-black hover:text-[#FFD000] transition-colors flex items-center gap-2 bg-transparent border-0 p-0">
                                        <i class="fa-solid fa-plus text-[10px]"></i>
                                        Add Material
                                    </button>

                                    <!-- Dropdown Menu -->
                                    <div id="teacher-add-material-dropdown"
                                        class="absolute right-0 top-full mt-4 w-64 bg-white border border-slate-100 rounded-3xl shadow-2xl hidden z-[50] overflow-hidden">
                                        <div class="p-3 grid gap-1">
                                            <button type="button" onclick="window.addTeacherMaterial('Video')"
                                                class="w-full text-left px-6 py-4 hover:bg-slate-50 rounded-2xl transition-all">
                                                <span class="text-[12px] font-bold text-black">Add Video</span>
                                            </button>
                                            <button type="button" onclick="window.addTeacherMaterial('Lesson')"
                                                class="w-full text-left px-6 py-4 hover:bg-slate-50 rounded-2xl transition-all">
                                                <span class="text-[12px] font-bold text-black">Add Lesson</span>
                                            </button>
                                            <button type="button" onclick="window.addTeacherMaterial('Quiz')"
                                                class="w-full text-left px-6 py-4 hover:bg-slate-50 rounded-2xl transition-all">
                                                <span class="text-[12px] font-bold text-black">Add Quiz</span>
                                            </button>
                                            <button type="button" onclick="window.addTeacherMaterial('Task')"
                                                class="w-full text-left px-6 py-4 hover:bg-slate-50 rounded-2xl transition-all">
                                                <span class="text-[12px] font-bold text-black">Add Task</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Materials Grid Container -->
                        <div id="teacher-materials-grid" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        </div>

                        <!-- Empty State for Materials -->
                        <div id="teacher-materials-empty"
                            class="flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-[40px] border-2 border-dashed border-slate-200">
                            <i class="fa-solid fa-folder-open text-5xl mb-4 text-black-fade"></i>
                            <p class="text-sm font-bold text-black font-['Inter']">No Materials Added Yet</p>
                        </div>
                    </div>

                    <!-- Material Editor View -->
                    <div id="teacher-material-editor-view" class="hidden">
                        <!-- Dynamic content will be injected here -->
                    </div>
                </div>
            </div>
        </div>
    </div>
    <!-- SCRIPTS -->
    
<?php require_once __DIR__ . "/includes/footer.php"; ?>
