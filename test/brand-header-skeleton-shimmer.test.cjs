const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

console.log('--- Verifying Brand Header Skeleton Shimmer & Sweeping ---');

const cssPath = path.join(__dirname, '../css/page-skeleton.css');
const css = fs.readFileSync(cssPath, 'utf8');

// 1. Verify broken keyframe and animation were eliminated
assert.ok(!css.includes('sigma-header-sweep'), 'Broken sigma-header-sweep animation must be eliminated');
assert.ok(!css.includes('@keyframes sigma-header-sweep'), 'Broken @keyframes sigma-header-sweep must be removed');

// 2. Verify burger button skeleton styling and sweeping shimmer
assert.ok(css.includes('#sidebarToggleBtn'), 'CSS targets #sidebarToggleBtn');
assert.ok(css.includes('border-radius: 8px !important;'), 'CSS styles burger button as rounded-square (8px radius)');

// 3. Verify logo button skeleton styling
assert.ok(css.includes('#nav-logo-btn'), 'CSS targets #nav-logo-btn');
assert.ok(css.includes('border-radius: 50% !important;'), 'CSS styles logo as circular skeleton (50% radius)');

// 4. Verify nav header text skeleton styling
assert.ok(css.includes('#nav-context-text'), 'CSS targets #nav-context-text');
assert.ok(css.includes('.admin-topbar__brand-label'), 'CSS targets .admin-topbar__brand-label');
assert.ok(css.includes('#header-brand-title'), 'CSS targets #header-brand-title');

// 5. Verify all three brand items have the signature sweeping shimmer band
const brandAfterSelector = ':is(#sidebarToggleBtn, #nav-logo-btn, #nav-context-text, .admin-topbar__brand-label, #header-brand-title)::after';
assert.ok(css.includes(brandAfterSelector), 'All brand header elements share the pseudo-element shimmer band');
assert.ok(css.includes('animation: sigma-sweep-band 1.2s linear infinite !important;'), 'Brand items use the unified sigma-sweep-band 1.2s animation');

// 6. Verify transparent container preservation for #logo-container
assert.ok(css.includes('#logo-container'), 'CSS targets #logo-container');
assert.ok(css.includes('#logo-container::after'), 'CSS excludes extraneous ::after from #logo-container');

// 7. Verify mobile responsive clamp sizing
assert.ok(css.includes('@media (max-width: 767px)'), 'Mobile responsive overrides exist');
assert.ok(css.includes('clamp(34px, 9vw, 38px)'), 'Mobile burger button uses clamp sizing');
assert.ok(css.includes('clamp(28px, 7.5vw, 38px)'), 'Mobile logo uses clamp sizing');

console.log('PASS: All brand header skeleton shimmering and sweeping checks passed successfully!');
