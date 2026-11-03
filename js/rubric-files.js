// Shared rubric persistence. Release records must only contain retrievable URLs.
(function () {
    'use strict';
    const uploads = new WeakMap();
    function durable(url) {
        return typeof url === 'string' && (/^uploads\/(documents|materials)\/[A-Za-z0-9_.-]+$/.test(url) || /^https:\/\//i.test(url));
    }
    async function upload(file) {
        if (!file || !file.size || file.size > 5 * 1048576 || !/\.(pdf|docx|txt|csv)$/i.test(file.name || '')) {
            throw new Error('Upload a PDF, DOCX, TXT, or CSV rubric up to 5 MB.');
        }
        if (uploads.has(file)) return uploads.get(file);
        const pending = (async () => {
            const form = new FormData();
            form.append('file', file, file.name);
            form.append('category', 'rubrics');
            if (!window.SigmaDatabase?.fetch) throw new Error('The upload service is unavailable. Please refresh and try again.');
            const endpoint = new URL('upload.php', window.SigmaDatabase.url('material_limits')).href;
            const response = await window.SigmaDatabase.fetch(endpoint, {
                method: 'POST', body: form, foreground: true, timeoutMs: 240000, autoReconnect: false
            });
            let data;
            try { data = await response.json(); } catch (_) { throw new Error('The rubric upload did not complete. Please try again.'); }
            if (!response.ok || !data.success || !durable(data.url)) throw new Error(data.error || 'The rubric could not be saved to server storage.');
            return data.url;
        })();
        uploads.set(file, pending);
        try { return await pending; } catch (error) { uploads.delete(file); throw error; }
    }
    function assertConfig(config, subjectId) {
        const urls = config.assessmentRubricUrls ||= {};
        for (const [id, name] of Object.entries(config.assessmentRubrics || {})) {
            if (!name) continue;
            // A filename match is restricted to the selected subject's catalog.
            const url = urls[id] || window.resolveSubjectRubricFile?.(subjectId, name)?.url || '';
            if (!durable(url)) throw new Error(`The rubric "${name}" has no saved file. Upload it again before saving.`);
            urls[id] = url;
        }
    }
    window.SigmaRubricFiles = { upload, durable, assertConfig };
})();
