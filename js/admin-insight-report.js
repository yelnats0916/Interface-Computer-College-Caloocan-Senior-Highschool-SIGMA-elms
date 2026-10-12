(function () {
    'use strict';
    const host = document.getElementById('ai-insight-report');
    if (!host) return;
    let users = [], tab = 'school', selected = '', role = '', query = '', loading = false;
    const el = (tag, text, className) => {
        const node = document.createElement(tag);
        if (text !== undefined) node.textContent = text;
        if (className) node.className = className;
        return node;
    };
    const tabs = el('div', undefined, 'insight-report-tabs');
    tabs.setAttribute('role', 'tablist');
    for (const [id, title] of [['school', 'School Overview'], ['users', 'User Insights']]) {
        const button = el('button', title);
        button.type = 'button'; button.setAttribute('role', 'tab');
        button.onclick = () => { tab = id; render(); };
        button.dataset.tab = id; tabs.append(button);
    }
    const refresh = el('button', undefined, 'insight-report-refresh');
    refresh.type = 'button'; refresh.title = 'Refresh saved insights'; refresh.setAttribute('aria-label', refresh.title);
    const icon = el('i'); icon.className = 'fa-solid fa-rotate-right'; refresh.append(icon);
    refresh.onclick = () => load();
    const toolbar = el('div', undefined, 'insight-report-toolbar'); toolbar.append(tabs, refresh);
    const filters = el('div', undefined, 'insight-report-filters');
    const search = el('input'); search.type = 'search'; search.placeholder = 'Search users'; search.setAttribute('aria-label', 'Search users'); search.maxLength = 100;
    const roles = el('select'); roles.setAttribute('aria-label', 'Filter by role');
    for (const [value, title] of [['', 'All Roles'], ['student', 'Students'], ['teacher', 'Teachers']]) {
        const option = el('option', title); option.value = value; roles.append(option);
    }
    const picker = el('select'); picker.setAttribute('aria-label', 'Select user');
    filters.append(search, roles, picker);
    const content = el('div'); host.append(toolbar, filters, content);
    const matching = () => users.filter(user => (!role || user.role === role) && `${user.name} ${user.id}`.toLowerCase().includes(query));
    function updatePicker() {
        const matches = matching();
        if (!matches.some(user => user.id === selected)) selected = matches[0]?.id || '';
        picker.replaceChildren();
        if (!matches.length) picker.append(el('option', 'No matching users'));
        for (const user of matches) {
            const option = el('option', `${user.name} (${user.role})`); option.value = user.id; picker.append(option);
        }
        picker.value = selected; picker.disabled = !matches.length;
    }
    search.oninput = () => { query = search.value.trim().toLowerCase(); updatePicker(); render(); };
    roles.onchange = () => { role = roles.value; updatePicker(); render(); };
    picker.onchange = () => { selected = picker.value; render(); };
    function empty(message) { content.append(el('p', message, 'insight-report-empty')); }
    function render() {
        for (const button of tabs.children) button.setAttribute('aria-selected', String(button.dataset.tab === tab));
        filters.hidden = tab !== 'users'; content.replaceChildren();
        if (loading) { empty('Loading saved insights...'); return; }
        if (tab === 'school') {
            const cards = users.flatMap(user => user.cards || []);
            const metrics = el('div', undefined, 'insight-report-metrics');
            for (const [label, value] of [['Students', users.filter(user => user.role === 'student').length], ['Teachers', users.filter(user => user.role === 'teacher').length], ['Saved Insight Cards', cards.length]]) {
                const item = el('div'); item.append(el('strong', String(value)), el('span', label)); metrics.append(item);
            }
            content.append(metrics, el('h2', 'Saved Insights by Type'));
            const categories = el('div', undefined, 'insight-report-metrics');
            for (const category of ['descriptive', 'predictive', 'prescriptive']) {
                const count = cards.filter(card => (card.analyses || []).some(analysis => String(analysis.category).toLowerCase().includes(category))).length;
                const item = el('div'); item.append(el('strong', String(count)), el('span', category[0].toUpperCase() + category.slice(1))); categories.append(item);
            }
            content.append(categories);
            empty(cards.length ? 'Select User Insights to review saved cards by account.' : 'No saved AI insights available yet.');
            return;
        }
        const user = users.find(item => item.id === selected);
        if (!user) { empty('No matching users.'); return; }
        content.append(el('h2', user.name), el('p', `${user.role === 'teacher' ? 'Teacher' : 'Student'} - ${user.id}`, 'insight-report-owner'));
        if (!user.cards?.length) { empty('No saved AI insights for this user yet.'); return; }
        const grid = el('div', undefined, 'insight-report-grid');
        for (const card of [...user.cards].reverse()) {
            const article = el('article', undefined, 'insight-report-card');
            const heading = el('header'); const bolt = el('i'); bolt.className = 'fa-solid fa-bolt'; heading.append(bolt, el('h3', card.title || 'AI Insight')); article.append(heading);
            const body = el('div', undefined, 'insight-report-card-body');
            for (const analysis of card.analyses || []) {
                if (analysis.context) body.append(el('p', analysis.context));
                if (analysis.actionLabel) body.append(el('strong', analysis.actionLabel));
                if (analysis.text) body.append(el('p', analysis.text));
            }
            const date = card.createdAt || card.timestamp || user.lastAnalyzed;
            const parsed = date ? new Date(date) : null;
            body.append(el('small', [card.area, parsed && !Number.isNaN(parsed.getTime()) ? `${card.createdAt || card.timestamp ? 'Generated' : 'Last analysis'}: ${parsed.toLocaleString('en-PH', {timeZone: 'Asia/Manila'})}` : ''].filter(Boolean).join(' - ')));
            article.append(body);
            if (window.renderSigmaReadOnlyInsightCard) {
                grid.append(window.renderSigmaReadOnlyInsightCard({
                    id: '', datePlacement: 'footer', categoryIcon: 'fa-bolt',
                    concernTitle: heading.querySelector('h3').innerHTML,
                    concernText: body.innerHTML, previewText: body.innerHTML, date: ''
                }));
            } else grid.append(article);
        }
        content.append(grid);
    }
    async function load() {
        if (loading) return;
        loading = true; refresh.disabled = true; render();
        try {
            const result = await window.SigmaAiDatabase.loadInsightReport(); users = result.users || []; updatePicker();
            loading = false; render();
        } catch (error) {
            loading = false; content.replaceChildren(); empty(`Unable to load saved insights. ${error.message}`);
        } finally { refresh.disabled = false; }
    }
    const section = document.getElementById('reports-ai-view');
    new MutationObserver(() => { if (!section.classList.contains('hidden')) load(); }).observe(section, {attributes: true, attributeFilter: ['class']});
    window.addEventListener('sigma:refresh-analytics-cards', () => { if (!section.classList.contains('hidden')) load(); });
    render();
    if (!section.classList.contains('hidden')) load();
})();
