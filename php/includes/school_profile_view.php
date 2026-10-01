<?php
/**
 * SIGMA ELMS - Shared School Profile Component
 * Interface Computer College
 */
?>
<!-- SCHOOL PROFILE VIEW -->
<section id="school-profile-view" class="dynamic-section hidden">
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
                        <button type="button" id="profile-logo-trigger"
                            onclick="window.toggleProfilePictureOverlay(true)"
                            class="w-40 h-40 md:w-48 md:h-48 rounded-full bg-white flex items-center justify-center focus:outline-none shrink-0 mb-[-74px] overflow-hidden cursor-pointer border-4 border-white shadow-md transition-transform hover:scale-[1.02]"
                            title="Change school logo">
                            <img id="view-school-logo" src="../image/ICC logo.jpg" alt="School Logo" class="w-full h-full object-contain p-3">
                            <div id="view-school-logo-placeholder" class="hidden w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
                                <i class="fa-solid fa-graduation-cap text-5xl md:text-6xl text-slate-400"></i>
                            </div>
                        </button>
                        <div class="flex-1 md:pb-5">
                            <div class="flex flex-col items-start gap-1.5">
                                <h2 class="text-[1.85rem] md:text-[2.6rem] font-bold text-white tracking-tight leading-[1.02]">
                                    <span id="view-school-branch-name">Interface Computer College Caloocan</span>
                                </h2>
                                <div class="flex items-center gap-3">
                                    <span class="profile-role-badge">Institution</span>
                                    <span class="text-xs md:text-sm font-bold tracking-wider text-white drop-shadow-sm">Campus: Caloocan</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Clearance below avatar & About Header inside Top White Header Panel -->
            <div class="pt-24 pb-3">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 items-center border-t-2 border-slate-300 pt-4">
                    <div class="flex items-center justify-center shrink-0">
                        <h3 class="text-base font-bold text-black tracking-normal font-['Inter']">About</h3>
                    </div>
                    <div></div>
                </div>
            </div>
        </div>
    </div>

    <!-- TWO PANELS DIRECTLY ON THE DEFAULT PAGE (2 Equal Columns like User Profile Admin View) -->
    <div class="mx-auto max-w-[1040px] w-full px-6 md:px-10 py-6 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 flex-1">
        <!-- Left Column: Basic Details (Street, Contact, Email with divide-y lines) -->
        <aside class="flex flex-col gap-6 h-fit w-full">
            <div class="rounded-[28px] border border-slate-200 bg-white p-7 md:p-8 space-y-4 shadow-sm divide-y divide-slate-200">
                <!-- Street / Address -->
                <div class="space-y-1.5 pt-0">
                    <div class="flex items-center gap-2.5">
                        <i class="fa-solid fa-location-dot text-sm md:text-base text-red-500"></i>
                        <p class="text-sm md:text-base font-bold text-black font-['Inter']">Street</p>
                    </div>
                    <p id="view-address" class="text-base md:text-lg font-medium text-black font-['Inter'] break-words">10th Avenue corner Rizal Avenue Extension</p>
                </div>

                <!-- Contact -->
                <div class="space-y-1.5 pt-4">
                    <div class="flex items-center gap-2.5">
                        <i class="fa-solid fa-phone text-sm md:text-base text-emerald-600"></i>
                        <p class="text-sm md:text-base font-bold text-black font-['Inter']">Contact</p>
                    </div>
                    <p id="view-contact" class="text-base md:text-lg font-medium text-black font-['Inter'] break-words">09947669267</p>
                </div>

                <!-- Email -->
                <div class="space-y-1.5 pt-4">
                    <div class="flex items-center gap-2.5">
                        <i class="fa-solid fa-envelope text-sm md:text-base text-blue-500"></i>
                        <p class="text-sm md:text-base font-bold text-black font-['Inter']">Email</p>
                    </div>
                    <p id="view-email" class="text-base md:text-lg font-medium text-black font-['Inter'] break-words">information@interface.edu.ph</p>
                </div>
            </div>
        </aside>

        <!-- Right Column: Bio Panel -->
        <section id="school-profile-tab-panel" class="w-full"></section>
    </div>
</section>

<!-- SCHOOL PROFILE PICTURE CHOOSER OVERLAY -->
<div id="profile-picture-overlay"
    class="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[1500] hidden flex items-center justify-center p-4">
    <div
        class="bg-white rounded-[32px] border border-slate-200 shadow-2xl w-full max-w-3xl p-6 sm:p-8 space-y-6 max-h-[90vh] flex flex-col font-['Inter']">
        <!-- Top Header & Close Control -->
        <div class="flex items-center justify-between gap-4">
            <h3 class="text-2xl font-bold text-black tracking-tight font-['Inter']">Choose Profile Picture</h3>
            <button type="button" onclick="window.toggleProfilePictureOverlay(false)"
                class="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-black transition-colors"
                title="Close picture chooser">
                <i class="fa-solid fa-xmark text-lg"></i>
            </button>
        </div>

        <!-- Action Buttons: Upload Photo & Select / Remove Avatar -->
        <div class="flex items-center gap-3 flex-wrap">
            <input type="file" id="profile-picture-input" accept="image/*" class="hidden" aria-label="Upload school profile image">
            <button type="button" id="school-profile-upload-btn"
                onclick="document.getElementById('profile-picture-input').click()"
                class="px-5 py-2.5 bg-[#15803d] text-white text-xs font-semibold rounded-xl hover:bg-[#166534] transition-colors font-['Inter'] flex items-center gap-2 cursor-pointer shadow-sm">
                <i class="fa-solid fa-plus text-xs"></i>
                <span>Upload Photo</span>
            </button>
            <button type="button"
                id="school-profile-select-avatar-btn"
                disabled
                onclick="window.confirmAndApplySchoolAvatar()"
                class="px-5 py-2.5 bg-slate-100 text-slate-400 opacity-50 cursor-not-allowed text-xs font-semibold rounded-xl transition-all font-['Inter'] flex items-center gap-2">
                <span>Select Avatar</span>
            </button>
            <button type="button"
                id="school-profile-remove-avatar-btn"
                onclick="window.confirmAndRemoveSchoolAvatar()"
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
                <div id="profile-picture-uploads"
                    class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 min-h-[40px]">
                </div>
            </div>

            <div class="space-y-3 pt-4 border-t border-slate-200">
                <div class="flex items-center justify-between">
                    <p class="text-sm font-bold text-black font-['Inter']">Select An Avatar</p>
                </div>
                <div id="school-profile-generated-avatars"
                    class="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-3 sm:gap-4 p-3 bg-slate-50/70 rounded-2xl border border-slate-200 max-h-[300px] overflow-y-auto">
                </div>
            </div>
        </div>
    </div>
</div>

<!-- SCHOOL PROFILE EDIT OVERLAY (Full Screen Workstation) -->
<div id="profile-edit-overlay"
    class="fixed inset-0 bg-slate-50 z-[1000] hidden flex flex-col items-center p-0 overflow-y-auto custom-scrollbar font-['Inter']">
    <!-- Exit Control (Far Right) -->
    <button type="button" onclick="window.handleProfileExit()"
        class="fixed top-10 right-10 w-12 h-12 rounded-full hover:bg-slate-200 flex items-center justify-center text-black transition-all z-[1001] cursor-pointer"
        title="Exit Editor">
        <i class="fa-solid fa-xmark text-xl"></i>
    </button>

    <div class="mx-auto max-w-[1024px] w-full p-0 animate-in slide-in-from-top-4 duration-500">
        <!-- White Panel (Same 1024px Width, Centered, Full Height) -->
        <div
            class="bg-white border-x border-slate-200 min-h-screen p-0 standard-panel-shadow relative flex flex-col">
            <div class="px-10 py-8 border-b border-slate-50 sticky top-0 bg-white z-20">
                <h1 class="text-2xl font-bold text-black tracking-tight font-['Inter']">Edit School Profile</h1>
            </div>

            <!-- Form Body -->
            <div id="profile-edit-form-body" class="flex-1 p-10 pt-10 space-y-10">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div class="space-y-3">
                        <label for="edit-profile-name"
                            class="text-[10px] font-black text-black uppercase tracking-widest ml-1">School
                            Name</label>
                        <input type="text" id="edit-profile-name" maxlength="30"
                            placeholder="School Name"
                            oninput="this.value = this.value.replace(/[^a-zA-Z\s]/g, '')"
                            class="w-full bg-transparent border-b-2 border-slate-200 px-1 py-4 text-xl font-medium text-black outline-none focus:border-black transition-all placeholder:text-black/40 font-['Inter']">
                    </div>
                    <div class="space-y-3">
                        <label for="edit-profile-motto"
                            class="text-[10px] font-black text-black uppercase tracking-widest ml-1">Institutional
                            Motto</label>
                        <input type="text" id="edit-profile-motto" maxlength="50" placeholder="Motto"
                            class="w-full bg-transparent border-b-2 border-slate-200 px-1 py-4 text-xl font-medium text-black outline-none focus:border-black transition-all placeholder:text-black/40 font-['Inter']">
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div class="space-y-3">
                        <label for="edit-profile-id"
                            class="text-[10px] font-black text-black uppercase tracking-widest ml-1">School
                            ID</label>
                        <input type="text" id="edit-profile-id" maxlength="10" placeholder="School ID"
                            oninput="this.value = this.value.replace(/[^0-9]/g, '')"
                            class="w-full bg-transparent border-b-2 border-slate-200 px-1 py-4 text-xl font-medium text-black outline-none focus:border-black transition-all placeholder:text-black/40 font-['Inter']">
                    </div>
                    <div class="space-y-3">
                        <label for="edit-profile-email"
                            class="text-[10px] font-black text-black uppercase tracking-widest ml-1">Email</label>
                        <input type="email" id="edit-profile-email" maxlength="64" placeholder="Email Address"
                            oninput="let atCount = (this.value.match(/@/g) || []).length; if(atCount > 1) this.value = this.value.replace(/@$/, '')"
                            class="w-full bg-transparent border-b-2 border-slate-200 px-1 py-4 text-xl font-medium text-black outline-none focus:border-black transition-all placeholder:text-black/40 font-['Inter']">
                    </div>
                </div>

                <div class="space-y-3">
                    <label for="edit-profile-vision"
                        class="text-[10px] font-black text-black uppercase tracking-widest ml-1">Vision
                        Statement</label>
                    <textarea id="edit-profile-vision" rows="3" maxlength="1000" placeholder="Institutional Vision"
                        class="sigma-textarea w-full bg-slate-50 border border-slate-300 rounded-2xl px-4 py-4 text-base font-medium text-black outline-none hover:bg-slate-100 hover:border-slate-400 focus:bg-white focus:border-black transition-all placeholder:text-black/40 font-['Inter'] resize-none"></textarea>
                </div>

                <div class="space-y-3">
                    <label for="edit-profile-mission"
                        class="text-[10px] font-black text-black uppercase tracking-widest ml-1">Mission
                        Statement</label>
                    <textarea id="edit-profile-mission" rows="3" maxlength="1000" placeholder="Institutional Mission"
                        class="sigma-textarea w-full bg-slate-50 border border-slate-300 rounded-2xl px-4 py-4 text-base font-medium text-black outline-none hover:bg-slate-100 hover:border-slate-400 focus:bg-white focus:border-black transition-all placeholder:text-black/40 font-['Inter'] resize-none"></textarea>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-10">
                    <div class="space-y-3">
                        <label for="edit-profile-address"
                            class="text-[10px] font-black text-black uppercase tracking-widest ml-1">Street
                            / Address</label>
                        <input type="text" id="edit-profile-address" maxlength="50"
                            placeholder="Street Address"
                            class="w-full bg-transparent border-b-2 border-slate-200 px-1 py-4 text-xl font-medium text-black outline-none focus:border-black transition-all placeholder:text-black/40 font-['Inter']">
                    </div>
                    <div class="space-y-3">
                        <label for="edit-profile-city"
                            class="text-[10px] font-black text-black uppercase tracking-widest ml-1">City</label>
                        <input type="text" id="edit-profile-city" maxlength="30" placeholder="City"
                            oninput="this.value = this.value.replace(/[^a-zA-Z\s]/g, '')"
                            class="w-full bg-transparent border-b-2 border-slate-200 px-1 py-4 text-xl font-medium text-black outline-none focus:border-black transition-all placeholder:text-black/40 font-['Inter']">
                    </div>
                    <div class="space-y-3">
                        <label for="edit-profile-contact"
                            class="text-[10px] font-black text-black uppercase tracking-widest ml-1">Contact
                            No</label>
                        <input type="text" id="edit-profile-contact" maxlength="11"
                            placeholder="Contact No"
                            oninput="this.value = this.value.replace(/[^0-9]/g, '')"
                            class="w-full bg-transparent border-b-2 border-slate-200 px-1 py-4 text-xl font-medium text-black outline-none focus:border-black transition-all placeholder:text-black/40 font-['Inter']">
                    </div>
                </div>
            </div>

            <!-- Final Action Footer -->
            <div
                class="px-10 py-8 border-t border-slate-100 flex justify-between items-center bg-white sticky bottom-0 z-10 font-['Inter']">
                <div></div>
                <div class="flex items-center gap-4">
                    <button type="button" onclick="window.handleProfileDiscard()"
                        class="px-10 py-3 bg-white border border-slate-200 text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-all shadow-sm cursor-pointer">Discard</button>
                    <button type="button" id="profile-save-btn" onclick="window.handleProfileSave()"
                        class="px-12 py-3 bg-[#15803d] text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[#166534] transition-all shadow-lg shadow-green-100 flex items-center justify-center gap-3 cursor-pointer">
                        <span>Save Changes</span>
                        <i class="fa-solid fa-circle-notch fa-spin hidden" id="profile-save-loading"></i>
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- PROFILE ACTION CONFIRMATION OVERLAY -->
<div id="profile-confirm-overlay"
    class="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[2000] hidden flex items-center justify-center p-4">
    <div
        class="bg-white rounded-[32px] border border-slate-200 shadow-2xl w-full max-w-sm p-8 animate-in zoom-in-95 duration-200">
        <div class="text-center space-y-4">
            <div
                class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-black border border-slate-100">
                <i class="fa-solid fa-building-columns text-2xl"></i>
            </div>
            <h3 id="profile-confirm-title" class="text-xl font-bold text-black leading-tight">
                Confirmation Title</h3>
            <p id="profile-confirm-desc" class="text-sm font-medium text-black/70 px-4 leading-relaxed">
                Explanation text goes here.</p>
        </div>
        <div class="grid grid-cols-2 gap-3 mt-8">
            <button id="profile-confirm-cancel"
                class="py-3.5 bg-slate-100 text-black rounded-2xl text-sm font-bold capitalize tracking-normal hover:bg-slate-200 transition-all cursor-pointer font-['Inter'] shadow-none">Cancel</button>
            <button id="profile-confirm-proceed"
                class="py-3.5 bg-[#15803d] text-white rounded-2xl text-sm font-bold capitalize tracking-normal hover:bg-[#166534] transition-all cursor-pointer font-['Inter'] shadow-none">Proceed</button>
        </div>
    </div>
</div>
