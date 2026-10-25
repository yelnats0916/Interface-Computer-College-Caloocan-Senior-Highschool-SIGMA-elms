(function () {
    'use strict';
    window.saveAttendanceRecordPdf = async function ({section, subject, date, rows, quarter, schoolYear, reports}) {
        const doc = await window.SigmaPdfLayout.create({orientation:'portrait'});
        const text = window.SigmaPdfLayout.text;
        doc.setProperties({title:'Attendance Record - '+subject,subject:section+' - '+date,creator:'SIGMA ELMS'});
        const days = reports || [{date,rows}];
        for (const [index,report] of days.entries()) {
        if (index) doc.addPage();
        const heading = () => {
            doc.setTextColor(0);doc.setFont('SigmaSans','bold');doc.setFontSize(12);
            doc.text('INTERFACE COMPUTER COLLEGE',14,16);
            doc.setFontSize(11);doc.text('ATTENDANCE RECORD',14,23);
            doc.setFont('SigmaSans','normal');doc.setFontSize(9);
            const lines=doc.splitTextToSize(text('Subject: '+subject+'\nSection: '+section+'\nDate: '+report.date+(schoolYear?'   S.Y. '+schoolYear:'')+(quarter?'   Quarter '+quarter:'')),182);
            doc.text(lines,14,30);
            return 34+lines.length*4.2;
        };
        const top=heading();
        doc.autoTable({head:[['No.','Student Name','Status']],body:report.rows.map(row=>[String(row.number),text(row.name)+(row.id?'\nID: '+text(row.id):''),text(row.label)]),
            startY:top,margin:{top,left:14,right:14,bottom:18},tableWidth:182,theme:'grid',showHead:'everyPage',rowPageBreak:'avoid',
            styles:{font:'SigmaSans',fontSize:9,cellPadding:3,textColor:0,overflow:'linebreak',valign:'middle',lineWidth:.15,lineColor:[220,226,221]},
            headStyles:{fillColor:[21,128,61],textColor:255,fontStyle:'bold'},alternateRowStyles:{fillColor:[247,250,248]},
            columnStyles:{0:{cellWidth:12,halign:'center'},1:{cellWidth:130},2:{cellWidth:40,halign:'center'}},
            willDrawPage:data=>{if(data.pageNumber>1)heading();}});
        }
        window.SigmaPdfLayout.footer(doc);
        const safe=value=>String(value).replace(/[^a-zA-Z0-9_-]/g,'_');
        await doc.save('Attendance_Record_'+safe(section)+'_'+safe(subject)+'_'+safe(date)+'.pdf',{returnPromise:true});
        return doc;
    };
    window.saveAttendancePdf = async function ({ section, subject, label, months }) {
        const doc = await window.SigmaPdfLayout.create({ orientation: 'landscape' });
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
                const header = select(head).map(window.SigmaPdfLayout.text);
                const body = report.rows.slice(5).filter(row => row.length).map(row => select(row).map(window.SigmaPdfLayout.text));
                const drawHeading = () => {
                    doc.setTextColor(0); doc.setFont('SigmaSans', 'bold'); doc.setFontSize(12);
                    doc.text('INTERFACE COMPUTER COLLEGE', 12, 14);
                    doc.setFontSize(10);
                    const lines = doc.splitTextToSize('ATTENDANCE REGISTER - ' + subject + ' (' + section + ')', 273);
                    doc.text(lines, 12, 21);
                    doc.setFont('SigmaSans', 'normal'); doc.setFontSize(9);
                    const details = doc.splitTextToSize('Period: ' + report.period + '\nQuarter: ' + (report.academic?.quarter || label) + '   Semester: ' + (report.academic?.semester || '') + '\nMonth: ' + report.month + '   Dates: ' + head[3 + offset] + ' to ' + head[2 + dateEnd] + '   Totals: full month', 273);
                    doc.text(details, 12, 24 + lines.length * 4);
                    return 27 + lines.length * 4 + details.length * 4;
                };
                const top = drawHeading();
                const styles = { 0: { cellWidth: 10 }, 1: { cellWidth: 48, halign: 'left' }, 2: { cellWidth: 23 } };
                for (let i = 3; i < header.length - 4; i++) styles[i] = { cellWidth: 128 / (dateEnd - offset) };
                for (let i = header.length - 4; i < header.length; i++) styles[i] = { cellWidth: 16 };
                doc.autoTable({ head: [header], body, startY: top, tableWidth: 273, margin: { top, left: 12, right: 12, bottom: 18 },
                    theme: 'grid', showHead: 'everyPage', rowPageBreak: 'avoid',
                    styles: { font: 'SigmaSans', fontSize: 8, cellPadding: 1.4, halign: 'center', valign: 'middle', textColor: 0, lineColor: [218, 226, 220], lineWidth: 0.15, overflow: 'linebreak' },
                    headStyles: { fillColor: [21, 128, 61], textColor: 255, fontStyle: 'bold' },
                    alternateRowStyles: { fillColor: [247, 250, 248] }, columnStyles: styles,
                    willDrawPage: data => { if (data.pageNumber > 1) drawHeading(); },
                    didParseCell: data => { if (data.section === 'body' && String(data.row.raw[1]).startsWith('All Total')) data.cell.styles.fontStyle = 'bold'; }
                });
            }
        }
        const count = doc.getNumberOfPages();
        for (let page = 1; page <= count; page++) {
            doc.setPage(page); doc.setFont('SigmaSans', 'normal'); doc.setFontSize(8); doc.setTextColor(80);
            doc.text('P - Present   A - Absent   L - Late   E - Excused', 12, 201);
            doc.text('Page ' + page + ' of ' + count, 285, 201, { align: 'right' });
        }
        const safe = value => String(value).replace(/[^a-zA-Z0-9_-]/g, '_');
        await doc.save('Attendance_' + safe(subject) + '_' + safe(section) + '_' + safe(label) + '.pdf', {returnPromise:true});
        return doc;
    };
})();
