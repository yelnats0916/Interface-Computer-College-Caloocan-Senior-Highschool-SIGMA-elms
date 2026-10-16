const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../js/admin.js'), 'utf8');
const body = source.slice(source.indexOf('function updateAiDisplay()'), source.indexOf('window.updateAiDisplay ='));
const elements = new Map();
const document = { getElementById(id) { if (!elements.has(id)) elements.set(id, { textContent: '', style: {}, parentElement: {} }); return elements.get(id); } };
let logs = [];
const context = vm.createContext({ document, window: { SigmaAiLogs: { getRecords: () => logs } }, currentAiModel: 'gemini', currentAiPeriod: 'daily', Intl, Date, Set });
vm.runInContext(body, context);
context.updateAiDisplay();
assert.equal(elements.get('ai-requests-value').parentElement.hidden, true);
const log = { id: 'real-1', provider: 'gemini', timestamp: new Date().toISOString() };
logs = [log, log, { ...log, id: 'groq-1', provider: 'groq' }, { ...log, id: 'deleted', isDeleted: true }, { ...log, id: 'invalid', timestamp: 'invalid' }, { ...log, id: 'old', timestamp: '2020-01-01T00:00:00Z' }];
context.updateAiDisplay();
assert.equal(elements.get('ai-requests-value').textContent, '1');
assert.equal(elements.get('ai-requests-value').parentElement.hidden, false);
assert.equal(elements.get('ai-usage-percent').textContent, 'Unavailable');
context.currentAiModel = 'groq';
context.currentAiPeriod = 'monthly';
context.updateAiDisplay();
assert.equal(elements.get('ai-requests-value').textContent, '1');
assert.match(elements.get('ai-period-desc').textContent, /month/);
context.window.SigmaAiDatabase = { logsReady: () => false };
context.updateAiDisplay();
assert.equal(elements.get('ai-requests-value').parentElement.hidden, true);
assert.match(elements.get('ai-period-desc').textContent, /Loading/);
context.window.SigmaAiDatabase.logsReady = () => true;
context.updateAiDisplay();
assert.equal(elements.get('ai-requests-value').textContent, '1');
assert.equal(elements.get('ai-status-label').textContent, 'Recorded activity');
assert.equal(elements.get('ai-usage-bar').hidden, true);
// Check Manila's midnight boundary, independent of the host timezone.
vm.runInContext("Date = class extends Date { constructor(value) { super(arguments.length ? value : '2026-10-15T16:30:00Z'); } }", context);
context.currentAiModel = 'gemini';
context.currentAiPeriod = 'daily';
logs = [
 {id:'yesterday',provider:'gemini',timestamp:'2026-10-15T15:59:00Z'},
 {id:'today',provider:'gemini',timestamp:'2026-10-15T16:01:00Z'},
 {id:'unknown',model:'gemini-test',timestamp:'2026-10-15T16:01:00Z'},
 {id:'tomorrow',provider:'gemini',timestamp:'2026-10-16T16:01:00Z'}
];
context.updateAiDisplay();
assert.equal(elements.get('ai-requests-value').textContent, '1');
assert.match(elements.get('ai-period-desc').textContent, /Asia\/Manila/);
console.log('PASS: real log filters, deduplication, provider/period switching, and empty state.');
