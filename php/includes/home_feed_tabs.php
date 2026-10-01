<?php
/**
 * SIGMA ELMS - Shared Announcement Feed Tabs + Container
 * Standardized across Admin, Teacher, and Student portals.
 *
 * Expected variables (set before including this file):
 *   $feedContainerId (string) - ID for the feed <div> e.g. 'admin-announcements-feed'
 *   $showPostsTab    (bool)   - Whether to render the "Posts" tab (admin/teacher = true, student = false)
 */
$feedContainerId = $feedContainerId ?? 'announcements-feed';
$showPostsTab    = $showPostsTab    ?? false;
?>
<!-- ── Announcement Feed Tabs ─────────────────────────────── -->
<div class="sigma-feed-tabs-container">
    <button type="button" class="sigma-feed-tab-btn active" data-announcement-tab="all">Announcements</button>
    <button type="button" class="sigma-feed-tab-btn" data-announcement-tab="important">Important</button>
    <?php if ($showPostsTab): ?>
        <button type="button" class="sigma-feed-tab-btn" data-announcement-tab="posts">Posts</button>
    <?php endif; ?>
</div>

<!-- ── Feed Container (populated by announcements.js) ─────── -->
<div id="<?= htmlspecialchars($feedContainerId) ?>" class="space-y-3.5">
    <!-- No Announcements Yet - fallback shown while JS loads -->
    <div id="<?= htmlspecialchars($feedContainerId) ?>-empty" class="sigma-announcements-empty-state" style="display:none;">
        <div class="sigma-empty-icon-circle">
            <i class="fa-solid fa-bullhorn"></i>
        </div>
        <h4 class="sigma-empty-title">No Announcements Yet</h4>
        <p class="sigma-empty-subtitle">When announcements are posted, they&rsquo;ll appear here.</p>
    </div>
</div>
