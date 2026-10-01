const { spawn } = require('child_process');

async function testDom() {
    const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
        '--headless',
        '--disable-gpu',
        '--remote-debugging-port=9231',
        '--window-size=390,844',
        'about:blank'
    ]);

    await new Promise(r => setTimeout(r, 1500));

    try {
        const res = await fetch('http://127.0.0.1:9231/json/version');
        const ver = await res.json();
        const ws = new WebSocket(ver.webSocketDebuggerUrl);

        let id = 1;
        const pending = new Map();

        ws.onmessage = (evt) => {
            const data = JSON.parse(evt.data);
            if (data.id && pending.has(data.id)) {
                const cb = pending.get(data.id);
                pending.delete(data.id);
                cb(data.result);
            }
        };

        function send(method, params = {}) {
            return new Promise((resolve) => {
                const reqId = id++;
                pending.set(reqId, resolve);
                ws.send(JSON.stringify({ id: reqId, method, params }));
            });
        }

        await new Promise(r => ws.onopen = r);

        for (const url of ['http://127.0.0.1:5519/teacher.html', 'http://127.0.0.1:5519/student.html']) {
            console.log(`\n=== Testing ${url} ===`);
            const { targetId } = await send('Target.createTarget', { url });
            const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });

            function sendSession(method, params = {}) {
                return new Promise((resolve) => {
                    const reqId = id++;
                    pending.set(reqId, resolve);
                    ws.send(JSON.stringify({ id: reqId, sessionId, method, params }));
                });
            }

            await sendSession('Page.enable');
            await sendSession('Runtime.enable');

            await sendSession('Emulation.setDeviceMetricsOverride', {
                width: 390,
                height: 844,
                deviceScaleFactor: 2,
                mobile: true
            });

            await new Promise(r => setTimeout(r, 2000));

            const domInfo = await sendSession('Runtime.evaluate', {
                expression: `(() => {
                    const feed = document.querySelector('#admin-announcements-feed, #student-announcements-feed');
                    const articles = feed ? Array.from(feed.querySelectorAll('article, .sigma-announcement-card, .announcement-card')) : [];
                    const mainCol = document.querySelector('.main-dashboard-column');
                    const dashboardGrid = document.querySelector('.dashboard-grid');
                    return {
                        feed: feed ? {
                            id: feed.id,
                            className: feed.className,
                            rect: feed.getBoundingClientRect(),
                            csPadding: window.getComputedStyle(feed).padding,
                            csMargin: window.getComputedStyle(feed).margin,
                            csBg: window.getComputedStyle(feed).backgroundColor
                        } : null,
                        articlesCount: articles.length,
                        articles: articles.map(a => {
                            const rect = a.getBoundingClientRect();
                            const cs = window.getComputedStyle(a);
                            const footer = a.querySelector('.sigma-card-footer-row, .border-t, [class*="footer"]');
                            return {
                                rect: rect,
                                height: rect.height,
                                csPadding: cs.padding,
                                csMargin: cs.margin,
                                csBg: cs.backgroundColor,
                                footerRect: footer ? footer.getBoundingClientRect() : null,
                                spaceBelowFooter: footer ? (rect.bottom - footer.getBoundingClientRect().bottom) : null
                            };
                        }),
                        mainCol: mainCol ? {
                            rect: mainCol.getBoundingClientRect(),
                            csPadding: window.getComputedStyle(mainCol).padding,
                            csMargin: window.getComputedStyle(mainCol).margin,
                            csBg: window.getComputedStyle(mainCol).backgroundColor
                        } : null,
                        dashboardGrid: dashboardGrid ? {
                            rect: dashboardGrid.getBoundingClientRect(),
                            csPadding: window.getComputedStyle(dashboardGrid).padding,
                            csMargin: window.getComputedStyle(dashboardGrid).margin
                        } : null
                    };
                })()`,
                returnByValue: true
            });

            console.log(JSON.stringify(domInfo.result.value, null, 2));

            await send('Target.closeTarget', { targetId });
        }

        ws.close();
    } catch (e) {
        console.error(e);
    } finally {
        chrome.kill();
    }
}

testDom();
