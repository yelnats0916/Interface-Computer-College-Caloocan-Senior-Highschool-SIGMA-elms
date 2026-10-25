(function () {
    'use strict';

    const types = {
        ai: 'AI Logs',
        activity: 'Activity Logs',
        auth: 'Authentication Logs',
        notifications: 'Notification Logs'
    };

    const sections = {
        ai: 'audit-ai-view',
        activity: 'audit-activity-view',
        auth: 'audit-auth-view',
        notifications: 'audit-notifications-view'
    };

    const text = value => String(value ?? '').trim();
    const allowed = kind => window.canViewAuditLog?.(kind) === true;

    const day = value => {
        const date = new Date(value);
        return Number.isFinite(+date) ? new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Manila',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(date) : '';
    };

    const stamp = value => {
        const date = new Date(value);
        return Number.isFinite(+date) ? date.toLocaleString('en-US', {
            timeZone: 'Asia/Manila',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        }) : 'Not recorded';
    };

    const listUsers = () => window.getStoredJson?.('sigma-admin-users', []) || [];

    function person(id, name, role, users) {
        const user = users.find(u => text(u.id || u.uid) === text(id) && text(id));
        return {
            id: text(id),
            name: user ? [user.firstName, user.lastName].filter(Boolean).join(' ') || text(name) : text(name) || 'Not recorded',
            role: text(user?.role || role) || 'Not recorded'
        };
    }

    function normalize(kind, record, users) {
        const row = {
            key: kind + ':' + text(record.id || record.notificationId),
            kind,
            timestamp: record.timestamp || record.createdAt || record.created_at || '',
            status: text(record.status || record.outcome) || 'Not recorded'
        };
        if (kind === 'notifications') {
            row.sender = person(record.senderId, record.senderName || 'System', record.senderRole || record.senderType || 'System', users);
            row.recipient = person(record.recipientId, record.recipient || record.recipientName || ('All ' + (record.role || 'users')), record.role, users);
            row.title = text(record.title) || 'Notification';
            row.details = text(record.body || record.related);
            row.category = text(record.type);
            row.readAt = record.readAt;
            row.recipients = (record.recipients || []).map(u => person(u.id, u.name || u.fullName, u.role || record.role, users));
            row.people = [row.sender, row.recipient, ...row.recipients];
        } else {
            row.user = person(record.userId, record.userName, record.userRole, users);
            row.people = [row.user];
            row.title = kind === 'ai' ? ({
                sigmabot: 'SIGMA Bot',
                analytics: 'AI Analytics',
                quiz: 'Quiz Generation',
                submission_evaluation: 'Submission Evaluation',
                submission_feedback: 'Submission Feedback',
                grade_insights: 'Grade Insights'
            }[record.feature] || text(record.feature) || types[kind]) : text(record.activity || record.event) || types[kind];
            row.details = text(record.details || record.actionDescription || record.prompt);
            row.module = text(record.module);
            row.model = text(record.model);
            row.ip = text(record.ip);
            row.device = text(record.device);
            row.response = text(record.response);
        }
        row.search = [row.title, row.details, row.category, row.module, ...row.people.flatMap(p => [p.name, p.id, p.role])].join(' ').toLowerCase();
        return row;
    }

    function matches(row, filter) {
        const date = day(row.timestamp);
        if ((filter.from && (!date || date < filter.from)) || (filter.to && (!date || date > filter.to))) return false;
        const query = text(filter.user).toLowerCase();
        const people = row.kind === 'notifications' && filter.direction !== 'both'
            ? (filter.direction === 'recipient' ? [row.recipient, ...(row.recipients || [])] : [row.sender])
            : row.people;
        if (query && !people.some(p => [p.name, p.id].some(val => val.toLowerCase().includes(query)))) return false;
        return !filter.search || row.search.includes(filter.search.toLowerCase());
    }

    const identity = p => `${p.name}\nID: ${p.id || 'Not recorded'}\nRole: ${p.role}`;

    function table(kind, rows) {
        const headers = kind === 'notifications'
            ? ['No.', 'Sender', 'Recipient', 'Notification / Details', 'Status', 'Timestamp (Manila)']
            : kind === 'auth'
                ? ['No.', 'User', 'Event / Details', 'Outcome', 'IP / Device', 'Timestamp (Manila)']
                : kind === 'ai'
                    ? ['No.', 'User', 'Feature / Request', 'Response', 'Model / Status', 'Timestamp (Manila)']
                    : ['No.', 'User', 'Activity / Details', 'Module', 'Timestamp (Manila)'];

        return {
            headers,
            body: rows.map((r, i) => kind === 'notifications'
                ? [i + 1, identity(r.sender), [r.recipient, ...(r.recipients || [])].map(identity).join('\n\n'), [r.title, r.category, r.details].filter(Boolean).join('\n'), r.status, stamp(r.timestamp)]
                : kind === 'auth'
                    ? [i + 1, identity(r.user), [r.title, r.details].filter(Boolean).join('\n'), r.status, [r.ip, r.device].filter(Boolean).join('\n'), stamp(r.timestamp)]
                    : kind === 'ai'
                        ? [i + 1, identity(r.user), [r.title, r.details].filter(Boolean).join('\n'), r.response || 'Not recorded', [r.model, r.status].filter(Boolean).join('\n'), stamp(r.timestamp)]
                        : [i + 1, identity(r.user), [r.title, r.details].filter(Boolean).join('\n'), r.module, stamp(r.timestamp)])
        };
    }

    async function source(kind) {
        if (!allowed(kind)) throw Error('You do not have access to ' + types[kind] + '.');
        if (kind === 'activity' || kind === 'auth') {
            return (await window.SigmaDatabase.request(kind === 'auth' ? 'authentication_logs' : 'activity_logs')).records || [];
        }
        if (kind === 'ai') {
            const url = new URL(window.SigmaDatabase.url('ai_records'));
            url.searchParams.set('action', 'logs');
            url.searchParams.set('export', '1');
            const response = await window.SigmaDatabase.fetch(url.href, { cache: 'no-store' });
            const result = await window.SigmaDatabase.readJson(response);
            return (result.logs || []).filter(row => !row.isDeleted);
        }
        window.SigmaNotifications?.syncRecipientReceipts?.();
        return window.SigmaNotifications?.getLogs() || [];
    }

    let libraries;
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = () => {
                script.remove();
                reject(Error('Unable to load PDF tools. Please try again.'));
            };
            document.head.append(script);
        });
    }

    async function pdfLibraries() {
        if (!libraries) {
            libraries = (async () => {
                if (!window.jspdf?.jsPDF) await loadScript('js/vendor/jspdf.umd.min.js?v=3.0.3');
                if (!window.jspdf.jsPDF.API.autoTable) await loadScript('js/vendor/jspdf.plugin.autotable.min.js?v=5.0.2');
            })().catch(error => {
                libraries = null;
                throw error;
            });
        }
        return libraries;
    }

    async function download(rows, selected, filter) {
        await pdfLibraries();
        const doc = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        doc.setProperties({ title: filter.reportTitle || 'Audit Logs Report', creator: 'SIGMA ELMS' });
        selected.forEach((kind, index) => {
            if (index) doc.addPage();
            doc.setTextColor(0);
            doc.setFontSize(18);
            doc.text('Interface Computer College', 14, 15);
            doc.setFontSize(14);
            const titleLines=doc.splitTextToSize(filter.reportTitle || types[kind]+' Report',269);
            const titleOffset=(titleLines.length-1)*6;
            doc.text(titleLines, 14, 24);
            doc.setFontSize(9);
            doc.text(`Generated: ${stamp(new Date().toISOString())} (Asia/Manila)`, 14, 31+titleOffset);
            const summary = `Date: ${filter.from || 'All dates'}${filter.to ? ' to ' + filter.to : ''} | Records: ${rows.filter(r => r.kind === kind).length}`;
            const lines = doc.splitTextToSize(summary, 269);
            doc.text(lines, 14, 37+titleOffset);
            const data = table(kind, rows.filter(r => r.kind === kind));
            doc.autoTable({
                startY: 42 + titleOffset + (lines.length - 1) * 4,
                head: [data.headers],
                body: data.body.length ? data.body : [['No matching records', ...data.headers.slice(1).map(() => '')]],
                theme: 'grid',
                styles: { font: 'helvetica', fontSize: 8, cellPadding: 2.5, overflow: 'linebreak', textColor: 0 },
                headStyles: { fillColor: [21, 128, 61], textColor: 255 },
                margin: { left: 14, right: 14, top: 15, bottom: 15 },
                rowPageBreak: 'avoid'
            });
        });
        for (let page = 1; page <= doc.getNumberOfPages(); page++) {
            doc.setPage(page);
            doc.setFontSize(8);
            doc.setTextColor(80);
            doc.text(`${page} of ${doc.getNumberOfPages()}`, 283, 204, { align: 'right' });
        }
        doc.save('SIGMA-'+(filter.reportTitle||'Audit Logs').replace(/[^A-Za-z0-9]+/g,'-')+'-'+day(new Date().toISOString())+'.pdf');
    }

    window.openAuditPdfExport = function (kind) {
        if (!allowed(kind)) return;
        document.getElementById('audit-pdf-export')?.remove();
        const context = window.SigmaAuditExportContexts?.[kind]?.() || {};
        const title = context.title || types[kind];
        const modal = document.createElement('div');
        modal.id = 'audit-pdf-export'; modal.className = 'sigma-modal-overlay';
        modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','Export '+title);
        modal.innerHTML = `<button type="button" class="audit-modal-exit-btn" data-close aria-label="Close export"><i class="fa-solid fa-xmark"></i></button>
            <div class="sigma-modal-shell"><form class="sigma-modal-panel">
            <header class="sigma-modal-header"><h1 class="sigma-modal-title"></h1></header>
            <div class="sigma-modal-body">
                <section class="audit-date-range"><div class="audit-date-range-heading"><label>Date Range</label><div class="audit-date-presets">
                    <button type="button" class="audit-date-preset" data-days="1">Today</button><button type="button" class="audit-date-preset" data-days="7">Last 7 Days</button><button type="button" class="audit-date-preset" data-days="30">Last 30 Days</button><button type="button" class="audit-date-preset" data-days="0">All Dates</button>
                </div></div><div class="audit-export-grid"><label>From Date<input type="date" name="from"></label><label>To Date<input type="date" name="to"></label></div></section>
                <p data-count role="status">Loading records…</p><p data-error role="alert" hidden></p>
                <div class="audit-preview-table-wrap"><table class="audit-preview-table"><thead><tr data-preview-head></tr></thead><tbody data-preview-body></tbody></table></div>
                <div class="audit-preview-pagination"><span data-pagination-info></span><div><button type="button" class="audit-date-preset" data-page="previous">Previous</button><span data-page-label></span><button type="button" class="audit-date-preset" data-page="next">Next</button></div></div>
            </div><footer class="sigma-modal-footer"><button type="submit" class="sigma-btn sigma-btn-primary sigma-btn-md" data-download><i class="fa-solid fa-file-pdf"></i><span>Download PDF</span></button></footer>
            </form></div>`;
        modal.querySelector('h1').textContent='Export '+title;
        const form=modal.querySelector('form'),count=modal.querySelector('[data-count]'),error=modal.querySelector('[data-error]'),downloadButton=modal.querySelector('[data-download]');
        let rows=[],loading=true,failure='',page=1;const pageSize=10;
        const filter=()=>({from:form.elements.from.value,to:form.elements.to.value,direction:'both',search:context.search||'',reportTitle:title+' Report'});
        const matching=()=>rows.filter(row=>matches(row,filter()));
        function render(){
            if(!modal.isConnected)return;
            const f=filter(),invalid=f.from&&f.to&&f.from>f.to;
            error.textContent=invalid?'From Date must be on or before To Date.':failure;error.hidden=!error.textContent;
            const list=invalid?[]:matching(),pages=Math.max(1,Math.ceil(list.length/pageSize));page=Math.min(page,pages);
            count.textContent=loading?'Loading records…':`${list.length} matching record${list.length===1?'':'s'}`;
            downloadButton.disabled=loading||!!failure||!!invalid||!list.length;
            const data=table(kind,list),head=modal.querySelector('[data-preview-head]'),body=modal.querySelector('[data-preview-body]');head.replaceChildren();body.replaceChildren();
            data.headers.forEach(label=>{const th=document.createElement('th');th.textContent=label;head.append(th);});
            data.body.slice((page-1)*pageSize,page*pageSize).forEach(cells=>{const tr=document.createElement('tr');cells.forEach(value=>{const td=document.createElement('td');td.textContent=String(value).length>240?String(value).slice(0,237)+'…':value;tr.append(td);});body.append(tr);});
            if(!list.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=data.headers.length;td.textContent=loading?'Loading records…':failure?'Records could not be loaded.':'No matching records';tr.append(td);body.append(tr);}
            modal.querySelector('[data-pagination-info]').textContent=list.length?`${(page-1)*pageSize+1}-${Math.min(page*pageSize,list.length)} of ${list.length}`:'0 of 0';
            modal.querySelector('[data-page-label]').textContent=`Page ${page} of ${pages}`;
            modal.querySelector('[data-page="previous"]').disabled=page<=1;modal.querySelector('[data-page="next"]').disabled=page>=pages;
        }
        function preset(days){
            const today=day(new Date().toISOString());
            if(days){const start=new Date(today+'T00:00:00Z');start.setUTCDate(start.getUTCDate()-days+1);form.elements.from.value=start.toISOString().slice(0,10);form.elements.to.value=today;}
            else{form.elements.from.value='';form.elements.to.value='';}
            modal.querySelectorAll('[data-days]').forEach(button=>button.classList.toggle('active',Number(button.dataset.days)===days));page=1;render();
        }
        modal.querySelectorAll('[data-days]').forEach(button=>button.onclick=()=>preset(Number(button.dataset.days)));
        form.onchange=()=>{page=1;modal.querySelectorAll('[data-days]').forEach(button=>button.classList.remove('active'));render();};
        modal.querySelectorAll('[data-page]').forEach(button=>button.onclick=()=>{page+=button.dataset.page==='next'?1:-1;render();});
        const opener=document.activeElement,previousOverflow=document.body.style.overflow;
        const close=()=>{if(downloadButton.dataset.saving)return;modal.remove();document.body.style.overflow=previousOverflow;document.removeEventListener('keydown',keydown);opener?.focus({preventScroll:true});};
        const keydown=event=>{if(event.key==='Escape')close();if(event.key==='Tab'){const nodes=[...modal.querySelectorAll('button:not(:disabled),input')].filter(node=>node.getClientRects().length),first=nodes[0],last=nodes.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}};
        modal.querySelector('[data-close]').onclick=close;document.addEventListener('keydown',keydown);document.body.style.overflow='hidden';document.body.append(modal);preset(7);modal.querySelector('[data-close]').focus({preventScroll:true});
        (async()=>{
            try{
                const records=Array.isArray(context.records)?context.records:await source(kind);
                let users=listUsers();try{const result=await window.SigmaDatabase.request('users');if(Array.isArray(result.records))users=result.records;}catch(_){}
                rows=records.map(record=>normalize(kind,record,users)).sort((a,b)=>Date.parse(b.timestamp)-Date.parse(a.timestamp));
            }catch(e){failure=e.message||'Records could not be loaded.';}finally{loading=false;render();}
        })();
        form.onsubmit=async event=>{
            event.preventDefault();if(downloadButton.disabled||!allowed(kind))return;
            downloadButton.disabled=true;downloadButton.dataset.saving='true';
            try{await download(matching(),[kind],filter());}catch(e){error.hidden=false;error.textContent=e.message||'Unable to download PDF.';}finally{delete downloadButton.dataset.saving;render();}
        };
    };

    function init() {
        for (const [kind, id] of Object.entries(sections)) {
            const host = document.getElementById(id);
            const tableEl = host?.querySelector('.sigma-audit-table');
            if (!tableEl) continue;
            const existing = host.querySelector('[data-audit-export]');
            if (existing) {
                existing.hidden = !allowed(kind);
                continue;
            }
            const bar = document.createElement('div');
            bar.className = 'audit-export-toolbar';
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'sigma-btn sigma-btn-primary sigma-btn-md';
            button.dataset.auditExport = kind;
            button.innerHTML = '<i class="fa-solid fa-file-pdf" aria-hidden="true"></i><span>Export PDF</span>';
            button.hidden = !allowed(kind);
            button.onclick = () => openAuditPdfExport(kind);
            bar.append(button);
            tableEl.parentElement.before(bar);
        }
    }

    window.SigmaAuditPdf = { normalize, matches, table };
    window.addEventListener('sigma:database-session-ready', init);
    document.addEventListener('DOMContentLoaded', init);
    window.addEventListener('sigma:audit-permissions-changed', () => {
        init();
        document.querySelectorAll('[data-audit-export]').forEach(button => button.hidden = !allowed(button.dataset.auditExport));
    });
})();
