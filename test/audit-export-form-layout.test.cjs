const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 for(const width of [1440,375]){
  const page=await browser.newPage({viewport:{width,height:800},acceptDownloads:true});
  await page.route('http://export.test/**',r=>{const file=new URL(r.request().url()).pathname.slice(1);return file.startsWith('js/vendor/')?r.fulfill({contentType:'text/javascript',body:fs.readFileSync(file)}):r.fulfill({contentType:'text/html',body:'<section id="audit-notifications-view"><div><table class="sigma-audit-table"></table></div></section>'});});await page.goto('http://export.test/');
  const html=fs.readFileSync('admin.html','utf8');for(const [,file]of html.matchAll(/<link[^>]*href="(css\/[^"?]+)(?:\?[^"]*)?"[^>]*>/g))await page.addStyleTag({content:fs.readFileSync(file,'utf8')});
  await page.evaluate(()=>{
   window.canViewAuditLog=()=>true;window.getStoredJson=()=>[];
   window.SigmaDatabase={request:async()=>({success:true,records:[]})};
   window.SigmaNotifications={getLogs:()=>Array.from({length:12},(_,i)=>({id:'notice-'+i,notificationId:'notice-'+i,title:'Quarter reminder '+i,senderId:'101',senderName:'School Admin',senderRole:'Admin',recipientId:'202',recipient:'Teacher One',role:'teacher',status:'Created',timestamp:'2026-10-25T00:17:00Z'}))};
  });await page.addScriptTag({content:fs.readFileSync('js/audit-pdf-export.js','utf8')});await page.evaluate(()=>document.dispatchEvent(new Event('DOMContentLoaded')));await page.locator('[data-audit-export]').click();const modal=page.locator('#audit-pdf-export');await page.waitForFunction(()=>document.querySelector('[data-count]').textContent.includes('12 matching'));
  const styles=await modal.evaluate(e=>({bg:getComputedStyle(e).backgroundColor,blur:getComputedStyle(e).backdropFilter,padding:getComputedStyle(e).padding,scroll:e.scrollTop,radius:getComputedStyle(e.querySelector('.sigma-modal-panel')).borderRadius}));assert.equal(styles.bg,'rgb(248, 250, 252)');assert.equal(styles.blur,'none');assert.equal(styles.padding,'0px');assert.equal(styles.scroll,0);assert.equal(styles.radius,'0px');
  assert.equal(await modal.getByRole('button',{name:'Cancel',exact:true}).count(),0);assert.equal(await modal.locator('[data-close]').count(),1);assert.equal(await modal.locator('[data-step-container="2"]').isVisible(),false);assert.equal(await modal.locator('[data-step-container="1"]').isVisible(),true);assert(await modal.locator('.sigma-modal-title').isVisible());
  await modal.screenshot({path:path.join(process.env.TEMP,'sigma-export-form-v225-'+width+'.png')});
  await modal.locator('[data-action="step-toggle"]').click();assert.equal(await modal.locator('[data-step-container="1"]').isVisible(),false);assert.equal(await modal.locator('[data-step-container="2"]').isVisible(),true);assert.equal(await modal.locator('[data-preview-body] tr').count(),10);
  const download=page.waitForEvent('download');await modal.locator('[data-download]').click();const result=await download;const dest=path.join(process.env.TEMP,'sigma-export-form-v225-'+width+'.pdf');await result.saveAs(dest);assert.equal(fs.readFileSync(dest).subarray(0,5).toString(),'%PDF-');
  await modal.locator('[data-close]').click();assert.equal(await page.locator('#audit-pdf-export').count(),0);await page.close();
 }
 console.log('PASS full-page export form on desktop/mobile: opaque sides, no blur, no Cancel, one X, initial top position, separate filter/review steps, paginated preview and actual PDF download.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
