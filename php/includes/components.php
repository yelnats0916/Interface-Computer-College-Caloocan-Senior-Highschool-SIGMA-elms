<?php
/**
 * SIGMA ELMS - Reusable UI Components & Helper Functions
 */

function renderStatWidget($title, $count, $iconClass, $color = 'icc', $subtitle = '') {
    ?>
    <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
        <div>
            <p class="text-[11px] font-black text-slate-400 uppercase tracking-widest"><?= htmlspecialchars($title) ?></p>
            <h2 class="text-3xl font-black text-slate-900 mt-2"><?= htmlspecialchars($count) ?></h2>
            <?php if (!empty($subtitle)): ?>
                <p class="text-xs text-slate-500 mt-1"><?= htmlspecialchars($subtitle) ?></p>
            <?php endif; ?>
        </div>
        <div class="w-14 h-14 rounded-2xl bg-<?= $color ?>-50 text-[#15803d] flex items-center justify-center text-2xl">
            <i class="<?= htmlspecialchars($iconClass) ?>"></i>
        </div>
    </div>
    <?php
}

function renderSubjectCard($title, $subjectCode, $teacherName, $coverImage = 'image/default-book.jpg') {
    ?>
    <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all group">
        <div class="h-36 bg-slate-100 overflow-hidden relative">
            <img src="../<?= htmlspecialchars($coverImage) ?>" alt="<?= htmlspecialchars($title) ?>" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
            <span class="absolute top-3 left-3 bg-[#15803d] text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-lg">
                <?= htmlspecialchars($subjectCode) ?>
            </span>
        </div>
        <div class="p-5">
            <h3 class="font-bold text-slate-900 text-base leading-snug"><?= htmlspecialchars($title) ?></h3>
            <p class="text-xs text-slate-500 mt-2 flex items-center gap-2">
                <i class="fa-solid fa-user-tie text-[10px] text-slate-400"></i> <?= htmlspecialchars($teacherName) ?>
            </p>
        </div>
    </div>
    <?php
}

function renderBadge($status) {
    $statusLower = strtolower(trim($status));
    $classes = [
        'active'    => 'bg-green-100 text-green-800 border-green-200',
        'inactive'  => 'bg-red-100 text-red-800 border-red-200',
        'pending'   => 'bg-yellow-100 text-yellow-800 border-yellow-200',
        'enrolled'  => 'bg-blue-100 text-blue-800 border-blue-200',
    ];
    $badgeClass = $classes[$statusLower] ?? 'bg-slate-100 text-slate-800 border-slate-200';
    ?>
    <span class="px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full border <?= $badgeClass ?>">
        <?= htmlspecialchars($status) ?>
    </span>
    <?php
}
