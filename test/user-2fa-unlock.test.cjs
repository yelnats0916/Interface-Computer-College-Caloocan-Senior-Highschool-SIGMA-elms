const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const source=fs.readFileSync('js/admin.js','utf8');
const start=source.indexOf('window.userHasAccessed2FA = function'),end=source.indexOf('window.resetUser2FA = function',start);
const context={window:{},USER_STORAGE_KEY:'users',getStoredJson:()=>[{id:'cached',totp_enabled:true}],localStorage:{getItem:()=> 'true'}};
vm.runInNewContext(source.slice(start,end),context);const ready=context.window.userHasAccessed2FA;
for(const user of [{},{id:'new',totp_enabled:false},{id:'qr',totpSecretGenerated:true,has2fa:true,totp_secret:'fixture'}, {id:'pending',totp_enabled:false,totpEnabled:true}, {id:'cached',totp_enabled:false}])assert.equal(ready(user,user.id),false,'QR, local secrets, stale positive flags and explicit disabled states never unlock reset');
for(const enabled of [true,1,'1']){assert.equal(ready({totp_enabled:enabled}),true);assert.equal(ready({totpEnabled:enabled}),true);}
assert.equal(ready(null,'cached'),true);assert.equal(ready(null,'missing'),false);
const user={id:'account',totp_enabled:false};assert.equal(ready(user),false);user.totp_enabled=true;assert.equal(ready(user),true);user.totp_enabled=false;assert.equal(ready(user),false,'Reset relocks until the next successful setup verification');
const users=fs.readFileSync('php/api/users.php','utf8');assert(users.includes("'has2fa'       => !empty($row['totp_enabled']),"));
const auth=fs.readFileSync('php/api/auth.php','utf8');const disable=auth.slice(auth.indexOf("if ($action === 'disable_2fa')"));assert(disable.indexOf('sigmaCanResetAuthenticator')<disable.indexOf('UPDATE users SET totp_secret'));assert(disable.indexOf('SELECT totp_enabled FROM users')<disable.indexOf('UPDATE users SET totp_secret'));assert(disable.includes('FOR UPDATE'));assert(disable.includes('Authenticator setup has not been verified.'));
for(const width of ['desktop','mobile'])assert(fs.readFileSync('js/profile-view.js','utf8').includes('Locked: Authenticator setup has not been verified'));
console.log('PASS verified-only reset eligibility, stale/local-state rejection, reset relocking, API authority/state guards.');
