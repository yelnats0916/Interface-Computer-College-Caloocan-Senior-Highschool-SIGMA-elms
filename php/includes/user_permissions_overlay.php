<?php
/**
 * SIGMA ELMS - User Roles and Permissions Full Screen Workstation Overlay
 */
?>
<!-- USER PERMISSIONS OVERLAY (Exact School Year Workstation Architecture) -->
<div id="user-permissions-overlay"
    class="fixed inset-0 bg-[#f8fafc] z-[1000] hidden flex flex-col items-center p-0 overflow-y-auto">

    <!-- Exit Control (Far Right) -->
    <button type="button" onclick="window.handlePermissionsExit()"
        class="fixed top-10 right-10 w-12 h-12 rounded-full hover:bg-slate-200 flex items-center justify-center text-black transition-all z-[1001]"
        title="Exit Editor">
        <i class="fa-solid fa-xmark text-xl"></i>
    </button>

    <div class="branch-edit-shell mx-auto w-full animate-in slide-in-from-top-4 duration-500">
        <div
            class="branch-edit-panel bg-white border border-slate-200 min-h-screen p-0 standard-panel-shadow relative flex flex-col mx-auto max-w-[1024px]">
            <!-- Header -->
            <div class="px-10 py-8 border-b border-slate-50 flex items-center justify-between bg-white sticky top-0 z-20 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                <h2 id="user-permissions-header" class="text-2xl font-bold text-black tracking-tight font-['Inter']">Edit Roles and Permissions</h2>
            </div>

            <!-- Body with 2-column layout (Left: Category navigation, Right: Permissions content) -->
            <div class="flex-1 flex border-b border-slate-100">
                <!-- Left Sidebar: Category Selector based on Target Role -->
                <aside class="w-72 md:w-80 border-r border-slate-200 p-5 space-y-2 bg-slate-50/50 shrink-0 sticky top-[89px] self-start">
                    <!-- Admin Category Navigation Tabs -->
                    <div id="perm-nav-admin" class="space-y-1.5">
                        <button type="button" id="perm-tab-authority" onclick="window.switchPermissionsCategoryTab('authority')"
                            class="perm-category-tab active w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left text-sm font-semibold bg-[#FFD000] text-white shadow-sm transition-all whitespace-nowrap">
                            <i class="fa-solid fa-user-shield text-sm shrink-0"></i>
                            <span>User Accounts & Roles</span>
                        </button>
                        <button type="button" id="perm-tab-institutional" onclick="window.switchPermissionsCategoryTab('institutional')"
                            class="perm-category-tab w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left text-sm font-semibold text-black transition-all whitespace-nowrap">
                            <i class="fa-solid fa-school text-sm shrink-0"></i>
                            <span>School Setup</span>
                        </button>
                        <button type="button" id="perm-tab-metrics" onclick="window.switchPermissionsCategoryTab('metrics')"
                            class="perm-category-tab w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left text-sm font-semibold text-black transition-all whitespace-nowrap">
                            <i class="fa-solid fa-chart-pie text-sm shrink-0"></i>
                            <span>Dashboard Summary Cards</span>
                        </button>
                        <button type="button" id="perm-tab-security" onclick="window.switchPermissionsCategoryTab('security')"
                            class="perm-category-tab w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left text-sm font-semibold text-black transition-all whitespace-nowrap">
                            <i class="fa-solid fa-shield-halved text-sm shrink-0"></i>
                            <span>Security & Logs</span>
                        </button>
                    </div>

                    <!-- Teacher Category Navigation Tabs -->
                    <div id="perm-nav-teacher" class="space-y-1.5 hidden">
                        <button type="button" id="perm-tab-teacher-tools" onclick="window.switchPermissionsCategoryTab('teacher-tools')"
                            class="perm-category-tab active w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left text-sm font-semibold bg-[#FFD000] text-white shadow-sm transition-all whitespace-nowrap">
                            <i class="fa-solid fa-chalkboard-user text-sm shrink-0"></i>
                            <span>Classroom & Grades</span>
                        </button>
                    </div>

                    <!-- Student Category Navigation Tabs -->
                    <div id="perm-nav-student" class="space-y-1.5 hidden">
                        <button type="button" id="perm-tab-student-tools" onclick="window.switchPermissionsCategoryTab('student-tools')"
                            class="perm-category-tab active w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left text-sm font-semibold bg-[#FFD000] text-white shadow-sm transition-all whitespace-nowrap">
                            <i class="fa-solid fa-graduation-cap text-sm shrink-0"></i>
                            <span>Student Portal Access</span>
                        </button>
                    </div>
                </aside>

                <!-- Right Content: Permissions Panels -->
                <div class="flex-1 p-8 md:p-10 pb-28 bg-white">
                    <!-- PANEL 1: ACCOUNT & ROLE AUTHORITY (Admin) -->
                    <div id="perm-panel-authority" class="perm-panel space-y-6">
                        <!-- 1. Role Authority (Master Admin Elevation & Permitted Modifications) -->
                        <div id="perm-role-section" class="space-y-3">
                            <!-- Master Admin Elevation Toggle -->
                            <div class="flex items-center justify-between p-4 bg-emerald-50/40 border border-emerald-200/60 rounded-2xl transition-all shadow-sm">
                                <div class="flex flex-col gap-0.5 pr-4">
                                    <div class="flex items-center gap-2">
                                        <span class="text-sm font-bold text-slate-900 font-['Inter']">Master Administrator Access</span>
                                        <i id="perm-role-master-lock" class="fa-solid fa-lock text-xs text-slate-400 hidden"></i>
                                    </div>
                                    <p id="perm-role-master-desc" class="text-xs text-slate-500 font-medium">Gives full system access, including the ability to manage other admin accounts.</p>
                                </div>
                                <label for="perm-role-master" class="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                                    <input type="checkbox" id="perm-role-master" aria-label="Master Administrator Access" onchange="window.handleMasterAdminToggle(this)" class="sr-only peer">
                                    <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#15803d]"></div>
                                </label>
                            </div>

                            <!-- Permitted Role Changes -->
                            <div id="perm-role-authority-container" class="space-y-2.5 pt-2">
                                <div class="mb-2">
                                    <p class="text-xs font-bold text-slate-700 uppercase tracking-wider font-['Inter']">Roles This Admin Can Edit</p>
                                    <p class="text-xs text-slate-500 font-normal mt-0.5">Choose which user accounts this administrator is allowed to edit and manage permissions for.</p>
                                </div>
                                <div class="flex items-center justify-between p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-2xl transition-all">
                                    <div class="pr-4">
                                        <label for="perm-manage-admins" class="text-sm font-semibold text-slate-900 block cursor-pointer">Administrator Accounts</label>
                                        <span class="text-xs text-slate-500 font-normal">Can edit and manage permissions for other Admin accounts</span>
                                    </div>
                                    <input type="checkbox" id="perm-manage-admins" aria-label="Can edit and manage permissions for other Admin accounts" onchange="window.trackPermissionChanges()" class="w-6 h-6 text-blue-600 accent-blue-600 rounded-lg border-slate-300 focus:ring-blue-500 cursor-pointer shrink-0">
                                </div>
                                <div class="flex items-center justify-between p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-2xl transition-all">
                                    <div class="pr-4">
                                        <label for="perm-manage-teachers" class="text-sm font-semibold text-slate-900 block cursor-pointer">Teacher Accounts</label>
                                        <span class="text-xs text-slate-500 font-normal">Can edit and manage permissions for Teacher accounts</span>
                                    </div>
                                    <input type="checkbox" id="perm-manage-teachers" aria-label="Can edit and manage permissions for Teacher accounts" onchange="window.trackPermissionChanges()" class="w-6 h-6 text-blue-600 accent-blue-600 rounded-lg border-slate-300 focus:ring-blue-500 cursor-pointer shrink-0">
                                </div>
                                <div class="flex items-center justify-between p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-2xl transition-all">
                                    <div class="pr-4">
                                        <label for="perm-manage-students" class="text-sm font-semibold text-slate-900 block cursor-pointer">Student Accounts</label>
                                        <span class="text-xs text-slate-500 font-normal">Can edit and manage permissions for Student accounts</span>
                                    </div>
                                    <input type="checkbox" id="perm-manage-students" aria-label="Can edit and manage permissions for Student accounts" onchange="window.trackPermissionChanges()" class="w-6 h-6 text-blue-600 accent-blue-600 rounded-lg border-slate-300 focus:ring-blue-500 cursor-pointer shrink-0">
                                </div>
                            </div>
                        </div>

                        <!-- 2. User Account Actions & Moderation -->
                        <div class="space-y-3">
                            <div class="pb-1.5 border-b border-slate-100">
                                <p class="text-xs font-bold text-slate-700 uppercase tracking-wider font-['Inter']">Account Actions</p>
                            </div>
                            <div class="space-y-2.5">
                                <div class="flex items-center justify-between p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-2xl transition-all">
                                    <div class="pr-4 flex items-center gap-3">
                                        <div class="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                                            <i class="fa-solid fa-key text-amber-600 text-sm"></i>
                                        </div>
                                        <div>
                                            <label for="perm-action-password" class="text-sm font-semibold text-slate-900 block cursor-pointer">Reset Passwords</label>
                                            <span class="text-xs text-slate-500 font-normal">Can reset and update passwords for users</span>
                                        </div>
                                    </div>
                                    <input type="checkbox" id="perm-action-password" aria-label="Can reset and update passwords for users" onchange="window.trackPermissionChanges()" class="w-6 h-6 text-blue-600 accent-blue-600 rounded-lg border-slate-300 focus:ring-blue-500 cursor-pointer shrink-0">
                                </div>
                                <div class="flex items-center justify-between p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-2xl transition-all">
                                    <div class="pr-4 flex items-center gap-3">
                                        <div class="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0">
                                            <i class="fa-solid fa-lock text-indigo-600 text-sm"></i>
                                        </div>
                                        <div>
                                            <label for="perm-action-lock" class="text-sm font-semibold text-slate-900 block cursor-pointer">Lock / Unlock Accounts</label>
                                            <span class="text-xs text-slate-500 font-normal">Can temporarily lock or unlock user accounts</span>
                                        </div>
                                    </div>
                                    <input type="checkbox" id="perm-action-lock" aria-label="Can temporarily lock or unlock user accounts" onchange="window.trackPermissionChanges()" class="w-6 h-6 text-blue-600 accent-blue-600 rounded-lg border-slate-300 focus:ring-blue-500 cursor-pointer shrink-0">
                                </div>
                                <div class="flex items-center justify-between p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-2xl transition-all">
                                    <div class="pr-4 flex items-center gap-3">
                                        <div class="w-8 h-8 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
                                            <i class="fa-solid fa-user-slash text-red-600 text-sm"></i>
                                        </div>
                                        <div>
                                            <label for="perm-action-deactivate" class="text-sm font-semibold text-slate-900 block cursor-pointer">Activate / Deactivate Accounts</label>
                                            <span class="text-xs text-slate-500 font-normal">Can turn user accounts on or off</span>
                                        </div>
                                    </div>
                                    <input type="checkbox" id="perm-action-deactivate" aria-label="Can turn user accounts on or off" onchange="window.trackPermissionChanges()" class="w-6 h-6 text-blue-600 accent-blue-600 rounded-lg border-slate-300 focus:ring-blue-500 cursor-pointer shrink-0">
                                </div>
                                <div class="flex items-center justify-between p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-2xl transition-all">
                                    <div class="pr-4 flex items-center gap-3">
                                        <div class="w-8 h-8 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
                                            <i class="fa-solid fa-trash-can text-red-600 text-sm"></i>
                                        </div>
                                        <div>
                                            <label for="perm-action-delete" class="text-sm font-semibold text-slate-900 block cursor-pointer">Delete User Accounts</label>
                                            <span class="text-xs text-slate-500 font-normal">Can permanently remove user accounts</span>
                                        </div>
                                    </div>
                                    <input type="checkbox" id="perm-action-delete" aria-label="Can permanently remove user accounts" onchange="window.trackPermissionChanges()" class="w-6 h-6 text-blue-600 accent-blue-600 rounded-lg border-slate-300 focus:ring-blue-500 cursor-pointer shrink-0">
                                </div>
                                <div class="flex items-center justify-between p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-2xl transition-all">
                                    <div class="pr-4 flex items-center gap-3">
                                        <div class="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                                            <i class="fa-solid fa-comment-slash text-slate-700 text-sm"></i>
                                        </div>
                                        <div>
                                            <label for="perm-admin-delete-comments" class="text-sm font-semibold text-slate-900 block cursor-pointer">Delete Student Comments</label>
                                            <span class="text-xs text-slate-500 font-normal">Can remove student comments on class posts and announcements</span>
                                        </div>
                                    </div>
                                    <input type="checkbox" id="perm-admin-delete-comments" aria-label="Can remove student comments on class posts and announcements" onchange="window.trackPermissionChanges()" class="w-6 h-6 text-blue-600 accent-blue-600 rounded-lg border-slate-300 focus:ring-blue-500 cursor-pointer shrink-0">
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- PANEL 2: INSTITUTIONAL (Admin) -->
                    <div id="perm-panel-institutional" class="perm-panel space-y-6 hidden">
                        <!-- School Management -->
                        <div class="space-y-4">
                            <div class="flex items-center justify-between pb-3.5 border-b border-slate-100">
                                <div class="flex items-center gap-3">
                                    <div class="w-1.5 h-5 bg-[#15803d] rounded-full"></div>
                                    <h3 class="text-sm font-bold text-slate-900 font-['Inter'] uppercase tracking-wider">School Setup</h3>
                                </div>
                                <label for="perm-admin-school-main" class="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" id="perm-admin-school-main" aria-label="Toggle School Setup Permissions" onchange="window.togglePermCategory('school')" class="sr-only peer">
                                    <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#15803d]"></div>
                                </label>
                            </div>
                            <div id="perm-admin-school-sub" class="pl-2 space-y-3 transition-all duration-300">
                                <!-- School Profile (1 Authority Checkbox) -->
                                <div class="flex items-center justify-between p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-2xl transition-all">
                                    <div class="pr-4">
                                        <div class="flex items-center gap-2">
                                            <label for="perm-school-profile" class="text-sm font-semibold text-slate-900 block cursor-pointer">School Profile & Info</label>
                                            <i id="perm-school-profile-lock" class="fa-solid fa-lock text-[11px] text-amber-500 hidden" title="Only Master Admin can grant this permission"></i>
                                        </div>
                                        <span class="text-xs text-slate-500 font-normal">Can edit school name, logo, contact information, and school credentials</span>
                                    </div>
                                    <input type="checkbox" id="perm-school-profile" aria-label="Can edit school name, logo, contact information, and school credentials" onchange="window.trackPermissionChanges()" class="w-6 h-6 text-blue-600 accent-blue-600 rounded-lg border-slate-300 focus:ring-blue-500 cursor-pointer shrink-0">
                                </div>

                                <!-- School Year (4 Granular Checkboxes) -->
                                <div class="p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl space-y-3 transition-all">
                                    <div class="flex items-center justify-between pb-2 border-b border-slate-200/60">
                                        <div>
                                            <span class="text-sm font-bold text-slate-900 block font-['Inter']">School Year & Terms</span>
                                            <span class="text-xs text-slate-500 font-normal">Manage school years, semesters, quarters, and academic calendars</span>
                                        </div>
                                    </div>
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                                        <div class="flex items-center justify-between p-3 bg-white border border-slate-200/70 rounded-xl">
                                            <label for="perm-sy-authority" class="text-xs font-semibold text-slate-900 cursor-pointer">View School Calendar</label>
                                            <input type="checkbox" id="perm-sy-authority" aria-label="View School Calendar" onchange="window.trackPermissionChanges()" class="w-5 h-5 text-blue-600 accent-blue-600 rounded border-slate-300 cursor-pointer shrink-0">
                                        </div>
                                        <div class="flex items-center justify-between p-3 bg-white border border-slate-200/70 rounded-xl">
                                            <label for="perm-sy-manage" class="text-xs font-semibold text-slate-900 cursor-pointer">Manage Terms & Quarters</label>
                                            <input type="checkbox" id="perm-sy-manage" aria-label="Manage Terms & Quarters" onchange="window.trackPermissionChanges()" class="w-5 h-5 text-blue-600 accent-blue-600 rounded border-slate-300 cursor-pointer shrink-0">
                                        </div>
                                        <div class="flex items-center justify-between p-3 bg-white border border-slate-200/70 rounded-xl">
                                            <label for="perm-sy-create-edit" class="text-xs font-semibold text-slate-900 cursor-pointer">Create & Edit School Year</label>
                                            <input type="checkbox" id="perm-sy-create-edit" aria-label="Create & Edit School Year" onchange="window.trackPermissionChanges()" class="w-5 h-5 text-blue-600 accent-blue-600 rounded border-slate-300 cursor-pointer shrink-0">
                                        </div>
                                        <div class="flex items-center justify-between p-3 bg-white border border-slate-200/70 rounded-xl">
                                            <label for="perm-sy-delete" class="text-xs font-semibold text-slate-900 cursor-pointer">Move to Trash / Delete School Year</label>
                                            <input type="checkbox" id="perm-sy-delete" aria-label="Move to Trash / Delete School Year" onchange="window.trackPermissionChanges()" class="w-5 h-5 text-blue-600 accent-blue-600 rounded border-slate-300 cursor-pointer shrink-0">
                                        </div>
                                    </div>
                                </div>


                                <!-- Section Setup & Advisory (Granular Checkboxes) -->
                                <div class="p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl space-y-3 transition-all">
                                    <div class="flex items-center justify-between pb-2 border-b border-slate-200/60">
                                        <div>
                                            <span class="text-sm font-bold text-slate-900 block font-['Inter']">Sections & Class Advisory</span>
                                            <span class="text-xs text-slate-500 font-normal">Manage class sections, room assignments, and student enrollments</span>
                                        </div>
                                    </div>
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                                        <div class="flex items-center justify-between p-3 bg-white border border-slate-200/70 rounded-xl">
                                            <label for="perm-school-sections" class="text-xs font-semibold text-slate-900 cursor-pointer">View & Create Sections</label>
                                            <input type="checkbox" id="perm-school-sections" aria-label="View & Create Sections" onchange="window.trackPermissionChanges()" class="w-5 h-5 text-blue-600 accent-blue-600 rounded border-slate-300 cursor-pointer shrink-0">
                                        </div>
                                        <div class="flex items-center justify-between p-3 bg-white border border-slate-200/70 rounded-xl">
                                            <label for="perm-school-sections-delete" class="text-xs font-semibold text-slate-900 cursor-pointer">Delete Sections (Master Admin Only)</label>
                                            <input type="checkbox" id="perm-school-sections-delete" aria-label="Delete Sections (Master Admin Only)" onchange="window.trackPermissionChanges()" class="w-5 h-5 text-blue-600 accent-blue-600 rounded border-slate-300 cursor-pointer shrink-0">
                                        </div>
                                    </div>
                                </div>

                                <!-- School Subjects Curriculum (Granular Checkboxes) -->
                                <div class="p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl space-y-3 transition-all">
                                    <div class="flex items-center justify-between pb-2 border-b border-slate-200/60">
                                        <div>
                                            <span class="text-sm font-bold text-slate-900 block font-['Inter']">Subjects & Curriculum</span>
                                            <span class="text-xs text-slate-500 font-normal">Create and manage subjects, topics, lessons, and learning materials</span>
                                        </div>
                                    </div>
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                                        <div class="flex items-center justify-between p-3 bg-white border border-slate-200/70 rounded-xl">
                                            <label for="perm-subject-authority" class="text-xs font-semibold text-slate-900 cursor-pointer">View Subjects & Topics</label>
                                            <input type="checkbox" id="perm-subject-authority" aria-label="View Subjects & Topics" onchange="window.trackPermissionChanges()" class="w-5 h-5 text-blue-600 accent-blue-600 rounded border-slate-300 cursor-pointer shrink-0">
                                        </div>
                                        <div class="flex items-center justify-between p-3 bg-white border border-slate-200/70 rounded-xl">
                                            <label for="perm-subject-create-edit" class="text-xs font-semibold text-slate-900 cursor-pointer">Create & Edit Subjects & Topics</label>
                                            <input type="checkbox" id="perm-subject-create-edit" aria-label="Create & Edit Subjects & Topics" onchange="window.trackPermissionChanges()" class="w-5 h-5 text-blue-600 accent-blue-600 rounded border-slate-300 cursor-pointer shrink-0">
                                        </div>
                                        <div class="flex items-center justify-between p-3 bg-white border border-slate-200/70 rounded-xl">
                                            <label for="perm-subject-delete" class="text-xs font-semibold text-slate-900 cursor-pointer">Delete Subjects</label>
                                            <input type="checkbox" id="perm-subject-delete" aria-label="Delete Subjects" onchange="window.trackPermissionChanges()" class="w-5 h-5 text-blue-600 accent-blue-600 rounded border-slate-300 cursor-pointer shrink-0">
                                        </div>
                                    </div>
                                </div>

                                <!-- Subject Publishing Control (Separate restricted section) -->
                                <div class="p-4 bg-amber-50/40 border border-amber-200/60 rounded-2xl space-y-3 transition-all">
                                    <div class="pb-2 border-b border-amber-200/50">
                                        <div class="flex items-center gap-2 mb-0.5">
                                            <i class="fa-solid fa-globe text-amber-600 text-xs"></i>
                                            <span class="text-sm font-bold text-slate-900 font-['Inter']">Subject Publishing Control</span>
                                        </div>
                                        <span class="text-xs text-slate-500 font-normal">Controls who can make subjects visible or hidden to teachers and students. Unpublishing an active subject will hide it from all enrolled users.</span>
                                    </div>
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                                        <div class="flex items-center justify-between p-3 bg-white border border-slate-200/70 rounded-xl">
                                            <div>
                                                <label for="perm-subject-publish" class="text-xs font-semibold text-slate-900 block cursor-pointer">Publish Subjects</label>
                                                <span class="text-xs text-slate-500 font-normal">Can make a draft subject live</span>
                                            </div>
                                            <input type="checkbox" id="perm-subject-publish" aria-label="Can make a draft subject live" onchange="window.trackPermissionChanges()" class="w-5 h-5 text-blue-600 accent-blue-600 rounded border-slate-300 cursor-pointer shrink-0">
                                        </div>
                                        <div class="flex items-center justify-between p-3 bg-white border border-amber-200/50 rounded-xl">
                                            <div>
                                                <label for="perm-subject-unpublish" class="text-xs font-semibold text-slate-900 block cursor-pointer">Unpublish / Save as Draft</label>
                                                <span class="text-xs text-amber-600 font-normal">⚠ Hides subject from active users</span>
                                            </div>
                                            <input type="checkbox" id="perm-subject-unpublish" aria-label="Unpublish / Save as Draft - Hides subject from active users" onchange="window.trackPermissionChanges()" class="w-5 h-5 text-blue-600 accent-blue-600 rounded border-slate-300 cursor-pointer shrink-0">
                                        </div>
                                    </div>
                                    <p class="text-xs text-amber-700 font-medium bg-amber-50 border border-amber-200/60 rounded-xl px-3 py-2">
                                        <i class="fa-solid fa-circle-info mr-1.5"></i>
                                        Master Admin always has full publishing control. These permissions only apply to regular Admin accounts.
                                    </p>
                                </div>

                                <div class="p-4 bg-amber-50/40 border border-amber-200/60 rounded-2xl space-y-3 transition-all">
                                    <div class="flex items-center gap-2">
                                        <i class="fa-solid fa-lock text-amber-600 text-xs"></i>
                                        <span class="text-sm font-bold text-slate-900 font-['Inter']">System Maintenance Control</span>
                                    </div>
                                    <p class="text-xs text-slate-500 font-normal">
                                        Maintenance / Lockdown Mode stays reserved for Master Admin accounts and cannot be delegated to regular Admin users.
                                    </p>
                                    <p class="text-xs text-amber-700 font-medium bg-amber-50 border border-amber-200/60 rounded-xl px-3 py-2">
                                        <i class="fa-solid fa-circle-info mr-1.5"></i>
                                        Only Master Admin can place the system in maintenance mode or edit the restricted access notice shown during lockdown.
                                    </p>
                                    <!-- Notice Message permission — unchecked by default, only Master Admin can grant -->
                                    <div class="flex items-center justify-between p-3 bg-white border border-slate-200/70 rounded-xl">
                                        <div>
                                            <label for="perm-notice-message" class="text-xs font-semibold text-slate-900 block cursor-pointer">Notice Message Access</label>
                                            <span class="text-xs text-slate-500 font-normal">Can edit the restricted access notice shown during lockdown</span>
                                        </div>
                                        <input type="checkbox" id="perm-notice-message" aria-label="Can edit the restricted access notice shown during lockdown" onchange="window.trackPermissionChanges()" class="w-5 h-5 text-blue-600 accent-blue-600 rounded border-slate-300 cursor-pointer shrink-0">
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Resources -->
                        <div class="space-y-4">
                            <div class="flex items-center justify-between pb-3.5 border-b border-slate-100">
                                <div class="flex items-center gap-3">
                                    <div class="w-1.5 h-5 bg-[#15803d] rounded-full"></div>
                                    <h3 class="text-sm font-bold text-slate-900 font-['Inter'] uppercase tracking-wider">School Resources</h3>
                                </div>
                                <label for="perm-admin-resources-main" class="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" id="perm-admin-resources-main" aria-label="Toggle School Resources Permissions" onchange="window.togglePermCategory('resources')" class="sr-only peer">
                                    <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#15803d]"></div>
                                </label>
                            </div>
                            <div id="perm-admin-resources-sub" class="pl-2 space-y-2.5 transition-all duration-300">
                                <div class="flex items-center justify-between p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-2xl transition-all">
                                    <label for="perm-resources-vault" class="text-sm font-semibold text-slate-900 pr-4 cursor-pointer">Document Vault (Important Files)</label>
                                    <input type="checkbox" id="perm-resources-vault" aria-label="Document Vault (Important Files)" onchange="window.trackPermissionChanges()" class="w-6 h-6 text-blue-600 accent-blue-600 rounded-lg border-slate-300 focus:ring-blue-500 cursor-pointer shrink-0">
                                </div>
                                <div class="flex items-center justify-between p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-2xl transition-all">
                                    <label for="perm-resources-calendar" class="text-sm font-semibold text-slate-900 pr-4 cursor-pointer">School Calendar Events</label>
                                    <input type="checkbox" id="perm-resources-calendar" aria-label="School Calendar Events" onchange="window.trackPermissionChanges()" class="w-6 h-6 text-blue-600 accent-blue-600 rounded-lg border-slate-300 focus:ring-blue-500 cursor-pointer shrink-0">
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- PANEL 3: CONFIGURATION METRICS (Admin) -->
                    <div id="perm-panel-metrics" class="perm-panel space-y-6 hidden">
                        <div class="space-y-4">
                            <div class="flex items-center justify-between pb-3.5 border-b border-slate-100">
                                <div class="flex items-center gap-3">
                                    <div class="w-1.5 h-5 bg-[#15803d] rounded-full"></div>
                                    <h3 class="text-sm font-bold text-slate-900 font-['Inter'] uppercase tracking-wider">Dashboard Summary Cards</h3>
                                </div>
                                <label for="perm-admin-metrics-main" class="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" id="perm-admin-metrics-main" aria-label="Toggle Dashboard Summary Cards Permissions" onchange="window.togglePermCategory('metrics')" class="sr-only peer">
                                    <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#15803d]"></div>
                                </label>
                            </div>
                            <div id="perm-admin-metrics-sub" class="pl-2 space-y-2.5 transition-all duration-300">
                                <div class="flex items-center justify-between p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-2xl transition-all">
                                    <label for="perm-metrics-users" class="text-sm font-semibold text-slate-900 pr-4 cursor-pointer">Show Users Summary Card</label>
                                    <input type="checkbox" id="perm-metrics-users" aria-label="Show Users Summary Card" onchange="window.trackPermissionChanges()" class="w-6 h-6 text-blue-600 accent-blue-600 rounded-lg border-slate-300 focus:ring-blue-500 cursor-pointer shrink-0">
                                </div>
                                <div class="flex items-center justify-between p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-2xl transition-all">
                                    <label for="perm-metrics-subjects" class="text-sm font-semibold text-slate-900 pr-4 cursor-pointer">Show Subjects Summary Card</label>
                                    <input type="checkbox" id="perm-metrics-subjects" aria-label="Show Subjects Summary Card" onchange="window.trackPermissionChanges()" class="w-6 h-6 text-blue-600 accent-blue-600 rounded-lg border-slate-300 focus:ring-blue-500 cursor-pointer shrink-0">
                                </div>
                                <div class="flex items-center justify-between p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-2xl transition-all">
                                    <label for="perm-metrics-sections" class="text-sm font-semibold text-slate-900 pr-4 cursor-pointer">Show Sections Summary Card</label>
                                    <input type="checkbox" id="perm-metrics-sections" aria-label="Show Sections Summary Card" onchange="window.trackPermissionChanges()" class="w-6 h-6 text-blue-600 accent-blue-600 rounded-lg border-slate-300 focus:ring-blue-500 cursor-pointer shrink-0">
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- PANEL 4: SECURITY & LOGS (Admin) -->
                    <div id="perm-panel-security" class="perm-panel space-y-6 hidden">
                        <div class="space-y-4">
                            <div class="flex items-center justify-between pb-3.5 border-b border-slate-100">
                                <div class="flex items-center gap-3">
                                    <div class="w-1.5 h-5 bg-[#15803d] rounded-full"></div>
                                    <h3 class="text-sm font-bold text-slate-900 font-['Inter'] uppercase tracking-wider">Security & Activity Logs</h3>
                                </div>
                                <label for="perm-admin-security-main" class="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" id="perm-admin-security-main" aria-label="Toggle Security and Activity Logs Permissions" onchange="window.togglePermCategory('security')" class="sr-only peer">
                                    <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#15803d]"></div>
                                </label>
                            </div>
                            <div id="perm-admin-security-sub" class="pl-2 space-y-2.5 transition-all duration-300">
                                <div class="flex items-center justify-between p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-2xl transition-all">
                                    <label for="perm-security-logs" class="text-sm font-semibold text-slate-900 pr-4 cursor-pointer">View System Activity Logs</label>
                                    <input type="checkbox" id="perm-security-logs" aria-label="View System Activity Logs" onchange="window.trackPermissionChanges()" class="w-6 h-6 text-blue-600 accent-blue-600 rounded-lg border-slate-300 focus:ring-blue-500 cursor-pointer shrink-0">
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- PANEL 5: CLASSROOM & ACADEMIC TOOLS (Teacher) -->
                    <div id="perm-panel-teacher-tools" class="perm-panel space-y-6 hidden">
                        <div class="space-y-4">
                            <div class="flex items-center justify-between pb-3.5 border-b border-slate-100">
                                <div class="flex items-center gap-3">
                                    <div class="w-1.5 h-5 bg-[#FFD000] rounded-full"></div>
                                    <h3 class="text-sm font-bold text-slate-900 font-['Inter'] uppercase tracking-wider">Teacher Permissions</h3>
                                </div>
                            </div>
                            <div class="space-y-2.5">
                                <div class="flex items-center justify-between p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-2xl transition-all">
                                    <div class="pr-4">
                                        <label for="perm-teacher-grades" class="text-sm font-semibold text-slate-900 block cursor-pointer">Grade Encoding</label>
                                        <span class="text-xs text-slate-500">Can enter and submit quarterly grades for students.</span>
                                    </div>
                                    <input type="checkbox" id="perm-teacher-grades" aria-label="Can enter and submit quarterly grades for students" onchange="window.trackPermissionChanges()" class="w-6 h-6 text-blue-600 accent-blue-600 rounded-lg border-slate-300 focus:ring-blue-500 cursor-pointer shrink-0">
                                </div>
                                <div class="flex items-center justify-between p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-2xl transition-all">
                                    <div class="pr-4">
                                        <label for="perm-teacher-attendance" class="text-sm font-semibold text-slate-900 block cursor-pointer">Take Attendance</label>
                                        <span class="text-xs text-slate-500">Can mark daily student attendance.</span>
                                    </div>
                                    <input type="checkbox" id="perm-teacher-attendance" aria-label="Can mark daily student attendance" onchange="window.trackPermissionChanges()" class="w-6 h-6 text-blue-600 accent-blue-600 rounded-lg border-slate-300 focus:ring-blue-500 cursor-pointer shrink-0">
                                </div>
                                <div class="flex items-center justify-between p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-2xl transition-all">
                                    <div class="pr-4">
                                        <label for="perm-teacher-materials" class="text-sm font-semibold text-slate-900 block cursor-pointer">Upload Lessons & Materials</label>
                                        <span class="text-xs text-slate-500">Can upload slides, videos, assignments, and topics.</span>
                                    </div>
                                    <input type="checkbox" id="perm-teacher-materials" aria-label="Can upload slides, videos, assignments, and topics" onchange="window.trackPermissionChanges()" class="w-6 h-6 text-blue-600 accent-blue-600 rounded-lg border-slate-300 focus:ring-blue-500 cursor-pointer shrink-0">
                                </div>
                                <div class="flex items-center justify-between p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-2xl transition-all">
                                    <div class="pr-4">
                                        <label for="perm-teacher-delete-comments" class="text-sm font-semibold text-slate-900 block cursor-pointer">Delete Student Comments</label>
                                        <span class="text-xs text-slate-500">Can remove student comments on class posts and announcements.</span>
                                    </div>
                                    <input type="checkbox" id="perm-teacher-delete-comments" aria-label="Can remove student comments on class posts and announcements" onchange="window.trackPermissionChanges()" class="w-6 h-6 text-blue-600 accent-blue-600 rounded-lg border-slate-300 focus:ring-blue-500 cursor-pointer shrink-0">
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- PANEL 6: STUDENT FEATURES (Student) -->
                    <div id="perm-panel-student-tools" class="perm-panel space-y-6 hidden">
                        <div class="space-y-4">
                            <div class="flex items-center justify-between pb-3.5 border-b border-slate-100">
                                <div class="flex items-center gap-3">
                                    <div class="w-1.5 h-5 bg-[#15803d] rounded-full"></div>
                                    <h3 class="text-sm font-bold text-slate-900 font-['Inter'] uppercase tracking-wider">Student Permissions</h3>
                                </div>
                            </div>
                            <div class="space-y-2.5">
                                <div class="flex items-center justify-between p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-2xl transition-all">
                                    <div class="pr-4">
                                        <label for="perm-student-grades" class="text-sm font-semibold text-slate-900 block cursor-pointer">View Grades & Report Cards</label>
                                        <span class="text-xs text-slate-500">Can view published quarterly grades.</span>
                                    </div>
                                    <input type="checkbox" id="perm-student-grades" aria-label="Can view published quarterly grades" onchange="window.trackPermissionChanges()" class="w-6 h-6 text-blue-600 accent-blue-600 rounded-lg border-slate-300 focus:ring-blue-500 cursor-pointer shrink-0">
                                </div>
                                <div class="flex items-center justify-between p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-2xl transition-all">
                                    <div class="pr-4">
                                        <label for="perm-student-bio" class="text-sm font-semibold text-slate-900 block cursor-pointer">Edit Profile & Avatar</label>
                                        <span class="text-xs text-slate-500">Can update their bio and profile picture.</span>
                                    </div>
                                    <input type="checkbox" id="perm-student-bio" aria-label="Can update their bio and profile picture" onchange="window.trackPermissionChanges()" class="w-6 h-6 text-blue-600 accent-blue-600 rounded-lg border-slate-300 focus:ring-blue-500 cursor-pointer shrink-0">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Action Footer (Always docked at bottom of screen browser) -->
            <div class="sticky bottom-0 z-30 bg-white border-t border-slate-200 px-10 py-6 flex justify-end items-center gap-4 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] font-['Inter']">
                <button type="button" id="save-permissions-btn" onclick="window.saveUserPermissions()" disabled
                    class="sigma-btn sigma-btn-primary sigma-btn-lg min-w-[160px]">
                    <span id="save-permissions-label">Save Changes</span>
                    <i class="fa-solid fa-circle-notch fa-spin hidden" id="save-permissions-loading"></i>
                </button>
            </div>
        </div>
    </div>
</div>
