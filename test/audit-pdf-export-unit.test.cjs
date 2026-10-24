const fs = require('fs');
const assert = require('assert');

// 1. Verify CSS rules
const css = fs.readFileSync('css/audit-pdf-export.css', 'utf8');

// Exit button matches Create User Account
assert(css.includes('.audit-modal-exit-btn'), 'Must define .audit-modal-exit-btn');
assert(css.includes('border-radius: 9999px'), 'Exit button must be circular');

// Modal body: no inner scrollbar!
assert(!css.includes('#audit-pdf-export .sigma-modal-body{padding:28px 32px;overflow-x:hidden!important;overflow-y:auto!important;flex:1 1 0%!important'), 'Must remove old forced inner scrollbar');
assert(css.includes('overflow-y: visible !important'), 'Modal body must allow natural overflow instead of forcing inner scrollbar');

// No yellow glow on focus
assert(css.includes('#15803d !important'), 'Focus must use #15803d green');
assert(!css.includes('#f59e0b') && !css.includes('yellow'), 'Must not have yellow focus outlines');

// Button sizes
assert(css.includes('.audit-export-toolbar button.sigma-btn.sigma-btn-md'), 'Toolbar button styling present');
assert(css.includes('.audit-step-tabs'), 'Segmented navigation tabs styling present');
assert(css.includes('.audit-preview-table'), 'Preview table styling present');

// 2. Verify JS file
const js = fs.readFileSync('js/audit-pdf-export.js', 'utf8');

// No badges in markup
assert(!js.includes('class="badge'), 'Must not contain any badge classes');
assert(!js.includes('class="status-badge'), 'Must not contain any status-badge classes');

// Search bar and button
assert(js.includes('data-action="search-user-btn"'), 'Must have search user button');
assert(js.includes('data-user-dropdown'), 'Must have user dropdown list for selecting user');

// Buttons for logs
assert(js.includes('data-action="select-all-logs"'), 'Must have select all logs button');
assert(js.includes('data-action="clear-all-logs"'), 'Must have clear all logs button');

// Multi-step & Next page pagination
assert(js.includes('data-action="prev-page"'), 'Must have previous page button');
assert(js.includes('data-action="next-page"'), 'Must have next page button');
assert(js.includes('previewPageSize = 10'), 'Must have 10 items per page pagination');

// Matching Create User Account exit button
assert(js.includes('audit-modal-exit-btn'), 'Must include circular exit button');

// 3. Test data operations (normalize, matches, table)
const mockWindow = {
    canViewAuditLog: () => true,
    getStoredJson: () => [],
    addEventListener: () => {},
    removeEventListener: () => {}
};

// Evaluate the script in a simulated global context
const fn = new Function('window', 'document', js);
const mockDoc = {
    getElementById: () => null,
    addEventListener: () => {},
    removeEventListener: () => {},
    querySelectorAll: () => [],
    createElement: (tag) => ({
        tagName: tag,
        style: {},
        setAttribute: () => {},
        classList: { add: () => {}, remove: () => {} }
    })
};

fn(mockWindow, mockDoc);

assert(mockWindow.SigmaAuditPdf, 'SigmaAuditPdf must be exposed');
const { normalize, matches, table } = mockWindow.SigmaAuditPdf;

const users = [
    { id: '101', firstName: 'Mary Ann', lastName: 'De la Rosa', role: 'Teacher' },
    { id: '202', firstName: 'Stanley', lastName: 'Garcia', role: 'Admin' }
];

const notifRow = normalize('notifications', {
    id: 'n1',
    senderId: '202',
    senderName: 'Stanley Garcia',
    recipientId: '101',
    recipientName: 'Mary Ann De la Rosa',
    title: 'Quiz Published',
    body: 'Patterns of Development Quiz has been published',
    timestamp: '2026-10-25T01:00:00Z',
    type: 'quiz'
}, users);

assert.equal(notifRow.sender.name, 'Stanley Garcia');
assert.equal(notifRow.recipient.name, 'Mary Ann De la Rosa');
assert.equal(notifRow.kind, 'notifications');

// Test matching logic
assert(matches(notifRow, { user: 'Mary Ann', direction: 'both' }), 'Matches recipient');
assert(matches(notifRow, { user: 'Mary Ann', direction: 'recipient' }), 'Matches recipient with direction');
assert(!matches(notifRow, { user: 'Mary Ann', direction: 'sender' }), 'Does not match sender when recipient');
assert(matches(notifRow, { user: 'Stanley', direction: 'sender' }), 'Matches sender');
assert(matches(notifRow, { from: '2026-10-25', to: '2026-10-25', user: '' }), 'Matches date boundary');

// Test table generation
const tbl = table('notifications', [notifRow]);
assert.equal(tbl.headers.length, 6);
assert.equal(tbl.body.length, 1);
assert.equal(tbl.body[0][0], 1);
assert(tbl.body[0][1].includes('Stanley Garcia'));

console.log('ALL AUDIT PDF EXPORT UNIT TESTS PASSED!');
