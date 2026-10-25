(function () {
    'use strict';
    if (window.SigmaTablePagination) return;
    const GROUP_SIZE = 10;
    const adminTables = /\/admin\.html$/i.test(location.pathname);
    const DEFAULT_PAGE_SIZE = 5;
    if (adminTables) document.documentElement.classList.add('sigma-admin-table-layout');
    function model(currentPage, totalPages) {
        const total = Math.max(1, Math.floor(Number(totalPages) || 1));
        const page = Math.max(1, Math.min(total, Math.floor(Number(currentPage) || 1)));
        const start = Math.floor((page - 1) / GROUP_SIZE) * GROUP_SIZE + 1;
        const end = Math.min(total, start + GROUP_SIZE - 1);
        return { page, total, start, end, numbers: Array.from({ length: end - start + 1 }, (_, index) => start + index),
            previous: Math.max(1, start - GROUP_SIZE), next: Math.min(total, start + GROUP_SIZE),
            hasPrevious: start > 1, hasNext: end < total };
    }
    function controlsHtml(currentPage, totalPages, extraClass = '') {
        const state = model(currentPage, totalPages);
        if (state.total <= 1) return '';
        const extra = String(extraClass).replace(/[^a-zA-Z0-9 _-]/g, '');
        const button = (label, page, icon, disabled = false) => `<button type="button" data-page="${page}" class="sigma-pagination-btn ${icon ? 'sigma-pagination-btn--nav' : 'sigma-pagination-btn--number'} ${extra} ${!icon && state.page === page ? 'is-active' : ''}" aria-label="${label}" title="${label}" ${disabled ? 'disabled' : ''} ${!icon && state.page === page ? 'aria-current="page"' : ''}>${icon ? `<i class="fa-solid ${icon}" aria-hidden="true"></i>` : page}</button>`;
        return `<div class="sigma-pagination-container sigma-group-pagination" role="group" aria-label="Pages ${state.start} to ${state.end} of ${state.total}">
            ${button('First page', 1, 'fa-angles-left', state.page === 1)}
            ${button('Previous 10 pages', state.previous, 'fa-chevron-left', !state.hasPrevious)}
            <div class="sigma-pagination-numbers">${state.numbers.map(page => button('Page ' + page, page, '')).join('')}</div>
            ${button('Next 10 pages', state.next, 'fa-chevron-right', !state.hasNext)}
            ${button('Last page', state.total, 'fa-angles-right', state.page === state.total)}
        </div>`;
    }
    function alignActive(container) {
        const strip = container.querySelector('.sigma-pagination-numbers');
        const active = strip?.querySelector('[aria-current="page"]');
        if (!strip || !active) return;
        strip.scrollLeft = Math.max(0, active.offsetLeft - strip.offsetLeft - (strip.clientWidth - active.offsetWidth) / 2);
    }
    function mount(container, currentPage, totalPages, onChange) {
        container.innerHTML = controlsHtml(currentPage, totalPages);
        container.querySelectorAll('button[data-page]').forEach(button => button.onclick = () => {
            if (!button.disabled && Number(button.dataset.page) !== model(currentPage, totalPages).page) onChange(Number(button.dataset.page));
        });
        requestAnimationFrame(() => { if (container.isConnected) alignActive(container); });
    }
    function render(containerId, totalItems, state, onChange) {
        const container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
        if (!container) return;
        const wrapper = container.closest('.border-t') || container;
        const total = Math.ceil(Math.max(0, Number(totalItems) || 0) / Math.max(1, Number(state?.itemsPerPage) || DEFAULT_PAGE_SIZE));
        if (!totalItems) { container.replaceChildren(); wrapper.style.display = 'none'; return; }
        wrapper.style.display = '';
        mount(container, state?.currentPage || 1, total, page => {
            const handler = typeof onChange === 'function' ? onChange : window[onChange];
            if (typeof handler === 'function') handler(page);
        });
        {
            container.classList.add('sigma-pagination-row');
            const count = document.createElement('span');
            count.className = 'sigma-table-list-count';
            const size = Math.max(1, Number(state?.itemsPerPage) || DEFAULT_PAGE_SIZE);
            const page = model(state?.currentPage || 1, total).page;
            count.textContent = `${(page - 1) * size + 1}-${Math.min(page * size, totalItems)} of ${totalItems}`;
            const settings = document.createElement('div');
            settings.className = 'sigma-pagination-settings';
            settings.append(pageSizeControl(size, value => {
                state.itemsPerPage = value;
                state.onPageSizeChange?.(value);
                state.currentPage = 1;
                const handler = typeof onChange === 'function' ? onChange : window[onChange];
                if (typeof handler === 'function') handler(1);
            }), count);
            container.append(settings);
        }
    }
    let activePageSizeMenu = null;
    function positionPageSizeMenu() {
        const active = activePageSizeMenu;
        if (!active) return;
        if (!active.dropdown.isConnected || !active.dropdown.open) { closePageSizeMenu(); return; }
        const {trigger,menu} = active, rect = trigger.getBoundingClientRect();
        const viewport = window.visualViewport;
        const leftEdge = viewport?.offsetLeft || 0, topEdge = viewport?.offsetTop || 0;
        const rightEdge = leftEdge + (viewport?.width || innerWidth), bottomEdge = topEdge + (viewport?.height || innerHeight);
        const width = Math.max(80,rect.width), height = Math.min(180,bottomEdge-topEdge-16);
        menu.style.setProperty('width',`${width}px`,'important');
        menu.style.setProperty('max-height',`${height}px`,'important');
        const measured = menu.getBoundingClientRect().height;
        const top = bottomEdge-rect.bottom >= measured+12 ? rect.bottom+4 : Math.max(topEdge+8,rect.top-measured-4);
        menu.style.setProperty('left',`${Math.max(leftEdge+8,Math.min(rect.right-width,rightEdge-width-8))}px`,'important');
        menu.style.setProperty('top',`${top}px`,'important');
    }
    function closePageSizeMenu() {
        const active=activePageSizeMenu;if(!active)return;activePageSizeMenu=null;
        if(typeof active.menu.hidePopover==='function'&&active.menu.matches(':popover-open'))active.menu.hidePopover();
        if(active.menu.parentElement!==active.dropdown)active.dropdown.append(active.menu);
        active.dropdown.open=false;
    }
    function pageSizeControl(size, onChange) {
        const label = document.createElement('div');
        label.className = 'sigma-page-size';
        const text = document.createElement('span'); text.textContent = 'Rows per page:';
        const dropdown = document.createElement('details');
        dropdown.className = 'sigma-quarter-dropdown sigma-page-size-dropdown';
        const trigger = document.createElement('summary');
        trigger.setAttribute('aria-label', 'Rows per page');
        const valueText = document.createElement('span'); valueText.textContent = String(size);
        const icon = document.createElement('i'); icon.className = 'fa-solid fa-chevron-down'; icon.setAttribute('aria-hidden','true');
        trigger.append(valueText, icon);
        const menu = document.createElement('div'); menu.className = 'sigma-quarter-dropdown-menu sigma-page-size-menu';
        if(typeof menu.showPopover==='function')menu.setAttribute('popover','manual');
        [5,10,20].forEach(value => {
            const option = document.createElement('button'); option.type = 'button'; option.textContent = String(value);
            option.setAttribute('aria-pressed', String(value === size));
            option.onclick = () => { closePageSizeMenu(); onChange(value); };
            menu.append(option);
        });
        dropdown.append(trigger,menu); label.append(text,dropdown);
        dropdown.addEventListener('toggle',()=>{
            if(!dropdown.open){if(activePageSizeMenu?.dropdown===dropdown)closePageSizeMenu();return;}
            if(activePageSizeMenu?.dropdown===dropdown){positionPageSizeMenu();return;}
            closePageSizeMenu();activePageSizeMenu={dropdown,trigger,menu};
            if(typeof menu.showPopover==='function')menu.showPopover();else document.body.append(menu);
            positionPageSizeMenu();
        });
        dropdown.addEventListener('keydown',event=>{if(event.key==='Escape'){closePageSizeMenu();trigger.focus();}});
        return label;
    }
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&activePageSizeMenu){const trigger=activePageSizeMenu.trigger;closePageSizeMenu();trigger.focus();}});
    window.addEventListener('resize',positionPageSizeMenu);
    document.addEventListener('scroll',positionPageSizeMenu,true);
    window.visualViewport?.addEventListener('resize',positionPageSizeMenu);
    window.visualViewport?.addEventListener('scroll',positionPageSizeMenu);
    document.addEventListener('pointerdown',event=>{
        if(activePageSizeMenu&&!activePageSizeMenu.dropdown.contains(event.target)&&!activePageSizeMenu.menu.contains(event.target))closePageSizeMenu();
        document.querySelectorAll('.sigma-page-size-dropdown[open]').forEach(dropdown=>{if(!dropdown.contains(event.target))dropdown.open=false;});
    });
    // Read-only lists opt in explicitly. Keep all rows in the DOM for exports and full-list calculations.
    const tables = new WeakMap();
    function attach(table) {
        if (!table?.tBodies[0] || tables.has(table)) return;
        let page = 1;
        const footer = document.createElement('nav');
        footer.className = 'sigma-table-list-pagination';
        footer.setAttribute('aria-label', 'Table pagination');
        const wrap = table.closest('.attendance-record-table, .teacher-grades-modal-table, .record-table-scroll');
        const cards = table.closest('.record-main')?.querySelector('.record-mobile-grade-cards');
        (wrap || table).before(footer);
        function paint() {
            const all = Array.from(table.tBodies[0].rows);
            const rows = all.filter(row => row.cells.length > 1 && row.style.display !== 'none' && row.dataset.logSearchMatch !== 'false');
            const size = Math.max(1, Number(table.dataset.pageSize) || DEFAULT_PAGE_SIZE);
            const total = Math.max(1, Math.ceil(rows.length / size));
            page = model(page, total).page;
            all.forEach(row => { row.hidden = false; });
            rows.forEach((row, index) => { row.hidden = index < (page - 1) * size || index >= page * size; });
            cards?.querySelectorAll('.record-mobile-grade-card').forEach((card, index) => { card.hidden = Boolean(all[index]?.hidden); });
            footer.hidden = rows.length === 0;
            if (footer.hidden) { footer.replaceChildren(); return; }
            const count = document.createElement('span'); count.className = 'sigma-table-list-count';
            count.textContent = `${(page - 1) * size + 1}-${Math.min(page * size, rows.length)} of ${rows.length}`;
            const controls = document.createElement('div'); controls.className = 'sigma-table-list-controls';
            mount(controls, page, total, target => {
                page = target; paint();
                if (adminTables && window.SigmaLogPagination) window.SigmaLogPagination.scrollToPageStart(table);
                else table.scrollIntoView({ block: 'start', behavior: 'instant' });
            });
            {
                const settings = document.createElement('div'); settings.className = 'sigma-pagination-settings';
                settings.append(pageSizeControl(size, value => { table.dataset.pageSize = String(value); page = 1; paint(); }), count);
                footer.replaceChildren(controls, settings);
            }
        }
        const observer = new MutationObserver(changes => {
            if (changes.some(change => change.type === 'attributes')) page = 1;
            const selected = table.querySelector('#student-attendance-row-selected');
            if (selected && changes.some(change => change.type === 'childList' && change.target === table.tBodies[0])) {
                const index = Array.from(table.tBodies[0].rows).indexOf(selected);
                page = Math.floor(index / (Number(table.dataset.pageSize) || DEFAULT_PAGE_SIZE)) + 1;
            }
            paint();
        });
        observer.observe(table.tBodies[0], { childList:true, subtree:true, attributes:true, attributeFilter:['style','data-log-search-match'] });
        tables.set(table, { paint, observer });
        paint();
    }
    const tableSelector = adminTables ? 'table[data-sigma-paginate], #resources-view table' : 'table[data-sigma-paginate]';
    function scan() {
        document.querySelectorAll(tableSelector).forEach(attach);
        document.querySelectorAll('.sigma-page-size select[aria-label="Rows per page"]').forEach(select=>{
            const label=select.closest('.sigma-page-size');
            label.replaceWith(pageSizeControl(Number(select.value),value=>{select.value=String(value);select.dispatchEvent(new Event('change',{bubbles:true}));}));
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan); else scan();
    new MutationObserver(changes => {
        if (changes.some(change => Array.from(change.addedNodes).some(node => node.nodeType === 1 && (node.matches(tableSelector+',.sigma-page-size') || node.querySelector(tableSelector+',.sigma-page-size'))))) scan();
    }).observe(document.documentElement, { childList:true, subtree:true });
    window.SigmaTablePagination = { model, controlsHtml, mount, render, alignActive, attach, pageSizeControl, groupSize: GROUP_SIZE };
    window.renderPaginationControls = render;
})();
