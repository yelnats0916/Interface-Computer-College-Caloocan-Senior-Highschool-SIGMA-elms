/**
 * SIGMA ELMS — Shared Right Panel Template Engine (panels.js)
 * ────────────────────────────────────────────────────────────
 * Unified template module for Right Panel components across Teacher and Student portals.
 * Enforces DRY principles, safe textContent rendering, standard icon integration,
 * relative time formatting (AGENTS.md Section 7), and dynamic expandable lists.
 *
 * Exposes:
 *   window.SigmaPanels.formatRelativeTime(date)
 *   window.SigmaPanels.renderClassPanel(containerId, classes, options)
 *   window.SigmaPanels.renderTeacherSubmissionsPanel(containerId, groups, options)
 *   window.SigmaPanels.renderStudentSubmissionsPanel(containerId, data, options)
 */

(function (global) {
    'use strict';

    // ─── HELPERS ──────────────────────────────────────────────────────────────
    function _esc(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // ─── RELATIVE TIME FORMATTER (AGENTS.md Section 7) ────────────────────────
    function formatRelativeTime(date, context) {
        if (!date) return '';
        const d = date instanceof Date ? date : new Date(date);
        if (Number.isNaN(d.getTime())) return String(date);

        const now = new Date();
        const diffMs = now.getTime() - d.getTime();

        const formatClock = (dt) => {
            let hours = dt.getHours();
            const minutes = dt.getMinutes();
            const ampm = hours >= 12 ? 'pm' : 'am';
            hours = hours % 12;
            hours = hours ? hours : 12;
            const strMin = minutes < 10 ? '0' + minutes : minutes;
            return `${hours}:${strMin} ${ampm}`;
        };

        // Future dates (Upcoming due dates or Due soon)
        if (diffMs < 0) {
            const futureMs = -diffMs;
            const futureHours = Math.floor(futureMs / (1000 * 60 * 60));
            const futureDays = Math.floor(futureMs / (1000 * 60 * 60 * 24));
            const tomorrow = new Date(now);
            tomorrow.setDate(now.getDate() + 1);

            // Within 1 hour: "Due in X mins"
            if (futureMs < 1000 * 60 * 60) {
                const futureMins = Math.max(1, Math.floor(futureMs / (1000 * 60)));
                return `Due in ${futureMins} ${futureMins === 1 ? 'min' : 'mins'}`;
            }

            // Within 24 hours: "Due in X hrs"
            if (futureMs <= 1000 * 60 * 60 * 24 && d.toDateString() === now.toDateString()) {
                return `Due in ${futureHours} ${futureHours === 1 ? 'hr' : 'hrs'}`;
            }

            if (d.toDateString() === now.toDateString()) {
                return `Today at ${formatClock(d)}`;
            }
            if (d.toDateString() === tomorrow.toDateString()) {
                return `Tomorrow at ${formatClock(d)}`;
            }
            if (futureDays < 7) {
                const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
                return `${weekday} at ${formatClock(d)}`;
            }
            const month = d.toLocaleDateString('en-US', { month: 'long' });
            const day = d.getDate();
            return `${month} ${day} at ${formatClock(d)}`;
        }

        // Past dates:
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHours = Math.floor(diffMin / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (context === 'overdue') {
            if (diffSec < 60) {
                const s = Math.max(1, diffSec);
                return `Overdue · ${s}${s === 1 ? 'sec' : 'secs'} ago`;
            }
            if (diffMin < 60) {
                return `Overdue · ${diffMin}${diffMin === 1 ? 'min' : 'mins'} ago`;
            }
            if (diffHours < 24) {
                return `Overdue · ${diffHours}${diffHours === 1 ? 'hr' : 'hrs'} ago`;
            }
            if (diffDays === 1) {
                return `Overdue · Yesterday`;
            }
            return `Overdue · ${diffDays}d ago`;
        }

        // Standard past dates (e.g. when recent student passed their submission)
        if (diffSec < 60) {
            const s = Math.max(1, diffSec);
            return `${s}${s === 1 ? 'sec' : 'secs'}`;
        }

        if (diffMin < 60) {
            return `${diffMin}${diffMin === 1 ? 'min' : 'mins'}`;
        }

        if (diffHours < 24 && d.getDate() === now.getDate()) {
            return `${diffHours}${diffHours === 1 ? 'hr' : 'hrs'}`;
        }

        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        if (d.toDateString() === yesterday.toDateString()) {
            return `Yesterday at ${formatClock(d)}`;
        }

        if (diffDays < 7) {
            const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
            return `${weekday} at ${formatClock(d)}`;
        }

        const month = d.toLocaleDateString('en-US', { month: 'long' });
        const day = d.getDate();
        return `${month} ${day} at ${formatClock(d)}`;
    }

    // ─── STRAND ICON MAP ──────────────────────────────────────────────────────
    const STRAND_ICONS = {
        'ABM':   'fa-solid fa-chart-line',
        'HE':    'fa-solid fa-utensils',
        'GAS':   'fa-solid fa-book-open',
        'HUMSS': 'fa-solid fa-landmark',
        'ICT':   'fa-solid fa-microchip'
    };

    function _strandIcon(name, section) {
        const text = (String(name || '') + ' ' + String(section || '')).toUpperCase();
        if (text.indexOf('ABM')   !== -1) return STRAND_ICONS.ABM;
        if (text.indexOf('HE')    !== -1) return STRAND_ICONS.HE;
        if (text.indexOf('GAS')   !== -1) return STRAND_ICONS.GAS;
        if (text.indexOf('HUMSS') !== -1) return STRAND_ICONS.HUMSS;
        if (text.indexOf('ICT')   !== -1) return STRAND_ICONS.ICT;
        return 'fa-solid fa-chalkboard';
    }

    // ─── SHARED SCHEDULE HELPERS & 24-HOUR FILTER ───────────────────────────
    function formatClockValue(value, fallbackMeridiem = '') {
        const raw = String(value || '').trim();
        if (!raw) return '';
        const match = raw.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
        if (!match) return raw;
        let hour = Number(match[1]);
        const minute = match[2] || '00';
        let meridiem = (match[3] || fallbackMeridiem || '').toUpperCase();
        if (!meridiem) meridiem = hour >= 12 ? 'PM' : 'AM';
        if (hour > 12) hour -= 12;
        if (hour === 0) hour = 12;
        return `${hour}:${minute} ${meridiem}`;
    }

    function clockValueToMinutes(value, fallbackMeridiem = '') {
        const raw = String(value || '').trim();
        const match = raw.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
        if (!match) return 0;
        let hour = Number(match[1]);
        const minute = Number(match[2] || '00');
        const meridiem = (match[3] || fallbackMeridiem || '').toUpperCase();
        if (meridiem === 'PM' && hour < 12) hour += 12;
        if (meridiem === 'AM' && hour === 12) hour = 0;
        return (hour * 60) + minute;
    }

    function parseClassSchedule(schedule) {
        const value = String(schedule || '').replace(/\s+/g, ' ').trim();
        const matches = [...value.matchAll(/(\d{1,2}:\d{2})\s*(AM|PM)?/gi)];
        if (matches.length < 2) {
            return { days: value, start: '', end: '', label: value || 'Schedule TBA', startMinutes: 0, endMinutes: 0 };
        }
        const startPeriod = (matches[0][2] || matches[1][2] || '').toUpperCase();
        const endPeriod = (matches[1][2] || startPeriod || '').toUpperCase();
        const days = value.slice(0, matches[0].index).trim();
        const start = formatClockValue(matches[0][1], startPeriod || endPeriod);
        const end = formatClockValue(matches[1][1], endPeriod);
        const startMin = clockValueToMinutes(matches[0][1], startPeriod || endPeriod);
        let endMin = clockValueToMinutes(matches[1][1], endPeriod);
        if (endMin < startMin) {
            endMin += 24 * 60; // overnight class
        }
        return {
            days,
            start,
            end,
            label: `${start} - ${end}`,
            startMinutes: startMin,
            endMinutes: endMin
        };
    }

    function isClassScheduledToday(item, now = new Date()) {
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const fullDayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayIdx = now.getDay();
        const shortDay = dayNames[dayIdx].toUpperCase();
        const fullDay = fullDayNames[dayIdx].toUpperCase();

        // 1. Check dailySchedules array if present
        const dailyList = item.dailySchedules || item.rawSection?.dailySchedules;
        if (Array.isArray(dailyList) && dailyList.length > 0) {
            const match = dailyList.find(d => {
                if (!d || d.active === false) return false;
                const dName = String(d.day || '').trim().toUpperCase();
                return dName === shortDay || dName === fullDay || dName.startsWith(shortDay);
            });
            if (match) return true;
            const hasAnyActive = dailyList.some(d => d && d.active !== false && d.startTime && d.endTime);
            if (hasAnyActive) return false;
        }

        // 2. Check days array if present
        const daysArr = item.days || item.rawSection?.days;
        if (Array.isArray(daysArr) && daysArr.length > 0) {
            const hasToday = daysArr.some(d => {
                const str = String(d || '').trim().toUpperCase();
                return str === shortDay || str === fullDay || str.startsWith(shortDay);
            });
            if (hasToday) return true;
            return false;
        }

        // 3. String-based days check
        const rawString = [
            item.daysFormatted,
            item.schedule?.days,
            item.scheduleInfo?.days,
            item.rawSchedule,
            typeof item.schedule === 'string' ? item.schedule : ''
        ].filter(Boolean).join(' ').toUpperCase();

        const hasAnyDayMentioned = /(?:MON|TUE|WED|THU|FRI|SAT|SUN|DAILY|EVERYDAY)/i.test(rawString);
        if (!hasAnyDayMentioned) {
            // Default to school weekdays (Mon-Fri) if no day names mentioned
            return dayIdx >= 1 && dayIdx <= 5;
        }

        if (rawString.includes('DAILY') || rawString.includes('EVERYDAY') || rawString.includes('ALL DAYS')) {
            return true;
        }

        if (/MON(?:DAY)?\s*[-–—]\s*FRI(?:DAY)?/i.test(rawString)) {
            return dayIdx >= 1 && dayIdx <= 5;
        }
        if (/MON(?:DAY)?\s*[-–—]\s*SAT(?:URDAY)?/i.test(rawString)) {
            return dayIdx >= 1 && dayIdx <= 6;
        }

        if (rawString.includes(shortDay) || rawString.includes(fullDay)) {
            return true;
        }

        if (shortDay === 'TUE' && (/\bT\b/i.test(rawString) || rawString.includes('TUE'))) return true;
        if (shortDay === 'THU' && (/\bTH\b/i.test(rawString) || rawString.includes('THU'))) return true;

        return false;
    }

    function getClassTimeForToday(item, now = new Date()) {
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const shortDay = dayNames[now.getDay()].toUpperCase();

        const dailyList = item.dailySchedules || item.rawSection?.dailySchedules;
        if (Array.isArray(dailyList) && dailyList.length > 0) {
            const todaySlot = dailyList.find(d => {
                if (!d || d.active === false) return false;
                const dName = String(d.day || '').trim().toUpperCase();
                return dName === shortDay || dName.startsWith(shortDay);
            });
            if (todaySlot && todaySlot.startTime && todaySlot.endTime) {
                const sMin = clockValueToMinutes(todaySlot.startTime);
                let eMin = clockValueToMinutes(todaySlot.endTime);
                if (eMin < sMin) eMin += 24 * 60;
                return {
                    startMinutes: sMin,
                    endMinutes: eMin,
                    start: formatClockValue(todaySlot.startTime),
                    end: formatClockValue(todaySlot.endTime),
                    label: `${formatClockValue(todaySlot.startTime)} - ${formatClockValue(todaySlot.endTime)}`
                };
            }
        }

        const sched = item.scheduleInfo || item.schedule;
        if (sched && typeof sched === 'object' && sched.endMinutes) {
            return {
                startMinutes: sched.startMinutes || 0,
                endMinutes: sched.endMinutes,
                start: sched.start || '',
                end: sched.end || '',
                label: sched.label || `${sched.start || ''} - ${sched.end || ''}`.trim()
            };
        }

        const raw = item.rawSchedule || (typeof item.schedule === 'string' ? item.schedule : '') || (item.startTime && item.endTime ? `${item.startTime} - ${item.endTime}` : '') || (item.schedule?.label || '') || (item.scheduleInfo?.label || '');
        return parseClassSchedule(raw);
    }

    function filterUpcomingClasses(classes, limit = 2) {
        if (!Array.isArray(classes) || !classes.length) return [];
        const now = new Date();
        const nowMinutes = (now.getHours() * 60) + now.getMinutes();

        // 1. Filter classes scheduled for TODAY (current 24-hour cycle)
        const todayClasses = classes.filter(item => isClassScheduledToday(item, now));
        if (!todayClasses.length) return [];

        // 2. Filter out classes that have ALREADY ENDED today
        // If endMinutes <= nowMinutes, the class has ended and should be gone now.
        // It resets at 12:00 AM (midnight) when nowMinutes becomes 0 for the next 24-hour cycle.
        const upcoming = todayClasses
            .map(item => {
                const schedule = getClassTimeForToday(item, now);
                return {
                    ...item,
                    schedule,
                    scheduleInfo: schedule
                };
            })
            .filter(item => {
                const endMin = item.schedule?.endMinutes;
                if (!endMin) return true;
                return endMin > nowMinutes;
            })
            .sort((a, b) => (a.schedule?.startMinutes || 0) - (b.schedule?.startMinutes || 0) || (a.name || a.subject || '').localeCompare(b.name || b.subject || ''));

        return typeof limit === 'number' ? upcoming.slice(0, limit) : upcoming;
    }

    // Expose globally
    global.formatClockValue = formatClockValue;
    global.clockValueToMinutes = clockValueToMinutes;
    global.parseClassSchedule = parseClassSchedule;
    global.isClassScheduledToday = isClassScheduledToday;
    global.getClassTimeForToday = getClassTimeForToday;
    global.filterUpcomingClasses = filterUpcomingClasses;

    // ─── 1. CLASS PANEL RENDERER (SHARED) ─────────────────────────────────────
    function renderClassPanel(containerId, classes, options) {
        const container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
        if (!container) return;

        const opts = Object.assign({
            onClassClick: null,
            emptyTitle: 'No Classes Today',
            emptyMeta: 'Your classes will appear here once assigned.'
        }, options || {});

        const seenClassKeys = new Set();
        const deduplicatedClasses = (classes || []).filter(item => {
            if (!item) return false;
            const key = (item.id || '') + '_' + (item.name || item.subject || '') + '_' + (item.sectionName || item.section || '') + '_' + (item.time || (item.scheduleInfo && item.scheduleInfo.label) || (item.schedule && item.schedule.label) || '');
            if (seenClassKeys.has(key)) return false;
            seenClassKeys.add(key);
            return true;
        });

        if (deduplicatedClasses.length === 0) {
            container.innerHTML = `
                <div class="home-dashboard-card home-dashboard-card--combined home-dashboard-card--class">
                    <div class="home-dashboard-item">
                        <span class="home-dashboard-panel-title">
                            <i class="fa-solid fa-door-open"></i>Next Class
                        </span>
                        <p class="home-dashboard-empty-text">No Next Class</p>
                    </div>
                </div>
            `;
            return;
        }

        const now = new Date();
        const nowMinutes = (now.getHours() * 60) + now.getMinutes();

        const normalized = deduplicatedClasses.map(item => {
            const sched = (item.scheduleInfo && typeof item.scheduleInfo === 'object')
                ? item.scheduleInfo
                : ((item.schedule && typeof item.schedule === 'object')
                    ? item.schedule
                    : (typeof getClassTimeForToday === 'function' ? getClassTimeForToday(item, now) : null));
            const rawSchedStr = (item.scheduleInfo && item.scheduleInfo.label)
                || (item.schedule && item.schedule.label)
                || (typeof item.schedule === 'string' ? item.schedule : '')
                || (sched && sched.label)
                || '';
            const finalSched = (sched && typeof sched.startMinutes === 'number')
                ? sched
                : (typeof parseClassSchedule === 'function' ? parseClassSchedule(rawSchedStr) : null);

            return {
                name:    item.name || item.subject || '',
                section: item.sectionName || item.section || '',
                room:    item.room || '',
                time:    (finalSched && finalSched.label) ? finalSched.label : rawSchedStr,
                schedule: finalSched,
                _raw: item
            };
        });

        const firstIsOngoing = Boolean(
            normalized[0] &&
            normalized[0].schedule &&
            typeof normalized[0].schedule.startMinutes === 'number' &&
            typeof normalized[0].schedule.endMinutes === 'number' &&
            nowMinutes >= normalized[0].schedule.startMinutes &&
            nowMinutes < normalized[0].schedule.endMinutes
        );
        const visibleClasses = firstIsOngoing ? normalized.slice(0, 2) : normalized.slice(0, 1);
        let itemsHtml = visibleClasses.map((item, index) => {
            const isOngoing = index === 0 && firstIsOngoing;
            const label = isOngoing ? 'Ongoing Class' : 'Next Class';
            const iconCls = 'fa-solid fa-door-open';
            return `
                <div class="home-dashboard-item ${index > 0 ? 'pt-3' : 'pb-3'}">
                    <span class="home-dashboard-panel-title">
                        <i class="${iconCls}"></i>${label}
                    </span>
                    <button
                        type="button"
                        class="home-dashboard-subject-link sigma-panel-class-btn"
                        data-panel-class-index="${index}"
                    >
                        ${_esc(item.name)}
                    </button>
                    <span class="home-dashboard-card__meta">
                        <i class="fa-solid fa-users"></i>${_esc(item.section)}
                    </span>
                    <span class="home-dashboard-card__meta">
                        <i class="fa-solid fa-door-closed"></i>${_esc(item.room)}
                    </span>
                    <span class="home-dashboard-card__time">
                        <i class="fa-solid fa-clock"></i>${_esc(item.time)}
                    </span>
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <div class="home-dashboard-card home-dashboard-card--combined home-dashboard-card--class">
                ${itemsHtml}
            </div>
        `;

        if (typeof opts.onClassClick === 'function') {
            container.querySelectorAll('.sigma-panel-class-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = parseInt(btn.dataset.panelClassIndex, 10);
                    opts.onClassClick(normalized[idx]._raw, idx);
                });
            });
        }
    }

    // ─── 2. TEACHER SUBMISSIONS PANEL RENDERER ────────────────────────────────
    function renderTeacherSubmissionsPanel(containerId, submissionGroups, options) {
        const container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
        if (!container) return;

        const opts = Object.assign({
            onActivityClick: null,
            limit: 3,
            isRoomPage: false,
            hideSubjectHeader: false,
            hideSection: false
        }, options || {});

        const isRoom = Boolean(opts.isRoomPage || opts.hideSubjectHeader);

        if (!submissionGroups || submissionGroups.length === 0) {
            container.innerHTML = `
                <div class="home-dashboard-card home-dashboard-card--combined">
                    <div class="home-dashboard-item">
                        <span class="home-dashboard-panel-title">
                            <i class="fa-solid fa-inbox"></i>Pending Submissions
                        </span>
                        <p class="home-dashboard-empty-text">No Pending Submissions</p>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = '';

        const seenGroupIds = new Set();
        const deduplicatedGroups = [];

        submissionGroups.forEach(group => {
            if (!group) return;
            const gKey = group.subjectId || group.subjectName || group.subject || 'unknown';
            if (seenGroupIds.has(gKey)) return;
            seenGroupIds.add(gKey);

            const seenActKeys = new Set();
            const uniqueActivities = (group.activities || []).filter(act => {
                if (!act) return false;
                const actKey = (act.id || '') + '_' + (act.activity || act.title || '') + '_' + (act.sectionName || act.section || '');
                if (seenActKeys.has(actKey)) return false;
                seenActKeys.add(actKey);
                return true;
            });

            deduplicatedGroups.push(Object.assign({}, group, { activities: uniqueActivities }));
        });

        if (deduplicatedGroups.length === 0) return;

        // ── Room Page Mode: Flat activity list with no subject accordion dropdown and no section label ──
        if (isRoom) {
            const allActivities = [];
            deduplicatedGroups.forEach(group => {
                (group.activities || []).forEach(act => {
                    allActivities.push(Object.assign({}, act, {
                        subjectId: act.subjectId || group.subjectId
                    }));
                });
            });

            if (allActivities.length === 0) {
                container.innerHTML = `
                    <div class="home-dashboard-card home-dashboard-card--combined">
                        <div class="home-dashboard-item">
                            <span class="home-dashboard-panel-title">
                                <i class="fa-solid fa-inbox"></i>Pending Submissions
                            </span>
                            <p class="home-dashboard-empty-text">No Pending Submissions</p>
                        </div>
                    </div>
                `;
                return;
            }

            const card = document.createElement('div');
            card.className = 'home-dashboard-card home-dashboard-card--combined';

            const heading = document.createElement('h3');
            heading.className = 'home-dashboard-panel-title home-dashboard-panel-heading';
            heading.innerHTML = '<i class="fa-solid fa-inbox"></i>Pending Submissions';
            card.appendChild(heading);

            const limit = opts.limit || 4;
            allActivities.forEach((act, actIdx) => {
                const item = document.createElement('div');
                item.className = 'home-dashboard-item' + (actIdx >= limit ? ' is-extra-item is-extra-pending-item' : '');

                const actHeader = document.createElement('div');
                actHeader.className = 'home-dashboard-activity-header';

                const actBtn = document.createElement('button');
                actBtn.type = 'button';
                actBtn.className = 'home-dashboard-activity-link';
                actBtn.textContent = act.activity || act.title || 'Untitled';
                actBtn.dataset.subjectId = act.subjectId;
                actBtn.dataset.topicIdx = act.topicIdx !== undefined ? act.topicIdx : 0;
                actBtn.dataset.tab = act.tab || 'activity';
                actBtn.dataset.itemIdx = act.itemIdx !== undefined ? act.itemIdx : 0;

                actBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (typeof opts.onActivityClick === 'function') {
                        opts.onActivityClick(act, null);
                    }
                });

                const countVal = act.submissionCount || 1;
                const countSpan = document.createElement('span');
                countSpan.className = 'home-dashboard-activity-count';
                countSpan.textContent = countVal;

                actHeader.appendChild(actBtn);
                actHeader.appendChild(countSpan);

                let subDate = act.submittedOn ? new Date(act.submittedOn) : null;
                if (!subDate || Number.isNaN(subDate.getTime())) {
                    subDate = new Date();
                }
                const timeText = formatRelativeTime(subDate, 'submitted');

                const timeSpan = document.createElement('span');
                timeSpan.className = 'home-dashboard-activity-time';
                timeSpan.innerHTML = `<i class="fa-solid fa-clock"></i>${_esc(timeText)}`;

                item.appendChild(actHeader);
                item.appendChild(timeSpan);
                card.appendChild(item);
            });

            if (allActivities.length > limit) {
                const extraCount = allActivities.length - limit;
                const moreBtn = document.createElement('button');
                moreBtn.type = 'button';
                moreBtn.className = 'home-dashboard-more-btn';
                moreBtn.dataset.extraCount = extraCount;
                moreBtn.innerHTML = `<span>+${extraCount} more</span><i class="fa-solid fa-chevron-down"></i>`;

                moreBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isShowing = card.classList.toggle('is-showing-all-pending');
                    moreBtn.innerHTML = isShowing 
                        ? `<span>Show less</span><i class="fa-solid fa-chevron-up"></i>` 
                        : `<span>+${extraCount} more</span><i class="fa-solid fa-chevron-down"></i>`;
                });

                card.appendChild(moreBtn);
            }

            container.appendChild(card);
            return;
        }

        const card = document.createElement('div');
        card.className = 'home-dashboard-card home-dashboard-card--combined';

        const heading = document.createElement('h3');
        heading.className = 'home-dashboard-panel-title home-dashboard-panel-heading';
        heading.innerHTML = '<i class="fa-solid fa-inbox"></i>Pending Submissions';
        card.appendChild(heading);

        deduplicatedGroups.forEach(group => {
            const item = document.createElement('div');
            item.className = 'home-dashboard-item';

            const totalSubjectSubmissions = group.activities.reduce((sum, act) => {
                const count = act.submissionCount || 1;
                return sum + count;
            }, 0);

            // Subject row with toggle and badge
            const subjectBtn = document.createElement('button');
            subjectBtn.type = 'button';
            subjectBtn.className = 'home-dashboard-subject-link home-dashboard-subject-toggle is-collapsed';
            subjectBtn.dataset.toggleSubject = group.subjectId;

            const nameSpan = document.createElement('span');
            nameSpan.textContent = group.subjectName;

            const rightSide = document.createElement('div');
            rightSide.className = 'home-dashboard-subject-toggle-right';

            if (totalSubjectSubmissions > 0) {
                const badge = document.createElement('span');
                badge.className = 'home-dashboard-subject-badge';
                badge.textContent = totalSubjectSubmissions;
                rightSide.appendChild(badge);
            }

            const chevronIcon = document.createElement('i');
            chevronIcon.className = 'fa-solid fa-chevron-down home-dashboard-chevron';
            rightSide.appendChild(chevronIcon);

            subjectBtn.appendChild(nameSpan);
            subjectBtn.appendChild(rightSide);
            item.appendChild(subjectBtn);

            // Activity list container (collapsed by default)
            const actList = document.createElement('div');
            actList.className = 'home-dashboard-activity-list is-collapsed';
            actList.id = 'activity-list-' + group.subjectId;

            subjectBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isCollapsed = actList.classList.toggle('is-collapsed');
                subjectBtn.classList.toggle('is-collapsed', isCollapsed);
            });

            const limit = opts.limit || 3;
            group.activities.forEach((act, actIdx) => {
                const actItem = document.createElement('div');
                actItem.className = 'home-dashboard-activity-item' + (actIdx >= limit ? ' is-extra-item' : '');

                const actHeader = document.createElement('div');
                actHeader.className = 'home-dashboard-activity-header';

                const actBtn = document.createElement('button');
                actBtn.type = 'button';
                actBtn.className = 'home-dashboard-activity-link';
                actBtn.textContent = act.activity || act.title || 'Untitled';
                actBtn.dataset.subjectId = act.subjectId || group.subjectId;
                actBtn.dataset.topicIdx = act.topicIdx !== undefined ? act.topicIdx : 0;
                actBtn.dataset.tab = act.tab || 'activity';
                actBtn.dataset.itemIdx = act.itemIdx !== undefined ? act.itemIdx : 0;

                actBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (typeof opts.onActivityClick === 'function') {
                        opts.onActivityClick(act, group);
                    }
                });

                const countVal = act.submissionCount || 1;
                const countSpan = document.createElement('span');
                countSpan.className = 'home-dashboard-activity-count';
                countSpan.textContent = countVal;

                actHeader.appendChild(actBtn);
                actHeader.appendChild(countSpan);

                const sectionSpan = document.createElement('span');
                sectionSpan.className = 'home-dashboard-activity-section';
                sectionSpan.innerHTML = `<i class="fa-solid fa-users"></i>${_esc(act.sectionName || act.section || 'Grade 11 - STEM A')}`;

                let subDate = act.submittedOn ? new Date(act.submittedOn) : null;
                if (!subDate || Number.isNaN(subDate.getTime())) {
                    subDate = new Date();
                }
                const timeText = formatRelativeTime(subDate, 'submitted');

                const timeSpan = document.createElement('span');
                timeSpan.className = 'home-dashboard-activity-time';
                timeSpan.innerHTML = `<i class="fa-solid fa-clock"></i>${_esc(timeText)}`;

                actItem.appendChild(actHeader);
                if (!opts.hideSection) {
                    actItem.appendChild(sectionSpan);
                }
                actItem.appendChild(timeSpan);
                actList.appendChild(actItem);
            });

            if (group.activities.length > limit) {
                const extraCount = group.activities.length - limit;
                const moreBtn = document.createElement('button');
                moreBtn.type = 'button';
                moreBtn.className = 'home-dashboard-more-btn';
                moreBtn.dataset.extraCount = extraCount;
                moreBtn.innerHTML = `<span>+${extraCount} more</span><i class="fa-solid fa-chevron-down"></i>`;

                moreBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isShowing = actList.classList.toggle('is-showing-all');
                    moreBtn.innerHTML = isShowing 
                        ? `<span>Show less</span><i class="fa-solid fa-chevron-up"></i>` 
                        : `<span>+${extraCount} more</span><i class="fa-solid fa-chevron-down"></i>`;
                });

                actList.appendChild(moreBtn);
            }

            item.appendChild(actList);
            card.appendChild(item);
        });

        container.appendChild(card);
    }

    // ─── 3. STUDENT SUBMISSIONS PANEL RENDERER ────────────────────────────────
    function formatAssessmentTimeLabel(dueDate, startDate, startTime) {
        if (dueDate && dueDate !== '-' && dueDate !== 'none' && dueDate !== 'no-deadline' && dueDate !== 'null' && dueDate !== 'undefined' && String(dueDate).toLowerCase() !== 'no deadline' && String(dueDate).toLowerCase() !== 'no due date') {
            const rel = formatRelativeTime(dueDate);
            if (rel) return rel;
        }
        return 'No Due Date';
    }

    function renderStudentSubmissionsPanel(containerId, data, options) {
        const container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
        if (!container) return;

        const opts = Object.assign({
            onItemClick: null,
            onSubjectClick: null,
            limit: 5,
            isRoomPage: false,
            hideSubject: false
        }, options || {});

        const hideSubject = Boolean(opts.isRoomPage || opts.hideSubject);

        const d = data || {};
        const isSubmittedItem = (row) => {
            if (!row) return true;
            if (row.submittedOn || row.gradedOn || row.isSubmitted) return true;
            const st = String(row.status || '').toLowerCase().trim();
            if (st === 'submitted' || st === 'graded' || st === 'pending' || st === 'waiting' || st === 'completed') return true;
            if (row.score !== null && row.score !== undefined && row.score !== '' && row.score !== '--') return true;
            return false;
        };

        const rawOverdue = (Array.isArray(d.overdueItems) ? d.overdueItems : []).filter(r => !isSubmittedItem(r));
        const rawDue = (Array.isArray(d.dueItems) ? d.dueItems : []).filter(r => !isSubmittedItem(r));
        const rawUpcoming = (Array.isArray(d.upcomingItems) ? d.upcomingItems : []).filter(r => !isSubmittedItem(r));

        const seenOverdueKeys = new Set();
        const overdueItems = rawOverdue.filter(row => {
            if (!row || isSubmittedItem(row)) return false;
            const key = (row.id || '') + '_' + (row.subjectId || '') + '_' + (row.topicIdx || 0) + '_' + (row.tab || '') + '_' + (row.itemIdx || '') + '_' + (row.activity || row.title || '');
            if (seenOverdueKeys.has(key)) return false;
            seenOverdueKeys.add(key);
            return true;
        });

        const seenDueKeys = new Set();
        const dueItems = rawDue.filter(row => {
            if (!row || isSubmittedItem(row)) return false;
            const key = (row.id || '') + '_' + (row.subjectId || '') + '_' + (row.topicIdx || 0) + '_' + (row.tab || '') + '_' + (row.itemIdx || '') + '_' + (row.activity || row.title || '');
            if (seenOverdueKeys.has(key) || seenDueKeys.has(key)) return false;
            seenDueKeys.add(key);
            return true;
        });

        const seenUpcomingKeys = new Set();
        const upcomingItems = rawUpcoming.filter(row => {
            if (!row || isSubmittedItem(row)) return false;
            const key = (row.id || '') + '_' + (row.subjectId || '') + '_' + (row.topicIdx || 0) + '_' + (row.tab || '') + '_' + (row.itemIdx || '') + '_' + (row.activity || row.title || '');
            if (seenOverdueKeys.has(key) || seenDueKeys.has(key) || seenUpcomingKeys.has(key)) return false;
            seenUpcomingKeys.add(key);
            return true;
        });

        const limit = opts.limit || 5;

        if (overdueItems.length === 0 && dueItems.length === 0 && upcomingItems.length === 0) {
            container.innerHTML = `
                <div class="home-dashboard-card home-dashboard-card--combined">
                    <div class="home-dashboard-item pb-3">
                        <span class="home-dashboard-panel-title">
                            <i class="fa-solid fa-triangle-exclamation"></i>Due Submissions
                        </span>
                        <p class="home-dashboard-empty-text">No Due Submissions</p>
                    </div>
                    <div class="home-dashboard-item pt-3">
                        <span class="home-dashboard-panel-title">
                            <i class="fa-solid fa-calendar-days"></i>Upcoming Due
                        </span>
                        <p class="home-dashboard-empty-text">No Upcoming Due</p>
                    </div>
                </div>
            `;
            return;
        }

        const card = document.createElement('div');
        card.className = 'home-dashboard-card home-dashboard-card--combined';

        // ── Section 0: Overdue Submissions (ONLY appears if overdue items exist) ──
        if (overdueItems.length > 0) {
            const overdueHeading = document.createElement('h3');
            overdueHeading.className = 'home-dashboard-panel-title home-dashboard-panel-heading home-dashboard-panel-heading--overdue';
            overdueHeading.innerHTML = '<i class="fa-solid fa-circle-exclamation home-dashboard-title-icon--overdue"></i>Overdue Submissions';
            card.appendChild(overdueHeading);

            overdueItems.forEach((row, idx) => {
                const item = document.createElement('div');
                item.className = 'home-dashboard-item' + (idx >= limit ? ' is-extra-item is-extra-overdue-item' : '');

                const titleBtn = document.createElement('button');
                titleBtn.type = 'button';
                titleBtn.className = 'home-dashboard-assessment-btn';
                titleBtn.dataset.homeAssessmentSubject = row.subjectId;
                titleBtn.dataset.homeAssessmentTopic = row.topicIdx;
                titleBtn.dataset.homeAssessmentTab = row.tab || 'activity';
                titleBtn.dataset.homeAssessmentItem = row.itemIdx !== undefined ? row.itemIdx : '';
                titleBtn.textContent = row.activity || row.title || 'Untitled';

                if (typeof opts.onItemClick === 'function') {
                    titleBtn.addEventListener('click', () => opts.onItemClick(row));
                }

                const subjectEl = document.createElement('span');
                subjectEl.className = 'home-dashboard-subject-label home-dashboard-subject-label--meta text-xs text-black-fade';
                subjectEl.textContent = row.subject || row.subjectName || '';

                const timeSpan = document.createElement('span');
                timeSpan.className = 'home-dashboard-card__time home-dashboard-card__time--overdue';
                timeSpan.innerHTML = '<i class="fa-solid fa-clock home-dashboard-time-icon--overdue"></i>';
                timeSpan.append(formatRelativeTime(row.dueDate, 'overdue'));

                item.appendChild(titleBtn);
                if (!hideSubject) {
                    item.appendChild(subjectEl);
                }
                item.appendChild(timeSpan);
                card.appendChild(item);
            });

            if (overdueItems.length > limit) {
                const extraCount = overdueItems.length - limit;
                const moreBtn = document.createElement('button');
                moreBtn.type = 'button';
                moreBtn.className = 'home-dashboard-more-btn';
                moreBtn.innerHTML = `<span>+${extraCount} more</span><i class="fa-solid fa-chevron-down"></i>`;
                moreBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isShowing = card.classList.toggle('is-showing-all-overdue');
                    moreBtn.innerHTML = isShowing 
                        ? `<span>Show less</span><i class="fa-solid fa-chevron-up"></i>` 
                        : `<span>+${extraCount} more</span><i class="fa-solid fa-chevron-down"></i>`;
                });
                card.appendChild(moreBtn);
            }
        }

        // ── Section 1: Due Submissions ──
        const dueHeading = document.createElement('h3');
        dueHeading.className = 'home-dashboard-panel-title home-dashboard-panel-heading' + (overdueItems.length > 0 ? ' home-dashboard-panel-heading--spaced' : '');
        dueHeading.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>Due Submissions';
        card.appendChild(dueHeading);

        if (dueItems.length > 0) {
            dueItems.forEach((row, idx) => {
                const item = document.createElement('div');
                item.className = 'home-dashboard-item' + (idx >= limit ? ' is-extra-item is-extra-due-item' : '');

                const titleBtn = document.createElement('button');
                titleBtn.type = 'button';
                titleBtn.className = 'home-dashboard-assessment-btn';
                titleBtn.dataset.homeAssessmentSubject = row.subjectId;
                titleBtn.dataset.homeAssessmentTopic = row.topicIdx;
                titleBtn.dataset.homeAssessmentTab = row.tab || 'activity';
                titleBtn.dataset.homeAssessmentItem = row.itemIdx !== undefined ? row.itemIdx : '';
                titleBtn.textContent = row.activity || row.title || 'Untitled';

                if (typeof opts.onItemClick === 'function') {
                    titleBtn.addEventListener('click', () => opts.onItemClick(row));
                }

                const subjectEl = document.createElement('span');
                subjectEl.className = 'home-dashboard-subject-label home-dashboard-subject-label--meta text-xs text-black-fade';
                subjectEl.textContent = row.subject || row.subjectName || '';

                const timeSpan = document.createElement('span');
                timeSpan.className = 'home-dashboard-card__time home-dashboard-card__time--due';
                timeSpan.innerHTML = '<i class="fa-solid fa-clock home-dashboard-time-icon--due"></i>';
                const dueText = formatAssessmentTimeLabel(row.dueDate, row.startDate, row.startTime);
                timeSpan.append(dueText || 'Due Soon');

                item.appendChild(titleBtn);
                if (!hideSubject) {
                    item.appendChild(subjectEl);
                }
                item.appendChild(timeSpan);
                card.appendChild(item);
            });

            if (dueItems.length > limit) {
                const extraCount = dueItems.length - limit;
                const moreBtn = document.createElement('button');
                moreBtn.type = 'button';
                moreBtn.className = 'home-dashboard-more-btn';
                moreBtn.innerHTML = `<span>+${extraCount} more</span><i class="fa-solid fa-chevron-down"></i>`;
                moreBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isShowing = card.classList.toggle('is-showing-all-due');
                    moreBtn.innerHTML = isShowing 
                        ? `<span>Show less</span><i class="fa-solid fa-chevron-up"></i>` 
                        : `<span>+${extraCount} more</span><i class="fa-solid fa-chevron-down"></i>`;
                });
                card.appendChild(moreBtn);
            }
        } else {
            const empty = document.createElement('div');
            empty.className = 'home-dashboard-item';
            const m = document.createElement('p');
            m.className = 'home-dashboard-empty-text';
            m.textContent = 'No Due Submissions';
            empty.appendChild(m);
            card.appendChild(empty);
        }

        // ── Section 2: Upcoming Submissions ──
        const upcomingHeading = document.createElement('h3');
        upcomingHeading.className = 'home-dashboard-panel-title home-dashboard-panel-heading home-dashboard-panel-heading--spaced';
        upcomingHeading.innerHTML = '<i class="fa-solid fa-calendar-days"></i>Upcoming Due';
        card.appendChild(upcomingHeading);

        if (upcomingItems.length > 0) {
            upcomingItems.forEach((row, idx) => {
                const item = document.createElement('div');
                item.className = 'home-dashboard-item' + (idx >= limit ? ' is-extra-item is-extra-upcoming-item' : '');

                const titleBtn = document.createElement('button');
                titleBtn.type = 'button';
                titleBtn.className = 'home-dashboard-assessment-btn';
                titleBtn.dataset.homeAssessmentSubject = row.subjectId;
                titleBtn.dataset.homeAssessmentTopic = row.topicIdx;
                titleBtn.dataset.homeAssessmentTab = row.tab || 'activity';
                titleBtn.dataset.homeAssessmentItem = row.itemIdx !== undefined ? row.itemIdx : '';
                titleBtn.textContent = row.activity || row.title || 'Untitled';

                if (typeof opts.onItemClick === 'function') {
                    titleBtn.addEventListener('click', () => opts.onItemClick(row));
                }

                const subjectEl = document.createElement('span');
                subjectEl.className = 'home-dashboard-subject-label home-dashboard-subject-label--meta text-xs text-black-fade';
                subjectEl.textContent = row.subject || row.subjectName || '';

                const timeSpan = document.createElement('span');
                timeSpan.className = 'home-dashboard-card__time home-dashboard-card__time--upcoming';
                timeSpan.innerHTML = '<i class="fa-solid fa-clock home-dashboard-time-icon--upcoming"></i>';
                const upcomingText = formatAssessmentTimeLabel(row.dueDate, row.startDate, row.startTime);
                timeSpan.append(upcomingText || 'No Due Date');

                item.appendChild(titleBtn);
                if (!hideSubject) {
                    item.appendChild(subjectEl);
                }
                item.appendChild(timeSpan);
                card.appendChild(item);
            });

            if (upcomingItems.length > limit) {
                const extraCount = upcomingItems.length - limit;
                const moreBtn = document.createElement('button');
                moreBtn.type = 'button';
                moreBtn.className = 'home-dashboard-more-btn';
                moreBtn.innerHTML = `<span>+${extraCount} more</span><i class="fa-solid fa-chevron-down"></i>`;
                moreBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isShowing = card.classList.toggle('is-showing-all-upcoming');
                    moreBtn.innerHTML = isShowing 
                        ? `<span>Show less</span><i class="fa-solid fa-chevron-up"></i>` 
                        : `<span>+${extraCount} more</span><i class="fa-solid fa-chevron-down"></i>`;
                });
                card.appendChild(moreBtn);
            }
        } else {
            const empty = document.createElement('div');
            empty.className = 'home-dashboard-item';
            const m = document.createElement('p');
            m.className = 'home-dashboard-empty-text';
            m.textContent = 'No Upcoming Due';
            empty.appendChild(m);
            card.appendChild(empty);
        }

        container.innerHTML = '';
        container.appendChild(card);
    }

    // ─── 4. TO DO PANEL RENDERER (SHARED) ─────────────────────────────────────
    function renderTodoPanel(containerId, data, options) {
        const container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
        if (!container) return;

        const opts = Object.assign({
            showDate: false,
            onItemClick: null,
            onSubjectClick: null
        }, options || {});

        const d = data || {};

        // Extract array or count for each category
        const categories = [
            {
                key: 'assignments',
                label: 'Assignments',
                icon: 'fa-solid fa-clipboard-list',
                items: Array.isArray(d.assignments) ? d.assignments : [],
                count: Array.isArray(d.assignments) ? d.assignments.length : (d.assignmentCount || d.assignments || 0)
            },
            {
                key: 'quizzes',
                label: 'Quizzes',
                icon: 'fa-solid fa-clipboard-question',
                items: Array.isArray(d.quizzes) ? d.quizzes : [],
                count: Array.isArray(d.quizzes) ? d.quizzes.length : (d.quizCount || d.quizzes || 0)
            },
            {
                key: 'activities',
                label: 'Activities',
                icon: 'fa-solid fa-clipboard',
                items: Array.isArray(d.activities) ? d.activities : [],
                count: Array.isArray(d.activities) ? d.activities.length : (d.activityCount || d.activities || 0)
            }
        ];

        // Include performance tasks if items exist or count > 0
        const perfItems = Array.isArray(d.performanceTasks) ? d.performanceTasks : [];
        const perfCount = Array.isArray(d.performanceTasks) ? d.performanceTasks.length : (d.performanceTaskCount || d.performanceTasks || 0);
        if (perfCount > 0 || (d.performanceTasks !== undefined && d.performanceTaskCount !== undefined)) {
            categories.push({
                key: 'performanceTasks',
                label: 'Performance Tasks',
                icon: 'fa-solid fa-clipboard-user',
                items: perfItems,
                count: perfCount
            });
        }

        const totalCount = categories.reduce((sum, c) => sum + (c.count || 0), 0);
        if (totalCount === 0) {
            container.innerHTML = `
                <div class="home-dashboard-card">
                    <div class="home-dashboard-item">
                        <span class="home-dashboard-card__eyebrow" style="color:#15803d;">
                            <i class="fa-solid fa-list-check" style="margin-right:4px;font-size:0.6rem;color:#15803d;"></i>Tasks
                        </span>
                        <h4 class="text-sm font-semibold text-black-fade mt-1 mb-0">${opts.emptyTitle || 'No Tasks To Do'}</h4>
                    </div>
                </div>
            `;
            return;
        }

        const dateHtml = opts.showDate && opts.date ? `<span class="ml-auto text-[10px] text-slate-400 font-normal">${_esc(opts.date)}</span>` : '';

        const card = document.createElement('div');
        card.className = 'home-dashboard-card home-dashboard-card--tasks flex flex-col relative select-none';

        const header = document.createElement('div');
        header.className = 'w-full flex items-center justify-between pb-3 border-b border-slate-200';
        header.innerHTML = `
            <span class="home-dashboard-panel-title">
                <i class="fa-solid fa-list-check"></i>Tasks
            </span>
            ${dateHtml}
        `;
        card.appendChild(header);

        const body = document.createElement('div');
        body.className = 'w-full flex flex-col divide-y divide-slate-100';

        categories.forEach((cat) => {
            const group = document.createElement('div');
            group.className = 'home-dashboard-todo-category py-2.5 w-full';

            const isClickable = cat.count > 0 && cat.items.length > 0;
            const toggleBtn = document.createElement(isClickable ? 'button' : 'div');
            if (isClickable) {
                toggleBtn.type = 'button';
            }
            toggleBtn.className = `w-full flex items-center justify-between text-left bg-transparent border-0 p-0 ${
                isClickable ? 'cursor-pointer group/todo' : 'cursor-default'
            }`;

            toggleBtn.innerHTML = `
                <div class="flex items-center gap-2.5">
                    <i class="${cat.icon} home-dashboard-todo-icon text-[12px] w-4 text-center shrink-0"></i>
                    <span class="home-dashboard-todo-label transition-colors">${_esc(cat.label)}</span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="home-dashboard-todo-badge">
                        ${cat.count}
                    </span>
                    ${isClickable ? '<i class="fa-solid fa-chevron-down text-[8px] transition-transform duration-200 home-dashboard-todo-chevron"></i>' : ''}
                </div>
            `;

            group.appendChild(toggleBtn);

            if (isClickable) {
                // Group items by subject with deduplication
                const subjectMap = {};
                const seenItemKeys = new Set();
                cat.items.forEach(item => {
                    if (!item) return;
                    const itemKey = (item.id || '') + '_' + (item.subjectId || '') + '_' + (item.topicIdx || 0) + '_' + (item.tab || '') + '_' + (item.itemIdx || '') + '_' + (item.activity || item.title || '');
                    if (seenItemKeys.has(itemKey)) return;
                    seenItemKeys.add(itemKey);

                    const sName = item.subject || item.subjectName || 'General';
                    const sId = item.subjectId || item.id || '';
                    if (!subjectMap[sName]) {
                        subjectMap[sName] = {
                            name: sName,
                            subjectId: sId,
                            topicIdx: item.topicIdx,
                            tab: item.tab || (cat.key === 'assignments' ? 'assignments' : cat.key === 'quizzes' ? 'quiz' : 'activity'),
                            itemIdx: item.itemIdx,
                            count: 0,
                            items: []
                        };
                    }
                    subjectMap[sName].count++;
                    subjectMap[sName].items.push(item);
                });
                const subjects = Object.values(subjectMap).filter(subj => subj && subj.count > 0);

                if (subjects.length === 0) return;

                const list = document.createElement('div');
                list.className = 'home-dashboard-todo-items hidden pl-4 pr-1 pt-2 space-y-1.5';

                subjects.forEach((subj) => {
                    const subjRow = document.createElement('div');
                    subjRow.className = 'flex items-center justify-between py-1.5 border-b border-gray-50 last:border-b-0';

                    const subjBtn = document.createElement('button');
                    subjBtn.type = 'button';
                    subjBtn.className = 'w-full flex items-center justify-between text-left bg-transparent border-0 p-0 cursor-pointer group/subj transition-colors';
                    
                    subjBtn.innerHTML = `
                        <span class="home-dashboard-todo-subj-name transition-colors line-clamp-1 truncate pr-2">
                            ${_esc(subj.name)}
                        </span>
                        <span class="home-dashboard-todo-badge">
                            ${subj.count}
                        </span>
                    `;

                    subjBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (typeof opts.onSubjectClick === 'function') {
                            opts.onSubjectClick(subj);
                        } else if (typeof window.showClassroomDetail === 'function') {
                            const cId = (typeof window.resolveStudentClassroomId === 'function')
                                ? window.resolveStudentClassroomId(subj)
                                : (subj.subjectId || subj.id || subj.name);
                            window.showClassroomDetail(cId);
                        } else if (typeof window.switchToTopicPage === 'function' && subj.subjectId) {
                            window.switchToTopicPage(subj.subjectId);
                        } else if (typeof window.openTopicContent === 'function' && subj.subjectId) {
                            const tIdx = subj.topicIdx !== undefined ? Number(subj.topicIdx) : 0;
                            const itmIdx = subj.itemIdx !== undefined && subj.itemIdx !== '' ? Number(subj.itemIdx) : null;
                            window.openTopicContent(subj.subjectId, tIdx, subj.tab, itmIdx);
                        }
                    });

                    subjRow.appendChild(subjBtn);
                    list.appendChild(subjRow);
                });

                group.appendChild(list);

                toggleBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isCollapsed = list.classList.toggle('hidden');
                    toggleBtn.classList.toggle('is-selected', !isCollapsed);
                    const chevron = toggleBtn.querySelector('.home-dashboard-todo-chevron');
                    if (chevron) {
                        chevron.style.transform = isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)';
                    }
                });
            }

            body.appendChild(group);
        });

        card.appendChild(body);
        container.innerHTML = '';
        container.appendChild(card);
    }

    // ─── 5. SIGMA INSIGHTS PANEL RENDERER ─────────────────────────────────────
    function renderSigmaPanel(containerId, items, options) {
        const container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
        if (!container) return;

        const opts = Object.assign({
            title: 'SIGMA',
            date: new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
        }, options || {});

        const rawItems = Array.isArray(items) ? items : [];
        const limited = rawItems.slice(0, 3);

        const card = document.createElement('div');
        card.className = 'home-dashboard-card home-dashboard-card--generic flex flex-col overflow-hidden relative select-none';

        const header = document.createElement('div');
        header.className = 'px-5 py-4 flex items-center border-b border-gray-50';

        const titleWrap = document.createElement('div');
        titleWrap.className = 'flex items-center gap-2';

        const icon = document.createElement('i');
        icon.className = 'fa-solid fa-bolt text-[#FFD000] text-[12px]';

        const h4 = document.createElement('h4');
        h4.className = 'text-[11px] font-black text-black tracking-widest uppercase';
        h4.textContent = opts.title;

        titleWrap.appendChild(icon);
        titleWrap.appendChild(h4);

        const dateSpan = document.createElement('span');
        dateSpan.className = 'ml-auto text-[10px] text-slate-400 font-normal';
        dateSpan.textContent = opts.date;

        header.appendChild(titleWrap);
        header.appendChild(dateSpan);

        const body = document.createElement('div');
        body.className = 'p-5';

        const list = document.createElement('div');
        list.className = 'space-y-4';

        if (limited.length === 0) {
            const emptyP = document.createElement('h4');
            emptyP.className = 'text-sm font-semibold text-black-fade mt-1 mb-0';
            emptyP.textContent = 'All current assessments are up to date.';
            list.appendChild(emptyP);
        } else {
            limited.forEach(text => {
                const row = document.createElement('div');
                row.className = 'flex items-start gap-3';

                const arrowIcon = document.createElement('i');
                arrowIcon.className = 'fa-solid fa-angle-right text-icc mt-1 text-[10px] shrink-0';

                const p = document.createElement('p');
                p.className = 'text-[11px] text-gray-700 leading-relaxed font-semibold';
                p.textContent = text;

                row.appendChild(arrowIcon);
                row.appendChild(p);
                list.appendChild(row);
            });
        }

        body.appendChild(list);
        card.appendChild(header);
        card.appendChild(body);

        container.innerHTML = '';
        container.appendChild(card);
    }

    // ─── 7. SHARED GLOBAL DIALOG ENGINE (ALERTS & CONFIRMATIONS) ───────────────
    function getOrCreateGlobalDialog() {
        let overlay = document.getElementById('sigma-global-dialog');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'sigma-global-dialog';
            overlay.className = 'sigma-dialog-overlay hidden';
            overlay.innerHTML = `
                <div class="sigma-dialog-card">
                    <button type="button" id="sigma-dialog-close" class="sigma-dialog-close-btn" title="Close / Cancel">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                    <div class="sigma-dialog-icon-wrap">
                        <i id="sigma-dialog-icon" class="fa-solid fa-user-shield"></i>
                    </div>
                    <h3 id="sigma-dialog-title" class="sigma-dialog-title">Title</h3>
                    <p id="sigma-dialog-desc" class="sigma-dialog-desc">Description</p>
                    <div id="sigma-dialog-actions" class="sigma-dialog-actions two-buttons">
                        <button type="button" id="sigma-dialog-cancel" class="sigma-dialog-btn-cancel">Cancel</button>
                        <button type="button" id="sigma-dialog-confirm" class="sigma-dialog-btn-confirm">Proceed</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
        }
        return overlay;
    }

    let _activeDialogCleanup = null;

    function showSigmaDialog(options) {
        let opts = {};
        if (typeof options === 'string') {
            opts = {
                title: arguments[0] || 'Confirmation',
                desc: arguments[1] || '',
                onConfirm: arguments[2],
                isNotification: arguments[3] || false,
                onCancel: arguments[4] || null
            };
        } else if (options && typeof options === 'object') {
            opts = { ...options };
        }

        const title = opts.title || opts.heading || (opts.isNotification ? 'Alert' : 'Confirmation');
        const desc = opts.desc || opts.message || opts.description || '';
        const icon = opts.icon || (opts.isNotification ? 'fa-solid fa-triangle-exclamation' : 'fa-solid fa-circle-question');
        const confirmText = opts.confirmText || opts.buttonText || (opts.isNotification ? 'OK' : 'Proceed');
        const cancelText = opts.cancelText || 'Cancel';
        const isNotification = !!opts.isNotification;
        const isDanger = !!opts.isDanger;
        const onConfirm = opts.onConfirm || opts.onProceed || opts.onOk;
        const onCancel = opts.onCancel;
        const onClose = opts.onClose;

        const overlay = getOrCreateGlobalDialog();
        const iconEl = overlay.querySelector('#sigma-dialog-icon') || overlay.querySelector('.sigma-dialog-icon-wrap i');
        const titleEl = overlay.querySelector('#sigma-dialog-title') || overlay.querySelector('.sigma-dialog-title');
        const descEl = overlay.querySelector('#sigma-dialog-desc') || overlay.querySelector('.sigma-dialog-desc');
        const actionsEl = overlay.querySelector('#sigma-dialog-actions') || overlay.querySelector('.sigma-dialog-actions');
        const confirmBtn = overlay.querySelector('#sigma-dialog-confirm') || overlay.querySelector('.sigma-dialog-btn-confirm');
        const cancelBtn = overlay.querySelector('#sigma-dialog-cancel') || overlay.querySelector('.sigma-dialog-btn-cancel');
        const closeBtn = overlay.querySelector('#sigma-dialog-close') || overlay.querySelector('.sigma-dialog-close-btn');

        if (_activeDialogCleanup) {
            _activeDialogCleanup();
        }

        if (iconEl) iconEl.className = icon;
        if (titleEl) titleEl.textContent = title;
        if (descEl) {
            if (typeof desc === 'string' && (desc.includes('<') || desc.includes('&'))) {
                descEl.innerHTML = desc;
            } else {
                descEl.textContent = desc;
            }
        }

        if (confirmBtn) {
            confirmBtn.textContent = confirmText;
            if (isDanger) {
                confirmBtn.classList.add('sigma-dialog-btn-danger');
            } else {
                confirmBtn.classList.remove('sigma-dialog-btn-danger');
            }
        }

        if (cancelBtn) {
            cancelBtn.textContent = cancelText;
        }

        if (actionsEl) {
            if (isNotification) {
                actionsEl.className = 'sigma-dialog-actions one-button';
                if (cancelBtn) cancelBtn.style.display = 'none';
            } else {
                actionsEl.className = 'sigma-dialog-actions two-buttons';
                if (cancelBtn) cancelBtn.style.display = 'block';
            }
        }

        const currentScrollX = window.scrollX || window.pageXOffset || 0;
        const currentScrollY = window.scrollY || window.pageYOffset || 0;
        const adminMain = document.getElementById('admin-main');
        const adminScrollTop = adminMain ? adminMain.scrollTop : 0;

        const closeDialog = () => {
            overlay.classList.add('hidden');
            if (typeof window.unlockBodyScroll === 'function') {
                window.unlockBodyScroll();
            } else {
                document.documentElement.classList.remove('dialog-open', 'modal-open', 'sigma-modal-open', 'has-modal-open');
                document.body.classList.remove('dialog-open', 'modal-open', 'sigma-modal-open', 'has-modal-open');
            }
            window.scrollTo({ left: currentScrollX, top: currentScrollY, behavior: 'instant' });
            if (adminMain) adminMain.scrollTop = adminScrollTop;
            requestAnimationFrame(() => {
                window.scrollTo({ left: currentScrollX, top: currentScrollY, behavior: 'instant' });
                if (adminMain) adminMain.scrollTop = adminScrollTop;
            });
            if (_activeDialogCleanup) {
                _activeDialogCleanup();
                _activeDialogCleanup = null;
            }
        };

        const handleConfirmClick = (e) => {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            closeDialog();
            if (typeof onConfirm === 'function') onConfirm();
        };

        const handleCancelClick = (e) => {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            closeDialog();
            if (typeof onCancel === 'function') onCancel();
        };

        const handleDismissClick = (e) => {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            closeDialog();
            if (typeof onClose === 'function') onClose();
        };

        const handleKeydown = (e) => {
            if (e.key === 'Escape') {
                handleDismissClick(e);
            } else if (e.key === 'Enter' && isNotification) {
                handleConfirmClick(e);
            }
        };

        confirmBtn.onclick = handleConfirmClick;
        if (cancelBtn) cancelBtn.onclick = handleCancelClick;
        if (closeBtn) closeBtn.onclick = handleDismissClick;
        document.addEventListener('keydown', handleKeydown);

        _activeDialogCleanup = () => {
            if (typeof window.unlockBodyScroll === 'function') {
                window.unlockBodyScroll();
            } else {
                document.documentElement.classList.remove('dialog-open', 'modal-open', 'sigma-modal-open', 'has-modal-open');
                document.body.classList.remove('dialog-open', 'modal-open', 'sigma-modal-open', 'has-modal-open');
            }
            confirmBtn.onclick = null;
            if (cancelBtn) cancelBtn.onclick = null;
            if (closeBtn) closeBtn.onclick = null;
            document.removeEventListener('keydown', handleKeydown);
        };

        if (typeof window.lockBodyScroll === 'function') {
            window.lockBodyScroll();
        } else {
            document.documentElement.classList.add('dialog-open', 'modal-open', 'sigma-modal-open', 'has-modal-open');
            document.body.classList.add('dialog-open', 'modal-open', 'sigma-modal-open', 'has-modal-open');
        }
        overlay.classList.remove('hidden');
        window.scrollTo(currentScrollX, currentScrollY);
        if (adminMain) adminMain.scrollTop = adminScrollTop;
    }

    function closeSigmaDialog() {
        const overlay = document.getElementById('sigma-global-dialog');
        if (overlay) overlay.classList.add('hidden');
        if (typeof window.unlockBodyScroll === 'function') {
            window.unlockBodyScroll();
        } else {
            document.documentElement.classList.remove('dialog-open', 'modal-open', 'sigma-modal-open', 'has-modal-open');
            document.body.classList.remove('dialog-open', 'modal-open', 'sigma-modal-open', 'has-modal-open');
        }
        if (_activeDialogCleanup) {
            _activeDialogCleanup();
            _activeDialogCleanup = null;
        }
    }

    // ─── Universal Modal / Asking Panel Scroll Lock Helpers ───────────────────
    global.lockBodyScroll = function () {
        document.documentElement.classList.add('dialog-open', 'modal-open', 'sigma-modal-open', 'has-modal-open');
        document.body.classList.add('dialog-open', 'modal-open', 'sigma-modal-open', 'has-modal-open');
    };

    global.unlockBodyScroll = function () {
        document.documentElement.classList.remove('dialog-open', 'modal-open', 'sigma-modal-open', 'has-modal-open');
        document.body.classList.remove('dialog-open', 'modal-open', 'sigma-modal-open', 'has-modal-open');
    };

    global.showSigmaDialog = showSigmaDialog;
    global.closeSigmaDialog = closeSigmaDialog;
    global.showConfirmDialog = showSigmaDialog;
    global.showAlertDialog = function (title, desc, onOk, icon) {
        if (typeof title === 'object' && title !== null) {
            const opts = title;
            showSigmaDialog({
                title: opts.title || 'Alert',
                desc: opts.message || opts.desc || opts.description || '',
                icon: opts.icon || 'fa-solid fa-triangle-exclamation',
                isNotification: true,
                confirmText: opts.buttonText || opts.confirmText || 'OK',
                onConfirm: opts.onConfirm || opts.onOk || null
            });
            return;
        }
        showSigmaDialog({
            title: title || 'Alert',
            desc: desc || '',
            icon: icon || 'fa-solid fa-triangle-exclamation',
            isNotification: true,
            confirmText: 'OK',
            onConfirm: onOk
        });
    };

    global.showDiscardConfirm = function (options = {}) {
        let opts = {};
        if (typeof options === 'string') {
            opts = {
                title: arguments[0] || 'Do you want to discard?',
                desc: arguments[1] || 'Unsaved changes will be lost.',
                onConfirm: arguments[2] || null
            };
        } else {
            opts = {
                title: options.title || 'Do you want to discard?',
                desc: options.message || options.desc || 'Unsaved changes will be lost.',
                confirmText: options.discardText || options.confirmText || 'Discard',
                cancelText: options.cancelText || 'Cancel',
                icon: options.icon || 'fa-solid fa-triangle-exclamation',
                isDanger: options.isDanger === true,
                onConfirm: options.onDiscard || options.onConfirm || null,
                onCancel: options.onCancel || null,
                onClose: options.onClose || null
            };
        }
        showSigmaDialog(opts);
    };

    global.showActionConfirm = function (options = {}) {
        const opts = {
            title: options.title || 'Are you sure?',
            desc: options.message || options.desc || '',
            confirmText: options.confirmText || options.actionText || 'Confirm',
            cancelText: options.cancelText || 'Cancel',
            icon: options.icon || 'fa-solid fa-circle-question',
            isDanger: !!options.isDanger,
            onConfirm: options.onConfirm || options.onAction || null,
            onCancel: options.onCancel || null,
            onClose: options.onClose || null
        };
        showSigmaDialog(opts);
    };

    // ─── EXPOSE API ───────────────────────────────────────────────────────────
    global.SigmaPanels = {
        formatClockValue: formatClockValue,
        clockValueToMinutes: clockValueToMinutes,
        parseClassSchedule: parseClassSchedule,
        isClassScheduledToday: isClassScheduledToday,
        getClassTimeForToday: getClassTimeForToday,
        filterUpcomingClasses: filterUpcomingClasses,
        formatRelativeTime: formatRelativeTime,
        renderClassPanel: renderClassPanel,
        renderTeacherSubmissionsPanel: renderTeacherSubmissionsPanel,
        renderStudentSubmissionsPanel: renderStudentSubmissionsPanel,
        renderTodoPanel: renderTodoPanel,
        renderSigmaPanel: renderSigmaPanel,
        showDialog: showSigmaDialog,
        closeDialog: closeSigmaDialog,
        STRAND_ICONS: STRAND_ICONS
    };

})(window);
