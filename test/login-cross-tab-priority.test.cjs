const fs=require('fs'),assert=require('node:assert/strict');const{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
for(const correct of [false,true]){
const c=await browser.newContext();let order=[],active=0,maximum=0,release;const gate=new Promise(r=>release=r);
await c.route('https://auth.test/**',async r=>{const u=new URL(r.request().url());if(!u.pathname.includes('/php/api/'))return r.fulfill({contentType:'text/html',body:'<html><body></body></html>'});active++;maximum=Math.max(maximum,active);order.push(u.pathname.split('/').pop());if(u.pathname.endsWith('subjects.php'))await gate;active--;return r.fulfill({status:u.pathname.endsWith('session.php')&&!correct?401:200,contentType:'application/json',body:JSON.stringify(u.pathname.endsWith('session.php')?correct?{success:true,user:{id:'t1'}}:{success:false,code:'wrong_password',error:'Wrong password.'}:{success:true,records:[]})});});
const portal=await c.newPage(),login=await c.newPage();await portal.goto('https://auth.test/teacher.html');await login.goto('https://auth.test/index.html');for(const p of [portal,login])await p.addScriptTag({path:'js/database-client.js'});
await portal.evaluate(()=>{window.first=SigmaDatabase.request('subjects');window.second=SigmaDatabase.request('school_years');});
await login.evaluate(()=>{window.signin=SigmaDatabase.request('session',{authentication:true,autoReconnect:false,data:{action:'credentials',login:'t1',password:'test'}}).then(r=>({ok:true,result:r}),e=>({ok:false,code:e.code}));});
await login.waitForFunction(()=>!!localStorage.getItem('sigma-login-request-priority'));release();const result=await login.evaluate(()=>signin);await portal.evaluate(()=>Promise.all([first,second]));
assert.deepEqual(order,['subjects.php','session.php','school_years.php']);assert.equal(maximum,1);assert.equal(result.ok,correct);if(!correct)assert.equal(result.code,'wrong_password');assert.equal(await login.evaluate(()=>localStorage.getItem('sigma-login-request-priority')),null);await c.close();
}
console.log('PASS valid and wrong-password attempts get priority across real browser tabs; no simultaneous PHP requests, no duplicate checks, background reads resume.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
