(function () {
    'use strict';
    const originalFetch = window.fetch.bind(window);
    let token = '', expires = 0, pending = null, canceled = false, authorizationEpoch = 0;
    let verifiedRecoveryOwner = '';
    let recoveryVisitEpoch = 0;
    const recoveryRefreshKey = 'sigma-recovery-refresh-tab';
    let recoveryRefreshTab = '', resumeAfterReload = false;
    try {
        const reload = performance.getEntriesByType('navigation')[0]?.type === 'reload';
        const stored = sessionStorage.getItem(recoveryRefreshKey) || '';
        if (reload && location.hash === '#nav-settings-recovery' && /^[a-f0-9]{32}$/.test(stored)) { recoveryRefreshTab = stored; resumeAfterReload = true; }
        else sessionStorage.removeItem(recoveryRefreshKey);
    } catch (_) {}
    function recoveryTab() {
        if (!recoveryRefreshTab) recoveryRefreshTab = Array.from(crypto.getRandomValues(new Uint8Array(16)), n => n.toString(16).padStart(2,'0')).join('');
        return recoveryRefreshTab;
    }
    function rememberRecoveryVisit() {
        try { sessionStorage.setItem(recoveryRefreshKey, recoveryTab()); } catch (_) {}
    }
    function primarySessionToken() {
        try { return JSON.parse(sessionStorage.getItem('sigma-grade-sync-session') || 'null')?.token || ''; } catch (_) { return ''; }
    }
    function clearRecoveryRefresh() {
        const tab = recoveryRefreshTab; recoveryRefreshTab = ''; resumeAfterReload = false;
        try { sessionStorage.removeItem(recoveryRefreshKey); } catch (_) {}
        if (tab) originalFetch(new URL('php/api/auth.php',location.href), {method:'POST',keepalive:true,headers:{'Content-Type':'application/json','Authorization':'Bearer '+primarySessionToken()},body:JSON.stringify({action:'clear_recovery_verification',recoveryTab:tab})}).catch(()=>{});
    }
    async function resumeRecoveryVerification(api) {
        if (!resumeAfterReload) return false;
        resumeAfterReload = false;
        try {
            const response = await originalFetch(api,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+primarySessionToken()},signal:AbortSignal.timeout(15000),body:JSON.stringify({action:'resume_recovery_verification',recoveryTab:recoveryRefreshTab})});
            const result = await response.json();
            if (!response.ok || !result.success || !/^[a-f0-9]{64}$/.test(result.token || '') || !(result.expires_in > 0)) return false;
            token = result.token; expires = Date.now()+Number(result.expires_in)*1000; return true;
        } catch (_) { return false; }
    }
    const panels = { ai: 'SIGMA AI Integration Engines', drive: 'Google Drive Cloud Storage', recaptcha: 'Google reCAPTCHA Protection', recovery: 'Record Recovery', backups: 'Database Backups', maintenance: 'System Maintenance' };
    function indicator(message, loading = false, type = 'info') {
        window.SigmaFeedback.notify(message, loading ? 'progress' : type, {
            id:'administrator-verification', placement:'bottom-left', compact:true, persistent:loading
        });
    }
    const canceledError = () => Object.assign(new Error('Administrator verification was canceled.'), { code: 'VAULT_AUTH_CANCELED' });
    function configureFields() {
        try { localStorage.removeItem('sigma-api-keys'); localStorage.removeItem('sigma-api-vault-pass'); } catch (_) {}
        document.querySelectorAll('input').forEach(input => {
            if (!/(api.*key|site.*key|secret.*key|key.*secret|ai-form-key-input)/i.test(input.id) || input.dataset.secretRestricted) return;
            input.dataset.secretRestricted = 'true';
            input.maxLength = /site.*key/i.test(input.id) ? 255 : (input.id.includes('secret') ? 4096 : 2048);
            input.autocomplete = 'off';
            input.spellcheck = false;
            input.setAttribute('autocapitalize', 'off');
            const validate = () => input.setCustomValidity(input.value.trim() && /[\s\x00-\x1f\x7f]/.test(input.value.trim()) ? 'Keys cannot contain spaces, line breaks, or control characters.' : '');
            input.addEventListener('input', validate);
            input.addEventListener('paste', event => {
                const text = event.clipboardData?.getData('text');
                if (text === undefined) return;
                const value = text.trim();
                if (/[\s\x00-\x1f\x7f]/.test(value) || value.length > input.maxLength) { event.preventDefault(); input.setCustomValidity('Paste a complete key within the size limit, without spaces or line breaks.'); input.reportValidity(); return; }
                event.preventDefault();
                input.setRangeText(value, input.selectionStart || 0, input.selectionEnd || 0, 'end');
                input.dispatchEvent(new Event('input', { bubbles: true }));
            });
        });
    }
    function recordVerificationActivity(outcome, panel) {
        const names = { success: 'Administrator settings verification succeeded', failed: 'Administrator settings verification failed', canceled: 'Administrator settings verification canceled' };
        window.recordActivityLog?.(names[outcome], { module: 'Security', details: (panel === 'recovery' ? 'Protected page: ' : 'API panel: ') + (panels[panel] || 'Protected settings') + '\nNo credentials are recorded.' });
    }
    function authorize(api, panel = '') {
        if (canceled) return Promise.reject(canceledError());
        if (pending) return pending;
        pending = new Promise((resolve, reject) => {
            const dialog = document.createElement('dialog');
            dialog.className = 'service-vault-auth';
            dialog.setAttribute('aria-labelledby', 'service-vault-auth-title');
            dialog.setAttribute('aria-describedby', 'service-vault-auth-description');
            dialog.innerHTML = '<form><h2 id="service-vault-auth-title">Verify Administrator</h2><p id="service-vault-auth-description"></p><label>Login ID<input name="login" autocomplete="username" readonly aria-readonly="true" required maxlength="150"></label><label>Password<input name="password" type="password" autocomplete="current-password" required maxlength="256"></label><p class="service-vault-error" role="alert" hidden></p><div class="service-vault-auth-actions"><button type="button" class="sigma-dialog-btn-cancel" data-cancel>Cancel</button><button type="submit" class="sigma-dialog-btn-confirm">Verify</button></div></form>';
            dialog.querySelector('#service-vault-auth-description').textContent = 'Confirm your password to open ' + (['recovery','backups'].includes(panel) ? 'Backup & Recovery' : (panels[panel] || 'protected settings')) + '.';
            document.body.append(dialog);
            const form = dialog.querySelector('form');
            let submitting = false, settled = false;
            const opener = document.activeElement;
            const close = () => { form.reset(); dialog.close(); dialog.remove(); };
            const cancel = () => {
                if (submitting || settled) return;
                settled = true; canceled = true; authorizationEpoch++;
                let sessionToken = '';
                try { sessionToken = JSON.parse(sessionStorage.getItem('sigma-grade-sync-session') || 'null')?.token || ''; } catch (_) {}
                originalFetch(new URL('auth.php', api).href, {
                    method: 'POST', keepalive: true,
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + sessionToken },
                    body: JSON.stringify({ action: 'cancel_service_vault_verification', panel })
                }).then(async response => { if (response.ok && (await response.json()).success) recordVerificationActivity('canceled', panel); }).catch(() => {});
                close();
                indicator('Verification canceled' + (panels[panel] ? ': ' + panels[panel] : '') + '.');
                if (opener?.isConnected) opener.focus({ preventScroll: true });
                reject(canceledError());
            };
            dialog.querySelector('[data-cancel]').onclick = cancel;
            dialog.addEventListener('cancel', event => { event.preventDefault(); cancel(); });
            form.onsubmit = async event => {
                event.preventDefault();
                if (submitting) return;
                submitting = true;
                const button = form.querySelector('[type="submit"]');
                const error = dialog.querySelector('.service-vault-error');
                button.disabled = true;
                button.textContent = '';
                button.innerHTML = '<span class="vault-verifying-dots" aria-hidden="true"><span></span><span></span><span></span></span>';
                button.setAttribute('aria-label', 'Verifying administrator');
                button.setAttribute('aria-busy', 'true');
                error.hidden = true;
                form.elements.password.readOnly = true;
                try {
                    const response = await originalFetch(new URL('auth.php', api).href, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (JSON.parse(sessionStorage.getItem('sigma-grade-sync-session') || 'null')?.token || '') },
                        signal: AbortSignal.timeout(15000),
                        body: JSON.stringify({ action: 'authorize_service_vault', panel, login: form.elements.login.value.trim(), password: form.elements.password.value, ...(['recovery','backups'].includes(panel) ? {recoveryTab:recoveryTab()} : {}) }) });
                    if (response.status >= 500) throw new Error('The verification service is temporarily unavailable. Please try again.');
                    let result;
                    try { result = await response.json(); }
                    catch (_) { throw new Error('The verification service returned an unexpected response. Please reload the page and try again.'); }
                    if (!result || typeof result !== 'object') throw new Error('Administrator verification could not be completed. Please try again.');
                    if (!response.ok || !result.success || !/^[a-f0-9]{64}$/.test(result.token || '')) {
                        if (result.error === 'The administrator password is incorrect.') recordVerificationActivity('failed', panel);
                        throw new Error(result.error || 'Administrator verification failed.');
                    }
                    recordVerificationActivity('success', panel);
                    indicator('Administrator verified. Loading ' + (panels[panel] || 'settings') + '…', true, 'success');
                    settled = true; canceled = false;
                    token = result.token;
                    expires = Date.now() + Number(result.expires_in || 900) * 1000;
                    close(); resolve();
                } catch (failure) {
                    error.textContent = ['TimeoutError','AbortError'].includes(failure.name)
                        ? 'Verification timed out. Please try again.'
                        : failure instanceof TypeError ? 'Could not reach the verification service. Check your connection and try again.' : failure.message;
                    error.hidden = false;
                    form.elements.password.value = '';
                } finally {
                    submitting = false; button.disabled = false;
                    button.textContent = 'Verify'; button.removeAttribute('aria-busy'); button.removeAttribute('aria-label');
                    form.elements.password.readOnly = false;
                    if (!settled) form.elements.password.focus();
                }
            };
            dialog.showModal();
            let user = {};
            try { user = JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}'); } catch (_) {}
            form.elements.login.value = user.id || user.uid || '';
            form.elements.password.focus();
        }).finally(() => { pending = null; });
        return pending;
    }
    window.SigmaServiceVault = {
        isVerified: () => Boolean(token && expires > Date.now()),
        wasCanceled: () => canceled,
        endRecoveryVisit() {
            recoveryVisitEpoch++;
            clearRecoveryRefresh();
            if (verifiedRecoveryOwner) { token = ''; expires = 0; }
            verifiedRecoveryOwner = '';
        },
        finishLoading() {
            if (document.querySelector('[data-feedback-id="administrator-verification"].sigma-feedback-progress')) indicator('Administrator verified.', false, 'success');
        },
        async verifyPanel(panel) {
            if (!panels[panel]) return false;
            const recoveryPanel = ['recovery', 'backups'].includes(panel);
            let actor = {};
            try { actor = JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}'); } catch (_) {}
            const owner = String(actor.id || actor.uid || '');
            if (recoveryPanel) {
                recoveryRouteUrl = location.href;
                if (String(actor.role || actor.type || '').replace(/[\s_-]+/g, '').toLowerCase() !== 'masteradmin') return false;
                if (owner && verifiedRecoveryOwner === owner && token && expires > Date.now()) return true;
            }
            const target = ['recovery', 'backups'].includes(panel) ? 'settings-recovery-view' : panel==='maintenance' ? 'settings-security-view' : 'settings-integrations-view';
            if (window.canAccessAdminSection && !window.canAccessAdminSection(target)) return false;
            canceled = false;
            const visitEpoch = recoveryVisitEpoch;
            const api = new URL(window.resolveAuthApiUrl?.() || 'php/api/auth.php', location.href);
            try {
                if (!recoveryPanel || !await resumeRecoveryVerification(api)) await authorize(api, panel);
                if (recoveryPanel) {
                    if (visitEpoch !== recoveryVisitEpoch && location.hash !== '#nav-settings-recovery') { token = ''; expires = 0; return false; }
                    verifiedRecoveryOwner = owner;
                    rememberRecoveryVisit();
                }
                return true;
            }
            catch (error) { if (error.code !== 'VAULT_AUTH_CANCELED') indicator(error.message, false, 'error'); return false; }
        }
    };
    // Browser history navigation starts a new protected visit; a reload alone
    // may resume the existing unexpired visit using its HttpOnly server cookie.
    // Modal history and repeated routing can emit popstate without leaving Recovery.
    // Invalidating that pending visit turns successful verification into a false result.
    let recoveryRoute = location.hash === '#nav-settings-recovery';
    let recoveryRouteUrl = location.href;
    const trackRecoveryRoute = event => {
        const nowRecovery = location.hash === '#nav-settings-recovery';
        const changedHistoryPage = event.type === 'popstate' && location.href !== recoveryRouteUrl;
        if ((recoveryRoute && !nowRecovery) || changedHistoryPage) window.SigmaServiceVault.endRecoveryVisit();
        recoveryRoute = nowRecovery;
        recoveryRouteUrl = location.href;
    };
    window.addEventListener('popstate', trackRecoveryRoute, true);
    window.addEventListener('hashchange', trackRecoveryRoute, true);
    window.addEventListener('pageshow', event => {
        if (event.persisted) {
            window.SigmaServiceVault.endRecoveryVisit();
            if (location.hash === '#nav-settings-recovery') window.renderRecordRecovery?.();
        }
    });
    window.fetch = async function (resource, options = {}) {
        let api;
        try { api = new URL(resource instanceof URL ? resource.href : typeof resource === 'string' ? resource : resource.url, location.href); } catch (_) { return originalFetch(resource, options); }
        const local = ['localhost', '127.0.0.1'].includes(location.hostname) && ['localhost', '127.0.0.1'].includes(api.hostname);
        if (!(api.origin === location.origin || local) || !/\/php\/api\/(auth|upload|gdrive_oauth|users|record_lifecycle|database_backups|maintenance)\.php$/.test(api.pathname)) return originalFetch(resource, options);
        const request = () => {
            const headers = new Headers(options.headers || (typeof resource !== 'string' ? resource.headers : undefined));
            if (token && expires > Date.now()) headers.set('Authorization', 'Bearer ' + token);
            return originalFetch(resource, { ...options, headers });
        };
        const requestEpoch = authorizationEpoch;
        let response = await request();
        if (response.status === 403 && (await response.clone().json().catch(() => ({}))).code === 'VAULT_AUTH_REQUIRED') {
            token = ''; expires = 0;
            // Integration requests never open a password prompt as a side effect.
            // The Configure / Manage AI handlers verify before changing pages.
            if (canceled || requestEpoch !== authorizationEpoch) throw canceledError();
            if (!/\/users\.php$/.test(api.pathname)) throw Object.assign(new Error('Administrator verification expired. Verify again to continue.'),{code:'VAULT_AUTH_REQUIRED'});
            await authorize(api);
            response = await request();
        }
        return response;
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', configureFields); else configureFields();
    new MutationObserver(records => {
        if (records.some(record => Array.from(record.addedNodes).some(node => node.nodeType === 1 && (node.matches('input') || node.querySelector('input'))))) configureFields();
    }).observe(document.documentElement, { childList: true, subtree: true });
})();
