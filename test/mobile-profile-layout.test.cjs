const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('Testing Mobile Profile Layout Requirements...');

// 1. Check HTML links for profile.css
const rootDir = path.resolve(__dirname, '..');
['teacher.html', 'student.html', 'admin.html'].forEach(file => {
    const content = fs.readFileSync(path.join(rootDir, file), 'utf8');
    assert(content.includes('css/profile.css'), `${file} should link css/profile.css`);
    assert(content.includes('css/mobile.css'), `${file} should link css/mobile.css`);
    assert(content.includes('js/profile-view.js'), `${file} should link js/profile-view.js`);
});
console.log('PASS: HTML files link css/profile.css, css/mobile.css, and js/profile-view.js');

// 2. Check profile-view.js template structure
const profileJs = fs.readFileSync(path.join(rootDir, 'js/profile-view.js'), 'utf8');
assert(profileJs.includes('id="user-profile-header-panel"'), 'profile-view.js must define #user-profile-header-panel');
assert(profileJs.includes('id="user-profile-banner-wrapper"'), 'profile-view.js must define #user-profile-banner-wrapper');
assert(profileJs.includes('id="user-profile-hero-banner"'), 'profile-view.js must define #user-profile-hero-banner');
assert(profileJs.includes('id="user-profile-hero-bg"'), 'profile-view.js must define #user-profile-hero-bg');
assert(profileJs.includes('id="user-profile-picture-trigger"'), 'profile-view.js must define #user-profile-picture-trigger');
assert(profileJs.includes('id="view-user-name-banner-heading"'), 'profile-view.js must define #view-user-name-banner-heading');
assert(!profileJs.includes('id="view-user-badges-wrap"'), 'profile-view.js must remove redundant banner role badge and id');
assert(profileJs.includes('id="user-profile-tabs-header-grid"'), 'profile-view.js must define #user-profile-tabs-header-grid');
console.log('PASS: js/profile-view.js defines semantic IDs for layout control and removed redundant banner badges');

// 3. Check mobile responsive CSS rules in both mobile.css and profile.css
['css/mobile.css', 'css/profile.css'].forEach(cssFile => {
    const css = fs.readFileSync(path.join(rootDir, cssFile), 'utf8');
    
    // Check full width banner & closed gap
    assert(css.includes('#user-profile-banner-wrapper'), `${cssFile} must style #user-profile-banner-wrapper`);
    assert(css.includes('#user-profile-hero-banner'), `${cssFile} must style #user-profile-hero-banner`);
    assert(css.includes('border-bottom-left-radius: 28px'), `${cssFile} must preserve bottom radius on hero banner`);
    assert(css.includes('border-bottom-right-radius: 28px'), `${cssFile} must preserve bottom radius on hero banner`);

    // Check scaled down avatar
    assert(css.includes('#user-profile-picture-trigger'), `${cssFile} must scale down #user-profile-picture-trigger`);
    assert(css.includes('margin-bottom: -36px'), `${cssFile} must scale down negative margin for avatar`);

    // Check scaled down text and downward adjusted name wrap
    assert(css.includes('#view-user-name-banner-heading'), `${cssFile} must style name heading`);
    assert(css.includes('#view-user-name-banner'), `${cssFile} must style name banner`);
    assert(css.includes('#user-profile-identity-wrap') && css.includes('align-self: flex-end'), `${cssFile} must adjust down identity wrap`);

    // Check full width divider border
    assert(css.includes('#user-profile-tabs-header-grid'), `${cssFile} must style tabs header grid`);
    assert(css.includes('border-top: 1px solid #e2e8f0'), `${cssFile} must provide full width border-top for tabs header grid`);

    // Check panel reordering: Subjects & Sections on top (order 1), Basic Details card below (order 2)
    assert(css.includes('#user-profile-right-panel') && css.includes('order: 1 !important'), `${cssFile} must set right panel order to 1 on mobile`);
    assert(css.includes('#user-profile-left-column') && css.includes('order: 2 !important'), `${cssFile} must set left column order to 2 on mobile`);

    // Check Achievements tab hidden on teacher portal
    assert(css.includes('body.teacher-portal #profile-tab-achievements'), `${cssFile} must explicitly hide achievements tab on teacher portal`);

    // Check scaling down of basic details card, icons, labels, and values
    assert(css.includes('#user-profile-basic-details-card'), `${cssFile} must style #user-profile-basic-details-card`);
    assert(css.includes('#user-profile-basic-details-card i') || css.includes('#user-profile-basic-details-card .fa-solid'), `${cssFile} must scale down icons`);
    assert(css.includes('#user-profile-basic-details-card p.font-semibold'), `${cssFile} must scale down labels`);
    assert(css.includes('#view-user-email'), `${cssFile} must scale down values`);

    // Check scaling down of Subjects/Sections and Bio panels
    assert(css.includes('#user-profile-tab-panel h3'), `${cssFile} must scale down tab panel headers`);
    assert(css.includes('#user-profile-bio-card-left-container h4') || css.includes('#edit-user-bio-form h4'), `${cssFile} must scale down bio headers`);
    assert(css.includes('#edit-user-bio-form input'), `${cssFile} must scale down bio inputs`);
});
console.log('PASS: Mobile responsive CSS enforces full width banner, preserved radius, scaled avatar & text, and full width border');

// 4. Check teacher.css hides achievements tab and reorders panels
const teacherCss = fs.readFileSync(path.join(rootDir, 'css/teacher.css'), 'utf8');
assert(teacherCss.includes('#user-profile-view #profile-tab-achievements') && teacherCss.includes('display: none !important'), 'teacher.css must hide achievements tab');
assert(teacherCss.includes('#user-profile-right-panel') && teacherCss.includes('order: 1 !important'), 'teacher.css must set right panel order to 1');
assert(teacherCss.includes('#user-profile-left-column') && teacherCss.includes('order: 2 !important'), 'teacher.css must set left column order to 2');
console.log('PASS: teacher.css hides achievements tab and sets mobile panel order');

// 5. Check Mobile Scroll Lock Fix & Failsafe
const topbarCss = fs.readFileSync(path.join(rootDir, 'css/topbar.css'), 'utf8');
assert(topbarCss.includes('body:has(#user-profile-view:not(.hidden))'), 'topbar.css must provide failsafe to unlock scroll when profile is active');
assert(profileJs.includes('closeMobileAccountPanel'), 'profile-view.js must dismiss mobile account panel on navigation');
assert(profileJs.includes('mobile-account-fullscreen'), 'profile-view.js must strip mobile-account-fullscreen class');

['teacher.html', 'student.html', 'admin.html'].forEach(file => {
    const content = fs.readFileSync(path.join(rootDir, file), 'utf8');
    assert(content.includes('closeMobileAccountPanel'), `${file} must close mobile account panel on hero click`);
});
console.log('PASS: Mobile scroll unlock fixes and failsafes verified');

console.log('All Mobile Profile Layout tests passed successfully!');

