// Attendance publication and private database drafts share one role-scoped API.
(function () {
    'use strict';
    const key='sigma-attendance-records-v1', queue=new Map();
    let pending=null,pendingOwner='',pendingRevision=-1,readyFor='',encoded='',saving=null,timer,revision=0,lastRefresh=0,lastError='';
    let studentHistory=[];
    const schedules=new Map();
    // Database snapshots remain usable when browser storage is full or disabled.
    // Keep the fallback scoped to the current account and return independent copies:
    // classroom views merge drafts into their display without changing publication.
    const cache=new Map();let cacheOwner='';
    const persisted=new Map(),cacheLimit=128*1024;
    function activeCache(){
        const owner=String(actor().id||'');
        if(owner!==cacheOwner){cache.clear();schedules.clear();studentHistory=[];readyFor='';encoded='';lastRefresh=0;lastError='';cacheOwner=owner;}
        return owner;
    }
    function readRecords(name){
        if(name!==key&&!String(name).startsWith('sigma-attendance-drafts:'))return undefined;
        const owner=activeCache();
        if(!owner||(name!==key&&name!=='sigma-attendance-drafts:'+owner))return {};
        let raw=cache.get(name);
        if(raw===undefined&&name!==key){try{raw=localStorage.getItem(name);}catch(_) {}}
        try{return JSON.parse(raw||'{}');}catch(_){return {};}
    }
    function cacheRecords(name,value){
        const owner=activeCache();
        if(!owner||(name!==key&&name!=='sigma-attendance-drafts:'+owner))return;
        const raw=JSON.stringify(value);cache.set(name,raw);
        // Published history and acknowledged drafts already live in the database.
        // Keep large history in memory; only pending edits need a durable draft copy.
        const deviceValue=name===key?raw:JSON.stringify(Object.fromEntries(Object.entries(value||{}).map(([scope,days])=>
            [scope,Object.fromEntries(Object.entries(days||{}).filter(([,day])=>day?._pending))]).filter(([,days])=>Object.keys(days).length)));
        if(persisted.get(name)===deviceValue)return;
        persisted.set(name,deviceValue);
        try{
            if(name===key&&deviceValue.length*2>cacheLimit)localStorage.removeItem?.(name);
            else if(name!==key&&deviceValue==='{}')localStorage.removeItem?.(name);
            else localStorage.setItem(name,deviceValue);
        }catch(_){/* Optional cache; the API owns saved records. Do not retry the same full snapshot. */}
    }
    const scheduled=(section,subject,date)=>{const days=schedules.get(norm(section)+'::'+norm(subject));return !!days?.includes(new Date(date+'T00:00:00Z').getUTCDay());};
    const actor=()=>window.SigmaDatabase?.currentUser()||{};
    const normalize=record=>({...record,statuses:Object.fromEntries(Object.entries(record.statuses||{}).map(([id,status])=>[id,({present:'P',absent:'A',late:'L',excused:'E'})[status]||status]))});
    const norm=value=>String(value||'').replace(/^grade\s*\d+\s*[-–]?\s*/i,'').replace(/[-_]+/g,' ').replace(/\s*&\s*/g,' and ').trim().toLowerCase().replace(/^oral communication in context$/,'oral communication');
    function supersededEmptyDraft(day,published){
        if(!published||Object.values(day?.statuses||{}).some(status=>String(status||'').trim()))return false;
        const draftTime=Date.parse(day.updatedAt||'')||0;
        const submittedTime=Date.parse(published.submittedAt||published.updatedAt||'')||0;
        return draftTime<=submittedTime;
    }
    function receive(result){
        if(String(result.userId)!==String(actor().id))return;
        activeCache();
        const text=JSON.stringify(result.scopes);
        if(readyFor===String(result.userId)&&text===encoded)return;
        const records={},drafts={},draftKey='sigma-attendance-drafts:'+result.userId;
        const local=readRecords(draftKey);
        for(const scope of result.scopes||[]){
            const canonical=`${scope.section}::${scope.subject}`;
            schedules.set(norm(scope.section)+'::'+norm(scope.subject),scope.weekdays||[]);
            if(scope.subjectId)schedules.set(norm(scope.section)+'::'+norm(scope.subjectId),scope.weekdays||[]);
            records[canonical]=Object.fromEntries(Object.entries(scope.days||{}).filter(([date,day])=>day.submitted===true&&scheduled(scope.section,scope.subject,date)).map(([date,day])=>[date,normalize(day)]));
            drafts[canonical]=Object.fromEntries(Object.entries(scope.drafts||{}).filter(([date,day])=>scheduled(scope.section,scope.subject,date)&&!supersededEmptyDraft(day,records[canonical][date])).map(([date,day])=>[date,normalize(day)]));
            if(String(actor().role).toLowerCase()!=='student')for(const [oldKey,days]of Object.entries(local)){
                const [section,subject]=oldKey.split('::');if(norm(section)!==norm(scope.section)||norm(subject)!==norm(scope.subject))continue;
                for(const [date,day]of Object.entries(days||{})){
                    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!day?.statuses||!scheduled(scope.section,scope.subject,date))continue;
                    // Old empty browser drafts are not edits to newly published marks.
                    // Do not re-upload them and recreate the blank draft on the server.
                    if(supersededEmptyDraft(day,records[canonical][date]))continue;
                    // Only unsynced changes can supersede the database snapshot.
                    if(day._pending||(!readyFor&&!records[canonical][date]&&!drafts[canonical][date])){
                        drafts[canonical][date]={...day,_pending:true};
                        enqueue({section:scope.section,subjectId:scope.subject,date,statuses:day.statuses,excuses:day.excuses||{}});
                    }
                }
            }
        }
        if(String(actor().role).toLowerCase()==='student'){
            const seen=new Set(),id=String(result.userId);
            studentHistory=[];
            for(const [scope,days]of Object.entries(records)){
                const [section,subject]=scope.split('::');
                for(const [date,day]of Object.entries(days)){
                    const status=day.statuses?.[id],identity=date+'::'+norm(section)+'::'+norm(subject);
                    if(!status||seen.has(identity))continue;
                    seen.add(identity);studentHistory.push({date,section,subject,status});
                }
            }
            studentHistory.sort((a,b)=>b.date.localeCompare(a.date));
        }
        cacheRecords(key,records);cacheRecords(draftKey,drafts);
        readyFor=String(result.userId);encoded=text;
        window.dispatchEvent(new CustomEvent('sigma:attendance-changed',{detail:{remote:true}}));
    }
    function refresh(force=false){
        if(!actor().id)return Promise.resolve();
        const owner=activeCache();
        // Share an in-flight read unless a committed edit made it obsolete.
        if(pending)return pendingOwner!==owner||force&&pendingRevision<revision?pending.catch(()=>{}).then(()=>refresh(true)):pending;
        const firstRead=readyFor!==owner,recovering=!!lastError;
        pendingOwner=owner;lastError='';
        pendingRevision=revision;
        const at=revision;
        // Attendance is a small interactive read. Acquire the shared worker directly
        // instead of waiting behind the entire background sync queue. A failed read
        // must release its loader; focus/online/polling can retry later.
        pending=window.SigmaDatabase.request('attendance',{foreground:true,autoReconnect:false,timeoutMs:10000,
            ...(typeof AbortSignal!=='undefined'&&typeof AbortSignal.timeout==='function'?{signal:AbortSignal.timeout(12000)}:{})}).then(result=>{
            if(owner!==String(actor().id)||at!==revision)return;
            if(result.success===false||String(result.userId)!==owner||!Array.isArray(result.scopes))throw Error('Attendance could not be retrieved. Please try again.');
            receive(result);lastRefresh=Date.now();
        }).catch(error=>{
            if(owner===String(actor().id))lastError=error.message||'Attendance could not be retrieved.';
            throw error;
        }).finally(()=>{
            pending=null;pendingOwner='';
            if(owner===String(actor().id)&&(firstRead||recovering||lastError))window.dispatchEvent(new CustomEvent('sigma:attendance-status',{detail:{loading:false,message:lastError}}));
        });return pending;
    }
    function enqueue(input){
        const owner=String(actor().id||'');if(!owner||String(actor().role).toLowerCase()==='student')return;
        revision++;queue.set(owner+'::'+norm(input.section)+'::'+norm(input.subjectId)+'::'+input.date,{owner,input});
        clearTimeout(timer);timer=setTimeout(()=>flush().catch(()=>{}),300);
    }
    async function flush(){
        if(saving){await saving;if(queue.size)return flush();return;}
        saving=(async()=>{for(const [id,entry]of queue){
            if(entry.owner!==String(actor().id)||(schedules.has(norm(entry.input.section)+'::'+norm(entry.input.subjectId))&&!scheduled(entry.input.section,entry.input.subjectId,entry.input.date))){queue.delete(id);continue;}
            const result=await window.SigmaDatabase.request('attendance',{data:{...entry.input,action:'draft'},autoReconnect:false,foreground:false});
            if(!result.success)throw Error(result.error||'Draft could not be saved.');
            revision++;encoded='';if(queue.get(id)!==entry)continue;queue.delete(id);
            if(entry.owner!==String(actor().id))continue;
            const draftKey='sigma-attendance-drafts:'+entry.owner,drafts=readRecords(draftKey);
            for(const [key,days]of Object.entries(drafts)){const [sec,sub]=key.split('::');if(norm(sec)!==norm(entry.input.section)||norm(sub)!==norm(entry.input.subjectId)||!days[entry.input.date])continue;
                // Replace legacy offline marks with the server's roster-validated copy.
                if(result.record&&typeof result.record==='object')days[entry.input.date]=normalize(result.record);
                delete days[entry.input.date]._pending;
            }
            cacheRecords(draftKey,drafts);
        }})().finally(()=>saving=null);return saving;
    }
    async function submit(input){
        await flush();const owner=String(actor().id||'');
        const result=await window.SigmaDatabase.request('attendance',{data:input,autoReconnect:false,foreground:true});
        if(String(actor().id||'')!==owner)throw Error('The signed-in account changed.');
        if(!result.success||(!result.records&&result.record?.submitted!==true))throw Error(result.error||'Attendance was not submitted. Your draft is retained.');
        revision++;encoded='';return result;
    }
    async function discard(input){await flush();const result=await window.SigmaDatabase.request('attendance',{data:{...input,action:'discard-draft'},autoReconnect:false});if(!result.success)throw Error(result.error);encoded='';}
    window.SigmaAttendance={isScheduled:scheduled,refresh,submit,saveDraft:enqueue,flush,discard,records:readRecords,cacheRecords,ready:()=>!!activeCache()&&readyFor===String(actor().id),
        status:()=>{activeCache();return {loading:!!pending,message:lastError};},
        studentHistory:(subject,section)=>{
            activeCache();
            if(String(actor().role).toLowerCase()!=='student'||readyFor!==String(actor().id))return undefined;
            return studentHistory.filter(row=>(!subject||norm(row.subject)===norm(subject))&&(!section||norm(row.section)===norm(section))).map(row=>({...row}));
        }};
    // A rejected private draft must not stop reading the latest publication.
    const sync=()=> (String(actor().role).toLowerCase()==='student'?refresh():
        flush().catch(error=>console.warn('Attendance draft sync:',error.message)).then(()=>refresh()))
        .catch(error=>console.warn('Attendance sync:',error.message));
    window.addEventListener('focus',sync);window.addEventListener('online',sync);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync();});
    const attendanceRoute=()=>/attendance/i.test(window.location?.hash||'');
    // A refreshed student attendance page can start its small read while the
    // remaining portal scripts load, ahead of unrelated dashboard requests.
    const startupSync=attendanceRoute()&&String(actor().role).toLowerCase()==='student'?sync():null;
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>startupSync||sync());else if(!startupSync)sync();
    // Session recovery can finish after DOM ready. Do not wait for the 15s poll.
    for(const event of ['sigma:database-session-ready','sigma:tab-identity-restored'])window.addEventListener(event,()=>{
        if(!window.SigmaAttendance.ready()||Date.now()-lastRefresh>15000)sync();
    });
    // Retry on entry without restarting requests during month changes or rerenders.
    window.addEventListener('hashchange',()=>{
        if(/attendance/i.test(window.location?.hash||'')&&(!window.SigmaAttendance.ready()||Date.now()-lastRefresh>15000))sync();
    });
    setInterval(()=>{if(!document.hidden)sync();},15000);
})();
