const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const mobileCss = fs.readFileSync(path.join(__dirname, '../css/mobile.css'), 'utf8');
const mobileOverlay = mobileCss.match(/#teacher-release-assessments-overlay,\s*#teacher-topics-materials-picker-overlay,[\s\S]*?#teacher-topic-schedule-overlay\s*\{([^}]+)\}/)[1];
assert.ok(!/display:\s*flex/.test(mobileOverlay), 'Mobile layout must not override hidden overlays');
const backButton = mobileCss.match(/\.picker-header-back-btn\s*\{([^}]+)\}/)[1];
assert.match(backButton, /min-height:\s*32px/, 'Mobile Back must have a stable tap target');

for (const file of ['js/teacher.js', 'js/curriculum-release.js']) {
    const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    const extract = (start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));
    assert.ok(!source.includes('>Release Learning Materials</h2>'), `${file}: duplicate renderer removed`);
    for (const category of ['learning', 'assessments', 'topics']) {
        for (const editType of ['schedule', 'grading', 'edit']) {
            const elements = new Map();
            const element = (id, dataset = {}) => {
                const el = { dataset, isConnected: true, style: {}, classList: { add() {}, remove() {} }, remove() { this.isConnected = false; elements.delete(id); } };
                elements.set(id, el);
                return el;
            };
            const schedule = element('teacher-topic-schedule-overlay', { _category: category, _editType: editType });
            element('teacher-release-learning-materials-overlay');
            element('teacher-release-topics-overlay');
            let opened = 0;
            const window = {
                draft: { _editType: editType, ids: ['material-1'] },
                getUnifiedScheduleMeta: () => ({ draftStateKey: 'draft', pendingKey: 'ids' }),
                openTeacherReleaseAssessmentsModal(fromPicker) {
                    assert.equal(fromPicker, true);
                    opened++;
                    element('teacher-release-assessments-overlay');
                }
            };
            const context = vm.createContext({ window, document: { getElementById: id => elements.get(id) }, console, setTimeout: fn => fn() });
            vm.runInContext(extract('    window.backFromTeacherScheduleModal =', '    window.closeTeacherUnifiedScheduleModal ='), context);
            window.backFromTeacherScheduleModal(category);
            assert.equal(opened, 1, `${file}: ${category}/${editType} must refresh updated panel`);
            assert.equal(schedule.isConnected, false);
            assert.equal(window.draft, null);
            assert.equal(elements.has('teacher-release-learning-materials-overlay'), false);
            assert.equal(elements.has('teacher-release-topics-overlay'), false);

            opened = 0;
            let pickerOpened = 0;
            window._unifiedPickerSelection = {};
            window.draft = { ids: ['material-1'], _isPickerFlow: true, _subjectId: 'subject-1', _section: 'Rizal' };
            element('teacher-topic-schedule-overlay', { _category: category });
            window.openTeacherTopicsAndMaterialsPickerModal = () => { pickerOpened++; };
            window.backFromTeacherScheduleModal(category);
            assert.equal(pickerOpened, 1, 'New scheduling returns to the picker');
            assert.equal(opened, 0);
            assert.deepEqual(Array.from(window.draft.ids), ['material-1']);

            vm.runInContext(extract('    window.openTeacherReleaseLearningMaterialsModal =', '    window.cancelTeacherReleaseLearningMaterialsDraft ='), context);
            window.openTeacherReleaseLearningMaterialsModal(true);
            assert.equal(opened, 1, 'Legacy entry point redirects to the updated panel');
        }
    }
}
console.log('PASS: schedule Back refreshes unified panel, legacy renderer removed, picker selections preserved');
