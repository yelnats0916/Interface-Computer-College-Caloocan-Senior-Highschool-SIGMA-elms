const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('js/tab-session.js', 'utf8');
function storage() { const m = new Map(); return { getItem:k=>m.get(k)??null, setItem:(k,v)=>m.set(k,String(v)), removeItem:k=>m.delete(k), clear:()=>m.clear() }; }
function create(path, role, mode = 'valid') {
 const events = {}, redirects = [], attrs = new Set(), sessionStorage=storage(), localStorage=storage();
 const root = { hasAttribute:k=>attrs.has(k), toggleAttribute(k,on){if(on)attrs.add(k);else attrs.delete(k);} };
 function element(){return {children:[],setAttribute(){},addEventListener(){},appendChild(c){this.children.push(c);},replaceChildren(){this.children=[];},remove(){this.removed=true;}};}
 const body=element(), head=element();
 const document={head,body,documentElement:root,baseURI:'http://localhost/sigma-elms/'+path,addEventListener(){},getElementById:id=>body.children.find(c=>!c.removed&&c.id===id)||null};
 document.createElement=element;
 if(role){sessionStorage.setItem('sigma-authenticated-user',JSON.stringify({id:'real-session-identity',role}));sessionStorage.setItem('sigma-grade-sync-session',JSON.stringify({token:'test-memory-token',userId:'real-session-identity'}));}
 let calls=0;
 const window={location:{replace:url=>redirects.push(url)},addEventListener:(n,fn)=>events[n]=fn,dispatchEvent(){},SigmaDatabase:{async request(){calls++; if(mode==='expired')throw Object.assign(new Error('Expired'),{status:401}); if(mode==='offline')throw new Error('Unavailable'); return {user:{id:'real-session-identity',role}};}}};
 vm.runInNewContext(source,{window,document,location:{pathname:'/sigma-elms/'+path},sessionStorage,localStorage,URL,Promise,Event:class{},CustomEvent:class{}});
 return {events,redirects,attrs,sessionStorage,calls:()=>calls};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
 let s=create('teacher.html',null); await flush(); assert.match(s.redirects[0],/index.html$/); assert.equal(s.calls(),0);
 s=create('index.html',null); await flush(); assert.equal(s.redirects.length,0);
 for(const [role,portal] of [['Teacher','teacher.html'],['Student','student.html'],['Master Admin','admin.html']]){
  s=create('index.html',role); await flush(); assert.ok(s.redirects[0].endsWith(portal));
  s=create(portal,role); await flush(); assert.equal(s.redirects.length,0); assert.equal(s.attrs.size,0);
  s.events.pagehide(); assert.equal(s.attrs.size,1); s.sessionStorage.clear(); s.events.pageshow({persisted:true}); await flush(); assert.match(s.redirects.at(-1),/index.html$/);
 }
 s=create('student.html','Student','expired');await flush();assert.match(s.redirects[0],/index.html$/);assert.equal(s.sessionStorage.getItem('sigma-grade-sync-session'),null);
 s=create('index.html','Student','expired');await flush();assert.equal(s.redirects.length,0);assert.equal(s.sessionStorage.getItem('sigma-grade-sync-session'),null);
 s=create('teacher.html','Teacher','offline');await flush();assert.equal(s.attrs.size,1);assert.equal(s.redirects.length,0);
 s=create('student.html','Student');s.sessionStorage.clear();await flush();assert.match(s.redirects[0],/index.html$/);
 console.log('Session navigation checks passed: login/portal routing, all roles, logout history restore, expiry, outage and logout during verification. No network or database writes.');
})().catch(e=>{console.error(e);process.exitCode=1;});
