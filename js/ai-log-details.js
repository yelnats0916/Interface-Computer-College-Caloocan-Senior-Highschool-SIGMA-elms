(function () {
    'use strict';
    const host = document.getElementById('audit-ai-view');
    const table = host?.querySelector('table[aria-label="AI interaction logs"]');
    if (!table) return;
    const container = table.parentElement;
    const key = window.USER_STORAGE_KEY || 'sigma-admin-users';
    const features = [
        ['sigmabot', 'Sigma Bot', 'Ask about a learning topic'],
        ['analytics', 'Analytics Insights', 'Review learning performance trends'],
        ['quiz', 'Assessment Generation', 'Generate a practice assessment'],
        ['submission_evaluation', 'Submission Evaluation', 'Evaluate a sample submission'],
        ['submission_feedback', 'Submission Feedback', 'Review submission feedback'],
        ['grade_insights', 'Grade Insights', 'Review grade progress']
    ];
    let users = [], selectedId = null, category = 'all', query = '', searchDraft = '', opener = null, returnScroll = null;
    let suppliedRecords = [];
    let interactionReturn = null;
    let conversationObserver = null;
    let activeRecord = null, conversationState = null;
    const refreshKey = 'sigma-ai-view:' + location.pathname;
    let overviewLogs = [];
    const node = (tag, text, className) => {
        const el = document.createElement(tag);
        if (text !== undefined) el.textContent = text;
        if (className) el.className = className;
        return el;
    };
    const sanitizeSearch = value => value.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 100);
    function searchField(placeholder, label, value = '', onChange = () => {}) {
        const input = node('input', undefined, 'sigma-input sigma-search-input');
        input.type = 'search'; input.placeholder = placeholder; input.setAttribute('aria-label', label);
        input.value = value; input.maxLength = 100; input.autocomplete = 'off';
        const wrap = node('div', undefined, 'ai-log-search-input-wrap');
        const clear = node('button', undefined, 'ai-log-search-clear');
        clear.type = 'button'; clear.title = 'Clear search'; clear.setAttribute('aria-label', 'Clear search');
        clear.append(node('i', undefined, 'fa-solid fa-xmark')); clear.hidden = !input.value;
        input.addEventListener('input', () => {
            input.value = sanitizeSearch(input.value); clear.hidden = !input.value; onChange(input.value);
        });
        clear.addEventListener('click', () => {
            input.value = ''; clear.hidden = true; onChange(''); input.focus({ preventScroll: true });
        });
        wrap.append(input, clear);
        return { input, wrap };
    }
    const idOf = user => String(user.uid || user.id || '');
    const nameOf = user => [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ')
        || user.fullName || user.name || user.email || idOf(user);
    const roleOf = user => window.normalizeUserRole?.(user.role || user.type) || user.role || user.type || 'Unknown';
    function categories(user) {
        const role = String(roleOf(user)).toLowerCase();
        if (role.includes('student')) return features.filter(([id]) => ['sigmabot', 'analytics', 'submission_feedback', 'grade_insights'].includes(id));
        if (role.includes('teacher') || role.includes('admin')) return features;
        return features.filter(([id]) => id === 'sigmabot');
    }
    function records(user) {
        return suppliedRecords.filter(log => log.userId === idOf(user));
    }
    function avatar(user) {
        const wrap = node('span', undefined, 'ai-log-avatar');
        const src = window.resolveUserAvatar?.(user);
        const fallback = () => {
            const icon = node('i', undefined, 'fa-solid fa-user');
            icon.setAttribute('aria-hidden', 'true');
            wrap.replaceChildren(icon);
        };
        if (src && /^(https?:|data:image\/|blob:|\.?\.?\/|image\/|uploads\/)/i.test(src)) {
            const img = node('img');
            img.src = src;
            img.alt = '';
            img.addEventListener('error', fallback, { once: true });
            wrap.append(img);
        } else fallback();
        return wrap;
    }
    function userButton(user) {
        const button = node('button', undefined, 'ai-log-user-button');
        button.type = 'button';
        button.dataset.userId = idOf(user);
        button.setAttribute('aria-label', 'View AI usage for ' + nameOf(user));
        const identity = node('span', undefined, 'ai-log-user-identity');
        const rawUserId = String(idOf(user) || '').replace(/^ID:\s*/i, '').trim();
        identity.append(node('span', nameOf(user), 'sigma-table-primary-text'), node('span', rawUserId ? 'ID: ' + rawUserId : '', 'ai-log-user-id text-black-fade'));
        button.append(avatar(user), identity);
        button.addEventListener('click', () => open(user, button));
        return button;
    }
    function statusCell(record) {
        const td = node('td');
        td.append(node('span', record.status, 'ai-log-status ai-log-status--' + record.status.toLowerCase().replaceAll(' ', '-')));
        return td;
    }
    function formatTimestamp(value) {
        if (!value) return 'Not recorded';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'Not recorded';
        return date.toLocaleString('en-US', {
            timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
        });
    }
    function dateCell(record) {
        const td = node('td');
        const time = node('time', formatTimestamp(record.timestamp), 'ai-log-timestamp');
        time.dateTime = record.timestamp.toISOString();
        td.append(time);
        return td;
    }
    function interactionCell(record) {
        const td = node('td');
        const previewText = value => String(value || '').replace(/\[([^\]\n]+)\]\([^\s()]+\)/g, '$1').replace(/\*\*([^*\n]+)\*\*/g, '$1');
        const button = node('button', previewText(record.prompt) || 'View interaction', 'ai-log-interaction-button ai-log-preview-title');
        button.type = 'button';
        button.setAttribute('aria-label', 'View interaction: ' + (record.prompt || record.label));
        button.addEventListener('click', () => openInteraction(record, button));
        td.append(button);
        if (record.feature !== 'sigmabot') td.append(node('span', 'Response: ' + previewText(record.response), 'text-black-fade ai-log-preview-response'));
        return td;
    }
    const detail = node('section', undefined, 'ai-log-detail');
    detail.id = 'ai-user-details-panel';
    detail.hidden = true;
    container.after(detail);
    const interaction = node('section', undefined, 'ai-log-interaction-detail');
    interaction.id = 'ai-interaction-details-panel';
    interaction.hidden = true;
    detail.after(interaction);
    const overviewFooter = node('div', undefined, 'ai-log-overview-footer');
    overviewFooter.setAttribute('aria-hidden', 'true');
    container.after(overviewFooter);
    function paintOverviewFooter() {
        overviewFooter.hidden = true;
        window.SigmaLogPagination?.refresh(table);
    }
    function openInteraction(record, button) {
        const user = users.find(item => idOf(item) === record.userId);
        if (!user) return;
        conversationObserver?.disconnect();
        activeRecord = record;
        window.pushModalHistoryState?.('ai-interaction-details-panel', () => openInteraction(record, button));
        const scroll = [];
        for (let el = container.parentElement; el; el = el.parentElement) scroll.push([el, el.scrollLeft, el.scrollTop]);
        interactionReturn = { button, scroll, fromDetail: !detail.hidden };
        interaction.dataset.userId = record.userId;
        host.dataset.aiUserDetailOpen = 'true';
        container.hidden = detail.hidden = true;
        paintOverviewFooter();
        interaction.hidden = false;
        interaction.replaceChildren();
        const heading = node('h2', record.feature === 'sigmabot' ? 'SIGMA Bot Conversation' : 'AI Interaction Details', 'ai-log-detail-title');
        heading.tabIndex = -1;
        const identity = node('div', undefined, 'ai-log-detail-identity');
        const row = node('div', undefined, 'ai-log-detail-name-row');
        const text = node('div', undefined, 'ai-log-detail-identity-text');
        const nameLink = node('button', nameOf(user), 'ai-log-detail-name ai-log-account-link');
        nameLink.type = 'button';
        nameLink.setAttribute('aria-label', 'View all AI logs for ' + nameOf(user));
        nameLink.addEventListener('click', () => {
            conversationObserver?.disconnect();
            interaction.hidden = true;
            open(user, button);
            window.SigmaLogPagination?.reset(detail.querySelector('table'));
        });
        text.append(nameLink, node('p', roleOf(user) + ' | Account ID: ' + idOf(user), 'text-black-fade'));
        row.append(avatar(user), text);
        identity.append(row);
        const metadata = node('dl', undefined, 'ai-log-interaction-metadata');
        [['AI Feature', record.label], ['Model', record.model], ['Status', record.status], ['Timestamp', dateCell(record).textContent]].forEach(([label, value]) => {
            const item = node('div');
            item.append(node('dt', label), node('dd', value));
            if (label === 'Status') item.lastElementChild.className = 'ai-log-status ai-log-status--' + String(value).toLowerCase().replaceAll(' ', '-');
            metadata.append(item);
        });
        interaction.append(heading, identity, metadata);
        if (!['sigmabot', 'analytics', 'submission_feedback', 'grade_insights'].includes(record.feature)) {
            const deleteLog = node('button', undefined, 'sigma-btn sigma-btn-white sigma-btn-sm');
            deleteLog.type = 'button'; deleteLog.append(node('i', undefined, 'fa-solid fa-trash-can'), node('span', 'Delete Log'));
            const notice = node('p'); notice.setAttribute('role', 'status');
            deleteLog.onclick = async () => {
                if (!window.confirm('Delete this log from the active list? The conversation or assessment itself will not be deleted. You can restore this log from Record Recovery.')) return;
                deleteLog.disabled = true;
                try { await window.SigmaAiLogs.deleteLog(record.id); if (!interaction.hidden) closeInteraction(); else refresh(); }
                catch (error) { notice.textContent = error.message; deleteLog.disabled = false; }
            };
            const actions = node('div', undefined, 'ai-log-detail-actions');
            actions.append(deleteLog, notice);
            interaction.append(actions);
        }
        const transcript = node('div', undefined, record.feature === 'sigmabot' ? 'ai-log-transcript' : 'ai-log-request-response');
        transcript.setAttribute('aria-label', record.feature === 'sigmabot' ? 'Read-only conversation' : 'Recorded request and response');
        let messages = record.feature === 'sigmabot' && record.messages?.length ? record.messages : [
            { role: 'user', text: record.prompt }, { role: 'assistant', text: record.response }
        ];
        if (record.feature === 'sigmabot') {
            const start = messages.findIndex(message => message.role === 'user');
            messages = start >= 0 ? messages.slice(start) : [{ role: 'user', text: record.prompt }, ...messages];
        }
        messages.forEach(message => {
            if (record.feature === 'sigmabot') {
                return;
            }
            const block = node('article', undefined, 'ai-log-message ai-log-message--' + message.role);
            block.append(node('h3', message.role === 'user' ? (record.feature === 'sigmabot' ? nameOf(user) : 'Request') : (record.feature === 'sigmabot' ? 'SIGMA' : 'Response')),
                node('p', message.text || 'Not recorded'));
            if (message.timestamp) block.append(node('p', formatTimestamp(message.timestamp), 'text-black-fade ai-log-message-time'));
            transcript.append(block);
        });
        if (record.feature === 'sigmabot') {
            const match = messages.findIndex(message => message.role === 'user' && message.text === record.prompt);
            const start = match >= 0 ? match : 0;
            const request = messages[start];
            const nextUser = messages.findIndex((message, index) => index > start && message.role === 'user');
            const reply = messages.slice(start + 1, nextUser < 0 ? undefined : nextUser).find(message => message.role === 'assistant');
            const exchange = [request, reply || { role: 'assistant', text: record.response, timestamp: '' }];
            paintMessageTable(record, user, exchange, transcript, messages);
        }
        else if (['analytics', 'grade_insights'].includes(record.feature)) paintInsightTable(record);
        else if (record.feature === 'submission_feedback') {
            const { frame, body } = createLogDetailTable(['Request', 'Response', 'Timestamp', 'Action'], 'Submission feedback request and response', 'ai-log-feedback-table');
            const row = node('tr');
            const response = node('td', undefined, 'ai-log-message-content');
            appendInsightText(response, record.response || 'Not recorded');
            const { action, notice } = createLogRecordActions(record, 'Feedback actions');
            row.append(node('td', record.prompt || 'Not recorded'), response, dateCell(record), action);
            body.append(row);
            interaction.append(notice, frame);
        }
        else interaction.append(transcript);
        interaction.scrollIntoView({ block: 'start' });
        heading.focus({ preventScroll: true });
    }
    function appendInsightText(container, text) {
        const appendBold = (parent, value) => {
            for (const part of value.split(/(\*\*[^*\n]+\*\*)/g)) {
                parent.append(part.startsWith('**') && part.endsWith('**')
                    ? node('strong', part.slice(2, -2)) : document.createTextNode(part));
            }
        };
        for (const part of String(text).split(/(\[[^\]\n]+\]\([^\s()]+\))/g)) {
            const match = /^\[([^\]\n]+)\]\(([^\s()]+)\)$/.exec(part);
            if (!match) { appendBold(container, part); continue; }
            let target;
            try { target = new URL(match[2], location.href); } catch (_) {}
            const directory = location.pathname.slice(0, location.pathname.lastIndexOf('/') + 1);
            if (target && /^https?:$/.test(target.protocol) && target.origin === location.origin
                && !target.username && !target.password && target.pathname.startsWith(directory)
                && /\.html$/.test(target.pathname) && !target.search) {
                const link = node('a', undefined, 'sigma-insight-link');
                const route = target.hash.slice(1);
                const isTopic = /^topic-content:/.test(route);
                const isAdminTarget = /\/admin\.html$/.test(target.pathname);
                const isPortalTarget = /\/(?:student|teacher|admin)\.html$/.test(target.pathname);
                const mappedRoute = /^(?:grades|gradebooks)(?::|$)/.test(route) ? 'nav-gradebooks'
                    : /^(?:my-classes|classes|sections|school-sections)$/.test(route) ? 'nav-school-sections'
                    : route === 'resources' ? 'nav-resources'
                    : route === 'home' ? 'nav-dashboard' : '';
                if (!isPortalTarget || (!isTopic && !isAdminTarget && !mappedRoute)) {
                    appendBold(container, match[1]);
                    continue;
                }
                link.href = location.pathname + '#' + (mappedRoute || route);
                if (mappedRoute) link.addEventListener('click', event => {
                    event.preventDefault();
                    window.switchTab?.(mappedRoute);
                });
                if (isTopic) link.addEventListener('click', event => {
                    event.preventDefault();
                    const parts = route.split(':');
                    const user = users.find(item => idOf(item) === selectedId);
                    const section = user?.section || user?.sectionName || '';
                    const submission = parts.includes('submission');
                    window.openTopicContent?.(decodeURIComponent(parts[1] || ''), Number(parts[2]) || 0,
                        parts[3] || 'assessments', parts[4] && parts[4] !== 'null' ? Number(parts[4]) : null, true,
                        { selectedSection: section, selectedStudent: user ? nameOf(user) : 'All',
                          viewSubmission: submission, _studentViewSubmissionMode: submission, _sharedViewSubmissionMode: submission });
                });
                appendBold(link, match[1]);
                container.append(link);
            } else appendBold(container, match[1]);
        }
    }
    function createLogDetailTable(columns, label, className = '') {
        const frame = node('div', undefined, 'sigma-table-container sigma-table-container--unframed ai-log-message-frame');
        const table = node('table', undefined, 'sigma-table sigma-audit-table ai-log-message-table ' + className);
        table.setAttribute('aria-label', label);
        const head = node('thead'), header = node('tr'), body = node('tbody');
        columns.forEach(column => header.append(node('th', column)));
        head.append(header); table.append(head, body); frame.append(table);
        return { frame, table, body };
    }
    function createLogRecordActions(record, label) {
        const action = node('td');
        const actions = node('div', undefined, 'ai-log-insight-actions');
        const toggle = node('button', undefined, 'ai-log-message-more');
        toggle.type = 'button'; toggle.title = label;
        toggle.setAttribute('aria-label', label); toggle.setAttribute('aria-expanded', 'false');
        toggle.append(node('i', undefined, 'fa-solid fa-ellipsis'));
        const menu = node('div', undefined, 'ai-log-message-menu'); menu.hidden = true;
        const notice = node('div', undefined, 'ai-log-message-notice'); notice.setAttribute('role', 'status');
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const show = menu.hidden;
            window.closeAllTableActionDropdowns?.(menu);
            closeMessageMenus();
            menu.hidden = !show;
            toggle.classList.toggle('active', show);
            toggle.setAttribute('aria-expanded', String(show));
            if (show) window.positionActionDropdown?.(menu, toggle);
            else window.resetActionDropdownPosition?.(menu);
        });
        const deleteLog = node('button'); deleteLog.type = 'button';
        deleteLog.append(node('i', undefined, 'fa-solid fa-trash-can'), node('span', 'Delete Log'));
        deleteLog.addEventListener('click', async () => {
            if (!window.confirm('Delete this AI log from the active list? Its user content will not be changed. The log can be restored from Record Recovery.')) return;
            deleteLog.disabled = true;
            try { await window.SigmaAiLogs.deleteLog(record.id); if (!interaction.hidden) closeInteraction(); else refresh(); }
            catch (error) { deleteLog.disabled = false; notice.textContent = error.message; }
        });
        menu.append(deleteLog); actions.append(toggle, menu); action.append(actions);
        const remove = node('button'); remove.type = 'button';
        remove.append(node('i', undefined, 'fa-solid fa-eye-slash'), node('span', 'Remove Card'));
        remove.disabled = !record.source || record.cardRemoved;
        if (remove.disabled) remove.title = 'This log is not linked to a user insight card';
        if (record.cardRemoved) notice.textContent = 'Card removed by ' + (record.cardRemovedBy || 'an administrator') + (record.cardRemovedAt ? ' on ' + formatTimestamp(record.cardRemovedAt + 'Z') : '') + '. AI log retained.';
        remove.addEventListener('click', async () => {
            if (!window.confirm('Remove this card from the user dashboard? Its saved text and AI log will be retained.')) return;
            remove.disabled = true;
            try {
                await window.SigmaAiLogs.deleteInsight(record.id);
                closeMessageMenus(); notice.textContent = 'Card removed. The AI log is retained.';
            } catch (error) { remove.disabled = false; notice.textContent = error.message; }
        });
        if (record.feature === 'analytics') menu.prepend(remove);
        return { action, menu, notice };
    }
    function paintInsightTable(record) {
        const { frame, body } = createLogDetailTable(['Source', 'Insight Message', 'Timestamp', 'Action'], record.feature === 'grade_insights' ? 'Grade insight message' : 'Analytics insight message', 'ai-log-insight-table');
        const row = node('tr');
        const source = node('td');
        if (record.evidenceSources?.length) {
            const list = node('ul', undefined, 'ai-log-insight-sources');
            for (const item of record.evidenceSources) {
                const entry = node('li', item.label);
                entry.title = item.records.map(record => [record.title, record.subjectId, record.sectionId].filter(Boolean).join(' - ')).join('\n');
                list.append(entry);
            }
            source.append(list);
        } else source.textContent = 'Not recorded';
        const content = node('td', undefined, 'ai-log-message-content');
        appendInsightText(content, record.response || 'Not recorded');
        const { action, menu, notice } = createLogRecordActions(record, 'Insight actions');
        row.append(source, content, dateCell(record), action); body.append(row);
        interaction.append(notice, frame);
    }
    function paintMessageTable(record, user, messages, transcript, conversation) {
        const { frame, table: list, body } = createLogDetailTable(['Sender', 'Message', 'Timestamp', 'Action'], 'Conversation messages');
        const bubblePanel = node('section', undefined, 'ai-log-bubble-panel');
        bubblePanel.id = 'ai-conversation-bubbles-panel';
        bubblePanel.hidden = true;
        const search = node('form', undefined, 'ai-log-search ai-log-conversation-search');
        search.setAttribute('role', 'search');
        const { input, wrap } = searchField('Search messages', 'Search messages');
        const submit = node('button', undefined, 'sigma-btn sigma-btn-primary ai-log-conversation-search-button');
        submit.type = 'submit'; submit.title = 'Search messages'; submit.setAttribute('aria-label', 'Search messages');
        const searchIcon = node('i', undefined, 'fa-solid fa-magnifying-glass');
        searchIcon.setAttribute('aria-hidden', 'true'); submit.append(searchIcon);
        const result = node('span', undefined, 'ai-log-conversation-search-result');
        result.setAttribute('role', 'status');
        let visibleMessages = 0, activeTerm = '', matches = [], currentMatch = -1;
        const navigation = node('div', undefined, 'ai-log-match-navigation');
        navigation.hidden = true;
        const matchButton = (name, icon, step) => {
            const button = node('button', undefined, 'ai-log-match-button');
            button.type = 'button'; button.title = name; button.setAttribute('aria-label', name);
            const glyph = node('i', undefined, 'fa-solid ' + icon); glyph.setAttribute('aria-hidden', 'true'); button.append(glyph);
            button.addEventListener('click', () => jumpToMatch((currentMatch + step + matches.length) % matches.length));
            return button;
        };
        const previous = matchButton('Previous match', 'fa-arrow-up', -1);
        const next = matchButton('Next match', 'fa-arrow-down', 1);
        navigation.append(result, previous, next);
        function jumpToMatch(index, scroll = true) {
            if (!matches.length) return;
            currentMatch = index;
            const messageIndex = matches[index];
            if (messageIndex >= visibleMessages) appendMessages(20 + Math.ceil((messageIndex + 1 - 20) / 15) * 15);
            transcript.querySelectorAll('mark').forEach((mark, markIndex) => {
                mark.classList.toggle('ai-log-match-current', markIndex === currentMatch);
                if (markIndex === currentMatch && scroll) mark.scrollIntoView({ block: 'center', behavior: 'smooth' });
            });
            result.textContent = (currentMatch + 1) + ' of ' + matches.length + ' matches';
        }
        const sentinel = node('div', undefined, 'ai-log-conversation-sentinel');
        sentinel.setAttribute('aria-hidden', 'true');
        transcript.append(sentinel);
        function highlight(content) {
            const text = content.textContent;
            content.replaceChildren();
            let offset = 0, index;
            while (activeTerm && (index = text.toLowerCase().indexOf(activeTerm, offset)) !== -1) {
                content.append(document.createTextNode(text.slice(offset, index)), node('mark', text.slice(index, index + activeTerm.length)));
                offset = index + activeTerm.length;
            }
            content.append(document.createTextNode(text.slice(offset)));
        }
        function appendMessages(limit) {
            const fragment = document.createDocumentFragment();
            const end = Math.min(limit, conversation.length);
            for (; visibleMessages < end; visibleMessages++) {
                const message = conversation[visibleMessages];
                const block = window.renderSigmaChatMessage({ role: message.role, text: message.text || 'Not recorded', stamp: message.timestamp ? formatTimestamp(message.timestamp) : '' });
                block.classList.add('ai-log-message');
                block.querySelector('.sigma-ai-message__meta').classList.add('ai-log-message-time');
                highlight(block.querySelector('.sigma-ai-message__bubble'));
                fragment.append(block);
            }
            sentinel.before(fragment);
            sentinel.hidden = visibleMessages >= conversation.length;
        }
        appendMessages(20);
        const observer = new IntersectionObserver(entries => {
            if (entries.some(entry => entry.isIntersecting) && !bubblePanel.hidden && !interaction.hidden) {
                observer.disconnect();
                appendMessages(visibleMessages + 15);
                if (!sentinel.hidden) observer.observe(sentinel);
            }
        }, { rootMargin: '0px 0px 200px 0px' });
        conversationObserver = observer;
        conversationState = {
            capture: () => ({ visible: visibleMessages, term: activeTerm, draft: input.value, match: currentMatch }),
            restore: saved => {
                appendMessages(Math.max(20, Number(saved.visible) || 20));
                input.value = saved.term || '';
                search.requestSubmit();
                if (matches.length) jumpToMatch(Math.min(Math.max(0, Number(saved.match) || 0), matches.length - 1), false);
                input.value = saved.draft || '';
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
        };
        search.append(wrap, submit);
        search.addEventListener('submit', event => {
            event.preventDefault();
            input.value = sanitizeSearch(input.value);
            activeTerm = input.value.trim().toLowerCase();
            matches = []; currentMatch = -1;
            conversation.forEach((message, messageIndex) => {
                const text = (message.text || 'Not recorded').toLowerCase();
                let offset = 0, index;
                while (activeTerm && (index = text.indexOf(activeTerm, offset)) !== -1) {
                    matches.push(messageIndex); offset = index + activeTerm.length;
                }
            });
            transcript.querySelectorAll('.sigma-ai-message__bubble').forEach(highlight);
            navigation.hidden = !activeTerm;
            previous.disabled = next.disabled = matches.length < 2;
            result.textContent = activeTerm ? 'No messages found' : '';
            jumpToMatch(0);
        });
        const sidebar = node('aside', undefined, 'ai-log-conversation-sidebar');
        const dates = node('dl', undefined, 'ai-log-conversation-details');
        const firstTime = conversation[0]?.timestamp;
        const lastTime = conversation[conversation.length - 1]?.timestamp;
        [['AI Feature', record.label], ['Started', formatTimestamp(firstTime)], ['Last Activity', formatTimestamp(lastTime)]].forEach(([label, value]) => {
            const item = node('div');
            item.append(node('dt', label), node('dd', value));
            dates.append(item);
        });
        sidebar.append(dates, search, navigation);
        const chat = node('section', undefined, 'ai-log-conversation-chat');
        chat.setAttribute('aria-label', 'SIGMA conversation');
        const chatHeader = node('div', undefined, 'sigma-ai-header');
        const headerLeft = node('div', undefined, 'mobile-panel-header-left');
        const badge = node('span', undefined, 'sigma-ai-badge'); badge.setAttribute('aria-hidden', 'true');
        badge.append(window.createSigmaBoltIcon());
        headerLeft.append(badge, node('h3', 'SIGMA', 'sigma-ai-title'));
        chatHeader.append(headerLeft); chat.append(chatHeader, transcript);
        bubblePanel.append(sidebar, chat);
        const heading = interaction.querySelector('.ai-log-detail-title');
        const detailIdentity = interaction.querySelector('.ai-log-detail-identity');
        const metadata = interaction.querySelector('.ai-log-interaction-metadata');
        const state = node('div', undefined, 'ai-log-message-notice');
        state.setAttribute('role', 'status');
        const storageKey = 'sigma-ai-hidden-messages:' + encodeURIComponent(JSON.stringify([record.userId, record.feature, record.timestamp.toISOString(), record.prompt]));
        let deleted = {};
        try { const saved = JSON.parse(localStorage.getItem(storageKey) || '{}'); if (saved && typeof saved === 'object' && !Array.isArray(saved)) deleted = saved; } catch { }
        let bubbleOpener = null;
        window.closeAiConversationBubbles = () => {
            observer.disconnect();
            bubblePanel.hidden = true;
            frame.hidden = false;
            metadata.hidden = false;
            metadata.before(heading, detailIdentity);
            bubbleOpener?.focus({ preventScroll: true });
        };
        function paint() {
            body.replaceChildren();
            const visible = messages.map((message, index) => ({ message, index })).filter(item => !deleted[item.index]);
            const renderRow = ({ message, index }) => {
                const row = node('tr'), sender = node('td');
                const identity = node('div', undefined, 'ai-log-message-sender');
                const label = node('div');
                label.append(node('p', message.role === 'user' ? nameOf(user) : 'SIGMA Bot'));
                if (message.role === 'user') identity.append(avatar(user));
                else { const icon = node('span', undefined, 'ai-log-avatar ai-log-sigma-icon'); icon.setAttribute('aria-hidden', 'true'); icon.append(window.createSigmaBoltIcon()); identity.append(icon); }
                identity.append(label); sender.append(identity);
                const text = node('td', message.text || 'Not recorded', 'ai-log-message-content');
                const timestamp = node('td');
                timestamp.append(node('span', formatTimestamp(message.timestamp), 'ai-log-timestamp'));
                const action = node('td');
                const toggle = node('button', undefined, 'ai-log-message-more');
                toggle.type = 'button'; toggle.title = 'Message actions'; toggle.setAttribute('aria-label', 'Actions for message ' + (index + 1)); toggle.setAttribute('aria-expanded', 'false');
                toggle.append(node('i', undefined, 'fa-solid fa-ellipsis'));
                const menu = node('div', undefined, 'ai-log-message-menu'); menu.hidden = true;
                const remove = node('button', undefined); remove.type = 'button'; remove.append(node('i', undefined, 'fa-solid fa-trash-can'), node('span', 'Delete Log'));
                const full = node('button', undefined); full.type = 'button'; full.append(node('i', undefined, 'fa-solid fa-comments'), node('span', 'View Full Conversation'));
                toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const show = menu.hidden;
            window.closeAllTableActionDropdowns?.(menu);
            closeMessageMenus();
            menu.hidden = !show;
            toggle.classList.toggle('active', show);
            toggle.setAttribute('aria-expanded', String(show));
            if (show) window.positionActionDropdown?.(menu, toggle);
            else window.resetActionDropdownPosition?.(menu);
        });
                full.addEventListener('click', () => {
                    closeMessageMenus(); bubbleOpener = toggle;
                    window.pushModalHistoryState?.('ai-conversation-bubbles-panel', () => interaction.querySelector('.ai-log-message-menu button:last-child')?.click());
                    frame.hidden = true; bubblePanel.hidden = false;
                    metadata.hidden = true;
                    sidebar.prepend(heading, detailIdentity);
                    if (!sentinel.hidden) observer.observe(sentinel);
                    bubblePanel.tabIndex = -1; bubblePanel.focus({ preventScroll: true });
                });
                remove.addEventListener('click', async () => {
                    closeMessageMenus();
                    if (!window.confirm('Delete this message row from the log? The original conversation will not be deleted.')) return;
                    remove.disabled = true;
                    try {
                        deleted[index] = true;
                        try { localStorage.setItem(storageKey, JSON.stringify(deleted)); } catch {}
                        const remaining = messages.filter((_, i) => !deleted[i]);
                        if (!remaining.length) {
                            await window.SigmaAiLogs.deleteLog(record.id);
                            closeInteraction();
                            refresh();
                        } else {
                            paint();
                        }
                    } catch (error) {
                        remove.disabled = false;
                        state.textContent = error.message || 'The row could not be deleted.';
                    }
                });
                menu.append(remove, full); action.append(toggle, menu);
                row.append(sender, text, timestamp, action); return row;
            };
            if (!visible.length) {
                const row = node('tr'), cell = node('td'); cell.colSpan = 4;
                cell.innerHTML = window.renderSigmaEmptyState({ icon: 'fa-solid fa-comments', title: 'No messages to show', subtitle: 'Messages hidden from this view remain in the recorded conversation.' });
                row.append(cell); body.append(row);
            }
            if (window.SigmaLogPagination) window.SigmaLogPagination.setRecords(list, visible, renderRow);
            else visible.forEach(item => body.append(renderRow(item)));
        }
        paint(); interaction.append(state, frame, bubblePanel);
    }
    function closeMessageMenus() {
        host.querySelectorAll('.ai-log-message-menu').forEach(menu => {
            menu.hidden = true;
            menu.classList.remove('dropup');
            window.resetActionDropdownPosition?.(menu);
        });
        host.querySelectorAll('.ai-log-message-more').forEach(button => {
            button.classList.remove('active');
            button.setAttribute('aria-expanded', 'false');
        });
    }
    document.addEventListener('pointerdown', event => {
        const menu = host.querySelector('.ai-log-message-menu:not([hidden])');
        if (!menu) return;
        const toggle = menu.parentElement.querySelector('.ai-log-message-more');
        if (!menu.contains(event.target) && !toggle?.contains(event.target)) closeMessageMenus();
    }, true);
    host.addEventListener('keydown', event => {
        const toggle = host.querySelector('.ai-log-message-more[aria-expanded="true"]');
        if (event.key === 'Escape' && toggle) { event.preventDefault(); event.stopPropagation(); closeMessageMenus(); toggle.focus(); }
    });
    function closeInteraction() {
        if (interaction.hidden) return;
        conversationObserver?.disconnect();
        activeRecord = null; conversationState = null;
        interaction.hidden = true;
        interaction.replaceChildren();
        const previous = interactionReturn;
        if (previous?.fromDetail && selectedId) detail.hidden = false;
        else {
            container.hidden = false;
            delete host.dataset.aiUserDetailOpen;
        }
        paintOverviewFooter();
        requestAnimationFrame(() => {
            previous?.scroll.forEach(([el, x, y]) => { el.scrollLeft = x; el.scrollTop = y; });
            previous?.button?.focus({ preventScroll: true });
        });
    }
    function readUsers() {
        try {
            const value = JSON.parse(localStorage.getItem(key) || '[]');
            const seen = new Set();
            users = Array.isArray(value) ? value.filter(user => {
                if (!user || !idOf(user) || seen.has(idOf(user))) return false;
                seen.add(idOf(user));
                return true;
            }) : [];
        } catch { users = []; }
    }
    function paintOverview() {
        const body = table.tBodies[0];
        body.replaceChildren();
        overviewLogs = users.flatMap(user => records(user).map(record => ({ user, record })))
            .filter(({ user, record }) => [nameOf(user), idOf(user), roleOf(user), record.label, record.prompt, record.actionDescription, record.response, record.model, record.status].join(' ').toLowerCase().includes(window.getAuditLogSearchQuery?.() || ''))
            .sort((a, b) => b.record.timestamp - a.record.timestamp);
        if (!overviewLogs.length) {
            const tr = node('tr');
            const td = node('td');
            td.colSpan = 5;
            td.innerHTML = window.renderSigmaEmptyState({ icon: 'fa-solid fa-robot', title: window.getAuditLogSearchQuery?.() ? 'No matching AI logs.' : users.length ? 'No AI logs yet' : 'No user accounts available.', subtitle: window.getAuditLogSearchQuery?.() ? '' : users.length ? 'Recorded AI requests will appear here.' : 'AI logs will appear when accounts have recorded activity.' });
            tr.append(td);
            body.append(tr);
        }
        appendOverviewRows(overviewLogs);
        paintOverviewFooter();
    }
    function appendOverviewRows(logs) {
        const renderRow = ({ user, record }) => {
            const tr = node('tr');
            const userCell = node('td');
            userCell.append(userButton(user));
            const featureCell = node('td');
            const link = node('button', record.label, 'ai-log-interaction-button');
            link.type = 'button';
            link.setAttribute('aria-label', 'View ' + record.label + ' log for ' + nameOf(user));
            link.addEventListener('click', () => openInteraction(record, link));
            featureCell.append(link, node('p', record.actionDescription || record.prompt || 'Request context not recorded', 'ai-log-request-preview'));
            tr.append(userCell, featureCell, node('td', record.model), statusCell(record), dateCell(record));
            return tr;
        };
        if (window.SigmaLogPagination) window.SigmaLogPagination.setRecords(table, logs, renderRow);
        else logs.forEach(log => table.tBodies[0].append(renderRow(log)));
    }
    function paintDetail(user) {
        detail.replaceChildren();
        const identity = node('div', undefined, 'ai-log-detail-identity');
        const nameRow = node('div', undefined, 'ai-log-detail-name-row');
        const heading = node('h2', 'AI Usage Details', 'ai-log-detail-title');
        const identityText = node('div', undefined, 'ai-log-detail-identity-text');
        identityText.append(node('p', nameOf(user), 'ai-log-detail-name'), node('p', roleOf(user) + ' | Account ID: ' + idOf(user), 'text-black-fade'));
        nameRow.append(avatar(user), identityText);
        identity.append(nameRow);
        const search = node('form', undefined, 'ai-log-search');
        search.setAttribute('role', 'search');
        const { input, wrap: inputWrap } = searchField('Search AI logs', 'Search this user\'s AI logs', searchDraft, value => { searchDraft = value; });
        const searchButton = node('button', 'Search', 'sigma-btn sigma-btn-primary');
        searchButton.type = 'submit';
        search.append(inputWrap, searchButton);
        search.addEventListener('submit', event => {
            event.preventDefault();
            searchDraft = sanitizeSearch(input.value);
            query = searchDraft.trim().toLowerCase();
            paintDetail(user);
            window.SigmaLogPagination?.reset(detail.querySelector('table'));
            detail.querySelector('input[type="search"]').focus({ preventScroll: true });
        });
        const tabs = node('div', undefined, 'ai-log-category-tabs');
        tabs.setAttribute('role', 'group');
        tabs.setAttribute('aria-label', 'AI feature categories');
        const logs = records(user);
        const matches = logs.filter(log => !query || [log.label, log.prompt, log.response, log.model, log.status].some(value => value.toLowerCase().includes(query)));
        const available = categories(user).filter(([id]) => !query || matches.some(log => log.feature === id));
        if (category !== 'all' && !available.some(([id]) => id === category)) category = 'all';
        const tabItems = matches.length ? [['all', 'All Logs'], ...available] : [];
        tabItems.forEach(([id, label]) => {
            const button = node('button', label);
            button.type = 'button';
            button.dataset.category = id;
            button.setAttribute('aria-pressed', String(id === category));
            button.addEventListener('click', () => {
                category = id;
                paintDetail(user);
                window.SigmaLogPagination?.reset(detail.querySelector('table'));
                detail.querySelector('[data-category="' + id + '"]')?.focus({ preventScroll: true });
            });
            tabs.append(button);
        });
        const frame = node('div', undefined, 'sigma-table-container sigma-table-container--unframed ai-log-message-frame');
        const list = node('table', undefined, 'sigma-table sigma-audit-table ai-log-history-table');
        list.setAttribute('aria-label', nameOf(user) + ' AI usage');
        const head = node('thead');
        const header = node('tr');
        ['AI Feature', 'Interaction', 'Model', 'Status', 'Timestamp', 'Action'].forEach(label => header.append(node('th', label)));
        head.append(header);
        const body = node('tbody');
        const filtered = matches.filter(log => category === 'all' || log.feature === category);
        const renderRow = log => {
            const row = node('tr');
            const { action, notice } = createLogRecordActions(log, 'Log actions');
            action.append(notice);
            row.append(node('td', log.label), interactionCell(log), node('td', log.model), statusCell(log), dateCell(log), action);
            return row;
        };
        if (!filtered.length) {
            const empty = node('div', undefined, 'ai-log-empty-state');
            empty.setAttribute('role', 'status');
            const noLogs = !logs.length;
            empty.innerHTML = window.renderSigmaEmptyState({
                icon: 'fa-solid ' + (noLogs ? 'fa-robot' : 'fa-magnifying-glass'),
                title: noLogs ? 'No AI logs yet' : query ? 'No results found' : 'No logs in this category',
                subtitle: noLogs ? 'This account has no recorded AI usage.' : query ? 'Try another search term or clear the search and click Search.' : 'No AI activity is available for this feature.'
            });
            const row = node('tr');
            const cell = node('td', undefined, 'ai-log-empty-cell');
            cell.colSpan = 6;
            cell.append(empty);
            row.append(cell);
            body.append(row);
        }
        list.append(head, body);
        if (window.SigmaLogPagination) window.SigmaLogPagination.setRecords(list, filtered, renderRow);
        else filtered.forEach(log => body.append(renderRow(log)));
        frame.append(list);
        const toolbar = node('div', undefined, 'ai-log-detail-toolbar');
        if (tabItems.length) toolbar.append(tabs);
        toolbar.append(search);
        detail.append(heading, identity, toolbar);
        detail.append(frame);
    }
    function open(user, button) {
        window.pushModalHistoryState?.('ai-user-details-panel', () => open(user, button));
        opener = button;
        returnScroll = [];
        for (let el = container.parentElement; el; el = el.parentElement) returnScroll.push([el, el.scrollLeft, el.scrollTop]);
        selectedId = idOf(user);
        host.dataset.aiUserDetailOpen = 'true';
        category = 'all';
        query = searchDraft = '';
        container.hidden = true;
        paintOverviewFooter();
        detail.hidden = false;
        paintDetail(user);
        detail.scrollIntoView({ block: 'start' });
        (detail.querySelector('[data-category="all"]') || detail.querySelector('input')).focus({ preventScroll: true });
    }
    function close() {
        interaction.hidden = true;
        selectedId = null;
        delete host.dataset.aiUserDetailOpen;
        detail.hidden = true;
        container.hidden = false;
        paintOverview();
        requestAnimationFrame(() => {
            returnScroll?.forEach(([el, x, y]) => { el.scrollLeft = x; el.scrollTop = y; });
            table.querySelector('[data-user-id="' + CSS.escape(opener?.dataset.userId || '') + '"]')?.focus({ preventScroll: true });
        });
    }
    function refresh() {
        readUsers();
        if (!interaction.hidden && !users.some(user => idOf(user) === interaction.dataset.userId)) closeInteraction();
        paintOverview();
        if (selectedId) {
            const user = users.find(user => idOf(user) === selectedId);
            if (!user) close();
            else {
                if (category !== 'all' && !categories(user).some(([id]) => id === category)) category = 'all';
                paintDetail(user);
            }
        }
    }
    window.closeAiUserDetails = close;
    window.filterAiAuditLogs = () => { paintOverview(); window.SigmaLogPagination?.reset(table); };
    window.closeAiInteractionDetails = closeInteraction;
    function loadRecordedLogs() {
            const value = window.SigmaAiLogs.getDisplayRecords();
            suppliedRecords = value.map(log => {
                const feature = features.find(([id]) => id === log.feature);
                const timestamp = new Date(log.timestamp);
                if (!feature || !log.userId || Number.isNaN(timestamp.getTime())) throw new TypeError('Invalid AI log record');
                return { id: log.id, userId: String(log.userId), feature: feature[0], label: feature[1],
                    source: log.source, evidenceSources: log.evidenceSources, cardRecordId: log.cardRecordId, cardRemoved: log.cardRemoved, cardRemovedAt: log.cardRemovedAt, cardRemovedBy: log.cardRemovedBy,
                    prompt: String(log.prompt || ''), actionDescription: String(log.actionDescription || ''), response: String(log.response || ''), model: String(log.model || 'Not recorded'),
                    status: ['Success', 'Failed', 'Fallback Used'].includes(log.status) ? log.status : 'Not recorded', timestamp,
                    messages: Array.isArray(log.messages) ? log.messages.filter(message => message && ['user', 'assistant'].includes(message.role)).map(message => ({
                        role: message.role, text: String(message.text || ''), timestamp: String(message.timestamp || ''), model: String(message.model || '')
                    })) : [] };
            });
            refresh();
    }
    window.addEventListener('sigma:ai-logs-updated', loadRecordedLogs);
    window.addEventListener('storage', event => { if (!event.key || event.key === key || event.key.startsWith('sigma_avatar_')) refresh(); });
    window.addEventListener('sigma:user-profile-updated', refresh);
    new MutationObserver(refresh).observe(host, { attributes: true, attributeFilter: ['class'] });
    const accounts = document.getElementById('userTableBody');
    if (accounts) new MutationObserver(refresh).observe(accounts, { childList: true });
    loadRecordedLogs();
    window.addEventListener('beforeunload', () => {
        try {
            if (!host.getClientRects().length) { sessionStorage.removeItem(refreshKey); return; }
            const bubble = interaction.querySelector('#ai-conversation-bubbles-panel');
            const scroll = [];
            for (let el = host; el; el = el.parentElement) scroll.push([el.scrollLeft, el.scrollTop]);
            sessionStorage.setItem(refreshKey, JSON.stringify({
                hash: location.hash, auth: sessionStorage.getItem('sigma-authenticated-user'),
                userId: selectedId, category, query, draft: searchDraft,
                recordId: !interaction.hidden ? activeRecord?.id : null,
                fromDetail: interactionReturn?.fromDetail, full: bubble && !bubble.hidden,
                conversation: conversationState?.capture(), scroll, windowScroll: [scrollX, scrollY]
            }));
        } catch { }
    });
    let savedView = null;
    try {
        savedView = JSON.parse(sessionStorage.getItem(refreshKey) || 'null');
        sessionStorage.removeItem(refreshKey);
    } catch { }
    function restoreView() {
        if (!savedView || !host.getClientRects().length) return;
        const saved = savedView; savedView = null;
        if (saved.hash !== location.hash || saved.auth !== sessionStorage.getItem('sigma-authenticated-user')) return;
        paintOverview();
        const user = users.find(item => idOf(item) === saved.userId);
        if (user) {
            open(user, table.querySelector('[data-user-id="' + CSS.escape(saved.userId) + '"]'));
            category = saved.category || 'all'; query = saved.query || ''; searchDraft = saved.draft || '';
            paintDetail(user);
        }
        const record = suppliedRecords.find(item => item.id === saved.recordId);
        if (record && (!saved.fromDetail || user)) {
            openInteraction(record, user ? detail.querySelector('.ai-log-interaction-button') : table.querySelector('.ai-log-interaction-button'));
            if (saved.full) {
                interaction.querySelector('.ai-log-message-more')?.click();
                interaction.querySelector('.ai-log-message-menu button:last-child')?.click();
                if (saved.conversation) conversationState?.restore(saved.conversation);
            }
        }
        requestAnimationFrame(() => requestAnimationFrame(() => {
            let el = host;
            (saved.scroll || []).forEach(([x, y]) => { if (el) { el.scrollLeft = x; el.scrollTop = y; el = el.parentElement; } });
            window.scrollTo(...(saved.windowScroll || [0, 0]));
        }));
    }
    new MutationObserver(restoreView).observe(host, { attributes: true, attributeFilter: ['class', 'style', 'hidden'] });
    setTimeout(restoreView, 80);
})();
