const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const store = new Map();
let resolveResponse;
const events = [];
const window = { addEventListener() {}, dispatchEvent(event) { events.push(event.type); } };
const context = { window, URL, URLSearchParams, Event, console, setInterval() {},
    document: { readyState: 'loading', addEventListener() {} },
    location: { port: '', pathname: '/teacher.html', href: 'http://localhost/teacher.html' },
    sessionStorage: { getItem: () => JSON.stringify({ id: 'teacher-one' }) },
    localStorage: { getItem: key => store.get(key) || null, setItem: (key, value) => store.set(key, value) },
    fetch: () => new Promise(resolve => { resolveResponse = resolve; }) };
vm.runInNewContext(fs.readFileSync(require.resolve('../js/ai-database-store.js'), 'utf8'), context);
(async () => {
    const db = window.SigmaAiDatabase;
    assert.equal(db.getStatus('teacher'), 'loading');
    const pending = db.ensureState('teacher', 'teacher-one');
    assert.equal(db.getStatus('teacher'), 'loading');
    resolveResponse({ ok: true, json: async () => ({ success: true, exists: true, state: { cards: [{ id: 'saved' }] } }) });
    await pending;
    assert.equal(db.getStatus('teacher'), 'ready');
    assert.equal(db.getState('teacher', 'teacher-one').cards.length, 1);
    assert.ok(events.includes('sigma:refresh-analytics-cards'));
    const failed = db.ensureState('teacher', 'other');
    resolveResponse({ ok: false, json: async () => ({ success: false, error: 'Unavailable' }) });
    await assert.rejects(failed);
    assert.equal(db.getStatus('teacher', 'other'), 'error');
    console.log('PASS: analytics loading follows database completion and failures');
})().catch(error => { console.error(error); process.exitCode = 1; });
