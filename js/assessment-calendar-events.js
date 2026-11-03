(function () {
    'use strict';
    const state = { owner: '', events: [], pending: null, lastAttempt: 0, lastError: '' };
    const portalRole = () => location.pathname.toLowerCase().includes('teacher') ? 'teacher'
        : (location.pathname.toLowerCase().includes('student') ? 'student' : '');
    const actor = () => window.SigmaDatabase?.currentUser?.() || {};
    const owner = () => String(actor().id || actor().uid || '');
    const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));

    window.getReleasedAssessmentCalendarEventsForDate = date => {
        if (state.owner !== owner() || !date) return [];
        return state.events.filter(event => event.date === date).map(event => {
            const [hourText, minuteText] = String(event.time || '23:59').split(':');
            const hour = Number(hourText), minute = Number(minuteText);
            const time = `${String(Number.isFinite(hour) ? hour : 23).padStart(2, '0')}:${String(Number.isFinite(minute) ? minute : 59).padStart(2, '0')}`;
            const subtitle = [event.subject, event.section, event.quarter ? `Q${event.quarter}` : ''].filter(Boolean).join(' · ');
            return {
                id: event.id, dateKey: event.date, startHour: `${hour % 12 || 12}:${String(minute).padStart(2, '0')}`,
                period: hour >= 12 ? 'PM' : 'AM', duration: 'Due', timeRange: time,
                title: escapeHtml(event.title), subtitle: escapeHtml(subtitle), location: escapeHtml(subtitle),
                tag: 'ASSESSMENT DUE', role: portalRole() === 'teacher' ? 'Teacher' : 'Student',
                isAssessment: true, assessmentDue: true, dueDate: event.date, dueTime: time,
                subjectId: event.subjectId, sectionId: event.sectionId, itemId: event.itemId
            };
        });
    };

    async function refresh(force = false) {
        const id = owner(), role = portalRole();
        if (!id || !role || !window.SigmaDatabase?.fetch) return;
        if (state.owner !== id) { state.owner = id; state.events = []; state.lastAttempt = 0; }
        if (state.pending) return state.pending;
        if (!force && Date.now() - state.lastAttempt < 60000) return;
        state.lastAttempt = Date.now();
        const url = new URL('php/api/calendar_events.php', location.href).href;
        state.pending = (async () => {
            const response = await window.SigmaDatabase.fetch(url, {
                method: 'GET', credentials: 'include', cache: 'no-store', autoReconnect: false, foreground: false
            });
            const result = await response.json();
            if (!response.ok || !result?.success || !Array.isArray(result.events)) {
                throw new Error(result?.error || 'Assessment due dates could not be loaded.');
            }
            if (owner() !== id || String(result.userId) !== id) return;
            state.events = result.events.filter(event => event && /^\d{4}-\d{2}-\d{2}$/.test(event.date)
                && /^\d{2}:\d{2}$/.test(event.time || '') && typeof event.title === 'string');
            state.lastError = '';
            window.dispatchEvent(new CustomEvent('sigma:assessment-calendar-changed'));
        })().catch(error => {
            if (state.lastError !== error.message) console.warn('[SIGMA] Assessment calendar:', error.message);
            state.lastError = error.message || 'Assessment due dates could not be loaded.';
        }).finally(() => { state.pending = null; });
        return state.pending;
    }

    ['sigma:database-session-ready', 'sigma:academic-records-saved', 'sigma:academic-snapshot-updated', 'focus', 'online']
        .forEach(name => window.addEventListener(name, () => refresh(true)));
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(true); });
    setInterval(() => { if (!document.hidden) refresh(); }, 60000);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => refresh(true));
    else setTimeout(() => refresh(true), 0);
})();
