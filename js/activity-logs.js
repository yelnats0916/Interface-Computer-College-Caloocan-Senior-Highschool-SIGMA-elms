/* Activity audit trail for Sigma ELMS.
 * Captures comprehensive platform operations performed by Administrators, Teachers, and Students.
 */
(function () {
    'use strict';

    const KEY = 'sigma-activity-logs-v1';
    let selectedUser = null, selectedRecord = null;
    let selectedCategory = 'All Activities';
    let detailQuery = '';

    const dateFormat = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Manila',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });

    const formatDate = value => {
        if (!value) return 'Not recorded';
        const parsed = Date.parse(value);
        return Number.isFinite(parsed) ? dateFormat.format(new Date(parsed)) : String(value);
    };

    const clean = value => String(value || '').trim();
    const esc = value => clean(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    // Module badge color mapping
    const moduleBadgeStyles = {
        'System': 'bg-slate-100 text-slate-700 border-slate-200',
        'Grades': 'bg-emerald-50 text-emerald-700 border-emerald-200',
        'Assessments': 'bg-purple-50 text-purple-700 border-purple-200',
        'Curriculum': 'bg-blue-50 text-blue-700 border-blue-200',
        'Submissions': 'bg-amber-50 text-amber-700 border-amber-200',
        'Users': 'bg-sky-50 text-sky-700 border-sky-200',
        'Security': 'bg-red-50 text-red-700 border-red-200',
        'Announcements': 'bg-teal-50 text-teal-700 border-teal-200',
        'Classes': 'bg-indigo-50 text-indigo-700 border-indigo-200',
        'AI Assistant': 'bg-violet-50 text-violet-700 border-violet-200',
        'Communication': 'bg-cyan-50 text-cyan-700 border-cyan-200'
    };

    const getModuleBadgeClass = mod => {
        const key = Object.keys(moduleBadgeStyles).find(k => k.toLowerCase() === clean(mod).toLowerCase());
        return moduleBadgeStyles[key] || 'bg-slate-100 text-slate-700 border-slate-200';
    };

    // User lookup helper
    function getRegisteredAccounts() {
        try {
            const list = JSON.parse(localStorage.getItem('sigma-admin-users') || '[]');
            return Array.isArray(list) ? list : [];
        } catch (_) { return []; }
    }

    function resolveAccount(userId) {
        if (!userId) return null;
        const accounts = getRegisteredAccounts();
        return accounts.find(u => [u.id, u.uid, u.userId, u.lrn, u.studentNumber, u.employeeId]
            .some(v => v != null && String(v).trim().toLowerCase() === String(userId).trim().toLowerCase()));
    }

    const readLocal = () => {
        try {
            const raw = localStorage.getItem(KEY);
            const saved = raw ? JSON.parse(raw) : [];
            const items = Array.isArray(saved) ? saved.filter(item => item && !/^act-(adm|tch|stu)-[0-9]{3}$/.test(String(item.id))) : [];
            if (Array.isArray(saved) && items.length !== saved.length) localStorage.setItem(KEY, JSON.stringify(items));
            return items.map(item => {
                let details = item.details || item.description || '';
                if (details === '—' || details === '--' || details === '-') details = '';
                if (!details) {
                    if (item.announcementId || item.module === 'Announcements') {
                        details = [item.title ? `"${item.title}"` : '', item.audience ? `Audience: ${item.audience}` : '', item.section ? `Section: ${item.section}` : '', item.subjectId ? `Subject: ${item.subjectId}` : ''].filter(Boolean).join(' · ');
                    }
                    if (!details) {
                        details = [item.assessment, item.section, item.subjectId].filter(Boolean).join(' · ');
                    }
                }
                return {
                    id: item.id || '',
                    userId: item.userId || item.actorId || 'ID not recorded',
                    userName: item.userName || item.actor || 'User',
                    userRole: item.userRole || item.role || 'User',
                    userAvatar: item.userAvatar || item.avatar || '',
                    activity: item.activity || item.action || 'Activity Recorded',
                    module: item.module || 'System',
                    details: details || '',
                    timestamp: item.timestamp || ''
                };
            });
        } catch (_) {
            return [];
        }
    };

    const write = records => {
        try {
            localStorage.setItem(KEY, JSON.stringify(records.slice(0, 1000)));
        } catch (e) {
            console.error('[Activity Logs] Storage save error:', e);
        }
    };

    let serverRecords = [], serverError = '', pending = null;
    const read = () => [...serverRecords, ...readLocal().filter(item => !serverRecords.some(remote =>
        remote.userId === item.userId && remote.activity === item.activity
        && Math.abs(Date.parse(remote.timestamp) - Date.parse(item.timestamp)) < 10000))].map(window.SigmaAuditDisplay.activity);
    async function refresh() {
        if (!document.getElementById('audit-activity-view') || !window.SigmaDatabase?.currentUser()?.id) return;
        if (pending) return pending;
        pending = (async () => {
            try {
                const result = await window.SigmaDatabase.request('activity_logs');
                serverRecords = Array.isArray(result.records) ? result.records : []; serverError = '';
            } catch (error) { serverError = error.message || 'Unable to load activity logs.'; }
            finally { pending = null; render(); }
        })();
        return pending;
    }
    async function deleteActivityLog(id) {
        if (!id) return;
        try {
            if (String(id).startsWith('server-')) {
                await window.SigmaDatabase.request('activity_logs', {data:{action:'delete',id}});
                await refresh(); return;
            }
            const records = readLocal();
            const filtered = records.filter(item => String(item.id) !== String(id));
            write(filtered);
            window.dispatchEvent(new CustomEvent('sigma-activity-logs-updated', { detail: { id, deleted: true } }));
            render();
            const table = document.querySelector('#audit-activity-view table[aria-label="Activity logs"]');
            if (table && window.SigmaLogPagination?.reset) {
                window.SigmaLogPagination.reset(table);
            }
        } catch (err) {
            window.showToast?.(err.message || 'Activity log could not be deleted.', 'error');
        }
    }

    function openUser(userRecord, isolated = false) {
        selectedRecord = isolated ? userRecord.id : null;
        selectedUser = userRecord;
        selectedCategory = 'All Activities';
        detailQuery = '';
        window.pushModalHistoryState?.('activity-account-details', () => openUser(userRecord, isolated));
        render();
        window.SigmaLogPagination?.reset(document.querySelector('#audit-activity-view table'));
        const header = document.getElementById('activity-account-details');
        header?.scrollIntoView({ block: 'start' });
        header?.querySelector('h2')?.focus({ preventScroll: true });
    }

    function closeDetails() {
        selectedUser = null; selectedRecord = null;
        selectedCategory = 'All Activities';
        detailQuery = '';
        render();
    }
    window.closeActivityLogDetails = closeDetails;

    function render() {
        const table = document.querySelector('#audit-activity-view table[aria-label="Activity logs"]');
        const body = document.getElementById('activity-log-rows') || table?.tBodies?.[0];
        if (!table || !body) return;
        let notice = document.getElementById('activity-server-status');
        if (!notice) { notice = document.createElement('div'); notice.id = 'activity-server-status'; notice.setAttribute('role','status'); table.after(notice); }
        notice.hidden = !serverError;
        notice.replaceChildren();
        if (serverError) {
            notice.className = 'sigma-load-status';
            const message = document.createElement('span'); message.textContent = 'Unable to load activity logs.';
            const retry = document.createElement('button'); retry.type = 'button'; retry.className = 'sigma-retry-link'; retry.textContent = 'Refresh'; retry.onclick = refresh;
            notice.append(message,retry);
        }


        const section = document.getElementById('audit-activity-view');
        section?.toggleAttribute('data-activity-detail-open', Boolean(selectedUser));
        if (selectedUser) {
            section?.setAttribute('data-ai-user-detail-open', 'true');
            table.parentElement?.classList.add('sigma-table-container--unframed', 'ai-log-message-frame');
            table.parentElement?.classList.remove('overflow-x-auto');
            table.classList.add('ai-log-history-table');
        } else {
            section?.removeAttribute('data-ai-user-detail-open');
            table.parentElement?.classList.remove('sigma-table-container--unframed', 'ai-log-message-frame');
            table.parentElement?.classList.add('overflow-x-auto');
            table.classList.remove('ai-log-history-table');
        }

        // Manage Drilldown Detail Header
        let header = document.getElementById('activity-account-details');
        if (!header) {
            header = document.createElement('section');
            header.id = 'activity-account-details';
            table.parentElement.before(header);
        }
        header.hidden = !selectedUser;
        header.replaceChildren();

        if (selectedUser) {
            const title = document.createElement('h2');
            title.className = 'ai-log-detail-title';
            title.tabIndex = -1;
            title.textContent = selectedRecord ? 'Activity Record Details' : 'User Activity Details';

            const identity = document.createElement('div');
            identity.className = 'ai-log-detail-identity';
            const identityRow = document.createElement('div');
            identityRow.className = 'ai-log-detail-name-row';

            const avatarSpan = document.createElement('span');
            avatarSpan.className = 'ai-log-avatar';
            avatarSpan.setAttribute('aria-hidden', 'true');
            const detailCleanId = String(selectedUser.userId || '').replace(/^ID:\s*/i, '').trim();
            const resolvedDetailAvatar = (typeof window.resolveUserAvatar === 'function'
                ? window.resolveUserAvatar({ id: detailCleanId, name: selectedUser.userName, avatar: selectedUser.userAvatar })
                : '') || selectedUser.userAvatar || '';
            if (resolvedDetailAvatar) {
                const img = document.createElement('img');
                img.src = resolvedDetailAvatar;
                img.alt = '';
                img.onerror = () => { avatarSpan.innerHTML = '<i class="fa-solid fa-user"></i>'; };
                avatarSpan.append(img);
            } else {
                avatarSpan.innerHTML = '<i class="fa-solid fa-user"></i>';
            }

            const textWrap = document.createElement('div');
            textWrap.className = 'ai-log-detail-identity-text';
            const userNameP = document.createElement('p');
            userNameP.className = 'ai-log-detail-name';
            userNameP.textContent = selectedUser.userName;

            const userMetaP = document.createElement('p');
            userMetaP.className = 'text-black-fade';
            const cleanUserId = String(selectedUser.userId || '').replace(/^ID:\s*/i, '');
            userMetaP.textContent = `${selectedUser.userRole || 'User'} | Account ID: ${cleanUserId || 'Not recorded'}`;

            textWrap.append(userNameP, userMetaP);
            identityRow.append(avatarSpan, textWrap);
            identity.append(identityRow);

            const toolbar = document.createElement('div');
            toolbar.className = 'ai-log-detail-toolbar';

            const tabs = document.createElement('div');
            tabs.className = 'ai-log-category-tabs';
            const categories = ['All Activities', 'System', 'Security', 'Attendance', 'Grades', 'Assessments', 'Curriculum', 'Submissions', 'Classes', 'Users'];
            categories.forEach(cat => {
                const tabBtn = document.createElement('button');
                tabBtn.type = 'button';
                tabBtn.textContent = cat;
                tabBtn.setAttribute('aria-pressed', String(selectedCategory === cat));
                tabBtn.onclick = () => {
                    selectedCategory = cat;
                    render();
                    if (window.SigmaLogPagination?.reset) window.SigmaLogPagination.reset(table);
                };
                tabs.append(tabBtn);
            });

            const searchForm = document.createElement('form');
            searchForm.className = 'ai-log-search';
            searchForm.setAttribute('role', 'search');
            const wrap = document.createElement('div');
            wrap.className = 'ai-log-search-input-wrap';
            const searchInput = document.createElement('input');
            searchInput.type = 'search';
            searchInput.className = 'sigma-input sigma-search-input';
            searchInput.placeholder = 'Search user activities...';
            searchInput.setAttribute('aria-label', searchInput.placeholder);
            searchInput.value = detailQuery;

            const submitBtn = document.createElement('button');
            submitBtn.type = 'submit';
            submitBtn.className = 'sigma-btn sigma-btn-primary';
            submitBtn.textContent = 'Search';

            searchForm.onsubmit = e => {
                e.preventDefault();
                detailQuery = searchInput.value.trim();
                render();
                if (window.SigmaLogPagination?.reset) window.SigmaLogPagination.reset(table);
            };
            searchInput.onsearch = () => {
                if (!searchInput.value) {
                    detailQuery = '';
                    render();
                    if (window.SigmaLogPagination?.reset) window.SigmaLogPagination.reset(table);
                }
            };

            wrap.append(searchInput);
            searchForm.append(wrap, submitBtn);
            toolbar.hidden = Boolean(selectedRecord);
            toolbar.append(tabs, searchForm);

            const navigation = document.createElement('div'); navigation.className = 'audit-detail-navigation';
            const back = document.createElement('button'); back.type = 'button'; back.className = 'sigma-btn sigma-btn-white sigma-btn-md'; back.textContent = 'Back to Activity Logs'; back.onclick = closeDetails;
            navigation.append(back);
            if (selectedRecord && selectedUser.userId && selectedUser.userId !== 'ID not recorded') {
                const all = document.createElement('button'); all.type = 'button'; all.className = 'sigma-retry-link'; all.textContent = 'View all activity for this user'; all.onclick = () => openUser(selectedUser); navigation.append(all);
            }
            header.append(navigation, title, identity, toolbar);
        }

        // Adjust Table Header depending on main table vs drilldown
        const thead = table.tHead || table.querySelector('thead');
        if (thead && thead.rows[0]) {
            const tr = thead.rows[0];
            tr.replaceChildren();
            if (selectedUser) {
                // In drilldown: Activity | Module | Details | Timestamp | Action
                [
                    { label: 'Activity', width: '22%' },
                    { label: 'Module', width: '14%' },
                    { label: 'Details', width: '40%' },
                    { label: 'Timestamp', width: '16%' },
                    { label: 'Action', width: '8%', className: 'text-center' }
                ].forEach(({ label, width, className }) => {
                    const th = document.createElement('th');
                    th.textContent = label;
                    if (width) th.style.width = width;
                    if (className) th.className = className;
                    tr.append(th);
                });
            } else {
                // In main table: User | Activity | Module | Timestamp (NO Action column on main table)
                ['User', 'Activity', 'Module', 'Timestamp'].forEach(label => {
                    const th = document.createElement('th');
                    th.textContent = label;
                    tr.append(th);
                });
            }
        }

        // Filter records
        const allRecords = read();
        const globalSearch = window.getAuditLogSearchQuery?.() || '';

        const records = allRecords.filter(item => {
            if (!item) return false;
            if (selectedRecord && item.id !== selectedRecord) return false;
            if (selectedUser) {
                // Must match the selected user
                if (!selectedRecord && item.userId !== selectedUser.userId) return false;
                // Category match
                if (selectedCategory !== 'All Activities' && clean(item.module).toLowerCase() !== selectedCategory.toLowerCase()) {
                    return false;
                }
                // Detail query search
                if (detailQuery) {
                    const haystack = [item.activity, item.module, item.details, formatDate(item.timestamp)].join(' ').toLowerCase();
                    if (!haystack.includes(detailQuery.toLowerCase())) return false;
                }
            } else {
                // Main overview table search
                if (globalSearch) {
                    const haystack = [item.userName, item.userId, item.userRole, item.activity, item.module, item.details, formatDate(item.timestamp)].join(' ').toLowerCase();
                    if (!haystack.includes(globalSearch.toLowerCase())) return false;
                }
            }
            return true;
        }).sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));

        body.replaceChildren();

        if (!records.length) {
            const row = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = selectedUser ? 5 : 4;
            row.className = 'sigma-log-empty-row';
            const isSearch = Boolean(detailQuery || globalSearch);
            td.innerHTML = window.renderSigmaEmptyState({
                icon: 'fa-solid fa-shoe-prints',
                title: isSearch ? 'No matching activity logs' : selectedUser ? 'No activities in this category' : 'No activity logs yet',
                subtitle: isSearch ? 'Try another search or clear your filters.' : selectedUser ? 'Recorded account activity will appear here.' : 'Recorded activity events will appear here.'
            });
            row.append(td);
            body.append(row);
            if (window.SigmaLogPagination?.setRecords) {
                window.SigmaLogPagination.setRecords(table, [], () => row, { reset: true });
            }
            return;
        }

        const renderRow = record => {
            const row = document.createElement('tr');

            if (selectedUser) {
                // 1. Activity column
                const actTd = document.createElement('td');
                const actTitle = document.createElement(selectedRecord ? 'p' : 'button');
                actTitle.className = 'text-black font-medium';
                actTitle.textContent = record.activity;
                if (!selectedRecord) { actTitle.type = 'button'; actTitle.className = 'ai-log-interaction-button'; actTitle.onclick = () => openUser(record, true); }
                actTd.append(actTitle);

                // 2. Module column (normal plain text, not badge)
                const modTd = document.createElement('td');
                const modText = document.createElement('span');
                modText.className = 'text-black';
                modText.textContent = record.module || 'System';
                modTd.append(modText);

                // 3. Details column
                const detTd = document.createElement('td');
                detTd.className = 'text-black';
                detTd.textContent = window.SigmaAuditDisplay.activity(record).details;

                // 4. Timestamp column
                const timeTd = document.createElement('td');
                const timeEl = document.createElement('time');
                timeEl.className = 'text-black-fade';
                timeEl.dateTime = Number.isFinite(Date.parse(record.timestamp)) ? new Date(record.timestamp).toISOString() : '';
                timeEl.textContent = formatDate(record.timestamp);
                timeTd.append(timeEl);

                // 5. Action column (with 3-dots and Delete Log matching AI logs)
                const actionTd = document.createElement('td');
                actionTd.className = 'text-center';
                const actionsWrap = document.createElement('div');
                actionsWrap.className = 'ai-log-insight-actions';

                const toggle = document.createElement('button');
                toggle.type = 'button';
                toggle.className = 'ai-log-message-more';
                toggle.title = 'Activity actions';
                toggle.setAttribute('aria-label', 'Activity log actions');
                toggle.setAttribute('aria-expanded', 'false');
                toggle.innerHTML = '<i class="fa-solid fa-ellipsis" aria-hidden="true"></i>';

                const menu = document.createElement('div');
                menu.className = 'ai-log-message-menu';
                menu.hidden = true;

                const deleteBtn = document.createElement('button');
                deleteBtn.type = 'button';
                deleteBtn.innerHTML = '<i class="fa-solid fa-trash-can" aria-hidden="true"></i><span>Delete Log</span>';
                deleteBtn.onclick = (e) => {
                    e.stopPropagation();
                    menu.hidden = true;
                    toggle.setAttribute('aria-expanded', 'false');
                    if (!window.confirm('Delete this activity log? This action cannot be undone.')) return;
                    deleteActivityLog(record.id);
                };

                toggle.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const willShow = menu.hidden;
                    window.closeAllTableActionDropdowns?.(menu);
                    document.querySelectorAll('.ai-log-message-menu, .notification-log-action-menu').forEach(m => {
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

                if (String(record.id).startsWith('server-lifecycle-')) toggle.hidden = true;
                else menu.append(deleteBtn);
                actionsWrap.append(toggle, menu);
                actionTd.append(actionsWrap);

                row.append(actTd, modTd, detTd, timeTd, actionTd);
            } else {
                // Overview Main Table Row
                // 1. User Column (Avatar, Clickable Name, Subtitle ID - exactly copying AI logs main table)
                const userTd = document.createElement('td');
                const cleanId = String(record.userId || '').replace(/^ID:\s*/i, '');

                const userBtn = document.createElement('button');
                userBtn.type = 'button';
                userBtn.className = 'ai-log-user-button';
                userBtn.dataset.userId = cleanId;
                userBtn.setAttribute('aria-label', 'View activity for ' + record.userName);
                userBtn.onclick = () => openUser(record, !record.userId || record.userId === 'ID not recorded');

                const avatar = document.createElement('span');
                avatar.className = 'ai-log-avatar';
                avatar.setAttribute('aria-hidden', 'true');
                const resolvedRowAvatar = (typeof window.resolveUserAvatar === 'function'
                    ? window.resolveUserAvatar({ id: cleanId, name: record.userName, avatar: record.userAvatar })
                    : '') || record.userAvatar || '';
                if (resolvedRowAvatar) {
                    const img = document.createElement('img');
                    img.src = resolvedRowAvatar;
                    img.alt = '';
                    img.onerror = () => { avatar.innerHTML = '<i class="fa-solid fa-user"></i>'; };
                    avatar.append(img);
                } else {
                    avatar.innerHTML = '<i class="fa-solid fa-user"></i>';
                }

                const identity = document.createElement('span');
                identity.className = 'ai-log-user-identity';

                const nameSpan = document.createElement('span');
                nameSpan.className = 'sigma-table-primary-text';
                nameSpan.textContent = record.userName;

                const idSpan = document.createElement('span');
                idSpan.className = 'ai-log-user-id text-black-fade';
                idSpan.textContent = cleanId ? 'ID: ' + cleanId : 'Account ID not recorded';

                identity.append(nameSpan, idSpan);
                userBtn.append(avatar, identity);
                userTd.append(userBtn);

                // 2. Activity Column (with ai-log-interaction-button matching AI logs)
                const actTd = document.createElement('td');
                const actBtn = document.createElement('button');
                actBtn.type = 'button';
                actBtn.className = 'ai-log-interaction-button';
                actBtn.textContent = record.activity;
                actBtn.setAttribute('aria-label', `View ${record.activity} activity for ${record.userName}`);
                actBtn.onclick = () => openUser(record, true);
                actTd.append(actBtn);
                if (record.details) {
                    const actDetail = document.createElement('p');
                    actDetail.className = 'ai-log-request-preview';
                    actDetail.textContent = record.details;
                    actTd.append(actDetail);
                }

                // 3. Module Column (normal plain text, NOT a badge)
                const modTd = document.createElement('td');
                const modText = document.createElement('span');
                modText.className = 'text-black';
                modText.textContent = record.module || 'System';
                modTd.append(modText);

                // 4. Timestamp Column
                const timeTd = document.createElement('td');
                const timeEl = document.createElement('time');
                timeEl.className = 'text-black-fade';
                timeEl.dateTime = Number.isFinite(Date.parse(record.timestamp)) ? new Date(record.timestamp).toISOString() : '';
                timeEl.textContent = formatDate(record.timestamp);
                timeTd.append(timeEl);

                row.append(userTd, actTd, modTd, timeTd);
            }

            return row;
        };

        // Pagination integration
        if (window.SigmaLogPagination?.setRecords) {
            window.SigmaLogPagination.setRecords(table, records, renderRow, { reset: false });
        } else {
            records.forEach(record => body.append(renderRow(record)));
        }
    }

    // Dynamic record API for the entire platform
    function recordActivityLog(activity, options = {}) {
        const act = clean(activity);
        if (!act) return null;

        let currentUser = null;
        for (const k of ['sigma-authenticated-user', 'currentUser']) {
            try {
                const u = JSON.parse(sessionStorage.getItem(k) || localStorage.getItem(k) || 'null');
                if (u) { currentUser = u; break; }
            } catch (_) {}
        }

        const user = options.user || currentUser || {};
        const userId = clean(options.userId || user.uid || user.id || user.studentNumber || user.employeeId);
        if (!userId || !currentUser) return null;
        const userName = clean(options.userName || user.fullName || user.name || [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Unknown account');
        const userRole = clean(options.userRole || user.role || user.type || 'Not recorded');
        const userAvatar = clean(options.userAvatar || user.avatar || user.profilePicture || '');

        const item = {
            id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            userId,
            userName,
            userRole,
            userAvatar,
            activity: act,
            module: clean(options.module || 'System'),
            details: clean(options.details || ''),
            timestamp: options.timestamp || new Date().toISOString()
        };

        const records = readLocal();
        records.unshift(item);
        write(records);
        window.dispatchEvent(new CustomEvent('sigma-activity-logs-updated', { detail: item }));
        render();
        return item;
    }

    // Global outside click and escape handlers
    document.addEventListener('pointerdown', (e) => {
        const openMenu = document.querySelector('#audit-activity-view .ai-log-message-menu:not([hidden]), #audit-activity-view .notification-log-action-menu:not([hidden])');
        if (!openMenu) return;
        const toggle = openMenu.previousElementSibling;
        if (!openMenu.contains(e.target) && !toggle?.contains(e.target)) {
            openMenu.hidden = true;
            toggle?.setAttribute('aria-expanded', 'false');
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('#audit-activity-view .ai-log-message-menu:not([hidden]), #audit-activity-view .notification-log-action-menu:not([hidden])').forEach(menu => {
                menu.hidden = true;
                const toggle = menu.previousElementSibling;
                toggle?.setAttribute('aria-expanded', 'false');
                toggle?.focus();
            });
        }
    });

    window.SigmaActivityLogs = {
        record: recordActivityLog,
        getLogs: read,
        refresh,
        deleteLog: deleteActivityLog,
        render
    };
    window.recordActivityLog = recordActivityLog;
    window.renderActivityLogs = render;
    window.filterActivityAuditLogs = () => {
        render();
        const table = document.querySelector('#audit-activity-view table[aria-label="Activity logs"]');
        if (table && window.SigmaLogPagination?.reset) {
            window.SigmaLogPagination.reset(table);
        }
    };

    window.addEventListener('storage', event => {
        if (!event.key || event.key === KEY) render();
    });
    window.addEventListener('sigma-activity-logs-updated', render);
    window.addEventListener('sigma:database-session-ready', refresh);
    window.addEventListener('focus', refresh);
    setInterval(() => {
        const section = document.getElementById('audit-activity-view');
        if (document.visibilityState === 'visible' && section && !section.classList.contains('hidden')) refresh();
    }, 30000);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => { render(); refresh(); });
    } else {
        render(); refresh();
    }
})();
