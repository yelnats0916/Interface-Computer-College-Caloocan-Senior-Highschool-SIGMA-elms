(function () {
    'use strict';

    const normalizeTitle = value => String(value || '').trim().replace(/^Topic:\s*/i, '').trim().toLowerCase();
    const topicTitle = card => normalizeTitle(card.querySelector('.topic-picker-header span.whitespace-normal, .topic-group-block > div:first-child span.text-black')?.textContent);

    // Move the existing picker controls into the release panel; their handlers and
    // selection map remain the source of truth for the schedule flow.
    window.mountTopicsAndMaterialsReleasePicker = function (releaseOverlay) {
        const releasedGroups = Array.from(releaseOverlay.querySelectorAll('.topic-group-block'));
        const section = releaseOverlay.querySelector('.release-section-header-bar')?.parentElement;
        const footer = releaseOverlay.querySelector('.curriculum-hub-panel > div:last-child');
        if (!section || !footer) return;

        window.openTeacherTopicsAndMaterialsPickerModal(true);
        const picker = document.getElementById('teacher-topics-materials-picker-overlay');
        const list = picker?.querySelector('#unified-picker-list-container');
        const chips = picker?.querySelector('#unified-picker-filter-chips');
        const submit = picker?.querySelector('#topics-materials-picker-submit-btn');
        if (!list || !chips || !submit) return;

        const state = window.currentTopicState || {};
        let user = {};
        try {
            user = JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || localStorage.getItem('sigma-logged-in-user') || '{}');
        } catch (_) {}
        const collapseKey = 'sigma-release-topic-collapse:' + JSON.stringify([
            user.id || user.uid || user.username || 'local', state.subjectId, state.selectedSection,
            window.getActiveReleaseQuarter?.(state.subjectId, state.selectedSection)
        ]);
        let savedCollapse = {};
        try { savedCollapse = JSON.parse(localStorage.getItem(collapseKey) || '{}') || {}; } catch (_) {}
        const materialOrders = {
            learning: new Map((window.getTeacherSubjectLearningMaterials?.(state.subjectId, state.selectedSection) || []).map((item, index) => [String(item.id), index])),
            assessments: new Map((window.getTeacherSubjectAssessments?.(state.subjectId, state.selectedSection) || []).map((item, index) => [String(item.id), index]))
        };

        const draftGroups = Array.from(list.querySelectorAll('.topic-picker-card'));
        const draftsByTitle = new Map(draftGroups.map(card => [topicTitle(card), card]));
        for (const group of releasedGroups) {
            const draft = draftsByTitle.get(topicTitle(group));
            group.classList.add('topic-picker-card');
            const header = group.firstElementChild;
            header.dataset.releaseCategory = 'topics';
            header.dataset.releaseState = 'released';
            if (draft) {
                const topicInput = draft.querySelector('input[data-category="topics"]');
                if (topicInput) {
                    topicInput.setAttribute('aria-label', 'Release Topic: ' + topicInput.dataset.title);
                    const topicActions = header.lastElementChild;
                    topicActions.querySelector('button')?.remove();
                    topicActions.prepend(topicInput.closest('.topic-release-row'));
                    topicActions.querySelector('.topic-release-row').addEventListener('click', event => event.stopPropagation());
                    header.dataset.releaseState = 'draft';
                    header.querySelector('p')?.remove();
                }
                for (const category of ['learning', 'assessments']) {
                    const division = group.querySelector(category === 'learning' ? '.topic-division-learning' : '.topic-division-assessments');
                    const rows = Array.from(draft.querySelectorAll('.picker-item-' + category));
                    if (rows.length && division) {
                        const body = division.lastElementChild;
                        if (!body.querySelector('.release-item-row')) body.replaceChildren();
                        body.append(...rows);
                        const countLabel = division.firstElementChild.lastElementChild;
                        countLabel.textContent += ' / ' + rows.length + ' Draft';
                    }
                }
                draft.replaceWith(group);
            } else {
                list.append(group);
            }
            group.querySelectorAll('.release-item-row').forEach(row => {
                row.dataset.releaseCategory = row.closest('.topic-division-learning') ? 'learning' : 'assessments';
                row.dataset.releaseState = 'released';
            });
        }

        const orderedGroups = Array.from(list.querySelectorAll('.topic-picker-card'));
        orderedGroups.forEach(group => {
            group.classList.remove('border', 'border-black/10', 'rounded-xl', 'overflow-hidden', 'shadow-[0_1px_2px_rgba(0,0,0,0.02)]');
            const originalHeader = group.querySelector('.topic-picker-header');
            if (originalHeader) {
                const title = originalHeader.querySelector('span.whitespace-normal');
                const selection = originalHeader.querySelector('.topic-release-row');
                const header = document.createElement('div');
                header.className = 'topic-picker-header px-3 sm:px-4 py-2 sm:py-2.5 bg-black/[0.03] border-b border-black/10 flex items-center justify-between cursor-pointer select-none hover:bg-black/[0.05] transition-colors';
                header.innerHTML = '<div class="flex items-start gap-2 sm:gap-2.5 min-w-0 flex-1 mr-2 sm:mr-3"><i class="fa-solid fa-book-bookmark text-xs text-[#15803d] shrink-0 mt-0.5"></i></div><div class="flex items-center gap-1.5 sm:gap-3 shrink-0"></div>';
                if (title) {
                    title.textContent = title.textContent.trim().replace(/^Topic:\s*/i, '');
                    title.className = "text-xs sm:text-sm font-normal text-black font-['Inter'] whitespace-normal break-words";
                    header.firstElementChild.append(title);
                }
                if (selection) header.lastElementChild.append(selection);
                const safeId = 'workspace-draft-' + group.dataset.topicOrder;
                const chevron = document.createElement('button');
                chevron.type = 'button';
                chevron.className = 'w-6 h-6 flex items-center justify-center text-black cursor-pointer';
                chevron.setAttribute('aria-label', 'Toggle topic materials');
                chevron.innerHTML = '<i class="fa-solid fa-chevron-down text-xs transition-transform duration-200"></i>';
                chevron.firstElementChild.id = 'topic-chevron-' + safeId;
                header.lastElementChild.append(chevron);
                originalHeader.replaceWith(header);
                const body = document.createElement('div');
                body.id = 'topic-collapse-body-' + safeId;
                body.append(...Array.from(group.children).filter(child => child !== header));
                group.append(body);
                const collapsed = window._topicReleaseCollapsedState?.[safeId] === true;
                body.classList.toggle('hidden', collapsed);
                chevron.firstElementChild.style.transform = collapsed ? 'rotate(-90deg)' : 'rotate(0deg)';
                selection?.addEventListener('click', event => event.stopPropagation());
            }
            group.firstElementChild.style.minHeight = '56px';
            group.querySelectorAll('.topic-release-row').forEach(selection => {
                selection.querySelector('span')?.remove();
                selection.className = 'topic-release-row w-7 h-7 flex items-center justify-center shrink-0';
                const input = selection.querySelector('input');
                if (input) input.setAttribute('aria-label', 'Release Topic: ' + input.dataset.title);
            });
            const topicBody = group.querySelector('[id^="topic-collapse-body-"]');
            const header = group.firstElementChild;
            const topicInput = header.querySelector('input[data-category="topics"]');
            const topicMenu = header.querySelector('button[id^="released-topic-btn-"]');
            const topicId = topicInput?.dataset.id || topicMenu?.id.slice('released-topic-btn-'.length) || topicTitle(group);
            const safeId = topicBody.id.slice('topic-collapse-body-'.length);
            const chevron = header.querySelector('[id^="topic-chevron-"]');
            const collapsed = savedCollapse[topicId] === true;
            topicBody.classList.toggle('hidden', collapsed);
            if (chevron) chevron.style.transform = collapsed ? 'rotate(-90deg)' : 'rotate(0deg)';
            header.removeAttribute('onclick');
            header.addEventListener('click', event => {
                window.toggleReleaseTopicCollapse?.(safeId, event);
                savedCollapse[topicId] = topicBody.classList.contains('hidden');
                try { localStorage.setItem(collapseKey, JSON.stringify(savedCollapse)); } catch (_) {}
            });
            for (const category of ['learning', 'assessments']) {
                const className = category === 'learning' ? 'topic-division-learning' : 'topic-division-assessments';
                let division = topicBody.querySelector('.' + className);
                const rows = Array.from(group.querySelectorAll('.picker-item-' + category + ', .' + className + ' .release-item-row'));
                if (!division) {
                    division = document.createElement('div');
                    division.className = className;
                    division.innerHTML = '<div class="px-3.5 sm:px-4 py-2 bg-slate-50 border-b border-black/10 flex items-center justify-between"><div class="flex items-center gap-2"><i></i><span class="text-xs font-normal text-black font-[\'Inter\']"></span></div><span class="text-[11px] font-semibold text-black/50 font-[\'Inter\']"></span></div><div></div>';
                    division.querySelector('i').className = category === 'learning' ? 'fa-solid fa-book-open text-xs text-blue-600' : 'fa-solid fa-clipboard-check text-xs text-amber-600';
                    division.querySelector('span').textContent = category === 'learning' ? 'Learning Materials' : 'Assessment Materials';
                    topicBody.append(division);
                }
                rows.forEach(row => {
                    const input = row.querySelector('input');
                    const menu = row.querySelector('button[id]');
                    const prefix = category === 'learning' ? 'released-learning-btn-' : 'released-assessment-btn-';
                    const id = input?.dataset.id || menu?.id.slice(prefix.length);
                    row.dataset.materialOrder = materialOrders[category].get(id) ?? Number.MAX_SAFE_INTEGER;
                    if (!input) return;
                    row.className = "picker-item-row picker-item-" + category + " p-3 sm:p-3.5 bg-white relative font-['Inter'] hover:bg-black/[0.02] cursor-pointer transition-colors";
                    Object.assign(row.style, { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'nowrap' });
                    const titleBox = row.firstElementChild;
                    titleBox.className = 'flex items-center gap-2.5 sm:gap-3.5 flex-1 release-item-title-box';
                    titleBox.style.minWidth = '0';
                    const icon = titleBox.firstElementChild;
                    icon.classList.remove('w-7', 'h-7', 'rounded-lg');
                    icon.classList.add('w-8', 'h-8', 'sm:w-9', 'sm:h-9', 'rounded-xl');
                    icon.querySelector('i')?.classList.add('sm:text-sm');
                    row.querySelector('h4').className = "text-xs sm:text-sm font-normal text-black font-['Inter'] whitespace-normal break-words";
                    row.querySelector('p')?.remove();
                    const actions = document.createElement('div');
                    actions.className = 'w-7 h-7 flex items-center justify-center shrink-0';
                    actions.style.flex = '0 0 auto';
                    actions.append(input);
                    row.append(actions);
                });
                rows.sort((a, b) => Number(a.dataset.materialOrder) - Number(b.dataset.materialOrder));
                const releasedCount = rows.filter(row => !row.querySelector('input')).length;
                const draftCount = rows.length - releasedCount;
                division.firstElementChild.lastElementChild.textContent = releasedCount + ' Released' + (draftCount ? ' / ' + draftCount + ' Draft' : '');
                const items = document.createElement('div');
                items.className = 'divide-y divide-black/10';
                items.append(...rows);
                if (!rows.length) {
                    const empty = document.createElement('p');
                    empty.className = "px-4 py-3 text-xs text-black/40 italic text-center font-['Inter']";
                    empty.textContent = category === 'learning' ? 'No learning materials under this topic' : 'No assessment materials under this topic';
                    items.append(empty);
                }
                division.lastElementChild.replaceChildren(items);
            }
            Array.from(topicBody.children).filter(child => !child.matches('.topic-division-learning, .topic-division-assessments')).forEach(child => child.remove());
        });
        orderedGroups.sort((a, b) => Number(a.dataset.topicOrder) - Number(b.dataset.topicOrder));
        list.append(...orderedGroups);

        // Keep the original selection inputs while matching the released header layout.
        list.querySelectorAll('.topic-picker-header').forEach(header => {
            header.dataset.releaseCategory = 'topics';
            header.dataset.releaseState = header.querySelector('input') ? 'draft' : 'context';
        });
        list.querySelectorAll('.picker-item-row').forEach(row => {
            row.dataset.releaseCategory = row.classList.contains('picker-item-learning') ? 'learning' : 'assessments';
            row.dataset.releaseState = 'draft';
        });
        if (list.querySelector('.topic-picker-card')) {
            list.querySelector('.sigma-empty-state-black-fade')?.remove();
        }

        const toolbar = chips.parentElement;
        toolbar.classList.add('release-workspace-toolbar');
        toolbar.lastElementChild.classList.add('release-workspace-selection-actions');
        chips.style.flexWrap = 'wrap';
        chips.style.minWidth = '0';
        chips.style.overflow = 'visible';
        chips.replaceChildren();
        for (const filter of ['all', 'draft', 'released']) {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.dataset.filter = filter;
            chip.className = 'quiz-storage-filter-chip';
            chip.style.whiteSpace = 'nowrap';
            const count = list.querySelectorAll(filter === 'all'
                ? '[data-release-state="draft"], [data-release-state="released"]'
                : '[data-release-state="' + filter + '"]').length;
            chip.textContent = (filter === 'all' ? 'All' : filter === 'draft' ? 'Draft' : 'Released') + ' (' + count + ')';
            chip.addEventListener('click', () => window.setTopicsAndMaterialsPickerFilter(filter));
            chips.append(chip);
        }

        const workspace = document.createElement('div');
        workspace.id = 'topics-materials-release-workspace';
        workspace.className = 'release-workspace';
        list.classList.remove('space-y-3');
        workspace.append(toolbar, list);
        section.replaceChildren(workspace);
        footer.style.justifyContent = 'space-between';
        footer.append(submit);
        picker.remove();
        window.filterTopicsAndMaterialsReleaseWorkspace('all');
        window.syncTopicsAndMaterialsPickerSubmitBtn?.();
    };

    window.filterTopicsAndMaterialsReleaseWorkspace = function (filter) {
        const workspace = document.querySelector('#teacher-release-assessments-overlay .release-workspace');
        if (!workspace) return false;
        workspace.querySelectorAll('.quiz-storage-filter-chip').forEach(chip => {
            chip.className = chip.dataset.filter === filter
                ? 'quiz-storage-filter-chip px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer bg-[#15803d] text-white shadow-2xs'
                : 'quiz-storage-filter-chip px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 bg-slate-100 text-black-fade hover:text-black hover:bg-slate-200/70';
        });
        workspace.querySelectorAll('.topic-picker-card').forEach(card => {
            let visible = false;
            card.querySelectorAll('[data-release-category]').forEach(row => {
                const show = filter === 'all' || row.dataset.releaseState === filter;
                row.style.display = show ? (row.matches('.release-item-row, .picker-item-row') ? 'flex' : '') : 'none';
                if (row.classList.contains('topic-picker-header') || row === card.firstElementChild) {
                    row.style.display = '';
                    const selection = row.querySelector('.topic-release-row');
                    if (selection) selection.style.display = show ? '' : 'none';
                    // A label must not toggle a hidden topic checkbox in a material filter.
                    row.style.pointerEvents = !show && row.tagName === 'LABEL' ? 'none' : '';
                }
                if (show && row.dataset.releaseState !== 'context') visible = true;
            });
            card.querySelectorAll('.topic-division-learning, .topic-division-assessments').forEach(division => {
                division.style.display = '';
            });
            card.style.display = visible ? '' : 'none';
        });
        return true;
    };
})();
