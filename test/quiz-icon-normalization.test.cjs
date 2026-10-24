const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('js/shared-components.js','utf8');
const start=source.indexOf('window.normalizeQuizIcon = function');
const end=source.indexOf('window.getQuizStorageIconInfo = function',start);
const context={window:{}};vm.createContext(context);vm.runInContext(source.slice(start,end),context);
for(const value of ['bi-journal-check','','unknown','fa-nonexistent'])assert.equal(context.window.normalizeQuizIcon(value),'fa-bolt-lightning');
for(const icon of ['fa-pen-nib','fa-code','fa-calculator','fa-brain']){
    assert.equal(context.window.normalizeQuizIcon(icon),icon);
    assert.equal(context.window.normalizeQuizIcon('fa-solid '+icon),icon);
}
assert(source.includes('window.normalizeQuizIcon(rawIcon)'));
const detailsEnd=source.indexOf('window.findLibraryQuizFile',end);
context.localStorage={getItem:()=>null};context.window.getStoredQuizLibrary=()=>[];
vm.runInContext(source.slice(end,detailsEnd),context);
for(const key of ['icon','quizIcon','selectedQuizIcon']){
    const details=context.window.getQuizStorageIconInfo({[key]:'bi-journal-check',title:'Saved quiz'});
    assert.equal(details.icon,'fa-bolt-lightning');
    assert.equal(details.iconCls,'fa-solid fa-bolt-lightning');
}
const creator=fs.readFileSync('js/quiz-creator.js','utf8');
assert(creator.includes('currentQuizIcon = window.normalizeQuizIcon(quiz.icon)'));
assert(creator.includes('!await window.saveQuizToServer(entry)'));
const api=fs.readFileSync('php/api/quiz_library.php','utf8');
assert(api.includes('sigmaNormalizeQuizIcon($quiz[\'icon\']'));
assert(api.includes('sigmaNormalizeQuizIcon($row[\'icon\']'));
console.log('PASS supported quiz icons survive load/save; incompatible icons fall back to a supported creator icon; database save confirmation remains required.');
