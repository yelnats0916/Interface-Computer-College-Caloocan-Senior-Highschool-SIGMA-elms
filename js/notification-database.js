(function(){
    'use strict';
    const sdk=window.SigmaNotifications;if(!sdk||!window.SigmaDatabase)return;
    const originalSend=sdk.sendToRole.bind(sdk),legacyLogs=sdk.getLogs.bind(sdk);
    let logs=[],knownKeys=new Set(),pending=null,lastRead=0,ownerKey='';const dismissed=new Set();
    const actor=()=>window.SigmaDatabase.currentUser?.();
    const role=()=>{const value=String(actor()?.role||'').toLowerCase();return value.includes('admin')?'admin':value;};
    const request=(data,query)=>window.SigmaDatabase.request('notifications',{...(data?{data}:{}),...(query?{query}:{})});
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
    async function refresh(force=false){
        if(!actor()?.id||document.hidden)return;const owner=String(actor().id)+'|'+role();if(owner!==ownerKey){ownerKey=owner;lastRead=0;logs=[];knownKeys.clear();dismissed.clear();seen.clear();}if(pending)return pending;if(!force&&Date.now()-lastRead<10000)return;
        pending=(async()=>{
            const feed=await request();
            if(owner!==String(actor()?.id)+'|'+role())return;
            const key='sigma-notifications-'+role()+'-v3';
            // Only the authenticated recipient's database feed is authoritative.
            localStorage.setItem(key,JSON.stringify(feed.records));
            sdk.renderFeed?.();
            if(role()==='admin'&&window.canViewAuditLog?.('notifications')!==false){const result=await request(null,{view:'logs'});if(owner!==String(actor()?.id)+'|'+role())return;logs=result.records;knownKeys=new Set(result.knownKeys||logs.map(row=>row.role+'|'+row.notificationId));emit();}
            lastRead=Date.now();sdk.renderFeed?.();
        })().catch(error=>{console.warn('Notification sync:',error.message);}).finally(()=>{pending=null;});return pending;
    }
    // A read receipt belongs only to the authenticated recipient, using server time.
    const seen=new Set();
    function saveReads(){
        let feed=[];try{feed=JSON.parse(localStorage.getItem('sigma-notifications-'+role()+'-v3')||'[]');}catch(_){}
        for(const item of feed)if(item.read&&item.serverRecordId&&!seen.has(item.serverRecordId)){
            seen.add(item.serverRecordId);request({action:'read',id:item.serverRecordId}).catch(()=>seen.delete(item.serverRecordId));
        }
    }
    const observer=new MutationObserver(saveReads);const panel=document.getElementById('notification-panel')||document.getElementById('notificationsPanel');if(panel)observer.observe(panel,{subtree:true,childList:true});
    document.addEventListener('click',()=>setTimeout(saveReads,0));
    sdk.refreshLogs=()=>refresh(true);
    sdk.refreshNotifications=()=>refresh();
    for(const event of ['sigma:database-session-ready','online','focus'])window.addEventListener(event,()=>refresh(true));
    setInterval(()=>{saveReads();refresh();},30000);
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>refresh());else refresh();
})();
