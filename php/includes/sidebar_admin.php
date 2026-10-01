<?php
/**
 * SIGMA ELMS - Admin Sidebar Navigation Component
 * Interface Computer College - Caloocan Senior High School ELMS
 */
$activeTab = $activeTab ?? 'home';
?>
<!-- ADMIN SIDEBAR -->
<aside id="sidebar"
    class="fixed top-[82px] left-0 h-[calc(100vh-82px)] bg-admin-primary text-white flex flex-col z-[200] overflow-y-auto custom-scrollbar transition-all duration-300">
    <nav class="py-4 flex flex-col">
        <!-- 1. Home / Dashboard -->
        <a href="admin.php?tab=home" id="nav-dashboard" class="nav-link <?= $activeTab === 'home' ? 'active' : '' ?> no-underline group">
            <div class="sidebar-rail-icon">
                <i class="fa-solid fa-house text-xl"></i>
                <span class="rail-label">Home</span>
            </div>
            <span class="full-label text-[13px] whitespace-nowrap overflow-hidden font-medium">Home</span>
        </a>

        <!-- 2. User Accounts -->
        <a href="admin.php?tab=users" id="nav-users-accounts" class="nav-link <?= $activeTab === 'users' ? 'active' : '' ?> no-underline">
            <div class="sidebar-rail-icon">
                <i class="fa-solid fa-users-gear text-xl"></i>
                <span class="rail-label">User Accounts</span>
            </div>
            <span class="full-label text-[13px] whitespace-nowrap overflow-hidden font-medium">User Accounts</span>
        </a>

        <!-- 3. School Management -->
        <div class="nav-group" data-sidebar-group="school-mgmt">
            <button id="nav-school-mgmt" type="button" data-toggle="submenu"
                class="nav-link nav-link--group w-full no-underline group cursor-pointer">
                <div class="sidebar-rail-icon">
                    <i class="fa-solid fa-school-flag text-xl"></i>
                    <span class="rail-label">School</span>
                </div>
                <span class="full-label text-[13px] whitespace-nowrap overflow-hidden font-medium">School Management</span>
                <i class="fa-solid fa-chevron-right sidebar-group-chevron text-[10px] transition-transform duration-300 ml-auto mr-2"
                    id="school-mgmt-chevron"></i>
            </button>
            <div id="school-mgmt-submenu" class="sidebar-submenu hidden">
                <a href="admin.php?tab=school-profile" id="nav-school-profile" class="nav-sublink <?= $activeTab === 'school-profile' ? 'active' : '' ?> no-underline">
                    <i class="fa-solid fa-building-columns"></i>
                    <span>School Profile</span>
                </a>
                <a href="admin.php?tab=school-year" id="nav-school-year" class="nav-sublink <?= $activeTab === 'school-year' ? 'active' : '' ?> no-underline">
                    <i class="fa-solid fa-calendar-check"></i>
                    <span>School Year</span>
                </a>
                <a href="admin.php?tab=sections" id="nav-school-sections" class="nav-sublink <?= $activeTab === 'sections' ? 'active' : '' ?> no-underline">
                    <i class="fa-solid fa-layer-group"></i>
                    <span>Sections</span>
                </a>
                <a href="admin.php?tab=subjects" id="nav-school-subjects" class="nav-sublink <?= $activeTab === 'subjects' ? 'active' : '' ?> no-underline">
                    <i class="fa-solid fa-book-open"></i>
                    <span>Subjects</span>
                </a>
                <a href="admin.php?tab=grades" id="nav-school-grades" class="nav-sublink <?= in_array($activeTab, ['grades', 'analytics', 'gradebooks', 'reports-performance', 'reports-gradebooks', 'school-grades']) ? 'active' : '' ?> no-underline">
                    <i class="fa-solid fa-chart-bar"></i>
                    <span>Grades</span>
                </a>
            </div>
        </div>

        <!-- 4. Reports -->
        <div class="nav-group" data-sidebar-group="reports">
            <button id="nav-reports" type="button" data-toggle="submenu"
                class="nav-link nav-link--group w-full no-underline group cursor-pointer" title="Reports">
                <div class="sidebar-rail-icon">
                    <i class="fa-solid fa-chart-line text-xl"></i>
                    <span class="rail-label">Reports</span>
                </div>
                <span class="full-label text-[13px] whitespace-nowrap overflow-hidden font-medium">Reports</span>
                <i class="fa-solid fa-chevron-right sidebar-group-chevron text-[10px] transition-transform duration-300 ml-auto mr-2"
                    id="reports-chevron"></i>
            </button>
            <div id="reports-submenu" class="sidebar-submenu hidden">
                <a href="admin.php?tab=reports-ai" id="nav-reports-ai" class="nav-sublink <?= $activeTab === 'reports-ai' ? 'active' : '' ?> no-underline">
                    <i class="fa-solid fa-brain"></i>
                    <span>AI Reports</span>
                </a>
                <a href="admin.php?tab=reports-attendance" id="nav-reports-attendance" class="nav-sublink <?= $activeTab === 'reports-attendance' ? 'active' : '' ?> no-underline">
                    <i class="fa-solid fa-calendar-check"></i>
                    <span>Attendance Reports</span>
                </a>
            </div>
        </div>

        <!-- 5. Resources -->
        <div class="nav-group">
            <a href="admin.php?tab=resources" id="nav-resources" class="nav-link <?= $activeTab === 'resources' ? 'active' : '' ?> no-underline group">
                <div class="sidebar-rail-icon">
                    <i class="fa-solid fa-folder-open text-xl"></i>
                    <span class="rail-label">Resources</span>
                </div>
                <span class="full-label text-[13px] whitespace-nowrap overflow-hidden font-medium">Resources</span>
            </a>
        </div>

        <!-- 6. Audit Logs -->
        <div class="nav-group" data-sidebar-group="audit-logs">
            <button id="nav-audit-logs" type="button" data-toggle="submenu"
                class="nav-link nav-link--group w-full no-underline group cursor-pointer">
                <div class="sidebar-rail-icon">
                    <i class="fa-solid fa-clipboard-list text-xl"></i>
                    <span class="rail-label">Audit Logs</span>
                </div>
                <span class="full-label text-[13px] whitespace-nowrap overflow-hidden font-medium">Audit Logs</span>
                <i class="fa-solid fa-chevron-right sidebar-group-chevron text-[10px] transition-transform duration-300 ml-auto mr-2"
                    id="audit-logs-chevron"></i>
            </button>
            <div id="audit-logs-submenu" class="sidebar-submenu hidden">
                <a href="admin.php?tab=audit-ai" id="nav-audit-ai" class="nav-sublink <?= $activeTab === 'audit-ai' ? 'active' : '' ?> no-underline">
                    <i class="fa-solid fa-robot"></i>
                    <span>AI Logs</span>
                </a>
                <a href="admin.php?tab=audit-activity" id="nav-audit-activity" class="nav-sublink <?= $activeTab === 'audit-activity' ? 'active' : '' ?> no-underline">
                    <i class="fa-solid fa-shoe-prints"></i>
                    <span>Activity Logs</span>
                </a>
                <a href="admin.php?tab=audit-auth" id="nav-audit-auth" class="nav-sublink <?= $activeTab === 'audit-auth' ? 'active' : '' ?> no-underline">
                    <i class="fa-solid fa-right-to-bracket"></i>
                    <span>Authentication Logs</span>
                </a>
            </div>
        </div>

        <!-- 7. Settings -->
        <div class="nav-group" data-sidebar-group="settings">
            <button id="nav-settings" type="button" data-toggle="submenu"
                class="nav-link nav-link--group w-full no-underline group cursor-pointer">
                <div class="sidebar-rail-icon">
                    <i class="fa-solid fa-sliders text-xl"></i>
                    <span class="rail-label">System</span>
                </div>
                <span class="full-label text-[13px] whitespace-nowrap overflow-hidden font-medium">System Settings</span>
                <i class="fa-solid fa-chevron-right sidebar-group-chevron text-[10px] transition-transform duration-300 ml-auto mr-2"
                    id="settings-chevron"></i>
            </button>
            <div id="settings-submenu" class="sidebar-submenu hidden">
                <a href="admin.php?tab=settings-security" id="nav-settings-security" data-settings-page="security" class="nav-sublink no-underline">
                    <i class="fa-solid fa-shield-halved"></i>
                    <span>Security &amp; Access</span>
                </a>
                <a href="admin.php?tab=settings-branding" id="nav-settings-branding" data-settings-page="branding" class="nav-sublink no-underline">
                    <i class="fa-solid fa-palette"></i>
                    <span>Branding &amp; Appearance</span>
                </a>
                <a href="admin.php?tab=settings-integrations" id="nav-settings-integrations" data-settings-page="integrations" class="nav-sublink no-underline">
                    <i class="fa-solid fa-plug"></i>
                    <span>Integrations &amp; Storage</span>
                </a>
            </div>
        </div>

        <div class="mt-auto pb-4"></div>
    </nav>
</aside>
