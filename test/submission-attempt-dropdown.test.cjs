const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
 const browser = await chromium.launch({ channel: 'chrome', headless: true });
 try {
  const page = await browser.newPage();
  await page.route('http://fixture.test/**', route => route.fulfill({ body: '<html><body></body></html>', contentType: 'text/html' }));
  await page.goto('http://fixture.test/admin.html');
  await page.addScriptTag({ path: 'js/shared-components.js' });
  await page.addStyleTag({ path: 'css/shared-components.css' });
  await page.evaluate(() => {
   const student = { id: 's1', name: 'Student', section: 'Rizal' };
   const item = { id: 'task', title: 'Task', category: 'assignment', maxScore: 100 };
   const attempts = [{ submittedAt: '2026-10-01', files: [{ name: 'First.docx', type: 'docx' }], score: 90 }, { submittedAt: '2026-10-12', files: [{ name: 'Latest.docx', type: 'docx' }] }];
   window.currentTopicState = { subjectId: 'prog', selectedSection: 'Rizal', selectedStudent: 'Student', topicIdx: 0 };
   window._sharedViewSubmissionMode = true;
   window.getUnifiedSectionStudents = () => [student];
   window.getStudentAssessmentSubmission = () => ({ status: 'Submitted', submittedAt: '2026-10-12', attempts, files: attempts.at(-1).files });
   window.findAssessmentSubmittedWork = () => window.getStudentAssessmentSubmission();
   window.studentHasTurnedInWork = () => true;
   window.getEffectiveAssessmentStatusAndScore = () => ({ score: '', status: '' });
   window.renderAdminTopicContentWorkstation = () => {
    document.body.innerHTML = window.renderSharedAssessmentsTabHtml({ assessments: [item], activeIdx: 0, subjectId: 'prog', topicIdx: 0, section: 'Rizal', tab: 'assessments', role: 'admin' });
   };
   window.renderAdminTopicContentWorkstation();
  });
  assert.equal(await page.locator('#submission-attempt-select').inputValue(), '1');
  assert.match(await page.locator('body').textContent(), /Latest.docx/);
  await page.selectOption('#submission-attempt-select', '2');
  assert.equal(await page.locator('#submission-attempt-select').inputValue(), '2');
  assert.match(await page.locator('body').textContent(), /First.docx/);
  for (const width of [375, 1200]) {
   await page.setViewportSize({ width, height: 900 });
   assert.equal(await page.locator('#submission-attempt-select').evaluate(e => getComputedStyle(e).fontSize), width === 375 ? '12px' : '14px');
  }
  console.log('PASS: latest attempt defaults, historical selection, and mobile dropdown scaling.');
 } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
