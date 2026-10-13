const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../js/teacher.js'), 'utf8');
const start = source.indexOf('    window.openTeacherAddTopicForm = function');
const end = source.indexOf('    window.openTeacherAddTopicsAndMaterialsForm', start);
let opened;
const window = {
    location: { hash: '#topic-content:card-prog1:0:videos:null:Rizal' },
    currentClassroomSubject: 'General Mathematics', currentClassroomSectionName: 'Other Section',
    openSharedTopicsAndMaterials: options => { opened = options; }
};
vm.runInNewContext(source.slice(start, end), { window,
    currentTopicState: { subjectId: 'card-prog1', selectedSection: 'Rizal' },
    currentClassroomSectionName: 'Other Section', currentClassroomKey: 'Other Section::General Mathematics',
    localStorage: { getItem: () => 'Stale Scope' }
});
window.openTeacherAddTopicForm();
assert.equal(opened.subjectId, 'card-prog1'); assert.equal(opened.section, 'Rizal');
window.location.hash = '#classroom:other:room';
window.openTeacherAddTopicForm();
assert.equal(opened.subjectId, 'General Mathematics'); assert.equal(opened.section, 'Other Section');
console.log('PASS: topic editor uses active route scope, not the previously visited classroom.');
