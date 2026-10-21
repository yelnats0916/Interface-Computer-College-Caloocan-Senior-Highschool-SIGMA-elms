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
    let verification = null;
    let verifiedToken = null;
    let signingOut = false;
    let gateMessage = 'Checking your session...';
    const gateStyle = document.createElement('style');
    gateStyle.textContent = 'html[data-sigma-session-check] body > :not(#sigma-session-status){visibility:hidden!important} #sigma-session-status{position:fixed;inset:0;z-index:2147483647;background:white;color:#111;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:24px;text-align:center;font:16px Arial,sans-serif}';
    document.head.appendChild(gateStyle);
    const spinnerStyle = document.createElement('style');
    spinnerStyle.textContent = '#sigma-session-status .sigma-transition-spinner{width:32px;height:32px;border:3px solid rgba(0,0,0,.10);border-top-color:rgba(0,0,0,.50);border-radius:50%;animation:sigma-transition-spin .8s linear infinite}@keyframes sigma-transition-spin{to{transform:rotate(360deg)}}#sigma-session-status p{color:rgba(0,0,0,.5);font:14px Inter,Arial,sans-serif}';
    document.head.appendChild(spinnerStyle);
    function renderGate() {
        if (!document.body || isLoginPage) return;
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
        if (gateMessage !== 'Checking your session...' && !signingOut) {
            const retry = document.createElement('button');
            retry.type = 'button'; retry.textContent = 'Retry';
            retry.addEventListener('click', () => verifyDatabaseSession());
            status.appendChild(retry);
            const login = document.createElement('button');
            login.type = 'button'; login.textContent = 'Sign out and return to Login';
            login.addEventListener('click', () => {
                window.SigmaDatabase?.revokeSession();
                clearIdentity();
                window.location.replace(new URL('index.html', document.baseURI).href);
            });
            status.appendChild(login);
        }
    }
    function setGate(message) {
        if (isLoginPage) return;
        gateMessage = message || 'Checking your session...';
        document.documentElement.toggleAttribute('data-sigma-session-check', !!message);
        renderGate();
    }
    document.addEventListener('DOMContentLoaded', renderGate);
    document.addEventListener('click', event => {
        const link = event.target.closest?.('a.profile-logout-btn');
        if (!link || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        if (signingOut) return;
        signingOut = true;
        setGate('Signing out…');
        // Existing logout handlers still clear/revoke the session during this click.
        // Paint the spinner before starting the document navigation.
        let navigating = false;
        const navigate = () => {
            if (navigating) return;
            navigating = true;
            window.location.replace(new URL('index.html', document.baseURI).href);
        };
        requestAnimationFrame(() => requestAnimationFrame(navigate));
        setTimeout(navigate, 300);
    }, true);
    function clearIdentity() {
        [SESSION_KEY, 'currentUser', 'sigma-grade-sync-session', 'sigma-login-challenge', 'sigma-login-handoff'].forEach(key => sessionStorage.removeItem(key));
        SHARED_KEYS.forEach(key => localStorage.removeItem(key));
    }
    function portalForRole(role) {
        const value = String(role || '').replace(/[\s_-]+/g, '').toLowerCase();
        if (['admin', 'administrator', 'masteradmin'].includes(value)) return 'admin.html';
        if (['teacher', 'faculty', 'instructor'].includes(value)) return 'teacher.html';
        if (['student', 'learner'].includes(value)) return 'student.html';
        return null;
    }
    window.SigmaSessionNavigation = Object.freeze({ portalForRole });
    function verifyDatabaseSession({ background = false } = {}) {
        if (signingOut) return Promise.resolve();
        if (verification) return verification;
        const user = getTabSessionUser();
        if (!user) {
            if (!isLoginPage) {
                setGate('Checking your session...');
                clearIdentity();
                window.location.replace(new URL('index.html', document.baseURI).href);
            }
            return Promise.resolve();
        }
        const token = readJson(sessionStorage, 'sigma-grade-sync-session')?.token;
        // Keep an already verified dashboard visible during routine focus checks.
        // Initial loads, history restoration, and changed identities still use the gate.
        if (!background || verifiedToken !== token) setGate('Checking your session...');
        verification = (async () => {
            try {
                const result = await window.SigmaDatabase.request('session');
                // A logout or new sign-in may have occurred while the server was responding.
                if (readJson(sessionStorage, 'sigma-grade-sync-session')?.token !== token) return;
                const portal = portalForRole(result.user.role);
                if (!portal) throw Object.assign(new Error('This account has no portal access.'), { status: 403 });
                sessionStorage.setItem(SESSION_KEY, JSON.stringify(result.user));
                sessionStorage.setItem('currentUser', JSON.stringify(result.user));
                if (isLoginPage || (!location.pathname.endsWith('/' + portal) && !location.pathname.endsWith('/quiz-creator.html'))) {
                    window.location.replace(new URL(portal, document.baseURI).href);
                    return;
                }
                syncTabIdentity();
                verifiedToken = token;
                setGate(null);
                window.dispatchEvent(new Event('sigma:database-session-ready'));
            } catch (error) {
                if (readJson(sessionStorage, 'sigma-grade-sync-session')?.token !== token) return;
                if (error.status === 401 || error.status === 403) {
                    verifiedToken = null;
                    setGate('Checking your session...');
                    clearIdentity();
                    if (!isLoginPage) window.location.replace(new URL('index.html', document.baseURI).href);
                } else {
                    setGate('Your session could not be verified. Check your connection and retry.');
                    window.dispatchEvent(new CustomEvent('sigma:database-error', { detail: { endpoint: 'session', message: error.message } }));
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
    if (immediateLogin) verifiedToken = arrivingToken;
    verifyDatabaseSession({ background: !!immediateLogin });

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
    window.addEventListener('focus', () => {
        verifyDatabaseSession({ background: true });
        if (syncTabIdentity()) {
            window.dispatchEvent(new CustomEvent('sigma:tab-identity-restored'));
        }
    });
    window.addEventListener('pagehide', () => { setGate(signingOut ? 'Signing out…' : 'Checking your session...'); });
    window.addEventListener('pageshow', event => { verifyDatabaseSession({ background: !event.persisted }); });
})();
