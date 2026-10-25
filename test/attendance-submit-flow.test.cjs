const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('js/classroom-room.js','utf8');
const a=source.indexOf('    window.submitDailyAttendance = async'),b=source.indexOf('    window.viewDailyAttendance',a);
async function submission(success){
 const saved=[],notices=[];let release;const barrier=new Promise((resolve,reject)=>release=()=>success?resolve({record:{submittedAt:'2026-10-25T01:00:00Z'}}):reject(Error('Save failed')));
 const button={disabled:false,innerHTML:'Submit',setAttribute(){},removeAttribute(){}};
 const context={window:{SigmaAttendance:{submit:async input=>{assert.equal(input.submitted,true);assert.deepEqual(Object.keys(input.statuses),['100']);return barrier;}},attendanceEditingDays:{},showToastNotification:(...args)=>notices.push(args)},document:{querySelectorAll:()=>[button]},getCurrentAttendanceStatuses:()=>({'Maya Rivera':'P'}),getCurrentAttendanceExcuses:()=>({}),getActiveRoomSectionName:()=> 'Einstein',getActiveRoomSubjectName:()=> 'Oral Communication',getAttendanceStudents:()=>[{id:'100',name:'Maya Rivera'},{id:'101',name:'Noah Cruz'}],studentNamesMatch:(a,b)=>a===b,attendanceEditingDays:{},saveCurrentAttendanceStatuses:(...args)=>saved.push(args),Date,Map};
 vm.runInNewContext(source.slice(a,b),context);
 const pending=context.window.submitDailyAttendance('2026-10-25');assert.equal(saved.length,0);assert.equal(button.disabled,true);await context.window.submitDailyAttendance('2026-10-25');assert.equal(saved.length,0);release();await pending;
 assert.equal(button.disabled,false);assert.equal(button.innerHTML,'Submit');assert.equal(saved.length,success?1:0);assert.equal(notices.at(-1)[1],success?'success':'error');if(success)assert.equal(saved[0][3].submitted,true);
}
(async()=>{await submission(true);await submission(false);
 const start=source.indexOf('    function saveCurrentAttendanceStatuses('),end=source.indexOf('    window.saveCurrentAttendanceStatuses',start);let sourceKey;const store=new Map();
 const ctx={window:{SigmaDatabase:{currentUser:()=>({id:'teacher'})},dispatchEvent(){}},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},getStoredJson:(k,f)=>store.has(k)?JSON.parse(store.get(k)):f,attendanceDraftKey:()=> 'draft:teacher',getActiveRoomSectionName:()=> 'Einstein',getActiveRoomSubjectName:()=> 'Oral Communication',getActiveRoomClassroomKey:()=> 'Einstein::Oral Communication',getCurrentAttendanceExcuses:()=>({}),refreshAttendanceRecords(){},findAttendanceClassroomRecord:()=>({key:null,data:{}}),attendanceRecordsByClassroom:{},SHARED_ATTENDANCE_RECORDS_KEY:'published',Date,Set,CustomEvent:function(){}};
 vm.runInNewContext(source.slice(start,end),ctx);ctx.saveCurrentAttendanceStatuses({'100':'P'},'2026-10-25');assert(!store.has('published'),'Clicking a mark must not change published records');assert(store.has('draft:teacher'));
 console.log('PASS click is private draft; Submit waits for acknowledgement; failure retains draft; duplicate submit blocked; unmarked omitted; success only after database confirmation.');
})().catch(e=>{console.error(e);process.exitCode=1});
