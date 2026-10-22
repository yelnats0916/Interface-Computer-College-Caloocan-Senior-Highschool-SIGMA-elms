/* Shared authentication audit trail.  Events are intentionally recorded only when
 * an authentication or account-security action actually completes. */
(function () {
    'use strict';

    const KEY = 'sigma-authentication-logs-v1';
    let selectedUser = null, selectedRecord = null;
    let category = 'All Logs', detailQuery = '';
    const categoryOf = event => /recaptcha/i.test(event) ? 'reCAPTCHA' : /authenticator|2fa/i.test(event) ? 'Google Authenticator' : /password reset/i.test(event) ? 'Password Reset' : /lock|inactive/i.test(event) ? 'Account Access' : 'Login';
    function openUser(record, isolated = false) {
        selectedRecord = isolated ? record.id : null;
        selectedUser = record;
        category = 'All Logs'; detailQuery = '';
        window.pushModalHistoryState?.('authentication-account-details', () => openUser(record, isolated));
        render();
        window.SigmaLogPagination?.reset(document.querySelector('#audit-auth-view table'));
        document.getElementById('authentication-account-details')?.scrollIntoView({ block:'start' });
    }
    window.closeAuthenticationLogDetails = () => { selectedUser = null; selectedRecord = null; render(); };
    const now = () => new Date().toISOString();
    const clean = value => String(value || '').trim();
    const idOf = user => clean(user?.uid || user?.id || user?.userId);
    const nameOf = user => clean(user?.fullName || user?.name || [user?.firstName, user?.lastName].filter(Boolean).join(' ')) || 'Unknown account';
    const roleOf = user => clean(user?.role || user?.type) || 'Not recorded';
    const readLocal = () => {
        try { const records = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(records) ? records : []; }
        catch (_) { return []; }
    };
    const write = records => { try { localStorage.setItem(KEY, JSON.stringify(records.slice(0, 500))); } catch (_) { /* Logging must not interrupt authentication. */ } };
    let serverRecords = [], serverError = '', loadingServer = null;
    const read = () => {
        const local = readLocal().filter(item => !serverRecords.some(remote =>
            remote.userId === item.userId && remote.event === item.event
            && Math.abs(Date.parse(remote.timestamp) - Date.parse(item.timestamp)) < 10000));
        return [...serverRecords, ...local].map(window.SigmaAuditDisplay.authentication);
    };
    async function refreshServerHistory() {
        if (!document.getElementById('audit-auth-view') || !window.SigmaDatabase?.currentUser()?.id) return;
        if (loadingServer) return loadingServer;
        loadingServer = (async () => {
            try {
                const result = await window.SigmaDatabase.request('authentication_logs');
                serverRecords = Array.isArray(result.records) ? result.records : [];
                serverError = '';
            } catch (error) {
                serverError = error.message || 'Server authentication history could not be loaded.';
            } finally { loadingServer = null; render(); }
        })();
        return loadingServer;
    }
    // Start on page load so login redirects can use already-observed metadata.
    let networkIp = '';
    const networkReady = (async () => {
        try {
            const base = window.SigmaRecaptcha?.apiUrl?.();
            if (!base) return;
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 5000);
            try {
                const response = await window.SigmaDatabase.fetch(`${base}?action=client_network`, { cache:'no-store', signal:controller.signal });
                const result = await response.json();
                if (response.ok && result.success && typeof result.ip === 'string') networkIp = result.ip;
            } finally { clearTimeout(timer); }
        } catch (_) { /* Server unavailable: keep the IP explicitly unrecorded. */ }
    })();
    const currentUser = () => {
        for (const key of ['sigma-authenticated-user', 'currentUser']) {
            try { const user = JSON.parse(sessionStorage.getItem(key) || localStorage.getItem(key) || 'null'); if (user) return user; }
            catch (_) { /* Continue with the next session key. */ }
        }
        return null;
    };
    const device = () => {
        const ua = navigator.userAgent || '';
        const browser = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
        const platform = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Mac OS/.test(ua) ? 'macOS' : 'Device not recorded';
        return `${browser} / ${platform}`;
    };
    const escape = value => clean(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
    const date = value => window.SigmaAuditDisplay.date(value);

    function record(input) {
        const subject = input?.user || input?.subject || currentUser() || {};
        const actor = input?.actor || currentUser();
        const event = clean(input?.event);
        if (!event) return null;
        const item = {
            id: `auth-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            timestamp: input?.timestamp || now(),
            event,
            outcome: clean(input?.outcome).toLowerCase() || 'success',
            userId: idOf(subject), userName: nameOf(subject), userRole: roleOf(subject), userAvatar: clean(subject?.avatar),
            actorId: idOf(actor), actorName: nameOf(actor),
            device: clean(input?.device) || device(), ip: networkIp, details: clean(input?.details)
        };
        const records = readLocal(); records.unshift(item); write(records);
        if (!item.ip) networkReady.then(() => {
            if (!networkIp) return;
            const saved = readLocal();
            const target = saved.find(entry => entry.id === item.id);
            if (!target || target.ip) return;
            target.ip = networkIp; write(saved);
            window.dispatchEvent(new CustomEvent('sigma-authentication-log', { detail:target }));
        });
        window.dispatchEvent(new CustomEvent('sigma-authentication-log', { detail:item }));
        return item;
    }

    function statusClass(record) {
        if (record.outcome === 'failed' || record.outcome === 'error') return 'auth-event-dot--failed';
        if (record.outcome === 'warning') return 'auth-event-dot--warning';
        return 'auth-event-dot--success';
    }
    async function deleteAuthenticationLog(id) {
        if (!id) return;
        try {
            if (String(id).startsWith('server-auth-')) {
                await window.SigmaDatabase.request('authentication_logs', {data:{action:'delete', id}});
                const deleted = serverRecords.find(item => item.id === id);
                if (deleted) write(readLocal().filter(item => !(item.userId === deleted.userId && item.event === deleted.event
                    && Math.abs(Date.parse(item.timestamp) - Date.parse(deleted.timestamp)) < 10000)));
                serverRecords = serverRecords.filter(item => item.id !== id);
                await refreshServerHistory();
                return;
            }
            const records = readLocal();
            const filtered = records.filter(item => String(item.id) !== String(id));
            write(filtered);
            window.dispatchEvent(new CustomEvent('sigma-authentication-log-deleted', { detail: { id } }));
            window.dispatchEvent(new CustomEvent('sigma-authentication-log', { detail: { id, deleted: true } }));
            render();
            const table = document.querySelector('#audit-auth-view table[aria-label="Authentication logs"]');
            if (table && window.SigmaLogPagination?.reset) {
                window.SigmaLogPagination.reset(table);
            }
        } catch (err) {
            window.showToast?.(err.message || 'Authentication log could not be deleted.', 'error');
        }
    }
    window.deleteAuthenticationLog = deleteAuthenticationLog;

    function render() {
        const table = document.querySelector('#audit-auth-view table[aria-label="Authentication logs"]');
        const body = table?.tBodies?.[0]; if (!body) return;
        let status = document.getElementById('authentication-server-status');
        if (!status) { status = document.createElement('p'); status.id = 'authentication-server-status'; status.className = 'sigma-load-status'; status.setAttribute('role','status'); table.parentElement.before(status); }
        status.hidden = !serverError;
        status.textContent = serverError ? `${serverError} Showing only history available in this browser.` : '';

        const theadRow = table?.tHead?.rows?.[0];
        if (theadRow) {
            let actionTh = theadRow.querySelector('th[data-auth-actions]');
            if (!actionTh) {
                actionTh = Array.from(theadRow.cells).find(cell => cell.textContent.trim().toLowerCase() === 'action');
                if (actionTh) {
                    actionTh.dataset.authActions = 'true';
                } else {
                    actionTh = document.createElement('th');
                    actionTh.className = 'text-center';
                    actionTh.dataset.authActions = 'true';
                    actionTh.textContent = 'Action';
                    theadRow.append(actionTh);
                }
            }
        }
        const section = document.getElementById('audit-auth-view');
        section.toggleAttribute('data-authentication-detail-open', Boolean(selectedUser));
        table.parentElement.classList.toggle('sigma-table-container--unframed', Boolean(selectedUser));
        let header = document.getElementById('authentication-account-details');
        if (!header) { header = document.createElement('section'); header.id = 'authentication-account-details'; table.parentElement.before(header); }
        header.hidden = !selectedUser;
        header.replaceChildren();
        if (selectedUser) {
            const title = document.createElement('h2'); title.className = 'ai-log-detail-title'; title.textContent = selectedRecord ? 'Authentication Record Details' : 'Authentication Details';
            const identity = document.createElement('div'); identity.className = 'ai-log-detail-identity';
            const identityRow = document.createElement('div'); identityRow.className = 'ai-log-detail-name-row';
            const avatar = document.createElement('span'); avatar.className = 'ai-log-avatar'; avatar.setAttribute('aria-hidden', 'true');
            const selectedAvatarSrc = (typeof window.resolveUserAvatar === 'function'
                ? window.resolveUserAvatar({ id: selectedUser.userId, name: selectedUser.userName, avatar: selectedUser.userAvatar })
                : '') || selectedUser.userAvatar || '';
            if (selectedAvatarSrc) { const image = document.createElement('img'); image.src = selectedAvatarSrc; image.alt = ''; image.onerror = () => { avatar.innerHTML = '<i class="fa-solid fa-user"></i>'; }; avatar.append(image); }
            else avatar.innerHTML = '<i class="fa-solid fa-user"></i>';
            const text = document.createElement('div'); text.className = 'ai-log-detail-identity-text';
            const name = document.createElement('p'); name.className = 'ai-log-detail-name'; name.textContent = selectedUser.userName;
            const context = document.createElement('p'); context.append(window.SigmaAuditDisplay.details(`Role: ${selectedUser.userRole}\nAccount ID: ${selectedUser.userId || 'Not recorded'}`));
            text.append(name, context); identityRow.append(avatar, text); identity.append(identityRow);
            const toolbar = document.createElement('div'); toolbar.className = 'ai-log-detail-toolbar';
            const tabs = document.createElement('div'); tabs.className = 'ai-log-category-tabs';
            ['All Logs','Login','Account Access','Password Reset','Google Authenticator','reCAPTCHA'].forEach(label => {
                const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
                button.setAttribute('aria-pressed', String(category === label));
                button.onclick = () => { category = label; render(); }; tabs.append(button);
            });
            const search = document.createElement('form'); search.className = 'ai-log-search'; search.setAttribute('role','search');
            const wrap = document.createElement('div'); wrap.className = 'ai-log-search-input-wrap';
            const input = document.createElement('input'); input.type = 'search'; input.className = 'sigma-input sigma-search-input';
            input.placeholder = 'Search authentication logs'; input.setAttribute('aria-label',input.placeholder); input.value = detailQuery;
            const submit = document.createElement('button'); submit.type = 'submit'; submit.className = 'sigma-btn sigma-btn-primary'; submit.textContent = 'Search';
            search.onsubmit = event => { event.preventDefault(); detailQuery = input.value.trim(); render(); };
            input.onsearch = () => { if (!input.value) { detailQuery = ''; render(); } };
            wrap.append(input); search.append(wrap, submit); toolbar.append(tabs, search);
            toolbar.hidden = Boolean(selectedRecord);
            header.append(title, identity, toolbar);
        }
        document.getElementById('authentication-log-preview')?.remove();
        const records = read().filter(item => item && (!selectedRecord || item.id === selectedRecord) && (!selectedUser || selectedRecord ||
            (Boolean(item.sample) === Boolean(selectedUser.sample) && selectedUser.userId && item.userId === selectedUser.userId &&
            (category === 'All Logs' || categoryOf(item.event) === category) &&
            (!detailQuery || [item.event,item.details,item.ip,item.device,date(item.timestamp)].join(' ').toLowerCase().includes(detailQuery.toLowerCase())))))
            .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
        body.replaceChildren();
        if (!records.length) {
            const row = document.createElement('tr');
            row.className = 'sigma-log-empty-row';
            const td = document.createElement('td'); td.colSpan = 5;
            td.innerHTML = window.renderSigmaEmptyState({
                icon: 'fa-solid fa-right-to-bracket',
                title: detailQuery ? 'No matching authentication logs' : selectedUser ? 'No authentication logs in this category' : 'No authentication logs yet',
                subtitle: detailQuery ? 'Try another search or clear your filters.' : 'Recorded sign-in and account security events will appear here.'
            });
            row.append(td);
            body.append(row);
            window.SigmaLogPagination?.setRecords?.(table, [], () => row, { reset:true });
            return;
        }
        const createRow = record => {
            const row = document.createElement('tr');
            const rowAvatarSrc = (typeof window.resolveUserAvatar === 'function'
                ? window.resolveUserAvatar({ id: record.userId, name: record.userName, avatar: record.userAvatar })
                : '') || record.userAvatar || '';
            const avatar = typeof window.renderUserAvatarHtml === 'function'
                ? window.renderUserAvatarHtml({ id: record.userId, name: record.userName, avatar: rowAvatarSrc }, 'sm')
                : (rowAvatarSrc
                    ? `<img src="${escape(rowAvatarSrc)}" alt="" class="w-8 h-8 rounded-full object-cover">`
                    : '<div class="w-8 h-8 rounded-full bg-[#e2e8f0] flex items-center justify-center shrink-0" aria-hidden="true"><i class="fa-solid fa-user text-xs text-[#94a3b8]"></i></div>');
            const actor = record.actorId && record.actorId !== record.userId ? `<p class="text-xs text-black-fade mt-1">By ${escape(record.actorName)}</p>` : '';
            const ip = record.ip ? escape(record.ip) : 'Not recorded';
            row.innerHTML = `<td><div class="flex items-center gap-3">${avatar}<div><p class="text-black">${escape(record.userName)}</p><p class="text-sm text-black-fade">${escape(record.userRole)}</p>${actor}</div></div></td><td><div class="auth-event"><span class="auth-event-dot ${statusClass(record)}" aria-hidden="true"></span><div><span class="text-black">${escape(record.event)}</span>${record.details ? `<p class="text-sm text-black-fade mt-1">${escape(record.details)}</p>` : ''}</div></div></td><td><div class="flex flex-col"><span class="text-black">${ip}</span><span class="text-sm text-black-fade">${escape(record.device)}</span></div></td><td><span class="text-sm text-black-fade">${escape(date(record.timestamp))}</span></td>`;
            const timestamp = document.createElement('time');
            const detail = row.children[1].querySelector('.text-sm');
            if (detail) detail.replaceChildren(window.SigmaAuditDisplay.details(record.details));
            const identity = document.createElement('div');
            identity.className = 'flex items-center gap-3';
            const profile = row.firstElementChild.querySelector('img, [aria-hidden="true"]');
            const name = document.createElement(!selectedUser && record.userId ? 'button' : 'span');
            name.className = 'text-black';
            if (name.tagName === 'BUTTON') {
                name.type = 'button'; name.classList.add('authentication-user-link');
                name.onclick = () => openUser(record);
            }
            name.textContent = record.userName;
            if (profile) identity.append(profile);
            identity.append(name);
            row.firstElementChild.replaceChildren(identity);
            timestamp.className = 'ai-log-timestamp';
            timestamp.dateTime = Number.isFinite(Date.parse(record.timestamp)) ? new Date(record.timestamp).toISOString() : '';
            timestamp.textContent = date(record.timestamp);
            row.children[3].replaceChildren(timestamp);
            if (!selectedRecord) {
                const eventText = row.children[1].querySelector('.auth-event .text-black');
                if (eventText) {
                    const link = document.createElement('button'); link.type = 'button'; link.className = 'ai-log-interaction-button'; link.textContent = record.event; link.onclick = () => openUser(record, true); eventText.replaceWith(link);
                }
            }


            const actionTd = document.createElement('td');
            const actionsWrap = document.createElement('div');
            actionsWrap.className = 'ai-log-insight-actions notification-log-actions-wrap';

            const toggle = document.createElement('button');
            toggle.type = 'button';
            toggle.className = 'ai-log-message-more notification-log-more';
            toggle.setAttribute('aria-label', 'Authentication log actions');
            toggle.setAttribute('aria-expanded', 'false');
            toggle.innerHTML = '<i class="fa-solid fa-ellipsis" aria-hidden="true"></i>';

            const menu = document.createElement('div');
            menu.className = 'ai-log-message-menu notification-log-action-menu';
            menu.hidden = true;

            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.innerHTML = '<i class="fa-solid fa-trash-can" aria-hidden="true"></i><span>Delete Log</span>';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                menu.hidden = true;
                toggle.setAttribute('aria-expanded', 'false');
                if (!window.confirm('Delete this authentication log? This action cannot be undone.')) return;
                deleteAuthenticationLog(record.id);
            };

            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const willShow = menu.hidden;
                window.closeAllTableActionDropdowns?.(menu);
                document.querySelectorAll('#audit-auth-view .notification-log-action-menu, .ai-log-message-menu, .notification-log-action-menu').forEach(m => {
                    if (m !== menu) {
                        m.hidden = true;
                        m.classList.remove('dropup');
                        window.resetActionDropdownPosition?.(m);
                        m.previousElementSibling?.classList.remove('active');
                        m.previousElementSibling?.setAttribute('aria-expanded', 'false');
                    }
                });
                menu.hidden = !willShow;
                toggle.classList.toggle('active', willShow);
                toggle.setAttribute('aria-expanded', String(willShow));
                if (willShow) {
                    window.positionActionDropdown?.(menu, toggle);
                } else {
                    window.resetActionDropdownPosition?.(menu);
                }
            });

            menu.append(deleteBtn);
            actionsWrap.append(toggle, menu);
            actionTd.append(actionsWrap);
            row.append(actionTd);

            return row;
        };
        if (window.SigmaLogPagination?.setRecords) {
            window.SigmaLogPagination.setRecords(table, records, createRow, { reset:true });
        } else {
            records.forEach(record => body.append(createRow(record)));
        }
    }

    document.addEventListener('pointerdown', (e) => {
        const openMenu = document.querySelector('#audit-auth-view .notification-log-action-menu:not([hidden])');
        if (!openMenu) return;
        const toggle = openMenu.previousElementSibling;
        if (!openMenu.contains(e.target) && !toggle?.contains(e.target)) {
            openMenu.hidden = true;
            toggle?.setAttribute('aria-expanded', 'false');
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('#audit-auth-view .notification-log-action-menu:not([hidden])').forEach(menu => {
                menu.hidden = true;
                const toggle = menu.previousElementSibling;
                toggle?.setAttribute('aria-expanded', 'false');
                toggle?.focus();
            });
        }
    });

    window.SigmaAuthenticationLogs = { record, records:read, refresh:refreshServerHistory, render, deleteLog: deleteAuthenticationLog };
    window.renderAuthenticationLogs = render;
    window.addEventListener('storage', event => { if (event.key === KEY) render(); });
    window.addEventListener('sigma-authentication-log', render);
    document.addEventListener('DOMContentLoaded', () => { render(); refreshServerHistory(); });
    window.addEventListener('sigma:database-session-ready', refreshServerHistory);
    window.addEventListener('focus', refreshServerHistory);
    setInterval(() => {
        const section = document.getElementById('audit-auth-view');
        if (document.visibilityState === 'visible' && section && !section.classList.contains('hidden')) refreshServerHistory();
    }, 30000);
})();
