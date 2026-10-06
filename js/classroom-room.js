/**
 * SIGMA ELMS - Shared Classroom Room Module
 * Single authoritative source for the classroom hero banner and aligned header.
 * Used by both Teacher and Student portals.
 */
(function (global) {
    "use strict";

    let attendanceLayoutObserver = null;
    let attendanceLayoutFrame = null;
    global.observeAttendanceLayout = function (slider, align) {
        attendanceLayoutObserver?.disconnect();
        if (attendanceLayoutFrame !== null) cancelAnimationFrame(attendanceLayoutFrame);
        if (!slider || typeof ResizeObserver === 'undefined') return;
        const headers = [slider, ...slider.querySelectorAll('thead th.student-name-col, thead th.attendance-summary-th')];
        const dimensions = () => headers.map(el => el.getBoundingClientRect().width).join(':');
        let previous = dimensions();
        attendanceLayoutObserver = new ResizeObserver(() => {
            const current = dimensions();
            if (current === previous) return;
            previous = current;
            if (attendanceLayoutFrame !== null) cancelAnimationFrame(attendanceLayoutFrame);
            attendanceLayoutFrame = requestAnimationFrame(() => {
                attendanceLayoutFrame = null;
                if (slider.isConnected && slider.getClientRects().length) align();
            });
        });
        headers.forEach(el => attendanceLayoutObserver.observe(el));
    };

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
        const normSubj = String(subject || '').trim().toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ');
        const normSec = String(section || '').trim().toLowerCase().replace(/^grade\s*\d+\s*[-–]?\s*/i, '').replace(/^g\d+\s*[-–]?\s*/i, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ');
        if (normSec && normSubj) {
            return `${normSec}::${normSubj}`;
        }
        return normSubj;
    }

    function formatSubjectTitle(rawSubject) {
        if (!rawSubject) return "Subject Name";
        const str = String(rawSubject).trim();
        const norm = str.toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
        for (const catKey of Object.keys(SUBJECT_CATALOG)) {
            if (catKey.toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim() === norm) {
                return catKey;
            }
        }
        try {
            const adminSubjects = getStoredJson('sigma-admin-subjects', []);
            if (Array.isArray(adminSubjects)) {
                const found = adminSubjects.find(s => s && String(s.name || '').toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim() === norm);
                if (found && found.name) return found.name;
            }
        } catch (_) {}
        if (str.includes('-') || str.includes('_')) {
            return str.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
        }
        return str;
    }

    function getCustomTheme(subject, section) {
        if (!subject) return null;
        const all = getAllCustomThemes();
        const normSubj = String(subject || '').trim().toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ');
        const stripGrade = (s) => String(s || '').trim().toLowerCase().replace(/^grade\s*\d+\s*[-–]?\s*/i, '').replace(/^g\d+\s*[-–]?\s*/i, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ');
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
                    const kNormSubj = String(kSubj || '').trim().toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ');
                    const kBaseSec = stripGrade(kSec);
                    const subjMatch = (kNormSubj === normSubj || kNormSubj.includes(normSubj) || normSubj.includes(kNormSubj));
                    const secMatch = (kBaseSec === baseSec || (baseSec && kBaseSec.includes(baseSec)) || (kBaseSec && baseSec.includes(kBaseSec)));
                    if (subjMatch && secMatch) {
                        return v;
                    }
                }
            }
            // Fallback: check general subject theme
            if (all[subject]) return all[subject];
            if (all[normSubj]) return all[normSubj];
            for (const [k, v] of Object.entries(all)) {
                if (!k.includes("::")) {
                    const kNorm = k.toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
                    if (kNorm === normSubj) return v;
                }
            }
            return null;
        }

        // 2. If no section provided (general subject query)
        if (all[subject]) {
            return all[subject];
        }
        if (all[normSubj]) {
            return all[normSubj];
        }
        for (const [k, v] of Object.entries(all)) {
            const kNorm = k.toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
            if (kNorm === normSubj) return v;
        }
        return null;
    }

    function saveCustomTheme(subject, section, data) {
        try {
            const all = getAllCustomThemes();
            const canonicalSubj = formatSubjectTitle(subject);
            const exactKey = (section ? section + "::" : "") + subject;
            const normKey = normalizeThemeKey(section, subject);
            const stripGrade = (s) => String(s || '').trim().replace(/^grade\s*\d+\s*[-–]?\s*/i, '').replace(/^g\d+\s*[-–]?\s*/i, '').trim();
            const baseSec = stripGrade(section);

            const keysToSave = new Set([exactKey]);
            if (normKey) keysToSave.add(normKey);
            if (baseSec && canonicalSubj) {
                keysToSave.add(`${baseSec}::${canonicalSubj}`);
                keysToSave.add(`Grade 11 - ${baseSec}::${canonicalSubj}`);
                const gradeMatch = String(section || '').match(/^grade\s*(\d+)/i) || String(section || '').match(/^g(\d+)/i);
                if (gradeMatch) {
                    keysToSave.add(`Grade ${gradeMatch[1]} - ${baseSec}::${canonicalSubj}`);
                }
            }
            if (!section) {
                keysToSave.add(subject);
                keysToSave.add(canonicalSubj);
            }

            keysToSave.forEach(k => {
                all[k] = data;
            });

            localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
            window.dispatchEvent(new CustomEvent("classroom-banner-theme-changed", { detail: { subject: canonicalSubj, section, theme: data } }));
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
        const norm = String(subjectName).toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
        for (const [key, val] of Object.entries(SUBJECT_CATALOG)) {
            const kNorm = key.toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
            if (norm === kNorm || norm.includes(kNorm) || kNorm.includes(norm)) {
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
        const rawSubject = opt.subject || "Subject Name";
        const subject = formatSubjectTitle(rawSubject);
        const meta = getSubjectMeta(subject) || getSubjectMeta(rawSubject) || {};
        const custom = getCustomTheme(subject, opt.section || opt.className) || getCustomTheme(rawSubject, opt.section || opt.className) || {};

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
        const tabBtnClass = 'teacher-section-tab student-room-tab';

        const leftTabs = [
            { id: 'room', label: 'Room', icon: 'fa-solid fa-chalkboard' },
            { id: 'attendance', label: 'Attendance', icon: 'fa-solid fa-calendar-check' },
            { id: 'topics', label: 'Topics', icon: 'fa-solid fa-book' }
        ];
        const membersActive = (activeTab === 'members' || activeTab === 'people');
        const membersClick = isTeacher ? `switchClassDetailTab('members')` : `switchStudentRoomTab('members')`;
        const membersAttr = isTeacher ? `id="tab-btn-members"` : `id="tab-btn-members" data-room-tab="members"`;
        const membersBtn = `<button type="button" ${membersAttr} onclick="${membersClick}" class="classroom-quick-btn room-members-btn ${membersActive ? 'active' : ''}" title="Members" aria-label="Members"><i class="fa-solid fa-users"></i></button>`;

        function renderTabButtons(tabList) {
            return tabList.map(tab => {
                const isActive = (tab.id === activeTab) ||
                    (tab.id === 'members' && (activeTab === 'people'));
                const activeClass = isActive ? 'active student-room-tab--active' : '';
                const clickHandler = isTeacher ? `switchClassDetailTab('${tab.id}')` : `switchStudentRoomTab('${tab.id}')`;
                const attrId = isTeacher ? `id="tab-btn-${tab.id}"` : `id="tab-btn-${tab.id}" data-room-tab="${tab.id}"`;
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
            <div id="classes-detail-tabs" class="classroom-detail-tabs">
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
        <div id="student-classroom-tabs-wrapper" class="classroom-detail-tabs">
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
        if (role && role !== "teacher" && role !== "admin") return;
        const subj = subject || (window.currentClassroomSubject || '') || (window.currentClassroomMeta ? (window.currentClassroomMeta.subject || window.currentClassroomMeta.name) : '') || (window.currentAdminClassroomSection ? window.currentAdminClassroomSection.subject : '') || (window.currentClassroomKey ? window.currentClassroomKey.split('::')[1] : '') || '';
        const sec = section || window.currentClassroomSectionName || (window.currentAdminClassroomSection ? window.currentAdminClassroomSection.name : '') || (window.currentClassroomMeta ? (window.currentClassroomMeta.section || window.currentClassroomMeta.className) : '') || (window.currentClassroomKey ? window.currentClassroomKey.split('::')[0] : '') || '';
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

        // Also synchronize background room banner live on the page (both teacher and admin)
        const bannerWrappers = [
            document.getElementById("teacher-classroom-banner-wrapper"),
            document.getElementById("admin-classroom-banner-wrapper")
        ].filter(Boolean);

        if (bannerWrappers.length > 0 && activeCustomizerSubject && pendingCustomTheme) {
            bannerWrappers.forEach(bw => {
                bw.innerHTML = renderBanner({
                    subject: activeCustomizerSubject,
                    section: activeCustomizerSection,
                    gradient: pendingCustomTheme.gradient,
                    watermark: pendingCustomTheme.watermark,
                    bannerImage: pendingCustomTheme.bannerImage,
                    role: bw.id.includes("admin") ? "admin" : "teacher"
                });
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
        const bannerWrappers = [
            document.getElementById("teacher-classroom-banner-wrapper"),
            document.getElementById("admin-classroom-banner-wrapper")
        ].filter(Boolean);

        const subj = activeCustomizerSubject ||
            (window.currentClassroomSubject || '') ||
            (window.currentClassroomMeta ? (window.currentClassroomMeta.subject || window.currentClassroomMeta.name) : '') ||
            (window.currentAdminClassroomSection ? window.currentAdminClassroomSection.subject : '') ||
            (window.currentClassroomKey ? window.currentClassroomKey.split('::')[1] : '') ||
            localStorage.getItem('sigma-active-classroom-subject') || '';

        const sec = activeCustomizerSection ||
            window.currentClassroomSectionName ||
            (window.currentAdminClassroomSection ? window.currentAdminClassroomSection.name : '') ||
            (window.currentClassroomMeta ? (window.currentClassroomMeta.section || window.currentClassroomMeta.className) : '') ||
            (window.currentClassroomKey ? window.currentClassroomKey.split('::')[0] : '') ||
            localStorage.getItem('sigma-active-classroom-section') || '';

        if (bannerWrappers.length > 0 && subj) {
            bannerWrappers.forEach(bw => {
                bw.innerHTML = renderBanner({
                    subject: subj,
                    section: sec,
                    role: bw.id.includes("admin") ? "admin" : "teacher"
                });
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

    // =========================================================================
    // UNIFIED CLASSROOM SETTINGS & COMMENT CONTROLS
    // =========================================================================
    const SHARED_COMMENT_MODE_KEY = 'sigma-room-comment-mode-v1';
    let commentModeByClassroom = {};

    function refreshCommentModes() {
        commentModeByClassroom = getStoredJson(SHARED_COMMENT_MODE_KEY, {});
        return commentModeByClassroom;
    }

    function getActiveRoomSectionName() {
        return (typeof window.currentClassroomSectionName !== 'undefined' && window.currentClassroomSectionName) ||
            (window.currentAdminClassroomSection ? window.currentAdminClassroomSection.name : '') ||
            (typeof currentClassroomSectionName !== 'undefined' ? currentClassroomSectionName : '') ||
            (window.currentClassroomKey ? window.currentClassroomKey.split('::')[0] : '') ||
            (typeof currentClassroomKey !== 'undefined' && currentClassroomKey ? currentClassroomKey.split('::')[0] : '') ||
            localStorage.getItem('sigma-active-classroom-section') ||
            'Section';
    }

    function getActiveRoomSubjectName() {
        return (typeof window.currentClassroomSubject !== 'undefined' && window.currentClassroomSubject) ||
            (window.currentAdminClassroomSection ? window.currentAdminClassroomSection.subject : '') ||
            (typeof currentClassroomMeta !== 'undefined' && currentClassroomMeta ? (currentClassroomMeta.subject || currentClassroomMeta.name) : '') ||
            (window.currentClassroomKey ? window.currentClassroomKey.split('::')[1] : '') ||
            (typeof currentClassroomKey !== 'undefined' && currentClassroomKey ? currentClassroomKey.split('::')[1] : '') ||
            localStorage.getItem('sigma-active-classroom-subject') ||
            'Subject';
    }

    function getActiveRoomClassroomKey() {
        const sec = getActiveRoomSectionName();
        const subj = getActiveRoomSubjectName();
        return (typeof window.currentClassroomKey !== 'undefined' && window.currentClassroomKey) ||
            (typeof currentClassroomKey !== 'undefined' && currentClassroomKey ? currentClassroomKey : `${sec}::${subj}`);
    }

    function getCurrentCommentMode() {
        refreshCommentModes();
        const sec = getActiveRoomSectionName();
        const subj = getActiveRoomSubjectName();
        const fullKey = getActiveRoomClassroomKey();

        if (commentModeByClassroom[fullKey]) return commentModeByClassroom[fullKey];
        if (sec && subj && commentModeByClassroom[`${sec}::${subj}`]) return commentModeByClassroom[`${sec}::${subj}`];
        if (sec && commentModeByClassroom[sec]) return commentModeByClassroom[sec];

        const lowerFull = String(fullKey).trim().toLowerCase();
        const exactVal = localStorage.getItem(`classroom-comment-mode-${lowerFull}`);
        if (exactVal) return exactVal;

        for (const [k, v] of Object.entries(commentModeByClassroom)) {
            if (String(k).trim().toLowerCase() === lowerFull) {
                return v;
            }
        }
        return 'disabled';
    }

    function saveCurrentCommentMode(mode) {
        const sec = getActiveRoomSectionName();
        const subj = getActiveRoomSubjectName();
        const fullKey = getActiveRoomClassroomKey();
        if (!fullKey) return;

        refreshCommentModes();
        commentModeByClassroom[fullKey] = mode;
        if (sec && subj) commentModeByClassroom[`${sec}::${subj}`] = mode;
        localStorage.setItem(SHARED_COMMENT_MODE_KEY, JSON.stringify(commentModeByClassroom));
        localStorage.setItem(`classroom-comment-mode-${String(fullKey).trim().toLowerCase()}`, mode);
        localStorage.setItem(`classroom-comment-mode-${fullKey}`, mode);

        try {
            window.dispatchEvent(new CustomEvent('sigma:classroom-comment-mode-changed', {
                detail: { classroomKey: fullKey, section: sec, subject: subj, mode }
            }));
        } catch (e) {}
    }

    function applyClassroomSettingsUI() {
        const commentMode = getCurrentCommentMode();
        const isEnabled = (commentMode === 'enabled');
        const toggleSwitches = document.querySelectorAll('#classroom-comments-toggle-switch, #classroom-comments-toggle-switch-legacy, [id*="classroom-comments-toggle"]');
        toggleSwitches.forEach(sw => {
            if (sw && sw.type === 'checkbox') {
                sw.checked = isEnabled;
            }
        });
        document.querySelectorAll('#classroom-settings-menu [data-comment-mode], .classroom-settings-menu [data-comment-mode]').forEach(button => {
            button.classList.toggle('is-active', button.dataset.commentMode === commentMode);
        });
    }
    window.applyClassroomSettingsUI = applyClassroomSettingsUI;

    window.toggleCurrentClassroomComments = function (event) {
        if (event && event.stopPropagation) {
            event.stopPropagation();
        }
        let newMode;
        if (event && event.target && event.target.type === 'checkbox') {
            newMode = event.target.checked ? 'enabled' : 'disabled';
        } else {
            const currentMode = getCurrentCommentMode();
            newMode = (currentMode === 'enabled') ? 'disabled' : 'enabled';
        }
        saveCurrentCommentMode(newMode);
        applyClassroomSettingsUI();
        if (window.SigmaAnnouncements && typeof window.SigmaAnnouncements.refreshAllFeeds === 'function') {
            window.SigmaAnnouncements.refreshAllFeeds();
        }
    };

    window.handleClassroomCommentsRowClick = function (event) {
        if (event) {
            const isClickOnToggle = event.target.closest('.sigma-toggle-switch') || event.target.id === 'classroom-comments-toggle-switch';
            if (isClickOnToggle) return;
        }
        const toggleSwitch = document.getElementById('classroom-comments-toggle-switch');
        if (toggleSwitch) {
            toggleSwitch.checked = !toggleSwitch.checked;
            window.toggleCurrentClassroomComments({ target: toggleSwitch });
        }
    };

    window.openCurrentClassroomCustomizer = function () {
        closeClassroomSettingsMenu();
        const sec = getActiveRoomSectionName();
        const subj = getActiveRoomSubjectName();
        const isAdm = Boolean(window.currentAdminClassroomSection || (typeof window.location !== 'undefined' && window.location.pathname.includes('admin')));
        openCustomizer(subj, sec, isAdm ? 'admin' : 'teacher');
    };

    // =========================================================================
    // UNIFIED CLASSROOM ATTENDANCE ENGINE (Shared for Teacher & Admin)
    // =========================================================================
    const SHARED_ATTENDANCE_RECORDS_KEY = 'sigma-attendance-records-v1';
    let attendanceRecordsByClassroom = {};

    function refreshAttendanceRecords() {
        attendanceRecordsByClassroom = getStoredJson(SHARED_ATTENDANCE_RECORDS_KEY, {});
        return attendanceRecordsByClassroom;
    }

    let attendanceViewingYear = new Date().getFullYear();
    let attendanceViewingMonth = new Date().getMonth();
    let expandedAttendanceCol = -1;
    let attendanceSelectedDay = -1;
    let attendanceLastScrollLeft = -1;
    let isAttendanceStudentColExpanded = false;

    let attendanceCalendarPopupMode = 'days';
    let attendancePopupViewingMonth = new Date().getMonth();
    let attendancePopupViewingYear = new Date().getFullYear();
    let attendancePickerYear = new Date().getFullYear();
    let attendanceScrollAnimationId = null;

    function getTodayLocalDateString() {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    function normalizeAttendanceTokens(str) {
        return String(str || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').trim().split(/\s+/).filter(Boolean);
    }

    function studentNamesMatch(name1, name2) {
        if (!name1 || !name2) return false;
        const s1 = String(name1).trim().toLowerCase();
        const s2 = String(name2).trim().toLowerCase();
        if (s1 === s2) return true;

        const t1 = normalizeAttendanceTokens(name1);
        const t2 = normalizeAttendanceTokens(name2);
        if (t1.length === 0 || t2.length === 0) return false;

        // Exact tokens match in any order (e.g. "Herald Jamero Kalipungan" vs "Kalipungan, Herald Jamero")
        if (t1.slice().sort().join(' ') === t2.slice().sort().join(' ')) return true;

        // Filter out single-letter initials (like middle initial 'J' or 'A')
        const full1 = t1.filter(t => t.length > 1);
        const full2 = t2.filter(t => t.length > 1);
        if (full1.length > 0 && full2.length > 0 && full1.slice().sort().join(' ') === full2.slice().sort().join(' ')) {
            return true;
        }

        // Check if one is a subset of the other (e.g. "Juan Dela Cruz" in "Juan Abad Dela Cruz")
        const set1 = new Set(t1);
        const set2 = new Set(t2);
        const isSubset1 = t1.every(t => set2.has(t));
        const isSubset2 = t2.every(t => set1.has(t));
        if (isSubset1 || isSubset2) {
            return true;
        }

        return false;
    }
    window.studentNamesMatch = studentNamesMatch;

    /**
     * Intelligent Multi-Key Attendance Record Resolver
     * Resolves and bridges keys across Teacher and Admin portals:
     * e.g. "Grade 11 - Rizal::Empowerment Technologies", "Rizal::Empowerment Technologies", "Rizal::Empowerment-Technologies"
     */
    function findAttendanceClassroomRecord(secName, subjName) {
        refreshAttendanceRecords();
        if (!attendanceRecordsByClassroom || typeof attendanceRecordsByClassroom !== 'object') {
            return { key: null, data: {} };
        }

        const cleanSec = String(secName || '').trim();
        const cleanSubj = String(subjName || '').trim();
        const normalizeSubj = (s) => {
            const str = String(s || '').trim();
            const unslug = str.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
            return unslug.replace(/\s*&\s*/g, ' and ');
        };
        const stripGrade = (s) => String(s || '').replace(/^grade\s*\d+\s*[-–]?\s*/i, '').replace(/^g\d+\s*[-–]?\s*/i, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();

        const baseSec = stripGrade(cleanSec);
        const normSubj = normalizeSubj(cleanSubj);
        const canonicalSubj = (typeof formatSubjectTitle === 'function') ? formatSubjectTitle(cleanSubj) : cleanSubj;

        // 1. Direct match with current active key or direct variants
        const directKey = `${cleanSec}::${cleanSubj}`;
        const directKeysToCheck = [
            directKey,
            `${cleanSec}::${canonicalSubj}`,
            `${baseSec}::${canonicalSubj}`,
            `Grade 11 - ${baseSec}::${canonicalSubj}`,
            `${cleanSec}::${cleanSubj.replace(/\s+/g, '-')}`,
            `${cleanSec}::${cleanSubj.replace(/[-_]+/g, ' ')}`,
            `${baseSec}::${cleanSubj.replace(/\s+/g, '-')}`,
            `${baseSec}::${cleanSubj.replace(/[-_]+/g, ' ')}`
        ];
        for (const dk of directKeysToCheck) {
            if (attendanceRecordsByClassroom[dk] && Object.keys(attendanceRecordsByClassroom[dk]).length > 0) {
                return { key: dk, data: attendanceRecordsByClassroom[dk] };
            }
        }

        // 2. Iterate all keys in attendanceRecordsByClassroom to find matching section & subject
        const allKeys = Object.keys(attendanceRecordsByClassroom);
        for (const k of allKeys) {
            if (!k.includes('::')) continue;
            const [kSec, kSubj] = k.split('::').map(x => x.trim());
            const kNormSubj = normalizeSubj(kSubj);
            const kBaseSec = stripGrade(kSec);

            // Strict section match: base sections must be identical (or raw strings identical)
            const secMatches = (kSec.toLowerCase() === cleanSec.toLowerCase() || (kBaseSec && baseSec && kBaseSec === baseSec));
            // Strict subject match: normalized subjects must be identical
            const subjMatches = Boolean(kNormSubj && normSubj && kNormSubj === normSubj);

            if (secMatches && subjMatches) {
                return { key: k, data: attendanceRecordsByClassroom[k] };
            }
        }

        // 3. Check section id matches from sigma-admin-sections
        const adminSecs = getStoredJson('sigma-admin-sections', []);
        if (Array.isArray(adminSecs)) {
            const found = adminSecs.find(s => s && (String(s.id) === cleanSec || stripGrade(s.name || s.sectionName) === baseSec));
            if (found) {
                const aliasKeys = [
                    `${found.id}::${cleanSubj}`,
                    `${found.id}::${canonicalSubj}`,
                    `${found.name}::${cleanSubj}`,
                    `${found.name}::${canonicalSubj}`,
                    `Grade ${found.grade || found.gradeLevel || 11} - ${found.name}::${cleanSubj}`,
                    `Grade ${found.grade || found.gradeLevel || 11} - ${found.name}::${canonicalSubj}`
                ];
                for (const ak of aliasKeys) {
                    if (attendanceRecordsByClassroom[ak] && Object.keys(attendanceRecordsByClassroom[ak]).length > 0) {
                        return { key: ak, data: attendanceRecordsByClassroom[ak] };
                    }
                }
            }
        }

        return { key: directKey, data: {} };
    }

    function getCurrentAttendanceStatuses(dateString = getTodayLocalDateString()) {
        const secName = getActiveRoomSectionName();
        const subjName = getActiveRoomSubjectName();
        const { data: classroomData } = findAttendanceClassroomRecord(secName, subjName);

        if (classroomData[dateString] && classroomData[dateString].statuses) {
            return { ...classroomData[dateString].statuses };
        }
        if (classroomData.date === dateString && classroomData.statuses) {
            return { ...classroomData.statuses };
        }
        return {};
    }

    function getCurrentAttendanceExcuses(dateString = getTodayLocalDateString()) {
        const secName = getActiveRoomSectionName();
        const subjName = getActiveRoomSubjectName();
        const { data: classroomData } = findAttendanceClassroomRecord(secName, subjName);

        if (classroomData[dateString] && classroomData[dateString].excuses) {
            return { ...classroomData[dateString].excuses };
        }
        if (classroomData.date === dateString && classroomData.excuses) {
            return { ...classroomData.excuses };
        }
        return {};
    }

    function saveCurrentAttendanceStatuses(statuses, dateString = getTodayLocalDateString(), excuses = null) {
        const secName = getActiveRoomSectionName();
        const subjName = getActiveRoomSubjectName();
        const fullKey = getActiveRoomClassroomKey();
        if (!fullKey) return;

        if (typeof dateString === 'object' && dateString !== null) {
            excuses = dateString;
            dateString = getTodayLocalDateString();
        }
        if (!excuses) {
            excuses = getCurrentAttendanceExcuses(dateString);
        }
        refreshAttendanceRecords();

        const recordEntry = {
            updatedAt: new Date().toISOString(),
            statuses: { ...statuses },
            excuses: { ...excuses }
        };

        const { key: existingKey } = findAttendanceClassroomRecord(secName, subjName);
        const keysToSave = new Set([fullKey]);
        if (existingKey) keysToSave.add(existingKey);

        const canonicalSubj = (typeof formatSubjectTitle === 'function') ? formatSubjectTitle(subjName) : subjName;
        const unslugSubj = String(subjName || '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
        const slugSubj = unslugSubj.replace(/\s+/g, '-');
        const cleanSec = String(secName || '').trim();
        const stripGrade = (s) => String(s || '').replace(/^grade\s*\d+\s*[-–]?\s*/i, '').replace(/^g\d+\s*[-–]?\s*/i, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
        const baseSec = stripGrade(cleanSec);

        const subjectVariants = [subjName, canonicalSubj, unslugSubj, slugSubj].filter(Boolean);
        const sectionVariants = [cleanSec, baseSec, `Grade 11 - ${baseSec}`].filter(Boolean);

        for (const secVar of sectionVariants) {
            for (const subVar of subjectVariants) {
                keysToSave.add(`${secVar}::${subVar}`);
            }
        }

        const normalizeSubj = (s) => String(s || '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').replace(/\s*&\s*/g, ' and ').trim().toLowerCase();
        const normSubj = normalizeSubj(subjName);
        const normBaseSec = baseSec.toLowerCase();

        for (const k of Object.keys(attendanceRecordsByClassroom)) {
            if (!k.includes('::')) continue;
            const [kSec, kSubj] = k.split('::').map(x => x.trim());
            const kBaseSec = stripGrade(kSec).toLowerCase();
            const kNormSubj = normalizeSubj(kSubj);
            if ((kSec.toLowerCase() === cleanSec.toLowerCase() || (kBaseSec && normBaseSec && kBaseSec === normBaseSec)) && kNormSubj === normSubj) {
                keysToSave.add(k);
            }
        }

        keysToSave.forEach(k => {
            if (!attendanceRecordsByClassroom[k]) {
                attendanceRecordsByClassroom[k] = {};
            }
            if (attendanceRecordsByClassroom[k].date) {
                delete attendanceRecordsByClassroom[k].date;
                delete attendanceRecordsByClassroom[k].statuses;
                delete attendanceRecordsByClassroom[k].excuses;
            }
            attendanceRecordsByClassroom[k][dateString] = { ...recordEntry };
        });

        localStorage.setItem(SHARED_ATTENDANCE_RECORDS_KEY, JSON.stringify(attendanceRecordsByClassroom));
        try {
            window.dispatchEvent(new CustomEvent('sigma:attendance-changed', {
                detail: { classroomKey: fullKey, dateString, statuses }
            }));
        } catch (e) {}
    }

    function formatStudentLastFirstMiddle(student) {
        if (!student) return '';
        const allUsers = getStoredJson('sigma-admin-users', getStoredJson('sigma-users-list', []));

        let stObj = typeof student === 'object' ? student : { name: String(student) };
        let stId = String(stObj.id || stObj.uid || stObj.lrn || '').trim();
        let rawName = String(stObj.name || stObj.fullName || '').trim();

        let lName = String(stObj.lastName || stObj.lastname || '').trim();
        let fName = String(stObj.firstName || stObj.firstname || '').trim();
        let mName = String(stObj.middleName || stObj.middlename || '').trim();

        let matchedUser = null;
        if (Array.isArray(allUsers) && allUsers.length > 0) {
            if (stId) {
                matchedUser = allUsers.find(u => String(u.id || u.uid || u.lrn) === stId);
            }
            if (!matchedUser && rawName) {
                matchedUser = (typeof window.findMatchedUserAccount === 'function')
                    ? window.findMatchedUserAccount(stId, rawName)
                    : allUsers.find(u => (u.fullName && u.fullName.toLowerCase() === rawName.toLowerCase()) || (u.name && u.name.toLowerCase() === rawName.toLowerCase()));
                if (!matchedUser && typeof studentNamesMatch === 'function') {
                    matchedUser = allUsers.find(u => studentNamesMatch(u.fullName || `${u.lastName}, ${u.firstName}`, rawName));
                }
            }
        }

        if (matchedUser) {
            if (!lName) lName = String(matchedUser.lastName || matchedUser.lastname || '').trim();
            if (!fName) fName = String(matchedUser.firstName || matchedUser.firstname || '').trim();
            if (!mName) mName = String(matchedUser.middleName || matchedUser.middlename || '').trim();
        }

        if (lName && fName) {
            return `${lName}, ${fName}${mName ? ' ' + mName : ''}`;
        }

        if (rawName.includes(',')) {
            return rawName;
        }

        const tokens = rawName.split(/\s+/).filter(Boolean);
        if (tokens.length <= 1) return rawName;

        const compoundLastPrefixes = ['dela', 'delos', 'de la', 'de los', 'san', 'santa', 'del', 'de'];
        if (tokens.length >= 3) {
            const lastTwo = `${tokens[tokens.length - 2]} ${tokens[tokens.length - 1]}`.toLowerCase();
            if (compoundLastPrefixes.some(p => lastTwo.startsWith(p))) {
                const compoundLast = `${tokens[tokens.length - 2]} ${tokens[tokens.length - 1]}`;
                const first = tokens[0];
                const middle = tokens.slice(1, -2).join(' ');
                return `${compoundLast}, ${first}${middle ? ' ' + middle : ''}`;
            }
        }

        const last = tokens[tokens.length - 1];
        const first = tokens[0];
        const middle = tokens.slice(1, -1).join(' ');
        return `${last}, ${first}${middle ? ' ' + middle : ''}`;
    }
    window.formatStudentLastFirstMiddle = formatStudentLastFirstMiddle;

    function getAttendanceStudents(secName, subjName) {
        let raw = [];
        if (window.currentAdminClassroomSection && Array.isArray(window.currentAdminClassroomSection.students) && window.currentAdminClassroomSection.students.length > 0) {
            raw = window.currentAdminClassroomSection.students;
        }
        if ((!raw || raw.length === 0) && typeof window.getUnifiedSectionStudents === 'function') {
            const s = window.getUnifiedSectionStudents(secName, subjName);
            if (Array.isArray(s) && s.length > 0) raw = s;
        }
        if ((!raw || raw.length === 0) && typeof window.getStudentsForSection === 'function') {
            const s = window.getStudentsForSection(secName, subjName);
            if (Array.isArray(s) && s.length > 0) raw = s;
        }
        if ((!raw || raw.length === 0) && typeof studentsBySection !== 'undefined' && studentsBySection[secName]) {
            raw = studentsBySection[secName];
        }
        if ((!raw || raw.length === 0) && window.studentsBySection && window.studentsBySection[secName]) {
            raw = window.studentsBySection[secName];
        }
        if (!raw || raw.length === 0) {
            const adminSecs = getStoredJson('sigma-admin-sections', []);
            const stripGrade = (s) => String(s || '').replace(/^grade\s*\d+\s*[-–]?\s*/i, '').trim().toLowerCase();
            const base = stripGrade(secName);
            let match = adminSecs.find(s => s && (stripGrade(s.name || s.sectionName) === base || String(s.id) === String(secName)));
            if (match && Array.isArray(match.students) && match.students.length > 0) {
                raw = match.students;
            }
        }

        if (!Array.isArray(raw) || raw.length === 0) {
            if (typeof canonicalDefaultStudents !== 'undefined' && Array.isArray(canonicalDefaultStudents)) {
                raw = canonicalDefaultStudents;
            }
        }

        const allUsers = getStoredJson('sigma-admin-users', getStoredJson('sigma-users-list', []));

        return (Array.isArray(raw) ? raw : []).map((st, i) => {
            const displayName = formatStudentLastFirstMiddle(st);
            let id = typeof st === 'object' ? String(st.id || st.uid || st.lrn || '') : '';
            const matchedUser = (typeof window.findMatchedUserAccount === 'function')
                ? window.findMatchedUserAccount(id, displayName)
                : (Array.isArray(allUsers) ? allUsers.find(u => (id && (String(u.id) === id || String(u.uid) === id)) || (u.fullName || u.name) === displayName) : null);
            if (!id) id = matchedUser?.id || `STD-${String(i + 1).padStart(3, '0')}`;
            const avatar = (typeof st === 'object' && st.avatar) ? st.avatar : (matchedUser?.avatar || '');

            return {
                ...(typeof st === 'object' ? st : {}),
                id: id,
                name: displayName,
                fullName: displayName,
                displayName: displayName,
                avatar: avatar
            };
        }).sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    }

    function getEffectiveAttendanceZoom(elem) {
        let zoom = 1;
        let curr = elem;
        while (curr && curr !== document.documentElement) {
            const z = parseFloat(window.getComputedStyle(curr).zoom);
            if (!isNaN(z) && z > 0) zoom *= z;
            curr = curr.parentElement;
        }
        return zoom || 1;
    }

    function smoothScrollAttendance(element, target, duration = 300) {
        if (!element) return;
        if (attendanceScrollAnimationId) {
            cancelAnimationFrame(attendanceScrollAnimationId);
            attendanceScrollAnimationId = null;
        }

        const start = element.scrollLeft;
        const change = target - start;
        if (Math.abs(change) < 2) {
            element.scrollLeft = target;
            attendanceLastScrollLeft = target;
            return;
        }

        const startTime = performance.now();
        function easeOutCubic(t) {
            return 1 - Math.pow(1 - t, 3);
        }

        function step(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            element.scrollLeft = start + (change * easeOutCubic(progress));
            if (progress < 1) {
                attendanceScrollAnimationId = requestAnimationFrame(step);
            } else {
                element.scrollLeft = target;
                attendanceLastScrollLeft = target;
                attendanceScrollAnimationId = null;
            }
        }
        attendanceScrollAnimationId = requestAnimationFrame(step);
    }

    function slideToBesideStudentCol(slider, day, smooth = true) {
        if (!slider) return;
        const dayTh = slider.querySelector(`thead th.day-col[data-day="${day}"]`);
        if (!dayTh) return;

        const summaryTh = slider.querySelector('thead th.attendance-summary-th--l');
        const lastStickyTh = summaryTh?.getClientRects().length ? summaryTh : slider.querySelector('thead th.student-name-col');
        if (!lastStickyTh) return;

        const dayRect = dayTh.getBoundingClientRect();
        const stickyRight = lastStickyTh.getBoundingClientRect().right;
        const zoomFactor = getEffectiveAttendanceZoom(slider);
        const offsetDiff = (dayRect.left - stickyRight) / zoomFactor;
        const perfectTarget = Math.max(0, Math.round(slider.scrollLeft + offsetDiff));

        if (smooth) {
            smoothScrollAttendance(slider, perfectTarget, 300);
        } else {
            if (attendanceScrollAnimationId) {
                cancelAnimationFrame(attendanceScrollAnimationId);
                attendanceScrollAnimationId = null;
            }
            slider.scrollLeft = perfectTarget;
            attendanceLastScrollLeft = perfectTarget;
        }
    }

    function slideAttendanceDayIntoView(slider, day, smooth = true) {
        if (!slider) return;
        const dayTh = slider.querySelector(`thead th.day-col[data-day="${day}"]`);
        if (!dayTh) return;

        const stickyTh = slider.querySelector('thead th.attendance-summary-th--l') || slider.querySelector('thead th.student-name-col');
        const sliderRect = slider.getBoundingClientRect();
        const dayRect = dayTh.getBoundingClientRect();
        const stickyRight = stickyTh ? stickyTh.getBoundingClientRect().right : sliderRect.left;
        const visibleLeft = Math.max(stickyRight, sliderRect.left);
        const visibleRight = sliderRect.right;
        const visibleWidth = Math.max(1, visibleRight - visibleLeft);
        const safeGap = Math.min(32, Math.max(16, visibleWidth * 0.06));
        let target = slider.scrollLeft;

        if (dayRect.left < visibleLeft + safeGap || dayRect.right > visibleRight - safeGap) {
            const zoomFactor = getEffectiveAttendanceZoom(slider);
            target += ((dayRect.left + (dayRect.width / 2)) - (visibleLeft + (visibleWidth / 2))) / zoomFactor;
        } else {
            attendanceLastScrollLeft = slider.scrollLeft;
            return;
        }

        const maxScroll = Math.max(0, slider.scrollWidth - slider.clientWidth);
        target = Math.min(maxScroll, Math.max(0, target));

        if (smooth) {
            smoothScrollAttendance(slider, target, 300);
        } else {
            if (attendanceScrollAnimationId) {
                cancelAnimationFrame(attendanceScrollAnimationId);
                attendanceScrollAnimationId = null;
            }
            slider.scrollLeft = target;
            attendanceLastScrollLeft = target;
        }
    }

    function updateAttendanceMobileSummaryWidth() {
        const table = document.querySelector('.attendance-month-table');
        if (!table) return;
        const gridContainer = table.closest('.attendance-grid-container') || table.parentElement;
        const visibleWidth = gridContainer ? gridContainer.clientWidth : (window.innerWidth || 360);
        const colWidth = Math.max(38, (visibleWidth - 220) / 3);
        table.style.setProperty('--attendance-mobile-summary-col-width', `${colWidth}px`);
    }

    function initAttendanceDragScroll() {
        const slider = document.querySelector('#detail-section-attendance .attendance-grid-container, .attendance-grid-container');
        if (!slider) return;

        let isDown = false;
        let startX;
        let scrollLeft;
        let hasMoved = false;

        slider.addEventListener('scroll', () => {
            attendanceLastScrollLeft = slider.scrollLeft;
        });

        slider.addEventListener('mousedown', (e) => {
            if (attendanceScrollAnimationId) {
                cancelAnimationFrame(attendanceScrollAnimationId);
                attendanceScrollAnimationId = null;
            }
            isDown = true;
            hasMoved = false;
            slider.classList.add('dragging');
            startX = e.pageX - slider.offsetLeft;
            scrollLeft = slider.scrollLeft;
        });

        slider.addEventListener('mouseleave', () => {
            isDown = false;
            slider.classList.remove('dragging');
        });

        slider.addEventListener('mouseup', () => {
            isDown = false;
            slider.classList.remove('dragging');
        });

        slider.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            const x = e.pageX - slider.offsetLeft;
            const walk = (x - startX) * 1.5;
            if (Math.abs(walk) > 5) {
                hasMoved = true;
                e.preventDefault();
                slider.scrollLeft = scrollLeft - walk;
            }
        });

        slider.addEventListener('click', (e) => {
            if (hasMoved) {
                e.preventDefault();
                e.stopPropagation();
            }
        }, true);
    }

    function renderClassroomAttendanceTab(shouldSlide = false) {
        const container = document.getElementById('detail-section-attendance');
        if (!container) return;

        const oldSlider = container.querySelector('.attendance-grid-container');
        const isFreshOpen = attendanceLastScrollLeft === -1;
        const currentScrollLeft = (!oldSlider) ? -1 : oldSlider.scrollLeft;
        if (!isFreshOpen && currentScrollLeft >= 0) {
            attendanceLastScrollLeft = currentScrollLeft;
        }

        const secName = getActiveRoomSectionName();
        const subjName = getActiveRoomSubjectName();
        const rawStudents = getAttendanceStudents(secName, subjName);
        const students = (Array.isArray(rawStudents) ? rawStudents.slice() : [])
            .sort((a, b) => String(a.name || a.fullName || '').localeCompare(String(b.name || b.fullName || '')));

        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const daysInMonth = new Date(attendanceViewingYear, attendanceViewingMonth + 1, 0).getDate();
        const todayNow = new Date();
        const isCurrentMonth = (todayNow.getMonth() === attendanceViewingMonth && todayNow.getFullYear() === attendanceViewingYear);
        const todayDay = todayNow.getDate();
        const BLANK_ATTENDANCE_COLS_COUNT = 24;

        const dailyStatuses = [];
        const studentTotals = {};
        if (students.length > 0) {
            students.forEach(st => {
                const sKey = st.id || st.uid || st.name;
                studentTotals[sKey] = { P: 0, A: 0, L: 0 };
            });

            for (let d = 1; d <= daysInMonth; d++) {
                const localDateString = `${attendanceViewingYear}-${String(attendanceViewingMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const currentStatuses = getCurrentAttendanceStatuses(localDateString);
                dailyStatuses[d] = { dateStr: localDateString, statuses: currentStatuses };

                if (isAttendanceStudentColExpanded) {
                    students.forEach(student => {
                        const sKey = student.id || student.uid || student.name;
                        let displayName = student.name || student.displayName || student.fullName || '';
                        let status = currentStatuses[student.name] ||
                            currentStatuses[displayName] ||
                            (student.id && currentStatuses[student.id]) ||
                            (student.uid && currentStatuses[student.uid]) || '';
                        if (!status) {
                            for (const k of Object.keys(currentStatuses)) {
                                if ((student.id && String(k) === String(student.id)) || (student.uid && String(k) === String(student.uid)) || studentNamesMatch(k, student.name || student.fullName)) {
                                    status = currentStatuses[k];
                                    break;
                                }
                            }
                        }
                        if (status === 'P') studentTotals[sKey].P++;
                        else if (status === 'A') studentTotals[sKey].A++;
                        else if (status === 'L') studentTotals[sKey].L++;
                    });
                }
            }
        }

        let html = `
            <div class="attendance-monthly-card">
                <div class="attendance-monthly-header flex items-center justify-between w-full relative px-3 py-2 sm:px-4 sm:py-3 border-b border-slate-100 bg-white">
                    <div class="w-8 sm:w-24 shrink-0"></div>
                    <div class="relative inline-flex items-center gap-1 sm:gap-2">
                        <button type="button" class="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-black hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer" onclick="window.navAttendanceMonth(-1)" title="Previous Month" aria-label="Previous Month">
                            <i class="fa-solid fa-chevron-left text-[11px] sm:text-xs text-black"></i>
                        </button>
                        <span class="attendance-month-display text-xs sm:text-base font-bold text-black font-['Inter'] select-none">
                            ${monthNames[attendanceViewingMonth]} ${attendanceViewingYear}
                        </span>
                        <button type="button" class="teacher-attendance-month-picker-btn flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full hover:bg-slate-100 text-[#15803d] hover:text-[#166534] transition-all cursor-pointer" onclick="window.toggleTeacherAttendanceCalendarPopup(event)" title="Select Date / Month">
                            <i class="fa-regular fa-calendar text-xs sm:text-sm text-[#15803d]"></i>
                        </button>
                        <button type="button" class="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-black hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer" onclick="window.navAttendanceMonth(1)" title="Next Month" aria-label="Next Month">
                            <i class="fa-solid fa-chevron-right text-[11px] sm:text-xs text-black"></i>
                        </button>
                        <div id="teacher-attendance-calendar-popup" class="teacher-attendance-calendar-popup hidden"></div>
                    </div>
                    <div class="flex items-center justify-end shrink-0">
                        <button type="button" class="attendance-export-excel-btn flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 border border-emerald-200 text-[11px] sm:text-xs font-semibold transition-all shadow-sm active:scale-95 cursor-pointer select-none" onclick="window.openAttendanceExportModal()" title="Export Attendance to Excel">
                            <i class="fa-solid fa-file-excel text-emerald-600 text-xs sm:text-sm"></i>
                            <span style="display:inline !important; line-height:16px;">Export</span>
                        </button>
                    </div>
                </div>
                <div class="attendance-grid-container">
                    <table class="attendance-month-table font-['Inter'] text-black">
                        <thead>
                            <tr>
                                <th class="student-name-col ${isAttendanceStudentColExpanded ? 'is-students-expanded' : ''}" onclick="window.toggleAttendanceStudentCol(event)" style="cursor: pointer;" title="${isAttendanceStudentColExpanded ? 'Collapse Present, Absent, Late columns' : 'Expand to see Present, Absent, Late summary columns'}">
                                    <div class="attendance-th-students-inner flex items-center justify-between gap-1 h-full w-full select-none cursor-pointer">
                                        <span class="attendance-th-title" style="font-size: clamp(11px, 2.8vw, 13.5px); white-space: nowrap;">Students</span>
                                        <span class="attendance-students-expand-btn w-5 h-5 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white text-[10.5px] transition-all cursor-pointer shrink-0 ml-1">
                                            <i class="fa-solid ${isAttendanceStudentColExpanded ? 'fa-chevron-left' : 'fa-chevron-right'}"></i>
                                        </span>
                                    </div>
                                </th>
                                ${isAttendanceStudentColExpanded ? `
                                    <th class="attendance-summary-th attendance-summary-th--p" title="Total Present days this month">
                                        <span class="attendance-summary-label-full">Present</span><span class="attendance-summary-label-short">P</span>
                                    </th>
                                    <th class="attendance-summary-th attendance-summary-th--a" title="Total Absent days this month">
                                        <span class="attendance-summary-label-full">Absent</span><span class="attendance-summary-label-short">A</span>
                                    </th>
                                    <th class="attendance-summary-th attendance-summary-th--l" title="Total Late days this month">
                                        <span class="attendance-summary-label-full">Late</span><span class="attendance-summary-label-short">L</span>
                                    </th>
                                ` : ''}
                                ${Array.from({ length: daysInMonth }, (_, i) => {
                                    const day = i + 1;
                                    const date = new Date(attendanceViewingYear, attendanceViewingMonth, day);
                                    const m = String(date.getMonth() + 1).padStart(2, '0');
                                    const d = String(date.getDate()).padStart(2, '0');
                                    const label = `${m}/${d}`;
                                    const isExpanded = expandedAttendanceCol === day;
                                    const isToday = (todayNow.getDate() === day && isCurrentMonth);
                                    const isSelected = (attendanceSelectedDay === day);
                                    return `<th class="day-col ${isExpanded ? 'is-expanded' : ''} ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}" data-day="${day}" onclick="window.toggleAttendanceExpansion(${day})"><span class="attendance-th-date">${label}</span></th>`;
                                }).join('')}
                                ${Array.from({ length: BLANK_ATTENDANCE_COLS_COUNT }, () => `<th class="day-col blank-col"></th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
        `;

        if (students.length === 0) {
            html += `
                <tr>
                    <td colspan="${daysInMonth + 1 + BLANK_ATTENDANCE_COLS_COUNT + (isAttendanceStudentColExpanded ? 3 : 0)}" class="py-16 text-center text-slate-500">
                        <div class="flex flex-col items-center justify-center gap-2">
                            <div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                <i class="fa-solid fa-user-slash text-base"></i>
                            </div>
                            <p class="text-xs font-bold text-slate-700">No Students Enrolled</p>
                            <p class="text-[11px] text-black-fade">No students have been assigned to this section yet.</p>
                        </div>
                    </td>
                </tr>
            `;
        } else {
            students.forEach(student => {
                let displayName = student.name || student.displayName || student.fullName || '';
                const studentAvatarHtml = (typeof window.renderUserAvatarHtml === 'function')
                    ? window.renderUserAvatarHtml(displayName, 'sm')
                    : `<div class="sigma-user-avatar sigma-user-avatar--sm"><i class="fa-solid fa-user text-xs"></i></div>`;
                const sKey = student.id || student.uid || student.name;
                const totals = studentTotals[sKey] || { P: 0, A: 0, L: 0 };

                html += `
                    <tr>
                        <td class="student-name-col ${isAttendanceStudentColExpanded ? 'is-students-expanded' : ''}">
                            <div class="flex items-center gap-1.5 sm:gap-2.5 h-full w-full min-w-0 overflow-hidden whitespace-nowrap pointer-events-none select-none cursor-default" style="white-space: nowrap !important; overflow: hidden !important;">
                                ${studentAvatarHtml}
                                <span class="attendance-student-name font-medium text-black truncate max-w-full block whitespace-nowrap overflow-hidden" 
                                      style="font-size: clamp(10px, 2.6vw, 13px); white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; display: block !important; width: 100% !important; max-width: 100% !important; line-height: 1.2 !important;" 
                                      title="${escapeHtml(displayName)}">${escapeHtml(displayName)}</span>
                            </div>
                        </td>
                        ${isAttendanceStudentColExpanded ? `
                            <td class="attendance-summary-td attendance-summary-td--p">
                                <span class="attendance-count-num">${totals.P}</span>
                            </td>
                            <td class="attendance-summary-td attendance-summary-td--a">
                                <span class="attendance-count-num">${totals.A}</span>
                            </td>
                            <td class="attendance-summary-td attendance-summary-td--l">
                                <span class="attendance-count-num">${totals.L}</span>
                            </td>
                        ` : ''}`;

                for (let d = 1; d <= daysInMonth; d++) {
                    const dayData = dailyStatuses[d] || {};
                    const localDateString = dayData.dateStr || `${attendanceViewingYear}-${String(attendanceViewingMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    const currentStatuses = dayData.statuses || getCurrentAttendanceStatuses(localDateString);
                    let status = currentStatuses[student.name] ||
                        (student.id && currentStatuses[student.id]) ||
                        (student.uid && currentStatuses[student.uid]) ||
                        currentStatuses[displayName] || '';
                    if (!status) {
                        for (const k of Object.keys(currentStatuses)) {
                            if ((student.id && String(k) === String(student.id)) || (student.uid && String(k) === String(student.uid)) || studentNamesMatch(k, student.name || student.fullName)) {
                                status = currentStatuses[k];
                                break;
                            }
                        }
                    }
                    const statusClass = status ? `status-${status.toLowerCase()}` : '';
                    const isExpanded = expandedAttendanceCol === d;
                    const stId = (student.id || student.uid || '').replace(/'/g, "\\'");

                    html += `
                        <td class="day-col ${isExpanded ? 'is-expanded' : ''} ${!isExpanded && status ? 'status-' + status.toLowerCase() : ''}">
                            <div class="attendance-day-cell ${isExpanded ? 'is-expanded' : ''} ${statusClass}" 
                                 onclick="${!isExpanded ? `window.toggleAttendanceExpansion(${d})` : ''}">
                                ${isExpanded ? `
                                    <div class="attendance-opt-container">
                                        <button class="attendance-opt-btn p-btn ${status === 'P' ? 'active' : ''}" onclick="window.setAttendanceStatus('${displayName.replace(/'/g, "\\'")}', '${localDateString}', 'P', event, '${stId}')">P</button>
                                        <button class="attendance-opt-btn a-btn ${status === 'A' ? 'active' : ''}" onclick="window.setAttendanceStatus('${displayName.replace(/'/g, "\\'")}', '${localDateString}', 'A', event, '${stId}')">A</button>
                                        <button class="attendance-opt-btn l-btn ${status === 'L' ? 'active' : ''}" onclick="window.setAttendanceStatus('${displayName.replace(/'/g, "\\'")}', '${localDateString}', 'L', event, '${stId}')">L</button>
                                    </div>
                                ` : (status ? status[0].toUpperCase() : '')}
                            </div>
                        </td>
                    `;
                }
                for (let b = 0; b < BLANK_ATTENDANCE_COLS_COUNT; b++) {
                    html += `<td class="day-col blank-col"></td>`;
                }
                html += `</tr>`;
            });
        }

        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        container.innerHTML = html;

        const slider = container.querySelector('.attendance-grid-container');
        if (slider) {
            if (expandedAttendanceCol !== -1) {
                if (attendanceLastScrollLeft >= 0) {
                    slider.scrollLeft = attendanceLastScrollLeft;
                }
                const now = new Date();
                const isCurrent = (attendanceViewingMonth === now.getMonth() && attendanceViewingYear === now.getFullYear());
                const isToday = (expandedAttendanceCol === now.getDate() && isCurrent);

                if (shouldSlide && !isToday) {
                    requestAnimationFrame(() => {
                        slideToBesideStudentCol(slider, expandedAttendanceCol, true);
                    });
                }
            } else if (attendanceLastScrollLeft === -1) {
                if (isCurrentMonth) {
                    const snapToCurrent = (smooth = false) => {
                        slideToBesideStudentCol(slider, todayDay, smooth);
                    };
                    snapToCurrent(false);
                    requestAnimationFrame(() => {
                        snapToCurrent(false);
                        setTimeout(() => snapToCurrent(false), 40);
                    });
                } else {
                    slider.scrollLeft = 0;
                    attendanceLastScrollLeft = 0;
                }
            } else {
                slider.scrollLeft = attendanceLastScrollLeft;
            }
        }

        initAttendanceDragScroll();
        updateAttendanceMobileSummaryWidth();
        global.observeAttendanceLayout(slider, () => {
            const day = expandedAttendanceCol !== -1 ? expandedAttendanceCol : (isCurrentMonth ? todayDay : null);
            if (day !== null) slideToBesideStudentCol(slider, day, false);
        });
    }
    window.renderClassroomAttendanceTab = renderClassroomAttendanceTab;
    window.findAttendanceClassroomRecord = findAttendanceClassroomRecord;
    window.getCurrentAttendanceStatuses = getCurrentAttendanceStatuses;
    window.getCurrentAttendanceExcuses = getCurrentAttendanceExcuses;
    window.saveCurrentAttendanceStatuses = saveCurrentAttendanceStatuses;

    window.navAttendanceMonth = function (dir) {
        attendanceViewingMonth += dir;
        if (attendanceViewingMonth > 11) {
            attendanceViewingMonth = 0;
            attendanceViewingYear++;
        } else if (attendanceViewingMonth < 0) {
            attendanceViewingMonth = 11;
            attendanceViewingYear--;
        }
        expandedAttendanceCol = -1;
        attendanceSelectedDay = -1;
        attendanceLastScrollLeft = -1;
        window.closeTeacherAttendanceCalendarPopup?.();
        renderClassroomAttendanceTab(true);
    };

    window.toggleAttendanceExpansion = function (day) {
        if (attendanceScrollAnimationId) {
            cancelAnimationFrame(attendanceScrollAnimationId);
            attendanceScrollAnimationId = null;
        }

        const now = new Date();
        const isCurrentMonth = (attendanceViewingMonth === now.getMonth() && attendanceViewingYear === now.getFullYear());
        const isToday = (day === now.getDate() && isCurrentMonth);

        let shouldSlide = false;
        attendanceSelectedDay = day;
        if (expandedAttendanceCol === day) {
            expandedAttendanceCol = -1;
            shouldSlide = false;
        } else {
            expandedAttendanceCol = day;
            shouldSlide = !isToday;
        }
        renderClassroomAttendanceTab(shouldSlide);
    };

    window.setAttendanceStatus = function (studentName, dateString, status, event, studentId = null) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        const statuses = getCurrentAttendanceStatuses(dateString);

        let existingStatus = '';
        if (studentId && statuses[studentId]) existingStatus = statuses[studentId];
        if (!existingStatus && statuses[studentName]) existingStatus = statuses[studentName];
        if (!existingStatus) {
            for (const k of Object.keys(statuses)) {
                if ((studentId && String(k) === String(studentId)) || studentNamesMatch(k, studentName)) {
                    existingStatus = statuses[k];
                    break;
                }
            }
        }

        const isClearing = (existingStatus === status);

        // Delete all matching keys for this student
        delete statuses[studentName];
        if (studentId) delete statuses[studentId];
        Object.keys(statuses).forEach(k => {
            if ((studentId && String(k) === String(studentId)) || studentNamesMatch(k, studentName)) {
                delete statuses[k];
            }
        });

        // Collect all name variants for this student so Teacher, Admin, and Student match directly
        const namesToAssign = new Set([studentName]);
        if (studentName.includes(',')) {
            const [last, firstMiddle] = studentName.split(',').map(s => s.trim());
            if (firstMiddle && last) namesToAssign.add(`${firstMiddle} ${last}`);
        } else {
            const tokens = studentName.trim().split(/\s+/);
            if (tokens.length >= 2) {
                const last = tokens[tokens.length - 1];
                const firstMiddle = tokens.slice(0, -1).join(' ');
                namesToAssign.add(`${last}, ${firstMiddle}`);
            }
        }

        try {
            const allUsers = getStoredJson('sigma-admin-users', getStoredJson('sigma-users-list', []));
            if (Array.isArray(allUsers)) {
                const u = allUsers.find(user => (studentId && (String(user.id) === String(studentId) || String(user.uid) === String(studentId))) || studentNamesMatch(user.fullName || `${user.lastName}, ${user.firstName}`, studentName));
                if (u) {
                    if (u.id) { if (isClearing) delete statuses[u.id]; else statuses[u.id] = status; }
                    if (u.uid) { if (isClearing) delete statuses[u.uid]; else statuses[u.uid] = status; }
                    if (u.fullName) namesToAssign.add(u.fullName);
                    if (u.name) namesToAssign.add(u.name);
                    if (u.lastName && u.firstName) {
                        namesToAssign.add(`${u.lastName}, ${u.firstName}${u.middleName ? ' ' + u.middleName : ''}`);
                        namesToAssign.add(`${u.firstName} ${u.middleName ? u.middleName + ' ' : ''}${u.lastName}`);
                    }
                }
            }
        } catch (_) {}

        if (!isClearing) {
            namesToAssign.forEach(n => { statuses[n] = status; });
            if (studentId) statuses[studentId] = status;
        } else {
            namesToAssign.forEach(n => { delete statuses[n]; });
            if (studentId) delete statuses[studentId];
        }

        const excuses = getCurrentAttendanceExcuses(dateString);
        if (isClearing || status !== 'A') {
            delete excuses[studentName];
            if (studentId) delete excuses[studentId];
            namesToAssign.forEach(n => { delete excuses[n]; });
            Object.keys(excuses).forEach(k => {
                if ((studentId && String(k) === String(studentId)) || studentNamesMatch(k, studentName)) {
                    delete excuses[k];
                }
            });
        }

        saveCurrentAttendanceStatuses(statuses, dateString, excuses);
        renderClassroomAttendanceTab(false);
    };

    window.toggleAttendanceStudentCol = function (event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        const table = document.querySelector('#detail-section-attendance .attendance-month-table, .attendance-month-table');
        const gridContainer = table ? table.closest('.attendance-grid-container') : null;
        const oldScrollLeft = gridContainer ? gridContainer.scrollLeft : (attendanceLastScrollLeft >= 0 ? attendanceLastScrollLeft : 0);
        const isMobile = window.innerWidth <= 768;
        const palWidth = isMobile ? Math.max(114, window.innerWidth - 220) : 192;

        isAttendanceStudentColExpanded = !isAttendanceStudentColExpanded;
        if (isAttendanceStudentColExpanded) {
            attendanceLastScrollLeft = oldScrollLeft + palWidth;
        } else {
            attendanceLastScrollLeft = Math.max(0, oldScrollLeft - palWidth);
        }
        renderClassroomAttendanceTab(false);
    };

    window.goToTodayAttendance = function () {
        if (attendanceScrollAnimationId) {
            cancelAnimationFrame(attendanceScrollAnimationId);
            attendanceScrollAnimationId = null;
        }
        const now = new Date();
        const isDifferentMonth = (attendanceViewingMonth !== now.getMonth() || attendanceViewingYear !== now.getFullYear());
        attendanceViewingMonth = now.getMonth();
        attendanceViewingYear = now.getFullYear();
        attendanceSelectedDay = now.getDate();
        expandedAttendanceCol = -1;
        if (isDifferentMonth) {
            attendanceLastScrollLeft = 0;
        }

        renderClassroomAttendanceTab(false);

        const container = document.getElementById('detail-section-attendance');
        const slider = container ? container.querySelector('.attendance-grid-container') : null;
        if (slider) {
            requestAnimationFrame(() => {
                slideToBesideStudentCol(slider, now.getDate(), true);
            });
        }
    };

    function renderTeacherAttendanceCalendarPopup() {
        const popup = document.getElementById('teacher-attendance-calendar-popup');
        if (!popup) return;

        if (!popup.dataset.clickBound) {
            popup.dataset.clickBound = 'true';
            popup.addEventListener('click', (e) => e.stopPropagation());
            popup.addEventListener('pointerdown', (e) => e.stopPropagation());
        }

        const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const todayNow = new Date();

        if (attendanceCalendarPopupMode === 'months') {
            let monthsHtml = '';
            shortMonths.forEach((m, idx) => {
                const isSelected = (attendancePickerYear === attendanceViewingYear && idx === attendanceViewingMonth);
                monthsHtml += `
                    <button type="button" class="cal-picker-month-btn ${isSelected ? 'active' : ''}" style="color: ${isSelected ? '#ffffff' : '#000000'} !important; font-weight: 600;" onclick="window.selectAttendancePopupMonth(${idx}, event)">
                        ${m}
                    </button>
                `;
            });

            popup.innerHTML = `
                <div class="cal-picker-header flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                    <button type="button" class="cal-picker-year-btn w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-black hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer" onclick="window.changeAttendancePickerYear(-1, event)" title="Previous Year">
                        <i class="fa-solid fa-chevron-left text-xs text-black"></i>
                    </button>
                    <span class="cal-picker-year-label text-[15px] font-bold text-black font-['Inter']">${attendancePickerYear}</span>
                    <button type="button" class="cal-picker-year-btn w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-black hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer" onclick="window.changeAttendancePickerYear(1, event)" title="Next Year">
                        <i class="fa-solid fa-chevron-right text-xs text-black"></i>
                    </button>
                </div>
                <div class="cal-picker-months-grid grid grid-cols-3 gap-2 mb-3">
                    ${monthsHtml}
                </div>
                <div class="cal-picker-footer flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs">
                    <button type="button" class="cal-picker-footer-today text-xs font-bold text-[#15803d] hover:bg-slate-100 active:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer" onclick="window.selectAttendancePopupThisMonth(event)">
                        This month
                    </button>
                    <button type="button" class="cal-picker-footer-mode text-xs font-bold text-[#15803d] hover:bg-slate-100 active:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer" onclick="window.switchAttendancePopupMode('days', event)">
                        Days view
                    </button>
                </div>
            `;
        } else {
            const year = attendancePopupViewingYear;
            const month = attendancePopupViewingMonth;
            const firstDayIndex = new Date(year, month, 1).getDay();
            const totalDays = new Date(year, month + 1, 0).getDate();

            let daysHtml = '';
            for (let i = 0; i < firstDayIndex; i++) {
                daysHtml += `<div class="calendar-day-cell calendar-day-cell--empty"></div>`;
            }

            for (let d = 1; d <= totalDays; d++) {
                const isToday = (todayNow.getFullYear() === year && todayNow.getMonth() === month && todayNow.getDate() === d);
                const isSelected = (attendanceViewingYear === year && attendanceViewingMonth === month && attendanceSelectedDay === d);

                let cellClasses = 'calendar-day-cell font-semibold transition-all';
                let styleExtra = '';

                if (isToday) {
                    cellClasses += ' calendar-day-cell--today font-bold cursor-pointer';
                    styleExtra = 'background-color: #FFD000 !important; color: #000000 !important; font-weight: 700 !important; border: none !important; box-shadow: none !important;';
                } else if (isSelected) {
                    cellClasses += ' calendar-day-cell--selected font-bold cursor-pointer';
                    styleExtra = 'background-color: #15803d !important; color: #ffffff !important; font-weight: 700 !important; border: none !important; box-shadow: none !important;';
                } else {
                    cellClasses += ' text-black cursor-pointer';
                    styleExtra = 'color: #000000 !important;';
                }

                daysHtml += `
                    <button type="button" class="${cellClasses}" style="${styleExtra}" onclick="window.selectAttendancePopupDay(${year}, ${month}, ${d}, event)">
                        ${d}
                    </button>
                `;
            }

            popup.innerHTML = `
                <div class="grid grid-cols-7 gap-1 text-center mb-1">
                    <div class="calendar-weekday-header">Sun</div>
                    <div class="calendar-weekday-header">Mon</div>
                    <div class="calendar-weekday-header">Tue</div>
                    <div class="calendar-weekday-header">Wed</div>
                    <div class="calendar-weekday-header">Thu</div>
                    <div class="calendar-weekday-header">Fri</div>
                    <div class="calendar-weekday-header">Sat</div>
                </div>
                <div class="grid grid-cols-7 gap-1 text-center mb-2">
                    ${daysHtml}
                </div>
                <div class="cal-picker-footer flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs">
                    <button type="button" class="cal-picker-footer-today text-xs font-bold text-[#15803d] hover:bg-slate-100 active:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer" onclick="window.selectAttendancePopupToday(event)">
                        Today
                    </button>
                    <button type="button" class="cal-picker-footer-mode text-xs font-bold text-[#15803d] hover:bg-slate-100 active:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer" onclick="window.switchAttendancePopupMode('months', event)">
                        Month & Year
                    </button>
                </div>
            `;
        }
    }

    window.toggleTeacherAttendanceCalendarPopup = function (event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        const popup = document.getElementById('teacher-attendance-calendar-popup');
        if (!popup) return;

        const isCurrentlyOpen = !popup.classList.contains('hidden');
        if (isCurrentlyOpen) {
            popup.classList.add('hidden');
            return;
        }

        attendancePopupViewingMonth = attendanceViewingMonth;
        attendancePopupViewingYear = attendanceViewingYear;
        attendancePickerYear = attendanceViewingYear;
        attendanceCalendarPopupMode = 'days';

        renderTeacherAttendanceCalendarPopup();
        popup.classList.remove('hidden');
    };

    window.closeTeacherAttendanceCalendarPopup = function (event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        const popup = document.getElementById('teacher-attendance-calendar-popup');
        if (popup) {
            popup.classList.add('hidden');
        }
    };

    window.switchAttendancePopupMode = function (mode, event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        attendanceCalendarPopupMode = mode;
        if (mode === 'months') {
            attendancePickerYear = attendancePopupViewingYear;
        }
        renderTeacherAttendanceCalendarPopup();
    };

    window.changeAttendancePickerYear = function (delta, event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        attendancePickerYear += delta;
        renderTeacherAttendanceCalendarPopup();
    };

    window.selectAttendancePopupMonth = function (monthIndex, event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        attendancePopupViewingMonth = monthIndex;
        attendancePopupViewingYear = attendancePickerYear;
        attendanceViewingMonth = monthIndex;
        attendanceViewingYear = attendancePickerYear;
        attendanceSelectedDay = -1;
        expandedAttendanceCol = -1;
        attendanceLastScrollLeft = -1;

        attendanceCalendarPopupMode = 'days';
        renderClassroomAttendanceTab(false);
        renderTeacherAttendanceCalendarPopup();
        const popup = document.getElementById('teacher-attendance-calendar-popup');
        if (popup) popup.classList.remove('hidden');
    };

    window.selectAttendancePopupDay = function (year, month, day, event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        const now = new Date();
        const isCurrentDateSelection = (
            now.getFullYear() === year &&
            now.getMonth() === month &&
            now.getDate() === day
        );
        const existingSlider = document.querySelector('#detail-section-attendance .attendance-grid-container');
        const previousScrollLeft = existingSlider ? existingSlider.scrollLeft : attendanceLastScrollLeft;

        attendanceViewingYear = year;
        attendanceViewingMonth = month;
        attendanceSelectedDay = day;
        expandedAttendanceCol = -1;
        attendanceLastScrollLeft = isCurrentDateSelection ? -1 : Math.max(0, previousScrollLeft || 0);

        window.closeTeacherAttendanceCalendarPopup();
        renderClassroomAttendanceTab(false);

        const container = document.getElementById('detail-section-attendance');
        const slider = container ? container.querySelector('.attendance-grid-container') : null;
        if (slider) {
            if (isCurrentDateSelection) {
                const doSlide = (smooth = true) => {
                    slideToBesideStudentCol(slider, day, smooth);
                };
                doSlide(false);
                requestAnimationFrame(() => {
                    doSlide(true);
                    setTimeout(() => doSlide(false), 50);
                });
            } else {
                requestAnimationFrame(() => {
                    slideAttendanceDayIntoView(slider, day, true);
                });
            }
        }
    };

    window.selectAttendancePopupToday = function (event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        const now = new Date();
        window.selectAttendancePopupDay(now.getFullYear(), now.getMonth(), now.getDate(), event);
    };

    window.selectAttendancePopupThisMonth = function (event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        const now = new Date();
        attendancePickerYear = now.getFullYear();
        attendancePopupViewingYear = now.getFullYear();
        attendancePopupViewingMonth = now.getMonth();
        attendanceViewingYear = now.getFullYear();
        attendanceViewingMonth = now.getMonth();
        attendanceSelectedDay = -1;
        expandedAttendanceCol = -1;
        attendanceLastScrollLeft = -1;

        attendanceCalendarPopupMode = 'days';
        renderClassroomAttendanceTab(false);
        renderTeacherAttendanceCalendarPopup();
        const popup = document.getElementById('teacher-attendance-calendar-popup');
        if (popup) popup.classList.remove('hidden');
    };

    // Outside click / dismissal for attendance calendar popup
    function handleAttendancePopupDismiss(e) {
        const popup = document.getElementById('teacher-attendance-calendar-popup');
        if (!popup || popup.classList.contains('hidden')) return;
        if (popup.contains(e.target)) return;

        const pickerBtn = document.querySelector('.teacher-attendance-month-picker-btn');
        if (pickerBtn && (pickerBtn === e.target || pickerBtn.contains(e.target))) return;

        if (e.target && (e.target.closest?.('#teacher-attendance-calendar-popup') ||
                         e.target.closest?.('.cal-picker-month-btn') ||
                         e.target.closest?.('.cal-picker-year-btn') ||
                         e.target.closest?.('.cal-picker-footer-today') ||
                         e.target.closest?.('.cal-picker-footer-mode') ||
                         e.target.closest?.('.calendar-day-cell'))) {
            return;
        }
        popup.classList.add('hidden');
    }
    window.addEventListener('pointerdown', handleAttendancePopupDismiss, true);
    window.addEventListener('click', handleAttendancePopupDismiss, true);

    // =========================================================================
    // ATTENDANCE EXCEL EXPORT (Multi-Sheet Workbook, Parity with Teacher Portal)
    // =========================================================================
    window.openAttendanceExportModal = function () {
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const currentMonthName = monthNames[attendanceViewingMonth];

        let modal = document.getElementById('attendance-export-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'attendance-export-modal';
            document.body.appendChild(modal);
        }

        modal.className = 'sigma-modal-overlay z-[12000] font-[\'Inter\']';
        modal.innerHTML = `
            <button type="button" onclick="window.closeAttendanceExportModal()"
                class="attendance-export-exit-btn fixed top-6 sm:top-10 right-6 sm:right-10 w-10 sm:w-12 h-10 sm:h-12 rounded-full hover:bg-slate-200 hidden sm:flex items-center justify-center text-black transition-all z-[12001] cursor-pointer"
                title="Exit">
                <i class="fa-solid fa-xmark text-lg sm:text-xl text-black"></i>
            </button>
            <div class="sigma-modal-shell animate-in slide-in-from-top-4 duration-500">
                <div class="sigma-modal-panel">
                    <div class="sigma-modal-header">
                        <div class="sigma-modal-header-top flex items-center gap-2">
                            <button type="button" class="attendance-export-mobile-return-btn w-8 h-8 rounded-full flex items-center justify-center text-black hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer border-0 p-0 shadow-none outline-none shrink-0 -ml-1 sm:hidden" onclick="window.closeAttendanceExportModal()" title="Return" aria-label="Return">
                                <i class="fa-solid fa-chevron-left text-sm text-black"></i>
                            </button>
                            <h1 class="sigma-modal-title">Export Attendance Sheet</h1>
                        </div>
                    </div>
                    <div class="sigma-modal-body">
                        <div class="max-w-3xl space-y-6">
                            <p class="text-base text-black font-semibold leading-relaxed font-['Inter']">Choose which attendance records you would like to export to Microsoft Excel (.xlsx):</p>
                            <div class="space-y-4">
                                <label class="export-scope-option active flex items-start gap-4 p-5 sm:p-6 rounded-2xl border-2 border-[#15803d] bg-emerald-50/60 cursor-pointer transition-all hover:bg-emerald-50/80" id="export-option-month-label">
                                    <input type="radio" name="attendance-export-scope" value="month" checked class="mt-1 w-5 h-5 text-[#15803d] focus:ring-[#15803d] accent-[#15803d] cursor-pointer shrink-0" onchange="window.updateAttendanceExportOptionUI()" />
                                    <div class="flex-1 min-w-0">
                                        <div class="flex items-center gap-2.5 flex-wrap">
                                            <span class="export-scope-title text-base font-bold text-black font-['Inter']">Current Month (${currentMonthName} ${attendanceViewingYear})</span>
                                            <span class="export-scope-badge px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-800">Days 1–31</span>
                                        </div>
                                        <p class="export-scope-desc text-sm text-black-fade mt-1.5 leading-relaxed font-['Inter'] font-normal">Exports full monthly register (Days 1–30/31) including non-school and empty day columns.</p>
                                    </div>
                                </label>
                                <label class="export-scope-option flex items-start gap-4 p-5 sm:p-6 rounded-2xl border border-slate-200 bg-white cursor-pointer transition-all hover:bg-slate-50" id="export-option-month-active-label">
                                    <input type="radio" name="attendance-export-scope" value="month-active" class="mt-1 w-5 h-5 text-[#15803d] focus:ring-[#15803d] accent-[#15803d] cursor-pointer shrink-0" onchange="window.updateAttendanceExportOptionUI()" />
                                    <div class="flex-1 min-w-0">
                                        <div class="flex items-center gap-2.5 flex-wrap">
                                            <span class="export-scope-title text-base font-bold text-black font-['Inter']">Current Month - Recorded Dates Only</span>
                                            <span class="export-scope-badge px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-800">No Blank Columns</span>
                                        </div>
                                        <p class="export-scope-desc text-sm text-black-fade mt-1.5 leading-relaxed font-['Inter'] font-normal">Exports only dates in ${currentMonthName} that have at least 1 student attendance entry. Completely blank day columns are omitted.</p>
                                    </div>
                                </label>
                                <label class="export-scope-option flex items-start gap-4 p-5 sm:p-6 rounded-2xl border border-slate-200 bg-white cursor-pointer transition-all hover:bg-slate-50" id="export-option-all-label">
                                    <input type="radio" name="attendance-export-scope" value="all" class="mt-1 w-5 h-5 text-[#15803d] focus:ring-[#15803d] accent-[#15803d] cursor-pointer shrink-0" onchange="window.updateAttendanceExportOptionUI()" />
                                    <div class="flex-1 min-w-0">
                                        <div class="flex items-center gap-2.5 flex-wrap">
                                            <span class="export-scope-title text-base font-bold text-black font-['Inter']">All Recorded Dates to Date</span>
                                            <span class="export-scope-badge px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-800">All Months • No Blanks</span>
                                        </div>
                                        <p class="export-scope-desc text-sm text-black-fade mt-1.5 leading-relaxed font-['Inter'] font-normal">Exports all recorded dates across all months that contain at least 1 student attendance entry. Completely blank day columns are excluded.</p>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>
                    <div class="sigma-modal-footer">
                        <button type="button" class="attendance-export-cancel-btn sigma-btn sigma-btn-ghost sigma-btn-md font-['Inter'] cursor-pointer" onclick="window.closeAttendanceExportModal()">
                            <span>Cancel</span>
                        </button>
                        <button type="button" class="attendance-export-download-btn sigma-btn sigma-btn-primary sigma-btn-md font-['Inter'] cursor-pointer" onclick="window.executeAttendanceExport()">
                            <span>Download Excel</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.documentElement.classList.add('has-modal-open');
    };

    window.updateAttendanceExportOptionUI = function () {
        const activeClass = 'export-scope-option active flex items-start gap-4 p-5 sm:p-6 rounded-2xl border-2 border-[#15803d] bg-emerald-50/60 cursor-pointer transition-all hover:bg-emerald-50/80';
        const inactiveClass = 'export-scope-option flex items-start gap-4 p-5 sm:p-6 rounded-2xl border border-slate-200 bg-white cursor-pointer transition-all hover:bg-slate-50';

        document.querySelectorAll('.export-scope-option').forEach(label => {
            const radio = label.querySelector('input[name="attendance-export-scope"]');
            if (radio && radio.checked) {
                label.className = activeClass;
            } else {
                label.className = inactiveClass;
            }
        });
    };

    window.closeAttendanceExportModal = function () {
        const modal = document.getElementById('attendance-export-modal');
        if (modal) modal.remove();
        document.documentElement.classList.remove('has-modal-open');
    };

    function buildAttendanceWorksheet(datesToExport, periodLabel, students, subjName, secName) {
        if (!datesToExport || datesToExport.length === 0) {
            return { ws: null, sheetData: [] };
        }

        const sheetData = [];
        sheetData.push(["INTERFACE COMPUTER COLLEGE"]);
        sheetData.push([`ATTENDANCE REGISTER - ${String(subjName || 'SUBJECT').toUpperCase()} (${secName || 'SECTION'})`]);
        sheetData.push([`Period: ${periodLabel} | School Year: 2026-2027`]);
        sheetData.push([]);

        const headerRow = ["No.", "Students", "Student ID"];
        datesToExport.forEach(d => headerRow.push(d.label));
        headerRow.push("Total Present", "Total Absent", "Total Late", "Total Excused");
        sheetData.push(headerRow);

        students.forEach((student, index) => {
            let displayName = formatStudentLastFirstMiddle(student) || student.name || student.fullName || '';

            let totalP = 0, totalA = 0, totalL = 0, totalE = 0;
            const studentRow = [index + 1, displayName, String(student.id || student.uid || '')];

            datesToExport.forEach(d => {
                const currentStatuses = getCurrentAttendanceStatuses(d.dateStr);
                let status = currentStatuses[student.name] ||
                    (student.id && currentStatuses[student.id]) ||
                    (student.uid && currentStatuses[student.uid]) ||
                    currentStatuses[displayName] || '';
                if (!status) {
                    for (const k of Object.keys(currentStatuses)) {
                        if ((student.id && String(k) === String(student.id)) || (student.uid && String(k) === String(student.uid)) || studentNamesMatch(k, displayName)) {
                            status = currentStatuses[k];
                            break;
                        }
                    }
                }

                if (status === 'P') totalP++;
                else if (status === 'A') totalA++;
                else if (status === 'L') totalL++;
                else if (status === 'E') totalE++;

                studentRow.push(status || '');
            });

            studentRow.push(totalP, totalA, totalL, totalE);
            sheetData.push(studentRow);
        });

        const totalsPresentRow = ["", "All Total Present", ""];
        const totalsAbsentRow = ["", "All Total Absent", ""];
        const totalsLateRow = ["", "All Total Late", ""];
        const totalsExcusedRow = ["", "All Total Excuse", ""];

        datesToExport.forEach(d => {
            const currentStatuses = getCurrentAttendanceStatuses(d.dateStr);
            let dayP = 0, dayA = 0, dayL = 0, dayE = 0;
            students.forEach(student => {
                let displayName = formatStudentLastFirstMiddle(student) || student.name || student.fullName || '';
                let status = currentStatuses[student.name] ||
                    (student.id && currentStatuses[student.id]) ||
                    (student.uid && currentStatuses[student.uid]) ||
                    currentStatuses[displayName] || '';
                if (!status) {
                    for (const k of Object.keys(currentStatuses)) {
                        if ((student.id && String(k) === String(student.id)) || (student.uid && String(k) === String(student.uid)) || studentNamesMatch(k, displayName)) {
                            status = currentStatuses[k];
                            break;
                        }
                    }
                }
                if (status === 'P') dayP++;
                else if (status === 'A') dayA++;
                else if (status === 'L') dayL++;
                else if (status === 'E') dayE++;
            });
            totalsPresentRow.push(dayP || '');
            totalsAbsentRow.push(dayA || '');
            totalsLateRow.push(dayL || '');
            totalsExcusedRow.push(dayE || '');
        });

        totalsPresentRow.push("", "", "", "");
        totalsAbsentRow.push("", "", "", "");
        totalsLateRow.push("", "", "", "");
        totalsExcusedRow.push("", "", "", "");

        sheetData.push([]);
        sheetData.push(totalsPresentRow);
        sheetData.push(totalsAbsentRow);
        sheetData.push(totalsLateRow);
        sheetData.push(totalsExcusedRow);

        if (typeof XLSX !== 'undefined') {
            const ws = XLSX.utils.aoa_to_sheet(sheetData);

            const colWidths = [{ wch: 6 }, { wch: 30 }, { wch: 14 }];
            datesToExport.forEach(() => colWidths.push({ wch: 8 }));
            colWidths.push({ wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 14 });
            ws['!cols'] = colWidths;

            const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
            const headerRowIdx = 4;
            const firstDataRowIdx = 5;
            const lastDataRowIdx = firstDataRowIdx + students.length - 1;
            const bottomTotalsStartRowIdx = lastDataRowIdx + 2;

            for (let R = range.s.r; R <= range.e.r; ++R) {
                for (let C = range.s.c; C <= range.e.c; ++C) {
                    const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
                    if (!ws[cellRef]) continue;

                    if (R < 3) {
                        ws[cellRef].s = {
                            font: { name: 'Calibri', sz: R === 0 ? 12 : (R === 1 ? 11 : 10), bold: R < 2 },
                            alignment: { horizontal: 'left', vertical: 'center' }
                        };
                    } else if (R === headerRowIdx) {
                        ws[cellRef].s = {
                            font: { name: 'Calibri', sz: 11, bold: true },
                            alignment: { horizontal: 'center', vertical: 'center' }
                        };
                    } else if (R >= firstDataRowIdx && R <= lastDataRowIdx) {
                        if (C === 1) {
                            ws[cellRef].s = {
                                font: { name: 'Calibri', sz: 11 },
                                alignment: { horizontal: 'left', vertical: 'center' }
                            };
                        } else {
                            ws[cellRef].s = {
                                font: { name: 'Calibri', sz: 11 },
                                alignment: { horizontal: 'center', vertical: 'center' }
                            };
                        }
                    } else if (R >= bottomTotalsStartRowIdx) {
                        if (C === 1) {
                            ws[cellRef].s = {
                                font: { name: 'Calibri', sz: 11, bold: true },
                                alignment: { horizontal: 'left', vertical: 'center' }
                            };
                        } else {
                            ws[cellRef].s = {
                                font: { name: 'Calibri', sz: 11, bold: true },
                                alignment: { horizontal: 'center', vertical: 'center' }
                            };
                        }
                    }
                }
            }

            return { ws, sheetData };
        }

        return { ws: null, sheetData };
    }

    window.executeAttendanceExport = function () {
        const scope = document.querySelector('input[name="attendance-export-scope"]:checked')?.value || 'month';
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const currentMonthName = monthNames[attendanceViewingMonth];
        const secName = getActiveRoomSectionName();
        const subjName = getActiveRoomSubjectName();

        const rawStudents = getAttendanceStudents(secName, subjName);
        const students = (Array.isArray(rawStudents) ? rawStudents.slice() : [])
            .sort((a, b) => String(a.name || a.fullName || '').localeCompare(String(b.name || b.fullName || '')));

        refreshAttendanceRecords();
        const { data: classroomData } = findAttendanceClassroomRecord(secName, subjName);

        function dateHasAnyStudentAttendance(dateStr) {
            const currentStatuses = getCurrentAttendanceStatuses(dateStr);
            if (!currentStatuses || typeof currentStatuses !== 'object') return false;
            const keys = Object.keys(currentStatuses);
            if (keys.length === 0) return false;

            for (let s = 0; s < students.length; s++) {
                const student = students[s];
                let displayName = student.name || student.fullName || '';
                let status = currentStatuses[student.name] ||
                    (student.id && currentStatuses[student.id]) ||
                    (student.uid && currentStatuses[student.uid]) ||
                    currentStatuses[displayName] || '';
                if (!status) {
                    for (const k of keys) {
                        if ((student.id && String(k) === String(student.id)) || (student.uid && String(k) === String(student.uid)) || studentNamesMatch(k, displayName)) {
                            status = currentStatuses[k];
                            break;
                        }
                    }
                }
                if (status && String(status).trim() !== '') return true;
            }

            for (const k of keys) {
                const val = currentStatuses[k];
                if (val && ['P', 'A', 'L', 'E'].includes(String(val).trim().toUpperCase())) {
                    return true;
                }
            }
            return false;
        }

        const sheetsToExport = [];

        if (scope === 'month') {
            const daysInMonth = new Date(attendanceViewingYear, attendanceViewingMonth + 1, 0).getDate();
            const datesToExport = [];
            for (let d = 1; d <= daysInMonth; d++) {
                const dateStr = `${attendanceViewingYear}-${String(attendanceViewingMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                datesToExport.push({
                    dateStr: dateStr,
                    label: `${String(attendanceViewingMonth + 1).padStart(2, '0')}/${String(d).padStart(2, '0')}`,
                    dayNum: d
                });
            }
            sheetsToExport.push({
                sheetName: currentMonthName,
                periodLabel: `${currentMonthName} ${attendanceViewingYear}`,
                datesToExport: datesToExport
            });
        } else if (scope === 'month-active') {
            const daysInMonth = new Date(attendanceViewingYear, attendanceViewingMonth + 1, 0).getDate();
            const datesToExport = [];
            for (let d = 1; d <= daysInMonth; d++) {
                const dateStr = `${attendanceViewingYear}-${String(attendanceViewingMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                if (dateHasAnyStudentAttendance(dateStr)) {
                    datesToExport.push({
                        dateStr: dateStr,
                        label: `${String(attendanceViewingMonth + 1).padStart(2, '0')}/${String(d).padStart(2, '0')}`,
                        dayNum: d
                    });
                }
            }

            if (datesToExport.length === 0) {
                if (typeof window.showToastNotification === 'function') {
                    window.showToastNotification(`No recorded attendance entries found for ${currentMonthName} ${attendanceViewingYear}.`, 'warning');
                } else {
                    alert(`No recorded attendance entries found for ${currentMonthName} ${attendanceViewingYear}.`);
                }
                window.closeAttendanceExportModal();
                return;
            }

            sheetsToExport.push({
                sheetName: currentMonthName,
                periodLabel: `${currentMonthName} ${attendanceViewingYear}`,
                datesToExport: datesToExport
            });
        } else {
            const allDateKeys = Object.keys(classroomData)
                .filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k) && dateHasAnyStudentAttendance(k))
                .sort();

            if (allDateKeys.length === 0) {
                if (typeof window.showToastNotification === 'function') {
                    window.showToastNotification('No recorded attendance entries found to export.', 'warning');
                } else {
                    alert('No recorded attendance entries found to export.');
                }
                window.closeAttendanceExportModal();
                return;
            }

            const uniqueMonths = [...new Set(allDateKeys.map(d => d.slice(0, 7)))].sort();
            uniqueMonths.forEach(ym => {
                const [yStr, mStr] = ym.split('-');
                const y = parseInt(yStr, 10);
                const m = parseInt(mStr, 10) - 1;
                const monthActiveDates = allDateKeys
                    .filter(d => d.startsWith(ym))
                    .map(dateStr => {
                        const parts = dateStr.split('-');
                        return {
                            dateStr: dateStr,
                            label: `${parts[1]}/${parts[2]}`,
                            dayNum: parseInt(parts[2], 10)
                        };
                    });

                if (monthActiveDates.length > 0) {
                    sheetsToExport.push({
                        sheetName: monthNames[m],
                        periodLabel: `${monthNames[m]} ${y}`,
                        datesToExport: monthActiveDates
                    });
                }
            });

            if (uniqueMonths.length > 1) {
                const allActiveDatesList = allDateKeys.map(dateStr => {
                    const parts = dateStr.split('-');
                    return {
                        dateStr: dateStr,
                        label: `${parts[1]}/${parts[2]}`,
                        dayNum: parseInt(parts[2], 10)
                    };
                });
                sheetsToExport.unshift({
                    sheetName: 'All Records',
                    periodLabel: `All Recorded Dates (${allDateKeys[0]} to ${allDateKeys[allDateKeys.length - 1]})`,
                    datesToExport: allActiveDatesList
                });
            }
        }

        const safeSubj = subjName.replace(/[^a-zA-Z0-9_-]/g, '_');
        const safeSec = secName.replace(/[^a-zA-Z0-9_-]/g, '_');
        let fileScopeTag = `${currentMonthName}_${attendanceViewingYear}`;
        if (scope === 'month-active') {
            fileScopeTag = `${currentMonthName}_${attendanceViewingYear}_Active_Dates`;
        } else if (scope === 'all' || scope === 'all-active') {
            fileScopeTag = 'All_Recorded_Dates';
        }
        const fileName = `Attendance_${safeSubj}_${safeSec}_${fileScopeTag}.xlsx`;

        if (typeof XLSX !== 'undefined') {
            const wb = XLSX.utils.book_new();
            const usedSheetNames = new Set();

            sheetsToExport.forEach(item => {
                let sheetName = item.sheetName;
                if (usedSheetNames.has(sheetName)) {
                    sheetName = `${item.sheetName}_${item.periodLabel.slice(-4)}`;
                }
                if (usedSheetNames.has(sheetName)) {
                    sheetName = `${sheetName}_1`;
                }
                sheetName = sheetName.replace(/[:\\/?*\[\]]/g, '').substring(0, 31);
                usedSheetNames.add(sheetName);

                const { ws } = buildAttendanceWorksheet(item.datesToExport, item.periodLabel, students, subjName, secName);
                if (ws) {
                    XLSX.utils.book_append_sheet(wb, ws, sheetName);
                }
            });

            XLSX.writeFile(wb, fileName);
        } else {
            const firstSheet = sheetsToExport[0];
            const { sheetData } = buildAttendanceWorksheet(firstSheet.datesToExport, firstSheet.periodLabel, students, subjName, secName);
            const csvContent = sheetData.map(row => row.map(val => `"${String(val || '').replace(/"/g, '""')}"`).join(',')).join('\n');
            const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.setAttribute('download', fileName.replace(/\.xlsx$/, '.csv'));
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        window.closeAttendanceExportModal();
        if (typeof window.showToastNotification === 'function') {
            window.showToastNotification('Attendance exported to Excel successfully!', 'success');
        }
    };

    // =========================================================================
    // UNIFIED REAL PENDING SUBMISSIONS HELPER
    // =========================================================================
    window.getRealTeacherPendingSubmissions = function () {
        const realSubmissions = [];
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (!key || (!key.startsWith('sigma_sub_') && !key.startsWith('sigma_submission_'))) continue;

                try {
                    const raw = localStorage.getItem(key);
                    const sub = raw ? JSON.parse(raw) : null;
                    if (!sub || typeof sub !== 'object') continue;

                    const isSubmitted = sub.status === 'Submitted' || sub.status === 'Pending' || sub.status === 'waiting' || Boolean(sub.submittedAt);
                    const isGraded = sub.status === 'Graded' || (sub.score !== null && sub.score !== undefined && sub.score !== '' && sub.score !== '--');
                    if (!isSubmitted || isGraded) continue;

                    let sId = sub.subjectId || '';
                    let topicIdx = sub.topicIdx !== undefined ? Number(sub.topicIdx) : 0;
                    let tab = sub.tab || 'assignments';
                    let itemIdx = sub.activeIdx !== undefined ? Number(sub.activeIdx) : (sub.itemIdx !== undefined ? Number(sub.itemIdx) : 0);

                    if (!sId || sub.topicIdx === undefined) {
                        const cleanKey = key.replace(/^(sigma_sub_|sigma_submission_)/, '');
                        const topMatMatch = cleanKey.match(/^(.+?)_top_(\d+)_mat_(.+)$/);
                        const topTabMatch = cleanKey.match(/^(.+?)_top_(\d+)_(assignments|quiz|quizzes|activity|activities|performance|performanceTasks)_(\d+)$/i);
                        const simpleMatch = cleanKey.match(/^(.+?)_(assignments|quiz|quizzes|activity|activities|performance|performanceTasks)_(\d+)$/i);

                        if (topMatMatch) {
                            if (!sId) sId = topMatMatch[1];
                            topicIdx = Number(topMatMatch[2]);
                        } else if (topTabMatch) {
                            if (!sId) sId = topTabMatch[1];
                            topicIdx = Number(topTabMatch[2]);
                            tab = topTabMatch[3];
                            itemIdx = Number(topTabMatch[4]);
                        } else if (simpleMatch) {
                            if (!sId) sId = simpleMatch[1];
                            topicIdx = 0;
                            tab = simpleMatch[2];
                            itemIdx = Number(simpleMatch[3]);
                        }
                    }

                    const tabLower = String(tab).toLowerCase();
                    let normTab = 'assignments';
                    if (tabLower.includes('quiz')) normTab = 'quiz';
                    else if (tabLower.includes('activity')) normTab = 'activity';
                    else if (tabLower.includes('performance') || tabLower.includes('task')) normTab = 'performance';

                    realSubmissions.push({
                        ...sub,
                        key,
                        subjectId: sId,
                        topicIdx,
                        tab: normTab,
                        itemIdx,
                        section: sub.section || sub.sectionName || '',
                        subject: sub.subject || sub.subjectName || '',
                        activity: sub.activity || sub.title || sub.taskName || `Task ${itemIdx + 1}`,
                        student: sub.student || sub.studentName || sub.userName || 'Student',
                        status: 'waiting',
                        submittedAt: sub.submittedAt || 'Recently'
                    });
                } catch (e) {}
            }
        } catch (e) {}
        return realSubmissions;
    };

    let attendanceResizeTimer = null;
    window.addEventListener('resize', () => {
        if (document.getElementById('teacher-header')) return;
        clearTimeout(attendanceResizeTimer);
        attendanceResizeTimer = setTimeout(() => requestAnimationFrame(() => {
            updateAttendanceMobileSummaryWidth();
            const container = document.getElementById('detail-section-attendance');
            const slider = container ? container.querySelector('.attendance-grid-container') : null;
            if (!slider || !slider.getClientRects().length) return;
            const now = new Date();
            const currentMonth = attendanceViewingMonth === now.getMonth() && attendanceViewingYear === now.getFullYear();
            const day = expandedAttendanceCol !== -1 ? expandedAttendanceCol : (currentMonth ? now.getDate() : null);
            if (day !== null) {
                slideToBesideStudentCol(slider, day, false);
            }
        }), 120);
    });

    window.addEventListener('storage', (e) => {
        if (!e || !e.key) return;
        if (e.key === SHARED_ATTENDANCE_RECORDS_KEY) {
            refreshAttendanceRecords();
            const container = document.getElementById('detail-section-attendance');
            if (container && !container.classList.contains('hidden')) {
                renderClassroomAttendanceTab(false);
            }
        }
    });

    window.addEventListener('sigma:attendance-changed', () => {
        refreshAttendanceRecords();
        const container = document.getElementById('detail-section-attendance');
        if (container && !container.classList.contains('hidden')) {
            renderClassroomAttendanceTab(false);
        }
    });

})(typeof window !== "undefined" ? window : this);
