const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('js/admin.js','utf8');
const body={innerHTML:''},pagination={innerHTML:'old pages'};
let resolveRequest;
const cached=[{id:'PD',code:'PD',name:'Personal Development',status:'Draft',type:'Core'}];
const context={console,localStorage:{getItem:()=>JSON.stringify(cached)},SUBJECTS_STORAGE_KEY:'sigma-admin-subjects',
    window:{subjectCatalogState:{ready:false,error:'',records:[]},subjectSearchState:{},subjectPaginationState:{currentPage:1,itemsPerPage:5},location:{hash:'#nav-school-subjects'},hasTableSearchFilters:()=>false,
        SigmaDatabase:{request:()=>new Promise(resolve=>resolveRequest=resolve),preserveLegacy:()=>{}},saveStoredJson:()=>{}},
    document:{addEventListener:()=>{},getElementById:id=>id==='subjectTableBody'?body:id==='subject-pagination-container'?pagination:null},
    getFilteredSubjectsBySearch:()=>context.window.subjectCatalogState.records,escapeHtml:String,renderPaginationControls:()=>{}};
vm.createContext(context);
let start=source.indexOf('function renderSubjectsTable() {'),end=source.indexOf('// USER ACCOUNT MANAGEMENT LOGIC',start);
vm.runInContext(source.slice(start,end),context);
start=source.indexOf('let subjectFetchInFlight = null;');end=source.indexOf('// Initial DB Fetch for subjects',start);
vm.runInContext(source.slice(start,end),context);
(async()=>{
    context.renderSubjectsTable();assert(!body.innerHTML.includes('Draft'));assert(body.innerHTML.includes('Loading subjects'));assert.equal(pagination.innerHTML,'');
    const pending=context.window.fetchSubjectsFromDB();assert.equal(context.window.fetchSubjectsFromDB(),pending,'Concurrent reads are deduplicated');
    context.renderSubjectsTable();assert(!body.innerHTML.includes('Personal Development'));
    resolveRequest({records:[{...cached[0],status:'Published',materials:[{type:'Task'},{type:'Quiz'}]}]});await pending;
    assert(body.innerHTML.includes('Published'));assert(!body.innerHTML.includes('>Draft<'));assert.equal(context.window.subjectCatalogState.records[0].materials.length,2);
    context.window.subjectCatalogState={ready:false,error:'Unable to load subjects.',records:[]};context.renderSubjectsTable();assert(body.innerHTML.includes('Retry'));assert(!body.innerHTML.includes('Draft'));
    // Editors must await the same current database refresh before opening cached payloads.
    const editor=fs.readFileSync('js/subject-editor.js','utf8');assert(editor.includes("window.editSubjectContent = async function (code) {\n" )||editor.includes("window.editSubjectContent = async function (code) {\r\n"));
    assert.equal((editor.match(/if \(window.fetchSubjectsFromDB && !await window.fetchSubjectsFromDB\(\)\) return;/g)||[]).length,2);
    console.log('PASS delayed database loading never renders cached Draft rows; published records and materials appear together; concurrent reads deduplicate and failed reads offer retry.');
})().catch(error=>{console.error(error);process.exit(1)});
