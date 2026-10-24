const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('js/admin.js', 'utf8');
const start = source.indexOf('function renderSubjectsTable() {');
const end = source.indexOf('// USER ACCOUNT MANAGEMENT LOGIC', start);
const body = { innerHTML: '' };
// Deliberately unordered persistent IDs: display numbers must never use these.
const subjects = [6, 5, 18, 44, 59, 21, 90].map(id => ({id, code:'SUB-'+id, name:'Subject '+id, type:'Core', units:3, learningHours:80, status:'Draft'}));
const context = {
    window: {subjectSearchState:{}, subjectPaginationState:{currentPage:1,itemsPerPage:5}, hasTableSearchFilters:state=>!!state.query},
    document:{getElementById:id=>id==='subjectTableBody'?body:null},
    getFilteredSubjectsBySearch:()=>subjects,
    escapeHtml:String,
    renderPaginationControls:()=>{},
};
vm.createContext(context);
vm.runInContext(source.slice(start,end),context);
function render(page,query='') {
    context.window.subjectPaginationState.currentPage=page;
    context.window.subjectSearchState.query=query;
    context.renderSubjectsTable();
    return [...body.innerHTML.matchAll(/<tr\b[\s\S]*?<td\b[\s\S]*?<div[^>]*>(\d+)<\/div>/g)].map(match=>Number(match[1]));
}
assert.deepEqual(render(1),[7,6,5,4,3]);
assert.deepEqual(render(2),[2,1]);
assert.deepEqual(render(1,'Subject'),[1,2,3,4,5]);
assert.deepEqual(render(2,'Subject'),[6,7]);
assert.deepEqual([...body.innerHTML.matchAll(/>(SUB-\d+)<\/div>/g)].map(match=>match[1]),['SUB-21','SUB-90']);
console.log('PASS subject display numbers: descending list, ascending search across pages, unchanged subject order.');
