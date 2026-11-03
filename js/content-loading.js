/* Content-only busy feedback. Does not replace the initial page shimmer. */
(function () {
    'use strict';
    if (window.SigmaContentLoading) return;
    const states = new WeakMap();
    const sizes = new ResizeObserver(entries => entries.forEach(({target, contentRect}) => {
        const state = states.get(target);
        if (state) state.spinner.style.setProperty('--sigma-loader-size', `${Math.round(Math.max(20, Math.min(64, Math.min(contentRect.width, contentRect.height) * .18)))}px`);
    }));
    function show(content) {
        if (!content) return () => {};
        const previous = states.get(content);
        if (previous) { previous.count++; let released = false; return () => { if (!released) { released = true; previous.release(); } }; }
        const busy = content.getAttribute('aria-busy');
        const hadHost = content.classList.contains('sigma-content-loading-host');
        const overlay = document.createElement('div');
        overlay.className = 'sigma-content-loading-overlay';
        overlay.setAttribute('role', 'status');
        overlay.setAttribute('aria-label', 'Loading');
        const spinner = document.createElement('span');
        spinner.className = 'sigma-dot-spinner';
        spinner.setAttribute('aria-hidden', 'true');
        overlay.appendChild(spinner);
        content.classList.add('sigma-content-loading-host');
        content.setAttribute('aria-busy', 'true');
        content.appendChild(overlay);
        const state = {spinner, overlay, count:1};
        const clear = () => {
            if (states.get(content)?.overlay !== overlay) return;
            if (--state.count > 0) return;
            sizes.unobserve(content);
            overlay.remove();
            if (!hadHost) content.classList.remove('sigma-content-loading-host');
            if (busy === null) content.removeAttribute('aria-busy');
            else content.setAttribute('aria-busy', busy);
            states.delete(content);
        };
        state.release = clear;
        states.set(content, state);
        sizes.observe(content);
        let released = false;
        return () => { if (!released) { released = true; clear(); } };
    }
    // Existing asynchronous panels already render loading icons inside their
    // content regions. Size those icons from that region; keep button icons inline.
    const iconSelector = 'i.fa-spinner.fa-spin,i.fa-circle-notch.fa-spin,[data-sigma-auto-spinner]';
    const iconRegions = new Set();
    const iconSizes = new ResizeObserver(entries => entries.forEach(({target, contentRect}) => {
        target.querySelectorAll(iconSelector).forEach(icon => {
            const page = target.hasAttribute('data-sigma-loading-page');
            const minimum = page ? (contentRect.width >= 768 ? 56 : 36) : 20;
            if (!icon.closest('button,[role="button"]')) icon.style.setProperty('--sigma-loader-size', `${Math.round(Math.max(minimum, Math.min(page ? 64 : 48, Math.min(contentRect.width, contentRect.height) * .18)))}px`);
        });
        if (!target.querySelector(iconSelector)) { iconSizes.unobserve(target); iconRegions.delete(target); }
    }));
    function watch(node) {
        if (node.nodeType !== 1) return;
        const icons = node.matches(iconSelector) ? [node] : node.querySelectorAll(iconSelector);
        icons.forEach(icon => {
            if (icon.closest('button,[role="button"]')) return;
            const region = icon.closest('[role="status"], [aria-busy="true"]') || icon.parentElement;
            if (region) { iconRegions.add(region); iconSizes.observe(region); }
        });
    }
    new MutationObserver(records => {
        if (records.some(record => record.removedNodes?.length)) iconRegions.forEach(region => { if (!region.isConnected) { iconSizes.unobserve(region); iconRegions.delete(region); } });
        records.forEach(record => {
        // Body/sidebar class changes are frequent. ResizeObserver already handles
        // layout changes; do not scan thousands of descendants on each class toggle.
        if (record.type === 'attributes') { if (record.target.matches(iconSelector)) watch(record.target); }
        else record.addedNodes.forEach(watch);
        });
    }).observe(document.documentElement, {childList:true, subtree:true, attributes:true, attributeFilter:['class']});
    document.addEventListener('DOMContentLoaded', () => watch(document.body), {once:true});
    function html(options = {}) {
        const mode = options.page ? ' sigma-content-loading-state--page' : options.inline ? ' sigma-content-loading-state--inline' : options.compact ? ' sigma-content-loading-state--compact' : '';
        const label = String(options.label || 'Loading').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
        return `<span class="sigma-content-loading-state${mode}" role="status" aria-live="polite" aria-busy="true" aria-label="${label}" ${options.page ? 'data-sigma-loading-page' : ''}>
            <span class="sigma-dot-spinner" data-sigma-auto-spinner aria-hidden="true"></span>
        </span>`;
    }
    function render(content, options) {
        if (!content) return;
        content.innerHTML = html(options);
    }
    const tableReads = new Map();
    const retrievedTables = new WeakSet();
    const retrievedTableIds = new Set();
    function beginDataRead(input) {
        const target = new URL(typeof input === 'string' || input instanceof URL ? input : input.url, location.href);
        const endpoint = target.pathname.split('/').pop().replace('.php', '');
        const selectors = {
            users: '#userTableBody', sections: '#sectionTableBody, #student-roster-body',
            school_years: '#schoolYearTableBody',
            ai_logs: '#audit-ai-view tbody',
            ai_records: target.searchParams.get('action') === 'logs' ? '#audit-ai-view tbody' : '',
            activity_logs: '#activity-log-rows', authentication_logs: '#audit-auth-view tbody',
            notifications: '#notification-log-rows', notification_logs: '#notification-log-rows',
            academic_records: '#gradebook-body, #performanceReportTableBody',
            attendance: '#student-attendance-history-body, #classroom-attendance-history-body, #attendanceReportTableBody',
            maintenance: '#maintenance-history-body'
        };
        const selector = selectors[endpoint];
        if (!selector) return () => {};
        const tracked = new Set();
        function attachTables() {
        // A table belongs only to its own data request. Unrelated dashboard,
        // notification and background reads must never hold its rows behind a loader.
        const bodies = document.querySelectorAll(selector);
        bodies.forEach(body => {
            if (tracked.has(body)) return;
            let state = tableReads.get(body);
            const key = body.id ? `${endpoint}:${body.id}` : '';
            if (!state && (retrievedTables.has(body) || (key && retrievedTableIds.has(key)))) return;
            if (!state) {
                const table = body.closest('table');
                const columns = Math.max(1, ...Array.from(table?.querySelectorAll('thead tr') || [], row => Array.from(row.cells).reduce((sum, cell) => sum + cell.colSpan, 0)));
                const row = document.createElement('tr');
                row.className = 'sigma-table-loading-row';
                const cell = document.createElement('td');
                cell.colSpan = columns;
                cell.innerHTML = html();
                const scroller = table?.parentElement;
                cell.firstElementChild.style.setProperty('--sigma-table-loader-width', `${Math.min(scroller?.clientWidth || window.innerWidth, window.innerWidth)}px`);
                row.append(cell);
                const emptyId = {
                    'classroom-attendance-history-body': 'classroom-attendance-empty-state',
                    'student-attendance-history-body': 'student-attendance-empty-state'
                }[body.id];
                const empty = emptyId ? document.getElementById(emptyId) : null;
                empty?.setAttribute('data-sigma-table-pending', '');
                state = { count: 0, row, empty, saved: Array.from(body.childNodes), key };
                body.replaceChildren(row);
                body.setAttribute('aria-busy', 'true');
                state.observer = new MutationObserver(() => {
                    if (!body.contains(row)) {
                        state.saved = Array.from(body.childNodes);
                        body.replaceChildren(row);
                    }
                });
                state.observer.observe(body, { childList: true });
                tableReads.set(body, state);
            }
            state.count++;
            tracked.add(body);
        });
        }
        attachTables();
        const additions = new MutationObserver(records => {
            if (records.some(record => Array.from(record.addedNodes).some(node => node.nodeType === 1 && (node.matches('tbody') || node.querySelector('tbody'))))) attachTables();
        });
        additions.observe(document.documentElement, {childList: true, subtree: true});
        return () => {
        additions.disconnect();
        tracked.forEach(body => {
            const state = tableReads.get(body);
            if (!state || --state.count) return;
            state.observer.disconnect();
            if (body.contains(state.row)) body.replaceChildren(...state.saved);
            body.removeAttribute('aria-busy');
            state.empty?.removeAttribute('data-sigma-table-pending');
            retrievedTables.add(body);
            if (state.key) retrievedTableIds.add(state.key);
            tableReads.delete(body);
        });
        };
    }
    window.SigmaContentLoading = {show, html, render, beginDataRead};
})();
/* Share the same standalone dots across existing asynchronous action buttons. */
(function () {
    'use strict';
    const active = new Map();
    const selector = 'button,[role="button"],input[type="submit"]';
    const icons = '.sigma-dot-spinner,i.fa-spinner.fa-spin,i.fa-circle-notch.fa-spin,[data-sigma-auto-spinner]';
    function busy(button) {
        if (button.getAttribute('aria-busy') === 'true' || button.classList.contains('is-loading') || button.classList.contains('loading')) return true;
        if (button.disabled && /\b(saving|creating|submitting|downloading|uploading|posting|converting|verifying|processing|generating|sending|deleting|restoring|publishing|deploying)\s*(\.{0,3}|\u2026)$/i.test(button.textContent.trim())) return true;
        return [...button.querySelectorAll(icons)].some(icon => {
            for (let node = icon; node && node !== button; node = node.parentElement) {
                if (node.hidden || node.classList.contains('hidden') || getComputedStyle(node).display === 'none') return false;
            }
            return true;
        });
    }
    function actionTarget(button) {
        // Save segments and their menu actions share one loading state.
        return button.closest('#subject-split-btn-group,#section-split-btn-group,#export-quiz-dropdown-wrap') || button;
    }
    function restore(button, state) {
        state.loader.remove();
        if (state.display) button.style.setProperty('display', state.display, state.priority);
        else button.style.removeProperty('display');
        active.delete(button);
    }
    function update(button) {
        if (!button?.matches?.(selector)) return;
        button = actionTarget(button);
        const state = active.get(button);
        const actions = button.matches(selector) ? [button] : [...button.querySelectorAll(selector)];
        if (!button.isConnected) { if (state) restore(button, state); return; }
        if (!actions.some(busy)) { if (state) restore(button, state); return; }
        if (state || button.hidden || getComputedStyle(button).display === 'none') return;
        const rect = button.getBoundingClientRect();
        const loader = document.createElement('span');
        loader.className = 'sigma-action-loading';
        loader.setAttribute('role', 'status');
        loader.setAttribute('aria-label', 'Processing');
        const layout = getComputedStyle(button);
        for (const property of ['order','align-self','justify-self','grid-area','margin-left','margin-right','margin-top','margin-bottom','position','top','right','bottom','left','z-index']) loader.style.setProperty(property, layout.getPropertyValue(property));
        loader.style.flex = layout.flexGrow !== '0' ? layout.flex : '0 1 auto';
        loader.style.width = `${Math.max(40, rect.width)}px`;
        loader.style.height = `${Math.max(32, rect.height)}px`;
        loader.innerHTML = '<span class="sigma-dot-spinner" aria-hidden="true"></span>';
        active.set(button, {loader, display:button.style.getPropertyValue('display'), priority:button.style.getPropertyPriority('display')});
        button.before(loader);
        button.style.setProperty('display', 'none', 'important');
    }
    const scan = node => {
        if (node.nodeType !== 1) node = node.parentElement;
        if (!node) return;
        update(node.closest(selector));
        node.querySelectorAll?.(selector).forEach(update);
    };
    new MutationObserver(records => {
        for (const [button, state] of active) if (!button.isConnected) restore(button, state);
        // A changed ancestor (often body) must not rescan every action on the page.
        // Only new subtrees and the action containing the changed node need inspection.
        const changed = new Set();
        for (const record of records) {
            const node = record.target.nodeType === 1 ? record.target : record.target.parentElement;
            const button = node?.closest(selector);
            if (button) changed.add(button);
            if (record.type === 'childList') record.addedNodes.forEach(scan);
            else if (node?.matches('#subject-split-btn-group,#section-split-btn-group,#export-quiz-dropdown-wrap')) {
                node.querySelectorAll(selector).forEach(button => changed.add(button));
            }
        }
        changed.forEach(update);
    }).observe(document.documentElement, {subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','style','aria-busy','disabled','hidden']});
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => scan(document.body), {once:true});
    else scan(document.body);
})();
