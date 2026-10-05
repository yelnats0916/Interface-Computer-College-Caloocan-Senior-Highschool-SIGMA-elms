const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../js/shared-components.js'), 'utf8');
const listeners = [];
const context = vm.createContext({
    window: {
        addEventListener(type, handler, capture) { listeners.push({ type, handler, capture }); },
        invalidateTeacherGradebookCache() { this.gradebookFresh = true; },
        invalidateSharedAssessmentSubmissionsStorage() { this.submissionsFresh = true; },
        clearCategoryDetailsCache() { this.categoriesFresh = true; }
    },
    document: {
        addEventListener(type, handler, capture) { listeners.push({ type, handler, capture }); }
    }
});
const start = source.indexOf('window.invalidateSigmaViewCaches = function');
const end = source.indexOf('let _scoreRefreshDebounceTimer', start);
assert.ok(start > 0 && end > start);
vm.runInContext(source.slice(start, end), context);
function seedCaches() {
    const w = context.window;
    w._sigmaSubjectsListCache = { list: ['stale'] };
    w._quizStorageListCache = ['stale'];
    for (const key of ['_studentAssessmentDetailsCache', '_teacherStatsCache', '_teacherSecStudentsCache']) {
        w[key] = new Map([['stale', 1]]);
    }
    w.draft = 'Unsaved answer';
}
seedCaches();
const click = listeners.find(l => l.type === 'click');
assert.equal(click.capture, true);
click.handler({ target: { closest: () => ({}) } });
assert.equal(context.window._sigmaSubjectsListCache, null);
assert.equal(context.window._quizStorageListCache, null);
assert.equal(context.window._studentAssessmentDetailsCache.size, 0);
assert.equal(context.window._teacherStatsCache.size, 0);
assert.equal(context.window._teacherSecStudentsCache.size, 0);
assert.equal(context.window.gradebookFresh, true);
assert.equal(context.window.submissionsFresh, true);
assert.equal(context.window.categoriesFresh, true);
assert.equal(context.window.draft, 'Unsaved answer');
for (const type of ['popstate', 'hashchange', 'storage', 'pageshow', 'focus']) {
    seedCaches();
    listeners.find(l => l.type === type).handler();
    assert.equal(context.window._sigmaSubjectsListCache, null, type);
}
// Exercise each real cache read with an edit whose serialized length is unchanged.
const blocks = [...source.matchAll(/if \(!window\._sigmaSubjectsListCache \|\| window\._sigmaSubjectsListCache\.raw[^\n]*\{\r?\n[\s\S]*?window\._sigmaSubjectsListCache = [^\n]*;\r?\n\s*\}/g)];
assert.equal(blocks.length, 3);
for (const [block] of blocks) {
    const read = vm.createContext({ window: {}, JSON, storageKey: 'sigma-admin-subjects' });
    read.subjectsRaw = read.rawSubjects = '[{"title":"Old"}]';
    vm.runInContext(block, read);
    assert.equal(read.window._sigmaSubjectsListCache.list[0].title, 'Old');
    read.subjectsRaw = read.rawSubjects = '[{"title":"New"}]';
    vm.runInContext(block, read);
    assert.equal(read.window._sigmaSubjectsListCache.list[0].title, 'New');
}
for (const [file, entry] of [['admin.js', 'window.showSection = function'], ['teacher.js', 'function switchTab(navId'], ['student.js', 'function _applyTab(navId']]) {
    const role = fs.readFileSync(path.join(__dirname, '../js', file), 'utf8');
    const offset = role.indexOf(entry);
    assert.ok(role.slice(offset, offset + 160).includes('window.invalidateSigmaViewCaches?.();'), file);
}
console.log('PASS: fresh clicks, history, storage, focus, equal-length edits, role navigation, and draft preservation');
