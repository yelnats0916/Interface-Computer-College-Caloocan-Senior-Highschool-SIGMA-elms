const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('js/subject-editor.js', 'utf8');
const handlers = source.slice(source.indexOf('    window.editSubject = async function'), source.indexOf('    window.deleteSubjectPrompt = function'));
(async () => {
 for (const action of ['editSubject', 'editSubjectContent']) {
  let reads = 0, opened = 0, release;
  const window = {
   subjectCatalogState: {ready:true, records:[{id:6,code:'RW-11-12'}]},
   fetchSubjectsFromDB: () => {reads++;return new Promise(resolve => {release=resolve;});},
   openSubjectEditor: () => opened++, openSharedTopicsAndMaterials: () => opened++
  };
  vm.runInNewContext(handlers,{window});
  await window[action]('RW-11-12');
  assert.equal(reads,0,'An already loaded database subject opens without another network request');assert.equal(opened,1);
  window.subjectCatalogState.ready=false;
  const pending=window[action]('RW-11-12');assert.equal(reads,1);assert.equal(opened,1,'Unloaded data waits for the server');
  release(false);await pending;assert.equal(opened,1,'Failed retrieval must not open stale data');
  const success=window[action]('RW-11-12');release(true);await success;assert.equal(opened,2);
 }
 console.log('PASS subject edit/content opens immediately from loaded database records, initial reads and failures remain protected');
})().catch(e=>{console.error(e);process.exitCode=1;});
