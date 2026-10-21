(function () {
    'use strict';
    function init() {
        const panel = document.getElementById('sigmaAiPanel');
        const messages = document.getElementById('sigmaAiMessages');
        const header = panel?.querySelector('.sigma-ai-header');
        const composer = document.getElementById('sigmaAiComposer')?.parentElement;
        const send = document.getElementById('sigmaAiSendBtn');
        if (!panel || !messages || !header || !composer || panel.dataset.conversationsReady) return;
        panel.dataset.conversationsReady = 'true';
        let account = {};
        try { account = JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}'); } catch { }
        const accountId = String(account.uid || account.id || '');
        const prefix = accountId ? 'sigma-conversations:' + encodeURIComponent(accountId) : null;
        const batch = 8;
        const pendingTitles = new Set();
        let active = null, index = [], visible = batch, inHistory = false, memory = new Map(), greeting = null;
        const node = (tag, text, cls) => {
            const el = document.createElement(tag);
            if (text !== undefined) el.textContent = text;
            if (cls) el.className = cls;
            return el;
        };
        function read(key, fallback) {
            try { return JSON.parse(localStorage.getItem(key) || 'null') || fallback; } catch { return fallback; }
        }
        if (prefix) {
            const saved = read(prefix + ':index', []);
            index = Array.isArray(saved) ? saved.filter(item => item && typeof item.id === 'string' && typeof item.title === 'string' && Number.isFinite(item.updatedAt)) : [];
        }
        const actions = node('div', undefined, 'sigma-conversation-actions');
        const historyButton = node('button', undefined, 'sigma-conversation-icon');
        historyButton.type = 'button'; historyButton.title = 'Past conversations'; historyButton.setAttribute('aria-label', 'Past conversations');
        historyButton.append(node('i', undefined, 'fa-solid fa-clock-rotate-left'));
        const newButton = node('button', undefined, 'sigma-conversation-icon');
        newButton.type = 'button'; newButton.title = 'New chat'; newButton.setAttribute('aria-label', 'New chat');
        newButton.append(node('i', undefined, 'fa-solid fa-pen-to-square'));
        actions.append(historyButton, newButton); header.append(actions);
        const historyView = node('div', undefined, 'sigma-conversation-history');
        historyView.hidden = true;
        messages.after(historyView);
        const notice = node('p', undefined, 'sigma-conversation-notice');
        notice.hidden = true; notice.setAttribute('role', 'alert'); header.after(notice);
        function warn() { notice.textContent = 'Conversation could not be saved in this browser.'; notice.hidden = false; }
        async function generateTitle(id, list) {
            const entry = index.find(item => item.id === id);
            const generator = window.SigmaConversationTitles?.generate;
            if (!entry || entry.deletedAt || entry.titleSource === 'ai' || pendingTitles.has(id) || typeof generator !== 'function') return;
            pendingTitles.add(id);
            try {
                const result = await generator({ conversationId: id, messages: list.slice(0, 4).map(item => ({ role: item.role, text: item.text.slice(0, 2000) })) });
                const title = typeof result === 'string' ? result.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) : '';
                const current = index.find(item => item.id === id);
                if (!title || !current || current.deletedAt) return;
                const updated = index.map(item => item.id === id ? { ...item, title, titleSource: 'ai' } : item);
                if (prefix) localStorage.setItem(prefix + ':index', JSON.stringify(updated));
                index = updated;
                if (inHistory) paintHistory();
            } catch { /* Retain the temporary title when the AI service is unavailable. */ }
            finally { pendingTitles.delete(id); }
        }
        function setView(history) {
            inHistory = history;
            messages.hidden = history; composer.hidden = history; historyView.hidden = !history;
            historyButton.setAttribute('aria-pressed', String(history));
        }
        function capture() {
            const greetingNode = messages.querySelector('[data-sigma-greeting="true"]');
            if (greetingNode) greeting = greetingNode.cloneNode(true);
            const list = Array.from(messages.querySelectorAll('.sigma-ai-message')).filter(el => el.dataset.sigmaGreeting !== 'true').map(el => ({
                role: el.classList.contains('sigma-ai-message--user') ? 'user' : 'assistant',
                text: window.SigmaMessageFormat.raw(el.querySelector('.sigma-ai-message__bubble')),
                stamp: el.querySelector('.sigma-ai-message__meta')?.textContent || ''
            }));
            if (!list.some(item => item.role === 'user')) return;
            if (!active) active = Array.from(crypto.getRandomValues(new Uint32Array(4)), value => value.toString(16).padStart(8, '0')).join('');
            const previous = index.find(item => item.id === active);
            const title = previous?.title || list.find(item => item.role === 'user').text.replace(/\s+/g, ' ').trim().slice(0, 80) || 'Conversation';
            const entry = { ...previous, id: active, title, updatedAt: Date.now(), titleSource: previous?.titleSource || 'temporary' };
            index = [entry, ...index.filter(item => item.id !== active)].sort((a, b) => b.updatedAt - a.updatedAt);
            memory.set(active, list);
            if (prefix) {
                try {
                    localStorage.setItem(prefix + ':chat:' + active, JSON.stringify(list));
                    localStorage.setItem(prefix + ':index', JSON.stringify(index));
                    notice.hidden = true;
                } catch { warn(); }
            }
            generateTitle(active, list);
        }
        const observer = new MutationObserver(capture);
        function observe() { observer.observe(messages, { childList: true, subtree: true, characterData: true }); }
        function replaceMessages(list) {
            observer.disconnect();
            messages.replaceChildren();
            if (!list.length && greeting) messages.append(greeting.cloneNode(true));
            list.forEach(item => {
                messages.append(window.renderSigmaChatMessage(item));
            });
            observe();
            messages.scrollTop = messages.scrollHeight;
        }
        function open(id) {
            if (send?.disabled) return;
            if (!index.some(item => item.id === id && !item.deletedAt)) return;
            const list = memory.get(id) || (prefix ? read(prefix + ':chat:' + id, []) : []);
            if (!Array.isArray(list) || !list.length) { notice.textContent = 'This conversation is unavailable.'; notice.hidden = false; return; }
            active = id;
            replaceMessages(list.filter(item => item && ['user', 'assistant'].includes(item.role) && typeof item.text === 'string'));
            setView(false);
            document.getElementById('sigmaAiInput')?.focus({ preventScroll: true });
        }
        const day = timestamp => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(timestamp);
        let deletedId = null;
        function softDelete(id) {
            if (send?.disabled) return;
            const previous = index;
            index = index.map(item => item.id === id ? { ...item, deletedAt: Date.now() } : item);
            try { if (prefix) localStorage.setItem(prefix + ':index', JSON.stringify(index)); }
            catch { index = previous; warn(); return; }
            if (active === id) { active = null; replaceMessages([]); }
            deletedId = id;
            paintHistory();
            historyView.querySelector('.sigma-conversation-undo')?.focus({ preventScroll: true });
        }
        function undoDelete() {
            const previous = index;
            index = index.map(item => item.id === deletedId ? { ...item, deletedAt: null } : item);
            try { if (prefix) localStorage.setItem(prefix + ':index', JSON.stringify(index)); }
            catch { index = previous; warn(); return; }
            deletedId = null;
            paintHistory();
            historyView.querySelector('.sigma-conversation-item')?.focus({ preventScroll: true });
        }
        function paintHistory() {
            historyView.replaceChildren(node('h3', 'Past Conversations'));
            if (deletedId) {
                const status = node('div', undefined, 'sigma-conversation-deleted');
                status.setAttribute('role', 'status');
                const undo = node('button', 'Undo', 'sigma-conversation-undo');
                undo.type = 'button'; undo.addEventListener('click', undoDelete);
                status.append(node('span', 'Conversation deleted.'), undo);
                historyView.append(status);
            }
            const available = index.filter(item => !item.deletedAt);
            if (!available.length) {
                const empty = node('div', undefined, 'sigma-conversation-empty');
                empty.innerHTML = window.renderSigmaEmptyState({ icon: 'fa-solid fa-comments', title: 'No conversations yet', subtitle: 'Your conversations will appear here after you send a message.' });
                historyView.append(empty); return;
            }
            const now = Date.now();
            let previousGroup = '';
            available.slice(0, visible).forEach((item, position) => {
                const group = position === 0 ? 'Recent' : day(item.updatedAt) === day(now) ? 'Today' : day(item.updatedAt) === day(now - 86400000) ? 'Yesterday' : 'Earlier';
                if (group !== previousGroup) { historyView.append(node('p', group, 'sigma-conversation-group')); previousGroup = group; }
                const button = node('button', undefined, 'sigma-conversation-item');
                button.type = 'button'; button.dataset.conversationId = item.id;
                const text = node('span');
                text.append(node('span', item.title, 'sigma-conversation-title'), node('time', new Date(item.updatedAt).toLocaleString('en-US', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }), 'sigma-conversation-date'));
                button.append(node('i', undefined, 'fa-solid fa-comment'), text);
                button.addEventListener('click', () => open(item.id));
                const row = node('div', undefined, 'sigma-conversation-row');
                const options = node('div', undefined, 'sigma-conversation-options');
                const more = node('button', undefined, 'sigma-conversation-icon sigma-conversation-more');
                more.type = 'button'; more.title = 'Conversation options';
                more.setAttribute('aria-label', 'Conversation options: ' + item.title);
                more.setAttribute('aria-expanded', 'false');
                more.append(node('i', undefined, 'fa-solid fa-ellipsis'));
                const menu = node('div', undefined, 'sigma-conversation-menu');
                menu.hidden = true;
                const remove = node('button', undefined, 'sigma-conversation-menu-delete');
                remove.type = 'button'; remove.title = 'Delete conversation';
                remove.setAttribute('aria-label', 'Delete conversation: ' + item.title);
                remove.append(node('i', undefined, 'fa-solid fa-trash-can'), node('span', 'Delete'));
                remove.addEventListener('click', () => softDelete(item.id));
                menu.append(remove);
                more.addEventListener('click', () => {
                    const show = menu.hidden;
                    closeMenus();
                    menu.hidden = !show;
                    more.setAttribute('aria-expanded', String(show));
                    if (show) remove.focus({ preventScroll: true });
                });
                options.append(more, menu);
                row.append(button, options);
                historyView.append(row);
            });
            if (visible < available.length) {
                const prevWrap = node('div', undefined, 'notif-prev-btn-wrapper');
                prevWrap.style.borderTop = '1px solid #f1f5f9';
                prevWrap.style.marginTop = '16px';
                const older = node('button', undefined, 'notif-prev-btn sigma-conversation-previous');
                older.type = 'button';
                older.append(node('span', 'Previous Conversations'), node('i', undefined, 'fa-solid fa-chevron-down text-[10px]'));
                older.addEventListener('click', () => {
                    const scroll = historyView.scrollTop;
                    visible += batch; paintHistory(); historyView.scrollTop = scroll;
                    historyView.querySelectorAll('.sigma-conversation-item')[visible - batch]?.focus({ preventScroll: true });
                });
                prevWrap.append(older);
                historyView.append(prevWrap);
            }
        }
        function closeMenus() {
            historyView.querySelectorAll('.sigma-conversation-menu').forEach(menu => { menu.hidden = true; });
            historyView.querySelectorAll('.sigma-conversation-more').forEach(button => button.setAttribute('aria-expanded', 'false'));
        }
        document.addEventListener('click', event => { if (!event.target.closest('.sigma-conversation-options')) closeMenus(); });
        historyView.addEventListener('keydown', event => {
            if (event.key === 'Escape') {
                const trigger = historyView.querySelector('.sigma-conversation-more[aria-expanded="true"]');
                if (trigger) { event.preventDefault(); event.stopPropagation(); closeMenus(); trigger.focus(); }
            }
        });
        window.addEventListener('sigma:ai-title-generator-ready', () => {
            if (active && memory.has(active)) generateTitle(active, memory.get(active));
        });
        historyButton.addEventListener('click', () => {
            if (send?.disabled) return;
            if (inHistory) setView(false);
            else { visible = batch; paintHistory(); setView(true); historyView.scrollTop = 0; }
        });
        newButton.addEventListener('click', () => {
            if (send?.disabled) return;
            active = null; replaceMessages([]); setView(false);
            const input = document.getElementById('sigmaAiInput');
            if (input) { input.value = ''; input.style.height = 'auto'; input.focus({ preventScroll: true }); }
        });
        if (send) {
            historyButton.disabled = newButton.disabled = send.disabled;
            new MutationObserver(() => {
            historyButton.disabled = newButton.disabled = send.disabled;
            }).observe(send, { attributes: true, attributeFilter: ['disabled'] });
        }
        window.addEventListener('storage', event => {
            if (prefix && event.key === prefix + ':index') {
                const saved = read(prefix + ':index', []);
                if (Array.isArray(saved)) index = saved.filter(item => item && typeof item.id === 'string' && typeof item.title === 'string' && Number.isFinite(item.updatedAt)).sort((a, b) => b.updatedAt - a.updatedAt);
                if (active && index.some(item => item.id === active && item.deletedAt)) {
                    active = null;
                    replaceMessages([]);
                }
                if (inHistory) paintHistory();
            }
        });
        index.sort((a, b) => b.updatedAt - a.updatedAt);
        observe(); capture();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
