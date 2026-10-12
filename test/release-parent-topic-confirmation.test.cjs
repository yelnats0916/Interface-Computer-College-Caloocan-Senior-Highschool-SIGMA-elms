const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../js/curriculum-release.js'), 'utf8');
const start = source.indexOf('    window.submitTopicsAndMaterialsPicker = function () {');
const end = source.indexOf('\n    };', start) + '\n    };'.length;

function fixture(selected, rows) {
    let prompt;
    const calls = [];
    const working = new Map(selected.map(item => [`${item.category}::${item.id}`, item]));
    const window = {
        _topicsAndMaterialsPickerWorking: working,
        openAskingPanel: options => { prompt = options; },
        openTeacherUnifiedScheduleModal: (...args) => calls.push(args)
    };
    const inputs = rows.map(([category, id, parent]) => ({
        dataset: { category, id },
        closest: () => ({ querySelector: () => parent ? { dataset: { id: parent, title: `Topic ${parent}` } } : null })
    }));
    vm.runInNewContext(source.slice(start, end), {
        window, Map, document: { querySelectorAll: () => inputs },
        currentTopicState: { subjectId: 'programming', selectedSection: 'Rizal' }
    });
    return { window, working, calls, get prompt() { return prompt; } };
}
const material = (id, category = 'learning') => ({ category, id, title: id });

const draft = fixture([material('m1')], [['learning', 'm1', 't1'], ['learning', 'sibling', 't1']]);
draft.window.submitTopicsAndMaterialsPicker();
assert.equal(draft.calls.length, 0, 'Set Schedule pauses before scheduling');
assert.equal(draft.prompt.title, 'Include Required Topic?');
assert.equal(draft.prompt.cancelText, 'Go Back');
assert.equal(draft.working.size, 1, 'Opening or cancelling confirmation does not change selection');
assert.equal(draft.window._unifiedPickerSelection, undefined, 'No schedule draft written before confirmation');
draft.prompt.onConfirm();
assert.equal(draft.calls.length, 1);
assert.deepEqual(Array.from(draft.window._unifiedPickerSelection.topics), ['t1']);
assert.deepEqual(Array.from(draft.window._unifiedPickerSelection.learning), ['m1']);
assert.equal(draft.working.has('learning::sibling'), false, 'Unchecked sibling remains draft');
assert.equal(draft.window._topicReleaseDraftState.pendingTopicIds[0], 't1');

const released = fixture([material('m1')], [['learning', 'm1', null]]);
released.window.submitTopicsAndMaterialsPicker();
assert.equal(released.prompt, undefined, 'Released parent does not trigger asking panel');
assert.equal(released.calls.length, 1);

const explicit = fixture([material('m1'), material('t1', 'topics')], [['learning', 'm1', 't1']]);
explicit.window.submitTopicsAndMaterialsPicker();
assert.equal(explicit.prompt, undefined, 'Explicitly selected topic needs no extra confirmation');

const multiple = fixture([material('m1'), material('a1', 'assessments'), material('m2')], [
    ['learning', 'm1', 't1'], ['assessments', 'a1', 't1'], ['learning', 'm2', 't2']
]);
multiple.window.submitTopicsAndMaterialsPicker();
assert.equal(multiple.prompt.confirmText, 'Include Topics');
multiple.prompt.onConfirm();
assert.deepEqual(Array.from(multiple.window._unifiedPickerSelection.topics), ['t1', 't2'], 'Required parents deduplicated');
assert.deepEqual(Array.from(multiple.window._unifiedPickerSelection.assessments), ['a1']);

const stale = fixture([material('m1')], [['learning', 'm1', 't1']]);
stale.window.submitTopicsAndMaterialsPicker();
stale.window._topicsAndMaterialsPickerWorking = new Map();
stale.prompt.onConfirm();
assert.equal(stale.calls.length, 0, 'Leaving or rebuilding picker invalidates confirmation');
console.log('PASS: required parent confirmation blocks scheduling, includes only agreed topics, preserves siblings and skips released parents.');
