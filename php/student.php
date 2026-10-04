<?php
/**
 * SIGMA ELMS - Student Portal Dashboard
 * Interface Computer College - Caloocan Senior High School ELMS
 */

$pageTitle = "Interface Computer College - Student";
$extraCss  = "css/student.css";
$bodyClass = "bg-admin-bg min-h-screen font-['Inter'] flex flex-col sidebar-collapsed text-slate-700";
$extraHead = '<link rel="stylesheet" href="css/classroom-room.css"><script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js"></script>';
$extraJs   = ["js/classroom-room.js", "js/assessments-page.js", "js/student.js"];
$topbarHeaderId = "student-header";

require_once __DIR__ . "/../config/app.php";
require_once __DIR__ . "/includes/header.php";
require_once __DIR__ . "/includes/topbar.php";
?>

    <!-- ═══ REUSABLE STUDENT SIDEBAR ═════════════════════════════ -->
    <?php require_once __DIR__ . "/includes/sidebar_student.php"; ?>

    <!-- Mobile Sidebar Overlay -->
    <div id="sidebar-overlay"
        class="fixed left-0 right-0 bottom-0 bg-black/40 z-[200] hidden transition-opacity duration-300 lg:hidden"
        style="top: var(--shell-offset)"></div>

    <aside id="sub-sidebar" class="fixed z-[10500] bg-white border-r border-gray-100 flex-col hidden">
        <div id="sub-sidebar-header"
            class="px-4 py-4 border-b border-gray-100 bg-white flex items-center min-h-[60px] hidden">
            <h3 id="sub-sidebar-title" class="font-black text-gray-900 text-[15px] leading-tight truncate w-full">
                Subjects</h3>
        </div>
        <div id="sub-sidebar-content" class="flex-1 overflow-y-auto p-2 space-y-1"></div>
    </aside>

    <!-- LAYOUT WRAPPER -->
    <div id="layout-wrapper" class="flex-1 flex flex-col min-w-0">
        <main id="main-content" class="flex-1 relative">
            <div id="content-sections" class="w-full min-h-full">

                <!-- ══ HOME ════════════════════════════════════════ -->
                <section id="section-home" class="dynamic-section">
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
                                $welcomeImgId = "welcome-panel-student-img";
                                $welcomeRole  = "student";
                                require __DIR__ . "/includes/home_welcome_panel.php";
                            ?>

                            <!-- Feed Tabs + Container (Shared Template: 2 tabs for student) -->
                            <?php
                                $feedContainerId = "student-announcements-feed";
                                $showPostsTab    = false;
                                require __DIR__ . "/includes/home_feed_tabs.php";
                            ?>
                        </div>

                        <!-- 3. Right Section (3/12) -->
                        <div class="lg:col-span-3 sticky top-[106px] mt-2 home-sticky-rail home-sticky-rail--right">
                            <div class="home-dashboard-panels">
                                <section class="home-dashboard-group">
                                    <div id="student-home-next-class-list" class="home-dashboard-list"></div>
                                </section>
                                <section class="home-dashboard-group">
                                    <div id="student-home-due-submission-list" class="home-dashboard-list"></div>
                                </section>
                            </div>
                        </div> <!-- End lg:col-span-3 -->
                    </div> <!-- End grid -->
                </section>


                <!-- ══ ASSESSMENTS ═════════════════════════════════ -->
                <section id="section-assignments" class="dynamic-section hidden">
                    <div class="w-full">
                        <div id="assessments-layout" class="w-full h-full"></div>
                    </div>
                </section>

                <!-- ══ GRADES ══════════════════════════════════════ -->
                <section id="section-grades" class="dynamic-section hidden w-full min-h-[calc(100vh-var(--shell-offset))] bg-white">
                    <div class="w-full min-h-full bg-white p-0 relative flex flex-col">
                        <div id="grades-layout" class="w-full px-6 sm:px-10 md:px-12 py-8 max-w-none"></div>
                    </div>
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
                                        <input type="text" id="student-resources-search-input" aria-label="Search student resources" name="resources-search-input" maxlength="100" placeholder="Search resources..."
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
                                            <thead class="bg-slate-50 border-b border-slate-200">
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
                    </div>
                </section>

                <!-- ══ ATTENDANCE ══════════════════════════════════ -->
                <section id="section-attendance" class="dynamic-section hidden">
                    <div class="mx-auto max-w-[1024px] w-full standard-panel-shadow">
                        <div
                            class="bg-white border-x border-slate-200 min-h-[calc(100vh-var(--shell-offset))] p-0 relative flex flex-col">
                            <!-- Title Section -->
                            <div class="px-10 pt-4 pb-4">
                                <h2 class="text-3xl font-bold text-gray-800">Attendance</h2>
                                <p class="text-sm text-gray-500 mt-1">Your attendance records and weekly schedule</p>
                            </div>

                            <!-- Content Section -->
                            <div class="px-10 pb-10">
                                <div id="student-attendance-live-card"
                                    class="mb-6 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                    <div class="flex items-start justify-between gap-6">
                                        <div>
                                            <p id="student-attendance-live-label"
                                                class="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                Today's
                                                Status
                                            </p>
                                            <p id="student-attendance-live-value"
                                                class="text-3xl font-black text-gray-800 mt-2">
                                                Pending</p>
                                            <p id="student-attendance-live-meta" class="text-sm text-gray-500 mt-2">
                                                Waiting for
                                                teacher attendance confirmation.</p>
                                        </div>
                                        <div id="student-attendance-live-badge"
                                            class="px-4 py-2 rounded-xl bg-gray-100 text-gray-500 text-[10px] font-black uppercase tracking-widest">
                                            Pending
                                        </div>
                                    </div>
                                </div>

                                <div class="student-attendance-split-layout">
                                    <!-- Left: Attendance History Table -->
                                    <div class="student-attendance-split-layout__table bg-white rounded-[22px] border border-slate-200 standard-panel-shadow overflow-hidden flex flex-col">
                                        <div class="overflow-x-auto">
                                            <table class="w-full text-center border-collapse">
                                                <thead style="background-color: #15803d !important;">
                                                    <tr style="background-color: #15803d !important;" class="bg-[#15803d] select-none text-white">
                                                        <th style="background-color: #15803d !important; color: #ffffff !important;"
                                                            class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter']">
                                                            Date</th>
                                                        <th style="background-color: #15803d !important; color: #ffffff !important;"
                                                            class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter']">
                                                            Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody id="student-attendance-history-body" class="divide-y divide-slate-100">
                                                    <!-- Injected by JS -->
                                                </tbody>
                                            </table>
                                        </div>
                                        <div id="student-attendance-empty-state" class="hidden p-20 text-center">
                                            <i class="fa-solid fa-calendar-xmark text-4xl text-black-fade mb-4 block"></i>
                                            <p class="text-sm font-bold text-black">No Attendance Records Found</p>
                                        </div>
                                        <div class="p-3.5 border-t border-slate-100 bg-white flex items-center justify-center">
                                            <div id="student-attendance-pagination-controls" class="w-full flex items-center justify-center"></div>
                                        </div>
                                    </div>

                                    <!-- Right: Attendance Stat Cards (Vertical Stack) -->
                                    <div class="student-attendance-split-layout__stats">
                                        <!-- Stat 1: Overall Attendance Rate -->
                                        <div class="bg-white border border-slate-200 rounded-[22px] p-5 standard-panel-shadow flex items-center justify-between">
                                            <div>
                                                <p class="text-xs font-semibold text-black-fade font-['Inter'] mb-1" style="color: rgba(0, 0, 0, 0.45) !important;">Attendance</p>
                                                <h3 id="student-attendance-stat-percent" data-attendance-stat="percent" class="text-2xl font-black text-black font-['Inter'] leading-none">--</h3>
                                            </div>
                                            <div class="w-11 h-11 rounded-full bg-emerald-50 text-[#15803d] flex items-center justify-center text-lg shrink-0">
                                                <i class="fa-solid fa-chart-pie"></i>
                                            </div>
                                        </div>

                                        <!-- Stat 2: Present Days -->
                                        <div class="bg-white border border-slate-200 rounded-[22px] p-5 standard-panel-shadow flex items-center justify-between">
                                            <div>
                                                <p class="text-xs font-semibold text-black-fade font-['Inter'] mb-1" style="color: rgba(0, 0, 0, 0.45) !important;">Present</p>
                                                <h3 id="student-attendance-stat-present" data-attendance-stat="present" class="text-2xl font-black text-black font-['Inter'] leading-none">--</h3>
                                            </div>
                                            <div class="w-11 h-11 rounded-full bg-green-50 text-green-600 flex items-center justify-center text-lg shrink-0">
                                                <i class="fa-solid fa-circle-check"></i>
                                            </div>
                                        </div>

                                        <!-- Stat 3: Late Days -->
                                        <div class="bg-white border border-slate-200 rounded-[22px] p-5 standard-panel-shadow flex items-center justify-between">
                                            <div>
                                                <p class="text-xs font-semibold text-black-fade font-['Inter'] mb-1" style="color: rgba(0, 0, 0, 0.45) !important;">Late</p>
                                                <h3 id="student-attendance-stat-late" data-attendance-stat="late" class="text-2xl font-black text-black font-['Inter'] leading-none">--</h3>
                                            </div>
                                            <div class="w-11 h-11 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-lg shrink-0">
                                                <i class="fa-solid fa-clock"></i>
                                            </div>
                                        </div>

                                        <!-- Stat 4: Absent Days -->
                                        <div class="bg-white border border-slate-200 rounded-[22px] p-5 standard-panel-shadow flex items-center justify-between">
                                            <div>
                                                <p class="text-xs font-semibold text-black-fade font-['Inter'] mb-1" style="color: rgba(0, 0, 0, 0.45) !important;">Absent</p>
                                                <h3 id="student-attendance-stat-absent" data-attendance-stat="absent" class="text-2xl font-black text-black font-['Inter'] leading-none">--</h3>
                                            </div>
                                            <div class="w-11 h-11 rounded-full bg-red-50 text-red-600 flex items-center justify-center text-lg shrink-0">
                                                <i class="fa-solid fa-circle-xmark"></i>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                </section>



                <!-- ══ CLASSROOM DETAIL ════════════════════════════════ -->
                <section id="section-classroom-detail" class="dynamic-section hidden">
                    <div class="classroom-room-container">
                        <div id="classroom-detail-view" class="classroom-detail-shell">
                            <!-- Enhanced Header: Shared Classroom Room Banner -->
                            <div id="student-classroom-banner-wrapper" class="relative mb-0 w-full"></div>
                            <div id="student-classroom-tabs-wrapper" class="classroom-detail-tabs"></div>
                            <!-- Tab Contents -->
                            <div id="class-detail-content" class="classroom-detail-content"></div>
                        </div>
                    </div>
                </section>

                <!-- ══ TOPIC DETAIL (no built-in left sidebar — uses #sub-sidebar) ══ -->
                <section id="section-topic-detail" class="dynamic-section hidden">
                </section>

                <!-- ══ SUBJECT PROGRAM PAGE ════════════════════════ -->
                <section id="section-curriculum-page" class="dynamic-section hidden">
                    <div class="mx-auto max-w-[1024px] w-full standard-panel-shadow">
                        <div id="curriculum-page-shell"
                            class="bg-white border-x border-slate-200 min-h-screen standard-panel-shadow shadow-slate-200/50">
                        </div>
                    </div>
                </section>

                <!-- ══ TOPIC CONTENT (videos, handouts, assessments) ══ -->
                <section id="section-topic-content" class="dynamic-section hidden">
                    <div class="mx-auto max-w-[1304px] w-full">
                        <!-- buildTopicContentPage() fills this -->
                    </div>
                </section>
                <!-- USER PROFILE VIEW (Standardized) -->
                <?php require_once __DIR__ . "/includes/user_profile_view.php"; ?>
                <section id="user-settings-view" class="dynamic-section hidden" data-shared-settings-view></section>
            </div>
        </main>
    </div>

    <!-- ═══ SIGMA AI ══════════════════════════════════════════════ -->
    <!-- Calendar Dropdown -->
    <div id="calendar-dropdown"
        class="header-panel hidden fixed right-0 top-[var(--shell-offset)] h-[calc(100vh-var(--shell-offset))] w-[400px] bg-white shadow-[-20px_0_40px_rgba(0,0,0,0.08)] border-l border-slate-200 flex flex-col z-[300] rounded-l-[24px] overflow-y-auto custom-scrollbar font-['Inter']">
        <!-- Header: Removed border-b -->
            <div class="calendar-month-nav flex items-center justify-center mb-5 gap-2 relative">
                <h3 id="calendarDropdownMonthYear"
                    class="text-[16px] font-bold text-black leading-none tracking-tight text-center font-['Inter'] select-none">April 2026</h3>
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
                    <p class="text-xs font-black text-icc uppercase tracking-widest mb-1">New Assignment</p>
                    <p class="text-sm font-bold text-slate-800">Computer Programming 1: Logic Gates Quiz</p>
                    <p class="text-[11px] text-slate-500 mt-1">Teacher Alex Reyes posted a new quiz. Due on May 5.</p>
                </div>
                <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p class="text-xs font-black text-blue-600 uppercase tracking-widest mb-1">System Update</p>
                    <p class="text-sm font-bold text-slate-800">Welcome to 2nd Quarter!</p>
                    <p class="text-[11px] text-slate-500 mt-1">The second quarter academic cycle has officially started.
                    </p>
                </div>
                <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p class="text-xs font-black text-yellow-600 uppercase tracking-widest mb-1">Attendance</p>
                    <p class="text-sm font-bold text-slate-800">Attendance Confirmed</p>
                    <p class="text-[11px] text-slate-500 mt-1">Your attendance for Web Development 1 has been marked as
                        Present.</p>
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
                        <p class="text-[10px] text-slate-500 mt-1">Room Lab 2 • Ms. Sarah Lim</p>
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
                        <p class="text-sm font-bold text-slate-800">E-Portfolio Draft</p>
                        <p class="text-[11px] text-slate-500 font-black mt-1">DUE MAY 10 • 11:59 PM</p>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- SCRIPTS -->
    
<?php require_once __DIR__ . "/includes/footer.php"; ?>
