(function () {
    'use strict';
    const selections = new Map();
    const pending = new Map();
    const owner = () => String(window.SigmaDatabase?.currentUser?.()?.id || window.SigmaDatabase?.currentUser?.()?.uid || '');
    const identity = () => owner() + ':' + String(window.getSigmaConversationContext?.()?.conversationId || 'new');
    const composer = () => document.getElementById('sigmaAiComposer');
    const messages = () => document.getElementById('sigmaAiMessages');
    const chatPanel = () => document.getElementById('sigmaAiPanel');
    let panel = null;
    function clear() {
        panel?.remove(); panel = null;
        chatPanel()?.classList.remove('sigma-chat-has-choices');
    }
    function context(text = '') {
        const current = identity(), choice = pending.get(current);
        const normalize = value => String(value || '').trim().toLowerCase();
        const option = choice?.options?.find(option => normalize(option.label) === normalize(text));
        return option ? { question: choice.question, sourceKey: option.sourceKey || '', subject: option.subject || '', sectionId: option.sectionId || '' }
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
        const messageList = messages();
        if (result.kind !== 'selection' || !Array.isArray(result.options) || !result.options.length || !messageList) return;
        const current = identity();
        selections.delete(current);
        const change = document.getElementById('sigmaChatChangeMaterial');
        if (change) change.hidden = true;
        pending.set(current, { ...result, question });
        panel = document.createElement('div'); panel.className = 'sigma-chat-source-choices';
        panel.setAttribute('role', 'group'); panel.setAttribute('aria-label', 'Choose a learning source');
        const sendChoice = async (label, options) => {
            if (identity() !== current) { clear(); return; }
            pending.delete(current);
            clear();
            await window.sendSigmaChatMessage(label, { question, ...options });
        };
        const options = result.options.filter(option => option && typeof option.label === 'string').slice(0, 5);
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
            button.onclick = () => sendChoice(option.label, { sourceKey: option.sourceKey, subject: option.subject, sectionId: option.sectionId });
            panel.append(button);
        }
        if (typeof result.generalOptionLabel === 'string' && result.generalOptionLabel.trim()) {
            const general = document.createElement('button'); general.type = 'button';
            general.className = 'sigma-btn sigma-btn-white sigma-chat-source-option';
            general.textContent = result.generalOptionLabel.trim();
            general.onclick = () => { selections.delete(identity()); sendChoice(general.textContent, { generalConcept: true }); };
            panel.append(general);
        }
        const cancel = document.createElement('button'); cancel.type = 'button';
        cancel.className = 'sigma-chat-change-material'; cancel.textContent = 'Type a different request';
        cancel.onclick = () => { selections.delete(current); pending.delete(current); clear(); document.getElementById('sigmaAiInput')?.focus(); };
        panel.append(cancel);
        messageList.append(panel);
        chatPanel()?.classList.add('sigma-chat-has-choices');
        requestAnimationFrame(() => {
            messageList.scrollTop = messageList.scrollHeight;
            panel?.querySelector('button')?.focus({ preventScroll: true });
        });
    }
    // Conversation switches replace the message list. Do not retain another chat's pending choice UI.
    let last = identity();
    const check = () => { const current = identity(); if (current !== last) { last = current; clear(); selected(); } };
    const messageList = messages();
    if (messageList) new MutationObserver(check).observe(messageList, { childList: true });
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
