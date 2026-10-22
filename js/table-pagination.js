(function () {
    'use strict';
    if (window.SigmaTablePagination) return;
    const GROUP_SIZE = 10;
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
        const total = Math.ceil(Math.max(0, Number(totalItems) || 0) / Math.max(1, Number(state?.itemsPerPage) || 20));
        if (total <= 1) { container.replaceChildren(); wrapper.style.display = 'none'; return; }
        wrapper.style.display = '';
        mount(container, state?.currentPage || 1, total, page => {
            const handler = typeof onChange === 'function' ? onChange : window[onChange];
            if (typeof handler === 'function') handler(page);
        });
    }
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
        (cards || wrap || table).after(footer);
        function paint() {
            const all = Array.from(table.tBodies[0].rows);
            const rows = all.filter(row => row.cells.length > 1 && row.style.display !== 'none' && row.dataset.logSearchMatch !== 'false');
            const size = Math.max(1, Number(table.dataset.pageSize) || 20);
            const total = Math.max(1, Math.ceil(rows.length / size));
            page = model(page, total).page;
            all.forEach(row => { row.hidden = false; });
            rows.forEach((row, index) => { row.hidden = index < (page - 1) * size || index >= page * size; });
            cards?.querySelectorAll('.record-mobile-grade-card').forEach((card, index) => { card.hidden = Boolean(all[index]?.hidden); });
            footer.hidden = total <= 1;
            if (footer.hidden) { footer.replaceChildren(); return; }
            const count = document.createElement('span'); count.className = 'sigma-table-list-count';
            count.textContent = `${(page - 1) * size + 1}–${Math.min(page * size, rows.length)} of ${rows.length}`;
            const controls = document.createElement('div'); controls.className = 'sigma-table-list-controls';
            mount(controls, page, total, target => { page = target; paint(); table.scrollIntoView({ block: 'start', behavior: 'instant' }); });
            footer.replaceChildren(count, controls);
        }
        const observer = new MutationObserver(changes => {
            if (changes.some(change => change.type === 'attributes')) page = 1;
            const selected = table.querySelector('#student-attendance-row-selected');
            if (selected && changes.some(change => change.type === 'childList' && change.target === table.tBodies[0])) {
                const index = Array.from(table.tBodies[0].rows).indexOf(selected);
                page = Math.floor(index / (Number(table.dataset.pageSize) || 20)) + 1;
            }
            paint();
        });
        observer.observe(table.tBodies[0], { childList:true, subtree:true, attributes:true, attributeFilter:['style','data-log-search-match'] });
        tables.set(table, { paint, observer });
        paint();
    }
    function scan() { document.querySelectorAll('table[data-sigma-paginate]').forEach(attach); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan); else scan();
    new MutationObserver(changes => {
        if (changes.some(change => Array.from(change.addedNodes).some(node => node.nodeType === 1 && (node.matches('table[data-sigma-paginate]') || node.querySelector('table[data-sigma-paginate]'))))) scan();
    }).observe(document.documentElement, { childList:true, subtree:true });
    window.SigmaTablePagination = { model, controlsHtml, mount, render, alignActive, attach, groupSize: GROUP_SIZE };
    window.renderPaginationControls = render;
})();
