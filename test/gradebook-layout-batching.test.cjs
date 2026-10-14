const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('js/sidebar.js', 'utf8');
const start = source.indexOf('window.updateLayout = function');
const end = source.indexOf('\n};', start) + 4;
let layouts = 0;
const frames = [];
const window = { _deferPortalLayout: true };
vm.runInNewContext(source.slice(start, end), {
    window, requestAnimationFrame: callback => { frames.push(callback); return frames.length; },
    restoreShellAfterViewportChange: () => { layouts++; }
});
for (let i = 0; i < 3; i++) window.updateLayout();
assert.equal(layouts, 0, 'Navigation does not synchronously recalculate layout');
assert.equal(frames.length, 1, 'Repeated requests share one frame');
window._deferPortalLayout = false;
frames[0]();
assert.equal(layouts, 1);
window.updateLayout();
assert.equal(layouts, 2, 'Other callers retain immediate layout updates');
console.log('PASS: three navigation layout requests coalesce into one; other updates unchanged');
