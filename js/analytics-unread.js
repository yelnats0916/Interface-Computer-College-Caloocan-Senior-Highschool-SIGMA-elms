(function () {
    function init() {
        const button = document.getElementById('mobile-subbar-analytics');
        const panels = ['analytics-dropdown', 'mobile-sigma-sheet']
            .map(id => document.getElementById(id)).filter(Boolean);
        const owner = (() => { try { const user = JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}'); return String(user.id || user.uid || ''); } catch { return ''; } })();
        if (!owner) return;
        const storageKey = 'sigma-insight-read-v1:' + owner;
        let saved;
        try { saved = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch { saved = {}; }
        const unread = new Set();
        const read = new Set(Array.isArray(saved?.read) ? saved.read.map(String) : []);
        const badge = document.createElement('span');
        badge.className = 'mobile-subbar-badge hidden';
        badge.setAttribute('aria-hidden', 'true');
        if (button) { button.style.position = 'relative'; button.appendChild(badge); }
        const isOpen = () => panels.some(panel =>
            panel.id === 'analytics-dropdown' ? !panel.classList.contains('hidden') : panel.classList.contains('open'));
        function render() {
            const kind = location.pathname.includes('teacher') ? 'teacher' : 'student';
            const controller = kind === 'teacher' ? window.SigmaTeacherAnalytics : window.SigmaStudentAnalytics;
            const cards = window.SigmaAiDatabase?.getStatus(kind, owner) === 'ready' ? controller?.getCards?.() || [] : [];
            const available = new Set(cards.filter(card => card?.id && !card.hidden && !card.isDeleted).map(card => String(card.id)));
            // Rebuild from real currently available cards, not DOM placeholders or saved badge totals.
            unread.clear();
            available.forEach(id => { if (!read.has(id)) unread.add(id); });
            document.querySelectorAll('.sigma-card--insight[data-id]').forEach(card => {
                const id = card.dataset.id;
                if (!available.has(id)) { card.querySelector('.sigma-insight-new-badge')?.remove(); return; }
                const actions = card.querySelector('.sigma-insight-actions');
                card.querySelector('.sigma-insight-unread-dot')?.remove();
                const newBadge = card.querySelector('.sigma-insight-new-badge');
                if (read.has(id)) newBadge?.remove();
                if (!read.has(id) && actions && !newBadge) {
                    const label = document.createElement('span');
                    label.className = 'sigma-insight-new-badge';
                    label.textContent = 'New';
                    label.title = 'Unread insight';
                    actions.prepend(label);
                }
            });
            const serialized = JSON.stringify({ unread: [...unread], read: [...read] });
            try { if (localStorage.getItem(storageKey) !== serialized) localStorage.setItem(storageKey, serialized); } catch (_) {}
            const count = unread.size > 99 ? '99+' : String(unread.size);
            if (badge.textContent !== count) badge.textContent = count;
            badge.classList.toggle('hidden', unread.size === 0);
            button?.setAttribute('aria-label', `SIGMA AI Insights, ${unread.size} unread insights`);
            document.querySelectorAll('.sigma-insight-search-toggle').forEach(search => {
                let markAll = search.parentElement.querySelector('.sigma-insight-mark-all');
                if (!markAll) {
                    markAll = document.createElement('button');
                    markAll.type = 'button';
                    markAll.className = 'sigma-insight-mark-all sigma-analyze-button';
                    markAll.title = 'Mark all insights as read';
                    markAll.setAttribute('aria-label', 'Mark all insights as read');
                    markAll.innerHTML = '<i class="fa-solid fa-circle-check" aria-hidden="true"></i>';
                    markAll.addEventListener('click', event => {
                        event.stopPropagation();
                        unread.forEach(id => read.add(id));
                        unread.clear();
                        render();
                    });
                    search.before(markAll);
                }
                markAll.disabled = unread.size === 0;
            });
        }
        window.addEventListener('sigma:analytics-insight', event => {
            render();
        });
        window.addEventListener('sigma:refresh-analytics-cards', render);
        window.markInsightRead = id => { read.add(String(id)); unread.delete(String(id)); render(); };
        window.addEventListener('storage', event => {
            if (event.key !== storageKey) return;
            try {
                const state = JSON.parse(event.newValue || '{}');
                unread.clear(); read.clear();
                (state.unread || []).forEach(id => unread.add(id));
                (state.read || []).forEach(id => read.add(id));
                render();
            } catch (_) {}
        });
        let frame = 0;
        const relevant = '.sigma-card--insight,.sigma-insight-search-toggle';
        new MutationObserver(records => {
            if (!records.some(record => [...record.addedNodes, ...record.removedNodes].some(node =>
                node.nodeType === 1 && (node.matches(relevant) || node.querySelector(relevant))))) return;
            if (!frame) frame = requestAnimationFrame(() => { frame = 0; render(); });
        }).observe(document.body, { childList: true, subtree: true });
        render();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
