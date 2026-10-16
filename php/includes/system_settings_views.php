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
                    <span class="sigma-settings-cat-text text-inherit">reCAPTCHA Protection</span>
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
                    <span class="sigma-settings-cat-text text-inherit">Account Lockout</span>
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
                        <h2 class="sigma-panel-title">reCAPTCHA Protection</h2>
                        <p class="sigma-panel-subtitle">Verification settings for failed login attempts.</p>
                    </div>
                    <div class="space-y-6">
                        <div class="recaptcha-rule-row">
                            <label for="recaptcha-page-threshold-input" class="text-sm font-bold">Failed Login Attempts</label>
                            <p id="recaptcha-attempts-description" class="recaptcha-rule-description text-xs text-black-fade">Number of failed login attempts before verification is required.</p>
                            <div class="recaptcha-rule-control"><input type="number" id="recaptcha-page-threshold-input" aria-describedby="recaptcha-attempts-description" min="1" max="50" value="3" oninput="window.scheduleRecaptchaDefenseSave()" class="w-24 border border-slate-200 rounded-lg px-3 py-2 text-sm text-center"></div>
                        </div>
                        <div class="recaptcha-rule-row">
                            <label for="recaptcha-page-enabled-toggle" class="text-sm font-bold">Enable reCAPTCHA</label>
                            <p id="recaptcha-enabled-description" class="recaptcha-rule-description text-xs text-black-fade">Require verification after repeated failed login attempts.</p>
                            <label class="recaptcha-rule-control relative inline-flex items-center cursor-pointer"><input type="checkbox" id="recaptcha-page-enabled-toggle" aria-describedby="recaptcha-enabled-description" checked class="sr-only peer" onchange="window.scheduleRecaptchaDefenseSave(true)"><div class="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#15803d]"></div></label>
                        </div>
                        <div class="flex items-center justify-end flex-wrap gap-3">
                            <button type="button" id="btn-security-configure-recaptcha" onclick="window.openRecaptchaSettingsPage()" class="sigma-btn sigma-btn-white sigma-btn-md gap-2"><i class="fa-solid fa-sliders text-xs text-[#15803d]" aria-hidden="true"></i><span>Configure</span></button>
                            <span id="recaptcha-defense-save-status" role="status" aria-live="polite" class="text-xs text-black-fade"></span>
                        </div>
                    </div>
                </div>

                <!-- Card 2: Account Lockout -->
                <div id="sec-lockout-panel" class="sigma-settings-panel-card">
                    <div class="sigma-panel-header">
                        <h2 class="sigma-panel-title">Account Lockout</h2>
                        <p class="sigma-panel-subtitle">Lockout settings for repeated incorrect passwords.</p>
                    </div>
                    <div class="space-y-6">
                        <div class="recaptcha-rule-row">
                            <label for="password-lockout-attempts" class="text-sm font-bold">Failed Password Attempts</label>
                            <p id="lockout-attempts-description" class="recaptcha-rule-description text-xs text-black-fade">Number of incorrect password attempts before account lockout.</p>
                            <div class="recaptcha-rule-control">
                                <input type="number" id="password-lockout-attempts" aria-describedby="lockout-attempts-description" value="8" max="50" min="1" oninput="window.scheduleSecuritySettingsSave()"
                                    class="w-24 border border-slate-200 rounded-lg px-3 py-2 text-sm text-center">
                            </div>
                        </div>
                        <div class="flex justify-end">
                            <span id="security-save-status" role="status" aria-live="polite" class="text-xs text-black-fade"></span>
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
                    <span class="sigma-settings-cat-text text-inherit">Institution Logo</span>
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
                <!-- Card 1: Institution Logo -->
                <div id="brand-logos-panel" class="sigma-settings-panel-card">
                    <div class="sigma-panel-header">
                        <h2 class="sigma-panel-title">Institution Logo</h2>
                    </div>
                    <div class="institution-logo-row">
                        <div class="institution-logo-editor">
                            <img id="institution-logo-preview" class="institution-logo-preview" src="image/ICC logo.jpg" alt="Institution logo">
                            <div class="institution-logo-controls">
                            <input id="institution-logo-input" type="file" accept="image/png,image/jpeg,image/webp" hidden aria-label="Upload institution logo">
                            <button type="button" id="institution-logo-change" class="sigma-btn sigma-btn-white sigma-btn-md">Change Logo</button>
                            <button type="button" id="institution-logo-upload" class="sigma-btn sigma-btn-white sigma-btn-md" hidden>Upload Logo</button>
                            <button type="button" id="institution-logo-restore" class="sigma-btn sigma-btn-white sigma-btn-md institution-logo-restore" title="Restore default logo" aria-label="Restore default logo" hidden><i class="fa-solid fa-arrow-rotate-left" aria-hidden="true"></i></button>
                            </div>
                        </div>
                        <p class="institution-logo-description">Official institution logo for the login page, navigation header, and browser tab.</p>
                    </div>
                    <div class="institution-logo-previews" hidden>
                        <figure><div class="institution-logo-sample institution-logo-sample-login"><img data-institution-logo-preview src="image/ICC logo.jpg" alt=""></div><figcaption>Login<span class="institution-logo-size">Preview: 96 x 96 px</span></figcaption></figure>
                        <figure><div class="institution-logo-sample institution-logo-sample-header"><img data-institution-logo-preview src="image/ICC logo.jpg" alt=""><span>Interface Computer College</span></div><figcaption>Header<span class="institution-logo-size">Preview: 40 x 40 px</span></figcaption></figure>
                        <figure><div class="institution-logo-sample institution-logo-sample-tab"><img data-institution-logo-preview src="image/ICC logo.jpg" alt=""><span>SIGMA ELMS</span></div><figcaption>Browser Icon<span class="institution-logo-size">Preview: 16 x 16 px</span></figcaption></figure>
                    </div>
                    <p id="institution-logo-feedback" role="status" aria-live="polite" class="text-xs text-black-fade mt-4"></p>
                    <div id="institution-logo-actions" class="flex justify-end gap-3 mt-6" hidden>
                        <button type="button" id="institution-logo-cancel" class="sigma-btn sigma-btn-white sigma-btn-md" hidden>Cancel</button>
                        <button type="button" id="institution-logo-save" class="sigma-btn sigma-btn-primary sigma-btn-md" disabled>Save Changes</button>
                    </div>
                </div>

                <!-- Card 2: Login Slideshow -->
                <div id="brand-slides-panel" class="sigma-settings-panel-card">
                    <div class="sigma-panel-header">
                        <h2 class="sigma-panel-title">Login Slideshow</h2>
                        <p class="sigma-panel-subtitle">Campus and admissions images. Up to 7 slides. Recommended: 1920 x 1080 px.</p>
                    </div>
                    <div class="slideshow-toolbar" hidden>
                        <div class="slideshow-view-tools">
                        <div class="slideshow-modes" role="group" aria-label="Slideshow view">
                            <button type="button" data-slide-mode="grid" aria-pressed="true"><i class="fa-solid fa-table-cells" aria-hidden="true"></i> Grid</button>
                            <button type="button" data-slide-mode="preview" aria-pressed="false"><i class="fa-solid fa-play" aria-hidden="true"></i> Preview</button>
                        </div>
                        <button type="button" id="slideshow-restore" class="sigma-btn sigma-btn-md limits-restore-button" hidden><i class="fa-solid fa-arrow-rotate-left" aria-hidden="true"></i><span>Restore Changes</span></button>
                        </div>
                    </div>
                    <input type="file" id="slideshow-input" accept="image/png,image/jpeg,image/webp" multiple hidden aria-label="Upload slideshow images">
                    <div class="slideshow-preview">
                        <div class="slideshow-frame"><img id="slideshow-preview-image" alt=""></div>
                        <div class="slideshow-preview-controls">
                            <button type="button" data-slide-action="previous" title="Previous slide" aria-label="Previous slide"><i class="fa-solid fa-chevron-left" aria-hidden="true"></i></button>
                            <span id="slideshow-position" role="status"></span>
                            <button type="button" data-slide-action="play" title="Play slideshow" aria-label="Play slideshow"><i class="fa-solid fa-play" aria-hidden="true"></i></button>
                            <button type="button" data-slide-action="next" title="Next slide" aria-label="Next slide"><i class="fa-solid fa-chevron-right" aria-hidden="true"></i></button>
                        </div>
                    </div>
                    <div id="slideshow-grid" class="slideshow-grid" hidden></div>
                    <div class="slideshow-summary"><button type="button" id="slideshow-manage" class="sigma-btn sigma-btn-white sigma-btn-md">Manage Slideshow</button></div>
                    <p id="slideshow-feedback" role="status" aria-live="polite"></p>
                    <div id="slideshow-actions" class="slideshow-actions" hidden>
                        <span id="slideshow-count"></span>
                        <button type="button" id="slideshow-cancel" class="sigma-btn sigma-btn-white sigma-btn-md">Cancel</button>
                        <button type="button" id="slides-save-btn" class="sigma-btn sigma-btn-primary sigma-btn-md" disabled>Save Changes</button>
                    </div>
                </div>

                <!-- Card 3: Welcome Panel Banner -->
                <div id="brand-welcome-panel" class="sigma-settings-panel-card">
                    <div class="sigma-panel-header">
                        <h2 class="sigma-panel-title">Dashboard Welcome Banner</h2>
                        <p class="sigma-panel-subtitle">Background image behind the welcome greeting on administrator, teacher, and student dashboards.</p>
                    </div>
                    <div class="welcome-banner-preview"><img id="welcome-panel-preview" src="image/ICC Goals.jpeg" alt="Dashboard welcome banner"></div>
                    <p id="welcome-banner-size" class="welcome-banner-size" hidden></p>
                    <div class="welcome-banner-controls">
                        <button type="button" id="welcome-banner-change" class="sigma-btn sigma-btn-white sigma-btn-md">Change Banner</button>
                        <button type="button" id="welcome-banner-upload" class="sigma-btn sigma-btn-white sigma-btn-md" hidden>Upload Banner</button>
                        <button type="button" id="welcome-banner-restore" class="sigma-btn sigma-btn-white sigma-btn-md" title="Restore default banner" aria-label="Restore default banner" hidden><i class="fa-solid fa-arrow-rotate-left" aria-hidden="true"></i></button>
                    </div>
                    <input type="file" id="welcome-panel-input" accept="image/png,image/jpeg,image/webp" aria-label="Upload welcome banner" hidden>
                    <section id="welcome-banner-library" class="welcome-banner-library" hidden>
                        <h3>Uploaded Banners</h3>
                        <div id="welcome-banner-gallery" class="welcome-banner-gallery"></div>
                    </section>
                    <p id="welcome-banner-feedback" role="status" aria-live="polite"></p>
                    <div id="welcome-banner-actions" class="welcome-banner-actions" hidden>
                        <button type="button" id="welcome-panel-cancel" class="sigma-btn sigma-btn-white sigma-btn-md">Cancel</button>
                        <button type="button" id="welcome-panel-save-btn" class="sigma-btn sigma-btn-primary sigma-btn-md" disabled>Save Changes</button>
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
                    <span class="sigma-settings-cat-text text-inherit">SIGMA AI Integration Engines</span>
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
                    <span class="sigma-settings-cat-text text-inherit">Google Drive Cloud Storage</span>
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
                    <span class="sigma-settings-cat-text text-inherit">Google reCAPTCHA Protection</span>
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
                    <span class="sigma-settings-cat-text text-inherit">File Upload Size Limits</span>
                </button>
            </nav>
        </aside>

        <!-- Right Content Area (Single continuous scrollable page) -->
        <section class="sigma-settings-main">
            <div class="sigma-settings-inner">
                <!-- Card 1: AI Integrations -->
                <div id="integ-ai-panel" class="sigma-settings-panel-card">
                    <div class="sigma-panel-header">
                        <h2 class="sigma-panel-title">SIGMA AI Integration Engines</h2>
                    </div>

                    <div class="space-y-6">
                        <!-- Gemini -->
                        <div id="row-gemini" class="group bg-white rounded-2xl border border-slate-100 hover:border-slate-200 transition-all overflow-hidden cursor-default">
                            <div class="flex flex-row items-center p-5 gap-6">
                                <div class="w-56 shrink-0">
                                    <p class="text-sm font-bold text-[#15803d] font-['Inter'] leading-tight">Google Gemini</p>
                                </div>
                                <div class="flex-1 min-w-0">
                                    <p class="text-xs text-black-fade font-medium leading-relaxed">Primary intelligence engine powering the SIGMA AI bot for automated institutional assistance.</p>
                                </div>
                                <div class="flex justify-end shrink-0">
                                    <span id="badge-gemini-live-status" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 pointer-events-none select-none cursor-default">
                                        <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                        <span class="gemini-status-text">Not Configured</span>
                                    </span>
                                </div>
                            </div>
                        </div>

                        <!-- Groq -->
                        <div id="row-groq" class="group bg-white rounded-2xl border border-slate-100 hover:border-slate-200 transition-all overflow-hidden cursor-default">
                            <div class="flex flex-row items-center p-5 gap-6">
                                <div class="w-56 shrink-0">
                                    <p class="text-sm font-bold text-[#15803d] font-['Inter'] leading-tight">Groq</p>
                                </div>
                                <div class="flex-1 min-w-0">
                                    <p class="text-xs text-black-fade font-medium leading-relaxed">Advanced reasoning and real-time generative intelligence engine developed by Groq.</p>
                                </div>
                                <div class="flex justify-end shrink-0">
                                    <span id="badge-groq-live-status" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 pointer-events-none select-none cursor-default">
                                        <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                        <span class="groq-status-text">Not Configured</span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="flex justify-end mt-6">
                        <button type="button" onclick="window.openAiSettingsPage()" id="btn-manage-ai-engines"
                            class="sigma-btn sigma-btn-primary sigma-btn-md">
                            <span>Manage AI</span>
                        </button>
                    </div>
                </div>

                <!-- Card 2: Google Drive Cloud Storage -->
                <div id="integ-cloud-panel" class="sigma-settings-panel-card">
                    <div class="sigma-panel-header">
                        <h2 class="sigma-panel-title">Google Drive Cloud Storage</h2>
                    </div>

                    <div class="space-y-6">
                        <div id="row-drive" class="group bg-white rounded-2xl border border-slate-100 hover:border-slate-200 transition-all overflow-hidden">
                            <div class="flex flex-row items-center p-5 gap-6">
                                <div class="w-56 shrink-0">
                                    <p class="text-sm font-bold text-[#15803d] font-['Inter'] leading-tight">Google Drive Storage</p>
                                </div>
                                <div class="flex-1 min-w-0">
                                    <p class="text-xs text-black-fade font-medium leading-relaxed">Institutional storage integration for secure document management and repository asset routing.</p>
                                </div>
                                <div class="flex justify-end shrink-0">
                                    <button type="button" onclick="window.openGoogleDriveSettingsPage()" id="btn-manage-drive"
                                        class="sigma-btn sigma-btn-white sigma-btn-md gap-2">
                                        <i class="fa-solid fa-sliders text-xs text-[#15803d]"></i>
                                        <span>Configure</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Card 3: Google reCAPTCHA Protection -->
                <div id="integ-recaptcha-panel" class="sigma-settings-panel-card">
                    <div class="sigma-panel-header">
                        <h2 class="sigma-panel-title">Google reCAPTCHA Protection</h2>
                    </div>

                    <div class="space-y-6">
                        <div id="row-recaptcha" class="group bg-white rounded-2xl border border-slate-100 hover:border-slate-200 transition-all overflow-hidden">
                            <div class="flex flex-row items-center p-5 gap-6">
                                <div class="w-56 shrink-0">
                                    <p class="text-sm font-bold text-[#15803d] font-['Inter'] leading-tight">reCAPTCHA Protection</p>
                                </div>
                                <div class="flex-1 min-w-0">
                                    <p class="text-xs text-black-fade font-medium leading-relaxed">Enterprise-grade bot defense and challenge validation for login security and brute-force mitigation.</p>
                                </div>
                                <div class="flex justify-end shrink-0">
                                    <button type="button" onclick="window.openRecaptchaSettingsPage()" id="btn-manage-recaptcha"
                                        class="sigma-btn sigma-btn-white sigma-btn-md gap-2">
                                        <i class="fa-solid fa-sliders text-xs text-[#15803d]"></i>
                                        <span>Configure</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Card 4: File Upload Size Limits -->
                <div id="integ-limits-panel" class="sigma-settings-panel-card">
                    <div class="sigma-panel-header">
                        <h2 class="sigma-panel-title">File Upload Size Limits</h2>
                    </div>

                    <div class="space-y-5 font-['Inter']">
                        <!-- Group 1: Video Materials -->
                        <div class="space-y-2">
                            <div class="pb-1.5 border-b border-black/10">
                                <p class="text-xs font-bold text-[#15803d]">Video Materials</p>
                            </div>
                            
                            <!-- Embedded YouTube Video -->
                            <div class="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 px-2 rounded-xl hover:bg-slate-50/70 transition-colors border-b border-black/5 gap-3">
                                <div class="min-w-0">
                                    <p class="text-xs sm:text-sm font-semibold text-black leading-tight">Embedded YouTube Videos</p>
                                    <p class="text-[11px] text-black-fade font-normal leading-snug mt-0.5">Maximum video playback duration allowed for YouTube lesson links.</p>
                                </div>
                                <div class="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                    <span class="text-[11px] font-bold text-black">Max Duration:</span>
                                    <select id="limit-video-embed" aria-label="Embedded YouTube video maximum duration" class="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold text-black outline-none focus:outline-none focus:ring-0 focus:border-[#FFD000] transition-colors font-['Inter'] cursor-pointer">
                                        <option value="15">15 Mins</option>
                                        <option value="30" selected>30 Mins</option>
                                        <option value="60">1 Hour</option>
                                        <option value="90">1 Hour 30 Mins</option>
                                    </select>
                                </div>
                            </div>

                            <!-- Direct MP4 Video -->
                            <div class="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 px-2 rounded-xl hover:bg-slate-50/70 transition-colors border-b border-black/5 gap-3">
                                <div class="min-w-0">
                                    <p class="text-xs sm:text-sm font-semibold text-black leading-tight">Direct Video Uploads (.MP4)</p>
                                    <p class="text-[11px] text-black-fade font-normal leading-snug mt-0.5">Maximum file size allocation for direct MP4 video lecture recordings (~20-25 min).</p>
                                </div>
                                <div class="flex items-center gap-3 shrink-0 self-end sm:self-center">
                                    <div class="flex items-center gap-1.5">
                                        <span class="text-[11px] font-bold text-black">Standard:</span>
                                        <select id="limit-video-mp4" aria-label="Direct video MP4 standard size limit" class="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold text-black outline-none focus:outline-none focus:ring-0 focus:border-[#FFD000] transition-colors font-['Inter'] cursor-pointer">
                                            <option value="100">100 MB</option>
                                            <option value="200" selected>200 MB</option>
                                            <option value="350">350 MB</option>
                                            <option value="500">500 MB</option>
                                        </select>
                                    </div>
                                    <div class="flex items-center gap-1.5 hidden">
                                        <input type="hidden" value="50" id="limit-video-ext">
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Group 2: Document & Presentation Files -->
                        <div class="space-y-2 pt-2">
                            <div class="pb-1.5 border-b border-black/10">
                                <p class="text-xs font-bold text-[#15803d]">Document & Presentation Files</p>
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
                                        <select id="limit-docx-std" aria-label="Word document standard size limit" class="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold text-black outline-none focus:outline-none focus:ring-0 focus:border-[#FFD000] transition-colors font-['Inter'] cursor-pointer">
                                            <option value="10">10 MB</option>
                                            <option value="20" selected>20 MB</option>
                                            <option value="30">30 MB</option>
                                        </select>
                                    </div>
                                    <input type="hidden" value="25" id="limit-docx-ext">
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
                                        <select id="limit-pdf-std" aria-label="PDF document standard size limit" class="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold text-black outline-none focus:outline-none focus:ring-0 focus:border-[#FFD000] transition-colors font-['Inter'] cursor-pointer">
                                            <option value="15">15 MB</option>
                                            <option value="25" selected>25 MB</option>
                                            <option value="35">35 MB</option>
                                        </select>
                                    </div>
                                    <input type="hidden" value="25" id="limit-pdf-ext">
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
                                        <select id="limit-pptx-std" aria-label="PowerPoint presentation standard size limit" class="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold text-black outline-none focus:outline-none focus:ring-0 focus:border-[#FFD000] transition-colors font-['Inter'] cursor-pointer">
                                            <option value="30">30 MB</option>
                                            <option value="50" selected>50 MB</option>
                                            <option value="75">75 MB</option>
                                        </select>
                                    </div>
                                    <input type="hidden" value="25" id="limit-pptx-ext">
                                </div>
                            </div>
                        </div>

                        <!-- Footer: Advanced Settings (Left) + Save File Limits (Right) -->
                        <div class="flex items-center justify-between pt-4 border-t border-black/5">
                            <button type="button" onclick="window.openAdvancedLimitsPage()"
                                class="px-3.5 py-2 text-[#15803d] hover:bg-slate-100 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center">
                                <span>Advanced Settings</span>
                            </button>
                            <div class="flex items-center gap-3">
                                <span id="limits-save-status" role="status" class="text-xs font-medium text-black-fade"></span>
                                <button type="button" id="limits-restore-btn" onclick="window.restoreMaterialLimitsDefaults()" hidden class="sigma-btn sigma-btn-md limits-restore-button"><i class="fa-solid fa-arrow-rotate-left" aria-hidden="true"></i><span>Restore Default</span></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </div>
</section>

<!-- ═══ SYSTEM SETTINGS 4: DEDICATED GOOGLE DRIVE STORAGE MANAGER PAGE VIEW ═══ -->
<section id="settings-gdrive-view" class="dynamic-section hidden">
    <div class="flex flex-col h-full bg-white min-h-screen border-b border-slate-200 font-['Inter']">
        <div class="gdrive-settings-content max-w-5xl mx-auto w-full px-6 sm:px-10">
            <h1 class="sr-only">Google Drive Cloud Storage</h1>

            <div class="ai-engine-tabs py-8" role="tablist" aria-label="Google Drive">
                <button type="button" id="gdrive-settings-tab" class="ai-engine-tab" role="tab" aria-selected="true" aria-pressed="true" aria-controls="gdrive-settings-panel" onclick="window.selectGoogleDriveSettingsTab('settings')">Connection &amp; Settings</button>
                <button type="button" id="gdrive-usage-tab" class="ai-engine-tab" role="tab" aria-selected="false" aria-pressed="false" aria-controls="gdrive-usage-panel" onclick="window.selectGoogleDriveSettingsTab('usage')">Usage</button>
            </div>
            <div id="gdrive-usage-panel" role="tabpanel" aria-labelledby="gdrive-usage-tab" class="pb-12" hidden><p role="status">Storage usage has not loaded yet.</p></div>
            <!-- Main Content Container -->
            <div id="gdrive-settings-panel" role="tabpanel" aria-labelledby="gdrive-settings-tab" class="pb-12 space-y-6">
                <!-- Card 1: Live Cloud Connection Status -->
                <div class="gdrive-settings-section space-y-4">
                    <div class="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100">
                        <div>
                            <h2 class="text-sm font-bold text-black">Google Drive Connection</h2>
                        </div>
                        <span id="gdrive-page-connection-status" role="status" class="gdrive-connection-status" data-state="idle">Not Connected</span>
                    </div>

                    <div class="gdrive-status-container grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div class="gdrive-detail-row space-y-1">
                            <span class="text-[11px] font-semibold text-black-fade">Google Account</span>
                            <p class="text-xs font-semibold text-black break-all" id="gdrive-page-display-email">Not configured</p>
                        </div>
                        <div class="gdrive-detail-row space-y-1">
                            <span class="text-[11px] font-semibold text-black-fade">Storage Folder</span>
                            <p class="font-semibold text-xs text-black" id="gdrive-page-display-folder-name">Not configured</p>
                        </div>
                    </div>

                    <!-- Action Buttons inside Status -->
                    <div class="flex items-center gap-3 pt-2 flex-wrap">
                        <a target="_blank" rel="noopener noreferrer" aria-disabled="true"
                            id="gdrive-page-open-folder-link"
                            class="sigma-btn sigma-btn-white sigma-btn-md gap-2 cursor-pointer">
                            <i class="fa-solid fa-arrow-up-right-from-square text-xs text-[#15803d]"></i>
                            <span>Open Folder</span>
                        </a>
                        <button type="button" onclick="window.testGoogleDriveConnectionPage()" id="btn-page-test-gdrive"
                            class="sigma-btn sigma-btn-primary sigma-btn-md gap-2 cursor-pointer">
                            <i class="fa-solid fa-bolt text-xs"></i>
                            <span id="btn-page-test-gdrive-label">Test Connection</span>
                        </button>
                    </div>

                    <!-- Live Test Diagnostic Feedback Box -->
                    <div id="gdrive-page-test-feedback" role="status" class="hidden p-3 rounded-lg text-xs font-medium transition-all"></div>
                </div>

                <!-- Card 2: Folder Settings -->
                <div class="gdrive-settings-section space-y-3">
                    <div class="pb-2 border-b border-slate-100">
                        <h2 class="text-sm font-bold text-black">Storage Folder</h2>
                    </div>

                    <div id="gdrive-page-folder-display" class="gdrive-folder-display">
                        <div class="min-w-0">
                            <p class="text-xs font-bold text-black">Google Drive Folder Link</p>
                            <p id="gdrive-page-folder-link-text" class="gdrive-folder-link-text">Not configured</p>
                        </div>
                        <button type="button" id="gdrive-page-edit-folder" onclick="window.setGoogleDriveFolderEditing(true)" disabled class="sigma-btn sigma-btn-white sigma-btn-md shrink-0">Edit Folder</button>
                    </div>
                    <div id="gdrive-page-folder-editor" class="hidden space-y-1.5 pt-1">
                        <label for="gdrive-page-folder-input" class="text-xs font-bold text-black">Google Drive Folder Link</label>
                        <input type="text" id="gdrive-page-folder-input" readonly
                            value=""
                            placeholder="https://drive.google.com/drive/folders/..."
                            class="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-xs font-mono font-bold text-black outline-none focus:border-[#15803d] focus:bg-white transition-all">
                    </div>
                </div>

                <!-- Card 3: Upload JSON Key -->
                <details class="gdrive-settings-section gdrive-advanced">
                    <summary class="text-sm font-bold text-black cursor-pointer">Advanced Settings</summary>
                    <div class="gdrive-advanced-content">

                    <input type="file" id="gdrive-page-key-file" accept=".json" class="hidden" onchange="window.handleUploadGoogleDriveKeyFilePage(event)">

                    <div class="flex items-center gap-3 flex-wrap">
                        <button type="button" onclick="document.getElementById('gdrive-page-key-file').click()"
                            class="sigma-btn sigma-btn-white sigma-btn-md gap-2 cursor-pointer">
                            <i class="fa-solid fa-file-code text-blue-600"></i>
                            <span>Replace JSON Key</span>
                        </button>
                        <span class="text-xs text-black-fade font-medium" id="gdrive-page-key-status">No credentials configured</span>
                    </div>
                    </div>
                </details>

                <!-- Bottom Action Buttons -->
                <div id="gdrive-page-edit-actions" class="hidden flex items-center justify-end gap-3 pt-2">
                    <button type="button" onclick="window.setGoogleDriveFolderEditing(false)"
                        class="sigma-btn sigma-btn-white sigma-btn-md cursor-pointer">
                        Cancel
                    </button>
                    <button type="button" onclick="window.saveGoogleDrivePageConfig()" id="btn-save-gdrive-page-config" disabled
                        class="sigma-btn sigma-btn-primary sigma-btn-md cursor-pointer">
                        Save
                    </button>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- ═══ SYSTEM SETTINGS 5: DEDICATED RECAPTCHA MANAGER PAGE VIEW ═══ -->
<section id="settings-recaptcha-view" class="dynamic-section hidden">
    <div class="bg-white min-h-screen font-['Inter']">
        <div class="recaptcha-settings-content mx-auto w-full px-6 sm:px-10">
            <h1 class="sr-only">Google reCAPTCHA</h1>
            <div class="pb-12">
                <div class="recaptcha-settings-section space-y-4">
                    <div class="flex items-center justify-between gap-4"><h2 class="text-sm font-bold">Status &amp; Verification</h2><span id="recaptcha-page-connection-status" role="status">Checking...</span></div>
                    <div class="recaptcha-status-container grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div class="recaptcha-detail-row space-y-1"><span class="text-xs text-black">Active Version</span><p id="recaptcha-page-display-version" class="text-sm">Not configured</p></div>
                        <div class="recaptcha-detail-row space-y-1"><span class="text-xs text-black">Protection</span><p id="recaptcha-page-display-mode" class="text-sm">Checking...</p></div>
                    </div>
                    <button type="button" onclick="window.openRecaptchaTestModal()" id="btn-page-test-recaptcha" class="sigma-btn sigma-btn-primary sigma-btn-md gap-2"><i class="fa-solid fa-vial-circle-check"></i><span>Test reCAPTCHA</span></button>
                    <div id="recaptcha-page-test-feedback" role="status" class="hidden text-xs text-black-fade"></div>
                </div>
                <div class="recaptcha-settings-section space-y-4">
                    <h2 class="text-sm font-bold">API Credentials</h2>
                    <fieldset class="recaptcha-version-options">
                        <legend class="text-xs font-bold">Select reCAPTCHA Version</legend>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                            <label id="recaptcha-radio-card-v2" class="border border-slate-200 flex items-center gap-3 cursor-pointer"><input type="radio" name="recaptcha-version" value="v2" checked onchange="window.onRecaptchaVersionChanged(this.value)"><span class="text-sm">v2 (Checkbox)</span></label>
                            <label id="recaptcha-radio-card-v3" class="border border-slate-200 flex items-center gap-3 cursor-pointer"><input type="radio" name="recaptcha-version" value="v3" onchange="window.onRecaptchaVersionChanged(this.value)"><span class="text-sm">v3 (Score-based)</span></label>
                        </div>
                    </fieldset>
                    <div id="recaptcha-site-key-display" class="recaptcha-key-display">
                        <div><h3 class="text-xs font-bold">Public Site Key</h3><p id="recaptcha-site-key-value" class="recaptcha-key-value">Not configured</p></div>
                        <button type="button" class="sigma-btn sigma-btn-white sigma-btn-sm gap-2" onclick="window.setRecaptchaKeyEditing('site', true)"><i class="fa-solid fa-pen"></i><span>Edit</span></button>
                    </div>
                    <div id="recaptcha-site-key-editor" class="hidden space-y-3">
                        <label for="recaptcha-page-site-key-input" class="text-xs font-bold">Public Site Key</label>
                        <div class="settings-key-field">
                            <input type="password" id="recaptcha-page-site-key-input" maxlength="255" autocomplete="off" class="w-full border border-slate-200 px-4 py-2.5 text-xs focus:border-[#FFD000] outline-none" oninput="window.updateRecaptchaSaveButtons(); window.syncSettingsKeyEye(this)">
                            <button type="button" id="btn-toggle-recaptcha-site" aria-pressed="false" aria-label="Show key" title="Show key" class="settings-key-eye" hidden onclick="window.toggleRecaptchaKeyVisibility('site')"><i class="fa-solid fa-eye-slash" aria-hidden="true"></i></button>
                        </div>
                        <button type="button" class="sigma-btn sigma-btn-white sigma-btn-sm" onclick="window.setRecaptchaKeyEditing('site', false)">Cancel</button>
                    </div>
                    <div id="recaptcha-secret-key-display" class="recaptcha-key-display">
                        <div><h3 class="text-xs font-bold">Server Secret Key</h3><p id="recaptcha-secret-key-value" class="recaptcha-key-value">Not configured</p></div>
                        <button type="button" id="btn-edit-recaptcha-secret" class="sigma-btn sigma-btn-white sigma-btn-sm" onclick="window.setRecaptchaKeyEditing('secret', true)">Add Key</button>
                    </div>
                    <div id="recaptcha-secret-key-editor" class="hidden space-y-3">
                        <label for="recaptcha-page-secret-key-input" class="text-xs font-bold">Server Secret Key</label>
                        <div class="settings-key-field">
                            <input type="password" id="recaptcha-page-secret-key-input" maxlength="255" autocomplete="off" class="w-full border border-slate-200 px-4 py-2.5 text-xs focus:border-[#FFD000] outline-none" oninput="window.updateRecaptchaSaveButtons(); window.syncSettingsKeyEye(this)">
                            <button type="button" id="btn-toggle-recaptcha-secret" aria-pressed="false" aria-label="Show key" title="Show key" class="settings-key-eye" hidden onclick="window.toggleRecaptchaKeyVisibility('secret')"><i class="fa-solid fa-eye-slash" aria-hidden="true"></i></button>
                        </div>
                        <button type="button" class="sigma-btn sigma-btn-white sigma-btn-sm" onclick="window.setRecaptchaKeyEditing('secret', false)">Cancel</button>
                    </div>
                    <p id="recaptcha-secret-saved-hint" class="text-xs text-black-fade">Secret keys remain on the server.</p>
                    <div class="flex justify-end"><button type="button" onclick="window.saveRecaptchaPageSettings()" id="btn-save-recaptcha-page-config" disabled class="sigma-btn sigma-btn-primary sigma-btn-md">Save</button></div>
                </div>
                <div class="recaptcha-settings-section space-y-4">
                    <h2 class="text-sm font-bold">Protection Settings</h2>
                    <p id="recaptcha-protection-summary" class="text-xs text-black-fade">Checking...</p>
                    <button type="button" class="sigma-btn sigma-btn-white sigma-btn-md gap-2" onclick="window.switchTab('nav-settings-security')"><i class="fa-solid fa-shield-halved"></i><span>Security &amp; Access</span></button>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- ═══ SYSTEM SETTINGS: UNIFIED AI INTEGRATION ENGINES & VAULT VIEW ═══ -->
<section id="settings-ai-view" class="dynamic-section hidden bg-white w-full min-h-screen font-['Inter']">
    <div class="flex flex-col h-full bg-white min-h-screen border-b border-slate-200">
        <div class="max-w-5xl mx-auto w-full px-6 sm:px-10">
            <h1 class="sr-only">AI Credentials &amp; Engine Vault</h1>

            <div class="py-8 space-y-6">

                
                <div class="ai-engine-tabs" role="tablist" aria-label="AI configuration">
                    <button type="button" id="ai-functions-tab" class="ai-engine-tab" role="tab" aria-selected="true" aria-pressed="true" aria-controls="ai-functions-panel" onclick="window.selectAiSettingsTab('functions')">Function Assignments</button>
                    <button type="button" id="ai-keys-tab" class="ai-engine-tab" role="tab" aria-selected="false" aria-pressed="false" aria-controls="ai-provider-panel" onclick="window.selectAiSettingsTab('keys')">Provider Keys</button>
                <button type="button" id="ai-usage-tab" class="ai-engine-tab" role="tab" aria-selected="false" aria-pressed="false" aria-controls="ai-usage-panel" onclick="window.selectAiSettingsTab('usage')">Usage</button>
                </div>
                <div id="ai-usage-panel" role="tabpanel" aria-labelledby="ai-usage-tab" class="ai-settings-section" hidden></div>
                <div id="ai-functions-panel" role="tabpanel" aria-labelledby="ai-functions-tab" class="ai-settings-section">
                    <h2 class="text-sm font-bold text-black">Function Assignments</h2>
                    <div class="ai-routing-table-wrap">
                        <table class="sigma-table ai-routing-table">
                            <thead><tr><th scope="col">AI Feature</th><th scope="col">Preferred Provider</th><th scope="col">Default Key</th><th scope="col">Status</th></tr></thead>
                            <tbody id="ai-routing-rows"></tbody>
                        </table>
                    </div>
                    <div class="ai-routing-footer">
                        <label class="ai-fallback-switch">
                            <input id="ai-allow-fallback" type="checkbox" role="switch" onchange="window.autoSaveAiRoutingSettings()">
                            <span class="ai-switch-track" aria-hidden="true"></span>
                            <span>Allow Temporary Fallback</span>
                        </label>
                    </div>
                    <p id="ai-routing-feedback" class="text-xs mt-3" role="status" aria-live="polite"></p>
                </div>
                <div id="ai-provider-panel" role="tabpanel" aria-labelledby="ai-keys-tab" class="ai-settings-section" hidden>
                    <div id="ai-provider-defaults" class="ai-provider-defaults"></div>
                    <div class="ai-routing-footer">
                        <p id="ai-provider-feedback" class="text-xs" role="status" aria-live="polite"></p>
                    </div>
                </div>

                <!-- 2. Add New API Key Card (Collapsible) -->
                <div id="ai-add-key-card" class="hidden bg-white rounded-2xl border-2 border-[#15803d]/40 p-6 space-y-4 shadow-sm transition-all">
                    <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                        <h2 id="ai-key-form-title" class="ai-key-form-heading">Add API Key</h2>
                    </div>

                    <form id="ai-key-add-form" onsubmit="window.handleSaveAiKeySubmit(event)" class="space-y-4">
                        <input type="hidden" id="ai-form-key-id" value="">
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <!-- Model Selector -->
                            <div id="ai-form-model-field" hidden>
                                <label for="ai-form-model-select" class="text-xs font-bold text-black block mb-1.5">Model</label>
                                <select id="ai-form-model-select" required disabled
                                    class="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-bold text-black outline-none focus:border-[#15803d] focus:bg-white transition-all cursor-pointer">
                                    <option value="">Select a model</option>
                                </select>
                            </div>

                            <!-- API Key Input -->
                            <div>
                                <div class="flex items-center justify-between mb-1.5">
                                    <label for="ai-form-key-input" class="text-xs font-bold text-black">API Key</label>
                                </div>
                                <div class="settings-key-field">
                                <input type="password" id="ai-form-key-input" required maxlength="2048" autocomplete="off" spellcheck="false" oninput="window.detectAiFormKey(); window.syncSettingsKeyEye(this)"
                                    placeholder="Paste a Gemini or Groq API key"
                                    class="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold text-black outline-none focus:border-[#15803d] focus:bg-white transition-all">
                                    <button type="button" onclick="window.toggleAiFormKeyVisibility()" id="btn-toggle-ai-form-key" class="settings-key-eye" aria-label="Show key" title="Show key" aria-pressed="false" hidden><i class="fa-solid fa-eye-slash" aria-hidden="true"></i></button>
                                </div>
                                <span id="ai-form-provider-badge" class="ai-detected-provider" role="status" aria-live="polite" hidden></span>
                                <p id="ai-form-detection-feedback" class="text-xs text-slate-500 mt-2" role="status" aria-live="polite"></p>
                            </div>
                        </div>

                        <div class="flex items-center justify-end pt-2 flex-wrap gap-3">
                            <button type="button" id="btn-delete-ai-key" hidden onclick="window.deleteAiVaultKey(document.getElementById('ai-form-key-id').value)" class="sigma-btn sigma-btn-white sigma-btn-md">Delete</button>
                            <div class="flex items-center gap-2">
                                <button type="button" onclick="window.toggleAddAiKeyForm(false)"
                                    class="sigma-btn sigma-btn-white sigma-btn-md cursor-pointer">Cancel</button>
                                <button type="submit" id="btn-submit-ai-key"
                                    class="sigma-btn sigma-btn-primary sigma-btn-md gap-2 cursor-pointer">
                                    <span>Save</span>
                                </button>
                            </div>
                        </div>
                    </form>
                </div>

                <!-- 3. Configured Keys List -->
                <div id="ai-configured-keys" class="space-y-3" hidden>
                    <div class="flex items-center justify-between pb-1 flex-wrap gap-2">
                        <div class="flex items-center gap-2">
                            <h2 class="text-sm font-bold text-black">Configured API Keys</h2>
                            <span id="ai-keys-count-badge" class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">0 Keys</span>
                        </div>
                        <button type="button" onclick="window.openAiKeyEditor()" id="btn-open-add-ai-key" class="sigma-btn sigma-btn-primary sigma-btn-md">Add API Key</button>
                    </div>

                    <!-- Keys Container (Dynamic List) -->
                    <div id="ai-keys-list-container" class="space-y-3">
                        <div class="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 text-slate-400">
                            <i class="fa-solid fa-spinner fa-spin text-lg mb-2"></i>
                            <p class="text-xs font-medium">Loading AI keys vault...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- ═══ SYSTEM SETTINGS 6: DEDICATED ADVANCED UPLOAD ALLOCATIONS & SANDBOX PAGE VIEW ═══ -->
<section id="settings-limits-view" class="dynamic-section hidden bg-white w-full min-h-screen">
    <div class="flex flex-col h-full bg-white min-h-screen border-b border-slate-200 font-['Inter']">
        <div class="max-w-5xl mx-auto w-full px-6 sm:px-10">
            <!-- Page Header -->
            <div class="py-8">
                <h1 class="text-2xl font-bold text-black tracking-tight font-['Inter']">Advanced Settings</h1>
            </div>

            <!-- Content Cards -->
            <div class="pb-12 space-y-6">
                <!-- Card 1: Extension Buffer Headroom -->
                <div class="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4 shadow-xs">
                    <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div>
                            <h2 class="text-sm font-bold text-black">Extension Buffer Headroom</h2>
                            <p class="text-[11px] text-black-fade">Additional allowance on top of standard limits for special materials.</p>
                        </div>
                    </div>

                    <div class="space-y-4">
                        <!-- Video Extension -->
                        <div class="flex items-center justify-between py-2.5 border-b border-slate-100 text-xs gap-4">
                            <div class="w-48 sm:w-56 shrink-0">
                                <span class="font-bold text-black block">MP4 Video Headroom</span>
                            </div>
                            <div class="flex-1 min-w-0">
                                <span class="text-xs text-black-fade font-normal">Added to direct MP4 video lecture limit</span>
                            </div>
                            <div class="flex items-center gap-1.5 shrink-0">
                                <input type="number" id="adv-limit-video-ext" min="10" max="100" step="5" value="25"
                                    inputmode="numeric" pattern="[0-9]*" maxlength="3"
                                    onkeydown="if(window.handleCounterKeydown) window.handleCounterKeydown(event);"
                                    oninput="if(window.sanitizeCounterInput) window.sanitizeCounterInput(this, 10, 100); if(window.updateAdvSandboxCeiling) window.updateAdvSandboxCeiling();"
                                    onblur="if(window.normalizeCounterInput) window.normalizeCounterInput(this, 10, 100, 25, 5); if(window.updateAdvSandboxCeiling) window.updateAdvSandboxCeiling();"
                                    onchange="if(window.normalizeCounterInput) window.normalizeCounterInput(this, 10, 100, 25, 5); if(window.updateAdvSandboxCeiling) window.updateAdvSandboxCeiling();"
                                    onpaste="if(window.handleCounterPaste) window.handleCounterPaste(event, 10, 100);"
                                    class="w-16 bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-lg text-xs font-bold text-black text-center outline-none focus:border-[#FFD000] transition-colors font-['Inter']">
                                <span class="text-xs font-medium text-black">MB</span>
                            </div>
                        </div>

                        <!-- Document Extension -->
                        <div class="flex items-center justify-between py-2.5 text-xs gap-4">
                            <div class="w-48 sm:w-56 shrink-0">
                                <span class="font-bold text-black block">Document Headroom</span>
                            </div>
                            <div class="flex-1 min-w-0">
                                <span class="text-xs text-black-fade font-normal">Added to Word, PDF, and PowerPoint limits</span>
                            </div>
                            <div class="flex items-center gap-1.5 shrink-0">
                                <input type="number" id="adv-limit-doc-ext" min="5" max="50" step="5" value="5"
                                    inputmode="numeric" pattern="[0-9]*" maxlength="2"
                                    onkeydown="if(window.handleCounterKeydown) window.handleCounterKeydown(event);"
                                    oninput="if(window.sanitizeCounterInput) window.sanitizeCounterInput(this, 5, 50); if(window.updateAdvSandboxCeiling) window.updateAdvSandboxCeiling();"
                                    onblur="if(window.normalizeCounterInput) window.normalizeCounterInput(this, 5, 50, 5, 5); if(window.updateAdvSandboxCeiling) window.updateAdvSandboxCeiling();"
                                    onchange="if(window.normalizeCounterInput) window.normalizeCounterInput(this, 5, 50, 5, 5); if(window.updateAdvSandboxCeiling) window.updateAdvSandboxCeiling();"
                                    onpaste="if(window.handleCounterPaste) window.handleCounterPaste(event, 5, 50);"
                                    class="w-16 bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-lg text-xs font-bold text-black text-center outline-none focus:border-[#FFD000] transition-colors font-['Inter']">
                                <span class="text-xs font-medium text-black">MB</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Card 2: Max Limits Per Upload Panel -->
                <div class="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4 shadow-xs">
                    <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div>
                            <h2 class="text-sm font-bold text-black">Max Limit Per Upload Panel</h2>
                            <p class="text-[11px] text-black-fade">Multi-file submission quota for student coursework.</p>
                        </div>
                    </div>

                    <div class="space-y-4">
                        <!-- Student Multi-File Batch Quota -->
                        <div class="flex items-center justify-between py-2.5 text-xs gap-4">
                            <div class="w-48 sm:w-56 shrink-0">
                                <span class="font-bold text-black block">Student Submission Quota</span>
                            </div>
                            <div class="flex-1 min-w-0">
                                <span class="text-xs text-black-fade font-normal">Maximum combined size for all files in one submission</span>
                            </div>
                            <div class="shrink-0">
                                <select id="adv-limit-batch-quota" onchange="window.updateAdvSandboxCeiling()" class="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold text-black outline-none focus:border-[#FFD000] transition-colors font-['Inter'] cursor-pointer">
                                    <option value="100">100 MB</option>
                                    <option value="150" selected>150 MB</option>
                                    <option value="200">200 MB</option>
                                    <option value="250">250 MB</option>
                                </select>
                            </div>
                        </div>

                    </div>

                    <div class="flex items-center justify-end gap-3 pt-2">
                        <span id="adv-limits-save-status" class="text-xs font-medium text-black-fade"></span>
                        <button type="button" id="adv-limits-save-btn" disabled onclick="window.saveAdvancedLimits()"
                            class="flex items-center justify-center px-6 py-2.5 bg-slate-100 text-slate-400 border border-slate-200 text-xs font-bold uppercase tracking-wider rounded-xl cursor-not-allowed transition-all shadow-none">
                            <span>Save Advanced Rules</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- ═══ RECAPTCHA TEST MODAL ═══ -->
<div id="recaptchaTestModal" role="dialog" aria-modal="true" aria-labelledby="recaptcha-test-title" class="fixed inset-0 bg-black/65 z-[999999] hidden items-center justify-center p-4 font-['Inter']">
    <div class="bg-white rounded-xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div class="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <h3 id="recaptcha-test-title" class="text-base font-bold">Test Google reCAPTCHA</h3>
            <button type="button" onclick="window.closeRecaptchaTestModal()" class="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center" aria-label="Close modal"><i class="fa-solid fa-xmark text-sm"></i></button>
        </div>
        <div class="p-6 overflow-y-auto space-y-5">
            <div id="recaptcha-test-widget"></div>
            <div id="recaptcha-test-result" role="status" class="text-xs"></div>
        </div>
        <div class="px-6 py-4 border-t border-slate-100 flex justify-between gap-3">
            <button type="button" onclick="window.resetRecaptchaTestModal()" class="sigma-btn sigma-btn-white sigma-btn-md gap-2"><i class="fa-solid fa-rotate-right"></i><span>Reset Test</span></button>
            <button type="button" onclick="window.closeRecaptchaTestModal()" class="sigma-btn sigma-btn-primary sigma-btn-md">Done</button>
        </div>
    </div>
</div>


