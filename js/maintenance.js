(function () {
    'use strict';
    let state=null, loading=false, saving=false, boundary=null, baseline='', editorReady=false, historyLoading=false, clockOffset=0;
    const node=id=>document.getElementById(id);
    const actor=()=>{try{return window.getLoggedInAdminUser?.()||JSON.parse(sessionStorage.getItem('sigma-authenticated-user')||'{}');}catch(_){return {};}};
    const role=()=>String(actor().role||actor().type||'').replace(/[\s_-]+/g,'').toLowerCase();
    const canManage=()=>{const p=actor().permissions||{};return role()==='masteradmin'||role()==='admin'&&p.settingsMain!==false&&p.settingsSecurity!==false&&p.maintenanceManage===true;};
    const time=value=>value?new Date(value).toLocaleString('en-US',{timeZone:'Asia/Manila',month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'}):'Not recorded';
    const notify=(message,type='success')=>window.SigmaFeedback?.notify(message,type,{id:'maintenance-settings',placement:'bottom-left',compact:true});
    const detailRoute=()=>new URL(location.href).searchParams.get('maintenanceView')==='manage'&&location.hash==='#nav-settings-security';
    async function request(data,manage=false){
        const api=new URL('php/api/maintenance.php',location.href);if(manage)api.searchParams.set('action','manage');
        const fetcher=window.SigmaDatabase?.fetch||window.fetch;
        const response=await fetcher(api.href,data?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),signal:AbortSignal.timeout(25000)}:{cache:'no-store',signal:AbortSignal.timeout(20000)});
        const result=await response.json();if(!response.ok||!result.success)throw new Error(result.error||'Maintenance settings could not be loaded.');return result;
    }
    function draft(){
        const channels={calendar:true,announcement:true,banner:true};
        return {title:node('maintenance-title').value.trim(),message:node('maintenance-message').value.trim(),start:node('maintenance-start').value,end:node('maintenance-end').value,channels};
    }
    function validate(){
        if(!node('maintenance-page-save'))return false;
        const d=draft();let valid=true;
        for(const [id,value,max] of [['maintenance-title',d.title,120],['maintenance-message',d.message,1000]]){
            const error=!value?'This field is required.':value.length>max?`Use up to ${max} characters.`:/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F<>]/.test(value)?'Use plain text without angle brackets or control characters.':'';
            node(id).setCustomValidity(error);if(error)valid=false;
        }
        const start=Date.parse(d.start+':00+08:00'),end=Date.parse(d.end+':00+08:00');
        const startError=!d.start||!Number.isFinite(start)?'Choose a start date and time.':start<=Date.now()+clockOffset?'The start must be in the future.':'';
        const endError=!d.end||!Number.isFinite(end)?'Choose an end date and time.':end<=start?'The end must be after the start.':'';
        node('maintenance-start').setCustomValidity(startError);node('maintenance-end').setCustomValidity(endError);
        valid=valid&&!startError&&!endError&&Object.values(d.channels).some(Boolean);
        node('maintenance-page-save').disabled=!state||saving||!canManage()||!valid||JSON.stringify(d)===baseline;
        return Boolean(valid);
    }
    function controls(){
        for(const id of ['settings-maintenance-toggle','maintenance-schedule-open','maintenance-schedule-cancel','maintenance-new'])if(node(id))node(id).disabled=!state||saving||!canManage();
        if(node('maintenance-schedule-form'))node('maintenance-schedule-form').querySelectorAll('input,textarea').forEach(input=>input.disabled=saving||!canManage());
        validate();
    }
    function seedEditor(empty=false){
        if(!node('maintenance-title')||!state)return;
        const schedule=!empty&&state.scheduleStatus==='upcoming'?state.schedule:null;
        node('maintenance-title').value=schedule?state.title:'';node('maintenance-message').value=schedule?state.message:'';
        node('maintenance-start').value=schedule?schedule.startAt.slice(0,16):'';node('maintenance-end').value=schedule?schedule.endAt.slice(0,16):'';
        baseline=JSON.stringify(draft());editorReady=true;node('maintenance-page-error').hidden=true;controls();
    }
    function apply(next){
        state=next;clockOffset=Date.parse(state.serverTime)-Date.now();window.maintenanceModeState=state;
        localStorage.setItem('sigma_maintenance_mode',JSON.stringify(state));window.dispatchEvent(new CustomEvent('sigma:maintenance_change',{detail:state}));
        if(node('settings-maintenance-toggle'))node('settings-maintenance-toggle').checked=state.enabled;
        if(node('maintenance-schedule-summary')){
            node('maintenance-schedule-summary').textContent=state.scheduleStatus==='none'?'No maintenance is scheduled.':`${state.scheduleStatus==='upcoming'?'Scheduled':state.scheduleStatus==='active'?'In progress':'Completed'} from ${time(state.schedule.startAt)} to ${time(state.schedule.endAt)}, Manila time.`;
            node('maintenance-schedule-cancel').hidden=!['upcoming','active'].includes(state.scheduleStatus);
        }
        if(node('maintenance-mode-status'))node('maintenance-mode-status').textContent=state.enabled?'On. Portal access is restricted. Authorized maintenance administrators retain access.':'Off. The portal is available. Use the switch for immediate maintenance or manage a scheduled window.';
        if(detailRoute()&&!editorReady)seedEditor();renderBanner();controls();scheduleBoundary();
        window.dispatchEvent(new CustomEvent('sigma:academic-calendar-changed'));
        if(state.enabled&&role()&&!canManage()){
            sessionStorage.removeItem('sigma-grade-sync-session');sessionStorage.removeItem('sigma-login-challenge');sessionStorage.removeItem('sigma-authenticated-user');location.href=new URL('index.html',location.href).href;
        }
    }
    function scheduleBoundary(){
        clearTimeout(boundary);if(!state?.schedule||state.scheduleStatus==='none')return;
        const now=Date.parse(state.serverTime),next=[state.schedule.startAt,state.schedule.endAt].map(Date.parse).find(at=>at>now);
        if(next)boundary=setTimeout(refresh,Math.min(2147483647,Math.max(1000,next-now+250)));
    }
    function renderBanner(){
        if(/index\.html$|\/$/.test(location.pathname))return;
        let banner=node('maintenance-notice-banner');const show=state.channels.banner&&(state.enabled||state.scheduleStatus==='upcoming');
        if(!banner){banner=document.createElement('aside');banner.id='maintenance-notice-banner';banner.setAttribute('role','status');const main=document.querySelector('main');if(!main)return;main.prepend(banner);}
        banner.hidden=!show;
        if(show){
            banner.replaceChildren();
            const copy=document.createElement('div');copy.className='maintenance-banner-copy';
            const heading=document.createElement('div');heading.className='maintenance-banner-heading';
            const title=document.createElement('strong');title.textContent=state.enabled?'Maintenance in progress':state.title;heading.append(title);
            if(state.schedule&&state.scheduleStatus!=='none'){
                const timing=document.createElement('span');timing.className='maintenance-banner-time';timing.textContent=`${time(state.schedule.startAt)} to ${time(state.schedule.endAt)}, Manila time`;heading.append(timing);
            }
            const message=document.createElement('p');message.className='maintenance-banner-message';message.textContent=state.message;copy.append(heading,message);banner.append(copy);
        }
    }
    function paintHistory(history){
        const body=node('maintenance-history-body');if(!body)return;body.replaceChildren();
        if(!history.length){const row=body.insertRow();const cell=row.insertCell();cell.colSpan=6;cell.textContent='No maintenance notices have been published.';return;}
        for(const record of history){
            const row=body.insertRow();const values=[time(record.publishedAt),record.title,record.startAt?`${time(record.startAt)} to ${time(record.endAt)}`:'Not recorded',record.publisher||'Administrator',Object.entries(record.channels||{}).filter(([,enabled])=>enabled).map(([key])=>({calendar:'Calendar',announcement:'Announcements',banner:'Navbar banner'}[key])).join(', '),{scheduled:'Scheduled',active:'In progress',completed:'Completed',canceled:'Canceled',replaced:'Replaced',published:'Published'}[record.status]||record.status];
            values.forEach(value=>{row.insertCell().textContent=value;});
            const message=document.createElement('p');message.className='maintenance-history-message';message.textContent=record.message;row.cells[1].append(message);
        }
    }
    async function loadHistory(){
        if(historyLoading||!detailRoute()||!canManage())return;historyLoading=true;node('maintenance-history-error').hidden=true;
        try{const result=await request(null,true);paintHistory(result.history||[]);}
        catch(error){node('maintenance-history-error').textContent=error.message;node('maintenance-history-error').hidden=false;node('maintenance-history-body').replaceChildren();}
        finally{historyLoading=false;}
    }
    async function refresh(){
        if(loading||saving)return;loading=true;
        try{apply((await request()).state);if(detailRoute())loadHistory();}
        catch(error){if(node('maintenance-schedule-summary')&&!state)node('maintenance-schedule-summary').textContent='Maintenance settings could not be loaded. Select Retry.';if(node('maintenance-retry'))node('maintenance-retry').hidden=false;}
        finally{loading=false;controls();}
    }
    async function save(data){
        if(saving||!canManage())return false;saving=true;controls();
        try{
            if(!window.SigmaServiceVault?.verifyPanel){throw new Error('Administrator verification is unavailable. Reload the page and try again.');}
            if(!await window.SigmaServiceVault.verifyPanel('maintenance'))return false;
            const result=await request(data);apply(result.state);paintHistory(result.history||[]);seedEditor();
            notify(data.action==='schedule'?'Maintenance schedule and notices saved.':data.action==='cancel'?'Maintenance schedule canceled.':data.enabled?'Maintenance mode activated.':'Maintenance mode turned off.');return true;
        }catch(error){notify(error.message,'error');if(node('maintenance-page-error')){node('maintenance-page-error').textContent=error.message;node('maintenance-page-error').hidden=false;}return false;}
        finally{saving=false;controls();window.SigmaServiceVault?.finishLoading?.();}
    }
    function showPage(){
        const security=node('settings-security-view');if(!security)return;
        const detail=detailRoute()&&!security.classList.contains('hidden')&&canManage();
        if(security.classList.contains('maintenance-detail')!==detail)security.classList.toggle('maintenance-detail',detail);node('maintenance-page').hidden=!detail;
        if(detail){window.setPortalHeader?.('System Settings','System Maintenance');if(state&&!editorReady)seedEditor();loadHistory();}
    }
    function navigate(){
        if(!state||saving||!canManage())return;
        const url=new URL(location.href);url.searchParams.delete('recoveryPanel');url.searchParams.delete('recoveryView');url.searchParams.set('maintenanceView','manage');url.hash='nav-settings-security';
        if(location.href!==url.href)history.pushState({...history.state,maintenance:true},'',url);
        window.switchTab?.('nav-settings-security',true);showPage();
    }
    window.getMaintenanceConfig=()=>state||{enabled:false,message:''};
    window.handleAdminMaintenanceToggleChange=function(enabled){
        if(!state||!canManage()||saving){notify(!state?'Wait for maintenance settings to finish loading.':'Maintenance management permission is required.','info');return;}
        node('settings-maintenance-toggle').checked=state.enabled;
        window.openAskingPanel({title:enabled?'Activate Maintenance Mode?':'Turn Off Maintenance Mode?',message:enabled?'Other users will be signed out and blocked from the portal. Master Admins and permitted maintenance administrators retain access.':state.scheduleStatus==='active'?'This ends the active scheduled window and reopens the portal.':'The portal will reopen. A future saved schedule remains unchanged.',confirmText:enabled?'Activate':'Turn Off',cancelText:'Cancel',showCancel:true,type:'warning',onConfirm:()=>save({action:'manual',enabled})});
    };
    function init(){
        const previousUpdate=window.updateAdminAccessLockdownUI;if(previousUpdate)window.updateAdminAccessLockdownUI=function(...args){const result=previousUpdate.apply(this,args);controls();return result;};
        if(node('sec-maintenance-panel')){
            node('maintenance-schedule-open').onclick=navigate;
            node('maintenance-retry').onclick=()=>{node('maintenance-retry').hidden=true;refresh();};
            node('maintenance-new').onclick=()=>seedEditor(true);
            node('maintenance-schedule-cancel').onclick=()=>window.openAskingPanel({title:'Cancel Maintenance Schedule?',message:'The schedule and its notices will be canceled. Manually enabled maintenance remains active.',confirmText:'Cancel Schedule',cancelText:'Keep Schedule',showCancel:true,type:'warning',onConfirm:()=>save({action:'cancel'})});
            node('maintenance-schedule-form').addEventListener('input',validate);node('maintenance-schedule-form').addEventListener('change',validate);
            node('maintenance-schedule-form').onsubmit=async event=>{event.preventDefault();if(!validate()||node('maintenance-page-save').disabled)return;await save({action:'schedule',...draft()});};
            new MutationObserver(showPage).observe(node('settings-security-view'),{attributes:true,attributeFilter:['class']});showPage();
        }
        refresh();setInterval(()=>{if(document.visibilityState!=='hidden')refresh();},30000);
        document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh();});
        window.addEventListener('popstate',showPage);window.addEventListener('hashchange',showPage);
    }
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
