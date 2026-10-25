const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('js/classroom-room.js','utf8');
const clock=source.slice(source.indexOf('    function getTodayLocalDateString()'),source.indexOf('    function normalizeAttendanceTokens'));
const DateAt=time=>class extends Date {constructor(...args){super(...(args.length?args:[time]));}};
for(const [time,today] of [['2026-10-25T15:59:00Z','2026-10-25'],['2026-10-25T16:01:00Z','2026-10-26']]){
 const context={window:{},Intl,Date:DateAt(time)};vm.runInNewContext(clock,context);
 assert.equal(context.getTodayLocalDateString(),today);assert.equal(context.window.isFutureAttendanceDate('2026-10-27'),true);assert.equal(context.window.isFutureAttendanceDate(today),false);
}
const context={window:{isFutureAttendanceDate:date=>date==='2026-10-26'},isStudentAttendancePortal:()=>false};
for(const [start,end] of [
 ['    function saveCurrentAttendanceStatuses(', '    window.saveCurrentAttendanceStatuses'],
 ['    window.setAttendanceStatus =','    window.goToTodayAttendance'],
 ['    window.submitDailyAttendance = async','    window.getAttendanceRecordAcademicContext'],
 ['    window.enableDailyAttendanceEdit =','    window.cancelDailyAttendanceEdit =']
]){
 const a=source.indexOf(start),b=source.indexOf(end,a);assert(a>=0&&b>a);
 vm.runInNewContext(source.slice(a,b),context);
}
context.getActiveRoomSectionName=()=>'';context.getActiveRoomSubjectName=()=>'';context.getActiveRoomClassroomKey=()=> 'scope';
context.saveCurrentAttendanceStatuses({},'2026-10-26');
context.window.setAttendanceStatus('Student','2026-10-26','P');
context.window.enableDailyAttendanceEdit('2026-10-26');
Promise.resolve(context.window.submitDailyAttendance('2026-10-26')).then(()=>console.log('PASS Philippine midnight boundary and future draft, mark, edit and submit guards.'));

