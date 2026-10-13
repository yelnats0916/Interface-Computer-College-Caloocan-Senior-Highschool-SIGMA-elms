const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../js/admin.js'), 'utf8');
const start = source.indexOf("        document.documentElement.classList.remove('sigma-hash-navigating');");
const end = source.indexOf('        const gradesSection', start);
assert.ok(start > 0 && end > start);
for (const route of ['users-view', 'dashboard-view']) {
    const styles = new Set(['sigma-early-hash-style', 'early-dashboard-style']);
    const classes = new Set(['sigma-hash-navigating']);
    vm.runInNewContext(source.slice(start, end), { document: {
        documentElement: { classList: { remove: name => classes.delete(name) } },
        getElementById: id => styles.has(id) ? { remove: () => styles.delete(id) } : null
    } });
    assert.equal(styles.size, 0, route + ' must not retain startup visibility overrides');
    assert.equal(classes.size, 0);
}
console.log('PASS: admin navigation releases startup rules that force Home hidden or visible.');
