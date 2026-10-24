(function () {
    'use strict';
    const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    // Use the same subject configuration as the Topics and Gradebook quarter pickers.
    const subjectExportQuarters = subject => [...new Set((window.getSubjectAvailableQuarters?.(subject) || [])
        .map(Number).filter(quarter => [1, 2, 3, 4].includes(quarter)))].sort((a, b) => a - b);
    const subjectExportPeriodAllowed = (period, subject) => {
        const quarters = subjectExportQuarters(subject);
        if (period.key.startsWith('q')) return quarters.includes(Number(period.key.slice(1)));
        const required = period.key === 'sem1' ? [1, 2] : [3, 4];
        return required.every(quarter => quarters.includes(quarter));
    };
    window.getAttendanceAcademicPeriods = function () {
        const year = window.getActiveSchoolYearRecord?.() || {};
        const ordinals = ['1st', '2nd', '3rd', '4th'];
        const valid = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
        const quarters = ordinals.map((ordinal, index) => {
            const key = 'q' + (index + 1);
            const start = year[key + 'Start'], end = year[key + 'End'];
            return { key, label: ordinal + ' Quarter', quarter: ordinal + ' Quarter',
                semester: index < 2 ? '1st Semester' : '2nd Semester', start, end,
                available: valid(start) && valid(end) && start <= end };
        });
        const semesters = [0, 2].map((index, semester) => ({
            key: 'sem' + (semester + 1), label: ordinals[semester] + ' Semester',
            quarter: quarters[index].label + ' / ' + quarters[index + 1].label,
            semester: ordinals[semester] + ' Semester', start: quarters[index].start, end: quarters[index + 1].end,
            available: quarters[index].available && quarters[index + 1].available && quarters[index].end < quarters[index + 1].start
        }));
        return [...quarters, ...semesters];
    };
    const attendancePeriodReady = (period, section, subject) => {
        if (!period.available || !subjectExportPeriodAllowed(period, subject)) return false;
        if (period.key.startsWith('sem')) {
            const keys = period.key === 'sem1' ? ['q1', 'q2'] : ['q3', 'q4'];
            return window.getAttendanceAcademicPeriods().filter(quarter => keys.includes(quarter.key))
                .every(quarter => attendancePeriodReady(quarter, section, subject));
        }
        const data = window.findAttendanceClassroomRecord?.(section, subject)?.data || {};
        const recorded = Object.entries(data).some(([date, entry]) => /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= period.start && date <= period.end &&
            Object.values(entry?.statuses || {}).some(status => ['P', 'A', 'L', 'E'].includes(String(status).trim().toUpperCase())));
        return recorded || (data.date >= period.start && data.date <= period.end && Object.values(data.statuses || {}).some(status => ['P', 'A', 'L', 'E'].includes(String(status).trim().toUpperCase())));
    };
    window.isAttendanceAcademicPeriodReady = attendancePeriodReady;
    window.attendanceAcademicExportOptions = function (section, subject) {
        return `<div id="attendance-academic-options" data-section="${escape(section)}" data-subject="${escape(subject)}" style="display:contents">` + window.getAttendanceAcademicPeriods().filter(period => subjectExportPeriodAllowed(period, subject)).map(period => {
            const ready = attendancePeriodReady(period, section, subject);
            return `<label class="export-scope-option flex items-start gap-4 p-5 sm:p-6 rounded-2xl border border-slate-200 bg-white cursor-pointer transition-all hover:bg-slate-50" ${ready ? '' : 'style="opacity:.55;cursor:not-allowed"'}>
            <input type="radio" name="attendance-export-scope" value="${period.key}" class="mt-1 w-5 h-5 text-[#15803d] focus:ring-[#15803d] accent-[#15803d] cursor-pointer shrink-0" ${ready ? '' : 'disabled'} onchange="window.updateAttendanceExportOptionUI()">
            <div class="flex-1 min-w-0"><span class="export-scope-title text-base font-bold text-black">${period.label}${ready ? '' : ' · Locked'}</span>
            <p class="export-scope-desc text-sm text-black-fade mt-1.5 leading-relaxed">${!period.available ? 'Configure this period’s dates in School Year settings to enable export.' : !ready ? (period.key.startsWith('sem') ? 'Available when attendance is recorded in both quarters.' : 'Available when attendance is recorded for this period.') : `Exports recorded attendance from ${escape(period.start)} to ${escape(period.end)}, grouped by month.`}</p></div></label>`;
        }).join('') + '</div>';
    };
    const refreshAttendancePeriods = () => {
        const container = document.getElementById('attendance-academic-options');
        if (!container) return;
        const selected = container.querySelector('input:checked')?.value;
        container.outerHTML = window.attendanceAcademicExportOptions(container.dataset.section, container.dataset.subject);
        const replacement = document.getElementById('attendance-academic-options');
        const radio = [...replacement.querySelectorAll('input')].find(input => input.value === selected && !input.disabled);
        if (radio) radio.checked = true;
        else if (selected) document.querySelector('input[name="attendance-export-scope"][value="day"]').checked = true;
        window.updateAttendanceExportOptionUI?.();
    };
    ['storage', 'focus', 'sigma:attendance-changed'].forEach(event => window.addEventListener(event, refreshAttendancePeriods));
    window.getAttendanceAcademicContext = function (dates) {
        const values = dates.map(date => date.dateStr || date);
        const quarters = window.getAttendanceAcademicPeriods().filter(period => period.key.startsWith('q') && period.available && values.some(date => date >= period.start && date <= period.end));
        const outside = values.some(date => !quarters.some(period => date >= period.start && date <= period.end));
        return { quarter: [...quarters.map(period => period.quarter), ...(outside ? ['Outside configured quarter dates'] : [])].join(' / ') || 'Not configured',
            semester: [...new Set(quarters.map(period => period.semester)), ...(outside ? ['Outside configured semester dates'] : [])].join(' / ') || 'Not configured' };
    };
    window.styleAttendanceExcelHeading = function (ws, XLSX, subject, section, period, academic = {}) {
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let r = range.e.r; r >= 3; r--) {
            for (let c = 0; c <= range.e.c; c++) {
                const from = XLSX.utils.encode_cell({ r, c });
                const to = XLSX.utils.encode_cell({ r: r + 4, c });
                if (ws[from]) ws[to] = ws[from]; else delete ws[to];
                delete ws[from];
            }
        }
        for (let r = 0; r < 7; r++) for (let c = 0; c <= range.e.c; c++) delete ws[XLSX.utils.encode_cell({ r, c })];
        const merges = [];
        for (const [r, title] of [[0, 'Interface Computer College'], [1, 'Attendance Sheet']]) {
            for (let c = 0; c <= range.e.c; c++) ws[XLSX.utils.encode_cell({ r, c })] = {
                t: 's', v: c === 0 ? title : '', s: { font: { name: 'Calibri', sz: r === 0 ? 16 : 14, bold: true, color: { rgb: 'FFFFFF' } },
                    fill: { fgColor: { rgb: '15803D' } }, alignment: { horizontal: 'center', vertical: 'center' } }
            };
            merges.push({ s: { r, c: 0 }, e: { r, c: range.e.c } });
        }
        const sy = window.getActiveSchoolYearRecord?.() || {};
        const year = sy.yearStart && sy.yearEnd ? `${sy.yearStart}-${sy.yearEnd}` : sy.name || sy.schoolYear || 'Not configured';
        for (const [r, label, value] of [[2, 'Period:', period], [3, 'School Year:', year], [4, 'Section:', section], [5, 'Quarter:', academic.quarter || 'Not configured'], [6, 'Semester:', academic.semester || 'Not configured']]) {
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
        ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: range.e.r + 4, c: range.e.c } });
        ws['!rows'] = Array.from({ length: range.e.r + 5 }, (_, r) => ({ hpt: r < 2 ? 28 : 24 }));
        return ws;
    };
    window.openSharedExcelExportForm = function ({ id, title, options, onDownload, context = '', periods = [], selectedPeriod = '', refreshPeriods }) {
        document.getElementById(id)?.remove();
        const modal = document.createElement('div');
        modal.id = id;
        modal.className = 'sigma-modal-overlay';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-label', title);
        const periodOptions = (items, selected) => items.map(period => `<label class="shared-export-period"><input type="radio" name="${id}-period" value="${escape(period.value)}" ${period.disabled ? 'disabled' : ''} ${period.value === selected && !period.disabled ? 'checked' : ''}><span>${escape(period.label)}<small>${escape(period.subtitle || '')}</small></span></label>`).join('');
        modal.innerHTML = `<button type="button" class="shared-export-exit" aria-label="Close export"><i class="fa-solid fa-xmark"></i></button>
            <div class="sigma-modal-shell"><div class="sigma-modal-panel">
            <div class="sigma-modal-header"><div class="sigma-modal-header-top"><h1 class="sigma-modal-title">${escape(title)}</h1></div></div>
            <div class="sigma-modal-body">${context ? `<p class="shared-export-intro">${escape(context)}</p>` : ''}${periods.length ? `<fieldset class="shared-export-periods"><legend>Export period</legend>${periodOptions(periods, selectedPeriod)}</fieldset>` : ''}<fieldset class="shared-export-options"><legend class="sr-only">Export content</legend>
            ${options.map((o, i) => `<label class="shared-export-option"><input type="radio" name="${id}-scope" value="${escape(o.value)}" ${i === 0 ? 'checked' : ''}><span class="shared-export-copy"><span class="shared-export-title">${escape(o.label)}</span>${o.subtitle ? `<span class="shared-export-subtitle">${escape(o.subtitle)}</span>` : ''}</span></label>`).join('')}
            </fieldset><p class="shared-export-error" role="alert"></p></div>
            <div class="sigma-modal-footer"><button type="button" class="sigma-btn sigma-btn-primary sigma-btn-md" data-download>Download Excel</button></div>
            </div></div>`;
        const refreshEvents = ['storage', 'focus', 'sigma-gradebook-updated', 'sigma:assessment-scored', 'sigma:grades-published'];
        const updatePeriods = () => {
            if (!refreshPeriods || !modal.isConnected) return;
            let latest;
            try { latest = refreshPeriods(); }
            catch (error) {
                modal.querySelector('[role="alert"]').textContent = error.message;
                modal.querySelector('[data-download]').disabled = true;
                return;
            }
            const selected = modal.querySelector('input[name="' + id + '-period"]:checked')?.value;
            modal.querySelector('.shared-export-periods').innerHTML = '<legend>Export period</legend>' + periodOptions(latest, selected);
            modal.querySelector('[data-download]').disabled = !modal.querySelector('input[name="' + id + '-period"]:checked');
        };
        if (refreshPeriods) refreshEvents.forEach(event => window.addEventListener(event, updatePeriods));
        modal.addEventListener('change', () => { modal.querySelector('[data-download]').disabled = periods.length && !modal.querySelector('input[name="' + id + '-period"]:checked'); });
        const previousFocus = document.activeElement;
        const close = () => {
            refreshEvents.forEach(event => window.removeEventListener(event, updatePeriods));
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
            try {
                const mode = modal.querySelector('input[name="' + id + '-scope"]:checked')?.value;
                const period = modal.querySelector('input[name="' + id + '-period"]:checked')?.value;
                if (periods.length && !period) throw Error('No recorded grades are available for export.');
                await onDownload(mode, period); close();
            }
            catch (error) { modal.querySelector('[role="alert"]').textContent = error.message || 'Export failed. Please retry.'; }
            finally { this.disabled = false; }
        };
        document.body.appendChild(modal);
        document.documentElement.classList.add('has-modal-open');
        document.addEventListener('keydown', keys);
        modal.querySelector('[data-download]').disabled = periods.length && !modal.querySelector('input[name="' + id + '-period"]:checked');
        modal.querySelector('input:not(:disabled)')?.focus();
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
        metadata(5, 'Teacher:', data.teacher || 'Not specified', 'Semester:', Number(data.quarter) <= 2 ? '1st Semester' : '2nd Semester');
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
            put(r, 0, window.getRecordCreationNumber(row, data.rows, 'users'), null, { ...input, alignment: { horizontal: 'center', vertical: 'center' }, numFmt: '0' });
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

    window.buildSemesterGradebookExcel = function (datasets, mode, XLSX) {
        const wb = XLSX.utils.book_new();
        const quarterReferences = [];
        const hidden = new Set(['Transmutation']);
        for (const data of datasets) {
            const source = window.buildGradebookExcel(data, mode, XLSX);
            const names = Object.fromEntries(source.SheetNames.map(name => [name, name === 'Transmutation' ? name : `Q${data.quarter} ${name}`]));
            for (const name of source.SheetNames) {
                if (name === 'Transmutation' && wb.Sheets.Transmutation) continue;
                const sheet = source.Sheets[name];
                for (const cell of Object.values(sheet)) {
                    if (!cell?.f) continue;
                    // Each quarter keeps its own calculation references.
                    for (const original of ['Calculation', 'Class Record', 'Summary']) {
                        cell.f = cell.f.replaceAll(original + '!', `'${names[original]}'!`);
                    }
                }
                XLSX.utils.book_append_sheet(wb, sheet, names[name]);
                if (name === 'Calculation') hidden.add(names[name]);
            }
            const calculation = source.Sheets[mode === 'summary' ? 'Calculation' : 'Class Record'];
            const quarterlyCell = Object.keys(calculation).find(address => !address.startsWith('!') && calculation[address]?.v === 'Quarterly Grade' && XLSX.utils.decode_cell(address).r === 8);
            quarterReferences.push({ data, name: names[mode === 'summary' ? 'Calculation' : 'Class Record'], column: XLSX.utils.decode_cell(quarterlyCell).c });
        }
        const first = datasets[0];
        const semester = Number(first.quarter) <= 2 ? '1st Semester' : '2nd Semester';
        const rows = [
            ['Interface Computer College'], ['Semester Class Record'],
            ['School Year: ' + first.schoolYear], ['Section: ' + first.section + ' | Subject: ' + first.subject],
            ['Semester: ' + semester], ['Teacher: ' + first.teacher], [],
            ['No.', 'Name', 'Student ID', ...datasets.map(data => `Quarter ${data.quarter}`), 'Semester Grade']
        ];
        const key = row => String(row.id || row.name);
        const students = [...new Map(datasets.flatMap(data => data.rows).map(row => [key(row), row])).values()];
        students.sort((a, b) => a.name.localeCompare(b.name));
        const sheet = XLSX.utils.aoa_to_sheet(rows);
        const green = { fill: { fgColor: { rgb: '15803D' } }, font: { name: 'Calibri', sz: 12, bold: true, color: { rgb: 'FFFFFF' } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true } };
        students.forEach((student, index) => {
            const r = 8 + index;
            [window.getRecordCreationNumber(student, students, 'users'), student.name, String(student.id)].forEach((value, c) => { sheet[XLSX.utils.encode_cell({ r, c })] = { t: c === 0 ? 'n' : 's', v: value }; });
            const grades = quarterReferences.map((reference, index) => {
                const rowIndex = reference.data.rows.findIndex(row => key(row) === key(student));
                const row = reference.data.rows[rowIndex];
                const grade = row?.quarterly;
                const value = recordedGrade(grade) ? Number(grade) : '';
                sheet[XLSX.utils.encode_cell({ r, c: index + 3 })] = { t: value === '' ? 's' : 'n', v: value,
                    ...(rowIndex < 0 ? {} : { f: `IF(ISNUMBER('${reference.name}'!${XLSX.utils.encode_cell({ r: rowIndex + 10, c: reference.column })}),'${reference.name}'!${XLSX.utils.encode_cell({ r: rowIndex + 10, c: reference.column })},"")` }) };
                return value;
            });
            sheet[XLSX.utils.encode_cell({ r, c: 5 })] = { t: grades.every(recordedGrade) ? 'n' : 's',
                v: grades.every(recordedGrade) ? Math.round((grades[0] + grades[1]) / 2) : '',
                f: `IF(COUNT(D${r + 1}:E${r + 1})=2,ROUND(AVERAGE(D${r + 1}:E${r + 1}),0),"")` };
        });
        sheet['!ref'] = `A1:F${8 + students.length}`;
        sheet['!merges'] = [0, 1, 2, 3, 4, 5].map(r => ({ s: { r, c: 0 }, e: { r, c: 5 } }));
        sheet['!cols'] = [{ wch: 7 }, { wch: 36 }, { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 22 }];
        sheet['!rows'] = Array.from({ length: 8 + students.length }, () => ({ hpt: 28 }));
        for (const [address, cell] of Object.entries(sheet)) {
            if (address.startsWith('!')) continue;
            const { r, c } = XLSX.utils.decode_cell(address);
            cell.s = r < 2 || r === 7 ? green : { font: { name: 'Calibri', sz: 11 }, alignment: { vertical: 'center', horizontal: c === 1 ? 'left' : 'center' }, ...(c === 5 && r > 7 ? { fill: { fgColor: { rgb: 'EAF7EF' } } } : {}) };
        }
        XLSX.utils.book_append_sheet(wb, sheet, 'Semester Summary');
        wb.SheetNames = ['Semester Summary', ...wb.SheetNames.filter(name => name !== 'Semester Summary')];
        wb.Workbook = { Sheets: wb.SheetNames.map(name => ({ name, Hidden: hidden.has(name) ? 1 : 0 })), CalcPr: { calcMode: 'auto', fullCalcOnLoad: true, forceFullCalc: true } };
        return wb;
    };
    const readGradebookExportData = quarter => {
        const state = window.sigmaGradesState;
        if (!subjectExportQuarters(state.selectedSubjectSection?.subject).includes(Number(quarter))) {
            throw Error('This quarter is not assigned to the selected subject.');
        }
        const previous = { quarter: state.activeQuarter, view: state.currentView };
        let snapshot;
        try {
            state.activeQuarter = quarter; state.currentView = 'overview';
            window.renderAdminGradebookWorkspace();
            snapshot = window._gradebookExportSnapshot;
        } finally {
            state.activeQuarter = previous.quarter; state.currentView = previous.view;
            window.renderAdminGradebookWorkspace();
        }
        if (!snapshot || snapshot.subject !== state.selectedSubjectSection.subject || snapshot.section !== state.selectedSubjectSection.sectionName || Number(snapshot.quarter) !== Number(quarter)) throw Error('Unable to read the selected gradebook.');
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
            return data;
        };
        return window.withGradebookReadCache ? window.withGradebookReadCache(run) : run();
    };
    const recordedGrade = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
    const gradebookPeriods = () => {
        const subject = window.sigmaGradesState.selectedSubjectSection.subject;
        const available = subjectExportQuarters(subject);
        const quarters = available.map(quarter => {
            const data = readGradebookExportData(quarter);
            const ready = data.rows.some(row => recordedGrade(row.quarterly));
            return { value: 'q' + quarter, label: ['1st', '2nd', '3rd', '4th'][quarter - 1] + ' Quarter', disabled: !ready,
                subtitle: ready ? 'Recorded grades available' : 'Locked · No recorded grades yet' };
        });
        return [...quarters, ...[0, 1].filter(semester => [semester * 2 + 1, semester * 2 + 2].every(quarter => available.includes(quarter))).map(semester => {
            const required = [semester * 2 + 1, semester * 2 + 2];
            const ready = required.every(quarter => quarters.some(period => period.value === 'q' + quarter && !period.disabled));
            return { value: 'sem' + (semester + 1), label: semester === 0 ? '1st Semester' : '2nd Semester', disabled: !ready,
                subtitle: ready ? 'Both quarters available' : 'Locked · Requires grades in both quarters' };
        })];
    };
    window.openGradebookExportForm = function () {
        if (!window.sigmaGradesState?.selectedSubjectSection) return window.showToast?.('Select a subject and section first.', 'warning');
        let periods;
        try { periods = gradebookPeriods(); }
        catch (error) { return window.showToast?.(error.message, 'warning'); }
        const preferred = 'q' + (window.sigmaGradesState.activeQuarter || 1);
        const selectedPeriod = periods.find(period => period.value === preferred && !period.disabled)?.value || periods.find(period => !period.disabled)?.value || '';
        return window.openSharedExcelExportForm({ id: 'gradebook-export-modal', title: 'Export Class Record',
            periods, selectedPeriod, refreshPeriods: gradebookPeriods,
            context: `${window.sigmaGradesState.selectedSubjectSection.subject} · ${window.sigmaGradesState.selectedSubjectSection.sectionName} — Choose the period and class record details to export (.xlsx).`,
            options: [
                { value: 'full', label: 'Full Class Record', subtitle: 'All assessment scores, component totals, Initial Grade, and Quarterly Grade.' },
                { value: 'summary', label: 'Grade Summary', subtitle: 'Component weighted scores, Initial Grade, and Quarterly Grade.' },
                { value: 'qa', label: 'Quarterly Assessment', subtitle: 'QA scores and component totals, with Initial Grade and Quarterly Grade.' },
                { value: 'ww-pt', label: 'Written Works & Performance Tasks', subtitle: 'WW and PT scores and component totals, with Initial Grade and Quarterly Grade.' },
                { value: 'ww', label: 'Written Works', subtitle: 'WW scores and component totals, with Initial Grade and Quarterly Grade.' },
                { value: 'pt', label: 'Performance Tasks', subtitle: 'PT scores and component totals, with Initial Grade and Quarterly Grade.' }
            ],
            onDownload: (mode, period) => {
                if (!window.XLSX) throw Error('Excel export library is unavailable. Check your connection and retry.');
                const choice = gradebookPeriods().find(item => item.value === period);
                if (!choice || choice.disabled) throw Error('This period is locked until grades are recorded.');
                const safe = value => String(value).replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
                if (period.startsWith('sem')) {
                    const quarters = period === 'sem1' ? [1, 2] : [3, 4];
                    const datasets = quarters.map(readGradebookExportData);
                    const wb = window.buildSemesterGradebookExcel(datasets, mode, window.XLSX);
                    window.XLSX.writeFile(wb, `Class_Record_${safe(datasets[0].subject)}_${safe(datasets[0].section)}_${period}_${mode}.xlsx`, { bookType: 'xlsx', cellStyles: true });
                } else {
                    const data = readGradebookExportData(Number(period.slice(1)));
                    const wb = window.buildGradebookExcel(data, mode, window.XLSX);
                    window.XLSX.writeFile(wb, `Class_Record_${safe(data.subject)}_${safe(data.section)}_${period}_${mode}.xlsx`, { bookType: 'xlsx', cellStyles: true });
                }
            } });
    };
})();
