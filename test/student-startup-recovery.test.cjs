const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = name => fs.readFileSync(path.join(__dirname, '../js', name), 'utf8');

async function main() {
    const classes = new Set();
    const timers = [];
    const events = {};
    const window = { addEventListener: (name, fn) => { events[name] = fn; } };
    const document = {
        readyState: 'loading',
        documentElement: { classList: { add: value => classes.add(value), remove: value => classes.delete(value) } },
        addEventListener: (name, fn) => { events[name] = fn; }
    };
    const context = vm.createContext({ window, document, requestAnimationFrame: fn => fn(100), setTimeout: (fn, ms) => timers.push({ fn, ms }) });
    vm.runInContext(source('page-skeleton.js'), context);
    window.SigmaPageLoading.waitForInitial(() => new Promise(() => {}));
    events.DOMContentLoaded();
    assert.ok(classes.has('sigma-initial-loading'), 'Pending initialization keeps its loader initially');
    timers.find(timer => timer.ms === 3000).fn();
    assert.ok(!classes.has('sigma-initial-loading'), 'Stalled work cannot permanently mask the shell');
    vm.runInContext(source('page-skeleton.js'), context);
    assert.ok(!classes.has('sigma-initial-loading'), 'Duplicate script cannot restart initial masking');

    const values = new Map([
        ['sigma-authenticated-user', JSON.stringify({ id: 'test-student' })],
        ['sigma-ai-recorded-logs', JSON.stringify([{ id: 'log-1', userId: 'test-student' }])]
    ]);
    const storage = { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
    const calls = [];
    const root = { addEventListener() {}, dispatchEvent() {} };
    vm.runInNewContext(source('ai-database-store.js'), {
        window: root, document: { readyState: 'loading', addEventListener() {} },
        location: { pathname: '/student.html', port: '', href: 'http://sigma.test/student.html' },
        sessionStorage: storage, localStorage: storage, URL, URLSearchParams, AbortSignal,
        Event: class {}, CustomEvent: class {}, setInterval() {}, console,
        fetch: async (url, options) => {
            calls.push({ url, options });
            return { ok: true, json: async () => ({ success: true, exists: true, revision: 1, state: { cards: [] } }) };
        }
    });
    await root.SigmaAiDatabase.initialize();
    await root.SigmaAiDatabase.initialize();
    assert.equal(calls.filter(call => call.options.method === 'POST').length, 1, 'Polling imports each legacy log once per session');
    assert.ok(calls.every(call => call.options.signal), 'Reads and writes both have request deadlines');
    console.log('PASS: stalled startup recovery, duplicate loader protection, bounded requests, and deduplicated log import.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
