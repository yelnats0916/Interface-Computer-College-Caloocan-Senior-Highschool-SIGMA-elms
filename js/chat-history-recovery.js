(function () {
    'use strict';
    let pending = null;
    function report(message, busy = false) {
        const status = document.getElementById('chat-history-recovery-status');
        if (status) status.textContent = message;
        const button = document.getElementById('chat-history-recovery-button');
        if (button) button.disabled = busy;
    }
    async function recover() {
        if (pending) return pending;
        if (!window.SigmaAiDatabase?.request) { report('Saved chat sync is unavailable. Reload the page and try again.'); return; }
        let account;
        try { account = JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || 'null'); } catch (_) { return; }
        const owner = String(account?.uid || account?.id || '');
        if (!owner) { report('Sign in to sync your saved conversations.'); return; }
        const prefix = 'sigma-conversations:' + encodeURIComponent(owner);
        let index;
        try { index = JSON.parse(localStorage.getItem(prefix + ':index') || '[]'); } catch (_) { report('Saved conversation history could not be read in this browser.'); return; }
        if (!Array.isArray(index)) { report('Saved conversation history could not be read in this browser.'); return; }
        pending = (async () => {
            await window.SigmaAiDatabase.initialize?.();
            let total = 0, found = 0, eligible = 0, updated = 0;
            report('Checking saved conversations in this browser…', true);
            for (const item of index) {
                if (!item?.id || item.deletedAt || !Number.isFinite(item.updatedAt)) continue;
                let messages;
                try { messages = JSON.parse(localStorage.getItem(prefix + ':chat:' + item.id) || 'null'); } catch (_) { continue; }
                if (!Array.isArray(messages) || !messages.some(message => message?.role === 'assistant')) continue;
                found++;
                const conversation = { id: item.id, title:item.title, updatedAt: item.updatedAt, messages };
                if (new TextEncoder().encode(JSON.stringify(conversation)).length > 450000) throw new Error('A saved conversation is too large to recover automatically.');
                const result = await window.SigmaAiDatabase.request('chat_conversations', { action:'recover_chat_history', conversations:[conversation] });
                total += Number(result.recoveredRequests) || 0;
                eligible += Number(result.completeExchanges) || 0;
                updated += Number(result.updatedMetadata) || 0;
            }
            if ((total || updated) && /admin/i.test(location.pathname)) {
                await window.SigmaAiDatabase.reloadLogs();
                await window.SigmaActivityLogs?.refresh();
                window.updateAiDisplay?.();
            }
            report(!found ? 'No saved conversations found for this account in this browser.'
                : !eligible ? `Found ${found} saved conversation${found === 1 ? '' : 's'}, but no completed requests with an original date before October 23 could be recovered.`
                : `Checked ${found} saved conversation${found === 1 ? '' : 's'}: ${eligible} completed request${eligible === 1 ? '' : 's'} with original dates; ${total} added to AI Logs. Existing or deleted entries are kept as they are.`);
            if (total) window.showToastNotification?.(`Recovered ${total} saved chat request${total === 1 ? '' : 's'} with their original dates.`, 'success');
            if (total) window.dispatchEvent(new CustomEvent('sigma:chat-history-recovered', { detail:{ requests:total } }));
            return total;
        })().catch(error => {
            report('Saved chat sync failed: ' + error.message + ' Use Sync saved chats to retry.');
            console.error('Saved chat recovery failed:', error.message);
            window.dispatchEvent(new CustomEvent('sigma:chat-history-recovery-error', {detail:error.message}));
        }).finally(() => { pending = null; });
        return pending;
    }
    let metadataTimer;
    window.addEventListener('sigma:conversation-metadata-updated', () => {
        clearTimeout(metadataTimer); metadataTimer = setTimeout(recover, 600);
    });
    window.recoverSigmaChatHistory = recover;
    function connectButton() {
        document.getElementById('chat-history-recovery-button')?.addEventListener('click', recover);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', connectButton); else connectButton();
    window.addEventListener('sigma:database-session-ready', recover);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', recover); else recover();
})();
