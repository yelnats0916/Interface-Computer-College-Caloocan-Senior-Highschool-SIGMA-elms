const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

describe('Teacher Assessment Releases and Notifications', () => {
    test('Subject editor dispatches admin notifications when teacher adds topic or material', () => {
        const editorSrc = fs.readFileSync(path.join(__dirname, '../js/subject-editor.js'), 'utf8');
        
        // Topic additions
        assert.ok(editorSrc.includes("teacher-topic-add:"), 'saveTopicFromEditor must generate teacher-topic-add notification');
        assert.ok(editorSrc.includes("window.SigmaNotifications.sendToRole('admin', notif)"), 'Teacher adding topic/material must notify admin');
        
        // Material additions
        assert.ok(editorSrc.includes("teacher-material-add:"), 'performSaveMaterial and saveAndAddAnotherMaterial must generate teacher-material-add notification');
    });

    test('Notification database provides resilient immediate dispatch and DB sync', () => {
        const dbSrc = fs.readFileSync(path.join(__dirname, '../js/notification-database.js'), 'utf8');
        assert.ok(dbSrc.includes('originalSend(targetRole,notification)'), 'originalSend must be called to ensure immediate local update and audit logging');
        assert.ok(dbSrc.includes("action:'send'"), 'sendToRole must request backend notification persistence');
    });

    test('Default release config for Oral Communication in Einstein releases Q1 and leaves exactly 1 topic, 1 lesson, 1 assessment, and 1 quiz unreleased in Q2', () => {
        const sharedSrc = fs.readFileSync(path.join(__dirname, '../js/shared-components.js'), 'utf8');
        assert.ok(sharedSrc.includes('window.getDefaultCurriculumReleaseConfig = function'), 'getDefaultCurriculumReleaseConfig must be defined');

        // Execute helper logic to verify release status
        const sandbox = {};
        const fnStr = sharedSrc.match(/window\.getDefaultCurriculumReleaseConfig\s*=\s*function[\s\S]*?^};/m)?.[0];
        assert.ok(fnStr, 'Extracted getDefaultCurriculumReleaseConfig implementation');
        
        const evalFn = new Function('window', fnStr + '; return window.getDefaultCurriculumReleaseConfig;');
        const getConfig = evalFn(sandbox);

        const topicCfg = getConfig('sigma_topic_release', 'CORE-111-OC', 'Einstein');
        const learningCfg = getConfig('sigma_learning_release', 'CORE-111-OC', 'Einstein');
        const assessCfg = getConfig('sigma_assessment_release', 'CORE-111-OC', 'Einstein');

        assert.ok(topicCfg, 'Topic config for Einstein must be defined');
        assert.ok(learningCfg, 'Learning config for Einstein must be defined');
        assert.ok(assessCfg, 'Assessment config for Einstein must be defined');

        // Q1 items released
        assert.ok(topicCfg.releasedTopicIds.includes('CORE-111-OC-T01'), 'Q1 Topic 1 must be released');
        assert.ok(topicCfg.releasedTopicIds.includes('CORE-111-OC-T02'), 'Q1 Topic 2 must be released');
        assert.ok(learningCfg.releasedMaterialIds.includes('CORE-111-OC-T01-M01'), 'Q1 Lesson 1 must be released');
        assert.ok(assessCfg.releasedMaterialIds.includes('CORE-111-OC-T01-M03'), 'Q1 Task 1 must be released');
        assert.ok(assessCfg.releasedMaterialIds.includes('QZ-CORE-111-OC-T01-04-MATERIAL'), 'Q1 Quiz 1 must be released');

        // Q2: Topic 5 Communicative Strategies is released
        assert.ok(topicCfg.releasedTopicIds.includes('CORE-111-OC-T05'), 'Q2 Communicative Strategies topic must be released');
        assert.ok(learningCfg.releasedMaterialIds.includes('CORE-111-OC-T05-M01'), 'Q2 Communicative Strategies lesson must be released');
        assert.ok(assessCfg.releasedMaterialIds.includes('CORE-111-OC-T05-M02'), 'Q2 Communicative Strategies task must be released');
        assert.ok(assessCfg.releasedMaterialIds.includes('QZ-CORE-111-OC-T05-02-MATERIAL'), 'Q2 Communicative Strategies quiz must be released');

        // Q2: Topic 6 Speech Types and Audience Analysis is UNRELEASED (Draft) for the capstone demo
        assert.ok(!topicCfg.releasedTopicIds.includes('CORE-111-OC-T06'), 'Q2 Speech Types and Audience Analysis topic must NOT be released (1 unreleased topic)');
        assert.ok(!learningCfg.releasedMaterialIds.includes('CORE-111-OC-T06-M01'), 'Q2 Speech Types lesson must NOT be released (1 unreleased lesson)');
        assert.ok(!assessCfg.releasedMaterialIds.includes('CORE-111-OC-T06-M02'), 'Q2 Speech Types task must NOT be released (1 unreleased assessment)');
        assert.ok(!assessCfg.releasedMaterialIds.includes('QZ-CORE-111-OC-T06-02-MATERIAL'), 'Q2 Speech Types quiz must NOT be released (1 unreleased quiz)');
    });

    test('Installer script seeds Section Einstein, academic records, and student notifications', () => {
        const installSrc = fs.readFileSync(path.join(__dirname, '../scripts/install-all-draft-coursework.php'), 'utf8');
        assert.ok(installSrc.includes("SEC-EINSTEIN-302"), 'Must configure section SEC-EINSTEIN-302');
        assert.ok(installSrc.includes("Renato Ramos"), 'Must associate teacher Renato Ramos');
        assert.ok(installSrc.includes("academic_records"), 'Must ensure academic_records table and releases');
        assert.ok(installSrc.includes("notification_records"), 'Must seed student notifications in notification_records');
    });
});
