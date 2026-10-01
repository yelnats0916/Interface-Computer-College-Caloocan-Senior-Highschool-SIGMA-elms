/**
 * Quiz Creator & Authoring Tool
 * Interface Computer College - Sigma ELMS
 */

const QUIZ_STORAGE_KEY = 'sigma_quiz_storage';
// crash-recovery / autosave session — scoped per user so one user's draft
// never bleeds into another user's editor session
function _getQuizSessionKey() {
    try {
        const rawActive = localStorage.getItem('sigma_active_user') ||
                          localStorage.getItem('sigma-logged-in-user') ||
                          localStorage.getItem('currentUser');
        if (rawActive) {
            const u = JSON.parse(rawActive);
            const uid = u?.id || u?.username || u?.email || null;
            if (uid) return `sigma_quiz_creator_session_${uid}`;
        }
    } catch(e) {}
    return 'sigma_quiz_creator_session'; // fallback (guest / unauthenticated)
}

let currentQuizId = null;
let quizMode = 'create'; // 'create' | 'edit' | 'customize'
let questions = [];
let activeQuestionIndex = 0;
const MAX_QUIZ_QUESTIONS = 100;

const getStoredQuizLibrary = function () {
    if (typeof window.getStoredQuizLibrary === 'function') {
        const res = window.getStoredQuizLibrary();
        if (Array.isArray(res) && res.length > 0) return res;
    }
    const candidateKeys = [QUIZ_STORAGE_KEY, 'sigma-quiz-storage-library', 'quizLibrary', 'sigma_quizzes_data', 'sigma_quizzes', 'quizzes', 'sigma_teacher_quizzes'];
    for (const k of candidateKeys) {
        try {
            const list = window.getStoredJson ? window.getStoredJson(k, []) : null;
            if (Array.isArray(list) && list.length > 0) {
                return list.filter(q => q && !String(q.id).startsWith('quiz-seed-'));
            }
            const raw = localStorage.getItem(k);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed.filter(q => q && !String(q.id).startsWith('quiz-seed-'));
                }
            }
        } catch (e) { }
    }
    return [];
};

const saveStoredQuizLibrary = function (lib) {
    if (typeof window.saveStoredQuizLibrary === 'function') {
        return window.saveStoredQuizLibrary(lib);
    }
    const cleanList = Array.isArray(lib) ? lib.filter(q => q && !String(q.id).startsWith('quiz-seed-')) : [];
    return window.saveStoredJson ? window.saveStoredJson(QUIZ_STORAGE_KEY, cleanList) : false;
};

var escapeHtml = window.escapeHtml || function (str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
};

function initUserAvatar() {
    try {
        const calNumber = document.getElementById('calendar-date-number');
        if (calNumber) {
            calNumber.textContent = new Date().getDate();
        }

        let activeUser = null;
        const rawActive = localStorage.getItem('sigma_active_user') || localStorage.getItem('sigma-logged-in-user') || localStorage.getItem('currentUser');
        if (rawActive) {
            try { activeUser = JSON.parse(rawActive); } catch(e){}
        }
        if (!activeUser) {
            const rawUsers = localStorage.getItem('sigma-admin-users');
            if (rawUsers) {
                try {
                    const users = JSON.parse(rawUsers);
                    activeUser = users.find(u => u.role === 'Master Admin' || u.type === 'MASTER ADMIN' || u.role === 'Teacher') || users[0];
                } catch(e){}
            }
        }

        const avatarImg = document.getElementById('header-avatar-img');
        const placeholder = document.getElementById('header-avatar-placeholder');
        const avatarSrc = activeUser?.avatar || activeUser?.profileImage || activeUser?.image || localStorage.getItem('userAvatar');

        if (avatarSrc && avatarImg && placeholder) {
            avatarImg.src = avatarSrc;
            avatarImg.classList.remove('hidden');
            placeholder.classList.add('hidden');
        }
    } catch (e) {}
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.updateGlobalSYDisplay === 'function') {
        window.updateGlobalSYDisplay();
    }
    initUserAvatar();
    initQuizCreator();
});

let currentQuizTitle = 'Custom Quiz';
let currentQuizDesc = '';
let currentQuizIcon = 'fa-bolt-lightning';
let currentQuizColor = '#FFD000';
let currentQuizCode = null;

// ─── Autosave / crash-recovery helpers ────────────────────────────────────────

function _autoGenCode(id) {
    const digits = String(id || Date.now()).replace(/[^0-9]/g, '').slice(-4) ||
                   String(Math.floor(1000 + Math.random() * 9000));
    return `#QZ-${digits.padStart(4, '0')}`;
}

function saveSessionSnapshot() {
    if (window._isDeletingQuiz) return;
    if (!hasMeaningfulQuestions || !hasMeaningfulQuestions()) return;
    try {
        const code  = currentQuizCode || _autoGenCode(currentQuizId || Date.now());
        const title = (currentQuizTitle &&
                       currentQuizTitle !== 'Custom Quiz' &&
                       currentQuizTitle !== 'Untitled Quiz')
            ? currentQuizTitle
            : code.replace(/^#/, ''); // use code as title when user never named the quiz
        localStorage.setItem(_getQuizSessionKey(), JSON.stringify({
            id:        currentQuizId,
            code:      code,
            title:     title,
            desc:      currentQuizDesc  || '',
            icon:      currentQuizIcon  || 'fa-bolt-lightning',
            color:     currentQuizColor || '#FFD000',
            questions: questions,
            savedAt:   Date.now()
        }));
    } catch(e) {}
}

function _saveBeforeExit() {
    if (window._isDeletingQuiz) return;
    if (typeof hasMeaningfulQuestions !== 'function' || !hasMeaningfulQuestions()) return;
    if (typeof window.hasUnsavedQuizChanges === 'function' && !window.hasUnsavedQuizChanges()) {
        // User already saved (or hasn't modified) this quiz — do NOT touch library or convert to draft!
        return;
    }
    // 1. Write session snapshot so a refresh can restore state
    saveSessionSnapshot();
    // 2. Synchronously upsert a draft entry in the quiz library ONLY IF the quiz is not already published
    try {
        const library = getStoredQuizLibrary();
        const code  = currentQuizCode || _autoGenCode(currentQuizId || Date.now());
        const title = (currentQuizTitle &&
                       currentQuizTitle !== 'Custom Quiz' &&
                       currentQuizTitle !== 'Untitled Quiz')
            ? currentQuizTitle
            : code.replace(/^#/, '');

        // Resolve active user
        const activeUser = window.getQuizActiveUser ? window.getQuizActiveUser() : null;
        const authorId = activeUser ? String(activeUser.id || activeUser.uid || '0000000') : '0000000';
        const authorName = activeUser?.fullName || `${activeUser?.firstName || ''} ${activeUser?.lastName || ''}`.trim() || activeUser?.name || 'Stanley Garcia';
        const authorRole = activeUser ? (window.normalizeQuizRole ? window.normalizeQuizRole(activeUser.role) : (String(activeUser.role || '').toLowerCase().includes('teach') ? 'Teacher' : 'Admin')) : 'Admin';
        const totalPoints = (questions || []).reduce((acc, q) => acc + (parseInt(q.points) || 0), 0);

        let savedId = currentQuizId;
        if (savedId) {
            const idx = library.findIndex(q => q.id === savedId);
            if (idx !== -1) {
                // If this quiz is already published / saved, NEVER degrade it to a draft on exit!
                if (library[idx].status === 'published' && !library[idx].isDraft) {
                    return;
                }
                library[idx].code           = code;
                library[idx].title          = title;
                library[idx].questionsCount = (questions || []).length;
                library[idx].totalPoints    = totalPoints;
                library[idx].status         = 'draft';
                library[idx].isDraft        = true;
                library[idx].isNew          = false;
                library[idx].createdTimestamp = Date.now();
                library[idx].icon           = currentQuizIcon  || library[idx].icon;
                library[idx].color          = currentQuizColor || library[idx].color;
                library[idx].authorId       = library[idx].authorId || authorId;
                library[idx].authorName     = (library[idx].authorName && library[idx].authorName !== 'You' && library[idx].authorName !== 'Self') ? library[idx].authorName : authorName;
                library[idx].authorRole     = library[idx].authorRole || authorRole;
                library[idx].questions      = JSON.parse(JSON.stringify(questions || []));
            } else {
                savedId = null; // entry removed; fall through to create new
            }
        }
        if (!savedId) {
            savedId = currentQuizId || ('quiz-' + Date.now());
            currentQuizId = savedId;
            const newCode = code || _autoGenCode(savedId);
            currentQuizCode = newCode;
            library.unshift({
                id: savedId, code: newCode, title,
                desc: currentQuizDesc || '',
                subject: 'General',
                questionsCount: (questions || []).length,
                totalPoints,
                createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                createdTimestamp: Date.now(),
                isNew: false,
                authorId, authorName, authorRole,
                status: 'draft', isDraft: true,
                icon: currentQuizIcon  || 'fa-bolt-lightning',
                color: currentQuizColor || '#FFD000',
                source: 'manual',
                questions: JSON.parse(JSON.stringify(questions || []))
            });
        }
        saveStoredQuizLibrary(library);
        // ── Server storage mode: also persist to MySQL ────────────────────
        if (window.SIGMA_USE_SERVER_STORAGE && typeof window.saveQuizToServer === 'function') {
            const entry = library.find(q => q.id === (savedId || currentQuizId));
            if (entry) window.saveQuizToServer(entry);
        }
    } catch(e) {}
}

// ─── End autosave helpers ──────────────────────────────────────────────────────

function initQuizCreator() {
    try {
        const raw = localStorage.getItem(QUIZ_STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.some(q => q && String(q.id).startsWith('quiz-seed-'))) {
                const cleaned = parsed.filter(q => q && !String(q.id).startsWith('quiz-seed-'));
                localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(cleaned));
                localStorage.setItem('sigma-quiz-storage-library', JSON.stringify(cleaned));
            }
        }
    } catch (e) {}

    const urlParams = new URLSearchParams(window.location.search);
    const isExplicitNew = urlParams.get('new') === '1' || urlParams.get('mode') === 'create';
    quizMode = urlParams.get('mode') || (isExplicitNew ? 'create' : null);
    let targetId = urlParams.get('id');

    const titleHeading = document.getElementById('page-quiz-title-heading');

    if (isExplicitNew) {
        localStorage.removeItem('sigma_active_quiz_creator_id');
        try {
            localStorage.removeItem(_getQuizSessionKey());
        } catch(e){}
        targetId = null;
        quizMode = 'create';
    }

    if (quizMode === 'edit' && targetId) {
        const library = getStoredQuizLibrary();
        const quiz = library.find(q => q.id === targetId);
        if (quiz) {
            currentQuizId = quiz.id;
            currentQuizCode = quiz.code || ('#QZ-' + (String(quiz.id || '').replace(/[^0-9]/g, '').slice(-4) || String(Math.floor(1000 + Math.random() * 9000)).padStart(4, '0')));
            currentQuizTitle = quiz.title || 'Untitled Quiz';
            currentQuizDesc = quiz.desc || '';
            currentQuizIcon = quiz.icon || 'fa-bolt-lightning';
            currentQuizColor = quiz.color || '#FFD000';
            if (titleHeading) titleHeading.textContent = 'Edit Quiz';
            window.updateNavBarQuizTitle(currentQuizTitle);
            questions = JSON.parse(JSON.stringify(quiz.questions || []));
            questions.forEach(q => {
                if (q.points === undefined || q.points === null || isNaN(parseInt(q.points))) {
                    q.points = 0;
                } else {
                    q.points = parseInt(q.points);
                }
            });
            localStorage.setItem('sigma_active_quiz_creator_id', quiz.id);
        }
    } else if (quizMode === 'customize' && targetId) {
        const library = getStoredQuizLibrary();
        const quiz = library.find(q => q.id === targetId);
        if (quiz) {
            currentQuizId = null; // Save as new
            currentQuizCode = null; // Generate new code on save
            currentQuizTitle = `${quiz.title || 'Quiz'} (Customized)`;
            currentQuizDesc = quiz.desc || '';
            currentQuizIcon = quiz.icon || 'fa-bolt-lightning';
            currentQuizColor = quiz.color || '#FFD000';
            if (titleHeading) titleHeading.textContent = 'Customize Quiz';
            window.updateNavBarQuizTitle(currentQuizTitle);
            questions = JSON.parse(JSON.stringify(quiz.questions || []));
            questions.forEach(q => {
                if (q.points === undefined || q.points === null || isNaN(parseInt(q.points))) {
                    q.points = 0;
                } else {
                    q.points = parseInt(q.points);
                }
            });
        }
    } else {
        // Fresh blank quiz
        currentQuizId    = null;
        currentQuizCode  = null;
        currentQuizTitle = urlParams.get('title') || 'Custom Quiz';
        currentQuizDesc  = urlParams.get('desc')  || '';
        if (typeof window.randomizeSaveQuizIcon === 'function') {
            window.randomizeSaveQuizIcon();
        }
        if (titleHeading) titleHeading.textContent = 'Create Quiz';
        window.updateNavBarQuizTitle(currentQuizTitle !== 'Custom Quiz' ? currentQuizTitle : '');
        questions = [];
    }

    renderQuestions();
    updateStats();
    if (typeof window.recordInitialQuizSnapshot === 'function') {
        window.recordInitialQuizSnapshot();
    }

    // Register exit-time autosave listeners (only once)
    if (!window._quizExitListenersRegistered) {
        window._quizExitListenersRegistered = true;
        window.addEventListener('beforeunload', _saveBeforeExit);
        window.addEventListener('pagehide',     _saveBeforeExit);
    }
}

window.updateNavBarQuizTitle = function (title) {
    const navBadge = document.getElementById('nav-quiz-title-badge');
    const cleanTitle = (title || '').trim();

    if (navBadge) {
        if (cleanTitle && cleanTitle !== 'Custom Quiz' && cleanTitle !== 'Untitled Quiz') {
            navBadge.textContent = cleanTitle;
            navBadge.classList.remove('hidden');
        } else {
            navBadge.classList.add('hidden');
        }
    }

    if (cleanTitle && cleanTitle !== 'Custom Quiz') {
        document.title = `${cleanTitle} - Quiz Creator - Sigma`;
    }
};

window.quizGeneralImages = window.quizGeneralImages || [];

window.triggerAddImage = function () {
    const input = document.getElementById('quiz-image-file-input');
    if (input) {
        input.value = '';
        input.click();
    }
};

window.handleImageUpload = function (event) {
    const files = Array.from(event.target?.files || []);
    if (files.length === 0) return;

    let loadedCount = 0;
    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = function (e) {
            window.quizGeneralImages.push({
                id: 'gimg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
                src: e.target.result,
                title: ''
            });
            loadedCount++;
            if (loadedCount === files.length) {
                window.renderQuizGeneralImages();
            }
        };
        reader.readAsDataURL(file);
    });
};

window.removeQuizGeneralImage = function (gIdx) {
    if (window.quizGeneralImages && window.quizGeneralImages[gIdx]) {
        window.quizGeneralImages.splice(gIdx, 1);
        window.renderQuizGeneralImages();
    }
};

window.changeQuizGeneralImage = function (gIdx, event) {
    const file = event.target?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        if (window.quizGeneralImages && window.quizGeneralImages[gIdx]) {
            window.quizGeneralImages[gIdx].src = e.target.result;
            window.renderQuizGeneralImages();
        }
    };
    reader.readAsDataURL(file);
};

window.renderQuizGeneralImages = function () {
    const container = document.getElementById('quiz-banner-images-list');
    if (!container) return;
    if (!window.quizGeneralImages || window.quizGeneralImages.length === 0) {
        container.innerHTML = '';
        return;
    }

    const escapeFn = window.escapeHtml || function (s) { return s || ''; };

    container.innerHTML = window.quizGeneralImages.map((gImg, gIdx) => `
        <div class="quiz-general-image-panel w-full bg-white rounded-2xl border border-slate-300 standard-panel-shadow p-6 md:p-7 space-y-3 animate-in fade-in duration-150 flex flex-col items-center">
            <!-- Banner Title / Caption Input (Same fixed width: max-w-[560px]) -->
            <div class="w-full max-w-[560px]">
                <input type="text" placeholder="Image Title (Optional)"
                    maxlength="150"
                    value="${escapeFn(gImg.title || '')}"
                    oninput="window.quizGeneralImages[${gIdx}].title = this.value;"
                    class="w-full bg-slate-50 border-b-2 border-black/35 hover:bg-slate-100 hover:border-black/60 focus:bg-slate-100 focus:border-black px-4 py-3 min-h-[46px] text-sm font-semibold text-black outline-none placeholder:text-black-fade placeholder:font-normal placeholder:opacity-80 transition-all rounded-t-lg">
            </div>

            <!-- Fixed-Size Black Background Container (Exact same dimensions: max-w-[560px] h-[260px] sm:h-[300px] md:h-[320px]) -->
            <div onclick="window.openImageFullscreen('${escapeFn(gImg.src)}', '${escapeFn(gImg.title || '').replace(/'/g, "\\'")}')"
                class="quiz-general-image-box relative group/bannerimg w-full max-w-[560px] h-[260px] sm:h-[300px] md:h-[320px] rounded-2xl overflow-hidden bg-black border border-slate-300 flex items-center justify-center p-0 shadow-2xs cursor-zoom-in">
                <img src="${escapeFn(gImg.src)}" alt="${escapeFn(gImg.title || 'General Image')}" class="max-w-full max-h-full object-contain pointer-events-none">
                
                <!-- Top Left: Click to Enlarge Hint -->
                <div class="absolute top-3 left-3 z-10 opacity-0 group-hover/bannerimg:opacity-100 transition-opacity pointer-events-none">
                    <span class="px-2.5 py-1 rounded-xl bg-black/60 text-white text-[11px] font-semibold flex items-center gap-1.5 shadow-md backdrop-blur-xs">
                        <i class="fa-solid fa-expand text-[10px]"></i>
                        <span>Click to enlarge</span>
                    </span>
                </div>

                <!-- Top Right: Change & Remove Buttons -->
                <div class="absolute top-3 right-3 z-10 flex items-center gap-2 opacity-0 group-hover/bannerimg:opacity-100 transition-opacity" onclick="event.stopPropagation()">
                    <input type="file" id="change-gimg-file-${gIdx}" accept="image/*" class="hidden" onchange="window.changeQuizGeneralImage(${gIdx}, event)">
                    <!-- Change Image Button -->
                    <button type="button" onclick="document.getElementById('change-gimg-file-${gIdx}').click()"
                        class="px-3 py-1.5 rounded-xl bg-white/95 hover:bg-slate-100 text-black text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-md border border-slate-200/90 group/btn" title="Change Image">
                        <i class="fa-solid fa-arrow-up-from-bracket text-xs text-black"></i>
                        <span class="text-black">Change</span>
                    </button>
                    
                    <!-- Remove Image Button -->
                    <button type="button" onclick="window.removeQuizGeneralImage(${gIdx})"
                        class="px-3 py-1.5 rounded-xl bg-white/95 hover:bg-slate-100 text-black hover:text-red-600 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-md border border-slate-200/90 group/btn" title="Remove Image">
                        <i class="fa-solid fa-trash-can text-xs text-black group-hover/btn:text-red-600 transition-colors"></i>
                        <span class="transition-colors">Remove</span>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
};

window.toggleAddDropdown = function (forceState) {
    const menu = document.getElementById('add-question-menu');
    if (!menu) return;
    if (typeof forceState === 'boolean') {
        if (forceState) menu.classList.remove('hidden');
        else menu.classList.add('hidden');
    } else {
        menu.classList.toggle('hidden');
    }
};

document.addEventListener('click', (e) => {
    const wrap = document.getElementById('add-question-dropdown-wrap');
    if (wrap && !wrap.contains(e.target)) {
        window.toggleAddDropdown(false);
    }
});

window.selectActiveQuestion = function (idx) {
    if (idx >= 0 && idx < questions.length) {
        activeQuestionIndex = idx;
        window.activeAnswerKeyIndex = null;
        renderQuestions();
    }
};

window.addQuestion = function (type = 'Multiple Choice') {
    if (questions && questions.length >= MAX_QUIZ_QUESTIONS) {
        if (typeof window.openAskingPanel === 'function') {
            window.openAskingPanel({
                title: 'Question Limit Reached',
                message: `You have reached the maximum limit of ${MAX_QUIZ_QUESTIONS} questions. Cannot add more questions.`,
                type: 'warning'
            });
        } else {
            alert(`Maximum limit of ${MAX_QUIZ_QUESTIONS} questions reached.`);
        }
        return;
    }

    let newQ = {
        type: type,
        question: '',
        choices: type === 'Multiple Choice' ? ['', '', '', ''] : [],
        answer: '',
        items: type === 'Enumeration' ? ['', '', ''] : [],
        itemPoints: type === 'Enumeration' ? [0, 0, 0] : [],
        itemAlternatives: type === 'Enumeration' ? [[], [], []] : [],
        requiredCount: type === 'Enumeration' ? 3 : 0,
        pairs: type === 'Matching Type' ? [{ premise: '', target: '', points: 0 }, { premise: '', target: '', points: 0 }] : [],
        rubric: '',
        points: 0
    };
    questions.push(newQ);
    activeQuestionIndex = questions.length - 1;
    window.activeAnswerKeyIndex = null;
    window._justAddedNewQuestion = true;
    renderQuestions();
    updateStats();

    setTimeout(() => {
        const promptInput = document.getElementById(`question-prompt-input-${activeQuestionIndex}`);
        if (promptInput) {
            promptInput.focus();
            promptInput.select();
        }
    }, 50);
};

window.toggleEssayEvalMode = function (idx, mode) {
    if (!questions || !questions[idx]) return;
    if (questions[idx].evaluationMode === mode) {
        questions[idx].evaluationMode = '';
    } else {
        questions[idx].evaluationMode = mode;
    }
    renderQuestions();
};

window.duplicateQuestion = function (idx) {
    if (questions && questions.length >= MAX_QUIZ_QUESTIONS) {
        if (typeof window.openAskingPanel === 'function') {
            window.openAskingPanel({
                title: 'Question Limit Reached',
                message: `You have reached the maximum limit of ${MAX_QUIZ_QUESTIONS} questions. Cannot duplicate question.`,
                type: 'warning'
            });
        } else {
            alert(`Maximum limit of ${MAX_QUIZ_QUESTIONS} questions reached.`);
        }
        return;
    }

    if (questions[idx]) {
        const clone = JSON.parse(JSON.stringify(questions[idx]));
        questions.splice(idx + 1, 0, clone);
        activeQuestionIndex = idx + 1;
        window._justAddedNewQuestion = true;
        renderQuestions();
        updateStats();
    }
};

window.shuffleAllQuestions = function () {
    if (!questions || questions.length <= 1) return;

    const curActiveQ = questions[activeQuestionIndex];
    for (let i = questions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [questions[i], questions[j]] = [questions[j], questions[i]];
    }
    activeQuestionIndex = questions.indexOf(curActiveQ);
    if (activeQuestionIndex === -1) activeQuestionIndex = 0;

    renderQuestions();
    updateStats();
};

window.toggleQuestionShuffleChoices = function (idx) {
    if (questions[idx]) {
        questions[idx].shuffleChoices = !questions[idx].shuffleChoices;
        renderQuestions();
    }
};

window.handleQuestionImageUpload = function (event, idx) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        window.openAskingPanel({
            title: 'Invalid File Format',
            message: 'Please upload a valid image file (PNG, JPG, WebP).',
            type: 'warning'
        });
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        window.openAskingPanel({
            title: 'File Too Large',
            message: 'Image file size must be under 5MB.',
            type: 'warning'
        });
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        if (questions[idx]) {
            questions[idx].image = e.target.result;
            renderQuestions();
        }
    };
    reader.readAsDataURL(file);
};

window.removeQuestionImage = function (idx) {
    if (questions[idx]) {
        delete questions[idx].image;
        renderQuestions();
    }
};

window.activeAnswerKeyIndex = null;

window.toggleAnswerKey = function (idx) {
    if (window.activeAnswerKeyIndex === idx) {
        window.activeAnswerKeyIndex = null;
    } else {
        window.activeAnswerKeyIndex = idx;
    }
    renderQuestions();
    setTimeout(() => {
        const container = document.getElementById('active-question-container');
        if (!container) return;
        if (window.activeAnswerKeyIndex === idx) {
            const ptsInput = container.querySelector('#question-pts-input-' + idx);
            if (ptsInput) {
                ptsInput.focus();
                ptsInput.select();
            }
        }
    }, 50);
};

window.focusAnswerKey = window.toggleAnswerKey;

window.toggleQImageMenu = function (idx, forceState) {
    const dropdown = document.getElementById(`qimg-menu-dropdown-${idx}`);
    const btn = document.getElementById(`qimg-menu-btn-${idx}`);
    const wrap = document.getElementById(`qimg-menu-wrap-${idx}`);
    if (!dropdown) return;
    const isHidden = dropdown.classList.contains('hidden');
    const show = forceState !== undefined ? forceState : isHidden;

    document.querySelectorAll('[id^="qimg-menu-dropdown-"]').forEach(d => {
        if (d !== dropdown) d.classList.add('hidden');
    });
    document.querySelectorAll('[id^="qimg-menu-btn-"]').forEach(b => {
        if (b !== btn) {
            b.classList.remove('!text-[#FFD000]', '!bg-black/80');
            b.classList.add('text-white', 'bg-black/60');
        }
    });
    document.querySelectorAll('[id^="qimg-menu-wrap-"]').forEach(w => {
        if (w !== wrap) {
            w.classList.remove('!opacity-100');
        }
    });

    if (show) {
        dropdown.classList.remove('hidden');
        if (btn) {
            btn.classList.remove('text-white', 'bg-black/60');
            btn.classList.add('!text-[#FFD000]', '!bg-black/80');
        }
        if (wrap) {
            wrap.classList.add('!opacity-100');
        }
    } else {
        dropdown.classList.add('hidden');
        if (btn) {
            btn.classList.remove('!text-[#FFD000]', '!bg-black/80');
            btn.classList.add('text-white', 'bg-black/60');
        }
        if (wrap) {
            wrap.classList.remove('!opacity-100');
        }
    }
};

document.addEventListener('click', function (e) {
    if (!e.target.closest('[id^="qimg-menu-wrap-"]')) {
        document.querySelectorAll('[id^="qimg-menu-dropdown-"]').forEach(d => d.classList.add('hidden'));
        document.querySelectorAll('[id^="qimg-menu-btn-"]').forEach(b => {
            b.classList.remove('!text-[#FFD000]', '!bg-black/80');
            b.classList.add('text-white', 'bg-black/60');
        });
        document.querySelectorAll('[id^="qimg-menu-wrap-"]').forEach(w => {
            w.classList.remove('!opacity-100');
        });
    }
});

window.removeQuestion = function (idx) {
    questions.splice(idx, 1);
    if (activeQuestionIndex >= questions.length) {
        activeQuestionIndex = Math.max(0, questions.length - 1);
    }
    renderQuestions();
    updateStats();
};

window.updateQuestionType = function (idx, newType) {
    if (questions[idx]) {
        questions[idx].type = newType;
        questions[idx].answer = '';
        delete questions[idx].answerIndex;

        if (newType === 'Multiple Choice') {
            questions[idx].choices = ['', '', '', ''];
            questions[idx].items = [];
            questions[idx].pairs = [];
            questions[idx].answers = [];
        } else if (newType === 'True or False') {
            questions[idx].choices = [];
            questions[idx].items = [];
            questions[idx].pairs = [];
            questions[idx].answers = [];
        } else if (newType === 'Short Answer') {
            questions[idx].choices = [];
            questions[idx].items = [];
            questions[idx].pairs = [];
            questions[idx].answers = [''];
        } else if (newType === 'Enumeration') {
            questions[idx].choices = [];
            questions[idx].items = ['', '', ''];
            questions[idx].itemPoints = [0, 0, 0];
            questions[idx].itemAlternatives = [[], [], []];
            questions[idx].requiredCount = 3;
            questions[idx].pairs = [];
            questions[idx].answers = [];
            questions[idx].points = 0;
        } else if (newType === 'Matching Type') {
            questions[idx].choices = [];
            questions[idx].items = [];
            questions[idx].pairs = [{ premise: '', target: '', points: 0 }, { premise: '', target: '', points: 0 }];
            questions[idx].answers = [];
            questions[idx].points = 0;
        } else if (newType === 'Essay') {
            questions[idx].choices = [];
            questions[idx].items = [];
            questions[idx].pairs = [];
            questions[idx].answers = [];
        }

        if (window.previewUserAnswers) {
            delete window.previewUserAnswers[idx];
        }

        renderQuestions();
        updateStats();
    }
};

window.addChoice = function (qIdx) {
    if (questions[qIdx] && Array.isArray(questions[qIdx].choices)) {
        questions[qIdx].choices.push('');
        renderQuestions();
        setTimeout(() => {
            const textareas = document.querySelectorAll('#active-question-container .sigma-underline-item-textarea');
            if (textareas.length > 0) {
                const last = textareas[textareas.length - 1];
                last.focus();
            }
        }, 50);
    }
};

window.removeChoice = function (qIdx, cIdx) {
    if (questions[qIdx] && Array.isArray(questions[qIdx].choices)) {
        if (questions[qIdx].choices.length <= 2) {
            window.openAskingPanel({
                title: 'Minimum Options Required',
                message: 'Multiple choice questions require at least 2 options.',
                type: 'warning'
            });
            return;
        }
        const removedVal = questions[qIdx].choices[cIdx];
        if (questions[qIdx].answer === removedVal) {
            questions[qIdx].answer = null;
        }
        questions[qIdx].choices.splice(cIdx, 1);
        renderQuestions();
    }
};

window.addAcceptedAnswer = function (qIdx) {
    if (questions[qIdx]) {
        if (!Array.isArray(questions[qIdx].answers)) {
            questions[qIdx].answers = questions[qIdx].answer ? [questions[qIdx].answer] : [''];
        }
        questions[qIdx].answers.push('');
        renderQuestions();
        setTimeout(() => {
            const textareas = document.querySelectorAll('#active-question-container .sigma-underline-item-textarea');
            if (textareas.length > 0) {
                const last = textareas[textareas.length - 1];
                last.focus();
            }
        }, 50);
    }
};

window.removeAcceptedAnswer = function (qIdx, aIdx) {
    if (questions[qIdx] && Array.isArray(questions[qIdx].answers)) {
        if (questions[qIdx].answers.length <= 1) {
            questions[qIdx].answers = [''];
            questions[qIdx].answer = '';
            renderQuestions();
            return;
        }
        questions[qIdx].answers.splice(aIdx, 1);
        questions[qIdx].answer = questions[qIdx].answers[0] || '';
        renderQuestions();
    }
};

window.setCorrectAnswer = function (qIdx, value, choiceIdx) {
    if (questions[qIdx]) {
        const fallbackText = choiceIdx !== undefined ? ('Option ' + (choiceIdx + 1)) : '';
        const isCurrent = (questions[qIdx].answer === value && value !== '') ||
                          (choiceIdx !== undefined && questions[qIdx].answerIndex === choiceIdx) ||
                          (fallbackText && questions[qIdx].answer === fallbackText);

        if (isCurrent) {
            questions[qIdx].answer = '';
            delete questions[qIdx].answerIndex;
        } else {
            questions[qIdx].answer = value;
            if (choiceIdx !== undefined) {
                questions[qIdx].answerIndex = choiceIdx;
                if (questions[qIdx].choices && questions[qIdx].choices[choiceIdx] === '') {
                    questions[qIdx].choices[choiceIdx] = value;
                }
            } else {
                delete questions[qIdx].answerIndex;
            }
        }
        renderQuestions();
    }
};

window.updateEnumItemPoints = function (qIdx, iIdx, val) {
    if (!questions || !questions[qIdx] || !Array.isArray(questions[qIdx].items)) return;
    if (!Array.isArray(questions[qIdx].itemPoints)) {
        questions[qIdx].itemPoints = questions[qIdx].items.map(() => 1);
    }
    const pts = (!isNaN(parseInt(val)) && parseInt(val) >= 0) ? parseInt(val) : 0;
    questions[qIdx].itemPoints[iIdx] = pts;
    const total = questions[qIdx].itemPoints.reduce((sum, p) => sum + (parseInt(p) || 0), 0);
    questions[qIdx].points = total;
    if (typeof window.updateStats === 'function') window.updateStats();
    if (typeof window.updateThumbnailPoints === 'function') window.updateThumbnailPoints(qIdx);
    const activeBadge = document.getElementById(`active-question-points-badge-${qIdx}`);
    if (activeBadge) activeBadge.textContent = `${total} ${total === 1 ? 'Point' : 'Points'}`;
};

window.getEnumItemAcceptableAnswers = function (q, iIdx) {
    if (!q) return [];
    const item = Array.isArray(q.items) ? q.items[iIdx] : null;
    const mainText = typeof item === 'string' ? item : (item?.text || '');
    const alts = (Array.isArray(q.itemAlternatives) && Array.isArray(q.itemAlternatives[iIdx]))
        ? q.itemAlternatives[iIdx]
        : ((typeof item === 'object' && Array.isArray(item?.alternatives)) ? item.alternatives : []);
    const list = [mainText, ...alts].map(s => String(s || '').trim()).filter(Boolean);
    return Array.from(new Set(list));
};

window.addEnumAlternative = function (qIdx, iIdx) {
    if (!questions || !questions[qIdx]) return;
    if (!Array.isArray(questions[qIdx].itemAlternatives)) {
        questions[qIdx].itemAlternatives = (questions[qIdx].items || []).map(() => []);
    }
    while (questions[qIdx].itemAlternatives.length <= iIdx) {
        questions[qIdx].itemAlternatives.push([]);
    }
    if (!Array.isArray(questions[qIdx].itemAlternatives[iIdx])) {
        questions[qIdx].itemAlternatives[iIdx] = [];
    }
    questions[qIdx].itemAlternatives[iIdx].push('');
    renderQuestions();
    setTimeout(() => {
        const inputEl = document.getElementById(`enum-alt-input-${qIdx}-${iIdx}-${questions[qIdx].itemAlternatives[iIdx].length - 1}`);
        if (inputEl) {
            inputEl.focus();
            inputEl.select();
        }
    }, 50);
};

window.removeEnumAlternative = function (qIdx, iIdx, altIdx) {
    if (!questions || !questions[qIdx]) return;
    if (Array.isArray(questions[qIdx].itemAlternatives) && Array.isArray(questions[qIdx].itemAlternatives[iIdx])) {
        questions[qIdx].itemAlternatives[iIdx].splice(altIdx, 1);
        renderQuestions();
    }
};

window.updateEnumAlternative = function (qIdx, iIdx, altIdx, val) {
    if (!questions || !questions[qIdx]) return;
    if (!Array.isArray(questions[qIdx].itemAlternatives)) {
        questions[qIdx].itemAlternatives = (questions[qIdx].items || []).map(() => []);
    }
    while (questions[qIdx].itemAlternatives.length <= iIdx) {
        questions[qIdx].itemAlternatives.push([]);
    }
    if (!Array.isArray(questions[qIdx].itemAlternatives[iIdx])) {
        questions[qIdx].itemAlternatives[iIdx] = [];
    }
    questions[qIdx].itemAlternatives[iIdx][altIdx] = val;
};

window.addEnumItem = function (qIdx) {
    if (questions[qIdx]) {
        if (!Array.isArray(questions[qIdx].items)) questions[qIdx].items = [];
        if (!Array.isArray(questions[qIdx].itemPoints)) questions[qIdx].itemPoints = questions[qIdx].items.map(() => 0);
        if (!Array.isArray(questions[qIdx].itemAlternatives)) questions[qIdx].itemAlternatives = questions[qIdx].items.map(() => []);
        questions[qIdx].items.push('');
        questions[qIdx].itemPoints.push(0);
        questions[qIdx].itemAlternatives.push([]);
        questions[qIdx].points = questions[qIdx].itemPoints.reduce((sum, p) => sum + (parseInt(p) || 0), 0);
        renderQuestions();
        updateStats();
        setTimeout(() => {
            const textareas = document.querySelectorAll('#active-question-container .sigma-underline-item-textarea');
            if (textareas.length > 0) {
                const last = textareas[textareas.length - 1];
                last.focus();
                last.select();
            }
        }, 50);
    }
};

window.removeEnumItem = function (qIdx, iIdx) {
    if (questions[qIdx] && Array.isArray(questions[qIdx].items)) {
        if (questions[qIdx].items.length <= 1) {
            window.openAskingPanel({
                title: 'Minimum Items Required',
                message: 'Enumeration questions require at least 1 item slot.',
                type: 'warning'
            });
            return;
        }
        questions[qIdx].items.splice(iIdx, 1);
        if (Array.isArray(questions[qIdx].itemPoints)) {
            questions[qIdx].itemPoints.splice(iIdx, 1);
        }
        if (Array.isArray(questions[qIdx].itemAlternatives)) {
            questions[qIdx].itemAlternatives.splice(iIdx, 1);
        }
        questions[qIdx].points = (questions[qIdx].itemPoints || []).reduce((sum, p) => sum + (parseInt(p) || 0), 0);
        renderQuestions();
        updateStats();
    }
};

window.addEnumSlot = function (qIdx) {
    if (questions[qIdx]) {
        const curCount = Math.max(1, parseInt(questions[qIdx].requiredCount) || (Array.isArray(questions[qIdx].items) ? questions[qIdx].items.length : 3));
        questions[qIdx].requiredCount = curCount + 1;
        renderQuestions();
        updateStats();
    }
};

window.removeEnumSlot = function (qIdx, sIdx) {
    if (questions[qIdx]) {
        const curCount = Math.max(1, parseInt(questions[qIdx].requiredCount) || (Array.isArray(questions[qIdx].items) ? questions[qIdx].items.length : 3));
        if (curCount <= 1) {
            window.openAskingPanel({
                title: 'Minimum Options Required',
                message: 'Enumeration questions require at least 1 answer slot.',
                type: 'warning'
            });
            return;
        }
        questions[qIdx].requiredCount = curCount - 1;
        renderQuestions();
        updateStats();
    }
};

window.swapEnumItemWithNext = function (qIdx, iIdx) {
    if (questions[qIdx] && Array.isArray(questions[qIdx].items) && questions[qIdx].items.length > 1) {
        const nextIdx = (iIdx + 1) % questions[qIdx].items.length;
        const temp = questions[qIdx].items[iIdx];
        questions[qIdx].items[iIdx] = questions[qIdx].items[nextIdx];
        questions[qIdx].items[nextIdx] = temp;
        if (Array.isArray(questions[qIdx].itemPoints)) {
            const tempPts = questions[qIdx].itemPoints[iIdx];
            questions[qIdx].itemPoints[iIdx] = questions[qIdx].itemPoints[nextIdx];
            questions[qIdx].itemPoints[nextIdx] = tempPts;
        }
        if (Array.isArray(questions[qIdx].itemAlternatives)) {
            const tempAlts = questions[qIdx].itemAlternatives[iIdx];
            questions[qIdx].itemAlternatives[iIdx] = questions[qIdx].itemAlternatives[nextIdx];
            questions[qIdx].itemAlternatives[nextIdx] = tempAlts;
        }
        renderQuestions();
    }
};

window.handleEnumDragStart = function (e, qIdx, iIdx) {
    e.dataTransfer.setData('text/plain', JSON.stringify({ qIdx, iIdx, type: 'enum' }));
    e.dataTransfer.effectAllowed = 'move';
};

window.handleEnumDrop = function (e, targetQIdx, targetIIdx) {
    e.preventDefault();
    try {
        const data = JSON.parse(e.dataTransfer.getData('text/plain'));
        if (data.type === 'enum' && data.qIdx === targetQIdx && data.iIdx !== targetIIdx) {
            const arr = questions[targetQIdx].items;
            const moved = arr.splice(data.iIdx, 1)[0];
            arr.splice(targetIIdx, 0, moved);
            if (Array.isArray(questions[targetQIdx].itemPoints)) {
                const movedPts = questions[targetQIdx].itemPoints.splice(data.iIdx, 1)[0];
                questions[targetQIdx].itemPoints.splice(targetIIdx, 0, movedPts);
            }
            if (Array.isArray(questions[targetQIdx].itemAlternatives)) {
                const movedAlts = questions[targetQIdx].itemAlternatives.splice(data.iIdx, 1)[0];
                questions[targetQIdx].itemAlternatives.splice(targetIIdx, 0, movedAlts);
            }
            renderQuestions();
        }
    } catch (err) {}
};

window.handleEnumDragOver = function (e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
};

window.updateMatchingPairPoints = function (qIdx, pIdx, val) {
    if (!questions || !questions[qIdx] || !Array.isArray(questions[qIdx].pairs) || !questions[qIdx].pairs[pIdx]) return;
    const pts = (!isNaN(parseInt(val)) && parseInt(val) >= 0) ? parseInt(val) : 0;
    questions[qIdx].pairs[pIdx].points = pts;
    const total = questions[qIdx].pairs.reduce((sum, p) => sum + (parseInt(p.points) || 0), 0);
    questions[qIdx].points = total;
    if (typeof window.updateStats === 'function') window.updateStats();
    if (typeof window.updateThumbnailPoints === 'function') window.updateThumbnailPoints(qIdx);
    const activeBadge = document.getElementById(`active-question-points-badge-${qIdx}`);
    if (activeBadge) activeBadge.textContent = `${total} ${total === 1 ? 'Point' : 'Points'}`;
};

window.addMatchingPair = function (qIdx) {
    if (questions[qIdx]) {
        if (!Array.isArray(questions[qIdx].pairs)) questions[qIdx].pairs = [];
        questions[qIdx].pairs.push({ premise: '', target: '', points: 0 });
        questions[qIdx].points = questions[qIdx].pairs.reduce((sum, p) => sum + (parseInt(p.points) || 0), 0);
        renderQuestions();
        updateStats();
        setTimeout(() => {
            const textareas = document.querySelectorAll('#active-question-container .sigma-underline-item-textarea');
            if (textareas.length > 0) {
                const last = textareas[textareas.length - 1];
                last.focus();
                last.select();
            }
        }, 50);
    }
};

window.removeMatchingPair = function (qIdx, pIdx) {
    if (questions[qIdx] && Array.isArray(questions[qIdx].pairs)) {
        if (questions[qIdx].pairs.length <= 1) {
            window.openAskingPanel({
                title: 'Minimum Pairs Required',
                message: 'Matching type questions require at least 1 pair.',
                type: 'warning'
            });
            return;
        }
        questions[qIdx].pairs.splice(pIdx, 1);
        questions[qIdx].points = questions[qIdx].pairs.reduce((sum, p) => sum + (parseInt(p.points) || 0), 0);
        renderQuestions();
        updateStats();
    }
};

window.handleChoiceDragStart = function (e, qIdx, cIdx) {
    e.dataTransfer.setData('text/plain', JSON.stringify({ qIdx, cIdx }));
    e.dataTransfer.effectAllowed = 'move';
};

window.handleChoiceDrop = function (e, targetQIdx, targetCIdx) {
    e.preventDefault();
    try {
        const data = JSON.parse(e.dataTransfer.getData('text/plain'));
        if (data.qIdx === targetQIdx && data.cIdx !== targetCIdx) {
            const arr = questions[targetQIdx].choices;
            const moved = arr.splice(data.cIdx, 1)[0];
            arr.splice(targetCIdx, 0, moved);
            renderQuestions();
        }
    } catch (err) {}
};

window.handleChoiceDragOver = function (e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
};

window.handleQuestionDragStart = function (e, qIdx) {
    e.dataTransfer.setData('text/plain', JSON.stringify({ qIdx, type: 'question' }));
    e.dataTransfer.effectAllowed = 'move';
    const card = e.currentTarget;
    if (card) {
        setTimeout(() => {
            card.classList.add('opacity-40', 'scale-[0.98]', 'border-dashed', 'border-slate-400');
        }, 0);
    }
};

window.handleQuestionDragOver = function (e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const card = e.currentTarget;
    if (card && !card.classList.contains('border-[#FFD000]')) {
        card.classList.add('border-[#FFD000]', 'bg-amber-50/30');
    }
};

window.handleQuestionDragLeave = function (e) {
    const card = e.currentTarget;
    if (card) {
        card.classList.remove('border-[#FFD000]', 'bg-amber-50/30');
    }
};

window.handleQuestionDragEnd = function (e) {
    const card = e.currentTarget;
    if (card) {
        card.classList.remove('opacity-40', 'scale-[0.98]', 'border-dashed', 'border-slate-400');
    }
    document.querySelectorAll('#questions-thumbnails-container > div').forEach(el => {
        el.classList.remove('border-[#FFD000]', 'bg-amber-50/30', 'opacity-40', 'scale-[0.98]', 'border-dashed', 'border-slate-400');
    });
};

window.handleQuestionDrop = function (e, targetQIdx) {
    e.preventDefault();
    window.handleQuestionDragEnd(e);
    try {
        const data = JSON.parse(e.dataTransfer.getData('text/plain'));
        if (data && data.type === 'question' && typeof data.qIdx === 'number' && data.qIdx !== targetQIdx) {
            const moved = questions.splice(data.qIdx, 1)[0];
            questions.splice(targetQIdx, 0, moved);
            activeQuestionIndex = targetQIdx;
            renderQuestions();
        }
    } catch (err) {}
};

window.swapChoiceWithNext = function (qIdx, cIdx) {
    if (questions[qIdx] && Array.isArray(questions[qIdx].choices) && questions[qIdx].choices.length > 1) {
        const nextIdx = (cIdx + 1) % questions[qIdx].choices.length;
        const temp = questions[qIdx].choices[cIdx];
        questions[qIdx].choices[cIdx] = questions[qIdx].choices[nextIdx];
        questions[qIdx].choices[nextIdx] = temp;
        if (questions[qIdx].answerIndex === cIdx) {
            questions[qIdx].answerIndex = nextIdx;
        } else if (questions[qIdx].answerIndex === nextIdx) {
            questions[qIdx].answerIndex = cIdx;
        }
        renderQuestions();
    }
};

window.swapMatchingTargetWithNext = function (qIdx, pIdx) {
    if (questions[qIdx] && Array.isArray(questions[qIdx].pairs) && questions[qIdx].pairs.length > 1) {
        const nextIdx = (pIdx + 1) % questions[qIdx].pairs.length;
        const temp = questions[qIdx].pairs[pIdx].target;
        questions[qIdx].pairs[pIdx].target = questions[qIdx].pairs[nextIdx].target;
        questions[qIdx].pairs[nextIdx].target = temp;
        renderQuestions();
    }
};

window.handlePairDragStart = function (e, qIdx, pIdx) {
    e.dataTransfer.setData('text/plain', JSON.stringify({ qIdx, pIdx, type: 'pair' }));
    e.dataTransfer.effectAllowed = 'move';
};

window.handlePairDrop = function (e, targetQIdx, targetPIdx) {
    e.preventDefault();
    try {
        const data = JSON.parse(e.dataTransfer.getData('text/plain'));
        if (data.type === 'pair' && data.qIdx === targetQIdx && data.pIdx !== targetPIdx) {
            const arr = questions[targetQIdx].pairs;
            const moved = arr.splice(data.pIdx, 1)[0];
            arr.splice(targetPIdx, 0, moved);
            renderQuestions();
        }
    } catch (err) {}
};

window.handlePairDragOver = function (e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
};

function renderQuestions() {
    const mainContainer = document.getElementById('active-question-container');
    const thumbContainer = document.getElementById('questions-thumbnails-container');
    const sidebarBadge = document.getElementById('sidebar-question-count-badge');
    const isNewlyAdded = !!window._justAddedNewQuestion;
    window._justAddedNewQuestion = false;

    if (sidebarBadge) {
        sidebarBadge.textContent = `${questions.length} ${questions.length === 1 ? 'item' : 'items'}`;
    }

    // 1. Render Left Main Active Question Editor
    if (mainContainer) {
        if (questions.length === 0) {
            mainContainer.innerHTML = `
                <div class="active-question-card quiz-empty-question-state bg-white rounded-2xl border border-slate-200/90 standard-panel-shadow p-8 sm:p-12 text-center text-black-fade font-medium">
                    <i class="fa-solid fa-list-check text-3xl mb-3 text-black-fade block"></i>
                    <p class="text-sm font-bold text-black">No Questions Added Yet</p>
                    <p class="text-xs text-black-fade mt-1">Click <button type="button" onclick="window.addQuestion('Multiple Choice')" class="text-emerald-700 font-bold hover:underline cursor-pointer">+ Add Question</button> in the toolbar above to start creating your assessment.</p>
                </div>
            `;
        } else {
            if (activeQuestionIndex >= questions.length) {
                activeQuestionIndex = questions.length - 1;
            }
            const idx = activeQuestionIndex;
            const q = questions[idx];
            const isAnswerKeyOpen = window.activeAnswerKeyIndex === idx;

            if (window.SigmaQuizComponents && typeof window.SigmaQuizComponents.renderQuestionCard === 'function') {
                mainContainer.innerHTML = window.SigmaQuizComponents.renderQuestionCard(q, idx, isAnswerKeyOpen, isNewlyAdded);
            } else {
                mainContainer.innerHTML = `<div class="p-8 text-center text-slate-500 font-medium">Loading question...</div>`;
            }

            if (isNewlyAdded) {
                const cardEl = document.getElementById('active-question-card-inner');
                if (cardEl) {
                    setTimeout(() => {
                        cardEl.classList.remove('ring-2', 'ring-[#15803d]/30', 'ring-offset-2');
                    }, 650);
                }
            }

            // Auto-adjust all textareas height on card load
            mainContainer.querySelectorAll('textarea').forEach(ta => {
                if (window.autoExpandTextarea) window.autoExpandTextarea(ta, 6);
            });
        }
    }

    // 2. Render Right Smaller Scale Questions Overview List (Question Deck)
    if (thumbContainer) {
        const countBadge = document.getElementById('sidebar-question-count-badge');
        const totalCount = questions.length;
        if (countBadge) {
            countBadge.textContent = `${totalCount} / ${MAX_QUIZ_QUESTIONS} items`;
        }

        if (isNewlyAdded && countBadge) {
            countBadge.classList.remove('deck-badge-bump');
            void countBadge.offsetWidth;
            countBadge.classList.add('deck-badge-bump');
            setTimeout(() => countBadge.classList.remove('deck-badge-bump'), 400);
        }

        if (totalCount === 0) {
            thumbContainer.innerHTML = `
                <div class="h-64 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-200 rounded-2xl select-none animate-in fade-in duration-200">
                    <div class="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-black-fade mb-3 shadow-2xs">
                        <i class="fa-solid fa-layer-group text-lg text-black-fade"></i>
                    </div>
                    <p class="text-xs font-semibold text-black mb-1">No other questions</p>
                    <p class="text-[11px] text-black-fade max-w-[200px]">Added questions will appear here for quick switching.</p>
                </div>
            `;
            if (deckSortable) {
                deckSortable.destroy();
                deckSortable = null;
            }
        } else {
            thumbContainer.innerHTML = questions.map((q, idx) => {
                const isThisCardNew = isNewlyAdded && idx === questions.length - 1;
                const isActive = (idx === activeQuestionIndex);
                if (window.SigmaQuizComponents && typeof window.SigmaQuizComponents.renderOverviewThumbnail === 'function') {
                    return window.SigmaQuizComponents.renderOverviewThumbnail(q, idx, isActive, isThisCardNew);
                }
                return `<div class="p-2 border rounded-xl">${idx + 1}</div>`;
            }).join('');
            initQuestionDeckSortable();

            if (isNewlyAdded) {
                setTimeout(() => {
                    thumbContainer.scrollTo({ top: thumbContainer.scrollHeight, behavior: 'smooth' });
                }, 50);
            }
        }

        const shuffleBtn = document.getElementById('deck-shuffle-btn');
        if (shuffleBtn) {
            if (questions.length > 1) {
                shuffleBtn.classList.remove('hidden');
            } else {
                shuffleBtn.classList.add('hidden');
            }
        }
    }

    updateStats();
}

let deckSortable = null;
function initQuestionDeckSortable() {
    const container = document.getElementById('questions-thumbnails-container');
    if (!container || typeof Sortable === 'undefined') return;
    if (deckSortable) {
        deckSortable.destroy();
        deckSortable = null;
    }

    const cards = container.querySelectorAll('.deck-thumbnail-card');
    if (cards.length <= 1) return;

    deckSortable = new Sortable(container, {
        animation: 150,
        handle: '.deck-drag-handle',
        draggable: '.deck-thumbnail-card',
        dataIdAttr: 'data-q-idx',
        ghostClass: 'sortable-ghost',
        dragClass: 'sortable-drag-original',
        chosenClass: 'sortable-chosen',
        forceFallback: true,
        fallbackClass: 'sortable-drag-clone',
        fallbackOnBody: true,
        fallbackTolerance: 4,
        swapThreshold: 0.35,
        scroll: true,
        bubbleScroll: true,
        scrollSensitivity: 100,
        scrollSpeed: 20,
        onChoose: (evt) => {
            document.body.classList.add('sortable-is-dragging');
            document.body.style.cursor = 'grabbing';
            const rect = evt.item.getBoundingClientRect();
            evt.item.dataset.dragWidth = `${Math.round(rect.width)}`;
            evt.item.dataset.dragHeight = `${Math.round(rect.height)}`;
        },
        onStart: (evt) => {
            document.body.classList.add('sortable-is-dragging');
            document.body.style.cursor = 'grabbing';
            requestAnimationFrame(() => {
                const dragEl = document.querySelector('body > .sortable-drag-clone');
                if (!dragEl) return;

                const width = parseInt(evt.item.dataset.dragWidth, 10)
                    || Math.round(evt.item.getBoundingClientRect().width)
                    || 300;
                const height = parseInt(evt.item.dataset.dragHeight, 10)
                    || Math.round(evt.item.getBoundingClientRect().height)
                    || 80;

                dragEl.style.width = `${width}px`;
                dragEl.style.height = `${height}px`;
                dragEl.style.minWidth = `${width}px`;
                dragEl.style.minHeight = `${height}px`;
                dragEl.style.maxWidth = `${width}px`;
                dragEl.style.maxHeight = `${height}px`;
                dragEl.style.boxSizing = 'border-box';
                dragEl.style.opacity = '1';
                dragEl.style.zIndex = '99999';
                dragEl.style.borderRadius = '16px';
                dragEl.style.boxShadow = '0 24px 64px rgba(0,0,0,0.28)';
                dragEl.style.pointerEvents = 'none';
                dragEl.style.cursor = 'grabbing';
                dragEl.style.transition = 'none';
            });
        },
        onEnd: (evt) => {
            document.body.classList.remove('sortable-is-dragging');
            document.body.style.cursor = '';
            if (evt.oldIndex === undefined || evt.newIndex === undefined || evt.oldIndex === evt.newIndex) return;

            const oldRealIdx = evt.oldIndex;
            const newRealIdx = evt.newIndex;

            const movedQ = questions.splice(oldRealIdx, 1)[0];
            questions.splice(newRealIdx, 0, movedQ);

            if (activeQuestionIndex === oldRealIdx) {
                activeQuestionIndex = newRealIdx;
            } else if (oldRealIdx < activeQuestionIndex && newRealIdx >= activeQuestionIndex) {
                activeQuestionIndex--;
            } else if (oldRealIdx > activeQuestionIndex && newRealIdx <= activeQuestionIndex) {
                activeQuestionIndex++;
            }

            renderQuestions();
            updateStats();
        },
        onCancel: () => {
            document.body.classList.remove('sortable-is-dragging');
            document.body.style.cursor = '';
        }
    });
}

window.syncThumbPrompt = function (idx, text) {
    const el = document.getElementById(`thumb-prompt-${idx}`);
    if (el) {
        const val = (text !== undefined && text !== null) ? String(text) : '';
        if (val.trim()) {
            el.textContent = val;
            el.className = 'text-xs text-black font-normal line-clamp-2 leading-relaxed break-words min-w-0';
        } else {
            el.textContent = '(Untitled question prompt...)';
            el.className = 'text-xs text-black-fade font-normal italic line-clamp-2 leading-relaxed break-words min-w-0';
        }
    }
    if (typeof window.syncQuizSaveButtonState === 'function') {
        window.syncQuizSaveButtonState();
    }
};

let initialQuizSavedSnapshot = '';

window.getQuizContentSnapshot = function () {
    return JSON.stringify({
        title: (currentQuizTitle || '').trim(),
        desc: (currentQuizDesc || '').trim(),
        images: (window.quizGeneralImages || []).map(img => ({ id: img.id, title: (img.title || '').trim(), src: img.src })),
        questions: (questions || []).map(q => ({
            type: q.type,
            question: (q.question || '').trim(),
            choices: Array.isArray(q.choices) ? q.choices.map(c => (c || '').trim()) : [],
            pairs: Array.isArray(q.pairs) ? q.pairs.map(p => ({ premise: (p.premise || p.left || '').trim(), target: (p.target || p.right || '').trim(), points: parseInt(p.points) || 1 })) : [],
            items: Array.isArray(q.items) ? q.items.map(item => (typeof item === 'string' ? item : (item?.text || '')).trim()) : [],
            itemPoints: Array.isArray(q.itemPoints) ? q.itemPoints.map(p => parseInt(p) || 1) : [],
            itemAlternatives: Array.isArray(q.itemAlternatives) ? q.itemAlternatives.map(alts => Array.isArray(alts) ? alts.map(a => String(a || '').trim()) : []) : [],
            requiredCount: (q.requiredCount !== undefined && !isNaN(parseInt(q.requiredCount))) ? parseInt(q.requiredCount) : (Array.isArray(q.items) ? q.items.length : 3),
            answer: q.answer !== undefined && q.answer !== null ? String(q.answer).trim() : '',
            answers: Array.isArray(q.answers) ? q.answers.map(a => String(a || '').trim()) : [],
            answerIndex: (q.answerIndex !== undefined && q.answerIndex !== null && !isNaN(parseInt(q.answerIndex))) ? parseInt(q.answerIndex) : null,
            points: parseInt(q.points) || 0,
            rubric: (q.rubric || '').trim()
        }))
    });
};

window.recordInitialQuizSnapshot = function () {
    initialQuizSavedSnapshot = window.getQuizContentSnapshot();
    window.syncQuizSaveButtonState();
};

window.hasMeaningfulQuestions = function () {
    if (!questions || questions.length === 0) return false;
    return questions.some(q => {
        const hasPrompt = (q.question && q.question.trim().length > 0);
        const hasChoices = Array.isArray(q.choices) && q.choices.some(c => c && c.trim().length > 0);
        const hasPairs = Array.isArray(q.pairs) && q.pairs.some(p => (p.left && p.left.trim()) || (p.right && p.right.trim()));
        const hasEnum = Array.isArray(q.enumItems) && q.enumItems.some(item => item && item.trim().length > 0);
        const hasAnswer = (q.answer !== undefined && q.answer !== null && String(q.answer).trim().length > 0);
        const hasRubric = (q.rubric && q.rubric.trim().length > 0);
        return hasPrompt || hasChoices || hasPairs || hasEnum || hasAnswer || hasRubric;
    });
};

window.hasUnsavedQuizChanges = function () {
    if (!initialQuizSavedSnapshot) return true;
    const currentSnap = window.getQuizContentSnapshot();
    return currentSnap !== initialQuizSavedSnapshot;
};

window.syncQuizSaveButtonState = function () {
    const saveBtn = document.getElementById('save-quiz-main-btn');
    const dropdownTrigger = document.getElementById('save-quiz-dropdown-trigger');
    const draftBtn = document.getElementById('dropdown-save-draft-btn');
    const pdfBtn = document.getElementById('dropdown-download-pdf-btn');

    const hasContent = (typeof window.hasMeaningfulQuestions === 'function') ? window.hasMeaningfulQuestions() : (Array.isArray(questions) && questions.length > 0);
    // Keep Save Quiz unlocked whether there are new changes or not
    const canSave = hasContent;

    if (saveBtn) {
        saveBtn.classList.remove('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
        if (!canSave) {
            saveBtn.title = 'Add questions to save quiz';
        } else {
            saveBtn.title = 'Save quiz to library';
        }
    }

    if (draftBtn) {
        if (!canSave) {
            draftBtn.classList.add('opacity-40', 'cursor-not-allowed', 'pointer-events-none', 'text-black/40');
            draftBtn.classList.remove('hover:bg-slate-200/70', 'text-black');
        } else {
            draftBtn.classList.remove('opacity-40', 'cursor-not-allowed', 'pointer-events-none', 'text-black/40');
            draftBtn.classList.add('hover:bg-slate-200/70', 'text-black');
        }
    }

    if (pdfBtn) {
        if (!hasContent) {
            pdfBtn.classList.add('opacity-40', 'cursor-not-allowed', 'pointer-events-none', 'text-black/40');
            pdfBtn.classList.remove('hover:bg-slate-200/70', 'text-black');
        } else {
            pdfBtn.classList.remove('opacity-40', 'cursor-not-allowed', 'pointer-events-none', 'text-black/40');
            pdfBtn.classList.add('hover:bg-slate-200/70', 'text-black');
        }
    }
};

window.updateStats = function () {
    const qCount = questions.length;
    const totalPts = questions.reduce((acc, q) => {
        const p = parseInt(q.points);
        return acc + (!isNaN(p) && p >= 0 ? p : 0);
    }, 0);

    const statQ = document.getElementById('quiz-stat-questions');
    const statP = document.getElementById('quiz-stat-points');

    if (statQ) statQ.innerHTML = `<i class="fa-solid fa-list-check text-xs text-black"></i> <span class="whitespace-nowrap text-black font-semibold">${qCount} / ${MAX_QUIZ_QUESTIONS} Questions</span>`;
    if (statP) statP.innerHTML = `<i class="fa-solid fa-star text-[#FFD000] text-xs"></i> <span class="whitespace-nowrap text-black font-semibold">${totalPts} ${totalPts === 1 ? 'Point' : 'Points'}</span>`;

    window.syncQuizSaveButtonState();
};

window.updateThumbnailPoints = function (idx) {
    if (!questions || !questions[idx]) return;
    const pts = (!isNaN(parseInt(questions[idx].points)) && parseInt(questions[idx].points) >= 0) ? parseInt(questions[idx].points) : 0;
    const el = document.getElementById(`thumb-points-val-${idx}`);
    if (el) el.textContent = pts;
    const activeBadge = document.getElementById(`active-question-points-badge-${idx}`);
    if (activeBadge) activeBadge.textContent = `${pts} ${pts === 1 ? 'Point' : 'Points'}`;
};

let pendingSaveIsDraft = false;
let pendingSaveStayInStorage = false;

const QUIZ_AVAILABLE_ICONS = [
    { icon: 'fa-bolt-lightning', label: 'Lightning / Quiz' },
    { icon: 'fa-pen-nib', label: 'Pen / Written' },
    { icon: 'fa-code', label: 'Code / Programming' },
    { icon: 'fa-laptop-code', label: 'Computer Science' },
    { icon: 'fa-brain', label: 'Brain / Logic' },
    { icon: 'fa-book-open', label: 'Book / Literature' },
    { icon: 'fa-graduation-cap', label: 'Academic / Exam' },
    { icon: 'fa-flask', label: 'Science / Chemistry' },
    { icon: 'fa-calculator', label: 'Math / Computing' },
    { icon: 'fa-atom', label: 'Physics / Science' },
    { icon: 'fa-palette', label: 'UI / Design' },
    { icon: 'fa-lightbulb', label: 'Innovation / Ideas' }
];

const QUIZ_AVAILABLE_COLORS = [
    { hex: '#FFD000', label: 'Amber Yellow' },
    { hex: '#15803d', label: 'Emerald Green' },
    { hex: '#2563eb', label: 'Royal Blue' },
    { hex: '#7c3aed', label: 'Purple' },
    { hex: '#ea580c', label: 'Orange' },
    { hex: '#e11d48', label: 'Rose Red' },
    { hex: '#0d9488', label: 'Teal' },
    { hex: '#334155', label: 'Slate' }
];

window.randomizeSaveQuizIcon = function () {
    const randomIconObj = QUIZ_AVAILABLE_ICONS[Math.floor(Math.random() * QUIZ_AVAILABLE_ICONS.length)];
    const randomColorObj = QUIZ_AVAILABLE_COLORS[Math.floor(Math.random() * QUIZ_AVAILABLE_COLORS.length)];
    currentQuizIcon = randomIconObj.icon;
    currentQuizColor = randomColorObj.hex;
    window.renderSaveQuizIconPicker();
};

window.renderSaveQuizIconPicker = function () {
    const iconPreview = document.getElementById('save-quiz-icon-preview');
    const iconDisplay = document.getElementById('save-quiz-icon-display');
    const iconOptionsWrap = document.getElementById('save-quiz-icon-options');
    const colorOptionsWrap = document.getElementById('save-quiz-color-options');

    if (iconPreview) {
        iconPreview.style.backgroundColor = currentQuizColor;
    }
    if (iconDisplay) {
        iconDisplay.className = `fa-solid ${currentQuizIcon}`;
    }

    if (iconOptionsWrap) {
        iconOptionsWrap.innerHTML = QUIZ_AVAILABLE_ICONS.map(item => {
            const isSelected = item.icon === currentQuizIcon;
            return `
                <button type="button" onclick="window.selectSaveQuizIcon('${item.icon}')"
                    class="w-8 h-8 rounded-lg flex items-center justify-center text-xs transition-all cursor-pointer shrink-0 ${isSelected ? 'bg-black text-white shadow-xs scale-105 ring-2 ring-black/30' : 'bg-white text-black hover:bg-slate-200/80 border border-slate-200'}"
                    title="${item.label}">
                    <i class="fa-solid ${item.icon}"></i>
                </button>
            `;
        }).join('');
    }

    if (colorOptionsWrap) {
        colorOptionsWrap.innerHTML = QUIZ_AVAILABLE_COLORS.map(item => {
            const isSelected = item.hex === currentQuizColor;
            return `
                <button type="button" onclick="window.selectSaveQuizColor('${item.hex}')"
                    class="w-6 h-6 rounded-full transition-all cursor-pointer shrink-0 border-2 ${isSelected ? 'border-black scale-110 shadow-xs ring-2 ring-black/20' : 'border-white hover:scale-105 shadow-2xs'}"
                    style="background-color: ${item.hex};"
                    title="${item.label}">
                </button>
            `;
        }).join('');
    }
};

window.selectSaveQuizIcon = function (icon) {
    currentQuizIcon = icon;
    window.renderSaveQuizIconPicker();
};

window.selectSaveQuizColor = function (color) {
    currentQuizColor = color;
    window.renderSaveQuizIconPicker();
};

window.promptSaveQuiz = function (isDraft = false, stayInStorage = false) {
    if (!window.hasMeaningfulQuestions()) {
        if (typeof window.openAskingPanel === 'function') {
            window.openAskingPanel({
                title: 'Empty Quiz',
                message: 'There are no questions in this quiz. Please add at least 1 question with content before saving or drafting.',
                type: 'warning'
            });
        }
        return;
    }

    // Answer key validation — skip for drafts and Essay type
    if (!isDraft) {
        const missingAnswerKeyNums = [];
        questions.forEach(function (q, i) {
            const type = q.type || 'Multiple Choice';
            if (type === 'Essay') return; // rubric-based, no hard answer key required

            let hasKey = false;
            if (type === 'Multiple Choice' || type === 'True or False') {
                hasKey = q.answer !== undefined && q.answer !== null && String(q.answer).trim().length > 0;
            } else if (type === 'Short Answer') {
                hasKey = Array.isArray(q.answers)
                    ? q.answers.some(function (a) { return a && String(a).trim().length > 0; })
                    : (q.answer !== undefined && q.answer !== null && String(q.answer).trim().length > 0);
            } else if (type === 'Enumeration') {
                hasKey = Array.isArray(q.items) && q.items.some(function (it) { return it && String(it).trim().length > 0; });
            } else if (type === 'Matching Type') {
                hasKey = Array.isArray(q.pairs) && q.pairs.length > 0 &&
                    q.pairs.every(function (p) { return p.premise && String(p.premise).trim().length > 0 && p.target && String(p.target).trim().length > 0; });
            } else {
                // Fallback for any other type — check answer field
                hasKey = q.answer !== undefined && q.answer !== null && String(q.answer).trim().length > 0;
            }

            if (!hasKey) missingAnswerKeyNums.push(i + 1);
        });

        if (missingAnswerKeyNums.length > 0) {
            if (typeof window.openAskingPanel === 'function') {
                const qList = missingAnswerKeyNums.length <= 5
                    ? 'Question' + (missingAnswerKeyNums.length > 1 ? 's ' : ' ') + missingAnswerKeyNums.join(', ')
                    : missingAnswerKeyNums.length + ' questions';
                window.openAskingPanel({
                    title: 'Answer Key Required',
                    message: qList + (missingAnswerKeyNums.length > 1 ? ' are' : ' is') + ' missing an answer key. Please set the correct answer for every question before saving.',
                    type: 'warning'
                });
            }
            return;
        }

        // Points validation — notify user if total points is 0 or any question has 0 / missing points
        const zeroPointsQuestionNums = [];
        questions.forEach(function (q, i) {
            const p = parseInt(q.points);
            if (isNaN(p) || p <= 0) {
                zeroPointsQuestionNums.push(i + 1);
            }
        });

        if (zeroPointsQuestionNums.length > 0) {
            if (typeof window.openAskingPanel === 'function') {
                const qList = zeroPointsQuestionNums.length <= 5
                    ? 'Question' + (zeroPointsQuestionNums.length > 1 ? 's ' : ' ') + zeroPointsQuestionNums.join(', ')
                    : zeroPointsQuestionNums.length + ' questions';
                const msg = (zeroPointsQuestionNums.length === questions.length)
                    ? 'All questions currently have 0 points. Please assign valid point values (at least 1 point) to your questions before saving.'
                    : `${qList} ${zeroPointsQuestionNums.length > 1 ? 'have' : 'has'} 0 or missing points. Please set valid points for all questions before saving.`;
                window.openAskingPanel({
                    title: 'Points Required',
                    message: msg,
                    type: 'warning'
                });
            }
            return;
        }
    }
    pendingSaveIsDraft = isDraft;
    pendingSaveStayInStorage = stayInStorage;

    const modal = document.getElementById('save-quiz-metadata-modal');
    const titleInput = document.getElementById('save-quiz-title-input');
    const descInput = document.getElementById('save-quiz-desc-input');
    const modalTitle = document.getElementById('save-metadata-title');
    const modalDescHint = document.getElementById('save-metadata-desc-hint');
    const iconWrap = document.getElementById('save-metadata-icon-wrap');
    const iconEl = document.getElementById('save-metadata-icon');
    const btnIconEl = document.getElementById('save-modal-btn-icon');
    const btnLabelEl = document.getElementById('save-modal-btn-label');

    // Smart default title
    let defaultTitle = currentQuizTitle;
    if (!defaultTitle || defaultTitle === 'Custom Quiz' || defaultTitle === 'Untitled Quiz') {
        if (questions[0]?.question && questions[0].question.trim()) {
            defaultTitle = questions[0].question.slice(0, 40).trim() + ' Quiz';
        } else {
            defaultTitle = 'Custom Quiz';
        }
    }

    if (titleInput) titleInput.value = defaultTitle;
    if (descInput) descInput.value = currentQuizDesc || '';

    window.updateSaveQuizCharCounts();

    if (!currentQuizIcon || !currentQuizColor) {
        window.randomizeSaveQuizIcon();
    } else {
        window.renderSaveQuizIconPicker();
    }

    initialSaveModalSnapshot = {
        title: (titleInput?.value || '').trim(),
        desc: (descInput?.value || '').trim(),
        icon: currentQuizIcon,
        color: currentQuizColor
    };

    if (isDraft) {
        if (modalTitle) modalTitle.textContent = 'Save as Draft';
        if (modalDescHint) modalDescHint.textContent = 'Save your in-progress quiz to continue editing later';
        if (iconWrap) iconWrap.className = 'w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0';
        if (iconEl) iconEl.className = 'fa-regular fa-floppy-disk text-base';
        if (btnIconEl) btnIconEl.className = 'fa-regular fa-floppy-disk text-xs';
        if (btnLabelEl) btnLabelEl.textContent = 'Save as Draft';
    } else {
        if (modalTitle) modalTitle.textContent = 'Save Quiz';
        if (modalDescHint) modalDescHint.textContent = 'Enter a title and description for your quiz';
        if (iconWrap) iconWrap.className = 'w-10 h-10 rounded-2xl bg-emerald-100 text-[#15803d] flex items-center justify-center shrink-0';
        if (iconEl) iconEl.className = 'fa-solid fa-check text-base';
        if (btnIconEl) btnIconEl.className = 'fa-solid fa-check text-xs';
        if (btnLabelEl) btnLabelEl.textContent = 'Save Quiz';
    }

    if (modal) {
        modal.classList.remove('hidden');
        syncBodyScrollLock();
        setTimeout(() => {
            if (titleInput) {
                titleInput.focus();
                titleInput.select();
            }
        }, 60);
    }
};

let initialSaveModalSnapshot = null;

window.updateSaveQuizCharCounts = function () {
    const titleInput = document.getElementById('save-quiz-title-input');
    const descInput = document.getElementById('save-quiz-desc-input');
    const titleCount = document.getElementById('save-quiz-title-count');
    const descCount = document.getElementById('save-quiz-desc-count');

    if (titleInput && titleCount) {
        const tLen = titleInput.value.length;
        titleCount.textContent = `${tLen} / 60`;
        if (tLen >= 55) {
            titleCount.className = 'text-[11px] font-bold text-amber-600';
        } else {
            titleCount.className = 'text-[11px] font-medium text-black-fade';
        }
    }

    if (descInput && descCount) {
        const dLen = descInput.value.length;
        descCount.textContent = `${dLen} / 150`;
        if (dLen >= 140) {
            descCount.className = 'text-[11px] font-bold text-amber-600';
        } else {
            descCount.className = 'text-[11px] font-medium text-black-fade';
        }
    }
};

window.closeSaveQuizModal = function (force = false) {
    if (!force && initialSaveModalSnapshot) {
        const titleInput = document.getElementById('save-quiz-title-input');
        const descInput = document.getElementById('save-quiz-desc-input');
        const curTitle = (titleInput?.value || '').trim();
        const curDesc = (descInput?.value || '').trim();

        const hasModalEdits = (curTitle !== initialSaveModalSnapshot.title) ||
                              (curDesc !== initialSaveModalSnapshot.desc) ||
                              (currentQuizIcon !== initialSaveModalSnapshot.icon) ||
                              (currentQuizColor !== initialSaveModalSnapshot.color);

        if (hasModalEdits) {
            if (typeof window.openAskingPanel === 'function') {
                window.openAskingPanel({
                    title: 'Discard Changes?',
                    message: 'You have entered changes to the title, description, or icon badge. Do you want to discard them and exit?',
                    type: 'warning',
                    confirmText: 'Discard & Exit',
                    cancelText: 'Keep Editing',
                    onConfirm: () => {
                        currentQuizIcon = initialSaveModalSnapshot.icon;
                        currentQuizColor = initialSaveModalSnapshot.color;
                        initialSaveModalSnapshot = null;
                        const modal = document.getElementById('save-quiz-metadata-modal');
                        if (modal) modal.classList.add('hidden');
                        syncBodyScrollLock();
                    }
                });
                return;
            }
        }
    }

    initialSaveModalSnapshot = null;
    const modal = document.getElementById('save-quiz-metadata-modal');
    if (modal) modal.classList.add('hidden');
    syncBodyScrollLock();
};

window.confirmSaveQuizFromModal = function () {
    const titleInput = document.getElementById('save-quiz-title-input');
    const descInput = document.getElementById('save-quiz-desc-input');

    const enteredTitle = (titleInput?.value || '').trim() || 'Custom Quiz';
    const enteredDesc = (descInput?.value || '').trim();

    currentQuizTitle = enteredTitle;
    currentQuizDesc = enteredDesc;


    initialSaveModalSnapshot = null;
    window.closeSaveQuizModal(true);
    window.executeSaveQuizToLibrary(pendingSaveStayInStorage, pendingSaveIsDraft);
};

let quizSaveToastTimeout = null;

window.showSaveQuizIndicator = function (state = 'saving', message = '', duration = 2800) {
    const toast = document.getElementById('quiz-save-toast');
    const spinner = document.getElementById('quiz-save-toast-spinner');
    const icon = document.getElementById('quiz-save-toast-icon');
    const text = document.getElementById('quiz-save-toast-text');

    if (!toast) return;

    if (quizSaveToastTimeout) {
        clearTimeout(quizSaveToastTimeout);
        quizSaveToastTimeout = null;
    }

    if (state === 'saving') {
        toast.className = 'fixed top-5 left-1/2 -translate-x-1/2 z-[3000] flex items-center gap-2.5 px-5 py-2.5 rounded-2xl shadow-2xl bg-white border border-slate-200 text-slate-900 font-[\'Inter\'] transition-all duration-200 pointer-events-none animate-in fade-in slide-in-from-top-3';
        if (spinner) spinner.classList.remove('hidden');
        if (icon) icon.className = 'hidden';
        if (text) text.textContent = message || 'Saving Quiz...';
    } else if (state === 'success') {
        toast.className = 'fixed top-5 left-1/2 -translate-x-1/2 z-[3000] flex items-center gap-2.5 px-5 py-2.5 rounded-2xl shadow-2xl bg-[#0f172a] text-white border border-slate-700 font-[\'Inter\'] transition-all duration-200 pointer-events-none animate-in fade-in slide-in-from-top-3';
        if (spinner) spinner.classList.add('hidden');
        if (icon) icon.className = 'fa-solid fa-circle-check text-emerald-400 text-sm';
        if (text) text.textContent = message || 'Saved successfully!';

        quizSaveToastTimeout = setTimeout(() => {
            toast.classList.add('hidden');
            toast.classList.remove('flex');
        }, duration);
    } else if (state === 'hide') {
        toast.classList.add('hidden');
        toast.classList.remove('flex');
    }
};

window.executeSaveQuizToLibrary = function (stayInStorage = false, isDraft = false) {
    const title = currentQuizTitle || (questions[0]?.question ? (questions[0].question.slice(0, 40) + ' Quiz') : 'Custom Quiz');
    const desc = currentQuizDesc || '';

    // Show instant saving loading indicator
    window.showSaveQuizIndicator('saving', isDraft ? 'Saving draft to your library...' : 'Saving quiz to library...');

    setTimeout(() => {
        const totalPoints = questions.reduce((acc, q) => acc + (parseInt(q.points) || 0), 0);
        const library = getStoredQuizLibrary();

        const activeUser = window.getQuizActiveUser ? window.getQuizActiveUser() : null;
        const authorId = activeUser ? String(activeUser.id || activeUser.uid || '0000000') : '0000000';
        const authorName = activeUser?.fullName || `${activeUser?.firstName || ''} ${activeUser?.lastName || ''}`.trim() || activeUser?.name || 'Stanley Garcia';
        const authorRole = activeUser ? (window.normalizeQuizRole ? window.normalizeQuizRole(activeUser.role) : (String(activeUser.role || '').toLowerCase().includes('teach') ? 'Teacher' : 'Admin')) : 'Admin';

        let savedQuizId = currentQuizId;

        if (savedQuizId) {
            const existingIdx = library.findIndex(q => q.id === savedQuizId);
            if (existingIdx !== -1) {
                let existingCode = library[existingIdx].code || currentQuizCode;
                if (!existingCode) {
                    const digits = String(savedQuizId).replace(/[^0-9]/g, '').slice(-4) || String(Math.floor(1000 + Math.random() * 9000));
                    existingCode = `#QZ-${digits.padStart(4, '0')}`;
                }
                library[existingIdx].code = existingCode;
                currentQuizCode = existingCode;
                library[existingIdx].title = title;
                library[existingIdx].desc = desc;
                library[existingIdx].questionsCount = questions.length;
                library[existingIdx].totalPoints = totalPoints;
                library[existingIdx].status = isDraft ? 'draft' : 'published';
                library[existingIdx].isDraft = !!isDraft;
                library[existingIdx].isNew = !isDraft; // Only published quizzes can be isNew
                library[existingIdx].createdTimestamp = Date.now();
                library[existingIdx].icon = currentQuizIcon;
                library[existingIdx].color = currentQuizColor;
                library[existingIdx].authorId = library[existingIdx].authorId || authorId;
                library[existingIdx].authorName = (library[existingIdx].authorName && library[existingIdx].authorName !== 'You' && library[existingIdx].authorName !== 'Self') ? library[existingIdx].authorName : authorName;
                library[existingIdx].authorRole = library[existingIdx].authorRole || authorRole;
                library[existingIdx].questions = JSON.parse(JSON.stringify(questions));
            } else {
                // ID not found — check if there's an existing entry with the same code (e.g., autosave draft)
                const codeToFind = currentQuizCode;
                const codeIdx = codeToFind ? library.findIndex(q => q.code && q.code === codeToFind) : -1;
                if (codeIdx !== -1) {
                    // Update the code-matched entry and adopt its id
                    savedQuizId = library[codeIdx].id;
                    currentQuizId = savedQuizId;
                    library[codeIdx].title = title;
                    library[codeIdx].desc = desc;
                    library[codeIdx].questionsCount = questions.length;
                    library[codeIdx].totalPoints = totalPoints;
                    library[codeIdx].status = isDraft ? 'draft' : 'published';
                    library[codeIdx].isDraft = !!isDraft;
                    library[codeIdx].isNew = !isDraft;
                    library[codeIdx].createdTimestamp = Date.now();
                    library[codeIdx].icon = currentQuizIcon;
                    library[codeIdx].color = currentQuizColor;
                    library[codeIdx].authorId = library[codeIdx].authorId || authorId;
                    library[codeIdx].authorName = (library[codeIdx].authorName && library[codeIdx].authorName !== 'You' && library[codeIdx].authorName !== 'Self') ? library[codeIdx].authorName : authorName;
                    library[codeIdx].authorRole = library[codeIdx].authorRole || authorRole;
                    library[codeIdx].questions = JSON.parse(JSON.stringify(questions));
                }
                // else: id was provided but not found and no code match — fall through to else branch below
                // (reset savedQuizId so the else branch runs)
                else { savedQuizId = null; }
            }
        }
        if (!savedQuizId) {
            savedQuizId = 'quiz-' + Date.now();
            let generatedCode = currentQuizCode;
            if (!generatedCode) {
                const digits = String(savedQuizId).replace(/[^0-9]/g, '').slice(-4) || String(Math.floor(1000 + Math.random() * 9000));
                generatedCode = `#QZ-${digits.padStart(4, '0')}`;
            }
            currentQuizCode = generatedCode;
            const newQuiz = {
                id: savedQuizId,
                code: generatedCode,
                title: title,
                desc: desc,
                subject: 'General',
                questionsCount: questions.length,
                totalPoints: totalPoints,
                createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                createdTimestamp: Date.now(),
                isNew: !isDraft, // Only published quizzes can be isNew
                authorId: authorId,
                authorName: authorName,
                authorRole: authorRole,
                status: isDraft ? 'draft' : 'published',
                isDraft: !!isDraft,
                icon: currentQuizIcon,
                color: currentQuizColor,
                source: 'manual',
                questions: JSON.parse(JSON.stringify(questions))
            };
            library.unshift(newQuiz);
            currentQuizId = savedQuizId;
        }

        currentQuizTitle = title;
        currentQuizDesc = desc;

        if (savedQuizId) {
            try {
                const url = new URL(window.location.href);
                url.searchParams.set('mode', 'edit');
                url.searchParams.set('id', savedQuizId);
                window.history.replaceState({ quizId: savedQuizId }, '', url.toString());
            } catch(e) {}
            localStorage.setItem('sigma_active_quiz_creator_id', savedQuizId);
        }

        saveStoredQuizLibrary(library);

        // Sync changes across all attached subject topics and materials
        if (typeof window.syncQuizUpdatesAcrossAllSubjectsAndMaterials === 'function') {
            window.syncQuizUpdatesAcrossAllSubjectsAndMaterials(savedQuizId, {
                title: title,
                desc: desc,
                totalPoints: totalPoints,
                questionsCount: questions.length,
                questions: questions,
                icon: currentQuizIcon,
                color: currentQuizColor,
                code: currentQuizCode
            });
        }

        // ── Server storage mode: also persist to MySQL ────────────────────
        if (window.SIGMA_USE_SERVER_STORAGE && typeof window.saveQuizToServer === 'function') {
            const entry = library.find(q => q.id === savedQuizId);
            if (entry) window.saveQuizToServer(entry);
        }
        saveSessionSnapshot();
        initialQuizSavedSnapshot = window.getQuizContentSnapshot();
        window.syncQuizSaveButtonState();

        // Broadcast storage change to other tabs and opener
        localStorage.setItem('sigma_pending_selected_quiz_id', savedQuizId);
        localStorage.setItem('sigma_quiz_updated', JSON.stringify({ id: savedQuizId, code: currentQuizCode, title, points: totalPoints, questionsCount: questions.length, timestamp: Date.now() }));
        localStorage.setItem('sigma_materials_broadcast', Date.now().toString());
        localStorage.setItem('sigma_storage_sync', Date.now().toString());
        localStorage.setItem('sigma_quiz_broadcast', Date.now().toString());
        try {
            window.dispatchEvent(new CustomEvent('sigma_quiz_updated', { detail: { quizId: savedQuizId, title, points: totalPoints, questionsCount: questions.length } }));
        } catch (e) {}

        // Notify opener tab if quiz creator was launched from an active admin modal
        if (window.opener && !window.opener.closed) {
            try {
                window.opener._quizStorageListCache = null;
                window.opener.selectedStorageQuizId = savedQuizId;
                if (window.opener.editingMaterialState) {
                    window.opener.editingMaterialState.selectedQuizId = savedQuizId;
                    window.opener.editingMaterialState.selectedQuizTitle = title;
                    window.opener.editingMaterialState.selectedQuizPoints = totalPoints;
                    window.opener.editingMaterialState.selectedQuizQuestions = questions.length;
                    window.opener.editingMaterialState.selectedQuizQuestionsCount = questions.length;
                    window.opener.editingMaterialState.icon = currentQuizIcon;
                    window.opener.editingMaterialState.color = currentQuizColor;
                }
                if (typeof window.opener.renderMaterialEditorForm === 'function') {
                    window.opener.renderMaterialEditorForm();
                }
                if (typeof window.opener.renderMaterialAttachedFilePanel === 'function') {
                    window.opener.renderMaterialAttachedFilePanel();
                }
                if (typeof window.opener.renderSubjectTopics === 'function') {
                    window.opener.renderSubjectTopics();
                }
                if (typeof window.opener.renderQuizStorageCards === 'function') {
                    window.opener.renderQuizStorageCards();
                }
                if (typeof window.opener.renderQuizStoragePickerContent === 'function') {
                    window.opener.renderQuizStoragePickerContent();
                }
                if (!stayInStorage && typeof window.opener.confirmSelectedStorageQuiz === 'function') {
                    window.opener.confirmSelectedStorageQuiz();
                }
            } catch (e) {}
        }

        window.showSaveQuizIndicator('success', isDraft ? 'Draft saved successfully!' : 'Quiz saved to library!');
    }, 400);
};

window.saveQuizToLibrary = function (stayInStorage = false, isDraft = false) {
    window.promptSaveQuiz(isDraft, stayInStorage);
};

window.handleCreateNewQuizFromDropdown = function () {
    window.open('quiz-creator.html?new=1', '_blank');
};

window.hasSearchedLibraryModal = false;
let libraryModalFilter = 'all';
window._libraryModalIsMyMode = false;
window._selectedLibraryModalQuizId = null;

window.selectQuizInLibraryModal = function (quizId, event) {
    if (event) event.stopPropagation();
    window._selectedLibraryModalQuizId = quizId;
    const container = document.getElementById('library-modal-quizzes-list');
    const prevScroll = container ? container.scrollTop : 0;
    const searchVal = document.getElementById('library-modal-search-input')?.value || '';
    window.renderLibraryModalQuizzes(searchVal);
    if (container && prevScroll) {
        container.scrollTop = prevScroll;
    }
};

window.confirmSelectedLibraryQuiz = function () {
    if (!window._selectedLibraryModalQuizId) return;
    window.loadQuizIntoEditor(window._selectedLibraryModalQuizId, false);
    window.closeQuizLibraryModal();
};

window.openQuizLibraryModal = function () {
    const modal = document.getElementById('open-quiz-library-modal');
    const searchInput = document.getElementById('library-modal-search-input');
    const clearBtn = document.getElementById('lib-search-clear-btn');
    const pills = document.getElementById('library-modal-filter-pills');
    const btnMy = document.getElementById('lib-filter-my-btn');
    const actionBtn = document.getElementById('lib-modal-action-btn');
    const actionText = document.getElementById('lib-modal-action-text');
    const actionIcon = document.getElementById('lib-modal-action-icon');

    // Default state: reset all filters, search, and selection
    libraryModalFilter = 'all';
    window.hasSearchedLibraryModal = false;
    window._libraryModalIsMyMode = false;
    window._selectedLibraryModalQuizId = null;
    window._libraryModalLimit = 10;

    if (actionBtn) {
        actionBtn.disabled = true;
        actionBtn.classList.add('opacity-50', 'cursor-not-allowed');
        actionBtn.classList.remove('cursor-pointer');
    }
    if (actionText) actionText.textContent = 'Load';
    if (actionIcon) actionIcon.className = 'fa-solid fa-folder-open text-xs';

    if (searchInput) {
        searchInput.value = '';
        searchInput.placeholder = window.innerWidth < 640 ? 'Search by quiz title...' : 'Search by quiz title or topic...';
    }
    if (clearBtn) clearBtn.classList.add('hidden');
    if (pills) pills.classList.remove('hidden');
    if (btnMy) {
        btnMy.className = 'w-9 h-9 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-black flex items-center justify-center cursor-pointer transition-colors shrink-0 shadow-2xs';
        btnMy.innerHTML = '<i class="fa-solid fa-folder-open text-xs text-black"></i>';
    }

    window.setLibraryModalFilter('all');
    if (modal) {
        modal.classList.remove('hidden');
        syncBodyScrollLock();
        setTimeout(() => {
            if (searchInput) searchInput.focus();
        }, 60);
    }
};

window.closeQuizLibraryModal = function () {
    const modal = document.getElementById('open-quiz-library-modal');
    if (modal) modal.classList.add('hidden');
    window._selectedLibraryModalQuizId = null;
    const actionBtn = document.getElementById('lib-modal-action-btn');
    if (actionBtn) {
        actionBtn.disabled = true;
        actionBtn.classList.add('opacity-50', 'cursor-not-allowed');
        actionBtn.classList.remove('cursor-pointer');
    }
    syncBodyScrollLock();
};

window.triggerLibraryModalSearch = function () {
    const searchInput = document.getElementById('library-modal-search-input');
    const q = searchInput ? searchInput.value.trim() : '';
    const pills = document.getElementById('library-modal-filter-pills');
    const clearBtn = document.getElementById('lib-search-clear-btn');
    if (clearBtn) clearBtn.classList.toggle('hidden', !q);

    window.hasSearchedLibraryModal = true;
    window._libraryModalLimit = 10;
    if (pills) pills.classList.remove('hidden');

    window.renderLibraryModalQuizzes(q);
};

window.clearLibraryModalSearch = function () {
    const searchInput = document.getElementById('library-modal-search-input');
    if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
    }
    const clearBtn = document.getElementById('lib-search-clear-btn');
    if (clearBtn) clearBtn.classList.add('hidden');

    window.hasSearchedLibraryModal = true;
    window._libraryModalLimit = 10;
    const pills = document.getElementById('library-modal-filter-pills');
    if (pills) pills.classList.remove('hidden');
    window.renderLibraryModalQuizzes('');
};

window.toggleLibraryMyStorageFilter = function () {
    window._libraryModalIsMyMode = !window._libraryModalIsMyMode;
    window._libraryModalLimit = 10;
    const searchInput = document.getElementById('library-modal-search-input');
    const clearBtn = document.getElementById('lib-search-clear-btn');
    const pills = document.getElementById('library-modal-filter-pills');
    const btnMy = document.getElementById('lib-filter-my-btn');

    if (window._libraryModalIsMyMode) {
        // Save search query before entering folder mode
        window._savedLibrarySearchBeforeMyMode = searchInput ? searchInput.value : '';
        if (searchInput) {
            searchInput.value = '';
            searchInput.placeholder = window.innerWidth < 640 ? 'Search my quizzes...' : 'Search my created quizzes by title or topic...';
        }
        if (clearBtn) clearBtn.classList.add('hidden');
        window.hasSearchedLibraryModal = true;
        libraryModalFilter = 'all';
        if (pills) pills.classList.remove('hidden');
        if (btnMy) {
            btnMy.className = 'w-9 h-9 rounded-xl border border-[#15803d] bg-[#15803d] text-white flex items-center justify-center cursor-pointer transition-colors shrink-0 shadow-2xs';
            btnMy.innerHTML = '<i class="fa-solid fa-folder-open text-xs text-white"></i>';
        }
        window.setLibraryModalFilter('all');
    } else {
        // Restore previous search query when folder mode is toggled off
        const restored = window._savedLibrarySearchBeforeMyMode || '';
        if (searchInput) {
            searchInput.value = restored;
            searchInput.placeholder = window.innerWidth < 640 ? 'Search by quiz title...' : 'Search by quiz title or topic...';
        }
        if (clearBtn) clearBtn.classList.toggle('hidden', !restored.trim());
        window.hasSearchedLibraryModal = Boolean(restored.trim());
        if (pills) {
            if (window.hasSearchedLibraryModal) {
                pills.classList.remove('hidden');
            } else {
                pills.classList.add('hidden');
            }
        }
        libraryModalFilter = 'all';
        if (btnMy) {
            btnMy.className = 'w-9 h-9 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-black flex items-center justify-center cursor-pointer transition-colors shrink-0 shadow-2xs';
            btnMy.innerHTML = '<i class="fa-solid fa-folder-open text-xs text-black"></i>';
        }
        window.renderLibraryModalQuizzes(restored);
    }
};

window.setLibraryModalFilter = function (filter) {
    libraryModalFilter = filter;
    window._libraryModalLimit = 10;
    const btnAll = document.getElementById('lib-filter-all');
    const btnRecent = document.getElementById('lib-filter-recent');
    const btnDraft = document.getElementById('lib-filter-draft');
    const btnAi = document.getElementById('lib-filter-ai');
    const btnManual = document.getElementById('lib-filter-manual');
    const btnMy = document.getElementById('lib-filter-my-btn');

    const updateChip = (btn, isMatch, iconType = null) => {
        if (!btn) return;
        if (isMatch) {
            btn.className = `quiz-storage-filter-chip shrink-0 whitespace-nowrap px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${iconType ? 'flex items-center gap-1 sm:gap-1.5' : ''} bg-[#15803d] text-white shadow-2xs`;
            if (iconType === 'ai') {
                const icon = btn.querySelector('i');
                if (icon) icon.className = 'fa-solid fa-bolt text-[10px] sm:text-xs text-white';
            } else if (iconType === 'draft') {
                const icon = btn.querySelector('i');
                if (icon) icon.className = 'fa-solid fa-file-lines text-[10px] sm:text-xs text-white';
            } else if (iconType === 'manual') {
                const icon = btn.querySelector('i');
                if (icon) icon.className = 'fa-solid fa-pen-nib text-[10px] sm:text-xs text-white';
            }
        } else {
            btn.className = `quiz-storage-filter-chip shrink-0 whitespace-nowrap px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${iconType ? 'flex items-center gap-1 sm:gap-1.5' : ''} bg-slate-100 text-black-fade hover:text-black hover:bg-slate-200/70`;
            if (iconType === 'ai') {
                const icon = btn.querySelector('i');
                if (icon) icon.className = 'fa-solid fa-bolt text-[10px] sm:text-xs text-black-fade';
            } else if (iconType === 'draft') {
                const icon = btn.querySelector('i');
                if (icon) icon.className = 'fa-solid fa-file-lines text-[10px] sm:text-xs text-black-fade';
            } else if (iconType === 'manual') {
                const icon = btn.querySelector('i');
                if (icon) icon.className = 'fa-solid fa-pen-nib text-[10px] sm:text-xs text-black-fade';
            }
        }
    };

    updateChip(btnAll, filter === 'all');
    updateChip(btnRecent, filter === 'recent');
    updateChip(btnDraft, filter === 'draft', 'draft');
    updateChip(btnAi, filter === 'ai', 'ai');
    updateChip(btnManual, filter === 'manual', 'manual');

    if (btnMy) {
        btnMy.className = `w-9 h-9 rounded-xl border transition-all flex items-center justify-center cursor-pointer shadow-2xs shrink-0 ${window._libraryModalIsMyMode ? 'bg-[#15803d] text-white border-[#15803d]' : 'bg-slate-100 text-black hover:bg-slate-200 border-slate-200'}`;
        btnMy.innerHTML = `<i class="fa-solid fa-folder-open text-xs ${window._libraryModalIsMyMode ? 'text-white' : 'text-black'}"></i>`;
    }

    const searchVal = document.getElementById('library-modal-search-input')?.value || '';
    window.renderLibraryModalQuizzes(searchVal);
};

window.renderLibraryModalQuizzes = function (query = '') {
    const container = document.getElementById('library-modal-quizzes-list');
    if (!container) return;

    const q = (query !== undefined && query !== null ? String(query) : (document.getElementById('library-modal-search-input')?.value || '')).toLowerCase().trim();
    const pills = document.getElementById('library-modal-filter-pills');
    if (pills) pills.classList.remove('hidden');

    const activeUser = window.getQuizActiveUser ? window.getQuizActiveUser() : null;
    const allQuizzes = (typeof getStoredQuizLibrary === 'function') ? getStoredQuizLibrary() : [];
    const isOwn = (item) => (window.isUserQuizOwner ? window.isUserQuizOwner(item, activeUser) : false);

    // Filter quizzes
    let filtered = allQuizzes.filter(item => {
        if (!item) return false;
        const isDraft = (item.status === 'draft' || item.isDraft === true);
        const isAiQuiz = Boolean(item.isAi || item.isAiGenerated || item.aiGenerated || item.source === 'ai' || item.generator === 'ai' || item.type === 'ai' || (item.tags && item.tags.includes('ai')) || (item.desc && item.desc.toLowerCase().includes('ai generated')) || (item.title && item.title.toLowerCase().includes('ai')) || item.engine);

        // Drafts are STRICTLY private — only visible to the actual author
        if (isDraft && !isOwn(item)) return false;
        if (window._libraryModalIsMyMode) {
            if (!isOwn(item)) return false;
        }
        if (libraryModalFilter === 'recent') {
            let itemTime = item.createdTimestamp || 0;
            if (!itemTime && item.createdAt) {
                const parsed = new Date(item.createdAt).getTime();
                if (!isNaN(parsed)) itemTime = parsed;
            }
            if (!itemTime && item.updatedAt) {
                const parsed = new Date(item.updatedAt).getTime();
                if (!isNaN(parsed)) itemTime = parsed;
            }
            const isUnder24Hours = Boolean(itemTime && (Date.now() - itemTime < 86400000) && (Date.now() - itemTime >= 0));
            return !isDraft && ((item.isNew && isUnder24Hours) || isUnder24Hours);
        } else if (libraryModalFilter === 'draft') {
            return isDraft && isOwn(item);
        } else if (libraryModalFilter === 'ai') {
            return isAiQuiz;
        } else if (libraryModalFilter === 'manual') {
            return !isAiQuiz;
        }
        return true;
    });

    if (q) {
        const qTerms = q.split(/\s+/).filter(Boolean);
        const qNormalized = q.replace(/^#?qz-?/i, '');
        filtered = filtered.filter(item => {
            const title = (item.title || '').toLowerCase();
            const desc = (item.desc || item.description || '').toLowerCase();
            const subject = (item.subject || item.subjectTitle || '').toLowerCase();
            const topic = (item.topic || item.topicTitle || '').toLowerCase();
            const author = (item.authorName || '').toLowerCase();
            const category = (item.category || '').toLowerCase();
            const tags = Array.isArray(item.tags) ? item.tags.join(' ').toLowerCase() : (item.tags || '').toLowerCase();
            const code = (item.code || item.quizCode || item.refCode || '').toLowerCase();
            const codeNormalized = code.replace(/^#?qz-?/i, '');

            let questionTexts = '';
            if (Array.isArray(item.questions)) {
                questionTexts = item.questions.map(qu => (qu.question || qu.title || qu.prompt || '')).join(' ').toLowerCase();
            }

            if (qNormalized && codeNormalized && codeNormalized.includes(qNormalized)) {
                return true;
            }

            const combined = `${title} ${desc} ${subject} ${topic} ${author} ${category} ${tags} ${code} ${questionTexts}`;
            return qTerms.every(term => combined.includes(term));
        });
    }

    // If quiz is new it stacks and starts on top first
    filtered.sort((a, b) => {
        const aIsDraft = a.status === 'draft' || a.isDraft === true;
        const bIsDraft = b.status === 'draft' || b.isDraft === true;
        const aTime = a.createdTimestamp || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const bTime = b.createdTimestamp || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        const aIsNew = !aIsDraft && Boolean(aTime && (Date.now() - aTime < 86400000));
        const bIsNew = !bIsDraft && Boolean(bTime && (Date.now() - bTime < 86400000));

        if (aIsNew && !bIsNew) return -1;
        if (!aIsNew && bIsNew) return 1;

        const timeA = a.createdTimestamp || (a.updatedAt ? new Date(a.updatedAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0));
        const timeB = b.createdTimestamp || (b.updatedAt ? new Date(b.updatedAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0));
        return timeB - timeA;
    });

    // Sync footer action button (Load / Resume)
    const actionBtn = document.getElementById('lib-modal-action-btn');
    const actionText = document.getElementById('lib-modal-action-text');
    const actionIcon = document.getElementById('lib-modal-action-icon');
    const selectedQuiz = window._selectedLibraryModalQuizId ? allQuizzes.find(item => item && item.id === window._selectedLibraryModalQuizId) : null;

    if (selectedQuiz && actionBtn) {
        actionBtn.disabled = false;
        actionBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        actionBtn.classList.add('cursor-pointer');
        const isDraft = Boolean(selectedQuiz.status === 'draft' || selectedQuiz.isDraft === true);
        if (actionText) actionText.textContent = isDraft ? 'Resume' : 'Load';
        if (actionIcon) actionIcon.className = `fa-solid ${isDraft ? 'fa-arrow-rotate-right' : 'fa-folder-open'} text-xs`;
    } else if (actionBtn) {
        actionBtn.disabled = true;
        actionBtn.classList.add('opacity-50', 'cursor-not-allowed');
        actionBtn.classList.remove('cursor-pointer');
        if (actionText) actionText.textContent = 'Load';
        if (actionIcon) actionIcon.className = 'fa-solid fa-folder-open text-xs';
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="col-span-full py-12 px-4 text-center font-['Inter'] space-y-1 animate-in fade-in duration-150">
                <div class="w-12 h-12 rounded-2xl bg-slate-100 text-black flex items-center justify-center mx-auto text-base mb-3 border border-slate-200/80 shadow-2xs">
                    <i class="fa-solid fa-folder text-black-fade"></i>
                </div>
                <p class="font-bold text-black text-sm tracking-tight">${q ? 'No Quizzes Found' : 'Quiz Library is Empty'}</p>
                <p class="text-xs text-black-fade">${q ? `No quizzes matching "${escapeHtml(q)}". Try a different keyword.` : 'No stored quizzes match this filter.'}</p>
            </div>
        `;
        return;
    }

    // Build "My Quizzes" draft resume panel (strictly current user's own latest draft)
    let draftResumePanelHtml = '';
    if (window._libraryModalIsMyMode || libraryModalFilter === 'draft' || libraryModalFilter === 'all') {
        const myDrafts = allQuizzes.filter(q => (q.status === 'draft' || q.isDraft === true) && isOwn(q));
        myDrafts.sort((a, b) => {
            const ta = a.createdTimestamp || (a.updatedAt ? new Date(a.updatedAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0));
            const tb = b.createdTimestamp || (b.updatedAt ? new Date(b.updatedAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0));
            return tb - ta;
        });
        const latestDraft = myDrafts[0];
        if (latestDraft) {
            const draftTitle = (latestDraft.title || 'Untitled Draft').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
            const draftCode = (latestDraft.code || latestDraft.quizCode || latestDraft.refCode || '').replace(/^#/, '');
            const panelRole = (activeUser?.role || activeUser?.type || activeUser?.userType || 'Teacher');
            draftResumePanelHtml = `
                <div class="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-center gap-3 shadow-2xs animate-in fade-in duration-150">
                    <div class="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0">
                        <i class="fa-solid fa-file-lines text-sm text-amber-800"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-[10px] font-extrabold text-amber-600 tracking-wide mb-0.5 leading-tight">Continue Where You Left Off</p>
                        <p class="text-sm font-bold text-black truncate leading-snug">${draftTitle}</p>
                        <div class="flex items-center gap-1.5 mt-0.5">
                            ${draftCode ? `<span class="text-[11px] text-black/55 font-mono">${draftCode}</span>` : ''}
                            ${draftCode ? `<span class="text-[10px] text-black/30">·</span>` : ''}
                            <span class="text-[11px] text-black/50 font-medium">${typeof window.normalizeRoleDisplay === 'function' ? window.normalizeRoleDisplay(panelRole) : panelRole}</span>
                        </div>
                    </div>
                    <button onclick="window.confirmResumeDraft('${latestDraft.id}', event)" class="sigma-btn sigma-btn-primary sigma-btn-sm shrink-0 flex items-center gap-1.5">
                        <i class="fa-solid fa-arrow-rotate-right text-xs"></i>
                        Resume
                    </button>
                </div>
            `;
        }
    }

window._renderSingleLibraryModalCard = function (quiz, currentQuizId) {
    if (typeof window.renderQuizStorageCardHtml === 'function') {
        return window.renderQuizStorageCardHtml(quiz, {
            mode: 'select',
            selectedQuizId: window._selectedLibraryModalQuizId,
            currentQuizId: currentQuizId,
            onSelect: 'window.selectQuizInLibraryModal'
        });
    }
    // Fallback rendering
    const isDraft = (quiz.status === 'draft' || quiz.isDraft === true);
    const isAiQuiz = Boolean(quiz.isAi || quiz.isAiGenerated || quiz.aiGenerated || quiz.source === 'ai' || quiz.generator === 'ai' || quiz.type === 'ai' || (quiz.tags && quiz.tags.includes('ai')) || (quiz.desc && quiz.desc.toLowerCase().includes('ai generated')) || (quiz.title && quiz.title.toLowerCase().includes('ai')) || quiz.engine);
    let qTime = quiz.createdTimestamp || 0;
    if (!qTime && quiz.createdAt) {
        const parsed = new Date(quiz.createdAt).getTime();
        if (!isNaN(parsed)) qTime = parsed;
    }
    if (!qTime && quiz.updatedAt) {
        const parsed = new Date(quiz.updatedAt).getTime();
        if (!isNaN(parsed)) qTime = parsed;
    }
    const isUnder24H = Boolean(qTime && (Date.now() - qTime < 86400000) && (Date.now() - qTime >= 0));
    const isRecent = !isDraft && ((quiz.isNew && isUnder24H) || isUnder24H);
    const count = quiz.questionsCount || (quiz.questions ? quiz.questions.length : 0);
    const points = quiz.totalPoints || (quiz.questions ? quiz.questions.reduce((acc, q) => acc + (parseInt(q.points) || 0), 0) : (count * 10));
    const isSelected = window._selectedLibraryModalQuizId === quiz.id;
    const isCurrentActive = currentQuizId && currentQuizId === quiz.id;
    let refCode = quiz.code || quiz.quizCode || quiz.refCode;
    if (!refCode) {
        const refDigits = String(quiz.id || '').replace(/[^0-9]/g, '').slice(-4) || '1001';
        refCode = `#QZ-${refDigits.padStart(4, '0')}`;
    }
    if (!refCode.startsWith('#')) refCode = '#' + refCode;
    const date = quiz.createdAt || (quiz.updatedAt ? new Date(quiz.updatedAt).toLocaleDateString() : 'Saved');

    const authorInfo = (typeof window.resolveQuizAuthor === 'function') ? window.resolveQuizAuthor(quiz) : {
        authorId: quiz.authorId || '0000000',
        authorName: quiz.authorName || 'Stanley Garcia',
        authorRole: 'Admin'
    };
    const authorDisplay = authorInfo.authorName || 'Stanley Garcia';
    const authorRoleDisplay = authorInfo.authorRole || 'Admin';

    const iconInfo = (typeof window.getQuizStorageIconInfo === 'function')
        ? window.getQuizStorageIconInfo(quiz)
        : null;

    const iconBoxStyle = iconInfo ? (iconInfo.iconBoxStyle ? `style="${iconInfo.iconBoxStyle}"` : '') : '';
    const iconBadgeClass = iconInfo ? iconInfo.iconBox : (isAiQuiz
        ? 'border-purple-200 bg-purple-50 text-purple-700'
        : (isDraft ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-[#15803d]'));

    const iconHtml = iconInfo
        ? `<i class="${iconInfo.iconCls} text-sm ${iconInfo.iconColor}" ${iconInfo.iconStyle ? `style="${iconInfo.iconStyle}"` : ''}></i>`
        : (isAiQuiz
            ? `<i class="fa-solid fa-bolt text-sm text-purple-700"></i>`
            : (isDraft ? `<i class="fa-solid fa-file-pen text-sm text-amber-800"></i>` : `<i class="fa-solid fa-file-signature text-sm text-[#15803d]"></i>`));

    const activeBorderClass = (!isDraft && isSelected)
        ? 'bg-emerald-50/70 !border-2 !border-[#15803d] [outline:2px_solid_#15803d] [outline-offset:2px] shadow-xs'
        : (isCurrentActive
            ? 'bg-emerald-50/60 !border-2 !border-emerald-400 shadow-2xs'
            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-100/80 shadow-2xs');

    // Draft cards show Resume button; non-draft cards show select circle
    const checkmarkHtml = isDraft
        ? `<button onclick="window.confirmResumeDraft('${quiz.id}', event)" class="sigma-btn sigma-btn-primary sigma-btn-sm shrink-0 flex items-center gap-1.5">
                   <i class="fa-solid fa-arrow-rotate-right text-xs"></i>
                   Resume
               </button>`
        : (isSelected
            ? `<div class="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs shadow-xs shrink-0 animate-in zoom-in-75 duration-150">
                   <i class="fa-solid fa-check"></i>
               </div>`
            : `<div class="w-6 h-6 rounded-full border-2 border-slate-300 bg-white flex items-center justify-center shrink-0"></div>`);

    const cardClick = !isDraft ? `onclick="window.selectQuizInLibraryModal('${quiz.id}', event)"` : '';
    const cursorCls = isDraft ? 'cursor-default' : 'cursor-pointer';

    return `
        <div class="${cursorCls} select-none p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${activeBorderClass}" ${cardClick}>
            <div class="flex items-start justify-between gap-3 min-w-0">
                <div class="flex items-start gap-3 min-w-0 flex-1">
                    <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs border mt-0.5 ${iconBadgeClass}" ${iconBoxStyle}>
                        ${iconHtml}
                    </div>
                    <div class="min-w-0 flex-1 space-y-1">
                        <div class="flex items-center gap-1.5 flex-wrap min-w-0">
                            <h5 class="text-sm font-bold text-black break-words line-clamp-1 flex-1 min-w-0" title="${escapeHtml(quiz.title || 'Untitled Quiz')}">${escapeHtml(quiz.title || 'Untitled Quiz')}</h5>
                            <div class="flex items-center gap-1 shrink-0 flex-wrap">
                                ${isDraft ? `<span class="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 text-[8px] font-black uppercase tracking-wider">DRAFT</span>` : ''}
                                ${isAiQuiz ? `<span class="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200 text-[8px] font-black uppercase tracking-wider flex items-center gap-1"><i class="fa-solid fa-bolt text-[8px] text-[#FFD000]"></i> AI GENERATED</span>` : ''}
                                ${isRecent ? `<span class="px-1.5 py-0.5 rounded bg-emerald-100 text-[#15803d] text-[8px] font-black uppercase tracking-wider">NEW</span>` : ''}
                                ${isCurrentActive ? `<span class="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[8px] font-bold">CURRENT</span>` : ''}
                            </div>
                        </div>
                        <p class="text-xs text-black-fade font-medium leading-snug truncate">
                            By <span class="text-black-fade font-semibold">${escapeHtml(authorDisplay)}</span> <span class="text-[10px] text-black-fade font-normal">(${escapeHtml(authorRoleDisplay)})</span>
                        </p>
                    </div>
                </div>
                ${checkmarkHtml}
            </div>
            <div class="flex items-center justify-between gap-2 pt-2.5 border-t ${(!isDraft && isSelected) ? 'border-emerald-200/60' : 'border-slate-100'} mt-auto">
                <div class="flex items-center gap-1.5 text-xs text-black-fade font-medium flex-wrap min-w-0">
                    <span class="whitespace-nowrap font-medium">${count} ${count === 1 ? 'Question' : 'Questions'}</span>
                    <span>•</span>
                    <span class="whitespace-nowrap font-medium flex items-center gap-1">${points} <i class="fa-solid fa-star text-amber-500 text-[10px]"></i> Pts</span>
                    <span>•</span>
                    <span class="whitespace-nowrap text-[11px]">${escapeHtml(date)}</span>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                    <span class="font-mono text-black/70 text-[11px]">${refCode.replace(/^#/, '')}</span>
                </div>
            </div>
        </div>
    `;
};

    window._libraryModalFilteredQuizzes = filtered;
    const limit = window._libraryModalLimit || 10;
    const displayed = filtered.slice(0, limit);
    const hasMore = filtered.length > limit;

    container.innerHTML = `
        ${draftResumePanelHtml}
        <div id="lib-modal-grid" class="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2 pb-2 px-1">
            ${displayed.map(quiz => window._renderSingleLibraryModalCard(quiz, currentQuizId)).join('')}
            ${hasMore ? `
                <div id="lib-modal-load-more-sentinel" class="col-span-full py-4 text-center">
                    <span class="inline-flex items-center gap-2 text-xs font-semibold text-black-fade bg-slate-100 px-3.5 py-1.5 rounded-full border border-slate-200/80 shadow-2xs">
                        <i class="fa-solid fa-circle-notch fa-spin text-[#15803d]"></i>
                        <span>Loading more quizzes...</span>
                    </span>
                </div>
            ` : ''}
        </div>
    `;

    if (typeof window.setupLibraryModalInfiniteScroll === 'function') {
        window.setupLibraryModalInfiniteScroll();
    }
};

window.loadMoreLibraryModalQuizzes = function () {
    const all = window._libraryModalFilteredQuizzes || [];
    const currentLimit = window._libraryModalLimit || 10;
    if (currentLimit >= all.length) return;

    const nextBatch = all.slice(currentLimit, currentLimit + 10);
    window._libraryModalLimit = currentLimit + 10;

    const grid = document.getElementById('lib-modal-grid');
    if (!grid) return;

    const sentinel = document.getElementById('lib-modal-load-more-sentinel');
    const currentQuizId = window.activeEditingQuizId || null;

    nextBatch.forEach(quiz => {
        const cardHtml = window._renderSingleLibraryModalCard(quiz, currentQuizId);
        if (sentinel) {
            sentinel.insertAdjacentHTML('beforebegin', cardHtml);
        } else {
            grid.insertAdjacentHTML('beforeend', cardHtml);
        }
    });

    if (window._libraryModalLimit >= all.length) {
        if (sentinel) sentinel.remove();
        const container = document.getElementById('library-modal-quizzes-list');
        if (container && container._infiniteObserver) {
            container._infiniteObserver.disconnect();
            container._infiniteObserver = null;
        }
    }
};

window.setupLibraryModalInfiniteScroll = function () {
    const container = document.getElementById('library-modal-quizzes-list');
    if (!container) return;

    if (!container._hasScrollListener) {
        container._hasScrollListener = true;
        container.addEventListener('scroll', function () {
            if (container.scrollTop + container.clientHeight >= container.scrollHeight - 150) {
                window.loadMoreLibraryModalQuizzes();
            }
        }, { passive: true });
    }

    const sentinel = document.getElementById('lib-modal-load-more-sentinel');
    if (sentinel && window.IntersectionObserver) {
        if (container._infiniteObserver) {
            container._infiniteObserver.disconnect();
        }
        container._infiniteObserver = new IntersectionObserver((entries) => {
            if (entries[0] && entries[0].isIntersecting) {
                window.loadMoreLibraryModalQuizzes();
            }
        }, { root: container, threshold: 0.1 });
        container._infiniteObserver.observe(sentinel);
    }
};

/**
 * Asks the user to confirm before resuming a draft quiz.
 * Shows an inline confirmation prompt inside the card or panel.
 */
window.confirmResumeDraft = function (quizId, event) {
    if (event) event.stopPropagation();

    if (typeof window.openAskingPanel === 'function') {
        window.openAskingPanel({
            title: 'Resume Draft?',
            message: 'You\'ll be taken to the quiz editor to continue editing this draft. Any unsaved changes in the current quiz will be discarded.',
            type: 'warning',
            confirmText: 'Resume Draft',
            cancelText: 'Cancel',
            onConfirm: () => { window.loadQuizIntoEditor(quizId, false); }
        });
    } else {
        // Fallback: simple confirm dialog
        if (confirm('Resume this draft? You\'ll be taken to the quiz editor to continue editing.')) {
            window.loadQuizIntoEditor(quizId, false);
        }
    }
};

window.loadQuizIntoEditor = function (quizId, openInNewTab = false) {
    if (openInNewTab) {
        window.open(`quiz-creator.html?mode=edit&id=${encodeURIComponent(quizId)}`, '_blank');
        return;
    }

    // 1. If loading the same file that is already loaded in the editor on the main page:
    if (currentQuizId && currentQuizId === quizId) {
        window.closeQuizLibraryModal();
        if (typeof window.showToastNotification === 'function') {
            window.showToastNotification('This quiz is already open in the editor.', 'info');
        } else if (typeof window.showSigmaToast === 'function') {
            window.showSigmaToast('This quiz is already open in the editor.', 'info');
        }
        return;
    }

    // 2. User rule: If main page already has a loaded quiz or authored questions, load another file in a new browser tab!
    const hasCurrentWork = Boolean(currentQuizId || (Array.isArray(questions) && questions.length > 0) || (typeof window.hasUnsavedQuizChanges === 'function' && window.hasUnsavedQuizChanges()));
    if (hasCurrentWork) {
        window.open(`quiz-creator.html?mode=edit&id=${encodeURIComponent(quizId)}`, '_blank');
        window.closeQuizLibraryModal();
        return;
    }

    // 3. Otherwise (fresh editor with no active quiz/questions): load into current tab
    window.location.href = `quiz-creator.html?mode=edit&id=${encodeURIComponent(quizId)}`;
};

window.goBackToCaller = function () {
    if (window.opener && !window.opener.closed) {
        window.close();
    } else if (history.length > 1) {
        history.back();
    } else {
        window.location.href = 'admin.html';
    }
};

// ==========================================
// AI QUESTION GENERATOR ENGINE
// ==========================================
// AI QUESTION GENERATOR ENGINE
// ==========================================

let aiModalInitialState = {
    topic: '',
    engine: 'gemini',
    type: 'Mixed',
    count: '5',
    difficulty: 'Medium'
};

function syncBodyScrollLock() {
    const aiModal = document.getElementById('ai-generator-modal');
    const discardModal = document.getElementById('ai-discard-modal');
    const confirmModal = document.getElementById('ai-confirm-generate-modal');

    const isAnyModalOpen = (aiModal && !aiModal.classList.contains('hidden')) ||
                           (discardModal && !discardModal.classList.contains('hidden')) ||
                           (confirmModal && !confirmModal.classList.contains('hidden'));

    if (isAnyModalOpen) {
        document.body.classList.add('overflow-hidden');
    } else {
        document.body.classList.remove('overflow-hidden');
    }
}

// ==========================================
// =========================================================================
// REAL SENIOR HIGH (GRADE 11 & 12) COURSE MATERIALS & CREATOR AGGREGATOR
// =========================================================================
// REAL COURSE MATERIALS FOR AI BORROW PICKER
// Only added topics, added lessons, and added videos by all users (teachers & admins)
// Assessment materials are strictly excluded.
// =========================================================================

window.getRealCourseMaterials = function () {
    const materialsMap = {};
    const dedupMap = new Map();

    function normalizeKey(str) {
        return String(str || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    function extractFilePanelName(mat, category, title) {
        let fn = mat.fileName || mat.file || mat.fileNameDisplay || mat.fileUrl || mat.attachment || mat.handoutFileName || mat.attachmentName || '';
        if (typeof fn === 'string' && fn.trim()) {
            const clean = fn.split('?')[0].split('#')[0].split('/').pop().split('\\').pop().trim();
            if (clean && clean.includes('.')) return clean;
            if (clean) fn = clean;
        }
        const safeTitle = (title || 'Material').replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/\s+/g, '-');
        if (category === 'video') {
            return `${safeTitle}.mp4`;
        } else {
            const fmt = String(mat.format || mat.fileType || mat.type || '').toLowerCase();
            if (fmt.includes('ppt')) return `${safeTitle}.pptx`;
            if (fmt.includes('doc')) return `${safeTitle}.docx`;
            return `${safeTitle}-Handout.pdf`;
        }
    }

    function addEntry(entry) {
        if (!entry || !entry.id || !entry.title) return;

        // Deduplication key based on normalized subject and material panel name
        const dedupKey = `${normalizeKey(entry.cleanSubjectName)}:::${normalizeKey(entry.title)}`;
        const existing = dedupMap.get(dedupKey);

        if (!existing) {
            dedupMap.set(dedupKey, entry);
        } else {
            // Prioritize original owner / Admin uploader:
            const newIsAdmin = entry.authorRole === 'Admin' || String(entry.author || '').toLowerCase().includes('admin');
            const existingIsAdmin = existing.authorRole === 'Admin' || String(existing.author || '').toLowerCase().includes('admin');

            if (newIsAdmin && !existingIsAdmin) {
                dedupMap.set(dedupKey, entry);
            }
        }
    }

    try {
        const primaryKeys = ['sigma-admin-subjects', 'sigma_subjects_v2', 'sigma-teacher-subjects', 'sigma_subjects'];
        const allSubjects = [];

        primaryKeys.forEach(storageKey => {
            const raw = localStorage.getItem(storageKey);
            if (!raw) return;
            try {
                const subjects = JSON.parse(raw);
                if (Array.isArray(subjects)) {
                    subjects.forEach(s => {
                        if (s) {
                            s._sourceStorageKey = storageKey;
                            allSubjects.push(s);
                        }
                    });
                }
            } catch (e) {}
        });

        if (window.DATA && Array.isArray(window.DATA.subjects)) {
            window.DATA.subjects.forEach(s => {
                if (s) {
                    s._sourceStorageKey = 'window_data';
                    allSubjects.push(s);
                }
            });
        }

        allSubjects.forEach(subj => {
            if (!subj) return;
            const subjId = String(subj.id || subj.code || subj.subjectCode || subj.name || '').trim();
            const rawSubjName = subj.name || subj.title || subj.subjectName || 'Senior High Subject';
            const subjCode = subj.code || subj.subjectCode || '';
            const cleanSubjectName = rawSubjName.replace(/\s*\((Grade|Gr\.)[^\)]*\)/gi, '').trim() || rawSubjName;

            const gradeLevel = subj.gradeLevel || subj.grade || (rawSubjName.toLowerCase().includes('12') || subjCode.toLowerCase().includes('12') ? 'Grade 12' : 'Grade 11');
            const section = subj.section || subj.sectionName || subj.strand || subj.track || (rawSubjName.toLowerCase().includes('prog') || rawSubjName.toLowerCase().includes('network') || rawSubjName.toLowerCase().includes('web') || rawSubjName.toLowerCase().includes('css') ? 'TVL - ICT' : (rawSubjName.toLowerCase().includes('math') || rawSubjName.toLowerCase().includes('calculus') ? 'STEM' : 'STEM'));

            const isSubjAdmin = Boolean(subj.createdByAdmin || String(subj.authorName || subj.teacher || '').toLowerCase().includes('admin') || subj._sourceStorageKey === 'sigma-admin-subjects');
            const subjAuthor = subj.authorName || subj.teacher || (isSubjAdmin ? 'Stanley Garcia (Admin)' : 'Maria Santos Ramos (Teacher)');
            const subjAuthorRole = isSubjAdmin ? 'Admin' : 'Teacher';

            const rawMaterialList = [];

            if (Array.isArray(subj.materials)) {
                subj.materials.forEach(m => { if (m) rawMaterialList.push(m); });
            }

            try {
                const customMats = JSON.parse(localStorage.getItem(`sigma_custom_materials_${subj.id}`) || localStorage.getItem(`sigma_custom_materials_${subjCode}`) || '[]');
                if (Array.isArray(customMats)) {
                    customMats.forEach(cm => { if (cm) rawMaterialList.push(cm); });
                }
            } catch (e) {}

            if (Array.isArray(subj.topics)) {
                subj.topics.forEach(top => {
                    if (!top) return;
                    ['materials', 'lessons', 'videos'].forEach(arrKey => {
                        if (Array.isArray(top[arrKey])) {
                            top[arrKey].forEach(item => {
                                if (item) {
                                    rawMaterialList.push({
                                        ...item,
                                        topicTitle: top.title || top.name || item.topicTitle,
                                        _inferredType: arrKey
                                    });
                                }
                            });
                        }
                    });
                });
            }

            rawMaterialList.forEach((mat, mIdx) => {
                if (!mat || (typeof window.isFakeSampleMaterial === 'function' && window.isFakeSampleMaterial(mat))) return;
                const matTitle = String(mat.title || mat.fileName || mat.name || '').replace(/\.(pdf|docx|pptx|ppt|xlsx|txt|mp4)$/i, '').trim();
                if (!matTitle) return;

                const matCat = String(mat.fileType || mat.type || mat.fileName || mat.category || mat._inferredType || '').toLowerCase();
                const matTypeStr = String(mat.type || mat._inferredType || '').toLowerCase();
                const matTitleLower = matTitle.toLowerCase();
                const matFileLower = String(mat.fileName || mat.file || mat.filePanel || '').toLowerCase();

                // STRICT CHECK: Exclude all tasks, written works, activities, quizzes, exams, and assessments!
                const isExcludedTaskOrAssessment = Boolean(
                    matCat.includes('quiz') || matCat.includes('assessment') || matCat.includes('exam') || matCat.includes('activity-quiz') || matCat.includes('test') ||
                    matCat.includes('task') || matCat.includes('assignment') || matCat.includes('activity') || matCat.includes('performance') || matCat.includes('written work') ||
                    matTypeStr.includes('quiz') || matTypeStr.includes('assessment') || matTypeStr.includes('exam') || matTypeStr.includes('test') ||
                    matTypeStr.includes('task') || matTypeStr.includes('assignment') || matTypeStr.includes('activity') || matTypeStr.includes('performance') || matTypeStr.includes('written work') ||
                    mat.quizData || mat.isAssessment || mat.quizId || mat.quizFile || mat.activityType || mat.taskType || mat.category === 'assessment' || mat.category === 'task' || mat.category === 'activity' ||
                    /\b(quiz|exam|quarterly assessment|periodical test|task|tasks|written work|written-work|short test|assignment|performance task|activity)\b/i.test(matTitleLower) ||
                    /\b(task|tasks|written work|written-work|short test)\b/i.test(matFileLower)
                );
                if (isExcludedTaskOrAssessment) return; // Strictly ignore all tasks and assessments!

                // Determine category: ONLY video or lesson
                const isVideo = Boolean(
                    matCat.includes('video') || matCat.includes('mp4') || matTypeStr.includes('video') ||
                    mat.videoUrl || (mat.url && String(mat.url).includes('youtu')) || matTitleLower.endsWith('.mp4')
                );

                let category = 'lesson';
                let format = 'Lesson Module';
                let type = 'Lesson';

                if (isVideo) {
                    category = 'video';
                    format = 'Video Lecture';
                    type = 'Video';
                } else {
                    category = 'lesson';
                    format = 'Lesson Module';
                    type = 'Lesson';
                    if (matCat.includes('pdf') || matTitleLower.endsWith('.pdf')) {
                        format = 'PDF Document';
                    } else if (matCat.includes('ppt') || matTitleLower.endsWith('.pptx') || matTitleLower.endsWith('.ppt')) {
                        format = 'PPTX Presentation';
                    } else if (matCat.includes('doc') || matTitleLower.endsWith('.docx') || matTitleLower.endsWith('.doc')) {
                        format = 'DOCX Document';
                    }
                }

                const filePanel = extractFilePanelName(mat, category, matTitle);

                const isMatAdmin = Boolean(
                    isSubjAdmin || mat.createdByAdmin || 
                    String(mat.authorName || mat.uploader || mat.author || '').toLowerCase().includes('admin')
                );
                const matAuthor = isMatAdmin ? 'Stanley Garcia (Admin)' : (mat.authorName || mat.uploader || mat.author || subjAuthor);
                const matAuthorRole = isMatAdmin ? 'Admin' : 'Teacher';

                const matId = `mat_${subj.id || subjCode}_${mat.id || normalizeKey(matTitle)}`;

                addEntry({
                    id: matId,
                    subject: `${cleanSubjectName} (${gradeLevel} - ${section})`,
                    cleanSubjectName: cleanSubjectName,
                    gradeLevel: gradeLevel,
                    section: section,
                    strand: section,
                    topic: mat.topicTitle || mat.topicName || mat.topic || cleanSubjectName,
                    lesson: mat.topicTitle || mat.topicName || matTitle,
                    title: matTitle,
                    filePanel: filePanel,
                    category: category,
                    format: format,
                    type: type,
                    author: matAuthor,
                    authorRole: matAuthorRole,
                    desc: mat.description || mat.instructions || `${gradeLevel} ${section} • ${format} learning resource`,
                    badge: `${type}: ${matTitle}`,
                    prompt: `Course Material (${type.toUpperCase()}): "${matTitle}" from ${cleanSubjectName} (${gradeLevel} - ${section}), file: ${filePanel}. Content details: ${mat.description || mat.instructions || matTitle}. Foundational learning competencies and curriculum facts.`
                });
            });
        });

        // Additional standalone released videos
        try {
            const rawVideos = localStorage.getItem('sigma_released_videos');
            if (rawVideos) {
                const videos = JSON.parse(rawVideos);
                if (Array.isArray(videos)) {
                    videos.forEach((v, vIdx) => {
                        if (!v) return;
                        const vTitle = String(v.title || 'Course Lecture Video').replace(/\.(mp4|mov|avi)$/i, '').trim();
                        const vSubj = String(v.subject || 'Senior High Lectures').replace(/\s*\([^\)]*\)/g, '').trim();
                        const vAuthor = v.teacher || v.authorName || 'Stanley Garcia (Admin)';
                        const vAuthorRole = vAuthor.toLowerCase().includes('admin') ? 'Admin' : 'Teacher';
                        const filePanel = v.fileName || `${vTitle.replace(/\s+/g, '-')}.mp4`;
                        const vId = `rel_video_${v.id || vIdx}`;

                        addEntry({
                            id: vId,
                            subject: `${vSubj} (${v.gradeLevel || 'Grade 11'} - ${v.strand || 'TVL - ICT'})`,
                            cleanSubjectName: vSubj,
                            gradeLevel: v.gradeLevel || 'Grade 11',
                            section: v.section || v.strand || 'TVL - ICT',
                            strand: v.strand || 'TVL - ICT',
                            topic: v.topic || vTitle,
                            lesson: v.topic || vTitle,
                            title: vTitle,
                            filePanel: filePanel,
                            category: 'video',
                            format: 'Video Lecture',
                            type: 'Video',
                            author: vAuthor,
                            authorRole: vAuthorRole,
                            desc: v.description || 'Recorded instructional demonstration and video lecture',
                            badge: `Video: ${vTitle}`,
                            prompt: `Video Lecture: "${vTitle}" from ${vSubj}, file: ${filePanel}. Topics covered: ${v.description || vTitle}. Procedures and practical applications.`
                        });
                    });
                }
            }
        } catch (e) {}
    } catch (err) {
        console.warn('Error querying stored course materials:', err);
    }

    dedupMap.forEach((entry) => {
        materialsMap[entry.id] = entry;
    });

    return materialsMap;
};

let borrowedMaterialsSet = new Set();
let currentMaterialFilterQuery = '';
let currentMaterialCategoryFilter = 'all';
let hasSearchedMaterials = false;

window.syncBorrowButtonBadge = function () {
    const badge = document.getElementById('ai-borrow-btn-badge');
    if (!badge) return;
    const count = borrowedMaterialsSet ? borrowedMaterialsSet.size : 0;
    if (count > 0) {
        badge.textContent = `${count} Borrowed`;
        badge.className = 'text-xs text-[#15803d] bg-emerald-50 border border-emerald-300 font-bold px-2.5 py-0.5 rounded-full hidden sm:inline-block shadow-2xs';
    } else {
        badge.textContent = 'Borrow';
        badge.className = 'text-xs text-black-fade bg-slate-100 border border-slate-200/80 font-medium px-2.5 py-0.5 rounded-full hidden sm:inline-block';
    }
};

window.updateBorrowSelectedCountLabel = function () {
    const countLabel = document.getElementById('ai-borrow-selected-count-label');
    if (!countLabel) return;
    const count = window._borrowPickerSelectedSet ? window._borrowPickerSelectedSet.size : 0;
    countLabel.textContent = `${count} ${count === 1 ? 'material' : 'materials'} selected`;
};

window.syncMaterialSearchPlaceholder = function () {
    const searchInput = document.getElementById('ai-material-search-input');
    if (!searchInput) return;
    if (window.innerWidth < 640) {
        searchInput.placeholder = 'Search lessons, videos, or files...';
    } else {
        searchInput.placeholder = 'Search by subject, lesson, video, or file (.docx, .pdf, .pptx)...';
    }
};

window.addEventListener('resize', function () {
    if (typeof window.syncMaterialSearchPlaceholder === 'function') {
        window.syncMaterialSearchPlaceholder();
    }
});

window.openMaterialPickerPage = function () {
    if (typeof currentAIGenFile !== 'undefined' && currentAIGenFile) {
        if (typeof window.showWarningToast === 'function') {
            window.showWarningToast('Borrowing course materials is locked while an uploaded document is active. Remove the file to browse materials.');
        }
        return;
    }
    const mainView = document.getElementById('ai-generator-main-view');
    const borrowView = document.getElementById('ai-generator-borrow-view');
    if (mainView && borrowView) {
        mainView.classList.add('hidden');
        borrowView.classList.remove('hidden');

        // Always reset to DEFAULT STATE when opening borrow panel
        const searchInput = document.getElementById('ai-material-search-input');
        if (searchInput) {
            searchInput.value = '';
        }
        const clearBtn = document.getElementById('ai-material-search-clear-btn');
        if (clearBtn) clearBtn.classList.add('hidden');
        const filterPills = document.getElementById('ai-material-filter-pills');
        if (filterPills) filterPills.classList.add('hidden');

        currentMaterialFilterQuery = '';
        hasSearchedMaterials = false;
        currentMaterialCategoryFilter = 'all';

        const pills = document.querySelectorAll('.ai-mat-filter-pill');
        pills.forEach(pill => {
            const cat = pill.dataset.cat || 'all';
            if (cat === 'all') {
                pill.className = 'ai-mat-filter-pill px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-bold bg-[#15803d] text-white cursor-pointer transition-all whitespace-nowrap !shadow-none';
            } else {
                pill.className = 'ai-mat-filter-pill px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-normal text-black-fade hover:text-black bg-slate-100 hover:bg-slate-200/70 cursor-pointer transition-all whitespace-nowrap';
            }
        });

        // Fresh session selection: does NOT hold loaded materials as selected!
        window._borrowPickerSelectedSet = new Set();

        if (typeof window.syncMaterialSearchPlaceholder === 'function') {
            window.syncMaterialSearchPlaceholder();
        }

        window.renderMaterialPickerItems();
        window.updateBorrowSelectedCountLabel();

        if (searchInput) {
            setTimeout(() => searchInput.focus(), 50);
        }
    }
};

window.backToAIGeneratorMain = function (e) {
    if (e && typeof e.stopPropagation === 'function') {
        e.stopPropagation();
        e.preventDefault();
    }
    const mainView = document.getElementById('ai-generator-main-view');
    const borrowView = document.getElementById('ai-generator-borrow-view');
    if (mainView && borrowView) {
        // Add all newly selected materials from this picker session to the loaded materials set
        if (window._borrowPickerSelectedSet && window._borrowPickerSelectedSet.size > 0) {
            window._borrowPickerSelectedSet.forEach(k => borrowedMaterialsSet.add(k));
            window._borrowPickerSelectedSet.clear();
        }

        borrowView.classList.add('hidden');
        mainView.classList.remove('hidden');

        try {
            renderBorrowedMaterials();
            window.syncBorrowButtonBadge();
            if (typeof window.syncAIGenerateButtonState === 'function') {
                window.syncAIGenerateButtonState();
            }
        } catch (err) {
            console.warn('Error syncing borrowed materials:', err);
        }
    }
};

window.triggerMaterialSearch = function () {
    const searchInput = document.getElementById('ai-material-search-input');
    const q = searchInput ? searchInput.value.trim() : '';
    if (!q) {
        window.clearMaterialSearch();
        return;
    }
    hasSearchedMaterials = true;
    currentMaterialFilterQuery = q.toLowerCase();
    const clearBtn = document.getElementById('ai-material-search-clear-btn');
    if (clearBtn) {
        clearBtn.classList.remove('hidden');
    }
    const filterPills = document.getElementById('ai-material-filter-pills');
    if (filterPills) filterPills.classList.remove('hidden');

    window.renderMaterialPickerItems();
};

window.quickSearchMaterial = function (term) {
    const searchInput = document.getElementById('ai-material-search-input');
    if (searchInput) {
        searchInput.value = term;
    }
    window.triggerMaterialSearch();
};

window.filterMaterialSources = function (query) {
    const clearBtn = document.getElementById('ai-material-search-clear-btn');
    if (clearBtn) {
        clearBtn.classList.toggle('hidden', !query.trim());
    }
};

window.clearMaterialSearch = function () {
    const searchInput = document.getElementById('ai-material-search-input');
    if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
    }
    const clearBtn = document.getElementById('ai-material-search-clear-btn');
    if (clearBtn) clearBtn.classList.add('hidden');
    const filterPills = document.getElementById('ai-material-filter-pills');
    if (filterPills) filterPills.classList.add('hidden');

    currentMaterialFilterQuery = '';
    hasSearchedMaterials = false;
    currentMaterialCategoryFilter = 'all';
    
    const pills = document.querySelectorAll('.ai-mat-filter-pill');
    pills.forEach(pill => {
        const cat = pill.dataset.cat || 'all';
        if (cat === 'all') {
            pill.className = 'ai-mat-filter-pill px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-bold bg-[#15803d] text-white cursor-pointer transition-all shadow-2xs whitespace-nowrap';
        } else {
            pill.className = 'ai-mat-filter-pill px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-normal text-black-fade hover:text-black bg-slate-100 hover:bg-slate-200/70 cursor-pointer transition-all whitespace-nowrap';
        }
    });

    window.renderMaterialPickerItems();
};

window.setMaterialCategoryFilter = function (category) {
    currentMaterialCategoryFilter = category || 'all';
    hasSearchedMaterials = true;

    const pills = document.querySelectorAll('.ai-mat-filter-pill');
    pills.forEach(pill => {
        const cat = pill.dataset.cat || 'all';
        if (cat === currentMaterialCategoryFilter) {
            pill.className = 'ai-mat-filter-pill px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-bold bg-[#15803d] text-white cursor-pointer transition-all shadow-2xs whitespace-nowrap';
        } else {
            pill.className = 'ai-mat-filter-pill px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-normal text-black-fade hover:text-black bg-slate-100 hover:bg-slate-200/70 cursor-pointer transition-all whitespace-nowrap';
        }
    });

    window.renderMaterialPickerItems();
};

window.renderMaterialPickerItems = function () {
    const listContainer = document.getElementById('ai-materials-items-list');
    if (!listContainer) return;

    const query = (currentMaterialFilterQuery || '').trim().toLowerCase();
    const cat = currentMaterialCategoryFilter;

    // Initial Empty State: When user opens picker and hasn't searched yet and hasn't selected a specific sub-category
    if (!hasSearchedMaterials && cat === 'all' && !query) {
        listContainer.innerHTML = `
            <div class="py-8 px-4 text-center text-xs text-black-fade space-y-2 animate-in fade-in duration-150">
                <div class="w-12 h-12 rounded-2xl bg-slate-100 text-black-fade flex items-center justify-center mx-auto text-lg border border-slate-200/80">
                    <i class="fa-solid fa-magnifying-glass"></i>
                </div>
                <p class="font-bold text-black text-sm">Search Senior High (Grade 11 & 12) Materials</p>
                <div class="pt-0.5">
                    <span class="text-xs text-black-fade">Search through lesson handouts and demonstration videos.</span>
                </div>
            </div>
        `;
        return;
    }

    const materialsMap = (typeof window.getRealCourseMaterials === 'function') ? window.getRealCourseMaterials() : {};
    const allEntries = Object.entries(materialsMap);

    const filteredEntries = allEntries.filter(([key, item]) => {
        let matchesCat = false;
        if (cat === 'all') {
            matchesCat = true;
        } else if (cat === 'lesson') {
            matchesCat = (item.category === 'lesson');
        } else if (cat === 'video') {
            matchesCat = (item.category === 'video');
        } else if (cat === 'pdf') {
            matchesCat = Boolean(item.filePanel && item.filePanel.toLowerCase().endsWith('.pdf'));
        } else if (cat === 'pptx') {
            matchesCat = Boolean(item.filePanel && (item.filePanel.toLowerCase().endsWith('.pptx') || item.filePanel.toLowerCase().endsWith('.ppt')));
        } else if (cat === 'docx') {
            matchesCat = Boolean(item.filePanel && (item.filePanel.toLowerCase().endsWith('.docx') || item.filePanel.toLowerCase().endsWith('.doc')));
        } else {
            matchesCat = (item.category === cat);
        }
        if (!matchesCat) return false;

        if (!query) return true;

        // User requested: "the searching is material panel names( quiz file panel are not included)"
        const matchesTitle = (item.title || '').toLowerCase().includes(query);
        const matchesSubject = (item.cleanSubjectName || item.subject || '').toLowerCase().includes(query);
        const matchesFile = (item.filePanel || '').toLowerCase().includes(query);
        const matchesAuthor = (item.author || '').toLowerCase().includes(query);
        const matchesGradeSec = `${item.gradeLevel} ${item.section || item.strand}`.toLowerCase().includes(query);

        return matchesTitle || matchesSubject || matchesFile || matchesAuthor || matchesGradeSec;
    });

    if (filteredEntries.length === 0) {
        listContainer.innerHTML = `
            <div class="py-9 px-4 text-center text-xs text-black-fade space-y-2 animate-in fade-in duration-150">
                <div class="w-12 h-12 rounded-2xl bg-slate-100 text-black-fade flex items-center justify-center mx-auto text-lg border border-slate-200/80">
                    <i class="fa-solid fa-folder-open"></i>
                </div>
                <div class="space-y-0.5">
                    <p class="font-bold text-black text-sm">No Materials Found for "${window.escapeHtml(query)}"</p>
                    <p class="text-xs text-black-fade">Try searching by material name, attached file, subject, or author name.</p>
                </div>
            </div>
        `;
        return;
    }

    const MAX_BORROW = 5;
    const alreadyCommitted = (typeof borrowedMaterialsSet !== 'undefined') ? borrowedMaterialsSet.size : 0;
    const atCap = alreadyCommitted >= MAX_BORROW;

    let html = '';

    // Show cap notice at top when at limit
    if (atCap) {
        html += `
            <div class="mx-1 mb-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-[10.5px] sm:text-xs text-amber-800 font-semibold flex items-center gap-2">
                <i class="fa-solid fa-triangle-exclamation text-amber-500 shrink-0"></i>
                <span>Maximum of ${MAX_BORROW} materials reached. Remove a material to add another.</span>
            </div>
        `;
    }

    filteredEntries.forEach(([key, item]) => {
        const isAlreadyAdded = (typeof borrowedMaterialsSet !== 'undefined') && borrowedMaterialsSet.has(key);
        const isSelectedInPicker = Boolean(window._borrowPickerSelectedSet && window._borrowPickerSelectedSet.has(key));
        const isDisabled = !isAlreadyAdded && !isSelectedInPicker && atCap;

        // Canonical icons and colors from Material Panel (Video = Red circle-play, Lesson = Blue file-lines)
        const isVideo = (item.category === 'video');
        const icon = isVideo ? 'fa-circle-play' : 'fa-file-lines';
        const iconBg = isVideo ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-blue-50 text-blue-600 border border-blue-100';

        const isAuthorAdmin = (item.authorRole === 'Admin') || (item.author && item.author.toLowerCase().includes('admin'));
        const authorBadgeClass = isAuthorAdmin 
            ? 'bg-blue-50 text-blue-900 border border-blue-200' 
            : 'bg-emerald-50 text-emerald-900 border border-emerald-200';
        const authorIcon = isAuthorAdmin ? 'fa-user-shield' : 'fa-chalkboard-user';

        let rowBg = 'hover:bg-slate-50 border-transparent';
        if (isAlreadyAdded) rowBg = 'bg-emerald-50/50 border-emerald-200';
        else if (isSelectedInPicker) rowBg = 'bg-emerald-50/50 border-emerald-300';
        else if (isDisabled) rowBg = 'opacity-40 cursor-not-allowed border-transparent';

        let actionLabel = '+ Borrow';
        let actionClass = 'text-black font-bold hover:text-[#15803d]';
        if (isAlreadyAdded) { actionLabel = '✓ Added'; actionClass = 'text-[#15803d] font-bold'; }
        else if (isSelectedInPicker) { actionLabel = '✓ Added'; actionClass = 'text-[#15803d] font-bold'; }
        else if (isDisabled) { actionLabel = '+ Borrow'; actionClass = 'text-black/30 font-bold cursor-not-allowed'; }

        const disabledAttr = isDisabled ? 'disabled' : '';

        html += `
            <button type="button" onclick="${isDisabled || isAlreadyAdded ? '' : `window.borrowMaterialSource('${key}')`}" ${disabledAttr}
                class="w-full text-left p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl ${rowBg} transition-all flex items-center justify-between gap-2.5 sm:gap-3 group border ${isDisabled || isAlreadyAdded ? '' : 'cursor-pointer hover:border-slate-200'}">
                <div class="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                    <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl ${iconBg} flex items-center justify-center shrink-0 shadow-2xs">
                        <i class="fa-solid ${icon} text-xs sm:text-base"></i>
                    </div>
                    <div class="min-w-0 flex-1 space-y-0.5 sm:space-y-1">
                        <!-- 1. Material Panel Name -->
                        <div class="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                            <span class="text-xs sm:text-sm font-semibold text-black truncate">${window.escapeHtml(item.title)}</span>
                        </div>
                        <!-- 2. Green Text: Subject Name - File Panel -->
                        <div class="flex items-center gap-1.5 sm:gap-2 flex-wrap text-[10px] sm:text-[11px]">
                            <span class="font-semibold text-[#15803d] truncate">
                                <i class="fa-solid fa-graduation-cap text-[8px] sm:text-[9px] opacity-70 mr-1"></i>${window.escapeHtml(item.cleanSubjectName)} - ${window.escapeHtml(item.filePanel)}
                            </span>
                        </div>
                        <!-- 3. Subtitle: Grade Level + Author Badge -->
                        <div class="flex items-center gap-1.5 sm:gap-2 flex-wrap text-[10px] sm:text-xs text-black-fade">
                            <span class="truncate">${window.escapeHtml(item.gradeLevel)} - ${window.escapeHtml(item.section || item.strand)}</span>
                            <span class="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-md ${authorBadgeClass}">
                                <i class="fa-solid ${authorIcon} text-[8px] sm:text-[9px]"></i>${window.escapeHtml(item.author)}
                            </span>
                        </div>
                    </div>
                </div>
                <span class="text-[11px] sm:text-xs ${actionClass} transition-colors shrink-0 pl-1.5 sm:pl-2">
                    ${actionLabel}
                </span>
            </button>
        `;
    });

    listContainer.innerHTML = html;
};

function renderBorrowedMaterials() {
    const listContainer = document.getElementById('ai-borrowed-badges-list');
    const topicInput = document.getElementById('ai-gen-topic');
    if (!listContainer) return;

    if (borrowedMaterialsSet.size === 0) {
        listContainer.innerHTML = '';
        if (topicInput) {
            topicInput.value = '';
        }
        if (typeof window.syncAIGenerateButtonState === 'function') {
            window.syncAIGenerateButtonState();
        }
        return;
    }

    const materialsMap = (typeof window.getRealCourseMaterials === 'function') ? window.getRealCourseMaterials() : {};
    let html = '';
    const prompts = [];

    borrowedMaterialsSet.forEach(key => {
        const data = materialsMap[key];
        if (!data) return;
        prompts.push(data.prompt);

        let icon = 'fa-file-lines';
        if (data.category === 'video') {
            icon = 'fa-circle-play';
        }
        const colorClasses = 'bg-emerald-50 text-emerald-900 border-emerald-200';

        html += `
            <div class="flex items-center gap-2 sm:gap-2.5 ${colorClasses} border rounded-lg sm:rounded-xl px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[10px] sm:text-xs font-semibold shadow-2xs w-full">
                <i class="fa-solid ${icon} text-[9px] sm:text-[11px] shrink-0"></i>
                <span class="truncate flex-1 min-w-0 text-[10px] sm:text-xs">${window.escapeHtml(data.title)}</span>
                <span class="hidden sm:inline-block text-[8.5px] sm:text-[10px] opacity-60 font-normal shrink-0 whitespace-nowrap">${window.escapeHtml(data.gradeLevel)} • ${window.escapeHtml(data.author)}</span>
                <button type="button" onclick="window.removeBorrowedMaterial('${key}')"
                    class="ai-borrowed-remove-btn ml-0.5 shrink-0" title="Remove">
                    <i class="fa-solid fa-xmark text-[9.5px] sm:text-[11px]"></i>
                </button>
            </div>
        `;
    });

    listContainer.innerHTML = html;

    if (topicInput) {
        topicInput.value = prompts.join('\n\n---\n\n');
    }
    if (typeof window.syncAIGenerateButtonState === 'function') {
        window.syncAIGenerateButtonState();
    }
}

window.borrowMaterialSource = function (key) {
    const materialsMap = (typeof window.getRealCourseMaterials === 'function') ? window.getRealCourseMaterials() : {};
    const data = materialsMap[key];
    if (!data) return;

    const MAX_BORROW = 5;

    if (!window._borrowPickerSelectedSet) {
        window._borrowPickerSelectedSet = new Set();
    }

    // If already in the session set, toggle it off (de-select) and stay on picker
    if (window._borrowPickerSelectedSet.has(key)) {
        window._borrowPickerSelectedSet.delete(key);
        window.renderMaterialPickerItems();
        window.updateBorrowSelectedCountLabel();
        return;
    }

    // Check total cap (session + already committed)
    const alreadyCommitted = (typeof borrowedMaterialsSet !== 'undefined') ? borrowedMaterialsSet.size : 0;
    const sessionCount = window._borrowPickerSelectedSet.size;
    if (alreadyCommitted + sessionCount >= MAX_BORROW) {
        if (typeof window.showWarningToast === 'function') {
            window.showWarningToast('You can borrow up to ' + MAX_BORROW + ' materials at a time. Remove one to add another.');
        }
        return;
    }

    // Add to session set — stays on picker until Done is clicked
    window._borrowPickerSelectedSet.add(key);
    window.renderMaterialPickerItems();
    window.updateBorrowSelectedCountLabel();
};


window.removeBorrowedMaterial = function (key) {
    borrowedMaterialsSet.delete(key);
    renderBorrowedMaterials();
    window.renderMaterialPickerItems();
    window.updateBorrowSelectedCountLabel();
    window.syncBorrowButtonBadge();
    if (typeof window.syncAIGenerateButtonState === 'function') {
        window.syncAIGenerateButtonState();
    }
};

window.clearAllBorrowedMaterials = function () {
    if (typeof borrowedMaterialsSet !== 'undefined' && borrowedMaterialsSet) {
        borrowedMaterialsSet.clear();
    }
    if (typeof renderBorrowedMaterials === 'function') {
        renderBorrowedMaterials();
    }
    if (typeof window.renderMaterialPickerItems === 'function') {
        window.renderMaterialPickerItems();
    }
    if (typeof window.updateBorrowSelectedCountLabel === 'function') {
        window.updateBorrowSelectedCountLabel();
    }
    if (typeof window.syncBorrowButtonBadge === 'function') {
        window.syncBorrowButtonBadge();
    }
    if (typeof window.syncAIGenerateButtonState === 'function') {
        window.syncAIGenerateButtonState();
    }
};

// =========================================================================
// AI GENERATOR DOCUMENT UPLOADER & LOCKING CONTROLLERS
// =========================================================================
let currentAIGenFile = null;
let currentAIGenFileText = '';

window.handleAIGenFileSelect = function (event) {
    const file = event.target?.files?.[0];
    if (file) {
        window.processAIGenFile(file);
    }
};

window.handleAIGenFileDrop = function (event) {
    event.preventDefault();
    const dropzone = document.getElementById('ai-gen-dropzone');
    if (dropzone) {
        dropzone.classList.remove('border-[#FFD000]', 'bg-[#FFD000]/10');
    }
    const file = event.dataTransfer?.files?.[0];
    if (file) {
        window.processAIGenFile(file);
    }
};

window.processAIGenFile = async function (file) {
    if (!file) return;

    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const docExts = ['txt', 'docx', 'doc', 'pdf', 'md', 'pptx', 'csv'];
    const imageExts = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'];
    const isVideo = (ext === 'mp4' || file.type.startsWith('video/'));

    // Check video format - ONLY MP4 allowed
    if (file.type.startsWith('video/') && ext !== 'mp4') {
        if (typeof window.openAskingPanel === 'function') {
            window.openAskingPanel({
                title: 'Unsupported Video Format',
                message: `The video "${file.name}" is not supported. Only MP4 (.mp4) videos are supported for AI grounding.`,
                type: 'warning'
            });
        } else {
            alert('Only .mp4 video files are supported. Please upload an MP4 video.');
        }
        return;
    }

    const isImage = imageExts.includes(ext) || file.type.startsWith('image/');
    const isDoc = docExts.includes(ext);
    const isAllowed = isDoc || isImage || (isVideo && ext === 'mp4');

    if (!isAllowed) {
        if (typeof window.openAskingPanel === 'function') {
            window.openAskingPanel({
                title: 'Unsupported File Format',
                message: `The file "${file.name}" is not supported. Please upload a document (.docx, .pdf, .txt, .md, .pptx), an image, or an .mp4 video.`,
                type: 'warning'
            });
        } else {
            alert('Unsupported file format. Please upload a document (.docx, .pdf, .txt, .md, .pptx), image, or .mp4 video.');
        }
        return;
    }

    const maxLimitBytes = (ext === 'mp4' || isImage) ? 25 * 1024 * 1024 : 10 * 1024 * 1024;
    const limitLabel = (ext === 'mp4' || isImage) ? '25MB' : '10MB';
    if (file.size > maxLimitBytes) {
        if (typeof window.openAskingPanel === 'function') {
            window.openAskingPanel({
                title: 'File Too Large',
                message: `The selected file exceeds the ${limitLabel} limit (${(file.size / (1024 * 1024)).toFixed(1)} MB).`,
                type: 'warning'
            });
        } else {
            alert(`File size exceeds the ${limitLabel} limit.`);
        }
        return;
    }

    currentAIGenFile = file;
    currentAIGenFileText = '';
    window.displayAIGenUploadedFileCard(file);

    try {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim();
        if ((ext === 'docx' || ext === 'doc') && window.mammoth) {
            const arrayBuffer = await file.arrayBuffer();
            const result = await window.mammoth.extractRawText({ arrayBuffer: arrayBuffer });
            currentAIGenFileText = (result.value || '').trim();
        } else if (ext === 'pdf' && window.pdfjsLib) {
            if (!window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
                window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            }
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += pageText + '\n\n';
            }
            currentAIGenFileText = fullText.trim();
        } else if (ext === 'pptx' && window.JSZip) {
            const arrayBuffer = await file.arrayBuffer();
            const zip = await window.JSZip.loadAsync(arrayBuffer);
            const slideFiles = Object.keys(zip.files).filter(name => /^ppt\/slides\/slide\d+\.xml$/i.test(name));
            slideFiles.sort((a, b) => {
                const numA = parseInt(a.match(/slide(\d+)\.xml/i)?.[1] || '0', 10);
                const numB = parseInt(b.match(/slide(\d+)\.xml/i)?.[1] || '0', 10);
                return numA - numB;
            });
            let fullText = '';
            for (const slidePath of slideFiles) {
                const xmlStr = await zip.files[slidePath].async('string');
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlStr, 'text/xml');
                const textNodes = xmlDoc.getElementsByTagName('a:t');
                const slideText = Array.from(textNodes).map(n => n.textContent).join(' ');
                fullText += slideText + '\n\n';
            }
            currentAIGenFileText = fullText.trim();
        } else if (ext === 'txt' || ext === 'md' || ext === 'csv') {
            currentAIGenFileText = (await file.text()).trim();
        } else if (isImage) {
            currentAIGenFileText = `Image Grounding Material: ${cleanName}\nFile Name: ${file.name}\nMedia Format: Image (${ext.toUpperCase()})\nContext: This educational graphic/diagram illustrates visual structures, labeled parts, concepts, and relationships of ${cleanName}. Generate educational quiz question items evaluating visual identification, processes, definitions, and operational comprehension of ${cleanName}.`;
        } else if (ext === 'mp4') {
            currentAIGenFileText = `Video Grounding Material: ${cleanName}\nFile Name: ${file.name}\nMedia Format: MP4 Video Lesson\nContext: This educational video demonstrates technical procedures, step-by-step methodologies, subject explanations, and practical takeaways for ${cleanName}. Generate comprehensive quiz questions evaluating core principles, demonstrated phases, terminology, and instructional takeaways from ${cleanName}.`;
        }
    } catch (e) {
        console.warn('Error reading AI file:', e);
    }

    // Do NOT put file content inside description textarea anymore.
    // The upload exists as its own file object.
    window.lockAIBorrowAndDescription(file);
    window.syncAIGenerateButtonState();
};

window.displayAIGenUploadedFileCard = function (file) {
    const card = document.getElementById('ai-gen-uploaded-file-card');
    const nameEl = document.getElementById('ai-gen-file-name');
    const metaEl = document.getElementById('ai-gen-file-meta');
    const iconEl = document.getElementById('ai-gen-file-icon');
    const iconWrap = document.getElementById('ai-gen-file-icon-wrap');
    const badgeEl = document.getElementById('ai-gen-file-badge');
    const dropzone = document.getElementById('ai-gen-dropzone');
    if (!card || !file) return;

    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const sizeKb = (file.size / 1024).toFixed(1);
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    const sizeFormatted = file.size > 1024 * 1024 ? `${sizeMb} MB` : `${sizeKb} KB`;

    if (nameEl) nameEl.textContent = file.name;

    const isImage = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext) || file.type.startsWith('image/');
    const isVideo = ext === 'mp4' || file.type.startsWith('video/');

    if (metaEl) {
        if (isImage) {
            metaEl.textContent = `${sizeFormatted} • Image Grounding Source • Ready for AI`;
        } else if (isVideo) {
            metaEl.textContent = `${sizeFormatted} • MP4 Video Grounding Source • Ready for AI`;
        } else {
            metaEl.textContent = `${sizeFormatted} • Ready for AI grounding`;
        }
    }

    if (badgeEl) {
        badgeEl.textContent = ext.toUpperCase();
    }

    if (iconEl && iconWrap) {
        if (ext === 'pdf') {
            iconWrap.className = 'w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-red-50 border border-red-100 text-red-500 flex items-center justify-center shrink-0';
            iconEl.className = 'fa-solid fa-file-pdf text-xs sm:text-base text-red-500';
            if (badgeEl) badgeEl.className = 'text-[7.5px] sm:text-[8.5px] px-1 sm:px-1.5 py-0.5 whitespace-nowrap bg-red-50 text-red-700 border border-red-200/70 font-bold rounded leading-tight inline-flex items-center justify-center text-center uppercase';
        } else if (ext === 'pptx' || ext === 'ppt') {
            iconWrap.className = 'w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-orange-50 border border-orange-100 text-orange-500 flex items-center justify-center shrink-0';
            iconEl.className = 'fa-solid fa-file-powerpoint text-xs sm:text-base text-orange-500';
            if (badgeEl) badgeEl.className = 'text-[7.5px] sm:text-[8.5px] px-1 sm:px-1.5 py-0.5 whitespace-nowrap bg-orange-50 text-orange-700 border border-orange-200/70 font-bold rounded leading-tight inline-flex items-center justify-center text-center uppercase';
        } else if (ext === 'docx' || ext === 'doc') {
            iconWrap.className = 'w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0';
            iconEl.className = 'fa-solid fa-file-word text-xs sm:text-base text-blue-600';
            if (badgeEl) badgeEl.className = 'text-[7.5px] sm:text-[8.5px] px-1 sm:px-1.5 py-0.5 whitespace-nowrap bg-blue-50 text-blue-700 border border-blue-200/70 font-bold rounded leading-tight inline-flex items-center justify-center text-center uppercase';
        } else if (isImage) {
            iconWrap.className = 'w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0';
            iconEl.className = 'fa-solid fa-file-image text-xs sm:text-base text-emerald-600';
            if (badgeEl) badgeEl.className = 'text-[7.5px] sm:text-[8.5px] px-1 sm:px-1.5 py-0.5 whitespace-nowrap bg-emerald-50 text-emerald-700 border border-emerald-200/70 font-bold rounded leading-tight inline-flex items-center justify-center text-center uppercase';
        } else if (ext === 'mp4') {
            iconWrap.className = 'w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center shrink-0';
            iconEl.className = 'fa-solid fa-file-video text-xs sm:text-base text-purple-600';
            if (badgeEl) badgeEl.className = 'text-[7.5px] sm:text-[8.5px] px-1 sm:px-1.5 py-0.5 whitespace-nowrap bg-purple-50 text-purple-700 border border-purple-200/70 font-bold rounded leading-tight inline-flex items-center justify-center text-center uppercase';
        } else {
            iconWrap.className = 'w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0';
            iconEl.className = 'fa-solid fa-file-lines text-xs sm:text-base text-slate-700';
            if (badgeEl) badgeEl.className = 'text-[7.5px] sm:text-[8.5px] px-1 sm:px-1.5 py-0.5 whitespace-nowrap bg-slate-100 text-slate-700 border border-slate-300 font-bold rounded leading-tight inline-flex items-center justify-center text-center uppercase';
        }
    }

    if (dropzone) dropzone.classList.add('hidden');
    card.classList.remove('hidden');
};

window.lockAIBorrowAndDescription = function (file) {
    const borrowBtn = document.getElementById('ai-borrow-trigger-btn');
    const borrowLockedBadge = document.getElementById('ai-borrow-locked-badge');
    const borrowPlusIcon = document.getElementById('ai-borrow-btn-plus-icon');
    const borrowSublabel = document.getElementById('ai-borrow-btn-sublabel');

    // Lock borrow panel when a document is uploaded
    if (borrowBtn) {
        borrowBtn.disabled = true;
        borrowBtn.classList.add('opacity-40', 'cursor-not-allowed', 'pointer-events-none', '!bg-slate-100');
    }
    if (borrowLockedBadge) {
        borrowLockedBadge.classList.remove('hidden');
        borrowLockedBadge.classList.add('inline-flex');
    }
    if (borrowPlusIcon) {
        borrowPlusIcon.className = 'fa-solid fa-lock text-[10px] text-amber-700';
    }
    if (borrowSublabel) {
        borrowSublabel.textContent = 'Locked while document is uploaded. Remove file to borrow ELMS course materials.';
    }

    // Description is NOT locked anymore
    const topicInput = document.getElementById('ai-gen-topic');
    const descLockedBadge = document.getElementById('ai-gen-desc-locked-badge');
    if (topicInput) {
        topicInput.readOnly = false;
        topicInput.classList.remove('is-locked');
    }
    if (descLockedBadge) {
        descLockedBadge.classList.add('hidden');
        descLockedBadge.classList.remove('inline-flex');
    }
};

window.unlockAIBorrowAndDescription = function () {
    const borrowBtn = document.getElementById('ai-borrow-trigger-btn');
    const borrowLockedBadge = document.getElementById('ai-borrow-locked-badge');
    const borrowPlusIcon = document.getElementById('ai-borrow-btn-plus-icon');
    const borrowSublabel = document.getElementById('ai-borrow-btn-sublabel');

    // Unlock borrow panel
    if (borrowBtn) {
        borrowBtn.disabled = false;
        borrowBtn.classList.remove('opacity-40', 'cursor-not-allowed', 'pointer-events-none', '!bg-slate-100');
    }
    if (borrowLockedBadge) {
        borrowLockedBadge.classList.add('hidden');
        borrowLockedBadge.classList.remove('inline-flex');
    }
    if (borrowPlusIcon) {
        borrowPlusIcon.className = 'fa-solid fa-plus text-[10px] sm:text-xs text-black-fade';
    }
    if (borrowSublabel) {
        borrowSublabel.textContent = 'Browse and select Senior High materials to ground your quiz';
    }

    // Do NOT wipe out description when removing file
    const topicInput = document.getElementById('ai-gen-topic');
    const descLockedBadge = document.getElementById('ai-gen-desc-locked-badge');
    if (topicInput) {
        topicInput.readOnly = false;
        topicInput.classList.remove('is-locked');
    }
    if (descLockedBadge) {
        descLockedBadge.classList.add('hidden');
        descLockedBadge.classList.remove('inline-flex');
    }
};

window.clearAIGenUploadedFile = function (event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    currentAIGenFile = null;
    currentAIGenFileText = '';
    const input = document.getElementById('ai-gen-file-input');
    if (input) input.value = '';
    const card = document.getElementById('ai-gen-uploaded-file-card');
    if (card) card.classList.add('hidden');
    const dropzone = document.getElementById('ai-gen-dropzone');
    if (dropzone) dropzone.classList.remove('hidden');

    window.unlockAIBorrowAndDescription();
    window.syncAIGenerateButtonState();
};

window.syncAIGenerateButtonState = function () {
    const submitBtn = document.getElementById('ai-generate-submit-btn');
    if (!submitBtn) return;

    // Detect which toggle is currently selected
    const borrowPanel = document.getElementById('ai-panel-borrow');
    const isBorrowActive = borrowPanel && !borrowPanel.classList.contains('hidden');

    let hasSource = false;
    if (isBorrowActive) {
        // Toggle 1: Borrow Material -> requires at least 1 added borrowed material
        hasSource = typeof borrowedMaterialsSet !== 'undefined' && borrowedMaterialsSet.size > 0;
    } else {
        // Toggle 2: Upload Document -> requires an uploaded file OR a description topic
        const topicInput = document.getElementById('ai-gen-topic');
        const rawTopic = topicInput ? topicInput.value.trim() : '';
        hasSource = Boolean(currentAIGenFile) || rawTopic.length > 0;
    }

    if (hasSource) {
        // Unlocked state
        submitBtn.disabled = false;
        submitBtn.classList.remove('opacity-40', 'cursor-not-allowed', 'pointer-events-none');
        submitBtn.classList.add('cursor-pointer');
        submitBtn.removeAttribute('title');
        const warnBanner = document.getElementById('ai-gen-validation-warning');
        if (warnBanner) warnBanner.classList.add('hidden');
    } else {
        // Locked state
        submitBtn.disabled = true;
        submitBtn.classList.add('opacity-40', 'cursor-not-allowed', 'pointer-events-none');
        submitBtn.classList.remove('cursor-pointer');
        submitBtn.setAttribute('title', isBorrowActive ? 'Please borrow at least one course material' : 'Please upload a document or enter a topic description');
    }
};

let pendingSwitchSourceOption = null;

window.openAISwitchSourceModal = function (targetOption, descriptionText) {
    pendingSwitchSourceOption = targetOption;
    const modal = document.getElementById('ai-switch-source-modal');
    const desc = document.getElementById('ai-switch-source-desc');
    if (desc && descriptionText) {
        desc.textContent = descriptionText;
    }
    if (modal) {
        modal.classList.remove('hidden');
    }
};

window.closeAISwitchSourceModal = function () {
    pendingSwitchSourceOption = null;
    const modal = document.getElementById('ai-switch-source-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
};

window.confirmAISwitchSourceAction = function () {
    const targetOption = pendingSwitchSourceOption;
    window.closeAISwitchSourceModal();
    if (targetOption) {
        window.applySwitchAIGenSourceOption(targetOption);
    }
};

window.applySwitchAIGenSourceOption = function (option) {
    // --- Apply tab/panel styles ---
    const panels = ['borrow', 'upload'];
    panels.forEach(function (key) {
        const panel = document.getElementById('ai-panel-' + key);
        const tab = document.getElementById('ai-source-tab-' + key);
        if (!tab) return;
        const icon = document.getElementById('ai-source-icon-' + key);

        if (key === option) {
            if (panel) panel.classList.remove('hidden');
            tab.classList.add('bg-white', 'shadow-2xs', 'border', 'border-slate-200/80', 'font-bold');
            tab.classList.remove('font-semibold');
            tab.querySelectorAll('span').forEach(function (s) {
                s.classList.remove('text-black/40');
                s.classList.add('text-black');
            });
            if (icon) {
                icon.classList.remove('text-black/40');
                icon.classList.add('text-[#15803d]');
            }
        } else {
            if (panel) panel.classList.add('hidden');
            tab.classList.remove('bg-white', 'shadow-2xs', 'border', 'border-slate-200/80', 'font-bold');
            tab.classList.add('font-semibold');
            tab.querySelectorAll('span').forEach(function (s) {
                s.classList.remove('text-black');
                s.classList.add('text-black/40');
            });
            if (icon) {
                icon.classList.remove('text-[#15803d]');
                icon.classList.add('text-black/40');
            }
        }
    });

    // --- Clear data from the tab we left ---
    if (option !== 'upload') {
        // Leaving upload tab: clear file and textarea
        if (typeof window.clearAIGenUploadedFile === 'function' && currentAIGenFile) {
            window.clearAIGenUploadedFile(null, true);
        }
        const topicInput = document.getElementById('ai-gen-topic');
        if (topicInput) topicInput.value = '';
    }

    if (option !== 'borrow') {
        // Leaving borrow tab: clear borrowed materials
        const badgesList = document.getElementById('ai-borrowed-badges-list');
        if (badgesList) badgesList.innerHTML = '';
        if (typeof borrowedMaterialsSet !== 'undefined') {
            try { borrowedMaterialsSet.clear(); } catch(e) {}
        }
        if (typeof window.syncBorrowButtonBadge === 'function') {
            window.syncBorrowButtonBadge();
        }
    }

    window.syncAIGenerateButtonState();
};

window.switchAIGenSourceOption = function (option) {
    // option: 'borrow' | 'upload'

    // --- Detect which tab is currently active ---
    const borrowTab = document.getElementById('ai-source-tab-borrow');
    const currentOption = (borrowTab && borrowTab.classList.contains('bg-white')) ? 'borrow' : 'upload';

    // If clicking the already-active tab, do nothing
    if (currentOption === option) return;

    // --- Check if current tab has data ---
    let hasCurrentData = false;
    let currentLabel = '';
    if (currentOption === 'borrow') {
        const hasBorrowed = typeof borrowedMaterialsSet !== 'undefined' && borrowedMaterialsSet.size > 0;
        if (hasBorrowed) {
            hasCurrentData = true;
            currentLabel = 'borrowed material' + (borrowedMaterialsSet.size > 1 ? 's' : '');
        }
    } else if (currentOption === 'upload') {
        const hasFile = Boolean(currentAIGenFile);
        const topicInput = document.getElementById('ai-gen-topic');
        const hasText = topicInput && topicInput.value.trim().length > 0;
        if (hasFile || hasText) {
            hasCurrentData = true;
            currentLabel = hasFile && hasText ? 'uploaded file and description' : (hasFile ? 'uploaded file' : 'description text');
        }
    }

    // If has data, ask for confirmation using custom modal
    if (hasCurrentData) {
        const targetLabel = option === 'borrow' ? 'Borrow Material' : 'Upload Document';
        const msg = 'Switching to "' + targetLabel + '" will remove your ' + currentLabel + '. Are you sure you want to continue?';
        window.openAISwitchSourceModal(option, msg);
        return;
    }

    // Otherwise switch immediately
    window.applySwitchAIGenSourceOption(option);
};

window.openAIGeneratorModal = function () {
    if (questions && questions.length >= MAX_QUIZ_QUESTIONS) {
        if (typeof window.openAskingPanel === 'function') {
            window.openAskingPanel({
                title: 'Question Limit Reached',
                message: `You have reached the maximum limit of ${MAX_QUIZ_QUESTIONS} questions. You cannot generate more questions.`,
                type: 'warning'
            });
        } else {
            alert(`Maximum limit of ${MAX_QUIZ_QUESTIONS} questions reached.`);
        }
        return;
    }

    const modal = document.getElementById('ai-generator-modal');
    if (modal) {
        const mainView = document.getElementById('ai-generator-main-view');
        const borrowView = document.getElementById('ai-generator-borrow-view');
        if (mainView) mainView.classList.remove('hidden');
        if (borrowView) borrowView.classList.add('hidden');

        modal.classList.remove('hidden');
        syncBodyScrollLock();
        const topicInput = document.getElementById('ai-gen-topic');
        const engineSelect = document.getElementById('ai-gen-engine');
        const typeSelect = document.getElementById('ai-gen-type');
        const countInput = document.getElementById('ai-gen-count');
        const difficultyRadio = document.querySelector('input[name="ai-difficulty"]:checked');

        const remainingSlots = Math.max(1, MAX_QUIZ_QUESTIONS - (questions ? questions.length : 0));
        if (countInput) {
            countInput.max = remainingSlots;
            const currentVal = parseInt(countInput.value, 10);
            if (isNaN(currentVal) || currentVal < 1) {
                countInput.value = Math.min(5, remainingSlots);
            } else if (currentVal > remainingSlots) {
                countInput.value = remainingSlots;
            }
        }

        aiModalInitialState = {
            topic: topicInput ? topicInput.value.trim() : '',
            engine: engineSelect ? engineSelect.value : 'gemini',
            type: typeSelect ? typeSelect.value : 'Mixed',
            count: countInput ? countInput.value : '5',
            difficulty: difficultyRadio ? difficultyRadio.value : 'Medium'
        };

        const warnBanner = document.getElementById('ai-gen-validation-warning');
        if (warnBanner) warnBanner.classList.add('hidden');

        // Reset to default tab (Borrow Material) on every open
        window.switchAIGenSourceOption('borrow');
        if (typeof window.syncAIDropdownLabels === 'function') {
            window.syncAIDropdownLabels();
        }
        if (typeof window.closeAllAIDropdowns === 'function') {
            window.closeAllAIDropdowns();
        }
    }
};

window.hasAIGeneratorChanges = function () {
    const topicInput = document.getElementById('ai-gen-topic');
    const engineSelect = document.getElementById('ai-gen-engine');
    const typeSelect = document.getElementById('ai-gen-type');
    const countInput = document.getElementById('ai-gen-count');
    const difficultyRadio = document.querySelector('input[name="ai-difficulty"]:checked');

    const curTopic = topicInput ? topicInput.value.trim() : '';
    const curEngine = engineSelect ? engineSelect.value : 'gemini';
    const curType = typeSelect ? typeSelect.value : 'Mixed';
    const curCount = countInput ? countInput.value : '5';
    const curDifficulty = difficultyRadio ? difficultyRadio.value : 'Medium';

    return Boolean(currentAIGenFile) ||
           (curTopic !== aiModalInitialState.topic) ||
           (curEngine !== aiModalInitialState.engine) ||
           (curType !== aiModalInitialState.type) ||
           (curCount !== aiModalInitialState.count) ||
           (curDifficulty !== aiModalInitialState.difficulty);
};

let activeDiscardTarget = 'ai';

window.openAIDiscardModal = function (target = 'ai') {
    activeDiscardTarget = target;
    const modal = document.getElementById('ai-discard-modal');
    const title = document.getElementById('discard-modal-title');
    const desc = document.getElementById('discard-modal-desc');

    if (title && desc) {
        if (target === 'import') {
            title.textContent = 'Discard Imported Content?';
            desc.textContent = 'You have entered questions or lecture text to import. Are you sure you want to discard them?';
        } else {
            title.textContent = 'Discard Changes?';
            desc.textContent = 'You have entered prompt details for AI generation. Are you sure you want to discard them?';
        }
    }

    if (modal) {
        modal.classList.remove('hidden');
        syncBodyScrollLock();
    }
};

window.closeAIDiscardModal = function () {
    const modal = document.getElementById('ai-discard-modal');
    if (modal) modal.classList.add('hidden');
    syncBodyScrollLock();
};

window.confirmDiscardAction = function () {
    if (activeDiscardTarget === 'import') {
        const textarea = document.getElementById('import-paste-textarea');
        if (textarea) textarea.value = '';
        window.updateImportPreviewCounter();
        window.closeAIDiscardModal();
        const modal = document.getElementById('import-questions-modal');
        if (modal) modal.classList.add('hidden');
        syncBodyScrollLock();
    } else {
        window.confirmDiscardAIGenerator();
    }
};

window.confirmDiscardAIGenerator = function () {
    const topicInput = document.getElementById('ai-gen-topic');
    const engineSelect = document.getElementById('ai-gen-engine');
    const typeSelect = document.getElementById('ai-gen-type');
    const countInput = document.getElementById('ai-gen-count');
    const mediumRadio = document.querySelector('input[name="ai-difficulty"][value="Medium"]');

    if (topicInput) topicInput.value = '';
    if (engineSelect) engineSelect.value = 'gemini';
    if (typeSelect) typeSelect.value = 'Mixed';
    if (countInput) countInput.value = '5';
    if (mediumRadio) mediumRadio.checked = true;

    if (typeof window.syncAIDropdownLabels === 'function') {
        window.syncAIDropdownLabels();
    }
    if (typeof window.closeAllAIDropdowns === 'function') {
        window.closeAllAIDropdowns();
    }

    window.clearAllBorrowedMaterials();
    window.clearAIGenUploadedFile();

    window.closeAIDiscardModal();
    const modal = document.getElementById('ai-generator-modal');
    if (modal) modal.classList.add('hidden');
    syncBodyScrollLock();
};

// =========================================================================
// CUSTOM DROPDOWN CONTROLLERS FOR AI GENERATOR MODAL
// =========================================================================
function updateAIDropdownPosition(menu, wrapper) {
    if (!menu || !wrapper) return;

    // In desktop mode, dropdown menus always open in the natural downward direction and never get clipped
    const isDesktop = window.innerWidth >= 640;
    if (isDesktop) {
        menu.classList.remove('bottom-full', 'mb-1.5');
        menu.classList.add('top-full', 'mt-1.5');
        return;
    }

    const container = wrapper.closest('.overflow-y-auto') || document.body;
    const containerRect = container.getBoundingClientRect();
    const wrapRect = wrapper.getBoundingClientRect();

    const spaceBelow = containerRect.bottom - wrapRect.bottom;
    const spaceAbove = wrapRect.top - containerRect.top;
    const menuHeight = menu.offsetHeight || (menu.id === 'ai-gen-engine-menu' ? 140 : 250);

    // Natural downward direction (top-full mt-1.5). Only flip upward if bottom space is severely cramped (< menuHeight) and top has ample room
    if (spaceBelow < menuHeight && spaceAbove >= menuHeight + 20) {
        menu.classList.remove('top-full', 'mt-1.5');
        menu.classList.add('bottom-full', 'mb-1.5');
    } else {
        menu.classList.remove('bottom-full', 'mb-1.5');
        menu.classList.add('top-full', 'mt-1.5');
    }
}

window.closeAllAIDropdowns = function () {
    const engineMenu = document.getElementById('ai-gen-engine-menu');
    const engineChevron = document.getElementById('ai-gen-engine-chevron');
    const engineBtn = document.getElementById('ai-gen-engine-btn');
    const engineWrapper = document.getElementById('ai-gen-engine-wrapper');
    if (engineMenu) engineMenu.classList.add('hidden');
    if (engineChevron) engineChevron.classList.remove('rotate-180');
    if (engineBtn) engineBtn.classList.remove('border-[#15803d]', 'border-[#FFD000]', 'bg-white');
    if (engineWrapper) engineWrapper.classList.remove('z-50');

    const typeMenu = document.getElementById('ai-gen-type-menu');
    const typeChevron = document.getElementById('ai-gen-type-chevron');
    const typeBtn = document.getElementById('ai-gen-type-btn');
    const typeWrapper = document.getElementById('ai-gen-type-wrapper');
    if (typeMenu) typeMenu.classList.add('hidden');
    if (typeChevron) typeChevron.classList.remove('rotate-180');
    if (typeBtn) typeBtn.classList.remove('border-[#15803d]', 'border-[#FFD000]', 'bg-white');
    if (typeWrapper) typeWrapper.classList.remove('z-50');
};

window.toggleAIEngineDropdown = function (event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    const typeMenu = document.getElementById('ai-gen-type-menu');
    const typeChevron = document.getElementById('ai-gen-type-chevron');
    const typeBtn = document.getElementById('ai-gen-type-btn');
    const typeWrapper = document.getElementById('ai-gen-type-wrapper');
    if (typeMenu) typeMenu.classList.add('hidden');
    if (typeChevron) typeChevron.classList.remove('rotate-180');
    if (typeBtn) typeBtn.classList.remove('border-[#15803d]', 'border-[#FFD000]', 'bg-white');
    if (typeWrapper) typeWrapper.classList.remove('z-50');

    const menu = document.getElementById('ai-gen-engine-menu');
    const chevron = document.getElementById('ai-gen-engine-chevron');
    const btn = document.getElementById('ai-gen-engine-btn');
    const wrapper = document.getElementById('ai-gen-engine-wrapper');
    if (!menu) return;

    const isHidden = menu.classList.contains('hidden');
    if (isHidden) {
        if (wrapper) {
            updateAIDropdownPosition(menu, wrapper);
            wrapper.classList.add('z-50');
        }
        menu.classList.remove('hidden');
        if (chevron) chevron.classList.add('rotate-180');
        if (btn) {
            btn.classList.remove('border-[#15803d]');
            btn.classList.add('border-[#FFD000]', 'bg-white');
        }
        try {
            menu.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        } catch (e) {}
    } else {
        menu.classList.add('hidden');
        if (wrapper) wrapper.classList.remove('z-50');
        if (chevron) chevron.classList.remove('rotate-180');
        if (btn) btn.classList.remove('border-[#15803d]', 'border-[#FFD000]', 'bg-white');
    }
};

window.selectAIEngine = function (val, label) {
    const sel = document.getElementById('ai-gen-engine');
    if (sel) {
        sel.value = val;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
    }
    const labelEl = document.getElementById('ai-gen-engine-label');
    if (labelEl) labelEl.textContent = label;

    document.querySelectorAll('.ai-engine-opt').forEach(opt => {
        const isMatch = opt.getAttribute('data-value') === val;
        const icon = opt.querySelector('i');
        if (icon) icon.remove();
        if (isMatch) {
            opt.classList.add('bg-emerald-50', 'text-[#15803d]', 'font-semibold');
        } else {
            opt.classList.remove('bg-emerald-50', 'text-[#15803d]', 'font-semibold');
        }
    });

    const menu = document.getElementById('ai-gen-engine-menu');
    const chevron = document.getElementById('ai-gen-engine-chevron');
    const btn = document.getElementById('ai-gen-engine-btn');
    const wrapper = document.getElementById('ai-gen-engine-wrapper');
    if (menu) menu.classList.add('hidden');
    if (wrapper) wrapper.classList.remove('z-50');
    if (chevron) chevron.classList.remove('rotate-180');
    if (btn) btn.classList.remove('border-[#15803d]', 'border-[#FFD000]', 'bg-white');
};

window.toggleAITypeDropdown = function (event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    const engineMenu = document.getElementById('ai-gen-engine-menu');
    const engineChevron = document.getElementById('ai-gen-engine-chevron');
    const engineBtn = document.getElementById('ai-gen-engine-btn');
    const engineWrapper = document.getElementById('ai-gen-engine-wrapper');
    if (engineMenu) engineMenu.classList.add('hidden');
    if (engineChevron) engineChevron.classList.remove('rotate-180');
    if (engineBtn) engineBtn.classList.remove('border-[#15803d]', 'border-[#FFD000]', 'bg-white');
    if (engineWrapper) engineWrapper.classList.remove('z-50');

    const menu = document.getElementById('ai-gen-type-menu');
    const chevron = document.getElementById('ai-gen-type-chevron');
    const btn = document.getElementById('ai-gen-type-btn');
    const wrapper = document.getElementById('ai-gen-type-wrapper');
    if (!menu) return;

    const isHidden = menu.classList.contains('hidden');
    if (isHidden) {
        if (wrapper) {
            updateAIDropdownPosition(menu, wrapper);
            wrapper.classList.add('z-50');
        }
        menu.classList.remove('hidden');
        if (chevron) chevron.classList.add('rotate-180');
        if (btn) {
            btn.classList.remove('border-[#15803d]');
            btn.classList.add('border-[#FFD000]', 'bg-white');
        }
        try {
            menu.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        } catch (e) {}
    } else {
        menu.classList.add('hidden');
        if (wrapper) wrapper.classList.remove('z-50');
        if (chevron) chevron.classList.remove('rotate-180');
        if (btn) btn.classList.remove('border-[#15803d]', 'border-[#FFD000]', 'bg-white');
    }
};

window.selectAIType = function (val, label) {
    const sel = document.getElementById('ai-gen-type');
    if (sel) {
        sel.value = val;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
    }
    const labelEl = document.getElementById('ai-gen-type-label');
    if (labelEl) labelEl.textContent = label;

    document.querySelectorAll('.ai-type-opt').forEach(opt => {
        const isMatch = opt.getAttribute('data-value') === val;
        const icon = opt.querySelector('i');
        if (icon) icon.remove();
        if (isMatch) {
            opt.classList.add('bg-emerald-50', 'text-[#15803d]', 'font-semibold');
        } else {
            opt.classList.remove('bg-emerald-50', 'text-[#15803d]', 'font-semibold');
        }
    });

    const menu = document.getElementById('ai-gen-type-menu');
    const chevron = document.getElementById('ai-gen-type-chevron');
    const btn = document.getElementById('ai-gen-type-btn');
    const wrapper = document.getElementById('ai-gen-type-wrapper');
    if (menu) menu.classList.add('hidden');
    if (wrapper) wrapper.classList.remove('z-50');
    if (chevron) chevron.classList.remove('rotate-180');
    if (btn) btn.classList.remove('border-[#15803d]', 'border-[#FFD000]', 'bg-white');
};

window.syncAIDropdownLabels = function () {
    const engineSelect = document.getElementById('ai-gen-engine');
    const typeSelect = document.getElementById('ai-gen-type');
    if (engineSelect) {
        const val = engineSelect.value || 'gemini';
        const opt = engineSelect.querySelector(`option[value="${val}"]`);
        const label = opt ? opt.textContent : 'Google Gemini';
        const labelEl = document.getElementById('ai-gen-engine-label');
        if (labelEl) labelEl.textContent = label;
        document.querySelectorAll('.ai-engine-opt').forEach(el => {
            const isMatch = el.getAttribute('data-value') === val;
            const icon = el.querySelector('i');
            if (icon) icon.remove();
            if (isMatch) {
                el.classList.add('bg-emerald-50', 'text-[#15803d]', 'font-semibold');
            } else {
                el.classList.remove('bg-emerald-50', 'text-[#15803d]', 'font-semibold');
            }
        });
    }
    if (typeSelect) {
        const val = typeSelect.value || 'Mixed';
        const opt = typeSelect.querySelector(`option[value="${val}"]`);
        const label = opt ? opt.textContent : 'Mixed Types';
        const labelEl = document.getElementById('ai-gen-type-label');
        if (labelEl) labelEl.textContent = label;
        document.querySelectorAll('.ai-type-opt').forEach(el => {
            const isMatch = el.getAttribute('data-value') === val;
            const icon = el.querySelector('i');
            if (icon) icon.remove();
            if (isMatch) {
                el.classList.add('bg-emerald-50', 'text-[#15803d]', 'font-semibold');
            } else {
                el.classList.remove('bg-emerald-50', 'text-[#15803d]', 'font-semibold');
            }
        });
    }
};

document.addEventListener('click', function (e) {
    const engineWrap = document.getElementById('ai-gen-engine-wrapper');
    const typeWrap = document.getElementById('ai-gen-type-wrapper');
    if (engineWrap && !engineWrap.contains(e.target)) {
        const menu = document.getElementById('ai-gen-engine-menu');
        const chevron = document.getElementById('ai-gen-engine-chevron');
        const btn = document.getElementById('ai-gen-engine-btn');
        if (menu) menu.classList.add('hidden');
        if (chevron) chevron.classList.remove('rotate-180');
        if (btn) btn.classList.remove('border-[#15803d]', 'border-[#FFD000]', 'bg-white');
        engineWrap.classList.remove('z-50');
    }
    if (typeWrap && !typeWrap.contains(e.target)) {
        const menu = document.getElementById('ai-gen-type-menu');
        const chevron = document.getElementById('ai-gen-type-chevron');
        const btn = document.getElementById('ai-gen-type-btn');
        if (menu) menu.classList.add('hidden');
        if (chevron) chevron.classList.remove('rotate-180');
        if (btn) btn.classList.remove('border-[#15803d]', 'border-[#FFD000]', 'bg-white');
        typeWrap.classList.remove('z-50');
    }
});

window.closeAIGeneratorModal = function (force) {
    if (!force && window.hasAIGeneratorChanges()) {
        window.openAIDiscardModal('ai');
        return;
    }
    const modal = document.getElementById('ai-generator-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
    if (typeof window.clearAIGenUploadedFile === 'function') {
        window.clearAIGenUploadedFile();
    }
    syncBodyScrollLock();
};

window.openAIConfirmGenerateModal = function () {
    const topicInput = document.getElementById('ai-gen-topic');
    const engineSelect = document.getElementById('ai-gen-engine');
    const typeSelect = document.getElementById('ai-gen-type');
    const countInput = document.getElementById('ai-gen-count');

    let topic = (topicInput?.value || '').trim();
    if (currentAIGenFile) {
        topic = `Uploaded Document: ${currentAIGenFile.name}`;
    } else if (!topic) {
        topic = 'General Knowledge and Subject Concepts';
    }
    const engine = engineSelect?.value || 'gemini';
    const selectedType = typeSelect?.value || 'Mixed';
    let count = parseInt(countInput?.value, 10);
    if (isNaN(count) || count < 1) count = 1;
    if (count > 50) count = 50;

    const engineLabel = engine === 'grok' ? 'xAI Grok' : (engine === 'both' ? 'Hybrid AI (Gemini + Grok)' : 'Google Gemini');

    const titleEl = document.getElementById('ai-confirm-generate-title');
    const descEl = document.getElementById('ai-confirm-generate-desc');

    if (titleEl) titleEl.textContent = `Generate ${count} ${count === 1 ? 'Question' : 'Questions'}?`;
    if (descEl) descEl.textContent = `AI will automatically create ${count} ${selectedType} questions grounded in your selected materials and Senior High curriculum competencies using ${engineLabel}.`;

    const modal = document.getElementById('ai-confirm-generate-modal');
    if (modal) {
        modal.classList.remove('hidden');
        syncBodyScrollLock();
    }
};

window.closeAIConfirmGenerateModal = function () {
    const modal = document.getElementById('ai-confirm-generate-modal');
    if (modal) modal.classList.add('hidden');
    syncBodyScrollLock();
};

// =========================================================================
// AI RESTRICTIONS & GENERATION GUARDRAILS
// =========================================================================

window.generateAIQuestions = function () {
    const borrowPanel = document.getElementById('ai-panel-borrow');
    const isBorrowActive = borrowPanel && !borrowPanel.classList.contains('hidden');

    let hasSource = false;
    if (isBorrowActive) {
        hasSource = typeof borrowedMaterialsSet !== 'undefined' && borrowedMaterialsSet.size > 0;
        if (!hasSource) {
            const borrowBtn = document.getElementById('ai-borrow-trigger-btn');
            if (borrowBtn) {
                borrowBtn.classList.add('!border-rose-300');
                setTimeout(() => {
                    borrowBtn.classList.remove('!border-rose-300');
                }, 1800);
            }
            const warnBanner = document.getElementById('ai-gen-validation-warning');
            if (warnBanner) {
                const warnText = document.getElementById('ai-gen-warning-text');
                if (warnText) warnText.textContent = 'Please borrow at least one course material before generating.';
                warnBanner.classList.remove('hidden');
                warnBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
            window.syncAIGenerateButtonState();
            return;
        }
    } else {
        const topicInput = document.getElementById('ai-gen-topic');
        const rawTopic = topicInput ? topicInput.value.trim() : '';
        hasSource = Boolean(currentAIGenFile) || rawTopic.length > 0;
        if (!hasSource) {
            const dropzone = document.getElementById('ai-gen-dropzone');
            if (dropzone) {
                dropzone.classList.add('!border-rose-400', 'bg-rose-50/20');
                setTimeout(() => {
                    dropzone.classList.remove('!border-rose-400', 'bg-rose-50/20');
                }, 1800);
            }
            if (topicInput) {
                topicInput.focus();
                topicInput.classList.add('!border-rose-500', 'bg-rose-50/30');
                setTimeout(() => {
                    topicInput.classList.remove('!border-rose-500', 'bg-rose-50/30');
                }, 1800);
            }
            const warnBanner = document.getElementById('ai-gen-validation-warning');
            if (warnBanner) {
                const warnText = document.getElementById('ai-gen-warning-text');
                if (warnText) warnText.textContent = 'Please upload a document or enter a topic description before generating.';
                warnBanner.classList.remove('hidden');
                warnBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
            window.syncAIGenerateButtonState();
            return;
        }
    }

    // Restriction 2: Question count must be between 1 and 50
    const countInput = document.getElementById('ai-gen-count');
    let countVal = parseInt(countInput?.value, 10);
    if (isNaN(countVal) || countVal < 1) {
        if (countInput) countInput.value = '1';
    } else if (countVal > 50) {
        if (countInput) countInput.value = '50';
    }

    window.openAIConfirmGenerateModal();
};

window.executeAIQuestionGeneration = async function () {
    window.closeAIConfirmGenerateModal();

    const borrowPanel = document.getElementById('ai-panel-borrow');
    const isBorrowActive = borrowPanel && !borrowPanel.classList.contains('hidden');

    const topicInput = document.getElementById('ai-gen-topic');
    const rawTopic = (topicInput?.value || '').trim();

    let topic = '';
    let fileContent = '';

    if (isBorrowActive) {
        // Must pick the selected toggle (Borrow) and its added materials
        const hasBorrowed = typeof borrowedMaterialsSet !== 'undefined' && borrowedMaterialsSet.size > 0;
        if (!hasBorrowed) {
            window.syncAIGenerateButtonState();
            if (typeof window.showWarningToast === 'function') {
                window.showWarningToast('Please borrow at least one material before generating.');
            }
            return;
        }

        const materialsMap = (typeof window.getRealCourseMaterials === 'function') ? window.getRealCourseMaterials() : {};
        const titles = [];
        const prompts = [];
        borrowedMaterialsSet.forEach(key => {
            const data = materialsMap[key];
            if (data) {
                if (data.title) titles.push(data.title);
                if (data.prompt) prompts.push(data.prompt);
            }
        });
        topic = titles.length > 0 ? titles.join(', ') : 'Borrowed Course Materials';
        fileContent = prompts.join('\n\n---\n\n');
    } else {
        // Must pick the selected toggle (Upload) and its added file + topic
        if (!currentAIGenFile && !rawTopic) {
            window.syncAIGenerateButtonState();
            if (typeof window.showWarningToast === 'function') {
                window.showWarningToast('Please upload a document or enter a topic before generating.');
            }
            return;
        }

        if (currentAIGenFile) {
            const cleanName = currentAIGenFile.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim();
            const ext = (currentAIGenFile.name.split('.').pop() || '').toLowerCase();
            const isImage = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext) || currentAIGenFile.type.startsWith('image/');
            const isVideo = ext === 'mp4' || currentAIGenFile.type === 'video/mp4';

            if (!currentAIGenFileText) {
                if (isImage) {
                    currentAIGenFileText = `Image Grounding Material: ${cleanName}\nFile Name: ${currentAIGenFile.name}\nMedia Format: Image (${ext.toUpperCase()})\nContext: This educational graphic/diagram illustrates visual structures, labeled parts, concepts, and relationships of ${cleanName}. Generate educational quiz question items evaluating visual identification, processes, definitions, and operational comprehension of ${cleanName}.`;
                } else if (isVideo) {
                    currentAIGenFileText = `Video Grounding Material: ${cleanName}\nFile Name: ${currentAIGenFile.name}\nMedia Format: MP4 Video Lesson\nContext: This educational video demonstrates technical procedures, step-by-step methodologies, subject explanations, and practical takeaways for ${cleanName}. Generate comprehensive quiz questions evaluating core principles, demonstrated phases, terminology, and instructional takeaways from ${cleanName}.`;
                } else {
                    try {
                        currentAIGenFileText = (await currentAIGenFile.text()).trim();
                    } catch (e) {
                        console.warn('Error reading AI file:', e);
                    }
                }
            }
            fileContent = currentAIGenFileText || '';
            topic = cleanName || 'Uploaded Material';
            // If textarea also has content, append it as additional context after the file
            if (rawTopic) {
                fileContent = fileContent + (fileContent ? '\n\n' : '') + rawTopic;
                topic = topic + ' — ' + rawTopic;
            }
        } else {
            // Textarea only
            topic = rawTopic;
            fileContent = rawTopic;
        }
    }

    const engine = engineSelect?.value || 'gemini';
    const selectedType = typeSelect?.value || 'Mixed';
    
    // Main page limit of MAX_QUIZ_QUESTIONS questions check
    const currentQCount = questions ? questions.length : 0;
    const remainingSlots = Math.max(0, MAX_QUIZ_QUESTIONS - currentQCount);
    if (remainingSlots <= 0) {
        if (typeof window.openAskingPanel === 'function') {
            window.openAskingPanel({
                title: 'Question Limit Reached',
                message: `You have reached the maximum limit of ${MAX_QUIZ_QUESTIONS} questions. Cannot generate more questions.`,
                type: 'warning'
            });
        } else {
            alert(`Maximum limit of ${MAX_QUIZ_QUESTIONS} questions reached.`);
        }
        return;
    }

    // Validate count limit (1 - 100, capped by remaining quiz slots)
    let count = parseInt(countInput?.value, 10);
    if (isNaN(count) || count < 1) count = 1;
    if (count > MAX_QUIZ_QUESTIONS) count = MAX_QUIZ_QUESTIONS;
    if (count > remainingSlots) count = remainingSlots;

    const difficulty = difficultyRadio?.value || 'Medium';
    const engineLabel = engine === 'grok' ? 'xAI Grok' : (engine === 'both' ? 'Hybrid AI (Gemini + Grok)' : 'Google Gemini');

    // Show Loading State on Submit Button
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
            <i class="fa-solid fa-circle-notch fa-spin text-xs"></i>
            <span>Generating with ${engineLabel}...</span>
        `;
    }

    setTimeout(() => {
        const generated = buildAIPromptQuestions(topic, selectedType, count, difficulty, fileContent);
        const startIndex = questions.length;
        questions.push(...generated);
        activeQuestionIndex = startIndex < questions.length ? startIndex : Math.max(0, questions.length - 1);

        renderQuestions();
        updateStats();
        window.closeAIGeneratorModal(true);

        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `
                <i class="fa-solid fa-bolt text-xs text-[#FFD000]"></i>
                <span>Generate</span>
            `;
            window.syncAIGenerateButtonState();
        }

        // Scroll to the new active question
        const container = document.getElementById('active-question-container');
        if (container) {
            container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, 750);
};

function buildAIPromptQuestions(topic, selectedType, count, difficulty, fileContent = '') {
    const result = [];

    // Curriculum keyword and domain extraction from file content or topic
    const sourceText = (fileContent && fileContent.length > 20) ? fileContent : topic;
    const topicClean = sourceText.replace(/[^a-zA-Z0-9\s]/g, ' ').trim();
    const words = topicClean.split(/\s+/).filter(w => w.length > 3 && !['this', 'that', 'with', 'from', 'have', 'were', 'which', 'their', 'about'].includes(w.toLowerCase()));
    const uniqueWords = [...new Set(words)];
    const primaryKey = uniqueWords[0] || 'Core Concept';
    const secondaryKey = uniqueWords[1] || 'Standard Procedure';
    const tertiaryKey = uniqueWords[2] || 'System Architecture';
    const availableTypes = ['Multiple Choice', 'True or False', 'Short Answer', 'Essay', 'Matching Type', 'Enumeration'];

    for (let i = 0; i < count; i++) {
        let type = selectedType;
        if (selectedType === 'Mixed') {
            type = availableTypes[i % availableTypes.length];
        }

        // Restriction: Default points must be exactly 0 for all generated question types
        if (type === 'Multiple Choice') {
            const questionText = `In ${topic}, what is the fundamental purpose or role of ${primaryKey}?`;
            const correctChoice = `Facilitates verified execution, standardized processing, and structured operations in ${primaryKey}`;
            const choices = [
                correctChoice,
                `Bypasses structural layer protocols to eliminate validation checks`,
                `Compresses raw data streams without preserving ${secondaryKey} indexing`,
                `Suppresses system logging and prevents exception handling execution`
            ];
            result.push({
                type: 'Multiple Choice',
                question: questionText,
                choices: choices,
                answer: correctChoice,
                points: 0
            });
        } else if (type === 'True or False') {
            const isTrue = (i % 2 === 0);
            result.push({
                type: 'True or False',
                question: isTrue 
                    ? `In ${topic}, the standard operational framework of ${primaryKey} requires consistent data integrity and synchronized execution.`
                    : `In ${topic}, ${primaryKey} operates completely independent of system validation rules and security protocols.`,
                answer: isTrue ? 'True' : 'False',
                points: 0
            });
        } else if (type === 'Short Answer') {
            result.push({
                type: 'Short Answer',
                question: `Identify the core standard terminology or protocol utilized for ${primaryKey} in ${topic}.`,
                answers: [`${primaryKey} Protocol`, `${primaryKey}`],
                answer: `${primaryKey} Protocol`,
                points: 0
            });
        } else if (type === 'Essay') {
            result.push({
                type: 'Essay',
                question: `Explain the practical significance and core principles of ${primaryKey} within the context of ${topic}.`,
                rubric: `Clear explanation of ${primaryKey} foundational principles (3 pts), accurate application to ${topic} (1 pt), and coherent technical structure (1 pt).`,
                evaluationMode: 'manual',
                points: 0
            });
        } else if (type === 'Matching Type') {
            result.push({
                type: 'Matching Type',
                question: `Match each ${topic} component with its corresponding technical definition.`,
                pairs: [
                    { premise: `${primaryKey} Control Unit`, target: `Main operational and management module for ${topic}`, points: 0 },
                    { premise: `${secondaryKey} Protocol`, target: `Standardized specification governing data exchange and verification`, points: 0 },
                    { premise: `${tertiaryKey} Interface`, target: `System boundary connecting internal processing with external services`, points: 0 }
                ],
                points: 0
            });
        } else if (type === 'Enumeration') {
            result.push({
                type: 'Enumeration',
                question: `Enumerate the essential components or architectural phases of ${topic}.`,
                items: [
                    `${primaryKey} Foundation Layer`,
                    `${secondaryKey} Control Interface`,
                    `${tertiaryKey} Data Processing Unit`
                ],
                points: 0
            });
        }
    }

    return result;
}

let currentImportFile = null;

window.updateConvertQuestionsBtnState = function () {
    const btn = document.getElementById('execute-import-btn');
    const textarea = document.getElementById('import-paste-textarea');
    if (!btn) return;

    const text = textarea ? textarea.value.trim() : '';
    const detectedQuestions = text ? window.parseImportedTextToQuestions(text) : [];
    const hasAtLeastOneQuestion = detectedQuestions.length >= 1;
    const hasUploadedFile = Boolean(currentImportFile);

    const isUnlocked = hasAtLeastOneQuestion || hasUploadedFile;

    btn.disabled = !isUnlocked;
    if (isUnlocked) {
        btn.className = 'px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-[#15803d] hover:bg-emerald-800 transition-all flex items-center justify-center cursor-pointer shadow-md';
    } else {
        btn.className = 'px-6 py-2.5 rounded-xl text-sm font-bold text-slate-400 bg-slate-200 opacity-50 cursor-not-allowed pointer-events-none transition-all flex items-center justify-center shadow-none';
    }
};

window.openImportQuestionsModal = function () {
    if (questions && questions.length >= MAX_QUIZ_QUESTIONS && !(questions.length === 1 && !questions[0].question.trim())) {
        if (typeof window.openAskingPanel === 'function') {
            window.openAskingPanel({
                title: 'Question Limit Reached',
                message: `You have reached the maximum limit of ${MAX_QUIZ_QUESTIONS} questions. Cannot import more questions.`,
                type: 'warning'
            });
        } else {
            alert(`Maximum limit of ${MAX_QUIZ_QUESTIONS} questions reached.`);
        }
        return;
    }

    const modal = document.getElementById('import-questions-modal');
    if (modal) {
        modal.classList.remove('hidden');
        window.updateImportPreviewCounter();
        window.updateConvertQuestionsBtnState();
        const textarea = document.getElementById('import-paste-textarea');
        if (textarea) textarea.focus();
    }
};

window.closeImportQuestionsModal = function (force = false) {
    const textarea = document.getElementById('import-paste-textarea');
    const hasContent = (textarea && textarea.value.trim().length > 0) || Boolean(currentImportFile);

    if (!force && hasContent) {
        if (typeof window.openAskingPanel === 'function') {
            window.openAskingPanel({
                title: 'Discard Imported Content?',
                message: 'Are you sure you want to close? Any pasted text or uploaded document will be cleared.',
                confirmText: 'Discard & Close',
                cancelText: 'Cancel',
                type: 'warning',
                onConfirm: () => {
                    window.closeImportQuestionsModal(true);
                }
            });
            return;
        }
    }

    const modal = document.getElementById('import-questions-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
    currentImportFile = null;
    if (textarea) textarea.value = '';
    const fileInput = document.getElementById('import-file-input');
    if (fileInput) fileInput.value = '';
    const card = document.getElementById('import-uploaded-file-card');
    if (card) card.classList.add('hidden');

    const dropzone = document.getElementById('import-dropzone');
    const templatesPanel = document.getElementById('import-starter-templates-panel');
    const pasteSection = document.getElementById('import-paste-section');
    const lockedBadge = document.getElementById('import-paste-locked-badge');
    const helper = document.getElementById('import-paste-helper');
    const pasteLabel = document.getElementById('import-paste-label');

    if (dropzone) dropzone.classList.remove('hidden');
    if (templatesPanel) templatesPanel.classList.remove('hidden');
    if (pasteSection) pasteSection.classList.remove('hidden');

    if (textarea) {
        textarea.value = '';
        textarea.readOnly = false;
        textarea.classList.remove('is-locked');
    }
    if (lockedBadge) {
        lockedBadge.classList.add('hidden');
        lockedBadge.classList.remove('inline-flex');
    }
    if (pasteLabel) {
        pasteLabel.textContent = 'Or paste your questions below:';
    }
    if (helper) {
        helper.innerHTML = 'Enter your questions only (no answer keys needed). Press <kbd class="px-1.5 py-0.5 rounded bg-slate-200 text-black font-semibold text-[9px] sm:text-[10px]">Enter</kbd> for each new line to create a new numbered question item.';
    }

    window.updateImportPreviewCounter();
    window.updateConvertQuestionsBtnState();
    syncBodyScrollLock();
};

window.previewSampleQuizTemplate = function (type = 'notes', format = 'txt') {
    const isNotes = (type === 'notes');
    const prefix = isNotes ? 'Lesson_Notes_Template' : 'Question_Sheet_Template';
    const fileName = `${prefix}.${format}`;
    const fileUrl = `Document files/${fileName}`;

    // PDF: Keep original browser viewer
    if (format === 'pdf') {
        window.open(fileUrl, '_blank', 'noopener,noreferrer');
        return;
    }

    // Mobile: Download DOCX and TXT directly
    const isMobile = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile && (format === 'docx' || format === 'txt')) {
        const a = document.createElement('a');
        a.href = fileUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
    }

    if (typeof window.openDocumentViewer === 'function') {
        window.openDocumentViewer(fileName, fileUrl, format);
    } else {
        window.open(fileUrl, '_blank', 'noopener,noreferrer');
    }
};

window.downloadSampleQuizTemplate = function (format = 'txt') {
    window.previewSampleQuizTemplate('notes', format);
};

window.displayImportUploadedFileCard = function (file) {
    const card = document.getElementById('import-uploaded-file-card');
    const nameEl = document.getElementById('import-file-name');
    const metaEl = document.getElementById('import-file-meta');
    const iconEl = document.getElementById('import-file-icon');
    const iconWrap = document.getElementById('import-file-icon-wrap');
    const badgeEl = document.getElementById('import-file-badge');
    if (!card || !file) return;

    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const sizeKb = (file.size / 1024).toFixed(1);
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    const sizeFormatted = file.size > 1024 * 1024 ? `${sizeMb} MB` : `${sizeKb} KB`;

    if (nameEl) nameEl.textContent = file.name;
    if (metaEl) metaEl.textContent = `${sizeFormatted} • Ready for conversion`;

    if (badgeEl) {
        badgeEl.textContent = ext.toUpperCase();
    }

    if (iconEl && iconWrap) {
        if (ext === 'pdf') {
            iconWrap.className = 'w-10 h-10 rounded-xl bg-red-50 border border-red-100 text-red-500 flex items-center justify-center shrink-0';
            iconEl.className = 'fa-solid fa-file-pdf text-lg text-red-500';
            if (badgeEl) badgeEl.className = 'text-[9px] px-2 py-0.5 whitespace-nowrap bg-red-50 text-red-700 border border-red-200/70 font-bold rounded-md leading-tight inline-flex items-center justify-center text-center uppercase';
        } else if (ext === 'pptx' || ext === 'ppt') {
            iconWrap.className = 'w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 text-orange-500 flex items-center justify-center shrink-0';
            iconEl.className = 'fa-solid fa-file-powerpoint text-lg text-orange-500';
            if (badgeEl) badgeEl.className = 'text-[9px] px-2 py-0.5 whitespace-nowrap bg-orange-50 text-orange-700 border border-orange-200/70 font-bold rounded-md leading-tight inline-flex items-center justify-center text-center uppercase';
        } else if (ext === 'docx' || ext === 'doc') {
            iconWrap.className = 'w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0';
            iconEl.className = 'fa-solid fa-file-word text-lg text-blue-600';
            if (badgeEl) badgeEl.className = 'text-[9px] px-2 py-0.5 whitespace-nowrap bg-blue-50 text-blue-700 border border-blue-200/70 font-bold rounded-md leading-tight inline-flex items-center justify-center text-center uppercase';
        } else {
            iconWrap.className = 'w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0';
            iconEl.className = 'fa-solid fa-file-lines text-lg text-slate-700';
            if (badgeEl) badgeEl.className = 'text-[9px] px-2 py-0.5 whitespace-nowrap bg-slate-100 text-slate-700 border border-slate-300 font-bold rounded-md leading-tight inline-flex items-center justify-center text-center uppercase';
        }
    }

    const dropzone = document.getElementById('import-dropzone');
    const templatesPanel = document.getElementById('import-starter-templates-panel');
    const pasteSection = document.getElementById('import-paste-section');
    const textarea = document.getElementById('import-paste-textarea');
    const lockedBadge = document.getElementById('import-paste-locked-badge');
    const helper = document.getElementById('import-paste-helper');
    const pasteLabel = document.getElementById('import-paste-label');

    if (dropzone) dropzone.classList.add('hidden');
    // Keep templates panel visible at all times
    if (templatesPanel) templatesPanel.classList.remove('hidden');
    if (pasteSection) pasteSection.classList.remove('hidden');

    card.classList.remove('hidden');

    // Lock description / paste textarea to imported document
    if (textarea) {
        textarea.readOnly = true;
        textarea.classList.add('is-locked');
    }
    if (lockedBadge) {
        lockedBadge.classList.remove('hidden');
        lockedBadge.classList.add('inline-flex');
    }
    if (pasteLabel) {
        pasteLabel.textContent = 'Questions extracted from document:';
    }
    if (helper) {
        helper.innerHTML = '<span class="text-amber-800 font-semibold"><i class="fa-solid fa-lock text-[9px] mr-1"></i>Text area is locked to imported file.</span> To edit or paste manually, click <i class="fa-solid fa-trash-can text-[10px] text-red-500 mx-0.5"></i> on the file above to remove it.';
    }
};

window.clearImportUploadedFile = function (event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    currentImportFile = null;
    const input = document.getElementById('import-file-input');
    if (input) input.value = '';
    const card = document.getElementById('import-uploaded-file-card');
    if (card) card.classList.add('hidden');

    const dropzone = document.getElementById('import-dropzone');
    const templatesPanel = document.getElementById('import-starter-templates-panel');
    const pasteSection = document.getElementById('import-paste-section');
    const textarea = document.getElementById('import-paste-textarea');
    const lockedBadge = document.getElementById('import-paste-locked-badge');
    const helper = document.getElementById('import-paste-helper');
    const pasteLabel = document.getElementById('import-paste-label');

    if (dropzone) dropzone.classList.remove('hidden');
    if (templatesPanel) templatesPanel.classList.remove('hidden');
    if (pasteSection) pasteSection.classList.remove('hidden');

    if (textarea) {
        textarea.value = '';
        textarea.readOnly = false;
        textarea.classList.remove('is-locked');
    }
    if (lockedBadge) {
        lockedBadge.classList.add('hidden');
        lockedBadge.classList.remove('inline-flex');
    }
    if (pasteLabel) {
        pasteLabel.textContent = 'Or paste your questions below:';
    }
    if (helper) {
        helper.innerHTML = 'Enter your questions only (no answer keys needed). Press <kbd class="px-1.5 py-0.5 rounded bg-slate-200 text-black font-semibold text-[9px] sm:text-[10px]">Enter</kbd> for each new line to create a new numbered question item.';
    }

    window.updateImportPreviewCounter();
    window.updateConvertQuestionsBtnState();
};

window.handleImportFileSelect = function (event) {
    const file = event.target?.files?.[0];
    if (file) {
        window.processImportedFile(file);
    }
};

window.handleImportFileDrop = function (event) {
    event.preventDefault();
    const dropzone = document.getElementById('import-dropzone');
    if (dropzone) {
        dropzone.classList.remove('border-[#FFD000]', 'bg-[#FFD000]/10');
    }
    const file = event.dataTransfer?.files?.[0];
    if (file) {
        window.processImportedFile(file);
    }
};

window.processImportedFile = async function (file) {
    if (!file) return;

    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const isImageOrVideo = (file.type && (file.type.startsWith('image/') || file.type.startsWith('video/'))) ||
        ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'mp4', 'avi', 'mkv', 'mov', 'webm'].includes(ext);

    if (isImageOrVideo) {
        if (typeof window.openAskingPanel === 'function') {
            window.openAskingPanel({
                title: 'Images & Videos Not Supported in Import Questions',
                message: 'Import Questions only converts questions from text documents (.docx, .pdf, .txt, .md, .pptx). To ground and generate questions and answers from images or MP4 videos, please use "Generate Questions with SIGMA AI".',
                type: 'warning'
            });
        } else {
            alert('Images and videos cannot be uploaded in Import Questions. Please use Generate Questions with SIGMA AI.');
        }
        return;
    }

    const allowedExts = ['txt', 'docx', 'doc', 'pdf', 'md', 'pptx', 'csv'];

    if (!allowedExts.includes(ext)) {
        if (typeof window.openAskingPanel === 'function') {
            window.openAskingPanel({
                title: 'Unsupported File Format',
                message: `The file "${file.name}" is not supported. Please upload a .docx, .pdf, .txt, .md, or .pptx document.`,
                type: 'warning'
            });
        } else {
            alert('Unsupported file format. Please upload a .docx, .pdf, .txt, .md, or .pptx document.');
        }
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
        if (typeof window.openAskingPanel === 'function') {
            window.openAskingPanel({
                title: 'File Too Large',
                message: `The selected file exceeds the 10MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB).`,
                type: 'warning'
            });
        } else {
            alert('File size exceeds the 10MB limit.');
        }
        return;
    }

    currentImportFile = file;
    window.displayImportUploadedFileCard(file);
    window.updateConvertQuestionsBtnState();

    const textarea = document.getElementById('import-paste-textarea');

    try {
        if ((ext === 'docx' || ext === 'doc') && window.mammoth) {
            const arrayBuffer = await file.arrayBuffer();
            const result = await window.mammoth.extractRawText({ arrayBuffer: arrayBuffer });
            if (textarea && result.value) {
                textarea.value = result.value;
                window.updateImportPreviewCounter();
            }
        } else if (ext === 'pdf' && window.pdfjsLib) {
            if (!window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
                window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            }
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += pageText + '\n\n';
            }
            if (textarea && fullText.trim()) {
                textarea.value = fullText.trim();
                window.updateImportPreviewCounter();
            }
        } else if (ext === 'pptx' && window.JSZip) {
            const arrayBuffer = await file.arrayBuffer();
            const zip = await window.JSZip.loadAsync(arrayBuffer);
            const slideFiles = Object.keys(zip.files).filter(name => /^ppt\/slides\/slide\d+\.xml$/i.test(name));
            slideFiles.sort((a, b) => {
                const numA = parseInt(a.match(/slide(\d+)\.xml/i)?.[1] || '0', 10);
                const numB = parseInt(b.match(/slide(\d+)\.xml/i)?.[1] || '0', 10);
                return numA - numB;
            });
            let fullText = '';
            for (const slidePath of slideFiles) {
                const xmlStr = await zip.files[slidePath].async('string');
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlStr, 'text/xml');
                const textNodes = xmlDoc.getElementsByTagName('a:t');
                let slideText = '';
                for (let j = 0; j < textNodes.length; j++) {
                    slideText += (textNodes[j].textContent || '') + ' ';
                }
                if (slideText.trim()) {
                    fullText += slideText.trim() + '\n\n';
                }
            }
            if (textarea && fullText.trim()) {
                textarea.value = fullText.trim();
                window.updateImportPreviewCounter();
            }
        } else if (ext === 'txt' || ext === 'md' || ext === 'csv') {
            const rawText = await file.text();
            if (textarea && rawText) {
                textarea.value = rawText;
                window.updateImportPreviewCounter();
            }
        }
    } catch (err) {
        console.warn('Error reading imported file content:', err);
    }

    window.updateConvertQuestionsBtnState();
};

window.updateImportPreviewCounter = function () {
    const textarea = document.getElementById('import-paste-textarea');
    const counter = document.getElementById('import-detected-count');
    if (!textarea) return;

    const text = textarea.value.trim();
    if (!text) {
        if (counter) counter.textContent = '';
    } else {
        const parsed = window.parseImportedTextToQuestions(text);
        if (counter) {
            if (parsed.length > 0) {
                counter.textContent = `✓ Detected ${parsed.length} ${parsed.length === 1 ? 'question' : 'questions'}`;
                counter.className = 'text-emerald-700 font-bold';
            } else {
                counter.textContent = 'No structured questions detected';
                counter.className = 'text-amber-600 font-semibold text-[11px]';
            }
        }
    }
    window.updateConvertQuestionsBtnState();
};

window.parseImportedTextToQuestions = function (rawText) {
    if (!rawText || !rawText.trim()) return [];

    const normalized = rawText.replace(/\r\n/g, '\n').trim();
    const lines = normalized.split('\n').map(l => l.trim()).filter(Boolean);

    // Check if it's lesson notes with bullet definitions (e.g. "• Term: Definition")
    const bulletDefs = [];
    lines.forEach(line => {
        const defMatch = line.match(/^[-•*]\s*([^:]+):\s*(.+)$/);
        if (defMatch) {
            bulletDefs.push({ term: defMatch[1].trim(), def: defMatch[2].trim() });
        }
    });

    if (bulletDefs.length >= 2 && !lines.some(l => /^[a-dA-D][\.\)]\s+/.test(l))) {
        // Concept-based Question Generation from Lesson Notes
        const parsed = [];
        const allTerms = bulletDefs.map(b => b.term);

        bulletDefs.forEach((item, idx) => {
            const distractors = allTerms.filter(t => t !== item.term).slice(0, 3);
            while (distractors.length < 3) {
                distractors.push(`Secondary Concept ${distractors.length + 1}`);
            }
            const choices = [item.term, ...distractors].sort(() => 0.5 - Math.random());

            parsed.push({
                type: 'Multiple Choice',
                question: `Which concept refers to: "${item.def}"?`,
                choices: choices,
                answer: item.term,
                points: 5
            });

            if (idx % 2 === 1) {
                parsed.push({
                    type: 'True or False',
                    question: `True or False: ${item.term} is responsible for: ${item.def}`,
                    answer: 'True',
                    points: 5
                });
            }
        });
        return parsed;
    }

    // Check if input is a simple line-by-line question list (each line is a separate question)
    const hasChoicesOrKeys = lines.some(l => 
        /^(\*?[a-dA-D][\.\)]|\*?\([a-dA-D]\))\s+/i.test(l) ||
        /^Answer:\s*/i.test(l) ||
        /^Rubric:\s*/i.test(l) ||
        /^Pairs?:/i.test(l) ||
        /^Items?:/i.test(l)
    );

    // If there are no multi-line choices/answers or blank lines separating blocks, treat every line as an individual question
    if (!hasChoicesOrKeys && !normalized.includes('\n\n') && lines.length > 1) {
        return lines.map(line => {
            const cleanPrompt = line.replace(/^(\d+[\.\)]|\bQ\d+[:\.]|\bQuestion\s+\d+[:\.])\s*/i, '').trim();
            const isTF = /^(True\s+or\s+False|True\/False)/i.test(cleanPrompt);
            return {
                type: isTF ? 'True or False' : 'Multiple Choice',
                question: cleanPrompt,
                choices: isTF ? [] : ['', '', '', ''],
                answer: '',
                answers: [''],
                items: [],
                pairs: [],
                rubric: '',
                evaluationMode: '',
                points: 5
            };
        }).filter(q => Boolean(q.question));
    }

    // Structured question blocks
    const blocks = normalized.split(/\n\s*\n+/);
    const parsedQuestions = [];

    blocks.forEach((block) => {
        const bLines = block.split('\n').map(l => l.trim()).filter(Boolean);
        if (bLines.length === 0) return;

        let firstLine = bLines[0].replace(/^(\d+[\.\)]|\bQ\d+[:\.]|\bQuestion\s+\d+[:\.])\s*/i, '');
        let qType = '';
        let questionText = firstLine;
        let choices = [];
        let answer = '';
        let answers = [];
        let items = [];
        let pairs = [];
        let rubric = '';
        let evaluationMode = '';
        let points = 5;

        const choiceLines = [];
        const pairLines = [];
        const itemLines = [];
        let inPairsBlock = false;
        let inItemsBlock = false;

        for (let i = 1; i < bLines.length; i++) {
            const line = bLines[i];

            if (/^Points:\s*(\d+)/i.test(line)) {
                points = parseInt(line.match(/^Points:\s*(\d+)/i)[1]) || 5;
            } else if (/^Rubric:\s*/i.test(line)) {
                rubric = line.replace(/^Rubric:\s*/i, '').trim();
                qType = 'Essay';
            } else if (/^Evaluation:\s*/i.test(line)) {
                const evalVal = line.replace(/^Evaluation:\s*/i, '').trim().toLowerCase();
                evaluationMode = evalVal.includes('auto') ? 'auto' : (evalVal.includes('manual') ? 'manual' : '');
                qType = 'Essay';
            } else if (/^Pairs?:/i.test(line) || /^Match(ing)?:/i.test(line)) {
                inPairsBlock = true;
                inItemsBlock = false;
                qType = 'Matching Type';
            } else if (/^Items?:/i.test(line) || /^Required:?/i.test(line)) {
                inItemsBlock = true;
                inPairsBlock = false;
                qType = 'Enumeration';
            } else if (/^(\*?[a-dA-D][\.\)]|\*?\([a-dA-D]\))\s+/.test(line)) {
                choiceLines.push(line);
            } else if (/^(Answer(\s*Key)?|Correct(\s*Answer)?|Key|Ans)[:\s-]/i.test(line)) {
                answer = line.replace(/^(Answer(\s*Key)?|Correct(\s*Answer)?|Key|Ans)[:\s-]*/i, '').trim();
            } else if (line.includes('->') || line.includes('=>') || (inPairsBlock && /^[-•*]?\s*.+/.test(line))) {
                if (line.includes('->') || line.includes('=>')) {
                    const parts = line.replace(/^[-•*]\s*/, '').split(/->|=>/);
                    if (parts.length >= 2) {
                        pairLines.push({ premise: parts[0].trim(), target: parts[1].trim() });
                        qType = 'Matching Type';
                    }
                } else if (inPairsBlock) {
                    const parts = line.replace(/^[-•*]\s*/, '').split(/[:\-]/);
                    if (parts.length >= 2) {
                        pairLines.push({ premise: parts[0].trim(), target: parts.slice(1).join(':').trim() });
                    }
                }
            } else if (/^[-•*]\s+/.test(line) || inItemsBlock) {
                itemLines.push(line.replace(/^[-•*]\s+/, '').trim());
            }
        }

        // Determine Type if not explicitly resolved:
        if (choiceLines.length >= 2) {
            qType = 'Multiple Choice';
            choiceLines.forEach((cLine) => {
                const isMarked = cLine.startsWith('*');
                const cleanChoice = cLine.replace(/^\*?[a-dA-D\(\)][\.\)]?\s*/i, '').trim();
                choices.push(cleanChoice);
                if (isMarked) {
                    answer = cleanChoice;
                }
            });

            // If answer is a letter like "A", "B", "C", "D" or "Answer: A"
            if (!answer && (bLines.some(l => /^(Answer(\s*Key)?|Correct(\s*Answer)?|Key|Ans)?[:\s-]*[a-dA-D]$/i.test(l)) || /^[a-dA-D]$/i.test(answer))) {
                const ansMatch = /^[a-dA-D]$/i.test(answer) ? answer : bLines.find(l => /^(Answer(\s*Key)?|Correct(\s*Answer)?|Key|Ans)?[:\s-]*[a-dA-D]$/i.test(l));
                if (ansMatch) {
                    const char = ansMatch.replace(/^(Answer(\s*Key)?|Correct(\s*Answer)?|Key|Ans)?[:\s-]*/i, '').trim().toUpperCase();
                    const targetIdx = char.charCodeAt(0) - 65;
                    if (choices[targetIdx]) {
                        answer = choices[targetIdx];
                    }
                }
            } else if (answer) {
                // If answer text was provided directly (e.g. "Answer: Photosynthesis")
                const matchedChoice = choices.find(c => c.toLowerCase() === answer.toLowerCase());
                if (matchedChoice) {
                    answer = matchedChoice;
                }
            }
        } else if (/^True\s+or\s+False/i.test(firstLine) || /^True\/False/i.test(firstLine) || /^True$/i.test(answer) || /^False$/i.test(answer) || /^(Answer(\s*Key)?|Correct(\s*Answer)?|Key)?[:\s-]*(True|False)$/i.test(answer)) {
            qType = 'True or False';
            questionText = firstLine.replace(/^(True\s+or\s+False[:\s]*|True\/False[:\s]*)/i, '').trim();
            const cleanAns = answer.replace(/^(Answer(\s*Key)?|Correct(\s*Answer)?|Key)?[:\s-]*/i, '').trim();
            if (/^True$/i.test(cleanAns)) {
                answer = 'True';
            } else if (/^False$/i.test(cleanAns)) {
                answer = 'False';
            } else {
                answer = '';
            }
        } else if (pairLines.length > 0 || qType === 'Matching Type') {
            qType = 'Matching Type';
            pairs = pairLines.length > 0 ? pairLines : [{ premise: 'Item 1', target: 'Match 1' }, { premise: 'Item 2', target: 'Match 2' }];
        } else if (itemLines.length > 0 || /^Enumerate/i.test(firstLine) || qType === 'Enumeration') {
            qType = 'Enumeration';
            items = itemLines.length > 0 ? itemLines : ['Item 1', 'Item 2', 'Item 3'];
        } else if (rubric || evaluationMode || /^Essay/i.test(firstLine) || /^Explain/i.test(firstLine) || /^Discuss/i.test(firstLine)) {
            qType = 'Essay';
        } else if (answer) {
            qType = 'Short Answer';
            answers = answer.split(',').map(s => s.trim()).filter(Boolean);
            answer = answers[0] || '';
        } else {
            qType = 'Multiple Choice';
            choices = ['Option 1', 'Option 2', 'Option 3', 'Option 4'];
        }

        if (questionText) {
            if (qType === 'Short Answer' && answers.length === 0 && answer) {
                answers = answer.split(',').map(s => s.trim()).filter(Boolean);
            }
            if (qType === 'Matching Type') {
                const finalPairs = pairs.length > 0 ? pairs.map(p => ({
                    premise: p.premise || '',
                    target: p.target || '',
                    points: (p.points !== undefined && !isNaN(parseInt(p.points))) ? parseInt(p.points) : 1
                })) : [{ premise: '', target: '', points: 1 }, { premise: '', target: '', points: 1 }];
                pairs = finalPairs;
                points = finalPairs.reduce((sum, p) => sum + (parseInt(p.points) || 0), 0);
            }
            if (qType === 'Enumeration') {
                const finalItems = items.length > 0 ? items : ['', '', ''];
                items = finalItems;
                itemPoints = finalItems.map(() => 1);
                points = finalItems.length * 1;
            }
            parsedQuestions.push({
                type: qType,
                question: questionText,
                choices: choices.length > 0 ? choices : (qType === 'Multiple Choice' ? ['', '', '', ''] : []),
                answer: answer || '',
                answers: answers.length > 0 ? answers : (answer ? [answer] : ['']),
                items: items.length > 0 ? items : (qType === 'Enumeration' ? ['', '', ''] : []),
                itemPoints: qType === 'Enumeration' ? itemPoints : [],
                pairs: pairs.length > 0 ? pairs : (qType === 'Matching Type' ? [{ premise: '', target: '', points: 1 }, { premise: '', target: '', points: 1 }] : []),
                rubric: rubric || '',
                evaluationMode: evaluationMode || '',
                points: points !== undefined ? points : 5
            });
        }
    });

    return parsedQuestions;
};

window.executeImportQuestions = async function () {
    const textarea = document.getElementById('import-paste-textarea');
    const btn = document.getElementById('execute-import-btn');
    if (!textarea || !btn) return;

    let text = textarea.value.trim();

    if (!text && !currentImportFile) {
        if (typeof window.openAskingPanel === 'function') {
            window.openAskingPanel({
                title: 'No Content Provided',
                message: 'Please enter your questions or upload a supported file to convert.',
                type: 'warning'
            });
        }
        return;
    }

    // Set real loading state on button (no fake setTimeout delay)
    btn.disabled = true;
    btn.classList.remove('opacity-50', 'cursor-not-allowed', 'pointer-events-none', 'shadow-none');
    btn.classList.add('bg-[#15803d]', 'text-white', 'shadow-md');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i><span>Converting...</span>';

    try {
        let fileText = '';
        // Extract file content if a file was uploaded
        if (currentImportFile) {
            const ext = (currentImportFile.name.split('.').pop() || '').toLowerCase();
            if ((ext === 'docx' || ext === 'doc') && window.mammoth) {
                const arrayBuffer = await currentImportFile.arrayBuffer();
                const result = await window.mammoth.extractRawText({ arrayBuffer: arrayBuffer });
                fileText = (result.value || '').trim();
            } else if (ext === 'pdf' && window.pdfjsLib) {
                if (!window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
                    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                }
                const arrayBuffer = await currentImportFile.arrayBuffer();
                const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                let fullText = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map(item => item.str).join(' ');
                    fullText += pageText + '\n\n';
                }
                fileText = fullText.trim();
            } else if (ext === 'pptx' && window.JSZip) {
                const arrayBuffer = await currentImportFile.arrayBuffer();
                const zip = await window.JSZip.loadAsync(arrayBuffer);
                const slideFiles = Object.keys(zip.files).filter(name => /^ppt\/slides\/slide\d+\.xml$/i.test(name));
                slideFiles.sort((a, b) => {
                    const numA = parseInt(a.match(/slide(\d+)\.xml/i)?.[1] || '0', 10);
                    const numB = parseInt(b.match(/slide(\d+)\.xml/i)?.[1] || '0', 10);
                    return numA - numB;
                });
                let fullText = '';
                for (const slidePath of slideFiles) {
                    const xmlStr = await zip.files[slidePath].async('string');
                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(xmlStr, 'text/xml');
                    const textNodes = xmlDoc.getElementsByTagName('a:t');
                    let slideText = '';
                    for (let j = 0; j < textNodes.length; j++) {
                        slideText += (textNodes[j].textContent || '') + ' ';
                    }
                    if (slideText.trim()) {
                        fullText += slideText.trim() + '\n\n';
                    }
                }
                fileText = fullText.trim();
            } else if (ext === 'txt' || ext === 'md' || ext === 'csv') {
                fileText = (await currentImportFile.text()).trim();
            }
        }

        // Combine: file content first, then textarea questions appended after
        let combinedText = fileText;
        if (text) {
            combinedText = combinedText
                ? combinedText + '\n\n' + text
                : text;
        }

        const imported = combinedText ? window.parseImportedTextToQuestions(combinedText) : [];
        if (imported.length === 0) {
            if (typeof window.openAskingPanel === 'function') {
                window.openAskingPanel({
                    title: 'Unable to Detect Questions',
                    message: 'Could not detect questions. Please verify your questions or uploaded document format.',
                    type: 'warning'
                });
            }
            return;
        }

        let baseCount = (questions.length === 1 && !questions[0].question.trim()) ? 0 : questions.length;
        const availableSlots = Math.max(0, MAX_QUIZ_QUESTIONS - baseCount);
        if (availableSlots <= 0) {
            if (typeof window.openAskingPanel === 'function') {
                window.openAskingPanel({
                    title: 'Question Limit Reached',
                    message: `You have reached the maximum limit of ${MAX_QUIZ_QUESTIONS} questions. Cannot import more questions.`,
                    type: 'warning'
                });
            } else {
                alert(`Maximum limit of ${MAX_QUIZ_QUESTIONS} questions reached.`);
            }
            return;
        }

        let toAdd = imported;
        let wasTruncated = false;
        if (toAdd.length > availableSlots) {
            toAdd = toAdd.slice(0, availableSlots);
            wasTruncated = true;
        }

        if (questions.length === 1 && !questions[0].question.trim()) {
            questions = toAdd;
        } else {
            questions = questions.concat(toAdd);
        }
        activeQuestionIndex = 0;

        renderQuestions();
        updateStats();
        window.closeImportQuestionsModal(true);

        if (typeof window.openAskingPanel === 'function') {
            window.openAskingPanel({
                title: 'Conversion Successful',
                message: wasTruncated
                    ? `Successfully converted and generated ${toAdd.length} ${toAdd.length === 1 ? 'question' : 'questions'} with answer keys! (Capped at the ${MAX_QUIZ_QUESTIONS}-question limit).`
                    : `Successfully converted and generated ${toAdd.length} ${toAdd.length === 1 ? 'question' : 'questions'} with answer keys!`,
                icon: 'fa-solid fa-circle-check text-emerald-600'
            });
        }
    } catch (err) {
        console.error('Error during question conversion:', err);
        if (typeof window.openAskingPanel === 'function') {
            window.openAskingPanel({
                title: 'Conversion Error',
                message: 'An error occurred while converting the questions from the file.',
                type: 'warning'
            });
        }
    } finally {
        if (btn) {
            btn.innerHTML = '<span>Convert Questions</span>';
            window.updateConvertQuestionsBtnState();
        }
    }
};

// ==========================================
// DOWNLOAD / EXPORT QUIZ FUNCTIONS
// ==========================================

let activeExportFormat = 'pdf';

window.toggleExportDropdown = function (eventOrShow) {
    if (eventOrShow && typeof eventOrShow.stopPropagation === 'function') {
        eventOrShow.stopPropagation();
    }
    const menu = document.getElementById('export-quiz-dropdown-menu');
    const chevron = document.getElementById('export-quiz-chevron');
    if (!menu) return;

    const willOpen = (typeof eventOrShow === 'boolean') ? eventOrShow : menu.classList.contains('hidden');
    menu.classList.toggle('hidden', !willOpen);
    if (chevron) {
        chevron.classList.toggle('rotate-180', willOpen);
    }

    if (willOpen) {
        // Show Delete Quiz if there is an existing quiz OR if there are any questions / answer keys entered
        const hasQuestions = (typeof window.hasMeaningfulQuestions === 'function') ? window.hasMeaningfulQuestions() : (Array.isArray(questions) && questions.some(q => (q.question && q.question.trim()) || q.answer || (q.answers && q.answers.length > 0)));
        const hasExistingQuiz = Boolean(currentQuizId);
        const shouldShowDelete = hasExistingQuiz || hasQuestions;

        const deleteBtn = document.getElementById('dropdown-delete-quiz-btn');
        const deleteDivider = document.getElementById('dropdown-delete-divider');
        if (deleteBtn) deleteBtn.classList.toggle('hidden', !shouldShowDelete);
        if (deleteDivider) deleteDivider.classList.toggle('hidden', !shouldShowDelete);

        // Show Make a Copy only for saved (non-draft) quizzes
        const copyBtn = document.getElementById('dropdown-copy-quiz-btn');
        const copyDivider = document.getElementById('dropdown-copy-divider');
        let isSavedNonDraft = false;
        if (hasExistingQuiz) {
            const lib = getStoredQuizLibrary();
            const entry = lib.find(q => q.id === currentQuizId);
            isSavedNonDraft = entry ? (!entry.isDraft && entry.status !== 'draft') : false;
        }
        if (copyBtn) copyBtn.classList.toggle('hidden', !isSavedNonDraft);
        if (copyDivider) copyDivider.classList.toggle('hidden', !isSavedNonDraft);
    }
};

document.addEventListener('click', function (e) {
    const wrap = document.getElementById('export-quiz-dropdown-wrap');
    const menu = document.getElementById('export-quiz-dropdown-menu');
    if (menu && !menu.classList.contains('hidden')) {
        if (!wrap || !wrap.contains(e.target)) {
            window.toggleExportDropdown(false);
        }
    }
});

window.promptDeleteCurrentQuiz = function () {
    const quizTitle = document.getElementById('quiz-title-input')?.value?.trim() || (currentQuizTitle !== 'Custom Quiz' ? currentQuizTitle : '') || 'this quiz';

    if (typeof window.openAskingPanel === 'function') {
        window.openAskingPanel({
            title: 'Delete Quiz?',
            message: `Are you sure you want to delete "${quizTitle}"? All questions and progress will be discarded without saving.`,
            type: 'danger',
            confirmText: 'Delete Quiz',
            cancelText: 'Cancel',
            onConfirm: () => {
                window._isDeletingQuiz = true;
                window.removeEventListener('beforeunload', _saveBeforeExit);
                window.removeEventListener('pagehide', _saveBeforeExit);

                const idToDelete = currentQuizId;
                if (idToDelete) {
                    // Remove from quiz library
                    if (typeof window.getStoredQuizLibrary === 'function' && typeof window.saveStoredQuizLibrary === 'function') {
                        const library = window.getStoredQuizLibrary();
                        window.saveStoredQuizLibrary(library.filter(q => q.id !== idToDelete));
                    } else if (typeof window.saveQuizLibrary === 'function') {
                        const library = typeof window.getStoredQuizLibrary === 'function' ? window.getStoredQuizLibrary() : [];
                        window.saveQuizLibrary(library.filter(q => q.id !== idToDelete));
                    } else {
                        try {
                            const raw = localStorage.getItem(QUIZ_STORAGE_KEY) || localStorage.getItem('quizLibrary');
                            if (raw) {
                                const lib = JSON.parse(raw);
                                const filtered = lib.filter(q => q.id !== idToDelete);
                                localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(filtered));
                                localStorage.setItem('quizLibrary', JSON.stringify(filtered));
                            }
                        } catch (e) { /* ignore */ }
                    }

                    // Server storage mode: soft-delete from MySQL
                    if (window.SIGMA_USE_SERVER_STORAGE && typeof window.deleteQuizFromServer === 'function') {
                        window.deleteQuizFromServer(idToDelete);
                    }
                }

                // Clear any autosave/session snapshot completely so it won't restore or draft
                try {
                    localStorage.removeItem(_getQuizSessionKey());
                    localStorage.removeItem('sigma_quiz_active_session');
                    localStorage.removeItem('sigma_quiz_creator_autosave');
                    sessionStorage.removeItem(_getQuizSessionKey());
                } catch (e) { /* ignore */ }

                // Exit the tab / window without saving or creating a new quiz
                window.close();

                // If browser prevents closing non-script opened tabs, navigate back or close out:
                setTimeout(() => {
                    if (window.opener && !window.opener.closed) {
                        try { window.opener.focus(); } catch (e) {}
                    }
                    if (window.history.length > 1) {
                        window.history.back();
                    } else {
                        window.location.replace('about:blank');
                    }
                }, 100);
            }
        });
    } else {
        if (confirm(`Are you sure you want to delete "${quizTitle}"?`)) {
            window._isDeletingQuiz = true;
            window.removeEventListener('beforeunload', _saveBeforeExit);
            window.removeEventListener('pagehide', _saveBeforeExit);
            try {
                localStorage.removeItem(_getQuizSessionKey());
            } catch (e) {}
            window.close();
            setTimeout(() => {
                if (window.history.length > 1) {
                    window.history.back();
                } else {
                    window.location.replace('about:blank');
                }
            }, 100);
        }
    }
};

window.makeACopyOfCurrentQuiz = function () {
    if (!currentQuizId) return; // Safety: only works on an existing saved quiz

    const library = getStoredQuizLibrary();
    const original = library.find(q => q.id === currentQuizId);
    if (!original) return;

    const newId = 'quiz-' + Date.now();
    const digits = String(newId).replace(/[^0-9]/g, '').slice(-4);
    const newCode = `#QZ-${digits.padStart(4, '0')}`;
    const copyTitle = `Copy of ${original.title || 'Quiz'}`;

    const copy = Object.assign({}, JSON.parse(JSON.stringify(original)), {
        id: newId,
        code: newCode,
        title: copyTitle,
        status: 'draft',
        isDraft: true,
        isNew: false,
        createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        createdTimestamp: Date.now()
    });

    library.unshift(copy);
    saveStoredQuizLibrary(library);

    // Broadcast so the library picker in other tabs refreshes
    localStorage.setItem('sigma_quiz_broadcast', Date.now().toString());

    // Open the copy in a new tab in edit mode
    window.open(`quiz-creator.html?mode=edit&id=${encodeURIComponent(newId)}`, '_blank');
};

window.hasAnyAnswerKey = function () {

    if (!questions || questions.length === 0) return false;
    return questions.some(q => {
        if (!q) return false;
        if (q.type === 'Multiple Choice') {
            return (q.answer !== undefined && q.answer !== null && String(q.answer).trim().length > 0) || (q.answerIndex !== undefined && q.answerIndex !== null && q.answerIndex >= 0);
        }
        if (q.type === 'True or False') {
            return (q.answer === 'True' || q.answer === 'False');
        }
        if (q.type === 'Short Answer' || q.type === 'Identification') {
            const hasSingle = (q.answer !== undefined && q.answer !== null && String(q.answer).trim().length > 0);
            const hasMulti = Array.isArray(q.answers) && q.answers.some(a => a && a.trim().length > 0);
            return hasSingle || hasMulti;
        }
        if (q.type === 'Matching Type') {
            return Array.isArray(q.pairs) && q.pairs.some(p => p.target && p.target.trim().length > 0);
        }
        if (q.type === 'Enumeration') {
            return Array.isArray(q.items) && q.items.some(item => item && item.trim().length > 0);
        }
        if (q.type === 'Essay') {
            return Boolean(q.rubric && q.rubric.trim().length > 0);
        }
        return false;
    });
};

window.openDownloadOptionsModal = function (format = 'pdf') {
    if (!window.hasMeaningfulQuestions()) {
        if (typeof window.openAskingPanel === 'function') {
            window.openAskingPanel({
                title: 'Empty Quiz',
                message: 'There are no questions in this quiz. Please add at least 1 question before viewing as PDF.',
                type: 'warning'
            });
        }
        return;
    }

    activeExportFormat = format;
    window.toggleExportDropdown(false);

    const modal = document.getElementById('download-quiz-modal');
    const titleEl = document.getElementById('download-modal-title');
    const iconEl = document.getElementById('download-modal-format-icon');
    const btnLabelEl = document.getElementById('download-confirm-btn-label');

    if (titleEl && iconEl && btnLabelEl) {
        if (format === 'pdf') {
            titleEl.textContent = 'View PDF';
            iconEl.className = 'w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 shadow-xs text-lg';
            iconEl.innerHTML = '<i class="fa-solid fa-file-pdf"></i>';
            btnLabelEl.textContent = 'View PDF';
        } else if (format === 'docx') {
            titleEl.textContent = 'Download Word';
            iconEl.className = 'w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-xs text-lg';
            iconEl.innerHTML = '<i class="fa-solid fa-file-word"></i>';
            btnLabelEl.textContent = 'Download Word';
        } else {
            titleEl.textContent = 'Download Plain Text';
            iconEl.className = 'w-10 h-10 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 shadow-xs text-lg';
            iconEl.innerHTML = '<i class="fa-solid fa-file-lines"></i>';
            btnLabelEl.textContent = 'Download Text';
        }
    }

    // Check if any question has an answer key set
    const hasAnswerKey = window.hasAnyAnswerKey();
    const teacherWrap = document.getElementById('download-mode-teacher-wrap');
    const teacherInput = document.getElementById('download-mode-teacher-input');
    const teacherSub = document.getElementById('download-mode-teacher-sub');
    const studentInput = document.getElementById('download-mode-student-input');

    if (!hasAnswerKey) {
        if (studentInput) studentInput.checked = true;
        if (teacherInput) {
            teacherInput.checked = false;
            teacherInput.disabled = true;
        }
        if (teacherWrap) {
            teacherWrap.classList.add('opacity-40', 'pointer-events-none', 'cursor-not-allowed', 'bg-slate-50');
            teacherWrap.classList.remove('hover:border-slate-300', 'cursor-pointer');
            teacherWrap.title = 'No answer keys or rubrics have been set in this quiz';
        }
        if (teacherSub) {
            teacherSub.textContent = 'No answer key set';
        }
    } else {
        if (teacherInput) teacherInput.disabled = false;
        if (teacherWrap) {
            teacherWrap.classList.remove('opacity-40', 'pointer-events-none', 'cursor-not-allowed', 'bg-slate-50');
            teacherWrap.classList.add('hover:border-slate-300', 'cursor-pointer');
            teacherWrap.title = '';
        }
        if (teacherSub) {
            teacherSub.textContent = 'With Answer Key & Rubrics';
        }
    }

    if (modal) {
        modal.classList.remove('hidden');
        syncBodyScrollLock();
    }
};

window.closeDownloadOptionsModal = function () {
    const modal = document.getElementById('download-quiz-modal');
    if (modal) modal.classList.add('hidden');
    syncBodyScrollLock();
};

window.generateQuizExportDocument = function (mode = 'student', includeHeader = true, showPoints = true) {
    const title = currentQuizTitle || 'Assessment Quiz';
    const isTeacher = mode === 'teacher';
    let output = '';

    if (includeHeader) {
        output += `=================================================================\n`;
        output += `INTERFACE COMPUTER COLLEGE - ELMS ASSESSMENT\n`;
        output += `Quiz Title: ${title.toUpperCase()}\n`;
        output += `Document Type: ${isTeacher ? 'TEACHER ANSWER KEY & GRADING GUIDE' : 'STUDENT EXAM PAPER'}\n`;
        output += `Total Questions: ${questions.length} | Total Points: ${questions.reduce((a, q) => a + (parseInt(q.points) || 0), 0)} pts\n`;
        output += `=================================================================\n\n`;
        output += `Name: ___________________________________   Date: _______________\n`;
        output += `Grade/Section: ___________________________   Score: ______________\n\n`;
        output += `-----------------------------------------------------------------\n`;
        output += `INSTRUCTIONS: Read each question carefully. Write your answers clearly.\n`;
        output += `-----------------------------------------------------------------\n\n`;
    }

    questions.forEach((q, idx) => {
        const qNum = idx + 1;
        const ptsText = showPoints ? ` [${q.points !== undefined ? q.points : 5} pts]` : '';

        output += `${qNum}. ${q.question || '(Question Prompt)'}${ptsText}\n`;

        if (q.type === 'Multiple Choice') {
            const choices = q.choices || [];
            const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
            choices.forEach((c, cIdx) => {
                const letter = letters[cIdx] || `${cIdx + 1}`;
                const isCorrect = isTeacher && (q.answer === c || q.answerIndex === cIdx);
                output += `   ${letter}. ${c}${isCorrect ? '  <-- [CORRECT ANSWER]' : ''}\n`;
            });
            if (isTeacher && q.answer) {
                output += `   >> Correct Answer: ${q.answer}\n`;
            }
        } else if (q.type === 'True or False') {
            if (isTeacher) {
                output += `   [ ${q.answer === 'True' ? 'X' : ' '} ] True    [ ${q.answer === 'False' ? 'X' : ' '} ] False\n`;
                output += `   >> Correct Answer: ${q.answer || 'Not specified'}\n`;
            } else {
                output += `   [   ] True      [   ] False\n`;
            }
        } else if (q.type === 'Short Answer') {
            if (isTeacher) {
                const accepted = (q.answers && q.answers.length > 0) ? q.answers.join(' OR ') : (q.answer || '');
                output += `   >> Accepted Answer: ${accepted}\n`;
            } else {
                output += `   Answer: _____________________________________________________\n`;
            }
        } else if (q.type === 'Essay') {
            if (isTeacher) {
                if (q.rubric) {
                    output += `   >> Grading Rubric / Notes: ${q.rubric}\n`;
                }
            } else {
                output += `   Write your response below:\n`;
                output += `   _____________________________________________________________\n`;
                output += `   _____________________________________________________________\n`;
                output += `   _____________________________________________________________\n`;
            }
        } else if (q.type === 'Matching Type') {
            const pairs = q.pairs || [];
            if (isTeacher) {
                output += `   >> Correct Matching Pairs:\n`;
                pairs.forEach((p, pIdx) => {
                    output += `      • Column A: "${p.premise || 'Item ' + (pIdx + 1)}"  ===>  Column B: "${p.target || ''}"\n`;
                });
            } else {
                output += `   Match Column A with Column B:\n`;
                output += `   COLUMN A:                                   COLUMN B (Answer Slot):\n`;
                pairs.forEach((p, pIdx) => {
                    output += `   [ ${pIdx + 1} ] ${p.premise || 'Item ' + (pIdx + 1)} -------------------> [ ________________ ]\n`;
                });
            }
        } else if (q.type === 'Enumeration') {
            const items = q.items || [];
            if (isTeacher) {
                output += `   >> Required Items:\n`;
                items.forEach((item, iIdx) => {
                    output += `      ${iIdx + 1}. ${item}\n`;
                });
            } else {
                items.forEach((_, iIdx) => {
                    output += `   ${iIdx + 1}. __________________________________________________\n`;
                });
            }
        }

        output += `\n`;
    });

    if (isTeacher) {
        output += `=================================================================\n`;
        output += `END OF TEACHER ANSWER KEY\n`;
        output += `=================================================================\n`;
    } else {
        output += `=================================================================\n`;
        output += `END OF TEST PAPER - GOOD LUCK!\n`;
        output += `=================================================================\n`;
    }

    return output;
};

window.executeDownloadAssessment = function () {
    if (!questions || questions.length === 0) {
        window.openAskingPanel({
            title: 'Empty Quiz',
            message: 'Please add at least 1 question before downloading the assessment.',
            type: 'warning'
        });
        return;
    }

    const modeRadio = document.querySelector('input[name="download-mode"]:checked');
    const mode = modeRadio ? modeRadio.value : 'student';
    const includeHeader = document.getElementById('download-opt-header')?.checked ?? true;
    const showPoints = document.getElementById('download-opt-points')?.checked ?? true;

    const formattedContent = window.generateQuizExportDocument(mode, includeHeader, showPoints);
    const title = (currentQuizTitle || 'Assessment_Quiz').replace(/[^a-zA-Z0-9_-]/g, '_');
    const suffix = mode === 'teacher' ? '_Answer_Key' : '_Exam_Paper';
    const fileName = `${title}${suffix}.${activeExportFormat}`;

    window.closeDownloadOptionsModal();

    if (activeExportFormat === 'pdf') {
        const lines = formattedContent.split('\n');
        let textStream = `BT\n/F1 10 Tf\n13 TL\n36 780 Td\n`;
        lines.forEach(l => {
            const escaped = l.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
            textStream += `(${escaped}) Tj\nT*\n`;
        });
        textStream += `ET`;

        const pdfData = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length ${textStream.length} >>
stream
${textStream}
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000227 00000 n 
0000000000 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
${300 + textStream.length}
%%EOF`;

        const blob = new Blob([pdfData], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
    } else if (activeExportFormat === 'docx') {
        const blob = new Blob([formattedContent], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } else {
        const blob = new Blob([formattedContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
};

let currentPreviewQuestionIndex = 0;
window.previewUserAnswers = window.previewUserAnswers || {};

let currentPreviewPillsPage = 0;

window.openStudentQuizPreviewModal = function () {
    if (!questions || questions.length === 0) {
        if (typeof window.showValidationToast === 'function') {
            showValidationToast({
                title: 'No Questions to Preview',
                message: 'Please add at least 1 question to preview the quiz.',
                type: 'warning'
            });
        } else if (typeof window.openAskingPanel === 'function') {
            window.openAskingPanel({
                title: 'No Questions to Preview',
                message: 'Please add at least 1 question to preview the quiz.',
                type: 'warning'
            });
        }
        return;
    }

    const modal = document.getElementById('student-preview-modal');
    if (!modal) return;

    window.previewUserAnswers = {};
    window.previewShuffledChoices = {};
    window.previewShuffledPairs = {};
    currentPreviewQuestionIndex = 0;
    currentPreviewPillsPage = 0;
    window.renderStudentPreview();
    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
};

window.openStudentPreview = window.openStudentQuizPreviewModal;

window.closeStudentQuizPreviewModal = function () {
    const modal = document.getElementById('student-preview-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
    window.previewUserAnswers = {};
    window.previewShuffledPairs = {};
    currentPreviewQuestionIndex = 0;
    currentPreviewPillsPage = 0;
    window.activeAnswerKeyIndex = null;
    renderQuestions();
    syncBodyScrollLock();
};

window.openImageFullscreen = function (src, title = '') {
    const modal = document.getElementById('image-fullscreen-modal');
    const img = document.getElementById('image-fullscreen-img');
    const titleEl = document.getElementById('image-fullscreen-title');
    if (!modal || !img) return;
    img.src = src;
    if (titleEl) {
        titleEl.textContent = title || '';
        titleEl.style.display = title ? 'block' : 'none';
    }
    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
};

window.closeImageFullscreen = function () {
    const modal = document.getElementById('image-fullscreen-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    const img = document.getElementById('image-fullscreen-img');
    if (img) img.src = '';
    if (typeof syncBodyScrollLock === 'function') syncBodyScrollLock();
};

window.prevPreviewQuestion = function () {
    if (currentPreviewQuestionIndex > 0) {
        currentPreviewQuestionIndex--;
        currentPreviewPillsPage = Math.floor(currentPreviewQuestionIndex / 10);
        window.renderStudentPreview();
    }
};

window.nextPreviewQuestion = function () {
    if (currentPreviewQuestionIndex < questions.length - 1) {
        currentPreviewQuestionIndex++;
        currentPreviewPillsPage = Math.floor(currentPreviewQuestionIndex / 10);
        window.renderStudentPreview();
    }
};

window.jumpToPreviewQuestion = function (idx) {
    if (idx >= 0 && idx < questions.length) {
        currentPreviewQuestionIndex = idx;
        currentPreviewPillsPage = Math.floor(currentPreviewQuestionIndex / 10);
        window.renderStudentPreview();
    }
};

window.prevPreviewPillsPage = function () {
    if (currentPreviewPillsPage > 0) {
        currentPreviewPillsPage--;
        window.updatePreviewPills();
    }
};

window.nextPreviewPillsPage = function () {
    const totalQ = (questions && questions.length) ? questions.length : 0;
    const maxPage = Math.max(0, Math.ceil(totalQ / 10) - 1);
    if (currentPreviewPillsPage < maxPage) {
        currentPreviewPillsPage++;
        window.updatePreviewPills();
    }
};

window.isPreviewQuestionAnswered = function (qIdx) {
    const q = questions && questions[qIdx];
    const ans = window.previewUserAnswers ? window.previewUserAnswers[qIdx] : undefined;
    if (ans === undefined || ans === null) return false;
    if (q && q.type === 'Enumeration') {
        const requiredCount = Math.max(1, parseInt(q.requiredCount) || (Array.isArray(q.items) && q.items.length > 0 ? q.items.length : 3));
        if (Array.isArray(ans)) {
            const filledCount = ans.filter(v => v && String(v).trim().length > 0).length;
            return filledCount >= requiredCount;
        }
        if (typeof ans === 'object' && ans !== null) {
            const filledCount = Object.values(ans).filter(v => v && String(v).trim().length > 0).length;
            return filledCount >= requiredCount;
        }
        return false;
    }
    if (typeof ans === 'string') return ans.trim().length > 0;
    if (Array.isArray(ans)) return ans.some(v => v && String(v).trim().length > 0);
    if (typeof ans === 'object') return Object.values(ans).some(v => v && String(v).trim().length > 0);
    return false;
};

function isQuizCreatorChoiceCorrect(q, cIdx, choiceVal, letter) {
    if (!q) return false;

    if (Array.isArray(q.choices) && cIdx >= 0 && q.choices[cIdx] && typeof q.choices[cIdx] === 'object') {
        if (q.choices[cIdx].isCorrect === true || q.choices[cIdx].correct === true) return true;
    }

    const rawCorrect = q.correct ?? q.correctAnswer ?? q.answer ?? q.sampleAnswer;
    const cleanLetter = String(letter || '').trim().toLowerCase();
    const cleanVal = String(choiceVal || '').trim().toLowerCase();
    const strippedChoiceText = cleanVal.replace(/^[a-h][\.\)]\s*/i, '').trim();

    if (rawCorrect === undefined || rawCorrect === null || String(rawCorrect).trim() === '') {
        if (q.answerIndex !== undefined && q.answerIndex !== null && cIdx >= 0 && Number(q.answerIndex) === cIdx) {
            return true;
        }
        return false;
    }

    const cleanCorrect = String(rawCorrect).trim().toLowerCase();
    const strippedCorrect = cleanCorrect.replace(/^[a-h][\.\)]\s*/i, '').trim();

    if (cleanLetter && cleanCorrect === cleanLetter) return true;
    if (cleanVal && (cleanVal === cleanCorrect || (strippedChoiceText && strippedChoiceText === strippedCorrect) || cleanVal === strippedCorrect || strippedChoiceText === cleanCorrect)) {
        return true;
    }
    if (/^\d+$/.test(cleanCorrect) && cIdx >= 0 && Number(cleanCorrect) === cIdx) {
        return true;
    }
    if (/^[a-h]$/i.test(cleanCorrect)) {
        const letterIdx = cleanCorrect.toUpperCase().charCodeAt(0) - 65;
        if ((cIdx >= 0 && letterIdx === cIdx) || cleanLetter === cleanCorrect) {
            return true;
        }
    }
    if (q.answerIndex !== undefined && q.answerIndex !== null && cIdx >= 0 && Number(q.answerIndex) === cIdx) {
        return true;
    }
    if (cleanCorrect === 'true' || cleanCorrect === 't') {
        if (cleanVal === 'true' || cleanLetter === 'a' || cIdx === 0) return true;
    }
    if (cleanCorrect === 'false' || cleanCorrect === 'f') {
        if (cleanVal === 'false' || cleanLetter === 'b' || cIdx === 1) return true;
    }
    return false;
}

window.getQuestionItemCounts = function (qIdx) {
    if (!questions || !questions[qIdx]) return { correct: 0, total: 1, isFullyCorrect: false, isAnswered: false, hasPartial: false };
    const q = questions[qIdx];
    const ans = window.previewUserAnswers ? window.previewUserAnswers[qIdx] : undefined;
    const qType = q.type || 'Multiple Choice';

    if (qType === 'Multiple Choice') {
        const rawChoices = (Array.isArray(q.choices) && q.choices.length > 0) ? q.choices : ['Option 1', 'Option 2', 'Option 3', 'Option 4'];
        let displayChoices = rawChoices;
        if (q.shuffleChoices && window.previewShuffledChoices && window.previewShuffledChoices[qIdx]) {
            displayChoices = window.previewShuffledChoices[qIdx];
        }
        const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
        const isAnswered = ans !== undefined && ans !== null && String(ans).trim().length > 0;
        let isCorrect = false;

        if (isAnswered) {
            displayChoices.forEach((choice, cIdx) => {
                const fallbackLabel = 'Option ' + (cIdx + 1);
                const choiceVal = (typeof choice === 'object' && choice !== null) ? (choice.text || choice.label || choice.value || fallbackLabel) : ((choice !== undefined && choice !== null && String(choice).trim().length > 0) ? String(choice).trim() : fallbackLabel);
                const letter = optionLetters[cIdx] || String(cIdx + 1);
                const cleanChoiceText = String(choiceVal).replace(/^[A-H][\.\)]\s*/i, '').trim() || choiceVal;

                const isThisChecked = (
                    ans === choiceVal ||
                    ans === letter ||
                    String(ans).trim().toLowerCase() === String(choiceVal).trim().toLowerCase() ||
                    String(ans).trim().toLowerCase() === String(cleanChoiceText).trim().toLowerCase() ||
                    String(ans).trim().toUpperCase() === letter
                );

                if (isThisChecked) {
                    let origIdx = cIdx;
                    if (Array.isArray(q.choices)) {
                        const found = q.choices.findIndex(orig => {
                            const origText = (typeof orig === 'object' && orig !== null) ? (orig.text || orig.label || orig.value || '') : String(orig || '');
                            return origText === choiceVal || origText === cleanChoiceText;
                        });
                        if (found !== -1) origIdx = found;
                    }
                    if (isQuizCreatorChoiceCorrect(q, origIdx, choiceVal, letter)) {
                        isCorrect = true;
                    }
                }
            });

            if (!isCorrect) {
                isCorrect = isQuizCreatorChoiceCorrect(q, -1, ans, ans);
            }
        }

        return {
            correct: isCorrect ? 1 : 0,
            total: 1,
            isFullyCorrect: isCorrect,
            isAnswered: isAnswered,
            hasPartial: false
        };
    } else if (qType === 'True or False') {
        const isAnswered = ans !== undefined && ans !== null && String(ans).trim().length > 0;
        const isTrueCorrect = isQuizCreatorChoiceCorrect(q, 0, 'True', 'A') || isQuizCreatorChoiceCorrect(q, 0, 'True', 'True') || String(q.correct || q.correctAnswer || '').trim().toLowerCase() === 'true';
        let isCorrect = false;
        if (isAnswered) {
            const clean = String(ans).trim().toLowerCase();
            if (clean === 'true' || clean === 't' || String(ans).trim().toUpperCase() === 'A') {
                isCorrect = isTrueCorrect;
            } else if (clean === 'false' || clean === 'f' || String(ans).trim().toUpperCase() === 'B') {
                isCorrect = !isTrueCorrect;
            }
        }
        return {
            correct: isCorrect ? 1 : 0,
            total: 1,
            isFullyCorrect: isCorrect,
            isAnswered: isAnswered,
            hasPartial: false
        };
    } else if (qType === 'Short Answer' || qType === 'Identification') {
        const rawAnswers = Array.isArray(q.answers) && q.answers.length > 0
            ? q.answers
            : (q.correct || q.correctAnswer || q.answer ? [q.correct || q.correctAnswer || q.answer] : []);
        const answersList = rawAnswers.map(a => typeof a === 'string' ? a : (a?.text || '')).filter(Boolean);
        const cleanUser = String(ans || '').trim().toLowerCase();
        const isAnswered = cleanUser.length > 0;
        const isCorrect = isAnswered && answersList.some(a => String(a).trim().toLowerCase() === cleanUser);
        return {
            correct: isCorrect ? 1 : 0,
            total: 1,
            isFullyCorrect: isCorrect,
            isAnswered: isAnswered,
            hasPartial: false
        };
    } else if (qType === 'Enumeration') {
        const rawExpected = Array.isArray(q.items) ? q.items : [];
        const expectedItems = rawExpected.map(it => typeof it === 'string' ? it : (it?.text || '')).filter(Boolean);
        const slotCount = Math.max(1, parseInt(q.requiredCount) || (expectedItems.length > 0 ? expectedItems.length : 3));
        const curList = Array.isArray(ans) ? ans : (typeof ans === 'object' && ans !== null ? Object.values(ans) : []);
        const rawUserItems = curList.map(v => String(v || '').trim()).filter(Boolean);
        const isAnswered = window.isPreviewQuestionAnswered(qIdx);

        let matchedCount = 0;
        if (rawExpected.length === 0) {
            matchedCount = 0;
        } else {
            const usedMatches = new Set();
            rawUserItems.forEach(u => {
                const cleanUser = String(u).trim().toLowerCase();
                if (!cleanUser) return;
                const matchedIdx = rawExpected.findIndex((_, eIdx) => {
                    if (usedMatches.has(eIdx)) return false;
                    const acceptableList = window.getEnumItemAcceptableAnswers(q, eIdx).map(s => s.toLowerCase());
                    return acceptableList.includes(cleanUser);
                });
                if (matchedIdx !== -1) {
                    usedMatches.add(matchedIdx);
                }
            });
            matchedCount = Math.min(usedMatches.size, slotCount);
        }

        const isFullyCorrect = isAnswered && (matchedCount >= slotCount);
        return {
            correct: isAnswered ? matchedCount : 0,
            total: slotCount,
            isFullyCorrect: isFullyCorrect,
            isAnswered: isAnswered,
            hasPartial: isAnswered && matchedCount > 0 && matchedCount < slotCount
        };
    } else if (qType === 'Matching Type') {
        const pairs = Array.isArray(q.pairs) ? q.pairs : [];
        const total = Math.max(1, pairs.length);
        if (pairs.length === 0) {
            return { correct: 0, total: 1, isFullyCorrect: false, isAnswered: false, hasPartial: false };
        }
        const hasAns = ans && typeof ans === 'object';
        let correctCount = 0;
        let isAnswered = false;
        if (hasAns) {
            pairs.forEach((p, pIdx) => {
                const placed = ans[pIdx];
                if (placed && String(placed).trim().length > 0) {
                    isAnswered = true;
                    if (String(placed).trim().toLowerCase() === String(p.target || '').trim().toLowerCase()) {
                        correctCount++;
                    }
                }
            });
        }
        return {
            correct: isAnswered ? correctCount : 0,
            total: total,
            isFullyCorrect: isAnswered && correctCount === total,
            isAnswered: isAnswered,
            hasPartial: isAnswered && correctCount > 0 && correctCount < total
        };
    }

    const isAnswered = ans !== undefined && ans !== null && String(ans).trim().length > 0;
    return {
        correct: isAnswered ? 1 : 0,
        total: 1,
        isFullyCorrect: isAnswered,
        isAnswered: isAnswered,
        hasPartial: false
    };
};

window.isPreviewQuestionCorrect = function (qIdx) {
    const stats = window.getQuestionItemCounts(qIdx);
    return stats.isFullyCorrect;
};

window.setPreviewAnswer = function (qIdx, val) {
    if (window.previewUserAnswers[qIdx] === val) {
        delete window.previewUserAnswers[qIdx];
    } else {
        window.previewUserAnswers[qIdx] = val;
    }
    window.renderStudentPreview();
};

window.setPreviewTextAnswer = function (qIdx, val) {
    window.previewUserAnswers[qIdx] = val;
    if (typeof window.updatePreviewTextValidation === 'function') {
        window.updatePreviewTextValidation(qIdx);
    }
};

window.setPreviewEnumAnswer = function (qIdx, itemIdx, val) {
    if (!Array.isArray(window.previewUserAnswers[qIdx])) {
        window.previewUserAnswers[qIdx] = [];
    }
    window.previewUserAnswers[qIdx][itemIdx] = val;
    if (typeof window.updatePreviewEnumValidation === 'function') {
        window.updatePreviewEnumValidation(qIdx);
    }
};

window.getQuestionPoints = function (qIdx) {
    if (!questions || !questions[qIdx]) return { max: 10, earned: 0, isEssay: false };
    const q = questions[qIdx];
    const pts = (q.points !== undefined && !isNaN(parseInt(q.points))) ? parseInt(q.points) : 10;
    const qType = q.type || 'Multiple Choice';
    const isEssay = qType === 'Essay';

    if (isEssay) {
        return { max: pts, earned: 0, isEssay: true };
    }

    const stats = window.getQuestionItemCounts(qIdx);
    if (!stats.isAnswered) {
        return { max: pts, earned: 0, isEssay: false };
    }

    if (qType === 'Enumeration' || qType === 'Matching Type') {
        const earned = stats.isFullyCorrect ? pts : (stats.total > 0 ? Math.round((stats.correct / stats.total) * pts) : 0);
        return { max: pts, earned: earned, isEssay: false };
    }

    const earned = stats.isFullyCorrect ? pts : 0;
    return { max: pts, earned: earned, isEssay: false };
};

window.updatePreviewCounter = function () {
    if (!questions || questions.length === 0) return;
    const idx = Math.min(Math.max(0, currentPreviewQuestionIndex), questions.length - 1);
    const q = questions[idx];
    const qNum = idx + 1;
    const totalQ = questions.length;
    const pts = (q.points !== undefined && !isNaN(parseInt(q.points))) ? parseInt(q.points) : 10;
    const qType = q.type || 'Multiple Choice';
    const isEssay = qType === 'Essay';

    let totalQuizPoints = 0;
    let totalEarnedPoints = 0;
    for (let i = 0; i < totalQ; i++) {
        const pInfo = window.getQuestionPoints(i);
        totalQuizPoints += pInfo.max;
        totalEarnedPoints += pInfo.earned;
    }

    const curStats = window.getQuestionItemCounts(idx);
    const isAnsProvided = curStats.isAnswered;

    // Update center question counter in sticky footer
    const footerCounterEl = document.getElementById('preview-footer-question-counter');
    if (footerCounterEl) {
        footerCounterEl.textContent = `Question ${qNum} of ${totalQ}`;
    }

    const counterEl = document.getElementById('student-preview-counter');
    if (counterEl) {
        let badgeHtml = '';
        if (isEssay) {
            badgeHtml = `
                <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-2xs bg-amber-100 text-amber-800 border border-amber-300">
                    <i class="fa-solid fa-clock-rotate-left text-amber-600"></i>
                    <span>Teacher Review • ${pts} ${pts === 1 ? 'Point' : 'Points'}</span>
                </span>
            `;
        } else {
            badgeHtml = `
                <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-2xs bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <i class="fa-solid fa-circle-check text-emerald-600"></i>
                    <span>${totalEarnedPoints}/${totalQuizPoints} Points</span>
                </span>
            `;
        }

        counterEl.innerHTML = `
            <div class="flex flex-col gap-0.5">
                <div class="flex items-center gap-3 flex-wrap">
                    <span class="inline-flex items-center gap-1.5 font-semibold text-black"><i class="fa-solid fa-star text-[#FFD000] text-xs"></i><span>${pts} ${pts === 1 ? 'Point' : 'Points'}</span></span>
                    ${badgeHtml}
                </div>
                ${(isAnsProvided && !isEssay) ? `
                    <div class="text-xs text-black font-semibold">
                        ${curStats.correct} out of ${curStats.total} ${curStats.total === 1 ? 'correct answer' : 'correct answers'}
                    </div>
                ` : ''}
            </div>
        `;
    }
    window.updatePreviewPills();
};

window.updatePreviewTextValidation = function (qIdx) {
    if (!questions || !questions[qIdx]) return;
    const q = questions[qIdx];
    const val = window.previewUserAnswers[qIdx];
    const inputEl = document.getElementById(`preview-text-input-${qIdx}`);
    const statusEl = document.getElementById(`preview-text-status-${qIdx}`);
    const answersEl = document.getElementById(`preview-text-answers-${qIdx}`);

    if (!inputEl) return;

    const escapeFn = window.escapeHtml || function (s) { return s || ''; };
    const cleanUser = String(val || '').trim().toLowerCase();
    const hasAnswered = cleanUser.length > 0;
    const isCorrect = hasAnswered && window.isPreviewQuestionCorrect(qIdx);

    const rawAnswers = Array.isArray(q.answers) && q.answers.length > 0
        ? q.answers
        : (q.correct || q.correctAnswer || q.answer ? [q.correct || q.correctAnswer || q.answer] : []);
    const answersList = rawAnswers.map(a => typeof a === 'string' ? a : (a?.text || '')).filter(Boolean);
    const expectedAnswerText = answersList.join(', ');

    if (!hasAnswered) {
        inputEl.className = 'w-full rounded-2xl transition-colors duration-150 shadow-2xs px-4 py-3 text-sm md:text-base font-semibold outline-none focus:outline-none focus:ring-0 placeholder:text-black-fade placeholder:font-normal bg-slate-50/60 border-2 border-slate-200 focus:border-[#FFD000] focus:bg-white text-black';
        inputEl.style.cssText = 'outline: none !important;';
        if (statusEl) statusEl.innerHTML = '';
        if (answersEl) answersEl.innerHTML = '';
    } else if (isCorrect) {
        inputEl.className = 'w-full rounded-2xl transition-all shadow-2xs px-4 py-3 text-sm md:text-base font-semibold outline-none placeholder:text-black-fade placeholder:font-normal bg-emerald-50/80 border-2 border-emerald-600 text-emerald-950 font-bold';
        inputEl.style.cssText = 'background-color: #ecfdf5 !important; border-color: #059669 !important; color: #064e3b !important;';
        if (statusEl) statusEl.innerHTML = `<span class="inline-flex items-center gap-1 text-emerald-700 text-xs font-bold"><i class="fa-solid fa-circle-check"></i> Correct</span>`;
        if (answersEl) answersEl.innerHTML = '';
    } else {
        inputEl.className = 'w-full rounded-2xl transition-all shadow-2xs px-4 py-3 text-sm md:text-base font-semibold outline-none placeholder:text-black-fade placeholder:font-normal bg-rose-50/80 border-2 border-rose-500 text-rose-950 font-bold';
        inputEl.style.cssText = 'background-color: #fff1f2 !important; border-color: #f43f5e !important; color: #881337 !important;';
        if (statusEl) statusEl.innerHTML = `<span class="inline-flex items-center gap-1 text-rose-700 text-xs font-bold"><i class="fa-solid fa-circle-xmark"></i> Incorrect</span>`;
        if (answersEl && expectedAnswerText) {
            const escapeFn = window.escapeHtml || function (s) { return s || ''; };
            const rawAnswers = Array.isArray(q.answers) && q.answers.length > 0 ? q.answers : (q.correct || q.correctAnswer || q.answer ? [q.correct || q.correctAnswer || q.answer] : []);
            const answersList = rawAnswers.map(a => typeof a === 'string' ? a : (a?.text || '')).filter(Boolean);
            answersEl.innerHTML = `
                <div class="mt-3 p-3.5 rounded-2xl bg-emerald-50/90 border-2 border-emerald-200 flex items-start gap-2.5 text-xs sm:text-sm font-semibold text-emerald-900 animate-fadeIn shadow-2xs font-['Inter']">
                    <span class="w-7 h-7 rounded-full bg-[#15803d] text-white flex items-center justify-center shrink-0 text-xs shadow-2xs mt-0.5">
                        <i class="fa-solid fa-list-check text-xs"></i>
                    </span>
                    <div class="min-w-0 flex-1">
                        <span class="text-xs text-emerald-700 font-bold block">Accepted Answers</span>
                        <div class="flex flex-wrap gap-2 mt-1.5">
                            ${answersList.length > 0 ? answersList.map(a => `<span class="px-2.5 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-950 font-bold text-xs shadow-2xs">${escapeFn(a)}</span>`).join('') : `<span class="px-2.5 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-950 font-bold text-xs shadow-2xs">${escapeFn(expectedAnswerText)}</span>`}
                        </div>
                    </div>
                </div>
            `;
        }
    }

    window.updatePreviewCounter();
};

window.updatePreviewEnumValidation = function (qIdx) {
    if (!questions || !questions[qIdx]) return;
    const q = questions[qIdx];
    if (q.type !== 'Enumeration') return;

    const rawExpected = Array.isArray(q.items) ? q.items : [];
    const expectedItems = rawExpected.map(it => typeof it === 'string' ? it : (it?.text || '')).filter(Boolean);
    const expectedAnswerText = expectedItems.join(', ');
    const slotCount = Math.max(1, parseInt(q.requiredCount) || (expectedItems.length > 0 ? expectedItems.length : 3));
    const slotIndices = Array.from({ length: slotCount }, (_, i) => i);
    const curList = Array.isArray(window.previewUserAnswers[qIdx]) ? window.previewUserAnswers[qIdx] : [];

    const allFilled = slotIndices.length > 0 && slotIndices.every((_, iIdx) => curList[iIdx] && String(curList[iIdx]).trim().length > 0);

    const matchedExpectedIndices = new Set();
    const slotCorrectMap = {};

    if (allFilled) {
        slotIndices.forEach((_, sIdx) => {
            const userVal = String(curList[sIdx] || '').trim().toLowerCase();
            if (!userVal) {
                slotCorrectMap[sIdx] = false;
                return;
            }
            const expIdx = rawExpected.findIndex((_, eIdx) => {
                if (matchedExpectedIndices.has(eIdx)) return false;
                const acceptableList = window.getEnumItemAcceptableAnswers(q, eIdx).map(s => s.toLowerCase());
                return acceptableList.includes(userVal);
            });
            if (expIdx !== -1) {
                matchedExpectedIndices.add(expIdx);
                slotCorrectMap[sIdx] = true;
            } else {
                slotCorrectMap[sIdx] = false;
            }
        });
    }

    const isCurrentCorrect = allFilled && (matchedExpectedIndices.size === Math.min(slotCount, expectedItems.length));

    slotIndices.forEach((_, iIdx) => {
        const rowEl = document.getElementById(`preview-enum-row-${qIdx}-${iIdx}`);
        const badgeEl = document.getElementById(`preview-enum-badge-${qIdx}-${iIdx}`);
        const inputEl = document.getElementById(`preview-enum-input-${qIdx}-${iIdx}`);
        const iconEl = document.getElementById(`preview-enum-icon-${qIdx}-${iIdx}`);

        if (!rowEl) return;

        const isSlotCorrect = allFilled && slotCorrectMap[iIdx] === true;
        const isSlotWrong = allFilled && slotCorrectMap[iIdx] === false;

        if (allFilled) {
            if (isSlotCorrect) {
                rowEl.className = 'flex items-center gap-3.5 rounded-2xl px-4 py-3 transition-all shadow-2xs overflow-hidden bg-emerald-50/80 border-2 border-emerald-600 shadow-2xs';
                rowEl.style.cssText = 'background-color: #ecfdf5 !important; border-color: #059669 !important;';
                if (badgeEl) {
                    badgeEl.className = 'w-8 h-8 rounded-xl text-xs font-black flex items-center justify-center shrink-0 shadow-2xs bg-[#15803d] text-white border-transparent';
                    badgeEl.style.cssText = 'background-color: #15803d !important; color: #ffffff !important;';
                }
                if (inputEl) {
                    inputEl.className = 'flex-1 bg-transparent text-sm md:text-base font-semibold outline-none placeholder:text-black-fade placeholder:font-normal min-w-0 pr-2 text-emerald-950 font-bold';
                    inputEl.style.cssText = 'color: #064e3b !important;';
                }
                if (iconEl) {
                    iconEl.innerHTML = `<span class="ml-auto shrink-0 flex items-center justify-center text-emerald-600 text-base sm:text-lg animate-scaleIn"><i class="fa-solid fa-circle-check"></i></span>`;
                }
            } else if (isSlotWrong) {
                rowEl.className = 'flex items-center gap-3.5 rounded-2xl px-4 py-3 transition-all shadow-2xs overflow-hidden bg-rose-50/80 border-2 border-rose-500 shadow-2xs';
                rowEl.style.cssText = 'background-color: #fff1f2 !important; border-color: #f43f5e !important;';
                if (badgeEl) {
                    badgeEl.className = 'w-8 h-8 rounded-xl text-xs font-black flex items-center justify-center shrink-0 shadow-2xs bg-rose-600 text-white border-transparent';
                    badgeEl.style.cssText = 'background-color: #e11d48 !important; color: #ffffff !important;';
                }
                if (inputEl) {
                    inputEl.className = 'flex-1 bg-transparent text-sm md:text-base font-semibold outline-none placeholder:text-black-fade placeholder:font-normal min-w-0 pr-2 text-rose-950 font-bold';
                    inputEl.style.cssText = 'color: #881337 !important;';
                }
                if (iconEl) {
                    iconEl.innerHTML = `<span class="ml-auto shrink-0 flex items-center justify-center text-rose-600 text-base sm:text-lg animate-scaleIn"><i class="fa-solid fa-circle-xmark"></i></span>`;
                }
            }
        } else {
            rowEl.className = 'flex items-center gap-3.5 rounded-2xl px-4 py-3 transition-colors duration-150 shadow-2xs overflow-hidden bg-slate-50/60 border-2 border-slate-200 focus-within:border-[#FFD000] focus-within:bg-white text-black';
            rowEl.style.cssText = 'outline: none !important;';
            if (badgeEl) {
                badgeEl.className = 'w-8 h-8 rounded-xl text-xs font-black flex items-center justify-center shrink-0 shadow-2xs bg-white border border-slate-200 text-black';
                badgeEl.style.cssText = '';
            }
            if (inputEl) {
                inputEl.className = 'flex-1 bg-transparent text-sm md:text-base font-semibold outline-none focus:outline-none focus:ring-0 placeholder:text-black-fade placeholder:font-normal min-w-0 pr-2 text-black';
                inputEl.style.cssText = 'outline: none !important;';
            }
            if (iconEl) {
                iconEl.innerHTML = '';
            }
        }
    });

    const answersEl = document.getElementById(`preview-enum-answers-${qIdx}`);
    if (answersEl) {
        if (allFilled && !isCurrentCorrect && expectedAnswerText) {
            const escapeFn = window.escapeHtml || function (s) { return s || ''; };
            answersEl.innerHTML = `
                <div class="mt-3 p-3.5 rounded-2xl bg-emerald-50/90 border-2 border-emerald-200 flex items-start gap-2.5 text-xs sm:text-sm font-semibold text-emerald-900 animate-fadeIn shadow-2xs font-['Inter']">
                    <span class="w-7 h-7 rounded-full bg-[#15803d] text-white flex items-center justify-center shrink-0 text-xs shadow-2xs mt-0.5">
                        <i class="fa-solid fa-list-check text-xs"></i>
                    </span>
                    <div class="min-w-0 flex-1">
                        <span class="text-xs text-emerald-700 font-bold block">Accepted Answers</span>
                        <div class="flex flex-wrap gap-2 mt-1.5">
                            ${expectedItems.length > 0 ? expectedItems.map(a => `<span class="px-2.5 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-950 font-bold text-xs shadow-2xs">${escapeFn(a)}</span>`).join('') : `<span class="px-2.5 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-950 font-bold text-xs shadow-2xs">${escapeFn(expectedAnswerText)}</span>`}
                        </div>
                    </div>
                </div>
            `;
        } else {
            answersEl.innerHTML = '';
        }
    }

    window.updatePreviewCounter();
};

window.setPreviewMatchingAnswer = function (qIdx, slotIdx, val) {
    if (typeof window.previewUserAnswers[qIdx] !== 'object' || Array.isArray(window.previewUserAnswers[qIdx]) || !window.previewUserAnswers[qIdx]) {
        window.previewUserAnswers[qIdx] = {};
    }
    if (val) {
        window.previewUserAnswers[qIdx][slotIdx] = val;
    } else {
        delete window.previewUserAnswers[qIdx][slotIdx];
    }
    window.updatePreviewPills();
};

window.renderPreviewPillsHtml = function (currentIdx) {
    if (!questions || questions.length === 0) return '';
    if (typeof window.renderSharedQuizPillsHtml === 'function') {
        return window.renderSharedQuizPillsHtml({
            totalQuestions: questions.length,
            currentIndex: currentIdx,
            page: currentPreviewPillsPage,
            isAnsweredFn: (idx) => Boolean(window.isPreviewQuestionAnswered(idx)),
            onJump: 'window.jumpToPreviewQuestion',
            onPrevPage: 'window.prevPreviewPillsPage()',
            onNextPage: 'window.nextPreviewPillsPage()'
        });
    }

    const totalQ = questions.length;
    const maxPage = Math.max(0, Math.ceil(totalQ / 10) - 1);
    const page = Math.min(Math.max(0, currentPreviewPillsPage), maxPage);
    const startIdx = page * 10;

    const prevChevronHtml = `
        <button type="button" onclick="window.prevPreviewPillsPage()"
            ${!hasPrevPillPage ? 'disabled class="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center text-slate-300 opacity-30 cursor-not-allowed shrink-0"' : 'class="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center text-black hover:bg-slate-100 transition-colors cursor-pointer shrink-0"'}
            title="Previous 10 Numbers">
            <i class="fa-solid fa-chevron-left text-xs"></i>
        </button>
    `;

    const nextChevronHtml = `
        <button type="button" onclick="window.nextPreviewPillsPage()"
            ${!hasNextPillPage ? 'disabled class="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center text-slate-300 opacity-30 cursor-not-allowed shrink-0"' : 'class="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center text-black hover:bg-slate-100 transition-colors cursor-pointer shrink-0"'}
            title="Next 10 Numbers">
            <i class="fa-solid fa-chevron-right text-xs"></i>
        </button>
    `;

    const pillsHtml = visibleQuestions.map((_, offset) => {
        const pIdx = startIdx + offset;
        const isCurrent = pIdx === currentIdx;
        const isAnswered = Boolean(window.isPreviewQuestionAnswered(pIdx));

        let pillClass = '';
        if (isCurrent) {
            pillClass = isAnswered
                ? 'bg-[#FFD000] text-black border-2 border-[#15803d] font-bold shadow-xs ring-2 ring-[#15803d]/30'
                : 'bg-[#FFD000] text-black border border-[#FFD000] font-bold shadow-xs';
        } else if (isAnswered) {
            pillClass = 'bg-[#15803d] text-white border border-[#15803d] font-bold shadow-xs';
        } else {
            pillClass = 'bg-slate-50 text-black border border-slate-200 hover:bg-slate-100 font-semibold';
        }

        return `
            <button type="button" onclick="window.jumpToPreviewQuestion(${pIdx})"
                class="w-7 h-7 sm:w-8 sm:h-8 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center font-bold ${pillClass}"
                title="Question ${pIdx + 1}${isCurrent ? ' (Current)' : isAnswered ? ' (Answered)' : ''}">
                ${pIdx + 1}
            </button>
        `;
    }).join('');

    return `
        ${prevChevronHtml}
        ${pillsHtml}
        ${nextChevronHtml}
    `;
};

window.updatePreviewPills = function () {
    const strip = document.getElementById('preview-question-pills-strip');
    if (!strip || !questions) return;
    const currentIdx = Math.min(Math.max(0, currentPreviewQuestionIndex), questions.length - 1);
    strip.innerHTML = window.renderPreviewPillsHtml(currentIdx);
};

window.renderStudentPreview = function () {
    const listContainer = document.getElementById('student-preview-questions-list');
    if (!listContainer) return;

    if (!questions || questions.length === 0) {
        listContainer.innerHTML = `
            <div class="py-16 text-center text-black-fade font-medium">
                No questions available to preview.
            </div>
        `;
        return;
    }

    const idx = Math.min(Math.max(0, currentPreviewQuestionIndex), questions.length - 1);
    const q = questions[idx];
    const qNum = idx + 1;
    const totalQ = questions.length;
    const pts = (q.points !== undefined && !isNaN(parseInt(q.points))) ? parseInt(q.points) : 0;
    const escapeFn = window.escapeHtml || function (s) { return s || ''; };
    const escapedPrompt = escapeFn(q.question || 'Untitled Question');

    const curAns = window.previewUserAnswers[idx];
    const isAnsProvided = window.isPreviewQuestionAnswered(idx);
    const isCurrentCorrect = isAnsProvided && window.isPreviewQuestionCorrect(idx);

    let bodyHtml = '';

    if (q.type === 'Multiple Choice' || !q.type) {
        const rawChoices = (q.choices && q.choices.length > 0) ? q.choices : ['Option 1', 'Option 2', 'Option 3', 'Option 4'];
        let displayChoices = rawChoices;
        if (q.shuffleChoices) {
            if (!window.previewShuffledChoices) window.previewShuffledChoices = {};
            if (!window.previewShuffledChoices[idx]) {
                window.previewShuffledChoices[idx] = [...rawChoices].sort(() => Math.random() - 0.5);
            }
            displayChoices = window.previewShuffledChoices[idx];
        }
        const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

        bodyHtml = `
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                ${displayChoices.map((choice, cIdx) => {
                    const fallbackLabel = 'Option ' + (cIdx + 1);
                    const choiceVal = (typeof choice === 'object' && choice !== null) ? (choice.text || choice.label || choice.value || fallbackLabel) : ((choice !== undefined && choice !== null && String(choice).trim().length > 0) ? String(choice).trim() : fallbackLabel);
                    const letter = optionLetters[cIdx] || String(cIdx + 1);
                    const cleanChoiceText = String(choiceVal).replace(/^[A-H][\.\)]\s*/i, '').trim() || choiceVal;
                    const isChecked = Boolean(curAns && (
                        curAns === choiceVal ||
                        curAns === letter ||
                        String(curAns).trim().toLowerCase() === String(choiceVal).trim().toLowerCase() ||
                        String(curAns).trim().toLowerCase() === String(cleanChoiceText).trim().toLowerCase() ||
                        String(curAns).trim().toUpperCase() === letter
                    ));
                    const isCorrectChoice = isQuizCreatorChoiceCorrect(q, cIdx, choiceVal, letter);

                    let cardClass = 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60';
                    let cardStyle = '';
                    let badgeClass = 'bg-slate-100 text-slate-700 group-hover:bg-slate-200';
                    let badgeStyle = '';
                    let textClass = 'text-black';
                    let textStyle = '';
                    let statusIconHtml = '';

                    if (isAnsProvided) {
                        if (isChecked && !isCorrectChoice) {
                            // Clicked wrong answer -> RED TINT, RED BORDER & RED WRONG ICON
                            cardClass = 'border-rose-500 bg-rose-50/80 ring-2 ring-rose-500/20 shadow-xs';
                            cardStyle = 'background-color: #fff1f2 !important; border-color: #f43f5e !important; box-shadow: 0 0 0 2px rgba(244, 63, 94, 0.25) !important;';
                            badgeClass = 'bg-rose-600 text-white shadow-2xs';
                            badgeStyle = 'background-color: #e11d48 !important; color: #ffffff !important;';
                            textClass = 'text-rose-900 font-bold';
                            textStyle = 'color: #881337 !important;';
                            statusIconHtml = `<span class="ml-auto shrink-0 flex items-center justify-center text-rose-600 text-base sm:text-lg animate-scaleIn"><i class="fa-solid fa-circle-xmark"></i></span>`;
                        } else if (isCorrectChoice) {
                            // Correct answer -> GREEN TINT, GREEN BORDER & GREEN CHECK ICON
                            cardClass = 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-600/20 shadow-xs';
                            cardStyle = 'background-color: #ecfdf5 !important; border-color: #059669 !important; box-shadow: 0 0 0 2px rgba(5, 150, 105, 0.25) !important;';
                            badgeClass = 'bg-[#15803d] text-white shadow-2xs';
                            badgeStyle = 'background-color: #15803d !important; color: #ffffff !important;';
                            textClass = 'text-emerald-900 font-bold';
                            textStyle = 'color: #064e3b !important;';
                            statusIconHtml = `<span class="ml-auto shrink-0 flex items-center justify-center text-emerald-600 text-base sm:text-lg animate-scaleIn"><i class="fa-solid fa-circle-check"></i></span>`;
                        } else {
                            cardClass = 'border-slate-200 bg-white/70 opacity-60 hover:opacity-100 hover:border-slate-300';
                            badgeClass = 'bg-slate-100 text-slate-700';
                            textClass = 'text-slate-700';
                        }
                    } else if (isChecked) {
                        cardClass = 'border-[#15803d] bg-emerald-50/70 ring-2 ring-[#15803d]/20 shadow-xs';
                        cardStyle = 'background-color: #ecfdf5 !important; border-color: #15803d !important;';
                        badgeClass = 'bg-[#15803d] text-white shadow-2xs';
                        badgeStyle = 'background-color: #15803d !important; color: #ffffff !important;';
                        textClass = 'text-[#15803d] font-bold';
                        textStyle = 'color: #15803d !important;';
                    }

                    return `
                        <button type="button" onclick="window.setPreviewAnswer(${idx}, '${escapeFn(letter)}')"
                            style="${cardStyle}"
                            class="relative flex items-center text-left gap-3.5 p-4 rounded-2xl border-2 transition-all cursor-pointer select-none group shadow-2xs overflow-hidden min-w-0 ${cardClass}">
                            <span style="${badgeStyle}" class="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 transition-colors ${badgeClass}">
                                ${letter}
                            </span>
                            <span style="${textStyle}" class="text-sm font-semibold leading-relaxed flex-1 transition-colors break-words min-w-0 ${textClass}">
                                ${escapeFn(cleanChoiceText)}
                            </span>
                            ${statusIconHtml}
                        </button>
                    `;
                }).join('')}
            </div>
        `;
    } else if (q.type === 'True or False') {
        const isTrueChecked = Boolean(curAns && (String(curAns).toLowerCase() === 'true' || String(curAns).toLowerCase() === 't' || String(curAns).toUpperCase() === 'A'));
        const isFalseChecked = Boolean(curAns && (String(curAns).toLowerCase() === 'false' || String(curAns).toLowerCase() === 'f' || String(curAns).toUpperCase() === 'B'));
        const isTrueCorrect = isQuizCreatorChoiceCorrect(q, 0, 'True', 'A') || isQuizCreatorChoiceCorrect(q, 0, 'True', 'True') || String(q.correct || q.correctAnswer || '').trim().toLowerCase() === 'true';
        const isFalseCorrect = !isTrueCorrect;

        let trueCardClass = isTrueChecked ? 'border-[#15803d] bg-emerald-50/80 ring-2 ring-[#15803d]/20 shadow-xs' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60';
        let trueCardStyle = isTrueChecked ? 'background-color: #ecfdf5 !important; border-color: #15803d !important;' : '';
        let trueBadgeClass = isTrueChecked ? 'bg-[#15803d] text-white shadow-2xs' : 'bg-slate-100 text-slate-700 group-hover:bg-slate-200';
        let trueBadgeStyle = isTrueChecked ? 'background-color: #15803d !important; color: #ffffff !important;' : '';
        let trueTextClass = isTrueChecked ? 'text-[#15803d] font-bold' : 'text-black';
        let trueTextStyle = isTrueChecked ? 'color: #15803d !important;' : '';
        let trueStatusIcon = '';

        let falseCardClass = isFalseChecked ? 'border-[#15803d] bg-emerald-50/80 ring-2 ring-[#15803d]/20 shadow-xs' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60';
        let falseCardStyle = isFalseChecked ? 'background-color: #ecfdf5 !important; border-color: #15803d !important;' : '';
        let falseBadgeClass = isFalseChecked ? 'bg-[#15803d] text-white shadow-2xs' : 'bg-slate-100 text-slate-700 group-hover:bg-slate-200';
        let falseBadgeStyle = isFalseChecked ? 'background-color: #15803d !important; color: #ffffff !important;' : '';
        let falseTextClass = isFalseChecked ? 'text-[#15803d] font-bold' : 'text-black';
        let falseTextStyle = isFalseChecked ? 'color: #15803d !important;' : '';
        let falseStatusIcon = '';

        if (isAnsProvided) {
            if (isTrueChecked) {
                if (isTrueCorrect) {
                    trueCardClass = 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-600/20 shadow-xs';
                    trueCardStyle = 'background-color: #ecfdf5 !important; border-color: #059669 !important; box-shadow: 0 0 0 2px rgba(5, 150, 105, 0.25) !important;';
                    trueBadgeClass = 'bg-[#15803d] text-white shadow-2xs';
                    trueBadgeStyle = 'background-color: #15803d !important; color: #ffffff !important;';
                    trueTextClass = 'text-emerald-900 font-bold';
                    trueTextStyle = 'color: #064e3b !important;';
                    trueStatusIcon = `<span class="ml-auto shrink-0 flex items-center justify-center text-emerald-600 text-base sm:text-lg animate-scaleIn"><i class="fa-solid fa-circle-check"></i></span>`;
                    falseCardClass = 'border-slate-200 bg-white/70 opacity-60';
                    falseCardStyle = '';
                    falseBadgeClass = 'bg-slate-100 text-slate-700';
                    falseBadgeStyle = '';
                    falseTextClass = 'text-slate-700';
                    falseTextStyle = '';
                } else {
                    trueCardClass = 'border-rose-500 bg-rose-50/80 ring-2 ring-rose-500/20 shadow-xs';
                    trueCardStyle = 'background-color: #fff1f2 !important; border-color: #f43f5e !important; box-shadow: 0 0 0 2px rgba(244, 63, 94, 0.25) !important;';
                    trueBadgeClass = 'bg-rose-600 text-white shadow-2xs';
                    trueBadgeStyle = 'background-color: #e11d48 !important; color: #ffffff !important;';
                    trueTextClass = 'text-rose-900 font-bold';
                    trueTextStyle = 'color: #881337 !important;';
                    trueStatusIcon = `<span class="ml-auto shrink-0 flex items-center justify-center text-rose-600 text-base sm:text-lg animate-scaleIn"><i class="fa-solid fa-circle-xmark"></i></span>`;
                    falseCardClass = 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-600/20 shadow-xs';
                    falseCardStyle = 'background-color: #ecfdf5 !important; border-color: #059669 !important; box-shadow: 0 0 0 2px rgba(5, 150, 105, 0.25) !important;';
                    falseBadgeClass = 'bg-[#15803d] text-white shadow-2xs';
                    falseBadgeStyle = 'background-color: #15803d !important; color: #ffffff !important;';
                    falseTextClass = 'text-emerald-900 font-bold';
                    falseTextStyle = 'color: #064e3b !important;';
                    falseStatusIcon = `<span class="ml-auto shrink-0 flex items-center justify-center text-emerald-600 text-base sm:text-lg animate-scaleIn"><i class="fa-solid fa-circle-check"></i></span>`;
                }
            } else if (isFalseChecked) {
                if (isFalseCorrect) {
                    falseCardClass = 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-600/20 shadow-xs';
                    falseCardStyle = 'background-color: #ecfdf5 !important; border-color: #059669 !important; box-shadow: 0 0 0 2px rgba(5, 150, 105, 0.25) !important;';
                    falseBadgeClass = 'bg-[#15803d] text-white shadow-2xs';
                    falseBadgeStyle = 'background-color: #15803d !important; color: #ffffff !important;';
                    falseTextClass = 'text-emerald-900 font-bold';
                    falseTextStyle = 'color: #064e3b !important;';
                    falseStatusIcon = `<span class="ml-auto shrink-0 flex items-center justify-center text-emerald-600 text-base sm:text-lg animate-scaleIn"><i class="fa-solid fa-circle-check"></i></span>`;
                    trueCardClass = 'border-slate-200 bg-white/70 opacity-60';
                    trueCardStyle = '';
                    trueBadgeClass = 'bg-slate-100 text-slate-700';
                    trueBadgeStyle = '';
                    trueTextClass = 'text-slate-700';
                    trueTextStyle = '';
                } else {
                    falseCardClass = 'border-rose-500 bg-rose-50/80 ring-2 ring-rose-500/20 shadow-xs';
                    falseCardStyle = 'background-color: #fff1f2 !important; border-color: #f43f5e !important; box-shadow: 0 0 0 2px rgba(244, 63, 94, 0.25) !important;';
                    falseBadgeClass = 'bg-rose-600 text-white shadow-2xs';
                    falseBadgeStyle = 'background-color: #e11d48 !important; color: #ffffff !important;';
                    falseTextClass = 'text-rose-900 font-bold';
                    falseTextStyle = 'color: #881337 !important;';
                    falseStatusIcon = `<span class="ml-auto shrink-0 flex items-center justify-center text-rose-600 text-base sm:text-lg animate-scaleIn"><i class="fa-solid fa-circle-xmark"></i></span>`;
                    trueCardClass = 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-600/20 shadow-xs';
                    trueCardStyle = 'background-color: #ecfdf5 !important; border-color: #059669 !important; box-shadow: 0 0 0 2px rgba(5, 150, 105, 0.25) !important;';
                    trueBadgeClass = 'bg-[#15803d] text-white shadow-2xs';
                    trueBadgeStyle = 'background-color: #15803d !important; color: #ffffff !important;';
                    trueTextClass = 'text-emerald-900 font-bold';
                    trueTextStyle = 'color: #064e3b !important;';
                    trueStatusIcon = `<span class="ml-auto shrink-0 flex items-center justify-center text-emerald-600 text-base sm:text-lg animate-scaleIn"><i class="fa-solid fa-circle-check"></i></span>`;
                }
            }
        }

        bodyHtml = `
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 max-w-xl">
                <!-- True Option Card -->
                <button type="button" onclick="window.setPreviewAnswer(${idx}, 'True')"
                    style="${trueCardStyle}"
                    class="relative flex items-center text-left gap-3.5 p-4 rounded-2xl border-2 transition-all cursor-pointer select-none group shadow-2xs overflow-hidden min-w-0 ${trueCardClass}">
                    <span style="${trueBadgeStyle}" class="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black shrink-0 transition-colors ${trueBadgeClass}">
                        <i class="fa-solid fa-check text-xs"></i>
                    </span>
                    <span style="${trueTextStyle}" class="text-base font-bold transition-colors truncate ${trueTextClass}">
                        True
                    </span>
                    ${trueStatusIcon}
                </button>

                <!-- False Option Card -->
                <button type="button" onclick="window.setPreviewAnswer(${idx}, 'False')"
                    style="${falseCardStyle}"
                    class="relative flex items-center text-left gap-3.5 p-4 rounded-2xl border-2 transition-all cursor-pointer select-none group shadow-2xs overflow-hidden min-w-0 ${falseCardClass}">
                    <span style="${falseBadgeStyle}" class="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black shrink-0 transition-colors ${falseBadgeClass}">
                        <i class="fa-solid fa-xmark text-xs"></i>
                    </span>
                    <span style="${falseTextStyle}" class="text-base font-bold transition-colors truncate ${falseTextClass}">
                        False
                    </span>
                    ${falseStatusIcon}
                </button>
            </div>
        `;
    } else if (q.type === 'Short Answer' || q.type === 'Identification') {
        const curAns = window.previewUserAnswers[idx] || '';
        const rawAnswers = Array.isArray(q.answers) && q.answers.length > 0
            ? q.answers
            : (q.correct || q.correctAnswer || q.answer ? [q.correct || q.correctAnswer || q.answer] : []);
        const answersList = rawAnswers.map(a => typeof a === 'string' ? a : (a?.text || '')).filter(Boolean);
        const expectedAnswerText = answersList.join(' / ') || q.correct || q.correctAnswer || q.sampleAnswer || '';

        const ansText = typeof curAns === 'string' ? curAns : '';
        const hasAnswer = Boolean(ansText.trim().length > 0);
        const isMatch = hasAnswer && isCurrentCorrect;

        let inputClass = 'bg-slate-50/60 border-2 border-slate-200 focus:border-[#FFD000] focus:bg-white text-black';
        let statusBadge = '';
        let answerKeyHtml = '';

        if (hasAnswer) {
            if (isMatch) {
                inputClass = 'bg-emerald-50/70 border-2 border-emerald-600 text-emerald-900 focus:border-emerald-700 focus:bg-white';
                statusBadge = `<span class="text-xs font-bold text-[#15803d] flex items-center gap-1 shrink-0"><i class="fa-solid fa-circle-check"></i> Correct</span>`;
                // DO NOT show the answer key if correct
            } else {
                inputClass = 'bg-rose-50/70 border-2 border-rose-500 text-rose-900 focus:border-rose-600 focus:bg-white';
                statusBadge = `<span class="text-xs font-bold text-rose-600 flex items-center gap-1 shrink-0"><i class="fa-solid fa-circle-xmark"></i> Wrong</span>`;
                // Show answer key below the content if wrong
                if (expectedAnswerText) {
                    const rawAnswers = Array.isArray(q.answers) && q.answers.length > 0 ? q.answers : (q.correct || q.correctAnswer || q.answer ? [q.correct || q.correctAnswer || q.answer] : []);
                    const answersList = rawAnswers.map(a => typeof a === 'string' ? a : (a?.text || '')).filter(Boolean);
                    answerKeyHtml = `
                        <div class="mt-3 p-3.5 rounded-2xl bg-emerald-50/90 border-2 border-emerald-200 flex items-start gap-2.5 text-xs sm:text-sm font-semibold text-emerald-900 animate-fadeIn shadow-2xs font-['Inter']">
                            <span class="w-7 h-7 rounded-full bg-[#15803d] text-white flex items-center justify-center shrink-0 text-xs shadow-2xs mt-0.5">
                                <i class="fa-solid fa-list-check text-xs"></i>
                            </span>
                            <div class="min-w-0 flex-1">
                                <span class="text-xs text-emerald-700 font-bold block">Accepted Answers</span>
                                <div class="flex flex-wrap gap-2 mt-1.5">
                                    ${answersList.length > 0 ? answersList.map(a => `<span class="px-2.5 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-950 font-bold text-xs shadow-2xs">${escapeFn(a)}</span>`).join('') : `<span class="px-2.5 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-950 font-bold text-xs shadow-2xs">${escapeFn(expectedAnswerText)}</span>`}
                                </div>
                            </div>
                        </div>
                    `;
                }
            }
        }

        bodyHtml = `
            <div class="pt-2 w-full space-y-2">
                <div class="flex items-center justify-between gap-2">
                    <label class="text-xs font-bold text-black-fade block">Response</label>
                    <div id="preview-text-status-${idx}">${statusBadge}</div>
                </div>
                <input type="text" id="preview-text-input-${idx}" placeholder="Type your answer here..."
                    maxlength="100"
                    value="${escapeFn(ansText)}"
                    oninput="window.setPreviewTextAnswer(${idx}, this.value)"
                    style="outline: none !important;"
                    class="w-full rounded-2xl transition-colors duration-150 shadow-2xs px-4 py-3 text-sm md:text-base font-semibold outline-none focus:outline-none focus:ring-0 placeholder:text-black-fade placeholder:font-normal ${inputClass}">
                <div id="preview-text-answers-${idx}">${answerKeyHtml}</div>
            </div>
        `;
    } else if (q.type === 'Enumeration') {
        const rawExpected = Array.isArray(q.items) ? q.items : [];
        const expectedItems = rawExpected.map(it => typeof it === 'string' ? it : (it?.text || '')).filter(Boolean);
        const expectedAnswerText = expectedItems.join(', ');
        const slotCount = Math.max(1, parseInt(q.requiredCount) || (expectedItems.length > 0 ? expectedItems.length : 3));
        const slotIndices = Array.from({ length: slotCount }, (_, i) => i);
        const curList = Array.isArray(window.previewUserAnswers[idx]) ? window.previewUserAnswers[idx] : [];

        // Check if all slots are filled with non-empty text
        const allFilled = slotIndices.length > 0 && slotIndices.every((_, iIdx) => curList[iIdx] && String(curList[iIdx]).trim().length > 0);

        // Compute individual slot correctness when allFilled
        const matchedExpectedIndices = new Set();
        const slotCorrectMap = {};

        if (allFilled) {
            slotIndices.forEach((_, sIdx) => {
                const userVal = String(curList[sIdx] || '').trim().toLowerCase();
                if (!userVal) {
                    slotCorrectMap[sIdx] = false;
                    return;
                }
                const expIdx = rawExpected.findIndex((_, eIdx) => {
                    if (matchedExpectedIndices.has(eIdx)) return false;
                    const acceptableList = window.getEnumItemAcceptableAnswers(q, eIdx).map(s => s.toLowerCase());
                    return acceptableList.includes(userVal);
                });
                if (expIdx !== -1) {
                    matchedExpectedIndices.add(expIdx);
                    slotCorrectMap[sIdx] = true;
                } else {
                    slotCorrectMap[sIdx] = false;
                }
            });
        }

        let enumAnswerKeyHtml = '';
        if (allFilled && !isCurrentCorrect && expectedAnswerText) {
            enumAnswerKeyHtml = `
                <div class="mt-3 p-3.5 rounded-2xl bg-emerald-50/90 border-2 border-emerald-200 flex items-start gap-2.5 text-xs sm:text-sm font-semibold text-emerald-900 animate-fadeIn shadow-2xs font-['Inter']">
                    <span class="w-7 h-7 rounded-full bg-[#15803d] text-white flex items-center justify-center shrink-0 text-xs shadow-2xs mt-0.5">
                        <i class="fa-solid fa-list-check text-xs"></i>
                    </span>
                    <div class="min-w-0 flex-1">
                        <span class="text-xs text-emerald-700 font-bold block">Accepted Answers</span>
                        <div class="flex flex-wrap gap-2 mt-1.5">
                            ${expectedItems.length > 0 ? expectedItems.map(a => `<span class="px-2.5 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-950 font-bold text-xs shadow-2xs">${escapeFn(a)}</span>`).join('') : `<span class="px-2.5 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-950 font-bold text-xs shadow-2xs">${escapeFn(expectedAnswerText)}</span>`}
                        </div>
                    </div>
                </div>
            `;
        }

        bodyHtml = `
            <div class="space-y-3 pt-2 w-full">
                <label class="text-xs font-bold text-black-fade block">List the required answers:</label>
                ${slotIndices.map((_, iIdx) => {
                    const curVal = curList[iIdx] || '';
                    const isSlotCorrect = allFilled && slotCorrectMap[iIdx] === true;
                    const isSlotWrong = allFilled && slotCorrectMap[iIdx] === false;

                    let rowContainerClass = 'bg-slate-50/60 border-2 border-slate-200 focus-within:border-[#FFD000] focus-within:bg-white text-black';
                    let rowContainerStyle = '';
                    let badgeClass = 'bg-white border border-slate-200 text-black';
                    let badgeStyle = '';
                    let inputClass = 'text-black';
                    let inputStyle = '';
                    let statusIcon = '';

                    if (allFilled) {
                        if (isSlotCorrect) {
                            rowContainerClass = 'bg-emerald-50/80 border-2 border-emerald-600 shadow-2xs';
                            rowContainerStyle = 'background-color: #ecfdf5 !important; border-color: #059669 !important;';
                            badgeClass = 'bg-[#15803d] text-white border-transparent';
                            badgeStyle = 'background-color: #15803d !important; color: #ffffff !important;';
                            inputClass = 'text-emerald-950 font-bold';
                            inputStyle = 'color: #064e3b !important;';
                            statusIcon = `<span class="ml-auto shrink-0 flex items-center justify-center text-emerald-600 text-base sm:text-lg animate-scaleIn"><i class="fa-solid fa-circle-check"></i></span>`;
                        } else if (isSlotWrong) {
                            rowContainerClass = 'bg-rose-50/80 border-2 border-rose-500 shadow-2xs';
                            rowContainerStyle = 'background-color: #fff1f2 !important; border-color: #f43f5e !important;';
                            badgeClass = 'bg-rose-600 text-white border-transparent';
                            badgeStyle = 'background-color: #e11d48 !important; color: #ffffff !important;';
                            inputClass = 'text-rose-950 font-bold';
                            inputStyle = 'color: #881337 !important;';
                            statusIcon = `<span class="ml-auto shrink-0 flex items-center justify-center text-rose-600 text-base sm:text-lg animate-scaleIn"><i class="fa-solid fa-circle-xmark"></i></span>`;
                        }
                    }

                    return `
                        <div id="preview-enum-row-${idx}-${iIdx}" style="${rowContainerStyle} outline: none !important;" class="flex items-center gap-3.5 rounded-2xl px-4 py-3 transition-colors duration-150 shadow-2xs overflow-hidden ${rowContainerClass}">
                            <span id="preview-enum-badge-${idx}-${iIdx}" style="${badgeStyle}" class="w-8 h-8 rounded-xl text-xs font-black flex items-center justify-center shrink-0 shadow-2xs ${badgeClass}">
                                ${iIdx + 1}
                            </span>
                            <input type="text" id="preview-enum-input-${idx}-${iIdx}" placeholder="Item ${iIdx + 1} answer..."
                                maxlength="100"
                                value="${escapeFn(curVal)}"
                                style="${inputStyle} outline: none !important;"
                                oninput="window.setPreviewEnumAnswer(${idx}, ${iIdx}, this.value)"
                                class="flex-1 bg-transparent text-sm md:text-base font-semibold outline-none focus:outline-none focus:ring-0 placeholder:text-black-fade placeholder:font-normal min-w-0 pr-2 ${inputClass}">
                            <div id="preview-enum-icon-${idx}-${iIdx}">${statusIcon}</div>
                        </div>
                    `;
                }).join('')}
                <div id="preview-enum-answers-${idx}">${enumAnswerKeyHtml}</div>
            </div>
        `;
    } else if (q.type === 'Essay') {
        const curAns = window.previewUserAnswers[idx] || '';
        const rubricText = (q.rubric || q.sampleAnswer || q.notes || '').trim();
        const rubricHtml = rubricText ? `
            <div class="mt-3 p-4 rounded-2xl bg-emerald-50/90 border-2 border-emerald-200 flex items-start gap-3 text-xs sm:text-sm font-semibold text-emerald-900 animate-fadeIn shadow-2xs">
                <span class="w-7 h-7 rounded-xl bg-[#15803d] text-white flex items-center justify-center shrink-0 text-xs shadow-2xs mt-0.5">
                    <i class="fa-solid fa-file-pen text-xs"></i>
                </span>
                <div class="min-w-0 flex-1">
                    <span class="text-[11px] text-emerald-700 font-bold block uppercase tracking-wider">Grading Criteria / Key Points / Sample Notes</span>
                    <span class="font-semibold text-emerald-950 break-words whitespace-pre-wrap leading-relaxed">${escapeFn(rubricText)}</span>
                </div>
            </div>
        ` : '';

        bodyHtml = `
            <div class="pt-2 space-y-2 w-full">
                <label class="text-xs font-bold text-black-fade block">Response Area</label>
                <textarea rows="5" placeholder="Type your essay or paragraph answer here..."
                    maxlength="8000"
                    oninput="window.setPreviewTextAnswer(${idx}, this.value, false)"
                    style="outline: none !important;"
                    class="w-full bg-slate-50/60 border-2 border-slate-200 focus:border-[#FFD000] focus:bg-white rounded-2xl p-4 text-sm md:text-base font-normal text-black outline-none focus:outline-none focus:ring-0 placeholder:text-black-fade resize-none leading-relaxed transition-colors duration-150 shadow-2xs break-words">${escapeFn(curAns || '')}</textarea>
                ${rubricHtml}
            </div>
        `;
    } else if (q.type === 'Matching Type') {
        const pairs = q.pairs && q.pairs.length > 0 ? q.pairs : [{ premise: '', target: '' }, { premise: '', target: '' }];
        const targets = pairs.map(p => p.target).filter(Boolean);
        if (!window.previewShuffledPairs) window.previewShuffledPairs = {};
        if (!window.previewShuffledPairs[idx]) {
            window.previewShuffledPairs[idx] = [...targets].sort(() => Math.random() - 0.5);
        }
        const shuffledTargets = window.previewShuffledPairs[idx];
        const curSlots = (typeof window.previewUserAnswers[idx] === 'object' && window.previewUserAnswers[idx]) ? window.previewUserAnswers[idx] : {};

        // Count how many times each answer string is currently placed in target slots
        const placedCounts = {};
        Object.values(curSlots).forEach(val => {
            if (val) placedCounts[val] = (placedCounts[val] || 0) + 1;
        });
        const usedTracker = {};

        bodyHtml = `
            <div class="space-y-6 pt-2">
                <!-- Choices Bank (Draggable pills) -->
                <div class="bg-slate-50/80 border-2 border-slate-200 rounded-3xl p-6 sm:p-7 shadow-2xs space-y-4">
                    <div class="flex items-center justify-between text-xs font-bold text-black">
                        <div class="flex items-center gap-2">
                            <span class="w-6 h-6 rounded-lg bg-emerald-100 text-[#15803d] flex items-center justify-center text-xs shadow-2xs">
                                <i class="fa-solid fa-layer-group"></i>
                            </span>
                            <span class="text-sm font-bold text-black">Choice Bank</span>
                            <span class="text-xs font-normal text-black-fade">(Drag choices into matching slots below)</span>
                        </div>
                    </div>
                    <div class="flex items-center gap-3 flex-wrap p-3 bg-white rounded-2xl border border-slate-200/90 shadow-2xs" id="preview-choice-bank-${idx}">
                        ${shuffledTargets.map((t) => {
                            const neededCount = placedCounts[t] || 0;
                            const currentUsed = usedTracker[t] || 0;
                            const isUsed = currentUsed < neededCount;
                            if (isUsed) {
                                usedTracker[t] = currentUsed + 1;
                            }
                            return `
                                <div draggable="${!isUsed}"
                                    ondragstart="window.handlePreviewChoiceDragStart(event, '${escapeFn(t).replace(/'/g, "\\'")}')"
                                    ondragend="window.handlePreviewChoiceDragEnd(event)"
                                    class="min-h-[44px] min-w-[76px] px-5 py-2.5 rounded-2xl border-2 text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-2.5 select-none ${isUsed ? 'bg-slate-100/90 border-slate-200 text-black/35 opacity-40 cursor-not-allowed line-through' : 'bg-white border-slate-200 hover:border-black hover:bg-slate-50 text-black cursor-grab active:cursor-grabbing shadow-2xs hover:shadow-xs'}">
                                    <i class="fa-solid fa-grip-vertical ${isUsed ? 'text-slate-300' : 'text-black-fade'} text-xs shrink-0"></i>
                                    <span class="break-words min-w-0 text-center">${escapeFn(t)}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>

                <!-- Matching Target Rows -->
                <div class="space-y-4">
                    ${pairs.map((pair, pIdx) => {
                        const placed = curSlots[pIdx] || '';
                        const expectedTarget = String(pair.target || '').trim().toLowerCase();
                        const placedTarget = String(placed).trim().toLowerCase();
                        const hasPlaced = Boolean(placed && placed.trim().length > 0);
                        const isPairMatch = hasPlaced && (placedTarget === expectedTarget);

                        let slotBorderBgClass = 'border-dashed border-slate-300 bg-slate-50/60 hover:bg-slate-100 hover:border-slate-400 text-black-fade';
                        let slotStyle = '';
                        let slotInnerHtml = '';

                        if (hasPlaced) {
                            if (isPairMatch) {
                                slotBorderBgClass = 'border-solid border-emerald-600 bg-emerald-50/90 shadow-2xs text-emerald-950';
                                slotStyle = 'background-color: #ecfdf5 !important; border-color: #059669 !important;';
                                slotInnerHtml = `
                                    <span class="font-bold text-emerald-950 text-sm break-words min-w-0 mr-3">${escapeFn(placed)}</span>
                                    <div class="flex items-center gap-2 shrink-0">
                                        <span class="text-emerald-600 text-base sm:text-lg flex items-center justify-center animate-scaleIn" title="Correct Match">
                                            <i class="fa-solid fa-circle-check"></i>
                                        </span>
                                        <button type="button" onclick="event.stopPropagation(); window.clearPreviewSlot(this.parentElement, ${idx}, ${pIdx})" class="w-7 h-7 rounded-lg hover:bg-emerald-200/70 text-emerald-800 hover:text-emerald-950 flex items-center justify-center transition-colors shrink-0 cursor-pointer" title="Remove Match">
                                            <i class="fa-solid fa-xmark text-sm"></i>
                                        </button>
                                    </div>
                                `;
                            } else {
                                slotBorderBgClass = 'border-solid border-rose-500 bg-rose-50/90 shadow-2xs text-rose-950';
                                slotStyle = 'background-color: #fff1f2 !important; border-color: #f43f5e !important;';
                                slotInnerHtml = `
                                    <span class="font-bold text-rose-950 text-sm break-words min-w-0 mr-3">${escapeFn(placed)}</span>
                                    <div class="flex items-center gap-2 shrink-0">
                                        <span class="text-rose-600 text-base sm:text-lg flex items-center justify-center animate-scaleIn" title="Incorrect Match">
                                            <i class="fa-solid fa-circle-xmark"></i>
                                        </span>
                                        <button type="button" onclick="event.stopPropagation(); window.clearPreviewSlot(this.parentElement, ${idx}, ${pIdx})" class="w-7 h-7 rounded-lg hover:bg-rose-200/70 text-rose-800 hover:text-rose-950 flex items-center justify-center transition-colors shrink-0 cursor-pointer" title="Remove Match">
                                            <i class="fa-solid fa-xmark text-sm"></i>
                                        </button>
                                    </div>
                                `;
                            }
                        } else {
                            slotInnerHtml = `
                                <span class="slot-placeholder text-black-fade font-medium break-words min-w-0">Drop matching answer here</span>
                                <span class="text-black-fade text-xs opacity-40 shrink-0 ml-2"><i class="fa-solid fa-arrow-down-long"></i></span>
                            `;
                        }

                        return `
                            <div class="flex flex-col md:flex-row md:items-center gap-4 bg-white border-2 border-slate-200 rounded-2xl p-5 shadow-2xs hover:border-slate-300 transition-colors">
                                <div class="flex items-center gap-3.5 md:w-1/2 min-w-0">
                                    <span class="w-8 h-8 rounded-xl bg-slate-100 text-black text-xs font-black flex items-center justify-center shrink-0 border border-slate-200 shadow-2xs">${pIdx + 1}</span>
                                    <span class="text-sm font-semibold text-black leading-relaxed break-words min-w-0">${escapeFn(pair.premise) || ('Item ' + (pIdx + 1))}</span>
                                </div>
                                <div class="hidden md:flex items-center justify-center text-slate-300 px-1 shrink-0">
                                    <i class="fa-solid fa-arrow-right text-xs"></i>
                                </div>
                                <div class="md:flex-1 min-w-0">
                                    <div ondragover="event.preventDefault(); this.classList.add('border-black', 'bg-slate-100');"
                                         ondragleave="this.classList.remove('border-black', 'bg-slate-100');"
                                         ondrop="this.classList.remove('border-black', 'bg-slate-100'); window.handlePreviewMatchingDrop(event, this, ${idx}, ${pIdx})"
                                         style="${slotStyle}"
                                         class="min-h-[52px] rounded-2xl border-2 ${slotBorderBgClass} px-6 py-3.5 flex items-center justify-between text-xs transition-all cursor-pointer select-none group/slot overflow-hidden min-w-0">
                                        ${slotInnerHtml}
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    const generalImagesHtml = (window.quizGeneralImages && window.quizGeneralImages.length > 0) ? `
        <div class="space-y-4 pb-2">
            ${window.quizGeneralImages.map(gImg => `
                <div class="flex flex-col items-center w-full space-y-1.5">
                    <div onclick="window.openImageFullscreen('${escapeFn(gImg.src)}', '${escapeFn(gImg.title || '').replace(/'/g, "\\'")}')"
                        class="relative group/previmg w-full max-w-[560px] h-[260px] sm:h-[300px] md:h-[320px] rounded-2xl overflow-hidden bg-black flex items-center justify-center border border-slate-200 shadow-2xs cursor-zoom-in">
                        <img src="${escapeFn(gImg.src)}" alt="${escapeFn(gImg.title || 'Quiz Image')}" class="max-w-full max-h-full object-contain pointer-events-none">
                        <div class="absolute top-3 right-3 opacity-0 group-hover/previmg:opacity-100 transition-opacity pointer-events-none">
                            <span class="px-2.5 py-1 rounded-xl bg-black/70 text-white text-[11px] font-semibold flex items-center gap-1.5 shadow-md">
                                <i class="fa-solid fa-expand text-[10px]"></i>
                                <span>Click to enlarge</span>
                            </span>
                        </div>
                    </div>
                    ${gImg.title ? `
                        <p class="text-xs font-semibold text-black-fade text-center max-w-[560px] break-words pt-1">${escapeFn(gImg.title)}</p>
                    ` : ''}
                </div>
            `).join('')}
        </div>
    ` : '';

    // Update Quiz Title and Subheader Counter & Pills
    const titleEl = document.getElementById('student-preview-quiz-title');
    if (titleEl) {
        const titleText = (typeof currentQuizTitle !== 'undefined' && currentQuizTitle) ? currentQuizTitle : 'Quiz Assessment';
        titleEl.textContent = titleText;
    }
    window.updatePreviewCounter();

    listContainer.innerHTML = `
        <!-- Centered Question Focus Container -->
        <div class="space-y-6">
            <!-- General Images if any (rendered above question prompt) -->
            ${generalImagesHtml}

            <!-- Numbered Prompt -->
            <div class="flex items-center gap-3.5">
                <span class="w-8 h-8 rounded-full bg-[#15803d] text-white flex items-center justify-center text-sm font-black shrink-0 shadow-2xs">${qNum}</span>
                <h3 class="text-lg sm:text-xl font-bold text-black leading-snug font-['Inter']">${escapedPrompt}</h3>
            </div>

            <!-- Image if any -->
            ${q.image ? `
                <div class="flex flex-col items-center w-full my-3 space-y-1.5">
                    <div onclick="window.openImageFullscreen('${escapeFn(q.image)}', '${escapeFn(q.imageTitle || '').replace(/'/g, "\\'")}')"
                        class="relative group/previmg w-full max-w-[560px] h-[260px] sm:h-[300px] md:h-[320px] rounded-2xl overflow-hidden bg-black flex items-center justify-center border border-slate-200 shadow-2xs cursor-zoom-in">
                        <img src="${escapeFn(q.image)}" alt="${escapeFn(q.imageTitle || 'Question Image')}" class="max-w-full max-h-full object-contain pointer-events-none">
                        <div class="absolute top-3 right-3 opacity-0 group-hover/previmg:opacity-100 transition-opacity pointer-events-none">
                            <span class="px-2.5 py-1 rounded-xl bg-black/70 text-white text-[11px] font-semibold flex items-center gap-1.5 shadow-md">
                                <i class="fa-solid fa-expand text-[10px]"></i>
                                <span>Click to enlarge</span>
                            </span>
                        </div>
                    </div>
                    ${q.imageTitle ? `
                        <p class="text-xs font-semibold text-black-fade text-center max-w-[560px] break-words pt-1">${escapeFn(q.imageTitle)}</p>
                    ` : ''}
                </div>
            ` : ''}

            <!-- Question Answer Section -->
            <div class="pt-1">
                ${bodyHtml}
            </div>
        </div>
    `;

    // Update Sticky Footer Navigation Buttons
    const prevBtn = document.getElementById('preview-footer-prev-btn');
    const nextBtn = document.getElementById('preview-footer-next-btn');
    if (prevBtn) {
        prevBtn.disabled = idx === 0;
        prevBtn.className = idx === 0
            ? 'sigma-btn sigma-btn-primary sigma-btn-md flex items-center gap-2 invisible pointer-events-none'
            : 'sigma-btn sigma-btn-primary sigma-btn-md flex items-center gap-2 cursor-pointer';
    }
    if (nextBtn) {
        nextBtn.disabled = idx >= totalQ - 1;
        nextBtn.className = idx >= totalQ - 1
            ? 'sigma-btn sigma-btn-primary sigma-btn-md flex items-center gap-2 invisible pointer-events-none'
            : 'sigma-btn sigma-btn-primary sigma-btn-md flex items-center gap-2 cursor-pointer';
    }
};

let _previewDragScrollAnimId = null;
let _previewCurrentDragY = null;

window.handlePreviewChoiceDragStart = function (e, text) {
    e.dataTransfer.setData('text/plain', text);
    e.dataTransfer.effectAllowed = 'move';

    // 100% Solid Drag Image Preview
    const dragGhost = document.createElement('div');
    dragGhost.style.position = 'fixed';
    dragGhost.style.top = '-9999px';
    dragGhost.style.left = '-9999px';
    dragGhost.style.zIndex = '999999';
    dragGhost.style.opacity = '1';
    dragGhost.className = 'px-4 py-2.5 rounded-xl bg-white border-2 border-black text-xs md:text-sm font-bold text-black shadow-2xl flex items-center gap-2 pointer-events-none';
    dragGhost.innerHTML = `<i class="fa-solid fa-grip-vertical text-black text-xs"></i><span>${window.escapeHtml(text)}</span>`;
    document.body.appendChild(dragGhost);
    e.dataTransfer.setDragImage(dragGhost, 30, 20);
    setTimeout(() => { if (dragGhost.parentElement) dragGhost.remove(); }, 0);

    const getScrollContainers = () => {
        const list = [];
        const activeModal = document.getElementById('student-preview-modal') || document.getElementById('sigma-quiz-form-modal') || document.querySelector('.sigma-modal-overlay:not(.hidden)');
        if (activeModal) {
            list.push(activeModal);
            activeModal.querySelectorAll('.overflow-y-auto, .sigma-modal-shell, .sigma-modal-panel').forEach(el => list.push(el));
        }
        list.push(document.documentElement, document.body, window);
        return list;
    };

    const autoScrollLoop = () => {
        if (_previewCurrentDragY !== null && _previewCurrentDragY !== undefined) {
            const vh = window.innerHeight || 800;
            const topZone = 220;
            const bottomZone = vh - 220;
            const scrollContainers = getScrollContainers();

            if (_previewCurrentDragY >= 0 && _previewCurrentDragY < topZone) {
                const ratio = Math.max(0.1, (topZone - _previewCurrentDragY) / topZone);
                const speed = Math.max(8, Math.round(ratio * 35));
                scrollContainers.forEach(c => {
                    if (c) {
                        if (typeof c.scrollBy === 'function') {
                            try { c.scrollBy(0, -speed); } catch(e) { if (typeof c.scrollTop === 'number') c.scrollTop -= speed; }
                        } else if (typeof c.scrollTop === 'number') {
                            c.scrollTop -= speed;
                        }
                    }
                });
            } else if (_previewCurrentDragY > bottomZone && _previewCurrentDragY <= vh) {
                const ratio = Math.max(0.1, (_previewCurrentDragY - bottomZone) / (vh - bottomZone));
                const speed = Math.max(8, Math.round(ratio * 35));
                scrollContainers.forEach(c => {
                    if (c) {
                        if (typeof c.scrollBy === 'function') {
                            try { c.scrollBy(0, speed); } catch(e) { if (typeof c.scrollTop === 'number') c.scrollTop += speed; }
                        } else if (typeof c.scrollTop === 'number') {
                            c.scrollTop -= speed;
                        }
                    }
                });
            }
        }
        _previewDragScrollAnimId = requestAnimationFrame(autoScrollLoop);
    };

    const handleDragOver = (dragEvent) => {
        if (dragEvent) {
            dragEvent.preventDefault();
            if (dragEvent.clientY !== undefined) {
                _previewCurrentDragY = dragEvent.clientY;
            }
        }
    };

    const handleDrag = (dragEvent) => {
        if (dragEvent && dragEvent.clientY !== undefined && dragEvent.clientY > 0) {
            _previewCurrentDragY = dragEvent.clientY;
        }
    };

    const handleWheel = (wheelEvent) => {
        if (!wheelEvent) return;
        const scrollContainers = getScrollContainers();
        scrollContainers.forEach(c => {
            if (c) {
                if (typeof c.scrollBy === 'function') {
                    try { c.scrollBy(0, wheelEvent.deltaY); } catch(e) { if (typeof c.scrollTop === 'number') c.scrollTop += wheelEvent.deltaY; }
                } else if (typeof c.scrollTop === 'number') {
                    c.scrollTop += wheelEvent.deltaY;
                }
            }
        });
    };

    _previewCurrentDragY = e.clientY;
    if (_previewDragScrollAnimId) cancelAnimationFrame(_previewDragScrollAnimId);
    _previewDragScrollAnimId = requestAnimationFrame(autoScrollLoop);

    if (window._previewDragOverHandler) {
        document.removeEventListener('dragover', window._previewDragOverHandler);
    }
    if (window._previewDragHandler) {
        document.removeEventListener('drag', window._previewDragHandler);
    }
    if (window._previewWheelHandler) {
        window.removeEventListener('wheel', window._previewWheelHandler);
    }

    window._previewDragOverHandler = handleDragOver;
    window._previewDragHandler = handleDrag;
    window._previewWheelHandler = handleWheel;

    document.addEventListener('dragover', window._previewDragOverHandler, { passive: false });
    document.addEventListener('drag', window._previewDragHandler, { passive: false });
    window.addEventListener('wheel', window._previewWheelHandler, { passive: true });
};

window.handlePreviewChoiceDragEnd = function (e) {
    _previewCurrentDragY = null;
    if (_previewDragScrollAnimId) {
        cancelAnimationFrame(_previewDragScrollAnimId);
        _previewDragScrollAnimId = null;
    }
    if (window._previewDragOverHandler) {
        document.removeEventListener('dragover', window._previewDragOverHandler);
        window._previewDragOverHandler = null;
    }
    if (window._previewDragHandler) {
        document.removeEventListener('drag', window._previewDragHandler);
        window._previewDragHandler = null;
    }
    if (window._previewWheelHandler) {
        window.removeEventListener('wheel', window._previewWheelHandler);
        window._previewWheelHandler = null;
    }
};

window.handlePreviewMatchingDrop = function (e, slotEl, qIdx, slotIdx) {
    e.preventDefault();
    window.handlePreviewChoiceDragEnd(e);
    const text = e.dataTransfer.getData('text/plain');
    if (text) {
        window.setPreviewMatchingAnswer(qIdx, slotIdx, text);
        window.renderStudentPreview();
    }
};

window.clearPreviewSlot = function (slotEl, qIdx, slotIdx) {
    if (qIdx !== undefined && slotIdx !== undefined) {
        window.setPreviewMatchingAnswer(qIdx, slotIdx, null);
        window.renderStudentPreview();
    }
};

