<?php
/**
 * SIGMA ELMS - Shared School Year Management Component
 * Interface Computer College
 */
?>
<!-- SCHOOL YEAR MANAGEMENT VIEW -->
<section id="school-year-view" class="dynamic-section hidden">
    <div class="flex flex-col h-full bg-white min-h-screen border-b border-slate-200">
        <!-- Exact Title Placement -->
        <div class="px-10 py-8">
            <h1 class="text-2xl font-bold text-black tracking-tight font-['Inter']">School Year</h1>
        </div>

        <!-- Auxiliary Header Controls & Summary Banner -->
        <div class="px-10 pb-10 border-b border-slate-50 flex items-end justify-between gap-12">
            <div class="shrink-0 flex flex-col gap-3 w-64">
                <button type="button" onclick="window.openSYManager()"
                    class="sigma-btn sigma-btn-primary sigma-btn-md w-full justify-start gap-3.5">
                    <i class="fa-solid fa-layer-group text-xs w-4 text-center text-white"></i>
                    <span>Manage School Years</span>
                </button>
                <button type="button" onclick="window.openSYEditor()"
                    class="sigma-btn sigma-btn-primary sigma-btn-md w-full justify-start gap-3.5">
                    <i class="fa-solid fa-plus text-xs w-4 text-center text-white"></i>
                    <span>Create School Year</span>
                </button>
            </div>

            <div
                class="sigma-interactive-metric-card flex-1 w-full rounded-2xl px-10 py-8 group flex items-center justify-between">
                <div class="metric-text-content flex-1">
                    <!-- Base State (Solid Black / Charcoal text on Light Panel) -->
                    <div class="metric-text-base flex items-center justify-start gap-10 md:gap-14">
                        <p id="sy-bar-year"
                            class="text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter leading-none italic text-slate-900 font-['Inter'] shrink-0">
                            ---- - ----</p>
                        <div class="flex flex-col justify-center">
                            <p id="sy-bar-quarter"
                                class="text-2xl md:text-3xl font-black tracking-tight text-slate-900 font-['Inter'] whitespace-nowrap leading-tight">
                                No Active School Year</p>
                            <div id="sy-bar-dates" class="hidden text-xs md:text-sm font-semibold text-slate-600 font-['Inter'] flex items-center gap-2 whitespace-nowrap mt-1">
                                <span id="sy-bar-start"></span>
                                <span id="sy-bar-divider" class="opacity-60">•</span>
                                <span id="sy-bar-end"></span>
                            </div>
                        </div>
                    </div>

                    <!-- Spotlight State (Pure White Text illuminated under tracking liquid) -->
                    <div class="metric-text-spotlight flex items-center justify-start gap-10 md:gap-14" aria-hidden="true">
                        <p id="sy-bar-year-spotlight"
                            class="text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter leading-none italic font-['Inter'] shrink-0">
                            ---- - ----</p>
                        <div class="flex flex-col justify-center">
                            <p id="sy-bar-quarter-spotlight"
                                class="text-2xl md:text-3xl font-black tracking-tight font-['Inter'] whitespace-nowrap leading-tight">
                                No Active School Year</p>
                            <div id="sy-bar-dates-spotlight" class="hidden text-xs md:text-sm font-semibold font-['Inter'] flex items-center gap-2 whitespace-nowrap mt-1">
                                <span id="sy-bar-start-spotlight"></span>
                                <span id="sy-bar-divider-spotlight" class="opacity-60">•</span>
                                <span id="sy-bar-end-spotlight"></span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Magnetic Calendar Icon Badge -->
                <div class="metric-icon-box w-16 h-16 rounded-2xl flex items-center justify-center text-2xl shrink-0">
                    <i class="fa-solid fa-calendar-days metric-icon-base"></i>
                    <i class="fa-solid fa-calendar-days metric-icon-spotlight" aria-hidden="true"></i>
                </div>
            </div>
        </div>

        <!-- Standardized Institutional Shared Table -->
        <div class="flex-1 flex flex-col bg-white px-10">
            <table class="w-full border-collapse table-fixed">
                <colgroup>
                    <col style="width: 7%;">  <!-- No. -->
                    <col style="width: 12%;"> <!-- Year Start -->
                    <col style="width: 12%;"> <!-- Year End -->
                    <col style="width: 14%;"> <!-- Quarter -->
                    <col style="width: 17%;"> <!-- Date Start -->
                    <col style="width: 17%;"> <!-- Date End -->
                    <col style="width: 11%;"> <!-- Status -->
                    <col style="width: 10%;"> <!-- Action -->
                </colgroup>
                <thead class="sticky top-0 bg-[#15803d] z-10 border-b border-[#166534]">
                    <tr>
                        <th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter'] border-r border-[#166534]">No.</th>
                        <th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter'] border-r border-[#166534]">Year Start</th>
                        <th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter'] border-r border-[#166534]">Year End</th>
                        <th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter'] border-r border-[#166534]">Quarter</th>
                        <th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter'] border-r border-[#166534]">Date Start</th>
                        <th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter'] border-r border-[#166534]">Date End</th>
                        <th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter'] border-r border-[#166534]">Status</th>
                        <th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter']">Action</th>
                    </tr>
                </thead>
                <tbody id="schoolYearTableBody"
                    class="divide-y divide-slate-100">
                    <!-- Populated by JS -->
                </tbody>
            </table>
            <!-- Standardized Shared Pagination -->
            <div id="school-year-pagination-container" class="py-6 border-t border-slate-100 flex items-center justify-center bg-white"></div>
        </div>
    </div>
</section>

<!-- SCHOOL YEAR EDIT OVERLAY -->
<div id="sy-edit-overlay"
    class="fixed inset-0 bg-[#f8fafc] z-[1000] hidden flex flex-col items-center p-0 overflow-y-auto">

    <!-- Exit Control (Far Right) -->
    <button type="button" onclick="window.handleSYExit()"
        class="fixed top-10 right-10 w-12 h-12 rounded-full hover:bg-slate-200 flex items-center justify-center text-black transition-all z-[1001]"
        title="Exit Editor">
        <i class="fa-solid fa-xmark text-xl"></i>
    </button>

    <div class="branch-edit-shell mx-auto w-full animate-in slide-in-from-top-4 duration-500">
        <!-- White Panel (Same 1024px Width, Centered, Full Height) -->
        <div
            class="branch-edit-panel bg-white border border-slate-200 min-h-screen p-0 standard-panel-shadow relative flex flex-col mx-auto max-w-[1024px]">

            <div class="px-8 py-5 border-b border-slate-200 flex items-center justify-between bg-white sticky top-0 z-20">
                <div class="flex items-center gap-3">
                    <h1 id="sy-editor-title" class="text-xl font-bold text-black tracking-tight font-['Inter']">Create School Year</h1>
                </div>
            </div>

            <div id="sy-edit-form-body" class="flex-1 p-10 pt-4 space-y-6 font-['Inter']">
                <!-- Academic Year Range Card (Matching Assign Schedule Top Card Visual) -->
                <div class="p-4 bg-black/[0.03] border border-black/10 rounded-2xl space-y-3 font-['Inter']">
                    <div>
                        <span class="text-xs font-bold text-black">Academic School Year <span class="text-red-500">*</span></span>
                    </div>
                    <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <div class="flex items-center gap-3 w-full">
                            <!-- Year Start (Custom year picker + direct typing) -->
                            <div class="flex-1 relative" id="sy-year-start-container">
                                <div class="relative flex items-center w-full bg-white border border-slate-200 rounded-xl hover:border-black focus-within:border-black transition-all">
                                    <input type="text" id="edit-sy-year-start" aria-label="School year starting year"
                                        inputmode="numeric"
                                        pattern="[0-9]*"
                                        maxlength="4"
                                        placeholder="Year"
                                        onfocus="this.select()"
                                        onclick="this.select()"
                                        oninput="window.handleSYYearStartInput(event)"
                                        onchange="window.handleSYYearStartChange()"
                                        class="w-full bg-transparent border-0 text-black px-4 py-2.5 text-sm font-semibold outline-none focus:ring-0 focus:outline-none shadow-none">
                                    <button type="button" id="edit-sy-year-start-calendar-btn"
                                        onclick="window.toggleSYYearDropdown(event)"
                                        title="Choose year"
                                        class="mr-2 p-1.5 rounded-full text-black/40 hover:bg-slate-200 hover:text-black/70 flex items-center justify-center transition-colors focus:outline-none">
                                        <i class="fa-regular fa-calendar text-sm"></i>
                                    </button>
                                </div>

                                <!-- Year Dropdown Panel -->
                                <div id="sy-year-dropdown-panel"
                                    class="hidden absolute left-0 top-full mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-1.5 max-h-52 overflow-y-auto font-['Inter']">
                                    <div id="sy-year-dropdown-list" class="space-y-1">
                                        <!-- Populated dynamically -->
                                    </div>
                                </div>
                            </div>

                            <span class="text-slate-400 font-bold text-xs">—</span>

                            <!-- Year End Box -->
                            <div id="sy-year-end-container-box"
                                class="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-black/60 flex items-center justify-between shadow-none cursor-not-allowed">
                                <input type="text" id="edit-sy-year-end" aria-label="School year ending year" disabled readonly placeholder="Year End"
                                    class="bg-transparent border-0 p-0 font-semibold text-black/60 focus:ring-0 focus:outline-none w-full cursor-not-allowed text-sm">
                                <i class="fa-regular fa-calendar icon-black-fade text-sm shrink-0 ml-1"></i>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 1st Semester Section (Matching Assign Schedule Row Visuals) -->
                <div class="space-y-3 pt-2">
                    <div class="flex items-center gap-2.5 pb-2 border-b border-black/10 w-full">
                        <div class="w-1.5 h-4 bg-[#15803d] rounded-full shrink-0"></div>
                        <h2 class="text-sm font-bold text-black tracking-tight font-['Inter']">1st Semester</h2>
                    </div>
                    <div class="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 bg-white shadow-sm">
                        <!-- 1st Quarter -->
                        <div class="p-4 hover:bg-black/[0.02] transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-['Inter']">
                            <div class="flex items-center gap-3.5 min-w-[150px]">
                                <span class="text-sm font-bold text-black">1st Quarter <span class="text-red-500">*</span></span>
                            </div>
                            <div class="flex items-center gap-3 flex-1 w-full sm:w-auto">
                                <div class="flex items-center gap-2 flex-1 max-w-sm">
                                    <input type="date" id="edit-sy-q1-start" aria-label="Quarter 1 starting date" lang="en-US"
                                        class="flex-1 w-full bg-white border border-slate-200 text-black rounded-xl px-4 py-2.5 text-sm font-semibold outline-none hover:border-black focus:border-black focus:ring-0 focus:outline-none transition-all shadow-none">
                                    <span class="text-slate-400 font-bold text-xs">—</span>
                                    <input type="date" id="edit-sy-q1-end" aria-label="Quarter 1 ending date" lang="en-US"
                                        class="flex-1 w-full bg-white border border-slate-200 text-black rounded-xl px-4 py-2.5 text-sm font-semibold outline-none hover:border-black focus:border-black focus:ring-0 focus:outline-none transition-all shadow-none">
                                </div>
                            </div>
                            <div class="shrink-0 text-right min-w-[100px] flex items-center justify-end">
                                <span id="edit-sy-q1-status" class="text-xs font-bold text-slate-400"></span>
                            </div>
                        </div>

                        <!-- 2nd Quarter -->
                        <div class="p-4 hover:bg-black/[0.02] transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-['Inter']">
                            <div class="flex items-center gap-3.5 min-w-[150px]">
                                <span class="text-sm font-bold text-black">2nd Quarter</span>
                            </div>
                            <div class="flex items-center gap-3 flex-1 w-full sm:w-auto">
                                <div class="flex items-center gap-2 flex-1 max-w-sm">
                                    <input type="date" id="edit-sy-q2-start" aria-label="Quarter 2 starting date" lang="en-US"
                                        class="flex-1 w-full bg-white border border-slate-200 text-black rounded-xl px-4 py-2.5 text-sm font-semibold outline-none hover:border-black focus:border-black focus:ring-0 focus:outline-none transition-all shadow-none">
                                    <span class="text-slate-400 font-bold text-xs">—</span>
                                    <input type="date" id="edit-sy-q2-end" aria-label="Quarter 2 ending date" lang="en-US"
                                        class="flex-1 w-full bg-white border border-slate-200 text-black rounded-xl px-4 py-2.5 text-sm font-semibold outline-none hover:border-black focus:border-black focus:ring-0 focus:outline-none transition-all shadow-none">
                                </div>
                            </div>
                            <div class="shrink-0 text-right min-w-[100px] flex items-center justify-end">
                                <span id="edit-sy-q2-status" class="text-xs font-bold text-slate-400"></span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 2nd Semester Section (Matching Assign Schedule Row Visuals) -->
                <div class="space-y-3 pt-2">
                    <div class="flex items-center gap-2.5 pb-2 border-b border-black/10 w-full">
                        <div class="w-1.5 h-4 bg-[#15803d] rounded-full shrink-0"></div>
                        <h2 class="text-sm font-bold text-black tracking-tight font-['Inter']">2nd Semester</h2>
                    </div>
                    <div class="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 bg-white shadow-sm">
                        <!-- 3rd Quarter -->
                        <div class="p-4 hover:bg-black/[0.02] transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-['Inter']">
                            <div class="flex items-center gap-3.5 min-w-[150px]">
                                <span class="text-sm font-bold text-black">3rd Quarter</span>
                            </div>
                            <div class="flex items-center gap-3 flex-1 w-full sm:w-auto">
                                <div class="flex items-center gap-2 flex-1 max-w-sm">
                                    <input type="date" id="edit-sy-q3-start" aria-label="Quarter 3 starting date" lang="en-US"
                                        class="flex-1 w-full bg-white border border-slate-200 text-black rounded-xl px-4 py-2.5 text-sm font-semibold outline-none hover:border-black focus:border-black focus:ring-0 focus:outline-none transition-all shadow-none">
                                    <span class="text-slate-400 font-bold text-xs">—</span>
                                    <input type="date" id="edit-sy-q3-end" aria-label="Quarter 3 ending date" lang="en-US"
                                        class="flex-1 w-full bg-white border border-slate-200 text-black rounded-xl px-4 py-2.5 text-sm font-semibold outline-none hover:border-black focus:border-black focus:ring-0 focus:outline-none transition-all shadow-none">
                                </div>
                            </div>
                            <div class="shrink-0 text-right min-w-[100px] flex items-center justify-end">
                                <span id="edit-sy-q3-status" class="text-xs font-bold text-slate-400"></span>
                            </div>
                        </div>

                        <!-- 4th Quarter -->
                        <div class="p-4 hover:bg-black/[0.02] transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-['Inter']">
                            <div class="flex items-center gap-3.5 min-w-[150px]">
                                <span class="text-sm font-bold text-black">4th Quarter</span>
                            </div>
                            <div class="flex items-center gap-3 flex-1 w-full sm:w-auto">
                                <div class="flex items-center gap-2 flex-1 max-w-sm">
                                    <input type="date" id="edit-sy-q4-start" aria-label="Quarter 4 starting date" lang="en-US"
                                        class="flex-1 w-full bg-white border border-slate-200 text-black rounded-xl px-4 py-2.5 text-sm font-semibold outline-none hover:border-black focus:border-black focus:ring-0 focus:outline-none transition-all shadow-none">
                                    <span class="text-slate-400 font-bold text-xs">—</span>
                                    <input type="date" id="edit-sy-q4-end" aria-label="Quarter 4 ending date" lang="en-US"
                                        class="flex-1 w-full bg-white border border-slate-200 text-black rounded-xl px-4 py-2.5 text-sm font-semibold outline-none hover:border-black focus:border-black focus:ring-0 focus:outline-none transition-all shadow-none">
                                </div>
                            </div>
                            <div class="shrink-0 text-right min-w-[100px] flex items-center justify-end">
                                <span id="edit-sy-q4-status" class="text-xs font-bold text-slate-400"></span>
                            </div>
                        </div>
                    </div>
                </div>
                <!-- Bottom Action Bar / Normal size buttons -->
                <div class="pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
                    <button type="button" id="sy-delete-btn" onclick="window.handleSYDelete()"
                        class="sigma-btn sigma-btn-white sigma-btn-md gap-2 px-5 cursor-pointer font-['Inter'] hidden text-black">
                        <i class="fa-solid fa-trash-can text-xs text-black"></i>
                        <span>Delete School Year</span>
                    </button>
                    <button type="button" id="sy-save-btn" onclick="window.handleSYSave()"
                        class="sigma-btn sigma-btn-primary sigma-btn-md gap-2 px-6 cursor-pointer font-['Inter']">
                        <span id="sy-save-label">Create School Year</span>
                        <i class="fa-solid fa-circle-notch fa-spin hidden" id="sy-save-loading"></i>
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- SCHOOL YEAR MANAGER OVERLAY (Directory & Archive) -->
<div id="sy-manager-overlay"
    class="fixed inset-0 bg-[#f8fafc] z-[1000] hidden flex flex-col items-center p-0 overflow-y-auto">

    <!-- Exit Control (Far Right) -->
    <button type="button" onclick="window.toggleSYManager(false)"
        class="fixed top-10 right-10 w-12 h-12 rounded-full hover:bg-slate-200 flex items-center justify-center text-black transition-all z-[1001]"
        title="Exit Manager">
        <i class="fa-solid fa-xmark text-xl"></i>
    </button>

    <div class="branch-edit-shell mx-auto w-full animate-in slide-in-from-top-4 duration-500">
        <div
            class="branch-edit-panel bg-white border border-slate-200 min-h-screen p-0 standard-panel-shadow relative flex flex-col mx-auto max-w-[1024px]">

            <!-- Pinned Header with Tabs -->
            <div class="px-10 py-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white sticky top-0 z-20 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                <div>
                    <h1 class="text-2xl font-bold text-black tracking-tight font-['Inter']">Manage School Years</h1>
                    <p class="text-xs text-black-fade font-medium mt-1">Activate, archive, or remove academic year records.</p>
                </div>
                <div class="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                    <button type="button" id="sy-tab-active-btn" onclick="window.switchSYManagerTab('active')"
                        class="px-4 py-2 rounded-xl text-xs font-bold transition-all bg-white text-black shadow-sm cursor-pointer flex items-center">
                        <i class="fa-solid fa-calendar-days mr-1.5 text-xs"></i>
                        <span>Academic Years</span>
                        <span id="sy-active-count-badge" class="ml-1.5 px-2 py-0.5 bg-slate-100 rounded-full text-[10px] text-black font-bold">0</span>
                    </button>
                    <button type="button" id="sy-tab-archived-btn" onclick="window.switchSYManagerTab('archived')"
                        class="px-4 py-2 rounded-xl text-xs font-bold transition-all text-black-fade hover:text-black cursor-pointer flex items-center">
                        <i class="fa-solid fa-box-archive mr-1.5 text-xs"></i>
                        <span>Archived Years</span>
                        <span id="sy-archived-count-badge" class="ml-1.5 px-2 py-0.5 bg-slate-200 rounded-full text-[10px] text-black-fade font-bold">0</span>
                    </button>
                    <button type="button" id="sy-tab-trash-btn" onclick="window.switchSYManagerTab('trash')"
                        class="px-4 py-2 rounded-xl text-xs font-bold transition-all text-black-fade hover:text-black cursor-pointer flex items-center">
                        <i class="fa-solid fa-trash-can mr-1.5 text-xs"></i>
                        <span>Trash Bin</span>
                        <span id="sy-trash-count-badge" class="ml-1.5 px-2 py-0.5 bg-slate-200 rounded-full text-[10px] text-black-fade font-bold">0</span>
                    </button>
                </div>
            </div>

            <!-- List Container -->
            <div id="sy-manager-list" class="flex-1 p-10 space-y-4 font-['Inter']">
                <!-- Cards dynamically populated by renderSYManagerList -->
            </div>

            <!-- Pinned Footer -->
            <div class="sigma-modal-footer flex justify-between items-center px-10 py-6 border-t border-slate-200 bg-white sticky bottom-0 z-30 shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
                <span class="text-xs text-black font-medium">Changes to active year take effect across all roles immediately.</span>
                <button type="button" onclick="window.toggleSYManager(false)"
                    class="sigma-btn sigma-btn-primary sigma-btn-lg min-w-[120px] cursor-pointer">
                    <span>Done</span>
                </button>
            </div>
        </div>
    </div>
</div>

<!-- SY ACTION CONFIRMATION OVERLAY -->
<div id="sy-confirm-overlay"
    class="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[2000] hidden flex items-center justify-center p-4">
    <div
        class="bg-white rounded-[32px] border border-slate-200 shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200 font-['Inter']">
        <div class="space-y-4">
            <div
                class="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto text-black border border-slate-100 shadow-xs">
                <i class="fa-solid fa-calendar-check text-2xl text-black"></i>
            </div>
            <h3 id="sy-confirm-title" class="text-xl font-bold text-black text-center tracking-tight leading-snug">Confirmation Title</h3>
            <p id="sy-confirm-desc" class="text-sm font-medium text-black-fade text-center leading-relaxed">Explanation text goes here.</p>
        </div>
        <div class="grid grid-cols-2 gap-3 mt-8">
            <button id="sy-confirm-cancel"
                class="sigma-btn sigma-btn-ghost sigma-btn-lg text-black cursor-pointer">Cancel</button>
            <button id="sy-confirm-proceed"
                class="sigma-btn sigma-btn-primary sigma-btn-lg cursor-pointer">Proceed</button>
        </div>
    </div>
</div>

