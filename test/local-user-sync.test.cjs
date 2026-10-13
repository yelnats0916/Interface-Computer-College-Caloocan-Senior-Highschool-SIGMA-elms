const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('js/admin.js', 'utf8');
const start = source.indexOf('const syncUserToDB =');
const end = source.indexOf('// Initial DB Fetch for users', start);
const posts = [];
let local = [{ id: 'existing', role: 'Student', password: 'local-password' }, { id: 'new', role: 'Student', password: 'preserved-password', status: 'Active' }, { id: 'admin', role: 'Admin', password: 'secret' }, { id: 'deleted', role: 'Student', password: 'secret', isDeleted: true }];
const context = {
    console, USER_STORAGE_KEY: 'users', resolveUsersApiUrl: () => '/users',
    getStoredJson: () => local,
    window: { saveStoredJson: (key, value) => { local = value; } },
    fetch: async (url, options) => {
        if (options) { posts.push(JSON.parse(options.body)); return { ok: true, json: async () => ({ success: true }) }; }
        return { ok: true, json: async () => ({ success: true, records: [{ id: 'existing', role: 'Student', password: 'server-password' }] }) };
    }
};
vm.createContext(context);
vm.runInContext(source.slice(start, end) + '\nwindow.testFetch = fetchUsersFromDB;', context);
(async () => {
    await context.window.testFetch();
    assert.equal(posts.length, 1);
    assert.equal(posts[0].action, 'create_missing');
    assert.equal(posts[0].user.id, 'new');
    assert.equal(posts[0].user.password, 'preserved-password');
    assert.equal(local.find(user => user.id === 'existing').password, 'server-password');
    console.log('PASS: import missing teaching accounts only, preserve credentials, and retain database authority.');
})().catch(error => { console.error(error); process.exitCode = 1; });
