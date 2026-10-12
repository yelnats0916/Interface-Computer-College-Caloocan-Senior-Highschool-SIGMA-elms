const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

console.log('Running Quiz Form Scrollbar Style Verification Tests...');

const formsCss = fs.readFileSync(path.join(__dirname, '../css/forms.css'), 'utf8');

// 1. Verify that quiz modals are removed from 6px skinny capsule scrollbar rules
assert.ok(
    !formsCss.includes('#sigma-quiz-form-modal .sigma-modal-panel > .flex-1::-webkit-scrollbar,\n#student-preview-modal'),
    'Quiz forms must not be in the 6px skinny scrollbar block'
);

// 2. Verify width and height of quiz modal scrollbars (15px standard matching main page)
assert.ok(
    formsCss.includes('body :is(#universal-quiz-preview-modal, #sigma-quiz-form-modal, #student-preview-modal)::-webkit-scrollbar') &&
    formsCss.includes('width: 15px !important;'),
    'Quiz modals must have 15px width scrollbar matching main portal scroll'
);

// 3. Verify light track styling matching main page (#f1f1f1)
assert.ok(
    formsCss.includes('body :is(#universal-quiz-preview-modal, #sigma-quiz-form-modal, #student-preview-modal)::-webkit-scrollbar-track') &&
    formsCss.includes('background-color: #f1f1f1 !important;'),
    'Quiz modal scrollbar track must have solid #f1f1f1 light background'
);

// 4. Verify inset rounded thumb styling matching main page (#c1c1c1 with #f1f1f1 border)
assert.ok(
    formsCss.includes('body :is(#universal-quiz-preview-modal, #sigma-quiz-form-modal, #student-preview-modal)::-webkit-scrollbar-thumb') &&
    formsCss.includes('background-color: #c1c1c1 !important;') &&
    formsCss.includes('border: 3px solid #f1f1f1 !important;'),
    'Quiz modal scrollbar thumb must have inset border and #c1c1c1 grey fill'
);

// 5. Verify scrollbar buttons (arrows) are enabled and styled
assert.ok(
    formsCss.includes('body :is(#universal-quiz-preview-modal, #sigma-quiz-form-modal, #student-preview-modal)::-webkit-scrollbar-button') &&
    formsCss.includes('display: block !important;') &&
    formsCss.includes('height: 15px !important;'),
    'Quiz modal scrollbar buttons must be displayed with 15px dimensions'
);

// 6. Verify decrement (top up-arrow) and increment (bottom down-arrow) SVG icons
assert.ok(
    formsCss.includes('::-webkit-scrollbar-button:single-button:vertical:decrement') &&
    formsCss.includes('d=\'M8 4.8l4.8 5.8H3.2L8 4.8z\''),
    'Scrollbar top decrement button must have upward triangle arrow SVG'
);

assert.ok(
    formsCss.includes('::-webkit-scrollbar-button:single-button:vertical:increment') &&
    formsCss.includes('d=\'M8 11.2L3.2 5.4h9.6L8 11.2z\''),
    'Scrollbar bottom increment button must have downward triangle arrow SVG'
);

console.log('ALL TESTS PASSED: Quiz Form Scrollbar Style verified to match main page scrollbar!');
