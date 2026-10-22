(function () {
    'use strict';
    const originalFetch = window.fetch.bind(window);
    let token = '', expires = 0, pending = null, canceled = false, authorizationEpoch = 0;
    let indicatorTimer;
    const panels = { ai: 'SIGMA AI Integration Engines', drive: 'Google Drive Cloud Storage', recaptcha: 'Google reCAPTCHA Protection', recovery: 'Record Recovery' };
    function indicator(message, loading = false) {
        clearTimeout(indicatorTimer);
        document.querySelector('.service-vault-indicator')?.remove();
        const notice = document.createElement('div'); notice.className = 'service-vault-indicator'; notice.setAttribute('role', 'status'); notice.textContent = message; notice.dataset.loading = String(loading);
        document.body.append(notice);
        if (!loading) indicatorTimer = setTimeout(() => notice.remove(), 5000);
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
            dialog.innerHTML = '<form><h2 id="service-vault-auth-title">Administrator Verification</h2><label>Login ID<input name="login" autocomplete="username" readonly aria-readonly="true" required maxlength="150"></label><label>Password<input name="password" type="password" autocomplete="current-password" required maxlength="256"></label><p class="service-vault-error" role="alert" hidden></p><div class="service-vault-auth-actions"><button type="button" class="sigma-dialog-btn-cancel" data-cancel>Cancel</button><button type="submit" class="sigma-dialog-btn-confirm">Verify</button></div></form>';
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
                try {
                    const response = await originalFetch(new URL('auth.php', api).href, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (JSON.parse(sessionStorage.getItem('sigma-grade-sync-session') || 'null')?.token || '') },
                        signal: AbortSignal.timeout(15000),
                        body: JSON.stringify({ action: 'authorize_service_vault', panel, login: form.elements.login.value.trim(), password: form.elements.password.value }) });
                    const result = await response.json();
                    if (!response.ok || !result.success || !/^[a-f0-9]{64}$/.test(result.token || '')) {
                        if (result.error === 'The administrator password is incorrect.') recordVerificationActivity('failed', panel);
                        throw new Error(result.error || 'Administrator verification failed.');
                    }
                    recordVerificationActivity('success', panel);
                    indicator('Administrator verified. Loading ' + (panels[panel] || 'settings') + '…', true);
                    settled = true; canceled = false;
                    token = result.token;
                    expires = Date.now() + Number(result.expires_in || 900) * 1000;
                    close(); resolve();
                } catch (failure) {
                    error.textContent = failure.message; error.hidden = false;
                    form.elements.password.value = '';
                } finally { submitting = false; button.disabled = false; }
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
        finishLoading() {
            if (document.querySelector('.service-vault-indicator[data-loading="true"]')) indicator('Administrator verified.');
        },
        async verifyPanel(panel) {
            if (!panels[panel]) return false;
            canceled = false;
            const api = new URL(window.resolveAuthApiUrl?.() || 'php/api/auth.php', location.href);
            try { await authorize(api, panel); return true; }
            catch (error) { if (error.code !== 'VAULT_AUTH_CANCELED') indicator(error.message); return false; }
        }
    };
    window.fetch = async function (resource, options = {}) {
        let api;
        try { api = new URL(typeof resource === 'string' ? resource : resource.url, location.href); } catch (_) { return originalFetch(resource, options); }
        const local = ['localhost', '127.0.0.1'].includes(location.hostname) && ['localhost', '127.0.0.1'].includes(api.hostname);
        if (!(api.origin === location.origin || local) || !/\/php\/api\/(auth|upload|users|record_lifecycle)\.php$/.test(api.pathname)) return originalFetch(resource, options);
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
            if (!/\/users\.php$/.test(api.pathname) || canceled || requestEpoch !== authorizationEpoch) throw canceledError();
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
