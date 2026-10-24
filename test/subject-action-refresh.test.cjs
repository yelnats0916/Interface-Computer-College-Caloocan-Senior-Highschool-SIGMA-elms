const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const source=fs.readFileSync('js/admin.js','utf8');
function between(start,end){const a=source.indexOf(start),b=source.indexOf(end,a);assert(a>=0&&b>a);return source.slice(a,b);}
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
    const p=await browser.newPage();
    for(const width of [1440,375]){
        await p.setViewportSize({width,height:800});
        await p.setContent('<style>.action-dropdown-menu{display:none}.action-dropdown-menu.show{display:block}.action-dots-btn{width:44px;height:44px}</style><table><tbody id="subjectTableBody"></tbody></table><div id="subject-pagination-container"></div><div id="editor" hidden>Editor</div>');
        await p.evaluate(()=>{
            window.subjectCatalogState={ready:true,records:[{id:'subject-1',code:'PD',name:'Personal Development',type:'Core',units:3,learningHours:80,status:'Published'}]};
            window.subjectSearchState={};window.subjectPaginationState={currentPage:1,itemsPerPage:5};
            window.getFilteredSubjectsBySearch=()=>subjectCatalogState.records;window.escapeHtml=String;window.renderPaginationControls=()=>{};
            window.hasTableSearchFilters=()=>false;window.positionActionDropdown=()=>{};window.resetActionDropdownPosition=()=>{};
            window.closeAllTableActionDropdowns=except=>document.querySelectorAll('.action-dropdown-menu.show').forEach(menu=>{if(menu!==except)menu.classList.remove('show');});
            window.editSubject=()=>document.getElementById('editor').hidden=false;
            window.editSubjectContent=()=>document.getElementById('editor').hidden=false;
        });
        await p.addScriptTag({content:between('function renderSubjectsTable() {','// USER ACCOUNT MANAGEMENT LOGIC')});
        await p.addScriptTag({content:between('window.toggleSubjectActionDropdown = function','window.switchPermissionsCategoryTab')});
        await p.addScriptTag({content:between('// Apply a deferred catalog refresh','// Initial DB Fetch for subjects')});
        await p.evaluate(()=>{renderSubjectsTable();document.addEventListener('click',event=>{if(event.target.closest('.action-dropdown-item'))closeAllTableActionDropdowns();});});
        const button=p.locator('#subject-dots-btn-0');
        await button.evaluate(element=>window.initialButton=element);
        await p.evaluate(()=>renderSubjectsTable());
        assert(await button.evaluate(element=>element===initialButton),'Identical refresh keeps the same action button');
        await button.scrollIntoViewIfNeeded();
        const box=await button.boundingBox();await p.mouse.move(box.x+box.width/2,box.y+box.height/2);await p.mouse.down();
        await p.evaluate(()=>{subjectCatalogState.records[0].name='Current subject';renderSubjectsTable();});
        await p.mouse.up();
        assert(await p.locator('#subject-action-menu-0').isVisible(),'First click opens despite a refresh between pointerdown and click');
        await p.evaluate(()=>{subjectCatalogState.records[0].name='Latest subject';renderSubjectsTable();});
        assert(await p.locator('#subject-action-menu-0').isVisible(),'Refresh does not dismiss an open menu');
        await p.getByRole('button',{name:'Add/Edit Topics & Materials'}).click();
        assert(await p.locator('#editor').isVisible(),'First Add/Edit click opens the editor');
        await p.waitForFunction(()=>document.getElementById('subjectTableBody').textContent.includes('Latest subject'));
    }
    console.log('PASS desktop/mobile first-click action menus and Add/Edit survive concurrent subject refresh; deferred updates apply after selection.');
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exit(1)});
