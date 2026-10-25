(function () {
    'use strict';
    // Preserve the existing network progress and credential-vault wrappers installed later.
    const nativeFetch = (...args) => window.fetch(...args);
    // Shared transport only. Reading a browser cache never imports it into MySQL.
    function url(name) {
        if (!/^[a-z_]+$/.test(name)) throw new Error('Invalid database endpoint.');
        const local = ['localhost', '127.0.0.1'].includes(location.hostname);
        if (local && location.port && !['80', '443'].includes(location.port)) return `http://localhost/sigma-elms/php/api/${name}.php`;
        return new URL(`${location.pathname.includes('/php/') ? 'api/' : 'php/api/'}${name}.php`, location.href).href;
    }
    // This hosting account has one PHP worker. Queue API requests instead of
    // letting startup modules compete for a worker and trigger HTTP 503s.
    let apiQueue = Promise.resolve();
    const authPriorityKey = 'sigma-login-request-priority';
    const yieldToLogin = Symbol('yield-to-login');
    function loginPending() {
        try {
            const value = JSON.parse(localStorage.getItem(authPriorityKey) || '0');
            return Number(value?.until || value) > Date.now();
        } catch (_) { return false; }
    }
    async function waitForLogin(signal) {
        while (loginPending()) {
            signal?.throwIfAborted?.();
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    async function withWorker(input, options, authentication = false) {
        const locks = window.navigator?.locks;
        for (;;) {
            if (!authentication) await waitForLogin(options.signal);
            const send = () => {
                options.signal?.throwIfAborted?.();
                if (!authentication && loginPending()) return yieldToLogin;
                return performFetchWithIdentity(input, options);
            };
            const result = locks && !options.keepalive
                ? await locks.request('sigma-php-api-worker', options.signal ? { signal: options.signal } : {}, send)
                : await send();
            if (result !== yieldToLogin) return result;
        }
    }
    async function fetchAuthentication(input, options) {
        // Bound the whole sign-in attempt, including waiting for another tab's lock.
        if (!options.signal && typeof AbortSignal?.timeout === 'function') {
            options = { ...options, signal: AbortSignal.timeout(options.timeoutMs || 15000) };
        }
        let lease = '';
        const requestId = Date.now().toString(36) + Math.random().toString(36).slice(2);
        const renew = () => {
            lease = JSON.stringify({ requestId, until: Date.now() + 20000 });
            try { localStorage.setItem(authPriorityKey, lease); } catch (_) {}
        };
        renew();
        const timer = typeof setInterval === 'function' ? setInterval(renew, 5000) : null;
        try {
            for (let attempt = 0; ; attempt++) {
                const response = await withWorker(input, options, true);
                // Apache's capacity rejection happens before PHP executes. Only
                // retry that response, never an uncertain reset/save timeout.
                if (attempt >= 2 || response.status !== 503 ||
                    /application\/json/i.test(response.headers?.get('Content-Type') || '')) return response;
                const body = await response.clone().text();
                if (!/Service Unavailable/i.test(body) || !/capacity|temporarily unable/i.test(body)) return response;
                try { await response.body?.cancel(); } catch (_) {}
                await new Promise(resolve => setTimeout(resolve, 400 * (attempt + 1)));
                options.signal?.throwIfAborted?.();
            }
        }
        finally {
            if (timer !== null) clearInterval(timer);
            try { if (localStorage.getItem(authPriorityKey) === lease) localStorage.removeItem(authPriorityKey); } catch (_) {}
        }
    }
    let disconnected = false;
    function connectionState(offline) {
        if (disconnected === offline) return;
        disconnected = offline;
        window.dispatchEvent?.(new CustomEvent(offline ? 'sigma:connection-lost' : 'sigma:connection-restored'));
    }
    function reconnectDelay(ms, signal) {
        return new Promise((resolve, reject) => {
            let timer;
            const done = () => { clearTimeout(timer); window.removeEventListener?.('online', done); signal?.removeEventListener?.('abort', aborted); resolve(); };
            const aborted = () => {
                if (signal.reason?.name === 'TimeoutError') return; // A slow read receives a fresh network deadline on retry.
                clearTimeout(timer); window.removeEventListener?.('online', done); reject(signal.reason || new DOMException('Canceled', 'AbortError'));
            };
            window.addEventListener?.('online', done, { once: true });
            signal?.addEventListener?.('abort', aborted, { once: true });
            timer = setTimeout(done, ms);
            if (signal?.aborted) aborted();
        });
    }
    async function fetchWithIdentity(input, options = {}) {
        const target = new URL(typeof input === 'string' || input instanceof URL ? input : input.url, location.href);
        const apiRoot = new URL('.', url('session'));
        const method = String(options.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
        const finish = method === 'GET' && target.origin === apiRoot.origin && target.pathname.startsWith(apiRoot.pathname)
            ? window.SigmaContentLoading?.beginDataRead(input) : null;
        try { return await fetchDataWithIdentity(input, options); }
        finally { finish?.(); }
    }
    async function fetchDataWithIdentity(input, options = {}) {
        const target = new URL(typeof input === 'string' || input instanceof URL ? input : input.url, location.href);
        const apiRoot = new URL('.', url('session'));
        if (target.origin !== apiRoot.origin || !target.pathname.startsWith(apiRoot.pathname)) return performFetchWithIdentity(input, options);
        const method = String(options.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
        const reconnect = method === 'GET' && options.autoReconnect !== false;
        const identity = sessionStorage.getItem('sigma-grade-sync-session');
        for (let attempt = 0; ; attempt++) {
            if (reconnect && sessionStorage.getItem('sigma-grade-sync-session') !== identity) throw new DOMException('The signed-in account changed.', 'AbortError');
            const signal = options.signal?.aborted && options.signal.reason?.name === 'TimeoutError' ? undefined : options.signal;
            try {
                const response = await queueFetchWithIdentity(input, { ...options, signal });
                if (!reconnect || ![502,503,504].includes(response.status)) {
                    if (response.ok) connectionState(false);
                    return response;
                }
                try { await response.body?.cancel(); } catch (_) {}
            } catch (error) {
                const temporary = error instanceof TypeError || ['TypeError','TimeoutError'].includes(error.name)
                    || (error.name === 'AbortError' && options.signal?.reason?.name === 'TimeoutError');
                if (!reconnect || !temporary || (options.signal?.aborted && options.signal.reason?.name !== 'TimeoutError')) throw error;
            }
            connectionState(true);
            // Do not hold the PHP worker queue or cross-tab lock while waiting to reconnect.
            await reconnectDelay(Math.min(15000, 1000 * 2 ** Math.min(attempt, 4)), options.signal);
        }
    }
    function queueFetchWithIdentity(input, options = {}) {
        const target = new URL(typeof input === 'string' || input instanceof URL ? input : input.url, location.href);
        // Existing background waiters release the worker to an interactive login.
        // Do not bypass the server's single process with simultaneous PHP requests.
        if (options.authentication === true && /\/(session|auth|grade_sync)\.php$/.test(target.pathname)) {
            return fetchAuthentication(input, options);
        }
        if (options.foreground === true) {
            return withWorker(input, options);
        }
        const next = apiQueue.then(() => withWorker(input, options));
        apiQueue = next.catch(() => {});
        return next;
    }
    async function performFetchWithIdentity(input, options = {}) {
        const target = new URL(typeof input === 'string' || input instanceof URL ? input : input.url, location.href);
        const resource = input instanceof URL ? input.href : input;
        const apiRoot = new URL('.', url('session'));
        if (target.origin !== apiRoot.origin || !target.pathname.startsWith(apiRoot.pathname)) return nativeFetch(resource, options);
        // The network deadline begins after queue/lock acquisition, not while
        // waiting behind another request. Explicit caller cancellation is preserved.
        const { timeoutMs = 15000, autoReconnect, foreground, authentication, ...fetchOptions } = options;
        options = fetchOptions;
        if (!options.signal && typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
            options.signal = AbortSignal.timeout(timeoutMs);
        }
        const headers = new Headers(options.headers || (input instanceof Request ? input.headers : undefined));
        if (!headers.has('Authorization')) {
            let full, challenge;
            try { full = JSON.parse(sessionStorage.getItem('sigma-grade-sync-session') || 'null'); } catch (_) {}
            try { challenge = JSON.parse(sessionStorage.getItem('sigma-login-challenge') || 'null'); } catch (_) {}
            const token = full?.token || challenge?.token;
            if (token) headers.set('Authorization', `Bearer ${token}`);
        }
        const method = String(options.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
        const safeHistorySync = method === 'POST' && /\/(?:chat_conversations|chat_history)\.php$/.test(target.pathname)
            && typeof options.body === 'string' && (() => { try { return JSON.parse(options.body).action === 'recover_chat_history'; } catch (_) { return false; } })();
        // Retry reads and the idempotent history sync only. Never replay a grade save or AI generation.
        for (let attempt = 0; ; attempt++) {
            const response = await nativeFetch(resource, { ...options, headers });
            if (method === 'GET' && response.ok && response.clone && /application\/json/i.test(response.headers?.get('Content-Type') || '')) {
                // A connection can drop after headers arrive. Finish reading JSON while
                // the request deadline is still active so this also reconnects safely.
                try { await response.clone().text(); }
                catch (error) { throw options.signal?.reason?.name === 'TimeoutError' ? options.signal.reason : error; }
            }
            if (attempt >= 2 || ![502,503,504].includes(response.status) || !(method === 'GET' || safeHistorySync) || options.signal?.aborted) return response;
            try { await response.body?.cancel(); } catch (_) {}
            await new Promise(resolve => setTimeout(resolve, attempt === 0 ? 750 : 1500));
            options.signal?.throwIfAborted?.();
        }
    }
    async function readJson(response) {
        let result;
        try { result = await response.json(); }
        catch (_) {
            const error = new Error(response.status >= 500
                ? 'The server is temporarily busy. Please try again shortly.'
                : 'The server returned an invalid response. Please reload and try again.');
            error.status = response.status;
            error.authFailureConfirmed = false;
            error.retryable = response.status >= 500;
            throw error;
        }
        if (!response.ok) {
            const error = new Error(result?.error || (response.status >= 500
                ? 'The server is temporarily busy. Please try again shortly.' : `Request failed (${response.status}).`));
            error.status = response.status; error.code = result?.code; error.retryable = response.status >= 500;
            error.authFailureConfirmed = [401,403].includes(response.status) && result?.success === false && typeof result?.error === 'string';
            throw error;
        }
        return result;
    }
    async function request(name, options = {}) {
        const { data, query, signal, timeoutMs = 15000, autoReconnect = true, foreground = false, authentication = false } = options;
        const target = new URL(url(name));
        if (query) Object.entries(query).forEach(([key, value]) => target.searchParams.set(key, value));
        const response = await fetchWithIdentity(target, {
            method: data === undefined ? 'GET' : 'POST',
            credentials: 'omit',
            cache: 'no-store',
            signal, timeoutMs, autoReconnect, foreground, authentication,
            headers: { 'Content-Type': 'application/json' },
            ...(data === undefined ? {} : { body: JSON.stringify(data) })
        });
        const result = await readJson(response);
        if (!response.ok || result?.success !== true) {
            const error = new Error(result?.error || `Database request failed (${response.status}).`);
            error.status = response.status;
            error.code = result?.code;
            throw error;
        }
        return result;
    }
    function preserveLegacy(key, value) {
        // Device-local review copy, deliberately never submitted to an API.
        if (!value || value === '[]' || value === '{}') return;
        const reviewKey = `sigma-database-review:${key}`;
        if (localStorage.getItem(reviewKey) === null) {
            localStorage.setItem(reviewKey, JSON.stringify({ capturedAt: new Date().toISOString(), sourceKey: key, data: value }));
        }
    }
    function currentUser() {
        try {
            const user = JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || 'null');
            const session = JSON.parse(sessionStorage.getItem('sigma-grade-sync-session') || 'null');
            return user && session?.token && String(user.id || user.uid) === String(session.userId) ? user : {};
        } catch (_) { return {}; }
    }
    async function save(name, data) {
        try {
            if (name === 'subjects' && data.subject) await persistMaterialFiles(data.subject);
            const result = await request(name, { data });
            const saved = result.subject || result.section || result.record || result.user || result.quiz;
            if (Number.isSafeInteger(Number(saved?.creationNumber)) && Number(saved.creationNumber) > 0) {
                const target = data.subject || data.section || data.record || data.user || data.quiz || data;
                target.creationNumber = Number(saved.creationNumber);
            }
            return true;
        } catch (error) {
            const message = error.message || 'Database save failed. Your changes have not been confirmed.';
            window.showToast?.(message, 'error');
            window.dispatchEvent(new CustomEvent('sigma:database-error', { detail: { endpoint: name, message } }));
            return false;
        }
    }
    // Upload device-local files before saving curriculum JSON. A local filename alone
    // must never be presented as a durable attachment on another device.
    async function persistMaterialFiles(subject) {
        const groups = [subject.materials || []];
        for (const topic of subject.topics || []) {
            for (const key of ['materials', 'allMaterials', 'handouts', 'assignments', 'performanceTasks', 'quizzes', 'videos', 'activities']) {
                if (Array.isArray(topic[key])) groups.push(topic[key]);
            }
        }
        const completed = new Map();
        for (const material of groups.flat()) {
            if (!material || !material.id) continue;
            if (completed.has(material.id)) { Object.assign(material, completed.get(material.id)); continue; }
            for (const [urlKey, nameKey, kind] of [['fileUrl','fileName','instructions'],['rubricUrl','rubricFileName','rubric'],['perfGuidelinesUrl','perfGuidelinesFileName','instructions'],['perfRubricUrl','perfRubricFileName','rubric']]) {
                const source = String(material[urlKey] || '');
                const fileName = material[nameKey];
                if (!fileName || !/^(?:data:|blob:|image\/)/i.test(source)) continue;
                const stored = await window.sigmaGetStoredDocument?.(fileName);
                let blob;
                if (stored?.data instanceof Blob) blob = stored.data;
                else if (stored?.data instanceof ArrayBuffer || ArrayBuffer.isView(stored?.data)) blob = new Blob([stored.data]);
                else if (typeof stored?.data === 'string' && stored.data.startsWith('data:')) blob = await (await nativeFetch(stored.data)).blob();
                else if (/^(?:data:|blob:)/i.test(source)) blob = await (await nativeFetch(source)).blob();
                if (!blob?.size) throw new Error(`Reattach ${fileName} before saving; its file is unavailable on this device.`);
                const form = new FormData();
                form.append('file', blob, fileName);
                form.append('category', 'subject-material');
                form.append('subject_id', subject.id);
                form.append('topic_id', material.topicId || '');
                form.append('material_title', material.title || '');
                form.append('material_type', material.type || 'Task');
                form.append('asset_kind', kind);
                const response = await fetchWithIdentity(url('upload'), { method: 'POST', body: form, signal: AbortSignal.timeout(150000) });
                const uploaded = await readJson(response);
                if (!uploaded.success || !uploaded.url) throw new Error(uploaded.error || `Unable to upload ${fileName}.`);
                material[urlKey] = uploaded.url;
                if (urlKey === 'fileUrl' && (!material.url || /^(?:data:|blob:|image\/)/i.test(material.url))) material.url = uploaded.url;
                material[`${urlKey}Storage`] = { uploadId: uploaded.uploadId, google_drive: uploaded.google_drive };
                if (uploaded.warning) window.showToast?.(uploaded.warning, 'warning');
            }
            completed.set(material.id, { ...material });
        }
    }
    function isSyntheticRecord(value, depth = 0) {
        if (!value || typeof value !== 'object') return false;
        if (depth > 64) return true;
        for (const field of ['isDemo', 'is_demo', 'isMock', 'is_mock', 'isSample', 'is_sample', 'isSeed', 'is_seed', 'isFake', 'is_fake']) {
            if ([true, 1, '1', 'true'].includes(value[field])) return true;
        }
        for (const field of ['createdVia', 'created_via', 'dataOrigin', 'data_origin']) {
            if (['system-seed', 'demo', 'mock', 'sample', 'fixture'].includes(String(value[field] || '').trim().toLowerCase())) return true;
        }
        for (const field of ['id', 'uid', 'authorId', 'author_id']) {
            if (/^(?:demo[-_]|mock[-_]|fixture[-_]|quiz-seed-|ann[-_]seed[-_]|topic[-_]teacher[-_]sample[-_]|teacher_sample_01$)/i.test(String(value[field] || ''))) return true;
        }
        return Object.values(value).some(child => child && typeof child === 'object' && isSyntheticRecord(child, depth + 1));
    }
    // Capture authorization before identity cleanup. A queued request would otherwise
    // run after logout with no token, leaving the server session alive.
    const pendingLogoutKey = 'sigma-pending-session-revocations';
    let logoutFlush = null, logoutRetry = null;
    function pendingLogouts() {
        try { return JSON.parse(sessionStorage.getItem(pendingLogoutKey) || '[]').filter(token => /^[a-f0-9]{64}$/.test(token)); }
        catch (_) { return []; }
    }
    function flushLogouts() {
        if (logoutFlush) return logoutFlush;
        const tokens = pendingLogouts();
        logoutFlush = Promise.all(tokens.map(async token => {
            try {
                const response = await nativeFetch(url('session'), {
                    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ action: 'logout' }), keepalive: true,
                    cache: 'no-store', credentials: 'omit'
                });
                if (!response.ok || (await response.json()).success !== true) return;
                const remaining = pendingLogouts().filter(value => value !== token);
                if (remaining.length) sessionStorage.setItem(pendingLogoutKey, JSON.stringify(remaining));
                else sessionStorage.removeItem(pendingLogoutKey);
            } catch (_) { /* The landing page retries when the connection returns. */ }
        })).finally(() => {
            logoutFlush = null;
            clearTimeout(logoutRetry);
            if (pendingLogouts().length) logoutRetry = setTimeout(flushLogouts, 5000);
        });
        return logoutFlush;
    }
    function revokeSession() {
        let token;
        try { token = JSON.parse(sessionStorage.getItem('sigma-grade-sync-session') || 'null')?.token; } catch (_) {}
        if (/^[a-f0-9]{64}$/.test(token || '')) sessionStorage.setItem(pendingLogoutKey, JSON.stringify([...new Set([...pendingLogouts(), token])]));
        return flushLogouts();
    }
    if (pendingLogouts().length) flushLogouts();
    window.addEventListener('online', flushLogouts);
    window.addEventListener('pageshow', flushLogouts);
    window.SigmaDatabase = Object.freeze({ url, request, readJson, fetch: fetchWithIdentity, preserveLegacy, currentUser, save, revokeSession, isSyntheticRecord });
    // Both admin and teacher subject editors use these exact adapters.
    window.syncSubjectToDB = (subject, action = 'save') => save('subjects', action === 'save' ? { action, subject } : { ...subject, action });
    window.deleteSubjectFromDB = id => save('subjects', { action: 'delete', id, actor: currentUser().id || '' });
    window.syncSectionToDB = (section, action = 'save') => save('sections', action === 'save' ? { action, section } : { ...section, action });
    window.deleteSectionFromDB = id => save('sections', { action: 'delete', id, actor: currentUser().id || '' });
    window.syncSchoolYearToDB = data => save('school_years', { ...data, actor: currentUser().id || '' });
    window.syncUserToDB = (user, action = 'save') => save('users', action === 'save' ? { action, user } : { ...user, action });
})();
