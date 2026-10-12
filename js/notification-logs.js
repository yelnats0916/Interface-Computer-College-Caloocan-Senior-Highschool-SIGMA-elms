(function () {
    'use strict';
    const samples = [
        ['Juan Abad Dela Cruz', 'Student', 'Assessment Released', 'assessment-released', 'Task 1 - Variable Declaration Practice', 'Stored in-app', '2026-10-10T06:36:00Z', null],
        ['Maria Santos Ramos', 'Student', 'Submission Graded', 'submission-graded', 'Basic Syntax Quiz', 'Stored in-app', '2026-10-10T06:29:00Z', '2026-10-10T06:31:00Z'],
        ['Henry Wrecker Ochoa', 'Teacher', 'New Submission', 'submission-received', 'Computer Programming 1 / Rizal', 'Stored in-app', '2026-10-10T06:22:00Z', null],
        ['Shiena Barome Trinidad', 'Student', 'Upcoming Due Date', 'due-reminder', 'Task 2 - Data Types', 'Stored in-app', '2026-10-10T06:15:00Z', '2026-10-10T06:18:00Z'],
        ['Stanley Vargas Garcia', 'Master Admin', 'Quarter Ending Soon', 'quarter-reminder', '1st Quarter', 'Stored in-app', '2026-10-10T06:08:00Z', '2026-10-10T06:10:00Z'],
        ['Jenny Romblon Tamayo', 'Student', 'Class Announcement', 'class-announcement', 'Computer Programming 1 / Rizal', 'Failed to store', '2026-10-10T06:01:00Z', null]
    ].map(([recipient, role, title, type, related, status, timestamp, readAt], index) => ({
        id: `sample-notification-${index + 1}`, recipient, role, title: `${title} (sample)`, type, related, status, timestamp, readAt, channel: 'In-app'
    }));
    const dateFormat = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
    const formatDate = value => value && Number.isFinite(Date.parse(value)) ? dateFormat.format(new Date(value)) : 'Not recorded';
    function render() {
        const body = document.getElementById('notification-log-rows');
        if (!body) return;
        const recorded = window.SigmaNotifications?.getLogs() || [];
        const logs = (recorded.length ? recorded : samples).slice()
            .filter(log => [log.recipient, log.recipientId, log.role, log.title, log.type, log.related, log.channel, log.status, log.readAt ? 'Read' : 'Unread', formatDate(log.timestamp)].join(' ').toLowerCase().includes(window.getAuditLogSearchQuery?.() || ''))
            .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
        body.replaceChildren();
        const renderRow = log => {
            const row = document.createElement('tr');
            const cell = (primary, secondary) => {
                const td = document.createElement('td');
                const line = document.createElement('div');
                line.textContent = primary;
                td.append(line);
                if (secondary) {
                    const detail = document.createElement('div');
                    detail.className = 'text-sm text-black-fade';
                    detail.textContent = secondary;
                    td.append(detail);
                }
                row.append(td);
            };
            cell(log.recipient, log.role);
            cell(log.title, [log.type, log.related].filter(Boolean).join(' / '));
            cell(log.channel);
            cell(log.status);
            cell(log.readAt ? 'Read' : 'Unread', log.readAt ? formatDate(log.readAt) : '');
            cell(formatDate(log.timestamp));
            return row;
        };
        if (!logs.length) {
            const row = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 6;
            td.textContent = window.getAuditLogSearchQuery?.() ? 'No matching notification logs.' : 'No notification logs yet.';
            row.append(td);
            body.append(row);
        }
        const legacyMore = document.getElementById('notification-log-more');
        if (legacyMore) legacyMore.hidden = true;
        if (window.SigmaLogPagination) window.SigmaLogPagination.setRecords(body.closest('table'), logs, renderRow);
        else logs.forEach(log => body.append(renderRow(log)));
    }
    function init() {
        const sourceNav = document.querySelector('#audit-ai-view .audit-log-sidebar nav');
        const targetNav = document.getElementById('notification-log-navigation');
        if (sourceNav && targetNav) {
            for (const button of sourceNav.querySelectorAll('button')) {
                const copy = button.cloneNode(true);
                copy.classList.remove('active');
                targetNav.append(copy);
            }
        }
        document.querySelectorAll('.audit-log-sidebar nav').forEach(nav => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'audit-log-tab' + (nav === targetNav ? ' active' : '');
            button.innerHTML = '<i class="fa-solid fa-bell" aria-hidden="true"></i><span>Notification Logs</span>';
            button.addEventListener('click', () => window.switchTab('nav-audit-notifications'));
            nav.insertBefore(button, nav.querySelector('[data-removed-records]'));
        });
        render();
    }
    window.renderNotificationLogs = render;
    window.filterNotificationAuditLogs = () => { render(); window.SigmaLogPagination?.reset(document.getElementById('notification-log-rows').closest('table')); };
    window.addEventListener('notification-logs-updated', render);
    window.addEventListener('storage', event => { if (!event.key || event.key === 'sigma-notification-logs-v1') render(); });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
