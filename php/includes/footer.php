<?php
/**
 * SIGMA ELMS - Universal HTML Footer Component
 */
?>
    <!-- CORE SHARED COMPONENT CONTROLLERS -->
    <script src="../js/audit-display.js?v=<?= filemtime(dirname(__DIR__, 2) . '/js/audit-display.js') ?>"></script>
    <script src="../js/table-pagination.js?v=<?= filemtime(dirname(__DIR__, 2) . '/js/table-pagination.js') ?>"></script>
    <?php if (($topbarHeaderId ?? '') === 'admin-header'): ?>
    <link rel="stylesheet" href="../css/log-pagination.css?v=<?= filemtime(dirname(__DIR__, 2) . '/css/log-pagination.css') ?>">
    <script src="../js/log-pagination.js?v=<?= filemtime(dirname(__DIR__, 2) . '/js/log-pagination.js') ?>"></script>
    <link rel="stylesheet" href="../css/record-lifecycle.css?v=<?= filemtime(dirname(__DIR__, 2) . '/css/record-lifecycle.css') ?>">
    <script src="../js/service-vault-security.js?v=<?= filemtime(dirname(__DIR__, 2) . '/js/service-vault-security.js') ?>"></script>
    <?php endif; ?>
    <link rel="stylesheet" href="../css/sigma-message-format.css?v=20261022_reply_format_v1">
    <script src="../js/sigma-message-format.js?v=20261022_reply_format_v1"></script>
    <script src="../js/shared-components.js?v=<?= time() ?>"></script>
    <?php if (($topbarHeaderId ?? '') === 'teacher-header'): ?>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
    <?php endif; ?>
    <script src="../js/submission-ai-client.js?v=<?= filemtime(dirname(__DIR__, 2) . '/js/submission-ai-client.js') ?>"></script>
    <script src="../js/secure-input-guard.js?v=<?= time() ?>"></script>
    <script src="../js/topbar.js?v=<?= time() ?>"></script>
    <script src="../js/sigma-chat-client.js?v=<?= filemtime(dirname(__DIR__, 2) . '/js/sigma-chat-client.js') ?>"></script>
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

    <script src="../js/ai-database-store.js?v=<?= filemtime(dirname(__DIR__, 2) . '/js/ai-database-store.js') ?>"></script>
    <script src="../js/chat-history-recovery.js?v=<?= filemtime(dirname(__DIR__, 2) . '/js/chat-history-recovery.js') ?>"></script>
    <?php if (($topbarHeaderId ?? '') === 'admin-header'): ?>
    <script src="../js/record-lifecycle.js?v=<?= filemtime(dirname(__DIR__, 2) . '/js/record-lifecycle.js') ?>"></script>
    <?php endif; ?>
    <!-- OPTIONAL PAGE-SPECIFIC JAVASCRIPT INJECTION -->
    <script src="../js/recaptcha-client.js?v=<?= time() ?>"></script>
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
    <script src="../js/sigma-conversations.js?v=<?= filemtime(dirname(__DIR__, 2) . '/js/sigma-conversations.js') ?>"></script>
    <script src="../js/ai-log-store.js?v=<?= filemtime(dirname(__DIR__, 2) . '/js/ai-log-store.js') ?>"></script>
    <script src="../js/ai-log-preview.js?v=<?= filemtime(dirname(__DIR__, 2) . '/js/ai-log-preview.js') ?>"></script>
    <script src="../js/ai-log-details.js?v=<?= filemtime(dirname(__DIR__, 2) . '/js/ai-log-details.js') ?>"></script>
    <script src="../js/institution-branding.js?v=<?= filemtime(dirname(__DIR__, 2) . '/js/institution-branding.js') ?>"></script>
    <script src="../js/slideshow-settings.js?v=<?= filemtime(dirname(__DIR__, 2) . '/js/slideshow-settings.js') ?>"></script>
    <script src="../js/welcome-banner-settings.js?v=<?= filemtime(dirname(__DIR__, 2) . '/js/welcome-banner-settings.js') ?>"></script>
    <?php if (isset($inlineJs)) echo "<script>{$inlineJs}</script>"; ?>
</body>
</html>
