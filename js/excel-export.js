(function () {
    'use strict';
    const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    window.styleAttendanceExcelHeading = function (ws, XLSX, subject, section, period) {
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let r = range.e.r; r >= 3; r--) {
            for (let c = 0; c <= range.e.c; c++) {
                const from = XLSX.utils.encode_cell({ r, c });
                const to = XLSX.utils.encode_cell({ r: r + 2, c });
                if (ws[from]) ws[to] = ws[from]; else delete ws[to];
                delete ws[from];
            }
        }
        for (let r = 0; r < 5; r++) for (let c = 0; c <= range.e.c; c++) delete ws[XLSX.utils.encode_cell({ r, c })];
        const merges = [];
        for (const [r, title] of [[0, 'Interface Computer College'], [1, 'Attendance Sheet']]) {
            for (let c = 0; c <= range.e.c; c++) ws[XLSX.utils.encode_cell({ r, c })] = {
                t: 's', v: c === 0 ? title : '', s: { font: { name: 'Calibri', sz: r === 0 ? 16 : 14, bold: true, color: { rgb: 'FFFFFF' } },
                    fill: { fgColor: { rgb: '15803D' } }, alignment: { horizontal: 'center', vertical: 'center' } }
            };
            merges.push({ s: { r, c: 0 }, e: { r, c: range.e.c } });
        }
        const sy = window.getActiveSchoolYearRecord?.() || {};
        const year = sy.yearStart && sy.yearEnd ? `${sy.yearStart}-${sy.yearEnd}` : sy.name || sy.schoolYear || '2026-2027';
        for (const [r, label, value] of [[2, 'Period:', period], [3, 'School Year:', year], [4, 'Section:', section]]) {
            ws[XLSX.utils.encode_cell({ r, c: 0 })] = { t: 's', v: label, s: { font: { name: 'Calibri', sz: 11, bold: true }, alignment: { vertical: 'center' } } };
            merges.push({ s: { r, c: 0 }, e: { r, c: 1 } });
            ws[XLSX.utils.encode_cell({ r, c: 2 })] = { t: 's', v: value || '', s: { font: { name: 'Calibri', sz: 11, bold: false }, alignment: { vertical: 'center' } } };
            merges.push({ s: { r, c: 2 }, e: { r, c: r === 4 ? 3 : range.e.c } });
        }
        ws.E5 = { t: 's', v: 'Subject:', s: { font: { name: 'Calibri', sz: 11, bold: true }, alignment: { horizontal: 'left', vertical: 'center' } } };
        merges.push({ s: { r: 4, c: 4 }, e: { r: 4, c: 5 } });
        ws.G5 = { t: 's', v: subject || '', s: { font: { name: 'Calibri', sz: 11, bold: false }, alignment: { horizontal: 'left', vertical: 'center' } } };
        merges.push({ s: { r: 4, c: 6 }, e: { r: 4, c: range.e.c } });
        ws['!merges'] = merges;
        ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: range.e.r + 2, c: range.e.c } });
        ws['!rows'] = Array.from({ length: range.e.r + 3 }, (_, r) => ({ hpt: r < 2 ? 28 : 24 }));
        return ws;
    };
    window.openSharedExcelExportForm = function ({ id, title, options, onDownload, context = '' }) {
        document.getElementById(id)?.remove();
        const modal = document.createElement('div');
        modal.id = id;
        modal.className = 'sigma-modal-overlay';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-label', title);
        modal.innerHTML = `<button type="button" class="shared-export-exit" aria-label="Close export"><i class="fa-solid fa-xmark"></i></button>
            <div class="sigma-modal-shell"><div class="sigma-modal-panel">
            <div class="sigma-modal-header"><div class="sigma-modal-header-top"><h1 class="sigma-modal-title">${escape(title)}</h1></div></div>
            <div class="sigma-modal-body">${context ? `<p class="shared-export-intro">${escape(context)}</p>` : ''}<fieldset class="shared-export-options"><legend class="sr-only">Export content</legend>
            ${options.map((o, i) => `<label class="shared-export-option"><input type="radio" name="${id}-scope" value="${escape(o.value)}" ${i === 0 ? 'checked' : ''}><span class="shared-export-copy"><span class="shared-export-title">${escape(o.label)}</span>${o.subtitle ? `<span class="shared-export-subtitle">${escape(o.subtitle)}</span>` : ''}</span></label>`).join('')}
            </fieldset><p class="shared-export-error" role="alert"></p></div>
            <div class="sigma-modal-footer"><button type="button" class="sigma-btn sigma-btn-primary sigma-btn-md" data-download>Download Excel</button></div>
            </div></div>`;
        const previousFocus = document.activeElement;
        const close = () => {
            modal.remove();
            document.documentElement.classList.remove('has-modal-open');
            document.removeEventListener('keydown', keys);
            previousFocus?.focus();
        };
        const keys = event => {
            if (event.key === 'Escape') close();
            if (event.key === 'Tab') {
                const controls = Array.from(modal.querySelectorAll('button,input')).filter(n => !n.disabled);
                const first = controls[0], last = controls[controls.length - 1];
                if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
                else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
            }
        };
        modal.querySelector('.shared-export-exit').onclick = close;
        modal.querySelector('[data-download]').onclick = async function () {
            this.disabled = true;
            try { await onDownload(modal.querySelector('input:checked').value); close(); }
            catch (error) { modal.querySelector('[role="alert"]').textContent = error.message || 'Export failed. Please retry.'; }
            finally { this.disabled = false; }
        };
        document.body.appendChild(modal);
        document.documentElement.classList.add('has-modal-open');
        document.addEventListener('keydown', keys);
        modal.querySelector('input').focus();
        modal._closeExport = close;
        return close;
    };

    // Pure builder: formulas and cached values come from the same scoped data.
    window.buildGradebookExcel = function (data, mode, XLSX) {
        if (!['full', 'summary', 'assessments', 'qa', 'ww-pt', 'ww', 'pt'].includes(mode)) throw Error('Invalid export selection.');
        const wb = XLSX.utils.book_new();
        const transmutation = window.SigmaGradeEngine.getTransmutationRows().slice().reverse();
        const lookup = XLSX.utils.aoa_to_sheet([['Minimum Initial Grade', 'Quarterly Grade'], ...transmutation.map(t => [t.min, t.grade])]);
        const sheet = {};
        const merges = [];
        const columns = [{ wch: 6 }, { wch: 36 }, { wch: 18 }, { wch: 16 }];
        const groups = [];
        let col = 4;
        data.groups.forEach((group, index) => {
            const start = col;
            const scores = [];
            group.items.forEach(item => {
                scores.push(col);
                columns[col++] = { wch: Math.min(32, Math.max(16, String(item.title).length / 2)) };
            });
            const total = col++, ps = col++, ws = col++;
            columns[total] = { wch: 12 }; columns[ps] = { wch: 14 }; columns[ws] = { wch: 14 };
            groups.push({ ...group, start, scores, total, ps, ws, weight: [data.weights.ww, data.weights.pt, data.weights.qa][index] });
        });
        const initial = col++, quarterly = col++;
        columns[initial] = { wch: 16 }; columns[quarterly] = { wch: 18 };
        const address = (r, c) => XLSX.utils.encode_cell({ r, c });
        const put = (r, c, value, formula, style) => {
            const cell = { t: typeof value === 'number' ? 'n' : 's', v: value ?? '' };
            if (formula) cell.f = formula;
            cell.s = typeof value === 'number'
                ? { ...(style || {}), alignment: { ...(style?.alignment || {}), horizontal: 'center', vertical: 'center' } }
                : style || {};
            sheet[address(r, c)] = cell;
        };
        const header = { font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: '000000' } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true } };
        const greenHeader = { ...header, fill: { fgColor: { rgb: '15803D' } }, font: { ...header.font, color: { rgb: 'FFFFFF' } } };
        const input = { font: { name: 'Calibri', sz: 11, color: { rgb: '000000' } }, alignment: { vertical: 'center', wrapText: true } };
        const calc = { font: { name: 'Calibri', sz: 11, color: { rgb: '111111' } }, fill: { fgColor: { rgb: 'EAF7EF' } }, alignment: { horizontal: 'center', vertical: 'center' }, numFmt: 'General' };
        const percentage = { ...calc, numFmt: '0.00"%"' };
        const banner = (r, text, green = false) => {
            const style = green ? { ...header, fill: { fgColor: { rgb: '15803D' } }, font: { ...header.font, sz: 16, color: { rgb: 'FFFFFF' } } } : { font: { name: 'Calibri', sz: r === 1 ? 14 : 11, bold: r === 1 }, alignment: { vertical: 'center' } };
            for (let c = 0; c < col; c++) put(r, c, c === 0 ? text : '', null, style);
            merges.push({ s: { r, c: 0 }, e: { r, c: col - 1 } });
        };
        banner(0, data.school, true); banner(1, 'Class Record', true);
        const metadata = (r, label, value, secondLabel = '', secondValue = '') => {
            const labelStyle = { ...input, font: { ...input.font, bold: true } };
            put(r, 0, label, null, labelStyle);
            merges.push({ s: { r, c: 0 }, e: { r, c: 1 } });
            put(r, 2, value, null, input);
            merges.push({ s: { r, c: 2 }, e: { r, c: secondLabel ? 3 : 7 } });
            if (secondLabel) {
                put(r, 4, secondLabel, null, labelStyle);
                put(r, 5, secondValue, null, input);
                merges.push({ s: { r, c: 5 }, e: { r, c: 7 } });
            }
        };
        metadata(2, 'School Year:', data.schoolYear || 'Not specified', 'Quarter:', String(data.quarter));
        metadata(3, 'Subject Code:', data.subjectCode || 'Not specified');
        metadata(4, 'Section:', data.section, 'Subject:', data.subject);
        metadata(5, 'Teacher:', data.teacher || 'Not specified');
        // Row 7 is deliberately blank between metadata and table.
        ['No.', 'Name', 'Student ID'].forEach((label, c) => put(8, c, label, null, header));
        groups.forEach((group, gi) => {
            for (let c = group.start; c <= group.ws; c++) {
                put(7, c, c === group.start ? group.name : '', null, greenHeader);
            }
            merges.push({ s: { r: 7, c: group.start }, e: { r: 7, c: group.ws } });
            group.items.forEach((item, i) => {
                put(8, group.scores[i], item.title, null, header);
                put(9, group.scores[i], Number(item.max) || 100, null, input);
            });
            put(8, group.total, 'Total HPS', null, header); put(8, group.ps, 'PS (%)', null, header); put(8, group.ws, ['WW', 'PT', 'QA'][gi], null, header);
            put(9, group.ws, group.weight / 100, null, { ...input, numFmt: '0%' });
        });
        put(9, 3, 'HPS/Weights', null, { ...header, alignment: { ...header.alignment, wrapText: false } });
        put(8, initial, 'Initial Grade', null, greenHeader); put(8, quarterly, 'Quarterly Grade', null, greenHeader);
        data.rows.forEach((row, ri) => {
            const r = 10 + ri;
            put(r, 0, ri + 1, null, { ...input, alignment: { horizontal: 'center', vertical: 'center' }, numFmt: '0' });
            put(r, 1, row.name, null, input); put(r, 2, String(row.id), null, { ...input, alignment: { horizontal: 'center', vertical: 'center' }, numFmt: '@' });
            groups.forEach((group, gi) => {
                let sum = 0, max = 0;
                const refs = group.scores.map((c, i) => {
                    const score = row.scores[gi][i];
                    const numeric = score.value !== null && score.value !== undefined && score.value !== '' && score.value !== '-' && Number.isFinite(Number(score.value));
                    const status = String(score.status || '').toLowerCase();
                    const fill = { missing: 'EFDADA', absent: 'EBEBEB', incomplete: 'FFEDA0', excuse: 'DBDFF0', excused: 'DBDFF0' }[status];
                    put(r, c, numeric ? Number(score.value) : '', null, { ...input, numFmt: 'General', ...(fill ? { fill: { fgColor: { rgb: fill } } } : {}) });
                    if (numeric) { sum += Number(score.value); max += Number(group.items[i].max) || 100; }
                    return { cell: address(r, c), hps: address(9, c).replace(/([A-Z]+)(\d+)/, '$1$$$2') };
                });
                const numbers = refs.map(ref => `COUNT(${ref.cell})`).join('+') || '0';
                const denominator = refs.map(ref => `IF(ISNUMBER(${ref.cell}),${ref.hps},0)`).join('+') || '0';
                const scoreSum = refs.length ? 'SUM(' + refs.map(ref => ref.cell).join(',') + ')' : '0';
                put(r, group.total, max > 0 ? max : '', `IF((${numbers})=0,"",${denominator})`, calc);
                const percent = row.percentages[gi];
                const computed = max > 0 ? sum / max * 100 : null;
                if (percent !== null && percent !== undefined && (computed === null || Math.abs(computed - percent) > 0.000001)) {
                    // Legacy manually encoded component percentage: retain authoritative value.
                    put(r, group.ps, percent, null, input);
                    sheet[address(r, group.ps)].c = [{ a: 'SIGMA', t: 'Manually encoded component percentage retained from gradebook. Edit this input directly.' }];
                } else {
                    put(r, group.ps, computed ?? '', `IF((${numbers})=0,"",IFERROR(${scoreSum}/${address(r, group.total)}*100,""))`, calc);
                }
                sheet[address(r, group.ps)].s = { ...sheet[address(r, group.ps)].s, numFmt: '0.00"%"' };
                for (const c of [group.total, group.ps]) {
                    sheet[address(r, c)].s = { ...sheet[address(r, c)].s, fill: { fgColor: { rgb: 'FFFAD6' } } };
                }
                put(r, group.ws, percent == null ? '' : percent * group.weight / 100,
                    `IF(ISNUMBER(${address(r, group.ps)}),${address(r, group.ps)}*${XLSX.utils.encode_col(group.ws)}$10,"")`, percentage);
            });
            const weighted = groups.map(group => address(r, group.ws)).join(',');
            put(r, initial, row.initial ?? '', `IF(COUNT(${weighted})=0,"",SUM(${weighted}))`, percentage);
            put(r, quarterly, row.quarterly ?? '', `IF(ISNUMBER(${address(r, initial)}),VLOOKUP(MAX(0,MIN(100,${address(r, initial)})),Transmutation!$A$2:$B$${transmutation.length + 1},2,1),"")`, { ...calc, numFmt: '0' });
        });
        const noteRow = 11 + data.rows.length;
        put(noteRow, 3, 'Score Colors', null, { ...input, font: { ...input.font, bold: true } });
        [['Missing', 'EFDADA'], ['Absent', 'EBEBEB'], ['Incomplete', 'FFEDA0'], ['Excuse', 'DBDFF0']].forEach(([label, rgb], index) => {
            put(noteRow, 4 + index, label, null, { ...input, fill: { fgColor: { rgb } },
                alignment: { horizontal: 'center', vertical: 'center' }, font: { ...input.font, bold: true } });
        });
        put(noteRow, 9, 'Blank scores are excluded from scored HPS.', null, {
            ...input, alignment: { vertical: 'center', wrapText: false, shrinkToFit: true }
        });
        merges.push({ s: { r: noteRow, c: 9 }, e: { r: noteRow, c: col - 1 } });
        sheet['!ref'] = `A1:${address(noteRow, col - 1)}`;
        sheet['!merges'] = merges; sheet['!cols'] = columns;
        sheet['!rows'] = Array.from({ length: noteRow + 1 }, (_, r) => ({ hpt: r === 8 ? 60 : r < 6 ? 26 : 24 }));
        const border = Object.fromEntries(['top', 'bottom', 'left', 'right'].map(side => [side, { style: 'thin', color: { rgb: 'DCE4ED' } }]));
        for (let r = 7; r < 10 + data.rows.length; r++) for (let c = 0; c < col; c++) {
            if (!sheet[address(r, c)]) put(r, c, '');
            sheet[address(r, c)].s = { ...sheet[address(r, c)].s, border };
        }
        const divider = { style: 'thick', color: { rgb: '166534' } };
        const divisions = groups.map(g => ({ start: g.start, end: g.ws }));
        divisions.forEach(({ start, end }) => {
            for (let r = 7; r < 10 + data.rows.length; r++) {
                for (const [c, side] of [[start, 'left'], [end, 'right']]) {
                    const cell = sheet[address(r, c)];
                    cell.s = { ...cell.s, border: { ...cell.s.border, [side]: divider } };
                }
            }
        });
        for (let r = 8; r < 10 + data.rows.length; r++) {
            const cell = sheet[address(r, quarterly)];
            cell.s = { ...cell.s, border: { ...cell.s.border, left: divider, right: { style: 'none' } } };
        }
        XLSX.utils.book_append_sheet(wb, sheet, mode === 'summary' ? 'Calculation' : 'Class Record');
        if (mode === 'summary') {
            const summary = {};
            for (let r = 0; r < 6; r++) for (let c = 0; c < 8; c++) {
                const origin = sheet[address(r, c)];
                if (origin) summary[address(r, c)] = { ...origin };
            }
            const selected = [0, 1, 2, ...groups.map(g => g.ws), initial, quarterly];
            const labels = ['No.', 'Name', 'Student ID', ...groups.map(g => `${g.name} WS (${g.weight}%)`), 'Initial Grade', 'Quarterly Grade'];
            labels.forEach((label, c) => { summary[address(7, c)] = { t: 's', v: label, s: c >= 3 ? greenHeader : header }; });
            data.rows.forEach((row, ri) => selected.forEach((c, target) => {
                const origin = sheet[address(ri + 10, c)];
                summary[address(ri + 8, target)] = { ...origin, f: `Calculation!${address(ri + 10, c)}`, s: origin.s };
            }));
            summary['!ref'] = `A1:H${8 + data.rows.length}`;
            summary['!cols'] = [columns[0], columns[1], columns[2], ...Array(5).fill({ wch: 22 })];
            summary['!merges'] = [0, 1].map(r => ({ s: { r, c: 0 }, e: { r, c: 7 } }))
                .concat(merges.filter(merge => merge.s.r >= 2 && merge.s.r < 6));
            summary['!rows'] = Array.from({ length: 8 + data.rows.length }, (_, r) => ({ hpt: r === 7 ? 42 : 26 }));
            for (let r = 7; r < 8 + data.rows.length; r++) for (let c = 3; c < 8; c++) {
                const cell = summary[address(r, c)];
                cell.s = { ...cell.s, border: { ...border, left: divider, right: c === 7 ? { style: 'none' } : c === 6 ? border.right : divider } };
            }
            XLSX.utils.book_append_sheet(wb, summary, 'Summary');
            wb.SheetNames = ['Summary', 'Calculation'];
        }
        if (mode === 'assessments') {
            const hidden = new Set([...groups.flatMap(g => [g.total, g.ps, g.ws]), initial, quarterly]);
            columns.forEach((value, c) => { if (hidden.has(c)) value.hidden = true; });
        }
        const visibleGroups = { qa: [2], 'ww-pt': [0, 1], ww: [0], pt: [1] }[mode];
        if (visibleGroups) {
            // Keep all component formulas so final grades still use the complete record.
            groups.forEach((group, index) => {
                if (!visibleGroups.includes(index)) {
                    for (let c = group.start; c <= group.ws; c++) columns[c].hidden = true;
                }
            });
            const metadataStart = groups[visibleGroups[0]].start;
            for (const r of [2, 4]) {
                const label = sheet[address(r, 4)];
                const value = sheet[address(r, 5)];
                delete sheet[address(r, 4)];
                delete sheet[address(r, 5)];
                for (let i = merges.length - 1; i >= 0; i--) {
                    if (merges[i].s.r === r && merges[i].s.c === 5) merges.splice(i, 1);
                }
                sheet[address(r, metadataStart)] = label;
                sheet[address(r, metadataStart + 1)] = value;
                merges.push({ s: { r, c: metadataStart + 1 }, e: { r, c: col - 1 } });
            }
        }
        if (mode !== 'summary' && mode !== 'full') {
            // Component-only exports hide columns, so relocate the legend into visible cells.
            const visible = columns.map((value, c) => c).filter(c => c >= 4 && !columns[c].hidden);
            for (let c = 0; c < col; c++) delete sheet[address(noteRow, c)];
            for (let i = merges.length - 1; i >= 0; i--) {
                if (merges[i].s.r === noteRow) merges.splice(i, 1);
            }
            put(noteRow, 3, 'Score Colors', null, { ...input, font: { ...input.font, bold: true } });
            [['Missing', 'EFDADA'], ['Absent', 'EBEBEB'], ['Incomplete', 'FFEDA0'], ['Excuse', 'DBDFF0']].forEach(([label, rgb], i) => {
                put(noteRow, visible[i], label, null, { ...input, fill: { fgColor: { rgb } },
                    alignment: { horizontal: 'center', vertical: 'center' }, font: { ...input.font, bold: true } });
            });
            const noteColumn = visible[4];
            if (noteColumn !== undefined) {
                put(noteRow, noteColumn, 'Blank scores are excluded from scored HPS.', null,
                    { ...input, alignment: { vertical: 'center', wrapText: false, shrinkToFit: true } });
                merges.push({ s: { r: noteRow, c: noteColumn }, e: { r: noteRow, c: col - 1 } });
            }
        }
        if (mode === 'summary') {
            for (let c = 0; c < col; c++) delete sheet[address(noteRow, c)];
            sheet['!merges'] = sheet['!merges'].filter(merge => merge.s.r !== noteRow);
            sheet['!ref'] = `A1:${address(9 + data.rows.length, col - 1)}`;
        }
        XLSX.utils.book_append_sheet(wb, lookup, 'Transmutation');
        wb.Workbook = { Sheets: wb.SheetNames.map(name => ({ name, Hidden: name === 'Transmutation' || (mode === 'summary' && name === 'Calculation') ? 1 : 0 })), CalcPr: { calcMode: 'auto', fullCalcOnLoad: true, forceFullCalc: true } };
        return wb;
    };

    window.openGradebookExportForm = function () {
        if (!window.sigmaGradesState?.selectedSubjectSection) return window.showToast?.('Select a subject and section first.', 'warning');
        const selected = window.sigmaGradesState.selectedSubjectSection;
        return window.openSharedExcelExportForm({ id: 'gradebook-export-modal', title: 'Export Class Record',
            context: 'Choose the class record details to include in your export (.xlsx):',
            options: [
                { value: 'full', label: 'Full Class Record', subtitle: 'All assessment scores, component totals, Initial Grade, and Quarterly Grade.' },
                { value: 'summary', label: 'Grade Summary', subtitle: 'Component weighted scores, Initial Grade, and Quarterly Grade.' },
                { value: 'qa', label: 'Quarterly Assessment', subtitle: 'QA scores and component totals, with Initial Grade and Quarterly Grade.' },
                { value: 'ww-pt', label: 'Written Works & Performance Tasks', subtitle: 'WW and PT scores and component totals, with Initial Grade and Quarterly Grade.' },
                { value: 'ww', label: 'Written Works', subtitle: 'WW scores and component totals, with Initial Grade and Quarterly Grade.' },
                { value: 'pt', label: 'Performance Tasks', subtitle: 'PT scores and component totals, with Initial Grade and Quarterly Grade.' }
            ],
            onDownload: mode => {
                if (!window.XLSX) throw Error('Excel export library is unavailable. Check your connection and retry.');
                const state = window.sigmaGradesState;
                const previous = state.currentView;
                try { state.currentView = 'overview'; window.renderAdminGradebookWorkspace(); }
                finally { state.currentView = previous; window.renderAdminGradebookWorkspace(); }
                const snapshot = window._gradebookExportSnapshot;
                if (!snapshot || snapshot.subject !== state.selectedSubjectSection.subject || snapshot.section !== state.selectedSubjectSection.sectionName || snapshot.quarter !== (state.activeQuarter || 1)) throw Error('Unable to read the selected gradebook.');
                const selectedTeacher = window.getEffectiveTeacher?.();
                const teacherKey = teacher => String(teacher?.id || teacher?.uid || teacher?.email || teacher?.fullName || teacher?.name || '');
                if (!selectedTeacher || teacherKey(snapshot.teacher) !== teacherKey(selectedTeacher)) throw Error('Select a teacher and reload their gradebook before exporting.');
                const run = () => {
                    const groupDefs = [['Written Works', 'ww'], ['Performance Tasks', 'perf. task'], ['Quarterly Assessment', 'qa']];
                    const groups = groupDefs.map(([name, category]) => ({ name, items: window.getCategoryDetails(category, snapshot.quarter, snapshot.subject, snapshot.section) || [] }));
                    const rows = snapshot.rows.map(row => {
                        const s = row.student;
                        const name = s.fullName || ([s.lastName, [s.firstName, s.middleName].filter(Boolean).join(' ')].filter(Boolean).join(', ')) || s.name || '';
                        return { ...row, id: s.id || s.lrn || s.uid || '', name, scores: groups.map(g => g.items.map((item, i) => ({
                            value: window.getAdminGradebookStudentItemScore(s, item._category || item.category || groupDefs[groups.indexOf(g)][1], item.itemIdx ?? i, item, snapshot.subject, snapshot.quarter),
                            status: window.gradebookAttendanceMark?.(s, item, item._category || item.category || groupDefs[groups.indexOf(g)][1], item.itemIdx ?? i, snapshot.subject, snapshot.quarter)?.name || ''
                        }))) };
                    });
                    const topicSubject = window.getTopicSubject?.(snapshot.subject) || {};
                    let adminSubjects = [];
                    try { adminSubjects = JSON.parse(localStorage.getItem('sigma-admin-subjects') || '[]'); } catch (_) {}
                    const normalizeSubject = value => String(value || '').replace(/^(card-|subj-)/i, '').trim().toLowerCase();
                    const subjectKeys = [snapshot.subject, topicSubject.id, topicSubject.code, topicSubject.name, topicSubject.title].map(normalizeSubject).filter(Boolean);
                    const subject = (Array.isArray(adminSubjects) ? adminSubjects : []).find(record =>
                        [record.id, record.code, record.subjectCode, record.name, record.title].some(value => value && subjectKeys.includes(normalizeSubject(value)))) || topicSubject;
                    const sy = window.getActiveSchoolYearRecord?.() || {};
                    const data = { ...snapshot, groups, rows,
                        subject: subject.name || subject.title || snapshot.subject,
                        school: 'Interface Computer College',
                        weights: { ww: Number(snapshot.weights.ww) || 25, pt: Number(snapshot.weights.pt) || 50, qa: Number(snapshot.weights.qa) || 25 },
                        schoolYear: sy.yearStart && sy.yearEnd ? `${sy.yearStart}-${sy.yearEnd}` : sy.name || sy.schoolYear || sy.year || sy.label || '',
                        subjectCode: subject.code || subject.subjectCode || state.selectedSubjectSection.subjectCode || '',
                        teacher: snapshot.teacher?.fullName || snapshot.teacher?.name || [snapshot.teacher?.firstName, snapshot.teacher?.middleName, snapshot.teacher?.lastName].filter(Boolean).join(' ') };
                    const wb = window.buildGradebookExcel(data, mode, window.XLSX);
                    const safe = value => String(value).replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
                    window.XLSX.writeFile(wb, `Class_Record_${safe(snapshot.subject)}_${safe(snapshot.section)}_Q${snapshot.quarter}_${mode}.xlsx`, { bookType: 'xlsx', cellStyles: true });
                };
                return window.withGradebookReadCache ? window.withGradebookReadCache(run) : run();
            } });
    };
})();
