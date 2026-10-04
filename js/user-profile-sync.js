(function () {
    'use strict';
    const keys = ['sigma-admin-users', 'sigma-users-list', 'sigma-teacher-users', 'sigma-student-users'];
    const id = user => String(user?.id || user?.uid || '').replace(/^#/, '').trim();
    const fields = ['firstName', 'middleName', 'lastName', 'fullName', 'name', 'gender', 'email'];
    function read(storage, key, fallback) {
        try { return JSON.parse(storage.getItem(key)) || fallback; } catch { return fallback; }
    }
    function merge(existing, updated) {
        const result = { ...existing };
        fields.forEach(field => { if (updated[field] !== undefined) result[field] = updated[field]; });
        result.fullName = [result.firstName, result.middleName, result.lastName].filter(Boolean).join(' ') || result.fullName;
        result.name = result.fullName || result.name;
        return result;
    }
    function sync(key = 'sigma-admin-users') {
        const records = read(localStorage, key, []);
        if (!Array.isArray(records)) return;
        for (const sessionKey of ['sigma-authenticated-user', 'currentUser']) {
            const current = read(sessionStorage, sessionKey, null);
            const updated = current && records.find(user => id(user) && id(user) === id(current));
            if (updated) sessionStorage.setItem(sessionKey, JSON.stringify(merge(current, updated)));
        }
        const signedIn = read(sessionStorage, 'sigma-authenticated-user', null);
        if (signedIn) {
            const first = document.getElementById('header-dropdown-firstName');
            const last = document.getElementById('header-dropdown-lastName');
            if (first) first.textContent = signedIn.firstName || '';
            if (last) last.textContent = signedIn.lastName || '';
        }
        const profile = window.currentUserProfileData;
        const updated = profile && records.find(user => id(user) && id(user) === id(profile));
        if (updated) {
            window.currentUserProfileData = merge(profile, updated);
            window.populateUserProfilePage?.();
        }
        window.renderUserAccountsTable?.();
        const settings = document.querySelector('[data-settings-container]');
        if (settings?.querySelector('#acc-view-mode') && !document.getElementById('self-edit-information')) {
            window.renderSettingsView?.(settings.id, 'account');
        }
    }
    window.addEventListener('storage', event => { if (keys.includes(event.key)) sync(event.key); });
    window.addEventListener('sigma:user-profile-updated', () => sync());
    window.addEventListener('pageshow', () => sync());
})();
