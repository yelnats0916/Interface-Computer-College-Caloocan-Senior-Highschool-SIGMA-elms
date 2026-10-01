<?php
/**
 * SIGMA ELMS - Universal HTML Footer Component
 */
?>
    <!-- CORE SHARED COMPONENT CONTROLLERS -->
    <script src="../js/shared-components.js?v=<?= time() ?>"></script>
    <script src="../js/secure-input-guard.js?v=<?= time() ?>"></script>
    <script src="../js/topbar.js?v=<?= time() ?>"></script>
    <script src="../js/sidebar.js?v=<?= time() ?>"></script>
    <script src="../js/notifications.js?v=<?= time() ?>"></script>
    <script src="../js/calendar.js?v=<?= time() ?>"></script>
    <script src="../js/announcements.js?v=<?= time() ?>"></script>
    <script src="../js/panels.js?v=<?= time() ?>"></script>
    <script src="../js/sigma-analytics.js?v=<?= time() ?>"></script>
    <script src="../js/profile-view.js?v=<?= time() ?>"></script>
    <script src="../js/dialog.js?v=<?= time() ?>"></script>
    <script src="../js/document-viewer.js?v=<?= time() ?>"></script>
    <script src="../js/settings-view.js?v=<?= time() ?>"></script>
    <script src="../js/resources-view.js?v=<?= time() ?>"></script>
    <script src="../js/subject-content-editor.js?v=<?= time() ?>"></script>
    <script src="../js/subject-editor.js?v=<?= time() ?>"></script>

    <!-- OPTIONAL PAGE-SPECIFIC JAVASCRIPT INJECTION -->
    <?php if (isset($extraJs)): ?>
        <?php if (is_array($extraJs)): ?>
            <?php foreach ($extraJs as $jsFile): ?>
                <?php
                    if (in_array(basename($jsFile), ['shared-components.js', 'topbar.js', 'sidebar.js', 'profile.js', 'profile-view.js', 'dialog.js', 'notifications.js', 'calendar.js', 'sigma-analytics.js', 'panels.js', 'announcements.js', 'document-viewer.js', 'settings-view.js', 'resources-view.js', 'subject-content-editor.js', 'subject-editor.js'])) continue;
                ?>
                <script src="<?= htmlspecialchars(strpos($jsFile, 'http') === 0 ? $jsFile : '../' . ltrim($jsFile, '/')) ?>?v=<?= time() ?>"></script>
            <?php endforeach; ?>
        <?php else: ?>
            <?php if (!in_array(basename($extraJs), ['shared-components.js', 'topbar.js', 'sidebar.js', 'profile.js', 'profile-view.js', 'dialog.js', 'notifications.js', 'calendar.js', 'sigma-analytics.js', 'panels.js', 'announcements.js', 'document-viewer.js', 'settings-view.js', 'subject-content-editor.js', 'subject-editor.js'])): ?>
                <script src="<?= htmlspecialchars(strpos($extraJs, 'http') === 0 ? $extraJs : '../' . ltrim($extraJs, '/')) ?>?v=<?= time() ?>"></script>
            <?php endif; ?>
        <?php endif; ?>
    <?php endif; ?>

    <!-- INLINE SCRIPTS -->
    <?php if (isset($inlineJs)) echo "<script>{$inlineJs}</script>"; ?>
</body>
</html>
