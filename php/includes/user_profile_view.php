<?php
/**
 * SIGMA ELMS - Reusable User Profile View Component (php/includes/user_profile_view.php)
 * Interface Computer College - Caloocan Senior High School ELMS
 * Standardized across Admin, Teacher, and Student portals.
 */
?>
<!-- USER PROFILE VIEW (Read-Only & Interactive Workstation) -->
<section id="user-profile-view" class="dynamic-section hidden">
    <!-- TOP HEADER WHITE PANEL (Centered 1040px Banner, Avatar, Info, and Tabs) -->
    <div class="w-full bg-white border-b border-slate-200 shadow-sm">
        <div class="mx-auto max-w-[1040px] w-full px-6 md:px-10">
            <!-- Green Hero Banner -->
            <div class="relative min-h-[220px] md:min-h-[310px]">
                <div class="absolute inset-0 overflow-hidden rounded-b-[44px] bg-[#15803d]">
                    <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.18),_transparent_38%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.14),_transparent_34%)]"></div>
                    <div class="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(90deg,transparent_0,transparent_22px,rgba(250,204,21,0.4)_22px,rgba(250,204,21,0.4)_23px)]"></div>
                    <div class="absolute bottom-0 left-1/3 right-0 h-px bg-white/10"></div>
                </div>
                <div class="relative px-6 md:px-10 pt-10 pb-0 min-h-[220px] md:min-h-[310px] flex items-end">
                    <div class="relative z-10 flex flex-row items-center gap-3 md:gap-8 w-full">
                        <button type="button" id="user-profile-picture-trigger"
                            onclick="window.toggleUserProfilePictureOverlay(true)"
                            class="w-40 h-40 md:w-48 md:h-48 rounded-full bg-[#e2e8f0] flex items-center justify-center focus:outline-none shrink-0 mb-[-74px] overflow-hidden cursor-pointer border-4 border-white shadow-md"
                            title="Change profile picture">
                            <img id="user-avatar-img" src="" alt="User Avatar" class="absolute inset-0 w-full h-full object-cover hidden rounded-full">
                            <i id="user-avatar-placeholder" class="fa-solid fa-user text-6xl md:text-7xl text-[#94a3b8]"></i>
                        </button>
                        <div class="flex-1 md:pb-5">
                            <div class="flex flex-col items-start gap-1.5">
                                <h2 class="text-[1.85rem] md:text-[2.6rem] font-bold text-white tracking-tight leading-[1.02] whitespace-nowrap overflow-hidden text-ellipsis">
                                    <span id="view-user-name-banner">User Name</span>
                                </h2>
                                <div class="flex items-center gap-3">
                                    <span id="view-user-role" class="profile-role-badge">Role</span>
                                    <span id="view-user-id" class="text-xs md:text-sm font-bold tracking-wider text-white drop-shadow-sm">ID: #000000</span>
                                </div>
                            </div>
                        </div>
                        <div class="relative self-end mb-6">
                            <!-- 1. Settings Gear Button (Only for "Edit Account" mode) -->
                            <button type="button" id="profile-settings-btn"
                                onclick="window.toggleProfileSettingsMenu(event)"
                                class="hidden w-10 h-10 bg-white hover:bg-slate-50 border border-slate-200 rounded-full flex items-center justify-center text-black transition-all group shadow-sm"
                                title="Account Settings">
                                <i class="fa-solid fa-gear text-base group-hover:rotate-90 transition-transform duration-500 text-black"></i>
                            </button>
                            <div id="profile-settings-menu"
                                class="hidden absolute right-0 top-full mt-2.5 w-64 bg-white border border-slate-200 rounded-[28px] shadow-[0_20px_50px_rgba(0,0,0,0.12)] z-[110] p-3.5 overflow-hidden font-['Inter']">
                                <div class="space-y-1">
                                    <button type="button" onclick="window.viewUserProfile(window.currentEditingUserId || window.currentViewingUserId); window.toggleProfileSettingsMenu(null, true)"
                                        class="w-full flex items-center gap-3.5 px-3.5 py-3 hover:bg-slate-50 rounded-2xl transition-all group text-left">
                                        <div class="w-6 flex items-center justify-center shrink-0">
                                            <i class="fa-solid fa-circle-user text-black text-sm"></i>
                                        </div>
                                        <span class="text-xs md:text-sm font-medium text-black font-['Inter']">View Profile</span>
                                    </button>
                                    <button type="button" id="profile-edit-permissions-btn" onclick="window.editUserPermissions(window.currentEditingUserId || window.currentViewingUserId); window.toggleProfileSettingsMenu(null, true)"
                                        class="w-full flex items-center gap-3.5 px-3.5 py-3 hover:bg-slate-50 rounded-2xl transition-all group text-left">
                                        <div class="w-6 flex items-center justify-center shrink-0">
                                            <i class="fa-solid fa-user-shield text-black text-sm"></i>
                                        </div>
                                        <span id="profile-edit-permissions-label" class="text-xs md:text-sm font-medium text-black font-['Inter']">Edit Permissions</span>
                                    </button>
                                    <button type="button" id="profile-change-pw-btn" onclick="window.requestPasswordChange(window.currentEditingUserId || window.currentViewingUserId); window.toggleProfileSettingsMenu(null, true)"
                                        class="w-full flex items-center gap-3.5 px-3.5 py-3 hover:bg-slate-50 rounded-2xl transition-all group text-left">
                                        <div class="w-6 flex items-center justify-center shrink-0">
                                            <i class="fa-solid fa-key text-black text-sm"></i>
                                        </div>
                                        <span class="text-xs md:text-sm font-medium text-black font-['Inter']">Change Password</span>
                                    </button>
                                    <button type="button" id="profile-lock-btn" onclick="window.toggleUserLock(window.currentEditingUserId || window.currentViewingUserId); window.toggleProfileSettingsMenu(null, true)"
                                        class="w-full flex items-center gap-3.5 px-3.5 py-3 hover:bg-slate-50 rounded-2xl transition-all group text-left">
                                        <div class="w-6 flex items-center justify-center shrink-0">
                                            <i id="profile-lock-icon" class="fa-solid fa-lock text-black text-sm"></i>
                                        </div>
                                        <span id="profile-lock-label" class="text-xs md:text-sm font-medium text-black font-['Inter']">Lock Account</span>
                                    </button>
                                    <button type="button" id="profile-status-btn" onclick="window.handleProfileMenuToggleStatus(); window.toggleProfileSettingsMenu(null, true)"
                                        class="w-full flex items-center gap-3.5 px-3.5 py-3 hover:bg-red-50 rounded-2xl transition-all group text-left text-red-600">
                                        <div class="w-6 flex items-center justify-center shrink-0">
                                            <i id="profile-status-icon" class="fa-solid fa-user-slash text-red-600 text-sm"></i>
                                        </div>
                                        <span id="profile-status-label" class="text-xs md:text-sm font-medium text-red-600 font-['Inter']">Deactivate Account</span>
                                    </button>
                                    <button type="button" id="profile-delete-btn" onclick="window.requestDeleteUser(window.currentEditingUserId || window.currentViewingUserId); window.toggleProfileSettingsMenu(null, true)"
                                        class="w-full flex items-center gap-3.5 px-3.5 py-3 hover:bg-red-50 rounded-2xl transition-all group text-left text-red-600">
                                        <div class="w-6 flex items-center justify-center shrink-0">
                                            <i class="fa-solid fa-trash-can text-red-600 text-sm"></i>
                                        </div>
                                        <span class="text-xs md:text-sm font-medium text-red-600 font-['Inter']">Delete Account</span>
                                    </button>
                                </div>
                            </div>

                            <!-- 2. Three Dots Action Button (Only for "View Profile" mode from table) -->
                            <button type="button" id="profile-actions-dots-btn"
                                onclick="window.toggleProfileActionsMenu(event)"
                                class="hidden w-10 h-10 bg-white hover:bg-slate-50 border border-slate-200 rounded-full flex items-center justify-center text-black transition-all group shadow-sm"
                                title="Actions">
                                <i class="fa-solid fa-ellipsis text-base text-black"></i>
                            </button>
                            <div id="profile-actions-menu"
                                class="hidden absolute right-0 top-full mt-2.5 w-56 bg-white border border-slate-200 rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.12)] z-[110] p-2 overflow-hidden font-['Inter']">
                                <div class="space-y-1">
                                    <button type="button" id="profile-actions-edit-btn" onclick="window.editUserAccountProfile(window.currentViewingUserId || window.currentEditingUserId); window.toggleProfileActionsMenu(null, true)"
                                        class="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-slate-50 rounded-2xl transition-all group text-left">
                                        <div class="w-6 flex items-center justify-center shrink-0">
                                            <i class="fa-solid fa-user-pen text-black text-sm"></i>
                                        </div>
                                        <span class="text-xs md:text-sm font-medium text-black font-['Inter']">Edit Account</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Clearance below avatar & Tabs inside Top White Header Panel -->
            <div class="pt-24 pb-0">
                <div id="user-profile-tabs-header-grid" class="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4 md:gap-8 items-center border-t border-slate-200 pt-3 px-6 md:px-10">
                    <div class="flex items-center justify-center shrink-0">
                        <h3 class="text-sm font-semibold text-black tracking-normal font-['Inter'] leading-5">About</h3>
                    </div>
                    <div id="user-profile-tabs-container" class="flex justify-between w-full md:w-auto md:justify-start md:gap-3">
                        <p id="profile-tab-achievements" class="px-3.5 md:px-4 py-2 border-b-[3.5px] border-[#15803d] text-sm font-semibold text-[#15803d] tracking-normal font-['Inter'] cursor-pointer transition-colors whitespace-nowrap leading-5" onclick="window.switchUserProfileTab('achievements')">Achievements</p>
                        <p id="profile-tab-subjects" class="px-3.5 md:px-4 py-2 border-b-[3.5px] border-transparent text-sm font-semibold text-black hover:bg-slate-100 hover:rounded-lg tracking-normal font-['Inter'] cursor-pointer transition-all whitespace-nowrap leading-5" onclick="window.switchUserProfileTab('subjects')">Subjects</p>
                        <p id="profile-tab-sections" class="px-3.5 md:px-4 py-2 border-b-[3.5px] border-transparent text-sm font-semibold text-black hover:bg-slate-100 hover:rounded-lg tracking-normal font-['Inter'] cursor-pointer transition-all whitespace-nowrap leading-5" onclick="window.switchUserProfileTab('sections')">Sections</p>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- TWO PANELS DIRECTLY ON THE DEFAULT PAGE (No enclosing big panel behind them) -->
    <div id="user-profile-panels-grid" class="mx-auto max-w-[1040px] w-full px-6 md:px-10 py-6 grid grid-cols-1 md:grid-cols-[320px_1fr] gap-6 md:gap-8 flex-1">
        <!-- Left Column: Basic Details + Bio Card below it -->
        <aside id="user-profile-left-column" class="flex flex-col gap-6 h-fit">
            <!-- Basic Details Card (Email, ID, Gender, Institutional Role with Bigger Text) -->
            <div class="rounded-[28px] border border-slate-200 bg-white p-7 md:p-8 space-y-4 shadow-sm divide-y divide-slate-200">
                <!-- Email -->
                <div class="space-y-1.5 pt-0">
                    <div class="flex items-center gap-2.5">
                        <i class="fa-solid fa-envelope text-sm md:text-base text-blue-500"></i>
                        <p class="text-sm md:text-base font-semibold text-black font-['Inter']">Email</p>
                    </div>
                    <p id="view-user-email" class="text-base md:text-lg font-medium text-black font-['Inter'] break-words">Not provided</p>
                </div>

                <!-- ID -->
                <div class="space-y-1.5 pt-4">
                    <div class="flex items-center gap-2.5">
                        <i class="fa-solid fa-id-badge text-sm md:text-base text-amber-500"></i>
                        <p class="text-sm md:text-base font-semibold text-black font-['Inter']">ID</p>
                    </div>
                    <p id="view-user-sidebar-id" class="text-base md:text-lg font-normal text-black font-['Inter']">#0000000</p>
                </div>

                <!-- Gender -->
                <div class="space-y-1.5 pt-4">
                    <div class="flex items-center gap-2.5">
                        <i class="fa-solid fa-venus-mars text-sm md:text-base text-purple-500"></i>
                        <p class="text-sm md:text-base font-semibold text-black font-['Inter']">Gender</p>
                    </div>
                    <p id="view-user-gender" class="text-base md:text-lg font-medium text-black font-['Inter']">Not specified</p>
                </div>

                <!-- Institutional Role -->
                <div class="space-y-1.5 pt-4">
                    <div class="flex items-center gap-2.5">
                        <i class="fa-solid fa-user-shield text-sm md:text-base text-emerald-600"></i>
                        <p class="text-sm md:text-base font-semibold text-black font-['Inter']">Institutional Role</p>
                    </div>
                    <p id="view-user-sidebar-role" class="text-base md:text-lg font-medium text-black font-['Inter']">User</p>
                </div>
            </div>

            <!-- Bio Card (Below Basic Details, Same Width) -->
            <div id="user-profile-bio-card-container" class="w-full"></div>
        </aside>

        <!-- Right Column: Tab Panel for Achievements, Subjects, Sections -->
        <section id="user-profile-right-panel" class="rounded-[28px] border border-slate-200 bg-white p-7 min-h-[360px] shadow-sm">
            <div id="user-profile-tab-panel" class="space-y-6"></div>
        </section>
    </div>
</section>

<!-- USER PROFILE PICTURE CHOOSER OVERLAY -->
<div id="user-profile-picture-overlay"
    class="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[1500] hidden flex items-center justify-center p-4">
    <div class="bg-white rounded-[32px] border border-slate-200 shadow-2xl w-full max-w-3xl p-6 sm:p-8 space-y-6 max-h-[90vh] flex flex-col">
        <!-- Top Header & Close Control -->
        <div class="flex items-center justify-between gap-4">
            <h3 class="text-2xl font-bold text-black tracking-tight font-['Inter']">Choose Profile Picture</h3>
            <button type="button" onclick="window.toggleUserProfilePictureOverlay(false)"
                class="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-black transition-colors"
                title="Close picture chooser">
                <i class="fa-solid fa-xmark text-lg"></i>
            </button>
        </div>

        <!-- Action Buttons: Upload Photo & Select / Remove Avatar -->
        <div class="flex items-center gap-3 flex-wrap">
            <input type="file" id="user-profile-picture-input" accept="image/*" class="hidden" aria-label="Upload user profile picture">
            <button type="button"
                id="user-profile-upload-btn"
                onclick="document.getElementById('user-profile-picture-input').click()"
                class="px-5 py-2.5 bg-[#15803d] text-white text-xs font-semibold rounded-xl hover:bg-[#166534] transition-colors font-['Inter'] flex items-center gap-2 cursor-pointer shadow-sm">
                <i class="fa-solid fa-plus text-xs"></i>
                <span>Upload Photo</span>
            </button>
            <button type="button"
                id="user-profile-select-avatar-btn"
                disabled
                onclick="window.confirmAndApplyAvatar()"
                class="px-5 py-2.5 bg-slate-100 text-slate-400 opacity-50 cursor-not-allowed text-xs font-semibold rounded-xl transition-all font-['Inter'] flex items-center gap-2">
                <span>Select Avatar</span>
            </button>
            <button type="button"
                id="user-profile-remove-avatar-btn"
                onclick="window.confirmAndRemoveAvatar()"
                class="hidden px-5 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold rounded-xl transition-colors font-['Inter'] flex items-center gap-2 cursor-pointer shadow-sm">
                <span>Remove Avatar</span>
            </button>
        </div>

        <!-- Content Area: Uploads + Generated Avatars -->
        <div class="border-t border-slate-200 pt-5 space-y-6 overflow-y-auto pr-1 flex-1">
            <div class="space-y-3">
                <div class="flex items-center justify-between">
                    <p class="text-sm font-bold text-black font-['Inter']">Uploads</p>
                </div>

                <!-- Uploaded Photos Grid -->
                <div id="user-profile-picture-uploads"
                    class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 min-h-[40px]">
                </div>
            </div>

            <!-- Generated Avatars Section -->
            <div class="space-y-3 pt-4 border-t border-slate-200">
                <div class="flex items-center justify-between">
                    <p class="text-sm font-bold text-black font-['Inter']">Select an Avatar</p>
                </div>
                <div id="user-profile-generated-avatars"
                    class="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-3 sm:gap-4 p-3 bg-slate-50/70 rounded-2xl border border-slate-200 max-h-[300px] overflow-y-auto">
                </div>
            </div>
        </div>
    </div>
</div>


