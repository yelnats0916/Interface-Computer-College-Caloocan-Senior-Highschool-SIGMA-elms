(function () {
    'use strict';
    if (!document.getElementById('audit-ai-view')) return;
    // Remove only legacy AI preview data, not recorded requests or other log stores.
    try {
        if (localStorage.getItem('sigma-ai-preview-logs') !== null) {
            localStorage.removeItem('sigma-ai-preview-logs');
            window.dispatchEvent(new Event('sigma:ai-logs-updated'));
        }
    } catch (error) { console.warn('Unable to remove legacy AI preview rows:', error.message); }
})();
