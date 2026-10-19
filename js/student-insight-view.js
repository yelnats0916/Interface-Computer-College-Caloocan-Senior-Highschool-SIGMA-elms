(function () {
    let dialog;
    let returnFocus;
    let previousOverflow;
    let returnPanel;
    let returnPanelScroll;
    let returnMobilePanel;
    let activeCard;
    let insightCards = [];
    function syncNavigation() {
        const index = insightCards.indexOf(activeCard);
        const nav = dialog.querySelector('.sigma-insight-navigation');
        nav.hidden = false;
        nav.querySelector('[data-direction="-1"]').disabled = index <= 0;
        nav.querySelector('[data-direction="1"]').disabled = index >= insightCards.length - 1;
        nav.querySelector('.sigma-insight-position').textContent = (index + 1) + ' of ' + insightCards.length;
        nav.querySelector('progress').max = Math.max(1, insightCards.length);
        nav.querySelector('progress').value = index + 1;
    }
    window.getInsightPreviewLineCount = function (height, lineHeight) {
        return Math.max(1, Math.floor(height / lineHeight));
    };
    function fitPreview(preview) {
        const text = preview.querySelector('.sigma-card-concern-text');
        if (!text || !preview.clientHeight) return;
        const style = getComputedStyle(text);
        const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.5;
        preview.style.setProperty('--sigma-preview-lines', window.getInsightPreviewLineCount(preview.clientHeight, lineHeight));
    }
    function initPreviews() {
        const observed = new Set();
        const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(entries => entries.forEach(entry => fitPreview(entry.target))) : null;
        let frame;
        const scan = () => {
            frame = null;
            for (const preview of observed) {
                if (!preview.isConnected) { resize?.unobserve(preview); observed.delete(preview); }
            }
            document.querySelectorAll('.sigma-insight-preview').forEach(preview => {
                if (!observed.has(preview)) { observed.add(preview); resize?.observe(preview); }
                fitPreview(preview);
            });
        };
        const schedule = () => { if (!frame) frame = requestAnimationFrame(scan); };
        new MutationObserver(mutations => {
            if (mutations.some(change => change.target.closest?.('.sigma-insight-preview')
                || [...change.addedNodes, ...change.removedNodes].some(node => node.nodeType === 1
                    && (node.matches?.('.sigma-insight-preview') || node.querySelector?.('.sigma-insight-preview'))))) schedule();
        }).observe(document.body, { childList: true, subtree: true, characterData: true });
        window.addEventListener('resize', schedule);
        document.fonts?.ready.then(schedule);
        scan();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initPreviews);
    else initPreviews();
    function close() { if (dialog?.open) dialog.close(); }
    window.addEventListener('sigma:refresh-analytics-cards', () => {
        requestAnimationFrame(() => { if (activeCard && !activeCard.isConnected) close(); });
    });
    function syncPinState() {
        const pinBtn = dialog?.querySelector('.sigma-insight-detail-pin');
        if (!pinBtn) return;
        const cardPinBtn = activeCard?.querySelector('.sigma-card-pin-btn, .pocket-card-pin-btn');
        if (!activeCard || !cardPinBtn) {
            pinBtn.style.display = 'none';
            return;
        }
        pinBtn.style.display = '';
        const isPinned = cardPinBtn.classList.contains('is-pinned') || activeCard.classList.contains('is-pinned-card');
        const isDisabled = Boolean(cardPinBtn.disabled || cardPinBtn.classList.contains('pointer-events-none'));
        const title = cardPinBtn.title || cardPinBtn.getAttribute('aria-label') || (isPinned ? 'Unpin from top' : 'Pin to top');
        pinBtn.classList.toggle('is-pinned', Boolean(isPinned));
        pinBtn.disabled = isDisabled;
        pinBtn.title = title;
        pinBtn.setAttribute('aria-label', title);
    }
    function createDialog() {
        if (dialog) return;
        dialog = document.createElement('dialog');
        dialog.className = 'sigma-insight-dialog';
        dialog.setAttribute('aria-labelledby', 'sigma-insight-detail-title');
        dialog.innerHTML = '<header class="sigma-insight-detail-header"><button type="button" class="sigma-insight-detail-back" aria-label="Back"><i class="fa-solid fa-chevron-left" aria-hidden="true"></i></button><div class="sigma-insight-detail-title-wrap"><span class="sigma-insight-detail-icon" aria-hidden="true"></span><h2 id="sigma-insight-detail-title"></h2></div><div class="sigma-insight-detail-actions"><button type="button" class="sigma-insight-detail-pin" aria-label="Pin to top" title="Pin to top"><i class="fa-solid fa-thumbtack" aria-hidden="true"></i></button><button type="button" class="sigma-insight-detail-close" aria-label="Close insight"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button></div></header><div class="sigma-insight-detail-body"><div class="sigma-insight-detail-text"></div><p class="sigma-insight-detail-date"></p></div>';
        const footer = document.createElement('footer');
        footer.className = 'sigma-insight-detail-footer';
        footer.innerHTML = '<nav class="sigma-insight-navigation" aria-label="Insight navigation"><button type="button" data-direction="-1" title="Previous insight" aria-label="Previous insight"><i class="fa-solid fa-arrow-left" aria-hidden="true"></i><span>Previous</span></button><div class="sigma-insight-position-wrap"><span class="sigma-insight-position" role="status" aria-live="polite"></span><progress aria-label="Insight position"></progress></div><button type="button" data-direction="1" title="Next insight" aria-label="Next insight"><span>Next</span><i class="fa-solid fa-arrow-right" aria-hidden="true"></i></button></nav>';
        footer.querySelectorAll('[data-direction]').forEach(button => button.addEventListener('click', () => {
            const next = insightCards.indexOf(activeCard) + Number(button.dataset.direction);
            if (next < 0 || next >= insightCards.length) return;
            const card = insightCards[next];
            const opener = card.querySelector('.sigma-insight-open');
            if (opener && card.isConnected) renderInsight(opener, card);
        }));
        dialog.appendChild(footer);
        document.body.appendChild(dialog);
        dialog.querySelectorAll('.sigma-insight-detail-close, .sigma-insight-detail-back').forEach(button => button.addEventListener('click', close));
        dialog.querySelector('.sigma-insight-detail-pin')?.addEventListener('click', event => {
            event.stopPropagation();
            const cardPinBtn = activeCard?.querySelector('.sigma-card-pin-btn, .pocket-card-pin-btn');
            if (cardPinBtn) {
                cardPinBtn.click();
                syncPinState();
            }
        });
        dialog.querySelector('.sigma-insight-detail-text').addEventListener('click', event => {
            if (event.target.closest('a')) { returnPanel = null; close(); }
        });
        dialog.addEventListener('click', event => {
            // Full-view controls must not dismiss the underlying header panel.
            event.stopPropagation();
            if (event.target !== dialog) return;
            const rect = dialog.getBoundingClientRect();
            if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
        });
        dialog.addEventListener('close', () => {
            document.body.style.overflow = previousOverflow;
            if (returnPanel?.isConnected) {
                returnPanel.classList.remove('hidden');
                if (returnMobilePanel) {
                    const header = returnPanel.closest('header') || document.getElementById('student-header') || document.getElementById('teacher-header');
                    document.body.classList.add('mobile-panel-open');
                    document.documentElement.classList.add('mobile-panel-open');
                    header?.classList.add('mobile-panel-open');
                    if (header) header.dataset.activeMobilePanel = 'analytics';
                    document.getElementById('mobile-subbar-analytics')?.classList.add('active', 'selected');
                }
                const feed = returnPanel.querySelector('#analytics-dropdown-cards');
                if (feed) feed.scrollTop = returnPanelScroll;
            }
            if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
            returnPanel = null;
            activeCard = null;
            insightCards = [];
        });
    }
    function renderInsight(button, card) {
        const content = card?.querySelector('.sigma-insight-full-content');
        if (!content) return;
        activeCard = card;
        if (card.dataset.reportInsight !== 'true') window.markInsightRead?.(card.dataset.id);
        dialog.querySelector('h2').textContent = button.querySelector('span')?.textContent.trim() || button.textContent.trim();
        const iconSlot = dialog.querySelector('.sigma-insight-detail-icon');
        if (iconSlot) {
            const cardIcon = button.querySelector('i') || card?.querySelector('.sigma-insight-open i, .sigma-insight-title i, .sigma-insight-header i');
            if (cardIcon) {
                iconSlot.innerHTML = `<i class="${cardIcon.className}" aria-hidden="true"></i>`;
                iconSlot.hidden = false;
            } else {
                iconSlot.innerHTML = '';
                iconSlot.hidden = true;
            }
        }
        syncPinState();
        const body = dialog.querySelector('.sigma-insight-detail-text');
        body.replaceChildren(content.content.cloneNode(true));
        const date = dialog.querySelector('.sigma-insight-detail-date');
        date.textContent = card.querySelector('.sigma-card-date')?.textContent.trim() || '';
        date.hidden = !date.textContent;
        syncNavigation();
        dialog.querySelector('.sigma-insight-detail-body').scrollTop = 0;
    }
    window.openStudentInsight = function (button) {
        if (dialog?.open) return;
        const card = button?.closest('.sigma-card--insight');
        if (!card?.querySelector('.sigma-insight-full-content')) return;
        createDialog();
        returnFocus = button;
        returnPanel = button.closest('#analytics-dropdown');
        returnPanelScroll = returnPanel?.querySelector('#analytics-dropdown-cards')?.scrollTop || 0;
        returnMobilePanel = Boolean(returnPanel && document.body.classList.contains('mobile-panel-open'));
        const feed = card.closest('#analytics-dropdown-cards, .insight-user-insights-rail-cards') || card.parentElement;
        insightCards = Array.from(feed.querySelectorAll('.sigma-card--insight')).filter(item =>
            item.querySelector('.sigma-insight-full-content') && item.querySelector('.sigma-insight-open') && item.getClientRects().length);
        if (!insightCards.includes(card)) insightCards = [card];
        renderInsight(button, card);
        if (returnPanel && window.matchMedia('(max-width: 768px)').matches) returnPanel.classList.add('hidden');
        previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        dialog.showModal();
        dialog.querySelector('.sigma-insight-detail-body').scrollTop = 0;
    };
})();
