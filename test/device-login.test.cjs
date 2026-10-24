const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
for(const agent of ['Windows Chrome','iPhone Mobile Safari','Android Mobile Chrome','iPad Safari']){
const ctx={navigator:{userAgent:agent,maxTouchPoints:5},matchMedia:()=>({matches:true}),document:{documentElement:{classList:{toggle(){}}}},window:{addEventListener(){}}};vm.createContext(ctx);vm.runInContext(fs.readFileSync('js/admin-device-access.js','utf8'),ctx);assert.equal(ctx.window.SigmaAdminDeviceAccess.restricted(),false);
}
const php=fs.readFileSync('php/api/session.php','utf8');assert(!php.includes('admin_device_restricted'));assert(php.includes('sigmaCheckLoginCredentials'));assert(php.includes('application_login_challenges'));console.log('PASS desktop/mobile admin compatibility; server credential verification and login challenges retained.');
