/**
 * SIGMA ELMS — Context-Aware Policy Navigation Helper
 * Directs Home, Back, and Help Center links to the appropriate role portal (Admin, Teacher, Student)
 * or to Help Center / Login landing page without terminating or resetting any active session.
 */
(function () {
    'use strict';

    function getActiveRoleHome() {
        try {
            const authUser = JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}');
            const legacyUser = JSON.parse(sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser') || localStorage.getItem('sigma-logged-in-user') || localStorage.getItem('sigma_active_user') || '{}');
            const role = String(authUser.role || authUser.type || legacyUser.role || legacyUser.type || '').trim().toLowerCase();

            if (role.includes('admin')) return { file: 'admin.html', label: 'Back to Dashboard', role: 'admin' };
            if (role.includes('teacher') || role.includes('faculty') || role.includes('instructor')) return { file: 'teacher.html', label: 'Back to Portal', role: 'teacher' };
            if (role.includes('student') || role.includes('learner')) return { file: 'student.html', label: 'Back to Portal', role: 'student' };
        } catch (e) {
            console.warn('Active role detection error:', e);
        }

        const ref = (document.referrer || '').toLowerCase();
        if (ref.includes('admin.html')) return { file: 'admin.html', label: 'Back to Dashboard', role: 'admin' };
        if (ref.includes('teacher.html')) return { file: 'teacher.html', label: 'Back to Portal', role: 'teacher' };
        if (ref.includes('student.html')) return { file: 'student.html', label: 'Back to Portal', role: 'student' };

        return null;
    }

    function detectRoleContext() {
        const urlParams = new URLSearchParams(window.location.search);
        const fromParam = (urlParams.get('from') || '').toLowerCase();
        const hash = (window.location.hash || '').toLowerCase();
        const storedOrigin = sessionStorage.getItem('sigma_policy_origin');
        const policyFrom = sessionStorage.getItem('sigma_policy_from');
        const ref = (document.referrer || '').toLowerCase();

        // 1. Explicit query parameter has highest precedence
        if (fromParam === 'login') {
            const ctx = { file: 'index.html', label: 'Back to Login', role: 'guest' };
            sessionStorage.setItem('sigma_policy_origin', JSON.stringify(ctx));
            return ctx;
        }
        if (fromParam === 'help' || hash === '#help') {
            const ctx = { file: 'index.html#help', label: 'Back to Help Center', role: 'help' };
            sessionStorage.setItem('sigma_policy_origin', JSON.stringify(ctx));
            return ctx;
        }
        if (fromParam === 'admin') {
            const ctx = { file: 'admin.html', label: 'Back to Dashboard', role: 'admin' };
            sessionStorage.setItem('sigma_policy_origin', JSON.stringify(ctx));
            return ctx;
        }
        if (fromParam === 'teacher') {
            const ctx = { file: 'teacher.html', label: 'Back to Portal', role: 'teacher' };
            sessionStorage.setItem('sigma_policy_origin', JSON.stringify(ctx));
            return ctx;
        }
        if (fromParam === 'student') {
            const ctx = { file: 'student.html', label: 'Back to Portal', role: 'student' };
            sessionStorage.setItem('sigma_policy_origin', JSON.stringify(ctx));
            return ctx;
        }

        // 2. Check if active logged-in role user (Admin / Teacher / Student)
        const roleHome = getActiveRoleHome();
        if (roleHome) {
            sessionStorage.setItem('sigma_policy_origin', JSON.stringify(roleHome));
            return roleHome;
        }

        // 3. Referrer checks
        if (ref.includes('#help') || ref.includes('from=help') || policyFrom === 'help') {
            const ctx = { file: 'index.html#help', label: 'Back to Help Center', role: 'help' };
            sessionStorage.setItem('sigma_policy_origin', JSON.stringify(ctx));
            return ctx;
        }

        // 4. Stored origin if navigating between terms and privacy
        if (storedOrigin) {
            try {
                const parsed = JSON.parse(storedOrigin);
                if (parsed && parsed.file && parsed.label) {
                    return parsed;
                }
            } catch (e) {}
        }

        const defaultCtx = { file: 'index.html', label: 'Back to Login', role: 'guest' };
        sessionStorage.setItem('sigma_policy_origin', JSON.stringify(defaultCtx));
        return defaultCtx;
    }

    function initPolicyNavigation() {
        const ctx = detectRoleContext();
        const activeRole = getActiveRoleHome();
        const isHelpOrigin = ctx.role === 'help';

        // 1. Update in-page Back link
        const backLink = document.getElementById('policyBackLink');
        if (backLink) {
            backLink.textContent = ctx.label;
            backLink.href = ctx.file;
            backLink.onclick = function (e) {
                if (isHelpOrigin) {
                    e.preventDefault();
                    sessionStorage.setItem('sigma_target_view', 'help');
                    window.location.href = 'index.html#help';
                } else if (document.referrer && document.referrer.toLowerCase().includes(ctx.file.toLowerCase())) {
                    e.preventDefault();
                    window.history.back();
                } else if (activeRole) {
                    e.preventDefault();
                    window.location.href = ctx.file;
                } else {
                    e.preventDefault();
                    sessionStorage.removeItem('sigma_policy_from');
                    sessionStorage.removeItem('sigma_policy_origin');
                    window.location.href = 'index.html';
                }
            };
        }

        // 2. Update Top-Left Logo / Home button
        // Inside a role portal (Admin / Teacher / Student), the logo is static branding only.
        // Returning to the portal is handled by the explicit "Back to Portal" link.
        const logoLink = document.getElementById('backToLoginLogo');
        const isRoleContext = ['admin', 'teacher', 'student'].includes(ctx.role);
        if (logoLink && isRoleContext) {
            logoLink.removeAttribute('href');
            logoLink.removeAttribute('title');
            logoLink.setAttribute('aria-disabled', 'true');
            logoLink.setAttribute('tabindex', '-1');
            logoLink.style.cursor = 'default';
            logoLink.style.pointerEvents = 'none';
            logoLink.style.userSelect = 'none';
            logoLink.style.webkitUserSelect = 'none';
            // Also disable text selection on every child (logo image + text spans)
            logoLink.querySelectorAll('*').forEach(function (el) {
                el.style.userSelect = 'none';
                el.style.webkitUserSelect = 'none';
                el.style.cursor = 'default';
            });
            logoLink.onclick = function (e) { e.preventDefault(); };
        } else if (logoLink) {
            logoLink.href = ctx.file;
            logoLink.title = ctx.label;
            logoLink.onclick = function (e) {
                e.preventDefault();
                if (isHelpOrigin) {
                    sessionStorage.setItem('sigma_target_view', 'help');
                    window.location.href = 'index.html#help';
                    return;
                }
                sessionStorage.removeItem('sigma_policy_from');
                sessionStorage.removeItem('sigma_policy_origin');
                window.location.href = ctx.file;
            };
        }

        // 3. Preserve policy origin when moving between Terms and Privacy.
        document.querySelectorAll('#policy-main a[href="terms.html"], #policy-main a[href="privacy.html"]').forEach(link => {
            if (!ctx.role || ctx.role === 'guest') return;
            link.href = `${link.getAttribute('href')}?from=${encodeURIComponent(ctx.role)}`;
        });

        // 4. Help Center button:
        // When inside user account (Admin, Teacher, Student), hide Help Center button in the navbar.
        // When viewed from login page / guest mode, keep Help Center button accessible.
        const helpBtn = document.getElementById('entryHelpCenterBtn');
        const helpMobileBtn = document.getElementById('helpCenterNavMenuBtn');

        if (activeRole) {
            if (helpBtn) {
                helpBtn.style.display = 'none';
                helpBtn.classList.add('hidden');
            }
            if (helpMobileBtn) {
                helpMobileBtn.style.display = 'none';
                helpMobileBtn.classList.add('hidden');
            }
        } else {
            if (helpBtn) {
                helpBtn.href = 'index.html#help';
                helpBtn.onclick = function (e) {
                    e.preventDefault();
                    sessionStorage.setItem('sigma_target_view', 'help');
                    sessionStorage.setItem('sigma_policy_from', 'help');
                    window.location.href = 'index.html#help';
                };
            }

            if (helpMobileBtn) {
                helpMobileBtn.onclick = function (e) {
                    e.preventDefault();
                    sessionStorage.setItem('sigma_target_view', 'help');
                    sessionStorage.setItem('sigma_policy_from', 'help');
                    window.location.href = 'index.html#help';
                };
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPolicyNavigation);
    } else {
        initPolicyNavigation();
    }
})();
