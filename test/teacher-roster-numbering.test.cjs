const fs=require('node:fs'), vm=require('node:vm'), assert=require('node:assert/strict');
const {chromium}=require('playwright');
const read=file=>fs.readFileSync(file,'utf8');
const students=[{id:'91',name:'Alvarez',creationNumber:127},{id:'12',name:'Bautista',creationNumber:56},{id:'78',name:'Cruz',creationNumber:23}];
function attendanceRows(file){
    const source=read(file),start=source.indexOf('students.forEach((student, rosterIndex) => {');
    const end=source.indexOf('                for (let d = 1;',start);
    assert(start>=0&&end>start);
    const context={students,html:'',studentTotals:{},window:{},escapeHtml:String,isAttendanceStudentColExpanded:false};
    vm.createContext(context);vm.runInContext(source.slice(start,end)+"html+='</tr>';});",context);
    return context.html;
}
// Execute the real attendance export functions, with intentionally nonsequential account numbers.
const parity=read('test/attendance-export-parity.test.cjs');
const prefix=parity.slice(0,parity.indexOf('const records =')).replace("const students = [", "const students = [");
const sandbox={require,__dirname:process.cwd()+'/test',console};vm.createContext(sandbox);
vm.runInContext(prefix+"\nthis.exportWorkbook=exportWorkbook;",sandbox);
for(const file of ['js/teacher.js','js/classroom-room.js']){
    const result=sandbox.exportWorkbook(file,'month-active',{'2026-10-06':{statuses:{'1001':'P','1002':'A'}}});
    const rows=result.result.workbook.Sheets.October.rows;
    assert.equal(rows[5][0],1);assert.equal(rows[6][0],2);
}
(async()=>{
    const browser=await chromium.launch({channel:'chrome',headless:true});
    try{
        const p=await browser.newPage();await p.route('http://numbering.test/**',r=>r.fulfill({contentType:'text/html',body:'<div id="attendance"></div><div id="admin-grades-shared-navbar"></div><div id="admin-grades-quarters-wrapper"><button>Q1</button><button>Q2</button></div><div id="admin-gradebook-workspace-content"></div>'}));await p.goto('http://numbering.test/');
        await p.addStyleTag({content:read('css/shared-components.css')+'\n'+read('css/shared-grade-record.css')});
        await p.evaluate(students=>{
            window.sigmaGradesState={selectedSubjectSection:{subject:'Reading',sectionName:'Einstein'},activeQuarter:1,currentView:'ww'};
            window.getActiveSchoolYearRecord=()=>({name:'2026-2027'});window.getGradeSemesterLabel=()=> 'Semester Grade';
            window.renderSharedQuarterDropdown=()=>'<details><summary>1st Quarter</summary></details>';
            window.renderAdminGradebookWorkspace=()=>{window._gradebookExportSnapshot={subject:'Reading',section:'Einstein',quarter:1,teacher:{id:'t1'},rows:students.map(student=>({student,quarterly:85}))};};
        },students);
        await p.addScriptTag({content:read('js/shared-grade-record.js')});
        for(const width of [1440,375]){
            await p.setViewportSize({width,height:800});
            for(const file of ['js/teacher.js','js/classroom-room.js']){
                await p.locator('#attendance').evaluate((host,html)=>host.innerHTML='<table><tbody>'+html+'</tbody></table>',attendanceRows(file));
                assert.deepEqual(await p.locator('.attendance-roster-number').allTextContents(),['1','2','3']);
                assert.deepEqual((await p.locator('.attendance-roster-inline').allTextContents()).map(s=>s.trim()),['1.','2.','3.']);
            }
            await p.evaluate(()=>openSharedGradeRecord());
            assert.deepEqual(await p.locator('.record-table-scroll tbody tr td:first-child').allTextContents(),['1','2','3']);
            await p.evaluate(()=>openSharedGradeRecord({mode:'review'}));
            assert.deepEqual(await p.locator('.record-mobile-grade-card header > div').allTextContents(),['1. Alvarez','2. Bautista','3. Cruz']);
        }
        const source=read('js/sigma-analytics.js');
        assert(source.indexOf('const rosterNumbers = new Map(students.map((student, index)')>source.indexOf('students = [...students].sort'));
        for(const file of ['js/teacher.js','js/classroom-room.js','js/shared-grade-record.js','js/excel-export.js','js/sigma-analytics.js'])assert(!read(file).includes('getRecordCreationNumber('),file+' must not use account creation numbers for rosters');
        console.log('PASS desktop/mobile teacher and admin attendance numbers, grade record table/cards, export parity, and numbering after gradebook sorting.');
    }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
