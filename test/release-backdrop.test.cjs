const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
for (const file of ['css/shared-components.css', 'css/teacher.css']) {
    const overlay = read(file).match(/\.curriculum-hub-overlay\s*\{([^}]+)\}/)[1];
    const panel = read(file).match(/\.curriculum-hub-panel\s*\{([^}]+)\}/)[1];
    assert.match(overlay, /background:\s*rgba\(0, 0, 0, 0\.45\)/, file);
    assert.match(overlay, /backdrop-filter:\s*none/, file);
    assert.match(overlay, /-webkit-backdrop-filter:\s*none/, file);
    assert.match(panel, /background:\s*#ffffff/, file);
}
console.log('PASS: release panels have a neutral dim backdrop and opaque surface');
for (const file of ['js/teacher.js', 'js/curriculum-release.js']) {
    const source = read(file);
    assert.ok(source.includes("overlay.style.setProperty('background', 'rgba(0, 0, 0, 0.45)', 'important')"), file);
    assert.ok(source.includes('background: #ffffff !important; opacity: 1 !important;'), file);
}
