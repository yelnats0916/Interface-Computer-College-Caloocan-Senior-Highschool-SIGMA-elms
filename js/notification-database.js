(function(){
    'use strict';
    const sdk=window.SigmaNotifications;if(!sdk||!window.SigmaDatabase)return;
    const originalSend=sdk.sendToRole.bind(sdk),legacyLogs=sdk.getLogs.bind(sdk);
    let logs=[],knownKeys=new Set(),pending=null,lastRead=0,ownerKey='';const dismissed=new Set();
    const actor=()=>window.SigmaDatabase.currentUser?.();
    const role=()=>{const value=String(actor()?.role||'').toLowerCase();return value.includes('admin')?'admin':value;};
    const request=(data,query)=>window.SigmaDatabase.request('notifications',{autoReconnect:false,foreground:!!data&&['read','read_many'].includes(data.action),...(data?{data}:{}),...(query?{query}:{})});
    const emit=()=>window.dispatchEvent(new Event('notification-logs-updated'));
    sdk.sendToRole=function(targetRole,notification){
        try{originalSend(targetRole,notification);}catch(e){}
        if(!actor()?.id)return Promise.resolve();
        return request({action:'send',role:targetRole,notification}).then(()=>{
            lastRead=0;return refresh();
        }).catch(error=>{console.warn('Notification could not be saved to DB:',error.message);});
    };
    sdk.getLogs=()=>{
        if(window.canViewAuditLog?.('notifications')===false)return [];
        const legacy=legacyLogs().filter(item=>!dismissed.has(item.id)&&!knownKeys.has(item.role+'|'+item.notificationId)&&!logs.some(row=>row.role===item.role&&String(row.notificationId)===String(item.notificationId)));
        return [...logs,...legacy];
    };
    sdk.deleteAuditLog=async target=>{
        const row=logs.find(row=>row.id===target.id||(row.role===target.role&&String(row.notificationId)===String(target.notificationId)));
        if(row){await request({action:'delete',id:row.id,recipientId:target.recipientId||''});if(!target.recipientId)dismissed.add(target.id);await refresh(true);}
    };
    const auditVisible=()=>{const view=document.getElementById?.('audit-notifications-view');return view&&!view.classList.contains('hidden')&&view.style.display!=='none';};
    async function refresh(force=false,includeLogs=false){
        if(!actor()?.id||document.hidden)return;const owner=String(actor().id)+'|'+role();if(owner!==ownerKey){ownerKey=owner;lastRead=0;logs=[];knownKeys.clear();dismissed.clear();confirmed.clear();queued.clear();restoreReads();}if(pending)return pending;if(!force&&Date.now()-lastRead<10000)return;
        pending=(async()=>{
            const feed=await request();
            if(owner!==String(actor()?.id)+'|'+role())return;
            const key='sigma-notifications-'+role()+'-v3';
            // Only the authenticated recipient's database feed is authoritative.
            window._sigmaNotificationDatabaseFeed={owner:String(actor().id),role:role(),records:(feed.records||[]).map(item=>confirmed.has(item.serverRecordId)||queued.has(item.serverRecordId)?{...item,read:true}:item)};
            try{localStorage.setItem(key,JSON.stringify(window._sigmaNotificationDatabaseFeed.records));}catch(_){/* The database feed remains available when the optional cache is full. */}
            sdk.renderFeed?.();
            if(role()==='admin'&&(includeLogs||auditVisible())&&window.canViewAuditLog?.('notifications')!==false){const result=await request(null,{view:'logs'});if(owner!==String(actor()?.id)+'|'+role())return;logs=result.records;knownKeys=new Set(result.knownKeys||logs.map(row=>row.role+'|'+row.notificationId));emit();}
            lastRead=Date.now();sdk.renderFeed?.();
        })().catch(error=>{console.warn('Notification sync:',error.message);}).finally(()=>{pending=null;});return pending;
    }
    // Preserve read receipts while an older feed request is in flight.
    const confirmed=new Set(),queued=new Set();let saving=false,saveOwner='';
    const receiptKey=()=> 'sigma-notification-read-pending:'+ownerKey;
    function persistReads(){try{localStorage.setItem(receiptKey(),JSON.stringify([...queued]));}catch(_){}}
    function restoreReads(){try{for(const id of JSON.parse(localStorage.getItem(receiptKey())||'[]'))if(typeof id==='string')queued.add(id);}catch(_){}}
    function ensureOwner(){
        const owner=String(actor()?.id||'')+'|'+role();
        if(owner!==ownerKey){ownerKey=owner;lastRead=0;logs=[];knownKeys.clear();dismissed.clear();confirmed.clear();queued.clear();restoreReads();}
        return owner;
    }
    async function flushReads(){
        const owner=ensureOwner();if(!actor()?.id||saving||!queued.size)return;
        saving=true;saveOwner=owner;
        try{
            while(queued.size&&owner===String(actor()?.id)+'|'+role()){
                const ids=[...queued].slice(0,500);
                await request({action:'read_many',ids});
                if(owner!==String(actor()?.id)+'|'+role())break;
                ids.forEach(id=>{queued.delete(id);confirmed.add(id);});persistReads();
            }
        }catch(error){
            console.warn('Notification read receipt will retry:',error.message);
        }finally{saving=false;if(saveOwner!==ownerKey)saveReads();}
    }
    sdk.markDatabaseReads=function(ids){
        ensureOwner();if(!actor()?.id)return;
        for(const id of ids)if(id&&!confirmed.has(id))queued.add(id);
        persistReads();void flushReads();
    };
    function saveReads(){
        ensureOwner();let feed=[];try{feed=sdk.getAll();}catch(_){}
        sdk.markDatabaseReads(feed.filter(item=>item.read&&item.serverRecordId).map(item=>item.serverRecordId));
    }
    document.addEventListener('click',()=>setTimeout(saveReads,0));
    sdk.refreshLogs=()=>refresh(true,true);
    window.addEventListener('hashchange',()=>{if(auditVisible())refresh(true,true);});
    sdk.refreshNotifications=()=>refresh();
    for(const event of ['sigma:database-session-ready','sigma:academic-snapshot-updated','online','focus'])window.addEventListener(event,()=>{saveReads();refresh(true);} );
    document.addEventListener('visibilitychange',()=>{if(!document.hidden){saveReads();refresh(true);}});
    setInterval(()=>{saveReads();refresh();},10000);
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>refresh());else refresh();
})();
