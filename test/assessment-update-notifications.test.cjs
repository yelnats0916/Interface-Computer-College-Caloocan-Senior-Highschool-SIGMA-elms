const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../js/notifications.js'),'utf8');
const c={Date};vm.createContext(c);vm.runInContext(source.slice(source.indexOf('    function assessmentReleaseNotice'),source.indexOf('    function notifyAssessmentContentUpdate')),c);
const now=Date.parse('2026-10-15T08:00:00Z'),notice=(a,b)=>c.assessmentReleaseNotice(a,b,'a',{id:'a',title:'Task'},now);
const draft={releasedMaterialIds:[]},released={releasedMaterialIds:['a'],assessmentMaxScores:{a:100},assessmentEndSchedules:{a:'2026-10-20T08:00:00Z'}};
assert.equal(notice(draft,draft),null);
assert.equal(notice({},released).title,'New Assessment Released');
assert.equal(notice(released,JSON.parse(JSON.stringify(released))),null);
assert.equal(notice({}, {...released,assessmentSchedules:{a:'2026-10-20T00:00:00Z'}}),null);
assert.ok(notice(released,{...released,assessmentMaxScores:{a:90}}).changes.includes('points'));
assert.ok(notice(released,{...released,assessmentEndSchedules:{a:'2026-10-22T00:00:00Z'}}).changes.includes('due date'));
assert.equal(notice(released,{...released,uiExpanded:true}),null);
console.log('PASS: release wording, draft/scheduled silence, unchanged saves, due-date and points updates.');


const sent=[];
c.window={getAssessmentReleaseConfig:()=>released,getEffectiveTeacher:()=>({id:'teacher',name:'Maria'}),SigmaNotifications:{sendToRole:(role,notification)=>sent.push(notification)}};
vm.runInContext(source.slice(source.indexOf('    function notifyAssessmentContentUpdate'),source.indexOf('    function recordNotificationLog')),c);
const before={id:'a',title:'Task',description:'Read the notes',fileName:'task.pdf',fileUrl:'/task.pdf'};
c.notifyAssessmentContentUpdate(before,{...before,description:'Read   the notes'},'prog','Rizal');assert.equal(sent.length,0);
c.notifyAssessmentContentUpdate(before,{...before,description:'Read the notes and answer questions 1–5'},'prog','Rizal');assert.equal(sent.length,1);assert.equal(sent[0].title,'Assessment Updated');assert.match(sent[0].body,/instructions/);
c.window.getAssessmentReleaseConfig=()=>draft;
c.notifyAssessmentContentUpdate(before,{...before,fileName:'changed.pdf'},'prog','Rizal');assert.equal(sent.length,1);
console.log('PASS: content updates identify instructions; formatting-only and draft changes stay silent.');
