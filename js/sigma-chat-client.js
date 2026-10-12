(function () {
    'use strict';
    let busy = false;
    window.sendSigmaChatMessage = async function (suggestedText) {
        const panel = document.getElementById('sigmaAiPanel');
        const messages = document.getElementById('sigmaAiMessages');
        const input = document.getElementById('sigmaAiInput');
        const send = document.getElementById('sigmaAiSendBtn');
        if (busy || !panel || !messages || !input || typeof window.renderSigmaChatMessage !== 'function') return;
        const text = String(typeof suggestedText === 'string' ? suggestedText : input.value).trim();
        if (!text) return;
        let notice = document.getElementById('sigmaChatError');
        if (!notice) {
            notice = document.createElement('p');
            notice.id = 'sigmaChatError';
            notice.className = 'sigma-conversation-notice';
            notice.setAttribute('role', 'alert');
            messages.before(notice);
        }
        const showError = message => { notice.textContent = message; notice.hidden = false; };
        if (new TextEncoder().encode(text).length > 4000) { showError('Keep your message within 4,000 bytes.'); return; }
        notice.hidden = true;
        const history = [];
        let bytes = 0;
        for (const el of Array.from(messages.querySelectorAll('.sigma-ai-message')).reverse()) {
            if (el.dataset.sigmaGreeting === 'true') continue;
            const content = el.querySelector('.sigma-ai-message__bubble')?.textContent || '';
            const size = new TextEncoder().encode(content).length;
            if (history.length >= 12 || bytes + size > 12000 || size > 4000) break;
            bytes += size;
            history.unshift({ role: el.classList.contains('sigma-ai-message--user') ? 'user' : 'assistant', text: content });
        }
        const stamp = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date());
        const userTime = new Date().toISOString();
        const userMessage = window.renderSigmaChatMessage({ role: 'user', text, stamp });
        messages.append(userMessage);
        input.value = '';
        input.style.height = 'auto';
        busy = true;
        panel.setAttribute('aria-busy', 'true');
        const controls = [input, send, ...panel.querySelectorAll('.sigma-conversation-actions button')].filter(Boolean);
        const disabledStates = controls.map(control => control.disabled);
        controls.forEach(control => { control.disabled = true; });
        send?.classList.add('is-loading');
        messages.scrollTop = messages.scrollHeight;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 100000);
        try {
            const apiUrl = location.port && !['80', '443'].includes(location.port)
                ? 'http://localhost/sigma-elms/php/api/sigma_chat.php'
                : new URL(location.pathname.includes('/php/') ? 'api/sigma_chat.php' : 'php/api/sigma_chat.php', location.href).href;
            const response = await fetch(apiUrl, { method: 'POST', credentials: 'include', signal: controller.signal,
                headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text, history }) });
            const result = await response.json();
            if (!response.ok || !result.success || typeof result.text !== 'string' || !result.text.trim()) throw new Error(result.error || 'SIGMA could not get an answer. Try again.');
            const answer = window.renderSigmaChatMessage({ role: 'assistant', text: result.text, stamp });
            answer.dataset.sigmaModel = result.model;
            if (messages.contains(userMessage)) messages.append(answer);
            try {
                const account = JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}');
                if (account.uid || account.id) window.SigmaAiLogs?.record({ userId: String(account.uid || account.id), feature: 'sigmabot',
                    prompt: text, response: result.text, model: result.model, provider: result.provider,
                    keyId: result.keyId, keyLabel: result.keyLabel, status: result.status, timestamp: new Date().toISOString(),
                    messages: [...history, { role: 'user', text, timestamp: userTime }, { role: 'assistant', text: result.text, model: result.model, timestamp: new Date().toISOString() }] });
            } catch (error) { console.warn('SIGMA reply received, but its audit log could not be saved.', error); }
            messages.scrollTop = messages.scrollHeight;
        } catch (error) {
            showError(error.name === 'AbortError' ? 'SIGMA timed out. Please try again.' : error.message || 'Unable to connect to SIGMA.');
            if (!input.value) input.value = text;
        } finally {
            clearTimeout(timer);
            busy = false;
            panel.setAttribute('aria-busy', 'false');
            controls.forEach((control, index) => { control.disabled = disabledStates[index]; });
            send?.classList.remove('is-loading');
        }
    };
})();
