<?php
/**
 * SIGMA ELMS - Teacher Sidebar Navigation Component
 * Interface Computer College - Caloocan Senior High School ELMS
 */
$activeTab = $activeTab ?? 'home';
?>
<!-- TEACHER SIDEBAR -->
<aside id="sidebar"
    class="fixed top-[82px] left-0 h-[calc(100vh-82px)] bg-admin-primary text-white flex flex-col z-[200] overflow-y-auto custom-scrollbar transition-all duration-300">
    <nav class="py-4 flex flex-col">
        <!-- 1. Home / Dashboard -->
        <a href="teacher.php?tab=home" id="nav-dashboard" class="nav-link <?= $activeTab === 'home' ? 'active' : '' ?> no-underline group" title="Home">
            <div class="sidebar-rail-icon">
                <i class="fa-solid fa-house text-xl"></i>
                <span class="rail-label">Home</span>
            </div>
            <span class="full-label text-[13px] whitespace-nowrap overflow-hidden font-medium">Home</span>
        </a>

        <!-- 2. My Classes (Accordion showing the 2 Sections) -->
        <div class="nav-group" data-sidebar-group="classes">
            <button id="nav-classes" type="button" data-toggle="submenu"
                class="nav-link nav-link--group w-full no-underline group cursor-pointer" title="My Classes">
                <div class="sidebar-rail-icon">
                    <i class="fa-solid fa-door-open text-xl"></i>
                    <span class="rail-label">My Classes</span>
                </div>
                <span class="full-label text-[13px] whitespace-nowrap overflow-hidden font-medium">My Classes</span>
                <i class="fa-solid fa-chevron-right sidebar-group-chevron"></i>
            </button>
            <div id="sections-submenu" class="sidebar-submenu hidden teacher-section-nav-children">
                <div class="px-4 py-3 text-xs text-gray-400 select-none">No sections assigned</div>
            </div>
        </div>

        <!-- 5. Grades & Gradebook -->
        <a href="teacher.php?tab=grades" id="nav-grades" class="nav-link <?= in_array($activeTab, ['grades', 'grades-analytics', 'grades-gradebook']) ? 'active' : '' ?> no-underline group cursor-pointer" title="Grades">
            <div class="sidebar-rail-icon">
                <i class="fa-solid fa-chart-bar text-xl"></i>
                <span class="rail-label">Grades</span>
            </div>
            <span class="full-label text-[13px] whitespace-nowrap overflow-hidden font-medium">Grades</span>
        </a>

        <!-- 6. Resources -->
        <a href="teacher.php?tab=resources" id="nav-resources" class="nav-link <?= $activeTab === 'resources' ? 'active' : '' ?> no-underline group" title="Resources">
            <div class="sidebar-rail-icon">
                <i class="fa-solid fa-folder-open text-xl"></i>
                <span class="rail-label">Resources</span>
            </div>
            <span class="full-label text-[13px] whitespace-nowrap overflow-hidden font-medium">Resources</span>
        </a>

        <div class="mt-auto pb-4"></div>
    </nav>
</aside>
