(function () {
    'use strict';
    const storageKey = 'sigma-institution-logo';
    const legacyKeys = ['sigma-custom-nav-logo', 'sigma-custom-login-logo', 'sigma-custom-login-bar-logo'];
    const defaultLogo = new URL('../image/ICC logo.jpg', document.currentScript.src).href;
    let saved, draft, revision = 0;
    let editing = false;
    let returnScroll = () => {};
    function captureScroll(panel) {
        const positions = [];
        for (let node = panel?.parentElement; node; node = node.parentElement) positions.push([node, node.scrollLeft, node.scrollTop]);
        const x = window.scrollX, y = window.scrollY;
        return () => {
            positions.forEach(([node, left, top]) => { node.scrollLeft = left; node.scrollTop = top; });
            window.scrollTo({ left: x, top: y, behavior: 'instant' });
        };
    }
    function resetEditorScroll(restore = false) {
        if (restore) {
            returnScroll();
            const restoreScroll = returnScroll;
            requestAnimationFrame(restoreScroll);
            return;
        }
        const main = document.getElementById('brand-logos-panel')?.closest('.sigma-settings-main');
        if (main) main.scrollTop = 0;
    }
    function readLogo() {
        return localStorage.getItem(storageKey) ?? legacyKeys.map(key => localStorage.getItem(key)).find(Boolean) ?? '';
    }
    function applyLogo(value) {
        const url = value || defaultLogo;
        document.querySelectorAll('img[alt="ICC Logo"], .login-form-logo, #backToLoginLogo img, #logo-container img, #landingLoginLogoWrap img').forEach(img => { img.src = url; });
        let icon = document.querySelector('link[rel="icon"]');
        if (!icon) { icon = document.createElement('link'); icon.rel = 'icon'; document.head.append(icon); }
        icon.removeAttribute('type');
        icon.href = url;
    }
    function preview() {
        const panel = document.getElementById('brand-logos-panel');
        if (panel) panel.dataset.brandingEditing = String(editing);
        document.querySelectorAll('#institution-logo-preview, [data-institution-logo-preview]').forEach(img => { img.src = draft || defaultLogo; });
        const dirty = draft !== saved;
        const save = document.getElementById('institution-logo-save');
        if (save) save.disabled = !dirty;
        const cancel = document.getElementById('institution-logo-cancel');
        if (cancel) cancel.hidden = !editing;
        const restore = document.getElementById('institution-logo-restore');
        if (restore) { restore.hidden = !editing; restore.disabled = !draft; }
        const change = document.getElementById('institution-logo-change');
        if (change) change.hidden = editing;
        const upload = document.getElementById('institution-logo-upload');
        if (upload) upload.hidden = !editing;
        const samples = document.querySelector('.institution-logo-previews');
        if (samples) samples.hidden = !editing;
        const actions = document.getElementById('institution-logo-actions');
        if (actions) actions.hidden = !editing;
    }
    function feedback(message) {
        const node = document.getElementById('institution-logo-feedback');
        if (node) node.textContent = message;
    }
    function init() {
        saved = readLogo();
        draft = saved;
        applyLogo(saved);
        preview();
        const input = document.getElementById('institution-logo-input');
        document.getElementById('institution-logo-change')?.addEventListener('click', () => {
            returnScroll = captureScroll(document.getElementById('brand-logos-panel'));
            editing = true;
            draft = saved;
            feedback('');
            preview();
            resetEditorScroll();
            document.getElementById('institution-logo-upload')?.focus({ preventScroll: true });
        });
        document.getElementById('institution-logo-upload')?.addEventListener('click', () => input?.click());
        input?.addEventListener('change', async () => {
            const file = input.files?.[0];
            if (!file) return;
            const token = ++revision;
            if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
                feedback('Choose a PNG, JPEG or WebP image up to 5 MB.');
                input.value = '';
                return;
            }
            const url = URL.createObjectURL(file);
            try {
                const img = new Image();
                img.src = url;
                await img.decode();
                if (token !== revision) return;
                const scale = Math.min(1, 512 / Math.max(img.naturalWidth, img.naturalHeight));
                const canvas = document.createElement('canvas');
                canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
                canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
                canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                draft = canvas.toDataURL('image/png');
                preview();
                feedback('Preview ready. Changes are not saved yet.');
            } catch (_) { if (token === revision) feedback('Unable to read this image. Choose another file.'); }
            finally { URL.revokeObjectURL(url); input.value = ''; }
        });
        document.getElementById('institution-logo-cancel')?.addEventListener('click', () => {
            revision++;
            draft = saved;
            editing = false;
            preview();
            feedback('');
            resetEditorScroll(true);
            document.getElementById('institution-logo-change')?.focus({ preventScroll: true });
        });
        document.getElementById('institution-logo-restore')?.addEventListener('click', () => {
            revision++;
            draft = '';
            preview();
            feedback(draft === saved ? '' : 'Default logo preview. Save Changes to apply.');
        });
        document.getElementById('institution-logo-save')?.addEventListener('click', () => {
            const keys = [storageKey, ...legacyKeys];
            const previous = keys.map(key => localStorage.getItem(key));
            try {
                keys.forEach(key => localStorage.setItem(key, draft));
            } catch (_) {
                keys.forEach((key, i) => {
                    try { if (previous[i] === null) localStorage.removeItem(key); else localStorage.setItem(key, previous[i]); } catch (_) {}
                });
                feedback('Unable to save logo. Browser storage may be full.');
                return;
            }
            saved = draft;
            revision++;
            editing = false;
            applyLogo(saved);
            preview();
            feedback('Logo saved.');
            resetEditorScroll(true);
            document.getElementById('institution-logo-change')?.focus({ preventScroll: true });
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
    window.addEventListener('storage', event => {
        if (event.key !== storageKey && event.key !== null) return;
        const editing = draft !== saved;
        saved = readLogo();
        applyLogo(saved);
        if (!editing) { draft = saved; preview(); }
    });
})();
