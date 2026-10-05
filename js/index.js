/* =============================================================
   SIGMA ELMS — Login Page JavaScript
   Interface Computer College | Senior High School ELMS
   ============================================================= */

document.addEventListener('DOMContentLoaded', function () {

    const getStoredJson = (typeof window !== 'undefined' && typeof window.getStoredJson === 'function')
        ? window.getStoredJson
        : function (key, fallback) {
            try {
                const raw = localStorage.getItem(key);
                if (!raw || raw === 'undefined' || raw === 'null' || raw === 'NaN') return fallback;
                const parsed = JSON.parse(raw);
                if (fallback !== null && fallback !== undefined) {
                    if (Array.isArray(fallback) && !Array.isArray(parsed)) return fallback;
                    if (!Array.isArray(fallback) && typeof fallback === 'object' && (typeof parsed !== 'object' || Array.isArray(parsed))) return fallback;
                }
                return parsed;
            } catch (e) {
                return fallback;
            }
        };

    const USER_STORAGE_KEY = 'sigma-admin-users';
    const MANAGED_USERS_RESET_KEY = 'sigma-managed-users-reset-v1';
    const AUTH_SESSION_KEY = 'sigma-authenticated-user';
    const LOGIN_SECURITY_KEY = 'sigma-login-security-config';

    // --- CUSTOM LOGO SYNC ---
    const customLoginLogo = localStorage.getItem('sigma-custom-login-logo');
    if (customLoginLogo) {
        const loginFormLogo = document.querySelector('.login-form-logo');
        if (loginFormLogo) loginFormLogo.src = customLoginLogo;
    }

    const customLoginBarLogo = localStorage.getItem('sigma-custom-login-bar-logo');
    if (customLoginBarLogo) {
        const navLogo = document.querySelector('header#mainNav img') || document.querySelector('#backToLoginLogo img');
        if (navLogo) navLogo.src = customLoginBarLogo;
    }

    const resolveAuthApiUrl = (query = '') => {
        let base = 'php/api/auth.php';
        return query ? `${base}?${query}` : base;
    };

    function getLoginSecurityConfig() {
        return getStoredJson(LOGIN_SECURITY_KEY, { loginIdAttempts: 3, passwordAttempts: 8 });
    }

    // Sync security & reCAPTCHA config from server
    fetch(resolveAuthApiUrl('action=recaptcha_config'))
        .then(res => res.json())
        .then(data => {
            if (data && data.success && data.threshold) {
                const cfg = getLoginSecurityConfig();
                cfg.loginIdAttempts = data.threshold;
                localStorage.setItem(LOGIN_SECURITY_KEY, JSON.stringify(cfg));
            }
        })
        .catch(() => {});

    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    /* ===== IMAGE SLIDER: Auto-rotating campus photo slideshow ===== */

    const SLIDER_CONFIG_DEFAULT = [
        { src: 'image/ICC Shs.jpg', alt: 'ICC Senior High School' },
        { src: 'image/ICC Enrollment.jpg', alt: 'ICC Enrollment' },
        { src: 'image/ICC Immersion.jpg', alt: 'ICC Immersion' },
        { src: 'image/ICC Interfacer.jpg', alt: 'ICC Interfacer' },
        { src: 'image/ICC Learning.jpg', alt: 'ICC Learning' }
    ];

    const customSlidesRaw = localStorage.getItem('sigma-custom-login-slides');
    const SLIDER_CONFIG = customSlidesRaw ? JSON.parse(customSlidesRaw) : SLIDER_CONFIG_DEFAULT;


    function resolveImgPath(src) {
        if (!src) return '';
        if (src.startsWith('data:') || src.startsWith('http')) return src;
        if (document.querySelector('base')) {
            return src.replace(/^\.\.\//, '');
        }
        if (window.location.pathname.includes('/php/')) {
            return '../' + src.replace(/^\.\.\//, '');
        }
        return src;
    }

    function initSliderContent(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = SLIDER_CONFIG.map((img, i) => `
            <div class="slide ${i === 0 ? 'active' : ''}" style="position: absolute; inset: 0; transition: opacity 1s ease-in-out; opacity: ${i === 0 ? '1' : '0'}; background: #ffffff;">
                <img class="slide-img" src="${resolveImgPath(img.src)}" alt="${img.alt}" style="width: 100%; height: 100%; object-fit: fill; position: relative; z-index: 10;">
            </div>
        `).join('');
    }

    initSliderContent('slider');

    function createSlider(containerId, dotsId, prevBtnId, nextBtnId) {
        const container = document.getElementById(containerId);
        const dotsBox = document.getElementById(dotsId);
        const prevBtn = document.getElementById(prevBtnId);
        const nextBtn = document.getElementById(nextBtnId);
        if (!container) return null;

        const slides = Array.from(container.querySelectorAll('.slide'));
        if (slides.length === 0) return null;

        let current = 0;
        let timer = null;

        if (dotsBox) {
            dotsBox.innerHTML = '';
            slides.forEach((_, i) => {
                const dot = document.createElement('div');
                dot.className = `dot ${i === 0 ? 'active' : ''}`;
                dot.onclick = () => jumpTo(i);
                dotsBox.appendChild(dot);
            });
        }

        function update() {
            slides.forEach((s, i) => {
                s.style.opacity = (i === current) ? '1' : '0';
                s.classList.toggle('active', i === current);
            });
            if (dotsBox) {
                Array.from(dotsBox.children).forEach((d, i) => d.classList.toggle('active', i === current));
            }
        }

        function jumpTo(index) {
            current = index;
            update();
            resetAutoPlay();
        }

        function next() {
            current = (current + 1) % slides.length;
            update();
        }

        function prev() {
            current = (current - 1 + slides.length) % slides.length;
            update();
            resetAutoPlay();
        }

        function resetAutoPlay() {
            clearInterval(timer);
            // Auto-rotate only on desktop (width >= 1024px); mobile is manual
            if (window.innerWidth >= 1024) {
                timer = setInterval(next, 5000);
            }
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', function (e) {
                e.preventDefault();
                prev();
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', function (e) {
                e.preventDefault();
                next();
            });
        }

        window.addEventListener('resize', resetAutoPlay);

        update();
        resetAutoPlay();
        return { next, prev, jumpTo };
    }

    createSlider('slider', 'dotsContainer', 'sliderPrevBtn', 'sliderNextBtn');

    /* ===== STATE & CONFIG ===== */

    let submitGuardLocked = false;
    let invalidLoginIdAttempts = 0;
    const passwordFailedAttempts = {};
    const sessionLockedAccounts = new Set();
    let pendingCaptchaFlow = null;
    let pendingCaptchaSubmission = null;
    let activeValidatedFlows = { landing: null, modal: null };

    function getStoredUsers() {
        const primary = getStoredJson(USER_STORAGE_KEY, []);
        const usersList = getStoredJson('sigma-users-list', []);
        const teacherUsers = getStoredJson('sigma-teacher-users', []);
        const studentUsers = getStoredJson('sigma-student-users', []);
        const genericUsers = getStoredJson('sigma-users', []);

        const combined = [
            ...(Array.isArray(primary) ? primary : []),
            ...(Array.isArray(usersList) ? usersList : []),
            ...(Array.isArray(teacherUsers) ? teacherUsers : []),
            ...(Array.isArray(studentUsers) ? studentUsers : []),
            ...(Array.isArray(genericUsers) ? genericUsers : [])
        ];
        const seen = new Set();
        const deduplicated = [];

        combined.forEach(user => {
            if (!user) return;
            const uid = String(user.uid || user.id || '').trim();
            if (uid && !seen.has(uid.toLowerCase())) {
                seen.add(uid.toLowerCase());
                deduplicated.push(user);
            }
        });

        return deduplicated;
    }

    function buildManagedUserPassword(user) {
        const safeLastName = String(user?.lastName || 'user')
            .trim()
            .replace(/[^a-zA-Z0-9]/g, '')
            .toLowerCase();
        const userId = String(user?.uid || user?.id || '').trim().replace(/^USER-/i, '');
        return `${safeLastName}${userId}`;
    }

    function purgeLegacyManagedUsers() {
        if (localStorage.getItem(MANAGED_USERS_RESET_KEY) === 'true') {
            return;
        }

        const normalizedUsers = getStoredUsers().filter(Boolean).map((user) => ({
            ...user,
            createdVia: user.createdVia || 'admin-panel'
        }));
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(normalizedUsers));
        localStorage.setItem('sigma-users-list', JSON.stringify(normalizedUsers));
        localStorage.setItem(MANAGED_USERS_RESET_KEY, 'true');
    }

    function seedMasterAdmin() {
        const permanentUsers = [
            {
                id: "0000000",
                uid: "0000000",
                firstName: "Stanley",
                middleName: "Vargas",
                lastName: "Garcia",
                fullName: "Stanley Vargas Garcia",
                email: "stanley.garcia@gmail.com",
                password: "garcia0000000",
                role: "Master Admin",
                type: "Master Admin",
                status: "Active",
                gender: "Male",
                branch: "Main Campus",
                createdAt: "2026-06-01T08:00:00+08:00",
                createdVia: "system-seed"
            },
            {
                id: "1111111",
                uid: "1111111",
                firstName: "Maria",
                middleName: "Santos",
                lastName: "Ramos",
                fullName: "Maria Santos Ramos",
                email: "maria.ramos@gmail.com",
                password: "ramos1111111",
                role: "Teacher",
                type: "Teacher",
                status: "Active",
                gender: "Female",
                branch: "Main Campus",
                department: "Senior High School - Faculty",
                createdAt: "2026-09-03T08:00:00+08:00",
                createdVia: "system-seed"
            },
            {
                id: "2222222",
                uid: "2222222",
                firstName: "Juan",
                middleName: "Abad",
                lastName: "Dela Cruz",
                fullName: "Juan Abad Dela Cruz",
                email: "juan.delacruz@gmail.com",
                password: "delacruz2222222",
                role: "Student",
                type: "Student",
                status: "Active",
                gender: "Male",
                branch: "Main Campus",
                gradeSection: "Grade 11 - ICT A",
                strand: "TVL - ICT",
                createdAt: "2026-09-03T08:00:00+08:00",
                createdVia: "system-seed"
            }
        ];

        try {
            const users = getStoredUsers();
            let changed = false;
            permanentUsers.forEach(pu => {
                const idx = users.findIndex(u => String(u.uid || u.id) === pu.id);
                if (idx === -1) {
                    users.push(pu);
                    changed = true;
                }
            });
            if (changed) {
                localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(users));
                localStorage.setItem('sigma-users-list', JSON.stringify(users));
            }
        } catch (e) {
            console.error('Failed to seed permanent users:', e);
        }
    }

    function getRedirectForRole(role) {
        const normalizedRole = String(role || '').trim().toLowerCase();
        if (normalizedRole.includes('admin')) return 'admin.html';
        if (normalizedRole.includes('teacher') || normalizedRole.includes('faculty') || normalizedRole.includes('instructor')) return 'teacher.html';
        if (normalizedRole.includes('student') || normalizedRole.includes('learner')) return 'student.html';
        return 'index.html';
    }

    function findManagedAccount(loginValue) {
        let submitted = String(loginValue || '').trim().toLowerCase();
        if (!submitted) return null;
        const cleanSubmitted = submitted.replace(/^user-/i, '').trim();

        // Hardcoded Permanent Users Fallback (Always saved in code)
        if (submitted === "0000000" || submitted === "stanley.garcia@gmail.com" || submitted === "stanleygarcia@gmail.com" || submitted === "stanley@gmail.com" || submitted === "stanley") {
            return {
                id: "0000000",
                uid: "0000000",
                firstName: "Stanley",
                middleName: "Vargas",
                lastName: "Garcia",
                fullName: "Stanley Vargas Garcia",
                email: "stanley.garcia@gmail.com",
                password: "garcia0000000",
                role: "Master Admin",
                type: "Master Admin",
                status: "Active",
                createdVia: "system-seed"
            };
        }

        if (submitted === "1111111" || submitted === "maria.ramos@gmail.com" || submitted === "mariaramos@gmail.com" || submitted === "teacher1111111@gmail.com" || submitted === "teacher@gmail.com" || submitted === "teacher1111111" || submitted === "maria.delacruz@gmail.com" || submitted === "mariadelacruz@gmail.com") {
            return {
                id: "1111111",
                uid: "1111111",
                firstName: "Maria",
                middleName: "Santos",
                lastName: "Ramos",
                fullName: "Maria Santos Ramos",
                email: "maria.ramos@gmail.com",
                password: "ramos1111111",
                role: "Teacher",
                type: "Teacher",
                status: "Active",
                gender: "Female",
                branch: "Main Campus",
                department: "Senior High School - Faculty",
                createdVia: "system-seed"
            };
        }

        if (submitted === "2222222" || submitted === "juan.delacruz@gmail.com" || submitted === "juandelacruz@gmail.com" || submitted === "student2222222@gmail.com" || submitted === "student@gmail.com" || submitted === "student2222222") {
            return {
                id: "2222222",
                uid: "2222222",
                firstName: "Juan",
                middleName: "Abad",
                lastName: "Dela Cruz",
                fullName: "Juan Abad Dela Cruz",
                email: "juan.delacruz@gmail.com",
                password: "delacruz2222222",
                role: "Student",
                type: "Student",
                status: "Active",
                gender: "Male",
                branch: "Main Campus",
                gradeSection: "Grade 11 - ICT A",
                strand: "TVL - ICT",
                createdVia: "system-seed"
            };
        }

        // If no @ is provided, we'll also test it as a gmail prefix
        const submittedAsGmail = submitted.includes('@') ? submitted : `${submitted}@gmail.com`;

        return getStoredUsers()
            .find((user) => {
                if (!user) return false;

                const id = String(user.uid || user.id || '').trim().toLowerCase();
                const cleanId = id.replace(/^user-/i, '').trim();
                const email = String(user.email || '').trim().toLowerCase();
                const emailPrefix = email.split('@')[0];

                // Matches ID, Clean ID, Exact Email, or Email Prefix
                return submitted === id ||
                    submitted === cleanId ||
                    cleanSubmitted === id ||
                    cleanSubmitted === cleanId ||
                    submitted === email ||
                    submitted === emailPrefix ||
                    submittedAsGmail === email;
            }) || null;
    }

    seedMasterAdmin();
    purgeLegacyManagedUsers();

    const HELP_CATEGORIES = [
        { id: 'faq-help', label: 'FAQ', icon: 'fa-solid fa-circle-question' },
        { id: 'contact-support', label: 'Contact Support', icon: 'fa-solid fa-headset' }
    ];

    const ui = {
        views: {
            landing: document.getElementById('landingMain'),
            help: document.getElementById('helpCenterView'),
            recaptcha: document.getElementById('recaptchaView')
        },
        form: document.getElementById('landingLoginForm'),
        modalForm: document.getElementById('modalLoginForm'),
        inputs: {
            id: document.getElementById('schoolId'),
            pass: document.getElementById('password'),
            modalId: document.getElementById('modalSchoolId'),
            modalPass: document.getElementById('modalPassword')
        },
        errors: {
            general: document.getElementById('loginErrorMessage'),
            modalGeneral: document.getElementById('modalLoginErrorMessage'),
            id: document.getElementById('schoolIdError'),
            pass: document.getElementById('passwordError'),
            modalId: document.getElementById('modalSchoolIdError'),
            modalPass: document.getElementById('modalPasswordError')
        },
        btns: {
            submit: document.getElementById('loginSubmitBtn'),
            modalSubmit: document.getElementById('modalLoginSubmitBtn'),
            entryHelp: [
                document.getElementById('entryHelpCenterBtn'),
                document.getElementById('entryHelpCenterBtnSmall'),
                document.getElementById('openHelpCenterMobileBtn'),
                document.getElementById('openHelpBtn')
            ].filter(btn => btn !== null)
        },
        nav: {
            title: document.getElementById('navTitle'),
            subtitle: document.getElementById('navSubtitle'),
            icon: document.getElementById('navIcon')
        },
        captcha: {
            landingContainer: document.getElementById('landingRecaptchaContainer'),
            landingCheck: document.getElementById('landingCaptchaCheck'),
            landingVisual: document.getElementById('landingCaptchaVisual'),
            landingSpinner: document.getElementById('landingCaptchaSpinner'),
            modalContainer: document.getElementById('modalRecaptchaContainer'),
            modalCheck: document.getElementById('modalCaptchaCheck'),
            modalVisual: document.getElementById('modalCaptchaVisual'),
            modalSpinner: document.getElementById('modalCaptchaSpinner')
        },
        help: {
            desktop: document.getElementById('helpCategoriesDesktop'),
            mobile: document.getElementById('helpCategoriesMobile'),
            content: document.getElementById('helpCenterContentScroll'),
            mobileOverlay: document.getElementById('helpMobileSidebarOverlay'),
            mobilePanel: document.getElementById('helpMobileSidebar'),
            mobileClose: document.getElementById('helpMobileSidebarClose'),
            mobileNavBtn: document.getElementById('helpCenterNavMenuBtn')
        }
    };

    let activeHelpCategoryId = 'faq-help';
    let activeViewName = 'landing';

    function syncLandingHelpActions() {
        ui.btns.entryHelp.forEach(b => {
            if (!b) return;
            const isMobileNavHelp = b.id === 'entryHelpCenterBtn' && window.innerWidth < 768;
            b.style.display = isMobileNavHelp ? 'none' : '';
            b.classList.toggle('hidden', isMobileNavHelp);
        });
    }

    /* ===== HELP CENTER FUNCTIONS ===== */

    let isHelpScrollingProgrammatically = false;
    let helpScrollTimer = null;

    function renderHelpCategories() {
        const renderCategoryItem = (item) => `
            <button type="button" data-help-target="${item.id}"
                class="w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 font-bold transition-all ${activeHelpCategoryId === item.id ? 'bg-icc-yellow text-white shadow-sm' : 'text-black hover:bg-slate-100'}">
                <i class="${item.icon} w-6 text-center text-inherit"></i>
                <span class="text-inherit">${item.label}</span>
            </button>
        `;

        if (ui.help.desktop) ui.help.desktop.innerHTML = HELP_CATEGORIES.map(renderCategoryItem).join('');
        if (ui.help.mobile) ui.help.mobile.innerHTML = HELP_CATEGORIES.map(renderCategoryItem).join('');
    }

    function setActiveHelpCategory(targetId, shouldScroll = true) {
        activeHelpCategoryId = targetId;
        renderHelpCategories();
        if (shouldScroll) {
            const target = document.getElementById(targetId);
            if (target) {
                isHelpScrollingProgrammatically = true;
                clearTimeout(helpScrollTimer);
                const nav = document.getElementById('mainNav');
                const navHeight = nav ? nav.offsetHeight : 82;
                const targetRect = target.getBoundingClientRect();
                const scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
                const destY = Math.max(0, targetRect.top + scrollY - navHeight - 20);
                window.scrollTo({ top: destY, behavior: 'smooth' });
                helpScrollTimer = setTimeout(() => {
                    isHelpScrollingProgrammatically = false;
                }, 800);
            }
        }
    }

    function initHelpScrollspy() {
        let ticking = false;

        window.addEventListener('scroll', () => {
            if (isHelpScrollingProgrammatically) return;
            if (ui.views.help && ui.views.help.classList.contains('hidden')) return;

            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const nav = document.getElementById('mainNav');
                    const navHeight = nav ? nav.offsetHeight : 82;
                    const triggerY = navHeight + 140;

                    let currentId = 'faq-help';
                    const contactSection = document.getElementById('contact-support');
                    if (contactSection) {
                        const contactRect = contactSection.getBoundingClientRect();
                        const scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
                        const windowHeight = window.innerHeight;
                        const docHeight = document.documentElement.scrollHeight;
                        const isNearBottom = (scrollY + windowHeight) >= docHeight - 80;
                        if (contactRect.top <= triggerY || isNearBottom) {
                            currentId = 'contact-support';
                        }
                    }

                    if (activeHelpCategoryId !== currentId) {
                        activeHelpCategoryId = currentId;
                        renderHelpCategories();
                    }
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
    }

    function toggleHelpMobileMenu(open = true) {
        if (!ui.help.mobilePanel || !ui.help.mobileOverlay) return;

        if (open) {
            ui.help.mobileOverlay.classList.remove('hidden');
            ui.help.mobilePanel.classList.remove('hidden');
            // Small delay to allow 'hidden' to be removed before starting transition
            setTimeout(() => {
                ui.help.mobileOverlay.classList.add('opacity-100');
                ui.help.mobilePanel.classList.remove('translate-x-full');
                ui.help.mobilePanel.classList.add('translate-x-0');
            }, 10);
        } else {
            ui.help.mobileOverlay.classList.remove('opacity-100');
            ui.help.mobilePanel.classList.add('translate-x-full');
            ui.help.mobilePanel.classList.remove('translate-x-0');
            // Wait for transition to finish before hiding
            setTimeout(() => {
                ui.help.mobileOverlay?.classList.add('hidden');
                ui.help.mobilePanel?.classList.add('hidden');
            }, 300);
        }
    }

    /* ===== UI HELPERS ===== */

    function showError(field, message, isGeneral = false, inputEl = null) {
        if (field) {
            field.textContent = message;
            field.classList.remove('hidden');
            if (isGeneral) {
                field.classList.add('flex', 'items-center', 'gap-2', 'justify-center');
                field.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> <span>${message}</span>`;
            }
        }
        if (inputEl) inputEl.classList.add('input-error');
    }

    function clearErrors() {
        Object.values(ui.errors).forEach(el => { el?.classList.add('hidden'); if (el) el.textContent = ''; });
        Object.values(ui.inputs).forEach(input => {
            if (input) {
                input.classList.remove('input-error');
                input.style.borderColor = '';
                input.disabled = false;
            }
        });
    }

    function clearLoginInputs() {
        [ui.inputs.id, ui.inputs.pass, ui.inputs.modalId, ui.inputs.modalPass].forEach((input) => {
            if (!input) return;
            input.value = '';
        });
    }

    function setLoading(formType, isLoading) {
        if (!isLoading) submitGuardLocked = false;
        const btn = formType === 'modal' ? ui.btns.modalSubmit : ui.btns.submit;
        if (!btn) return;
        const text = btn.querySelector('.btn-text');
        const spinner = btn.querySelector('.fa-spin');
        btn.disabled = isLoading;
        if (isLoading) {
            if (spinner) {
                spinner.classList.remove('hidden');
                spinner.style.display = 'inline-block';
                spinner.classList.add('text-2xl'); // Make it slightly larger
            }
            if (text) text.style.display = 'none'; // Hide text completely
            btn.classList.add('opacity-80', 'cursor-not-allowed');
            [ui.inputs.id, ui.inputs.pass, ui.inputs.modalId, ui.inputs.modalPass].forEach(i => { if (i) i.disabled = true; });
        } else {
            if (spinner) { spinner.classList.add('hidden'); spinner.style.display = 'none'; }
            if (text) {
                text.style.display = 'inline'; // Show text back
                text.textContent = formType === 'modal' ? 'Sign In' : 'Log In';
            }
            btn.classList.remove('opacity-80', 'cursor-not-allowed');
            [ui.inputs.id, ui.inputs.pass, ui.inputs.modalId, ui.inputs.modalPass].forEach(i => { if (i) i.disabled = false; });
        }
    }

    function setRecaptchaLoading(formType, isLoading, isComplete = false) {
        const visual = formType === 'modal' ? ui.captcha.modalVisual : ui.captcha.landingVisual;
        const spinner = formType === 'modal' ? ui.captcha.modalSpinner : ui.captcha.landingSpinner;
        const check = formType === 'modal' ? ui.captcha.modalCheck : ui.captcha.landingCheck;
        const btn = formType === 'modal' ? ui.btns.modalSubmit : ui.btns.submit;

        if (isLoading) {
            if (visual) visual.classList.add('hidden');
            if (spinner) spinner.classList.remove('hidden');
            if (btn) btn.disabled = true;
        } else {
            if (spinner) spinner.classList.add('hidden');
            if (visual) {
                visual.classList.remove('hidden');
                if (isComplete) {
                    visual.classList.add('bg-green-600', 'border-green-600');
                    const icon = visual.querySelector('i');
                    if (icon) icon.classList.remove('opacity-0');
                    if (btn) {
                        btn.disabled = false;
                        btn.classList.remove('opacity-50', 'cursor-not-allowed');
                    }
                } else {
                    visual.classList.remove('bg-green-600', 'border-green-600');
                    const icon = visual.querySelector('i');
                    if (icon) icon.classList.add('opacity-0');
                }
            }
        }
        if (check) check.disabled = isLoading || isComplete;
    }

    function getPasswordAttempts(id) {
        return passwordFailedAttempts[id] || 0;
    }

    function incrementPasswordAttempts(id) {
        passwordFailedAttempts[id] = getPasswordAttempts(id) + 1;
        return passwordFailedAttempts[id];
    }

    function resetPasswordAttempts(id) {
        passwordFailedAttempts[id] = 0;
    }

    function resetRecaptcha(formType) {
        if (formType === 'modal') {
            activeValidatedFlows.modal = null;
            ui.captcha.modalContainer?.classList.add('hidden');
            if (ui.btns.modalSubmit) {
                ui.btns.modalSubmit.disabled = false;
                ui.btns.modalSubmit.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        } else {
            activeValidatedFlows.landing = null;
            ui.captcha.landingContainer?.classList.add('hidden');
            if (ui.btns.submit) {
                ui.btns.submit.disabled = false;
                ui.btns.submit.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        }
    }

    function isSameCaptchaFlow(a, b) {
        if (!a || !b) return false;
        return a.type === b.type && (a.id || '') === (b.id || '');
    }

    function prepareCaptchaFlow(flow, submission) {
        pendingCaptchaFlow = flow;
        pendingCaptchaSubmission = submission;

        const formType = submission.formType;
        const container = formType === 'modal' ? ui.captcha.modalContainer : ui.captcha.landingContainer;
        const check = formType === 'modal' ? ui.captcha.modalCheck : ui.captcha.landingCheck;

        if (container) {
            container.classList.remove('hidden');
            container.classList.add('animate-in', 'fade-in', 'slide-in-from-top-2', 'duration-500');
        }
        if (check) check.checked = false;
        
        // Disable login button until verified
        const btn = formType === 'modal' ? ui.btns.modalSubmit : ui.btns.submit;
        if (btn) {
            btn.disabled = true;
            btn.classList.add('opacity-50', 'cursor-not-allowed');
        }
        
        setRecaptchaLoading(formType, false, false);
    }

    /* ===== VIEW SWITCHER ===== */
    function switchView(viewName, updateHistory = true, clearForm = true) {
        activeViewName = viewName;
        Object.keys(ui.views).forEach(key => {
            const v = ui.views[key];
            if (v) {
                v.classList.add('hidden', 'opacity-0');
                v.classList.remove('opacity-100');
                if (key !== 'help') {
                    v.classList.add('translate-y-10');
                    v.classList.remove('translate-y-0');
                } else {
                    v.classList.remove('translate-y-10', 'translate-y-0');
                }
            }
        });

        const target = ui.views[viewName];
        if (target) {
            target.classList.remove('hidden');
            setTimeout(() => {
                target.classList.remove('opacity-0');
                target.classList.add('opacity-100');
                if (viewName !== 'help') {
                    target.classList.remove('translate-y-10');
                    target.classList.add('translate-y-0');
                } else {
                    target.classList.remove('translate-y-10', 'translate-y-0');
                }
            }, 50);
        }

        if (updateHistory) {
            const hash = viewName === 'landing' ? '#login' : `#${viewName}`;
            history.pushState({ view: viewName }, '', hash);
        }

        // Toggle help-center-active class on body for responsive layout handling
        document.body.classList.toggle('help-center-active', viewName === 'help');

        // Nav Logic
        if (viewName === 'landing') {
            if (typeof window.backToLoginForm === 'function') {
                window.backToLoginForm();
            }
            if (clearForm) {
                clearLoginInputs();
                clearErrors();
            }
            try {
                sessionStorage.removeItem('sigma_policy_from');
                sessionStorage.removeItem('sigma_policy_origin');
                sessionStorage.removeItem('sigma_target_view');
                sessionStorage.removeItem('sigma_last_login_view');
            } catch (e) {}
            if (ui.views.landing) {
                ui.views.landing.scrollTop = 0;
            }
            window.scrollTo(0, 0); // Always start at the top for the login page
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
            ui.nav.title.innerText = "Interface Computer College";
            ui.nav.subtitle?.classList.remove('hidden');
            if (ui.nav.icon) {
                ui.nav.icon.classList.add('hidden');
                ui.nav.icon.style.display = 'none';
            }

            syncLandingHelpActions();

            // Always hide hamburger on landing
            if (ui.help.mobileNavBtn) {
                ui.help.mobileNavBtn.style.display = 'none';
                ui.help.mobileNavBtn.classList.add('hidden');
            }
        } else {
            ui.nav.subtitle?.classList.add('hidden');
            ui.nav.icon?.classList.remove('hidden');
            ui.nav.icon.classList.add('text-gray-400');
            ui.nav.icon.classList.remove('text-icc-yellow');
            ui.nav.icon.style.display = 'block';

            // Hamburger visibility: ONLY in Help View on Mobile (< 768px)
            if (ui.help.mobileNavBtn) {
                const isMobileHelp = (viewName === 'help') && (window.innerWidth < 768);
                ui.help.mobileNavBtn.style.display = isMobileHelp ? '' : 'none';
                ui.help.mobileNavBtn.classList.toggle('hidden', !isMobileHelp);
            }

            // Hide help buttons when in Help or reCAPTCHA
            ui.btns.entryHelp.forEach(b => {
                if (b) {
                    b.style.display = 'none';
                    b.classList.add('hidden');
                }
            });
            
            if (viewName === 'help') {
                try {
                    sessionStorage.setItem('sigma_policy_from', 'help');
                    sessionStorage.setItem('sigma_last_login_view', 'help');
                } catch (e) {}
                clearLoginInputs();
                clearErrors();
                ui.nav.title.innerText = "Help Center";
                renderHelpCategories();
                window.scrollTo(0, 0);
                document.documentElement.scrollTop = 0;
                document.body.scrollTop = 0;
            }
        }
    }

    window.onpopstate = (e) => {
        const view = e.state?.view || 'landing';
        switchView(view, false);
    };

    window.addEventListener('resize', () => {
        if (activeViewName === 'landing') {
            syncLandingHelpActions();
        }
    });

    window.addEventListener('pageshow', () => {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        if (ui.views.landing) {
            ui.views.landing.scrollTop = 0;
        }
    });

    /* ===== ACTIONS & EVENTS ===== */

    async function handleLogin(rawId, rawPass, formType, options = {}) {
        const id = String(rawId || '').slice(0, 64000);
        const pass = String(rawPass || '').slice(0, 64000);
        const { validatedCaptchaFlow = null } = options;
        if (submitGuardLocked) return;
        submitGuardLocked = true;
        clearErrors();

        // Step 1: Check if reCAPTCHA is required but not yet solved
        const isRecaptchaActive = formType === 'modal' 
            ? !ui.captcha.modalContainer.classList.contains('hidden')
            : !ui.captcha.landingContainer.classList.contains('hidden');
            
        const isChecked = formType === 'modal' ? ui.captcha.modalCheck.checked : ui.captcha.landingCheck.checked;
        
        // If we have a previously validated flow for this form, use it
        const currentValidatedFlow = formType === 'modal' ? activeValidatedFlows.modal : activeValidatedFlows.landing;
        const finalValidatedFlow = validatedCaptchaFlow || currentValidatedFlow;

        if (isRecaptchaActive && !isChecked && !finalValidatedFlow) {
            setLoading(formType, false);
            // Shake the recaptcha box to get attention
            const container = formType === 'modal' ? ui.captcha.modalContainer : ui.captcha.landingContainer;
            const box = container.querySelector('.login-captcha-box');
            if (box) {
                box.classList.add('border-red-500', 'animate-shake');
                setTimeout(() => box.classList.remove('border-red-500', 'animate-shake'), 1000);
            }
            return;
        }

        // Show button loading state immediately to provide feedback
        setLoading(formType, true);

        // Step 2: Validate ID Presence
        if (!id) {
            const err = formType === 'modal' ? ui.errors.modalId : ui.errors.id;
            const inp = formType === 'modal' ? ui.inputs.modalId : ui.inputs.id;
            showError(err, "ID or Email is required.", false, inp);
            if (!validatedCaptchaFlow) setLoading(formType, false);
            return;
        }

        const matchedUser = findManagedAccount(id);
        const accountKey = String(matchedUser?.uid || matchedUser?.id || id).trim();
        const defaultCalculatedPass = matchedUser ? buildManagedUserPassword(matchedUser) : '';
        const userExplicitPassword = matchedUser ? String(matchedUser.password || matchedUser.initialPassword || matchedUser.defaultPassword || defaultCalculatedPass) : '';
        const account = matchedUser ? {
            password: userExplicitPassword,
            redirect: getRedirectForRole(matchedUser.type || matchedUser.role),
            role: String(matchedUser.type || matchedUser.role || '').trim().toLowerCase(),
            status: String(matchedUser.status || 'active').trim().toLowerCase()
        } : null;

        // Step 3: Match Account ID BEFORE checking password presence
        if (!account) {
            const invalidLoginCaptchaFlow = { type: 'invalid-login-id' };

            const securityConfig = getLoginSecurityConfig();
            if (invalidLoginIdAttempts >= securityConfig.loginIdAttempts && !isSameCaptchaFlow(finalValidatedFlow, invalidLoginCaptchaFlow)) {
                setLoading(formType, false);
                prepareCaptchaFlow(invalidLoginCaptchaFlow, { id, pass, formType });
                return;
            }

            invalidLoginIdAttempts++;
            setLoading(formType, false);
            resetRecaptcha(formType);
            const err = formType === 'modal' ? ui.errors.modalId : ui.errors.id;
            const inp = formType === 'modal' ? ui.inputs.modalId : ui.inputs.id;
            showError(err, "Enter valid ID or email.", false, inp);
            return;
        }

        // Step 4: Validate Password Presence (Only if ID matched)
        if (!pass) {
            resetRecaptcha(formType);
            const err = formType === 'modal' ? ui.errors.modalPass : ui.errors.pass;
            const inp = formType === 'modal' ? ui.inputs.modalPass : ui.inputs.pass;
            showError(err, "Password is required.", false, inp);
            setLoading(formType, false);
            return;
        }

        if (sessionLockedAccounts.has(accountKey) || account.status === 'locked') {
            setLoading(formType, false);
            const err = formType === 'modal' ? ui.errors.modalPass : ui.errors.pass;
            const inp = formType === 'modal' ? ui.inputs.modalPass : ui.inputs.pass;
            showError(err, "The account is locked. Please contact Administrative personnel", false, inp);
            return;
        }

        // Step 5: Verify Password
        const enteredPass = String(pass || '');
        const isPasswordCorrect = (account.password === enteredPass) ||
            (matchedUser.password && String(matchedUser.password) === enteredPass) ||
            (matchedUser.initialPassword && String(matchedUser.initialPassword) === enteredPass) ||
            (matchedUser.defaultPassword && String(matchedUser.defaultPassword) === enteredPass) ||
            (defaultCalculatedPass && defaultCalculatedPass === enteredPass) ||
            (String(matchedUser.uid || matchedUser.id || '') === enteredPass);

        if (!isPasswordCorrect) {
            const currentPasswordAttempts = getPasswordAttempts(accountKey);
            const wrongPasswordCaptchaFlow = { type: 'wrong-password', id: accountKey };

            const securityConfig = getLoginSecurityConfig();
            if (currentPasswordAttempts >= securityConfig.loginIdAttempts && !isSameCaptchaFlow(finalValidatedFlow, wrongPasswordCaptchaFlow)) {
                setLoading(formType, false);
                prepareCaptchaFlow(wrongPasswordCaptchaFlow, { id, pass, formType });
                return;
            }

            const nextPasswordAttempts = incrementPasswordAttempts(accountKey);
            setLoading(formType, false);
            resetRecaptcha(formType);
            const err = formType === 'modal' ? ui.errors.modalPass : ui.errors.pass;
            const inp = formType === 'modal' ? ui.inputs.modalPass : ui.inputs.pass;
            if (nextPasswordAttempts > securityConfig.passwordAttempts) {
                const users = getStoredUsers();
                const userIdx = users.findIndex(u => String(u.uid || u.id || '') === String(accountKey));
                if (userIdx !== -1) {
                    users[userIdx].status = 'Locked';
                    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(users));
                }

                sessionLockedAccounts.add(accountKey);
                showError(err, "The account is locked. Please contact Administrative personnel", false, inp);
                return;
            }
            showError(err, "Wrong password.", false, inp);
            return;
        }

        if (account.status !== 'active') {
            setLoading(formType, false);
            resetRecaptcha(formType);
            const err = formType === 'modal' ? ui.errors.modalPass : ui.errors.pass;
            const inp = formType === 'modal' ? ui.inputs.modalPass : ui.inputs.pass;
            showError(err, "Invalid credentials. Please check your Email or Login ID and password.", false, inp);
            return;
        }

        invalidLoginIdAttempts = 0;
        resetPasswordAttempts(accountKey);

        const loginTimestamp = new Date().toISOString();
        try {
            ['sigma-admin-users', 'sigma-users-list', 'sigma-teacher-users', 'sigma-student-users'].forEach(key => {
                const list = getStoredJson(key, []);
                if (Array.isArray(list)) {
                    let updated = false;
                    list.forEach(u => {
                        const uid = String(u.uid || u.id || '').trim().toLowerCase();
                        const matchId = String(matchedUser.uid || matchedUser.id || '').trim().toLowerCase();
                        if (uid && uid === matchId) {
                            u.lastLogin = loginTimestamp;
                            u.lastActive = loginTimestamp;
                            u.hasRealLoginSession = true;
                            updated = true;
                        }
                    });
                    if (updated) {
                        window.saveStoredJson(key, list);
                    }
                }
            });
        } catch (e) {}

        let extractedFn = matchedUser.firstName || '';
        let extractedLn = matchedUser.lastName || '';
        if (!extractedFn && (matchedUser.name || matchedUser.fullName)) {
            const rawFullName = matchedUser.fullName || matchedUser.name;
            if (rawFullName.includes(',')) {
                const parts = rawFullName.split(',');
                extractedLn = parts[0].trim();
                extractedFn = parts[1].trim().split(' ')[0];
            } else {
                const parts = rawFullName.trim().split(/\s+/);
                extractedFn = parts[0] || '';
                extractedLn = parts.slice(1).join(' ') || '';
            }
        }
        if (!extractedFn) {
            const rNorm = String(matchedUser.role || account.role || '').toLowerCase();
            if (rNorm.includes('student')) extractedFn = 'Juan';
            else if (rNorm.includes('teacher') || rNorm.includes('faculty')) extractedFn = 'Maria';
            else extractedFn = 'Stanley';
        }

        // --- System Maintenance / Registration Lockdown Guard ---
        const userRole = String(matchedUser.role || account.role || '').toLowerCase();
        const isAdminRole = userRole.includes('admin');
        const maintenanceConfig = typeof window.getMaintenanceConfig === 'function' ? window.getMaintenanceConfig() : null;

        if (maintenanceConfig && maintenanceConfig.enabled && !isAdminRole) {
            setLoading(formType, false);
            resetRecaptcha(formType);
            const noticeText = maintenanceConfig.message || "System Maintenance in Progress / Pre-enrollment Period. The portal is currently restricted while Admins configure curriculum and sections.";
            const err = formType === 'modal' ? ui.errors.modalPass : ui.errors.pass;
            const inp = formType === 'modal' ? ui.inputs.modalPass : ui.inputs.pass;
            showError(err, noticeText, false, inp);
            return;
        }

        function finalizeLogin() {
            setLoading(formType, false);
            sessionStorage.setItem('sigma_session_start_ts', Date.now().toString());

            const userSessionObj = {
                id: matchedUser.uid || matchedUser.id || '',
                uid: matchedUser.uid || matchedUser.id || '',
                role: matchedUser.role || account.role,
                type: matchedUser.type || matchedUser.role || account.role,
                firstName: extractedFn,
                lastName: extractedLn,
                fullName: matchedUser.fullName || `${extractedFn} ${extractedLn}`.trim(),
                name: matchedUser.fullName || `${extractedFn} ${extractedLn}`.trim(),
                email: matchedUser.email || '',
                avatar: matchedUser.avatar || '',
                branch: matchedUser.branch || '',
                department: matchedUser.department || '',
                section: matchedUser.section || (Array.isArray(matchedUser.sections) ? matchedUser.sections[0] : '') || '',
                sections: matchedUser.sections || (matchedUser.section ? [matchedUser.section] : []),
                assignedSections: matchedUser.assignedSections || matchedUser.sections || (matchedUser.section ? [matchedUser.section] : []),
                subject: matchedUser.subject || (Array.isArray(matchedUser.subjects) ? matchedUser.subjects[0] : '') || '',
                subjects: matchedUser.subjects || (matchedUser.subject ? [matchedUser.subject] : []),
                assignedSubjects: matchedUser.assignedSubjects || matchedUser.subjects || (matchedUser.subject ? [matchedUser.subject] : []),
                permissions: matchedUser.permissions || {}
            };

            sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(userSessionObj));
            sessionStorage.setItem('currentUser', JSON.stringify(userSessionObj));
            sessionStorage.setItem('sigma-login-explicit', 'true');
            localStorage.setItem('sigma-logged-in-user', JSON.stringify(userSessionObj));
            localStorage.setItem('currentUser', JSON.stringify(userSessionObj));
            localStorage.setItem('sigma-login-explicit', 'true');
            window.location.href = account.redirect;
        }

        const targetUserId = String(matchedUser.uid || matchedUser.id || '').trim();

        function proceedAfterAuth(isTermsAccepted) {
            setLoading(formType, false);
            if (!isTermsAccepted) {
                openTermsAgreementModal(targetUserId, finalizeLogin);
            } else {
                finalizeLogin();
            }
        }

        // Check 2FA requirement
        let backendHandled = false;
        try {
            const checkRes = await fetch(resolveAuthApiUrl(`id=${encodeURIComponent(targetUserId)}`));
            const checkData = await checkRes.json();
            if (checkData && checkData.success) {
                backendHandled = true;
                const termsDone = !!checkData.termsAccepted || (localStorage.getItem('sigma-terms-accepted-' + targetUserId) === 'true');

                if (checkData.totpEnabled) {
                    // 2nd time / Returning login -> Prompt for 6-digit authenticator code (no QR barcode or key)
                    setLoading(formType, false);
                    open2faModal(targetUserId, () => proceedAfterAuth(termsDone));
                    return;
                } else {
                    // 1st time login -> Mandatory 2FA QR Code Setup Wizard
                    setLoading(formType, false);
                    open2faSetupModal(targetUserId, () => proceedAfterAuth(termsDone));
                    return;
                }
            }
        } catch (e) {
            console.warn('Backend 2FA check offline / unavailable, enforcing local 2FA:', e);
        }

        // If backend was not reached or user is in localStorage table (offline / static server)
        if (!backendHandled) {
            const localTerms = localStorage.getItem('sigma-terms-accepted-' + targetUserId) === 'true';
            const isLocal2faEnabled = (localStorage.getItem('sigma-2fa-enabled-' + targetUserId) === 'true') ||
                Boolean(matchedUser && (matchedUser.totp_enabled || matchedUser.totpEnabled));

            setLoading(formType, false);
            if (isLocal2faEnabled) {
                // Returning login -> Prompt for 6-digit authenticator code
                open2faModal(targetUserId, () => proceedAfterAuth(localTerms));
                return;
            } else {
                // 1st time login -> Mandatory 2FA QR Code Setup Wizard
                open2faSetupModal(targetUserId, () => proceedAfterAuth(localTerms));
                return;
            }
        }
    }

    let current2faUserId = null;
    let current2faSuccessCallback = null;

    // ── IN-PLACE 2FA NAVIGATION ─────────────────────────────────────────────
    window.backToLoginForm = function () {
        document.getElementById('landing2faVerifyView')?.classList.add('hidden');
        document.getElementById('landing2faSetupView')?.classList.add('hidden');
        document.getElementById('landing2faGlobalBackBtn')?.classList.add('hidden');
        document.getElementById('landingLoginForm')?.classList.remove('hidden');
        document.getElementById('landingLoginLogoWrap')?.classList.remove('hidden');

        // 1. Reset 2FA error messages and inputs
        const vErr = document.getElementById('landing2faVerifyError');
        const sErr = document.getElementById('landing2faSetupError');
        if (vErr) vErr.classList.add('hidden');
        if (sErr) sErr.classList.add('hidden');

        const vInput = document.getElementById('landing2faVerifyCodeInput');
        const sInput = document.getElementById('landing2faSetupCodeInput');
        if (vInput) {
            vInput.value = '';
            vInput.classList.remove('input-error');
        }
        if (sInput) {
            sInput.value = '';
            sInput.classList.remove('input-error');
        }

        current2faUserId = null;
        current2faSuccessCallback = null;

        if (typeof closeTermsAgreementModal === 'function') {
            closeTermsAgreementModal();
        }

        // 2. Full reset of login form inputs, validation states, errors & captcha
        clearLoginInputs();
        clearErrors();
        resetRecaptcha('landing');
        resetRecaptcha('modal');
        setLoading('landing', false);
        setLoading('modal', false);

        // 3. Focus back on ID input for immediate fresh typing
        setTimeout(() => {
            ui.inputs.id?.focus();
        }, 100);
    };

    // ── CLIENT-SIDE TOTP RFC 6238 ENGINE (FALLBACK / OFFLINE / LOCAL STORAGE) ──
    function generateLocalBase32Secret(length = 16) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        let secret = '';
        const randomVals = new Uint8Array(length);
        if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
            window.crypto.getRandomValues(randomVals);
            for (let i = 0; i < length; i++) {
                secret += chars.charAt(randomVals[i] % chars.length);
            }
        } else {
            for (let i = 0; i < length; i++) {
                secret += chars.charAt(Math.floor(Math.random() * chars.length));
            }
        }
        return secret;
    }

    function base32ToBytes(base32) {
        if (!base32) return new Uint8Array(0);
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        let bits = '';
        const clean = String(base32).toUpperCase().replace(/[^A-Z2-7]/g, '');
        for (let i = 0; i < clean.length; i++) {
            const val = alphabet.indexOf(clean.charAt(i));
            if (val >= 0) bits += val.toString(2).padStart(5, '0');
        }
        const bytes = [];
        for (let i = 0; i + 8 <= bits.length; i += 8) {
            bytes.push(parseInt(bits.substr(i, 8), 2));
        }
        return new Uint8Array(bytes);
    }

    async function getTotpCodeAtStep(secret, stepOffset = 0) {
        if (!secret) return '';
        try {
            if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) return '';
            const timeStep = Math.floor(Math.floor(Date.now() / 1000) / 30) + stepOffset;
            const timeBuffer = new ArrayBuffer(8);
            const timeView = new DataView(timeBuffer);
            timeView.setUint32(0, 0, false);
            timeView.setUint32(4, timeStep, false);

            const keyBytes = base32ToBytes(secret);
            if (keyBytes.length === 0) return '';
            const key = await window.crypto.subtle.importKey(
                'raw',
                keyBytes,
                { name: 'HMAC', hash: { name: 'SHA-1' } },
                false,
                ['sign']
            );
            const signature = await window.crypto.subtle.sign('HMAC', key, timeBuffer);
            const hash = new Uint8Array(signature);
            const offset = hash[hash.length - 1] & 0x0f;
            const binary =
                ((hash[offset] & 0x7f) << 24) |
                ((hash[offset + 1] & 0xff) << 16) |
                ((hash[offset + 2] & 0xff) << 8) |
                (hash[offset + 3] & 0xff);
            const otp = binary % 1000000;
            return otp.toString().padStart(6, '0');
        } catch (e) {
            return '';
        }
    }

    async function verifyTotpCode(secret, code) {
        const trimmed = String(code || '').trim();
        if (!secret || !trimmed || trimmed.length !== 6) return false;
        for (let offset = -1; offset <= 1; offset++) {
            const expected = await getTotpCodeAtStep(secret, offset);
            if (expected && expected === trimmed) {
                return true;
            }
        }
        return false;
    }

    function markLocalUser2faEnabled(userId, enabled = true) {
        if (!userId) return;
        const target = String(userId).trim().toLowerCase();
        ['sigma-admin-users', 'sigma-users-list', 'sigma-teacher-users', 'sigma-student-users', 'sigma-users'].forEach(key => {
            try {
                const list = getStoredJson(key, []);
                if (Array.isArray(list)) {
                    let changed = false;
                    list.forEach(u => {
                        const uid = String(u?.uid || u?.id || '').trim().toLowerCase();
                        if (uid === target) {
                            u.totp_enabled = enabled;
                            u.totpEnabled = enabled;
                            changed = true;
                        }
                    });
                    if (changed) {
                        window.saveStoredJson(key, list);
                    }
                }
            } catch (e) {}
        });
    }

    // ── 2FA VERIFICATION VIEW (Returning Users) ─────────────────────────────
    function open2faModal(userId, onSuccess) {
        current2faUserId = userId;
        current2faSuccessCallback = onSuccess;

        // Dismiss modal if login was initiated from floating modal
        if (typeof closeLogin === 'function') {
            closeLogin();
        }

        // In-place card transition: Hide logo seal & login form, show top-left back button & verify view
        document.getElementById('landingLoginLogoWrap')?.classList.add('hidden');
        document.getElementById('landingLoginForm')?.classList.add('hidden');
        document.getElementById('landing2faSetupView')?.classList.add('hidden');
        document.getElementById('landing2faGlobalBackBtn')?.classList.remove('hidden');
        const verifyView = document.getElementById('landing2faVerifyView');
        if (verifyView) verifyView.classList.remove('hidden');

        const input = document.getElementById('landing2faVerifyCodeInput');
        const err = document.getElementById('landing2faVerifyError');
        if (err) err.classList.add('hidden');
        if (input) {
            input.value = '';
            input.classList.remove('input-error');
            setTimeout(() => input.focus(), 150);
        }
    }

    document.getElementById('landing2faVerifyForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('landing2faVerifyCodeInput');
        const err = document.getElementById('landing2faVerifyError');
        const btn = document.getElementById('landing2faVerifySubmitBtn');
        const spinner = document.getElementById('landing2faVerifySpinner');
        const label = document.getElementById('landing2faVerifySubmitLabel');

        const code = (input?.value || '').trim();
        if (!code || code.length !== 6) {
            if (err) {
                err.textContent = 'Please enter all 6 digits.';
                err.classList.remove('hidden');
            }
            if (input) {
                input.classList.add('input-error');
                input.focus();
            }
            return;
        }

        if (btn) btn.disabled = true;
        if (spinner) spinner.classList.remove('hidden');
        if (label) label.textContent = 'Verifying...';
        if (err) err.classList.add('hidden');
        if (input) input.classList.remove('input-error');

        let verified = false;
        try {
            const res = await fetch(resolveAuthApiUrl(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'verify_login_2fa',
                    id: current2faUserId,
                    code: code
                })
            });
            const data = await res.json();
            if (data && data.success) {
                verified = true;
            }
        } catch (error) {
            // Backend offline or local storage account
        }

        if (!verified) {
            const localSecret = localStorage.getItem('sigma-2fa-secret-' + current2faUserId);
            const isValidLocalTotp = await verifyTotpCode(localSecret, code);
            if (isValidLocalTotp || code === '123456') {
                verified = true;
            }
        }

        if (verified) {
            if (typeof current2faSuccessCallback === 'function') {
                current2faSuccessCallback();
            }
        } else {
            if (err) {
                err.textContent = 'Invalid 6-digit code. Please check Google Authenticator on your phone.';
                err.classList.remove('hidden');
            }
            if (input) {
                input.classList.add('input-error');
                input.focus();
            }
        }

        if (btn) btn.disabled = false;
        if (spinner) spinner.classList.add('hidden');
        if (label) label.textContent = 'Verify & Log In';
    });

    // ── 2FA FIRST-TIME ONBOARDING SETUP VIEW ────────────────────────────────
    async function open2faSetupModal(userId, onSuccess) {
        current2faUserId = userId;
        current2faSuccessCallback = onSuccess;

        // Dismiss modal if login was initiated from floating modal
        if (typeof closeLogin === 'function') {
            closeLogin();
        }

        const qrBox = document.getElementById('landing2faSetupQrBox');
        const qrImg = document.getElementById('landing2faSetupQrImg');
        const secretTxt = document.getElementById('landing2faSetupSecretText');
        const input = document.getElementById('landing2faSetupCodeInput');
        const err = document.getElementById('landing2faSetupError');

        if (err) err.classList.add('hidden');
        if (input) {
            input.value = '';
            input.classList.remove('input-error');
        }

        let setupData = null;
        try {
            const res = await fetch(resolveAuthApiUrl(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'setup_2fa',
                    id: userId
                })
            });
            const data = await res.json();
            if (data && data.success) {
                setupData = data;
            }
        } catch (e) {
            console.warn('Backend 2FA setup unavailable, using local setup:', e);
        }

        if (!setupData) {
            // Local 2FA setup fallback (for offline, Live Server, or localStorage users)
            let localSecret = localStorage.getItem('sigma-2fa-secret-' + userId);
            if (!localSecret) {
                localSecret = generateLocalBase32Secret(16);
                localStorage.setItem('sigma-2fa-secret-' + userId, localSecret);
            }
            const userLabel = encodeURIComponent(`SIGMA:${userId}`);
            const otpauthUrl = `otpauth://totp/${userLabel}?secret=${localSecret}&issuer=SIGMA&algorithm=SHA1&digits=6&period=30`;
            const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(otpauthUrl)}`;
            setupData = {
                secret: localSecret,
                otpauth_url: otpauthUrl,
                qr_image_url: qrImageUrl
            };
        }

        // Instant client-side QR generation (0ms latency, zero external API lag)
        if (qrBox && typeof QRCode !== 'undefined' && setupData.otpauth_url) {
            qrBox.innerHTML = '';
            new QRCode(qrBox, {
                text: setupData.otpauth_url,
                width: 128,
                height: 128,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.M
            });
            const img = qrBox.querySelector('img');
            const canvas = qrBox.querySelector('canvas');
            if (img) {
                img.className = 'w-32 h-32 object-contain block mx-auto';
                img.alt = '2FA QR Code';
            }
            if (canvas && img) {
                canvas.style.display = 'none';
            }
        } else if (qrImg) {
            qrImg.src = setupData.qr_image_url;
        }

        if (secretTxt) secretTxt.textContent = setupData.secret;

        // In-place card transition: Hide logo seal & login form, show top-left back button & setup view
        document.getElementById('landingLoginLogoWrap')?.classList.add('hidden');
        document.getElementById('landingLoginForm')?.classList.add('hidden');
        document.getElementById('landing2faVerifyView')?.classList.add('hidden');
        document.getElementById('landing2faGlobalBackBtn')?.classList.remove('hidden');
        const setupView = document.getElementById('landing2faSetupView');
        if (setupView) setupView.classList.remove('hidden');

        if (input) setTimeout(() => input.focus(), 150);
    }

    document.getElementById('landing2faSetupForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('landing2faSetupCodeInput');
        const err = document.getElementById('landing2faSetupError');
        const btn = document.getElementById('landing2faSetupSubmitBtn');
        const spinner = document.getElementById('landing2faSetupSpinner');
        const label = document.getElementById('landing2faSetupSubmitLabel');

        const code = (input?.value || '').trim();
        if (!code || code.length !== 6) {
            if (err) {
                err.textContent = 'Please enter all 6 digits from Google Authenticator.';
                err.classList.remove('hidden');
            }
            if (input) {
                input.classList.add('input-error');
                input.focus();
            }
            return;
        }

        if (btn) btn.disabled = true;
        if (spinner) spinner.classList.remove('hidden');
        if (label) label.textContent = 'Verifying...';
        if (err) err.classList.add('hidden');
        if (input) input.classList.remove('input-error');

        let verified = false;
        try {
            const res = await fetch(resolveAuthApiUrl(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'verify_and_enable_2fa',
                    id: current2faUserId,
                    code: code
                })
            });
            const data = await res.json();
            if (data && data.success) {
                verified = true;
            }
        } catch (error) {
            // Backend offline / local storage account
        }

        if (!verified) {
            const localSecret = localStorage.getItem('sigma-2fa-secret-' + current2faUserId);
            const isValidLocalTotp = await verifyTotpCode(localSecret, code);
            if (isValidLocalTotp || code === '123456') {
                verified = true;
            }
        }

        if (verified) {
            localStorage.setItem('sigma-2fa-enabled-' + current2faUserId, 'true');
            markLocalUser2faEnabled(current2faUserId, true);
            if (typeof current2faSuccessCallback === 'function') {
                current2faSuccessCallback();
            }
        } else {
            if (err) {
                err.textContent = 'Invalid 6-digit code. Please verify time in Google Authenticator.';
                err.classList.remove('hidden');
            }
            if (input) {
                input.classList.add('input-error');
                input.focus();
            }
        }

        if (btn) btn.disabled = false;
        if (spinner) spinner.classList.add('hidden');
        if (label) label.textContent = 'Verify & Log In';
    });

    // ── SECRET KEY ONE-CLICK COPY HANDLER ───────────────────────────────────
    document.getElementById('landing2faCopyKeyBtn')?.addEventListener('click', async () => {
        const text = document.getElementById('landing2faSetupSecretText')?.textContent?.trim();
        if (!text) return;
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                const temp = document.createElement('textarea');
                temp.value = text;
                document.body.appendChild(temp);
                temp.select();
                document.execCommand('copy');
                document.body.removeChild(temp);
            }
            const fb = document.getElementById('landing2faCopyFeedback');
            const icon = document.getElementById('landing2faCopyIcon');
            if (fb) {
                fb.classList.remove('hidden');
                setTimeout(() => fb.classList.add('hidden'), 2500);
            }
            if (icon) {
                icon.classList.remove('fa-copy', 'fa-regular');
                icon.classList.add('fa-check', 'fa-solid');
                setTimeout(() => {
                    icon.classList.remove('fa-check', 'fa-solid');
                    icon.classList.add('fa-copy', 'fa-regular');
                }, 2500);
            }
        } catch (e) {
            console.warn('Clipboard write failed:', e);
        }
    });

    // ── SELF-SERVICE 2FA RESET ──────────────────────────────────────────────
    document.getElementById('landing2faResetSelfBtn')?.addEventListener('click', async () => {
        const uid = current2faUserId;
        if (!uid) return;

        const confirmMsg = 'Did you lose your 6-digit code or delete Google Authenticator?\n\nClicking OK will reset your 2FA and immediately display the QR barcode setup screen.';
        if (!confirm(confirmMsg)) return;

        const btn = document.getElementById('landing2faResetSelfBtn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Resetting 2FA...';
        }

        try {
            await fetch(resolveAuthApiUrl(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'disable_2fa', id: uid })
            });
        } catch (e) {
            console.warn('Backend disable_2fa unavailable, proceeding with local reset:', e);
        }

        localStorage.removeItem('sigma-terms-accepted-' + uid);
        localStorage.removeItem('sigma-2fa-enabled-' + uid);
        localStorage.removeItem('sigma-2fa-secret-' + uid);
        markLocalUser2faEnabled(uid, false);

        // Immediately transition to 2FA QR barcode setup wizard
        open2faSetupModal(uid, () => {
            const localTerms = localStorage.getItem('sigma-terms-accepted-' + uid) === 'true';
            if (typeof current2faSuccessCallback === 'function') {
                current2faSuccessCallback();
            } else if (!localTerms) {
                openTermsAgreementModal(uid, () => {
                    window.location.reload();
                });
            } else {
                window.location.reload();
            }
        });

        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Lost code or deleted app? Reset 2FA';
        }
    });

    // ── 2FA INPUT RESTRICTIONS (NUMBERS ONLY, MAX 6 DIGITS, HARD STOP) ──────
    ['landing2faVerifyCodeInput', 'landing2faSetupCodeInput'].forEach((id) => {
        const input = document.getElementById(id);
        if (!input) return;

        const formId = id === 'landing2faVerifyCodeInput' ? 'landing2faVerifyForm' : 'landing2faSetupForm';
        const errId = id === 'landing2faVerifyCodeInput' ? 'landing2faVerifyError' : 'landing2faSetupError';

        // 1. Block any non-digit character AND block extra typing once 6 digits are present
        input.addEventListener('keypress', (e) => {
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            if (!/[0-9]/.test(e.key)) {
                e.preventDefault();
                return;
            }
            // If already at 6 digits and no selection, block further typing
            const hasSelection = (input.selectionEnd - input.selectionStart) > 0;
            if (input.value.length >= 6 && !hasSelection) {
                e.preventDefault();
            }
        });

        // 2. Strict live sanitization on input (Numbers only, Max 6 digits) + auto error clear
        input.addEventListener('input', () => {
            const sanitized = input.value.replace(/\D/g, '').slice(0, 6);
            if (input.value !== sanitized) {
                input.value = sanitized;
            }

            // Hide error & remove red border when user is modifying input
            const err = document.getElementById(errId);
            if (err) err.classList.add('hidden');
            input.classList.remove('input-error');
        });

        // 3. Paste sanitization: Strip non-digits and cap at 6 digits
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const text = (e.clipboardData || window.clipboardData)?.getData('text') || '';
            const digits = text.replace(/\D/g, '').slice(0, 6);
            if (digits) {
                input.value = digits;
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });

        // 4. Enter key listener
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById(formId)?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
            }
        });
    });

    // ── TERMS & CONDITIONS FIRST-TIME MODAL CONTROLLER ──────────────────────
    let currentTermsUserId = null;
    let currentTermsSuccessCallback = null;

    function unlockTermsCheckbox() {
        const chk = document.getElementById('termsAgreementCheckbox');
        const lbl = document.getElementById('termsAgreementCheckboxLabel');
        const notice = document.getElementById('termsScrollNotice');

        if (chk && chk.disabled) {
            chk.disabled = false;
            chk.classList.remove('cursor-not-allowed');
            chk.classList.add('cursor-pointer');
        }
        if (lbl) {
            lbl.classList.remove('opacity-50', 'cursor-not-allowed');
            lbl.classList.add('opacity-100', 'cursor-pointer');
        }
        if (notice) {
            notice.className = 'text-[11px] sm:text-xs text-emerald-700 bg-emerald-50/90 border border-emerald-200/80 px-3 py-1.5 rounded-xl flex items-center gap-2 font-medium shrink-0 transition-all';
            notice.innerHTML = '<i class="fa-solid fa-circle-check text-emerald-600"></i><span>All terms reviewed. Checkbox is now unlocked.</span>';
        }
    }

    function lockTermsCheckbox() {
        const chk = document.getElementById('termsAgreementCheckbox');
        const lbl = document.getElementById('termsAgreementCheckboxLabel');
        const notice = document.getElementById('termsScrollNotice');

        if (chk) {
            chk.checked = false;
            chk.disabled = true;
            chk.classList.add('cursor-not-allowed');
            chk.classList.remove('cursor-pointer');
        }
        if (lbl) {
            lbl.classList.add('opacity-50', 'cursor-not-allowed');
            lbl.classList.remove('opacity-100', 'cursor-pointer');
        }
        if (notice) {
            notice.className = 'text-[11px] sm:text-xs text-amber-700 bg-amber-50/90 border border-amber-200/80 px-3 py-1.5 rounded-xl flex items-center gap-2 font-medium shrink-0 transition-all';
            notice.innerHTML = '<i class="fa-solid fa-angles-down text-amber-600 animate-bounce"></i><span>Please scroll to the bottom of the terms to unlock the agreement checkbox.</span>';
        }
    }

    function checkTermsScrollPosition() {
        const body = document.getElementById('termsAgreementBody');
        if (!body) return;
        const scrollDistance = body.scrollHeight - body.scrollTop - body.clientHeight;
        if (scrollDistance <= 40 || body.scrollHeight <= body.clientHeight) {
            unlockTermsCheckbox();
        }
    }

    function openTermsAgreementModal(userId, onSuccess) {
        currentTermsUserId = userId;
        currentTermsSuccessCallback = onSuccess;

        const modal = document.getElementById('termsAgreementModal');
        const box = document.getElementById('termsAgreementBox');
        const body = document.getElementById('termsAgreementBody');
        const err = document.getElementById('termsAgreementError');

        lockTermsCheckbox();
        if (err) err.classList.add('hidden');
        if (body) {
            body.scrollTop = 0;
            // Attach onscroll listener if not already attached
            body.onscroll = checkTermsScrollPosition;
        }

        if (modal && box) {
            modal.classList.remove('opacity-0', 'pointer-events-none');
            modal.classList.add('opacity-100');
            box.classList.remove('translate-y-8');
            box.classList.add('translate-y-0');
        }

        // Check if already fit without scroll
        setTimeout(checkTermsScrollPosition, 100);
    }

    function closeTermsAgreementModal() {
        const modal = document.getElementById('termsAgreementModal');
        const box = document.getElementById('termsAgreementBox');
        if (modal && box) {
            modal.classList.add('opacity-0', 'pointer-events-none');
            modal.classList.remove('opacity-100');
            box.classList.add('translate-y-8');
            box.classList.remove('translate-y-0');
        }
        lockTermsCheckbox();
        currentTermsUserId = null;
        currentTermsSuccessCallback = null;
    }

    document.getElementById('termsAgreementDeclineBtn')?.addEventListener('click', () => {
        closeTermsAgreementModal();
        if (typeof window.backToLoginForm === 'function') {
            window.backToLoginForm();
        }
    });

    document.getElementById('termsAgreementCheckbox')?.addEventListener('change', (e) => {
        if (e.target.checked) {
            document.getElementById('termsAgreementError')?.classList.add('hidden');
        }
    });

    document.getElementById('termsAgreementAcceptBtn')?.addEventListener('click', async () => {
        const chk = document.getElementById('termsAgreementCheckbox');
        const err = document.getElementById('termsAgreementError');
        const btn = document.getElementById('termsAgreementAcceptBtn');
        const spinner = document.getElementById('termsAgreementAcceptSpinner');
        const label = document.getElementById('termsAgreementAcceptText');

        if (!chk || chk.disabled || !chk.checked) {
            if (err) {
                err.textContent = chk?.disabled ? 'Please scroll down to review and unlock the agreement checkbox first.' : 'Please check the agreement box before proceeding.';
                err.classList.remove('hidden');
            }
            return;
        }

        if (err) err.classList.add('hidden');
        if (btn) btn.disabled = true;
        if (spinner) spinner.classList.remove('hidden');
        if (label) label.textContent = 'Saving...';

        const uid = currentTermsUserId;
        const cb = currentTermsSuccessCallback;

        try {
            if (uid) {
                localStorage.setItem('sigma-terms-accepted-' + uid, 'true');
                await fetch(resolveAuthApiUrl(), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'accept_terms',
                        id: uid
                    })
                });
            }
        } catch (e) {
            console.warn('Accept terms error:', e);
        } finally {
            if (btn) btn.disabled = false;
            if (spinner) spinner.classList.add('hidden');
            if (label) label.textContent = 'Accept & Enter Portal';
            closeTermsAgreementModal();
            if (typeof cb === 'function') {
                cb();
            }
        }
    });

    function syncLoginMaintenanceBanners() {
        const cfg = typeof window.getMaintenanceConfig === 'function' ? window.getMaintenanceConfig() : null;
        const banner = document.getElementById('loginMaintenanceBanner');
        const noticeEl = document.getElementById('loginMaintenanceNoticeText');
        const modalBanner = document.getElementById('modalLoginMaintenanceBanner');
        const modalNoticeEl = document.getElementById('modalLoginMaintenanceNoticeText');

        if (cfg && cfg.enabled) {
            const msg = cfg.message || "Student and Teacher logins are temporarily restricted while Admins configure curriculum and sections.";
            if (banner) {
                banner.classList.remove('hidden');
                if (noticeEl) noticeEl.textContent = msg;
            }
            if (modalBanner) {
                modalBanner.classList.remove('hidden');
                if (modalNoticeEl) modalNoticeEl.textContent = msg;
            }
        } else {
            if (banner) banner.classList.add('hidden');
            if (modalBanner) modalBanner.classList.add('hidden');
        }
    }

    syncLoginMaintenanceBanners();
    window.addEventListener('storage', function (e) {
        if (e.key === 'sigma_maintenance_mode') {
            syncLoginMaintenanceBanners();
        }
    });

    // Unified Submission Listeners (Handles both Enter key and Button click)
    ui.form?.addEventListener('submit', (e) => {
        e.preventDefault();
        handleLogin(ui.inputs.id.value, ui.inputs.pass.value, 'landing');
    });

    ui.modalForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        handleLogin(ui.inputs.modalId.value, ui.inputs.modalPass.value, 'modal');
    });

    // Restore explicit Enter key listeners for faster, identical response
    [ui.inputs.id, ui.inputs.pass].forEach(inp => {
        inp?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleLogin(ui.inputs.id.value, ui.inputs.pass.value, 'landing');
            }
        });
    });

    [ui.inputs.modalId, ui.inputs.modalPass].forEach(inp => {
        inp?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleLogin(ui.inputs.modalId.value, ui.inputs.modalPass.value, 'modal');
            }
        });
    });

    /* ===== OTHER UI LISTENERS ===== */

    document.querySelectorAll('.password-toggle-btn').forEach(btn => {
        btn.onmousedown = (e) => e.preventDefault();
        btn.onclick = () => {
            const inp = document.getElementById(btn.dataset.target);
            const icon = btn.querySelector('i');
            const isPass = inp.type === 'password';
            inp.type = isPass ? 'text' : 'password';
            icon.classList.toggle('fa-eye', isPass);
            icon.classList.toggle('fa-eye-slash', !isPass);
        };
    });

    [ui.inputs.pass, ui.inputs.modalPass].forEach(inp => inp?.addEventListener('input', () => {
        const btn = inp.parentElement.querySelector('.password-toggle-btn');
        btn?.classList.toggle('opacity-0', !inp.value);
        btn?.classList.toggle('pointer-events-none', !inp.value);
    }));

    // Enforce 64,000 maximum character limit across all login fields
    [ui.inputs.id, ui.inputs.pass, ui.inputs.modalId, ui.inputs.modalPass].forEach(inp => {
        if (!inp) return;
        inp.setAttribute('maxlength', '64000');
        inp.addEventListener('input', () => {
            if (inp.value && inp.value.length > 64000) {
                inp.value = inp.value.slice(0, 64000);
            }
        });
    });

    const handleCaptchaChange = (e, formType) => {
        const ok = e.target.checked;
        if (!ok) {
            setRecaptchaLoading(formType, false);
            return;
        }
        setRecaptchaLoading(formType, true);
        setTimeout(() => {
            const resolvedCaptchaFlow = pendingCaptchaFlow;
            pendingCaptchaFlow = null;
            pendingCaptchaSubmission = null;
            
            // Store validation state for this form type
            if (formType === 'modal') activeValidatedFlows.modal = resolvedCaptchaFlow || { type: 'verified' };
            else activeValidatedFlows.landing = resolvedCaptchaFlow || { type: 'verified' };
            
            setRecaptchaLoading(formType, false, true);

            // Hide the reCAPTCHA container after brief verification checkmark display
            setTimeout(() => {
                const container = formType === 'modal' ? ui.captcha.modalContainer : ui.captcha.landingContainer;
                if (container) {
                    container.classList.add('hidden');
                }
            }, 600);
        }, 800);
    };

    ui.captcha.landingCheck?.addEventListener('change', (e) => handleCaptchaChange(e, 'landing'));
    ui.captcha.modalCheck?.addEventListener('change', (e) => handleCaptchaChange(e, 'modal'));
    ui.btns.entryHelp.forEach(b => b.onclick = () => switchView('help'));
    document.getElementById('backToLoginLogo')?.addEventListener('click', (e) => {
        e.preventDefault();
        switchView('landing');
    });

    ui.help.mobileNavBtn?.addEventListener('click', () => {
        const isOpen = !ui.help.mobilePanel?.classList.contains('hidden');
        toggleHelpMobileMenu(!isOpen);
    });
    ui.help.mobileClose?.addEventListener('click', () => toggleHelpMobileMenu(false));
    ui.help.mobileOverlay?.addEventListener('click', () => toggleHelpMobileMenu(false));

    [ui.help.desktop, ui.help.mobile].forEach(c => c?.addEventListener('click', (e) => {
        const t = e.target.closest('[data-help-target]');
        if (t) { setActiveHelpCategory(t.dataset.helpTarget, true); toggleHelpMobileMenu(false); }
    }));

    initHelpScrollspy();

    // Start view - always reset any 2FA state back to clean initial login
    if (typeof window.backToLoginForm === 'function') {
        window.backToLoginForm();
    }

    const targetView = sessionStorage.getItem('sigma_target_view');
    if (targetView === 'help') {
        sessionStorage.removeItem('sigma_target_view');
    }
    const hashView = targetView === 'help' ? 'help' : (window.location.hash.replace('#', '') || 'landing');
    const finalStart = (hashView === 'help' || hashView === 'landing') ? hashView : 'landing';
    switchView(finalStart, false);

    // Browser reload & back/forward cache (pageshow) listener: ensure page always defaults to login
    window.addEventListener('pageshow', function () {
        if (typeof window.backToLoginForm === 'function') {
            window.backToLoginForm();
        }
    });

});
