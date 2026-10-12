(function () {
    'use strict';
    let restoring = false, closing = false;
    function state(layer) {
        return { ...history.state, sigmaSettings: { hash: location.hash, ...layer } };
    }
    window.recordSystemSettingsLayer = function (layer) {
        if (restoring) return;
        const previous = history.state?.sigmaSettings;
        if (JSON.stringify(previous) === JSON.stringify({ hash: location.hash, ...layer })) return;
        if (!previous || previous.hash !== location.hash) {
            history.replaceState(state({ kind: 'base', tab: layer.kind === 'ai-tab' ? 'functions' : 'keys' }), '', location.href);
        }
        history.pushState(state(layer), '', location.href);
    };
    window.closeSystemSettingsLayer = function (kind) {
        if (!restoring && !closing && history.state?.sigmaSettings?.kind === kind
            && history.state.sigmaSettings.hash === location.hash) {
            closing = true;
            history.back();
        }
    };
    window.addEventListener('popstate', event => {
        closing = false;
        const layer = event.state?.sigmaSettings;
        const visible = document.querySelector('.dynamic-section:not(.hidden)');
        const routes = {
            'settings-ai-view': '#settings-ai-view',
            'settings-recaptcha-view': '#settings-recaptcha-view',
            'settings-gdrive-view': '#settings-gdrive-view'
        };
        if (!layer || layer.hash !== location.hash || routes[visible?.id] !== location.hash) return;
        event.stopImmediatePropagation();
        restoring = true;
        try {
            if (visible.id === 'settings-ai-view') {
                window.toggleAddAiKeyForm(false, null, false);
                window.selectAiSettingsTab(layer.tab || 'keys', false);
                if (layer.kind === 'ai-editor') {
                    const key = layer.id ? window.getAiSettingsKeyById?.(layer.id) : null;
                    if (!layer.id || key) window.toggleAddAiKeyForm(true, key);
                }
            } else if (visible.id === 'settings-recaptcha-view') {
                window.setRecaptchaKeyEditing('site', false);
                window.setRecaptchaKeyEditing('secret', false);
                if (layer.kind === 'recaptcha-editor') window.setRecaptchaKeyEditing(layer.key, true);
            } else {
                window.setGoogleDriveFolderEditing(layer.kind === 'drive-editor');
            }
            window.sigmaResetScrollToTop?.();
        } finally { restoring = false; }
    }, true);
})();
