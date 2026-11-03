(function () {
    'use strict';

    const categories = ['descriptive', 'predictive', 'prescriptive'];
    const label = value => value.charAt(0).toUpperCase() + value.slice(1);
    const day = value => {
        if (value === null || value === undefined || value === '') return '';
        const date = new Date(value);
        return Number.isFinite(+date) ? new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit'
        }).format(date) : '';
    };
    const matchesCategory = (card, category) => (card.analyses || []).some(
        analysis => String(analysis.category || '').toLowerCase().includes(category)
    );

    async function download(filter) {
        if (window.canAccessAdminSection?.('reports-ai-view') === false) {
            throw new Error('You do not have access to AI Analytics reports.');
        }
        if (!window.SigmaAiDatabase?.loadInsightReport || !window.SigmaPdfLayout?.create) {
            throw new Error('PDF export is not ready. Please reload the page and try again.');
        }
        const result = await window.SigmaAiDatabase.loadInsightReport();
        if (result?.success === false || !Array.isArray(result?.users)) {
            throw new Error(result?.error || 'Unable to load saved analytics. Please try again.');
        }
        const analyticsType = categories.includes(filter.analyticsType) ? filter.analyticsType : 'all';
        const selectedCategories = analyticsType === 'all' ? categories : [analyticsType];
        const rows = result.users.flatMap(user => (user.cards || []).map(card => ({ user, card,
            date: day(card.createdAt || card.timestamp || user.lastAnalyzed)
        }))).filter(row => (analyticsType === 'all' || matchesCategory(row.card, analyticsType)) &&
            (!filter.from || (row.date && row.date >= filter.from)) &&
            (!filter.to || (row.date && row.date <= filter.to)));
        const doc = await window.SigmaPdfLayout.create({ orientation: 'portrait' });
        const clean = window.SigmaPdfLayout.text;
        const tableStyles = {
            theme: 'grid', showHead: 'everyPage', rowPageBreak: 'avoid',
            margin: { top: 18, left: 14, right: 14, bottom: 18 },
            styles: { font: 'SigmaSans', fontSize: 8, cellPadding: 2.5, overflow: 'linebreak', textColor: 0 },
            headStyles: { fillColor: [21, 128, 61], textColor: 255, fontStyle: 'bold' }
        };
        doc.setProperties({ title: 'AI Analytics Report', creator: 'SIGMA ELMS' });
        doc.setFont('SigmaSans', 'bold'); doc.setFontSize(16);
        doc.text('Interface Computer College', 14, 18);
        doc.setFontSize(13); doc.text('AI Analytics Report', 14, 26);
        doc.setFont('SigmaSans', 'normal'); doc.setFontSize(9);
        doc.text('Generated: ' + new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }) + ' (Asia/Manila)', 14, 34);
        doc.text(`Date range: ${filter.from || 'All dates'}${filter.to ? ' to ' + filter.to : ''}`, 14, 40);
        doc.text(`Analytics type: ${analyticsType === 'all' ? 'All types' : label(analyticsType)}`, 14, 46);
        doc.text(`Saved insight cards: ${rows.length}`, 14, 52);
        doc.autoTable({ ...tableStyles, startY: 58,
            head: [['Analytics type', 'Cards', 'Share', 'Students', 'Teachers']],
            body: selectedCategories.map(category => {
                const matching = rows.filter(row => matchesCategory(row.card, category));
                return [label(category), matching.length, (rows.length ? Math.round(matching.length / rows.length * 100) : 0) + '%',
                    ...['student', 'teacher'].map(role => matching.filter(row => row.user.role === role).length)];
            })
        });
        let y = doc.lastAutoTable.finalY + 8;
        doc.setFontSize(8);
        const note = doc.splitTextToSize(analyticsType === 'all'
            ? 'Counts use the same saved insight cards as the AI Analytics overview. A card may belong to more than one analytics type.'
            : 'This report includes only ' + label(analyticsType) + ' analyses from matching saved insight cards.', 182);
        doc.text(note, 14, y); y += note.length * 4 + 8;
        doc.setFont('SigmaSans', 'bold'); doc.setFontSize(11);
        doc.text('Saved Insights', 14, y);
        doc.autoTable({ ...tableStyles, startY: y + 5,
            head: [['User / Role', 'Insight / Analysis', 'Date (Manila)']],
            columnStyles: { 0: { cellWidth: 43 }, 1: { cellWidth: 111 }, 2: { cellWidth: 28 } },
            body: rows.length ? rows.map(({ user, card, date }) => [
                clean([user.name || 'Unnamed user', 'ID: ' + user.id, label(user.role || 'Unknown')].join('\n')),
                clean([card.title || 'AI Insight', ...(card.analyses || []).filter(analysis => analyticsType === 'all' || String(analysis.category || '').toLowerCase().includes(analyticsType)).map(analysis =>
                    [analysis.category, analysis.actionLabel, analysis.text].filter(Boolean).join(': '))].join('\n\n')),
                date || 'Not recorded'
            ]) : [[{ content: 'No saved insights in this date range.', colSpan: 3 }]]
        });
        window.SigmaPdfLayout.footer(doc);
        await doc.save('SIGMA-AI-Analytics-' + analyticsType + '-' + day(Date.now()) + '.pdf', { returnPromise: true });
    }

    window.openAiAnalyticsPdfExport = function () {
        const to = day(Date.now());
        const [year, month, date] = to.split('-').map(Number);
        const start = new Date(Date.UTC(year, month - 2, 1));
        const lastDay = new Date(Date.UTC(year, month - 1, 0)).getUTCDate();
        start.setUTCDate(Math.min(date, lastDay));
        const from = start.toISOString().slice(0, 10);
        return window.openSigmaDateRangeExport({ title: 'Export AI Analytics', from, to, onDownload: download,
            selection: { name: 'analyticsType', label: 'Analytics Type', defaultValue: 'all', options: [
                { value: 'all', label: 'All analytics types' },
                { value: 'descriptive', label: 'Descriptive Analytics' },
                { value: 'predictive', label: 'Predictive Analytics' },
                { value: 'prescriptive', label: 'Prescriptive Analytics' }
            ] }
        });
    };
})();
