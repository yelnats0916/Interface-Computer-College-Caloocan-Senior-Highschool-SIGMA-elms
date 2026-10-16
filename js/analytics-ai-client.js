(function () {
    'use strict';
    function install() {
        const kind = location.pathname.toLowerCase().includes('teacher') ? 'teacher' : 'student';
        const controller = kind === 'teacher' ? window.SigmaTeacherAnalytics : window.SigmaStudentAnalytics;
        if (!controller || controller.liveProviderConnected) return;
        controller.setProvider(async request => {
            const user = kind === 'teacher' ? window.getLoggedInTeacherUser?.() : window.getLoggedInStudentUser?.();
            const id = String(user?.id || user?.uid || '');
            if (!id || String(request.snapshot?.[kind + 'Id'] || '') !== id) throw new Error('Analytics evidence does not match the signed-in account.');
            const api = location.port && !['80', '443'].includes(location.port) ? 'http://localhost/sigma-elms/php/api/analytics_ai.php'
                : new URL(location.pathname.includes('/php/') ? 'api/analytics_ai.php' : 'php/api/analytics_ai.php', location.href).href;
            const timeout = new AbortController();
            const timer = setTimeout(() => timeout.abort(), 30000);
            try {
                const response = await fetch(api, { method: 'POST', credentials: 'include', signal: timeout.signal, headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ kind, snapshot: request.snapshot, maxCards: request.maxCards, language: window.getSigmaAiLanguage?.('insights') || 'en' }) });
                const result = await response.json();
                if (!response.ok || !result.success || !Array.isArray(result.cards)) throw new Error(result.error || 'AI returned invalid analytics.');
                return result;
            } catch (error) {
                if (error.name === 'AbortError') throw new Error('Analytics request timed out. Please try again later.');
                throw error;
            } finally { clearTimeout(timer); }
        });
        controller.liveProviderConnected = true;
        controller.refresh?.();
        window.dispatchEvent(new Event('sigma:refresh-analytics-cards'));
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
    window.addEventListener('load', install);
    document.addEventListener('sigma:teacher-portal-ready', install);
})();
