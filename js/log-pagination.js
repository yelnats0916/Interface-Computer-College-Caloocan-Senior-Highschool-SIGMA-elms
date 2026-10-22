(function () {
    'use strict';
    const controllers = new WeakMap();
    const selector = '#audit-ai-view table.sigma-audit-table, #audit-activity-view table.sigma-audit-table, #audit-auth-view table.sigma-audit-table, #audit-notifications-view table.sigma-audit-table, #settings-recovery-view table.sigma-audit-table';
    function scrollToPageStart(table) {
        if (!table) return;
        requestAnimationFrame(() => {
            if (!table.isConnected) return;
            const section = table.closest('.dynamic-section') || table;
            section.tabIndex = -1;
            section.focus({ preventScroll: true });
            for (let parent = table.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
                if (!/(auto|scroll)/.test(getComputedStyle(parent).overflowY) || parent.scrollHeight <= parent.clientHeight) continue;
                parent.scrollTo({ top: 0, behavior: 'instant' });
            }
            window.scrollTo({ top: 0, behavior: 'instant' });
        });
    }
    function attach(table) {
        if (!table) return null;
        if (controllers.has(table)) return controllers.get(table);
        if (!table.tBodies[0]) return null;
        const footer = document.createElement('nav'); footer.className = 'sigma-log-pagination'; footer.setAttribute('aria-label', 'Table pagination'); footer.hidden = true;
        table.after(footer);
        const owner = table.closest('.dynamic-section')?.id || 'logs';
        const storageKey = 'sigma-log-page:' + owner + ':' + (table.getAttribute('aria-label') || table.className);
        let page = 1;
        try { page = Math.max(1, Number(sessionStorage.getItem(storageKey)) || 1); } catch {}
        let pageSize = Number(table.dataset.pageSize) || 20;
        const body = table.tBodies[0];
        let rows = Array.from(body.rows), items = null, renderRow = null, searchText = null, query = '';
        let currentRows = new Map();
        let emptyRows = rows.filter(row => row.cells.length === 1);
        const observer = new MutationObserver(changes => {
            if (changes.some(change => change.target === body && change.type === 'childList')) {
                rows = Array.from(body.rows); items = null; currentRows.clear();
                emptyRows = rows.filter(row => row.cells.length === 1);
            }
            paint();
        });
        const observe = () => observer.observe(body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-log-search-match'] });
        function paint() {
            pageSize = Number(table.dataset.pageSize) || 20;
            const records = items ? query ? items.filter(item => String(searchText ? searchText(item) : JSON.stringify(item)).toLowerCase().includes(query)) : items
                : rows.filter(row => row.cells.length > 1 && row.dataset.logSearchMatch !== 'false' && (!query || row.textContent.toLowerCase().includes(query)));
            const pages = Math.max(1, Math.ceil(records.length / pageSize));
            page = Math.min(page, pages);
            const visible = records.slice((page - 1) * pageSize, page * pageSize);
            const nextRows = new Map();
            const nodes = visible.map(item => {
                const row = items ? currentRows.get(item) || renderRow(item) : item;
                row.hidden = false; nextRows.set(item, row); return row;
            });
            currentRows = nextRows;
            if (!records.length) {
                if (query) {
                    const row = document.createElement('tr'), cell = document.createElement('td');
                    row.dataset.auditSearchEmpty = 'true';
                    cell.colSpan = table.tHead?.rows[0]?.cells.length || 1;
                    row.className = 'sigma-log-empty-row';
                    const icons = {'audit-ai-view':'fa-robot', 'audit-activity-view':'fa-shoe-prints', 'audit-auth-view':'fa-right-to-bracket', 'audit-notifications-view':'fa-bell'};
                    cell.innerHTML = window.renderSigmaEmptyState({icon:'fa-solid ' + (icons[owner] || 'fa-folder-open'), title:'No matching logs', subtitle:'Try another search or clear your filters.'});
                    row.append(cell); nodes.push(row);
                } else nodes.push(...emptyRows);
            }
            // Disconnect while replacing the current page so our own writes do not reset the source.
            observer.disconnect();
            if (nodes.length !== body.rows.length || nodes.some((row, index) => body.rows[index] !== row)) body.replaceChildren(...nodes);
            observe();
            footer.replaceChildren(); footer.hidden = pages === 1 && !table.dataset.pageSizeOptions;
            try { sessionStorage.setItem(storageKey, String(page)); } catch {}
            if (footer.hidden) return;
            const count = document.createElement('span'); count.className = 'sigma-log-page-count text-black-fade';
            count.textContent = (records.length ? (page - 1) * pageSize + 1 : 0) + '-' + Math.min(page * pageSize, records.length) + ' of ' + records.length;
            const controls = document.createElement('div'); controls.className = 'sigma-log-page-controls';
            function button(label, target, icon = '') {
                const button = document.createElement('button'); button.type = 'button'; button.setAttribute('aria-label', label); button.title = label;
                button.className = 'sigma-pagination-btn ' + (icon ? 'sigma-pagination-btn--nav' : 'sigma-pagination-btn--number');
                if (icon) { const symbol = document.createElement('i'); symbol.className = 'fa-solid ' + icon; symbol.setAttribute('aria-hidden', 'true'); button.append(symbol); }
                else button.textContent = String(target);
                button.disabled = target < 1 || target > pages;
                if (!icon && target === page) { button.setAttribute('aria-current', 'page'); button.classList.add('is-active'); }
                button.onclick = () => {
                    if (target === page) return;
                    page = target; paint();
                    scrollToPageStart(table);
                };
                controls.append(button);
            }
            button('Previous page', page - 1, 'fa-chevron-left');
            const spread = innerWidth <= 600 ? 1 : 2;
            const numbers = [...new Set([1, ...Array.from({ length: spread * 2 + 1 }, (_, index) => page - spread + index).filter(number => number >= 1 && number <= pages), pages])].sort((a, b) => a - b);
            numbers.forEach((number, index) => {
                if (index && number > numbers[index - 1] + 1) { const gap = document.createElement('span'); gap.textContent = '...'; controls.append(gap); }
                button('Page ' + number, number);
            });
            button('Next page', page + 1, 'fa-chevron-right');
            if(table.dataset.pageSizeOptions){
                const group=document.createElement('div');group.style.cssText='display:flex;align-items:center;gap:16px';
                const label=document.createElement('label');label.textContent='Rows per page ';
                const size=document.createElement('select');size.setAttribute('aria-label','Rows per page');
                for(const value of table.dataset.pageSizeOptions.split(',')){const option=document.createElement('option');option.value=value;option.textContent=value;size.append(option);}
                size.value=String(pageSize);size.onchange=()=>{table.dataset.pageSize=size.value;page=1;paint();};
                label.append(size);group.append(count,label);footer.append(group,controls);
            }else footer.append(count, controls);
        }
        const controller = {
            refresh: paint,
            reset() { page = 1; paint(); },
            filter(term) { query = String(term || '').toLowerCase(); page = 1; paint(); },
            setRecords(records, factory, options = {}) {
                observer.disconnect();
                items = records; renderRow = factory; searchText = options.searchText;
                emptyRows = Array.from(body.rows).filter(row => row.cells.length === 1);
                currentRows.clear();
                if (options.reset) page = 1;
                paint();
            }
        };
        controllers.set(table, controller);
        paint(); return controller;
    }
    function scan() { document.querySelectorAll(selector).forEach(table => attach(table)?.refresh()); }
    window.SigmaLogPagination = {
        scrollToPageStart,
        refresh: table => attach(table)?.refresh(), reset: table => attach(table)?.reset(),
        filter: (table, query) => attach(table)?.filter(query),
        setRecords: (table, records, renderRow, options) => attach(table)?.setRecords(records, renderRow, options)
    };
    window.addEventListener('resize', scan);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan); else scan();
    new MutationObserver(records => {
        if (records.some(record => Array.from(record.addedNodes).some(node => node.nodeType === 1 && (node.matches('table') || node.querySelector('table'))))) scan();
    }).observe(document.documentElement, { childList: true, subtree: true });
})();
