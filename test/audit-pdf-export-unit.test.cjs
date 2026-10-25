const fs=require('node:fs'),assert=require('node:assert/strict');
const js=fs.readFileSync('js/audit-pdf-export.js','utf8');const open=js.slice(js.indexOf('window.openAuditPdfExport ='),js.indexOf('    function init()'));
assert(open.includes('openSigmaDateRangeExport'));assert(!/scope|review|checkbox|user-search|preview/i.test(open));assert(open.includes('source(kind)'));assert(open.includes('matches(row,filter)'));assert(js.includes('columnStyles:'));assert(js.includes('showHead:'));
console.log('PASS context-only date form and fixed-width multipage PDF');
