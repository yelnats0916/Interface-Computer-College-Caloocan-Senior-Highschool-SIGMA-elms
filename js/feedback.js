/* Shared action feedback, using the portal's release indicators and notice cards. */
(function () {
    'use strict';
    if (window.SigmaFeedback) return;
    const active = new Map();
    const icons = { success:'fa-circle-check', info:'fa-circle-info', warning:'fa-triangle-exclamation', error:'fa-circle-xmark', progress:'fa-hourglass-half' };
    const titles = { success:'Completed', info:'Notice', warning:'Action needed', error:'Unable to complete', progress:'In progress' };
    function dismiss(id) { active.get(id)?.close(); }
    function notify(input, type = 'info', options = {}) {
        if (input && typeof input === 'object') { options = { ...input, ...options }; type = input.type || type; input = input.message || ''; }
        const message = String(input || '').trim();
        if (!message) return null;
        type = ({ danger:'error', failed:'error', loading:'progress', canceled:'info', cancelled:'info', released:'success', submitted:'success', unreleased:'warning' })[type] || type;
        if (!icons[type]) type = 'info';
        const placement = ['top-right','bottom-left','top-center'].includes(options.placement) ? options.placement : ['error','warning'].includes(type) ? 'top-right' : 'bottom-left';
        const id = String(options.id || 'message:' + message);
        dismiss(id);
        // Native dialogs occupy the browser top layer. Their notices must live there too.
        const dialogs = Array.from(document.querySelectorAll('dialog[open]'));
        const host = dialogs.at(-1) || document.body;
        if (!host) return null;
        let stack = Array.from(host.children).find(node => node.dataset?.sigmaFeedbackStack === placement);
        if (!stack) { stack = document.createElement('div'); stack.className = 'sigma-feedback-stack sigma-feedback-stack--' + placement; stack.dataset.sigmaFeedbackStack = placement; host.append(stack); }
        while (stack.children.length >= 3) { const first = stack.firstElementChild; dismiss(first.dataset.feedbackId); }
        const compact = options.compact ?? !['warning','error'].includes(type);
        const toast = document.createElement('div');
        toast.className = 'sigma-feedback-toast ' + (compact ? 'sigma-release-toast-panel sigma-feedback-compact' : 'sigma-toast-panel sigma-feedback-card') + ' sigma-feedback-' + type;
        toast.dataset.feedbackId = id;
        toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
        toast.setAttribute('aria-atomic','true');
        const icon = document.createElement('span'); icon.className = 'sigma-feedback-icon'; icon.setAttribute('aria-hidden','true');
        const glyph = document.createElement('i'); glyph.className = 'fa-solid ' + icons[type]; icon.append(glyph);
        if (type === 'progress') { glyph.remove(); const dots = document.createElement('span'); dots.className = 'sigma-dot-spinner'; icon.append(dots); }
        const content = document.createElement('div'); content.className = 'sigma-feedback-content';
        if (!compact || options.title) { const heading = document.createElement('p'); heading.className = 'sigma-feedback-title'; heading.textContent = options.title || titles[type]; content.append(heading); }
        const text = document.createElement('p'); text.className = 'sigma-feedback-message'; text.textContent = message; content.append(text);
        const closeButton = document.createElement('button'); closeButton.type = 'button'; closeButton.className = 'sigma-feedback-close'; closeButton.setAttribute('aria-label','Dismiss notification'); closeButton.textContent = '×';
        toast.append(icon, content, closeButton);
        let timer, remaining = Number(options.duration ?? (type === 'error' ? 9000 : type === 'warning' ? 7000 : 4500)), started;
        const persistent = options.persistent ?? type === 'progress';
        const close = () => { clearTimeout(timer); toast.remove(); active.delete(id); if (!stack.children.length) stack.remove(); };
        const resume = () => { if (!persistent) { started = Date.now(); timer = setTimeout(close, Math.max(1000, remaining)); } };
        const pause = () => { clearTimeout(timer); if (started) remaining -= Date.now() - started; started = null; };
        closeButton.onclick = close;
        toast.addEventListener('mouseenter',pause); toast.addEventListener('mouseleave',resume);
        toast.addEventListener('focusin',pause); toast.addEventListener('focusout',resume);
        active.set(id,{close}); stack.append(toast); resume();
        return { id, close };
    }
    window.showValidationToast = (input) => notify(input, 'warning');
    window.SigmaFeedback = { notify, dismiss, notice:(message,type='warning',options={})=>notify(message,type,options) };
    // Existing feature controllers use all three names. Keep one implementation.
    window.showToast = window.showToastNotification = window.showGlobalToast = (message,type='info',options={}) => notify(message,type,options);
})();
