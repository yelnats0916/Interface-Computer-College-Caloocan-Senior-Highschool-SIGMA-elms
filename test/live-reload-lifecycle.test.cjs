const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../js/live-reload-lifecycle.js'), 'utf8');
const handlers = {};
const sockets = [];
class Socket extends EventTarget {
    static CLOSING = 2;
    constructor(url) { super(); this.url = url; this.readyState = 1; sockets.push(this); }
    close() { this.readyState = 3; }
}
const window = {
    location: { hostname: '127.0.0.1', host: '127.0.0.1:5519', pathname: '/teacher.html', href: 'http://127.0.0.1:5519/teacher.html' },
    WebSocket: Socket,
    addEventListener: (type, handler) => { handlers[type] = handler; }
};
vm.runInNewContext(source, { window, URL, MessageEvent });
const live = new window.WebSocket('ws://127.0.0.1:5519/teacher.html/ws');
const unrelated = new window.WebSocket('ws://127.0.0.1:5519/application/ws');
let message;
live.addEventListener('message', event => { message = event.data; });
handlers.pagehide();
assert.equal(live.readyState, 3);
assert.equal(unrelated.readyState, 1);
handlers.pageshow({ persisted: false });
assert.equal(sockets.length, 2);
handlers.pageshow({ persisted: true });
assert.equal(sockets.length, 3);
sockets[2].dispatchEvent(new MessageEvent('message', { data: 'refreshcss' }));
assert.equal(message, 'refreshcss');
handlers.pagehide();
assert.equal(sockets[2].readyState, 3);
handlers.pageshow({ persisted: true });
assert.equal(sockets.length, 4);
const production = { ...window, location: { ...window.location, hostname: 'school.example' }, WebSocket: Socket };
vm.runInNewContext(source, { window: production, URL, MessageEvent });
assert.equal(production.WebSocket, Socket);
console.log('PASS: local live reload closes before caching, reconnects on restore, and leaves other sockets and production untouched');
