(function () {
    'use strict';
    const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const validDate = value => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
        const date = new Date(value + 'T12:00:00Z');
        return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
    };
    const today = () => {
        const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
        return ['year', 'month', 'day'].map(key => parts.find(part => part.type === key).value).join('-');
    };
    window.renderAcademicEventFields = role => role !== 'admin' ? '' : `
        <section class="academic-event-fields" hidden>
            <input type="checkbox" id="announcement-academic-enabled" hidden>
            <div id="announcement-academic-details" hidden>
                <p>Academic events are visible to all administrators, teachers, and students. The announcement keeps its selected audience.</p>
                <div class="academic-event-grid">
                    <label>Event title<input id="announcement-academic-title" type="text" maxlength="200" placeholder="Examination, holiday, school event…" aria-describedby="announcement-academic-error"></label>
                    <label>Location (optional)<input id="announcement-academic-location" type="text" maxlength="200" placeholder="Event location" aria-describedby="announcement-academic-error"></label>
                    <label>Start date<input id="announcement-academic-start" type="date" min="0001-01-01" max="9999-12-31" aria-describedby="announcement-academic-error"></label>
                    <label>End date (optional)<input id="announcement-academic-end" type="date" min="0001-01-01" max="9999-12-31" aria-describedby="announcement-academic-end-hint announcement-academic-error"><small id="announcement-academic-end-hint">Leave blank for a single-day event.</small></label>
                    <label>Start time (optional)<input id="announcement-academic-time" type="time"></label>
                    <label>End time (optional)<input id="announcement-academic-end-time" type="time"></label>
                </div>
                <p id="announcement-academic-error" role="alert"></p>
                <div class="academic-event-editor-actions">
                    <button type="button" class="sigma-btn sigma-btn-white sigma-btn-md" data-academic-remove>Cancel</button>
                    <button type="button" class="sigma-btn sigma-btn-primary sigma-btn-md" data-academic-done>Done</button>
                </div>
            </div>
        </section>`;
    const syncAcademicEventBadge = () => {
        const row = document.querySelector('#sigma-composer-modal-backdrop .sigma-composer-pills-row');
        if (!row) return;
        let badge = document.getElementById('sigma-composer-academic-badge');
        if (!badge) {
            badge = document.createElement('span');
            badge.id = 'sigma-composer-academic-badge';
            badge.className = 'sigma-composer-academic-badge';
            row.appendChild(badge);
        }
        const eventTitle = document.getElementById('announcement-academic-title')?.value.trim() || '';
        badge.textContent = eventTitle ? `Event: ${eventTitle}` : '';
        badge.hidden = !document.getElementById('announcement-academic-enabled')?.checked
            || document.querySelector('.academic-event-fields')?.dataset.hasEvent !== '1';
    };
    const syncAcademicEventControl = () => {
        const enabled = Boolean(document.getElementById('announcement-academic-enabled')?.checked);
        const fields = document.querySelector('.academic-event-fields');
        const isolated = Boolean(fields?.closest('.sigma-composer-calendar-mode'));
        if (fields) fields.hidden = !enabled || !isolated;
        const details = document.getElementById('announcement-academic-details');
        if (details) details.hidden = !enabled;
        document.querySelectorAll('.academic-event-grid input').forEach(input => {
            delete input.dataset.touched;
            input.removeAttribute('aria-invalid');
        });
        const error = document.getElementById('announcement-academic-error');
        if (error) error.textContent = '';
        const button = document.getElementById('sigma-composer-btn-calendar');
        if (button) {
            button.setAttribute('aria-pressed', String(enabled));
            button.setAttribute('aria-expanded', String(enabled && isolated));
            button.title = enabled ? 'Edit Academic Calendar Event' : 'Add to Academic Calendar';
            button.setAttribute('aria-label', button.title);
        }
        syncAcademicEventBadge();
    };
    window.setAcademicEventFields = event => {
        window.leaveAcademicEventEditor?.(false);
        const toggle = document.getElementById('announcement-academic-enabled');
        if (!toggle) return;
        toggle.checked = Boolean(event);
        const fields = document.querySelector('.academic-event-fields');
        if (fields) fields.dataset.hasEvent = event ? '1' : '0';
        syncAcademicEventControl();
        for (const [id, key] of [['title', 'title'], ['location', 'location'], ['start', 'startDate'], ['end', 'endDate'], ['time', 'startTime'], ['end-time', 'endTime']]) {
            document.getElementById('announcement-academic-' + id).value = event?.[key] || '';
        }
        document.getElementById('announcement-academic-error').textContent = '';
        syncAcademicEventConstraints();
        syncAcademicEventBadge();
    };
    window.leaveAcademicEventEditor = (restoreFocus = true) => {
        const modal = document.querySelector('.sigma-composer-modal.sigma-composer-calendar-mode');
        if (!modal) return false;
        modal.classList.remove('sigma-composer-calendar-mode');
        const title = modal.querySelector('.sigma-composer-title');
        if (title && modal.dataset.postTitle) title.textContent = modal.dataset.postTitle;
        const fields = modal.querySelector('.academic-event-fields');
        if (fields) fields.hidden = true;
        const button = document.getElementById('sigma-composer-btn-calendar');
        button?.setAttribute('aria-expanded', 'false');
        syncAcademicEventBadge();
        if (restoreFocus) button?.focus();
        return true;
    };
    const syncAcademicEventConstraints = () => {
        const start = document.getElementById('announcement-academic-start');
        const end = document.getElementById('announcement-academic-end');
        const startTime = document.getElementById('announcement-academic-time');
        const endTime = document.getElementById('announcement-academic-end-time');
        if (!start || !end || !startTime || !endTime) return;
        end.min = validDate(start.value) ? start.value : '0001-01-01';
        start.max = validDate(end.value) ? end.value : '9999-12-31';
        if ((!end.value || start.value === end.value) && startTime.value) endTime.min = startTime.value;
        else endTime.removeAttribute('min');
    };
    window.showAcademicEventValidationError = (error, force = false) => {
        const message = document.getElementById('announcement-academic-error');
        document.querySelectorAll('.academic-event-grid input').forEach(input => input.removeAttribute('aria-invalid'));
        const field = error?.fieldId ? document.getElementById(error.fieldId) : null;
        const visible = Boolean(error && (force || field?.dataset.touched === '1'));
        if (message) message.textContent = visible ? error.message : '';
        if (visible && field) {
            field.setAttribute('aria-invalid', 'true');
            if (force) field.focus();
        }
    };
    window.readAcademicEventFields = () => {
        if (!document.getElementById('announcement-academic-enabled')?.checked) return null;
        const value = id => document.getElementById('announcement-academic-' + id).value.trim();
        const event = { title: value('title'), location: value('location'), startDate: value('start'), endDate: value('end') || value('start'), startTime: value('time'), endTime: value('end-time'), audience: 'everyone' };
        const invalid = (field, message) => { const error = Error(message); error.fieldId = 'announcement-academic-' + field; throw error; };
        if (!event.title) invalid('title', 'Enter an event title.');
        if (event.title.length > 200) invalid('title', 'Use no more than 200 characters for the event title.');
        if (event.location.length > 200) invalid('location', 'Use no more than 200 characters for the location.');
        if (!validDate(event.startDate) || event.startDate < '0001-01-01') invalid('start', 'Choose a valid start date.');
        if (document.getElementById('announcement-academic-end')?.validity.badInput) invalid('end', 'Complete the end date or clear it for a single-day event.');
        if (!validDate(event.endDate)) invalid('end', 'Choose a valid end date or leave it blank.');
        if (event.endDate < event.startDate) invalid('end', 'The end date must be on or after the start date.');
        const validTime = time => /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
        if (document.getElementById('announcement-academic-time')?.validity.badInput) invalid('time', 'Complete the start time or clear it.');
        if (document.getElementById('announcement-academic-end-time')?.validity.badInput) invalid('end-time', 'Complete the end time or clear it.');
        if (event.startTime && !validTime(event.startTime)) invalid('time', 'Choose a valid start time.');
        if (event.endTime && !validTime(event.endTime)) invalid('end-time', 'Choose a valid end time.');
        if (event.endTime && !event.startTime) invalid('time', 'Choose a start time before entering an end time.');
        if (event.startDate === event.endDate && event.endTime && event.endTime <= event.startTime) invalid('end-time', 'The end time must be after the start time.');
        return event;
    };
    document.addEventListener('input', event => {
        const input = event.target.closest?.('.academic-event-grid input');
        if (!input) return;
        if (input.type === 'text') {
            const clean = input.value.replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, 200);
            if (input.value !== clean) input.value = clean;
        }
        syncAcademicEventConstraints();
    }, true);
    document.addEventListener('focusout', event => {
        const input = event.target.closest?.('.academic-event-grid input');
        if (!input) return;
        input.dataset.touched = '1';
        try { window.readAcademicEventFields(); window.showAcademicEventValidationError(null); }
        catch (error) { window.showAcademicEventValidationError(error); }
    });
    document.addEventListener('change', event => {
        if (event.target.id === 'announcement-academic-enabled') {
            syncAcademicEventControl();
        }
    });
    document.addEventListener('click', event => {
        if (event.target.closest('[data-academic-done]')) {
            try {
                window.readAcademicEventFields();
                window.showAcademicEventValidationError(null);
                const fields = document.querySelector('.academic-event-fields');
                if (fields) fields.dataset.hasEvent = '1';
                window.leaveAcademicEventEditor();
            } catch (error) { window.showAcademicEventValidationError(error, true); }
            return;
        }
        if (event.target.closest('[data-academic-remove]')) {
            window.setAcademicEventFields(null);
            document.getElementById('announcement-academic-enabled')?.dispatchEvent(new Event('change', { bubbles: true }));
            document.getElementById('sigma-composer-btn-calendar')?.focus();
            return;
        }
        if (!event.target.closest('#sigma-composer-btn-calendar')) return;
        const toggle = document.getElementById('announcement-academic-enabled');
        if (!toggle) return;
        const modal = toggle.closest('.sigma-composer-modal');
        if (!modal) return;
        const title = modal.querySelector('.sigma-composer-title');
        const removeButton = modal.querySelector('[data-academic-remove]');
        if (removeButton) removeButton.textContent = modal.querySelector('.academic-event-fields')?.dataset.hasEvent === '1' ? 'Remove Event' : 'Cancel';
        modal.dataset.postTitle = title?.textContent || 'Create Post';
        modal.classList.add('sigma-composer-calendar-mode');
        const body = modal.querySelector('.sigma-composer-body');
        if (body) body.scrollTop = 0;
        if (title) title.textContent = 'Academic Calendar';
        toggle.checked = true;
        syncAcademicEventControl();
        toggle.dispatchEvent(new Event('change', { bubbles: true }));
        if (toggle.checked) document.getElementById('announcement-academic-title')?.focus();
    });
    window.getAcademicCalendarEvents = () => {
        let posts = [];
        try { posts = JSON.parse(localStorage.getItem('sigma_announcements_feed_v3') || '[]'); } catch (_) {}
        if (!Array.isArray(posts)) posts = [];
        const events = posts.filter(post => post.academicEvent && !post.isDeleted && !post.deletedAt && !['draft', 'deleted', 'archived'].includes(String(post.status || '').toLowerCase()) && ['admin', 'administrator'].includes(String(post.authorRole || '').toLowerCase()))
            .map(post => ({ ...post.academicEvent, id: 'academic-' + post.id, postId: post.id }))
            .filter(event => validDate(event.startDate) && validDate(event.endDate) && event.endDate >= event.startDate && event.title)
            .sort((a, b) => (a.startDate + (a.startTime || '')).localeCompare(b.startDate + (b.startTime || '')));
        const maintenance=window.maintenanceModeState;
        if(maintenance?.schedule && maintenance.channels?.calendar && maintenance.scheduleStatus!=='none'){
            const schedule=maintenance.schedule,id='academic-maintenance-'+schedule.id;
            if(!events.some(event=>event.id===id))events.push({id,postId:'maintenance-'+schedule.id,title:maintenance.title,
                startDate:schedule.startAt.slice(0,10),endDate:schedule.endAt.slice(0,10),startTime:schedule.startAt.slice(11,16),endTime:schedule.endAt.slice(11,16),location:'Online portal',audience:'everyone'});
        }
        return events.sort((a,b)=>(a.startDate+(a.startTime||'')).localeCompare(b.startDate+(b.startTime||'')));
    };
    window.getAcademicCalendarEventsForDate = date => window.getAcademicCalendarEvents().filter(event => event.startDate <= date && event.endDate >= date).map(event => {
        const time = event.startTime || '00:00';
        const hour = Number(time.slice(0, 2));
        return { id: event.id, academicEvent: true, dateKey: date, startHour: `${hour % 12 || 12}:${time.slice(3)}`, period: hour >= 12 ? 'PM' : 'AM',
            duration: event.startTime ? 'Event' : 'All day', timeRange: event.startTime ? time + (event.endTime ? '–' + event.endTime : '') : 'All day',
            title: escape(event.title), subtitle: escape(event.location || 'School-wide academic event'), location: escape(event.location || ''), postId: event.postId || '', eventStartDate: event.startDate, eventEndDate: event.endDate, tag: 'ACADEMIC EVENT', role: null, isAssessment: false };
    });
    window.openAcademicCalendarDate = date => {
        const [year, month, day] = (date || today()).split('-').map(Number);
        window.hideHeaderOverlays?.();
        window.switchTab?.('nav-attendance');
        if (window.selectedCalendarDate) window.selectedCalendarDate.day = null;
        window.selectCalendarDate?.(year, month - 1, day);
    };
    window.notifyAcademicEventChanges = (posts, previous) => {
        if (!window.SigmaNotifications?.sendToRole) return;
        for (const post of posts) {
            const event = post.academicEvent;
            if (!event || post.isDeleted || post.deletedAt || ['draft', 'deleted', 'archived'].includes(String(post.status || '').toLowerCase()) || !['admin', 'administrator'].includes(String(post.authorRole || '').toLowerCase())) continue;
            const old = previous.find(item => item.id === post.id)?.academicEvent;
            const signature = item => JSON.stringify([item.startDate, item.endDate, item.startTime || '', item.endTime || '', item.location || '']);
            if (old && signature(old) === signature(event)) continue;
            const stamp = Date.now();
            for (const role of ['admin', 'teacher', 'student']) window.SigmaNotifications.sendToRole(role, {
                id: `academic-${post.id}:published:${stamp}`, type: 'academic-event', senderType: 'system', senderName: 'Academic Calendar',
                title: old ? 'Academic Event Updated' : 'New Academic Event', icon: 'fa-calendar-days', senderColor: '#15803d',
                body: `${event.title} · ${event.startDate}${event.endDate !== event.startDate ? ' – ' + event.endDate : ''} · ${event.startTime || 'All day'}${event.location ? ' · ' + event.location : ''}`,
                timestamp: new Date().toISOString(), read: false,
                target: { academicDate: event.startDate, academicEventId: `academic-${post.id}`, postId: post.id }
            });
        }
    };
    window.renderAcademicCalendarWidgets = () => {
        const upcoming = window.getAcademicCalendarEvents().filter(event => event.endDate >= today()).slice(0, 3);
        const html = upcoming.length ? upcoming.map(event => `<button type="button" class="academic-calendar-preview-event" data-academic-date="${event.startDate}"><strong>${escape(event.title)}</strong><span>${escape(event.startDate)}${event.endDate !== event.startDate ? ' – ' + escape(event.endDate) : ''} · ${escape(event.startTime || 'All day')}</span>${event.location ? `<span>${escape(event.location)}</span>` : ''}</button>`).join('') : '<p class="academic-calendar-empty">No upcoming academic events.</p>';
        document.querySelectorAll('[data-academic-calendar-preview], #admin-pinned-milestones-list').forEach(container => { container.innerHTML = html; });
    };
    document.addEventListener('click', event => {
        const postLink = event.target.closest('[data-calendar-post-id]');
        if (postLink) { window.SigmaAnnouncements?.openPostDialog(decodeURIComponent(postLink.dataset.calendarPostId)); return; }
        const button = event.target.closest('[data-academic-date]');
        if (button) window.openAcademicCalendarDate(button.dataset.academicDate);
    });
    window.notifyActiveAcademicEvents = () => {
        if (!window.SigmaNotifications?.sendToRole) return;
        const date = today();
        const events = window.getAcademicCalendarEvents().filter(event => !event.isSample && event.startDate <= date && event.endDate >= date);
        for (const role of ['admin', 'teacher', 'student']) {
            let existing = [];
            try { existing = JSON.parse(localStorage.getItem(`sigma-notifications-${role}-v3`) || '[]'); } catch (_) {}
            if (!Array.isArray(existing)) existing = [];
            for (const event of events) {
                const id = `${event.id}:active:${date}`;
                // Preserve read state and avoid repeated reminders across tabs and focus changes.
                if (existing.some(notification => notification.id === id)) continue;
                window.SigmaNotifications.sendToRole(role, {
                    id, type: 'academic-event', senderType: 'system', senderName: 'Academic Calendar',
                    icon: 'fa-calendar-days', senderColor: '#15803d',
                    title: event.title,
                    body: `Today · ${event.startTime || 'All day'}${event.endTime ? '–' + event.endTime : ''}${event.location ? ' · ' + event.location : ''}`,
                    timestamp: new Date().toISOString(), read: false,
                    target: { academicDate: date, academicEventId: event.id }
                });
            }
        }
    };
    const refreshAcademicEvents = () => {
        window.renderAcademicCalendarWidgets();
        window.notifyActiveAcademicEvents();
    };
    ['sigma:academic-calendar-changed', 'focus'].forEach(event => window.addEventListener(event, refreshAcademicEvents));
    window.addEventListener('storage', event => { if (!event.key || event.key === 'sigma_announcements_feed_v3') window.dispatchEvent(new CustomEvent('sigma:academic-calendar-changed')); });
    document.addEventListener('DOMContentLoaded', refreshAcademicEvents);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshAcademicEvents(); });
    setInterval(() => { if (!document.hidden) window.notifyActiveAcademicEvents(); }, 60000);
})();
