const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('js/admin.js','utf8');const a=src.indexOf('window.handleSectionSave = function'),b=src.indexOf('// =============================================================',a);
async function check(status,outcome){
 let timer,confirm,resolveSave,writes=0,reloads=0,bars=0,closed=0;
 const store=new Map([['sigma-admin-sections',[]]]),elements={};
 const values={'edit-section-name':'Newton','edit-section-grade':'Grade 11','edit-section-room':'303','edit-section-school-year':'2026-2027','edit-section-subject':'General Mathematics'};
 const get=id=>elements[id]||=( {value:values[id]||'',classList:{add(){},remove(){}},disabled:false});
 const window={selectedSectionTeachers:[{id:'teacher',name:'Teacher One',role:'Adviser',isPrimary:true}],selectedSectionStudents:[{id:'student',name:'Student One'}],selectedSectionDailySchedule:[{day:'Mon',active:true,startTime:'08:00',endTime:'09:00'}],
  showSectionConfirm:(title,desc,callback)=>{confirm=callback;},collapseExtraAdviserRoles(){},sectionAdviserGroupKey:s=>s.name,applyCanonicalAdviserToSection(){},syncSectionToDB:()=>new Promise(resolve=>resolveSave=resolve),
  showCreationBar:()=>bars++,toggleSectionOverlay:()=>closed++,location:{reload:()=>reloads++},dispatchEvent(){},showToast(){},renderAssignSectionOverview(){}};
 const ctx=vm.createContext({window,document:{getElementById:get},getStoredJson:(key,fallback)=>store.get(key)||fallback,saveStoredJson:(key,value)=>{writes++;store.set(key,value);},SECTIONS_STORAGE_KEY:'sigma-admin-sections',formatSectionDaysString:days=>days.join(', '),setTimeout:callback=>{timer=callback;},formatFormattedScheduleSummary:()=>'',localStorage:{setItem(){}},CustomEvent:class{},console});
 window.formatFormattedScheduleSummary=()=>'';
 vm.runInContext(src.slice(a,b),ctx);window.handleSectionSave(status);confirm();const pending=timer();
 assert.equal(writes,0);assert.equal(reloads,0);assert.equal(bars,0);assert.equal(closed,0);
 resolveSave(outcome);await pending;
 if(outcome){assert(writes>0);assert.equal(reloads,1);assert.equal(bars,1);assert.equal(store.get('sigma-admin-sections')[0].status,status);}
 else{assert.equal(writes,0);assert.equal(reloads,0);assert.equal(bars,0);assert.equal(closed,0);}
}
(async()=>{for(const status of ['Draft','Deployed'])for(const outcome of [false,true])await check(status,outcome);console.log('PASS draft/deploy wait for database confirmation; failed saves keep the form and never show success or write browser records.');})().catch(e=>{console.error(e);process.exitCode=1});

{
 const a=src.indexOf('function updateSectionMetricCards()'),b=src.indexOf('    // Attach interactive',a);
 const nodes={};const records=['Einstein','Newton','Galileo'].flatMap(name=>Array.from({length:9},(_,i)=>({name,grade:'Grade 11',schoolYear:'2026-2027',room:name,subject:'Subject '+i})));
 vm.runInNewContext(src.slice(a,b)+'}',{getStoredJson:()=>records,SECTIONS_STORAGE_KEY:'sections',window:{sectionAdviserGroupKey:s=>[s.name,s.grade,s.schoolYear].join('|')},document:{getElementById:id=>nodes[id]||=( {textContent:''})},Map,Set});
 const ctx=vm.createContext({getStoredJson:()=>records,SECTIONS_STORAGE_KEY:'sections',window:{sectionAdviserGroupKey:s=>[s.name,s.grade,s.schoolYear].join('|')},document:{getElementById:id=>nodes[id]||=( {textContent:''})},Map,Set});
 vm.runInContext(src.slice(a,b)+'}',ctx);vm.runInContext('updateSectionMetricCards()',ctx);
 assert.equal(nodes['metric-total-sections'].textContent,3);assert.equal(nodes['metric-grade11-sections'].textContent,3);assert.equal(nodes['metric-rooms-sections'].textContent,3);
 console.log('PASS 27 subject assignments count as three distinct Grade 11 sections.');
}
