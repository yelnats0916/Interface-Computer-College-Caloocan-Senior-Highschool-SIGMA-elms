/* Render a small, safe Markdown subset for SIGMA replies only. Never parse raw HTML. */
(function () {
    'use strict';
    const make = (tag, text) => { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; return node; };
    function safeUrl(value) {
        try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : null; } catch (_) { return null; }
    }
    function inline(text, host, depth = 0) {
        if (depth > 8) { host.append(document.createTextNode(text)); return; }
        const token = /(`[^`\n]+`|\*\*[^*\n]+\*\*|__[^_\n]+__|\*[^*\n]+\*|\[[^\]\n]+\]\([^\s)]+\)|https?:\/\/[^\s<>]+)/g;
        let end = 0;
        for (const match of text.matchAll(token)) {
            host.append(document.createTextNode(text.slice(end, match.index)));
            const value = match[0];
            let node;
            if (value.startsWith('`')) node = make('code', value.slice(1,-1));
            else if (value.startsWith('**') || value.startsWith('__')) { node = make('strong'); inline(value.slice(2,-2), node, depth+1); }
            else if (value.startsWith('*')) { node = make('em'); inline(value.slice(1,-1), node, depth+1); }
            else {
                const link = /^\[([^\]]+)\]\((.+)\)$/.exec(value);
                const address = link ? link[2] : value.replace(/[.,!?;:]+$/, '');
                const url = safeUrl(address);
                node = make(url ? 'a' : 'span', link ? link[1] : address);
                if (url) { node.href = url; node.target = '_blank'; node.rel = 'noopener noreferrer'; }
                if (!link && address.length < value.length) { const wrapper = make('span'); wrapper.append(node, document.createTextNode(value.slice(address.length))); node = wrapper; }
            }
            host.append(node); end = match.index + value.length;
        }
        host.append(document.createTextNode(text.slice(end)));
    }
    function render(content, text) {
        const raw = String(text ?? '');
        content._sigmaRawText = raw;
        content.replaceChildren();
        const assistant = content.classList.contains('sigma-ai-message__bubble--assistant') || !!content.closest('.sigma-ai-message--assistant');
        if (!assistant || content.closest('.sigma-ai-message--user')) { content.textContent = raw; return; }
        content.classList.add('sigma-formatted-message');
        const lines = raw.replace(/\r\n?/g, '\n').split('\n');
        const cellParts = line => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(value => value.trim());
        const separator = line => /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
        for (let i=0; i<lines.length;) {
            if (!lines[i].trim()) { i++; continue; }
            if (/^\s*```/.test(lines[i])) {
                const code=[]; i++;
                while(i<lines.length && !/^\s*```/.test(lines[i])) code.push(lines[i++]);
                if(i<lines.length) i++;
                const pre=make('pre'); pre.append(make('code',code.join('\n'))); content.append(pre); continue;
            }
            if (i+1<lines.length && lines[i].includes('|') && separator(lines[i+1])) {
                const wrap=make('div'); wrap.className='sigma-message-table-wrap';
                const table=make('table'), head=make('thead'), row=make('tr');
                cellParts(lines[i]).forEach(value=>{const cell=make('th');inline(value,cell);row.append(cell);}); head.append(row);table.append(head); i+=2;
                const body=make('tbody');
                while(i<lines.length && lines[i].trim() && lines[i].includes('|')) { const tr=make('tr');cellParts(lines[i++]).forEach(value=>{const td=make('td');inline(value,td);tr.append(td);});body.append(tr); }
                table.append(body);wrap.append(table);content.append(wrap);continue;
            }
            const heading=/^\s*#{1,6}\s+(.+)/.exec(lines[i]);
            if(heading){const h=make('div');h.className='sigma-message-heading';inline(heading[1],h);content.append(h);i++;continue;}
            const list=/^\s*(?:[-+*]|\d+[.)])\s+/.exec(lines[i]);
            if(list){const ordered=/^\s*\d/.test(lines[i]);const ul=make(ordered?'ol':'ul');while(i<lines.length && /^\s*(?:[-+*]|\d+[.)])\s+/.test(lines[i])){const li=make('li');inline(lines[i++].replace(/^\s*(?:[-+*]|\d+[.)])\s+/,''),li);ul.append(li);}content.append(ul);continue;}
            if(/^\s*(?:---+|\*\*\*+)\s*$/.test(lines[i])){content.append(make('hr'));i++;continue;}
            const p=make('div'); p.className='sigma-message-paragraph'; inline(lines[i++],p);content.append(p);
        }
    }
    function highlight(content, term) {
        const raw=content._sigmaRawText ?? content.dataset.originalText ?? content.textContent;
        render(content, raw);
        if(!term)return;
        const walker=document.createTreeWalker(content,NodeFilter.SHOW_TEXT),nodes=[];
        while(walker.nextNode()) nodes.push(walker.currentNode);
        const needle=term.toLowerCase();
        nodes.forEach(node=>{const value=node.nodeValue,lower=value.toLowerCase();let end=0,index;const fragment=document.createDocumentFragment();while((index=lower.indexOf(needle,end))!==-1){fragment.append(document.createTextNode(value.slice(end,index)),make('mark',value.slice(index,index+term.length)));end=index+term.length;}if(end){fragment.append(document.createTextNode(value.slice(end)));node.replaceWith(fragment);}});
    }
    window.SigmaMessageFormat={render,highlight,raw:content=>content?._sigmaRawText ?? content?.textContent ?? ''};
})();
