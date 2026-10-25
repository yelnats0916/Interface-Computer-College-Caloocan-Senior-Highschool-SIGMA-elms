(function () {
    'use strict';

    const types = {
        ai: 'AI Logs',
        activity: 'Activity Logs',
        auth: 'Authentication Logs',
        notifications: 'Notification Logs'
    };

    const sections = {
        ai: 'audit-ai-view',
        activity: 'audit-activity-view',
        auth: 'audit-auth-view',
        notifications: 'audit-notifications-view'
    };

    const text = value => String(value ?? '').trim();
    const allowed = kind => window.canViewAuditLog?.(kind) === true;

    const day = value => {
        const date = new Date(value);
        return Number.isFinite(+date) ? new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Manila',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(date) : '';
    };

    const stamp = value => {
        const date = new Date(value);
        return Number.isFinite(+date) ? date.toLocaleString('en-US', {
            timeZone: 'Asia/Manila',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        }) : 'Not recorded';
    };

    const listUsers = () => window.getStoredJson?.('sigma-admin-users', []) || [];

    function person(id, name, role, users) {
        const user = users.find(u => text(u.id || u.uid) === text(id) && text(id));
        return {
            id: text(id),
            name: user ? [user.firstName, user.lastName].filter(Boolean).join(' ') || text(name) : text(name) || 'Not recorded',
            role: text(user?.role || role) || 'Not recorded'
        };
    }

    function normalize(kind, record, users) {
        const row = {
            key: kind + ':' + text(record.id || record.notificationId),
            kind,
            timestamp: record.timestamp || record.createdAt || record.created_at || '',
            status: text(record.status || record.outcome) || 'Not recorded'
        };
        if (kind === 'notifications') {
            row.sender = person(record.senderId, record.senderName || 'System', record.senderRole || record.senderType || 'System', users);
            row.recipient = person(record.recipientId, record.recipient || record.recipientName || ('All ' + (record.role || 'users')), record.role, users);
            row.title = text(record.title) || 'Notification';
            row.details = text(record.body || record.related);
            row.category = text(record.type);
            row.readAt = record.readAt;
            row.recipients = (record.recipients || []).map(u => person(u.id, u.name || u.fullName, u.role || record.role, users));
            row.people = [row.sender, row.recipient, ...row.recipients];
        } else {
            row.user = person(record.userId, record.userName, record.userRole, users);
            row.people = [row.user];
            row.title = kind === 'ai' ? ({
                sigmabot: 'SIGMA Bot',
                analytics: 'AI Analytics',
                quiz: 'Quiz Generation',
                submission_evaluation: 'Submission Evaluation',
                submission_feedback: 'Submission Feedback',
                grade_insights: 'Grade Insights'
            }[record.feature] || text(record.feature) || types[kind]) : text(record.activity || record.event) || types[kind];
            row.details = text(record.details || record.actionDescription || record.prompt);
            row.module = text(record.module);
            row.model = text(record.model);
            row.ip = text(record.ip);
            row.device = text(record.device);
            row.response = text(record.response);
        }
        row.search = [row.title, row.details, row.category, row.module, ...row.people.flatMap(p => [p.name, p.id, p.role])].join(' ').toLowerCase();
        return row;
    }

    function matches(row, filter) {
        const date = day(row.timestamp);
        if ((filter.from && (!date || date < filter.from)) || (filter.to && (!date || date > filter.to))) return false;
        const query = text(filter.user).toLowerCase();
        const people = row.kind === 'notifications' && filter.direction !== 'both'
            ? (filter.direction === 'recipient' ? [row.recipient, ...(row.recipients || [])] : [row.sender])
            : row.people;
        if (query && !people.some(p => [p.name, p.id].some(val => val.toLowerCase().includes(query)))) return false;
        return !filter.search || row.search.includes(filter.search.toLowerCase());
    }

    const identity = p => `${p.name}\nID: ${p.id || 'Not recorded'}\nRole: ${p.role}`;

    function table(kind, rows) {
        const headers = kind === 'notifications'
            ? ['No.', 'Sender', 'Recipient', 'Notification / Details', 'Status', 'Timestamp (Manila)']
            : kind === 'auth'
                ? ['No.', 'User', 'Event / Details', 'Outcome', 'IP / Device', 'Timestamp (Manila)']
                : kind === 'ai'
                    ? ['No.', 'User', 'Feature / Request', 'Response', 'Model / Status', 'Timestamp (Manila)']
                    : ['No.', 'User', 'Activity / Details', 'Module', 'Timestamp (Manila)'];

        return {
            headers,
            body: rows.map((r, i) => kind === 'notifications'
                ? [i + 1, identity(r.sender), [r.recipient, ...(r.recipients || [])].map(identity).join('\n\n'), [r.title, r.category, r.details].filter(Boolean).join('\n'), r.status, stamp(r.timestamp)]
                : kind === 'auth'
                    ? [i + 1, identity(r.user), [r.title, r.details].filter(Boolean).join('\n'), r.status, [r.ip, r.device].filter(Boolean).join('\n'), stamp(r.timestamp)]
                    : kind === 'ai'
                        ? [i + 1, identity(r.user), [r.title, r.details].filter(Boolean).join('\n'), r.response || 'Not recorded', [r.model, r.status].filter(Boolean).join('\n'), stamp(r.timestamp)]
                        : [i + 1, identity(r.user), [r.title, r.details].filter(Boolean).join('\n'), r.module, stamp(r.timestamp)])
        };
    }

    async function source(kind) {
        if (!allowed(kind)) throw Error('You do not have access to ' + types[kind] + '.');
        if (kind === 'activity' || kind === 'auth') {
            return (await window.SigmaDatabase.request(kind === 'auth' ? 'authentication_logs' : 'activity_logs')).records || [];
        }
        if (kind === 'ai') {
            const url = new URL(window.SigmaDatabase.url('ai_records'));
            url.searchParams.set('action', 'logs');
            url.searchParams.set('export', '1');
            const response = await window.SigmaDatabase.fetch(url.href, { cache: 'no-store' });
            const result = await window.SigmaDatabase.readJson(response);
            return (result.logs || []).filter(row => !row.isDeleted);
        }
        window.SigmaNotifications?.syncRecipientReceipts?.();
        return window.SigmaNotifications?.getLogs() || [];
    }

    let libraries;
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = () => {
                script.remove();
                reject(Error('Unable to load PDF tools. Please try again.'));
            };
            document.head.append(script);
        });
    }

    async function pdfLibraries() {
        if (!libraries) {
            libraries = (async () => {
                if (!window.jspdf?.jsPDF) await loadScript('js/vendor/jspdf.umd.min.js?v=3.0.3');
                if (!window.jspdf.jsPDF.API.autoTable) await loadScript('js/vendor/jspdf.plugin.autotable.min.js?v=5.0.2');
            })().catch(error => {
                libraries = null;
                throw error;
            });
        }
        return libraries;
    }

    async function download(rows, selected, filter) {
        await pdfLibraries();
        const doc = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        doc.setProperties({ title: 'Audit Logs Report', creator: 'SIGMA ELMS' });
        selected.forEach((kind, index) => {
            if (index) doc.addPage();
            doc.setTextColor(0);
            doc.setFontSize(18);
            doc.text('Interface Computer College', 14, 15);
            doc.setFontSize(14);
            doc.text('Audit Logs Report - ' + types[kind], 14, 24);
            doc.setFontSize(9);
            doc.text(`Generated: ${stamp(new Date().toISOString())} (Asia/Manila)`, 14, 31);
            const summary = `Date: ${filter.from || 'All dates'}${filter.to ? ' to ' + filter.to : ''} | User: ${filter.user || 'All Users'}${filter.user && kind === 'notifications' ? ' (' + filter.direction + ')' : ''} | Records: ${rows.filter(r => r.kind === kind).length}`;
            const lines = doc.splitTextToSize(summary, 269);
            doc.text(lines, 14, 37);
            const data = table(kind, rows.filter(r => r.kind === kind));
            doc.autoTable({
                startY: 42 + (lines.length - 1) * 4,
                head: [data.headers],
                body: data.body.length ? data.body : [['No matching records', ...data.headers.slice(1).map(() => '')]],
                theme: 'grid',
                styles: { font: 'helvetica', fontSize: 8, cellPadding: 2.5, overflow: 'linebreak', textColor: 0 },
                headStyles: { fillColor: [21, 128, 61], textColor: 255 },
                margin: { left: 14, right: 14, top: 15, bottom: 15 },
                rowPageBreak: 'avoid'
            });
        });
        for (let page = 1; page <= doc.getNumberOfPages(); page++) {
            doc.setPage(page);
            doc.setFontSize(8);
            doc.setTextColor(80);
            doc.text(`${page} of ${doc.getNumberOfPages()}`, 283, 204, { align: 'right' });
        }
        doc.save('SIGMA-Audit-Logs-' + day(new Date().toISOString()) + '.pdf');
    }

    window.openAuditPdfExport = function (kind) {
        if (!allowed(kind)) return;
        document.getElementById('audit-pdf-export')?.remove();

        const modal = document.createElement('div');
        modal.id = 'audit-pdf-export';
        modal.className = 'sigma-modal-overlay';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-label', 'Export Audit Logs');

        const permitted = Object.keys(types).filter(allowed);
        const selected = new Set([kind]);
        const snapshots = new Map();
        const chosen = new Set();
        let currentStep = 1;
        let previewPage = 1;
        const previewPageSize = 10;
        let revision = 0, pending = Promise.resolve(), busy = false, loadError = '', users = null;

        modal.innerHTML = `
            <!-- Exit button matching Create User Account (#user-edit-overlay) -->
            <button type="button" class="audit-modal-exit-btn" data-close title="Exit Export" aria-label="Close export">
                <i class="fa-solid fa-xmark text-xl"></i>
            </button>

            <div class="sigma-modal-shell">
                <form class="sigma-modal-panel">
                    <!-- Modal Header -->
                    <header class="sigma-modal-header">
                        <h2 class="sigma-modal-title">Export Audit Logs</h2>
                    </header>

                    <!-- Segmented Navigation Header -->
                    <div class="audit-step-tabs">
                        <div class="audit-step-tab active" data-step-target="1">
                            <span class="audit-step-tab-label">1. Select Logs & Filters</span>
                            <div class="audit-step-tab-track"></div>
                        </div>
                        <div class="audit-step-tab" data-step-target="2">
                            <span class="audit-step-tab-label">2. Review & Export</span>
                            <div class="audit-step-tab-track"></div>
                        </div>
                    </div>

                    <!-- Step 1: Filters -->
                    <div class="sigma-modal-body" data-step-container="1">
                        <!-- Log Types -->
                        <div class="flex flex-col gap-2.5">
                            <div class="flex items-center justify-between">
                                <label class="text-sm font-bold text-slate-900 tracking-tight">Log Types</label>
                                <div class="flex items-center gap-2">
                                    <button type="button" data-action="select-all-logs" class="text-xs font-semibold text-[#15803d] hover:text-[#166534] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg px-2.5 py-1 transition-colors">Select All Logs</button>
                                    <button type="button" data-action="clear-all-logs" class="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg px-2.5 py-1 transition-colors">Clear All</button>
                                </div>
                            </div>
                            <input type="checkbox" data-all class="sr-only">
                            <div class="audit-type-grid">
                                ${permitted.map(key => `
                                    <div class="audit-type-card ${key === kind ? 'active' : ''}" data-type-key="${key}">
                                        <input type="checkbox" name="log-type" value="${key}" ${key === kind ? 'checked' : ''} class="sr-only">
                                        <div class="audit-type-check">
                                            <i class="fa-solid fa-check"></i>
                                        </div>
                                        <div class="flex flex-col">
                                            <span class="text-sm font-semibold text-slate-900">${types[key]}</span>
                                            <span class="text-xs text-slate-500">${key === 'notifications' ? 'Sent & received announcements and alerts' : key === 'ai' ? 'Bot queries, prompts, and insights' : key === 'auth' ? 'Logins, logouts, and sessions' : 'Admin and teacher platform events'}</span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <!-- Date Range -->
                        <div class="flex flex-col gap-2.5 pt-2 border-t border-slate-100">
                            <div class="flex items-center justify-between flex-wrap gap-2">
                                <label class="text-sm font-bold text-slate-900 tracking-tight">Date Range (Optional)</label>
                                <div class="flex items-center gap-1.5 flex-wrap">
                                    <button type="button" class="audit-quick-date-btn" data-quick-date="today">Today</button>
                                    <button type="button" class="audit-quick-date-btn" data-quick-date="7days">Last 7 Days</button>
                                    <button type="button" class="audit-quick-date-btn" data-quick-date="30days">Last 30 Days</button>
                                    <button type="button" class="audit-quick-date-btn" data-quick-date="all">All Dates</button>
                                </div>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <label class="flex flex-col gap-1.5">
                                    <span class="text-xs font-semibold text-slate-700">From Date</span>
                                    <input name="from" type="date" class="w-full">
                                </label>
                                <label class="flex flex-col gap-1.5">
                                    <span class="text-xs font-semibold text-slate-700">To Date</span>
                                    <input name="to" type="date" class="w-full">
                                </label>
                            </div>
                        </div>

                        <!-- User Search & Selection -->
                        <div class="flex flex-col gap-2.5 pt-2 border-t border-slate-100">
                            <div class="flex items-center justify-between">
                                <label class="text-sm font-bold text-slate-900 tracking-tight">User (Optional)</label>
                                <span class="text-xs text-slate-500" data-user-filter-status>All Users when empty</span>
                            </div>

                            <div class="flex gap-2">
                                <div class="relative flex-1">
                                    <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
                                    <input name="user" type="search" class="w-full pl-9 pr-4" placeholder="Search user by name or ID" autocomplete="off">
                                </div>
                                <button type="button" data-action="search-user-btn" class="sigma-btn sigma-btn-primary" style="height: 44px !important; min-height: 44px !important; padding: 0 18px !important;">
                                    <i class="fa-solid fa-magnifying-glass"></i>
                                    <span>Search</span>
                                </button>
                            </div>

                            <!-- Selected User Chip -->
                            <div data-selected-user-box class="hidden p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                                <div class="flex items-center gap-3">
                                    <div class="w-8 h-8 rounded-full bg-[#15803d] text-white flex items-center justify-center font-bold text-xs">
                                        <i class="fa-solid fa-user"></i>
                                    </div>
                                    <div class="flex flex-col">
                                        <span class="text-sm font-bold text-slate-900" data-selected-user-name></span>
                                        <span class="text-xs text-slate-600" data-selected-user-desc></span>
                                    </div>
                                </div>
                                <button type="button" data-action="clear-selected-user" class="text-xs font-semibold text-slate-600 hover:text-red-700 bg-white border border-slate-200 hover:border-red-200 rounded-lg px-2.5 py-1.5 transition-colors flex items-center gap-1.5">
                                    <i class="fa-solid fa-xmark"></i>
                                    <span>Clear</span>
                                </button>
                            </div>

                            <!-- User Search Results Dropdown -->
                            <div data-user-dropdown class="hidden max-h-48 overflow-y-auto border border-slate-200 rounded-xl bg-white shadow-lg flex flex-col divide-y divide-slate-100"></div>
                        </div>

                        <!-- Notification Direction -->
                        <div class="flex flex-col gap-2 pt-2 border-t border-slate-100" data-direction-section>
                            <label class="text-sm font-bold text-slate-900 tracking-tight">Notification user filter</label>
                            <input name="direction" type="hidden" value="both">
                            
                            <!-- Dropdown summary element for full programmatic compatibility -->
                            <details class="sigma-quarter-dropdown audit-export-direction">
                                <summary><span data-direction-title>Sender or Recipient</span><i class="fa-solid fa-chevron-down"></i></summary>
                                <div class="sigma-quarter-dropdown-menu">
                                    <button type="button" data-direction-value="both">Sender or Recipient</button>
                                    <button type="button" data-direction-value="sender">Sender</button>
                                    <button type="button" data-direction-value="recipient">Recipient</button>
                                </div>
                            </details>

                            <!-- Quick Direction Filter Buttons -->
                            <div class="grid grid-cols-3 gap-2 pt-1">
                                <button type="button" class="audit-dir-btn active py-2 px-3 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 text-center transition-all" data-dir-choice="both">
                                    Sender or Recipient
                                </button>
                                <button type="button" class="audit-dir-btn py-2 px-3 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 text-center transition-all" data-dir-choice="sender">
                                    Sender Only
                                </button>
                                <button type="button" class="audit-dir-btn py-2 px-3 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 text-center transition-all" data-dir-choice="recipient">
                                    Recipient Only
                                </button>
                            </div>
                        </div>

                        <!-- Status & Errors -->
                        <div class="flex items-center justify-between pt-1">
                            <p data-count class="text-sm font-semibold text-slate-700 m-0" role="status">Calculating records...</p>
                            <p data-error class="text-sm font-semibold text-red-600 m-0" role="alert"></p>
                        </div>

                        <!-- Scope selection controls -->
                        <fieldset class="audit-export-scopes pt-2 border-t border-slate-100">
                            <legend class="text-sm font-bold text-slate-900 mb-2">Export Scope</legend>
                            <div class="flex items-center gap-6">
                                <label class="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-800">
                                    <input type="radio" name="scope" value="all" checked class="w-4 h-4 text-[#15803d]">
                                    <span>All matching records</span>
                                </label>
                                <label class="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-800">
                                    <input type="radio" name="scope" value="search" class="w-4 h-4 text-[#15803d]">
                                    <span>Current search results</span>
                                </label>
                                <label class="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-800">
                                    <input type="radio" name="scope" value="selected" class="w-4 h-4 text-[#15803d]">
                                    <span>Choose records</span>
                                </label>
                            </div>
                        </fieldset>
                        <div data-choices hidden class="max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-3 flex flex-col gap-2"></div>
                    </div>

                    <!-- Step 2: Review & Preview -->
                    <div class="sigma-modal-body hidden" data-step-container="2">
                        <!-- Summary Header Strip -->
                        <div class="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs">
                            <div class="flex items-center gap-4 flex-wrap">
                                <div><strong class="text-slate-900">Types:</strong> <span class="text-slate-600" data-review-types></span></div>
                                <div><strong class="text-slate-900">Date:</strong> <span class="text-slate-600" data-review-date></span></div>
                                <div><strong class="text-slate-900">User:</strong> <span class="text-slate-600" data-review-user></span></div>
                            </div>
                            <div>
                                <strong class="text-[#15803d]" data-review-count>0 records</strong>
                            </div>
                        </div>

                        <!-- Preview Table -->
                        <div class="audit-preview-table-wrap">
                            <table class="audit-preview-table">
                                <thead>
                                    <tr>
                                        <th style="width: 44px; text-align: center;">
                                            <input type="checkbox" data-select-all-preview class="w-4 h-4 rounded text-[#15803d]" title="Select all on this page">
                                        </th>
                                        <th style="width: 44px;">No.</th>
                                        <th>Log Type</th>
                                        <th>User / Actors</th>
                                        <th>Activity / Request</th>
                                        <th>Details / Outcome</th>
                                        <th>Timestamp</th>
                                    </tr>
                                </thead>
                                <tbody data-preview-body>
                                    <tr>
                                        <td colspan="7" class="py-8 text-center text-slate-500">Loading preview...</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <!-- Pagination Controls -->
                        <div class="flex items-center justify-between pt-1">
                            <span class="text-xs font-medium text-slate-500" data-pagination-info>Showing 0 of 0</span>
                            <div class="flex items-center gap-2">
                                <button type="button" data-action="prev-page" class="sigma-btn sigma-btn-white" style="height: 38px !important; min-height: 38px !important; padding: 0 14px !important; font-size: 13px !important;">
                                    <i class="fa-solid fa-chevron-left text-xs"></i> Previous Page
                                </button>
                                <span class="text-xs font-semibold text-slate-700 px-2" data-page-indicator>Page 1 of 1</span>
                                <button type="button" data-action="next-page" class="sigma-btn sigma-btn-white" style="height: 38px !important; min-height: 38px !important; padding: 0 14px !important; font-size: 13px !important;">
                                    Next Page <i class="fa-solid fa-chevron-right text-xs"></i>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Pinned Footer -->
                    <footer class="sigma-modal-footer">
                        <div class="flex items-center gap-2">
                            <button type="button" class="sigma-btn sigma-btn-white sigma-btn-md" data-action="step-toggle">
                                <span data-step-btn-text>Review Records</span>
                                <i class="fa-solid fa-arrow-right text-xs ml-1" data-step-btn-icon></i>
                            </button>
                            <button type="submit" class="sigma-btn sigma-btn-primary sigma-btn-md" data-download>
                                <i class="fa-solid fa-file-pdf"></i>
                                <span>Download PDF</span>
                            </button>
                        </div>
                    </footer>
                </form>
            </div>
        `;

        const form = modal.querySelector('form');
        const count = modal.querySelector('[data-count]');
        const error = modal.querySelector('[data-error]');
        const downloadBtn = modal.querySelector('[data-download]');
        const step1Body = modal.querySelector('[data-step-container="1"]');
        const step2Body = modal.querySelector('[data-step-container="2"]');
        const stepToggleBtn = modal.querySelector('[data-action="step-toggle"]');
        const stepBtnText = modal.querySelector('[data-step-btn-text]');
        const stepBtnIcon = modal.querySelector('[data-step-btn-icon]');
        const tabs = modal.querySelectorAll('.audit-step-tab');
        const userInput = modal.querySelector('[name="user"]');
        const userDropdown = modal.querySelector('[data-user-dropdown]');
        const selectedUserBox = modal.querySelector('[data-selected-user-box]');
        const userFilterStatus = modal.querySelector('[data-user-filter-status]');
        const previewBody = modal.querySelector('[data-preview-body]');
        const paginationInfo = modal.querySelector('[data-pagination-info]');
        const pageIndicator = modal.querySelector('[data-page-indicator]');
        const selectAllPreview = modal.querySelector('[data-select-all-preview]');

        const filter = () => ({
            from: form.elements.from.value,
            to: form.elements.to.value,
            user: form.elements.user.value.trim(),
            direction: form.elements.direction.value,
            search: form.elements.scope.value === 'search' ? (window.getAuditLogSearchQuery?.() || '') : ''
        });

        const matching = () => [...selected].flatMap(key => snapshots.get(key) || []).filter(row => matches(row, filter()));

        function setStep(step) {
            currentStep = step;
            if (step === 1) {
                step1Body.classList.remove('hidden');
                step2Body.classList.add('hidden');
                tabs[0].classList.add('active');
                tabs[1].classList.remove('active');
                stepBtnText.textContent = 'Review Records';
                stepBtnIcon.className = 'fa-solid fa-arrow-right text-xs ml-1';
            } else {
                step1Body.classList.add('hidden');
                step2Body.classList.remove('hidden');
                tabs[0].classList.remove('active');
                tabs[1].classList.add('active');
                stepBtnText.textContent = 'Back to Filters';
                stepBtnIcon.className = 'fa-solid fa-arrow-left text-xs mr-1';
                previewPage = 1;
                renderPreview();
            }
        }

        tabs.forEach(tab => {
            tab.onclick = () => {
                const target = Number(tab.dataset.stepTarget);
                if (target === 2 && (busy || !!loadError || !selected.size || !matching().length)) return;
                setStep(target);
            };
        });

        stepToggleBtn.onclick = () => {
            if (currentStep === 1) {
                const rows = matching();
                if (!rows.length) {
                    error.textContent = 'No records match your selected filters.';
                    return;
                }
                setStep(2);
            } else {
                setStep(1);
            }
        };

        // Quick date buttons
        modal.querySelectorAll('[data-quick-date]').forEach(btn => {
            btn.onclick = () => {
                modal.querySelectorAll('[data-quick-date]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const mode = btn.dataset.quickDate;
                const now = new Date();
                if (mode === 'today') {
                    const todayStr = day(now);
                    form.elements.from.value = todayStr;
                    form.elements.to.value = todayStr;
                } else if (mode === '7days') {
                    const past = new Date(now.getTime() - 7 * 86400000);
                    form.elements.from.value = day(past);
                    form.elements.to.value = day(now);
                } else if (mode === '30days') {
                    const past = new Date(now.getTime() - 30 * 86400000);
                    form.elements.from.value = day(past);
                    form.elements.to.value = day(now);
                } else {
                    form.elements.from.value = '';
                    form.elements.to.value = '';
                }
                render();
            };
        });

        // Direction buttons
        modal.querySelectorAll('[data-dir-choice]').forEach(btn => {
            btn.onclick = () => {
                modal.querySelectorAll('[data-dir-choice]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const val = btn.dataset.dirChoice;
                form.elements.direction.value = val;
                modal.querySelector('[data-direction-title]').textContent = btn.textContent.trim();
                render();
            };
        });

        // Log types selection buttons
        modal.querySelector('[data-action="select-all-logs"]').onclick = () => {
            selected.clear();
            permitted.forEach(key => selected.add(key));
            modal.querySelectorAll('.audit-type-card').forEach(card => card.classList.add('active'));
            modal.querySelectorAll('[name="log-type"]').forEach(input => input.checked = true);
            const all = modal.querySelector('[data-all]');
            all.checked = true;
            all.indeterminate = false;
            reload();
        };

        modal.querySelector('[data-action="clear-all-logs"]').onclick = () => {
            selected.clear();
            modal.querySelectorAll('.audit-type-card').forEach(card => card.classList.remove('active'));
            modal.querySelectorAll('[name="log-type"]').forEach(input => input.checked = false);
            const all = modal.querySelector('[data-all]');
            all.checked = false;
            all.indeterminate = false;
            reload();
        };

        modal.querySelectorAll('.audit-type-card').forEach(card => {
            card.onclick = () => {
                const key = card.dataset.typeKey;
                const input = card.querySelector('[name="log-type"]');
                if (selected.has(key)) {
                    selected.delete(key);
                    card.classList.remove('active');
                    input.checked = false;
                } else {
                    selected.add(key);
                    card.classList.add('active');
                    input.checked = true;
                }
                reload();
            };
        });

        // User search handling
        function performUserSearch() {
            const query = userInput.value.trim().toLowerCase();
            if (!query) {
                userDropdown.classList.add('hidden');
                return;
            }
            const allUsers = users || listUsers();
            const results = allUsers.filter(u => {
                const name = [u.firstName, u.middleName, u.lastName].filter(Boolean).join(' ').toLowerCase();
                const id = String(u.id || u.uid || '').toLowerCase();
                const role = String(u.role || '').toLowerCase();
                return name.includes(query) || id.includes(query) || role.includes(query);
            }).slice(0, 8);

            userDropdown.replaceChildren();
            if (!results.length) {
                const empty = document.createElement('div');
                empty.className = 'p-3 text-xs text-slate-500 text-center';
                empty.textContent = 'No matching users found';
                userDropdown.append(empty);
            } else {
                results.forEach(u => {
                    const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.name || 'User';
                    const role = u.role || 'Member';
                    const id = u.id || u.uid || '';
                    const item = document.createElement('button');
                    item.type = 'button';
                    item.className = 'w-full text-left p-3 hover:bg-slate-50 flex items-center justify-between text-xs transition-colors';
                    item.innerHTML = `
                        <div class="flex flex-col">
                            <span class="font-bold text-slate-900">${fullName}</span>
                            <span class="text-slate-500 font-normal">Role: ${role} · ID: ${id || 'N/A'}</span>
                        </div>
                        <span class="text-[#15803d] font-semibold">Select</span>
                    `;
                    item.onclick = () => {
                        selectUser(u);
                        userDropdown.classList.add('hidden');
                    };
                    userDropdown.append(item);
                });
            }
            userDropdown.classList.remove('hidden');
        }

        function selectUser(userObj) {
            const fullName = [userObj.firstName, userObj.lastName].filter(Boolean).join(' ') || userObj.name || 'User';
            const role = userObj.role || 'User';
            const id = userObj.id || userObj.uid || '';

            userInput.value = fullName;
            userFilterStatus.textContent = 'Filtered to ' + fullName;

            modal.querySelector('[data-selected-user-name]').textContent = fullName;
            modal.querySelector('[data-selected-user-desc]').textContent = `Role: ${role} · ID: ${id || 'N/A'}`;
            selectedUserBox.classList.remove('hidden');
            render();
        }

        function clearSelectedUser() {
            userInput.value = '';
            userFilterStatus.textContent = 'All Users when empty';
            selectedUserBox.classList.add('hidden');
            userDropdown.classList.add('hidden');
            render();
        }

        modal.querySelector('[data-action="search-user-btn"]').onclick = performUserSearch;
        userInput.onkeydown = e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                performUserSearch();
            }
        };
        userInput.oninput = () => {
            if (!userInput.value.trim()) {
                clearSelectedUser();
            } else {
                render();
            }
        };
        modal.querySelector('[data-action="clear-selected-user"]').onclick = clearSelectedUser;

        // Preview Table Pagination
        modal.querySelector('[data-action="prev-page"]').onclick = () => {
            if (previewPage > 1) {
                previewPage--;
                renderPreview();
            }
        };
        modal.querySelector('[data-action="next-page"]').onclick = () => {
            const rows = matching();
            const maxPage = Math.max(1, Math.ceil(rows.length / previewPageSize));
            if (previewPage < maxPage) {
                previewPage++;
                renderPreview();
            }
        };

        selectAllPreview.onchange = () => {
            const rows = matching();
            const start = (previewPage - 1) * previewPageSize;
            const currentRows = rows.slice(start, start + previewPageSize);
            currentRows.forEach(row => {
                if (selectAllPreview.checked) chosen.add(row.key);
                else chosen.delete(row.key);
            });
            render();
            renderPreview();
        };

        function renderPreview() {
            const rows = matching();
            const isSelectedOnly = form.elements.scope.value === 'selected';
            const total = rows.length;
            const maxPage = Math.max(1, Math.ceil(total / previewPageSize));
            if (previewPage > maxPage) previewPage = maxPage;

            const start = (previewPage - 1) * previewPageSize;
            const slice = rows.slice(start, start + previewPageSize);

            // Review header strip
            modal.querySelector('[data-review-types]').textContent = [...selected].map(k => types[k]).join(', ') || 'None';
            const f = filter();
            modal.querySelector('[data-review-date]').textContent = (f.from || f.to) ? `${f.from || 'Any'} to ${f.to || 'Any'}` : 'All Dates';
            modal.querySelector('[data-review-user]').textContent = f.user || 'All Users';
            modal.querySelector('[data-review-count]').textContent = `${total} matching record${total === 1 ? '' : 's'}`;

            paginationInfo.textContent = total ? `Showing ${start + 1} to ${Math.min(start + previewPageSize, total)} of ${total} records` : 'Showing 0 records';
            pageIndicator.textContent = `Page ${previewPage} of ${maxPage}`;

            modal.querySelector('[data-action="prev-page"]').disabled = previewPage <= 1;
            modal.querySelector('[data-action="next-page"]').disabled = previewPage >= maxPage;

            selectAllPreview.checked = slice.length > 0 && slice.every(r => chosen.has(r.key));

            previewBody.replaceChildren();
            if (!slice.length) {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td colspan="7" class="py-8 text-center text-slate-500">No records match your filters.</td>`;
                previewBody.append(tr);
                return;
            }

            slice.forEach((row, idx) => {
                const tr = document.createElement('tr');
                const rowNum = start + idx + 1;
                const actorName = row.kind === 'notifications'
                    ? (row.sender?.name || 'System')
                    : (row.user?.name || 'User');
                const actorRole = row.kind === 'notifications'
                    ? (row.sender?.role || 'System')
                    : (row.user?.role || 'User');
                const detailText = row.details || row.response || row.module || '—';

                tr.innerHTML = `
                    <td style="text-align: center;">
                        <input type="checkbox" data-row-key="${row.key}" ${chosen.has(row.key) || !isSelectedOnly ? 'checked' : ''} ${!isSelectedOnly ? 'disabled' : ''} class="w-4 h-4 rounded text-[#15803d]">
                    </td>
                    <td class="font-semibold text-slate-500">${rowNum}</td>
                    <td class="font-semibold text-slate-900">${types[row.kind]}</td>
                    <td>
                        <div class="font-medium text-slate-900">${actorName}</div>
                        <div class="text-xs text-slate-500">${actorRole}</div>
                    </td>
                    <td>
                        <div class="font-medium text-slate-900">${row.title}</div>
                        ${row.category ? `<div class="text-xs text-slate-500">${row.category}</div>` : ''}
                    </td>
                    <td class="text-xs text-slate-600 max-w-xs truncate" title="${detailText}">
                        ${detailText}
                    </td>
                    <td class="text-xs text-slate-500 whitespace-nowrap">
                        ${stamp(row.timestamp)}
                    </td>
                `;

                const checkbox = tr.querySelector('[data-row-key]');
                if (checkbox && isSelectedOnly) {
                    checkbox.onchange = () => {
                        if (checkbox.checked) chosen.add(row.key);
                        else chosen.delete(row.key);
                        render();
                    };
                }
                previewBody.append(tr);
            });
        }

        function render() {
            modal.querySelector('[data-direction-section]').hidden = !selected.has('notifications');
            const all = modal.querySelector('[data-all]');
            all.checked = selected.size === permitted.length;
            all.indeterminate = selected.size > 0 && selected.size < permitted.length;

            const rows = matching();
            const choose = form.elements.scope.value === 'selected';
            const choices = modal.querySelector('[data-choices]');
            choices.hidden = !choose;

            if (choose) {
                choices.replaceChildren();
                rows.forEach(row => {
                    const label = document.createElement('label');
                    const input = document.createElement('input');
                    input.type = 'checkbox';
                    input.checked = chosen.has(row.key);
                    input.onchange = () => {
                        if (input.checked) chosen.add(row.key);
                        else chosen.delete(row.key);
                        render();
                    };
                    label.append(input, document.createTextNode(types[row.kind] + ' · ' + row.title + ' · ' + stamp(row.timestamp)));
                    choices.append(label);
                });
            }

            const total = choose ? rows.filter(row => chosen.has(row.key)).length : rows.length;
            count.textContent = busy ? 'Loading records…' : `${total} matching record${total === 1 ? '' : 's'}`;

            const invalidRange = filter().from && filter().to && filter().from > filter().to;
            error.textContent = invalidRange ? 'End date must be on or after start date.' : loadError;

            downloadBtn.disabled = busy || !!loadError || !!invalidRange || !selected.size || !total;
            stepToggleBtn.disabled = busy || !!loadError || !!invalidRange || !selected.size || !total;

            if (currentStep === 2) {
                renderPreview();
            }
        }

        function reload() {
            const current = ++revision;
            busy = true;
            loadError = '';
            render();
            pending = (async () => {
                try {
                    if (!users) {
                        const result = await window.SigmaDatabase.request('users');
                        users = Array.isArray(result.records) ? result.records : listUsers();
                    }
                    for (const key of selected) {
                        if (!snapshots.has(key)) {
                            const records = await source(key);
                            if (current !== revision) return;
                            snapshots.set(key, records.map(record => normalize(key, record, users)));
                        }
                    }
                } catch (e) {
                    if (current === revision) loadError = e.message || 'Unable to load records.';
                } finally {
                    if (current === revision) {
                        busy = false;
                        render();
                    }
                }
            })();
            return pending;
        }

        const close = () => {
            revision++;
            modal.remove();
            document.removeEventListener('keydown', escape);
            document.body.style.overflow = previousOverflow;
            opener?.focus();
        };

        const escape = event => {
            if (event.key === 'Escape' && !downloadBtn.dataset.saving) {
                close();
                return;
            }
            if (event.key === 'Tab') {
                const items = Array.from(modal.querySelectorAll('button:not(:disabled), input, select')).filter(e => e.getClientRects().length);
                const first = items[0], last = items.at(-1);
                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last?.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first?.focus();
                }
            }
        };

        const opener = document.activeElement;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', escape);

        modal.querySelectorAll('[data-close]').forEach(btn => btn.onclick = close);

        // Direction dropdown support
        modal.querySelectorAll('[data-direction-value]').forEach(option => {
            option.onclick = () => {
                form.elements.direction.value = option.dataset.directionValue;
                modal.querySelector('[data-direction-title]').textContent = option.textContent;
                modal.querySelectorAll('[data-dir-choice]').forEach(b => {
                    b.classList.toggle('active', b.dataset.dirChoice === option.dataset.directionValue);
                });
                option.closest('details')?.removeAttribute('open');
                render();
            };
        });

        // Form change listeners
        form.addEventListener('input', event => {
            if (['user', 'from', 'to', 'direction', 'scope'].includes(event.target.name)) render();
        });
        form.addEventListener('change', event => {
            if (['user', 'from', 'to', 'direction', 'scope'].includes(event.target.name)) render();
        });

        modal.querySelector('[data-all]').onchange = event => {
            selected.clear();
            if (event.target.checked) permitted.forEach(key => selected.add(key));
            modal.querySelectorAll('.audit-type-card').forEach(card => {
                card.classList.toggle('active', selected.has(card.dataset.typeKey));
            });
            modal.querySelectorAll('[name="log-type"]').forEach(input => {
                input.checked = selected.has(input.value);
            });
            reload();
        };

        modal.querySelectorAll('[name="log-type"]').forEach(input => {
            input.onchange = () => {
                if (input.checked) selected.add(input.value);
                else selected.delete(input.value);
                reload();
            };
        });

        // Download Action
        async function handleDownload() {
            await pending;
            error.textContent = '';
            const f = filter();
            if (f.from && f.to && f.from > f.to) {
                error.textContent = 'End date must be on or after start date.';
                return;
            }
            if ([...selected].some(key => !allowed(key))) {
                error.textContent = 'Your log access changed. Reopen the export form.';
                return;
            }
            const rows = matching().filter(row => form.elements.scope.value !== 'selected' || chosen.has(row.key));
            if (!rows.length || loadError) {
                error.textContent = loadError || 'No records match your selection.';
                return;
            }
            downloadBtn.disabled = true;
            downloadBtn.dataset.saving = 'true';
            downloadBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>Preparing PDF…</span>';
            try {
                await download(rows, [...selected], f);
            } catch (e) {
                error.textContent = e.message || 'Unable to download PDF.';
            } finally {
                delete downloadBtn.dataset.saving;
                downloadBtn.innerHTML = '<i class="fa-solid fa-file-pdf"></i><span>Download PDF</span>';
                downloadBtn.disabled = busy || !!loadError || !selected.size || !matching().length;
            }
        }

        downloadBtn.onclick = handleDownload;
        form.onsubmit = async event => {
            event.preventDefault();
            await handleDownload();
        };

        document.body.append(modal);
        reload();
        modal.scrollTop = 0;
        modal.querySelector('.audit-modal-exit-btn').focus({preventScroll:true});
    };

    function init() {
        for (const [kind, id] of Object.entries(sections)) {
            const host = document.getElementById(id);
            const tableEl = host?.querySelector('.sigma-audit-table');
            if (!tableEl) continue;
            const existing = host.querySelector('[data-audit-export]');
            if (existing) {
                existing.hidden = !allowed(kind);
                continue;
            }
            const bar = document.createElement('div');
            bar.className = 'audit-export-toolbar';
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'sigma-btn sigma-btn-primary sigma-btn-md';
            button.dataset.auditExport = kind;
            button.innerHTML = '<i class="fa-solid fa-file-pdf" aria-hidden="true"></i><span>Export PDF</span>';
            button.hidden = !allowed(kind);
            button.onclick = () => openAuditPdfExport(kind);
            bar.append(button);
            tableEl.parentElement.before(bar);
        }
    }

    window.SigmaAuditPdf = { normalize, matches, table };
    window.addEventListener('sigma:database-session-ready', init);
    document.addEventListener('DOMContentLoaded', init);
    window.addEventListener('sigma:audit-permissions-changed', () => {
        init();
        document.querySelectorAll('[data-audit-export]').forEach(button => button.hidden = !allowed(button.dataset.auditExport));
    });
})();
