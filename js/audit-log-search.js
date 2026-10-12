(function () {
    'use strict';
    const ids = ['audit-ai-view', 'audit-activity-view', 'audit-auth-view', 'audit-notifications-view'];
    let query = '';
    const clean = value => String(value || '').replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 100);
    window.getAuditLogSearchQuery = () => query;
    function filterRows(section) {
        const body = section.querySelector('.sigma-audit-table tbody');
        if (!body) return;
        if (window.SigmaLogPagination) {
            window.SigmaLogPagination.filter(body.closest('table'), query);
            return;
        }
        body.querySelector('[data-audit-search-empty]')?.remove();
        const rows = Array.from(body.rows);
        let matches = 0;
        rows.forEach(row => {
            const match = !query || row.textContent.toLowerCase().includes(query);
            row.dataset.logSearchMatch = String(match);
            row.hidden = !match;
            if (match) matches++;
        });
        if (!matches && query) {
            const row = body.insertRow();
            row.dataset.auditSearchEmpty = 'true';
            const cell = row.insertCell();
            cell.colSpan = section.querySelector('thead tr')?.cells.length || 1;
            cell.textContent = 'No matching logs.';
        }
        window.SigmaLogPagination?.reset(body.closest('table'));
    }
    function apply() {
        const section = ids.map(id => document.getElementById(id)).find(section => section && !section.classList.contains('hidden'));
        if (!section) return;
        if (section.id === 'audit-ai-view') window.filterAiAuditLogs?.();
        else if (section.id === 'audit-notifications-view') window.filterNotificationAuditLogs?.();
        else filterRows(section);
    }
    function init() {
        for (const id of ids) {
            const section = document.getElementById(id);
            const aside = section?.querySelector('.audit-log-sidebar');
            if (!aside) continue;
            const form = document.createElement('form');
            form.className = 'audit-log-search ai-log-search ai-log-conversation-search';
            form.setAttribute('role', 'search');
            const input = document.createElement('input');
            input.type = 'search';
            input.className = 'sigma-input sigma-search-input';
            input.name = 'audit-log-query';
            input.placeholder = 'Search logs';
            input.setAttribute('aria-label', 'Search selected log category');
            input.maxLength = 100;
            input.autocomplete = 'off';
            const wrap = document.createElement('div');
            wrap.className = 'ai-log-search-input-wrap';
            const clear = document.createElement('button');
            clear.type = 'button';
            clear.className = 'ai-log-search-clear';
            clear.title = 'Clear search';
            clear.setAttribute('aria-label', 'Clear search');
            clear.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
            clear.hidden = true;
            input.addEventListener('input', () => {
                input.value = clean(input.value);
                clear.hidden = !input.value;
            });
            clear.addEventListener('click', () => {
                input.value = '';
                clear.hidden = true;
                input.focus({ preventScroll: true });
            });
            wrap.append(input, clear);
            const button = document.createElement('button');
            button.type = 'submit';
            button.className = 'sigma-btn sigma-btn-primary ai-log-conversation-search-button';
            button.title = 'Search logs';
            button.setAttribute('aria-label', 'Search logs');
            button.innerHTML = '<i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>';
            form.append(wrap, button);
            aside.prepend(form);
            const submit = () => {
                input.value = clean(input.value);
                query = input.value.trim().toLowerCase();
                document.querySelectorAll('.audit-log-search input').forEach(field => {
                    field.value = input.value;
                    field.parentElement.querySelector('.ai-log-search-clear').hidden = !field.value;
                });
                apply();
            };
            form.addEventListener('submit', event => { event.preventDefault(); submit(); });
            input.addEventListener('search', () => { if (!input.value) submit(); });
            new MutationObserver(() => {
                if (section.classList.contains('hidden')) return;
                input.value = query;
                clear.hidden = !input.value;
                apply();
            }).observe(section, { attributes: true, attributeFilter: ['class'] });
        }
        apply();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
