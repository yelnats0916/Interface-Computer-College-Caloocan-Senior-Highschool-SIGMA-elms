const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const src = fs.readFileSync(path.join(__dirname, '../js/announcements.js'), 'utf8');

// Extract the isolation helpers and run them in isolation
const start = src.indexOf('function normSecToken');
const end = src.indexOf('function getTeacherAssignedSections');
assert.ok(start > 0 && end > start, 'isolation helpers exist');
const ctx = {};
vm.runInNewContext(src.slice(start, end) + '\nthis.h={normSecToken,normSubjToken,getPostSectionToken,getPostSubjectToken};', ctx);
const { normSecToken, normSubjToken, getPostSectionToken, getPostSubjectToken } = ctx.h;

const einsteinPost = {
    audience: 'Einstein',
    audienceLabel: 'Grade 11 - Einstein \u2022 Computer Programming 1',
    subject: 'Computer Programming 1',
    classroomKey: 'Einstein::Computer Programming 1',
    sectionName: 'Einstein'
};
const roomMatches = (post, sec, subj) =>
    getPostSectionToken(post) === normSecToken(sec) && getPostSubjectToken(post) === normSubjToken(subj);

assert.ok(roomMatches(einsteinPost, 'Einstein', 'Computer Programming 1'), 'Einstein room sees Einstein post');
assert.ok(roomMatches(einsteinPost, 'Grade 11 - Einstein', 'Computer Programming 1'), 'Grade prefix normalized');
assert.ok(!roomMatches(einsteinPost, 'Newton', 'Computer Programming 1'), 'Same subject, different section is isolated');
assert.ok(!roomMatches(einsteinPost, 'Einstein B', 'Computer Programming 1'), 'No substring section leak');
assert.ok(!roomMatches(einsteinPost, 'Einstein', 'Computer Programming 2'), 'Different subject is isolated');
assert.ok(!roomMatches({ audience: '', audienceLabel: '' }, 'Newton', 'Computer Programming 1'), 'Empty audience never matches');

// Old fuzzy matching must be gone from the room feed
assert.ok(!src.includes('sec.includes(pAud)'), 'Fuzzy room matching removed');
assert.ok(src.includes('pSec !== sec'), 'Strict room section check present');

console.log('PASS: announcements are isolated per exact section + subject');
