const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

for (const file of ['admin.html', 'php/includes/system_settings_views.php']) {
    const source = read(file).split('<section id="settings-ai-view"')[1].split('</section>')[0];
    assert.ok(source.includes('<h1 class="sr-only">AI Credentials &amp; Engine Vault</h1>'), `${file} must contain sr-only title without visible in-content header`);
    assert.ok(!source.includes('backToIntegrationsSettings()'), `${file} must not contain in-page Back to Integrations button`);
    assert.ok(!source.includes('id="ai-active-engine-badge"'), `${file} must not retain the obsolete active-engine banner`);
    assert.ok(source.includes('id="ai-functions-panel"'), `${file} must contain function assignments`);
    assert.ok(source.includes('id="ai-provider-panel"'), `${file} must contain provider defaults`);
    assert.ok(source.includes('id="ai-add-key-card"'), `${file} must contain collapsible add key card`);
    assert.ok(source.includes('id="ai-keys-list-container"'), `${file} must contain keys list container`);
    assert.ok(source.includes('id="ai-form-provider-badge"'), `${file} must contain detected provider badge`);
    for (const id of ['ai-form-provider-select', 'ai-form-label-input', 'ai-form-set-active-check']) {
        assert.ok(!source.includes('id="' + id + '"'), `${file} must not retain removed field ${id}`);
    }
    assert.ok(source.includes('id="ai-form-model-select"'), `${file} must contain model selector`);
    assert.ok(source.includes('id="ai-form-key-input"'), `${file} must contain key input`);
}

console.log('AI settings layout: single assignments panel, provider panel, key editor, and key list verified.');
