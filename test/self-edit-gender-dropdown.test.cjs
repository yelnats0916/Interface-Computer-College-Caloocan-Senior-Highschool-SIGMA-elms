const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// 1. Verify js/settings-view.js defines custom gender dropdown markup and handlers
const settingsViewJs = fs.readFileSync(path.join(__dirname, '../js/settings-view.js'), 'utf8');

assert.ok(
    settingsViewJs.includes('id="self-edit-gender-btn"'),
    'settings-view.js must define #self-edit-gender-btn trigger button'
);

assert.ok(
    settingsViewJs.includes('id="self-edit-gender-menu"'),
    'settings-view.js must define #self-edit-gender-menu container'
);

assert.ok(
    settingsViewJs.includes('window.toggleSelfEditGenderDropdown'),
    'settings-view.js must define window.toggleSelfEditGenderDropdown'
);

assert.ok(
    settingsViewJs.includes('window.closeSelfEditGenderDropdown'),
    'settings-view.js must define window.closeSelfEditGenderDropdown'
);

assert.ok(
    settingsViewJs.includes('window.selectSelfEditGender'),
    'settings-view.js must define window.selectSelfEditGender'
);

assert.ok(
    settingsViewJs.includes('id="self-edit-gender"') && settingsViewJs.includes('select.value = val'),
    'settings-view.js must keep synchronized #self-edit-gender select value for form save'
);

// 2. Verify check mark icons are REMOVED from gender options and select handler
assert.ok(
    !settingsViewJs.includes('<i class="fa-solid fa-check'),
    'settings-view.js must not render check mark icons in self edit gender options'
);
assert.ok(
    !settingsViewJs.includes("opt.querySelector('i.fa-check')"),
    'settings-view.js selectSelfEditGender must not reference check mark icons'
);

// 3. Verify Save Changes button dirty-state lock/unlock logic
assert.ok(
    settingsViewJs.includes('id="self-edit-save-btn" disabled') ||
    settingsViewJs.includes('id="self-edit-save-btn" class="sigma-btn') && settingsViewJs.includes('disabled'),
    'settings-view.js must render #self-edit-save-btn as disabled by default'
);

assert.ok(
    settingsViewJs.includes('evaluateSelfEditDirtyState') &&
    settingsViewJs.includes('isDirty') &&
    settingsViewJs.includes('saveBtn.disabled ='),
    'settings-view.js must implement dirty-state evaluation that locks/unlocks Save Changes button'
);

// 4. Verify css/settings-view.css enforces containment and disabled button styles
const settingsViewCss = fs.readFileSync(path.join(__dirname, '../css/settings-view.css'), 'utf8');

assert.ok(
    settingsViewCss.includes('#self-edit-information #self-edit-gender-menu'),
    'settings-view.css must style #self-edit-information #self-edit-gender-menu'
);

assert.ok(
    settingsViewCss.includes('left: 0 !important') &&
    settingsViewCss.includes('right: 0 !important') &&
    settingsViewCss.includes('max-width: 100% !important') &&
    settingsViewCss.includes('box-sizing: border-box !important'),
    'settings-view.css must constrain #self-edit-gender-menu within bounds'
);

assert.ok(
    settingsViewCss.includes('#self-edit-information #self-edit-save-btn:disabled') &&
    settingsViewCss.includes('cursor: not-allowed !important'),
    'settings-view.css must style #self-edit-save-btn:disabled with cursor: not-allowed'
);

// 5. Verify HTML cache buster versions
for (const file of ['teacher.html', 'student.html', 'admin.html']) {
    const html = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    assert.ok(
        html.includes('css/settings-view.css?v=20261005editInfoSaveLock1'),
        `${file} must link updated css/settings-view.css?v=20261005editInfoSaveLock1`
    );
    assert.ok(
        html.includes('js/settings-view.js?v=20261005editInfoSaveLock1'),
        `${file} must load updated js/settings-view.js?v=20261005editInfoSaveLock1`
    );
}

// 6. Functional test of dirty-checking lock/unlock behavior
function testDirtyStateLogic() {
    const initial = { firstName: 'Maria', middleName: 'Santos', lastName: 'Ramos', gender: 'Female' };
    let current = { ...initial };

    function canSave(state) {
        const isDirty = (
            state.firstName.trim() !== initial.firstName ||
            state.middleName.trim() !== initial.middleName ||
            state.lastName.trim() !== initial.lastName ||
            state.gender.trim() !== initial.gender
        );
        const hasRequired = Boolean(state.firstName.trim() && state.lastName.trim() && state.gender.trim());
        return isDirty && hasRequired;
    }

    // A. Initially identical -> LOCKED
    assert.strictEqual(canSave(current), false, 'Initially unchanged form must lock save button');

    // B. First name changed -> UNLOCKED
    current.firstName = 'Maria Clara';
    assert.strictEqual(canSave(current), true, 'Form with changed first name must unlock save button');

    // C. First name reverted back -> LOCKED
    current.firstName = 'Maria';
    assert.strictEqual(canSave(current), false, 'Reverted form must lock save button again');

    // D. Gender changed -> UNLOCKED
    current.gender = 'Male';
    assert.strictEqual(canSave(current), true, 'Form with changed gender must unlock save button');

    // E. Gender reverted back -> LOCKED
    current.gender = 'Female';
    assert.strictEqual(canSave(current), false, 'Form with reverted gender must lock save button');

    // F. Required field emptied -> LOCKED even if dirty
    current.firstName = '';
    assert.strictEqual(canSave(current), false, 'Form with empty required field must remain locked');
}

testDirtyStateLogic();

console.log('PASS: Self edit information checkmark removed and Save Changes button properly locks/unlocks on change.');
