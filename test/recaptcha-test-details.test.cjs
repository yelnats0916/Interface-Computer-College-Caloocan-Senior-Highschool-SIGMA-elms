const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../js/admin.js'), 'utf8');
function element() {
    return { children: [], attributes: {}, textContent: '', setAttribute(name, value) { this.attributes[name] = value; },
        append(...children) { this.children.push(...children); }, appendChild(child) { this.children.push(child); }, querySelector() { return null; } };
}
const context = { window: {}, document: { createElement: element } };
vm.createContext(context);
vm.runInContext(source.slice(source.indexOf('    window.renderRecaptchaTestResult ='),
    source.indexOf('    window.runRecaptchaTestChallenge =')), context);
let host = element();
context.window.renderRecaptchaTestResult(host, { success: true, score: 0.9, action: 'login', hostname: 'localhost' });
assert.deepEqual(host.children[0].children.map(child => child.textContent),
    ['Result', 'Passed', 'Score', '0.90 / 1.0', 'Action', 'login', 'Verified domain', 'localhost']);
host = element();
context.window.renderRecaptchaTestResult(host, { success: false, score: 0, action: 'login', hostname: 'localhost' }, new Error('Low score'));
assert.equal(host.children[0].children[1].textContent, 'Failed');
assert.equal(host.children[0].children[3].textContent, '0.00 / 1.0');
assert.equal(host.children[0].children.at(-1).textContent, 'Low score');
host = element();
context.window.renderRecaptchaTestResult(host, { success: true, score: null, action: null, hostname: 'localhost' });
assert.equal(host.children[0].children[3].textContent, 'Not provided');
assert.equal(host.children[0].children[5].textContent, 'Not provided');
console.log('Actual verification details, zero-score failures, and absent v2 metrics passed');
