(function () {
    'use strict';
    const schoolLogo = new URL('../image/ICC logo.jpg', document.currentScript?.src || new URL('js/notification-logs.js', location.href).href).href;
    const dateFormat = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
    const formatDate = value => value && Number.isFinite(Date.parse(value)) ? dateFormat.format(new Date(value)) : 'Not recorded';
    let selection = null, detailQuery = '', direction = 'all';
    function openDetails(value) {
        selection = value; detailQuery = ''; direction = 'all';
        window.pushModalHistoryState?.('notification-account-details', () => openDetails(value));
        window.SigmaNotifications?.syncRecipientReceipts?.();
        render();
        const panel = document.getElementById('notification-account-details');
        window.SigmaLogPagination?.reset(document.getElementById('notification-log-rows')?.closest('table'));
        requestAnimationFrame(() => {
            for (let parent = panel?.parentElement; parent; parent = parent.parentElement) {
                if (parent.scrollHeight > parent.clientHeight) parent.scrollTop = 0;
            }
            window.scrollTo({ top:0, behavior:'instant' });
            panel?.querySelector('h2')?.focus({preventScroll:true});
        });
    }
    function closeDetails() { selection = null; detailQuery = ''; direction = 'all'; render(); }
    window.closeNotificationLogDetails = closeDetails;

    function deleteNotificationLog(target) {
        if (!target) return;
        try {
            const key = 'sigma-notification-logs-v1';
            const logs = JSON.parse(localStorage.getItem(key) || '[]');
            if (Array.isArray(logs)) {
                const targetRecipientId = String(target.recipientId || '');
                const targetNotifId = String(target.notificationId || '');
                const targetRole = target.role;
                const targetId = String(target.id || '');

                const updated = [];
                for (const item of logs) {
                    if (!item) continue;
                    const itemRecipientId = String(item.recipientId || '');
                    const itemNotifId = String(item.notificationId || '');
                    const itemId = String(item.id || '');

                    // Direct ID match
                    if (targetId && itemId === targetId) continue;

                    // If target was synthesized for an individual recipient under a group
                    if (targetId.includes(':') && targetRecipientId && targetNotifId) {
                        if (itemNotifId === targetNotifId && itemRecipientId === targetRecipientId) {
                            continue;
                        }
                        if (itemNotifId === targetNotifId && (!targetRole || item.role === targetRole) && Array.isArray(item.recipients)) {
                            item.recipients = item.recipients.filter(r => String(r?.id || '') !== targetRecipientId);
                        }
                        updated.push(item);
                        continue;
                    }

                    // Matching specific notification and recipient
                    if (targetNotifId && itemNotifId === targetNotifId && targetRecipientId === itemRecipientId && (!targetRole || item.role === targetRole)) {
                        continue;
                    }

                    // If target is an overview group log (no recipientId)
                    if (!targetRecipientId && targetNotifId && itemNotifId === targetNotifId && (!targetRole || item.role === targetRole)) {
                        continue;
                    }

                    updated.push(item);
                }
                localStorage.setItem(key, JSON.stringify(updated));
            }
        } catch (err) {
            console.error('[Notification Logs] Delete error:', err);
        }
        window.dispatchEvent(new Event('notification-logs-updated'));
        render();
        const table = document.getElementById('notification-log-rows')?.closest('table');
        if (table && window.SigmaLogPagination?.reset) {
            window.SigmaLogPagination.reset(table);
        }
    }
    window.deleteNotificationLog = deleteNotificationLog;

    function render() {
        const body = document.getElementById('notification-log-rows');
        if (!body) return;
        const recorded = window.SigmaNotifications?.getLogs() || [];
        const table = body.closest('table');
        let actionHeading = table.querySelector('th[data-notification-actions]');
        if (!actionHeading) {
            actionHeading = Array.from(table.tHead?.rows?.[0]?.cells || []).find(th => th.textContent.trim().toLowerCase() === 'action');
            if (actionHeading) {
                actionHeading.dataset.notificationActions = 'true';
            } else {
                actionHeading = document.createElement('th');
                actionHeading.dataset.notificationActions = 'true';
                actionHeading.className = 'text-center';
                actionHeading.textContent = 'Action';
                table.tHead.rows[0].append(actionHeading);
            }
        }
        actionHeading.hidden = false;
        table.parentElement.classList.toggle('sigma-table-container--unframed', Boolean(selection));
        const readHeading = Array.from(table.querySelectorAll('thead th')).find(th => th.textContent.trim() === 'Read');
        if (readHeading) readHeading.hidden = !selection;
        table.classList.toggle('notification-log-overview', !selection);
        let panel = document.getElementById('notification-account-details');
        if (!panel) { panel = document.createElement('section'); panel.id = 'notification-account-details'; table.parentElement.before(panel); }
        panel.replaceChildren(); panel.hidden = !selection;
        document.getElementById('audit-notifications-view')?.toggleAttribute('data-notification-detail-open', Boolean(selection));
        const matchesPerson = (log, side) => selection?.id && String(log[side + 'Id'] || '') === selection.id;
        const belongs = log => !selection || (selection.kind === 'person'
            ? (direction !== 'received' && matchesPerson(log, 'sender')) || (direction !== 'sent' && matchesPerson(log, 'recipient'))
            : selection.kind === 'group' ? String(log.notificationId) === selection.notificationId && log.role === selection.role
            : !log.senderId && log.senderName === selection.name);
        if (selection) {
            const title = document.createElement('h2'); title.className = 'ai-log-detail-title'; title.tabIndex = -1; title.textContent = selection.kind === 'group' ? 'Notification Recipient Details' : 'Notification Activity Details';
            const identity = document.createElement('div'); identity.className = 'notification-detail-identity'; identity.append(selection.avatar.cloneNode(true));
            const name = document.createElement('div'); name.className = 'notification-detail-identity-text';
            const fullName = document.createElement('div'); fullName.textContent = selection.name;
            const context = document.createElement('p'); context.className='notification-detail-context';
            context.textContent = selection.kind === 'person' ? [selection.role, 'Account ID: ' + selection.id].filter(Boolean).join(' | ')
                : selection.kind === 'group' ? 'Notification recipients' : 'System notification sender';
            name.append(fullName,context); identity.append(name);
            const toolbar = document.createElement('div'); toolbar.className = 'ai-log-detail-toolbar';
            const tabs = document.createElement('div'); tabs.className = 'ai-log-category-tabs';
            for (const [id, label] of selection.kind === 'person' ? [['all','All Notifications'],['sent','Sent'],['received','Received']] : [['all',selection.kind === 'group' ? 'Recipients' : 'Sent Notifications']]) {
                const button = document.createElement('button'); button.type = 'button'; button.textContent = label; button.setAttribute('aria-pressed',String(direction === id)); button.onclick = () => { direction=id; render(); window.SigmaLogPagination?.reset(table); }; tabs.append(button);
            }
            const form = document.createElement('form'); form.className = 'ai-log-search';
            const input = document.createElement('input'); input.type='search'; input.className='sigma-input'; input.placeholder='Search notification logs'; input.setAttribute('aria-label','Search notification logs'); input.value=detailQuery;
            const submit = document.createElement('button'); submit.type='submit'; submit.className='sigma-btn sigma-btn-primary'; submit.textContent='Search';
            form.append(input,submit); form.onsubmit=event=>{event.preventDefault();detailQuery=input.value;render();window.SigmaLogPagination?.reset(table);};
            toolbar.append(tabs,form); panel.append(title,identity,toolbar);
            if (selection.kind === 'group') { const note=document.createElement('p');note.className='text-sm text-black-fade';note.textContent='Individual names appear only when a recipient record was saved. A group entry does not confirm delivery to each member.';panel.append(note); }
        }
        let displayRecords = !selection ? recorded.filter(log => !log.feedConfirmedAt || !recorded.some(group =>
            !group.recipientId && group.role === log.role && String(group.notificationId) === String(log.notificationId))) : recorded;
        if (selection?.kind === 'group') {
            const matching = recorded.filter(belongs);
            const individuals = new Map();
            for (const log of matching) {
                if (log.recipientId) individuals.set(String(log.recipientId), log);
                else for (const recipient of log.recipients || []) {
                    const id = String(recipient.id || '');
                    if (id && !matching.some(item => String(item.recipientId || '') === id) && !individuals.has(id)) individuals.set(id, { ...log, id:log.id + ':' + id,
                        recipientId:id, recipient:recipient.name, role:recipient.role || log.role,
                        readAt:null, recipientReadUnknown:true });
                }
            }
            displayRecords = [...individuals.values()];
        }
        const logs = displayRecords.filter(belongs).slice()
            .filter(log => [log.senderName, log.senderId, log.senderRole, log.recipient, log.recipientId, log.role, log.title, log.type, log.related, log.channel, log.status, log.readAt ? 'Read' : 'Unread', formatDate(log.timestamp)].join(' ').toLowerCase().includes(selection ? detailQuery.toLowerCase() : window.getAuditLogSearchQuery?.() || ''))
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
            let accounts = [];
            try { accounts = JSON.parse(localStorage.getItem('sigma-admin-users') || '[]'); } catch (_) {}
            const accountFor = id => id && Array.isArray(accounts) && accounts.find(user => [user.uid, user.id].some(value => value != null && String(value) === String(id)));
            const accountName = id => {
                const user = accountFor(id);
                return user && ([user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ') || user.fullName || user.name);
            };
            const person = (name, detail, kind, user, target) => {
                const sameView = selection && target && selection.kind === target.kind && (
                    target.kind === 'person' ? selection.id === target.id
                    : target.kind === 'group' ? selection.notificationId === target.notificationId && selection.role === target.role
                    : selection.name === name);
                if (sameView) target = null;
                const td = document.createElement('td');
                const wrap = document.createElement('div'); wrap.className = 'notification-log-person';
                const avatar = document.createElement('span'); avatar.className = 'notification-log-avatar notification-log-avatar--' + kind;
                avatar.setAttribute('aria-hidden', 'true');
                const fallback = () => {
                    const icon = document.createElement('i');
                    icon.className = 'fa-solid ' + ({sigma:'fa-bolt',school:'fa-school',group:'fa-users'}[kind] || 'fa-user');
                    avatar.replaceChildren(icon);
                };
                const src = kind === 'school' ? schoolLogo : kind === 'person' && window.resolveUserAvatar?.(user || { id: detail, name });
                if (src && /^(https?:|data:image\/|blob:|\.?\.?\/|image\/|uploads\/)/i.test(src)) {
                    const image = document.createElement('img'); image.src = src; image.alt = ''; image.onerror = fallback; avatar.append(image);
                } else fallback();
                const text = document.createElement('div'); text.className = 'notification-log-person-text';
                const primary = document.createElement(target ? 'button' : 'div'); primary.textContent = name;
                if (target) { primary.type='button';primary.className='notification-log-name-link';primary.onclick=()=>openDetails({...target,name,avatar}); }
                text.append(primary);
                const cleanDetailId = String(detail || '').replace(/^ID:\s*/i, '').trim();
                if (cleanDetailId) { const secondary = document.createElement('div'); secondary.className = 'text-sm text-black-fade'; secondary.textContent = 'ID: ' + cleanDetailId; text.append(secondary); }
                wrap.append(avatar, text); td.append(wrap); row.append(td);
            };
            const sender = accountFor(log.senderId);
            const senderName = accountName(log.senderId) || log.senderName || 'Not recorded';
            const senderKind = sender || log.senderId || /^(student|teacher|admin|master admin)$/i.test(log.senderRole || log.senderType || '') ? 'person'
                : /sigma/i.test(senderName) ? 'sigma' : senderName === 'Not recorded' ? 'person' : 'school';
            person(senderName, String(log.senderId || ''), senderKind, sender, log.senderId ? {kind:'person',id:String(log.senderId),role:log.senderRole || sender?.role || log.senderType || ''} : log.senderName ? {kind:'system'} : null);
            const recipientName = accountName(log.recipientId) || log.recipient || log.recipientId || 'Not recorded';
            const groupName = recipientName === 'admin audience' ? 'All Administrators'
                : recipientName.replace(/^student:\s*(.+)$/i, '$1 Students');
            person(groupName, String(log.recipientId || ''), log.recipientId ? 'person' : 'group', accountFor(log.recipientId), log.recipientId ? {kind:'person',id:String(log.recipientId),role:log.role} : {kind:'group',notificationId:String(log.notificationId),role:log.role});
            cell(log.title, [log.type, log.related].filter(Boolean).join(' / '));
            cell(log.status === 'Stored in-app' ? 'Created' : log.status === 'Failed to store' ? 'Failed' : log.status);
            if (selection) cell(log.recipientReadUnknown ? 'Not recorded' : log.readAt ? 'Read' : 'Unread', log.readAt ? formatDate(log.readAt) : '');
            cell(formatDate(log.timestamp));
            const action = document.createElement('td');
            const actionsWrap = document.createElement('div');
            actionsWrap.className = 'ai-log-insight-actions notification-log-actions-wrap';
            const toggle = document.createElement('button');
            toggle.type = 'button';
            toggle.className = 'ai-log-message-more notification-log-more';
            toggle.setAttribute('aria-label', 'Notification actions');
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
                if (!window.confirm('Delete this notification log? This action cannot be undone.')) return;
                deleteNotificationLog(log);
            };

            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const willShow = menu.hidden;
                window.closeAllTableActionDropdowns?.(menu);
                document.querySelectorAll('.notification-log-action-menu, .ai-log-message-menu').forEach(m => {
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
            action.append(actionsWrap);
            row.append(action);
            return row;
        };
        if (!logs.length) {
            const row = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = selection ? 7 : 6;
            td.textContent = selection?.kind === 'group' ? 'No individual recipient records were saved for this notification.' : (detailQuery || window.getAuditLogSearchQuery?.()) ? 'No matching notification logs.' : 'No notification logs yet.';
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

    document.addEventListener('pointerdown', (e) => {
        const openMenu = document.querySelector('.notification-log-action-menu:not([hidden])');
        if (!openMenu) return;
        const toggle = openMenu.previousElementSibling;
        if (!openMenu.contains(e.target) && !toggle?.contains(e.target)) {
            openMenu.hidden = true;
            toggle?.setAttribute('aria-expanded', 'false');
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.notification-log-action-menu:not([hidden])').forEach(menu => {
                menu.hidden = true;
                const toggle = menu.previousElementSibling;
                toggle?.setAttribute('aria-expanded', 'false');
                toggle?.focus();
            });
        }
    });

    window.renderNotificationLogs = render;
    window.deleteNotificationLog = deleteNotificationLog;
    if (window.SigmaNotifications) window.SigmaNotifications.deleteLog = deleteNotificationLog;
    window.filterNotificationAuditLogs = () => { render(); window.SigmaLogPagination?.reset(document.getElementById('notification-log-rows').closest('table')); };
    window.addEventListener('notification-logs-updated', render);
    window.addEventListener('storage', event => { if (!event.key || event.key === 'sigma-notification-logs-v1') render(); });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
