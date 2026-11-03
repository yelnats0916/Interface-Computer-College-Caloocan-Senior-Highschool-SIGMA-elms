(function () {
    'use strict';
    let pending = null;
    const statuses = () => document.querySelectorAll('.gemini-status-text,.groq-status-text');
    const visible = () => {
        const panel = document.getElementById('settings-integrations-view');
        return panel && !panel.classList.contains('hidden');
    };
    window.loadIntegrationOverview = function () {
        if (pending) return pending;
        statuses().forEach(status => { status.textContent = 'Checking configuration…'; });
        pending = (async () => {
            try {
                const data = await window.SigmaDatabase.request('auth', {
                    query: { action: 'integration_status' }, foreground: true, autoReconnect: false
                });
                if (data?.success !== true || !['gemini', 'groq'].every(provider => typeof data.providers?.[provider]?.configured === 'boolean')) {
                    throw new Error('Integration status unavailable');
                }
                for (const provider of ['gemini', 'groq']) {
                    document.querySelectorAll('.' + provider + '-status-text').forEach(status => {
                        status.textContent = data.providers[provider].configured ? 'Configured' : 'Not Configured';
                    });
                }
            } catch (_) {
                statuses().forEach(status => { status.textContent = 'Status unavailable'; });
            } finally { pending = null; }
        })();
        return pending;
    };
    const refresh = () => { if (visible()) window.loadIntegrationOverview(); };
    // Installed before admin navigation, including direct links and restored settings routes.
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refresh);
    else refresh();
    window.addEventListener('sigma:database-session-ready', refresh);
    window.addEventListener('hashchange', refresh);
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
})();
