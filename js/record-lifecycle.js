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
    const names = {
        users: 'User Accounts',
        school_years: 'School Years',
        sections: 'Sections',
        subjects: 'Subjects',
        quizzes: 'Quizzes',
        announcements: 'Announcements',
        ai_logs: 'AI Logs',
        ai_insight_cards: 'AI Insights',
        submission_files: 'Submission Files'
    };
    const featureOrder = [
        'users',
        'school_years',
        'sections',
        'subjects',
        'quizzes',
        'announcements',
        'ai_logs',
        'ai_insight_cards',
        'submission_files'
    ];
    
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
            page.innerHTML = '<div class="record-recovery-layout"><div class="removed-records-content"><div class="record-recovery-toolbar"><form class="record-recovery-search ai-log-search" role="search"><div class="ai-log-search-input-wrap"><input type="search" class="sigma-input sigma-search-input" maxlength="60" autocomplete="off" spellcheck="false" placeholder="Search records" aria-label="Search recovery records"><button type="button" class="ai-log-search-clear" title="Clear search" aria-label="Clear search" hidden><i class="fa-solid fa-xmark" aria-hidden="true"></i></button></div></form><div class="record-recovery-filter"><div class="sigma-select-wrapper"><select class="sigma-select" aria-label="Filter recovery records by feature"></select><i class="fa-solid fa-chevron-down sigma-select-icon" aria-hidden="true"></i></div></div><button type="button" class="sigma-btn sigma-btn-primary record-recovery-search-btn" aria-label="Search records">Search</button></div><p role="status"></p><div class="sigma-table-container overflow-x-auto"><table class="sigma-table sigma-audit-table"><thead><tr><th>Record</th><th>Removed By</th><th>Removed At</th><th>Actions</th></tr></thead><tbody></tbody></table></div></div></div>';
            document.getElementById('audit-ai-view').after(page);
        }
    }
    async function open() {
        const page = document.getElementById('settings-recovery-view');
        if (!page) return;
        const select = page.querySelector('select'), notice = page.querySelector('[role=status]'), body = page.querySelector('tbody');
        const search = page.querySelector('.record-recovery-search');
        const input = search.querySelector('input'), clear = search.querySelector('.ai-log-search-clear');
        
        const sanitizeSearch = value => {
            if (typeof value !== 'string') return '';
            return value
                .replace(/[\u0000-\u001f\u007f]/g, '')
                .replace(/<[^>]*>/g, '')
                .replace(/[^a-zA-Z0-9\s\-_.:#@/()]/g, '')
                .replace(/^\s+/, '')
                .slice(0, 60);
        };
        const cleanSearch = () => {
            const cleaned = sanitizeSearch(input.value);
            if (input.value !== cleaned) input.value = cleaned;
            clear.hidden = !input.value;
        };
        const applySearch = () => {
            cleanSearch();
            window.SigmaLogPagination?.filter(page.querySelector('table'), input.value.trim());
        };
        
        if (!search.dataset.initialized) {
            search.dataset.initialized = 'true';
            input.addEventListener('beforeinput', event => {
                if (event.data && /[^a-zA-Z0-9\s\-_.:#@/()]/.test(event.data)) {
                    event.preventDefault();
                }
            });
            input.addEventListener('input', () => {
                cleanSearch();
                applySearch();
            });
            input.addEventListener('paste', () => {
                setTimeout(() => {
                    cleanSearch();
                    applySearch();
                }, 0);
            });
            input.addEventListener('keydown', event => {
                if (event.key === 'Escape') {
                    input.value = '';
                    clear.hidden = true;
                    applySearch();
                    input.blur();
                }
            });
            input.onsearch = () => { applySearch(); };
            clear.onclick = () => {
                input.value = '';
                clear.hidden = true;
                applySearch();
                input.focus({ preventScroll: true });
            };
            search.onsubmit = event => {
                event.preventDefault();
                applySearch();
            };
            const searchBtn = page.querySelector('.record-recovery-search-btn');
            if (searchBtn) {
                searchBtn.onclick = () => { applySearch(); };
            }
        }

        async function load() {
            notice.hidden = false; window.SigmaContentLoading.render(notice, {inline:true, label:'Loading removed records'}); select.disabled = true;
            try {
                let result;
                try { result = select.value === 'submission_files' ? {tables:[],records:[]} : await window.SigmaAiDatabase.request('record_lifecycle', { table: select.value }, true); }
                catch (error) { if (!localFiles().length) throw error; result = {tables:[],records:[]}; }
                if (!result.tables.includes('submission_files')) result.tables.push('submission_files');
                body.replaceChildren();
                if (!select.options.length) {
                    select.add(new Option('All', 'all'));
                    featureOrder.forEach(table => {
                        select.add(new Option(names[table], table));
                    });
                    select.value = 'all'; select.disabled = false; return load();
                }
                const records = [...(result.records || []), ...(['all','submission_files'].includes(select.value) ? localFiles() : [])];
                const renderRow = record => {
                    const row = document.createElement('tr');
                    const date = record.deletedAt ? new Date(record.deletedAt.includes('T') ? record.deletedAt : record.deletedAt.replace(' ', 'T') + 'Z').toLocaleString('en-US', { timeZone: 'Asia/Manila' }) : 'Not recorded';
                    [record.label, record.deletedByName || record.deletedBy || 'Not recorded', date].forEach((text, index) => {
                        const cell = document.createElement('td'); cell.dataset.label = ['Record', 'Removed By', 'Removed At'][index];
                        if (index === 1) cell.append(removerIdentity(record)); else cell.textContent = window.SigmaAuditDisplay.text(text, index === 0 ? 'Record label not captured' : 'Not recorded');
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
                    trigger.onclick = (e) => {
                        e.stopPropagation();
                        if (menu.matches(':popover-open')) { menu.hidePopover(); return; }
                        window.closeAllTableActionDropdowns?.(menu);
                        menu.showPopover();
                        const rect = trigger.getBoundingClientRect(), height = menu.getBoundingClientRect().height || 96, width = menu.getBoundingClientRect().width || 195;
                        menu.style.left = Math.max(12, Math.min(rect.right - width, innerWidth - width - 12)) + 'px';
                        menu.style.top = Math.max(12, rect.bottom + height + 8 > innerHeight && rect.top > innerHeight - rect.bottom ? rect.top - height - 6 : rect.bottom + 6) + 'px';
                    };
                    menu.addEventListener('toggle', event => {
                        const isOpen = event.newState === 'open';
                        trigger.classList.toggle('active', isOpen);
                        trigger.setAttribute('aria-expanded', String(isOpen));
                    });
                    for (const [action, icon, label] of [['restore', 'fa-rotate-left', 'Restore'], ['purge', 'fa-trash-can', 'Permanently Delete']]) {
                        const control = document.createElement('button'); control.type = 'button'; control.title = label; control.setAttribute('aria-label', label + ' ' + record.label);
                        const symbol = document.createElement('i'); symbol.className = 'fa-solid ' + icon;
                        const text = document.createElement('span'); text.textContent = label; control.append(symbol, text);
                        
                        control.onclick = () => {
                            menu.hidePopover(); trigger.focus();
                            const executeAction = async (confirmation = '') => {
                                actions.querySelectorAll('button').forEach(button => { button.disabled = true; });
                                try {
                                    if (record.recordType === 'submission_files' && record.edits) {
                                        if (action === 'restore') restoreLocalFile(record);
                                        localStorage.setItem('sigma-deleted-submission-files', JSON.stringify(localFiles().filter(item => item.id !== record.id)));
                                    } else {
                                        await window.SigmaAiDatabase.change(record.recordType || select.value, record.id, action, confirmation);
                                    }

                                    // If restored, sync back to active components across the system
                                    if (action === 'restore') {
                                        const rType = record.recordType || select.value;
                                        try {
                                            if (rType === 'users') {
                                                if (typeof window.fetchUsersFromDB === 'function') await window.fetchUsersFromDB();
                                                if (typeof window.renderUserAccountsTable === 'function') window.renderUserAccountsTable();
                                                if (typeof window.updateUserMetricCards === 'function') window.updateUserMetricCards();
                                                window.dispatchEvent(new Event('sigma:users-updated'));
                                            } else if (rType === 'sections') {
                                                if (typeof window.fetchSectionsFromDB === 'function') await window.fetchSectionsFromDB();
                                                if (typeof window.renderSectionsTable === 'function') window.renderSectionsTable();
                                                if (typeof window.updateSectionMetricCards === 'function') window.updateSectionMetricCards();
                                                window.dispatchEvent(new Event('sigma:sections-updated'));
                                            } else if (rType === 'subjects') {
                                                if (typeof window.fetchSubjectsFromDB === 'function') await window.fetchSubjectsFromDB();
                                                if (typeof window.renderSubjectsTable === 'function') window.renderSubjectsTable();
                                                if (typeof window.updateSubjectMetricCards === 'function') window.updateSubjectMetricCards();
                                                window.dispatchEvent(new Event('sigma:subjects-updated'));
                                            } else if (rType === 'school_years') {
                                                if (typeof window.fetchSchoolYearsFromDB === 'function') await window.fetchSchoolYearsFromDB();
                                                if (Array.isArray(window.schoolYearRecords)) {
                                                    const r = window.schoolYearRecords.find(x => String(x.id) === String(record.id));
                                                    if (r) { r.isDeleted = false; r.deletedAt = null; }
                                                }
                                                if (typeof window.saveSYToStorage === 'function') window.saveSYToStorage();
                                                if (typeof window.renderSchoolYearTable === 'function') window.renderSchoolYearTable();
                                                if (typeof window.renderSchoolYearSummaryBar === 'function') window.renderSchoolYearSummaryBar();
                                                if (typeof window.updateGlobalSYDisplay === 'function') window.updateGlobalSYDisplay();
                                                if (typeof window.renderSYManagerList === 'function') window.renderSYManagerList();
                                                window.dispatchEvent(new Event('sigma:school-years-updated'));
                                            } else if (rType === 'quizzes') {
                                                if (typeof window.fetchQuizLibraryFromServer === 'function') await window.fetchQuizLibraryFromServer();
                                                if (typeof window.renderQuizLibraryFeed === 'function') window.renderQuizLibraryFeed();
                                                window.dispatchEvent(new Event('sigma:quizzes-updated'));
                                            } else if (rType === 'announcements') {
                                                if (window.SigmaAnnouncements?.refreshAllFeeds) window.SigmaAnnouncements.refreshAllFeeds();
                                                window.dispatchEvent(new Event('sigma:announcements-updated'));
                                            } else if (rType === 'ai_insight_cards' || rType === 'ai_logs') {
                                                window.dispatchEvent(new Event('sigma:refresh-analytics-cards'));
                                                window.dispatchEvent(new Event('sigma:ai-logs-updated'));
                                            }
                                        } catch (syncErr) {
                                            console.warn('Post-restore module refresh warning:', syncErr);
                                        }
                                        window.dispatchEvent(new CustomEvent('sigma:record-restored', { detail: record }));
                                        if (typeof window.showToastNotification === 'function') {
                                            window.showToastNotification(`"${record.label}" has been restored successfully.`, 'success');
                                        }
                                    } else if (action === 'purge') {
                                        if (typeof window.showToastNotification === 'function') {
                                            window.showToastNotification(`"${record.label}" was permanently removed.`, 'success');
                                        }
                                    }

                                    await load();
                                } catch (error) {
                                    notice.hidden = false;
                                    notice.textContent = error.message;
                                    actions.querySelectorAll('button').forEach(button => { button.disabled = false; });
                                }
                            };

                            if (action === 'restore') {
                                if (typeof window.openAskingPanel === 'function') {
                                    window.openAskingPanel({
                                        title: 'Restore Record?',
                                        message: `Are you sure you want to restore "${record.label}"? It will be returned to its original place across the system.`,
                                        type: 'primary',
                                        confirmText: 'Restore Record',
                                        cancelText: 'Cancel',
                                        onConfirm: () => executeAction()
                                    });
                                } else if (window.confirm(`Restore "${record.label}"?`)) {
                                    executeAction();
                                }
                            } else if (action === 'purge') {
                                if (typeof window.openAskingPanel === 'function') {
                                    window.openAskingPanel({
                                        title: 'Permanently Delete Record?',
                                        message: `Are you sure you want to permanently erase "${record.label}"? This action cannot be undone.`,
                                        type: 'danger',
                                        confirmText: 'Permanently Delete',
                                        cancelText: 'Cancel',
                                        onConfirm: () => executeAction('confirm')
                                    });
                                } else if (window.confirm(`This cannot be undone. Permanently delete "${record.label}"?`)) {
                                    executeAction('confirm');
                                }
                            }
                        };
                        menu.append(control);
                    }
                    actions.append(trigger, menu);
                    row.append(actions); return row;
                };
                if (!records.length) {
                    const row = document.createElement('tr'); row.dataset.removedEmpty = 'true';
                    const cell = document.createElement('td'); cell.colSpan = 4; cell.className = 'removed-records-empty-cell';
                    const options = { icon: 'fa-solid fa-box-archive', title: 'No removed records', subtitle: 'No deleted records found. Any items removed across the website will appear here for recovery.' };
                    cell.innerHTML = window.renderSigmaEmptyState ? window.renderSigmaEmptyState(options)
                        : '<div class="sigma-empty-state"><i class="fa-solid fa-box-archive sigma-empty-icon" aria-hidden="true"></i><p class="sigma-empty-title">No removed records</p><p class="sigma-empty-subtitle">No deleted records found. Any items removed across the website will appear here for recovery.</p></div>';
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
        select.onchange = reloadFirstPage; await load();
    }
    window.renderRecordRecovery = open;
    // The activity feed owns the table; lifecycle events are included in its server response.
    window.renderRecordLifecycleEvents = () => window.SigmaActivityLogs?.refresh();

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
