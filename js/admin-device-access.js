/* Presentation compatibility policy; account permissions remain server enforced. */
(function () {
    'use strict';
    const message = 'Admin access is unavailable on this device. Please use a supported device to continue.';
    function restricted() { return false; }
    function sync() { document.documentElement.classList.toggle('sigma-admin-device-restricted', restricted()); }
    window.SigmaAdminDeviceAccess = { restricted, message };
    sync();
    window.addEventListener('resize', sync);
    window.addEventListener('orientationchange', sync);
})();
