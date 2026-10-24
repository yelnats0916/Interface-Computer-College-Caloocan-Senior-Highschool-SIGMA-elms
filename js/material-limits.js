(function () {
    'use strict';
    let limits={video:{embed:30,mp4:200,std:200,ext:25,max:225},docx:{std:20,reg:20,ext:5,max:25},pdf:{std:25,reg:25,ext:5,max:30},pptx:{std:50,reg:50,ext:5,max:55},batchQuota:150,submissionBatchQuota:150};
    let pending=null,loadedAt=0,saving=Promise.resolve(),legacy=null,migrationTried=false;
    try{
        const old=localStorage.getItem('sigma-material-limits-legacy-v114')||localStorage.getItem('sigma-material-limits');
        legacy=JSON.parse(old||'null');
        if(old&&!localStorage.getItem('sigma-material-limits-legacy-v114'))localStorage.setItem('sigma-material-limits-legacy-v114',old);
    }catch(_){}
    const uploads=new WeakMap(),batches=new WeakMap();
    function accept(data){
        limits=data.limits;loadedAt=Date.now();
        try{localStorage.setItem('sigma-material-limits',JSON.stringify(limits));localStorage.setItem('sigma_settings_video_max_mb',String(limits.video.max));}catch(_){}
        capFrames();return limits;
    }
    async function refresh(force=false){
        if(pending)return pending;
        if(!force&&loadedAt&&Date.now()-loadedAt<30000)return limits;
        pending=window.SigmaDatabase.request('material_limits').then(async data=>{
            const actor=window.SigmaDatabase.currentUser?.()||{};
            const manager=String(actor.role||actor.type||'').replace(/[\s_-]/g,'').toLowerCase()==='masteradmin'||actor.permissions?.settingsApi===true;
            if(!data.configured&&!migrationTried&&legacy&&manager&&location.pathname.endsWith('/admin.html')){
                migrationTried=true;
                const candidate=structuredClone(data.limits);
                candidate.video.embed=Number(legacy.video?.embed)||candidate.video.embed;
                if(candidate.video.embed===1)candidate.video.embed=60;if(candidate.video.embed===2)candidate.video.embed=90;
                candidate.video.mp4=Number(legacy.video?.mp4||legacy.video?.std)||candidate.video.mp4;
                candidate.video.ext=Number(legacy.video?.ext)||candidate.video.ext;
                for(const type of ['docx','pdf','pptx']){candidate[type].std=Number(legacy[type]?.std||legacy[type]?.reg)||candidate[type].std;candidate[type].ext=Number(legacy[type]?.ext)||candidate[type].ext;}
                candidate.batchQuota=Number(legacy.batchQuota||legacy.submissionBatchQuota)||candidate.batchQuota;
                try{return accept(await window.SigmaDatabase.request('material_limits',{data:{scope:'all',limits:candidate}}));}catch(_){}
            }
            return accept(data);
        }).finally(()=>{pending=null;});return pending;
    }
    async function save(scope,value){
        const snapshot=structuredClone(value);
        saving=saving.catch(()=>{}).then(async()=>accept(await window.SigmaDatabase.request('material_limits',{data:{scope,limits:snapshot}})));
        return saving;
    }
    function maxMb(file){
        const ext=String(file.name||file.fileName||'').split('.').pop().toLowerCase();
        return limits[['mp4','webm','mov','mkv','avi'].includes(ext)?'video':['ppt','pptx'].includes(ext)?'pptx':ext==='pdf'?'pdf':'docx'].max;
    }
    function assertFiles(files,batch=false){
        let total=0;
        for(const file of files){const size=Number(file.size);if(!Number.isFinite(size)||size<0||size>maxMb(file)*1048576)throw new Error(`${file.name||'File'} exceeds the saved ${maxMb(file)} MB file limit.`);total+=size;}
        if(batch&&total>limits.batchQuota*1048576)throw new Error(`Combined files exceed the saved ${limits.batchQuota} MB submission quota.`);
    }
    function youtubeUrl(value){
        try{const url=new URL(value,location.href);if(!['www.youtube.com','youtube.com','www.youtube-nocookie.com','youtube-nocookie.com'].includes(url.hostname)||!url.pathname.startsWith('/embed/'))return value;
            url.searchParams.set('end',String(limits.video.embed*60));url.searchParams.delete('start');return url.href;
        }catch(_){return value;}
    }
    function capFrames(){
        document.querySelectorAll('iframe[src]').forEach(frame=>{const old=frame.getAttribute('src'),next=youtubeUrl(old);if(next!==old)frame.setAttribute('src',next);});
    }
    async function uploadSubmission(files){
        await refresh(true);assertFiles(files,true);
        if(!batches.has(files))batches.set(files,crypto.randomUUID());const batch=batches.get(files),result=[];
        for(const file of files){
            const saved=uploads.get(file);
            if(saved?.batch===batch){result.push(saved.payload);continue;}
            const form=new FormData();form.append('file',file,file.name);form.append('category','submissions');form.append('submission_batch_id',batch);
            const response=await window.SigmaDatabase.fetch(new URL('upload.php',window.SigmaDatabase.url('material_limits')).href,{method:'POST',body:form,signal:AbortSignal.timeout(240000)});
            let data;try{data=await response.json();}catch(_){throw new Error('The upload server is unavailable. Your submission has not been sent.');}
            if(!response.ok||!data.success)throw new Error(data.error||'Your submission file could not be uploaded.');
            if(data.warning)window.showToast?.(data.warning,'warning');
            const payload={name:file.name,fileName:file.name,size:file.size,type:file.name.split('.').pop().toLowerCase(),url:data.url};
            uploads.set(file,{batch,payload});result.push(payload);
        }
        return result;
    }
    window.SigmaMaterialLimits={get:()=>structuredClone(limits),refresh,save,assertFiles,youtubeUrl,uploadSubmission};
    function start(){refresh().catch(()=>{});new MutationObserver(capFrames).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['src']});}
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
    window.addEventListener('focus',()=>refresh(true).catch(()=>{}));
})();
