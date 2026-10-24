const fs=require('fs'),assert=require('node:assert/strict');const{chromium}=require('playwright');
const shared=fs.readFileSync('js/shared-components.js','utf8').replace(/\r\n/g,'\n'),creator=fs.readFileSync('js/quiz-creator.js','utf8').replace(/\r\n/g,'\n');
const stored=shared.slice(shared.indexOf('window.getStoredQuizLibrary = function'),shared.indexOf('window.saveStoredQuizLibrary = function'));
const loader=shared.slice(shared.indexOf('// --- REAL-TIME CROSS-TAB'),shared.indexOf('/**\n * Save a single quiz object'));
const creatorStored=creator.slice(creator.indexOf('const getStoredQuizLibrary ='),creator.indexOf('const saveStoredQuizLibrary ='));
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 for(const mobile of [false,true]){
 const c=await browser.newContext(mobile?{viewport:{width:390,height:844},isMobile:true}:{});let records=[{id:'q1',title:'Saved quiz',questions:[{answer:'A'}]}],fail=false;
 await c.route('https://sync.test/**',r=>r.request().url().includes('quiz_library.php')?r.fulfill({status:fail?503:200,contentType:'application/json',body:JSON.stringify({success:!fail,quizzes:records})}):r.fulfill({contentType:'text/html',body:'<div id="open-quiz-library-modal"><input id="library-modal-search-input" value="Saved"></div>'}));
 const p=await c.newPage();await p.goto('https://sync.test/quiz-creator.html');
 await p.evaluate(()=>{window.verified=false;window.actor={id:'admin',role:'admin'};sessionStorage.setItem('sigma-grade-sync-session',JSON.stringify({token:'token'}));window.SigmaSessionNavigation={isVerified:()=>verified};window.getTabSessionUser=()=>actor;window.SigmaDatabase={fetch:(...a)=>fetch(...a)};window.renders=[];window.renderLibraryModalQuizzes=q=>renders.push({q,ids:getStoredQuizLibrary().map(q=>q.id)});window.SIGMA_USE_SERVER_STORAGE=true;});
 await p.addScriptTag({content:stored+loader+creatorStored});
 assert.deepEqual(await p.evaluate(()=>getStoredQuizLibrary()),[]);
 await p.evaluate(()=>{verified=true;dispatchEvent(new Event('sigma:database-session-ready'));});await p.waitForFunction(()=>renders.some(r=>r.ids.includes('q1')));
 assert.equal(await p.evaluate(()=>renders.at(-1).q),'Saved');
 records=[];await p.evaluate(()=>fetchQuizLibraryFromServer());assert.deepEqual(await p.evaluate(()=>getStoredQuizLibrary()),[]);
 await p.evaluate(()=>localStorage.setItem('quizLibrary',JSON.stringify([{id:'stale'}])));assert.deepEqual(await p.evaluate(()=>getStoredQuizLibrary()),[]);
 records=[{id:'q2'}];await p.evaluate(()=>fetchQuizLibraryFromServer());
 fail=true;await p.evaluate(()=>fetchQuizLibraryFromServer());assert.deepEqual(await p.evaluate(()=>getStoredQuizLibrary().map(q=>q.id)),['q2']);
 fail=false;await p.evaluate(()=>{actor={id:'teacher',role:'teacher'};sessionStorage.setItem('sigma-grade-sync-session',JSON.stringify({token:'other'}));});assert.deepEqual(await p.evaluate(()=>getStoredQuizLibrary()),[]);
 await c.close();
 }
 assert(creator.includes('window.openQuizLibraryModal = function () {\n    void window.fetchQuizLibraryFromServer?.();'));
 console.log('PASS clean desktop/mobile contexts: delayed session, server hydration, actual creator renderer, preserved search, empty/revoked server list, stale local cache, offline retry and identity isolation.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});

