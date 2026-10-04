(function () {
    function init() {
        const panel = document.getElementById('sigmaAiPanel');
        const messages = document.getElementById('sigmaAiMessages');
        if (!panel || !messages) return;
        let unread = 0;
        const badges = ['sigma-toggle', 'mobile-subbar-sigma'].flatMap(id => {
            const button = document.getElementById(id);
            if (!button) return [];
            const badge = document.createElement('span');
            badge.className = 'hidden';
            badge.style.cssText = 'position:absolute;top:-3px;right:-3px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;min-width:18px;width:max-content;height:18px;padding:0 3px;background:#dc2626;color:#fff;border:2px solid #fff;border-radius:9999px;font-family:Inter,sans-serif;font-size:10px;font-weight:700;line-height:1;white-space:nowrap;pointer-events:none;';
            if (id === 'mobile-subbar-sigma') badge.classList.add('mobile-subbar-badge');
            button.style.position = 'relative';
            button.appendChild(badge);
            return [{ button, badge }];
        });
        const isOpen = () => !panel.classList.contains('hidden');
        function render() {
            badges.forEach(({ button, badge }) => {
                badge.textContent = unread > 99 ? '99+' : String(unread);
                badge.classList.toggle('hidden', unread === 0);
                button.setAttribute('aria-label', `SIGMA AI, ${unread} unread messages`);
            });
        }
        // Existing messages include the startup greeting, not new unread replies.
        new MutationObserver(records => {
            if (isOpen()) return;
            records.forEach(record => record.addedNodes.forEach(node => {
                if (node.nodeType === 1 && node.matches('.sigma-ai-message--assistant')
                    && node.dataset.sigmaGreeting !== 'true') unread++;
            }));
            render();
        }).observe(messages, { childList: true });
        new MutationObserver(() => {
            if (isOpen()) {
                unread = 0;
                render();
            }
        }).observe(panel, { attributes: true, attributeFilter: ['class'] });
        render();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
