/* Activity audit trail for Sigma ELMS.
 * Captures comprehensive platform operations performed by Administrators, Teachers, and Students.
 */
(function () {
    'use strict';

    const KEY = 'sigma-activity-logs-v1';
    let selectedUser = null;
    let selectedCategory = 'All Activities';
    let detailQuery = '';

    const dateFormat = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Manila',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });

    const formatDate = value => {
        if (!value) return 'Not recorded';
        const parsed = Date.parse(value);
        return Number.isFinite(parsed) ? dateFormat.format(new Date(parsed)) : String(value);
    };

    const clean = value => String(value || '').trim();
    const esc = value => clean(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    // Module badge color mapping
    const moduleBadgeStyles = {
        'System': 'bg-slate-100 text-slate-700 border-slate-200',
        'Grades': 'bg-emerald-50 text-emerald-700 border-emerald-200',
        'Assessments': 'bg-purple-50 text-purple-700 border-purple-200',
        'Curriculum': 'bg-blue-50 text-blue-700 border-blue-200',
        'Submissions': 'bg-amber-50 text-amber-700 border-amber-200',
        'Users': 'bg-sky-50 text-sky-700 border-sky-200',
        'Security': 'bg-red-50 text-red-700 border-red-200',
        'Announcements': 'bg-teal-50 text-teal-700 border-teal-200',
        'Classes': 'bg-indigo-50 text-indigo-700 border-indigo-200',
        'AI Assistant': 'bg-violet-50 text-violet-700 border-violet-200',
        'Communication': 'bg-cyan-50 text-cyan-700 border-cyan-200'
    };

    const getModuleBadgeClass = mod => {
        const key = Object.keys(moduleBadgeStyles).find(k => k.toLowerCase() === clean(mod).toLowerCase());
        return moduleBadgeStyles[key] || 'bg-slate-100 text-slate-700 border-slate-200';
    };

    // User lookup helper
    function getRegisteredAccounts() {
        try {
            const list = JSON.parse(localStorage.getItem('sigma-admin-users') || '[]');
            return Array.isArray(list) ? list : [];
        } catch (_) { return []; }
    }

    function resolveAccount(userId) {
        if (!userId) return null;
        const accounts = getRegisteredAccounts();
        return accounts.find(u => [u.id, u.uid, u.userId, u.lrn, u.studentNumber, u.employeeId]
            .some(v => v != null && String(v).trim().toLowerCase() === String(userId).trim().toLowerCase()));
    }

    // Baseline catalog of actions across all roles and system corners
    function generateBaselineLogs() {
        const now = Date.now();
        const m = min => new Date(now - min * 60 * 1000).toISOString();
        const h = hrs => new Date(now - hrs * 3600 * 1000).toISOString();
        const d = days => new Date(now - days * 86400 * 1000).toISOString();

        return [
            // Admin actions
            {
                id: 'act-adm-001',
                userId: 'ADM-2026-001',
                userName: 'Master Admin',
                userRole: 'Administrator',
                userAvatar: '',
                activity: 'Updated School Year Configuration',
                module: 'System',
                details: 'Set active academic term to 2026–2027 Quarter 1 and published calendar dates',
                timestamp: m(15)
            },
            {
                id: 'act-adm-002',
                userId: 'ADM-2026-001',
                userName: 'Master Admin',
                userRole: 'Administrator',
                userAvatar: '',
                activity: 'Modified AI Routing Provider',
                module: 'System',
                details: 'Switched primary LLM routing provider to Gemini 2.0 Flash with auto-fallback',
                timestamp: m(48)
            },
            {
                id: 'act-adm-003',
                userId: 'ADM-2026-001',
                userName: 'Master Admin',
                userRole: 'Administrator',
                userAvatar: '',
                activity: 'Created Academic Section',
                module: 'Classes',
                details: 'Added Grade 10 - Rizal (Senior High Track, Max Capacity: 45 students)',
                timestamp: h(2)
            },
            {
                id: 'act-adm-004',
                userId: 'ADM-2026-001',
                userName: 'Master Admin',
                userRole: 'Administrator',
                userAvatar: '',
                activity: 'Assigned Class Adviser',
                module: 'Classes',
                details: 'Assigned Jane Smith as official class adviser for Grade 10 - Rizal',
                timestamp: h(3)
            },
            {
                id: 'act-adm-005',
                userId: 'ADM-2026-001',
                userName: 'Master Admin',
                userRole: 'Administrator',
                userAvatar: '',
                activity: 'Created User Account',
                module: 'Users',
                details: 'Created faculty credentials for Sarah Connor (TCH-2026-015, Science Dept)',
                timestamp: h(4)
            },
            {
                id: 'act-adm-006',
                userId: 'ADM-2026-001',
                userName: 'Master Admin',
                userRole: 'Administrator',
                userAvatar: '',
                activity: 'Updated User Profile',
                module: 'Users',
                details: 'Modified contact telephone and official department for Mark Kevin (TCH-2026-002)',
                timestamp: h(6)
            },
            {
                id: 'act-adm-007',
                userId: 'ADM-2026-001',
                userName: 'Master Admin',
                userRole: 'Administrator',
                userAvatar: '',
                activity: 'Reset User Password',
                module: 'Security',
                details: 'Generated temporary login credentials for student Stanley Tan upon verification',
                timestamp: h(8)
            },
            {
                id: 'act-adm-008',
                userId: 'ADM-2026-001',
                userName: 'Master Admin',
                userRole: 'Administrator',
                userAvatar: '',
                activity: 'Published Campus Announcement',
                module: 'Announcements',
                details: 'Broadcasted campus-wide notice: Midterm Assessment Schedule and Guidelines',
                timestamp: h(12)
            },
            {
                id: 'act-adm-009',
                userId: 'ADM-2026-001',
                userName: 'Master Admin',
                userRole: 'Administrator',
                userAvatar: '',
                activity: 'Pinned Global Announcement',
                module: 'Announcements',
                details: 'Pinned portal banner: Scheduled Database Maintenance Window on Sunday 2:00 AM',
                timestamp: d(1)
            },
            {
                id: 'act-adm-010',
                userId: 'ADM-2026-001',
                userName: 'Master Admin',
                userRole: 'Administrator',
                userAvatar: '',
                activity: 'Updated Security & reCAPTCHA Policy',
                module: 'Security',
                details: 'Enforced score threshold 0.7 for all teacher and administrative login requests',
                timestamp: d(1.5)
            },
            {
                id: 'act-adm-011',
                userId: 'ADM-2026-001',
                userName: 'Master Admin',
                userRole: 'Administrator',
                userAvatar: '',
                activity: 'Exported Audit Trail Report',
                module: 'System',
                details: 'Generated and downloaded CSV audit report covering recent authentication logs',
                timestamp: d(2)
            },
            {
                id: 'act-adm-012',
                userId: 'ADM-2026-001',
                userName: 'Master Admin',
                userRole: 'Administrator',
                userAvatar: '',
                activity: 'Restored Archived System Record',
                module: 'System',
                details: 'Restored curriculum topic #402 from Record Recovery workstation',
                timestamp: d(3)
            },

            // Teacher actions (Jane Smith, Mark Kevin)
            {
                id: 'act-tch-001',
                userId: 'TCH-2026-001',
                userName: 'Jane Smith',
                userRole: 'Teacher',
                userAvatar: '',
                activity: 'Modified Grade Entry - Math 101',
                module: 'Grades',
                details: 'Updated Quarter 1 Written Work scores for Grade 10 - Section Emerald',
                timestamp: m(32)
            },
            {
                id: 'act-tch-002',
                userId: 'TCH-2026-001',
                userName: 'Jane Smith',
                userRole: 'Teacher',
                userAvatar: '',
                activity: 'Created Assessment',
                module: 'Assessments',
                details: 'Created draft for "Quarter 1 Mathematics Mastery Examination" (50 items, 60 mins)',
                timestamp: h(1)
            },
            {
                id: 'act-tch-003',
                userId: 'TCH-2026-001',
                userName: 'Jane Smith',
                userRole: 'Teacher',
                userAvatar: '',
                activity: 'Published Scheduled Assessment',
                module: 'Assessments',
                details: 'Published "Algebra & Functions Quiz 2" with deadline set to Oct 22, 2026',
                timestamp: h(3)
            },
            {
                id: 'act-tch-004',
                userId: 'TCH-2026-001',
                userName: 'Jane Smith',
                userRole: 'Teacher',
                userAvatar: '',
                activity: 'Graded Coursework Submission',
                module: 'Submissions',
                details: 'Evaluated problem set submission for Stanley Tan (Score: 98/100, Excellent work)',
                timestamp: h(5)
            },
            {
                id: 'act-tch-005',
                userId: 'TCH-2026-001',
                userName: 'Jane Smith',
                userRole: 'Teacher',
                userAvatar: '',
                activity: 'Uploaded Lesson Module',
                module: 'Curriculum',
                details: 'Uploaded study material "Unit 2 - Polynomial Equations & Graphs.pdf"',
                timestamp: h(7)
            },
            {
                id: 'act-tch-006',
                userId: 'TCH-2026-001',
                userName: 'Jane Smith',
                userRole: 'Teacher',
                userAvatar: '',
                activity: 'Submitted Quarter Grades for Approval',
                module: 'Grades',
                details: 'Submitted Quarter 1 gradebook for Section Emerald to Department Head',
                timestamp: d(1)
            },
            {
                id: 'act-tch-007',
                userId: 'TCH-2026-001',
                userName: 'Jane Smith',
                userRole: 'Teacher',
                userAvatar: '',
                activity: 'Recorded Daily Class Attendance',
                module: 'Classes',
                details: 'Recorded attendance for Section Emerald (39 Present, 1 Excused, 0 Absent)',
                timestamp: d(1.2)
            },
            {
                id: 'act-tch-008',
                userId: 'TCH-2026-001',
                userName: 'Jane Smith',
                userRole: 'Teacher',
                userAvatar: '',
                activity: 'Posted Class Announcement',
                module: 'Announcements',
                details: 'Posted class bulletin: "Reminder to bring scientific calculator for Thursday quiz"',
                timestamp: d(2)
            },

            // Teacher actions (Mark Kevin)
            {
                id: 'act-tch-009',
                userId: 'TCH-2026-002',
                userName: 'Mark Kevin',
                userRole: 'Teacher',
                userAvatar: '',
                activity: 'Created Interactive Topic',
                module: 'Curriculum',
                details: 'Created interactive lesson topic: "Cellular Mitosis & Microscopic Phases"',
                timestamp: m(55)
            },
            {
                id: 'act-tch-010',
                userId: 'TCH-2026-002',
                userName: 'Mark Kevin',
                userRole: 'Teacher',
                userAvatar: '',
                activity: 'Released Topic Learning Content',
                module: 'Curriculum',
                details: 'Released Week 4 curriculum readings to all enrolled Biology 10 sections',
                timestamp: h(4)
            },
            {
                id: 'act-tch-011',
                userId: 'TCH-2026-002',
                userName: 'Mark Kevin',
                userRole: 'Teacher',
                userAvatar: '',
                activity: 'Reopened Assessment Submission',
                module: 'Assessments',
                details: 'Granted 24-hour individual resubmission window for Stanley Tan (STU-2026-001)',
                timestamp: h(9)
            },
            {
                id: 'act-tch-012',
                userId: 'TCH-2026-002',
                userName: 'Mark Kevin',
                userRole: 'Teacher',
                userAvatar: '',
                activity: 'Exported Gradebook Master Sheet',
                module: 'Grades',
                details: 'Generated Excel master grade sheet for Grade 10 - Section Einstein',
                timestamp: d(2.5)
            },

            // Student actions (Stanley Tan)
            {
                id: 'act-stu-001',
                userId: 'STU-2026-001',
                userName: 'Stanley Tan',
                userRole: 'Student',
                userAvatar: '',
                activity: 'Turned in Assignment Submission',
                module: 'Submissions',
                details: 'Uploaded solution file "Lab Report 3 - Chemical Reactions & Catalysts.pdf"',
                timestamp: m(10)
            },
            {
                id: 'act-stu-002',
                userId: 'STU-2026-001',
                userName: 'Stanley Tan',
                userRole: 'Student',
                userAvatar: '',
                activity: 'Submitted Assessment Answers',
                module: 'Assessments',
                details: 'Completed and submitted "Biology Unit 1 Quiz" (Score: 48/50, 96%)',
                timestamp: m(40)
            },
            {
                id: 'act-stu-003',
                userId: 'STU-2026-001',
                userName: 'Stanley Tan',
                userRole: 'Student',
                userAvatar: '',
                activity: 'Started Timed Assessment',
                module: 'Assessments',
                details: 'Initiated attempt for "Quarter 1 Mathematics Examination" (Attempt 1 of 1)',
                timestamp: h(1.5)
            },
            {
                id: 'act-stu-004',
                userId: 'STU-2026-001',
                userName: 'Stanley Tan',
                userRole: 'Student',
                userAvatar: '',
                activity: 'Accessed Learning Module',
                module: 'Curriculum',
                details: 'Downloaded lecture document "Chapter 2 - Newtonian Dynamics Reference Guide.pdf"',
                timestamp: h(3.5)
            },
            {
                id: 'act-stu-005',
                userId: 'STU-2026-001',
                userName: 'Stanley Tan',
                userRole: 'Student',
                userAvatar: '',
                activity: 'Viewed Graded Assessment Results',
                module: 'Assessments',
                details: 'Viewed question-by-question answer key and teacher notes for Quiz 1',
                timestamp: h(6)
            },
            {
                id: 'act-stu-006',
                userId: 'STU-2026-001',
                userName: 'Stanley Tan',
                userRole: 'Student',
                userAvatar: '',
                activity: 'Consulted SigmaBot AI Tutor',
                module: 'AI Assistant',
                details: 'Queried step-by-step factoring method for quadratic equations with negative coefficients',
                timestamp: h(10)
            },
            {
                id: 'act-stu-007',
                userId: 'STU-2026-001',
                userName: 'Stanley Tan',
                userRole: 'Student',
                userAvatar: '',
                activity: 'Viewed Academic Gradebook Report',
                module: 'Grades',
                details: 'Accessed Quarter 1 summary report card and verified transmutation remarks',
                timestamp: d(1.8)
            },
            {
                id: 'act-stu-008',
                userId: 'STU-2026-001',
                userName: 'Stanley Tan',
                userRole: 'Student',
                userAvatar: '',
                activity: 'Resubmitted Coursework Assignment',
                module: 'Submissions',
                details: 'Uploaded revised version 2 of English Thesis Abstract upon feedback',
                timestamp: d(3.2)
            }
        ];
    }

    const read = () => {
        try {
            const raw = localStorage.getItem(KEY);
            let items = raw ? JSON.parse(raw) : null;
            if (!Array.isArray(items) || !items.length) {
                items = generateBaselineLogs();
                localStorage.setItem(KEY, JSON.stringify(items));
            }
            return items.map(item => {
                let details = item.details || item.description || '';
                if (details === '—' || details === '--' || details === '-') details = '';
                if (!details) {
                    if (item.announcementId || item.module === 'Announcements') {
                        details = [item.title ? `"${item.title}"` : '', item.audience ? `Audience: ${item.audience}` : '', item.section ? `Section: ${item.section}` : '', item.subjectId ? `Subject: ${item.subjectId}` : ''].filter(Boolean).join(' · ');
                    }
                    if (!details) {
                        details = [item.assessment, item.section, item.subjectId].filter(Boolean).join(' · ');
                    }
                }
                return {
                    id: item.id || `act-${Math.random().toString(36).slice(2, 8)}`,
                    userId: item.userId || item.actorId || 'ID not recorded',
                    userName: item.userName || item.actor || 'User',
                    userRole: item.userRole || item.role || 'User',
                    userAvatar: item.userAvatar || item.avatar || '',
                    activity: item.activity || item.action || 'Activity Recorded',
                    module: item.module || 'System',
                    details: details || '',
                    timestamp: item.timestamp || new Date().toISOString()
                };
            });
        } catch (_) {
            return generateBaselineLogs();
        }
    };

    const write = records => {
        try {
            localStorage.setItem(KEY, JSON.stringify(records.slice(0, 1000)));
        } catch (e) {
            console.error('[Activity Logs] Storage save error:', e);
        }
    };

    function deleteActivityLog(id) {
        if (!id) return;
        try {
            const records = read();
            const filtered = records.filter(item => String(item.id) !== String(id));
            write(filtered);
            window.dispatchEvent(new CustomEvent('sigma-activity-logs-updated', { detail: { id, deleted: true } }));
            render();
            const table = document.querySelector('#audit-activity-view table[aria-label="Activity logs"]');
            if (table && window.SigmaLogPagination?.reset) {
                window.SigmaLogPagination.reset(table);
            }
        } catch (err) {
            console.error('[Activity Logs] Delete error:', err);
        }
    }

    function openUser(userRecord) {
        selectedUser = userRecord;
        selectedCategory = 'All Activities';
        detailQuery = '';
        window.pushModalHistoryState?.('activity-account-details', () => openUser(userRecord));
        render();
        const header = document.getElementById('activity-account-details');
        header?.scrollIntoView({ block: 'start' });
        header?.querySelector('h2')?.focus({ preventScroll: true });
    }

    function closeDetails() {
        selectedUser = null;
        selectedCategory = 'All Activities';
        detailQuery = '';
        render();
    }
    window.closeActivityLogDetails = closeDetails;

    function render() {
        const table = document.querySelector('#audit-activity-view table[aria-label="Activity logs"]');
        const body = document.getElementById('activity-log-rows') || table?.tBodies?.[0];
        if (!table || !body) return;

        const section = document.getElementById('audit-activity-view');
        section?.toggleAttribute('data-activity-detail-open', Boolean(selectedUser));
        if (selectedUser) {
            section?.setAttribute('data-ai-user-detail-open', 'true');
            table.parentElement?.classList.add('sigma-table-container--unframed', 'ai-log-message-frame');
            table.parentElement?.classList.remove('overflow-x-auto');
            table.classList.add('ai-log-history-table');
        } else {
            section?.removeAttribute('data-ai-user-detail-open');
            table.parentElement?.classList.remove('sigma-table-container--unframed', 'ai-log-message-frame');
            table.parentElement?.classList.add('overflow-x-auto');
            table.classList.remove('ai-log-history-table');
        }

        // Manage Drilldown Detail Header
        let header = document.getElementById('activity-account-details');
        if (!header) {
            header = document.createElement('section');
            header.id = 'activity-account-details';
            table.parentElement.before(header);
        }
        header.hidden = !selectedUser;
        header.replaceChildren();

        if (selectedUser) {
            const title = document.createElement('h2');
            title.className = 'ai-log-detail-title';
            title.tabIndex = -1;
            title.textContent = 'User Activity Details';

            const identity = document.createElement('div');
            identity.className = 'ai-log-detail-identity';
            const identityRow = document.createElement('div');
            identityRow.className = 'ai-log-detail-name-row';

            const avatarSpan = document.createElement('span');
            avatarSpan.className = 'ai-log-avatar';
            avatarSpan.setAttribute('aria-hidden', 'true');
            if (selectedUser.userAvatar) {
                const img = document.createElement('img');
                img.src = selectedUser.userAvatar;
                img.alt = '';
                avatarSpan.append(img);
            } else {
                avatarSpan.innerHTML = '<i class="fa-solid fa-user"></i>';
            }

            const textWrap = document.createElement('div');
            textWrap.className = 'ai-log-detail-identity-text';
            const userNameP = document.createElement('p');
            userNameP.className = 'ai-log-detail-name';
            userNameP.textContent = selectedUser.userName;

            const userMetaP = document.createElement('p');
            userMetaP.className = 'text-black-fade';
            const cleanUserId = String(selectedUser.userId || '').replace(/^ID:\s*/i, '');
            userMetaP.textContent = `${selectedUser.userRole || 'User'} | Account ID: ${cleanUserId || 'Not recorded'}`;

            textWrap.append(userNameP, userMetaP);
            identityRow.append(avatarSpan, textWrap);
            identity.append(identityRow);

            const toolbar = document.createElement('div');
            toolbar.className = 'ai-log-detail-toolbar';

            const tabs = document.createElement('div');
            tabs.className = 'ai-log-category-tabs';
            const categories = ['All Activities', 'System', 'Grades', 'Assessments', 'Curriculum', 'Submissions', 'Classes', 'Users'];
            categories.forEach(cat => {
                const tabBtn = document.createElement('button');
                tabBtn.type = 'button';
                tabBtn.textContent = cat;
                tabBtn.setAttribute('aria-pressed', String(selectedCategory === cat));
                tabBtn.onclick = () => {
                    selectedCategory = cat;
                    render();
                    if (window.SigmaLogPagination?.reset) window.SigmaLogPagination.reset(table);
                };
                tabs.append(tabBtn);
            });

            const searchForm = document.createElement('form');
            searchForm.className = 'ai-log-search';
            searchForm.setAttribute('role', 'search');
            const wrap = document.createElement('div');
            wrap.className = 'ai-log-search-input-wrap';
            const searchInput = document.createElement('input');
            searchInput.type = 'search';
            searchInput.className = 'sigma-input sigma-search-input';
            searchInput.placeholder = 'Search user activities...';
            searchInput.setAttribute('aria-label', searchInput.placeholder);
            searchInput.value = detailQuery;

            const submitBtn = document.createElement('button');
            submitBtn.type = 'submit';
            submitBtn.className = 'sigma-btn sigma-btn-primary';
            submitBtn.textContent = 'Search';

            searchForm.onsubmit = e => {
                e.preventDefault();
                detailQuery = searchInput.value.trim();
                render();
                if (window.SigmaLogPagination?.reset) window.SigmaLogPagination.reset(table);
            };
            searchInput.onsearch = () => {
                if (!searchInput.value) {
                    detailQuery = '';
                    render();
                    if (window.SigmaLogPagination?.reset) window.SigmaLogPagination.reset(table);
                }
            };

            wrap.append(searchInput);
            searchForm.append(wrap, submitBtn);
            toolbar.append(tabs, searchForm);

            header.append(title, identity, toolbar);
        }

        // Adjust Table Header depending on main table vs drilldown
        const thead = table.tHead || table.querySelector('thead');
        if (thead && thead.rows[0]) {
            const tr = thead.rows[0];
            tr.replaceChildren();
            if (selectedUser) {
                // In drilldown: Activity | Module | Details | Timestamp | Action
                [
                    { label: 'Activity', width: '22%' },
                    { label: 'Module', width: '14%' },
                    { label: 'Details', width: '40%' },
                    { label: 'Timestamp', width: '16%' },
                    { label: 'Action', width: '8%', className: 'text-center' }
                ].forEach(({ label, width, className }) => {
                    const th = document.createElement('th');
                    th.textContent = label;
                    if (width) th.style.width = width;
                    if (className) th.className = className;
                    tr.append(th);
                });
            } else {
                // In main table: User | Activity | Module | Timestamp (NO Action column on main table)
                ['User', 'Activity', 'Module', 'Timestamp'].forEach(label => {
                    const th = document.createElement('th');
                    th.textContent = label;
                    tr.append(th);
                });
            }
        }

        // Filter records
        const allRecords = read();
        const globalSearch = window.getAuditLogSearchQuery?.() || '';

        const records = allRecords.filter(item => {
            if (!item || !item.timestamp) return false;
            if (selectedUser) {
                // Must match the selected user
                if (item.userId !== selectedUser.userId) return false;
                // Category match
                if (selectedCategory !== 'All Activities' && clean(item.module).toLowerCase() !== selectedCategory.toLowerCase()) {
                    return false;
                }
                // Detail query search
                if (detailQuery) {
                    const haystack = [item.activity, item.module, item.details, formatDate(item.timestamp)].join(' ').toLowerCase();
                    if (!haystack.includes(detailQuery.toLowerCase())) return false;
                }
            } else {
                // Main overview table search
                if (globalSearch) {
                    const haystack = [item.userName, item.userId, item.userRole, item.activity, item.module, item.details, formatDate(item.timestamp)].join(' ').toLowerCase();
                    if (!haystack.includes(globalSearch.toLowerCase())) return false;
                }
            }
            return true;
        }).sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));

        body.replaceChildren();

        if (!records.length) {
            const row = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = selectedUser ? 5 : 4;
            td.className = 'text-center text-black-fade py-6';
            td.textContent = selectedUser
                ? (detailQuery ? 'No activities matching your search criteria.' : 'No activities recorded for this category.')
                : (globalSearch ? 'No matching activity logs.' : 'No activity events recorded yet.');
            row.append(td);
            body.append(row);
            if (window.SigmaLogPagination?.setRecords) {
                window.SigmaLogPagination.setRecords(table, [], () => row, { reset: true });
            }
            return;
        }

        const renderRow = record => {
            const row = document.createElement('tr');

            if (selectedUser) {
                // 1. Activity column
                const actTd = document.createElement('td');
                const actTitle = document.createElement('p');
                actTitle.className = 'text-black font-medium';
                actTitle.textContent = record.activity;
                actTd.append(actTitle);

                // 2. Module column (normal plain text, not badge)
                const modTd = document.createElement('td');
                const modText = document.createElement('span');
                modText.className = 'text-black';
                modText.textContent = record.module || 'System';
                modTd.append(modText);

                // 3. Details column
                const detTd = document.createElement('td');
                const cleanDetails = clean(record.details);
                if (cleanDetails && cleanDetails !== '—' && cleanDetails !== '--' && cleanDetails !== '-') {
                    detTd.className = 'text-black';
                    detTd.textContent = cleanDetails;
                } else {
                    const dashSpan = document.createElement('span');
                    dashSpan.className = 'gradebook-dash text-black-fade font-normal select-none';
                    dashSpan.style.setProperty('color', 'rgba(0, 0, 0, 0.45)', 'important');
                    dashSpan.textContent = '-';
                    detTd.append(dashSpan);
                }

                // 4. Timestamp column
                const timeTd = document.createElement('td');
                const timeEl = document.createElement('time');
                timeEl.className = 'text-black-fade';
                timeEl.dateTime = new Date(record.timestamp).toISOString();
                timeEl.textContent = formatDate(record.timestamp);
                timeTd.append(timeEl);

                // 5. Action column (with 3-dots and Delete Log matching AI logs)
                const actionTd = document.createElement('td');
                actionTd.className = 'text-center';
                const actionsWrap = document.createElement('div');
                actionsWrap.className = 'ai-log-insight-actions';

                const toggle = document.createElement('button');
                toggle.type = 'button';
                toggle.className = 'ai-log-message-more';
                toggle.title = 'Activity actions';
                toggle.setAttribute('aria-label', 'Activity log actions');
                toggle.setAttribute('aria-expanded', 'false');
                toggle.innerHTML = '<i class="fa-solid fa-ellipsis" aria-hidden="true"></i>';

                const menu = document.createElement('div');
                menu.className = 'ai-log-message-menu';
                menu.hidden = true;

                const deleteBtn = document.createElement('button');
                deleteBtn.type = 'button';
                deleteBtn.innerHTML = '<i class="fa-solid fa-trash-can" aria-hidden="true"></i><span>Delete Log</span>';
                deleteBtn.onclick = (e) => {
                    e.stopPropagation();
                    menu.hidden = true;
                    toggle.setAttribute('aria-expanded', 'false');
                    if (!window.confirm('Delete this activity log? This action cannot be undone.')) return;
                    deleteActivityLog(record.id);
                };

                toggle.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const willShow = menu.hidden;
                    document.querySelectorAll('.ai-log-message-menu, .notification-log-action-menu').forEach(m => {
                        m.hidden = true;
                        m.previousElementSibling?.setAttribute('aria-expanded', 'false');
                    });
                    if (willShow) {
                        const rect = toggle.getBoundingClientRect();
                        const spaceBelow = window.innerHeight - rect.bottom;
                        if (spaceBelow < 120 && rect.top > 120) {
                            menu.classList.add('dropup');
                        } else {
                            menu.classList.remove('dropup');
                        }
                    }
                    menu.hidden = !willShow;
                    toggle.setAttribute('aria-expanded', String(willShow));
                });

                menu.append(deleteBtn);
                actionsWrap.append(toggle, menu);
                actionTd.append(actionsWrap);

                row.append(actTd, modTd, detTd, timeTd, actionTd);
            } else {
                // Overview Main Table Row
                // 1. User Column (Avatar, Clickable Name, Subtitle ID - exactly copying AI logs main table)
                const userTd = document.createElement('td');
                const cleanId = String(record.userId || '').replace(/^ID:\s*/i, '');

                const userBtn = document.createElement('button');
                userBtn.type = 'button';
                userBtn.className = 'ai-log-user-button';
                userBtn.dataset.userId = cleanId;
                userBtn.setAttribute('aria-label', 'View activity for ' + record.userName);
                userBtn.onclick = () => openUser(record);

                const avatar = document.createElement('span');
                avatar.className = 'ai-log-avatar';
                avatar.setAttribute('aria-hidden', 'true');
                if (record.userAvatar) {
                    const img = document.createElement('img');
                    img.src = record.userAvatar;
                    img.alt = '';
                    avatar.append(img);
                } else {
                    avatar.innerHTML = '<i class="fa-solid fa-user"></i>';
                }

                const identity = document.createElement('span');
                identity.className = 'ai-log-user-identity';

                const nameSpan = document.createElement('span');
                nameSpan.className = 'sigma-table-primary-text';
                nameSpan.textContent = record.userName;

                const idSpan = document.createElement('span');
                idSpan.className = 'ai-log-user-id';
                idSpan.textContent = cleanId;

                identity.append(nameSpan, idSpan);
                userBtn.append(avatar, identity);
                userTd.append(userBtn);

                // 2. Activity Column (with ai-log-interaction-button matching AI logs)
                const actTd = document.createElement('td');
                const actBtn = document.createElement('button');
                actBtn.type = 'button';
                actBtn.className = 'ai-log-interaction-button';
                actBtn.textContent = record.activity;
                actBtn.setAttribute('aria-label', `View ${record.activity} activity for ${record.userName}`);
                actBtn.onclick = () => openUser(record);
                actTd.append(actBtn);
                if (record.details) {
                    const actDetail = document.createElement('p');
                    actDetail.className = 'ai-log-request-preview';
                    actDetail.textContent = record.details;
                    actTd.append(actDetail);
                }

                // 3. Module Column (normal plain text, NOT a badge)
                const modTd = document.createElement('td');
                const modText = document.createElement('span');
                modText.className = 'text-black';
                modText.textContent = record.module || 'System';
                modTd.append(modText);

                // 4. Timestamp Column
                const timeTd = document.createElement('td');
                const timeEl = document.createElement('time');
                timeEl.className = 'text-black-fade';
                timeEl.dateTime = new Date(record.timestamp).toISOString();
                timeEl.textContent = formatDate(record.timestamp);
                timeTd.append(timeEl);

                row.append(userTd, actTd, modTd, timeTd);
            }

            return row;
        };

        // Pagination integration
        if (window.SigmaLogPagination?.setRecords) {
            window.SigmaLogPagination.setRecords(table, records, renderRow, { reset: false });
        } else {
            records.forEach(record => body.append(renderRow(record)));
        }
    }

    // Dynamic record API for the entire platform
    function recordActivityLog(activity, options = {}) {
        const act = clean(activity);
        if (!act) return null;

        let currentUser = null;
        for (const k of ['sigma-authenticated-user', 'currentUser']) {
            try {
                const u = JSON.parse(sessionStorage.getItem(k) || localStorage.getItem(k) || 'null');
                if (u) { currentUser = u; break; }
            } catch (_) {}
        }

        const user = options.user || currentUser || {};
        const userId = clean(options.userId || user.uid || user.id || user.studentNumber || user.employeeId || 'SYS-001');
        const userName = clean(options.userName || user.fullName || user.name || [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Master Admin');
        const userRole = clean(options.userRole || user.role || user.type || 'Administrator');
        const userAvatar = clean(options.userAvatar || user.avatar || user.profilePicture || '');

        const item = {
            id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            userId,
            userName,
            userRole,
            userAvatar,
            activity: act,
            module: clean(options.module || 'System'),
            details: clean(options.details || ''),
            timestamp: options.timestamp || new Date().toISOString()
        };

        const records = read();
        records.unshift(item);
        write(records);
        window.dispatchEvent(new CustomEvent('sigma-activity-logs-updated', { detail: item }));
        render();
        return item;
    }

    // Global outside click and escape handlers
    document.addEventListener('pointerdown', (e) => {
        const openMenu = document.querySelector('#audit-activity-view .ai-log-message-menu:not([hidden]), #audit-activity-view .notification-log-action-menu:not([hidden])');
        if (!openMenu) return;
        const toggle = openMenu.previousElementSibling;
        if (!openMenu.contains(e.target) && !toggle?.contains(e.target)) {
            openMenu.hidden = true;
            toggle?.setAttribute('aria-expanded', 'false');
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('#audit-activity-view .ai-log-message-menu:not([hidden]), #audit-activity-view .notification-log-action-menu:not([hidden])').forEach(menu => {
                menu.hidden = true;
                const toggle = menu.previousElementSibling;
                toggle?.setAttribute('aria-expanded', 'false');
                toggle?.focus();
            });
        }
    });

    window.SigmaActivityLogs = {
        record: recordActivityLog,
        getLogs: read,
        deleteLog: deleteActivityLog,
        render
    };
    window.recordActivityLog = recordActivityLog;
    window.renderActivityLogs = render;
    window.filterActivityAuditLogs = () => {
        render();
        const table = document.querySelector('#audit-activity-view table[aria-label="Activity logs"]');
        if (table && window.SigmaLogPagination?.reset) {
            window.SigmaLogPagination.reset(table);
        }
    };

    window.addEventListener('storage', event => {
        if (!event.key || event.key === KEY) render();
    });
    window.addEventListener('sigma-activity-logs-updated', render);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', render);
    } else {
        render();
    }
})();
