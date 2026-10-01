<?php
/**
 * SIGMA ELMS - Shared Home Page Welcome Panel Component
 * Standardized across Admin, Teacher, and Student portals.
 *
 * Expected variables (set before including this file):
 *   $welcomeImgId  (string) - ID for the <img> element  e.g. 'welcome-panel-admin-img'
 *   $welcomeRole   (string) - 'admin' | 'teacher' | 'student'
 */
$welcomeImgId = $welcomeImgId ?? 'welcome-panel-img';
$welcomeRole  = $welcomeRole  ?? 'student';
?>
<div class="welcome-panel">
    <img id="<?= htmlspecialchars($welcomeImgId) ?>" src="image/ICC Goals.jpeg" onerror="this.src='../image/ICC Goals.jpeg'" alt="Welcome to ICC" class="w-full h-full object-cover">
    <div class="welcome-panel-overlay"></div>
    <div class="welcome-panel-content">
        <h4>Welcome back,<?php if ($welcomeRole === 'admin'): ?> <span id="welcome-user-role">Admin</span><?php endif; ?> <span id="welcome-user-firstName">User</span>!</h4>
        <h2>INTERFACE COMPUTER COLLEGE</h2>
    </div>
</div>
