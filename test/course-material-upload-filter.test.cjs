const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('js/quiz-creator.js','utf8');
const start=source.indexOf('window.getRealCourseMaterials = function () {');
const end=source.indexOf('let borrowedMaterialsSet',start);
const local=new Map();
const context={window:{},location:{href:'https://sigma.test/quiz-creator.html'},localStorage:{getItem:key=>local.get(key)||null},URL,console};
context.window.DATA={subjects:[{id:'seed',materials:[{id:'seed',title:'Static lesson',fileUrl:'/uploads/static.pdf'}]}]};
vm.createContext(context);vm.runInContext(source.slice(start,end),context);
const get=()=>Object.values(context.window.getRealCourseMaterials());
assert.equal(get().length,0,'Static page data is not an uploaded lesson');
const subject={id:'english',code:'ENG',name:'English',authorName:'Admin One',materials:[
    {id:'empty',title:'Empty lesson',type:'Lesson'},
    {id:'name-only',title:'File name only',fileName:'guide.pdf',type:'Lesson'},
    {id:'placeholder',title:'Placeholder',url:'#',type:'Lesson'},
    {id:'device',title:'Temporary file',url:'blob:https://sigma.test/123',type:'Lesson'},
    {id:'admin',title:'Uploaded admin guide',fileUrl:'/uploads/admin-guide.pdf',type:'Lesson'},
    {id:'teacher',title:'Uploaded teacher guide',authorName:'Teacher One',attachments:[{url:'/uploads/teacher-guide.docx'}],type:'Lesson'},
    {id:'quiz',title:'Quiz',fileUrl:'/uploads/quiz.pdf',type:'Quiz'},
    {id:'deleted',title:'Removed guide',fileUrl:'/uploads/deleted.pdf',isDeleted:true,type:'Lesson'}
]};
local.set('sigma-admin-subjects',JSON.stringify([subject]));
assert.deepEqual(get().map(item=>item.title),['Uploaded admin guide','Uploaded teacher guide']);
assert.equal(get()[1].sourceMaterial.fileUrl,'/uploads/teacher-guide.docx','Borrowing uses the real attachment');
context.window._dbCourseSubjects=[];
assert.equal(get().length,0,'Empty database response hides stale browser-only materials');
context.window._dbCourseSubjects=[subject];
assert.deepEqual(get().map(item=>item.title),['Uploaded admin guide','Uploaded teacher guide']);
context.window._dbCourseSubjects=[{...subject,materials:[]}];
assert.equal(get().length,0,'Removing uploads from a saved lesson removes the picker entry');
console.log('PASS uploaded lesson filtering: real files and attachments only, no empty titles/filenames, temporary URLs, assessments, static fixtures or stale device entries.');
