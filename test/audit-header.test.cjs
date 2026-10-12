const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../js/admin.js'), 'utf8');
const start = source.indexOf("} else if (['audit-ai-view', 'audit-activity-view', 'audit-auth-view', 'audit-notifications-view'].includes(sectionId))");
assert.ok(start >= 0);
const bodyStart = source.indexOf('{', start) + 1;
const end = source.indexOf("} else if (sectionId === 'section-topic-content'", bodyStart);
const render = new Function('window', 'sectionId', source.slice(bodyStart, end));
for (const [id, title] of [['audit-ai-view', 'AI Logs'], ['audit-activity-view', 'Activity Logs'], ['audit-auth-view', 'Authentication Logs'], ['audit-notifications-view', 'Notification Logs']]) {
    let actual;
    render({ setPortalHeader: (...args) => { actual = args; } }, id);
    assert.deepEqual(actual, ['Audit Logs', title]);
}
console.log('Audit header uses shared parent/child header for each log category.');
