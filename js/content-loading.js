/* Content-only busy feedback. Does not replace the initial page shimmer. */
(function () {
    'use strict';
    if (window.SigmaContentLoading) return;
    const states = new WeakMap();
    const sizes = new ResizeObserver(entries => entries.forEach(({target, contentRect}) => {
        const state = states.get(target);
        if (state) state.spinner.style.setProperty('--sigma-loader-size', `${Math.round(Math.max(20, Math.min(64, Math.min(contentRect.width, contentRect.height) * .18)))}px`);
    }));
    function show(content) {
        if (!content) return () => {};
        const previous = states.get(content);
        if (previous) previous.clear();
        const busy = content.getAttribute('aria-busy');
        const hadHost = content.classList.contains('sigma-content-loading-host');
        const overlay = document.createElement('div');
        overlay.className = 'sigma-content-loading-overlay';
        overlay.setAttribute('role', 'status');
        overlay.setAttribute('aria-label', 'Loading content');
        const spinner = document.createElement('span');
        spinner.className = 'sigma-dot-spinner';
        spinner.setAttribute('aria-hidden', 'true');
        overlay.appendChild(spinner);
        content.classList.add('sigma-content-loading-host');
        content.setAttribute('aria-busy', 'true');
        content.appendChild(overlay);
        const clear = () => {
            if (states.get(content)?.overlay !== overlay) return;
            sizes.unobserve(content);
            overlay.remove();
            if (!hadHost) content.classList.remove('sigma-content-loading-host');
            if (busy === null) content.removeAttribute('aria-busy');
            else content.setAttribute('aria-busy', busy);
            states.delete(content);
        };
        states.set(content, {spinner, overlay, clear});
        sizes.observe(content);
        return clear;
    }
    // Existing asynchronous panels already render loading icons inside their
    // content regions. Size those icons from that region; keep button icons inline.
    const iconSelector = 'i.fa-spinner.fa-spin,i.fa-circle-notch.fa-spin';
    const iconRegions = new Set();
    const iconSizes = new ResizeObserver(entries => entries.forEach(({target, contentRect}) => {
        target.querySelectorAll(iconSelector).forEach(icon => {
            if (!icon.closest('button,[role="button"]')) icon.style.setProperty('--sigma-loader-size', `${Math.round(Math.max(20, Math.min(48, Math.min(contentRect.width, contentRect.height) * .18)))}px`);
        });
        if (!target.querySelector(iconSelector)) { iconSizes.unobserve(target); iconRegions.delete(target); }
    }));
    function watch(node) {
        if (node.nodeType !== 1) return;
        const icons = node.matches(iconSelector) ? [node] : node.querySelectorAll(iconSelector);
        icons.forEach(icon => {
            if (icon.closest('button,[role="button"]')) return;
            const region = icon.closest('[role="status"], [aria-busy="true"]') || icon.parentElement;
            if (region) { iconRegions.add(region); iconSizes.observe(region); }
        });
    }
    new MutationObserver(records => {
        iconRegions.forEach(region => { if (!region.isConnected) { iconSizes.unobserve(region); iconRegions.delete(region); } });
        records.forEach(record => {
        if (record.type === 'attributes') watch(record.target);
        else record.addedNodes.forEach(watch);
        });
    }).observe(document.documentElement, {childList:true, subtree:true, attributes:true, attributeFilter:['class']});
    document.addEventListener('DOMContentLoaded', () => watch(document.body), {once:true});
    window.SigmaContentLoading = {show};
})();
