const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../js/settings-view.js'), 'utf8');
const events = new Map();
const window = {};
const document = { readyState: 'loading', addEventListener: (name, fn) => events.set(name, fn) };
vm.runInNewContext(source.slice(source.indexOf('// System settings numeric counters')), { window, document });
const normalize = window.SigmaSettingsCounters.normalize;
const input = (value, min = '1', max = '50', step = '1') => ({ value, min, max, step,
    validity: { badInput: false }, matches: () => true, setAttribute() {}, getAttribute: () => '3' });
let box = input('1243242'); normalize(box); assert.equal(box.value, '50');
box = input(''); normalize(box); assert.equal(box.value, ''); normalize(box, true); assert.equal(box.value, '3');
box = input('0'); normalize(box, true); assert.equal(box.value, '1');
box = input('1e3'); normalize(box); assert.equal(box.value, '3');
box = input('-10'); normalize(box); assert.equal(box.value, '3');
box = input('13', '10', '100', '5'); normalize(box, true); assert.equal(box.value, '15');
box = input('99999', '5', '50', '5'); normalize(box); assert.equal(box.value, '50');
box = input('1', '10', '100', '5'); normalize(box); assert.equal(box.value, '1'); normalize(box, true); assert.equal(box.value, '10');
box = input('999'); box.disabled = true; normalize(box); assert.equal(box.value, '999');
for (const key of ['e', '+', '-', '.', ',']) {
    let prevented = false;
    events.get('keydown')({ target: input('3'), key, preventDefault() { prevented = true; } });
    assert.equal(prevented, true);
}
for (const value of ['abc', '-4', '1e3', '3.5']) {
    let prevented = false;
    events.get('paste')({ target: input('3'), clipboardData: { getData: () => value }, preventDefault() { prevented = true; } });
    assert.equal(prevented, true);
}
console.log('Settings counters enforce digits, ranges, empty-field recovery, and per-field steps');
