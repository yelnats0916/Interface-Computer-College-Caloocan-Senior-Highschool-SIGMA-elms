const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../js/shared-components.js'), 'utf8');
const handler = source.slice(source.indexOf('window.submitSubmissionComment = function'), source.indexOf('window.handleSubmissionFirstComment ='));
const storage = new Map();
const key = 'sigma_sub_prog_top_0_mat_task_std_student';
storage.set(key, JSON.stringify({ files: [{ name: 'work.docx' }], history: [{ files: [{ name: 'work.docx' }] }], attempts: [{ comment: '', replies: [] }] }));
const input = { value: 'My private comment', parentElement: { querySelector: () => ({ dataset: { submissionCommentKey: encodeURIComponent(key) } }) } };
let rendered;
const frames = [];
let auth = {};
const window = { location: { pathname: '/student.html' }, scrollX: 0, scrollY: 640,
    getPrivateSubmissionCommentKey: () => key,
    getStudentSubmissionStorageKey: () => 'wrong-index-key', getLoggedInStudentUser: () => ({ id: 'student', name: 'Student User' }),
    scrollTo(position) { this.scrollY = position.top; },
    switchTopicTab() { rendered = JSON.parse(storage.get(key)); this.scrollY = 0; } };
vm.runInNewContext(handler, { window, document: { getElementById: id => id.startsWith('submission-comment-input') ? input : null },
    localStorage: { getItem: k => storage.get(k) || null, setItem: (k, v) => storage.set(k, v) },
    sessionStorage: { getItem: () => JSON.stringify(auth) }, requestAnimationFrame: fn => frames.push(fn), console });
window.submitSubmissionComment('prog', 'assessments', 0, 0);
assert.equal(rendered.comment, 'My private comment');
assert.equal(rendered.history[0].comment, 'My private comment');
assert.equal(rendered.attempts[0].comment, 'My private comment');
assert.equal(rendered.files[0].name, 'work.docx');
assert.equal(storage.has('wrong-index-key'), false);
assert.equal(input.value, '');
assert.equal(window.scrollY, 640);
frames.forEach(fn => fn());
assert.equal(window._suppressSubmissionScrollToTop, false);
window.location.pathname = '/admin.html';
auth = { id: 'admin-one', name: 'Administrator', role: 'admin' };
input.value = 'Admin feedback';
window.submitSubmissionComment('prog', 'assessments', 0, 0);
assert.equal(rendered.replies[0].role, 'Admin');
assert.equal(rendered.replies[0].authorId, 'admin-one');
assert.equal(rendered.attempts[0].replies[0].text, 'Admin feedback');
const readerStart = source.indexOf('// Gradebook records can win submission resolution;');
const readerEnd = source.indexOf('const activeAttemptComment', readerStart);
const displayedAttempt = { comment: '', replies: [], score: 90 };
vm.runInNewContext(source.slice(readerStart, readerEnd), {
    window: { getStudentSubmissionStorageKey: () => key },
    localStorage: { getItem: k => storage.get(k) || null },
    subjectId: 'prog', topicIdx: 0, tab: 'assessments', activeIdx: 0,
    submissionAssessment: { id: 'task' }, studentObj: { id: 'student' },
    currentAttemptPage: 1, activeAttempt: displayedAttempt
});
assert.equal(displayedAttempt.comment, 'My private comment');
assert.equal(displayedAttempt.replies[0].text, 'Admin feedback');
assert.equal(displayedAttempt.score, 90, 'Thread recovery must not change grades');
window.getPrivateCommentActor = () => ({ id: auth.id, name: auth.name, role: auth.role });
const deleteStart = source.indexOf('window.deleteStudentSubmissionComment =');
const deleteEnd = source.indexOf('window.scrollSubmissionViewToTop =', deleteStart);
vm.runInNewContext(source.slice(deleteStart, deleteEnd), {
    window, localStorage: { getItem: k => storage.get(k) || null, setItem: (k, v) => storage.set(k, v) },
    sessionStorage: { getItem: () => JSON.stringify(auth) }, confirm: () => true, setTimeout: () => {}, requestAnimationFrame: fn => frames.push(fn), console
});
window.deleteSubmissionReply('prog', 'assessments', 0, 0, 0);
assert.equal(JSON.parse(storage.get(key)).replies.length, 0);
assert.equal(JSON.parse(storage.get(key)).attempts[0].replies.length, 0);
window.location.pathname = '/student.html';
auth = { id: 'student', name: 'Student User', role: 'student' };
window.deleteStudentSubmissionComment('prog', 'assessments', 0, 0);
assert.equal(JSON.parse(storage.get(key)).comment, '');
assert.equal(JSON.parse(storage.get(key)).attempts[0].comment, '');
console.log('PASS: displayed assessment key, visible attempt comment, preserved files and scroll');
