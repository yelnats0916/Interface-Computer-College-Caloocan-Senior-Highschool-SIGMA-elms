(function () {
    'use strict';
    const types={ai:'AI Logs',activity:'Activity Logs',auth:'Authentication Logs',notifications:'Notification Logs'};
    const sections={ai:'audit-ai-view',activity:'audit-activity-view',auth:'audit-auth-view',notifications:'audit-notifications-view'};
    const text=value=>String(value??'').trim();
    const safe=value=>text(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const allowed=kind=>window.canViewAuditLog?.(kind)===true;
    const day=value=>{const date=new Date(value);return Number.isFinite(+date)?new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).format(date):'';};
    const stamp=value=>{const date=new Date(value);return Number.isFinite(+date)?date.toLocaleString('en-US',{timeZone:'Asia/Manila',year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):'Not recorded';};
    const listUsers=()=>window.getStoredJson?.('sigma-admin-users',[])||[];
    function person(id,name,role,users){
        const user=users.find(u=>text(u.id||u.uid)===text(id)&&text(id));
        return {id:text(id),name:user?[user.firstName,user.lastName].filter(Boolean).join(' ')||text(name):text(name)||'Not recorded',role:text(user?.role||role)||'Not recorded'};
    }
    function normalize(kind,record,users){
        const row={key:kind+':'+text(record.id||record.notificationId),kind,timestamp:record.timestamp||record.createdAt||record.created_at||'',status:text(record.status||record.outcome)||'Not recorded'};
        if(kind==='notifications'){
            row.sender=person(record.senderId,record.senderName||'System',record.senderRole||record.senderType||'System',users);
            row.recipient=person(record.recipientId,record.recipient||record.recipientName||('All '+(record.role||'users')),record.role,users);
            row.title=text(record.title)||'Notification';row.details=text(record.body||record.related);row.category=text(record.type);row.readAt=record.readAt;
            row.recipients=(record.recipients||[]).map(u=>person(u.id,u.name||u.fullName,u.role||record.role,users));row.people=[row.sender,row.recipient,...row.recipients];
        }else{
            row.user=person(record.userId,record.userName,record.userRole,users);row.people=[row.user];
            row.title=kind==='ai'?({sigmabot:'SIGMA Bot',analytics:'AI Analytics',quiz:'Quiz Generation',submission_evaluation:'Submission Evaluation',submission_feedback:'Submission Feedback',grade_insights:'Grade Insights'}[record.feature]||text(record.feature)||types[kind]):text(record.activity||record.event)||types[kind];
            row.details=text(record.details||record.actionDescription||record.prompt);row.module=text(record.module);row.model=text(record.model);row.ip=text(record.ip);row.device=text(record.device);row.response=text(record.response);
        }
        row.search=[row.title,row.details,row.category,row.module,...row.people.flatMap(p=>[p.name,p.id,p.role])].join(' ').toLowerCase();
        return row;
    }
    function matches(row,filter){
        const date=day(row.timestamp);
        if((filter.from&&(!date||date<filter.from))||(filter.to&&(!date||date>filter.to)))return false;
        const query=text(filter.user).toLowerCase();
        const people=row.kind==='notifications'&&filter.direction!=='both'?(filter.direction==='recipient'?[row.recipient,...(row.recipients||[])]:[row.sender]):row.people;
        if(query&&!people.some(p=>[p.name,p.id].some(value=>value.toLowerCase().includes(query))))return false;
        return !filter.search||row.search.includes(filter.search.toLowerCase());
    }
    const identity=p=>`${p.name}\nID: ${p.id||'Not recorded'}\nRole: ${p.role}`;
    function table(kind,rows){
        const headers=kind==='notifications'?['No.','Sender','Recipient','Notification / Details','Status','Timestamp (Manila)']:kind==='auth'?['No.','User','Event / Details','Outcome','IP / Device','Timestamp (Manila)']:kind==='ai'?['No.','User','Feature / Request','Response','Model / Status','Timestamp (Manila)']:['No.','User','Activity / Details','Module','Timestamp (Manila)'];
        return {headers,body:rows.map((r,i)=>kind==='notifications'?[i+1,identity(r.sender),[r.recipient,...(r.recipients||[])].map(identity).join('\n\n'),[r.title,r.category,r.details].filter(Boolean).join('\n'),r.status,stamp(r.timestamp)]:kind==='auth'?[i+1,identity(r.user),[r.title,r.details].filter(Boolean).join('\n'),r.status,[r.ip,r.device].filter(Boolean).join('\n'),stamp(r.timestamp)]:kind==='ai'?[i+1,identity(r.user),[r.title,r.details].filter(Boolean).join('\n'),r.response||'Not recorded',[r.model,r.status].filter(Boolean).join('\n'),stamp(r.timestamp)]:[i+1,identity(r.user),[r.title,r.details].filter(Boolean).join('\n'),r.module,stamp(r.timestamp)])};
    }
    async function source(kind){
        if(!allowed(kind))throw Error('You do not have access to '+types[kind]+'.');
        if(kind==='activity'||kind==='auth')return (await window.SigmaDatabase.request(kind==='auth'?'authentication_logs':'activity_logs')).records||[];
        if(kind==='ai'){
            const url=new URL(window.SigmaDatabase.url('ai_records'));url.searchParams.set('action','logs');url.searchParams.set('export','1');
            const response=await window.SigmaDatabase.fetch(url.href,{cache:'no-store'});const result=await window.SigmaDatabase.readJson(response);return (result.logs||[]).filter(row=>!row.isDeleted);
        }
        window.SigmaNotifications?.syncRecipientReceipts?.();return window.SigmaNotifications?.getLogs()||[];
    }
    let libraries;
    function loadScript(src){return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=()=>{script.remove();reject(Error('Unable to load PDF tools. Please try again.'));};document.head.append(script);});}
    async function pdfLibraries(){if(!libraries)libraries=(async()=>{if(!window.jspdf?.jsPDF)await loadScript('js/vendor/jspdf.umd.min.js?v=3.0.3');if(!window.jspdf.jsPDF.API.autoTable)await loadScript('js/vendor/jspdf.plugin.autotable.min.js?v=5.0.2');})().catch(error=>{libraries=null;throw error;});return libraries;}
    async function download(rows,selected,filter){
        await pdfLibraries();
        const doc=new window.jspdf.jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
        doc.setProperties({title:'Audit Logs Report',creator:'SIGMA ELMS'});
        selected.forEach((kind,index)=>{
            if(index)doc.addPage();
            doc.setTextColor(0);doc.setFontSize(18);doc.text('Interface Computer College',14,15);doc.setFontSize(14);doc.text('Audit Logs Report - '+types[kind],14,24);
            doc.setFontSize(9);doc.text(`Generated: ${stamp(new Date().toISOString())} (Asia/Manila)`,14,31);
            const summary=`Date: ${filter.from||'All dates'}${filter.to?' to '+filter.to:''} | User: ${filter.user||'All Users'}${filter.user&&kind==='notifications'?' ('+filter.direction+')':''} | Records: ${rows.filter(r=>r.kind===kind).length}`;
            const lines=doc.splitTextToSize(summary,269);doc.text(lines,14,37);
            const data=table(kind,rows.filter(r=>r.kind===kind));
            doc.autoTable({startY:42+(lines.length-1)*4,head:[data.headers],body:data.body.length?data.body:[['No matching records',...data.headers.slice(1).map(()=> '')]],theme:'grid',styles:{font:'helvetica',fontSize:8,cellPadding:2.5,overflow:'linebreak',textColor:0},headStyles:{fillColor:[21,128,61],textColor:255},margin:{left:14,right:14,top:15,bottom:15},rowPageBreak:'avoid'});
        });
        for(let page=1;page<=doc.getNumberOfPages();page++){doc.setPage(page);doc.setFontSize(8);doc.setTextColor(80);doc.text(`${page} of ${doc.getNumberOfPages()}`,283,204,{align:'right'});}
        doc.save('SIGMA-Audit-Logs-'+day(new Date().toISOString())+'.pdf');
    }
    window.openAuditPdfExport=function(kind){
        if(!allowed(kind))return;
        document.getElementById('audit-pdf-export')?.remove();
        const modal=document.createElement('div');modal.id='audit-pdf-export';modal.className='sigma-modal-overlay';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','Export Audit Logs');
        const permitted=Object.keys(types).filter(allowed);const selected=new Set([kind]);const snapshots=new Map();const chosen=new Set();let revision=0,pending=Promise.resolve(),busy=false,loadError='',users=null;
        modal.innerHTML=`<div class="sigma-modal-shell"><form class="sigma-modal-panel"><header class="sigma-modal-header"><h1 class="sigma-modal-title">Export Audit Logs</h1><button type="button" class="sigma-btn sigma-btn-white sigma-btn-md" data-close aria-label="Close export"><i class="fa-solid fa-xmark"></i></button></header><div class="sigma-modal-body"><fieldset><legend>Log Type</legend><label class="audit-export-all"><input type="checkbox" data-all> All log types</label><div class="audit-export-types">${permitted.map(key=>`<label><input type="checkbox" name="log-type" value="${key}" ${key===kind?'checked':''}>${types[key]}</label>`).join('')}</div></fieldset><div class="audit-export-grid"><label>User<input name="user" type="search" maxlength="100" class="sigma-input" placeholder="Search name or ID" autocomplete="off"><small>All Users when empty</small></label><label data-direction>Notification user filter<input name="direction" type="hidden" value="both"><details class="sigma-quarter-dropdown audit-export-direction"><summary><span data-direction-title>Sender or Recipient</span><i class="fa-solid fa-chevron-down" aria-hidden="true"></i></summary><div class="sigma-quarter-dropdown-menu"><button type="button" data-direction-value="both">Sender or Recipient</button><button type="button" data-direction-value="sender">Sender</button><button type="button" data-direction-value="recipient">Recipient</button></div></details></label><label>From<input name="from" type="date" class="sigma-input"></label><label>To<input name="to" type="date" class="sigma-input"></label></div><fieldset class="audit-export-scopes"><legend>Records</legend><label><input type="radio" name="scope" value="all" checked> All matching records</label><label><input type="radio" name="scope" value="search"> Current search results</label><label><input type="radio" name="scope" value="selected"> Choose records</label></fieldset><div data-choices hidden></div><p data-count role="status"></p><p data-error role="alert"></p></div><footer class="sigma-modal-footer"><button type="button" class="sigma-btn sigma-btn-white sigma-btn-md" data-close>Cancel</button><button type="submit" class="sigma-btn sigma-btn-primary sigma-btn-md" data-download>Download PDF</button></footer></form></div>`;
        const form=modal.querySelector('form'),error=modal.querySelector('[data-error]'),count=modal.querySelector('[data-count]'),button=modal.querySelector('[data-download]');
        const filter=()=>({from:form.elements.from.value,to:form.elements.to.value,user:form.elements.user.value.trim(),direction:form.elements.direction.value,search:form.elements.scope.value==='search'?(window.getAuditLogSearchQuery?.()||''):''});
        const matching=()=>[...selected].flatMap(key=>snapshots.get(key)||[]).filter(row=>matches(row,filter()));
        function render(){
            modal.querySelector('[data-direction]').hidden=!selected.has('notifications');
            const all=modal.querySelector('[data-all]');all.checked=selected.size===permitted.length;all.indeterminate=selected.size>0&&selected.size<permitted.length;
            const rows=matching(),choose=form.elements.scope.value==='selected',choices=modal.querySelector('[data-choices]');choices.hidden=!choose;
            if(choose){choices.replaceChildren();rows.forEach(row=>{const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.checked=chosen.has(row.key);input.onchange=()=>{if(input.checked)chosen.add(row.key);else chosen.delete(row.key);render();};label.append(input,document.createTextNode(types[row.kind]+' · '+row.title+' · '+stamp(row.timestamp)));choices.append(label);});}
            const total=choose?rows.filter(row=>chosen.has(row.key)).length:rows.length;
            count.textContent=busy?'Loading records…':`${total} matching record${total===1?'':'s'}`;
            const invalidRange=filter().from&&filter().to&&filter().from>filter().to;error.textContent=invalidRange?'End date must be on or after start date.':loadError;button.disabled=busy||!!loadError||!!invalidRange||!selected.size||!total;
        }
        function reload(){const current=++revision;busy=true;loadError='';render();pending=(async()=>{try{if(!users){const result=await window.SigmaDatabase.request('users');users=Array.isArray(result.records)?result.records:listUsers();}for(const key of selected){if(!snapshots.has(key)){const records=await source(key);if(current!==revision)return;snapshots.set(key,records.map(record=>normalize(key,record,users)));}}}catch(e){if(current===revision)loadError=e.message||'Unable to load records.';}finally{if(current===revision){busy=false;render();}}})();return pending;}
        const close=()=>{revision++;modal.remove();document.removeEventListener('keydown',escape);document.body.style.overflow=previousOverflow;opener?.focus();};
        const escape=event=>{if(event.key==='Escape'&&!button.dataset.saving){close();return;}if(event.key==='Tab'){const items=Array.from(modal.querySelectorAll('button:not(:disabled),input,select')).filter(e=>e.getClientRects().length);const first=items[0],last=items.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}};
        const opener=document.activeElement,previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';document.addEventListener('keydown',escape);
        modal.querySelectorAll('[data-close]').forEach(btn=>btn.onclick=close);
        modal.querySelectorAll('[data-direction-value]').forEach(option=>option.onclick=()=>{form.elements.direction.value=option.dataset.directionValue;modal.querySelector('[data-direction-title]').textContent=option.textContent;option.closest('details').open=false;render();});
        modal.querySelector('[data-all]').onchange=event=>{selected.clear();if(event.target.checked)permitted.forEach(key=>selected.add(key));modal.querySelectorAll('[name="log-type"]').forEach(input=>input.checked=selected.has(input.value));reload();};
        modal.querySelectorAll('[name="log-type"]').forEach(input=>input.onchange=()=>{if(input.checked)selected.add(input.value);else selected.delete(input.value);reload();});
        form.addEventListener('input',event=>{if(['user','from','to','direction','scope'].includes(event.target.name))render();});form.addEventListener('change',event=>{if(['user','from','to','direction','scope'].includes(event.target.name))render();});
        form.onsubmit=async event=>{event.preventDefault();await pending;error.textContent='';const f=filter();if(f.from&&f.to&&f.from>f.to){error.textContent='End date must be on or after start date.';return;}if([...selected].some(key=>!allowed(key))){error.textContent='Your log access changed. Reopen the export form.';return;}const rows=matching().filter(row=>form.elements.scope.value!=='selected'||chosen.has(row.key));if(!rows.length||loadError){error.textContent=loadError||'No records match your selection.';return;}button.disabled=true;button.dataset.saving='true';button.textContent='Preparing PDF…';try{await download(rows,[...selected],f);}catch(e){error.textContent=e.message||'Unable to download PDF.';}finally{delete button.dataset.saving;button.textContent='Download PDF';button.disabled=busy||!!loadError||!selected.size||!matching().length;}};
        document.body.append(modal);reload();modal.querySelector('[name="user"]').focus();
    };
    function init(){for(const [kind,id] of Object.entries(sections)){const host=document.getElementById(id),table=host?.querySelector('.sigma-audit-table');if(!table)continue;const existing=host.querySelector('[data-audit-export]');if(existing){existing.hidden=!allowed(kind);continue;}const bar=document.createElement('div');bar.className='audit-export-toolbar';const button=document.createElement('button');button.type='button';button.className='sigma-btn sigma-btn-primary sigma-btn-md';button.dataset.auditExport=kind;button.innerHTML='<i class="fa-solid fa-file-pdf" aria-hidden="true"></i><span>Export PDF</span>';button.hidden=!allowed(kind);button.onclick=()=>openAuditPdfExport(kind);bar.append(button);table.parentElement.before(bar);}}
    window.SigmaAuditPdf={normalize,matches,table};
    window.addEventListener('sigma:database-session-ready',init);
    document.addEventListener('DOMContentLoaded',init);window.addEventListener('sigma:audit-permissions-changed',()=>{init();document.querySelectorAll('[data-audit-export]').forEach(button=>button.hidden=!allowed(button.dataset.auditExport));});
})();
