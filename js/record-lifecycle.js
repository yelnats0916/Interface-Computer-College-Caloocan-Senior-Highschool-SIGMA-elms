(function () {
    'use strict';
    const localFiles = () => JSON.parse(localStorage.getItem('sigma-deleted-submission-files') || '[]');
    const restoreLocalFile = record => {
        // Validate every saved location before restoring; never overwrite newer student work.
        const writes = new Map();
        for (const edit of record.edits) {
            const storage = edit.store === 'session' ? sessionStorage : localStorage;
            const token = edit.store + ':' + edit.storageKey;
            if (!writes.has(token)) writes.set(token,{storage,key:edit.storageKey,root:JSON.parse(storage.getItem(edit.storageKey) || 'null')});
            const change = writes.get(token);
            let row = change.root;
            for (const part of edit.path) row = row?.[part];
            if (JSON.stringify(row) !== JSON.stringify(edit.after)) throw new Error('This submission has changed since deletion. Restore was stopped to protect newer work.');
            if (!edit.path.length) change.root = edit.before;
            else {
                let parent = change.root;
                edit.path.slice(0,-1).forEach(part => { parent = parent[part]; });
                parent[edit.path[edit.path.length-1]] = edit.before;
            }
        }
        writes.forEach(change => change.storage.setItem(change.key,JSON.stringify(change.root)));
        window.invalidateSharedAssessmentSubmissionsStorage?.();
        window.dispatchEvent(new Event('sigma:submission-files-updated'));
    };
    const names = { users: 'Accounts', school_years: 'School Years', sections: 'Sections', subjects: 'Subjects', quizzes: 'Quizzes', announcements: 'Announcements', audit_logs: 'Audit Records', ai_logs: 'AI Logs', ai_insight_cards: 'AI Cards' };
    function sampleRecords(table) {
        const labels = {
            users: ['Alex Reyes - Student', 'Sam Cruz - Teacher'],
            school_years: ['School Year 2025-2026', 'School Year 2024-2025'],
            sections: ['Grade 11 - Sample Section A', 'Grade 12 - Sample Section B'],
            subjects: ['Computer Programming 1', 'General Mathematics'],
            quizzes: ['Quiz 1 - Basic Syntax', 'Quiz 2 - Variables'],
            ai_logs: ['Analytics Insights - Complete Pending Tasks', 'Sigma Bot - Programming Question'],
            ai_insight_cards: ['Complete Pending Tasks', 'Review Your Quiz Results']
        }[table] || ['Recorded Activity', 'Recorded Update'];
        return labels.map((label, index) => ({ id: 'sample-' + table + '-' + index, label: label + ' (sample)',
            deletedByName: 'Sample Administrator', deletedByUser: { name: 'Sample Administrator', role: index ? 'Admin' : 'Master Admin' },
            deletedAt: index ? '2026-10-11 00:05:00' : '2026-10-11 00:15:00', sample: true }));
    }
    function removerIdentity(record) {
        const user = record.deletedByUser || {};
        const identity = document.createElement('div'); identity.className = 'removed-records-identity';
        const avatar = document.createElement('span'); avatar.className = 'removed-records-avatar'; avatar.setAttribute('aria-hidden', 'true');
        const fallback = () => { avatar.innerHTML = '<i class="fa-solid fa-user"></i>'; };
        fallback();
        const imageUrl = window.resolveUserAvatar?.(user) || user.avatar;
        if (typeof imageUrl === 'string' && /^(https?:|data:image\/|blob:|\.?\.?\/|image\/|uploads\/)/i.test(imageUrl)) {
            const image = document.createElement('img'); image.src = imageUrl; image.alt = ''; image.addEventListener('error', fallback, { once: true }); avatar.replaceChildren(image);
        }
        const text = document.createElement('div'); text.className = 'removed-records-identity-text';
        const name = document.createElement('p'); name.className = 'removed-records-user-name'; name.textContent = user.name || record.deletedByName || record.deletedBy || 'Not recorded';
        const role = document.createElement('p'); role.className = 'removed-records-user-role text-black-fade'; role.textContent = user.role || 'Role not recorded';
        text.append(name, role); identity.append(avatar, text); return identity;
    }
    function install() {
        const source = document.querySelector('#audit-ai-view .audit-log-sidebar nav');
        if (source && !document.getElementById('settings-recovery-view')) {
            const page = document.createElement('section');
            page.id = 'settings-recovery-view'; page.className = 'dynamic-section hidden';
            page.innerHTML = '<div class="record-recovery-layout"><div class="removed-records-content"><div class="record-recovery-toolbar"><label>Record Type<select></select></label><form class="record-recovery-search ai-log-search" role="search"><div class="ai-log-search-input-wrap"><input type="search" class="sigma-input sigma-search-input" maxlength="100" autocomplete="off" placeholder="Search records" aria-label="Search recovery records"><button type="button" class="ai-log-search-clear" title="Clear search" aria-label="Clear search" hidden><i class="fa-solid fa-xmark" aria-hidden="true"></i></button></div><button type="submit" class="sigma-btn sigma-btn-primary" aria-label="Search records">Search</button></form></div><p role="status"></p><div class="sigma-table-container overflow-x-auto"><table class="sigma-table sigma-audit-table"><thead><tr><th>Record</th><th>Removed By</th><th>Removed At</th><th>Actions</th></tr></thead><tbody></tbody></table></div></div></div>';
            const select = page.querySelector('select');
            select.className = 'sigma-select';
            select.setAttribute('aria-label', 'Filter recovery records by type');
            const selectWrapper = document.createElement('div'); selectWrapper.className = 'sigma-select-wrapper';
            select.before(selectWrapper);
            selectWrapper.append(select);
            const chevron = document.createElement('i'); chevron.className = 'fa-solid fa-chevron-down sigma-select-icon'; chevron.setAttribute('aria-hidden', 'true');
            selectWrapper.append(chevron);
            document.getElementById('audit-ai-view').after(page);
            const preview = document.createElement('label'); preview.className = 'removed-records-preview';
            preview.innerHTML = '<input type="checkbox" checked data-removed-preview><span>Sample Records</span>';
            page.querySelector('.record-recovery-toolbar').after(preview);
        }
    }
    async function open() {
        const page = document.getElementById('settings-recovery-view');
        if (!page) return;
        const select = page.querySelector('select'), notice = page.querySelector('[role=status]'), body = page.querySelector('tbody');
        const preview = page.querySelector('[data-removed-preview]');
        const search = page.querySelector('.record-recovery-search');
        const input = search.querySelector('input'), clear = search.querySelector('.ai-log-search-clear');
        const cleanSearch = () => {
            input.value = input.value.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 100);
            clear.hidden = !input.value;
        };
        const applySearch = () => { cleanSearch(); window.SigmaLogPagination?.filter(page.querySelector('table'), input.value.trim()); };
        input.oninput = cleanSearch;
        input.onsearch = () => { if (!input.value) applySearch(); };
        clear.onclick = () => { input.value = ''; cleanSearch(); input.focus({ preventScroll: true }); };
        search.onsubmit = event => { event.preventDefault(); applySearch(); };
        async function load() {
            notice.hidden = false; notice.textContent = 'Loading...'; select.disabled = true;
            try {
                let result;
                try { result = select.value === 'submission_files' ? {tables:[],records:[]} : await window.SigmaAiDatabase.request('record_lifecycle', { table: select.value }, true); }
                catch (error) { if (!localFiles().length) throw error; result = {tables:[],records:[]}; }
                if (!result.tables.includes('submission_files')) result.tables.push('submission_files');
                body.replaceChildren();
                if (!select.options.length) {
                    select.add(new Option('All', 'all'));
                    result.tables.forEach(table => select.add(new Option(table === 'submission_files' ? 'Submission Files' : names[table] || table, table)));
                    select.value = 'all'; select.disabled = false; return load();
                }
                const sampleTypes = select.value === 'all' ? Array.from(select.options).map(option => option.value).filter(value => value !== 'all') : [select.value];
                let samples = [];
                if (preview.checked && sampleTypes.length) {
                    if (select.value === 'all') {
                        samples = Array.from({ length: 25 }, (_, index) => {
                            const type = sampleTypes[index % sampleTypes.length];
                            const sample = sampleRecords(type)[Math.floor(index / sampleTypes.length) % 2];
                            return { ...sample, id: sample.id + '-' + index,
                                label: sample.label.replace(' (sample)', ' #' + (index + 1) + ' (sample)'), recordType: type };
                        });
                    } else if (!result.records.length) samples = sampleRecords(select.value).map(record => ({ ...record, recordType: select.value }));
                }
                const records = [...result.records, ...samples, ...(['all','submission_files'].includes(select.value) ? localFiles() : [])];
                const renderRow = record => {
                    const row = document.createElement('tr');
                    if (record.sample) row.dataset.sampleRecord = 'true';
                    const date = record.deletedAt ? new Date(record.deletedAt.includes('T') ? record.deletedAt : record.deletedAt.replace(' ', 'T') + 'Z').toLocaleString('en-US', { timeZone: 'Asia/Manila' }) : 'Not recorded';
                    [record.label, record.deletedByName || record.deletedBy || 'Not recorded', date].forEach((text, index) => {
                        const cell = document.createElement('td'); cell.dataset.label = ['Record', 'Removed By', 'Removed At'][index];
                        if (index === 1) cell.append(removerIdentity(record)); else cell.textContent = text;
                        if (index === 0 && select.value === 'all') {
                            const type = document.createElement('p'); type.className = 'removed-records-type text-black-fade'; type.textContent = names[record.recordType] || record.recordType;
                            cell.append(type);
                        }
                        row.append(cell);
                    });
                    const actions = document.createElement('td');
                    actions.dataset.label = 'Actions';
                    const trigger = document.createElement('button'); trigger.type = 'button'; trigger.className = 'removed-records-more';
                    trigger.title = 'Record actions'; trigger.setAttribute('aria-label', 'Record actions: ' + record.label); trigger.setAttribute('aria-expanded', 'false');
                    trigger.innerHTML = '<i class="fa-solid fa-ellipsis" aria-hidden="true"></i>';
                    const menu = document.createElement('div'); menu.className = 'removed-records-menu'; menu.setAttribute('popover', 'auto');
                    menu.setAttribute('role', 'group'); menu.setAttribute('aria-label', 'Record actions');
                    trigger.onclick = () => {
                        if (menu.matches(':popover-open')) { menu.hidePopover(); return; }
                        menu.showPopover();
                        const rect = trigger.getBoundingClientRect(), height = menu.getBoundingClientRect().height, width = menu.getBoundingClientRect().width;
                        menu.style.left = Math.max(16, Math.min(rect.right - width, innerWidth - width - 16)) + 'px';
                        menu.style.top = Math.max(8, rect.bottom + height + 6 > innerHeight ? rect.top - height - 6 : rect.bottom + 6) + 'px';
                    };
                    menu.addEventListener('toggle', event => trigger.setAttribute('aria-expanded', String(event.newState === 'open')));
                    for (const [action, icon, label] of [['restore', 'fa-rotate-left', 'Restore'], ['purge', 'fa-trash-can', 'Permanently Delete']]) {
                        const control = document.createElement('button'); control.type = 'button'; control.title = label; control.setAttribute('aria-label', label + ' ' + record.label);
                        const symbol = document.createElement('i'); symbol.className = 'fa-solid ' + icon;
                        const text = document.createElement('span'); text.textContent = label; control.append(symbol, text);
                        if (record.sample) { control.disabled = true; control.title = label + ' (sample only)'; }
                        control.onclick = async () => {
                            if (record.sample) return;
                            menu.hidePopover(); trigger.focus();
                            const confirmation = action === 'purge' ? window.prompt('This cannot be undone. Type DELETE ' + record.id + ' to permanently delete this record.') : '';
                            if (action === 'purge' && confirmation !== 'DELETE ' + record.id) return;
                            if (action === 'restore' && !window.confirm('Restore ' + record.label + '?')) return;
                            actions.querySelectorAll('button').forEach(button => { button.disabled = true; });
                            try {
                                if (record.recordType === 'submission_files' && record.edits) {
                                    if (action === 'restore') restoreLocalFile(record);
                                    localStorage.setItem('sigma-deleted-submission-files',JSON.stringify(localFiles().filter(item => item.id !== record.id)));
                                } else await window.SigmaAiDatabase.change(record.recordType || select.value, record.id, action, confirmation);
                                await load();
                            } catch (error) { notice.hidden = false; notice.textContent = error.message; actions.querySelectorAll('button').forEach(button => { button.disabled = false; }); }
                        };
                        menu.append(control);
                    }
                    actions.append(trigger, menu);
                    row.append(actions); return row;
                };
                if (!records.length) {
                    const row = document.createElement('tr'); row.dataset.removedEmpty = 'true';
                    const cell = document.createElement('td'); cell.colSpan = 4; cell.className = 'removed-records-empty-cell';
                    const options = { icon: 'fa-solid fa-box-archive', title: 'No removed records', subtitle: 'No deleted records for this type.' };
                    cell.innerHTML = window.renderSigmaEmptyState ? window.renderSigmaEmptyState(options)
                        : '<div class="sigma-empty-state"><i class="fa-solid fa-box-archive sigma-empty-icon" aria-hidden="true"></i><p class="sigma-empty-title">No removed records</p><p class="sigma-empty-subtitle">No deleted records for this type.</p></div>';
                    cell.setAttribute('role', 'status'); row.append(cell); body.append(row);
                }
                if (window.SigmaLogPagination) window.SigmaLogPagination.setRecords(page.querySelector('table'), records, renderRow,
                    { searchText: record => [record.label, names[record.recordType] || record.recordType, record.deletedByName, record.deletedByUser?.name, record.deletedByUser?.role, record.deletedBy, record.deletedAt].join(' ') });
                else records.forEach(record => body.append(renderRow(record)));
                notice.textContent = ''; notice.hidden = true;
            } catch (error) { notice.textContent = error.message; }
            finally { select.disabled = false; }
        }
        const reloadFirstPage = async () => { await load(); window.SigmaLogPagination?.reset(page.querySelector('table')); };
        select.onchange = reloadFirstPage; preview.onchange = reloadFirstPage; await load();
    }
    window.renderRecordRecovery = open;
    window.renderRecordLifecycleEvents = async () => {
        const table = document.querySelector('#audit-activity-view .sigma-audit-table');
        if (!table || !window.SigmaAiDatabase) return;
        let notice = table.parentElement.querySelector('[data-lifecycle-audit-status]');
        if (!notice) {
            notice = document.createElement('p'); notice.dataset.lifecycleAuditStatus = 'true'; notice.setAttribute('role', 'status'); table.after(notice);
        }
        notice.hidden = true;
        try {
            const result = await window.SigmaAiDatabase.request('record_lifecycle', { view: 'events' }, true);
            if (!Array.isArray(result.events) || !result.events.length) return;
            const renderRow = event => {
                const row = document.createElement('tr');
                const identity = document.createElement('td'); identity.append(removerIdentity({ deletedByUser: event.actor }));
                const action = document.createElement('td'); action.textContent = { remove: 'Record Deleted', restore: 'Record Restored', purge: 'Record Permanently Deleted' }[event.action] || event.action;
                const record = document.createElement('p'); record.className = 'text-sm text-black-fade'; record.textContent = event.recordId; action.append(record);
                const module = document.createElement('td'); module.textContent = names[event.recordType] || event.recordType;
                const time = document.createElement('td'); time.textContent = new Date(event.timestamp.replace(' ', 'T') + 'Z').toLocaleString('en-US', { timeZone: 'Asia/Manila' });
                row.append(identity, action, module, time); return row;
            };
            if (window.SigmaLogPagination) {
                window.SigmaLogPagination.setRecords(table, result.events, renderRow);
                window.SigmaLogPagination.filter(table, window.getAuditLogSearchQuery?.() || '');
            } else table.tBodies[0].replaceChildren(...result.events.map(renderRow));
        } catch (error) { notice.textContent = 'Unable to load record activity. Refresh to retry.'; notice.hidden = false; }
    };
    install();
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
    window.addEventListener('load', install);
    const closeMenus = () => document.querySelectorAll('.removed-records-menu:popover-open').forEach(menu => menu.hidePopover());
    window.addEventListener('resize', closeMenus);
    window.addEventListener('scroll', closeMenus, true);
    document.addEventListener('click', event => {
        if (!event.target.closest('#nav-settings-recovery')) return;
        event.preventDefault();
        if (window.switchTab) window.switchTab('nav-settings-recovery');
        else {
            document.querySelectorAll('.dynamic-section, #audit-ai-view').forEach(section => section.classList.add('hidden'));
            document.getElementById('settings-recovery-view')?.classList.remove('hidden');
            open();
        }
    });
})();
