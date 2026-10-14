const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const shared = fs.readFileSync('js/shared-components.js', 'utf8');
const editor = fs.readFileSync('js/subject-editor.js', 'utf8');
const stores = { 'sigma-admin-subjects': JSON.stringify([{ id: 'subj-ict', code: 'ICT204', name: 'Programming', type: 'Core', weights: { ww: 25, pt: 50, qa: 25 } }]) };
const storage = { getItem: key => stores[key] || null, setItem: (key, value) => { stores[key] = value; } };
const presets = [{ id: 'tvl-specialized', ww: 30, pt: 50, qa: 20 }];
const window = { location: { pathname: '/admin.html' }, getGradebookSubjectWeightKeys: () => ['Programming', 'ICT204', 'subj-ict'], getDepEdWeightPresets: () => presets };
const context = vm.createContext({ window, localStorage: storage });
for (const name of ['saveSubjectGradebookWeights', 'getSubjectGradebookWeights']) {
    const start = shared.indexOf(`window.${name} = function`);
    vm.runInContext(shared.slice(start, shared.indexOf('\n};', start) + 4), context);
}
window.saveSubjectGradebookWeights('Programming', presets[0]);
const subject = JSON.parse(stores['sigma-admin-subjects'])[0];
assert.equal(subject.weights.preset, 'tvl-specialized');
window.location.pathname = '/teacher.html';
for (const alias of ['Programming', 'ICT204', 'subj-ict']) {
    assert.equal(JSON.stringify(window.getSubjectGradebookWeights(alias)), JSON.stringify({ ww: 30, pt: 50, qa: 20 }));
}
const select = { value: subject.weights.preset };
context.document = { getElementById: id => id === 'edit-subject-type' ? { value: 'Core' } : select };
window._userManuallySelectedWeights = true;
const start = editor.indexOf('    window.syncDepEdWeightsDefault = function');
vm.runInContext(editor.slice(start, editor.indexOf('    window.handleSubjectTypeChange', start)), context);
window.syncDepEdWeightsDefault();
assert.equal(select.value, 'tvl-specialized', 'Opening Core subject preserves admin-selected weights');
window.syncDepEdWeightsDefault(true);
assert.equal(select.value, 'core', 'Explicit type change still resets the default');
assert.match(shared, /e\.key === 'sigma-admin-subjects'/);
console.log('PASS: admin Apply Weights persists subject preset; teacher aliases and edit form retain matching weights');
