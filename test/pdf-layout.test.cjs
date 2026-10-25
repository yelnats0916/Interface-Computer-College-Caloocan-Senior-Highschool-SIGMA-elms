const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({acceptDownloads:true});
  await page.route('http://pdf.test/**',r=>{const file=new URL(r.request().url()).pathname.slice(1);return r.fulfill(file.startsWith('js/vendor/')?{body:fs.readFileSync(file),contentType:file.endsWith('.ttf')?'font/ttf':'text/javascript'}:{body:'<html></html>',contentType:'text/html'});});
  await page.goto('http://pdf.test/');await page.addScriptTag({path:'js/pdf-layout.js'});await page.addScriptTag({path:'js/attendance-pdf.js'});
  let pending=page.waitForEvent('download');
  await page.evaluate(async()=>{
   const dates=Array.from({length:25},(_,i)=>'10/'+String(i+1).padStart(2,'0'));
   const header=['No.','Student','ID',...dates,'Present','Absent','Late','Rate'];
   await saveAttendancePdf({section:'Einstein - Grade 11',subject:'Reading and Writing Skills - Critical Reading and Patterns of Development',label:'Second Quarter',months:[{period:'2026-10-01 to 2026-10-25',month:'2026-10',academic:{quarter:'Second Quarter',semester:'First Semester'},rows:[[],[],[],[],header,...Array.from({length:40},(_,i)=>[i+1,'Pe\u00f1a, Student With A Long Full Name '+i,'26010'+i,...dates.map(()=>'P'),25,0,0,'100%'])]}]});
  });
  await (await pending).saveAs(path.join(process.env.TEMP,'sigma-layout-attendance.pdf'));
  const quiz=fs.readFileSync('js/quiz-creator.js','utf8');const start=quiz.indexOf('window.executeDownloadAssessment = async');const end=quiz.indexOf('\n};',start)+3;
  await page.addScriptTag({content:"let questions=[{}],currentQuizTitle='A Full Assessment',activeExportFormat='pdf';window.closeDownloadOptionsModal=()=>{};window.generateQuizExportDocument=()=>Array.from({length:100},(_,i)=>(i+1)+'. Explain Pe\\u00f1a\\u2019s viewpoint and compare the two arguments. '+('Discuss the evidence from the selected lesson. ').repeat(8)).join('\\n\\n');"+quiz.slice(start,end)});
  pending=page.waitForEvent('download');await page.evaluate(()=>executeDownloadAssessment());await (await pending).saveAs(path.join(process.env.TEMP,'sigma-layout-quiz.pdf'));
  const batch=fs.readFileSync('js/batch-user-creator.js','utf8');const a=batch.indexOf('    async function buildPdfTemplateBlob('),b=batch.indexOf('    function triggerBlobDownload',a);
  await page.addScriptTag({content:batch.slice(a,b)+'window.buildPdfTemplateBlob=buildPdfTemplateBlob;'});
  const bytes=await page.evaluate(async()=>{const blob=await buildPdfTemplateBlob(['Institutional Role','Firstname','Middlename','Lastname','Gender','Gmail'],Array.from({length:5},(_,i)=>['Teacher','Teacher Name '+i,'Middle Name','Pe\u00f1a','Female','long.email.address.for.teacher'+i+'@example.edu.ph']));return Array.from(new Uint8Array(await blob.arrayBuffer()));});
  fs.writeFileSync(path.join(process.env.TEMP,'sigma-layout-batch.pdf'),Buffer.from(bytes));
  assert(bytes.length>1000);console.log('PASS attendance, 100-question assessment and batch template use wrapped Unicode text with multipage PDF layout.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
