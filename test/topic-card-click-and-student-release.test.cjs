const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('Topic Card Click & Student Release Verification', async (t) => {
  await t.test('Topic card markup has container-level clickable attributes', () => {
    const sharedCode = fs.readFileSync(path.join(__dirname, '../js/shared-components.js'), 'utf8');
    assert.match(sharedCode, /cursor-pointer group/, 'Topic card must have cursor-pointer and group classes');
    assert.match(sharedCode, /role="link"/, 'Topic card must have role="link" for accessibility and clickable semantics');
    assert.match(sharedCode, /onclick="\$\{escapeHtml\(clickHandler\)\}"/, 'Topic card container must invoke clickHandler');
  });

  await t.test('Teacher and student getTopicSubject resolves card-oralcomm and code fallbacks', () => {
    const teacherCode = fs.readFileSync(path.join(__dirname, '../js/teacher.js'), 'utf8');
    const studentCode = fs.readFileSync(path.join(__dirname, '../js/student.js'), 'utf8');

    assert.match(teacherCode, /window\.findMatchingSubject/, 'Teacher must query admin subjects via findMatchingSubject fallback');
    assert.match(teacherCode, /replace\(\/\^\(card-\|subj-\|gen-\)\/i/, 'Teacher must provide fallback subject descriptor so getTopicSubject never returns null');

    assert.match(studentCode, /window\.findMatchingSubject/, 'Student must query admin subjects via findMatchingSubject fallback');
    assert.match(studentCode, /replace\(\/\^\(card-\|subj-\|gen-\)\/i/, 'Student must provide fallback subject descriptor so getTopicSubject never returns null');
  });

  await t.test('Student section resolution recognizes grade_section from database and Einstein', () => {
    const sharedCode = fs.readFileSync(path.join(__dirname, '../js/shared-components.js'), 'utf8');
    assert.match(sharedCode, /student\.grade_section/, 'Must check student.grade_section from database user model');
    assert.match(sharedCode, /isSectionAssignedToStudent/, 'Must have section assignment helper');
  });

  await t.test('Notifications check recipient arrays directly', () => {
    const notifCode = fs.readFileSync(path.join(__dirname, '../js/notifications.js'), 'utf8');
    assert.match(notifCode, /notif\.recipients/, 'Notification audience matcher must inspect recipients array');
  });

  await t.test('Installer seeds dual-key academic records and Einstein student users', () => {
    const installerCode = fs.readFileSync(path.join(__dirname, '../scripts/install-all-draft-coursework.php'), 'utf8');
    assert.match(installerCode, /SEC-EINSTEIN-302/, 'Installer must record SEC-EINSTEIN-302');
    assert.match(installerCode, /Einstein/, 'Installer must record Einstein');
    assert.match(installerCode, /grade_section.*=.*Einstein/s, 'Installer must update student accounts to section Einstein');
  });
});
