const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const cssPath = path.join(__dirname, '../css/sigma-analytics.css');
const css = fs.readFileSync(cssPath, 'utf8');

// Verify CSS definitions for modal header
assert.match(css, /\.sigma-insight-detail-header\s*\{[^}]*background:\s*var\(--icc-green,\s*#15803d\);/s);
assert.match(css, /\.sigma-insight-detail-header\s*\{[^}]*color:\s*#ffffff;/s);
assert.match(css, /\.sigma-insight-detail-header\s+h2\s*\{[^}]*color:\s*#ffffff\s*!important;/s);
assert.match(css, /\.sigma-insight-detail-icon\s*\{[^}]*color:\s*#FFD000;/s);
assert.match(css, /\.sigma-insight-detail-pin\s*\{/);
assert.match(css, /\.sigma-insight-detail-pin\.is-pinned\s*\{[^}]*background:\s*#ffffff\s*!important;/s);
assert.match(css, /\.sigma-insight-detail-pin\.is-pinned\s*\{[^}]*color:\s*var\(--icc-green,\s*#15803d\)\s*!important;/s);

assert.match(css, /\.sigma-insight-detail-back,\s*\.sigma-insight-detail-header\s+\.sigma-insight-detail-back,\s*\.sigma-insight-detail-header\s+button\.sigma-insight-detail-back\s*\{[^}]*display:\s*none\s*!important;/s);
assert.match(css, /\.sigma-insight-detail-close,\s*\.sigma-insight-detail-header\s+\.sigma-insight-detail-close,\s*\.sigma-insight-detail-header\s+button\.sigma-insight-detail-close\s*\{[^}]*display:\s*none\s*!important;/s);

// Verify student-insight-view.js implementation
const jsPath = path.join(__dirname, '../js/student-insight-view.js');
const js = fs.readFileSync(jsPath, 'utf8');

assert.match(js, /class="sigma-insight-detail-pin"/);
assert.match(js, /class="sigma-insight-detail-icon"/);
assert.match(js, /function syncPinState\(\)/);
assert.match(js, /cardPinBtn\.click\(\)/);
assert.match(js, /pinBtn\.classList\.toggle\('is-pinned'/);

console.log('✓ Modal header green styling, category icon, pin button synchronization, desktop chevron removal, and mobile exit button removal tests passed!');
