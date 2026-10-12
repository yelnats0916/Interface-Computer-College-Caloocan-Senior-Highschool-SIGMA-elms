const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../js/page-skeleton.js'), 'utf8');
const events = {};
const classes = new Set();
const frames = [];
const document = {
    readyState: 'loading',
    documentElement: { classList: { add: value => classes.add(value), remove: value => classes.delete(value) } },
    addEventListener: (name, fn) => { events[name] = fn; }
};
const window = { addEventListener: (name, fn) => { events[name] = fn; } };
vm.runInNewContext(source, { window, document, requestAnimationFrame: fn => frames.push(fn) });
assert.ok(classes.has('sigma-initial-loading'));
events.DOMContentLoaded();
frames.forEach(fn => fn());
assert.equal(classes.has('sigma-initial-loading'), false, 'Rendered application is revealed without waiting for unrelated assets');
assert.equal(events.load, undefined, 'Full window load does not block gradebooks');
console.log('PASS: initial page skeleton ends after DOM readiness without waiting for unrelated assets.');
assert.equal(events.readystatechange, undefined, 'Keep shimmer through page setup instead of revealing partially initialized content');
