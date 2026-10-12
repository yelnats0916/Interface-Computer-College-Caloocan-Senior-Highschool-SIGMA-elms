<?php
/**
 * SIGMA ELMS - Unified Calendar Page Component
 * Shared across Teacher, Student, and Admin portals.
 * Interface Computer College
 */
?>
<section id="section-attendance" class="dynamic-section hidden">
    <!-- Left Section: Main Calendar Grid with Controls Toolbar -->
    <div id="attendance-left-column">
        <!-- Calendar Controls Toolbar -->
        <div class="calendar-controls-toolbar">
            <div class="flex items-center gap-2.5">
                <button type="button" id="attendance-today-btn" onclick="if(typeof window.stepAttendanceToday==='function')window.stepAttendanceToday();"
                    class="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 rounded-full text-xs font-bold shadow-sm transition-colors cursor-pointer select-none">
                    Today
                </button>
                
                <div class="calendar-page-month-nav relative flex items-center gap-1 bg-white border border-slate-200 rounded-full px-2 py-0.5 shadow-sm cursor-default select-none">
                    <button type="button" id="nav-cal-prev-btn" onclick="if(typeof window.stepAttendanceNav==='function')window.stepAttendanceNav(-1);else if(typeof window.stepAttendanceMonth==='function')window.stepAttendanceMonth(-1);" title="Previous" aria-label="Previous"
                        class="w-7 h-7 rounded-full flex items-center justify-center text-slate-700 hover:text-black hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer border-0 bg-transparent">
                        <i class="fa-solid fa-chevron-left text-xs"></i>
                    </button>

                    <span id="attendance-month-year-label" class="px-2 py-1 text-sm font-bold text-slate-900 select-none font-['Inter'] cursor-default">October 2026</span>

                    <button type="button" id="attendance-month-picker-btn" onclick="if(typeof window.openAttendancePageMonthPicker==='function')window.openAttendancePageMonthPicker(event);"
                        class="w-7 h-7 rounded-full flex items-center justify-center text-[#15803d] hover:text-[#166534] hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer border-0 bg-transparent"
                        title="Select Month & Year" aria-label="Select Month & Year">
                        <i class="fa-regular fa-calendar text-sm"></i>
                    </button>

                    <button type="button" id="nav-cal-next-btn" onclick="if(typeof window.stepAttendanceNav==='function')window.stepAttendanceNav(1);else if(typeof window.stepAttendanceMonth==='function')window.stepAttendanceMonth(1);" title="Next" aria-label="Next"
                        class="w-7 h-7 rounded-full flex items-center justify-center text-slate-700 hover:text-black hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer border-0 bg-transparent">
                        <i class="fa-solid fa-chevron-right text-xs"></i>
                    </button>

                    <!-- Custom Month & Year Picker Popover -->
                    <div id="attendance-page-month-picker" class="hidden">
                    </div>
                </div>

                <!-- Hidden Selects for Backward-Compatibility -->
                <select id="attendance-month-select" class="hidden" aria-hidden="true">
                    <option value="0">January</option><option value="1">February</option><option value="2">March</option>
                    <option value="3">April</option><option value="4">May</option><option value="5">June</option>
                    <option value="6">July</option><option value="7">August</option><option value="8">September</option>
                    <option value="9" selected>October</option><option value="10">November</option><option value="11">December</option>
                </select>
                <select id="attendance-year-select" class="hidden" aria-hidden="true">
                    <option value="2020">2020</option><option value="2021">2021</option><option value="2022">2022</option>
                    <option value="2023">2023</option><option value="2024">2024</option><option value="2025">2025</option>
                    <option value="2026" selected>2026</option><option value="2027">2027</option><option value="2028">2028</option>
                </select>
            </div>
        </div>

        <!-- Calendar Grid Shell -->
        <div id="attendance-calendar-shell">
            <div class="attendance-weekdays-header">
                <div class="weekday-cell">Sun</div>
                <div class="weekday-cell">Mon</div>
                <div class="weekday-cell">Tue</div>
                <div class="weekday-cell">Wed</div>
                <div class="weekday-cell">Thu</div>
                <div class="weekday-cell">Fri</div>
                <div class="weekday-cell">Sat</div>
            </div>

            <div id="attendance-full-calendar-grid">
            </div>

            <!-- Mobile Collapsible Week Strip Bar -->
            <div id="calendar-mobile-collapse-bar" class="calendar-mobile-collapse-bar">
                <button type="button" id="calendar-mobile-prev-week-btn" class="calendar-mobile-nav-chevron-btn" onclick="if(typeof window.stepAttendanceWeek==='function')window.stepAttendanceWeek(-1);" title="Previous Week" aria-label="Previous Week">
                    <i class="fa-solid fa-chevron-left"></i>
                </button>
                <button type="button" id="calendar-mobile-expand-toggle" class="calendar-mobile-expand-btn" onclick="if(typeof window.toggleMobileCalendarExpand==='function')window.toggleMobileCalendarExpand();" aria-label="Toggle full month view" aria-expanded="false">
                    <span class="expand-btn-text"><i class="fa-solid fa-chevron-down"></i> <span id="calendar-mobile-expand-label">Full Month</span></span>
                </button>
                <button type="button" id="calendar-mobile-next-week-btn" class="calendar-mobile-nav-chevron-btn" onclick="if(typeof window.stepAttendanceWeek==='function')window.stepAttendanceWeek(1);" title="Next Week" aria-label="Next Week">
                    <i class="fa-solid fa-chevron-right"></i>
                </button>
            </div>
        </div>
    </div>

    <!-- Right Section: White Panel Full Height Stretch -->
    <aside id="calendar-right-panel">
        <!-- Panel Header: Selected Date Display -->
        <div class="calendar-panel-header">
            <div class="calendar-panel-header-center">
                <h3 id="calendar-right-panel-date">March 27, 2026</h3>
                <p id="calendar-right-panel-day">Friday</p>
            </div>
        </div>

        <!-- Panel Scrollable Body: Schedule, Classes & Tasks -->
        <div id="calendar-right-panel-content" class="custom-scrollbar">
            <!-- Injected dynamically by shared calendar engine -->
        </div>

        <!-- Panel Footer: Quick Actions -->
        <div class="calendar-panel-footer">
            <span id="calendar-right-panel-items-count">0 events</span>
        </div>
    </aside>
</section>
