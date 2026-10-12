const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../js/quiz-creator.js'), 'utf8');
const start = source.indexOf('window.executeAIQuestionGeneration = async function');
const end = source.indexOf('\n};', start) + 4;
const nodes = {
    'ai-gen-topic': { value: 'An integer stores whole numbers.' },
    'ai-gen-type': { value: 'Multiple Choice' }, 'ai-gen-count': { value: '1' },
    'ai-generate-submit-btn': { dataset: {}, disabled: false },
    'ai-gen-warning-text': { textContent: '' },
    'ai-gen-validation-warning': { classList: { remove() {} } }
};
const questions = [];
let request, closed = 0, saved;
let fail = false;
const window = { closeAIConfirmGenerateModal() {}, syncAIGenerateButtonState() {}, closeAIGeneratorModal() { closed++; },
    SigmaAiLogs: { record(log) { saved = log; } } };
const context = vm.createContext({ window, document: { getElementById: id => nodes[id] || null, querySelector: () => ({ value: 'Medium' }) },
    questions, activeQuestionIndex: 0, currentAIGenFile: null, MAX_QUIZ_QUESTIONS: 50,
    resolveCourseMaterialsApiUrl: () => 'http://localhost/sigma-elms/php/api/subjects.php',
    location: { href: 'http://127.0.0.1:5519/quiz-creator.html' }, URL, renderQuestions() {}, updateStats() {}, console,
    sessionStorage: { getItem: () => JSON.stringify({ id: 'teacher-1' }) },
    fetch: async (url, options) => {
        request = { url, body: JSON.parse(options.body) };
        return { ok: !fail, json: async () => fail ? { success: false, error: 'Quota reached' } : {
            success: true, questions: [{ type: 'Multiple Choice', question: 'What does an integer store?', choices: ['Whole numbers', 'Files', 'Images', 'Videos'], answer: 'Whole numbers', points: 0 }],
            provider: 'groq', model: 'actual-saved-model', status: 'Success' } };
    } });
vm.runInContext(source.slice(start, end), context);
(async () => {
    await window.executeAIQuestionGeneration();
    assert.equal(request.url, 'http://localhost/sigma-elms/php/api/quiz_ai.php');
    assert.equal(request.body.source, nodes['ai-gen-topic'].value);
    assert.equal(request.body.provider, undefined, 'Client must not override central routing');
    assert.equal(request.body.api_key, undefined, 'No API key in client request');
    assert.equal(questions.length, 1);
    assert.equal(saved.model, 'actual-saved-model');
    assert.equal(saved.feature, 'quiz');
    assert.equal(closed, 1);
    assert.equal(nodes['ai-generate-submit-btn'].dataset.generating, undefined);
    fail = true;
    await window.executeAIQuestionGeneration();
    assert.equal(questions.length, 1, 'Provider failure must not add sample questions');
    assert.equal(nodes['ai-gen-warning-text'].textContent, 'Quota reached');
    assert.equal(nodes['ai-generate-submit-btn'].disabled, false);
    assert(!fs.readFileSync(path.join(__dirname, '../quiz-creator.html'), 'utf8').includes('id="ai-gen-engine-wrapper"'));
    console.log('PASS: engine dropdown removed; real backend request; centrally selected model logged; failures preserve questions and unlock controls');
})().catch(error => { console.error(error); process.exitCode = 1; });
