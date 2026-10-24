const fs=require('fs'),assert=require('node:assert/strict');const{chromium}=require('playwright');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});try{
for(const role of ['teacher','student'])for(const mobile of [false,true]){
 const c=await b.newContext(mobile?{viewport:{width:390,height:844},isMobile:true}:{}),p=await c.newPage();
 await c.route('https://classes.test/**',r=>r.fulfill({contentType:'text/html',body:'<html></html>'}));await p.goto('https://classes.test/'+role+'.html');
 await p.evaluate(role=>{window.user={id:'u1',role};window.calls=0;window.reply={ownerId:'u1',sections:[{id:'s1'}],subjects:[{id:'sub1'}]};window.SigmaDatabase={currentUser:()=>user,request:async(name)=>{calls++;if(name!==role+'_classrooms')throw Error('Wrong endpoint');if(window.fail)throw Error('offline');return structuredClone(reply);}};window.events=[];addEventListener('sigma:section-deployed',()=>events.push('loaded'));},role);
 await p.addScriptTag({path:'js/teacher-classroom-sync.js'});await p.waitForFunction(()=>localStorage.getItem('sigma-admin-sections'));
 assert.deepEqual(await p.evaluate(()=>JSON.parse(localStorage.getItem('sigma-admin-sections'))),[{id:'s1'}]);
 await p.evaluate(async()=>{fail=true;await SigmaAssignedClassrooms.refresh(true);});assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('sigma-admin-sections')).length),1);
 await p.evaluate(async()=>{fail=false;reply={ownerId:'u1',sections:[],subjects:[]};await SigmaAssignedClassrooms.refresh(true);});assert.deepEqual(await p.evaluate(()=>JSON.parse(localStorage.getItem('sigma-admin-sections'))),[]);
 await p.evaluate(async()=>{reply={ownerId:'someone-else',sections:[{id:'forbidden'}],subjects:[]};await SigmaAssignedClassrooms.refresh(true);});assert.deepEqual(await p.evaluate(()=>JSON.parse(localStorage.getItem('sigma-admin-sections'))),[]);
 await c.close();
}
console.log('PASS teacher/student on clean desktop/mobile: database bootstrap, correct endpoint, offline preservation, revoked assignments removed and owner mismatch rejected.');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
