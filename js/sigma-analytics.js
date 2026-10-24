/**
 * SIGMA ELMS - Unified SIGMA Analytics & Admin Metrics Template Engine
 * Standardized across Admin, Teacher, and Student portals.
 * 
 * Features:
 *   1. Admin system metrics catalog with four default cards.
 *   2. Dynamic JSON-driven templates for all cards.
 *   3. Zero-State Fallback: Displays a clean standby state when metricsData is empty [].
 *   4. Unified 4-Card Initial Limit with inside-container "More" dynamic expansion across all portals.
 *   5. Interactive "Configure Metrics" Modal allowing Admin to toggle/customize which cards appear.
 *   6. Per-administrator card selection and pin-to-top preferences on this browser.
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
            status: { label: 'Not monitored', color: '#64748b' },
            uptime: '—',
            message: 'Uptime monitoring is not connected.',
            latency: { label: 'Not measured', percent: '0%', color: '#64748b' }
        },
        {
            id: 'metric-ai',
            type: 'interactive-switcher',
            title: 'SIGMA AI Usage',
            desc: 'Recorded Gemini and Groq AI activity',
            status: { label: 'Loading', icon: 'fa-brain', color: '#15803d' },
            models: ['Gemini', 'Groq'],
            periods: ['Daily', 'Monthly'],
            activeModel: 'gemini',
            activePeriod: 'daily',
            periodDesc: 'Loading activity…',
            requestsValue: '0',
            quotaLabel: 'Daily Tokens',
            quotaPercent: '0 / 1M'
        },
        {
            id: 'metric-storage',
            type: 'resource-capacity',
            title: 'Storage Usage',
            desc: 'Live ELMS folder storage',
            status: { label: 'Checking', icon: 'fa-brands fa-google-drive', color: '#15803d' },
            usedValue: '0',
            unit: 'B',
            subtitle: 'Google Drive',
            capacityLabel: 'Checking…',
            capacityPercent: '0%',
            barColor: 'bg-[#15803d]'
        },
        {
            id: 'metric-security',
            type: 'security-guard',
            title: 'Security & Auth Guard',
            desc: 'Threat monitoring and login security',
            status: { label: 'Secure', icon: 'fa-shield-halved', color: '#15803d' },
            threatsCount: '0',
            threatsLabel: 'Threats Blocked',
            twoFactorRate: '100% 2FA Active · reCAPTCHA v3',
            failedAttempts: '0 Failed Today'
        },
        {
            id: 'metric-database',
            type: 'db-load',
            title: 'Database Load',
            desc: 'Query latency and database connection pool',
            status: { label: 'Not monitored', icon: 'fa-database', color: '#64748b' },
            queryLatency: '—',
            cacheHitRate: 'Not measured',
            activeConnections: 'Not measured'
        },
        {
            id: 'metric-grading',
            type: 'grading-queue',
            title: 'Grading Pipeline',
            desc: 'Student assignment submissions and teacher queue',
            status: { label: 'Up to Date', icon: 'fa-file-signature', color: '#15803d' },
            submittedCount: '0',
            submittedLabel: 'Submissions',
            pendingCount: 'Queue Clear',
            progressPercent: '100%'
        }
    ];

    // Permissions limit available cards; each administrator chooses which to show.
    const DEFAULT_ACTIVE_METRIC_IDS = ['metric-health', 'metric-ai', 'metric-storage', 'metric-security'];
    const METRIC_PERMISSION_KEYS = {
        'metric-health': 'metricHealth', 'metric-ai': 'metricAi',
        'metric-storage': 'metricStorage', 'metric-security': 'metricSecurity',
        'metric-database': 'metricDatabase', 'metric-grading': 'metricGrading'
    };
    function metricPreferenceContext() {
        let user = {};
        try { user = JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}'); } catch (_) {}
        const id = String(user.uid || user.id || '').trim().toLowerCase();
        const users = getStoredJson('sigma-admin-users', []);
        const storedUser = Array.isArray(users) ? users.find(item => String(item.uid || item.id || '').trim().toLowerCase() === id) : null;
        const permissions = storedUser?.permissions || user.permissions || {};
        const allowed = permissions.metricsMain === false ? [] : ADMIN_METRICS_CATALOG
            .filter(metric => permissions[METRIC_PERMISSION_KEYS[metric.id]] !== false).map(metric => metric.id);
        return { key: id ? `${STORAGE_KEY_ACTIVE_METRICS}:${id}` : null, allowed };
    }
    function getActiveMetricIds() {
        const {key, allowed} = metricPreferenceContext();
        try {
            const raw = key ? localStorage.getItem(key) : null;
            if (raw !== null) {
                const ids = JSON.parse(raw);
                if (Array.isArray(ids)) return [...new Set(ids)].filter(id => allowed.includes(id));
            }
        } catch (_) {}
        return DEFAULT_ACTIVE_METRIC_IDS.filter(id => allowed.includes(id));
    }
    function saveActiveMetricIds(ids) {
        const {key, allowed} = metricPreferenceContext();
        if (!key) return false;
        try {
            localStorage.setItem(key, JSON.stringify([...new Set(ids)].filter(id => allowed.includes(id))));
            return true;
        } catch (error) {
            console.error('Failed to save active metrics', error);
            return false;
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
                    SIGMA AI tracks your performance, quizzes, and coursework. SIGMA AI Insights will automatically appear here once grades and assessments are recorded.
                </p>
            </div>
        `;
    }

    function toTitleCase(str) {
        if (!str) return '';
        let result = String(str).toLowerCase().replace(/(?:^|\s|\/|-)\w/g, match => match.toUpperCase());
        result = result.replace(/\bSigma Ai\b/gi, 'SIGMA AI').replace(/\bAi\b/g, 'AI').replace(/\bElms\b/gi, 'ELMS');
        return result;
    }

    function renderMetricRefreshHtml(metricId, title) {
        const id = metricId === 'metric-ai' ? ' id="ai-usage-retry"' : '';
        return `<button type="button"${id} class="sigma-metric-refresh" data-refresh-metric="${escapeHtml(metricId)}" aria-label="Refresh ${escapeHtml(title)}" title="Refresh ${escapeHtml(title)}" onclick="event.stopPropagation(); window.refreshMetricPanel('${metricId}', this)"><i class="fa-solid fa-rotate-right" aria-hidden="true"></i></button>`;
    }
    window.refreshMetricPanel = async function (id, button) {
        if (button?.disabled) return;
        if (button) { button.disabled = true; button.setAttribute('aria-busy', 'true'); button.querySelector('i')?.classList.add('fa-spin'); }
        try {
            if (id === 'metric-health' || id === 'metric-database') await window.refreshLiveSystemMetrics?.();
            else if (id === 'metric-ai') await window.SigmaAiDatabase?.reloadLogs();
            else if (id === 'metric-storage') await window.loadGoogleDriveFolderUsage?.();
            else if (id === 'metric-security') { await window.SigmaAuthenticationLogs?.refresh(); window.syncSecurityMetric?.(); }
            else if (id === 'metric-grading') window.syncGradingMetric?.();
        } catch (error) {
            window.showToastNotification?.('Unable to refresh this metric. Please try again.', 'error');
        } finally {
            if (button) { button.disabled = false; button.setAttribute('aria-busy', 'false'); button.querySelector('i')?.classList.remove('fa-spin'); }
        }
    };

    function renderMetricHeaderHtml(title, statusLabel, iconName = '', labelId = '', indicatorId = '', metricId = '') {
        metricId ||= ({'system-status-label':'metric-health','ai-status-label':'metric-ai','storage-status-label':'metric-storage','security-status-label':'metric-security','database-status-label':'metric-database','grading-status-label':'metric-grading'})[labelId] || '';
        const titleFormatted = toTitleCase(title);
        const statusFormatted = toTitleCase(statusLabel);
        const usageAction = labelId === 'ai-status-label'
            ? "window.openAiSettingsPage?.(); window.selectAiSettingsTab?.('usage')"
            : labelId === 'storage-status-label'
                ? "window.openGoogleDriveSettingsPage?.(); window.selectGoogleDriveSettingsTab?.('usage')"
                : labelId === 'security-status-label'
                    ? "window.switchTab?.('nav-audit-auth', true)"
                    : labelId === 'grading-status-label'
                        ? "window.switchTab?.('nav-grades', true)" : '';
        const isFullFaClass = iconName && (iconName.includes('fa-brands') || iconName.includes('fa-regular') || iconName.includes('fa-solid'));
        const iconClass = isFullFaClass ? iconName : `fa-solid ${iconName}`;
        const indicatorHtml = iconName
            ? `<i ${indicatorId ? `id="${indicatorId}"` : ''} class="${iconClass} sigma-metric-status-icon pocket-metric-status-icon text-[#15803d]"></i>`
            : `<div ${indicatorId ? `id="${indicatorId}"` : ''} class="sigma-metric-status-dot pocket-metric-status-dot bg-[#15803d] animate-pulse"></div>`;

        return `
            <div class="sigma-metric-header pocket-metric-header flex items-center justify-between w-full">
                <div class="sigma-metric-title-group">
                    <h4 class="sigma-metric-title pocket-metric-title text-black">${usageAction ? `<button type="button" class="sigma-usage-title-link" onclick="event.stopPropagation(); ${usageAction}">${titleFormatted}</button>` : titleFormatted}</h4>
                    ${renderMetricRefreshHtml(metricId, titleFormatted)}
                </div>
                <div class="sigma-metric-status pocket-metric-status ml-auto">
                    <span ${labelId ? `id="${labelId}"` : ''} class="sigma-metric-status-label pocket-metric-status-label text-[#15803d]">${statusFormatted}</span>
                    ${indicatorHtml}
                </div>
            </div>
        `;
    }

    let liveMetrics = null;
    let liveMetricsError = '';
    let liveMetricsPending = false;
    function liveMetricHtml(id) {
        const health = id === 'metric-health';
        const title = health ? 'System Health' : 'Database Load';
        const header = renderMetricHeaderHtml(title, liveMetrics ? (health ? 'Responding' : 'Connected') : liveMetricsPending ? 'Checking' : 'Unavailable', health ? 'fa-circle' : 'fa-database', '', '', id);
        if (!liveMetrics) {
            const loading = liveMetricsPending;
            if (loading) return header + window.SigmaContentLoading.html({compact:true, label:'Loading system measurements'});
            const heading = loading ? 'Loading measurements' : health ? 'No health data yet' : 'No database metrics yet';
            const message = loading ? 'Please wait while we check the server.'
                : liveMetricsError ? 'We couldn’t retrieve the latest measurements. Please try again.'
                : 'Live measurements will appear here when available.';
            return header + `<div class="flex flex-col items-center justify-center text-center gap-3 py-6" role="status" aria-live="polite" aria-busy="${loading}">
                <div class="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center"><i class="fa-solid ${loading ? 'fa-spinner fa-spin' : health ? 'fa-heart-pulse' : 'fa-database'} text-lg text-black-fade" aria-hidden="true"></i></div>
                <p class="text-sm font-semibold text-black">${heading}</p>
                <p class="text-xs text-black-fade leading-relaxed">${message}</p>
            </div>`;
        }
        const data = liveMetrics;
        const mainValue = health ? data.roundTripMs : data.database.queryMs;
        const mainLabel = health ? 'API response time' : 'Database query time';
        const note = health ? 'Time for this browser to request and receive the API response. This is a current check, not uptime history.' : 'Elapsed time for SELECT 1. Table storage includes allocated data and indexes and is approximate; cache and pool statistics are not monitored.';
        const rows = health
            ? [['PHP processing', data.application.processingMs + ' ms'], ['Database check', 'Passed']]
            : [['Tables', data.database.tables], ['Table storage', (data.database.allocatedBytes / 1048576).toFixed(2) + ' MB']];
        return header + `<div class="metric-body-centered flex-1 flex flex-col items-center justify-center text-center gap-1.5 py-4" title="${escapeHtml(note)}">
            <div class="flex items-baseline justify-center gap-1.5"><strong class="text-2xl font-black text-black leading-none tracking-tight">${escapeHtml(String(mainValue))}</strong><span class="text-xs text-black-fade">ms</span></div>
            <p class="text-xs text-black-fade">${mainLabel}</p>
        </div><div class="space-y-2 border-t border-slate-100 pt-3">`
            + rows.map(([label,value]) => `<div class="flex justify-between gap-3 text-xs"><span class="text-black">${label}</span><strong class="text-black">${escapeHtml(String(value))}</strong></div>`).join('')
            + `</div><div class="flex items-center justify-between gap-2 mt-3 text-black-fade" style="font-size:10px"><span title="${escapeHtml(note)}">Live check · ${escapeHtml(new Date(data.checkedAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}))}</span></div>`;

    }
    function paintLiveMetrics() {
        document.querySelectorAll('[data-live-system-metric]').forEach(node => {
            node.innerHTML = liveMetricHtml(node.dataset.liveSystemMetric);
        });
    }
    window.refreshLiveSystemMetrics = async function () {
        if (liveMetricsPending || !document.getElementById('dashboard-metrics-container') || !window.SigmaDatabase?.currentUser()?.id) return;
        liveMetricsPending = true;
        if (!liveMetrics) paintLiveMetrics();
        try {
            const started = performance.now();
            const result = await window.SigmaDatabase.request('system_metrics');
            liveMetrics = { ...result, roundTripMs: Math.round(performance.now() - started) };
            liveMetricsError = '';
        } catch (error) {
            liveMetrics = null;
            liveMetricsError = error.message || 'Measurements are unavailable. Retry when connected.';
        } finally {
            liveMetricsPending = false;
            paintLiveMetrics();
        }
    };
    window.addEventListener('sigma:database-session-ready', () => window.refreshLiveSystemMetrics());

    function renderMetricCardHtml(item) {
        if (!item) return '';

        if (['metric-health', 'metric-database'].includes(item.id)) {
            return `<div data-id="${item.id}" class="sigma-card pocket-card p-4 flex flex-col justify-between">
                <div data-live-system-metric="${item.id}" class="flex flex-col h-full">${liveMetricHtml(item.id)}</div>
            </div>`;
        }

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
                            <span class="text-[11px] font-semibold text-black">Response Time</span>
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
                    <div class="sigma-ai-usage-controls">
                        <!-- Model Switcher -->
                        <div class="sigma-ai-provider-switch">
                            <button id="btn-ai-gemini" type="button" class="flex-1 py-1 rounded-lg text-[10.5px] font-bold transition-all bg-white text-black shadow-sm cursor-pointer" onclick="window.setAiModel && window.setAiModel('gemini')">Gemini</button>
                            <button id="btn-ai-groq" type="button" class="flex-1 py-1 rounded-lg text-[10.5px] font-bold transition-all text-black-fade cursor-pointer" onclick="window.setAiModel && window.setAiModel('groq')">Groq</button>
                        </div>
                        <div class="sigma-ai-period-control">
                        <select id="ai-usage-period" aria-label="AI usage period" class="min-w-0 w-full bg-slate-100 px-2 py-1 rounded-xl border border-slate-200 text-[10.5px] font-bold text-black cursor-pointer" onchange="window.setAiPeriod && window.setAiPeriod(this.value)">
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                        </select>
                        <svg class="sigma-ai-period-chevron" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4 6 4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        </div>
                    </div>

                    <div class="metric-body-centered flex-1 flex items-center justify-center text-center py-2">
                        <div class="flex items-baseline justify-center gap-1.5">
                            <span id="ai-requests-value" class="text-2xl font-black text-black leading-none tracking-tight">${item.requestsValue}</span>
                            <span id="ai-requests-label" class="text-[11px] font-semibold text-black">Requests today</span>
                        </div>
                    </div>

                    <div class="space-y-1.5 pt-2 border-t border-slate-100 flex-shrink-0">
                        <div class="flex items-center justify-between">
                            <span id="ai-quota-label" class="text-[11px] font-semibold text-black">${item.quotaLabel}</span>
                            <span id="ai-usage-percent" class="text-[11px] font-bold text-black">${item.quotaPercent}</span>
                        </div>
                        <div id="ai-capacity-track" class="h-1.5 bg-slate-100 rounded-full overflow-hidden"><div id="ai-usage-bar" class="w-[0%] h-full bg-[#15803d] rounded-full transition-all duration-500"></div></div>
                        <p id="ai-usage-scope" class="text-[10px] text-black-fade"></p>
                    </div>
                </div>
            `;
        }

        if (item.type === 'resource-capacity') {
            return `
                <div data-id="${item.id}" class="sigma-card pocket-card p-4 flex flex-col justify-between cursor-pointer hover:border-slate-300 transition-all group" onclick="window.openGoogleDriveSettingsPage?.(); window.selectGoogleDriveSettingsTab?.('usage')" role="button" tabindex="0" title="View ELMS folder usage">
                    ${renderMetricHeaderHtml(item.title, item.status.label, item.status.icon || 'fa-brands fa-google-drive', 'storage-status-label', 'storage-status-icon')}
                    <div class="metric-body-centered flex-1 flex items-center justify-center text-center gap-3 py-1" style="flex-direction:row; gap:12px;">
                        <p id="storage-subtitle" class="text-[11.5px] font-medium leading-snug flex items-center justify-center gap-1" style="color:#000;">
                            <i class="fa-brands fa-google-drive" aria-hidden="true" style="color:#000;"></i>
                            <span data-storage-provider-label>${item.subtitle}</span>
                            <i class="fa-solid fa-arrow-up-right-from-square text-[9.5px]" aria-hidden="true" style="color:#000;"></i>
                        </p>
                        <div class="flex items-baseline justify-center gap-1.5">
                            <span id="storage-used-value" class="text-2xl font-black text-black leading-none tracking-tight">${item.usedValue}</span>
                            <span id="storage-unit-label" class="text-[11px] font-semibold text-black">${item.unit}</span>
                        </div>
                    </div>
                    <div class="space-y-1.5 pt-2 border-t border-slate-100 flex-shrink-0">
                        <div class="flex items-center justify-between">
                            <span class="text-[11px] font-semibold text-black">Account Capacity</span>
                            <span id="storage-percent-label" class="text-[11px] font-bold text-black">${item.capacityLabel}</span>
                        </div>
                        <div id="storage-capacity-track" class="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div id="storage-usage-bar" class="w-[0%] h-full bg-[#15803d] rounded-full transition-all duration-500"></div>
                        </div>
                    </div>
                </div>
            `;
        }

        if (item.type === 'security-guard') {
            return `
                <div data-id="${item.id}" class="sigma-card pocket-card p-4 flex flex-col justify-between cursor-pointer hover:border-slate-300 transition-all group" onclick="window.switchTab?.('nav-audit-auth', true)" role="button" tabindex="0" title="View Authentication Logs">
                    ${renderMetricHeaderHtml(item.title, item.status.label, item.status.icon || 'fa-shield-halved', 'security-status-label', 'security-status-icon')}
                    <div class="metric-body-centered flex-1 flex flex-col items-center justify-center text-center gap-1.5 py-1">
                        <div class="flex items-baseline justify-center gap-1.5">
                            <span id="security-threats-count" class="text-2xl font-black text-black leading-none tracking-tight">${item.threatsCount}</span>
                            <span class="text-[11px] font-semibold text-black">${item.threatsLabel}</span>
                        </div>
                        <p id="security-2fa-status" class="text-[11.5px] font-medium text-black-fade leading-snug">
                            ${item.twoFactorRate}
                        </p>
                    </div>
                    <div class="pt-2 border-t border-slate-100 flex-shrink-0">
                        <div class="flex items-center justify-between min-h-[22px]">
                            <span class="text-[11px] font-semibold text-black">Login Security</span>
                            <span id="security-failed-attempts" class="text-[11px] font-bold text-black">${item.failedAttempts}</span>
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
                            <span class="text-[11px] font-semibold text-black">Connection Pool</span>
                            <span class="text-[11px] font-bold text-[#15803d]">${item.activeConnections}</span>
                        </div>
                    </div>
                </div>
            `;
        }

        if (item.type === 'grading-queue') {
            return `
                <div data-id="${item.id}" class="sigma-card pocket-card p-4 flex flex-col justify-between cursor-pointer hover:border-slate-300 transition-all group" onclick="window.switchTab?.('nav-grades', true)" role="button" tabindex="0" title="View Gradebook">
                    ${renderMetricHeaderHtml(item.title, item.status.label, item.status.icon || 'fa-file-signature', 'grading-status-label', 'grading-status-icon')}
                    <div class="metric-body-centered flex-1 flex flex-col items-center justify-center text-center gap-1.5 py-1">
                        <div class="flex items-baseline justify-center gap-1.5">
                            <span id="grading-submitted-count" class="text-2xl font-black text-black leading-none tracking-tight">${item.submittedCount}</span>
                            <span class="text-[11px] font-semibold text-black">${item.submittedLabel}</span>
                        </div>
                        <p id="grading-pending-count" class="text-[11.5px] font-medium text-black-fade leading-snug">
                            ${item.pendingCount}
                        </p>
                    </div>
                    <div class="space-y-1.5 pt-2 border-t border-slate-100 flex-shrink-0">
                        <div class="flex items-center justify-between">
                            <span class="text-[11px] font-semibold text-black">Grading Pace</span>
                            <span id="grading-pace-percent" class="text-[11px] font-bold text-[#15803d]">${item.progressPercent}</span>
                        </div>
                        <div class="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div id="grading-pace-bar" class="w-[${item.progressPercent}] h-full bg-[#15803d] rounded-full transition-all duration-500"></div>
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
        window.refreshLiveSystemMetrics();
        window.updateAiDisplay?.();
        window.syncGoogleDriveStorageMetric?.();
        window.syncSecurityMetric?.();
        window.syncGradingMetric?.();
        initPocketCardsContainer(container, activeItems);
    }

    function wireInteractiveSwitchers() {
        window.syncGoogleDriveStorageMetric?.();
        const geminiBtn = document.getElementById('btn-ai-gemini');
        const groqBtn = document.getElementById('btn-ai-groq');
        if (geminiBtn && typeof window.setAiModel === 'function') {
            geminiBtn.onclick = () => window.setAiModel('gemini');
        }
        if (groqBtn && typeof window.setAiModel === 'function') {
            groqBtn.onclick = () => window.setAiModel('groq');
        }

        const periodSelect = document.getElementById('ai-usage-period');
        if (periodSelect) periodSelect.onchange = () => window.setAiPeriod?.(periodSelect.value);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // 3. CONFIGURE METRICS MODAL
    // ═════════════════════════════════════════════════════════════════════════
    function createMetricsConfigModal() {
        document.getElementById('metrics-config-modal-backdrop')?.remove();
        const backdrop = document.createElement('div');
        backdrop.id = 'metrics-config-modal-backdrop';
        backdrop.className = 'metrics-config-backdrop';
        backdrop.innerHTML = `
            <div class="metrics-config-modal relative" role="dialog" aria-modal="true" aria-labelledby="metrics-config-title">
                <div class="px-6 sm:px-8 py-4 sm:py-5 border-b border-slate-100 shrink-0">
                    <h2 id="metrics-config-title" class="text-base sm:text-xl font-bold text-black">Configure System Metrics</h2>
                    <p class="text-xs text-black-fade mt-1">Choose the cards shown on your dashboard.</p>
                </div>
                <div class="p-6 sm:p-8 overflow-y-auto flex-1 space-y-3 custom-scrollbar" id="metrics-config-options-list" style="flex:1 1 0%;min-height:0"></div>
                <div class="px-6 sm:px-8 pb-3 text-xs text-black-fade" id="metrics-config-save-status" role="status" aria-live="polite">Changes save automatically on this browser.</div>
                <div class="sigma-modal-footer flex items-center justify-between shrink-0 bg-slate-50 border-t border-slate-100">
                    <button type="button" id="btn-reset-metrics-config" class="sigma-btn sigma-btn-white sigma-modal-btn">Reset to Default</button>
                    <button type="button" id="btn-done-metrics-config" class="sigma-btn sigma-btn-primary sigma-modal-btn">Done</button>
                </div>
            </div>`;
        document.body.appendChild(backdrop);
        const close = () => closeMetricsConfigModal();
        backdrop.addEventListener('click', event => { if (event.target === backdrop) close(); });
        backdrop.addEventListener('keydown', event => {
            if (event.key === 'Escape') { event.preventDefault(); close(); }
        });
        backdrop.querySelector('#btn-done-metrics-config').addEventListener('click', close);
        backdrop.querySelector('#btn-reset-metrics-config').addEventListener('click', () => {
            applyMetricSelection(DEFAULT_ACTIVE_METRIC_IDS);
        });
        return backdrop;
    }
    function applyMetricSelection(ids) {
        const status = document.getElementById('metrics-config-save-status');
        if (!saveActiveMetricIds(ids)) {
            if (status) status.textContent = 'Could not save your selection. Please try again.';
            populateConfigOptions();
            return;
        }
        renderAdminPocketCards();
        populateConfigOptions();
        if (status) status.textContent = 'Saved automatically on this browser.';
    }
    function populateConfigOptions() {
        const list = document.getElementById('metrics-config-options-list');
        if (!list) return;
        const active = getActiveMetricIds();
        const {allowed} = metricPreferenceContext();
        list.innerHTML = ADMIN_METRICS_CATALOG.map(metric => {
            const checked = active.includes(metric.id);
            const enabled = allowed.includes(metric.id);
            return `<label class="metrics-config-option ${checked ? 'is-active' : ''}${enabled ? '' : ' opacity-50'}">
                <div class="pr-4"><p class="text-sm font-bold text-black">${metric.title}</p>
                    <p class="text-xs text-black-fade mt-0.5">${enabled ? metric.desc : 'Unavailable with your current permissions.'}</p></div>
                <div class="metrics-toggle-switch shrink-0"><input type="checkbox" data-metric-id="${metric.id}" aria-label="Show ${metric.title}" ${checked ? 'checked' : ''} ${enabled ? '' : 'disabled'}><span class="metrics-toggle-slider"></span></div>
            </label>`;
        }).join('');
        list.querySelectorAll('input[type="checkbox"]').forEach(input => {
            input.addEventListener('change', () => {
                const id = input.dataset.metricId;
                const selected = Array.from(list.querySelectorAll('input:checked')).map(item => item.dataset.metricId);
                applyMetricSelection(selected);
                // Preserve keyboard focus after rebuilding the toggle rows.
                list.querySelector(`[data-metric-id="${id}"]`)?.focus({preventScroll:true});
            });
        });
    }

    function openMetricsConfigModal() {
        createMetricsConfigModal();
        populateConfigOptions();
        const backdrop = document.getElementById('metrics-config-modal-backdrop');
        if (backdrop) {
            backdrop.classList.add('is-open');
            backdrop.querySelector('input:not(:disabled), #btn-done-metrics-config')?.focus({preventScroll:true});
        }
    }

    function closeMetricsConfigModal() {
        const backdrop = document.getElementById('metrics-config-modal-backdrop');
        if (backdrop) backdrop.classList.remove('is-open');
        document.querySelector('#dashboard-metrics-container')?.previousElementSibling?.querySelector('button')?.focus({preventScroll:true});
    }

    window.addEventListener('storage', event => {
        if (event.key === metricPreferenceContext().key && document.getElementById('dashboard-metrics-container')) {
            renderAdminPocketCards();
            populateConfigOptions();
        }
    });

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
        if (location.pathname.toLowerCase().includes('teacher')) {
            return window.SigmaTeacherAnalytics?.getCards() || [];
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
                window.SigmaAnnouncements.showToast('Cleared SIGMA AI Insights to empty state.', 'info');
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
        const compactInsight = data.datePlacement === 'footer';
        return `
            <div data-id="${data.id}" class="sigma-card pocket-card sigma-card--student pocket-card--student${compactInsight ? ' sigma-card--insight' : ''}">
                <!-- Card Header: Category Icon + Concern Title (Title Case) + Date + Pin Button -->
                <div class="bg-[#15803d] px-4 py-2 flex items-center justify-between flex-shrink-0 h-[38px] leading-none${compactInsight ? ' sigma-insight-header' : ''}">
                    ${compactInsight ? `<h4 class="sigma-insight-title"><span class="sigma-insight-title-label"><i class="fa-solid ${data.categoryIcon} ${data.headerIconColor || 'text-[#FFD000]'}" aria-hidden="true"></i><span>${data.concernTitle}</span></span></h4>` : `
                    <div class="flex items-center gap-2 min-w-0">
                        <i class="fa-solid ${data.categoryIcon} ${data.headerIconColor || 'text-[#FFD000]'} text-[12.5px] flex-shrink-0"></i>
                        <h4 class="text-[13px] font-bold text-white tracking-normal truncate leading-none">${data.concernTitle}</h4>
                    </div>`}
                    <div class="flex items-center gap-2 flex-shrink-0 leading-none${compactInsight ? ' sigma-insight-actions' : ''}">
                        ${data.datePlacement !== 'footer' ? `<span class="text-[10px] text-white/85 font-medium tracking-tight leading-none">${data.date || ''}</span>` : ''}
                        <button type="button" class="sigma-card-pin-btn pocket-card-pin-btn" title="Pin to top">
                            <i class="fa-solid fa-thumbtack text-[9px]"></i>
                        </button>
                    </div>
                </div>

                <!-- Card Body: Aligned Subject Row + Hairline Divider + Clamped Body -->
                <div class="sigma-card-body pocket-card-body">
                    <!-- Subject Title Row with Centered Icon Badge and Aligned Text -->
                    ${!compactInsight ? `
                    <div class="${compactInsight ? 'sigma-insight-subject' : 'flex items-center gap-2.5 pb-2 mb-1.5 border-b border-slate-100 w-full flex-shrink-0'}">
                        <div class="${compactInsight ? 'sigma-insight-subject-icon' : `w-8 h-8 rounded-lg ${data.subjectBadgeBg || 'bg-slate-50'} ${data.subjectIconColor || 'text-slate-700'} flex items-center justify-center flex-shrink-0 border ${data.subjectBadgeBorder || 'border-slate-100'}`}">
                            <i class="fa-solid ${data.subjectIcon} text-xs"></i>
                        </div>
                        <div class="flex-1 min-w-0 flex flex-col justify-center text-left">
                            <h5 class="text-[11.5px] font-bold text-slate-900 leading-tight truncate">${data.subject}</h5>
                            ${data.concernHighlight ? `<p class="text-[9.5px] font-semibold text-[#15803d] leading-tight truncate mt-0.5">${data.concernHighlight}</p>` : ''}
                        </div>
                    </div>

                    ` : ''}
                    <!-- Preserve the complete insight separately from its space-fitted preview. -->
                    ${compactInsight ? '<div class="sigma-insight-preview">' : ''}
                    <p class="sigma-card-concern-text pocket-card-concern-text">
                        ${compactInsight ? (data.previewText || data.concernText.replace(/<br\s*\/?>/gi, ' ')) : data.concernText}
                    </p>
                    ${compactInsight ? '</div>' : ''}
                    ${compactInsight ? '<button type="button" class="sigma-insight-open sigma-insight-read-more" aria-haspopup="dialog" onclick="event.stopPropagation(); window.openStudentInsight?.(this)">Read more</button>' : ''}
                    ${compactInsight ? `<template class="sigma-insight-full-content">${data.concernText}</template>` : ''}
                </div>

                ${data.datePlacement === 'footer' && data.date ? `<div class="sigma-card-date">${data.date}</div>` : ''}
                <!-- Bottom Accent Line -->
                <div class="mt-auto h-[2px] w-full bg-[#15803d] flex-shrink-0"></div>
            </div>
        `;
    }

    window.renderSigmaReadOnlyInsightCard = function (data, interactive = false) {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = renderSigmaGradeMonitoringCardHtml(data);
        const card = wrapper.firstElementChild;
        if (!interactive) card.classList.add('sigma-card--report');
        else card.dataset.reportInsight = 'true';
        card.querySelectorAll('[onclick]').forEach(node => node.removeAttribute('onclick'));
        card.querySelectorAll('.sigma-card-pin-btn').forEach(node => node.remove());
        if (interactive) {
            const opener = card.querySelector('.sigma-insight-open');
            opener?.addEventListener('click', event => {
                event.stopPropagation();
                window.openStudentInsight?.(opener);
            });
            return card;
        }
        card.querySelectorAll('.sigma-insight-open').forEach(button => button.remove());
        const preview = card.querySelector('.sigma-insight-preview');
        const full = card.querySelector('.sigma-insight-full-content');
        if (preview && full) { preview.replaceChildren(full.content.cloneNode(true)); full.remove(); }
        return card;
    };

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

        const isMobileAnalytics = container.id === 'analytics-dropdown-cards';
        const containerId = isMobileAnalytics ? 'sigma-panels-container' : (container.id || 'sigma-analytics-rail');
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
        if (!isMobileAnalytics && (!headerEl || (!headerEl.classList.contains('sigma-rail-header') && !headerEl.classList.contains('pocket-rail-header')))) {
            headerEl = document.createElement('div');
            headerEl.className = 'sigma-rail-header pocket-rail-header';

            const title = isAdmin ? 'System Metrics' : 'SIGMA AI Insights';

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
                    <button type="button" class="sigma-analyze-button" title="Refresh insights" aria-label="Refresh insights"><i class="fa-solid fa-arrows-rotate" aria-hidden="true"></i></button>
                    <button type="button" class="sigma-insight-search-toggle" title="Search insights" aria-label="Search insights"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i></button>
                `;
            }

            container.parentNode.insertBefore(headerEl, container);

        }

        if (!isAdmin && !headerEl.querySelector('.sigma-insight-search')) {
            const search = document.createElement('form');
            search.className = 'sigma-insight-search';
            search.setAttribute('role', 'search');
            search.innerHTML = '<input type="search" name="insight-search" maxlength="100" autocomplete="off" placeholder="Search insights" aria-label="Search insights"><button type="button" class="sigma-insight-search-clear" title="Clear search" aria-label="Clear insight search" hidden><i class="fa-solid fa-xmark" aria-hidden="true"></i></button><button type="submit" class="sigma-insight-search-submit" title="Search insights" aria-label="Submit insight search"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i></button>';
            headerEl.appendChild(search);
            const input = search.querySelector('input');
            const clearButton = search.querySelector('.sigma-insight-search-clear');
            const clearSearch = () => {
                input.value = '';
                clearButton.hidden = true;
                container.dataset.insightSearchQuery = '';
                initPocketCardsContainer(container);
                input.focus();
            };
            clearButton.addEventListener('click', clearSearch);
            input.addEventListener('input', () => {
                input.value = input.value.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 100);
                clearButton.hidden = !input.value;
                if (!input.value) clearSearch();
            });
            const closeSearch = (restoreFocus = false) => {
                headerEl.classList.remove('sigma-insight-searching');
                if (restoreFocus) headerEl.querySelector('.sigma-insight-search-toggle')?.focus();
            };
            headerEl.querySelector('.sigma-insight-search-toggle')?.addEventListener('click', () => {
                headerEl.classList.add('sigma-insight-searching');
                input.focus();
            });
            search.addEventListener('submit', event => {
                event.preventDefault();
                input.value = input.value.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 100).trim().replace(/\s+/g, ' ');
                clearButton.hidden = !input.value;
                container.dataset.insightSearchQuery = input.value.toLocaleLowerCase();
                initPocketCardsContainer(container);
            });
            search.addEventListener('focusout', () => {
                setTimeout(() => { if (!search.contains(document.activeElement)) closeSearch(); }, 0);
            });
            document.addEventListener('pointerdown', event => {
                if (headerEl.classList.contains('sigma-insight-searching') && !search.contains(event.target)) closeSearch();
            });
            input.addEventListener('keydown', event => { if (event.key === 'Escape') closeSearch(true); });
        }

        // 3. Render initial cards for Student / Teacher if container is empty or needs refresh
        const query = container.dataset.insightSearchQuery || '';
        const pinnedOrder = !isAdmin ? getPinnedCardIds(containerId) : [];
        const insightKind = location.pathname.toLowerCase().includes('teacher') ? 'teacher' : 'student';
        const insightStatus = !isAdmin ? window.SigmaAiDatabase?.getStatus?.(insightKind) || 'loading' : 'ready';
        const userCards = !isAdmin && insightStatus === 'ready' ? getDynamicUserPocketCards().filter(card => {
            if (!query) return true;
            const text = document.createElement('div');
            text.innerHTML = [card.concernTitle, card.subject, card.subtitle, card.concernText, card.previewText].filter(Boolean).join(' ');
            return text.textContent.toLocaleLowerCase().includes(query);
        }).sort((a, b) => {
            const rank = card => { const index = pinnedOrder.indexOf(card.id); return index < 0 ? pinnedOrder.length : index; };
            return rank(a) - rank(b);
        }) : [];
        if (!isAdmin) {
            if (!userCards || userCards.length === 0) {
                const status = insightStatus;
                container.setAttribute('aria-busy', status === 'loading' ? 'true' : 'false');
                if (status === 'loading') {
                    container.innerHTML = window.SigmaContentLoading.html({compact:true, label:'Loading insights'});
                } else if (status === 'error') {
                    container.innerHTML = '<div class="sigma-load-status" role="status"><span>Unable to load insights.</span><button type="button" class="sigma-retry-link" onclick="window.retrySigmaInsights()">Refresh</button></div>';
                } else {
                    container.innerHTML = query ? '<p class="sigma-insight-search-empty" role="status">No matching insights</p>' : renderPocketCardZeroStateHtml();
                }
            } else {
                container.setAttribute('aria-busy', 'false');
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
                    <span class="more-label">Show More</span>
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
                        window.updateAiDisplay?.();
                    } else {
                        // Dynamically render extra Student/Teacher SIGMA cards (cards 5-8)
                        const extraCards = userCards.slice(4);
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
                    if (moreLabel) moreLabel.textContent = 'Show More';
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

                pinBtn.setAttribute('aria-label', pinBtn.title);
                // Pinning is reversible, so both actions are immediate.
                pinBtn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    if (isPinned) {
                        executeUnpin(cardId);
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

        if (container._sigmaRefreshPins) {
            window.removeEventListener('sigma:refresh-pocket-cards', container._sigmaRefreshPins);
            window.removeEventListener('sigma:refresh-analytics-cards', container._sigmaRefreshPins);
        }
        container._sigmaRefreshPins = () => {
            if (container.querySelector('.sigma-skeleton-insight-card, .sigma-batch-placeholder') || !container.querySelector('.sigma-card')) {
                initPocketCardsContainer(container);
            } else {
                sortPinnedCards();
                refreshPinButtons();
            }
        };
        window.addEventListener('sigma:refresh-pocket-cards', container._sigmaRefreshPins);
        window.addEventListener('sigma:refresh-analytics-cards', container._sigmaRefreshPins);
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
        getTransmutationRows() {
            return DEPED_TRANSMUTATION_TABLE.map((tier, index) => ({
                min: tier.min,
                max: index === 0 ? 100 : Number((DEPED_TRANSMUTATION_TABLE[index - 1].min - 0.01).toFixed(2)),
                grade: tier.grade
            }));
        },
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
            section: '',
            sections: [],
            assignedSections: [],
            subject: '',
            subjects: [],
            assignedSubjects: [],
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
    const initialIsStudent = window.location.pathname.endsWith('/student.html');
    if (initialIsStudent && /^#(?:grades:.*|school-grades(?::.*)?)$/.test(window.location.hash)) {
        window.history.replaceState(window.history.state, '', '#grades');
    }
    window.sigmaGradesState = {
        activeTab: 'gradebook', // 'analytics' or 'gradebook'
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
                teacherAnalyticsDetail: isTeacher && state.teacherAnalyticsDetail === true,
                teacherAdvisoryView: state.teacherAdvisoryView === true,
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
        window.sigmaGradesState.activeTab = 'gradebook';
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

        if (isTeacher) {
            if (enteringGrades) hydrateSigmaGradesState('teacher');
            const rememberedTab = window.sigmaGradesState?.activeTab;
            const savedTab = loadSigmaGradesState(true)?.activeTab;
            const targetTab = explicitTab || (hashWantsGradebook ? 'gradebook' : '')
                || savedTab || rememberedTab || 'gradebook';
            if (enteringGrades && window.sigmaGradesState) window.sigmaGradesState.activeTab = targetTab;
            window._gradebookReturnPending = false;
            window._skipNextGradebookReset = false;
            return { targetTab, keepSelection: true };
        }

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

        let targetTab = 'gradebook';
        if (explicitTab) targetTab = explicitTab;
        else if (hashWantsGradebook) targetTab = 'gradebook';
        else if (keepSelection) targetTab = window.sigmaGradesState?.activeTab || 'gradebook';
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
                activeTab: 'gradebook',
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

        if (isTeacher && !saved && !window.sigmaGradesState.selectedSubjectSection) {
            window.sigmaGradesState.activeTab = 'gradebook';
        }

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
                window.sigmaGradesState.teacherAnalyticsDetail = saved.teacherAnalyticsDetail === true
                    && Boolean(window.sigmaGradesState.selectedSubjectSection);
                window.sigmaGradesState.teacherAdvisoryView = saved.teacherAdvisoryView === true;
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
                window.sigmaGradesState.teacherAdvisoryView=saved.teacherAdvisoryView===true;
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
            window.sanitizeAdminTeacherSearchInput(searchInput);
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
        const clear = document.getElementById('admin-teacher-search-clear');
        if (clear) clear.hidden = !clean;
        return clean;
    };

    window.clearAdminTeacherModalSearch = function () {
        const input = document.getElementById('admin-teacher-search-input');
        if (!input) return;
        input.value = '';
        window.sanitizeAdminTeacherSearchInput(input);
        window._pendingAdminTeacher = null;
        window._pendingAdminTeacherId = null;
        window.renderAdminTeacherModalList('', false);
        window.updateAdminTeacherModalFooter();
        input.focus({ preventScroll: true });
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
            window.sigmaGradesState.teacherAdvisoryView = false;
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
            return window.SigmaSearch.record(q, [id], [name, t.middleName, email]);
        });

        window._lastFilteredTeachers = filtered;

        if (filtered.length === 0) {
            listContainer.innerHTML = `
                <div class="py-12 px-4 text-center font-['Inter']">
                    <div class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                        <i class="fa-solid fa-chalkboard-user text-lg" style="color: rgba(0, 0, 0, 0.40);"></i>
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
            const assignedSubjects = new Map();
            (window.getTeacherAssignedSubjectsAndSections?.(teacher) || []).forEach(assignment => {
                if (!assignment.subject) return;
                if (!assignedSubjects.has(assignment.subject)) assignedSubjects.set(assignment.subject, new Set());
                if (assignment.sectionName) assignedSubjects.get(assignment.subject).add(formatGradeSectionDisplay(assignment.sectionName, assignment.grade));
            });

            return `
                <div onclick="window.setPendingAdminTeacherByIndex(${idx})" 
                    aria-selected="${isSelected}"
                    class="faculty-directory-row group p-3.5 hover:bg-black/[0.03] transition-colors flex items-center justify-between relative font-['Inter'] cursor-pointer ${isSelected ? 'sigma-row-selected' : ''}">
                    <div class="flex items-center gap-3.5 min-w-0 flex-1">
                        ${avatarHtml}
                        <div class="min-w-0 flex-1">
                            <div class="flex items-center gap-2.5 truncate">
                                <p class="text-sm font-bold text-black tracking-tight truncate">${escapeHtml(name)}</p>
                            </div>
                            <p class="text-xs text-black/40 font-medium font-['Inter'] mt-0.5">ID: ${escapeHtml(idDisplay)}</p>
                        </div>
                    </div>
                    <div class="faculty-directory-subjects" aria-label="Assigned subjects">${assignedSubjects.size
                        ? [...assignedSubjects].map(([subject, sections]) => `<div class="faculty-directory-assignment"><span>${escapeHtml(subject)}</span><small>${escapeHtml([...sections].join(' · '))}</small></div>`).join('')
                        : '<span>No subjects assigned</span>'}</div>
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
            window.sigmaGradesState.teacherAdvisoryView = false;
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
                    <div class="min-w-0 flex-1">
                        <div class="flex items-start justify-between gap-2 w-full">
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
        window.sigmaGradesState.teacherAdvisoryView = false;
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

    window.selectDistributionQuarter = function (quarter) {
        const subject = window.sigmaGradesState.selectedSubjectSection;
        if (!subject || !window.getSubjectAvailableQuarters(subject.subject).includes(Number(quarter))) return;
        const key = JSON.stringify(['grade-distribution', getEffectiveTeacher()?.id || getEffectiveTeacher()?.uid || getEffectiveTeacher()?.name, subject.subject, subject.sectionName]);
        window.rememberPerformanceQuarter(key, Number(quarter));
        window.renderAdminAnalyticsWorkspace();
    };

    window.switchAdminQuarter = function (quarter) {
        const subject = window.sigmaGradesState.selectedSubjectSection;
        const available = subject && window.getSubjectAvailableQuarters(subject.subject);
        if (!available || !available.includes(Number(quarter))) return;
        window.sigmaGradesState.activeQuarter = Number(quarter);
        window.currentSelectedTopicQuarter = `q${Number(quarter)}`;
        saveSigmaGradesState();
        window.renderAdminQuartersTabs();
        window.renderAdminGradebookWorkspace();
        window.renderAdminAnalyticsWorkspace();
    };

    window.renderAdminQuartersTabs = function () {
        const quartersContainer = document.getElementById('admin-grades-quarters-wrapper');
        if (!quartersContainer) return;

        const subSec = window.sigmaGradesState.selectedSubjectSection;
        if (!subSec || (window.sigmaGradesState.activeTab === 'analytics' && window.sigmaGradesState.teacherAdvisoryView)) {
            quartersContainer.classList.add('hidden');
            quartersContainer.innerHTML = '';
            return;
        }

        quartersContainer.classList.remove('hidden');
        const quarters = window.getSubjectAvailableQuarters(subSec.subject);
        subSec.quarters = quarters;
        if (!quarters.includes(Number(window.sigmaGradesState.activeQuarter))) {
            window.sigmaGradesState.activeQuarter = quarters[0];
            saveSigmaGradesState();
        }
        quartersContainer.dataset.quarterCount = String(quarters.length);
        const quarterNames = {
            1: '1st Quarter',
            2: '2nd Quarter',
            3: '3rd Quarter',
            4: '4th Quarter'
        };
        if (window.renderSharedQuarterDropdown) {
            const hideAdminAnalyticsQuarter = !isCurrentPageTeacherPortal() && window.sigmaGradesState.activeTab === 'analytics';
            quartersContainer.innerHTML = hideAdminAnalyticsQuarter ? '' : window.renderSharedQuarterDropdown(quarters, Number(window.sigmaGradesState.activeQuarter), q => `window.switchAdminQuarter(${q})`);
            if (!quartersContainer.children.length) quartersContainer.classList.add('hidden');
            return;
        }

        if (window.sigmaGradesState.isTeacherPage && window.sigmaGradesState.activeTab === 'gradebook') {
            quartersContainer.innerHTML = `<select aria-label="Quarter" class="teacher-gradebook-quarter-select" onchange="window.switchAdminQuarter(Number(this.value))">${quarters.map(q => `<option value="${q}" ${Number(window.sigmaGradesState.activeQuarter) === q ? 'selected' : ''}>${quarterNames[q]}</option>`).join('')}</select>`;
            return;
        }
        quartersContainer.innerHTML = `
            <div class="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200/60 font-['Inter']">
                ${quarters.map(q => {
                    const isActive = window.sigmaGradesState.activeQuarter === q;
                    return `
                        <button type="button" onclick="window.switchAdminQuarter(${q})" aria-label="${quarterNames[q]}" aria-pressed="${isActive}"
                            class="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                isActive
                                ? 'bg-white text-black shadow-xs border border-black/5'
                                : 'text-black-fade hover:text-black hover:bg-slate-200/50'
                            }">
                            <span class="sigma-quarter-long">${quarterNames[q] || `Quarter ${q}`}</span><span class="sigma-quarter-short">Q${q}</span>
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
        const openSection = document.getElementById('admin-gradebook-open-section');
        if (openSection) {
            const visible = !isTeacher && !!teacher && !!subSec && !window.sigmaGradesState.teacherAdvisoryView;
            openSection.hidden = !visible;
            openSection.style.setProperty('display', visible ? 'inline-flex' : 'none', 'important');
        }

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
            let advisoryNavigation = document.getElementById('admin-analytics-advisory-navigation');
            if (!isTeacher && !advisoryNavigation) {
                advisoryNavigation = document.createElement('button');
                advisoryNavigation.id = 'admin-analytics-advisory-navigation';
                advisoryNavigation.type = 'button';
                advisoryNavigation.className = 'sigma-btn sigma-btn-primary sigma-btn-md grade-class-nav-button';
                const sectionAction = document.getElementById('admin-gradebook-open-section');
                if (sectionAction) sectionAction.after(advisoryNavigation);
                else subWrapper.after(advisoryNavigation);
            }
            if (advisoryNavigation) {
                const available = !isTeacher && !!teacher && getAdvisorySectionRecords().length > 0;
                advisoryNavigation.classList.toggle('admin-gradebook-advisory-navigation', window.sigmaGradesState.activeTab === 'gradebook');
                advisoryNavigation.hidden = !available;
                advisoryNavigation.style.setProperty('display', available ? 'inline-flex' : 'none', 'important');
                const advisoryView = available && window.sigmaGradesState.teacherAdvisoryView;
                advisoryNavigation.innerHTML = advisoryView
                    ? '<i class="fa-solid fa-chalkboard-user" aria-hidden="true"></i><span>Subject Classes</span>'
                    : '<i class="fa-solid fa-users" aria-hidden="true"></i><span>Advisory Class</span>';
                advisoryNavigation.onclick = () => advisoryView ? window.backToTeacherGradeClasses() : window.openGradebookAdvisoryClass();
                if (advisoryView) { subWrapper.classList.add('hidden'); subWrapper.style.setProperty('display','none','important'); }
                else subWrapper.style.removeProperty('display');
            }
        }

        if (subLabel) {
            if (subSec) {
                const roleBadge = subSec.role === 'Adviser'
                    ? `<span class="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#FFD000] text-black border border-black/10 uppercase tracking-wider shrink-0 font-['Inter'] ml-2">Adviser</span>`
                    : '';

                const formattedSecName = formatGradeSectionDisplay(subSec.sectionName, subSec.grade);

                subLabel.className = "flex flex-1 flex-col items-start justify-center min-w-0 font-['Inter'] text-left";
                subLabel.innerHTML = `
                    <div class="flex items-start justify-between gap-1.5 w-full min-w-0">
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
        const shareControl = document.getElementById('grades-submit-export');
        if (shareControl) {
            document.getElementById('teacher-gradebook-advisory-desktop')?.remove();
            document.getElementById('teacher-gradebook-advisory-mobile')?.remove();
            document.getElementById('admin-gradebook-advisory-mobile')?.remove();
            if (!isTeacher && teacher && window.sigmaGradesState.activeTab === 'gradebook' && getAdvisorySectionRecords().length) {
                const action = document.createElement('button');
                action.id = 'admin-gradebook-advisory-mobile';
                action.type = 'button';
                action.innerHTML = '<i class="fa-solid fa-users" aria-hidden="true"></i><span>Advisory Class</span>';
                action.onclick = () => window.openGradebookAdvisoryClass();
                document.getElementById('grades-submit-export-menu')?.append(action);
            }
            if (isTeacher && window.sigmaGradesState.activeTab === 'gradebook' && getAdvisorySectionRecords().length) {
                const desktopAction = document.createElement('button');
                desktopAction.id = 'teacher-gradebook-advisory-desktop';
                desktopAction.type = 'button';
                desktopAction.className = 'sigma-btn sigma-btn-primary sigma-btn-md grade-class-nav-button';
                desktopAction.innerHTML = '<i class="fa-solid fa-users" aria-hidden="true"></i><span>Advisory Class</span>';
                desktopAction.onclick = () => window.openGradebookAdvisoryClass();
                shareControl.before(desktopAction);
                const mobileAction = desktopAction.cloneNode(true);
                mobileAction.id = 'teacher-gradebook-advisory-mobile';
                mobileAction.className = '';
                mobileAction.onclick = () => window.openGradebookAdvisoryClass();
                document.getElementById('grades-submit-export-menu')?.append(mobileAction);
            }
        }

        const advisoryButton = document.getElementById('grades-advisory-class-btn');
        if (advisoryButton) {
            advisoryButton.disabled = subSec?.role !== 'Adviser';
            advisoryButton.title = advisoryButton.disabled ? 'Available to section advisers only' : 'Advisory Class';
            advisoryButton.querySelector('i')?.setAttribute('class', advisoryButton.disabled ? 'fa-solid fa-lock' : 'fa-solid fa-users');
        }

        // 4. Action Buttons UI - only on the Gradebooks tab.
        const actBtns = document.getElementById('admin-gradebook-action-buttons');
        if (actBtns) {
            const isGradebookTab = (window.sigmaGradesState.activeTab === 'gradebook');
            if (isGradebookTab && subSec) {
                actBtns.classList.remove('hidden');
                actBtns.style.setProperty('display', window.sigmaGradesState.isTeacherPage ? 'contents' : 'flex', window.sigmaGradesState.isTeacherPage ? 'important' : '');
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

    window.closeGradesSubmitExportMenu = function () {
        document.getElementById('grades-submit-export-menu')?.classList.add('hidden');
        document.getElementById('grades-submit-export-btn')?.setAttribute('aria-expanded', 'false');
    };

    window.toggleGradesSubmitExportMenu = function () {
        const menu = document.getElementById('grades-submit-export-menu');
        const button = document.getElementById('grades-submit-export-btn');
        if (!menu || !button) return;
        const opening = menu.classList.contains('hidden');
        menu.classList.toggle('hidden', !opening);
        button.setAttribute('aria-expanded', String(opening));
    };

    document.addEventListener('keydown', function (event) {
        const menu = document.getElementById('grades-submit-export-menu');
        if (event.key === 'Escape' && menu && !menu.classList.contains('hidden')) {
            window.closeGradesSubmitExportMenu();
            document.getElementById('grades-submit-export-btn')?.focus();
        }
    });

    // Close subject dropdown when clicking anywhere outside
    if (typeof document !== 'undefined') {
        document.addEventListener('click', function (e) {
            if (!document.getElementById('grades-submit-export')?.contains(e.target)) {
                window.closeGradesSubmitExportMenu();
            }
            const dropdownWrapper = document.getElementById('admin-grades-subject-section-dropdown-wrapper');
            const menu = document.getElementById('admin-grades-subject-picker-menu');
            if (menu && !menu.classList.contains('hidden')) {
                if (!dropdownWrapper || !dropdownWrapper.contains(e.target)) {
                    menu.classList.add('hidden');
                }
            }
        });
    }

    window.openTeacherOverviewClass = function (index) {
        const item = window.getTeacherAssignedSubjectsAndSections(getEffectiveTeacher())[index];
        if (!item) return;
        history.replaceState({...history.state,teacherGradesView:'classes'},'',location.href);
        Object.assign(window.sigmaGradesState, { selectedSubjectSection: item, selectedSubject: item.subject, selectedSection: item.sectionName, currentView: 'overview', teacherAnalyticsDetail: true });
        saveSigmaGradesState();
        window.switchAdminGradesTab('analytics');
        window.updateAdminSharedNavbarUI();
        window.renderAdminAnalyticsWorkspace();
        history.pushState({...history.state,teacherGradesView:'subject',teacherSubjectSection:item},'',location.href);
    };
    window.addEventListener('popstate',event=>{
        if(!/^#(?:school-)?grades:analytics/.test(location.hash)||!window.sigmaGradesState)return;
        const detail=event.state?.teacherGradesView==='subject';
        window.sigmaGradesState.teacherAnalyticsDetail=detail;
        window.sigmaGradesState.teacherAdvisoryView=event.state?.teacherGradesView==='advisory';
        if(detail&&event.state.teacherSubjectSection)window.sigmaGradesState.selectedSubjectSection=event.state.teacherSubjectSection;
        saveSigmaGradesState();
        setTimeout(()=>window.renderAdminAnalyticsWorkspace(),0);
    });
    const getAdvisorySectionRecords = () => {
        const teacher=getEffectiveTeacher()||{};
        const normalize=value=>String(value||'').trim().toLowerCase();
        const ids=[teacher.id,teacher.uid,teacher.email].filter(Boolean).map(normalize);
        const name=normalize(teacher.fullName||teacher.name||[teacher.firstName,teacher.middleName,teacher.lastName].filter(Boolean).join(' '));
        const records=['sigma-admin-sections','sigma-sections-list','sigma-admin-sections-v1','sigma-sections'].flatMap(key=>{try{const rows=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(rows)?rows:[];}catch(_){return [];}});
        const found=new Map();
        records.forEach(section=>{
            if(section.status==='Archived')return;
            const adviser=section.adviser;
            const assignedIds=[section.adviserId,section.adviserUid,section.adviserEmail,adviser?.id,adviser?.uid,adviser?.email].filter(Boolean).map(normalize);
            const assignedName=normalize(typeof adviser==='string'?adviser:adviser?.fullName||adviser?.name||section.adviserName);
            const matches=assignedIds.length?assignedIds.some(id=>ids.includes(id)):Boolean(name&&assignedName===name);
            if(matches)found.set(normalize(section.name||section.sectionName),section);
        });
        return [...found.values()];
    };
    function getAnalyticsSubjectIcon(subjectName) {
        if (typeof window.getSubjectIcon === 'function') return window.getSubjectIcon(subjectName);
        const s = String(subjectName || '').toLowerCase();
        if (s.includes('math') || s.includes('calculus') || s.includes('stat') || s.includes('algebra')) return 'fa-solid fa-calculator';
        if (s.includes('program') || s.includes('code') || s.includes('software') || s.includes('web') || s.includes('cs') || s.includes('it')) return 'fa-solid fa-laptop-code';
        if (s.includes('empowerment') || s.includes('tech')) return 'fa-solid fa-microchip';
        if (s.includes('science') || s.includes('physics') || s.includes('chem') || s.includes('bio')) return 'fa-solid fa-flask';
        if (s.includes('english') || s.includes('literature') || s.includes('reading') || s.includes('communication') || s.includes('oral')) return 'fa-solid fa-comments';
        if (s.includes('history') || s.includes('filipino') || s.includes('social') || s.includes('society')) return 'fa-solid fa-landmark';
        if (s.includes('pe') || s.includes('physical') || s.includes('health') || s.includes('sports')) return 'fa-solid fa-heart-pulse';
        return 'fa-solid fa-book-open';
    }
    window.openGradebookAdvisoryClass = function () {
        if (!getAdvisorySectionRecords().length) return;
        window.closeGradesSubmitExportMenu();
        if (isCurrentPageTeacherPortal()) window.switchTab?.('nav-grades', true, 'analytics');
        window.switchAdminGradesTab('analytics');
        window.openTeacherAdvisoryClass();
    };
    window.openTeacherAdvisoryClass = function () {
        if (!isCurrentPageTeacherPortal() && window.sigmaGradesState.activeTab !== 'analytics') return;
        const assignments=window.getTeacherAssignedSubjectsAndSections(getEffectiveTeacher())||[];
        const advisoryRecords=getAdvisorySectionRecords();
        const sections=advisoryRecords.map(section=>section.name||section.sectionName);
        const container=document.getElementById('admin-analytics-workspace-content');
        if(!sections.length||!container)return;
        if(!window.sigmaGradesState.teacherAdvisoryView){
            history.replaceState({...history.state,teacherGradesView:'classes'},'',location.href);
            history.pushState({...history.state,teacherGradesView:'advisory'},'',isCurrentPageTeacherPortal()?'#grades:analytics':'#school-grades:analytics');
        }
        window.sigmaGradesState.teacherAdvisoryView=true;
        window.renderAdminQuartersTabs();
        saveSigmaGradesState();
        const header=document.getElementById('nav-context-text');
        if(header){header.classList.add('advisory-header-title');header.innerHTML='<span class="advisory-header-parent">Grades</span><span class="advisory-header-main">Advisory Class</span>';}
        container.innerHTML=`<div class="teacher-class-overview"><button type="button" class="sigma-btn sigma-btn-white sigma-btn-md" onclick="window.backToTeacherGradeClasses()"><i class="fa-solid fa-arrow-left" aria-hidden="true"></i><span>Grades</span></button><h3 style="margin-top:24px">Advisory Class</h3>${sections.map(section=>{
            const students=window.getStudentsForSection?.(section)||[];
            return `<section style="margin-top:24px"><h3>${escapeHtml(section)}</h3>${students.map(student=>`<div class="teacher-student-grade-entry"><strong>${escapeHtml(student.fullName||student.name||[student.firstName,student.lastName].filter(Boolean).join(' '))}</strong><span>${escapeHtml(String(student.lrn||student.studentNumber||student.id||student.uid||''))}</span></div>`).join('')||'<p>No Students Assigned Yet</p>'}</section>`;
        }).join('')}</div>`;
        window.scrollTo(0,0);
        container.querySelector('.teacher-class-overview > h3')?.remove();
        const page=container.querySelector('.teacher-class-overview');
        const backButton = page.querySelector(':scope > button');
        if (backButton) {
            backButton.className = 'sigma-btn sigma-btn-primary sigma-btn-md';
            backButton.setAttribute('aria-label', 'Subject Classes');
            backButton.querySelector('span').textContent = 'Subject Classes';
            backButton.querySelector('i').className = 'fa-solid fa-chalkboard-user';
            const tools = document.createElement('div');
            tools.className = 'teacher-class-advisory-tools';
            backButton.before(tools);
            tools.append(backButton);
        }
        page.querySelectorAll(':scope > section').forEach(section=>section.remove());
        const subjects=advisoryRecords.flatMap(section=>{
            const names=[...(section.assignedSubjects||[]),...(section.subjects||[]),...(section.teachers||[]).map(row=>row.subject||row.assignedSubject),...assignments.filter(row=>row.sectionName===(section.name||section.sectionName)).map(row=>row.subject)];
            return [...new Set(names.map(value=>typeof value==='object'?value.subject||value.name:value).filter(Boolean))].map(subject=>({subject,sectionName:section.name||section.sectionName,grade:section.grade||section.gradeLevel}));
        });
        window._advisoryReviewSubjects=subjects;
        const body=document.createElement('div');body.className='teacher-class-overview-body';
        body.innerHTML=`<div class="teacher-class-panels">${subjects.map((item,index)=>`<article class="teacher-class-panel"><header><span class="teacher-class-panel-icon"><i class="${getAnalyticsSubjectIcon(item.subject)}" aria-hidden="true"></i></span><div><h3>${escapeHtml(item.subject)}</h3><p>${escapeHtml(item.sectionName)}</p></div></header><div class="teacher-class-panel-students"><strong>${(window.getStudentsForSection?.(item.sectionName)||[]).length}</strong><span>Students</span></div><p class="teacher-student-grade-empty">Awaiting Submitted Grades</p><button type="button" class="sigma-btn sigma-btn-primary sigma-btn-md" onclick="window.openAdvisorySubjectReview(${index})"><span>Review Grades</span><i class="fa-solid fa-arrow-right" aria-hidden="true"></i></button></article>`).join('')||'<div class="teacher-grades-empty"><h3>No Subjects Assigned Yet</h3></div>'}</div><aside class="teacher-class-grade-list"><header><h3>General Average</h3>${window.renderSharedQuarterDropdown([1,2,3,4],window.sigmaGradesState.activeQuarter||1,q=>`window.sigmaGradesState.activeQuarter=${q};window.openTeacherAdvisoryClass()`)}</header>${sections.map(section=>(window.getStudentsForSection?.(section)||[]).map(student=>`<div class="teacher-student-grade-entry"><div><strong>${escapeHtml(student.fullName||student.name||'Student')}</strong><p>${escapeHtml(section)} · Incomplete</p></div><span class="teacher-quarter-grade-empty">-</span></div>`).join('')).join('')||'<p class="teacher-student-grade-empty">No Students Assigned Yet</p>'}</aside>`;
        page.append(body);
        const subjectClassTools = page.querySelector(':scope > .teacher-class-advisory-tools');
        if (subjectClassTools) body.querySelector('.teacher-class-grade-list').prepend(subjectClassTools);
        if (!isCurrentPageTeacherPortal()) {
            subjectClassTools?.remove();
            window.updateAdminSharedNavbarUI();
        }
        syncGradeOverviewTools();
        body.querySelectorAll('.teacher-class-panel').forEach((panel,index)=>{
            const item=subjects[index];
            const students=window.getStudentsForSection?.(item.sectionName)||[];
            const quarter=Number(window.sigmaGradesState.activeQuarter)||1;
            let submitted=0;
            let revised=false;
            try{
                const year=window.getActiveSchoolYearRecord?.()||{};
                const schoolYear=year.yearStart&&year.yearEnd?`${year.yearStart}-${year.yearEnd}`:year.name||year.schoolYear||year.year||'Not specified';
                const normalize=value=>String(value||'').trim().toLowerCase();
                const key=JSON.stringify([schoolYear,normalize(item.sectionName),normalize(item.subject),quarter]);
                const sharedState=window.SigmaGradeSync?.getSharedRecords();
                const record=sharedState?.ready?sharedState.records[key]:JSON.parse(localStorage.getItem('sigma-submitted-quarter-grades-v1')||'{}')[key];
                const remotePublished=window.SigmaGradeSync?.getPublished(key);
                const publishedRecord=remotePublished?.ready?remotePublished.record:JSON.parse(localStorage.getItem('sigma-published-quarter-grades-v1')||'{}')[key];
                const values=rows=>JSON.stringify((rows||[]).map(row=>[String(row.id),row.grade]).sort());
                revised=Boolean(record&&publishedRecord&&values(record.rows)!==values(publishedRecord.rows));
                submitted=students.filter(student=>record?.rows?.some(row=>[student.id,student.uid,student.lrn,student.studentNumber].filter(Boolean).map(String).includes(String(row.id))&&Number.isFinite(row.grade))).length;
            }catch(_){}
            const summary=panel.querySelector('.teacher-class-panel-students');
            summary.replaceChildren();
            const label=document.createElement('span');label.textContent='Grades Submitted';
            const count=document.createElement('strong');count.textContent=`${submitted}/${students.length}`;
            summary.append(label,count);summary.title=`Quarter ${quarter}: ${submitted} of ${students.length} student grades submitted`;
            const published=students.length>0&&students.every(student=>Number.isFinite(window.getPublishedSubjectGrade?.(student,item.subject,item.sectionName,quarter)));
            const ready=students.length>0&&submitted===students.length;
            const status=panel.querySelector('.teacher-student-grade-empty');
            if(status){
                status.textContent=revised?'Updated — Review Required':published?'Published':ready?'Ready for Review':'Pending';
                status.dataset.gradeStatus=revised?'ready':published?'published':ready?'ready':'pending';
                status.setAttribute('role','status');
                status.title=`Quarter ${quarter}: ${status.textContent}`;
            }
        });
        const averageList=body.querySelector('.teacher-class-grade-list');
        averageList.querySelector('.sigma-quarter-dropdown')?.remove();
        const advisoryStudents=sections.flatMap(section=>(window.getStudentsForSection?.(section)||[]).map(student=>({student,section})));
        averageList.querySelectorAll('.teacher-student-grade-entry').forEach((entry,index)=>{
            const {student,section}=advisoryStudents[index];
            const required=subjects.filter(item=>item.sectionName===section);
            const completed=[];
            const names=['1st Quarter','2nd Quarter','3rd Quarter','4th Quarter'];
            for(const quarter of [1,2,3,4]){
                const active=required.filter(item=>{
                    const quarters=window.getSubjectAvailableQuarters?.(item.subject);
                    return !Array.isArray(quarters)||!quarters.length||quarters.some(value=>Number(String(value).replace(/^q/i,''))===quarter);
                });
                if(!active.length)continue;
                const grades=active.map(item=>window.getPublishedSubjectGrade?.(student,item.subject,section,quarter)??null);
                if(grades.every(Number.isFinite))completed.push({quarter,average:grades.reduce((sum,value)=>sum+value,0)/grades.length});
            }
            const score=entry.lastElementChild;
            score.textContent=completed.length?(completed.reduce((sum,item)=>sum+item.average,0)/completed.length).toFixed(2):'-';
            if(completed.length)score.style.color='#15803d';
            const status=entry.querySelector('p');
            if(status)status.textContent=completed.length?completed.map(item=>names[item.quarter-1]).join(', '):'Incomplete';
        });
        body.querySelectorAll('button[onclick^="window.openAdvisorySubjectReview"] i').forEach(icon=>icon.remove());
        body.querySelectorAll('.teacher-class-grade-list .teacher-student-grade-entry').forEach((entry, idx)=>{
            const info=entry.firstElementChild;
            const status=info.querySelector('p');
            const nameText = info.querySelector('strong')?.textContent || info.textContent || '';
            const studentObj = advisoryStudents[idx]?.student || nameText;
            const avatar=document.createElement('span');avatar.className='advisory-student-avatar';avatar.setAttribute('aria-hidden','true');
            const photo = window.resolveUserAvatar?.(studentObj);
            if (photo) {
                const escPhoto = (typeof window.escapeHtml === 'function') ? window.escapeHtml(photo) : photo;
                avatar.innerHTML=`<img src="${escPhoto}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.outerHTML='<i class=\\'fa-solid fa-user\\'></i>'">`;
            } else {
                avatar.innerHTML='<i class="fa-solid fa-user"></i>';
            }
            info.classList.add('advisory-student-identity');
            const text=document.createElement('div');text.append(...info.childNodes);
            info.append(avatar,text);
        });
    };
    window.openAdvisorySubjectReview = function(index){
        const item=window._advisoryReviewSubjects?.[index];
        if(!item||!getAdvisorySectionRecords().some(section=>(section.name||section.sectionName)===item.sectionName))return;
        Object.assign(window.sigmaGradesState,{selectedSubjectSection:item,selectedSubject:item.subject,selectedSection:item.sectionName});
        window.switchAdminGradesTab('gradebook');
        history.replaceState({...history.state,type:'tab',subTab:'analytics',teacherGradesView:'advisory',recordMode:null},'',isCurrentPageTeacherPortal()?'#grades:analytics':'#school-grades:analytics');
        window.openSharedGradeRecord?.({mode:'review'});
        const host=document.getElementById('admin-gradebook-workspace-content');
        host?.querySelector('.record-update')?.remove();
        const header=document.getElementById('nav-context-text');
        if(header)header.innerHTML='<span class="advisory-header-parent">Grades</span><span class="advisory-header-main">Review Grades</span>';
    };
    function syncGradeOverviewTools() {
        document.querySelectorAll('.teacher-class-overview-body').forEach(body => {
            const page = body.parentElement;
            const sidebar = body.querySelector(':scope > .teacher-class-grade-list');
            const tools = sidebar?.querySelector(':scope > .teacher-class-advisory-tools') || page.querySelector(':scope > .teacher-class-advisory-tools');
            if (!tools || !sidebar) return;
            if (window.matchMedia('(max-width:1000px)').matches) body.before(tools);
            else sidebar.prepend(tools);
        });
    }
    window.matchMedia('(max-width:1000px)').addEventListener('change', syncGradeOverviewTools);
    const refreshVisibleAdvisoryGrades=()=>{
        const state=window.sigmaGradesState;
        const host=document.getElementById('admin-analytics-workspace-content');
        if(state?.teacherAdvisoryView&&state.activeTab==='analytics'&&host?.querySelector('.teacher-class-overview-body')&&!host.closest('.hidden')){
            window.openTeacherAdvisoryClass();
        } else if(state?.activeTab==='analytics'&&host?.querySelector('.teacher-student-performance-list')&&!host.closest('.hidden')){
            window.renderAdminAnalyticsWorkspace();
        }
    };
    window.addEventListener('sigma:grades-submitted',refreshVisibleAdvisoryGrades);
    window.addEventListener('sigma:grades-published',refreshVisibleAdvisoryGrades);
    window.addEventListener('storage',event=>{
        if(['sigma-submitted-quarter-grades-v1','sigma-published-quarter-grades-v1','sigma-admin-sections','sigma-sections-list','sigma-admin-sections-v1','sigma-sections'].includes(event.key))refreshVisibleAdvisoryGrades();
    });
    window.backToTeacherGradeClasses = function () {
        window.sigmaGradesState.teacherAdvisoryView=false;
        const header=document.getElementById('nav-context-text');
        if(header){header.classList.remove('advisory-header-title');}
        window.setPortalHeader?.('Grades', 'Subject Classes');
        window.sigmaGradesState.teacherAnalyticsDetail=false;
        if (!isCurrentPageTeacherPortal()) {
            Object.assign(window.sigmaGradesState, { selectedSubjectSection:null, selectedSubject:'', selectedSection:'' });
        }
        saveSigmaGradesState();
        window.updateAdminSharedNavbarUI();
        window.renderAdminAnalyticsWorkspace();
    };
    window.renderAdminAnalyticsWorkspace = function () {
        if (window.sigmaGradesState.activeTab !== 'analytics') return;
        const workspaceContainer = document.getElementById('admin-analytics-workspace-content');
        if (!workspaceContainer) return;

        const isTeacher = isCurrentPageTeacherPortal();
        const teacher = getEffectiveTeacher();
        const subSec = window.sigmaGradesState.selectedSubjectSection;
        if (window.sigmaGradesState.teacherAdvisoryView) {
            if (getAdvisorySectionRecords().length) { window.openTeacherAdvisoryClass(); return; }
            window.sigmaGradesState.teacherAdvisoryView=false;
        }
        window.setPortalHeader?.('Grades', isTeacher && window.sigmaGradesState.teacherAnalyticsDetail && subSec ? subSec.subject : (isTeacher ? 'Subject Classes' : 'Analytics'));
        if (isTeacher && (!window.sigmaGradesState.teacherAnalyticsDetail || !subSec)) {
            const assignments = window.getTeacherAssignedSubjectsAndSections(teacher) || [];
            workspaceContainer.innerHTML = `<div class="teacher-class-overview">
                <div class="teacher-class-panels">${assignments.map((item, index) => {
                    const students = window.getStudentsForSection?.(item.sectionName, item.subject) || [];
                    const gradedQuarters=[1,2,3,4].filter(quarter=>['ww','pt','qa'].some(category=>
                        getAdminGradebookAssessmentItems(category,quarter,item.subject,item.sectionName).some((assessment,itemIndex)=>
                            students.some(student=>{
                                const score=getAdminGradebookStudentItemScore({...student,section:item.sectionName},category,itemIndex,assessment,item.subject,quarter);
                                return score!==null&&score!==undefined&&String(score).trim()!==''&&Number.isFinite(Number(score));
                            })
                        )
                    ));
                    return `<article class="teacher-class-panel" data-subject="${escapeHtml(item.subject)}"><header><span class="teacher-class-panel-icon"><i class="${getAnalyticsSubjectIcon(item.subject)}" aria-hidden="true"></i></span><div><h3>${escapeHtml(item.subject)}</h3><p>${escapeHtml(formatGradeSectionDisplay(item.sectionName,item.grade))}</p></div></header><div class="teacher-class-panel-students"><strong>${students.length}</strong><span>Students</span></div><div class="teacher-class-panel-quarters"><span>Quarters Graded</span><div>${[1,2,3,4].map(q=>`<span class="${gradedQuarters.includes(q)?'is-graded':''}" aria-label="Quarter ${q}${gradedQuarters.includes(q)?' graded':' not graded'}">Q${q}</span>`).join('')}</div></div><button type="button" class="sigma-btn sigma-btn-primary sigma-btn-md" onclick="window.openTeacherOverviewClass(${index})"><span>View Grades</span><i class="fa-solid fa-arrow-right" aria-hidden="true"></i></button></article>`;
                }).join('') || '<div class="teacher-grades-empty" role="status"><i class="fa-solid fa-book-open" aria-hidden="true"></i><h3>No Assigned Classes Yet</h3><p>Your subjects and sections will appear here once assigned.</p></div>'}</div></div>`;
            const panels=workspaceContainer.querySelector('.teacher-class-panels');
            panels.querySelectorAll('button[onclick^="window.openTeacherOverviewClass"] i').forEach(icon=>icon.remove());
            panels.querySelectorAll('.teacher-class-panel').forEach((panel,index)=>{
                const item=assignments[index];
                const students=window.getStudentsForSection?.(item.sectionName,item.subject)||[];
                const activeQuarters = (window.getSubjectActiveQuarters?.(item.subject) || ['q1','q2'])
                    .map(q => Number(String(q).replace(/^q/i,''))).filter(q => q >= 1 && q <= 4);
                const quarterGrid = panel.querySelector('.teacher-class-panel-quarters > div');
                if (quarterGrid) quarterGrid.style.gridTemplateColumns = `repeat(${activeQuarters.length},minmax(0,1fr))`;
                panel.querySelectorAll('.teacher-class-panel-quarters > div > span').forEach(badge=>{
                    const quarter=Number(badge.textContent.replace(/^Q/i,''));
                    if (!activeQuarters.includes(quarter)) { badge.remove(); return; }
                    const assessments=['ww','pt','qa'].flatMap(category=>(getAdminGradebookAssessmentItems(category,quarter,item.subject,item.sectionName)||[]).map((assessment,itemIndex)=>({category,assessment,itemIndex})));
                    const remaining=students.filter(student=>assessments.some(({category,assessment,itemIndex})=>{
                        const score=getAdminGradebookStudentItemScore({...student,section:item.sectionName},category,itemIndex,assessment,item.subject,quarter);
                        return score===null||score===undefined||String(score).trim()===''||!Number.isFinite(Number(score));
                    })).length;
                    const started=badge.classList.contains('is-graded');
                    badge.classList.toggle('is-incomplete',started&&remaining>0);
                    badge.classList.toggle('is-graded',started&&remaining===0);
                    const status=started?(remaining>0?`${remaining} student${remaining===1?'':'s'} still incomplete`:'All students graded'):'Not graded';
                    badge.title=`Quarter ${quarter}: ${status}`;
                    badge.setAttribute('aria-label',badge.title);
                });
            });
            if(getAdvisorySectionRecords().length){
                const tools=document.createElement('div');tools.className='teacher-class-advisory-tools';
                tools.innerHTML='<button type="button" class="sigma-btn sigma-btn-primary sigma-btn-md" onclick="window.openTeacherAdvisoryClass()"><i class="fa-solid fa-users" aria-hidden="true"></i><span>Advisory Class</span></button>';
                panels.before(tools);
            }
            const body=document.createElement('div');body.className='teacher-class-overview-body';
            panels.before(body);body.append(panels);
            const sidebar=document.createElement('aside');sidebar.className='teacher-class-grade-list';
            sidebar.innerHTML='<header><h3>Student Grades</h3><div data-student-grades-quarter></div></header><div data-student-grade-list></div>';
            body.append(sidebar);
            const advisoryTools = body.parentElement.querySelector(':scope > .teacher-class-advisory-tools');
            if (advisoryTools) sidebar.prepend(advisoryTools);
            syncGradeOverviewTools();
            let studentGradesQuarter=Number(window.sigmaGradesState.activeQuarter)||1;
            const renderStudentQuarter=()=>{
                sidebar.querySelector('[data-student-grades-quarter]').innerHTML=window.renderSharedQuarterDropdown(
                    [1,2,3,4],studentGradesQuarter,q=>`window.setTeacherStudentGradesQuarter(${q})`
                );
                sidebar.querySelector('summary').setAttribute('aria-label','Student grades quarter');
            };
            const renderStudentGradeList=()=>{
                const quarter=studentGradesQuarter;
                const results=[];
                assignments.forEach(item=>{
                    const weights=loadAdminGradebookWeights(item.subject);
                    (window.getStudentsForSection?.(item.sectionName,item.subject)||[]).forEach(student=>{
                        const scoped={...student,section:item.sectionName};
                        const values=['ww','perf. task','qa'].map(category=>window.calculateGradebookCategoryPercentage?.(scoped,category,item.subject,quarter,item.sectionName));
                        if(!values.some(value=>value!==null&&value!==undefined&&Number.isFinite(Number(value))))return;
                        const initial=values.reduce((sum,value,index)=>sum+(Number(value)||0)*Number([weights.ww??25,weights.pt??50,weights.qa??25][index])/100,0);
                        const grade=SigmaGradeEngine.transmute(initial);
                        results.push({name:student.fullName||student.name||[student.firstName,student.lastName].filter(Boolean).join(' ')||'Student',subject:item.subject,section:item.sectionName,grade});
                    });
                });
                if(!results.length){
                    const hasStudents=assignments.some(item=>(window.getStudentsForSection?.(item.sectionName,item.subject)||[]).length>0);
                    const title=!assignments.length?'No Assigned Classes Yet':!hasStudents?'No Students Assigned Yet':'No Grades Recorded Yet';
                    const message=!assignments.length?'Student grades will appear after classes are assigned.':!hasStudents?'Student grades will appear once students are assigned to your classes.':`No student grades recorded for Quarter ${quarter}.`;
                    sidebar.querySelector('[data-student-grade-list]').innerHTML=`<div class="teacher-grades-empty" role="status"><i class="fa-solid fa-chart-simple" aria-hidden="true"></i><h3>${title}</h3><p>${message}</p></div>`;
                    return;
                }
                sidebar.querySelector('[data-student-grade-list]').innerHTML=[{title:'High Grades',values:results.filter(row=>row.grade>=90).sort((a,b)=>b.grade-a.grade)},{title:'Low Grades',values:results.filter(row=>row.grade<75).sort((a,b)=>a.grade-b.grade)}].map(group=>`<section><h4>${group.title}</h4>${group.values.map(row=>`<div class="teacher-student-grade-entry"><div><strong>${escapeHtml(row.name)}</strong><p>${escapeHtml(row.subject)} · ${escapeHtml(row.section)}</p></div><span class="${row.grade<75?'is-low':'is-high'}">${row.grade}</span></div>`).join('')||'<p class="teacher-student-grade-empty">No Students In This Range.</p>'}</section>`).join('');
            };
            window.setTeacherStudentGradesQuarter=quarter=>{
                if(![1,2,3,4].includes(Number(quarter)))return;
                studentGradesQuarter=Number(quarter);
                renderStudentQuarter();
                renderStudentGradeList();
            };
            renderStudentQuarter();
            renderStudentGradeList();
            return;
        }

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
        const weights = loadAdminGradebookWeights(subSec?.subject);
        window.sigmaGradesState.weights = weights;
        const wwWeight = Number(weights.ww ?? 25) / 100;
        const ptWeight = Number(weights.pt ?? 50) / 100;
        const qaWeight = Number(weights.qa ?? 25) / 100;
        const subjectQuarters = (window.getSubjectActiveQuarters?.(subSec.subject) || ['q1','q2'])
            .map(q => Number(String(q).replace(/^q/i,''))).filter(q => q >= 1 && q <= 4);
        const distributionPanelKey = JSON.stringify(['grade-distribution', getEffectiveTeacher()?.id || getEffectiveTeacher()?.uid || getEffectiveTeacher()?.name, subSec.subject, subSec.sectionName]);
        const activeQuarter = window.restorePerformanceQuarter(distributionPanelKey, subjectQuarters);
        window.sigmaGradesState.activeQuarter = activeQuarter;
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
            students = [];
        }

        const totalStudentsCount = students.length || 0;

        const studentQuarterGrades=new Map(students.map(student=>[student,[null,null,null,null]]));
        // Compute metrics for each quarter (1 to 4)
        const quarterMetrics = [1, 2, 3, 4].map(qNum => {
            // First check published quarterly reports
            const published=students.map(student=>{
                const grade=window.getPublishedSubjectGrade?.(student,subSec.subject,subSec.sectionName,qNum)??null;
                if (grade !== null) studentQuarterGrades.get(student)[qNum-1]=grade;
                return grade;
            }).filter(Number.isFinite);
            if (published.length > 0) {
                return {quarter:qNum,avgWw:null,avgPt:null,avgQa:null,avgOverall:published.reduce((sum,value)=>sum+value,0)/published.length,studentFinalGrades:published};
            }
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

                // Official quarter grades come only from advisory publication.
                // Assessment component percentages remain available while grades are being prepared.
            });

            const average = values => values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null;
            const avgWw = average(wwPercentages);
            const avgPt = average(ptPercentages);
            const avgQa = average(qaPercentages);
            const avgOverall = average(studentFinalGrades);

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

        const classGwa = activeQMetric.avgOverall;

        // Grade Distribution breakdown for active quarter
        const gradesForDist = (activeQMetric.studentFinalGrades && activeQMetric.studentFinalGrades.length > 0)
            ? activeQMetric.studentFinalGrades
            : [];

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
        if (classGwa == null) {
            aiMessage = 'No grades recorded yet.';
        } else if (classGwa >= 90) {
            aiMessage = `Outstanding overall academic mastery in ${subSec.subject} (${subSec.sectionName}). The class maintains an exceptional ${classGwa.toFixed(1)} average across quarters with high consistency in Performance Tasks (${activeQMetric.avgPt}%).`;
        } else if (classGwa >= 85) {
            aiMessage = `Very satisfactory academic trajectory in ${subSec.subject} (${subSec.sectionName}). Class GWA is steady at ${classGwa.toFixed(1)}. Written Works (${activeQMetric.avgWw}%) and Performance Tasks (${activeQMetric.avgPt}%) are driving solid quarterly progression.`;
        } else if (classGwa >= 75) {
            aiMessage = `Satisfactory overall progress (GWA: ${classGwa.toFixed(1)}). Recommended focal areas: reinforce preparatory review for Quarterly Assessments and assign targeted remedial activities to assist at-risk learners.`;
        } else {
            aiMessage = `Class average is currently at ${classGwa.toFixed(1)}. Intensive intervention recommended for ${subSec.subject} (${subSec.sectionName}) to ensure all learners meet DepEd DO 8 standards before quarter end.`;
        }

        aiMessage = classGwa == null ? 'No grades recorded yet.' : `${activeQuarterLabel}: Class average ${classGwa.toFixed(1)} across ${gradesForDist.length} graded students. Component scores: WW ${activeQMetric.avgWw ?? '--'}%, PT ${activeQMetric.avgPt ?? '--'}%, QA ${activeQMetric.avgQa ?? '--'}%.`;
        const topSectionHtml = (typeof window.renderSharedAnalyticsTopSectionHtml === 'function')
            ? window.renderSharedAnalyticsTopSectionHtml({
                gwa: classGwa,
                title: 'Class Average',
                aiMessage: aiMessage,
                role: isTeacher ? 'teacher' : 'admin'
            })
            : '';

        let performanceCardsHtml = '';
        if (typeof window.renderSharedSubjectPerformanceCardHtml === 'function') {
            performanceCardsHtml += window.renderSharedSubjectPerformanceCardHtml({
                id: 'class-mastery',
                selectedQuarter: activeQuarter,
                hideChart: true,
                title: 'Overall Class Mastery',
                subtitle: 'DepEd Transmuted Composite',
                overallScore: activeQMetric.avgOverall,
                quarterValues: overallSeries,
                strokeColor: '#15803d'
            });
            performanceCardsHtml += window.renderSharedSubjectPerformanceCardHtml({
                id: 'class-ww',
                selectedQuarter: activeQuarter,
                hideChart: true,
                title: 'Written Works (WW)',
                subtitle: `${weights.ww}% DepEd Weight`,
                overallScore: activeQMetric.avgWw,
                quarterValues: wwSeries,
                strokeColor: '#2563eb'
            });
            performanceCardsHtml += window.renderSharedSubjectPerformanceCardHtml({
                id: 'class-pt',
                selectedQuarter: activeQuarter,
                hideChart: true,
                title: 'Performance Tasks (PT)',
                subtitle: `${weights.pt}% DepEd Weight`,
                overallScore: activeQMetric.avgPt,
                quarterValues: ptSeries,
                strokeColor: '#8b5cf6'
            });
            performanceCardsHtml += window.renderSharedSubjectPerformanceCardHtml({
                id: 'class-qa',
                selectedQuarter: activeQuarter,
                hideChart: true,
                title: 'Quarterly Assessment (QA)',
                subtitle: `${weights.qa}% DepEd Weight`,
                overallScore: activeQMetric.avgQa,
                quarterValues: qaSeries,
                strokeColor: '#f59e0b'
            });
        }

        workspaceContainer.innerHTML = `
            <div class="teacher-grades-analytics space-y-8 font-['Inter'] px-10 pt-6 pb-10">
                ${isTeacher ? `<div class="teacher-analytics-detail-tools"><button type="button" class="sigma-btn sigma-btn-white sigma-btn-md" onclick="window.backToTeacherGradeClasses()"><i class="fa-solid fa-arrow-left" aria-hidden="true"></i><span>Classes</span></button><div><strong>${escapeHtml(subSec.subject)}</strong><p>${escapeHtml(formatGradeSectionDisplay(subSec.sectionName,subSec.grade))}</p></div>${window.getTeacherAssignedSubjectsAndSections(teacher).some(item=>String(item.sectionName).trim().toLowerCase()===String(subSec.sectionName).trim().toLowerCase()&&['adviser','advisor'].includes(String(item.role||'').toLowerCase()))?'<button type="button" class="sigma-btn sigma-btn-primary sigma-btn-md" disabled title="Advisory Class is not connected yet"><i class="fa-solid fa-users" aria-hidden="true"></i><span>Advisory Class</span></button>':''}</div><div class="teacher-quarter-grade-table"><table><thead><tr><th>Student Name</th><th>Student ID</th>${[1,2,3,4].map(q=>`<th>Q${q}</th>`).join('')}<th>Final Grade</th></tr></thead><tbody>${students.map(student=>{const grades=studentQuarterGrades.get(student);const recorded=grades.filter(value=>value!==null);const final=recorded.length===4?Math.round(recorded.reduce((sum,value)=>sum+value,0)/4):null;const display=value=>value===null?'<span class="teacher-quarter-grade-empty">-</span>':escapeHtml(String(value));return `<tr><td>${escapeHtml(student.fullName||student.name||[student.firstName,student.lastName].filter(Boolean).join(' '))}</td><td>${escapeHtml(String(student.lrn||student.studentNumber||student.id||student.uid||''))}</td>${grades.map(value=>`<td>${display(value)}</td>`).join('')}<td>${display(final)}</td></tr>`;}).join('')||'<tr><td colspan="7">No Students Assigned.</td></tr>'}</tbody></table></div>` : ''}
                <!-- Shared Top Section (GWA + AI Insights Card) -->
                ${topSectionHtml}

                <!-- Performance Breakdown Component Cards (Spline Trend Curves) -->
                ${!isTeacher ? `<div class="font-['Inter']">
                    <div class="flex items-center justify-between mb-6 px-2 font-['Inter']">
                        <div>
                            <h3 class="text-xl font-bold text-slate-900 font-['Inter']">Component Performance</h3>
                            <p class="text-xs text-slate-400 font-medium mt-0.5">${escapeHtml(subSec.subject)} — ${escapeHtml(subSec.sectionName)}</p>
                        </div>
                        <div class="flex items-center gap-2 text-xs font-medium text-black-fade font-['Inter']" style="color: rgba(0, 0, 0, 0.45);">
                        </div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4 font-['Inter']">
                        ${performanceCardsHtml}
                    </div>
                </div>

                ` : ''}
                <!-- Summary KPI Row -->
                <div class="hidden grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-['Inter']">
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
                        <div class="text-2xl font-bold text-black">${classGwa == null ? '-' : classGwa.toFixed(1)}</div>
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
                <div class="grade-distribution-panel bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs font-['Inter']">
                    <div class="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                        <div>
                            <h3 class="text-sm font-bold text-black tracking-tight">DepEd Grade Distribution</h3>
                        </div>
                        ${window.renderSharedQuarterDropdown(subjectQuarters,activeQuarter,q=>`window.selectDistributionQuarter(${q})`)}
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
        if (isTeacher) window.refreshTeacherGradeInsight?.(workspaceContainer.querySelector('[data-ai-insight-body]'), {
            subject: subSec.subject, section: subSec.sectionName, selectedQuarter: activeQuarter,
            quarters: quarterMetrics.map(row => ({ quarter: row.quarter, average: row.avgOverall, gradedStudents: row.studentFinalGrades.length,
                writtenWorkPercent: row.avgWw, performanceTaskPercent: row.avgPt, quarterlyAssessmentPercent: row.avgQa }))
        });
        if (!isTeacher) {
            const root=workspaceContainer.querySelector('.teacher-grades-analytics');
            const components=[...root.querySelectorAll('h3')].find(title=>title.textContent==='Component Performance');
            components?.parentElement?.parentElement?.parentElement?.remove();
            const table=document.createElement('div');table.className='teacher-quarter-grade-table';
            const display=value=>value===null?'<span class="teacher-quarter-grade-empty">-</span>':escapeHtml(String(value));
            table.innerHTML=`<table><thead><tr><th>Student Name</th><th>Student ID</th>${[1,2,3,4].map(q=>`<th>Q${q}</th>`).join('')}<th>Final Grade</th></tr></thead><tbody>${students.map(student=>{const grades=studentQuarterGrades.get(student);const final=grades.every(Number.isFinite)?Math.round(grades.reduce((sum,value)=>sum+value,0)/4):null;return `<tr><td>${escapeHtml(student.fullName||student.name||'Student')}</td><td>${escapeHtml(String(student.lrn||student.studentNumber||student.id||student.uid||''))}</td>${grades.map(value=>`<td>${display(value)}</td>`).join('')}<td>${display(final)}</td></tr>`;}).join('')||'<tr><td colspan="7">No Students Assigned.</td></tr>'}</tbody></table>`;
            root.prepend(table);
        }
        if (!gradesForDist.length) {
            const distribution=workspaceContainer.querySelector('.grade-distribution-panel > div:last-child');
            if(distribution)distribution.innerHTML='<p class="teacher-student-grade-empty" role="status">No Published Grades Yet.</p>';
        }
        workspaceContainer.querySelectorAll('.grade-distribution-panel > div:last-child > div > div:first-child > span').forEach(label=>{
            const text=label.textContent;
            const start=text.lastIndexOf('(');
            if(start<0)return;
            const detail=document.createElement('span');detail.className='grade-distribution-parenthesis';detail.textContent=text.slice(start);
            label.replaceChildren(document.createTextNode(text.slice(0,start).trimEnd()),document.createTextNode(' '),detail);
        });
        if (isTeacher || !isCurrentPageTeacherPortal()) {
            if (isTeacher) {
                workspaceContainer.querySelector('.teacher-analytics-detail-tools')?.remove();
                window.setPortalHeader?.('Grades', subSec.subject);
            }
            workspaceContainer.querySelector('.teacher-analytics-detail-tools > button[onclick="window.backToTeacherGradeClasses()"]')?.remove();
            workspaceContainer.querySelector('.teacher-analytics-detail-tools > button[title="Advisory Class is not connected yet"]')?.remove();
            const table = workspaceContainer.querySelector('.teacher-quarter-grade-table');
            if (table) {
                table.classList.add('teacher-mobile-grade-cards');
                table.querySelectorAll('tbody tr').forEach(row => {
                    Array.from(row.cells).slice(2).forEach((cell, index) => {
                        cell.dataset.mobileGradeLabel = ['Q1', 'Q2', 'Q3', 'Q4', 'Final'][index];
                        cell.dataset.gradeLabel = ['1st Quarter', '2nd Quarter', '3rd Quarter', '4th Quarter', 'Final'][index];
                    });
                });
            }
            const quarterNames=['1st Quarter','2nd Quarter','3rd Quarter','4th Quarter'];
            if(students.length)table?.querySelectorAll('tbody tr td:first-child').forEach((cell, rowIndex)=>{
                const studentObj = students[rowIndex] || cell.textContent;
                const nameText = cell.textContent;
                const rawIdText = String(cell.nextElementSibling?.textContent || '').replace(/^ID:\s*/i, '').trim();
                const name=document.createElement('span');name.textContent=nameText;
                const number=document.createElement('span');
                number.className='teacher-quarter-student-number';
                number.textContent=`${rowIndex + 1}. `;
                name.prepend(number);
                const studentId=document.createElement('span');studentId.className='teacher-quarter-mobile-id';
                studentId.textContent=rawIdText ? `ID: ${rawIdText}` : '';
                const nameStack=document.createElement('div');nameStack.className='teacher-quarter-student-details';
                nameStack.append(name, studentId);
                const avatar=document.createElement('span');avatar.className='teacher-quarter-student-avatar';avatar.setAttribute('aria-hidden','true');
                const photo = window.resolveUserAvatar?.(studentObj);
                if (photo) {
                    const escPhoto = (typeof window.escapeHtml === 'function') ? window.escapeHtml(photo) : photo;
                    avatar.innerHTML=`<img src="${escPhoto}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.outerHTML='<i class=\\'fa-solid fa-user\\'></i>'">`;
                } else {
                    avatar.innerHTML='<i class="fa-solid fa-user"></i>';
                }
                const identity=document.createElement('div');identity.className='teacher-quarter-student-name';identity.append(avatar,nameStack);
                cell.replaceChildren(identity);
            });
            table?.querySelectorAll('thead th').forEach((heading,index)=>{
                if(index>=2&&index<=5)heading.innerHTML=`<span class="teacher-quarter-heading-full">${quarterNames[index-2]}</span><span class="teacher-quarter-heading-short">Q${index-1}</span>`;
            });
            if (table) {
                const semesterLabel = window.getGradeSemesterLabel(subjectQuarters);
                const compactSemesterLabel = window.getGradeSemesterLabel(subjectQuarters, true);
                table.querySelector('thead tr').lastElementChild.innerHTML = `<span class="teacher-quarter-heading-full">${semesterLabel}</span><span class="teacher-quarter-heading-short">${compactSemesterLabel}</span>`;
                table.querySelectorAll('tbody tr').forEach(row => {
                    row.lastElementChild.dataset.gradeLabel = semesterLabel;
                    row.lastElementChild.dataset.mobileGradeLabel = compactSemesterLabel;
                });
            }
            const averagePanel = table?.nextElementSibling;
            if (averagePanel) averagePanel.after(table);
            if(table){
                const toggle=document.createElement('button');toggle.type='button';toggle.className='teacher-quarter-mobile-toggle';
                const updateToggle=()=>{
                    const final=table.classList.contains('show-final-grade');
                    toggle.innerHTML=`<i class="fa-solid fa-chevron-${final?'left':'right'}" aria-hidden="true"></i>`;
                    toggle.setAttribute('aria-label',final?'Show Quarterly Grades':'Show Final Grade');
                    toggle.title=final?'Show Quarterly Grades':'Show Final Grade';
                    toggle.setAttribute('aria-pressed',String(final));
                };
                toggle.onclick=()=>{table.classList.toggle('show-final-grade');updateToggle();};
                table.querySelector('thead th:first-child').append(toggle);updateToggle();
            }
            if (table) {
                table.style.setProperty('--teacher-grade-columns', String(subjectQuarters.length + 1));
                const allRows = [table.querySelector('thead tr'), ...table.querySelectorAll('tbody tr')].filter(Boolean);
                allRows.forEach(row => {
                    const cells = Array.from(row.children);
                    if (cells.length < 7) { cells[0]?.setAttribute('colspan', String(subjectQuarters.length + 3)); return; }
                    [1,2,3,4].forEach(q => { if (!subjectQuarters.includes(q)) cells[q + 1].remove(); });
                });
                table.querySelectorAll('tbody tr').forEach((row, index) => {
                    const grades = studentQuarterGrades.get(students[index]);
                    if (!grades || row.cells.length < 4) return;
                    const configuredGrades = subjectQuarters.map(q => grades[q - 1]);
                    const final = configuredGrades.every(Number.isFinite)
                        ? Math.round(configuredGrades.reduce((sum, grade) => sum + grade, 0) / configuredGrades.length) : null;
                    row.lastElementChild.innerHTML = final === null ? '<span class="teacher-quarter-grade-empty">-</span>' : escapeHtml(String(final));
                });
                mountStudentAssessmentBreakdown(table, {
                    students, subSec, subjectQuarters, activeQuarter, weights,
                    studentQuarterGrades
                });
            }
        }
    };

    // Both teacher and admin analytics use the same scoped gradebook breakdown.
    function mountStudentAssessmentBreakdown(table, context) {
        if (!context.students.length) return;
        const list = document.createElement('div');
        list.className = 'teacher-student-performance-list';
        const rows = [...table.querySelectorAll('tbody tr')];
        const sourceTable = table.querySelector('table');
        table.before(list);
        rows.forEach((row, index) => {
            const student = context.students[index];
            if (!student) return;
            const card = table.cloneNode(false);
            const cardTable = sourceTable.cloneNode(false);
            cardTable.append(sourceTable.querySelector('thead').cloneNode(true));
            const body = document.createElement('tbody');
            body.append(row);
            cardTable.append(body);
            card.append(cardTable);
            list.append(card);
            mountIndividualStudentAssessmentBreakdown(card, { ...context, students: [student], breakdownId: `student-assessment-breakdown-${index}` });
        });
        table.remove();
    }

    function mountIndividualStudentAssessmentBreakdown(table, context) {
        const { students, subSec, subjectQuarters, activeQuarter, weights, studentQuarterGrades, breakdownId } = context;
        if (!students.length) return;
        const quarterPanelKey = JSON.stringify(['student-breakdown', getEffectiveTeacher()?.id || getEffectiveTeacher()?.uid || getEffectiveTeacher()?.name, subSec.sectionName, subSec.subject, students[0].id || students[0].uid || students[0].lrn || students[0].fullName || students[0].name]);
        let panelQuarter = window.restorePerformanceQuarter(quarterPanelKey, subjectQuarters);

        const layout = document.createElement('div');
        layout.className = 'teacher-student-performance-layout';
        table.before(layout);
        layout.append(table);
        const panel = document.createElement('aside');
        panel.className = 'student-assessment-breakdown';
        panel.id = breakdownId;
        panel.setAttribute('aria-label', 'Student assessment breakdown');
        panel.innerHTML = `<section class="student-assessment-breakdown-surface" aria-labelledby="${breakdownId}-title">
            <header><h3 id="${breakdownId}-title" class="student-breakdown-heading-icon" aria-label="Assessment Breakdown"><i class="fa-solid fa-chart-simple" aria-hidden="true"></i></h3>
                <div class="student-breakdown-actions"><div data-breakdown-quarter></div></div>
            </header>
            <div data-breakdown-content aria-live="polite"></div>
        </section>`;
        layout.append(panel);
        const rows = [...table.querySelectorAll('tbody tr')];
        const number = value => Number(value.toFixed(1)).toString();
        const hasScore = value => value !== null && value !== undefined && String(value).trim() !== '' && String(value).trim() !== '-' && Number.isFinite(Number(value));
        let returnFocus = null;
        const close = () => {
            panel.classList.remove('is-open');
            const dropdown = panel.querySelector('details');
            if (dropdown) dropdown.open = false;
            panel.querySelector('section').removeAttribute('role');
            panel.querySelector('section').removeAttribute('aria-modal');
            rows.forEach(row => row.querySelector('.student-breakdown-trigger')?.setAttribute('aria-expanded', 'false'));
            returnFocus?.focus();
        };
        const open = trigger => {
            returnFocus = trigger;
            if (!window.matchMedia('(max-width: 767px)').matches) return;
            panel.classList.add('is-open');
            panel.querySelector('section').setAttribute('role', 'dialog');
            panel.querySelector('section').setAttribute('aria-modal', 'true');
            trigger?.setAttribute('aria-expanded', 'true');
            panel.querySelector('summary').focus();
        };
        const render = () => {
            const student = { ...students[0], section: subSec.sectionName };
            const categories = [{ key: 'ww', label: 'Written Work' }, { key: 'pt', label: 'Performance Tasks' }, { key: 'qa', label: 'Quarterly Assessment' }];
            const html = categories.map(({ key, label }) => {
                const items = getAdminGradebookAssessmentItems(key, panelQuarter, subSec.subject, subSec.sectionName);
                let scoreSum = 0, maximum = 0, scored = 0;
                items.forEach((item, index) => {
                    const category = item._category || item.category || key;
                    const itemIndex = item.itemIdx ?? index;
                    const score = getAdminGradebookStudentItemScore(student, category, itemIndex, item, subSec.subject, panelQuarter);
                    if (!hasScore(score)) return;
                    scoreSum += Number(score);
                    maximum += Number(item.max) || 100;
                    scored++;
                });
                const percentage = scored && maximum > 0 ? scoreSum / maximum * 100 : null;
                const weight = Number(weights[key] ?? 0);
                const percentText = percentage === null ? '' : `${number(percentage)}%`;
                const detail = percentage === null ? (items.length ? 'Not yet graded' : 'No assessments') : `${number(scoreSum)} / ${number(maximum)} points · ${number(percentage * weight / 100)} weighted points`;
                const barPercent = percentage === null ? 0 : Math.max(0, Math.min(100, percentage));
                const onFill = percentage !== null && barPercent >= 60;
                return `<div class="student-breakdown-component" title="${escapeHtml(`${label}: ${detail}`)}"><div class="student-breakdown-track" role="img" aria-label="${escapeHtml(`${label}: ${percentage === null ? detail : percentText}`)}"><div style="height:${barPercent}%;background-color:${window.getTaskProgressColor?.(barPercent) || '#15803d'}"></div><strong class="student-breakdown-percent${percentage === null ? ' student-breakdown-missing' : onFill ? ' on-fill' : ''}" style="bottom:${onFill ? barPercent / 2 : 50}%;${percentage === null ? '' : `color:${onFill ? (window.getTaskProgressTextColor?.(barPercent) || '#fff') : '#000'};`}" aria-hidden="true">${percentText}</strong></div><div class="student-breakdown-label"><span>${key.toUpperCase()}%</span></div></div>`;
            }).join('');
            const grade = studentQuarterGrades.get(students[0])?.[panelQuarter - 1];
            const displayGrade = value => Number.isFinite(value)
                ? `<strong>${number(value)}</strong>`
                : '<span class="student-breakdown-missing">-</span>';
            panel.querySelector('[data-breakdown-content]').innerHTML = `<div class="student-breakdown-chart">${html}</div><footer><span>Quarter Grade: ${displayGrade(grade)}</span></footer>`;
        };
        rows.forEach((row, index) => {
            if (!students[index]) return;
            const identity = row.querySelector('.teacher-quarter-student-name');
            if (!identity) return;
            const trigger = document.createElement('button');
            trigger.type = 'button';
            trigger.className = 'student-breakdown-trigger';
            trigger.innerHTML = '<i class="fa-solid fa-chart-simple" aria-hidden="true"></i>';
            trigger.setAttribute('aria-label', `View assessment breakdown for ${students[index].fullName || students[index].name || 'student'}`);
            trigger.setAttribute('aria-controls', breakdownId);
            trigger.setAttribute('aria-expanded', 'false');
            trigger.addEventListener('click', () => open(trigger));
            identity.append(trigger);
        });
        const renderQuarterMenu = () => {
            const slot = panel.querySelector('[data-breakdown-quarter]');
            slot.innerHTML = window.renderSharedQuarterDropdown(subjectQuarters, panelQuarter, () => '');
            slot.querySelector('summary').setAttribute('aria-label', 'Assessment breakdown quarter');
            slot.querySelectorAll('button').forEach((button, index) => {
                button.addEventListener('click', () => {
                    panelQuarter = subjectQuarters[index];
                    window.rememberPerformanceQuarter(quarterPanelKey, panelQuarter);
                    render();
                    renderQuarterMenu();
                    slot.querySelector('summary').focus();
                });
            });
        };

        panel.addEventListener('click', event => { if (event.target === panel) close(); });
        for (const eventName of ['touchmove', 'wheel']) {
            panel.addEventListener(eventName, event => {
                if (panel.classList.contains('is-open') && event.target === panel) event.preventDefault();
            }, { passive: false });
        }
        panel.addEventListener('keydown', event => {
            if (!panel.classList.contains('is-open')) return;
            if (event.key === 'Escape') {
                event.preventDefault();
                const dropdown = panel.querySelector('details[open]');
                if (dropdown) { dropdown.open = false; dropdown.querySelector('summary').focus(); }
                else close();
            }
            if (event.key === 'Tab') {
                const controls = [...panel.querySelectorAll('summary, button')].filter(el => el.getClientRects().length);
                const first = controls[0], last = controls[controls.length - 1];
                if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
                else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
            }
        });
        renderQuarterMenu();
        render();
    }

    window.openAdminGradebookWeightModal = function () {
        if (isCurrentPageTeacherPortal()) return;
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
            const chosen = presets[chosenIdx];
            const unchanged = !chosen || ['ww', 'pt', 'qa'].every(key => Number(chosen[key]) === Number(curWeights[key]));
            modal.innerHTML = `
                <div class="curriculum-hub-panel curriculum-release-panel-fixed weight-modal-card w-full !max-w-[860px] flex flex-col overflow-hidden bg-white border border-slate-200 shadow-2xl rounded-3xl" style="height: 740px; min-height: min(740px, calc(100vh - 40px)); max-height: calc(100vh - 40px); max-width: 860px;" onclick="event.stopPropagation()">
                    <!-- Header -->
                    <div class="px-6 sm:px-8 py-5 border-b border-slate-100 flex items-center justify-between shrink-0 font-['Inter']">
                        <div>
                            <h2 class="text-xl font-bold text-black font-['Inter'] tracking-tight">Assessment Weights</h2>
                            <p class="text-xs font-normal text-black-fade font-['Inter'] mt-0.5" style="color: rgba(0, 0, 0, 0.45);">
                                DepEd Senior High School Grading System Presets
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
                        <button type="button" onclick="window._applyAdminWeightPreset(${chosenIdx})" ${unchanged ? 'disabled' : ''}
                            class="sigma-btn sigma-btn-primary sigma-btn-md cursor-pointer font-['Inter']" style="${unchanged ? 'opacity: 0.45; cursor: not-allowed;' : ''}">
                            <span>Apply Weights</span>
                        </button>
                    </div>
                </div>
            `;
        };

        window._setAdminWeightPreset = (idx) => renderModal(idx);
        window._applyAdminWeightPreset = (idx) => {
            if (isCurrentPageTeacherPortal()) return;
            const chosen = presets[idx] || presets[0];
            if (['ww', 'pt', 'qa'].every(key => Number(chosen[key]) === Number(curWeights[key]))) return;
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
        return window.getGradebookStudentItemScore(student, category, itemIdx, item, subjectId, quarter);
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
        const idEl = tr.querySelector('.gradebook-student-id');
        const nameEl = tr.querySelector('.gradebook-student-name') || tr.querySelector('td:first-child p');
        const student = {
            id: idEl ? idEl.textContent.replace(/^ID:\s*/i, '').trim() : (override?.studentId || ''),
            name: nameEl ? nameEl.textContent.trim() : (override?.studentName || '')
        };
        let rowSum = 0;
        let scoredHPS = 0;
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
            if (score !== null && score !== undefined && String(score).trim() !== '' && String(score).trim() !== '-' && Number.isFinite(Number(score))) {
                rowSum += Number(score);
                scoredHPS += Number(item.max || item.points) || 0;
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
        const pct = scoredHPS > 0 ? ((rowSum / scoredHPS) * 100).toFixed(2) : '0.00';
        pctCell.textContent = pct + '%';
        return true;
    };

    window.toggleMobileGradeTotals = function (button) {
        const table = button.closest('.gb-overview-table');
        if (!table) return;
        const expanded = table.classList.toggle('gb-totals-expanded');
        window.sigmaGradesState.mobileGradesExpanded = expanded;
        button.setAttribute('aria-expanded', String(expanded));
        button.title = expanded ? 'Hide Initial Grade and Quarterly Grade' : 'Show Initial Grade and Quarterly Grade';
        button.setAttribute('aria-label', button.title);
        button.querySelector('i').className = `fa-solid fa-chevron-${expanded ? 'left' : 'right'}`;
        table.parentElement.scrollLeft = 0;
    };

    window.navigateMobileGradebookAssessment = function (direction) {
        const table = document.getElementById('admin-gradebook-spreadsheet');
        if (!table?.classList.contains('gb-detail-table')) return;
        const count = Number(table.dataset.assessmentCount) || 0;
        const index = Number(table.dataset.mobileAssessmentIndex) || 0;
        const next = Math.max(0, Math.min(count, index + direction));
        if (next === index) return;
        window.sigmaGradesState.assessmentPage = Math.floor(next / 4);
        window.sigmaGradesState.mobileAssessmentSlot = next % 4;
        window.renderAdminGradebookWorkspace();
    };

    window.updateGradebookAssessmentNavigation = function () {
        const mobile = window.matchMedia('(max-width: 768px)').matches;
        document.querySelectorAll('.gb-detail-table .gb-responsive-assessment-nav').forEach(button => {
            button.disabled = button.dataset[mobile ? 'mobileDisabled' : 'desktopDisabled'] === 'true';
        });
    };
    window.navigateResponsiveGradebookAssessment = function (direction) {
        if (window.matchMedia('(max-width: 768px)').matches) window.navigateMobileGradebookAssessment(direction);
        else window.navigateGradebookAssessmentPage(direction);
    };
    window.matchMedia('(max-width: 768px)').addEventListener('change', window.updateGradebookAssessmentNavigation);

    window.toggleMobileAssessmentSummary = function (button) {
        const table = button.closest('.gb-detail-table');
        if (!table) return;
        const expanded = table.classList.toggle('gb-detail-summary');
        window.sigmaGradesState.mobileAssessmentSummary = expanded;
        button.setAttribute('aria-expanded', String(expanded));
        button.querySelector('span').textContent = expanded ? 'Assessments' : 'Summary';
        const chevron = button.querySelector('i');
        chevron.classList.toggle('fa-chevron-left', expanded);
        chevron.classList.toggle('fa-chevron-right', !expanded);
        button.title = expanded ? 'Show assessments' : 'Show Total and Score %';
        table.parentElement.scrollLeft = 0;
    };

    window.setMobileAssessmentView = function (button, summary) {
        const container = button.closest('.gb-detail-workspace');
        const table = container?.querySelector('.gb-detail-table');
        if (!table) return;
        table.classList.toggle('gb-detail-summary', summary);
        window.sigmaGradesState.mobileAssessmentSummary = summary;
        container.querySelectorAll('[data-mobile-assessment-view]').forEach(control => {
            control.setAttribute('aria-pressed', String((control.dataset.mobileAssessmentView === 'summary') === summary));
        });
        container.scrollLeft = 0;
    };

    const mobileGradeStatusLegend = () => '<div class="gb-mobile-status-key gb-status-key" aria-label="Score status key"><span><i class="gb-key-swatch gb-key-missing"></i>Missing</span><span><i class="gb-key-swatch gb-key-absent"></i>Absent</span><span><i class="gb-key-swatch gb-key-incomplete"></i>Incomplete</span><span><i class="gb-key-swatch gb-key-excuse"></i>Excuse</span></div>';

    window.toggleMobileGradebookSummary = function (button) {
        const container = button.closest('.gb-summary-workspace');
        const table = container?.querySelector('#admin-gradebook-spreadsheet');
        if (!table) return;
        const overview = table.classList.contains('gb-overview-table');
        const selected = table.classList.toggle(overview ? 'gb-totals-expanded' : 'gb-detail-summary');
        window.sigmaGradesState[overview ? 'mobileGradesExpanded' : 'mobileAssessmentSummary'] = selected;
        button.setAttribute('aria-pressed', String(selected));
        container.scrollLeft = 0;
    };

    window.setSigmaGradebookView = function (view) {
        const normalizedView = (view === 'ww-sub' || view === 'written-works' || view === 'written_works') ? 'ww' : (view || 'overview');
        if (!window.sigmaGradesState) {
            window.sigmaGradesState = {};
        }
        window.sigmaGradesState.currentView = normalizedView;
        window.sigmaGradesState.assessmentPage = 0;
        window.sigmaGradesState.mobileAssessmentSlot = 0;
        window.sigmaGradesState.mobileAssessmentSummary = false;
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

    window.syncClassroomGradebookHeader = function () {
        if (!isCurrentPageTeacherPortal() || window.sigmaGradesState?.activeTab !== 'gradebook' || window.location.hash.endsWith(':share-record')) return false;
        const subject = window.sigmaGradesState.selectedSubjectSection?.subject || window._classroomGradebookContext?.subject;
        window.setPortalHeader?.('My Classes', subject || 'Classrooms');
        return true;
    };

    window.renderAdminGradebookWorkspace = function () {
        if (window.sigmaGradesState.activeTab !== 'gradebook') return;
        window.syncClassroomGradebookHeader();
        const workspaceContainer = document.getElementById('admin-gradebook-workspace-content');
        if (!workspaceContainer) return;

        const isTeacher = isCurrentPageTeacherPortal();
        const teacher = getEffectiveTeacher();
        const subSec = window.sigmaGradesState.selectedSubjectSection;

        if (!isTeacher && (!teacher || !subSec)) {
            const title = !teacher ? 'Select a Teacher' : 'No Subject Selected';
            const message = !teacher ? 'Select a teacher to view their gradebook.' : 'Select a subject and section to view student grades.';
            workspaceContainer.innerHTML = `
                <div class="gb-summary-workspace gb-empty-workspace flex-1 w-full h-full min-h-0 overflow-y-auto overflow-x-auto bg-white border-none rounded-none shadow-none font-['Inter'] px-10">
                    <div class="gb-status-key gb-empty-status-key" aria-label="Score status key">
                        <span><i class="gb-key-swatch gb-key-missing"></i>Missing</span>
                        <span><i class="gb-key-swatch gb-key-absent"></i>Absent</span>
                        <span><i class="gb-key-swatch gb-key-incomplete"></i>Incomplete</span>
                        <span><i class="gb-key-swatch gb-key-excuse"></i>Excuse</span>
                    </div>
                    <table class="gb-empty-table w-full min-w-[700px] border-collapse table-fixed font-['Inter']" aria-label="Gradebook" data-empty-state="true">
                        <colgroup><col class="gb-empty-roster-number" style="width:48px"><col style="width:calc(25% - 48px)">${Array(5).fill('<col style="width:15%">').join('')}</colgroup>
                        <thead class="bg-[#15803d] text-white">
                            <tr><th scope="col" class="gb-empty-roster-number px-4 py-4 text-center text-sm font-semibold">No.</th>${['Students', 'Written Works', 'Performance Task', 'Quarterly Assessment', 'Initial Grade', 'Quarterly Grade'].map(label => `<th scope="col" class="px-4 py-4 text-center text-sm font-semibold">${label}</th>`).join('')}</tr>
                        </thead>
                        <tbody><tr><td colspan="7" class="px-6 py-16 text-center">
                            <i class="fa-solid fa-table-cells text-3xl mb-4" style="color:rgba(0,0,0,0.45)" aria-hidden="true"></i>
                            <h3 class="text-base font-semibold text-black">${title}</h3>
                            <p class="text-sm mt-2" style="color:rgba(0,0,0,0.45)">${message}</p>
                        </td></tr></tbody>
                    </table>
                </div>`;
            return;
        }

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
        const wwWeight = Number(weights.ww ?? 25) / 100;
        const ptWeight = Number(weights.pt ?? 50) / 100;
        const qaWeight = Number(weights.qa ?? 25) / 100;
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

        const rosterNumbers = new Map(students.map(student => [student, window.getRecordCreationNumber(student, students, 'users')]));
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
                            <p class="gradebook-student-name text-xs md:text-sm font-semibold text-slate-900 truncate leading-snug font-['Inter']"><span class="gb-roster-inline">${rosterNumbers.get(s)}. </span>${escapeHtml(s.name || s.fullName || 'Student')}</p>
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
            const exportRows = [];
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

const wwDisplay = (wwVal !== null && wwVal !== undefined) ? `${(Number(wwVal) * wwWeight).toFixed(2)}%` : '<span class="gradebook-dash" style="color: rgba(0, 0, 0, 0.40) !important;">-</span>';
                const ptDisplay = (ptVal !== null && ptVal !== undefined) ? `${(Number(ptVal) * ptWeight).toFixed(2)}%` : '<span class="gradebook-dash" style="color: rgba(0, 0, 0, 0.40) !important;">-</span>';
                const qaDisplay = (qaVal !== null && qaVal !== undefined) ? `${(Number(qaVal) * qaWeight).toFixed(2)}%` : '<span class="gradebook-dash" style="color: rgba(0, 0, 0, 0.40) !important;">-</span>';

                let initialGrade = null;
                if (wwVal !== null || ptVal !== null || qaVal !== null) {
                    let tot = 0;
                    let availableWeight = 0;
                    if (wwVal !== null && wwVal !== undefined) { tot += Number(wwVal) * wwWeight; availableWeight += wwWeight; }
                    if (ptVal !== null && ptVal !== undefined) { tot += Number(ptVal) * ptWeight; availableWeight += ptWeight; }
                    if (qaVal !== null && qaVal !== undefined) { tot += Number(qaVal) * qaWeight; availableWeight += qaWeight; }
                    initialGrade = availableWeight > 0 ? tot : null;
                }

                const initialDisplay = initialGrade !== null ? `${Number(initialGrade).toFixed(2)}%` : '<span class="gradebook-dash" style="color: rgba(0, 0, 0, 0.40) !important;">-</span>';
                const finalDisplay = initialGrade !== null ? `${SigmaGradeEngine.transmute(initialGrade)}` : '<span class="gradebook-dash" style="color: rgba(0, 0, 0, 0.40) !important;">-</span>';
                exportRows.push({ student: s, percentages: [wwVal, ptVal, qaVal], initial: initialGrade,
                    quarterly: initialGrade === null ? null : SigmaGradeEngine.transmute(initialGrade) });

                return `
                    <tr class="bg-white border-b border-black/[0.08] font-['Inter'] cursor-default select-none">
                        <td class="gb-roster-number">${rosterNumbers.get(s)}</td>
                        ${renderStudentCell(s)}
                        <td class="gb-mobile-total gb-summary-green text-center" title="Initial Grade">${initialDisplay}</td>
                        <td class="gb-mobile-total gb-summary-green text-center" title="Quarterly Grade">${finalDisplay}</td>
                        <td class="px-4 py-3.5 text-center border-b border-black/[0.08] text-xs md:text-sm font-medium transition-colors align-middle gb-data-cell ${wwVal !== null ? 'text-slate-900 font-semibold' : 'text-black/40 font-normal'}">
                            ${wwDisplay}
                        </td>
                        <td class="px-4 py-3.5 text-center border-b border-black/[0.08] text-xs md:text-sm font-medium transition-colors align-middle gb-data-cell ${ptVal !== null ? 'text-slate-900 font-semibold' : 'text-black/40 font-normal'}">
                            ${ptDisplay}
                        </td>
                        <td class="gb-col-divider px-4 py-3.5 text-center border-b border-black/[0.08] text-xs md:text-sm font-medium transition-colors align-middle gb-data-cell ${qaVal !== null ? 'text-slate-900 font-semibold' : 'text-black/40 font-normal'}">
                            ${qaDisplay}
                        </td>
                        <td class="gb-desktop-total px-4 py-3.5 text-center border-b border-black/[0.08] text-xs md:text-sm font-bold text-slate-900 tracking-wide transition-colors align-middle gb-data-cell gb-summary-green" style="background-color: rgba(16, 185, 129, 0.08);">
                            ${initialDisplay}
                        </td>
                        <td class="gb-desktop-total px-4 py-3.5 text-center border-b border-black/[0.08] text-xs md:text-sm font-bold ${initialGrade !== null ? 'text-slate-900' : 'text-black/40'} tracking-wide transition-colors align-middle gb-data-cell gb-summary-green" style="background-color: rgba(16, 185, 129, 0.08);">
                            ${finalDisplay}
                        </td>
                    </tr>
                `;
            }).join('');

            workspaceContainer.innerHTML = `
                <div class="gb-summary-workspace flex-1 w-full h-full min-h-0 overflow-y-auto overflow-x-auto bg-white border-none rounded-none shadow-none font-['Inter'] px-10">
                    <div class="gb-mobile-view-switch">${mobileGradeStatusLegend()}<button type="button" aria-label="Grade summary" aria-pressed="${Boolean(window.sigmaGradesState.mobileGradesExpanded)}" onclick="window.toggleMobileGradebookSummary(this)"><span>Summary</span><span class="gb-summary-icon" aria-hidden="true"><i class="fa-solid fa-table"></i><i class="fa-solid fa-chevron-down"></i></span></button></div>
                    <table id="admin-gradebook-spreadsheet" class="gb-overview-table ${window.sigmaGradesState.mobileGradesExpanded ? 'gb-totals-expanded' : ''} w-full min-w-[700px] border-collapse table-fixed font-['Inter'] rounded-none shadow-none">
                        <colgroup>
                            <col class="gb-roster-number" style="width:48px;">
                            <col class="gb-roster-name-col" style="width:calc(25% - 48px); min-width:192px;">
                            <col class="gb-mobile-total">
                            <col class="gb-mobile-total">
                            <col style="width: 15%; min-width: 120px;">
                            <col style="width: 15%; min-width: 120px;">
                            <col style="width: 15%; min-width: 120px;">
                            <col class="gb-desktop-total" style="width: 15%; min-width: 110px;">
                            <col class="gb-desktop-total" style="width: 15%; min-width: 110px;">
                        </colgroup>
                        <thead class="sticky top-0 z-30 bg-[#15803d] shadow-xs rounded-none border-b border-[#166534]">
                            <tr class="border-b border-[#166534] bg-[#15803d] rounded-none h-[52px]">
                                <th class="gb-roster-number" scope="col">No.</th>
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
                                <th class="gb-mobile-total bg-[#15803d] text-white text-center"><span>Initial<br>Grade</span></th>
                                <th class="gb-mobile-total bg-[#15803d] text-white text-center"><span>Quarterly<br>Grade</span></th>
                                <th class="gb-component-header px-4 py-2 text-center bg-[#15803d] select-none rounded-none align-middle">
                                    <button type="button" class="gb-component-cell-button" onclick="window.setSigmaGradebookView('ww')" aria-label="View Written Works breakdown" title="View Written Works breakdown"></button>
                                    <div class="flex flex-col items-center justify-center leading-tight">
                                        <div class="inline-flex items-center justify-center gap-1.5 leading-none">
                                            <span class="gb-component-label text-xs md:text-sm font-semibold text-white tracking-normal font-['Inter'] select-none" title="Written Works"><span class="gb-component-full">Written Works</span><span class="gb-component-short">WW</span></span>
                                        </div>
                                        <span class="text-[11px] font-medium text-white/80 mt-0.5 select-none font-['Inter']">${weights.ww}%</span>
                                    </div>
                                </th>
                                <th class="gb-component-header px-4 py-2 text-center bg-[#15803d] select-none rounded-none align-middle">
                                    <button type="button" class="gb-component-cell-button" onclick="window.setSigmaGradebookView('pt')" aria-label="View Performance Task breakdown" title="View Performance Task breakdown"></button>
                                    <div class="flex flex-col items-center justify-center leading-tight">
                                        <div class="inline-flex items-center justify-center gap-1.5 leading-none">
                                            <span class="gb-component-label text-xs md:text-sm font-semibold text-white tracking-normal font-['Inter'] select-none" title="Performance Task"><span class="gb-component-full">Performance Task</span><span class="gb-component-short">PT</span></span>
                                        </div>
                                        <span class="text-[11px] font-medium text-white/80 mt-0.5 select-none font-['Inter']">${weights.pt}%</span>
                                    </div>
                                </th>
                                <th class="gb-component-header gb-col-divider px-4 py-2 text-center bg-[#15803d] select-none rounded-none align-middle">
                                    <button type="button" class="gb-component-cell-button" onclick="window.setSigmaGradebookView('qa')" aria-label="View Quarterly Assessment breakdown" title="View Quarterly Assessment breakdown"></button>
                                    <div class="flex flex-col items-center justify-center leading-tight">
                                        <div class="inline-flex items-center justify-center gap-1.5 leading-none">
                                            <span class="gb-component-label text-xs md:text-sm font-semibold text-white tracking-normal font-['Inter'] select-none" title="Quarterly Assessment"><span class="gb-component-full">Quarterly Assessment</span><span class="gb-component-short">QA</span></span>
                                        </div>
                                        <span class="text-[11px] font-medium text-white/80 mt-0.5 select-none font-['Inter']">${weights.qa}%</span>
                                    </div>
                                </th>
                                <th class="gb-desktop-total px-4 py-2 text-center bg-[#15803d] cursor-default select-none rounded-none align-middle">
                                    <div class="flex flex-col items-center justify-center leading-tight">
                                        <span class="text-xs md:text-sm font-semibold text-white tracking-normal font-['Inter']">Initial Grade</span>
                                    </div>
                                </th>
                                <th class="gb-desktop-total px-4 py-2 text-center bg-[#15803d] cursor-default select-none rounded-none align-middle">
                                    <div class="flex flex-col items-center justify-center leading-tight">
                                        <span class="text-xs md:text-sm font-semibold text-white tracking-normal font-['Inter']">Quarterly Grade</span>
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
            window._gradebookExportSnapshot = { subject: subSec.subject, section: subSec.sectionName,
                quarter: currentQ, weights, teacher, rows: exportRows };
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
        const totalPages = Math.max(1, Math.ceil((items.length + 1) / PAGE_SIZE));
        let currentPage = window.sigmaGradesState.assessmentPage || 0;
        if (currentPage >= totalPages) currentPage = totalPages - 1;
        if (currentPage < 0) currentPage = 0;
        window.sigmaGradesState.assessmentPage = currentPage;

        const startIndex = currentPage * PAGE_SIZE;
        const visibleItems = items.slice(startIndex, startIndex + PAGE_SIZE);
        const mobileSlot = Math.max(0, Math.min(Number(window.sigmaGradesState.mobileAssessmentSlot) || 0, Math.min(3, items.length - startIndex)));
        const mobileIndex = startIndex + mobileSlot;
        const mobileSummary = Boolean(window.sigmaGradesState.mobileAssessmentSummary);

        const rowsHtml = students.map((s) => {
            let rowScoreSum = 0;
            let scoredHPS = 0;
            let rowHasAny = false;
            const itemScores = new Map();

            // Calculate total across all items in component
            items.forEach((it, allIdx) => {
                const itCat = it._category || it.category || detailCategory;
                const itIdx = (it.itemIdx !== undefined) ? it.itemIdx : allIdx;
                const sc = getAdminGradebookStudentItemScore(s, itCat, itIdx, it, subSec.subject, currentQ);
                itemScores.set(it, sc);
                if (sc !== null && sc !== undefined && String(sc).trim() !== '' && String(sc).trim() !== '-' && Number.isFinite(Number(sc))) {
                    rowScoreSum += Number(sc);
                    scoredHPS += Number(it.max || it.points) || 0;
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
                    const isSubmitted = typeof window.findAssessmentSubmittedWork === 'function'
                        ? Boolean(window.findAssessmentSubmittedWork(s, it, it.subjectId || subSec.subject, subSec.sectionName, currentQ))
                        : hasSubmission;
                    const isQuizItem = Boolean(itCat.includes('quiz') || it.quizId || itemSource.quizId || /quiz/i.test(taskTitle));
                    const lockTitle = isQuizItem ? 'Locked: Student must submit the quiz first to unlock grading' : 'Locked: Student must submit coursework first to unlock grading';
                    if (!it.offline && !isSubmitted && !hasRecordedScore && !window.resolveNoDeadlineAssessment?.(it, it.subjectId || subSec.subject, subSec.sectionName, currentQ)) {
                        itemCellsHtml += `
                        <td class="gradebook-task-cell ${slotIdx === mobileSlot ? 'gb-mobile-current-assessment' : ''} px-1 py-3 text-center border-b border-black/[0.08] text-xs md:text-sm font-normal align-middle gb-data-cell text-black/40 cursor-not-allowed select-none transition-colors"
                            data-locked="1"
                            data-unsubmitted="1"
                            data-student-id="${studentId}"
                            data-student-name="${studentName}"
                            data-category="${String(itCat).replace(/"/g, '&quot;')}"
                            data-item-idx="${itIdx}"
                            data-subject="${String(it.subjectId || subSec.subject || '').replace(/"/g, '&quot;')}"
                            data-section="${escapeHtml(subSec.sectionName || '')}"
                            data-quarter="${currentQ}"
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
                        <td class="gradebook-task-cell ${slotIdx === mobileSlot ? 'gb-mobile-current-assessment' : ''} px-1 py-3 text-center border-b border-black/[0.08] text-xs md:text-sm font-bold align-middle gb-data-cell cursor-text ${mark ? `gb-cell-${mark.tone} gradebook-status-${mark.tone}` : ''}"
                            data-locked="0"
                            data-unsubmitted="0"
                            data-score="${clampedScore}"
                            data-max="${maxPts}"
                            data-student-id="${studentId}"
                            data-student-name="${studentName}"
                            data-category="${String(itCat).replace(/"/g, '&quot;')}"
                            data-item-idx="${itIdx}"
                            data-subject="${String(it.subjectId || subSec.subject || '').replace(/"/g, '&quot;')}"
                            data-section="${escapeHtml(subSec.sectionName || '')}"
                            data-quarter="${currentQ}"
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
                    itemCellsHtml += `<td class="gradebook-task-cell ${slotIdx === mobileSlot ? 'gb-mobile-current-assessment' : ''} gb-empty-cell border-b border-black/[0.08]"></td>`;
                }
            }

            const totalDisplay = rowHasAny ? rowScoreSum : null;
            const pctDisplay = (totalDisplay !== null && scoredHPS > 0)
                ? Math.max(0, Math.min(100, (totalDisplay / scoredHPS) * 100)).toFixed(2)
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
                const topicTag = it.offline ? 'Manual' : (topicNum ? `Topic ${topicNum}` : '');

                let formattedDate = (typeof window.formatDateTitleCase === 'function') ? window.formatDateTitleCase(it.date) : (it.date || 'Date');
                if (formattedDate.includes('•')) formattedDate = formattedDate.split('•')[0].trim();
                formattedDate = formattedDate.replace(/\s+(at\s+)?\d{1,2}:\d{2}(:\d{2})?(\s*[ap]m)?$/i, '').trim();
                const rawTitle = String(it.title || `${categoryTitle} #${startIndex + slotIdx + 1}`);
                const topicFullTooltip = it.topicTitle ? `${topicTag ? topicTag + ': ' : ''}${it.topicTitle} — ${rawTitle}` : (topicTag ? `${topicTag} — ${rawTitle}` : rawTitle);
                const titleLen = rawTitle.length;
                const titleSizeClass = titleLen > 24 ? 'text-[10.5px]' : (titleLen > 14 ? 'text-[11.5px]' : 'text-[12.5px]');
                const itCat = detailCategory === 'ww' ? (it._category || it.category || detailCategory) : detailCategory;
                const itIdx = (it.itemIdx !== undefined) ? it.itemIdx : (startIndex + slotIdx);
                const isFake = Boolean(it.isFake || it.isMock);

                const titleHtml = it.offline
                    ? `<span class="font-bold text-white text-center block w-full leading-tight select-none cursor-default ${titleSizeClass}">${escapeHtml(rawTitle)}</span>`
                    : isFake
                    ? `<span class="font-bold text-white text-center block w-full leading-tight gradebook-task-title select-none cursor-default ${titleSizeClass}" 
                             title="${escapeHtml(topicFullTooltip)}">
                           ${escapeHtml(rawTitle)}
                       </span>`
                    : `<span class="font-bold text-white text-center block w-full leading-tight gradebook-task-title ${titleSizeClass}"
                             title="${escapeHtml(topicFullTooltip)}">
                           ${escapeHtml(rawTitle)}
                       </span>`;

                taskHeadersHtml += `
                    <th class="gradebook-task-header-cell ${slotIdx === mobileSlot ? 'gb-mobile-current-assessment' : ''} ${isFake || it.offline ? '' : 'gb-component-header'} bg-[#15803d] cursor-default select-none rounded-none align-middle border-b border-[#166534]">
                        ${isFake || it.offline ? '' : `<button type="button" class="gb-component-cell-button" aria-label="${escapeHtml('Open assessment: ' + rawTitle)}" title="${escapeHtml(topicFullTooltip)}" onclick="window.navigateToAssessmentFromGradebook('${itCat}', ${itIdx}, '${escapeHtml(subSec?.subject || '')}', '${escapeHtml(subSec?.sectionName || '')}')"></button>`}
                        <div class="gb-assessment-header-content flex flex-col items-center justify-between w-full h-[58px] py-1 select-none font-['Inter']">
                            <div class="flex items-center gap-1.5 leading-none">
                                <span class="text-[10px] font-semibold text-white tracking-tight leading-none">${formattedDate}</span>
                                ${topicTag ? `<span class="text-[9px] font-bold text-[#FFD000] bg-black/20 px-1.5 py-0.5 rounded tracking-tight leading-none">${topicTag}</span>` : ''}
                                ${it.offline ? `<button type="button" class="gb-manual-menu-trigger" aria-label="Edit or delete manual assessment" title="Edit or delete" onclick="window.openOfflineAssessmentMenu(event, '${escapeHtml(it.id)}')"><i class="fa-solid fa-ellipsis-vertical" aria-hidden="true"></i></button>` : ''}
                            </div>
                            ${titleHtml}
                            <span class="text-[10px] font-medium leading-none text-white/90">HPS: ${it.max || 100} pts</span>
                        </div>
                    </th>
                `;
            } else {
                taskHeadersHtml += `
                    <th class="gradebook-task-header-cell ${slotIdx === mobileSlot ? 'gb-mobile-current-assessment' : ''} ${startIndex + slotIdx === items.length ? 'gb-add-assessment-cell' : ''} bg-[#15803d]/80 cursor-default select-none gb-empty-cell rounded-none align-middle border-b border-[#166534]">
                        <div class="flex flex-col items-center justify-center w-full h-[54px]">${startIndex + slotIdx === items.length ? '<button type="button" class="gb-add-assessment-desktop" title="Add Assessment" aria-label="Add Assessment" onclick="window.openOfflineAssessmentForm()"><i class="fa-solid fa-plus"></i></button>' : ''}</div>
                    </th>
                `;
            }
        }

        workspaceContainer.innerHTML = `
            <div class="gb-summary-workspace gb-detail-workspace flex-1 w-full h-full min-h-0 overflow-y-auto overflow-x-auto bg-white border-none rounded-none shadow-none font-['Inter'] px-4 md:px-6 xl:px-8">
                <div class="gb-mobile-view-switch">
                    ${mobileGradeStatusLegend()}
                    <button type="button" title="Choose Assessment" aria-label="Choose Assessment" onclick="window.openGradebookAssessmentPicker()"><i class="fa-solid fa-list"></i></button>
                    <button type="button" data-mobile-assessment-view="summary" aria-label="Assessment summary" aria-pressed="${mobileSummary}" onclick="window.toggleMobileGradebookSummary(this)"><span>Summary</span><span class="gb-summary-icon" aria-hidden="true"><i class="fa-solid fa-table"></i><i class="fa-solid fa-chevron-down"></i></span></button>
                </div>
                <table id="admin-gradebook-spreadsheet" data-assessment-count="${items.length}" data-mobile-assessment-index="${mobileIndex}" class="gb-detail-table ${mobileSummary ? 'gb-detail-summary' : ''} w-full min-w-[700px] border-collapse table-fixed font-['Inter'] rounded-none shadow-none">
                    <thead class="sticky top-0 z-30 bg-[#15803d] shadow-xs rounded-none border-b border-[#166534]">
                        <tr class="border-b border-[#166534] bg-[#15803d] rounded-none h-[52px]">
                            <th class="gb-detail-student-header w-[280px] min-w-[280px] max-w-[280px] px-3.5 py-3 bg-[#15803d] sticky left-0 z-40 select-none rounded-none align-middle border-b border-[#166534]">
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
                                <button type="button" onclick="window.navigateResponsiveGradebookAssessment(-1)" class="gb-thin-nav-btn gb-responsive-assessment-nav" data-desktop-disabled="${currentPage === 0}" data-mobile-disabled="${mobileIndex === 0 || items.length === 0}" title="Previous Assessments" aria-label="Previous assessment">
                                    <i class="fa-solid fa-chevron-left text-[9px]"></i>
                                </button>
                            </th>
                            ${taskHeadersHtml}
                            <th class="gb-col-divider gb-thin-nav-col bg-[#15803d] cursor-default select-none align-middle border-b border-[#166534]">
                                <button type="button" onclick="window.navigateResponsiveGradebookAssessment(1)" class="gb-thin-nav-btn gb-responsive-assessment-nav" data-desktop-disabled="${currentPage >= totalPages - 1}" data-mobile-disabled="${mobileIndex >= items.length}" title="Next Assessments" aria-label="Next assessment">
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
        window.updateGradebookAssessmentNavigation();
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
        window.closeGradesSubmitExportMenu();
        if (!window.sigmaGradesState) window.sigmaGradesState = {};
        const previousTab = window.sigmaGradesState.activeTab;
        window.sigmaGradesState.activeTab = tabId;
        if (!isCurrentPageTeacherPortal() && tabId === 'gradebook') window.sigmaGradesState.teacherAdvisoryView = false;
        saveSigmaGradesState();

        // Update URL hash if currently on a grades section so refresh keeps the exact sub-tab
        const isTeacher = (window.sigmaGradesState && window.sigmaGradesState.isTeacherPage) || isCurrentPageTeacherPortal();
        if (isTeacher && !window.location.hash.endsWith(':share-record')) {
            if (!window.syncClassroomGradebookHeader()) window.setNavContext?.('Grades');
        }
        const currentHash = window.location.hash || '';
        if (currentHash.startsWith('#grades') || currentHash.startsWith('#school-grades') || currentHash === '#nav-school-grades' || currentHash === '#analytics' || currentHash === '#gradebooks' || currentHash === '#gradebook') {
            const basePrefix = isTeacher ? '#grades' : '#school-grades';
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
                const workspace = document.getElementById('admin-gradebook-workspace-content');
                if (previousTab !== tabId || !workspace?.hasChildNodes()) {
                    window.renderAdminGradebookWorkspace();
                }
            } else {
                gradebookView.classList.add('hidden');
                analyticsView.classList.remove('hidden');
                const workspace = document.getElementById('admin-analytics-workspace-content');
                if (previousTab !== tabId || !workspace?.hasChildNodes()) {
                    window.renderAdminAnalyticsWorkspace();
                }
            }
        }

        const actBtns = document.getElementById('admin-gradebook-action-buttons');
        if (actBtns) {
            if (tabId === 'gradebook' && window.sigmaGradesState.selectedSubjectSection) {
                actBtns.classList.remove('hidden');
                actBtns.style.setProperty('display', window.sigmaGradesState.isTeacherPage ? 'contents' : 'flex', window.sigmaGradesState.isTeacherPage ? 'important' : '');
            } else {
                actBtns.classList.add('hidden');
                actBtns.style.setProperty('display', 'none', 'important');
            }
        }

        if (typeof window.syncTeacherGradesNavState === 'function') {
            window.syncTeacherGradesNavState(tabId);
        }
        window.updateAdminSharedNavbarUI();
    };

    window.switchTeacherGradesTab = window.switchAdminGradesTab;

    for (const name of ['renderAdminGradebookWorkspace', 'renderAdminAnalyticsWorkspace']) {
        const render = window[name];
        window[name] = function (...args) {
            const tab = name === 'renderAdminGradebookWorkspace' ? 'gradebook' : 'analytics';
            if (window.sigmaGradesState?.activeTab !== tab) return;
            const workspaceId = tab === 'gradebook' ? 'admin-gradebook-workspace-content' : 'admin-analytics-workspace-content';
            const workspace = document.getElementById(workspaceId);
            if (!workspace || workspace.closest('.hidden, [hidden]')) return;
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

        const state = window.sigmaGradesState;
        if (options.quarter) state.activeQuarter = options.quarter;
        if (options.strand) state.activeStrand = options.strand;
        if (options.section) state.selectedSection = options.section;
        if (options.subject) state.selectedSubject = options.subject;
        if (options.role) state.role = options.role;
        if (options.tab) state.activeTab = options.tab;

        state.isTeacherPage = isTeacherPage;
        if (!isTeacherPage && window._pendingAdminClassroomGrades) {
            const request = window._pendingAdminClassroomGrades;
            const normalize = value => String(value || '').trim().toLowerCase().replace(/^grade\s*\d+\s*[-:]?\s*/i, '').replace(/\s+/g, ' ');
            let match = null;
            for (const teacher of window.getAdminTeacherList()) {
                const assignment = window.getTeacherAssignedSubjectsAndSections(teacher).find(item =>
                    normalize(item.sectionName) === normalize(request.section) && normalize(item.subject) === normalize(request.subject));
                if (assignment) { match = { teacher, assignment }; break; }
            }
            if (match) {
                state.selectedTeacher = match.teacher;
                state.selectedSubjectSection = match.assignment;
                state.selectedSection = match.assignment.sectionName;
                state.selectedSubject = match.assignment.subject;
                state.currentView = 'overview';
                state.activeTab = 'gradebook';
            }
            delete window._pendingAdminClassroomGrades;
        }
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
            if (detailRequest.mobileAssessmentSlot !== undefined) {
                state.mobileAssessmentSlot = Number(detailRequest.mobileAssessmentSlot) || 0;
                state.mobileAssessmentSummary = false;
            }
            if (detailRequest.quarter) state.activeQuarter = Number(detailRequest.quarter);
            if (typeof gradebookState !== 'undefined' && gradebookState) {
                gradebookState.currentView = state.currentView;
                gradebookState.assessmentPage = state.assessmentPage || 0;
                gradebookState.selectedSection = state.selectedSection || '';
                gradebookState.selectedSubject = state.selectedSubject || '';
            }
        }

        saveSigmaGradesState();

        if (!window.syncClassroomGradebookHeader()) {
            window.setPortalHeader?.('Grades', state.activeTab === 'gradebook' ? 'Gradebooks' : (isTeacherPage ? 'Subject Classes' : 'Analytics'));
        }
        container.innerHTML = `
            <div class="sigma-grades-page ${isTeacherPage ? '' : 'sigma-grades-page--admin'} flex flex-col flex-1 w-full h-full bg-white min-h-0 border-b border-slate-200">
                ${isTeacherPage && state.activeTab === 'gradebook' && window.ClassroomRoom?.renderTabBar ? `<div class="classroom-gradebook-navigation">${window.ClassroomRoom.renderTabBar({ role: 'teacher', activeTab: 'gradebook' })}</div>` : ''}
                
                <!-- Page Header (Exact Standard Parity with Sections & Subjects: px-10 py-8) -->
                <div class="px-10 py-8 flex justify-between items-center ${isTeacherPage ? 'hidden' : ''}" ${isTeacherPage ? 'style="display:none"' : ''}>
                    <div class="sigma-header-tab-group">
                        ${['gradebook', 'analytics'].map((tab, index) => `
                            ${index ? '<span class="sigma-header-tab-divider"></span>' : ''}
                            <button id="admin-grades-tab-${tab}" type="button" onclick="window.switchAdminGradesTab('${tab}')"
                                class="sigma-header-tab-btn ${state.activeTab === tab ? 'sigma-header-tab-btn--active' : 'sigma-header-tab-btn--inactive'}"
                                style="${state.activeTab === tab ? 'color: #000000;' : 'color: rgba(0, 0, 0, 0.30);'}">
                                ${tab === 'gradebook' ? 'Gradebooks' : 'Analytics'}
                            </button>
                        `).join('')}
                    </div>
                </div>

                <!-- Shared Sub-Toolbar / Navbar (Subject & Section Picker + Quarters) -->
                <div id="admin-grades-shared-navbar" style="position: relative; z-index: 60; overflow: visible;" class="relative z-50 px-10 pb-6 border-b border-slate-200 flex items-center justify-between gap-4 font-['Inter'] bg-white">
                    <div class="flex items-center gap-3 flex-wrap">
                        ${!isTeacherPage ? '<div class="admin-gradebook-selection-row">' : ''}
                        
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
                                <span id="admin-grades-subject-picker-label" class="${state.selectedSubjectSection ? 'flex flex-1 flex-col items-start justify-center min-w-0 font-[\'Inter\'] text-left' : 'text-[13px] font-semibold text-black-fade transition-colors font-[\'Inter\']'}" style="${state.selectedSubjectSection ? 'color: #000000;' : 'color: rgba(0, 0, 0, 0.45);'}">
                                    ${state.selectedSubjectSection ? `
                                        <div class="flex items-start justify-between gap-1.5 w-full min-w-0">
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
                        ${!isTeacherPage ? '<button id="admin-gradebook-open-section" type="button" hidden class="sigma-btn sigma-btn-white sigma-btn-md" onclick="window.openAdminGradebookClassroomTab(\'room\')"><i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i><span>Open Section</span></button>' : ''}
                        ${!isTeacherPage ? '</div>' : ''}
                        <div id="admin-grades-quarters-wrapper" class="flex items-center gap-1.5 ${state.selectedSubjectSection ? '' : 'hidden'}">
                            <!-- Populated dynamically by window.renderAdminQuartersTabs -->
                        </div>

                    </div>

                    <!-- Right Side: Assessment Weights & Combined Transfer / View Grade Card Links (Gradebooks Only) -->
                    <div id="admin-gradebook-action-buttons" 
                         class="${state.activeTab === 'gradebook' && state.selectedSubjectSection ? '' : 'hidden'} items-center gap-4 font-['Inter'] shrink-0" 
                         style="${state.activeTab === 'gradebook' && state.selectedSubjectSection ? (isTeacherPage ? 'display: contents !important;' : 'display: flex;') : 'display: none !important;'}">
                        ${!isTeacherPage ? `
                        <button id="admin-btn-assessment-weights" type="button" onclick="window.openAdminGradebookWeightModal()"
                            class="inline-flex items-center gap-1.5 text-xs font-semibold text-black hover:text-[#FFD000] transition-colors cursor-pointer bg-transparent border-0 p-0 group shrink-0"
                            title="Assessment Weights">
                            <i class="fa-solid fa-sliders text-[#15803d] text-xs group-hover:text-[#FFD000] transition-colors"></i>
                            <span class="group-hover:text-[#FFD000] transition-colors">Assessment Weights</span>
                        </button>

                        ` : ''}

                        <div class="gb-status-key" aria-label="Score status key">
                            <span><i class="gb-key-swatch gb-key-missing"></i>Missing</span>
                            <span><i class="gb-key-swatch gb-key-absent"></i>Absent</span>
                            <span><i class="gb-key-swatch gb-key-incomplete"></i>Incomplete</span>
                            <span><i class="gb-key-swatch gb-key-excuse"></i>Excuse</span>
                        </div>
                        <div id="grades-submit-export" class="grades-submit-export">
                            <button id="grades-submit-export-btn" type="button" class="grades-submit-export-btn"
                                aria-expanded="false" aria-controls="grades-submit-export-menu"
                                onclick="window.toggleGradesSubmitExportMenu()">
                                <span>Share &amp; Export</span>
                                <span class="manage-dropdown-icon-spin-box" aria-hidden="true">
                                    <i class="manage-icon-plus fa-solid fa-plus"></i>
                                    <i class="manage-icon-chevron fa-solid fa-chevron-down"></i>
                                </span>
                            </button>
                            <div id="grades-submit-export-menu" class="grades-submit-export-menu hidden" aria-label="Share and export options">
                                <button type="button" onclick="window.closeGradesSubmitExportMenu(); window.openSharedGradeRecord()"><i class="fa-solid fa-paper-plane" aria-hidden="true"></i><span>Share Grades</span></button>
                                <button type="button" onclick="window.closeGradesSubmitExportMenu(); window.openGradebookExportForm()"><i class="fa-solid fa-file-excel" aria-hidden="true"></i><span>Export Excel</span></button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- ═══════════════════════════════════════════════════════════ -->
                <!-- VIEW 1: ANALYTICS CONTENT -->
                <!-- ═══════════════════════════════════════════════════════════ -->
                <div id="admin-grades-analytics-view" class="${state.activeTab === 'analytics' ? '' : 'hidden'} flex-1 flex flex-col w-full h-auto min-h-0 bg-white overflow-visible font-['Inter']">
                    <div id="admin-analytics-workspace-content" class="flex-1 flex flex-col w-full h-auto min-h-0 p-0 bg-white overflow-visible font-['Inter']">
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
                                <h2 class="text-xl font-bold text-black font-['Inter'] tracking-tight">Faculty Directory</h2>
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
                                    <p class="text-xs font-normal mt-0.5" style="color: rgba(0,0,0,0.45);">Search and select a teacher from the active school roster</p>
                                </div>
                            </div>

                            <!-- Search Input + Shared Green Search Button -->
                            <div class="ai-log-search flex items-center gap-3">
                                <div class="ai-log-search-input-wrap relative flex-1" style="width:auto">
                                    <input type="text" id="admin-teacher-search-input" aria-label="Search faculty" placeholder="Search teacher by name or ID..." maxlength="50"
                                        autocomplete="off"
                                        spellcheck="false"
                                        style="padding-right:44px !important;"
                                        oninput="window.sanitizeAdminTeacherSearchInput(this)"
                                        onkeydown="if(event.key==='Enter'){event.preventDefault(); window.executeAdminTeacherModalSearch();}"
                                        class="sigma-input font-['Inter']">
                                    <button type="button" id="admin-teacher-search-clear" class="ai-log-search-clear" title="Clear search" aria-label="Clear search" onclick="window.clearAdminTeacherModalSearch()" hidden><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
                                </div>
                                <button type="button" id="admin-teacher-search-btn" onclick="window.executeAdminTeacherModalSearch()"
                                    class="sigma-btn sigma-btn-primary sigma-btn-md ai-log-conversation-search-button shrink-0 flex items-center justify-center cursor-pointer" title="Search faculty" aria-label="Search faculty">
                                    <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
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
            window.restoreSharedGradeRecordRoute?.();
        } else {
            window.renderAdminAnalyticsWorkspace();
        }
    };

    const renderGradesView = window.renderSigmaGradesView;
    window.renderSigmaGradesView = function (...args) {
        const run = () => renderGradesView.apply(this, args);
        return typeof window.withGradebookReadCache === 'function'
            ? window.withGradebookReadCache(run) : run();
    };

    const renderGradebookWorkspaceRaw = window.renderAdminGradebookWorkspace;
    if (typeof renderGradebookWorkspaceRaw === 'function') {
        window.renderAdminGradebookWorkspace = function (...args) {
            const run = () => renderGradebookWorkspaceRaw.apply(this, args);
            return typeof window.withGradebookReadCache === 'function'
                ? window.withGradebookReadCache(run) : run();
        };
    }

    const renderAnalyticsWorkspaceRaw = window.renderAdminAnalyticsWorkspace;
    if (typeof renderAnalyticsWorkspaceRaw === 'function') {
        window.renderAdminAnalyticsWorkspace = function (...args) {
            const run = () => renderAnalyticsWorkspaceRaw.apply(this, args);
            return typeof window.withGradebookReadCache === 'function'
                ? window.withGradebookReadCache(run) : run();
        };
    }

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
    window.renderMobileInsightCards = () => initPocketCardsContainer(document.getElementById('analytics-dropdown-cards'));

    initAllPocketCardRails();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAllPocketCardRails);
    }
})();
