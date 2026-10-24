(function () {
    'use strict';
    const endpoint = action => `${window.SigmaDatabase.url('gdrive_oauth')}?action=${action}`;
    const show = message => { const node = document.getElementById('gdrive-oauth-status'); if (node) node.textContent = message; };
    let syncing=false;
    async function request(action, options = {}) {
        const response = await window.SigmaDatabase.fetch(endpoint(action), { ...options, credentials: 'same-origin', signal: AbortSignal.timeout(action === 'sync_pending' ? 180000 : 35000) });
        const result = await window.SigmaDatabase.readJson(response);
        if (!result.success) throw new Error(result.error || 'Unable to connect Google Drive.');
        return result;
    }
    window.loadDriveOAuthStatus = async function () {
        try {
            const data = await request('status');
            show(data.connected ? `Google account authorized. ${data.pending_files} files awaiting synchronization.`
                : data.configured ? 'OAuth credentials saved. Connect your Google account to allow uploads.'
                : 'Connect your Google account to use its Drive storage for uploaded files.');
            const connect = document.getElementById('gdrive-oauth-connect');
            if (connect) { connect.disabled = !data.configured; connect.textContent = data.connected ? 'Reconnect Google Account' : 'Connect Google Account'; }
            if (data.connected && data.pending_files && !syncing) {
                syncing=true;
                try {
                    let pending=data.pending_files;
                    while (pending>0) {
                        show(`Synchronizing ${pending} pending files to Google Drive…`);
                        const batch=await request('sync_pending',{method:'POST'});
                        pending=batch.pending;
                        if (batch.error || !batch.synced) { show(batch.error || `${pending} files are still awaiting synchronization.`);break; }
                    }
                    if (!pending) show('Google account connected. All material files are synchronized.');
                } finally { syncing=false; }
            }
        } catch (error) { show(error.code === 'VAULT_AUTH_CANCELED' ? 'Open Drive settings from System to verify your administrator account.' : error.message); }
    };
    window.uploadDriveOAuthCredentials = async function (event) {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            if (!await window.SigmaServiceVault.verifyPanel('drive')) return;
            const body = new FormData(); body.append('credentials', file);
            show('Saving OAuth credentials…');
            await request('configure', { method: 'POST', body });
            await window.loadDriveOAuthStatus();
        } catch (error) { show(error.message); }
        finally { event.target.value = ''; }
    };
    window.connectDriveGoogleAccount = async function () {
        try {
            if (!await window.SigmaServiceVault.verifyPanel('drive')) return;
            show('Opening Google authorization…');
            const data = await request('begin', { method: 'POST' });
            const target = new URL(data.url);
            if (target.origin !== 'https://accounts.google.com' || target.pathname !== '/o/oauth2/v2/auth') throw new Error('Invalid Google authorization response.');
            location.assign(target.href);
        } catch (error) { show(error.message); }
    };
})();
