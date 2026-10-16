(function () {
    'use strict';
    const key = 'sigma-ai-recorded-logs';
    const sampleKey = 'sigma-ai-preview-logs';
    const features = ['sigmabot', 'analytics', 'quiz', 'submission_evaluation', 'submission_feedback', 'grade_insights'];
    function normalizeEvidenceSources(sources) {
        return Array.isArray(sources) ? sources.filter(item => item?.id && item.label && Array.isArray(item.records))
            .map(item => ({ id: String(item.id), label: String(item.label), records: item.records.filter(record => record?.id)
                .map(record => ({ id: String(record.id), title: String(record.title || ''),
                    subjectId: String(record.subjectId || ''), sectionId: String(record.sectionId || '') })) })) : [];
    }
    function insightEvidenceSources(card, snapshot, userId, kind) {
        if (String(snapshot?.[kind === 'teacher' ? 'teacherId' : 'studentId'] || '') !== String(userId)) return [];
        const selected = new Set(card.evidenceIds || []);
        const records = snapshot.areas?.find(area => area.id === card.area)?.records || [];
        const grouped = new Map();
        for (const record of records.filter(item => selected.has(item.id))) {
            for (const source of record.sources || []) {
                if (!source?.id || !source.label) continue;
                if (!grouped.has(source.id)) grouped.set(source.id, { id: source.id, label: source.label, records: [] });
                const group = grouped.get(source.id);
                if (!group.records.some(item => item.id === record.id)) group.records.push(record);
            }
        }
        return normalizeEvidenceSources([...grouped.values()]);
    }
    function normalize(log) {
        const timestamp = new Date(log?.timestamp);
        if (!log || !log.userId || !features.includes(log.feature) || Number.isNaN(timestamp.getTime())) throw new TypeError('Invalid recorded AI log');
        return { id: String(log.id || crypto.randomUUID?.() || Array.from(crypto.getRandomValues(new Uint32Array(4))).join('-')),
            userId: String(log.userId), feature: log.feature, timestamp: timestamp.toISOString(),
            prompt: String(log.prompt || ''), response: String(log.response || ''), actionDescription: String(log.actionDescription || ''),
            model: String(log.model || 'Not recorded'), status: ['Success', 'Failed', 'Fallback Used'].includes(log.status) ? log.status : 'Not recorded',
            ...(log.provider && ['gemini', 'groq'].includes(log.provider) ? { provider: log.provider } : {}),
            ...(log.keyId ? { keyId: String(log.keyId), keyLabel: String(log.keyLabel || 'API Key') } : {}),
            evidenceSources: normalizeEvidenceSources(log.evidenceSources),
            isDeleted: Boolean(log.isDeleted), deletedAt: log.deletedAt || null, deletedBy: log.deletedBy || null,
            cardRecordId: log.cardRecordId || null, cardRemoved: Boolean(log.cardRemoved), cardRemovedAt: log.cardRemovedAt || null, cardRemovedBy: log.cardRemovedBy || null,
            source: log.source && ['student', 'teacher'].includes(log.source.kind) && log.source.cardId && log.source.signature
                ? { kind: log.source.kind, cardId: String(log.source.cardId), signature: String(log.source.signature) } : null,
            messages: Array.isArray(log.messages) ? log.messages.filter(item => item && ['user', 'assistant'].includes(item.role)).map(item => ({ role: item.role, text: String(item.text || ''), timestamp: String(item.timestamp || ''), model: String(item.model || '') })) : [] };
    }
    function read(storageKey = key) {
        try {
            const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
            return Array.isArray(saved) ? saved.flatMap(log => { try { return [normalize(log)]; } catch { return []; } }) : [];
        } catch { return []; }
    }
    function save(logs) {
        localStorage.setItem(key, JSON.stringify(logs));
        window.dispatchEvent(new Event('sigma:ai-logs-updated'));
    }
    // Call only after an actual provider request completes; chat placeholders are not logs.
    window.SigmaAiLogs = {
        getRecords: () => window.SigmaAiDatabase ? window.SigmaAiDatabase.getLogs().map(normalize) : read(),
        getDisplayRecords: () => window.SigmaAiDatabase ? window.SigmaAiDatabase.getLogs().map(normalize) : read(),
        setSampleRecords(records) {
            if (!Array.isArray(records)) throw new TypeError('Sample logs must be an array');
            localStorage.setItem(sampleKey, JSON.stringify(records.map(normalize)));
            window.dispatchEvent(new Event('sigma:ai-logs-updated'));
        },
        setRecords(records) {
            if (!Array.isArray(records)) throw new TypeError('AI log records must be an array');
            save(records.map(normalize));
        },
        record(log) {
            const entry = normalize(log);
            save([entry, ...read().filter(item => item.id !== entry.id)]);
            window.SigmaAiDatabase?.record(entry).catch(error => {
                window.dispatchEvent(new CustomEvent('sigma:ai-database-error', { detail: 'AI log was not saved: ' + error.message }));
            });
            return entry.id;
        },
        recordInsight({ userId, kind, card, snapshot, timestamp, model, provider, keyId, keyLabel, status = 'Success' }) {
            return this.record({ userId, feature: 'analytics', timestamp, model, provider, keyId, keyLabel, status,
                prompt: card.title, actionDescription: card.title,
                evidenceSources: insightEvidenceSources(card, snapshot, userId, kind),
                response: card.analyses.map(item => [item.context, item.actionLabel + ': ' + item.text].filter(Boolean).join('\n\n')).join('\n\n'),
                source: { kind, cardId: card.id, signature: JSON.stringify(card) } });
        },
        deleteInsight(logId) {
            const record = this.getDisplayRecords().find(log => log.id === logId);
            if (record?.feature !== 'analytics' || !record.source) throw new Error('This log is not linked to a user insight card.');
            if (window.SigmaAiDatabase) {
                if (!record.cardRecordId || record.cardRemoved) throw new Error('The linked card has already been removed.');
                return window.SigmaAiDatabase.change('ai_insight_cards', record.cardRecordId, 'remove');
            }
            const storageKey = 'sigma-' + record.source.kind + '-analytics-v1:' + record.userId;
            const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
            const card = saved?.cards?.find(item => item.id === record.source.cardId);
            if (!card) throw new Error('The user insight card has already been removed.');
            if (JSON.stringify(card) !== record.source.signature) throw new Error('A newer insight now uses this card. It cannot be deleted from this older log.');
            localStorage.setItem(storageKey, JSON.stringify({ ...saved, cards: saved.cards.filter(item => item.id !== record.source.cardId) }));
            window.dispatchEvent(new Event('sigma:refresh-analytics-cards'));
            window.dispatchEvent(new Event('sigma:ai-logs-updated'));
        },
        async deleteLog(logId) {
            let errorOccurred = null;
            if (window.SigmaAiDatabase) {
                try {
                    await window.SigmaAiDatabase.change('ai_logs', logId, 'remove');
                } catch (e) {
                    errorOccurred = e;
                    console.warn('[AI Logs] Database sync remove warning:', e);
                }
            }
            const removeLocal = storageKey => {
                try {
                    const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
                    if (Array.isArray(saved)) {
                        const filtered = saved.filter(item => String(item?.id) !== String(logId));
                        localStorage.setItem(storageKey, JSON.stringify(filtered));
                    }
                } catch (_) {}
            };
            removeLocal(key);
            removeLocal(sampleKey);
            window.dispatchEvent(new Event('sigma:ai-logs-updated'));
            if (errorOccurred && !window.SigmaAiDatabase?.getLogs) {
                throw errorOccurred;
            }
        }
    };
    window.addEventListener('storage', event => { if (!event.key || event.key === key || event.key === sampleKey) window.dispatchEvent(new Event('sigma:ai-logs-updated')); });
    window.addEventListener('storage', event => {
        if (event.key?.startsWith('sigma-student-analytics-v1:') || event.key?.startsWith('sigma-teacher-analytics-v1:')) window.dispatchEvent(new Event('sigma:refresh-analytics-cards'));
    });
})();
