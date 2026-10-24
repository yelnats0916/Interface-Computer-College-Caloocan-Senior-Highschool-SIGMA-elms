const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

(async () => {
    const root = path.resolve(__dirname, '..');
    const html = fs.readFileSync(path.join(root, 'admin.html'), 'utf8');
    const batchJs = fs.readFileSync(path.join(root, 'js/batch-user-creator.js'), 'utf8');
    const sharedJs = fs.readFileSync(path.join(root, 'js/shared-components.js'), 'utf8');

    // 1. Verify HTML button placement & modal markup
    const toolbarIdx = html.indexOf('id="user-accounts-toolbar"');
    const createBtnIdx = html.indexOf('<span>Create User</span>', toolbarIdx);
    const batchBtnIdx = html.indexOf('id="open-batch-user-overlay-btn"', toolbarIdx);
    const searchIdx = html.indexOf('id="field-search"', toolbarIdx);

    assert.ok(toolbarIdx > 0, 'user-accounts-toolbar must exist');
    assert.ok(createBtnIdx > toolbarIdx && batchBtnIdx > createBtnIdx && batchBtnIdx < searchIdx, 'Batch Create button must sit right beside Create User in toolbar');
    assert.ok(html.includes('id="batch-user-overlay"'), 'Batch Create modal overlay must exist in admin.html');

    // Verify shared-components.js skips .sigma-subject-select so dropdown arrows are never duplicated
    assert.ok(
        sharedJs.includes('.sigma-subject-select,.sigma-form-select,.sigma-underline-select'),
        'shared-components.js enhance() must skip .sigma-subject-select to prevent duplicate dropdown chevrons'
    );

    // 2. Test VM execution of js/batch-user-creator.js
    const elements = new Map();
    const makeEl = (id) => {
        const classes = new Set(['hidden']);
        return {
            id,
            value: '',
            innerHTML: '',
            textContent: '',
            disabled: false,
            style: {
                setProperty: () => {},
                removeProperty: () => {}
            },
            classList: {
                add: (...c) => c.forEach(x => classes.add(x)),
                remove: (...c) => c.forEach(x => classes.delete(x)),
                toggle: (c, force) => {
                    if (force === undefined) {
                        if (classes.has(c)) classes.delete(c); else classes.add(c);
                    } else if (force) classes.add(c); else classes.delete(c);
                },
                contains: (c) => classes.has(c)
            },
            scrollIntoView: () => {}
        };
    };

    [
        'batch-user-overlay',
        'batch-user-back-btn',
        'batch-user-next-btn',
        'batch-user-save-btn',
        'batch-user-save-label',
        'batch-user-save-loading',
        'batch-user-export-btn',
        'batch-user-add-another-btn',
        'batch-user-finish-btn',
        'batch-user-step-1',
        'batch-user-step-2',
        'batch-user-step-3',
        'batch-step-bar-1',
        'batch-step-bar-1-track',
        'batch-step-bar-1-label',
        'batch-step-bar-2',
        'batch-step-bar-2-track',
        'batch-step-bar-2-label',
        'batch-step-bar-3',
        'batch-step-bar-3-track',
        'batch-step-bar-3-label',
        'batch-user-review-container',
        'batch-user-summary-bar',
        'batch-uploaded-file-badge',
        'batch-uploaded-file-name',
        'batch-user-step2-container',
        'batch-user-step3-container',
        'batch-user-form-body',
        'batch-upload-status-label',
        'edit-user-school-branch'
    ].forEach(id => elements.set(id, makeEl(id)));

    elements.get('edit-user-school-branch').value = 'Interface Computer College Caloocan';

    const storage = new Map();
    const createdPayloads = [];
    let nextIdRequests = 0;
    let lastAlert = null;
    let openedUrls = [];

    const windowObj = {
        USER_STORAGE_KEY: 'sigma-admin-users',
        userPaginationState: { currentPage: 3, itemsPerPage: 5 },
        showAlertDialog: (opts) => { lastAlert = opts; },
        renderUserAccountsTable: () => {},
        open: (url) => { openedUrls.push(url); },
        SigmaDatabase: {
            request: async (endpoint, opts) => {
                if (opts?.query?.action === 'next_id') {
                    nextIdRequests++;
                    const map = { Admin: '2601015', Teacher: '26010214', Student: '260103121' };
                    return { success: true, id: map[opts.query.role] || '2601031' };
                }
                if (opts?.query?.action === 'permission_defaults') {
                    return { success: true, roles: { Admin: { manageStudents: true }, Teacher: {}, Student: {} } };
                }
                if (opts?.data?.action === 'create') {
                    createdPayloads.push(opts.data.user);
                    const roleCode = { Admin: '01', Teacher: '02', Student: '03' }[opts.data.user.role] || '03';
                    const seq = createdPayloads.filter(u => u.role === opts.data.user.role).length;
                    const id = opts.data.user.id || `2601${roleCode}${seq}`;
                    return {
                        success: true,
                        record: {
                            ...opts.data.user,
                            id,
                            uid: id
                        }
                    };
                }
                return { success: true };
            }
        }
    };

    const documentObj = {
        documentElement: { style: {} },
        body: { style: {}, appendChild: () => {}, removeChild: () => {} },
        head: { appendChild: () => {} },
        getElementById: (id) => {
            if (!elements.has(id)) elements.set(id, makeEl(id));
            return elements.get(id);
        },
        querySelector: () => null,
        querySelectorAll: () => [],
        addEventListener: () => {},
        createElement: () => makeEl('dynamic')
    };

    const context = vm.createContext({
        window: windowObj,
        document: documentObj,
        localStorage: {
            getItem: (k) => storage.get(k) || null,
            setItem: (k, v) => storage.set(k, String(v))
        },
        console,
        setTimeout,
        clearTimeout,
        encodeURIComponent,
        TextEncoder,
        Uint8Array,
        DataView,
        Blob,
        File,
        URL: {
            createObjectURL: () => 'blob:mock-url',
            revokeObjectURL: () => {}
        }
    });

    vm.runInContext(batchJs, context);

    // Open overlay (pre-warms the 3 role start IDs in parallel)
    windowObj.toggleBatchUserOverlay(true);
    assert.equal(elements.get('batch-user-overlay').classList.contains('hidden'), false, 'Overlay should be visible');

    // Simulate uploading a CSV with Student, Admin (missing middlename), and Teacher
    const csvContent = [
        'Institutional Role,Firstname,Middlename,Lastname,Gender,Gmail',
        'Student,Juan,Santos,Dela Cruz,Male,juan.delacruz@gmail.com',
        'Admin,Maria,,Reyes,Female,maria.reyes@gmail.com',
        'Teacher,Jose,Protacio,Rizal,Male,jose.rizal@gmail.com'
    ].join('\n');

    await windowObj.handleBatchFileInputChange({
        value: 'roster.csv',
        files: [{
            name: 'roster.csv',
            text: async () => csvContent
        }]
    });

    const reviewHtml = elements.get('batch-user-review-container').innerHTML;
    const summaryBarHtml = elements.get('batch-user-summary-bar').innerHTML;

    // Requirement 1 & 2: Role dropdown and Add Row button placed ABOVE the pagination bar with standard sizes
    const roleSelectPos = summaryBarHtml.indexOf('All Roles (3)');
    const addRowBtnPos = summaryBarHtml.indexOf('<span>Add Row</span>');
    const paginationPos = summaryBarHtml.indexOf('sigma-admin-table-pagination');
    assert.ok(roleSelectPos > 0 && addRowBtnPos > roleSelectPos && paginationPos > addRowBtnPos, 'Role dropdown and Add Row button must be placed ABOVE the pagination bar');
    assert.ok(summaryBarHtml.includes('sigma-btn sigma-btn-white sigma-btn-md'), 'Add Row button must use standard sigma-btn-md size matching User Accounts page');
    assert.equal(elements.get('batch-template-buttons-group').classList.contains('hidden'), true, 'Template buttons must be hidden once a file is uploaded');

    // Requirement 4: Gmail must NOT show in Step 1 (Add Account), only in Step 2 (Add Credentials)
    assert.ok(!reviewHtml.includes('@gmail.com') && !reviewHtml.includes('batch-email-'), 'Step 1 (Add Account) must NOT show the Gmail input');

    // Requirement 5: Remove button must be black text with grey hover highlight
    assert.ok(reviewHtml.includes('text-black hover:bg-slate-100') && !reviewHtml.includes('text-rose-600 hover:text-rose-700'), 'Remove button must use black text with grey hover highlight');

    const adminGroupPos = reviewHtml.indexOf('Admin Accounts');
    const teacherGroupPos = reviewHtml.indexOf('Teacher Accounts');
    const studentGroupPos = reviewHtml.indexOf('Student Accounts');
    assert.ok(adminGroupPos >= 0 && teacherGroupPos > adminGroupPos && studentGroupPos > teacherGroupPos, 'Review form (5 per page) must organize accounts as Admin -> Teacher -> Student');
    assert.ok(!reviewHtml.includes('1. Admin Accounts') && !reviewHtml.includes('2. Teacher Accounts') && !reviewHtml.includes('3. Student Accounts'), 'Headers must not have numbering');
    assert.ok(!reviewHtml.includes('fa-user-shield') && !reviewHtml.includes('fa-chalkboard-user') && !reviewHtml.includes('fa-graduation-cap'), 'Headers must not have icons');
    assert.ok(reviewHtml.includes('Account 1 of 3') && reviewHtml.includes('Account 2 of 3') && reviewHtml.includes('Account 3 of 3'), 'Must keep Account n of n badge');

    // Verify grouping: Adding a 2nd Student must keep single grouped 'Student Accounts' header, not duplicate it
    windowObj.setBatchRoleFilter('Student');
    windowObj.addBatchUserEmptyRow();
    const groupedCheckHtml = elements.get('batch-user-review-container').innerHTML;
    const studentHeaderOccurrences = (groupedCheckHtml.match(/Student Accounts/g) || []).length;
    assert.equal(studentHeaderOccurrences, 1, 'Multiple accounts of the same role must share 1 header and not duplicate it');
    // Remove the newly added student row to restore state for remaining tests
    const uids = Array.from(groupedCheckHtml.matchAll(/removeBatchUserRow\((\d+)\)/g)).map(m => parseInt(m[1], 10));
    const newlyAddedUid = uids[uids.length - 1];
    windowObj.removeBatchUserRow(newlyAddedUid);
    windowObj.setBatchRoleFilter('All');

    // Attempt Next with Maria's blank middle name -> must block
    lastAlert = null;
    await windowObj.handleBatchUserStepNext();
    assert.ok(lastAlert && lastAlert.title === 'Review Required', 'Blank field must prevent advancing to Step 2');

    // Fill Maria's middle name (she had _uid = 2 from the 2nd CSV row)
    windowObj.updateBatchEntryField(2, 'middleName', 'Clara', false);

    // Now advance to Step 2 (Add Credentials)
    const countBeforeNext = nextIdRequests;
    lastAlert = null;
    await windowObj.handleBatchUserStepNext();
    assert.equal(lastAlert, null, 'Should advance without error once blank field is filled');
    assert.equal(elements.get('batch-user-step-2').classList.contains('hidden'), false, 'Step 2 must be visible');

    // Requirement 6: Going Back to Step 1 and Next to Step 2 again MUST hold the generated IDs without re-fetching
    const countAfterFirstNext = nextIdRequests;
    windowObj.handleBatchUserStepBack();
    assert.equal(elements.get('batch-user-step-1').classList.contains('hidden'), false, 'Back should return to Step 1');
    await windowObj.handleBatchUserStepNext();
    assert.equal(nextIdRequests, countAfterFirstNext, 'Going Back and Next again must hold cached IDs and NOT re-request next_id');

    const step2Html = elements.get('batch-user-step2-container').innerHTML;
    assert.ok(step2Html.includes('@gmail.com') && step2Html.includes('id="batch-email-'), 'Step 2 (Add Credentials) must render editable Gmail input');
    assert.ok(step2Html.indexOf('Admin Accounts') < step2Html.indexOf('Teacher Accounts'), 'Step 2 must order Admin before Teacher');
    assert.ok(step2Html.indexOf('Teacher Accounts') < step2Html.indexOf('Student Accounts'), 'Step 2 must order Teacher before Student');
    assert.ok(!step2Html.includes('1. Admin Accounts') && !step2Html.includes('2. Teacher Accounts') && !step2Html.includes('3. Student Accounts'), 'Step 2 headers must not have numbering');
    assert.ok(!step2Html.includes('fa-user-shield') && !step2Html.includes('fa-chalkboard-user') && !step2Html.includes('fa-graduation-cap'), 'Step 2 headers must not have icons');
    assert.ok(step2Html.includes('2601015') && step2Html.includes('reyes2601015'), 'Step 2 must preview Admin ID and password');
    assert.ok(step2Html.includes('26010214') && step2Html.includes('rizal26010214'), 'Step 2 must preview Teacher ID and password');
    assert.ok(step2Html.includes('260103121') && step2Html.includes('delacruz260103121'), 'Step 2 must preview Student ID and password');

    // Requirement 7: Click Create Accounts (Step 2 -> Step 3) -> saves all in sequence and puts last in list as newest at top of table
    await windowObj.handleBatchUserSave();
    assert.equal(elements.get('batch-user-step-3').classList.contains('hidden'), false, 'Step 3 (Send Credentials) must be visible');
    assert.deepEqual(createdPayloads.map(p => p.role), ['Admin', 'Teacher', 'Student'], 'Accounts must be saved in Admin, Teacher, Student sequence');
    assert.ok(createdPayloads.every(p => p.createdVia === 'batch-creator'), 'All batch created accounts must have createdVia: batch-creator');

    const savedAdminUsers = JSON.parse(storage.get('sigma-admin-users') || '[]');
    assert.equal(savedAdminUsers.length, 3, 'All 3 accounts must be saved in sigma-admin-users');
    // The last account in the batch list (Student: Juan Dela Cruz, 260103121) must be at index 0 (top of table) with the newest createdAt and highest seq
    assert.equal(savedAdminUsers[0].id, '260103121', 'Last item in the batch list must be at the top (index 0) of the User Accounts table');
    assert.equal(savedAdminUsers[1].id, '26010214', 'Second item in the batch list must be second from top');
    assert.equal(savedAdminUsers[2].id, '2601015', 'First item in the batch list must be third from top');
    assert.ok(
        new Date(savedAdminUsers[0].createdAt).getTime() > new Date(savedAdminUsers[1].createdAt).getTime() &&
        new Date(savedAdminUsers[1].createdAt).getTime() > new Date(savedAdminUsers[2].createdAt).getTime(),
        'Last item in the batch list must have the latest createdAt timestamp'
    );
    assert.ok(
        savedAdminUsers[0].seq > savedAdminUsers[1].seq && savedAdminUsers[1].seq > savedAdminUsers[2].seq,
        'Last item in the batch list must have the highest seq number'
    );
    assert.equal(windowObj.userPaginationState.currentPage, 1, 'User Accounts table pagination must reset to page 1 so newest created accounts are shown');

    const step3Html = elements.get('batch-user-step3-container').innerHTML;
    assert.ok(step3Html.indexOf('Admin Accounts') < step3Html.indexOf('Teacher Accounts'), 'Step 3 must order Admin before Teacher');
    assert.ok(step3Html.indexOf('Teacher Accounts') < step3Html.indexOf('Student Accounts'), 'Step 3 must order Teacher before Student');
    assert.ok(!step3Html.includes('1. Admin Accounts') && !step3Html.includes('2. Teacher Accounts') && !step3Html.includes('3. Student Accounts'), 'Step 3 headers must not have numbering');
    assert.ok(!step3Html.includes('fa-user-shield') && !step3Html.includes('fa-chalkboard-user') && !step3Html.includes('fa-graduation-cap'), 'Step 3 headers must not have icons');
    assert.ok(step3Html.includes('Send via Gmail'), 'Step 3 must include Send via Gmail buttons');

    // Test Send via Gmail
    windowObj.sendBatchUserCredentialViaGmail(0);
    assert.equal(openedUrls.length, 1, 'Send via Gmail should open Gmail compose URL');
    assert.ok(openedUrls[0].includes('maria.reyes%40gmail.com'), 'First Gmail compose URL should be for the Admin account');

    console.log('PASS: batch-user-creator.test.cjs');
})();
