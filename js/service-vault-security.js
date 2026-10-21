(function () {
    'use strict';
    const originalFetch = window.fetch.bind(window);
    let token = '', expires = 0, pending = null;
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
    function authorize(api) {
        if (pending) return pending;
        pending = new Promise((resolve, reject) => {
            const dialog = document.createElement('dialog');
            dialog.className = 'service-vault-auth';
            dialog.setAttribute('aria-labelledby', 'service-vault-auth-title');
            dialog.innerHTML = '<form><h2 id="service-vault-auth-title">Administrator Verification</h2><label>Login ID or email<input name="login" autocomplete="username" required maxlength="150"></label><label>Password<input name="password" type="password" autocomplete="current-password" required maxlength="256"></label><label>Authenticator code (if enabled)<input name="otp" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}"></label><p class="service-vault-error" role="alert" hidden></p><div class="service-vault-auth-actions"><button type="button" data-cancel>Cancel</button><button type="submit">Verify</button></div></form>';
            document.body.append(dialog);
            const form = dialog.querySelector('form');
            let submitting = false;
            const close = () => { form.reset(); dialog.close(); dialog.remove(); };
            const cancel = () => {
                if (submitting) return;
                close();
                const failure = Object.assign(new Error('Credential verification canceled.'), { code: 'VAULT_AUTH_CANCELED' });
                reject(failure);
                // Cancel leaves protected settings rather than exposing their
                // unloaded default values as if they were the saved configuration.
                if (typeof window.switchTab === 'function') {
                    window.switchTab('nav-dashboard');
                } else {
                    window.location.replace(new URL('admin.html#nav-dashboard', location.href).href);
                }
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
                    const response = await originalFetch(new URL('auth.php', api).href, { method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'authorize_service_vault', login: form.elements.login.value.trim(), password: form.elements.password.value, otp: form.elements.otp.value }) });
                    const result = await response.json();
                    if (!response.ok || !result.success || !/^[a-f0-9]{64}$/.test(result.token || '')) throw new Error(result.error || 'Administrator verification failed.');
                    token = result.token;
                    expires = Date.now() + Number(result.expires_in || 900) * 1000;
                    close(); resolve();
                } catch (failure) {
                    error.textContent = failure.message; error.hidden = false;
                    form.elements.password.value = ''; form.elements.otp.value = '';
                } finally { submitting = false; button.disabled = false; }
            };
            dialog.showModal();
            let user = {};
            try { user = JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}'); } catch (_) {}
            form.elements.login.value = user.id || user.uid || user.email || '';
            (form.elements.login.value ? form.elements.password : form.elements.login).focus();
        }).finally(() => { pending = null; });
        return pending;
    }
    window.fetch = async function (resource, options = {}) {
        let api;
        try { api = new URL(typeof resource === 'string' ? resource : resource.url, location.href); } catch (_) { return originalFetch(resource, options); }
        const local = ['localhost', '127.0.0.1'].includes(location.hostname) && ['localhost', '127.0.0.1'].includes(api.hostname);
        if (!(api.origin === location.origin || local) || !/\/php\/api\/(auth|upload|users)\.php$/.test(api.pathname)) return originalFetch(resource, options);
        const request = () => {
            const headers = new Headers(options.headers || (typeof resource !== 'string' ? resource.headers : undefined));
            if (token && expires > Date.now()) headers.set('Authorization', 'Bearer ' + token);
            return originalFetch(resource, { ...options, headers });
        };
        let response = await request();
        if (response.status === 403 && (await response.clone().json().catch(() => ({}))).code === 'VAULT_AUTH_REQUIRED') {
            token = ''; expires = 0;
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
