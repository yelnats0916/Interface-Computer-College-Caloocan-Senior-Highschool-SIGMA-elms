const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 let stored=[],reads=new Set();
 for(const width of [1440,375]){
  const contexts=[];
  const make=async(id,role)=>{
   const page=await browser.newPage({viewport:{width,height:800}});contexts.push(page);await page.clock.install();
   await page.route('http://audit.test/**',async route=>{
    const url=new URL(route.request().url());if(!url.pathname.includes('php/api/'))return route.fulfill({contentType:'text/html',body:'<div id="notificationsPanel"></div>'});
    const input=route.request().method()==='POST'?route.request().postDataJSON():{};let result={success:true,records:[]};
    if(input.action==='send'){stored.push({id:'server-'+stored.length,notificationId:input.notification.id,role:input.role,title:input.notification.title,senderId:id,senderName:'Teacher '+id,timestamp:'2026-10-25T00:17:00Z',recipients:[{id:'student-1',name:'Student One'}]});}
    else if(input.action==='read')reads.add(id+'|'+input.id);
    else if(input.action==='delete')stored=stored.filter(row=>row.id!==input.id);
    else if(url.searchParams.get('view')==='logs')result.records=stored;
    else result.records=role==='student'?stored.map(row=>({id:row.notificationId,serverRecordId:row.id,title:row.title,read:false,timestamp:row.timestamp})):[];
    return route.fulfill({json:result});
   });
   await page.goto('http://audit.test/'+role+'.html');await page.evaluate(({id,role})=>{
    window.canViewAuditLog=()=>true;window.SigmaDatabase={currentUser:()=>({id,role}),request:async(name,options={})=>{const url=new URL('http://audit.test/php/api/'+name+'.php');for(const [k,v]of Object.entries(options.query||{}))url.searchParams.set(k,v);return (await fetch(url,{method:options.data?'POST':'GET',...(options.data?{body:JSON.stringify(options.data)}:{})})).json();}};
    window.SigmaNotifications={sendToRole:()=>{},getLogs:()=>[],renderFeed:()=>{}};
   },{id,role});await page.addScriptTag({content:fs.readFileSync('js/notification-database.js','utf8')});return page;
  };
  const teacher=await make('teacher-'+width,'teacher'),admin=await make('admin-'+width,'admin'),student=await make('student-1','student');
  await teacher.evaluate(()=>SigmaNotifications.sendToRole('student',{id:'event-'+innerWidth,title:'An actual class update'}));await admin.evaluate(()=>SigmaNotifications.refreshLogs());assert((await admin.evaluate(()=>SigmaNotifications.getLogs())).some(log=>log.senderId==='teacher-'+width));
  await student.evaluate(()=>SigmaNotifications.refreshLogs());const record=await student.evaluate(()=>{const key='sigma-notifications-student-v3',feed=JSON.parse(localStorage.getItem(key));feed[0].read=true;localStorage.setItem(key,JSON.stringify(feed));document.dispatchEvent(new MouseEvent('click'));return feed[0].serverRecordId;});await student.clock.runFor(1);await student.waitForTimeout(30);assert(reads.has('student-1|'+record));
  await admin.addScriptTag({content:fs.readFileSync('js/audit-display.js','utf8')});assert.match(await admin.evaluate(()=>SigmaAuditDisplay.date('2026-10-25T00:17:00Z')),/8:17 AM/);
  for(const page of contexts)await page.close();
 }
 const audit=await browser.newPage();await audit.route('http://history.test/**',r=>r.fulfill({contentType:'text/html',body:'<section id="audit-auth-view"></section><section id="audit-activity-view"></section>'}));await audit.goto('http://history.test/admin.html');
 await audit.evaluate(()=>{
  window.canViewAuditLog=()=>true;window.eventCount=8;
  localStorage.setItem('sigma-authentication-logs-v1',JSON.stringify([{id:'browser-duplicate',userId:'one',event:'Login successful',timestamp:'2026-10-25T02:17:00Z'}]));
  window.SigmaDatabase={currentUser:()=>({id:'admin'}),request:async endpoint=>({success:true,records:Array.from({length:window.eventCount},(_,i)=>({id:'server-'+i,userId:'user-'+i,userName:'User '+i,userRole:i%2?'Student':'Teacher',timestamp:'2026-10-25T00:17:00Z',event:'Login successful',activity:'Saved work'}))})};
 });
 for(const file of ['audit-display','authentication-logs','activity-logs'])await audit.addScriptTag({content:fs.readFileSync('js/'+file+'.js','utf8')});
 await audit.evaluate(()=>Promise.all([SigmaAuthenticationLogs.refresh(),SigmaActivityLogs.refresh()]));assert.equal(await audit.evaluate(()=>SigmaAuthenticationLogs.records().length),8);assert.equal(await audit.evaluate(()=>SigmaActivityLogs.getLogs().length),8);assert.equal(await audit.evaluate(()=>SigmaAuthenticationLogs.records().some(r=>r.id==='browser-duplicate')),false);
 await audit.evaluate(()=>{eventCount=9;window.dispatchEvent(new Event('focus'));});await audit.waitForFunction(()=>SigmaAuthenticationLogs.records().length===9&&SigmaActivityLogs.getLogs().length===9);await audit.close();
 console.log('PASS shared notification creation, admin visibility from a separate device, authenticated recipient read receipts and Manila timestamp rendering on desktop/mobile.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
