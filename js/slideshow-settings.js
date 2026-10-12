(function () {
    'use strict';
    const scriptUrl = document.currentScript.src;
    const defaults = ['ICC Shs.jpg', 'ICC Enrollment.jpg', 'ICC Immersion.jpg', 'ICC Interfacer.jpg', 'ICC Learning.jpg']
        .map(name => ({ src: new URL('../image/' + name, scriptUrl).href, alt: name.replace('.jpg', '') }));
    function init() {
        const panel = document.getElementById('brand-slides-panel');
        if (!panel) return;
        const key = 'sigma-custom-login-slides';
        const find = selector => panel.querySelector(selector);
        let saved = defaults;
        try {
            const stored = JSON.parse(localStorage.getItem(key));
            if (Array.isArray(stored) && stored.length && stored.length <= 7 && stored.every(slide => typeof slide.src === 'string' && slide.src)) saved = stored;
        } catch (_) {}
        let draft = saved.map(slide => ({ ...slide }));
        let editing = false, mode = 'grid', current = 0, timer, dragged = null, replacement = null, busy = false, revision = 0;
        let returnScroll = () => {};
        const main = panel.closest('.sigma-settings-main');
        function captureScroll() {
            const positions = [];
            for (let node = panel.parentElement; node; node = node.parentElement) positions.push([node, node.scrollLeft, node.scrollTop]);
            const x = window.scrollX, y = window.scrollY;
            return () => {
                positions.forEach(([node, left, top]) => { node.scrollLeft = left; node.scrollTop = top; });
                window.scrollTo({ left: x, top: y, behavior: 'instant' });
            };
        }
        function restoreScroll() { returnScroll(); requestAnimationFrame(returnScroll); }
        const input = find('#slideshow-input');
        const feedback = message => { find('#slideshow-feedback').textContent = message; };
        function stop() {
            clearInterval(timer);
            timer = null;
            const button = find('[data-slide-action="play"]');
            button.title = 'Play slideshow';
            button.setAttribute('aria-label', button.title);
            button.firstElementChild.className = 'fa-solid fa-play';
        }
        function updatePreview() {
            current = Math.max(0, Math.min(current, draft.length - 1));
            const image = find('#slideshow-preview-image');
            image.hidden = !draft.length;
            if (draft.length) { image.src = draft[current].src; image.alt = draft[current].alt || 'Campus slide'; }
            else image.removeAttribute('src');
            find('#slideshow-position').textContent = draft.length ? `${current + 1} of ${draft.length}` : 'No slides';
            panel.querySelectorAll('[data-slide-action]').forEach(button => { button.disabled = draft.length < 2; });
        }
        function move(from, to) {
            if (busy || from < 0 || to < 0 || from >= draft.length || to >= draft.length) return;
            stop();
            const [slide] = draft.splice(from, 1);
            draft.splice(to, 0, slide);
            current = to;
            render();
            find(`#slideshow-grid [data-index="${to}"] select`)?.focus({ preventScroll: true });
        }
        function render() {
            panel.dataset.brandingEditing = String(editing);
            find('.slideshow-toolbar').hidden = !editing;
            find('#slideshow-actions').hidden = !editing;
            find('#slideshow-manage').hidden = editing;
            find('.slideshow-summary').hidden = editing;
            find('#slideshow-grid').hidden = !editing || mode !== 'grid';
            find('.slideshow-preview').hidden = editing && mode !== 'preview';
            find('#slideshow-count').textContent = `${draft.length} of 7 slides`;
            find('#slideshow-count').hidden = !editing;
            find('#slides-save-btn').disabled = busy || !draft.length || JSON.stringify(draft) === JSON.stringify(saved);
            find('#slideshow-restore').hidden = !editing || JSON.stringify(draft) === JSON.stringify(saved);
            find('#slideshow-restore').disabled = busy;
            panel.querySelectorAll('[data-slide-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.slideMode === mode)));
            const grid = find('#slideshow-grid');
            grid.replaceChildren();
            draft.forEach((slide, index) => {
                const card = document.createElement('figure');
                card.className = 'slideshow-tile';
                card.dataset.index = index;
                card.draggable = !busy;
                card.innerHTML = '<div class="slideshow-tile-card"><img alt=""><div class="slideshow-tile-tools"></div></div><figcaption></figcaption>';
                card.querySelector('img').src = slide.src;
                card.querySelector('img').alt = slide.alt || 'Campus slide';
                card.querySelector('img').draggable = false;
                card.querySelector('figcaption').textContent = index === 0 ? 'Slide 1 \u2014 First' : `Slide ${index + 1}`;
                const tools = card.querySelector('.slideshow-tile-tools');
                const positionLabel = document.createElement('label');
                positionLabel.className = 'slideshow-position-label';
                positionLabel.textContent = 'Position';
                const position = document.createElement('select');
                position.setAttribute('aria-label', `Position of slide ${index + 1}`);
                position.disabled = busy;
                position.draggable = false;
                draft.forEach((_, slot) => {
                    const option = document.createElement('option');
                    option.value = slot;
                    option.textContent = String(slot + 1);
                    option.selected = slot === index;
                    position.append(option);
                });
                position.addEventListener('change', () => {
                    const destination = Number(position.value);
                    // Let the native selection finish before replacing its dropdown.
                    requestAnimationFrame(() => {
                        if (position.isConnected) move(index, destination);
                    });
                });
                positionLabel.append(position);
                tools.append(positionLabel);
                for (const [action, icon, label] of [['replace', 'image', 'Replace slide'], ['delete', 'trash-can', 'Delete slide']]) {
                    const button = document.createElement('button');
                    button.type = 'button';
                    button.title = label;
                    button.setAttribute('aria-label', `${label} ${index + 1}`);
                    button.innerHTML = `<i class="fa-solid fa-${icon}" aria-hidden="true"></i>`;
                    button.disabled = busy;
                    button.addEventListener('click', () => {
                        if (action === 'replace') { replacement = index; input.multiple = false; input.click(); }
                        else { stop(); draft.splice(index, 1); render(); }
                    });
                    tools.append(button);
                }
                card.addEventListener('dragstart', event => { dragged = index; event.dataTransfer.setData('text/plain', String(index)); event.dataTransfer.effectAllowed = 'move'; });
                card.addEventListener('dragover', event => { if (dragged !== null && !busy) event.preventDefault(); });
                card.addEventListener('drop', event => { event.preventDefault(); if (dragged !== null) move(dragged, index); dragged = null; });
                card.addEventListener('dragend', () => { dragged = null; });
                grid.append(card);
            });
            if (editing && draft.length < 7) {
                const add = document.createElement('button');
                add.type = 'button';
                add.id = 'slideshow-add';
                add.className = 'slideshow-add-card';
                add.title = 'Add image';
                add.setAttribute('aria-label', 'Add image');
                add.disabled = busy;
                add.innerHTML = '<i class="fa-solid fa-plus" aria-hidden="true"></i>';
                add.addEventListener('click', () => { replacement = null; input.multiple = true; input.click(); });
                grid.append(add);
            }
            updatePreview();
        }
        find('#slideshow-manage').addEventListener('click', () => { returnScroll = captureScroll(); stop(); editing = true; mode = 'grid'; draft = saved.map(slide => ({ ...slide })); feedback(''); render(); if (main) main.scrollTop = 0; find('[data-slide-mode="grid"]').focus({ preventScroll: true }); });
        find('#slideshow-cancel').addEventListener('click', () => { revision++; busy = false; stop(); editing = false; draft = saved.map(slide => ({ ...slide })); feedback(''); render(); find('#slideshow-manage').focus({ preventScroll: true }); restoreScroll(); });
        panel.querySelectorAll('[data-slide-mode]').forEach(button => button.addEventListener('click', () => { stop(); mode = button.dataset.slideMode; render(); }));
        find('#slideshow-restore').addEventListener('click', () => {
            revision++;
            stop();
            draft = saved.map(slide => ({ ...slide }));
            current = 0;
            feedback('');
            render();
            find(`[data-slide-mode="${mode}"]`).focus({ preventScroll: true });
        });
        input.addEventListener('change', async () => {
            const files = Array.from(input.files || []);
            if (!files.length || busy || !editing) return;
            const target = replacement;
            const token = ++revision;
            if (files.length > (target === null ? 7 - draft.length : 1)) { feedback('A slideshow can have up to 7 images.'); input.value = ''; return; }
            busy = true;
            stop(); render(); feedback('Preparing images...');
            const images = [];
            try {
                for (const file of files) {
                    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) throw new Error('Choose PNG, JPEG or WebP images up to 10 MB each.');
                    const url = URL.createObjectURL(file);
                    try {
                        const image = new Image(); image.src = url; await image.decode();
                        const scale = Math.min(1, 1920 / image.naturalWidth, 1080 / image.naturalHeight);
                        const canvas = document.createElement('canvas');
                        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
                        const context = canvas.getContext('2d'); context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height);
                        images.push({ src: canvas.toDataURL('image/jpeg', 0.8), alt: file.name });
                    } finally { URL.revokeObjectURL(url); }
                }
                if (token !== revision) return;
                if (target === null) draft.push(...images); else draft[target] = images[0];
                feedback('Preview ready.');
            } catch (error) { if (token === revision) feedback(error.message || 'Unable to read image.'); }
            finally { if (token === revision) { busy = false; input.value = ''; render(); } }
        });
        find('#slides-save-btn').addEventListener('click', () => {
            if (busy || !draft.length) return;
            try { localStorage.setItem(key, JSON.stringify(draft)); }
            catch (_) { feedback('Unable to save. Try fewer or smaller images.'); return; }
            saved = draft.map(slide => ({ ...slide })); editing = false; stop(); current = 0; render(); feedback('Slideshow saved.'); find('#slideshow-manage').focus({ preventScroll: true }); restoreScroll();
        });
        panel.querySelectorAll('[data-slide-action]').forEach(button => button.addEventListener('click', () => {
            if (button.dataset.slideAction === 'play') {
                if (timer) return stop();
                button.title = 'Pause slideshow'; button.setAttribute('aria-label', button.title); button.firstElementChild.className = 'fa-solid fa-pause';
                timer = setInterval(() => { if (document.hidden || !panel.getClientRects().length) return stop(); current = (current + 1) % draft.length; updatePreview(); }, 4000);
            } else { stop(); current = (current + (button.dataset.slideAction === 'next' ? 1 : -1) + draft.length) % draft.length; updatePreview(); }
        }));
        render();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
