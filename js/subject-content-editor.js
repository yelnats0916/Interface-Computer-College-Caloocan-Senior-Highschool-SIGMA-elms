/**
 * Shared Topics & Materials screen.
 *
 * Add and Edit both open this one list. Do not add a second topics list or a second materials list.
 *
 * One form each. Revise these functions in js/subject-editor.js, not a copy:
 * - Topic form: openTopicEditor, saveTopicFromEditor, handleTopicEditorBack
 * - Material form: addSubjectMaterial, renderMaterialEditorForm, performSaveMaterial
 * - Combined list: renderSubjectMaterials
 *
 * This file decides when that shared screen is used, and opens it.
 * Teacher Add / Edit calls openSharedTopicsAndMaterials. Admin Edit Topics & Materials uses the same screen through focus: 'content'.
 */
(function () {
    function usesCombinedSubjectContent() {
        const opts = window.subjectEditorOptions || {};
        if (opts.focus === 'info') return false;
        if (opts.focus === 'content') return true;
        if (typeof window.isCurrentEditorTeacher === 'function' && window.isCurrentEditorTeacher()) return false;
        return true;
    }

    window.usesCombinedSubjectContent = usesCombinedSubjectContent;

    function sharedContentSubjectId(explicitId) {
        if (explicitId) return explicitId;
        if (typeof window.currentClassroomSubject !== 'undefined' && window.currentClassroomSubject) {
            return window.currentClassroomSubject;
        }
        if (typeof window.resolveTeacherActiveSubjectId === 'function') {
            const resolved = window.resolveTeacherActiveSubjectId();
            if (resolved) return resolved;
        }
        const stateId = (typeof currentTopicState !== 'undefined' && currentTopicState && currentTopicState.subjectId)
            || (window.currentTopicState && window.currentTopicState.subjectId)
            || window.activeSubjectId
            || '';
        if (stateId) return stateId;
        const hash = String(window.location.hash || '').replace(/^#/, '');
        const card = hash.match(/^(?:topic-card|topic|topics):([^:]+)/);
        return card ? card[1] : '';
    }

    function sharedContentSection(options) {
        const opts = options || {};
        if (opts.section || opts.selectedSection) return opts.section || opts.selectedSection;
        if (typeof window.currentClassroomSectionName !== 'undefined' && window.currentClassroomSectionName) {
            return window.currentClassroomSectionName;
        }
        if (typeof currentClassroomSectionName !== 'undefined' && currentClassroomSectionName) {
            return currentClassroomSectionName;
        }
        if (typeof currentTopicState !== 'undefined' && currentTopicState && currentTopicState.selectedSection) {
            return currentTopicState.selectedSection;
        }
        if (typeof window.currentTopicState !== 'undefined' && window.currentTopicState && window.currentTopicState.selectedSection) {
            return window.currentTopicState.selectedSection;
        }
        if (typeof window.resolveTeacherActiveSection === 'function') {
            const resolved = window.resolveTeacherActiveSection();
            if (resolved) return resolved;
        }
        try {
            return localStorage.getItem('sigma-active-classroom-section') || '';
        } catch (err) {
            return '';
        }
    }

    window.openSharedTopicsAndMaterials = function (options) {
        const opts = options || {};
        const subjectId = sharedContentSubjectId(opts.subjectId);
        if (!subjectId || typeof window.openSubjectEditor !== 'function') return;
        const section = sharedContentSection(opts);
        window.activeCurriculumScope = 'master';
        window.activeCurriculumScopeLabel = 'Master Syllabus';
        window.openSubjectEditor(subjectId, 3, {
            standalone: true,
            focus: 'content',
            title: 'Add/Edit Topics & Materials',
            hideBars: true,
            section: section,
            selectedSection: section,
            onBack: opts.onBack || null,
            onExit: opts.onExit || null,
            onSave: opts.onSave || null
        });
    };

    window.subjectContentNextStep = function () {
        return usesCombinedSubjectContent() ? 3 : 2;
    };

    window.subjectContentBackStep = function () {
        if ((window.subjectEditorOptions || {}).focus === 'content') return 'close';
        return usesCombinedSubjectContent() ? 1 : 2;
    };

    window.subjectContentAfterTopicForm = function () {
        return usesCombinedSubjectContent() ? 3 : 2;
    };

    function quarterTopics() {
        const norm = typeof window.normalizeQuarterKey === 'function' ? window.normalizeQuarterKey : function (v) { return String(v || 'q1').toLowerCase(); };
        const quarter = norm(window.currentSubjectMaterialQuarter || window.currentSubjectTopicQuarter || 'q1');
        const all = Array.isArray(window.currentSubjectAllTopics) && window.currentSubjectAllTopics.length
            ? window.currentSubjectAllTopics
            : (window.currentSubjectTopics || []);
        const list = all.filter(function (t) {
            return t && t.id !== '_unassigned' && norm(t.quarter || quarter) === quarter;
        });
        return { norm: norm, quarter: quarter, all: all.slice(), list: list };
    }

    function escapeOrderText(value) {
        return String(value || '').replace(/[&<>"']/g, function (ch) {
            return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
        });
    }

    function visibleQuarterTopicCount() {
        const visible = Array.isArray(window.currentVisibleQuarterTopics) ? window.currentVisibleQuarterTopics : [];
        return visible.filter(function (topic) { return topic && topic.id !== '_unassigned'; }).length;
    }

    window.syncTopicReorderLock = function () {
        const btn = document.getElementById('subject-content-reorder-btn');
        if (!btn) return;
        const locked = visibleQuarterTopicCount() < 2;
        btn.disabled = locked;
        btn.setAttribute('aria-disabled', locked ? 'true' : 'false');
        btn.title = locked ? 'Add at least two topics in this quarter to reorder' : 'Reorder topics';
        btn.classList.toggle('opacity-40', locked);
        btn.classList.toggle('cursor-not-allowed', locked);
        btn.classList.toggle('cursor-pointer', !locked);
        btn.classList.toggle('hover:bg-slate-100', !locked);
        btn.classList.toggle('active:bg-slate-200', !locked);
        btn.classList.toggle('hover:border-slate-300', !locked);
    };

    window.openTopicOrderPanel = function () {
        if (visibleQuarterTopicCount() < 2) {
            window.syncTopicReorderLock();
            return;
        }
        const pack = quarterTopics();
        const labels = window.QUARTER_LABELS || {};
        const quarterLabel = labels[pack.quarter] || pack.quarter;
        const visible = Array.isArray(window.currentVisibleQuarterTopics) ? window.currentVisibleQuarterTopics : null;
        let order = (visible && visible.length ? visible : pack.list).filter(function (t) { return t && t.id !== '_unassigned'; }).slice();
        let panel = document.getElementById('topic-order-panel');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'topic-order-panel';
            panel.className = "fixed inset-0 hidden items-center justify-center bg-black/40 p-4 font-['Inter']";
            panel.style.zIndex = '11000';
            document.body.appendChild(panel);
        }

        const close = function () {
            panel.classList.add('hidden');
            panel.classList.remove('flex');
        };

        const paint = function () {
            const rows = order.map(function (topic, index) {
                const options = order.map(function (_, n) {
                    const num = n + 1;
                    return '<option value="' + num + '"' + (num === index + 1 ? ' selected' : '') + '>' + num + '</option>';
                }).join('');
                return ''
                    + '<div class="flex items-center gap-2.5 sm:gap-3 px-2.5 py-2 sm:px-3 sm:py-3 rounded-xl hover:bg-slate-50 sm:hover:bg-slate-100 transition-colors">'
                    + '<div class="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-[#15803d] text-white flex items-center justify-center text-[11px] sm:text-xs font-bold shrink-0">' + (index + 1) + '</div>'
                    + '<div class="flex-1 min-w-0 text-xs sm:text-sm font-semibold sm:font-bold text-black leading-snug break-words sm:truncate" style="display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; white-space: normal; word-break: break-word;">' + escapeOrderText(topic.title || 'Untitled Topic') + '</div>'
                    + '<label class="text-[11px] sm:text-xs font-medium sm:font-semibold text-black-fade shrink-0 flex items-center gap-1.5 sm:gap-2 ml-1 sm:ml-2">Place<select data-from="' + index + '" class="h-7 sm:h-9 px-2 sm:px-2.5 bg-white border border-slate-200 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold sm:font-bold text-black cursor-pointer hover:bg-slate-100 focus:outline-none focus:border-[#15803d]">' + options + '</select></label>'
                    + '</div>';
            }).join('');
            panel.classList.remove('hidden');
            panel.classList.add('flex');
            panel.innerHTML = ''
                + '<div class="w-full max-w-sm sm:max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">'
                + '<div class="px-5 pt-4 pb-2 sm:px-6 sm:pt-6 sm:pb-3">'
                + '<h2 class="text-base sm:text-lg font-bold text-black tracking-tight">Reorder Topics</h2>'
                + '<p class="text-[11px] sm:text-xs font-medium text-black-fade mt-0.5 sm:mt-1 leading-relaxed">Choose which topic becomes 1, 2, 3, and so on for ' + escapeOrderText(quarterLabel) + '.</p>'
                + '</div>'
                + '<div class="px-2.5 pb-2 sm:px-3 sm:pb-3 max-h-[20rem] sm:max-h-[24rem] overflow-y-auto space-y-0.5">' + (rows || '<p class="px-3 py-6 sm:py-8 text-center text-xs sm:text-sm font-medium sm:font-bold text-black-fade font-[\'Inter\']">Add at least two topics in this quarter first</p>') + '</div>'
                + '<div class="px-4 py-3 sm:px-6 sm:py-4 border-t border-slate-100 flex items-center justify-end gap-2">'
                + '<button type="button" data-close class="h-8 px-3.5 sm:h-10 sm:px-4 rounded-lg sm:rounded-xl bg-slate-100 hover:bg-slate-200 text-xs sm:text-sm font-semibold sm:font-bold text-black cursor-pointer transition-colors">Cancel</button>'
                + '<button type="button" data-save class="h-8 px-4 sm:h-10 sm:px-5 rounded-lg sm:rounded-xl bg-[#15803d] hover:bg-[#14532d] active:bg-[#14532d] text-xs sm:text-sm font-semibold sm:font-bold text-white cursor-pointer transition-colors shadow-none"' + (order.length < 2 ? ' disabled' : '') + '>Save Order</button>'
                + '</div></div>';
            panel.querySelector('[data-close]').onclick = close;
            panel.onclick = function (event) { if (event.target === panel) close(); };
            const saveBtn = panel.querySelector('[data-save]');
            saveBtn.onclick = function () {
                if (order.length < 2) return;
                const visibleIds = {};
                order.forEach(function (t) { visibleIds[String(t.id)] = true; });
                let cursor = 0;
                const source = Array.isArray(window.currentSubjectAllTopics) && window.currentSubjectAllTopics.length
                    ? window.currentSubjectAllTopics
                    : pack.all;
                window.currentSubjectAllTopics = source.map(function (topic) {
                    if (!topic || !visibleIds[String(topic.id)]) return topic;
                    return order[cursor++] || topic;
                });
                window.currentSubjectTopics = window.currentSubjectAllTopics.slice();
                if (typeof window.syncCurrentSubjectEditorToStorage === 'function') window.syncCurrentSubjectEditorToStorage();
                if (typeof window.renderSubjectMaterials === 'function') window.renderSubjectMaterials();
                close();
            };
            panel.querySelectorAll('[data-from]').forEach(function (select) {
                select.onchange = function () {
                    const from = Number(select.getAttribute('data-from'));
                    const to = Number(select.value) - 1;
                    if (from === to || to < 0 || to >= order.length) return;
                    const moved = order.splice(from, 1)[0];
                    order.splice(to, 0, moved);
                    paint();
                };
            });
        };

        paint();
    };

    window.subjectContentStepLabel = function () {
        return 'Add Topics & Materials';
    };
})();
