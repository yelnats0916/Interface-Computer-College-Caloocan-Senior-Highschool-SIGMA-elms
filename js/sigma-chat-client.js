(function () {
    'use strict';
    let busy = false;
    window.sendSigmaChatMessage = async function (suggestedText, sourceOptions = {}) {
        const panel = document.getElementById('sigmaAiPanel');
        const messages = document.getElementById('sigmaAiMessages');
        const input = document.getElementById('sigmaAiInput');
        const send = document.getElementById('sigmaAiSendBtn');
        if (busy || !panel || !messages || !input || typeof window.renderSigmaChatMessage !== 'function') return;
        const text = String(typeof suggestedText === 'string' ? suggestedText : input.value).trim();
        sourceOptions = { ...window.SigmaChatChoices?.context(text), ...sourceOptions };
        const requestText = String(sourceOptions.question || text);
        const requestOwner = String(window.SigmaDatabase.currentUser?.()?.id || window.SigmaDatabase.currentUser?.()?.uid || '');
        const portalRole=/admin/i.test(location.pathname)?'admin':/teacher/i.test(location.pathname)?'teacher':'student';
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
        window.prepareSigmaConversationSend?.();
        const history = [];
        let bytes = 0;
        for (const el of Array.from(messages.querySelectorAll('.sigma-ai-message')).reverse()) {
            if (el.dataset.sigmaGreeting === 'true') continue;
            const content = window.SigmaMessageFormat.raw(el.querySelector('.sigma-ai-message__bubble'));
            const size = new TextEncoder().encode(content).length;
            if (history.length >= 12 || bytes + size > 8000 || size > 4000) break;
            bytes += size;
            history.unshift({ role: el.classList.contains('sigma-ai-message--user') ? 'user' : 'assistant', text: content });
        }
        const stamp = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date());
        const userTime = new Date().toISOString();
        const userMessage = window.renderSigmaChatMessage({ role: 'user', text, stamp });
        userMessage.dataset.timestamp = userTime;
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
            const conversation = window.getSigmaConversationContext?.() || {};
            const apiUrl = location.port && !['80', '443'].includes(location.port)
                ? 'http://localhost/sigma-elms/php/api/sigma_chat.php'
                : new URL(location.pathname.includes('/php/') ? 'api/sigma_chat.php' : 'php/api/sigma_chat.php', location.href).href;
            const response = await window.SigmaDatabase.fetch(apiUrl, { method: 'POST', foreground: true, credentials: 'include', signal: controller.signal,
                headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: requestText, displayMessage: text, history, portalRole, ...conversation,
                    ...window.SigmaChatChoices?.context(), sourceKey:sourceOptions.sourceKey || window.SigmaChatChoices?.context().sourceKey || '',
                    sourceSubject:sourceOptions.subject || '', generalConcept:sourceOptions.generalConcept === true,
                    language:window.getSigmaAiLanguage?.('bot')||'auto' }) });
            const result = await response.json();
            if (requestOwner !== String(window.SigmaDatabase.currentUser?.()?.id || window.SigmaDatabase.currentUser?.()?.uid || '')) throw new Error('The signed-in account changed. Please ask again.');
            if (!response.ok || !result.success || typeof result.text !== 'string' || !result.text.trim()) throw new Error(result.error || 'SIGMA could not get an answer. Try again.');
            if (['selection','guidance'].includes(result.kind)) {
                if (!messages.contains(userMessage)) return;
                const answer = window.renderSigmaChatMessage({ role:'assistant', text:result.text, stamp });
                answer.dataset.timestamp = new Date().toISOString();
                if (result.generationId) answer.dataset.generationId = result.generationId;
                if (result.model) answer.dataset.sigmaModel = result.model;
                if (result.provider) answer.dataset.provider = result.provider;
                if (result.kind === 'selection') answer.dataset.sigmaSourceChoice = JSON.stringify({ result: { kind:result.kind, options:result.options, text:result.text }, question:requestText });
                messages.append(answer);
                window.SigmaChatChoices?.show(result, requestText);
                messages.scrollTop = messages.scrollHeight;
                return;
            }
            if (!/^CHAT-\d{4}-\d{4,}$/.test(String(result.generationId || ''))) throw new Error('SIGMA replied without a generation ID. Try again.');
            const answer = window.renderSigmaChatMessage({ role: 'assistant', text: result.text, stamp });
            answer.dataset.timestamp = new Date().toISOString();
            answer.dataset.provider = result.provider;
            answer.dataset.sigmaModel = result.model;
            answer.dataset.generationId = result.generationId;
            if (messages.contains(userMessage)) messages.append(answer);
            window.SigmaChatChoices?.selected(sourceOptions.sourceKey);
            if (result.logSaved === true) {
                // The authenticated server already saved both audit records. Refresh, never insert a duplicate.
                const refreshes = [];
                if (portalRole === 'admin' && window.SigmaAiDatabase?.reloadLogs) refreshes.push(window.SigmaAiDatabase.reloadLogs());
                if (portalRole === 'admin' && window.SigmaActivityLogs?.refresh) refreshes.push(window.SigmaActivityLogs.refresh());
                Promise.allSettled(refreshes).then(results => {
                    if (results.some(item => item.status === 'rejected')) showError('Your reply and logs were saved. Refresh Audit Logs to load them.');
                });
            } else {
                try {
                    const account = window.SigmaDatabase.currentUser?.() || JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}');
                    if (account.uid || account.id) {
                        const logId = window.SigmaAiLogs?.record({ id: result.generationId, userId: String(account.uid || account.id), feature: 'sigmabot',
                            prompt: text, response: result.text, model: result.model, provider: result.provider,
                            keyId: result.keyId, keyLabel: result.keyLabel, generationId: result.generationId, status: result.status, timestamp: new Date().toISOString(),
                            messages: [...history, { role: 'user', text, timestamp: userTime }, { role: 'assistant', text: result.text, model: result.model, timestamp: new Date().toISOString() }] });
                        if (logId) await window.SigmaAiLogs.whenSaved(logId);
                    }
                } catch (error) { showError('Your reply arrived, but its audit log could not be saved. ' + error.message); }
            }
            messages.scrollTop = messages.scrollHeight;
        } catch (error) {
            showError(error.name === 'AbortError' ? 'SIGMA timed out. Please try again.' : error.message || 'Unable to connect to SIGMA.');
            if (!input.value) input.value = requestText;
        } finally {
            clearTimeout(timer);
            busy = false;
            panel.setAttribute('aria-busy', 'false');
            controls.forEach((control, index) => { control.disabled = disabledStates[index]; });
            send?.classList.remove('is-loading');
        }
    };
})();
