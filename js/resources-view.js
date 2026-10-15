/**
 * SIGMA ELMS - Unified Learning Resources View
 * Shared across Teacher, Student, and Admin portals.
 * Modern Subject & Classroom Shelf with Cloud Workspace Controls.
 */
(function () {
    'use strict';

    const STORAGE_KEY = 'sigma-shared-resources-v2';

    // Default seed resources if storage is empty
    const DEFAULT_RESOURCES = [
        {
            id: 'res-1',
            title: 'Module 1 - Java OOP & Inheritance Fundamentals.pdf',
            subject: 'Computer Programming 1',
            subjectCode: 'PROG1',
            type: 'pdf',
            category: 'Handout',
            quarter: '1st Quarter',
            size: '4.8 MB',
            date: 'Oct 12, 2026',
            sharedWithStudents: true,
            downloads: 45,
            description: 'Classes, Objects, Inheritance & Polymorphism foundational theory and code examples.'
        },
        {
            id: 'res-2',
            title: 'Lecture 3 - Responsive Layouts with CSS Grid & Flexbox.pptx',
            subject: 'Web Development',
            subjectCode: 'WEBDEV',
            type: 'pptx',
            category: 'Lecture Slides',
            quarter: '1st Quarter',
            size: '12.3 MB',
            date: 'Oct 10, 2026',
            sharedWithStudents: true,
            downloads: 62,
            description: 'Class presentation slide deck used during hands-on web design lecture.'
        },
        {
            id: 'res-3',
            title: 'Lab-Starter-Code-Database-Schema.zip',
            subject: 'Database Management',
            subjectCode: 'DBMS',
            type: 'zip',
            category: 'Lab Activity',
            quarter: '1st Quarter',
            size: '2.1 MB',
            date: 'Oct 08, 2026',
            sharedWithStudents: true,
            downloads: 38,
            description: 'Source SQL scripts, starter tables, and test datasets for Activity 2.'
        },
        {
            id: 'res-4',
            title: 'DepEd Senior High School Curriculum Guide - ICT Strand.pdf',
            subject: 'General Institutional',
            subjectCode: 'DEPED',
            type: 'pdf',
            category: 'Syllabus',
            quarter: 'All Quarters',
            size: '3.6 MB',
            date: 'Oct 05, 2026',
            sharedWithStudents: false,
            downloads: 14,
            description: 'Institutional course competencies, learning standards, and term objectives.'
        },
        {
            id: 'res-5',
            title: 'Capstone Laboratory Rubrics & Defense Criteria.docx',
            subject: 'Computer Programming 1',
            subjectCode: 'PROG1',
            type: 'docx',
            category: 'Rubrics',
            quarter: '1st Quarter',
            size: '850 KB',
            date: 'Oct 04, 2026',
            sharedWithStudents: true,
            downloads: 29,
            description: 'Scoring guidelines for project proposals and coding architecture defense.'
        },
        {
            id: 'res-6',
            title: 'Walkthrough - DOM Events & JavaScript Fetch API.mp4',
            subject: 'Web Development',
            subjectCode: 'WEBDEV',
            type: 'video',
            category: 'Lecture Slides',
            quarter: '1st Quarter',
            size: '42.5 MB',
            date: 'Oct 02, 2026',
            sharedWithStudents: true,
            downloads: 78,
            description: 'Screen recording walkthrough demonstrating async API handling in browser.'
        }
    ];

    // Internal State
    let _activeSubjectFilter = 'all';
    let _activeQuarterFilter = 'all';
    let _activeTypeFilter = 'all';
    let _searchQuery = '';
    let _currentViewMode = 'grid'; // 'grid' | 'table'

    function getStoredResources() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (_) {}
        // Initialize default seed
        saveResources(DEFAULT_RESOURCES);
        return DEFAULT_RESOURCES.slice();
    }

    function saveResources(list) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        } catch (_) {}
    }

    function getFileTypeDetails(type) {
        const t = String(type || '').toLowerCase();
        if (t.includes('pdf')) {
            return {
                label: 'PDF',
                icon: '<svg class="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>',
                bg: 'bg-rose-50 text-rose-700 border-rose-200/60'
            };
        }
        if (t.includes('ppt') || t.includes('slide')) {
            return {
                label: 'PPT',
                icon: '<svg class="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 13v-1m4 1v-3m4 3V8M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path></svg>',
                bg: 'bg-amber-50 text-amber-700 border-amber-200/60'
            };
        }
        if (t.includes('zip') || t.includes('code') || t.includes('rar')) {
            return {
                label: 'ZIP',
                icon: '<svg class="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>',
                bg: 'bg-indigo-50 text-indigo-700 border-indigo-200/60'
            };
        }
        if (t.includes('video') || t.includes('mp4')) {
            return {
                label: 'VIDEO',
                icon: '<svg class="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>',
                bg: 'bg-teal-50 text-teal-700 border-teal-200/60'
            };
        }
        return {
            label: 'DOC',
            icon: '<svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>',
            bg: 'bg-blue-50 text-blue-700 border-blue-200/60'
        };
    }

    function renderResourcesView() {
        const section = document.getElementById('resources-view');
        if (!section) return;
        const isAdminResourcesView = section.hasAttribute('data-admin-resource-view');

        section.removeAttribute('data-sigma-skeleton-active');
        if (typeof window.SigmaPageLoading?.hideContentSkeleton === 'function') {
            window.SigmaPageLoading.hideContentSkeleton(section);
        }
        section.querySelectorAll('.sigma-content-skeleton').forEach(el => el.remove());

        const allResources = getStoredResources();

        // Extract unique subjects
        const subjectsMap = new Map();
        allResources.forEach(r => {
            if (r.subject) {
                subjectsMap.set(r.subject, (subjectsMap.get(r.subject) || 0) + 1);
            }
        });

        // Filter Resources
        const qLower = _searchQuery.toLowerCase().trim();
        const filtered = allResources.filter(r => {
            if (_activeSubjectFilter !== 'all' && r.subject !== _activeSubjectFilter) return false;
            if (_activeQuarterFilter !== 'all' && r.quarter !== _activeQuarterFilter && r.quarter !== 'All Quarters') return false;
            if (_activeTypeFilter !== 'all') {
                const t = String(r.type || '').toLowerCase();
                if (_activeTypeFilter === 'pdf' && !t.includes('pdf')) return false;
                if (_activeTypeFilter === 'pptx' && !t.includes('ppt')) return false;
                if (_activeTypeFilter === 'zip' && !t.includes('zip') && !t.includes('code')) return false;
                if (_activeTypeFilter === 'video' && !t.includes('video') && !t.includes('mp4')) return false;
                if (_activeTypeFilter === 'docx' && !t.includes('doc')) return false;
            }
            if (qLower) {
                const title = String(r.title || '').toLowerCase();
                const subj = String(r.subject || '').toLowerCase();
                const desc = String(r.description || '').toLowerCase();
                const cat = String(r.category || '').toLowerCase();
                if (!title.includes(qLower) && !subj.includes(qLower) && !desc.includes(qLower) && !cat.includes(qLower)) return false;
            }
            return true;
        });

        // Group by subject for Shelf Grid view
        const groupedBySubject = {};
        filtered.forEach(item => {
            const groupKey = item.subject || 'General Resources';
            if (!groupedBySubject[groupKey]) groupedBySubject[groupKey] = [];
            groupedBySubject[groupKey].push(item);
        });

        section.innerHTML = `
        <div class="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 font-['Inter']">
            <!-- 1. Header Toolbar -->
            <div class="bg-white border border-slate-200/80 ${isAdminResourcesView ? 'rounded-2xl p-3' : 'rounded-3xl p-6'} shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                ${isAdminResourcesView ? `
                    <span class="text-xs font-semibold text-slate-500">${allResources.length} resources</span>
                ` : `
                    <div>
                        <div class="flex items-center gap-2.5">
                            <h2 class="text-xl font-bold text-slate-900 tracking-tight">Learning Resources & Course Shelves</h2>
                            <span class="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-xs font-bold">${allResources.length} Total</span>
                        </div>
                        <p class="text-xs text-slate-500 mt-1">Manage syllabus guides, lecture slides, code starters, and worksheets shared across your classes.</p>
                    </div>
                `}
                
                <!-- Action Controls -->
                <div class="flex flex-wrap items-center gap-3">
                    <!-- Search Input -->
                    ${isAdminResourcesView ? `
                        <form id="resource-search-form" role="search" class="relative w-full min-w-0 sm:w-64">
                            <input type="search" id="resource-search-input" aria-label="Search resources" value="${escapeHtml(_searchQuery)}" placeholder="Search resources..." class="w-full box-border !pl-3 !pr-11 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600 focus:bg-white transition-all">
                            <button type="submit" aria-label="Search resources" title="Search resources" class="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-emerald-700 transition-colors">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                            </button>
                        </form>
                    ` : `
                        <div class="relative w-48 sm:w-64">
                            <svg class="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                            <input type="text" id="resource-search-input" aria-label="Search resources" value="${escapeHtml(_searchQuery)}" placeholder="Search resources..." class="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-600 focus:bg-white transition-all">
                        </div>
                    `}

                    <!-- View Toggle -->
                    <div class="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 shrink-0">
                        <button type="button" id="btn-view-grid" aria-label="Grid view" title="Card Shelf View" class="w-8 h-8 rounded-lg ${isAdminResourcesView ? (_currentViewMode === 'grid' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-900 hover:bg-white hover:shadow-xs') : (_currentViewMode === 'grid' ? 'bg-white shadow-xs text-emerald-700' : 'text-slate-400 hover:text-slate-700')} text-xs flex items-center justify-center transition-all cursor-pointer">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
                        </button>
                        <button type="button" id="btn-view-table" aria-label="List view" title="List View" class="w-8 h-8 rounded-lg ${isAdminResourcesView ? (_currentViewMode === 'table' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-900 hover:bg-white hover:shadow-xs') : (_currentViewMode === 'table' ? 'bg-white shadow-xs text-emerald-700' : 'text-slate-400 hover:text-slate-700')} text-xs flex items-center justify-center transition-all cursor-pointer">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                        </button>
                    </div>

                    ${isAdminResourcesView ? `
                        <button type="button" data-manage-materials class="md:w-[9.5rem] md:h-8 md:justify-center whitespace-nowrap bg-[#15803d] hover:bg-[#166534] text-white font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                            <span>Manage Materials</span>
                        </button>
                    ` : `
                        <!-- Upload Button -->
                        <button type="button" id="btn-open-upload" class="bg-[#15803d] hover:bg-[#166534] text-white font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                            <span>Upload Resource</span>
                        </button>
                    `}
                </div>
            </div>

            <!-- 2. Filter Pills Row -->
            <div class="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
                <!-- Subject Pills -->
                <div class="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 max-w-full">
                    <span class="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Subject:</span>
                    <button type="button" class="subject-filter-btn px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${_activeSubjectFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'}" data-subject="all">
                        All Subjects (${allResources.length})
                    </button>
                    ${Array.from(subjectsMap.entries()).map(([subj, count]) => `
                        <button type="button" class="subject-filter-btn px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${_activeSubjectFilter === subj ? 'bg-slate-900 text-white' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'}" data-subject="${escapeHtml(subj)}">
                            ${escapeHtml(subj)} (${count})
                        </button>
                    `).join('')}
                </div>

                <!-- Secondary Filters: Quarter & Type -->
                <div class="flex items-center gap-2 ml-auto">
                    <select id="quarter-filter-select" class="bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 py-1.5 text-slate-700 focus:outline-none focus:border-emerald-600 font-medium">
                        <option value="all" ${_activeQuarterFilter === 'all' ? 'selected' : ''}>All Quarters</option>
                        <option value="1st Quarter" ${_activeQuarterFilter === '1st Quarter' ? 'selected' : ''}>1st Quarter</option>
                        <option value="2nd Quarter" ${_activeQuarterFilter === '2nd Quarter' ? 'selected' : ''}>2nd Quarter</option>
                        <option value="3rd Quarter" ${_activeQuarterFilter === '3rd Quarter' ? 'selected' : ''}>3rd Quarter</option>
                        <option value="4th Quarter" ${_activeQuarterFilter === '4th Quarter' ? 'selected' : ''}>4th Quarter</option>
                    </select>

                    <select id="type-filter-select" class="bg-slate-50 border border-slate-200 text-xs rounded-xl px-3 py-1.5 text-slate-700 focus:outline-none focus:border-emerald-600 font-medium">
                        <option value="all" ${_activeTypeFilter === 'all' ? 'selected' : ''}>All File Types</option>
                        <option value="pdf" ${_activeTypeFilter === 'pdf' ? 'selected' : ''}>PDF Documents</option>
                        <option value="pptx" ${_activeTypeFilter === 'pptx' ? 'selected' : ''}>Slide Decks (PPTX)</option>
                        <option value="zip" ${_activeTypeFilter === 'zip' ? 'selected' : ''}>Code / Lab ZIP</option>
                        <option value="docx" ${_activeTypeFilter === 'docx' ? 'selected' : ''}>Word Documents</option>
                        <option value="video" ${_activeTypeFilter === 'video' ? 'selected' : ''}>Video / Media</option>
                    </select>
                </div>
            </div>

            <!-- 3. Resource Content Area -->
            ${filtered.length === 0 ? `
                <!-- Empty State -->
                <div class="bg-white rounded-3xl border border-slate-200/80 p-16 text-center shadow-sm">
                    <div class="w-20 h-20 rounded-3xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                        <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>
                    </div>
                    <h3 class="text-base font-bold text-slate-900 mb-1">No Matching Resources</h3>
                    <p class="text-xs text-slate-500 max-w-sm mx-auto mb-6">No learning materials found matching your current filter criteria. You can clear your filters${isAdminResourcesView ? ' or manage course materials.' : ' or upload a new resource.'}</p>
                    <div class="inline-flex items-center gap-2">
                        <button type="button" id="btn-reset-filters" class="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors">
                            Reset Filters
                        </button>
                        ${isAdminResourcesView ? `
                            <button type="button" data-manage-materials class="px-4 py-2 rounded-xl text-xs font-bold bg-[#15803d] hover:bg-[#166534] text-white transition-colors">
                                Manage Materials
                            </button>
                        ` : `
                            <button type="button" onclick="document.getElementById('btn-open-upload')?.click()" class="px-4 py-2 rounded-xl text-xs font-bold bg-[#15803d] hover:bg-[#166534] text-white transition-colors">
                                Upload Material
                            </button>
                        `}
                    </div>
                </div>
            ` : _currentViewMode === 'grid' ? `
                <!-- 4A. Shelf Card View -->
                <div class="space-y-6">
                    ${Object.entries(groupedBySubject).map(([subjectTitle, items]) => `
                        <div class="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
                            <!-- Shelf Header -->
                            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200/60 text-emerald-800 flex items-center justify-center font-bold text-base">
                                        <svg class="w-5 h-5 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                                    </div>
                                    <div>
                                        <h3 class="text-sm font-bold text-slate-900">${escapeHtml(subjectTitle)}</h3>
                                        <p class="text-xs text-slate-400 font-medium">${items.length} file${items.length === 1 ? '' : 's'} available in this repository</p>
                                    </div>
                                </div>
                            </div>

                            <!-- Cards Grid -->
                            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                ${items.map(item => {
                                    const meta = getFileTypeDetails(item.type);
                                    return `
                                    <div class="bg-slate-50/70 hover:bg-white rounded-2xl p-4 border border-slate-200/70 hover:border-emerald-500 hover:shadow-md transition-all flex flex-col justify-between group">
                                        <div>
                                            <div class="flex items-start justify-between gap-2 mb-3">
                                                <div class="w-9 h-9 rounded-xl ${meta.bg} border flex items-center justify-center shrink-0">
                                                    ${meta.icon}
                                                </div>
                                                <div class="flex items-center gap-1.5 flex-wrap justify-end">
                                                    <span class="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 text-[10px] font-bold">${escapeHtml(item.quarter)}</span>
                                                    <span class="px-2 py-0.5 rounded-md ${item.sharedWithStudents ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-slate-200/60 text-slate-600'} text-[10px] font-bold">
                                                        ${item.sharedWithStudents ? 'Shared' : 'Draft'}
                                                    </span>
                                                </div>
                                            </div>

                                            <h4 class="text-xs font-bold text-slate-900 group-hover:text-emerald-700 line-clamp-1 mb-1" title="${escapeHtml(item.title)}">
                                                ${escapeHtml(item.title)}
                                            </h4>
                                            <p class="text-[11px] text-slate-400 line-clamp-2 mb-3 font-normal">
                                                ${escapeHtml(item.description || item.category)}
                                            </p>
                                        </div>

                                        <div class="pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500">
                                            <span class="text-[11px] font-medium text-slate-400">${item.size} • ${item.date}</span>
                                            
                                            <div class="flex items-center gap-1.5">
                                                <!-- Toggle Share -->
                                                <button type="button" class="btn-toggle-share px-2 py-1 rounded-lg hover:bg-slate-200/70 text-[11px] font-semibold ${item.sharedWithStudents ? 'text-emerald-700' : 'text-slate-500'}" data-id="${item.id}" title="${item.sharedWithStudents ? 'Unshare from class' : 'Share with class'}">
                                                    ${item.sharedWithStudents ? 'Unshare' : 'Share'}
                                                </button>
                                                <!-- Download -->
                                                <button type="button" class="btn-download-resource w-7 h-7 rounded-lg bg-white border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 flex items-center justify-center transition-colors" data-id="${item.id}" title="Download">
                                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : `
                <!-- 4B. Table View -->
                <div class="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left text-xs font-['Inter']">
                            <thead class="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600 select-none">
                                <tr>
                                    <th class="py-3.5 px-4">Name</th>
                                    <th class="py-3.5 px-4">Assigned Subject</th>
                                    <th class="py-3.5 px-4">Category</th>
                                    <th class="py-3.5 px-4">Quarter</th>
                                    <th class="py-3.5 px-4">Size</th>
                                    <th class="py-3.5 px-4">Status</th>
                                    <th class="py-3.5 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 font-medium">
                                ${filtered.map(item => {
                                    const meta = getFileTypeDetails(item.type);
                                    return `
                                    <tr class="hover:bg-slate-50/80 transition-colors group">
                                        <td class="py-3 px-4 flex items-center gap-3">
                                            <div class="w-8 h-8 rounded-lg ${meta.bg} border flex items-center justify-center text-xs font-bold shrink-0">
                                                ${meta.label}
                                            </div>
                                            <div class="min-w-0 max-w-md">
                                                <p class="font-bold text-slate-900 group-hover:text-emerald-700 truncate cursor-pointer" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</p>
                                                <p class="text-[11px] text-slate-400 truncate">${escapeHtml(item.description || item.category)}</p>
                                            </div>
                                        </td>
                                        <td class="py-3 px-4"><span class="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold">${escapeHtml(item.subject)}</span></td>
                                        <td class="py-3 px-4 text-slate-600">${escapeHtml(item.category || 'Handout')}</td>
                                        <td class="py-3 px-4 text-slate-600">${escapeHtml(item.quarter)}</td>
                                        <td class="py-3 px-4 text-slate-500">${item.size}</td>
                                        <td class="py-3 px-4">
                                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${item.sharedWithStudents ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'}">
                                                ${item.sharedWithStudents ? 'Shared' : 'Draft'}
                                            </span>
                                        </td>
                                        <td class="py-3 px-4 text-right">
                                            <div class="inline-flex items-center gap-1.5 justify-end">
                                                <button type="button" class="btn-toggle-share px-2 py-1 rounded-lg hover:bg-slate-200/70 text-[11px] font-semibold ${item.sharedWithStudents ? 'text-emerald-700' : 'text-slate-500'}" data-id="${item.id}">
                                                    ${item.sharedWithStudents ? 'Unshare' : 'Share'}
                                                </button>
                                                <button type="button" class="btn-download-resource px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-[11px] flex items-center gap-1 transition-colors" data-id="${item.id}">
                                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                                    <span>Download</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `}
        </div>

        <!-- 5. UPLOAD RESOURCE MODAL -->
        <div id="teacher-resource-upload-modal" class="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[300] hidden flex items-center justify-center p-4">
            <div class="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div class="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                    <div class="flex items-center gap-2.5">
                        <div class="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                        </div>
                        <h3 class="text-sm font-bold text-slate-900">Upload New Learning Resource</h3>
                    </div>
                    <button type="button" id="btn-close-upload-modal" class="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <form id="resource-upload-form" class="p-6 space-y-4">
                    <!-- Dropzone -->
                    <div id="dropzone-box" class="border-2 border-dashed border-slate-200 hover:border-emerald-600 rounded-2xl p-6 text-center bg-slate-50/50 hover:bg-emerald-50/20 transition-all cursor-pointer">
                        <svg class="w-8 h-8 text-emerald-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                        <p class="text-xs font-bold text-slate-800" id="dropzone-filename">Click to choose a file or drag here</p>
                        <p class="text-[11px] text-slate-400 mt-1">PDF, DOCX, PPTX, MP4, ZIP (Up to 100MB)</p>
                        <input type="file" id="real-file-input" class="hidden">
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1">Resource Title *</label>
                        <input type="text" id="upload-title" required placeholder="e.g. Unit 3 Programming Laboratory Guide" class="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600 focus:bg-white">
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-bold text-slate-700 mb-1">Assign to Subject *</label>
                            <select id="upload-subject" class="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600">
                                <option>Computer Programming 1</option>
                                <option>Web Development</option>
                                <option>Database Management</option>
                                <option>General Institutional</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-700 mb-1">Target Quarter</label>
                            <select id="upload-quarter" class="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600">
                                <option>1st Quarter</option>
                                <option>2nd Quarter</option>
                                <option>3rd Quarter</option>
                                <option>4th Quarter</option>
                                <option>All Quarters</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1">Material Category</label>
                        <select id="upload-category" class="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600">
                            <option>Handout</option>
                            <option>Lecture Slides</option>
                            <option>Lab Activity</option>
                            <option>Syllabus</option>
                            <option>Rubrics</option>
                        </select>
                    </div>

                    <div class="flex items-center gap-2 pt-2">
                        <input type="checkbox" id="upload-share-chk" class="rounded text-emerald-600 focus:ring-emerald-500" checked>
                        <label for="upload-share-chk" class="text-xs font-medium text-slate-700 cursor-pointer">Immediately make visible in student classroom feeds</label>
                    </div>

                    <div class="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                        <button type="button" id="btn-cancel-upload" class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
                        <button type="submit" class="px-5 py-2 rounded-xl text-xs font-bold bg-[#15803d] hover:bg-[#166534] text-white shadow-sm flex items-center gap-1.5 cursor-pointer">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                            <span>Save & Upload</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
        `;

        // Event Bindings
        bindEvents(section);
    }

    function bindEvents(section) {
        section.querySelectorAll('[data-manage-materials]').forEach(button => {
            button.addEventListener('click', () => {
                document.getElementById('nav-school-subjects')?.click();
            });
        });

        // Search Input
        const searchInput = section.querySelector('#resource-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                _searchQuery = e.target.value;
                renderResourcesView();
                // Retain focus
                const nextInput = document.getElementById('resource-search-input');
                if (nextInput) {
                    nextInput.focus();
                    nextInput.setSelectionRange(nextInput.value.length, nextInput.value.length);
                }
            });
        }
        section.querySelector('#resource-search-form')?.addEventListener('submit', (event) => {
            event.preventDefault();
            _searchQuery = searchInput?.value || '';
            renderResourcesView();
            const nextInput = document.getElementById('resource-search-input');
            if (nextInput) nextInput.focus();
        });

        // View Mode Toggles
        section.querySelector('#btn-view-grid')?.addEventListener('click', () => {
            _currentViewMode = 'grid';
            renderResourcesView();
        });
        section.querySelector('#btn-view-table')?.addEventListener('click', () => {
            _currentViewMode = 'table';
            renderResourcesView();
        });

        // Subject Filter Buttons
        section.querySelectorAll('.subject-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                _activeSubjectFilter = btn.dataset.subject || 'all';
                renderResourcesView();
            });
        });

        // Quarter & Type Filters
        section.querySelector('#quarter-filter-select')?.addEventListener('change', (e) => {
            _activeQuarterFilter = e.target.value;
            renderResourcesView();
        });
        section.querySelector('#type-filter-select')?.addEventListener('change', (e) => {
            _activeTypeFilter = e.target.value;
            renderResourcesView();
        });

        // Reset Filters Button
        section.querySelector('#btn-reset-filters')?.addEventListener('click', () => {
            _activeSubjectFilter = 'all';
            _activeQuarterFilter = 'all';
            _activeTypeFilter = 'all';
            _searchQuery = '';
            renderResourcesView();
        });

        // Toggle Share Status
        section.querySelectorAll('.btn-toggle-share').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                const list = getStoredResources();
                const item = list.find(r => r.id === id);
                if (item) {
                    item.sharedWithStudents = !item.sharedWithStudents;
                    saveResources(list);
                    renderResourcesView();
                    showNotification(item.sharedWithStudents ? 'Resource shared with students.' : 'Resource unshared from students.');
                }
            });
        });

        // Download Resource
        section.querySelectorAll('.btn-download-resource').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                const list = getStoredResources();
                const item = list.find(r => r.id === id);
                if (item) {
                    item.downloads = (item.downloads || 0) + 1;
                    saveResources(list);
                    showNotification(`Downloading ${item.title}...`);
                }
            });
        });

        // Modal Controls
        const uploadModal = section.querySelector('#teacher-resource-upload-modal');
        const openBtn = section.querySelector('#btn-open-upload');
        const closeBtn = section.querySelector('#btn-close-upload-modal');
        const cancelBtn = section.querySelector('#btn-cancel-upload');
        const dropzone = section.querySelector('#dropzone-box');
        const fileInput = section.querySelector('#real-file-input');
        const dropzoneLabel = section.querySelector('#dropzone-filename');
        const form = section.querySelector('#resource-upload-form');

        openBtn?.addEventListener('click', () => {
            uploadModal?.classList.remove('hidden');
        });

        const closeModal = () => {
            uploadModal?.classList.add('hidden');
            form?.reset();
            if (dropzoneLabel) dropzoneLabel.textContent = 'Click to choose a file or drag here';
        };

        closeBtn?.addEventListener('click', closeModal);
        cancelBtn?.addEventListener('click', closeModal);

        dropzone?.addEventListener('click', () => fileInput?.click());
        fileInput?.addEventListener('change', () => {
            if (fileInput.files && fileInput.files[0]) {
                const f = fileInput.files[0];
                if (dropzoneLabel) dropzoneLabel.textContent = `${f.name} (${(f.size / (1024 * 1024)).toFixed(1)} MB)`;
                const titleInput = section.querySelector('#upload-title');
                if (titleInput && !titleInput.value) {
                    titleInput.value = f.name;
                }
            }
        });

        form?.addEventListener('submit', (e) => {
            e.preventDefault();
            const titleInput = section.querySelector('#upload-title');
            const subjectSelect = section.querySelector('#upload-subject');
            const quarterSelect = section.querySelector('#upload-quarter');
            const categorySelect = section.querySelector('#upload-category');
            const shareChk = section.querySelector('#upload-share-chk');

            if (!titleInput?.value.trim()) return;

            const filename = titleInput.value.trim();
            let ext = 'pdf';
            if (filename.toLowerCase().endsWith('.pptx') || filename.toLowerCase().endsWith('.ppt')) ext = 'pptx';
            else if (filename.toLowerCase().endsWith('.zip') || filename.toLowerCase().endsWith('.rar')) ext = 'zip';
            else if (filename.toLowerCase().endsWith('.docx') || filename.toLowerCase().endsWith('.doc')) ext = 'docx';
            else if (filename.toLowerCase().endsWith('.mp4') || filename.toLowerCase().endsWith('.mov')) ext = 'video';

            const newResource = {
                id: 'res-' + Date.now(),
                title: filename,
                subject: subjectSelect?.value || 'General Institutional',
                subjectCode: (subjectSelect?.value || '').replace(/\s+/g, '').substring(0, 6).toUpperCase(),
                type: ext,
                category: categorySelect?.value || 'Handout',
                quarter: quarterSelect?.value || '1st Quarter',
                size: (Math.random() * 8 + 1.2).toFixed(1) + ' MB',
                date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
                sharedWithStudents: shareChk ? shareChk.checked : true,
                downloads: 0,
                description: `${categorySelect?.value || 'Handout'} for ${subjectSelect?.value}`
            };

            const list = getStoredResources();
            list.unshift(newResource);
            saveResources(list);

            closeModal();
            renderResourcesView();
            showNotification(`"${newResource.title}" uploaded successfully!`);
        });
    }

    function showNotification(msg) {
        let toast = document.getElementById('sigma-resource-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'sigma-resource-toast';
            toast.className = 'fixed bottom-6 right-6 z-[999] bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg border border-slate-700/60 transition-all transform duration-200 pointer-events-none opacity-0 translate-y-2';
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.classList.remove('opacity-0', 'translate-y-2');
        toast.classList.add('opacity-100', 'translate-y-0');
        setTimeout(() => {
            toast.classList.remove('opacity-100', 'translate-y-0');
            toast.classList.add('opacity-0', 'translate-y-2');
        }, 2600);
    }

    function escapeHtml(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // Re-render whenever the section becomes visible (navigation)
    const _observer = new MutationObserver(() => {
        const section = document.getElementById('resources-view');
        if (section && !section.classList.contains('hidden') && !section.querySelector('#resource-search-input')) {
            renderResourcesView();
        }
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            renderResourcesView();
            const section = document.getElementById('resources-view');
            if (section && section.parentElement) {
                _observer.observe(section.parentElement, { attributes: true, subtree: true, attributeFilter: ['class'] });
            }
        });
    } else {
        renderResourcesView();
        const section = document.getElementById('resources-view');
        if (section && section.parentElement) {
            _observer.observe(section.parentElement, { attributes: true, subtree: true, attributeFilter: ['class'] });
        }
    }

    window.renderResourcesView = renderResourcesView;
})();
