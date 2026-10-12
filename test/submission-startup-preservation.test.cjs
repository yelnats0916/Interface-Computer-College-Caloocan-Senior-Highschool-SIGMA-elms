const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../js/shared-components.js'), 'utf8');
const marker = source.indexOf("    const RESET_KEY = 'sigma_reset_v10_clean_fake_materials_20260918_06'");
const start = source.lastIndexOf('try {', marker);
const end = source.indexOf('window.getStudentSubmissionStorageKey =', marker);
const submitted = { id: 'real-quiz', quizId: 'QZ-9301', title: 'Basic Syntax', score: 20, answers: { 0: 'Integer' }, attempts: [{ answers: { 0: 'Integer' } }], status: 'Graded' };
const records = new Map([
    ['sigma_student_assessment_submissions', JSON.stringify({ student: { quiz: submitted } })],
    ['sigma_quiz_result_student', JSON.stringify(submitted)],
    ['sigma_quiz_library', JSON.stringify([submitted])],
    ['sigma-teacher-gradebook-scores-v2', JSON.stringify({ student: 20 })],
    ['sigma-admin-subjects', JSON.stringify([{ id: 'subject', materials: [submitted, { id: 'sample', isSample: true }] }])],
    ['sigma_topics_subject', JSON.stringify({ topics: [{ assessments: [submitted, { id: 'sample', isFake: true }] }] })]
]);
const before = new Map(records);
const storage = { getItem: key => records.get(key) ?? null, setItem: (key, value) => records.set(key, value), removeItem: key => records.delete(key), key: index => [...records.keys()][index], get length() { return records.size; } };
vm.runInNewContext(source.slice(start, end), { localStorage: storage });
for (const key of ['sigma_student_assessment_submissions', 'sigma_quiz_result_student', 'sigma_quiz_library', 'sigma-teacher-gradebook-scores-v2']) assert.equal(records.get(key), before.get(key), key);
assert.deepEqual(JSON.parse(records.get('sigma_topics_subject')).topics[0].assessments, [submitted]);
assert.deepEqual(JSON.parse(records.get('sigma-admin-subjects'))[0].materials, [submitted]);
console.log('PASS: startup sample cleanup preserves saved submissions, answers, attempts, quiz library and grades');
