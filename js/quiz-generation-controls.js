(function () {
    'use strict';
    const types = ['Multiple Choice','True or False','Short Answer','Essay','Matching Type','Enumeration'];
    const levels = ['Remember','Understand','Apply','Analyze','Evaluate','Create'];
    const descriptions = {Remember:'Recall facts and definitions.',Understand:'Explain, summarize, interpret, or classify ideas.',Apply:'Use a concept or procedure in a new situation.',Analyze:'Examine parts, comparisons, and relationships.',Evaluate:'Judge ideas using criteria and evidence.',Create:'Produce an original written response with grading guidance.'};
    const el = id => document.getElementById(id);
    let rows = [{type:'Multiple Choice',count:3},{type:'True or False',count:2}];
    let selectedLevels = new Set(['Understand']);
    const capacity = () => Math.max(0, window.getQuizRemainingSlots?.() ?? 100);
    function distribute(total) {
        const maximum=capacity();
        total=Math.max(rows.length,Math.min(maximum,Math.trunc(Number(total)||rows.length)));
        rows.forEach((row,index)=>row.count=Math.floor(total/rows.length)+(index<total%rows.length?1:0));
    }
    function options() {
        const mixed=el('ai-gen-type')?.value==='Mixed';
        return {count:mixed?rows.reduce((sum,row)=>sum+row.count,0):Number(el('ai-gen-count')?.value),
            bloomLevel:levels.find(level=>selectedLevels.has(level))||'',
            bloomLevels:levels.filter(level=>selectedLevels.has(level)),
            instructions:el('ai-gen-topic')?.value.trim()||'',
            ...(mixed?{typeCounts:rows.map(row=>({...row}))}:{})};
    }
    function error() {
        const value=options();
        if(!Number.isInteger(value.count)||value.count<1||value.count>100)return 'Choose a total of 1–100 questions.';
        if(value.count>capacity())return `Only ${capacity()} question slots remain in this quiz.`;
        if(value.typeCounts?.some(row=>!Number.isInteger(row.count)||row.count<1)||new Set(rows.map(row=>row.type)).size!==rows.length)return 'Choose each type once and enter a positive whole-number count.';
        if(!value.bloomLevels.length)return 'Select at least one thinking skill.';
        if(value.count<value.bloomLevels.length)return `Use at least ${value.bloomLevels.length} questions to include every selected thinking skill.`;
        if(value.bloomLevels.includes('Create')){
            const essay=value.typeCounts?.find(row=>row.type==='Essay')?.count ?? (el('ai-gen-type')?.value==='Essay'?value.count:0);
            if(!essay)return 'Add Essay / Paragraph questions to include Create.';
        }
        return '';
    }
    function sync() {
        const mixed=el('ai-gen-type')?.value==='Mixed', count=el('ai-gen-count');
        el('ai-mixed-controls')?.classList.toggle('hidden',!mixed);
        if(count){count.readOnly=false;count.max=String(capacity());count.min=String(mixed?rows.length:1);count.setAttribute('aria-label',mixed?'Total questions':'Question count');if(mixed)count.value=String(options().count);}
        const label=document.querySelector('label[for="ai-gen-count"]');if(label)label.textContent=mixed?'Total':'Count';
        const host=el('ai-mixed-rows');
        host?.querySelectorAll('input').forEach((input,index)=>{input.max=String(Math.max(1,capacity()-rows.reduce((n,row,j)=>n+(j===index?0:row.count),0)));});
        if(el('ai-add-question-type'))el('ai-add-question-type').disabled=rows.length>=types.length||rows.length>=capacity();
        const selected=options().bloomLevels;
        if(el('ai-bloom-description'))el('ai-bloom-description').textContent=selected.length===1?descriptions[selected[0]]:'Questions will cover each selected thinking skill.';
        if(el('ai-bloom-select-all')){el('ai-bloom-select-all').checked=selected.length===levels.length;el('ai-bloom-select-all').indeterminate=selected.length>0&&selected.length<levels.length;}
        const message=error();if(el('ai-blueprint-error')){el('ai-blueprint-error').textContent=message;el('ai-blueprint-error').classList.toggle('hidden',!message);}
        return !message;
    }
    function renderRows() {
        const host=el('ai-mixed-rows');if(!host)return;host.replaceChildren();
        rows.forEach((row,index)=>{
            const div=document.createElement('div');div.className='ai-blueprint-row';
            // Own the native control from creation: shared enhancement must never reparent it on pointerdown.
            const select=document.createElement('select');select.dataset.quizOwnedSelect='true';select.setAttribute('aria-label','Question type '+(index+1));
            types.forEach(type=>{const option=new Option(type==='Essay'?'Essay / Paragraph':type,type);option.disabled=rows.some((other,j)=>j!==index&&other.type===type);select.add(option);});select.value=row.type;
            select.onchange=()=>{row.type=select.value;renderRows();window.syncAIGenerateButtonState?.();};
            const input=document.createElement('input');input.type='number';input.min='1';input.step='1';input.inputMode='numeric';input.value=row.count;input.setAttribute('aria-label',row.type+' count');
            input.onkeydown=event=>{if(['e','E','+','-','.',' '].includes(event.key))event.preventDefault();};
            const commit=()=>{const maximum=Math.max(1,capacity()-rows.reduce((sum,other,j)=>sum+(j===index?0:other.count),0));if(Number(input.value)>maximum)window.checkQuizQuestionCapacity?.(Number(input.value)+rows.reduce((sum,other,j)=>sum+(j===index?0:other.count),0));row.count=Math.min(maximum,Math.max(1,Math.trunc(Number(input.value)||1)));input.value=String(row.count);sync();window.syncAIGenerateButtonState?.();};
            input.oninput=commit;input.onblur=commit;
            const remove=document.createElement('button');remove.type='button';remove.className='sigma-btn sigma-btn-white';remove.setAttribute('aria-label','Remove '+row.type);remove.innerHTML='<i class="fa-solid fa-xmark" aria-hidden="true"></i>';remove.disabled=rows.length===1;
            remove.onclick=()=>{const total=options().count;rows.splice(index,1);distribute(total);renderRows();window.syncAIGenerateButtonState?.();};
            div.append(select,input,remove);host.append(div);
        });sync();
    }
    function renderLevels() {
        const host=el('ai-bloom-levels');if(!host)return;host.replaceChildren();
        levels.forEach(level=>{const label=document.createElement('label');label.className='ai-bloom-option';const input=document.createElement('input');input.type='checkbox';input.value=level;input.name='ai-bloom-levels';input.checked=selectedLevels.has(level);input.onchange=()=>{if(input.checked)selectedLevels.add(level);else selectedLevels.delete(level);sync();window.syncAIGenerateButtonState?.();};const text=document.createElement('span');text.textContent=level;label.append(input,text);host.append(label);});
    }
 async function readFile(file){const ext=file.name.split('.').pop().toLowerCase();let text='';if(['txt','md','csv'].includes(ext))text=await file.text();else if(ext==='docx'){if(!window.mammoth)throw Error('Document reader is unavailable. Try again when connected.');text=(await mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()})).value;}else if(ext==='pdf'){if(!window.pdfjsLib)throw Error('PDF reader is unavailable. Try again when connected.');pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';const pdf=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise;for(let i=1;i<=pdf.numPages;i++)text+=(await(await pdf.getPage(i)).getTextContent()).items.map(x=>x.str).join(' ')+'\n';await pdf.destroy();}else if(ext==='pptx'){if(!window.JSZip)throw Error('Presentation reader is unavailable. Try again when connected.');const zip=await JSZip.loadAsync(await file.arrayBuffer());for(const name of Object.keys(zip.files).filter(n=>/^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}))){const xml=new DOMParser().parseFromString(await zip.files[name].async('string'),'text/xml');text+=Array.from(xml.getElementsByTagName('a:t')).map(n=>n.textContent).join(' ')+'\n';}}else throw Error('Choose a text document (.docx, .pdf, .txt, .md, .pptx, or .csv). For video or image lessons, upload their transcript or written content.');text=String(text||'').trim();if(!text)throw Error('No readable text was found. Upload a document containing selectable text.');if(new TextEncoder().encode(text).length>60000)throw Error('Select a shorter document or excerpt (up to 60,000 bytes of extracted text).');return text;}
 async function materialText(entry){const raw=entry?.sourceMaterial||{};for(const key of ['extractedText','contentText','text','transcript','body','content'])if(typeof raw[key]==='string'&&raw[key].trim())return raw[key].replace(/<[^>]*>/g,' ').trim();const files=[...(Array.isArray(raw.files)?raw.files:[]),...(Array.isArray(raw.attachments)?raw.attachments:[])];let value=raw.fileUrl||raw.url||raw.handoutUrl||raw.attachmentUrl||files[0]?.url||files[0]?.fileUrl; if(!value)throw Error('This material has no readable document. Borrow a document or upload its text.');const url=new URL(value,location.href);if(!['https:','http:'].includes(url.protocol))throw Error('Choose a saved document URL.');const response=url.origin===location.origin?await window.SigmaDatabase.fetch(url.href,{foreground:true,timeoutMs:30000}):await fetch(url.href,{credentials:'omit',signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error('The borrowed document could not be read. Upload a copy of the document.');const blob=await response.blob();const name=raw.fileName||files[0]?.name||decodeURIComponent(url.pathname.split('/').pop());return readFile(new File([blob],name,{type:blob.type}));}

    window.SigmaQuizGeneration={options,error,sync,readFile,materialText,reset(){rows=[{type:'Multiple Choice',count:3},{type:'True or False',count:2}];selectedLevels=new Set(['Understand']);renderRows();renderLevels();}};
    document.addEventListener('DOMContentLoaded',()=>{
        renderRows();renderLevels();
        el('ai-add-question-type')?.addEventListener('click',()=>{const type=types.find(type=>!rows.some(row=>row.type===type));if(!type||rows.length>=capacity())return;const total=Math.max(options().count,rows.length+1);rows.push({type,count:1});distribute(total);renderRows();window.syncAIGenerateButtonState?.();});
        el('ai-gen-count')?.addEventListener('input',()=>{const input=el('ai-gen-count');if(Number(input.value)>capacity())window.checkQuizQuestionCapacity?.(Number(input.value));if(el('ai-gen-type')?.value==='Mixed'){distribute(input.value);renderRows();}else{input.value=String(Math.min(capacity(),Math.max(1,Math.trunc(Number(input.value)||1))));}sync();window.syncAIGenerateButtonState?.();});
        el('ai-bloom-select-all')?.addEventListener('change',event=>{selectedLevels=new Set(event.target.checked?levels:[]);renderLevels();sync();window.syncAIGenerateButtonState?.();});
        sync();
    });
})();
