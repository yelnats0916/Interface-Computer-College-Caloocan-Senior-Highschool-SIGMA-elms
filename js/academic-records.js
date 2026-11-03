(function () {
    'use strict';
    let queue = Promise.resolve(), revision = 0, refreshing = null, refreshingScopeKey = '', syncedFor = '', snapshot = [], snapshotJson = '', snapshotComplete = false, applying = false;
    const pendingReleases = new Map();
    const releaseKey = (prefix, subjectId, section) => [prefix, subjectId, section].join(':');
    function waitForRelease(prefix, subjectId, section) {
        const pending = pendingReleases.get(releaseKey(prefix, subjectId, section));
        if (!pending || pending.owner !== String(actor().id)) return Promise.reject(new Error('The release save did not start. Please try again.'));
        return pending.promise;
    }
    let liveSubmissions = {};
    let refreshingRevision = -1;
    const actor = () => { try { return JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}'); } catch { return {}; } };
    const role = () => String(actor().role || '').toLowerCase().replace(/[\s_-]/g, '');
    const staff = () => ['teacher', 'admin', 'masteradmin', 'administrator'].includes(role());
    const teacherGradebookOpen = () => role() === 'teacher' && /^#(?:grades(?::|$)|classroom:.*:gradebook(?:$|:))/.test(location.hash);
    const studentGradesOpen = () => role() === 'student' && /^#grades(?::|$)/.test(location.hash || '');
    function normalizeReleaseMaps(config) {
        if (!config || typeof config !== 'object') return config;
        for (const [key, value] of Object.entries(config)) {
            const settingMap = key === 'assignedStudents' || key.startsWith('assessment') || /^(topic|material)(Schedules|EndSchedules|ReleaseDates)$/.test(key);
            if (Array.isArray(value) && settingMap) config[key] = { ...value };
        }
        return config;
    }
    function clearSyntheticCacheRecords() {
        const synthetic = window.SigmaDatabase?.isSyntheticRecord;
        if (!synthetic) return;
        const clean = value => {
            if (!value || typeof value !== 'object') return value;
            if (Array.isArray(value)) return value.map(clean).filter(v => v !== undefined);
            // Check this node's provenance only; a fake child must not remove its real parent.
            const own = Object.fromEntries(Object.entries(value).filter(([, v]) => !v || typeof v !== 'object'));
            if (synthetic(own)) return undefined;
            return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, clean(v)]).filter(([, v]) => v !== undefined));
        };
        for (const key of Object.keys(localStorage)) {
            if (!/^(sigma-(?:admin|teacher)-subjects$|sigma-admin-sections$|sigma_student_assessment_submissions$|sigma_(?:student_quiz_file_|quiz_result_|custom_assessments)|sigma-quiz-storage-library$)/.test(key)) continue;
            try {
                const raw = localStorage.getItem(key), value = JSON.parse(raw);
                if (!synthetic(value)) continue;
                const cleaned = clean(value);
                if (cleaned === undefined) localStorage.removeItem(key);
                else localStorage.setItem(key, JSON.stringify(cleaned));
            } catch (_) { /* Unrelated or non-JSON cache entries are left intact. */ }
        }
    }
    const api = () => location.port && !['80', '443'].includes(location.port) ? 'http://localhost/sigma-elms/php/api/academic_records.php'
        : new URL('php/api/academic_records.php', location.href).href;
    async function request(input, get = false, foreground = false) {
        const response = await window.SigmaDatabase.fetch(api() + (get ? '?' + new URLSearchParams(input) : ''), {
            method: get ? 'GET' : 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
            autoReconnect: false, foreground: foreground || !get, timeoutMs: get ? 15000 : 45000, ...(!get ? { body: JSON.stringify(input) } : {})
        });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || 'The live learning record could not be saved.');
        return result;
    }
    function report(error) {
        error.sigmaAcademicReported = true;
        const message = 'Live learning sync: ' + error.message;
        window.showToast?.(message, 'error');
        console.warn(message);
        window.dispatchEvent(new CustomEvent('sigma:academic-sync-error', { detail: message }));
    }
    function save(input) {
        const owner = String(actor().id || '');
        const task = queue.catch(() => {}).then(async () => {
            if (!owner || String(actor().id || '') !== owner) throw new Error('The signed-in account changed. Save this record again.');
            const result = await request(input);
            revision++;
            window.dispatchEvent(new CustomEvent('sigma:academic-records-saved', { detail: { type: input.type, revision } }));
            return result;
        });
        queue = task;
        task.catch(report);
        if (['submission', 'score', 'teacher_feedback'].includes(input.type)) {
            const scope = role() === 'student' && input.subjectId && input.section ? { subjectId: input.subjectId, section: input.section } : null;
            task.then(() => refresh(true, scope)).catch(() => {});
        }
        return task;
    }
    async function submit(input, submission) {
        const owner = String(actor().id || '');
        // Server-side extraction runs after the durable submission is saved.
        const text = typeof submission.text === 'string' ? submission.text : '';
        const fingerprint = JSON.stringify([owner, input.subjectId, input.section, input.itemId,
            (submission.files || []).map(file => [file.name, file.size, file.url])]);
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(fingerprint));
        submission.attemptIdentity ||= Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
        const result = await save({ ...input, type: 'submission', text: text.length <= 60000 ? text : '',
            files: submission.files || [], comment: submission.comment || '', attemptIdentity: submission.attemptIdentity });
        if (String(actor().id || '') !== owner) throw new Error('The signed-in account changed.');
        const record = { ...submission, ...result.submission, studentId: owner, subjectId: input.subjectId,
            section: input.section, materialId: input.itemId, assessmentId: input.itemId, serverSynced: true };
        Object.assign(submission, record);
        liveSubmissions[owner] ||= {};
        liveSubmissions[owner][`confirmed:${input.section}:${input.subjectId}:${input.itemId}`] = record;
        window._sharedAssessmentSubmissionsMemoryCache ||= {};
        window._sharedAssessmentSubmissionsMemoryCache.sigma_student_assessment_submissions = liveSubmissions;
        window.invalidateSharedAssessmentSubmissionsStorage?.();
        window.invalidateAssessmentRowsCache?.();
        return result;
    }
    function clearTeacherFeedback() {
        const context = window._sigmaSubmissionFeedbackContext;
        if (!staff() || !context || context.attemptPage !== 1) return;
        save({ type: 'teacher_feedback', subjectId: context.subjectId, section: context.section,
            studentId: context.studentId, itemId: context.assessmentId, attemptIdentity: context.identity, text: '', cleared: true }).catch(() => {});
    }
    function getRelease(prefix, subjectId, section) {
        if (!actor().id || !section || String(section).toLowerCase() === 'all') return null;
        const category = { sigma_topic_release: 'topics', sigma_learning_release: 'learning', sigma_assessment_release: 'assessments' }[prefix];
        if (!category) return null;
        const normalize = value => String(value || '').replace(/^(card|subj|gen)[-_]/i, '').replace(/^Grade\s*\d+\s*[-–]?\s*/i, '').trim().toLowerCase();
        if (staff()) for (const pending of pendingReleases.values()) {
            if (pending.owner === String(actor().id) && pending.prefix === prefix && normalize(pending.subjectId) === normalize(subjectId)
                && (String(pending.section).toLowerCase() === 'all' || normalize(pending.section) === normalize(section))) return { config: pending.config, ready: true };
        }
        const scope = snapshot.find(s => [s.subjectId, s.subject, ...(s.aliases || [])].some(v => normalize(v) === normalize(subjectId))
            && [s.sectionId, s.section].some(v => normalize(v) === normalize(section)));
        if (scope && syncedFor === String(actor().id)) return { config: scope.releases[category] || {}, ready: true };
        return role() === 'student' ? { config: {}, ready: false } : null;
    }
    function applySnapshot(result, readRevision = revision, complete = true) {
        for (const scope of result.scopes) {
            for (const config of Object.values(scope.releases || {})) normalizeReleaseMaps(config);
        }
        // Keep acknowledged settings visible until a read begun after that save arrives.
        for (const [key, pending] of pendingReleases) {
            if (pending.owner === String(result.userId) && pending.confirmed && pending.revision <= readRevision) pendingReleases.delete(key);
        }
        const sameOwner = syncedFor === String(result.userId);
        const scopeKey = scope => `${String(scope.subjectId)}\u0000${String(scope.sectionId)}`;
        const refreshedScopeKeys = new Set(result.scopes.map(scopeKey));
        const previousScopes = sameOwner ? snapshot : [];
        const nextScopes = complete ? result.scopes : [
            ...previousScopes.filter(scope => !refreshedScopeKeys.has(scopeKey(scope))),
            ...result.scopes
        ];
        const encoded = JSON.stringify(nextScopes);
        if (sameOwner && snapshotJson === encoded && (!complete || snapshotComplete)) return;
        const releaseState = scopes => JSON.stringify(scopes.map(s => [s.subjectId, s.sectionId, s.releases]));
        const previousRelevantScopes = complete ? previousScopes : previousScopes.filter(scope => refreshedScopeKeys.has(scopeKey(scope)));
        const releasesChanged = !sameOwner || releaseState(previousRelevantScopes) !== releaseState(result.scopes);
        let all;
        try { all = JSON.parse(localStorage.getItem('sigma_student_assessment_submissions') || '{}'); } catch (_) { all = {}; }
        if (!all || typeof all !== 'object' || Array.isArray(all)) all = {};
        for (const [studentId, records] of Object.entries(all)) {
            if (!records || typeof records !== 'object' || Array.isArray(records)) { delete all[studentId]; continue; }
            for (const [key, row] of Object.entries(records)) {
                if (!row || typeof row !== 'object' || (row.serverSynced && (complete || refreshedScopeKeys.has(`${String(row.subjectId || '')}\u0000${String(row.sectionId || row.section || '')}`)))) delete records[key];
            }
        }
        applying = true;
        try {
            for (const scope of result.scopes) {
                const submissions = new Map(scope.records.filter(r => r.type === 'submission').map(r => [r.studentId + ':' + r.itemId, {
                    ...r.data,
                    // The API stores studentId and itemId beside the payload. Restore
                    // both before building the cross-device submission mirror.
                    studentId: r.studentId,
                    materialId: r.itemId
                }]));
                for (const row of scope.records.filter(r => r.type === 'score')) {
                    const key = row.studentId + ':' + row.itemId;
                    const sub = submissions.get(key) || {};
                    // A stale score from an older attempt cannot overwrite a newer submission.
                    if (sub.attemptIdentity && row.data.attemptIdentity && sub.attemptIdentity !== row.data.attemptIdentity) continue;
                    submissions.set(key, { ...sub, ...row.data, studentId: row.studentId, materialId: row.itemId,
                        gradedAt: row.data.gradedAt || row.data.recordedAt || sub.gradedAt,
                        teacherSaved: true, teacherEditedScore: row.data.source !== 'quiz-auto',
                        status: row.data.status || (row.data.score == null ? (sub.status || 'Submitted') : 'Graded'), isPending: row.data.score == null && !!sub.isPending });
                }
                for (const sub of submissions.values()) {
                    const id = String(sub.studentId); if (!id || !sub.materialId) continue;
                    const record = { ...sub, ...(sub.quarter ? { quarter: Number(String(sub.quarter).replace(/\D/g, '')) || 1 } : {}), subjectId: scope.subjectId, section: scope.section, sectionId: scope.sectionId, schoolYear: scope.schoolYear, serverSynced: true };
                    all[id] ||= {};
                    const key = `live:${scope.sectionId}:${scope.subjectId}:${sub.materialId}`;
                    const normalize = value => String(value || '').replace(/^(card|subj|gen)[-_]/i, '').trim().toLowerCase();
                    for (const [oldKey, old] of Object.entries(all[id])) {
                        if (!old || typeof old !== 'object') { delete all[id][oldKey]; continue; }
                        if ((old.materialId || old.assessmentId) !== record.materialId) continue;
                        if (![scope.subjectId, scope.subject, ...(scope.aliases || [])].some(v => normalize(v) === normalize(old.subjectId))) continue;
                        if (normalize(old.section) === normalize(scope.section)) all[id][oldKey] = record;
                    }
                    all[id][key] = record;
                    // Quiz answers already belong to the database mirror; alias copies waste device storage.
                }
            }
            // Publish the complete database mirror before any optional device-cache writes.
            snapshot = nextScopes; snapshotJson = encoded; syncedFor = String(result.userId);
            snapshotComplete = complete || (sameOwner && snapshotComplete);
            liveSubmissions = all;
            window._sharedAssessmentSubmissionsMemoryCache ||= {};
            window._sharedAssessmentSubmissionsMemoryCache.sigma_student_assessment_submissions = all;
            try { localStorage.setItem('sigma_student_assessment_submissions', JSON.stringify(all)); } catch (_) { /* The live memory mirror remains usable when the device cache is full. */ }
            window.invalidateSharedAssessmentSubmissionsStorage?.();
            for (const cache of ['_sigmaReleaseConfigCache', '_studentAssessmentReleaseStatusCache', '_studentAssessmentDetailsCache']) window[cache]?.clear?.();
            window.dispatchEvent(new CustomEvent('sigma:release-config-updated', { detail: { remote: true } }));
            window.dispatchEvent(new CustomEvent('sigma:submission-files-updated', { detail: { remote: true } }));
            window.invalidateAssessmentRowsCache?.();
            window.dispatchEvent(new CustomEvent('sigma:academic-snapshot-updated'));
            if (releasesChanged && role() === 'student' && (complete || previousRelevantScopes.length > 0)) window.SigmaAssignedClassrooms?.refresh(true);
            window.refreshAllScorePanelsAndTables?.({ type: 'database_refresh', remote: true });
            const subject = window.currentTopicState?.subjectId;
            if (subject) {
                if (role() === 'student') window.refreshStudentTopicUIIfVisible?.(subject);
                else window.refreshTeacherTopicUIIfVisible?.(subject);
            }
        } finally { applying = false; }
    }
    function refresh(force = false, scope = null) {
        const owner = String(actor().id || '');
        if (!owner || !window.SigmaDatabase) return Promise.resolve();
        const hasScope = Boolean(scope?.subjectId && scope?.section);
        const requestedScopeKey = hasScope ? `${String(scope.subjectId)}\u0000${String(scope.section)}` : '*';
        if (refreshing) {
            if (refreshingScopeKey === '*' || refreshingScopeKey === requestedScopeKey) {
                return force && refreshingRevision < revision ? refreshing.catch(() => {}).then(() => refresh(true, scope)) : refreshing;
            }
            return refreshing.catch(() => {}).then(() => refresh(force, scope));
        }
        refreshingRevision = revision;
        refreshingScopeKey = requestedScopeKey;
        refreshing = queue.catch(() => {}).then(async () => {
            const readRevision = revision;
            refreshingRevision = readRevision;
            const input = hasScope ? { action: 'sync', subjectId: scope.subjectId, section: scope.section } : { action: 'sync' };
            const result = await request(input, true, force || teacherGradebookOpen() || studentGradesOpen());
            // A read begun before this tab committed a save cannot roll the UI back.
            if (readRevision === revision && String(actor().id || '') === owner && String(result.userId) === owner) applySnapshot(result, readRevision, !hasScope);
        }).finally(() => { refreshing = null; refreshingScopeKey = ''; });
        return refreshing;
    }
    function refreshForScope(subjectId, section) {
        return subjectId && section ? refresh(true, { subjectId: String(subjectId), section: String(section) }) : refresh(true);
    }
    async function submitQuiz(input) {
        const result = await save({ ...input, type: 'quiz_attempt' });
        if (!result.submission) throw new Error('The server did not confirm this quiz submission.');
        const submission = result.submission;
        const id = String(submission.studentId || actor().id);
        const itemId = String(submission.materialId || submission.assessmentId || input.itemId);
        const scope = snapshot.find(scope => scope.subjectId === submission.subjectId
            && [scope.sectionId, scope.section].includes(submission.sectionId || submission.section));
        const sectionId = submission.sectionId || scope?.sectionId;
        if (sectionId) {
            const record = { ...submission, materialId: itemId, serverSynced: true };
            liveSubmissions[id] ||= {};
            liveSubmissions[id][`live:${sectionId}:${submission.subjectId}:${itemId}`] = record;
            window._sharedAssessmentSubmissionsMemoryCache ||= {};
            window._sharedAssessmentSubmissionsMemoryCache.sigma_student_assessment_submissions = liveSubmissions;
            window.invalidateSharedAssessmentSubmissionsStorage?.();
            window.invalidateAssessmentRowsCache?.();
        }
        // The response contains the committed attempt; background readback cannot delay closing the quiz.
        setTimeout(() => refresh(true).catch(error => console.warn('Assessment refresh:', error.message)), 0);
        return submission;
    }
    // The authenticated snapshot is authoritative, including an empty submission slot.
    function getAssessmentRecord(subjectId, section, itemId, studentId) {
        if (syncedFor !== String(actor().id || '') || !subjectId || !section || !itemId || !studentId) return null;
        const norm = value => String(value || '').replace(/^(card|subj|gen)[-_]/i, '').replace(/^grade\s*\d+\s*[-–:]?\s*/i, '').trim().toLowerCase();
        const scope = snapshot.find(scope => [scope.subjectId, scope.subject, ...(scope.aliases || [])].some(v => norm(v) === norm(subjectId))
            && [scope.sectionId, scope.section].some(v => norm(v) === norm(section)));
        if (!scope) return null;
        const id = String(studentId).replace(/^std-/i, '');
        const record = liveSubmissions[id]?.[`live:${scope.sectionId}:${scope.subjectId}:${itemId}`] || null;
        // Return a copy: UI attempt normalization must never change the database mirror.
        return { ready: true, record: record ? JSON.parse(JSON.stringify(record)) : null };
    }
    function getSubmissionAiRecords(subjectId, section, itemId, studentId) {
        if(syncedFor!==String(actor().id||''))return null;
        const norm=value=>String(value||'').replace(/^(card|subj|gen)[-_]/i,'').replace(/^grade\s*\d+\s*[-–:]?\s*/i,'').trim().toLowerCase();
        const scope=snapshot.find(scope=>[scope.subjectId,scope.subject,...(scope.aliases||[])].some(value=>norm(value)===norm(subjectId))&&[scope.sectionId,scope.section].some(value=>norm(value)===norm(section)));
        if(!scope?.aiResultsIncluded)return null;
        const records={};for(const record of scope.records||[]){if(['evaluation','feedback'].includes(record.type)&&String(record.studentId)===String(studentId).replace(/^std-/i,'')&&String(record.itemId)===String(itemId))records[record.type]=record.data;}
        return {records};
    }
    function getPendingSubmissions() {
        if (syncedFor !== String(actor().id) || !staff()) return [];
        const rows=[];
        for(const scope of snapshot){
            const scores=new Map(scope.records.filter(r=>r.type==='score').map(r=>[r.studentId+':'+r.itemId,r.data]));
            for(const record of scope.records.filter(r=>r.type==='submission')){
                const sub=record.data,score=scores.get(record.studentId+':'+record.itemId);
                const currentScore=score&&(!sub.attemptIdentity||!score.attemptIdentity||score.attemptIdentity===sub.attemptIdentity);
                if(currentScore&&score.score!==null&&score.score!==undefined&&score.score!=='')continue;
                if(!sub.submittedAt&&!sub.completedAt)continue;
                rows.push({...sub,id:scope.sectionId+':'+record.studentId+':'+record.itemId,subjectId:scope.subjectId,subject:scope.subject,section:scope.section,sectionName:scope.section,materialId:record.itemId,
                    studentId:record.studentId,activity:sub.title||sub.quizTitle||'Submitted assessment',topicIdx:sub.topicIdx??0,itemIdx:sub.topicItemIdx??sub.activeIdx??0,tab:'assessments',status:'submitted',submissionCount:1,submittedOn:sub.submittedAt||sub.completedAt});
            }
        }
        return rows.sort((a,b)=>Date.parse(b.submittedOn)-Date.parse(a.submittedOn));
    }
    function getPerformanceSnapshot(){const owner=String(actor().id||'');return {ready:!!owner&&syncedFor===owner&&snapshotComplete,scopes:owner&&syncedFor===owner?snapshot:[]};}
    window.SigmaAcademicRecords = { clearTeacherFeedback, save, request, submit, submitQuiz, refresh, refreshForScope, getRelease, getPendingSubmissions, getAssessmentRecord, getSubmissionAiRecords, getPerformanceSnapshot,
        isApplying: () => applying, flush: () => queue, waitForRelease, actor, role,
        getSubmissions: () => syncedFor === String(actor().id || '') ? liveSubmissions : {} };
    window.addEventListener('sigma:release-config-updated', event => {
        if (!staff() || event.detail?.remote) return;
        const { prefix, subjectId, section, config } = event.detail || {};
        const category = { sigma_topic_release: 'topics', sigma_learning_release: 'learning', sigma_assessment_release: 'assessments' }[prefix];
        if (category) {
            const key = releaseKey(prefix, subjectId, section);
            const pending = { prefix, subjectId, section, config, owner: String(actor().id) };
            pendingReleases.set(key, pending);
            pending.promise = save({ type: 'release', category, subjectId, section, config }).then(result => {
                if (pendingReleases.get(key) === pending) {
                    pending.config = normalizeReleaseMaps(result.releases?.[0]?.config || config);
                    pending.confirmed = true;
                    pending.revision = revision;
                    window._sigmaReleaseConfigCache?.clear();
                }
                refresh(true).catch(error => console.warn('Release refresh:', error.message));
                return result;
            }, error => {
                if (pendingReleases.get(key) === pending) pendingReleases.delete(key);
                snapshotJson = ''; refresh(true).catch(() => {});
                window._sigmaReleaseConfigCache?.clear();
                throw error;
            });
            pending.promise.catch(() => {}); // Other release actions use the existing error event/toast.
        }
    });
    const adminSectionOpen = () => ['admin','masteradmin','administrator'].includes(role()) &&
        ['classroom-detail-view','section-topic-detail','section-topic-content'].some(id => {
            const node = document.getElementById(id);
            return node && !node.classList.contains('hidden');
        });
    let backgroundSync = null, backgroundOwner = '', nextBackgroundSync = 0, syncFailures = 0;
    const sync = () => {
        if (role() === 'student' && !studentGradesOpen()) return Promise.resolve();
        const owner = String(actor().id || '');
        if (backgroundSync) return owner === backgroundOwner ? backgroundSync : backgroundSync.then(() => sync());
        if (owner !== backgroundOwner) { backgroundOwner = owner; nextBackgroundSync = 0; syncFailures = 0; }
        if (Date.now() < nextBackgroundSync) return Promise.resolve();
        clearSyntheticCacheRecords();
        backgroundSync = refresh(adminSectionOpen() || teacherGradebookOpen() || studentGradesOpen()).then(() => {
            syncFailures = 0;
            nextBackgroundSync = Date.now() + 15000;
        }, error => {
            // A busy server must not receive another full snapshot on every focus
            // or visibility event. Explicit refresh/save readback remains immediate.
            nextBackgroundSync = Date.now() + Math.min(120000, 15000 * 2 ** ++syncFailures);
            console.warn('Assessment refresh:', error.message);
        }).finally(() => { backgroundSync = null; });
        return backgroundSync;
    };
    // A refreshed Grades route needs its records before background portal requests.
    // Start while the remaining portal scripts load, and reuse that read at DOM ready.
    const startupSync = teacherGradebookOpen() || studentGradesOpen() ? sync() : null;
    window.addEventListener('focus', sync);
    window.addEventListener('online', sync);
    window.addEventListener('hashchange', () => { if (adminSectionOpen()) sync(); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => startupSync || sync()); else if (!startupSync) sync();
    setInterval(() => {
        if (document.hidden) return;
        sync();
    }, 5000);
})();
