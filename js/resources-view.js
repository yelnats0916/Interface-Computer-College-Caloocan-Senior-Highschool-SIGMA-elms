/**
 * SIGMA ELMS - Unified Resources View
 * Shared across Admin, Teacher, and Student portals.
 * Single source of truth — edit here to affect all roles.
 */
(function () {
    'use strict';

    function renderResourcesView() {
        const section = document.getElementById('resources-view');
        if (!section) return;

        section.innerHTML = `
<div class="flex flex-col items-center justify-center py-32 text-center select-none">
    <!-- Folder illustration -->
    <div class="mb-6 relative">
        <div class="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto" style="background: rgba(0,0,0,0.05);">
            <i class="fa-regular fa-folder-open text-5xl text-black-fade"></i>
        </div>
    </div>
    <h3 class="sigma-empty-title text-sm font-bold text-black mb-1">No Resources Yet</h3>
    <p class="sigma-empty-subtitle text-xs font-medium max-w-xs leading-relaxed text-black-fade">Resources will appear here once they are uploaded.</p>
</div>`;
    }

    // Re-render whenever the section becomes visible (navigation)
    const _observer = new MutationObserver(() => {
        const section = document.getElementById('resources-view');
        if (section && !section.classList.contains('hidden') && !section.querySelector('h3')) {
            renderResourcesView();
        }
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            renderResourcesView();
            const section = document.getElementById('resources-view');
            if (section && section.parentElement) {
                _observer.observe(section.parentElement, { attributes: true, subtree: true, attributeFilter: ['class'] });
            }
        });
    } else {
        renderResourcesView();
        const section = document.getElementById('resources-view');
        if (section && section.parentElement) {
            _observer.observe(section.parentElement, { attributes: true, subtree: true, attributeFilter: ['class'] });
        }
    }

    window.renderResourcesView = renderResourcesView;
})();
