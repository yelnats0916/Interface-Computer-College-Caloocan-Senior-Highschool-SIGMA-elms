/**
 * SIGMA ELMS - Shared Assessments Page Component
 * Unified assessments rendering, sorting, pagination, and sidebar panels for both Student and Teacher portals.
 */

(function () {
    'use strict';

    let activeFilterSubject = null;
    let activeFilterSection = null;
    let activeFilterStudent = null;
    let currentAssessmentPage = 1;
    const PAGE_SIZE = 10;

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function parseAssessmentDateTime(rawVal, fallbackTime = '') {
        if (!rawVal || rawVal === '-' || rawVal === 'none' || rawVal === 'no-deadline' || rawVal === 'null' || rawVal === 'undefined') return null;

        let dateStr = '';
        let timeStr = '';

        if (rawVal instanceof Date) {
            if (isNaN(rawVal.getTime())) return null;
            dateStr = rawVal.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const h = rawVal.getHours();
            const m = rawVal.getMinutes();
            if (h !== 0 || m !== 0) {
                const period = h >= 12 ? 'PM' : 'AM';
                const displayH = h > 12 ? h - 12 : (h === 0 ? 12 : h);
                timeStr = `${displayH}:${String(m).padStart(2, '0')} ${period}`;
            } else if (fallbackTime && fallbackTime !== '--:-- --') {
                timeStr = fallbackTime;
            }
        } else if (typeof rawVal === 'string') {
            const valStr = rawVal.trim();
            if (!valStr || valStr === '-' || valStr === 'none' || valStr === 'no-deadline') return null;

            // Check format like: "Sep 15, 2026, 5:37 PM" or "September 15, 2026 at 11:59:00 PM"
            const commaTimeMatch = valStr.match(/^([A-Za-z]{3,9}\s+\d{1,2}(?:,\s*\d{4})?)(?:(?:,\s*|\s+at\s+)(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)))?$/i);
            if (commaTimeMatch) {
                const dPart = commaTimeMatch[1].replace(/,\s*\d{4}$/, '').trim();
                const parts = dPart.split(/\s+/);
                dateStr = (parts[0] ? parts[0].slice(0, 3) : '') + (parts[1] ? ' ' + parts[1] : '');
                if (commaTimeMatch[2]) {
                    timeStr = commaTimeMatch[2].toUpperCase().trim().replace(/:00\s*(AM|PM)/i, ' $1');
                } else if (fallbackTime && fallbackTime !== '--:-- --') {
                    timeStr = fallbackTime;
                }
            } else if (valStr.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(valStr) || (valStr.includes('T') && valStr.includes('Z'))) {
                // ISO timestamp with timezone / UTC (e.g. submittedAt) - parse to user's local timezone
                const dObj = new Date(valStr);
                if (!isNaN(dObj.getTime())) {
                    dateStr = dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    const h = dObj.getHours();
                    const m = dObj.getMinutes();
                    const period = h >= 12 ? 'PM' : 'AM';
                    const displayH = h > 12 ? h - 12 : (h === 0 ? 12 : h);
                    timeStr = `${displayH}:${String(m).padStart(2, '0')} ${period}`;
                }
            } else if (valStr.includes('T')) {
                const [dPart, tPart] = valStr.split('T');
                const [y, m, d] = dPart.split('-');
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                dateStr = `${months[parseInt(m, 10) - 1] || m} ${parseInt(d, 10)}`;
                if (tPart && tPart !== '00:00' && tPart !== '00:00:00') {
                    const [hPart, mPart] = tPart.split(':');
                    let displayH = parseInt(hPart, 10) || 0;
                    const displayM = parseInt(mPart, 10) || 0;
                    const period = displayH >= 12 ? 'PM' : 'AM';
                    if (displayH > 12) displayH -= 12;
                    if (displayH === 0) displayH = 12;
                    timeStr = `${displayH}:${String(displayM).padStart(2, '0')} ${period}`;
                } else if (fallbackTime && fallbackTime !== '--:-- --') {
                    timeStr = fallbackTime;
                }
            } else if (valStr.includes('-') && valStr.includes(':')) {
                // ISO or timestamp format
                const dObj = new Date(valStr);
                if (!isNaN(dObj.getTime())) {
                    dateStr = dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    const h = dObj.getHours();
                    const m = dObj.getMinutes();
                    const period = h >= 12 ? 'PM' : 'AM';
                    const displayH = h > 12 ? h - 12 : (h === 0 ? 12 : h);
                    timeStr = `${displayH}:${String(m).padStart(2, '0')} ${period}`;
                }
            } else if (/^\d{4}-\d{2}-\d{2}$/.test(valStr)) {
                const [y, m, d] = valStr.split('-');
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                dateStr = `${months[parseInt(m, 10) - 1] || m} ${parseInt(d, 10)}`;
                if (fallbackTime && fallbackTime !== '--:-- --') {
                    timeStr = fallbackTime;
                }
            } else {
                const dObj = new Date(valStr);
                if (!isNaN(dObj.getTime()) && !/^\d+$/.test(valStr)) {
                    dateStr = dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    const h = dObj.getHours();
                    const m = dObj.getMinutes();
                    if (h !== 0 || m !== 0) {
                        const period = h >= 12 ? 'PM' : 'AM';
                        const displayH = h > 12 ? h - 12 : (h === 0 ? 12 : h);
                        timeStr = `${displayH}:${String(m).padStart(2, '0')} ${period}`;
                    } else if (fallbackTime && fallbackTime !== '--:-- --') {
                        timeStr = fallbackTime;
                    }
                } else {
                    dateStr = valStr;
                    if (fallbackTime && fallbackTime !== '--:-- --') {
                        timeStr = fallbackTime;
                    }
                }
            }
        }

        if (!dateStr) return null;
        return { dateStr, timeStr };
    }

    function formatAssessmentDate(date, fallbackTime = '') {
        const parsed = parseAssessmentDateTime(date, fallbackTime);
        if (!parsed) return '<span class="text-black-fade font-normal text-[13px] select-none font-[\'Inter\']" style="color: rgba(0, 0, 0, 0.4) !important;">-</span>';

        if (parsed.timeStr) {
            return `
                <div class="flex flex-col items-center justify-center font-['Inter'] leading-tight py-0.5">
                    <span class="text-[13px] font-normal text-black" style="color: #000000 !important;">${escapeHtml(parsed.dateStr)}</span>
                    <span class="text-[10.5px] font-normal text-black-fade mt-0.5 leading-none" style="color: rgba(0, 0, 0, 0.45) !important;">${escapeHtml(parsed.timeStr)}</span>
                </div>
            `;
        }

        return `<div class="text-[13px] font-normal text-black text-center font-['Inter']" style="color: #000000 !important;">${escapeHtml(parsed.dateStr)}</div>`;
    }

    function formatAssessmentTextDate(date) {
        if (!date) return '';
        const d = (date instanceof Date) ? date : new Date(date);
        if (isNaN(d.getTime())) return String(date);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    function getStatusBadge(status) {
        if (status === 'excuse' || status === 'excused') {
            return '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">Excuse</span>';
        }
        if (status === 'missing') {
            return '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-50 text-red-700 border border-red-200">Missing</span>';
        }
        if (status === 'absent') {
            return '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-50 text-red-700 border border-red-200">Absent</span>';
        }
        if (status === 'incomplete') {
            return '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">Incomplete</span>';
        }
        if (status === 'graded') {
            return '<i title="Graded" class="fa-solid fa-circle-check text-[17px] cursor-default inline-block" style="color: #15803d !important;" aria-label="Graded"></i>';
        }
        if (status === 'submitted') {
            return '<i title="Submitted" class="fa-solid fa-file-circle-check text-[17px] cursor-default inline-block" style="color: #15803d !important;" aria-label="Submitted"></i>';
        }
        if (status === 'pending' || status === 'waiting') {
            return '<i title="Pending" class="fa-regular fa-clock text-[17px] cursor-default inline-block" style="color: #15803d !important;" aria-label="Pending"></i>';
        }
        if (status === 'overdue') {
            return '<i title="Overdue" class="fa-solid fa-circle-exclamation text-[17px] cursor-default inline-block" style="color: #15803d !important;" aria-label="Overdue"></i>';
        }
        return '<span class="text-black-fade font-normal text-[13px] select-none font-[\'Inter\']" style="color: rgba(0, 0, 0, 0.4) !important;">-</span>';
    }

    function resolveSubjectTopicId(cardId, subjectName) {
        if (typeof window.resolveStudentTopicSubjectId === 'function') {
            const resolved = window.resolveStudentTopicSubjectId(cardId, subjectName);
            if (resolved) return resolved;
        }
        const cleanSubject = String(subjectName || '').trim().toLowerCase();
        const cleanId = String(cardId || '').trim().toLowerCase();
        const aliases = {
            'card-prog1': 'card-prog1',
            'card prog1': 'card-prog1',
            'prog1': 'card-prog1',
            'prog-1': 'card-prog1',
            'prog 1': 'card-prog1',
            'card-webdev': 'card-webdev',
            'card webdev': 'card-webdev',
            'webdev': 'card-webdev',
            'card-database': 'card-database',
            'card database': 'card-database',
            'database': 'card-database',
            'card-stats': 'card-stats',
            'card stats': 'card-stats',
            'stats': 'card-stats',
            'card-empowerment': 'card-empowerment',
            'card empowerment': 'card-empowerment',
            'card-emptech': 'card-empowerment',
            'card-blank-1': 'card-empowerment',
            'card-genmath': 'card-genmath',
            'card genmath': 'card-genmath',
            'genmath': 'card-genmath',
            'card-blank-2': 'card-genmath',
            'card-oralcomm': 'card-oralcomm',
            'card oralcomm': 'card-oralcomm',
            'oralcomm': 'card-oralcomm',
            'card-blank-3': 'card-oralcomm',
            'card-earthsci': 'card-earthsci',
            'card earthsci': 'card-earthsci',
            'earthsci': 'card-earthsci',
            'card-blank-4': 'card-earthsci'
        };
        if (aliases[cardId]) return aliases[cardId];
        if (aliases[cleanId]) return aliases[cleanId];
        if (cleanSubject.includes('programming') || cleanSubject.includes('prog1') || cleanSubject.includes('prog 1')) return 'card-prog1';
        if (cleanSubject.includes('web dev')) return 'card-webdev';
        if (cleanSubject.includes('database')) return 'card-database';
        if (cleanSubject.includes('empowerment')) return 'card-empowerment';
        if (cleanSubject.includes('statistic') || cleanSubject.includes('probab')) return 'card-stats';
        if (cleanSubject.includes('genmath') || (cleanSubject.includes('general') && cleanSubject.includes('math'))) return 'card-genmath';
        if (cleanSubject.includes('oral') || cleanSubject.includes('communicat')) return 'card-oralcomm';
        if (cleanSubject.includes('earth') || cleanSubject.includes('life') || cleanSubject.includes('science')) return 'card-earthsci';
        if (cleanSubject.includes('fabm') || cleanSubject.includes('accountancy') || cleanSubject.includes('fundamentals of abm')) return 'abm-fabm1';
        if (cleanSubject.includes('business math')) return 'abm-busmath';
        if (cleanSubject.includes('creative writing')) return 'humss-creative-writing';
        if (cleanSubject.includes('politics') || cleanSubject.includes('governance')) return 'humss-politics';
        if (cleanSubject.includes('applied econ') || cleanSubject.includes('economics')) return 'gas-economics';
        if (cleanSubject.includes('disaster') || cleanSubject.includes('drrr')) return 'gas-drrr';
        if (cleanSubject.includes('cookery')) return 'he-cookery';
        if (cleanSubject.includes('bread') || cleanSubject.includes('pastry')) return 'he-bread-pastry';
        if (cleanSubject.includes('eapp') || cleanSubject.includes('academic and professional')) return 'applied-eapp';
        if (cleanSubject.includes('research')) return 'applied-research1';
        if (cleanSubject.includes('entrepreneur')) return 'applied-entrepreneurship';
        return cardId || 'card-prog1';
    }
    window.resolveSubjectTopicId = resolveSubjectTopicId;

    function getConnectedSectionsList(role) {
        if (role === 'teacher') {
            if (typeof window.getTeacherSectionCards === 'function') {
                const teacherCards = window.getTeacherSectionCards(true);
                if (Array.isArray(teacherCards) && teacherCards.length > 0) {
                    return teacherCards.map(c => ({
                        id: c.id || `card-${c.subject || c.name}`,
                        subject: c.subject || c.name,
                        name: c.subject || c.name,
                        section: c.sectionName || c.section || 'Grade 11 - ICT A'
                    }));
                }
            }
            if (typeof window.getAllSubjectsRaw === 'function') {
                const subjects = window.getAllSubjectsRaw(true);
                if (Array.isArray(subjects) && subjects.length > 0) {
                    return subjects.map(s => ({
                        id: s.id || `card-${s.name || s.subject}`,
                        subject: s.name || s.subject,
                        name: s.name || s.subject,
                        section: s.section || (Array.isArray(s.sections) ? s.sections[0] : '') || 'Grade 11 - ICT A'
                    }));
                }
            }
            try {
                const currentTeacher = (typeof getLoggedInTeacherUser === 'function' ? getLoggedInTeacherUser() : null) || (typeof getLoggedInUser === 'function' ? getLoggedInUser() : null);
                const currentTeacherId = currentTeacher ? String(currentTeacher.id || currentTeacher.uid || currentTeacher.username || '') : '';
                const currentTeacherName = currentTeacher ? String(currentTeacher.name || `${currentTeacher.firstName || ''} ${currentTeacher.lastName || ''}`).trim().toLowerCase() : '';
                
                const adminSections = JSON.parse(localStorage.getItem('sigma-admin-sections') || localStorage.getItem('sigma-admin-sections-v1') || '[]');
                if (Array.isArray(adminSections) && adminSections.length > 0) {
                    let valid = adminSections.filter(s => s && s.status !== 'Draft');
                    if (currentTeacherId || currentTeacherName) {
                        const byTeacher = valid.filter(sec => {
                            const tName = String(sec.teacher || sec.instructor || sec.adviser || '').trim().toLowerCase();
                            const tId = String(sec.teacherId || sec.instructorId || '').trim();
                            return (tId && tId === currentTeacherId) || (tName && currentTeacherName && (tName === currentTeacherName || currentTeacherName.includes(tName) || tName.includes(currentTeacherName)));
                        });
                        if (byTeacher.length > 0) valid = byTeacher;
                    }
                    if (valid.length > 0) {
                        return valid.map(sec => ({
                            id: sec.id || `card-${sec.subject || sec.name}`,
                            subject: sec.subject || sec.name,
                            name: sec.subject || sec.name,
                            section: sec.name || sec.section || 'Grade 11 - ICT A'
                        }));
                    }
                }
            } catch (e) {}

            if (window.subjectsData) {
                const sData = window.subjectsData;
                const allTeacherSubjs = [
                    ...(Array.isArray(sData.core) ? sData.core : []),
                    ...(Array.isArray(sData.academic) ? sData.academic : []),
                    ...(Array.isArray(sData.techpro) ? sData.techpro : [])
                ];
                if (allTeacherSubjs.length > 0) {
                    return allTeacherSubjs.map(s => ({
                        id: s.id || s.name || s.subject,
                        subject: s.name || s.subject,
                        name: s.name || s.subject,
                        section: s.section || 'Grade 11 - ICT A'
                    }));
                }
            }
        }

        if (role !== 'teacher') {
            if (typeof window.getStudentSectionClassItems === 'function') {
                const enrolledItems = window.getStudentSectionClassItems();
                if (Array.isArray(enrolledItems) && enrolledItems.length > 0) {
                    return enrolledItems.map(c => ({
                        id: c.id || `card-${c.subject || c.name}`,
                        subject: c.subject || c.name,
                        name: c.subject || c.name,
                        section: c.section || 'Grade 11 - ICT A'
                    }));
                }
            }
            try {
                const storedClasses = localStorage.getItem('sigma_student_enrolled_classes');
                if (storedClasses) {
                    const parsed = JSON.parse(storedClasses);
                    const list = Array.isArray(parsed) ? parsed : Object.values(parsed);
                    if (list.length > 0) {
                        return list.map(c => ({
                            id: c.id || `card-${c.subject || c.name}`,
                            subject: c.subject || c.name,
                            name: c.subject || c.name,
                            section: c.section || 'Grade 11 - ICT A'
                        }));
                    }
                }
            } catch (e) {}
        }

        if (window.SectionsPanel && typeof window.SectionsPanel.getCards === 'function') {
            const cards = window.SectionsPanel.getCards();
            if (Array.isArray(cards) && cards.length > 0) return cards;
        }
        if (window.ClassroomRoom && window.ClassroomRoom.SectionsPanel && typeof window.ClassroomRoom.SectionsPanel.getCards === 'function') {
            const cards = window.ClassroomRoom.SectionsPanel.getCards();
            if (Array.isArray(cards) && cards.length > 0) return cards;
        }

        const sData = (typeof subjectsData !== 'undefined' ? subjectsData : window.subjectsData) || {};
        const enrolled = Array.isArray(sData.enrolled) ? sData.enrolled : [];
        if (enrolled.length > 0) return enrolled;

        // Default standard subjects fallback
        return [
            { id: 'card-prog1', subject: 'Computer Programming 1', name: 'Computer Programming 1', section: 'Grade 11 - ICT A' },
            { id: 'card-webdev', subject: 'Web Development 1', name: 'Web Development 1', section: 'Grade 11 - ICT A' },
            { id: 'card-database', subject: 'Database Management', name: 'Database Management', section: 'Grade 11 - ICT A' },
            { id: 'card-genmath', subject: 'General Mathematics', name: 'General Mathematics', section: 'Grade 11 - STEM A' }
        ];
    }

    function isFakeAssessment(item) {
        if (!item) return true;
        if (item.isFake === true || item.isSample === true) return true;
        const id = String(item.id || '').trim().toLowerCase();
        const authorId = String(item.authorId || item.uid || '').trim().toLowerCase();
        const authorName = String(item.authorName || item.author || '').trim().toLowerCase();
        if (id.includes('sample_01') || authorId === 'teacher_sample_01' || authorName.includes('johnathan smith')) return true;

        if (id.startsWith('mat-') || id.startsWith('subj-') || item.fileUrl || item.fileName || item.quizId || item.selectedQuizId || item.authorRole || item.authorId || item.authorName) {
            return false;
        }

        const title = String(item.title || item.name || '').trim();
        if (!title) return true;
        if (title.startsWith('"') || title.startsWith("'")) return true;
        const lower = title.toLowerCase();
        if (lower.includes('sample assessment') ||
            lower.includes('mock assessment') ||
            lower.includes('fake assessment') ||
            lower.includes('dummy')) {
            return true;
        }
        return false;
    }

    function getAssessmentsForSubject(subjectId, category, fallbackTitle, sectionName) {
        const tabMap = {
            'assignment': 'assignments',
            'quiz': 'quiz',
            'activity': 'activity',
            'perf. task': 'performance',
            'qa': 'assessments'
        };
        const targetTab = tabMap[category] || category;

        const isMatchingType = (matType, matCategory, matTitle) => {
            const t = String(matType || '').trim().toLowerCase();
            const c = String(matCategory || '').trim().toLowerCase();
            const title = String(matTitle || '').trim().toLowerCase();
            if (category === 'assignment' || category === 'task') {
                const blob = `${t} ${c}`;
                if (/(quiz|activ|perf)/.test(blob)) return false;
                return t === 'assignment' || t === 'assignments' || t === 'task' || t === 'tasks' || c === 'assignment' || c === 'assignments' || c === 'task' || c === 'tasks' || title.startsWith('assignment') || title.startsWith('task');
            }
            if (category === 'quiz') {
                return t === 'quiz' || t === 'quizzes' || c === 'quiz' || c === 'quizzes' || title.startsWith('quiz');
            }
            if (category === 'activity') {
                return t === 'activity' || t === 'activities' || c === 'activity' || c === 'activities' || title.startsWith('activity');
            }
            if (category === 'perf. task' || category === 'pt') {
                return t === 'performance task' || t === 'performance tasks' || t === 'perf. task' || t === 'performance' || c === 'performance task' || c === 'perf. task' || c === 'performance' || title.startsWith('perf') || title.startsWith('performance task');
            }
            if (category === 'qa') {
                return t === 'qa' || t === 'quarterly assessment' || t === 'exam' || t === 'quarterly exam' || c === 'qa' || c === 'exam';
            }
            return false;
        };

        const realAssessments = [];
        const seenTitles = new Set();

        const getTopicDataFn = window.getTopicData || (typeof getTopicData === 'function' ? getTopicData : null);
        let data = getTopicDataFn ? getTopicDataFn(subjectId) : null;
        if (!data && fallbackTitle) {
            const resolvedId = resolveSubjectTopicId(subjectId, fallbackTitle);
            if (resolvedId && resolvedId !== subjectId) {
                data = getTopicDataFn ? getTopicDataFn(resolvedId) : null;
            }
        }

        // 1. Unified assessments from topics (do NOT combine with legacy data.topics if quarter topics exist)
        if (data) {
            const hasQuarterTopics = (Array.isArray(data.q1Topics) && data.q1Topics.length > 0) ||
                                     (Array.isArray(data.q2Topics) && data.q2Topics.length > 0) ||
                                     (Array.isArray(data.q3Topics) && data.q3Topics.length > 0) ||
                                     (Array.isArray(data.q4Topics) && data.q4Topics.length > 0);

            const topicArrays = hasQuarterTopics ? [
                ...(Array.isArray(data.q1Topics) ? data.q1Topics : []),
                ...(Array.isArray(data.q2Topics) ? data.q2Topics : []),
                ...(Array.isArray(data.q3Topics) ? data.q3Topics : []),
                ...(Array.isArray(data.q4Topics) ? data.q4Topics : [])
            ] : (Array.isArray(data.topics) ? data.topics : []);

            topicArrays.forEach((topic, tIdx) => {
                // If topic is scoped to a section, ensure it matches
                if (sectionName && topic && topic.section) {
                    const cleanSec = String(sectionName).trim().toLowerCase();
                    const topSec = String(topic.section).trim().toLowerCase();
                    if (topSec && cleanSec && topSec !== cleanSec && !cleanSec.includes(topSec) && !topSec.includes(cleanSec)) {
                        return;
                    }
                }

                let defaultList = topic[targetTab] || topic[category] || 
                    (category === 'quiz' ? (topic.quiz || topic.quizzes) : null) ||
                    (category === 'assignment' || category === 'task' ? (topic.assignments || topic.assignment || topic.tasks || topic.task) : null) ||
                    (category === 'activity' ? (topic.activity || topic.activities) : null) ||
                    (category === 'perf. task' ? (topic.performance || topic['perf. task'] || topic.performanceTask) : null) ||
                    [];

                if ((!defaultList || defaultList.length === 0) && Array.isArray(topic.assessments)) {
                    defaultList = topic.assessments.filter(it => isMatchingType(it.type, it.category, it.title));
                }

                const topicAssessments = (typeof window.getUnifiedTopicAssessments === 'function')
                    ? window.getUnifiedTopicAssessments(targetTab, subjectId, tIdx, defaultList, sectionName)
                    : (Array.isArray(defaultList) ? defaultList : []);

                if (Array.isArray(topicAssessments)) {
                    topicAssessments.forEach((ass, aIdx) => {
                        if (isFakeAssessment(ass)) return;
                        const rawType = String(ass.type || '').trim().toLowerCase();
                        const rawCategory = String(ass.category || ass.materialType || '').trim().toLowerCase();
                        const fileTypes = new Set(['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'csv', 'txt']);
                        const typeText = (fileTypes.has(rawType) ? rawCategory : (rawType || rawCategory));
                        let keepForCategory = false;
                        if (typeText) {
                            if (category === 'quiz') keepForCategory = typeText.includes('quiz');
                            else if (category === 'activity') keepForCategory = typeText.includes('activ');
                            else if (category === 'perf. task' || category === 'pt') keepForCategory = typeText.includes('perf') || typeText === 'pt';
                            else if (category === 'qa') keepForCategory = typeText.includes('exam') || typeText === 'qa' || typeText.includes('quarterly');
                            else keepForCategory = !typeText.includes('quiz') && !typeText.includes('activ') && !typeText.includes('perf') && (typeText.includes('assign') || typeText === 'task' || typeText === 'tasks' || typeText.startsWith('task') || typeText === 'assessment' || typeText === 'assessments');
                        } else {
                            keepForCategory = isMatchingType(ass.type, ass.category, ass.title || ass.name);
                        }
                        if (!keepForCategory) return;
                        const tLower = (ass.title || ass.name || '').trim().toLowerCase();
                        if (tLower && !seenTitles.has(tLower)) {
                            seenTitles.add(tLower);
                            realAssessments.push({
                                ...ass,
                                id: ass.id || `ass-${tIdx}-${aIdx}`,
                                title: ass.title || ass.name || `${category} #${aIdx + 1}`,
                                category: ass.category || (category === 'quiz' ? 'Quiz' : (category === 'assignment' ? 'Assignment' : (category === 'activity' ? 'Activity' : 'Performance Task'))),
                                date: ass.date || ass.startDate || ass.releaseDate || null,
                                time: ass.time || ass.releaseTime || '',
                                dueDate: ass.dueDate || ass.deadline || ass.due || ass.endDate || ass.endSchedule || ass.targetDueDate || ass.dateDue || null,
                                dueTime: ass.dueTime || ass.endTime || ass.deadlineTime || ass.targetDueTime || '',
                                max: Number(ass.max || ass.points || ass.totalPoints || 100),
                                weight: ass.weight !== undefined ? Number(ass.weight) : undefined,
                                subjectId: subjectId,
                                topicIdx: ass.topicIdx !== undefined ? ass.topicIdx : tIdx,
                                itemIdx: ass.itemIdx !== undefined ? ass.itemIdx : aIdx
                            });
                        }
                    });
                }
            });
        }

        // 2. Direct materials check
        try {
            const storageKey = window.SUBJECTS_STORAGE_KEY || 'sigma-admin-subjects';
            const rawSubjects = localStorage.getItem(storageKey) || localStorage.getItem('sigma_subjects_v2') || '[]';
            const subjects = JSON.parse(rawSubjects);
            if (Array.isArray(subjects)) {
                const curSubj = (typeof window.findMatchingSubject === 'function')
                    ? window.findMatchingSubject(subjects, subjectId)
                    : subjects.find(s => s.id === subjectId || s.name === subjectId);
                
                if (curSubj && Array.isArray(curSubj.materials)) {
                    curSubj.materials.forEach((m, idx) => {
                        if (isFakeAssessment(m)) return;
                        if (isMatchingType(m.type, m.category || m.materialType, m.title || m.name)) {
                            // If material is scoped to a section, ensure it matches
                            if (sectionName && (m.section || m.sectionName)) {
                                const cleanSec = String(sectionName).trim().toLowerCase();
                                const matSec = String(m.section || m.sectionName).trim().toLowerCase();
                                if (matSec && cleanSec && matSec !== cleanSec && !cleanSec.includes(matSec) && !matSec.includes(cleanSec)) {
                                    return;
                                }
                            }
                            const tLower = (m.title || m.name || '').trim().toLowerCase();
                            if (tLower && !seenTitles.has(tLower)) {
                                seenTitles.add(tLower);
                                realAssessments.push({
                                    ...m,
                                    id: m.id || `mat-${idx}`,
                                    title: m.title || m.name || `${category} #${idx + 1}`,
                                    date: m.date || m.startDate || null,
                                    time: m.time || '',
                                    dueDate: m.dueDate || m.deadline || m.due || m.endDate || m.endSchedule || null,
                                    dueTime: m.dueTime || m.endTime || '',
                                    max: Number(m.points || m.totalPoints || m.max || 100),
                                    weight: m.weight !== undefined ? Number(m.weight) : undefined,
                                    subjectId: subjectId,
                                    topicIdx: 0,
                                    itemIdx: realAssessments.length
                                });
                            }
                        }
                    });
                }
            }
        } catch (e) {}

        return realAssessments;
    }

    function buildUnifiedAssessmentRows(role, currentStudent) {
        const rows = [];
        const isTeacher = (role === 'teacher' || (!role && typeof isTeacherPortal !== 'undefined' && isTeacherPortal));
        const loggedInStudent = (!isTeacher && typeof window.getLoggedInStudentUser === 'function') ? window.getLoggedInStudentUser() : null;
        const effectiveStudent = isTeacher 
            ? (currentStudent !== undefined ? currentStudent : (activeFilterStudent || (typeof currentTopicState !== 'undefined' ? currentTopicState.selectedStudent : 'All')))
            : (loggedInStudent || currentStudent || null);
        const isAllSelected = isTeacher && (!effectiveStudent || effectiveStudent === 'All');

        // Robust student matching helper
        function isStudentMatch(candidate, target) {
            if (!candidate || !target) return false;
            if (target === 'All' || candidate === 'All') return true;
            const cleanCand = String(candidate).trim().toLowerCase();
            const cleanTgt = String(target).trim().toLowerCase();
            if (cleanCand === cleanTgt) return true;
            
            const t1 = cleanCand.replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(Boolean);
            const t2 = cleanTgt.replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(Boolean);
            if (t1.length === 0 || t2.length === 0) return false;
            if (t1.slice().sort().join(' ') === t2.slice().sort().join(' ')) return true;
            
            const set1 = new Set(t1);
            const set2 = new Set(t2);
            const common = t1.filter(x => set2.has(x));
            if (common.length >= 2) return true;
            if (t1.length === 1 && set2.has(t1[0])) return true;
            if (t2.length === 1 && set1.has(t2[0])) return true;
            return false;
        }

        // Resolve student metadata for the currently active student
        let targetStudentId = null;
        let targetStudentName = null;
        let targetStudentObj = null;

        if (loggedInStudent && !isTeacher) {
            targetStudentObj = loggedInStudent;
            targetStudentId = String(loggedInStudent.id || loggedInStudent.lrn || loggedInStudent.studentNumber || '').trim();
            targetStudentName = String(loggedInStudent.fullName || loggedInStudent.name || `${loggedInStudent.firstName || ''} ${loggedInStudent.lastName || ''}`).trim();
        } else if (effectiveStudent && effectiveStudent !== 'All') {
            if (typeof effectiveStudent === 'object') {
                targetStudentObj = effectiveStudent;
                targetStudentId = String(effectiveStudent.id || effectiveStudent.lrn || effectiveStudent.studentNumber || '').trim();
                targetStudentName = String(effectiveStudent.fullName || effectiveStudent.name || `${effectiveStudent.firstName || ''} ${effectiveStudent.lastName || ''}`).trim();
            } else {
                targetStudentName = String(effectiveStudent).trim();
                let allSecStudents = [];
                if (typeof studentsBySection !== 'undefined') {
                    allSecStudents = Object.values(studentsBySection).flat();
                }
                if ((!allSecStudents || !allSecStudents.length) && typeof window.getStudentsForSection === 'function') {
                    allSecStudents = window.getStudentsForSection(activeFilterSection || '');
                }
                const foundObj = (allSecStudents || []).find(s => {
                    const sName = typeof s === 'string' ? s : (s.name || `${s.lastName || ''}, ${s.firstName || ''}`.trim());
                    return isStudentMatch(sName, targetStudentName) || (s.id && isStudentMatch(s.id, targetStudentName));
                });
                if (foundObj && typeof foundObj === 'object') {
                    targetStudentId = foundObj.id || null;
                    targetStudentName = foundObj.name || targetStudentName;
                    targetStudentObj = foundObj;
                } else {
                    targetStudentObj = { id: targetStudentId, name: targetStudentName };
                }
            }
        }

        function extractMatchingSub(rawSub, targetName, targetId) {
            if (!rawSub || typeof rawSub !== 'object') return null;

            // 1. Check nested student sub-dictionaries
            if (rawSub.studentSubmissions && typeof rawSub.studentSubmissions === 'object') {
                for (const [k, nested] of Object.entries(rawSub.studentSubmissions)) {
                    if (isStudentMatch(k, targetName) || (targetId && isStudentMatch(k, targetId))) {
                        if (nested && typeof nested === 'object') return nested;
                    }
                }
            }
            if (rawSub.students && typeof rawSub.students === 'object') {
                for (const [k, nested] of Object.entries(rawSub.students)) {
                    if (isStudentMatch(k, targetName) || (targetId && isStudentMatch(k, targetId))) {
                        if (nested && typeof nested === 'object') return nested;
                    }
                }
            }

            // 2. Direct student identifiers
            const sName = rawSub.studentName || rawSub.student_name || rawSub.userName || rawSub.name || (typeof rawSub.student === 'string' ? rawSub.student : rawSub.student?.name);
            const sId = rawSub.studentId || rawSub.student_id || rawSub.userId || rawSub.student?.id;

            if (targetName || targetId) {
                if (sName && targetName && isStudentMatch(sName, targetName)) return rawSub;
                if (sId && targetId && isStudentMatch(sId, targetId)) return rawSub;
                if (!sName && !sId) {
                    // Default untagged submissions only belong to the primary default student (Juan Dela Cruz / 2222222)
                    if (targetName && isStudentMatch('Juan Dela Cruz', targetName)) return rawSub;
                    if (targetId && (targetId === '2222222' || targetId === '222222')) return rawSub;
                    return null;
                }
                return null;
            }

            return rawSub;
        }

        const cards = getConnectedSectionsList(role);
        const seenKeys = new Set();

        cards.forEach((card, sIdx) => {
            const rawSubjectName = card.subject || card.name || card.text || card.title || '';
            if (!rawSubjectName || rawSubjectName.toLowerCase().startsWith('blank section')) return;

            const cardId = card.id || '';
            const topicSubjectId = resolveSubjectTopicId(cardId, rawSubjectName);
            const sectionName = card.section || card.sectionName || (Array.isArray(card.sections) && card.sections[0]) || '';

            // Strictly scope each section card distinctly so Section A and Section B don't collide
            const dedupeKey = `${cardId}:::${sectionName}:::${topicSubjectId}:::${rawSubjectName}`;
            if (seenKeys.has(dedupeKey)) return;
            seenKeys.add(dedupeKey);

            const categories = ['assignment', 'quiz', 'activity', 'perf. task'];
            categories.forEach((cat, cIdx) => {
                const assessments = getAssessmentsForSubject(topicSubjectId, cat, rawSubjectName, sectionName);
                assessments.forEach((ass, aIdx) => {
                    if (isFakeAssessment(ass)) return;
                    const tabMap = { 'assignment': 'assignments', 'quiz': 'quiz', 'activity': 'activity', 'perf. task': 'performance' };
                    const currentTab = tabMap[cat] || 'assignments';

                    const cleanSubj = String(topicSubjectId || '').replace(/^(card-|subj-)/, '').trim().toLowerCase();
                    const cleanTitle = String(ass.title || ass.name || '').trim().toLowerCase().replace(/\.(pdf|docx|pptx|ppt)$/i, '');
                    const cleanSec = String(sectionName || '').trim().toLowerCase();
                    const assTopIdx = Number(ass.topicIdx !== undefined ? ass.topicIdx : 0);
                    const assItemIdx = Number(ass.itemIdx !== undefined ? ass.itemIdx : aIdx);
                    const assIdStr = String(ass?.id || ass?.materialId || ass?.quizId || ass?.origId || ass?.selectedQuizId || '');
                    const assTitleStr = String(ass?.title || ass?.name || '').trim();

                    // Compute unified index in topic assessments array
                    let unifiedIdx = assItemIdx;
                    try {
                        const getTopicDataFn = window.getTopicData || (typeof getTopicData === 'function' ? getTopicData : null);
                        let topicData = getTopicDataFn ? getTopicDataFn(topicSubjectId) : null;
                        if (!topicData && rawSubjectName) {
                            const resolvedId = resolveSubjectTopicId(cardId, rawSubjectName);
                            if (resolvedId && resolvedId !== topicSubjectId) {
                                topicData = getTopicDataFn ? getTopicDataFn(resolvedId) : null;
                            }
                        }

                        const hasQuarterTopics = topicData && ((Array.isArray(topicData.q1Topics) && topicData.q1Topics.length > 0) || (Array.isArray(topicData.q2Topics) && topicData.q2Topics.length > 0));
                        const topicArrays = hasQuarterTopics ? [
                            ...(Array.isArray(topicData.q1Topics) ? topicData.q1Topics : []),
                            ...(Array.isArray(topicData.q2Topics) ? topicData.q2Topics : [])
                        ] : (topicData && Array.isArray(topicData.topics) ? topicData.topics : []);

                        const topicObj = topicArrays[assTopIdx] || (topicData?.q1Topics && topicData.q1Topics[assTopIdx]) || (topicData?.topics && topicData.topics[assTopIdx]) || null;
                        if (topicObj) {
                            const rawAssign = Array.isArray(topicObj.assignments) ? topicObj.assignments : [];
                            const rawQuiz = Array.isArray(topicObj.quiz) ? topicObj.quiz : [];
                            const rawAct = Array.isArray(topicObj.activity) ? topicObj.activity : [];
                            const rawPerf = Array.isArray(topicObj.performance) ? topicObj.performance : [];
                            let unifiedList = [...rawAssign, ...rawQuiz, ...rawAct, ...rawPerf];
                            if (typeof window.getUnifiedTopicAssessments === 'function') {
                                const uList = window.getUnifiedTopicAssessments('assessments', topicSubjectId, assTopIdx, unifiedList, sectionName);
                                if (Array.isArray(uList) && uList.length > 0) unifiedList = uList;
                            }
                            const matchUIdx = unifiedList.findIndex(u => {
                                if (assIdStr && String(u.id || u.materialId || u.quizId || u.origId || '') === assIdStr) return true;
                                const uTitle = String(u.title || u.name || '').trim().toLowerCase().replace(/\.(pdf|docx|pptx|ppt)$/i, '');
                                return cleanTitle && (uTitle === cleanTitle || uTitle.includes(cleanTitle) || cleanTitle.includes(uTitle));
                            });
                            if (matchUIdx !== -1) {
                                unifiedIdx = matchUIdx;
                            } else {
                                if (cat === 'assignment') unifiedIdx = assItemIdx;
                                else if (cat === 'quiz') unifiedIdx = rawAssign.length + assItemIdx;
                                else if (cat === 'activity') unifiedIdx = rawAssign.length + rawQuiz.length + assItemIdx;
                                else if (cat === 'perf. task' || cat === 'performance') unifiedIdx = rawAssign.length + rawQuiz.length + rawAct.length + assItemIdx;
                            }
                        } else {
                            if (cat === 'assignment') unifiedIdx = assItemIdx;
                            else if (cat === 'quiz') unifiedIdx = 1 + assItemIdx;
                            else if (cat === 'activity') unifiedIdx = 2 + assItemIdx;
                            else if (cat === 'perf. task' || cat === 'performance') unifiedIdx = 3 + assItemIdx;
                        }
                    } catch (e) {}

                    // Check release status for students and admin: only show assessments that have been sent/released to this section
                    if ((role === 'student' || role === 'admin') && typeof window.getStudentAssessmentReleaseStatus === 'function') {
                        const relStatus = window.getStudentAssessmentReleaseStatus(topicSubjectId, ass, assTopIdx, unifiedIdx, 'assessments', sectionName)
                            || window.getStudentAssessmentReleaseStatus(topicSubjectId, ass, assTopIdx, assItemIdx, currentTab, sectionName);
                        if (relStatus && (relStatus.isLocked || relStatus.isPublished === false || relStatus.isUnreleased === true || relStatus.isHidden === true)) {
                            return;
                        }
                    }

                    const assessConfig = (typeof window.getAssessmentReleaseConfig === 'function')
                        ? window.getAssessmentReleaseConfig(topicSubjectId, sectionName)
                        : null;

                    const findInConfig = (mapObj) => {
                        if (!mapObj || typeof mapObj !== 'object') return undefined;
                        const candidates = [
                            assIdStr,
                            assTitleStr,
                            cleanTitle,
                            assTitleStr.toLowerCase(),
                            ass.quizId ? String(ass.quizId) : null,
                            ass.materialId ? String(ass.materialId) : null,
                            ass.origId ? String(ass.origId) : null,
                            ass.selectedQuizId ? String(ass.selectedQuizId) : null,
                            `assess-assessments-topic-${assTopIdx}-${unifiedIdx}`,
                            `assess-assessments-${assTopIdx}-${unifiedIdx}`,
                            `assess-assessments-${unifiedIdx}`,
                            `assessments-${unifiedIdx}`,
                            String(unifiedIdx),
                            `assess-${currentTab}-topic-${assTopIdx}-${assItemIdx}`,
                            `assess-${currentTab}-${assTopIdx}-${assItemIdx}`,
                            `assess-${currentTab}-${assItemIdx}`,
                            `${currentTab}-${assItemIdx}`
                        ].filter(Boolean);
                        for (const k of candidates) {
                            if (mapObj[k] !== undefined && mapObj[k] !== '' && mapObj[k] !== null && mapObj[k] !== 'none' && mapObj[k] !== 'no-deadline') return mapObj[k];
                        }
                        return undefined;
                    };

                    // Start Date & Time (syncs with workstation)
                    const cfgStart = findInConfig(assessConfig?.assessmentSchedules) 
                        ?? findInConfig(assessConfig?.materialSchedules) 
                        ?? findInConfig(assessConfig?.topicSchedules)
                        ?? findInConfig(assessConfig?.schedule) 
                        ?? findInConfig(assessConfig?.schedules)
                        ?? findInConfig(assessConfig?.assessmentReleaseDates) 
                        ?? findInConfig(assessConfig?.materialReleaseDates)
                        ?? findInConfig(assessConfig?.releaseDates)
                        ?? findInConfig(assessConfig?.releaseDate);
                    const inventedDate = (value) => {
                        const text = String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
                        return !text || text === 'mar 10, 2026' || text === 'march 10, 2026' || text === 'mar 17, 2026' || text === 'sep 15, 2026' || text === 'september 15, 2026';
                    };
                    const releaseStamp = (typeof window.resolveReleasedAssessmentStamp === 'function')
                        ? window.resolveReleasedAssessmentStamp(ass, topicSubjectId, sectionName)
                        : null;
                    const rawStart = releaseStamp
                        || (!inventedDate(cfgStart) ? cfgStart : null)
                        || (!inventedDate(ass.startDate) ? ass.startDate : null)
                        || (!inventedDate(ass.releaseDate) ? ass.releaseDate : null)
                        || (!inventedDate(ass.scheduleDate) ? ass.scheduleDate : null)
                        || (!inventedDate(ass.date) ? ass.date : null)
                        || (!inventedDate(ass.createdAt) ? ass.createdAt : null)
                        || null;
                    let startTime = ass.time || ass.releaseTime || findInConfig(assessConfig?.assessmentStartTimes) || findInConfig(assessConfig?.startTimes) || '';

                    // Due Date & Time (syncs with workstation)
                    const cfgDue = findInConfig(assessConfig?.assessmentDeadlines) 
                        ?? findInConfig(assessConfig?.materialDeadlines) 
                        ?? findInConfig(assessConfig?.topicDeadlines)
                        ?? findInConfig(assessConfig?.deadline) 
                        ?? findInConfig(assessConfig?.deadlines)
                        ?? findInConfig(assessConfig?.dueDate) 
                        ?? findInConfig(assessConfig?.dueDates);
                    const rawDue = (cfgDue !== 'none' && cfgDue !== 'no-deadline') 
                        ? (cfgDue || ass.dueDate || ass.deadline || ass.due || ass.endDate || ass.endSchedule || ass.targetDueDate || null) 
                        : null;
                    let dueTime = (rawDue && rawDue !== 'none') ? (ass.dueTime || ass.endTime || ass.deadlineTime || ass.targetDueTime || findInConfig(assessConfig?.assessmentDeadlineTimes) || findInConfig(assessConfig?.deadlineTimes) || '') : '';

                    // DepEd Weight (WW 25%, PT 50%)
                    const defaultWeight = (cat === 'perf. task' || cat === 'performance') ? 50 : 25;
                    const cfgWeight = findInConfig(assessConfig?.assessmentWeights) ?? findInConfig(assessConfig?.weights);
                    const weight = (cfgWeight !== undefined && cfgWeight !== null && cfgWeight !== '')
                        ? Number(cfgWeight)
                        : (ass.weight !== undefined ? Number(ass.weight) : defaultWeight);

                    const resolvedHps = (typeof window.resolveAssessmentHPS === 'function')
                        ? window.resolveAssessmentHPS(ass, topicSubjectId || cardId || rawSubjectName, sectionName, cat, assItemIdx)
                        : null;
                    const maxScore = resolvedHps ? resolvedHps.points : ((assessConfig?.assessmentMaxScores && assessConfig.assessmentMaxScores[assIdStr] !== undefined)
                        ? assessConfig.assessmentMaxScores[assIdStr]
                        : (ass.max || ass.points || ass.totalPoints || 100));

                    // Robust student submission lookup strictly tied to this assessment
                    let subData = null;

                    const isMatchingSub = (sub) => {
                        if (!sub || typeof sub !== 'object') return null;

                        const studentSub = (targetStudentName || targetStudentId) ? extractMatchingSub(sub, targetStudentName, targetStudentId) : (isAllSelected ? sub : null);
                        if (!studentSub) return null;

                        const hasSubStatus = studentSub.status === 'Submitted' || studentSub.status === 'Graded' || studentSub.status === 'Pending' || Boolean(studentSub.submittedAt || studentSub.completedAt || studentSub.fileName || studentSub.submissionDate);
                        if (!hasSubStatus) return null;

                        const subCat = String(studentSub.category || studentSub.type || '').trim().toLowerCase();
                        const subTab = String(studentSub.tab || '').trim().toLowerCase();
                        const subTitle = String(studentSub.assessmentTitle || studentSub.title || studentSub.quizTitle || studentSub.materialTitle || '').trim().toLowerCase().replace(/\.(pdf|docx|pptx|ppt)$/i, '');

                        // 1. Strict Category and Tab verification
                        if (cat === 'quiz') {
                            if (subCat && (subCat.includes('assign') || subCat.includes('activ') || subCat.includes('perf'))) return null;
                            if (subTab && (subTab === 'assignments' || subTab === 'activity' || subTab === 'performance')) return null;
                            if (subTitle && (subTitle.includes('assignment') || subTitle.includes('activity') || subTitle.includes('performance') || subTitle.includes('perf.')) && !subTitle.includes('quiz')) return null;
                        } else if (cat === 'assignment') {
                            if (subCat && (subCat.includes('quiz') || subCat.includes('activ') || subCat.includes('perf'))) return null;
                            if (subTab && (subTab === 'quiz' || subTab === 'activity' || subTab === 'performance')) return null;
                            if (subTitle && (subTitle.includes('quiz') || subTitle.includes('activity') || subTitle.includes('performance') || subTitle.includes('perf.')) && !subTitle.includes('assignment') && !subTitle.includes('assign')) return null;
                        } else if (cat === 'activity') {
                            if (subCat && (subCat.includes('quiz') || subCat.includes('assign') || subCat.includes('perf'))) return null;
                            if (subTab && (subTab === 'quiz' || subTab === 'assignments' || subTab === 'performance')) return null;
                            if (subTitle && (subTitle.includes('quiz') || subTitle.includes('assignment') || subTitle.includes('performance') || subTitle.includes('perf.')) && !subTitle.includes('activity') && !subTitle.includes('act')) return null;
                        } else if (cat === 'perf. task' || cat === 'performance') {
                            if (subCat && (subCat.includes('quiz') || subCat.includes('assign') || subCat.includes('activ'))) return null;
                            if (subTab && (subTab === 'quiz' || subTab === 'assignments' || subTab === 'activity')) return null;
                            if (subTitle && (subTitle.includes('quiz') || subTitle.includes('assignment') || subTitle.includes('activity')) && !subTitle.includes('performance') && !subTitle.includes('perf.')) return null;
                        }

                        // 2. Prevent mismatched numbers (e.g. Quiz 1 vs Quiz 2)
                        if (cleanTitle && subTitle) {
                            const isQuizAss = cleanTitle.includes('quiz');
                            const isAssignAss = cleanTitle.includes('assign');
                            const isQuizSub = subTitle.includes('quiz');
                            const isAssignSub = subTitle.includes('assign');
                            const assNum = cleanTitle.match(/\b\d+\b/);
                            const subNum = subTitle.match(/\b\d+\b/);
                            if (assNum && subNum && assNum[0] !== subNum[0] && ((isQuizAss && isQuizSub) || (isAssignAss && isAssignSub))) {
                                return null;
                            }
                        }

                        // 3. Topic verification if present in submission
                        const subTop = Number(studentSub.topicIdx !== undefined ? studentSub.topicIdx : (studentSub.topIdx !== undefined ? studentSub.topIdx : -1));
                        if (subTop !== -1 && subTop !== assTopIdx) {
                            return null;
                        }

                        // 4. Prevent index collision if index is explicitly tagged
                        const subAct = Number(studentSub.activeIdx !== undefined ? studentSub.activeIdx : (studentSub.itemIdx !== undefined ? studentSub.itemIdx : -1));
                        if (subAct !== -1) {
                            const isAssessmentsTab = !subTab || subTab === 'assessments';
                            if (isAssessmentsTab && unifiedIdx !== undefined && subAct !== unifiedIdx) {
                                return null;
                            }
                            if (subTab === currentTab && assItemIdx !== undefined && subAct !== assItemIdx) {
                                return null;
                            }
                        }

                        return studentSub;
                    };

                    if (!isAllSelected) {
                        const targetStudentParam = targetStudentObj || targetStudentName || targetStudentId || effectiveStudent;
                        // 1. Try getStudentAssessmentSubmission with direct category tab and index
                        if (typeof window.getStudentAssessmentSubmission === 'function') {
                            const candidateConfigs = [
                                { tab: 'assessments', idx: unifiedIdx },
                                { tab: currentTab, idx: assItemIdx }
                            ];
                            for (const cfg of candidateConfigs) {
                                const found = window.getStudentAssessmentSubmission(topicSubjectId, cfg.tab, cfg.idx, assTopIdx, ass, targetStudentParam)
                                    || window.getStudentAssessmentSubmission(cardId, cfg.tab, cfg.idx, assTopIdx, ass, targetStudentParam)
                                    || window.getStudentAssessmentSubmission(cleanSubj, cfg.tab, cfg.idx, assTopIdx, ass, targetStudentParam);
                                const match = isMatchingSub(found);
                                if (match) {
                                    subData = match;
                                    break;
                                }
                            }
                        }

                        // 2. Direct key lookups in localStorage
                        if (!subData) {
                            const subjList = Array.from(new Set([cleanSubj, topicSubjectId, cardId, `card-${cleanSubj}`, 'default'])).filter(Boolean);
                            const matList = Array.from(new Set([assIdStr, ass?.materialId, ass?.quizId, ass?.origId])).filter(Boolean);

                            for (const s of subjList) {
                                const directIndexKeys = [
                                    ...(targetStudentId ? [
                                        `sigma_sub_${targetStudentId}_${s}_top_${assTopIdx}_assessments_${unifiedIdx}`,
                                        `sigma_sub_${targetStudentId}_${s}_top_${assTopIdx}_${currentTab}_${assItemIdx}`,
                                        `sigma_sub_${targetStudentId}_${s}_assessments_${unifiedIdx}`,
                                        `sigma_sub_${targetStudentId}_${s}_${currentTab}_${assItemIdx}`,
                                        `sigma_submission_${targetStudentId}_${s}_top_${assTopIdx}_assessments_${unifiedIdx}`,
                                        `sigma_submission_${targetStudentId}_${s}_top_${assTopIdx}_${currentTab}_${assItemIdx}`
                                    ] : []),
                                    `sigma_sub_${s}_top_${assTopIdx}_assessments_${unifiedIdx}`,
                                    `sigma_sub_${s}_top_${assTopIdx}_${currentTab}_${assItemIdx}`,
                                    `sigma_sub_${s}_assessments_${unifiedIdx}`,
                                    `sigma_sub_${s}_${currentTab}_${assItemIdx}`,
                                    `sigma_submission_${s}_top_${assTopIdx}_assessments_${unifiedIdx}`,
                                    `sigma_submission_${s}_top_${assTopIdx}_${currentTab}_${assItemIdx}`
                                ];
                                for (const dk of directIndexKeys) {
                                    const raw = localStorage.getItem(dk);
                                    if (raw) {
                                        try {
                                            const parsed = JSON.parse(raw);
                                            const match = isMatchingSub(parsed);
                                            if (match) {
                                                subData = match;
                                                break;
                                            }
                                        } catch(e) {}
                                    }
                                }
                                if (subData) break;

                                for (const m of matList) {
                                    const directKeys = [
                                        ...(targetStudentId ? [
                                            `sigma_sub_${targetStudentId}_${s}_top_${assTopIdx}_mat_${m}`,
                                            `sigma_sub_${targetStudentId}_${s}_mat_${m}`,
                                            `sigma_submission_${targetStudentId}_${s}_top_${assTopIdx}_mat_${m}`
                                        ] : []),
                                        `sigma_sub_${s}_top_${assTopIdx}_mat_${m}`,
                                        `sigma_sub_${s}_mat_${m}`,
                                        `sigma_submission_${s}_top_${assTopIdx}_mat_${m}`
                                    ];
                                    for (const dk of directKeys) {
                                        const raw = localStorage.getItem(dk);
                                        if (raw) {
                                            try {
                                                const parsed = JSON.parse(raw);
                                                const match = isMatchingSub(parsed);
                                                if (match) {
                                                    subData = match;
                                                    break;
                                                }
                                            } catch(e) {}
                                        }
                                    }
                                    if (subData) break;
                                }
                                if (subData) break;
                            }
                        }

                        // 3. Scan all localStorage keys starting with sigma_sub_, sigma_submission_
                        if (!subData) {
                            try {
                                for (let kIdx = 0; kIdx < localStorage.length; kIdx++) {
                                    const k = localStorage.key(kIdx);
                                    if (!k || (!k.startsWith('sigma_sub_') && !k.startsWith('sigma_submission_'))) continue;
                                    const raw = localStorage.getItem(k);
                                    if (!raw) continue;
                                    const sub = JSON.parse(raw);
                                    const match = isMatchingSub(sub);
                                    if (!match) continue;

                                    const kLower = k.toLowerCase();
                                    const subTitle = String(match.assessmentTitle || match.title || match.quizTitle || match.materialTitle || '').trim().toLowerCase();
                                    const subAct = Number(match.activeIdx !== undefined ? match.activeIdx : (match.itemIdx !== undefined ? match.itemIdx : -1));
                                    const subTab = String(match.tab || '').toLowerCase();
                                    const subTop = Number(match.topicIdx !== undefined ? match.topicIdx : 0);

                                    const matchesTitle = cleanTitle && subTitle && (cleanTitle === subTitle || cleanTitle.includes(subTitle) || subTitle.includes(cleanTitle));
                                    const matchesKeyIndex = (kLower.includes(`_assessments_${unifiedIdx}`) || kLower.includes(`_${currentTab}_${assItemIdx}`)) && (kLower.includes(cleanSubj) || kLower.includes('default'));
                                    const matchesSubIndex = (subTop === assTopIdx) && ((subTab === 'assessments' && subAct === unifiedIdx) || (subTab === currentTab && subAct === assItemIdx));

                                    if (matchesTitle || matchesKeyIndex || matchesSubIndex) {
                                        subData = match;
                                        break;
                                    }
                                }
                            } catch(e) {}
                        }
                    }

                    // Check persistent gradebook scores for this specific student
                    let gbScore = null;
                    if (!isAllSelected) {
                        try {
                            const rawGb = localStorage.getItem('sigma_gradebook_scores') || localStorage.getItem('sigma_gradebook_scores_v2');
                            const gb = rawGb ? JSON.parse(rawGb) : (typeof gradebookScores !== 'undefined' ? gradebookScores : {});
                            const qList = ['q1', 'q2', 'q3', 'q4', 'Q1', 'Q2', 'Q3', 'Q4', '1', '2', '3', '4'];
                            const idList = [targetStudentId, targetStudentName, effectiveStudent].filter(Boolean);
                            const subjKeys = [topicSubjectId, cardId, cleanSubj, 'default'].filter(Boolean);
                            const catKeys = [cat, currentTab, 'assignment', 'quiz', 'activity', 'perf. task', 'performance'];

                            for (const sk of subjKeys) {
                                for (const q of qList) {
                                    for (const sid of idList) {
                                        for (const ck of catKeys) {
                                            const val = gb?.[sk]?.[q]?.[sid]?.[ck]?.[assItemIdx] 
                                                ?? gb?.[sk]?.[q]?.[sid]?.[ck]?.[unifiedIdx]
                                                ?? gb?.[q]?.[sid]?.[ck]?.[assItemIdx]
                                                ?? gb?.[q]?.[sid]?.[ck]?.[unifiedIdx];
                                            if (val !== undefined && val !== null && val !== '') {
                                                gbScore = Number(val);
                                                break;
                                            }
                                        }
                                        if (gbScore !== null) break;
                                    }
                                    if (gbScore !== null) break;
                                }
                                if (gbScore !== null) break;
                            }
                        } catch(e) {}

                        // Check direct item scores on ass
                        if (gbScore === null && ass) {
                            for (const sid of [targetStudentId, targetStudentName, effectiveStudent]) {
                                if (sid && ass.grades && ass.grades[sid] !== undefined && ass.grades[sid] !== null && ass.grades[sid] !== '') {
                                    gbScore = Number(ass.grades[sid]);
                                    break;
                                }
                                if (sid && ass.scores && ass.scores[sid] !== undefined && ass.scores[sid] !== null && ass.scores[sid] !== '') {
                                    gbScore = Number(ass.scores[sid]);
                                    break;
                                }
                            }
                        }
                    }

                    let status = 'not-started';
                    let score = null;
                    let submittedOn = null;
                    let gradedOn = null;

                    if (subData && (subData.status === 'Submitted' || subData.status === 'Pending' || subData.status === 'Graded' || subData.status === 'Excuse' || subData.status === 'Missing' || subData.status === 'Absent' || subData.status === 'Incomplete' || subData.attendance || subData.submittedAt || subData.submissionDate || subData.completedAt || subData.fileName)) {
                        const rawScore = (subData.teacherSaved === true && subData.score !== undefined && subData.score !== null && subData.score !== '')
                            ? Number(subData.score)
                            : (gbScore !== null && !isNaN(gbScore) ? gbScore : null);
                        const isGraded = rawScore !== null && !isNaN(rawScore);
                        const isPending = !isGraded && Boolean(subData.isPending || subData.status === 'Pending' || subData.status === 'Submitted' || subData.submittedAt || subData.submissionDate || subData.completedAt);

                        submittedOn = subData.submittedAt || subData.submissionDate || subData.completedAt || (Array.isArray(subData.history) && subData.history[subData.history.length - 1]?.submittedAt) || null;
                        gradedOn = isGraded ? (subData.gradedAt || subData.submittedAt || subData.submissionDate || null) : null;
                        score = isGraded ? (rawScore !== null ? rawScore : (gbScore !== null ? gbScore : '--')) : (isPending ? '--' : null);
                        
                        const subAtt = String(subData.attendance || subData.status || '').trim().toLowerCase();
                        if (subAtt === 'excuse' || subAtt === 'excused') status = 'excuse';
                        else if (subAtt === 'missing') status = 'missing';
                        else if (subAtt === 'absent') status = 'absent';
                        else if (subAtt === 'incomplete') status = 'incomplete';
                        else status = isGraded ? 'graded' : (isPending ? 'submitted' : 'submitted');
                    } else if (gbScore !== null && !isNaN(gbScore)) {
                        score = gbScore;
                        status = 'graded';
                        gradedOn = 'Graded';
                        submittedOn = 'Submitted';
                    } else {
                        // Check if past due date
                        if (rawDue) {
                            const parsedDue = new Date(rawDue);
                            if (!isNaN(parsedDue.getTime())) {
                                if (typeof rawDue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawDue)) {
                                    parsedDue.setHours(23, 59, 59, 999);
                                }
                                if (Date.now() > parsedDue.getTime()) {
                                    status = 'overdue';
                                }
                            }
                        }
                    }

                    rows.push({
                        cardId: cardId,
                        subjectId: topicSubjectId,
                        subject: rawSubjectName,
                        section: sectionName,
                        activity: ass.title,
                        category: cat,
                        tab: currentTab,
                        topicIdx: assTopIdx,
                        itemIdx: assItemIdx,
                        unifiedIdx: unifiedIdx,
                        status: status,
                        score: score,
                        max: maxScore,
                        weight: weight,
                        startDate: rawStart,
                        startTime: startTime,
                        dueDate: rawDue,
                        dueTime: dueTime,
                        submittedOn: submittedOn,
                        gradedOn: gradedOn
                    });
                });
            });
        });

        const uniqueRows = [];
        const rowIndexByKey = new Map();
        rows.forEach(row => {
            const titleKey = String(row.activity || '').trim().toLowerCase().replace(/\.(pdf|docx|pptx|ppt)$/i, '');
            const key = [
                String(row.subjectId || row.cardId || row.subject || '').replace(/^(card-|subj-)/, '').trim().toLowerCase(),
                String(row.section || '').trim().toLowerCase(),
                titleKey
            ].join('::');
            const existingAt = rowIndexByKey.get(key);
            if (existingAt === undefined) {
                rowIndexByKey.set(key, uniqueRows.length);
                uniqueRows.push(row);
                return;
            }
            const current = uniqueRows[existingAt];
            const scoreOf = (item) => (item.score !== null && item.score !== undefined && item.score !== '--' && item.score !== '-') ? 1 : 0;
            const title = titleKey;
            const catFit = (item) => {
                const cat = String(item.category || '').toLowerCase();
                if (title.includes('quiz')) return cat.includes('quiz') ? 2 : 0;
                if (cat.includes('perf')) return 0;
                return 1;
            };
            const better = (scoreOf(row) - scoreOf(current)) || (catFit(row) - catFit(current));
            if (better > 0) uniqueRows[existingAt] = row;
        });

        // Always sort newest release first at the top
        return uniqueRows.sort((a, b) => {
            const timeA = a.startDate ? new Date(a.startDate).getTime() : 0;
            const timeB = b.startDate ? new Date(b.startDate).getTime() : 0;
            return timeB - timeA;
        });
    }

    function isSubjectMatch(row, target) {
        if (!target) return false;
        const cleanTarget = String(target).toLowerCase().trim();
        const rowSubj = String(row.subject || '').toLowerCase().trim();
        const rowSubjId = String(row.subjectId || '').toLowerCase().trim();
        const rowCardId = String(row.cardId || '').toLowerCase().trim();
        const rowSec = String(row.section || '').toLowerCase().trim();

        if (rowSubj === cleanTarget || rowSubjId === cleanTarget || rowCardId === cleanTarget || rowSec === cleanTarget) {
            return true;
        }

        const resolvedTargetId = resolveSubjectTopicId(cleanTarget, cleanTarget);
        if (resolvedTargetId && (rowSubjId === resolvedTargetId || rowCardId === resolvedTargetId)) {
            return true;
        }

        if (cleanTarget.startsWith('card-')) {
            return rowCardId === cleanTarget || rowSubjId === cleanTarget;
        }

        if (rowSubj && cleanTarget && (rowSubj === cleanTarget || cleanTarget === rowSubj)) {
            return true;
        }

        if (rowSubj.length > 3 && cleanTarget.length > 3) {
            if (rowSubj.includes(cleanTarget) || cleanTarget.includes(rowSubj)) {
                return true;
            }
        }
        return false;
    }

    function isRowMatch(row, targetSubject, targetSection) {
        if (!targetSubject && !targetSection) return false;

        if (targetSection) {
            const cleanTargetSec = String(targetSection).toLowerCase().trim();
            const rowSec = String(row.section || '').toLowerCase().trim();
            if (rowSec && cleanTargetSec && rowSec !== cleanTargetSec && !rowSec.includes(cleanTargetSec) && !cleanTargetSec.includes(rowSec)) {
                return false;
            }
        }

        if (targetSubject) {
            return isSubjectMatch(row, targetSubject);
        }

        return true;
    }

    function buildAssessmentsSectionPanel(activeCards, displaySection) {
        if (typeof window.buildTopicSectionSelectorCard === 'function') {
            return window.buildTopicSectionSelectorCard({
                subjectId: activeFilterSubject,
                text: activeFilterSubject,
                section: displaySection,
                selectedStudent: activeFilterStudent,
                isAssessmentsPage: true,
                hideManageCurriculum: true,
                hideGradebooks: true
            });
        }

        // Collect all distinct sections for the teacher
        const sectionCards = [];
        const seenSecs = new Set();
        (activeCards || []).forEach(card => {
            const secName = card.section || card.sectionName;
            if (secName && !seenSecs.has(secName)) {
                seenSecs.add(secName);
                sectionCards.push({ sectionName: secName, name: card.subject || card.name || '' });
            }
        });

        if (displaySection && !seenSecs.has(displaySection)) {
            sectionCards.unshift({ sectionName: displaySection, name: '' });
            seenSecs.add(displaySection);
        }

        const hasSections = sectionCards.length > 0;
        let selectedSection = displaySection || (hasSections ? sectionCards[0].sectionName : '');

        // Resolve students for the section
        let secStudents = (typeof studentsBySection !== 'undefined' ? studentsBySection[selectedSection] : []) || [];
        if ((!secStudents || !secStudents.length) && typeof window.getStudentsForSection === 'function') {
            secStudents = window.getStudentsForSection(selectedSection);
        }
        if ((!secStudents || !secStudents.length) && typeof window.getUnifiedSectionStudents === 'function') {
            const raw = window.getUnifiedSectionStudents(selectedSection);
            secStudents = (raw || []).map(s => typeof s === 'string' ? { name: s } : s);
        }

        if (activeFilterStudent === null || activeFilterStudent === undefined || activeFilterStudent === '') {
            activeFilterStudent = (typeof currentTopicState !== 'undefined' && currentTopicState?.selectedStudent) 
                ? currentTopicState.selectedStudent 
                : (typeof window.getPersistedTopicStudent === 'function' ? window.getPersistedTopicStudent(activeFilterSubject, selectedSection) : 'All');
        }

        const selectedStudent = activeFilterStudent || 'All';
        const isAllSelected = (selectedStudent === 'All' || !selectedStudent);

        const sectionOptions = sectionCards
            .map(card => `<option value="${escapeHtml(card.sectionName)}" ${card.sectionName === selectedSection ? 'selected' : ''}>${escapeHtml(card.sectionName)}</option>`)
            .join('');

        return `
            <div id="assessments-class-panel-card" class="topic-progress-card flex flex-col gap-3 font-['Inter'] w-full box-border">
                <div class="topic-section-selector-title home-dashboard-panel-title flex items-center gap-2 cursor-default">
                    <i class="fa-solid fa-chalkboard-user text-[#15803d]"></i>
                    <span>Class Panel</span>
                </div>
            </div>
        `;
    }

    function renderAssessmentsPage(filterSubject, forcedRole, filterSection, filterStudent) {
        const layout = document.getElementById('assessments-layout');
        if (!layout) return;

        try {
            const role = forcedRole || (document.getElementById('teacher-header') || window.location.pathname.includes('teacher') ? 'teacher' : 'student');
            const isTeacher = (role === 'teacher');

            if (filterSubject !== undefined && filterSubject !== null && filterSubject !== '') {
                activeFilterSubject = filterSubject;
            }
            if (filterSection !== undefined && filterSection !== null && filterSection !== '') {
                activeFilterSection = filterSection;
            }
            if (filterStudent !== undefined && filterStudent !== null) {
                activeFilterStudent = filterStudent;
            }

            if (!activeFilterSubject) {
                const activeCards = getConnectedSectionsList(role);
                let contextSubj = null;
                let contextSec = null;
                if (isTeacher) {
                    contextSec = window.currentClassroomSectionName || (window.currentClassroomKey ? window.currentClassroomKey.split('::')[0] : null);
                    if (window.currentClassroomMeta && (window.currentClassroomMeta.subject || window.currentClassroomMeta.name)) {
                        contextSubj = window.currentClassroomMeta.subject || window.currentClassroomMeta.name;
                    } else if (window.currentClassroomKey) {
                        contextSubj = window.currentClassroomKey.split('::')[1];
                    } else if (typeof currentTopicState !== 'undefined' && currentTopicState?.subjectId) {
                        contextSubj = currentTopicState.subjectId;
                    }
                } else {
                    if (typeof activeStudentSection !== 'undefined' && activeStudentSection) {
                        contextSec = activeStudentSection;
                    }
                    if (typeof activeStudentSubject !== 'undefined' && activeStudentSubject) {
                        contextSubj = activeStudentSubject;
                    } else if (typeof currentStudentTopicSubjectId !== 'undefined' && currentStudentTopicSubjectId) {
                        contextSubj = currentStudentTopicSubjectId;
                    }
                }
                if (!activeFilterSection && contextSec) {
                    activeFilterSection = contextSec;
                }
                if (!activeFilterSubject && contextSubj) {
                    activeFilterSubject = contextSubj;
                }
                if (!activeFilterSubject && activeCards.length > 0) {
                    const matchedCard = activeFilterSection ? activeCards.find(c => (c.section || c.sectionName) === activeFilterSection) : activeCards[0];
                    const selected = matchedCard || activeCards[0];
                    activeFilterSubject = selected.subject || selected.name || selected.id;
                    if (!activeFilterSection) {
                        activeFilterSection = selected.section || selected.sectionName || '';
                    }
                }
            }

            if (role === 'student') {
                return;
            }

            const activeCards = getConnectedSectionsList(role);

            if (activeCards.length === 0 && !activeFilterSubject) {
                layout.innerHTML = `
                    <div class="w-full min-h-[calc(100vh-var(--shell-offset))] bg-white py-6 px-4 md:px-8 flex flex-col items-center justify-center" style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;">
                        <div class="max-w-[1280px] w-full flex flex-col items-center justify-center py-20 text-center select-none">
                            <div class="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-center mb-4 shadow-sm">
                                <i class="fa-solid fa-clipboard-list text-3xl text-black-fade"></i>
                            </div>
                            <h2 class="text-base md:text-lg font-bold text-black tracking-tight font-['Inter'] mb-1">No Assessments Available</h2>
                            <p class="text-xs md:text-sm text-black-fade max-w-sm font-['Inter']">No subjects or assessments have been published yet.</p>
                        </div>
                    </div>
                `;
                return;
            }

            // Compute display subject name and section
            let displaySubjectName = activeFilterSubject || 'Subject';
            let displaySection = activeFilterSection || '';

            const matchedCard = activeCards.find(c => isSubjectMatch({ subject: c.subject || c.name, subjectId: c.id, cardId: c.id, section: c.section }, activeFilterSubject));
            if (matchedCard) {
                displaySubjectName = matchedCard.subject || matchedCard.name || displaySubjectName;
                if (!displaySection) {
                    displaySection = matchedCard.section || matchedCard.sectionName || '';
                }
            }

            // Ensure activeFilterStudent is resolved for teacher
            if (isTeacher) {
                if (activeFilterStudent === null || activeFilterStudent === undefined || activeFilterStudent === '') {
                    activeFilterStudent = (typeof currentTopicState !== 'undefined' && currentTopicState?.selectedStudent) 
                        ? currentTopicState.selectedStudent 
                        : (typeof window.getPersistedTopicStudent === 'function' ? window.getPersistedTopicStudent(activeFilterSubject, displaySection) : 'All');
                }

                // Sync currentTopicState
                if (typeof currentTopicState !== 'undefined') {
                    currentTopicState.subjectId = activeFilterSubject || currentTopicState.subjectId;
                    currentTopicState.selectedSection = displaySection || currentTopicState.selectedSection;
                    currentTopicState.selectedStudent = activeFilterStudent || 'All';
                }
            } else {
                activeFilterStudent = null;
            }

            const rows = buildUnifiedAssessmentRows(role, activeFilterStudent);

            // Set topbar header: Small scale top line (Section), Big scale bottom line (Subject Name)
            const navContextText = document.getElementById('nav-context-text') || document.getElementById('header-brand-title');
            if (navContextText) {
                if (displaySection) {
                    navContextText.className = 'admin-topbar__brand-label text-black has-breadcrumb';
                    navContextText.innerHTML = `
                        <div class="breadcrumb-line-group">
                            <span class="breadcrumb-subject">${escapeHtml(displaySection)}</span>
                            <span class="breadcrumb-topic">${escapeHtml(displaySubjectName)}</span>
                        </div>
                    `;
                } else {
                    navContextText.className = 'admin-topbar__brand-label text-black';
                    navContextText.textContent = displaySubjectName;
                }
            }

            layout.innerHTML = `
                <div class="w-full min-h-[calc(100vh-var(--shell-offset))] bg-white py-6 px-4 md:px-8 flex flex-col items-center" style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;">
                    <div class="max-w-[1520px] w-full flex flex-col lg:flex-row items-start gap-6">
                        
                        <!-- Bubble Panel of Assessments Table (Left Side) -->
                        <div class="bg-white border border-slate-200 rounded-2xl standard-panel-shadow overflow-hidden flex-1 min-w-0 w-full flex flex-col">
                            <div class="overflow-x-auto w-full scrollbar-hide flex-1" style="-webkit-overflow-scrolling: touch;">
                                <table class="w-full text-left border-collapse min-w-[840px]" style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;">
                                    <thead style="background-color: #15803d !important;">
                                        <tr class="select-none" style="background-color: #15803d !important;">
                                            <th style="background-color: #15803d !important; color: #ffffff !important;" class="px-5 py-3.5 text-xs md:text-sm font-bold text-white tracking-normal text-left font-['Inter'] w-auto min-w-[220px] whitespace-nowrap">
                                                <div class="inline-flex items-center gap-2.5">
                                                    <button type="button"
                                                        onclick="window.AssessmentsPage.exitAssessmentsPage('${role}');"
                                                        title="Back to Classroom"
                                                        class="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white text-[#15803d] hover:bg-slate-100 active:bg-slate-200 cursor-pointer select-none focus:outline-none shrink-0 -ml-1 shadow-2xs">
                                                        <i class="fa-solid fa-arrow-left text-xs text-[#15803d]"></i>
                                                    </button>
                                                    <span>Assessment</span>
                                                </div>
                                            </th>
                                            <th style="background-color: #15803d !important; color: #ffffff !important;" class="px-3 py-3.5 text-xs md:text-sm font-bold text-white tracking-normal text-center w-[95px] min-w-[95px] whitespace-nowrap font-['Inter']">Start</th>
                                            <th style="background-color: #15803d !important; color: #ffffff !important;" class="px-3 py-3.5 text-xs md:text-sm font-bold text-white tracking-normal text-center w-[95px] min-w-[95px] whitespace-nowrap font-['Inter']">Due</th>
                                            <th style="background-color: #15803d !important; color: #ffffff !important;" class="px-3 py-3.5 text-xs md:text-sm font-bold text-white tracking-normal text-center w-[95px] min-w-[95px] whitespace-nowrap font-['Inter']">Weight (%)</th>
                                            <th style="background-color: #15803d !important; color: #ffffff !important;" class="px-3 py-3.5 text-xs md:text-sm font-bold text-white tracking-normal text-center w-[95px] min-w-[95px] whitespace-nowrap font-['Inter']">Submitted</th>
                                            <th style="background-color: #15803d !important; color: #ffffff !important;" class="px-3 py-3.5 text-xs md:text-sm font-bold text-white tracking-normal text-center w-[95px] min-w-[95px] whitespace-nowrap font-['Inter']">Graded</th>
                                            <th style="background-color: #15803d !important; color: #ffffff !important;" class="px-3 py-3.5 text-xs md:text-sm font-bold text-white tracking-normal text-center w-[80px] min-w-[80px] whitespace-nowrap font-['Inter']">Score</th>
                                            <th style="background-color: #15803d !important; color: #ffffff !important;" class="px-4 py-3.5 text-xs md:text-sm font-bold text-white tracking-normal text-center w-[90px] min-w-[90px] whitespace-nowrap font-['Inter']">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody id="assessments-body" class="divide-y divide-slate-100"></tbody>
                                </table>
                            </div>
                        </div>

                    </div>
                </div>
            `;

            const body = layout.querySelector('#assessments-body');

            function getFilteredRows() {
                if (!activeFilterSubject && !activeFilterSection) {
                    return [];
                }
                return rows.filter(row => isRowMatch(row, activeFilterSubject, activeFilterSection));
            }

            function renderAssessmentPageRows() {
                const filteredRows = getFilteredRows();

                if (filteredRows.length === 0) {
                    // Empty State with black fade icon and subtitle
                    body.innerHTML = `
                        <tr>
                            <td colspan="8" class="py-24 text-center">
                                <div class="flex flex-col items-center justify-center select-none py-8" style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;">
                                    <div class="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-center mb-3">
                                        <i class="fa-solid fa-clipboard-list text-2xl icon-black-fade" style="color: rgba(0, 0, 0, 0.40) !important;"></i>
                                    </div>
                                    <div class="text-sm font-semibold text-black tracking-tight mb-1 font-['Inter']">No Assessments Found</div>
                                    <p class="text-xs text-black-fade max-w-xs leading-relaxed font-['Inter']">There are no assessments assigned or published for this subject and section yet.</p>
                                </div>
                            </td>
                        </tr>
                    `;
                    return;
                }

                let html = '';
                filteredRows.forEach((row, i) => {
                    const actText = row.activity || '';
                    const isLong = actText.length > 40;
                    html += `
                    <tr class="hover:bg-slate-50/80 transition-colors ${i % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}">
                        <td class="assessment-title-col pl-[54px] pr-5 py-3.5 text-left align-middle font-['Inter'] w-auto min-w-[220px]">
                            <button type="button" class="assessment-title-btn group text-left inline-block max-w-full cursor-pointer focus:outline-none" onclick="if (typeof window.openTopicContent === 'function') { window.openTopicContent('${escapeHtml(row.subjectId)}', ${row.topicIdx}, 'assessments', ${row.unifiedIdx !== undefined ? row.unifiedIdx : row.itemIdx}, true, { selectedSection: '${escapeHtml(displaySection)}', selectedStudent: '${escapeHtml(activeFilterStudent || (typeof currentTopicState !== 'undefined' ? currentTopicState.selectedStudent : ''))}' }); }">
                                <span class="assessment-title-text ${isLong ? 'text-[12px] leading-tight' : 'text-[13px] leading-snug'} font-medium font-['Inter'] text-black block">
                                    ${escapeHtml(actText)}
                                </span>
                            </button>
                        </td>
                        <td class="px-3 py-3.5 text-center align-middle whitespace-nowrap font-['Inter'] w-[95px] min-w-[95px]">${formatAssessmentDate(row.startDate, row.startTime)}</td>
                        <td class="px-3 py-3.5 text-center align-middle whitespace-nowrap font-['Inter'] w-[95px] min-w-[95px]">${formatAssessmentDate(row.dueDate, row.dueTime)}</td>
                        <td class="px-3 py-3.5 text-center align-middle whitespace-nowrap font-['Inter'] w-[95px] min-w-[95px]"><span class="text-[13px] font-medium text-black font-['Inter']">${row.weight}%</span></td>
                        <td class="px-3 py-3.5 text-center align-middle whitespace-nowrap font-['Inter'] w-[95px] min-w-[95px]">${formatAssessmentDate(row.submittedOn)}</td>
                        <td class="px-3 py-3.5 text-center align-middle whitespace-nowrap font-['Inter'] w-[95px] min-w-[95px]">${formatAssessmentDate(row.gradedOn)}</td>
                        <td class="px-3 py-3.5 text-center align-middle whitespace-nowrap font-['Inter'] w-[80px] min-w-[80px]">
                            ${row.score !== null && row.score !== undefined
                                ? (row.score === '--'
                                    ? '<span class="text-black-fade font-bold text-[13px] select-none font-[\'Inter\']" style="color: rgba(0, 0, 0, 0.4) !important;">--</span>'
                                    : `<span class="text-[13px] font-semibold text-black font-['Inter']">${row.score}</span>`)
                                : '<span class="text-black-fade font-normal text-[13px] select-none font-[\'Inter\']" style="color: rgba(0, 0, 0, 0.4) !important;">-</span>'}
                        </td>
                        <td class="px-4 py-3.5 text-center align-middle whitespace-nowrap font-['Inter'] w-[90px] min-w-[90px]">${getStatusBadge(row.status)}</td>
                    </tr>
                    `;
                });
                body.innerHTML = html;
            }

            renderAssessmentPageRows();
        } catch (error) {
            console.error('Failed to render assessments page:', error);
        }
    }

    function onSectionChange(newSection) {
        activeFilterSection = newSection;
        activeFilterStudent = 'All';
        if (typeof currentTopicState !== 'undefined') {
            currentTopicState.selectedSection = newSection;
            currentTopicState.selectedStudent = 'All';
        }
        if (typeof window.openTopicSectionFromRail === 'function') {
            window.openTopicSectionFromRail(newSection);
            return;
        }
        const role = (document.getElementById('teacher-header') || window.location.pathname.includes('teacher') ? 'teacher' : 'student');
        renderAssessmentsPage(activeFilterSubject, role, activeFilterSection, activeFilterStudent);
    }

    function openStudentPicker() {
        const section = activeFilterSection || '';
        if (!section) return;

        let students = (typeof studentsBySection !== 'undefined' ? studentsBySection[section] : []) || [];
        if ((!students || !students.length) && typeof window.getStudentsForSection === 'function') {
            students = window.getStudentsForSection(section);
        }
        if ((!students || !students.length) && typeof window.getUnifiedSectionStudents === 'function') {
            const raw = window.getUnifiedSectionStudents(section);
            students = (raw || []).map(s => typeof s === 'string' ? { name: s } : s);
        }
        const selected = activeFilterStudent || 'All';
        const isAllSelected = (selected === 'All' || !selected);

        const overlay = document.createElement('div');
        overlay.id = 'assessments-student-picker-overlay';
        overlay.className = 'topic-student-picker-overlay';
        overlay.onclick = function (e) {
            if (e.target === overlay) closeStudentPicker();
        };

        overlay.innerHTML = `
            <div class="topic-student-picker-panel" onclick="event.stopPropagation()">
                <div class="topic-student-picker-header">
                    <div>
                        <p class="topic-student-picker-kicker">Students</p>
                        <p class="topic-student-picker-section">${escapeHtml(section)}</p>
                    </div>
                    <button type="button" class="topic-student-picker-exit" onclick="window.AssessmentsPage.closeStudentPicker()" title="Close">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
                <div class="topic-student-picker-list" id="assessments-student-picker-list">
                    <!-- 'All' Option at the top -->
                    <button type="button"
                        class="topic-student-item ${isAllSelected ? 'topic-student-item--active' : ''}"
                        onclick="window.AssessmentsPage.selectStudent('All')"
                        data-name="All"
                    >
                        <span class="topic-student-item-avatar flex items-center justify-center bg-slate-100 text-slate-600"><i class="fa-solid fa-users text-[11px] text-slate-600"></i></span>
                        <span class="topic-student-item-name">All</span>
                    </button>

                    ${students.map(s => {
                        const sName = typeof s === 'string' ? s : (s.name || `${s.lastName || ''}, ${s.firstName || ''}`.trim());
                        const isStudentActive = (!isAllSelected && sName === selected);
                        const avatarHtml = typeof window.renderUserAvatarHtml === 'function'
                            ? window.renderUserAvatarHtml(s, 'sm')
                            : `<span class="topic-student-item-avatar">${escapeHtml(sName.charAt(0))}</span>`;
                        return `
                            <button type="button"
                                class="topic-student-item ${isStudentActive ? 'topic-student-item--active' : ''}"
                                onclick="window.AssessmentsPage.selectStudent('${escapeHtml(sName)}')"
                                data-name="${escapeHtml(sName)}"
                            >
                                ${avatarHtml}
                                <span class="topic-student-item-name">${escapeHtml(sName)}</span>
                            </button>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.classList.add('topic-student-picker-overlay--visible');
    }

    function closeStudentPicker() {
        const overlay = document.getElementById('assessments-student-picker-overlay') || document.getElementById('topic-student-picker-overlay');
        if (!overlay) return;
        overlay.remove();
    }

    function selectStudent(studentName) {
        activeFilterStudent = studentName || 'All';
        if (typeof currentTopicState !== 'undefined') {
            currentTopicState.selectedStudent = activeFilterStudent;
        }
        if (typeof window.setPersistedTopicStudent === 'function') {
            window.setPersistedTopicStudent(activeFilterSubject || currentTopicState?.subjectId, activeFilterSection || currentTopicState?.selectedSection, activeFilterStudent);
        }
        closeStudentPicker();
        const role = (document.getElementById('teacher-header') || window.location.pathname.includes('teacher') ? 'teacher' : 'student');
        renderAssessmentsPage(activeFilterSubject, role, activeFilterSection, activeFilterStudent);
    }

    function openStudentAssessmentsPage(subjectName, sectionName, studentName) {
        if (typeof window.resolveStudentClassroomId === 'function' && (subjectName || activeFilterSubject)) {
            const resolved = window.resolveStudentClassroomId(subjectName || activeFilterSubject);
            if (resolved) {
                window.activeStudentClassroomId = resolved;
                try { sessionStorage.setItem('sigma-last-active-classroom', resolved); } catch (e) {}
            }
        }
        if (typeof window.switchStudentRoomTab === 'function' && window.activeStudentClassroomId) {
            window.switchStudentRoomTab('topics');
            return;
        }
        if (typeof window.openTopicSectionFromRail === 'function' && (sectionName || activeFilterSection)) {
            window.openTopicSectionFromRail(sectionName || activeFilterSection);
            return;
        }
        if (typeof window.switchTab === 'function') {
            window.switchTab('nav-classrooms');
        }
    }

    function openTeacherAssessmentsPage(subjectName, sectionName, studentName) {
        activeFilterSubject = subjectName || activeFilterSubject;
        activeFilterSection = sectionName || activeFilterSection || null;
        if (studentName !== undefined) {
            activeFilterStudent = studentName;
        }
        currentAssessmentPage = 1;
        if (typeof window.switchTab === 'function') {
            window.switchTab('nav-assessments');
        } else if (typeof switchTab === 'function') {
            switchTab('nav-assessments');
        }
        renderAssessmentsPage(activeFilterSubject, 'teacher', activeFilterSection, activeFilterStudent);
    }

    function selectSubject(subjectName, role, sectionName) {
        renderAssessmentsPage(subjectName, role, sectionName);
    }

    function exitAssessmentsPage(role) {
        if (role === 'teacher') {
            if (activeFilterSection && typeof window.showClassDetailTab === 'function') {
                window.showClassDetailTab('room');
                return;
            }
            if (activeFilterSection && typeof window.showStudentList === 'function') {
                window.showStudentList(activeFilterSection, activeFilterSubject, 'room');
                return;
            }
            if (typeof window.switchTab === 'function') {
                window.switchTab('nav-classes');
                return;
            }
            if (typeof window.history.back === 'function') {
                window.history.back();
                return;
            }
        } else {
            let targetClassroomId = (typeof window.activeStudentClassroomId !== 'undefined' && window.activeStudentClassroomId)
                || (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('sigma-last-active-classroom'))
                || null;

            if (!targetClassroomId && activeFilterSubject) {
                if (typeof window.resolveStudentClassroomId === 'function') {
                    targetClassroomId = window.resolveStudentClassroomId(activeFilterSubject);
                }
                if (!targetClassroomId && window.classroomData) {
                    const clean = String(activeFilterSubject).toLowerCase().trim();
                    for (const [cId, cData] of Object.entries(window.classroomData)) {
                        const sName = String(cData?.subject || cData?.name || '').toLowerCase().trim();
                        if (sName === clean || sName.includes(clean) || clean.includes(sName)) {
                            targetClassroomId = cId;
                            break;
                        }
                    }
                }
            }

            if (!targetClassroomId && typeof window.getStudentSectionClassItems === 'function') {
                const enrolled = window.getStudentSectionClassItems() || [];
                if (enrolled.length > 0) targetClassroomId = enrolled[0].id;
            }

            if (targetClassroomId && typeof window.showClassroomDetail === 'function') {
                window.showClassroomDetail(targetClassroomId, true, 'room');
                return;
            }
            if (typeof window.switchTab === 'function') {
                window.switchTab('nav-home');
                return;
            }
            if (typeof window.history.back === 'function') {
                window.history.back();
                return;
            }
        }
    }

    // Real-time synchronization when submissions are passed in workstation or other tabs
    window.addEventListener('storage', (e) => {
        if (!e.key) return;
        if (e.key.startsWith('sigma_sub_') || e.key.startsWith('sigma_submission_') || e.key.includes('assessment') || e.key.includes('subject')) {
            const tableBody = document.getElementById('assessments-body');
            if (tableBody) {
                try {
                    const role = (document.getElementById('teacher-header') || window.location.pathname.includes('teacher') ? 'teacher' : 'student');
                    renderAssessmentsPage(activeFilterSubject, role, activeFilterSection, activeFilterStudent);
                } catch(err) {}
            }
        }
    });

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            const tableBody = document.getElementById('assessments-body');
            if (tableBody) {
                try {
                    const role = (document.getElementById('teacher-header') || window.location.pathname.includes('teacher') ? 'teacher' : 'student');
                    renderAssessmentsPage(activeFilterSubject, role, activeFilterSection, activeFilterStudent);
                } catch(err) {}
            }
        }
    });

    // Global exports
    window.AssessmentsPage = {
        renderAssessmentsPage: renderAssessmentsPage,
        exitAssessmentsPage: exitAssessmentsPage,
        selectSubject: selectSubject,
        openStudentAssessmentsPage: openStudentAssessmentsPage,
        openTeacherAssessmentsPage: openTeacherAssessmentsPage,
        buildAssessmentRows: buildUnifiedAssessmentRows,
        formatAssessmentDate: formatAssessmentDate,
        onSectionChange: onSectionChange,
        openStudentPicker: openStudentPicker,
        closeStudentPicker: closeStudentPicker,
        selectStudent: selectStudent
    };

    window.openStudentAssessmentsPage = openStudentAssessmentsPage;
    window.openTeacherAssessmentsPage = openTeacherAssessmentsPage;
    window.openAssessmentsStudentPicker = openStudentPicker;
    window.renderAssessmentsPage = renderAssessmentsPage;
    window.renderTeacherAssessmentsPage = (subj, sec, stud) => renderAssessmentsPage(subj, 'teacher', sec, stud);

})();
