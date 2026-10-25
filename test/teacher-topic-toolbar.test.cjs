const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const shared=fs.readFileSync('js/shared-components.js','utf8'),teacher=fs.readFileSync('js/teacher.js','utf8');
const slice=(source,start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{for(const width of [1280,375]){
const page=await browser.newPage({viewport:{width,height:800}});
await page.setContent(`<style>.hidden{display:none}button{padding:12px}</style><div style="display:none"><div id="topic-detail-manage-dropdown-menu" class="shared-manage-curriculum-menu hidden"></div></div><section id="detail-section-topics"><div id="room-topics-mount"><div class="teacher-topic-toolbar"><div class="manage-curriculum-dropdown-container"><button class="manage-curriculum-dropdown-btn" onclick="toggleSharedManageDropdown(event,'topic-detail-manage-dropdown-menu')">Topics & Materials</button><div id="topic-detail-manage-dropdown-menu" class="shared-manage-curriculum-menu hidden" onclick="event.stopPropagation()"><button onclick="event.stopPropagation();closeAllSharedManageDropdowns();window.opened++">Add / Edit</button><button onclick="event.stopPropagation();closeAllSharedManageDropdowns();window.released++">Release & Schedule</button></div></div></div></div></section>`);
await page.evaluate(()=>{window.opened=0;window.released=0;window.currentTopicState={subjectId:'oral'};window.getTopicData=()=>({text:'Oral'});window.renderRoomQuarterSwitchHtml=()=>'<details><summary>2nd Quarter</summary><button>1st Quarter</button></details>';});
await page.addScriptTag({content:slice(shared,'window.toggleSharedManageDropdown =','window.buildTopicSectionSelectorCard =')});
await page.addScriptTag({content:slice(shared,'window.syncRoomQuarterSwitch =','// --- CANONICAL SHARED TOPIC WORKSTATION TAB BAR')});
await page.addScriptTag({content:slice(teacher,'    function _refreshTopicPageRail()','    window.refreshTopicProgressRail =')+'\nwindow.refreshTopicProgressRail=_refreshTopicPageRail;'});
const renderCommit=slice(shared,'    const pageHtml = `\n        <div class="topic-page-shell', '    if (options.embedded === true) {\n        window._roomQuarterSubjectId');
await page.addScriptTag({content:'window.commitTopicHtml=function(containerEl,topicsBodyHtml){const embeddedClass="",quarterHeaderHtml="";'+renderCommit+'};'});
await page.evaluate(()=>{const mount=document.getElementById('room-topics-mount');const html=mount.innerHTML;commitTopicHtml(mount,html);syncRoomQuarterSwitch();window.originalButton=document.querySelector('.manage-curriculum-dropdown-btn');window.testHtml=html;});

await page.getByText('Topics & Materials',{exact:true}).click();
assert.equal(await page.getByText('Add / Edit',{exact:true}).isVisible(),true);
await page.evaluate(()=>{refreshTopicProgressRail();commitTopicHtml(document.getElementById('room-topics-mount'),testHtml);syncRoomQuarterSwitch();});
assert.equal(await page.getByText('Add / Edit',{exact:true}).isVisible(),true);
assert.equal(await page.getByText('2nd Quarter',{exact:true}).isVisible(),true);
await page.getByText('Add / Edit',{exact:true}).click();assert.equal(await page.evaluate(()=>opened),1);
await page.getByText('Topics & Materials',{exact:true}).click();await page.getByText('Release & Schedule',{exact:true}).click();assert.equal(await page.evaluate(()=>released),1);
await page.locator('summary').click();await page.evaluate(()=>{syncRoomQuarterSwitch();refreshTopicProgressRail();});assert.equal(await page.locator('details').getAttribute('open'),'');
assert.equal(await page.evaluate(()=>originalButton===document.querySelector('.manage-curriculum-dropdown-btn')),true);
assert.equal(await page.locator('[data-room-quarter-switch]').count(),1);
await page.mouse.click(width-5,790);assert.equal(await page.getByText('Add / Edit',{exact:true}).isVisible(),false);
await page.close();console.log('PASS teacher topic actions and quarter survive progress refresh at',width);}
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
