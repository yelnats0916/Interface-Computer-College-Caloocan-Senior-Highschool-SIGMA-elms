const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{for(const width of [1280,375]){
 const page=await browser.newPage({viewport:{width,height:800}});await page.setContent('<html><body><div id="footer" style="display:flex;justify-content:flex-end;gap:12px"><button id="save" style="display:inline-flex;padding:12px 24px;background:green"><i class="fa-solid fa-circle-notch fa-spin hidden" id="icon"></i><span>Create School Year</span></button><button id="invalid" disabled>Save Changes</button></div><div id="panel" aria-busy="true"><button id="normal">Open</button></div></body></html>');
 await page.addStyleTag({content:'.hidden{display:none!important}'});await page.addStyleTag({path:'css/content-loading.css'});await page.addScriptTag({path:'js/content-loading.js'});
 assert.equal(await page.locator('.sigma-action-loading').count(),0,'Invalid disabled button and busy panel must not hide controls');
 const size=await page.locator('#save').boundingBox();await page.evaluate(()=>document.querySelector('#icon').classList.remove('hidden'));
 await page.locator('.sigma-action-loading').waitFor();assert(!await page.locator('#save').isVisible());let rect=await page.locator('.sigma-action-loading').boundingBox();assert(rect.width>=size.width);assert(rect.height>=size.height);
 assert.equal(await page.locator('.sigma-action-loading .sigma-dot-spinner').evaluate(el=>getComputedStyle(el).width),width===375?'24px':'32px');
 await page.evaluate(()=>document.querySelector('#icon').classList.add('hidden'));await page.locator('.sigma-action-loading').waitFor({state:'detached'});assert(await page.locator('#save').isVisible());assert.equal(await page.locator('#save').evaluate(el=>el.style.display),'inline-flex');
 for(const type of ['aria','text','spinner','class']){
  await page.evaluate(type=>{const b=document.querySelector('#save');if(type==='aria')b.setAttribute('aria-busy','true');if(type==='text'){b.disabled=true;b.textContent='Submitting...';}if(type==='spinner')b.innerHTML='<span class="sigma-dot-spinner"></span><span>Downloading</span>';if(type==='class')b.classList.add('is-loading');},type);
  await page.locator('.sigma-action-loading').waitFor();assert.equal(await page.locator('.sigma-action-loading').count(),1);
  await page.evaluate(()=>{const b=document.querySelector('#save');b.removeAttribute('aria-busy');b.disabled=false;b.classList.remove('is-loading');b.textContent='Save Changes';});await page.locator('.sigma-action-loading').waitFor({state:'detached'});
 }
 await page.evaluate(()=>{const b=document.querySelector('#save');b.setAttribute('aria-busy','true');});await page.locator('.sigma-action-loading').waitFor();await page.locator('#save').evaluate(el=>el.remove());await page.locator('.sigma-action-loading').waitFor({state:'detached'});
 console.log('PASS dots-only action feedback, layout, restore on failure/completion, detached cleanup, no invalid-button spinner',width);await page.close();
}}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});

