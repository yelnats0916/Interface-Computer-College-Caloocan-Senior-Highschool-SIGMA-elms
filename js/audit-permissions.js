(function () {
    'use strict';
    const keys = {ai:'auditAi', activity:'auditActivity', auth:'auditAuth', notifications:'auditNotifications'};
    window.canViewAuditLog = function (kind) {
        let user;
        try { user = JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || 'null'); } catch (_) {}
        if (!user) return false;
        const current = window.getLoggedInAdminUser?.();
        if (current && String(current.id || current.uid) === String(user.id || user.uid)) user = current;
        const role = String(user.role || user.type || '').replace(/[\s_-]+/g, '').toLowerCase();
        if (role === 'masteradmin') return true;
        return role === 'admin' && user.permissions?.auditMain === true && user.permissions?.[keys[kind]] === true;
    };
    window.refreshAuditLogPermissions = function () {
        document.querySelectorAll('.audit-log-tab').forEach(button => {
            const route = button.dataset.auditKind || (button.getAttribute('onclick') || '').match(/nav-audit-(ai|activity|auth|notifications)/)?.[1];
            if (route) button.classList.toggle('hidden', !window.canViewAuditLog(route));
        });
    };
    document.addEventListener('DOMContentLoaded', window.refreshAuditLogPermissions);
    new MutationObserver(records => {
        if (records.some(record => Array.from(record.addedNodes).some(node => node.nodeType === 1 &&
            (node.matches('.audit-log-tab') || node.querySelector('.audit-log-tab'))))) window.refreshAuditLogPermissions();
    }).observe(document.documentElement, {childList:true, subtree:true});
})();
