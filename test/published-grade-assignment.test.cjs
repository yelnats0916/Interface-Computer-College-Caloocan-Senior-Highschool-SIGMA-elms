const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('js/shared-components.js', 'utf8');
const code = source.slice(source.indexOf('window.getAssignedGradeSections ='), source.indexOf('window.getSigmaAiLanguage ='));
const saved = new Map();
const sections = [
    { name: 'Rizal', subject: 'Programming', students: ['s1'], schoolYear: '2026-2027' },
    { name: 'Einstein', subject: 'Communication', students: ['s1'], schoolYear: '2026-2027' },
    { name: 'Other', subject: 'Programming', students: ['s2'], schoolYear: '2026-2027' }
];
saved.set('sigma-admin-sections', JSON.stringify(sections));
const records = {};
const put = (year, section, subject, quarter, id, grade) => { records[JSON.stringify([year, section.toLowerCase(), subject.toLowerCase(), quarter])] = { rows: [{ id, grade }] }; };
put('2026-2027', 'Rizal', 'Programming', 1, 's1', 90);
put('2026-2027', 'Einstein', 'Communication', 1, 's1', 85);
put('2026-2027', 'Other', 'Programming', 1, 's1', 100);
put('2025-2026', 'Rizal', 'Programming', 2, 's1', 99);
saved.set('sigma-published-quarter-grades-v1', JSON.stringify(records));
const window = {
    getActiveSchoolYearRecord: () => ({ yearStart: 2026, yearEnd: 2027 }),
    isSectionAssignedToStudent: (section, student) => section.students.includes(student?.id)
};
vm.runInNewContext(code, { window, localStorage: { getItem: key => saved.get(key) || null } });
const student = { id: 's1', section: 'Wrong profile section' };
assert.equal(window.getPublishedSubjectGrade(student, 'Programming', null, 1), 90);
assert.equal(window.getPublishedSubjectGrade(student, 'Communication', null, 1), 85);
assert.equal(window.getPublishedSubjectGrade(student, 'Programming', 'Other', 1), null);
assert.equal(window.getPublishedSubjectGrade({ id: 's2' }, 'Programming', 'Rizal', 1), null);
assert.equal(window.getPublishedSubjectGrade(student, 'Programming', null, 2), null);
sections[0].students = [];
saved.set('sigma-admin-sections', JSON.stringify(sections));
assert.equal(window.getPublishedSubjectGrade(student, 'Programming', null, 1), null);
console.log('PASS: assigned subject/section, student identity, year/quarter isolation, and removed assignment.');
