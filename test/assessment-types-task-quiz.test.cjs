const assert = require('node:assert/strict');
const fs = require('fs');

console.log('--- Verifying Assessment Types Standardization (Task and Quiz only) ---');

// 1. Check shared-components.js
const sharedCode = fs.readFileSync('js/shared-components.js', 'utf8');
global.window = global;
global.localStorage = {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; },
    clear() { this._data = {}; },
    get length() { return Object.keys(this._data).length; },
    key(i) { return Object.keys(this._data)[i] || null; }
};

// Evaluate getSigmaMaterialTypeConfig and normalizeSubjectAssessmentsToTaskAndQuiz
const cfgStart = sharedCode.indexOf('window.getSigmaMaterialTypeConfig = function');
const cfgEnd = sharedCode.indexOf('window.renderSharedLessonsTabHtml = function');
assert.ok(cfgStart > 0 && cfgEnd > cfgStart, 'Could not find getSigmaMaterialTypeConfig section in shared-components.js');
eval(sharedCode.slice(cfgStart, cfgEnd));

assert.equal(typeof window.getSigmaMaterialTypeConfig, 'function');
assert.equal(typeof window.normalizeSubjectAssessmentsToTaskAndQuiz, 'function');

// Test material type configuration
const taskVariations = ['Task', 'Tasks', 'task', 'tasks', 'Assignment', 'Assignments', 'assignment', 'assignments', 'Activity', 'Activities', 'activity', 'activities', 'Performance Task', 'performance task', 'Performance', 'performance', 'Performance Tasks', 'pt', 'add task'];
taskVariations.forEach(v => {
    const cfg = window.getSigmaMaterialTypeConfig(v);
    assert.equal(cfg.type, 'Task', `Expected type Task for '${v}', got '${cfg.type}'`);
    assert.equal(cfg.label, 'Task', `Expected label Task for '${v}', got '${cfg.label}'`);
    assert.equal(cfg.typeIcon, 'fa-clipboard-list', `Expected icon fa-clipboard-list for '${v}', got '${cfg.typeIcon}'`);
    assert.ok(cfg.iconBoxClass.includes('bg-amber-50'), `Expected amber icon box for '${v}'`);
    assert.ok(cfg.badgeClass.includes('text-amber-700'), `Expected amber text for '${v}'`);
});

const quizVariations = ['Quiz', 'quiz', 'Quizzes', 'quizzes', 'Add Quiz', 'Short Quiz'];
quizVariations.forEach(v => {
    const cfg = window.getSigmaMaterialTypeConfig(v);
    assert.equal(cfg.type, 'Quiz', `Expected type Quiz for '${v}', got '${cfg.type}'`);
    assert.equal(cfg.label, 'Quiz', `Expected label Quiz for '${v}', got '${cfg.label}'`);
    assert.equal(cfg.typeIcon, 'fa-stopwatch', `Expected icon fa-stopwatch for '${v}', got '${cfg.typeIcon}'`);
    assert.ok(cfg.iconBoxClass.includes('bg-emerald-50'), `Expected emerald icon box for '${v}'`);
});

// Test subject migration helper
const testSubjects = [
    {
        id: 'subj-1',
        title: 'Oral Communication',
        materials: [
            { id: 'm1', title: 'Intro', type: 'Lesson' },
            { id: 'm2', title: 'Speech', type: 'Assignment' },
            { id: 'm3', title: 'Breakdown', type: 'Activity' },
            { id: 'm4', title: 'Project', type: 'Performance Task' },
            { id: 'm5', title: 'Quiz 1', type: 'Quiz' }
        ],
        topics: [
            {
                id: 'top-1',
                activity: [{ id: 'a1', title: 'Role Play', type: 'Activity' }],
                assignments: [{ id: 'as1', title: 'Worksheet', type: 'Assignment' }],
                performanceTasks: [{ id: 'pt1', title: 'Final Project', type: 'Performance Task' }],
                quiz: [{ id: 'q1', title: 'Assessment Quiz', type: 'Quiz' }]
            }
        ]
    }
];

const changed = window.normalizeSubjectAssessmentsToTaskAndQuiz(testSubjects);
assert.equal(changed, true, 'normalizeSubjectAssessmentsToTaskAndQuiz should return true on modifications');
assert.equal(testSubjects[0].materials[0].type, 'Lesson');
assert.equal(testSubjects[0].materials[1].type, 'Task', 'Assignment material must be normalized to Task');
assert.equal(testSubjects[0].materials[2].type, 'Task', 'Activity material must be normalized to Task');
assert.equal(testSubjects[0].materials[3].type, 'Task', 'Performance Task material must be normalized to Task');
assert.equal(testSubjects[0].materials[4].type, 'Quiz', 'Quiz material must remain Quiz');

assert.equal(testSubjects[0].topics[0].activity[0].type, 'Task', 'Topic activity must be normalized to Task');
assert.equal(testSubjects[0].topics[0].assignments[0].type, 'Task', 'Topic assignment must be normalized to Task');
assert.equal(testSubjects[0].topics[0].performanceTasks[0].type, 'Task', 'Topic performanceTask must be normalized to Task');
assert.equal(testSubjects[0].topics[0].quiz[0].type, 'Quiz', 'Topic quiz must remain Quiz');

console.log('PASS: shared-components.js canonical material type configs and subject normalizer verified.');

// 2. Check subject-editor.js source code
const seCode = fs.readFileSync('js/subject-editor.js', 'utf8');
assert.ok(seCode.includes('normalizedMatType = isTaskMat ? \'Task\''), 'subject-editor.js must normalize task types in material list');
assert.ok(seCode.includes('${_escape(displayType)}'), 'subject-editor.js must render displayType in mat-type-badge');
assert.ok(!seCode.includes('${_escape(m.type)}'), 'subject-editor.js must not output raw m.type in mat-type-badge');

console.log('PASS: subject-editor.js material list and detail normalization verified.');

// 3. Check teacher.js source code
const tjCode = fs.readFileSync('js/teacher.js', 'utf8');
assert.ok(tjCode.includes("activity: 'fa-clipboard-list'"), 'teacher.js must map activity to fa-clipboard-list');
assert.ok(tjCode.includes("performance: 'fa-clipboard-list'"), 'teacher.js must map performance to fa-clipboard-list');
assert.ok(tjCode.includes("'performance task': 'fa-clipboard-list'"), 'teacher.js must map performance task to fa-clipboard-list');
assert.ok(tjCode.includes("if (typeLabel === 'Task') return 'fa-clipboard-list'"), 'teacher.js must return fa-clipboard-list for Task items');
assert.ok(tjCode.includes("if (typeLabel === 'Quiz') return 'fa-stopwatch'"), 'teacher.js must return fa-stopwatch for Quiz items');

console.log('PASS: teacher.js assessment icon and label normalization verified.');
console.log('========================================================');
console.log('ALL ASSESSMENT TYPE AND ICON NORMALIZATION TESTS PASSED!');
console.log('========================================================');
