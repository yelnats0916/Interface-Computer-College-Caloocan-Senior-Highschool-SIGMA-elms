const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.join(__dirname, '..');
(async () => {
 const browser = await chromium.launch({ headless: true, channel: 'chrome' });
 try {
 const page = await browser.newPage({viewport:{width:1400,height:900}});
 await page.route('http://sigma.test/**', route => route.fulfill({body:'<body><p id="insight"></p></body>',contentType:'text/html'}));
 await page.goto('http://sigma.test/student.html');
 await page.evaluate(() => {
  window.getLoggedInStudentUser = () => ({uid:'s1',section:'A'});
  window.renderSigmaAiText = text => text;
  window.requests=[];
  window.fetch=async (url,options)=>{
   const request=JSON.parse(options.body);window.requests.push({url,request});
   if(window.fail) return {ok:false,json:async()=>({error:'Provider unavailable'})};
   return {ok:true,json:async()=>({success:true,model:'test-model',status:'Success',cards:[{analyses:[{context:'Recorded grades reviewed.',text:'Review basic syntax.'}]}]})};
  };
 });
 await page.addScriptTag({path:path.join(root,'js/ai-log-store.js')});
 await page.addScriptTag({path:path.join(root,'js/subject-grade-insights.js')});
 const result=await page.evaluate(async()=>{
  const el=document.querySelector('#insight');
  const subject={subject:'Programming',subjectId:'p1',sectionId:'A',quarter:'all',grades:[90,null],assessments:[]};
  await Promise.all([refreshSubjectGradeInsight(el,subject),refreshSubjectGradeInsight(el,subject)]);
  await refreshSubjectGradeInsight(el,subject);
  const rows=[{id:'p1',subject:'Programming',term1Val:90,term2Val:null}];
  await refreshOverallGradeInsight(el,rows);
  const text=el.textContent;
  await refreshOverallGradeInsight(el,[{id:'demo',subject:'Demo',term1Val:null}]);
  const empty=el.textContent;
  window.fail=true;
  await refreshSubjectGradeInsight(el,{...subject,quarter:'2'});
  window.fail=false;
  await refreshSubjectGradeInsight(el,{...subject,quarter:'2'});
  const afterFailure = requests.length;
  await refreshSubjectGradeInsight(el,{...subject,quarter:'2',grades:[91,null]});
  const beforeOrder = requests.length;
  const assessments = [{label:'Task A',quarter:'1',score:90,maximum:100},{label:'Quiz B',quarter:'1',score:36,maximum:100}];
  await refreshSubjectGradeInsight(el,{...subject,assessments});
  await refreshSubjectGradeInsight(el,{...subject,assessments:[...assessments].reverse()});
  return {logs:SigmaAiLogs.getRecords(),requests,text,empty,afterFailure,beforeOrder};
 });
 assert.equal(result.afterFailure,3,'Returning after a failure must not automatically retry');
 assert.equal(result.beforeOrder,4,'Changed evidence must generate a new result');
 assert.equal(result.requests.length,5,'Reordering identical evidence must reuse the result');
 assert.equal(result.logs.length,5);
 assert.equal(result.requests[1].request.snapshot.scope,'overall');
 assert.deepEqual(result.requests[1].request.snapshot.areas[0].records[0].grades,[90,null,null,null]);
 assert.equal(result.text,'Recorded grades reviewed. Review basic syntax.');
 assert.equal(result.empty,'No grades recorded yet.');
 assert.ok(result.logs.every(log=>log.prompt && log.response && log.evidenceSources.length));
 assert.equal(result.logs.filter(log=>log.status==='Failed').length,1);
 // Leaving and returning during generation must share the original request.
 const inflight = await page.evaluate(async()=>{
  let calls=0, release;
  const gate=new Promise(resolve=>{release=resolve;});
  window.fetch=async()=>{calls++;await gate;return {ok:true,json:async()=>({success:true,model:'test',cards:[{analyses:[{text:'Finished original request.'}]}]})};};
  const evidence={subject:'Pending subject',subjectId:'pending',sectionId:'A',quarter:'all',grades:[80],assessments:[]};
  const old=document.querySelector('#insight');
  const first=refreshSubjectGradeInsight(old,evidence);
  old.remove();
  const next=document.createElement('p');next.id='insight';document.body.append(next);
  const second=refreshSubjectGradeInsight(next,evidence);
  release();await Promise.all([first,second]);
  return {calls,text:next.textContent};
 });
 assert.equal(inflight.calls,1);
 assert.equal(inflight.text,'Finished original request.');
 // Recreate the page/runtime to prove persisted results survive navigation/reload.
 await page.goto('http://sigma.test/student.html');
 await page.evaluate(() => {
  window.getLoggedInStudentUser=()=>({uid:'s1',section:'A'});
  window.renderSigmaAiText=text=>text;
  window.fetch=()=>{throw new Error('Unexpected regeneration on revisit');};
 });
 await page.addScriptTag({path:path.join(root,'js/ai-log-store.js')});
 await page.addScriptTag({path:path.join(root,'js/subject-grade-insights.js')});
 const restored=await page.evaluate(async()=>{
  await refreshSubjectGradeInsight(document.querySelector('#insight'),{subject:'Programming',subjectId:'p1',sectionId:'A',quarter:'all',grades:[90,null],assessments:[]});
  return document.querySelector('#insight').textContent;
 });
 assert.equal(restored,'Recorded grades reviewed. Review basic syntax.');
 const source=fs.readFileSync(path.join(root,'admin.html'),'utf8');
 const start=source.indexOf('<!-- AI Logs Table -->');
 await page.setContent('<section id="audit-ai-view"><div>'+source.slice(start,source.indexOf('</table>',start)+8)+'</div></section>');
 await page.evaluate(()=>localStorage.setItem('sigma-admin-users',JSON.stringify([{uid:'s1',firstName:'Student',lastName:'One',role:'Student'}])));
 for(const css of ['forms.css','shared-components.css','ai-log-details.css']) await page.addStyleTag({path:path.join(root,'css',css)});
 await page.addScriptTag({path:path.join(root,'js/ai-log-details.js')});
 await page.locator('table[aria-label="AI interaction logs"] .ai-log-interaction-button').first().click();
 assert.deepEqual(await page.locator('.ai-log-insight-table th').allTextContents(),['Source','Insight Message','Timestamp','Action']);
 assert.match(await page.locator('.ai-log-insight-table').textContent(),/Subject Grades.*Finished original request/s);
 await page.getByRole('button',{name:'Insight actions',exact:true}).click();
 assert.equal(await page.getByRole('button',{name:'Delete Log',exact:true}).count(),1);
 assert.equal(await page.getByRole('button',{name:'Remove Card',exact:true}).count(),0);
 await page.getByRole('button',{name:'View all AI logs for Student One',exact:true}).click();
 assert.equal(await page.locator('#ai-interaction-details-panel').isVisible(),false);
 assert.equal(await page.locator('#ai-user-details-panel').isVisible(),true);
 assert.equal(await page.locator('[data-category=all]').getAttribute('aria-pressed'),'true');
 assert.equal(await page.locator('#ai-user-details-panel input[type=search]').inputValue(),'');
 assert.equal(await page.locator('.ai-log-history-table th').last().textContent(),'Action');
 await page.getByRole('button',{name:'Log actions',exact:true}).first().click();
 assert.equal(await page.locator('#ai-user-details-panel .ai-log-message-menu:not([hidden])').count(),1);
 assert.match(await page.locator('#ai-user-details-panel .ai-log-message-menu:not([hidden])').textContent(),/Delete Log/);
 await page.keyboard.press('Escape');
 assert.equal(await page.locator('#ai-user-details-panel .ai-log-message-menu:not([hidden])').count(),0);
 await page.screenshot({path:path.join(process.env.TEMP,'sigma-grade-insight-log.png')});
 console.log('Grade insight generation, source records, persistent cache, navigation, changed evidence, failure suppression, empty evidence, and log detail table passed.');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

