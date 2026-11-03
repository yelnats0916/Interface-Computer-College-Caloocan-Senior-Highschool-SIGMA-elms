/* One authoritative, role-scoped source for desktop/mobile search and suggestions. */
(function () {
    'use strict';
    let owner = '', people = [], pending = null, refreshedAt = 0, error = '';
    const actor = () => window.SigmaDatabase?.currentUser?.() || {};
    const normalize = value => String(value || '').replace(/^#/, '').trim().toLocaleLowerCase();
    const ownerKey = () => JSON.stringify([actor().id || actor().uid, actor().role, sessionStorage.getItem('sigma-grade-sync-session')]);
    const role = () => /admin/i.test(actor().role || '') ? 'admin' : /teach|faculty|instructor/i.test(actor().role || '') ? 'teacher' : 'student';
    function ensureOwner() {
        const current = ownerKey();
        if (owner !== current) { owner = current; people = []; pending = null; refreshedAt = 0; error = ''; }
        return current;
    }
    async function refresh() {
        const current = ensureOwner();
        if (!actor().id && !actor().uid) return;
        if (pending) return pending;
        if (Date.now() - refreshedAt < 30000) return;
        const work = (async () => {
            const result = await window.SigmaDatabase.request('search_directory', { foreground: true, autoReconnect: false });
            if (ownerKey() !== current || String(result.ownerId) !== String(actor().id || actor().uid)) return;
            people = Array.isArray(result.records) ? result.records : [];
            refreshedAt = Date.now(); error = '';
            if (role() !== 'admin' && !window.SigmaAssignedClassrooms?.isReady()) await window.SigmaAssignedClassrooms?.refresh();
            window.dispatchEvent(new Event('sigma:search-data-ready'));
        })().catch(reason => {
            if (ownerKey() === current) { error = reason.message; window.dispatchEvent(new Event('sigma:search-data-ready')); }
        }).finally(() => { if (pending === work) { pending = null; window.dispatchEvent(new Event('sigma:search-data-ready')); } });
        pending = work;
        window.dispatchEvent(new Event('sigma:search-data-ready'));
        return work;
    }
    function records(key) {
        if (role() !== 'admin') return window.SigmaAssignedClassrooms?.records(key) || [];
        try { return window.getStoredJson?.(key, []) || JSON.parse(localStorage.getItem(key) || '[]'); } catch (_) { return []; }
    }
    function entries() {
        ensureOwner();
        const self = normalize(actor().id || actor().uid), portal = role();
        const list = [], seen = new Set();
        for (const user of people) {
            const id = normalize(user.id || user.uid);
            if (!id || id === self || seen.has('person:' + id)) continue;
            const category = /teach|faculty|instructor/i.test(user.role || '') ? 'teacher' : /admin/i.test(user.role || '') ? 'user' : 'student';
            if (portal !== 'admin' && category === 'user') continue;
            const title = [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.fullName || user.name;
            if (!title) continue;
            seen.add('person:' + id);
            list.push({ id:user.id || user.uid, title, category, role:category === 'user' ? 'admin' : category,
                roleLabel:category === 'user' ? 'Admin' : category === 'teacher' ? 'Teacher' : 'Student',
                subtitle:user.section || user.gradeSection || user.department || '', detail:user.gradeLevel || '',
                avatar:user.avatar || '', rawUser:user,
                searchText:[title,user.fullName,user.middleName,user.section,user.gradeSection,user.department,user.gradeLevel].filter(Boolean).join(' ') });
        }
        const subjects = records('sigma-admin-subjects'), sections = records('sigma-admin-sections');
        const byAlias = new Map();
        for (const subject of subjects) for (const value of [subject.id,subject.code,subject.name,...(subject.curriculum?.legacyAliases || [])]) if (value) byAlias.set(normalize(value), subject);
        function addClass(subject, section) {
            const title = subject.name || subject.title || subject.subject || '';
            const sectionName = section?.name || section?.sectionName || section?.section || '';
            const key = normalize(subject.id || title) + ':' + normalize(section?.id || sectionName);
            if (!title || seen.has('class:' + key)) return;
            seen.add('class:' + key);
            const gradeLevel = String(section?.gradeLevel || section?.grade || subject.gradeLevel || subject.grade || '');
            list.push({ id:subject.id || key, title, category:'class', roleLabel:'Subject / Class',
                subtitle:sectionName ? `Section: ${sectionName}` : 'Subject', detail:gradeLevel ? `Grade Level: ${gradeLevel}` : '',
                icon:'fa-book-bookmark', rawSubject:subject, rawSection:section, section:sectionName, gradeLevel,
                searchText:[title,subject.code,subject.id,sectionName,gradeLevel].filter(Boolean).join(' ') });
        }
        for (const section of sections) {
            if (section.isDeleted || /archiv|draft/i.test(section.status || '')) continue;
            const assigned = section.assignedSubjects?.length ? section.assignedSubjects : section.subjects?.length ? section.subjects : [section.subject];
            for (const value of assigned) {
                const label = typeof value === 'object' ? value.id || value.name || value.title : value;
                const subject = byAlias.get(normalize(label)) || (typeof value === 'object' ? value : { name:value });
                if (label) addClass(subject, section);
            }
        }
        if (portal === 'admin') for (const subject of subjects) if (!list.some(item => item.category === 'class' && normalize(item.rawSubject.id) === normalize(subject.id))) addClass(subject, null);
        return list;
    }
    const results = query => entries().filter(item => window.SigmaSearch.record(query, [item.id,item.rawSubject?.code], [item.searchText]));
    window.SigmaSearchData = { refresh, entries, results, status:() => ({ loading:!!pending, error, ready:!!refreshedAt }) };
    document.addEventListener('focusin', event => { if (event.target.matches?.('#searchBar,#mobileSearchInput')) refresh(); });
    for (const event of ['sigma:user-profile-updated','sigma:assigned-classrooms-updated']) window.addEventListener(event, () => { refreshedAt = 0; window.dispatchEvent(new Event('sigma:search-data-ready')); });
    window.addEventListener('storage', event => {
        if (['sigma-admin-subjects','sigma-admin-sections','sigma-admin-users'].includes(event.key)) {
            refreshedAt = 0;
            window.dispatchEvent(new Event('sigma:search-data-ready'));
        }
    });
})();
