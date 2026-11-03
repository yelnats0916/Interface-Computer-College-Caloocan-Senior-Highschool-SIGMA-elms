/** School-year transitions are committed by the server before refreshing the UI. */
(function () {
    'use strict';
    let pending = false;
    const notice = (message, type = 'info') => window.SigmaFeedback?.notify(message, type, { id: 'school-year-lifecycle' });
    const allowed = () => {
        if (window.isCurrentMasterAdmin?.()) return true;
        notice('Only Master Administrators can archive or reactivate school years.', 'error');
        return false;
    };
    async function perform(action, record, expectedStatus) {
        if (pending || !allowed()) return;
        pending = true;
        try {
            const result = await window.SigmaDatabase.request('school_years', {
                data: { action, id: record.id, expectedStatus }, foreground: true, autoReconnect: false, timeoutMs: 60000
            });
            // A local event refreshes the shared maintenance toggle from the committed state.
            if (result.maintenance) window.dispatchEvent(new CustomEvent('sigma:maintenance-refresh'));
            await Promise.all([window.fetchSchoolYearsFromDB?.(), window.fetchSectionsFromDB?.()]);
            window.renderSYManagerList?.();
            window.dispatchEvent(new CustomEvent('sigma:school-year-changed'));
            notice(result.message, 'success');
        } catch (error) {
            notice(error.message || 'The school-year change could not be confirmed. Refresh before trying again.', 'error');
        } finally { pending = false; }
    }
    async function prompt(action, id) {
        if (pending || !allowed()) return;
        pending = true;
        try {
            const preview = await window.SigmaDatabase.request('school_years', { query: { action: 'preview', id }, foreground: true });
            const record = preview.record, title = `${record.yearStart}-${record.yearEnd}`, count = preview.sectionsCount;
            const archiving = action === 'archive';
            if (archiving && record.status === 'Completed (Archived)') throw new Error('This school year is already archived.');
            if (!archiving && record.status !== 'Completed (Archived)') throw new Error('Only an archived school year can be reactivated.');
            const effect = archiving
                ? record.status === 'Active'
                    ? 'Maintenance will turn on. All non-master users will be signed out across devices and blocked from logging in until the Master Admin reopens the portal.'
                    : 'The current active year, maintenance setting, and user sessions will stay unchanged.'
                : 'This becomes the active year and the currently active year becomes Inactive. All non-master users will be signed out and maintenance will stay on until the Master Admin reopens the portal.';
            const message = archiving
                ? `${count} linked section(s) will become Archived and read-only. Their assignments, grades, attendance, submissions, and resource files will be preserved. ${effect}`
                : `${count} linked section(s) will require review; archived sections will return to Draft for manual deployment. Saved academic records and resources will be preserved. ${effect}`;
            window.showSYConfirm(`${archiving ? 'Archive' : 'Reactivate'} School Year ${title}?`, message,
                () => perform(action, record, record.status), archiving ? 'Archive Year' : 'Reactivate Year', 'Cancel');
        } catch (error) { notice(error.message, 'error'); }
        finally { pending = false; }
    }
    window.promptArchiveSchoolYear = id => prompt('archive', id);
    window.promptReactivateSchoolYear = id => prompt('reactivate', id);
    // Legacy entry points still require the same reviewed confirmation.
    window.promptRestoreSchoolYear = window.promptReactivateSchoolYear;
    window.executeArchiveSchoolYear = window.promptArchiveSchoolYear;
    window.executeRestoreSchoolYear = window.promptReactivateSchoolYear;
    window.executeArchiveAndActivate = window.promptArchiveSchoolYear;
})();
