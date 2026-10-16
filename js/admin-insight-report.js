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
    const tabs = el('div', undefined, 'insight-report-tabs ai-engine-tabs');
    tabs.setAttribute('role', 'tablist');
    for (const [id, title] of [['school', 'AI Analytics Overview'], ['users', 'User Insights']]) {
        const button = el('button', title, 'ai-engine-tab');
        button.type = 'button'; button.setAttribute('role', 'tab');
        button.onclick = () => { tab = id; render(); };
        button.dataset.tab = id; tabs.append(button);
    }
    const toolbar = el('div', undefined, 'insight-report-toolbar'); toolbar.append(tabs);
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
    function metricCard(label, value, iconClass) {
        const card = el('div', undefined, 'sigma-interactive-metric-card rounded-xl p-5 group flex items-center justify-between');
        const text = el('div', undefined, 'metric-text-content');
        
        const base = el('div', undefined, 'metric-text-base');
        base.append(
            el('span', label, "text-xs font-bold text-black tracking-normal block font-['Inter']"),
            el('span', String(value), "text-3xl md:text-[34px] font-extrabold text-slate-900 block mt-1.5 font-['Inter'] tracking-tight")
        );
        
        const spotlight = el('div', undefined, 'metric-text-spotlight');
        spotlight.setAttribute('aria-hidden', 'true');
        spotlight.append(
            el('span', label, "text-xs font-bold tracking-normal block font-['Inter']"),
            el('span', String(value), "text-3xl md:text-[34px] font-extrabold block mt-1.5 font-['Inter'] tracking-tight")
        );
        
        text.append(base, spotlight);

        const iconBox = el('div', undefined, 'metric-icon-box w-10 h-10 rounded-lg flex items-center justify-center text-base shrink-0');
        const glyphBase = el('i', undefined, iconClass + ' metric-icon-base');
        const glyphSpotlight = el('i', undefined, iconClass + ' metric-icon-spotlight');
        glyphSpotlight.setAttribute('aria-hidden', 'true');
        iconBox.append(glyphBase, glyphSpotlight);

        card.append(text, iconBox);
        return card;
    }
    const TYPE_CONFIGS = [
        {
            key: 'descriptive',
            title: 'Descriptive Analytics',
            question: 'What Happened?',
            badge: 'Historical Review',
            icon: 'fa-solid fa-chart-simple',
            meaning: 'Analyzes past assessment scores, quiz results, and activity completions to summarize what occurred in student learning.',
            triggers: [
                'Student quarterly exam & assessment score analysis',
                'Completed task & submission volume review',
                'Historical mastery & performance baseline summaries'
            ]
        },
        {
            key: 'predictive',
            title: 'Predictive Analytics',
            question: 'What Will Happen?',
            badge: 'Trend Forecast',
            icon: 'fa-solid fa-chart-line',
            meaning: 'Detects learning trajectories and risk patterns to forecast academic outcomes, GWA trends, and students likely needing support.',
            triggers: [
                'Grade trajectory & risk of failure projections',
                'Upcoming quarterly exam outcome estimation',
                'Early detection of at-risk student patterns'
            ]
        },
        {
            key: 'prescriptive',
            title: 'Prescriptive Analytics',
            question: 'What Should We Do?',
            badge: 'Recommended Action',
            icon: 'fa-solid fa-lightbulb',
            meaning: 'Formulates targeted interventions, remedial study directions, and concrete coaching steps for teachers and students.',
            triggers: [
                'Student Grades Insights modal ("Try: review...")',
                'Teacher Dashboard AI Intelligence intervention cards',
                'Targeted remedial practice & action checklists'
            ]
        }
    ];

    function createTypePlanCard(config, cards, users) {
        const totalCards = cards.length || 0;
        const matchingCards = cards.filter(card => 
            (card.analyses || []).some(a => String(a.category || '').toLowerCase().includes(config.key))
        );
        const count = matchingCards.length;
        const pct = totalCards > 0 ? Math.round((count / totalCards) * 100) : 0;

        const studentCount = users
            .filter(u => u.role === 'student')
            .flatMap(u => u.cards || [])
            .filter(card => (card.analyses || []).some(a => String(a.category || '').toLowerCase().includes(config.key))).length;

        const teacherCount = users
            .filter(u => u.role === 'teacher')
            .flatMap(u => u.cards || [])
            .filter(card => (card.analyses || []).some(a => String(a.category || '').toLowerCase().includes(config.key))).length;

        const card = el('div', undefined, 'insight-intact-card bg-white rounded-2xl border border-slate-200/90 shadow-sm flex flex-col overflow-hidden transition-all duration-200 hover:shadow-md hover:border-slate-300');
        card.innerHTML = `
            <!-- Top: Interactive Metric Counter Panel -->
            <div class="sigma-interactive-metric-card p-5 group flex items-center justify-between relative overflow-hidden" data-spotlight-bound="false">
                <div class="metric-text-content flex-1">
                    <div class="metric-text-base">
                        <span class="text-xs font-bold text-black tracking-normal block font-['Inter']">${config.title}</span>
                        <span class="text-[11px] font-medium text-black-fade italic font-['Inter'] mt-0.5 block">${config.question}</span>
                        <span class="text-3xl md:text-[34px] font-extrabold text-black block mt-2 font-['Inter'] tracking-tight">${count}</span>
                    </div>
                    <div class="metric-text-spotlight" aria-hidden="true">
                        <span class="text-xs font-bold tracking-normal block font-['Inter']">${config.title}</span>
                        <span class="text-[11px] font-medium italic font-['Inter'] mt-0.5 block">${config.question}</span>
                        <span class="text-3xl md:text-[34px] font-extrabold block mt-2 font-['Inter'] tracking-tight">${count}</span>
                    </div>
                </div>
                <div class="metric-icon-box w-10 h-10 rounded-lg flex items-center justify-center text-base shrink-0">
                    <i class="${config.icon} metric-icon-base"></i>
                    <i class="${config.icon} metric-icon-spotlight" aria-hidden="true"></i>
                </div>
            </div>

            <!-- Bottom: White Panel (Intact directly underneath) -->
            <div class="p-5 bg-white flex-1 flex flex-col justify-between space-y-4">
                <!-- Badge & Progress Bar Section -->
                <div>
                    <div class="flex items-center justify-between gap-3">
                        <span class="text-[11px] font-bold px-2.5 py-0.5 rounded-full font-['Inter']" style="background:rgba(21, 128, 61, 0.08); color:#15803d; border: 1px solid rgba(21, 128, 61, 0.25);">
                            ${config.badge}
                        </span>
                        <span class="text-[11px] font-bold text-black font-['Inter']">${pct}% of all</span>
                    </div>
                    <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden mt-2.5">
                        <div class="h-2 rounded-full transition-all duration-500" style="width: ${Math.max(pct, count > 0 ? 6 : 0)}%; background:#15803d;"></div>
                    </div>
                    <div class="flex items-center justify-between mt-1.5 text-[11px] font-['Inter']">
                        <span class="font-bold text-black">${count} of ${totalCards} total</span>
                        <span class="font-medium text-black-fade">Category share</span>
                    </div>
                </div>

                <!-- Importance & Purpose -->
                <div class="border-t border-slate-100 pt-3.5">
                    <div class="flex items-center gap-1.5 mb-1.5">
                        <i class="fa-solid fa-circle-info text-[#15803d] text-xs"></i>
                        <span class="text-[11px] font-bold text-black font-['Inter'] tracking-normal">Importance & Purpose</span>
                    </div>
                    <p class="text-[12.5px] text-black font-['Inter'] leading-relaxed">${config.meaning}</p>
                </div>

                <!-- Cards Per Role -->
                <div class="border-t border-slate-100 pt-3.5">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-[11px] font-bold text-black font-['Inter'] tracking-normal">Cards Per Role</span>
                        <span class="text-[11px] font-medium text-black-fade font-['Inter']">${count} total</span>
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                        <div class="bg-slate-50/90 border border-slate-200/90 rounded-xl p-2.5 flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <i class="fa-solid fa-user-graduate text-[#15803d] text-xs"></i>
                                <span class="text-xs font-bold text-black font-['Inter']">Students</span>
                            </div>
                            <span class="text-sm font-extrabold text-black font-['Inter']">${studentCount}</span>
                        </div>
                        <div class="bg-slate-50/90 border border-slate-200/90 rounded-xl p-2.5 flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <i class="fa-solid fa-chalkboard-user text-[#15803d] text-xs"></i>
                                <span class="text-xs font-bold text-black font-['Inter']">Teachers</span>
                            </div>
                            <span class="text-sm font-extrabold text-black font-['Inter']">${teacherCount}</span>
                        </div>
                    </div>
                </div>

                <!-- When AI Selects This Type -->
                <div class="border-t border-slate-100 pt-3.5">
                    <span class="text-[11px] font-bold text-black font-['Inter'] tracking-normal block mb-2">When AI Selects This Type</span>
                    <ul class="space-y-2">
                        ${config.triggers.map(t => `
                            <li class="flex items-start text-xs text-black font-['Inter']">
                                <i class="fa-solid fa-circle-check text-[#15803d] text-xs mt-0.5 mr-2 shrink-0"></i>
                                <span>${t}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            </div>
        `;
        return card;
    }

    function render() {
        for (const button of tabs.children) {
            const isSelected = button.dataset.tab === tab;
            button.setAttribute('aria-selected', String(isSelected));
            button.setAttribute('aria-pressed', String(isSelected));
        }
        filters.hidden = tab !== 'users'; content.replaceChildren();
        if (loading) { empty('Loading saved insights...'); return; }
        if (tab === 'school') {
            const cards = users.flatMap(user => user.cards || []);
            const metrics = el('div', undefined, 'grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6');
            for (const [label, value, icon] of [['Saved Insights', cards.length, 'fa-solid fa-brain'], ['Students with Insights', users.filter(user => user.role === 'student' && user.cards?.length > 0).length, 'fa-solid fa-user-graduate'], ['Teachers with Insights', users.filter(user => user.role === 'teacher' && user.cards?.length > 0).length, 'fa-solid fa-chalkboard-user']]) {
                metrics.append(metricCard(label, value, icon));
            }
            content.append(metrics, el('h3', 'AI Analytics Types', "text-sm font-bold text-black font-['Inter'] mt-6 mb-3"));
            
            const planGrid = el('div', undefined, 'insight-plan-grid');
            for (const config of TYPE_CONFIGS) {
                planGrid.append(createTypePlanCard(config, cards, users));
            }
            content.append(planGrid);

            if (!cards.length) empty('No saved AI insights available yet.');
            setTimeout(() => window.bindInteractiveMetricCards?.(), 10);
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
        loading = true; render();
        try {
            const result = await window.SigmaAiDatabase.loadInsightReport(); users = result.users || []; updatePicker();
            loading = false; render();
        } catch (error) {
            loading = false; content.replaceChildren(); empty(`Unable to load saved insights. ${error.message}`);
        }
    }
    const section = document.getElementById('reports-ai-view');
    new MutationObserver(() => { if (!section.classList.contains('hidden')) { load(); setTimeout(() => window.bindInteractiveMetricCards?.(), 30); } }).observe(section, {attributes: true, attributeFilter: ['class']});
    window.addEventListener('sigma:refresh-analytics-cards', () => { if (!section.classList.contains('hidden')) { load(); setTimeout(() => window.bindInteractiveMetricCards?.(), 30); } });
    render();
    if (!section.classList.contains('hidden')) load();
})();
