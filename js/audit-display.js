(function () {
    'use strict';
    function text(value, fallback = 'Not recorded') {
        const clean = typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
        return !clean || /^(?:[-—–]+|null|undefined)$/i.test(clean) ? fallback : clean;
    }
    function identifier(record, prefix) {
        if (text(record.id, '')) return String(record.id);
        const source=JSON.stringify([record.userId,record.timestamp,record.activity||record.event||record.title,record.notificationId]);
        let hash=2166136261;for(const character of source)hash=Math.imul(hash^character.charCodeAt(0),16777619);
        return prefix+'-legacy-'+(hash>>>0).toString(16);
    }
    function activity(record) {
        let title = text(record.activity || record.action, 'Activity recorded');
        let module = text(record.module, 'System');
        let details = text(record.details || record.description, '');
        if (details === 'Additional context was not captured for this event.') details = '';
        const units = /^Assigned user-approved provisional units to subject ([^:]+): ([0-9.]+) units; ICC confirmation pending$/i.exec(title);
        const imported = /^Imported user-requested DepEd-based draft subject ([^:]+): (.*); school scheduling pending confirmation$/i.exec(title);
        const renamed = /^Removed imported strand suffix from subject ([^;]+); strand remains stored separately$/i.exec(title);
        if (units) {
            title = 'Updated Subject Units'; module = 'Curriculum';
            details ||= `Subject code: ${units[1]}\nUnits: ${units[2]}\nUnit basis: Provisional application convention; ICC confirmation pending.`;
        } else if (imported) {
            title = 'Created Subject'; module = 'Curriculum';
            details ||= `Subject code: ${imported[1]}\nSubject name: ${imported[2]}\nStatus: Draft\nScheduling: Pending school confirmation.`;
        } else if (renamed) {
            title = 'Updated Subject Name'; module = 'Curriculum';
            details ||= `Subject code: ${renamed[1]}\nChange: Removed the strand suffix from the subject name.\nStrand: Stored separately.`;
        }
        if (/^Administrator settings verification/i.test(title)) {
            module = 'Security';
            const result = /succeeded/i.test(title) ? 'Administrator identity was verified for protected integration settings.'
                : /failed/i.test(title) ? 'The verification attempt for protected integration settings failed.' : 'Verification for protected integration settings was canceled.';
            details = details ? details.replace('No credentials are recorded.', result) : result;
        }
        const account = /^(?:Created|Saved|Updated|Deleted|Restored|Deactivated|Activated|Locked|Unlocked)\s+(?:(Master Admin|Admin|Teacher|Student)\s+)?account\s+([^\s()]+)/i.exec(title);
        if (!details && account) details = `Account ID: ${account[2]}${account[1] ? '\nRole at event: ' + account[1] : ''}`;
        return { ...record, id:identifier(record,'activity'), activity: title, module, details: details || 'Additional context was not captured for this event.',
            userName: text(record.userName, 'Account name not recorded'), userRole: text(record.userRole, 'Role not recorded') };
    }
    function authentication(record) {
        const event = text(record.event, 'Authentication event');
        const known = { 'Login successful': 'The account completed sign-in successfully.', 'Failed login attempt': 'Sign-in was unsuccessful. Credentials are never included in the log.',
            'Google Authenticator 2FA verified': 'The account passed the authenticator code check.', 'Logout': 'The account signed out.', 'Logout successful': 'The account signed out.' };
        return { ...record, id:identifier(record,'auth'), event, details: text(record.details, known[event] || 'Additional authentication context was not captured.'),
            userName: text(record.userName, 'Account name not recorded'), userRole: text(record.userRole, 'Role not recorded'),
            ip: text(record.ip, 'IP address not recorded'), device: text(record.device, 'Device not recorded') };
    }
    function date(value) {
        const parsed = Date.parse(value);
        return Number.isFinite(parsed) ? new Date(parsed).toLocaleString('en-US', { timeZone:'Asia/Manila', month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit' }) : 'Timestamp not recorded';
    }
    function details(value) {
        const container = document.createElement('div');
        container.className = 'sigma-audit-details';
        for (const part of text(value, 'Additional context was not captured for this event.').split(/[·|\n]+/).map(line => line.trim()).filter(Boolean)) {
            const field = /^([A-Za-z][A-Za-z ]{1,59}):[ ]*(.*)$/.exec(part);
            if (field) {
                const row = document.createElement('div'); row.className = 'sigma-audit-detail-field';
                const label = document.createElement('span'); label.className = 'sigma-audit-detail-label'; label.textContent = field[1] + ':';
                const content = document.createElement('span'); content.className = 'sigma-audit-detail-value'; content.textContent = field[2] || 'Not recorded';
                row.append(label, content); container.append(row);
            } else { const line = document.createElement('div'); line.textContent = part; container.append(line); }
        }
        return container;
    }
    window.SigmaAuditDisplay = { text, activity, authentication, date, details };
})();
