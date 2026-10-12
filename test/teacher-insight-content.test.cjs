const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { collectTeacherEvidence, restrictTeacherLinks } = require('../js/teacher-analytics.js');
const rules = require('../js/student-analytics.js');
const classes = [{ subject: 'Programming', sectionName: 'Rizal' }];
const item = { id: 'task', title: 'Variable Declarations', category: 'assignment', itemIdx: 0, max: 100 };
const students = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
const seen = [];
const readers = {
    getStudents: (section, subject) => { seen.push([section, subject]); return students; },
    getAssessments: (category, quarter, subject, section) => { seen.push([section, subject]); return category === 'ww' ? [item] : []; },
    hasSubmission: student => student.id !== 'c',
    getScore: student => student.id === 'a' ? 80 : null
};
const snapshot = collectTeacherEvidence('teacher-one', classes, readers, 1);
const linked = restrictTeacherLinks([{ area: 'class-assessments', evidenceIds: [snapshot.areas[0].records[0].id], analyses: [{ text: '[Gradebooks](teacher.html#grades:gradebook) [Other](admin.html#private)', context: '' }] }], snapshot, 'http://localhost/teacher.html')[0];
assert.equal(linked.analyses[0].text, '[Gradebooks](teacher.html#grades:gradebook) Other');
const plain = restrictTeacherLinks([{ area: 'class-assessments', evidenceIds: [snapshot.areas[0].records[0].id], analyses: [{ text: 'Review submitted work.', context: '' }] }], snapshot, 'http://localhost/teacher.html')[0];
assert.equal(plain.analyses[0].text, 'Review submitted work.', 'Do not force links the AI did not choose');
assert.match(rules.renderBody(linked.analyses[0].text, 'http://localhost/teacher.html'), /class="sigma-insight-link"/);
assert.equal(snapshot.teacherId, 'teacher-one');
assert.equal(snapshot.areas[0].records[0].submittedCount, 2);
assert.equal(snapshot.areas[0].records[0].gradedCount, 1);
assert.equal(snapshot.areas[0].records[0].unscoredCount, 1);
assert.equal(snapshot.areas[0].records[0].assessmentAverage, 80);
assert.deepEqual(snapshot.areas[0].records[0].sources.map(source => source.label), ['Submission Records', 'Assessment Results']);
assert.deepEqual(collectTeacherEvidence('teacher-one', classes, { ...readers, getScore: () => null }).areas[0].records[0].sources
    .map(source => source.label), ['Submission Records'], 'Unscored submissions do not claim assessment results');
assert.ok(seen.every(([section, subject]) => section === 'Rizal' && subject === 'Programming'));
assert.equal(JSON.stringify(snapshot).includes('"studentId"'), false, 'Only class aggregates are supplied');
assert.equal(collectTeacherEvidence('teacher-one', [], readers).areas.length, 0);
for (const category of ['descriptive', 'predictive', 'prescriptive']) {
    const card = rules.validateCards({ cards: [{ area: 'class-assessments', title: 'Review Your Class Feedback', icon: 'feedback',
        evidenceIds: [snapshot.areas[0].records[0].id], analyses: [{ category, actionLabel: 'Recommend', context: 'One submitted task has no recorded score.', text: 'Prioritize feedback for this class.' }] }] }, snapshot)[0];
    assert.match(card.id, /^teacher-insight-teacher-one-/);
    assert.match(rules.renderInsightSections(card.analyses, 'http://localhost/teacher.html'), /<strong>Recommend:<\/strong>/);
}
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js/teacher-analytics.js'), 'utf8');
const storage = new Map();
const window = { SigmaInsightRules: rules, getLoggedInTeacherUser: () => ({ id: 'teacher-one' }),
    getTeacherSectionCards: () => classes, getUnifiedSectionStudents: readers.getStudents, getCategoryDetails: readers.getAssessments,
    findAssessmentSubmittedWork: (...args) => readers.hasSubmission(...args), getGradebookStudentItemScore: readers.getScore,
    location: { href: 'http://localhost/teacher.html' } };
const context = { window, URL, localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
    document: { readyState: 'loading', addEventListener() {}, querySelectorAll: () => [] } };
vm.runInNewContext(source, context);
const assessmentReader = window.getCategoryDetails;
delete window.getCategoryDetails;
assert.equal(window.SigmaTeacherAnalytics.getCards().length, 0, 'Startup waits for assessment readers');
window.getCategoryDetails = assessmentReader;
assert.match(window.SigmaTeacherAnalytics.getCards()[0].concernText, /Prioritize feedback/);
window.getCategoryDetails = () => [];
window.SigmaTeacherAnalytics.refresh();
assert.equal(window.SigmaTeacherAnalytics.getCards().length, 0, 'Explicit refresh invalidates old evidence');
window.getCategoryDetails = assessmentReader;
window.SigmaTeacherAnalytics.refresh();
assert.equal(window.SigmaTeacherAnalytics.getCards().length, 1, 'Ready evidence restores cards without generation');
assert.equal(storage.size, 0, 'Display refresh does not generate or consume quota');
window.getLoggedInTeacherUser = () => ({ id: 'other-teacher' });
window.getTeacherSectionCards = () => [];
assert.equal(window.SigmaTeacherAnalytics.getCards().length, 0, 'Other teachers cannot reuse cached class records');
console.log('Teacher-scoped aggregates, one hidden type/label, teacher language, and owner isolation passed');
