(function () {
    'use strict';
    const headers = ['Student ID', 'Student Name', 'Assessment ID', 'Assessment', 'Highest Possible Score', 'Score', 'Status'];
    const statuses = ['none', 'missing', 'absent', 'incomplete', 'excuse'];
    const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    function buildLegacy(context, XLSX) {
        const book = XLSX.utils.book_new();
        const rows = [headers];
        context.students.forEach(student => context.items.forEach(item => rows.push([student.id, student.name, item.id, item.title, item.max, '', ''])));
        const sheet = XLSX.utils.aoa_to_sheet(rows);
        sheet['!cols'] = [20,32,30,55,25,14,18].map(wch => ({wch}));
        sheet['!autofilter'] = { ref: XLSX.utils.encode_range({s:{r:0,c:0},e:{r:rows.length-1,c:6}}) };
        for(let c=0;c<7;c++) sheet[XLSX.utils.encode_cell({r:0,c})].s={font:{bold:true,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'15803D'}},alignment:{wrapText:true}};
        XLSX.utils.book_append_sheet(book, sheet, 'Grades');
        XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([
            ['SIGMA_GRADEBOOK_IMPORT_V1', context.subjectId, context.section, context.quarter, context.schoolYear],
            ['Subject',context.subject], ['Instructions','Enter raw assessment scores, not percentages or final quarterly grades.'],
            ['Blank cells','Leave Score and Status blank to keep the saved grade unchanged. Zero is a valid score.'],
            ['Status','None, Missing, Absent, Incomplete, Excuse. Blank keeps the saved status.'],
            ['Keep identifiers','Do not change Student ID, Assessment ID, context, or Highest Possible Score.']
        ]), 'Instructions');
        return book;
    }
    function taskContext(context) {
        const items=context.items.filter(item=>!item.isQuiz);
        if(!context.exportData)return {...context,items};
        const allowed=new Set(items.map(item=>item.id));
        const positions=context.exportData.groups.map(group=>group.items.map((item,index)=>({item,index})).filter(({item})=>{const raw=item.rawItem||item;return allowed.has(String(raw.id||raw.materialId||raw.assessmentId||item.id||''));}));
        return {...context,items,exportData:{...context.exportData,
            groups:context.exportData.groups.map((group,index)=>({...group,items:positions[index].map(entry=>entry.item)})),
            rows:context.exportData.rows.map(row=>({...row,scores:positions.map((entries,index)=>entries.map(entry=>row.scores[index][entry.index]))}))}};
    }
    function buildCurrent(context, XLSX) {
        const book=window.buildGradebookExcel(context.exportData,'assessments',XLSX), mapping=[];
        let column=4;
        context.exportData.groups.forEach(group=>{
            group.items.forEach(item=>{
                const raw=item.rawItem||item,id=String(raw.id||raw.materialId||raw.assessmentId||item.id||'');
                const canonical=context.items.find(entry=>entry.id===id);
                if(!canonical)throw Error('Assessment mapping changed. Reopen the gradebook.');
                mapping.push([column++,id,canonical.title,canonical.max]);
            });
            column+=3;
        });
        const info=[['SIGMA_GRADEBOOK_IMPORT_V4',context.subjectId,context.section,context.quarter,context.schoolYear],
            ['Instructions','Current task scores are included; quizzes are excluded. Only tasks with a recorded numeric grade can be corrected. Keep numeric scores in the cells. Copy exact legend fills: Missing #EFDADA, Absent #EBEBEB, Incomplete #FFEDA0, Excuse #DBDFF0. No Fill or white means None. Other shades and status words are rejected. Blank numeric cells keep the saved score. Calculated totals are not imported.'],
            ['Keep identifiers','Keep student IDs, assessment headings, HPS and mapping unchanged.'],
            ['Column','Assessment ID','Title','HPS'],...mapping];
        const instructions=XLSX.utils.aoa_to_sheet(info);instructions['!cols']=[{wch:28},{wch:100},{wch:55},{wch:18}];
        XLSX.utils.book_append_sheet(book,instructions,'Instructions');return book;
    }
    function build(context, XLSX) {
        context=taskContext(context);
        if(context.exportData)return buildCurrent(context,XLSX);
        const book=XLSX.utils.book_new(), rows=[], count=Math.max(8,4+context.items.length), merges=[];
        const put=(r,c,v)=>{rows[r]||=[];rows[r][c]=v;};
        put(0,0,context.school||'Interface Computer College');put(1,0,'Class Record — Import Template');
        for(const r of [0,1])merges.push({s:{r,c:0},e:{r,c:count-1}});
        [[2,'School Year:',context.schoolYear,'Quarter:',context.quarter],[3,'Subject Code:',context.subjectId,'',''],[4,'Section:',context.section,'Subject:',context.subject],[5,'Teacher:',context.teacher||'Assigned Teacher','Semester:',context.quarter<=2?'1st Semester':'2nd Semester']].forEach(([r,l,v,l2,v2])=>{put(r,0,l);put(r,2,v);put(r,4,l2);put(r,5,v2);merges.push({s:{r,c:0},e:{r,c:1}});if(l2)merges.push({s:{r,c:5},e:{r,c:7}});});
        ['No.','Name','Student ID'].forEach((v,c)=>put(8,c,v));put(9,3,'HPS/Weights');
        context.items.forEach((item,i)=>{put(7,i+4,item.group||'Assessments');put(8,i+4,item.title);put(9,i+4,item.max);});
        context.students.forEach((student,i)=>{put(i+10,0,i+1);put(i+10,1,student.name);put(i+10,2,student.id);context.items.forEach((_,j)=>put(i+10,j+4,''));});
        let groupStart=0;while(groupStart<context.items.length){let end=groupStart;while(end+1<context.items.length&&(context.items[end+1].group||'Assessments')===(context.items[groupStart].group||'Assessments'))end++;if(end>groupStart)merges.push({s:{r:7,c:groupStart+4},e:{r:7,c:end+4}});groupStart=end+1;}
        const sheet=XLSX.utils.aoa_to_sheet(rows);sheet['!merges']=merges;sheet['!cols']=[{wch:6},{wch:34},{wch:20},{wch:18},...Array.from({length:count-4},()=>({wch:28}))];
        sheet['!rows']=rows.map((_,i)=>({hpt:i===8?78:i<6?30:26}));
        for(let r=0;r<rows.length;r++)for(let c=0;c<count;c++){
            const addr=XLSX.utils.encode_cell({r,c});sheet[addr]||={t:'s',v:''};
            const green=r<2||(r===7&&c>=4);
            sheet[addr].s={font:{name:'Calibri',sz:r<2?16:11,bold:r<2||r===8||r===9,color:{rgb:green?'FFFFFF':'000000'}},fill:{fgColor:{rgb:green?'15803D':'FFFFFF'}},alignment:{horizontal:c===1&&r>=10?'left':'center',vertical:'center',wrapText:true},border:{bottom:{style:'thin',color:{rgb:'D9E2EE'}},right:{style:'thin',color:{rgb:'D9E2EE'}}}};
        }
        XLSX.utils.book_append_sheet(book,sheet,'Grades');
        const info=[['SIGMA_GRADEBOOK_IMPORT_V2',context.subjectId,context.section,context.quarter,context.schoolYear],['Instructions','Keep numeric scores in student rows. Set status by copying exact legend fills: Missing #EFDADA, Absent #EBEBEB, Incomplete #FFEDA0, Excuse #DBDFF0. No Fill or white means None. Other shades and status words are rejected. Blank numeric cells keep saved scores.'],['Keep identifiers','Do not change student IDs, assessment headings, HPS or the mapping below.'],['Column','Assessment ID','Title','HPS'],...context.items.map((item,i)=>[i+4,item.id,item.title,item.max])];
        const instructions=XLSX.utils.aoa_to_sheet(info);instructions['!cols']=[{wch:26},{wch:100},{wch:55},{wch:18}];XLSX.utils.book_append_sheet(book,instructions,'Instructions');return book;
    }
    const statusFills={EFDADA:'missing',EBEBEB:'absent',FFEDA0:'incomplete',DBDFF0:'excuse'};
    const colorGuide='Use only the exact Score Colors legend fills: Missing (EFDADA), Absent (EBEBEB), Incomplete (FFEDA0), or Excuse (DBDFF0). Copy the fill from the legend; use No Fill or white for None. Keep numeric scores in the cells; do not type status words.';
    function cellStatus(cell,address){
        const fill=cell?.s?.fill||cell?.s;
        if(!fill||fill.patternType==='none')return 'none';
        const color=fill.fgColor;
        if(!color)return 'none';
        const rgb=String(color.rgb||'').toUpperCase().replace(/^#/,'').replace(/^(?:FF|00)(?=[A-F0-9]{6}$)/,'');
        if((!fill.patternType||fill.patternType==='solid')&&!color.tint&&statusFills[rgb])return statusFills[rgb];
        if((!fill.patternType||fill.patternType==='solid')&&!color.tint&&(rgb==='FFFFFF'||color.auto||color.indexed===64||color.theme===0))return 'none';
        throw Error('Cell '+address+': Unsupported status fill color'+(rgb?' (#'+rgb+')':'')+'. '+colorGuide);
    }
    function matrixAsLegacy(book,context,XLSX){
        const sheet=book.Sheets['Class Record']||book.Sheets.Grades,info=XLSX.utils.sheet_to_json(book.Sheets.Instructions||{},{header:1,defval:''});
        const taskOnly=info[0]?.[0]==='SIGMA_GRADEBOOK_IMPORT_V4';
        const current=taskOnly||info[0]?.[0]==='SIGMA_GRADEBOOK_IMPORT_V3';
        if(!current&&info[0]?.[0]!=='SIGMA_GRADEBOOK_IMPORT_V2')return book;
        if(String(info[0][1])!==context.subjectId||String(info[0][2])!==context.section||Number(info[0][3])!==context.quarter||String(info[0][4])!==String(context.schoolYear))throw Error('This template belongs to a different subject, section, school year, or quarter.');
        if(!sheet)throw formatError();
        const range=XLSX.utils.decode_range(sheet['!ref']||'A1');if(range.e.r>1000||range.e.c>300)throw Error('This class record is too large.');
        const grid=XLSX.utils.sheet_to_json(sheet,{header:1,defval:'',raw:true}),mapped=info.slice(4),out=[headers],seen=new Set();
        const tasks=context.items.filter(item=>!item.isQuiz),taskIds=new Set(tasks.map(item=>item.id));
        const taskLayout=mapped.length===tasks.length&&mapped.every(row=>taskIds.has(row[1]));
        if(taskOnly?!taskLayout:(!taskLayout&&mapped.length!==context.items.length))throw Error('Assessment mapping changed. Download the current task record again.');
        mapped.forEach(([column,id,title,max])=>{const item=context.items.find(i=>i.id===id);if(!item||seen.has(id)||Number(column)<4||Number(column)>range.e.c||grid[8]?.[column]!==item.title||Number(grid[9]?.[column])!==item.max||Number(max)!==item.max)throw Error('Assessment heading or HPS changed. Download the current class record again.');seen.add(id);});
        grid.slice(10,current?10+context.students.length:undefined).forEach((row,index)=>{if(row.every(v=>v===''))return;mapped.forEach(([column,id,title,max])=>{const address=XLSX.utils.encode_cell({r:index+10,c:Number(column)}),cell=sheet[address];if(cell?.f)throw Error('Cell '+address+': Enter a numeric score, not a formula.');const value=String(row[column]??'').trim(),status=cellStatus(cell,address);if(value&&!/^\d+(?:\.\d+)?$/.test(value))throw Error('Cell '+address+': Keep a numeric score in the cell and set status using its fill color. '+colorGuide);out.push([String(row[2]),row[1],id,title,max,value,status]);});});
        const converted=buildLegacy(context,XLSX);converted.Sheets.Grades=XLSX.utils.aoa_to_sheet(out);return converted;
    }
    const formatError=()=>Error('This Excel file uses a different or unsupported format. Select Download Task Record, edit that file, and upload it again.');
    function parse(book, context, XLSX, readRecord) {
        const marker=XLSX.utils.sheet_to_json(book.Sheets.Instructions || {}, {header:1,defval:''})[0]?.[0];
        if(!['SIGMA_GRADEBOOK_IMPORT_V2','SIGMA_GRADEBOOK_IMPORT_V3','SIGMA_GRADEBOOK_IMPORT_V4'].includes(marker))throw formatError();
        book=matrixAsLegacy(book,context,XLSX);
        const info = XLSX.utils.sheet_to_json(book.Sheets.Instructions || {}, {header:1,defval:''})[0] || [];
        if(info[0]!=='SIGMA_GRADEBOOK_IMPORT_V1' || String(info[1])!==context.subjectId || String(info[2])!==context.section || Number(info[3])!==context.quarter || String(info[4])!==String(context.schoolYear)) throw Error('This template belongs to a different subject, section, school year, or quarter.');
        const sheet = book.Sheets.Grades;
        if(!sheet) throw formatError();
        const range=XLSX.utils.decode_range(sheet['!ref'] || 'A1');
        if(range.e.r>5000 || range.e.c>6) throw formatError();
        const rows=XLSX.utils.sheet_to_json(sheet,{header:1,defval:'',raw:true});
        if(headers.some((value,i)=>rows[0]?.[i]!==value)) throw formatError();
        const students=new Map(context.students.map(s=>[s.id,s])), items=new Map(context.items.map(i=>[i.id,i])), seen=new Set(), changes=[];
        rows.slice(1).forEach((row,index)=>{
            if(row.every(value=>value===''))return;
            const student=students.get(String(row[0])), item=items.get(String(row[2]));
            const fail=message=>{throw Error('Row '+(index+2)+': '+message);};
            if(!student||!item)fail('Unknown student or assessment in this class and quarter.');
            const key=student.id+':'+item.id;if(seen.has(key))fail('Duplicate student and assessment.');seen.add(key);
            if(Number(row[4])!==item.max)fail('Highest Possible Score no longer matches the saved assessment. Download the current class record again.');
            if([5,6].some(c=>sheet[XLSX.utils.encode_cell({r:index+1,c})]?.f))fail('Enter a value, not a formula, for Score and Status.');
            const rawScore=String(row[5]??'').trim(),rawStatus=String(row[6]??'').trim().toLowerCase();
            if(!rawScore&&!rawStatus)return;
            const saved=readRecord(student.id,item.id);
            if(!saved?.ready)fail('Wait for the live gradebook to load, then upload again.');
            const previous=saved.record || {}, before=previous.score==null||previous.score===''?null:Number(previous.score);
            const score=rawScore===''?before:Number(rawScore);
            if(rawScore!==''&&(!/^\d+(?:\.\d+)?$/.test(rawScore)||!Number.isFinite(score)||score<0||score>item.max))fail('Score must be between 0 and '+item.max+'.');
            const gradingStatus=rawStatus==='excused'?'excuse':rawStatus || previous.gradingStatus || 'none';
            if(!statuses.includes(gradingStatus))fail('Use None, Missing, Absent, Incomplete, or Excuse.');
            if(score===before&&gradingStatus===(previous.gradingStatus || 'none'))return;
            if(item.isQuiz)fail('Quiz grades are protected and cannot be changed through import.');
            if(before===null||!Number.isFinite(before))fail('Only tasks with an existing recorded grade can be changed. Blank task grades are protected.');
            changes.push({studentId:student.id,itemId:item.id,score,gradingStatus,expectedRevision:previous.gradeRevision??'',studentName:student.name,title:item.title,before,beforeStatus:previous.gradingStatus||'none'});
        });
        if(changes.length>1000)throw Error('Import at most 1,000 changed grades at a time.');
        return changes;
    }
    window.SigmaGradebookImport={build,parse};
    window.openGradebookImportForm=async function () {
        if(!window.sigmaGradesState?.selectedSubjectSection)return window.showToast?.('Select a subject and section first.','warning');
        if(!window.XLSX)return window.showToast?.('Excel library is unavailable. Reload and try again.','error');
        document.getElementById('gradebook-import-modal')?.remove();
        const modal=document.createElement('div');modal.id='gradebook-import-modal';modal.className='sigma-modal-overlay';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','Import Class Record');
        const priorFocus=document.activeElement;let busy=false,context,changes=[],mode='upload';
        modal.innerHTML=`<button type="button" class="shared-export-exit" data-close aria-label="Close import"><i class="fa-solid fa-xmark gradebook-import-desktop-close" aria-hidden="true"></i><i class="fa-solid fa-chevron-left gradebook-import-mobile-back" aria-hidden="true"></i></button><div class="sigma-modal-shell"><div class="sigma-modal-panel"><div class="sigma-modal-header"><h1 class="sigma-modal-title">Import Class Record</h1></div><div class="sigma-modal-body"><p data-context class="shared-export-intro"></p><div class="attendance-import-mode-tabs" role="tablist"><button type="button" data-mode="upload" role="tab" aria-selected="true">Upload Grades</button><button type="button" data-mode="template" role="tab" aria-selected="false">Download Task Record</button></div><div class="gradebook-import-period"><span class="gradebook-import-period-label">Choose Quarter</span><details class="sigma-quarter-dropdown" data-quarter-picker><summary aria-label="Import quarter"><span data-quarter-label></span><i class="fa-solid fa-chevron-down" aria-hidden="true"></i></summary><div class="sigma-quarter-dropdown-menu" data-quarter-menu></div></details><input data-quarter type="hidden"></div><div data-content></div><p role="alert" class="shared-export-error"></p><p data-status role="status"></p></div><div class="sigma-modal-footer"><button type="button" data-action class="sigma-btn sigma-btn-primary sigma-btn-md" disabled>Import Grades</button></div></div></div>`;
        const error=modal.querySelector('[role=alert]'),content=modal.querySelector('[data-content]'),action=modal.querySelector('[data-action]'),quarter=modal.querySelector('[data-quarter]'),status=modal.querySelector('[data-status]');
        const close=()=>{if(busy)return;modal.remove();document.documentElement.classList.remove('has-modal-open');document.removeEventListener('keydown',keys);priorFocus?.focus();};
        const keys=e=>{if(e.key==='Escape')close();if(e.key==='Tab'){const controls=[...modal.querySelectorAll('button,input,select')].filter(n=>!n.disabled&&n.getClientRects().length),first=controls[0],last=controls.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}};
        modal.querySelectorAll('[data-close]').forEach(b=>b.onclick=close);
        const periods=(window.getSubjectAvailableQuarters?.(window.sigmaGradesState.selectedSubjectSection.subject)||[1,2,3,4]).map(Number);
        quarter.value=String(periods.includes(Number(window.sigmaGradesState.activeQuarter))?window.sigmaGradesState.activeQuarter:periods[0]);
        const picker=modal.querySelector('[data-quarter-picker]'),menu=modal.querySelector('[data-quarter-menu]');
        const quarterLabel=q=>['1st Quarter','2nd Quarter','3rd Quarter','4th Quarter'][Number(q)-1];
        const updateQuarter=()=>{modal.querySelector('[data-quarter-label]').textContent=quarterLabel(quarter.value);menu.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.value===quarter.value)));};
        menu.innerHTML=periods.map(q=>`<button type="button" data-value="${q}">${quarterLabel(q)}</button>`).join('');
        menu.querySelectorAll('button').forEach(b=>b.onclick=()=>{if(busy)return;quarter.value=b.dataset.value;picker.open=false;updateQuarter();quarter.dispatchEvent(new Event('change'));});
        picker.querySelector('summary').onclick=e=>{if(busy)e.preventDefault();};updateQuarter();
        const refreshRecords=async()=>{try{await window.SigmaAcademicRecords.refresh(true);}catch(e){throw Error(/timeout|timed out|aborted/i.test(e.message)?'The connection took too long. Your grades were not changed. Please try again.':e.message);}};

        const redraw=()=>{
            changes=[];error.textContent='';status.textContent='';context=window.getGradebookImportContext(Number(quarter.value));
            modal.querySelector('[data-context]').textContent=context.subject+' · '+context.section+' — Upload task grade corrections or download the current task record.';
            action.textContent=mode==='template'?'Download Task Record':'Import Grades';action.disabled=mode!=='template'||!context.items.some(item=>!item.isQuiz);
            if(mode==='template'){content.innerHTML='<p>Download this quarter’s task record with enrolled students and current scores. Quizzes are excluded. Only tasks with a recorded grade can be corrected. Blank numeric cells keep the saved score. Set status using only the exact Score Colors legend fills; use No Fill or white for None. Other shades and typed status words are rejected.</p>';return;}
            content.innerHTML='<p>Only tasks that already have a recorded grade can be changed. Quiz grades and blank task grades are protected.</p><p class="gradebook-import-color-guide">Keep numeric scores in the cells. Copy the exact fill from the Excel Score Colors legend to set status: Missing, Absent, Incomplete, or Excuse. Use No Fill or white for None. Other colors or shades are rejected; do not type status words.</p><label class="gradebook-import-dropzone"><span class="gradebook-import-upload-icon"><i class="fa-solid fa-cloud-arrow-up"></i></span><strong>Click to upload or drag and drop</strong><span>Excel class record (.xlsx), up to 5 MB</span><input type="file" accept=".xlsx" aria-label="Upload class record" hidden></label><p class="gradebook-import-review-note">Review all changes before importing. Nothing is saved when you select a file.</p>';
            const upload=async file=>{
                if(busy)return;busy=true;quarter.disabled=true;modal.querySelectorAll('[data-mode],[data-close]').forEach(b=>b.disabled=true);action.disabled=true;error.textContent='';status.textContent='Reading workbook…';changes=[];
                try{if(!file||!/\.xlsx$/i.test(file.name)||file.size>5*1024*1024)throw Error('Choose an .xlsx class record smaller than 5 MB.');
                    // Preview the workbook against the loaded database mirror; no save or forced reload is needed.
                    if(window.SigmaAcademicRecords.getPerformanceSnapshot?.().ready===false)await refreshRecords();
                    context=window.getGradebookImportContext(Number(quarter.value));
                    let book;try{book=XLSX.read(await file.arrayBuffer(),{type:'array',cellFormula:true,cellStyles:true});}catch(_){throw formatError();}
                    changes=parse(book,context,XLSX,(student,item)=>window.SigmaAcademicRecords.getAssessmentRecord(context.subjectId,context.section,item,student));
                    content.querySelector('[data-preview]')?.remove();
                    const preview=document.createElement('div');preview.dataset.preview='';preview.className='attendance-import-table';
                    preview.innerHTML='<table><thead><tr><th>Student</th><th>Assessment</th><th>Saved score</th><th>New score</th><th>Saved Status</th><th>New Status</th></tr></thead><tbody>'+changes.map(r=>`<tr><td class="gradebook-import-student"><span class="gradebook-import-student-identity"><span class="gradebook-import-student-avatar">${window.renderUserAvatarHtml?.(context.students.find(student=>student.id===r.studentId)?.profile||{id:r.studentId,name:r.studentName},'sm')||'<span class="sigma-user-avatar sigma-user-avatar--sm"><i class="fa-solid fa-user" aria-hidden="true"></i></span>'}</span><span>${esc(r.studentName)}</span></span></td><td>${esc(r.title)}</td><td>${esc(r.before??'—')}</td><td>${esc(r.score??'—')}</td><td>${esc(r.beforeStatus==='none'?'None':r.beforeStatus.charAt(0).toUpperCase()+r.beforeStatus.slice(1))}</td><td>${esc(r.gradingStatus==='none'?'None':r.gradingStatus.charAt(0).toUpperCase()+r.gradingStatus.slice(1))}</td></tr>`).join('')+'</tbody></table>';
                    const selected=document.createElement('div');selected.className='gradebook-import-selected-file';
                    selected.innerHTML='<span><i class="fa-solid fa-file-excel" aria-hidden="true"></i> '+esc(file.name)+'</span><button type="button" class="sigma-btn sigma-btn-white sigma-btn-md" data-change-file>Change File</button>';
                    content.replaceChildren(selected,preview);
                    selected.querySelector('[data-change-file]').onclick=()=>{if(busy)return;redraw();content.querySelector('input[type=file]').click();};
                    status.textContent=changes.length ? changes.length+' grade changes ready to import. Preview only — no grades saved.' : 'No changes found. This workbook matches the saved grades.';action.disabled=!changes.length;
                }catch(e){
                    changes=[];action.disabled=true;status.textContent='';error.textContent=e.message;
                    const retry=document.createElement('div');retry.className='gradebook-import-selected-file';
                    retry.innerHTML='<span>Choose a corrected class record to try again.</span><button type="button" class="sigma-btn sigma-btn-white sigma-btn-md" data-retry-upload>Choose Another File</button>';
                    content.replaceChildren(retry);
                    retry.querySelector('[data-retry-upload]').onclick=()=>{if(busy)return;redraw();content.querySelector('input[type=file]').click();};
                }finally{busy=false;quarter.disabled=false;modal.querySelectorAll('[data-mode],[data-close]').forEach(b=>b.disabled=false);}
            };
            const input=content.querySelector('input'),zone=content.querySelector('label');input.onchange=()=>{if(input.files[0])upload(input.files[0]);};zone.ondragover=e=>e.preventDefault();zone.ondrop=e=>{e.preventDefault();upload(e.dataTransfer.files[0]);};
        };
        modal.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{if(busy)return;mode=b.dataset.mode;modal.querySelectorAll('[data-mode]').forEach(n=>n.setAttribute('aria-selected',String(n===b)));try{redraw();}catch(e){error.textContent=e.message;}});
        quarter.onchange=()=>{try{redraw();}catch(e){error.textContent=e.message;}};
        action.onclick=async()=>{
            if(busy)return;busy=true;action.disabled=true;quarter.disabled=true;modal.querySelectorAll('[data-mode],[data-close]').forEach(b=>b.disabled=true);
            try{if(mode==='template'){if(window.SigmaAcademicRecords.getPerformanceSnapshot?.().ready===false)await refreshRecords();context=window.getGradebookImportContext(Number(quarter.value));XLSX.writeFile(build(context,XLSX),'Gradebook_'+context.section.replace(/[^a-z0-9_-]/gi,'_')+'_Q'+context.quarter+'_TaskRecord.xlsx',{bookType:'xlsx',cellStyles:true});}
                else{if(!changes.length)throw Error('Upload and review a class record first.');action.textContent='Importing…';
                    await window.SigmaAcademicRecords.save({type:'gradebook_import',subjectId:context.subjectId,section:context.section,quarter:context.quarter,rows:changes.map(({studentId,itemId,score,gradingStatus,expectedRevision})=>({studentId,itemId,score,gradingStatus,expectedRevision}))});
                    window.renderAdminGradebookWorkspace?.();status.textContent=changes.length+' grades imported successfully.';changes=[];window.showToast?.('Grades imported and saved.','success');window.SigmaAcademicRecords.refresh(true).catch(()=>{});}
            }catch(e){error.textContent=e.message;}finally{busy=false;quarter.disabled=false;modal.querySelectorAll('[data-mode],[data-close]').forEach(b=>b.disabled=false);action.textContent=mode==='template'?'Download Task Record':'Import Grades';action.disabled=mode==='upload';}
        };
        document.body.append(modal);document.documentElement.classList.add('has-modal-open');document.addEventListener('keydown',keys);
        try{redraw();}catch(e){error.textContent=e.message;status.textContent='';}
    };
})();
