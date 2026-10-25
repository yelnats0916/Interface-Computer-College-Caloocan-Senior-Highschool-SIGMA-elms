// Attendance publication and private database drafts share one role-scoped API.
(function () {
    'use strict';
    const key='sigma-attendance-records-v1', queue=new Map();
    let pending=null,readyFor='',encoded='',saving=null,timer,revision=0;
    const schedules=new Map();
    const scheduled=(section,subject,date)=>{const days=schedules.get(norm(section)+'::'+norm(subject));return !!days?.includes(new Date(date+'T00:00:00Z').getUTCDay());};
    const actor=()=>window.SigmaDatabase?.currentUser()||{};
    const normalize=record=>({...record,statuses:Object.fromEntries(Object.entries(record.statuses||{}).map(([id,status])=>[id,({present:'P',absent:'A',late:'L',excused:'E'})[status]||status]))});
    const norm=value=>String(value||'').replace(/^grade\s*\d+\s*[-–]?\s*/i,'').replace(/[-_]+/g,' ').replace(/\s*&\s*/g,' and ').trim().toLowerCase();
    function receive(result){
        if(String(result.userId)!==String(actor().id))return;
        const text=JSON.stringify(result.scopes);
        if(readyFor===String(result.userId)&&text===encoded)return;
        const records={},drafts={},draftKey='sigma-attendance-drafts:'+result.userId;
        let local={};try{local=JSON.parse(localStorage.getItem(draftKey)||'{}');}catch(_){}
        for(const scope of result.scopes||[]){
            const canonical=`${scope.section}::${scope.subject}`;
            schedules.set(norm(scope.section)+'::'+norm(scope.subject),scope.weekdays||[]);
            if(scope.subjectId)schedules.set(norm(scope.section)+'::'+norm(scope.subjectId),scope.weekdays||[]);
            records[canonical]=Object.fromEntries(Object.entries(scope.days||{}).filter(([date,day])=>day.submitted===true&&scheduled(scope.section,scope.subject,date)).map(([date,day])=>[date,normalize(day)]));
            drafts[canonical]=Object.fromEntries(Object.entries(scope.drafts||{}).filter(([date])=>scheduled(scope.section,scope.subject,date)).map(([date,day])=>[date,normalize(day)]));
            if(String(actor().role).toLowerCase()!=='student')for(const [oldKey,days]of Object.entries(local)){
                const [section,subject]=oldKey.split('::');if(norm(section)!==norm(scope.section)||norm(subject)!==norm(scope.subject))continue;
                for(const [date,day]of Object.entries(days||{})){
                    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!day?.statuses||!scheduled(scope.section,scope.subject,date))continue;
                    // Only unsynced changes can supersede the database snapshot.
                    if(day._pending||(!readyFor&&!records[canonical][date]&&!drafts[canonical][date])){
                        drafts[canonical][date]={...day,_pending:true};
                        enqueue({section:scope.section,subjectId:scope.subject,date,statuses:day.statuses,excuses:day.excuses||{}});
                    }
                }
            }
        }
        localStorage.setItem(key,JSON.stringify(records));localStorage.setItem(draftKey,JSON.stringify(drafts));
        readyFor=String(result.userId);encoded=text;
        window.dispatchEvent(new CustomEvent('sigma:attendance-changed',{detail:{remote:true}}));
    }
    function refresh(force=false){
        if(!actor().id)return Promise.resolve();if(pending)return force?pending.then(()=>refresh()):pending;
        const at=revision;pending=window.SigmaDatabase.request('attendance').then(result=>{if(at===revision)receive(result);}).finally(()=>pending=null);return pending;
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
            const draftKey='sigma-attendance-drafts:'+entry.owner;let drafts={};try{drafts=JSON.parse(localStorage.getItem(draftKey)||'{}');}catch(_){}
            for(const [key,days]of Object.entries(drafts)){const [sec,sub]=key.split('::');if(norm(sec)===norm(entry.input.section)&&norm(sub)===norm(entry.input.subjectId)&&days[entry.input.date])delete days[entry.input.date]._pending;}
            localStorage.setItem(draftKey,JSON.stringify(drafts));
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
    window.SigmaAttendance={isScheduled:scheduled,refresh,submit,saveDraft:enqueue,flush,discard,ready:()=>readyFor===String(actor().id)};
    const sync=()=>flush().then(refresh).catch(error=>console.warn('Attendance sync:',error.message));
    window.addEventListener('focus',sync);window.addEventListener('online',sync);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync();});
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync);else sync();
    setInterval(()=>{if(!document.hidden)sync();},15000);
})();
