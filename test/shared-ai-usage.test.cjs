const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 for(const width of [1440,375])for(const auditAccess of [true,false]){
  const page=await browser.newPage({viewport:{width,height:800}});await page.clock.install();let count=2005,calls=0;
  await page.route('http://usage.test/**',route=>{if(!route.request().url().includes('/php/api/'))return route.fulfill({contentType:'text/html',body:'<section id="dashboard-view"></section>'});calls++;const today=new Date().toISOString(),usageLogs=Array.from({length:count},(_,i)=>({id:'request-'+i,generationId:'request-'+i,feature:['sigmabot','quiz','analytics','grade_insights','submission_evaluation','submission_feedback'][i%6],provider:'groq',timestamp:today,status:'Success',tokens:20}));return route.fulfill({json:{success:true,...(auditAccess?{logs:usageLogs.slice(0,2),usageLogs}:{logs:usageLogs,usageOnly:true})}});});
  await page.goto('http://usage.test/admin.html');await page.evaluate(auditAccess=>{
   sessionStorage.setItem('sigma-authenticated-user',JSON.stringify({id:'admin',role:'Admin'}));window.canViewAuditLog=()=>auditAccess;
   window.SigmaDatabase={fetch:(input,options)=>fetch(input,options),readJson:r=>r.json(),preserveLegacy:()=>{}};
  },auditAccess);
  await page.addScriptTag({content:fs.readFileSync('js/ai-database-store.js','utf8')});
  const src=fs.readFileSync('js/ai-routing-settings.js','utf8'),start=src.indexOf('window.getAiUsageSnapshot ='),end=src.indexOf('\n    window.renderAiSettingsUsage',start);await page.addScriptTag({content:src.slice(start,end)});
  await page.waitForFunction(()=>SigmaAiDatabase.logsReady());assert.equal(await page.evaluate(()=>getAiUsageSnapshot('groq','weekly').logs.length),2005,'Usage must not be limited by audit pagination');assert.equal(await page.evaluate(()=>new Set(getAiUsageSnapshot('groq','weekly').logs.map(r=>r.feature)).size),6);
  count=2006;await page.clock.fastForward(31000);await page.waitForFunction(()=>getAiUsageSnapshot('groq','weekly').logs.length===2006);assert(calls>=2,'Remote activity refreshes without reloading the page');assert.equal(await page.evaluate(()=>getAiUsageSnapshot('gemini','weekly').logs.length),0);await page.close();
 }
 console.log('PASS shared usage on desktop/mobile with and without audit-log permission: all six feature types, 2005 records beyond audit limit, provider filters and automatic remote-request refresh.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
