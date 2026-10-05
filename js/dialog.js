/**
 * SIGMA ELMS - Reusable Global Confirmation & Asking Panel Controller (js/dialog.js)
 * Interface Computer College - Caloocan Senior High School ELMS
 * 
 * Provides the unified Asking Panel / Confirmation dialog overlay across all portals.
 */
(function (window) {
    'use strict';

    window.openAskingPanel = function (options = {}) {
        let overlay = document.getElementById('sigma-universal-ask-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'sigma-universal-ask-overlay';
            overlay.className = 'fixed inset-0 bg-black/50 z-[99999] hidden flex items-center justify-center p-3 sm:p-4';
            overlay.style.zIndex = '99999';
            overlay.innerHTML = `
                <div id="sigma-universal-ask-card" class="sigma-universal-ask-card bg-white rounded-[18px] sm:rounded-[22px] border border-slate-200/90 shadow-2xl w-full max-w-[330px] sm:max-w-[360px] p-4 sm:p-5 font-['Inter'] mx-auto box-border transition-all">
                    <div class="text-center space-y-2 sm:space-y-2.5">
                        <div id="sigma-ask-icon-wrap" class="w-10 h-10 sm:w-12 sm:h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-black border border-slate-100 shadow-xs">
                            <i id="sigma-ask-icon" class="fa-solid fa-circle-info text-base sm:text-lg text-[#15803d]"></i>
                        </div>
                        <h3 id="sigma-ask-title" class="text-sm sm:text-base font-bold text-black leading-snug tracking-tight">Notice</h3>
                        <p id="sigma-ask-desc" class="text-[11.5px] sm:text-[12.5px] font-normal sm:font-medium text-slate-600 sm:text-slate-700 px-1 leading-relaxed">Explanation text goes here.</p>
                    </div>
                    <div id="sigma-ask-actions" class="mt-4 sm:mt-4.5 grid grid-cols-2 gap-2 sm:gap-2.5">
                        <button type="button" id="sigma-ask-cancel-btn" class="h-9 sm:h-10 px-3 bg-slate-100 text-slate-800 rounded-xl text-xs sm:text-[12.5px] font-semibold capitalize tracking-normal hover:bg-slate-200 active:scale-[0.98] transition-all cursor-pointer font-['Inter'] shadow-none border border-slate-200/60">Cancel</button>
                        <button type="button" id="sigma-ask-proceed-btn" class="h-9 sm:h-10 px-3 bg-[#15803d] text-white rounded-xl text-xs sm:text-[12.5px] font-semibold capitalize tracking-normal hover:bg-[#166534] active:scale-[0.98] transition-all cursor-pointer font-['Inter'] shadow-none border border-transparent">OK</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
        }

        const titleEl = overlay.querySelector('#sigma-ask-title');
        const descEl = overlay.querySelector('#sigma-ask-desc');
        const iconEl = overlay.querySelector('#sigma-ask-icon');
        const actionsEl = overlay.querySelector('#sigma-ask-actions');
        const cancelBtn = overlay.querySelector('#sigma-ask-cancel-btn');
        const proceedBtn = overlay.querySelector('#sigma-ask-proceed-btn');
        const card = overlay.querySelector('#sigma-universal-ask-card');

        // Variants let high-focus flows use an appropriately sized desktop dialog.
        if (card) card.classList.toggle('sigma-universal-ask-card--quiz-start', options.variant === 'quiz-start');

        const title = options.title || 'Notice';
        const message = options.message || options.desc || '';
        const iconClass = options.icon || (options.type === 'warning' ? 'fa-solid fa-triangle-exclamation text-amber-500' : (options.type === 'danger' ? 'fa-solid fa-trash-can text-red-600' : 'fa-solid fa-circle-info text-[#15803d]'));
        const confirmText = options.confirmText || 'OK';
        const cancelText = options.cancelText || 'Cancel';
        // Default to showing cancel button unless explicitly set to false
        const showCancel = (options.showCancel !== undefined) ? Boolean(options.showCancel) : true;

        if (titleEl) titleEl.textContent = title;
        if (descEl) descEl.textContent = message;
        if (iconEl) iconEl.className = iconClass + ' text-base sm:text-lg';

        if (proceedBtn) {
            proceedBtn.textContent = confirmText;
            if (options.confirmClass) {
                proceedBtn.className = `h-9 sm:h-10 px-3 ${options.confirmClass} rounded-xl text-xs sm:text-[12.5px] font-semibold capitalize tracking-normal active:scale-[0.98] transition-all cursor-pointer font-['Inter'] shadow-none border border-transparent`;
            } else if (options.type === 'danger') {
                proceedBtn.className = 'h-9 sm:h-10 px-3 bg-red-600 text-white rounded-xl text-xs sm:text-[12.5px] font-semibold capitalize tracking-normal hover:bg-red-700 active:scale-[0.98] transition-all cursor-pointer font-[\'Inter\'] shadow-none border border-transparent';
            } else {
                proceedBtn.className = 'h-9 sm:h-10 px-3 bg-[#15803d] text-white rounded-xl text-xs sm:text-[12.5px] font-semibold capitalize tracking-normal hover:bg-[#166534] active:scale-[0.98] transition-all cursor-pointer font-[\'Inter\'] shadow-none border border-transparent';
            }
            proceedBtn.onclick = function () {
                overlay.classList.add('hidden');
                if (typeof options.onConfirm === 'function') {
                    setTimeout(() => {
                        options.onConfirm();
                    }, 0);
                }
            };
        }

        if (cancelBtn) {
            cancelBtn.textContent = cancelText;
            if (showCancel) {
                cancelBtn.classList.remove('hidden');
                if (actionsEl) {
                    actionsEl.className = 'mt-4 sm:mt-4.5 grid grid-cols-2 gap-2 sm:gap-2.5';
                }
                cancelBtn.onclick = function () {
                    overlay.classList.add('hidden');
                    if (typeof options.onCancel === 'function') options.onCancel();
                };
            } else {
                cancelBtn.classList.add('hidden');
                if (actionsEl) {
                    actionsEl.className = 'mt-4 sm:mt-4.5 flex items-center justify-center';
                }
            }
        }

        overlay.classList.remove('hidden');
    };

    window.closeAskingPanel = function () {
        const overlay = document.getElementById('sigma-universal-ask-overlay');
        if (overlay) overlay.classList.add('hidden');
    };

    window.showConfirmDialog = window.openAskingPanel;
})(window);

