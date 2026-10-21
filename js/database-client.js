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
    function fetchWithIdentity(input, options = {}) {
        const target = new URL(typeof input === 'string' || input instanceof URL ? input : input.url, location.href);
        const resource = input instanceof URL ? input.href : input;
        const apiRoot = new URL('.', url('session'));
        if (target.origin !== apiRoot.origin || !target.pathname.startsWith(apiRoot.pathname)) return nativeFetch(resource, options);
        const headers = new Headers(options.headers || (input instanceof Request ? input.headers : undefined));
        if (!headers.has('Authorization')) {
            let full, challenge;
            try { full = JSON.parse(sessionStorage.getItem('sigma-grade-sync-session') || 'null'); } catch (_) {}
            try { challenge = JSON.parse(sessionStorage.getItem('sigma-login-challenge') || 'null'); } catch (_) {}
            const token = full?.token || challenge?.token;
            if (token) headers.set('Authorization', `Bearer ${token}`);
        }
        return nativeFetch(resource, { ...options, headers });
    }
    async function request(name, options = {}) {
        const { data, query, signal } = options;
        const target = new URL(url(name));
        if (query) Object.entries(query).forEach(([key, value]) => target.searchParams.set(key, value));
        const response = await fetchWithIdentity(target, {
            method: data === undefined ? 'GET' : 'POST',
            credentials: 'omit',
            cache: 'no-store',
            signal: signal || (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(15000) : undefined),
            headers: { 'Content-Type': 'application/json' },
            ...(data === undefined ? {} : { body: JSON.stringify(data) })
        });
        let result;
        try { result = await response.json(); }
        catch (_) { throw new Error('The database service did not return JSON. Check the PHP server address.'); }
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
            await request(name, { data });
            return true;
        } catch (error) {
            const message = error.message || 'Database save failed. Your changes have not been confirmed.';
            window.showToast?.(message, 'error');
            window.dispatchEvent(new CustomEvent('sigma:database-error', { detail: { endpoint: name, message } }));
            return false;
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
    function revokeSession() {
        return fetchWithIdentity(url('session'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout' }), keepalive: true }).catch(() => {});
    }
    window.SigmaDatabase = Object.freeze({ url, request, fetch: fetchWithIdentity, preserveLegacy, currentUser, save, revokeSession, isSyntheticRecord });
    // Both admin and teacher subject editors use these exact adapters.
    window.syncSubjectToDB = (subject, action = 'save') => save('subjects', action === 'save' ? { action, subject } : { ...subject, action });
    window.deleteSubjectFromDB = id => save('subjects', { action: 'delete', id, actor: currentUser().id || '' });
    window.syncSectionToDB = (section, action = 'save') => save('sections', action === 'save' ? { action, section } : { ...section, action });
    window.deleteSectionFromDB = id => save('sections', { action: 'delete', id, actor: currentUser().id || '' });
    window.syncSchoolYearToDB = data => save('school_years', { ...data, actor: currentUser().id || '' });
    window.syncUserToDB = (user, action = 'save') => save('users', action === 'save' ? { action, user } : { ...user, action });
})();
