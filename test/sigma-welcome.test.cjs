const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js/shared-components.js'), 'utf8');
const start = source.indexOf('window.getSigmaWelcomeMessage = function');
const helper = source.slice(start, source.indexOf('\n};', start) + 4);
for (const [role, getter] of [['admin', 'getLoggedInAdminUser'], ['teacher', 'getEffectiveTeacher'], ['student', 'getLoggedInStudentUser']]) {
    let calls = 0;
    const window = { [getter]: () => ({ id: 'account-1', firstName: 'Stanley', fullName: 'Stanley Vargas Garcia' }) };
    const context = vm.createContext({ window, sessionStorage: { getItem: () => JSON.stringify({ id: 'account-1' }) }, fetch() { calls++; throw new Error('Greeting must not call AI'); } });
    vm.runInContext(helper, context);
    assert(window.getSigmaWelcomeMessage().includes('<strong>Stanley!</strong>'));
    assert.equal(calls, 0);
    window[getter] = () => ({ id: 'account-1', name: 'Dela Cruz, Juan Abad' });
    assert(window.getSigmaWelcomeMessage().includes('<strong>Juan!</strong>'));
    window[getter] = () => ({ id: 'account-1', firstName: '<img src=x onerror=alert(1)>' });
    assert(!window.getSigmaWelcomeMessage().includes('<img'));
    window[getter] = () => ({ id: 'other', firstName: 'Wrong User' });
    assert(window.getSigmaWelcomeMessage().includes('<strong>there!</strong>'));
    const portal = fs.readFileSync(path.join(root, `js/${role}.js`), 'utf8');
    assert(portal.includes('const WELCOME_MSG = window.getSigmaWelcomeMessage();'));
    assert(portal.includes("if (!isUser && content === WELCOME_MSG) msg.dataset.sigmaGreeting = 'true';"));
}
assert(fs.readFileSync(path.join(root, 'js/sigma-chat-client.js'), 'utf8').includes("if (el.dataset.sigmaGreeting === 'true') continue;"));
console.log('PASS: local personalized greeting for all roles, no API calls, escaped names, identity-safe lookup, greeting excluded from provider context');
