<?php
/**
 * SIGMA ELMS - Unified In-App System Settings Views
 * Interface Computer College
 */
?>
<!-- ═══ SYSTEM SETTINGS 1: SECURITY & ACCESS VIEW ═══ -->
<section id="settings-security-view" class="dynamic-section hidden">
    <div class="sigma-settings-layout">
        <!-- Left Categories Sidebar (Help Center Style) -->
        <aside class="sigma-settings-sidebar">
            <h2 class="text-xs font-bold text-black-fade tracking-wide mb-6">Security &amp; Access</h2>
            <nav class="flex flex-col gap-2" role="tablist" aria-label="Security & Access Sections">
                <button type="button" 
                    class="sigma-settings-cat-btn active bg-icc-yellow text-white shadow-sm" 
                    data-settings-target="sec-recaptcha-panel"
                    onclick="window.scrollToSettingsSection('sec-recaptcha-panel', this)"
                    role="tab"
                    aria-selected="true">
                    <span class="sigma-settings-cat-icon">
                        <i class="fa-solid fa-robot text-inherit"></i>
                    </span>
                    <span class="sigma-settings-cat-text text-inherit">reCAPTCHA Bot Defense</span>
                </button>
                <button type="button" 
                    class="sigma-settings-cat-btn text-black hover:bg-slate-100" 
                    data-settings-target="sec-lockout-panel"
                    onclick="window.scrollToSettingsSection('sec-lockout-panel', this)"
                    role="tab"
                    aria-selected="false">
                    <span class="sigma-settings-cat-icon">
                        <i class="fa-solid fa-user-lock text-inherit"></i>
                    </span>
                    <span class="sigma-settings-cat-text text-inherit">Account Lockout Policy</span>
                </button>
                <button type="button" 
                    id="nav-settings-maintenance"
                    class="sigma-settings-cat-btn text-black hover:bg-slate-100" 
                    data-settings-target="sec-maintenance-panel"
                    onclick="window.scrollToSettingsSection('sec-maintenance-panel', this)"
                    role="tab"
                    aria-selected="false">
                    <span class="sigma-settings-cat-icon">
                        <i class="fa-solid fa-screwdriver-wrench text-inherit"></i>
                    </span>
                    <span class="sigma-settings-cat-text text-inherit">System Access &amp; Maintenance</span>
                </button>
            </nav>
        </aside>

        <!-- Right Content Area (Single continuous scrollable page) -->
        <section class="sigma-settings-main">
            <div class="sigma-settings-inner">
                <!-- Card 1: reCAPTCHA Protection -->
                <div id="sec-recaptcha-panel" class="sigma-settings-panel-card">
                    <div class="sigma-panel-header">
                        <h2 class="sigma-panel-title">reCAPTCHA Bot Defense</h2>
                        <p class="sigma-panel-subtitle">Configure automated challenge thresholds when repeated suspicious login attempts occur.</p>
                    </div>
                    <div class="space-y-6">
                        <div class="grid grid-cols-1 md:grid-cols-3 items-center py-4 border-b border-slate-50 gap-4">
                            <div>
                                <p class="text-sm font-bold text-black font-['Inter']">Login Attempts Threshold</p>
                                <span class="text-xs text-black-fade font-medium">Failed identifier submissions</span>
                            </div>
                            <div class="text-left md:text-center">
                                <p class="text-xs text-black-fade font-medium">Number of attempts before reCAPTCHA challenge appears (Max: 50)</p>
                            </div>
                            <div class="flex items-center justify-start md:justify-end gap-3">
                                <input type="number" id="login-id-attempts" aria-label="Failed identifier submissions attempt threshold" value="3" max="50" min="1"
                                    class="w-24 bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-sm font-bold text-black text-center outline-none focus:border-[#FFD000] transition-all font-['Inter']">
                                <span class="text-[10px] font-bold text-black uppercase tracking-widest font-['Inter']">Attempts</span>
                            </div>
                        </div>
                        <div class="flex justify-end pt-2">
                            <button type="button" onclick="window.saveSecuritySettings()"
                                class="flex items-center gap-2 px-6 py-2.5 bg-[#15803d] text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-[#166534] transition-all shadow-sm">
                                <i class="fa-solid fa-check"></i>
                                <span>Save Threshold</span>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Card 2: Account Lockout -->
                <div id="sec-lockout-panel" class="sigma-settings-panel-card">
                    <div class="sigma-panel-header">
                        <h2 class="sigma-panel-title">Account Lockout Policy</h2>
                        <p class="sigma-panel-subtitle">Safeguard user credentials by automatically freezing accounts upon repeated password failures.</p>
                    </div>
                    <div class="space-y-6">
                        <div class="grid grid-cols-1 md:grid-cols-3 items-center py-4 border-b border-slate-50 gap-4">
                            <div>
                                <p class="text-sm font-bold text-black font-['Inter']">Password Failure Limit</p>
                                <span class="text-xs text-black-fade font-medium">Brute-force mitigation</span>
                            </div>
                            <div class="text-left md:text-center">
                                <p class="text-xs text-black-fade font-medium">Number of attempts before account lockout occurs (Max: 50)</p>
                            </div>
                            <div class="flex items-center justify-start md:justify-end gap-3">
                                <input type="number" id="password-lockout-attempts" aria-label="Brute-force password failure limit attempts" value="8" max="50" min="1"
                                    class="w-24 bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-sm font-bold text-black text-center outline-none focus:border-[#FFD000] transition-all font-['Inter']">
                                <span class="text-[10px] font-bold text-black uppercase tracking-widest font-['Inter']">Attempts</span>
                            </div>
                        </div>
                        <div class="flex justify-end pt-2">
                            <button type="button" id="security-save-btn" onclick="window.saveSecuritySettings()"
                                class="flex items-center gap-2 px-6 py-2.5 bg-[#15803d] text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-[#166534] transition-all shadow-sm">
                                <i class="fa-solid fa-floppy-disk text-xs"></i>
                                <span>Save Policy</span>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Card 3: System Lockdown & Maintenance -->
                <div id="sec-maintenance-panel" class="sigma-settings-panel-card">
                    <div class="sigma-panel-header">
                        <h2 class="sigma-panel-title">System Access &amp; Maintenance</h2>
                        <p class="sigma-panel-subtitle">Use one control for the important state only: keep the system operational or place it in maintenance mode while Admin access stays available.</p>
                    </div>

                    <div class="space-y-6">
                        <!-- Maintenance Toggle -->
                        <div id="sec-maintenance-toggle-row" class="grid grid-cols-1 md:grid-cols-3 items-center py-4 border-b border-slate-50 gap-4">
                            <div>
                                <p class="text-sm font-bold text-black font-['Inter']">Maintenance / Lockdown Mode</p>
                                <span class="text-xs text-black-fade font-medium">Combined access restriction and forced logout</span>
                            </div>
                            <div class="text-left md:text-center">
                                <p class="text-xs text-black-fade font-medium">Immediately logs out active Student and Teacher sessions, then blocks new sign-ins while Master Admins retain full access</p>
                            </div>
                            <div class="flex items-center justify-start md:justify-end">
                                <label class="sigma-toggle-switch cursor-pointer">
                                    <input type="checkbox" id="settings-maintenance-toggle" aria-label="Toggle restricted access maintenance mode"
                                        onchange="window.handleAdminMaintenanceToggleChange(this.checked)">
                                    <span class="sigma-toggle-slider"></span>
                                </label>
                            </div>
                        </div>

                        <!-- Notice Message -->
                        <div id="sec-notice-message-section" class="space-y-3 py-2">
                            <div id="settings-maintenance-master-note" class="hidden rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-medium text-amber-700">
                                <i class="fa-solid fa-lock mr-1.5"></i>
                                Only Master Admin can activate maintenance mode or update the restricted access notice.
                            </div>
                            <label for="settings-maintenance-message" class="block text-sm font-bold text-black font-['Inter']">
                                Restricted Access Notice Message
                            </label>
                            <p class="text-xs text-black-fade font-medium">
                                This message is shown to Students and Teachers on the login screen if they attempt to sign in during lockdown.
                            </p>
                            <textarea id="settings-maintenance-message" rows="3" maxlength="300"
                                class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm font-medium text-black outline-none focus:bg-white focus:border-[#15803d] transition-all font-['Inter']"
                                placeholder="Enter custom notice message for students and teachers..."></textarea>
                            <div class="flex items-center justify-between pt-1 flex-wrap gap-2">
                                <span class="text-[11px] text-black-fade font-medium">Default notice will be used if left empty</span>
                                <button type="button" id="settings-maintenance-message-save" onclick="window.saveMaintenanceMessageOnly()"
                                    class="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-black text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer">
                                    <i class="fa-solid fa-floppy-disk text-xs"></i>
                                    <span>Save Notice Message</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </div>
</section>

<!-- ═══ SYSTEM SETTINGS 2: BRANDING & APPEARANCE VIEW ═══ -->
<section id="settings-branding-view" class="dynamic-section hidden">
    <div class="sigma-settings-layout">
        <!-- Left Categories Sidebar -->
        <aside class="sigma-settings-sidebar">
            <h2 class="text-xs font-bold text-black-fade tracking-wide mb-6">Branding &amp; Appearance</h2>
            <nav class="flex flex-col gap-2" role="tablist" aria-label="Branding Sections">
                <button type="button" 
                    class="sigma-settings-cat-btn active bg-icc-yellow text-white shadow-sm" 
                    data-settings-target="brand-logos-panel"
                    onclick="window.scrollToSettingsSection('brand-logos-panel', this)"
                    role="tab"
                    aria-selected="true">
                    <span class="sigma-settings-cat-icon">
                        <i class="fa-solid fa-image text-inherit"></i>
                    </span>
                    <span class="sigma-settings-cat-text text-inherit">Institutional Logos</span>
                </button>
                <button type="button" 
                    class="sigma-settings-cat-btn text-black hover:bg-slate-100" 
                    data-settings-target="brand-slides-panel"
                    onclick="window.scrollToSettingsSection('brand-slides-panel', this)"
                    role="tab"
                    aria-selected="false">
                    <span class="sigma-settings-cat-icon">
                        <i class="fa-solid fa-images text-inherit"></i>
                    </span>
                    <span class="sigma-settings-cat-text text-inherit">Login Slideshow</span>
                </button>
                <button type="button" 
                    class="sigma-settings-cat-btn text-black hover:bg-slate-100" 
                    data-settings-target="brand-welcome-panel"
                    onclick="window.scrollToSettingsSection('brand-welcome-panel', this)"
                    role="tab"
                    aria-selected="false">
                    <span class="sigma-settings-cat-icon">
                        <i class="fa-solid fa-panorama text-inherit"></i>
                    </span>
                    <span class="sigma-settings-cat-text text-inherit">Dashboard Welcome Banner</span>
                </button>
            </nav>
        </aside>

        <!-- Right Content Area (Single continuous scrollable page) -->
        <section class="sigma-settings-main">
            <div class="sigma-settings-inner">
                <!-- Card 1: Institutional Logos -->
                <div id="brand-logos-panel" class="sigma-settings-panel-card">
                    <div class="sigma-panel-header">
                        <h2 class="sigma-panel-title">Institutional Logos</h2>
                        <p class="sigma-panel-subtitle">Manage official logos utilized across login portals, landing headers, and dashboard navigation bars.</p>
                    </div>

                    <div class="space-y-8">
                        <!-- Login Form Logo -->
                        <div class="grid grid-cols-1 md:grid-cols-3 items-center gap-6 py-4 border-b border-slate-50">
                            <div>
                                <p class="text-sm font-bold text-black font-['Inter']">Login Form Logo</p>
                                <span class="text-xs text-black-fade font-medium">Main authentication modal &amp; card</span>
                            </div>
                            <div class="text-left md:text-center">
                                <p class="text-xs text-black-fade font-medium">Main login portal center logo displayed in authentication boxes.</p>
                            </div>
                            <div class="flex flex-col items-center justify-center">
                                <div class="w-[11rem] h-[11rem] bg-slate-50 border border-slate-200 rounded-xl flex flex-col items-center justify-between p-4 group relative overflow-hidden">
                                    <button type="button" onclick="window.deleteBranding('login-logo')"
                                        class="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/80 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-white transition-all opacity-0 group-hover:opacity-100 z-10" title="Delete logo">
                                        <i class="fa-solid fa-trash-can text-[10px]"></i>
                                    </button>
                                    <div class="flex-1 flex items-center justify-center w-full">
                                        <img id="login-logo-preview" src="image/ICC logo.jpg" class="max-h-[100px] w-auto object-contain rounded-lg" alt="Login Form Logo">
                                        <div id="login-logo-placeholder" class="hidden flex flex-col items-center justify-center text-slate-400">
                                            <i class="fa-solid fa-cloud-arrow-up text-2xl mb-2"></i>
                                            <span class="text-[10px] font-bold uppercase tracking-widest">Upload Photo</span>
                                        </div>
                                    </div>
                                    <input type="file" id="login-logo-input" class="hidden" accept="image/*" aria-label="Upload Login Form Logo">
                                    <button type="button" onclick="document.getElementById('login-logo-input').click()"
                                        class="w-full py-2 bg-white border border-slate-200 text-[10px] font-bold text-black uppercase tracking-widest rounded-lg hover:bg-slate-100 transition-all font-['Inter'] mt-3 cursor-pointer">Replace</button>
                                </div>
                                <button type="button" id="login-logo-cancel" onclick="window.clearBrandingPreview('login-logo')"
                                    class="hidden mt-2 text-[10px] font-bold text-red-500 uppercase tracking-widest hover:text-red-700 transition-all">Cancel</button>
                            </div>
                        </div>

                        <!-- Login Bar Logo -->
                        <div class="grid grid-cols-1 md:grid-cols-3 items-center gap-6 py-4 border-b border-slate-50">
                            <div>
                                <p class="text-sm font-bold text-black font-['Inter']">Login Bar Logo</p>
                                <span class="text-xs text-black-fade font-medium">Public landing page header</span>
                            </div>
                            <div class="text-left md:text-center">
                                <p class="text-xs text-black-fade font-medium">Landing page top navigation logo displayed in public portal navbar.</p>
                            </div>
                            <div class="flex flex-col items-center justify-center">
                                <div class="w-[11rem] h-[11rem] bg-slate-50 border border-slate-200 rounded-xl flex flex-col items-center justify-between p-4 group relative overflow-hidden">
                                    <button type="button" onclick="window.deleteBranding('login-bar-logo')"
                                        class="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/80 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-white transition-all opacity-0 group-hover:opacity-100 z-10" title="Delete logo">
                                        <i class="fa-solid fa-trash-can text-[10px]"></i>
                                    </button>
                                    <div class="flex-1 flex items-center justify-center w-full">
                                        <img id="login-bar-logo-preview" src="image/ICC logo.jpg" class="max-h-[100px] w-auto object-contain rounded-lg" alt="Login Bar Logo">
                                        <div id="login-bar-logo-placeholder" class="hidden flex flex-col items-center justify-center text-slate-400">
                                            <i class="fa-solid fa-cloud-arrow-up text-2xl mb-2"></i>
                                            <span class="text-[10px] font-bold uppercase tracking-widest">Upload Photo</span>
                                        </div>
                                    </div>
                                    <input type="file" id="login-bar-logo-input" class="hidden" accept="image/*" aria-label="Upload Login Bar Logo">
                                    <button type="button" onclick="document.getElementById('login-bar-logo-input').click()"
                                        class="w-full py-2 bg-white border border-slate-200 text-[10px] font-bold text-black uppercase tracking-widest rounded-lg hover:bg-slate-100 transition-all font-['Inter'] mt-3 cursor-pointer">Replace</button>
                                </div>
                                <button type="button" id="login-bar-logo-cancel" onclick="window.clearBrandingPreview('login-bar-logo')"
                                    class="hidden mt-2 text-[10px] font-bold text-red-500 uppercase tracking-widest hover:text-red-700 transition-all">Cancel</button>
                            </div>
                        </div>

                        <!-- Users Bar Logo -->
                        <div class="grid grid-cols-1 md:grid-cols-3 items-center gap-6 py-4">
                            <div>
                                <p class="text-sm font-bold text-black font-['Inter']">Users Bar Logo</p>
                                <span class="text-xs text-black-fade font-medium">In-app topbar across all roles</span>
                            </div>
                            <div class="text-left md:text-center">
                                <p class="text-xs text-black-fade font-medium">Dashboard navigation logo displayed for Admin, Teacher, and Student views.</p>
                            </div>
                            <div class="flex flex-col items-center justify-center">
                                <div class="w-[11rem] h-[11rem] bg-slate-50 border border-slate-200 rounded-xl flex flex-col items-center justify-between p-4 group relative overflow-hidden">
                                    <button type="button" onclick="window.deleteBranding('nav-logo')"
                                        class="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/80 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-white transition-all opacity-0 group-hover:opacity-100 z-10" title="Delete logo">
                                        <i class="fa-solid fa-trash-can text-[10px]"></i>
                                    </button>
                                    <div class="flex-1 flex items-center justify-center w-full">
                                        <img id="nav-logo-preview" src="image/ICC logo.jpg" class="max-h-[100px] w-auto object-contain rounded-lg" alt="Nav Logo">
                                        <div id="nav-logo-placeholder" class="hidden flex flex-col items-center justify-center text-slate-400">
                                            <i class="fa-solid fa-cloud-arrow-up text-2xl mb-2"></i>
                                            <span class="text-[10px] font-bold uppercase tracking-widest">Upload Photo</span>
                                        </div>
                                    </div>
                                    <input type="file" id="nav-logo-input" class="hidden" accept="image/*" aria-label="Upload Nav Logo">
                                    <button type="button" onclick="document.getElementById('nav-logo-input').click()"
                                        class="w-full py-2 bg-white border border-slate-200 text-[10px] font-bold text-black uppercase tracking-widest rounded-lg hover:bg-slate-100 transition-all font-['Inter'] mt-3 cursor-pointer">Replace</button>
                                </div>
                                <button type="button" id="nav-logo-cancel" onclick="window.clearBrandingPreview('nav-logo')"
                                    class="hidden mt-2 text-[10px] font-bold text-red-500 uppercase tracking-widest hover:text-red-700 transition-all">Cancel</button>
                            </div>
                        </div>

                        <div class="flex justify-end pt-4">
                            <button type="button" id="branding-save-btn" onclick="window.saveBrandingSettings()"
                                class="flex items-center gap-2 px-8 py-3 bg-[#15803d] text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-[#166534] transition-all shadow-sm cursor-pointer">
                                <i class="fa-solid fa-circle-notch fa-spin hidden"></i>
                                <span>Save Institutional Logos</span>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Card 2: Login Slideshow -->
                <div id="brand-slides-panel" class="sigma-settings-panel-card">
                    <div class="sigma-panel-header">
                        <h2 class="sigma-panel-title">Login Slideshow</h2>
                        <p class="sigma-panel-subtitle">Configure auto-rotating promotional and campus imagery on public login page. Recommended Ratio: 16:9 (1920x1080). Max 7 slides.</p>
                    </div>

                    <div class="space-y-6">
                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-6">
                            <!-- Slide 1 -->
                            <div class="space-y-3">
                                <p class="text-[10px] font-bold text-black-fade uppercase tracking-widest text-center">Slide 1</p>
                                <div class="w-full aspect-square bg-slate-50 border border-slate-200 rounded-xl flex flex-col items-center justify-between p-4 group relative overflow-hidden">
                                    <button type="button" onclick="window.deleteSlide(1)"
                                        class="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/80 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-white transition-all opacity-0 group-hover:opacity-100 z-10">
                                        <i class="fa-solid fa-trash-can text-[10px]"></i>
                                    </button>
                                    <div class="flex-1 flex items-center justify-center w-full">
                                        <img id="login-slide-1-preview" src="image/ICC Shs.jpg" class="w-full h-full object-cover rounded-lg" alt="Slide 1">
                                    </div>
                                    <input type="file" id="login-slide-1-input" class="hidden" accept="image/*" aria-label="Upload Slide 1" onchange="window.handleSlideUpload(event, 1)">
                                    <button type="button" onclick="document.getElementById('login-slide-1-input').click()"
                                        class="w-full py-2 bg-white border border-slate-200 text-[10px] font-bold text-black uppercase tracking-widest rounded-lg hover:bg-slate-100 transition-all font-['Inter'] mt-3 cursor-pointer">Replace</button>
                                </div>
                                <div class="flex justify-center">
                                    <button type="button" id="login-slide-1-cancel" onclick="window.clearSlidePreview(1)"
                                        class="hidden mt-2 text-[10px] font-bold text-red-500 uppercase tracking-widest hover:text-red-700 transition-all">Cancel</button>
                                </div>
                            </div>

                            <!-- Slide 2 -->
                            <div class="space-y-3">
                                <p class="text-[10px] font-bold text-black-fade uppercase tracking-widest text-center">Slide 2</p>
                                <div class="w-full aspect-square bg-slate-50 border border-slate-200 rounded-xl flex flex-col items-center justify-between p-4 group relative overflow-hidden">
                                    <button type="button" onclick="window.deleteSlide(2)"
                                        class="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/80 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-white transition-all opacity-0 group-hover:opacity-100 z-10">
                                        <i class="fa-solid fa-trash-can text-[10px]"></i>
                                    </button>
                                    <div class="flex-1 flex items-center justify-center w-full">
                                        <img id="login-slide-2-preview" src="image/ICC Enrollment.jpg" class="w-full h-full object-cover rounded-lg" alt="Slide 2">
                                    </div>
                                    <input type="file" id="login-slide-2-input" class="hidden" accept="image/*" aria-label="Upload Slide 2" onchange="window.handleSlideUpload(event, 2)">
                                    <button type="button" onclick="document.getElementById('login-slide-2-input').click()"
                                        class="w-full py-2 bg-white border border-slate-200 text-[10px] font-bold text-black uppercase tracking-widest rounded-lg hover:bg-slate-100 transition-all font-['Inter'] mt-3 cursor-pointer">Replace</button>
                                </div>
                                <div class="flex justify-center">
                                    <button type="button" id="login-slide-2-cancel" onclick="window.clearSlidePreview(2)"
                                        class="hidden mt-2 text-[10px] font-bold text-red-500 uppercase tracking-widest hover:text-red-700 transition-all">Cancel</button>
                                </div>
                            </div>

                            <!-- Slide 3 -->
                            <div class="space-y-3">
                                <p class="text-[10px] font-bold text-black-fade uppercase tracking-widest text-center">Slide 3</p>
                                <div class="w-full aspect-square bg-slate-50 border border-slate-200 rounded-xl flex flex-col items-center justify-between p-4 group relative overflow-hidden">
                                    <button type="button" onclick="window.deleteSlide(3)"
                                        class="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/80 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-white transition-all opacity-0 group-hover:opacity-100 z-10">
                                        <i class="fa-solid fa-trash-can text-[10px]"></i>
                                    </button>
                                    <div class="flex-1 flex items-center justify-center w-full">
                                        <img id="login-slide-3-preview" src="image/ICC Immersion.jpg" class="w-full h-full object-cover rounded-lg" alt="Slide 3">
                                    </div>
                                    <input type="file" id="login-slide-3-input" class="hidden" accept="image/*" aria-label="Upload Slide 3" onchange="window.handleSlideUpload(event, 3)">
                                    <button type="button" onclick="document.getElementById('login-slide-3-input').click()"
                                        class="w-full py-2 bg-white border border-slate-200 text-[10px] font-bold text-black uppercase tracking-widest rounded-lg hover:bg-slate-100 transition-all font-['Inter'] mt-3 cursor-pointer">Replace</button>
                                </div>
                                <div class="flex justify-center">
                                    <button type="button" id="login-slide-3-cancel" onclick="window.clearSlidePreview(3)"
                                        class="hidden mt-2 text-[10px] font-bold text-red-500 uppercase tracking-widest hover:text-red-700 transition-all">Cancel</button>
                                </div>
                            </div>

                            <!-- Slide 4 -->
                            <div class="space-y-3">
                                <p class="text-[10px] font-bold text-black-fade uppercase tracking-widest text-center">Slide 4</p>
                                <div class="w-full aspect-square bg-slate-50 border border-slate-200 rounded-xl flex flex-col items-center justify-between p-4 group relative overflow-hidden">
                                    <button type="button" onclick="window.deleteSlide(4)"
                                        class="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/80 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-white transition-all opacity-0 group-hover:opacity-100 z-10">
                                        <i class="fa-solid fa-trash-can text-[10px]"></i>
                                    </button>
                                    <div class="flex-1 flex items-center justify-center w-full">
                                        <img id="login-slide-4-preview" src="image/ICC Interfacer.jpg" class="w-full h-full object-cover rounded-lg" alt="Slide 4">
                                    </div>
                                    <input type="file" id="login-slide-4-input" class="hidden" accept="image/*" aria-label="Upload Slide 4" onchange="window.handleSlideUpload(event, 4)">
                                    <button type="button" onclick="document.getElementById('login-slide-4-input').click()"
                                        class="w-full py-2 bg-white border border-slate-200 text-[10px] font-bold text-black uppercase tracking-widest rounded-lg hover:bg-slate-100 transition-all font-['Inter'] mt-3 cursor-pointer">Replace</button>
                                </div>
                                <div class="flex justify-center">
                                    <button type="button" id="login-slide-4-cancel" onclick="window.clearSlidePreview(4)"
                                        class="hidden mt-2 text-[10px] font-bold text-red-500 uppercase tracking-widest hover:text-red-700 transition-all">Cancel</button>
                                </div>
                            </div>

                            <!-- Slide 5 -->
                            <div class="space-y-3">
                                <p class="text-[10px] font-bold text-black-fade uppercase tracking-widest text-center">Slide 5</p>
                                <div class="w-full aspect-square bg-slate-50 border border-slate-200 rounded-xl flex flex-col items-center justify-between p-4 group relative overflow-hidden">
                                    <button type="button" onclick="window.deleteSlide(5)"
                                        class="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/80 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-white transition-all opacity-0 group-hover:opacity-100 z-10">
                                        <i class="fa-solid fa-trash-can text-[10px]"></i>
                                    </button>
                                    <div class="flex-1 flex items-center justify-center w-full">
                                        <img id="login-slide-5-preview" src="image/ICC Learning.jpg" class="w-full h-full object-cover rounded-lg" alt="Slide 5">
                                    </div>
                                    <input type="file" id="login-slide-5-input" class="hidden" accept="image/*" aria-label="Upload Slide 5" onchange="window.handleSlideUpload(event, 5)">
                                    <button type="button" onclick="document.getElementById('login-slide-5-input').click()"
                                        class="w-full py-2 bg-white border border-slate-200 text-[10px] font-bold text-black uppercase tracking-widest rounded-lg hover:bg-slate-100 transition-all font-['Inter'] mt-3 cursor-pointer">Replace</button>
                                </div>
                                <div class="flex justify-center">
                                    <button type="button" id="login-slide-5-cancel" onclick="window.clearSlidePreview(5)"
                                        class="hidden mt-2 text-[10px] font-bold text-red-500 uppercase tracking-widest hover:text-red-700 transition-all">Cancel</button>
                                </div>
                            </div>

                            <!-- Slide 6 (Slot) -->
                            <div class="space-y-3">
                                <p class="text-[10px] font-bold text-black-fade uppercase tracking-widest text-center">Slide 6</p>
                                <div class="w-full aspect-square bg-slate-50 border border-slate-200 border-dashed rounded-xl flex flex-col items-center justify-between p-4 group relative overflow-hidden">
                                    <button type="button" onclick="window.deleteSlide(6)"
                                        class="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/80 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-white transition-all opacity-0 group-hover:opacity-100 z-10">
                                        <i class="fa-solid fa-trash-can text-[10px]"></i>
                                    </button>
                                    <div class="flex-1 flex items-center justify-center w-full">
                                        <img id="login-slide-6-preview" src="" class="w-full h-full object-cover rounded-lg hidden" alt="Slide 6">
                                        <i class="fa-solid fa-image text-3xl text-slate-200" id="login-slide-6-placeholder"></i>
                                    </div>
                                    <input type="file" id="login-slide-6-input" class="hidden" accept="image/*" aria-label="Upload Slide 6" onchange="window.handleSlideUpload(event, 6)">
                                    <button type="button" onclick="document.getElementById('login-slide-6-input').click()"
                                        class="w-full py-2 bg-white border border-slate-200 text-[10px] font-bold text-black uppercase tracking-widest rounded-lg hover:bg-slate-100 transition-all font-['Inter'] mt-3 cursor-pointer">Upload</button>
                                </div>
                                <div class="flex justify-center">
                                    <button type="button" id="login-slide-6-cancel" onclick="window.clearSlidePreview(6)"
                                        class="hidden mt-2 text-[10px] font-bold text-red-500 uppercase tracking-widest hover:text-red-700 transition-all">Cancel</button>
                                </div>
                            </div>

                            <!-- Slide 7 (Slot) -->
                            <div class="space-y-3">
                                <p class="text-[10px] font-bold text-black-fade uppercase tracking-widest text-center">Slide 7</p>
                                <div class="w-full aspect-square bg-slate-50 border border-slate-200 border-dashed rounded-xl flex flex-col items-center justify-between p-4 group relative overflow-hidden">
                                    <button type="button" onclick="window.deleteSlide(7)"
                                        class="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/80 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-white transition-all opacity-0 group-hover:opacity-100 z-10">
                                        <i class="fa-solid fa-trash-can text-[10px]"></i>
                                    </button>
                                    <div class="flex-1 flex items-center justify-center w-full">
                                        <img id="login-slide-7-preview" src="" class="w-full h-full object-cover rounded-lg hidden" alt="Slide 7">
                                        <i class="fa-solid fa-image text-3xl text-slate-200" id="login-slide-7-placeholder"></i>
                                    </div>
                                    <input type="file" id="login-slide-7-input" class="hidden" accept="image/*" aria-label="Upload Slide 7" onchange="window.handleSlideUpload(event, 7)">
                                    <button type="button" onclick="document.getElementById('login-slide-7-input').click()"
                                        class="w-full py-2 bg-white border border-slate-200 text-[10px] font-bold text-black uppercase tracking-widest rounded-lg hover:bg-slate-100 transition-all font-['Inter'] mt-3 cursor-pointer">Upload</button>
                                </div>
                                <div class="flex justify-center">
                                    <button type="button" id="login-slide-7-cancel" onclick="window.clearSlidePreview(7)"
                                        class="hidden mt-2 text-[10px] font-bold text-red-500 uppercase tracking-widest hover:text-red-700 transition-all">Cancel</button>
                                </div>
                            </div>
                        </div>

                        <div class="flex justify-end pt-4">
                            <button type="button" id="slides-save-btn" onclick="window.saveSlidesSettings()"
                                class="flex items-center gap-2 px-8 py-3 bg-[#15803d] text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-[#166534] transition-all shadow-sm cursor-pointer">
                                <i class="fa-solid fa-circle-notch fa-spin hidden"></i>
                                <span>Save Slideshow</span>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Card 3: Welcome Panel Banner -->
                <div id="brand-welcome-panel" class="sigma-settings-panel-card">
                    <div class="sigma-panel-header">
                        <h2 class="sigma-panel-title">Dashboard Welcome Banner</h2>
                        <p class="sigma-panel-subtitle">Manage greeting panel banner displayed atop user dashboards. Recommended Ratio: 16:9 (1920x1080).</p>
                    </div>

                    <div class="space-y-6">
                        <div class="max-w-xl">
                            <div class="w-full aspect-video bg-slate-50 border border-slate-200 rounded-xl flex flex-col items-center justify-between p-4 group relative overflow-hidden cursor-pointer"
                                onclick="document.getElementById('welcome-panel-input').click()">
                                <button type="button" onclick="event.stopPropagation(); window.deleteWelcomePanel()"
                                    class="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/80 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-white transition-all opacity-0 group-hover:opacity-100 z-10" title="Delete banner">
                                    <i class="fa-solid fa-trash-can text-[10px]"></i>
                                </button>
                                <div class="flex-1 flex items-center justify-center w-full">
                                    <img id="welcome-panel-preview" src="image/Welcome.jpg" class="w-full h-full object-cover rounded-lg" alt="Welcome Panel">
                                    <div id="welcome-panel-placeholder" class="hidden flex flex-col items-center justify-center text-slate-400">
                                        <i class="fa-solid fa-cloud-arrow-up text-2xl mb-2"></i>
                                        <span class="text-[10px] font-bold uppercase tracking-widest">Upload Photo</span>
                                    </div>
                                </div>
                                <input type="file" id="welcome-panel-input" class="hidden" accept="image/*" aria-label="Upload Welcome Banner" onchange="window.handleWelcomePanelUpload(event)">
                                <button type="button" onclick="event.stopPropagation(); document.getElementById('welcome-panel-input').click()"
                                    class="w-full py-2 bg-white border border-slate-200 text-[10px] font-bold text-black uppercase tracking-widest rounded-lg hover:bg-slate-100 transition-all font-['Inter'] mt-3 cursor-pointer">Replace</button>
                            </div>
                            <div class="flex justify-center">
                                <button type="button" id="welcome-panel-cancel" onclick="window.clearWelcomePanelPreview()"
                                    class="hidden mt-2 text-[10px] font-bold text-red-500 uppercase tracking-widest hover:text-red-700 transition-all">Cancel</button>
                            </div>
                        </div>

                        <div class="flex justify-end pt-4">
                            <button type="button" id="welcome-panel-save-btn" onclick="window.saveWelcomePanelSettings()"
                                class="flex items-center gap-2 px-8 py-3 bg-[#15803d] text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-[#166534] transition-all shadow-sm cursor-pointer">
                                <i class="fa-solid fa-circle-notch fa-spin hidden"></i>
                                <span>Save Welcome Banner</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </div>
</section>

<!-- ═══ SYSTEM SETTINGS 3: INTEGRATIONS & STORAGE VIEW ═══ -->
<section id="settings-integrations-view" class="dynamic-section hidden">
    <div class="sigma-settings-layout">
        <!-- Left Categories Sidebar -->
        <aside class="sigma-settings-sidebar">
            <h2 class="text-xs font-bold text-black-fade tracking-wide mb-6">Integrations &amp; Storage</h2>
            <nav class="flex flex-col gap-2" role="tablist" aria-label="Integrations Sections">
                <button type="button" 
                    class="sigma-settings-cat-btn active bg-icc-yellow text-white shadow-sm" 
                    data-settings-target="integ-ai-panel"
                    onclick="window.scrollToSettingsSection('integ-ai-panel', this)"
                    role="tab"
                    aria-selected="true">
                    <span class="sigma-settings-cat-icon">
                        <i class="fa-solid fa-brain text-inherit"></i>
                    </span>
                    <span class="sigma-settings-cat-text text-inherit">AI Intelligence Engines</span>
                </button>
                <button type="button" 
                    class="sigma-settings-cat-btn text-black hover:bg-slate-100" 
                    data-settings-target="integ-cloud-panel"
                    onclick="window.scrollToSettingsSection('integ-cloud-panel', this)"
                    role="tab"
                    aria-selected="false">
                    <span class="sigma-settings-cat-icon">
                        <i class="fa-brands fa-google-drive text-inherit"></i>
                    </span>
                    <span class="sigma-settings-cat-text text-inherit">Cloud Storage API</span>
                </button>
                <button type="button" 
                    class="sigma-settings-cat-btn text-black hover:bg-slate-100" 
                    data-settings-target="integ-recaptcha-panel"
                    onclick="window.scrollToSettingsSection('integ-recaptcha-panel', this)"
                    role="tab"
                    aria-selected="false">
                    <span class="sigma-settings-cat-icon">
                        <i class="fa-solid fa-key text-inherit"></i>
                    </span>
                    <span class="sigma-settings-cat-text text-inherit">reCAPTCHA API Key</span>
                </button>
                <button type="button" 
                    class="sigma-settings-cat-btn text-black hover:bg-slate-100" 
                    data-settings-target="integ-limits-panel"
                    onclick="window.scrollToSettingsSection('integ-limits-panel', this)"
                    role="tab"
                    aria-selected="false">
                    <span class="sigma-settings-cat-icon">
                        <i class="fa-solid fa-hard-drive text-inherit"></i>
                    </span>
                    <span class="sigma-settings-cat-text text-inherit">Material Limits &amp; Quotas</span>
                </button>
            </nav>
        </aside>

        <!-- Right Content Area (Single continuous scrollable page) -->
        <section class="sigma-settings-main">
            <div class="sigma-settings-inner">
                <!-- Card 1: AI Integrations -->
                <div id="integ-ai-panel" class="sigma-settings-panel-card">
                    <div class="sigma-panel-header">
                        <h2 class="sigma-panel-title">AI Intelligence Engines</h2>
                        <p class="sigma-panel-subtitle">Manage vault credentials for Google Gemini and Groq AI acceleration layers.</p>
                    </div>

                    <div class="space-y-6">
                        <!-- Gemini -->
                        <div id="row-gemini" class="group bg-white rounded-2xl border border-slate-100 hover:border-slate-200 transition-all overflow-hidden">
                            <div class="flex flex-row items-center p-5 gap-4">
                                <div class="w-1/4 min-w-0">
                                    <p class="text-sm font-bold text-black font-['Inter']">Google Gemini</p>
                                    <span class="text-xs text-black-fade font-medium">Assistant intelligence</span>
                                </div>
                                <div class="flex-1 min-w-0">
                                    <p class="text-xs text-black-fade font-medium">Primary intelligence engine powering the SIGMA AI bot for automated institutional assistance.</p>
                                </div>
                                <div class="w-1/5 text-center">
                                    <div id="mask-gemini" class="text-slate-300 font-mono tracking-[0.3em] text-xs">••••••••••••••••</div>
                                </div>
                                <div class="flex justify-end shrink-0">
                                    <button type="button" onclick="window.triggerVault('gemini')" id="btn-vault-gemini"
                                        class="flex items-center gap-2 px-5 py-2 bg-slate-50 text-xs font-bold text-black rounded-xl hover:bg-[#FFD000] hover:text-black transition-all cursor-pointer">
                                        <i class="fa-solid fa-lock text-[10px]"></i>
                                        <span>Open</span>
                                    </button>
                                </div>
                            </div>
                            <div id="key-field-gemini" class="hidden p-6 bg-slate-50/50 border-t border-slate-100">
                                <div class="space-y-3">
                                    <div class="flex justify-between items-center">
                                        <label for="api-key-gemini" class="text-xs font-bold text-black">Gemini API Key</label>
                                        <button type="button" onclick="window.triggerPasswordChange('gemini')" class="text-xs font-bold text-[#15803d] hover:underline">Change Master Password</button>
                                    </div>
                                    <input type="text" id="api-key-gemini" maxlength="200" class="w-full bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-mono font-bold text-black outline-none focus:border-[#15803d] transition-all" placeholder="Paste your Gemini API key here...">
                                    <div class="flex justify-end gap-2 pt-1">
                                        <button type="button" onclick="window.saveKeyField('gemini')" class="px-5 py-2 bg-[#15803d] text-white text-xs font-bold rounded-xl hover:bg-[#166534] transition-all">Save Changes</button>
                                        <button type="button" onclick="window.cancelKeyField('gemini')" class="px-5 py-2 bg-slate-100 text-black text-xs font-bold rounded-xl hover:bg-slate-200 transition-all">Cancel</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Groq -->
                        <div id="row-groq" class="group bg-white rounded-2xl border border-slate-100 hover:border-slate-200 transition-all overflow-hidden">
                            <div class="flex flex-row items-center p-5 gap-4">
                                <div class="w-1/4 min-w-0">
                                    <p class="text-sm font-bold text-black font-['Inter']">Groq LPU Acceleration</p>
                                    <span class="text-xs text-black-fade font-medium">Predictive &amp; Prescriptive analytics</span>
                                </div>
                                <div class="flex-1 min-w-0">
                                    <p class="text-xs text-black-fade font-medium">High-performance processing logic driving descriptive, predictive, and prescriptive data analytics.</p>
                                </div>
                                <div class="w-1/5 text-center">
                                    <div id="mask-groq" class="text-slate-300 font-mono tracking-[0.3em] text-xs">••••••••••••••••</div>
                                </div>
                                <div class="flex justify-end shrink-0">
                                    <button type="button" onclick="window.triggerVault('groq')" id="btn-vault-groq"
                                        class="flex items-center gap-2 px-5 py-2 bg-slate-50 text-xs font-bold text-black rounded-xl hover:bg-[#FFD000] hover:text-black transition-all cursor-pointer">
                                        <i class="fa-solid fa-lock text-[10px]"></i>
                                        <span>Open</span>
                                    </button>
                                </div>
                            </div>
                            <div id="key-field-groq" class="hidden p-6 bg-slate-50/50 border-t border-slate-100">
                                <div class="space-y-3">
                                    <div class="flex justify-between items-center">
                                        <label for="api-key-groq" class="text-xs font-bold text-black">Groq API Key</label>
                                        <button type="button" onclick="window.triggerPasswordChange('groq')" class="text-xs font-bold text-[#15803d] hover:underline">Change Master Password</button>
                                    </div>
                                    <input type="text" id="api-key-groq" maxlength="200" class="w-full bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-mono font-bold text-black outline-none focus:border-[#15803d] transition-all" placeholder="Paste your Groq API key here...">
                                    <div class="flex justify-end gap-2 pt-1">
                                        <button type="button" onclick="window.saveKeyField('groq')" class="px-5 py-2 bg-[#15803d] text-white text-xs font-bold rounded-xl hover:bg-[#166534] transition-all">Save Changes</button>
                                        <button type="button" onclick="window.cancelKeyField('groq')" class="px-5 py-2 bg-slate-100 text-black text-xs font-bold rounded-xl hover:bg-slate-200 transition-all">Cancel</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Card 2: Cloud Storage API -->
                <div id="integ-cloud-panel" class="sigma-settings-panel-card">
                    <div class="sigma-panel-header">
                        <h2 class="sigma-panel-title">Google Drive Cloud Storage</h2>
                        <p class="sigma-panel-subtitle">Institutional cloud integration for secure document management, repository access, and lecture materials.</p>
                    </div>

                    <div id="row-drive" class="group bg-white rounded-2xl border border-slate-100 hover:border-slate-200 transition-all overflow-hidden shadow-2xs">
                        <div class="flex flex-col sm:flex-row sm:items-center p-5 gap-3 sm:gap-4">
                            <div class="w-full sm:w-1/4 min-w-0">
                                <p class="text-sm font-bold text-black font-['Inter'] flex items-center gap-2">
                                    <i class="fa-brands fa-google-drive text-[#15803d]"></i>
                                    <span>Google Drive Storage</span>
                                </p>
                                <span class="text-xs text-black-fade font-medium">Service account & cloud folder</span>
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-xs text-black-fade font-medium">Institutional cloud storage integration for lecture materials, video streaming, and document backups.</p>
                            </div>
                            <div class="w-auto sm:w-1/5 text-left sm:text-center shrink-0">
                                <div id="mask-drive" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
                                    <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                    <span id="drive-status-badge-text-php">Connected (Active)</span>
                                </div>
                            </div>
                            <div class="flex justify-start sm:justify-end shrink-0">
                                <button type="button" onclick="window.openGoogleDriveManagerModal()" id="btn-manage-drive"
                                    class="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-[#FFD000] text-black text-xs font-bold rounded-xl transition-all cursor-pointer shadow-2xs">
                                    <i class="fa-solid fa-sliders text-xs"></i>
                                    <span>Manage Google Drive</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Card 3: reCAPTCHA API Key -->
                <div id="integ-recaptcha-panel" class="sigma-settings-panel-card">
                    <div class="sigma-panel-header">
                        <h2 class="sigma-panel-title">Google reCAPTCHA API Key</h2>
                        <p class="sigma-panel-subtitle">Security credential for enterprise-grade bot protection and challenge validation.</p>
                    </div>

                    <div id="row-recaptcha" class="group bg-white rounded-2xl border border-slate-100 hover:border-slate-200 transition-all overflow-hidden">
                        <div class="flex flex-row items-center p-5 gap-4">
                            <div class="w-1/4 min-w-0">
                                <p class="text-sm font-bold text-black font-['Inter']">reCAPTCHA Site Key</p>
                                <span class="text-xs text-black-fade font-medium">Public client site key</span>
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-xs text-black-fade font-medium">Security credential for enterprise-grade bot protection and system integrity.</p>
                            </div>
                            <div class="w-1/5 text-center">
                                <div id="mask-recaptcha" class="text-slate-300 font-mono tracking-[0.3em] text-xs">••••••••••••••••</div>
                            </div>
                            <div class="flex justify-end shrink-0">
                                <button type="button" onclick="window.triggerVault('recaptcha')" id="btn-vault-recaptcha"
                                    class="flex items-center gap-2 px-5 py-2 bg-slate-50 text-xs font-bold text-black rounded-xl hover:bg-[#FFD000] hover:text-black transition-all cursor-pointer">
                                    <i class="fa-solid fa-lock text-[10px]"></i>
                                    <span>Open</span>
                                </button>
                            </div>
                        </div>
                        <div id="key-field-recaptcha" class="hidden p-6 bg-slate-50/50 border-t border-slate-100">
                            <div class="space-y-3">
                                <div class="flex justify-between items-center">
                                    <label for="api-key-recaptcha" class="text-xs font-bold text-black">Site Key</label>
                                    <button type="button" onclick="window.triggerPasswordChange('recaptcha')" class="text-xs font-bold text-[#15803d] hover:underline">Change Master Password</button>
                                </div>
                                <input type="text" id="api-key-recaptcha" maxlength="200" class="w-full bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-mono font-bold text-black outline-none focus:border-[#15803d] transition-all" placeholder="Paste your reCAPTCHA site key here...">
                                <div class="flex justify-end gap-2 pt-1">
                                    <button type="button" onclick="window.saveKeyField('recaptcha')" class="px-5 py-2 bg-[#15803d] text-white text-xs font-bold rounded-xl hover:bg-[#166534] transition-all">Save Changes</button>
                                    <button type="button" onclick="window.cancelKeyField('recaptcha')" class="px-5 py-2 bg-slate-100 text-black text-xs font-bold rounded-xl hover:bg-slate-200 transition-all">Cancel</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="flex justify-end pt-4">
                        <button type="button" onclick="window.saveApiKeys()"
                            class="flex items-center gap-2 px-8 py-3 bg-[#15803d] text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-[#166534] transition-all shadow-sm cursor-pointer">
                            <i class="fa-solid fa-arrows-rotate"></i>
                            <span>Synchronize Vault</span>
                        </button>
                    </div>
                </div>

                <!-- Card 4: File Upload Size Limits -->
                <div id="integ-limits-panel" class="sigma-settings-panel-card">
                    <div class="sigma-panel-header">
                        <h2 class="sigma-panel-title">File Upload Size Limits</h2>
                        <p class="sigma-panel-subtitle">Configure upload allocations and supported file formats across the institution (Standard: 250–700 MB • Extension: 25–100 MB).</p>
                    </div>

                    <div class="space-y-5 font-['Inter']">
                        <!-- Group 1: Video Materials -->
                        <div class="space-y-2">
                            <div class="pb-1.5 border-b border-black/10">
                                <p class="text-xs font-bold text-black uppercase tracking-wider">Video Materials</p>
                            </div>
                            
                            <!-- Embedded YouTube Video -->
                            <div class="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 px-2 rounded-xl hover:bg-slate-50/70 transition-colors border-b border-black/5 gap-3">
                                <div class="min-w-0">
                                    <p class="text-xs sm:text-sm font-semibold text-black leading-tight">Embedded YouTube Videos</p>
                                    <p class="text-[11px] text-black-fade font-normal leading-snug mt-0.5">Maximum video playback duration allowed for YouTube lesson links.</p>
                                </div>
                                <div class="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                    <span class="text-[11px] font-bold text-black">Max Duration:</span>
                                    <select id="limit-video-embed" aria-label="Embedded YouTube video maximum playback duration" class="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold text-black outline-none focus:border-[#FFD000] transition-all font-['Inter'] cursor-pointer">
                                        <option value="1" selected>1 Hour</option>
                                        <option value="2">2 Hours</option>
                                    </select>
                                </div>
                            </div>

                            <!-- Direct MP4 Video -->
                            <div class="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 px-2 rounded-xl hover:bg-slate-50/70 transition-colors border-b border-black/5 gap-3">
                                <div class="min-w-0">
                                    <p class="text-xs sm:text-sm font-semibold text-black leading-tight">Direct Video Uploads (.MP4)</p>
                                    <p class="text-[11px] text-black-fade font-normal leading-snug mt-0.5">Maximum file size allocation for direct MP4 video lecture recordings.</p>
                                </div>
                                <div class="flex items-center gap-3 shrink-0 self-end sm:self-center">
                                    <div class="flex items-center gap-1.5">
                                        <span class="text-[11px] font-bold text-black">Standard:</span>
                                        <select id="limit-video-mp4" aria-label="Direct video upload MP4 standard size limit" class="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold text-black outline-none focus:border-[#FFD000] transition-all font-['Inter'] cursor-pointer">
                                            <option value="250">250 MB</option>
                                            <option value="500" selected>500 MB</option>
                                            <option value="700">700 MB</option>
                                        </select>
                                    </div>
                                    <div class="flex items-center gap-1.5">
                                        <span class="text-[11px] font-bold text-black">Extension:</span>
                                        <div class="flex items-center gap-1">
                                            <input type="number" value="50" min="25" max="100" step="5" id="limit-video-ext" aria-label="Direct video upload MP4 extension size limit"
                                                class="w-16 bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-lg text-xs font-bold text-black text-center outline-none focus:border-[#FFD000] transition-all font-['Inter']">
                                            <span class="text-xs font-medium text-black">MB</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Group 2: Document & Presentation Files -->
                        <div class="space-y-2 pt-2">
                            <div class="pb-1.5 border-b border-black/10">
                                <p class="text-xs font-bold text-black uppercase tracking-wider">Document & Presentation Files</p>
                            </div>

                            <!-- DOCX -->
                            <div class="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 px-2 rounded-xl hover:bg-slate-50/70 transition-colors border-b border-black/5 gap-3">
                                <div class="min-w-0">
                                    <p class="text-xs sm:text-sm font-semibold text-black leading-tight">Word Documents (.DOCX, .DOC)</p>
                                    <p class="text-[11px] text-black-fade font-normal leading-snug mt-0.5">Word processing files for assignments, rubrics, and instructions.</p>
                                </div>
                                <div class="flex items-center gap-3 shrink-0 self-end sm:self-center">
                                    <div class="flex items-center gap-1.5">
                                        <span class="text-[11px] font-bold text-black">Standard:</span>
                                        <select id="limit-docx-std" aria-label="Word document standard size limit" class="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold text-black outline-none focus:border-[#FFD000] transition-all font-['Inter'] cursor-pointer">
                                            <option value="250">250 MB</option>
                                            <option value="500" selected>500 MB</option>
                                            <option value="700">700 MB</option>
                                        </select>
                                    </div>
                                    <div class="flex items-center gap-1.5">
                                        <span class="text-[11px] font-bold text-black">Extension:</span>
                                        <div class="flex items-center gap-1">
                                            <input type="number" value="50" min="25" max="100" step="5" id="limit-docx-ext" aria-label="Word document extension size limit"
                                                class="w-16 bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-lg text-xs font-bold text-black text-center outline-none focus:border-[#FFD000] transition-all font-['Inter']">
                                            <span class="text-xs font-medium text-black">MB</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- PDF -->
                            <div class="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 px-2 rounded-xl hover:bg-slate-50/70 transition-colors border-b border-black/5 gap-3">
                                <div class="min-w-0">
                                    <p class="text-xs sm:text-sm font-semibold text-black leading-tight">PDF Documents (.PDF)</p>
                                    <p class="text-[11px] text-black-fade font-normal leading-snug mt-0.5">Fixed-layout documents for syllabus, modules, and handouts.</p>
                                </div>
                                <div class="flex items-center gap-3 shrink-0 self-end sm:self-center">
                                    <div class="flex items-center gap-1.5">
                                        <span class="text-[11px] font-bold text-black">Standard:</span>
                                        <select id="limit-pdf-std" aria-label="PDF document standard size limit" class="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold text-black outline-none focus:border-[#FFD000] transition-all font-['Inter'] cursor-pointer">
                                            <option value="250">250 MB</option>
                                            <option value="500" selected>500 MB</option>
                                            <option value="700">700 MB</option>
                                        </select>
                                    </div>
                                    <div class="flex items-center gap-1.5">
                                        <span class="text-[11px] font-bold text-black">Extension:</span>
                                        <div class="flex items-center gap-1">
                                            <input type="number" value="50" min="25" max="100" step="5" id="limit-pdf-ext" aria-label="PDF document extension size limit"
                                                class="w-16 bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-lg text-xs font-bold text-black text-center outline-none focus:border-[#FFD000] transition-all font-['Inter']">
                                            <span class="text-xs font-medium text-black">MB</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- PPTX -->
                            <div class="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 px-2 rounded-xl hover:bg-slate-50/70 transition-colors border-b border-black/5 gap-3">
                                <div class="min-w-0">
                                    <p class="text-xs sm:text-sm font-semibold text-black leading-tight">PowerPoint Presentations (.PPTX, .PPT)</p>
                                    <p class="text-[11px] text-black-fade font-normal leading-snug mt-0.5">Presentation slide decks for lectures and lesson walkthroughs.</p>
                                </div>
                                <div class="flex items-center gap-3 shrink-0 self-end sm:self-center">
                                    <div class="flex items-center gap-1.5">
                                        <span class="text-[11px] font-bold text-black">Standard:</span>
                                        <select id="limit-pptx-std" aria-label="PowerPoint presentation standard size limit" class="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold text-black outline-none focus:border-[#FFD000] transition-all font-['Inter'] cursor-pointer">
                                            <option value="250">250 MB</option>
                                            <option value="500" selected>500 MB</option>
                                            <option value="700">700 MB</option>
                                        </select>
                                    </div>
                                    <div class="flex items-center gap-1.5">
                                        <span class="text-[11px] font-bold text-black">Extension:</span>
                                        <div class="flex items-center gap-1">
                                            <input type="number" value="50" min="25" max="100" step="5" id="limit-pptx-ext" aria-label="PowerPoint presentation extension size limit"
                                                class="w-16 bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-lg text-xs font-bold text-black text-center outline-none focus:border-[#FFD000] transition-all font-['Inter']">
                                            <span class="text-xs font-medium text-black">MB</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="flex justify-end pt-4">
                            <button type="button" id="limits-save-btn" onclick="window.saveMaterialLimits()" disabled
                                class="flex items-center gap-2 px-8 py-3 bg-slate-100 text-slate-400 border border-slate-200 text-xs font-bold uppercase tracking-wider rounded-xl cursor-not-allowed transition-all shadow-none">
                                <i class="fa-solid fa-lock text-xs"></i>
                                <span>Save File Limits</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </div>
</section>

