<?php
/**
 * SIGMA ELMS - Shared Announcement Composer Trigger Button
 * Used by Admin and Teacher portals only (students cannot post).
 * No variables needed — this block is identical for both roles.
 */
?>
<div class="bg-white border border-slate-200 standard-panel-shadow rounded-[22px] p-3">
    <button id="trigger-announcement-composer" onclick="window.openComposerModal()"
        class="w-full h-10 bg-slate-100 hover:bg-slate-200 transition-all rounded-full px-6 text-left text-black-fade text-[13px] font-medium flex items-center gap-3 group">
        <i class="fa-solid fa-bullhorn text-[12px] icon-black-fade"></i>
        <span>What do you want to announce?</span>
    </button>
</div>
