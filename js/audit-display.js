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
        const title = text(record.activity || record.action, 'Activity recorded');
        let module = text(record.module, 'System');
        let details = text(record.details || record.description, '');
        if (/^Administrator settings verification/i.test(title)) {
            module = 'Security';
            details ||= /succeeded/i.test(title) ? 'Administrator identity was verified for protected integration settings.'
                : /failed/i.test(title) ? 'The verification attempt for protected integration settings failed.' : 'Verification for protected integration settings was canceled.';
        }
        const account = /^(?:Created|Saved|Updated|Deleted|Restored|Deactivated|Activated|Locked|Unlocked)\s+(?:(Master Admin|Admin|Teacher|Student)\s+)?account\s+([^\s()]+)/i.exec(title);
        if (!details && account) details = `Account ID: ${account[2]}${account[1] ? ' · Role at event: ' + account[1] : ''}`;
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
    window.SigmaAuditDisplay = { text, activity, authentication, date };
})();
