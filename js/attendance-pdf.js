(function () {
    'use strict';
    let libraries;
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = () => { script.remove(); reject(new Error('PDF library unavailable')); };
            document.head.appendChild(script);
        });
    }
    async function loadLibraries() {
        if (!libraries) libraries = (async () => {
            if (!window.jspdf?.jsPDF) await loadScript('js/vendor/jspdf.umd.min.js?v=3.0.3');
            if (!window.jspdf.jsPDF.API.autoTable) await loadScript('js/vendor/jspdf.plugin.autotable.min.js?v=5.0.2');
        })().catch(error => { libraries = null; throw error; });
        await libraries;
    }
    window.saveAttendancePdf = async function ({ section, subject, label, months }) {
        await loadLibraries();
        const doc = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        doc.setProperties({ title: 'Attendance Register - ' + subject, subject: section + ' - ' + label, creator: 'SIGMA ELMS' });
        let first = true;
        for (const report of months) {
            const head = report.rows[4];
            const dateCount = head.length - 7;
            // Repeat identifying columns and monthly totals rather than shrink long periods illegibly.
            for (let offset = 0; offset < dateCount; offset += 12) {
                if (!first) doc.addPage();
                first = false;
                const dateEnd = Math.min(offset + 12, dateCount);
                const select = row => [...row.slice(0, 3), ...row.slice(3 + offset, 3 + dateEnd), ...row.slice(-4)];
                const header = select(head);
                const body = report.rows.slice(5).filter(row => row.length).map(select);
                const drawHeading = () => {
                    doc.setTextColor(0); doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
                    doc.text('INTERFACE COMPUTER COLLEGE', 12, 14);
                    doc.setFontSize(10);
                    const lines = doc.splitTextToSize('ATTENDANCE REGISTER - ' + subject + ' (' + section + ')', 273);
                    doc.text(lines, 12, 21);
                    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
                    const details = doc.splitTextToSize('Period: ' + report.period + '\nQuarter: ' + (report.academic?.quarter || label) + '   Semester: ' + (report.academic?.semester || '') + '\nMonth: ' + report.month + '   Dates: ' + head[3 + offset] + ' to ' + head[2 + dateEnd] + '   Totals: full month', 273);
                    doc.text(details, 12, 24 + lines.length * 4);
                    return 27 + lines.length * 4 + details.length * 4;
                };
                const top = drawHeading();
                const styles = { 0: { cellWidth: 10 }, 1: { cellWidth: 48, halign: 'left' }, 2: { cellWidth: 23 } };
                for (let i = header.length - 4; i < header.length; i++) styles[i] = { cellWidth: 16 };
                doc.autoTable({ head: [header], body, startY: top, margin: { top, left: 12, right: 12, bottom: 18 },
                    theme: 'grid', showHead: 'everyPage', rowPageBreak: 'avoid',
                    styles: { font: 'helvetica', fontSize: 8, cellPadding: 1.4, halign: 'center', valign: 'middle', textColor: 0, lineColor: [218, 226, 220], lineWidth: 0.15, overflow: 'linebreak' },
                    headStyles: { fillColor: [21, 128, 61], textColor: 255, fontStyle: 'bold' },
                    alternateRowStyles: { fillColor: [247, 250, 248] }, columnStyles: styles,
                    willDrawPage: data => { if (data.pageNumber > 1) drawHeading(); },
                    didParseCell: data => { if (data.section === 'body' && String(data.row.raw[1]).startsWith('All Total')) data.cell.styles.fontStyle = 'bold'; }
                });
            }
        }
        const count = doc.getNumberOfPages();
        for (let page = 1; page <= count; page++) {
            doc.setPage(page); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(80);
            doc.text('P - Present   A - Absent   L - Late   E - Excused', 12, 201);
            doc.text('Page ' + page + ' of ' + count, 285, 201, { align: 'right' });
        }
        const safe = value => String(value).replace(/[^a-zA-Z0-9_-]/g, '_');
        doc.save('Attendance_' + safe(subject) + '_' + safe(section) + '_' + safe(label) + '.pdf');
        return doc;
    };
})();
