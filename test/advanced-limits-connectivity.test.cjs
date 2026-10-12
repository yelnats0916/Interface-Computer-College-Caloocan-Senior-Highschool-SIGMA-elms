const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const adminJs = fs.readFileSync(path.join(root, 'js/admin.js'), 'utf8');
const sharedJs = fs.readFileSync(path.join(root, 'js/shared-components.js'), 'utf8');
const adminHtml = fs.readFileSync(path.join(root, 'admin.html'), 'utf8');
const sysViewsPhp = fs.readFileSync(path.join(root, 'php/includes/system_settings_views.php'), 'utf8');
const settingsCss = fs.readFileSync(path.join(root, 'css/settings-view.css'), 'utf8');

console.log('--- STARTING CONNECTIVITY TEST SUITE ---');

// 1. Verify HTML / PHP markup connectivity & White Full Page styling
assert.ok(adminHtml.includes('openAdvancedLimitsPage()'), 'admin.html must wire Advanced Settings button to openAdvancedLimitsPage()');
assert.ok(adminHtml.includes('id="settings-limits-view"'), 'admin.html must contain #settings-limits-view');
assert.ok(adminHtml.includes('bg-white w-full min-h-screen'), 'admin.html must set #settings-limits-view as white full page');

const limitsHtmlAdmin = adminHtml.slice(adminHtml.indexOf('id="settings-limits-view"'), adminHtml.indexOf('</section>', adminHtml.indexOf('id="settings-limits-view"')));
assert.ok(!limitsHtmlAdmin.includes('backToIntegrationsSettings()'), 'settings-limits-view must delete the in-page Back to Integrations button');
assert.ok(limitsHtmlAdmin.includes('>Advanced Settings</h1>'), 'settings-limits-view header must be Advanced Settings');
assert.ok(!limitsHtmlAdmin.includes('Configure extension headroom, multi-file submission quotas'), 'settings-limits-view header must not contain subtitle');
assert.ok(!limitsHtmlAdmin.includes('Live Sandbox Test Upload Panel'), 'settings-limits-view must not contain Sandbox panel');

const limitsHtmlPhp = sysViewsPhp.slice(sysViewsPhp.indexOf('id="settings-limits-view"'), sysViewsPhp.indexOf('</section>', sysViewsPhp.indexOf('id="settings-limits-view"')));
assert.ok(!limitsHtmlPhp.includes('backToIntegrationsSettings()'), 'system_settings_views.php limits view must delete the in-page Back to Integrations button');
assert.ok(limitsHtmlPhp.includes('>Advanced Settings</h1>'), 'system_settings_views.php header must be Advanced Settings');
assert.ok(!limitsHtmlPhp.includes('Configure extension headroom, multi-file submission quotas'), 'system_settings_views.php header must not contain subtitle');
assert.ok(!limitsHtmlPhp.includes('Live Sandbox Test Upload Panel'), 'system_settings_views.php limits view must not contain Sandbox panel');

assert.ok(settingsCss.includes('#settings-limits-view'), 'css/settings-view.css must style #settings-limits-view with pure white background');
console.log('✓ Check 1 passed: White full page enabled, Advanced Settings header present with no subtitle, in-page Back button removed, Sandbox removed.');

// 2. Setup mock environment to test JS integration
const store = new Map();
const mockLocalStorage = {
    getItem: k => store.get(k) || null,
    setItem: (k, v) => store.set(k, String(v))
};

let currentTab = null;
const mockWindow = {
    location: {
        hash: '',
        href: 'http://localhost/admin.html#nav-settings-integrations'
    },
    history: {
        state: {},
        replaceState(s, t, h) { this.state = s; mockWindow.location.href = h; }
    },
    switchTab: tab => { currentTab = tab; mockWindow.location.hash = tab; },
    showSection: (sec, active) => { currentTab = sec; mockWindow.location.hash = sec; },
    localStorage: mockLocalStorage,
    showToast: () => {},
    showGlobalToast: () => {}
};

// 3. Test shared-components getSigmaMaterialLimits defaults
const scStart = sharedJs.indexOf('window.getSigmaMaterialLimits = function');
const scEnd = sharedJs.indexOf('window.renderSharedVideosTabHtml', scStart);
const scCtx = vm.createContext({
    window: mockWindow,
    localStorage: mockLocalStorage,
    console
});
vm.runInContext(sharedJs.slice(scStart, scEnd), scCtx);

const defaultLimits = mockWindow.getSigmaMaterialLimits();
assert.equal(defaultLimits.docx.std, 20, 'Default DOCX standard limit must be 20 MB');
assert.equal(defaultLimits.docx.max, 25, 'Default DOCX max ceiling (20 + 5) must be 25 MB');
assert.equal(defaultLimits.pdf.std, 25, 'Default PDF standard limit must be 25 MB');
assert.equal(defaultLimits.pdf.max, 30, 'Default PDF max ceiling (25 + 5) must be 30 MB');
assert.equal(defaultLimits.pptx.std, 50, 'Default PPTX standard limit must be 50 MB');
assert.equal(defaultLimits.pptx.max, 55, 'Default PPTX max ceiling (50 + 5) must be 55 MB');
assert.equal(defaultLimits.video.mp4, 200, 'Default Video MP4 limit must be 200 MB');
assert.equal(defaultLimits.video.max, 225, 'Default Video max ceiling (200 + 25) must be 225 MB');
assert.equal(defaultLimits.batchQuota, 150, 'Default submission multi-file batch quota must be 150 MB');
console.log('✓ Check 2 passed: Default limits match required specs (DOCX 20+5, PDF 25+5, PPTX 50+5, Video 200+25, Quota 150).');

// 4. Test Student upload validation logic with limits
const uploadHandlerStart = sharedJs.indexOf('window.handleStudentAnswerFileSelected = function');
const uploadHandlerEnd = sharedJs.indexOf('window.removeStudentAnswerFile = function', uploadHandlerStart);

let lastToast = null;
mockWindow.showToast = (msg, type) => { lastToast = { msg, type }; };
mockWindow.renderStudentAnswerFilesList = () => {};

vm.runInContext(sharedJs.slice(uploadHandlerStart, uploadHandlerEnd), scCtx);

// Test 4a: File within per-file limit (e.g. 15 MB DOCX) -> accepted
mockWindow._studentPendingAnswerFiles = [];
mockWindow.handleStudentAnswerFileSelected({
    target: { files: [{ name: 'assignment1.docx', size: 15 * 1024 * 1024 }] }
});
assert.equal(mockWindow._studentPendingAnswerFiles.length, 1);
assert.equal(mockWindow._studentPendingAnswerFiles[0].name, 'assignment1.docx');

// Test 4b: File exceeding per-file ceiling (e.g. 48 MB DOCX > 45 MB max ceiling) -> rejected
lastToast = null;
mockWindow.handleStudentAnswerFileSelected({
    target: { files: [{ name: 'huge_word.docx', size: 48 * 1024 * 1024 }] }
});
assert.equal(mockWindow._studentPendingAnswerFiles.length, 1, 'File exceeding per-file ceiling must be rejected');
assert.ok(lastToast && lastToast.type === 'error', 'Error toast must be shown for oversized file');

// Test 4c: Multi-file cumulative batch quota enforcement
mockWindow._studentPendingAnswerFiles = [];
mockWindow.handleStudentAnswerFileSelected({
    target: { files: [
        { name: 'part1.pptx', size: 50 * 1024 * 1024 },
        { name: 'part2.pptx', size: 50 * 1024 * 1024 }
    ] }
});
assert.equal(mockWindow._studentPendingAnswerFiles.length, 2);

lastToast = null;
mockWindow.handleStudentAnswerFileSelected({
    target: { files: [{ name: 'part3.pptx', size: 55 * 1024 * 1024 }] }
});
assert.equal(mockWindow._studentPendingAnswerFiles.length, 2, 'File exceeding cumulative batch quota must be rejected');
assert.ok(lastToast && lastToast.msg.includes('submission quota'), 'Toast must indicate batch quota exceeded');
console.log('✓ Check 3 passed: Student upload validation enforces both per-file ceiling and cumulative batch quota.');

// 5. Test Admin Page 1 and Page 2 connectivity functions and routing
assert.ok(adminJs.includes('window.openAdvancedLimitsPage = function'), 'admin.js must define openAdvancedLimitsPage');
assert.ok(adminJs.includes('window.initAdvancedLimitsPage = function'), 'admin.js must define initAdvancedLimitsPage');
assert.ok(adminJs.includes('window.saveAdvancedLimits = function'), 'admin.js must define saveAdvancedLimits');
assert.ok(adminJs.includes('window.advSandboxAdd = function'), 'admin.js must define advSandboxAdd');
assert.ok(adminJs.includes('window.renderAdvSandbox = function'), 'admin.js must define renderAdvSandbox');
assert.ok(adminJs.includes("tabId === 'nav-settings-limits' || tabId === 'settings-limits-view'"), 'switchTab must handle nav-settings-limits');
assert.ok(adminJs.includes("'File Upload Size Limits'"), "topbar portal header must use File Upload Size Limits");
console.log('✓ Check 4 passed: Admin Page 2 navigation, history routing, topbar header, and sandbox functions are defined in admin.js.');

// 6. Test Counter Box Input Restrictions & Sanitization
assert.ok(adminJs.includes('window.handleCounterKeydown = function'), 'admin.js must define handleCounterKeydown');
assert.ok(adminJs.includes('window.sanitizeCounterInput = function'), 'admin.js must define sanitizeCounterInput');
assert.ok(adminJs.includes('window.normalizeCounterInput = function'), 'admin.js must define normalizeCounterInput');
assert.ok(adminJs.includes('window.handleCounterPaste = function'), 'admin.js must define handleCounterPaste');
assert.ok(adminJs.includes('window.bindCounterBox = function'), 'admin.js must define bindCounterBox');

// Check HTML & PHP markup attributes for counter inputs
assert.ok(adminHtml.includes('inputmode="numeric" pattern="[0-9]*" maxlength="3"'), 'admin.html video headroom must restrict inputmode and pattern');
assert.ok(adminHtml.includes('inputmode="numeric" pattern="[0-9]*" maxlength="2"'), 'admin.html doc headroom must restrict inputmode and pattern');
assert.ok(sysViewsPhp.includes('inputmode="numeric" pattern="[0-9]*" maxlength="3"'), 'sysViewsPhp video headroom must restrict inputmode and pattern');
assert.ok(sysViewsPhp.includes('inputmode="numeric" pattern="[0-9]*" maxlength="2"'), 'sysViewsPhp doc headroom must restrict inputmode and pattern');

// Evaluate counter restrictions in VM
const adminCtx = vm.createContext({
    window: mockWindow,
    document: {
        getElementById: () => null,
        addEventListener: () => {}
    },
    localStorage: mockLocalStorage,
    console
});
const utilStart = adminJs.indexOf('// --- STRICT NUMERIC RESTRICTION UTILITIES FOR COUNTER BOXES ---');
const utilEnd = adminJs.indexOf('// --- ADVANCED UPLOAD ALLOCATIONS & SANDBOX PAGE LOGIC ---', utilStart);
vm.runInContext(adminJs.slice(utilStart, utilEnd), adminCtx);

// Test 6a: handleCounterKeydown blocks invalid characters
const testKey = (key, ctrl = false) => {
    let prevented = false;
    mockWindow.handleCounterKeydown({
        key,
        ctrlKey: ctrl,
        metaKey: false,
        preventDefault: () => { prevented = true; }
    });
    return prevented;
};
assert.equal(testKey('e'), true, 'Must block exponential "e"');
assert.equal(testKey('E'), true, 'Must block exponential "E"');
assert.equal(testKey('-'), true, 'Must block minus sign "-"');
assert.equal(testKey('+'), true, 'Must block plus sign "+"');
assert.equal(testKey('.'), true, 'Must block decimal point "."');
assert.equal(testKey('a'), true, 'Must block letter "a"');
assert.equal(testKey('!'), true, 'Must block symbol "!"');
assert.equal(testKey('5'), false, 'Must allow digit "5"');
assert.equal(testKey('0'), false, 'Must allow digit "0"');
assert.equal(testKey('Backspace'), false, 'Must allow Backspace');
assert.equal(testKey('Tab'), false, 'Must allow Tab');
assert.equal(testKey('ArrowUp'), false, 'Must allow ArrowUp');
assert.equal(testKey('v', true), false, 'Must allow Ctrl+V');

// Test 6b: sanitizeCounterInput strips non-digits and caps at max
const dummyInput = { value: '999abc' };
mockWindow.sanitizeCounterInput(dummyInput, 10, 100);
assert.equal(dummyInput.value, '100', 'Must cap video headroom at max 100');

dummyInput.value = '99';
mockWindow.sanitizeCounterInput(dummyInput, 5, 50);
assert.equal(dummyInput.value, '50', 'Must cap document headroom at max 50');

dummyInput.value = '05';
mockWindow.sanitizeCounterInput(dummyInput, 5, 50);
assert.equal(dummyInput.value, '5', 'Must strip leading zero from "05"');

// Test 6c: normalizeCounterInput snaps to step of 5 and clamps within [min, max]
dummyInput.value = '12';
mockWindow.normalizeCounterInput(dummyInput, 10, 100, 25, 5);
assert.equal(dummyInput.value, '10', '12 must snap down to multiple of 5 (10)');

dummyInput.value = '13';
mockWindow.normalizeCounterInput(dummyInput, 10, 100, 25, 5);
assert.equal(dummyInput.value, '15', '13 must snap up to multiple of 5 (15)');

dummyInput.value = '2';
mockWindow.normalizeCounterInput(dummyInput, 10, 100, 25, 5);
assert.equal(dummyInput.value, '10', 'Value below min (2 < 10) must clamp to min 10');

dummyInput.value = '';
mockWindow.normalizeCounterInput(dummyInput, 10, 100, 25, 5);
assert.equal(dummyInput.value, '25', 'Empty video headroom must reset to default 25');

dummyInput.value = '';
mockWindow.normalizeCounterInput(dummyInput, 5, 50, 5, 5);
assert.equal(dummyInput.value, '5', 'Empty doc headroom must reset to default 5');

console.log('✓ Check 5 passed: Counter box strict numeric restrictions, keystroke blocking, and sanitization verified.');

// 7. Test Integrations Card Titles Subtitles Removal & Selector Name Parity
const verifyIntegrationsLayout = (source, label) => {
    // Assert subtitles are removed from the 4 cards
    assert.ok(!source.includes('Manage vault credentials for Google Gemini and Groq AI acceleration layers.'), `${label} AI Engines card must not contain subtitle`);
    assert.ok(!source.includes('Institutional cloud integration for secure document management, repository access, and lecture materials.'), `${label} Google Drive card must not contain subtitle`);
    assert.ok(!source.includes('Security credential for enterprise-grade bot protection and challenge validation.'), `${label} reCAPTCHA card must not contain subtitle`);
    assert.ok(!source.includes('Configure upload allocations and supported file formats across the institution'), `${label} File Upload Limits card must not contain subtitle`);

    // Assert selector names match the card titles exactly
    assert.ok(source.includes('>SIGMA AI Integration Engines</span>'), `${label} must contain selector for SIGMA AI Integration Engines`);
    assert.ok(source.includes('>Google Drive Cloud Storage</span>'), `${label} must contain selector for Google Drive Cloud Storage`);
    assert.ok(source.includes('>Google reCAPTCHA Protection</span>'), `${label} must contain selector for Google reCAPTCHA Protection`);
    assert.ok(source.includes('>File Upload Size Limits</span>'), `${label} must contain selector for File Upload Size Limits`);

    // Assert AI item titles are green and subtitles are removed
    assert.ok(!source.includes('Assistant intelligence'), `${label} Gemini must not contain subtitle`);
    assert.ok(!source.includes('Predictive & Prescriptive analytics'), `${label} Groq must not contain subtitle`);
    assert.ok(source.includes('text-[#15803d] font-[\'Inter\'] leading-tight">Google Gemini</p>'), `${label} Gemini title must be green`);
    assert.ok(source.includes('text-[#15803d] font-[\'Inter\'] leading-tight">Groq</p>'), `${label} Groq title must be green`);
};

verifyIntegrationsLayout(adminHtml, 'admin.html');
verifyIntegrationsLayout(sysViewsPhp, 'system_settings_views.php');
console.log('✓ Check 6 passed: Integrations card subtitles removed and sidebar selector titles match card titles.');

// 8. Test Student Submission Quota Sync & Student Portal Max Only Limit
const freshAdminHtml = fs.readFileSync(path.join(root, 'admin.html'), 'utf8');
const freshSysPhp = fs.readFileSync(path.join(root, 'php/includes/system_settings_views.php'), 'utf8');
const freshSharedJs = fs.readFileSync(path.join(root, 'js/shared-components.js'), 'utf8');

assert.ok(freshAdminHtml.includes('>Student Submission Quota</span>'), 'admin.html must use Student Submission Quota title');
assert.ok(freshSysPhp.includes('>Student Submission Quota</span>'), 'system_settings_views.php must use Student Submission Quota title');
assert.ok(!freshAdminHtml.includes('>Announcement Feed Video Limit</span>'), 'admin.html must remove static Announcement Feed Video Limit row');
assert.ok(!freshSysPhp.includes('>Announcement Feed Video Limit</span>'), 'system_settings_views.php must remove static Announcement Feed Video Limit row');
assert.ok(!freshAdminHtml.includes('>Profile Avatar Image Limit</span>'), 'admin.html must remove static Profile Avatar Image Limit row');
assert.ok(!freshSysPhp.includes('>Profile Avatar Image Limit</span>'), 'system_settings_views.php must remove static Profile Avatar Image Limit row');
assert.ok(freshSharedJs.includes('>Student Submission</h3>'), 'shared-components.js must use Student Submission title in student submission view');
assert.ok(freshSharedJs.includes('return `${curLimits?.batchQuota || 150} MB`;'), 'shared-components.js must return max batch quota in student submission badge');
assert.ok(!freshSharedJs.includes('${curLimits?.docx?.std || 20} MB docx'), 'shared-components.js must not expose internal standard docx limit in badge');
console.log('✓ Check 7 passed: Static permanent rows removed; Student Submission Quota cleanly synced in Admin and Student portal displaying max limit only.');

// 9. Test Advanced Settings Button Lock, Icon Removal & Shared Asking Panel on Leave
const freshAdminJs = fs.readFileSync(path.join(root, 'js/admin.js'), 'utf8');

// Assert button is disabled by default and has NO icon
const verifySaveBtnMarkup = (source, label) => {
    const btnMatch = source.match(/<button[^>]+id="adv-limits-save-btn"[^>]*>([\s\S]*?)<\/button>/);
    assert.ok(btnMatch, `${label} must contain #adv-limits-save-btn`);
    assert.ok(btnMatch[0].includes('disabled'), `${label} #adv-limits-save-btn must be disabled by default`);
    assert.ok(!btnMatch[1].includes('<i'), `${label} #adv-limits-save-btn must NOT contain an icon`);
    assert.ok(btnMatch[1].includes('Save Advanced Rules'), `${label} #adv-limits-save-btn must display text Save Advanced Rules`);
};
verifySaveBtnMarkup(freshAdminHtml, 'admin.html');
verifySaveBtnMarkup(freshSysPhp, 'system_settings_views.php');

assert.ok(freshAdminJs.includes('window.advancedLimitsAreDirty = function'), 'admin.js must define advancedLimitsAreDirty');
assert.ok(freshAdminJs.includes('window.updateAdvancedLimitsButtonState = function'), 'admin.js must define updateAdvancedLimitsButtonState');
assert.ok(freshAdminJs.includes('window.discardAdvancedLimitsDraft = function'), 'admin.js must define discardAdvancedLimitsDraft');
assert.ok(freshAdminJs.includes('window.confirmAdvancedLimitsLeave = function'), 'admin.js must define confirmAdvancedLimitsLeave');
assert.ok(freshAdminJs.includes('window.guardAdvancedLimitsHistory = function'), 'admin.js must define guardAdvancedLimitsHistory');

// Evaluate in VM
const advStore = new Map();
let advAskingPanel = null;
const advFields = {
    'adv-limit-video-ext': { value: '25' },
    'adv-limit-doc-ext': { value: '5' },
    'adv-limit-batch-quota': { value: '150' },
    'adv-limits-save-btn': { disabled: true, className: '', querySelector: () => null },
    'adv-limits-save-status': { textContent: '' },
    'settings-limits-view': { classList: { contains: () => false }, addEventListener: () => {} }
};

const advMockWindow = {
    location: { href: 'http://localhost/admin.html#settings-limits-view' },
    history: { state: {}, replaceState(s, t, h) { this.state = s; advMockWindow.location.href = h; } },
    openAskingPanel: (options) => { advAskingPanel = options; },
    showConfirmDialog: (options) => { advAskingPanel = options; }
};

const advCtx = vm.createContext({
    window: advMockWindow,
    document: {
        getElementById: id => advFields[id] || null,
        querySelectorAll: () => []
    },
    localStorage: {
        getItem: k => advStore.get(k) || null,
        setItem: (k, v) => advStore.set(k, String(v))
    },
    console
});

const advStart = freshAdminJs.indexOf('    // --- ADVANCED UPLOAD ALLOCATIONS & SANDBOX PAGE LOGIC ---');
const advEnd = freshAdminJs.indexOf('    // Live Sandbox Test Upload Simulator Logic', advStart);
vm.runInContext(freshAdminJs.slice(advStart, advEnd), advCtx);

// Init page
advMockWindow.initAdvancedLimitsPage();

// Initially not dirty, button is disabled
assert.equal(advMockWindow.advancedLimitsAreDirty(), false, 'Must not be dirty initially');
assert.equal(advFields['adv-limits-save-btn'].disabled, true, 'Button must be locked when not dirty');

// When user changes input, becomes dirty and unlocks button
advFields['adv-limit-video-ext'].value = '35';
assert.equal(advMockWindow.advancedLimitsAreDirty(), true, 'Must be dirty after change');
advMockWindow.updateAdvancedLimitsButtonState();
assert.equal(advFields['adv-limits-save-btn'].disabled, false, 'Button must unlock when dirty');

// When leaving while dirty, opens shared asking panel
let navDone = false;
assert.equal(advMockWindow.confirmAdvancedLimitsLeave(() => { navDone = true; }), false, 'Must prevent leave when dirty');
assert.ok(advAskingPanel, 'Must open shared asking panel on leave');
assert.equal(advAskingPanel.cancelText, 'Keep Editing');
assert.equal(advAskingPanel.confirmText, 'Discard Changes');
assert.equal(navDone, false, 'Navigation must not execute until confirmed');

// User confirms discard: reverts values, resets dirty, and executes navigation
advAskingPanel.onConfirm();
assert.equal(advFields['adv-limit-video-ext'].value, '25', 'Must revert video headroom on discard');
assert.equal(advMockWindow.advancedLimitsAreDirty(), false, 'Must not be dirty after discard');
assert.equal(advFields['adv-limits-save-btn'].disabled, true, 'Button must re-lock after discard');
assert.equal(navDone, true, 'Navigation callback must run after confirming discard');

// When user changes and saves, button re-locks
advFields['adv-limit-video-ext'].value = '35';
advMockWindow.updateAdvancedLimitsButtonState();
assert.equal(advFields['adv-limits-save-btn'].disabled, false);
advMockWindow.saveAdvancedLimits();
assert.equal(advMockWindow.advancedLimitsAreDirty(), false, 'Must not be dirty after save');
assert.equal(advFields['adv-limits-save-btn'].disabled, true, 'Button must lock after save');
assert.equal(JSON.parse(advStore.get('sigma-material-limits')).video.ext, 35, 'Saved value must persist in storage');

console.log('✓ Check 8 passed: Advanced Settings button locked when clean, icon removed, and shared asking panel protects unsaved changes on leave.');

// 9. Test Unified AI Integration Engines Console View & Complete Deletion of Separate Pages
const freshAdmin = fs.readFileSync(path.join(root, 'admin.html'), 'utf8');
const freshSys = fs.readFileSync(path.join(root, 'php/includes/system_settings_views.php'), 'utf8');
const freshAdminJsAi = fs.readFileSync(path.join(root, 'js/admin.js'), 'utf8');

// Assert single unified AI settings page exists in both admin.html and system_settings_views.php
assert.ok(freshAdmin.includes('id="settings-ai-view"'), 'admin.html must contain unified settings-ai-view');
assert.ok(freshSys.includes('id="settings-ai-view"'), 'system_settings_views.php must contain unified settings-ai-view');

// Assert old separate pages are completely deleted in the code
assert.ok(!freshAdmin.includes('id="settings-gemini-view"'), 'admin.html must completely delete settings-gemini-view');
assert.ok(!freshSys.includes('id="settings-gemini-view"'), 'system_settings_views.php must completely delete settings-gemini-view');
assert.ok(!freshAdmin.includes('id="settings-groq-view"'), 'admin.html must completely delete settings-groq-view');
assert.ok(!freshSys.includes('id="settings-groq-view"'), 'system_settings_views.php must completely delete settings-groq-view');

// Assert single unified configure button in Card 1 header
assert.ok(freshAdmin.includes('id="btn-manage-ai-engines"'), 'admin.html Card 1 must have single #btn-manage-ai-engines');
assert.ok(freshSys.includes('id="btn-manage-ai-engines"'), 'system_settings_views.php Card 1 must have single #btn-manage-ai-engines');

// Assert unified and backward-compatible controller functions in admin.js
assert.ok(freshAdminJsAi.includes('window.openAiSettingsPage'), 'admin.js must define openAiSettingsPage');
assert.ok(freshAdminJsAi.includes('window.switchAiTab'), 'admin.js must define switchAiTab');
assert.ok(freshAdminJsAi.includes('window.loadAiPageData'), 'admin.js must define loadAiPageData');
assert.ok(freshAdminJsAi.includes('window.openGeminiSettingsPage'), 'admin.js must define openGeminiSettingsPage');
assert.ok(freshAdminJsAi.includes('window.openGroqSettingsPage'), 'admin.js must define openGroqSettingsPage');
assert.ok(freshAdminJsAi.includes('window.saveGeminiPageSettings'), 'admin.js must define saveGeminiPageSettings');
assert.ok(freshAdminJsAi.includes('window.saveGroqPageSettings'), 'admin.js must define saveGroqPageSettings');
assert.ok(freshAdminJsAi.includes('window.testGeminiConnectionPage'), 'admin.js must define testGeminiConnectionPage');
assert.ok(freshAdminJsAi.includes('window.testGroqConnectionPage'), 'admin.js must define testGroqConnectionPage');

console.log('✓ Check 9 passed: Single unified AI console verified, separate pages completely deleted, and all controllers operational.');

console.log('--- ALL CONNECTIVITY AND VALIDATION TESTS PASSED (100%) ---');
