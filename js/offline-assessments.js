(function () {
    // The signed-in database snapshot is authoritative; a device cache cannot create school records.
    let records = [], readyFor = '', refreshing = null, revision = 0, writes = 0, queue = Promise.resolve();
    const scoreQueues = new Map();
    const scoreEdits = new Map();
    let scoreNotifyTimer;
    const actor = () => { try { return String(JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}').id || ''); } catch (_) { return ''; } };
    const read = () => readyFor === actor() && readyFor ? records : [];
    const scoreEditKey = (id, studentId) => JSON.stringify([actor(), id, String(studentId).replace(/^std-/i, '')]);
    function paintScoreEdit(cell, edit) {
        if (!cell?.isConnected || edit.owner !== actor()) return;
        if (cell.dataset.manualSaveToken === edit.token && cell.querySelector('[data-manual-save-status]')) return;
        cell.dataset.manualSaveToken = edit.token;
        cell.setAttribute('aria-busy', String(edit.state === 'saving'));
        cell.title = edit.state === 'saving' ? 'Saving score…' : edit.error;
        const stack = document.createElement('div'); stack.className = 'gb-score-stack';
        const value = document.createElement('span'); value.className = edit.score === '' ? 'gradebook-dash' : 'gradebook-score-value';
        value.textContent = edit.score === '' ? '-' : String(edit.score); stack.appendChild(value);
        const status = document.createElement(edit.state === 'failed' ? 'button' : 'span');
        status.dataset.manualSaveStatus = edit.state;
        status.style.cssText = 'display:block;font-size:10px;line-height:1.3;font-weight:500;color:#64748b';
        if (edit.state === 'failed') {
            status.type = 'button'; status.textContent = 'Not saved · Retry'; status.style.color = '#b91c1c';
            status.onclick = event => { event.stopPropagation(); edit.retry(); };
        } else { status.textContent = 'Saving…'; status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite'); }
        stack.appendChild(status); cell.replaceChildren(stack);
    }
    function paintScoreEdits() {
        if (!scoreEdits.size) return;
        document.querySelectorAll('td[data-item-id][data-student-id]').forEach(cell => {
            const edit = scoreEdits.get(scoreEditKey(cell.dataset.itemId, cell.dataset.studentId));
            if (edit) paintScoreEdit(cell, edit);
        });
    }
    if (typeof MutationObserver !== 'undefined' && document.documentElement) {
        new MutationObserver(paintScoreEdits).observe(document.documentElement, { childList: true, subtree: true });
    }
    window.addEventListener('beforeunload', event => {
        if (window.SigmaSessionNavigation?.isSigningOut?.()) return;
        if (![...scoreEdits.values()].some(edit => edit.owner === actor())) return;
        event.preventDefault(); event.returnValue = '';
    });
    const endpoint = () => location.port && !['80', '443'].includes(location.port) && ['localhost', '127.0.0.1'].includes(location.hostname)
        ? 'http://localhost/sigma-elms/php/api/manual_assessments.php'
        : new URL('php/api/manual_assessments.php', location.href).href;
    const notify = () => {
        window.clearCategoryDetailsCache?.();
        if (document.getElementById('admin-gradebook-spreadsheet')) window.renderAdminGradebookWorkspace?.();
        window.dispatchEvent(new CustomEvent('sigma-gradebook-updated', { detail: { remote: true, manual: true } }));
    };
    const notifyScore = () => {
        window.clearCategoryDetailsCache?.();
        clearTimeout(scoreNotifyTimer);
        scoreNotifyTimer = setTimeout(function update() {
            // Keep another student's open editor intact during rapid entry.
            if (writes || document.querySelector('.gb-open-score-editor input')) {
                scoreNotifyTimer = setTimeout(update, 250); return;
            }
            notify();
        }, 50);
    };
    async function request(input) {
        const owner = actor();
        if (!owner || !window.SigmaDatabase?.fetch) throw new Error('Sign in to connect manual assessments to the database.');
        const response = await window.SigmaDatabase.fetch(endpoint(), {
            method: input ? 'POST' : 'GET', credentials: 'include', cache: 'no-store',
            headers: { 'Content-Type': 'application/json' }, foreground: !!input, autoReconnect: false,
            timeoutMs: input ? 45000 : 15000, ...(input ? { body: JSON.stringify(input) } : {})
        });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || 'Manual assessment could not be saved.');
        if (owner !== actor() || String(data.userId) !== owner) throw new Error('The signed-in account changed. Reopen the gradebook.');
        return data;
    }
    async function refresh() {
        if (readyFor && readyFor !== actor()) { records = []; readyFor = ''; notify(); }
        if (!actor() || !window.SigmaDatabase?.fetch) return;
        if (refreshing) return refreshing;
        const started = revision;
        refreshing = request().then(data => {
            if (started !== revision || writes) return;
            const changed = readyFor !== data.userId || JSON.stringify(records) !== JSON.stringify(data.records);
            records = data.records || []; readyFor = String(data.userId);
            if (changed) notify();
        }).catch(error => { console.warn('Manual assessment sync:', error.message); }).finally(() => { refreshing = null; });
        return refreshing;
    }
    async function persist(input, options = {}) {
        revision++; writes++;
        const owner = actor();
        const scoreKey = input.action === 'score' ? JSON.stringify([input.id, input.studentId]) : null;
        const before = scoreKey ? Promise.all([queue.catch(() => {}), (scoreQueues.get(scoreKey) || Promise.resolve()).catch(() => {})]) : Promise.all([queue.catch(() => {}), ...[...scoreQueues.values()].map(task => task.catch(() => {}))]);
        const task = before.then(async () => {
            if (owner !== actor()) throw new Error('The signed-in account changed. Reopen the gradebook.');
            const data = await request(scoreKey ? { ...input, response: 'score' } : input);
            if (data.savedScore) {
                const saved = data.savedScore;
                const record = records.find(item => item.id === saved.id && item.subjectId === saved.subjectId && item.sectionId === saved.sectionId);
                if (!record || saved.id !== input.id || String(saved.studentId) !== String(input.studentId).replace(/^std-/i, '')) throw new Error('The saved score could not be matched. Refresh the gradebook.');
                record.scores = { ...record.scores, [saved.studentId]: saved.score };
                record.statuses = { ...record.statuses, [saved.studentId]: saved.status };
            } else if (input.action === 'delete' && data.deletedAssessmentId === input.id) {
                records = records.filter(item => item.id !== input.id);
            } else if (data.savedAssessment) {
                const saved = data.savedAssessment;
                if (saved.id !== input.id || !saved.subjectId || !saved.sectionId) throw new Error('The saved assessment could not be matched. Refresh the gradebook.');
                const index = records.findIndex(item => item.id === saved.id && item.subjectId === saved.subjectId && item.sectionId === saved.sectionId);
                if (index >= 0) records[index] = { ...records[index], ...saved };
                else records.push(saved);
            } else {
                if (!Array.isArray(data.records)) throw new Error('The saved assessment could not be confirmed. Please retry.');
                records = data.records;
            }
            readyFor = String(data.userId); revision++;
            if (!options.deferNotify) { if (scoreKey) notifyScore(); else notify(); }
            return data;
        });
        if (scoreKey) scoreQueues.set(scoreKey, task); else queue = task;
        try { return await task; } finally { writes--; if (scoreKey && scoreQueues.get(scoreKey) === task) scoreQueues.delete(scoreKey); }
    }
    window.SigmaManualAssessments = { refresh, save: persist };
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refresh);
    else refresh();
    const normalize = value => String(value || '').replace(/^(card-|subj-)/i, '').trim().toLowerCase();
    const matchesSubject = (a, b) => (window.getUnifiedSubjectAliases?.(a) || [a]).some(alias => normalize(alias) === normalize(b));
    window.getOfflineAssessment = id => read().find(item => item.id === id);
    window.getOfflineAssessments = (subject, section, quarter, category) => read().filter(item =>
        matchesSubject(subject, item.subjectId) && [item.section, item.sectionId].some(value => normalize(section) === normalize(value))
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
        const list = modal.querySelector('.gb-assessment-picker-list');
        const heading = modal.querySelector('.sigma-modal-title');
        const topics = new Map();
        const manual = [];
        items.forEach((item, index) => {
            const rawTopic = item.topicIdx ?? item.rawItem?.topicIdx;
            const topicNumber = rawTopic !== undefined && rawTopic !== null && rawTopic !== ''
                ? Number(rawTopic) + 1 : Number(item.topicNumber);
            const entry = { item, index };
            if (item.offline || !Number.isInteger(topicNumber) || topicNumber < 1) {
                manual.push(entry);
            } else {
                if (!topics.has(topicNumber)) topics.set(topicNumber, []);
                topics.get(topicNumber).push(entry);
            }
        });
        const topicNumbers = [...topics.keys()].sort((a, b) => a - b);
        const appendAction = (text, onClick) => {
            const button = document.createElement('button'); button.type = 'button'; button.className = 'gb-assessment-picker-item';
            button.textContent = text;
            button.onclick = onClick;
            list.appendChild(button);
            return button;
        };
        const appendAssessment = ({ item, index }) => {
            const button = appendAction(item.title || item.name, () => {
                state.assessmentPage = Math.floor(index / 4); state.mobileAssessmentSlot = index % 4;
                state.mobileAssessmentSummary = false; close(); window.renderAdminGradebookWorkspace?.();
            });
            button.textContent = item.title || item.name;
            button.setAttribute('aria-current', String(index === selected));
        };
        const appendAdd = () => {
            const add = appendAction('Add Assessment', () => { close(); window.openOfflineAssessmentForm(); });
            add.innerHTML = '<i class="fa-solid fa-plus" aria-hidden="true"></i> Add Assessment';
        };
        const setHeading = text => {
            heading.textContent = text;
            modal.setAttribute('aria-label', text);
            list.replaceChildren();
        };
        const renderTopic = number => {
            setHeading(number === null ? 'Assessment List — Manual' : `Assessment List — Topic ${number}`);
            if (topicNumbers.length > 1) appendAction('Back to Topics', () => { renderTopics(); list.querySelector('button')?.focus(); });
            (number === null ? manual : topics.get(number) || []).forEach(appendAssessment);
            // Manual assessments have no topic; keep them separately labelled.
            if (number !== null && topicNumbers.length === 1 && manual.length) {
                const label = document.createElement('h3');
                label.textContent = 'Manual Assessments';
                label.className = 'text-sm font-semibold text-black mt-3 mb-1';
                list.appendChild(label);
                manual.forEach(appendAssessment);
            }
            appendAdd();
        };
        const renderTopics = () => {
            setHeading('Assessment List — Select Topic');
            topicNumbers.forEach(number => appendAction(`Topic ${number}`, () => {
                renderTopic(number); list.querySelector('button')?.focus();
            }));
            if (manual.length) appendAction('Manual Assessments', () => { renderTopic(null); list.querySelector('button')?.focus(); });
            appendAdd();
        };
        if (topicNumbers.length > 1) renderTopics();
        else renderTopic(topicNumbers[0] ?? null);
        modal.querySelector('[data-close]').onclick = close;
        document.body.appendChild(modal); document.addEventListener('keydown', keyboard); modal.querySelector('button').focus();
    };
    window.openOfflineAssessmentMenu = function (event, id) {
        event.stopPropagation();
        document.getElementById('offline-assessment-menu')?.remove();
        const menu = document.createElement('div');
        menu.id = 'offline-assessment-menu';
        menu.setAttribute('role', 'menu');
        menu.className = 'gb-manual-assessment-menu';
        menu.innerHTML = '<button type="button" role="menuitem" data-edit><i class="fa-solid fa-pen" aria-hidden="true"></i><span>Edit</span></button><button type="button" role="menuitem" data-delete><i class="fa-solid fa-trash-can" aria-hidden="true"></i><span>Delete</span></button>';
        const trigger = event.currentTarget;
        const rect = (trigger.closest('th') || trigger).getBoundingClientRect();
        const close = () => { menu.remove(); document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', keyboard); };
        const outside = e => { if (!menu.contains(e.target)) close(); };
        const keyboard = e => { if (e.key === 'Escape') { close(); trigger.focus(); } };
        menu.querySelector('[data-edit]').onclick = () => { close(); window.openOfflineAssessmentForm(id); };
        menu.querySelector('[data-delete]').onclick = async () => {
            close();
            const item = window.getOfflineAssessment(id);
            if (!item || !window.confirm(`Delete "${item.title}" and all its scores? This cannot be undone.`)) return;
            try { await persist({ action: 'delete', id, subjectId: item.subjectId, section: item.sectionId || item.section }); }
            catch (error) { window.showToast?.(error.message, 'error'); }
        };
        document.body.append(menu);
        const size = menu.getBoundingClientRect();
        menu.style.left = `${Math.max(8, Math.min(rect.right - size.width, innerWidth - size.width - 8))}px`;
        menu.style.top = `${Math.max(8, rect.bottom + size.height + 4 <= innerHeight - 8 ? rect.bottom + 4 : rect.top - size.height - 4)}px`;
        document.addEventListener('pointerdown', outside);
        document.addEventListener('keydown', keyboard);
        menu.querySelector('button').focus();
    };
    window.openOfflineAssessmentForm = function (id) {
        const existing = id ? window.getOfflineAssessment(id) : null;
        if (id && !existing) return;
        const state = window.sigmaGradesState;
        const scope = state?.selectedSubjectSection;
        const category = existing?.category || (['pt', 'perf. task'].includes(state?.currentView) ? 'perf. task' : state?.currentView === 'qa' ? 'qa' : 'ww');
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
        if (existing) {
            modal.setAttribute('aria-label', 'Edit Assessment');
            modal.querySelector('h2').textContent = 'Edit Assessment';
            modal.querySelector('[type=submit]').textContent = 'Save Changes';
            titleInput.value = existing.title;
            hpsInput.value = existing.max;
        }
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
        const newId = existing?.id || `offline-${crypto.randomUUID()}`;
        let saving = false;
        modal.querySelector('form').onsubmit = async event => {
            event.preventDefault();
            if (saving) return;
            validate();
            if (!modal.querySelector('form').reportValidity()) return;
            const title = titleInput.value.trim().replace(/\s+/g, ' ');
            const max = Number(modal.querySelector('[name=hps]').value);
            if (!title || !Number.isInteger(max) || max < 1 || max > 100) return;
            const button = modal.querySelector('[type=submit]'); const label = button.textContent;
            saving = true; button.disabled = true; button.textContent = 'Saving…'; button.setAttribute('aria-busy', 'true');
            modal.querySelector('[role=alert]').textContent = '';
            try {
                await persist({ action: existing ? 'update' : 'create', id: newId, title, max, category,
                    subjectId: existing?.subjectId || scope.subject, section: existing?.sectionId || scope.sectionName,
                    quarter: Number(existing?.quarter || state.activeQuarter || 1) }, { deferNotify: true });
                const items = window.getAdminGradebookAssessmentItems?.(category, Number(existing?.quarter || state.activeQuarter || 1), scope.subject, scope.sectionName) || [];
                const index = items.findIndex(item => item.id === newId);
                if (index >= 0) { state.assessmentPage = Math.floor(index / 4); state.mobileAssessmentSlot = index % 4; }
                close(); window.renderAdminGradebookWorkspace?.();
            } catch (error) { modal.querySelector('[role=alert]').textContent = error.message || 'Unable to save assessment. Please retry.'; }
            finally { saving = false; button.disabled = false; button.textContent = label; button.removeAttribute('aria-busy'); }
        };
        document.body.appendChild(modal); document.addEventListener('keydown', keyboard);
        modal.querySelector('[name=title]').focus();
    };
    window.editOfflineAssessmentScore = function (cell) {
        const item = window.getOfflineAssessment(cell.dataset.itemId);
        if (!item) return false;
        const editKey = scoreEditKey(item.id, cell.dataset.studentId);
        const previousEdit = scoreEdits.get(editKey);
        if (previousEdit?.state === 'saving') { paintScoreEdit(cell, previousEdit); return true; }
        if (previousEdit) { scoreEdits.delete(editKey); delete cell.dataset.manualSaveToken; cell.removeAttribute('aria-busy'); }
        if (cell.querySelector('input')) return true;
        const input = document.createElement('input');
        input.name = 'manual-assessment-score';
        input.type = 'number'; input.min = '0'; input.max = String(item.max); input.step = '1';
        input.className = 'score-counter-input gb-open-score-counter';
        input.placeholder = ' ';
        input.autocomplete = 'off';
        input.inputMode = 'numeric';
        input.value = previousEdit ? previousEdit.score : (cell.dataset.score || ''); input.setAttribute('aria-label', `${item.title} score`);
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
        let attendance = previousEdit ? previousEdit.attendance : (cell.dataset.attendance || '');
        let saving = false;
        let committed = false;
        const display = (target = cell) => {
            committed = true;
            input.onblur = null;
            delete target.dataset.manualSaveToken; target.removeAttribute('aria-busy');
            const saved = window.getOfflineAssessment(item.id);
            const studentId = String(target.dataset.studentId).replace(/^std-/i, '');
            const score = saved?.scores?.[studentId] ?? '';
            const tone = saved?.statuses?.[studentId] || '';
            target.dataset.score = String(score); target.dataset.attendance = tone;
            for (const status of ['missing', 'absent', 'incomplete', 'excuse']) {
                target.classList.toggle(`gb-cell-${status}`, status === tone);
                target.classList.toggle(`gradebook-status-${status}`, status === tone);
            }
            if (window.gradebookAttendanceCellStyle) target.style.cssText = tone ? window.gradebookAttendanceCellStyle({ tone }) : '';
            target.title = tone ? tone[0].toUpperCase() + tone.slice(1) : `0 to ${item.max}`;
            const stack = document.createElement('div'); stack.className = 'gb-score-stack';
            const label = document.createElement('span'); label.className = score === '' ? 'gradebook-dash' : 'gradebook-score-value';
            label.textContent = score === '' ? '-' : String(score); stack.appendChild(label); target.replaceChildren(stack);
        };
        const save = async () => {
            if (saving || committed) return;
            if (input.validity.badInput) { input.reportValidity(); return; }
            const raw = input.value.trim(); const value = Number(raw);
            if (raw && (!Number.isInteger(value) || value < 0 || value > item.max)) { input.reportValidity(); return; }
            if (!previousEdit && (raw === '' ? '' : String(value)) === String(cell.dataset.score || '') && attendance === (cell.dataset.attendance || '')) { display(); return; }
            saving = true; committed = true; input.onblur = null;
            const edit = { owner: actor(), score: raw === '' ? '' : value, attendance, state: 'saving', token: crypto.randomUUID() };
            const send = async () => {
                if (scoreEdits.get(editKey) !== edit || edit.owner !== actor()) return;
                edit.state = 'saving'; edit.token = crypto.randomUUID(); paintScoreEdit(cell, edit); paintScoreEdits();
                try {
                    await persist({ action: 'score', id: item.id, subjectId: item.subjectId, section: item.sectionId || item.section,
                        studentId: cell.dataset.studentId, score: edit.score, status: edit.attendance });
                    if (scoreEdits.get(editKey) === edit) {
                        scoreEdits.delete(editKey);
                        if (cell.isConnected && edit.owner === actor()) display();
                        // A live update may have replaced the original cell while saving.
                        document.querySelectorAll('td[data-manual-save-token]').forEach(current => {
                            if (current.dataset.manualSaveToken === edit.token && current !== cell) {
                                display(current);
                            }
                        });
                        notifyScore();
                    }
                } catch (error) {
                    if (scoreEdits.get(editKey) !== edit) return;
                    edit.state = 'failed'; edit.error = error.message || 'Score could not be saved. Please retry.'; edit.token = crypto.randomUUID();
                    paintScoreEdit(cell, edit); paintScoreEdits();
                    window.showToast?.(edit.error, 'error');
                } finally { saving = false; }
            };
            edit.retry = () => { if (edit.state === 'failed') return send(); };
            scoreEdits.set(editKey, edit);
            // Close the counter synchronously; the visible status stays pending
            // until the server acknowledges. Other students remain editable.
            paintScoreEdit(cell, edit);
            await send();
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
