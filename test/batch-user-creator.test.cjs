const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

(async () => {
    const root = path.resolve(__dirname, '..');
    const html = fs.readFileSync(path.join(root, 'admin.html'), 'utf8');
    const batchJs = fs.readFileSync(path.join(root, 'js/batch-user-creator.js'), 'utf8');

    // 1. Verify HTML button placement & modal markup
    const toolbarIdx = html.indexOf('id="user-accounts-toolbar"');
    const createBtnIdx = html.indexOf('<span>Create User</span>', toolbarIdx);
    const batchBtnIdx = html.indexOf('id="open-batch-user-overlay-btn"', toolbarIdx);
    const searchIdx = html.indexOf('id="field-search"', toolbarIdx);

    assert.ok(toolbarIdx > 0, 'user-accounts-toolbar must exist');
    assert.ok(createBtnIdx > toolbarIdx && batchBtnIdx > createBtnIdx && batchBtnIdx < searchIdx, 'Batch Create button must sit right beside Create User in toolbar');
    assert.ok(html.includes('id="batch-user-overlay"'), 'Batch Create modal overlay must exist in admin.html');

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
    let lastAlert = null;
    let openedUrls = [];

    const windowObj = {
        showAlertDialog: (opts) => { lastAlert = opts; },
        renderUserAccountsTable: () => {},
        open: (url) => { openedUrls.push(url); },
        SigmaDatabase: {
            request: async (endpoint, opts) => {
                if (opts?.query?.action === 'next_id') {
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
                    const id = `2601${roleCode}${seq}`;
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

    // Open overlay
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
    const adminGroupPos = reviewHtml.indexOf('1. Admin Accounts');
    const teacherGroupPos = reviewHtml.indexOf('2. Teacher Accounts');
    const studentGroupPos = reviewHtml.indexOf('3. Student Accounts');
    assert.ok(adminGroupPos >= 0 && teacherGroupPos > adminGroupPos && studentGroupPos > teacherGroupPos, 'Review form must organize accounts as Admin -> Teacher -> Student');
    assert.ok(reviewHtml.includes('1 Incomplete (Fill Blank Fields)') || elements.get('batch-user-summary-bar').innerHTML.includes('1 Incomplete'), 'Summary bar should flag the 1 incomplete row with blank middle name');

    // Attempt Next with Maria's blank middle name -> must block
    lastAlert = null;
    await windowObj.handleBatchUserStepNext();
    assert.ok(lastAlert && lastAlert.title === 'Review Required', 'Blank field must prevent advancing to Step 2');

    // Fill Maria's middle name (she had _uid = 2 from the 2nd CSV row)
    windowObj.updateBatchEntryField(2, 'middleName', 'Clara', false);

    // Now advance to Step 2 (Add Credentials)
    lastAlert = null;
    await windowObj.handleBatchUserStepNext();
    assert.equal(lastAlert, null, 'Should advance without error once blank field is filled');
    assert.equal(elements.get('batch-user-step-2').classList.contains('hidden'), false, 'Step 2 must be visible');

    const step2Html = elements.get('batch-user-step2-container').innerHTML;
    assert.ok(step2Html.indexOf('1. Admin Accounts') < step2Html.indexOf('2. Teacher Accounts'), 'Step 2 must order Admin before Teacher');
    assert.ok(step2Html.indexOf('2. Teacher Accounts') < step2Html.indexOf('3. Student Accounts'), 'Step 2 must order Teacher before Student');
    assert.ok(step2Html.includes('2601015') && step2Html.includes('reyes2601015'), 'Step 2 must preview Admin ID and password');
    assert.ok(step2Html.includes('26010214') && step2Html.includes('rizal26010214'), 'Step 2 must preview Teacher ID and password');
    assert.ok(step2Html.includes('260103121') && step2Html.includes('delacruz260103121'), 'Step 2 must preview Student ID and password');

    // Click Create Accounts (Step 2 -> Step 3)
    await windowObj.handleBatchUserSave();
    assert.equal(elements.get('batch-user-step-3').classList.contains('hidden'), false, 'Step 3 (Send Credentials) must be visible');
    assert.deepEqual(createdPayloads.map(p => p.role), ['Admin', 'Teacher', 'Student'], 'Accounts must be saved in Admin, Teacher, Student order');

    const step3Html = elements.get('batch-user-step3-container').innerHTML;
    assert.ok(step3Html.indexOf('1. Admin Accounts') < step3Html.indexOf('2. Teacher Accounts'), 'Step 3 must order Admin before Teacher');
    assert.ok(step3Html.indexOf('2. Teacher Accounts') < step3Html.indexOf('3. Student Accounts'), 'Step 3 must order Teacher before Student');
    assert.ok(step3Html.includes('Send via Gmail'), 'Step 3 must include Send via Gmail buttons');

    // Test Send via Gmail
    windowObj.sendBatchUserCredentialViaGmail(0);
    assert.equal(openedUrls.length, 1, 'Send via Gmail should open Gmail compose URL');
    assert.ok(openedUrls[0].includes('maria.reyes%40gmail.com'), 'First Gmail compose URL should be for the Admin account');

    // Test DOCX & PDF Template Generation + Built-in Document Viewer integration
    assert.ok(html.includes("window.downloadBatchUserTemplate('xlsx')"), 'admin.html must have Excel template button');
    assert.ok(html.includes("window.downloadBatchUserTemplate('docx')"), 'admin.html must have Word (.docx) template button');
    assert.ok(html.includes("window.downloadBatchUserTemplate('pdf')"), 'admin.html must have PDF (.pdf) template button');
    assert.ok(html.includes('id="batch-view-uploaded-doc-btn"'), 'admin.html must have View in Built-in Viewer button');

    const viewerCalls = [];
    windowObj.openDocumentViewer = (name, file, type) => {
        viewerCalls.push({ name, file, type });
    };
    documentObj.createElement = () => ({ click: () => {}, href: '', download: '' });

    windowObj.downloadBatchUserTemplate('docx');
    assert.equal(viewerCalls.length, 1, 'Downloading DOCX template should open it in built-in SIGMA Document Viewer');
    assert.equal(viewerCalls[0].name, 'SIGMA_Batch_User_Template.docx');
    assert.equal(viewerCalls[0].type, 'docx');
    assert.ok(viewerCalls[0].file.size > 1000, 'Generated DOCX template must be a valid non-empty zip archive');

    windowObj.downloadBatchUserTemplate('pdf');
    assert.equal(viewerCalls.length, 2, 'Downloading PDF template should open it in built-in SIGMA Document Viewer');
    assert.equal(viewerCalls[1].name, 'SIGMA_Batch_User_Template.pdf');
    assert.equal(viewerCalls[1].type, 'pdf');
    assert.ok(viewerCalls[1].file.size > 500, 'Generated PDF template must be a valid non-empty PDF');

    console.log('PASS: batch-user-creator.test.cjs');
})();
