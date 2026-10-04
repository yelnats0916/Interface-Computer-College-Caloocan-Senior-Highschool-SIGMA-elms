<?php
/**
 * SIGMA ELMS — Quiz Storage Picker Panel (PHP Template Shell)
 *
 * This file provides the static HTML skeleton for the quiz storage picker.
 * The quiz cards inside #quiz-storage-list-container are filled dynamically
 * by window.renderQuizStoragePickerContent() in subject-editor.js.
 *
 * In capstone 2 (live backend), the JS will call the REST API at
 * /php/api/quiz_library.php to fetch real quiz data from MySQL, then
 * render the cards into #quiz-storage-list-container — no structural
 * change to this file is required.
 */
?>

<div class="space-y-5 animate-in fade-in duration-150 font-['Inter']" id="quiz-storage-picker-shell">

    <!-- ── Top Header ─────────────────────────────────────────── -->
    <div class="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
        <!-- Left: icon + title -->
        <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-2xl bg-emerald-100 text-[#15803d] flex items-center justify-center shrink-0 shadow-2xs">
                <i class="fa-solid fa-folder-open text-base"></i>
            </div>
            <div class="min-w-0">
                <h3 class="text-lg font-bold text-black tracking-tight leading-snug">Select Quiz from Storage</h3>
                <p class="text-xs text-black-fade">Select a saved quiz from your library to attach to this material</p>
            </div>
        </div>
    </div>

    <!-- ── Search & Filters ───────────────────────────────────── -->
    <div class="space-y-3">

        <!-- Search bar + My Storage toggle -->
        <div class="flex items-center gap-2">
            <div id="storage-picker-search-container" class="relative flex-1 flex items-center bg-slate-50 border border-slate-300 rounded-xl px-2.5 sm:px-3.5 py-1 sm:py-2
                        focus-within:bg-white focus-within:border-[#FFD000] focus-within:ring-0 focus-within:outline-none focus-within:shadow-none transition-all gap-1.5 sm:gap-2" style="box-shadow: none !important;">
                <i class="fa-solid fa-magnifying-glass text-xs sm:text-sm text-black mr-1 sm:mr-2 shrink-0"></i>
                <input type="text" id="storage-picker-search-input" aria-label="Search quizzes by title"
                    maxlength="100"
                    placeholder="Search by quiz title..."
                    class="flex-1 min-w-0 bg-transparent text-xs sm:text-sm font-medium text-black outline-none border-0 !border-none focus:ring-0 focus:outline-none focus:border-none shadow-none placeholder:text-black-fade truncate pr-2.5 sm:pr-3"
                    style="border: none !important; outline: none !important; box-shadow: none !important; background: transparent !important;"
                    autocomplete="off"
                    oninput="const cb = document.getElementById('storage-picker-clear-btn'); if(cb) cb.classList.toggle('hidden', !this.value.trim());"
                    onkeydown="if(event.key==='Enter'){ event.preventDefault(); window.executeQuizStorageSearch(); }">
                <button type="button" onclick="window.clearQuizStorageSearch()"
                    id="storage-picker-clear-btn"
                    class="hidden text-black-fade hover:text-black text-xs px-1 cursor-pointer shrink-0">
                    <i class="fa-solid fa-xmark"></i>
                </button>
                <button type="button" onclick="window.executeQuizStorageSearch()"
                    id="storage-picker-search-btn"
                    class="h-7 sm:h-[34px] px-3 sm:px-5 bg-[#15803d] hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold flex items-center
                           justify-center cursor-pointer transition-colors shrink-0 rounded-lg sm:rounded-xl shadow-none ml-1 sm:ml-1.5">
                    <span>Search</span>
                </button>
            </div>

            <!-- My Storage folder toggle -->
            <button type="button" onclick="window.toggleQuizStorageMyFilter()"
                id="storage-filter-my-btn"
                title="My Storage (Quizzes created by you)"
                class="w-10 h-10 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-black
                       flex items-center justify-center cursor-pointer transition-colors shrink-0 shadow-2xs">
                <i class="fa-solid fa-folder-open text-sm text-black"></i>
            </button>
        </div>

        <!-- Category filter chips (hidden until folder clicked or search run) -->
        <div class="hidden flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pt-1 flex-nowrap shrink-0" id="quiz-storage-filter-chips">
            <button type="button" onclick="window.setQuizStorageFilter('all')"
                class="quiz-storage-filter-chip shrink-0 whitespace-nowrap px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold transition-all cursor-pointer bg-[#15803d] text-white shadow-2xs"
                data-filter="all">All</button>

            <button type="button" onclick="window.setQuizStorageFilter('recent')"
                class="quiz-storage-filter-chip shrink-0 whitespace-nowrap px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold transition-all cursor-pointer bg-slate-100 text-black-fade hover:text-black hover:bg-slate-200/70"
                data-filter="recent">Recent</button>

            <button type="button" onclick="window.setQuizStorageFilter('draft')"
                class="quiz-storage-filter-chip shrink-0 whitespace-nowrap px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center gap-1 sm:gap-1.5 bg-slate-100 text-black-fade hover:text-black hover:bg-slate-200/70"
                data-filter="draft">
                <i class="fa-solid fa-file-lines text-[10px] sm:text-xs text-black-fade"></i>
                <span>Draft</span>
            </button>

            <button type="button" onclick="window.setQuizStorageFilter('ai')"
                class="quiz-storage-filter-chip shrink-0 whitespace-nowrap px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center gap-1 sm:gap-1.5 bg-slate-100 text-black-fade hover:text-black hover:bg-slate-200/70"
                data-filter="ai">
                <i class="fa-solid fa-bolt text-[10px] sm:text-xs text-black-fade"></i>
                <span>AI Generated</span>
            </button>

            <button type="button" onclick="window.setQuizStorageFilter('manual')"
                class="quiz-storage-filter-chip shrink-0 whitespace-nowrap px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center gap-1 sm:gap-1.5 bg-slate-100 text-black-fade hover:text-black hover:bg-slate-200/70"
                data-filter="manual">
                <i class="fa-solid fa-pen-nib text-[10px] sm:text-xs text-black-fade"></i>
                <span>Manual</span>
            </button>
        </div>
    </div>

    <!-- ── Quiz Card List (filled by JS) ─────────────────────── -->
    <div id="quiz-storage-list-container" class="space-y-3 pt-1">
        <!-- JS (renderQuizStoragePickerContent) fills this div.
             In live backend mode it also calls /php/api/quiz_library.php
             first to load real quiz data from MySQL. -->
        <div class="py-12 px-4 text-center font-['Inter'] space-y-1.5 animate-in fade-in duration-150">
            <div class="w-12 h-12 rounded-2xl bg-slate-100 text-black flex items-center justify-center mx-auto text-base mb-3 border border-slate-200/80 shadow-2xs">
                <i class="fa-solid fa-magnifying-glass text-black"></i>
            </div>
            <p class="font-bold text-black text-sm tracking-tight">Search Quiz Library</p>
            <p class="text-xs text-black-fade max-w-md mx-auto">Type a quiz title or topic to search, or click the folder icon to view your quizzes</p>
        </div>
    </div>

</div>
