const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
for(const portal of ['teacher','admin'])for(const width of [1280,375]){
 const p=await browser.newPage({viewport:{width,height:width===375?667:900},acceptDownloads:true});
 await p.goto('https://sigma-elms.alwaysdata.net/index.html');await p.setContent('<html><body></body></html>');
 const html=fs.readFileSync(portal+'.html','utf8');for(const m of html.matchAll(/<link[^>]*href="(css\/[^"?]+)[^"]*"/g))if(fs.existsSync(m[1]))await p.addStyleTag({path:m[1]});
 await p.addStyleTag({content:'#sigma-universal-ask-overlay{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#0008}#sigma-universal-ask-overlay.hidden{display:none}.fa-xmark::before{content:"×"}.fa-chevron-left::before{content:"‹"}.fa-cloud-arrow-up::before{content:"↑"}'});
 await p.addScriptTag({path:'js/vendor/xlsx.bundle.js'});
 await p.evaluate(role=>{
  window.calls=[];window.testContext={section:'Einstein',subject:'Oral Communication in Context',schoolYear:'2026-2027',start:'2026-06-16',end:'2027-03-31',today:'2026-10-25',students:Array.from({length:10},(_,i)=>({id:String(2601030+i),name:'Student '+(i+1)}))};
  window.SigmaDatabase={currentUser:()=>({id:'teacher',role}),request:async(endpoint,{data})=>{window.calls.push(data);if(data.action==='import-context')return{success:true,context:window.testContext};if(!data.overwrite)return{success:true,needsConfirmation:true,revision:'revision1',conflicts:[{date:'2026-10-23',id:'2601030',name:'Student 1',before:'present',after:'absent'}]};return{success:true,importedMarks:2};}};
  window.SigmaAttendance={refresh:async()=>{}};window.getAttendanceTransferScope=()=>({section:'Einstein',subjectId:'Oral Communication in Context',year:2026,month:9});
  window.getSubmittedAttendanceDays=()=>[{date:'2026-10-23',statuses:{2601030:'P'}},{date:'2026-10-24',statuses:{2601030:'L'}}];window.getActiveSchoolYearRecord=()=>({yearStart:2026,yearEnd:2027});window.getAttendanceAcademicContext=()=>({quarter:'2nd Quarter',semester:'1st Semester'});
  window.formatStudentLastFirstMiddle=s=>s.name;window.studentNamesMatch=(a,b)=>a===b;window.closeAttendanceExportModal=()=>{};
 },portal==='admin'?'Admin':'Teacher');
 await p.addScriptTag({path:'js/excel-export.js'});
 const source=fs.readFileSync('js/classroom-room.js','utf8'),a=source.indexOf('    function buildAttendanceWorksheet('),b=source.indexOf('    window.exportFilteredAttendancePdf',a);
 await p.addScriptTag({content:source.slice(a,b)+'window.buildAttendanceTransferWorksheet=buildAttendanceWorksheet;'});
 await p.addScriptTag({path:'js/dialog.js'});await p.addScriptTag({path:'js/attendance-import.js'});
 const check=await p.evaluate(()=>{
  const api=SigmaAttendanceWorkbook,context=testContext;
  const book=api.workbookFor(context,'2026-09-01','2026-10-31',false);
  if(book.SheetNames.join(',')!=='2026-09,2026-10')throw Error('Monthly tabs missing');
  const roundtrip=XLSX.read(XLSX.write(book,{type:'array',bookType:'xlsx'}),{type:'array'});
  const parsed=api.parseWorkbook(roundtrip,context);
  if(parsed.count!==2||parsed.days['2026-10-23']['2601030']!=='P')throw Error('Roundtrip failed');
  const ws=book.Sheets['2026-10'],rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:''}),header=rows.findIndex(r=>r[0]==='No.');
  if(!rows[header].includes('10/24')||rows[header].includes('10/25'))throw Error('Recorded weekend date missing or blank weekend included');if(parsed.days['2026-10-24']['2601030']!=='L')throw Error('Recorded weekend mark missing');
  if(rows.find(r=>r[0]==='Period:')?.[2]!=='October 2026')throw Error('Monthly period label differs from export');
  const totals=rows.findIndex(r=>r[1]==='All Total Present'),emptyCol=rows[header].indexOf('10/22'),recordedCol=rows[header].indexOf('10/23');
  const cell=(r,c)=>ws[XLSX.utils.encode_cell({r,c})];
  if(cell(totals,emptyCol).v!==''||cell(totals+1,emptyCol).v!=='')throw Error('Empty date totals show zero');
  if(cell(totals,recordedCol).v!==1||cell(totals+1,recordedCol).v!==0)throw Error('Recorded date totals must include numeric zero');
  if(cell(header+2,3+rows[header].filter(v=>/^10\//.test(v)).length).v!=='')throw Error('Unmarked student totals show zero');
  if(!cell(totals,emptyCol).f.startsWith('IF(SUM(COUNTIF(')||!cell(totals,emptyCol).f.includes('=0,"",COUNTIF('))throw Error('Template totals must become blank when all valid marks are cleared');
  const guidance=rows.findIndex(r=>String(r[1]).startsWith('Enter P (Present)'));
  if(guidance<=totals+3)throw Error('Excel guidance must appear below attendance totals');
  if(!rows[guidance][1].includes('row meets the date column'))throw Error('Excel guidance must explain where to enter marks');
  if(!ws[XLSX.utils.encode_cell({r:guidance,c:1})].s.alignment.wrapText)throw Error('Excel guidance must wrap within merged cells');
  const col=rows[header].indexOf('10/23'),address=XLSX.utils.encode_cell({r:header+1,c:col});
  ws[address].v='X';let rejected=false;try{api.parseWorkbook(book,context);}catch(e){rejected=true;}if(!rejected)throw Error('Invalid mark accepted');ws[address].v='A';
  const col2=rows[header].indexOf('10/22');ws[XLSX.utils.encode_cell({r:header+2,c:col2})]={t:'s',v:'L'};
  const result=api.parseWorkbook(book,context);if(result.count!==3)throw Error('Blank cells became marks');
  window.testUpload=XLSX.write(book,{type:'base64',bookType:'xlsx'});
  const blank=api.workbookFor(context,'2026-09-01','2026-10-31',true);const blankRows=XLSX.utils.sheet_to_json(blank.Sheets['2026-10'],{header:1,defval:''});if(blankRows.filter(r=>String(r[1]).startsWith('All Total')).some(r=>r.slice(3,-4).some(v=>v!=='')))throw Error('Blank template has numeric totals');let empty=false;try{api.parseWorkbook(blank,context);}catch(e){empty=true;}if(!empty)throw Error('Blank workbook accepted');
  const wrong={...context,section:'Other'};let outside=false;try{api.parseWorkbook(book,wrong);}catch(e){outside=true;}if(!outside)throw Error('Wrong section accepted');
  ws[address].f='1+1';let formula=false;try{api.parseWorkbook(book,context);}catch(e){formula=true;}if(!formula)throw Error('Formula mark accepted');delete ws[address].f;
  const future={...context,today:'2026-10-22'};let futureRejected=false;try{api.parseWorkbook(book,future);}catch(e){futureRejected=true;}if(!futureRejected)throw Error('Future mark accepted');
  const idCell=XLSX.utils.encode_cell({r:header+1,c:2}),original=ws[idCell].v;ws[idCell].v='outside';let unknown=false;try{api.parseWorkbook(book,context);}catch(e){unknown=true;}if(!unknown)throw Error('Unknown student accepted');ws[idCell].v=original;
  // The old exported format has M/D headings and no custom properties.
  delete book.Custprops;for(const name of book.SheetNames){const sheet=book.Sheets[name],data=XLSX.utils.sheet_to_json(sheet,{header:1,defval:''}),hr=data.findIndex(r=>r[0]==='No.');data[hr].forEach((v,c)=>{if(/^2026-/.test(v))sheet[XLSX.utils.encode_cell({r:hr,c})].v=v.slice(5).replace('-','/');});}
  if(api.parseWorkbook(book,context).count!==3)throw Error('Existing export format rejected');
  return true;
 });assert(check);
 await p.evaluate(()=>openAttendanceImport());const modal=p.locator('#attendance-export-modal');await modal.getByRole('tab',{name:'Download Template',exact:true}).click();assert(await modal.locator('[name=contents][value=current]').isChecked());await p.screenshot({path:path.join(process.env.TEMP,`attendance-template-form-${portal}-${width}.png`)});
 assert(await modal.getByText('Recorded Attendance',{exact:true}).isVisible());assert.equal(await modal.locator('.attendance-import-mark-hint').count(),0);await p.evaluate(()=>{SigmaAttendance.refresh=()=>new Promise(resolve=>window.releaseDownload=resolve);});const dl=p.waitForEvent('download');await modal.getByRole('button',{name:'Download Template',exact:true}).click();assert(await modal.locator('.attendance-download-loading').isVisible());assert(!(await modal.getByRole('button',{name:'Downloading',exact:true}).isVisible()));await p.evaluate(()=>{releaseDownload();SigmaAttendance.refresh=async()=>{};});await(await dl).saveAs(path.join(process.env.TEMP,`attendance-template-${portal}-${width}.xlsx`));await modal.waitFor({state:'detached'});
 await p.evaluate(()=>openAttendanceImport());await modal.getByRole('tab',{name:'Upload Attendance',exact:true}).click();const drop=modal.locator('[data-drop]');await p.mouse.move(0,0);await p.waitForTimeout(250);
 const style=await drop.evaluate(el=>({radius:getComputedStyle(el).borderRadius,border:getComputedStyle(el).borderTopColor,icon:getComputedStyle(el.querySelector('i')).color}));assert.equal(style.radius,'16px');assert.equal(style.border,width===375?'rgb(255, 208, 0)':'rgba(0, 0, 0, 0.18)');assert.notEqual(style.icon,'rgb(21, 128, 61)');
 await p.screenshot({path:path.join(process.env.TEMP,`attendance-upload-form-${portal}-${width}.png`)});
 if(width>767){await drop.hover();await p.waitForTimeout(250);assert.equal(await drop.evaluate(el=>getComputedStyle(el).borderTopColor),'rgb(255, 208, 0)');await p.screenshot({path:path.join(process.env.TEMP,`attendance-upload-hover-${portal}-${width}.png`)});await p.mouse.move(0,0);}
 const encoded=await p.evaluate(()=>testUpload);await modal.locator('[data-file]').setInputFiles({name:'Attendance.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(encoded,'base64')});
 await modal.getByText('Review Attendance',{exact:true}).waitFor();assert.equal(await p.evaluate(()=>calls.filter(c=>c.action==='import').length),0);
 const overflow=await modal.evaluate(el=>({panel:el.querySelector('.sigma-modal-panel').getBoundingClientRect().width,body:el.querySelector('.sigma-modal-body').getBoundingClientRect().width,scroll:document.documentElement.scrollWidth,viewport:innerWidth}));assert(overflow.scroll<=overflow.viewport);assert(overflow.panel<=width);
 await modal.locator('.attendance-import-month summary').click();await modal.locator('.attendance-import-month [data-sheet]').nth(1).click();await p.screenshot({path:path.join(process.env.TEMP,`attendance-import-review-${portal}-${width}.png`)});
 const reviewLayout=await modal.evaluate(el=>{const table=el.querySelector('.attendance-import-table'),body=el.querySelector('.sigma-modal-body');return{headings:[...table.querySelectorAll('th')].map(th=>th.textContent),radius:getComputedStyle(table).borderRadius,vertical:table.scrollHeight>table.clientHeight+1,bodyScrollable:body.scrollHeight>body.clientHeight+1};});
 assert.equal(reviewLayout.headings[1],'Students');assert.equal(reviewLayout.headings[3],'10/01');assert.equal(reviewLayout.radius,'0px');assert.equal(reviewLayout.vertical,false,'Review table must not have a separate vertical scrollbar');if(width>767){assert(await modal.evaluate(el=>el.scrollHeight>el.clientHeight+1),'Use export form outer scrolling on desktop');assert.equal(reviewLayout.bodyScrollable,false,'No inner panel scrollbar on desktop');}else{assert(reviewLayout.bodyScrollable,'Use export form mobile scrolling');}
 const dropdown=await modal.locator('.attendance-import-month').evaluate(el=>{const box=el.getBoundingClientRect(),arrow=el.querySelector('i').getBoundingClientRect(),summary=el.querySelector('summary').getBoundingClientRect();return{inside:arrow.right<=box.right+1&&summary.right<=box.right+1};});assert(dropdown.inside,'Chevron must stay inside the custom month control');
 const table=modal.locator('.attendance-import-table');
 if(width>767){assert(await modal.evaluate(el=>el.scrollWidth>el.clientWidth),'Desktop form must expose the main horizontal scrollbar');assert.equal(await table.evaluate(el=>getComputedStyle(el).overflowX),'visible');}
 const panTarget=width>767?modal:table;
 await modal.evaluate(el=>el.scrollTop=0);await table.scrollIntoViewIfNeeded();
 await panTarget.evaluate(el=>el.scrollLeft=0);const box=await table.boundingBox();const startX=Math.min(width-40,box.x+200),startY=Math.min((width===375?667:900)-150,box.y+75);
 await p.mouse.move(startX,startY);await p.mouse.down();await p.mouse.move(startX-100,startY,{steps:8});await p.mouse.up();assert(await panTarget.evaluate(el=>el.scrollLeft>50),'Click-and-hold drag must move attendance dates');await panTarget.evaluate(el=>el.scrollLeft=0);
 await modal.locator('[data-close]:visible').first().click();const ask=p.locator('#sigma-universal-ask-overlay');assert(await ask.isVisible());await ask.locator('#sigma-ask-cancel-btn').click({timeout:3000});assert(await modal.isVisible());
 await modal.getByRole('button',{name:'Submit Attendance',exact:true}).click();await modal.getByText('Replace Existing Marks?',{exact:true}).waitFor();assert.match(await modal.innerText(),/present/);assert.match(await modal.innerText(),/absent/);
 await modal.getByRole('button',{name:'Confirm Changes',exact:true}).click();await modal.waitFor({state:'detached'});
 const sent=await p.evaluate(()=>calls.filter(c=>c.action==='import'));assert.equal(sent.length,2);assert.equal(sent[1].overwrite,true);assert.equal(Object.keys(sent[1].days).length,3);
 await p.evaluate(()=>openAttendanceImport());await modal.getByRole('tab',{name:'Download Template',exact:true}).click();await modal.locator('[name=from]').fill('2026-10-02');await modal.locator('[data-close]:visible').first().click();assert(await ask.isVisible());await ask.locator('#sigma-ask-proceed-btn').click();await modal.waitFor({state:'detached'});
 await p.close();console.log('PASS monthly XLSX roundtrip, old exports, blanks, wrong scope, preview, confirmation and responsive form',portal,width);
}}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
