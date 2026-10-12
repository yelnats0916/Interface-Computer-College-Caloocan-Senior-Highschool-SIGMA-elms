const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const rules = require('../js/student-analytics.js');
const now = Date.parse('2026-10-08T08:00:00Z');
const input = { studentId: 'student-one', areas: [{ id: 'submissions', records: [{ id: 'task', score: 80 }] }] };
const card = score => ({ id: 'insight-one', area: 'submissions', evidenceIds: ['task'], analyses: [{ text: `Score ${score}` }] });
const commit = (snapshot, state, cards, time = now) => rules.acceptGeneration(cards, snapshot, state, rules.generationPolicy(snapshot, state, time), time);
let state = commit(input, {}, [card(80)]);
assert.equal(state.generatedCount, 1);
assert.equal(rules.generationPolicy(input, state, now).shouldGenerate, false);
assert.equal(rules.generationPolicy(input, state, now + 86400000).shouldGenerate, false, 'A new day never creates new evidence');
assert.equal(rules.generationPolicy({ studentId: 's', areas: [] }, {}, now).shouldGenerate, false);
assert.equal(rules.evidenceFingerprint({ a: 1, b: [{ id: 'z' }, { id: 'a' }] }), rules.evidenceFingerprint({ b: [{ id: 'a' }, { id: 'z' }], a: 1 }));
assert.equal(rules.generationPolicy({ ...input, scopes: [{ subjectId: 'new' }] }, state, now).shouldGenerate, false, 'Unchanged content is not regenerated for unrelated scope metadata');
for (const score of [81, 82]) {
    const changed = { ...input, areas: [{ id: 'submissions', records: [{ id: 'task', score }] }] };
    state = commit(changed, state, [card(score)]);
}
const pending = { ...input, areas: [{ id: 'submissions', records: [{ id: 'task', score: 83 }] }] };
assert.equal(state.generatedCount, 3);
assert.equal(rules.generationPolicy(pending, state, now).shouldGenerate, false);
assert.equal(rules.generationPolicy(pending, state, now + 86400000).shouldGenerate, true);
assert.equal(rules.generationPolicy(pending, state, Date.parse('2026-10-08T16:00:00Z')).day, '2026-10-09');
const repeated = commit(input, {}, [card(80)]);
const otherChange = { ...input, areas: [{ id: 'submissions', records: [{ id: 'task', score: 80 }, { id: 'other', score: 50 }] }] };
const deduped = commit(otherChange, repeated, [{ ...card(80), analyses: [{ text: 'Different wording for unchanged facts' }] }]);
assert.equal(deduped.generatedCount, 1, 'Paraphrasing unchanged cited evidence cannot consume the quota');
assert.equal(commit(otherChange, repeated, [], now + 1000).lastAnalyzed, repeated.lastAnalyzed, 'No new card means its displayed date must not change');
assert.equal(rules.generationPolicy(otherChange, deduped, now).shouldGenerate, false);
const empty = commit(input, {}, []);
assert.equal(empty.generatedCount, 0);
assert.equal(empty.cards.length, 0);
assert.equal(rules.generationPolicy(input, empty, now).shouldGenerate, false, 'An empty valid response does not repeatedly invoke the provider');
const multiple = { studentId: 's', areas: ['a', 'b', 'c', 'd'].map(id => ({ id, records: [{ id, score: 80 }] })) };
const batch = multiple.areas.map(area => ({ id: area.id, area: area.id, evidenceIds: [area.id], analyses: [{ text: area.id }] }));
const capped = commit(multiple, {}, batch);
assert.equal(capped.newCards.length, 3, 'A provider cannot exceed the hard cap');
assert.equal(rules.generationPolicy(multiple, capped, now + 86400000).changedAreas.length, 1, 'Over-limit evidence remains pending');

async function runtime(role) {
    let owner = `${role}-one`;
    let score = 80;
    let fail = false;
    let calls = 0;
    let clock = now;
    const storage = new Map();
    class TestDate extends Date { static now() { return clock; } }
    const window = { location: { pathname: `/${role}.html`, href: `http://localhost/${role}.html` },
        SigmaInsightRules: rules, dispatchEvent() {},
        getLoggedInStudentUser: () => ({ id: owner }), getLoggedInTeacherUser: () => ({ id: owner }),
        getTeacherSectionCards: () => [{ subject: 'Programming', sectionName: 'Rizal' }],
        getUnifiedSectionStudents: () => [{ id: 'a' }],
        getCategoryDetails: category => category === 'ww' ? [{ id: 'task', max: 100, title: 'Task' }] : [],
        findAssessmentSubmittedWork: () => true, getGradebookStudentItemScore: () => score };
    const context = { window, Date: TestDate, URL, CustomEvent: class {}, setTimeout() {}, clearTimeout() {},
        localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
        document: { readyState: 'loading', addEventListener() {}, querySelectorAll: () => [] } };
    vm.runInNewContext(fs.readFileSync(require.resolve(`../js/${role}-analytics.js`), 'utf8'), context);
    const api = role === 'student' ? window.SigmaStudentAnalytics : window.SigmaTeacherAnalytics;
    if (role === 'student') api.registerArea('submissions', () => ({ studentId: owner, scopes: [{ subjectId: 'p', sectionId: 'r' }],
        records: [{ id: 'task', subjectId: 'p', sectionId: 'r', score }] }));
    api.setProvider(async request => {
        calls++;
        if (fail) throw new Error('Provider failed');
        assert.ok(request.maxCards <= 3);
        const area = request.snapshot.areas[0];
        return { cards: [{ area: area.id, title: 'Your Assessment Score Update', evidenceIds: area.records.map(record => record.id),
            analyses: [{ category: 'descriptive', actionLabel: 'Try', text: `Review your ${score} result.` }] }] };
    });
    await api.analyze();
    await api.analyze();
    assert.equal(calls, 1, `${role}: repeated refresh must not call provider`);
    clock += 86400000;
    await api.analyze();
    assert.equal(calls, 1, `${role}: day rollover does not generate`);
    const savedBeforeFailure = storage.get(`sigma-${role}-analytics-v1:${owner}`);
    score++;
    fail = true;
    await api.analyze();
    const failedState = JSON.parse(storage.get(`sigma-${role}-analytics-v1:${owner}`));
    const beforeFailure = JSON.parse(savedBeforeFailure);
    assert.equal(failedState.generatedCount, beforeFailure.generatedCount, 'Failures do not consume the insight quota');
    assert.equal(failedState.fingerprint, beforeFailure.fingerprint, 'Failures do not mark evidence processed');
    await api.analyze();
    assert.equal(calls, 2, `${role}: rapid retries after failure must not call provider`);
    clock += 300001;
    if (role === 'student') {
        await api.analyze({ automatic: true });
        assert.equal(calls, 2, 'Unchanged failed evidence is never retried automatically');
    }
    fail = false;
    for (const next of [81, 82, 83, 84]) { score = next; await api.analyze(); }
    assert.equal(calls, 5, `${role}: only three successful new insights on this day`);
    clock += 86400000;
    await api.analyze();
    assert.equal(calls, 6, `${role}: pending changed evidence is eligible tomorrow`);
    owner = `${role}-two`;
    await api.analyze();
    assert.equal(calls, 7, `${role}: quotas are isolated per account`);
}
(async () => {
    await runtime('student');
    await runtime('teacher');
    const saved = new Map();
    const storage = { getItem: key => saved.get(key), setItem: (key, value) => saved.set(key, value) };
    let time = now;
    let calls = 0;
    const invalid = async () => { calls++; return rules.validateCards({ cards: 'invalid' }, input); };
    await assert.rejects(rules.guardedProviderCall(storage, 'owner-one', 'changed', invalid, { now: () => time }));
    await assert.rejects(rules.guardedProviderCall(storage, 'owner-one', 'changed', invalid, { now: () => time }), { code: 'ANALYTICS_RETRY_BLOCKED' });
    assert.equal(calls, 1, 'Invalid responses and reloads cannot bypass the cooldown');
    time += 300001;
    await assert.rejects(rules.guardedProviderCall(storage, 'owner-one', 'changed', invalid, { automatic: true, now: () => time }), { code: 'ANALYTICS_RETRY_BLOCKED' });
    assert.equal(calls, 1, 'Automatic retries of invalid responses cannot burn tokens');
    await rules.guardedProviderCall(storage, 'owner-one', 'changed', async () => [], { now: () => time });
    assert.equal(JSON.parse(saved.get('owner-one')).failedFingerprint, undefined, 'A successful manual retry clears the failure');
    let invoked = false;
    await rules.withGenerationLock({ navigator: { locks: { request: async (key, callback) => { assert.equal(key, 'owner'); invoked = true; return callback(); } } } }, 'owner', () => 1);
    assert.equal(invoked, true);
    console.log('Evidence-only generation, daily cap, deduplication, rollover, failure retry, and student/teacher runtime tests passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
