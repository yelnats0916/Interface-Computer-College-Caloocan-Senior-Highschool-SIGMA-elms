const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const roleFiles = ['admin.html', 'teacher.html'].map(file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8'));
for (const asset of ['js/excel-export.js', 'css/excel-export.css', 'js/sigma-analytics.js']) {
    const versions = roleFiles.map(html => html.match(new RegExp(asset.replace(/\./g, '\\.') + '\\?v=([^"\\s]+)'))?.[1]);
    assert.ok(versions[0], asset + ' must load in Admin');
    assert.equal(versions[0], versions[1], asset + ' must be identical across roles');
}
(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage();
        await page.setContent('<html><body></body></html>');
        await page.addScriptTag({ url: 'https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js' });
        const analytics = fs.readFileSync(path.join(__dirname, '../js/sigma-analytics.js'), 'utf8');
        const start = analytics.indexOf('    const DEPED_TRANSMUTATION_TABLE');
        const end = analytics.indexOf('    window.SigmaGradeEngine = SigmaGradeEngine;', start);
        await page.addScriptTag({ content: analytics.slice(start, end) + '\nwindow.SigmaGradeEngine=SigmaGradeEngine;' });
        await page.addScriptTag({ path: path.join(__dirname, '../js/excel-export.js') });
        await page.addScriptTag({ url: 'https://cdn.jsdelivr.net/npm/hyperformula@3.1.0/dist/hyperformula.full.min.js' });
        const result = await page.evaluate(() => {
            const data = {
                school: 'Interface Computer College', schoolYear: '2026-2027', quarter: 1,
                subjectCode: 'CP1', subject: 'Computer Programming 1', section: 'Rizal', teacher: 'Maria Ramos',
                weights: { ww: 30, pt: 50, qa: 20 },
                groups: [
                    { name: 'Written Works', items: [{ title: 'Task 1', max: 100 }, { title: 'Task 2', max: 100 }, { title: 'Quiz 1', max: 55 }] },
                    { name: 'Performance Tasks', items: [] }, { name: 'Quarterly Assessment', items: [] }
                ],
                rows: [
                    { id: '002222222', name: 'Dela Cruz, Juan Abad', scores: [[{ value: 90, status: 'Excuse' }, { value: null, status: 'Incomplete' }, { value: 50, status: '' }], [], []], percentages: [140 / 155 * 100, null, null], initial: 140 / 155 * 30, quarterly: 66 },
                    { id: '0026010314', name: 'Kalipungan, Herald Jamero', scores: [[{ value: 0, status: 'Missing' }, { value: '', status: '' }, { value: null, status: '' }], [], []], percentages: [0, null, null], initial: 0, quarterly: 60 },
                    { id: '03', name: 'Blank Student', scores: [[{ value: null }, { value: null }, { value: null }], [], []], percentages: [null, null, null], initial: null, quarterly: null }
                ]
            };
            const wb = window.buildGradebookExcel(data, 'full', XLSX);
            const sheet = wb.Sheets['Class Record'];
            for (const key of ['A3', 'E3', 'A4', 'A5', 'E5', 'A6']) {
                if (!sheet[key].s.font.bold) throw Error('Metadata labels must be bold');
            }
            for (const key of ['C3', 'F3', 'C4', 'C5', 'F5', 'C6', 'E11']) {
                if (sheet[key].s.font.bold) throw Error('Metadata values and assessment scores must remain regular');
            }
            if (sheet.A2.s.fill.fgColor.rgb !== '15803D' || sheet.A2.s.alignment.horizontal !== 'center'
                || sheet.A2.s.font.color.rgb !== 'FFFFFF') throw Error('Class Record banner must match the school banner');
            for (const key of ['A9', 'E9', 'D10', 'J9', 'M9', 'P9']) {
                if (sheet[key].s.fill) throw Error('Table headers must have no background fill');
                if (sheet[key].s.font.color.rgb !== '000000') throw Error('Table headers must use black text');
            }
            for (const key of ['E8', 'J8', 'K8', 'M8', 'N8', 'P8', 'Q9', 'R9']) {
                if (sheet[key].s.fill.fgColor.rgb !== '15803D') throw Error('Grade headers must be green');
            }
            if (sheet.E11.s.numFmt !== 'General' || sheet.H11.s.numFmt !== 'General') throw Error('Scores and HPS must not force decimals');
            for (const key of ['E11', 'G11', 'H11', 'E12']) {
                if (XLSX.SSF.format(sheet[key].s.numFmt, sheet[key].v).endsWith('.')) throw Error('Integer values must not display a trailing dot');
            }
            if (sheet.Q11.s.numFmt !== '0.00"%"' || sheet.J11.s.numFmt !== '0.00"%"') throw Error('Initial and weighted grades must display percentage');
            if (sheet.R11.s.numFmt !== '0') throw Error('Quarterly Grade must remain an integer');
            const legendRow = 12 + data.rows.length;
            if (sheet[`D${legendRow}`]?.v !== 'Score Colors') throw Error('Score Colors must precede adjacent swatches');
            ['Missing', 'Absent', 'Incomplete', 'Excuse'].forEach((label, index) => {
                if (sheet[XLSX.utils.encode_cell({ r: legendRow - 1, c: 4 + index })]?.v !== label) throw Error('Legend swatches must be adjacent');
            });
            if (sheet[`J${legendRow}`]?.v !== 'Blank scores are excluded from scored HPS.') throw Error('Note must share the legend row');
            const encoded = XLSX.write(wb, { type: 'base64', bookType: 'xlsx', cellStyles: true });
            const loaded = XLSX.read(encoded, { type: 'base64', cellStyles: true });
            const formulas = Object.values(sheet).filter(c => c?.f).map(c => c.f);
            const summary = window.buildGradebookExcel(data, 'summary', XLSX);
            if (Object.values(summary.Sheets).some(target => Object.values(target).some(cell => cell?.v === 'Score Colors'))) throw Error('Grade Summary must not contain a score legend');
            const assessments = window.buildGradebookExcel(data, 'assessments', XLSX);
            for (const [mode, visible] of Object.entries({ qa: [2], 'ww-pt': [0, 1], ww: [0], pt: [1] })) {
                const partial = window.buildGradebookExcel(data, mode, XLSX).Sheets['Class Record'];
                for (const label of ['Missing', 'Absent', 'Incomplete', 'Excuse']) {
                    const visible = partial['!cols'].some((column, c) => !column.hidden
                        && partial[XLSX.utils.encode_cell({ r: 11 + data.rows.length, c })]?.v === label);
                    if (!visible) throw Error(`${mode}: score color legend must be visible`);
                }
                for (const [row, expected] of [[2, 'Quarter:'], [4, 'Subject:']]) {
                    const range = XLSX.utils.decode_range(partial['!ref']);
                    const found = Array.from({ length: range.e.c + 1 }, (_, c) => c).find(c =>
                        partial[XLSX.utils.encode_cell({ r: row, c })]?.v === expected && !partial['!cols'][c]?.hidden);
                    if (found === undefined || partial['!cols'][found + 1]?.hidden) throw Error(`${mode}: metadata must be visible`);
                }
                for (const [index, start] of [4, 10, 13].entries()) {
                    if (Boolean(partial['!cols'][start].hidden) === visible.includes(index)) throw Error(`${mode}: incorrect component visibility`);
                }
                for (const c of [16, 17]) {
                    if (partial['!cols'][c].hidden) throw Error(`${mode}: final grade column is hidden`);
                }
                if (partial.Q11.f !== sheet.Q11.f || partial.R11.v !== sheet.R11.v) throw Error(`${mode}: final grade computation changed`);
            }
            const grid = target => {
                const range = XLSX.utils.decode_range(target['!ref']);
                return Array.from({ length: range.e.r + 1 }, (_, r) => Array.from({ length: range.e.c + 1 }, (_, c) => {
                    const cell = target[XLSX.utils.encode_cell({ r, c })];
                    return cell?.f ? '=' + cell.f : cell?.v ?? null;
                }));
            };
            const engine = HyperFormula.buildFromSheets({ Record: grid(sheet), Transmutation: grid(wb.Sheets.Transmutation) }, { licenseKey: 'gpl-v3' });
            const before = [engine.getCellValue({ sheet: 0, row: 10, col: 16 }), engine.getCellValue({ sheet: 0, row: 10, col: 17 })];
            engine.setCellContents({ sheet: 0, row: 10, col: 4 }, [[100]]);
            const after = [engine.getCellValue({ sheet: 0, row: 10, col: 16 }), engine.getCellValue({ sheet: 0, row: 10, col: 17 })];
            const zeroGrade = engine.getCellValue({ sheet: 0, row: 11, col: 17 });
            const blankGrade = engine.getCellValue({ sheet: 0, row: 12, col: 17 });
            const thresholdFormulaResults = window.SigmaGradeEngine.getTransmutationRows().map(t => {
                engine.setCellContents({ sheet: 0, row: 10, col: 16 }, [[t.min]]);
                return { expected: t.grade, actual: engine.getCellValue({ sheet: 0, row: 10, col: 17 }) };
            });
            engine.destroy();
            return {
                before, after, zeroGrade, blankGrade, thresholdFormulaResults,
                formulas, school: sheet.A1.v, title: sheet.A2.v, id: loaded.Sheets['Class Record'].C11.v,
                score: sheet.E12.v, statusColor: sheet.E11.s.fill.fgColor.rgb, quarterGrade: sheet.R11.v,
                total: sheet.H11, percent: sheet.I11, weighted: sheet.J11, initial: sheet.Q11,
                emptyInitial: sheet.Q13.v, summaryNames: summary.SheetNames,
                summaryFormula: summary.Sheets.Summary.D9.f,
                hiddenCalculation: summary.Workbook.Sheets.find(s => s.name === 'Calculation').Hidden,
                hiddenTotals: assessments.Sheets['Class Record']['!cols'][7].hidden,
                thresholds: window.SigmaGradeEngine.getTransmutationRows().map(t => ({ ...t, actual: window.SigmaGradeEngine.transmute(t.min) })),
                serializedFormula: loaded.Sheets['Class Record'].I11.f,
                filter: sheet['!autofilter'] || null,
                headers: Object.values(sheet).filter(c => c?.v === 'Status').length,
                font: sheet.E11.s.font.color.rgb,
                hps: sheet.D10.v, nameHeader: sheet.B9.v, numberAlignment: sheet.A11.s.alignment.horizontal
            };
        });
        assert.equal(result.school, 'Interface Computer College'); assert.equal(result.title, 'Class Record');
        assert.equal(result.id, '002222222'); assert.equal(result.score, 0); assert.ok(result.statusColor.endsWith('DBDFF0'));
        assert.equal(result.filter, null); assert.equal(result.headers, 0); assert.ok(result.font.endsWith('000000'));
        assert.equal(result.quarterGrade, 66); assert.equal(result.emptyInitial, '');
        assert.ok(Math.abs(result.before[0] - 140 / 155 * 30) < 1e-9); assert.equal(result.before[1], 66);
        assert.ok(Math.abs(result.after[0] - 150 / 155 * 30) < 1e-9); assert.equal(result.after[1], 67);
        assert.equal(result.zeroGrade, 60); assert.equal(result.blankGrade, '');
        result.thresholdFormulaResults.forEach(t => assert.equal(t.actual, t.expected));
        assert.equal(result.hps, 'HPS/Weights'); assert.equal(result.nameHeader, 'Name'); assert.equal(result.numberAlignment, 'center');
        assert.match(result.total.f, /IF\(ISNUMBER\(E11\),E\$10,0\)/);
        assert.match(result.serializedFormula, /SUM\(E11,F11,G11\)\/H11/);
        assert.ok(Math.abs(result.percent.v - 140 / 155 * 100) < 1e-10);
        assert.ok(Math.abs(result.initial.v - 140 / 155 * 30) < 1e-10);
        assert.equal(result.summaryNames[0], 'Summary'); assert.equal(result.hiddenCalculation, 1);
        assert.equal(result.hiddenTotals, true); assert.match(result.summaryFormula, /^Calculation!/);
        result.thresholds.forEach(t => assert.equal(t.actual, t.grade));
        assert.ok(result.formulas.every(f => !/#REF!|NaN|undefined/.test(f)));
        await page.addStyleTag({ path: path.join(__dirname, '../css/forms.css') });
        await page.addStyleTag({ path: path.join(__dirname, '../css/excel-export.css') });
        for (const width of [390, 1440]) {
            await page.setViewportSize({ width, height: 900 });
            await page.evaluate(() => window.openSharedExcelExportForm({ id: 'test-export', title: 'Export Class Record', options: [{ value: 'full', label: 'Full Grade Report' }, { value: 'summary', label: 'Summaries Only' }, { value: 'assessments', label: 'Assessments Only' }], onDownload() {} }));
            assert.equal(await page.locator('.shared-export-option').count(), 3);
            assert.ok(await page.locator('.shared-export-option').evaluateAll(nodes => nodes.every(n => n.getBoundingClientRect().right <= innerWidth)));
            await page.screenshot({ path: path.join(require('node:os').tmpdir(), `sigma-grade-export-${width}.png`) });
            await page.keyboard.press('Escape');
            assert.equal(await page.locator('#test-export').count(), 0);
        }
        console.log('PASS: real XLSX save/read retains formulas, zero scores, blank scores, text IDs, statuses, summary references and transmutation boundaries; export form fits mobile and desktop.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
