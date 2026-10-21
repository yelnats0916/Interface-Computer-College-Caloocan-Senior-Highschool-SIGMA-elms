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

    window.navCalendarDropdownMonth = function (delta, event) {
        if (event) {
            if (typeof event.preventDefault === 'function') event.preventDefault();
            if (typeof event.stopPropagation === 'function') event.stopPropagation();
        }
        selectedDate = null;
        currentCalendarDate = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + delta, 1);
        if (typeof renderCalendarGrid === 'function') {
            renderCalendarGrid();
        }
        window.dispatchEvent(new CustomEvent('sigma:calendar-date-unselect', {}));
    };

    function resetCalendarDropdown() {
        currentCalendarDate = new Date();
        selectedDate = null;
        if (document.getElementById('calendarDropdownDaysGrid') && typeof renderCalendarGrid === 'function') {
            renderCalendarGrid();
        }
    }
    window.resetCalendarDropdown = resetCalendarDropdown;

    const calendarPopupStates = new WeakMap();
    const openCalendarPopups = new Set();
    const floatingProperties = ['position', 'left', 'top', 'transform', 'margin-top', 'max-height', 'overflow-y', 'z-index'];

    function positionCalendarPopup(state) {
        const { popup, anchor } = state;
        if (!anchor.isConnected) {
            popup.remove();
            openCalendarPopups.delete(state);
            return;
        }
        if (popup.classList.contains('hidden')) {
            if (popup.parentElement !== anchor) anchor.appendChild(popup);
            for (const property of floatingProperties) {
                const saved = state.styles[property];
                if (saved.value) popup.style.setProperty(property, saved.value, saved.priority);
                else popup.style.removeProperty(property);
            }
            openCalendarPopups.delete(state);
            return;
        }
        const bounds = anchor.getBoundingClientRect();
        if (!bounds.width || bounds.bottom <= 0 || bounds.top >= window.innerHeight) {
            popup.classList.add('hidden');
            positionCalendarPopup(state);
            return;
        }
        openCalendarPopups.add(state);
        // Escape overflow-clipped cards while retaining the original navigation anchor.
        if (popup.parentElement !== document.body) document.body.appendChild(popup);
        popup.style.setProperty('position', 'fixed', 'important');
        popup.style.setProperty('transform', 'none', 'important');
        popup.style.setProperty('margin-top', '0', 'important');
        popup.style.setProperty('max-height', `${Math.max(0, window.innerHeight - 16)}px`, 'important');
        popup.style.setProperty('overflow-y', 'auto', 'important');
        popup.style.setProperty('z-index', '10000', 'important');
        const rect = popup.getBoundingClientRect();
        const gap = window.innerWidth <= 768 ? 6 : 8;
        const below = bounds.bottom + gap;
        const above = bounds.top - gap - rect.height;
        const top = below + rect.height <= window.innerHeight - 8 || above < 8 ? below : above;
        const left = Math.max(8, Math.min(bounds.left + bounds.width / 2 - rect.width / 2, window.innerWidth - rect.width - 8));
        popup.style.setProperty('left', `${left}px`, 'important');
        popup.style.setProperty('top', `${Math.max(8, Math.min(top, window.innerHeight - rect.height - 8))}px`, 'important');
    }

    window.prepareSigmaCalendarPopup = function (popup) {
        let state = calendarPopupStates.get(popup);
        if (!state) {
            state = { popup, anchor: popup.parentElement, styles: {}, frame: null };
            for (const property of floatingProperties) state.styles[property] = { value: popup.style.getPropertyValue(property), priority: popup.style.getPropertyPriority(property) };
            state.schedule = () => {
                if (state.frame !== null) return;
                state.frame = requestAnimationFrame(() => {
                    state.frame = null;
                    positionCalendarPopup(state);
                });
            };
            new MutationObserver(state.schedule).observe(popup, { attributes: true, attributeFilter: ['class'], childList: true, subtree: true });
            calendarPopupStates.set(popup, state);
        }
        state.schedule();
    };

    const updateOpenCalendarPopups = () => openCalendarPopups.forEach(state => state.schedule());
    window.addEventListener('resize', updateOpenCalendarPopups);
    window.addEventListener('scroll', updateOpenCalendarPopups, true);
    window.visualViewport?.addEventListener('resize', updateOpenCalendarPopups);
    const dismissCalendarPopupsOutside = event => {
        for (const { popup, anchor } of openCalendarPopups) {
            if (!popup.contains(event.target) && !anchor.contains(event.target)) popup.classList.add('hidden');
        }
    };
    document.addEventListener('pointerdown', dismissCalendarPopupsOutside, true);
    document.addEventListener('click', dismissCalendarPopupsOutside, true);
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') openCalendarPopups.forEach(({ popup }) => popup.classList.add('hidden'));
    });
    new MutationObserver(() => {
        for (const state of openCalendarPopups) if (!state.anchor.isConnected) state.schedule();
    }).observe(document.body, { childList: true, subtree: true });

    window.renderSigmaCalendarMonthPanel = function ({ year, activeYear, activeMonth, onYearChange, onMonthSelect, footer = '' }) {
        const months = monthNames.map((month, index) => {
            const selected = Number(year) === Number(activeYear) && index === Number(activeMonth);
            return `<button type="button" class="cal-picker-month-btn ${selected ? 'active' : ''}" aria-pressed="${selected}" onclick="window.${onMonthSelect}(${index}, event)">${month.slice(0, 3)}</button>`;
        }).join('');
        return `<div class="cal-picker-header">
            <button type="button" class="cal-picker-year-btn rounded-full" onclick="window.${onYearChange}(-1, event)" title="Previous Year" aria-label="Previous Year"><i class="fa-solid fa-chevron-left text-xs"></i></button>
            <span class="cal-picker-year-label">${Number(year)}</span>
            <button type="button" class="cal-picker-year-btn rounded-full" onclick="window.${onYearChange}(1, event)" title="Next Year" aria-label="Next Year"><i class="fa-solid fa-chevron-right text-xs"></i></button>
        </div><div class="cal-picker-months-grid">${months}</div>${footer}`;
    };

    window.renderSigmaCalendarDayPanel = function ({ year, month, activeYear, activeMonth, activeDay, onDaySelect, footer = '', today = new Date() }) {
        const firstDay = new Date(year, month, 1).getDay();
        const totalDays = new Date(year, month + 1, 0).getDate();
        let days = '<div class="calendar-day-cell calendar-day-cell--empty"></div>'.repeat(firstDay);
        for (let day = 1; day <= totalDays; day++) {
            const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
            const selected = activeYear === year && activeMonth === month && activeDay === day;
            const state = isToday ? ' calendar-day-cell--today' : selected ? ' calendar-day-cell--selected' : '';
            const color = isToday ? 'background-color:#FFD000!important;color:#000!important;' : selected ? 'background-color:#15803d!important;color:#fff!important;' : 'color:#000!important;';
            days += `<button type="button" class="calendar-day-cell font-semibold transition-all cursor-pointer${state}" aria-pressed="${selected}" style="${color}" onclick="window.${onDaySelect}(${year}, ${month}, ${day}, event)">${day}</button>`;
        }
        const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => `<div class="calendar-weekday-header">${day}</div>`).join('');
        return `<div class="grid grid-cols-7 gap-1 text-center mb-1">${weekdays}</div><div class="grid grid-cols-7 gap-1 text-center mb-2">${days}</div>${footer}`;
    };

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

            const academicDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const academicEvents = window.getAcademicCalendarEventsForDate?.(academicDate) || [];
            if (academicEvents.length) {
                dayCell.classList.add('academic-calendar-has-events');
                dayCell.title = `${academicEvents.length} academic event${academicEvents.length === 1 ? '' : 's'}`;
                dayCell.setAttribute('aria-label', `${day} · ${dayCell.title}`);
            }
            dayCell.addEventListener('click', (e) => {
                e.stopPropagation();
                if (isToday) {
                    if (selectedDate) {
                        selectedDate = null;
                        renderCalendarGrid();
                        window.dispatchEvent(new CustomEvent('sigma:calendar-date-unselect', {
                            detail: { year, month: month + 1, day }
                        }));
                    }
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

        renderDropdownAgenda(selectedDate);
    }

    function renderDropdownAgenda(targetDate) {
        let container = document.getElementById('calendar-dropdown-agenda');
        const calendarDropdown = document.getElementById('calendar-dropdown');
        if (!calendarDropdown) return;

        // Auto-inject container into drawer if not in markup
        if (!container) {
            const gridParent = document.getElementById('calendarDropdownDaysGrid')?.parentElement;
            if (!gridParent) return;
            container = document.createElement('div');
            container.id = 'calendar-dropdown-agenda';
            container.className = 'calendar-dropdown-agenda p-0 border-t border-slate-100 bg-white flex-1 w-full';
            container.innerHTML = `
                <div id="calendar-dropdown-agenda-list" class="calendar-dropdown-agenda-list p-0 m-0 w-full">
                </div>
            `;
            gridParent.insertAdjacentElement('afterend', container);
        }

        const listEl = document.getElementById('calendar-dropdown-agenda-list');
        if (!listEl) return;

        const now = new Date();
        const isCurrentMonth = (currentCalendarDate.getFullYear() === now.getFullYear() && currentCalendarDate.getMonth() === now.getMonth());

        let year, month, day;
        if (targetDate && typeof targetDate.day === 'number' && targetDate.year === currentCalendarDate.getFullYear() && targetDate.month === currentCalendarDate.getMonth()) {
            year = targetDate.year;
            month = targetDate.month;
            day = targetDate.day;
        } else if (isCurrentMonth) {
            year = now.getFullYear();
            month = now.getMonth();
            day = now.getDate();
        } else {
            year = currentCalendarDate.getFullYear();
            month = currentCalendarDate.getMonth();
            day = null;
        }

        if (!day) {
            listEl.innerHTML = `
                <div class="flex flex-col items-center justify-center py-8 px-6 text-center select-none w-full">
                    <div class="w-10 h-10 rounded-full bg-black/[0.04] flex items-center justify-center mb-2">
                        <i class="fa-regular fa-calendar text-lg text-black-fade" style="color: rgba(0, 0, 0, 0.45) !important;"></i>
                    </div>
                    <span class="text-xs font-semibold text-slate-700">No Date Selected</span>
                    <span class="text-[11px] text-black-fade mt-0.5 max-w-[220px]" style="color: rgba(0, 0, 0, 0.45) !important;">Select any date in the calendar above to view its schedule.</span>
                </div>
            `;
            return;
        }

        const dateObj = new Date(year, month, day);
        const role = getPortalRoleKey();
        const events = getCalendarEventsForDate(role, dateObj, year, month, day);

        if (!events || events.length === 0) {
            listEl.innerHTML = `
                <div class="flex flex-col items-center justify-center py-8 px-6 text-center select-none w-full">
                    <div class="w-10 h-10 rounded-full bg-black/[0.04] flex items-center justify-center mb-2">
                        <i class="fa-regular fa-calendar-check text-lg text-black-fade" style="color: rgba(0, 0, 0, 0.45) !important;"></i>
                    </div>
                    <span class="text-xs font-semibold text-slate-700">No Events Scheduled</span>
                    <span class="text-[11px] text-black-fade mt-0.5 max-w-[220px]" style="color: rgba(0, 0, 0, 0.45) !important;">There are no classes or deadlines recorded for this date.</span>
                </div>
            `;
            return;
        }

        const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const currentDate = new Date(year, month, day);
        const isToday = (day === now.getDate() && month === now.getMonth() && year === now.getFullYear());
        const isUpcoming = currentDate > todayDate;

        listEl.innerHTML = events.map(ev => {
            let barBg = 'bg-black';
            let barColorStyle = 'background-color: #000000 !important;';
            let barStateClass = 'bar-past';

            const eventIsToday = (ev.nodeClass === 'node-shared-yellow') || (!ev.nodeClass && isToday) || (ev.nodeClass !== 'node-slate' && ev.nodeClass !== 'node-shared-green' && isToday);
            const eventIsUpcoming = (ev.nodeClass === 'node-shared-green') || (!ev.nodeClass && isUpcoming) || (ev.nodeClass !== 'node-slate' && ev.nodeClass !== 'node-shared-yellow' && isUpcoming);

            if (eventIsToday) {
                barBg = 'bg-[#FFD000]';
                barColorStyle = 'background-color: #FFD000 !important;';
                barStateClass = 'bar-current bar-today';
            } else if (eventIsUpcoming) {
                barBg = 'bg-[#15803d]';
                barColorStyle = 'background-color: #15803d !important;';
                barStateClass = 'bar-upcoming';
            }

            return `
                <div class="cal-dropdown-item group w-full px-6 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors flex items-center gap-3 cursor-pointer">
                    <div class="cal-dropdown-bar w-1 h-8 rounded-full ${barBg} ${barStateClass} flex-shrink-0" style="${barColorStyle}"></div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between gap-2">
                            <div class="cal-item-title text-xs font-semibold text-slate-900 truncate transition-colors">${ev.title || 'Untitled Event'}</div>
                            <span class="cal-item-time text-[11px] font-medium text-black-fade flex-shrink-0">${ev.timeRange || ''}</span>
                        </div>
                        <div class="cal-item-subtitle text-[11px] text-black-fade truncate mt-0.5">${ev.subtitle || ev.location || ''}</div>
                    </div>
                </div>
            `;
        }).join('');

        const itemEls = listEl.querySelectorAll('.cal-dropdown-item');
        itemEls.forEach((el, idx) => {
            el.addEventListener('click', () => {
                if (typeof window.handleCalendarItemClick === 'function') {
                    window.handleCalendarItemClick(events[idx], role);
                }
            });
        });
    }

    function initCalendarComponent() {
        updateTopbarCalendarDate();

        const calendarToggleBtn = document.getElementById('calendar-toggle');
        const calendarDropdown = document.getElementById('calendar-dropdown');
        const prevMonthBtn = document.getElementById('calendarDropdownPrevMonthBtn');
        const nextMonthBtn = document.getElementById('calendarDropdownNextMonthBtn');

        if (calendarToggleBtn && !calendarToggleBtn.dataset.topbarBound && !calendarToggleBtn.dataset.calendarToggleBound) {
            calendarToggleBtn.dataset.calendarToggleBound = 'true';
            calendarToggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!calendarDropdown) return;

                const isCalendarMode = (typeof window.isActuallyCalendarPage === 'function')
                    ? window.isActuallyCalendarPage()
                    : (document.body.classList.contains('calendar-page-mode'));

                if (isCalendarMode) {
                    calendarDropdown.classList.add('hidden');
                    calendarToggleBtn.classList.add('active');
                    return;
                }

                const isOpen = !calendarDropdown.classList.contains('hidden');
                if (isOpen) {
                    calendarDropdown.classList.add('hidden');
                    calendarToggleBtn.classList.remove('active');
                    resetCalendarDropdown();
                } else {
                    if (typeof window.hideHeaderOverlays === 'function') {
                        window.hideHeaderOverlays(calendarDropdown, calendarToggleBtn);
                    }
                    resetCalendarDropdown();
                    calendarDropdown.classList.remove('hidden');
                    calendarToggleBtn.classList.add('active');
                    renderCalendarGrid();
                }
            });
        }

        if (calendarDropdown) {
            calendarDropdown.addEventListener('click', (e) => {
                const prev = e.target.closest('#calendarDropdownPrevMonthBtn');
                if (prev) {
                    window.navCalendarDropdownMonth(-1, e);
                    return;
                }
                const next = e.target.closest('#calendarDropdownNextMonthBtn');
                if (next) {
                    window.navCalendarDropdownMonth(1, e);
                    return;
                }
                e.stopPropagation();
            });
        }

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

        if (!window._calDropdownNavDelegated) {
            window._calDropdownNavDelegated = true;
            document.addEventListener('click', (e) => {
                const prev = e.target.closest('#calendarDropdownPrevMonthBtn');
                if (prev) {
                    window.navCalendarDropdownMonth(-1, e);
                    return;
                }
                const next = e.target.closest('#calendarDropdownNextMonthBtn');
                if (next) {
                    window.navCalendarDropdownMonth(1, e);
                    return;
                }
            }, true);
        }

        const monthPickerBtn = document.getElementById('calendarDropdownMonthPickerBtn');
        if (monthPickerBtn && !monthPickerBtn.dataset.calPickerBound) {
            monthPickerBtn.dataset.calPickerBound = 'true';
            monthPickerBtn.onclick = (e) => {
                window.openCalendarNativeMonthPicker(e);
            };
        }

        // View Calendar link handler: closes the dropdown/drawer and navigates to calendar page
        function handleViewCalendarClick(e) {
            // Record where user was before entering Calendar
            window._calendarPreviousHash = window.location.hash || '#dashboard';
            window._hasEnteredCalendarViaPush = true;
            const visibleSec = document.querySelector('.dynamic-section:not(.hidden)');
            window._calendarPreviousNavId = visibleSec ? visibleSec.id.replace('section-', 'nav-') : 'nav-dashboard';
            e.preventDefault();
            e.stopPropagation();

            // Close overlays & mobile drawer
            if (typeof window.hideHeaderOverlays === 'function') {
                window.hideHeaderOverlays();
            } else {
                if (calendarDropdown) calendarDropdown.classList.add('hidden');
                calendarToggleBtn?.classList.remove('active');
            }
            if (typeof window.closeMobilePanel === 'function') {
                window.closeMobilePanel('mobile-calendar-panel');
            }
            if (typeof window.closeMobileTopPanel === 'function') {
                window.closeMobileTopPanel();
            }
            document.body.classList.remove('mobile-panel-open');
            window.closeCalendarCustomMonthPicker?.();

            // Navigate to calendar page
            if (selectedDate && typeof selectedDate.day === 'number') {
                window._preserveCalendarDateOnNextOpen = true;
                window.selectedCalendarDate = { year: selectedDate.year, month: selectedDate.month, day: selectedDate.day };
                const yearSelect = document.getElementById('attendance-year-select');
                const monthSelect = document.getElementById('attendance-month-select');
                if (yearSelect) yearSelect.value = String(selectedDate.year);
                if (monthSelect) monthSelect.value = String(selectedDate.month);
                if (typeof window.setupAttendanceCalendar === 'function') {
                    window.setupAttendanceCalendar();
                } else if (typeof window.selectCalendarDate === 'function') {
                    window.selectCalendarDate(selectedDate.year, selectedDate.month, selectedDate.day);
                }
            } else {
                window._preserveCalendarDateOnNextOpen = false;
            }

            if (typeof window.switchTab === 'function') {
                window.switchTab('nav-attendance');
            } else {
                window.location.hash = '#calendar';
            }

            // Ensure calendar topbar & mobile subbar icons stay selected
            document.body.classList.add('calendar-page-mode');
            if (typeof window.syncCalendarPageActiveState === 'function') {
                window.syncCalendarPageActiveState();
            }
        }

        const viewCalendarLink = calendarDropdown?.querySelector('.view-calendar-anchor');
        if (viewCalendarLink) {
            viewCalendarLink.addEventListener('click', handleViewCalendarClick);
        }

        // Global delegation for any other .view-calendar-anchor (e.g. mobile panels)
        if (!window._viewCalendarDelegated) {
            window._viewCalendarDelegated = true;
            document.addEventListener('click', (e) => {
                const anchor = e.target.closest('.view-calendar-anchor');
                if (!anchor) return;
                handleViewCalendarClick(e);
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
                resetCalendarDropdown();
                const isCalendarMode = (typeof window.isActuallyCalendarPage === 'function')
                    ? window.isActuallyCalendarPage()
                    : false;
                if (!isCalendarMode) {
                    calendarToggleBtn?.classList.remove('active');
                    document.body.classList.remove('calendar-page-mode');
                }
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
                resetCalendarDropdown();
                const isCalendarMode = (typeof window.isActuallyCalendarPage === 'function')
                    ? window.isActuallyCalendarPage()
                    : false;
                if (!isCalendarMode) {
                    calendarToggleBtn?.classList.remove('active');
                    document.body.classList.remove('calendar-page-mode');
                }
                window.closeCalendarCustomMonthPicker?.();
            }
        }, true);
    }

    let pickerViewingYear = new Date().getFullYear();

    function ensureCustomMonthPicker() {
        let picker = document.getElementById('calendar-custom-month-picker');
        if (picker) {
            window.prepareSigmaCalendarPopup(picker);
            return picker;
        }

        const navContainer = document.querySelector('.calendar-month-nav');
        if (!navContainer) return null;

        picker = document.createElement('div');
        picker.id = 'calendar-custom-month-picker';
        picker.className = 'hidden';

        // Prevent events inside picker from bubbling and accidentally triggering outside-click handlers
        picker.addEventListener('click', (e) => e.stopPropagation());
        picker.addEventListener('pointerdown', (e) => e.stopPropagation());
        picker.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });

        navContainer.appendChild(picker);
        window.prepareSigmaCalendarPopup(picker);
        return picker;
    }

    function renderCustomMonthPicker() {
        const picker = ensureCustomMonthPicker();
        if (!picker) return;

        const curYear = currentCalendarDate.getFullYear();
        const curMonth = currentCalendarDate.getMonth();
        picker.innerHTML = window.renderSigmaCalendarMonthPanel({
            year: pickerViewingYear, activeYear: curYear, activeMonth: curMonth,
            onYearChange: 'changeCalendarPickerYear', onMonthSelect: 'selectCalendarCustomMonth',
            footer: `<div class="cal-picker-footer" style="justify-content: center !important;">
                <button type="button" class="cal-picker-footer-today" onclick="window.resetCalendarToThisMonth(event)">
                    This month
                </button>
            </div>`
        });
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
        const yearSelect = document.getElementById('attendance-year-select');
        const monthSelect = document.getElementById('attendance-month-select');
        const curYear = yearSelect ? parseInt(yearSelect.value, 10) : (selectedCalendarDate?.year || (new Date()).getFullYear());
        const curMonth = monthSelect ? parseInt(monthSelect.value, 10) : (selectedCalendarDate?.month ?? (new Date()).getMonth());
        selectedCalendarDate = {
            year: curYear,
            month: curMonth,
            day: null
        };
        window.selectedCalendarDate = selectedCalendarDate;
        if (typeof window.renderCalendar === 'function') {
            window.renderCalendar();
        }
        if (typeof window.renderCalendarRightPanel === 'function') {
            renderCalendarRightPanel(null, null, null);
        }
        window.dispatchEvent(new CustomEvent('sigma:calendar-date-unselect', {}));
    };
    window.clearCalendarSelection = window.unselectCalendarDate;

    // Expose globally
    window.renderCalendarGrid = renderCalendarGrid;

    // ═════════════════════════════════════════════════════════════════════════
    // UNIFIED FULL-PAGE CALENDAR ENGINE (Shared across Teacher, Student, Admin)
    // ═════════════════════════════════════════════════════════════════════════

    function getPortalRoleKey() {
        if (typeof window.SIGMA_PORTAL_ROLE === 'string' && window.SIGMA_PORTAL_ROLE) {
            return window.SIGMA_PORTAL_ROLE;
        }
        const path = (window.location.pathname || '').toLowerCase();
        if (path.includes('teacher') || document.getElementById('teacher-main') || document.body.classList.contains('teacher-portal') || document.querySelector('[data-portal="teacher"]')) {
            return 'teacher';
        }
        if (path.includes('student') || document.getElementById('student-main') || document.body.classList.contains('student-portal') || document.querySelector('[data-portal="student"]')) {
            return 'student';
        }
        return 'admin';
    }
    window.getPortalRoleKey = getPortalRoleKey;

    let selectedCalendarDate = null;
    window.selectedCalendarDate = selectedCalendarDate;
    let attendancePickerViewingYear = (new Date()).getFullYear();
    let currentMobileWeekIndex = null;

    window.openAttendancePageMonthPicker = function (event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        const yearSelect = document.getElementById('attendance-year-select');
        const curYear = yearSelect ? parseInt(yearSelect.value, 10) : (selectedCalendarDate?.year || (new Date()).getFullYear());
        attendancePickerViewingYear = curYear || (new Date()).getFullYear();
        renderAttendancePageCustomMonthPicker();
        const picker = document.getElementById('attendance-page-month-picker');
        if (picker) {
            picker.classList.toggle('hidden');
        }
    };

    window.closeAttendancePageMonthPicker = function (event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        const picker = document.getElementById('attendance-page-month-picker');
        if (picker) {
            picker.classList.add('hidden');
        }
    };

    window.changeAttendancePagePickerYear = function (delta, event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        attendancePickerViewingYear += delta;
        renderAttendancePageCustomMonthPicker();
    };

    window.selectAttendancePageCustomMonth = function (monthIdx, event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        const yearSelect = document.getElementById('attendance-year-select');
        const monthSelect = document.getElementById('attendance-month-select');
        if (yearSelect) yearSelect.value = String(attendancePickerViewingYear);
        if (monthSelect) monthSelect.value = String(monthIdx);

        const now = new Date();
        const isCurrentMonth = (attendancePickerViewingYear === now.getFullYear() && monthIdx === now.getMonth());
        selectedCalendarDate = {
            year: attendancePickerViewingYear,
            month: monthIdx,
            day: null
        };
        window.selectedCalendarDate = selectedCalendarDate;
        currentMobileWeekIndex = null;

        if (typeof window.setupAttendanceCalendar === 'function') {
            window.setupAttendanceCalendar();
        }
        if (isCurrentMonth) {
            renderCalendarRightPanel(now.getFullYear(), now.getMonth(), now.getDate());
        } else {
            renderCalendarRightPanel(null, null, null);
        }
        window.closeAttendancePageMonthPicker();
    };

    window.resetAttendancePageToThisMonth = function (event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        const now = new Date();
        attendancePickerViewingYear = now.getFullYear();
        const yearSelect = document.getElementById('attendance-year-select');
        const monthSelect = document.getElementById('attendance-month-select');
        if (yearSelect) yearSelect.value = String(now.getFullYear());
        if (monthSelect) monthSelect.value = String(now.getMonth());

        selectedCalendarDate = {
            year: now.getFullYear(),
            month: now.getMonth(),
            day: now.getDate()
        };
        window.selectedCalendarDate = selectedCalendarDate;

        if (typeof window.setupAttendanceCalendar === 'function') {
            window.setupAttendanceCalendar();
        }
        window.closeAttendancePageMonthPicker();
    };

    function renderAttendancePageCustomMonthPicker() {
        const picker = document.getElementById('attendance-page-month-picker');
        if (!picker) return;
        window.prepareSigmaCalendarPopup(picker);

        const yearSelect = document.getElementById('attendance-year-select');
        const monthSelect = document.getElementById('attendance-month-select');
        const activeYear = yearSelect ? parseInt(yearSelect.value, 10) : (selectedCalendarDate?.year || (new Date()).getFullYear());
        const activeMonth = monthSelect ? parseInt(monthSelect.value, 10) : (selectedCalendarDate?.month ?? (new Date()).getMonth());
        picker.innerHTML = window.renderSigmaCalendarMonthPanel({
            year: attendancePickerViewingYear, activeYear, activeMonth,
            onYearChange: 'changeAttendancePagePickerYear', onMonthSelect: 'selectAttendancePageCustomMonth'
        });
    }
    window.renderAttendancePageCustomMonthPicker = renderAttendancePageCustomMonthPicker;

    document.addEventListener('click', (e) => {
        const picker = document.getElementById('attendance-page-month-picker');
        const btn = document.getElementById('attendance-month-picker-btn');
        if (picker && !picker.classList.contains('hidden') && !picker.contains(e.target) && !btn?.contains(e.target)) {
            picker.classList.add('hidden');
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const picker = document.getElementById('attendance-page-month-picker');
            if (picker && !picker.classList.contains('hidden')) {
                picker.classList.add('hidden');
            }
        }
    });

    window.stepAttendanceSelect = (selectId, direction) => {
        const select = document.getElementById(selectId);
        if (!select) return;
        const nextIndex = select.selectedIndex + direction;
        if (nextIndex < 0 || nextIndex >= select.options.length) return;
        select.selectedIndex = nextIndex;
        select.dispatchEvent(new Event('change'));
    };

    window.stepAttendanceNav = function (direction = 1) {
        if (typeof window !== 'undefined' && window.innerWidth <= 1023 && !window.isMobileCalendarExpanded && typeof window.stepAttendanceWeek === 'function') {
            window.stepAttendanceWeek(direction);
        } else if (typeof window.stepAttendanceMonth === 'function') {
            window.stepAttendanceMonth(direction);
        }
    };

    window.stepAttendanceMonth = (direction = 1) => {
        if (typeof window !== 'undefined' && window.innerWidth <= 1023 && !window.isMobileCalendarExpanded && typeof window.stepAttendanceWeek === 'function') {
            window.stepAttendanceWeek(direction);
            return;
        }
        const yearSelect = document.getElementById('attendance-year-select');
        const monthSelect = document.getElementById('attendance-month-select');
        let curMonth = monthSelect ? parseInt(monthSelect.value, 10) : (selectedCalendarDate?.month ?? (new Date()).getMonth());
        let curYear = yearSelect ? parseInt(yearSelect.value, 10) : (selectedCalendarDate?.year || (new Date()).getFullYear());

        curMonth += direction;
        if (curMonth < 0) {
            curMonth = 11;
            curYear -= 1;
        } else if (curMonth > 11) {
            curMonth = 0;
            curYear += 1;
        }

        if (yearSelect) yearSelect.value = String(curYear);
        if (monthSelect) monthSelect.value = String(curMonth);

        const now = new Date();
        const isCurrentMonth = (curYear === now.getFullYear() && curMonth === now.getMonth());
        selectedCalendarDate = {
            year: curYear,
            month: curMonth,
            day: null
        };
        window.selectedCalendarDate = selectedCalendarDate;
        currentMobileWeekIndex = null;

        if (typeof window.setupAttendanceCalendar === 'function') {
            window.setupAttendanceCalendar();
        }
        if (isCurrentMonth) {
            renderCalendarRightPanel(now.getFullYear(), now.getMonth(), now.getDate());
        } else {
            renderCalendarRightPanel(null, null, null);
        }
    };

    window.stepAttendanceToday = () => {
        const today = new Date();
        const yearSelect = document.getElementById('attendance-year-select');
        const monthSelect = document.getElementById('attendance-month-select');

        if (yearSelect) yearSelect.value = String(today.getFullYear());
        if (monthSelect) monthSelect.value = String(today.getMonth());

        selectedCalendarDate = {
            year: today.getFullYear(),
            month: today.getMonth(),
            day: today.getDate()
        };
        window.selectedCalendarDate = selectedCalendarDate;
        currentMobileWeekIndex = null;

        if (typeof window.setupAttendanceCalendar === 'function') {
            window.setupAttendanceCalendar();
        }
        renderCalendarRightPanel(today.getFullYear(), today.getMonth(), today.getDate());
    };

    window.stepAttendanceDay = (direction = 1) => {
        const yearSelect = document.getElementById('attendance-year-select');
        const monthSelect = document.getElementById('attendance-month-select');
        let curYear = yearSelect ? parseInt(yearSelect.value, 10) : (selectedCalendarDate?.year || new Date().getFullYear());
        let curMonth = monthSelect ? parseInt(monthSelect.value, 10) : (selectedCalendarDate?.month ?? new Date().getMonth());
        let curDay = selectedCalendarDate?.day || new Date().getDate();

        const date = new Date(curYear, curMonth, curDay);
        date.setDate(date.getDate() + direction);

        const newYear = date.getFullYear();
        const newMonth = date.getMonth();
        const newDay = date.getDate();

        if (yearSelect) yearSelect.value = String(newYear);
        if (monthSelect) monthSelect.value = String(newMonth);

        selectedCalendarDate = {
            year: newYear,
            month: newMonth,
            day: newDay
        };
        window.selectedCalendarDate = selectedCalendarDate;

        if (typeof window.setupAttendanceCalendar === 'function') {
            window.setupAttendanceCalendar();
        }
    };

    function getCalendarEventsForDate(role, dateObj, year, month, day) {
        let events = [];

        // Check if system maintenance mode is currently enabled
        let hasActiveMaintenance = false;
        try {
            if (window.maintenanceModeState?.enabled) {
                hasActiveMaintenance = true;
            } else if (typeof window.getMaintenanceConfig === 'function') {
                const cfg = window.getMaintenanceConfig();
                if (cfg && cfg.enabled) hasActiveMaintenance = true;
            } else if (localStorage.getItem('sigma_maintenance_mode')) {
                const parsed = JSON.parse(localStorage.getItem('sigma_maintenance_mode'));
                if (parsed?.enabled) hasActiveMaintenance = true;
            }
        } catch (_) {}

        if (hasActiveMaintenance) {
            events.unshift({
                startHour: '00:00',
                period: 'AM',
                duration: 'Active',
                timeRange: 'Ongoing Maintenance Window',
                nodeClass: 'node-amber',
                tag: 'SYSTEM • LOCKDOWN',
                tagColor: '#b45309',
                status: 'Active Maintenance',
                statusClass: 'bg-amber-100 text-amber-900 border-amber-300',
                isAssessment: false,
                role: null,
                title: 'System Access & Enrollment Lockdown',
                subtitle: 'Maintenance mode is active. Student and Teacher access is restricted.',
                location: 'Portal-Wide',
                cardClass: 'card-maintenance'
            });
        }

        if (year != null && month != null && day != null) {
            const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            let customEvents = [];
            try {
                const stored = localStorage.getItem('sigma_calendar_custom_events_' + dateKey);
                if (stored) customEvents = JSON.parse(stored);
            } catch (e) {}
            if (Array.isArray(customEvents) && customEvents.length > 0) {
                events = [...events, ...customEvents];
            }
            events.push(...(window.getAcademicCalendarEventsForDate?.(dateKey) || []));
        }

        return events;
    }
    window.getCalendarEventsForDate = getCalendarEventsForDate;
    window.addEventListener('sigma:academic-calendar-changed', () => {
        renderCalendarGrid();
        renderDropdownAgenda(selectedDate);
        window.renderCalendar?.();
        const date = selectedCalendarDate;
        renderCalendarRightPanel(date?.year, date?.month, date?.day);
    });

    function handleCalendarItemClick(ev, role) {
        if (ev?.academicEvent) {
            window.openAcademicCalendarDate?.(ev.dateKey);
            return;
        }
        if (role === 'teacher') {
            if (typeof window.switchTab === 'function') window.switchTab('nav-assessments');
        } else if (role === 'student') {
            if (typeof window.switchTab === 'function') window.switchTab('nav-assignments');
        } else if (role === 'admin') {
            if (ev?.tag?.includes('GRADE') || ev?.title?.includes('Grade')) {
                if (typeof window.switchTab === 'function') window.switchTab('nav-grades');
            } else if (ev?.tag?.includes('ENROLLMENT')) {
                if (typeof window.switchTab === 'function') window.switchTab('nav-school-sections');
            } else {
                if (typeof window.switchTab === 'function') window.switchTab('nav-dashboard');
            }
        }
    }
    window.handleCalendarItemClick = handleCalendarItemClick;

    function renderCalendarRightPanel(year, month, day) {
        const panelDate = document.getElementById('calendar-right-panel-date');
        const panelDay = document.getElementById('calendar-right-panel-day');
        const panelContent = document.getElementById('calendar-right-panel-content');
        const panelCount = document.getElementById('calendar-right-panel-items-count');

        if (!panelContent) return;

        if (!day || !year) {
            if (panelDate) panelDate.textContent = 'No Date Selected';
            if (panelDay) panelDay.textContent = 'Select a Date';
            if (panelCount) panelCount.textContent = '0 events';
            panelContent.innerHTML = `
                <div class="calendar-panel-empty-state">
                    <div class="calendar-empty-icon-wrap">
                        <i class="fa-regular fa-calendar text-2xl text-black-fade"></i>
                    </div>
                    <h4 class="calendar-empty-title">No Date Selected</h4>
                    <p class="calendar-empty-desc text-black-fade">Click or tap any date to view scheduled classes, deadlines, and events.</p>
                </div>
            `;
            return;
        }

        const dateObj = new Date(year, month, day);
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const dayOfWeek = dateObj.getDay();
        const dayName = dayNames[dayOfWeek];
        const formattedDate = `${monthNames[month]} ${day}, ${year}`;

        const now = new Date();
        const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const currentDate = new Date(year, month, day);
        const isToday = (day === now.getDate() && month === now.getMonth() && year === now.getFullYear());
        const isUpcoming = currentDate > todayDate;

        if (panelDate) panelDate.textContent = formattedDate;
        if (panelDay) panelDay.textContent = dayName;

        const role = getPortalRoleKey();
        let events = getCalendarEventsForDate(role, dateObj, year, month, day);

        if (panelCount) {
            panelCount.textContent = `${events.length} event${events.length === 1 ? '' : 's'}`;
        }

        if (events.length === 0) {
            panelContent.innerHTML = `
                <div class="calendar-panel-empty-state">
                    <div class="calendar-empty-icon-wrap">
                        <i class="fa-regular fa-calendar-xmark text-2xl text-black-fade"></i>
                    </div>
                    <h4 class="calendar-empty-title">No Events Scheduled</h4>
                    <p class="calendar-empty-desc text-black-fade">There are no schedule items or maintenance recorded for this date.</p>
                </div>
            `;
            return;
        }

        let timelineHtml = '<div class="calendar-timeline">';

        const curHours = now.getHours();
        const curMinutes = String(now.getMinutes()).padStart(2, '0');
        const curPeriod = curHours >= 12 ? 'PM' : 'AM';
        const cur12Hour = (curHours % 12) || 12;
        const curTimeStr = `${cur12Hour}:${curMinutes} ${curPeriod}`;

        let nowLineInserted = false;

        const timeGroups = [];
        const timeMap = new Map();

        events.forEach((ev) => {
            const timeKey = `${ev.startHour || '12:00'}_${ev.period || 'AM'}`;
            if (!timeMap.has(timeKey)) {
                const group = {
                    startHour: ev.startHour,
                    period: ev.period,
                    duration: ev.duration || 'Due',
                    timeKey: timeKey,
                    events: []
                };
                timeMap.set(timeKey, group);
                timeGroups.push(group);
            }
            const grp = timeMap.get(timeKey);
            grp.events.push(ev);
            if (ev.duration && ev.duration !== 'Due' && grp.duration === 'Due') {
                grp.duration = ev.duration;
            }
        });

        timeGroups.forEach((group) => {
            if (isToday && !nowLineInserted) {
                const [evH, evM] = (group.startHour || '0:0').split(':').map(Number);
                let evHour24 = evH;
                if (group.period === 'PM' && evH < 12) evHour24 += 12;
                if (group.period === 'AM' && evH === 12) evHour24 = 0;

                if ((curHours < evHour24) || (curHours === evHour24 && now.getMinutes() < evM)) {
                    timelineHtml += `
                        <div class="calendar-timeline-now-line" title="Current Time">
                            <span class="now-badge"><i class="fa-solid fa-clock text-[9px]"></i> Now - ${curTimeStr}</span>
                            <div class="now-line"></div>
                        </div>
                    `;
                    nowLineInserted = true;
                }
            }

            const nodeClassToUse = isToday ? 'node-shared-yellow' : (isUpcoming ? 'node-shared-green' : 'node-slate');

            let cardsHtml = '';
            group.events.forEach((ev) => {
                const hasRole = Boolean(ev.role && ev.role !== 'System');
                const isRoleAssessment = Boolean(ev.isAssessment && (ev.role ? hasRole : true));

                const [hStr, mStr] = (ev.startHour || '23:59').split(':');
                let evH = parseInt(hStr, 10);
                const evM = parseInt(mStr, 10) || 0;
                if (ev.period === 'PM' && evH < 12) evH += 12;
                if (ev.period === 'AM' && evH === 0) evH = 0;

                let timeLeftStr = '';
                if (isToday) {
                    const nowMins = curHours * 60 + now.getMinutes();
                    const eventMins = evH * 60 + evM;
                    const diffMins = eventMins - nowMins;

                    if (diffMins <= 0) {
                        timeLeftStr = ev.isAssessment ? 'Past due' : 'Completed';
                    } else {
                        const hoursLeft = Math.floor(diffMins / 60);
                        const minsLeft = diffMins % 60;
                        if (hoursLeft >= 1) {
                            timeLeftStr = minsLeft > 0 ? `${hoursLeft} hr${hoursLeft > 1 ? 's' : ''} ${minsLeft} min${minsLeft > 1 ? 's' : ''} left` : `${hoursLeft} hr${hoursLeft > 1 ? 's' : ''} left`;
                        } else {
                            timeLeftStr = `${minsLeft} min${minsLeft > 1 ? 's' : ''} left`;
                        }
                    }
                } else if (isUpcoming) {
                    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    const targetDate = new Date(year, month, day);
                    const diffDays = Math.round((targetDate - todayStart) / (1000 * 60 * 60 * 24));
                    if (diffDays === 1) {
                        timeLeftStr = ev.isAssessment ? 'Due tomorrow' : 'Starts tomorrow';
                    } else {
                        timeLeftStr = ev.isAssessment ? `Due in ${diffDays} days` : `Starts in ${diffDays} days`;
                    }
                } else {
                    timeLeftStr = ev.isAssessment ? 'Past due' : 'Completed';
                }

                if (ev.academicEvent && ev.duration === 'All day') timeLeftStr = 'All day';
                else if (ev.academicEvent && ev.timeRange) timeLeftStr = ev.timeRange;

                if (isRoleAssessment) {
                    cardsHtml += `
                        <div class="calendar-timeline-card card-has-role card-deadline">
                            <button type="button" onclick="if(typeof window.handleCalendarItemClick==='function')window.handleCalendarItemClick(${JSON.stringify(ev).replace(/"/g, '&quot;')}, '${role}'); else if(typeof window.switchTab==='function')window.switchTab('nav-assessments');"
                                class="calendar-timeline-title-btn text-left font-bold text-slate-900 hover:text-[#FFD000] no-underline cursor-pointer block transition-colors w-full"
                                title="Open Details">
                                ${ev.title}
                            </button>
                            ${ev.subtitle ? `<p class="calendar-timeline-subtitle select-text">${ev.subtitle}</p>` : ''}
                            <div class="calendar-timeline-footer">
                                <span class="flex items-center gap-1.5"><i class="fa-solid fa-clock text-[#15803d] text-xs"></i> ${timeLeftStr}</span>
                            </div>
                        </div>
                    `;
                } else {
                    cardsHtml += `
                        <div class="calendar-timeline-card card-no-role card-not-clickable cursor-default ${ev.cardClass || ''}">
                            <h4 class="calendar-timeline-title cursor-default select-text">${ev.title}</h4>
                            ${ev.academicEvent ? `<p class="calendar-timeline-subtitle">${ev.eventStartDate}${ev.eventEndDate !== ev.eventStartDate ? ' – ' + ev.eventEndDate : ''}</p>` : ''}
                            ${ev.academicEvent && ev.postId ? `<button type="button" class="calendar-view-announcement" data-calendar-post-id="${encodeURIComponent(ev.postId)}">View Announcement</button>` : ''}
                            ${ev.subtitle ? `<p class="calendar-timeline-subtitle select-text">${ev.subtitle}</p>` : ''}
                            <div class="calendar-timeline-footer select-text">
                                <span class="flex items-center gap-1.5"><i class="fa-solid fa-clock text-[#15803d] text-xs"></i> ${timeLeftStr}</span>
                            </div>
                        </div>
                    `;
                }
            });

            timelineHtml += `
                <div class="calendar-timeline-item">
                    <div class="calendar-timeline-time">
                        <div class="timeline-hour">${group.startHour}<span class="timeline-period">${group.period}</span></div>
                        <div class="timeline-duration text-black-fade">${group.duration}</div>
                    </div>
                    <div class="calendar-timeline-node ${nodeClassToUse}"></div>
                    <div class="calendar-timeline-cards-col flex flex-col gap-2.5 flex-1 min-w-0">
                        ${cardsHtml}
                    </div>
                </div>
            `;
        });

        if (isToday && !nowLineInserted) {
            timelineHtml += `
                <div class="calendar-timeline-now-line" title="Current Time">
                    <span class="now-badge"><i class="fa-solid fa-clock text-[9px]"></i> Now - ${curTimeStr}</span>
                    <div class="now-line"></div>
                </div>
            `;
        }

        timelineHtml += '</div>';
        panelContent.innerHTML = timelineHtml;
    }
    window.renderCalendarRightPanel = renderCalendarRightPanel;

    function setupAttendanceCalendar() {
        const yearSelect = document.getElementById('attendance-year-select');
        const monthSelect = document.getElementById('attendance-month-select');
        const todayBtn = document.getElementById('attendance-today-btn');
        const calendarGrid = document.getElementById('attendance-full-calendar-grid');
        const calendarShell = document.getElementById('attendance-calendar-shell');
        const monthYearLabel = document.getElementById('attendance-month-year-label');

        if (!calendarGrid || !calendarShell) return;

        if (!window._preserveCalendarDateOnNextOpen) {
            const now = new Date();
            selectedCalendarDate = {
                year: now.getFullYear(),
                month: now.getMonth(),
                day: now.getDate()
            };
            window.selectedCalendarDate = selectedCalendarDate;
            if (yearSelect) yearSelect.value = String(now.getFullYear());
            if (monthSelect) monthSelect.value = String(now.getMonth());
        } else {
            window._preserveCalendarDateOnNextOpen = false;
        }

        if (yearSelect && !yearSelect.value) yearSelect.value = String(selectedCalendarDate?.year || (new Date()).getFullYear());
        if (monthSelect && !monthSelect.value) monthSelect.value = String(selectedCalendarDate?.month ?? (new Date()).getMonth());

        function renderCalendar() {
            const year = yearSelect ? parseInt(yearSelect.value, 10) : (selectedCalendarDate?.year || (new Date()).getFullYear());
            const month = monthSelect ? parseInt(monthSelect.value, 10) : (selectedCalendarDate?.month ?? (new Date()).getMonth());

            if (monthYearLabel) {
                const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                monthYearLabel.textContent = `${monthNames[month]} ${year}`;
            }

            calendarGrid.innerHTML = '';

            const firstDayOfMonth = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();

            const totalCells = firstDayOfMonth + daysInMonth;
            const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
            const totalVisibleCells = totalCells + remainingCells;
            const totalWeeks = Math.max(1, Math.ceil(totalVisibleCells / 7));

            // Determine active week index (containing selected date or today)
            const now = new Date();
            const isViewingTodayMonth = (now.getFullYear() === year && now.getMonth() === month);
            const isDateExplicitlySelected = Boolean(
                selectedCalendarDate &&
                selectedCalendarDate.year === year &&
                selectedCalendarDate.month === month &&
                selectedCalendarDate.day &&
                !(isViewingTodayMonth && selectedCalendarDate.day === now.getDate())
            );

            let activeWeekIndex = 0;
            if (isDateExplicitlySelected) {
                const activeDayIndex = firstDayOfMonth + selectedCalendarDate.day - 1;
                activeWeekIndex = Math.max(0, Math.floor(activeDayIndex / 7));
            } else if (typeof currentMobileWeekIndex === 'number' && currentMobileWeekIndex >= 0 && currentMobileWeekIndex < totalWeeks) {
                activeWeekIndex = currentMobileWeekIndex;
            } else if (isViewingTodayMonth) {
                const activeDayIndex = firstDayOfMonth + now.getDate() - 1;
                activeWeekIndex = Math.max(0, Math.floor(activeDayIndex / 7));
            } else {
                activeWeekIndex = 0;
            }
            currentMobileWeekIndex = activeWeekIndex;

            if (calendarShell) {
                calendarShell.setAttribute('data-active-week', String(activeWeekIndex));
                if (window.isMobileCalendarExpanded) {
                    calendarShell.classList.add('calendar-mobile-expanded');
                } else {
                    calendarShell.classList.remove('calendar-mobile-expanded');
                }
            }

            for (let i = 0; i < firstDayOfMonth; i++) {
                const colIndex = i % 7;
                const isLastRow = i >= totalVisibleCells - 7;
                const weekIndex = Math.floor(i / 7);
                const isActiveWeek = (weekIndex === activeWeekIndex);
                renderEmptyDayCell(colIndex, isLastRow, weekIndex, isActiveWeek);
            }

            for (let i = 1; i <= daysInMonth; i++) {
                const dayIndex = firstDayOfMonth + i - 1;
                const colIndex = dayIndex % 7;
                const isLastRow = dayIndex >= totalVisibleCells - 7;
                const isToday = (i === now.getDate() && month === now.getMonth() && year === now.getFullYear());
                const isSelected = (!isToday && selectedCalendarDate && selectedCalendarDate.day === i && isDateExplicitlySelected && selectedCalendarDate.month === month && selectedCalendarDate.year === year);
                const weekIndex = Math.floor(dayIndex / 7);
                const isActiveWeek = (weekIndex === activeWeekIndex);

                renderDayCell(i, true, 'current', isToday, isSelected, colIndex, isLastRow, year, month, weekIndex, isActiveWeek);
            }

            for (let i = 1; i <= remainingCells; i++) {
                const dayIndex = totalCells + i - 1;
                const colIndex = dayIndex % 7;
                const isLastRow = dayIndex >= totalVisibleCells - 7;
                const weekIndex = Math.floor(dayIndex / 7);
                const isActiveWeek = (weekIndex === activeWeekIndex);
                renderEmptyDayCell(colIndex, isLastRow, weekIndex, isActiveWeek);
            }

            calendarGrid.style.display = 'grid';
            calendarGrid.style.gridTemplateColumns = 'repeat(7, minmax(0, 1fr))';
            calendarGrid.style.gridTemplateRows = `repeat(${totalWeeks}, minmax(0, 1fr))`;
            calendarGrid.style.height = '100%';
            calendarGrid.style.width = '100%';
            calendarGrid.style.gap = '0';
            calendarGrid.style.backgroundColor = 'white';

            updateMobileExpandToggleUI();
        }

        function updateMobileExpandToggleUI() {
            const expandBtn = document.getElementById('calendar-mobile-expand-toggle');
            const expandLabel = document.getElementById('calendar-mobile-expand-label');
            const expandIcon = expandBtn ? expandBtn.querySelector('i') : null;
            const isExpanded = Boolean(window.isMobileCalendarExpanded);

            if (expandBtn) {
                expandBtn.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
            }
            if (expandLabel) {
                expandLabel.textContent = isExpanded ? 'Collapse' : 'Full Month';
            }
            if (expandIcon) {
                expandIcon.className = isExpanded ? 'fa-solid fa-chevron-up text-xs' : 'fa-solid fa-chevron-down text-xs';
            }
        }

        window.toggleMobileCalendarExpand = function () {
            window.isMobileCalendarExpanded = !window.isMobileCalendarExpanded;
            const calendarShell = document.getElementById('attendance-calendar-shell');
            if (calendarShell) {
                if (window.isMobileCalendarExpanded) {
                    calendarShell.classList.add('calendar-mobile-expanded');
                } else {
                    calendarShell.classList.remove('calendar-mobile-expanded');
                }
            }
            updateMobileExpandToggleUI();
        };

        window.stepAttendanceWeek = function (direction = 1) {
            let curYear = yearSelect ? parseInt(yearSelect.value, 10) : (selectedCalendarDate?.year || (new Date()).getFullYear());
            let curMonth = monthSelect ? parseInt(monthSelect.value, 10) : (selectedCalendarDate?.month ?? (new Date()).getMonth());

            const firstDayOfMonth = new Date(curYear, curMonth, 1).getDay();
            const daysInMonth = new Date(curYear, curMonth + 1, 0).getDate();
            const totalCells = firstDayOfMonth + daysInMonth;
            const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
            const totalWeeks = Math.max(1, Math.ceil((totalCells + remainingCells) / 7));

            let curWeek = (typeof currentMobileWeekIndex === 'number') ? currentMobileWeekIndex : 0;
            let targetWeek = curWeek + direction;

            // Clear any explicit selection so navigating weeks does not select any date
            const now = new Date();
            selectedCalendarDate = {
                year: now.getFullYear(),
                month: now.getMonth(),
                day: now.getDate()
            };
            window.selectedCalendarDate = selectedCalendarDate;

            if (targetWeek < 0) {
                // Step to previous month, last week
                curMonth -= 1;
                if (curMonth < 0) {
                    curMonth = 11;
                    curYear -= 1;
                }
                if (yearSelect) yearSelect.value = String(curYear);
                if (monthSelect) monthSelect.value = String(curMonth);

                const prevFirstDay = new Date(curYear, curMonth, 1).getDay();
                const prevDays = new Date(curYear, curMonth + 1, 0).getDate();
                const prevTotal = prevFirstDay + prevDays;
                const prevRem = prevTotal % 7 === 0 ? 0 : 7 - (prevTotal % 7);
                const prevTotalWeeks = Math.max(1, Math.ceil((prevTotal + prevRem) / 7));

                currentMobileWeekIndex = Math.max(0, prevTotalWeeks - 1);
            } else if (targetWeek >= totalWeeks) {
                // Step to next month, first week
                curMonth += 1;
                if (curMonth > 11) {
                    curMonth = 0;
                    curYear += 1;
                }
                if (yearSelect) yearSelect.value = String(curYear);
                if (monthSelect) monthSelect.value = String(curMonth);

                currentMobileWeekIndex = 0;
            } else {
                currentMobileWeekIndex = targetWeek;
            }

            renderCalendar();
            const isTodayMonth = (now.getFullYear() === curYear && now.getMonth() === curMonth);
            const todayWeekIdx = isTodayMonth ? Math.floor((new Date(curYear, curMonth, 1).getDay() + now.getDate() - 1) / 7) : -1;
            if (currentMobileWeekIndex === todayWeekIdx) {
                renderCalendarRightPanel(now.getFullYear(), now.getMonth(), now.getDate());
            } else {
                renderCalendarRightPanel(null, null, null);
            }
        };

        function renderEmptyDayCell(colIndex = 0, isLastRow = false, weekIndex = 0, isActiveWeek = false) {
            const cell = document.createElement('div');
            const borderR = colIndex === 6 ? '' : 'border-r';
            const borderB = isLastRow ? '' : 'border-b';
            cell.className = `min-h-0 h-full p-2.5 bg-slate-50/40 ${borderR} ${borderB} border-slate-200 select-none`;
            cell.setAttribute('data-week-index', String(weekIndex));
            if (isActiveWeek) {
                cell.setAttribute('data-active-week-cell', 'true');
            }
            calendarGrid.appendChild(cell);
        }

        function renderDayCell(day, isCurrentMonth, type, isToday, isSelected, colIndex, isLastRow, year, month, weekIndex = 0, isActiveWeek = false) {
            const cell = document.createElement('div');
            const dayOfWeek = (new Date(year, month, day)).getDay();
            const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
            const borderR = colIndex === 6 ? '' : 'border-r';
            const borderB = isLastRow ? '' : 'border-b';

            let stateClass = '';
            let dateNumColor = isWeekend ? 'text-red-500' : 'text-slate-700';

            if (isToday) {
                stateClass = 'calendar-grid-cell-today';
                dateNumColor = 'text-black font-black';
            } else if (isSelected) {
                stateClass = 'calendar-grid-cell-selected';
                dateNumColor = 'text-white font-bold';
            }

            cell.className = `min-h-0 h-full p-2 sm:p-2.5 cursor-pointer flex flex-col group ${borderR} ${borderB} border-slate-200 transition-colors select-none ${stateClass}`;
            cell.setAttribute('data-week-index', String(weekIndex));
            if (isActiveWeek) {
                cell.setAttribute('data-active-week-cell', 'true');
            }

            cell.innerHTML = `
                <div class="flex items-center justify-between">
                    <span class="calendar-grid-date-num w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center text-xs sm:text-sm font-bold ${dateNumColor}">${day}</span>
                </div>
            `;
            const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const academicEvents = getCalendarEventsForDate(getPortalRoleKey(), new Date(year, month, day), year, month, day);
            if (academicEvents.length) {
                const preview = document.createElement('div');
                preview.className = 'academic-calendar-day-events';
                academicEvents.slice(0, 2).forEach(event => {
                    const label = document.createElement('span');
                    label.innerHTML = event.title;
                    label.title = label.textContent;
                    label.className = 'calendar-cell-event-title';
                    preview.appendChild(label);
                });
                if (academicEvents.length > 2) {
                    const more = document.createElement('span');
                    more.className = 'calendar-cell-event-more';
                    more.textContent = `+${academicEvents.length - 2} more`;
                    preview.appendChild(more);
                }
                const count = document.createElement('span');
                count.className = 'calendar-cell-event-count';
                count.textContent = `${academicEvents.length} ${academicEvents.length === 1 ? 'event' : 'events'}`;
                preview.appendChild(count);
                cell.appendChild(preview);
            }

            cell.onclick = () => {
                selectCalendarDate(year, month, day);
            };

            calendarGrid.appendChild(cell);
        }

        function selectCalendarDate(year, month, day) {
            const now = new Date();
            const isToday = (day === now.getDate() && month === now.getMonth() && year === now.getFullYear());
            const isAlreadySelected = Boolean(
                selectedCalendarDate &&
                selectedCalendarDate.year === year &&
                selectedCalendarDate.month === month &&
                selectedCalendarDate.day === day
            );

            // On mobile, selecting a date collapses the full month view back to the 1-week row
            if (typeof window !== 'undefined' && window.innerWidth <= 1023 && window.isMobileCalendarExpanded) {
                window.isMobileCalendarExpanded = false;
                if (calendarShell) {
                    calendarShell.classList.remove('calendar-mobile-expanded');
                }
                updateMobileExpandToggleUI();
            }

            if (isAlreadySelected) {
                // Unselect: clears selection without resetting month/year or jumping to current day on desktop or mobile
                selectedCalendarDate = {
                    year,
                    month,
                    day: null
                };
                window.selectedCalendarDate = selectedCalendarDate;

                renderCalendar();
                renderCalendarRightPanel(null, null, null);

                window.dispatchEvent(new CustomEvent('sigma:calendar-date-unselect', {
                    detail: { year, month: month + 1, day }
                }));
                return;
            }

            if (yearSelect) yearSelect.value = String(year);
            if (monthSelect) monthSelect.value = String(month);

            selectedCalendarDate = { year, month, day };
            window.selectedCalendarDate = selectedCalendarDate;
            const activeDayIndex = (new Date(year, month, 1)).getDay() + day - 1;
            currentMobileWeekIndex = Math.max(0, Math.floor(activeDayIndex / 7));
            renderCalendar();
            renderCalendarRightPanel(year, month, day);
            window.dispatchEvent(new CustomEvent('sigma:calendar-date-select', {
                detail: { year, month: month + 1, day }
            }));
        }
        window.selectCalendarDate = selectCalendarDate;
        window.renderCalendar = renderCalendar;

        // Horizontal week navigation is powered via chevron buttons without touch drag gestures

        if (todayBtn) {
            todayBtn.onclick = () => {
                window.stepAttendanceToday();
            };
        }

        renderCalendar();
        renderCalendarRightPanel(selectedCalendarDate.year, selectedCalendarDate.month, selectedCalendarDate.day);
    }
    window.setupAttendanceCalendar = setupAttendanceCalendar;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initCalendarComponent();
            if (document.getElementById('attendance-full-calendar-grid')) {
                setupAttendanceCalendar();
            }
        });
    } else {
        initCalendarComponent();
        if (document.getElementById('attendance-full-calendar-grid')) {
            setupAttendanceCalendar();
        }
    }
})();

