(function () {
    'use strict';

    const schoolHost = document.getElementById('ai-insight-report');
    const generatesHost = document.getElementById('ai-generates-user-insights');
    if (!schoolHost && !generatesHost) return;

    let cachedUsers = [];
    let isLoading = false;
    let hasLoadedUsers = false;
    let selectedUserId = '';
    let searchQuery = '';
    let selectedRole = '';
    let insightPages = {};
    let directoryPage = 1;
    const railDisplayCounts = new Map();
    let editingCards = false;
    let editingGradeInsights = false;
    let editingOwner = '';
    let managementBusy = false;
    const selectedCards = new Set();
    const selectedGradeInsights = new Set();
    const insightKey = card => `${card.sourceType}:${card.sourceId}`;
    const canManageInsights = () => location.pathname.toLowerCase().includes('admin');
    const isDashboardCard = card => card?.sourceType === 'dashboard' || insightCategory(card) === 'analytics';
    const selectionFor = card => isDashboardCard(card) ? selectedCards : selectedGradeInsights;
    const editingFor = card => isDashboardCard(card) ? editingCards : editingGradeInsights;
    function managedInsight(node, card) {
        const wrapper = el('div', undefined, 'insight-managed-card');
        wrapper.classList.toggle('is-hidden-insight', Boolean(card.hidden));
        if (card.hidden) wrapper.append(el('span', 'Removed from user view', 'insight-hidden-label'));
        if (editingFor(card) && card.sourceType && card.sourceId) {
            const label = el('label', undefined, 'insight-selection');
            const checkbox = el('input'); checkbox.type = 'checkbox';
            checkbox.checked = selectionFor(card).has(insightKey(card));
            checkbox.setAttribute('aria-label', `Select ${card.title || 'insight'}`);
            checkbox.disabled = managementBusy;
            label.append(checkbox);
            label.addEventListener('click', event => event.stopPropagation());
            checkbox.onchange = () => {
                const selection = selectionFor(card);
                if (checkbox.checked) selection.add(insightKey(card)); else selection.delete(insightKey(card));
                updateInsightManagement();
            };
            const panelTimestamp = node.querySelector?.('.insight-user-panel-date, .sigma-ai-generation-time');
            const cardTimestamp = node.querySelector?.('.sigma-card-date');
            if (panelTimestamp) {
                const footer = el('div', undefined, 'insight-selection-footer');
                panelTimestamp.replaceWith(footer);
                footer.append(panelTimestamp, label);
            } else if (cardTimestamp) {
                cardTimestamp.classList.add('has-insight-selection');
                cardTimestamp.append(label);
            } else if (node.classList.contains('insight-user-panel')) {
                const footer = el('div', undefined, 'insight-selection-footer');
                footer.append(label);
                footer.style.justifyContent = 'flex-end';
                (node.querySelector('.insight-user-panel-body') || node).append(footer);
            } else {
                node.prepend(label);
            }
            wrapper.classList.add('is-selectable');
        }
        wrapper.append(node);
        return wrapper;
    }
    function updateInsightManagement() {
        const user = cachedUsers.find(user => String(user.id) === selectedUserId);
        if (!user) return;
        const renderToolbar = (toolbar, cardsOnly) => {
            if (!toolbar) return;
            const editing = cardsOnly ? editingCards : editingGradeInsights;
            const anyEditing = editingCards || editingGradeInsights;
            const selection = cardsOnly ? selectedCards : selectedGradeInsights;
            const relevant = (user.cards || []).filter(card => cardsOnly ? isDashboardCard(card) : !isDashboardCard(card));
            const selected = relevant.filter(card => selection.has(insightKey(card)));
            toolbar.replaceChildren();
            toolbar.classList.toggle('is-editing', Boolean(editing));

            if (editing) {
                const infoText = selected.length
                    ? `${selected.length} selected`
                    : (cardsOnly ? 'Select a dashboard card.' : 'Select a subject or grade insight.');
                const info = el('span', infoText, 'insight-user-page-info');

                const btnGroup = el('div', undefined, 'insight-management-btn-group');

                const cancel = el('button', 'Cancel', 'sigma-btn sigma-btn-white sigma-btn-md insight-management-cancel');
                cancel.type = 'button';
                cancel.disabled = managementBusy;
                cancel.onclick = () => {
                    if (cardsOnly) { editingCards = false; selectedCards.clear(); }
                    else { editingGradeInsights = false; selectedGradeInsights.clear(); }
                    renderGenerates();
                };
                btnGroup.append(cancel);

                const action = (title, operation) => {
                    const button = el('button', title, 'sigma-btn sigma-btn-white sigma-btn-md');
                    button.type = 'button';
                    button.disabled = managementBusy;
                    button.onclick = async () => {
                        const execute = async () => {
                            managementBusy = true;
                            updateInsightManagement();
                            try {
                                const items = selected.filter(card => operation === 'delete' || (operation === 'show' ? card.hidden : !card.hidden))
                                    .map(card => ({ sourceType: card.sourceType, sourceId: card.sourceId }));
                                await window.SigmaAiDatabase.request('ai_records', { action: 'manage_insights', operation, items });
                                try {
                                    const teacherInsights = JSON.parse(localStorage.getItem('sigma-teacher-grade-insights-v1') || '{}');
                                    let tModified = false;
                                    for (const [k, val] of Object.entries(teacherInsights)) {
                                        if (val && items.some(it => it.sourceId === val.insightSourceId || (val.generationId && it.sourceId && it.sourceId.includes(val.generationId)))) {
                                            if (operation === 'delete' || operation === 'hide') val.isDeleted = true;
                                            else delete val.isDeleted;
                                            tModified = true;
                                        }
                                    }
                                    if (tModified) localStorage.setItem('sigma-teacher-grade-insights-v1', JSON.stringify(teacherInsights));

                                    const subjectInsights = JSON.parse(localStorage.getItem('sigma-subject-grade-insights-v3') || '{}');
                                    let sModified = false;
                                    for (const [k, val] of Object.entries(subjectInsights)) {
                                        if (val && items.some(it => it.sourceId === val.insightSourceId || (val.generationId && it.sourceId && it.sourceId.includes(val.generationId)))) {
                                            if (operation === 'delete' || operation === 'hide') val.isDeleted = true;
                                            else delete val.isDeleted;
                                            sModified = true;
                                        }
                                    }
                                    if (sModified) localStorage.setItem('sigma-subject-grade-insights-v3', JSON.stringify(subjectInsights));
                                } catch (_) {}
                                localStorage.setItem('sigma-insight-management-update', `${Date.now()}:${operation}`);
                                window.dispatchEvent(new CustomEvent('sigma-insight-management-update', { detail: { operation, items } }));
                                selection.clear();
                                await loadData(true);
                            } catch (error) {
                                window.alert(error.message || 'Unable to update insights.');
                            } finally {
                                managementBusy = false;
                                renderGenerates();
                            }
                        };

                        if (operation === 'delete') {
                            const count = selected.length;
                            const noun = cardsOnly ? (count === 1 ? 'card' : 'cards') : (count === 1 ? 'insight' : 'insights');
                            const ask = window.openAskingPanel || window.showConfirmDialog || window.showSigmaDialog;
                            if (typeof ask === 'function') {
                                ask({
                                    title: `Delete ${cardsOnly ? (count === 1 ? 'Card' : 'Cards') : (count === 1 ? 'Insight' : 'Insights')}`,
                                    message: `Are you sure you want to delete ${count === 1 ? 'this ' + noun : `these ${count} ${noun}`}? This action cannot be undone.`,
                                    desc: `Are you sure you want to delete ${count === 1 ? 'this ' + noun : `these ${count} ${noun}`}? This action cannot be undone.`,
                                    icon: 'fa-solid fa-trash-can text-red-600',
                                    confirmText: 'Delete',
                                    confirmClass: 'bg-red-600 hover:bg-red-700 text-white',
                                    cancelText: 'Cancel',
                                    showCancel: true,
                                    isDanger: true,
                                    type: 'danger',
                                    onConfirm: execute
                                });
                                return;
                            }
                            if (!window.confirm(`Are you sure you want to delete ${count === 1 ? 'this ' + noun : `these ${count} ${noun}`}? This action cannot be undone.`)) {
                                return;
                            }
                        }

                        execute();
                    };
                    return button;
                };

                if (selected.length) {
                    btnGroup.append(action(cardsOnly ? 'Delete Card' : 'Delete Insight', 'delete'));
                    if (cardsOnly && selected.some(card => !card.hidden)) btnGroup.append(action('Remove Card', 'hide'));
                    if (cardsOnly && selected.some(card => card.hidden)) btnGroup.append(action('Show Card', 'show'));
                }

                toolbar.append(info, btnGroup);
            }

            if (!editing && !anyEditing) {
                const edit = el('button', undefined, cardsOnly ? 'sigma-rail-header__config-btn insight-card-edit-button' : 'sigma-btn sigma-btn-white sigma-btn-md');
                edit.type = 'button';
                if (cardsOnly) {
                    edit.innerHTML = '<i class="fa-solid fa-pen-to-square" aria-hidden="true"></i>';
                    edit.title = 'Edit Cards';
                    edit.setAttribute('aria-label', 'Edit Cards');
                } else {
                    edit.classList.add('insight-detail-edit-button');
                    edit.innerHTML = '<i class="fa-solid fa-pen-to-square" aria-hidden="true"></i>';
                    edit.title = 'Edit Insights';
                    edit.setAttribute('aria-label', 'Edit Insights');
                }
                edit.disabled = managementBusy;
                edit.setAttribute('aria-pressed', 'false');
                edit.onclick = () => {
                    if (cardsOnly) {
                        editingCards = true; selectedCards.clear();
                        editingGradeInsights = false; selectedGradeInsights.clear();
                    } else {
                        editingGradeInsights = true; selectedGradeInsights.clear();
                        editingCards = false; selectedCards.clear();
                    }
                    renderGenerates();
                };
                toolbar.append(edit);
            }
        };
        renderToolbar(generatesHost?.querySelector('.insight-card-management'), true);
        renderToolbar(generatesHost?.querySelector('.insight-detail-management'), false);
    }
    const isInsightsRoute = () => /^#(?:nav-ai-insights|ai-insights)(?:$|[?:])/.test(location.hash);
    const historySnapshot = () => ({ selectedUserId, searchQuery, selectedRole, directoryPage, insightPages: { ...insightPages } });
    function animateInsightPageChange(before) {
        if (before.selectedUserId !== selectedUserId || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        generatesHost?.querySelectorAll('.insight-user-panel-grid[data-page-key]').forEach(grid => {
            const key = grid.dataset.pageKey;
            const previous = Number(before.insightPages[key]) || 1;
            const current = Number(insightPages[key]) || 1;
            if (current === previous || typeof grid.animate !== 'function') return;
            grid.animate([
                { opacity: 0, transform: `translateX(${current > previous ? 48 : -48}px)` },
                { opacity: 1, transform: 'translateX(0)' }
            ], { duration: 280, easing: 'cubic-bezier(.22,.61,.36,1)' });
        });
    }
    function navigateInsights(change) {
        const before = historySnapshot();
        if (isInsightsRoute()) history.replaceState({ ...history.state, sigmaUserInsights: before }, '', location.href);
        change();
        const after = historySnapshot();
        if (isInsightsRoute() && JSON.stringify(before) !== JSON.stringify(after)) {
            history.pushState({ ...history.state, sigmaUserInsights: after }, '', location.href);
        }
        renderGenerates();
        animateInsightPageChange(before);
    }
    function restoreInsightsHistory() {
        if (!isInsightsRoute()) return;
        const before = historySnapshot();
        const saved = history.state?.sigmaUserInsights;
        selectedUserId = typeof saved?.selectedUserId === 'string' ? saved.selectedUserId : '';
        searchQuery = typeof saved?.searchQuery === 'string' ? saved.searchQuery : '';
        selectedRole = ['student', 'teacher'].includes(saved?.selectedRole) ? saved.selectedRole : '';
        directoryPage = Math.max(1, Number(saved?.directoryPage) || 1);
        insightPages = saved?.insightPages && typeof saved.insightPages === 'object' ? { ...saved.insightPages } : {};
        renderGenerates();
        animateInsightPageChange(before);
    }
    window.addEventListener('popstate', restoreInsightsHistory);
    window.addEventListener('hashchange', restoreInsightsHistory);

    const el = (tag, text, className) => {
        const node = document.createElement(tag);
        if (text !== undefined) node.textContent = text;
        if (className) node.className = className;
        return node;
    };

    const sanitizeSearch = value => String(value || '')
        .replace(/^\s+/, '')
        .replace(/[^a-zA-Z0-9\s.\-']/g, '')
        .replace(/\s{2,}/g, ' ')
        .slice(0, 50);

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

            <!-- Bottom: White Panel -->
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

    const roleLabel = user => String(user?.role || '').toLowerCase() === 'teacher' ? 'Teacher' : 'Student';
    const insightText = card => (card?.analyses || [])
        .flatMap(analysis => [analysis?.context, analysis?.actionLabel, analysis?.text])
        .filter(Boolean)
        .map(value => String(value).replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .join(' ') || 'No additional insight details were saved.';
    const insightPreviewText = card => insightText(card)
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/__([^_]+)__/g, '$1')
        .replace(/`([^`]+)`/g, '$1');
    const insightTimestamp = (card, user) => {
        const value = card?.createdAt || card?.timestamp || user?.lastAnalyzed;
        const time = value ? new Date(value).getTime() : 0;
        return Number.isFinite(time) ? time : 0;
    };
    const newestInsights = user => {
        const timestamp = card => Date.parse(card.createdAt || card.timestamp || '') || 0;
        return [...(user.cards || [])].sort((a, b) => timestamp(b) - timestamp(a));
    };
    const latestInsightTimestamp = user => Math.max(0, ...(user.cards || []).map(card => Date.parse(card.createdAt || card.timestamp || '') || 0));
    const insightDate = (card, user) => {
        const value = card?.createdAt || card?.timestamp || user?.lastAnalyzed;
        if (!value) return '';
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
    };
    const insightCategory = card => {
        if (card?.reportCategory === 'grade') return 'grade';
        if (card?.reportCategory === 'subject') return 'subject';
        return 'analytics';
    };

    function createGeneratedInsightCard(card, user) {
        const rules = window.SigmaInsightRules;
        const paragraphs = rules && typeof rules.renderInsightSections === 'function'
            ? rules.renderInsightSections(card.analyses || [], location.href)
            : (card.analyses || []).map(a => `<p>${a.text}</p>`).join('');
        
        const iconKey = rules?.normalizeInsightIcon?.(card.icon) || 'progress';
        const iconInfo = rules?.INSIGHT_ICONS?.[iconKey] || { className: 'fa-chart-column' };

        const escape = value => { const node = document.createElement('span'); node.textContent = String(value || ''); return node.innerHTML; };
        const data = {
            id: escape(card.id || `${user.id}-${(user.cards || []).indexOf(card)}`),
            concernTitle: escape(card.title || 'AI Insight'),
            categoryIcon: iconInfo.className, headerIconColor: 'text-[#FFD000]',
            datePlacement: 'footer', date: escape(insightDate(card, user)),
            concernText: paragraphs,
            // renderBody returns inline markup, matching teacher card previews.
            previewText: rules?.renderBody ? rules.renderBody(insightText(card), location.href) : escape(insightText(card))
        };
        
        if (window.renderSigmaReadOnlyInsightCard) {
            return window.renderSigmaReadOnlyInsightCard(data, true);
        }

        const article = el('article', undefined, 'insight-generated-card');
        const header = el('header', undefined, 'insight-generated-card-header');
        
        const icon = el('i', undefined, `fa-solid ${iconInfo.className}`); icon.setAttribute('aria-hidden', 'true');
        header.append(icon, el('h4', card?.title || 'AI Insight'));
        const body = el('div', undefined, 'insight-generated-card-body');
        body.innerHTML = paragraphs;
        const date = insightDate(card, user);
        if (date) body.insertAdjacentHTML('beforeend', `<time class="insight-generated-card-date">${escape(date)}</time>`);
        article.append(header, body);
        return article;
    }

    function createInsightPanel(card, user) {
        const article = el('article', undefined, 'insight-user-panel sigma-ai-panel');
        
        const rules = window.SigmaInsightRules;
        article.setAttribute('aria-label', card?.title || 'Insight');
        if (card.sourceType === 'grade' && String(user.role).toLowerCase() === 'student') {
            const source = card.reportCategory === 'subject' ? 'Subject view' : 'Grades page';
            article.append(el('p', `${card.isCurrentStudentView ? 'Currently shown to student' : 'Saved history'} · ${source}`, 'insight-current-view-label'));
        }

        // Body with canonical light green tint & rich text support
        const body = el('div', undefined, 'insight-user-panel-body sigma-ai-panel-body');
        const analyses = Array.isArray(card?.analyses) && card.analyses.length ? card.analyses : null;
        
        if (analyses && rules && typeof rules.renderInsightSections === 'function') {
            body.innerHTML = rules.renderInsightSections(analyses, location.href);
        } else if (analyses) {
            analyses.forEach(analysis => {
                const section = el('div', undefined, 'insight-user-analysis-block');
                if (analysis?.context) {
                    const ctx = el('p', analysis.context, 'insight-user-analysis-context');
                    section.append(ctx);
                }
                if (analysis?.text) {
                    const adv = el('p', undefined, 'insight-user-analysis-advice');
                    if (analysis?.actionLabel) {
                        const strong = el('strong', `${analysis.actionLabel}: `);
                        adv.append(strong);
                    }
                    adv.append(document.createTextNode(String(analysis.text)));
                    section.append(adv);
                }
                body.append(section);
            });
        } else {
            const text = insightText(card);
            const fallbackP = el('p', text);
            body.append(fallbackP);
        }

        const date = insightDate(card, user);
        if (date) {
            const timestampHtml = window.renderSigmaInsightTimestamp?.(card.createdAt) || `<time class="insight-user-panel-date">${date}</time>`;
            body.insertAdjacentHTML('beforeend', timestampHtml);
        }

        article.append(body);
        return article;
    }

    function createInsightCategory(title, cards, user) {
        const section = el('section', undefined, 'insight-user-category');
        const headerRow = el('div', undefined, 'insight-user-category-header');
        headerRow.append(el('h3', title));
        section.append(headerRow);

        const panels = el('div', undefined, 'insight-user-panel-grid');
        panels.dataset.pageKey = `${user.id}:${title}`;
        if (!cards.length) {
            panels.append(el('p', `No ${title.toLowerCase()} have been generated for this user yet.`, 'insight-user-empty-panel'));
            section.append(panels);
            return section;
        }

        const pageSize = 4;
        let currentPage = 1;
        const totalPages = Math.ceil(cards.length / pageSize);

        const paginationWrap = el('nav', undefined, 'insight-user-pagination');
        paginationWrap.setAttribute('aria-label', `${title} pagination`);

        function renderPage(page) {
            currentPage = page;
            panels.replaceChildren();
            const start = (currentPage - 1) * pageSize;
            const end = start + pageSize;
            const pageCards = cards.slice(start, end);
            pageCards.forEach(card => panels.append(managedInsight(createInsightPanel(card, user), card)));

            if (totalPages > 1) {
                paginationWrap.replaceChildren();
                
                window.SigmaTablePagination.mount(paginationWrap, currentPage, totalPages, page =>
                    navigateInsights(() => { insightPages[`${user.id}:${title}`] = page; }));
            }
        }

        renderPage(Math.max(1, Math.min(totalPages, Number(insightPages[`${user.id}:${title}`]) || 1)));
        const viewport = el('div', undefined, 'insight-page-viewport');
        viewport.append(panels);
        section.append(viewport);
        if (totalPages > 1) {
            section.append(paginationWrap);
        }
        return section;
    }

    function renderUserDirectory(users, query, role, onSelectUser) {
        const directory = el('section', undefined, 'insight-user-directory');
        const cleanQuery = String(query || '').trim().toLowerCase();
        const cleanRole = String(role || '').trim().toLowerCase();

        let matchingUsers = cleanQuery
            ? users.filter(user => 
                window.SigmaSearch.record(cleanQuery, [user.id], [user.name])
              )
            : users.filter(user => (user.cards || []).length > 0);

        if (cleanRole) {
            matchingUsers = matchingUsers.filter(user => String(user.role || '').toLowerCase() === cleanRole);
        }
        matchingUsers.sort((a, b) => latestInsightTimestamp(b) - latestInsightTimestamp(a)
            || String(a.name || '').localeCompare(String(b.name || '')));

        if (!cleanQuery && !cleanRole && !matchingUsers.length) {
            const emptyState = el('section', undefined, 'insight-user-search-empty');
            emptyState.setAttribute('role', 'status');
            const iconWrap = el('div', undefined, 'insight-user-search-empty-icon');
            const icon = el('i', undefined, 'fa-solid fa-users');
            icon.setAttribute('aria-hidden', 'true');
            iconWrap.append(icon);
            emptyState.append(
                iconWrap,
                el('h3', 'Find a user'),
                el('p', 'Use the search field above to view their generated AI insights.')
            );
            directory.append(emptyState);
            return directory;
        }

        if (cleanQuery || cleanRole) {
            const roleFilterText = cleanRole ? ` in ${cleanRole === 'teacher' ? 'Teachers' : 'Students'}` : '';
            directory.append(el('p', `${matchingUsers.length} ${matchingUsers.length === 1 ? 'user' : 'users'} found${roleFilterText}`, 'insight-report-owner'));
        }

        if (!matchingUsers.length) {
            directory.append(el('p', 'No users found matching that criteria.', 'insight-report-empty'));
            return directory;
        }

        const results = el('div', undefined, 'insight-user-results');
        const directoryLimit = 6;
        const totalPages = Math.max(1, Math.ceil(matchingUsers.length / directoryLimit));
        directoryPage = Math.min(directoryPage, totalPages);
        matchingUsers.slice((directoryPage - 1) * directoryLimit, directoryPage * directoryLimit).forEach(user => {
            const result = el('button', undefined, 'insight-user-result-card');
            result.type = 'button';
            result.setAttribute('aria-label', `View insights for ${user.name}`);

            // 1. Header (Avatar, Name, ID, Section/Dept, Role Badge)
            const header = el('div', undefined, 'insight-user-card-header');
            const avatar = el('span', undefined, 'insight-user-result-avatar');
            const icon = el('i', undefined, 'fa-solid fa-user');
            icon.setAttribute('aria-hidden', 'true'); avatar.append(icon);
            const photo = window.resolveUserAvatar?.(user) || user.avatar;
            if (typeof photo === 'string' && photo.trim()) {
                const image = el('img');
                image.src = photo.trim();
                image.alt = '';
                image.loading = 'lazy';
                image.onerror = () => image.remove();
                avatar.append(image);
            }

            const identity = el('div', undefined, 'insight-user-result-identity');
            const nameEl = el('strong', user.name || 'Unnamed user');
            const metaEl = el('span', undefined, 'insight-user-result-meta');
            metaEl.append(el('span', `ID: ${user.id || '—'}`));
            if (user.section || user.grade) {
                const sectionTag = [user.grade ? `Grade ${user.grade}` : '', user.section].filter(Boolean).join(' - ');
                metaEl.append(el('span', '•', 'insight-user-meta-dot'), el('span', sectionTag));
            } else if (user.department) {
                metaEl.append(el('span', '•', 'insight-user-meta-dot'), el('span', user.department));
            }
            identity.append(nameEl, metaEl);

            const isTeacher = String(user?.role || '').toLowerCase() === 'teacher';
            const role = el('span', roleLabel(user), `insight-user-result-role ${isTeacher ? 'is-teacher' : 'is-student'}`);
            header.append(avatar, identity, role);

            // 2. Latest Insight Preview Snippet
            const cards = newestInsights(user);
            const latestCard = cards[0] || null;
            const snippetBox = el('div', undefined, 'insight-user-card-snippet');

            if (latestCard) {
                const snippetHead = el('div', undefined, 'insight-user-snippet-head');
                const bolt = el('i', undefined, 'fa-solid fa-bolt insight-user-bolt');
                bolt.setAttribute('aria-hidden', 'true');
                const cardTitle = el('span', latestCard.title || 'Latest AI Insight', 'insight-user-snippet-title');
                snippetHead.append(bolt, cardTitle);

                const snippetText = el('p', insightPreviewText(latestCard), 'insight-user-snippet-body');
                snippetBox.append(snippetHead, snippetText);
            } else {
                const emptySnippet = el('div', undefined, 'insight-user-snippet-empty');
                const infoIcon = el('i', undefined, 'fa-regular fa-circle-info');
                infoIcon.setAttribute('aria-hidden', 'true');
                emptySnippet.append(infoIcon, el('span', 'No insights recorded for this profile yet'));
                snippetBox.append(emptySnippet);
            }

            // 3. Category Tags Breakdown
            const tagsRow = el('div', undefined, 'insight-user-card-tags');
            const subjectCardsCount = cards.filter(c => insightCategory(c) === 'subject').length;
            const gradeCardsCount = cards.filter(c => insightCategory(c) === 'grade').length;

            const totalTag = el('span', `${cards.length} ${cards.length === 1 ? 'Insight' : 'Insights'}`, 'insight-user-pill insight-user-pill-total');
            if (!cards.length) totalTag.classList.add('is-empty');
            tagsRow.append(totalTag);

            if (subjectCardsCount > 0) {
                tagsRow.append(el('span', `${subjectCardsCount} Subject${subjectCardsCount === 1 ? '' : 's'}`, 'insight-user-pill insight-user-pill-sub'));
            }
            if (gradeCardsCount > 0) {
                tagsRow.append(el('span', `${gradeCardsCount} Grade${gradeCardsCount === 1 ? '' : 's'}`, 'insight-user-pill insight-user-pill-sub'));
            }

            // 4. Footer Row
            const footer = el('div', undefined, 'insight-user-result-footer');
            const lastUpdated = latestCard ? insightDate(latestCard, user) : '';
            const dateSpan = el('span', lastUpdated ? `Updated ${lastUpdated}` : 'Active Profile', 'insight-user-card-date');

            const action = el('span', 'View Insights', 'insight-user-result-action');
            const arrow = el('i', undefined, 'fa-solid fa-arrow-right insight-user-result-arrow');
            arrow.setAttribute('aria-hidden', 'true');
            action.append(arrow);
            footer.append(dateSpan, action);

            result.append(header, snippetBox, tagsRow, footer);
            result.onclick = () => onSelectUser(user);
            results.append(result);
        });
        directory.append(results);
        if (totalPages > 1) {
            const pagination = el('nav', undefined, 'insight-user-pagination');
            pagination.setAttribute('aria-label', 'User directory pagination');
            const count = el('span', `${matchingUsers.length} users`, 'insight-user-page-info');
            const controls = el('div', undefined, 'sigma-directory-page-controls');
            window.SigmaTablePagination.mount(controls, directoryPage, totalPages, page => navigateInsights(() => { directoryPage = page; }));
            pagination.append(count, controls);
            directory.append(pagination);
        }
        return directory;
    }

    function renderUserDetail(user) {
        const page = el('section', undefined, 'insight-user-page');
        const pageHeader = el('div', undefined, 'insight-user-page-header');
        const profile = el('div', undefined, 'insight-user-profile');
        const avatar = el('span', undefined, 'header-profile-btn insight-user-profile-avatar');
        const fallback = el('i', undefined, 'fa-solid fa-user header-avatar-placeholder');
        fallback.setAttribute('aria-hidden', 'true');
        avatar.append(fallback);
        const photo = window.resolveUserAvatar?.(user) || user.avatar;
        if (typeof photo === 'string' && photo.trim()) {
            const image = el('img');
            image.src = photo.trim();
            image.alt = '';
            image.onerror = () => image.remove();
            avatar.append(image);
        }
        const identity = el('div', undefined, 'insight-user-page-identity');
        identity.append(el('h2', user.name || 'Unnamed user'), el('p', `ID: ${user.id || '—'}`));
        profile.append(avatar, identity);
        pageHeader.append(profile);
        const profileRole = el('span', roleLabel(user), `insight-user-result-role ${String(user.role).toLowerCase() === 'teacher' ? 'is-teacher' : 'is-student'}`);
        profileRole.classList.add('insight-user-profile-role');
        pageHeader.append(profileRole);

        const layout = el('div', undefined, 'insight-user-detail-layout');
        const rail = el('aside', undefined, 'insight-user-insights-rail');
        const railHeader = el('div', undefined, 'sigma-rail-header pocket-rail-header insight-user-insights-rail-header');
        const title = el('span', 'SIGMA AI Insights', 'sigma-rail-header__title pocket-rail-header__title');
        railHeader.append(title);

        if (canManageInsights()) {
            const mgmt = el('div', undefined, 'insight-card-management insight-management');
            railHeader.append(mgmt);
        }
        
        const railCards = el('div', undefined, 'insight-user-insights-rail-cards');
        const cards = newestInsights(user);
        const railCardsList = cards.filter(card => insightCategory(card) === 'analytics');
        rail.append(railHeader, railCards);
        if (railCardsList.length) {
            const controls = el('div', undefined, 'insight-rail-controls');
            const drawRail = () => {
                const expanded = railDisplayCounts.get(user.id) === Infinity;
                const limit = expanded ? railCardsList.length : Math.min(4, railCardsList.length);
                railCards.replaceChildren(...railCardsList.slice(0, limit).map(card => managedInsight(createGeneratedInsightCard(card, user), card)));
                controls.replaceChildren();
                if (railCardsList.length > 4) {
                    const more = el('button', undefined, 'sigma-rail-more-btn pocket-rail-more-btn');
                    more.type = 'button';
                    more.classList.toggle('is-expanded', expanded);
                    more.setAttribute('aria-expanded', String(expanded));
                    const label = el('span', expanded ? 'Show Less' : 'Show More', 'more-label');
                    const chevron = el('i', undefined, 'fa-solid fa-chevron-down');
                    chevron.setAttribute('aria-hidden', 'true');
                    more.append(label, chevron);
                    more.onclick = () => {
                        railDisplayCounts.set(user.id, expanded ? 4 : Infinity);
                        drawRail();
                        if (expanded) railCards.scrollTop = 0;
                    };
                    controls.append(more);
                }
            };
            rail.append(controls);
            drawRail();
        } else railCards.append(el('p', 'No generated AI insight cards for this user yet.', 'insight-report-empty'));
        
        const main = el('main', undefined, 'insight-user-detail-main');
        main.append(pageHeader);
        const grouped = { subject: [], grade: [] };
        cards.forEach(card => {
            // Only true subject/grade report cards belong in Subject and Grade Insights
            if (card.reportCategory === 'subject') {
                grouped.subject.push(card);
            } else if (card.reportCategory === 'grade') {
                grouped.grade.push(card);
            }
        });
        const attachInsightManagement = category => {
            if (canManageInsights()) category.querySelector('.insight-user-category-header')?.append(el('div', undefined, 'insight-detail-management insight-management'));
            main.append(category);
        };
        if (String(user.role).toLowerCase() !== 'teacher') {
            attachInsightManagement(createInsightCategory('Subject Insights', grouped.subject, user));
        }
        else attachInsightManagement(createInsightCategory('Grade Insights', grouped.grade, user));
        if (String(user.role).toLowerCase() !== 'teacher') main.append(createInsightCategory('Grade Insights', grouped.grade, user));
        layout.append(rail, main);
        page.append(layout);
        return page;
    }

    // 1. RENDER REPORTS > AI ANALYTICS OVERVIEW (No selection panel, pure school metrics)
    function renderSchoolOverview() {
        if (!schoolHost) return;
        schoolHost.replaceChildren();

        if (isLoading) {
            window.SigmaContentLoading.render(schoolHost, {page:true, label:'Loading AI analytics'});
            return;
        }

        const cards = cachedUsers.flatMap(user => user.cards || []);
        const planGrid = el('div', undefined, 'insight-plan-grid');
        for (const config of TYPE_CONFIGS) {
            planGrid.append(createTypePlanCard(config, cards, cachedUsers));
        }
        schoolHost.append(planGrid);

        // Centered Action Pill Button (Navigates to Insights Directory)
        const actionWrap = el('div', undefined, 'flex justify-center my-6');
        const pillBtn = el('a', undefined, 'ai-analytics-pill-btn');
        pillBtn.href = '#nav-ai-insights';
        pillBtn.innerHTML = `
            <i class="fa-solid fa-chart-pie text-[#15803d]"></i>
            <span>Explore User Insights Directory</span>
            <i class="fa-solid fa-arrow-right text-xs opacity-70"></i>
        `;
        actionWrap.append(pillBtn);
        schoolHost.append(actionWrap);

        // Black Fade Division Line
        const divider = el('div', undefined, 'ai-analytics-divider');
        schoolHost.append(divider);

        // Methodological Footnotes / Model Disclaimers
        const footnotes = el('div', undefined, 'ai-analytics-footnotes max-w-4xl mx-auto text-xs text-black/60 leading-relaxed space-y-2');
        footnotes.innerHTML = `
            <p><sup>1</sup> <strong>Descriptive Analytics:</strong> Evaluates historical scores, task completions, and quarterly submissions to summarize learning baseline across classes.</p>
            <p><sup>2</sup> <strong>Predictive Analytics:</strong> Models learning trajectories and risk patterns to forecast academic outcomes and flag students needing proactive support.</p>
            <p><sup>3</sup> <strong>Prescriptive Analytics:</strong> Formulates targeted remedial practice plans, personalized study directions, and instructional recommendations for educators.</p>
            <p class="pt-2 text-[11px] text-black/40 border-t border-slate-100">All analytics insights and recommendations are grounded in authenticated LMS institutional records for Interface Computer College.</p>
        `;
        schoolHost.append(footnotes);

        if (!cards.length) {
            schoolHost.append(el('p', 'No saved AI insights available yet.', 'insight-report-empty'));
        }
        setTimeout(() => window.bindInteractiveMetricCards?.(), 20);
    }

    // 2. RENDER SIGMA AI > GENERATES (User Insights Directory & Detail View)
    function renderGenerates() {
        if (!generatesHost) return;
        generatesHost.replaceChildren();
        const visibleUsers = cachedUsers;
        if (editingOwner !== selectedUserId) {
            editingOwner = selectedUserId;
            editingCards = false;
            editingGradeInsights = false;
            selectedCards.clear();
            selectedGradeInsights.clear();
        }

        if (isLoading) {
            window.SigmaContentLoading.render(generatesHost, {page:true, label:'Loading user insights'});
            return;
        }

        if (hasLoadedUsers && selectedUserId && !visibleUsers.some(u => String(u.id || '') === selectedUserId)) {
            selectedUserId = '';
        }

        // Detail view
        if (selectedUserId) {
            const user = visibleUsers.find(u => String(u.id || '') === selectedUserId);
            if (user) {
                generatesHost.append(renderUserDetail(user));
                updateInsightManagement();
                return;
            }
            if (!hasLoadedUsers) return;
            selectedUserId = '';
        }

        // Toolbar / Search for Generates
        const filters = el('div', undefined, 'insight-report-filters');
        const searchControl = el('div', undefined, 'insight-report-control insight-report-search-control');
        const searchInput = el('input', undefined, 'sigma-input insight-report-search-input');
        searchInput.type = 'search';
        searchInput.placeholder = 'Search by name or ID';
        searchInput.setAttribute('aria-label', 'Search user insights by name or ID');
        searchInput.maxLength = 50;
        searchInput.autocomplete = 'off';
        searchInput.value = searchQuery;

        const searchWrap = el('div', undefined, 'ai-log-search-input-wrap insight-report-search-input-wrap');
        const clearSearch = el('button', undefined, 'ai-log-search-clear insight-report-search-clear');
        clearSearch.type = 'button';
        clearSearch.title = 'Clear search';
        clearSearch.setAttribute('aria-label', 'Clear search');
        const clearIcon = el('i', undefined, 'fa-solid fa-xmark');
        clearIcon.setAttribute('aria-hidden', 'true');
        clearSearch.append(clearIcon);
        clearSearch.hidden = !searchQuery;

        searchWrap.append(searchInput, clearSearch);
        searchControl.append(searchWrap);

        // Role Filter Dropdown
        const roleControl = el('div', undefined, 'insight-report-control insight-report-role-control');
        const selectWrapper = el('div', undefined, 'sigma-select-wrapper');
        const roleSelect = el('select', undefined, 'sigma-select');
        roleSelect.setAttribute('aria-label', 'Filter role');

        const optAll = el('option', 'All Roles');
        optAll.value = '';
        const optStudent = el('option', 'Students');
        optStudent.value = 'student';
        const optTeacher = el('option', 'Teachers');
        optTeacher.value = 'teacher';

        roleSelect.append(optAll, optStudent, optTeacher);
        roleSelect.value = selectedRole;

        const chevron = el('i', undefined, 'fa-solid fa-chevron-down sigma-select-icon');
        selectWrapper.append(roleSelect, chevron);
        roleControl.append(selectWrapper);

        roleSelect.onchange = () => {
            navigateInsights(() => { selectedRole = roleSelect.value; directoryPage = 1; });
        };

        const searchButton = el('button', undefined, 'sigma-btn sigma-btn-primary sigma-btn-md min-w-[100px] insight-report-search-button');
        searchButton.type = 'button';
        searchButton.title = 'Search user insights';
        searchButton.append(el('span', 'Search'));

        filters.append(searchControl, roleControl, searchButton);

        const applySearch = () => {
            const clean = sanitizeSearch(searchInput.value);
            if (searchInput.value !== clean) searchInput.value = clean;
            clearSearch.hidden = !clean;
            navigateInsights(() => { searchQuery = clean.trim().toLowerCase(); directoryPage = 1; });
        };

        searchInput.oninput = () => {
            const clean = sanitizeSearch(searchInput.value);
            if (searchInput.value !== clean) searchInput.value = clean;
            clearSearch.hidden = !clean;
        };
        searchInput.onkeydown = event => {
            if (event.key === 'Enter') {
                event.preventDefault();
                applySearch();
            }
        };
        searchButton.onclick = applySearch;
        clearSearch.onclick = () => {
            searchInput.value = '';
            clearSearch.hidden = true;
            navigateInsights(() => { searchQuery = ''; directoryPage = 1; });
            generatesHost.querySelector('input[type="search"]')?.focus({ preventScroll: true });
        };

        const content = el('div', undefined, 'insight-generates-content');
        content.append(renderUserDirectory(visibleUsers, searchQuery, selectedRole, (user) => {
            navigateInsights(() => { selectedUserId = String(user.id || ''); });
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }));

        generatesHost.append(filters, content);
    }

    async function loadData(background = false) {
        if (isLoading) return;
        isLoading = true;
        if (!background) {
            renderSchoolOverview();
            renderGenerates();
        }
        try {
            const result = await window.SigmaAiDatabase?.loadInsightReport();
            cachedUsers = result?.users || [];
            try {
                const views = JSON.parse(localStorage.getItem('sigma-student-grade-insight-views-v1') || '{}');
                for (const user of cachedUsers) {
                    if (!views[user.id]) continue;
                    if ((user.cards || []).some(card => card.isCurrentStudentView)) continue;
                    const currentIds = new Set(Object.values(views[user.id]));
                    for (const card of user.cards || []) {
                        if (card.sourceType === 'grade') card.isCurrentStudentView = currentIds.has(card.generationId);
                    }
                }
            } catch (_) {}
            hasLoadedUsers = true;
            isLoading = false;
            renderSchoolOverview();
            renderGenerates();
        } catch (error) {
            isLoading = false;
            if (!background) {
                renderSchoolOverview();
                renderGenerates();
            }
        }
    }

    const schoolSection = document.getElementById('reports-ai-view');
    const generatesSection = document.getElementById('ai-insights-view');

    const refreshActiveViews = () => {
        const schoolActive = schoolSection && !schoolSection.classList.contains('hidden');
        const generatesActive = generatesSection && !generatesSection.classList.contains('hidden');
        if (document.visibilityState === 'visible' && (schoolActive || generatesActive)) {
            loadData(true);
        }
    };

    window.addEventListener('focus', refreshActiveViews);
    document.addEventListener('visibilitychange', refreshActiveViews);
    window.addEventListener('storage', event => {
        if (event.key && /^sigma-(student|teacher)-analytics-v1:|^sigma-subject-grade-insights|^sigma-student-grade-insight-views-v1$|^sigma-ai-recorded-logs$/.test(event.key)) {
            refreshActiveViews();
        }
    });
    setInterval(refreshActiveViews, 30000);

    if (schoolSection) {
        new MutationObserver(() => {
            if (!schoolSection.classList.contains('hidden')) {
                loadData();
                setTimeout(() => window.bindInteractiveMetricCards?.(), 30);
            }
        }).observe(schoolSection, { attributes: true, attributeFilter: ['class'] });
    }

    if (generatesSection) {
        new MutationObserver(() => {
            if (!generatesSection.classList.contains('hidden')) {
                loadData();
            }
        }).observe(generatesSection, { attributes: true, attributeFilter: ['class'] });
    }

    window.addEventListener('sigma:refresh-analytics-cards', () => {
        loadData();
        setTimeout(() => window.bindInteractiveMetricCards?.(), 30);
    });

    window.refreshAiAnalyticsOverview = () => {
        renderSchoolOverview();
    };

    window.renderGeneratesUserInsights = (resetSelection = false) => {
        if (resetSelection) selectedUserId = '';
        renderGenerates();
    };

    document.getElementById('nav-ai-insights')?.addEventListener('click', () => {
        navigateInsights(() => { selectedUserId = ''; });
    });

    // Initial load
    restoreInsightsHistory();
    loadData();
})();
