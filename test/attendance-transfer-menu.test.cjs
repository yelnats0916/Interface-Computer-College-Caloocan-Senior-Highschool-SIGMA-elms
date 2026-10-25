const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
for(const portal of ['teacher','admin'])for(const width of [375,768,1280]){
 const p=await browser.newPage({viewport:{width,height:667}});await p.setContent('<html><body style="margin:0;height:1600px"><button id="trigger" style="position:absolute;right:10px;top:180px;width:100px;height:32px">Import / Export</button></body></html>');
 const html=fs.readFileSync(portal+'.html','utf8');for(const m of html.matchAll(/<link[^>]*href="(css\/[^"?]+)[^"]*"/g))if(fs.existsSync(m[1]))await p.addStyleTag({path:m[1]});
 await p.addScriptTag({path:'js/attendance-import.js'});await p.evaluate(()=>{document.getElementById('trigger').onclick=()=>openAttendanceTransferMenu(document.getElementById('trigger'));window.openAttendanceImport=()=>window.clicked='import';window.openAttendanceExportModal=()=>window.clicked='export';});
 await p.locator('#trigger').click();const menu=p.locator('#attendance-transfer-menu');const size=await menu.boundingBox();assert.equal(size.width,width===375?160:200);assert(size.x>=8&&size.x+size.width<=width-8);
 const rows=await menu.locator('button').evaluateAll(buttons=>buttons.map(b=>({height:b.getBoundingClientRect().height,font:getComputedStyle(b).fontSize})));if(width===375){assert(rows.every(row=>row.height===38&&row.font==='12px'));}
 await p.screenshot({path:process.env.TEMP+`/sigma-transfer-menu-${portal}-${width}.png`});await menu.locator('[data-import]').click();assert.equal(await p.evaluate(()=>clicked),'import');assert.equal(await menu.count(),0);
 await p.locator('#trigger').click();await menu.locator('[data-export]').click();assert.equal(await p.evaluate(()=>clicked),'export');
 await p.locator('#trigger').click();await p.mouse.click(10,600);await menu.waitFor({state:'detached'});await p.close();console.log('PASS scaled menu, viewport alignment, both actions and outside dismissal',portal,width);
}}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
