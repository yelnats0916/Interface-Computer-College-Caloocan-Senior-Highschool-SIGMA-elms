<?php
/**
 * SIGMA ELMS - Shared School Subjects Management Component
 * Interface Computer College
 */
?>
<!-- SCHOOL SUBJECTS VIEW -->
<section id="school-subjects-view" class="dynamic-section hidden font-['Inter']">
    <div class="flex flex-col h-full bg-white min-h-screen border-b border-slate-200">
        <!-- Page Header -->
        <div class="px-10 py-8 flex justify-between items-center">
            <h1 class="text-2xl font-bold text-black tracking-tight font-['Inter']">Subjects</h1>
        </div>

        <!-- Metric / Counter Cards (Universal Elevated Suite) -->
        <div class="px-10 pb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <!-- Total Subjects -->
            <div class="sigma-interactive-metric-card rounded-xl p-5 group flex items-center justify-between">
                <div class="metric-text-content">
                    <div class="metric-text-base">
                        <span class="text-xs font-bold text-black tracking-normal block font-['Inter']">Total Subjects</span>
                        <span id="metric-total-subjects" class="text-3xl md:text-[34px] font-extrabold text-slate-900 block mt-1.5 font-['Inter'] tracking-tight">0</span>
                    </div>
                    <div class="metric-text-spotlight" aria-hidden="true">
                        <span class="text-xs font-bold tracking-normal block font-['Inter']">Total Subjects</span>
                        <span id="metric-total-subjects-spotlight" class="text-3xl md:text-[34px] font-extrabold block mt-1.5 font-['Inter'] tracking-tight">0</span>
                    </div>
                </div>
                <div class="metric-icon-box w-10 h-10 rounded-lg flex items-center justify-center text-base shrink-0">
                    <i class="fa-solid fa-book-open metric-icon-base"></i>
                    <i class="fa-solid fa-book-open metric-icon-spotlight" aria-hidden="true"></i>
                </div>
            </div>

            <!-- Core Subjects -->
            <div class="sigma-interactive-metric-card rounded-xl p-5 group flex items-center justify-between">
                <div class="metric-text-content">
                    <div class="metric-text-base">
                        <span class="text-xs font-bold text-black tracking-normal block font-['Inter']">Core Subjects</span>
                        <span id="metric-core-subjects" class="text-3xl md:text-[34px] font-extrabold text-slate-900 block mt-1.5 font-['Inter'] tracking-tight">0</span>
                    </div>
                    <div class="metric-text-spotlight" aria-hidden="true">
                        <span class="text-xs font-bold tracking-normal block font-['Inter']">Core Subjects</span>
                        <span id="metric-core-subjects-spotlight" class="text-3xl md:text-[34px] font-extrabold block mt-1.5 font-['Inter'] tracking-tight">0</span>
                    </div>
                </div>
                <div class="metric-icon-box w-10 h-10 rounded-lg flex items-center justify-center text-base shrink-0">
                    <i class="fa-solid fa-brain metric-icon-base"></i>
                    <i class="fa-solid fa-brain metric-icon-spotlight" aria-hidden="true"></i>
                </div>
            </div>

            <!-- Applied Subjects -->
            <div class="sigma-interactive-metric-card rounded-xl p-5 group flex items-center justify-between">
                <div class="metric-text-content">
                    <div class="metric-text-base">
                        <span class="text-xs font-bold text-black tracking-normal block font-['Inter']">Applied Subjects</span>
                        <span id="metric-applied-subjects" class="text-3xl md:text-[34px] font-extrabold text-slate-900 block mt-1.5 font-['Inter'] tracking-tight">0</span>
                    </div>
                    <div class="metric-text-spotlight" aria-hidden="true">
                        <span class="text-xs font-bold tracking-normal block font-['Inter']">Applied Subjects</span>
                        <span id="metric-applied-subjects-spotlight" class="text-3xl md:text-[34px] font-extrabold block mt-1.5 font-['Inter'] tracking-tight">0</span>
                    </div>
                </div>
                <div class="metric-icon-box w-10 h-10 rounded-lg flex items-center justify-center text-base shrink-0">
                    <i class="fa-solid fa-pen-ruler metric-icon-base"></i>
                    <i class="fa-solid fa-pen-ruler metric-icon-spotlight" aria-hidden="true"></i>
                </div>
            </div>

            <!-- Specialized Subjects -->
            <div class="sigma-interactive-metric-card rounded-xl p-5 group flex items-center justify-between">
                <div class="metric-text-content">
                    <div class="metric-text-base">
                        <span class="text-xs font-bold text-black tracking-normal block font-['Inter']">Specialized Subjects</span>
                        <span id="metric-specialized-subjects" class="text-3xl md:text-[34px] font-extrabold text-slate-900 block mt-1.5 font-['Inter'] tracking-tight">0</span>
                    </div>
                    <div class="metric-text-spotlight" aria-hidden="true">
                        <span class="text-xs font-bold tracking-normal block font-['Inter']">Specialized Subjects</span>
                        <span id="metric-specialized-subjects-spotlight" class="text-3xl md:text-[34px] font-extrabold block mt-1.5 font-['Inter'] tracking-tight">0</span>
                    </div>
                </div>
                <div class="metric-icon-box w-10 h-10 rounded-lg flex items-center justify-center text-base shrink-0">
                    <i class="fa-solid fa-award metric-icon-base"></i>
                    <i class="fa-solid fa-award metric-icon-spotlight" aria-hidden="true"></i>
                </div>
            </div>
        </div>

        <!-- Actions & Search Toolbar (Single Unified Row - Shared Code Pattern) -->
        <div id="subject-accounts-toolbar" class="px-10 pb-8 flex flex-wrap items-center justify-between gap-4">
                <!-- Left: Create Subject Button -->
                <button id="open-subject-overlay-btn" onclick="window.isEditingSubject = false; window.toggleSubjectOverlay(true)"
                    class="sigma-btn sigma-btn-primary sigma-btn-md gap-3 shrink-0">
                    <i class="fa-solid fa-plus text-xs"></i>
                    <span>Create Subject</span>
                </button>

                <!-- Right: Combined Search, Type, Status, Filter, and Search Button -->
                <div class="flex flex-wrap items-center gap-3">
                    <!-- Combined Code & Subject Search -->
                    <div id="subject-field-search" class="w-[280px] relative">
                        <input type="text" id="subject-search-query" aria-label="Search subject code or title" 
                            placeholder="Search Code or Subject"
                            maxlength="50"
                            autocomplete="off"
                            autocorrect="off"
                            autocapitalize="off"
                            spellcheck="false"
                            oninput="this.value = this.value.replace(/^\s+/, '').replace(/[^a-zA-Z0-9\s.\-']/g, '').replace(/\s{2,}/g, ' ')"
                            onkeydown="if(event.key==='Enter'){event.preventDefault();window.applySubjectSearch(true);}"
                            class="sigma-input">
                    </div>

                    <!-- Type Dropdown -->
                    <div id="subject-field-type" class="w-[180px] relative">
                        <div class="sigma-select-wrapper">
                            <select id="subject-search-type" aria-label="Filter subjects by category" class="sigma-select">
                                <option value="" selected>All Types</option>
                                <option value="Core">Core</option>
                                <option value="Specialized">Specialized</option>
                                <option value="Applied">Applied</option>
                            </select>
                            <i class="fa-solid fa-chevron-down sigma-select-icon"></i>
                        </div>
                    </div>

                    <!-- Status Dropdown -->
                    <div id="subject-field-status" class="w-[160px] relative">
                        <div class="sigma-select-wrapper">
                            <select id="subject-search-status" aria-label="Filter subjects by status" class="sigma-select">
                                <option value="" selected>All Status</option>
                                <option value="Published">Published</option>
                                <option value="Draft">Draft</option>
                            </select>
                            <i class="fa-solid fa-chevron-down sigma-select-icon"></i>
                        </div>
                    </div>

                    <!-- Filter Configuration Button & Dropdown -->
                    <div class="relative">
                        <button type="button" id="subject-filter-btn"
                            onclick="event.stopPropagation(); const m = document.getElementById('subject-filter-dropdown'); m.classList.toggle('hidden');"
                            class="sigma-filter-config-btn"
                            title="Filter Configuration">
                            <i class="fa-solid fa-sliders text-sm"></i>
                        </button>

                        <div id="subject-filter-dropdown"
                            class="sigma-filter-dropdown hidden">
                            <span class="sigma-filter-dropdown-title">Manage Search Filters</span>
                            <label>
                                <span>Code / Subject</span>
                                <input type="checkbox" id="toggle-filter-subject-search" aria-label="Toggle subject code and title search field" checked
                                    onchange="window.toggleSubjectSearchFilter('subject-field-search', this.checked)">
                            </label>
                            <label>
                                <span>Type</span>
                                <input type="checkbox" id="toggle-filter-subject-type" aria-label="Toggle subject type filter" checked
                                    onchange="window.toggleSubjectSearchFilter('subject-field-type', this.checked)">
                            </label>
                            <label>
                                <span>Status</span>
                                <input type="checkbox" id="toggle-filter-subject-status" aria-label="Toggle subject status filter" checked
                                    onchange="window.toggleSubjectSearchFilter('subject-field-status', this.checked)">
                            </label>
                        </div>
                    </div>

                    <!-- Search Action Button -->
                    <button type="button" id="subject-search-btn" onclick="window.applySubjectSearch(true)"
                        class="sigma-btn sigma-btn-primary sigma-btn-lg min-w-[120px]">
                        <span>Search</span>
                    </button>
                </div>
        </div>

        <!-- Standardized Institutional Table -->
        <div class="flex-1 flex flex-col bg-white px-10">
            <table class="w-full border-collapse table-fixed">
                <colgroup>
                    <col style="width: 6%;">  <!-- No. -->
                    <col style="width: 14%;"> <!-- Code -->
                    <col style="width: 25%;"> <!-- Subject -->
                    <col style="width: 16%;"> <!-- Type -->
                    <col style="width: 10%;"> <!-- Units -->
                    <col style="width: 10%;"> <!-- Status -->
                    <col style="width: 13%;"> <!-- Date Created -->
                    <col style="width: 6%;">  <!-- Action -->
                </colgroup>
                <thead class="sticky top-0 bg-[#15803d] z-10 border-b border-[#166534]">
                    <tr>
                        <th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter'] border-r border-[#166534]">No.</th>
                        <th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter'] border-r border-[#166534]">Code</th>
                        <th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter'] border-r border-[#166534]">Subject</th>
                        <th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter'] border-r border-[#166534]">Type</th>
                        <th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter'] border-r border-[#166534]">Units</th>
                        <th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter'] border-r border-[#166534]">Status</th>
                        <th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter'] border-r border-[#166534]">Date Created</th>
                        <th class="px-4 py-4 text-xs md:text-sm font-semibold text-white tracking-normal text-center font-['Inter']">Action</th>
                    </tr>
                </thead>
                <tbody id="subjectTableBody" class="divide-y divide-slate-100">
                    <!-- Dynamic Subjects will be rendered here -->
                </tbody>
            </table>
            <div id="subject-pagination-container" class="py-6 border-t border-slate-100 flex items-center justify-between bg-white"></div>
        </div>
    </div>
</section>

<!-- SCHOOL SUBJECTS EDIT OVERLAY (Full Screen Workstation) -->
<div id="subject-edit-overlay" class="sigma-modal-overlay hidden">
    <!-- Exit Control (Far Right) -->
    <button type="button" id="subject-modal-exit-btn" onclick="window.handleSubjectExit()"
        class="fixed top-10 right-10 w-12 h-12 rounded-full hover:bg-slate-200 flex items-center justify-center text-black transition-all z-[1001] cursor-pointer"
        title="Exit Editor">
        <i class="fa-solid fa-xmark text-xl"></i>
    </button>

    <div class="sigma-modal-shell">
        <!-- White Panel (Full Height Column) -->
        <div class="sigma-modal-panel">
            <div id="subject-modal-header" class="border-b border-slate-100 sticky top-0 bg-white z-40">
                <div class="px-8 py-4 flex items-center justify-between gap-4">
                    <!-- Left: Back Button & Title -->
                    <div class="flex items-center gap-3 min-w-0">
                        <button type="button" id="subject-header-scope-back-btn" onclick="window.selectCurriculumScope('master', 'Master Syllabus')"
                            title="Back to Master Syllabus"
                            class="hidden w-8 h-8 rounded-full hover:bg-slate-100 active:bg-slate-200 flex items-center justify-center text-black transition-all cursor-pointer -ml-1">
                            <i class="fa-solid fa-arrow-left text-sm text-black"></i>
                        </button>
                        <button type="button" id="subject-back-btn" onclick="window.handleSubjectBack()"
                            title="Back"
                            class="hidden w-8 h-8 rounded-full flex items-center justify-center text-black hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer border-0 p-0 shadow-none outline-none">
                            <i class="fa-solid fa-arrow-left text-sm text-black"></i>
                        </button>
                        <h1 id="subject-editor-title" class="text-xl font-bold text-black tracking-tight font-['Inter'] truncate">Create Subject</h1>
                        <span id="subject-modal-status-badge" class="hidden text-xs font-bold px-2.5 py-0.5 rounded-full font-['Inter'] shrink-0"></span>
                    </div>

                    <!-- Right: Actions (Publish Split Button, Delete, Edit Material) -->
                    <div id="subject-header-actions" class="flex items-center gap-2.5 shrink-0">
                        <!-- Edit Material Button (Shown when viewing material detail) -->
                        <button type="button" id="subject-header-edit-mat-btn" onclick="window.editMaterialFromDetail()" title="Edit Material"
                            class="sigma-btn sigma-btn-primary sigma-btn-md gap-2 px-6 cursor-pointer font-['Inter'] hidden">
                            <i class="fa-solid fa-pen text-xs"></i>
                            <span>Edit Material</span>
                        </button>

                        <!-- Delete Subject Button -->
                        <button type="button" id="subject-delete-btn" onclick="window.deleteSubjectPrompt()" title="Delete Subject"
                            class="w-10 h-10 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all hidden flex items-center justify-center cursor-pointer">
                            <i class="fa-solid fa-trash-can text-sm"></i>
                        </button>

                        <!-- Publish Split Button Group -->
                        <div id="subject-split-btn-group" class="relative inline-flex items-center shadow-xs rounded-xl">
                            <button type="button" id="subject-save-btn" onclick="window.handleSubjectSave('Published')"
                                class="h-10 px-5 rounded-l-xl bg-[#15803d] hover:bg-[#14532d] active:bg-[#0f3d1e] text-white font-bold text-sm flex items-center gap-2 transition-all cursor-pointer border-r border-white/20 font-['Inter'] shadow-xs">
                                <i class="fa-solid fa-circle-notch fa-spin hidden" id="subject-save-loading"></i>
                                <span id="subject-save-btn-text">Publish</span>
                            </button>
                            <button type="button" id="subject-split-dropdown-btn" onclick="window.toggleSubjectSaveDropdown(event)"
                                class="h-10 px-3.5 rounded-r-xl bg-[#15803d] hover:bg-[#14532d] active:bg-[#0f3d1e] text-white flex items-center justify-center transition-all cursor-pointer font-['Inter'] shadow-xs"
                                title="More save options">
                                <i class="fa-solid fa-chevron-down text-xs text-white/90 transition-transform duration-150" id="subject-split-chevron"></i>
                            </button>

                            <!-- Dropdown Menu -->
                            <div id="subject-split-dropdown-menu"
                                class="hidden absolute right-0 top-full mt-2 w-56 bg-emerald-50/95 backdrop-blur-xs rounded-2xl border border-emerald-200/90 shadow-xl z-[260] p-1.5 space-y-0.5 animate-in fade-in zoom-in-95 duration-100 font-['Inter']">
                                <button type="button" id="subject-add-another-btn" onclick="window.publishAndCreateSubject(); window.toggleSubjectSaveDropdown(false)"
                                    class="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-slate-200/70 text-black rounded-xl text-xs font-semibold transition-colors text-left cursor-pointer">
                                    <i class="fa-solid fa-plus text-xs text-black"></i>
                                    <span id="subject-add-another-btn-text">Publish & Create Another</span>
                                </button>
                                <button type="button" id="subject-draft-btn" onclick="window.handleSubjectSave('Draft'); window.toggleSubjectSaveDropdown(false)"
                                    class="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-slate-200/70 text-black rounded-xl text-xs font-semibold transition-colors text-left cursor-pointer">
                                    <i class="fa-regular fa-bookmark text-xs text-black"></i>
                                    <span>Save as Draft</span>
                                    <i class="fa-solid fa-circle-notch fa-spin hidden ml-auto" id="subject-draft-loading"></i>
                                </button>
                                <button type="button" id="subject-split-delete-btn" onclick="window.deleteSubjectPrompt(); window.toggleSubjectSaveDropdown(false)"
                                    class="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-slate-200/70 text-black rounded-xl text-xs font-semibold transition-colors text-left cursor-pointer hidden">
                                    <i class="fa-solid fa-trash-can text-xs text-black"></i>
                                    <span>Delete Subject</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Quiz Storage Top Right Header Actions -->
                    <div id="quiz-storage-header-actions" class="hidden flex items-center gap-2 shrink-0 font-['Inter']">
                        <button type="button" onclick="window.openQuizCreatorTab()" title="Create New Quiz"
                            class="h-9 px-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer font-['Inter'] shadow-2xs">
                            <i class="fa-solid fa-plus text-xs text-black"></i>
                            <span>Create Quiz</span>
                        </button>
                        <button type="button" id="quiz-storage-header-select-btn" onclick="window.confirmSelectedStorageQuiz()" title="Select Quiz" disabled
                            class="h-9 px-4 bg-[#15803d] hover:bg-[#166534] active:bg-[#0f3d1e] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all font-['Inter'] shadow-2xs opacity-50 cursor-not-allowed pointer-events-none">
                            <span>Select Quiz</span>
                        </button>
                    </div>
                </div>
                <!-- Segmented Navigation Header -->
                <div id="subject-segmented-header" class="hidden flex w-full bg-slate-100 border-y border-slate-200 pointer-events-none select-none">
                    <!-- Step 1: Subject -->
                    <div id="subject-step-bar-1"
                        class="flex-1 pt-4 pb-0 flex flex-col items-center justify-between transition-all border-r border-slate-200 bg-[#15803d]/10 pointer-events-none select-none">
                        <span id="subject-step-bar-1-label"
                            class="text-base font-bold capitalize tracking-normal transition-colors text-[#15803d] mb-3">Add Subject</span>
                        <div id="subject-step-bar-1-track"
                            class="w-full h-1.5 bg-[#15803d] transition-all"></div>
                    </div>

                    <!-- Step 2: Topics -->
                    <div id="subject-step-bar-2"
                        class="flex-1 pt-4 pb-0 flex flex-col items-center justify-between transition-all border-r border-slate-200 bg-slate-100 pointer-events-none select-none">
                        <span id="subject-step-bar-2-label"
                            class="text-base font-bold capitalize tracking-normal transition-colors text-slate-500 mb-3">Add Topics & Materials</span>
                        <div id="subject-step-bar-2-track"
                            class="w-full h-1.5 bg-slate-200 transition-all"></div>
                    </div>

                    <!-- Step 3: Materials -->
                    <div id="subject-step-bar-3"
                        class="hidden flex-1 pt-4 pb-0 flex flex-col items-center justify-between transition-all bg-slate-100 pointer-events-none select-none">
                        <span id="subject-step-bar-3-label"
                            class="text-base font-bold capitalize tracking-normal transition-colors text-slate-500 mb-3">Add Material</span>
                        <div id="subject-step-bar-3-track"
                            class="w-full h-1.5 bg-slate-200 transition-all"></div>
                    </div>
                </div>
            </div>

            <!-- Form Body -->
            <div id="subject-edit-form-body" class="flex-1 px-8 sm:px-10 pt-5 pb-10 space-y-6">
                <!-- Step 1: Create Subject -->
                <div id="subject-step-1" class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div class="space-y-3">
                        <label for="edit-subject-code" class="sigma-subject-label text-base font-bold text-black capitalize tracking-normal ml-1">Subject Code <span class="text-red-500">*</span></label>
                        <input type="text" id="edit-subject-code" maxlength="20" placeholder="e.g. PROG-101"
                            oninput="this.value = this.value.replace(/[^a-zA-Z0-9\-]/g, '').toUpperCase(); if (typeof window.checkSubjectFormValidity === 'function') window.checkSubjectFormValidity();"
                            class="sigma-subject-input w-full bg-slate-50 border-b-2 border-slate-300 rounded-none px-4 py-4 text-base font-medium text-black outline-none hover:bg-slate-100 hover:border-slate-400 focus:bg-slate-100 focus:border-black transition-all placeholder:text-black/40 font-['Inter'] shadow-none">
                    </div>

                    <div class="space-y-3">
                        <label for="edit-subject-name" class="sigma-subject-label text-base font-bold text-black capitalize tracking-normal ml-1">Subject Name <span class="text-red-500">*</span></label>
                        <input type="text" id="edit-subject-name" maxlength="50"
                            oninput="this.value = this.value.replace(/[^a-zA-Z0-9\s]/g, ''); if (typeof window.checkSubjectFormValidity === 'function') window.checkSubjectFormValidity();"
                            placeholder="Full Subject Name"
                            class="sigma-subject-input w-full bg-slate-50 border-b-2 border-slate-300 rounded-none px-4 py-4 text-base font-medium text-black outline-none hover:bg-slate-100 hover:border-slate-400 focus:bg-slate-100 focus:border-black transition-all placeholder:text-black/40 font-['Inter'] shadow-none">
                    </div>

                    <div class="grid grid-cols-2 gap-8">
                        <div class="space-y-3">
                            <label for="edit-subject-units" class="sigma-subject-label text-base font-bold text-black capitalize tracking-normal ml-1">Units <span class="text-red-500">*</span></label>
                            <input type="text" id="edit-subject-units" maxlength="2" placeholder="e.g. 3"
                                oninput="this.value = this.value.replace(/[^0-9]/g, ''); if (typeof window.checkSubjectFormValidity === 'function') window.checkSubjectFormValidity();"
                                class="sigma-subject-input w-full bg-slate-50 border-b-2 border-slate-300 rounded-none px-4 py-4 text-base font-medium text-black outline-none hover:bg-slate-100 hover:border-slate-400 focus:bg-slate-100 focus:border-black transition-all placeholder:text-black/40 font-['Inter'] shadow-none">
                        </div>
                        <div class="space-y-3">
                            <label for="edit-subject-type" class="sigma-subject-label text-base font-bold text-black capitalize tracking-normal ml-1">Subject Type <span class="text-red-500">*</span></label>
                            <div class="relative">
                                <select id="edit-subject-type" onchange="window.handleSubjectTypeChange()"
                                    class="sigma-subject-select w-full bg-slate-50 border-b-2 border-slate-300 rounded-none px-4 py-4 text-base font-medium text-black outline-none hover:bg-slate-100 hover:border-slate-400 focus:bg-slate-100 focus:border-black transition-all appearance-none cursor-pointer font-['Inter'] shadow-none">
                                    <option value="Core">Core Subject</option>
                                    <option value="Applied">Applied Subject</option>
                                    <option value="Specialized">Specialized Subject</option>
                                </select>
                                <i class="fa-solid fa-chevron-down absolute right-5 top-1/2 -translate-y-1/2 text-xs text-black pointer-events-none"></i>
                            </div>
                        </div>
                    </div>

                    <div id="edit-subject-strand-container" class="space-y-3 hidden">
                        <label for="edit-subject-strand" class="sigma-subject-label text-base font-bold text-black capitalize tracking-normal ml-1">Strand Requirement <span class="text-red-500">*</span></label>
                        <div class="relative">
                            <select id="edit-subject-strand" onchange="if (typeof window.checkSubjectFormValidity === 'function') window.checkSubjectFormValidity();"
                                class="sigma-subject-select w-full bg-slate-50 border-b-2 border-slate-300 rounded-none px-4 py-4 text-base font-medium text-black outline-none hover:bg-slate-100 hover:border-slate-400 focus:bg-slate-100 focus:border-black transition-all appearance-none cursor-pointer font-['Inter'] shadow-none">
                                <option value="ABM">ABM (Accountancy, Business, and Management)</option>
                                <option value="HUMSS">HUMSS (Humanities and Social Sciences)</option>
                                <option value="GAS">GAS (General Academic Strand)</option>
                                <option value="ICT">ICT (Information and Communications Technology)</option>
                                <option value="HE">HE (Home Economics)</option>
                            </select>
                            <i class="fa-solid fa-chevron-down absolute right-5 top-1/2 -translate-y-1/2 text-xs text-black pointer-events-none"></i>
                        </div>
                    </div>

                    <!-- Active Semester & Quarters Checkboxes -->
                    <div class="space-y-3">
                        <div class="flex items-center justify-between ml-1">
                            <span class="text-base font-bold text-black capitalize tracking-normal">Active Semester & Quarters <span class="text-red-500">*</span></span>
                            <span class="text-xs font-medium text-black-fade">Select the active semesters for this subject</span>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <label class="flex items-center gap-3.5 p-3.5 rounded-2xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 hover:border-slate-300 transition-all select-none">
                                <input type="checkbox" name="edit-subject-semester" id="edit-subject-sem1" aria-label="First Semester" value="sem1"
                                    onchange="if (typeof window.handleActiveQuartersChange === 'function') window.handleActiveQuartersChange(); if (typeof window.checkSubjectDraftStatus === 'function') window.checkSubjectDraftStatus(); if (typeof window.checkSubjectFormValidity === 'function') window.checkSubjectFormValidity();"
                                    class="w-4 h-4 rounded text-[#15803d] focus:ring-[#15803d] cursor-pointer accent-[#15803d]" />
                                <div class="flex flex-col">
                                    <span class="text-sm font-bold text-black">1st Semester</span>
                                    <span class="text-xs font-medium text-black-fade">1st Quarter & 2nd Quarter</span>
                                </div>
                            </label>
                            <label class="flex items-center gap-3.5 p-3.5 rounded-2xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 hover:border-slate-300 transition-all select-none">
                                <input type="checkbox" name="edit-subject-semester" id="edit-subject-sem2" aria-label="Second Semester" value="sem2"
                                    onchange="if (typeof window.handleActiveQuartersChange === 'function') window.handleActiveQuartersChange(); if (typeof window.checkSubjectDraftStatus === 'function') window.checkSubjectDraftStatus(); if (typeof window.checkSubjectFormValidity === 'function') window.checkSubjectFormValidity();"
                                    class="w-4 h-4 rounded text-[#15803d] focus:ring-[#15803d] cursor-pointer accent-[#15803d]" />
                                <div class="flex flex-col">
                                    <span class="text-sm font-bold text-black">2nd Semester</span>
                                    <span class="text-xs font-medium text-black-fade">3rd Quarter & 4th Quarter</span>
                                </div>
                            </label>
                        </div>
                    </div>

                    <!-- Bottom Action / Next Button -->
                    <div class="pt-6 border-t border-slate-100 flex items-center justify-end">
                        <button type="button" id="subject-step1-next-btn" onclick="window.handleSubjectNext()"
                            class="subject-next-btn sigma-btn sigma-btn-primary sigma-btn-md gap-2 px-6 cursor-pointer font-['Inter']">
                            <span>Next</span>
                            <i class="fa-solid fa-arrow-right text-xs"></i>
                        </button>
                    </div>
                </div>

                <!-- Step 2: Create Topics -->
                <div id="subject-step-2" class="space-y-5 hidden">
                    <!-- Main Topics List View -->
                    <div id="subject-topics-main-view" class="space-y-5">
                        <div class="mb-1 hidden">
                            <!-- Header Title & Subtitle -->
                            <div>
                                <div class="flex items-center gap-2">
                                    <h3 id="subject-step-2-title" class="text-lg font-bold text-black tracking-tight font-['Inter']">Add Topics</h3>
                                </div>
                                <p id="subject-step-2-subtitle" class="text-xs font-medium text-black-fade truncate">Add and organize subject topics</p>
                            </div>
                        </div>

                        <!-- Topics Quarter Pill Tabs with Add Topic on the right and Scope Button beside pills -->
                        <div id="subject-topics-quarter-bar" class="flex items-center justify-between gap-3 pb-1 border-b border-slate-100 flex-wrap">
                            <div class="flex items-center gap-2.5 flex-wrap">
                                <div id="subject-topics-quarter-pills" class="flex gap-1 bg-slate-100 rounded-xl p-1">
                                    <!-- Dynamically rendered -->
                                </div>

                                <!-- Scope Selector Button (Admin Only) beside quarter pills -->
                                <div id="subject-topic-scope-container" class="hidden shrink-0 flex items-center">
                                    <button type="button" onclick="window.openCurriculumScopePicker()"
                                        class="h-9 px-3.5 bg-white hover:bg-slate-100 active:bg-slate-200 border border-slate-200 hover:border-slate-300 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer font-['Inter'] group shadow-2xs w-auto">
                                        <i class="fa-solid fa-users-viewfinder text-xs text-amber-600 transition-colors shrink-0"></i>
                                        <span id="subject-topic-scope-label" class="text-xs font-semibold text-black whitespace-nowrap overflow-hidden text-ellipsis">View Scope</span>
                                    </button>
                                </div>
                            </div>
                            <div class="flex items-center shrink-0">
                                <button type="button" id="subject-add-topic-header-btn" onclick="window.addSubjectTopic()"
                                    class="h-9 px-3.5 bg-white hover:bg-slate-100 active:bg-slate-200 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-black flex items-center gap-2 transition-all cursor-pointer font-['Inter'] shadow-2xs">
                                    <i class="fa-solid fa-plus text-xs text-black"></i>
                                    <span>Add Topic</span>
                                </button>
                            </div>
                        </div>

                        <!-- Topics List Container -->
                        <div id="subject-topics-list" class="space-y-4">
                            <!-- Dynamic Topics go here -->
                        </div>

                        <!-- Add Another Topic Dashed Button -->
                        <div id="subject-topics-add-another-container" class="pt-2 hidden">
                            <button type="button" onclick="window.addSubjectTopic()"
                                class="sigma-add-topic-dashed-btn w-full py-4 rounded-2xl text-sm font-bold capitalize transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 group">
                                <i class="fa-solid fa-plus text-xs"></i>
                                <span>Add Another Topic</span>
                            </button>
                        </div>

                        <!-- Empty State for Topics -->
                        <div id="subject-topics-empty"
                            class="flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-[32px] border-2 border-dashed border-slate-200">
                            <i class="fa-solid fa-layer-group text-5xl mb-4 text-black-fade"></i>
                            <p class="text-sm font-bold text-black font-['Inter']">No Topics Added Yet</p>
                        </div>

                        <!-- Bottom Action / Next Button -->
                        <div class="pt-6 border-t border-slate-100 flex items-center justify-end">
                            <button type="button" id="subject-step2-next-btn" onclick="window.handleSubjectNext()"
                                class="subject-next-btn sigma-btn sigma-btn-primary sigma-btn-md gap-2 px-6 cursor-pointer font-['Inter']">
                                <span>Next</span>
                                <i class="fa-solid fa-arrow-right text-xs"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Dedicated Topic Editor View (Header is hidden when this is open) -->
                    <div id="subject-topic-editor-view" class="hidden space-y-10">
                        <!-- Dynamic Topic Editor injected here -->
                    </div>
                </div>

                <!-- Step 3: Add Materials -->
                <div id="subject-step-3" class="space-y-5 hidden">
                    <div id="subject-materials-main-view" class="space-y-5">
                        <div class="mb-1 hidden">
                            <!-- Header Title & Subtitle -->
                            <div>
                                <div class="flex items-center gap-2">
                                    <h3 id="subject-step-3-title" class="text-lg font-bold text-black tracking-tight font-['Inter']">Add Materials</h3>
                                </div>
                                <p id="subject-step-3-subtitle" class="text-xs font-medium text-black-fade truncate">Add and organize subject content</p>
                            </div>
                        </div>

                        <!-- Materials Quarter Pill Tabs with Scope Button beside it, and Add Material dropdown on the right -->
                        <div id="subject-materials-quarter-bar" class="flex items-center justify-between gap-3 pb-1 border-b border-slate-100 flex-wrap">
                            <div class="flex items-center gap-2.5 flex-wrap">
                                <div id="subject-materials-quarter-pills" class="flex gap-1 bg-slate-100 rounded-xl p-1">
                                    <!-- Dynamically rendered -->
                                </div>

                                <!-- Scope Selector Button (Admin Only) beside quarter pills -->
                                <div id="subject-material-scope-container" class="hidden shrink-0 flex items-center">
                                    <button type="button" onclick="window.openCurriculumScopePicker()"
                                        class="h-9 px-3.5 bg-white hover:bg-slate-100 active:bg-slate-200 border border-slate-200 hover:border-slate-300 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer font-['Inter'] group shadow-2xs w-auto">
                                        <i class="fa-solid fa-users-viewfinder text-xs text-amber-600 transition-colors shrink-0"></i>
                                        <span id="subject-material-scope-label" class="text-xs font-semibold text-black whitespace-nowrap overflow-hidden text-ellipsis">View Scope</span>
                                    </button>
                                </div>
                            </div>
                            <!-- Add Material Dropdown on the Right of Quarter Bar -->
                            <div class="relative shrink-0 flex items-center justify-end gap-2">
                                <button type="button" id="subject-content-reorder-btn" onclick="window.openTopicOrderPanel()"
                                    class="hidden h-9 px-3.5 bg-white hover:bg-slate-100 active:bg-slate-200 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-black flex items-center gap-2 transition-all cursor-pointer font-['Inter'] shadow-2xs">
                                    <i class="fa-solid fa-arrow-down-up text-xs text-black"></i>
                                    <span>Reorder</span>
                                </button>
                                <button type="button" id="subject-content-add-topic-btn" onclick="window.addSubjectTopic()"
                                    class="hidden h-9 px-3.5 bg-white hover:bg-slate-100 active:bg-slate-200 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-black flex items-center gap-2 transition-all cursor-pointer font-['Inter'] shadow-2xs">
                                    <i class="fa-solid fa-plus text-xs text-black"></i>
                                    <span>Add Topic</span>
                                </button>
                                <button id="add-material-trigger" type="button"
                                    onclick="window.toggleMaterialDropdown(event)"
                                    class="h-9 px-3.5 bg-white hover:bg-slate-100 active:bg-slate-200 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-black flex items-center gap-2 transition-all cursor-pointer font-['Inter'] shadow-2xs">
                                    <i class="fa-solid fa-plus text-xs text-black transition-transform duration-200"></i>
                                    <span>Add Material</span>
                                </button>

                                    <!-- Dropdown Menu (Popup with border lines & icons) -->
                                    <div id="add-material-dropdown"
                                        class="absolute right-0 top-full mt-3 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl hidden z-[50] max-h-[32rem] overflow-y-auto p-2 font-['Inter']">
                                        
                                        <!-- Category 1: Learning Materials -->
                                        <div class="px-3 pt-2 pb-1 text-xs font-bold text-black capitalize tracking-normal">
                                            Learning Materials
                                        </div>
                                        <button type="button" onclick="window.addSubjectMaterial('Video')"
                                            class="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 rounded-xl transition-all text-left cursor-pointer group">
                                            <div class="w-8 h-8 rounded-lg bg-red-50 group-hover:bg-red-100/70 border border-red-100 flex items-center justify-center shrink-0 transition-colors">
                                                <i class="fa-solid fa-circle-play text-red-600 text-sm"></i>
                                            </div>
                                            <div>
                                                <span class="text-xs font-bold text-black block">Add Video</span>
                                                <span class="text-[10px] text-black-fade font-medium block">MP4 or YouTube link</span>
                                            </div>
                                        </button>
                                        <button type="button" onclick="window.addSubjectMaterial('Lesson')"
                                            class="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 rounded-xl transition-all text-left cursor-pointer group">
                                            <div class="w-8 h-8 rounded-lg bg-blue-50 group-hover:bg-blue-100/70 border border-blue-100 flex items-center justify-center shrink-0 transition-colors">
                                                <i class="fa-solid fa-file-lines text-blue-600 text-sm"></i>
                                            </div>
                                            <div>
                                                <span class="text-xs font-bold text-black block">Add Lesson</span>
                                                <span class="text-[10px] text-black-fade font-medium block">PDF, DOCX, presentation</span>
                                            </div>
                                        </button>

                                        <!-- Border Line Divider -->
                                        <div class="h-px bg-slate-100 my-1.5 mx-2"></div>

                                        <!-- Category 2: Assessment Materials -->
                                        <div class="px-3 pt-1 pb-1 text-xs font-bold text-black capitalize tracking-normal">
                                            Assessment Materials
                                        </div>
                                        <button type="button" onclick="window.addSubjectMaterial('Quiz')"
                                            class="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 rounded-xl transition-all text-left cursor-pointer group">
                                            <div class="w-8 h-8 rounded-lg bg-emerald-50 group-hover:bg-emerald-100/70 border border-emerald-100 flex items-center justify-center shrink-0 transition-colors">
                                                <i class="fa-solid fa-stopwatch text-emerald-600 text-sm"></i>
                                            </div>
                                            <div>
                                                <span class="text-xs font-bold text-black block">Add Quiz</span>
                                                <span class="text-[10px] text-black-fade font-medium block">Questions</span>
                                            </div>
                                        </button>
                                        <button type="button" onclick="window.addSubjectMaterial('Task')"
                                            class="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 rounded-xl transition-all text-left cursor-pointer group">
                                            <div class="w-8 h-8 rounded-lg bg-amber-50 group-hover:bg-amber-100/70 border border-amber-100 flex items-center justify-center shrink-0 transition-colors">
                                                <i class="fa-solid fa-clipboard-list text-amber-600 text-sm"></i>
                                            </div>
                                            <div>
                                                <span class="text-xs font-bold text-black block">Add Task</span>
                                                <span class="text-[10px] text-black-fade font-medium block">Documents, worksheets & files</span>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            </div>

                        <!-- Materials Topic Sections Container -->
                        <div id="subject-materials-grid" class="space-y-6">
                            <!-- Dynamic Topic Sections with Materials rendered here -->
                        </div>

                        <!-- Empty State for Materials -->
                        <div id="subject-materials-empty"
                            class="flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-[40px] border-2 border-dashed border-slate-200">
                            <i class="fa-solid fa-folder-open text-5xl mb-4 text-black-fade"></i>
                            <p class="text-sm font-bold text-black font-['Inter']">No Materials Added Yet</p>
                        </div>
                    </div>

                    <!-- Material Editor View (Dedicated Workspace) -->
                    <div id="subject-material-editor-view" class="hidden">
                        <!-- Content injected dynamically via JS -->
                    </div>

                    <!-- Material Paper Detail View (Page Preview with Instructions & Attached File) -->
                    <div id="subject-material-detail-view" class="hidden">
                        <!-- Content injected dynamically via JS -->
                    </div>
                </div>
            </div>

            <!-- Final Action Footer (Visible only during inner sub-editors: Topic Editor, Material Editor, Quiz Storage) -->
            <div id="subject-global-footer" class="hidden px-8 py-3 bg-white border-t border-slate-100 flex items-center justify-between sticky bottom-0 z-30 font-['Inter']">
                <div class="flex items-center gap-2">
                    <button type="button" id="topic-editor-back-btn" onclick="window.handleTopicEditorBack()"
                        class="h-9 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold hidden items-center gap-1.5 transition-all cursor-pointer">
                        <i class="fa-solid fa-arrow-left text-xs"></i>
                        <span>Back</span>
                    </button>
                    <button type="button" id="mat-editor-back-btn" onclick="window.cancelMaterialEditor()"
                        class="h-9 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold hidden items-center gap-1.5 transition-all cursor-pointer">
                        <i class="fa-solid fa-arrow-left text-xs"></i>
                        <span>Back</span>
                    </button>
                    <button type="button" id="mat-detail-back-btn" onclick="window.closeSubjectMaterialDetail()"
                        class="h-9 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold hidden items-center gap-1.5 transition-all cursor-pointer">
                        <i class="fa-solid fa-arrow-left text-xs"></i>
                    </button>
                </div>

                <div class="flex items-center gap-2">
                    <button type="button" id="mat-detail-edit-btn" onclick="window.editMaterialFromDetail()"
                        class="h-9 px-4 bg-[#FFD000] hover:bg-[#e6bc00] text-black font-bold text-xs rounded-xl hidden flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs">
                        <i class="fa-solid fa-pen text-xs"></i>
                        <span>Edit Material</span>
                    </button>

                    <!-- Topic Editor specific buttons (Pinned at bottom) -->
                    <button type="button" id="topic-editor-add-another-btn" onclick="window.saveAndAddAnotherTopic()"
                        class="h-9 px-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-bold hidden flex items-center gap-1.5 cursor-pointer shadow-2xs">
                        <i class="fa-solid fa-plus text-xs"></i>
                        <span>Save & Add Another Topic</span>
                    </button>
                    <button type="button" id="topic-editor-save-btn" onclick="window.saveTopicFromEditor()"
                        class="h-9 px-4 bg-[#15803d] hover:bg-[#166534] text-white rounded-xl text-xs font-bold hidden cursor-pointer shadow-2xs flex items-center justify-center gap-1.5">
                        <span id="topic-editor-save-btn-text">Save Topic</span>
                    </button>

                    <!-- Material Editor specific buttons (Pinned at bottom) -->
                    <button type="button" id="mat-editor-add-another-btn" onclick="window.saveAndAddAnotherMaterial()"
                        class="h-9 px-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-bold hidden flex items-center gap-1.5 cursor-pointer shadow-2xs">
                        <i class="fa-solid fa-plus text-xs"></i>
                        <span id="mat-editor-add-another-btn-text">Save & Add Lesson</span>
                    </button>
                    <button type="button" id="mat-editor-delete-btn" onclick="window.deleteCurrentEditingMaterial()"
                        class="h-9 px-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold hidden cursor-pointer flex items-center gap-1.5 transition-colors">
                        <i class="fa-solid fa-trash-can text-xs"></i>
                        <span>Delete Material</span>
                    </button>
                    <button type="button" id="mat-editor-save-btn" onclick="window.performSaveMaterial()"
                        class="h-9 px-4 bg-[#15803d] hover:bg-[#166534] text-white rounded-xl text-xs font-bold hidden cursor-pointer shadow-2xs flex items-center justify-center gap-1.5">
                        <span id="mat-editor-save-btn-text">Add Material</span>
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- SUBJECT ACTION CONFIRMATION OVERLAY -->
<div id="subject-confirm-overlay"
    class="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[2000] hidden flex items-center justify-center p-4 font-['Inter']">
    <div
        class="bg-white rounded-[32px] border border-slate-200 shadow-2xl w-full max-w-sm p-8 animate-in zoom-in-95 duration-200">
        <div class="text-center space-y-4">
            <div
                class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-black border border-slate-100">
                <i class="fa-solid fa-book-open text-2xl"></i>
            </div>
            <h3 id="subject-confirm-title" class="text-xl font-bold text-black leading-tight font-['Inter']">Confirmation Title</h3>
            <p id="subject-confirm-desc" class="text-sm font-medium text-black/70 px-4 leading-relaxed font-['Inter']">
                Explanation text goes here.</p>
        </div>
        <div class="grid grid-cols-2 gap-3 mt-8">
            <button id="subject-confirm-cancel"
                class="py-3.5 bg-slate-100 text-black rounded-2xl text-sm font-bold capitalize tracking-normal hover:bg-slate-200 transition-all cursor-pointer font-['Inter'] shadow-none">Cancel</button>
            <button id="subject-confirm-proceed"
                class="py-3.5 bg-[#15803d] text-white rounded-2xl text-sm font-bold capitalize tracking-normal hover:bg-[#166534] transition-all cursor-pointer font-['Inter'] shadow-none">Proceed</button>
        </div>
    </div>
</div>

<!-- SUBJECT QUIZ PREVIEW MODAL (Full Standard Sigma Modal matching Quiz Creator Student Preview) -->
<div id="subject-quiz-viewer-modal" class="sigma-modal-overlay hidden z-[3500]">
    <!-- Exit Control (Far Right) -->
    <button type="button" onclick="window.closeSubjectQuizViewerModal()"
        class="fixed top-10 right-10 w-12 h-12 rounded-full hover:bg-slate-200 flex items-center justify-center text-black transition-all z-[1001] cursor-pointer"
        title="Exit Preview">
        <i class="fa-solid fa-xmark text-xl"></i>
    </button>

    <div class="sigma-modal-shell">
        <!-- White Panel (Full Height Column) -->
        <div class="sigma-modal-panel">
            <!-- Header (Quiz File Name Only) -->
            <div class="border-b border-slate-100 sticky top-0 bg-white z-20">
                <div class="px-8 sm:px-10 pt-8 pb-4 flex items-center justify-between gap-4 flex-wrap">
                    <h1 id="subject-quiz-viewer-title" class="text-2xl font-bold text-black tracking-tight font-['Inter']">Quiz Document</h1>
                </div>
            </div>

            <!-- Subheader: Question Counter & Number Pills -->
            <div class="border-b border-slate-100 bg-white z-10 px-8 sm:px-12 py-3.5 flex items-center justify-between gap-4 flex-wrap">
                <div class="text-sm font-semibold text-black-fade font-['Inter']" id="subject-quiz-viewer-meta">
                    <span id="subject-quiz-viewer-counter">Question 1 of 1</span>
                    <span>•</span>
                    <span id="subject-quiz-viewer-pts">0 Points</span>
                </div>
                <div class="flex items-center gap-2">
                    <button type="button" onclick="window.navSubjectQuizViewer(-1)" id="subject-quiz-viewer-nav-prev"
                        class="w-8 h-8 rounded-xl flex items-center justify-center text-black hover:bg-slate-100 transition-colors cursor-pointer shrink-0" title="Previous Question">
                        <i class="fa-solid fa-chevron-left text-xs"></i>
                    </button>
                    <div id="subject-quiz-viewer-pills" class="flex items-center gap-1.5 flex-wrap">
                        <!-- Number pills dynamically injected -->
                    </div>
                    <button type="button" onclick="window.navSubjectQuizViewer(1)" id="subject-quiz-viewer-nav-next"
                        class="w-8 h-8 rounded-xl flex items-center justify-center text-black hover:bg-slate-100 transition-colors cursor-pointer shrink-0" title="Next Question">
                        <i class="fa-solid fa-chevron-right text-xs"></i>
                    </button>
                </div>
            </div>

            <!-- Assessment Body (Vertically & Horizontally Centered Question Area) -->
            <div class="flex-1 px-8 sm:px-12 py-8 overflow-y-auto flex flex-col justify-center">
                <div id="subject-quiz-viewer-body" class="w-full max-w-3xl mx-auto space-y-6 my-auto">
                    <!-- Rendered Question & Choice Buttons matching Image 2 -->
                </div>
            </div>

            <!-- Sticky Footer -->
            <div class="sigma-modal-footer">
                <button type="button" id="subject-quiz-viewer-prev-btn" onclick="window.navSubjectQuizViewer(-1)"
                    class="sigma-btn sigma-btn-primary sigma-btn-md flex items-center gap-2 cursor-pointer">
                    <i class="fa-solid fa-arrow-left text-xs"></i>
                    <span>Previous</span>
                </button>
                <button type="button" id="subject-quiz-viewer-next-btn" onclick="window.navSubjectQuizViewer(1)"
                    class="sigma-btn sigma-btn-primary sigma-btn-md flex items-center gap-2 cursor-pointer">
                    <span>Next</span>
                    <i class="fa-solid fa-arrow-right text-xs"></i>
                </button>
            </div>
        </div>
    </div>
</div>
