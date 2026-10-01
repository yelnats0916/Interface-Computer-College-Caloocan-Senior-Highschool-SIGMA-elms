/**
 * SIGMA ELMS - Shared Classroom Room Module
 * Single authoritative source for the classroom hero banner and aligned header.
 * Used by both Teacher and Student portals.
 */
(function (global) {
    "use strict";

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

    const escapeHtml = (typeof window !== 'undefined' && typeof window.escapeHtml === 'function')
        ? window.escapeHtml
        : function (str) {
            if (str == null) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        };

    const STORAGE_KEY = "sigma-classroom-custom-themes-v1";

    const THEME_PRESETS = [
        { id: "emerald", name: "Forest Emerald", gradient: "linear-gradient(135deg, #064e3b 0%, #15803d 50%, #166534 100%)", color: "#15803d" },
        { id: "indigo", name: "Royal Indigo", gradient: "linear-gradient(135deg, #1e1b4b 0%, #3730a3 50%, #4338ca 100%)", color: "#4338ca" },
        { id: "amber", name: "Warm Amber", gradient: "linear-gradient(135deg, #78350f 0%, #b45309 50%, #d97706 100%)", color: "#d97706" },
        { id: "ruby", name: "Ruby Crimson", gradient: "linear-gradient(135deg, #831843 0%, #be185d 50%, #9d174d 100%)", color: "#be185d" },
        { id: "cyan", name: "Ocean Cyan", gradient: "linear-gradient(135deg, #0e7490 0%, #0284c7 50%, #0369a1 100%)", color: "#0284c7" },
        { id: "violet", name: "Violet Electric", gradient: "linear-gradient(135deg, #581c87 0%, #7c3aed 50%, #6d28d9 100%)", color: "#7c3aed" },
        { id: "coral", name: "Sunset Coral", gradient: "linear-gradient(135deg, #9a3412 0%, #ea580c 50%, #c2410c 100%)", color: "#ea580c" },
        { id: "slate", name: "Midnight Slate", gradient: "linear-gradient(135deg, #0f172a 0%, #334155 50%, #1e293b 100%)", color: "#334155" }
    ];

    const WATERMARK_PRESETS = [
        {
            id: "crest",
            label: "Academic Crest",
            icon: "fa-solid fa-shield-halved",
            svg: `<svg viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="w-full h-full"><circle cx="60" cy="60" r="54" stroke-width="1.8"/><circle cx="60" cy="60" r="48" stroke-dasharray="3 3"/><path d="M60 26 L82 36 V62 C82 76 60 88 60 88 C60 88 38 76 38 62 V36 Z" stroke-width="2.2"/><path d="M48 50 C54 48 60 50 60 50 C60 50 66 48 72 50 V64 C66 62 60 64 60 64 C60 64 54 62 48 64 Z" stroke-width="1.8"/><path d="M60 50 V64"/><path d="M22 65 C22 80 34 94 48 97" stroke-width="2.2"/><path d="M98 65 C98 80 86 94 72 97" stroke-width="2.2"/><polygon points="60,16 64,23 56,23" fill="currentColor"/></svg>`
        },
        {
            id: "network",
            label: "Digital Network",
            icon: "fa-solid fa-circle-nodes",
            svg: `<svg viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="2" class="w-full h-full"><circle cx="60" cy="60" r="10" fill="currentColor" fill-opacity="0.15"/><circle cx="25" cy="35" r="6"/><circle cx="95" cy="40" r="7"/><circle cx="30" cy="90" r="7"/><circle cx="90" cy="85" r="8"/><path d="M25 35 L60 60 L95 40 M60 60 L30 90 M60 60 L90 85 M25 35 L95 40 M30 90 L90 85" stroke-width="1.8" stroke-dasharray="4 4"/><circle cx="60" cy="18" r="4"/><path d="M60 18 L60 50"/></svg>`
        },
        {
            id: "guilloche",
            label: "Geometric Rings",
            icon: "fa-solid fa-certificate",
            svg: `<svg viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="1.6" class="w-full h-full"><circle cx="60" cy="60" r="50"/><circle cx="60" cy="60" r="40"/><circle cx="60" cy="60" r="30"/><ellipse cx="60" cy="60" rx="50" ry="25" transform="rotate(30 60 60)"/><ellipse cx="60" cy="60" rx="50" ry="25" transform="rotate(60 60 60)"/><ellipse cx="60" cy="60" rx="50" ry="25" transform="rotate(90 60 60)"/><ellipse cx="60" cy="60" rx="50" ry="25" transform="rotate(120 60 60)"/><ellipse cx="60" cy="60" rx="50" ry="25" transform="rotate(150 60 60)"/></svg>`
        },
        {
            id: "compass",
            label: "Academy Star",
            icon: "fa-solid fa-compass",
            svg: `<svg viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="2" class="w-full h-full"><circle cx="60" cy="60" r="52" stroke-width="1.5"/><circle cx="60" cy="60" r="46" stroke-dasharray="2 4"/><polygon points="60,14 66,48 98,60 66,72 60,106 54,72 22,60 54,48" stroke-width="2" fill="currentColor" fill-opacity="0.1"/><circle cx="60" cy="60" r="8" fill="currentColor"/></svg>`
        },
        {
            id: "waves",
            label: "Modern Waves",
            icon: "fa-solid fa-water",
            svg: `<svg viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" class="w-full h-full"><path d="M10 30 C35 15 65 45 110 25"/><path d="M10 48 C35 33 65 63 110 43"/><path d="M10 66 C35 51 65 81 110 61"/><path d="M10 84 C35 69 65 99 110 79"/><path d="M10 102 C35 87 65 117 110 97"/></svg>`
        },
        {
            id: "none",
            label: "None (Clean)",
            icon: "fa-solid fa-ban",
            svg: ""
        }
    ];

    function renderWatermarkContent(val) {
        if (!val || val === "none") return "";
        const found = WATERMARK_PRESETS.find(p => p.id === val);
        if (found) return found.svg || "";
        if (typeof val === "string" && val.includes("fa-")) {
            if (val.includes("fa-code") || val.includes("fa-laptop")) return WATERMARK_PRESETS[1].svg;
            if (val.includes("fa-globe") || val.includes("fa-chart")) return WATERMARK_PRESETS[0].svg;
            if (val.includes("fa-calculator") || val.includes("fa-atom")) return WATERMARK_PRESETS[2].svg;
            return WATERMARK_PRESETS[0].svg;
        }
        return WATERMARK_PRESETS[0].svg;
    }

    const ICON_PRESETS = [
        { icon: "fa-solid fa-chart-column", label: "Chart" },
        { icon: "fa-solid fa-code", label: "Code" },
        { icon: "fa-solid fa-globe", label: "Globe" },
        { icon: "fa-solid fa-calculator", label: "Calculator" },
        { icon: "fa-solid fa-laptop-code", label: "Tech" },
        { icon: "fa-solid fa-comments", label: "Speech" },
        { icon: "fa-solid fa-flask", label: "Science" },
        { icon: "fa-solid fa-palette", label: "Art" },
        { icon: "fa-solid fa-book-bookmark", label: "Book" },
        { icon: "fa-solid fa-atom", label: "Physics" }
    ];

    const ARTWORK_PRESETS = [
        "image/book1.jpg", "image/book2.jpg", "image/book3.jpg",
        "image/book4.jpg", "image/book5.jpg", "image/book6.jpg"
    ];

    const SUBJECT_CATALOG = {
        "Computer Programming 1": {
            watermark: "network",
            gradient: "linear-gradient(135deg, #1c1917 0%, #78350f 60%, #451a03 100%)",
            bannerImage: "image/book1.jpg",
            defaultTeacher: "Alex Reyes",
            defaultRoom: "Lab 1",
            defaultSchedule: "Mon / Wed / Fri • 8:00 AM - 9:30 AM"
        },
        "Web Development 1": {
            watermark: "crest",
            gradient: "linear-gradient(135deg, #78350f 0%, #b45309 50%, #d97706 100%)",
            bannerImage: "image/book2.jpg",
            defaultTeacher: "Sarah Lim",
            defaultRoom: "Lab 2",
            defaultSchedule: "Tue / Thu • 9:45 AM - 11:15 AM"
        },
        "Statistics & Probability": {
            watermark: "guilloche",
            gradient: "linear-gradient(135deg, #064e3b 0%, #15803d 50%, #166534 100%)",
            bannerImage: "image/book3.jpg",
            defaultTeacher: "Jennifer Santos",
            defaultRoom: "Room 406",
            defaultSchedule: "Mon / Wed • 3:15 PM - 4:45 PM"
        },
        "Empowerment Technologies": {
            watermark: "network",
            gradient: "linear-gradient(135deg, #1e1b4b 0%, #3730a3 50%, #4338ca 100%)",
            bannerImage: "image/book4.jpg",
            defaultTeacher: "Mark Davis",
            defaultRoom: "Lab 3",
            defaultSchedule: "Tue / Thu • 1:00 PM - 2:30 PM"
        },
        "General Mathematics": {
            watermark: "compass",
            gradient: "linear-gradient(135deg, #14532d 0%, #15803d 50%, #047857 100%)",
            bannerImage: "image/book5.jpg",
            defaultTeacher: "Jennifer Santos",
            defaultRoom: "Room 402",
            defaultSchedule: "Mon / Wed • 10:00 AM - 11:30 AM"
        },
        "Oral Communication": {
            watermark: "crest",
            gradient: "linear-gradient(135deg, #831843 0%, #be185d 50%, #db2777 100%)",
            bannerImage: "image/book6.jpg",
            defaultTeacher: "Grace Tan",
            defaultRoom: "Room 301",
            defaultSchedule: "Tue / Thu • 8:00 AM - 9:30 AM"
        },
        "Earth and Life Science": {
            watermark: "waves",
            gradient: "linear-gradient(135deg, #064e3b 0%, #0f766e 50%, #14b8a6 100%)",
            bannerImage: "image/book1.jpg",
            defaultTeacher: "Alex Reyes",
            defaultRoom: "Science Lab",
            defaultSchedule: "Mon / Fri • 1:00 PM - 2:30 PM"
        },
        "Contemporary Philippine Arts": {
            watermark: "guilloche",
            gradient: "linear-gradient(135deg, #581c87 0%, #7e22ce 50%, #9333ea 100%)",
            bannerImage: "image/book2.jpg",
            defaultTeacher: "Grace Tan",
            defaultRoom: "Art Studio",
            defaultSchedule: "Wed • 8:00 AM - 11:00 AM"
        },
        "21st Century Literature": {
            watermark: "crest",
            gradient: "linear-gradient(135deg, #0c4a6e 0%, #0284c7 50%, #38bdf8 100%)",
            bannerImage: "image/book3.jpg",
            defaultTeacher: "Sarah Lim",
            defaultRoom: "Room 205",
            defaultSchedule: "Tue / Thu • 3:15 PM - 4:45 PM"
        },
        "General Physics 1": {
            watermark: "network",
            gradient: "linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)",
            bannerImage: "image/book4.jpg",
            defaultTeacher: "Mark Davis",
            defaultRoom: "Physics Lab",
            defaultSchedule: "Mon / Wed • 9:45 AM - 11:15 AM"
        }
    };

    function getAllCustomThemes() {
        return getStoredJson(STORAGE_KEY, {});
    }

    function normalizeThemeKey(section, subject) {
        const normSubj = String(subject || '').trim().toLowerCase();
        const normSec = String(section || '').trim().toLowerCase().replace(/^grade\s*\d+\s*[-–]?\s*/i, '').replace(/^g\d+\s*[-–]?\s*/i, '').replace(/\s+/g, ' ');
        if (normSec && normSubj) {
            return `${normSec}::${normSubj}`;
        }
        return normSubj;
    }

    function getCustomTheme(subject, section) {
        if (!subject) return null;
        const all = getAllCustomThemes();
        const normSubj = String(subject || '').trim().toLowerCase();
        const stripGrade = (s) => String(s || '').trim().toLowerCase().replace(/^grade\s*\d+\s*[-–]?\s*/i, '').replace(/^g\d+\s*[-–]?\s*/i, '').replace(/\s+/g, ' ');
        const baseSec = stripGrade(section);

        // 1. If section is provided, search strictly for that section and subject
        if (section) {
            // Exact raw key check
            if (all[section + "::" + subject]) {
                return all[section + "::" + subject];
            }
            // Normalized key check
            const normKey = normalizeThemeKey(section, subject);
            if (all[normKey]) {
                return all[normKey];
            }
            // Key search matching section & subject
            for (const [k, v] of Object.entries(all)) {
                if (k.includes("::")) {
                    const [kSec, kSubj] = k.split("::");
                    const kNormSubj = String(kSubj || '').trim().toLowerCase();
                    const kBaseSec = stripGrade(kSec);
                    const subjMatch = (kNormSubj === normSubj || kNormSubj.includes(normSubj) || normSubj.includes(kNormSubj));
                    const secMatch = (kBaseSec === baseSec || (baseSec && kBaseSec.includes(baseSec)) || (kBaseSec && baseSec.includes(kBaseSec)));
                    if (subjMatch && secMatch) {
                        return v;
                    }
                }
            }
            // Strict scoping: Do not fallback to other sections or subject defaults
            return null;
        }

        // 2. If no section provided (general subject query)
        if (all[subject]) {
            return all[subject];
        }
        if (all[normSubj]) {
            return all[normSubj];
        }
        return null;
    }

    function saveCustomTheme(subject, section, data) {
        try {
            const all = getAllCustomThemes();
            const exactKey = (section ? section + "::" : "") + subject;
            const normKey = normalizeThemeKey(section, subject);

            all[exactKey] = data;
            if (normKey && normKey !== exactKey) {
                all[normKey] = data;
            }
            // If section is provided, do NOT overwrite all[subject] so other sections remain unaffected
            if (!section) {
                all[subject] = data;
            }

            localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
            window.dispatchEvent(new CustomEvent("classroom-banner-theme-changed", { detail: { subject, section, theme: data } }));
            if (window.SectionsPanel && typeof window.SectionsPanel.render === "function") {
                const portalRole = (window.location.pathname || '').toLowerCase().includes('teacher') ? 'teacher' : 'student';
                window.SectionsPanel.render(portalRole);
            }
        } catch (e) {
            console.warn("Could not save custom banner theme:", e);
        }
    }

    function resetCustomTheme(subject, section) {
        try {
            const all = getAllCustomThemes();
            const exactKey = (section ? section + "::" : "") + subject;
            const normKey = normalizeThemeKey(section, subject);

            delete all[exactKey];
            if (normKey) {
                delete all[normKey];
            }
            if (!section) {
                delete all[subject];
            }

            // Also remove any entries matching this specific section and subject
            if (section) {
                const stripGrade = (s) => String(s || '').trim().toLowerCase().replace(/^grade\s*\d+\s*[-–]?\s*/i, '').replace(/^g\d+\s*[-–]?\s*/i, '').replace(/\s+/g, ' ');
                const baseSec = stripGrade(section);
                const normSubj = String(subject || '').trim().toLowerCase();
                for (const k of Object.keys(all)) {
                    if (k.includes("::")) {
                        const [kSec, kSubj] = k.split("::");
                        if (stripGrade(kSec) === baseSec && String(kSubj || '').trim().toLowerCase() === normSubj) {
                            delete all[k];
                        }
                    }
                }
            }

            localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
            window.dispatchEvent(new CustomEvent("classroom-banner-theme-changed", { detail: { subject, section, theme: null } }));
            if (window.SectionsPanel && typeof window.SectionsPanel.render === "function") {
                const portalRole = (window.location.pathname || '').toLowerCase().includes('teacher') ? 'teacher' : 'student';
                window.SectionsPanel.render(portalRole);
            }
        } catch (e) {
            console.warn("Could not reset custom banner theme:", e);
        }
    }

    function getSubjectMeta(subjectName) {
        if (!subjectName) return null;
        if (SUBJECT_CATALOG[subjectName]) return SUBJECT_CATALOG[subjectName];
        const lower = subjectName.toLowerCase();
        for (const [key, val] of Object.entries(SUBJECT_CATALOG)) {
            if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
                return val;
            }
        }
        const bookImages = [
            "image/book1.jpg", "image/book2.jpg", "image/book3.jpg",
            "image/book4.jpg", "image/book5.jpg", "image/book6.jpg"
        ];
        let hash = 0;
        for (let i = 0; i < subjectName.length; i++) hash += subjectName.charCodeAt(i);
        return {
            icon: "fa-solid fa-book-bookmark",
            gradient: "linear-gradient(135deg, #0f172a 0%, #15803d 60%, #14532d 100%)",
            bannerImage: bookImages[hash % bookImages.length],
            defaultTeacher: "Faculty",
            defaultRoom: "Room 101",
            defaultSchedule: "Schedule Available Soon"
        };
    }

    /**
     * Flexible Schedule Text Formatter
     * Displays exact meeting days and alternating schedules (e.g. "Mon / Wed / Fri • 8:00 AM - 9:30 AM",
     * "Tue / Thu • 9:45 AM - 11:15 AM", or "Monday – Friday • 8:00 AM - 9:30 AM").
     */
    function formatScheduleText(scheduleStr) {
        if (!scheduleStr) return "Monday – Friday • 8:00 AM - 9:30 AM";
        const str = scheduleStr.trim();
        if (/(?:mon|tue|wed|thu|fri|sat|sun|daily)/i.test(str)) {
            return str;
        }
        return `Monday – Friday • ${str}`;
    }

    function formatSectionLabel(section) {
        if (!section) return '';
        const trimmed = String(section).trim();

        // Match "Grade N - SectionName" or "Grade N SectionName" (case insensitive)
        const gradeMatch = trimmed.match(/^grade\s+(\d+)\s*[-–]?\s*(.+)$/i);
        if (gradeMatch) {
            return ('GRADE ' + gradeMatch[1] + ' - ' + gradeMatch[2]).toUpperCase();
        }

        // Match short code patterns like "ICT-11A", "ICT 11A", "STEM-11A", "SEC-11C"
        const codeMatch = trimmed.match(/^([a-zA-Z]+)[-–\s]*(\d{1,2})\s*([a-zA-Z]+)?$/i);
        if (codeMatch) {
            const strand = codeMatch[1].toUpperCase();
            const grade = codeMatch[2];
            const sec = (codeMatch[3] || '').toUpperCase();
            if (strand === 'SEC') {
                return `GRADE ${grade} - SECTION ${sec}`.trim();
            }
            return `GRADE ${grade} - ${strand} ${sec}`.trim();
        }

        return trimmed.toLowerCase().replace(/\b[a-z]/g, (ch) => ch.toUpperCase());
    }

    function renderBanner(options) {
        const opt = options || {};
        const subject = opt.subject || "Subject Name";
        const meta = getSubjectMeta(subject) || {};
        const custom = getCustomTheme(subject, opt.section || opt.className) || {};

        const section = opt.section || opt.className || "ICT-11A";
        const stripGrade = (s) => String(s || '').replace(/^grade\s*\d+\s*[-–]?\s*/i, '').replace(/^g\d+\s*[-–]?\s*/i, '').trim().toLowerCase();
        const baseSec = stripGrade(section);
        const normSubj = String(subject || '').trim().toLowerCase();

        // 1. Resolve matching section from admin sections
        const adminSections = getStoredJson('sigma-admin-sections', getStoredJson('sigma-sections-list', []));
        let matchedSec = null;
        if (Array.isArray(adminSections)) {
            if (opt.id) {
                matchedSec = adminSections.find(s => s && String(s.id) === String(opt.id));
            }
            if (!matchedSec && normSubj) {
                matchedSec = adminSections.find(s => {
                    if (!s) return false;
                    const sName = String(s.name || s.sectionName || '').trim().toLowerCase();
                    const sBase = stripGrade(sName);
                    const sSubj = String(s.subject || s.assignedSubject || (Array.isArray(s.assignedSubjects) && s.assignedSubjects[0]) || '').trim().toLowerCase();
                    const secMatch = (sName === String(section).trim().toLowerCase() || sBase === baseSec);
                    const subjMatch = (sSubj === normSubj || sSubj.includes(normSubj) || normSubj.includes(sSubj));
                    return secMatch && subjMatch;
                });
            }
            if (!matchedSec) {
                matchedSec = adminSections.find(s => {
                    if (!s) return false;
                    const sName = String(s.name || s.sectionName || '').trim().toLowerCase();
                    const sBase = stripGrade(sName);
                    return (sName === String(section).trim().toLowerCase() || sBase === baseSec);
                });
            }
        }

        const room = opt.room || matchedSec?.room || meta.defaultRoom || "Lab 1";
        const formattedRoom = (/^\d+$/.test(String(room).trim())) ? `Room ${room}` : room;
        const schedule = opt.schedule || matchedSec?.schedule || meta.defaultSchedule || "Mon / Wed / Fri • 8:00 AM - 9:30 AM";
        const watermark = custom.watermark || custom.icon || opt.watermark || opt.icon || meta.watermark || meta.icon || "crest";
        const gradient = custom.gradient || opt.gradient || meta.gradient || "linear-gradient(135deg, #064e3b 0%, #15803d 50%, #166534 100%)";
        const bannerImage = custom.bannerImage || opt.bannerImage || meta.bannerImage || "image/book1.jpg";
        const displaySchedule = formatScheduleText(schedule);

        return `
        <div class="classroom-room-hero-banner relative overflow-hidden rounded-[18px] md:rounded-[24px] w-full" style="background: ${gradient};">
            <img src="${escapeHtml(bannerImage)}" alt="${escapeHtml(subject)}" class="classroom-room-banner-bg absolute inset-0 w-full h-full object-cover">
            <!-- Signature Black Fade Overlay for rich depth & contrast -->
            <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none"></div>
            <div class="classroom-banner-watermark">
                ${renderWatermarkContent(watermark)}
            </div>
            <div class="classroom-room-hero-banner__content relative z-10">
                <div class="classroom-room-hero-row">
                    <h1 class="classroom-room-hero-title font-extrabold md:font-black text-white tracking-tight leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)] font-['Inter',sans-serif]">
                        ${escapeHtml(subject)}
                    </h1>
                    <div class="classroom-room-hero-aside">
                        <button type="button" id="classroom-info-toggle-btn" onclick="window.ClassroomRoom.toggleClassInfo()" class="classroom-banner-info-btn" title="Toggle Class Schedule & Details" aria-label="Toggle Class Schedule & Details">
                            ${escapeHtml(formatSectionLabel(section))}
                        </button>
                    </div>
                </div>
            </div>

            <!-- 2nd: Shows DIRECTLY IN THE PAGE (Pure text layout, toggled by icon select/unselect) -->
            <div id="classroom-inline-info-drawer" class="classroom-inline-info-drawer hidden">
                <div class="flex items-center flex-wrap gap-4 text-xs md:text-sm font-medium text-white/95">
                    <div class="classroom-room-meta-row flex items-center flex-wrap">
                        <div class="classroom-room-meta-item flex items-center text-white/90">
                            <i class="fa-regular fa-clock w-4 text-center shrink-0 text-[13px] text-emerald-300"></i>
                            <span class="classroom-room-meta-text font-medium md:font-bold text-white tracking-normal md:tracking-wide">${escapeHtml(displaySchedule)}</span>
                        </div>
                        <div class="classroom-room-meta-item flex items-center text-white/90">
                            <i class="fa-solid fa-location-dot w-4 text-center shrink-0 text-[13px] text-emerald-300"></i>
                            <span class="classroom-room-meta-text font-medium md:font-bold text-white tracking-normal md:tracking-wide">${escapeHtml(formattedRoom)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    /**
     * Unified Classroom Room Tab Bar Renderer
     * Used by both Teacher and Student portals to guarantee exact identical markup,
     * icons, spacing, font sizes, and layout alignment.
     */
    function renderTabBar(options) {
        const opt = options || {};
        const role = opt.role || 'teacher';
        const activeTab = opt.activeTab || 'room';
        const isTeacher = (role === 'teacher');
        const tabBtnClass = isTeacher ? 'teacher-section-tab' : 'student-room-tab';

        const leftTabs = [
            { id: 'room', label: 'Room', icon: 'fa-solid fa-chalkboard' },
            { id: 'attendance', label: 'Attendance', icon: 'fa-solid fa-calendar-check' },
            { id: 'topics', label: 'Topics', icon: 'fa-solid fa-book' }
        ];
        const membersActive = (activeTab === 'members' || activeTab === 'people');
        const membersClick = isTeacher ? `switchClassDetailTab('members')` : `switchStudentRoomTab('members')`;
        const membersAttr = isTeacher ? `id="tab-btn-members"` : `data-room-tab="members"`;
        const membersBtn = `<button type="button" ${membersAttr} onclick="${membersClick}" class="classroom-quick-btn room-members-btn ${membersActive ? 'active' : ''}" title="Members" aria-label="Members"><i class="fa-solid fa-users"></i></button>`;

        function renderTabButtons(tabList) {
            return tabList.map(tab => {
                const isActive = (tab.id === activeTab) ||
                    (tab.id === 'members' && (activeTab === 'people'));
                const activeClass = isActive ? (isTeacher ? 'active' : 'student-room-tab--active active') : '';
                const clickHandler = isTeacher ? `switchClassDetailTab('${tab.id}')` : `switchStudentRoomTab('${tab.id}')`;
                const attrId = isTeacher ? `id="tab-btn-${tab.id}"` : `data-room-tab="${tab.id}"`;
                return `<button type="button" ${attrId} onclick="${clickHandler}" class="${tabBtnClass} ${activeClass}"><i class="${tab.icon}"></i><span>${tab.label}</span></button>`;
            }).join('');
        }

        const roomHtml = renderTabButtons(leftTabs.slice(0, 1));
        const attendanceHtml = renderTabButtons(leftTabs.slice(1, 2));
        const topicsHtml = renderTabButtons(leftTabs.slice(2, 3));
        const restTabsHtml = renderTabButtons(leftTabs.slice(3));
        const leftTabsHtml = `${roomHtml}${attendanceHtml}${topicsHtml}<div id="room-quarter-switch" class="room-quarter-switch" data-room-quarter-switch hidden></div>${restTabsHtml}`;

        if (isTeacher) {
            return `
            <div class="classroom-detail-tabs">
                <div class="flex items-center justify-between w-full h-full">
                    <div class="flex items-center gap-1 sm:gap-2 h-full overflow-x-auto">
                        ${leftTabsHtml}
                    </div>

                    <div class="flex items-center gap-1.5 sm:gap-2 h-full">
                        <div class="relative">
                            <button id="classroom-quick-settings-btn" class="classroom-quick-btn" title="More options" aria-label="More options" onclick="window.toggleClassroomSettingsMenu && window.toggleClassroomSettingsMenu(event)">
                                <i class="fa-solid fa-ellipsis-vertical"></i>
                            </button>
                            <div id="classroom-settings-menu" class="classroom-settings-menu hidden">
                                <!-- Members Option -->
                                <button type="button"
                                    onclick="switchClassDetailTab('members'); window.closeClassroomSettingsMenu && window.closeClassroomSettingsMenu();"
                                    class="classroom-settings-item flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors w-full text-left text-xs font-semibold text-black cursor-pointer whitespace-nowrap">
                                    <i class="fa-solid fa-users text-black text-xs w-4 text-center" style="color:#000000 !important;"></i>
                                    <span class="text-black text-xs">Members</span>
                                </button>

                                <!-- View Grades Option (Mobile Only) -->
                                <button type="button"
                                    onclick="window.openTeacherClassroomGradesModal ? window.openTeacherClassroomGradesModal() : (window.openTeacherClassroomGradebook ? window.openTeacherClassroomGradebook() : (window.switchTab && window.switchTab('nav-grades'))); window.closeClassroomSettingsMenu && window.closeClassroomSettingsMenu();"
                                    class="classroom-settings-item classroom-settings-grades-btn items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors w-full text-left text-xs font-semibold text-black cursor-pointer whitespace-nowrap">
                                    <i class="fa-solid fa-chart-simple text-black text-xs w-4 text-center" style="color:#000000 !important;"></i>
                                    <span class="text-black text-xs">View Grades</span>
                                </button>

                                <!-- Customize Banner Button -->
                                <button type="button"
                                    onclick="window.openCurrentClassroomCustomizer && window.openCurrentClassroomCustomizer(); window.closeClassroomSettingsMenu && window.closeClassroomSettingsMenu();"
                                    class="classroom-settings-item flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors w-full text-left text-xs font-semibold text-black cursor-pointer whitespace-nowrap">
                                    <i class="fa-solid fa-palette text-black text-xs w-4 text-center" style="color:#000000 !important;"></i>
                                    <span class="text-black text-xs">Customize Banner</span>
                                </button>

                                <!-- Comments Toggle Row -->
                                <div class="classroom-settings-item flex items-center justify-between gap-3 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer select-none whitespace-nowrap"
                                    onclick="window.handleClassroomCommentsRowClick && window.handleClassroomCommentsRowClick(event)">
                                    <div class="flex items-center gap-2.5">
                                        <i class="fa-regular fa-comments text-black text-xs w-4 text-center" style="color:#000000 !important;"></i>
                                        <span class="text-xs font-semibold text-black tracking-tight whitespace-nowrap">Student Comment</span>
                                    </div>
                                    <label class="sigma-toggle-switch ml-2" onclick="event.stopPropagation()">
                                        <input type="checkbox" id="classroom-comments-toggle-switch" onchange="window.toggleCurrentClassroomComments && window.toggleCurrentClassroomComments(event)" aria-label="Toggle classroom comments switch">
                                        <span class="sigma-toggle-slider"></span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
        }

        // Student Tab Bar
        return `
        <div class="classroom-detail-tabs">
            <div class="flex items-center justify-between w-full h-full">
                <div class="flex items-center gap-1 sm:gap-2 h-full overflow-x-auto">
                    ${leftTabsHtml}
                </div>

                <div class="flex items-center gap-1.5 sm:gap-2 h-full">
                    <div class="relative">
                        <button id="student-room-menu-btn" class="classroom-quick-btn" title="More options" aria-label="More options" onclick="window.toggleStudentRoomDropdown && window.toggleStudentRoomDropdown(event)">
                            <i class="fa-solid fa-ellipsis-vertical"></i>
                        </button>
                        <div id="student-room-dropdown" class="classroom-settings-menu hidden" style="min-width: 140px;">
                            <button type="button"
                                onclick="switchStudentRoomTab('members'); window.closeClassroomSettingsMenu && window.closeClassroomSettingsMenu();"
                                class="classroom-settings-item flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors w-full text-left text-xs font-semibold text-black cursor-pointer whitespace-nowrap">
                                <i class="fa-solid fa-users text-black text-xs w-4 text-center" style="color:#000000 !important;"></i>
                                <span class="text-black text-xs">Members</span>
                            </button>
                            <button type="button"
                                onclick="window.openStudentClassroomGradesModal && window.openStudentClassroomGradesModal(); window.closeClassroomSettingsMenu && window.closeClassroomSettingsMenu();"
                                class="classroom-settings-item classroom-settings-grades-btn items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors w-full text-left text-xs font-semibold text-black cursor-pointer whitespace-nowrap">
                                <i class="fa-solid fa-chart-simple text-black text-xs w-4 text-center" style="color:#000000 !important;"></i>
                                <span class="text-black text-xs">View Grades</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    }

    /**
     * Unified Section Card Banner Renderer
     * Used directly by js/sections-panel.js to guarantee identical appearance,
     * colors, artwork, watermark icons, and live customizer synchronization.
     */
    function renderCardBanner(options) {
        const opt = options || {};
        const subject = opt.subject || opt.name || "Subject Name";
        const meta = getSubjectMeta(subject) || {};
        const section = opt.section || opt.sectionName || opt.code || "ICT-11A";
        const custom = getCustomTheme(subject, section) || getCustomTheme(subject, opt.code) || getCustomTheme(subject) || {};

        const gradient = custom.gradient || opt.gradient || meta.gradient || "linear-gradient(135deg, #064e3b 0%, #15803d 50%, #166534 100%)";
        const bannerImage = custom.bannerImage || opt.bannerImage || meta.bannerImage || "image/book1.jpg";
        const watermark = custom.watermark || custom.icon || opt.watermark || opt.icon || meta.watermark || meta.icon || "crest";
        const room = opt.room || meta.defaultRoom || "";
        const isTeacher = opt.role === "teacher";
        const clickAction = opt.clickHandler || (isTeacher
            ? `window.showStudentList && window.showStudentList('${escapeHtml(section)}', '${escapeHtml(subject)}', 'room')`
            : (opt.id ? `window.showClassroomDetail && window.showClassroomDetail('${escapeHtml(opt.id)}')` : ""));

        return `
        <div class="classroom-card-banner relative overflow-hidden w-full select-none" style="background: ${gradient}; min-height: 124px;">
            <img src="${escapeHtml(bannerImage)}" alt="${escapeHtml(subject)}" class="classroom-room-banner-bg absolute inset-0 w-full h-full object-cover pointer-events-none" style="opacity: 0.32; mix-blend-mode: overlay;">
            <!-- Signature Black Fade Overlay for rich depth & contrast -->
            <div class="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent pointer-events-none"></div>
            <!-- Watermark (Directly synchronized with Room Hero Banner) -->
            <div class="classroom-card-banner-watermark">
                ${renderWatermarkContent(watermark)}
            </div>
            <div class="relative z-10 p-3 sm:p-3.5 pb-6 sm:pb-7 flex flex-col justify-between h-full min-h-[124px]">
                <div class="flex items-center justify-between gap-1 w-full">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-white/20 backdrop-blur-md text-white border border-white/25 shadow-sm">
                        ${escapeHtml(formatSectionLabel(section))}
                    </span>
                    ${room ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/15 text-white/95 backdrop-blur-md border border-white/10"><i class="fa-solid fa-location-dot text-[8px]"></i> ${escapeHtml(room)}</span>` : ""}
                </div>
                <div class="flex-1 flex items-center justify-center text-center w-full px-2 -mt-2 pb-1">
                    <h3 class="classroom-card-subject-name text-[16px] sm:text-[17px] font-extrabold text-white tracking-tight text-center leading-snug drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] font-['Inter',sans-serif] line-clamp-2 cursor-pointer"
                        style="font-weight: 800; cursor: pointer;"
                        ${clickAction ? `onclick="event.stopPropagation(); ${clickAction};" role="button" tabindex="0"` : ''}>
                        ${escapeHtml(subject)}
                    </h3>
                </div>
            </div>
        </div>
        `;
    }

    /**
     * 2nd: Inline Direct-in-Page Class Info Drawer Toggle (Zero Dialog Panel!)
     */
    function toggleClassInfo() {
        const drawer = document.getElementById("classroom-inline-info-drawer");
        const btn = document.getElementById("classroom-info-toggle-btn");
        if (drawer) {
            const isHidden = drawer.classList.contains("hidden");
            if (isHidden) {
                drawer.classList.remove("hidden");
                if (btn) btn.classList.add("classroom-banner-info-btn--active");
            } else {
                drawer.classList.add("hidden");
                if (btn) btn.classList.remove("classroom-banner-info-btn--active");
            }
        }
    }

    let activeCustomizerSubject = "";
    let activeCustomizerSection = "";
    let originalCustomTheme = null;
    let pendingCustomTheme = null;

    function hasCustomizerChanges() {
        if (!originalCustomTheme || !pendingCustomTheme) return false;
        return (
            originalCustomTheme.gradient !== pendingCustomTheme.gradient ||
            originalCustomTheme.watermark !== pendingCustomTheme.watermark ||
            originalCustomTheme.bannerImage !== pendingCustomTheme.bannerImage
        );
    }

    function openCustomizer(subject, section, role) {
        if (role && role !== "teacher") return;
        const subj = subject || (window.currentClassroomMeta ? window.currentClassroomMeta.subject : '') || (window.currentClassroomKey ? window.currentClassroomKey.split('::')[1] : '') || '';
        const sec = section || window.currentClassroomSectionName || (window.currentClassroomKey ? window.currentClassroomKey.split('::')[0] : '') || '';
        activeCustomizerSubject = subj;
        activeCustomizerSection = sec;
        const currentCustom = getCustomTheme(subj, sec) || {};
        const meta = getSubjectMeta(subj) || {};

        originalCustomTheme = {
            gradient: currentCustom.gradient || meta.gradient,
            watermark: currentCustom.watermark || currentCustom.icon || meta.watermark || meta.icon || "crest",
            bannerImage: currentCustom.bannerImage || meta.bannerImage
        };

        pendingCustomTheme = {
            gradient: originalCustomTheme.gradient,
            watermark: originalCustomTheme.watermark,
            bannerImage: originalCustomTheme.bannerImage
        };

        let modal = document.getElementById("classroom-theme-customizer-modal");
        if (!modal) {
            modal = document.createElement("div");
            modal.id = "classroom-theme-customizer-modal";
            modal.className = "fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm";
            modal.onclick = (e) => {
                if (e.target === modal) closeCustomizer();
            };
            document.body.appendChild(modal);
        }

        renderCustomizerModalContent(modal, subject, section);
        modal.classList.remove("hidden");
        document.body.style.overflow = "hidden";
    }

    function closeCustomizer() {
        const modal = document.getElementById("classroom-theme-customizer-modal");
        if (modal) modal.classList.add("hidden");
        document.body.style.overflow = "";
        refreshCurrentPageBanner();
    }

    function renderCustomizerModalContent(modal, subject, section) {
        const canSave = hasCustomizerChanges();
        modal.innerHTML = `
        <div class="bg-white rounded-[24px] shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200" style="font-family: 'Inter', sans-serif;">
            <div class="px-6 py-4.5 sm:py-5 border-b border-slate-100 flex items-center">
                <div>
                    <h3 class="text-lg sm:text-xl font-bold text-black tracking-tight flex items-center gap-2.5">
                        <i class="fa-solid fa-palette text-emerald-600 text-lg sm:text-xl"></i> Customize Theme
                    </h3>
                </div>
            </div>

            <div class="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                <div>
                    <div id="modal-banner-preview" class="classroom-room-hero-banner classroom-modal-preview-banner relative overflow-hidden rounded-[20px] w-full select-none" style="background: ${pendingCustomTheme.gradient}; min-height: 145px; height: 145px;">
                        <img src="${escapeHtml(pendingCustomTheme.bannerImage)}" alt="${escapeHtml(subject)}" class="classroom-room-banner-bg absolute inset-0 w-full h-full object-cover">
                        <!-- Signature Black Fade Overlay for rich depth & contrast -->
                        <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none"></div>
                        <div class="classroom-modal-preview-watermark">
                            ${renderWatermarkContent(pendingCustomTheme.watermark)}
                        </div>
                        <div class="relative z-10 p-4 sm:p-5 flex flex-col justify-between h-full">
                            <div class="flex items-center justify-between gap-2">
                                <span class="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-white/20 backdrop-blur-md text-white border border-white/25 shadow-sm">
                                    ${escapeHtml(section || "Section")}
                                </span>
                            </div>
                            <div class="my-auto py-1">
                                <h4 class="font-black text-white tracking-tight leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.45)] font-['Inter',sans-serif] text-xl sm:text-2xl line-clamp-1">
                                    ${escapeHtml(subject)}
                                </h4>
                            </div>
                            <div class="h-0.5"></div>
                        </div>
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold text-black mb-2">Select Color Theme</label>
                    <div class="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
                        ${THEME_PRESETS.map(t => `
                            <button type="button" onclick="window.ClassroomRoom.selectThemeColor('${t.id}')" class="flex flex-col items-center gap-1 p-1 rounded-xl transition-all group ${pendingCustomTheme.gradient === t.gradient ? 'classroom-customizer-theme-btn--selected' : 'hover:scale-105'}">
                                <div class="w-10 h-10 rounded-full shadow-sm border border-black/10" style="background: ${t.gradient};"></div>
                                <span class="text-[10px] font-medium text-black-fade truncate w-full text-center group-hover:text-black">${t.name.split(' ')[1] || t.name}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold text-black mb-2">Select Watermark</label>
                    <div class="flex flex-wrap gap-2">
                        ${WATERMARK_PRESETS.map(wm => `
                            <button type="button" onclick="window.ClassroomRoom.selectThemeWatermark('${wm.id}')" class="px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${pendingCustomTheme.watermark === wm.id ? 'classroom-customizer-watermark-btn--selected' : 'bg-slate-50/70 border-slate-200 text-black-fade hover:text-black hover:bg-slate-100'}">
                                <i class="${wm.icon}"></i> ${wm.label}
                            </button>
                        `).join('')}
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold text-black mb-2">Select Cover Artwork</label>
                    <div class="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        ${ARTWORK_PRESETS.map((img, idx) => `
                            <button type="button" onclick="window.ClassroomRoom.selectThemeArtwork('${img}')" class="relative rounded-xl overflow-hidden h-16 border-2 transition-all ${pendingCustomTheme.bannerImage === img ? 'classroom-customizer-artwork-btn--selected' : 'border-slate-200 opacity-70 hover:opacity-100'}">
                                <img src="${img}" class="w-full h-full object-cover">
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>

            <div class="px-6 py-4 bg-slate-50/60 border-t border-slate-100 flex items-center justify-end gap-3">
                <button type="button" onclick="window.ClassroomRoom.closeCustomizer()" class="sigma-btn sigma-btn-ghost sigma-btn-md text-black-fade hover:text-black cursor-pointer">
                    Cancel
                </button>
                <button type="button" id="classroom-customizer-save-btn" onclick="window.ClassroomRoom.saveCurrentCustomizer()" ${canSave ? "" : "disabled"} class="sigma-btn sigma-btn-primary sigma-btn-md min-w-[130px] ${canSave ? 'cursor-pointer' : 'cursor-not-allowed opacity-55'}">
                    Save Banner
                </button>
            </div>
        </div>
        `;
    }

    function selectThemeColor(themeId) {
        const found = THEME_PRESETS.find(t => t.id === themeId);
        if (!found || !pendingCustomTheme) return;
        pendingCustomTheme.gradient = found.gradient;
        updateModalPreview();
    }

    function selectThemeWatermark(watermarkId) {
        if (!pendingCustomTheme) return;
        pendingCustomTheme.watermark = watermarkId;
        updateModalPreview();
    }

    function selectThemeIcon(iconClass) {
        selectThemeWatermark(iconClass);
    }

    function selectThemeArtwork(imgSrc) {
        if (!pendingCustomTheme) return;
        pendingCustomTheme.bannerImage = imgSrc;
        updateModalPreview();
    }

    function updateModalPreview() {
        const modal = document.getElementById("classroom-theme-customizer-modal");
        if (!modal) return;
        renderCustomizerModalContent(modal, activeCustomizerSubject, activeCustomizerSection);

        // Also synchronize background room banner live on the page
        const bannerWrapper = document.getElementById("teacher-classroom-banner-wrapper");
        if (bannerWrapper && activeCustomizerSubject && pendingCustomTheme) {
            bannerWrapper.innerHTML = renderBanner({
                subject: activeCustomizerSubject,
                section: activeCustomizerSection,
                gradient: pendingCustomTheme.gradient,
                watermark: pendingCustomTheme.watermark,
                bannerImage: pendingCustomTheme.bannerImage,
                role: "teacher"
            });
        }
    }

    function saveCurrentCustomizer() {
        if (!activeCustomizerSubject || !pendingCustomTheme || !hasCustomizerChanges()) return;
        saveCustomTheme(activeCustomizerSubject, activeCustomizerSection, pendingCustomTheme);
        closeCustomizer();
        refreshCurrentPageBanner();
    }

    function resetCurrentCustomizer() {
        if (!activeCustomizerSubject) return;
        resetCustomTheme(activeCustomizerSubject, activeCustomizerSection);
        closeCustomizer();
        refreshCurrentPageBanner();
    }

    function refreshCurrentPageBanner() {
        const bannerWrapper = document.getElementById("teacher-classroom-banner-wrapper");
        const subj = activeCustomizerSubject || (window.currentClassroomMeta ? window.currentClassroomMeta.subject : '') || (window.currentClassroomKey ? window.currentClassroomKey.split('::')[1] : '');
        const sec = activeCustomizerSection || window.currentClassroomSectionName || (window.currentClassroomKey ? window.currentClassroomKey.split('::')[0] : '');

        if (bannerWrapper && subj) {
            bannerWrapper.innerHTML = renderBanner({
                subject: subj,
                section: sec,
                role: "teacher"
            });
        }
    }

    // Auto-listen for storage updates so open tabs update in real time
    if (typeof window !== "undefined") {
        window.addEventListener("storage", function (e) {
            if (e.key === STORAGE_KEY) {
                refreshCurrentPageBanner();
            }
        });
        window.addEventListener("classroom-banner-theme-changed", function () {
            refreshCurrentPageBanner();
        });
    }

    // =========================================================================
    // SECTIONS PANEL (Unified Shared Module for Student & Teacher)
    // =========================================================================
    const defaultSectionCards = [];

    function getStorageKey(role) {
        // Shared key — teacher and student always see the same panel order
        return 'sigma-classroom-order';
    }

    let activeSectionsRole = 'student';

    function resolveTeacherAvatar(teacherName) {
        if (!teacherName || typeof teacherName !== 'string') return null;
        const cleanName = teacherName.trim().toLowerCase();

        const userKeys = ['sigma-teacher-users', 'sigma-users-list', 'sigma-admin-users', 'sigma-users', 'sigma-student-users'];

        if (typeof window !== 'undefined' && typeof window.resolveUserAvatar === 'function') {
            for (let i = 0; i < userKeys.length; i++) {
                try {
                    const list = getStoredJson(userKeys[i], []);
                    if (Array.isArray(list)) {
                        const matched = list.find(u => {
                            const full = String(u.fullName || `${u.firstName || ''} ${u.lastName || ''}`).trim().toLowerCase();
                            const n = String(u.name || '').trim().toLowerCase();
                            return full === cleanName || n === cleanName || (u.lastName && cleanName.includes(u.lastName.toLowerCase()));
                        });
                        if (matched) {
                            const av = window.resolveUserAvatar(matched);
                            if (av) return av;
                        }
                    }
                } catch (e) {}
            }
        }

        for (let i = 0; i < userKeys.length; i++) {
            try {
                const list = getStoredJson(userKeys[i], []);
                if (Array.isArray(list)) {
                    const matched = list.find(u => {
                        const full = String(u.fullName || `${u.firstName || ''} ${u.lastName || ''}`).trim().toLowerCase();
                        const n = String(u.name || '').trim().toLowerCase();
                        return full === cleanName || n === cleanName || (u.lastName && cleanName.includes(u.lastName.toLowerCase()));
                    });
                    if (matched) {
                        const direct = matched.avatar || matched.profilePicture || matched.photo || matched.profileImage;
                        if (direct && typeof direct === 'string' && direct.trim()) return direct.trim();
                        const id = String(matched.uid || matched.id || '').replace(/^#/, '').trim();
                        if (id) {
                            if (typeof window !== 'undefined' && typeof window.getCurrentUserAvatar === 'function') {
                                const shared = window.getCurrentUserAvatar(id);
                                if (shared) return shared;
                            }
                            const stored = localStorage.getItem(`sigma_avatar_${id}`);
                            if (stored) return stored;
                        }
                    }
                }
            } catch (e) {}
        }

        const teacherBase64 = localStorage.getItem('sigma_teacher_avatar_base64');
        if (teacherBase64) return teacherBase64;

        return null;
    }

    function detectPortalRole() {
        if (typeof window === 'undefined') return 'student';
        const path = (window.location.pathname || '').toLowerCase();
        if (path.includes('teacher') || document.getElementById('teacher-main') || document.getElementById('teacher-sidebar') || document.getElementById('section-classes') || document.body.classList.contains('teacher-portal') || document.querySelector('[data-portal="teacher"]')) {
            return 'teacher';
        }
        return 'student';
    }

    function renderCardHtml(card, role) {
        const effectiveRole = role || activeSectionsRole || detectPortalRole();
        const clickHandler = effectiveRole === 'teacher'
            ? `window.showStudentList && window.showStudentList('${escapeHtml(card.sectionName)}', '${escapeHtml(card.name)}', 'room')`
            : `window.showClassroomDetail && window.showClassroomDetail('${escapeHtml(card.id)}')`;

        const displaySection = card.sectionName || card.section || card.code || 'ICT-11A';
        const subjectName = card.subject || card.name;

        const bannerHtml = renderCardBanner({
            id: card.id,
            subject: subjectName,
            section: displaySection,
            room: card.room,
            role: effectiveRole,
            clickHandler: clickHandler
        });

                // 1. Identity row (avatar + name / icon + count)
        let identityHtml = "";
        if (effectiveRole === "student") {
            const teacherAvatarSrc = resolveTeacherAvatar(card.teacher);
            const avatarImgHtml = teacherAvatarSrc
                ? `<img src="${escapeHtml(teacherAvatarSrc)}" alt="${escapeHtml(card.teacher)}" class="w-full h-full object-cover">`
                : `<i class="fa-solid fa-user text-slate-400 text-sm"></i>`;

            identityHtml = `
                <div class="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                    <div class="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex-shrink-0 overflow-hidden flex items-center justify-center shadow-xs">
                        ${avatarImgHtml}
                    </div>
                    <span class="classroom-card-teacher text-[13.5px] font-semibold text-slate-700 tracking-tight truncate">${escapeHtml(card.teacher || "Instructor")}</span>
                </div>
            `;
        } else {
            const studentCount = card.studentsCount != null ? card.studentsCount : (Array.isArray(card.students) ? card.students.length : 42);
            identityHtml = `
                <div class="flex items-center gap-2 min-w-0 flex-1 pr-2">
                    <div class="w-8 h-8 rounded-full bg-slate-50 border border-slate-200/80 flex-shrink-0 flex items-center justify-center text-black">
                        <i class="fa-solid fa-users text-[13px] text-black"></i>
                    </div>
                    <span class="text-[13.5px] font-semibold text-slate-700 tracking-tight truncate">${escapeHtml(String(studentCount))} Students</span>
                </div>
            `;
        }

        const topicActionHtml = `
            <button type="button" 
                    data-no-drag="true" onmousedown="event.stopPropagation()" ontouchstart="event.stopPropagation()" onclick="event.stopPropagation(); window.openClassroomTopics && window.openClassroomTopics('${escapeHtml(card.id)}', '${escapeHtml(card.sectionName || card.section || '')}', '${escapeHtml(subjectName)}')"
                    class="classroom-card-topic-btn inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 hover:text-black border border-slate-200 hover:border-slate-300 font-semibold text-xs shadow-xs hover:ring-2 hover:ring-slate-200 transition-all cursor-pointer select-none"
                    style="min-height: 34px; touch-action: manipulation;"
                    title="Open Topics for ${escapeHtml(subjectName)}">
                <i class="fa-solid fa-book text-xs text-slate-900"></i>
                <span class="tracking-wide text-slate-900">Topics</span>
            </button>
        `;

        return `
            <div class="classroom-card bg-white border border-gray-100 rounded-[24px] overflow-hidden standard-panel-shadow transition-all group flex flex-col h-full relative"
                 data-id="${escapeHtml(card.id)}">
                ${bannerHtml}

                <div class="card-body-main px-4 py-3.5 flex items-center justify-between gap-3 bg-white flex-1 border-t border-slate-100" style="font-family:'Inter',sans-serif; min-height: 66px; box-sizing: border-box;">
                    ${identityHtml}
                    <div class="flex-shrink-0">
                        ${topicActionHtml}
                    </div>
                </div>
            </div>
        `;
    }

    function computeClassStatusFromSchedule(cardOrSec) {
        const explicit = cardOrSec.statusText || cardOrSec.classesType || cardOrSec.classType || cardOrSec.classStatus;
        if (explicit && typeof explicit === 'string' && explicit.trim()) {
            return explicit.trim();
        }

        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const fullDayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const now = new Date();
        const todayIndex = now.getDay();
        const tomorrowIndex = (todayIndex + 1) % 7;
        const todayAbbr = dayNames[todayIndex].toLowerCase();
        const todayFull = fullDayNames[todayIndex].toLowerCase();
        const tomorrowAbbr = dayNames[tomorrowIndex].toLowerCase();
        const tomorrowFull = fullDayNames[tomorrowIndex].toLowerCase();

        let activeDays = [];
        if (Array.isArray(cardOrSec.dailySchedules)) {
            activeDays = cardOrSec.dailySchedules
                .filter(d => d && d.active !== false && d.active !== 0)
                .map(d => String(d.day || d.fullDay || '').toLowerCase());
        } else if (Array.isArray(cardOrSec.days)) {
            activeDays = cardOrSec.days.map(d => String(d).toLowerCase());
        } else if (typeof cardOrSec.schedule === 'string') {
            const sched = cardOrSec.schedule.toLowerCase();
            for (let i = 0; i < 7; i++) {
                const a = dayNames[i].toLowerCase();
                const f = fullDayNames[i].toLowerCase();
                if (sched.includes(a) || sched.includes(f)) {
                    activeDays.push(a);
                }
            }
            if (sched.includes('daily') || sched.includes('mon - fri') || sched.includes('monday – friday') || sched.includes('monday - friday')) {
                activeDays = ['mon', 'tue', 'wed', 'thu', 'fri'];
            }
        }

        if (activeDays.length > 0) {
            const hasToday = activeDays.some(d => d.includes(todayAbbr) || d.includes(todayFull));
            if (hasToday) return 'Class Today';
            const hasTomorrow = activeDays.some(d => d.includes(tomorrowAbbr) || d.includes(tomorrowFull));
            if (hasTomorrow) return 'Class Tomorrow';
            return 'No Class Today';
        }

        return cardOrSec.statusText || 'Class Today';
    }

    function getConnectedSectionCards() {
        let cards = defaultSectionCards.map(c => ({ ...c }));

        // 1. Merge saved card overrides from 'sigma-classroom-cards-data'
        try {
            const savedCards = getStoredJson('sigma-classroom-cards-data', []);
            if (Array.isArray(savedCards) && savedCards.length > 0) {
                savedCards.forEach(sc => {
                    if (sc.subject && sc.subject.toLowerCase().startsWith('blank section')) return;
                    const idx = cards.findIndex(c => c.id === sc.id || (sc.subject && c.subject.toLowerCase() === sc.subject.toLowerCase()));
                    if (idx !== -1) {
                        cards[idx] = { ...cards[idx], ...sc };
                    } else if (sc.id && (sc.subject || sc.name)) {
                        cards.push(sc);
                    }
                });
            }
        } catch (e) {}

        // 2. Merge saved section records from 'sigma-admin-sections', 'sigma-sections-list', etc.
        try {
            const getSafeList = (val) => {
                if (!val) return [];
                if (Array.isArray(val)) return val;
                if (typeof val === 'string') {
                    try {
                        const parsed = JSON.parse(val);
                        if (Array.isArray(parsed)) return parsed;
                        if (parsed && typeof parsed === 'object') return [parsed];
                    } catch (e) {}
                    return val.split(',').map(s => s.trim()).filter(Boolean);
                }
                if (typeof val === 'object') return [val];
                return [];
            };

            const combinedAdminSections = [];
            const seenAdminSecKeys = new Set();
            ['sigma-admin-sections', 'sigma-sections-list', 'sigma-admin-sections-v1', 'sigma-sections'].forEach(key => {
                const list = getStoredJson(key, []);
                if (Array.isArray(list)) {
                    list.forEach(sec => {
                        if (!sec) return;
                        const sId = String(sec.id || '');
                        const sName = String(sec.name || sec.sectionName || '').trim().toLowerCase();
                        const sSubj = String(sec.subject || sec.assignedSubject || (Array.isArray(sec.assignedSubjects) && sec.assignedSubjects[0]) || '').trim().toLowerCase();
                        const k = `${sId}::${sName}::${sSubj}`;
                        if (!seenAdminSecKeys.has(k)) {
                            seenAdminSecKeys.add(k);
                            combinedAdminSections.push(sec);
                        }
                    });
                }
            });

            if (combinedAdminSections.length > 0) {
                combinedAdminSections.forEach(sec => {
                    if (!sec || sec.status === 'Archived') return;
                    const secName = String(sec.name || sec.sectionName || '').trim();
                    const subjs = (Array.isArray(sec.assignedSubjects) && sec.assignedSubjects.length > 0)
                        ? sec.assignedSubjects
                        : (Array.isArray(sec.subjects) && sec.subjects.length > 0)
                            ? sec.subjects
                            : [sec.subject || sec.assignedSubject || sec.subjectName || sec.name];

                    const parsedTeachers = getSafeList(sec.teachers);
                    const parsedStudents = getSafeList(sec.students);

                    subjs.forEach(subjItem => {
                        const secSubj = String(typeof subjItem === 'string' ? subjItem : (subjItem?.name || subjItem?.subject || sec.subject || sec.name || '')).trim();
                        if (!secName && !secSubj) return;

                        const secNameLower = secName.toLowerCase();
                        const secSubjLower = secSubj.toLowerCase();

                        // Match existing card by ID or BOTH (section name AND subject)
                        const matched = cards.find(c => {
                            if (sec.id && c.id === sec.id) return true;
                            const cSubj = String(c.subject || c.name || '').trim().toLowerCase();
                            const cSec = String(c.section || c.sectionName || '').trim().toLowerCase();
                            return (secSubjLower && cSubj === secSubjLower && secNameLower && cSec === secNameLower);
                        });

                        if (matched) {
                            if (sec.room) matched.room = sec.room;
                            if (sec.teacher) matched.teacher = sec.teacher;
                            if (sec.schedule) matched.schedule = sec.schedule;
                            if (sec.name) {
                                matched.section = sec.name;
                                matched.sectionName = sec.name;
                            }
                            if (sec.grade || sec.gradeLevel) matched.grade = sec.grade || sec.gradeLevel;
                            if (sec.schoolYear) matched.schoolYear = sec.schoolYear;
                            if (sec.studentsCount != null) matched.studentsCount = sec.studentsCount;
                            else if (Array.isArray(sec.students)) matched.studentsCount = sec.students.length;
                            matched.teachers = sec.teachers || [];
                            matched.students = sec.students || [];
                            matched.rawSection = sec;

                            // Classes type / status
                            const status = computeClassStatusFromSchedule(sec);
                            if (status) matched.statusText = status;
                        } else if (secSubj || secName) {
                            const displaySubj = secSubj || secName;
                            const newCardId = sec.id ? `${sec.id}-${displaySubj.replace(/\s+/g, '_')}` : `card-${Math.random().toString(36).substr(2, 7)}`;
                            const meta = getSubjectMeta(displaySubj) || {};
                            cards.push({
                                id: newCardId,
                                subject: displaySubj,
                                name: displaySubj,
                                section: secName || 'Section A',
                                sectionName: secName || 'Section A',
                                code: sec.code || secName,
                                grade: sec.grade || sec.gradeLevel || 'Grade 11',
                                room: sec.room || meta.defaultRoom || 'Room 101',
                                teacher: sec.teacher || (Array.isArray(sec.teachers) && sec.teachers[0] ? (sec.teachers[0].name || sec.teachers[0]) : (meta.defaultTeacher || 'Faculty')),
                                teachers: sec.teachers || [],
                                students: sec.students || [],
                                rawSection: sec,
                                schedule: sec.schedule || (sec.startTime && sec.endTime ? `${sec.daysFormatted || ''} ${sec.startTime} - ${sec.endTime}` : (meta.defaultSchedule || 'Mon / Wed / Fri • 8:00 AM - 9:30 AM')),
                                days: sec.days || [],
                                daysFormatted: sec.daysFormatted || '',
                                dailySchedules: sec.dailySchedules || [],
                                startTime: sec.startTime || '',
                                endTime: sec.endTime || '',
                                schoolYear: sec.schoolYear || '2026-2027',
                                type: sec.type || 'core',
                                studentsCount: sec.studentsCount != null ? sec.studentsCount : (Array.isArray(sec.students) ? sec.students.length : 38),
                                statusText: computeClassStatusFromSchedule(sec),
                                gradient: meta.gradient || 'linear-gradient(135deg, #064e3b 0%, #15803d 50%, #166534 100%)',
                                bannerImage: meta.bannerImage || 'image/book1.jpg',
                                icon: meta.icon || 'fa-solid fa-book-bookmark'
                            });
                        }
                    });
                });
            }
        } catch (e) {}

        // Ensure every card has a finalized statusText
        cards.forEach(card => {
            if (!card.statusText) {
                card.statusText = computeClassStatusFromSchedule(card);
            }
        });

        return cards;
    }

    function renderClassroomsEmptyStateHtml(role, isSearch = false, searchQuery = '') {
        const isTeacher = role === 'teacher';
        const icon = isSearch ? 'fa-solid fa-magnifying-glass' : (isTeacher ? 'fa-solid fa-chalkboard-user' : 'fa-solid fa-graduation-cap');
        const title = isSearch 
            ? 'No Sections Found' 
            : (isTeacher ? 'No Teaching Sections Assigned' : 'No Enrolled Classes Yet');
        const desc = isSearch
            ? `We couldn't find any section matching "${escapeHtml(searchQuery)}". Check your spelling or try searching for another subject or grade.`
            : (isTeacher 
                ? 'You have not been assigned to any sections or subject loads for SY 2026–2027 yet. Please contact your school administrator to configure your assignments.'
                : 'You have not been enrolled in any sections or classes for SY 2026–2027 yet. Please contact your registrar or administrator to finalize your schedule.');

        return `
            <div id="classrooms-empty-state" class="sigma-empty-state col-span-full w-full min-h-[480px] bg-white border border-slate-200/90 rounded-[24px] standard-panel-shadow p-10 sm:p-16 my-1 select-none">
                <i class="${icon} sigma-empty-icon" aria-hidden="true"></i>
                <h3 class="sigma-empty-title">${title}</h3>
                <p class="sigma-empty-subtitle">${desc}</p>
                <div class="inline-flex items-center gap-2 px-3.5 py-1.5 mt-4 bg-slate-50 rounded-full border border-slate-200/80 text-[11.5px] font-semibold text-slate-600">
                    <i class="fa-solid fa-circle-info text-[#15803d]"></i>
                    <span>${isSearch ? 'Press backspace to clear filter' : 'Managed by School Administration'}</span>
                </div>
            </div>
        `;
    }

    function renderSectionsGrid(role) {
        const effectiveRole = role || detectPortalRole();
        activeSectionsRole = effectiveRole;
        const grid = document.getElementById('classrooms-grid');
        if (!grid) return;

        const storageKey = getStorageKey(effectiveRole);
        let cards = getConnectedSectionCards();

        const getSafeRoleList = (val) => {
            if (!val) return [];
            if (Array.isArray(val)) return val;
            if (typeof val === 'string') {
                try {
                    const parsed = JSON.parse(val);
                    if (Array.isArray(parsed)) return parsed;
                    if (parsed && typeof parsed === 'object') return [parsed];
                } catch (e) {}
                return val.split(',').map(s => s.trim()).filter(Boolean);
            }
            if (typeof val === 'object') return [val];
            return [];
        };

        // Strict role-account connection: filter sections to only those assigned/enrolled for the logged-in user
        if (effectiveRole === 'teacher') {
            let authTeacher = null;
            try {
                authTeacher = JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}');
            } catch (e) {}
            if (!authTeacher || !authTeacher.id) {
                if (typeof window.getLoggedInTeacherUser === 'function') {
                    authTeacher = window.getLoggedInTeacherUser();
                }
            }
            if (authTeacher && (authTeacher.id || authTeacher.name || authTeacher.fullName || authTeacher.firstName)) {
                cards = cards.filter(card => {
                    const raw = card.rawSection || {};
                    const secToCheck = {
                        ...raw,
                        id: card.id || raw.id,
                        name: card.sectionName || card.section || raw.name,
                        sectionName: card.sectionName || card.section || raw.name,
                        subject: card.subject || card.name || raw.subject,
                        assignedSubjects: card.assignedSubjects || raw.assignedSubjects,
                        teacher: card.teacher || raw.teacher,
                        teachers: getSafeRoleList(card.teachers).concat(getSafeRoleList(raw.teachers))
                    };
                    if (typeof window.isSectionAssignedToTeacher === 'function') {
                        return window.isSectionAssignedToTeacher(secToCheck, authTeacher);
                    }
                    const tId = String(authTeacher.id || authTeacher.uid || '').replace(/^#/, '').trim().toLowerCase();
                    const tName = String(authTeacher.fullName || authTeacher.name || `${authTeacher.firstName || ''} ${authTeacher.lastName || ''}`).trim().toLowerCase();
                    const tLast = String(authTeacher.lastName || '').trim().toLowerCase();
                    const tFirst = String(authTeacher.firstName || '').trim().toLowerCase();

                    const combinedTeachers = getSafeRoleList(card.teachers).concat(getSafeRoleList(raw.teachers));
                    if (combinedTeachers.length > 0) {
                        return combinedTeachers.some(t => {
                            const u = String(t.uid || t.id || '').replace(/^#/, '').trim().toLowerCase();
                            const n = String(t.name || t.fullName || '').trim().toLowerCase();
                            if (tId && u && tId === u) return true;
                            if (tName && n && (tName === n || (tLast && n.includes(tLast) && n.includes(tFirst)))) return true;
                            return false;
                        });
                    }
                    if (card.teacher || raw.teacher) {
                        const ct = String(card.teacher || raw.teacher).trim().toLowerCase();
                        if (tName && (ct === tName || (tLast && ct.includes(tLast)))) return true;
                    }
                    return false;
                });
            }
        } else if (effectiveRole === 'student') {
            let authStudent = null;
            try {
                authStudent = JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}');
            } catch (e) {}
            if (!authStudent || !authStudent.id) {
                if (typeof window.getLoggedInStudentUser === 'function') {
                    authStudent = window.getLoggedInStudentUser();
                }
            }
            if (authStudent && (authStudent.id || authStudent.name || authStudent.fullName || authStudent.lrn || authStudent.firstName)) {
                cards = cards.filter(card => {
                    const raw = card.rawSection || {};
                    const secToCheck = {
                        ...raw,
                        id: card.id || raw.id,
                        name: card.sectionName || card.section || raw.name,
                        sectionName: card.sectionName || card.section || raw.name,
                        students: getSafeRoleList(card.students).concat(getSafeRoleList(raw.students))
                    };
                    if (typeof window.isSectionAssignedToStudent === 'function') {
                        return window.isSectionAssignedToStudent(secToCheck, authStudent);
                    }
                    const sId = String(authStudent.id || authStudent.uid || '').replace(/^#/, '').trim().toLowerCase();
                    const sLrn = String(authStudent.lrn || '').trim();
                    const sName = String(authStudent.fullName || authStudent.name || `${authStudent.firstName || ''} ${authStudent.lastName || ''}`).trim().toLowerCase();
                    const sLast = String(authStudent.lastName || '').trim().toLowerCase();
                    const sSec = String(authStudent.section || '').trim().toLowerCase();

                    const cSec = String(card.section || card.sectionName || '').trim().toLowerCase();
                    if (sSec && cSec && sSec === cSec) return true;

                    if (Array.isArray(card.students) && card.students.length > 0) {
                        return card.students.some(s => {
                            const u = String(s.uid || s.id || '').replace(/^#/, '').trim().toLowerCase();
                            const lrn = String(s.lrn || '').trim();
                            const n = String(s.name || s.fullName || '').trim().toLowerCase();
                            if (sId && u && sId === u) return true;
                            if (sLrn && lrn && sLrn === lrn) return true;
                            if (sName && n && (sName === n || (sLast && n.includes(sLast)))) return true;
                            return false;
                        });
                    }
                    return false;
                });
            }
        }

        if (!cards || cards.length === 0) {
            grid.innerHTML = renderClassroomsEmptyStateHtml(effectiveRole);
            grid.classList.remove('hidden');
            grid.style.display = 'grid';
            const wrapper = document.getElementById('classrooms-grid-wrapper');
            if (wrapper) wrapper.classList.remove('hidden');
            return;
        }

        cards = sortClassroomCards(cards);

        grid.innerHTML = cards.map(c => renderCardHtml(c, effectiveRole)).join('');
        grid.classList.remove('hidden');
        grid.style.display = 'grid';

        const wrapper = document.getElementById('classrooms-grid-wrapper');
        if (wrapper) wrapper.classList.remove('hidden');

        initSectionsSortable(effectiveRole);

        if (typeof window !== 'undefined' && typeof window.initAllPocketCardRails === 'function') {
            window.initAllPocketCardRails();
        }
    }

    let activeSortableInstance = null;
    function initSectionsSortable(role = 'student') {
        const grid = document.getElementById('classrooms-grid');
        if (!grid || typeof Sortable === 'undefined') return;

        try {
            if (activeSortableInstance) {
                activeSortableInstance.destroy();
                activeSortableInstance = null;
            }
            const existing = Sortable.get(grid);
            if (existing) existing.destroy();

            const storageKey = getStorageKey(role);

            activeSortableInstance = new Sortable(grid, {
                animation: 0,
                draggable: '.classroom-card',
                filter: '.classroom-card-topic-btn, [data-no-drag], button, a',
                preventOnFilter: false,
                dataIdAttr: 'data-id',
                ghostClass: 'sortable-ghost',
                chosenClass: 'sortable-chosen',
                dragClass: 'sortable-drag-original',
                forceFallback: true,
                fallbackClass: 'sortable-drag-clone',
                fallbackOnBody: true,
                fallbackTolerance: 4,
                swapThreshold: 0.35,
                invertedSwapThreshold: 0.65,
                invertSwap: false,
                direction: () => window.innerWidth < 1024 ? 'vertical' : 'horizontal',
                scroll: true,
                bubbleScroll: true,
                scrollSensitivity: 100,
                scrollSpeed: 20,
                onChoose: (evt) => {
                    if (!evt || !evt.item) return;
                    const rect = evt.item.getBoundingClientRect();
                    evt.item.dataset.dragWidth = `${Math.round(rect.width)}`;
                    evt.item.dataset.dragHeight = `${Math.round(rect.height)}`;
                },
                onStart: (evt) => {
                    document.body.style.cursor = 'grabbing';
                    document.body.classList.add('classroom-card-sorting');

                    const dragEl = document.querySelector('body > .sortable-drag-clone') || evt.clone;
                    if (dragEl) {
                        const width = (evt && evt.item && evt.item.dataset.dragWidth)
                            ? parseInt(evt.item.dataset.dragWidth, 10)
                            : (evt && evt.item ? Math.round(evt.item.getBoundingClientRect().width) : 280);
                        const height = (evt && evt.item && evt.item.dataset.dragHeight)
                            ? parseInt(evt.item.dataset.dragHeight, 10)
                            : 220;

                        dragEl.style.width = `${width}px`;
                        dragEl.style.height = `${height}px`;
                        dragEl.style.setProperty('opacity', '1', 'important');
                    }
                },

                onEnd: (evt) => {
                    document.body.style.cursor = '';
                    document.body.classList.remove('classroom-card-sorting');
                    if (evt && evt.item) {
                        delete evt.item.dataset.dragWidth;
                        delete evt.item.dataset.dragHeight;
                    }
                    const order = Array.from(grid.querySelectorAll('.classroom-card')).map(card => card.dataset.id);
                    localStorage.setItem(storageKey, JSON.stringify(order));
                    window.dispatchEvent(new CustomEvent('sigma-classroom-order-changed', { detail: { order } }));
                },
                onCancel: (evt) => {
                    document.body.style.cursor = '';
                    document.body.classList.remove('classroom-card-sorting');
                    if (evt && evt.item) {
                        delete evt.item.dataset.dragWidth;
                        delete evt.item.dataset.dragHeight;
                    }
                }
            });
        } catch (e) {
            console.warn('Sortable init warning:', e);
        }
    }

    function sortClassroomCards(cards) {
        if (!Array.isArray(cards) || cards.length <= 1) return cards || [];

        return cards.slice().sort((a, b) => {
            const subjA = String(a.subject || a.name || '').trim();
            const subjB = String(b.subject || b.name || '').trim();
            const cmp = subjA.localeCompare(subjB, undefined, { sensitivity: 'base', numeric: true });
            if (cmp !== 0) return cmp;

            const secA = String(a.section || a.sectionName || '').trim();
            const secB = String(b.section || b.sectionName || '').trim();
            return secA.localeCompare(secB, undefined, { sensitivity: 'base', numeric: true });
        });
    }
    window.sortClassroomCards = sortClassroomCards;

    const SectionsPanelModule = {
        cards: defaultSectionCards,
        getCards: getConnectedSectionCards,
        render: renderSectionsGrid,
        initSortable: initSectionsSortable,
        sortCards: sortClassroomCards,
        detectRole: detectPortalRole
    };

    // Auto-listen for banner theme and section storage updates
    if (typeof window !== 'undefined' && !window.__classroomSectionsListenerAttached) {
        window.__classroomSectionsListenerAttached = true;
        window.addEventListener('classroom-banner-theme-changed', function () {
            renderSectionsGrid(activeSectionsRole);
        });
        window.addEventListener('storage', function (e) {
            if (e.key === 'sigma-classroom-custom-themes-v1' ||
                e.key === 'sigma-classroom-order' ||
                e.key === 'sigma-admin-sections' ||
                e.key === 'sigma-admin-subjects' ||
                e.key === 'sigma-classroom-cards-data' ||
                e.key === 'sigma-admin-users' ||
                e.key === 'sigma-teacher-users' ||
                e.key === 'sigma-student-users' ||
                e.key === 'sigma-users-list') {
                renderSectionsGrid(activeSectionsRole);
            }
        });
    }

    
    // Authoritative global topic opener from section cards
    window.openClassroomTopics = function(cardId, sectionName, subjectName) {
        if (typeof window.showStudentList === "function") {
            window.showStudentList(sectionName || '', subjectName || '', 'room');
            return;
        }
        if (typeof window.showClassroomDetail === "function") {
            window.showClassroomDetail(cardId, true, 'room');
            return;
        }

        // 3. Fallback: direct switch to topic page
        if (typeof window.switchToTopicPage === "function") {
            window.switchToTopicPage(cardId);
            return;
        }
    };

    global.ClassroomRoom = {
        THEME_PRESETS: THEME_PRESETS,
        WATERMARK_PRESETS: WATERMARK_PRESETS,
        ICON_PRESETS: ICON_PRESETS,
        ARTWORK_PRESETS: ARTWORK_PRESETS,
        catalog: SUBJECT_CATALOG,
        getSubjectMeta: getSubjectMeta,
        getCustomTheme: getCustomTheme,
        saveCustomTheme: saveCustomTheme,
        resetCustomTheme: resetCustomTheme,
        renderBanner: renderBanner,
        renderTabBar: renderTabBar,
        renderCardBanner: renderCardBanner,
        renderWatermarkContent: renderWatermarkContent,
        toggleClassInfo: toggleClassInfo,
        formatScheduleText: formatScheduleText,
        openCustomizer: openCustomizer,
        closeCustomizer: closeCustomizer,
        selectThemeColor: selectThemeColor,
        selectThemeWatermark: selectThemeWatermark,
        selectThemeIcon: selectThemeIcon,
        selectThemeArtwork: selectThemeArtwork,
        saveCurrentCustomizer: saveCurrentCustomizer,
        resetCurrentCustomizer: resetCurrentCustomizer,
        SectionsPanel: SectionsPanelModule
    };

    global.SectionsPanel = SectionsPanelModule;

    // Unified Dropdown Menu Management for Room Selection Bar
    function closeClassroomSettingsMenu() {
        const menus = document.querySelectorAll('#classroom-settings-menu, #student-room-dropdown, #admin-room-dropdown, .classroom-settings-menu');
        menus.forEach(menu => menu.classList.add('hidden'));
    }
    window.closeClassroomSettingsMenu = closeClassroomSettingsMenu;

    function toggleClassroomSettingsMenu(event) {
        if (event && event.stopPropagation) event.stopPropagation();
        if (typeof window.closeRoomQuarterMenu === 'function') {
            window.closeRoomQuarterMenu();
        }
        const menu = document.getElementById('classroom-settings-menu') || document.querySelector('.classroom-settings-menu');
        if (!menu) return;
        const isHidden = menu.classList.contains('hidden');
        closeClassroomSettingsMenu();
        if (isHidden) {
            menu.style.top = '';
            menu.style.right = '';
            menu.classList.remove('hidden');
        }
        if (typeof window.applyClassroomSettingsUI === 'function') {
            window.applyClassroomSettingsUI();
        }
    }
    window.toggleClassroomSettingsMenu = toggleClassroomSettingsMenu;

    function toggleStudentRoomDropdown(event) {
        if (event && event.stopPropagation) event.stopPropagation();
        if (typeof window.closeRoomQuarterMenu === 'function') {
            window.closeRoomQuarterMenu();
        }
        const menu = document.getElementById('student-room-dropdown') || document.querySelector('#student-room-dropdown');
        if (!menu) return;
        const isHidden = menu.classList.contains('hidden');
        closeClassroomSettingsMenu();
        if (isHidden) {
            menu.classList.remove('hidden');
        }
    }
    window.toggleStudentRoomDropdown = toggleStudentRoomDropdown;

    function toggleAdminRoomDropdown(event) {
        if (event && event.stopPropagation) event.stopPropagation();
        if (typeof window.closeRoomQuarterMenu === 'function') {
            window.closeRoomQuarterMenu();
        }
        const menu = document.getElementById('admin-room-dropdown') || document.getElementById('classroom-settings-menu');
        if (!menu) return;
        const isHidden = menu.classList.contains('hidden');
        closeClassroomSettingsMenu();
        if (isHidden) {
            menu.classList.remove('hidden');
        }
    }
    window.toggleAdminRoomDropdown = toggleAdminRoomDropdown;

    // Dismiss classroom settings menu on outside tap / click
    document.addEventListener('pointerdown', (event) => {
        const trigger = event.target.closest('#classroom-quick-settings-btn, #student-room-menu-btn, #admin-room-menu-btn, .classroom-quick-btn');
        const menu = event.target.closest('#classroom-settings-menu, #student-room-dropdown, #admin-room-dropdown, .classroom-settings-menu');
        if (!trigger && !menu) {
            closeClassroomSettingsMenu();
        }
    }, { passive: true });

    document.addEventListener('click', (event) => {
        const trigger = event.target.closest('#classroom-quick-settings-btn, #student-room-menu-btn, #admin-room-menu-btn, .classroom-quick-btn');
        const menu = event.target.closest('#classroom-settings-menu, #student-room-dropdown, #admin-room-dropdown, .classroom-settings-menu');
        if (!trigger && !menu) {
            closeClassroomSettingsMenu();
        }
    }, { passive: true });

    // Dismiss when user scrolls anywhere or resizes
    window.addEventListener('scroll', () => {
        closeClassroomSettingsMenu();
    }, { capture: true, passive: true });

    window.addEventListener('resize', () => {
        closeClassroomSettingsMenu();
    }, { passive: true });

})(typeof window !== "undefined" ? window : this);

