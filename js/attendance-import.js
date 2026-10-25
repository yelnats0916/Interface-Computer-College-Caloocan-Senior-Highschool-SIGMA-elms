(function () {
    'use strict';
    const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const norm = value => String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
    const marks = {P:'Present', A:'Absent', L:'Late', E:'Excused'};
    const code = value => ({P:'P',PRESENT:'P',A:'A',ABSENT:'A',L:'L',LATE:'L',E:'E',EXCUSED:'E'})[String(value ?? '').trim().toUpperCase()];
    const day = date => date.toISOString().slice(0, 10);
    function datesBetween(from, to) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) throw Error('Choose a valid From Date and To Date.');
        const dates = [], date = new Date(from + 'T00:00:00Z');
        while (day(date) <= to && dates.length <= 366) { dates.push(day(date)); date.setUTCDate(date.getUTCDate() + 1); }
        if (dates.length > 366) throw Error('Select no more than one school year.');
        return dates;
    }
    const monthsFor = dates => [...new Set(dates.map(date => date.slice(0, 7)))];
    const monthLabel = month => new Date(month + '-01T00:00:00Z').toLocaleDateString('en-US', {month:'long',year:'numeric',timeZone:'UTC'});
    function workbookFor(context, from, to, blank) {
        if (from < context.start || to > context.end) throw Error('Select dates within this section’s school year.');
        const dates = datesBetween(from, to), workbook = XLSX.utils.book_new();
        const published = Object.fromEntries((window.getSubmittedAttendanceDays?.(context.section, context.subject) || []).map(record => [record.date, record.statuses]));
        for (const month of monthsFor(dates)) {
            const columns = dates.filter(date => date.startsWith(month)).map(date => ({dateStr:date,label:date,dayNum:Number(date.slice(8))}));
            const students = context.students.map(student => ({...student,fullName:student.name}));
            const quarters=(context.quarters||[]).filter(q=>q.start<=columns.at(-1).dateStr&&q.end>=columns[0].dateStr);
            const ordinal=['1st','2nd','3rd','4th'];
            const academic={quarter:quarters.map(q=>ordinal[q.quarter-1]+' Quarter').join(' / '),semester:[...new Set(quarters.map(q=>q.quarter<=2?'1st Semester':'2nd Semester'))].join(' / ')};
            const {ws} = window.buildAttendanceTransferWorksheet(columns, `${columns[0].dateStr} to ${columns.at(-1).dateStr}`, students, context.subject, context.section, date => blank ? {} : published[date] || {},academic);
            if (!ws) throw Error('Excel is unavailable.');
            if(ws.C4)ws.C4.v=context.schoolYear;
            columns.forEach((_,index)=>{ws['!cols'][index+3]={wch:13};});
            // Retain the existing sheet layout, with totals that update as teachers enter marks.
            const data=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
            const header=data.findIndex(row=>norm(row[0])==='no.'&&norm(row[2])==='student id'),first=header+1,last=first+students.length-1;
            students.forEach((_,index)=>Object.keys(marks).forEach((mark,offset)=>{
                const r=first+index,c=3+columns.length+offset,address=XLSX.utils.encode_cell({r,c});
                ws[address].f=`COUNTIF(${XLSX.utils.encode_cell({r,c:3})}:${XLSX.utils.encode_cell({r,c:2+columns.length})},"${mark}")`;
            }));
            Object.keys(marks).forEach((mark,offset)=>columns.forEach((_,index)=>{
                const c=index+3,address=XLSX.utils.encode_cell({r:last+2+offset,c});
                ws[address]={...ws[address],t:'n',v:Number(ws[address]?.v)||0,f:`COUNTIF(${XLSX.utils.encode_cell({r:first,c})}:${XLSX.utils.encode_cell({r:last,c})},"${mark}")`};
            }));
            XLSX.utils.book_append_sheet(workbook, ws, month);
        }
        workbook.Custprops = {SIGMA_AttendanceScope:JSON.stringify({section:context.section,subject:context.subject,schoolYear:context.schoolYear})};
        return workbook;
    }
    function parseWorkbook(workbook, context) {
        const roster = new Map(context.students.map(student => [String(student.id),student]));
        const allowed = datesBetween(context.start, context.end), days = {}, sheets = [], seen = new Set();
        if (workbook.SheetNames.length > 12) throw Error('Upload no more than 12 monthly sheets.');
        const metadata = workbook.Custprops?.SIGMA_AttendanceScope;
        if (metadata) {
            let scope; try { scope = JSON.parse(metadata); } catch (_) { throw Error('The workbook’s attendance details are invalid.'); }
            if (['section','subject','schoolYear'].some(key => norm(scope[key]) !== norm(context[key]))) throw Error('This workbook belongs to a different section, subject, or school year.');
        }
        for (const sheetName of workbook.SheetNames) {
            const ws = workbook.Sheets[sheetName], range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
            if (range.e.r > 2000 || range.e.c > 64) throw Error('Use the website’s attendance Excel format.');
            const rows = XLSX.utils.sheet_to_json(ws, {header:1,defval:'',raw:true});
            const header = rows.findIndex(row => norm(row[0]) === 'no.' && norm(row[2]) === 'student id');
            if (header < 0 || header > 20) throw Error(`The attendance headings are missing in ${sheetName}. Use the downloaded template or exported attendance sheet.`);
            // Older website exports keep these details in the visible heading rows.
            const sectionRow = rows.slice(0,header).find(row => norm(row[0]) === 'section:');
            if (sectionRow && (norm(sectionRow[2]) !== norm(context.section) || norm(sectionRow[6]) !== norm(context.subject))) throw Error('This sheet belongs to a different section or subject.');
            const yearRow = rows.slice(0,header).find(row => norm(row[0]) === 'school year:');
            if (yearRow && norm(yearRow[2]) !== norm(context.schoolYear)) throw Error('This sheet belongs to a different school year.');
            if (!metadata && !sectionRow) throw Error('The section and subject headings are missing. Download an attendance template first.');
            const columns = [];
            rows[header].forEach((value, index) => {
                if (index < 3 || /^total\b/i.test(String(value)) || value === '') return;
                let date = String(value).trim();
                if (typeof value === 'number') { const parsed = XLSX.SSF.parse_date_code(value); date = parsed ? `${parsed.y}-${String(parsed.m).padStart(2,'0')}-${String(parsed.d).padStart(2,'0')}` : ''; }
                if (/^\d{1,2}\/\d{1,2}$/.test(date)) {
                    const [m,d] = date.split('/').map(Number), suffix = `${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                    const candidates = allowed.filter(item => item.endsWith(suffix));
                    if (candidates.length !== 1) throw Error(`Cannot determine the year for ${date}. Use a newly downloaded template.`);
                    date = candidates[0];
                }
                if (!allowed.includes(date)) throw Error(`Invalid attendance date in ${sheetName}: ${date}.`);
                if (seen.has(date)) throw Error(`The date ${date} appears more than once.`);
                seen.add(date); columns.push({index,date});
            });
            if (!columns.length) throw Error(`No attendance date columns in ${sheetName}.`);
            const sheetRows = [], ids = new Set();
            for (let r = header + 1; r < rows.length; r++) {
                const row = rows[r], id = String(row[2] ?? '').trim();
                if (!id && !row[0]) continue; // Summary rows are not students.
                const student = roster.get(id);
                if (!student) throw Error(`Student ID ${id || '(missing)'} in ${sheetName} is not in this section.`);
                if (ids.has(id)) throw Error(`Student ID ${id} appears twice in ${sheetName}.`);
                ids.add(id); const values = {};
                for (const column of columns) {
                    const raw = row[column.index];
                    const address = XLSX.utils.encode_cell({r,c:column.index});
                    if (ws[address]?.f) throw Error(`Attendance marks must be typed values, not formulas (${sheetName}, ${address}).`);
                    if (String(raw ?? '').trim() === '') continue;
                    const mark = code(raw);
                    if (!mark) throw Error(`Use P, A, L, or E in ${sheetName}, ${address}.`);
                    if (column.date > context.today) throw Error(`Attendance cannot be submitted for a future date: ${column.date}.`);
                    days[column.date] ||= {}; days[column.date][id] = mark; values[column.date] = mark;
                }
                sheetRows.push({id,name:student.name,values});
            }
            sheets.push({name:sheetName,columns,rows:sheetRows});
        }
        const count = Object.values(days).reduce((sum, values) => sum + Object.keys(values).length, 0);
        if (!count) throw Error('The workbook has no attendance marks to import. Blank cells are left unchanged.');
        return {days,sheets,count};
    }
    window.SigmaAttendanceWorkbook = {datesBetween,workbookFor,parseWorkbook};
    const request = data => window.SigmaDatabase.request('attendance', {data,autoReconnect:false,foreground:true});
    window.openAttendanceTransferMenu = function (button) {
        const previousMenu=document.getElementById('attendance-transfer-menu');previousMenu?._cleanup?.();previousMenu?.remove();
        const menu = document.createElement('div'); menu.id = 'attendance-transfer-menu'; menu.className = 'attendance-transfer-menu'; menu.setAttribute('popover','auto');
        menu.innerHTML = '<button type="button" data-import><i class="fa-solid fa-file-import"></i>Import Excel</button><button type="button" data-export><i class="fa-solid fa-file-export"></i>Export Excel</button>';
        document.body.append(menu);
        if (menu.showPopover) menu.showPopover();
        const position=()=>{
            const rect=button.getBoundingClientRect(),box=menu.getBoundingClientRect(),viewport=window.visualViewport;
            const left=viewport?.offsetLeft||0,top=viewport?.offsetTop||0,width=viewport?.width||innerWidth,height=viewport?.height||innerHeight;
            menu.style.left=Math.max(left+8,Math.min(rect.right-box.width,left+width-box.width-8))+'px';
            const below=rect.bottom+6;
            menu.style.top=Math.max(top+8,Math.min(below+box.height>top+height-8?rect.top-box.height-6:below,top+height-box.height-8))+'px';
        };
        position();
        const controller=new AbortController();
        menu._cleanup=()=>controller.abort();
        window.addEventListener('resize',position,{signal:controller.signal});document.addEventListener('scroll',position,{capture:true,passive:true,signal:controller.signal});
        menu.addEventListener('toggle',()=>{if(!menu.matches(':popover-open')){controller.abort();menu.remove();}});
        menu.querySelector('[data-import]').onclick = () => {controller.abort();menu.remove();window.openAttendanceImport();};
        menu.querySelector('[data-export]').onclick = () => {controller.abort();menu.remove();window.openAttendanceExportModal();};
    };
    window.openAttendanceImport = async function () {
        if (String(window.SigmaDatabase?.currentUser()?.role || '').toLowerCase() === 'student') return;
        const scope = window.getAttendanceTransferScope?.(); if (!scope?.section || !scope.subjectId) return;
        const owner=String(window.SigmaDatabase.currentUser()?.id||'');
        window.closeAttendanceExportModal?.();
        const overlay = document.createElement('div'); overlay.id = 'attendance-export-modal'; overlay.className = "sigma-modal-overlay attendance-import font-['Inter']";
        overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','attendance-import-title');
        overlay.innerHTML = `<button type="button" data-close class="attendance-export-exit-btn fixed top-6 sm:top-10 right-6 sm:right-10 w-10 sm:w-12 h-10 sm:h-12 rounded-full hover:bg-slate-200 hidden sm:flex items-center justify-center text-black transition-all z-[12001] cursor-pointer" title="Exit" aria-label="Close attendance import"><i class="fa-solid fa-xmark text-lg sm:text-xl text-black"></i></button><div class="sigma-modal-shell"><form class="sigma-modal-panel"><div class="sigma-modal-header"><div class="sigma-modal-header-top flex items-center gap-2"><button type="button" data-close class="attendance-export-mobile-return-btn w-8 h-8 rounded-full flex items-center justify-center text-black hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer border-0 p-0 shadow-none outline-none shrink-0 -ml-1 sm:hidden" aria-label="Return"><i class="fa-solid fa-chevron-left text-sm text-black"></i></button><h1 class="sigma-modal-title" id="attendance-import-title">Import Attendance</h1></div></div><div class="sigma-modal-body"><div class="attendance-import-workspace"><div class="attendance-import-mode-tabs" role="tablist" aria-label="Attendance import"><button type="button" role="tab" data-mode="upload" aria-selected="true"><i class="fa-solid fa-cloud-arrow-up" aria-hidden="true"></i><span>Upload Attendance</span></button><button type="button" role="tab" data-mode="template" aria-selected="false"><i class="fa-solid fa-file-excel" aria-hidden="true"></i><span>Download Template</span></button></div><div class="attendance-import-context" data-context></div><div data-content><div class="attendance-import-loading" role="status" aria-label="Loading attendance"><span class="sigma-dot-spinner" aria-hidden="true"></span></div></div><p data-error role="alert"></p></div></div><div class="sigma-modal-footer"></div></form></div>`;
        const previous = {body:document.body.style.overflow,root:document.documentElement.style.overflow};
        const opener = document.activeElement; let busy = false, context, review, activeSheet = 0;
        const content = overlay.querySelector('[data-content]'), footer = overlay.querySelector('.sigma-modal-footer'), error = overlay.querySelector('[data-error]');
        const close = () => {if(busy)return;overlay.remove();document.body.style.overflow=previous.body;document.documentElement.style.overflow=previous.root;document.documentElement.classList.remove('has-modal-open');document.removeEventListener('keydown',escape);opener?.focus({preventScroll:true});};
        const escape = event => {if(event.key==='Escape')close();};overlay.querySelectorAll('[data-close]').forEach(button=>button.onclick=close);document.addEventListener('keydown',escape);
        document.body.style.overflow='hidden';document.documentElement.style.overflow='hidden';document.documentElement.classList.add('has-modal-open');document.body.append(overlay);
        const button = (label, action, secondary = false) => {const b=document.createElement('button');b.type='button';b.className=`attendance-export-download-btn sigma-btn sigma-btn-${secondary?'secondary':'primary'} sigma-btn-md`;b.textContent=label;b.onclick=action;return b;};
        async function run(control, label, work) {
            if(busy)return;busy=true;error.textContent='';const html=control.innerHTML;control.disabled=true;control.setAttribute('aria-busy','true');control.innerHTML=`<span class="sigma-dot-spinner" aria-hidden="true"></span><span>${label}</span>`;
            try{await work();}catch(e){error.textContent=e.message||'Unable to import attendance.';}finally{busy=false;control.disabled=false;control.removeAttribute('aria-busy');control.innerHTML=html;}
        }
        let templateValues=null;
        const tabs=overlay.querySelector('.attendance-import-mode-tabs');
        function mode(value){
            overlay.querySelector('h1').textContent='Import Attendance';
            tabs.hidden=false;tabs.querySelectorAll('[data-mode]').forEach(tab=>tab.setAttribute('aria-selected',String(tab.dataset.mode===value)));
            overlay.dataset.stage=value;
        }
        tabs.querySelector('[data-mode=upload]').onclick=()=>{if(!busy&&context)upload();};
        tabs.querySelector('[data-mode=template]').onclick=()=>{if(!busy&&context)template();};
        function template() {
            mode('template');footer.hidden=false;error.textContent='';const month=`${scope.year}-${String(scope.month+1).padStart(2,'0')}`;
            const from=[month+'-01',context.start].sort().at(-1), to=[day(new Date(Date.UTC(scope.year,scope.month+1,0))),context.end].sort()[0];
            content.innerHTML=`<div class="attendance-import-fields"><label>From Date<input type="date" name="from" min="${context.start}" max="${context.end}" value="${templateValues?.from||(from<=to?from:context.start)}" required></label><label>To Date<input type="date" name="to" min="${context.start}" max="${context.end}" value="${templateValues?.to||(from<=to?to:context.end)}" required></label></div><fieldset class="attendance-import-options"><legend>Template Contents</legend><label class="export-scope-option"><input type="radio" name="contents" value="current" ${templateValues?.contents!=='blank'?'checked':''}><span>Submitted Attendance</span></label><label class="export-scope-option"><input type="radio" name="contents" value="blank" ${templateValues?.contents==='blank'?'checked':''}><span>Blank Attendance</span></label></fieldset>`;
            content.onchange=()=>{const form=overlay.querySelector('form');templateValues={from:form.elements.from.value,to:form.elements.to.value,contents:form.elements.contents.value};};
            const download=button('Download Template',()=>run(download,'Downloading',async()=>{
                const form=overlay.querySelector('form');if(!form.reportValidity())return;
                await window.SigmaAttendance.refresh();
                const workbook=workbookFor(context,form.elements.from.value,form.elements.to.value,form.elements.contents.value==='blank');
                XLSX.writeFile(workbook,`Attendance_${context.section.replace(/[^a-z0-9_-]/gi,'_')}_${form.elements.from.value}_${form.elements.to.value}.xlsx`);busy=false;close();
            }));footer.replaceChildren(download);
        }
        function upload() {
            mode('upload');footer.hidden=true;error.textContent='';review=null;content.onchange=null;
            content.innerHTML=`<input type="file" accept=".xlsx,.xls" data-file hidden><button type="button" class="sigma-dashed-dropzone attendance-import-dropzone" data-drop><span class="sigma-dropzone-icon-box"><i class="fa-solid fa-cloud-arrow-up"></i></span><strong>Upload your attendance sheet</strong><span class="text-black-fade">Drag &amp; drop your Excel file here or <u>browse</u></span><span class="text-black-fade">.xlsx or .xls · Up to 10 MB</span></button>`;
            const file=content.querySelector('[data-file]'),drop=content.querySelector('[data-drop]');
            const read=async file=>run(drop,'Reading workbook',async()=>{
                if(!file||! /\.(xlsx|xls)$/i.test(file.name))throw Error('Upload an Excel workbook (.xlsx or .xls).');
                if(file.size>10*1024*1024)throw Error('The Excel file must be 10 MB or smaller.');
                const workbook=XLSX.read(await file.arrayBuffer(),{type:'array',cellFormula:true,bookVBA:false});
                review=parseWorkbook(workbook,context);activeSheet=0;renderReview();
            });
            drop.onclick=()=>file.click();file.onchange=()=>read(file.files[0]);drop.ondragover=e=>{e.preventDefault();drop.classList.add('dragover');};drop.ondragleave=()=>drop.classList.remove('dragover');drop.ondrop=e=>{e.preventDefault();drop.classList.remove('dragover');read(e.dataTransfer.files[0]);};
            footer.replaceChildren();
        }
        function table(headers, rows) {return `<div class="attendance-import-table" tabindex="0"><table><thead><tr>${headers.map(h=>`<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;}
        function renderReview() {
            mode('upload');overlay.dataset.stage='review';footer.hidden=false;error.textContent='';const sheet=review.sheets[activeSheet];
            content.innerHTML=`<h2>Review Attendance</h2><p>${review.count} marks across ${Object.keys(review.days).length} dates. Blank cells leave existing attendance unchanged.</p><div class="attendance-import-tabs" role="tablist">${review.sheets.map((item,index)=>`<button type="button" role="tab" aria-selected="${index===activeSheet}" data-sheet="${index}">${esc(/^\d{4}-\d{2}$/.test(item.name)?monthLabel(item.name):item.name)}</button>`).join('')}</div>`+table(['No.','Student Name','Student ID',...sheet.columns.map(c=>c.date)],sheet.rows.map((row,index)=>`<tr><td>${index+1}</td><td>${esc(row.name)}</td><td>${esc(row.id)}</td>${sheet.columns.map(c=>`<td class="mark-${row.values[c.date]||'blank'}">${row.values[c.date]||''}</td>`).join('')}</tr>`));
            content.querySelectorAll('[data-sheet]').forEach(tab=>tab.onclick=()=>{activeSheet=Number(tab.dataset.sheet);renderReview();});
            const submit=button('Submit Attendance',()=>run(submit,'Submitting',()=>submitImport()));footer.replaceChildren(button('Change File',upload,true),submit);
        }
        async function submitImport(confirmation={}) {
            if(String(window.SigmaDatabase.currentUser()?.id||'')!==owner)throw Error('The signed-in account changed. Reopen attendance import.');
            const result=await request({...scope,action:'import',days:review.days,...confirmation});
            if(String(window.SigmaDatabase.currentUser()?.id||'')!==owner)throw Error('The signed-in account changed.');
            if(!result.success)throw Error(result.error||'Attendance was not imported.');
            if(result.needsConfirmation){showConflicts(result);return;}
            await window.SigmaAttendance.refresh();
            // Update matching private drafts without discarding unrelated, unsubmitted cells.
            const draftKey='sigma-attendance-drafts:'+String(window.SigmaDatabase.currentUser().id);
            let drafts={};try{drafts=JSON.parse(localStorage.getItem(draftKey)||'{}');}catch(_){}
            const canonical=window.findAttendanceClassroomRecord?.(context.section,context.subject,true)?.data||{};
            const normalize=value=>norm(value).replace(/^grade\s*\d+\s*[-–]?\s*/,'').replace(/[-_]+/g,' ').replace(/\s*&\s*/g,' and ');
            for(const [key,days] of Object.entries(drafts)){
                const [section,subject]=key.split('::');if(normalize(section)!==normalize(context.section)||normalize(subject)!==normalize(context.subject))continue;
                for(const [date,uploaded] of Object.entries(review.days))if(days[date]){
                    const published=canonical[date]||{}, remaining={};
                    for(const [id,value] of Object.entries(days[date].statuses||{})){
                        const student=context.students.find(student=>String(student.id)===id||window.studentNamesMatch?.(student.name,id));
                        const sid=String(student?.id||id);if(!uploaded[sid]&&code(value)!==code(published.statuses?.[sid]))remaining[sid]=value;
                    }
                    if(Object.keys(remaining).length)days[date]={...days[date],statuses:{...published.statuses,...remaining},submitted:false};else delete days[date];
                    if(window.attendanceEditingDays)window.attendanceEditingDays[date]=false;
                }
            }
            localStorage.setItem(draftKey,JSON.stringify(drafts));window.dispatchEvent(new CustomEvent('sigma:attendance-changed',{detail:{remote:true}}));
            busy=false;close();window.showToastNotification?.(`${result.importedMarks} attendance marks submitted successfully.`,'success');
        }
        function showConflicts(result) {
            tabs.hidden=true;overlay.dataset.stage='confirm';footer.hidden=false;error.textContent='';overlay.querySelector('h1').textContent='Confirm Attendance Changes';
            content.innerHTML=`<h2>Replace Existing Marks?</h2><p>${result.conflicts.length} existing marks will change. Blank cells and other attendance marks will remain unchanged.</p>`+table(['Student Name','Student ID','Date','Current','Uploaded'],result.conflicts.map(row=>`<tr><td>${esc(row.name)}</td><td>${esc(row.id)}</td><td>${esc(row.date)}</td><td>${esc(row.before)}</td><td>${esc(row.after)}</td></tr>`));
            const confirm=button('Confirm Changes',()=>run(confirm,'Submitting',()=>submitImport({overwrite:true,revision:result.revision})));
            footer.replaceChildren(button('Back to Review',()=>{overlay.querySelector('h1').textContent='Import Attendance';renderReview();},true),confirm);overlay.querySelector('.sigma-modal-body').scrollTop=0;
        }
        overlay.querySelector('form').onsubmit=event=>event.preventDefault();
        try {const result=await request({...scope,action:'import-context'});if(!result.success||!result.context)throw Error(result.error||'Unable to load attendance.');if(!overlay.isConnected)return;context=result.context;if(!context.students.length)throw Error('No students are assigned to this section.');overlay.querySelector('[data-context]').innerHTML=`<strong>${esc(context.section)}</strong><span>${esc(context.subject)}</span><span>S.Y. ${esc(context.schoolYear)}</span>`;upload();}
        catch(e){content.replaceChildren();error.textContent=e.message;}
    };
})();
