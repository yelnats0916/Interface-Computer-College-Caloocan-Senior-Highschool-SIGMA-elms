const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const source = read('js/admin.js');
const routing = read('js/ai-routing-settings.js');

// 1. Vault methods and controllers in admin.js
assert.ok(routing.includes('window.renderAiRouting = function'), 'routing module must own the AI page renderer');
assert.ok(!source.includes('window.renderAiVault'), 'obsolete duplicate vault renderer must be removed');
assert.ok(!source.includes('window.switchAiTab'), 'obsolete provider-tab controller must be removed');
assert.ok(!source.includes('window.aiVaultState'), 'unused vault state must be removed');
assert.ok(source.includes('window.toggleAddAiKeyForm = function'), 'admin.js must define toggleAddAiKeyForm');
assert.ok(!source.includes('window.setActiveAiKey'), 'obsolete global-active-key controller must be removed');
assert.ok(source.includes('window.deleteAiVaultKey = async function'), 'admin.js must define deleteAiVaultKey');
assert.ok(source.includes('window.testAiVaultKey = async function'), 'admin.js must define testAiVaultKey');
assert.ok(source.includes('window.handleSaveAiKeySubmit = async function'), 'admin.js must define handleSaveAiKeySubmit');
assert.ok(source.includes('window.openAiSettingsPage = function'), 'admin.js must define openAiSettingsPage');
for (const name of ['loadGeminiPageData', 'loadGroqPageData', 'saveGeminiPageSettings', 'saveGroqPageSettings', 'testGeminiConnectionPage', 'testGroqConnectionPage']) {
    assert.ok(!source.includes('window.' + name), 'obsolete separate provider controller must be removed: ' + name);
}
const loader = source.split('window.loadAiPageData = async function')[1].split('window.persistAiRoutingSettings')[0];
assert.equal((loader.match(/renderAiRouting/g) || []).length, 1, 'API load must render the AI page once');

// 2. Both markup files contain unified vault section and exclude obsolete separate views
for (const file of ['admin.html', 'php/includes/system_settings_views.php']) {
    const markup = read(file);
    assert.ok(markup.includes('id="settings-ai-view"'), `${file} must contain settings-ai-view`);
    assert.ok(!markup.includes('id="settings-gemini-view"'), `${file} must not contain separate settings-gemini-view`);
    assert.ok(!markup.includes('id="settings-groq-view"'), `${file} must not contain separate settings-groq-view`);
    assert.ok(markup.includes('id="ai-keys-list-container"'), `${file} must contain ai-keys-list-container`);
    for (const id of ['settings-ai-view', 'ai-keys-list-container', 'ai-add-key-card', 'ai-key-add-form', 'ai-routing-rows']) {
        assert.equal((markup.match(new RegExp('id="' + id + '"', 'g')) || []).length, 1, `${file} must contain only one ${id}`);
    }
}

console.log('AI Key Vault & Multiple API Manager architecture controllers and view integration passed.');
