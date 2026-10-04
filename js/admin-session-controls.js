(function () {
    'use strict';
    let revokeSessions = null;
    const pending = new Set();
    const cleanId = user => String(user?.uid || user?.id || '').replace(/^#/, '').trim();

    function allowed(actor, target) {
        if (!actor || !target || !cleanId(actor) || !cleanId(target) || cleanId(actor) === cleanId(target)) return false;
        const role = String(actor.role || actor.type || '').toLowerCase();
        const targetRole = String(target.role || target.type || '').toLowerCase();
        const master = cleanId(actor) === '0000000' || /master|super|head/.test(role);
        if (!master && !role.includes('admin')) return false;
        if (cleanId(target) === '0000000' || /master|super|head/.test(targetRole)) return false;
        if (master) return true;
        const permissions = actor.permissions || {};
        if (permissions.actionLock === false) return false;
        if (targetRole.includes('admin')) return permissions.manageAdmins === true;
        if (targetRole.includes('teacher') || targetRole === 'faculty') return permissions.manageTeachers !== false;
        if (targetRole.includes('student') || targetRole === 'user') return permissions.manageStudents !== false;
        return false;
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { allowed };
        return;
    }
    // Adapter must enforce authorization, revoke server sessions, and write an audit record.
    window.SigmaAdminSessions = {
        setProvider(adapter) {
            if (typeof adapter !== 'function') throw new Error('Invalid session service.');
            revokeSessions = adapter;
        }
    };
    function account(id) {
        try {
            const users = JSON.parse(localStorage.getItem('sigma-admin-users') || '[]');
            return Array.isArray(users) ? users.find(user => cleanId(user) === String(id).replace(/^#/, '').trim()) : null;
        } catch { return null; }
    }
    function notice(title, desc) {
        window.showSigmaDialog?.({ title, desc, confirmText: 'OK', isNotification: true });
    }
    window.requestForceSignOut = function (userId) {
        const target = account(userId);
        if (!allowed(window.getLoggedInAdminUser?.(), target)) return notice('Access Denied', 'You cannot sign out this account.');
        const id = cleanId(target);
        if (pending.has(id)) return;
        const name = target.fullName || target.name || `${target.firstName || ''} ${target.lastName || ''}`.trim() || 'this user';
        window.showSigmaDialog?.({
            title: 'Sign Out',
            desc: `Sign out ${name} on all devices? Their account stays active and they can sign in again.`,
            icon: 'fa-solid fa-right-from-bracket text-black', confirmText: 'Sign Out', cancelText: 'Cancel',
            onConfirm: async () => {
                if (pending.has(id)) return;
                if (!allowed(window.getLoggedInAdminUser?.(), account(id))) return notice('Access Denied', 'Your permission or the target account has changed.');
                if (!revokeSessions) return notice('Session Service Not Connected', 'Signing out this account requires the backend session service. No sessions have been changed.');
                pending.add(id);
                try {
                    const result = await revokeSessions({ userId: id });
                    if (result?.revoked !== true || result?.auditRecorded !== true) throw new Error('The session service did not confirm sign-out and its audit record.');
                    notice('User Signed Out', `${name}'s existing sessions have been ended. Their account and password are unchanged.`);
                } catch (error) {
                    notice('Sign-Out Not Confirmed', error.message || 'Unable to confirm session revocation.');
                } finally { pending.delete(id); }
            }
        });
    };
})();
