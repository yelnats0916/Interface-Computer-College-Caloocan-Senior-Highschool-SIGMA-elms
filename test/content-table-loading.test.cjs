const assert=require('node:assert/strict');const {chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
for(const width of [1280,375]){
 const c=await browser.newContext({viewport:{width,height:800}});const p=await c.newPage();let release;
 await p.route('https://loader.test/**',r=>r.fulfill({contentType:'text/html',body:'<table style="width:100%"><thead><tr><th>No.</th><th>Name</th></tr></thead><tbody id="userTableBody"></tbody></table>'}));await p.goto('https://loader.test/admin.html');
 await p.addStyleTag({path:'css/content-loading.css'});await p.addScriptTag({path:'js/content-loading.js'});
 await p.evaluate(()=>{const b=document.querySelector('tbody');window.unrelated=SigmaContentLoading.beginDataRead('php/api/maintenance.php');window.finish1=SigmaContentLoading.beginDataRead('php/api/users.php');window.finish2=SigmaContentLoading.beginDataRead('php/api/users.php');b.innerHTML='<tr><td colspan="2">No accounts</td></tr>';});
 await p.waitForSelector('.sigma-table-loading-row');assert.equal(await p.locator('.sigma-dot-spinner').count(),1);assert.equal(await p.locator('.sigma-table-loading-row td').getAttribute('colspan'),'2');
 const bounds=await p.locator('.sigma-dot-spinner').boundingBox();assert(bounds.x>=0&&bounds.x+bounds.width<=width);
 await p.evaluate(()=>finish1());assert.equal(await p.locator('.sigma-dot-spinner').count(),1);await p.evaluate(()=>finish2());assert.equal(await p.locator('.sigma-dot-spinner').count(),0,'A slow unrelated request must not keep the table loading');await p.evaluate(()=>unrelated());
 await p.evaluate(()=>{document.querySelector('tbody').innerHTML='<tr><td>1</td><td>Teacher</td></tr>';window.done=SigmaContentLoading.beginDataRead('php/api/users.php');});assert.equal(await p.locator('.sigma-dot-spinner').count(),0);await p.evaluate(()=>done());
 // Exercise a fresh page's actual transport and cleanup on failure.
 await p.reload();await p.addStyleTag({path:'css/content-loading.css'});await p.addScriptTag({path:'js/content-loading.js'});await p.addScriptTag({path:'js/database-client.js'});
 await p.route('**/php/api/users.php',async r=>{await new Promise(resolve=>release=resolve);await r.fulfill({status:500,contentType:'application/json',body:'{"success":false,"error":"Fixture unavailable"}'});});
 await p.evaluate(()=>{window.read=SigmaDatabase.request('users',{autoReconnect:false}).catch(e=>e.message);});await p.waitForSelector('.sigma-dot-spinner');release();assert.equal(await p.evaluate(()=>read),'Fixture unavailable');assert.equal(await p.locator('.sigma-dot-spinner').count(),0);await c.close();
}
{
 const c=await browser.newContext({viewport:{width:375,height:700}}),p=await c.newPage();
 await p.goto('about:blank');await p.setContent('<table><thead><tr><th>Date</th><th>Status</th></tr></thead><tbody id="classroom-attendance-history-body"></tbody></table><div id="classroom-attendance-empty-state">No attendance</div>');
 await p.addStyleTag({path:'css/content-loading.css'});await p.addScriptTag({path:'js/content-loading.js'});
 await p.evaluate(()=>window.done=SigmaContentLoading.beginDataRead('https://fixture.test/php/api/academic_records.php?action=sync'));
 assert.equal(await p.locator('.sigma-dot-spinner').count(),1);assert.equal(await p.locator('#classroom-attendance-empty-state').isVisible(),false,'Empty state must not appear beneath loading row');
 await p.evaluate(()=>done());assert.equal(await p.locator('#classroom-attendance-empty-state').isVisible(),true);
 for(let i=0;i<3;i++){
  await p.evaluate(()=>{document.querySelector('tbody').outerHTML='<tbody id="classroom-attendance-history-body"></tbody>';window.done=SigmaContentLoading.beginDataRead('https://fixture.test/php/api/academic_records.php?action=sync');});
  assert.equal(await p.locator('.sigma-dot-spinner').count(),0,'Background polling must not reintroduce a spinner for an empty or rebuilt table');await p.evaluate(()=>done());
 }
 await c.close();
}
const c=await browser.newContext(),p=await c.newPage();await p.route('https://auth-retry.test/**',r=>r.fulfill({contentType:'text/html',body:'<body></body>'}));await p.goto('https://auth-retry.test/index.html');await p.addScriptTag({path:'js/database-client.js'});
let calls=0;await p.route('**/php/api/auth.php',r=>{calls++;return r.fulfill(calls===1?{status:503,contentType:'text/html',body:'<h1>Service Unavailable</h1>The server is temporarily unable to service your request due to capacity problems.'}:{contentType:'application/json',body:'{"success":true,"challenge":"fixture","otpauth_url":"otpauth://fixture"}'});});
const data=await p.evaluate(()=>SigmaDatabase.request('auth',{authentication:true,autoReconnect:false,data:{action:'reset_own_2fa',id:'fixture'}}));assert.equal(data.challenge,'fixture');assert.equal(calls,2);
calls=0;await p.route('**/php/api/auth.php',r=>{calls++;return r.fulfill({status:503,contentType:'application/json',body:'{"success":false,"error":"Service unavailable"}'});});await p.evaluate(()=>SigmaDatabase.request('auth',{authentication:true,data:{action:'reset_own_2fa',id:'fixture'}}).catch(()=>{}));assert.equal(calls,1,'Never replay an application reset failure');
await c.close();console.log('PASS desktop/mobile table loaders, single spinner, real read lifecycle, overlapping reads, cleanup on failure, populated refresh preserved, pre-PHP capacity retry only.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
