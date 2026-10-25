const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('js/admin.js','utf8');
const records=[6,7,15,99,20,2,1].map((id,i)=>({id:'SEC-'+id,creationNumber:id,name:'Section '+i,subject:'Subject '+i,adviser:'Section Adviser',adviserId:'adviser',teachers:[{id:'teacher-'+i,name:'Subject Teacher '+i,role:'Teacher'}],dailySchedules:['Mon','Tue','Thu','Fri'].map(day=>({day,active:true,startTime:'09:00',endTime:'10:00'}))}));
const table={innerHTML:''};
const window={sectionSearchState:{},sectionPaginationState:{currentPage:1,itemsPerPage:5},enforceSingleAdviserOnStoredSections(){},hasTableSearchFilters:s=>!!s.query};
const ctx=vm.createContext({window,document:{getElementById:id=>id==='sectionTableBody'?table:null},getFilteredSectionsBySearch:()=>records,getStoredJson:()=>[],USER_STORAGE_KEY:'users',escapeHtml:String,renderPaginationControls(){},formatSectionDaysString:days=>days.join(', '),formatSectionSchedule:()=> '09:00 AM - 10:00 AM'});
const scheduleStart=src.indexOf('window.renderSectionTableSchedule = function');
const scheduleEnd=src.indexOf('\n};',scheduleStart)+3;
vm.runInContext(src.slice(scheduleStart,scheduleEnd),ctx);
const start=src.indexOf('function renderSectionsTable()'),end=src.indexOf('function getMixedSubjectTableOrder',start);
vm.runInContext(src.slice(start,end),ctx);
function render(page,query=''){window.sectionPaginationState.currentPage=page;window.sectionSearchState.query=query;ctx.renderSectionsTable();return [...table.innerHTML.matchAll(/<tr\b[\s\S]*?<td\b[\s\S]*?<div[^>]*>(\d+)<\/div>/g)].map(m=>Number(m[1]));}
assert.deepEqual(render(1),[7,6,5,4,3]);assert.deepEqual(render(2),[2,1]);assert.deepEqual(render(1,'Section'),[1,2,3,4,5]);assert.deepEqual(render(2,'Section'),[6,7]);
assert(table.innerHTML.includes('Subject Teacher 5'));assert(!table.innerHTML.includes('Section Adviser'));assert.equal(records[5].teachers.length,1,'Rendering must never add the adviser to subject teachers');
const schedule=window.renderSectionTableSchedule(records[0]);assert(schedule.includes('Mon, Tue, Thu, Fri'));assert.equal((schedule.match(/09:00 AM/g)||[]).length,1,'Same-period days share one time line');
assert.deepEqual(records.map(s=>s.id),[6,7,15,99,20,2,1].map(id=>'SEC-'+id));
console.log('PASS sections: sequential list/search pagination numbers, stable order, subject teacher only, no roster mutation, compact fixed-period schedule.');
