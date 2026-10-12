const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
for (const file of ['admin.html', 'php/includes/system_settings_views.php']) {
    const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8').split('<section id="settings-gdrive-view"')[1].split('</section>')[0];
    assert.ok(source.includes('<h1 class="sr-only">Google Drive Cloud Storage</h1>'), file);
    assert.ok(!source.includes('Manage Google Drive'), file);
    assert.ok(source.includes('class="gdrive-status-container grid'), file);
    for (const id of ['gdrive-page-connection-status', 'gdrive-page-folder-input', 'gdrive-page-open-folder-link', 'btn-page-test-gdrive', 'gdrive-page-key-file']) {
        assert.ok(source.includes('id="' + id + '"'), file);
    }
    const save = source.match(/<button[^>]*id="btn-save-gdrive-page-config"[^>]*>([\s\S]*?)<\/button>/);
    assert.equal(save[1].trim(), 'Save', file);
}
console.log('Google Drive shared status group, plain Save, and existing controls passed');
