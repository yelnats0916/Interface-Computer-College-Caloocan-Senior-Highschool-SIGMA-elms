const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
for(const portal of ['teacher','admin'])for(const width of [1280,375]){
 const p=await browser.newPage({viewport:{width,height:width===375?667:900},acceptDownloads:true});
 await p.goto('https://sigma-elms.alwaysdata.net/index.html');await p.setContent('<html><body></body></html>');
 const html=fs.readFileSync(portal+'.html','utf8');for(const m of html.matchAll(/<link[^>]*href="(css\/[^"?]+)[^"]*"/g))if(fs.existsSync(m[1]))await p.addStyleTag({path:m[1]});
 await p.addStyleTag({content:'.fa-xmark::before{content:"×"}.fa-chevron-left::before{content:"‹"}.fa-cloud-arrow-up::before{content:"↑"}'});
 await p.addScriptTag({path:'js/vendor/xlsx.bundle.js'});
 await p.evaluate(role=>{
  window.calls=[];window.testContext={section:'Einstein',subject:'Oral Communication in Context',schoolYear:'2026-2027',start:'2026-06-16',end:'2027-03-31',today:'2026-10-25',students:Array.from({length:10},(_,i)=>({id:String(2601030+i),name:'Student '+(i+1)}))};
  window.SigmaDatabase={currentUser:()=>({id:'teacher',role}),request:async(endpoint,{data})=>{window.calls.push(data);if(data.action==='import-context')return{success:true,context:window.testContext};if(!data.overwrite)return{success:true,needsConfirmation:true,revision:'revision1',conflicts:[{date:'2026-10-24',id:'2601030',name:'Student 1',before:'present',after:'absent'}]};return{success:true,importedMarks:2};}};
  window.SigmaAttendance={refresh:async()=>{}};window.getAttendanceTransferScope=()=>({section:'Einstein',subjectId:'Oral Communication in Context',year:2026,month:9});
  window.getSubmittedAttendanceDays=()=>[{date:'2026-10-24',statuses:{2601030:'P'}}];window.getActiveSchoolYearRecord=()=>({yearStart:2026,yearEnd:2027});window.getAttendanceAcademicContext=()=>({quarter:'2nd Quarter',semester:'1st Semester'});
  window.formatStudentLastFirstMiddle=s=>s.name;window.studentNamesMatch=(a,b)=>a===b;window.closeAttendanceExportModal=()=>{};
 },portal==='admin'?'Admin':'Teacher');
 await p.addScriptTag({path:'js/excel-export.js'});
 const source=fs.readFileSync('js/classroom-room.js','utf8'),a=source.indexOf('    function buildAttendanceWorksheet('),b=source.indexOf('    window.exportFilteredAttendancePdf',a);
 await p.addScriptTag({content:source.slice(a,b)+'window.buildAttendanceTransferWorksheet=buildAttendanceWorksheet;'});
 await p.addScriptTag({path:'js/attendance-import.js'});
 const check=await p.evaluate(()=>{
  const api=SigmaAttendanceWorkbook,context=testContext;
  const book=api.workbookFor(context,'2026-09-01','2026-10-31',false);
  if(book.SheetNames.join(',')!=='2026-09,2026-10')throw Error('Monthly tabs missing');
  const roundtrip=XLSX.read(XLSX.write(book,{type:'array',bookType:'xlsx'}),{type:'array'});
  const parsed=api.parseWorkbook(roundtrip,context);
  if(parsed.count!==1||parsed.days['2026-10-24']['2601030']!=='P')throw Error('Roundtrip failed');
  const ws=book.Sheets['2026-10'],rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:''}),header=rows.findIndex(r=>r[0]==='No.');
  const col=rows[header].indexOf('2026-10-24'),address=XLSX.utils.encode_cell({r:header+1,c:col});
  ws[address].v='X';let rejected=false;try{api.parseWorkbook(book,context);}catch(e){rejected=true;}if(!rejected)throw Error('Invalid mark accepted');ws[address].v='A';
  const col2=rows[header].indexOf('2026-10-23');ws[XLSX.utils.encode_cell({r:header+2,c:col2})]={t:'s',v:'L'};
  const result=api.parseWorkbook(book,context);if(result.count!==2)throw Error('Blank cells became marks');
  window.testUpload=XLSX.write(book,{type:'base64',bookType:'xlsx'});
  const blank=api.workbookFor(context,'2026-09-01','2026-10-31',true);let empty=false;try{api.parseWorkbook(blank,context);}catch(e){empty=true;}if(!empty)throw Error('Blank workbook accepted');
  const wrong={...context,section:'Other'};let outside=false;try{api.parseWorkbook(book,wrong);}catch(e){outside=true;}if(!outside)throw Error('Wrong section accepted');
  ws[address].f='1+1';let formula=false;try{api.parseWorkbook(book,context);}catch(e){formula=true;}if(!formula)throw Error('Formula mark accepted');delete ws[address].f;
  const future={...context,today:'2026-10-22'};let futureRejected=false;try{api.parseWorkbook(book,future);}catch(e){futureRejected=true;}if(!futureRejected)throw Error('Future mark accepted');
  const idCell=XLSX.utils.encode_cell({r:header+1,c:2}),original=ws[idCell].v;ws[idCell].v='outside';let unknown=false;try{api.parseWorkbook(book,context);}catch(e){unknown=true;}if(!unknown)throw Error('Unknown student accepted');ws[idCell].v=original;
  // The old exported format has M/D headings and no custom properties.
  delete book.Custprops;for(const name of book.SheetNames){const sheet=book.Sheets[name],data=XLSX.utils.sheet_to_json(sheet,{header:1,defval:''}),hr=data.findIndex(r=>r[0]==='No.');data[hr].forEach((v,c)=>{if(/^2026-/.test(v))sheet[XLSX.utils.encode_cell({r:hr,c})].v=v.slice(5).replace('-','/');});}
  if(api.parseWorkbook(book,context).count!==2)throw Error('Existing export format rejected');
  return true;
 });assert(check);
 await p.evaluate(()=>openAttendanceImport());const modal=p.locator('#attendance-export-modal');await modal.getByText('Download Template',{exact:true}).click();assert(await modal.locator('[name=contents][value=current]').isChecked());
 const dl=p.waitForEvent('download');await modal.getByRole('button',{name:'Download Template',exact:true}).click();await(await dl).saveAs(path.join(process.env.TEMP,`attendance-template-${portal}-${width}.xlsx`));await modal.waitFor({state:'detached'});
 await p.evaluate(()=>openAttendanceImport());await modal.getByText('Upload Attendance',{exact:true}).click();const encoded=await p.evaluate(()=>testUpload);await modal.locator('[data-file]').setInputFiles({name:'Attendance.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(encoded,'base64')});
 await modal.getByText('Review Attendance',{exact:true}).waitFor();assert.equal(await p.evaluate(()=>calls.filter(c=>c.action==='import').length),0);
 const overflow=await modal.evaluate(el=>({panel:el.querySelector('.sigma-modal-panel').getBoundingClientRect().width,body:el.querySelector('.sigma-modal-body').getBoundingClientRect().width,scroll:document.documentElement.scrollWidth,viewport:innerWidth}));assert(overflow.scroll<=overflow.viewport);assert(overflow.panel<=width);
 await modal.getByRole('tab').nth(1).click();await p.screenshot({path:path.join(process.env.TEMP,`attendance-import-review-${portal}-${width}.png`)});
 await modal.getByRole('button',{name:'Submit Attendance',exact:true}).click();await modal.getByText('Replace Existing Marks?',{exact:true}).waitFor();assert.match(await modal.innerText(),/present/);assert.match(await modal.innerText(),/absent/);
 await modal.getByRole('button',{name:'Confirm Changes',exact:true}).click();await modal.waitFor({state:'detached'});
 const sent=await p.evaluate(()=>calls.filter(c=>c.action==='import'));assert.equal(sent.length,2);assert.equal(sent[1].overwrite,true);assert.equal(Object.keys(sent[1].days).length,2);
 await p.close();console.log('PASS monthly XLSX roundtrip, old exports, blanks, wrong scope, preview, confirmation and responsive form',portal,width);
}}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
