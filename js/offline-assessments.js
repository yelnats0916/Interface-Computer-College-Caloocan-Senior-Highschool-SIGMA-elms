(function () {
    const key = 'sigma-offline-assessments-v1';
    const read = () => JSON.parse(localStorage.getItem(key) || '[]');
    const normalize = value => String(value || '').replace(/^(card-|subj-)/i, '').trim().toLowerCase();
    const matchesSubject = (a, b) => (window.getUnifiedSubjectAliases?.(a) || [a]).some(alias => normalize(alias) === normalize(b));
    window.getOfflineAssessment = id => read().find(item => item.id === id);
    window.getOfflineAssessments = (subject, section, quarter, category) => read().filter(item =>
        matchesSubject(subject, item.subjectId) && normalize(section) === normalize(item.section)
        && Number(quarter) === item.quarter && category === item.category);
    window.readOfflineAssessmentScore = (student, item) => {
        const record = window.getOfflineAssessment(item.id);
        for (const alias of window.getStudentFullAliases?.(student) || [student.id]) {
            const value = record?.scores?.[alias];
            if (value !== undefined && value !== '') return Number(value);
        }
        return null;
    };
    window.readOfflineAssessmentStatus = (student, item) => {
        const record = window.getOfflineAssessment(item.id);
        for (const alias of window.getStudentFullAliases?.(student) || [student.id]) {
            if (record?.statuses?.[alias]) return record.statuses[alias];
        }
        return '';
    };
    window.openGradebookAssessmentPicker = function () {
        const state = window.sigmaGradesState;
        const scope = state?.selectedSubjectSection;
        if (!scope) return;
        const category = ['pt', 'perf. task'].includes(state.currentView) ? 'perf. task' : state.currentView === 'qa' ? 'qa' : 'ww';
        const items = window.getAdminGradebookAssessmentItems?.(category, state.activeQuarter || 1, scope.subject, scope.sectionName) || [];
        document.getElementById('offline-assessment-modal')?.remove();
        const modal = document.createElement('div'); modal.id = 'offline-assessment-modal'; modal.className = 'sigma-modal-overlay';
        modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true'); modal.setAttribute('aria-label', 'Assessment List');
        modal.classList.add('gb-assessment-picker-modal');
        modal.innerHTML = '<div class="sigma-modal-shell"><div class="sigma-modal-panel"><div class="sigma-modal-header"><h2 class="sigma-modal-title">Assessment List</h2><button type="button" data-close aria-label="Close"><i class="fa-solid fa-xmark"></i></button></div><div class="sigma-modal-body gb-assessment-picker-list"></div></div></div>';
        const previousFocus = document.activeElement;
        const close = () => { modal.remove(); document.removeEventListener('keydown', keyboard); previousFocus?.focus(); };
        const keyboard = event => {
            if (event.key === 'Escape') close();
            if (event.key === 'Tab') {
                const controls = [...modal.querySelectorAll('button')]; const first = controls[0], last = controls[controls.length - 1];
                if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
                else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
            }
        };
        const selected = (state.assessmentPage || 0) * 4 + (state.mobileAssessmentSlot || 0);
        items.forEach((item, index) => {
            const button = document.createElement('button'); button.type = 'button'; button.className = 'gb-assessment-picker-item';
            button.textContent = item.title || item.name;
            button.setAttribute('aria-current', String(index === selected));
            button.onclick = () => {
                state.assessmentPage = Math.floor(index / 4); state.mobileAssessmentSlot = index % 4;
                state.mobileAssessmentSummary = false; close(); window.renderAdminGradebookWorkspace?.();
            };
            modal.querySelector('.gb-assessment-picker-list').appendChild(button);
        });
        const add = document.createElement('button'); add.type = 'button'; add.className = 'gb-assessment-picker-item';
        add.innerHTML = '<i class="fa-solid fa-plus" aria-hidden="true"></i> Add Assessment';
        add.onclick = () => { close(); window.openOfflineAssessmentForm(); };
        modal.querySelector('.gb-assessment-picker-list').appendChild(add);
        modal.querySelector('[data-close]').onclick = close;
        document.body.appendChild(modal); document.addEventListener('keydown', keyboard); modal.querySelector('button').focus();
    };
    window.openOfflineAssessmentForm = function () {
        const state = window.sigmaGradesState;
        const scope = state?.selectedSubjectSection;
        const category = ['pt', 'perf. task'].includes(state?.currentView) ? 'perf. task' : state?.currentView === 'qa' ? 'qa' : 'ww';
        if (!scope) return;
        document.getElementById('offline-assessment-modal')?.remove();
        const modal = document.createElement('div');
        modal.id = 'offline-assessment-modal';
        modal.className = 'sigma-modal-overlay';
        modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true'); modal.setAttribute('aria-label', 'Add Assessment');
        modal.innerHTML = `<form class="sigma-modal-shell"><div class="sigma-modal-panel"><div class="sigma-modal-header"><h2 class="sigma-modal-title">Add Assessment</h2><button type="button" aria-label="Close" data-close><i class="fa-solid fa-xmark"></i></button></div><div class="sigma-modal-body"><p data-context></p><label>Title<input name="title" required maxlength="160" class="w-full border rounded-lg p-3"></label><label>HPS<input name="hps" type="number" min="1" max="100000" step="1" required class="w-full border rounded-lg p-3"></label><p role="alert"></p></div><div class="sigma-modal-footer"><button class="sigma-btn sigma-btn-primary" type="submit">Add Assessment</button></div></div></form>`;
        modal.querySelector('[name=title]').placeholder = 'Assessment title';
        modal.querySelector('[name=hps]').placeholder = 'Highest possible score';
        const titleInput = modal.querySelector('[name=title]');
        const hpsInput = modal.querySelector('[name=hps]');
        hpsInput.max = '100';
        hpsInput.inputMode = 'numeric';
        hpsInput.onkeydown = event => {
            if (['e', 'E', '+', '-', '.', ','].includes(event.key)) event.preventDefault();
        };
        const validate = () => {
            titleInput.setCustomValidity(titleInput.value.trim() ? '' : 'Enter an assessment title.');
            const raw = hpsInput.value;
            hpsInput.setCustomValidity(/^\d+$/.test(raw) && Number(raw) >= 1 && Number(raw) <= 100
                ? '' : 'Enter a whole number from 1 to 100.');
        };
        titleInput.oninput = validate;
        hpsInput.oninput = validate;
        modal.querySelector('[data-context]').textContent = new Date().toLocaleDateString('en-US', {
            timeZone: 'Asia/Manila', month: 'long', day: 'numeric', year: 'numeric'
        });
        const previousFocus = document.activeElement;
        const close = () => { modal.remove(); document.removeEventListener('keydown', keyboard); previousFocus?.focus(); };
        const keyboard = event => {
            if (event.key === 'Escape') close();
            if (event.key === 'Tab') {
                const controls = [...modal.querySelectorAll('button,input')];
                const first = controls[0], last = controls[controls.length - 1];
                if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
                else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
            }
        };
        modal.querySelector('[data-close]').onclick = close;
        modal.querySelector('form').onsubmit = event => {
            event.preventDefault();
            validate();
            if (!modal.querySelector('form').reportValidity()) return;
            const title = titleInput.value.trim().replace(/\s+/g, ' ');
            const max = Number(modal.querySelector('[name=hps]').value);
            if (!title || !Number.isInteger(max) || max < 1 || max > 100) return;
            try {
                const items = read();
                items.push({ id: `offline-${crypto.randomUUID()}`, title, max, points: max, category,
                    offline: true, subjectId: scope.subject, section: scope.sectionName, quarter: state.activeQuarter || 1,
                    createdAt: new Date().toISOString(), date: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }), scores: {} });
                localStorage.setItem(key, JSON.stringify(items));
                window.clearCategoryDetailsCache?.();
                close(); window.renderAdminGradebookWorkspace?.();
            } catch (_) { modal.querySelector('[role=alert]').textContent = 'Unable to save assessment. Please retry.'; }
        };
        document.body.appendChild(modal); document.addEventListener('keydown', keyboard);
        modal.querySelector('[name=title]').focus();
    };
    window.editOfflineAssessmentScore = function (cell) {
        const item = window.getOfflineAssessment(cell.dataset.itemId);
        if (!item) return false;
        if (cell.querySelector('input')) return true;
        const input = document.createElement('input');
        input.type = 'number'; input.min = '0'; input.max = String(item.max); input.step = '1';
        input.className = 'score-counter-input gb-open-score-counter';
        input.placeholder = ' ';
        input.autocomplete = 'off';
        input.inputMode = 'numeric';
        input.value = cell.dataset.score || ''; input.setAttribute('aria-label', `${item.title} score`);
        const restrict = () => {
            if (input.value === '') return;
            const value = Number(input.value);
            if (Number.isFinite(value)) input.value = String(Math.max(0, Math.min(Number(item.max), Math.trunc(value))));
        };
        input.oninput = restrict;
        input.onpaste = event => {
            const text = event.clipboardData?.getData('text').trim();
            if (text === undefined) return;
            event.preventDefault();
            if (text === '') { input.value = ''; return; }
            if (!/^\d+$/.test(text)) return;
            input.value = text;
            restrict();
        };
        let attendance = cell.dataset.attendance || '';
        const save = () => {
            if (input.validity.badInput) { input.reportValidity(); return; }
            const raw = input.value.trim(); const value = Number(raw);
            if (raw && (!Number.isInteger(value) || value < 0 || value > item.max)) { input.reportValidity(); return; }
            try {
                const items = read(); const record = items.find(row => row.id === item.id);
                record.scores[cell.dataset.studentId] = raw === '' ? '' : value;
                record.statuses = record.statuses || {};
                record.statuses[cell.dataset.studentId] = attendance;
                localStorage.setItem(key, JSON.stringify(items)); window.renderAdminGradebookWorkspace?.();
            } catch (_) { window.showToast?.('Score could not be saved.', 'error'); }
        };
        input.onblur = event => { if (!event.relatedTarget || !cell.contains(event.relatedTarget)) save(); };
        input.onkeydown = event => {
            if (['e', 'E', '+', '-', '.', ','].includes(event.key)) event.preventDefault();
            if (event.key === 'Enter') { event.preventDefault(); save(); }
        };
        const editor = document.createElement('div'); editor.className = 'gb-open-score-editor';
        editor.appendChild(input);
        input._saveManualScore = save;
        const controls = document.createElement('div'); controls.className = 'gb-open-status-row';
        for (const [tone, letter, label] of [['missing', 'M', 'Missing'], ['absent', 'A', 'Absent'], ['incomplete', 'I', 'Incomplete'], ['excuse', 'E', 'Excuse']]) {
            const button = document.createElement('button'); button.type = 'button'; button.textContent = letter;
            button.title = label; button.setAttribute('aria-label', label);
            button.className = `gb-open-status-btn gb-open-status-${letter.toLowerCase()}${attendance === tone ? ' is-active active-status' : ''}`;
            button.onclick = event => { event.stopPropagation(); attendance = attendance === tone ? '' : tone; save(); };
            controls.appendChild(button);
        }
        editor.appendChild(controls); cell.replaceChildren(editor); input.focus(); return true;
    };
})();
