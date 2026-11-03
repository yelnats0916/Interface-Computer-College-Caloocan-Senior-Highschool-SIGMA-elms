/**
 * SIGMA ELMS - Per-Tab Session Identity
 *
 * localStorage is shared by every tab, so logging in as another user in a second
 * tab used to overwrite the identity that the first tab read (sidebar classes,
 * classroom rooms, announcements, profile). This script makes the tab's own
 * sessionStorage login the single source of truth and mirrors it into the shared
 * localStorage keys whenever this tab is loaded or focused.
 */
(function () {
    'use strict';

    const SESSION_KEY = 'sigma-authenticated-user';
    const SHARED_KEYS = ['sigma-logged-in-user', 'currentUser', 'sigma_active_user'];

    function readJson(storage, key) {
        try {
            const raw = storage.getItem(key);
            return raw ? JSON.parse(raw) : null;
        } catch (_) {
            return null;
        }
    }

    function idOf(user) {
        return String((user && (user.uid || user.id)) || '').replace(/^#/, '').trim().toLowerCase();
    }

    function getTabSessionUser() {
        const user = readJson(sessionStorage, SESSION_KEY);
        const session = readJson(sessionStorage, 'sigma-grade-sync-session');
        if (!user || !session?.token || idOf(user) !== String(session.userId || '').toLowerCase()) return null;
        return user;
    }

    function syncTabIdentity() {
        const user = getTabSessionUser();
        if (!user) return false;
        const tabId = idOf(user);
        let changed = false;

        try {
            const cur = readJson(sessionStorage, 'currentUser');
            if (!cur || idOf(cur) !== tabId) {
                sessionStorage.setItem('currentUser', JSON.stringify(user));
            }
            if (!readJson(sessionStorage, SESSION_KEY)) {
                sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
            }
        } catch (_) {}

        SHARED_KEYS.forEach(key => {
            const shared = readJson(localStorage, key);
            if (!shared || idOf(shared) !== tabId) {
                try {
                    localStorage.setItem(key, JSON.stringify(user));
                    changed = true;
                } catch (_) {}
            }
        });

        if (changed) {
            // Drop identity-derived caches so the UI rebuilds for THIS tab's user
            window._cachedTeacherSectionCards = null;
            window._cachedTeacherSectionCardsTime = 0;
            try {
                const nav = readJson(localStorage, 'sigma-teacher-nav-state');
                if (nav && nav.teacherId && idOf({ id: nav.teacherId }) !== tabId) {
                    localStorage.removeItem('sigma-teacher-nav-state');
                }
            } catch (_) {}
        }
        return changed;
    }

    window.getTabSessionUser = getTabSessionUser;
    window.syncTabIdentity = syncTabIdentity;

    const isLoginPage = /\/(?:index\.html)?$/i.test(location.pathname);
    // Help is public even though it shares the login document.
    const isPublicHelpRoute = () => isLoginPage && (location.hash.toLowerCase() === '#help'
        || sessionStorage.getItem('sigma_target_view') === 'help');
    let verification = null;
    let verifiedToken = null;
    let signingOut = false;
    let loginRecoveryAttempted = false;
    let reconnectTimer = null, reconnectFailures = 0;
    function retrySessionCheck() {
        clearTimeout(reconnectTimer);
        if (signingOut) return;
        reconnectTimer = setTimeout(() => verifyDatabaseSession({ background: true }), Math.min(15000, 1000 * 2 ** Math.min(reconnectFailures++, 4)));
    }
    let gateMessage = 'Checking your session...';
    const gateStyle = document.createElement('style');
    gateStyle.textContent = 'html[data-sigma-session-check]:not([data-sigma-session-shimmer]) body > :not(#sigma-session-status){visibility:hidden!important} html[data-sigma-session-shimmer] #sigma-session-status{display:none!important} html[data-sigma-session-shimmer] body{pointer-events:none!important} #sigma-session-status{position:fixed;inset:0;z-index:2147483647;background:white;color:#111;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:24px;text-align:center;font:16px Arial,sans-serif}';
    document.head.appendChild(gateStyle);
    const spinnerStyle = document.createElement('style');
    spinnerStyle.textContent = '#sigma-session-status .sigma-transition-spinner{width:clamp(48px,8vmin,72px);height:clamp(48px,8vmin,72px);background:radial-gradient(circle at 50% 10%, rgba(0,0,0,.55) 0 6%, transparent 7%), radial-gradient(circle at 78% 22%, rgba(0,0,0,.48) 0 6%, transparent 7%), radial-gradient(circle at 90% 50%, rgba(0,0,0,.41) 0 6%, transparent 7%), radial-gradient(circle at 78% 78%, rgba(0,0,0,.34) 0 6%, transparent 7%), radial-gradient(circle at 50% 90%, rgba(0,0,0,.27) 0 6%, transparent 7%), radial-gradient(circle at 22% 78%, rgba(0,0,0,.20) 0 6%, transparent 7%), radial-gradient(circle at 10% 50%, rgba(0,0,0,.13) 0 6%, transparent 7%), radial-gradient(circle at 22% 22%, rgba(0,0,0,.08) 0 6%, transparent 7%);animation:sigma-transition-spin 1s steps(8,end) infinite}@keyframes sigma-transition-spin{to{transform:rotate(360deg)}}#sigma-session-status p{color:rgba(0,0,0,.5);font:14px Inter,Arial,sans-serif}';
    document.head.appendChild(spinnerStyle);
    let shellBusyState = null;
    function syncShellBusy() {
        if (!document.body) return;
        if (document.documentElement.hasAttribute('data-sigma-session-shimmer')) {
            if (!shellBusyState) shellBusyState = {inert:document.body.inert, busy:document.body.getAttribute('aria-busy')};
            document.body.inert = true;
            document.body.setAttribute('aria-busy','true');
        } else if (shellBusyState) {
            document.body.inert = shellBusyState.inert;
            if (shellBusyState.busy === null) document.body.removeAttribute('aria-busy');
            else document.body.setAttribute('aria-busy',shellBusyState.busy);
            shellBusyState = null;
        }
    }
    function renderGate() {
        if (!document.body || isLoginPage) return;
        syncShellBusy();
        let status = document.getElementById('sigma-session-status');
        if (!document.documentElement.hasAttribute('data-sigma-session-check')) {
            status?.remove();
            return;
        }
        if (!status) {
            status = document.createElement('div');
            status.id = 'sigma-session-status';
            status.setAttribute('role', 'status');
            document.body.appendChild(status);
        }
        status.replaceChildren();
        if (gateMessage === 'Checking your session...' || signingOut) {
            const spinner = document.createElement('div');
            spinner.className = 'sigma-transition-spinner';
            spinner.setAttribute('aria-hidden', 'true');
            status.appendChild(spinner);
        }
        const message = document.createElement('p');
        message.textContent = gateMessage;
        status.appendChild(message);

    }
    function setGate(message) {
        if (isLoginPage) return;
        gateMessage = message || 'Checking your session...';
        const root = document.documentElement;
        const hadShimmer = root.hasAttribute('data-sigma-session-shimmer');
        // A saved tab identity still needs server verification, but can use the normal
        // masked, non-interactive page shell instead of hiding the entire document.
        const useShimmer = message === 'Checking your session...' && !signingOut && Boolean(getTabSessionUser());
        root.toggleAttribute('data-sigma-session-shimmer', useShimmer);
        if (useShimmer) root.classList.add('sigma-initial-loading');
        root.toggleAttribute('data-sigma-session-check', !!message);
        if (hadShimmer && !useShimmer) window.dispatchEvent(new Event('sigma:session-loading-complete'));
        renderGate();
    }
    document.addEventListener('DOMContentLoaded', renderGate);
    async function signOutToLogin({ broadcast = true } = {}) {
        if (signingOut) return;
        signingOut = true;
        verifiedToken = null;
        clearTimeout(reconnectTimer);
        // Leave the portal before clearing its identity or aborting its data reads.
        // Their completion handlers can rebuild a busy classroom while navigation
        // is starting. The login document performs cleanup before any recovery.
        const destination = new URL('index.html', document.baseURI);
        destination.searchParams.set('signed_out', '1');
        if (!broadcast) destination.searchParams.set('broadcast', '0');
        window.location.replace(destination.href);
    }
    function finishSignOut({ broadcast = true } = {}) {
        const token = readJson(sessionStorage, 'sigma-grade-sync-session')?.token;
        loginRecoveryAttempted = true;
        try { sessionStorage.setItem('sigma-skip-login-recovery', 'true'); } catch (_) {}
        // This runs in the login document. Session revocation never delays its UI
        // and the database transport remains available for a subsequent sign-in.
        try { window.SigmaDatabase?.revokeSession(token)?.catch?.(() => {}); } catch (_) {}
        clearIdentity();
        removeStored(sessionStorage, 'sigma-login-explicit');
        removeStored(localStorage, 'sigma-login-explicit');
        if (broadcast && token) rememberRevocation(token).catch(() => {});
    }
    document.addEventListener('click', event => {
        const link = event.target.closest?.('a.profile-logout-btn');
        if (!link || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        signOutToLogin();
    }, true);
    function removeStored(storage, key) {
        try { storage.removeItem(key); } catch (_) {}
    }
    function clearIdentity() {
        [SESSION_KEY, 'currentUser', 'sigma-grade-sync-session', 'sigma-login-challenge', 'sigma-login-handoff'].forEach(key => removeStored(sessionStorage, key));
        SHARED_KEYS.forEach(key => removeStored(localStorage, key));
    }
    function portalForRole(role) {
        const value = String(role || '').replace(/[\s_-]+/g, '').toLowerCase();
        if (['admin', 'administrator', 'masteradmin'].includes(value)) return 'admin.html';
        if (['teacher', 'faculty', 'instructor'].includes(value)) return 'teacher.html';
        if (['student', 'learner'].includes(value)) return 'student.html';
        return null;
    }
    function homeForRole(role) {
        const portal = portalForRole(role);
        if (!portal) return null;
        return portal + (portal === 'admin.html' ? '#nav-dashboard' : portal === 'student.html' ? '#home' : '#dashboard');
    }
    function isSessionVerified() {
        const session = readJson(sessionStorage, 'sigma-grade-sync-session');
        return !signingOut && Boolean(verifiedToken && session?.token === verifiedToken && getTabSessionUser());
    }
    window.SigmaSessionNavigation = Object.freeze({
        portalForRole,
        homeForRole,
        isVerified: isSessionVerified,
        isSigningOut: () => signingOut,
        recheck: () => verifyDatabaseSession({ background: true }),
        signOutToLogin,
        async ensureVerified() {
            if (!isSessionVerified()) await verifyDatabaseSession({ background: true });
            return isSessionVerified();
        }
    });
    window.addEventListener('sigma:server-session-ended', event => {
        const token = readJson(sessionStorage, 'sigma-grade-sync-session')?.token;
        if (!isLoginPage && token && token === event.detail?.token) signOutToLogin({ broadcast: false });
    });
    // Recover into a fresh tab without putting bearer tokens in shared localStorage.
    let sessionChannel = null;
    let lastActiveAt = Date.now();
    let pendingRecovery = null;
    // Persist only a one-way fingerprint, never a bearer token, in shared storage.
    // Keep it longer than the server's 12-hour session lifetime so a suspended tab
    // cannot recover a logged-out session while the server revocation is retrying.
    const revocationPrefix = 'sigma-session-revoked:';
    const revocationLifetime = 13 * 60 * 60 * 1000;
    const revokedSessions = new Set();
    const sessionFingerprints = new Map();
    async function sessionFingerprint(token) {
        if (sessionFingerprints.has(token)) return sessionFingerprints.get(token);
        if (!token || !globalThis.crypto?.subtle) return null;
        const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
        const fingerprint = Array.from(new Uint8Array(bytes), value => value.toString(16).padStart(2, '0')).join('');
        sessionFingerprints.set(token, fingerprint);
        return fingerprint;
    }
    function hasRevocation(fingerprint) {
        if (revokedSessions.has(fingerprint)) return true;
        try { return Number(localStorage.getItem(revocationPrefix + fingerprint)) > Date.now(); }
        catch (_) { return false; }
    }
    async function isRevoked(token) {
        const fingerprint = await sessionFingerprint(token);
        return fingerprint && hasRevocation(fingerprint);
    }
    async function rememberRevocation(token) {
        try {
            const fingerprint = await sessionFingerprint(token);
            if (!fingerprint) return;
            revokedSessions.add(fingerprint);
            try { localStorage.setItem(revocationPrefix + fingerprint, String(Date.now() + revocationLifetime)); } catch (_) {}
            sessionChannel?.postMessage({ type: 'session-revoked', fingerprint });
        } catch (_) { /* Server revocation still runs if shared browser storage is unavailable. */ }
    }
    async function receiveRevocation(fingerprint) {
        if (!/^[a-f0-9]{64}$/.test(fingerprint || '')) return;
        revokedSessions.add(fingerprint);
        const token = readJson(sessionStorage, 'sigma-grade-sync-session')?.token;
        if (token && await sessionFingerprint(token) === fingerprint
            && readJson(sessionStorage, 'sigma-grade-sync-session')?.token === token) {
            signOutToLogin({ broadcast: false });
        }
    }
    // Remove expired markers without touching any school records or other caches.
    try {
        for (const key of Object.keys(localStorage)) {
            if (key.startsWith(revocationPrefix) && Number(localStorage.getItem(key)) <= Date.now()) localStorage.removeItem(key);
        }
    } catch (_) {}
    try { sessionChannel = new BroadcastChannel('sigma-verified-tab-session-v1'); } catch (_) {}
    window.addEventListener('storage', event => {
        if (event.key?.startsWith(revocationPrefix) && Number(event.newValue) > Date.now()) {
            receiveRevocation(event.key.slice(revocationPrefix.length)).catch(() => {});
        }
    });
    window.addEventListener('focus', () => { lastActiveAt = Date.now(); });
    sessionChannel?.addEventListener('message', event => {
        const message = event.data;
        if (message?.type === 'session-revoked') {
            receiveRevocation(message.fingerprint).catch(() => {});
        } else if (message?.type === 'request-session' && typeof message.nonce === 'string') {
            const user = getTabSessionUser();
            const session = readJson(sessionStorage, 'sigma-grade-sync-session');
            if (!signingOut && user && session?.token === verifiedToken) {
                sessionChannel.postMessage({type: 'session-candidate', nonce: message.nonce,
                    user, session, lastActiveAt});
            }
        } else if (message?.type === 'session-candidate' && pendingRecovery?.nonce === message.nonce) {
            const userId = idOf(message.user);
            if (userId && typeof message.session?.token === 'string'
                && userId === String(message.session.userId || '').toLowerCase()) {
                pendingRecovery.candidates.push(message);
            }
        }
    });
    async function recoverFromOpenTab() {
        if (!sessionChannel) return false;
        const nonce = crypto.randomUUID();
        const recovery = {nonce, candidates: []};
        pendingRecovery = recovery;
        sessionChannel.postMessage({type: 'request-session', nonce});
        await new Promise(resolve => setTimeout(resolve, 1000));
        pendingRecovery = null;
        // Prefer the requested portal when several roles are signed in in separate tabs.
        recovery.candidates.sort((a, b) => {
            const matches = candidate => location.pathname.endsWith('/' + portalForRole(candidate.user.role));
            return Number(matches(b)) - Number(matches(a)) || Number(b.lastActiveAt) - Number(a.lastActiveAt);
        });
        for (const candidate of recovery.candidates) {
            if (signingOut || isPublicHelpRoute()) return false;
            if (await isRevoked(candidate.session.token)) continue;
            // Do not trust a browser user object as authentication or authorization.
            const response = await window.SigmaDatabase.fetch(window.SigmaDatabase.url('session'), {
                cache: 'no-store', credentials: 'omit',
                headers: {Authorization: `Bearer ${candidate.session.token}`},
                signal: AbortSignal.timeout(15000)
            });
            if (response.status === 401 || response.status === 403) continue;
            if (!response.ok) throw new Error('Session verification unavailable.');
            const result = await response.json();
            if (!result.success || idOf(result.user) !== idOf(candidate.user)) continue;
            if (await isRevoked(candidate.session.token)) continue;
            if (signingOut || isPublicHelpRoute() || (isLoginPage && readJson(sessionStorage, 'sigma-login-challenge'))) return false;
            const portal = portalForRole(result.user.role);
            if (!portal) continue;
            if (isLoginPage && portal === 'admin.html' && window.SigmaAdminDeviceAccess?.restricted()) continue;
            sessionStorage.setItem('sigma-grade-sync-session', JSON.stringify(candidate.session));
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(result.user));
            sessionStorage.setItem('currentUser', JSON.stringify(result.user));
            // Reload with identity available before role scripts initialize; preserve the URL/hash.
            if (isLoginPage) window.location.replace(new URL(homeForRole(result.user.role), document.baseURI).href);
            else window.location.reload();
            return true;
        }
        return false;
    }
    function verifyDatabaseSession({ background = false } = {}) {
        if (signingOut || isPublicHelpRoute()) return Promise.resolve();
        if (verification) return verification;
        const user = getTabSessionUser();
        if (!user) {
            if (isLoginPage) {
                if (loginRecoveryAttempted || sessionStorage.getItem('sigma-skip-login-recovery') === 'true'
                    || readJson(sessionStorage, 'sigma-login-challenge')) return Promise.resolve();
                loginRecoveryAttempted = true;
                verification = recoverFromOpenTab().catch(() => false).finally(() => { verification = null; });
                return verification;
            }
            setGate('Checking your session...');
            // Back/Forward and pasted protected links in a signed-out tab must
            // not silently adopt a different session that is still open elsewhere.
            if (sessionStorage.getItem('sigma-skip-login-recovery') === 'true') {
                clearIdentity();
                window.location.replace(new URL('index.html', document.baseURI).href);
                return Promise.resolve();
            }
            verification = recoverFromOpenTab().then(recovered => {
                if (!recovered && !signingOut) {
                    clearIdentity();
                    window.location.replace(new URL('index.html', document.baseURI).href);
                }
            }).catch(() => {
                setGate('Checking your session...');
                retrySessionCheck();
            }).finally(() => { verification = null; });
            return verification;
        }
        const token = readJson(sessionStorage, 'sigma-grade-sync-session')?.token;
        // Keep an already verified dashboard visible during routine focus checks.
        // Initial loads, history restoration, and changed identities still use the gate.
        if (verifiedToken !== token) setGate('Checking your session...');
        verification = (async () => {
            try {
                const revoked = await isRevoked(token);
                if (signingOut || readJson(sessionStorage, 'sigma-grade-sync-session')?.token !== token) return;
                if (revoked) {
                    signOutToLogin({ broadcast: false });
                    return;
                }
                const result = await window.SigmaDatabase.request('session', { authentication: true });
                // A logout or new sign-in may have occurred while the server was responding.
                if (readJson(sessionStorage, 'sigma-grade-sync-session')?.token !== token) return;
                const portal = portalForRole(result.user.role);
                if (!portal) throw Object.assign(new Error('This account has no portal access.'), { status: 403, authFailureConfirmed: true });
                sessionStorage.setItem(SESSION_KEY, JSON.stringify(result.user));
                sessionStorage.setItem('currentUser', JSON.stringify(result.user));
                if (isPublicHelpRoute()) return;
                if (isLoginPage || (!location.pathname.endsWith('/' + portal) && !location.pathname.endsWith('/quiz-creator.html'))) {
                    window.location.replace(new URL(homeForRole(result.user.role), document.baseURI).href);
                    return;
                }
                syncTabIdentity();
                verifiedToken = token;
                clearTimeout(reconnectTimer); reconnectFailures = 0;
                setGate(null);
                window.dispatchEvent(new Event('sigma:database-session-ready'));
            } catch (error) {
                if (readJson(sessionStorage, 'sigma-grade-sync-session')?.token !== token) return;
                if (([401,403].includes(error.status) && error.authFailureConfirmed === true) || (error.status === 423 && error.code === 'system_maintenance')) {
                    verifiedToken = null;
                    if (isLoginPage) clearIdentity();
                    else signOutToLogin({ broadcast: false });
                } else {
                    if (verifiedToken === token) setGate(null);
                    else setGate('Checking your session...');
                    retrySessionCheck();
                }
            } finally {
                verification = null;
                if (readJson(sessionStorage, 'sigma-grade-sync-session')?.token !== token) {
                    Promise.resolve().then(verifyDatabaseSession);
                }
            }
        })();
        return verification;
    }
    // Complete explicit logout before session verification, tab recovery, or login
    // page scripts can reuse the old identity. The query carries no credentials.
    const landingUrl = new URL(document.baseURI);
    if (isLoginPage && landingUrl.searchParams.get('signed_out') === '1') {
        finishSignOut({ broadcast: landingUrl.searchParams.get('broadcast') !== '0' });
        landingUrl.searchParams.delete('signed_out');
        landingUrl.searchParams.delete('broadcast');
        history.replaceState(null, '', landingUrl.href);
    }
    // Consume the immediate post-login handoff once. It only suppresses the
    // redundant loading screen; the session request and API authorization still run.
    const handoff = readJson(sessionStorage, 'sigma-login-handoff');
    sessionStorage.removeItem('sigma-login-handoff');
    const arrivingUser = getTabSessionUser();
    const arrivingToken = readJson(sessionStorage, 'sigma-grade-sync-session')?.token;
    const handoffAge = Date.now() - Number(handoff?.issuedAt);
    const immediateLogin = !isLoginPage && arrivingUser && handoff?.token === arrivingToken
        && String(handoff.userId) === String(arrivingUser.id || arrivingUser.uid)
        && handoffAge >= 0 && handoffAge < 30000
        && location.pathname.endsWith('/' + portalForRole(arrivingUser.role));
    // A login starts a new navigation journey. Consume this handoff before
    // role scripts can restore another session's saved section or topic.
    // Ordinary reloads, focus checks and same-session links keep their route.
    const freshLogin = !isLoginPage && arrivingUser && handoff?.token === arrivingToken
        && String(handoff.userId) === String(arrivingUser.id || arrivingUser.uid)
        && location.pathname.endsWith('/' + portalForRole(arrivingUser.role));
    if (freshLogin) {
        for (const key of ['sigma-admin-active-tab', 'sigma-student-nav-state', 'sigma-teacher-nav-state',
            'sigma-last-active-classroom', 'sigmaPanelOpen', 'sigmaFirstVisit']) sessionStorage.removeItem(key);
        history.replaceState(null, '', new URL(homeForRole(arrivingUser.role), document.baseURI).href);
    }
    if (immediateLogin) verifiedToken = arrivingToken;
    const initialVerification = verifyDatabaseSession({ background: !!immediateLogin });
    if (isLoginPage) window.sigmaLoginSessionReady = initialVerification;

    // Revocations from another device are checked even while this tab stays open.
    setInterval(() => { if (!document.hidden && !isLoginPage && !signingOut) verifyDatabaseSession({ background: true }); }, 30000);
    let wasHidden = false;
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            wasHidden = true;
            return;
        }
        if (wasHidden) verifyDatabaseSession({ background: true });
        if (wasHidden && syncTabIdentity()) {
            window.dispatchEvent(new CustomEvent('sigma:tab-identity-restored'));
        }
        wasHidden = false;
    });
    window.addEventListener('online', () => {
        clearTimeout(reconnectTimer);
        verifyDatabaseSession({ background: true });
    });
    window.addEventListener('focus', () => {
        verifyDatabaseSession({ background: true });
        if (syncTabIdentity()) {
            window.dispatchEvent(new CustomEvent('sigma:tab-identity-restored'));
        }
    });
    window.addEventListener('pagehide', () => { if (!signingOut) setGate('Checking your session...'); });
    window.addEventListener('pageshow', event => { verifyDatabaseSession({ background: !event.persisted }); });
})();
