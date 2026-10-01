<?php
/**
 * SIGMA ELMS - Universal HTML Header Component
 * Interface Computer College
 */
require_once __DIR__ . '/../../config/app.php';
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title><?= htmlspecialchars($pageTitle ?? (APP_NAME . ' - ' . SCHOOL_NAME)) ?></title>
    <link rel="icon" type="image/jpeg" href="../image/ICC logo.jpg">

    <!-- FONTS: Google Inter + Outfit + Font Awesome Icons -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" crossorigin="anonymous" referrerpolicy="no-referrer" />

    <!-- PAGE-SPECIFIC STYLESHEET -->
    <?php if (isset($extraCss)): ?>
        <?php if (is_array($extraCss)): ?>
            <?php foreach ($extraCss as $cssFile): ?>
                <link rel="stylesheet" href="<?= htmlspecialchars(strpos($cssFile, 'http') === 0 ? $cssFile : '../' . ltrim($cssFile, '/')) ?>?v=<?= time() ?>">
            <?php endforeach; ?>
        <?php else: ?>
            <link rel="stylesheet" href="<?= htmlspecialchars(strpos($extraCss, 'http') === 0 ? $extraCss : '../' . ltrim($extraCss, '/')) ?>?v=<?= time() ?>">
        <?php endif; ?>
    <?php endif; ?>

    <!-- UNIFIED COMPONENT STYLESHEETS (matching HTML pages) -->
    <link rel="stylesheet" href="../css/forms.css?v=<?= time() ?>">
    <link rel="stylesheet" href="../css/topbar.css?v=<?= time() ?>">
    <link rel="stylesheet" href="../css/profile.css?v=<?= time() ?>">
    <link rel="stylesheet" href="../css/shared-components.css?v=<?= time() ?>">
    <link rel="stylesheet" href="../css/sigma-analytics.css?v=<?= time() ?>">
    <link rel="stylesheet" href="../css/announcements.css?v=<?= time() ?>">
    <link rel="stylesheet" href="../css/announcement-cards.css?v=<?= time() ?>">

    <!-- TAILWIND CSS: Compiled (no CDN, no production warning) -->
    <link rel="stylesheet" href="../css/tailwind.css?v=<?= time() ?>">
    <link rel="stylesheet" href="../css/sidebar.css?v=<?= time() ?>">

    <!-- OPTIONAL HEAD INJECTIONS (Libraries like Chart.js / Sortable.js) -->
    <?php if (isset($extraHead)) echo $extraHead; ?>
</head>
<body class="<?= htmlspecialchars($bodyClass ?? 'bg-gray-50 text-slate-800 font-sans flex flex-col min-h-screen') ?>">
