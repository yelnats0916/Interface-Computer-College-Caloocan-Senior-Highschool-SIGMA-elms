<?php
/**
 * SIGMA ELMS - Landing Navigation Header Component
 */
?>
<!-- NAVIGATION: Fixed top navbar with ICC branding -->
<header id="mainNav"
    class="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-8 bg-white border-b border-icc lg:shadow-sm h-[82px]">
    <div class="flex items-center gap-3 no-underline h-full">
        <a href="#" id="backToLoginLogo" class="flex items-center no-underline">
            <img src="../image/ICC logo.jpg" alt="ICC Logo"
                class="w-[48px] h-[48px] md:w-[56px] md:h-[56px] object-contain">
        </a>
        <div id="navContextBox" class="flex items-center gap-2 ml-1 md:ml-3">
            <i id="navIcon" class="fa-solid fa-circle-info text-2xl icon-black-fade hidden pointer-events-none"></i>
            <div class="flex flex-col">
                <h1 id="navTitle" class="text-xl font-bold text-black leading-tight"><?= SCHOOL_NAME ?></h1>
                <span id="navSubtitle" class="text-xs text-black-fade font-medium"><?= SCHOOL_SUBTITLE ?></span>
            </div>
        </div>
    </div>

    <div class="flex items-center">
        <button id="helpCenterNavMenuBtn" type="button" aria-expanded="false" aria-label="Open help categories"
            class="hidden xl:hidden w-10 h-10 rounded-xl bg-transparent text-gray-700 items-center justify-center transition-colors cursor-pointer outline-none shadow-none border-none hover:bg-gray-100">
            <i class="fa-solid fa-bars text-lg pointer-events-none"></i>
        </button>

        <!-- HELP CENTER BUTTON (Desktop XL Only) -->
        <button id="entryHelpCenterBtn"
            class="hidden xl:flex group self-stretch px-4 md:px-8 bg-white text-black font-bold items-center gap-3 transition-colors cursor-pointer outline-none shadow-none no-underline border-none">
            <i
                class="fa-solid fa-circle-info text-2xl md:text-3xl icon-black-fade group-hover:text-icc-yellow transition-colors pointer-events-none"></i>
            <span class="text-base md:text-xl font-bold">Help Center</span>
        </button>
    </div>
</header>
