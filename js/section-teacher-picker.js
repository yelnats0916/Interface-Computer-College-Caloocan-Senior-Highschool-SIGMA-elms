(function () {
    'use strict';
    const page = document.getElementById('section-subpage-teacher');
    if (!page) return;
    const field = page.querySelector('.sigma-field-group');
    const aside = document.createElement('aside');
    aside.className = 'section-teacher-picker-sidebar';
    page.prepend(aside);
    field.classList.add('section-teacher-picker-search');
    const roleSelect = document.getElementById('section-subpage-teacher-role');
    if (roleSelect) roleSelect.parentElement.parentElement.style.display = 'none';
    const esc = value => window.escapeHtml(String(value ?? ''));
    const copy = value => JSON.parse(JSON.stringify(value));
    const nameOf = person => typeof person === 'string' ? person : person?.name || person?.fullName || [person?.firstName, person?.lastName].filter(Boolean).join(' ');
    const shortName = person => window.formatSectionTeacherDisplayName(person);
    const sections = () => window.getStoredJson(window.SECTIONS_STORAGE_KEY || 'sigma-admin-sections', []);
    const identity = () => ({name:document.getElementById('edit-section-name')?.value, grade:document.getElementById('edit-section-grade')?.value, schoolYear:document.getElementById('edit-section-school-year')?.value});
    const groupKey = () => window.sectionAdviserGroupKey(identity());
    window.sectionAdviserEdits = new Map();
    const originalOverlay = window.toggleSectionOverlay;
    window.toggleSectionOverlay = function(show, ...args) {
        if(show) window.sectionAdviserEdits.clear();
        return originalOverlay.call(this,show,...args);
    };
    let adviser = null;
    let mode = 'teachers';
    let query = '';
    let results = [];
    let selectionPage = false;
    let selectionSnapshot = [];
    let draftAdviser = null;
    const originalOpen = window.openSectionSubpage;
    const originalConfirm = window.confirmSectionSubpage;
    const originalClose = window.closeSectionSubpage;
    const cancelSelection = document.createElement('button');
    cancelSelection.type = 'button';
    cancelSelection.className = 'sigma-btn sigma-btn-white sigma-btn-md hidden';
    cancelSelection.textContent = 'Cancel';
    document.getElementById('section-subpage-confirm-btn').before(cancelSelection);
    function returnToSummary(cancel) {
        if (cancel && mode === 'teachers') window.stagedSectionTeachers = copy(selectionSnapshot);
        selectionPage = false;
        query = '';
        render();
    }
    cancelSelection.onclick = () => returnToSummary(true);
    function openSelection(nextMode) {
        mode = nextMode;
        selectionPage = true;
        selectionSnapshot = copy(staged());
        draftAdviser = adviser ? copy(adviser) : null;
        query = '';
        document.getElementById('section-subpage-teacher-search').value = '';
        render(); search();
    }
    function resolveAdviser() {
        const key = groupKey();
        if (window.sectionAdviserEdits.has(key)) return copy(window.sectionAdviserEdits.get(key));
        const current = (window.selectedSectionTeachers || []).find(t => t.role === 'Adviser');
        if (current) return copy(current);
        for (const section of sections().filter(s => window.sectionAdviserGroupKey(s) === key)) {
            const teacher = (Array.isArray(section.teachers) ? section.teachers : []).find(t => t?.role === 'Adviser');
            if (teacher) return copy(teacher);
            if (section.adviser) return {name:section.adviser,id:section.adviserId || ''};
        }
        return null;
    }
    function staged() { return window.stagedSectionTeachers || []; }
    function same(a,b) { return window.sameSectionTeacher(a,b); }
    function notify(message) { window.showAlertDialog?.('Teacher Assignment', message); }
    function renderSidebar() {
        const teachers = staged();
        const section = identity();
        const subject = document.getElementById('edit-section-subject')?.value || 'Current subject';
        aside.innerHTML = `<section><h3>Section Adviser</h3><p class="section-teacher-picker-context">${esc(section.name)} · ${esc(section.grade)}<br>${esc(section.schoolYear)}</p><p class="section-teacher-picker-name">${adviser ? esc(shortName(adviser)) : '<span class="section-teacher-picker-muted">No section adviser assigned</span>'}</p><button type="button" class="section-teacher-picker-action" data-adviser>${adviser ? 'Change Adviser' : 'Assign Adviser'}</button></section><section><h3>Subject Teachers <span class="section-teacher-picker-muted">${teachers.length}/2</span></h3><p class="section-teacher-picker-context">${esc(subject)}</p><div>${teachers.map((t,i)=>`<div class="section-teacher-picker-selected"><div class="section-teacher-picker-person"><span title="${esc(nameOf(t))}">${esc(shortName(t))}</span><button type="button" data-remove="${i}" aria-label="Remove ${esc(shortName(t))}"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button></div><label><input type="radio" name="section-picker-lead" data-lead="${i}" ${t.isPrimary?'checked':''}> Lead Teacher</label></div>`).join('') || '<p class="section-teacher-picker-muted">No subject teachers selected</p>'}</div></section>`;
        const adviserSection = aside.querySelector('section');
        adviserSection.querySelector('.section-teacher-picker-context')?.remove();
        const sectionHeading = document.createElement('h2');
        sectionHeading.className = 'section-teacher-picker-section-title';
        const grade = String(section.grade || '').replace(/^grade\s*/i, '').trim();
        sectionHeading.textContent = `${section.name || 'Section'} - Grade ${grade}`;
        adviserSection.prepend(sectionHeading);
        if (adviser) {
            const adviserName = adviserSection.querySelector('.section-teacher-picker-name');
            adviserName.classList.add('section-teacher-picker-adviser');
            const profile = document.createElement('span');
            profile.className = 'section-teacher-picker-profile';
            profile.innerHTML = window.renderUserAvatarHtml(adviser, 'sm');
            adviserName.prepend(profile);
        }
        adviserSection.querySelector('h3')?.remove();
        const adviserAction = adviserSection.querySelector('[data-adviser]');
        sectionHeading.after(adviserAction);
        const subjectSection = aside.querySelector('section+section');
        subjectSection.querySelector('h3')?.remove();
        const selectTeachers = document.createElement('button');
        selectTeachers.type = 'button';
        selectTeachers.className = 'section-teacher-picker-action';
        selectTeachers.textContent = 'Select Teachers';
        subjectSection.prepend(selectTeachers);
        selectTeachers.onclick = () => openSelection('teachers');
        aside.querySelectorAll('.section-teacher-picker-person').forEach((row, i) => {
            const avatar = document.createElement('span');
            avatar.className = 'section-teacher-picker-profile';
            avatar.innerHTML = window.renderUserAvatarHtml(teachers[i], 'sm');
            row.prepend(avatar);
            row.querySelector('button').classList.add('section-teacher-picker-remove');
        });
        aside.querySelector('[data-adviser]').onclick = () => openSelection('adviser');
        aside.querySelectorAll('[data-remove]').forEach(btn => btn.onclick=()=>{
            const removed=teachers.splice(Number(btn.dataset.remove),1)[0];
            if (removed?.isPrimary && teachers.length) teachers[0].isPrimary=true;
            render(); search();
        });
        aside.querySelectorAll('[data-lead]').forEach(input=>input.onchange=()=>{
            teachers.forEach((t,i)=>t.isPrimary=i===Number(input.dataset.lead)); renderSidebar();
        });
    }
    const modeLabel = document.createElement('div');
    modeLabel.className='section-teacher-picker-mode';
    field.prepend(modeLabel);
    function render() {
        renderSidebar();
        aside.hidden = selectionPage;
        field.hidden = !selectionPage;
        cancelSelection.classList.toggle('hidden', !selectionPage);
        const title = document.getElementById('section-modal-title');
        if (title) title.textContent = !selectionPage ? 'Assign Teachers' : mode === 'adviser' ? 'Select Section Adviser' : 'Select Subject Teachers';
        modeLabel.textContent = mode === 'adviser' ? 'Choose one adviser for this section.' : `${staged().length}/2 teachers selected`;
        const chip=document.getElementById('section-subpage-teacher-selected-panel');
        chip?.classList.add('hidden');
        if(chip) chip.replaceChildren();
        const confirm=document.getElementById('section-subpage-confirm-btn');
        confirm.disabled=selectionPage && mode === 'adviser' ? !draftAdviser : staged().length===0;
        confirm.classList.toggle('opacity-50',confirm.disabled);
        confirm.classList.toggle('cursor-not-allowed',confirm.disabled);
        document.getElementById('section-subpage-confirm-label').textContent=!selectionPage ? 'Set Teachers' : mode === 'adviser' ? 'Set Adviser' : 'Use Selected Teachers';
    }
    function search() {
        const users=window.getStoredJson(window.USER_STORAGE_KEY || 'sigma-admin-users', []);
        const q=query.toLowerCase();
        results=users.filter(u=>/teach|faculty|instructor/i.test(String(u.type||u.role||''))).filter(u=>window.SigmaSearch.record(q,[u.uid,u.id],[nameOf(u),u.firstName,u.middleName,u.lastName,u.email]));
        const dropdown=document.getElementById('section-subpage-teacher-dropdown');
        dropdown.classList.remove('hidden');
        dropdown.innerHTML=results.map((u,i)=>{
            const candidate={...u,name:nameOf(u)};
            const selected=staged().some(t=>same(t,candidate));
            const conflict=mode==='teachers'&&!selected ? window.getTeacherScheduleConflict(candidate.name) : null;
            const disabled=Boolean(conflict || (mode==='teachers'&&!selected&&staged().length>=2));
            return `<div class="section-teacher-picker-result"><label>${mode==='teachers'?`<input type="checkbox" data-pick="${i}" ${selected?'checked':''} ${disabled?'disabled':''}>`:`<input type="radio" name="section-picker-adviser" data-pick-adviser="${i}" ${draftAdviser&&same(draftAdviser,candidate)?'checked':''}>`}${window.renderUserAvatarHtml(u,'sm')}<span><span class="section-teacher-picker-name">${esc(shortName(u))}</span><span class="section-teacher-picker-context">ID: ${esc(u.uid||u.id||'—')}</span></span></label>${mode==='adviser'?'': conflict?`<span class="section-teacher-picker-conflict">Schedule conflict<br>${esc(conflict.section.name)} · ${esc(conflict.scheduleLabel)}</span>`:''}</div>`;
        }).join('') || '<p class="section-teacher-picker-muted">No matching teachers.</p>';
        dropdown.querySelectorAll('[data-pick]').forEach(input=>input.onchange=()=>{
            const u=results[Number(input.dataset.pick)];
            const candidate={...u,name:nameOf(u),id:u.uid||u.id,uid:u.uid||u.id,role:'Teacher',isPrimary:staged().length===0};
            if(input.checked){if(staged().length<2)staged().push(candidate);}
            else window.stagedSectionTeachers=staged().filter(t=>!same(t,candidate));
            if(staged().length&&!staged().some(t=>t.isPrimary))staged()[0].isPrimary=true;
            render();search();
        });
        dropdown.querySelectorAll('[data-pick-adviser]').forEach(btn=>btn.onchange=()=>{
            const u=results[Number(btn.dataset.pickAdviser)];
            draftAdviser={...u,name:nameOf(u),id:u.uid||u.id,uid:u.uid||u.id,role:'Adviser'};
            render();
        });
    }
    window.executeSubpageTeacherSearch = function () {
        const input=document.getElementById('section-subpage-teacher-search');
        query=String(input.value||'').replace(/[^a-zA-Z0-9\s.\-']/g,'').slice(0,50).trim();
        input.value=query; search();
    };
    window.openSectionSubpage = function(type,...args) {
        cancelSelection.classList.add('hidden');
        originalOpen.call(this,type,...args);
        if(type!=='teacher'||window.activeSectionSubpage!=='teacher'||page.classList.contains('hidden')) return;
        window.teacherSubpageReplaceIndex=null;
        window.stagedSectionTeachers=copy(window.selectedSectionTeachers||[]);
        if(staged().length&&!staged().some(t=>t.isPrimary))staged()[0].isPrimary=true;
        adviser=resolveAdviser(); mode='teachers';query='';selectionPage=false;
        window.stagedSectionAdviser=adviser?copy(adviser):null;
        window.subpageAdviserInitialSnapshot=JSON.stringify(window.stagedSectionAdviser);
        window.subpageTeacherInitialSnapshot=JSON.stringify(staged());
        render();search();
    };
    window.confirmSectionSubpage = function(...args) {
        if(window.activeSectionSubpage!=='teacher') return originalConfirm.apply(this,args);
        if (selectionPage) {
            if (mode === 'adviser') {
                if (!draftAdviser) return;
                adviser = copy(draftAdviser);
                window.stagedSectionAdviser = copy(adviser);
            }
            returnToSummary(false);
            return;
        }
        if(!staged().length||staged().length>2)return;
        for(const t of staged()) {
            const conflict=window.getTeacherScheduleConflict(t.name);
            if(conflict){notify(`${shortName(t)} has a schedule conflict with ${conflict.section.name}.`);return;}
        }
        window.selectedSectionTeachers=copy(staged());
        window.selectedSectionTeachers.forEach(t=>t.role=adviser&&same(t,adviser)?'Adviser':'Teacher');
        if (JSON.stringify(adviser) !== window.subpageAdviserInitialSnapshot) {
            window.sectionAdviserEdits.set(groupKey(),adviser?copy(adviser):null);
        }
        const lead=window.selectedSectionTeachers.find(t=>t.isPrimary)||window.selectedSectionTeachers[0];
        document.getElementById('edit-section-teacher').value=lead.name;
        document.getElementById('edit-section-role').value=lead.role;
        window.closeSectionSubpage();
        window.validateSectionDeployment?.();
    };
    window.closeSectionSubpage = function(...args) {
        if (window.activeSectionSubpage === 'teacher' && selectionPage) {
            returnToSummary(true);
            return;
        }
        cancelSelection.classList.add('hidden');
        return originalClose.apply(this,args);
    };
})();
