(function () {
    'use strict';

    const types = {
        ai: 'AI Logs',
        activity: 'Activity Logs',
        auth: 'Authentication Logs',
        notifications: 'Notification Logs'
    };

    const sections = {
        ai: 'audit-ai-view',
        activity: 'audit-activity-view',
        auth: 'audit-auth-view',
        notifications: 'audit-notifications-view'
    };

    const text = value => String(value ?? '').trim();
    const allowed = kind => window.canViewAuditLog?.(kind) === true;

    const day = value => {
        const date = new Date(value);
        return Number.isFinite(+date) ? new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Manila',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(date) : '';
    };

    const stamp = value => {
        const date = new Date(value);
        return Number.isFinite(+date) ? date.toLocaleString('en-US', {
            timeZone: 'Asia/Manila',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        }) : 'Not recorded';
    };

    const listUsers = () => window.getStoredJson?.('sigma-admin-users', []) || [];

    function person(id, name, role, users) {
        const user = users.find(u => text(u.id || u.uid) === text(id) && text(id));
        return {
            id: text(id),
            name: user ? [user.firstName, user.lastName].filter(Boolean).join(' ') || text(name) : text(name) || 'Not recorded',
            role: text(user?.role || role) || 'Not recorded'
        };
    }

    function normalize(kind, record, users) {
        const row = {
            key: kind + ':' + text(record.id || record.notificationId),
            kind,
            timestamp: record.timestamp || record.createdAt || record.created_at || '',
            status: text(record.status || record.outcome) || 'Not recorded'
        };
        if (kind === 'notifications') {
            row.sender = person(record.senderId, record.senderName || 'System', record.senderRole || record.senderType || 'System', users);
            row.recipient = person(record.recipientId, record.recipient || record.recipientName || ('All ' + (record.role || 'users')), record.role, users);
            row.title = text(record.title) || 'Notification';
            row.details = text(record.body || record.related);
            row.category = text(record.type);
            row.readAt = record.readAt;
            row.recipients = (record.recipients || []).map(u => person(u.id, u.name || u.fullName, u.role || record.role, users));
            row.people = [row.sender, row.recipient, ...row.recipients];
        } else {
            row.user = person(record.userId, record.userName, record.userRole, users);
            row.people = [row.user];
            row.title = kind === 'ai' ? ({
                sigmabot: 'SIGMA Bot',
                analytics: 'AI Analytics',
                quiz: 'Quiz Generation',
                submission_evaluation: 'Submission Evaluation',
                submission_feedback: 'Submission Feedback',
                grade_insights: 'Grade Insights'
            }[record.feature] || text(record.feature) || types[kind]) : text(record.activity || record.event) || types[kind];
            row.details = text(record.details || record.actionDescription || record.prompt);
            row.module = text(record.module);
            row.model = text(record.model);
            row.ip = text(record.ip);
            row.device = text(record.device);
            row.response = text(record.response);
        }
        row.search = [row.title, row.details, row.category, row.module, ...row.people.flatMap(p => [p.name, p.id, p.role])].join(' ').toLowerCase();
        return row;
    }

    function matches(row, filter) {
        const date = day(row.timestamp);
        if ((filter.from && (!date || date < filter.from)) || (filter.to && (!date || date > filter.to))) return false;
        const query = text(filter.user).toLowerCase();
        const people = row.kind === 'notifications' && filter.direction !== 'both'
            ? (filter.direction === 'recipient' ? [row.recipient, ...(row.recipients || [])] : [row.sender])
            : row.people;
        if (query && !people.some(p => [p.name, p.id].some(val => val.toLowerCase().includes(query)))) return false;
        return !filter.search || row.search.includes(filter.search.toLowerCase());
    }

    const identity = p => `${p.name}\nID: ${p.id || 'Not recorded'}\nRole: ${p.role}`;

    function table(kind, rows) {
        const headers = kind === 'notifications'
            ? ['No.', 'Sender', 'Recipient', 'Notification / Details', 'Status', 'Timestamp (Manila)']
            : kind === 'auth'
                ? ['No.', 'User', 'Event / Details', 'Outcome', 'IP / Device', 'Timestamp (Manila)']
                : kind === 'ai'
                    ? ['No.', 'User', 'Feature / Request', 'Response', 'Model / Status', 'Timestamp (Manila)']
                    : ['No.', 'User', 'Activity / Details', 'Module', 'Timestamp (Manila)'];

        return {
            headers,
            body: rows.map((r, i) => kind === 'notifications'
                ? [i + 1, identity(r.sender), [r.recipient, ...(r.recipients || [])].map(identity).join('\n\n'), [r.title, r.category, r.details].filter(Boolean).join('\n'), r.status, stamp(r.timestamp)]
                : kind === 'auth'
                    ? [i + 1, identity(r.user), [r.title, r.details].filter(Boolean).join('\n'), r.status, [r.ip, r.device].filter(Boolean).join('\n'), stamp(r.timestamp)]
                    : kind === 'ai'
                        ? [i + 1, identity(r.user), [r.title, r.details].filter(Boolean).join('\n'), r.response || 'Not recorded', [r.model, r.status].filter(Boolean).join('\n'), stamp(r.timestamp)]
                        : [i + 1, identity(r.user), [r.title, r.details].filter(Boolean).join('\n'), r.module, stamp(r.timestamp)])
        };
    }

    async function source(kind) {
        if (!allowed(kind)) throw Error('You do not have access to ' + types[kind] + '.');
        if (kind === 'activity' || kind === 'auth') {
            return (await window.SigmaDatabase.request(kind === 'auth' ? 'authentication_logs' : 'activity_logs')).records || [];
        }
        if (kind === 'ai') {
            const url = new URL(window.SigmaDatabase.url('ai_records'));
            url.searchParams.set('action', 'logs');
            url.searchParams.set('export', '1');
            const response = await window.SigmaDatabase.fetch(url.href, { cache: 'no-store' });
            const result = await window.SigmaDatabase.readJson(response);
            return (result.logs || []).filter(row => !row.isDeleted);
        }
        window.SigmaNotifications?.syncRecipientReceipts?.();
        return window.SigmaNotifications?.getLogs() || [];
    }

    async function download(rows, selected, filter) {
        const doc = await window.SigmaPdfLayout.create({orientation:'landscape'});
        doc.setFont('SigmaSans','normal');
        doc.setProperties({ title: 'Audit Logs Report', creator: 'SIGMA ELMS' });
        selected.forEach((kind, index) => {
            if (index) doc.addPage();
            doc.setTextColor(0);
            doc.setFontSize(18);
            doc.text('Interface Computer College', 14, 15);
            doc.setFontSize(14);
            doc.text('Audit Logs Report - ' + types[kind], 14, 24);
            doc.setFontSize(9);
            doc.text(`Generated: ${stamp(new Date().toISOString())} (Asia/Manila)`, 14, 31);
            const summary = `Date: ${filter.from || 'All dates'}${filter.to ? ' to ' + filter.to : ''} | Records: ${rows.filter(r => r.kind === kind).length}`;
            const lines = doc.splitTextToSize(summary, 269);
            doc.text(lines, 14, 37);
            const data = table(kind, rows.filter(r => r.kind === kind));
            doc.autoTable({
                startY: 42 + (lines.length - 1) * 4,
                head: [data.headers],
                body: data.body.length ? data.body : [['No matching records', ...data.headers.slice(1).map(() => '')]],
                theme: 'grid', tableWidth:269, showHead:'everyPage',
                columnStyles:Object.fromEntries((kind==='ai'?[10,38,40,106,36,39]:kind==='activity'?[10,45,125,40,49]:kind==='auth'?[10,45,95,25,45,49]:[10,42,45,100,25,47]).map((width,index)=>[index,{cellWidth:width}])),
                styles: { font: 'SigmaSans', fontSize: 8, cellPadding: 2.5, overflow: 'linebreak', textColor: 0 },
                headStyles: { fillColor: [21, 128, 61], textColor: 255 },
                margin: { left: 14, right: 14, top: 15, bottom: 15 },
                rowPageBreak: 'avoid'
            });
        });
        for (let page = 1; page <= doc.getNumberOfPages(); page++) {
            doc.setPage(page);
            doc.setFontSize(8);
            doc.setTextColor(80);
            doc.text(`${page} of ${doc.getNumberOfPages()}`, 283, 204, { align: 'right' });
        }
        await doc.save('SIGMA-'+types[selected[0]].replaceAll(' ','-')+'-' + day(new Date().toISOString()) + '.pdf',{returnPromise:true});
    }

    window.openAuditPdfExport = function(kind) {
        if (!allowed(kind)) return;
        const today = day(new Date().toISOString());
        const start = new Date(today + 'T12:00:00+08:00'); start.setDate(start.getDate()-6);
        return window.openSigmaDateRangeExport({title:'Export '+types[kind],from:day(start.toISOString()),to:today,
            onDownload:async filter=>{
                if (!allowed(kind)) throw Error('Your log access changed.');
                if (kind === 'notifications') await window.SigmaNotifications?.refreshLogs?.();
                const users=listUsers();
                const rows=(await source(kind)).map(record=>normalize(kind,record,users)).filter(row=>matches(row,filter)).sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp));
                await download(rows,[kind],filter);
            }});
    };

    function init() {
        for (const [kind, id] of Object.entries(sections)) {
            const host = document.getElementById(id);
            const tableEl = host?.querySelector('.sigma-audit-table');
            if (!tableEl) continue;
            const existing = host.querySelector('[data-audit-export]');
            if (existing) {
                existing.hidden = !allowed(kind);
                continue;
            }
            const bar = document.createElement('div');
            bar.className = 'audit-export-toolbar';
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'sigma-btn sigma-btn-primary sigma-btn-md';
            button.dataset.auditExport = kind;
            button.innerHTML = '<i class="fa-solid fa-file-pdf" aria-hidden="true"></i><span>Export PDF</span>';
            button.hidden = !allowed(kind);
            button.onclick = () => openAuditPdfExport(kind);
            bar.append(button);
            tableEl.parentElement.before(bar);
        }
    }

    window.SigmaAuditPdf = { normalize, matches, table };
    window.addEventListener('sigma:database-session-ready', init);
    document.addEventListener('DOMContentLoaded', init);
    window.addEventListener('sigma:audit-permissions-changed', () => {
        init();
        document.querySelectorAll('[data-audit-export]').forEach(button => button.hidden = !allowed(button.dataset.auditExport));
    });
})();
