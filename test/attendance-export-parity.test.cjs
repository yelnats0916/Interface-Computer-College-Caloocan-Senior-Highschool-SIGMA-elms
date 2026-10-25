const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('js/classroom-room.js','latin1');
const start=source.indexOf('    function buildAttendanceWorksheet('),end=source.indexOf('    // =========================================================================',source.indexOf('    window.executeAttendanceExport = async'));
const students=[{id:'1001',name:'Student One'},{id:'1002',name:'Student Two'},{id:'1003',name:'Unmarked Student'}];
const published={
 '2026-09-30':{submitted:true,statuses:{1001:'L'}},
 '2026-10-23':{submitted:true,statuses:{1001:'P',1002:'A'}},
 '2026-10-24':{submitted:true,statuses:{1001:'P',1002:'L'}},
 '2026-10-25':{submitted:true,statuses:{1001:'E'}},
 '2026-10-22':{submitted:false,statuses:{1001:'A',1002:'P'}}
};
async function run(scope,{fail=false,portal='teacher'}={}) {
 let downloaded,closed=false,refreshed=false,release;const warnings=[];
 const gate=new Promise(r=>release=r),button={innerHTML:'Download Excel',disabled:false,setAttribute(){},removeAttribute(){},style:{removeProperty(){}},before(){}};
 const window={getSubmittedAttendanceDays:()=>{assert(refreshed,'Export must wait for database refresh');return Object.entries(published).filter(([,r])=>r.submitted).map(([date,r])=>({...r,date}));},SigmaAttendance:{refresh:async()=>{await gate;if(fail)throw Error('Network unavailable');refreshed=true;}},closeAttendanceExportModal:()=>closed=true,showToastNotification:(s,t)=>{if(t==='warning')warnings.push(s);},getAttendanceAcademicPeriods:()=>[{key:'q2',label:'2nd Quarter',start:'2026-08-26',end:'2026-10-24'}],isAttendanceAcademicPeriodReady:()=>true};
 const c=vm.createContext({window,console:{error(){}},document:{createElement:()=>({setAttribute(){},remove(){}}),querySelector:s=>s==='.attendance-export-download-btn'?button:{value:s.includes('non-school')?'exclude':scope}},attendanceViewingMonth:9,attendanceViewingYear:2026,getActiveRoomSectionName:()=> 'Einstein',getActiveRoomSubjectName:()=> 'Oral Communication in Context',getAttendanceStudents:()=>students,formatStudentLastFirstMiddle:s=>s.name,studentNamesMatch:(a,b)=>a===b,getCurrentAttendanceStatuses:()=>{throw Error('Export read private draft');},findAttendanceClassroomRecord:()=>{throw Error('Export read mixed draft cache');},Intl,Date,setTimeout,clearTimeout});
 vm.runInContext(fs.readFileSync('js/vendor/xlsx.bundle.js','utf8'),c);c.XLSX.writeFile=(book,name)=>{downloaded={book,name};};vm.runInContext(source.slice(start,end),c);
 const pending=window.executeAttendanceExport();assert(!downloaded);assert(button.disabled);await window.executeAttendanceExport();release();await pending;assert(!button.disabled);assert(!window._attendanceExcelExporting);
 if(fail){assert(!downloaded);assert(!closed);assert.equal(warnings.length,1);return;}
 assert(downloaded);assert(closed);const roundtrip=c.XLSX.read(c.XLSX.write(downloaded.book,{type:'buffer',bookType:'xlsx'}),{type:'buffer'});
 const sheet=roundtrip.Sheets[scope==='all'?'All Records':scope==='q2'?'2026-10':'October'];
 const rows=c.XLSX.utils.sheet_to_json(sheet,{header:1,defval:''}),header=rows.find(r=>r[0]==='No.'),one=rows.find(r=>r[2]==='1001'),two=rows.find(r=>r[2]==='1002');
 assert.equal(one[header.indexOf('10/23')],'P','Submitted weekday retained');assert.equal(two[header.indexOf('10/23')],'A');assert.equal(one[header.indexOf('10/24')],'P','Submitted Saturday retained');assert.equal(two[header.indexOf('10/24')],'L');
 if(scope!=='q2')assert.equal(one[header.indexOf('10/25')],'E','Submitted Sunday retained');
 assert(!header.includes('10/22')||one[header.indexOf('10/22')]==='','Draft-only day stays blank');
 if(scope==='month'){assert(!header.includes('10/03'),'Unrecorded weekends remain excluded');assert.equal(header.filter(h=>/^10\//.test(h)).length,24);}
 if(scope==='month-active')assert.equal(header.filter(h=>/^10\//.test(h)).length,3);
 assert.equal(one.slice(-4).join(','),scope==='all'?'2,0,1,1':scope==='q2'?'2,0,0,0':'2,0,0,1');
 const unmarked=rows.find(r=>r[2]==='1003');assert.equal(unmarked.slice(-4).join(','),',,,','Unmarked student totals remain blank');
 const absent=rows.find(r=>r[1]==='All Total Absent'),present=rows.find(r=>r[1]==='All Total Present');
 assert.equal(absent[header.indexOf('10/24')],0,'Recorded date displays a numeric zero for no absences');
 assert.equal(present[header.indexOf('10/24')],1);
 if(scope==='month')assert.equal(absent[header.indexOf('10/22')],'','Unrecorded date totals stay blank');
 console.log('PASS fresh submitted XLSX, weekend marks, draft exclusion, totals:',portal,scope);
}
(async()=>{for(const portal of ['teacher','admin'])for(const scope of ['month','month-active','all','q2'])await run(scope,{portal});await run('month',{fail:true});console.log('PASS refresh failure prevents stale download and restores button');})().catch(e=>{console.error(e);process.exitCode=1;});
