const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

console.log('Running Admin Section Step Badges & Buttons Verification Tests...');

const adminJs = fs.readFileSync(path.join(__dirname, '../js/admin.js'), 'utf8');
const adminHtml = fs.readFileSync(path.join(__dirname, '../admin.html'), 'utf8');
const adminCss = fs.readFileSync(path.join(__dirname, '../css/admin.css'), 'utf8');
const phpView = fs.readFileSync(path.join(__dirname, '../php/includes/school_sections_view.php'), 'utf8');

// 1. Check mark icon lowered scale in JS
assert.ok(
    adminJs.includes('const SECTION_STEP_CHECK_SVG = `<svg class="w-2.5 h-2.5 text-white" style="width:8.5px;height:8.5px;display:block;"') &&
    adminJs.includes('stroke-width="2.2"'),
    'SECTION_STEP_CHECK_SVG in js/admin.js must have lowered scale (8.5px, stroke-width 2.2)'
);

// 2. Step badge sized to w-5 h-5 in JS
assert.ok(
    adminJs.includes("el.className = 'w-5 h-5 rounded-full bg-[#15803d] text-white flex items-center justify-center font-[\\'Inter\\'] transition-colors shrink-0';"),
    'Completed step badge in js/admin.js must be w-5 h-5'
);

// 3. Removed icons from Change/Assign Subject in JS
assert.ok(
    adminJs.includes('assignSubjectHeaderBtn.innerHTML = `<span id="section-assign-subject-btn-text">Change Subject</span>`;') &&
    adminJs.includes('assignSubjectHeaderBtn.innerHTML = `<span id="section-assign-subject-btn-text">Assign Subject</span>`;'),
    'Subject buttons in js/admin.js must not contain icons before text'
);

// 4. Removed icons from Change/Assign Schedule in JS
assert.ok(
    adminJs.includes('assignScheduleHeaderBtn.innerHTML = `<span id="section-assign-schedule-btn-text">Change Schedule</span>`;') &&
    adminJs.includes('assignScheduleHeaderBtn.innerHTML = `<span id="section-assign-schedule-btn-text">Assign Schedule</span>`;'),
    'Schedule buttons in js/admin.js must not contain icons before text'
);

// 5. Removed icons and count from Teacher buttons in JS (count is in dedicated non-clickable span)
assert.ok(
    adminJs.includes('assignTeacherHeaderBtn.innerHTML = `<span id="section-assign-teacher-btn-text">Teachers</span>`;') &&
    adminJs.includes('assignTeacherHeaderBtn.innerHTML = `<span id="section-assign-teacher-btn-text">Add Teacher</span>`;') &&
    adminJs.includes('assignTeacherHeaderBtn.innerHTML = `<span id="section-assign-teacher-btn-text">Assign Teacher</span>`;') &&
    adminJs.includes("teacherCountEl.textContent = teachersList.length >= 2 ? `(${teachersList.length})` : '';"),
    'Teacher buttons in js/admin.js must not contain icons or count inside the clickable button'
);

// 6. Removed icons from Student buttons in JS
assert.ok(
    adminJs.includes('assignStudentsHeaderBtn.innerHTML = `<span id="section-assign-students-btn-text">Assign Students</span>`;'),
    'Students button in js/admin.js must not contain icon before text'
);

// 7. Verify admin.html initial markup has w-5 h-5 and no icons
assert.ok(
    adminHtml.includes('id="section-subject-step-num" class="w-5 h-5 rounded-full') &&
    adminHtml.includes('id="section-schedule-step-num" class="w-5 h-5 rounded-full') &&
    adminHtml.includes('id="section-teacher-step-num" class="w-5 h-5 rounded-full') &&
    adminHtml.includes('id="section-students-step-num" class="w-5 h-5 rounded-full'),
    'admin.html step badges must be initialized with w-5 h-5'
);

assert.ok(
    !adminHtml.includes('<i class="fa-solid fa-book-medical text-base text-[#15803d]"></i>\r\n                                                <span id="section-assign-subject-btn-text">') &&
    !adminHtml.includes('<i class="fa-solid fa-book-medical text-base text-[#15803d]"></i>\n                                                <span id="section-assign-subject-btn-text">') &&
    !adminHtml.includes('<i class="fa-solid fa-calendar-days text-base text-[#15803d]"></i>\r\n                                                <span id="section-assign-schedule-btn-text">') &&
    !adminHtml.includes('<i class="fa-solid fa-calendar-days text-base text-[#15803d]"></i>\n                                                <span id="section-assign-schedule-btn-text">'),
    'admin.html section assign buttons must not contain icons before text'
);

// 8. Verify css/admin.css styling
assert.ok(
    adminCss.includes('width: 20px !important;') &&
    adminCss.includes('height: 20px !important;') &&
    adminCss.includes('width: 8.5px !important;') &&
    adminCss.includes('height: 8.5px !important;'),
    'css/admin.css must enforce 20px badge and 8.5px SVG scale'
);

// 10. Verify admin.html has dedicated non-clickable teacher count span matching students
assert.ok(
    adminHtml.includes('id="section-assigned-teachers-count"') &&
    adminHtml.includes('class="text-sm font-normal" style="color: rgba(0,0,0,0.45);"') &&
    adminHtml.includes('id="section-assigned-students-count"'),
    'admin.html must contain section-assigned-teachers-count styled with text-sm font-normal rgba(0,0,0,0.45)'
);

// 11. Verify php/includes/school_sections_view.php has dedicated teacher count span
assert.ok(
    phpView.includes('id="section-assigned-teachers-count"'),
    'php/includes/school_sections_view.php must contain section-assigned-teachers-count span'
);

console.log('ALL TESTS PASSED: Admin Section Step Badges & Buttons successfully verified!');
