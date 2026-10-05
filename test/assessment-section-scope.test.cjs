const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const material = (id, section, subjectId = 'prog1') => ({ id, title: id, type: 'Task', section, subjectId, topicId: 'topic-a', authorRole: 'Teacher' });
const classroomItems = [material('rizal-task', 'Rizal'), material('other-task', 'Newton'), material('shared-task', 'all'), material('other-subject', 'Rizal', 'math'), { ...material('sample-task', 'Rizal'), isSample: true }];
const store = { sigma_classroom_materials: JSON.stringify(classroomItems) };
const storage = { getItem: key => store[key] || null };
for (const file of ['js/curriculum-release.js', 'js/teacher.js']) {
    const source = read(file);
    const start = source.indexOf('    window.getTeacherSubjectAssessments = function');
    const end = source.indexOf('return dedupFn(items);', start) + 'return dedupFn(items);'.length;
    const window = { getStoredJson: () => [], isFakeAssessment: item => !!item.isSample };
    const context = vm.createContext({ window, localStorage: storage, sessionStorage: storage, getStoredJson: () => [], getTopicData: () => null, getTeacherAllSubjectTopics: () => [] });
    vm.runInContext(source.slice(start, end) + '\n};', context);
    const ids = Array.from(window.getTeacherSubjectAssessments('card-prog1', 'Rizal'), item => item.id);
    assert.deepEqual(ids, ['rizal-task', 'shared-task'], file);
    assert.ok(window.getTeacherSubjectAssessments('card-prog1', 'Newton').some(item => item.id === 'other-task'), 'Other section data remains available');
}
const shared = read('js/shared-components.js');
const start = shared.indexOf('window.getUnifiedTopicAssessments = function');
const next = shared.indexOf('\nwindow.', start + 1);
const targetTopic = { id: 'topic-a', title: 'Topic A' };
const subject = { id: 'prog1', topics: [targetTopic], materials: classroomItems };
store['sigma-admin-subjects'] = JSON.stringify([subject]);
for (const portal of ['teacher.html', 'admin.html', 'student.html']) {
    const window = {
        isFakeAssessment: item => !!item.isSample,
        deduplicateMaterialsArray: items => items,
        findMatchingSubject: items => items[0],
        resolveStoredTopicByPageIndex: () => targetTopic
    };
    const context = vm.createContext({ window, localStorage: storage, sessionStorage: storage, location: { pathname: '/' + portal }, console });
    vm.runInContext(shared.slice(start, next), context);
    const ids = Array.from(window.getUnifiedTopicAssessments('assessments', 'prog1', 0, [material('default-other', 'Newton')], 'Rizal', targetTopic), item => item.id);
    assert.ok(!ids.includes('other-task') && !ids.includes('default-other'), portal);
    assert.ok(ids.includes('rizal-task') && ids.includes('shared-task'), portal);
}
console.log('PASS: section filtering applies to every portal, classroom tasks appear in release panels, shared tasks remain available');
