const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('js/index.js','utf8');
const start=source.indexOf('    async function handleLogin('),end=source.indexOf('        const accountKey =',start);
const helpers=source.slice(source.indexOf('    function showError('),source.indexOf('    function clearErrors('));
const element=()=>({textContent:'',style:{},classList:{values:new Set(['hidden']),add(...v){v.forEach(x=>this.values.add(x));},remove(...v){v.forEach(x=>this.values.delete(x));},contains(v){return this.values.has(v);}}});
const errors=Object.fromEntries(['id','pass','modalId','modalPass','general','modalGeneral'].map(k=>[k,element()]));
const inputs=Object.fromEntries(['id','pass','modalId','modalPass'].map(k=>[k,element()]));
const captcha={landingContainer:element(),modalContainer:element()};
let failure,requests=0,prepared=[],attempts={},locked=false;
const context={AbortSignal,ui:{errors,inputs,captcha},window:{SigmaDatabase:{request:async()=>{requests++;throw failure;}},SigmaRecaptcha:{isChallengeRequired:(p,a,b)=>p.recaptchaEnabled&&(a>=p.loginIdAttempts||b>=p.loginIdAttempts)}},sessionStorage:{removeItem(){}},recaptchaConfigReady:Promise.resolve(),submitGuardLocked:false,loginCandidate:null,activeValidatedFlows:{landing:null,modal:null},invalidLoginIdAttempts:0,
 clearErrors(){Object.values(errors).forEach(el=>{el.textContent='';el.classList.add('hidden');});Object.values(inputs).forEach(el=>el.classList.remove('input-error'));},setLoading(f,value){context.submitGuardLocked=value;},
 resetPasswordAttempts:k=>attempts[k]=0,getPasswordAttempts:k=>attempts[k]||0,incrementPasswordAttempts:k=>attempts[k]=(attempts[k]||0)+1,getLoginSecurityConfig:()=>({loginIdAttempts:3,recaptchaEnabled:true}),
 isSameCaptchaFlow:(a,b)=>a?.type===b?.type&&a?.id===b?.id,resetRecaptcha(){context.activeValidatedFlows={landing:null,modal:null};},prepareCaptchaFlow(flow,submission){prepared.push({flow,submission});}};
vm.createContext(context);vm.runInContext(helpers+source.slice(start,end)+'\n}\nglobalThis.login=handleLogin;',context);
(async()=>{
 failure=Object.assign(new Error('Enter valid ID or email.'),{code:'invalid_login_id',status:401});
 await context.login('unknown','', 'landing');assert.equal(errors.id.textContent,'Enter valid ID or email.');assert.equal(errors.pass.textContent,'');assert.equal(inputs.pass.classList.contains('input-error'),false);assert.equal(inputs.id.classList.contains('input-error'),true);
 for(let i=0;i<9;i++)await context.login('unknown'+i,'','landing');assert.equal(prepared.length,0,'Random IDs must never trigger CAPTCHA.');assert.equal(requests,10);
 await context.login('random','','modal');assert.equal(prepared.length,0,'Modal random IDs must never trigger CAPTCHA.');
 context.invalidLoginIdAttempts=0;prepared=[];attempts={};failure=Object.assign(new Error('Wrong password.'),{code:'wrong_password',status:401});
 for(let i=0;i<3;i++)await context.login('0000000','incorrect','modal');
 assert.equal(errors.modalPass.textContent,'Wrong password.');assert.equal(inputs.modalPass.classList.contains('input-error'),true);assert.equal(errors.modalId.textContent,'');assert.equal(prepared.length,1);assert.equal(prepared[0].submission.formType,'modal');
 failure=Object.assign(new Error('Enter valid ID or email.'),{code:'invalid_login_id',status:401});prepared=[];await context.login('different-random-id','test','landing');assert.equal(prepared.length,0,'Another account failed passwords must not affect a random ID.');
 attempts={};prepared=[];failure=Object.assign(new Error('Service unavailable.'),{status:503});await context.login('0000000','test','landing');assert.equal(context.invalidLoginIdAttempts,0);assert.deepEqual(attempts,{});assert.equal(prepared.length,0);assert.equal(errors.general.textContent,'');assert.equal(inputs.pass.classList.contains('input-error'),false);
 failure=Object.assign(new Error('Timed out'),{name:'TimeoutError'});await context.login('0000000','test','landing');assert.equal(errors.general.textContent,'');assert.deepEqual(attempts,{});
 for(const [code,message] of [['password_required','Password is required.'],['account_locked','The account is locked. Please contact Administrative personnel'],['account_inactive','Invalid credentials. Please check your Email or Login ID and password.']]){failure=Object.assign(new Error(message),{code,status:400});await context.login('0000000','test','landing');assert.equal(errors.pass.textContent,message);assert.equal(inputs.pass.classList.contains('input-error'),true);}
 const identityListeners={};
 const button=()=>({disabled:true,classList:element().classList});
 const view={inputs:{id:{addEventListener:(type,fn)=>identityListeners.landing=fn},modalId:{addEventListener:(type,fn)=>identityListeners.modal=fn}},captcha:{landingContainer:element(),modalContainer:element()},btns:{submit:button(),modalSubmit:button()}};
 Object.values(view.captcha).forEach(host=>host.classList.remove('hidden'));
 let canceledWidgets=0;
 const editing={ui:view,window:{SigmaRecaptcha:{cancel:()=>canceledWidgets++}},activeValidatedFlows:{landing:{type:'wrong-password',id:'0000000'},modal:{type:'wrong-password',id:'0000000'}},pendingCaptchaSubmission:{formType:'landing'},pendingCaptchaFlow:{}};
 vm.createContext(editing);
 vm.runInContext(source.slice(source.indexOf('    function resetRecaptcha('),source.indexOf('    function isSameCaptchaFlow('))+source.slice(source.indexOf('    [[ui.inputs.id, \'landing\']'),source.indexOf('    // Restore explicit Enter key listeners')),editing);
 identityListeners.landing();identityListeners.modal();
 assert.equal(canceledWidgets,2);assert.equal(view.captcha.landingContainer.classList.contains('hidden'),true);assert.equal(view.captcha.modalContainer.classList.contains('hidden'),true);assert.equal(view.btns.submit.disabled,false);assert.equal(view.btns.modalSubmit.disabled,false);assert.equal(editing.activeValidatedFlows.landing,null);
 console.log('PASS: original credential messages, red ID/password borders on the correct field, registered-account third-failure CAPTCHA; random IDs excluded, modal parity and network failure handling.');
})().catch(e=>{console.error(e);process.exitCode=1});
