const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

console.log('Running Calendar Timeline Footer Clock Icon Green Test...');

// 1. Verify in js/calendar.js
const calendarJs = fs.readFileSync(path.resolve(__dirname, '..', 'js', 'calendar.js'), 'utf8');
assert(calendarJs.includes('fa-solid fa-clock text-[#15803d] text-xs'), 'js/calendar.js must use fa-solid fa-clock text-[#15803d] in timeline footer');
assert(!calendarJs.includes('fa-regular fa-clock text-slate-400 text-xs'), 'js/calendar.js must NOT use grey fa-regular clock in timeline footer');
console.log('✓ js/calendar.js clock icons verified.');

// 2. Verify in js/teacher.js
const teacherJs = fs.readFileSync(path.resolve(__dirname, '..', 'js', 'teacher.js'), 'utf8');
assert(teacherJs.includes('fa-solid fa-clock text-[#15803d] text-xs'), 'js/teacher.js must use fa-solid fa-clock text-[#15803d] in timeline footer');
assert(!teacherJs.includes('fa-regular fa-clock text-slate-400 text-xs'), 'js/teacher.js must NOT use grey fa-regular clock in timeline footer');
console.log('✓ js/teacher.js clock icons verified.');

// 3. Verify in css/calendar.css and css/teacher.css
const calendarCss = fs.readFileSync(path.resolve(__dirname, '..', 'css', 'calendar.css'), 'utf8');
assert(calendarCss.includes('.calendar-timeline-footer i') && calendarCss.includes('color: #15803d !important;'), 'css/calendar.css must style .calendar-timeline-footer i with #15803d');

const teacherCss = fs.readFileSync(path.resolve(__dirname, '..', 'css', 'teacher.css'), 'utf8');
assert(teacherCss.includes('.calendar-timeline-footer i') && teacherCss.includes('color: #15803d !important;'), 'css/teacher.css must style .calendar-timeline-footer i with #15803d');
console.log('✓ CSS styles verified in css/calendar.css and css/teacher.css.');

// 4. Verify timeline duration subtitles have black fade in JS and CSS
assert(calendarJs.includes('timeline-duration text-black-fade'), 'js/calendar.js must include text-black-fade on timeline-duration');
assert(teacherJs.includes('timeline-duration text-black-fade'), 'js/teacher.js must include text-black-fade on timeline-duration');
assert(calendarCss.includes('.calendar-timeline-time .timeline-duration') && calendarCss.includes('rgba(0, 0, 0, 0.45)'), 'css/calendar.css must style .timeline-duration with black fade');
assert(teacherCss.includes('.calendar-timeline-time .timeline-duration') && teacherCss.includes('rgba(0, 0, 0, 0.45)'), 'css/teacher.css must style .timeline-duration with black fade');
console.log('✓ Timeline duration subtitles verified with black fade styling.');

console.log('ALL CALENDAR TIMELINE ICONS & SUBTITLES TESTS PASSED! 🎉');
