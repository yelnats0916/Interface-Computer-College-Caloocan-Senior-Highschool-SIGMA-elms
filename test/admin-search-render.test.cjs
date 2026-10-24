const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');const s=fs.readFileSync('js/admin.js','utf8');
const shared=fs.readFileSync('js/shared-components.js','utf8'),window={};vm.runInNewContext(shared.slice(shared.indexOf('// Record numbers are independent'),shared.indexOf('window.getStoredJson = function')),{window,localStorage:{getItem:()=>null,setItem(){}}});
const users=Array.from({length:8},(_,i)=>({id:'user'+i,fullName:'Matching Person '+i,role:'Student',creationNumber:137-i}));
const start=s.indexOf('paginatedUsers.map((user, rowIdx) => {'),end=s.indexOf("}).join('');",start)+"}).join('');".length;assert(start>0);
for(const [query,page,size] of [['A',1,5],['A',2,5],['',1,5],['Matching',1,10]]){
 window.userAccountSearchState={query};const offset=(page-1)*size;
 const context={window,paginatedUsers:users.slice(offset,offset+size),displayUsers:users,totalItems:users.length,startIndex:offset,getStoredJson:()=>users,USER_STORAGE_KEY:'users',getUserInitials:()=>'',resolveUserAvatar:()=>'',normalizeUserRole:r=>r,formatUserCreatedDate:()=>'',escapeHtml:x=>String(x||''),currentLoggedIn:{id:'admin'},isViewerMaster:true,viewerPerms:{}};
 const html=vm.runInNewContext(s.slice(start,end),context);const rows=html.split('<tr ').slice(1);assert.equal(rows.length,Math.min(size,users.length-offset));const numbers=[...html.matchAll(/style="color: #000000 !important;">(\d+)<\/div>/g)].map(m=>Number(m[1]));
 assert.deepEqual(numbers,users.slice(offset,offset+size).map((u,i)=>query?offset+i+1:u.creationNumber));
}
// Check real callback parameters for every modified search table, rather than supplying an invented index.
for(const [file,marker,index] of [['js/admin.js','paginatedSections.map((sec, idx)','idx'],['js/admin.js','paginatedSubjects.map((sub, idx)','idx'],['js/resources-view.js','pagedItems.map((item, rowIdx)','rowIdx'],['js/sigma-ai-results.js','filtered.forEach((item, index)','index']])assert(fs.readFileSync(file,'utf8').includes(marker),file+' search renderer uses '+index);
console.log('PASS full User Accounts row renderer: search, page two, clear search and row limits; other search callback indices checked.');
