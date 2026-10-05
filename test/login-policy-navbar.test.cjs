const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');
const header = html => html.match(/<header id="mainNav"[\s\S]*?<\/header>/)[0].replace(/\r/g, '');
const login = read('index.html');
const expected = header(login).replace('href="#" id="backToLoginLogo"', 'href="index.html" id="backToLoginLogo"')
    .replace('<button id="entryHelpCenterBtn"', '<a href="index.html#help" id="entryHelpCenterBtn"')
    .replace('<span class="text-base md:text-xl font-bold">Help Center</span>\n            </button>', '<span class="text-base md:text-xl font-bold">Help Center</span>\n            </a>');
for (const name of ['terms.html', 'privacy.html']) {
    const html = read(name);
    assert.equal(header(html), expected, `${name} must use the login navbar markup`);
    for (const css of ['login-critical.css', 'index.css', 'tailwind.css', 'mobile.css']) {
        assert.ok(html.includes(`css/${css}`), `${name} must load ${css}`);
    }
    assert.ok(!html.includes('policy-navbar.css'));
}
assert.ok(login.includes('css/login-critical.css'));
console.log('PASS: login, Terms and Privacy share exact navbar markup and styles');
