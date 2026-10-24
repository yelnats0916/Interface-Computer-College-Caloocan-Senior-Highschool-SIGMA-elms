(function () {
    'use strict';
    const selections = new Map();
    const pending = new Map();
    const owner = () => String(window.SigmaDatabase?.currentUser?.()?.id || window.SigmaDatabase?.currentUser?.()?.uid || '');
    const identity = () => owner() + ':' + String(window.getSigmaConversationContext?.()?.conversationId || 'new');
    const composer = () => document.getElementById('sigmaAiComposer');
    let panel = null;
    function clear() {
        panel?.remove(); panel = null;
        composer()?.classList.remove('sigma-chat-choosing');
    }
    function context(text = '') {
        const current = identity(), choice = pending.get(current);
        const normalize = value => String(value || '').trim().toLowerCase();
        const option = choice?.options?.find(option => normalize(option.label) === normalize(text));
        return option ? { question: choice.question, sourceKey: option.sourceKey || '', subject: option.subject || '' }
            : { sourceKey: selections.get(current) || '' };
    }
    function selected(key) {
        clear();
        if (key) { selections.set(identity(), key); pending.delete(identity()); }
        let change = document.getElementById('sigmaChatChangeMaterial');
        if (!change && composer()) {
            change = document.createElement('button');
            change.id = 'sigmaChatChangeMaterial'; change.type = 'button';
            change.className = 'sigma-chat-change-material'; change.textContent = 'Change learning material';
            change.onclick = () => { selections.delete(identity()); clear(); change.hidden = true; document.getElementById('sigmaAiInput')?.focus(); };
            composer().before(change);
        }
        if (change) change.hidden = !context().sourceKey;
    }
    function show(result, question) {
        clear();
        if (result.kind !== 'selection' || !Array.isArray(result.options) || !result.options.length || !composer()) return;
        const current = identity();
        pending.set(current, { ...result, question });
        panel = document.createElement('div'); panel.className = 'sigma-chat-source-choices';
        panel.setAttribute('role', 'group'); panel.setAttribute('aria-label', 'Choose a learning source');
        const sendChoice = async (label, options) => {
            if (identity() !== current) { clear(); return; }
            clear();
            await window.sendSigmaChatMessage(label, { question, ...options });
        };
        const options = result.options.filter(option => option && typeof option.label === 'string').slice(0, 3);
        for (const option of options) {
            if (!option || typeof option.label !== 'string') continue;
            const button = document.createElement('button'); button.type = 'button';
            button.className = 'sigma-btn sigma-btn-white sigma-chat-source-option';
            const title = document.createElement('span'); title.className = 'sigma-chat-source-title'; title.textContent = option.label;
            button.append(title);
            if (option.description) {
                const detail = document.createElement('span'); detail.className = 'sigma-chat-source-detail'; detail.textContent = option.description;
                button.append(detail);
            }
            button.onclick = () => sendChoice(option.label, { sourceKey: option.sourceKey, subject: option.subject });
            panel.append(button);
        }
        const general = document.createElement('button'); general.type = 'button';
        general.className = 'sigma-btn sigma-btn-white sigma-chat-source-option';
        general.textContent = 'Explain the concept generally';
        general.onclick = () => { selections.delete(identity()); sendChoice(general.textContent, { generalConcept: true }); };
        panel.append(general);
        const cancel = document.createElement('button'); cancel.type = 'button';
        cancel.className = 'sigma-chat-change-material'; cancel.textContent = 'Ask a different question';
        cancel.onclick = () => { pending.delete(current); clear(); document.getElementById('sigmaAiInput')?.focus(); };
        panel.append(cancel);
        composer().before(panel); composer().classList.add('sigma-chat-choosing');
        panel.querySelector('button')?.focus();
    }
    // Conversation switches replace the message list. Do not retain another chat's pending choice UI.
    let last = identity();
    const check = () => { const current = identity(); if (current !== last) { last = current; clear(); selected(); } };
    const messages = document.getElementById('sigmaAiMessages');
    if (messages) new MutationObserver(check).observe(messages, { childList: true });
    let sessionOwner = owner();
    window.addEventListener('sigma:database-session-ready', () => {
        if (sessionOwner === owner()) return;
        sessionOwner = owner(); selections.clear(); pending.clear(); clear(); selected();
    });
    window.addEventListener('sigma:conversation-restored', event => {
        clear();
        const choice = event.detail?.choice;
        if (choice) show(choice.result, choice.question);
    });
    window.SigmaChatChoices = { show, context, selected };
})();
