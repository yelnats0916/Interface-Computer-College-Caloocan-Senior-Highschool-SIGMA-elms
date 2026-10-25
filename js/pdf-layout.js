(function () {
    'use strict';
    let ready;
    const script = src => new Promise((resolve, reject) => {
        const element = document.createElement('script');
        element.src = src; element.onload = resolve;
        element.onerror = () => { element.remove(); reject(new Error('Unable to load PDF tools. Please try again.')); };
        document.head.append(element);
    });
    async function resources() {
        if (!ready) ready = (async () => {
            if (!window.jspdf?.jsPDF) await script('js/vendor/jspdf.umd.min.js?v=3.0.3');
            if (!window.jspdf.jsPDF.API.autoTable) await script('js/vendor/jspdf.plugin.autotable.min.js?v=5.0.2');
            return Promise.all(['Regular', 'Bold'].map(async style => {
                const response = await fetch('js/vendor/fonts/NotoSans-' + style + '.ttf');
                if (!response.ok) throw new Error('Unable to load PDF fonts. Please try again.');
                const bytes = new Uint8Array(await response.arrayBuffer());
                let binary = '';
                for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
                return btoa(binary);
            }));
        })().catch(error => { ready = null; throw error; });
        return ready;
    }
    window.SigmaPdfLayout = {
        async create(options = {}) {
            const fonts = await resources();
            const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', putOnlyUsedFonts: true, ...options });
            fonts.forEach((data, index) => {
                const filename = 'NotoSans-' + (index ? 'Bold' : 'Regular') + '.ttf';
                doc.addFileToVFS(filename, data);
                doc.addFont(filename, 'SigmaSans', index ? 'bold' : 'normal');
            });
            doc.setFont('SigmaSans', 'normal'); doc.setLineHeightFactor(1.3);
            return doc;
        },
        text(value) {
            return String(value ?? '').replace(/\r\n?/g, '\n').replace(/\t/g, '    ').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u200b\ufeff]/g, '');
        },
        footer(doc) {
            for (let page = 1; page <= doc.getNumberOfPages(); page++) {
                doc.setPage(page); doc.setFont('SigmaSans', 'normal'); doc.setFontSize(8); doc.setTextColor(80);
                doc.text(page + ' of ' + doc.getNumberOfPages(), doc.internal.pageSize.getWidth() - 14, doc.internal.pageSize.getHeight() - 7, { align: 'right' });
            }
        }
    };
})();
