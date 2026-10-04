(function () {
    function init() {
        const button = document.getElementById('mobile-subbar-analytics');
        const panels = ['analytics-dropdown', 'mobile-sigma-sheet']
            .map(id => document.getElementById(id)).filter(Boolean);
        if (!button || !panels.length) return;
        const unread = new Set();
        const badge = document.createElement('span');
        badge.className = 'mobile-subbar-badge hidden';
        badge.setAttribute('aria-hidden', 'true');
        button.style.position = 'relative';
        button.appendChild(badge);
        const isOpen = () => panels.some(panel =>
            panel.id === 'analytics-dropdown' ? !panel.classList.contains('hidden') : panel.classList.contains('open'));
        function render() {
            badge.textContent = unread.size > 99 ? '99+' : String(unread.size);
            badge.classList.toggle('hidden', unread.size === 0);
            button.setAttribute('aria-label', `SIGMA Analytics, ${unread.size} unread insights`);
        }
        window.addEventListener('sigma:analytics-insight', event => {
            if (!event.detail || isOpen()) return;
            unread.add(event.detail.id);
            render();
        });
        panels.forEach(panel => new MutationObserver(() => {
            if (isOpen()) {
                unread.clear();
                render();
            }
        }).observe(panel, { attributes: true, attributeFilter: ['class'] }));
        render();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
