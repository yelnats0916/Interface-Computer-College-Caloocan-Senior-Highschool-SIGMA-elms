/**
 * SIGMA ELMS - Unified Calendar Component Controller
 * Interface Computer College - Caloocan Senior High School ELMS
 * Borrowed by Admin, Teacher, and Student portals.
 */

(function () {
    'use strict';

    let currentCalendarDate = new Date();
    let selectedDate = null; // Track selected { year, month, day }

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    function updateTopbarCalendarDate() {
        const today = new Date();
        const dateSpan = document.getElementById('calendar-date-number');
        if (dateSpan) {
            dateSpan.textContent = today.getDate();
        }
    }

    function renderCalendarGrid() {
        const monthYearEl = document.getElementById('calendarDropdownMonthYear');
        const gridEl = document.getElementById('calendarDropdownDaysGrid');
        if (!gridEl) return;

        const year = currentCalendarDate.getFullYear();
        const month = currentCalendarDate.getMonth();

        if (monthYearEl) {
            monthYearEl.textContent = `${monthNames[month]} ${year}`;
        }

        const pickerInput = document.getElementById('calendar-dropdown-native-picker');
        if (pickerInput) {
            pickerInput.value = `${year}-${String(month + 1).padStart(2, '0')}`;
        }

        gridEl.innerHTML = '';

        const firstDayIndex = new Date(year, month, 1).getDay();
        const totalDays = new Date(year, month + 1, 0).getDate();

        // Empty cells before 1st of month
        for (let i = 0; i < firstDayIndex; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'calendar-day-cell calendar-day-cell--empty';
            gridEl.appendChild(emptyCell);
        }

        const today = new Date();
        const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

        // Render days
        for (let day = 1; day <= totalDays; day++) {
            const dayCell = document.createElement('div');
            dayCell.className = 'calendar-day-cell';
            dayCell.textContent = day;

            const isToday = isCurrentMonth && today.getDate() === day;
            const isSelected = !isToday && selectedDate && selectedDate.year === year && selectedDate.month === month && selectedDate.day === day;

            if (isToday) {
                dayCell.classList.add('calendar-day-cell--today');
                dayCell.style.cssText = 'background-color: #FFD000 !important; color: #000000 !important; font-weight: 700 !important; border: none !important; box-shadow: none !important; cursor: default;';
            } else if (isSelected) {
                dayCell.classList.add('calendar-day-cell--selected');
                dayCell.style.cssText = 'background-color: #15803d !important; color: #ffffff !important; font-weight: 700 !important; border: none !important; box-shadow: none !important; cursor: pointer;';
            }

            dayCell.addEventListener('click', (e) => {
                e.stopPropagation();
                if (isToday) {
                    // Current date cannot be selected shared green
                    return;
                }
                if (isSelected) {
                    selectedDate = null;
                    renderCalendarGrid();
                    window.dispatchEvent(new CustomEvent('sigma:calendar-date-unselect', {
                        detail: { year, month: month + 1, day }
                    }));
                } else {
                    selectedDate = { year, month, day };
                    renderCalendarGrid();
                    window.dispatchEvent(new CustomEvent('sigma:calendar-date-select', {
                        detail: { year, month: month + 1, day }
                    }));
                }
            });

            gridEl.appendChild(dayCell);
        }
    }

    function initCalendarComponent() {
        updateTopbarCalendarDate();

        const calendarToggleBtn = document.getElementById('calendar-toggle');
        const calendarDropdown = document.getElementById('calendar-dropdown');
        const prevMonthBtn = document.getElementById('calendarDropdownPrevMonthBtn');
        const nextMonthBtn = document.getElementById('calendarDropdownNextMonthBtn');

        if (calendarToggleBtn && calendarDropdown && !calendarToggleBtn.dataset.topbarBound) {
            calendarToggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const isCurrentlyOpen = !calendarDropdown.classList.contains('hidden');

                // Close other header overlays first
                if (typeof window.hideHeaderOverlays === 'function') {
                    window.hideHeaderOverlays(calendarDropdown, calendarToggleBtn);
                } else {
                    document.querySelectorAll('.header-panel').forEach(p => {
                        if (p !== calendarDropdown) p.classList.add('hidden');
                    });
                    document.querySelectorAll('.header-icon-btn, .header-profile-btn').forEach(b => {
                        if (b !== calendarToggleBtn) b.classList.remove('active');
                    });
                }

                if (isCurrentlyOpen) {
                    calendarDropdown.classList.add('hidden');
                    calendarToggleBtn.classList.remove('active');
                    window.closeCalendarCustomMonthPicker?.();
                } else {
                    renderCalendarGrid();
                    calendarDropdown.classList.remove('hidden');
                    calendarToggleBtn.classList.add('active');
                }
            });

            calendarDropdown.addEventListener('click', (e) => e.stopPropagation());
        }

        window.navCalendarDropdownMonth = function (delta, event) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() + delta);
            renderCalendarGrid();
        };

        if (prevMonthBtn) {
            prevMonthBtn.onclick = (e) => {
                window.navCalendarDropdownMonth(-1, e);
            };
        }

        if (nextMonthBtn) {
            nextMonthBtn.onclick = (e) => {
                window.navCalendarDropdownMonth(1, e);
            };
        }

        const monthPickerBtn = document.getElementById('calendarDropdownMonthPickerBtn');
        if (monthPickerBtn && !monthPickerBtn.dataset.calPickerBound) {
            monthPickerBtn.dataset.calPickerBound = 'true';
            monthPickerBtn.onclick = (e) => {
                window.openCalendarNativeMonthPicker(e);
            };
        }

        // View Calendar link handler (clickable without closing the drawer)
        const viewCalendarLink = calendarDropdown?.querySelector('.view-calendar-anchor');
        if (viewCalendarLink) {
            viewCalendarLink.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                // Panel stays open, ready for future calendar page route
            });
        }

        // Click outside listener (Desktop overlay only; mobile mode is managed via topbar.js)
        function handleCalendarDropdownOutsideDismiss(e) {
            // In mobile panel mode, dismissal is handled strictly via panel back button or subbar switching
            if (document.body.classList.contains('mobile-panel-open') || window.innerWidth <= 768) return;
            if (e.target && e.target.closest && e.target.closest('.mobile-header-subbar, .mobile-subbar-btn, .header-icon-btn, .header-profile-btn, #calendar-toggle, #noti-toggle, #sigma-toggle, #profileDropdownBtn')) return;

            if (!calendarDropdown || calendarDropdown.classList.contains('hidden')) return;
            if (!calendarDropdown.contains(e.target) && !calendarToggleBtn?.contains(e.target)) {
                calendarDropdown.classList.add('hidden');
                calendarToggleBtn?.classList.remove('active');
                window.closeCalendarCustomMonthPicker?.();
            }
        }
        window.addEventListener('click', handleCalendarDropdownOutsideDismiss);

        // ESC key listener
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && calendarDropdown && !calendarDropdown.classList.contains('hidden')) {
                if (document.body.classList.contains('mobile-panel-open') || window.innerWidth <= 768) {
                    if (typeof window.closeMobileTopPanel === 'function') {
                        window.closeMobileTopPanel();
                        return;
                    }
                }
                calendarDropdown.classList.add('hidden');
                calendarToggleBtn?.classList.remove('active');
                window.closeCalendarCustomMonthPicker?.();
            }
        }, true);
    }

    let pickerViewingYear = new Date().getFullYear();

    function ensureCustomMonthPicker() {
        let picker = document.getElementById('calendar-custom-month-picker');
        if (picker) return picker;

        const navContainer = document.querySelector('.calendar-month-nav');
        if (!navContainer) return null;

        picker = document.createElement('div');
        picker.id = 'calendar-custom-month-picker';
        picker.className = 'hidden';
        picker.style.cssText = 'position: absolute !important; top: 100% !important; margin-top: 10px !important; left: 50% !important; transform: translateX(-50%) !important; width: 280px !important; max-width: calc(100vw - 32px) !important; background: #ffffff !important; border: 1px solid #e2e8f0 !important; border-radius: 18px !important; box-shadow: 0 16px 38px -4px rgba(0, 0, 0, 0.18), 0 4px 14px -2px rgba(0, 0, 0, 0.08) !important; z-index: 9999 !important; padding: 14px !important; box-sizing: border-box !important;';

        // Prevent events inside picker from bubbling and accidentally triggering outside-click handlers
        picker.addEventListener('click', (e) => e.stopPropagation());
        picker.addEventListener('pointerdown', (e) => e.stopPropagation());
        picker.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });

        navContainer.appendChild(picker);
        return picker;
    }

    function renderCustomMonthPicker() {
        const picker = ensureCustomMonthPicker();
        if (!picker) return;

        const curYear = currentCalendarDate.getFullYear();
        const curMonth = currentCalendarDate.getMonth();
        const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        let monthsHtml = '';
        shortMonths.forEach((m, idx) => {
            const isSelected = (pickerViewingYear === curYear && idx === curMonth);
            monthsHtml += `
                <button type="button" class="cal-picker-month-btn ${isSelected ? 'active' : ''}" onclick="window.selectCalendarCustomMonth(${idx}, event)">
                    ${m}
                </button>
            `;
        });

        picker.innerHTML = `
            <div class="cal-picker-header">
                <button type="button" class="cal-picker-year-btn rounded-full" onclick="window.changeCalendarPickerYear(-1, event)" title="Previous Year">
                    <i class="fa-solid fa-chevron-left text-xs"></i>
                </button>
                <span class="cal-picker-year-label">${pickerViewingYear}</span>
                <button type="button" class="cal-picker-year-btn rounded-full" onclick="window.changeCalendarPickerYear(1, event)" title="Next Year">
                    <i class="fa-solid fa-chevron-right text-xs"></i>
                </button>
            </div>
            <div class="cal-picker-months-grid">
                ${monthsHtml}
            </div>
            <div class="cal-picker-footer" style="justify-content: center !important;">
                <button type="button" class="cal-picker-footer-today" onclick="window.resetCalendarToThisMonth(event)">
                    This month
                </button>
            </div>
        `;
    }

    window.openCalendarNativeMonthPicker = function (event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        pickerViewingYear = currentCalendarDate.getFullYear();
        renderCustomMonthPicker();
        const picker = document.getElementById('calendar-custom-month-picker');
        if (picker) {
            picker.classList.toggle('hidden');
        }
    };

    window.changeCalendarPickerYear = function (delta, event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        pickerViewingYear += delta;
        renderCustomMonthPicker();
    };

    window.selectCalendarCustomMonth = function (monthIdx, event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        selectedDate = null;
        currentCalendarDate = new Date(pickerViewingYear, monthIdx, 1);
        renderCalendarGrid();
        window.closeCalendarCustomMonthPicker(event);
        window.dispatchEvent(new CustomEvent('sigma:calendar-date-unselect', {}));
    };

    window.resetCalendarToThisMonth = function (event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        const now = new Date();
        pickerViewingYear = now.getFullYear();
        selectedDate = null;
        currentCalendarDate = new Date(now.getFullYear(), now.getMonth(), 1);
        renderCalendarGrid();
        window.closeCalendarCustomMonthPicker(event);
        window.dispatchEvent(new CustomEvent('sigma:calendar-date-unselect', {}));
    };

    window.closeCalendarCustomMonthPicker = function (event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        const picker = document.getElementById('calendar-custom-month-picker');
        if (picker) {
            picker.classList.add('hidden');
        }
    };

    // Close picker when clicking outside
    document.addEventListener('click', (e) => {
        const picker = document.getElementById('calendar-custom-month-picker');
        const btn = document.getElementById('calendarDropdownMonthPickerBtn');
        if (picker && !picker.classList.contains('hidden') && !picker.contains(e.target) && !btn?.contains(e.target)) {
            picker.classList.add('hidden');
        }
    });

    window.unselectCalendarDate = function () {
        selectedDate = null;
        renderCalendarGrid();
        window.dispatchEvent(new CustomEvent('sigma:calendar-date-unselect', {}));
    };
    window.clearCalendarSelection = window.unselectCalendarDate;

    // Expose globally
    window.renderCalendarGrid = renderCalendarGrid;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCalendarComponent);
    } else {
        initCalendarComponent();
    }
})();

