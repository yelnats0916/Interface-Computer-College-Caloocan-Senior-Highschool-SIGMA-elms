(function () {
    'use strict';
    const originalRecovery = window.renderRecordRecovery;
    let active = 'records', installed = false, busy = false, timer = null, job = null, opening = null;
    let lastRestore = null;
    let savedBackups = [], operations = [], tablePage = 1, tablePageSize = 5, searchQuery = '', searchType = '';
    let scheduleSettings = {enabled:true,schedulerReady:false,times:['08:00','20:00']};
    let previousPage = location.hash !== '#nav-settings-recovery' ? location.href : '';
    const user = () => { try { return window.getLoggedInAdminUser?.() || JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}'); } catch (_) { return {}; } };
    const master = () => String(user().role || user().type || '').replace(/[\s_-]+/g, '').toLowerCase() === 'masteradmin';
    const page = () => document.getElementById('settings-recovery-view');
    const find = selector => page()?.querySelector(selector);
    const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
    const date = value => value ? new Date(value).toLocaleString('en-US', {timeZone:'Asia/Manila', month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit'}) : 'No backup yet';
    const size = value => value < 1048576 ? (value / 1024).toFixed(1) + ' KB' : (value / 1048576).toFixed(1) + ' MB';
    const routePanel = () => new URL(location.href).searchParams.get('recoveryPanel') === 'backups' ? 'backups' : 'records';
    const detailRoute = () => routePanel() === 'backups' && new URL(location.href).searchParams.get('recoveryView') === 'manage';
    function navigate(kind, detail = false) {
        const url = new URL(location.href);
        if (kind === 'backups') url.searchParams.set('recoveryPanel', 'backups');
        else url.searchParams.delete('recoveryPanel');
        if (kind === 'backups' && detail) url.searchParams.set('recoveryView', 'manage');
        else url.searchParams.delete('recoveryView');
        url.hash = 'nav-settings-recovery';
        if (url.href !== location.href) history.pushState({...history.state, recoveryPanel:kind}, '', url);
        return window.renderRecordRecovery();
    }
    function notice(message, error = false) {
        const node = find('.backup-feedback'); if (!node) return;
        node.textContent = message; node.classList.toggle('backup-feedback-error', error); node.hidden = !message;
    }
    function leaveCanceledVerification() {
        clearTimeout(timer); notice('');
        let url = new URL(previousPage || 'admin.html#nav-dashboard', location.href);
        if (url.origin !== location.origin || url.hash === '#nav-settings-recovery') url = new URL('admin.html#nav-dashboard', location.href);
        url.searchParams.delete('recoveryPanel'); url.searchParams.delete('recoveryView');
        const nav = url.hash.replace(/^#/, '') || 'nav-dashboard';
        history.replaceState({...history.state, recoveryPanel:null}, '', url);
        window.switchTab?.(nav, true);
    }
    async function request(data, query) {
        return window.SigmaDatabase.request('database_backups', data ? {data} : {query:query || {},signal:AbortSignal.timeout(30000)});
    }
    function scheduleIndicator(message, type = 'success') {
        window.SigmaFeedback?.notify(message,type,{id:'backup-automatic-setting',placement:'bottom-left',compact:true,persistent:type==='progress'});
    }
    function scheduleTime(time) {
        const [hour,minute] = time.split(':').map(Number);
        return `${hour%12||12}:${String(minute).padStart(2,'0')} ${hour<12?'AM':'PM'}`;
    }
    function applyScheduleSettings(settings) {
        scheduleSettings = {...scheduleSettings,...settings};
        const {enabled,schedulerReady,times} = scheduleSettings;
        const control = find('[data-backup-schedule]');
        control.hidden = false;find('[data-backup-settings-loading]').hidden = true;
        control.setAttribute('aria-checked',String(enabled));control.dataset.schedulerUnavailable = String(!schedulerReady);
        control.setAttribute('aria-describedby','backup-schedule-description');
        const timing = `${scheduleTime(times[0])} and ${scheduleTime(times[1])}, Manila time`;
        find('[data-backup-schedule-description]').textContent = enabled
            ? schedulerReady ? `Automatic backups are on. Backups run daily at ${timing}.` : 'Automatic backups are switched on, but scheduled runs are waiting for hosting setup.'
            : 'Automatic backups are off. No scheduled runs will start.';
        find('[data-backup-schedule-note]').textContent = enabled
            ? `${schedulerReady ? '' : `After hosting setup, backups will run daily at ${timing}. `}The latest 14 automatic backups are kept. Older automatic copies are removed. Manual backups remain available.`
            : 'You can still create a manual backup in Manage Backups. Existing backups are kept, and any backup already running will finish.';
        find('.backup-schedule-warning').hidden = schedulerReady;
        find('#backup-time-first').value = times[0];find('#backup-time-second').value = times[1];
        find('[data-backup-next-run]').textContent = !enabled ? 'Automatic backups are off.' : !schedulerReady ? 'Automatic backups are waiting for hosting setup.' : scheduleSettings.nextScheduledAt ? `Next scheduled backup: ${date(scheduleSettings.nextScheduledAt)}, Manila time.` : `Scheduled daily at ${timing}.`;
    }
    function select(kind) {
        closeScheduleModal(false);
        active = kind;
        find('[data-recovery-records]').hidden = kind !== 'records';
        find('[data-recovery-backups]').hidden = kind !== 'backups';
        const detail = kind === 'backups' && detailRoute();
        find('.recovery-hub').classList.toggle('recovery-hub--detail', detail);
        find('[data-backup-overview]').hidden = detail;
        find('[data-backup-detail]').hidden = !detail;
        page().querySelectorAll('[data-recovery-tab]').forEach(button => {
            const selected = button.dataset.recoveryTab === kind;
            button.classList.toggle('active', selected); button.setAttribute('aria-current', selected ? 'page' : 'false');
        });
        window.setPortalHeader?.('System Settings', detail ? 'Manage Backups' : 'Backup & Recovery');
        clearTimeout(timer);
    }
    function install() {
        if (installed || !page() || !originalRecovery) return;
        const existing = page().querySelector('.record-recovery-layout'); if (!existing) return;
        // Keep the original recovery DOM, handlers and implementation intact.
        const shell = document.createElement('div'); shell.className = 'recovery-hub';
        const sidebar = document.createElement('aside'); sidebar.className = 'recovery-hub-sidebar';
        sidebar.innerHTML = '<nav aria-label="Recovery and backup sections"><button type="button" data-recovery-tab="records"><i class="fa-solid fa-box-archive" aria-hidden="true"></i><span>Record Recovery</span></button><button type="button" data-recovery-tab="backups"><i class="fa-solid fa-database" aria-hidden="true"></i><span>Database Backups</span></button></nav>';
        const main = document.createElement('div'); main.className = 'recovery-hub-main';
        const records = document.createElement('div'); records.dataset.recoveryRecords = ''; records.className = 'recovery-hub-records';
        records.append(existing); main.append(records);
        const backups = document.createElement('div'); backups.dataset.recoveryBackups = ''; backups.hidden = true;
        backups.innerHTML = `
            <div data-backup-overview><section class="backup-card">
            <div class="backup-setting-row"><div><h3>Automatic Backups</h3><p id="backup-schedule-description" data-backup-schedule-description>Loading automatic backup settings…</p><p data-backup-schedule-note></p></div><span data-backup-settings-loading role="status" aria-label="Loading automatic backup settings"><span class="sigma-dot-spinner" aria-hidden="true"></span> Loading…</span><button type="button" class="backup-switch" role="switch" hidden disabled aria-checked="true" data-backup-schedule aria-label="Automatic database backups"><span aria-hidden="true"></span></button></div>

            <div class="backup-scope"><i class="fa-solid fa-circle-info" aria-hidden="true"></i><p>New backups include the database and uploaded files from server storage and the configured Google Drive folder.</p></div>
            <div class="backup-card-actions"><button type="button" class="backup-button" data-backup-manage disabled>Manage Backups <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></button></div></section></div>
            <div data-backup-detail hidden>
            <section class="backup-card" aria-label="Saved database backups">
            <div class="backup-toolbar"><div class="backup-primary-actions"><button type="button" class="backup-button" data-backup-create><i class="fa-solid fa-plus" aria-hidden="true"></i> Create Backup</button><button type="button" class="backup-button backup-button-secondary" data-backup-configure-schedule aria-haspopup="dialog" aria-expanded="false" aria-controls="backup-schedule-panel"><i class="fa-solid fa-clock" aria-hidden="true"></i> Schedule</button></div><form class="backup-search-form" role="search" aria-label="Search backups"><input type="search" name="sigma-backup-search" autocomplete="off" placeholder="Search backups" aria-label="Search backups"><div class="sigma-select-wrapper sigma-standard-select-wrap"><select class="sigma-select" aria-label="Backup type"><option value="">All Types</option><option value="manual">Manual</option><option value="scheduled">Automatic</option><option value="before_restore">Safety backup</option></select><i class="fa-solid fa-chevron-down sigma-select-icon" aria-hidden="true"></i></div><button type="submit" class="backup-button">Search</button></form></div>
            <dialog id="backup-schedule-panel" class="backup-schedule-modal" aria-labelledby="backup-schedule-title" aria-describedby="backup-schedule-help" hidden><div class="backup-schedule-modal-heading"><h2 id="backup-schedule-title">Backup Schedule</h2><button type="button" data-backup-close-schedule aria-label="Close backup schedule">&times;</button></div><p id="backup-schedule-help">Backups run twice daily using Manila time. The latest 14 automatic backups are kept.</p>
            <form class="backup-schedule-form"><div class="backup-schedule-fields"><div><label for="backup-time-first">First daily backup</label><input id="backup-time-first" name="first" type="time" value="08:00" required></div><div><label for="backup-time-second">Second daily backup</label><input id="backup-time-second" name="second" type="time" value="20:00" required></div></div><p class="backup-schedule-feedback" role="status" hidden></p><div class="backup-schedule-modal-actions"><button type="button" class="backup-button backup-button-secondary" data-backup-cancel-schedule>Cancel</button><button type="submit" class="backup-button" data-backup-save-schedule>Save Schedule</button></div></form>
            <p class="backup-schedule-warning" id="backup-schedule-warning" hidden>Set up a scheduled task in your hosting control panel to enable automatic backups.</p>
            </dialog>
            <p class="backup-next-run" data-backup-next-run role="status">Loading backup schedule...</p>
            <div class="backup-pagination"><span data-backup-page-summary role="status"></span><div><button type="button" class="backup-button backup-button-secondary" data-backup-previous>Previous</button><button type="button" class="backup-button backup-button-secondary" data-backup-next>Next</button></div></div>
            <div class="backup-table-wrap"><table class="backup-history-table" aria-label="Saved database backups"><thead><tr><th>Created</th><th>Type</th><th>Contents</th><th>Size</th><th>Status</th><th>Actions</th></tr></thead><tbody></tbody></table></div>

            <div class="backup-create-footer"><div class="backup-scope"><i class="fa-solid fa-circle-info" aria-hidden="true"></i><p>Restore Database replaces database records only. Download Uploaded Files to recover documents and images, then put them back into server storage or Google Drive.</p></div></div></section></div>
            <button type="button" class="backup-button backup-button-secondary" data-backup-retry hidden>Retry loading backups</button><p class="backup-feedback" aria-live="polite" hidden></p><button type="button" class="backup-button" data-backup-login hidden>Return to Login</button>`;
        main.append(backups); shell.append(sidebar, main); page().append(shell);
        sidebar.querySelector('[data-recovery-tab="backups"]').hidden = !master();
        sidebar.querySelector('[data-recovery-tab="records"]').onclick = () => navigate('records');
        sidebar.querySelector('[data-recovery-tab="backups"]').onclick = () => navigate('backups');
        find('[data-backup-create]').onclick = () => run('create');
        find('[data-backup-retry]').onclick = () => openBackups();
        find('[data-backup-manage]').onclick = event => { if (!event.currentTarget.disabled) navigate('backups', true); };
        find('[data-backup-configure-schedule]').onclick = event => {
            const panel = find('#backup-schedule-panel');
            find('#backup-time-first').value = scheduleSettings.times[0];find('#backup-time-second').value = scheduleSettings.times[1];
            find('.backup-schedule-feedback').hidden = true;
            panel.hidden = false;panel.showModal();
            event.currentTarget.setAttribute('aria-expanded','true');
        };
        find('[data-backup-close-schedule]').onclick = () => closeScheduleModal();
        find('[data-backup-cancel-schedule]').onclick = () => closeScheduleModal();
        find('#backup-schedule-panel').addEventListener('cancel',event=>{event.preventDefault();closeScheduleModal();});
        find('.backup-search-form').onsubmit = event => { event.preventDefault(); searchQuery = find('.backup-search-form input').value.trim().toLowerCase(); searchType = find('.backup-search-form select').value; tablePage = 1; paint(); };
        find('.backup-search-form input').addEventListener('input', event => { if (!event.target.value) {searchQuery = ''; tablePage = 1; paint();} });
        find('[data-backup-previous]').onclick = () => { tablePage--; paint(); };
        find('[data-backup-next]').onclick = () => { tablePage++; paint(); };
        find('.backup-schedule-form').onsubmit = async event => {
            event.preventDefault(); const button = find('[data-backup-save-schedule]'), feedback = find('.backup-schedule-feedback'); button.disabled = true;
            try {
                const times = [find('#backup-time-first').value,find('#backup-time-second').value];
                const result = await request({action:'schedule',enabled:scheduleSettings.enabled,times});
                applyScheduleSettings({...scheduleSettings,times,...result.settings});
                feedback.textContent = scheduleSettings.enabled ? scheduleSettings.schedulerReady ? 'Schedule saved. Automatic backups are on.' : 'Schedule saved. Waiting for hosting setup before automatic runs can start.' : 'Schedule saved. Turn on Automatic Backups to use it.';
                feedback.classList.remove('backup-text-error');
            }
            catch (error) {feedback.textContent = error.message; feedback.classList.add('backup-text-error');}
            finally {feedback.hidden = false; button.disabled = false;}
        };
        find('[data-backup-schedule]').onclick = event => {
            const control = event.currentTarget;
            const enabled = control.getAttribute('aria-checked') !== 'true';
            if (typeof window.openAskingPanel !== 'function') {scheduleIndicator('The confirmation panel could not load. Reload the page and try again.','error');return;}
            window.openAskingPanel({
                title:enabled?'Turn On Automatic Backups?':'Turn Off Automatic Backups?',
                message:enabled?'The database and uploaded files will be backed up at your saved daily times. You can still create manual backups.':'Scheduled backups will stop. Existing backups are kept, manual backups remain available, and any backup already running will finish.',
                confirmText:enabled?'Turn On':'Turn Off',cancelText:'Cancel',type:enabled?'primary':'warning',
                onConfirm:async()=>{
                    control.disabled = true;scheduleIndicator('Updating automatic backups…','progress');
                    try {
                        const result = await request({action:'schedule',enabled});applyScheduleSettings({...scheduleSettings,...result.settings,enabled});notice('');
                        scheduleIndicator(enabled ? scheduleSettings.schedulerReady ? 'Automatic backups turned on.' : 'Automatic backups switched on. Waiting for hosting setup.' : 'Automatic backups turned off.',enabled&&!scheduleSettings.schedulerReady?'info':'success');
                    }catch(error){scheduleIndicator(error.message,'error');}
                    finally{control.disabled=false;}
                }
            });
        };
        find('[data-backup-login]').onclick = () => { sessionStorage.clear(); location.href = 'index.html'; };
        installed = true; select('records');
        let visible = !page().classList.contains('hidden');
        new MutationObserver(() => {
            const nowVisible = !page().classList.contains('hidden');
            if (visible && !nowVisible && location.hash !== '#nav-settings-recovery') {
                closeScheduleModal(false);
                clearTimeout(timer);
                window.SigmaServiceVault?.endRecoveryVisit?.();
            }
            visible = nowVisible;
        }).observe(page(), {attributes:true, attributeFilter:['class']});
    }
    function closeScheduleModal(restoreFocus = true) {
        const modal = find('#backup-schedule-panel');if (!modal?.open) return;
        modal.close();modal.hidden = true;
        const opener = find('[data-backup-configure-schedule]');opener?.setAttribute('aria-expanded','false');
        if (restoreFocus) opener?.focus({preventScroll:true});
    }
    function paint() {
        const kinds = {manual:'Manual', scheduled:'Automatic', before_restore:'Safety backup'};
        let records = [...savedBackups, ...operations.map(item => ({...item, operation:true, kind:item.action === 'scheduled' ? 'scheduled' : item.action === 'restore' ? 'before_restore' : 'manual'}))];
        records.sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt)));
        records = records.filter(record => (!searchType || record.kind === searchType) && (!searchQuery || [record.createdAt,date(record.createdAt),kinds[record.kind],record.operation ? record.status === 'failed' ? 'Failed' : 'In Progress' : 'Verified'].join(' ').toLowerCase().includes(searchQuery)));
        const total = records.length, pages = Math.max(1, Math.ceil(total / tablePageSize)); tablePage = Math.min(pages,Math.max(1,tablePage));
        const summary = find('[data-backup-page-summary]');
        summary.textContent = total ? `${(tablePage-1)*tablePageSize+1}-${Math.min(tablePage*tablePageSize,total)} of ${total}` : '0 backups';
        if (!summary.parentElement.classList.contains('sigma-pagination-settings')) {
            const settings = document.createElement('div'); settings.className = 'sigma-pagination-settings';
            summary.before(settings);
            settings.append(window.SigmaTablePagination.pageSizeControl(tablePageSize, value => { tablePageSize = value; tablePage = 1; paint(); }), summary);
        }
        find('[data-backup-previous]').disabled = tablePage === 1; find('[data-backup-next]').disabled = tablePage === pages;
        records = records.slice((tablePage-1)*tablePageSize,tablePage*tablePageSize);
        const body = find('.backup-history-table tbody'); body.replaceChildren();
        if (!records.length) { body.innerHTML = `<tr><td colspan="6" class="backup-empty"><strong>${searchQuery || searchType ? 'No matching backups' : 'No database backups yet'}</strong><span>${searchQuery || searchType ? 'Try another search or backup type.' : 'Select Create Backup to save your first encrypted copy.'}</span></td></tr>`; return; }
        records.forEach(record => {
            const row = document.createElement('tr');
            const kind = {manual:'Manual', scheduled:'Automatic', before_restore:'Safety backup'}[record.kind] || 'Backup';
            if (record.operation) {
                const failed = record.status === 'failed';
                row.innerHTML = `<td>${escape(date(record.createdAt))}</td><td>${escape(kind)}</td><td>${record.action === 'restore' ? 'Restore operation' : 'Backup operation'}</td><td>—</td><td><span class="${failed ? 'backup-text-error' : 'backup-progress'}">${failed ? 'Failed' : 'In Progress'}</span></td><td>${failed ? 'Could not finish' : 'Please wait'}</td>`;
                body.append(row); return;
            }
            row.innerHTML = `<td>${escape(date(record.createdAt))}</td><td>${escape(kind)}</td><td class="backup-contents"><span>${escape(record.tables)} tables, ${escape(record.rows)} records</span><span>${record.uploads ? escape(record.uploads.files) + ' uploaded files' : 'Database only'}</span></td><td>${escape(size(record.bytes + (record.uploads?.archiveBytes || 0)))}</td><td><span class="backup-verified"><i class="fa-solid fa-circle-check" aria-hidden="true"></i> Verified</span></td><td><div class="backup-row-actions"><button type="button" data-download title="Download database backup" aria-label="Download database backup from ${escape(date(record.createdAt))}"><i class="fa-solid fa-download" aria-hidden="true"></i> Database</button>${record.uploads ? '<button type="button" data-download-uploads title="Download uploaded files" aria-label="Download uploaded files"><i class="fa-solid fa-file-zipper" aria-hidden="true"></i> Uploaded Files</button>' : ''}<button type="button" data-restore>Restore Database</button></div></td>`;
            if (lastRestore?.backupId === record.id) {
                row.dataset.lastRestored = 'true';
                const status = row.cells[4];
                const label = document.createElement('strong'); label.className = 'backup-last-restored';label.textContent = 'Last restored';status.append(label);
                const when = document.createElement('small');when.textContent = `Restored on ${date(lastRestore.restoredAt)}, Manila time.`;status.append(when);
                const who = document.createElement('small');who.textContent = `Restored by ${lastRestore.actorName} (${lastRestore.actorId}).`;status.append(who);
            }
            row.querySelector('[data-download]').onclick = () => download(record);
            if (record.uploads) row.querySelector('[data-download-uploads]').onclick = () => download(record, true);
            row.querySelector('[data-restore]').onclick = () => confirmRestore(record);
            body.append(row);
        });
        if (job && ['queued','running'].includes(job.status)) controls(true);
    }
    function controls(disabled) { find('[data-recovery-backups]')?.querySelectorAll('[data-backup-create],[data-backup-schedule],[data-backup-save-schedule],.backup-schedule-form input,[data-restore],[data-download],[data-download-uploads]').forEach(control => { control.disabled = disabled; }); }
    async function load() {
        const body = find('.backup-history-table tbody');
        find('[data-backup-retry]').hidden = true;
        find('[data-backup-manage]').disabled = true;
        find('[data-backup-previous]').disabled = true;find('[data-backup-next]').disabled = true;
        find('[data-backup-schedule]').hidden = true;
        find('[data-backup-settings-loading]').hidden = false;
        find('[data-backup-next-run]').textContent = 'Loading backup schedule...';
        find('[data-backup-schedule-description]').textContent = 'Loading automatic backup settings…';
        find('[data-backup-schedule-note]').textContent = '';
        body.innerHTML = '<tr><td colspan="6"><div class="backup-panel-loading" role="status" aria-label="Loading database backups"><span class="sigma-dot-spinner" aria-hidden="true"></span></div></td></tr>';
        find('[data-recovery-backups]').setAttribute('aria-busy','true');
        let result;
        try { result = await request(); }
        catch (error) { find('[data-backup-retry]').hidden = false;find('[data-backup-next-run]').textContent = 'Backup schedule could not be loaded.';find('[data-backup-settings-loading]').hidden = true;find('[data-backup-schedule-description]').textContent = 'Automatic backup settings could not be loaded.';find('[data-backup-schedule-note]').textContent = 'Reopen Database Backups to retry. Your saved schedule has not changed.';body.innerHTML = '<tr><td colspan="6" class="backup-empty">Backups could not be loaded. Use Retry loading backups to try again.</td></tr>'; throw error; }
        finally { find('[data-recovery-backups]').removeAttribute('aria-busy'); }
        lastRestore = result.lastRestore || null; savedBackups = result.backups; operations = result.operations || result.jobs || []; paint();
        applyScheduleSettings({...result.settings,schedulerReady:result.settings.schedulerReady!==false,times:result.settings.times||['08:00','20:00']});
        find('[data-backup-manage]').disabled = false;
        if (result.jobs.length) { job = result.jobs[0]; controls(true); poll(); }
        else if (result.latestJob?.status === 'failed') notice(result.latestJob.message, true);
    }
    async function openBackups() {
        install(); if (!master() || busy) return;
        if (location.hash !== '#nav-settings-recovery') previousPage = location.href;
        select('backups'); find('[data-backup-manage]').disabled = true;controls(true); notice('Verify your identity to manage database backups.');
        try {
            if (!await window.SigmaServiceVault.verifyPanel('backups')) {
                if (window.SigmaServiceVault.wasCanceled?.()) leaveCanceledVerification();
                else notice('Verification could not be completed. Reopen Database Backups to retry.', true);
                return;
            }
            notice(''); await load();
        } catch (error) { if(error.code === 'VAULT_AUTH_CANCELED'){leaveCanceledVerification();return;}notice(['TimeoutError','AbortError'].includes(error.name)?'Loading took too long. Please retry.':error.message, true); }
        finally { if (!job || ['completed','failed'].includes(job.status)) controls(false); window.SigmaServiceVault.finishLoading(); }
    }
    async function run(action, id = '') {
        if (busy || !master()) return;
        busy = true; controls(true);
        try {
            if (action === 'restore' && !await window.SigmaServiceVault.verifyPanel('backups')) return;
            const result = await request({action, ...(id ? {id, confirmation:'RESTORE'} : {})});
            job = result.job; operations = [job,...operations.filter(item => item.id !== job.id)]; paint(); controls(true); notice(action === 'restore' ? 'Creating a safety backup, then restoring the selected database snapshot…' : 'Creating and verifying your encrypted backup…'); poll();
        } catch (error) { notice(error.message, true); }
        finally { busy = false; if (!job || ['completed','failed'].includes(job.status)) controls(false); window.SigmaServiceVault.finishLoading(); }
    }
    async function poll() {
        clearTimeout(timer); if (!job || active !== 'backups' || page().classList.contains('hidden')) return;
        try {
            const result = await request(null, {action:'job', id:job.id}); job = result.job;
            if (job.status === 'completed' || job.status === 'failed') {
                // Successful backups are indicated by their Verified table row.
                // Restore instructions and failures still need an explicit message.
                notice(job.status === 'failed' || job.action === 'restore' ? job.message : '', job.status === 'failed'); controls(false);
                if (job.status === 'completed' && job.action === 'restore') {
                    controls(true); const login = find('[data-backup-login]'); login.hidden = false; login.disabled = false;
                } else { await load(); }
                return;
            }
            notice(job.action === 'restore' ? 'Database restore in progress. Please keep this page open for the result.' : job.message || 'Backup in progress. It continues even if you leave this page.');
        } catch (error) { notice(error.message, true); }
        timer = setTimeout(poll, 5000);
    }
    async function download(record, uploads = false) {
        try {
            const url = window.SigmaDatabase.url('database_backups') + '?action=' + (uploads ? 'download_uploads' : 'download') + '&id=' + encodeURIComponent(record.id);
            const response = await window.SigmaDatabase.fetch(url); if (!response.ok) { await window.SigmaDatabase.readJson(response); return; }
            const blob = await response.blob(), objectUrl = URL.createObjectURL(blob), link = document.createElement('a');
            link.href = objectUrl; link.download = uploads ? 'SIGMA-Uploaded-Files-' + record.id + '.zip' : 'SIGMA-Database-' + record.id + '.sigmabackup'; link.click(); setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
        } catch (error) { notice(error.message, true); }
    }
    function confirmRestore(record) {
        if (busy || !master()) return;
        const dialog = document.createElement('dialog'); dialog.className = 'service-vault-auth backup-restore-dialog';
        dialog.innerHTML = '<form><h2>Restore Database</h2><p>This replaces current database records with the selected snapshot. Newer changes will be replaced. A safety backup is created first; uploaded files are unchanged. Users must sign in again afterward.</p><p data-selected-backup></p><label>Type RESTORE to confirm<input name="confirmation" autocomplete="off" required maxlength="7" pattern="RESTORE"></label><div class="service-vault-auth-actions"><button type="button" class="sigma-dialog-btn-cancel">Cancel</button><button type="submit" class="sigma-dialog-btn-confirm">Verify &amp; Restore</button></div></form>';
        dialog.querySelector('[data-selected-backup]').textContent = 'Selected backup: ' + date(record.createdAt);
        const close = () => { dialog.close(); dialog.remove(); };
        dialog.querySelector('[type="button"]').onclick = close;
        dialog.addEventListener('cancel', event => {event.preventDefault(); close();});
        dialog.querySelector('form').onsubmit = event => { event.preventDefault(); if (dialog.querySelector('input').value !== 'RESTORE') return; close(); run('restore', record.id); };
        document.body.append(dialog); dialog.showModal(); dialog.querySelector('input').focus();
    }
    window.renderRecordRecovery = function () {
        if (!master()) { window.switchTab?.('nav-dashboard'); return; }
        install(); if (!installed) return originalRecovery?.();
        if (opening) return opening;
        opening = (async () => {
            if (routePanel() === 'backups') return openBackups();
            select('records'); return originalRecovery();
        })().finally(() => { opening = null; });
        return opening;
    };
    window.addEventListener('popstate', () => {
        if (location.hash === '#nav-settings-recovery' && !page()?.classList.contains('hidden')) window.renderRecordRecovery();
    });
    window.addEventListener('hashchange', event => {
        if (event.oldURL) {
            const old = new URL(event.oldURL);
            if (old.hash !== '#nav-settings-recovery') previousPage = old.href;
        }
        if (page()?.classList.contains('hidden')) clearTimeout(timer);
    });
    install();
})();
