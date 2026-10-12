const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../js/student.js'), 'utf8');
const start = source.indexOf('                        const prevScrollY = window.scrollY;');
const end = source.indexOf('\n                    }', start);
for (const previous of [undefined, true, false]) {
    const window = { scrollY: 750, scrollX: 0, _suppressSubmissionScrollToTop: previous,
        scrollTo: position => { assert.equal(position.top, 750); } };
    let rendered = false;
    vm.runInNewContext(source.slice(start, end), { window, _renderTopicContentMain: () => {
        assert.equal(window._suppressSubmissionScrollToTop, true);
        rendered = true;
    } });
    assert.equal(rendered, true);
    assert.equal(window._suppressSubmissionScrollToTop, previous);
}
console.log('PASS: background grading suppresses delayed scroll resets and restores prior suppression state');
