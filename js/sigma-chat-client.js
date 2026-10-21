(function () {
    'use strict';
    let busy = false;
    window.getSigmaLessonContext = function () {
        const host=document.getElementById('section-topic-content');
        const state=window.currentTopicState||{};
        if(!host||host.classList.contains('hidden')||!state.subjectId)return null;
        const data=window.getTopicData?.(state.subjectId);
        if(!data)return null;
        const quarter=String(window.currentSelectedTopicQuarter||'q1').replace(/^q?/,'q');
        const topics=data[quarter+'Topics']||data.q1Topics||data.topics||[];
        const index=Number(state.topicIdx)||0;
        const topic=topics[index];
        if(!topic)return null;
        const student=/student/i.test(location.pathname);
        const section=state.selectedSection||'';
        const status=student?window.getStudentTopicReleaseStatus?.(state.subjectId,topic,index,section):null;
        if(status&&(status.isLocked||status.isHidden||status.isUnreleased))return null;
        const plain=value=>{
            const node=document.createElement('div');node.innerHTML=String(value||'');
            return (node.textContent||'').replace(/\s+/g,' ').trim();
        };
        const sources=[];
        for(const key of ['lessons','videos','materials','resources']){
            for(const [materialIndex,item] of (Array.isArray(topic[key])?topic[key]:[]).entries()){
                if(!item||typeof item!=='object')continue;
                const release=student?window.getStudentLearningMaterialReleaseStatus?.(state.subjectId,item,index,materialIndex,key==='videos'?'video':'lesson',section):null;
                if(release&&(release.isLocked||release.isHidden||release.isUnreleased))continue;
                sources.push({title:plain(item.title||item.name),text:plain(item.description||item.content||item.text).slice(0,1200)});
            }
        }
        // No assessment answers, student records, credentials, or unparsed file contents.
        const context={subject:plain(data.title||data.text||data.name||state.subjectId),topic:plain(topic.title||topic.name),description:plain(topic.description||topic.overview).slice(0,1600),sources:sources.slice(0,4)};
        return context;
    };
    window.sendSigmaChatMessage = async function (suggestedText) {
        const panel = document.getElementById('sigmaAiPanel');
        const messages = document.getElementById('sigmaAiMessages');
        const input = document.getElementById('sigmaAiInput');
        const send = document.getElementById('sigmaAiSendBtn');
        if (busy || !panel || !messages || !input || typeof window.renderSigmaChatMessage !== 'function') return;
        const text = String(typeof suggestedText === 'string' ? suggestedText : input.value).trim();
        const portalRole=/admin/i.test(location.pathname)?'admin':/teacher/i.test(location.pathname)?'teacher':'student';
        if (!text) return;
        let notice = document.getElementById('sigmaChatError');
        if (!notice) {
            notice = document.createElement('p');
            notice.id = 'sigmaChatError';
            notice.className = 'sigma-conversation-notice';
            notice.setAttribute('role', 'alert');
            messages.before(notice);
        }
        const showError = message => { notice.textContent = message; notice.hidden = false; };
        if (new TextEncoder().encode(text).length > 4000) { showError('Keep your message within 4,000 bytes.'); return; }
        notice.hidden = true;
        const history = [];
        let bytes = 0;
        for (const el of Array.from(messages.querySelectorAll('.sigma-ai-message')).reverse()) {
            if (el.dataset.sigmaGreeting === 'true') continue;
            const content = el.querySelector('.sigma-ai-message__bubble')?.textContent || '';
            const size = new TextEncoder().encode(content).length;
            if (history.length >= 12 || bytes + size > 8000 || size > 4000) break;
            bytes += size;
            history.unshift({ role: el.classList.contains('sigma-ai-message--user') ? 'user' : 'assistant', text: content });
        }
        const stamp = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date());
        const userTime = new Date().toISOString();
        const userMessage = window.renderSigmaChatMessage({ role: 'user', text, stamp });
        messages.append(userMessage);
        input.value = '';
        input.style.height = 'auto';
        busy = true;
        panel.setAttribute('aria-busy', 'true');
        const controls = [input, send, ...panel.querySelectorAll('.sigma-conversation-actions button')].filter(Boolean);
        const disabledStates = controls.map(control => control.disabled);
        controls.forEach(control => { control.disabled = true; });
        send?.classList.add('is-loading');
        messages.scrollTop = messages.scrollHeight;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 100000);
        try {
            const apiUrl = location.port && !['80', '443'].includes(location.port)
                ? 'http://localhost/sigma-elms/php/api/sigma_chat.php'
                : new URL(location.pathname.includes('/php/') ? 'api/sigma_chat.php' : 'php/api/sigma_chat.php', location.href).href;
            const response = await window.SigmaDatabase.fetch(apiUrl, { method: 'POST', credentials: 'include', signal: controller.signal,
                headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text, history, portalRole, lessonContext:window.getSigmaLessonContext(), language:window.getSigmaAiLanguage?.('bot')||'auto' }) });
            const result = await response.json();
            if (!response.ok || !result.success || typeof result.text !== 'string' || !result.text.trim()) throw new Error(result.error || 'SIGMA could not get an answer. Try again.');
            if (!/^CHAT-\d{4}-\d{4,}$/.test(String(result.generationId || ''))) throw new Error('SIGMA replied without a generation ID. Try again.');
            const answer = window.renderSigmaChatMessage({ role: 'assistant', text: result.text, stamp });
            answer.dataset.sigmaModel = result.model;
            answer.dataset.generationId = result.generationId;
            if (messages.contains(userMessage)) messages.append(answer);
            try {
                const account = JSON.parse(sessionStorage.getItem('sigma-authenticated-user') || '{}');
                if (account.uid || account.id) window.SigmaAiLogs?.record({ userId: String(account.uid || account.id), feature: 'sigmabot',
                    prompt: text, response: result.text, model: result.model, provider: result.provider,
                    keyId: result.keyId, keyLabel: result.keyLabel, generationId: result.generationId, status: result.status, timestamp: new Date().toISOString(),
                    messages: [...history, { role: 'user', text, timestamp: userTime }, { role: 'assistant', text: result.text, model: result.model, timestamp: new Date().toISOString() }] });
            } catch (error) { console.warn('SIGMA reply received, but its audit log could not be saved.', error); }
            messages.scrollTop = messages.scrollHeight;
        } catch (error) {
            showError(error.name === 'AbortError' ? 'SIGMA timed out. Please try again.' : error.message || 'Unable to connect to SIGMA.');
            if (!input.value) input.value = text;
        } finally {
            clearTimeout(timer);
            busy = false;
            panel.setAttribute('aria-busy', 'false');
            controls.forEach((control, index) => { control.disabled = disabledStates[index]; });
            send?.classList.remove('is-loading');
        }
    };
})();
