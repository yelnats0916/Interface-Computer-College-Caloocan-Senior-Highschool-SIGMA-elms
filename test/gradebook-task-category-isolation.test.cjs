const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../js/shared-components.js'), 'utf8');
const start = source.indexOf('    const resolvedCat = String(foundItem?._category');
const end = source.indexOf('    // Each column in the gradebook', start);
for (const category of ['assignment', 'assignments', 'task', 'ww']) {
    const result = vm.runInNewContext(`(function () { ${source.slice(start, end)} return { isQuizLookup, catKeys }; })()`, {
        foundItem: { id: 'task2', title: 'Task 2 - Basic Syntax and Data Types Quiz', category }, item: null, cat: category
    });
    assert.equal(result.isQuizLookup, false);
    assert.ok(!result.catKeys.includes('quiz'), 'Task status must not read quiz status at the same numeric index');
}
const quiz = vm.runInNewContext(`(function () { ${source.slice(start, end)} return isQuizLookup; })()`, {
    foundItem: { id: 'quiz1', title: 'Quiz 1', category: 'quiz' }, item: null, cat: 'quiz'
});
assert.equal(quiz, true);
const saveStart = source.indexOf('    const catKeysSet = new Set();', source.indexOf('window.syncSharedScoreAndStatus ='));
const saveEnd = source.indexOf('    // 6. Normalize status', saveStart);
for (const item of [
    { id: 'task2', title: 'Task 2 - Basic Syntax and Data Types Quiz', category: 'assignment' },
    { id: 'quiz1', title: 'Quiz 1 - Basic Syntax and Data Types', category: 'quiz' }
]) {
    const saved = vm.runInNewContext(`(function () { ${source.slice(saveStart, saveEnd)} return { isQuizTarget, catKeys }; })()`, {
        item, category: item.category, itemId: item.id, taskTitle: item.title
    });
    assert.equal(saved.isQuizTarget, item.category === 'quiz');
    assert.ok(saved.catKeys.includes(item.category));
    assert.ok(!saved.catKeys.includes(item.category === 'quiz' ? 'assignment' : 'quiz'));
}
const columnStart = source.indexOf("    if (typeof window.resolveGradebookScoreColumn === 'function' && foundItem)");
const columnEnd = source.indexOf('    const sectionBuckets', columnStart);
for (const category of ['assignment', 'quiz']) {
    const context = {
        window: { resolveGradebookScoreColumn: () => ({ category, itemIdx: 1 }) },
        foundItem: { id: category, topicIdx: 0 }, subj: 'prog1', section: 'Rizal', q: 1,
        actualItemIdx: 0, catKeys: ['ww', 'assignment', 'quiz'], idxKeys: [0, 1, 2]
    };
    vm.runInNewContext(source.slice(columnStart, columnEnd), context);
    assert.deepEqual(context.idxKeys, [1]);
    assert.ok(!context.catKeys.includes(category === 'quiz' ? 'assignment' : 'quiz'));
    const statuses = { assignment: { 1: 'none' }, quiz: { 1: 'incomplete' } };
    const tones = context.catKeys.flatMap(cat => context.idxKeys.map(idx => statuses[cat]?.[idx])).filter(Boolean);
    assert.deepEqual(tones, [category === 'quiz' ? 'incomplete' : 'none']);
}
console.log('PASS: task titles containing Quiz do not inherit quiz-column statuses.');
