const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

console.log('Running Subject Edit Overlay Scroll Lock Verification Test...');

// 1. Verify css/topic-detail.css modal exclusions and lock rules
const topicDetailCssPath = path.resolve(__dirname, '..', 'css', 'topic-detail.css');
const topicDetailCss = fs.readFileSync(topicDetailCssPath, 'utf8');

assert(
    topicDetailCss.includes(':not(:has(#subject-edit-overlay:not(.hidden)))'),
    'topic-detail.css must exclude #subject-edit-overlay from html/body overflow-y: auto'
);
assert(
    topicDetailCss.includes('html:has(#section-topic-content:not(.hidden)):has(#subject-edit-overlay:not(.hidden))'),
    'topic-detail.css must lock html when #subject-edit-overlay is open over section-topic-content'
);
assert(
    topicDetailCss.includes('body:has(#section-topic-content:not(.hidden)):has(#subject-edit-overlay:not(.hidden))'),
    'topic-detail.css must lock body when #subject-edit-overlay is open over section-topic-content'
);
console.log('✓ css/topic-detail.css scroll lock rules verified.');

// 2. Verify css/teacher.css scroll lock rules
const teacherCssPath = path.resolve(__dirname, '..', 'css', 'teacher.css');
const teacherCss = fs.readFileSync(teacherCssPath, 'utf8');

assert(
    teacherCss.includes('html:has(#subject-edit-overlay:not(.hidden))'),
    'teacher.css must include html:has(#subject-edit-overlay:not(.hidden))'
);
assert(
    teacherCss.includes('body:has(#subject-edit-overlay:not(.hidden))'),
    'teacher.css must include body:has(#subject-edit-overlay:not(.hidden))'
);
assert(
    teacherCss.includes('#subject-edit-overlay') && teacherCss.includes('overscroll-behavior-y: contain !important;'),
    'teacher.css must set overscroll-behavior-y: contain on #subject-edit-overlay'
);
console.log('✓ css/teacher.css scroll lock rules verified.');

// 3. Verify css/forms.css modal overlay scrollbar and touch behavior
const formsCssPath = path.resolve(__dirname, '..', 'css', 'forms.css');
const formsCss = fs.readFileSync(formsCssPath, 'utf8');

assert(
    formsCss.includes('.sigma-modal-overlay::-webkit-scrollbar'),
    'forms.css must define custom scrollbar for .sigma-modal-overlay'
);
assert(
    formsCss.includes('overscroll-behavior-y: contain !important;'),
    'forms.css must set overscroll-behavior-y: contain on .sigma-modal-overlay'
);
console.log('✓ css/forms.css overlay scrollbar & touch styles verified.');

// 4. Verify js/subject-editor.js locking & unlocking invocations
const subjectEditorJsPath = path.resolve(__dirname, '..', 'js', 'subject-editor.js');
const subjectEditorJs = fs.readFileSync(subjectEditorJsPath, 'utf8');

assert(
    subjectEditorJs.includes("window.lockBodyScroll()") || subjectEditorJs.includes("document.body.style.overflow = 'hidden'"),
    'subject-editor.js must lock body scroll when opening overlay'
);
assert(
    subjectEditorJs.includes("window.unlockBodyScroll()") || subjectEditorJs.includes("document.body.style.overflow = ''"),
    'subject-editor.js must unlock body scroll when closing overlay'
);
console.log('✓ js/subject-editor.js modal open/close scroll locking verified.');

console.log('ALL SUBJECT EDIT OVERLAY SCROLL LOCK TESTS PASSED! 🎉');
