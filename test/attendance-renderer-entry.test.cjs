const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const teacher=fs.readFileSync('js/teacher.js','utf8'),a=teacher.indexOf('    function renderClassroomAttendanceTab('),b=teacher.indexOf('\n    function ',a+20);
const calls=[],context={window:{renderClassroomAttendanceTab:slide=>{calls.push(slide);return 'current';}}};
vm.runInNewContext(teacher.slice(a,b),context);
assert.equal(context.renderClassroomAttendanceTab(true),'current');assert.equal(context.renderClassroomAttendanceTab(false),'current');assert.deepEqual(calls,[true,false]);
assert(!teacher.slice(a,b).includes('innerHTML'));
const shared=fs.readFileSync('js/classroom-room.js','utf8');assert(shared.includes('onclick="window.openAttendanceTransferMenu(this)"'));assert(shared.includes('line-height:16px;">Import / Export</span>'));
console.log('PASS initial teacher route and refresh delegate to shared attendance renderer; no legacy table markup.');
