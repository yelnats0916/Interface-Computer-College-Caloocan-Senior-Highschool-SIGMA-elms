/**
 * SIGMA ELMS - Profile Bridge
 * Interface Computer College - Caloocan Senior High School ELMS
 * All profile functions, synchronization, and views are 100% centralized in js/profile-view.js.
 */

(function () {
    // Re-export / alias canonical methods from js/profile-view.js
    if (typeof window.syncUserProfileData === 'function') {
        window.syncUserProfileAvatar = window.syncUserProfileData;
    }
})();
