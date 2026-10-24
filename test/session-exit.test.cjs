const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 for(const width of [1440,375])for(const role of ['Admin','Teacher','Student']){
  const context=await browser.newContext({viewport:{width,height:800}}),page=await context.newPage();let expired=false,logoutHeaders=[];
  const token='a'.repeat(64),portal=role.toLowerCase()+'.html';
  await page.addInitScript(({token,role})=>{if(!location.pathname.endsWith('index.html')){sessionStorage.setItem('sigma-authenticated-user',JSON.stringify({id:'101',role}));sessionStorage.setItem('sigma-grade-sync-session',JSON.stringify({token,userId:'101'}));}}, {token,role});
  await page.route('http://session.test/**',async route=>{
   const pathname=new URL(route.request().url()).pathname;
   if(pathname.endsWith('slow.php')){await new Promise(r=>setTimeout(r,1500));return route.fulfill({json:{success:true,records:[]}}).catch(()=>{});}
   if(pathname.endsWith('session.php')){
    if(route.request().method()==='POST'){logoutHeaders.push(route.request().headers().authorization);await new Promise(r=>setTimeout(r,800));return route.fulfill({json:{success:true}}).catch(()=>{});}
    return route.fulfill({status:expired?401:200,json:expired?{success:false,error:'Sign in again.',code:'authentication_required'}:{success:true,user:{id:'101',role}}});
   }
   if(pathname.startsWith('/js/'))return route.fulfill({contentType:'text/javascript',body:fs.readFileSync('.'+pathname,'utf8')});
   return route.fulfill({contentType:'text/html',body:'<html><head><script src="js/database-client.js"></script><script src="js/tab-session.js"></script></head><body><main>Landing page</main><a class="profile-logout-btn" href="index.html">Logout</a></body></html>'});
  });
  await page.goto('http://session.test/'+portal);await page.waitForFunction(()=>SigmaSessionNavigation.isVerified());
  // An unfinished background request must never delay sign-out or lose authorization.
  await page.evaluate(()=>{SigmaDatabase.request('slow').catch(()=>{});});
  const start=Date.now();await page.locator('.profile-logout-btn').click();await page.waitForURL('**/index.html');assert(Date.now()-start<800,'Sign-out waited for the server');
  assert.equal(await page.locator('#sigma-session-status').count(),0);assert.equal(await page.evaluate(()=>sessionStorage.getItem('sigma-grade-sync-session')),null);assert.equal(await page.evaluate(()=>sessionStorage.getItem('sigma-skip-login-recovery')),'true');
  await page.waitForTimeout(950);assert(logoutHeaders.length>0);assert(logoutHeaders.every(header=>header==='Bearer '+token));
  await page.goto('http://session.test/'+portal);await page.waitForFunction(()=>SigmaSessionNavigation.isVerified());expired=true;await page.evaluate(()=>SigmaSessionNavigation.recheck());await page.waitForURL('**/index.html');assert.equal(await page.evaluate(()=>sessionStorage.getItem('sigma-grade-sync-session')),null);
  await context.close();
 }
 const context=await browser.newContext(),page=await context.newPage();
 await page.route('https://**/*',route=>route.abort());
 await page.route('http://startup.test/**',route=>{const pathname=new URL(route.request().url()).pathname.slice(1);if(pathname==='admin.html')return route.fulfill({contentType:'text/html',body:fs.readFileSync('admin.html')});if(pathname.endsWith('.css'))return route.fulfill({contentType:'text/css',body:fs.readFileSync(pathname)});return route.fulfill({contentType:'text/javascript',body:''});});
 await page.goto('http://startup.test/admin.html#nav-audit-notifications');assert.equal(await page.locator('#admin-main').evaluate(e=>getComputedStyle(e,'::before').display),'block');assert.equal(await page.locator('#admin-main').evaluate(e=>getComputedStyle(e,'::before').height),'300px');await context.close();
 console.log('PASS desktop/mobile sign-out for all three roles: immediate landing, captured server token, no white spinner screen; remote revocation; refresh placeholder.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
