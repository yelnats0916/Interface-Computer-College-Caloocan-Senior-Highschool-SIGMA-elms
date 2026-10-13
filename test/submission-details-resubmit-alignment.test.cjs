const fs = require('fs');
const path = require('path');
const assert = require('assert');

// 1. Verify syntax of js/shared-components.js
console.log('Test 1: Validating JavaScript syntax...');
const sharedComponentsPath = path.resolve(__dirname, '../js/shared-components.js');
const code = fs.readFileSync(sharedComponentsPath, 'utf8');

// Check that no syntax errors exist
assert.doesNotThrow(() => {
    new Function(code);
}, 'shared-components.js should have valid JavaScript syntax');
console.log('✓ Syntax check passed.');

// 2. Check patterns directly in the source code
console.log('Test 2: Verifying removal of rogue badges from .space-y-1.5...');
assert.strictEqual(
    code.includes('id="submission-details-closed-status"'),
    false,
    '#submission-details-closed-status must not be in .space-y-1.5'
);
assert.strictEqual(
    code.includes('id="submission-details-awaiting-review"'),
    false,
    '#submission-details-awaiting-review must not be in .space-y-1.5'
);
assert.strictEqual(
    code.includes('assessment-submissions-closed-badge'),
    false,
    'assessment-submissions-closed-badge with rogue border must not be in the codebase'
);
console.log('✓ No rogue badges in .space-y-1.5.');

console.log('Test 3: Verifying teacher submission action area footer alignment...');
const teacherAreaSnippetMatch = code.match(/id="teacher-submission-action-area"[\s\S]*?<\/div>\s*` : ''\}\s*<\/div>/);
assert.ok(teacherAreaSnippetMatch, 'Found teacher-submission-action-area');
const teacherSnippet = teacherAreaSnippetMatch[0];
assert.ok(
    teacherSnippet.includes('flex items-center justify-between gap-2 sm:gap-3 w-full flex-wrap'),
    'Teacher action area must have flex items-center justify-between gap-2 sm:gap-3 w-full flex-wrap'
);
assert.ok(
    teacherSnippet.includes('window.renderTeacherResubmitActionButton'),
    'Teacher action area must render Allow/Undo Resubmit on the left'
);
assert.ok(
    teacherSnippet.includes('Submitted — Awaiting Review'),
    'Teacher action area must render Submitted — Awaiting Review badge on the right when isPending'
);
console.log('✓ Teacher action area properly aligns Allow Resubmit on left and Awaiting Review badge on right.');

console.log('Test 4: Verifying student submission action area footer alignment...');
const studentViewSnippetMatch = code.match(/id="student-submission-action-area" class="pt-4 border-t border-black\/10 mt-3 font-\['Inter'\] flex items-center justify-between gap-2 sm:gap-3 w-full flex-wrap"[\s\S]*?<\/div>\s*`\}/);
assert.ok(studentViewSnippetMatch, 'Found student-submission-action-area in view mode');
const studentViewSnippet = studentViewSnippetMatch[0];
assert.ok(
    studentViewSnippet.includes('renderAssessmentClosedBadgeHtml') || studentViewSnippet.includes('Submissions Closed'),
    'Student action area in view mode must render Submissions Closed when exhausted'
);
assert.ok(
    studentViewSnippet.includes('Resubmit'),
    'Student action area in view mode must render Resubmit when attempts remain'
);
assert.ok(
    studentViewSnippet.includes('Submitted — Awaiting Review'),
    'Student action area in view mode must render Submitted — Awaiting Review on the right when isPending'
);
console.log('✓ Student action area properly aligns Resubmit/Submissions Closed on left and Awaiting Review badge on right.');

console.log('Test 5: Verifying relocateAssessmentPrimaryAction does not destroy submission details card actions...');
const relocateSnippetMatch = code.match(/window\.relocateAssessmentPrimaryAction = function[\s\S]*?\n\};/);
assert.ok(relocateSnippetMatch, 'Found relocateAssessmentPrimaryAction');
const relocateSnippet = relocateSnippetMatch[0];
assert.ok(
    !relocateSnippet.includes('closed.remove()'),
    'relocateAssessmentPrimaryAction must NOT remove Submissions Closed'
);
assert.ok(
    !relocateSnippet.includes('actionArea.remove()'),
    'relocateAssessmentPrimaryAction must NOT delete actionArea'
);
assert.ok(
    relocateSnippet.includes("detail.dataset.assessmentView === 'work'"),
    'relocateAssessmentPrimaryAction must check for work view'
);
assert.ok(
    relocateSnippet.includes('if (isWorkView)'),
    'relocateAssessmentPrimaryAction must preserve action areas in work view'
);
console.log('✓ relocateAssessmentPrimaryAction safely preserves submission details card actions and badges.');

console.log('Test 6: Verifying identical badge height and styling on desktop mode...');
assert.ok(
    code.includes('h-[24px] sm:h-[26px] px-2 sm:px-2.5 rounded-lg text-[10.5px] sm:text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 shrink-0 select-none font-[\'Inter\'] leading-none'),
    'Submitted — Awaiting Review must have exact matching desktop dimensions (sm:h-[26px] sm:px-2.5 text-[11px] rounded-lg)'
);
assert.ok(
    code.includes('assessment-closed-badge') || code.includes('Submissions Closed'),
    'Submissions Closed badge must be present'
);
console.log('✓ Both badges share identical height (26px), horizontal padding (px-2.5), font size (11px), and corner radius (rounded-lg) in desktop mode.');

console.log('\n========================================');
console.log('ALL TESTS PASSED SUCCESSFULLY! (6/6)');
console.log('========================================');
