<?php
/**
 * SIGMA ELMS - Shared School Sections Management Component
 * Interface Computer College
 */
?>
<!-- SCHOOL SECTIONS VIEW -->
<section id="school-sections-view" class="dynamic-section hidden">
    <div class="flex flex-col h-full bg-white min-h-screen border-b border-slate-200">
        <!-- Page Header -->
        <div class="px-10 py-8 flex justify-between items-center">
            <h1 class="text-2xl font-bold text-black tracking-tight font-['Inter']">Sections</h1>
        </div>

        <!-- Metric / Counter Cards (Modern Elevated Suite) -->
        <div class="px-10 pb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <!-- Total Sections -->
            <div class="sigma-section-metric-card rounded-xl p-5 group flex items-center justify-between">
                <div class="metric-text-content">
                    <div class="metric-text-base">
                        <span class="text-xs font-bold text-black tracking-normal block font-['Inter']">Total Sections</span>
                        <span id="metric-total-sections" class="text-3xl md:text-[34px] font-extrabold text-slate-900 block mt-1.5 font-['Inter'] tracking-tight">0</span>
                    </div>
                    <div class="metric-text-spotlight" aria-hidden="true">
                        <span class="text-xs font-bold tracking-normal block font-['Inter']">Total Sections</span>
                        <span id="metric-total-sections-spotlight" class="text-3xl md:text-[34px] font-extrabold block mt-1.5 font-['Inter'] tracking-tight">0</span>
                    </div>
                </div>
                <div class="metric-icon-box w-10 h-10 rounded-lg flex items-center justify-center text-base shrink-0">
                    <i class="fa-solid fa-layer-group metric-icon-base"></i>
                    <i class="fa-solid fa-layer-group metric-icon-spotlight" aria-hidden="true"></i>
                </div>
            </div>

            <!-- Rooms In Use -->
            <div class="sigma-section-metric-card rounded-xl p-5 group flex items-center justify-between">
                <div class="metric-text-content">
                    <div class="metric-text-base">
                        <span class="text-xs font-bold text-black tracking-normal block font-['Inter']">Rooms In Use</span>
                        <span id="metric-rooms-sections" class="text-3xl md:text-[34px] font-extrabold text-slate-900 block mt-1.5 font-['Inter'] tracking-tight">0</span>
                    </div>
                    <div class="metric-text-spotlight" aria-hidden="true">
                        <span class="text-xs font-bold tracking-normal block font-['Inter']">Rooms In Use</span>
                        <span id="metric-rooms-sections-spotlight" class="text-3xl md:text-[34px] font-extrabold block mt-1.5 font-['Inter'] tracking-tight">0</span>
                    </div>
                </div>
                <div class="metric-icon-box w-10 h-10 rounded-lg flex items-center justify-center text-base shrink-0">
                    <i class="fa-solid fa-door-open metric-icon-base"></i>
                    <i class="fa-solid fa-door-open metric-icon-spotlight" aria-hidden="true"></i>
                </div>
            </div>

            <!-- Grade 11 -->
            <div class="sigma-section-metric-card rounded-xl p-5 group flex items-center justify-between">
                <div class="metric-text-content">
                    <div class="metric-text-base">
                        <span class="text-xs font-bold text-black tracking-normal block font-['Inter']">Grade 11</span>
                        <span id="metric-grade11-sections" class="text-3xl md:text-[34px] font-extrabold text-slate-900 block mt-1.5 font-['Inter'] tracking-tight">0</span>
                    </div>
                    <div class="metric-text-spotlight" aria-hidden="true">
                        <span class="text-xs font-bold tracking-normal block font-['Inter']">Grade 11</span>
                        <span id="metric-grade11-sections-spotlight" class="text-3xl md:text-[34px] font-extrabold block mt-1.5 font-['Inter'] tracking-tight">0</span>
                    </div>
                </div>
                <div class="metric-icon-box w-10 h-10 rounded-lg flex items-center justify-center text-base shrink-0">
                    <i class="fa-solid fa-graduation-cap metric-icon-base"></i>
                    <i class="fa-solid fa-graduation-cap metric-icon-spotlight" aria-hidden="true"></i>
                </div>
            </div>

            <!-- Grade 12 -->
            <div class="sigma-section-metric-card rounded-xl p-5 group flex items-center justify-between">
                <div class="metric-text-content">
                    <div class="metric-text-base">
                        <span class="text-xs font-bold text-black tracking-normal block font-['Inter']">Grade 12</span>
                        <span id="metric-grade12-sections" class="text-3xl md:text-[34px] font-extrabold text-slate-900 block mt-1.5 font-['Inter'] tracking-tight">0</span>
                    </div>
                    <div class="metric-text-spotlight" aria-hidden="true">
                        <span class="text-xs font-bold tracking-normal block font-['Inter']">Grade 12</span>
                        <span id="metric-grade12-sections-spotlight" class="text-3xl md:text-[34px] font-extrabold block mt-1.5 font-['Inter'] tracking-tight">0</span>
                    </div>
                </div>
                <div class="metric-icon-box w-10 h-10 rounded-lg flex items-center justify-center text-base shrink-0">
                    <i class="fa-solid fa-award metric-icon-base"></i>
                    <i class="fa-solid fa-award metric-icon-spotlight" aria-hidden="true"></i>
                </div>
            </div>
        </div>

        <!-- Actions & Search Toolbar (Single Unified Row - Shared Code Pattern) -->
        <div id="section-accounts-toolbar" class="px-10 pb-8 flex flex-wrap items-center justify-between gap-4">
            <!-- Left: Create Section Button -->
            <button onclick="window.toggleSectionOverlay(true)"
                class="sigma-btn sigma-btn-primary sigma-btn-md gap-3 shrink-0">
                <i class="fa-solid fa-plus text-xs"></i>
                <span>Create Section</span>
            </button>

            <!-- Right: Combined Search, Grade, Strand, Status, Filter, and Search Button -->
            <div class="flex flex-wrap items-center gap-3">
                <!-- Combined Section & Room Search -->
                <div id="section-field-search" class="w-[260px] relative">
                    <input type="text" id="section-search-query" aria-label="Search section or room"
                        placeholder="Search Section or Room"
                        maxlength="50"
                        autocomplete="off"
                        autocorrect="off"
                        autocapitalize="off"
                        spellcheck="false"
                        oninput="this.value = this.value.replace(/^\s+/, '').replace(/[^a-zA-Z0-9\s.\-']/g, '').replace(/\s{2,}/g, ' ')"
                        onkeydown="if(event.key==='Enter'){event.preventDefault();window.applySectionSearch(true);}"
                        class="sigma-input">
                </div>

                <!-- Grade Level Field -->
                <div id="section-field-grade" class="w-[170px] relative">
                    <div class="sigma-select-wrapper">
                        <select id="section-search-grade" aria-label="Filter sections by grade level" class="sigma-select">
                            <option value="">All Grades</option>
                            <option value="Grade 11">Grade 11</option>
                            <option value="Grade 12">Grade 12</option>
                        </select>
                        <i class="fa-solid fa-chevron-down sigma-select-icon"></i>
                    </div>
                </div>

                <!-- Search Action Button -->
                <button type="button" id="section-search-btn" onclick="window.applySectionSearch(true)"
                    class="sigma-btn sigma-btn-primary sigma-btn-lg min-w-[120px]">
                    <span>Search</span>
                </button>
            </div>
        </div>

        <!-- Standardized Institutional Table -->
        <div class="flex-1 flex flex-col bg-white px-10">
            <table class="w-full border-collapse table-fixed">
                <colgroup>
                    <col style="width: 5%;">  <!-- No. -->
                    <col style="width: 13%;"> <!-- Section (Combined with Grade & Strand) -->
                    <col style="width: 14%;"> <!-- Subject -->
                    <col style="width: 14%;"> <!-- Room -->
                    <col style="width: 20%;"> <!-- Teacher -->
                    <col style="width: 8%;">  <!-- Students -->
                    <col style="width: 12%;"> <!-- School Year -->
                    <col style="width: 8%;">  <!-- Status -->
                    <col style="width: 6%;">  <!-- Action -->
                </colgroup>
                <thead class="sticky top-0 bg-[#15803d] z-10 border-b border-[#166534]">
                    <tr>
                        <th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter'] whitespace-nowrap border-r border-[#166534]">No.</th>
                        <th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter'] whitespace-nowrap border-r border-[#166534]">Section</th>
                        <th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter'] whitespace-nowrap border-r border-[#166534]">Subject</th>
                        <th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter'] whitespace-nowrap border-r border-[#166534]">Room</th>
                        <th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter'] whitespace-nowrap border-r border-[#166534]">Teacher</th>
                        <th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter'] whitespace-nowrap border-r border-[#166534]">Students</th>
                        <th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter'] whitespace-nowrap border-r border-[#166534]">School Year</th>
                        <th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter'] whitespace-nowrap border-r border-[#166534]">Status</th>
                        <th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter'] whitespace-nowrap">Action</th>
                    </tr>
                </thead>
                <tbody id="sectionTableBody" class="divide-y divide-slate-100">
                    <!-- Dynamic Sections will be rendered here -->
                </tbody>
            </table>
            <div id="section-pagination-container" class="py-6 border-t border-slate-100 flex items-center justify-between bg-white"></div>
        </div>
    </div>
</section>

<!-- SCHOOL SECTIONS EDIT OVERLAY (Full Screen Workstation) -->
<div id="section-edit-overlay" class="sigma-modal-overlay hidden">
    <!-- Exit Control (Far Right) -->
    <button type="button" onclick="window.handleSectionExit()"
        class="fixed top-10 right-10 w-12 h-12 rounded-full hover:bg-slate-200 flex items-center justify-center text-black transition-all z-[1001] cursor-pointer"
        title="Exit Editor">
        <i class="fa-solid fa-xmark text-xl"></i>
    </button>

    <div class="sigma-modal-shell">
        <!-- White Panel (Full Height Column) -->
        <div class="sigma-modal-panel">
            <div id="section-modal-header-container" class="border-b border-slate-50 sticky top-0 bg-white z-20">
                <div class="px-10 pt-8 pb-4 flex items-center justify-between gap-4">
                    <div class="flex items-center gap-3 min-w-0">
                        <button type="button" id="section-back-btn" onclick="window.handleSectionBack()"
                            title="Back"
                            class="hidden w-8 h-8 rounded-full flex items-center justify-center text-black hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer border-0 p-0 shadow-none outline-none -ml-1">
                            <i class="fa-solid fa-arrow-left text-sm text-black"></i>
                        </button>
                        <h1 id="section-modal-title" class="text-2xl font-bold text-black tracking-tight font-['Inter'] truncate">Create Section</h1>
                        <span id="section-modal-status-badge" class="hidden text-xs font-bold px-2.5 py-1 rounded-full font-['Inter'] shrink-0"></span>
                    </div>

                    <!-- Right Header Actions -->
                    <div id="section-header-actions" class="flex items-center gap-2.5 shrink-0">
                        <div id="section-subpage-teacher-selected-panel" class="hidden min-w-0 max-w-[22rem]"></div>
                        <div id="section-subpage-students-selected-panel" class="hidden min-w-0 max-w-[28rem]"></div>
                        <div id="section-subpage-subject-selected-panel" class="hidden min-w-0 max-w-[22rem]"></div>
                        <!-- Top Right Subpage Confirm Button (Select Subject, Save Schedule, Select Teacher, Select Students) -->
                        <button type="button" id="section-subpage-confirm-btn" onclick="window.confirmSectionSubpage()"
                            class="h-10 px-5 rounded-xl bg-[#15803d] hover:bg-[#166534] active:bg-[#14532d] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm flex items-center justify-center transition-all cursor-pointer shadow-xs font-['Inter'] hidden">
                            <span id="section-subpage-confirm-label">Select Subject</span>
                        </button>

                        <!-- Deploy Split Button Group (Placed in Header like Subject Editor) -->
                        <div id="section-split-btn-group" class="relative inline-flex items-center shadow-xs rounded-xl font-['Inter'] hidden">
                            <button type="button" id="section-save-btn" disabled
                                onclick="window.handleSectionSave('Deployed', false)"
                                class="h-10 px-5 rounded-l-xl bg-[#15803d] hover:bg-[#166534] active:bg-[#14532d] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm flex items-center gap-2 transition-all cursor-pointer border-r border-white/20 font-['Inter'] shadow-xs">
                                <i class="fa-solid fa-circle-notch fa-spin hidden" id="section-save-loading"></i>
                                <span id="section-save-label">Deploy Section</span>
                            </button>
                            <button type="button" id="section-split-dropdown-btn" disabled onclick="window.toggleSectionSaveDropdown(event)"
                                class="h-10 px-3.5 rounded-r-xl bg-[#15803d] hover:bg-[#166534] active:bg-[#14532d] disabled:opacity-50 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all cursor-pointer font-['Inter'] shadow-xs"
                                title="More save options">
                                <i class="fa-solid fa-chevron-down text-xs text-white/90 transition-transform duration-150" id="section-split-chevron"></i>
                            </button>

                            <!-- Dropdown Menu -->
                            <div id="section-split-dropdown-menu"
                                class="hidden absolute right-0 top-full mt-2 w-56 bg-emerald-50/95 backdrop-blur-xs rounded-2xl border border-emerald-200/90 shadow-xl z-[260] p-1.5 space-y-0.5 animate-in fade-in zoom-in-95 duration-100 font-['Inter']">
                                <button type="button" id="section-deploy-create-btn" onclick="window.handleSectionSave('Deployed', true); window.toggleSectionSaveDropdown(false)"
                                    class="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-slate-200/70 text-black rounded-xl text-xs font-semibold transition-colors text-left cursor-pointer">
                                    <i class="fa-solid fa-plus text-xs text-black" id="section-deploy-create-icon"></i>
                                    <span id="section-deploy-create-label">Deploy &amp; Create Another</span>
                                    <i class="fa-solid fa-circle-notch fa-spin hidden ml-auto" id="section-deploy-create-loading"></i>
                                </button>
                                <button type="button" id="section-draft-btn" onclick="window.handleSectionSave('Draft'); window.toggleSectionSaveDropdown(false)"
                                    class="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-slate-200/70 text-black rounded-xl text-xs font-semibold transition-colors text-left cursor-pointer">
                                    <i class="fa-regular fa-bookmark text-xs text-black"></i>
                                    <span>Save as Draft</span>
                                    <i class="fa-solid fa-circle-notch fa-spin hidden ml-auto" id="section-draft-loading"></i>
                                </button>
                                <button type="button" id="section-split-delete-btn" onclick="window.deleteSection(); window.toggleSectionSaveDropdown(false)"
                                    class="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-slate-200/70 text-black rounded-xl text-xs font-semibold transition-colors text-left cursor-pointer hidden">
                                    <i class="fa-solid fa-trash-can text-xs text-black"></i>
                                    <span>Delete Section</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <!-- Segmented Navigation Header -->
                <div id="section-step-tabs-container" class="flex w-full bg-slate-100 border-y border-slate-200 pointer-events-none select-none">
                    <!-- Step 1: Identity -->
                    <div id="section-step-bar-1"
                        class="flex-1 pt-4 pb-0 flex flex-col items-center justify-between transition-all border-r border-slate-200 bg-[#15803d]/10 pointer-events-none select-none">
                        <span id="section-step-bar-1-label"
                            class="text-base font-bold capitalize tracking-normal transition-colors text-[#15803d] mb-3">Add Section</span>
                        <div id="section-step-bar-1-track"
                            class="w-full h-1.5 bg-[#15803d] transition-all"></div>
                    </div>

                    <!-- Step 2: Assign (People & Roster) -->
                    <div id="section-step-bar-2"
                        class="flex-1 pt-4 pb-0 flex flex-col items-center justify-between transition-all bg-slate-100 pointer-events-none select-none">
                        <span id="section-step-bar-2-label"
                            class="text-base font-bold capitalize tracking-normal transition-colors text-black-fade mb-3">Assign Section</span>
                        <div id="section-step-bar-2-track"
                            class="w-full h-1.5 bg-slate-200 transition-all"></div>
                    </div>
                </div>
            </div>

            <!-- Modal Body (Two-Step Form Architecture) -->
            <div id="section-edit-form-body" class="flex-1 p-8 sm:p-10 space-y-8 overflow-y-auto">
                <form id="section-form" onsubmit="event.preventDefault();" class="space-y-6">

                    <!-- STEP 1: SECTION IDENTITY (Single Page, 4 Core Fields) -->
                    <div id="section-step-1" class="space-y-6 animate-in fade-in duration-300">
                        <!-- Row 1: Section Name with Select Existing Section button directly to its right -->
                        <div class="flex items-end gap-4 pb-1">
                            <!-- Section Name -->
                            <div class="space-y-3 flex-1">
                                <label for="edit-section-name" class="sigma-subject-label text-base font-bold text-black capitalize tracking-normal ml-1">Section Name <span class="text-red-500">*</span></label>
                                <input type="text" id="edit-section-name" maxlength="100" autocomplete="off" placeholder="e.g. Einstein"
                                    oninput="this.value = this.value.replace(/[^a-zA-Z0-9\s\-]/g, ''); window.validateSectionStep1()"
                                    class="sigma-subject-input w-full bg-slate-50 border-b-2 border-slate-300 rounded-none px-4 py-4 text-base font-medium text-black outline-none hover:bg-slate-100 hover:border-slate-400 focus:bg-slate-100 focus:border-black transition-all placeholder:text-black/40 font-['Inter'] shadow-none">
                                <div id="section-quick-name-chips" class="hidden flex items-center gap-1.5 flex-wrap pt-1"></div>
                                <div id="section-name-duplicate-warning" class="hidden text-xs font-semibold text-rose-600 flex items-center gap-1.5 pt-0.5"></div>
                            </div>

                            <!-- Select Existing Section Button -->
                            <div class="relative shrink-0" style="width: 230px;" id="section-existing-picker-wrapper">
                                <button type="button" id="section-existing-picker-btn"
                                    onclick="window.toggleExistingSectionsMenu(event)"
                                    class="w-full h-14 px-4 bg-white hover:bg-slate-50 text-black text-xs font-bold rounded-xl border border-slate-200 transition-all cursor-pointer flex items-center justify-between shadow-none">
                                    <div class="flex items-center gap-2.5 truncate">
                                        <i id="section-existing-picker-icon" class="fa-solid fa-layer-group text-sm text-black shrink-0"></i>
                                        <span id="section-existing-picker-text" class="text-black truncate text-xs">Select Existing Section</span>
                                    </div>
                                    <i id="section-existing-picker-chevron" class="fa-solid fa-chevron-down text-[10px] text-black shrink-0 ml-1.5"></i>
                                </button>

                                <!-- Dropdown Menu -->
                                <div id="section-existing-menu"
                                    class="hidden absolute right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 p-3 font-['Inter'] flex flex-col"
                                    style="width: 580px; max-width: 90vw; max-height: 520px;">
                                    <div class="relative mb-2.5 shrink-0">
                                        <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-black pointer-events-none"></i>
                                        <input type="text" id="section-existing-search-input" aria-label="Search existing sections" maxlength="100"
                                            placeholder="Search section, grade, year..."
                                            oninput="window.filterExistingSectionsMenu(this.value)"
                                            class="w-full pl-10 pr-3.5 h-11 bg-white border-2 border-slate-200 rounded-xl text-sm font-medium text-black outline-none hover:border-slate-300 focus:border-slate-400 focus:ring-0 transition-all placeholder:text-black/45 font-['Inter']">
                                    </div>
                                    <div id="section-existing-list" class="overflow-y-auto grid grid-cols-2 gap-2.5 pr-1 flex-1" style="max-height: 380px;">
                                        <!-- Generated dynamically -->
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Row 2 & 3: Grade Level, Room, School Year in 2-Column Grid -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <!-- Grade Level (Left Column) -->
                            <div class="space-y-3">
                                <label for="edit-section-grade" class="sigma-subject-label text-base font-bold text-black capitalize tracking-normal ml-1">
                                    Grade Level <span class="text-red-500">*</span>
                                </label>
                                <div class="relative">
                                    <select id="edit-section-grade" required onchange="window.validateSectionStep1(); window.handleSectionGradeChange(this.value);"
                                        class="sigma-subject-select w-full bg-slate-50 border-b-2 border-slate-300 rounded-none px-4 py-4 text-base font-medium text-black outline-none hover:bg-slate-100 hover:border-slate-400 focus:bg-slate-100 focus:border-black transition-all appearance-none cursor-pointer font-['Inter'] shadow-none">
                                        <option value="" disabled selected>Select grade level</option>
                                        <option value="Grade 11">Grade 11</option>
                                        <option value="Grade 12">Grade 12</option>
                                    </select>
                                    <i class="fa-solid fa-chevron-down absolute right-5 top-1/2 -translate-y-1/2 text-xs text-black pointer-events-none"></i>
                                </div>
                            </div>

                            <!-- Room (Right Column) -->
                            <div class="space-y-3">
                                <label for="edit-section-room" class="sigma-subject-label text-base font-bold text-black capitalize tracking-normal ml-1">
                                    Room <span class="text-red-500">*</span>
                                </label>
                                <input type="text" id="edit-section-room" required placeholder="e.g. 402, ICT Lab 1" maxlength="50"
                                    oninput="this.value = this.value.replace(/[^a-zA-Z0-9\s\-]/g, ''); window.validateSectionStep1()"
                                    class="sigma-subject-input w-full bg-slate-50 border-b-2 border-slate-300 rounded-none px-4 py-4 text-base font-medium text-black outline-none hover:bg-slate-100 hover:border-slate-400 focus:bg-slate-100 focus:border-black transition-all placeholder:text-black/40 font-['Inter'] shadow-none" />
                            </div>

                            <!-- School Year (Left Column) -->
                            <div class="space-y-3">
                                <label for="edit-section-school-year" class="sigma-subject-label text-base font-bold text-black capitalize tracking-normal ml-1">
                                    School Year <span class="text-red-500">*</span>
                                </label>
                                <div class="relative">
                                    <select id="edit-section-school-year" required onchange="window.validateSectionStep1()"
                                        class="sigma-subject-select w-full bg-slate-50 border-b-2 border-slate-300 rounded-none px-4 py-4 text-base font-medium text-black outline-none hover:bg-slate-100 hover:border-slate-400 focus:bg-slate-100 focus:border-black transition-all appearance-none cursor-pointer font-['Inter'] shadow-none">
                                        <option value="" disabled selected>Select school year</option>
                                    </select>
                                    <i class="fa-solid fa-chevron-down absolute right-5 top-1/2 -translate-y-1/2 text-xs text-black pointer-events-none"></i>
                                </div>
                            </div>
                            <div></div>
                        </div>

                        <!-- Hidden fields for compatibility -->
                        <input type="hidden" id="edit-section-teacher" value="" />
                        <input type="hidden" id="edit-section-role" value="Teacher" />
                        <input type="hidden" id="edit-section-subject" value="" />
                        <input type="hidden" id="edit-section-start-time" value="" />
                        <input type="hidden" id="edit-section-end-time" value="" />

                        <!-- Bottom Next Button in Body -->
                        <div class="pt-6 border-t border-slate-100 flex items-center justify-end">
                            <button type="button" id="section-next-btn" onclick="window.handleSectionStep(2)"
                                class="sigma-btn sigma-btn-primary sigma-btn-lg min-w-[120px] flex items-center justify-center gap-2 cursor-pointer">
                                <span>Next</span>
                                <i class="fa-solid fa-arrow-right text-xs"></i>
                            </button>
                        </div>
                    </div>

                    <!-- STEP 2: ASSIGN PEOPLE & ROSTER (Dynamic Overview Architecture) -->
                    <div id="section-step-2" class="hidden space-y-6 animate-in fade-in duration-300">
                        <!-- Section Identity Context Summary -->
                        <div id="section-step2-context-banner" class="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs text-black font-medium font-['Inter']">
                            <span id="section-context-name"><b>Section:</b> —</span>
                            <span class="text-black/20">|</span>
                            <span id="section-context-grade"><b>Grade:</b> —</span>
                            <span class="text-black/20">|</span>
                            <span id="section-context-room"><b>Room:</b> —</span>
                            <span class="text-black/20">|</span>
                            <span id="section-context-sy"><b>SY:</b> —</span>
                        </div>

                        <!-- 1. SUBJECT SECTION (Subject First) -->
                        <div class="space-y-3" id="section-subject-block">
                            <div id="section-subject-header-row" class="flex items-center justify-between pb-2 border-b-2 border-black transition-colors">
                                <div>
                                    <div class="flex items-center gap-2.5">
                                        <span id="section-subject-step-num" class="w-5 h-5 rounded-full bg-black text-white text-[11px] font-bold flex items-center justify-center font-['Inter'] transition-colors">1</span>
                                        <h3 id="section-subject-title" class="text-base sm:text-[17px] font-bold text-black font-['Inter'] tracking-tight transition-colors">Subject</h3>
                                    </div>
                                    <p id="section-subject-subtitle" class="text-xs font-normal mt-0.5" style="color: rgba(0,0,0,0.45);">Choose the course curriculum for this section</p>
                                </div>
                                <button type="button" id="section-assign-subject-header-btn" onclick="window.openSectionSubpage('subject')"
                                    class="inline-flex items-center gap-2 text-sm font-bold text-black hover:text-[#FFD000] transition-colors cursor-pointer">
                                    <i class="fa-solid fa-book-medical text-xs"></i>
                                    <span id="section-assign-subject-btn-text">Assign Subject</span>
                                </button>
                            </div>
                            <div id="section-assigned-subject-display" class="space-y-2">
                                <!-- Rendered by JS -->
                            </div>
                        </div>

                        <!-- 2. CLASS SCHEDULE SECTION -->
                        <div class="space-y-3" id="section-schedule-block">
                            <div id="section-schedule-header-row" class="flex items-center justify-between pb-2 border-b-2 border-black transition-colors">
                                <div>
                                    <div class="flex items-center gap-2.5">
                                        <span id="section-schedule-step-num" class="w-5 h-5 rounded-full bg-black text-white text-[11px] font-bold flex items-center justify-center font-['Inter'] transition-colors">2</span>
                                        <h3 id="section-schedule-title" class="text-base sm:text-[17px] font-bold text-black font-['Inter'] tracking-tight transition-colors">Class Schedule</h3>
                                        <span id="section-assigned-schedule-badge" class="text-sm font-normal" style="color: rgba(0,0,0,0.45);"></span>
                                    </div>
                                    <p id="section-schedule-subtitle" class="text-xs font-normal mt-0.5" style="color: rgba(0,0,0,0.45);">Set meeting days and times for room</p>
                                </div>
                                <button type="button" id="section-assign-schedule-header-btn" onclick="window.openSectionSubpage('schedule')"
                                    class="inline-flex items-center gap-2 text-sm font-bold text-black hover:text-[#FFD000] transition-colors cursor-pointer">
                                    <i class="fa-solid fa-calendar-days text-xs"></i>
                                    <span id="section-assign-schedule-btn-text">Assign Schedule</span>
                                </button>
                            </div>
                            <div id="section-assigned-schedule-display" class="space-y-2">
                                <!-- Rendered by JS -->
                            </div>
                        </div>

                        <!-- 3. TEACHERS SECTION -->
                        <div class="space-y-3" id="section-teacher-block">
                            <div id="section-teacher-header-row" class="flex items-center justify-between pb-2 border-b-2 border-black transition-colors">
                                <div>
                                    <div class="flex items-center gap-2.5">
                                        <span id="section-teacher-step-num" class="w-5 h-5 rounded-full bg-black text-white text-[11px] font-bold flex items-center justify-center font-['Inter'] transition-colors">3</span>
                                        <h3 id="section-teacher-title" class="text-xl font-bold text-black font-['Inter'] transition-colors">Teachers</h3>
                                    </div>
                                    <p id="section-teacher-subtitle" class="text-xs font-normal mt-0.5" style="color: rgba(0,0,0,0.45);">Assign instructor with schedule conflict check</p>
                                </div>
                                <button type="button" id="section-assign-teacher-header-btn" onclick="window.openSectionSubpage('teacher')"
                                    class="inline-flex items-center gap-2 text-sm font-bold text-black hover:text-[#FFD000] transition-colors cursor-pointer">
                                    <i class="fa-solid fa-user-plus text-xs"></i>
                                    <span id="section-assign-teacher-btn-text">Assign Teacher</span>
                                </button>
                            </div>
                            <div id="section-assigned-teacher-display">
                                <!-- Rendered by JS -->
                            </div>
                        </div>

                        <!-- 4. ENROLLED STUDENTS ROSTER SECTION -->
                        <div class="space-y-3" id="section-students-block">
                            <div id="section-students-header-row" class="flex items-center justify-between pb-2 border-b-2 border-black transition-colors">
                                <div>
                                    <div class="flex items-center gap-2.5">
                                        <span id="section-students-step-num" class="w-5 h-5 rounded-full bg-black text-white text-[11px] font-bold flex items-center justify-center font-['Inter'] transition-colors">4</span>
                                        <h3 id="section-students-title" class="text-xl font-bold text-black font-['Inter'] transition-colors">Enrolled Students</h3>
                                        <span id="section-assigned-students-count" class="text-xs font-semibold" style="color: rgba(0,0,0,0.45);">0 students</span>
                                    </div>
                                    <p id="section-students-subtitle" class="text-xs font-normal mt-0.5" style="color: rgba(0,0,0,0.45);">Assign student class roster</p>
                                </div>
                                <button type="button" id="section-assign-students-header-btn" onclick="window.openSectionSubpage('students')"
                                    class="inline-flex items-center gap-2 text-sm font-bold text-black hover:text-[#FFD000] transition-colors cursor-pointer">
                                    <i class="fa-solid fa-user-plus text-xs"></i>
                                    <span id="section-assign-students-btn-text">Assign Students</span>
                                </button>
                            </div>
                            <div id="section-assigned-students-display">
                                <!-- Rendered by JS -->
                            </div>
                        </div>
                    </div>
                </form>

                <!-- SUBPAGE: ASSIGN SCHEDULE -->
                <div id="section-subpage-schedule" class="hidden space-y-6 animate-in fade-in duration-300">
                    <!-- Quick Set Master Hours Tool -->
                    <div class="p-5 bg-slate-50/80 border border-slate-200/90 rounded-2xl space-y-3 shadow-2xs font-['Inter']">
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-bold text-black uppercase tracking-wider font-['Inter']">
                                Quick Set All Meeting Hours
                            </span>
                            <span class="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                                Quick Set
                            </span>
                        </div>
                        <div class="flex flex-wrap items-end gap-3 pt-1">
                            <!-- Start Time (215px) -->
                            <div class="space-y-1" style="width: 215px; max-width: 100%;">
                                <label for="subpage-master-start-time" class="block text-xs font-bold text-black font-['Inter']">Start Time</label>
                                <div class="time-input-box relative flex items-center bg-white border border-slate-200 hover:border-slate-300 focus-within:border-slate-400 rounded-xl h-10 px-3 transition-all shadow-2xs font-['Inter'] w-full cursor-text">
                                    <input type="time" id="subpage-master-start-time" value="09:00"
                                        style="color-scheme: light;"
                                        class="w-full h-full bg-transparent text-xs font-semibold text-black outline-none border-none p-0 cursor-text font-['Inter']" />
                                </div>
                            </div>

                            <!-- Dash -->
                            <div class="h-10 flex items-center justify-center text-black-fade font-bold text-sm select-none px-0.5">—</div>

                            <!-- End Time (215px) -->
                            <div class="space-y-1" style="width: 215px; max-width: 100%;">
                                <label for="subpage-master-end-time" class="block text-xs font-bold text-black font-['Inter']">End Time</label>
                                <div class="time-input-box relative flex items-center bg-white border border-slate-200 hover:border-slate-300 focus-within:border-slate-400 rounded-xl h-10 px-3 transition-all shadow-2xs font-['Inter'] w-full cursor-text">
                                    <input type="time" id="subpage-master-end-time" value="10:30"
                                        style="color-scheme: light;"
                                        class="w-full h-full bg-transparent text-xs font-semibold text-black outline-none border-none p-0 cursor-text font-['Inter']" />
                                </div>
                            </div>

                            <!-- Apply Button -->
                            <button type="button" onclick="window.applyMasterTimeToActiveDays()"
                                class="h-10 px-5 bg-[#15803d] text-white text-xs font-bold rounded-xl hover:bg-[#166534] active:scale-95 transition-all cursor-pointer whitespace-nowrap shadow-sm flex items-center justify-center gap-2 font-['Inter'] shrink-0">
                                <i class="fa-solid fa-check text-[11px]"></i>
                                <span>Apply to All Days</span>
                            </button>
                        </div>
                    </div>

                    <!-- Day-by-Day Schedule List -->
                    <div class="space-y-3" id="subpage-days-schedule-list">
                        <!-- Rendered by JS for Sun, Mon, Tue, Wed, Thu, Fri, Sat -->
                    </div>

                    <!-- Live Room Availability & Collision Alert -->
                    <div id="subpage-schedule-room-conflict-alert" class="pt-2"></div>
                </div>

                <!-- SUBPAGE: ASSIGN TEACHER -->
                <div id="section-subpage-teacher" class="hidden space-y-6 animate-in fade-in duration-300">
                    <div class="sigma-field-group">
                        <div class="flex items-center gap-3">
                            <div class="relative flex-1">
                                <i class="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-black text-sm pointer-events-none"></i>
                                <input type="text" id="section-subpage-teacher-search" aria-label="Search teacher to assign" maxlength="100" placeholder="Search teacher by name or ID..."
                                    autocomplete="off"
                                    onkeydown="if(event.key==='Enter'){event.preventDefault();window.executeSubpageTeacherSearch();}"
                                    class="sigma-input pl-11">
                            </div>
                            <button type="button" id="section-subpage-teacher-search-btn" onclick="window.executeSubpageTeacherSearch()"
                                class="sigma-btn sigma-btn-primary sigma-btn-md min-w-[100px] shrink-0 flex items-center justify-center gap-2 cursor-pointer">
                                <span>Search</span>
                            </button>
                            <div class="flex items-center gap-2.5 shrink-0">
                                <label for="section-subpage-teacher-role" class="sigma-label mb-0 whitespace-nowrap">Assign role:</label>
                                <div class="w-36 sigma-select-wrapper">
                                    <select id="section-subpage-teacher-role" onchange="window.updateTeacherSubpageRole(this.value)"
                                        class="sigma-select">
                                        <option value="Teacher">Teacher</option>
                                        <option value="Adviser">Adviser</option>
                                    </select>
                                    <i class="fa-solid fa-chevron-down sigma-select-icon"></i>
                                </div>
                            </div>
                        </div>
                        <div id="section-subpage-teacher-dropdown"
                            class="mt-3 max-h-80 overflow-y-auto hidden font-['Inter']">
                        </div>
                    </div>

                </div>

                <!-- SUBPAGE: ASSIGN SUBJECT -->
                <div id="section-subpage-subject" class="hidden space-y-6 animate-in fade-in duration-300">
                    <div class="sigma-field-group">
                        <div class="flex items-center gap-3">
                            <div class="relative flex-1">
                                <i class="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-black text-sm pointer-events-none"></i>
                                <input type="text" id="section-subpage-subject-search" aria-label="Search subject to assign" maxlength="100" placeholder="Search subject by title or code..."
                                    autocomplete="off"
                                    onkeydown="if(event.key==='Enter'){event.preventDefault();window.executeSubpageSubjectSearch();}"
                                    class="sigma-input pl-11">
                            </div>
                            <button type="button" id="section-subpage-subject-search-btn" onclick="window.executeSubpageSubjectSearch()"
                                class="sigma-btn sigma-btn-primary sigma-btn-md min-w-[100px] shrink-0 flex items-center justify-center gap-2 cursor-pointer">
                                <span>Search</span>
                            </button>
                        </div>
                        <div id="section-subpage-subject-dropdown"
                            class="mt-3 max-h-80 overflow-y-auto hidden font-['Inter']">
                        </div>
                    </div>
                </div>

                <!-- SUBPAGE: ASSIGN STUDENTS -->
                <div id="section-subpage-students" class="hidden space-y-6 animate-in fade-in duration-300">
                    <div class="sigma-field-group">
                        <div class="flex items-center gap-3">
                            <div class="relative flex-1">
                                <i class="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-black text-sm pointer-events-none"></i>
                                <input type="text" id="section-subpage-students-search" aria-label="Search student to enroll" maxlength="100" placeholder="Search student by name or ID to add..."
                                    autocomplete="off"
                                    onkeydown="if(event.key==='Enter'){event.preventDefault();window.executeSubpageStudentsSearch();}"
                                    class="sigma-input pl-11">
                            </div>
                            <button type="button" id="section-subpage-students-search-btn" onclick="window.executeSubpageStudentsSearch()"
                                class="sigma-btn sigma-btn-primary sigma-btn-md min-w-[100px] shrink-0 flex items-center justify-center gap-2 cursor-pointer">
                                <span>Search</span>
                            </button>
                        </div>
                        <div id="section-subpage-students-dropdown"
                            class="mt-3 max-h-80 overflow-y-auto hidden font-['Inter']">
                        </div>
                    </div>

                </div>
            </div>
        </div>
    </div>
</div>

<!-- SECTION ACTION CONFIRMATION OVERLAY -->
<div id="section-confirm-overlay"
    class="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[2000] hidden flex items-center justify-center p-4 font-['Inter']">
    <div
        class="bg-white rounded-[32px] border border-slate-200 shadow-2xl w-full max-w-sm p-8 animate-in zoom-in-95 duration-200">
        <div class="text-center space-y-4">
            <div
                class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-black border border-slate-100">
                <i class="fa-solid fa-users-rectangle text-2xl"></i>
            </div>
            <h3 id="section-confirm-title" class="text-xl font-bold text-black leading-tight">Confirmation
                Title</h3>
            <p id="section-confirm-desc" class="text-sm font-medium text-black/70 px-4 leading-relaxed">
                Explanation text goes here.</p>
        </div>
        <div class="grid grid-cols-2 gap-3 mt-8">
            <button id="section-confirm-cancel"
                class="py-3.5 bg-slate-100 text-black rounded-2xl text-sm font-bold capitalize tracking-normal hover:bg-slate-200 transition-all cursor-pointer font-['Inter'] shadow-none">Cancel</button>
            <button id="section-confirm-proceed"
                class="py-3.5 bg-[#15803d] text-white rounded-2xl text-sm font-bold capitalize tracking-normal hover:bg-[#166534] transition-all cursor-pointer font-['Inter'] shadow-none">Proceed</button>
        </div>
    </div>
</div>
