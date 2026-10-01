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

    function getLoginSecurityConfig() {
        return getStoredJson(LOGIN_SECURITY_KEY, { loginIdAttempts: 3, passwordAttempts: 8 });
    }

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
        return getStoredJson(USER_STORAGE_KEY, []);
    }

    function buildManagedUserPassword(user) {
        const safeLastName = String(user?.lastName || 'user')
            .trim()
            .replace(/[^a-zA-Z0-9]/g, '')
            .toLowerCase();
        const userId = String(user?.uid || user?.id || '').trim();
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
        if (normalizedRole === 'student') return 'student.html';
        if (normalizedRole === 'teacher') return 'teacher.html';
        if (normalizedRole === 'admin' || normalizedRole === 'head admin' || normalizedRole === 'master admin') return 'admin.html';
        return 'index.html';
    }

    function findManagedAccount(loginValue) {
        let submitted = String(loginValue || '').trim().toLowerCase();
        if (!submitted) return null;

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
                const email = String(user.email || '').trim().toLowerCase();
                const emailPrefix = email.split('@')[0];

                // Matches ID, Exact Email, or Email Prefix
                return submitted === id ||
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
        if (shouldScroll && ui.help.content) {
            const target = document.getElementById(targetId);
            if (target) {
                isHelpScrollingProgrammatically = true;
                clearTimeout(helpScrollTimer);
                const y = target.getBoundingClientRect().top + ui.help.content.scrollTop - ui.help.content.getBoundingClientRect().top - 24;
                ui.help.content.scrollTo({ top: y, behavior: 'smooth' });
                helpScrollTimer = setTimeout(() => {
                    isHelpScrollingProgrammatically = false;
                }, 800);
            }
        }
    }

    function initHelpScrollspy() {
        if (!ui.help.content) return;
        let ticking = false;

        ui.help.content.addEventListener('scroll', () => {
            if (isHelpScrollingProgrammatically) return;

            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const scrollContainer = ui.help.content;
                    const containerRect = scrollContainer.getBoundingClientRect();
                    const triggerY = containerRect.top + 180;

                    let currentId = 'faq-help';
                    const contactSection = document.getElementById('contact-support');
                    if (contactSection) {
                        const contactRect = contactSection.getBoundingClientRect();
                        const isNearBottom = scrollContainer.scrollTop + scrollContainer.clientHeight >= scrollContainer.scrollHeight - 40;
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
        Object.keys(ui.views).forEach(key => {
            const v = ui.views[key];
            if (v) {
                v.classList.add('hidden', 'opacity-0', 'translate-y-10');
                v.classList.remove('opacity-100', 'translate-y-0');
            }
        });

        const target = ui.views[viewName];
        if (target) {
            target.classList.remove('hidden');
            setTimeout(() => {
                target.classList.remove('opacity-0', 'translate-y-10');
                target.classList.add('opacity-100', 'translate-y-0');
            }, 50);
        }

        if (updateHistory) {
            const hash = viewName === 'landing' ? '#login' : `#${viewName}`;
            history.pushState({ view: viewName }, '', hash);
        }

        // Nav Logic
        if (viewName === 'landing') {
            if (clearForm) {
                clearLoginInputs();
                clearErrors();
            }
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

            // Hide Hamburger on Login Page
            // Only show Help Center button on DESKTOP (XL)
            // Only show Help Center button on DESKTOP (XL)
            ui.btns.entryHelp.forEach(b => {
                if (b && b.id === 'entryHelpCenterBtn') {
                    // Reset inline style so CSS classes (hidden xl:flex) take over
                    b.style.display = '';
                    // DO NOT remove 'hidden' class here, let Media Query handle it
                } else if (b) {
                    b.style.display = '';
                }
            });

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

            // Hamburger visibility: ONLY in Help View on Mobile
            if (ui.help.mobileNavBtn) {
                const isMobileHelp = (viewName === 'help'); // CSS xl:hidden handles desktop hide
                ui.help.mobileNavBtn.style.display = isMobileHelp ? '' : 'none';
                ui.help.mobileNavBtn.classList.toggle('hidden', !isMobileHelp);
            }

            // Hide help buttons when in Help or reCAPTCHA
            ui.btns.entryHelp.forEach(b => {
                if (b && b.id === 'entryHelpCenterBtn') {
                    b.style.display = 'none';
                    b.classList.add('hidden');
                }
            });

            // Hide help buttons when in Help or reCAPTCHA
            ui.btns.entryHelp.forEach(b => { if (b) b.style.display = 'none'; });
            
            if (viewName === 'help') {
                clearLoginInputs();
                clearErrors();
                ui.nav.title.innerText = "Help Center";
                renderHelpCategories();
            }
        }
    }

    window.onpopstate = (e) => {
        const view = e.state?.view || 'landing';
        switchView(view, false);
    };

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
        const account = matchedUser ? {
            password: String(matchedUser.password || buildManagedUserPassword(matchedUser)),
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
            const inp = formType === 'modal' ? ui.inputs.modalPass : ui.inputs.id; // Corrected ID reference
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
        if (account.password !== pass) {
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

        sessionStorage.setItem('sigma_session_start_ts', Date.now().toString());

        sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({
            id: matchedUser.uid || matchedUser.id || '',
            role: matchedUser.role || account.role,
            firstName: extractedFn,
            lastName: extractedLn,
            email: matchedUser.email || '',
            avatar: matchedUser.avatar || '',
            permissions: matchedUser.permissions || {}
        }));
        window.location.href = account.redirect;
    }

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
    document.getElementById('backToLoginLogo')?.addEventListener('click', (e) => { e.preventDefault(); switchView('landing'); });

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

    // Start view
    const hashView = window.location.hash.replace('#', '') || 'landing';
    const finalStart = (hashView === 'help' || hashView === 'landing') ? hashView : 'landing';
    switchView(finalStart, false);

});
