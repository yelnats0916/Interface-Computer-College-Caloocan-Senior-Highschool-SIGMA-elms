/* Presentation compatibility policy; account permissions remain server enforced. */
(function () {
    'use strict';
    const message = 'Admin access is unavailable on this device. Please use a supported device to continue.';
    function restricted() {
        const agent = navigator.userAgent || '';
        return matchMedia('(max-width: 1023.98px)').matches
            || /Android|iPhone|iPad|iPod|Mobile|Tablet|IEMobile|Opera Mini/i.test(agent)
            || (/Macintosh/i.test(agent) && navigator.maxTouchPoints > 1);
    }
    function sync() { document.documentElement.classList.toggle('sigma-admin-device-restricted', restricted()); }
    window.SigmaAdminDeviceAccess = { restricted, message };
    sync();
    window.addEventListener('resize', sync);
    window.addEventListener('orientationchange', sync);
})();
