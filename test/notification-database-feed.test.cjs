const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('js/notification-database.js','utf8');
async function run(role){
 const store=new Map([['sigma-notifications-'+role+'-v3',JSON.stringify([{id:'wrong-account',read:true}])]]);
 let click;const reads=[];let result=[{id:'own',serverRecordId:'server-own',recipients:[{id:'owner'}],read:false}];
 const ctx={
  window:{SigmaNotifications:{sendToRole(){},getLogs:()=>[],renderFeed(){}},SigmaDatabase:{currentUser:()=>({id:'owner',role}),request:async(endpoint,input={})=>{if(input.data?.action==='read'){reads.push(input.data.id);return{success:true}}return{records:result}}},addEventListener(){},dispatchEvent(){}},
  document:{hidden:false,readyState:'loading',getElementById:()=>null,addEventListener(name,handler){if(name==='click')click=handler}},
  localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},
  MutationObserver:class{},Event:class{},setInterval(){},setTimeout:fn=>fn(),console
 };
 vm.runInNewContext(source,ctx);await ctx.window.SigmaNotifications.refreshLogs();
 let feed=JSON.parse(store.get('sigma-notifications-'+role+'-v3'));assert.equal(feed.length,1);assert.equal(feed[0].id,'own');assert.equal(feed[0].read,false);
 feed[0].read=true;store.set('sigma-notifications-'+role+'-v3',JSON.stringify(feed));click();await Promise.resolve();assert.deepEqual(reads,['server-own']);
 result=[];await ctx.window.SigmaNotifications.refreshLogs();assert.equal(JSON.parse(store.get('sigma-notifications-'+role+'-v3')).length,0,'Unassigned recipients cannot linger from browser cache');
}
(async()=>{for(const role of ['admin','teacher','student'])await run(role);console.log('PASS all roles use their authenticated database feed; stale notifications from another account or assignment are removed.');})().catch(e=>{console.error(e);process.exitCode=1});
