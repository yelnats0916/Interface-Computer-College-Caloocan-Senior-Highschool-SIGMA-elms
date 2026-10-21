(function () {
    'use strict';
    if (window.SigmaLightPresence) return;
    const prefix = 'sigma-presence-tab-v2:';
    const heartbeatMs = 60000;
    const expiryMs = 180000;
    // A fresh ID per document avoids collisions between duplicated tabs.
    const tabId = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const key = prefix + tabId;
    let lastHeartbeat = 0;
    let fingerprint = '';
    let loggedOut = false;
    let allRows = '';
    let onlineCount = 0;
    function openAllUsers() {
        if (getUser()?.role !== 'admin') return;
        renderPanel();
        document.getElementById('online-now-modal')?._close?.();
        const previousFocus = document.activeElement;
        const modal = document.createElement('div');
        modal.id = 'online-now-modal';
        modal.className = 'sigma-modal-overlay';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'online-now-modal-title');
        modal.innerHTML = `<div class="sigma-modal-shell"><div class="sigma-modal-panel"><div class="sigma-modal-header"><h2 id="online-now-modal-title" class="sigma-modal-title">Online Now (${onlineCount})</h2><button type="button" class="online-now-close" aria-label="Close"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button></div><div class="sigma-modal-body"><ul class="online-now-all-list">${allRows}</ul></div></div></div>`;
        const previousOverflow = document.body.style.overflow;
        const close = () => { modal.remove(); document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', keyboard); previousFocus?.focus(); };
        modal._close = close;
        const keyboard = event => {
            if (event.key === 'Escape') close();
            if (event.key === 'Tab') {
                const controls = [...modal.querySelectorAll('button')];
                const first = controls[0], last = controls[controls.length - 1];
                if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
                else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
            }
        };
        modal.querySelector('button').onclick = close;
        modal.onclick = event => { if (event.target === modal) close(); };
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', keyboard);
        modal.querySelector('button').focus();
    }
    const roleOf = value => {
        const role = String(value || '').toLowerCase();
        if (role.includes('admin')) return 'admin';
        if (/teacher|faculty|instructor/.test(role)) return 'teacher';
        if (/student|learner/.test(role)) return 'student';
        return '';
    };
    function getUser() {
        if (loggedOut) return null;
        try {
            const user = JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || 'null');
            if (!user || !(user.uid || user.id) || /inactive|locked|disabled/i.test(user.status || '')) return null;
            const role = roleOf(user.role || user.type);
            return role ? { id: String(user.uid || user.id), role, firstName: user.firstName || '', lastName: user.lastName || '', name: user.fullName || user.name || '' } : null;
        } catch (_) { return null; }
    }
    function getCleanOnlineUsers() {
        const now = Date.now();
        const users = new Map();
        const stale = [];
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const storageKey = localStorage.key(i);
                if (!storageKey?.startsWith(prefix)) continue;
                let record;
                try { record = JSON.parse(localStorage.getItem(storageKey)); } catch (_) {}
                if (!record?.id || !roleOf(record.role) || !Number.isFinite(record.lastSeen) || now - record.lastSeen > expiryMs || record.lastSeen > now + 5000) {
                    stale.push(storageKey);
                    continue;
                }
                const id = String(record.id).toLowerCase();
                const existing = users.get(id);
                const onlineSince = Math.min(existing?.onlineSince || existing?.lastSeen || Infinity, record.onlineSince || record.lastSeen);
                if (!existing || existing.lastSeen < record.lastSeen) users.set(id, { ...record, onlineSince });
                else existing.onlineSince = onlineSince;
            }
            stale.forEach(storageKey => localStorage.removeItem(storageKey));
        } catch (_) {}
        return [...users.values()];
    }
    function renderPanel() {
        if (document.hidden || getUser()?.role !== 'admin') return;
        const card = document.getElementById('admin-online-now-card');
        if (!card) return;
        const profiles = new Map();
        for (const storageKey of ['sigma-admin-users', 'sigma-teacher-users', 'sigma-student-users', 'sigma-users-list']) {
            try {
                const records = JSON.parse(localStorage.getItem(storageKey) || '[]');
                if (Array.isArray(records)) records.forEach(user => {
                    const id = String(user.uid || user.id || '').toLowerCase();
                    if (id) profiles.set(id, { ...profiles.get(id), ...user });
                });
            } catch (_) {}
        }
        const users = getCleanOnlineUsers().map(user => {
            const profile = profiles.get(String(user.id).toLowerCase()) || {};
            const first = profile.firstName || user.firstName || '';
            const last = profile.lastName || user.lastName || '';
            const full = String(profile.fullName || profile.name || user.name || '').trim();
            const parts = full.split(/\s+/);
            const fallback = full.includes(',') ? `${full.split(',')[1].trim().split(/\s+/)[0]} ${full.split(',')[0].trim()}` : [parts[0], parts.length > 1 ? parts[parts.length - 1] : ''].filter(Boolean).join(' ');
            return { ...user, ...profile, displayName: [first, last].filter(Boolean).join(' ') || fallback || 'User' };
        }).sort((a, b) => (a.onlineSince || a.lastSeen) - (b.onlineSince || b.lastSeen) || a.displayName.localeCompare(b.displayName));
        const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
        const selfId = String(getUser()?.id || '').toLowerCase();
        const rowItems = users.map(user => {
            const avatar = window.renderUserAvatarHtml?.(user, 'sm') || '<span class="sigma-user-avatar sigma-user-avatar--sm"><i class="fa-solid fa-user"></i></span>';
            const label = String(user.id).toLowerCase() === selfId ? 'You' : user.displayName;
            return `<li class="online-now-profile"><button type="button" class="online-now-profile-link" data-online-profile-id="${escape(user.uid || user.id)}" aria-label="Open ${escape(label === 'You' ? 'your profile' : user.displayName + ' profile')}"><span class="relative shrink-0">${avatar}<span aria-hidden="true" style="position:absolute;right:0;bottom:0;width:8px;height:8px;border-radius:50%;background:#15803d;border:2px solid white;box-sizing:content-box;"></span></span><span class="online-now-profile-name">${escape(label)}</span></button></li>`;
        });
        const rows = rowItems.join('');
        const next = rows;
        if (next === fingerprint) return;
        fingerprint = next;
        allRows = rows;
        onlineCount = users.length;
        document.getElementById('admin-online-now-total').textContent = String(users.length);
        document.getElementById('admin-online-now-list').innerHTML = rowItems.slice(0, 9).join('') || '<li class="online-now-empty py-2 text-black-fade">No users online.</li>';
        const viewAll = document.getElementById('admin-online-view-all');
        if (viewAll) {
            viewAll.hidden = users.length === 0;
            viewAll.textContent = 'View All';
            viewAll.onclick = openAllUsers;
        }
        const fullList = document.querySelector('#online-now-modal .online-now-all-list');
        if (fullList) {
            fullList.innerHTML = rows || '<li>No users online.</li>';
            document.getElementById('online-now-modal-title').textContent = `Online Now (${users.length})`;
        }
    }
    function recordHeartbeat() {
        if (document.hidden || Date.now() - lastHeartbeat < heartbeatMs) return;
        const user = getUser();
        if (!user) return;
        const now = Date.now();
        const existing = getCleanOnlineUsers().find(record => String(record.id).toLowerCase() === user.id.toLowerCase());
        const onlineSince = existing?.onlineSince || existing?.lastSeen || now;
        try { localStorage.setItem(key, JSON.stringify({ ...user, onlineSince, lastSeen: now })); lastHeartbeat = now; } catch (_) {}
    }
    function removeTabFromPresence() {
        try { localStorage.removeItem(key); } catch (_) {}
    }
    function removeSelfFromPresence() {
        const user = getUser();
        if (!user) return;
        const keys = [];
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const storageKey = localStorage.key(i);
                if (!storageKey?.startsWith(prefix)) continue;
                try { if (String(JSON.parse(localStorage.getItem(storageKey))?.id) === user.id) keys.push(storageKey); } catch (_) {}
            }
            keys.forEach(storageKey => localStorage.removeItem(storageKey));
        } catch (_) {}
    }
    const previousLogout = window.SigmaPresenceTracker?.logout;
    window.SigmaPresenceTracker = {
        getCleanOnlineUsers, recordHeartbeat, removeTabFromPresence, removeSelfFromPresence,
        getEffectiveActiveUser: getUser,
        logout() {
            removeSelfFromPresence();
            loggedOut = true;
            if (previousLogout) previousLogout();
            else sessionStorage.clear();
        }
    };
    window.SigmaLightPresence = true;
    document.addEventListener('click', event => {
        const profile = event.target.closest?.('[data-online-profile-id]');
        if (!profile || getUser()?.role !== 'admin') return;
        document.getElementById('online-now-modal')?._close?.();
        window.viewUserProfile?.(profile.dataset.onlineProfileId);
    });
    const start = () => { recordHeartbeat(); renderPanel(); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
    setInterval(recordHeartbeat, heartbeatMs);
    if (/admin\.html$/i.test(location.pathname)) setInterval(renderPanel, 30000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) start(); });
    // No unload/blur removal: short tab switches and refreshes retain the grace period.
})();
