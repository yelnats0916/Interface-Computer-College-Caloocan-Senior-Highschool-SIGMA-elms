/* School Profile for search results: viewing only, shared by every portal. */
(function () {
    'use strict';
    const defaults = {
        schoolName: 'Interface Computer College Caloocan',
        location: 'Caloocan City',
        address: '10th Avenue corner Rizal Avenue Extension',
        contactNumber: '09947669267', emailAddress: 'information@interface.edu.ph',
        logo: 'image/ICC logo.jpg',
        bios: [
            {title:'Mission', description:'To provide affordable, high-quality, industry-aligned education and comprehensive training that empowers learners with practical skills, innovative mindset, and moral integrity for academic and career excellence.'},
            {title:'Vision', description:'Interface Computer College envisions itself as a leading educational institution producing globally competent, socially responsible, and values-oriented professionals in technology and management.'}
        ]
    };
    function profileData() {
        let saved = {};
        try { saved = JSON.parse(localStorage.getItem('sigma-admin-organization') || '{}') || {}; } catch (_) {}
        // Return display fields only. Account and administration fields are excluded.
        const result = {};
        for (const key of ['schoolName','location','address','contactNumber','emailAddress','logo']) {
            result[key] = typeof saved[key] === 'string' ? saved[key] : defaults[key];
        }
        result.bios = (Array.isArray(saved.bios) && saved.bios.length ? saved.bios : defaults.bios)
            .filter(bio => bio && typeof bio.title === 'string' && typeof bio.description === 'string')
            .map(bio => ({title:bio.title, description:bio.description}));
        return result;
    }
    const markup = `<section id="public-school-profile-view" class="dynamic-section hidden">
                    <!-- TOP HEADER WHITE PANEL (Centered 1040px Banner, Avatar, Info, and Tabs) -->
                    <div class="w-full bg-white border-b border-slate-200 shadow-sm">
                        <div class="mx-auto max-w-[1040px] w-full px-6 md:px-10">
                            <!-- Green Hero Banner -->
                            <div class="relative min-h-[220px] md:min-h-[310px]">
                                <div class="absolute inset-0 overflow-hidden rounded-b-[44px] bg-[#15803d]">
                                    <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.18),_transparent_38%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.14),_transparent_34%)]"></div>
                                    <div class="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(90deg,transparent_0,transparent_22px,rgba(250,204,21,0.4)_22px,rgba(250,204,21,0.4)_23px)]"></div>
                                    <div class="absolute bottom-0 left-1/3 right-0 h-px bg-white/10"></div>
                                </div>
                                <div class="relative px-6 md:px-10 pt-10 pb-0 min-h-[220px] md:min-h-[310px] flex items-end">
                                    <div class="relative z-10 flex flex-row items-center gap-3 md:gap-8 w-full">
                                        <div id="public-profile-logo-trigger"
                                            class="w-40 h-40 md:w-48 md:h-48 rounded-full bg-white flex items-center justify-center focus:outline-none shrink-0 mb-[-74px] overflow-hidden  border-4 border-white shadow-md transition-transform "
                                            aria-label="School logo">
                                            <img id="public-view-school-logo" src="image/ICC logo.jpg" alt="School Logo" class="w-full h-full object-contain p-3">
                                            <div id="public-view-school-logo-placeholder" class="hidden w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
                                                <i class="fa-solid fa-graduation-cap text-5xl md:text-6xl text-slate-400"></i>
                                            </div>
                                        </div>
                                        <div class="flex-1 md:pb-5">
                                            <div class="flex flex-col items-start gap-1.5">
                                                <h2 class="text-[1.85rem] md:text-[2.6rem] font-bold text-white tracking-tight leading-[1.02]">
                                                    <span id="public-view-school-branch-name">Interface Computer College Caloocan</span>
                                                </h2>
                                                <div class="flex items-center gap-3">
                                                    <span class="profile-role-badge">Institution</span>
                                                    <span class="text-xs md:text-sm font-bold tracking-wider text-white drop-shadow-sm">Campus: Caloocan</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Clearance below avatar & About Header inside Top White Header Panel -->
                            <div class="pt-24 pb-3">
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 items-center border-t-2 border-slate-300 pt-4">
                                    <div class="flex items-center justify-center shrink-0">
                                        <h3 class="text-base font-bold text-black tracking-normal font-['Inter']">About</h3>
                                    </div>
                                    <div></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- TWO PANELS DIRECTLY ON THE DEFAULT PAGE (2 Equal Columns like User Profile Admin View) -->
                    <div class="mx-auto max-w-[1040px] w-full px-6 md:px-10 py-6 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 flex-1">
                        <!-- Left Column: Basic Details (Street, Contact, Email with divide-y lines) -->
                        <aside class="flex flex-col gap-6 h-fit w-full">
                            <div class="rounded-[28px] border border-slate-200 bg-white p-7 md:p-8 space-y-4 shadow-sm divide-y divide-slate-200">
                                <!-- Street / Address -->
                                <div class="space-y-1.5 pt-0">
                                    <div class="flex items-center gap-2.5">
                                        <i class="fa-solid fa-location-dot text-sm md:text-base text-red-500"></i>
                                        <p class="text-sm md:text-base font-bold text-black font-['Inter']">Street</p>
                                    </div>
                                    <p id="public-view-address" class="text-base md:text-lg font-medium text-black font-['Inter'] break-words">10th Avenue corner Rizal Avenue Extension</p>
                                </div>

                                <!-- Contact -->
                                <div class="space-y-1.5 pt-4">
                                    <div class="flex items-center gap-2.5">
                                        <i class="fa-solid fa-phone text-sm md:text-base text-emerald-600"></i>
                                        <p class="text-sm md:text-base font-bold text-black font-['Inter']">Contact</p>
                                    </div>
                                    <p id="public-view-contact" class="text-base md:text-lg font-medium text-black font-['Inter'] break-words">09947669267</p>
                                </div>

                                <!-- Email -->
                                <div class="space-y-1.5 pt-4">
                                    <div class="flex items-center gap-2.5">
                                        <i class="fa-solid fa-envelope text-sm md:text-base text-blue-500"></i>
                                        <p class="text-sm md:text-base font-bold text-black font-['Inter']">Email</p>
                                    </div>
                                    <p id="public-view-email" class="text-base md:text-lg font-medium text-black font-['Inter'] break-words">information@interface.edu.ph</p>
                                </div>
                            </div>
                        </aside>

                        <!-- Right Column: Bio Panel -->
                        <section id="public-school-profile-tab-panel" class="w-full"></section>
                    </div>
                </section>`;
    function ensureView() {
        let view = document.getElementById('public-school-profile-view');
        if (!view) {
            const host = document.getElementById('content-sections') || document.querySelector('main');
            if (!host) return null;
            const holder = document.createElement('div');
            holder.innerHTML = markup;
            view = holder.firstElementChild;
            host.appendChild(view);
        }
        return view;
    }
    function paint(view) {
        const profile = profileData();
        const fields = {'public-view-school-branch-name':'schoolName','public-view-address':'address','public-view-contact':'contactNumber','public-view-email':'emailAddress'};
        Object.entries(fields).forEach(([id,key]) => { view.querySelector('#'+id).textContent = profile[key] || 'Not provided'; });
        const logo = view.querySelector('#public-view-school-logo');
        let source = defaults.logo;
        try {
            const candidate = new URL(profile.logo, location.href);
            if (['https:','http:','blob:'].includes(candidate.protocol) || /^data:image\/(png|jpe?g|gif|webp);/i.test(profile.logo)) source = candidate.href;
        } catch (_) {}
        logo.src = source;
        logo.onerror = () => { logo.onerror = null; logo.src = defaults.logo; };
        const panel = view.querySelector('#public-school-profile-tab-panel');
        panel.innerHTML = '<div class="rounded-[28px] border border-slate-200 bg-white p-7 md:p-8 space-y-5 shadow-sm min-h-[360px] flex flex-col"><h4 class="text-sm md:text-base font-bold text-black">Bio</h4><div class="space-y-3" data-public-school-bios></div></div>';
        const bios = panel.querySelector('[data-public-school-bios]');
        if (!profile.bios.length) {
            const empty = document.createElement('p');
            empty.className = 'text-sm text-black-fade';
            empty.textContent = 'No school bio available.';
            bios.appendChild(empty);
        }
        profile.bios.forEach(bio => {
            const item = document.createElement('div');
            item.className = 'p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5';
            const title = document.createElement('h5');
            title.className = 'text-sm md:text-base font-bold text-black';
            title.textContent = bio.title;
            const body = document.createElement('p');
            body.className = 'text-sm md:text-base text-black leading-relaxed whitespace-pre-wrap break-words';
            body.textContent = bio.description;
            item.append(title, body);
            bios.appendChild(item);
        });
    }
    function open(updateHistory = true) {
        if (updateHistory && location.hash !== '#school-profile-view') {
            history.pushState({page:'school-profile-view'}, '', '#school-profile-view');
        }
        const view = ensureView();
        if (!view) return;
        paint(view);
        document.querySelectorAll('.dynamic-section').forEach(section => {
            section.classList.toggle('hidden', section !== view);
            section.style.display = section === view ? 'block' : 'none';
        });
        document.querySelectorAll('#sidebar .active').forEach(link => link.classList.remove('active'));
        window.setPortalHeader?.('School Management', 'School Profile');
        for (const id of ['main-content','admin-main','teacher-main','student-main','layout-wrapper']) {
            const scope = document.getElementById(id);
            if (scope) scope.scrollTop = 0;
        }
        window.scrollTo(0,0);
    }
    window.SigmaSchoolProfileView = {open, getProfile:profileData};
    window.addEventListener('storage', event => {
        const view = document.getElementById('public-school-profile-view');
        if (event.key === 'sigma-admin-organization' && view && !view.classList.contains('hidden')) paint(view);
    });
})();
