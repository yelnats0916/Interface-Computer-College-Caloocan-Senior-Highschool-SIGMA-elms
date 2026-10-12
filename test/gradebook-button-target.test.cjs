const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../js/shared-components.js'), 'utf8');
const tag = source.split('\n').find(line => line.includes('class="sigma-btn sigma-btn-primary teacher-view-gradebook-btn"'));
assert.ok(!tag.includes('getElementById'));
const handler = tag.match(/onclick="([^"]+)"/)[1];
let destination;
const args = ['Programming', 'Rizal', encodeURIComponent('Quiz 1'), encodeURIComponent('quiz'), 'assessments', 2];
vm.runInNewContext(`(function () { ${handler} }).call(button);`, {
    window: { navigateToGradebookFromSubmission: (...values) => { destination = values; } },
    button: { dataset: { gradebookTarget: encodeURIComponent(JSON.stringify(args)) } }
});
assert.deepEqual(Array.from(destination), args);
console.log('PASS: Gradebook button navigates without a submission footer');
