const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('js/classroom-room.js','utf8');
const helper=source.slice(source.indexOf('    function isStudentAttendancePortal()'),source.indexOf('    function saveCurrentAttendanceStatuses('));
const renderer=source.slice(source.indexOf('    function renderClassroomAttendanceTab('),source.indexOf('    window.renderClassroomAttendanceTab ='));
for(const [pathname,role,expected] of [['/student.html','Student',true],['/student.html','',true],['/teacher.html','Teacher',false],['/admin.html','Master Admin',false]]){
 let touches=0;const ctx={window:{location:{pathname},SigmaDatabase:{currentUser:()=>({role})}},document:{getElementById(){touches++;return null}}};vm.runInNewContext(helper+renderer,ctx);ctx.renderClassroomAttendanceTab(false);assert.equal(touches,expected?0:1,pathname+' shared teacher renderer must not replace student history');
 if(expected){for(const marker of ['window.submitDailyAttendance = async function','window.setAttendanceStatus = function','window.enableDailyAttendanceEdit = function']){const start=source.indexOf(marker),guard=source.indexOf('if (isStudentAttendancePortal()) return;',start);assert(guard>start&&guard<start+180);}}
}
assert(fs.readFileSync('js/student.js','utf8').includes("renderAttendanceHistoryTable('classroom-attendance-history-body'"));
console.log('PASS students retain their own history on attendance refresh; teacher/admin renderer remains connected; student marking, editing and submission are guarded.');
