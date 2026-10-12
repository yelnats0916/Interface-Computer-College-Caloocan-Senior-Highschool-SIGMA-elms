(function () {
    'use strict';
    const scriptUrl = document.currentScript.src;
    const defaultBanner = new URL('../image/ICC Goals.jpeg', scriptUrl).href;
    const key = 'sigma-welcome-panel';
    const galleryKey = 'sigma-welcome-banner-library';
    function read() {
        const value = localStorage.getItem(key);
        if (!value || /(?:^|\/)image\/Welcome\.jpg$/.test(value)) return defaultBanner;
        if (/^(data:|https?:)/.test(value)) return value;
        return new URL('../' + value.replace(/^\.\.\//, ''), scriptUrl).href;
    }
    function apply(value) {
        document.querySelectorAll('#welcome-panel-admin-img, #welcome-panel-student-img, #welcome-panel-teacher-img').forEach(image => { image.src = value; });
    }
    function init() {
        let saved = read(), draft = saved, editing = false, busy = false, revision = 0;
        let uploads = [];
        try {
            const stored = JSON.parse(localStorage.getItem(galleryKey));
            if (Array.isArray(stored)) uploads = stored.filter(item => typeof item.src === 'string' && /^(data:image\/|https?:)/.test(item.src));
        } catch (_) {}
        if (saved !== defaultBanner && !uploads.some(item => item.src === saved)) uploads.push({ src: saved, name: 'Saved banner' });
        let savedUploads = uploads.map(item => ({ ...item }));
        apply(saved);
        const panel = document.getElementById('brand-welcome-panel');
        if (!panel) return;
        const find = selector => panel.querySelector(selector);
        let returnScroll = () => {};
        function captureScroll() {
            const nodes = [];
            for (let node = panel.parentElement; node; node = node.parentElement) nodes.push([node, node.scrollTop, node.scrollLeft]);
            const x = window.scrollX, y = window.scrollY;
            return () => { nodes.forEach(([node, top, left]) => { node.scrollTop = top; node.scrollLeft = left; }); window.scrollTo({ left: x, top: y, behavior: 'instant' }); };
        }
        const feedback = message => { find('#welcome-banner-feedback').textContent = message; };
        function updateSize() {
            const box = find('.welcome-banner-preview').getBoundingClientRect();
            find('#welcome-banner-size').textContent = `Preview: ${Math.round(box.width)} x ${Math.round(box.height)} px. Recommended upload: 1920 x 1080 px.`;
        }
        new ResizeObserver(updateSize).observe(find('.welcome-banner-preview'));
        function render() {
            panel.dataset.brandingEditing = String(editing);
            find('#welcome-panel-preview').src = draft;
            find('#welcome-banner-change').hidden = editing;
            find('#welcome-banner-upload').hidden = !editing;
            find('#welcome-banner-upload').disabled = busy;
            find('#welcome-banner-restore').hidden = !editing;
            find('#welcome-banner-restore').disabled = busy || draft === defaultBanner;
            find('#welcome-banner-actions').hidden = !editing;
            find('#welcome-panel-save-btn').disabled = busy || draft === saved;
            find('#welcome-banner-size').hidden = !editing;
            find('#welcome-banner-library').hidden = !editing;
            const gallery = find('#welcome-banner-gallery');
            gallery.replaceChildren();
            uploads.forEach((item, index) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.setAttribute('aria-label', `Choose banner ${index + 1}: ${item.name || 'Uploaded banner'}`);
                button.setAttribute('aria-pressed', String(item.src === draft));
                button.disabled = busy;
                const image = document.createElement('img'); image.src = item.src; image.alt = item.name || 'Uploaded banner';
                button.append(image);
                button.addEventListener('click', () => { draft = item.src; feedback(''); render(); });
                gallery.append(button);
            });
            if (!uploads.length) { const empty = document.createElement('p'); empty.textContent = 'No uploaded banners yet'; gallery.append(empty); }
            updateSize();
        }
        function finish() {
            editing = false;
            render();
            find('#welcome-banner-change').focus({ preventScroll: true });
            returnScroll(); requestAnimationFrame(returnScroll);
        }
        find('#welcome-banner-change').addEventListener('click', () => {
            returnScroll = captureScroll(); draft = saved; editing = true; feedback(''); render();
            const main = panel.closest('.sigma-settings-main'); if (main) main.scrollTop = 0;
            find('#welcome-banner-upload').focus({ preventScroll: true });
        });
        const input = find('#welcome-panel-input');
        find('#welcome-banner-upload').addEventListener('click', () => input.click());
        input.addEventListener('change', async () => {
            const file = input.files?.[0];
            if (!file || !editing || busy) return;
            const token = ++revision;
            if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) { feedback('Choose a PNG, JPEG or WebP image up to 10 MB.'); input.value = ''; return; }
            busy = true; render(); feedback('Preparing image...');
            const url = URL.createObjectURL(file);
            try {
                const image = new Image(); image.src = url; await image.decode();
                if (token !== revision) return;
                const scale = Math.min(1, 1920 / image.naturalWidth, 1080 / image.naturalHeight);
                const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
                const context = canvas.getContext('2d'); context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height);
                draft = canvas.toDataURL('image/jpeg', 0.85);
                if (!uploads.some(item => item.src === draft)) uploads.push({ src: draft, name: file.name });
                feedback('');
            } catch (_) { if (token === revision) feedback('Unable to read this image. Choose another file.'); }
            finally { URL.revokeObjectURL(url); if (token === revision) { busy = false; input.value = ''; render(); } }
        });
        find('#welcome-banner-restore').addEventListener('click', () => { revision++; draft = defaultBanner; feedback(''); render(); });
        find('#welcome-panel-cancel').addEventListener('click', () => { revision++; busy = false; draft = saved; uploads = savedUploads.map(item => ({ ...item })); input.value = ''; feedback(''); finish(); });
        find('#welcome-panel-save-btn').addEventListener('click', () => {
            if (busy || draft === saved) return;
            const previous = localStorage.getItem(galleryKey);
            try {
                localStorage.setItem(galleryKey, JSON.stringify(uploads));
                try { localStorage.setItem(key, draft); }
                catch (error) {
                    if (previous === null) localStorage.removeItem(galleryKey); else localStorage.setItem(galleryKey, previous);
                    throw error;
                }
            } catch (_) { feedback('Could not save. Try a smaller image.'); return; }
            savedUploads = uploads.map(item => ({ ...item }));
            saved = draft; apply(saved);
            window.dispatchEvent(new CustomEvent('sigma:welcome-panel-changed', { detail: saved }));
            feedback(''); finish();
        });
        window.addEventListener('storage', event => {
            if (event.key !== key && event.key !== null) return;
            saved = read(); apply(saved);
            if (!editing) { draft = saved; render(); }
        });
        render();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
