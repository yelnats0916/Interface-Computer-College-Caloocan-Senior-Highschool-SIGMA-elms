(function () {
    'use strict';
    function user() { return window.SigmaDatabase?.currentUser?.() || {}; }
    function allowed(key) { return user().permissions?.[key] !== false; }
    function sync() {
        const role = String(user().role || '').toLowerCase();
        const rules = role === 'student' ? {
            studentGrades: '#nav-grades',
            studentBio: '#user-profile-view #user-profile-picture-trigger, #user-profile-view button[onclick*="toggleEditUserBio"]'
        } : role === 'teacher' ? {
            teacherGrades:'#nav-grades, #tab-btn-gradebook',
            teacherAttendance:'#tab-btn-attendance'
        } : {};
        Object.entries(rules).forEach(([key,selector]) => document.querySelectorAll(selector).forEach(control => {
            if (!allowed(key)) { control.dataset.roleAccessHidden = 'true'; control.style.setProperty('display','none','important'); }
            else if (control.dataset.roleAccessHidden) { delete control.dataset.roleAccessHidden; control.style.removeProperty('display'); }
        }));
    }
    window.SigmaRoleAccess = {allowed};
    let scheduled = false;
    const observer = new MutationObserver(records => {
        if (!records.some(record => record.type === 'childList' && record.addedNodes.length)) return;
        if (!scheduled) { scheduled=true; requestAnimationFrame(()=>{scheduled=false;sync();}); }
    });
    observer.observe(document.documentElement,{childList:true,subtree:true});
    document.addEventListener('DOMContentLoaded',sync);
    window.addEventListener('pageshow',sync);
})();
