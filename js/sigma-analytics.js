/**
 * SIGMA ELMS - Unified SIGMA Analytics & Admin Metrics Template Engine
 * Standardized across Admin, Teacher, and Student portals.
 * 
 * Features:
 *   1. Full 8-Card Catalog of Admin System Metrics.
 *   2. Dynamic JSON-driven templates for all cards.
 *   3. Zero-State Fallback: Displays a clean standby state when metricsData is empty [].
 *   4. Unified 4-Card Initial Limit with inside-container "More" dynamic expansion across all portals.
 *   5. Interactive "Configure Metrics" Modal allowing Admin to toggle/customize which cards appear.
 *   6. Pin-to-top feature with localStorage persistence.
 *   7. Strict cursor management (pointer cursor exclusively on interactive switches & buttons).
 */

(function () {
    'use strict';

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
            if (str === null || str === undefined) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        };

    function formatGradeSectionDisplay(sectionName, gradeLevel) {
        if (!sectionName) return '';
        const cleanSec = String(sectionName).trim();
        if (/^grade\s*\d+/i.test(cleanSec)) return cleanSec;
        const grade = String(gradeLevel || 'Grade 11').trim();
        return `${grade} - ${cleanSec}`;
    }
    window.formatGradeSectionDisplay = formatGradeSectionDisplay;

    const STORAGE_KEY_ACTIVE_METRICS = 'sigma-admin-active-metrics';

    // ═════════════════════════════════════════════════════════════════════════
    // 1. COMPLETE ADMIN METRICS CATALOG (8 CARDS)
    // ═════════════════════════════════════════════════════════════════════════
    const ADMIN_METRICS_CATALOG = [
        {
            id: 'metric-health',
            type: 'status-metric',
            title: 'System Health',
            desc: 'Server uptime and API response latency',
            status: { label: 'Operational', color: '#15803d' },
            uptime: '99.9',
            message: 'All Systems Running Normally',
            latency: { label: 'Fast', percent: '100%', color: '#15803d' }
        },
        {
            id: 'metric-ai',
            type: 'interactive-switcher',
            title: 'AI Usage',
            desc: 'Gemini and Groq AI token requests and quotas',
            status: { label: 'Efficient', icon: 'fa-brain', color: '#15803d' },
            models: ['Gemini', 'Groq'],
            periods: ['Daily', 'Monthly'],
            activeModel: 'gemini',
            activePeriod: 'daily',
            periodDesc: 'Requests Today (Sunday)',
            requestsValue: '1,242',
            quotaLabel: 'Daily Quota',
            quotaPercent: '42%'
        },
        {
            id: 'metric-storage',
            type: 'resource-capacity',
            title: 'Storage Usage',
            desc: 'Cloud file storage and media quotas',
            status: { label: 'Optimal', icon: 'fa-hard-drive', color: '#15803d' },
            usedValue: '12.4',
            unit: 'GB Used',
            subtitle: 'Cloud Storage',
            capacityLabel: '83% Full',
            capacityPercent: '83%',
            barColor: 'bg-[#ea580c]'
        },
        {
            id: 'metric-security',
            type: 'security-guard',
            title: 'Security & Auth Guard',
            desc: 'Threat monitoring and login security',
            status: { label: 'Secure', icon: 'fa-shield-halved', color: '#15803d' },
            threatsCount: '0',
            threatsLabel: 'Threats Blocked',
            twoFactorRate: '100% 2FA Active',
            failedAttempts: '2 Failed Attempts Today'
        },
        {
            id: 'metric-database',
            type: 'db-load',
            title: 'Database Load',
            desc: 'Query latency and database connection pool',
            status: { label: 'Healthy', icon: 'fa-database', color: '#15803d' },
            queryLatency: '48ms',
            cacheHitRate: '98.4%',
            activeConnections: '24 Active Pools'
        },
        {
            id: 'metric-grading',
            type: 'grading-queue',
            title: 'Grading Pipeline',
            desc: 'Student assignment submissions and teacher queue',
            status: { label: 'On Track', icon: 'fa-file-signature', color: '#15803d' },
            submittedCount: '318',
            submittedLabel: 'Submitted Today',
            pendingCount: '42 Pending Grading',
            progressPercent: '88%'
        }
    ];

    // Default enabled card IDs (clean state for new install)
    const DEFAULT_ACTIVE_METRIC_IDS = [];

    function getActiveMetricIds() {
        try {
            const authUser = JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}');
            const authId = String(authUser.uid || authUser.id || '');
            if (authId) {
                const users = getStoredJson('sigma-admin-users', []);
                const foundUser = users.find(u => String(u.uid || u.id || '') === authId);
                if (foundUser && foundUser.permissions) {
                    if (foundUser.permissions.metricsMain === false) {
                        return [];
                    }
                    const mapping = [
                        { key: 'metricHealth', id: 'metric-health' },
                        { key: 'metricAi', id: 'metric-ai' },
                        { key: 'metricStorage', id: 'metric-storage' },
                        { key: 'metricSecurity', id: 'metric-security' },
                        { key: 'metricDatabase', id: 'metric-database' },
                        { key: 'metricGrading', id: 'metric-grading' }
                    ];
                    const perms = foundUser.permissions;
                    const permittedIds = mapping.filter(m => perms[m.key] !== false).map(m => m.id);
                    return permittedIds;
                }
            }
            const raw = localStorage.getItem(STORAGE_KEY_ACTIVE_METRICS);
            if (raw !== null) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) return parsed.filter(id => id !== 'metric-classrooms');
            }
        } catch {}
        return DEFAULT_ACTIVE_METRIC_IDS;
    }

    function saveActiveMetricIds(ids) {
        try {
            localStorage.setItem(STORAGE_KEY_ACTIVE_METRICS, JSON.stringify(ids));
        } catch (e) {
            console.error('Failed to save active metrics', e);
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 2. ZERO-STATE FALLBACK RENDERERS
    // ═════════════════════════════════════════════════════════════════════════
    function renderAdminZeroStateCard() {
        return `
            <div data-id="metric-empty-state" class="sigma-card pocket-card p-6 flex flex-col items-center justify-center text-center border-2 border-dashed border-slate-200 bg-slate-50/60 rounded-[20px]">
                <div class="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center mb-3 shadow-xs">
                    <i class="fa-solid fa-sliders text-sm icon-black-fade"></i>
                </div>
                <h5 class="text-[12px] font-bold text-black uppercase tracking-wider mb-1.5 leading-snug">
                    No Metrics Configured
                </h5>
                <p class="text-[11px] font-medium text-black-fade leading-relaxed mb-4 max-w-[220px]">
                    Select system metrics to monitor server performance, AI usage, storage, and portal health in real-time.
                </p>
                <button type="button" onclick="window.openMetricsConfigModal()" class="px-4 py-2 bg-[#15803d] hover:bg-[#166534] text-white rounded-xl text-[11px] font-bold transition-all shadow-xs cursor-pointer">
                    Configure Metrics
                </button>
            </div>
        `;
    }

    function renderPocketCardZeroStateHtml() {
        return `
            <div data-id="pocket-card-empty-state" class="sigma-card pocket-card p-6 flex flex-col items-center justify-center text-center border-2 border-dashed border-slate-200 bg-slate-50/60 rounded-[20px]">
                <div class="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center mb-3 shadow-xs">
                    <i class="fa-solid fa-chart-simple text-sm icon-black-fade"></i>
                </div>
                <h5 class="text-[12px] font-bold text-black mb-1.5 leading-snug">
                    No Analytics Insights Yet
                </h5>
                <p class="text-[11px] font-medium text-black-fade leading-relaxed max-w-[220px]">
                    SIGMA AI tracks your performance, quizzes, and coursework. SIGMA Analytics will automatically appear here once grades and assessments are recorded.
                </p>
            </div>
        `;
    }

    function toTitleCase(str) {
        if (!str) return '';
        return String(str).toLowerCase().replace(/(?:^|\s|\/|-)\w/g, match => match.toUpperCase());
    }

    function renderMetricHeaderHtml(title, statusLabel, iconName = '', labelId = '', indicatorId = '') {
        const titleFormatted = toTitleCase(title);
        const statusFormatted = toTitleCase(statusLabel);
        const indicatorHtml = iconName
            ? `<i ${indicatorId ? `id="${indicatorId}"` : ''} class="fa-solid ${iconName} sigma-metric-status-icon pocket-metric-status-icon text-[#15803d]"></i>`
            : `<div ${indicatorId ? `id="${indicatorId}"` : ''} class="sigma-metric-status-dot pocket-metric-status-dot bg-[#15803d] animate-pulse"></div>`;

        return `
            <div class="sigma-metric-header pocket-metric-header flex items-center justify-between w-full">
                <h4 class="sigma-metric-title pocket-metric-title text-black">${titleFormatted}</h4>
                <div class="sigma-metric-status pocket-metric-status ml-auto">
                    <span ${labelId ? `id="${labelId}"` : ''} class="sigma-metric-status-label pocket-metric-status-label text-[#15803d]">${statusFormatted}</span>
                    ${indicatorHtml}
                </div>
            </div>
        `;
    }

    function renderMetricCardHtml(item) {
        if (!item) return '';

        if (item.type === 'status-metric') {
            return `
                <div data-id="${item.id}" class="sigma-card pocket-card p-4 flex flex-col justify-between">
                    ${renderMetricHeaderHtml(item.title, item.status.label, '', 'system-status-label', 'system-status-indicator')}
                    <div class="metric-body-centered flex-1 flex flex-col items-center justify-center text-center gap-1.5 py-1">
                        <div class="flex items-baseline justify-center gap-1.5">
                            <span id="system-uptime-value" class="text-2xl font-black text-black leading-none tracking-tight">${item.uptime}</span>
                            <span class="text-[11px] font-semibold text-black-fade">% Uptime</span>
                        </div>
                        <p id="system-status-message" class="text-[11.5px] font-medium text-black-fade leading-snug">
                            ${item.message}
                        </p>
                    </div>
                    <div class="space-y-1.5 pt-2 border-t border-slate-100 flex-shrink-0">
                        <div class="flex items-center justify-between">
                            <span class="text-[11px] font-semibold text-black-fade">Response Time</span>
                            <span id="system-latency-label" class="text-[11px] font-bold text-[#15803d]">${item.latency.label}</span>
                        </div>
                        <div class="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div id="system-latency-bar" class="w-full h-full bg-[#15803d] rounded-full"></div>
                        </div>
                    </div>
                </div>
            `;
        }

        if (item.type === 'interactive-switcher') {
            return `
                <div data-id="${item.id}" class="sigma-card pocket-card p-4 flex flex-col justify-between">
                    ${renderMetricHeaderHtml(item.title, item.status.label, item.status.icon || 'fa-brain', 'ai-status-label', 'ai-status-icon')}

                    <!-- Segmented Control Row: Model & Period Side by Side -->
                    <div class="grid grid-cols-2 gap-1.5 my-1.5 flex-shrink-0">
                        <!-- Model Switcher -->
                        <div class="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                            <button id="btn-ai-gemini" type="button" class="flex-1 py-1 rounded-lg text-[10.5px] font-bold transition-all bg-white text-black shadow-sm cursor-pointer" onclick="window.setAiModel && window.setAiModel('gemini')">Gemini</button>
                            <button id="btn-ai-groq" type="button" class="flex-1 py-1 rounded-lg text-[10.5px] font-bold transition-all text-black-fade hover:text-black cursor-pointer" onclick="window.setAiModel && window.setAiModel('groq')">Groq</button>
                        </div>
                        <!-- Period Switcher -->
                        <div class="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                            <button id="btn-period-daily" type="button" class="flex-1 py-1 rounded-lg text-[10.5px] font-bold transition-all bg-white text-black shadow-sm cursor-pointer" onclick="window.setAiPeriod && window.setAiPeriod('daily')">Daily</button>
                            <button id="btn-period-monthly" type="button" class="flex-1 py-1 rounded-lg text-[10.5px] font-bold transition-all text-black-fade hover:text-black cursor-pointer" onclick="window.setAiPeriod && window.setAiPeriod('monthly')">Monthly</button>
                        </div>
                    </div>

                    <div class="metric-body-centered flex-1 flex flex-col items-center justify-center text-center gap-0.5 py-0.5">
                        <p id="ai-period-desc" class="text-[10.5px] font-medium text-black-fade truncate w-full text-center">${item.periodDesc}</p>
                        <div class="flex items-baseline justify-center gap-1.5 mt-0.5">
                            <span id="ai-requests-value" class="text-2xl font-black text-black leading-none tracking-tight">${item.requestsValue}</span>
                            <span class="text-[11px] font-semibold text-black-fade">Requests</span>
                        </div>
                    </div>

                    <div class="space-y-1.5 pt-2 border-t border-slate-100 flex-shrink-0">
                        <div class="flex items-center justify-between">
                            <span id="ai-quota-label" class="text-[11px] font-semibold text-black-fade">${item.quotaLabel}</span>
                            <span id="ai-usage-percent" class="text-[11px] font-bold text-black">${item.quotaPercent}</span>
                        </div>
                        <div class="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div id="ai-usage-bar" class="w-[42%] h-full bg-[#15803d] rounded-full"></div>
                        </div>
                    </div>
                </div>
            `;
        }

        if (item.type === 'resource-capacity') {
            return `
                <div data-id="${item.id}" class="sigma-card pocket-card p-4 flex flex-col justify-between">
                    ${renderMetricHeaderHtml(item.title, item.status.label, item.status.icon || 'fa-hard-drive', 'storage-status-label', 'storage-status-icon')}
                    <div class="metric-body-centered flex-1 flex flex-col items-center justify-center text-center gap-1.5 py-1">
                        <div class="flex items-baseline justify-center gap-1.5">
                            <span id="storage-used-value" class="text-2xl font-black text-black leading-none tracking-tight">${item.usedValue}</span>
                            <span class="text-[11px] font-semibold text-black-fade">${item.unit}</span>
                        </div>
                        <p class="text-[11.5px] font-medium text-black-fade leading-snug">${item.subtitle}</p>
                    </div>
                    <div class="space-y-1.5 pt-2 border-t border-slate-100 flex-shrink-0">
                        <div class="flex items-center justify-between">
                            <span class="text-[11px] font-semibold text-black-fade">Total Capacity</span>
                            <span id="storage-percent-label" class="text-[11px] font-bold text-black">${item.capacityLabel}</span>
                        </div>
                        <div class="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div id="storage-usage-bar" class="w-[83%] h-full bg-[#ea580c] rounded-full"></div>
                        </div>
                    </div>
                </div>
            `;
        }

        if (item.type === 'security-guard') {
            return `
                <div data-id="${item.id}" class="sigma-card pocket-card p-4 flex flex-col justify-between">
                    ${renderMetricHeaderHtml(item.title, item.status.label, item.status.icon || 'fa-shield-halved', 'security-status-label', 'security-status-icon')}
                    <div class="metric-body-centered flex-1 flex flex-col items-center justify-center text-center gap-1.5 py-1">
                        <div class="flex items-baseline justify-center gap-1.5">
                            <span class="text-2xl font-black text-black leading-none tracking-tight">${item.threatsCount}</span>
                            <span class="text-[11px] font-semibold text-black-fade">${item.threatsLabel}</span>
                        </div>
                        <p class="text-[11.5px] font-medium text-black-fade leading-snug">
                            ${item.twoFactorRate}
                        </p>
                    </div>
                    <div class="pt-2 border-t border-slate-100 flex-shrink-0">
                        <div class="flex items-center justify-between min-h-[22px]">
                            <span class="text-[11px] font-semibold text-black-fade">Login Security</span>
                            <span class="text-[11px] font-bold text-black">${item.failedAttempts}</span>
                        </div>
                    </div>
                </div>
            `;
        }

        if (item.type === 'db-load') {
            return `
                <div data-id="${item.id}" class="sigma-card pocket-card p-4 flex flex-col justify-between">
                    ${renderMetricHeaderHtml(item.title, item.status.label, item.status.icon || 'fa-database', 'database-status-label', 'database-status-icon')}
                    <div class="metric-body-centered flex-1 flex flex-col items-center justify-center text-center gap-1.5 py-1">
                        <div class="flex items-baseline justify-center gap-1.5">
                            <span class="text-2xl font-black text-black leading-none tracking-tight">${item.queryLatency}</span>
                            <span class="text-[11px] font-semibold text-black-fade">Latency</span>
                        </div>
                        <p class="text-[11.5px] font-medium text-black-fade leading-snug">
                            Cache Hit: <span class="font-bold text-black">${item.cacheHitRate}</span>
                        </p>
                    </div>
                    <div class="pt-2 border-t border-slate-100 flex-shrink-0">
                        <div class="flex items-center justify-between min-h-[22px]">
                            <span class="text-[11px] font-semibold text-black-fade">Connection Pool</span>
                            <span class="text-[11px] font-bold text-[#15803d]">${item.activeConnections}</span>
                        </div>
                    </div>
                </div>
            `;
        }

        if (item.type === 'grading-queue') {
            return `
                <div data-id="${item.id}" class="sigma-card pocket-card p-4 flex flex-col justify-between">
                    ${renderMetricHeaderHtml(item.title, item.status.label, item.status.icon || 'fa-file-signature', 'grading-status-label', 'grading-status-icon')}
                    <div class="metric-body-centered flex-1 flex flex-col items-center justify-center text-center gap-1.5 py-1">
                        <div class="flex items-baseline justify-center gap-1.5">
                            <span class="text-2xl font-black text-black leading-none tracking-tight">${item.submittedCount}</span>
                            <span class="text-[11px] font-semibold text-black-fade">${item.submittedLabel}</span>
                        </div>
                        <p class="text-[11.5px] font-medium text-black-fade leading-snug">
                            ${item.pendingCount}
                        </p>
                    </div>
                    <div class="space-y-1.5 pt-2 border-t border-slate-100 flex-shrink-0">
                        <div class="flex items-center justify-between">
                            <span class="text-[11px] font-semibold text-black-fade">Grading Pace</span>
                            <span class="text-[11px] font-bold text-[#15803d]">${item.progressPercent}</span>
                        </div>
                        <div class="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div class="w-[88%] h-full bg-[#15803d] rounded-full"></div>
                        </div>
                    </div>
                </div>
            `;
        }

        return '';
    }

    function renderAdminPocketCards() {
        const container = document.getElementById('dashboard-metrics-container');
        if (!container) return;

        const activeIds = getActiveMetricIds();
        const activeItems = ADMIN_METRICS_CATALOG.filter(item => activeIds.includes(item.id));

        // Zero-State Fallback when no metrics feed exists
        if (activeItems.length === 0) {
            container.innerHTML = renderAdminZeroStateCard();
            initPocketCardsContainer(container);
            return;
        }

        // Render initial 4 cards (or all if <= 4)
        const initialCards = activeItems.slice(0, 4);
        container.innerHTML = initialCards.map(item => renderMetricCardHtml(item)).join('');

        wireInteractiveSwitchers();
        initPocketCardsContainer(container, activeItems);
    }

    function wireInteractiveSwitchers() {
        const geminiBtn = document.getElementById('btn-ai-gemini');
        const groqBtn = document.getElementById('btn-ai-groq');
        if (geminiBtn && typeof window.setAiModel === 'function') {
            geminiBtn.onclick = () => window.setAiModel('gemini');
        }
        if (groqBtn && typeof window.setAiModel === 'function') {
            groqBtn.onclick = () => window.setAiModel('groq');
        }

        const periodDailyBtn = document.getElementById('btn-period-daily');
        const periodMonthlyBtn = document.getElementById('btn-period-monthly');
        if (periodDailyBtn && typeof window.setAiPeriod === 'function') {
            periodDailyBtn.onclick = () => window.setAiPeriod('daily');
        }
        if (periodMonthlyBtn && typeof window.setAiPeriod === 'function') {
            periodMonthlyBtn.onclick = () => window.setAiPeriod('monthly');
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 3. CONFIGURE METRICS MODAL
    // ═════════════════════════════════════════════════════════════════════════
    function createMetricsConfigModal() {
        let backdrop = document.getElementById('metrics-config-modal-backdrop');
        if (backdrop) backdrop.remove();

        backdrop = document.createElement('div');
        backdrop.id = 'metrics-config-modal-backdrop';
        backdrop.className = 'metrics-config-backdrop';
        backdrop.innerHTML = `
            <div class="metrics-config-modal relative">
                <!-- Dynamic Confirmation Prompt Overlay -->
                <div id="metrics-config-confirm-prompt" class="hidden absolute inset-0 bg-white/95 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-20 rounded-3xl font-['Inter']">
                    <div id="prompt-icon-container" class="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center mb-3 text-black border border-slate-100">
                        <i id="prompt-icon" class="fa-solid fa-rotate-left text-base"></i>
                    </div>
                    <h4 id="prompt-title" class="text-sm font-black text-black uppercase tracking-wider mb-1">Confirm Action</h4>
                    <p id="prompt-desc" class="text-[11px] text-black-fade max-w-xs mb-4 leading-relaxed font-medium" style="color: var(--sigma-black-fade, rgba(0, 0, 0, 0.55)) !important;">
                        Are you sure you want to proceed?
                    </p>
                    <div class="flex items-center gap-2">
                        <button type="button" id="btn-prompt-cancel" class="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-black hover:bg-slate-100 transition-colors cursor-pointer font-['Inter']">
                            Cancel
                        </button>
                        <button type="button" id="btn-prompt-confirm" class="px-4 py-2 bg-[#15803d] hover:bg-[#166534] text-white rounded-xl text-[11px] font-bold transition-colors shadow-xs cursor-pointer font-['Inter']">
                            Confirm
                        </button>
                    </div>
                </div>

                <div class="px-6 sm:px-8 py-4 sm:py-5 border-b border-slate-100 flex items-center justify-between shrink-0 font-['Inter']">
                    <div>
                        <h2 class="text-base sm:text-xl font-bold text-black font-['Inter'] tracking-tight">Configure System Metrics</h2>
                        <p class="text-[11px] sm:text-xs font-medium text-black-fade font-['Inter'] mt-0.5">Select which metric cards to display on your dashboard rail</p>
                    </div>
                </div>

                <div class="p-6 sm:p-8 overflow-y-auto flex-1 space-y-3 custom-scrollbar" id="metrics-config-options-list" style="flex: 1 1 0%; min-height: 0;">
                    <!-- Populated dynamically -->
                </div>

                <div class="sigma-modal-footer flex items-center justify-between shrink-0 bg-slate-50 border-t border-slate-100 font-['Inter']">
                    <button type="button" id="btn-cancel-metrics-config" class="sigma-btn sigma-btn-white sigma-modal-btn">
                        Cancel
                    </button>
                    <div class="flex items-center gap-2.5 sm:gap-3">
                        <button type="button" id="btn-reset-metrics-config" class="sigma-modal-btn" style="background: transparent; border: none;">
                            Reset
                        </button>
                        <button type="button" id="btn-save-metrics-config" disabled class="sigma-btn sigma-btn-primary sigma-modal-btn opacity-40 cursor-not-allowed pointer-events-none">
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(backdrop);

        let initialSnapshot = [...getActiveMetricIds()];
        const btnSave = backdrop.querySelector('#btn-save-metrics-config');

        function getCurrentSelectedIds() {
            const checkboxes = backdrop.querySelectorAll('#metrics-config-options-list input[type="checkbox"]');
            return Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.dataset.metricId);
        }

        function hasUnsavedChanges() {
            const current = getCurrentSelectedIds();
            if (current.length !== initialSnapshot.length) return true;
            return current.some(id => !initialSnapshot.includes(id));
        }

        function updateSaveButtonState() {
            if (!btnSave) return;
            const changed = hasUnsavedChanges();
            btnSave.disabled = !changed;
            if (changed) {
                btnSave.classList.remove('opacity-40', 'cursor-not-allowed', 'pointer-events-none');
                btnSave.classList.add('cursor-pointer', 'hover:bg-[#166534]');
            } else {
                btnSave.classList.add('opacity-40', 'cursor-not-allowed', 'pointer-events-none');
                btnSave.classList.remove('cursor-pointer', 'hover:bg-[#166534]');
            }
        }

        const promptOverlay = backdrop.querySelector('#metrics-config-confirm-prompt');
        const promptIcon = backdrop.querySelector('#prompt-icon');
        const promptTitle = backdrop.querySelector('#prompt-title');
        const promptDesc = backdrop.querySelector('#prompt-desc');
        const btnPromptCancel = backdrop.querySelector('#btn-prompt-cancel');
        const btnPromptConfirm = backdrop.querySelector('#btn-prompt-confirm');

        let activeConfirmCallback = null;

        function showConfirmation({ icon, title, desc, cancelText, confirmText, confirmClass, onConfirm }) {
            if (!promptOverlay) return;
            if (promptIcon) promptIcon.className = `fa-solid ${icon} text-base`;
            if (promptTitle) promptTitle.textContent = title;
            if (promptDesc) promptDesc.textContent = desc;
            if (btnPromptCancel) btnPromptCancel.textContent = cancelText || 'Cancel';
            if (btnPromptConfirm) {
                btnPromptConfirm.textContent = confirmText || 'Confirm';
                btnPromptConfirm.className = `px-4 py-2 text-white rounded-xl text-[11px] font-bold transition-colors shadow-xs cursor-pointer ${confirmClass || 'bg-[#15803d] hover:bg-[#166534]'}`;
            }
            activeConfirmCallback = onConfirm;
            promptOverlay.classList.remove('hidden');
        }

        function hideConfirmation() {
            if (promptOverlay) promptOverlay.classList.add('hidden');
            activeConfirmCallback = null;
        }

        btnPromptCancel?.addEventListener('click', hideConfirmation);
        btnPromptConfirm?.addEventListener('click', () => {
            if (typeof activeConfirmCallback === 'function') {
                activeConfirmCallback();
            }
            hideConfirmation();
        });

        function handleCancelOrClose() {
            if (hasUnsavedChanges()) {
                showConfirmation({
                    icon: 'fa-triangle-exclamation text-amber-500',
                    title: 'Discard Changes?',
                    desc: 'You have unsaved changes to your metric cards selection. Do you want to discard them?',
                    cancelText: 'Keep Editing',
                    confirmText: 'Discard Changes',
                    confirmClass: 'bg-[#15803d] hover:bg-[#166534]',
                    onConfirm: () => closeMetricsConfigModal()
                });
            } else {
                closeMetricsConfigModal();
            }
        }

        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) handleCancelOrClose();
        });
        backdrop.querySelector('#btn-close-metrics-config')?.addEventListener('click', handleCancelOrClose);
        backdrop.querySelector('#btn-cancel-metrics-config')?.addEventListener('click', handleCancelOrClose);

        // 1. Reset Action Prompt
        backdrop.querySelector('#btn-reset-metrics-config')?.addEventListener('click', () => {
            showConfirmation({
                icon: 'fa-rotate-left text-slate-800',
                title: 'Reset to Default?',
                desc: 'Are you sure you want to restore the default top 4 system metric cards?',
                cancelText: 'Cancel',
                confirmText: 'Yes, Reset',
                confirmClass: 'bg-[#15803d] hover:bg-[#166534]',
                onConfirm: () => {
                    const checkboxes = backdrop.querySelectorAll('#metrics-config-options-list input[type="checkbox"]');
                    checkboxes.forEach(cb => {
                        cb.checked = DEFAULT_ACTIVE_METRIC_IDS.includes(cb.dataset.metricId);
                        cb.closest('.metrics-config-option')?.classList.toggle('is-active', cb.checked);
                    });
                    updateSaveButtonState();
                }
            });
        });

        // 2. Save Action Prompt
        btnSave?.addEventListener('click', () => {
            if (!hasUnsavedChanges()) return;
            showConfirmation({
                icon: 'fa-check text-emerald-600',
                title: 'Save Changes?',
                desc: 'Are you sure you want to save and apply your customized system metrics?',
                cancelText: 'Cancel',
                confirmText: 'Save & Apply',
                confirmClass: 'bg-[#15803d] hover:bg-[#166534]',
                onConfirm: () => {
                    const selectedIds = getCurrentSelectedIds();
                    saveActiveMetricIds(selectedIds);
                    closeMetricsConfigModal();
                    renderAdminPocketCards();
                }
            });
        });

        return backdrop;
    }

    function populateConfigOptions() {
        const backdrop = document.getElementById('metrics-config-modal-backdrop');
        const list = document.getElementById('metrics-config-options-list');
        if (!list) return;

        const activeIds = getActiveMetricIds();

        list.innerHTML = ADMIN_METRICS_CATALOG.map(metric => {
            const isChecked = activeIds.includes(metric.id);
            return `
                <label class="metrics-config-option ${isChecked ? 'is-active' : ''}">
                    <div class="pr-4">
                        <p class="text-sm font-bold text-black font-['Inter']">${metric.title}</p>
                        <p class="text-xs text-black-fade font-medium font-['Inter'] mt-0.5 leading-snug">${metric.desc}</p>
                    </div>
                    <div class="metrics-toggle-switch shrink-0">
                        <input type="checkbox" data-metric-id="${metric.id}" ${isChecked ? 'checked' : ''}>
                        <span class="metrics-toggle-slider"></span>
                    </div>
                </label>
            `;
        }).join('');

        const btnSave = backdrop?.querySelector('#btn-save-metrics-config');

        function checkChanges() {
            const checkboxes = list.querySelectorAll('input[type="checkbox"]');
            const currentSelected = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.dataset.metricId);
            const initial = getActiveMetricIds();
            const changed = (currentSelected.length !== initial.length) || currentSelected.some(id => !initial.includes(id));

            if (btnSave) {
                btnSave.disabled = !changed;
                if (changed) {
                    btnSave.classList.remove('opacity-40', 'cursor-not-allowed', 'pointer-events-none');
                    btnSave.classList.add('cursor-pointer', 'hover:bg-[#166534]');
                } else {
                    btnSave.classList.add('opacity-40', 'cursor-not-allowed', 'pointer-events-none');
                    btnSave.classList.remove('cursor-pointer', 'hover:bg-[#166534]');
                }
            }
        }

        list.querySelectorAll('.metrics-config-option').forEach(row => {
            const cb = row.querySelector('input[type="checkbox"]');
            cb.addEventListener('change', () => {
                row.classList.toggle('is-active', cb.checked);
                checkChanges();
            });
        });

        checkChanges();
    }

    function openMetricsConfigModal() {
        createMetricsConfigModal();
        populateConfigOptions();
        const backdrop = document.getElementById('metrics-config-modal-backdrop');
        if (backdrop) backdrop.classList.add('is-open');
    }

    function closeMetricsConfigModal() {
        const backdrop = document.getElementById('metrics-config-modal-backdrop');
        if (backdrop) backdrop.classList.remove('is-open');
    }

    window.openMetricsConfigModal = openMetricsConfigModal;
    window.closeMetricsConfigModal = closeMetricsConfigModal;

    // ═════════════════════════════════════════════════════════════════════════
    // 4. STUDENT & TEACHER GRADE MONITORING SIGMA ANALYTICS CATALOG (8 CARDS)
    // Strands: ABM, HE, GAS, HUMSS, ICT
    // ═════════════════════════════════════════════════════════════════════════

    const REMOVED_DEMO_CARD_IDS = new Set(["sigma-card-descriptive-1","sigma-card-predictive-1","sigma-card-prescriptive-1","sigma-card-descriptive-2","sigma-card-predictive-2","sigma-card-prescriptive-2","sigma-card-descriptive-3","sigma-card-descriptive-4","sigma-teacher-card-1","sigma-teacher-card-2","sigma-teacher-card-3"]);
    function removeSavedDemoCards() {
        try {
            const raw = localStorage.getItem('sigma_user_pocket_cards');
            if (!raw) return;
            const cards = JSON.parse(raw);
            if (!Array.isArray(cards)) return;
            const kept = cards.filter(card => !REMOVED_DEMO_CARD_IDS.has(card.id) && !card.isFake && !card.isMock && !card.isSample);
            if (kept.length !== cards.length) localStorage.setItem('sigma_user_pocket_cards', JSON.stringify(kept));
        } catch (error) { console.warn('Unable to remove saved demo analytics cards', error); }
    }
    function getDynamicUserPocketCards() {
        removeSavedDemoCards();
        if (location.pathname.toLowerCase().includes('student')) {
            return window.SigmaStudentAnalytics?.getCards() || [];
        }
        try {
            const raw = localStorage.getItem('sigma_user_pocket_cards');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed;
                }
            }
        } catch (e) {}
        return [];
    }

    function pushDynamicPocketCard(cardData) {
        if (!cardData) return;
        try {
            const currentCards = getDynamicUserPocketCards();
            const newCard = {
                id: cardData.id || `sigma-card-dyn-${Date.now()}`,
                category: cardData.category || 'descriptive',
                categoryIcon: cardData.categoryIcon || (cardData.category === 'predictive' ? 'fa-wand-magic-sparkles' : (cardData.category === 'prescriptive' ? 'fa-compass' : 'fa-chart-column')),
                concernTitle: cardData.concernTitle || (cardData.category === 'predictive' ? 'Grades' : (cardData.category === 'prescriptive' ? 'Subjects' : 'Assessments')),
                headerBg: 'bg-[#15803d]',
                headerText: 'text-white',
                headerIconColor: 'text-[#FFD000]',
                dateColor: 'text-white/80',
                date: cardData.date || new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
                strand: cardData.strand || 'Academic',
                subject: cardData.subject || 'Academic Update',
                subjectIcon: cardData.subjectIcon || 'fa-book-open',
                subjectBadgeBg: cardData.subjectBadgeBg || 'bg-blue-50',
                subjectIconColor: cardData.subjectIconColor || 'text-blue-600',
                subjectBadgeBorder: cardData.subjectBadgeBorder || 'border-blue-100',
                concernHighlight: cardData.concernHighlight || 'New Performance Update',
                concernText: cardData.concernText || 'Your latest academic records have been processed by SIGMA AI.',
                barColor: 'bg-[#15803d]'
            };

            // PREPEND: Newest card stacks directly at the very top
            const updatedCards = [newCard, ...currentCards.filter(c => c.id !== newCard.id)];
            localStorage.setItem('sigma_user_pocket_cards', JSON.stringify(updatedCards));

            if (!cardData.isFake && !cardData.isMock && !cardData.isSample) {
                window.dispatchEvent(new CustomEvent('sigma:analytics-insight', { detail: { id: newCard.id } }));
            }

            // Re-render analytics rails
            initAllPocketCardRails();
        } catch (e) {
            console.error('Failed to push dynamic analytics card', e);
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 5. TEACHER CLASS & SECTION MONITORING SIGMA ANALYTICS CATALOG (3 CARDS)
    // ═════════════════════════════════════════════════════════════════════════

    const SigmaAnalytics = {
        render: function (containerId) {
            const el = document.getElementById(containerId);
            if (el) initPocketCardsContainer(el);
        },
        pushCard: pushDynamicPocketCard,
        triggerGradeChange: function (subject, highlight, text, icon = 'fa-coins') {
            pushDynamicPocketCard({
                category: 'predictive',
                categoryIcon: 'fa-wand-magic-sparkles',
                concernTitle: 'Grades',
                subject: subject,
                subjectIcon: icon,
                subjectBadgeBg: 'bg-amber-50',
                subjectIconColor: 'text-amber-600',
                subjectBadgeBorder: 'border-amber-100',
                concernHighlight: highlight,
                concernText: text
            });
        },
        triggerAssessmentChange: function (subject, highlight, text, icon = 'fa-calculator') {
            pushDynamicPocketCard({
                category: 'descriptive',
                categoryIcon: 'fa-chart-column',
                concernTitle: 'Assessments',
                subject: subject,
                subjectIcon: icon,
                subjectBadgeBg: 'bg-blue-50',
                subjectIconColor: 'text-blue-600',
                subjectBadgeBorder: 'border-blue-100',
                concernHighlight: highlight,
                concernText: text
            });
        },
        triggerRecommendation: function (subject, highlight, text, icon = 'fa-code') {
            pushDynamicPocketCard({
                category: 'prescriptive',
                categoryIcon: 'fa-compass',
                concernTitle: 'Subjects',
                subject: subject,
                subjectIcon: icon,
                subjectBadgeBg: 'bg-emerald-50',
                subjectIconColor: 'text-emerald-600',
                subjectBadgeBorder: 'border-emerald-100',
                concernHighlight: highlight,
                concernText: text
            });
        },
        clearCards: function () {
            localStorage.removeItem('sigma_user_pocket_cards');
            initAllPocketCardRails();
            if (window.SigmaAnnouncements && typeof window.SigmaAnnouncements.showToast === 'function') {
                window.SigmaAnnouncements.showToast('Cleared SIGMA Analytics to empty state.', 'info');
            }
        }
    };

    // Global Bindings and Aliases
    window.SigmaAnalytics = SigmaAnalytics;
    window.PocketCards = SigmaAnalytics;
    window.clearDemoPocketCards = () => SigmaAnalytics.clearCards();
    window.getDynamicUserPocketCards = getDynamicUserPocketCards;

    function renderSigmaGradeMonitoringCardHtml(data) {
        if (!data) return '';
        return `
            <div data-id="${data.id}" class="sigma-card pocket-card sigma-card--student pocket-card--student">
                <!-- Card Header: Category Icon + Concern Title (Title Case) + Date + Pin Button -->
                <div class="bg-[#15803d] px-4 py-2 flex items-center justify-between flex-shrink-0 h-[38px] leading-none">
                    <div class="flex items-center gap-2 min-w-0">
                        <i class="fa-solid ${data.categoryIcon} ${data.headerIconColor || 'text-[#FFD000]'} text-[12.5px] flex-shrink-0"></i>
                        <h4 class="text-[13px] font-bold text-white tracking-normal truncate leading-none">${data.concernTitle}</h4>
                    </div>
                    <div class="flex items-center gap-2 flex-shrink-0 leading-none">
                        <span class="text-[10px] text-white/85 font-medium tracking-tight leading-none">${data.date}</span>
                        <button type="button" class="sigma-card-pin-btn pocket-card-pin-btn" title="Pin to top">
                            <i class="fa-solid fa-thumbtack text-[9px]"></i>
                        </button>
                    </div>
                </div>

                <!-- Card Body: Aligned Subject Row + Hairline Divider + Clamped Body -->
                <div class="sigma-card-body pocket-card-body">
                    <!-- Subject Title Row with Centered Icon Badge and Aligned Text -->
                    <div class="flex items-center gap-2.5 pb-2 mb-1.5 border-b border-slate-100 w-full flex-shrink-0">
                        <div class="w-8 h-8 rounded-lg ${data.subjectBadgeBg || 'bg-slate-50'} ${data.subjectIconColor || 'text-slate-700'} flex items-center justify-center flex-shrink-0 border ${data.subjectBadgeBorder || 'border-slate-100'}">
                            <i class="fa-solid ${data.subjectIcon} text-xs"></i>
                        </div>
                        <div class="flex-1 min-w-0 flex flex-col justify-center text-left">
                            <h5 class="text-[11.5px] font-bold text-slate-900 leading-tight truncate">${data.subject}</h5>
                            <p class="text-[9.5px] font-semibold text-[#15803d] leading-tight truncate mt-0.5">${data.concernHighlight}</p>
                        </div>
                    </div>

                    <!-- Concern Body Text: Left aligned, balanced weight, clamped to 3 lines -->
                    <p class="sigma-card-concern-text pocket-card-concern-text">
                        ${data.concernText}
                    </p>
                </div>

                <!-- Bottom Accent Line -->
                <div class="mt-auto h-[2px] w-full bg-[#15803d] flex-shrink-0"></div>
            </div>
        `;
    }

    function createSigmaCardElement(data) {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = renderSigmaGradeMonitoringCardHtml(data);
        const card = wrapper.firstElementChild;
        card.classList.add('dynamic-extra-card');
        return card;
    }

    function getStorageKey(containerId) {
        return `sigma-analytics-pinned-${containerId || 'default'}`;
    }

    function getPinnedCardIds(containerId) {
        try {
            const raw = localStorage.getItem(getStorageKey(containerId)) || localStorage.getItem(`sigma-pocket-pinned-${containerId || 'default'}`);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    }

    function savePinnedCardIds(containerId, pinnedIds) {
        try {
            localStorage.setItem(getStorageKey(containerId), JSON.stringify(pinnedIds));
        } catch (e) {
            console.error('Failed to save pinned analytics cards', e);
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 5. UNIFIED CONTAINER INITIALIZER WITH "MORE" EXPANSION
    // ═════════════════════════════════════════════════════════════════════════
    function initPocketCardsContainer(container, adminActiveItems = null) {
        if (!container) return;

        const containerId = container.id || 'sigma-analytics-rail';
        const isAdmin = containerId === 'dashboard-metrics-container';

        // 1. Destroy Sortable if present
        if (typeof Sortable !== 'undefined') {
            try {
                const sortableInstance = Sortable.get(container);
                if (sortableInstance) sortableInstance.destroy();
            } catch {}
        }

        // 2. Ensure header exists above container
        let headerEl = container.previousElementSibling;
        if (headerEl?.classList.contains('sigma-analysis-status')) headerEl = headerEl.previousElementSibling;
        if (!headerEl || (!headerEl.classList.contains('sigma-rail-header') && !headerEl.classList.contains('pocket-rail-header'))) {
            headerEl = document.createElement('div');
            headerEl.className = 'sigma-rail-header pocket-rail-header';

            const title = isAdmin ? 'System Metrics' : 'SIGMA Analytics';

            if (isAdmin) {
                headerEl.innerHTML = `
                    <span class="sigma-rail-header__title pocket-rail-header__title">${title}</span>
                    <button type="button" class="sigma-rail-header__config-btn pocket-rail-header__config-btn" title="Configure System Metrics" onclick="window.openMetricsConfigModal()">
                        <i class="fa-solid fa-sliders"></i>
                    </button>
                `;
            } else {
                headerEl.innerHTML = `
                    <span class="sigma-rail-header__title pocket-rail-header__title">${title}</span>
                    <button type="button" class="sigma-analyze-button" title="Analyze Now" aria-label="Analyze Now"><i class="fa-solid fa-arrows-rotate" aria-hidden="true"></i></button>
                    <button type="button" class="sigma-rail-header__see-all pocket-rail-header__see-all" title="View all SIGMA Analytics">See all</button>
                `;
            }

            container.parentNode.insertBefore(headerEl, container);

            const seeAllBtn = headerEl.querySelector('.sigma-rail-header__see-all, .pocket-rail-header__see-all');
            if (seeAllBtn) {
                seeAllBtn.addEventListener('click', () => {
                    const moreBtn = container.querySelector('.sigma-rail-more-btn, .pocket-rail-more-btn');
                    if (moreBtn && !isExpanded) {
                        moreBtn.click();
                    }
                });
            }
        }

        // 3. Render initial cards for Student / Teacher if container is empty or needs refresh
        const userCards = !isAdmin ? getDynamicUserPocketCards() : [];
        if (!isAdmin) {
            if (!userCards || userCards.length === 0) {
                container.innerHTML = renderPocketCardZeroStateHtml();
            } else {
                container.innerHTML = userCards.slice(0, 4).map(renderSigmaGradeMonitoringCardHtml).join('');
            }
        }

        // 4. "More" Button Logic for both Admin (>4 active metrics) and Student/Teacher
        let isExpanded = false;
        let moreBtn = container.querySelector('.sigma-rail-more-btn, .pocket-rail-more-btn');

        const totalCardCount = isAdmin ? (adminActiveItems ? adminActiveItems.length : getActiveMetricIds().length) : userCards.length;
        const hasMoreThan4 = totalCardCount > 4;

        if (hasMoreThan4) {
            if (!moreBtn) {
                moreBtn = document.createElement('button');
                moreBtn.type = 'button';
                moreBtn.className = 'sigma-rail-more-btn pocket-rail-more-btn';
                moreBtn.innerHTML = `
                    <span class="more-label">More</span>
                    <i class="fa-solid fa-chevron-down"></i>
                `;
                container.appendChild(moreBtn);
            }

            moreBtn.onclick = (e) => {
                e.preventDefault();
                isExpanded = !isExpanded;

                if (isExpanded) {
                    if (isAdmin) {
                        // Dynamically render extra admin cards (cards 5+)
                        const extraAdminCards = (adminActiveItems || ADMIN_METRICS_CATALOG.filter(item => getActiveMetricIds().includes(item.id))).slice(4);
                        extraAdminCards.forEach(cardItem => {
                            if (!container.querySelector(`[data-id="${cardItem.id}"]`)) {
                                const cardDiv = document.createElement('div');
                                cardDiv.className = 'dynamic-extra-card';
                                cardDiv.innerHTML = renderMetricCardHtml(cardItem);
                                const firstChild = cardDiv.firstElementChild || cardDiv;
                                firstChild.classList.add('dynamic-extra-card');
                                container.insertBefore(firstChild, moreBtn);
                            }
                        });
                        wireInteractiveSwitchers();
                    } else {
                        // Dynamically render extra Student/Teacher SIGMA cards (cards 5-8)
                        const extraCards = getDynamicUserPocketCards().slice(4);
                        extraCards.forEach(cardData => {
                            if (!container.querySelector(`[data-id="${cardData.id}"]`)) {
                                const newCard = createSigmaCardElement(cardData);
                                container.insertBefore(newCard, moreBtn);
                            }
                        });
                    }
                    const moreLabel = moreBtn.querySelector('.more-label');
                    if (moreLabel) moreLabel.textContent = 'Show Less';
                    moreBtn.classList.add('is-expanded');
                } else {
                    // Remove dynamic extra cards
                    container.querySelectorAll('.dynamic-extra-card').forEach(el => el.remove());
                    const moreLabel = moreBtn.querySelector('.more-label');
                    if (moreLabel) moreLabel.textContent = 'More';
                    moreBtn.classList.remove('is-expanded');
                    container.scrollTop = 0;
                }

                refreshPinButtons();
            };
        } else if (moreBtn) {
            moreBtn.remove();
        }

        // Clean up detached legacy sibling button if any
        container.parentNode?.querySelectorAll(':scope > .sigma-rail-more-btn, :scope > .pocket-rail-more-btn').forEach(btn => btn.remove());

        // ═════════════════════════════════════════════════════════════════════
        // UNPIN CONFIRMATION MODAL
        // ═════════════════════════════════════════════════════════════════════
        function showUnpinConfirmationModal(cardTitle, onConfirm) {
            let modal = document.getElementById('sigma-card-unpin-modal') || document.getElementById('pocket-card-unpin-modal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'sigma-card-unpin-modal';
                modal.className = 'fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[99999]';
                modal.innerHTML = `
                    <div class="bg-white rounded-2xl p-5 max-w-xs w-full text-center shadow-2xl border border-slate-100 relative z-[100000]">
                        <div class="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
                            <i class="fa-solid fa-thumbtack text-sm"></i>
                        </div>
                        <h4 class="text-xs font-black text-slate-900 uppercase tracking-wider mb-1">Unpin this Card?</h4>
                        <p id="unpin-modal-desc" class="text-[11px] text-slate-500 leading-relaxed mb-4 font-normal">
                            Are you sure you want to unpin this card and return it to its standard position?
                        </p>
                        <div class="flex items-center gap-2">
                            <button type="button" id="btn-cancel-unpin" class="flex-1 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer">
                                Cancel
                            </button>
                            <button type="button" id="btn-confirm-unpin" class="flex-1 py-2 bg-[#15803d] text-white rounded-xl text-[11px] font-bold hover:bg-[#166534] transition-colors shadow-xs cursor-pointer">
                                Yes, Unpin
                            </button>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);

                modal.addEventListener('click', (e) => {
                    if (e.target === modal) modal.classList.add('hidden');
                });
            }

            const descEl = modal.querySelector('#unpin-modal-desc');
            if (descEl && cardTitle) {
                descEl.textContent = `Are you sure you want to unpin "${cardTitle}" and return it to its standard position?`;
            }

            const cancelBtn = modal.querySelector('#btn-cancel-unpin');
            const confirmBtn = modal.querySelector('#btn-confirm-unpin');

            modal.classList.remove('hidden');

            cancelBtn.onclick = () => {
                modal.classList.add('hidden');
            };

            confirmBtn.onclick = () => {
                modal.classList.add('hidden');
                if (typeof onConfirm === 'function') onConfirm();
            };
        }

        function refreshPinButtons() {
            if (isAdmin) {
                container.querySelectorAll('.sigma-card-pin-btn, .pocket-card-pin-btn').forEach(btn => btn.remove());
                return;
            }

            const cards = Array.from(container.querySelectorAll(':scope > .sigma-card:not([data-id="metric-empty-state"]):not([data-id="pocket-card-empty-state"]), :scope > .pocket-card:not([data-id="metric-empty-state"]):not([data-id="pocket-card-empty-state"]), :scope > [data-id^="sigma-"]'));
            const pinnedIds = getPinnedCardIds(containerId);
            const isMaxPinned = pinnedIds.length >= 2;

            cards.forEach(card => {
                const cardId = card.dataset.id || card.id || '';
                const isPinned = cardId && pinnedIds.includes(cardId);
                card.classList.toggle('is-pinned-card', isPinned);

                let pinBtn = card.querySelector('.sigma-card-pin-btn, .pocket-card-pin-btn');
                if (!pinBtn) {
                    pinBtn = document.createElement('button');
                    pinBtn.type = 'button';
                    pinBtn.className = 'sigma-card-pin-btn pocket-card-pin-btn';
                    pinBtn.innerHTML = '<i class="fa-solid fa-thumbtack text-[10px]"></i>';

                    const header = card.querySelector('.sigma-card-header, .pocket-card-header, :scope > div:first-child');
                    if (header) {
                        header.appendChild(pinBtn);
                    } else {
                        card.insertBefore(pinBtn, card.firstChild);
                    }
                }

                pinBtn.classList.toggle('is-pinned', isPinned);

                if (isPinned) {
                    pinBtn.disabled = false;
                    pinBtn.classList.remove('opacity-25', 'cursor-not-allowed', 'pointer-events-none');
                    pinBtn.classList.add('cursor-pointer');
                    pinBtn.title = 'Unpin from top';
                } else if (isMaxPinned) {
                    pinBtn.disabled = true;
                    pinBtn.classList.add('opacity-25', 'cursor-not-allowed', 'pointer-events-none');
                    pinBtn.classList.remove('cursor-pointer');
                    pinBtn.title = 'Maximum 2 cards pinned';
                } else {
                    pinBtn.disabled = false;
                    pinBtn.classList.remove('opacity-25', 'cursor-not-allowed', 'pointer-events-none');
                    pinBtn.classList.add('cursor-pointer');
                    pinBtn.title = 'Pin to top (Max 2)';
                }

                // Bind click with confirmation on unpin
                pinBtn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    if (isPinned) {
                        const subjectTitle = card.querySelector('h5, h4')?.textContent?.trim() || 'this card';
                        showUnpinConfirmationModal(subjectTitle, () => {
                            executeUnpin(cardId);
                        });
                    } else if (!isMaxPinned) {
                        executePin(cardId);
                    }
                };
            });
        }

        function sortPinnedCards() {
            if (isAdmin) return;

            const cards = Array.from(container.querySelectorAll(':scope > .sigma-card:not([data-id="metric-empty-state"]):not([data-id="pocket-card-empty-state"]), :scope > .pocket-card:not([data-id="metric-empty-state"]):not([data-id="pocket-card-empty-state"]), :scope > [data-id^="sigma-"]'));
            const pinnedIds = getPinnedCardIds(containerId);
            const pinnedCards = [];
            const unpinnedCards = [];

            cards.forEach(card => {
                const cardId = card.dataset.id || card.id || '';
                if (cardId && pinnedIds.includes(cardId)) {
                    pinnedCards.push(card);
                } else {
                    unpinnedCards.push(card);
                }
            });

            // 1. Pinned cards: Placed at top in order of pinning (max 2)
            pinnedCards.sort((a, b) => {
                const idA = a.dataset.id || a.id || '';
                const idB = b.dataset.id || b.id || '';
                return pinnedIds.indexOf(idA) - pinnedIds.indexOf(idB);
            });

            // 2. Unpinned cards: Restore to original chronological/catalog position
            if (!isAdmin) {
                unpinnedCards.sort((a, b) => {
                    const idA = a.dataset.id || a.id || '';
                    const idB = b.dataset.id || b.id || '';
                    const cards = getDynamicUserPocketCards();
                    const idxA = cards.findIndex(c => c.id === idA);
                    const idxB = cards.findIndex(c => c.id === idB);
                    return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
                });
            }

            [...pinnedCards, ...unpinnedCards].forEach(card => {
                if (moreBtn && moreBtn.parentNode === container) {
                    container.insertBefore(card, moreBtn);
                } else {
                    container.appendChild(card);
                }
            });
        }

        function executePin(cardId) {
            if (!cardId) return;
            let pinnedIds = getPinnedCardIds(containerId);
            if (!pinnedIds.includes(cardId) && pinnedIds.length < 2) {
                pinnedIds.unshift(cardId);
                savePinnedCardIds(containerId, pinnedIds);
                sortPinnedCards();
                refreshPinButtons();
            }
        }

        function executeUnpin(cardId) {
            if (!cardId) return;
            let pinnedIds = getPinnedCardIds(containerId);
            pinnedIds = pinnedIds.filter(id => id !== cardId);
            savePinnedCardIds(containerId, pinnedIds);
            sortPinnedCards();
            refreshPinButtons();
        }

        sortPinnedCards();
        refreshPinButtons();

        window.addEventListener('sigma:refresh-pocket-cards', () => {
            sortPinnedCards();
            refreshPinButtons();
        });
        window.addEventListener('sigma:refresh-analytics-cards', () => {
            sortPinnedCards();
            refreshPinButtons();
        });
    }

    function initAllPocketCardRails() {
        const adminContainer = document.getElementById('dashboard-metrics-container');
        if (adminContainer) {
            renderAdminPocketCards();
        }

        const containers = document.querySelectorAll('#sigma-panels-container, .sigma-analytics-rail, .pocket-cards-rail');
        containers.forEach(container => initPocketCardsContainer(container));
    }


    // ═════════════════════════════════════════════════════════════════════════
    // 7. UNIFIED SIGMA GRADEBOOK & DEPED K-12 GRADING ENGINE (SHARED BY ALL ROLES)
    // ═════════════════════════════════════════════════════════════════════════
    
    // Official DepEd K-12 Transmutation Table (DepEd Order No. 8, s. 2015)
    const DEPED_TRANSMUTATION_TABLE = [
        { min: 100.00, grade: 100 },
        { min: 98.40, grade: 99 },
        { min: 96.80, grade: 98 },
        { min: 95.20, grade: 97 },
        { min: 93.60, grade: 96 },
        { min: 92.00, grade: 95 },
        { min: 90.40, grade: 94 },
        { min: 88.80, grade: 93 },
        { min: 87.20, grade: 92 },
        { min: 85.60, grade: 91 },
        { min: 84.00, grade: 90 },
        { min: 82.40, grade: 89 },
        { min: 80.80, grade: 88 },
        { min: 79.20, grade: 87 },
        { min: 77.60, grade: 86 },
        { min: 76.00, grade: 85 },
        { min: 74.40, grade: 84 },
        { min: 72.80, grade: 83 },
        { min: 71.20, grade: 82 },
        { min: 69.60, grade: 81 },
        { min: 68.00, grade: 80 },
        { min: 66.40, grade: 79 },
        { min: 64.80, grade: 78 },
        { min: 63.20, grade: 77 },
        { min: 61.60, grade: 76 },
        { min: 60.00, grade: 75 },
        { min: 56.00, grade: 74 },
        { min: 52.00, grade: 73 },
        { min: 48.00, grade: 72 },
        { min: 44.00, grade: 71 },
        { min: 40.00, grade: 70 },
        { min: 36.00, grade: 69 },
        { min: 32.00, grade: 68 },
        { min: 28.00, grade: 67 },
        { min: 24.00, grade: 66 },
        { min: 20.00, grade: 65 },
        { min: 16.00, grade: 64 },
        { min: 12.00, grade: 63 },
        { min: 8.00, grade: 62 },
        { min: 4.00, grade: 61 },
        { min: 0.00, grade: 60 }
    ];

    // Standard DepEd Assessment Weights by Senior High School Strand
    const STRAND_ASSESSMENT_WEIGHTS = {
        'ICT': { name: 'Information & Communications Tech (TVL)', ww: 0.20, pt: 0.60, qa: 0.20 },
        'HE': { name: 'Home Economics (TVL)', ww: 0.20, pt: 0.60, qa: 0.20 },
        'ABM': { name: 'Accountancy, Business & Management', ww: 0.25, pt: 0.45, qa: 0.30 },
        'HUMSS': { name: 'Humanities & Social Sciences', ww: 0.25, pt: 0.50, qa: 0.25 },
        'GAS': { name: 'General Academic Strand', ww: 0.25, pt: 0.50, qa: 0.25 },
        'CORE': { name: 'Core Curriculum Subjects', ww: 0.25, pt: 0.50, qa: 0.25 }
    };

    const SigmaGradeEngine = {
        transmute(rawScore) {
            const num = Math.min(100, Math.max(0, Number(rawScore) || 0));
            for (const tier of DEPED_TRANSMUTATION_TABLE) {
                if (num >= tier.min) return tier.grade;
            }
            return 60;
        },

        getWeights(strandCode = 'CORE') {
            const code = String(strandCode || 'CORE').toUpperCase().trim();
            return STRAND_ASSESSMENT_WEIGHTS[code] || STRAND_ASSESSMENT_WEIGHTS['CORE'];
        },

        computeQuarterGrade({ wwRaw = 0, wwTotal = 100, ptRaw = 0, ptTotal = 100, qaRaw = 0, qaTotal = 100, strand = 'CORE' }) {
            const weights = this.getWeights(strand);
            const wwPct = wwTotal > 0 ? (wwRaw / wwTotal) * 100 : 0;
            const ptPct = ptTotal > 0 ? (ptRaw / ptTotal) * 100 : 0;
            const qaPct = qaTotal > 0 ? (qaRaw / qaTotal) * 100 : 0;

            const initialGrade = (wwPct * weights.ww) + (ptPct * weights.pt) + (qaPct * weights.qa);
            const transmuted = this.transmute(initialGrade);

            return {
                wwPercentage: Math.round(wwPct * 100) / 100,
                ptPercentage: Math.round(ptPct * 100) / 100,
                qaPercentage: Math.round(qaPct * 100) / 100,
                initialGrade: Math.round(initialGrade * 100) / 100,
                transmutedGrade: transmuted,
                isPassing: transmuted >= 75
            };
        },

        compute(ww, pt, qa, strand = 'CORE') {
            return this.computeQuarterGrade({
                wwRaw: ww,
                wwTotal: 100,
                ptRaw: pt,
                ptTotal: 100,
                qaRaw: qa,
                qaTotal: 100,
                strand: strand
            });
        },

        getHonorDistinction(gwa) {
            const num = Number(gwa) || 0;
            if (num >= 98) return { label: 'With Highest Honors', badgeClass: 'bg-amber-100 text-amber-800 border-amber-300' };
            if (num >= 95) return { label: 'With High Honors', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
            if (num >= 90) return { label: 'With Honors', badgeClass: 'bg-blue-100 text-blue-800 border-blue-300' };
            if (num >= 75) return { label: 'Passed', badgeClass: 'bg-slate-100 text-slate-700 border-slate-200' };
            return { label: 'Needs Remediation', badgeClass: 'bg-rose-100 text-rose-700 border-rose-200' };
        }
    };

    // Shared UI Workstation Renderer for Admin, Teacher, and Student
    window.SigmaGradeEngine = SigmaGradeEngine;

    // Helper to get demo student roster
    function getDemoGradebookStudents(sectionName = 'ICT 11-A') {
        const sampleStudents = [
            { id: '2026-0001', name: 'Alvarez, Marco J.', gender: 'Male', lrn: '136542090001', strand: 'ICT', grade: 11, section: 'ICT 11-A' },
            { id: '2026-0002', name: 'Bautista, Sophia L.', gender: 'Female', lrn: '136542090002', strand: 'ABM', grade: 12, section: 'ABM 12-A' },
            { id: '2026-0003', name: 'Castillo, Joshua R.', gender: 'Male', lrn: '136542090003', strand: 'HUMSS', grade: 11, section: 'HUMSS 11-B' },
            { id: '2026-0004', name: 'Dela Cruz, Maria C.', gender: 'Female', lrn: '136542090004', strand: 'HE', grade: 12, section: 'HE 12-A' },
            { id: '2026-0005', name: 'Espinosa, Gabriel T.', gender: 'Male', lrn: '136542090005', strand: 'GAS', grade: 11, section: 'GAS 11-A' },
            { id: '2026-0006', name: 'Flores, Kimberly N.', gender: 'Female', lrn: '136542090006', strand: 'ICT', grade: 11, section: 'ICT 11-B' }
        ];
        return sampleStudents;
    }

    function loadAdminGradebookWeights(subjectId = null) {
        const subKey = subjectId || window.sigmaGradesState?.selectedSubject || window.sigmaGradesState?.selectedSubjectSection?.subject;
        if (typeof window.getSubjectGradebookWeights === 'function' && subKey) {
            return window.getSubjectGradebookWeights(subKey);
        }
        try {
            const raw = localStorage.getItem('sigma-teacher-gradebook-weights');
            const parsed = raw ? JSON.parse(raw) : null;
            if (parsed && typeof parsed === 'object') {
                if (subKey && parsed[subKey]) {
                    const sw = parsed[subKey];
                    return {
                        ww: Number.isFinite(Number(sw.ww)) ? Number(sw.ww) : 25,
                        pt: Number.isFinite(Number(sw.pt)) ? Number(sw.pt) : 50,
                        qa: Number.isFinite(Number(sw.qa)) ? Number(sw.qa) : 25
                    };
                }
                const ww = Number(parsed?.ww);
                const pt = Number(parsed?.pt);
                const qa = Number(parsed?.qa);
                if (Number.isFinite(ww) && Number.isFinite(pt) && Number.isFinite(qa)) {
                    return { ww, pt, qa };
                }
            }
            if (typeof window.getDefaultWeightsForSubject === 'function' && subKey) {
                return window.getDefaultWeightsForSubject(subKey);
            }
            return { ww: 25, pt: 50, qa: 25 };
        } catch (e) {
            return { ww: 25, pt: 50, qa: 25 };
        }
    }
    window.loadAdminGradebookWeights = loadAdminGradebookWeights;

    function isCurrentPageTeacherPortal() {
        if (typeof window !== 'undefined') {
            const path = (window.location.pathname || '').toLowerCase();
            const href = (window.location.href || '').toLowerCase();
            // If on Admin portal, STRICTLY NEVER teacher portal
            if (path.includes('admin') || href.includes('admin') || href.includes('admin.html') || href.includes('admin.php')) {
                return false;
            }
            if (typeof document !== 'undefined') {
                if (document.getElementById('school-grades-view') || document.getElementById('admin-sidebar') || document.getElementById('sidebar-admin') || document.querySelector('[data-page="admin"]') || (document.title && document.title.toLowerCase().includes('school management'))) {
                    return false;
                }
            }
        }
        if (window.sigmaGradesState && (window.sigmaGradesState.role === 'admin' || window.sigmaGradesState.isTeacherPage === false)) {
            return false;
        }
        if (window.sigmaGradesState && (window.sigmaGradesState.role === 'teacher' || window.sigmaGradesState.isTeacherPage === true)) {
            return true;
        }
        if (typeof window !== 'undefined') {
            const path = (window.location.pathname || '').toLowerCase();
            const href = (window.location.href || '').toLowerCase();
            if (path.includes('teacher') || href.includes('teacher') || href.includes('teacher.html') || href.includes('teacher.php')) return true;
            if (typeof document !== 'undefined') {
                if (document.getElementById('teacher-header') || document.getElementById('section-grades') || document.getElementById('teacher-sidebar')) return true;
                if (document.body && (document.body.id === 'teacher-body' || (document.body.className && document.body.className.includes('teacher')))) return true;
            }
        }
        return false;
    }
    window.isCurrentPageTeacherPortal = isCurrentPageTeacherPortal;

    function resolveCurrentLoggedInTeacher() {
        let authUser = {};
        const isTeacherPortal = isCurrentPageTeacherPortal();
        const hasExplicitLogin = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('sigma-login-explicit') === 'true');
        try {
            authUser = JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}');
            if (!authUser || (!authUser.id && !authUser.uid && !authUser.name && !authUser.firstName)) {
                authUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
            }
            if (!authUser || (!authUser.id && !authUser.uid && !authUser.name && !authUser.firstName)) {
                authUser = JSON.parse(localStorage.getItem('sigma-logged-in-user') || '{}');
            }
        } catch (e) {}

        const cleanStr = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

        const defaultTeacher = {
            id: '1111111',
            uid: '1111111',
            firstName: 'Maria',
            middleName: 'Santos',
            lastName: 'Ramos',
            fullName: 'Maria Santos Ramos',
            name: 'Maria Santos Ramos',
            role: 'Teacher',
            type: 'Teacher',
            status: 'Active',
            gender: 'Female',
            branch: 'Main Campus',
            department: 'Senior High School - Faculty',
            section: 'Rizal',
            sections: ['Rizal'],
            assignedSections: ['Rizal'],
            subject: 'Computer Programming 1',
            subjects: ['Computer Programming 1', 'Empowerment Technologies', 'Oral Communication'],
            assignedSubjects: ['Computer Programming 1', 'Empowerment Technologies', 'Oral Communication'],
            email: 'maria.ramos@gmail.com'
        };

        const authIdRaw = String(authUser?.id || authUser?.uid || '').replace(/^#/, '').trim().toLowerCase();
        // Default to Maria Santos Ramos only when no account is authenticated
        if (!authIdRaw) {
            authUser = defaultTeacher;
        }

        let allUsers = [];
        const storageKeys = ['sigma-admin-users', 'sigma-users-list', 'sigma-teacher-users', 'sigma-teacher-users-v1', 'sigma-users'];
        for (const key of storageKeys) {
            try {
                const raw = localStorage.getItem(key);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        allUsers = allUsers.concat(parsed);
                    }
                }
            } catch (e) {}
        }

        const authId = String(authUser.id || authUser.uid || '').trim();
        const authEmail = (authUser.email || '').toLowerCase().trim();
        const authFullName = cleanStr(authUser.fullName || authUser.name || `${authUser.firstName || ''} ${authUser.lastName || ''}`);

        let matchedUser = null;
        if (authId && !authId.toLowerCase().includes('default')) {
            matchedUser = allUsers.find(u => String(u.uid || u.id || '').trim().toLowerCase() === authId.toLowerCase());
        }
        if (!matchedUser && authEmail) {
            matchedUser = allUsers.find(u => (u.email || '').toLowerCase().trim() === authEmail);
        }
        if (!matchedUser && authFullName) {
            matchedUser = allUsers.find(u => {
                const uName = cleanStr(u.fullName || u.name || `${u.firstName || ''} ${u.lastName || ''}`);
                const uRev = cleanStr(`${u.lastName || ''} ${u.firstName || ''}`);
                return uName === authFullName || uRev === authFullName;
            });
        }

        if (matchedUser) {
            const finalId = String(matchedUser.uid || matchedUser.id || authId).trim();
            const finalFn = matchedUser.firstName || authUser.firstName || 'Teacher';
            const finalLn = matchedUser.lastName || authUser.lastName || '';
            const finalFull = matchedUser.fullName || matchedUser.name || authUser.fullName || `${finalFn} ${finalLn}`.trim();
            const baseObj = {
                ...matchedUser,
                ...authUser,
                id: finalId,
                uid: finalId,
                firstName: finalFn,
                lastName: finalLn,
                fullName: finalFull,
                name: finalFull,
                role: 'Teacher'
            };
            if (finalId === '1111111') {
                baseObj.section = 'Rizal';
                baseObj.sections = ['Rizal'];
                baseObj.assignedSections = ['Rizal'];
                baseObj.subject = 'Computer Programming 1';
                baseObj.subjects = ['Computer Programming 1', 'Empowerment Technologies', 'Oral Communication'];
                baseObj.assignedSubjects = ['Computer Programming 1', 'Empowerment Technologies', 'Oral Communication'];
            }
            return baseObj;
        }

        if (authId || authFullName || authUser.firstName) {
            const finalId = authId || 'teacher_user';
            const finalFn = authUser.firstName || (authUser.name ? authUser.name.split(' ')[0] : 'Teacher');
            const finalLn = authUser.lastName || (authUser.name ? authUser.name.split(' ').slice(1).join(' ') : '');
            const finalFull = authUser.fullName || authUser.name || `${finalFn} ${finalLn}`.trim();
            const baseObj = {
                ...authUser,
                id: finalId,
                uid: finalId,
                firstName: finalFn,
                lastName: finalLn,
                fullName: finalFull,
                name: finalFull,
                role: 'Teacher'
            };
            if (finalId === '1111111') {
                baseObj.section = 'Rizal';
                baseObj.sections = ['Rizal'];
                baseObj.assignedSections = ['Rizal'];
                baseObj.subject = 'Computer Programming 1';
                baseObj.subjects = ['Computer Programming 1', 'Empowerment Technologies', 'Oral Communication'];
                baseObj.assignedSubjects = ['Computer Programming 1', 'Empowerment Technologies', 'Oral Communication'];
            }
            return baseObj;
        }

        return defaultTeacher;
    }

    function getEffectiveTeacher() {
        if (isCurrentPageTeacherPortal()) {
            let currentTeacher = null;
            try {
                if (typeof window.getLoggedInTeacherUser === 'function') {
                    currentTeacher = window.getLoggedInTeacherUser();
                } else if (typeof window.teacherData === 'object' && window.teacherData) {
                    currentTeacher = window.teacherData;
                }
            } catch (e) {}

            if (!currentTeacher) {
                currentTeacher = resolveCurrentLoggedInTeacher();
            }

            if (window.sigmaGradesState) {
                window.sigmaGradesState.selectedTeacher = currentTeacher;
                window.sigmaGradesState.isTeacherPage = true;
            }
            return currentTeacher;
        }

        if (window.sigmaGradesState && window.sigmaGradesState.selectedTeacher) {
            return window.sigmaGradesState.selectedTeacher;
        }
        return null;
    }
    window.getEffectiveTeacher = getEffectiveTeacher;

    // Unified Grades State for Admin / Cross-Role Portal
    const initialIsTeacher = isCurrentPageTeacherPortal();
    window.sigmaGradesState = {
        activeTab: 'analytics', // 'analytics' or 'gradebook'
        activeQuarter: 1,
        activeStrand: 'ALL',
        isTeacherPage: initialIsTeacher,
        selectedTeacher: initialIsTeacher ? getEffectiveTeacher() : null,
        selectedSubjectSection: null, // Default: null (Select Subject and Section)
        selectedSection: '',
        selectedSubject: '',
        weights: loadAdminGradebookWeights()
    };

    window.getAdminTeacherList = function () {
        let allUsers = [];
        const storageKeys = ['sigma-admin-users', 'sigma-users-list', 'sigma-teacher-users', 'sigma-teacher-users-v1', 'sigma-users'];
        for (const key of storageKeys) {
            try {
                const raw = localStorage.getItem(key);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        allUsers = allUsers.concat(parsed);
                    }
                }
            } catch (e) {}
        }

        const seenTeacherIds = new Set();
        const teacherUsers = allUsers.filter(u => {
            if (!u) return false;
            if (u.isFake || u.isMock || u.isSample) return false;
            const role = String(u.role || u.type || '').toLowerCase();
            const isTeacherRole = role.includes('teach') || role.includes('faculty') || role.includes('instructor');
            if (!isTeacherRole) return false;
            const idKey = String(u.uid || u.id || u.email || `${u.firstName || ''} ${u.lastName || ''}`).toLowerCase().trim();
            if (!idKey || seenTeacherIds.has(idKey)) return false;
            seenTeacherIds.add(idKey);
            return true;
        });

        return teacherUsers;
    };

    // Query all subjects and sections connected to a specific teacher's account
    window.getTeacherAssignedSubjectsAndSections = function (teacher) {
        if (!teacher) teacher = getEffectiveTeacher();
        if (!teacher) return [];

        const cleanStr = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

        const teacherId = String(teacher.uid || teacher.id || teacher.employeeId || '').toLowerCase().trim();
        const teacherEmail = String(teacher.email || '').toLowerCase().trim();
        const teacherFullName = cleanStr(teacher.fullName || teacher.name || `${teacher.firstName || ''} ${teacher.lastName || ''}`);
        const teacherRevName = cleanStr(`${teacher.lastName || ''} ${teacher.firstName || ''}`);
        const teacherFirst = cleanStr(teacher.firstName || '');
        const teacherLast = cleanStr(teacher.lastName || '');

        const isNameMatch = (targetName) => {
            if (!targetName) return false;
            if (typeof window.isUserNameMatch === 'function') {
                return window.isUserNameMatch(targetName, teacher);
            }
            const tNorm = cleanStr(targetName);
            if (!tNorm) return false;
            if (['teacher', 'adviser', 'instructor', 'faculty', 'none', 'n a', 'tba', 'unassigned', 'staff'].includes(tNorm)) return false;
            if (teacherFullName && (tNorm === teacherFullName || tNorm === teacherRevName)) return true;
            if (teacherFullName && (tNorm.includes(teacherFullName) || teacherFullName.includes(tNorm))) return true;
            if (teacherFirst && teacherLast && teacherFirst.length >= 2 && teacherLast.length >= 2) {
                const words = new Set(tNorm.split(' '));
                if (words.has(teacherFirst) && words.has(teacherLast)) return true;
            }
            return false;
        };

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

        const combinedSections = [];
        const seenSecKeys = new Set();
        ['sigma-admin-sections', 'sigma-sections-list', 'sigma-admin-sections-v1', 'sigma-sections'].forEach(key => {
            let list = [];
            try {
                if (typeof window.getStoredJson === 'function') {
                    list = window.getStoredJson(key, []);
                } else {
                    list = JSON.parse(localStorage.getItem(key) || '[]');
                }
            } catch (e) { list = []; }
            if (Array.isArray(list)) {
                list.forEach(sec => {
                    if (!sec) return;
                    const sId = String(sec.id || '');
                    const sName = String(sec.name || sec.sectionName || '').trim().toLowerCase();
                    const sSubj = String(sec.subject || sec.assignedSubject || (Array.isArray(sec.assignedSubjects) && sec.assignedSubjects[0]) || '').trim().toLowerCase();
                    const uniqueSecKey = `${sId}::${sName}::${sSubj}`;
                    if (!seenSecKeys.has(uniqueSecKey)) {
                        seenSecKeys.add(uniqueSecKey);
                        combinedSections.push(sec);
                    }
                });
            }
        });

        const results = [];
        const seenKeys = new Set();

        const assignedSectionIds = new Set(
            (Array.isArray(teacher.assignedSections) ? teacher.assignedSections : [])
                .concat(Array.isArray(teacher.sections) ? teacher.sections : [])
                .concat(Array.isArray(teacher.enrolledSections) ? teacher.enrolledSections : [])
                .concat(teacher.section ? [teacher.section] : [])
                .map(s => cleanStr(typeof s === 'object' ? (s.id || s.name || s.sectionName) : s))
                .filter(Boolean)
        );

        if (Array.isArray(combinedSections)) {
            combinedSections.forEach(sec => {
                if (!sec || sec.status === 'Archived') return;
                const secId = String(sec.id || '').toLowerCase().trim();
                const secName = String(sec.name || sec.sectionName || '').trim();
                const secNameClean = cleanStr(secName);

                let matched = false;
                let teacherRole = 'Teacher';
                let assignedSubject = sec.subject || sec.assignedSubject || (Array.isArray(sec.assignedSubjects) && sec.assignedSubjects[0]) || sec.subjectName || 'Core Subject';

                // Check via canonical isSectionAssignedToTeacher
                if (typeof window.isSectionAssignedToTeacher === 'function') {
                    matched = window.isSectionAssignedToTeacher(sec, teacher);
                }

                // 1. Check sec.teachers array (Primary source from Admin Section Modal table)
                const secTeachers = getSafeList(sec.teachers)
                    .concat(getSafeList(sec.assignedTeachers))
                    .concat(getSafeList(sec.coTeachers))
                    .concat(getSafeList(sec.instructors));

                const hasExplicitRoster = secTeachers.length > 0 || Boolean(sec.teacher) || Boolean(sec.adviser) || Boolean(sec.leadTeacher) || Boolean(sec.coTeacher);

                if (secTeachers.length > 0) {
                    for (const t of secTeachers) {
                        if (!t) continue;
                        if (typeof t === 'string') {
                            if (isNameMatch(t)) {
                                matched = true;
                                if (sec.adviser && isNameMatch(sec.adviser)) {
                                    teacherRole = 'Adviser';
                                } else {
                                    teacherRole = sec.role || 'Teacher';
                                }
                                break;
                            }
                        } else if (typeof t === 'object') {
                            const tId = String(t.uid || t.id || t.employeeId || '').toLowerCase().trim();
                            const tEm = String(t.email || '').toLowerCase().trim();
                            const tNm = t.fullName || t.name || `${t.firstName || ''} ${t.lastName || ''}`;

                            const isMatch = (teacherId && tId && tId === teacherId) ||
                                (teacherEmail && tEm && tEm === teacherEmail) ||
                                isNameMatch(tNm);

                            if (isMatch) {
                                matched = true;
                                if (t.subject) assignedSubject = t.subject;
                                teacherRole = (t.role === 'Adviser' || (sec.adviser && (isNameMatch(sec.adviser) || (sec.adviserId && String(sec.adviserId).toLowerCase().trim() === teacherId))))
                                    ? 'Adviser'
                                    : 'Teacher';
                                break;
                            }
                        }
                    }
                }

                // 2. Check sec.adviser / sec.adviserId / sec.adviserEmail / sec.leadTeacher
                if (!matched) {
                    const advId = String(sec.adviserId || sec.adviserUid || '').toLowerCase().trim();
                    const advEmail = String(sec.adviserEmail || '').toLowerCase().trim();
                    if ((advId && teacherId && advId === teacherId) ||
                        (advEmail && teacherEmail && advEmail === teacherEmail) ||
                        (sec.adviser && isNameMatch(typeof sec.adviser === 'object' ? (sec.adviser.name || sec.adviser.fullName) : sec.adviser)) ||
                        (sec.leadTeacher && isNameMatch(typeof sec.leadTeacher === 'object' ? (sec.leadTeacher.name || sec.leadTeacher.fullName) : sec.leadTeacher)) ||
                        (sec.lead && isNameMatch(typeof sec.lead === 'object' ? (sec.lead.name || sec.lead.fullName) : sec.lead))) {
                        matched = true;
                        teacherRole = (sec.adviser && isNameMatch(typeof sec.adviser === 'object' ? (sec.adviser.name || sec.adviser.fullName) : sec.adviser)) ? 'Adviser' : 'Teacher';
                    }
                }

                // 3. Check sec.teacher / sec.teacherUid / sec.teacherEmail
                if (!matched) {
                    const secTeacherUid = String(sec.teacherUid || sec.teacherId || '').toLowerCase().trim();
                    const secTeacherEmail = String(sec.teacherEmail || '').toLowerCase().trim();
                    if ((teacherId && secTeacherUid && secTeacherUid === teacherId) ||
                        (teacherEmail && secTeacherEmail && secTeacherEmail === teacherEmail) ||
                        (sec.teacher && isNameMatch(typeof sec.teacher === 'object' ? (sec.teacher.name || sec.teacher.fullName) : sec.teacher))) {
                        matched = true;
                        teacherRole = ((sec.adviser && (isNameMatch(sec.adviser) || (sec.adviserId && String(sec.adviserId).toLowerCase().trim() === teacherId))) || sec.role === 'Adviser')
                            ? 'Adviser'
                            : 'Teacher';
                    }
                }

                // 4. Fallback ONLY if section has no teacher roster defined at all
                if (!matched && !hasExplicitRoster) {
                    if (secId && (assignedSectionIds.has(cleanStr(secId)) || assignedSectionIds.has(secId))) {
                        matched = true;
                        teacherRole = 'Teacher';
                    }
                }

                if (matched) {
                    const displaySecName = sec.name || sec.sectionName || 'Unnamed Section';
                    const secGrade = sec.grade || sec.gradeLevel || 'Grade 11';
                    const displaySubject = String(sec.subject || sec.assignedSubject || (Array.isArray(sec.assignedSubjects) && sec.assignedSubjects[0]) || (Array.isArray(sec.subjects) && sec.subjects[0]) || assignedSubject || sec.name || 'Core Subject').trim();
                    if (!displaySubject) return;

                        // Determine subject available quarters
                        let quarters = [1, 2];
                        if (typeof window.getSubjectAvailableQuarters === 'function') {
                            quarters = window.getSubjectAvailableQuarters(displaySubject);
                        } else {
                            const sem = String(sec.semester || sec.term || '').toLowerCase();
                            if (sem.includes('2') || sem.includes('second') || sem.includes('sem 2') || sem.includes('2nd')) {
                                quarters = [3, 4];
                            } else {
                                quarters = [1, 2];
                            }
                        }

                        // STRICT DEDUPLICATION: Key by sectionName and subject
                        const itemKey = `${cleanStr(displaySecName)}::${cleanStr(displaySubject)}`;
                        const existingIdx = results.findIndex(r => `${cleanStr(r.sectionName)}::${cleanStr(r.subject)}` === itemKey);

                        if (existingIdx !== -1) {
                            if (teacherRole === 'Adviser') {
                                results[existingIdx].role = 'Adviser';
                            }
                        } else {
                            seenKeys.add(itemKey);
                            results.push({
                                id: sec.id ? `${sec.id}-${displaySubject.replace(/\s+/g, '_')}` : `sec-${sec.code || displaySecName}-${displaySubject.replace(/\s+/g, '_')}`,
                                sectionName: displaySecName,
                                grade: secGrade,
                                subject: displaySubject,
                                role: teacherRole, // 'Adviser' or 'Teacher'
                                semester: quarters.includes(3) || quarters.includes(4) ? '2nd Semester' : '1st Semester',
                                quarters: quarters, // [1, 2] or [3, 4]
                                room: sec.room || 'Room 101',
                                schedule: sec.schedule || (sec.startTime && sec.endTime ? `${sec.daysFormatted || ''} ${sec.startTime} - ${sec.endTime}` : 'Regular Schedule'),
                                rawSection: sec
                            });
                        }
                    }
                });
            }

        if (results.length === 0) {
            const isMaria = teacherId === '1111111' ||
                (teacherFirst === 'maria' && teacherLast === 'ramos') ||
                (teacherFullName.includes('maria') && teacherFullName.includes('ramos'));
            if (isMaria) {
                const defaultMariaItems = [
                    {
                        id: 'sec-rizal-computer_programming_1',
                        sectionName: 'Rizal',
                        grade: 'Grade 11',
                        subject: 'Computer Programming 1',
                        role: 'Teacher',
                        semester: '1st Semester',
                        quarters: [1, 2],
                        room: 'Room 302',
                        schedule: 'Mon-Fri 09:00 AM - 10:30 AM'
                    },
                    {
                        id: 'sec-rizal-empowerment_technologies',
                        sectionName: 'Rizal',
                        grade: 'Grade 11',
                        subject: 'Empowerment Technologies',
                        role: 'Teacher',
                        semester: '2nd Semester',
                        quarters: [3, 4],
                        room: 'Room 302',
                        schedule: 'Mon-Fri 03:00 PM - 04:30 PM'
                    },
                    {
                        id: 'sec-rizal-oral_communication',
                        sectionName: 'Rizal',
                        grade: 'Grade 11',
                        subject: 'Oral Communication',
                        role: 'Teacher',
                        semester: '1st Semester',
                        quarters: [1, 2],
                        room: 'Room 302',
                        schedule: 'Mon-Fri 10:30 AM - 12:00 PM'
                    }
                ];
                defaultMariaItems.forEach(item => results.push(item));
            }
        }

        results.sort((a, b) => {
            const subjA = String(a.subject || a.name || '').trim();
            const subjB = String(b.subject || b.name || '').trim();
            const cmp = subjA.localeCompare(subjB, undefined, { sensitivity: 'base', numeric: true });
            if (cmp !== 0) return cmp;
            const secA = String(a.sectionName || a.section || '').trim();
            const secB = String(b.sectionName || b.section || '').trim();
            return secA.localeCompare(secB, undefined, { sensitivity: 'base', numeric: true });
        });

        window._lastAssignedSubjectSections = results;
        return results;
    };

    function getGradesStorageKey(isTeacher = null) {
        if (isTeacher === null) {
            isTeacher = (window.sigmaGradesState && window.sigmaGradesState.isTeacherPage) || isCurrentPageTeacherPortal();
        }
        return isTeacher ? 'sigma_teacher_grades_state_v1' : 'sigma_admin_grades_state_v1';
    }

    function saveSigmaGradesState() {
        try {
            if (!window.sigmaGradesState) return;
            const state = window.sigmaGradesState;
            const isTeacher = state.isTeacherPage || isCurrentPageTeacherPortal();
            const storageKey = getGradesStorageKey(isTeacher);

            const toSave = {
                activeTab: state.activeTab || 'analytics',
                activeQuarter: state.activeQuarter || 1,
                activeStrand: state.activeStrand || 'ALL',
                selectedSection: state.selectedSection || '',
                selectedSubject: state.selectedSubject || '',
                currentView: state.currentView || 'overview',
                studentSortOrder: state.studentSortOrder || 'name-asc',
                assessmentPage: state.assessmentPage || 0,
                selectedTeacherId: (!isTeacher && state.selectedTeacher)
                    ? (state.selectedTeacher.uid || state.selectedTeacher.id || state.selectedTeacher.employeeId || state.selectedTeacher.email || '')
                    : null,
                selectedSubjectSection: state.selectedSubjectSection ? {
                    subject: state.selectedSubjectSection.subject,
                    sectionName: state.selectedSubjectSection.sectionName,
                    grade: state.selectedSubjectSection.grade,
                    role: state.selectedSubjectSection.role,
                    track: state.selectedSubjectSection.track,
                    strand: state.selectedSubjectSection.strand,
                    quarters: state.selectedSubjectSection.quarters
                } : null
            };

            sessionStorage.setItem(storageKey, JSON.stringify(toSave));
        } catch (e) {
            console.warn('[saveSigmaGradesState] Error saving state:', e);
        }
    }
    window.saveSigmaGradesState = saveSigmaGradesState;

    window.keepGradebookForAssessmentOpen = function () {
        window._skipNextGradebookReset = true;
        window._gradebookReturnPending = true;
        if (window.sigmaGradesState) {
            window.sigmaGradesState.activeTab = 'gradebook';
        }
        saveSigmaGradesState();
    };

    window.resetSigmaGradebookPage = function (options) {
        const isTeacher = !!(options && options.teacher);
        try {
            sessionStorage.removeItem(isTeacher ? 'sigma_teacher_grades_state_v1' : 'sigma_admin_grades_state_v1');
        } catch (e) {}

        if (!window.sigmaGradesState) return;
        if (!isTeacher) {
            window.sigmaGradesState.selectedTeacher = null;
        }
        window.sigmaGradesState.selectedSubjectSection = null;
        window.sigmaGradesState.selectedSection = '';
        window.sigmaGradesState.selectedSubject = '';
        window.sigmaGradesState.activeQuarter = 1;
        window.sigmaGradesState.activeTab = 'analytics';
        window.sigmaGradesState.currentView = 'overview';
        window.sigmaGradesState.assessmentPage = 0;
        window._pendingAdminTeacher = null;
        window._pendingAdminTeacherId = null;
    };

    window.syncSharedGradesNavigation = function (opts) {
        const enteringGrades = !!(opts && opts.enteringGrades);
        const gradesWasVisible = !!(opts && opts.gradesWasVisible);
        const isTeacher = !!(opts && opts.role === 'teacher');
        const explicitTab = (opts && (opts.explicitTab === 'analytics' || opts.explicitTab === 'gradebook'))
            ? opts.explicitTab
            : '';
        const hashWantsGradebook = !!(opts && opts.hashWantsGradebook);

        if (!enteringGrades) {
            if (window._skipNextGradebookReset) {
                window._skipNextGradebookReset = false;
                return { skipped: true, targetTab: window.sigmaGradesState?.activeTab || 'gradebook' };
            }
            if (gradesWasVisible || window._gradebookReturnPending) {
                window._gradebookReturnPending = false;
                window.resetSigmaGradebookPage({ teacher: isTeacher });
                return { reset: true, targetTab: 'analytics' };
            }
            return { reset: false, targetTab: 'analytics' };
        }

        const restoreContext = window._gradebookReturnPending === true || window._skipNextGradebookReset === true;
        window._gradebookRestoreTeacher = restoreContext && !isTeacher;
        const keepSelection = gradesWasVisible || restoreContext;
        if (!keepSelection) {
            window.resetSigmaGradebookPage({ teacher: isTeacher });
        }
        window._gradebookReturnPending = false;
        window._skipNextGradebookReset = false;

        let targetTab = 'analytics';
        if (explicitTab) targetTab = explicitTab;
        else if (hashWantsGradebook) targetTab = 'gradebook';
        else if (keepSelection) targetTab = window.sigmaGradesState?.activeTab || 'analytics';
        if (window.sigmaGradesState) window.sigmaGradesState.activeTab = targetTab;
        return { targetTab, keepSelection, restoreContext };
    };

    function loadSigmaGradesState(isTeacher = null) {
        try {
            if (isTeacher === null) {
                isTeacher = isCurrentPageTeacherPortal();
            }
            const storageKey = getGradesStorageKey(isTeacher);
            const raw = sessionStorage.getItem(storageKey);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (e) {
            console.warn('[loadSigmaGradesState] Error loading state:', e);
            return null;
        }
    }
    window.loadSigmaGradesState = loadSigmaGradesState;

    function hydrateSigmaGradesState(role = null) {
        const isTeacher = (role === 'teacher') || (role !== 'admin' && isCurrentPageTeacherPortal());
        const saved = loadSigmaGradesState(isTeacher);

        if (!window.sigmaGradesState) {
            window.sigmaGradesState = {
                activeTab: 'analytics',
                activeQuarter: 1,
                activeStrand: 'ALL',
                isTeacherPage: isTeacher,
                selectedTeacher: isTeacher ? getEffectiveTeacher() : null,
                selectedSubjectSection: null,
                selectedSection: '',
                selectedSubject: '',
                currentView: 'overview',
                studentSortOrder: 'name-asc',
                assessmentPage: 0,
                weights: loadAdminGradebookWeights()
            };
        }

        window.sigmaGradesState.isTeacherPage = isTeacher;
        window.sigmaGradesState.role = isTeacher ? 'teacher' : 'admin';

        if (isTeacher) {
            const currentTeacher = getEffectiveTeacher();
            window.sigmaGradesState.selectedTeacher = currentTeacher;

            const assignedClasses = (typeof window.getTeacherAssignedSubjectsAndSections === 'function')
                ? window.getTeacherAssignedSubjectsAndSections(currentTeacher)
                : [];

            if (saved && saved.selectedSubjectSection && (!window.sigmaGradesState.selectedSubjectSection || !window._skipNextGradebookReset)) {
                const cleanStr = s => String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
                const normClean = s => cleanStr(s).replace(/\s+/g, '');
                const matched = assignedClasses.find(c => {
                    const cSec = normClean(c.sectionName);
                    const sSec = normClean(saved.selectedSubjectSection.sectionName);
                    const cSub = normClean(c.subject);
                    const sSub = normClean(saved.selectedSubjectSection.subject);
                    return (cSec === sSec || cSec.includes(sSec) || sSec.includes(cSec)) &&
                           (cSub === sSub || cSub.includes(sSub) || sSub.includes(cSub));
                });
                if (matched) {
                    window.sigmaGradesState.selectedSubjectSection = matched;
                    window.sigmaGradesState.selectedSection = matched.sectionName;
                    window.sigmaGradesState.selectedSubject = matched.subject;
                }
            }

            if (saved) {
                if (saved.activeTab) window.sigmaGradesState.activeTab = saved.activeTab;
                if (saved.activeQuarter) window.sigmaGradesState.activeQuarter = saved.activeQuarter;
                if (saved.activeStrand) window.sigmaGradesState.activeStrand = saved.activeStrand;
                if (saved.currentView) window.sigmaGradesState.currentView = saved.currentView;
                if (saved.studentSortOrder) window.sigmaGradesState.studentSortOrder = saved.studentSortOrder;
                if (saved.assessmentPage !== undefined) window.sigmaGradesState.assessmentPage = saved.assessmentPage;
            }
        } else {
            // Admin portal
            const restoreSavedTeacher = window._gradebookRestoreTeacher === true;
            window._gradebookRestoreTeacher = false;
            if (saved && restoreSavedTeacher) {
                if (saved.selectedTeacherId) {
                    const teachers = window.getAdminTeacherList();
                    const cleanTeacherId = String(saved.selectedTeacherId).toLowerCase().trim();
                    const matchedTeacher = teachers.find(t => {
                        const uid = String(t.uid || '').toLowerCase().trim();
                        const id = String(t.id || '').toLowerCase().trim();
                        const empId = String(t.employeeId || '').toLowerCase().trim();
                        const email = String(t.email || '').toLowerCase().trim();
                        return (uid && uid === cleanTeacherId) || (id && id === cleanTeacherId) || (empId && empId === cleanTeacherId) || (email && email === cleanTeacherId);
                    });
                    if (matchedTeacher) {
                        window.sigmaGradesState.selectedTeacher = matchedTeacher;
                        window._pendingAdminTeacher = matchedTeacher;
                        window._pendingAdminTeacherId = saved.selectedTeacherId;

                        const assignedClasses = (typeof window.getTeacherAssignedSubjectsAndSections === 'function')
                            ? window.getTeacherAssignedSubjectsAndSections(matchedTeacher)
                            : [];

                        if (saved.selectedSubjectSection) {
                            const cleanStr = s => String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
                            const matchedSubSec = assignedClasses.find(c =>
                                cleanStr(c.sectionName) === cleanStr(saved.selectedSubjectSection.sectionName) &&
                                cleanStr(c.subject) === cleanStr(saved.selectedSubjectSection.subject)
                            );
                            if (matchedSubSec) {
                                window.sigmaGradesState.selectedSubjectSection = matchedSubSec;
                                window.sigmaGradesState.selectedSection = matchedSubSec.sectionName;
                                window.sigmaGradesState.selectedSubject = matchedSubSec.subject;
                            }
                        }
                    }
                }

                if (saved.activeTab) window.sigmaGradesState.activeTab = saved.activeTab;
                if (saved.activeQuarter) window.sigmaGradesState.activeQuarter = saved.activeQuarter;
                if (saved.activeStrand) window.sigmaGradesState.activeStrand = saved.activeStrand;
                if (saved.currentView) window.sigmaGradesState.currentView = saved.currentView;
                if (saved.studentSortOrder) window.sigmaGradesState.studentSortOrder = saved.studentSortOrder;
                if (saved.assessmentPage !== undefined) window.sigmaGradesState.assessmentPage = saved.assessmentPage;
            }
        }
    }
    window.hydrateSigmaGradesState = hydrateSigmaGradesState;

    try {
        hydrateSigmaGradesState();
    } catch (_) {}

    window._pendingAdminTeacher = null;
    window._pendingAdminTeacherId = null;
    window._lastFilteredTeachers = [];

    window.openAdminTeacherModal = function () {
        const modal = document.getElementById('admin-teacher-selection-modal');
        if (!modal) return;
        modal.classList.remove('hidden');
        modal.classList.add('curriculum-hub-overlay--visible');
        modal.style.display = 'flex';

        // Clear any pre-selected pending teacher so no teacher is automatically selected
        window._pendingAdminTeacher = null;
        window._pendingAdminTeacherId = null;

        const searchInput = document.getElementById('admin-teacher-search-input');
        if (searchInput) {
            searchInput.value = '';
            setTimeout(() => searchInput.focus(), 50);
        }

        // Hide all names initially until searched
        window.renderAdminTeacherModalList('', false);
        window.updateAdminTeacherModalFooter();
    };

    window.closeAdminTeacherModal = function () {
        const modal = document.getElementById('admin-teacher-selection-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('curriculum-hub-overlay--visible');
            modal.style.display = 'none';
        }
    };

    window.sanitizeAdminTeacherSearchInput = function (input) {
        if (!input) return '';
        const raw = String(input.value || '');
        const clean = raw.replace(/[^a-zA-Z0-9\s.\-@']/g, '').slice(0, 50);
        if (input.value !== clean) {
            input.value = clean;
        }
        return clean;
    };

    window.executeAdminTeacherModalSearch = function () {
        const searchInput = document.getElementById('admin-teacher-search-input');
        const cleanQuery = window.sanitizeAdminTeacherSearchInput(searchInput).trim();
        window._pendingAdminTeacher = null;
        window._pendingAdminTeacherId = null;
        window.renderAdminTeacherModalList(cleanQuery, true);
        window.updateAdminTeacherModalFooter();
    };

    window.filterAdminTeacherModalList = function (query) {
        const searchInput = document.getElementById('admin-teacher-search-input');
        const cleanQuery = window.sanitizeAdminTeacherSearchInput(searchInput).trim();
        window._pendingAdminTeacher = null;
        window._pendingAdminTeacherId = null;
        window.renderAdminTeacherModalList(cleanQuery, true);
        window.updateAdminTeacherModalFooter();
    };

    window.setPendingAdminTeacherByIndex = function (index) {
        const teacher = window._lastFilteredTeachers && window._lastFilteredTeachers[index];
        if (!teacher) return;
        const teacherId = String(teacher.uid || teacher.id || teacher.employeeId || teacher.email || teacher.fullName || '');
        const currentActive = String(window._pendingAdminTeacherId || '').toLowerCase().trim();

        // Toggle selection: if already selected, unselect it
        const isCurrentSelected = !!currentActive && (
            (teacher.uid && String(teacher.uid).toLowerCase().trim() === currentActive) ||
            (teacher.id && String(teacher.id).toLowerCase().trim() === currentActive) ||
            (teacher.employeeId && String(teacher.employeeId).toLowerCase().trim() === currentActive) ||
            (teacher.email && String(teacher.email).toLowerCase().trim() === currentActive) ||
            (teacherId.toLowerCase().trim() === currentActive)
        );

        if (isCurrentSelected) {
            window._pendingAdminTeacher = null;
            window._pendingAdminTeacherId = null;
        } else {
            window._pendingAdminTeacher = teacher;
            window._pendingAdminTeacherId = teacherId;
        }

        const searchInput = document.getElementById('admin-teacher-search-input');
        const q = searchInput ? searchInput.value : '';
        window.renderAdminTeacherModalList(q, true);
        window.updateAdminTeacherModalFooter();
    };

    window.confirmAdminTeacherSelection = function () {
        if (window._pendingAdminTeacher) {
            window.sigmaGradesState.selectedTeacher = window._pendingAdminTeacher;
            window.sigmaGradesState.selectedSubjectSection = null; // Reset subject & section
            saveSigmaGradesState();
            window.closeAdminTeacherModal();
            window.updateAdminSharedNavbarUI();
            window.renderAdminGradebookWorkspace();
            window.renderAdminAnalyticsWorkspace();
            return;
        }
        if (window._pendingAdminTeacherId) {
            window.selectAdminGradebookTeacher(window._pendingAdminTeacherId);
        }
    };

    window.updateAdminTeacherModalFooter = function () {
        const selectBtn = document.getElementById('admin-teacher-modal-select-btn');
        if (!selectBtn) return;
        if (window._pendingAdminTeacher || window._pendingAdminTeacherId) {
            selectBtn.removeAttribute('disabled');
            selectBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            selectBtn.classList.add('cursor-pointer');
        } else {
            selectBtn.setAttribute('disabled', 'true');
            selectBtn.classList.add('opacity-50', 'cursor-not-allowed');
            selectBtn.classList.remove('cursor-pointer');
        }
    };

    window.renderAdminTeacherModalList = function (query = '', hasSearched = false) {
        const listContainer = document.getElementById('admin-teacher-modal-list');
        if (!listContainer) return;

        const q = String(query || '').toLowerCase().trim();

        // If not searched yet and query is empty, hide all names and show standby prompt
        if (!hasSearched && !q) {
            listContainer.innerHTML = `
                <div class="py-12 px-4 text-center font-['Inter']">
                    <div class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                        <i class="fa-solid fa-chalkboard-user text-lg" style="color: rgba(0, 0, 0, 0.40);"></i>
                    </div>
                    <p class="text-sm font-bold text-black">Search for a Faculty Member</p>
                    <p class="text-xs font-normal mt-0.5" style="color: rgba(0, 0, 0, 0.45);">Search teacher by name or ID to view their classes and gradebooks.</p>
                </div>
            `;
            return;
        }

        const teachers = window.getAdminTeacherList();
        const filtered = teachers.filter(t => {
            if (!q) return true;
            const name = String(t.fullName || (t.firstName + ' ' + t.lastName) || t.name || '').toLowerCase();
            const id = String(t.id || t.uid || t.employeeId || '').toLowerCase();
            const email = String(t.email || '').toLowerCase();
            return name.includes(q) || id.includes(q) || email.includes(q);
        });

        window._lastFilteredTeachers = filtered;

        if (filtered.length === 0) {
            listContainer.innerHTML = `
                <div class="py-12 px-4 text-center font-['Inter']">
                    <div class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                        <i class="fa-solid fa-user-xmark text-lg"></i>
                    </div>
                    <p class="text-sm font-bold text-black">No faculty found</p>
                    <p class="text-xs font-normal mt-0.5" style="color: rgba(0, 0, 0, 0.45);">No teachers matched "${escapeHtml(query)}"</p>
                </div>
            `;
            return;
        }

        const activeClean = String(window._pendingAdminTeacherId || '').toLowerCase().trim();

        const rowsHtml = filtered.map((teacher, idx) => {
            const id = String(teacher.uid || teacher.id || teacher.employeeId || teacher.email || '');
            const name = teacher.fullName || `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim() || teacher.name || 'Faculty Member';
            const idDisplay = teacher.uid || teacher.id || teacher.employeeId || '—';

            const isSelected = !!activeClean && (
                (teacher.uid && String(teacher.uid).toLowerCase().trim() === activeClean) ||
                (teacher.id && String(teacher.id).toLowerCase().trim() === activeClean) ||
                (teacher.employeeId && String(teacher.employeeId).toLowerCase().trim() === activeClean) ||
                (teacher.email && String(teacher.email).toLowerCase().trim() === activeClean) ||
                (name && String(name).toLowerCase().trim() === activeClean)
            );

            // Shared profile icon connected to teacher account
            const avatarHtml = (typeof window.renderUserAvatarHtml === 'function')
                ? window.renderUserAvatarHtml(teacher, 'w-10 h-10', 'text-sm')
                : `<div class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-xs shrink-0 text-slate-700">${escapeHtml(name.charAt(0))}</div>`;

            return `
                <div onclick="window.setPendingAdminTeacherByIndex(${idx})" 
                    style="${isSelected ? 'background-color: #e7f6ec !important;' : 'background-color: #ffffff;'}"
                    class="group p-3.5 hover:bg-black/[0.03] transition-colors flex items-center justify-between relative font-['Inter'] cursor-pointer ${isSelected ? 'sigma-selected-teacher-row' : ''}">
                    ${isSelected ? `<div class="absolute left-0 top-0 bottom-0 w-1.5 bg-[#15803d]"></div>` : ''}
                    <div class="flex items-center gap-3.5 min-w-0 flex-1 ${isSelected ? 'pl-1' : ''}">
                        ${avatarHtml}
                        <div class="min-w-0 flex-1">
                            <div class="flex items-center gap-2.5 truncate">
                                <p class="text-sm font-bold text-black tracking-tight truncate">${escapeHtml(name)}</p>
                                ${isSelected ? `<span class="text-[11px] font-bold text-black bg-[#FFD000] px-2 py-0.5 rounded border border-black/10 tracking-tight font-['Inter'] shrink-0">Selected</span>` : ''}
                            </div>
                            <p class="text-xs text-black/40 font-medium font-['Inter'] mt-0.5">ID: ${escapeHtml(idDisplay)}</p>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        listContainer.innerHTML = `
            <div class="divide-y divide-black/10 border-y border-black/10 border-x-0 rounded-none sigma-selected-faded-panel overflow-hidden font-['Inter']">
                ${rowsHtml}
            </div>
        `;
    };

    window.selectAdminGradebookTeacher = function (teacherId) {
        const teachers = window.getAdminTeacherList();
        const clean = String(teacherId || '').toLowerCase().trim();
        const teacher = window._pendingAdminTeacher || teachers.find(t => {
            const uid = String(t.uid || '').toLowerCase().trim();
            const id = String(t.id || '').toLowerCase().trim();
            const empId = String(t.employeeId || '').toLowerCase().trim();
            const email = String(t.email || '').toLowerCase().trim();
            const name = String(t.fullName || `${t.firstName || ''} ${t.lastName || ''}` || t.name || '').toLowerCase().trim();
            return (uid && uid === clean) || (id && id === clean) || (empId && empId === clean) || (email && email === clean) || (name && name === clean);
        });

        if (teacher) {
            window.sigmaGradesState.selectedTeacher = teacher;
            window.sigmaGradesState.selectedSubjectSection = null; // Reset subject & section
            window._pendingAdminTeacher = teacher;
            window._pendingAdminTeacherId = String(teacher.uid || teacher.id || teacher.employeeId || teacher.email || '');
            saveSigmaGradesState();
        }
        window.closeAdminTeacherModal();
        window.updateAdminSharedNavbarUI();
        window.renderAdminGradebookWorkspace();
        window.renderAdminAnalyticsWorkspace();
    };

    // Toggle and render the Subject & Section dropdown menu
    window.toggleAdminSubjectDropdown = function (event) {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }
        const menu = document.getElementById('admin-grades-subject-picker-menu');
        if (!menu) return;

        const isHidden = menu.classList.contains('hidden');
        if (isHidden) {
            window.renderAdminSubjectDropdownMenu();
            menu.classList.remove('hidden');
        } else {
            menu.classList.add('hidden');
        }
    };

    window.renderAdminSubjectDropdownMenu = function () {
        const menu = document.getElementById('admin-grades-subject-picker-menu');
        if (!menu) return;

        const teacher = getEffectiveTeacher();
        const items = window.getTeacherAssignedSubjectsAndSections(teacher);
        window._lastAssignedSubjectSections = items;

        if (items.length === 0) {
            menu.innerHTML = `
                <div class="px-4 py-3 text-xs text-black/50 text-center font-['Inter']">
                    No assigned subjects/sections found
                </div>
            `;
            return;
        }

        const itemsHtml = items.map((item, idx) => {
            const isSelected = window.sigmaGradesState.selectedSubjectSection &&
                window.sigmaGradesState.selectedSubjectSection.sectionName === item.sectionName &&
                window.sigmaGradesState.selectedSubjectSection.subject === item.subject;

            const roleBadge = item.role === 'Adviser'
                ? `<span class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#FFD000] text-black border border-black/10 uppercase tracking-wider shrink-0 font-['Inter']">Adviser</span>`
                : '';

            const formattedSec = formatGradeSectionDisplay(item.sectionName, item.grade);

            return `
                <div onclick="window.selectAdminSubjectSection(${idx})"
                    style="${isSelected ? 'background-color: #e7f6ec !important;' : ''}"
                    class="px-4 py-2.5 transition-colors cursor-pointer flex items-center justify-between gap-3 relative font-['Inter'] ${isSelected ? 'sigma-selected-teacher-row' : 'hover:bg-slate-50'}">
                    ${isSelected ? `<div class="absolute left-0 top-0 bottom-0 w-1.5 bg-[#15803d]"></div>` : ''}
                    <div class="min-w-0 flex-1 ${isSelected ? 'pl-1' : ''}">
                        <div class="flex items-center gap-2">
                            <span class="text-xs font-bold text-black truncate leading-snug">${escapeHtml(item.subject)}</span>
                            ${roleBadge}
                        </div>
                        <span class="text-[11px] font-medium leading-tight block truncate mt-0.5" style="color: rgba(0, 0, 0, 0.45);">${escapeHtml(formattedSec)}</span>
                    </div>
                </div>
            `;
        }).join('');

        menu.innerHTML = `
            <div class="max-h-64 overflow-y-auto divide-y divide-slate-100 font-['Inter']">
                ${itemsHtml}
            </div>
        `;
    };

    window.selectAdminSubjectSection = function (index) {
        const items = (window._lastAssignedSubjectSections && window._lastAssignedSubjectSections.length > 0)
            ? window._lastAssignedSubjectSections
            : (window.getTeacherAssignedSubjectsAndSections(getEffectiveTeacher()) || []);
        const item = items[index];
        if (!item) return;

        window.sigmaGradesState.selectedSubjectSection = item;
        window.sigmaGradesState.selectedSection = item.sectionName;
        window.sigmaGradesState.selectedSubject = item.subject;
        window.sigmaGradesState.weights = loadAdminGradebookWeights(item.subject);
        window.sigmaGradesState.currentView = 'overview';

        // Determine available quarters based on subject
        const quarters = item.quarters || [1, 2];
        if (!quarters.includes(window.sigmaGradesState.activeQuarter)) {
            window.sigmaGradesState.activeQuarter = quarters[0] || 1;
        }

        saveSigmaGradesState();

        // Close dropdown
        const menu = document.getElementById('admin-grades-subject-picker-menu');
        if (menu) menu.classList.add('hidden');

        window.updateAdminSharedNavbarUI();
        window.renderAdminGradebookWorkspace();
        window.renderAdminAnalyticsWorkspace();
    };

    window.switchAdminQuarter = function (quarter) {
        window.sigmaGradesState.activeQuarter = Number(quarter);
        saveSigmaGradesState();
        window.renderAdminQuartersTabs();
        window.renderAdminGradebookWorkspace();
        window.renderAdminAnalyticsWorkspace();
    };

    window.renderAdminQuartersTabs = function () {
        const quartersContainer = document.getElementById('admin-grades-quarters-wrapper');
        if (!quartersContainer) return;

        const subSec = window.sigmaGradesState.selectedSubjectSection;
        if (!subSec) {
            quartersContainer.classList.add('hidden');
            quartersContainer.innerHTML = '';
            return;
        }

        quartersContainer.classList.remove('hidden');
        const quarters = subSec.quarters || [1, 2];
        const quarterNames = {
            1: '1st Quarter',
            2: '2nd Quarter',
            3: '3rd Quarter',
            4: '4th Quarter'
        };

        quartersContainer.innerHTML = `
            <div class="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200/60 font-['Inter']">
                ${quarters.map(q => {
                    const isActive = window.sigmaGradesState.activeQuarter === q;
                    return `
                        <button type="button" onclick="window.switchAdminQuarter(${q})"
                            class="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                isActive
                                ? 'bg-white text-black shadow-xs border border-black/5'
                                : 'text-black-fade hover:text-black hover:bg-slate-200/50'
                            }">
                            ${quarterNames[q] || `Quarter ${q}`}
                        </button>
                    `;
                }).join('')}
            </div>
        `;
    };

    window.updateAdminSharedNavbarUI = function () {
        const isTeacher = isCurrentPageTeacherPortal();
        const teacher = getEffectiveTeacher();
        const subSec = window.sigmaGradesState.selectedSubjectSection;

        // 1. Teacher Picker UI
        const teacherLabel = document.getElementById('admin-gradebook-picker-teacher-label');
        const teacherAvatar = document.getElementById('admin-gradebook-picker-avatar');
        if (teacherLabel) {
            if (teacher) {
                const name = teacher.fullName || `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim() || teacher.name || 'Faculty Member';
                teacherLabel.textContent = name;
                teacherLabel.className = "text-[13px] font-bold text-black transition-colors";
                teacherLabel.style.color = "#000000";
                if (teacherAvatar) {
                    if (typeof window.renderUserAvatarHtml === 'function') {
                        teacherAvatar.innerHTML = window.renderUserAvatarHtml(teacher, 'w-7 h-7', 'text-[10px]');
                        teacherAvatar.className = "shrink-0";
                    } else {
                        teacherAvatar.className = "w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0 text-[#15803d]";
                        teacherAvatar.innerHTML = `<i class="fa-solid fa-chalkboard-user text-xs"></i>`;
                    }
                }
            } else {
                teacherLabel.textContent = 'Select Teacher';
                teacherLabel.className = "text-[13px] font-semibold text-black-fade transition-colors";
                teacherLabel.style.color = "rgba(0, 0, 0, 0.45)";
                if (teacherAvatar) {
                    teacherAvatar.className = "w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 text-slate-400";
                    teacherAvatar.innerHTML = `<i class="fa-solid fa-chalkboard-user text-xs" style="color: rgba(0, 0, 0, 0.45);"></i>`;
                }
            }
        }

        // 2. Subject & Section Dropdown UI
        const subWrapper = document.getElementById('admin-grades-subject-section-dropdown-wrapper');
        const subLabel = document.getElementById('admin-grades-subject-picker-label');
        if (subWrapper) {
            if (teacher || isTeacher) {
                subWrapper.classList.remove('hidden');
            } else {
                subWrapper.classList.add('hidden');
            }
        }

        if (subLabel) {
            if (subSec) {
                const roleBadge = subSec.role === 'Adviser'
                    ? `<span class="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#FFD000] text-black border border-black/10 uppercase tracking-wider shrink-0 font-['Inter'] ml-2">Adviser</span>`
                    : '';

                const formattedSecName = formatGradeSectionDisplay(subSec.sectionName, subSec.grade);

                subLabel.className = "flex flex-col items-start justify-center min-w-0 font-['Inter'] text-left";
                subLabel.innerHTML = `
                    <div class="flex items-center gap-1.5 max-w-full">
                        <span class="font-bold text-black text-[13px] leading-tight truncate font-['Inter']">${escapeHtml(subSec.subject)}</span>
                        ${roleBadge}
                    </div>
                    <span class="text-[11px] font-medium leading-tight mt-0.5 truncate font-['Inter']" style="color: rgba(0, 0, 0, 0.45);">${escapeHtml(formattedSecName)}</span>
                `;
                subLabel.style.color = "#000000";
            } else {
                subLabel.textContent = 'Select Subject and Section';
                subLabel.className = "text-[13px] font-semibold text-black-fade transition-colors";
                subLabel.style.color = "rgba(0, 0, 0, 0.45)";
            }
        }

        // 3. Quarters Tabs UI
        window.renderAdminQuartersTabs();

        // 4. Action Buttons UI (Assessment Weights & Transfer / View) - STRICTLY only on Gradebooks tab
        const actBtns = document.getElementById('admin-gradebook-action-buttons');
        if (actBtns) {
            const isGradebookTab = (window.sigmaGradesState.activeTab === 'gradebook');
            if (isGradebookTab && subSec) {
                actBtns.classList.remove('hidden');
                actBtns.style.setProperty('display', 'flex', 'important');
            } else {
                actBtns.classList.add('hidden');
                actBtns.style.setProperty('display', 'none', 'important');
            }
            const weightBtn = document.getElementById('admin-btn-assessment-weights');
            const isTeacher = (window.sigmaGradesState && window.sigmaGradesState.isTeacherPage) || isCurrentPageTeacherPortal();
            if (weightBtn) {
                const sep = weightBtn.nextElementSibling;
                if (isTeacher) {
                    weightBtn.style.setProperty('display', 'none', 'important');
                    if (sep && sep.textContent.trim() === '|') sep.style.setProperty('display', 'none', 'important');
                } else {
                    weightBtn.style.setProperty('display', 'inline-flex', 'important');
                    if (sep && sep.textContent.trim() === '|') sep.style.setProperty('display', 'inline', 'important');
                }
            }
        }
    };

    window.updateAdminTeacherTriggerUI = window.updateAdminSharedNavbarUI;

    // Close subject dropdown when clicking anywhere outside
    if (typeof document !== 'undefined') {
        document.addEventListener('click', function (e) {
            const dropdownWrapper = document.getElementById('admin-grades-subject-section-dropdown-wrapper');
            const menu = document.getElementById('admin-grades-subject-picker-menu');
            if (menu && !menu.classList.contains('hidden')) {
                if (!dropdownWrapper || !dropdownWrapper.contains(e.target)) {
                    menu.classList.add('hidden');
                }
            }
        });
    }

    window.renderAdminAnalyticsWorkspace = function () {
        if (window.sigmaGradesState.activeTab !== 'analytics') return;
        const workspaceContainer = document.getElementById('admin-analytics-workspace-content');
        if (!workspaceContainer) return;

        const isTeacher = isCurrentPageTeacherPortal();
        const teacher = getEffectiveTeacher();
        const subSec = window.sigmaGradesState.selectedSubjectSection;

        if (!isTeacher) {
            if (!teacher) {
                // Empty State 1: Select a Teacher First (Admin only)
                workspaceContainer.innerHTML = `
                    <div class="flex-1 flex flex-col items-center justify-center p-12 text-center my-auto min-h-[420px] font-['Inter'] select-none">
                        <div class="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl mb-4 shadow-2xs" style="color: rgba(0, 0, 0, 0.40);">
                            <i class="fa-solid fa-chart-pie"></i>
                        </div>
                        <h3 class="text-base font-bold text-black tracking-tight font-['Inter']">Select a Teacher</h3>
                        <p class="text-xs max-w-md mt-1.5 leading-relaxed font-['Inter']" style="color: rgba(0, 0, 0, 0.45);">
                            Click the Teacher Panel above to choose a faculty member and inspect their Senior High School performance analytics.
                        </p>
                    </div>
                `;
                return;
            }
        }

        if (!subSec) {
            // Empty State 2: Select Subject & Section (Matching teacher portal: table icon, black fade)
            workspaceContainer.innerHTML = `
                <div class="flex-1 flex flex-col items-center justify-center p-12 text-center my-auto min-h-[420px] font-['Inter'] select-none">
                    <div class="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl mb-4 shadow-2xs" style="color: rgba(0, 0, 0, 0.40);">
                        <i class="fa-solid fa-table-cells"></i>
                    </div>
                    <h3 class="text-base font-bold text-black tracking-tight font-['Inter']">No Subject Selected</h3>
                    <p class="text-xs max-w-md mt-1.5 leading-relaxed font-['Inter']" style="color: rgba(0, 0, 0, 0.45);">
                        Click the subject picker above to choose a subject &amp; section.
                    </p>
                </div>
            `;
            return;
        }

        // Active State: Load students and compute accurate DepEd metrics across Q1..Q4
        const weights = window.sigmaGradesState.weights || loadAdminGradebookWeights(subSec?.subject) || { ww: 25, pt: 50, qa: 25 };
        const wwWeight = (Number(weights.ww) || 25) / 100;
        const ptWeight = (Number(weights.pt) || 50) / 100;
        const qaWeight = (Number(weights.qa) || 25) / 100;
        const activeQuarter = window.sigmaGradesState.activeQuarter || 1;
        const quarterLabels = { 1: '1st Quarter', 2: '2nd Quarter', 3: '3rd Quarter', 4: '4th Quarter' };
        const activeQuarterLabel = quarterLabels[activeQuarter] || `Quarter ${activeQuarter}`;

        let students = [];
        if (typeof window.getStudentsForSection === 'function') {
            students = window.getStudentsForSection(subSec.sectionName, subSec.subject);
        }
        if (!students || students.length === 0) {
            try {
                const adminSections = (typeof window.getStoredJson === 'function')
                    ? window.getStoredJson('sigma-admin-sections', [])
                    : JSON.parse(localStorage.getItem('sigma-admin-sections') || '[]');
                const found = adminSections.find(s => s && (s.name === subSec.sectionName || s.sectionName === subSec.sectionName));
                if (found && Array.isArray(found.students) && found.students.length > 0) {
                    students = found.students;
                }
            } catch (e) {}
        }
        if (!students || students.length === 0) {
            students = getDemoGradebookStudents(subSec.sectionName);
        }

        const totalStudentsCount = students.length || 0;

        // Compute metrics for each quarter (1 to 4)
        const quarterMetrics = [1, 2, 3, 4].map(qNum => {
            const wwItems = getAdminGradebookAssessmentItems('ww', qNum, subSec.subject, subSec.sectionName);
            const ptItems = getAdminGradebookAssessmentItems('pt', qNum, subSec.subject, subSec.sectionName);
            const qaItems = getAdminGradebookAssessmentItems('qa', qNum, subSec.subject, subSec.sectionName);

            const wwMax = wwItems.reduce((acc, it) => acc + (Number(it.totalScore || it.maxScore || it.points || 100) || 0), 0) || (wwItems.length * 100);
            const ptMax = ptItems.reduce((acc, it) => acc + (Number(it.totalScore || it.maxScore || it.points || 100) || 0), 0) || (ptItems.length * 100);
            const qaMax = qaItems.reduce((acc, it) => acc + (Number(it.totalScore || it.maxScore || it.points || 100) || 0), 0) || (qaItems.length * 100);

            let wwPercentages = [];
            let ptPercentages = [];
            let qaPercentages = [];
            let studentFinalGrades = [];

            students.forEach(s => {
                let sWwSum = 0, sWwHas = false;
                wwItems.forEach((it, idx) => {
                    const sc = getAdminGradebookStudentItemScore(s, 'ww', idx, it, subSec.subject, qNum);
                    if (sc !== null) { sWwSum += sc; sWwHas = true; }
                });

                let sPtSum = 0, sPtHas = false;
                ptItems.forEach((it, idx) => {
                    const sc = getAdminGradebookStudentItemScore(s, 'pt', idx, it, subSec.subject, qNum);
                    if (sc !== null) { sPtSum += sc; sPtHas = true; }
                });

                let sQaSum = 0, sQaHas = false;
                qaItems.forEach((it, idx) => {
                    const sc = getAdminGradebookStudentItemScore(s, 'qa', idx, it, subSec.subject, qNum);
                    if (sc !== null) { sQaSum += sc; sQaHas = true; }
                });

                const sWwPct = (wwMax > 0 && sWwHas) ? Math.min(100, Math.round((sWwSum / wwMax) * 100)) : null;
                const sPtPct = (ptMax > 0 && sPtHas) ? Math.min(100, Math.round((sPtSum / ptMax) * 100)) : null;
                const sQaPct = (qaMax > 0 && sQaHas) ? Math.min(100, Math.round((sQaSum / qaMax) * 100)) : null;

                if (sWwPct !== null) wwPercentages.push(sWwPct);
                if (sPtPct !== null) ptPercentages.push(sPtPct);
                if (sQaPct !== null) qaPercentages.push(sQaPct);

                if (sWwHas || sPtHas || sQaHas) {
                    const effWw = sWwPct !== null ? sWwPct : 85;
                    const effPt = sPtPct !== null ? sPtPct : 88;
                    const effQa = sQaPct !== null ? sQaPct : 86;
                    const initial = (effWw * wwWeight) + (effPt * ptWeight) + (effQa * qaWeight);
                    const transmuted = (typeof SigmaGradeEngine !== 'undefined' && typeof SigmaGradeEngine.transmute === 'function')
                        ? SigmaGradeEngine.transmute(initial)
                        : Math.round(initial);
                    studentFinalGrades.push(transmuted);
                }
            });

            const avgWw = wwPercentages.length > 0 ? Math.round(wwPercentages.reduce((a, b) => a + b, 0) / wwPercentages.length) : (qNum === 1 ? 88 : (qNum === 2 ? 86 : 0));
            const avgPt = ptPercentages.length > 0 ? Math.round(ptPercentages.reduce((a, b) => a + b, 0) / ptPercentages.length) : (qNum === 1 ? 92 : (qNum === 2 ? 89 : 0));
            const avgQa = qaPercentages.length > 0 ? Math.round(qaPercentages.reduce((a, b) => a + b, 0) / qaPercentages.length) : (qNum === 1 ? 85 : (qNum === 2 ? 84 : 0));
            const avgOverall = studentFinalGrades.length > 0 ? Math.round(studentFinalGrades.reduce((a, b) => a + b, 0) / studentFinalGrades.length) : (qNum === 1 ? 89 : (qNum === 2 ? 87 : 0));

            return {
                quarter: qNum,
                avgWw,
                avgPt,
                avgQa,
                avgOverall,
                studentFinalGrades
            };
        });

        const activeQMetric = quarterMetrics[activeQuarter - 1] || quarterMetrics[0];
        const overallSeries = quarterMetrics.map(m => m.avgOverall);
        const wwSeries = quarterMetrics.map(m => m.avgWw);
        const ptSeries = quarterMetrics.map(m => m.avgPt);
        const qaSeries = quarterMetrics.map(m => m.avgQa);

        const validOverallSeries = overallSeries.filter(v => v > 0);
        const classGwa = validOverallSeries.length > 0 ? (validOverallSeries.reduce((a, b) => a + b, 0) / validOverallSeries.length) : 88.6;

        // Grade Distribution breakdown for active quarter
        const gradesForDist = (activeQMetric.studentFinalGrades && activeQMetric.studentFinalGrades.length > 0)
            ? activeQMetric.studentFinalGrades
            : [94, 92, 91, 95, 90, 88, 87, 86, 85, 89, 84, 82, 81, 80, 78, 76, 72, 70];

        let outstanding = 0, verySat = 0, sat = 0, fairlySat = 0, didNotMeet = 0;
        gradesForDist.forEach(g => {
            if (g >= 90) outstanding++;
            else if (g >= 85) verySat++;
            else if (g >= 80) sat++;
            else if (g >= 75) fairlySat++;
            else didNotMeet++;
        });

        const distTotal = gradesForDist.length || 1;
        const passingCount = outstanding + verySat + sat + fairlySat;
        const passingRate = Math.round((passingCount / distTotal) * 1000) / 10;
        const atRiskCount = didNotMeet;

        let aiMessage = '';
        if (classGwa >= 90) {
            aiMessage = `Outstanding overall academic mastery in ${subSec.subject} (${subSec.sectionName}). The class maintains an exceptional ${classGwa.toFixed(1)} average across quarters with high consistency in Performance Tasks (${activeQMetric.avgPt}%).`;
        } else if (classGwa >= 85) {
            aiMessage = `Very satisfactory academic trajectory in ${subSec.subject} (${subSec.sectionName}). Class GWA is steady at ${classGwa.toFixed(1)}. Written Works (${activeQMetric.avgWw}%) and Performance Tasks (${activeQMetric.avgPt}%) are driving solid quarterly progression.`;
        } else if (classGwa >= 75) {
            aiMessage = `Satisfactory overall progress (GWA: ${classGwa.toFixed(1)}). Recommended focal areas: reinforce preparatory review for Quarterly Assessments and assign targeted remedial activities to assist at-risk learners.`;
        } else {
            aiMessage = `Class average is currently at ${classGwa.toFixed(1)}. Intensive intervention recommended for ${subSec.subject} (${subSec.sectionName}) to ensure all learners meet DepEd DO 8 standards before quarter end.`;
        }

        const topSectionHtml = (typeof window.renderSharedAnalyticsTopSectionHtml === 'function')
            ? window.renderSharedAnalyticsTopSectionHtml({
                gwa: classGwa,
                title: 'Class General Weighted Average',
                aiMessage: aiMessage,
                role: isTeacher ? 'teacher' : 'admin'
            })
            : '';

        let performanceCardsHtml = '';
        if (typeof window.renderSharedSubjectPerformanceCardHtml === 'function') {
            performanceCardsHtml += window.renderSharedSubjectPerformanceCardHtml({
                id: 'class-mastery',
                title: 'Overall Class Mastery',
                subtitle: 'DepEd Transmuted Composite',
                overallScore: activeQMetric.avgOverall,
                quarterValues: overallSeries,
                strokeColor: '#15803d'
            });
            performanceCardsHtml += window.renderSharedSubjectPerformanceCardHtml({
                id: 'class-ww',
                title: 'Written Works (WW)',
                subtitle: `${weights.ww}% DepEd Weight`,
                overallScore: activeQMetric.avgWw,
                quarterValues: wwSeries,
                strokeColor: '#2563eb'
            });
            performanceCardsHtml += window.renderSharedSubjectPerformanceCardHtml({
                id: 'class-pt',
                title: 'Performance Tasks (PT)',
                subtitle: `${weights.pt}% DepEd Weight`,
                overallScore: activeQMetric.avgPt,
                quarterValues: ptSeries,
                strokeColor: '#8b5cf6'
            });
            performanceCardsHtml += window.renderSharedSubjectPerformanceCardHtml({
                id: 'class-qa',
                title: 'Quarterly Assessment (QA)',
                subtitle: `${weights.qa}% DepEd Weight`,
                overallScore: activeQMetric.avgQa,
                quarterValues: qaSeries,
                strokeColor: '#f59e0b'
            });
        }

        workspaceContainer.innerHTML = `
            <div class="space-y-8 font-['Inter'] px-10 pt-6 pb-10">
                <!-- Shared Top Section (GWA + AI Insights Card) -->
                ${topSectionHtml}

                <!-- Performance Breakdown Component Cards (Spline Trend Curves) -->
                <div class="font-['Inter']">
                    <div class="flex items-center justify-between mb-6 px-2 font-['Inter']">
                        <div>
                            <h3 class="text-xl font-bold text-slate-900 font-['Inter']">Component Performance</h3>
                            <p class="text-xs text-slate-400 font-medium mt-0.5">${escapeHtml(subSec.subject)} — ${escapeHtml(subSec.sectionName)}</p>
                        </div>
                        <div class="flex items-center gap-2 text-xs font-medium text-black-fade font-['Inter']" style="color: rgba(0, 0, 0, 0.45);">
                            <span class="flex items-center gap-1.5"><div class="w-2 h-2 rounded-full" style="background-color: rgba(0, 0, 0, 0.45);"></div> Q1-Q4 Trend</span>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4 font-['Inter']">
                        ${performanceCardsHtml}
                    </div>
                </div>

                <!-- Summary KPI Row -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-['Inter']">
                    <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-xs font-semibold text-slate-500">Passing Rate</span>
                            <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs">
                                <i class="fa-solid fa-circle-check"></i>
                            </div>
                        </div>
                        <div class="text-2xl font-bold text-black">${passingRate}%</div>
                        <p class="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                            <i class="fa-solid fa-arrow-trend-up"></i> ${passingCount} of ${distTotal} students passed
                        </p>
                    </div>

                    <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-xs font-semibold text-slate-500">Class Average</span>
                            <div class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs">
                                <i class="fa-solid fa-chart-simple"></i>
                            </div>
                        </div>
                        <div class="text-2xl font-bold text-black">${classGwa.toFixed(1)}</div>
                        <p class="text-[11px] text-slate-400 font-medium mt-1">General Weighted Average</p>
                    </div>

                    <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-xs font-semibold text-slate-500">Enrolled Students</span>
                            <div class="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center text-xs">
                                <i class="fa-solid fa-user-group"></i>
                            </div>
                        </div>
                        <div class="text-2xl font-bold text-black">${totalStudentsCount}</div>
                        <p class="text-[11px] text-slate-400 font-medium mt-1">${escapeHtml(subSec.sectionName)} • Active</p>
                    </div>

                    <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-xs font-semibold text-slate-500">At-Risk Students</span>
                            <div class="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-xs">
                                <i class="fa-solid fa-triangle-exclamation"></i>
                            </div>
                        </div>
                        <div class="text-2xl font-bold ${atRiskCount > 0 ? 'text-amber-600' : 'text-slate-900'}">${atRiskCount}</div>
                        <p class="text-[11px] text-slate-400 font-medium mt-1">Grade below 75% threshold</p>
                    </div>
                </div>

                <!-- DepEd Grade Distribution Breakdown Box -->
                <div class="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs font-['Inter']">
                    <div class="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                        <div>
                            <h3 class="text-sm font-bold text-black tracking-tight">DepEd Grade Distribution • ${escapeHtml(activeQuarterLabel)}</h3>
                            <p class="text-xs text-slate-400 font-medium mt-0.5">${escapeHtml(subSec.subject)} — ${escapeHtml(subSec.sectionName)}</p>
                        </div>
                        ${subSec.role === 'Adviser' ? '<span class="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-[#FFD000] text-black border border-black/10 uppercase tracking-wider font-[\'Inter\']">Adviser</span>' : ''}
                    </div>

                    <div class="space-y-4">
                        <div>
                            <div class="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
                                <span>Outstanding (90 - 100)</span>
                                <span class="font-bold text-black">${outstanding} students (${Math.round((outstanding / distTotal) * 1000) / 10}%)</span>
                            </div>
                            <div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                                <div class="bg-[#15803d] h-full rounded-full transition-all duration-500" style="width: ${Math.round((outstanding / distTotal) * 100)}%"></div>
                            </div>
                        </div>

                        <div>
                            <div class="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
                                <span>Very Satisfactory (85 - 89)</span>
                                <span class="font-bold text-black">${verySat} students (${Math.round((verySat / distTotal) * 1000) / 10}%)</span>
                            </div>
                            <div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                                <div class="bg-emerald-500 h-full rounded-full transition-all duration-500" style="width: ${Math.round((verySat / distTotal) * 100)}%"></div>
                            </div>
                        </div>

                        <div>
                            <div class="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
                                <span>Satisfactory (80 - 84)</span>
                                <span class="font-bold text-black">${sat} students (${Math.round((sat / distTotal) * 1000) / 10}%)</span>
                            </div>
                            <div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                                <div class="bg-blue-500 h-full rounded-full transition-all duration-500" style="width: ${Math.round((sat / distTotal) * 100)}%"></div>
                            </div>
                        </div>

                        <div>
                            <div class="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
                                <span>Fairly Satisfactory (75 - 79)</span>
                                <span class="font-bold text-black">${fairlySat} students (${Math.round((fairlySat / distTotal) * 1000) / 10}%)</span>
                            </div>
                            <div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                                <div class="bg-amber-500 h-full rounded-full transition-all duration-500" style="width: ${Math.round((fairlySat / distTotal) * 100)}%"></div>
                            </div>
                        </div>

                        <div>
                            <div class="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
                                <span>Did Not Meet Expectations (Below 75)</span>
                                <span class="font-bold ${didNotMeet > 0 ? 'text-red-600' : 'text-slate-700'}">${didNotMeet} students (${Math.round((didNotMeet / distTotal) * 1000) / 10}%)</span>
                            </div>
                            <div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                                <div class="bg-red-500 h-full rounded-full transition-all duration-500" style="width: ${Math.round((didNotMeet / distTotal) * 100)}%"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    };

    window.openAdminGradebookWeightModal = function () {
        let modal = document.getElementById('admin-gradebook-weight-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'admin-gradebook-weight-modal';
            modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-xs z-[99999] flex items-center justify-center p-4 transition-all duration-200 font-[\'Inter\']';
            document.body.appendChild(modal);

            modal.addEventListener('mousedown', (e) => {
                if (e.target === modal) modal.classList.add('hidden');
            });
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
                    modal.classList.add('hidden');
                }
            });
        }

        const presets = (typeof window.getDepEdWeightPresets === 'function')
            ? window.getDepEdWeightPresets()
            : [
                { id: 'core', label: 'Core Subjects (All Strands)', desc: 'Gen Math, Earth & Life Sci, Oral Com, 21st Cent Lit, UCSP, PE', ww: 25, pt: 50, qa: 25 },
                { id: 'acad-specialized', label: 'Academic Strands (ABM, GAS, HUMSS) — Applied & Specialized', desc: 'Business Math, Org & Mgt, DISS, Creative Writing, Applied Econ', ww: 25, pt: 45, qa: 30 },
                { id: 'acad-immersion', label: 'Academic Strands (ABM, GAS, HUMSS) — Work Immersion / Research', desc: 'Practical Research 1 & 2, Inquiries, Business Enterprise Simulation', ww: 35, pt: 40, qa: 25 },
                { id: 'tvl-specialized', label: 'TVL Strands (ICT & HE) — Applied & Specialized', desc: 'Computer Programming, CSS, Food & Beverage, Bread & Pastry', ww: 30, pt: 50, qa: 20 },
                { id: 'tvl-immersion', label: 'TVL Strands (ICT & HE) — Work Immersion / Practicum', desc: 'Hands-on Industry Practicum, Culminating Activity, Work Immersion', ww: 20, pt: 60, qa: 20 }
            ];

        const curSubject = window.sigmaGradesState.selectedSubjectSection?.subject || window.sigmaGradesState.selectedSubject || 'Computer Programming 1';
        const curWeights = loadAdminGradebookWeights(curSubject);
        window.sigmaGradesState.weights = curWeights;
        let selIdx = presets.findIndex(p => p.ww === curWeights.ww && p.pt === curWeights.pt && p.qa === curWeights.qa);
        if (selIdx === -1) selIdx = 0;

        const renderModal = (chosenIdx) => {
            modal.innerHTML = `
                <div class="curriculum-hub-panel curriculum-release-panel-fixed weight-modal-card w-full !max-w-[860px] flex flex-col overflow-hidden bg-white border border-slate-200 shadow-2xl rounded-3xl" style="height: 740px; min-height: min(740px, calc(100vh - 40px)); max-height: calc(100vh - 40px); max-width: 860px;" onclick="event.stopPropagation()">
                    <!-- Header -->
                    <div class="px-6 sm:px-8 py-5 border-b border-slate-100 flex items-center justify-between shrink-0 font-['Inter']">
                        <div>
                            <h2 class="text-xl font-bold text-black font-['Inter'] tracking-tight">Assessment Weights</h2>
                            <p class="text-xs font-normal text-black-fade font-['Inter'] mt-0.5" style="color: rgba(0, 0, 0, 0.45);">
                                DepEd Senior High School Grading System Presets <span class="mx-1 text-slate-300">•</span> <span class="font-semibold text-slate-700">${escapeHtml(curSubject)}</span>
                            </p>
                        </div>
                    </div>

                    <!-- Presets list with scrollable flex area -->
                    <div class="p-6 sm:p-8 py-6 overflow-y-auto flex-1 space-y-3.5 font-['Inter']">
                        ${presets.map((sys, idx) => {
                            const isSelected = (idx === chosenIdx);
                            return `
                                <div onclick="window._setAdminWeightPreset(${idx})"
                                     class="p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 select-none ${
                                         isSelected 
                                             ? 'border-[#15803d] bg-emerald-50/40 ring-1 ring-[#15803d]' 
                                             : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 bg-white'
                                     }">
                                    <div class="min-w-0 flex-1">
                                        <div class="flex flex-wrap items-center justify-between gap-2">
                                            <h4 class="text-sm font-bold text-slate-900 tracking-tight font-['Inter'] leading-snug">${escapeHtml(sys.label)}</h4>
                                            <div class="flex items-center gap-1.5 shrink-0">
                                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-white text-slate-800 border border-slate-200/90 shadow-2xs font-['Inter']">
                                                    WW ${sys.ww}% · PT ${sys.pt}% · QA ${sys.qa}%
                                                </span>
                                            </div>
                                        </div>
                                        <p class="text-xs font-normal text-black-fade mt-1 leading-normal font-['Inter']" style="color: rgba(0, 0, 0, 0.45);">${escapeHtml(sys.desc)}</p>
                                    </div>
                                    <div class="shrink-0 flex items-center justify-center w-6 h-6 rounded-full border transition-all self-center ${
                                        isSelected 
                                            ? 'border-[#15803d] bg-[#15803d] text-white shadow-xs' 
                                            : 'border-slate-300 bg-white'
                                    }">
                                        ${isSelected ? '<i class="fa-solid fa-check text-[10px]"></i>' : ''}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>

                    <!-- Footer: Action Buttons -->
                    <div class="px-6 sm:px-8 py-5 border-t border-slate-100 bg-white flex items-center justify-end gap-3 shrink-0 font-['Inter']">
                        <button type="button" onclick="document.getElementById('admin-gradebook-weight-modal').classList.add('hidden')"
                            class="sigma-btn sigma-btn-white sigma-btn-md cursor-pointer font-['Inter']">
                            Cancel
                        </button>
                        <button type="button" onclick="window._applyAdminWeightPreset(${chosenIdx})"
                            class="sigma-btn sigma-btn-primary sigma-btn-md cursor-pointer font-['Inter']">
                            <i class="fa-solid fa-check text-xs"></i>
                            <span>Apply Weights</span>
                        </button>
                    </div>
                </div>
            `;
        };

        window._setAdminWeightPreset = (idx) => renderModal(idx);
        window._applyAdminWeightPreset = (idx) => {
            const chosen = presets[idx] || presets[0];
            const weights = { ww: chosen.ww, pt: chosen.pt, qa: chosen.qa };
            const targetSubject = window.sigmaGradesState.selectedSubjectSection?.subject || window.sigmaGradesState.selectedSubject || curSubject;
            window.sigmaGradesState.weights = weights;
            if (typeof window.saveSubjectGradebookWeights === 'function' && targetSubject) {
                window.saveSubjectGradebookWeights(targetSubject, weights);
            } else {
                try {
                    localStorage.setItem('sigma-teacher-gradebook-weights', JSON.stringify(weights));
                } catch (e) {}
            }
            modal.classList.add('hidden');
            window.renderAdminGradebookWorkspace();
            if (typeof window.showToast === 'function') {
                window.showToast(`Assessment Weights applied for "${targetSubject}": WW ${chosen.ww}%, PT ${chosen.pt}%, QA ${chosen.qa}%`);
            }
        };

        renderModal(selIdx);
        modal.classList.remove('hidden');
    };

    window.viewAdminGradebookPDF = function () {
        const subSec = window.sigmaGradesState.selectedSubjectSection;
        if (!subSec) {
            if (typeof window.showToast === 'function') window.showToast('Please select a subject and section first.');
            return;
        }
        if (typeof window.viewGradebookCardPDF === 'function') {
            window.viewGradebookCardPDF();
        } else if (typeof window.showToast === 'function') {
            window.showToast(`Transfer / View Report Card for ${subSec.subject} • ${subSec.sectionName} (PDF & Excel ready)`);
        }
    };

    function getAdminGradebookAssessmentItems(category, quarter, subject, section) {
        const normCat = (category === 'pt' || category === 'perf. task') ? 'perf. task' : ((category === 'ww' || category === 'written works' || category === 'ww-sub') ? 'ww' : (category === 'qa' ? 'qa' : category));
        let details = [];
        if (typeof window.getCategoryDetails === 'function') {
            try {
                const res = window.getCategoryDetails(normCat, quarter, subject, section);
                if (Array.isArray(res)) {
                    details = [...res];
                }
            } catch (e) {}
        }
        return details;
    }

    function getAdminGradebookStudentItemScore(student, category, itemIdx, item, subjectId, quarter) {
        const itemCat = String(item?._category || item?.category || item?.type || (item?.quizId ? 'quiz' : '') || category || '').trim().toLowerCase();
        const normCat = (itemCat === 'pt' || itemCat === 'perf. task') ? 'perf. task' : itemCat;
        const hasActualSubmission = (typeof window.studentHasAssessmentSubmission === 'function' && item)
            ? window.studentHasAssessmentSubmission(student, item, subjectId, normCat)
            : false;

        const isQuizItem = Boolean(
            normCat.includes('quiz') || item?._category === 'quiz' || item?.category === 'quiz' || item?.type === 'quiz' || item?.quizId || /quiz/i.test(item?.title || item?.name || '')
        );

        if (typeof window.getEffectiveAssessmentStatusAndScore === 'function') {
            try {
                const eff = window.getEffectiveAssessmentStatusAndScore(student, normCat, itemIdx, subjectId, quarter, item);
                if (eff && !eff.isAutoMissing) {
                    if (eff.status === 'missing' || eff.status === 'absent') {
                        if (eff.score !== undefined && eff.score !== null && eff.score !== '' && eff.score !== '-' && !isNaN(Number(eff.score))) {
                            return Number(eff.score);
                        }
                        return null;
                    }
                    if (isQuizItem && !hasActualSubmission) {
                        return null;
                    }
                    if (eff.isManualOverride) {
                        if (eff.score !== undefined && eff.score !== null && eff.score !== '' && eff.score !== '-' && !isNaN(Number(eff.score))) {
                            return Number(eff.score);
                        }
                    }
                    if (eff.isFromSubmission && hasActualSubmission) {
                        if (eff.score !== undefined && eff.score !== null && eff.score !== '' && eff.score !== '-' && !isNaN(Number(eff.score))) {
                            return Number(eff.score);
                        }
                    }
                }
            } catch (e) {}
        }
        if (isQuizItem && !hasActualSubmission) {
            return null;
        }
        try {
            const storageKeys = ['sigma-teacher-gradebook-scores-v2', 'sigma_gradebook_scores', 'gradebookScores', 'sigma-gradebook-scores'];
            let scoresObj = typeof window._getTeacherGradebookCached === 'function'
                ? window._getTeacherGradebookCached().scores : null;
            for (const k of scoresObj ? [] : storageKeys) {
                const raw = localStorage.getItem(k);
                if (raw) {
                    try {
                        const parsed = JSON.parse(raw);
                        if (parsed && typeof parsed === 'object') {
                            scoresObj = parsed;
                            break;
                        }
                    } catch (e) {}
                }
            }
            if (scoresObj) {
                const subKeys = (typeof window.getUnifiedSubjectAliases === 'function')
                    ? window.getUnifiedSubjectAliases(subjectId)
                    : [subjectId, String(subjectId || '').replace(/^(card-|subj-)/, '').trim().toLowerCase()].filter(Boolean);
                const qKeys = [quarter, `Q${quarter}`, `q${quarter}`, String(quarter)];
                const sectionName = (window.sigmaGradesState && (window.sigmaGradesState.selectedSection || window.sigmaGradesState.selectedSubjectSection?.sectionName))
                    || (typeof gradebookState !== 'undefined' ? gradebookState.selectedSection : '')
                    || '';
                const cleanSec = String(sectionName).replace(/^grade\s*\d+\s*-\s*/i, '').trim().toLowerCase();
                const secKeys = Array.from(new Set([
                    sectionName ? ('sec:' + String(sectionName).trim().toLowerCase()) : '',
                    cleanSec ? ('sec:' + cleanSec) : ''
                ].filter(Boolean)));
                const sKeys = (typeof window.getStudentFullAliases === 'function')
                    ? window.getStudentFullAliases(student)
                    : [student.id, student.name, student.fullName, String(student.id || '').replace(/^std-/, ''), `std-${student.id}`, student.lrn].filter(Boolean);
                const catKeys = [];
                if (normCat.includes('assign') || normCat === 'task' || normCat === 'tasks') {
                    ['assignment', 'assignments', 'task', 'tasks', 'Assignment', 'Assignments'].forEach(k => { if (!catKeys.includes(k)) catKeys.push(k); });
                } else if (normCat.includes('quiz')) {
                    ['quiz', 'quizzes', 'Quiz', 'Quizzes'].forEach(k => { if (!catKeys.includes(k)) catKeys.push(k); });
                } else if (normCat.includes('activ')) {
                    ['activity', 'activities', 'Activity', 'Activities'].forEach(k => { if (!catKeys.includes(k)) catKeys.push(k); });
                } else if (normCat.includes('perf') || normCat === 'pt') {
                    ['perf. task', 'performance', 'pt', 'performanceTasks', 'Performance Task', 'Performance'].forEach(k => { if (!catKeys.includes(k)) catKeys.push(k); });
                } else if (normCat.includes('qa') || normCat.includes('exam')) {
                    ['qa', 'exam', 'QA', 'Exam'].forEach(k => { if (!catKeys.includes(k)) catKeys.push(k); });
                } else {
                    catKeys.push(category);
                    catKeys.push(normCat);
                }

                let zeroFallback = null;
                for (const sb of subKeys) {
                    for (const qk of qKeys) {
                        for (const sk of sKeys) {
                            for (const ck of catKeys) {
                                const quarterScores = scoresObj[sb]?.[qk];
                                const hasSections = Object.keys(quarterScores || {}).some(key => key.startsWith('sec:'));
                                const directScores = hasSections ? undefined : quarterScores?.[sk];
                                let val = directScores?.[ck]?.[itemIdx] ?? directScores?.[ck]?.[String(itemIdx)];
                                for (const secK of secKeys) {
                                    const secScores = scoresObj[sb]?.[qk]?.[secK]?.[sk];
                                    const sVal = secScores?.[ck]?.[itemIdx] ?? secScores?.[ck]?.[String(itemIdx)];
                                    if (sVal !== undefined && sVal !== null && sVal !== '' && sVal !== '-' && !isNaN(Number(sVal))) {
                                        val = sVal;
                                        break;
                                    }
                                }
                                if (val === undefined || val === null || val === '' || val === '-' || isNaN(Number(val))) continue;
                                if (Number(val) !== 0) return Number(val);
                                if (zeroFallback === null) zeroFallback = 0;
                            }
                        }
                    }
                }
                if (zeroFallback !== null) return zeroFallback;
            }
        } catch (e) {}

        if (hasActualSubmission && typeof window.readScorePanelPoints === 'function') {
            const panelScore = window.readScorePanelPoints(student, item, subjectId);
            if (panelScore !== null && panelScore !== undefined && !isNaN(Number(panelScore))) {
                return Number(panelScore);
            }
        }

        return null;
    }
    window.getAdminGradebookStudentItemScore = getAdminGradebookStudentItemScore;
    window.getAdminGradebookAssessmentItems = getAdminGradebookAssessmentItems;

    window.refreshAdminGradebookRow = function (target, override) {
        const tr = (target && target.tagName === 'TR') ? target : target?.closest?.('tr');
        if (!tr || !tr.closest('#admin-gradebook-spreadsheet')) return false;
        const state = window.sigmaGradesState || {};
        const subSec = state.selectedSubjectSection || {};
        const subjectId = subSec.subject || state.selectedSubject || '';
        const section = subSec.sectionName || state.selectedSection || '';
        const quarter = state.activeQuarter || 1;
        const currentView = state.currentView || 'ww';
        const detailCategory = (currentView === 'pt' || currentView === 'perf. task')
            ? 'perf. task'
            : ((currentView === 'ww' || currentView === 'ww-sub' || currentView === 'written works') ? 'ww' : currentView);
        const items = getAdminGradebookAssessmentItems(detailCategory, quarter, subjectId, section) || [];
        const totalHPS = items.reduce((sum, item) => sum + (Number(item.max || item.points) || 0), 0) || 100;
        const idEl = tr.querySelector('.gradebook-student-id');
        const nameEl = tr.querySelector('.gradebook-student-name') || tr.querySelector('td:first-child p');
        const student = {
            id: idEl ? idEl.textContent.replace(/^ID:\s*/i, '').trim() : (override?.studentId || ''),
            name: nameEl ? nameEl.textContent.trim() : (override?.studentName || '')
        };
        let rowSum = 0;
        let hasAny = false;
        items.forEach((item, allIdx) => {
            const itemCat = item._category || item.category || detailCategory;
            const itemIdx = (item.itemIdx !== undefined) ? item.itemIdx : allIdx;
            let score = null;
            if (override && String(override.category || '').toLowerCase() === String(itemCat || '').toLowerCase() && Number(override.itemIdx) === Number(itemIdx)) {
                const raw = String(override.value ?? '').trim();
                score = (raw === '' || raw === '-') ? null : Number(raw);
            } else {
                score = getAdminGradebookStudentItemScore(student, itemCat, itemIdx, item, subjectId, quarter);
            }
            if (score !== null && score !== undefined && !isNaN(Number(score))) {
                rowSum += Number(score);
                hasAny = true;
            }
        });
        const cells = tr.querySelectorAll('td');
        const totalCell = cells[cells.length - 2];
        const pctCell = cells[cells.length - 1];
        if (!totalCell || !pctCell) return false;
        if (!hasAny) {
            totalCell.innerHTML = '<span class="gradebook-dash">-</span>';
            pctCell.innerHTML = '<span class="gradebook-dash">-</span>';
            return true;
        }
        totalCell.textContent = String(Number(rowSum.toFixed(1)));
        const pct = totalHPS > 0 ? ((rowSum / totalHPS) * 100).toFixed(2) : '0.00';
        pctCell.textContent = pct + '%';
        return true;
    };

    window.setSigmaGradebookView = function (view) {
        const normalizedView = (view === 'ww-sub' || view === 'written-works' || view === 'written_works') ? 'ww' : (view || 'overview');
        if (!window.sigmaGradesState) {
            window.sigmaGradesState = {};
        }
        window.sigmaGradesState.currentView = normalizedView;
        window.sigmaGradesState.assessmentPage = 0;
        if (typeof gradebookState !== 'undefined' && gradebookState) {
            gradebookState.currentView = normalizedView;
            gradebookState.assessmentPage = 0;
        }
        saveSigmaGradesState();
        if (typeof window.renderAdminGradebookWorkspace === 'function') {
            window.renderAdminGradebookWorkspace();
        }
    };
    window.setGradebookView = window.setSigmaGradebookView;

    window.renderAdminGradebookWorkspace = function () {
        if (window.sigmaGradesState.activeTab !== 'gradebook') return;
        const workspaceContainer = document.getElementById('admin-gradebook-workspace-content');
        if (!workspaceContainer) return;

        const isTeacher = isCurrentPageTeacherPortal();
        const teacher = getEffectiveTeacher();
        const subSec = window.sigmaGradesState.selectedSubjectSection;

        if (!isTeacher) {
            if (!teacher) {
                // Empty State 1: Select a Teacher First (Admin only)
                workspaceContainer.innerHTML = `
                    <div class="flex-1 flex flex-col items-center justify-center p-12 text-center my-auto min-h-[420px] font-['Inter'] select-none">
                        <div class="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl mb-4 shadow-2xs" style="color: rgba(0, 0, 0, 0.40);">
                            <i class="fa-solid fa-chart-pie"></i>
                        </div>
                        <h3 class="text-base font-bold text-black tracking-tight font-['Inter']">Select a Teacher</h3>
                        <p class="text-xs max-w-md mt-1.5 leading-relaxed font-['Inter']" style="color: rgba(0, 0, 0, 0.45);">
                            Click the Teacher Panel above to choose a faculty member and inspect their Senior High School performance analytics.
                        </p>
                    </div>
                `;
                return;
            }
        }

        if (!subSec) {
            // Empty State 2: Select Subject & Section
            workspaceContainer.innerHTML = `
                <div class="flex-1 flex flex-col items-center justify-center p-12 text-center my-auto min-h-[420px] font-['Inter'] select-none">
                    <div class="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl mb-4 shadow-2xs" style="color: rgba(0, 0, 0, 0.40);">
                        <i class="fa-solid fa-table-cells"></i>
                    </div>
                    <h3 class="text-base font-bold text-black tracking-tight font-['Inter']">No Subject Selected</h3>
                    <p class="text-xs max-w-md mt-1.5 leading-relaxed font-['Inter']" style="color: rgba(0, 0, 0, 0.45);">
                        Click the subject picker above to choose a subject &amp; section.
                    </p>
                </div>
            `;
            return;
        }

        // Active State: Show Multi-View Gradebook Spreadsheet Table
        const currentView = window.sigmaGradesState.currentView || 'overview';
        const weights = loadAdminGradebookWeights(subSec?.subject);
        window.sigmaGradesState.weights = weights;
        const wwWeight = (Number(weights.ww) || 25) / 100;
        const ptWeight = (Number(weights.pt) || 50) / 100;
        const qaWeight = (Number(weights.qa) || 25) / 100;
        const currentQ = window.sigmaGradesState.activeQuarter || 1;

        let students = [];
        if (typeof window.getStudentsForSection === 'function') {
            students = window.getStudentsForSection(subSec.sectionName, subSec.subject);
        }
        if (!students || students.length === 0) {
            try {
                const adminSections = (typeof window.getStoredJson === 'function')
                    ? window.getStoredJson('sigma-admin-sections', [])
                    : JSON.parse(localStorage.getItem('sigma-admin-sections') || '[]');
                const found = adminSections.find(s => s && (s.name === subSec.sectionName || s.sectionName === subSec.sectionName));
                if (found && Array.isArray(found.students) && found.students.length > 0) {
                    students = found.students;
                }
            } catch (e) {}
        }
        if (!students || students.length === 0) {
            students = getDemoGradebookStudents(subSec.sectionName);
        }

        const sortOrder = window.sigmaGradesState.studentSortOrder || 'name-asc';
        students = [...students].sort((a, b) => {
            const nameA = String(a.name || a.fullName || '').trim();
            const nameB = String(b.name || b.fullName || '').trim();
            const idA = String(a.id || a.lrn || '').trim();
            const idB = String(b.id || b.lrn || '').trim();
            if (sortOrder === 'name-desc') {
                return nameB.localeCompare(nameA);
            } else if (sortOrder === 'id-asc') {
                return idA.localeCompare(idB, undefined, { numeric: true });
            } else if (sortOrder === 'id-desc') {
                return idB.localeCompare(idA, undefined, { numeric: true });
            } else if (sortOrder === 'grade-desc') {
                const gA = Number(a?.finalGrade ?? a?.initialGrade ?? a?.totalScore ?? 0);
                const gB = Number(b?.finalGrade ?? b?.initialGrade ?? b?.totalScore ?? 0);
                return gB - gA;
            } else if (sortOrder === 'grade-asc') {
                const gA = Number(a?.finalGrade ?? a?.initialGrade ?? a?.totalScore ?? 0);
                const gB = Number(b?.finalGrade ?? b?.initialGrade ?? b?.totalScore ?? 0);
                return gA - gB;
            } else if (sortOrder === 'gender') {
                const genderA = (a.gender || a.sex || '').toLowerCase().startsWith('m') ? 0 : 1;
                const genderB = (b.gender || b.sex || '').toLowerCase().startsWith('m') ? 0 : 1;
                if (genderA !== genderB) {
                    return genderA - genderB;
                }
                return nameA.localeCompare(nameB);
            }
            return nameA.localeCompare(nameB);
        });

        let sortIconClass = 'fa-arrow-down-a-z';
        if (sortOrder === 'name-desc') sortIconClass = 'fa-arrow-up-z-a';
        else if (sortOrder === 'id-asc') sortIconClass = 'fa-arrow-down-1-9';
        else if (sortOrder === 'id-desc') sortIconClass = 'fa-arrow-up-9-1';
        else if (sortOrder === 'grade-desc') sortIconClass = 'fa-arrow-down-wide-short';
        else if (sortOrder === 'grade-asc') sortIconClass = 'fa-arrow-up-short-wide';
        else if (sortOrder === 'gender') sortIconClass = 'fa-venus-mars';

        const renderStudentCell = (s) => {
            const avatarHtml = (typeof window.renderUserAvatarHtml === 'function')
                ? window.renderUserAvatarHtml(s, 'sm')
                : `<div class="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-700 shrink-0"><i class="fa-solid fa-user text-slate-400 text-xs"></i></div>`;
            return `
                <td class="px-4 py-3.5 bg-white sticky left-0 z-10 gb-student-cell border-b border-r border-black/[0.08] align-middle">
                    <div class="flex items-center gap-3">
                        <div class="shrink-0 flex items-center justify-center">
                            ${avatarHtml}
                        </div>
                        <div class="min-w-0 flex-1">
                            <p class="text-xs md:text-sm font-semibold text-slate-900 truncate leading-snug font-['Inter']">${escapeHtml(s.name || s.fullName || 'Student')}</p>
                            <p class="gradebook-student-id text-[11px] text-black/45 font-normal leading-normal mt-0.5 font-['Inter']" style="color: rgba(0, 0, 0, 0.45) !important;">ID: ${escapeHtml(s.id || s.lrn || '—')}</p>
                        </div>
                    </div>
                </td>
            `;
        };

        // ══════════════════════════════════════════════════════════════════════
        // VIEW 1: OVERVIEW TABLE (1st Table Page)
        // ══════════════════════════════════════════════════════════════════════
        if (currentView === 'overview') {
            const rowsHtml = students.map((s) => {
                let wwVal = null;
                let ptVal = null;
                let qaVal = null;

                if (typeof window.calculateGradebookCategoryPercentage === 'function') {
                    try {
                        const wwPct = window.calculateGradebookCategoryPercentage(s, 'ww', subSec.subject, currentQ, subSec.sectionName);
                        if (wwPct !== null && wwPct !== undefined && !isNaN(Number(wwPct))) wwVal = Number(wwPct);
                        const ptPct = window.calculateGradebookCategoryPercentage(s, 'perf. task', subSec.subject, currentQ, subSec.sectionName);
                        if (ptPct !== null && ptPct !== undefined && !isNaN(Number(ptPct))) ptVal = Number(ptPct);
                        const qaPct = window.calculateGradebookCategoryPercentage(s, 'qa', subSec.subject, currentQ, subSec.sectionName);
                        if (qaPct !== null && qaPct !== undefined && !isNaN(Number(qaPct))) qaVal = Number(qaPct);
                    } catch (e) {}
                }

                try {
                    const storageKeys = ['sigma-teacher-gradebook-scores-v2', 'sigma_gradebook_scores', 'gradebookScores', 'sigma-gradebook-scores'];
                    let scoresObj = typeof window._getTeacherGradebookCached === 'function'
                        ? window._getTeacherGradebookCached().scores : null;
                    for (const k of scoresObj ? [] : storageKeys) {
                        const raw = localStorage.getItem(k);
                        if (raw) {
                            try {
                                const parsed = JSON.parse(raw);
                                if (parsed && typeof parsed === 'object') {
                                    scoresObj = parsed;
                                    break;
                                }
                            } catch (e) {}
                        }
                    }

                    if (scoresObj) {
                        const subKeys = (typeof window.getUnifiedSubjectAliases === 'function')
                            ? window.getUnifiedSubjectAliases(subSec.subject)
                            : [subSec.subject, String(subSec.subject || '').replace(/^(card-|subj-)/, '').trim().toLowerCase()].filter(Boolean);
                        const qKeys = [currentQ, `Q${currentQ}`, `q${currentQ}`, String(currentQ)];
                        const sKeys = [s.id, s.name, s.fullName, String(s.id || '').replace(/^std-/, ''), `std-${s.id}`, s.lrn].filter(Boolean);

                        let foundSpecificScores = false;
                        for (const sb of subKeys) {
                            if (foundSpecificScores) break;
                            for (const qk of qKeys) {
                                if (foundSpecificScores) break;
                                for (const sk of sKeys) {
                                    const quarterScores = scoresObj[sb]?.[qk];
                                    const sectionKey = `sec:${String(window.sigmaGradesState?.selectedSubjectSection?.sectionName || window.sigmaGradesState?.selectedSection || '').trim().toLowerCase()}`;
                                    const scoped = quarterScores?.[sectionKey];
                                    const hasSections = Object.keys(quarterScores || {}).some(key => key.startsWith('sec:'));
                                    const subScores = (hasSections ? scoped : quarterScores)?.[sk];
                                    if (subScores) {
                                        if (wwVal === null && subScores.ww !== undefined && subScores.ww !== null && subScores.ww !== '' && !isNaN(Number(subScores.ww))) { wwVal = Number(subScores.ww); foundSpecificScores = true; }
                                        if (ptVal === null && subScores.pt !== undefined && subScores.pt !== null && subScores.pt !== '' && !isNaN(Number(subScores.pt))) { ptVal = Number(subScores.pt); foundSpecificScores = true; }
                                        if (qaVal === null && subScores.qa !== undefined && subScores.qa !== null && subScores.qa !== '' && !isNaN(Number(subScores.qa))) { qaVal = Number(subScores.qa); foundSpecificScores = true; }
                                    }
                                }
                            }
                        }
                    }
                } catch (e) {}

                const wwDisplay = (wwVal !== null && wwVal !== undefined) ? `${Number(wwVal).toFixed(2)}%` : '<span class="gradebook-dash" style="color: rgba(0, 0, 0, 0.40) !important;">-</span>';
                const ptDisplay = (ptVal !== null && ptVal !== undefined) ? `${Number(ptVal).toFixed(2)}%` : '<span class="gradebook-dash" style="color: rgba(0, 0, 0, 0.40) !important;">-</span>';
                const qaDisplay = (qaVal !== null && qaVal !== undefined) ? `${Number(qaVal).toFixed(2)}%` : '<span class="gradebook-dash" style="color: rgba(0, 0, 0, 0.40) !important;">-</span>';

                let initialGrade = null;
                if (wwVal !== null || ptVal !== null || qaVal !== null) {
                    let tot = 0;
                    if (wwVal !== null) tot += Number(wwVal) * wwWeight;
                    if (ptVal !== null) tot += Number(ptVal) * ptWeight;
                    if (qaVal !== null) tot += Number(qaVal) * qaWeight;
                    initialGrade = tot;
                }

                const initialDisplay = initialGrade !== null ? `${Number(initialGrade).toFixed(2)}%` : '<span class="gradebook-dash" style="color: rgba(0, 0, 0, 0.40) !important;">-</span>';
                const finalDisplay = initialGrade !== null ? `${Math.round(initialGrade)}` : '<span class="gradebook-dash" style="color: rgba(0, 0, 0, 0.40) !important;">-</span>';

                return `
                    <tr class="bg-white border-b border-black/[0.08] font-['Inter'] cursor-default select-none">
                        ${renderStudentCell(s)}
                        <td class="px-4 py-3.5 text-center border-b border-black/[0.08] text-xs md:text-sm font-medium transition-colors align-middle gb-data-cell ${wwVal !== null ? 'text-slate-900 font-semibold' : 'text-black/40 font-normal'}">
                            ${wwDisplay}
                        </td>
                        <td class="px-4 py-3.5 text-center border-b border-black/[0.08] text-xs md:text-sm font-medium transition-colors align-middle gb-data-cell ${ptVal !== null ? 'text-slate-900 font-semibold' : 'text-black/40 font-normal'}">
                            ${ptDisplay}
                        </td>
                        <td class="gb-col-divider px-4 py-3.5 text-center border-b border-black/[0.08] text-xs md:text-sm font-medium transition-colors align-middle gb-data-cell ${qaVal !== null ? 'text-slate-900 font-semibold' : 'text-black/40 font-normal'}">
                            ${qaDisplay}
                        </td>
                        <td class="px-4 py-3.5 text-center border-b border-black/[0.08] text-xs md:text-sm font-bold text-slate-900 tracking-wide transition-colors align-middle gb-data-cell gb-summary-green" style="background-color: rgba(16, 185, 129, 0.08);">
                            ${initialDisplay}
                        </td>
                        <td class="px-4 py-3.5 text-center border-b border-black/[0.08] text-xs md:text-sm font-bold ${initialGrade !== null ? 'text-slate-900' : 'text-black/40'} tracking-wide transition-colors align-middle gb-data-cell gb-summary-green" style="background-color: rgba(16, 185, 129, 0.08);">
                            ${finalDisplay}
                        </td>
                    </tr>
                `;
            }).join('');

            workspaceContainer.innerHTML = `
                <div class="flex-1 w-full h-full min-h-0 overflow-y-auto overflow-x-auto bg-white border-none rounded-none shadow-none font-['Inter'] px-10">
                    <table id="admin-gradebook-spreadsheet" class="w-full min-w-[700px] border-collapse table-fixed font-['Inter'] rounded-none shadow-none">
                        <colgroup>
                            <col style="width: 25%; min-width: 240px;">
                            <col style="width: 15%; min-width: 120px;">
                            <col style="width: 15%; min-width: 120px;">
                            <col style="width: 15%; min-width: 120px;">
                            <col style="width: 15%; min-width: 110px;">
                            <col style="width: 15%; min-width: 110px;">
                        </colgroup>
                        <thead class="sticky top-0 z-30 bg-[#15803d] shadow-xs rounded-none border-b border-[#166534]">
                            <tr class="border-b border-[#166534] bg-[#15803d] rounded-none h-[52px]">
                                <th class="px-4 py-3 text-center bg-[#15803d] sticky left-0 z-40 select-none rounded-none align-middle">
                                    <div class="flex items-center justify-center gap-2 leading-none">
                                        <span class="text-xs md:text-sm font-semibold text-white tracking-normal font-['Inter'] leading-none">Students</span>
                                        <button type="button" onclick="window.toggleAdminGradebookStudentSort(this, event)" 
                                            class="gradebook-sort-btn" 
                                            title="Sort students roster">
                                            <i class="fa-solid ${sortIconClass} text-xs pointer-events-none"></i>
                                        </button>
                                    </div>
                                </th>
                                <th class="px-4 py-2 text-center bg-[#15803d] cursor-default select-none rounded-none align-middle">
                                    <div class="flex flex-col items-center justify-center leading-tight">
                                        <div class="inline-flex items-center justify-center gap-1.5 leading-none">
                                            <span class="text-xs md:text-sm font-semibold text-white tracking-normal font-['Inter'] select-none">Written Works</span>
                                            <button type="button" onclick="window.setSigmaGradebookView('ww')"
                                                class="gradebook-nav-btn"
                                                title="View Written Works breakdown">
                                                <i class="fa-solid fa-arrow-right text-[11px] pointer-events-none"></i>
                                            </button>
                                        </div>
                                        <span class="text-[11px] font-medium text-white/80 mt-0.5 select-none font-['Inter']">${weights.ww}%</span>
                                    </div>
                                </th>
                                <th class="px-4 py-2 text-center bg-[#15803d] cursor-default select-none rounded-none align-middle">
                                    <div class="flex flex-col items-center justify-center leading-tight">
                                        <div class="inline-flex items-center justify-center gap-1.5 leading-none">
                                            <span class="text-xs md:text-sm font-semibold text-white tracking-normal font-['Inter'] select-none">Performance Task</span>
                                            <button type="button" onclick="window.setSigmaGradebookView('pt')"
                                                class="gradebook-nav-btn"
                                                title="View Performance Task breakdown">
                                                <i class="fa-solid fa-arrow-right text-[11px] pointer-events-none"></i>
                                            </button>
                                        </div>
                                        <span class="text-[11px] font-medium text-white/80 mt-0.5 select-none font-['Inter']">${weights.pt}%</span>
                                    </div>
                                </th>
                                <th class="gb-col-divider px-4 py-2 text-center bg-[#15803d] cursor-default select-none rounded-none align-middle">
                                    <div class="flex flex-col items-center justify-center leading-tight">
                                        <div class="inline-flex items-center justify-center gap-1.5 leading-none">
                                            <span class="text-xs md:text-sm font-semibold text-white tracking-normal font-['Inter'] select-none">Quarterly Assessment</span>
                                            <button type="button" onclick="window.setSigmaGradebookView('qa')"
                                                class="gradebook-nav-btn"
                                                title="View Quarterly Assessment breakdown">
                                                <i class="fa-solid fa-arrow-right text-[11px] pointer-events-none"></i>
                                            </button>
                                        </div>
                                        <span class="text-[11px] font-medium text-white/80 mt-0.5 select-none font-['Inter']">${weights.qa}%</span>
                                    </div>
                                </th>
                                <th class="px-4 py-2 text-center bg-[#15803d] cursor-default select-none rounded-none align-middle">
                                    <div class="flex flex-col items-center justify-center leading-tight">
                                        <span class="text-xs md:text-sm font-semibold text-white tracking-normal font-['Inter']">Initial Grade</span>
                                    </div>
                                </th>
                                <th class="px-4 py-2 text-center bg-[#15803d] cursor-default select-none rounded-none align-middle">
                                    <div class="flex flex-col items-center justify-center leading-tight">
                                        <span class="text-xs md:text-sm font-semibold text-white tracking-normal font-['Inter']">Quarterly Final</span>
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody id="admin-gradebook-body" class="divide-y divide-black/[0.08]">
                            ${rowsHtml}
                        </tbody>
                    </table>
                </div>
            `;
            return;
        }

        // ══════════════════════════════════════════════════════════════════════
        // VIEW 2: DETAIL TABLE (WW, PT, QA) — Combined Release Order Items
        // ══════════════════════════════════════════════════════════════════════
        const detailCategory = (currentView === 'pt' || currentView === 'perf. task') ? 'perf. task' : ((currentView === 'ww' || currentView === 'ww-sub' || currentView === 'written works') ? 'ww' : currentView);
        const backTarget = 'overview';
        const items = getAdminGradebookAssessmentItems(detailCategory, currentQ, subSec.subject, subSec.sectionName) || [];
        const totalHPS = items.reduce((s, it) => s + (Number(it.max || it.points) || 0), 0) || 100;

        let categoryTitle = 'Details';
        let categoryWeightBadge = '';
        if (detailCategory === 'perf. task') {
            categoryTitle = 'Performance Task';
            categoryWeightBadge = `Component (${weights.pt}%)`;
        } else if (detailCategory === 'qa') {
            categoryTitle = 'Quarterly Assessment';
            categoryWeightBadge = `Component (${weights.qa}%)`;
        } else if (detailCategory === 'ww') {
            categoryTitle = 'Written Works';
            categoryWeightBadge = `Component (${weights.ww}%)`;
        } else if (detailCategory === 'assignment') {
            categoryTitle = 'Assignment';
            categoryWeightBadge = 'Written Works';
        } else if (detailCategory === 'quiz') {
            categoryTitle = 'Quiz';
            categoryWeightBadge = 'Written Works';
        } else if (detailCategory === 'activity') {
            categoryTitle = 'Activity';
            categoryWeightBadge = 'Written Works';
        }

        const PAGE_SIZE = 4;
        const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
        let currentPage = window.sigmaGradesState.assessmentPage || 0;
        if (currentPage >= totalPages) currentPage = totalPages - 1;
        if (currentPage < 0) currentPage = 0;
        window.sigmaGradesState.assessmentPage = currentPage;

        const startIndex = currentPage * PAGE_SIZE;
        const visibleItems = items.slice(startIndex, startIndex + PAGE_SIZE);

        const rowsHtml = students.map((s) => {
            let rowScoreSum = 0;
            let rowHasAny = false;
            const itemScores = new Map();

            // Calculate total across all items in component
            items.forEach((it, allIdx) => {
                const itCat = it._category || it.category || detailCategory;
                const itIdx = (it.itemIdx !== undefined) ? it.itemIdx : allIdx;
                const sc = getAdminGradebookStudentItemScore(s, itCat, itIdx, it, subSec.subject, currentQ);
                itemScores.set(it, sc);
                if (sc !== null && sc !== undefined && !isNaN(Number(sc))) {
                    rowScoreSum += Number(sc);
                    rowHasAny = true;
                }
            });

            // Render the 4 task slots for current page
            let itemCellsHtml = '';
            for (let slotIdx = 0; slotIdx < PAGE_SIZE; slotIdx++) {
                const it = visibleItems[slotIdx];
                if (it) {
                    const itCat = it._category || it.category || detailCategory;
                    const itIdx = (it.itemIdx !== undefined) ? it.itemIdx : (startIndex + slotIdx);
                    const sc = itemScores.get(it);
                    const hasSubmission = (typeof window.studentHasAssessmentSubmission === 'function')
                        ? window.studentHasAssessmentSubmission(s, it, subSec.subject, itCat)
                        : false;
                    const studentId = String(s.id || s.uid || s.lrn || '').replace(/"/g, '&quot;');
                    const studentName = String(s.name || s.fullName || '').replace(/"/g, '&quot;');
                    const maxPts = Number(it.max) || 100;
                    const mark = (typeof window.gradebookAttendanceMark === 'function')
                        ? window.gradebookAttendanceMark(s, it, itCat, itIdx, subSec.subject, currentQ)
                        : null;
                    const rawScore = (sc !== null && sc !== undefined && !isNaN(Number(sc))) ? Math.trunc(Number(sc)) : null;
                    const clampedScore = (rawScore === null) ? '' : String(Math.max(0, Math.min(maxPts || rawScore, rawScore)));
                    const scoreLabel = clampedScore === '' ? '-' : clampedScore;
                    const cellStyle = mark && typeof window.gradebookAttendanceCellStyle === 'function'
                        ? window.gradebookAttendanceCellStyle(mark)
                        : '';
                    const itemSource = it.rawItem || it;
                    const itemId = String(itemSource.id || itemSource.materialId || itemSource.origId || itemSource.quizId || itemSource.selectedQuizId || it.id || '').replace(/"/g, '&quot;');
                    const itemType = String(itemSource.type || itemSource.category || it.type || it.category || 'assessments').replace(/"/g, '&quot;');
                    const topicIdxAttr = (it.topicIdx !== undefined && it.topicIdx !== null) ? it.topicIdx : '';
                    const topicItemAttr = (it.topicItemIdx !== undefined && it.topicItemIdx !== null) ? it.topicItemIdx : itIdx;
                    const taskTitle = String(it.title || itemSource.title || itemSource.name || `${categoryTitle} #${startIndex + slotIdx + 1}`).replace(/"/g, '&quot;');
                    const hasRecordedScore = (rawScore !== null && clampedScore !== '');
                    const isSubmitted = hasRecordedScore || hasSubmission || Boolean(mark);
                    const isQuizItem = Boolean(itCat.includes('quiz') || it.quizId || itemSource.quizId || /quiz/i.test(taskTitle));
                    const lockTitle = isQuizItem ? 'Locked: Student must submit the quiz first to unlock grading' : 'Locked: Student must submit coursework first to unlock grading';
                    if (!isSubmitted) {
                        itemCellsHtml += `
                        <td class="gradebook-task-cell px-1 py-3 text-center border-b border-black/[0.08] text-xs md:text-sm font-normal align-middle gb-data-cell text-black/40 cursor-not-allowed select-none transition-colors"
                            data-locked="1"
                            data-unsubmitted="1"
                            data-student-id="${studentId}"
                            data-student-name="${studentName}"
                            data-category="${String(itCat).replace(/"/g, '&quot;')}"
                            data-item-idx="${itIdx}"
                            data-subject="${String(it.subjectId || subSec.subject || '').replace(/"/g, '&quot;')}"
                            data-topic-idx="${topicIdxAttr}"
                            data-topic-item-idx="${topicItemAttr}"
                            data-item-id="${itemId}"
                            data-item-type="${itemType}"
                            data-task-title="${taskTitle}"
                            data-max="${maxPts}"
                            title="${lockTitle}"
                            onclick="window.showGradebookUnsubmittedIndicator?.(this, '${studentName}', '${taskTitle}')">
                            <span class="gradebook-dash font-medium text-black/30 select-none">-</span>
                        </td>
                    `;
                    } else {
                        itemCellsHtml += `
                        <td class="gradebook-task-cell px-1 py-3 text-center border-b border-black/[0.08] text-xs md:text-sm font-bold align-middle gb-data-cell cursor-text ${mark ? `gb-cell-${mark.tone} gradebook-status-${mark.tone}` : ''}"
                            data-locked="0"
                            data-unsubmitted="0"
                            data-score="${clampedScore}"
                            data-max="${maxPts}"
                            data-student-id="${studentId}"
                            data-student-name="${studentName}"
                            data-category="${String(itCat).replace(/"/g, '&quot;')}"
                            data-item-idx="${itIdx}"
                            data-subject="${String(it.subjectId || subSec.subject || '').replace(/"/g, '&quot;')}"
                            data-topic-idx="${topicIdxAttr}"
                            data-topic-item-idx="${topicItemAttr}"
                            data-item-id="${itemId}"
                            data-item-type="${itemType}"
                            data-task-title="${taskTitle}"
                            data-attendance="${mark ? mark.tone : ''}"
                            title="${mark ? mark.name : `0 to ${maxPts}`}"
                            style="${cellStyle}"
                            onclick="window.openGradebookScoreEditor?.(this)">
                            <div class="gb-score-stack">
                                ${scoreLabel === '-' ? `<span class="gradebook-dash" style="color:inherit !important;">-</span>` : `<span class="gradebook-score-value" style="color:inherit !important;">${scoreLabel}</span>`}
                            </div>
                        </td>
                    `;
                    }
                } else {
                    itemCellsHtml += `<td class="gradebook-task-cell gb-empty-cell border-b border-black/[0.08]"></td>`;
                }
            }

            const totalDisplay = rowHasAny ? rowScoreSum : null;
            const pctDisplay = (totalDisplay !== null && totalHPS > 0)
                ? Math.max(0, Math.min(100, (totalDisplay / totalHPS) * 100)).toFixed(2)
                : null;

            return `
                <tr class="bg-white border-b border-black/[0.08] font-['Inter'] cursor-default select-none">
                    ${renderStudentCell(s)}
                    <td class="gb-thin-nav-col bg-transparent p-0 m-0 border-b border-black/[0.08]"></td>
                    ${itemCellsHtml}
                    <td class="gb-col-divider gb-thin-nav-col bg-transparent p-0 m-0 border-b border-black/[0.08]"></td>
                    <td class="gb-col-compact px-1 py-3 text-center border-b border-black/[0.08] text-xs font-bold text-slate-900 tracking-tight align-middle gb-data-cell gb-summary-yellow" style="background-color: rgba(254, 240, 138, 0.35);">
                        ${totalDisplay !== null ? totalDisplay : '<span class="gradebook-dash">-</span>'}
                    </td>
                    <td class="gb-col-compact px-1 py-3 text-center border-b border-black/[0.08] text-xs font-bold text-slate-900 tracking-tight align-middle gb-data-cell gb-summary-yellow" style="background-color: rgba(254, 240, 138, 0.35);">
                        ${pctDisplay !== null ? `${pctDisplay}%` : '<span class="gradebook-dash">-</span>'}
                    </td>
                </tr>
            `;
        }).join('');

        let taskHeadersHtml = '';
        for (let slotIdx = 0; slotIdx < PAGE_SIZE; slotIdx++) {
            const it = visibleItems[slotIdx];
            if (it) {
                const topicNum = (it.topicIdx !== undefined && it.topicIdx !== null && !isNaN(it.topicIdx))
                    ? (Number(it.topicIdx) + 1)
                    : (it.topicNumber || null);
                const topicTag = topicNum ? `Topic ${topicNum}` : '';

                let formattedDate = (typeof window.formatDateTitleCase === 'function') ? window.formatDateTitleCase(it.date) : (it.date || 'Date');
                if (formattedDate.includes('•')) formattedDate = formattedDate.split('•')[0].trim();
                formattedDate = formattedDate.replace(/\s+(at\s+)?\d{1,2}:\d{2}(:\d{2})?(\s*[ap]m)?$/i, '').trim();
                const rawTitle = String(it.title || `${categoryTitle} #${startIndex + slotIdx + 1}`);
                const topicFullTooltip = it.topicTitle ? `${topicTag ? topicTag + ': ' : ''}${it.topicTitle} — ${rawTitle}` : (topicTag ? `${topicTag} — ${rawTitle}` : rawTitle);
                const titleLen = rawTitle.length;
                const titleSizeClass = titleLen > 24 ? 'text-[10.5px]' : (titleLen > 14 ? 'text-[11.5px]' : 'text-[12.5px]');
                const itCat = it._category || it.category || category;
                const itIdx = (it.itemIdx !== undefined) ? it.itemIdx : (startIndex + slotIdx);
                const isFake = Boolean(it.isFake || it.isMock);

                const titleHtml = isFake
                    ? `<span class="font-bold text-white text-center block w-full leading-tight gradebook-task-title select-none cursor-default ${titleSizeClass}" 
                             title="${escapeHtml(topicFullTooltip)}">
                           ${escapeHtml(rawTitle)}
                       </span>`
                    : `<span class="font-bold text-white hover:text-[#FFD000] no-underline hover:no-underline transition-all cursor-pointer text-center block w-full leading-tight gradebook-task-title ${titleSizeClass}" 
                             title="${escapeHtml(topicFullTooltip)}"
                             onclick="event.stopPropagation(); window.navigateToAssessmentFromGradebook('${itCat}', ${itIdx}, '${escapeHtml(subSec?.subject || '')}', '${escapeHtml(subSec?.sectionName || '')}')">
                           ${escapeHtml(rawTitle)}
                       </span>`;

                taskHeadersHtml += `
                    <th class="gradebook-task-header-cell bg-[#15803d] cursor-default select-none rounded-none align-middle border-b border-[#166534]">
                        <div class="flex flex-col items-center justify-between w-full h-[58px] py-1 select-none font-['Inter']">
                            <div class="flex items-center gap-1.5 leading-none">
                                <span class="text-[10px] font-semibold text-white tracking-tight leading-none">${formattedDate}</span>
                                ${topicTag ? `<span class="text-[9px] font-bold text-[#FFD000] bg-black/20 px-1.5 py-0.5 rounded tracking-tight leading-none">${topicTag}</span>` : ''}
                            </div>
                            ${titleHtml}
                            <span class="text-[10px] font-medium leading-none text-white/90">HPS: ${it.max || 100} pts</span>
                        </div>
                    </th>
                `;
            } else {
                taskHeadersHtml += `
                    <th class="gradebook-task-header-cell bg-[#15803d]/80 cursor-default select-none gb-empty-cell rounded-none align-middle border-b border-[#166534]">
                        <div class="flex flex-col items-center justify-center w-full h-[54px]"></div>
                    </th>
                `;
            }
        }

        workspaceContainer.innerHTML = `
            <div class="flex-1 w-full h-full min-h-0 overflow-y-auto overflow-x-auto bg-white border-none rounded-none shadow-none font-['Inter'] px-4 md:px-6 xl:px-8">
                <table id="admin-gradebook-spreadsheet" class="w-full min-w-[700px] border-collapse table-fixed font-['Inter'] rounded-none shadow-none">
                    <thead class="sticky top-0 z-30 bg-[#15803d] shadow-xs rounded-none border-b border-[#166534]">
                        <tr class="border-b border-[#166534] bg-[#15803d] rounded-none h-[52px]">
                            <th class="w-[280px] min-w-[280px] max-w-[280px] px-3.5 py-3 bg-[#15803d] sticky left-0 z-40 select-none rounded-none align-middle border-b border-[#166534]">
                                <div class="flex items-center justify-start gap-2.5 leading-none">
                                    <button type="button" onclick="window.setSigmaGradebookView('${backTarget}')" 
                                        class="gradebook-back-btn" 
                                        title="Back to Overview">
                                        <i class="fa-solid fa-chevron-left text-[10px]"></i>
                                    </button>
                                    <div class="flex flex-col items-start justify-center min-w-0">
                                        <span class="text-xs md:text-sm font-bold text-white leading-tight truncate font-['Inter']">${categoryTitle}</span>
                                        ${categoryWeightBadge ? `<span class="text-[11px] font-medium text-white/90 mt-0.5">${categoryWeightBadge}</span>` : ''}
                                    </div>
                                </div>
                            </th>
                            <th class="gb-thin-nav-col bg-[#15803d] cursor-default select-none align-middle border-b border-[#166534]">
                                <button type="button" onclick="window.navigateGradebookAssessmentPage(-1)" class="gb-thin-nav-btn ${currentPage === 0 ? 'opacity-20 cursor-not-allowed pointer-events-none' : ''}" title="Previous Assessments">
                                    <i class="fa-solid fa-chevron-left text-[9px]"></i>
                                </button>
                            </th>
                            ${taskHeadersHtml}
                            <th class="gb-col-divider gb-thin-nav-col bg-[#15803d] cursor-default select-none align-middle border-b border-[#166534]">
                                <button type="button" onclick="window.navigateGradebookAssessmentPage(1)" class="gb-thin-nav-btn ${currentPage >= totalPages - 1 ? 'opacity-20 cursor-not-allowed pointer-events-none' : ''}" title="Next Assessments">
                                    <i class="fa-solid fa-chevron-right text-[9px]"></i>
                                </button>
                            </th>
                            <th class="gb-col-compact px-1.5 py-2 text-center bg-[#15803d] cursor-default select-none rounded-none align-middle border-b border-[#166534]">
                                <div class="flex flex-col items-center justify-center leading-tight font-['Inter']">
                                    <span class="text-xs sm:text-[13px] font-bold text-white leading-tight">Total</span>
                                    <span class="text-[11px] font-medium text-white/90 mt-0.5 font-['Inter']">${totalHPS} pts</span>
                                </div>
                            </th>
                            <th class="gb-col-compact px-1.5 py-2 text-center bg-[#15803d] cursor-default select-none rounded-none align-middle border-b border-[#166534]">
                                <div class="flex flex-col items-center justify-center leading-tight font-['Inter']">
                                    <span class="text-xs sm:text-[13px] font-bold text-white leading-tight">% Score</span>
                                    <span class="text-[11px] font-medium text-white/90 mt-0.5 font-['Inter']">Score %</span>
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody id="admin-gradebook-body" class="divide-y divide-black/[0.08]">
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>
        `;
    };

    window.toggleAdminGradebookStudentSort = function(buttonEl, event) {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }
        const currentKey = window.sigmaGradesState.studentSortOrder || 'name-asc';
        if (typeof window.openGradebookSortPopover === 'function') {
            window.openGradebookSortPopover(buttonEl, currentKey, (newSortKey) => {
                window.sigmaGradesState.studentSortOrder = newSortKey;
                saveSigmaGradesState();
                if (typeof window.renderAdminGradebookWorkspace === 'function') {
                    window.renderAdminGradebookWorkspace();
                }
            });
        }
    };

    window.switchAdminGradesTab = function (tabId) {
        if (!window.sigmaGradesState) window.sigmaGradesState = {};
        window.sigmaGradesState.activeTab = tabId;
        saveSigmaGradesState();

        // Update URL hash if currently on a grades section so refresh keeps the exact sub-tab
        const isTeacher = (window.sigmaGradesState && window.sigmaGradesState.isTeacherPage) || isCurrentPageTeacherPortal();
        const currentHash = window.location.hash || '';
        if (currentHash.startsWith('#grades') || currentHash.startsWith('#school-grades') || currentHash === '#analytics' || currentHash === '#gradebooks' || currentHash === '#gradebook') {
            const basePrefix = isTeacher ? '#grades' : (currentHash.startsWith('#school-grades') ? '#school-grades' : '#grades');
            const targetHash = `${basePrefix}:${tabId}`;
            if (window.location.hash !== targetHash) {
                if (window.history && window.history.replaceState) {
                    window.history.replaceState(window.history.state, '', targetHash);
                } else {
                    window.location.hash = targetHash;
                }
            }
        }

        const analyticsBtn = document.getElementById('admin-grades-tab-analytics');
        const gradebookBtn = document.getElementById('admin-grades-tab-gradebook');
        const analyticsView = document.getElementById('admin-grades-analytics-view');
        const gradebookView = document.getElementById('admin-grades-gradebook-view');

        if (analyticsBtn && gradebookBtn) {
            if (tabId === 'gradebook') {
                gradebookBtn.className = "sigma-header-tab-btn sigma-header-tab-btn--active";
                gradebookBtn.style.color = '#000000';
                analyticsBtn.className = "sigma-header-tab-btn sigma-header-tab-btn--inactive";
                analyticsBtn.style.color = 'rgba(0, 0, 0, 0.30)';
            } else {
                analyticsBtn.className = "sigma-header-tab-btn sigma-header-tab-btn--active";
                analyticsBtn.style.color = '#000000';
                gradebookBtn.className = "sigma-header-tab-btn sigma-header-tab-btn--inactive";
                gradebookBtn.style.color = 'rgba(0, 0, 0, 0.30)';
            }
        }
        if (analyticsView && gradebookView) {
            if (tabId === 'gradebook') {
                analyticsView.classList.add('hidden');
                gradebookView.classList.remove('hidden');
                window.renderAdminGradebookWorkspace();
            } else {
                gradebookView.classList.add('hidden');
                analyticsView.classList.remove('hidden');
                window.renderAdminAnalyticsWorkspace();
            }
        }

        const actBtns = document.getElementById('admin-gradebook-action-buttons');
        if (actBtns) {
            if (tabId === 'gradebook' && window.sigmaGradesState.selectedSubjectSection) {
                actBtns.classList.remove('hidden');
                actBtns.style.setProperty('display', 'flex', 'important');
            } else {
                actBtns.classList.add('hidden');
                actBtns.style.setProperty('display', 'none', 'important');
            }
        }

        if (typeof window.syncTeacherGradesNavState === 'function') {
            window.syncTeacherGradesNavState(tabId);
        }
    };

    window.switchTeacherGradesTab = window.switchAdminGradesTab;

    for (const name of ['renderAdminGradebookWorkspace', 'renderAdminAnalyticsWorkspace']) {
        const render = window[name];
        window[name] = function (...args) {
            const run = () => render.apply(this, args);
            return typeof window.withGradebookReadCache === 'function'
                ? window.withGradebookReadCache(run) : run();
        };
    }

    window.renderSigmaGradesView = function (targetContainerId, options = {}) {
        const container = document.getElementById(targetContainerId);
        if (!container) return;

        const isTeacherPage = (options.role === 'teacher' || options.isTeacherPage === true) || (options.role !== 'admin' && (targetContainerId === 'section-grades' || isCurrentPageTeacherPortal()));

        hydrateSigmaGradesState(isTeacherPage ? 'teacher' : 'admin');

        const topbarLabel = document.getElementById('nav-context-text') || document.getElementById('header-brand-title');
        if (topbarLabel) topbarLabel.textContent = 'Grades';

        const state = window.sigmaGradesState;
        if (options.quarter) state.activeQuarter = options.quarter;
        if (options.strand) state.activeStrand = options.strand;
        if (options.section) state.selectedSection = options.section;
        if (options.subject) state.selectedSubject = options.subject;
        if (options.role) state.role = options.role;
        if (options.tab) state.activeTab = options.tab;

        state.isTeacherPage = isTeacherPage;
        if (options.role === 'admin' || !isTeacherPage) {
            state.role = 'admin';
            state.isTeacherPage = false;
        }

        if (state.isTeacherPage) {
            const currentTeacher = getEffectiveTeacher();
            state.selectedTeacher = currentTeacher;

            const assignedClasses = (typeof window.getTeacherAssignedSubjectsAndSections === 'function')
                ? window.getTeacherAssignedSubjectsAndSections(currentTeacher)
                : [];

            const cleanStr = s => String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
            const normClean = s => cleanStr(s).replace(/\s+/g, '');
            let matchedClass = null;
            if (state.selectedSubjectSection) {
                matchedClass = assignedClasses.find(c => {
                    const cSec = normClean(c.sectionName);
                    const sSec = normClean(state.selectedSubjectSection.sectionName);
                    const cSub = normClean(c.subject);
                    const sSub = normClean(state.selectedSubjectSection.subject);
                    const secMatch = (cSec === sSec || cSec.includes(sSec) || sSec.includes(cSec));
                    const subMatch = (cSub === sSub || cSub.includes(sSub) || sSub.includes(cSub));
                    return secMatch && subMatch;
                });
            }
            if (!matchedClass && (options.section || options.subject)) {
                const normOptSec = normClean(options.section || '');
                const normOptSub = normClean(options.subject || '');
                matchedClass = assignedClasses.find(c => {
                    const cSec = normClean(c.sectionName);
                    const cSub = normClean(c.subject);
                    const secMatch = !normOptSec || (cSec === normOptSec || cSec.includes(normOptSec) || normOptSec.includes(cSec));
                    const subMatch = !normOptSub || (cSub === normOptSub || cSub.includes(normOptSub) || normOptSub.includes(cSub));
                    return secMatch && subMatch;
                });
            }
            if (matchedClass) {
                state.selectedSubjectSection = matchedClass;
                state.selectedSection = matchedClass.sectionName;
                state.selectedSubject = matchedClass.subject;
            } else if (!state.selectedSubjectSection && assignedClasses.length > 0 && (options.section || options.subject)) {
                state.selectedSubjectSection = null;
                state.selectedSection = null;
                state.selectedSubject = null;
            }
        } else {
            // Admin portal validation
            if (state.selectedTeacher) {
                const assignedClasses = (typeof window.getTeacherAssignedSubjectsAndSections === 'function')
                    ? window.getTeacherAssignedSubjectsAndSections(state.selectedTeacher)
                    : [];
                const cleanStr = s => String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
                const belongsToTeacher = state.selectedSubjectSection && assignedClasses.some(c =>
                    cleanStr(c.sectionName) === cleanStr(state.selectedSubjectSection.sectionName) &&
                    cleanStr(c.subject) === cleanStr(state.selectedSubjectSection.subject)
                );
                if (!belongsToTeacher && state.selectedSubjectSection) {
                    state.selectedSubjectSection = null;
                    state.selectedSection = null;
                    state.selectedSubject = null;
                }
            }
        }

        const detailRequest = window._pendingGradebookDetail || (options.view ? {
            view: options.view,
            assessmentPage: options.assessmentPage,
            subject: options.subject || state.selectedSubject,
            section: options.section || state.selectedSection
        } : null);
        if (detailRequest && detailRequest.view && detailRequest.view !== 'overview') {
            const rawView = String(detailRequest.view).toLowerCase();
            const normalizedView = (rawView === 'ww' || rawView === 'ww-sub' || rawView.includes('written'))
                ? 'ww'
                : (rawView === 'pt' || rawView.includes('perf') || rawView.includes('performance'))
                    ? 'pt'
                    : (rawView === 'qa' || rawView.includes('quarter') || rawView.includes('exam'))
                        ? 'qa'
                        : rawView;
            const assignedForDetail = (typeof window.getTeacherAssignedSubjectsAndSections === 'function')
                ? window.getTeacherAssignedSubjectsAndSections(state.selectedTeacher || getEffectiveTeacher())
                : [];
            const cleanDetail = s => String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
            const detailMatch = assignedForDetail.find(c =>
                cleanDetail(c.sectionName) === cleanDetail(detailRequest.section) &&
                (cleanDetail(c.subject) === cleanDetail(detailRequest.subject) || cleanDetail(c.subject).includes(cleanDetail(detailRequest.subject)) || cleanDetail(detailRequest.subject).includes(cleanDetail(c.subject)))
            );
            if (detailMatch) {
                state.selectedSubjectSection = detailMatch;
                state.selectedSection = detailMatch.sectionName;
                state.selectedSubject = detailMatch.subject;
            } else if (detailRequest.subject || detailRequest.section) {
                state.selectedSubject = detailRequest.subject || state.selectedSubject;
                state.selectedSection = detailRequest.section || state.selectedSection;
                if (!state.selectedSubjectSection) {
                    state.selectedSubjectSection = {
                        subject: state.selectedSubject,
                        sectionName: state.selectedSection
                    };
                }
            }
            state.currentView = normalizedView;
            state.activeTab = 'gradebook';
            if (detailRequest.assessmentPage !== undefined && detailRequest.assessmentPage !== null) {
                state.assessmentPage = Number(detailRequest.assessmentPage) || 0;
            }
            if (typeof gradebookState !== 'undefined' && gradebookState) {
                gradebookState.currentView = state.currentView;
                gradebookState.assessmentPage = state.assessmentPage || 0;
                gradebookState.selectedSection = state.selectedSection || '';
                gradebookState.selectedSubject = state.selectedSubject || '';
            }
        }

        saveSigmaGradesState();

        container.innerHTML = `
            <div class="flex flex-col flex-1 w-full h-full bg-white min-h-0 border-b border-slate-200">
                
                <!-- Page Header (Exact Standard Parity with Sections & Subjects: px-10 py-8) -->
                <div class="px-10 py-8 flex justify-between items-center">
                    <div class="sigma-header-tab-group">
                        <button id="admin-grades-tab-analytics" type="button" onclick="window.switchAdminGradesTab('analytics')"
                            class="sigma-header-tab-btn ${state.activeTab === 'analytics' ? 'sigma-header-tab-btn--active' : 'sigma-header-tab-btn--inactive'}"
                            style="${state.activeTab === 'analytics' ? 'color: #000000;' : 'color: rgba(0, 0, 0, 0.30);'}">
                            Analytics
                        </button>
                        <span class="sigma-header-tab-divider"></span>
                        <button id="admin-grades-tab-gradebook" type="button" onclick="window.switchAdminGradesTab('gradebook')"
                            class="sigma-header-tab-btn ${state.activeTab === 'gradebook' ? 'sigma-header-tab-btn--active' : 'sigma-header-tab-btn--inactive'}"
                            style="${state.activeTab === 'gradebook' ? 'color: #000000;' : 'color: rgba(0, 0, 0, 0.30);'}">
                            Gradebooks
                        </button>
                    </div>
                </div>

                <!-- Shared Sub-Toolbar / Navbar (Subject & Section Picker + Quarters) -->
                <div id="admin-grades-shared-navbar" style="position: relative; z-index: 60; overflow: visible;" class="relative z-50 px-10 pb-6 border-b border-slate-200 flex items-center justify-between gap-4 font-['Inter'] bg-white">
                    <div class="flex items-center gap-3 flex-wrap">
                        
                        ${!isTeacherPage ? `
                        <!-- 1. TEACHER PANEL TRIGGER BUTTON (Opens Modal - Admin only) -->
                        <button id="admin-gradebook-teacher-picker-btn" type="button" onclick="window.openAdminTeacherModal()"
                            class="h-[50px] min-h-[50px] flex items-center gap-2.5 px-4 py-1.5 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 hover:border-slate-300 transition-all text-left cursor-pointer shadow-2xs group font-['Inter']"
                            title="Click to choose a teacher">
                            <div id="admin-gradebook-picker-avatar" class="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 transition-colors">
                                <i class="fa-solid fa-chalkboard-user text-xs" style="color: rgba(0, 0, 0, 0.45);"></i>
                            </div>
                            <span id="admin-gradebook-picker-teacher-label" class="text-[13px] font-semibold text-black-fade transition-colors font-['Inter']" style="color: rgba(0, 0, 0, 0.45);">Select Teacher</span>
                        </button>
                        ` : ''}

                        <!-- 2. SUBJECT & SECTION DROPDOWN (Visible when teacher is selected or in teacher portal) -->
                        <div id="admin-grades-subject-section-dropdown-wrapper" style="position: relative; z-index: 70; overflow: visible;" class="relative z-50 inline-block ${(state.selectedTeacher || isTeacherPage) ? '' : 'hidden'}">
                            <button id="admin-grades-subject-picker-btn" type="button" onclick="window.toggleAdminSubjectDropdown(event)"
                                class="h-[50px] min-h-[50px] min-w-[260px] flex items-center justify-between gap-3 px-4 py-1.5 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 hover:border-slate-300 transition-all text-left cursor-pointer shadow-2xs group font-['Inter']"
                                title="Choose Subject & Section">
                                <span id="admin-grades-subject-picker-label" class="${state.selectedSubjectSection ? 'flex flex-col items-start justify-center min-w-0 font-[\'Inter\'] text-left' : 'text-[13px] font-semibold text-black-fade transition-colors font-[\'Inter\']'}" style="${state.selectedSubjectSection ? 'color: #000000;' : 'color: rgba(0, 0, 0, 0.45);'}">
                                    ${state.selectedSubjectSection ? `
                                        <div class="flex items-center gap-1.5 max-w-full">
                                            <span class="font-bold text-black text-[13px] leading-tight truncate font-['Inter']">${escapeHtml(state.selectedSubjectSection.subject)}</span>
                                            ${state.selectedSubjectSection.role === 'Adviser' ? '<span class="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#FFD000] text-black border border-black/10 uppercase tracking-wider shrink-0 font-[\'Inter\'] ml-2">Adviser</span>' : ''}
                                        </div>
                                        <span class="text-[11px] font-medium leading-tight mt-0.5 truncate font-['Inter']" style="color: rgba(0, 0, 0, 0.45);">${escapeHtml(formatGradeSectionDisplay(state.selectedSubjectSection.sectionName, state.selectedSubjectSection.grade))}</span>
                                    ` : 'Select Subject and Section'}
                                </span>
                                <i class="fa-solid fa-chevron-down text-[10px] text-slate-400 ml-1 group-hover:text-black transition-colors"></i>
                            </button>

                            <!-- Dropdown Menu -->
                            <div id="admin-grades-subject-picker-menu" style="position: absolute; z-index: 200;" class="hidden absolute left-0 top-full mt-1.5 w-full min-w-[300px] max-w-[360px] bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 overflow-hidden font-['Inter']">
                                <!-- Populated dynamically by window.renderAdminSubjectDropdownMenu -->
                            </div>
                        </div>

                        <!-- 3. QUARTERS TABS (Visible when Subject & Section is selected) -->
                        <div id="admin-grades-quarters-wrapper" class="flex items-center gap-1.5 ${state.selectedSubjectSection ? '' : 'hidden'}">
                            <!-- Populated dynamically by window.renderAdminQuartersTabs -->
                        </div>

                    </div>

                    <!-- Right Side: Assessment Weights & Combined Transfer / View Grade Card Links (Gradebooks Only) -->
                    <div id="admin-gradebook-action-buttons" 
                         class="${state.activeTab === 'gradebook' && state.selectedSubjectSection ? '' : 'hidden'} items-center gap-4 font-['Inter'] shrink-0" 
                         style="${state.activeTab === 'gradebook' && state.selectedSubjectSection ? 'display: flex !important;' : 'display: none !important;'}">
                        ${!isTeacherPage ? `
                        <button id="admin-btn-assessment-weights" type="button" onclick="window.openAdminGradebookWeightModal()"
                            class="inline-flex items-center gap-1.5 text-xs font-semibold text-black hover:text-[#FFD000] transition-colors cursor-pointer bg-transparent border-0 p-0 group shrink-0"
                            title="Assessment Weights">
                            <i class="fa-solid fa-sliders text-[#15803d] text-xs group-hover:text-[#FFD000] transition-colors"></i>
                            <span class="group-hover:text-[#FFD000] transition-colors">Assessment Weights</span>
                        </button>

                        <span class="text-slate-300 select-none font-light text-xs">|</span>
                        ` : ''}

                        <div class="gb-status-key" aria-label="Score status key">
                            <span><i class="gb-key-swatch gb-key-missing"></i>Missing</span>
                            <span><i class="gb-key-swatch gb-key-absent"></i>Absent</span>
                            <span><i class="gb-key-swatch gb-key-incomplete"></i>Incomplete</span>
                            <span><i class="gb-key-swatch gb-key-excuse"></i>Excuse</span>
                        </div>
                        <button id="admin-btn-view-pdf" type="button" onclick="window.viewAdminGradebookPDF()"
                            class="inline-flex items-center gap-1.5 text-xs font-semibold text-black hover:text-[#FFD000] transition-colors cursor-pointer bg-transparent border-0 p-0 group shrink-0"
                            title="Transfer & View Report Card (PDF / Excel)">
                            <i class="fa-solid fa-file-invoice text-[#15803d] text-xs group-hover:text-[#FFD000] transition-colors"></i>
                            <span class="group-hover:text-[#FFD000] transition-colors">Transfer / View (PDF & Excel)</span>
                        </button>
                    </div>
                </div>

                <!-- ═══════════════════════════════════════════════════════════ -->
                <!-- VIEW 1: ANALYTICS CONTENT -->
                <!-- ═══════════════════════════════════════════════════════════ -->
                <div id="admin-grades-analytics-view" class="${state.activeTab === 'analytics' ? '' : 'hidden'} flex-1 flex flex-col w-full h-full min-h-0 bg-white overflow-y-auto font-['Inter']">
                    <div id="admin-analytics-workspace-content" class="flex-1 flex flex-col w-full h-full min-h-0 p-0 bg-white font-['Inter']">
                        <!-- Rendered via window.renderAdminAnalyticsWorkspace() -->
                    </div>
                </div>

                <!-- ═══════════════════════════════════════════════════════════ -->
                <!-- VIEW 2: GRADEBOOK WORKSTATION -->
                <!-- ═══════════════════════════════════════════════════════════ -->
                <div id="admin-grades-gradebook-view" class="${state.activeTab === 'gradebook' ? '' : 'hidden'} flex-1 flex flex-col w-full h-full min-h-0 bg-white overflow-hidden font-['Inter']">
                    <div id="admin-gradebook-workspace-content" class="flex-1 flex flex-col w-full h-full min-h-0 p-0 overflow-hidden bg-white font-['Inter']">
                        <!-- Rendered via window.renderAdminGradebookWorkspace() -->
                    </div>
                </div>
            </div>

            ${!isTeacherPage ? `
            <!-- ═══════════════════════════════════════════════════════════ -->
            <!-- ADMIN TEACHER SELECTION MODAL -->
            <!-- ═══════════════════════════════════════════════════════════ -->
            <div id="admin-teacher-selection-modal" class="hidden curriculum-hub-overlay font-['Inter']" 
                 style="display: none; position: fixed !important; inset: 0 !important; z-index: 99999 !important; background: rgba(15, 23, 42, 0.50) !important; backdrop-filter: blur(4px) !important; -webkit-backdrop-filter: blur(4px) !important; align-items: center !important; justify-content: center !important; padding: 1.25rem !important;" 
                 onclick="if(event.target === this) window.closeAdminTeacherModal()">
                <div class="curriculum-hub-panel curriculum-release-panel-fixed w-full !max-w-[860px] flex flex-col overflow-hidden bg-white shadow-2xl rounded-[24px] border border-black/10"
                     style="height: 740px; min-height: min(740px, calc(100vh - 40px)); max-height: calc(100vh - 40px); max-width: 860px; box-sizing: border-box;"
                     onclick="event.stopPropagation()">
                    
                    <!-- Header -->
                    <div class="px-6 sm:px-8 py-5 border-b border-slate-100 flex items-center justify-between shrink-0 font-['Inter']">
                        <div class="flex items-center gap-3">
                            <div>
                                <h2 class="text-xl font-bold text-black font-['Inter'] tracking-tight">Select Faculty / Teacher</h2>
                                <p class="text-xs font-medium text-black-fade font-['Inter'] mt-0.5">Choose a faculty member to inspect and manage their Senior High School gradebooks</p>
                            </div>
                        </div>
                    </div>

                    <!-- Main Content (Scrollable) -->
                    <div class="p-6 sm:p-8 py-6 overflow-y-auto flex-1 space-y-4 font-['Inter']">
                        <!-- Section Title + Search Row -->
                        <div class="space-y-3 font-['Inter']">
                            <div class="flex items-center justify-between pb-2 border-b-2 border-black transition-colors">
                                <div>
                                    <h3 class="text-base sm:text-[17px] font-bold text-black font-['Inter'] tracking-tight">Faculty Directory</h3>
                                    <p class="text-xs font-normal mt-0.5" style="color: rgba(0,0,0,0.45);">Search and select a teacher from the active school roster</p>
                                </div>
                            </div>

                            <!-- Search Input + Shared Green Search Button -->
                            <div class="flex items-center gap-3">
                                <div class="relative flex-1">
                                    <i class="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-black text-sm pointer-events-none z-10"></i>
                                    <input type="text" id="admin-teacher-search-input" aria-label="Search faculty" placeholder="Search teacher by name or ID..." maxlength="50"
                                        autocomplete="off"
                                        spellcheck="false"
                                        style="padding-left: 44px !important;"
                                        oninput="window.sanitizeAdminTeacherSearchInput(this)"
                                        onkeydown="if(event.key==='Enter'){event.preventDefault(); window.executeAdminTeacherModalSearch();}"
                                        class="sigma-input font-['Inter']">
                                </div>
                                <button type="button" id="admin-teacher-search-btn" onclick="window.executeAdminTeacherModalSearch()"
                                    class="sigma-btn sigma-btn-primary sigma-btn-md min-w-[100px] shrink-0 flex items-center justify-center gap-2 cursor-pointer font-['Inter']">
                                    <span>Search</span>
                                </button>
                            </div>
                        </div>

                        <!-- Teachers List Container -->
                        <div id="admin-teacher-modal-list" class="pt-1 font-['Inter']">
                            <!-- Rendered by window.renderAdminTeacherModalList -->
                        </div>
                    </div>

                    <!-- Footer -->
                    <div class="px-6 sm:px-8 py-5 border-t border-slate-100 bg-white flex items-center justify-end gap-3 shrink-0 font-['Inter']">
                        <button type="button" onclick="window.closeAdminTeacherModal()"
                            class="sigma-btn sigma-btn-white sigma-btn-md cursor-pointer font-['Inter']">
                            Close
                        </button>
                        <button type="button" id="admin-teacher-modal-select-btn" onclick="window.confirmAdminTeacherSelection()"
                            class="sigma-btn sigma-btn-primary sigma-btn-md cursor-pointer font-['Inter'] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                            Select
                        </button>
                    </div>

                </div>
            </div>
            ` : ''}
        `;

        window.updateAdminSharedNavbarUI();
        if (state.activeTab === 'gradebook') {
            window.renderAdminGradebookWorkspace();
        } else {
            window.renderAdminAnalyticsWorkspace();
        }
    };

    window.renderTeacherGradesView = function (targetContainerId = 'section-grades', options = {}) {
        return window.renderSigmaGradesView(targetContainerId, { ...options, isTeacherPage: true, role: 'teacher' });
    };

    window.renderSigmaGradebookWorkstation = window.renderSigmaGradesView;
    window.switchTeacherGradesTab = window.switchAdminGradesTab;

    // Expose globally
    window.renderAdminPocketCards = renderAdminPocketCards;
    window.renderAdminMetrics = renderAdminPocketCards;
    window.initAllPocketCardRails = initAllPocketCardRails;
    window.initAllSigmaAnalyticsRails = initAllPocketCardRails;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAllPocketCardRails);
    } else {
        initAllPocketCardRails();
    }
})();

