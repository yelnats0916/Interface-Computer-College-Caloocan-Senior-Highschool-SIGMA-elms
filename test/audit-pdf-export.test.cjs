const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
    for(const width of [1440,375]){
        const context=await browser.newContext({viewport:{width,height:800},acceptDownloads:true});const page=await context.newPage();
        await page.route('http://audit.test/**',route=>{const file=new URL(route.request().url()).pathname.slice(1);if(file.startsWith('js/vendor/'))return route.fulfill({contentType:'application/javascript',body:fs.readFileSync(file)});return route.fulfill({contentType:'text/html',body:'<html><body>'+['ai','activity','auth','notifications'].map(kind=>`<section id="audit-${kind==='notifications'?'notifications':kind}-view"><div><table class="sigma-audit-table"><tbody></tbody></table></div></section>`).join('')+'</body></html>'});});
        await page.goto('http://audit.test/');await page.addStyleTag({content:fs.readFileSync('css/shared-components.css','utf8')+fs.readFileSync('css/forms.css','utf8')+fs.readFileSync('css/audit-pdf-export.css','utf8')});
        await page.evaluate(()=>{
            window.canViewAuditLog=()=>true;window.getAuditLogSearchQuery=()=> 'Activity 1';
            const users=[{id:'101',firstName:'Mary Ann',middleName:'Cruz',lastName:'De la Rosa',role:'Teacher'},{id:'202',firstName:'Stanley',lastName:'Garcia',role:'Admin'}];
            const records=(count,kind)=>Array.from({length:count},(_,index)=>({id:kind+index,userId:'101',userName:'Mary Ann Cruz De la Rosa',userRole:'Teacher',timestamp:'2026-10-25T00:00:00Z',activity:'Activity '+(index+1),event:'Login successful',feature:'quiz',prompt:'Quiz generation request '+index,response:'Completed',status:'Success'}));
            window.SigmaDatabase={url:()=> 'http://audit.test/php/api/ai_records.php',request:async endpoint=>({success:true,records:endpoint==='users'?users:records(endpoint==='activity_logs'?8:7,endpoint)}),fetch:async()=>new Response(JSON.stringify({success:true,logs:records(6,'ai')})),readJson:response=>response.json()};
            window.SigmaNotifications={getLogs:()=>Array.from({length:3},(_,i)=>({id:'notification'+i,title:'Quarter reminder '+(i+1),senderId:'202',senderName:'Stanley Garcia',senderRole:'Admin',recipientId:'101',recipient:'Mary Ann Cruz De la Rosa',role:'teacher',timestamp:'2026-10-24T16:05:00Z',status:'Created'}))};
        });
        await page.addScriptTag({content:fs.readFileSync('js/audit-pdf-export.js','utf8')});await page.evaluate(()=>document.dispatchEvent(new Event('DOMContentLoaded')));
        assert.equal(await page.locator('[data-audit-export]').count(),4);
        await page.locator('[data-audit-export=notifications]').click();await page.waitForFunction(()=>document.querySelector('[data-count]').textContent==='3 matching records');
        const modal=page.locator('#audit-pdf-export');assert(await modal.getByLabel('Search name or ID').count()===0); // The visible label is User, separate from Log Type.
        await modal.locator('[name=user]').fill('Mary Ann');assert.equal(await modal.locator('[data-count]').textContent(),'3 matching records');
        await modal.locator('.audit-export-direction summary').click();await modal.locator('[data-direction-value=sender]').click();assert.equal(await modal.locator('[data-count]').textContent(),'0 matching records');
        await modal.locator('.audit-export-direction summary').click();await modal.locator('[data-direction-value=recipient]').click();await modal.locator('[name=from]').fill('2026-10-25');await modal.locator('[name=to]').fill('2026-10-25');assert.equal(await modal.locator('[data-count]').textContent(),'3 matching records','Manila midnight boundaries are respected');
        await modal.locator('[data-all]').check();await page.waitForFunction(()=>document.querySelector('[data-count]').textContent==='24 matching records');
        assert.equal(await modal.locator('[name="log-type"]:checked').count(),4);
        const overflow=await modal.evaluate(host=>Array.from(host.querySelectorAll('input,button,select')).filter(e=>e.getClientRects().length).some(e=>{const r=e.getBoundingClientRect();return r.left<0||r.right>innerWidth+1;}));assert.equal(overflow,false);await modal.screenshot({path:path.join(process.env.TEMP||'/tmp','sigma-audit-export-form-'+width+'.png')});
        await modal.locator('[name=scope][value=selected]').check();await modal.locator('[data-choices] input').first().check();assert.equal(await modal.locator('[data-count]').textContent(),'1 matching record');
        await modal.locator('[name=scope][value=all]').check();
        const event=page.waitForEvent('download');await modal.getByRole('button',{name:'Download PDF'}).click();const download=await event;const dest=path.join(process.env.TEMP||'/tmp','sigma-audit-export-'+width+'.pdf');await download.saveAs(dest);assert(fs.statSync(dest).size>2000);assert.equal(fs.readFileSync(dest).subarray(0,5).toString(),'%PDF-');
        await modal.getByRole('button',{name:'Cancel',exact:true}).click();assert.equal(await page.locator('#audit-pdf-export').count(),0);
        await page.locator('[data-audit-export=activity]').click();await page.waitForFunction(()=>document.querySelector('[data-count]').textContent==='8 matching records');await page.locator('[name=scope][value=search]').check();assert.equal(await page.locator('[data-count]').textContent(),'1 matching record');
        await page.evaluate(()=>{window.canViewAuditLog=kind=>kind==='activity';});await page.locator('#audit-pdf-export').getByRole('button',{name:'Cancel',exact:true}).click();await page.evaluate(()=>openAuditPdfExport('activity'));assert.equal(await page.locator('[name="log-type"]').count(),1);await page.evaluate(()=>{document.getElementById('audit-pdf-export').remove();openAuditPdfExport('ai');});assert.equal(await page.locator('#audit-pdf-export').count(),0);
        await context.close();
    }
    console.log('PASS actual PDF downloads on desktop/mobile; categories, all 24 records beyond pagination, separate name/ID search, notification direction, Manila dates, selected records and current-search filtering.');
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exit(1)});
