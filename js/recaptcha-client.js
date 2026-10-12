(function () {
    let sdkPromise;
    let sdkVersion;
    const challenges = new WeakMap();
    async function fetchJson(url, options) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 12000);
        try {
            const response = await fetch(url, { ...options, signal: controller.signal });
            const data = await response.json();
            if (!response.ok || !data.success) {
                const error = new Error(data.error || 'The reCAPTCHA server request failed.');
                error.result = data;
                throw error;
            }
            return data;
        } catch (error) {
            if (error.name === 'AbortError') throw new Error('reCAPTCHA connection timed out. Try again.');
            throw error;
        } finally { clearTimeout(timer); }
    }
    function apiUrl(query = '') {
        const { hostname, port, protocol } = window.location;
        if (hostname.endsWith('.github.io') || !hostname) return null;
        const base = (hostname === 'localhost' || hostname === '127.0.0.1') && port && !['80', '443'].includes(port)
            ? `${protocol}//${hostname}/sigma-elms/php/api/auth.php`
            : window.location.pathname.includes('/php/') ? 'api/auth.php' : 'php/api/auth.php';
        return query ? `${base}?${query}` : base;
    }
    async function getConfig() {
        const url = apiUrl('action=recaptcha_config');
        if (!url) throw new Error('reCAPTCHA requires the PHP server.');
        return fetchJson(url);
    }
    function loadSdk(config) {
        if (sdkVersion && sdkVersion !== config.version) throw new Error('reCAPTCHA version changed. Reload this page.');
        if (!sdkPromise) {
            sdkVersion = config.version;
            sdkPromise = new Promise((resolve, reject) => {
                const script = document.createElement('script');
                const timer = setTimeout(() => {
                    script.remove?.();
                    reject(new Error('Google reCAPTCHA did not load. Check your connection and try again.'));
                }, 15000);
                script.src = `https://www.google.com/recaptcha/api.js?render=${config.version === 'v3' ? encodeURIComponent(config.site_key) : 'explicit'}`;
                script.async = true;
                script.onload = () => {
                    if (!window.grecaptcha?.ready) {
                        clearTimeout(timer);
                        reject(new Error('Google reCAPTCHA did not initialize. Try again.'));
                        return;
                    }
                    window.grecaptcha.ready(() => { clearTimeout(timer); resolve(window.grecaptcha); });
                };
                script.onerror = () => { clearTimeout(timer); reject(new Error('Cannot load Google reCAPTCHA. Try again.')); };
                document.head.appendChild(script);
            }).catch(error => { sdkPromise = null; sdkVersion = null; throw error; });
        }
        return sdkPromise;
    }
    async function verifyToken(token) {
        return fetchJson(apiUrl(), { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'verify_recaptcha', token }) });
    }
    async function challenge(host, onVerified, onInvalid) {
        const run = {};
        challenges.set(host, run);
        const isCurrent = () => challenges.get(host) === run;
        host.replaceChildren();
        const status = document.createElement('p');
        status.setAttribute('role', 'status');
        status.className = 'text-sm text-black-fade mb-3';
        status.textContent = 'Loading reCAPTCHA...';
        const mount = document.createElement('div');
        host.append(status, mount);
        const fail = error => {
            if (!isCurrent()) return;
            status.textContent = error.message || 'Verification expired. Please try again.';
            onInvalid?.(error);
        };
        try {
            const config = await getConfig();
            if (!isCurrent()) return;
            if (config.credential_error) throw new Error(config.credential_error);
            if (!config.site_key || !config.has_secret) throw new Error('reCAPTCHA is not configured. Contact the administrator.');
            const sdk = await loadSdk(config);
            if (!isCurrent()) return;
            let widgetId;
            const complete = async token => {
                if (!isCurrent()) return;
                try {
                    status.textContent = 'Verifying...';
                    const result = await verifyToken(token);
                    if (!isCurrent()) return;
                    status.textContent = 'Verification successful';
                    onVerified(result);
                } catch (error) {
                    fail(error);
                    if (isCurrent() && widgetId !== undefined) sdk.reset(widgetId);
                }
            };
            if (config.version === 'v3') {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'sigma-btn sigma-btn-primary sigma-btn-md';
                button.textContent = 'Verify';
                const run = async () => {
                    button.disabled = true;
                    try { await complete(await sdk.execute(config.site_key, { action: 'login' })); }
                    catch (error) { fail(error); }
                    finally { button.disabled = false; }
                };
                button.onclick = run;
                mount.appendChild(button);
                await run();
            } else {
                status.textContent = 'Complete verification to continue';
                widgetId = sdk.render(mount, { sitekey: config.site_key, callback: complete,
                    'expired-callback': () => fail(new Error('Verification expired. Please try again.')),
                    'error-callback': () => fail(new Error(`Google rejected or could not load the ${config.version} widget. Check the site key, key type, and allowed domain in the reCAPTCHA console, then reset the test.`)) });
            }
        } catch (error) { fail(error); }
    }
    function isChallengeRequired(policy, invalidAttempts, passwordAttempts) {
        const threshold = Number(policy.loginIdAttempts) || 3;
        return policy.recaptchaEnabled !== false && (invalidAttempts >= threshold || passwordAttempts >= threshold);
    }
    window.SigmaRecaptcha = { apiUrl, getConfig, challenge, isChallengeRequired, cancel: host => challenges.delete(host) };
})();
