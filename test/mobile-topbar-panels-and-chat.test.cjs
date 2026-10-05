const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('Testing Mobile Topbar Panels Switching, Bounds, and SIGMA AI Chat Layout...');

const mobileCss = fs.readFileSync(path.join(__dirname, '..', 'css', 'mobile.css'), 'utf8');
const topbarCss = fs.readFileSync(path.join(__dirname, '..', 'css', 'topbar.css'), 'utf8');
const topbarJs = fs.readFileSync(path.join(__dirname, '..', 'js', 'topbar.js'), 'utf8');

// 1. Verify animations removed from mobile topbar icon panels to ensure instant, clean switching
assert(
    !mobileCss.includes('body.mobile-panel-open #noti-dropdown:not(.hidden),\n    body.mobile-panel-open #calendar-dropdown:not(.hidden),\n    body.mobile-panel-open #analytics-dropdown:not(.hidden),\n    body.mobile-panel-open #schedule-dropdown:not(.hidden) {\n        position: fixed !important;\n        left: 0 !important;\n        right: 0 !important;\n        width: 100vw !important;\n        max-width: 100vw !important;\n        top: calc(clamp(17px, 4.2vw, 21px) + clamp(40px, 10.5vw, 46px)) !important;\n        height: calc(100vh - clamp(17px, 4.2vw, 21px) - clamp(40px, 10.5vw, 46px)) !important;\n        height: calc(100dvh - clamp(17px, 4.2vw, 21px) - clamp(40px, 10.5vw, 46px)) !important;\n        max-height: calc(100vh - clamp(17px, 4.2vw, 21px) - clamp(40px, 10.5vw, 46px)) !important;\n        max-height: calc(100dvh - clamp(17px, 4.2vw, 21px) - clamp(40px, 10.5vw, 46px)) !important;\n        bottom: 0 !important;\n        border-radius: 0 !important;\n        border: none !important;\n        box-shadow: none !important;\n        z-index: 250 !important;\n        background-color: #ffffff !important;\n        display: flex !important;\n        flex-direction: column !important;\n        overflow-y: auto !important;\n        -webkit-overflow-scrolling: touch !important;\n        overscroll-behavior: contain !important;\n        animation: mobilePanelSlideIn'),
    'mobile.css should NOT have mobilePanelSlideIn on panels'
);

assert(
    mobileCss.includes('body.mobile-panel-open #sigmaAiPanel:not(.hidden)') &&
    mobileCss.includes('overflow: hidden !important;') &&
    mobileCss.includes('display: flex !important;\n        flex-direction: column !important;'),
    'mobile.css must keep sigmaAiPanel container overflow hidden so pinned bottom composer does not get pushed off screen'
);

// 2. Verify 100dvh override does NOT force topbar panels to extend beyond the viewport
const raw100dvhMatch = mobileCss.match(/body\.mobile-panel-open #sigmaAiPanel:not\(\.hidden\)[^{]*\{[^}]*height:\s*100dvh\s*!important/);
assert(!raw100dvhMatch, 'sigmaAiPanel must not have height: 100dvh !important without subtracting top offset');

// 3. Verify SIGMA AI composer input sizing and mobile usability
assert(
    mobileCss.includes('body.mobile-panel-open #sigmaAiPanel #sigmaAiInput') &&
    mobileCss.includes('font-size: 16px !important;') &&
    mobileCss.includes('pointer-events: auto !important;'),
    'mobile.css must enforce 16px font-size and pointer-events on sigmaAiInput'
);

// 4. Verify panel switch order in topbar.js (target panel activates before hiding previous)
assert(
    topbarJs.includes('const targetPanel = panels.find(p => p.name === panelName);') &&
    topbarJs.includes('targetPanel.el.classList.remove(\'hidden\');') &&
    topbarJs.includes('p.el.classList.add(\'hidden\');'),
    'topbar.js must activate targetPanel first so switching is seamless without flash'
);

// 5. Verify safe area padding for bottom scroll areas
assert(
    mobileCss.includes('padding-bottom: max(32px, calc(20px + env(safe-area-inset-bottom, 16px))) !important;'),
    'mobile.css must provide bottom safe area padding against mobile browser toolbars'
);

// 6. Verify calendar outside dismiss does NOT dismiss in mobile mode or on pointerdown across subbar
const calendarJs = fs.readFileSync(path.join(__dirname, '..', 'js', 'calendar.js'), 'utf8');
assert(
    !calendarJs.includes('window.addEventListener(\'pointerdown\', handleCalendarDropdownOutsideDismiss, true);'),
    'calendar.js must NOT capture pointerdown which prematurely closes calendar when holding other icons'
);
assert(
    calendarJs.includes('document.body.classList.contains(\'mobile-panel-open\')'),
    'calendar.js handleCalendarDropdownOutsideDismiss must check mobile-panel-open'
);

// 7. Verify material panels to Task Progress gap on mobile matches topic panel gap
const topicDetailCss = fs.readFileSync(path.join(__dirname, '..', 'css', 'topic-detail.css'), 'utf8');
assert(
    mobileCss.includes('#assessment-list,\n    #handout-list {\n        padding-bottom: 0 !important;\n    }') &&
    mobileCss.includes('#assessment-list > :last-child,') &&
    mobileCss.includes('#handout-list > :last-child'),
    'mobile.css must eliminate bottom padding and last-child bottom margin on material lists'
);
assert(
    topicDetailCss.includes('#assessment-list,\n    #handout-list {\n        padding: 4px 0 0 0 !important;'),
    'topic-detail.css must not have large bottom padding on mobile assessment and handout lists'
);

// 8. Verify topic panel subtitle is black fade both desktop and mobile
const sharedComponentsJs = fs.readFileSync(path.join(__dirname, '..', 'js', 'shared-components.js'), 'utf8');
assert(
    sharedComponentsJs.includes('<p class="text-black-fade">${escapeHtml(overview)}</p>'),
    'shared-components.js renderSharedTopicCard must apply text-black-fade to topic subtitle'
);
assert(
    mobileCss.includes('.topic-card__body p,\n    .student-topic-card__body p,\n    .teacher-topic-card__body p,\n    .room-embedded-topics .topic-card__body p,\n    .room-embedded-topics .student-topic-card__body p,\n    .room-embedded-topics .teacher-topic-card__body p {\n        display: block !important;\n        -webkit-line-clamp: 2 !important;\n        -webkit-box-orient: vertical !important;\n        line-clamp: 2 !important;\n        overflow: hidden !important;\n        text-overflow: ellipsis !important;\n        white-space: normal !important;\n        word-break: break-word !important;\n        margin: 0 !important;\n        font-size: 10px !important;\n        line-height: 1.35 !important;\n        color: rgba(0, 0, 0, 0.45) !important;'),
    'mobile.css must style topic card body p with color: rgba(0, 0, 0, 0.45) !important'
);
assert(
    topicDetailCss.includes('.topic-card__body p,\n.student-topic-card__body p,\n.teacher-topic-card__body p {\n    margin: 0;\n    color: rgba(0, 0, 0, 0.45) !important;'),
    'topic-detail.css must style desktop topic card body p with color: rgba(0, 0, 0, 0.45) !important'
);

console.log('PASS: Mobile topbar panels switching, viewport bounds, SIGMA AI chat layout, material-to-progress panel gap, and topic subtitle black fade verified successfully.');
