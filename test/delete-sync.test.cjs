const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');
(async()=>{
 const src=read('js/subject-editor.js');const fn=src.slice(src.indexOf('    window.deleteSubject = async'),src.indexOf('    // Auto-mount on load',src.indexOf('    window.deleteSubject = async')));
 for(const result of [true,false]){
  let stored=[{code:'X'},{code:'Y'}],renders=0,toasts=0,release;
  const window={subjectCatalogState:{ready:true,records:stored},deleteSubjectFromDB:()=>new Promise(r=>release=r),toggleSubjectOverlay:()=>{},dispatchEvent:()=>{},renderSubjectsTable:()=>renders++,showToast:()=>toasts++};
  vm.runInNewContext(fn,{window,document:{getElementById:()=>null},SUBJECTS_STORAGE_KEY:'subjects',_getStored:()=>stored,_saveStored:(k,v)=>stored=v,canCurrentSubjectEditorDeleteSubject:()=>true,CustomEvent:class{}});
  const pending=window.deleteSubject('X');assert.equal(stored.length,2);await window.deleteSubject('X');release(result);await pending;
  assert.equal(stored.length,result?1:2);assert.equal(window.subjectCatalogState.records.length,result?1:2);assert.equal(renders,result?1:0);assert.equal(toasts,result?1:0);assert.equal(window._subjectDeletionPending,false);
 }
 const shared=read('js/shared-components.js');const qfn=shared.slice(shared.indexOf('const pendingQuizDeletes ='),shared.indexOf('// Initial fetch from server',shared.indexOf('const pendingQuizDeletes =')));
 for(const success of [true,false]){
  let requests=0;
  const window={SIGMA_USE_SERVER_STORAGE:true,_quizLibraryServerData:[{id:'Q'}],SigmaDatabase:{fetch:async(url,options)=>{requests++;assert.equal(options.foreground,true);return {};},readJson:async()=>({success,error:'Denied'})},showToast:()=>{}};
  vm.runInNewContext(qfn,{window,resolveQuizApiUrl:x=>x,encodeURIComponent,Map});
  const results=await Promise.all([window.deleteQuizFromServer('Q'),window.deleteQuizFromServer('Q')]);assert.equal(requests,1);assert.equal(results[0],success);assert.equal(window._quizLibraryServerData.length,success?0:1);
 }
 const admin=read('js/admin.js');const section=admin.slice(admin.indexOf('window.deleteSection = function'),admin.indexOf('window.showSectionConfirm =',admin.indexOf('window.deleteSection = function')));
 for(const success of [true,false]){
  let stored=[{id:'S',name:'Einstein'}],proceed,rendered=0,release;
  const window={currentEditingSectionId:'S',getLoggedInAdminUser:()=>({role:'Master Admin'}),showSectionConfirm:(t,m,cb)=>proceed=cb,deleteSectionFromDB:()=>new Promise(r=>release=r),toggleSectionOverlay:()=>{},dispatchEvent:()=>{}};
  vm.runInNewContext(section,{window,document:{getElementById:()=>null},normalizeUserRole:x=>x,getStoredJson:()=>stored,saveStoredJson:(k,v)=>stored=v,SECTIONS_STORAGE_KEY:'sections',renderSectionsTable:()=>rendered++,Event:class{}});
  window.deleteSection('S');const pending=proceed();assert.equal(stored.length,1);release(success);await pending;assert.equal(stored.length,success?0:1);assert.equal(rendered,success?1:0);
 }
 console.log('PASS subject and section deletion waits for server, failed deletes retain records, subject catalog updates immediately; quiz failures and duplicate clicks handled');
})().catch(e=>{console.error(e);process.exitCode=1;});
