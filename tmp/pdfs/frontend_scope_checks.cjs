const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
let checks = 0;
const check = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
const resources = fs.readFileSync('js/resources-view.js', 'utf8');
const users = [{id:'s1',fullName:'First Student'}, {id:'s2',fullName:'Other Student'}];
const sections = [{name:'Rizal',students:['s1']}, {name:'Other',students:['s2']}];
const context = {
  window: {
    getTeacherAssignedSubjectsAndSections: () => [{subject:'Programming',sectionName:'Rizal'}],
    getLoggedInTeacherUser: () => ({id:'t1'}),
    isSectionAssignedToStudent: (section, student) => section.students.includes(student.id)
  },
  localStorage: {getItem: key => JSON.stringify(key === 'sigma-admin-users' ? users : sections)},
  resourceIsSubmission: item => !!item.isStudentSubmission,
  formatFirstLastName: value => value
};
vm.createContext(context);
vm.runInContext(resources.slice(resources.indexOf('    function resourceIsOwned'),resources.indexOf('    function isMobileResourcesViewport')),context);
const viewer={teacher:true,user:{id:'t1'}};
check(context.resourceInViewerClass({subject:'Programming',section:'Rizal',isStudentSubmission:true},viewer),true,'Assigned section submission');
check(context.resourceInViewerClass({subject:'Programming',section:'Other',isStudentSubmission:true},viewer),false,'Other section must be excluded');
check(context.resourceInViewerClass({subject:'Programming',studentId:'s1',isStudentSubmission:true},viewer),true,'Resolve student roster when section metadata is absent');
check(context.resourceInViewerClass({subject:'Programming',studentId:'s2',isStudentSubmission:true},viewer),false,'Unassigned student must be excluded');
check(context.resourceInViewerClass({subject:'Programming',studentId:'unknown',isStudentSubmission:true},viewer),false,'Unknown submission owner must be excluded');
check(context.resourceInViewerClass({subject:'Other Subject',section:'Rizal',isStudentSubmission:true},viewer),false,'Other subject must be excluded');
const save = resources.slice(resources.indexOf('    function saveResources'),resources.indexOf('    // --- SCHOOL YEAR'));
context.STORAGE_KEY='test';context.localStorage.setItem=()=>{};
vm.runInContext(save,context);
check(context.saveResources([]),true,'Successful browser save');
context.localStorage.setItem=()=>{throw Error('quota');};
check(context.saveResources([]),false,'Storage failure must not report success');
const chat=fs.readFileSync('js/sigma-chat-client.js','utf8');
let hidden=false;
const topic={title:'Variables',description:'Declaring variables',lessons:[{title:'Released lesson',text:'Use meaningful variable names.'}],quiz:[{answerKey:'SECRET'}]};
const chatContext={window:{currentTopicState:{subjectId:'programming',topicIdx:0},getTopicData:()=>({title:'Programming',q1Topics:[topic]}),getStudentTopicReleaseStatus:()=>({isHidden:hidden}),getStudentLearningMaterialReleaseStatus:()=>({})},location:{pathname:'/student.html'},document:{getElementById:()=>({classList:{contains:()=>false}}),createElement:()=>({set innerHTML(text){this.textContent=String(text).replace(/<[^>]*>/g,'');}})}};
vm.createContext(chatContext);
vm.runInContext(chat.slice(chat.indexOf('    window.getSigmaLessonContext'),chat.indexOf('    window.sendSigmaChatMessage')),chatContext);
check(chatContext.window.getSigmaLessonContext().sources[0].text,'Use meaningful variable names.','Lesson context contains released instructional text');
check(JSON.stringify(chatContext.window.getSigmaLessonContext()).includes('SECRET'),false,'Assessment answers must not be sent as lesson context');
hidden=true;
check(chatContext.window.getSigmaLessonContext(),null,'Hidden topics must not be supplied to chat');
console.log(`${checks} frontend scope checks passed. No network or database calls were made.`);
